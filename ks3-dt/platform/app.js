/* OLS KS3 Digital Technology — app core.
   One codebase, two homes: on the Apps-Script-served page window.OLS_TRANSPORT
   routes calls through google.script.run; on localhost/github.io it is absent and
   dev-server.js provides a localStorage-backed FakeServer (see ARCHITECTURE.md §7). */
(function (global) {
  'use strict';

  var App = global.App = {};

  /* ---------------- tiny helpers ---------------- */
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  App.$ = $; App.esc = esc;
  /* Resolve a repo-relative asset path. On the Apps-Script-served page the
     assembler injects OLS_ASSET_BASE (absolute github.io) because relative
     paths break under the googleusercontent origin. */
  App.asset = function (path) { return (global.OLS_ASSET_BASE || '') + path; };

  App.state = {
    email: '', name: '', codename: '', classCode: '', year: 'j1',
    man: null, me: null, locks: {}, lb: null, team: null, absence: [],
    xp: 0, contentVersion: '', preview: false,
    lesson: null, chunkIdx: 0, catchup: false, pendingMin: 0
  };

  /* ---------------- boot params (sandboxed iframe: use OLS_BOOT, never location) */
  App.classCode = function () {
    var boot = global.OLS_BOOT;
    if (boot && boot.classCode) return String(boot.classCode);
    try { var q = new URLSearchParams(location.search).get('class'); if (q) return q; } catch (e) {}
    try { return localStorage.getItem('ks3dt-class') || ''; } catch (e) { return ''; }
  };
  App.baseUrl = function () {
    var boot = global.OLS_BOOT;
    if (boot && boot.baseUrl) return String(boot.baseUrl);
    return location.origin + location.pathname;
  };
  App.classLink = function (name) { return App.baseUrl() + '?class=' + encodeURIComponent(name); };

  /* ---------------- transport (centralised catch: every call is safe) -------- */
  var _T = null;
  function pickTransport() {
    if (global.OLS_TRANSPORT && typeof global.OLS_TRANSPORT.call === 'function') {
      App.state.preview = false;
      return global.OLS_TRANSPORT;
    }
    App.state.preview = true;
    return global.OLS_DEV_SERVER;
  }
  App.call = function (action, params) {
    if (!_T) _T = pickTransport();
    if (!_T || typeof _T.call !== 'function') {
      console.error('[App.call] no transport available');
      return Promise.resolve({ ok: false, error: 'no-transport' });
    }
    var p = Object.assign({ action: action, classCode: App.state.classCode }, params || {});
    return _T.call(p).catch(function (err) {
      console.error('[App.call ' + action + ']', err);
      return { ok: false, error: 'transport', message: String(err && err.message || err) };
    });
  };

  /* ---------------- save-resilience outbox (red team #4) ---------------------
     Critical writes queue here; flushed with backoff; cleared only on server ok. */
  var OUTBOX_KEY = 'ks3dt-outbox';
  function outboxRead() { try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch (e) { return []; } }
  function outboxWrite(q) { try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(q)); } catch (e) {} }
  var flushing = false, backoff = 1000;
  App.enqueue = function (action, params) {
    var q = outboxRead();
    q.push({ action: action, params: params, t: Date.now() });
    outboxWrite(q);
    updateOutboxDot();
    App.flushOutbox();
  };
  App.flushOutbox = function () {
    if (flushing) return;
    var q = outboxRead();
    if (!q.length) { updateOutboxDot(); return; }
    flushing = true;
    App.call(q[0].action, q[0].params).then(function (r) {
      flushing = false;
      if (r && r.ok) {
        var q2 = outboxRead(); q2.shift(); outboxWrite(q2);
        backoff = 1000;
        App.flushOutbox();
      } else if (r && r.error && r.error !== 'transport') {
        // definitive server rejection: retrying can never succeed - drop it
        // rather than hammering forever (esp. 'store-full', review finding)
        var q3 = outboxRead(); q3.shift(); outboxWrite(q3);
        if (r.error === 'store-full') App.toast('Saving is full — tell your teacher to check the platform storage.', 5000);
        backoff = 1000;
        App.flushOutbox();
      } else {
        backoff = Math.min(backoff * 2, 30000);
        setTimeout(App.flushOutbox, backoff);
      }
      updateOutboxDot();
    });
  };
  function updateOutboxDot() {
    var dot = $('#outbox-dot');
    if (dot) dot.hidden = outboxRead().length === 0;
  }
  global.addEventListener('online', function () { backoff = 1000; App.flushOutbox(); });

  /* ---------------- content fetch + localStorage cache (red team #9) --------- */
  var CONTENT_BASE = global.OLS_CONTENT_BASE || '../content/';
  function cacheKey(path) { return 'ks3dt-content:' + App.state.contentVersion + ':' + path; }
  App.fetchContent = function (path) {
    try {
      var hit = localStorage.getItem(cacheKey(path));
      if (hit) return Promise.resolve(JSON.parse(hit));
    } catch (e) {}
    return fetch(CONTENT_BASE + path, { cache: 'default' }).then(function (r) {
      if (!r.ok) throw new Error('content ' + path + ' HTTP ' + r.status);
      return r.text();
    }).then(function (text) {
      try { localStorage.setItem(cacheKey(path), text); } catch (e) {}
      return JSON.parse(text);
    }).catch(function (err) {
      // wifi blip: last-resort stale read from ANY cached version
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf('ks3dt-content:') === 0 && k.slice(k.indexOf(':', 14) + 1) === path) {
            return JSON.parse(localStorage.getItem(k));
          }
        }
      } catch (e) {}
      throw err;
    });
  };
  function purgeOldContent() {
    try {
      var dead = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('ks3dt-content:') === 0 && k.indexOf('ks3dt-content:' + App.state.contentVersion + ':') !== 0) dead.push(k);
      }
      dead.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  /* ---------------- boot ---------------- */
  /* static starfield: drawn once (no animation loop — old C2k machines), the
     aurora's slow CSS drift supplies the life */
  function initStars() {
    var c = document.getElementById('stars');
    if (!c || !c.getContext) return;
    function draw() {
      var w = c.width = global.innerWidth, h = c.height = global.innerHeight;
      var ctx = c.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      var n = Math.floor((w * h) / 9000);
      for (var i = 0; i < n; i++) {
        var r = Math.random() * 1.3 + 0.3;
        ctx.globalAlpha = 0.2 + Math.random() * 0.55;
        ctx.fillStyle = Math.random() < 0.12 ? '#FFD84D' : '#CFE0FF';
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    draw();
    var t;
    global.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(draw, 200); });
  }

  App.boot = function () {
    initStars();
    App.state.classCode = App.classCode();
    wireChrome();
    if (!App.state.classCode) { showJoinLanding(); return; }
    App.call('whoami').then(function (r) {
      if (!r || !r.ok) { showJoinLanding('Sign-in details did not load. Refresh to try again.'); return; }
      App.state.email = String(r.email || '');
      App.state.name = String(r.name || '');
      if (!App.state.name) { showNameForm(); return; }
      joinAndLoad();
    });
  };

  function showJoinLanding(msg) {
    $('#guard').hidden = true;
    $('#join').hidden = false;
    if (msg) { var fb = $('#join-fallback'); fb.hidden = false; fb.textContent = msg; }
  }
  function showNameForm() {
    $('#guard').hidden = true;
    $('#nameform').hidden = false;
    $('#name-go').onclick = function () {
      var v = $('#name-input').value.trim();
      if (v.length < 2) { $('#name-msg').textContent = 'Type your name first.'; return; }
      App.state.name = v;
      $('#name-go').disabled = true;
      $('#nameform').hidden = true;
      $('#guard').hidden = false;
      joinAndLoad();
    };
  }

  function joinAndLoad() {
    try { localStorage.setItem('ks3dt-class', App.state.classCode); } catch (e) {}
    App.call('join', { name: App.state.name }).then(function (r) {
      if (!r || !r.ok) {
        showJoinLanding(r && r.error === 'unknown-class'
          ? 'That class link is not active. Check with your teacher.'
          : 'Could not join just now. Refresh to try again.');
        return;
      }
      if (r.name) App.state.name = String(r.name);
      return App.refreshState().then(function (ok) {
        if (!ok) { showJoinLanding('The mission board did not load. Refresh to try again.'); return; }
        $('#guard').hidden = true;
        maybeIntro(function () { showHub(); });
      });
    });
  }

  App.refreshState = function () {
    return App.call('state').then(function (r) {
      if (!r || !r.ok) return false;
      var s = App.state;
      s.me = r.me; s.locks = r.locks || {}; s.lb = r.lb; s.team = r.team;
      s.absence = r.absence || []; s.year = r.year || 'j1';
      s.contentVersion = String(r.contentVersion || 'v0');
      s.xp = r.me ? Number(r.me.xp || 0) : 0;
      s.codename = r.me ? String(r.me.cn || '') : '';
      purgeOldContent();
      return App.fetchContent(s.year + '/manifest.json').then(function (man) {
        s.man = man; return true;
      }).catch(function () { return false; });
    });
  };

  /* ---------------- OLS intro (brand moment: once per device per day) -------- */
  function maybeIntro(done) {
    var today = new Date().toDateString();
    try { if (localStorage.getItem('ks3dt-intro') === today) { done(); return; } } catch (e) {}
    try { localStorage.setItem('ks3dt-intro', today); } catch (e) {}
    var portrait = global.innerHeight > global.innerWidth;
    var src = 'https://dgaj-g.github.io/ols-digital-skills/assets/' + (portrait ? 'intro-portrait.mp4' : 'intro.mp4');
    var wrap = document.createElement('div');
    wrap.className = 'intro-overlay';
    wrap.innerHTML = '<video muted autoplay playsinline src="' + src + '"></video>' +
      '<button class="ghost-btn intro-skip" type="button">Skip</button>';
    document.body.appendChild(wrap);
    var vid = wrap.querySelector('video');
    var finished = false;
    function end() { if (finished) return; finished = true; wrap.classList.add('gone'); setTimeout(function () { wrap.remove(); }, 450); done(); }
    vid.addEventListener('ended', end);
    vid.addEventListener('error', end);
    wrap.querySelector('.intro-skip').addEventListener('click', end);
    setTimeout(function () { if (vid.paused) end(); }, 2500); // autoplay blocked -> move on
    setTimeout(end, 15000); // hard cap
  }

  /* ---------------- chrome ---------------- */
  function wireChrome() {
    $('#help-beacon').onclick = function () { App.openModal('help-modal'); };
    $('#help-close').onclick = function () { App.closeModal('help-modal'); };
    $('#join-staff').onclick = function () { if (global.Staff) global.Staff.open(); };
    $('#staff-open').onclick = function () { if (global.Staff) global.Staff.open(); };
    $('#player-back').onclick = function () { App.confirmLeaveLesson(); };
    document.querySelectorAll('.modal-close').forEach(function (b) {
      b.onclick = function () { App.closeModal(b.getAttribute('data-close')); };
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') ['help-modal', 'qr-modal', 'confirm-modal'].forEach(App.closeModal);
    });
    // active-time heartbeat: visible + recently-interacting minutes count
    var lastInteract = Date.now();
    ['pointerdown', 'keydown', 'scroll'].forEach(function (evt) {
      document.addEventListener(evt, function () { lastInteract = Date.now(); }, { passive: true });
    });
    setInterval(function () {
      if (document.hidden) return;
      if (Date.now() - lastInteract > 90000) return;
      if (App.state.lesson) App.state.pendingMin += 0.5;
    }, 30000);
    App.flushOutbox();
  }

  App.openModal = function (id) { var m = $('#' + id); if (m) m.hidden = false; };
  App.closeModal = function (id) { var m = $('#' + id); if (m) m.hidden = true; };
  App.confirm = function (title, body, okLabel, cb) {
    $('#confirm-title').textContent = title;
    $('#confirm-body').textContent = body || '';
    var ok = $('#confirm-ok'), cancel = $('#confirm-cancel');
    ok.textContent = okLabel || 'Confirm';
    function close() { App.closeModal('confirm-modal'); ok.onclick = null; cancel.onclick = null; }
    ok.onclick = function () { close(); cb && cb(true); };
    cancel.onclick = function () { close(); cb && cb(false); };
    App.openModal('confirm-modal');
  };
  App.toast = function (msg, ms) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.hidden = true; }, ms || 2600);
  };
  App.copyText = function (text, doneMsg) {
    function done() { App.toast(doneMsg || 'Copied.'); }
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (ok) done(); else App.toast('Copy this by hand: ' + text, 6000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, legacy);
    else legacy();
  };

  /* ---------------- HUB ---------------- */
  function lessonState(le) {
    var lk = App.state.locks[String(le.num)];
    var delivered = lk && Number(lk.u) > 0;
    var open = lk && Number(lk.on) === 1;
    var rec = (App.state.me && App.state.me.L) ? App.state.me.L[String(le.num)] : null;
    var done = rec && Number(rec[0]) === 2;
    var flagged = App.state.absence.indexOf(le.id) !== -1;
    return { delivered: !!delivered, open: !!open, done: !!done, flagged: flagged, ready: le.status === 'ready' };
  }

  function showHub() {
    App.state.lesson = null;
    $('#player').hidden = true;
    $('#topbar').hidden = false;
    $('#help-beacon').hidden = false;
    $('#hub').hidden = false;
    renderHub();
  }
  App.showHub = showHub;

  function renderHub() {
    var s = App.state, man = s.man;
    $('#topbar-year').textContent = man.title;
    $('#hero-title').textContent = man.title;
    $('#hero-kicker').textContent = man.tagline || '';
    var who = s.codename ? 'Agent ' + s.codename : (s.name.split(' ')[0] || 'Agent');
    $('#hero-welcome').textContent = 'Welcome back, ' + who + '.';
    $('#agent-name').textContent = who;
    $('#agent-xp').textContent = s.xp + ' XP';

    var doneCount = 0, continueTarget = null;
    (man.lessons || []).forEach(function (le) {
      var st = lessonState(le);
      if (st.done) doneCount++;
      else if (!continueTarget && st.delivered && st.ready) continueTarget = le;
    });
    $('#ring-count').textContent = doneCount;
    var circ = 2 * Math.PI * 52;
    var fill = $('#ring-fill');
    fill.style.strokeDasharray = circ;
    fill.style.strokeDashoffset = circ * (1 - doneCount / (man.lessons || []).length);

    var team = $('#hero-team');
    if (s.team && s.lb && s.lb.mode !== 'off') {
      team.hidden = false;
      team.innerHTML = '<span class="team-name">' + esc(s.team.name || 'Your team') + '</span><span class="team-xp">' + Number(s.team.teamXp || 0) + ' team XP</span>' +
        (s.team.revealed && s.team.members ? '<span class="team-members">' + s.team.members.map(esc).join(' &middot; ') + '</span>' : '<span class="team-members">teammates hidden for now&hellip;</span>');
    } else team.hidden = true;

    var cta = $('#hero-cta');
    if (continueTarget) {
      cta.hidden = false;
      cta.textContent = (doneCount ? 'Continue: ' : 'Begin: ') + 'Lesson ' + continueTarget.num + ' — ' + continueTarget.title;
      cta.onclick = function () { App.openLesson(continueTarget.id, {}); };
    } else cta.hidden = true;

    // public class board (only when the teacher deliberately enabled it)
    if (s.lb && s.lb.mode === 'public') {
      App.call('board').then(function (r) {
        if (!r || !r.ok || r.mode !== 'public' || !r.rows || !r.rows.length) return;
        if (App.state.lesson) return; // pupil moved on while we fetched
        var old = document.getElementById('class-board');
        if (old) old.remove();
        var rowsHtml = r.rows.map(function (row, i) {
          return '<div class="board-row' + (row.me ? ' me' : '') + '"><span class="board-rank">' + (i + 1) + '</span>' +
            '<span class="board-name">' + esc(row.label) + (row.me ? ' (you)' : '') + '</span>' +
            '<span class="board-v">' + Number(row.v) + (r.basis === 'completion' ? ' done' : ' XP') + '</span></div>';
        }).join('');
        var sec = document.createElement('section');
        sec.className = 'block'; sec.id = 'class-board';
        sec.innerHTML = '<h2 class="block-name" style="--blk:#E4B824">Class board</h2><div class="board-card-list">' + rowsHtml + '</div>';
        var boardEl = $('#board');
        boardEl.insertBefore(sec, boardEl.firstChild);
      });
    }

    // board grouped by block
    var blocks = {};
    (man.blocks || []).forEach(function (b) { blocks[b.id] = { meta: b, lessons: [] }; });
    (man.lessons || []).forEach(function (le) {
      (blocks[le.block] = blocks[le.block] || { meta: { name: '', color: '#4FA3D9' }, lessons: [] }).lessons.push(le);
    });
    var board = $('#board');
    board.innerHTML = '';
    Object.keys(blocks).forEach(function (bid) {
      var blk = blocks[bid];
      if (!blk.lessons.length) return;
      var sec = document.createElement('section');
      sec.className = 'block';
      sec.innerHTML = '<h2 class="block-name" style="--blk:' + esc(blk.meta.color) + '">' + esc(blk.meta.name) + '</h2><div class="tiles"></div>';
      var tiles = sec.querySelector('.tiles');
      blk.lessons.forEach(function (le) { tiles.appendChild(tile(le, blk.meta)); });
      board.appendChild(sec);
    });
  }

  function tile(le, blockMeta) {
    var st = lessonState(le);
    var el = document.createElement('button');
    el.type = 'button';
    var cls = 'tile';
    if (st.done) cls += ' is-done';
    else if (st.delivered && st.ready) cls += ' is-open';
    else cls += ' is-locked';
    if (st.flagged) cls += ' is-flagged';
    el.className = cls;
    el.style.setProperty('--blk', blockMeta.color || '#4FA3D9');
    // journey markup: a glowing node on the spine + a glass mission card
    el.innerHTML =
      '<span class="tile-icon">' + esc(le.icon || '📘') + '</span>' +
      '<span class="tile-card">' +
        '<span class="tile-num">' + esc('Lesson ' + le.num) + '</span>' +
        '<span class="tile-title">' + esc(le.title) + '</span>' +
        '<span class="tile-tag">' + esc(le.tagline || '') + '</span>' +
        (st.done ? '<span class="tile-state done">&#10003; Complete</span>'
          : st.flagged ? '<span class="tile-state flag">Absent? Catch up</span>'
          : (st.delivered && st.ready) ? '<span class="tile-state open">Ready</span>'
          : '<span class="tile-state lock">&#128274;</span>') +
      '</span>';
    el.onclick = function () {
      if (st.flagged && !st.done) { App.openLesson(le.id, { catchup: true }); return; }
      if (st.delivered && st.ready) { App.openLesson(le.id, {}); return; }
      if (st.delivered && !st.ready) { App.toast('This lesson is being prepared — it will be ready before your class needs it.'); return; }
      el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble');
      App.toast('Locked — your teacher opens each lesson when it’s time.');
    };
    return el;
  }

  /* ---------------- LESSON PLAYER ---------------- */
  App.openLesson = function (lessonId, opts) {
    var man = App.state.man;
    var le = null;
    (man.lessons || []).forEach(function (l) { if (l.id === lessonId) le = l; });
    if (!le || !le.file) { App.toast('This lesson is being prepared.'); return; }
    $('#guard').hidden = false;
    App.fetchContent(le.file).then(function (lesson) {
      $('#guard').hidden = true;
      App.state.lesson = lesson;
      App.state.lessonEntry = le;
      App.state.catchup = !!(opts && opts.catchup);
      // Completed lessons re-open in REVIEW mode: everything is explorable again
      // (decision #10: pupils can always revisit) but nothing is re-recorded —
      // no XP re-awards, no exit/baseline overwrites.
      var recArr = (App.state.me && App.state.me.L) ? App.state.me.L[String(le.num)] : null;
      App.state.review = !!(recArr && Number(recArr[0]) === 2 && !App.state.catchup);
      App.state.chunkIdx = 0;
      App.state.chunks = buildChunks(lesson, App.state.catchup, App.state.review);
      if (App.state.review) App.toast('Reviewing a completed mission — nothing will be overwritten.', 3200);
      $('#hub').hidden = true;
      $('#player').hidden = false;
      $('#player-num').textContent = 'Lesson ' + le.num;
      $('#player-title').textContent = lesson.title;
      $('#player-xp').textContent = App.state.xp + ' XP';
      loadDraftThen(function () {
        // resume: skip chunks already completed on a previous visit/refresh
        // (review mode starts from the top instead — it's a re-read, not a resume)
        var done = (App.state.review || !App.state.draft) ? [] : (App.state.draft.done || []);
        var idx = 0;
        while (idx < App.state.chunks.length - 1 && done.indexOf(App.state.chunks[idx].id) !== -1) idx++;
        App.state.chunkIdx = idx;
        renderRail(); mountChunk();
      });
    }).catch(function () {
      $('#guard').hidden = true;
      App.toast('Could not load the lesson — check the wifi and try again.');
    });
  };

  function buildChunks(lesson, catchup, review) {
    var chunks = [];
    if (catchup) {
      chunks.push({ id: '_catchup', engine: 'catchupintro', title: 'You missed this one', minutes: 1, config: {} });
    }
    // review = a re-read of a completed lesson: no Do-Now (it would re-record
    // live retrieval data against the pupil's spacing history)
    if (Number(lesson.num) > 1 && !review) {
      chunks.push({ id: '_recap', engine: 'recap', title: 'Do-Now', minutes: 3, config: {} });
    }
    return chunks.concat(lesson.chunks || []);
  }

  function loadDraftThen(done) {
    App.call('loadDraft', { lessonNum: String(App.state.lessonEntry.num) }).then(function (r) {
      App.state.draft = (r && r.ok && r.draft) ? r.draft : {};
      done();
    });
  }

  function renderRail() {
    var rail = $('#chunk-rail');
    rail.innerHTML = '';
    App.state.chunks.forEach(function (ch, i) {
      var d = document.createElement('span');
      d.className = 'rail-dot' + (i < App.state.chunkIdx ? ' past' : i === App.state.chunkIdx ? ' now' : '');
      d.title = ch.title || '';
      if (ch.badge) d.classList.add('badge-dot');
      rail.appendChild(d);
    });
  }

  function mountChunk() {
    var s = App.state;
    var ch = s.chunks[s.chunkIdx];
    var host = $('#chunk-host');
    host.innerHTML = '';
    host.className = 'chunk-host engine-' + ch.engine;
    global.scrollTo(0, 0);
    renderRail();
    var engine = global.Engines && global.Engines[ch.engine];
    if (!engine) {
      host.innerHTML = '<div class="card"><h2>' + esc(ch.title || '') + '</h2><p>This part is being prepared.</p>' +
        '<button class="primary-btn" type="button">Continue</button></div>';
      host.querySelector('button').onclick = function () { App.nextChunk(); };
      return;
    }
    engine.mount(host, ch, App.engineCtx(ch));
  }

  App.engineCtx = function (ch) {
    var s = App.state;
    return {
      lesson: s.lesson,
      lessonEntry: s.lessonEntry,
      chunk: ch,
      draft: s.draft,
      preview: s.preview,
      call: App.call,
      markItem: function (itemId, choice) {
        return App.call('mark', { lessonId: s.lesson.id, itemId: itemId, choice: choice });
      },
      review: s.review,
      saveEvent: function (payload) {
        if (s.review) return Promise.resolve({ ok: true, xp: s.xp });
        payload = payload || {};
        payload.lessonNum = String(s.lessonEntry.num);
        if (s.pendingMin >= 1) { payload.minDelta = Math.round(s.pendingMin); s.pendingMin = 0; }
        return App.call('saveEvent', payload).then(function (r) {
          if (r && r.ok && r.xp != null) { s.xp = Number(r.xp); syncXp(); }
          else if (!r || !r.ok) App.enqueue('saveEvent', payload);
          return r;
        });
      },
      saveDraft: function (data) {
        s.draft = data;
        return App.call('saveEvent', { lessonNum: String(s.lessonEntry.num), draft: data });
      },
      awardBadge: function (badge, detail) {
        if (s.review) return App.badgeCelebration(Object.assign({}, badge, { xp: 0 }));
        // every badge carries a detail key: the server's XP idempotency rule
        // only grants XP when the event introduces a NEW key
        var d = detail || ('b' + String(badge.id || 'x') + '=1');
        return App.badgeCelebration(badge).then(function () {
          return App.engineCtx(ch).saveEvent({ xp: badge.xp || 0, detail: d });
        });
      },
      toast: App.toast,
      confirm: App.confirm,
      next: App.nextChunk
    };
  };

  function syncXp() {
    $('#agent-xp').textContent = App.state.xp + ' XP';
    $('#player-xp').textContent = App.state.xp + ' XP';
  }

  App.badgeCelebration = function (badge) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.className = 'badge-pop';
      ov.innerHTML = '<div class="badge-pop-card">' +
        '<img src="' + esc(App.asset(badge.icon)) + '" alt="">' +
        '<h2>Badge earned</h2><p class="badge-pop-name">' + esc(badge.name) + '</p>' +
        (Number(badge.xp || 0) > 0 ? '<p class="badge-pop-xp">+' + Number(badge.xp) + ' XP</p>' : '') +
        '<button class="primary-btn" type="button">Onward</button></div>';
      document.body.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add('show'); });
      ov.querySelector('button').onclick = function () {
        ov.classList.remove('show');
        setTimeout(function () { ov.remove(); resolve(); }, 250);
      };
    });
  };

  App.nextChunk = function () {
    var s = App.state;
    // record completion for refresh-resume (fire-and-forget draft save)
    var doneId = !s.review && s.chunks[s.chunkIdx] && s.chunks[s.chunkIdx].id;
    if (doneId) {
      s.draft = s.draft || {};
      s.draft.done = s.draft.done || [];
      if (s.draft.done.indexOf(doneId) === -1) s.draft.done.push(doneId);
      var payload = { lessonNum: String(s.lessonEntry.num), draft: s.draft };
      // flush accumulated active minutes with the chunk-advance save (review
      // finding: minutes were silently dropped unless a badge happened to fire)
      if (s.pendingMin >= 1) { payload.minDelta = Math.round(s.pendingMin); s.pendingMin = 0; }
      App.call('saveEvent', payload);
    }
    if (s.chunkIdx < s.chunks.length - 1) { s.chunkIdx++; mountChunk(); }
    else finishLesson();
  };

  function finishLesson() {
    var s = App.state;
    var wasCatchup = s.catchup;
    var num = String(s.lessonEntry.num);
    if (wasCatchup) App.call('catchup', { lessonNum: num }).then(function (r) { if (!r || !r.ok) App.enqueue('catchup', { lessonNum: num }); });
    var ov = document.createElement('div');
    ov.className = 'badge-pop show';
    ov.innerHTML = '<div class="badge-pop-card finish">' +
      '<div class="finish-glyph">&#127942;</div>' +
      '<h2>Mission complete</h2><p class="badge-pop-name">' + esc(s.lesson.title) + '</p>' +
      '<p class="badge-pop-xp">' + App.state.xp + ' XP total</p>' +
      '<button class="primary-btn" type="button">Back to Mission Control</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('button').onclick = function () {
      ov.remove();
      $('#guard').hidden = false;
      App.refreshState().then(function () { $('#guard').hidden = true; showHub(); });
    };
  }

  App.confirmLeaveLesson = function () {
    App.confirm('Leave the lesson?', 'Your progress so far is saved — you can come back to where you left off.', 'Leave', function (yes) {
      if (!yes) return;
      // flush active minutes so a pupil who worked but didn't finish a badge
      // still counts as present for absence inference
      if (App.state.lesson && !App.state.review && App.state.pendingMin >= 1) {
        App.call('saveEvent', { lessonNum: String(App.state.lessonEntry.num), minDelta: Math.round(App.state.pendingMin) });
        App.state.pendingMin = 0;
      }
      $('#guard').hidden = false;
      App.refreshState().then(function () { $('#guard').hidden = true; showHub(); });
    });
  };

  /* Exit submission: 0-5s random jitter (red team #3), retry, outbox fallback. */
  App.submitExit = function (payload, onDone) {
    payload.lessonId = App.state.lesson.id;
    var wait = Math.floor(Math.random() * 5000);
    setTimeout(function () {
      var attempts = 0;
      (function go() {
        attempts++;
        App.call('submitExit', payload).then(function (r) {
          if (r && r.ok) {
            if (r.xp != null) { App.state.xp = Number(r.xp); syncXp(); }
            onDone(r);
          } else if (attempts < 3) setTimeout(go, 1200 * attempts);
          else { App.enqueue('submitExit', payload); onDone(null); }
        });
      })();
    }, wait);
  };

})(window);
