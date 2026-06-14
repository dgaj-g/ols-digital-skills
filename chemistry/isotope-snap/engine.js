/* ============================================================================
   Isotope Lab — shared engine
   Transport (Path B / offline), identity, state, sound, narrator, drag,
   modals, router. Every mode file attaches to window.Lab.
   ============================================================================ */
(function (global) {
  'use strict';

  var Lab = global.Lab = {};

  /* ---------- tiny DOM helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  Lab.$ = $; Lab.$$ = $$; Lab.esc = esc; Lab.shuffle = shuffle; Lab.clamp = clamp;

  /* ---------- app state ---------- */
  Lab.state = {
    email: '', firstName: '', surname: '', name: '',
    classCode: 'default', preview: true, signedIn: false,
    xp: 0,
    progress: { atom: { done: 0, best: 0 }, snap: { plays: 0, bestStreak: 0, bestScore: 0 }, massspec: { done: 0, correct: 0 } }
  };

  /* ---------- transport ----------
     Path B injects window.OLS_TRANSPORT.call(params) -> google.script.run.
     Otherwise we use the offline stub below (localStorage + seeded demo). */
  function pickTransport() {
    if (global.OLS_TRANSPORT && typeof global.OLS_TRANSPORT.call === 'function') {
      Lab.state.preview = false;
      return global.OLS_TRANSPORT;
    }
    return offlineTransport();
  }
  Lab.classCode = function () {
    var boot = global.OLS_BOOT;
    if (boot && boot.classCode) return String(boot.classCode);
    try { var q = new URLSearchParams(location.search).get('class'); if (q) return q; } catch (e) {}
    return 'default';
  };
  Lab.baseUrl = function () {
    var boot = global.OLS_BOOT;
    if (boot && boot.baseUrl) return String(boot.baseUrl);
    return location.origin + location.pathname;
  };
  Lab.classLink = function (name) { return Lab.baseUrl() + '?class=' + encodeURIComponent(name); };

  var _T = null;
  Lab.call = function (action, params) {
    if (!_T) _T = pickTransport();
    var p = Object.assign({ action: action, classCode: Lab.state.classCode }, params || {});
    return _T.call(p).catch(function (err) {
      console.error('[Lab.call ' + action + ']', err);
      return { ok: false, error: 'transport', message: String(err && err.message || err) };
    });
  };

  /* ============================================================
     OFFLINE STUB — mirrors the server API exactly, with seeded
     demo data so the staff dashboard / groups / leaderboard are
     fully reviewable on localhost. Passcode: "demo".
     ============================================================ */
  function offlineTransport() {
    var LS = global.localStorage;
    var DB_KEY = 'isolab:db';
    var SEED_VERSION = 5;

    function loadDb() {
      try { var db = JSON.parse(LS.getItem(DB_KEY)); if (!db || db.version !== SEED_VERSION) return seed(); return db; } catch (e) { return seed(); }
    }
    function saveDb(db) { try { LS.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }

    /* Seed a populated DEMO class (the bare-URL preview pupil lands here too,
       so the leaderboard, groups and dashboard are all reviewable on localhost). */
    function seed() {
      var demoNames = [
        ['Aoife', 'Murphy'], ['Niamh', 'Kelly'], ['Saoirse', 'Byrne'], ['Ciara', 'Doyle'],
        ['Erin', 'Walsh'], ['Orla', 'Quinn'], ['Mia', 'Connor'], ['Eabha', 'Hughes'], ['Caoimhe', 'Ryan']
      ];
      var pupils = {};
      demoNames.forEach(function (nm, i) {
        var em = nm[0].toLowerCase() + '.' + nm[1].toLowerCase() + '@demo.c2ken.net';
        var atom = (i % 4) * 20, snap = 20 + (i * 7) % 90, mass = (i % 3) * 30;
        pupils[em] = {
          email: em, firstName: nm[0], surname: nm[1], name: nm[0] + ' ' + nm[1],
          xp: atom + snap + mass,
          progress: { atom: { done: (i % 4), best: (i % 4) }, snap: { plays: 1, bestStreak: i % 6, bestScore: snap }, massspec: { done: (i % 3), correct: (i % 3) } },
          groupId: null
        };
      });
      // (the previewing pupil IS one of these seeded pupils — Aoife Murphy — so the
      // preview shows the live auto-name experience: greeted, grouped, on the board)
      var ae = 'aoife.murphy@demo.c2ken.net';
      if (pupils[ae]) { pupils[ae].xp = 95; pupils[ae].progress = { atom: { done: 2, best: 2 }, snap: { plays: 2, bestStreak: 5, bestScore: 65 }, massspec: { done: 3, correct: 2 } }; }
      // pre-made groups, hidden by default (demonstrates the new feature's hidden state)
      var groups = [
        { id: 'g1', name: 'Curie', members: [], revealed: false },
        { id: 'g2', name: 'Bohr', members: [], revealed: false },
        { id: 'g3', name: 'Dalton', members: [], revealed: false }
      ];
      Object.keys(pupils).forEach(function (em, i) { var g = groups[i % 3]; g.members.push(em); pupils[em].groupId = g.id; });
      var db = {
        version: SEED_VERSION,
        classes: { 'default': { name: 'default', pupils: pupils, groups: groups, groupsRevealed: false } },
        passcode: 'demo'
      };
      saveDb(db);
      return db;
    }
    function cls(db, code) {
      if (!db.classes[code]) db.classes[code] = { name: code, pupils: {}, groups: [], groupsRevealed: false };
      return db.classes[code];
    }
    function me(db, code) {
      var c = cls(db, code);
      var em = Lab.state.email || 'preview.player@c2ken.net';
      if (!c.pupils[em]) c.pupils[em] = { email: em, firstName: '', surname: '', name: '', xp: 0,
        progress: { atom: { done: 0, best: 0 }, snap: { plays: 0, bestStreak: 0, bestScore: 0 }, massspec: { done: 0, correct: 0 } }, groupId: null };
      return c.pupils[em];
    }
    function ranked(c) {
      return Object.keys(c.pupils).map(function (k) { return c.pupils[k]; })
        .filter(function (p) { return p.name; })
        .sort(function (a, b) { return b.xp - a.xp || a.name.localeCompare(b.name); });
    }
    function sanitizeClass(n) { return String(n || '').trim().replace(/[^A-Za-z0-9_\- ]/g, '').replace(/\s+/g, '-').slice(0, 40); }

    var api = {
      whoami: function () {
        // mimic the live C2k auto-name so the preview shows the zero-typing flow
        return res({ ok: true, email: 'aoife.murphy@demo.c2ken.net', name: 'Aoife Murphy', preview: true });
      },
      setName: function (p) {
        var db = loadDb(), m = me(db, p.classCode);
        m.firstName = String(p.firstName || ''); m.surname = String(p.surname || '');
        m.name = (m.firstName + ' ' + m.surname).trim();
        saveDb(db); return res({ ok: true, name: m.name });
      },
      state: function (p) {
        var db = loadDb(), m = me(db, p.classCode);
        return res({ ok: true, name: m.name, xp: m.xp, progress: m.progress });
      },
      save: function (p) {
        var db = loadDb(), m = me(db, p.classCode);
        if (p.progress) m.progress = p.progress;
        if (typeof p.xp === 'number') m.xp = p.xp;
        saveDb(db); return res({ ok: true, xp: m.xp });
      },
      leaderboard: function (p) {
        var db = loadDb(), c = cls(db, p.classCode), rows = ranked(c);
        var em = Lab.state.email || 'preview.player@c2ken.net';
        var top = rows.slice(0, 8).map(function (r, i) { return { rank: i + 1, name: r.name, xp: r.xp, isMe: r.email === em }; });
        var pos = 0; for (var i = 0; i < rows.length; i++) if (rows[i].email === em) pos = i + 1;
        return res({ ok: true, top: top, me: { pos: pos, total: rows.length, xp: (c.pupils[em] || {}).xp || 0 } });
      },
      myGroup: function (p) {
        var db = loadDb(), c = cls(db, p.classCode), m = me(db, p.classCode);
        if (!m.groupId) return res({ ok: true, inGroup: false });
        var g = c.groups.filter(function (x) { return x.id === m.groupId; })[0];
        if (!g) return res({ ok: true, inGroup: false });
        var members = g.members.map(function (em) { return c.pupils[em]; }).filter(Boolean);
        var teamXp = members.reduce(function (s, x) { return s + (x.xp || 0); }, 0);
        var revealed = c.groupsRevealed || !!g.revealed;
        return res({ ok: true, inGroup: true, groupName: g.name, revealed: revealed,
          members: revealed ? members.map(function (x) { return { name: x.name, isMe: x.email === m.email, xp: x.xp }; }) : null,
          memberCount: g.members.length, teamXp: teamXp, myXp: m.xp });
      },
      admin: function (p) {
        var db = loadDb();
        if (String(p.passcode || '').trim().toLowerCase() !== String(db.passcode).trim().toLowerCase())
          return res({ ok: false, error: 'bad-passcode' });
        var c = cls(db, p.className || p.classCode || 'default');
        switch (p.sub) {
          case 'classes':
            return res({ ok: true, classes: Object.keys(db.classes).map(function (k) {
              return { name: k, count: Object.keys(db.classes[k].pupils).filter(function (e) { return db.classes[k].pupils[e].name; }).length };
            }) });
          case 'addClass': { var nm = sanitizeClass(p.name); if (nm) cls(db, nm); saveDb(db); return res({ ok: true }); }
          case 'deleteClass': { delete db.classes[sanitizeClass(p.name)]; saveDb(db); return res({ ok: true }); }
          case 'data': {
            var parts = Object.keys(c.pupils).map(function (k) { return c.pupils[k]; }).filter(function (x) { return x.name; });
            return res({ ok: true, participants: parts.map(primPupil) });
          }
          case 'groups': return res(Object.assign({ ok: true }, groupsPayload(c)));
          case 'createGroup': {
            var id = 'g' + (c.groups.length + 1) + '-' + Math.floor(Math.abs(hashStr(p.name + c.groups.length)) % 9000 + 1000);
            c.groups.push({ id: id, name: String(p.name || ('Group ' + (c.groups.length + 1))).slice(0, 24), members: [], revealed: false });
            saveDb(db); return res({ ok: true, id: id });
          }
          case 'assignPupil': {
            c.groups.forEach(function (g) { g.members = g.members.filter(function (e) { return e !== p.email; }); });
            if (p.groupId) { var g = c.groups.filter(function (x) { return x.id === p.groupId; })[0]; if (g && g.members.indexOf(p.email) < 0) g.members.push(p.email); }
            if (c.pupils[p.email]) c.pupils[p.email].groupId = p.groupId || null;
            saveDb(db); return res({ ok: true });
          }
          case 'autoGroup': {
            var n = clamp(parseInt(p.n, 10) || 3, 2, 10);
            var names = ['Curie', 'Bohr', 'Dalton', 'Rutherford', 'Mendeleev', 'Lavoisier', 'Faraday', 'Newlands', 'Thomson', 'Chadwick'];
            c.groups = []; for (var i = 0; i < n; i++) c.groups.push({ id: 'g' + (i + 1), name: names[i], members: [], revealed: false });
            var ps = shuffle(Object.keys(c.pupils).filter(function (e) { return c.pupils[e].name; }));
            ps.forEach(function (em, i) { var gi = i % n; c.groups[gi].members.push(em); c.pupils[em].groupId = c.groups[gi].id; });
            saveDb(db); return res({ ok: true });
          }
          case 'setReveal': { c.groupsRevealed = !!p.revealed; saveDb(db); return res({ ok: true }); }
          case 'deleteGroup': {
            c.groups.filter(function (g) { return g.id === p.groupId; }).forEach(function (g) {
              g.members.forEach(function (em) { if (c.pupils[em]) c.pupils[em].groupId = null; });
            });
            c.groups = c.groups.filter(function (g) { return g.id !== p.groupId; });
            saveDb(db); return res({ ok: true });
          }
          default: return res({ ok: false, error: 'unknown-sub' });
        }
      }
    };
    function primPupil(x) {
      return { email: x.email, name: x.name, xp: x.xp || 0,
        atomXp: (x.progress.atom.done || 0) * 20,
        snapXp: x.progress.snap.bestScore || 0,
        massXp: (x.progress.massspec.correct || 0) * 30,
        atomDone: x.progress.atom.done || 0, snapStreak: x.progress.snap.bestStreak || 0,
        massDone: x.progress.massspec.done || 0, massCorrect: x.progress.massspec.correct || 0 };
    }
    function groupsPayload(c) {
      var pupils = Object.keys(c.pupils).map(function (k) { return c.pupils[k]; }).filter(function (x) { return x.name; });
      return {
        groupsRevealed: !!c.groupsRevealed,
        groups: c.groups.map(function (g) {
          var mem = g.members.map(function (em) { return c.pupils[em]; }).filter(Boolean);
          return { id: g.id, name: g.name, revealed: !!g.revealed,
            teamXp: mem.reduce(function (s, x) { return s + (x.xp || 0); }, 0),
            members: mem.map(function (x) { return { email: x.email, name: x.name, xp: x.xp || 0 }; }) };
        }),
        pupils: pupils.map(function (x) { return { email: x.email, name: x.name, xp: x.xp || 0, groupId: x.groupId || null }; })
      };
    }
    function hashStr(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; }
    function res(o) { return new Promise(function (r) { setTimeout(function () { r(o); }, 70); }); }
    return { call: function (p) { var fn = api[p.action]; return fn ? fn(p) : res({ ok: false, error: 'unknown' }); } };
  }

  /* ---------- progress helpers ---------- */
  var _saveTimer = null;
  Lab.persist = function () {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function () {
      Lab.call('save', { xp: Lab.state.xp, progress: Lab.state.progress });
    }, 350);
  };
  Lab.addXp = function (amount) {
    Lab.state.xp += amount;
    var pill = $('#xp-pill'), val = $('#xp-value');
    if (val) val.textContent = Lab.state.xp;
    if (pill) { pill.hidden = false; pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }
    Lab.persist();
  };
  Lab.updateHubProgress = function () {
    var pr = Lab.state.progress;
    setProg('atom', pr.atom.done > 0 ? '✓ ' + pr.atom.done + ' atom' + (pr.atom.done === 1 ? '' : 's') + ' built' : '');
    setProg('snap', pr.snap.bestStreak > 0 ? '✓ best streak ' + pr.snap.bestStreak : '');
    setProg('massspec', pr.massspec.done > 0 ? '✓ ' + pr.massspec.correct + ' identified' : '');
    function setProg(mode, txt) {
      var el = $('#prog-' + mode); if (el) el.textContent = txt;
      var badge = $('#badge-' + mode);
      if (badge && txt) badge.classList.add('done');
    }
  };

  /* ============================================================
     SOUND — Web Audio synth (no libraries, file://-safe)
     ============================================================ */
  var actx = null;
  function ctx() {
    if (!actx) { try { actx = new (global.AudioContext || global.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, start, dur, type, peak) {
    var c = ctx(); if (!c) return;
    var t0 = c.currentTime + start;
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = type || 'sine'; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak || 0.18, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  Lab.sound = {
    unlock: function () { ctx(); },
    pop: function () { tone(520, 0, 0.09, 'triangle', 0.12); },
    correct: function () { tone(523, 0, 0.12, 'sine', 0.16); tone(659, 0.08, 0.12, 'sine', 0.16); tone(784, 0.16, 0.2, 'sine', 0.16); },
    wrong: function () { tone(196, 0, 0.18, 'sawtooth', 0.12); tone(165, 0.1, 0.22, 'sawtooth', 0.12); },
    snapYes: function () { tone(660, 0, 0.08, 'square', 0.14); tone(990, 0.06, 0.16, 'square', 0.14); tone(1320, 0.14, 0.22, 'sine', 0.12); },
    snapNo: function () { tone(330, 0, 0.12, 'sawtooth', 0.13); tone(220, 0.11, 0.24, 'sawtooth', 0.12); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.1, 0.3, 'sine', 0.16); }); }
  };

  /* ============================================================
     NARRATOR — the Young Bunsens
     ============================================================ */
  var NARR = {
    hub:        { img: 'anim_03_both_wink.webp', text: 'Pick a station to begin. Each one teaches a different part of isotopes.' },
    atom_open:  { img: 'anim_09_lightbulb_idea.webp', text: 'Add protons to choose the element, neutrons for the isotope, and electrons for the shells. Spin it around!' },
    atom_win:   { img: 'anim_06_confetti_celebration.webp', text: 'Spot on! That is exactly the right atom.' },
    atom_miss:  { img: 'anim_05_thumbs_down_sad.webp', text: 'Not quite. Check the protons and neutrons against the target.' },
    snap_open:  { img: 'anim_12_goggles_shine.webp', text: 'Watch closely. Snap only when both cards are the same element with a different mass.' },
    snap_yes:   { img: 'anim_07_success_check.webp', text: 'Great call! Same protons, different neutrons means isotopes.' },
    snap_no:    { img: 'anim_05_thumbs_down_sad.webp', text: 'Careful! Look again at the protons and the mass numbers.' },
    snap_done:  { img: 'anim_15_level_up_stars.webp', text: 'Round complete. Your streak counts towards the leaderboard.' },
    mass_open:  { img: 'anim_14_magnifier_scan.webp', text: 'Drag each mass and abundance into the brackets, then divide by the total abundance.' },
    mass_win:   { img: 'anim_06_confetti_celebration.webp', text: 'Perfect. You read the spectrum and found the element.' },
    mass_miss:  { img: 'anim_09_lightbulb_idea.webp', text: 'Close. Remember: multiply mass by abundance, add them, then divide by the total abundance.' },
    group:      { img: 'anim_04_thumbs_up_smile.webp', text: 'You are part of a team. Every bit of XP you earn helps your group.' }
  };
  Lab.narrate = function (key, customText) {
    var line = NARR[key]; if (!line && !customText) return;
    var img = $('#narrator-img'), txt = $('#narrator-text');
    if (!img || !txt) return;
    img.classList.add('swap-out');
    setTimeout(function () {
      if (line && line.img) img.src = 'assets/characters/' + line.img;
      txt.textContent = customText || (line && line.text) || '';
      img.classList.remove('swap-out');
    }, 180);
  };

  /* ============================================================
     ROUTER + MODALS + OVERLAYS
     ============================================================ */
  var SCREENS = ['signin', 'hub', 'atom', 'snap', 'massspec'];
  Lab.showScreen = function (name) {
    SCREENS.forEach(function (s) { var el = $('#screen-' + s); if (el) el.hidden = (s !== name); });
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  };
  Lab.openModal = function (id) { var m = $('#' + id); if (m) m.hidden = false; };
  Lab.closeModal = function (id) { var m = $('#' + id); if (m) m.hidden = true; };

  Lab.toast = function (text, type) {
    var t = $('#toast'), tx = $('#toast-text'), ch = $('#toast-char');
    if (!t) return;
    tx.textContent = text;
    t.className = 'toast' + (type === 'good' ? ' good' : '');
    if (ch) ch.src = 'assets/characters/' + (type === 'good' ? 'anim_07_success_check.webp' : 'anim_05_thumbs_down_sad.webp');
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(function () {
      t.classList.add('dismiss');
      setTimeout(function () { t.hidden = true; t.classList.remove('dismiss'); }, 260);
    }, 3400);
  };

  Lab.celebrate = function (opts) {
    var ov = $('#celebrate');
    $('#celebrate-char').src = 'assets/characters/' + (opts.char || 'anim_06_confetti_celebration.webp');
    $('#celebrate-title').textContent = opts.title || 'Brilliant!';
    $('#celebrate-body').textContent = opts.body || '';
    var stats = $('#celebrate-stats'); stats.innerHTML = '';
    (opts.stats || []).forEach(function (s) {
      var d = document.createElement('div'); d.className = 'cstat';
      d.innerHTML = '<b>' + esc(s.value) + '</b><span>' + esc(s.label) + '</span>';
      stats.appendChild(d);
    });
    var cta = $('#celebrate-cta'); cta.textContent = opts.cta || 'Continue';
    cta.onclick = function () { ov.hidden = true; if (opts.onContinue) opts.onContinue(); };
    ov.hidden = false;
    if (opts.sound !== false) Lab.sound.win();
  };

  Lab.confirm = function (title, body, okLabel, cb) {
    $('#confirm-title').textContent = title;
    $('#confirm-body').textContent = body || '';
    var ok = $('#confirm-ok'), cancel = $('#confirm-cancel');
    ok.textContent = okLabel || 'Confirm';
    function close() { Lab.closeModal('confirm-modal'); ok.onclick = null; cancel.onclick = null; }
    ok.onclick = function () { close(); cb && cb(true); };
    cancel.onclick = function () { close(); cb && cb(false); };
    Lab.openModal('confirm-modal');
  };

  /* ============================================================
     DRAG ENGINE — canonical Pointer Events (document-level listeners,
     position:fixed lift, page-wide selection lock). Reusable.
     opts: { onTap, getDropTarget(x,y,node), onDrop(node,target,x,y), onHover(target,node) }
     ============================================================ */
  var TAP_PX = 6;
  Lab.makeDraggable = function (node, opts) {
    node.__drag = opts || {};
    node.addEventListener('pointerdown', onDown);
  };
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var node = e.currentTarget;
    var st = { node: node, id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, lastTarget: null };
    node.__dragState = st;
    function move(ev) {
      if (ev.pointerId !== st.id) return;
      var dx = ev.clientX - st.sx, dy = ev.clientY - st.sy;
      if (!st.moved && Math.hypot(dx, dy) > TAP_PX) { st.moved = true; lift(node); }
      if (st.moved) {
        node.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.06) rotate(-1.5deg)';
        var tgt = node.__drag.getDropTarget ? node.__drag.getDropTarget(ev.clientX, ev.clientY, node) : null;
        if (tgt !== st.lastTarget) {
          clearHover();
          if (tgt) tgt.classList.add('drop-hover');
          if (node.__drag.onHover) node.__drag.onHover(tgt, node);
          st.lastTarget = tgt;
        }
      }
    }
    function up(ev) {
      if (ev.pointerId !== st.id) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      document.body.classList.remove('dragging-active');
      var tgt = st.moved && node.__drag.getDropTarget ? node.__drag.getDropTarget(ev.clientX, ev.clientY, node) : null;
      clearHover();
      reset(node);
      if (!st.moved) { if (node.__drag.onTap) node.__drag.onTap(node); }
      else { if (node.__drag.onDrop) node.__drag.onDrop(node, tgt, ev.clientX, ev.clientY); }
      node.__dragState = null;
    }
    function cancel(ev) {
      if (ev.pointerId !== st.id) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      document.body.classList.remove('dragging-active');
      clearHover(); reset(node); node.__dragState = null;
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    document.body.classList.add('dragging-active');
  }
  function lift(node) {
    var r = node.getBoundingClientRect();
    node._home = { w: node.style.width, pos: node.style.position, left: node.style.left, top: node.style.top, margin: node.style.margin, z: node.style.zIndex, pe: node.style.pointerEvents };
    node.style.width = r.width + 'px';
    node.style.position = 'fixed';
    node.style.left = r.left + 'px';
    node.style.top = r.top + 'px';
    node.style.margin = '0';
    node.style.zIndex = '9999';
    node.style.pointerEvents = 'none';
    node.classList.add('dragging');
  }
  function reset(node) {
    node.classList.remove('dragging');
    node.style.transform = '';
    var h = node._home;
    if (h) {
      node.style.width = h.w; node.style.position = h.pos; node.style.left = h.left;
      node.style.top = h.top; node.style.margin = h.margin; node.style.zIndex = h.z; node.style.pointerEvents = h.pe;
      node._home = null;
    }
  }
  function clearHover() { $$('.drop-hover').forEach(function (el) { el.classList.remove('drop-hover'); }); }
  Lab.resetDragNode = reset;

  /* selectstart guard (belt-and-braces with body.dragging-active) */
  document.addEventListener('selectstart', function (e) {
    if (document.body.classList.contains('dragging-active')) e.preventDefault();
  });

  /* xp pill bump animation hook */
  var styleBump = document.createElement('style');
  styleBump.textContent = '.score-pill.bump{animation:xpbump .4s ease}@keyframes xpbump{0%{transform:none}30%{transform:scale(1.18)}100%{transform:none}}';
  document.head.appendChild(styleBump);

})(typeof window !== 'undefined' ? window : this);
