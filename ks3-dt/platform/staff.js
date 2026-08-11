/* OLS KS3 Digital Technology -- staff (teacher) admin panel.
   Renders entirely inside the static #staff-modal / #staff-body shell (see
   index.html). One delegated listener set is wired the first time Staff.open()
   runs; every re-render just replaces #staff-body's innerHTML, so the
   delegation (attached to the stable #staff-body node) keeps working.
   Server contract: App.call('admin', {passcode, sub, className, ...}) -- see
   server/Code.gs.template apiAdmin() for every sub-action's exact shape.
   ASCII-safe by design (assembler guards this file); emoji are HTML entities. */
(function (global) {
  'use strict';

  /* ---------------- module state (lives for the page's lifetime) ---------------- */
  var pass = '';                 // staff passcode, kept only in memory for this session
  var cls = '';                  // active class name (module-level "selection")
  var year = 'j1';                // active class's year, refreshed from every class-scoped call
  var curTab = 'classes';
  var showAllTeachers = false;
  var classesData = null;        // last {me, classes} from sub 'classes'
  var manifestCache = {};        // year -> manifest (local memo on top of App.fetchContent's own cache)
  var locksData = null;           // Lessons tab: {lessonNum: {on, u}}
  var dashData = null;            // Live/Absence/Teams/Options/Cover tabs: last sub 'dashboard' payload
  var dashSeq = 0;                // discards a superseded/out-of-order dashboard response
  var keyinfoCache = {};          // lessonId -> promise -> {itemId: {a, mis, explain}} | null
  var exitRightMap = {};          // lessonNum -> {exitItems, items} (for STUCK flags + CSV)
  var liveByNum = {};             // lessonNum -> manifest lesson entry, refreshed each Live render
  /* DAMIEN, 8 Aug 2026 (DFM 156): the Live tab shows ONE lesson at a time. This
     is the single selection every panel on the tab obeys - the pairing lens, the
     tournament row, the Press Night lens, the table and the misconception bars.
     Before this, four panels each carried their own lesson dropdown and the table
     showed every delivered lesson at once, which is what he read as "a bit of a
     mess, with stats across different lessons". */
  var liveLessonNum = '';         // Live tab: the one lesson the whole tab is showing
  var liveFeatureCache = {};      // lessonId -> promise -> what that lesson CONTAINS (see lessonFeaturesFor)
  var coverPick = '';             // Cover tab: lessonId chosen in the override dropdown
  var briefByNum = {};            // Lessons tab: lessonNum -> manifest entry (for the Brief view)
  var lockNotice = '';            // Lessons tab: message to show once the grid re-renders (B-05 undo)
  var coverActiveLesson = null;   // Cover tab: lesson we personally started cover for this session
  var wired = false;

  /* pairing lens state (section 12) */
  var pairLensLesson = '', pairLensTimer = null, pairAlerted = {}, pairResetArm = 0;
  /* tournament + Press Night state (sections 13/14). What each lesson CONTAINS
     is answered once, by lessonFeaturesFor, so no two panels can disagree. */
  var galleryLensLesson = '', galleryLensTimer = null;
  var audioCtx = null, chimeMuted = false;
  try { chimeMuted = localStorage.getItem('ks3dt-staff-mute') === '1'; } catch (e) {}

  var TABS = [
    { id: 'classes', label: 'Classes' },
    { id: 'lessons', label: 'Lessons' },
    { id: 'live', label: 'Live' },
    { id: 'absence', label: 'Absence' },
    { id: 'teams', label: 'Teams' },
    { id: 'options', label: 'Options' },
    { id: 'cover', label: 'Cover' },
    { id: 'guide', label: 'Guide' }
  ];

  /* ---------------- DOM helpers scoped to the panel ---------------- */
  function sb() { return document.getElementById('staff-body'); }
  function q(sel) { var b = sb(); return b ? b.querySelector(sel) : null; }

  function busyHtml(msg) { return '<div class="panel-loading"><span class="panel-spinner"></span><span>' + msg + '&hellip;</span></div>'; }
  function errorHtml(msg) { return '<p class="staff-status">' + App.esc(msg) + '</p>'; }
  function busyStatus(el, msg) { if (!el) return; el.className = 'panel-loading'; el.innerHTML = '<span class="panel-spinner"></span><span>' + App.esc(msg) + '&hellip;</span>'; }
  function plainStatus(el, msg) { if (!el) return; el.className = 'staff-status'; el.textContent = msg; }

  /* minutes-since-2026-01-01 UTC, matching Code.gs tmin_()/tminToDate_() exactly */
  var EPOCH_MS = 1767225600000;
  function fmtDate(u) {
    var d = new Date(EPOCH_MS + Number(u) * 60000);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function clientTmin() { return Math.floor((Date.now() - EPOCH_MS) / 60000); }

  /* ---------------- server call wrapper (passcode + a global expiry guard) ---------------- */
  function adminCall(sub, extra) {
    var payload = Object.assign({ passcode: pass, sub: sub }, extra || {});
    return App.call('admin', payload).then(function (r) {
      if (r && r.error === 'bad-passcode' && pass) {
        lockPanel('The staff passcode has changed -- enter it again.');
        renderGate(lockMsg);
        lockMsg = '';
      }
      return r;
    });
  }

  /* ================= one-time extra styling (genuinely missing from style.css) ================= */
  function injectExtraStyles() {
    if (document.getElementById('staff-extra-style')) return;
    var css =
      '.mis-bar .mb-fill.correct{background:var(--good)}' +
      '.dash-table tr.is-stuck{background:#FBE7EC}' +
      '.staff-chip{display:inline-flex;align-items:center;gap:6px;background:#F8FAFD;' +
        'border:2px solid #E3E8F2;border-radius:999px;padding:6px 12px;font-weight:700;' +
        'font-size:0.85rem;cursor:pointer;margin:0 6px 6px 0}' +
      '.staff-chip .sc-xp{color:var(--ols-blue-soft);font-weight:800}' +
      '.staff-chip-pool{display:flex;flex-wrap:wrap;gap:2px;padding:10px;background:#F8FAFD;' +
        'border-radius:10px;margin-bottom:12px}' +
      '.staff-team-cols{display:flex;gap:12px;flex-wrap:wrap;overflow-x:auto;padding-bottom:6px}' +
      '.staff-team-col{background:#fff;border:1px solid #E3E8F2;border-radius:10px;padding:10px;min-width:200px}' +
      '.staff-team-col h4{margin:0 0 8px;font-size:0.92rem;color:var(--ols-blue);' +
        'display:flex;justify-content:space-between;gap:8px}' +
      '.staff-chip-menu{position:fixed;z-index:650;background:#fff;border:1px solid #E3E8F2;' +
        'border-radius:10px;box-shadow:var(--shadow-md);padding:6px;min-width:170px}' +
      /* DFM 121b (1 Aug 2026): Damien could not read this menu in the video, and
         he was right - it was styled with var(--text), which is not defined
         anywhere in the stylesheet. The buttons therefore inherited the DARK
         shell's near-white text onto a white menu. --ink is the light-surface
         colour the rest of the panel uses. */
      '.staff-chip-menu button{display:block;width:100%;text-align:left;background:none;border:none;' +
        'padding:9px 11px;font:inherit;font-weight:600;color:var(--ink);cursor:pointer;border-radius:6px}' +
      '.staff-chip-menu button:hover{background:#F0F4FB;color:var(--ols-blue)}' +
      '.staff-chip-menu button.current{color:var(--ols-blue);font-weight:800;background:rgba(26,58,107,0.07)}' +
      '.staff-warn{background:var(--bad-soft);color:var(--bad);padding:12px 14px;border-radius:10px;margin-bottom:12px}' +
      '.lc-brief{align-self:flex-start;margin-top:2px;font-size:0.72rem;font-weight:800;' +
        'color:var(--ols-blue);background:rgba(26,58,107,0.08);border:1px solid rgba(26,58,107,0.25);' +
        'border-radius:999px;padding:2px 9px;cursor:pointer}' +
      '.lc-brief:hover{background:rgba(228,184,36,0.18);border-color:var(--gold)}' +
      '.lc-reset{color:var(--bad);background:rgba(201,79,109,0.08);border-color:rgba(201,79,109,0.3)}' +
      '.lc-reset:hover{background:rgba(201,79,109,0.16);border-color:var(--bad)}' +
      '.brief-sheet{background:#fff;border:1px solid var(--line-l);border-radius:10px;padding:18px;color:var(--ink)}' +
      '.brief-sheet h3{margin-top:0;color:var(--ols-blue)}' +
      '.brief-sheet h4{margin:14px 0 6px;color:var(--ols-blue)}' +
      '.brief-sheet ol,.brief-sheet ul{padding-left:20px;margin:0}' +
      '.brief-sheet li{margin-bottom:7px}' +
      '.brief-pitfalls li{background:#FFF6E8;border-left:3px solid var(--gold);' +
        'padding:7px 10px;border-radius:6px;list-style-position:inside}' +
      /* TEACHER BRIEF STANDARD sections */
      '.brief-sheet p{line-height:1.55;margin:0 0 10px}' +
      '.brief-note{color:var(--muted);font-size:0.86rem;margin-bottom:8px}' +
      '.brief-mins{display:inline-block;background:rgba(26,58,107,0.08);color:var(--ols-blue);' +
        'border-radius:999px;padding:1px 8px;font-size:0.72rem;font-weight:800;margin-left:6px}' +
      '.brief-glance li,.brief-run li{margin-bottom:11px;line-height:1.5}' +
      '.brief-prep li{background:#F4F8FF;border-left:3px solid var(--ols-blue-soft);' +
        'padding:8px 11px;border-radius:6px;margin-bottom:8px;list-style-position:inside;line-height:1.5}' +
      '.brief-res li{background:#F3FBF6;border-left:3px solid var(--good);padding:8px 11px;' +
        'border-radius:6px;margin-bottom:8px;list-style:none;line-height:1.5}' +
      '.brief-res a{color:var(--ols-blue);font-weight:800}' +
      '.brief-say{background:#fff;border:1px dashed #C9D4E8;border-radius:8px;' +
        'padding:8px 11px;margin-top:6px;font-style:italic;color:var(--ink)}' +
      '.brief-say-tag{display:block;font-style:normal;font-weight:800;font-size:0.7rem;' +
        'letter-spacing:.06em;text-transform:uppercase;color:var(--ols-blue-soft);margin-bottom:3px}' +
      /* screenshots inside the brief (Damien, 28 Jul: the teacher must SEE what
         the pupils will see, and when) */
      '.brief-shot{margin:8px 0 4px}' +
      '.brief-shot img{display:block;max-width:100%;border:1px solid var(--line-l);' +
        'border-radius:8px;box-shadow:0 2px 10px rgba(23,34,59,0.08)}' +
      '.brief-shot figcaption{color:var(--muted);font-size:0.8rem;margin-top:4px;line-height:1.4}' +
      '@media print{body *{visibility:hidden}' +
        '.cover-sheet,.cover-sheet *,.brief-sheet,.brief-sheet *{visibility:visible}' +
        '.cover-sheet,.brief-sheet{position:absolute;left:0;top:0;width:100%}}';
    var style = document.createElement('style');
    style.id = 'staff-extra-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ================= re-locking (audit C-08) =================
     `pass` used to live for the page's lifetime and the modal's x only HID the
     panel, so re-opening walked straight back in to answer keys, misconception
     labels, every pupil's name and email, every chat transcript and Delete
     Class. Closing now clears the passcode AND empties the rendered body (so
     none of that is left sitting in the DOM), and a panel left open on a
     pupil's machine locks itself. Every close path funnels through
     App.closeModal, which calls Staff.lock. */
  var IDLE_LOCK_MS = 900000;      // 15 minutes with no touch inside the panel
  var lastTouch = 0, idleTimer = null, lockMsg = '';

  function stopLenses() {
    if (pairLensTimer) { clearInterval(pairLensTimer); pairLensTimer = null; }
    if (galleryLensTimer) { clearInterval(galleryLensTimer); galleryLensTimer = null; }
  }

  function lockPanel(msg) {
    if (msg) lockMsg = msg;
    else if (pass) lockMsg = '';   // a plain close starts the next visit clean
    pass = '';
    stopLenses();
    if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
    /* drop every cached payload that carries pupil identity or answer keys */
    classesData = null; dashData = null; locksData = null;
    keyinfoCache = {}; exitRightMap = {}; briefByNum = {}; liveByNum = {};
    pairAlerted = {}; pairResetArm = 0; lockNotice = '';
    curTab = 'classes';
    var body = sb();
    if (body) body.innerHTML = '';
  }

  function touch() { lastTouch = Date.now(); }

  function startIdleWatch() {
    touch();
    if (idleTimer) clearInterval(idleTimer);
    idleTimer = setInterval(function () {
      if (!pass) { clearInterval(idleTimer); idleTimer = null; return; }
      var m = document.getElementById('staff-modal');
      if (!m || m.hidden) return;                       // closing already locked it
      if (Date.now() - lastTouch < IDLE_LOCK_MS) return;
      lockPanel('Locked after 15 minutes without use -- enter the passcode again.');
      App.closeModal('staff-modal');
      App.toast('Staff panel locked itself &mdash; nobody was using it.');
    }, 30000);
  }

  /* ================= passcode gate ================= */
  function renderGate(msg) {
    var body = sb();
    body.innerHTML =
      '<p class="staff-lead">Enter the staff passcode to open the teacher tools.</p>' +
      (App.state.preview ? '<p class="staff-status">Preview mode -- passcode is demo</p>' : '') +
      '<input id="sf-pass" class="text-input" type="password" autocomplete="off" placeholder="Passcode">' +
      '<button type="button" class="primary-btn" data-action="gate-go">Unlock</button>' +
      '<p class="staff-status" id="sf-msg"></p>';
    if (msg) plainStatus(q('#sf-msg'), msg);
    var input = q('#sf-pass');
    if (input) input.focus();
  }

  function gateGo(btn) {
    if (btn.disabled) return;
    var input = q('#sf-pass'), msg = q('#sf-msg');
    var val = (input.value || '').trim();
    if (!val) { input.focus(); return; }
    btn.disabled = true;
    busyStatus(msg, 'Checking');
    App.call('admin', { passcode: val, sub: 'check' }).then(function (r) {
      btn.disabled = false;
      if (r && r.ok) { pass = val; startIdleWatch(); renderPanel(); return; }
      plainStatus(msg, (r && r.error === 'bad-passcode') ? 'That passcode was not recognised.' : 'Could not check the passcode -- please try again.');
    });
  }

  /* ================= panel shell (tabs + active-class chip) ================= */
  function renderPanel() {
    injectExtraStyles();
    var tabsHtml = TABS.map(function (t) {
      return '<button type="button" class="staff-tab' + (t.id === curTab ? ' is-active' : '') + '" data-action="switch-tab" data-tab="' + t.id + '">' + t.label + '</button>';
    }).join('');
    var chip = (curTab !== 'classes' && cls)
      ? '<p class="staff-status">Class: <b>' + App.esc(cls) + '</b> <button type="button" class="ghost-btn" data-action="switch-tab" data-tab="classes">Change</button></p>'
      : '';
    sb().innerHTML = '<div class="staff-tabs">' + tabsHtml + '</div>' + chip + '<div id="staff-pane"></div>';
    renderActiveTab();
  }

  function renderActiveTab() {
    if (curTab === 'classes') { renderClasses(); return; }
    if (curTab === 'lessons') { renderLessons(); return; }
    if (curTab === 'live') { renderLive(); return; }
    if (curTab === 'absence') { renderAbsence(); return; }
    if (curTab === 'teams') { renderTeams(); return; }
    if (curTab === 'options') { renderOptions(); return; }
    if (curTab === 'cover') { renderCover(); return; }
    if (curTab === 'guide') { renderGuide(); return; }
  }

  function setPane(html) {
    var p = q('#staff-pane');
    if (!p) return null;
    p.innerHTML = '<div class="staff-tabpane is-active">' + html + '</div>';
    return p.firstChild;
  }

  function requireClass(fn) {
    if (!cls) { setPane('<p class="staff-status">Select a class on the Classes tab first.</p>'); return; }
    fn();
  }

  /* ================= manifest helper (shared by Lessons/Live/Absence/Cover) ================= */
  function loadManifestForActiveClass() {
    var y = year || 'j1';
    if (manifestCache[y]) return Promise.resolve(manifestCache[y]);
    return App.fetchContent(y + '/manifest.json').then(function (man) {
      manifestCache[y] = man;
      return man;
    }).catch(function () { return null; });
  }

  /* ================= keyinfo + exit-item helpers (shared by Live misconceptions + STUCK flags) ================= */
  function getKeyinfo(lessonId) {
    if (!keyinfoCache[lessonId]) {
      keyinfoCache[lessonId] = adminCall('keyinfo', { className: cls, lessonId: lessonId }).then(function (r) {
        return (r && r.ok) ? r.items : null;
      });
    }
    return keyinfoCache[lessonId];
  }
  function exitItemsOf(lesson) {
    if (!lesson) return [];
    if (lesson.exit && lesson.exit.items) return lesson.exit.items;
    var found = [];
    (lesson.chunks || []).forEach(function (ch) {
      if (ch.engine === 'exitcheck' && ch.config && ch.config.items) found = ch.config.items;
    });
    return found;
  }
  /* Every delivered lesson that has at least one submitted exit needs its
     content (for item order) + keyinfo (for the correct index) decrypted once,
     so STUCK flags and Copy CSV can tell "0 right" apart from "not answered". */
  function computeExitRightness(man, rows) {
    var byNum = {};
    (man.lessons || []).forEach(function (le) { byNum[String(le.num)] = le; });
    var neededNums = {};
    rows.forEach(function (r) {
      Object.keys(r.L || {}).forEach(function (numStr) {
        var a = r.L[numStr];
        if (a && a[3]) neededNums[numStr] = true;
      });
    });
    var jobs = Object.keys(neededNums).map(function (numStr) {
      var le = byNum[numStr];
      if (!le || !le.file) return Promise.resolve(null);
      return Promise.all([
        App.fetchContent(le.file).catch(function () { return null; }),
        getKeyinfo(le.id)
      ]).then(function (res) {
        var lesson = res[0], items = res[1];
        if (!lesson || !items) return null;
        return { num: numStr, exitItems: exitItemsOf(lesson), items: items };
      });
    });
    return Promise.all(jobs).then(function (results) {
      var map = {};
      results.forEach(function (r) { if (r) map[r.num] = r; });
      return map;
    });
  }
  function rightCountFor(chosenStr, exitData) {
    if (!exitData) return null;
    var exitItems = exitData.exitItems, items = exitData.items;
    var right = 0, total = 0;
    for (var i = 0; i < exitItems.length; i++) {
      var ch = chosenStr.charAt(i);
      if (ch === '') continue;
      total++;
      if (ch === 'x') continue;
      var key = items[exitItems[i].id];
      if (key && Number(ch) === Number(key.a)) right++;
    }
    return { right: right, total: total };
  }
  function baselineDisplay(rec) {
    var a1 = rec.L && rec.L['1'];
    if (!a1) return '';
    var m = /(?:^|;)bl=(\d+)\/(\d+)/.exec(String(a1[2] || ''));
    return m ? (m[1] + '/' + m[2]) : '';
  }
  /* Her sixteen September answers. They have been stored since day one - as
     bl=<right>/16|<sixteen digits> on her Lesson 1 record - and shown on no
     screen until DFM 157d. */
  function baselineChosen(rec) {
    var a1 = rec.L && rec.L['1'];
    if (!a1) return '';
    var m = /(?:^|;)bl=\d+\/\d+\|([^;]*)/.exec(String(a1[2] || ''));
    return m ? m[1] : '';
  }
  function baselineTitle(rec, l1) {
    var disp = baselineDisplay(rec);
    if (!disp) return '';
    var chosen = baselineChosen(rec);
    var items = (l1 && l1.feat && l1.feat.baseline) ? l1.feat.baseline.items : null;
    if (!chosen || !items || !l1.keys) return '';
    var wrong = [];
    for (var i = 0; i < items.length; i++) {
      var key = l1.keys[items[i].id];
      if (!key) continue;
      var ch = chosen.charAt(i);
      if (ch === '' || ch === 'x' || Number(ch) !== Number(key.a)) wrong.push('Q' + (i + 1));
    }
    if (!wrong.length) return 'All sixteen right.';
    return 'Right ' + disp.split('/')[0] + ' of ' + items.length + '. Wrong: ' + wrong.join(', ') +
      ' &mdash; numbered as in the Licence Exam panel below.';
  }

  /* ============================================================
     CLASSES tab
     ============================================================ */
  function renderClasses() {
    setPane(busyHtml('Loading classes'));
    adminCall('classes').then(function (r) {
      if (!r || !r.ok) { setPane(errorHtml('Could not load the classes list.')); return; }
      classesData = r;
      renderClassesFromCache();
    });
  }

  function renderClassesFromCache() {
    if (!classesData) { renderClasses(); return; }
    var me = classesData.me;
    /* the server sets this; it is the same flag the Guide tab's HoD section uses */
    var meIsHod = !!Number(classesData.isHod);
    if (!meIsHod) showAllTeachers = false;   // the toggle is his alone - never leave it stuck on
    var list = showAllTeachers ? classesData.classes : classesData.classes.filter(function (c) { return c.owner === me; });
    var rows = list.map(function (c) {
      var isMine = c.owner === me;
      var ownerLabel = isMine ? 'you' : (c.owner || 'unowned');
      return '<div class="staff-row">' +
        '<div><div class="staff-row-name">' + App.esc(c.name) +
          ' <span class="pill none">' + App.esc(String(c.year).toUpperCase()) + '</span></div>' +
          '<div class="staff-row-meta">' + c.pupils + (c.pupils === 1 ? ' pupil' : ' pupils') + ' &middot; ' + App.esc(ownerLabel) + '</div></div>' +
        '<div class="staff-actions">' +
          '<button type="button" class="ghost-btn" data-action="copy-link" data-class="' + App.esc(c.name) + '">Copy link</button>' +
          '<button type="button" class="ghost-btn" data-action="show-qr" data-class="' + App.esc(c.name) + '">QR</button>' +
          '<button type="button" class="ghost-btn" data-action="select-class" data-class="' + App.esc(c.name) + '" data-year="' + App.esc(c.year) + '">' + (cls === c.name ? 'Selected' : 'Select') + '</button>' +
          /* DAMIEN, 3 Aug 2026: as Head of Department he can already unlock,
             re-lock, reset and run cover on any class, and the server has allowed
             him to DELETE any class since 30 Jul (DFM 55) - but the button was
             only ever drawn on his own rows, so the power was unreachable. This
             was logged as a September observation (DFM 120 E3); he asked for it
             now. Someone else's class says whose it is, right on the button. */
          (isMine
            ? '<button type="button" class="ghost-btn danger" data-action="delete-class" data-class="' + App.esc(c.name) + '">Delete</button>'
            : (meIsHod
              ? '<button type="button" class="ghost-btn danger" data-action="delete-class" data-class="' + App.esc(c.name) + '" data-owner="' + App.esc(c.owner || '') + '">Delete (' + App.esc(ownerLabel) + '&rsquo;s)</button>'
              : '')) +
        '</div></div>';
    }).join('') || ('<p class="staff-status">No classes' + (showAllTeachers ? '' : ' of your own') + ' yet -- add one below.</p>');

    /* DAMIEN, 3 Aug 2026: "does an ordinary staff member still see the check box
       ... they shouldn't see that, just me". They did. It leaked nothing - since
       30 Jul the server only ever sends a teacher her OWN classes, so ticking it
       showed her exactly what she already had - but it advertised a power she
       does not have. Head of Department only now. */
    var html =
      (meIsHod
        ? '<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:var(--muted);margin-bottom:12px">' +
          '<input type="checkbox" id="cls-showall"' + (showAllTeachers ? ' checked' : '') + '> Show all teachers&rsquo; classes</label>'
        : '') +
      rows +
      '<div class="staff-add-row">' +
        '<input type="text" id="cls-name" class="text-input" placeholder="New class name" maxlength="40">' +
        '<select id="cls-year" class="staff-select"><option value="j1">J1</option><option value="j2">J2</option><option value="j3">J3</option></select>' +
        '<button type="button" class="primary-btn" data-action="add-class">Add class</button>' +
      '</div>' +
      '<p class="staff-status" id="cls-status"></p>' +
      storeHealthHtml();
    setPane(html);
  }


  function storeHealthHtml() {
    var st = classesData && classesData.store;
    if (!st || !st.limit) return '';
    var pct = Math.round((st.bytes / st.limit) * 100);
    var warn = pct >= 70;
    var html = '<p class="staff-row-meta" style="margin-top:10px' + (warn ? ';color:var(--bad);font-weight:700' : '') + '">' +
      'Platform storage: ' + Math.round(st.bytes / 1024) + ' KB of ' + Math.round(st.limit / 1024) + ' KB used (' + pct + '%) &middot; ' + st.pupils + ' pupil records' +
      (warn ? ' &mdash; getting full: run the archive sweep below.' : '') + '</p>';
    // nightly archive status + manual run (the sweep itself is owner-only)
    var am = classesData && classesData.archive;
    var amLine;
    if (!am) amLine = 'Nightly archive: not yet run.';
    else if (am.ok) amLine = 'Nightly archive: last run ' + fmtDate(am.t) + ' &middot; ' + num(am.rows) + ' lesson record(s) swept to the Archive Sheet.';
    else amLine = '<span style="color:var(--bad);font-weight:700">Nightly archive FAILED at ' + fmtDate(am.t) + ': ' + App.esc(am.error || 'unknown error') + '</span>';
    html += '<p class="staff-row-meta">' + amLine + ' <button type="button" class="ghost-btn" data-action="archive-now">Run archive sweep now</button></p>' +
      '<p class="staff-status" id="archive-status"></p>';
    return html;
  }
  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }

  function archiveNow(btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    busyStatus(q('#archive-status'), 'Sweeping completed lessons to the Archive Sheet');
    adminCall('archiveNow', {}).then(function (r) {
      btn.disabled = false;
      var st = q('#archive-status');
      if (!r || !r.ok) { plainStatus(st, 'Could not run the sweep -- please try again.'); return; }
      if (!r.okRun) { plainStatus(st, 'Sweep failed: ' + (r.error || 'unknown error') + ' (only the platform owner’s account can open the Archive Sheet).'); return; }
      plainStatus(st, 'Done -- ' + r.rows + ' lesson record(s) archived across ' + r.pupils + ' pupil(s).');
      renderClasses(); // refresh the storage % + last-run line
    });
  }

  function addClass() {
    var nameInput = q('#cls-name'), yearSelect = q('#cls-year'), btn = q('[data-action="add-class"]');
    if (!nameInput || btn.disabled) return;
    var name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    btn.disabled = true;
    var status = q('#cls-status');
    busyStatus(status, 'Adding the class');
    adminCall('addClass', { name: name, year: yearSelect ? yearSelect.value : 'j1' }).then(function (r) {
      btn.disabled = false;
      if (!r || !r.ok) {
        plainStatus(status, (r && r.error === 'exists') ? ('A class called ' + (r.name || name) + ' already exists.') : 'Could not add the class -- try a simpler name.');
        return;
      }
      nameInput.value = '';
      plainStatus(status, 'Added ' + r.name + '.');
      renderClasses();
    });
  }

  function deleteClass(btn) {
    var name = btn.getAttribute('data-class');
    var owner = btn.getAttribute('data-owner') || '';
    /* DAMIEN, 3 Aug 2026: a Head of Department can now delete a colleague's class,
       so that case gets a full named confirmation rather than the two-press arm.
       Deleting your own class keeps the quick arm - it always had it. */
    if (owner && !btn.classList.contains('confirmed')) {
      App.confirm('Delete ' + name + ', which belongs to ' + owner + '?',
        'You can do this because you are in the Head of Department register. Every pupil record for that ' +
        'class is deleted, along with its lesson locks, settings, teams, and all its Vault chats and ' +
        'galleries. It cannot be undone, and it is not your own class.',
        'Delete it', function (yes) {
          if (!yes) return;
          btn.classList.add('confirmed');
          deleteClass(btn);
        });
      return;
    }
    var label = btn.textContent;
    if (!owner && !btn.classList.contains('arm')) {
      btn.classList.add('arm'); btn.textContent = 'Sure?';
      setTimeout(function () { if (btn.classList.contains('arm')) { btn.classList.remove('arm'); btn.textContent = label; } }, 4000);
      return;
    }
    btn.disabled = true;
    var status = q('#cls-status');
    busyStatus(status, 'Deleting the class');
    adminCall('deleteClass', { className: name }).then(function (r) {
      btn.disabled = false;
      if (!r || !r.ok) {
        btn.classList.remove('arm'); btn.classList.remove('confirmed'); btn.textContent = label;
        plainStatus(status, (r && r.error === 'not-owner')
          ? 'Only the class\u2019s own teacher, or a Head of Department, can delete it.'
          : 'Could not delete the class.');
        return;
      }
      if (cls === name) cls = '';
      plainStatus(status, 'Deleted ' + name + '.');
      renderClasses();
    });
  }

  function showQr(name) {
    var link = App.classLink(name);
    var titleEl = App.$('#qr-title'), linkEl = App.$('#qr-link'), canvas = App.$('#qr-canvas'), copyBtn = App.$('#qr-copy');
    if (titleEl) titleEl.textContent = 'Link for ' + name;
    if (linkEl) linkEl.textContent = link;
    App.openModal('qr-modal');
    if (global.QRCode && global.QRCode.toCanvas && canvas) {
      global.QRCode.toCanvas(canvas, link, { width: 240, margin: 2, color: { dark: '#1A3A6B', light: '#ffffff' } }, function () {});
    }
    if (copyBtn) copyBtn.onclick = function () { App.copyText(link); };
  }

  /* ============================================================
     LESSONS tab (lock grid)
     ============================================================ */
  function renderLessons() {
    requireClass(function () {
      setPane(busyHtml('Loading the lock grid'));
      adminCall('locks', { className: cls }).then(function (r) {
        if (!r || !r.ok) { setPane(errorHtml('Could not load the lock grid for this class.')); return; }
        locksData = r.locks;
        year = r.year || year;
        loadManifestForActiveClass().then(function (man) {
          if (!man) { setPane(errorHtml('Could not load the lesson list.')); return; }
          renderLockGrid(man);
        });
      });
    });
  }

  function renderLockGrid(man) {
    briefByNum = {};
    var cells = (man.lessons || []).map(function (le) {
      briefByNum[String(le.num)] = le;
      var lk = locksData[String(le.num)];
      var on = !!(lk && Number(lk.on));
      var delivered = !!(lk && Number(lk.u));
      var stateText = on ? ('Unlocked since ' + fmtDate(lk.u)) : (delivered ? ('Locked (delivered ' + fmtDate(lk.u) + ')') : 'Locked');
      // The Brief chip is a data-action SPAN inside the toggle button: the click
      // dispatcher resolves closest([data-action]), so it wins without ever
      // toggling the lock (nested <button> would be invalid HTML).
      return '<button type="button" class="lock-cell' + (on ? ' is-on' : '') + '" data-action="toggle-lock" data-num="' + le.num + '" data-ready="' + (le.status === 'ready' ? '1' : '0') + '">' +
        '<span class="lc-num">' + (le.side ? 'Side Quest' : 'Lesson ' + le.num) + '</span>' +
        '<span class="lc-title">' + App.esc(le.title) + '</span>' +
        '<span class="lc-state">' + App.esc(stateText) + '</span>' +
        (le.status !== 'ready' ? '<span class="lc-date">(content coming)</span>'
          : '<span class="lc-brief" data-action="show-brief" data-num="' + le.num + '">&#128203; Brief</span>') +
        (delivered ? '<span class="lc-brief lc-reset" data-action="reset-lesson" data-num="' + le.num + '">&#8635; Start again</span>' : '') +
        /* AUDIT FIX B-05 (27 Jul 2026): the undo. A locked-but-delivered cell is
           exactly the state a mis-tap leaves behind, and until now nothing
           anywhere could reset a delivered date - so the class was recorded as
           having been taught a lesson that never ran, and five school days later
           every pupil was flagged absent from it. */
        ((!on && delivered) ? '<span class="lc-undo" data-action="undo-delivery" data-num="' + le.num + '">&#8634; Not taught</span>' : '') +
        '</button>';
    }).join('');
    /* DFM 108 (1 Aug 2026), two visibility fixes in one place.
       (a) The working banner and the confirmation used to render BELOW an
       18-cell grid, i.e. off the bottom of his screen - rule 43 again, the
       same family as the "Start again" message on 30 Jul. The status line now
       sits ABOVE the grid, where the pane opens.
       (b) The footer promised "tap Not taught" without saying the pill only
       exists once the lesson is locked again, so following the sentence on an
       unlocked lesson found nothing to tap. His wording. */
    setPane('<p class="staff-status" id="lock-status"></p>' +
      '<div class="lock-grid">' + cells + '</div>' +
      '<p class="staff-row-meta" style="margin-top:12px">Pupils who already opened a lesson are never kicked out. Locking again stops anyone <b>new</b> starting it, and a locked lesson is never used for absence flags. If you unlocked one by mistake, lock it again, then click <b>&#8634; Not taught</b> to clear its delivered date. <b>Brief</b> opens the lesson&rsquo;s teacher run sheet.</p>');
    if (lockNotice) { plainStatus(q('#lock-status'), lockNotice); App.toast(lockNotice, 5200); lockNotice = ''; }
  }

  /* ---- Lesson brief body (TEACHER BRIEF STANDARD, LESSON_QUALITY_GATE.md) ----
     Seven sections, in delivery order, written for a colleague who teaches
     another subject and has never seen this platform. A lesson that has not
     been rewritten to the standard yet still renders through the legacy
     branch at the bottom, so nothing goes blank mid-migration. */
  function briefHref(h) {
    h = String(h || '');
    if (!h) return '';
    if (h.indexOf('_PENDING') !== -1) return '';   // deploy placeholder: never render a live-looking dead link
    if (/^https?:\/\//i.test(h)) return h;
    if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return '';   // never javascript:, data:, anything else
    return App.asset(h);                              // repo-relative asset (github.io on Apps Script)
  }
  /* A section entry may carry img (repo-relative or https) + imgCap: the
     screenshot renders inline so the teacher sees the pupils' screen at the
     exact point in the brief where it matters. */
  function briefShot(entry) {
    var src = briefHref(entry && entry.img);
    if (!src) return '';
    var cap = String((entry && entry.imgCap) || '');
    return '<figure class="brief-shot"><img src="' + App.esc(src) + '" loading="lazy" alt="' +
      App.esc(cap || 'Screenshot') + '">' +
      (cap ? '<figcaption>' + App.esc(cap) + '</figcaption>' : '') + '</figure>';
  }
  /* Brief text may carry **bold** for the handful of lines Damien wants
     emphasised (e.g. "Every pupil must finish this last screen"). Escaped
     FIRST, so the markers can never smuggle markup in. */
  function briefText(s) {
    return App.esc(String(s || '')).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  function briefBody(r) {
    var out = '';
    var isNew = (r.purpose || []).length || (r.runningTheHour || []).length;
    if (!isNew) {
      var mmL = (r.minuteByMinute || []).map(function (line) { return '<li>' + App.esc(line) + '</li>'; }).join('');
      var pfL = (r.pitfalls || []).map(function (line) { return '<li>' + App.esc(line) + '</li>'; }).join('');
      return (r.why ? '<h4>Why the lesson is built this way</h4><p>' + App.esc(r.why) + '</p>' : '') +
        (mmL ? '<h4>Running the hour</h4><ol>' + mmL + '</ol>' : '') +
        (pfL ? '<h4>Pitfalls</h4><ul class="brief-pitfalls">' + pfL + '</ul>' : '');
    }
    if ((r.purpose || []).length) {
      out += '<h4>The purpose of this lesson</h4>' +
        r.purpose.map(function (p) { return '<p>' + App.esc(p) + '</p>'; }).join('');
    }
    if ((r.atAGlance || []).length) {
      out += '<h4>What the pupils will actually do</h4>' +
        '<p class="brief-note">Every part of the hour, in the order they meet it. The rest of this brief uses these names, so it is worth a read-through first.</p>' +
        '<ol class="brief-glance">' + r.atAGlance.map(function (g) {
          return '<li><b>' + App.esc(g.part) + '</b>' +
            (Number(g.mins) ? ' <span class="brief-mins">' + Number(g.mins) + ' min</span>' : '') +
            '<br>' + briefText(g.what) + briefShot(g) + '</li>';
        }).join('') + '</ol>';
    }
    if ((r.prepare || []).length) {
      out += '<h4>Preparing for this lesson</h4><ul class="brief-prep">' +
        r.prepare.map(function (p) {
          return '<li><b>' + App.esc(p.title) + '</b><br>' + briefText(p.text) + briefShot(p) + '</li>';
        }).join('') + '</ul>';
    }
    if ((r.resources || []).length) {
      out += '<h4>Resources for this lesson</h4><ul class="brief-res">' +
        r.resources.map(function (res) {
          var href = briefHref(res.href);
          return '<li><b>' + App.esc(res.label) + '</b>' +
            (href ? ' &mdash; <a href="' + App.esc(href) + '" target="_blank" rel="noopener">open it</a>' : '') +
            '<br>' + App.esc(res.what) +
            (res.where ? '<br><i>Where to find it: ' + App.esc(res.where) + '</i>' : '') + briefShot(res) + '</li>';
        }).join('') + '</ul>';
    }
    if ((r.runningTheHour || []).length) {
      out += '<h4>Running the hour</h4><ol class="brief-run">' +
        r.runningTheHour.map(function (h) {
          return '<li><b>' + App.esc(h.part) + '</b>' +
            (Number(h.mins) ? ' <span class="brief-mins">' + Number(h.mins) + ' min</span>' : '') +
            '<br>' + briefText(h.text) + briefShot(h) +
            (h.say ? '<div class="brief-say"><span class="brief-say-tag">You could say</span>' + App.esc(h.say) + '</div>' : '') +
            '</li>';
        }).join('') + '</ol>';
    }
    if ((r.goesWrong || []).length) {
      out += '<h4>What commonly goes wrong, and what to do</h4><ul class="brief-pitfalls">' +
        r.goesWrong.map(function (w) {
          return '<li><b>' + App.esc(w.q) + '</b><br>' + briefText(w.a) + briefShot(w) + '</li>';
        }).join('') + '</ul>';
    }
    if (r.ifBehind) out += '<h4>If you fall behind</h4><p>' + App.esc(r.ifBehind) + '</p>';
    return out;
  }

  /* ---- Lesson brief view (teacher run sheet, decrypted server-side) ---- */
  /* "Start again" (30 Jul 2026). Puts a lesson back to the beginning for the
     whole class: clears their work for it, hands back the XP it earned, wipes
     the lesson's pairing so the Vault can pair afresh, and stamps the lesson so
     each pupil's own machine drops her saved place. Built because an accidental
     click could skip a chunk with no way back, and because a teacher may simply
     want to re-teach an hour. */
  function resetLesson(btn) {
    var num = btn.getAttribute('data-num');
    App.confirm('Start Lesson ' + num + ' again for the whole class?',
      'Everything the class did in this lesson is cleared, and the XP it earned is taken back with it. ' +
      'Each pupil starts from the beginning the next time they open it. Other lessons are untouched. ' +
      'There is no undo for this one.',
      'Start it again', function (ok) {
        if (!ok) return;
        var st = q('#lock-status');
        busyStatus(st, 'Putting Lesson ' + num + ' back to the start');
        adminCall('resetLesson', { className: cls, lessonNum: num }).then(function (r) {
          if (!r || !r.ok) { plainStatus(st, 'Could not reset that lesson -- please try again.'); return; }
          lockNotice = 'Lesson ' + num + ' is back at the start (' + Number(r.cleared) + ' pupil record(s) cleared). ' +
            'Anyone with it open should refresh.';
          renderLessons();
        });
      });
  }

  var briefOpenNum = '';
  function showBrief(el) {
    var num = el.getAttribute('data-num');
    var le = briefByNum[num];
    if (!le) return;
    briefOpenNum = num;   // so Print this brief can name the file it makes
    setPane(busyHtml('Fetching the lesson brief'));
    adminCall('brief', { className: cls, lessonId: le.id }).then(function (r) {
      if (!r || !r.ok) {
        var msg = (r && r.error === 'no-brief') ? 'No teacher brief is authored for this lesson yet.'
          : (r && r.error === 'preview-no-keys') ? 'Briefs are not available on this hosted preview -- use the local preview or the live app.'
          : 'Could not fetch the brief -- please try again.';
        setPane('<p class="staff-status">' + App.esc(msg) + '</p>' +
          '<button type="button" class="ghost-btn" data-action="brief-back">&larr; Back to the lessons</button>');
        return;
      }
      setPane(
        '<div class="brief-sheet">' +
          '<h3>Lesson ' + App.esc(r.num) + ' &middot; ' + App.esc(r.title) + ' &mdash; teacher brief</h3>' +
          briefBody(r) +
        '</div>' +
        '<div class="confirm-actions" style="justify-content:flex-start;margin-top:12px">' +
          '<button type="button" class="ghost-btn" data-action="brief-back">&larr; Back to the lessons</button>' +
          '<button type="button" class="primary-btn" data-action="brief-print">Print this brief</button>' +
        '</div>' +
        '<p class="staff-status" id="brief-status"></p>');
    });
  }

  /* The teacher brief had the SAME defect as the cover sheet - found by the
     harness, not in the room: printing the app's own document inside the
     sandboxed iframe blanks the panel behind the print box. Same cure. */
  function briefPrint() {
    var body = q('.brief-body') || q('#staff-pane .staff-tabpane') || q('#staff-pane');
    var le = briefByNum[briefOpenNum] || {};
    var name = le.side ? String(le.title || 'Side Quest') : ('Lesson ' + (le.num || '') + ' ' + String(le.title || ''));
    printStandalone(body, (cls ? cls + ' - ' : '') + 'DT teacher brief - ' + name.trim(), q('#brief-status'));
  }

  function toggleLock(btn) {
    if (btn.disabled) return;
    var num = btn.getAttribute('data-num');
    var wasOn = btn.classList.contains('is-on'), willOn = !wasOn;
    if (willOn && btn.getAttribute('data-ready') === '0') {
      App.confirm('Unlock an unfinished lesson?',
        'This lesson\'s content is still being authored. Pupils who open it will only see "being prepared", and it will not count for absence flags. Usually you want to wait until it says Ready.',
        'Unlock anyway', function (yes) { if (yes) doToggle(btn, num, wasOn, true); });
      return;
    }
    /* AUDIT FIX B-05: locking again is now a real change, so it asks first. The
       lock cells sit right beside the Brief chip and a mis-tap used to be silent
       AND irreversible. */
    if (!willOn) {
      var lk = locksData[num] || {};
      App.confirm('Lock ' + (briefByNum[num] && briefByNum[num].side ? 'the Side Quest' : 'Lesson ' + num) + ' again?',
        'Pupils who have already opened it keep their place and can finish. Nobody new will be able to start it, and it will stop being used for absence flags.' +
        (Number(lk.u) ? ' The delivered date is kept - if this lesson never actually ran, use "Not taught" on the cell afterwards to clear it.' : ''),
        'Lock it', function (yes) { if (yes) doToggle(btn, num, wasOn, false); });
      return;
    }
    doToggle(btn, num, wasOn, willOn);
  }

  /* AUDIT FIX B-05: clear a delivered date set by a mis-tap. Pupil work is never
     touched - this only withdraws the class-level claim that the lesson was
     taught, which is what absence inference reads. */
  function undoDelivery(el) {
    var num = el.getAttribute('data-num');
    var le = briefByNum[num];
    var label = (le && le.side) ? 'the Side Quest' : 'Lesson ' + num;
    App.confirm('Mark ' + label + ' as never taught?',
      'Use this if you unlocked it by accident. It clears the delivered date, so nobody will be flagged absent from a lesson the class never had. Any work a pupil already saved is kept, and you can unlock it again for real whenever you like.',
      'Clear it', function (yes) {
        if (!yes) return;
        adminCall('setLock', { className: cls, lessonNum: num, on: 0, clear: 1 }).then(function (r) {
          var status = q('#lock-status');
          if (!r || !r.ok) { plainStatus(status, 'Could not clear that date -- please try again.'); return; }
          locksData[num] = { u: r.u, on: r.on };
          // re-rendering the pane wipes #lock-status, so the confirmation rides
          // on the shell's own toast instead of a line that is about to vanish
          lockNotice = label + ' is back to never delivered - nobody will be flagged absent from it.';
          renderLessons();
        });
      });
  }

  function doToggle(btn, num, wasOn, willOn) {
    btn.disabled = true;
    btn.classList.toggle('is-on', willOn);
    var stateEl = btn.querySelector('.lc-state');
    var prevText = stateEl.textContent;
    stateEl.textContent = willOn ? 'Unlocking...' : 'Locking...';
    adminCall('setLock', { className: cls, lessonNum: num, on: willOn ? 1 : 0 }).then(function (r) {
      btn.disabled = false;
      var status = q('#lock-status');
      if (!r || !r.ok) {
        btn.classList.toggle('is-on', wasOn);
        stateEl.textContent = prevText;
        plainStatus(status, 'Could not update that lock -- please try again.');
        return;
      }
      locksData[num] = { u: r.u, on: r.on };
      stateEl.textContent = r.on ? ('Unlocked since ' + fmtDate(r.u)) : (r.u ? ('Locked (delivered ' + fmtDate(r.u) + ')') : 'Locked');
      if (status) status.textContent = '';
      /* THE REAL CAUSE OF DFM 114 (found 1 Aug 2026, evening, reproduced in the
         preview while filming the Guide video). This updated the state TEXT in
         place and nothing else - but "Start again" and "Not taught" are gated on
         `delivered`, and they only exist if the cell is BUILT. So locking a
         lesson you had just unlocked left the cell reading "Locked (delivered
         ...)" with no pill beside it, exactly what Damien reported, and the pill
         appeared later only because switching tabs or reloading forced a full
         render. (My first explanation to him - a shell predating the v6 paste -
         was wrong; a hard reload fixes it for the same reason a tab switch does.)
         Re-render the grid from the cached manifest so the chips always match
         the state the cell is claiming. */
      loadManifestForActiveClass().then(function (man) { if (man) renderLockGrid(man); });
    });
  }

  /* ============================================================
     LIVE tab (dashboard + misconception patterns)
     ============================================================ */
  /* ---------- which lessons are delivered, and which one the tab is showing ----------
     The side quest's manifest num is the STRING 'S1' (every taught lesson's is a
     number), so anything that sorts or compares lesson numbers has to say so out
     loud - Number('S1') is NaN and would sort unpredictably. */
  function isSideQuestNum(num) { return isNaN(Number(num)); }
  /* mid-sentence ("stuck on the side quest") vs standing alone as a label */
  function lessonNameFor(num) { return isSideQuestNum(num) ? 'the side quest' : 'Lesson ' + String(num); }
  function lessonLabelFor(num) { return isSideQuestNum(num) ? 'Side quest' : 'Lesson ' + String(num); }
  function lessonHeadingFor(le) {
    return lessonLabelFor(le.num) + ' &mdash; ' + App.esc(String(le.title || ''));
  }

  function deliveredNumsOf(dash) {
    var nums = Object.keys((dash && dash.locks) || {}).filter(function (n) { return Number(dash.locks[n].u); });
    return nums.sort(function (a, b) {
      var sa = isSideQuestNum(a), sb = isSideQuestNum(b);
      if (sa !== sb) return sa ? 1 : -1;         // the side quest always sorts last
      if (sa && sb) return a < b ? -1 : 1;
      return Number(a) - Number(b);
    });
  }

  /* DFM 156(a): "defaults to the most recently unlocked lesson". Read carefully:
     `u` is the FIRST-unlock stamp and never moves again, so re-unlocking Lesson 1
     for a catch-up cannot steal the default away from the lesson being taught.
     A lesson that is currently unlocked beats one that was delivered and locked
     again, and the self-paced side quest never wins - it is never "the lesson in
     front of you", though it is always pickable. */
  function defaultLiveLesson(delivered) {
    var pool = delivered.filter(function (n) { return !isSideQuestNum(n); });
    if (!pool.length) return delivered[0] || '';
    function newest(list) {
      return list.slice().sort(function (a, b) {
        return Number(dashData.locks[b].u) - Number(dashData.locks[a].u);
      })[0];
    }
    var on = pool.filter(function (n) { return Number(dashData.locks[n].on); });
    return on.length ? newest(on) : newest(pool);
  }

  /* What a lesson CONTAINS - one fetch, one answer, so the panels can never
     disagree about a lesson between themselves (four separate detectors was
     part of what made this tab unreadable). Never rejects: a lesson with no
     content file yet still renders its progress column. */
  function lessonFeaturesFor(le) {
    var blank = { exitItems: [], parsons: null, selfeval: null, paired: false, tournament: null, gallery: null, baseline: null, stretch: null, casework: null, studio: null };
    if (!le || !le.file) return Promise.resolve(blank);
    var id = String(le.id);
    if (!liveFeatureCache[id]) {
      liveFeatureCache[id] = App.fetchContent(le.file).then(function (lesson) {
        var f = { exitItems: exitItemsOf(lesson), parsons: null, selfeval: null, paired: false, tournament: null, gallery: null, baseline: null, stretch: null, casework: null, studio: null };
        (lesson.chunks || []).forEach(function (ch) {
          var cfg = ch.config || {};
          if (cfg.paired) f.paired = true;
          /* DFM 183: a ladder's stretch challenge is CLAIMED on screen, so the
             teacher needs to be able to see who claimed it */
          if (ch.engine === 'ladder' && cfg.stretch) {
            f.stretch = { title: String(cfg.stretch.title || 'the stretch challenge') };
          }
          if (ch.engine === 'parsons') f.parsons = { title: String(cfg.title || ch.title || 'Build puzzle') };
          /* DFM 191b: the lesson's MAIN activity earns its own column. Detected
             from content, never from a lesson number, so lessons 6+ inherit it
             the day they are written (DFM 156b). */
          if (ch.engine === 'casework') {
            f.casework = { title: String(cfg.title || ch.title || 'The Case Board'), stretch: !!cfg.stretchCase };
          }
          if (ch.engine === 'studio' && cfg.phase === 'build') {
            f.studio = { title: String(cfg.introTitle || ch.title || 'The Studio Sprint') };
          }
          if (ch.engine === 'tournament') f.tournament = { title: String(cfg.title || ch.title || 'Tournament') };
          if (ch.engine === 'gallery') f.gallery = { title: String(ch.title || 'Press Night') };
          /* the September Licence Exam - stored for every pupil since day one,
             and shown on no screen until now (DFM 157d) */
          if (ch.engine === 'diagnostic' && cfg.items) f.baseline = { items: cfg.items };
          if (ch.engine === 'selfeval') {
            f.selfeval = {
              statements: (cfg.statements || []).map(String),
              difficulty: !!cfg.difficulty,
              comment: !!cfg.comment
            };
          }
        });
        return f;
      }).catch(function () { return blank; });
    }
    return liveFeatureCache[id];
  }

  function renderLive() {
    requireClass(function () {
      setPane(busyHtml('Loading the live dashboard'));
      var token = ++dashSeq;
      adminCall('dashboard', { className: cls }).then(function (r) {
        if (token !== dashSeq) return;
        if (!r || !r.ok) { setPane(errorHtml('Could not load the dashboard for this class.')); return; }
        dashData = r; year = r.year || year;
        loadManifestForActiveClass().then(function (man) {
          if (token !== dashSeq) return;
          if (!man) { setPane(errorHtml('Could not load the lesson list.')); return; }
          liveByNum = {};
          (man.lessons || []).forEach(function (le) { liveByNum[String(le.num)] = le; });
          computeExitRightness(man, r.rows || []).then(function (rightMap) {
            if (token !== dashSeq) return;
            exitRightMap = rightMap;
            var delivered = deliveredNumsOf(dashData);
            if (!delivered.length) { setPane(liveEmptyHtml()); return; }
            /* Refresh keeps the lesson he is looking at; a lesson that has since
               been un-delivered falls back to the default. */
            if (delivered.indexOf(liveLessonNum) === -1) liveLessonNum = defaultLiveLesson(delivered);
            renderLiveTable();
          });
        });
      });
    });
  }

  function liveEmptyHtml() {
    return '<div class="pair-lens-box"><p class="pl-note" style="margin:0">Nothing to show yet &mdash; no lesson has been ' +
      'unlocked for this class. The moment you unlock one on the Lessons tab, this tab follows it.</p></div>';
  }

  /* Which lessons flag this pupil as stuck. DFM 156(c): the filter may never
     hide a struggling pupil, so this stays CROSS-LESSON (every delivered lesson
     is examined, not just the one on screen) and returns the lesson numbers that
     triggered, so the flag and the strip above the table can name them. The
     thresholds themselves are unchanged from the original isStuck. */
  /* DFM 157b: it now returns WHICH reasons fired, not just that one did.
     Damien had to reverse-engineer why a pupil was flagged ("I wonder ... if my
     reading ... is actually accurate" - it was), so the flag names its own
     cause on hover. Whether a pupil is flagged is unchanged; every reason is
     collected rather than stopping at the first, because two causes want two
     different kinds of help. */
  function stuckLessonsFor(r, deliveredNums) {
    var hits = [];
    for (var i = 0; i < deliveredNums.length; i++) {
      var num = deliveredNums[i];
      var a = (r.L || {})[num];
      if (!a) continue;
      var reasons = [];
      /* DFM 162(b), HIS RULING: "I'll go with under half right." The exit trigger
         was all-wrong; it is now the same under-half rule the warm-up below uses,
         so staff learn ONE rule: under half = trouble. Answering nothing ('x')
         already counts in the total and not in the right, which is what makes a
         skipped question count against her. */
      if (a[3]) {
        var ex = exitRightMap[num];
        var rc = ex ? rightCountFor(String(a[3]), ex) : null;
        if (rc && rc.total > 0 && (rc.right / rc.total) < 0.5) {
          reasons.push(rc.total === 1
            ? 'She got the exit question wrong.'
            : 'Under half her exit answers were right (' + rc.right + ' of ' + rc.total + ').');
        }
      }
      var total = Number(a[10]), right = Number(a[9]);
      if (total >= 2 && (right / total) < 0.5) {
        reasons.push('Under half her warm-up answers were right (' + right + ' of ' + total + ').');
      }
      if (Number(a[0]) === 1 && (clientTmin() - Number(a[5])) > 20) {
        reasons.push('She started this lesson and nothing new has been saved for over 20 minutes.');
      }
      if (reasons.length) hits.push({ num: num, reasons: reasons });
    }
    return hits;
  }

  /* DFM 159, his ruling: "teachers really aught to be listening to pupils who
     feel like they are struggling". THE FRAME: the red flag is what the MARKS
     say; this amber one is what SHE says. It fires on one thing only - she
     pressed "Not yet" against an I-can statement, naming a specific thing she
     cannot do yet. "Getting there" never fires it (that is the normal middle of
     learning), "Tricky" alone never fires it (effortful success - the dot shows
     it), and her free-text comment never fires it, because we do not
     machine-judge a child's own words. */
  function voiceFlagFor(a, feat) {
    var se = String((a && a[4]) || '');
    if (!se) return null;
    var parts = se.split('|'), conf = parts[0] || '', diff = parts[1] || '';
    var idx = [];
    for (var i = 0; i < conf.length; i++) if (conf.charAt(i) === '0') idx.push(i);
    if (!idx.length) return null;
    var statements = (feat && feat.selfeval && feat.selfeval.statements) || [];
    return {
      said: idx.map(function (n) { return statements[n] || ('statement ' + (n + 1)); }),
      tricky: diff === '2',
      hasComment: !!String((a && a[8]) || '')
    };
  }
  /* DFM 160 - the flag lifecycle. The acknowledgement lives on the lesson's own
     detail ledger as hf (red) / hv (voice), in minutes, so it survives in the
     yearly archive without new storage.
     THE RE-ARM LAW, in the one sentence staff are taught: red only returns if
     she works on the lesson again and gets stuck again. The MARKS reasons are
     one-shot facts - they cannot become news twice - so once dealt with they
     stay dealt with. Only the no-activity reason can re-arm, and only on
     evidence NEWER than the acknowledgement itself. */
  function ackAt(a, key) {
    var m = new RegExp('(?:^|;)' + key + '=(\\d+)(?:;|$)').exec(String((a && a[2]) || ''));
    return m ? Number(m[1]) : 0;
  }
  function liveReasonsFor(a, reasons, hf) {
    if (!hf) return reasons;
    return reasons.filter(function (rs) {
      return /nothing new has been saved/.test(rs) && Number((a || [])[5]) > hf;
    });
  }
  function voiceTitle(v) {
    var quoted = v.said.map(function (s) { return '"' + s + '"'; }).join(' and ');
    var t = 'She pressed \'Not yet\' on: ' + quoted;
    if (!/[.!?]"$/.test(t)) t += '.';   /* the statements already end in a full stop; this only guards one that does not */
    if (v.tricky) t += ' She also said the hour felt tricky.';
    if (v.hasComment) t += ' Her comment is in the last column.';
    return t;
  }

  /* One marked exit answer. Four states, and the fourth matters: "answered
     nothing" is not the same as "wrong", and neither is the same as "has not
     got there yet" (rule 35 - the screen must not claim what is not true). */
  function exitGlyph(chosenStr, idx, itemId, keyItems) {
    var ch = String(chosenStr || '').charAt(idx);
    if (ch === '') return '<span class="lc-dash" title="Not there yet">&ndash;</span>';
    if (ch === 'x') return '<span class="lc-skip" title="Answered nothing">&#9675;</span>';
    var key = keyItems ? keyItems[itemId] : null;
    if (!key) return '<span class="lc-dash" title="Not there yet">&ndash;</span>';
    return Number(ch) === Number(key.a)
      ? '<span class="lc-yes" title="Right">&#10003;</span>'
      : '<span class="lc-no" title="Wrong">&#10007;</span>';
  }

  function selfEvalGlyphs(a) {
    var parts = String((a && a[4]) || '').split('|'), conf = parts[0] || '';
    var glyphs = conf.split('').map(function (c) {
      return c === '2' ? '<span class="lc-yes">&#10003;</span>'
        : c === '1' ? '<span class="lc-mid">&#8776;</span>'
        : c === '0' ? '<span class="lc-no">&#10007;</span>' : '';
    }).join(' ');
    return glyphs.trim() ? glyphs : '&mdash;';
  }
  function feltGlyph(a) {
    var parts = String((a && a[4]) || '').split('|'), d = parts[1] || '';
    return d === '0' ? '<span title="Easy">&#128994;</span>'
      : d === '1' ? '<span title="Just right">&#128993;</span>'
      : d === '2' ? '<span title="Tricky">&#128308;</span>' : '&mdash;';
  }
  /* The closing build-the-code puzzle rides in the lesson's detail ledger as
     ep=1 / ep=0 (engines.js, Engines.parsons). One submission, first wins. */
  function puzzleGlyph(a) {
    var m = /(?:^|;)ep=([01])(?:;|$)/.exec(String((a && a[2]) || ''));
    if (!m) return '<span class="lc-dash" title="Not sent in">&ndash;</span>';
    return m[1] === '1'
      ? '<span class="lc-yes" title="Right">&#10003;</span>'
      : '<span class="lc-no" title="Not right">&#10007;</span>';
  }

  /* THE STRETCH CLAIM (DFM 183). Damien, 10 Aug 2026: "Does either button affect
     XP points (I think it does?) I'm just wondering if there is a way to verify
     that the pair actually did complete it or can they just pretend and claim
     the points... Maybe it's just a simple case of having the teacher verify it
     or something?"
     It is worth exactly 5 XP, and it is a CLAIM - which is the same trust the
     rest of the ladder runs on. Rather than gate it (a desk queue would stop the
     hour dead, and a cover class has nobody to queue for), the claim is made
     visible: the ladder already writes "ladder=2/3+s" into her detail ledger, so
     the star simply reads what is already there, and the hover says how to check
     it in ten seconds. Trust on screen, teacher verifies humanly. */
  function stretchStar(a, feat) {
    if (!feat || !feat.stretch) return '';
    if (!/(?:^|;)ladder=[^;]*\+s(?:;|$)/.test(String((a && a[2]) || ''))) return '';
    return ' <span class="lc-stretch" title="Claimed the stretch challenge &mdash; ' +
      App.esc(feat.stretch.title) + ' (+5 XP). Ten-second check at the desk: ask for a shake. A real ' +
      'build takes turns showing the score, an H, and the best score.">&#11088;</span>';
  }

  /* ---------- THE MAIN-ACTIVITY COLUMN (DFM 191b) ----------------------------
     Lesson 4 spends FORTY minutes of its hour inside one chunk and Lesson 5
     twenty-five, and both already write a full account of that work into the
     pupil's detail ledger - `cw=` for the Case Board, `qa=` for the Studio
     Sprint. Until now this tab rendered neither, so a teacher watching the heart
     of either lesson saw a warm-up column, an exit column, and nothing at all
     about the thing the class was actually doing. DFM 156(c) exactly: the data
     was there, no screen showed it.
     Both denominators are read from the pupil's OWN string rather than assumed,
     so a lesson with three cases or five QA checks needs no code change here. */
  function detailOf(a) { return String((a && a[2]) || ''); }
  function dFlag(s, k) { return new RegExp('(?:^|;)' + k + '=1(?:;|$)').test(s); }
  function dNum(s, k) {
    var m = new RegExp('(?:^|;)' + k + '=([0-9]+)(?:;|$)').exec(s);
    return m ? Number(m[1]) : 0;
  }
  function dFrac(s, k) {
    var m = new RegExp('(?:^|;)' + k + '=([0-9]+)/([0-9]+)(?:;|$)').exec(s);
    return m ? { n: Number(m[1]), d: Number(m[2]) } : null;
  }
  function actCount(fr) {
    var cls = (fr.d > 0 && fr.n >= fr.d) ? 'all' : (fr.n > 0 ? 'some' : 'none');
    return '<b class="lc-act ' + cls + '">' + fr.n + '/' + fr.d + '</b>';
  }
  var NOT_STARTED = '<span class="lc-dash" title="Not started">&ndash;</span>';

  /* Lesson 4: cw=closed/total;g=gold;rc=0|1;ship=0|1[;s=1] */
  function caseworkCell(a) {
    var s = detailOf(a);
    var fr = dFrac(s, 'cw');
    if (!fr) return NOT_STARTED;
    var gold = dNum(s, 'g');
    var silver = Math.max(0, fr.n - gold);
    var say = [fr.n + ' of ' + fr.d + ' cases closed.'];
    if (fr.n) {
      say.push(silver
        ? gold + ' gold, ' + silver + ' silver — a silver stamp means HQ’s clue was taken, which is still a closed case.'
        : 'All gold — every one solved unaided.');
    }
    say.push(dFlag(s, 'rc')
      ? 'The whole-game check was run at the release desk.'
      : 'The whole-game check has not been run yet.');
    if (dFlag(s, 'ship')) say.push('The fixed game was saved into her Drive.');
    if (dFlag(s, 's')) say.push('The stretch job was taken and closed.');
    return '<span class="lc-actwrap" title="' + App.esc(say.join(' ')) + '">' + actCount(fr) +
      (dFlag(s, 'ship') ? ' <span class="lc-ship" aria-label="shipped to Drive">&#128674;</span>' : '') +
      (dFlag(s, 's') ? ' <span class="lc-stretch">&#11088;</span>' : '') +
      '</span>';
  }

  /* Lesson 5: qa=passed/total;ship=1[;b=1][;fq=N][;s=1] */
  function studioCell(a) {
    var s = detailOf(a);
    var fr = dFrac(s, 'qa');
    if (!fr) return NOT_STARTED;
    var fq = dNum(s, 'fq');
    var beta = dFlag(s, 'b');
    var say = [fr.n + ' of ' + fr.d + ' QA tests passed.'];
    if (fq) {
      say.push(fq + (fq === 1 ? ' test failed first and was fixed' : ' tests failed first and were fixed') +
        ' — FOUND BY QA is the desk doing its job, not a black mark.');
    }
    if (dFlag(s, 'ship')) {
      say.push(beta
        ? 'Doors opened IN BETA — she exhibited before all four tests were green.'
        : 'Doors opened — all four QA tests were green first.');
    } else {
      say.push('The doors never opened, so nothing went to the gallery.');
    }
    if (dFlag(s, 's')) say.push('The second variable was added and tested.');
    return '<span class="lc-actwrap" title="' + App.esc(say.join(' ')) + '">' + actCount(fr) +
      (beta ? ' <span class="lc-beta">IN BETA</span>' : '') +
      (dFlag(s, 's') ? ' <span class="lc-stretch">&#11088;</span>' : '') +
      '</span>';
  }

  function activityCell(a, feat) {
    if (feat.casework) return caseworkCell(a);
    if (feat.studio) return studioCell(a);
    return '';
  }

  /* The class strip and the picker, which stay put while the lesson underneath
     them is loading. ONE source for both the loading screen and the finished
     one - two copies of this markup would drift apart (rule 144's family). */
  function liveHeaderHtml(delivered, num) {
    var rows = dashData.rows || [];
    var joined = rows.length;
    var avgXp = joined ? Math.round(rows.reduce(function (s, r) { return s + Number(r.xp || 0); }, 0) / joined) : 0;
    return '<div class="staff-actions" style="margin-bottom:12px">' +
        '<span class="pill none">' + joined + ' joined</span>' +
        '<span class="pill none">' + avgXp + ' avg XP</span>' +
        '<button type="button" class="ghost-btn" data-action="live-refresh" title="Re-reads this tab &mdash; new joiners, marks that have just landed, the lesson counts. Nothing here updates by itself except the Pairing panel.">Refresh</button>' +
        '<button type="button" class="ghost-btn" data-action="live-csv" title="Copies every pupil and every delivered lesson &mdash; the whole marksheet, not just the lesson on screen.">Copy CSV</button>' +
      '</div>' +
      '<div class="live-pick"><label for="live-lesson-sel">Showing:</label>' +
      '<select id="live-lesson-sel" class="staff-select">' + delivered.map(function (n) {
        var l = liveByNum[n];
        return '<option value="' + App.esc(n) + '"' + (String(n) === String(num) ? ' selected' : '') + '>' +
          App.esc(lessonLabelFor(n)) + ' &mdash; ' + App.esc(l ? String(l.title || '') : '') + '</option>';
      }).join('') + '</select></div>' +
      '<p class="pl-note">Everything below is about the lesson picked here. When you open this tab it starts on ' +
      'the newest lesson you have unlocked.</p>';
  }

  /* DAMIEN, 8 Aug 2026, verifying the redesign live: "it would have been good to
     see an indication that something was happening because it took few seconds
     before it changed (this delay only happened the first time I switched)".
     He is right, and the cause is exactly why it was only the first time: a
     lesson's content and its answer key are fetched once and then cached, so the
     first visit to a lesson pays a real round trip and every later one is
     instant. Rule 42 - no silent waits - so the picker now stays on screen with
     the lesson NAMED as it loads, and only the part that is actually changing
     goes blank. */
  function renderLiveTable() {
    var le = liveByNum[liveLessonNum];
    /* Lesson 1's content and keys come too, whatever lesson is showing: the
       Baseline column is on every view and its hover names the questions she
       got wrong, which needs the Licence Exam's own answer key. Both are cached
       after the first fetch. */
    var l1 = liveByNum['1'];
    Promise.all([
      lessonFeaturesFor(le),
      (le && le.id) ? getKeyinfo(le.id) : Promise.resolve(null),
      lessonFeaturesFor(l1),
      (l1 && l1.id) ? getKeyinfo(l1.id) : Promise.resolve(null)
    ]).then(function (res) {
      if (String(liveLessonNum) !== String(le ? le.num : '')) return;  // he changed it while we fetched
      paintLive(le, res[0], res[1], { feat: res[2], keys: res[3] });
    });
  }

  function paintLiveLoading(num) {
    if (!dashData) return;
    setPane(liveHeaderHtml(deliveredNumsOf(dashData), num) +
      busyHtml('Loading ' + lessonNameFor(num)));
  }

  function paintLive(le, feat, keyItems, l1) {
    var rows = dashData.rows || [];
    var joined = rows.length;
    var avgXp = joined ? Math.round(rows.reduce(function (s, r) { return s + Number(r.xp || 0); }, 0) / joined) : 0;
    var delivered = deliveredNumsOf(dashData);
    var num = String(liveLessonNum);

    /* which columns this lesson earns */
    var exitItems = (feat.exitItems || []);
    var showExit = exitItems.length > 0 && !!keyItems;
    var exitUnavailable = exitItems.length > 0 && !keyItems;
    var showPuzzle = !!feat.parsons;
    var act = feat.casework || feat.studio;   /* DFM 191b: the main-activity column */
    var se = feat.selfeval;

    /* the lesson's own progress counts */
    var fin = 0, started = 0;
    rows.forEach(function (r) {
      var st = Number(((r.L || {})[num] || [])[0] || 0);
      if (st === 2) fin++; else if (st === 1) started++;
    });
    var notStarted = joined - fin - started;
    var anyRecord = rows.some(function (r) { return !!(r.L || {})[num]; });

    /* DFM 156(c): stuck pupils are found across every delivered lesson, so
       choosing a lesson can never hide one. */
    var elsewhere = [], voiceCount = 0, redCount = 0, greyCount = 0;
    var body = rows.map(function (r) {
      var hits = stuckLessonsFor(r, delivered);
      var hereHit = null;
      hits.forEach(function (h) { if (h.num === num) hereHit = h; });
      var a = (r.L || {})[num];
      var st = Number((a || [])[0] || 0);
      var pillClass = st === 2 ? 'done' : st === 1 ? 'started' : 'none';
      var pillText = st === 2 ? 'done' : st === 1 ? 'started' : 'not started';
      var warm = (a && Number(a[10]) > 0) ? (Number(a[9]) + '/' + Number(a[10])) : '&mdash;';
      var cells = '';
      if (act) cells += '<td class="lc-mark">' + activityCell(a, feat) + '</td>';
      if (showExit) cells += exitItems.map(function (it, i) { return '<td class="lc-mark">' + exitGlyph(a && a[3], i, it.id, keyItems) + '</td>'; }).join('');
      if (showPuzzle) cells += '<td class="lc-mark">' + puzzleGlyph(a) + '</td>';
      if (se) cells += '<td class="lc-mark">' + selfEvalGlyphs(a) + '</td>';
      if (se && se.difficulty) cells += '<td class="lc-mark">' + feltGlyph(a) + '</td>';
      if (se && se.comment) {
        var comment = String((a && a[8]) || '');
        cells += '<td>' + (comment ? '<span class="lc-comment" title="' + App.esc(comment) + '">' + App.esc(comment) + '</span>' : '&mdash;') + '</td>';
      }
      /* the flag names its own cause (DFM 157b).
         DFM 162(a): ONE PILL, ONE LESSON. This pill is about the lesson on
         screen and nothing else. The old code showed the first flagged lesson it
         found - so a pupil flagged in Lessons 1 and 2 only ever showed Lesson 1,
         and marking that one helped left her looking dealt with while Lesson 2
         was still live. A control must act on exactly one unambiguous thing, and
         cross-lesson signal now lives in ONE complete place: the strip above the
         table. */
      var flag = '', liveRed = false;
      if (hereHit) {
        var hf = ackAt(a, 'hf');
        var live = liveReasonsFor(a, hereHit.reasons, hf);
        var btn = ' <button type="button" class="pill %CLS%" title="%T%" data-action="flag-toggle"' +
          ' data-email="' + App.esc(r.email) + '" data-lesson="' + App.esc(num) + '"' +
          ' data-kind="red" data-on="%ON%">%TXT%</button>';
        if (live.length) {
          liveRed = true; redCount++;
          flag = btn.replace('%CLS%', 'flag')
            .replace('%T%', App.esc(live.join(' ') + ' Click twice to mark her helped.'))
            .replace('%ON%', '1').replace('%TXT%', 'needs you');
        } else if (hf) {
          greyCount++;
          flag = btn.replace('%CLS%', 'none flag-done')
            .replace('%T%', App.esc('Marked helped on ' + fmtDate(hf) + '. The marks that raised the flag are still in her row. Click twice to bring the flag back.'))
            .replace('%ON%', '0').replace('%TXT%', 'helped');
        }
      }
      var v = voiceFlagFor(a, feat);
      var voice = '';
      if (v) {
        var hv = ackAt(a, 'hv');
        var vbtn = ' <button type="button" class="pill %CLS%" title="%T%" data-action="flag-toggle"' +
          ' data-email="' + App.esc(r.email) + '" data-lesson="' + App.esc(num) + '"' +
          ' data-kind="voice" data-on="%ON%">%TXT%</button>';
        if (hv) {
          greyCount++;
          voice = vbtn.replace('%CLS%', 'none flag-done')
            .replace('%T%', App.esc('Marked heard on ' + fmtDate(hv) + '. Her ratings and comment are still in her row. Click twice to bring the flag back.'))
            .replace('%ON%', '0').replace('%TXT%', 'heard');
        } else {
          voiceCount++;
          voice = vbtn.replace('%CLS%', 'voice')
            .replace('%T%', App.esc(voiceTitle(v) + ' Click twice to mark her heard.'))
            .replace('%ON%', '1').replace('%TXT%', 'says not yet');
        }
      }
      /* the strip is now the COMPLETE cross-lesson picture, computed
         independently of whatever this row is showing: EVERY other lesson where
         she is genuinely live, each one checked against its OWN acknowledgement.
         A pupil already dealt with in a lesson simply drops out of that lesson -
         and one acknowledged lesson can no longer hide another live one. */
      var elseLessons = [];
      hits.forEach(function (h) {
        if (String(h.num) === num) return;
        var hArr = (r.L || {})[h.num];
        var hLive = liveReasonsFor(hArr, h.reasons, ackAt(hArr, 'hf'));
        if (hLive.length) elseLessons.push({ num: h.num, reasons: hLive });
      });
      if (elseLessons.length) elsewhere.push({ name: r.name, lessons: elseLessons });
      var blTitle = baselineTitle(r, l1);
      return '<tr' + (liveRed ? ' class="is-stuck"' : '') + '>' +
        '<td><button type="button" class="modal-close" style="font-size:1rem" title="Remove this pupil from the class (her own work is untouched)" data-action="remove-pupil" data-email="' + App.esc(r.email) + '" data-name="' + App.esc(r.name) + '">&times;</button> ' +
        App.esc(r.name) + flag + voice + stretchStar(a, feat) + '</td>' +
        '<td>' + App.esc(r.codename) + '</td>' +
        '<td>' + Number(r.xp || 0) + '</td>' +
        '<td' + (blTitle ? ' title="' + blTitle + '"' : '') + '>' + (baselineDisplay(r) || '&mdash;') + '</td>' +
        '<td><span class="pill ' + pillClass + '">' + pillText + '</span></td>' +
        '<td>' + warm + '</td>' +
        cells + '</tr>';
    }).join('');

    var head = '<tr><th>Name</th><th>Codename</th>' +
      '<th title="Points earned across the whole year, not just this lesson.">XP</th>' +
      '<th>Baseline</th><th>Progress</th><th>Warm-up</th>' +
      (act ? '<th>' + App.esc(act.title) + '</th>' : '') +
      (showExit ? exitItems.map(function (it, i) { return '<th title="' + App.esc(String(it.stem || '')) + '">Q' + (i + 1) + '</th>'; }).join('') : '') +
      (showPuzzle ? '<th>Build puzzle</th>' : '') +
      (se ? '<th>How did it go?</th>' : '') +
      (se && se.difficulty ? '<th>How it felt</th>' : '') +
      (se && se.comment ? '<th>Private comment</th>' : '') +
      '</tr>';

    /* red only, and deliberately (DFM 159): this strip is the mid-lesson
       emergency channel. Evaluations land at the END of a lesson and are read
       in that lesson's own view, where the amber pill and the count chip make
       them unmissable. Amber here would make the emergency channel noisy, and
       a noisy channel is an ignored one. */
    /* DFM 162(a): every lesson is named, and every one of them is a button that
       takes the teacher there - so a flag is always dealt with in the lesson it
       belongs to, with that pupil's marks and the misconception bars on screen
       beside it. */
    var elseStrip = elsewhere.length
      ? '<p class="live-elsewhere">Needs you, from other lessons: ' + elsewhere.map(function (e) {
          return App.esc(e.name) + ' (' + e.lessons.map(function (L) {
            return '<button type="button" class="strip-jump" data-action="strip-jump"' +
              ' data-lesson="' + App.esc(L.num) + '"' +
              ' title="' + App.esc(L.reasons.join(' ') + ' Click to show this lesson.') + '">' +
              App.esc(lessonLabelFor(L.num)) + '</button>';
          }).join(' &middot; ') + ')';
        }).join(', ') + '</p>'
      : '';

    var html =
      liveHeaderHtml(delivered, num) +
      '<div id="pair-lens"></div>' +
      '<div id="tourney-slot"></div>' +
      '<div id="gallery-lens"></div>' +
      '<h3 style="margin-top:18px">' + (le ? lessonHeadingFor(le) : 'Lesson ' + App.esc(num)) + '</h3>' +
      '<div class="staff-actions" style="margin-bottom:10px">' +
        '<span class="pill none">' + fin + ' of ' + joined + ' finished</span>' +
        '<span class="pill none">' + started + ' started</span>' +
        '<span class="pill none">' + notStarted + ' not started</span>' +
        (voiceCount ? '<span class="pill voice">' + voiceCount + (voiceCount === 1 ? ' says' : ' say') + ' not yet</span>' : '') +
      '</div>' +
      elseStrip +
      (joined && !anyRecord ? '<p class="pl-note">No pupil has started this lesson yet.</p>' : '') +
      (exitUnavailable ? '<p class="pl-note">The exit-check answers could not be loaded just now. Press Refresh to try again.</p>' : '') +
      '<div class="dash-scroll"><table class="dash-table">' + head +
        (body || '<tr><td colspan="99">No pupils have joined this class yet.</td></tr>') + '</table></div>' +
      '<p class="pl-note">Your own runs of a lesson never appear in this table &mdash; it lists pupils only.</p>' +
      /* the red key is earned by a red flag ANYWHERE on screen - including one
         that is only in the strip, which is a red flag the teacher can act on */
      liveLegendHtml(feat, showExit, showPuzzle, redCount > 0 || elsewhere.length > 0, voiceCount > 0, greyCount > 0) +
      '<h3 style="margin-top:20px">Misconception patterns &mdash; ' +
        (isSideQuestNum(num) ? 'the side quest' : 'Lesson ' + App.esc(num)) + '</h3>' +
      '<div id="live-mis-body"></div>' +
      (String(num) === '1' ? baselinePanelHtml(rows, l1) : '') +
      '<p class="staff-status" id="live-status"></p>';
    setPane(html);
    if (le) loadMisconceptions(le);
    initPairLens(le, feat);
    initTourneySlot(le, feat);
    initGalleryLens(le, feat);
  }

  /* DFM 156(c) / rule 149's family: a symbol a teacher has to decode is an
     undefined term. Every glyph on the table is named here, and the real
     question stems and the pupil's real self-rating statements are quoted from
     the lesson's own content - never a copy that can drift. */
  function liveLegendHtml(feat, showExit, showPuzzle, showRed, showVoice, showGrey) {
    var out = [];
    if (showRed) {
      out.push('<p>A red <b>needs you</b> flag means one of three things: ' +
        'under half her exit answers were right, under half her warm-up answers were right, or she ' +
        'started the lesson and nothing new has been saved for over twenty minutes. Hover over the flag ' +
        'to see which it is. When you have dealt with it, click the flag and click again: it becomes a ' +
        'quiet grey <b>helped</b>. Red only returns if she works on the lesson again and gets stuck again.</p>');
    }
    if (showVoice) {
      out.push('<p>An amber <b>says not yet</b> flag is the pupil&rsquo;s own voice: at the end of the lesson ' +
        'she pressed &lsquo;Not yet&rsquo; against an I-can statement. Hover over it to see which statement ' +
        'she meant. When you have listened and responded, click the flag and click again: it becomes a ' +
        'quiet grey <b>heard</b>.</p>');
    }
    if (showGrey) {
      out.push('<p>A grey flag is one you have already dealt with &mdash; hover over it for the date, and ' +
        'click it twice if you need to bring it back.</p>');
    }
    if (showExit) {
      out.push('<p><b>The exit check</b> is the set of short marked questions at the end of the lesson. ' +
        'In the Q columns: <span class="lc-yes">&#10003;</span> right &middot; <span class="lc-no">&#10007;</span> wrong &middot; ' +
        '<span class="lc-skip">&#9675;</span> answered nothing &middot; <span class="lc-dash">&ndash;</span> not there yet. ' +
        'What each question asked:</p>' +
        '<ul class="live-legend-list">' + feat.exitItems.map(function (it, i) {
          return '<li><b>Q' + (i + 1) + '</b> &mdash; ' + App.esc(String(it.stem || '')) + '</li>';
        }).join('') + '</ul>');
    }
    /* DFM 191b: the main-activity column, explained in plain words. A number with
       no key beside it is exactly the unreadable-glyph fault DFM 156(c) was
       written about, so the legend ships in the same commit as the column. */
    if (feat.casework) {
      out.push('<p>The <b>' + App.esc(feat.casework.title) + '</b> column is the hour&rsquo;s main work: how many ' +
        'of the player tickets she closed. A case only closes when she has written her case log AND re-played ' +
        'the game to watch the bug not happen. <b class="lc-act all">4/4</b> means every case closed; ' +
        '<b class="lc-act some">2/4</b> means some still open; <b class="lc-act none">0/4</b> means none yet; ' +
        '<span class="lc-dash">&ndash;</span> means she has not started the board. Hover a number to read what ' +
        'happened, including whether the stamps were gold (solved unaided) or silver (HQ&rsquo;s clue was taken ' +
        '&mdash; still a closed case). <span class="lc-ship">&#128674;</span> means the fixed game reached her ' +
        'Drive' + (feat.casework.stretch ? '; <span class="lc-stretch">&#11088;</span> means she took the stretch job too' : '') + '.</p>');
    }
    if (feat.studio) {
      out.push('<p>The <b>' + App.esc(feat.studio.title) + '</b> column is her own game: how many of its QA tests ' +
        'passed. She cannot open her doors to the gallery until all four are green, so ' +
        '<b class="lc-act all">4/4</b> is a game that reacts, counts and ends. Hover a number to read what ' +
        'happened. A test that failed first and was then fixed is a good sign, not a bad one &mdash; that is QA ' +
        'working, and the hover says so. <span class="lc-beta">IN BETA</span> means she ran out of time and ' +
        'exhibited an unfinished game on purpose, which is a real studio thing to do and is not a fault; ' +
        '<span class="lc-stretch">&#11088;</span> means she added and tested a second variable.</p>');
    }
    if (feat.stretch) {
      out.push('<p>A gold star <span class="lc-stretch">&#11088;</span> beside a name means she claimed the ' +
        'stretch challenge (' + App.esc(feat.stretch.title) + '), which is worth <b>5 XP</b>. It is a claim, ' +
        'the same as the rungs are &mdash; if you want to check one, it takes ten seconds at the desk: ask ' +
        'for a shake. A real build takes turns showing the score, an H, and the best score.</p>');
    }
    if (showPuzzle) {
      out.push('<p>The <b>Build puzzle</b> column is the closing rebuild-the-code puzzle (' +
        App.esc(feat.parsons.title) + '): <span class="lc-yes">&#10003;</span> her build was right &middot; ' +
        '<span class="lc-no">&#10007;</span> not right &middot; <span class="lc-dash">&ndash;</span> not sent in.</p>');
    }
    if (feat.selfeval) {
      out.push('<p><b>How did it go?</b> is the pupil&rsquo;s own rating of herself, not a mark: ' +
        '<span class="lc-yes">&#10003;</span> I can &middot; <span class="lc-mid">&#8776;</span> Getting there &middot; ' +
        '<span class="lc-no">&#10007;</span> Not yet &mdash; one mark for each statement below' +
        (feat.selfeval.difficulty ? ' &mdash; then how the hour felt: &#128994; Easy &middot; &#128993; Just right &middot; &#128308; Tricky' : '') +
        '.</p>' +
        '<ul class="live-legend-list">' + feat.selfeval.statements.map(function (s, i) {
          return '<li><b>Statement ' + (i + 1) + '</b> &mdash; ' + App.esc(s) + '</li>';
        }).join('') + '</ul>');
      if (feat.selfeval.comment) {
        out.push('<p>The <b>Private comment</b> column is what she typed in the box that promises her words go to ' +
          'you and nobody else. Hover over a clipped comment to read all of it.</p>');
      }
    }
    return out.length ? '<div class="live-legend">' + out.join('') + '</div>' : '';
  }

  /* ============================================================
     Tournament (section 13): the Reaction Rally projector view.
     A delivered lesson with a 'tournament' chunk grows a launch row on the
     Live tab; the button opens a full-screen overlay (appended to body, above
     the staff modal) with a live submitted counter, sealed-team chips, and
     the animated bar reveal - last place first, winner last, gold shimmer.
     The REVEAL button flips the class's existing team-reveal flag (one source
     of truth), so pupil consoles flip to team colours at the same moment.
     ============================================================ */
  /* DFM 156(b), his words: "Lesson 2 doesn't need to see the tournament panel".
     The row now belongs to the lesson on screen and nothing else. */
  function initTourneySlot(le, feat) {
    var slot = q('#tourney-slot');
    if (!slot || !le || !feat || !feat.tournament) return;
    slot.innerHTML = '<div class="pair-lens-box" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<h3 style="margin:0">&#127942; ' + App.esc(feat.tournament.title) + ' &mdash; ' + App.esc(lessonLabelFor(le.num)) + '</h3>' +
      '<span class="pl-note" style="margin:0">hidden teams &middot; projector reveal</span>' +
      '<button type="button" class="primary-btn" style="margin-left:auto" data-action="tourney-open" data-lesson="' + App.esc(String(le.id)) + '">Tournament view</button>' +
      '</div>';
  }


  /* ---------- Press Night lens (L5 gallery): the duty-of-care view ----------
     Detection mirrors tourneyInfoFor (content chunk scan). The lens shows the
     live marquee + every signed review with REAL names, and a one-tap Remove:
     a removed review vanishes from the maker's screen on their next ~4s poll.
     Removed reviews stay listed struck-through (audit trail, rm flag). */
  function initGalleryLens(le, feat) {
    var slot = q('#gallery-lens');
    if (!slot || !le || !feat || !feat.gallery) {
      if (galleryLensTimer) { clearInterval(galleryLensTimer); galleryLensTimer = null; }
      return;
    }
    galleryLensLesson = String(le.id);
    slot.innerHTML = '<div class="pair-lens-box">' +
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
      '<h3 style="margin:0">&#127914; ' + App.esc(feat.gallery.title) + ' &mdash; ' + App.esc(lessonLabelFor(le.num)) + '</h3>' +
      '<span class="pl-note gal-lens-stat" style="margin:0 0 0 auto"></span></div>' +
      '<div id="gallery-lens-body">' + busyHtml('Raising the marquee') + '</div></div>';
    galleryLensTick();
    if (galleryLensTimer) clearInterval(galleryLensTimer);
    galleryLensTimer = setInterval(galleryLensTick, 5000);
  }

  function galleryLensTick() {
    if (!document.getElementById('gallery-lens-body')) {
      if (galleryLensTimer) { clearInterval(galleryLensTimer); galleryLensTimer = null; }
      return;
    }
    adminCall('gallery', { className: cls, lessonId: galleryLensLesson }).then(function (r) {
      var body = document.getElementById('gallery-lens-body');
      if (!body || !r || !r.ok) return;
      var stat = q('.gal-lens-stat');
      var live = (r.reviews || []).filter(function (x) { return !x.rm; });
      if (stat) stat.textContent = (r.studios || []).length + ' studios open - ' + live.length + ' reviews live';
      var studios = (r.studios || []).map(function (s) {
        return '<span class="gal-lens-chip' + (s.h ? ' hidden-listing' : '') + '"><b>' + App.esc(s.sn || s.cn) + '</b> (' + App.esc(s.name) + ') &middot; &ldquo;' + App.esc(s.gt) + '&rdquo; &middot; ' + Number(s.rn) +
          (s.h ? ' &middot; <em>hidden</em>' : ' <button type="button" class="gal-lens-hide" data-action="gallery-hide-studio" data-sid="' + App.esc(String(s.sid)) + '" title="Hide this listing from the class marquee">Hide</button>') +
          '</span>';
      }).join('');
      var reviews = (r.reviews || []).slice().reverse().map(function (x) {
        return '<div class="gal-lens-review' + (x.rm ? ' removed' : '') + '">' +
          '<b>' + App.esc(x.byName) + '</b> <span class="pl-note" style="margin:0">(signed ' + App.esc(x.bcn) + (x.sim ? ' &middot; simulated' : '') + ')</span> &rarr; <b>' + App.esc(x.toName) + '</b>' +
          '<p style="margin:2px 0 0">I like ' + App.esc(x.l) + '<br>I wonder ' + App.esc(x.w) + '</p>' +
          (x.rm ? '<span class="gal-lens-rm-note">removed</span>'
            : '<button type="button" class="ghost-btn gal-lens-rm" data-action="gallery-remove" data-i="' + Number(x.i) + '">Remove</button>') +
          '</div>';
      }).join('');
      body.innerHTML = (studios ? '<div class="gal-lens-chips">' + studios + '</div>' : '') +
        (reviews || '<p class="pl-note">No reviews filed yet.</p>');
      injectGalleryStyles();
    }).catch(function () {});
  }

  function galleryHideStudio(btn) {
    btn.disabled = true;
    adminCall('galleryHideStudio', { className: cls, lessonId: galleryLensLesson, sid: btn.getAttribute('data-sid') })
      .then(function () { galleryLensTick(); });
  }

  function galleryRemove(btn) {
    btn.disabled = true;
    adminCall('galleryRemove', { className: cls, lessonId: galleryLensLesson, i: Number(btn.getAttribute('data-i')) })
      .then(function () { galleryLensTick(); });
  }

  function injectGalleryStyles() {
    if (document.getElementById('gallery-lens-style')) return;
    var st = document.createElement('style');
    st.id = 'gallery-lens-style';
    st.textContent =
      '.gal-lens-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}' +
      '.gal-lens-chip{background:#F0F3FA;border:1px solid #E3E8F2;border-radius:999px;padding:3px 10px;font-size:0.78rem}' +
      '.gal-lens-chip.hidden-listing{opacity:0.55;text-decoration:line-through}' +
      '.gal-lens-hide{margin-left:6px;font-size:0.72rem;padding:1px 8px;border:1px solid #C9CFDD;border-radius:999px;background:#fff;cursor:pointer}' +
      '.gal-lens-review{border-top:1px solid #E3E8F2;padding:8px 0;font-size:0.86rem;position:relative}' +
      '.gal-lens-review.removed p{text-decoration:line-through;color:#9AA5BC}' +
      '.gal-lens-rm{position:absolute;right:0;top:8px;padding:2px 10px;font-size:0.76rem}' +
      '.gal-lens-rm-note{position:absolute;right:0;top:10px;font-size:0.74rem;color:#B4262A;font-weight:700}';
    document.head.appendChild(st);
  }

  function tourneyOpen(lessonId) {
    var ov = document.createElement('div');
    ov.className = 'tourney-overlay';
    ov.innerHTML =
      '<button type="button" class="tourney-close" title="Close">&times;</button>' +
      '<span class="tourney-kicker">OLS Digital Technology</span>' +
      '<h1 class="tourney-title">The Reaction Rally</h1>' +
      '<p class="tourney-sub">Hidden-team tournament &mdash; scored on scoreboards the pupils built themselves</p>' +
      '<div class="tourney-lobby">' + busyHtml('Contacting HQ') + '</div>' +
      '<div class="tourney-board" hidden></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('show'); });

    var lobby = ov.querySelector('.tourney-lobby');
    var board = ov.querySelector('.tourney-board');
    var pollTimer = null, revealing = false, lastData = null;

    function close() {
      if (pollTimer) clearInterval(pollTimer);
      ov.classList.remove('show');
      setTimeout(function () { ov.remove(); }, 300);
    }
    ov.querySelector('.tourney-close').onclick = close;

    function paintLobby(r) {
      if (revealing) return;
      lastData = r;
      var teams = r.teams || [];
      var chips = teams.map(function (t) {
        return '<span class="tourney-chip">' + App.esc(t.name) + ' &middot; ' + Number(t.submitted) + ' in</span>';
      }).join('');
      var noTeams = !teams.length;
      var canReveal = !noTeams && Number(r.submitted) > 0;
      lobby.innerHTML =
        '<div class="tourney-count">' + Number(r.submitted) + '</div>' +
        '<p class="tourney-count-label">of ' + Number(r.roster) + ' pupils\' scores received</p>' +
        (noTeams
          ? '<p class="tourney-note" style="margin-bottom:3vh">No hidden teams exist yet &mdash; assign them before the countdown.</p>'
          : '<div class="tourney-chips">' + chips + '</div>') +
        (Number(r.unassigned) > 0 ? '<p class="tourney-note" style="margin:0 0 2vh">' + Number(r.unassigned) + ' scored pupil(s) have no team &mdash; their points only count once assigned (Teams tab).</p>' : '') +
        '<div class="tourney-actions">' +
        (noTeams
          ? '<button type="button" class="tourney-reveal-btn" data-t="assign">Auto-assign 4 hidden teams</button>'
          : '<button type="button" class="tourney-reveal-btn" data-t="reveal"' + (canReveal ? '' : ' disabled') + '>' + (r.revealed ? 'Replay the reveal' : 'REVEAL THE TEAMS') + '</button>') +
        (App.state.preview ? '<button type="button" class="tourney-ghost-btn" data-t="seed">Seed demo scores (preview)</button>' : '') +
        '</div>' +
        '<p class="tourney-note">Keep this for the very end &mdash; the suspense is the point. Revealing also shows every pupil her own team on her screen.</p>' +
        /* DFM 185(e), his words at the sit: "I need to know how the teacher
           assigns the students into teams... so I don't know who is in what
           team?" The panel hides names ON PURPOSE - it is the screen you put on
           the projector - but nothing on it said so, or said where the names DO
           live. A screen that keeps a secret has to say where the secret is kept. */
        '<p class="tourney-note">Who is in each team: the <b>Teams</b> tab (this screen never shows names, so it is safe to project). A team&rsquo;s score is its pupils&rsquo; totals added together.</p>';
      var btn = lobby.querySelector('[data-t="reveal"]');
      if (btn) btn.onclick = function () { startReveal(r.revealed); };
      var ab = lobby.querySelector('[data-t="assign"]');
      if (ab) ab.onclick = function () {
        ab.disabled = true;
        adminCall('autoGroup', { className: cls, n: 4 }).then(function () { tick(); });
      };
      var sb2 = lobby.querySelector('[data-t="seed"]');
      if (sb2) sb2.onclick = function () {
        sb2.disabled = true;
        adminCall('tournament', { className: cls, lessonId: lessonId, seed: 1 }).then(function () { tick(); });
      };
    }

    function tick() {
      if (!document.body.contains(ov)) { if (pollTimer) clearInterval(pollTimer); return; }
      if (revealing) return;
      adminCall('tournament', { className: cls, lessonId: lessonId }).then(function (r) {
        if (!r || !r.ok || revealing || !document.body.contains(ov)) return;
        paintLobby(r);
      });
    }
    tick();
    pollTimer = setInterval(tick, 2500);

    function startReveal(alreadyRevealed) {
      if (revealing) return;
      revealing = true;
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      var go = alreadyRevealed
        ? Promise.resolve({ ok: true })
        : adminCall('setReveal', { className: cls, revealed: true });
      go.then(function () {
        return adminCall('tournament', { className: cls, lessonId: lessonId });
      }).then(function (r) {
        if (!r || !r.ok) { revealing = false; tick(); pollTimer = setInterval(tick, 2500); return; }
        animateReveal(r);
      });
    }

    function animateReveal(r) {
      lobby.hidden = true;
      board.hidden = false;
      var standings = (r.teams || []).slice().sort(function (a, b) { return Number(b.total) - Number(a.total); });
      var top = standings.length ? Math.max(1, Number(standings[0].total)) : 1;
      board.innerHTML = standings.map(function (t, i) {
        return '<div class="tourney-row' + (i === 0 ? ' is-first' : '') + '" data-i="' + i + '">' +
          '<span class="tourney-row-place">' + (i + 1) + '</span>' +
          '<span class="tourney-row-name">' + App.esc(t.name) + '</span>' +
          '<span class="tourney-row-track"><span class="tourney-row-fill"></span></span>' +
          '<span class="tourney-row-total">0</span></div>';
      }).join('') +
        '<p class="tourney-winner-line" hidden></p>' +
        ((r.mode === 'public' && r.rows && r.rows.length)
          ? '<div class="tourney-public"><h3>Pair scores (public mode)</h3>' +
            r.rows.map(function (p2) { return '<div class="tourney-public-row"><span>' + App.esc(p2.n) + '</span><b>' + Number(p2.v) + '</b></div>'; }).join('') + '</div>'
          : '') +
        '<div class="tourney-actions" style="margin-top:4vh"><button type="button" class="tourney-ghost-btn" data-t="done">Done</button></div>';
      board.querySelector('[data-t="done"]').onclick = close;

      function countUp(el, target, ms) {
        var t0 = null, landed = false;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min(1, (ts - t0) / ms);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p >= 1) landed = true;
          if (p < 1 && document.body.contains(el)) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        /* rAF never fires in a hidden/backgrounded tab - snap to the real total
           so the board is never left reading 0 */
        setTimeout(function () { if (!landed && document.body.contains(el)) el.textContent = target; }, ms + 400);
      }

      /* last place first; the winner lands last, then shimmers */
      var order = [];
      for (var i = standings.length - 1; i >= 0; i--) order.push(i);
      order.forEach(function (idx, step) {
        setTimeout(function () {
          var row = board.querySelector('.tourney-row[data-i="' + idx + '"]');
          if (!row) return;
          row.classList.add('in');
          var t = standings[idx];
          var w = Math.max(7, Math.round((Number(t.total) / top) * 100));
          setTimeout(function () { row.querySelector('.tourney-row-fill').style.width = w + '%'; }, 180);
          countUp(row.querySelector('.tourney-row-total'), Number(t.total), 1500);
          if (idx === 0) {
            setTimeout(function () {
              row.classList.add('done');
              var wl = board.querySelector('.tourney-winner-line');
              if (wl) {
                wl.hidden = false;
                wl.textContent = 'Team ' + standings[0].name + ' takes the Rally!';
                requestAnimationFrame(function () { wl.classList.add('in'); });
                setTimeout(function () { wl.classList.add('in'); }, 120); // hidden-tab rAF fallback
              }
              var pub = board.querySelector('.tourney-public');
              if (pub) setTimeout(function () { pub.classList.add('in'); }, 900);
            }, 1750);
          }
        }, 600 + step * 1400);
      });
    }
  }

  /* ============================================================
     Pairing lens (ARCHITECTURE section 12): live queue / pairs / laggards,
     channel transcripts, release + force controls, chime on stuck waiters.
     Auto-polls every 5s while visible; the interval self-clears the moment
     the lens leaves the DOM (tab switch / modal close / refresh).
     ============================================================ */
  function staffChime() {
    if (chimeMuted) return;
    try {
      if (!audioCtx) audioCtx = new (global.AudioContext || global.webkitAudioContext)();
      var t0 = audioCtx.currentTime;
      [[880, 0, 0.14], [1174.7, 0.16, 0.2]].forEach(function (n) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t0 + n[1]);
        g.gain.exponentialRampToValueAtTime(0.18, t0 + n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t0 + n[1]); o.stop(t0 + n[1] + n[2] + 0.05);
      });
    } catch (e) {}
  }

  function injectPairStyles() {
    if (document.getElementById('pair-lens-style')) return;
    var st = document.createElement('style');
    st.id = 'pair-lens-style';
    st.textContent =
      '.pair-lens-box{background:#F8FAFD;border:1px solid #E3E8F2;border-radius:12px;padding:14px 16px;margin:0 0 16px}' +
      '.pl-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px}' +
      '.pl-head h3{margin:0}' +
      '.pl-mute{margin-left:auto;font-size:0.8rem;color:var(--muted);display:flex;gap:6px;align-items:center}' +
      '.pl-chips{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}' +
      '.pl-chip{background:#fff;border:1px solid #E3E8F2;border-radius:999px;padding:5px 12px;font-size:0.8rem;font-weight:600}' +
      '.pl-chip.alert{background:var(--bad-soft);border-color:var(--bad);color:var(--bad);animation:plPulse 1.1s ease-in-out infinite}' +
      '.pl-chip.lag{background:var(--bad-soft);border-color:var(--bad);color:var(--bad)}' +
      '.pl-chip .ghost-btn{padding:1px 8px;font-size:0.72rem;margin-left:6px}' +
      '@keyframes plPulse{0%,100%{opacity:1}50%{opacity:0.55}}' +
      '.pl-pair{background:#fff;border:1px solid #E3E8F2;border-radius:10px;padding:9px 12px;margin:6px 0;font-size:0.85rem}' +
      '.pl-pair b{color:var(--ols-blue)}' +
      '.pl-last{color:var(--muted);font-style:italic}' +
      '.pl-tx{margin-top:8px;border-top:1px dashed #E3E8F2;padding-top:8px;max-height:220px;overflow-y:auto}' +
      '.pl-tx-line{margin:3px 0;font-size:0.82rem}' +
      '.pl-tx-line b{font-weight:700;color:var(--ols-blue)}' +
      '.pl-note{color:var(--muted);font-size:0.83rem;margin:6px 0}';
    document.head.appendChild(st);
  }

  /* DFM 156(b), his words: "Lesson 2 doesn't need to see the pairing panel."
     The lens now belongs to the lesson on screen, and only appears when that
     lesson actually has a paired stage. */
  function initPairLens(le, feat) {
    var slot = q('#pair-lens');
    if (!slot || !le || !feat || !feat.paired) {
      if (pairLensTimer) { clearInterval(pairLensTimer); pairLensTimer = null; }
      return;
    }
    injectPairStyles();
    pairLensLesson = String(le.id);
    slot.innerHTML =
      '<div class="pair-lens-box">' +
      '<div class="pl-head"><h3>Pairing &mdash; live (' + App.esc(lessonLabelFor(le.num)) + ')</h3>' +
      '<label class="pl-mute"><input type="checkbox" id="pair-mute"' + (chimeMuted ? ' checked' : '') + '> mute chime</label></div>' +
      '<div id="pair-lens-body">' + busyHtml('Listening to the room') + '</div></div>';
    pairAlerted = {};
    pairLensTick();
    if (pairLensTimer) clearInterval(pairLensTimer);
    pairLensTimer = setInterval(function () {
      if (!document.getElementById('pair-lens-body')) { clearInterval(pairLensTimer); pairLensTimer = null; return; }
      pairLensTick();
    }, 5000);
  }

  function pairLensTick() {
    adminCall('pairs', { className: cls, lessonId: pairLensLesson }).then(function (r) {
      var bodyEl = q('#pair-lens-body');
      if (!bodyEl || !r || !r.ok) return;
      var openTx = {};
      bodyEl.querySelectorAll('.pl-tx').forEach(function (n) { openTx[n.getAttribute('data-pid')] = n.innerHTML; });
      if (!Number(r.on)) {
        bodyEl.innerHTML = '<p class="pl-note">Auto-pairing is switched OFF for this class (Options tab) &mdash; the activity runs as shoulder-partners at one machine.</p>';
        return;
      }
      var chime = false;
      var queueHtml = (r.queue || []).map(function (w) {
        var alert = Number(w.wait) > 90;
        if (alert && !pairAlerted['w:' + w.email]) { pairAlerted['w:' + w.email] = 1; chime = true; }
        return '<span class="pl-chip' + (alert ? ' alert' : '') + '">' + App.esc(w.name || w.cn) +
          ' &middot; waiting ' + Number(w.wait) + 's' +
          '<button type="button" class="ghost-btn" data-action="pair-release" data-email="' + App.esc(w.email) + '">Solo run</button></span>';
      }).join('');
      var lagHtml = '';
      if ((r.queue || []).length && (r.laggards || []).length) {
        lagHtml = '<p class="pl-note" style="margin-bottom:4px"><b>The room is waiting on:</b></p><div class="pl-chips">' +
          r.laggards.map(function (l) {
            if (!pairAlerted['l:' + l.email]) { pairAlerted['l:' + l.email] = 1; chime = true; }
            return '<span class="pl-chip lag">' + App.esc(l.name) + ' &middot; part ' + (Number(l.ci) + 1) + ' of ' + Number(l.cc) + '</span>';
          }).join('') + '</div>';
      }
      var pairsHtml = (r.pairs || []).map(function (pr) {
        var tx = openTx[pr.pid] ? '<div class="pl-tx" data-pid="' + App.esc(pr.pid) + '">' + openTx[pr.pid] + '</div>' : '';
        return '<div class="pl-pair"' + (Number(pr.dis) ? ' style="opacity:.65"' : '') + '><b>' + pr.cn.map(function (c) { return 'Agent ' + App.esc(c); }).join(' + ') + '</b>' +
          (Number(pr.trio) ? ' <span class="pill none">trio</span>' : '') +
          ' <span class="pl-note" style="display:inline">(' + pr.names.map(App.esc).join(' &amp; ') + ')</span>' +
          ' &middot; ' + Number(pr.msgs) + ' msgs' +
          (Number(pr.dis) ? ' &middot; <span class="pill none">released &mdash; finishing solo</span>' : '') +
          (Number(pr.done) ? ' &middot; <span class="pill done">done</span>' : '') +
          ' <button type="button" class="ghost-btn" style="padding:1px 10px;font-size:0.74rem" data-action="pair-view" data-pid="' + App.esc(pr.pid) + '">Channel</button>' +
          (pr.last ? '<div class="pl-last">' + App.esc(pr.last) + '</div>' : '') +
          tx + '</div>';
      }).join('');
      var soloHtml = (r.solo || []).length
        ? '<p class="pl-note">Solo runs: ' + r.solo.map(function (sd) { return App.esc(sd.name); }).join(', ') + '</p>' : '';
      bodyEl.innerHTML =
        '<div class="pl-chips">' +
        '<span class="pl-chip">' + Number(r.present) + ' live on this lesson</span>' +
        '<span class="pl-chip">' + (r.queue || []).length + ' waiting</span>' +
        '<span class="pl-chip">' + (r.pairs || []).filter(function (pr) { return !Number(pr.dis); }).length + ' pairs</span>' +
        ((r.queue || []).length ? '<button type="button" class="ghost-btn" data-action="pair-force">Match everyone waiting now</button>' : '') +
        '<button type="button" class="ghost-btn danger" data-action="pair-reset">' + (pairResetArm ? 'Sure? Every pair finishes solo' : 'Reset pairing') + '</button>' +
        '</div>' +
        (queueHtml ? '<div class="pl-chips">' + queueHtml + '</div>' : '') +
        lagHtml + pairsHtml + soloHtml +
        (!(r.queue || []).length && !(r.pairs || []).length ? '<p class="pl-note">No one has reached the pairing stage yet &mdash; this panel wakes up the moment the first pupil arrives.</p>' : '');
      if (chime) staffChime();
    });
  }

  function pairRelease(btn) {
    btn.disabled = true;
    adminCall('pairRelease', { className: cls, lessonId: pairLensLesson, email: btn.getAttribute('data-email') })
      .then(function () { pairLensTick(); });
  }
  function pairForce(btn) {
    btn.disabled = true;
    adminCall('pairForce', { className: cls, lessonId: pairLensLesson }).then(function () { pairLensTick(); });
  }
  function pairReset(btn) {
    if (!pairResetArm) {
      pairResetArm = 1;
      btn.textContent = 'Sure? Every pair finishes solo';
      setTimeout(function () { pairResetArm = 0; var b = q('[data-action="pair-reset"]'); if (b) b.textContent = 'Reset pairing'; }, 4000);
      return;
    }
    pairResetArm = 0;
    /* C-11: this no longer deletes the registry. Every unfinished pair is
       released to finish solo (their screens change by themselves within a
       couple of seconds - no reload), and the waiting queue re-forms. */
    adminCall('pairReset', { className: cls, lessonId: pairLensLesson }).then(function (r) {
      if (r && r.ok) {
        App.toast(Number(r.freed)
          ? (Number(r.freed) + ' pupil' + (Number(r.freed) === 1 ? '' : 's') + ' released &mdash; they carry on solo, nothing is lost.')
          : 'Pairing queue cleared &mdash; anyone waiting will be matched again.');
      }
      pairLensTick();
    });
  }
  function pairView(btn) {
    var pid = btn.getAttribute('data-pid');
    var pairEl = btn.closest('.pl-pair');
    if (!pairEl) return;
    var existing = pairEl.querySelector('.pl-tx');
    if (existing) { existing.remove(); return; }
    adminCall('pairTranscript', { className: cls, lessonId: pairLensLesson, pid: pid }).then(function (r) {
      if (!r || !r.ok) return;
      var el2 = document.createElement('div');
      el2.className = 'pl-tx';
      el2.setAttribute('data-pid', pid);
      if (r.lines && r.lines.length) {
        el2.innerHTML = r.lines.map(function (ln) {
          return '<div class="pl-tx-line"><b>' + App.esc(ln.who) + ':</b> ' + App.esc(ln.text) + '</div>';
        }).join('');
      } else if (r.tx) {
        el2.innerHTML = '<div class="pl-tx-line">' + App.esc(r.tx) + '</div>';
      } else el2.innerHTML = '<div class="pl-tx-line">No messages yet.</div>';
      var cur = pairEl.querySelector('.pl-tx');
      if (cur) cur.remove();
      pairEl.appendChild(el2);
    });
  }

  function loadMisconceptions(le) {
    var body = q('#live-mis-body');
    if (!body || !le) return;
    body.innerHTML = busyHtml('Loading misconception data');
    Promise.all([
      App.fetchContent(le.file).catch(function () { return null; }),
      getKeyinfo(le.id)
    ]).then(function (res) {
      var lesson = res[0], items = res[1];
      if (!lesson || !items) { body.innerHTML = errorHtml('Could not load misconception data for this lesson.'); return; }
      var exitItems = exitItemsOf(lesson);
      if (!exitItems.length) { body.innerHTML = '<p class="staff-status">This lesson has no exit check.</p>'; return; }
      var rows = dashData.rows || [];
      var html = exitItems.map(function (it, i) {
        var counts = {};
        rows.forEach(function (r) {
          var a = r.L[String(le.num)];
          if (!a || !a[3]) return;
          var ch = String(a[3]).charAt(i);
          if (ch === '' || ch === 'x') return;
          counts[ch] = (counts[ch] || 0) + 1;
        });
        return barBlockHtml(App.esc(it.stem || ('Item ' + (i + 1))), it, items[it.id] || { a: -1, mis: [] }, counts, '');
      }).join('');
      body.innerHTML = html;
    });
  }

  /* One block of answer bars. The misconception panel and the Licence Exam
     panel are the same picture of the same kind of data, so they are drawn by
     the same function rather than by two copies that can drift.
     `titleHtml` is already-safe HTML (the callers escape their own text).
     DFM 106 (1 Aug 2026): the correct row said "Option A (correct)", which
     tells a teacher nothing at a glance - she then had to open the lesson to
     find out what option A actually was. The item's own option text is right
     here. Distractor rows keep their authored misconception labels; that part
     he confirmed works. */
  function barBlockHtml(titleHtml, item, key, counts, extraLine) {
    var optText = item.options || [];
    var mis = key.mis || [];
    var optCount = Math.max(mis.length, optText.length, Number(key.a) + 1, 2);
    var maxCount = 1;
    Object.keys(counts).forEach(function (k) { if (counts[k] > maxCount) maxCount = counts[k]; });
    var bars = '';
    for (var oi = 0; oi < optCount; oi++) {
      var n = counts[String(oi)] || 0;
      var isCorrect = oi === Number(key.a);
      var label = isCorrect
        ? ((optText[oi] || ('Option ' + 'ABCDEFGH'.charAt(oi))) + ' (the correct answer)')
        : (mis[oi] || ('Option ' + 'ABCDEFGH'.charAt(oi)));
      bars += '<div class="mis-bar"><span class="mb-label">' + App.esc(label) + '</span>' +
        '<span class="mb-track"><span class="mb-fill' + (isCorrect ? ' correct' : '') + '" style="width:' + Math.round((n / maxCount) * 100) + '%"></span></span>' +
        '<span class="mb-n">' + n + '</span></div>';
    }
    return '<div class="staff-row" style="display:block"><div class="staff-row-name">' + titleHtml + '</div>' +
      bars + (extraLine || '') + '</div>';
  }

  /* DFM 157d - his question: "is there a way to see what they answered
     correctly/incorrectly, or where is this is stored". It always was stored;
     nothing ever showed it. Lesson 1's view only. */
  function baselinePanelHtml(rows, l1) {
    if (!l1 || !l1.feat || !l1.feat.baseline || !l1.keys) return '';
    var items = l1.feat.baseline.items || [];
    if (!items.length) return '';
    if (!rows.some(function (r) { return !!baselineChosen(r); })) return '';
    var blocks = items.map(function (it, i) {
      var counts = {}, none = 0;
      rows.forEach(function (r) {
        var ch = baselineChosen(r).charAt(i);
        if (ch === '') return;
        if (ch === 'x') { none++; return; }
        counts[ch] = (counts[ch] || 0) + 1;
      });
      return barBlockHtml('Q' + (i + 1) + ' &mdash; ' + App.esc(String(it.stem || '')),
        it, l1.keys[it.id] || { a: -1, mis: [] }, counts,
        none ? '<div class="staff-row-meta">answered nothing: ' + none + '</div>' : '');
    }).join('');
    return '<h3 style="margin-top:20px">The Licence Exam &mdash; where the class started</h3>' +
      '<p class="pl-note">Sixteen questions, sat once in September before any teaching. For each one, ' +
      'what the class chose. No pupil was ever shown right or wrong on these.</p>' + blocks;
  }

  /* DFM 157f: this used to export "200|2" - the raw storage string, i.e. the
     exact unlabelled-code fault the tab itself had just been fixed for. A
     spreadsheet is a stat surface like any other, so it says what it means:
     words, and the same marks the table and its key use. */
  /* DFM 160. Two presses, like Reset pairing: a flag is never cleared by a
     stray click, and it is never a one-way door - the same two presses on a
     grey flag bring the colour back. */
  var flagArm = null, flagArmTimer = null;
  function flagArmKey(btn) {
    return btn.getAttribute('data-email') + '|' + btn.getAttribute('data-lesson') + '|' + btn.getAttribute('data-kind');
  }
  function flagDisarm() {
    flagArm = null;
    if (flagArmTimer) { clearTimeout(flagArmTimer); flagArmTimer = null; }
    var b = q('[data-action="flag-toggle"][data-armed="1"]');
    if (b) { b.removeAttribute('data-armed'); b.textContent = b.getAttribute('data-label') || b.textContent; }
  }
  function flagToggle(btn) {
    var key = flagArmKey(btn);
    var on = btn.getAttribute('data-on') === '1';
    if (flagArm !== key) {
      flagDisarm();
      flagArm = key;
      btn.setAttribute('data-label', btn.textContent);
      btn.setAttribute('data-armed', '1');
      btn.textContent = on
        ? (btn.getAttribute('data-kind') === 'red' ? 'mark as helped?' : 'mark as heard?')
        : 'put the flag back?';
      flagArmTimer = setTimeout(flagDisarm, 4000);
      return;
    }
    flagDisarm();
    /* DAMIEN, 8 Aug 2026, on the live flags: "once a flag is clicked, it can
       take a few second before it changes to grey (and vice versa), so a small
       spinning wheel or something would be helpful". Rule 42 again - the wait
       here is the Apps Script round trip, and the pill said nothing while it
       ran. Both directions, because he asked for both. */
    var wasLabel = btn.textContent;
    btn.disabled = true;
    btn.classList.add('is-saving');
    btn.innerHTML = '<span class="pill-spinner"></span>Saving';
    adminCall('flagHandled', {
      className: cls,
      email: btn.getAttribute('data-email'),
      lessonNum: btn.getAttribute('data-lesson'),
      kind: btn.getAttribute('data-kind'),
      on: on ? 1 : 0
    }).then(function (rr) {
      if (!rr || !rr.ok) {
        btn.disabled = false;
        btn.classList.remove('is-saving');
        btn.textContent = wasLabel;
        plainStatus(q('#live-status'), 'That did not save -- please try again.');
        return;
      }
      /* repaint from the dashboard we already hold, with this one record's
         ledger brought up to date - no round trip for the rest of the class */
      var email = btn.getAttribute('data-email'), lnum = btn.getAttribute('data-lesson');
      (dashData.rows || []).forEach(function (row) {
        if (row.email !== email) return;
        var arr = (row.L || {})[lnum];
        if (arr) arr[2] = String(rr.detail == null ? arr[2] : rr.detail);
      });
      renderLiveTable();
    });
  }

  /* DFM 162(a): the strip names every lesson a pupil is live in, and each one is
     a way IN. This is deliberately the same path the Showing menu takes, loading
     state and all (DFM 161 / 156f), because the first visit to a lesson pays a
     real round trip and a silent one would be the same fault a third time. */
  function stripJump(btn) {
    liveLessonNum = btn.getAttribute('data-lesson');
    paintLiveLoading(liveLessonNum);
    renderLiveTable();
  }

  function liveCsv(btn) {
    if (!dashData) return;
    var rows = dashData.rows || [];
    var delivered = deliveredNumsOf(dashData);
    if (btn) btn.disabled = true;
    Promise.all(delivered.map(function (n) { return lessonFeaturesFor(liveByNum[n]); })).then(function (feats) {
      function csvCell(s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }
      function pre(n) { return isSideQuestNum(n) ? String(n) : ('L' + n); }
      /* the table's own tick, wave and cross - escaped, because this file is
         ASCII-only by design (the assembler guards it) */
      var MARK = { '2': '\u2713', '1': '\u2248', '0': '\u2717' };
      var FELT = { '0': 'Easy', '1': 'Just right', '2': 'Tricky' };

      var head = ['Name', 'Email', 'Codename', 'XP', 'Baseline'];
      delivered.forEach(function (n, i) {
        var f = feats[i] || {};
        head.push(pre(n) + ' status', pre(n) + ' exit');
        if (f.parsons) head.push(pre(n) + ' build puzzle');
        head.push(pre(n) + ' how did it go', pre(n) + ' how it felt', pre(n) + ' comment');
      });
      var lines = [head.map(csvCell).join(',')];

      rows.forEach(function (r) {
        var line = [r.name, r.email, r.codename, r.xp, baselineDisplay(r) || ''];
        delivered.forEach(function (n, i) {
          var f = feats[i] || {};
          var a = r.L[n];
          var st = Number((a || [])[0] || 0);
          line.push(st === 2 ? 'done' : st === 1 ? 'started' : 'not started');
          var exitTxt = '';
          if (a && a[3]) {
            var ex = exitRightMap[n];
            var rc = ex ? rightCountFor(String(a[3]), ex) : null;
            if (rc) exitTxt = rc.right + '/' + rc.total;
          }
          line.push(exitTxt);
          if (f.parsons) {
            var m = /(?:^|;)ep=([01])(?:;|$)/.exec(String((a && a[2]) || ''));
            line.push(m ? (m[1] === '1' ? 'right' : 'not right') : '');
          }
          var se = String((a && a[4]) || '').split('|');
          line.push((se[0] || '').split('').map(function (c) { return MARK[c] || ''; }).filter(Boolean).join(' '));
          line.push(FELT[se[1]] || '');
          line.push((a && a[8]) || '');
        });
        lines.push(line.map(csvCell).join(','));
      });
      App.copyText(lines.join('\n'), 'CSV copied.');
      if (btn) btn.disabled = false;
    });
  }

  /* ============================================================
     ABSENCE tab
     ============================================================ */
  function renderAbsence() {
    requireClass(function () {
      setPane(busyHtml('Loading absence flags'));
      var token = ++dashSeq;
      adminCall('dashboard', { className: cls }).then(function (r) {
        if (token !== dashSeq) return;
        if (!r || !r.ok) { setPane(errorHtml('Could not load absence flags for this class.')); return; }
        dashData = r; year = r.year || year;
        loadManifestForActiveClass().then(function (man) {
          if (token !== dashSeq) return;
          if (!man) { setPane(errorHtml('Could not load the lesson list.')); return; }
          renderAbsenceList(man);
        });
      });
    });
  }

  function renderAbsenceList(man) {
    var byId = {};
    (man.lessons || []).forEach(function (le) { byId[le.id] = le; });
    var flags = [];
    (dashData.rows || []).forEach(function (r) {
      (r.absence || []).forEach(function (id) {
        var le = byId[id]; if (!le) return;
        var lk = (dashData.locks || {})[String(le.num)];
        flags.push({ email: r.email, name: r.name, num: le.num, title: le.title, u: lk ? Number(lk.u) : 0 });
      });
    });
    var absDays = dashData.cfg ? Number(dashData.cfg.absDays) : 5;
    var lead = '<p class="staff-lead">Flags appear ' + absDays + ' school day' + (absDays === 1 ? '' : 's') +
      ' after a lesson is delivered, if there is no meaningful work logged for it. This is never shown to pupils as an attendance record.</p>';
    if (!flags.length) { setPane(lead + '<p class="staff-status">No pupils are flagged right now.</p>'); return; }
    var rows = flags.map(function (f) {
      return '<div class="staff-row">' +
        '<span>' + App.esc(f.name) + ' &mdash; Lesson ' + f.num + ' ' + App.esc(f.title) + ': no meaningful work since it was delivered' +
        (f.u ? (' ' + App.esc(fmtDate(f.u))) : '') + '</span>' +
        '<div class="staff-actions"><button type="button" class="ghost-btn" data-action="absence-dismiss" data-email="' + App.esc(f.email) + '" data-num="' + f.num + '">Dismiss flag</button></div></div>';
    }).join('');
    setPane(lead + rows + '<p class="staff-status" id="absence-status"></p>');
  }

  function absenceDismiss(btn) {
    if (btn.disabled) return;
    var email = btn.getAttribute('data-email'), num = btn.getAttribute('data-num');
    btn.disabled = true;
    var row = btn.closest('.staff-row');
    if (row) row.style.opacity = '0.5';
    adminCall('absenceDismiss', { className: cls, email: email, lessonNum: num }).then(function (r) {
      if (!r || !r.ok) {
        btn.disabled = false;
        if (row) row.style.opacity = '1';
        plainStatus(q('#absence-status'), 'Could not dismiss that flag -- please try again.');
        return;
      }
      if (row) row.remove();
    });
  }

  /* ============================================================
     TEAMS tab
     ============================================================ */
  function renderTeams() {
    requireClass(function () {
      setPane(busyHtml('Loading teams'));
      var token = ++dashSeq;
      adminCall('dashboard', { className: cls }).then(function (r) {
        if (token !== dashSeq) return;
        if (!r || !r.ok) { setPane(errorHtml('Could not load teams for this class.')); return; }
        dashData = r; year = r.year || year;
        renderTeamsBoard();
      });
    });
  }

  function chipHtml(m) {
    return '<span class="staff-chip" data-action="team-chip" data-email="' + App.esc(m.email) + '" data-name="' + App.esc(m.name) + '">' +
      App.esc(m.name) + ' <span class="sc-xp">' + Number(m.xp || 0) + '</span></span>';
  }

  function renderTeamsBoard() {
    var rows = dashData.rows || [];
    var groups = dashData.groups || [];
    var byGroup = {}, assigned = {};
    groups.forEach(function (g) { byGroup[g.id] = []; });
    rows.forEach(function (r) { if (r.groupId && byGroup[r.groupId]) { byGroup[r.groupId].push(r); assigned[r.email] = true; } });
    var unassigned = rows.filter(function (r) { return !assigned[r.email]; });

    var pool = unassigned.length ? unassigned.map(chipHtml).join('') : '<span class="staff-row-meta">Everyone is assigned to a team.</span>';
    var cols = groups.map(function (g) {
      var members = byGroup[g.id] || [];
      var teamXp = members.reduce(function (s, m) { return s + Number(m.xp || 0); }, 0);
      return '<div class="staff-team-col">' +
        '<h4><span>' + App.esc(g.name) + '</span><span>' + teamXp + ' XP</span></h4>' +
        '<div>' + (members.map(chipHtml).join('') || '<span class="staff-row-meta">No members yet.</span>') + '</div>' +
        '<button type="button" class="ghost-btn danger" data-action="team-del-group" data-group="' + App.esc(g.id) + '" style="margin-top:8px">Delete group</button>' +
        '</div>';
    }).join('') || '<p class="staff-status">No teams yet -- add one below, or auto-make some.</p>';

    var html =
      '<p class="staff-lead">Unassigned pupils (click a name to move it)</p>' +
      '<div class="staff-chip-pool">' + pool + '</div>' +
      '<div class="staff-team-cols">' + cols + '</div>' +
      '<div class="staff-add-row">' +
        '<input type="text" id="team-new-name" class="text-input" placeholder="New team name" maxlength="24">' +
        '<button type="button" class="primary-btn" data-action="team-add-group">Add team</button>' +
      '</div>' +
      '<div class="staff-add-row">' +
        '<input type="number" id="team-auto-n" class="text-input" style="max-width:90px" min="2" max="10" value="4">' +
        '<button type="button" class="ghost-btn" data-action="team-auto">Auto-make N teams</button>' +
      '</div>' +
      '<label style="display:flex;align-items:center;gap:8px;margin-top:10px">' +
        '<input type="checkbox" id="team-reveal"' + (dashData.reveal ? ' checked' : '') + '> Pupils can see who is in their team</label>' +
      '<p class="staff-status" id="team-status"></p>';
    setPane(html);
  }

  var chipMenuEl = null;
  function closeChipMenu() {
    if (!chipMenuEl) return;
    chipMenuEl.remove(); chipMenuEl = null;
    document.removeEventListener('click', onDocClickForChipMenu, true);
  }
  function onDocClickForChipMenu(e) { if (chipMenuEl && !chipMenuEl.contains(e.target)) closeChipMenu(); }
  function openChipMenu(chipEl) {
    closeChipMenu();
    var email = chipEl.getAttribute('data-email'), name = chipEl.getAttribute('data-name');
    var curGid = '';
    (dashData.rows || []).forEach(function (r) { if (r.email === email) curGid = r.groupId || ''; });
    var rows = '<div class="staff-row-meta" style="padding:4px 10px 6px">Move ' + App.esc(name) + ' to</div>' +
      '<button type="button" data-gid="">-- Unassigned --' + (!curGid ? ' (current)' : '') + '</button>';
    (dashData.groups || []).forEach(function (g) {
      rows += '<button type="button" class="' + (g.id === curGid ? 'current' : '') + '" data-gid="' + App.esc(g.id) + '">' + App.esc(g.name) + (g.id === curGid ? ' (current)' : '') + '</button>';
    });
    var menu = document.createElement('div');
    menu.className = 'staff-chip-menu';
    menu.innerHTML = rows;
    document.body.appendChild(menu);
    var rect = chipEl.getBoundingClientRect();
    var top = rect.bottom + 6;
    var left = Math.max(8, Math.min(rect.left, global.innerWidth - menu.offsetWidth - 8));
    if (top + menu.offsetHeight > global.innerHeight - 8) top = Math.max(8, rect.top - menu.offsetHeight - 6);
    menu.style.top = top + 'px'; menu.style.left = left + 'px';
    menu.addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      var gid = btn.getAttribute('data-gid') || '';
      closeChipMenu();
      assignPupil(email, gid);
    });
    chipMenuEl = menu;
    setTimeout(function () { document.addEventListener('click', onDocClickForChipMenu, true); }, 0);
  }
  function assignPupil(email, groupId) {
    (dashData.rows || []).forEach(function (r) { if (r.email === email) r.groupId = groupId; });
    renderTeamsBoard();
    adminCall('assignPupil', { className: cls, email: email, groupId: groupId }).then(function (r) {
      if (!r || !r.ok) { renderTeams(); }
    });
  }

  function teamAddGroup() {
    var input = q('#team-new-name');
    var name = input.value.trim();
    if (!name) { input.focus(); return; }
    var btn = q('[data-action="team-add-group"]');
    if (btn.disabled) return;
    btn.disabled = true;
    busyStatus(q('#team-status'), 'Adding the team');
    adminCall('createGroup', { className: cls, name: name }).then(function (r) {
      btn.disabled = false;
      if (!r || !r.ok) { plainStatus(q('#team-status'), 'Could not add the team -- please try again.'); return; }
      renderTeams();
    });
  }

  function teamAuto(btn) {
    if (btn.disabled) return;
    var n = Math.max(2, Math.min(10, parseInt(q('#team-auto-n').value, 10) || 4));
    if (!btn.classList.contains('arm')) {
      btn.classList.add('arm'); btn.textContent = 'Sure? This reshuffles everyone';
      setTimeout(function () { if (btn.classList.contains('arm')) { btn.classList.remove('arm'); btn.textContent = 'Auto-make N teams'; } }, 4000);
      return;
    }
    btn.disabled = true; btn.classList.remove('arm');
    busyStatus(q('#team-status'), 'Shuffling the class into teams');
    adminCall('autoGroup', { className: cls, n: n }).then(function (r) {
      if (!r || !r.ok) { btn.disabled = false; btn.textContent = 'Auto-make N teams'; plainStatus(q('#team-status'), 'Could not shuffle -- please try again.'); return; }
      renderTeams();
    });
  }

  function teamDelGroup(btn) {
    if (btn.disabled) return;
    var gid = btn.getAttribute('data-group');
    if (!btn.classList.contains('arm')) {
      btn.classList.add('arm'); btn.textContent = 'Sure?';
      setTimeout(function () { if (btn.classList.contains('arm')) { btn.classList.remove('arm'); btn.textContent = 'Delete group'; } }, 4000);
      return;
    }
    btn.disabled = true;
    adminCall('deleteGroup', { className: cls, groupId: gid }).then(function (r) {
      if (!r || !r.ok) { btn.disabled = false; btn.classList.remove('arm'); btn.textContent = 'Delete group'; plainStatus(q('#team-status'), 'Could not delete the group.'); return; }
      renderTeams();
    });
  }

  function teamReveal(checkbox) {
    var on = checkbox.checked;
    checkbox.disabled = true;
    adminCall('setReveal', { className: cls, revealed: on }).then(function (r) {
      checkbox.disabled = false;
      if (!r || !r.ok) { checkbox.checked = !on; plainStatus(q('#team-status'), 'Could not update -- please try again.'); return; }
      plainStatus(q('#team-status'), on ? 'Pupils can now see who is in their team.' : 'Team members are now hidden from pupils.');
    });
  }

  /* ============================================================
     OPTIONS tab
     ============================================================ */
  function renderOptions() {
    requireClass(function () {
      setPane(busyHtml('Loading options'));
      adminCall('dashboard', { className: cls }).then(function (r) {
        if (!r || !r.ok) { setPane(errorHtml('Could not load options for this class.')); return; }
        dashData = r; year = r.year || year;
        renderOptionsForm(r.cfg);
      });
    });
  }

  function optRadio(name, val, cur, label) {
    return '<label style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px">' +
      '<input type="radio" name="' + name + '" value="' + val + '"' + (cur === val ? ' checked' : '') + '> <span>' + label + '</span></label>';
  }

  function renderOptionsForm(cfg) {
    var lb = cfg.lb || { mode: 'off', basis: 'xp', names: 'codename', topN: 0 };
    var html =
      /* DFM 121c/122: a teacher opening this tab could not tell WHICH class she
         was changing, whether it applied per lesson, or when it took effect. */
      '<p class="staff-lead">These options apply to the class you have selected on the Classes tab. ' +
      'Each is one setting for the whole class, all year &mdash; not per lesson &mdash; and lasts until you ' +
      'change it. <b>Save</b> stores all four at once.</p>' +
      '<h3>Leaderboard</h3>' +
      optRadio('lb-mode', 'off', lb.mode, '<b>Private (default):</b> each pupil sees only her own progress.') +
      optRadio('lb-mode', 'team', lb.mode, '<b>Hidden teams:</b> team totals are visible, members stay hidden until you reveal them.') +
      optRadio('lb-mode', 'public', lb.mode, '<b>Public board (deliberate choice):</b> a ranked class board appears at the top of every pupil&rsquo;s home page &mdash; whole-year totals &mdash; until you switch it back.') +
      '<div id="opt-public"' + (lb.mode === 'public' ? '' : ' hidden') + '>' +
        '<p class="staff-lead">Public board settings</p>' +
        optRadio('lb-basis', 'xp', lb.basis, 'Rank by XP') +
        optRadio('lb-basis', 'completion', lb.basis, 'Rank by lessons completed') +
        optRadio('lb-names', 'codename', lb.names, 'Show codenames') +
        optRadio('lb-names', 'real', lb.names, 'Show real first names') +
        '<label style="display:block;margin-top:8px">Show top <input type="number" id="opt-topn" class="text-input" style="max-width:90px;display:inline-block" min="0" max="50" value="' + Number(lb.topN || 0) + '"> (0 = everyone)</label>' +
      '</div>' +
      '<h3 style="margin-top:20px">Auto-pairing</h3>' +
      optRadio('pair-on', '1', String((cfg.pairing || { on: 1 }).on || 0), '<b>On (default):</b> paired activities match pupils across machines with the monitored chat channel.') +
      optRadio('pair-on', '0', String((cfg.pairing || { on: 1 }).on || 0), '<b>Off:</b> paired activities run as shoulder-partners at one machine (no chat).') +
      '<h3 style="margin-top:20px">Tournament reveal</h3>' +
      optRadio('tn-mode', 'team', String((cfg.tn || { mode: 'team' }).mode), '<b>Team totals only (default):</b> the projector reveal shows hidden-team totals &mdash; no individual pupil is named.') +
      /* DFM 124b: the label used to promise "first names"; the projector really
         prints full names, and Damien wants it that way because a class can
         hold two pupils with the same first name. The label follows the code. */
      optRadio('tn-mode', 'public', String((cfg.tn || { mode: 'team' }).mode), '<b>Also show pair scores (deliberate choice):</b> after the team bars, a ranked list of pair scores with pupils&rsquo; full names appears on the projector.') +
      '<h3 style="margin-top:20px">Absence window</h3>' +
      '<label>Flag after <input type="number" id="opt-absdays" class="text-input" style="max-width:90px;display:inline-block" min="1" max="20" value="' + Number(cfg.absDays || 5) + '"> school days with no meaningful work</label>' +
      '<div class="confirm-actions" style="justify-content:flex-start;margin-top:16px">' +
        '<button type="button" class="primary-btn" data-action="options-save">Save</button>' +
      '</div>' +
      '<p class="staff-status" id="options-status"></p>';
    setPane(html);
  }

  function optionsSave(btn) {
    if (btn.disabled) return;
    var modeEl = q('input[name="lb-mode"]:checked'), basisEl = q('input[name="lb-basis"]:checked'), namesEl = q('input[name="lb-names"]:checked');
    var topNEl = q('#opt-topn'), absDaysEl = q('#opt-absdays');
    var payload = {
      className: cls,
      lb: {
        mode: modeEl ? modeEl.value : 'off',
        basis: basisEl ? basisEl.value : 'xp',
        names: namesEl ? namesEl.value : 'codename',
        topN: parseInt(topNEl ? topNEl.value : '0', 10) || 0
      },
      absDays: parseInt(absDaysEl.value, 10) || 5,
      pairing: { on: (function () { var el3 = q('input[name="pair-on"]:checked'); return el3 ? Number(el3.value) : 1; })() },
      tn: { mode: (function () { var el4 = q('input[name="tn-mode"]:checked'); return el4 ? el4.value : 'team'; })() }
    };
    btn.disabled = true;
    var status = q('#options-status');
    busyStatus(status, 'Saving');
    adminCall('setConfig', payload).then(function (r) {
      btn.disabled = false;
      plainStatus(status, (r && r.ok) ? 'Saved.' : 'Could not save -- please try again.');
    });
  }

  /* ============================================================
     COVER tab (Cover Mode, decision D3)
     ============================================================ */
  function renderCover() {
    requireClass(function () {
      setPane(busyHtml('Loading Cover Mode'));
      adminCall('dashboard', { className: cls }).then(function (r) {
        if (!r || !r.ok) { setPane(errorHtml('Could not load Cover Mode for this class.')); return; }
        dashData = r; year = r.year || year;
        loadManifestForActiveClass().then(function (man) {
          if (!man) { setPane(errorHtml('Could not load the lesson list.')); return; }
          renderCoverPane(man);
        });
      });
    });
  }


  function removePupil(btn) {
    var email = btn.getAttribute('data-email'), name = btn.getAttribute('data-name');
    App.confirm('Remove ' + name + ' from this class?',
      'Her shared class record (progress the dashboard shows) is deleted. Her own private work is untouched, and she can rejoin from the class link.',
      'Remove', function (yes) {
        if (!yes) return;
        adminCall('removePupil', { className: cls, email: email }).then(function (r) {
          if (r && r.ok) renderLive(); else plainStatus(q('#live-status'), 'Could not remove -- please try again.');
        });
      });
  }

  function undeliveredLessons(man) {
    var locks = dashData.locks || {};
    // side quests are self-paced extras, never a cover lesson
    return (man.lessons || []).filter(function (le) { var lk = locks[String(le.num)]; return !le.side && !(lk && Number(lk.u)); })
      .sort(function (a, b) { return a.num - b.num; });
  }
  function pickSuggestion(list) {
    // Cover Mode only ever offers READY lessons (review finding: delivering an
    // unauthored lesson creates a dead-end for pupils under cover).
    var ready = list.filter(function (le) { return le.status === 'ready'; });
    return ready.length ? ready[0] : null;
  }

  function renderCoverPane(man) {
    var coverOn = Number(dashData.cfg.cover) === 1;
    if (coverOn) {
      if (!coverActiveLesson && dashData.cfg.coverLesson) {
        // server records the cover lesson (cfg.coverLesson) so the sheet survives reloads
        var storedLe = (man.lessons || []).filter(function (le) { return le.id === dashData.cfg.coverLesson; })[0];
        if (storedLe) coverActiveLesson = storedLe;
      }
      if (coverActiveLesson) { renderCoverSheet(coverActiveLesson); return; }
      setPane('<p class="staff-status">Cover Mode is currently ON for this class.</p>' +
        '<div class="confirm-actions" style="justify-content:flex-start">' +
          '<button type="button" class="ghost-btn danger" data-action="cover-end">End Cover Mode</button>' +
        '</div><p class="staff-status" id="cover-status"></p>');
      return;
    }

    var undelivered = undeliveredLessons(man);
    if (!undelivered.length) { setPane('<p class="staff-status">All lessons have already been delivered to this class.</p>'); return; }

    var suggestion = pickSuggestion(undelivered);
    var warning = '';
    if (suggestion && suggestion.coverSuitability === 'sensitive') {
      var alt = pickSuggestion(undelivered.filter(function (le) { return le.coverSuitability !== 'sensitive'; }));
      warning = '<div class="staff-warn"><b>Lesson ' + suggestion.num + ' (' + App.esc(suggestion.title) + ') is discussion-led and should wait for the class&rsquo;s own teacher.</b>' +
        (alt ? (' Suggesting Lesson ' + alt.num + ' instead.') : ' No other lesson is ready to suggest yet.') + '</div>';
      suggestion = alt;
    }
    undelivered = undelivered.filter(function (le) { return le.status === 'ready'; });
    if (!undelivered.length) { setPane('<p class="staff-status">No cover-ready lessons are left undelivered for this class. Cover can revisit an already-delivered lesson from the pupils&rsquo; Mission Control instead.</p>'); return; }
    if (!coverPick || !undelivered.some(function (le) { return le.id === coverPick; })) coverPick = suggestion ? suggestion.id : undelivered[0].id;

    var options = undelivered.map(function (le) {
      var tag = le.coverSuitability === 'sensitive' ? ' (discussion-led -- caution)' : (le.status !== 'ready' ? ' (content coming)' : '');
      return '<option value="' + App.esc(le.id) + '"' + (le.id === coverPick ? ' selected' : '') + '>Lesson ' + le.num + ' -- ' + App.esc(le.title) + tag + '</option>';
    }).join('');
    var pickedLe = undelivered.filter(function (le) { return le.id === coverPick; })[0];
    var noteHtml = (pickedLe && pickedLe.coverNote) ? '<p class="staff-lead">' + App.esc(pickedLe.coverNote) + '</p>' : '';

    var html = warning +
      (suggestion ? ('<p class="staff-lead">Suggested: Lesson ' + suggestion.num + ' -- ' + App.esc(suggestion.title) + '</p>') : '') +
      '<select id="cover-pick" class="staff-select">' + options + '</select>' +
      noteHtml +
      '<div class="confirm-actions" style="justify-content:flex-start;margin-top:12px">' +
        '<button type="button" class="primary-btn" data-action="cover-start">Start Cover Mode</button>' +
      '</div>' +
      '<p class="staff-status" id="cover-status"></p>';
    setPane(html);
  }

  function coverStart(btn) {
    if (btn.disabled) return;
    var lessonId = coverPick;
    var man = manifestCache[year] || {};
    var le = (man.lessons || []).filter(function (l) { return l.id === lessonId; })[0];
    if (!le) return;
    btn.disabled = true;
    var status = q('#cover-status');
    busyStatus(status, 'Starting Cover Mode');
    adminCall('setLock', { className: cls, lessonNum: le.num, on: 1 }).then(function (r1) {
      if (!r1 || !r1.ok) { btn.disabled = false; plainStatus(status, 'Could not unlock the lesson -- please try again.'); return; }
      adminCall('setCover', { className: cls, on: 1, lessonId: lessonId }).then(function (r2) {
        btn.disabled = false;
        if (!r2 || !r2.ok) { plainStatus(status, 'The lesson unlocked, but Cover Mode could not be started -- please try again.'); return; }
        coverActiveLesson = le;
        dashData.cfg.cover = 1;
        renderCoverSheet(le);
      });
    });
  }

  /* THE COVER SHEET STANDARD (Damien, 30 Jul 2026): a covering teacher is NOT
     expected to teach. She reads a handful of lines aloud and gets back to her
     own marking. Carry on with Lesson X, it has been unlocked, what to do if a
     pupil is stuck, what to do if the room goes wrong - and nothing else. No
     lesson content, no chunk lists, no platform jargon. Under a minute aloud. */
  function renderCoverSheet(le) {
    var link = App.classLink(cls);
    var label = le.side ? 'the short extra lesson called &ldquo;' + App.esc(le.title) + '&rdquo;' : 'Lesson ' + le.num + ' &mdash; ' + App.esc(le.title);
    var html = '<div class="cover-sheet">' +
      '<h3>' + App.esc(cls) + ' &middot; DT cover &middot; ' + label + '</h3>' +
      '<h4>Read this to the class</h4><ol>' +
        '<li>&ldquo;Your DT lesson today is ' + label + '. It is unlocked and waiting for you, and it gives you every instruction on screen.&rdquo;</li>' +
        '<li>&ldquo;Open the class link &mdash; it is on your bookmarks bar and on Google Classroom &mdash; and carry on from wherever you are.&rdquo;</li>' +
        '<li>&ldquo;If you are stuck, press the round ? button on your screen, then quietly ask the person beside you.&rdquo;</li>' +
        '<li>&ldquo;If your computer misbehaves, share with the person beside you &mdash; nothing is lost, the website keeps your place.&rdquo;</li>' +
      '</ol>' +
      '<h4>For you</h4>' +
      '<p>That is the whole job &mdash; the lesson runs itself and you are not expected to teach it. ' +
      'If the room loses the internet, have them turn their screens off and get on with quiet work; nobody&rsquo;s progress is harmed. ' +
      'Anything odd, jot it down for the class&rsquo;s own teacher.</p>' +
      (le.coverNote ? ('<p class="staff-lead">' + App.esc(le.coverNote) + '</p>') : '') +
      '<p>Class link (pupils normally use their bookmark): <a href="' + App.esc(link) + '" target="_blank" rel="noopener">' + App.esc(link) + '</a></p>' +
      '<canvas id="cover-qr-canvas"></canvas>' +
      '<div class="confirm-actions">' +
        '<button type="button" class="ghost-btn" data-action="cover-print">Print this sheet</button>' +
        '<button type="button" class="ghost-btn danger" data-action="cover-end">End Cover Mode</button>' +
      '</div></div>' +
      '<p class="staff-status" id="cover-status"></p>';
    setPane(html);
    var canvas = q('#cover-qr-canvas');
    if (global.QRCode && global.QRCode.toCanvas && canvas) {
      global.QRCode.toCanvas(canvas, link, { width: 200, margin: 2, color: { dark: '#1A3A6B', light: '#ffffff' } }, function () {});
    }
  }

  /* Print CSS for the standalone sheet. Deliberately plain: this page is not
     the app, it is a document a covering teacher reads or a PDF that gets
     emailed, so it wants black-on-white and nothing else. ASCII only - the
     builder rejects anything else. */
  var COVER_PRINT_CSS =
    'body{font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
      'color:#17223B;margin:28px auto;max-width:720px;padding:0 18px}' +
    'h3{color:#1A3A6B;font-size:1.25rem;margin:0 0 14px;border-bottom:3px solid #E4B824;padding-bottom:8px}' +
    'h4{color:#1A3A6B;font-size:1rem;margin:20px 0 6px}' +
    'ol{margin:0 0 4px 18px;padding:0}li{margin-bottom:7px}' +
    'p{margin:0 0 10px}' +
    'a{color:#1A3A6B;word-break:break-all}' +
    'img.qr{display:block;margin:10px 0 0}' +
    '@media print{body{margin:12mm auto;max-width:none}a{text-decoration:none}}';

  /* DAMIEN, 1 Aug 2026 (live, v9): the print box opened but the app went BLANK
     behind it, whichever button he chose. Cause: this called print() on the
     app's OWN document, and that document lives inside Apps Script's sandboxed
     iframe - Safari tears it down when the print job ends, taking the staff
     panel with it. So the app is never printed now. The sheet is rebuilt as a
     small standalone page in its own tab (the sandbox carries
     allow-popups-to-escape-sandbox, which is how the brief's deck links already
     open), which also prints far better: no panel chrome, no dark shell, and a
     sensible filename when the teacher chooses Save as PDF. */
  /* ONE printing path for both the cover sheet and the teacher brief.
     Rebuilds the chosen part of the panel as a small standalone page in its own
     tab, and prints THAT. The app is never printed. */
  function printStandalone(sourceEl, title, statusEl) {
    if (!sourceEl) return;
    var clone = sourceEl.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('.confirm-actions, button, .staff-status'), function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    /* a cloned <canvas> is blank - carry the QR across as a real image */
    var srcCanvases = sourceEl.querySelectorAll('canvas');
    var dstCanvases = clone.querySelectorAll('canvas');
    for (var i = 0; i < dstCanvases.length; i++) {
      if (!srcCanvases[i] || !dstCanvases[i].parentNode) continue;
      var img = document.createElement('img');
      img.className = 'qr';
      img.width = 200; img.height = 200;
      try { img.src = srcCanvases[i].toDataURL('image/png'); } catch (e) {}
      dstCanvases[i].parentNode.replaceChild(img, dstCanvases[i]);
    }

    var win = null;
    try { win = global.open('', '_blank'); } catch (e) { win = null; }
    if (!win || !win.document) {
      plainStatus(statusEl, 'Your browser blocked the new tab. Allow pop-ups for this page and press the ' +
        'print button again -- it opens in its own tab, and you print or save it as a PDF from there.');
      return;
    }
    win.document.open();
    win.document.write('<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8">' +
      '<title>' + App.esc(title) + '</title><style>' + COVER_PRINT_CSS + '</style></head><body>' +
      clone.innerHTML + '</body></html>');
    win.document.close();
    try { win.focus(); } catch (e) {}
    /* let images decode before the print box freezes the page */
    global.setTimeout(function () { try { win.print(); } catch (e) {} }, 600);
    plainStatus(statusEl, 'It has opened in its own tab, with the print box ready -- choose your printer, ' +
      'or Save as PDF to send it on. This panel stays exactly as it was.');
  }

  /* DAMIEN, 1 Aug 2026 (live, v9): the print box opened but the app went BLANK
     behind it, whichever button he chose. Cause: this called print() on the
     app's OWN document, and that document lives inside Apps Script's sandboxed
     iframe - Safari tears it down when the print job ends, taking the staff
     panel with it. The harness then found the teacher brief's Print button had
     exactly the same fault, which he had not reached yet. */
  function coverPrint() {
    var le = coverActiveLesson || {};
    var name = le.side ? String(le.title || 'Side Quest')
      : ('Lesson ' + (le.num || '') + ' ' + String(le.title || ''));
    printStandalone(q('.cover-sheet'), cls + ' - DT cover - ' + name.trim(), q('#cover-status'));
  }

  function coverEnd(btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    var status = q('#cover-status');
    busyStatus(status, 'Ending Cover Mode');
    adminCall('setCover', { className: cls, on: 0, lessonId: coverActiveLesson ? coverActiveLesson.id : '' }).then(function (r) {
      btn.disabled = false;
      if (!r || !r.ok) { plainStatus(status, 'Could not end Cover Mode -- please try again.'); return; }
      dashData.cfg.cover = 0;
      coverActiveLesson = null;
      renderCover();
    });
  }

  /* ============================================================
     GUIDE tab (DFM 116, approved wording 1 Aug 2026)
     The reference for the TOOLS. Lesson teaching stays in each lesson's Brief -
     that separation is the whole reason the briefs stayed text (his ruling).
     Every button name here is verbatim from the panel above, every number is
     read from the code that enforces it (15-minute lock, 7-day chat sweep,
     28-day detail sweep, 70% storage warning, 16-item baseline, 5 school days),
     because rule 17 applies to staff-facing writing too.
     ============================================================ */
  var GUIDE_VIDEO = 'assets/video/guide/guide-tour.mp4';
  /* Measured from the finished film after assembly; qa-guide fails the build if
     this and chapters.json ever disagree (rule 35 - the claim must match). */
  var GUIDE_LENGTH = 'about twenty-one and a half minutes';

  function renderGuide() {
    // the HoD flag rides on the classes register; fetch it once if unseen
    if (!classesData) {
      setPane(busyHtml('Loading the guide'));
      adminCall('classes').then(function (r) {
        if (r && r.ok) classesData = r;
        renderGuideBody();
      });
      return;
    }
    renderGuideBody();
  }

  function renderGuideBody() {
    var isHod = !!(classesData && Number(classesData.isHod));
    var archiveUrl = (classesData && classesData.archiveUrl) || '';
    var vid = App.asset(GUIDE_VIDEO);

    var html =
      '<p class="staff-lead">This tab is the reference for the teacher tools themselves &mdash; where ' +
      'everything is and what each button does. Guidance for teaching a particular lesson lives with ' +
      'that lesson: Lessons tab &rarr; Brief.</p>' +

      /* The running time is measured from the finished file (chapters.json),
         not estimated - rule 35 applies to the staff side too. */
      /* The running time is measured from the finished film (chapters.json) and
         pinned by qa-guide, so the wording can never drift from the file. */
      '<h3>The tour &mdash; ' + GUIDE_LENGTH + ', no sound</h3>' +
      '<p class="staff-row-meta">A silent walkthrough of every tab, filmed on a practice class of ' +
      'made-up pupils, so what you see is exactly what the tools look like with a real class in them. ' +
      'Captions on the film say what is happening as it happens, and the buttons underneath jump ' +
      'straight to the chapter you need.</p>' +
      '<video class="guide-video" id="guide-video" controls preload="none" playsinline src="' + App.esc(vid) + '"></video>' +
      /* The copy promises you can jump straight to the chapter you need, so these
         are real controls, not a list of names. Times come from the video's
         own chapters.json, written by the assembler - so a re-cut film cannot
         leave the buttons pointing at the wrong minute. */
      '<p class="staff-row-meta guide-chapters" id="guide-chapters">Chapters: Classes &middot; Lessons &middot; ' +
      'Live &middot; Live: flags &middot; Absence &middot; Teams &middot; Options &middot; Cover</p>' +

      '<h3>Quick reference, tab by tab</h3>' +
      '<div class="guide-ref">' +

      '<h4>Classes</h4><p>This is where classes are created and where their links live. Each class you ' +
      'own has a row. <b>Copy link</b> copies the address your pupils open &mdash; post it on your ' +
      'class&rsquo;s Google Classroom, and it will bring each pupil straight into your class with nothing ' +
      'to type. <b>QR</b> shows the same link as a code you can put on the projector instead. ' +
      '<b>Select</b> points every other tab at that class &mdash; Lessons, Live, Absence, Teams, Options ' +
      'and Cover all work on whichever class you have selected here. To create a class, type a name your ' +
      'pupils will recognise, choose the year group, and press <b>Add class</b>. <b>Delete</b> asks you ' +
      'twice before it does anything, and only a class&rsquo;s own teacher sees the button. The storage ' +
      'and archive lines at the bottom of this tab are explained under Worth knowing, below.</p>' +

      '<h4>Lessons</h4><p>One cell for every lesson of the year, for the selected class. Click a cell to ' +
      'unlock that lesson &mdash; until you do, pupils see a padlock on it &mdash; and click it again to ' +
      'lock it; locking never removes anyone&rsquo;s work, it only stops somebody new from starting. ' +
      '<b>Brief</b> opens that lesson&rsquo;s full run sheet: what the pupils will do, how to prepare, and ' +
      'how to run the hour. <b>Start again</b> puts the whole class back to the start of a lesson &mdash; ' +
      'it always asks before doing anything, and on Lesson 1 it also clears codenames, because Lesson 1 is ' +
      'where codenames are made. <b>&#8634; Not taught</b> appears on a lesson that is locked but still ' +
      'carries a delivered date: click it if you unlocked something by accident, and nobody will later be ' +
      'flagged absent from a lesson that never actually ran.</p>' +

      '<h4>Live</h4><p>The during-the-hour view &mdash; this is the tab to keep open while your class ' +
      'works. It shows <b>one lesson at a time</b>: pick which one with the <b>Showing</b> menu at the ' +
      'top, and it opens on the newest lesson you have unlocked, which on a teaching day is the lesson in ' +
      'front of you. Everything on the tab &mdash; the panels, the table, the misconception bars at the ' +
      'bottom &mdash; belongs to the lesson named beside Showing.</p>' +
      '<p>The table has one row per pupil. <b>XP</b> is the points a pupil earns for finishing the ' +
      'sections of each lesson (the badges), added up across the whole year; it is private &mdash; nobody ' +
      'is ranked unless you deliberately choose that in Options. <b>Baseline</b> is her September Licence ' +
      'Exam score, out of sixteen, kept so you can show progress by June. <b>Progress</b> says whether she ' +
      'has not started, started or finished the lesson you are viewing. <b>Warm-up</b> is her score on the ' +
      'quick recap questions this lesson opens with &mdash; they ask about earlier lessons, so a low score ' +
      'here usually means last fortnight&rsquo;s idea needs another airing. The <b>Q columns</b> are her ' +
      'marked answers to this lesson&rsquo;s exit check, question by question &mdash; the legend under the ' +
      'table quotes what each question asked, and the key beside it explains every symbol, including the ' +
      'difference between a wrong answer and no answer at all. Lessons that close with a build-the-code ' +
      'puzzle add a <b>Build puzzle</b> column beside the questions &mdash; one tick or cross for whether ' +
      'the pupil&rsquo;s rebuilt program was right.</p>' +
      /* DFM 191b: taught here as well as in the on-screen legend, because a
         teacher meeting the tab for the first time reads the Guide, and a
         teacher mid-lesson reads the legend (138.4 - patient completeness). */
      '<p>Some lessons spend most of the hour inside a single big activity, and those get a column of ' +
      'their own, named after the activity itself. In Lesson 4 it is <b>The Case Board</b>, and the ' +
      'number is how many of the four broken-game cases that pupil has closed &mdash; a case only closes ' +
      'once she has written her case log and re-played the game to watch the bug not happen. In Lesson 5 ' +
      'it is <b>The Studio Sprint</b>, and the number is how many of the four QA tests her own game has ' +
      'passed; she cannot open her doors at Press Night until all four are green. Green means finished, ' +
      'amber means part way, grey means nothing yet, and a dash means she has not started that activity ' +
      'at all. <b>Hover any of these numbers</b> and you get the whole story in a sentence or two: ' +
      'whether her case stamps were gold (solved unaided) or silver (she took HQ&rsquo;s clue, which is ' +
      'still a closed case), whether the fixed game reached her Drive, whether a QA test failed and was ' +
      'then fixed, and whether she took the stretch job. Two of those are worth reading generously: a ' +
      'test that failed first and passed later is QA working exactly as it should, and a game tagged ' +
      '<b>IN BETA</b> is a pupil who ran out of time and exhibited anyway, which is what real studios do. ' +
      'This column is the answer to &ldquo;what is my class actually doing right now?&rdquo; during the ' +
      'longest part of either hour.</p>' +
      '<p>The <b>How did it go?</b> columns are different: they are the pupil&rsquo;s own words, not ' +
      'marks. At the end of every lesson she rates herself against three I-can statements, says whether ' +
      'the hour felt easy, just right or tricky, and can leave you a private comment, which comes to you ' +
      'and nobody else. The quiet pupils often say there what they would not say in the room. Hover over ' +
      'a clipped comment to read all of it, and <b>Copy CSV</b> keeps every comment for your records.</p>' +
      '<p>A red <b>needs you</b> flag appears beside a pupil when her numbers say something went wrong, ' +
      'and hovering over the flag tells you exactly what: under half her exit answers were right; or under ' +
      'half her warm-up answers were right; or she started the lesson and nothing new has been saved for ' +
      'over twenty minutes. Each one points at a different kind of help. Wrong exit answers are a gap in ' +
      'this lesson&rsquo;s idea &mdash; the Q columns show which questions, and the misconception bars at ' +
      'the bottom show which wrong answers she chose and the misunderstandings they usually signal: that ' +
      'is the thing to re-teach. A low warm-up score means an earlier lesson&rsquo;s idea has faded, because the ' +
      'warm-up asks about past lessons. No activity means she is stuck right now, mid-lesson &mdash; that ' +
      'one is a visit, not a re-teach. When you have dealt with a flag, click it, then click again to ' +
      'confirm: it becomes a quiet grey <b>helped</b>, the row stops being highlighted, and the tab goes ' +
      'back to showing only what is outstanding. Hovering the grey flag remembers the day you marked it, ' +
      'and clicking it twice brings the red back if you change your mind. The marks that raised it never ' +
      'change &mdash; only the flag quietens. Red returns by itself only if the pupil works on that lesson ' +
      'again and gets stuck again. Stuck-spotting watches every delivered lesson, not just the one on ' +
      'screen: a pupil struggling in lessons you are not viewing is named in a line above the table, ' +
      'with every such lesson &mdash; click one to jump straight to it &mdash; so ' +
      'choosing a lesson can never hide a pupil who needs help.</p>' +
      '<p>The amber <b>says not yet</b> flag is different: it is not the platform&rsquo;s judgement, it is ' +
      'the pupil&rsquo;s own. She ends every lesson rating herself against its I-can statements, and ' +
      'pressing <b>Not yet</b> on one raises this flag &mdash; she is telling you, in the only place many ' +
      'pupils ever will, that there is something she cannot do yet. Hover over the flag and it names the ' +
      'exact statement, which is the gap to close; her private comment, if she left one, often says more. ' +
      'When you have listened and responded, click the flag twice and it becomes a quiet grey <b>heard</b> ' +
      '&mdash; her ratings and comment stay exactly as she wrote them. ' +
      'The <b>say not yet</b> count at the top of the lesson&rsquo;s results shows how many pupils are ' +
      'saying it before you read a single row &mdash; and when half the class says it, the message is ' +
      'about the lesson, not the pupils: re-teach that idea from the front. The two flags work together: ' +
      'red is what the marks say, amber is what she says. Both on one row means everything agrees she ' +
      'needs help. Red alone is a pupil struggling without saying so. Amber with good marks is a pupil who ' +
      'can do it but does not believe it yet &mdash; the first needs teaching, the second needs ' +
      'reassuring. And a <b>Tricky</b> dot with no flags beside it simply says the hour cost effort ' +
      '&mdash; effort is not a problem; if anything it is worth a word of praise.</p>' +
      '<p><b>Refresh</b> re-reads the table; it does not update by itself. <b>Copy CSV</b> copies every ' +
      'pupil and every delivered lesson &mdash; the whole marksheet, not just the lesson on screen &mdash; ' +
      'one row per pupil, ready to paste into Excel or Google Sheets. Its columns match this table: for ' +
      'every lesson &mdash; progress, the exit-check score, the build puzzle, the pupil&rsquo;s own ' +
      'ratings in the same marks as the key above, how the hour felt in words, and her private comment. ' +
      'Your own practice runs of a lesson never appear in the table: it lists pupils only.</p>' +
      '<p>Some lessons grow an extra panel above the table, and only the lessons that use them: while a ' +
      '<b>paired</b> activity is running, the Pairing panel appears and updates itself every few seconds ' +
      '&mdash; who is waiting for a partner (<b>Solo run</b> releases a waiting pupil to work alone), who ' +
      'is paired with whom (codenames first, real names in brackets), how many messages each pair has ' +
      'sent, and <b>Channel</b>, which opens the pair&rsquo;s chat so you can read every message. If the ' +
      'class has an odd number, the platform holds the last three pupils and puts them in one Vault ' +
      'together, so nobody is left partnerless by accident. <b>Match everyone waiting now</b> pairs the ' +
      'whole queue at once, and <b>Reset pairing</b> &mdash; which asks twice &mdash; releases every pair ' +
      'to finish alone; released pairs cannot be re-paired. A lesson with a class tournament shows its ' +
      '<b>Tournament view</b> launch row here, and Lesson 5&rsquo;s Press Night gallery brings its own ' +
      'review panel.</p>' +
      '<p><b>Misconception patterns</b>, at the bottom, follows the same Showing menu: for each exit-check ' +
      'question of the lesson you are viewing, it shows which wrong answers the class actually chose ' +
      '&mdash; each one labelled with the misunderstanding it usually signals, so you know what to ' +
      're-teach and to whom. On Lesson 1 one more panel sits underneath: <b>The Licence Exam</b>, ' +
      'question by question &mdash; which answers the class chose in September, with the correct answer ' +
      'named on each. Hover over a pupil&rsquo;s Baseline score in the table to see which question ' +
      'numbers she got wrong.</p>' +

      '<h4>Absence</h4><p>A short list that is usually empty &mdash; and that is the good news it is ' +
      'designed to give you. A pupil appears here when a delivered lesson still has no meaningful work ' +
      'from them after five school days (you can change the number of days in Options). It is a private ' +
      'nudge for you to check in &mdash; perhaps the pupil was absent, perhaps stuck, perhaps avoiding it. ' +
      'Pupils never see this list, and it is not an attendance record. Once you know the story, ' +
      '<b>Dismiss flag</b> clears it.</p>' +

      '<h4>Teams</h4><p>Optional groups, used by the tournament lessons and by the hidden-teams ' +
      'leaderboard in Options. Click any pupil&rsquo;s name chip and a small menu appears for moving them ' +
      'into a team; <b>Add team</b> creates a team with a name you choose, and <b>Auto-make N teams</b> ' +
      'splits the class into that many even teams in one press. Each team&rsquo;s XP total updates by ' +
      'itself as its pupils earn points. The tick-box <b>&ldquo;Pupils can see who is in their team&rdquo;' +
      '</b> stays unticked until you decide otherwise &mdash; while it is off, pupils can be shown their ' +
      'team&rsquo;s total without knowing who else is in the team, which is exactly what the tournament ' +
      'lessons use for their big reveal.</p>' +

      '<h4>Options</h4><p>There are four choices you can make for each of your classes &mdash; these ' +
      'options apply to the class you currently have selected on the Classes tab, they take effect as soon ' +
      'as you save, and each lasts until you change it back. The <b>Save</b> button at the bottom saves all ' +
      'of your choices at once.</p>' +
      '<p><b>Leaderboard</b> decides who can see whose progress, and it is one setting for the whole class ' +
      'across the whole year &mdash; it is not something you set per lesson. <i>Private</i>, the default, ' +
      'means each pupil sees only their own progress; this is the right setting for most of the year, ' +
      'because the platform&rsquo;s promise to pupils is that XP stays between them and their teacher. ' +
      '<i>Hidden teams</i> is for competing as groups without exposing anybody: once you have made teams ' +
      'on the Teams tab, each pupil&rsquo;s home page shows their team&rsquo;s name and total XP but not ' +
      'who is in it &mdash; and the unmasking is yours to control, on the Teams tab or at a ' +
      'tournament&rsquo;s reveal. <i>Public board</i> puts a ranked class board at the top of every ' +
      'pupil&rsquo;s home page &mdash; whole-year totals, counted by XP or by lessons completed, named by ' +
      'codename or by real first name, showing the top few or everyone; those choices appear underneath ' +
      'when you pick it. Use it deliberately: if you know a class that would thrive on a fortnight of open ' +
      'competition, switch it on for the fortnight &mdash; and when you switch it back, the board ' +
      'disappears at once. (A pupil who has not earned a codename yet is listed by her first name, so no ' +
      'two rows ever look the same.)</p>' +
      '<p><b>Auto-pairing</b> decides how paired activities (like Lesson 1&rsquo;s Vault) find each pupil ' +
      'a partner. On, the default, the platform matches pupils across different machines and gives each ' +
      'pair the monitored chat channel. Off, paired activities run shoulder-to-shoulder instead: two ' +
      'pupils share one machine and talk in person &mdash; useful if your room&rsquo;s layout suits it, or ' +
      'you want a quieter hour.</p>' +
      '<p><b>Tournament reveal</b> decides what the projector shows at the end of a tournament lesson ' +
      '(Lesson 3&rsquo;s Reaction Rally is the first): team totals only, so no individual pupil is named ' +
      'in front of the class &mdash; or, as a deliberate choice, the ranked pair scores with pupils&rsquo; ' +
      'full names after the team bars.</p>' +
      '<p><b>Absence window</b> is the number of school days before a pupil with no meaningful work on a ' +
      'delivered lesson appears on the Absence tab. With the default of five, a pupil who missed ' +
      'Tuesday&rsquo;s lesson and still has nothing a week later is flagged.</p>' +

      '<h4>Cover</h4><p>For the day you are absent and a colleague is covering your class. The tab ' +
      'suggests the next lesson that is ready to run &mdash; steering around discussion-led lessons, which ' +
      'wait for you &mdash; and <b>Start Cover Mode</b> does the rest in one press: it unlocks the chosen ' +
      'lesson and writes the cover sheet, a few lines the covering teacher reads aloud to the class. A ' +
      'covering teacher is not expected to teach the lesson; the sheet says so, and it waits on this tab ' +
      'for whoever opens the panel. <b>Print this sheet</b>, on the sheet itself, opens the sheet in its own ' +
      'tab with the print box already up &mdash; choose your printer, or Save as PDF for a copy you can ' +
      'send digitally. The panel behind it is left exactly as it was. <b>End Cover Mode</b> when you are ' +
      'back.</p>' +
      '</div>' +

      '<h3>Worth knowing</h3>' +
      '<div class="guide-ref">' +
      '<h4>The pace</h4><p>Every button in these tools talks to Google&rsquo;s servers, so most presses ' +
      'take a second or two, with a spinner naming what is happening (&ldquo;Loading the live ' +
      'dashboard&rdquo;, for example). That is the tools working, not failing &mdash; pressing again does ' +
      'not hurry it.</p>' +

      '<h4>The panel locks itself</h4><p>Closing this panel, or leaving it untouched for fifteen minutes, ' +
      'locks it again &mdash; you will be asked for the passcode next time. That is protection rather than ' +
      'nuisance: the panel shows answer keys, every pupil&rsquo;s name and email, and every chat ' +
      'transcript, and it is often opened on a machine pupils use. The passcode comes from the Head of ' +
      'Department.</p>' +

      '<h4>Storage and the nightly archive</h4><p>The storage line at the bottom of the Classes tab shows ' +
      'the platform&rsquo;s own filing space, which the whole school shares; it turns red once it passes ' +
      '70% full. A sweep runs automatically every night between 2 and 3am: chat transcripts older than a ' +
      'week, and the fine detail of lessons finished more than four weeks ago, move into an archive ' +
      'spreadsheet &mdash; it copies first, checks the copy, and only then trims. <b>Run archive sweep ' +
      'now</b> does the same on demand. Any teacher can press it, but only the Head of Department&rsquo;s ' +
      'account can complete it, and anyone else simply gets a message saying so.</p>' +

      '<h4>What lives where</h4><p>The live-presence counts on the pairing panel fade within minutes of a ' +
      'pupil closing the site. Progress, XP, baseline and exit results stay for the whole year. Pair chats ' +
      'stay readable in Channel for a week before they move to the archive.</p>' +

      '<h4>Google&rsquo;s permission screens</h4><p>The first time anyone &mdash; teacher or pupil &mdash; ' +
      'opens the site, Google asks once for permission, starting with a screen that says Unverified in ' +
      'red. That is expected: Google says it about anything a school builds for itself. The Lesson 1 slide ' +
      'deck walks a class through the four presses with real pictures, and the Lesson 1 brief covers them ' +
      'under Preparing.</p>' +

      '<h4>The Head of Department</h4><p>can manage every class, including unlocking a lesson on behalf of ' +
      'a colleague who is off sick. So if a lock changed and you did not change it, that is who.</p>' +
      '</div>' +

      (isHod ? guideHodHtml(archiveUrl) : '');

    setPane(html);
    wireGuideChapters();
  }

  /* Replaces the plain chapter line with seek buttons once the manifest loads.
     If it cannot load (offline, or the file missing), the written list stays
     exactly as it is - the tab never ends up with dead controls. */
  function wireGuideChapters() {
    var slot = q('#guide-chapters');
    if (!slot) return;
    fetch(App.asset('assets/video/guide/chapters.json'), { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (man) {
        var here = q('#guide-chapters');
        if (!here || !man || !man.chapters || !man.chapters.length) return;
        var jumps = man.chapters.filter(function (c) { return !/^opening$/i.test(c.label); });
        here.innerHTML = 'Jump to: ' + jumps.map(function (c) {
          return '<button type="button" class="guide-chip" data-action="guide-seek" data-t="' +
            Number(c.t) + '">' + App.esc(c.label) + '</button>';
        }).join('');
      })
      .catch(function () { /* keep the written list */ });
  }

  function guideSeek(btn) {
    var v = q('#guide-video');
    if (!v) return;
    v.currentTime = Number(btn.getAttribute('data-t')) || 0;
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked: the seek still happened */ });
  }

  function guideHodHtml(archiveUrl) {
    return '<div class="guide-hod">' +
      '<h3>Head of Department</h3>' +
      '<p class="staff-lead">Only members of the Head of Department register can see this section.</p>' +
      '<p><b>Training-day presentation</b> &mdash; nothing here yet. When the presentation is built, its ' +
      'link will live here.</p>' +
      (archiveUrl
        ? ('<p><b>The archive spreadsheet</b> &mdash; where the nightly sweep files older detail: ' +
           '<a href="' + App.esc(archiveUrl) + '" target="_blank" rel="noopener">KS3 DT - Yearly Archive</a></p>')
        : ('<p><b>The archive spreadsheet</b> &mdash; not set up yet. Run <b>setupArchive</b> once in the ' +
           'Apps Script editor and its link will appear here.</p>')) +
      '</div>';
  }

  /* ============================================================
     event delegation (wired once; #staff-body's innerHTML is freely replaced)
     ============================================================ */
  function onClick(e) {
    touch();
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    switch (btn.getAttribute('data-action')) {
      case 'gate-go': gateGo(btn); break;
      case 'switch-tab': curTab = btn.getAttribute('data-tab'); renderPanel(); break;
      case 'copy-link': App.copyText(App.classLink(btn.getAttribute('data-class'))); break;
      case 'show-qr': showQr(btn.getAttribute('data-class')); break;
      case 'select-class': cls = btn.getAttribute('data-class'); year = btn.getAttribute('data-year') || year; liveLessonNum = ''; renderClassesFromCache(); break;
      case 'delete-class': deleteClass(btn); break;
      case 'add-class': addClass(); break;
      case 'toggle-lock': toggleLock(btn); break;
      case 'undo-delivery': undoDelivery(btn); break;
      case 'reset-lesson': resetLesson(btn); break;
      case 'show-brief': showBrief(btn); break;
      case 'brief-back': renderLessons(); break;
      case 'brief-print': briefPrint(); break;
      case 'archive-now': archiveNow(btn); break;
      case 'flag-toggle': flagToggle(btn); break;
      case 'strip-jump': stripJump(btn); break;
      case 'live-refresh': renderLive(); break;
      case 'live-csv': liveCsv(btn); break;
      case 'absence-dismiss': absenceDismiss(btn); break;
      case 'team-chip': openChipMenu(btn); break;
      case 'team-add-group': teamAddGroup(); break;
      case 'team-auto': teamAuto(btn); break;
      case 'team-del-group': teamDelGroup(btn); break;
      case 'options-save': optionsSave(btn); break;
      case 'guide-seek': guideSeek(btn); break;
      case 'cover-start': coverStart(btn); break;
      case 'cover-print': coverPrint(); break;
      case 'remove-pupil': removePupil(btn); break;
      case 'cover-end': coverEnd(btn); break;
      case 'pair-release': pairRelease(btn); break;
      case 'pair-force': pairForce(btn); break;
      case 'pair-reset': pairReset(btn); break;
      case 'pair-view': pairView(btn); break;
      case 'tourney-open': tourneyOpen(btn.getAttribute('data-lesson')); break;
      case 'gallery-remove': galleryRemove(btn); break;
      case 'gallery-hide-studio': galleryHideStudio(btn); break;
    }
  }

  function onChange(e) {
    touch();
    var t = e.target;
    if (t.id === 'cls-showall') { showAllTeachers = t.checked; renderClassesFromCache(); return; }
    /* one picker, whole tab (DFM 156a): re-paint from the dashboard we already
       hold - changing the lesson he is looking at must not cost a round trip */
    if (t.id === 'live-lesson-sel') { liveLessonNum = t.value; paintLiveLoading(liveLessonNum); renderLiveTable(); return; }
    if (t.name === 'lb-mode') { var pub = q('#opt-public'); if (pub) pub.hidden = (t.value !== 'public'); return; }
    if (t.id === 'team-reveal') { teamReveal(t); return; }
    if (t.id === 'cover-pick') { coverPick = t.value; renderCoverPane(manifestCache[year]); return; }
    if (t.id === 'pair-mute') {
      chimeMuted = t.checked;
      try { localStorage.setItem('ks3dt-staff-mute', chimeMuted ? '1' : '0'); } catch (e2) {}
      return;
    }
  }

  function onKeydown(e) {
    touch();
    if (e.key !== 'Enter') return;
    var t = e.target;
    if (t.id === 'sf-pass') { var btn = q('[data-action="gate-go"]'); if (btn) gateGo(btn); }
    else if (t.id === 'cls-name') { addClass(); }
    else if (t.id === 'team-new-name') { teamAddGroup(); }
  }

  function wireOnce() {
    if (wired) return;
    wired = true;
    var body = sb();
    body.addEventListener('click', onClick);
    body.addEventListener('change', onChange);
    body.addEventListener('keydown', onKeydown);
    /* idle clock (C-08): reading a long brief is USE, so scrolling counts too */
    var modal = document.getElementById('staff-modal');
    if (modal) ['pointerdown', 'keydown', 'wheel', 'scroll'].forEach(function (ev) {
      modal.addEventListener(ev, touch, true);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var m = document.getElementById('staff-modal');
      if (m && !m.hidden) App.closeModal('staff-modal');
    });
  }

  /* ================= public entry point ================= */
  global.Staff = {
    open: function () {
      App.openModal('staff-modal');
      wireOnce();
      /* a fresh open re-derives which lesson the Live tab shows, so opening the
         panel during a lesson always lands on that lesson (DFM 156a) */
      liveLessonNum = '';
      if (pass) { touch(); renderPanel(); return; }
      renderGate(lockMsg);
      lockMsg = '';
    },
    /* called by App.closeModal for EVERY close path (the x, Escape, the idle
       clock), so the panel can never be re-opened without the passcode */
    lock: function (msg) { lockPanel(msg); }
  };

})(window);
