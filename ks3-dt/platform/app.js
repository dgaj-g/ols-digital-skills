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
    man: null, me: null, locks: {}, lb: null, team: null, absence: [], kit: null,
    xp: 0, contentVersion: '', preview: false,
    lesson: null, chunkIdx: 0, catchup: false, pendingMin: 0,
    localKeys: null   // this lesson's answer key, fetched at open (rule 97: instant marking)
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
  /* Progress-save indicator (Damien, 22 Jul): pupils must SEE saving happen.
     Amber "Saving…" while any progress write is in flight or queued; green
     "Saved" once the server has acked and the outbox is empty. */
  var SAVE_ACTIONS = { saveEvent: 1, submitExit: 1, submitBaseline: 1, catchup: 1 };
  App.saveStatus = function (state) {
    var chip = $('#save-chip');
    if (!chip) return;
    chip.hidden = false;
    chip.className = 'save-chip ' + state;
    chip.innerHTML = state === 'saving' ? 'Saving&hellip;' : 'Saved &#10003;';
  };

  App.call = function (action, params) {
    if (!_T) _T = pickTransport();
    if (!_T || typeof _T.call !== 'function') {
      console.error('[App.call] no transport available');
      return Promise.resolve({ ok: false, error: 'no-transport' });
    }
    var isSave = SAVE_ACTIONS[action] === 1;
    if (isSave) App.saveStatus('saving');
    var p = Object.assign({ action: action, classCode: App.state.classCode }, params || {});
    return _T.call(p).then(function (r) {
      // green only when THIS write succeeded and nothing is still queued
      if (isSave && r && r.ok && outboxRead().length === 0) App.saveStatus('saved');
      return r;
    }).catch(function (err) {
      console.error('[App.call ' + action + ']', err);
      return { ok: false, error: 'transport', message: String(err && err.message || err) };
    });
  };

  /* ---------------- save-resilience outbox (red team #4) ---------------------
     Critical writes queue here; flushed with backoff; cleared only on server ok. */
  /* AUDIT FIX (26 Jul 2026): the queue is keyed to the PUPIL. It used to be one
     shared key, and the server attributes a flushed write to whoever is signed in
     at flush time - so on any shared browser profile pupil A's queued badge, exit
     answers and free-text comment could land on pupil B's record (and first-wins
     would then lock B out of her own exit check). The clearance key below was
     already email-scoped; this one was not. */
  function outboxKey() { return 'ks3dt-outbox:' + (App.state.email || '_pending'); }
  function outboxRead() { try { return JSON.parse(localStorage.getItem(outboxKey()) || '[]'); } catch (e) { return []; } }
  function outboxWrite(q) { try { localStorage.setItem(outboxKey(), JSON.stringify(q)); } catch (e) {} }
  /* Errors a retry can never fix. Everything else keeps retrying with backoff -
     dropping on (say) a momentary 'locked' or 'not-joined' silently threw the
     pupil's work away while the chip still went green. */
  var PERMANENT_ERRORS = { 'store-full': 1, 'sealed': 1, 'unknown-class': 1, 'not-joined': 1, 'bad-request': 1 };
  var flushing = false, backoff = 1000, lostWrite = false;
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
      } else if (r && r.error && PERMANENT_ERRORS[r.error] === 1) {
        // definitive server rejection: retrying can never succeed - drop it
        // rather than hammering forever. AUDIT FIX (26 Jul 2026): this branch
        // used to catch EVERY non-transport error, so a transient state error
        // (a lesson re-locked mid-save, a roster race) silently binned the
        // pupil's work - and the chip still went green because the queue was
        // empty. Now only genuinely permanent errors drop, and a drop is
        // remembered so the chip cannot claim the work was saved.
        var q3 = outboxRead(); q3.shift(); outboxWrite(q3);
        lostWrite = true;
        App.toast(r.error === 'store-full'
          ? 'Saving is full — tell your teacher to check the platform storage.'
          : 'One piece of work could not be saved — tell your teacher.', 6000);
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
    // queued writes keep the chip amber; an emptied queue means all saved
    var chip = $('#save-chip');
    if (!chip || chip.hidden) return;
    if (outboxRead().length > 0) { App.saveStatus('saving'); return; }
    // AUDIT FIX: an empty queue is NOT proof of a save if something was dropped
    if (lostWrite) { chip.hidden = false; chip.className = 'save-chip lost'; chip.innerHTML = 'Not saved &#9888;'; return; }
    App.saveStatus('saved');
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
     aurora's slow CSS drift supplies the life. Parameterised so Agent Kit
     themes can restyle it (density / base colour / accent colour / ratio). */
  var STAR_DEFAULTS = { density: 9000, base: '#CFE0FF', accent: '#FFD84D', ratio: 0.12 };
  var starParams = Object.assign({}, STAR_DEFAULTS);
  var drawStars = null;
  function initStars() {
    var c = document.getElementById('stars');
    if (!c || !c.getContext) return;
    drawStars = function () {
      var w = c.width = global.innerWidth, h = c.height = global.innerHeight;
      var ctx = c.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      var n = Math.floor((w * h) / starParams.density);
      for (var i = 0; i < n; i++) {
        var r = Math.random() * 1.3 + 0.3;
        ctx.globalAlpha = 0.2 + Math.random() * 0.55;
        ctx.fillStyle = Math.random() < starParams.ratio ? starParams.accent : starParams.base;
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    drawStars();
    var t;
    global.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(drawStars, 200); });
  }
  App.setStars = function (p) {
    starParams = Object.assign({}, STAR_DEFAULTS, p || {});
    if (drawStars) drawStars();
  };

  /* ---------------- Agent Kit: apply equipped theme + insignia --------------
     Cosmetic layer over the SHELL only — lesson reading surfaces are untouched
     (they use the fixed light-card palette). Vars come from content/themes.json
     and land as custom-property overrides on :root; the previous theme's
     overrides are removed first so switching back to default is exact. */
  var appliedVars = [];
  function kitTheme_(id) {
    var reg = App.state.kit;
    var th = null;
    if (reg && id) (reg.themes || []).forEach(function (t) { if (String(t.id) === String(id)) th = t; });
    return th;
  }
  function kitInsignia_(id) {
    var reg = App.state.kit;
    var g = null;
    if (reg && id) (reg.insignia || []).forEach(function (x) { if (String(x.id) === String(id)) g = x; });
    return g;
  }
  function syncFxLayer(fx) {
    var old = document.getElementById('fx-layer');
    if (old) old.remove();
    if (!fx) return;
    var d = document.createElement('div');
    d.id = 'fx-layer';
    d.className = 'fx-' + fx;
    d.setAttribute('aria-hidden', 'true');
    if (fx === 'comets') d.innerHTML = '<span class="fx-comet c1"></span><span class="fx-comet c2"></span><span class="fx-comet c3"></span>';
    else if (fx === 'aurora') d.innerHTML = '<span class="fx-band"></span>';
    document.body.appendChild(d);
  }
  App.applyKit = function () {
    var s = App.state;
    var root = document.documentElement;
    appliedVars.forEach(function (v) { root.style.removeProperty(v); });
    appliedVars = [];
    var theme = kitTheme_(s.me && s.me.th);
    var vars = (theme && theme.vars) || {};
    Object.keys(vars).forEach(function (k) {
      if (k.indexOf('--') !== 0) return; // custom properties only
      root.style.setProperty(k, String(vars[k]));
      appliedVars.push(k);
    });
    App.setStars(theme && theme.stars);
    syncFxLayer(theme && theme.fx ? String(theme.fx) : '');
    var ins = kitInsignia_(s.me && s.me.fx);
    var el = $('#agent-insignia');
    if (el) { el.hidden = !ins; el.textContent = ins ? String(ins.glyph) : ''; }
  };
  /* Clearance ladder position for a given XP (clearances are ascending). */
  App.clearanceFor = function (xp) {
    var cs = (App.state.kit && App.state.kit.clearances) || [];
    var cur = { level: 1, xp: 0, name: 'Recruit' }, next = null;
    for (var i = 0; i < cs.length; i++) {
      if (Number(xp) >= Number(cs[i].xp)) cur = cs[i];
      else { next = cs[i]; break; }
    }
    return { cur: cur, next: next };
  };

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
      App.flushOutbox(); // identity is known: this pupil's queue only (AUDIT FIX)
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
      s.pairing = Number(r.pairing == null ? 1 : r.pairing);
      s.absence = r.absence || []; s.year = r.year || 'j1';
      s.resets = r.resets || {};   // teacher "start this lesson again" stamps
      s.contentVersion = String(r.contentVersion || 'v0');
      s.xp = r.me ? Number(r.me.xp || 0) : 0;
      s.codename = r.me ? String(r.me.cn || '') : '';
      purgeOldContent();
      return App.fetchContent(s.year + '/manifest.json').then(function (man) {
        s.man = man;
        // Kit registry rides along; its absence never blocks the platform
        return App.fetchContent('themes.json').then(
          function (reg) { s.kit = reg; },
          function () { s.kit = null; }
        );
      }).then(function () {
        App.applyKit();
        return true;
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

  /* The full-screen guard is shared by sign-in and by opening a lesson; this is
     how its line is kept honest for whichever wait is actually happening. */
  function guardSays(html) {
    var t = $('#guard') && $('#guard').querySelector('.guard-text');
    if (t) t.innerHTML = html;
  }

  /* FIX PACKAGE item 7 (DAMIEN, 31 Jul: "yes, you must do this"). The round ?
     repeated the same three lines on every screen, so it never actually helped
     anyone: "the round ? repeats the same text for every activity. It must give
     proper, per-activity help." The text now comes from the chunk the pupil is
     standing on (content-authored, so every future lesson supplies its own), and
     the generic list survives only on the hub, where there is no activity to
     explain. */
  function renderHelp() {
    var title = $('#help-title'), body = $('#help-body'), generic = $('#help-generic');
    if (!title || !body || !generic) return;
    var ch = (App.state.lesson && App.state.chunks) ? App.state.chunks[App.state.chunkIdx] : null;
    var txt = (ch && ch.config && ch.config.help) ? String(ch.config.help) : '';
    if (txt) {
      title.textContent = ch.title ? ('Help with: ' + ch.title) : 'Help';
      body.innerHTML = '<p class="help-text">' + esc(txt) + '</p>';
      body.hidden = false;
      generic.hidden = true;
    } else {
      title.textContent = 'Stuck?';
      body.innerHTML = '';
      body.hidden = true;
      generic.hidden = false;
    }
  }

  /* ---------------- chrome ---------------- */
  function wireChrome() {
    $('#help-beacon').onclick = function () { renderHelp(); App.openModal('help-modal'); };
    $('#help-close').onclick = function () { App.closeModal('help-modal'); };
    $('#agent-chip').onclick = function () { App.openKit(); };
    $('#join-staff').onclick = function () { if (global.Staff) global.Staff.open(); };
    $('#staff-open').onclick = function () { if (global.Staff) global.Staff.open(); };
    /* FIX PACKAGE item 2 (Damien, 30 Jul): the pupil class link must not offer
       a Staff button at all - hidden, aria-hidden and out of the tab order, so
       it is unreachable by mouse AND keyboard. Staff use the bare /exec URL.
       Deliberately keyed on the URL/boot class ONLY - never the localStorage
       fallback - or a teacher's practice run as a pupil would hide Staff from
       her own bare teacher link on that machine forever (audit finding 25). */
    var urlClass = (function () {
      var boot = global.OLS_BOOT;
      if (boot && boot.classCode) return String(boot.classCode);
      try { return new URLSearchParams(location.search).get('class') || ''; } catch (e) { return ''; }
    })();
    if (urlClass) {
      ['join-staff', 'staff-open'].forEach(function (id) {
        var b = $('#' + id);
        if (!b) return;
        b.hidden = true;
        b.setAttribute('aria-hidden', 'true');
        b.tabIndex = -1;
      });
    }
    $('#player-back').onclick = function () { App.confirmLeaveLesson(); };
    document.querySelectorAll('.modal-close').forEach(function (b) {
      b.onclick = function () { App.closeModal(b.getAttribute('data-close')); };
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') ['help-modal', 'qr-modal', 'confirm-modal', 'kit-modal'].forEach(App.closeModal);
    });
    // active-time heartbeat: visible + recently-interacting minutes count
    var lastInteract = Date.now();
    ['pointerdown', 'keydown', 'scroll'].forEach(function (evt) {
      document.addEventListener(evt, function () { lastInteract = Date.now(); }, { passive: true });
    });
    var beatN = 0;
    setInterval(function () {
      if (document.hidden) return;
      if (Date.now() - lastInteract > 90000) return;
      if (App.state.lesson) App.state.pendingMin += 0.5;
      // presence beacon every other beat (~60s) — feeds pairing + the staff
      // Pairing lens (section 12); review/catch-up runs never count as present
      beatN++;
      if (beatN % 2 === 0) App.ping();
    }, 30000);
    // NB: the outbox is NOT flushed here - App.state.email is not known yet and
    // the queue is per-pupil (AUDIT FIX). joinAndLoad flushes once identity lands.
  }

  /* Presence beacon (fire-and-forget; cache-only server-side). */
  App.ping = function () {
    var s = App.state;
    if (!s.lesson || s.review || s.catchup || !s.lessonEntry) return;
    App.call('ping', {
      lessonNum: String(s.lessonEntry.num),
      ci: Number(s.chunkIdx), cc: (s.chunks || []).length
    });
  };

  /* minutes since 2026-01-01 UTC - the server's tmin_() clock, for comparing a
     saved draft against a teacher's reset stamp */
  function clientTmin_() { return Math.floor((Date.now() - 1767225600000) / 60000); }

  App.openModal = function (id) { var m = $('#' + id); if (m) m.hidden = false; };
  App.closeModal = function (id) {
    var m = $('#' + id);
    if (m) m.hidden = true;
    /* AUDIT FIX C-08: closing the staff panel RE-LOCKS it, whichever path
       closed it (the x, Escape, its own idle clock). Hiding is not closing:
       the body still held answer keys, pupil emails and chat transcripts. */
    if (id === 'staff-modal' && global.Staff && global.Staff.lock) global.Staff.lock();
  };
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
    /* Engine sources are ASCII, so callers write copy as HTML entities
       (&mdash;, &#127914;). textContent showed those raw on screen - pupils
       literally read "Rung cleared &mdash; signal locked in." Decode via a
       detached TEXTAREA: its content is raw text, so entities resolve but no
       markup is ever built, and we still assign with textContent. */
    var dec = document.createElement('textarea');
    dec.innerHTML = String(msg == null ? '' : msg);
    t.textContent = dec.value; t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.hidden = true; }, ms || 2600);
  };
  /* DFM 107 (1 Aug 2026). Copy CSV said "CSV copied." on Safari with an empty
     clipboard: this app runs inside a sandboxed cross-origin iframe, where
     navigator.clipboard.writeText can RESOLVE without writing anything, and
     nothing cross-origin can read the clipboard back to check. A promise that
     cannot be verified must not be reported as success (rule 43: a
     confirmation that isn't true is worse than none).
     So: execCommand first - it is synchronous and it RETURNS whether the copy
     happened - and when it says no, the text goes on screen in a selected box
     for the one keystroke that always works. No path can lie now. */
  App.copyText = function (text, doneMsg) {
    var str = String(text == null ? '' : text);
    var ta = document.createElement('textarea');
    ta.value = str; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, str.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    if (ok) { App.toast(doneMsg || 'Copied.'); return; }
    App.copyBox(str);
  };

  /* The honest fallback: the text, already selected, and the keystroke. */
  App.copyBox = function (str) {
    var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    var keys = mac ? '&#8984;C' : 'Ctrl+C';
    var ov = document.createElement('div');
    ov.className = 'badge-pop show copy-pop';
    ov.innerHTML = '<div class="badge-pop-card copy-card">' +
      '<h2>Press ' + keys + ' to copy</h2>' +
      '<p class="copy-lead">This browser would not let the page copy for you, so here is the text &mdash; ' +
      'it is already selected. Press ' + keys + ', then close this.</p>' +
      '<textarea class="copy-area" readonly rows="6"></textarea>' +
      '<button class="primary-btn" type="button">Close</button></div>';
    document.body.appendChild(ov);
    var area = ov.querySelector('.copy-area');
    area.value = str;
    area.focus(); area.select(); area.setSelectionRange(0, str.length);
    ov.querySelector('button').onclick = function () { ov.remove(); };
  };

  /* ---------------- ghost-click guard (DFM 104) ----------------
     A press landing within GHOST_MS of a control appearing cannot have been
     aimed at it: it is the tail of the press that dismissed the PREVIOUS card,
     arriving wherever the new card happens to put a button. The question
     runner has guarded its options since 31 Jul (rule 82); Damien then watched
     a steps confirm apparently fire the next card's button too, so the guard
     is one helper now and every card mount uses it. It also swallows the
     second half of a genuine double-click: one press, one advance. Buttons
     that are re-used across renders (the tour's Next) re-arm each render,
     which restarts the window - that is the point.
     Pass {repeat:true} for a control that is legitimately pressed more than
     once from the same screen (the practice-typing "Check it", which answers a
     validation message and waits for another go). Those keep the mount-time
     guard and lose only the one-press lock. */
  App.GHOST_MS = 350;
  App.armButton = function (btn, fn, opts) {
    if (!btn) return btn;
    var armedAt = Date.now(), used = false;
    var once = !(opts && opts.repeat);
    btn.onclick = function (e) {
      if (Date.now() - armedAt < App.GHOST_MS) return;
      if (once) { if (used) return; used = true; }
      fn.call(btn, e);
    };
    return btn;
  };

  /* ---------------- HUB ---------------- */
  function lessonState(le) {
    var lk = App.state.locks[String(le.num)];
    var delivered = lk && Number(lk.u) > 0;
    var open = lk && Number(lk.on) === 1;
    var rec = (App.state.me && App.state.me.L) ? App.state.me.L[String(le.num)] : null;
    var done = rec && Number(rec[0]) === 2;
    var flagged = App.state.absence.indexOf(le.id) !== -1;
    /* AUDIT FIX B-05 (27 Jul 2026): the tile used to open on the delivered date
       alone, so a re-locked lesson still read "Ready" on every pupil's hub while
       the staff grid said "Locked" - and opening it burned the first-wins exit
       check on a lesson that never ran. Mirrors lessonAccessible_ exactly: the
       lock's `on` flag decides, except that a pupil who already has a record
       keeps her place (never kick anyone out mid-lesson). */
    var accessible = !!delivered && (!!open || !!rec);
    return { delivered: !!delivered, open: !!open, accessible: accessible,
      done: !!done, flagged: flagged, ready: le.status === 'ready' };
  }

  function showHub() {
    App.state.lesson = null;
    App.state.localKeys = null;
    $('#player').hidden = true;
    $('#topbar').hidden = false;
    $('#help-beacon').hidden = false;
    $('#hub').hidden = false;
    renderHub();
    maybeClearancePop();
  }
  App.showHub = showHub;

  /* Clearance-up celebration: fires on the hub (never mid-lesson) when this
     device last saw a lower clearance than the pupil now holds. First run on a
     device just records the current level quietly — no false fanfare. */
  function maybeClearancePop() {
    var s = App.state;
    if (!s.kit || !s.me) return;
    var lvl = Number(App.clearanceFor(s.xp).cur.level) || 1;
    var key = 'ks3dt-clearance:' + (s.email || 'x');
    var seen = null;
    try { seen = localStorage.getItem(key); } catch (e) {}
    if (seen == null || seen === '') {
      try { localStorage.setItem(key, String(lvl)); } catch (e) {}
      return;
    }
    if (lvl <= Number(seen)) {
      if (lvl < Number(seen)) { try { localStorage.setItem(key, String(lvl)); } catch (e) {} }
      return;
    }
    try { localStorage.setItem(key, String(lvl)); } catch (e) {}
    var rank = App.clearanceFor(s.xp).cur;
    var ov = document.createElement('div');
    ov.className = 'badge-pop';
    ov.innerHTML = '<div class="badge-pop-card">' +
      '<div class="finish-glyph">&#127894;&#65039;</div>' +
      '<h2>Clearance upgraded</h2>' +
      '<p class="badge-pop-name">Clearance ' + Number(rank.level) + ' &mdash; ' + esc(rank.name) + '</p>' +
      /* DAMIEN, 31 Jul 2026: a pupil has never met the term "Agent Kit", so the
         old line explained nothing and the button asked her to open something she
         could not picture. His wording, verbatim. The last sentence is true:
         #agent-chip calls App.openKit (see wireChrome). */
      '<p class="clearance-sub">Your Agent Kit is kind of like this website’s own wardrobe or ' +
      'costumes! It holds the looks and badge designs your console can wear, unlocked as your XP ' +
      'grows. This clearance has just unlocked new ones. Open it to try them on &mdash; you can ' +
      'change your look any time from your name chip, top right.</p>' +
      '<div class="confirm-actions">' +
      '<button class="ghost-btn" data-act="later" type="button">Later</button>' +
      '<button class="primary-btn" data-act="open" type="button">Open Agent Kit</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('show'); });
    function close(thenOpen) {
      ov.classList.remove('show');
      setTimeout(function () { ov.remove(); if (thenOpen) App.openKit(); }, 250);
    }
    App.armButton(ov.querySelector('[data-act=later]'), function () { close(false); });  // DFM 104
    App.armButton(ov.querySelector('[data-act=open]'), function () { close(true); });
  }

  /* ---------------- Agent Kit modal (pupil customisation) ---------------- */
  App.openKit = function () {
    var s = App.state;
    if (!s.me) return; // not joined yet (staff preview of the join screen etc.)
    if (!s.kit) { App.toast('Your Agent Kit could not load — check the wifi and refresh.'); return; }
    renderKit();
    App.openModal('kit-modal');
  };

  function kitClearanceXp_(level) {
    var cs = (App.state.kit && App.state.kit.clearances) || [];
    for (var i = 0; i < cs.length; i++) if (Number(cs[i].level) === Number(level)) return Number(cs[i].xp);
    return 0;
  }

  function renderKit() {
    var s = App.state;
    var reg = s.kit;
    var body = $('#kit-body');
    if (!reg || !body) return;
    var pos = App.clearanceFor(s.xp);
    var curTh = (s.me && s.me.th) || '';
    var curFx = (s.me && s.me.fx) || '';

    // clearance header: rank, XP, progress to the next rank
    var head = '<div class="kit-rank">' +
      '<div class="kit-rank-badge">' + Number(pos.cur.level) + '</div>' +
      '<div class="kit-rank-text">' +
      '<span class="kit-rank-name">Clearance ' + Number(pos.cur.level) + ' &mdash; ' + esc(pos.cur.name) + '</span>' +
      '<span class="kit-rank-xp">' + Number(s.xp) + ' XP</span>' +
      '</div></div>';
    if (pos.next) {
      var span = Number(pos.next.xp) - Number(pos.cur.xp);
      var into = Math.max(0, Number(s.xp) - Number(pos.cur.xp));
      var pct = span > 0 ? Math.min(100, Math.round(100 * into / span)) : 0;
      head += '<div class="kit-next"><div class="kit-next-track"><div class="kit-next-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="kit-next-label">' + Math.max(0, Number(pos.next.xp) - Number(s.xp)) + ' XP to Clearance ' +
        Number(pos.next.level) + ' &mdash; ' + esc(pos.next.name) + '</span></div>';
    } else {
      head += '<div class="kit-next"><span class="kit-next-label maxed">Top clearance reached. Legend.</span></div>';
    }

    // interface themes
    var themes = (reg.themes || []).map(function (t) {
      var needXp = kitClearanceXp_(t.clearance);
      var unlocked = Number(s.xp) >= needXp;
      var equipped = curTh ? String(t.id) === curTh : String(t.id) === 'midnight';
      var v = t.vars || {};
      var pv = '--pv0:' + (v['--space-0'] || '#060D1F') + ';--pv2:' + (v['--space-2'] || '#102040') + ';--pva:' + (v['--gold-hi'] || '#FFD84D');
      return '<button type="button" class="kit-theme' + (unlocked ? '' : ' is-locked') + (equipped ? ' is-equipped' : '') + '"' +
        ' data-theme="' + esc(t.id) + '" style="' + pv + '">' +
        '<span class="kit-swatch"><span class="kit-swatch-node"></span><i></i><i></i><i></i></span>' +
        '<span class="kit-theme-name">' + esc(t.name) + '</span>' +
        '<span class="kit-theme-tag">' + esc(t.tag || '') + '</span>' +
        (equipped ? '<span class="kit-state on">Equipped</span>'
          : unlocked ? '<span class="kit-state go">Tap to equip</span>'
          : '<span class="kit-state lock">&#128274; Clearance ' + Number(t.clearance) + ' &middot; ' + needXp + ' XP</span>') +
        '</button>';
    }).join('');

    // insignia (incl. explicit None)
    var noneOn = !curFx;
    var chips = '<button type="button" class="kit-chip' + (noneOn ? ' is-equipped' : '') + '" data-insignia="">' +
      '<span class="kit-chip-glyph">&mdash;</span><span class="kit-chip-name">None</span></button>';
    chips += (reg.insignia || []).map(function (g) {
      var needXp = kitClearanceXp_(g.clearance);
      var unlocked = Number(s.xp) >= needXp;
      var equipped = curFx === String(g.id);
      return '<button type="button" class="kit-chip' + (unlocked ? '' : ' is-locked') + (equipped ? ' is-equipped' : '') + '"' +
        ' data-insignia="' + esc(g.id) + '" data-clearance="' + Number(g.clearance) + '" data-need="' + needXp + '">' +
        '<span class="kit-chip-glyph">' + esc(g.glyph) + '</span>' +
        '<span class="kit-chip-name">' + esc(g.name) + '</span>' +
        (unlocked ? '' : '<span class="kit-chip-lock">&#128274;</span>') +
        '</button>';
    }).join('');

    body.innerHTML = head +
      '<h3 class="kit-section">Interface</h3><div class="kit-themes">' + themes + '</div>' +
      '<h3 class="kit-section">Insignia <small>shows beside your codename</small></h3><div class="kit-chips">' + chips + '</div>' +
      '<p class="kit-foot">Tap to equip &mdash; every choice saves to your Agent File by itself. Earn XP by completing missions and nailing your checks; higher clearance unlocks more kit.</p>' +
      '<div class="confirm-actions" style="margin-top:6px"><button type="button" class="primary-btn" id="kit-done">Done</button></div>';

    body.querySelectorAll('.kit-theme').forEach(function (el) {
      el.onclick = function () { pickTheme(el, String(el.getAttribute('data-theme'))); };
    });
    body.querySelectorAll('.kit-chip').forEach(function (el) {
      el.onclick = function () { pickInsignia(el, String(el.getAttribute('data-insignia'))); };
    });
    var doneBtn = body.querySelector('#kit-done');
    if (doneBtn) doneBtn.onclick = function () { App.closeModal('kit-modal'); };
  }

  function lockedNudge_(el, clearance, needXp) {
    el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble');
    var short = Math.max(0, needXp - Number(App.state.xp));
    App.toast('Locked — Clearance ' + clearance + ' kit. ' + short + ' XP to go, Agent.', 3200);
  }

  /* Equip = optimistic apply (instant, feels great) + server save; on a server
     refusal the previous kit is restored. The server re-checks clearance, so a
     DevTools call can't equip locked kit (cosmetic, but the rule is the rule). */
  function pickTheme(el, id) {
    var s = App.state;
    var th = kitTheme_(id);
    if (!th) return;
    if (el.classList.contains('is-locked')) { lockedNudge_(el, Number(th.clearance), kitClearanceXp_(th.clearance)); return; }
    var prev = (s.me && s.me.th) || '';
    var next = (id === 'midnight') ? '' : id; // default stored as '' (record stays lean)
    if (prev === next) return;
    s.me.th = next;
    App.applyKit();
    renderKit();
    App.call('setKit', { themeId: next }).then(function (r) {
      if (!r || !r.ok) {
        s.me.th = prev;
        App.applyKit();
        renderKit();
        App.toast(r && r.error === 'kit-locked' ? 'That kit is above your clearance.' : 'Could not save your kit — try again.');
      } else {
        App.toast('Equipped — saved to your Agent File.', 2000);
      }
    });
  }

  function pickInsignia(el, id) {
    var s = App.state;
    if (el.classList.contains('is-locked')) {
      lockedNudge_(el, Number(el.getAttribute('data-clearance')), Number(el.getAttribute('data-need')));
      return;
    }
    var prev = (s.me && s.me.fx) || '';
    if (prev === id) return;
    s.me.fx = id;
    App.applyKit();
    renderKit();
    App.call('setKit', { insigniaId: id }).then(function (r) {
      if (!r || !r.ok) {
        s.me.fx = prev;
        App.applyKit();
        renderKit();
        App.toast(r && r.error === 'kit-locked' ? 'That insignia is above your clearance.' : 'Could not save your kit — try again.');
      } else {
        App.toast('Equipped — saved to your Agent File.', 2000);
      }
    });
  }

  function renderHub() {
    var s = App.state, man = s.man;
    $('#topbar-year').textContent = man.title;
    $('#hero-title').textContent = man.title;
    $('#hero-kicker').textContent = man.tagline || '';
    var who = s.codename ? 'Agent ' + s.codename : (s.name.split(' ')[0] || 'Agent');
    $('#hero-welcome').textContent = 'Welcome back, ' + who + '.';
    $('#agent-name').textContent = who;
    $('#agent-xp').textContent = s.xp + ' XP';

    // Side quests never count toward the year ring or steal the hero CTA —
    // the 17-mission spine is the progress story; side quests are extras.
    var coreLessons = (man.lessons || []).filter(function (le) { return !le.side; });
    var doneCount = 0, continueTarget = null;
    coreLessons.forEach(function (le) {
      var st = lessonState(le);
      if (st.done) doneCount++;
      else if (!continueTarget && st.accessible && st.ready) continueTarget = le;
    });
    $('#ring-count').textContent = doneCount;
    var circ = 2 * Math.PI * 52;
    var fill = $('#ring-fill');
    fill.style.strokeDasharray = circ;
    fill.style.strokeDashoffset = circ * (1 - doneCount / (coreLessons.length || 1));

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
    else if (st.accessible && st.ready) cls += ' is-open';
    else cls += ' is-locked';
    if (st.flagged) cls += ' is-flagged';
    if (le.side) cls += ' is-side';
    el.className = cls;
    el.style.setProperty('--blk', blockMeta.color || '#4FA3D9');
    // journey markup: a glowing node on the spine + a glass mission card
    el.innerHTML =
      '<span class="tile-icon">' + esc(le.icon || '📘') + '</span>' +
      '<span class="tile-card">' +
        '<span class="tile-num">' + esc(le.side ? 'Side Quest' : 'Lesson ' + le.num) + '</span>' +
        '<span class="tile-title">' + esc(le.title) + '</span>' +
        '<span class="tile-tag">' + esc(le.tagline || '') + '</span>' +
        (st.done ? '<span class="tile-state done">&#10003; Complete</span>'
          : st.flagged ? '<span class="tile-state flag">Absent? Catch up</span>'
          : (st.accessible && st.ready) ? '<span class="tile-state open">Ready</span>'
          : '<span class="tile-state lock">&#128274;</span>') +
      '</span>';
    el.onclick = function () {
      if (st.flagged && !st.done) { App.openLesson(le.id, { catchup: true }); return; }
      if (st.accessible && st.ready) { App.openLesson(le.id, {}); return; }
      if (st.accessible && !st.ready) { App.toast('This lesson is being prepared — it will be ready before your class needs it.'); return; }
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
    /* Rule 42, no silent waits. The full-screen guard already covers the wait to
       open a lesson, but it was still saying "Getting your details" - the sign-in
       message - so the screen was telling her the wrong thing for five seconds.
       Restored afterwards, because sign-in shares this overlay. */
    guardSays('Opening your lesson&hellip;');
    $('#guard').hidden = false;
    App.fetchContent(le.file).then(function (lesson) {
      $('#guard').hidden = true;
      guardSays('Getting your details&hellip;');
      App.state.lesson = lesson;
      App.state.lessonEntry = le;
      /* rule 97: pull this lesson's answer key in the background so every tap
         marks on this machine. Nothing waits on it - a tap that wins the race
         simply falls back to the server for that one answer. */
      App.state.localKeys = null;
      App.call('lessonKeys', { lessonId: le.id }).then(function (kr) {
        if (kr && kr.ok && kr.keys && App.state.lesson === lesson) App.state.localKeys = kr.keys;
      });
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
      $('#save-chip').hidden = true; // fresh lesson: chip appears on the first save
      $('#player-num').textContent = le.side ? 'Side Quest' : 'Lesson ' + le.num;
      $('#player-title').textContent = lesson.title;
      $('#player-xp').textContent = App.state.xp + ' XP';
      loadDraftThen(function () {
        // resume: skip chunks already completed on a previous visit/refresh
        // (review mode starts from the top instead — it's a re-read, not a resume)
        /* A teacher can send a lesson back to the start (30 Jul 2026). Her
           stamp lives on the class; a pupil's resume position lives in her own
           private storage, so the comparison has to happen here, on the
           pupil's own machine - and the stale draft is thrown away rather than
           left to resurrect on the next save. */
        var rstAt = Number((App.state.resets || {})[String(le.num)] || 0);
        if (rstAt && Number((App.state.draft || {}).t || 0) < rstAt) {
          App.state.draft = {};
          if (!App.state.draftUnavailable) App.call('saveEvent', { lessonNum: String(le.num), draft: { t: clientTmin_() } });
        }
        var done = (App.state.review || !App.state.draft) ? [] : (App.state.draft.done || []);
        var idx = 0;
        while (idx < App.state.chunks.length - 1 && done.indexOf(App.state.chunks[idx].id) !== -1) idx++;
        App.state.chunkIdx = idx;
        renderRail(); mountChunk();
      });
    }).catch(function () {
      $('#guard').hidden = true;
      guardSays('Getting your details&hellip;');
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
      /* AUDIT FIX (26 Jul 2026): a FAILED call used to be indistinguishable from
         "no saved work yet" - apiLoadDraft always returns ok, so the empty branch
         was reachable only by transport failure. The pupil was then restarted at
         chunk 0 and her first Continue OVERWROTE the real draft: a four-second
         wifi blip destroyed a whole micro:bit build. Now a failure is remembered
         and every draft write is suppressed until a good read succeeds. */
      App.state.draftUnavailable = !(r && r.ok);
      App.state.draft = (r && r.ok && r.draft) ? r.draft : {};
      if (App.state.draftUnavailable) {
        App.toast('Could not load your saved work — nothing will be overwritten. Refresh when the wifi is back.', 6000);
      }
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
    s.advancing = false;          // a chunk is on screen again: advancing is allowed
    var ch = s.chunks[s.chunkIdx];
    var host = $('#chunk-host');
    host.innerHTML = '';
    host.className = 'chunk-host engine-' + ch.engine;
    global.scrollTo(0, 0);
    renderRail();
    App.ping(); // fresh chunk position for the pairing/laggard picture
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
        /* DAMIEN, 31 Jul 2026 (rule 97): marking is instant. The key arrived in
           the background when the lesson opened; the server trip survives only
           for a tap that beats the key fetch or a fetch the wifi ate. A resolved
           promise settles before the next paint, so the Checking state never
           even renders on this path. */
        var k = s.localKeys && s.localKeys[itemId];
        if (k && k.a != null) {
          return Promise.resolve({ ok: true, correct: Number(choice) === Number(k.a),
            correctIdx: Number(k.a), explain: String(k.explain || ''), local: 1 });
        }
        return App.call('mark', { lessonId: s.lesson.id, itemId: itemId, choice: choice });
      },
      review: s.review,
      catchup: s.catchup,
      saveEvent: function (payload) {
        if (s.review) return Promise.resolve({ ok: true, xp: s.xp });
        payload = payload || {};
        // AUDIT FIX: with the draft unread, an engine's own progress save would
        // overwrite the stored draft with a blank one. Keep the XP/badge half.
        if (s.draftUnavailable && payload.draft) delete payload.draft;
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
        /* LIVE BUG (30 Jul 2026): the save used to start only AFTER the pupil
           dismissed the badge, and the finished activity stayed on screen the
           whole time. On the real app that is a two-second window in which the
           old Finish button is still sitting there asking to be pressed - and
           pressing it skipped the next chunk for good. So: start saving
           immediately, and the moment the badge is dismissed put a plain
           "saving" panel up, so there is never a stale control to click. */
        var save = App.engineCtx(ch).saveEvent({ xp: badge.xp || 0, detail: d });
        return App.badgeCelebration(badge).then(function () {
          var host = $('#chunk-host');
          if (host) host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Saving your badge&hellip;</span></div>';
          return save;
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
      App.armButton(ov.querySelector('button'), function () {   // DFM 104
        ov.classList.remove('show');
        setTimeout(function () { ov.remove(); resolve(); }, 250);
      });
    });
  };

  App.nextChunk = function () {
    var s = App.state;
    /* Belt and braces for the 30 Jul live bug: whatever calls this, one advance
       per mounted chunk. Two calls in a row used to mark the NEXT chunk
       complete without ever showing it, and saved progress made that permanent. */
    if (s.advancing) return;
    s.advancing = true;
    // record completion for refresh-resume (fire-and-forget draft save)
    var doneId = !s.review && s.chunks[s.chunkIdx] && s.chunks[s.chunkIdx].id;
    if (doneId) {
      s.draft = s.draft || {};
      s.draft.done = s.draft.done || [];
      if (s.draft.done.indexOf(doneId) === -1) s.draft.done.push(doneId);
      var payload = { lessonNum: String(s.lessonEntry.num) };
      if (!s.draftUnavailable) { s.draft.t = clientTmin_(); payload.draft = s.draft; } // AUDIT FIX: never clobber an unread draft
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
    s.advancing = false;
    if (global.PairKit) global.PairKit.stop();
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
    App.armButton(ov.querySelector('button'), function () {   // DFM 104
      ov.remove();
      $('#guard').hidden = false;
      App.refreshState().then(function () { $('#guard').hidden = true; showHub(); });
    });
  }

  App.confirmLeaveLesson = function () {
    App.confirm('Leave the lesson?', 'Your progress so far is saved — you can come back to where you left off.', 'Leave', function (yes) {
      if (!yes) return;
      if (global.PairKit) global.PairKit.stop(); // never poll a channel from the hub
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
