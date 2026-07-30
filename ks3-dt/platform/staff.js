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
  var misLessonNum = '';          // Live tab: lesson chosen in the misconception dropdown
  var coverPick = '';             // Cover tab: lessonId chosen in the override dropdown
  var briefByNum = {};            // Lessons tab: lessonNum -> manifest entry (for the Brief view)
  var lockNotice = '';            // Lessons tab: message to show once the grid re-renders (B-05 undo)
  var coverActiveLesson = null;   // Cover tab: lesson we personally started cover for this session
  var wired = false;

  /* pairing lens state (section 12) */
  var pairLensLesson = '', pairLensTimer = null, pairAlerted = {}, pairedLessonCache = {}, pairResetArm = 0;
  /* tournament state (section 13) */
  var tourneyLessonCache = {};    // lessonId -> promise -> true|null ("has a tournament chunk")
  var galleryLessonCache = {};    // lessonId -> promise -> true|null ("has a gallery chunk")
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
    { id: 'cover', label: 'Cover' }
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
      '.staff-chip-menu button{display:block;width:100%;text-align:left;background:none;border:none;' +
        'padding:8px 10px;font:inherit;color:var(--text);cursor:pointer;border-radius:6px}' +
      '.staff-chip-menu button:hover{background:#F0F4FB}' +
      '.staff-chip-menu button.current{color:var(--ols-blue);font-weight:800}' +
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
          (isMine ? '<button type="button" class="ghost-btn danger" data-action="delete-class" data-class="' + App.esc(c.name) + '">Delete</button>' : '') +
        '</div></div>';
    }).join('') || ('<p class="staff-status">No classes' + (showAllTeachers ? '' : ' of your own') + ' yet -- add one below.</p>');

    var html =
      '<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:var(--muted);margin-bottom:12px">' +
      '<input type="checkbox" id="cls-showall"' + (showAllTeachers ? ' checked' : '') + '> Show all teachers&rsquo; classes</label>' +
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
    if (!btn.classList.contains('arm')) {
      btn.classList.add('arm'); btn.textContent = 'Sure?';
      setTimeout(function () { if (btn.classList.contains('arm')) { btn.classList.remove('arm'); btn.textContent = 'Delete'; } }, 4000);
      return;
    }
    btn.disabled = true;
    var status = q('#cls-status');
    busyStatus(status, 'Deleting the class');
    adminCall('deleteClass', { className: name }).then(function (r) {
      btn.disabled = false;
      if (!r || !r.ok) {
        btn.classList.remove('arm'); btn.textContent = 'Delete';
        plainStatus(status, (r && r.error === 'not-owner') ? 'Only the owner can delete this class.' : 'Could not delete the class.');
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
           every girl was flagged absent from it. */
        ((!on && delivered) ? '<span class="lc-undo" data-action="undo-delivery" data-num="' + le.num + '">&#8634; Not taught</span>' : '') +
        '</button>';
    }).join('');
    setPane('<div class="lock-grid">' + cells + '</div>' +
      '<p class="staff-row-meta" style="margin-top:12px">Pupils who already opened a lesson are never kicked out. Locking again stops anyone <b>new</b> starting it, and a locked lesson is never used for absence flags. If you unlocked one by mistake, tap <b>&#8634; Not taught</b> to clear its delivered date. <b>Brief</b> opens the lesson&rsquo;s teacher run sheet.</p>' +
      '<p class="staff-status" id="lock-status"></p>');
    if (lockNotice) { plainStatus(q('#lock-status'), lockNotice); lockNotice = ''; }
  }

  /* ---- Lesson brief body (TEACHER BRIEF STANDARD, LESSON_QUALITY_GATE.md) ----
     Seven sections, in delivery order, written for a colleague who teaches
     another subject and has never seen this platform. A lesson that has not
     been rewritten to the standard yet still renders through the legacy
     branch at the bottom, so nothing goes blank mid-migration. */
  function briefHref(h) {
    h = String(h || '');
    if (!h) return '';
    if (/^https?:\/\//i.test(h)) return h;
    if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return '';   // never javascript:, data:, anything else
    return App.asset(h);                              // repo-relative asset (github.io on Apps Script)
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
      out += '<h4>What the girls will actually do</h4>' +
        '<p class="brief-note">Every part of the hour, in the order they meet it. The rest of this brief uses these names, so it is worth a read-through first.</p>' +
        '<ol class="brief-glance">' + r.atAGlance.map(function (g) {
          return '<li><b>' + App.esc(g.part) + '</b>' +
            (Number(g.mins) ? ' <span class="brief-mins">' + Number(g.mins) + ' min</span>' : '') +
            '<br>' + App.esc(g.what) + '</li>';
        }).join('') + '</ol>';
    }
    if ((r.prepare || []).length) {
      out += '<h4>Preparing for this lesson</h4><ul class="brief-prep">' +
        r.prepare.map(function (p) {
          return '<li><b>' + App.esc(p.title) + '</b><br>' + App.esc(p.text) + '</li>';
        }).join('') + '</ul>';
    }
    if ((r.resources || []).length) {
      out += '<h4>Resources for this lesson</h4><ul class="brief-res">' +
        r.resources.map(function (res) {
          var href = briefHref(res.href);
          return '<li><b>' + App.esc(res.label) + '</b>' +
            (href ? ' &mdash; <a href="' + App.esc(href) + '" target="_blank" rel="noopener">open it</a>' : '') +
            '<br>' + App.esc(res.what) +
            (res.where ? '<br><i>Where to find it: ' + App.esc(res.where) + '</i>' : '') + '</li>';
        }).join('') + '</ul>';
    }
    if ((r.runningTheHour || []).length) {
      out += '<h4>Running the hour</h4><ol class="brief-run">' +
        r.runningTheHour.map(function (h) {
          return '<li><b>' + App.esc(h.part) + '</b>' +
            (Number(h.mins) ? ' <span class="brief-mins">' + Number(h.mins) + ' min</span>' : '') +
            '<br>' + App.esc(h.text) +
            (h.say ? '<div class="brief-say"><span class="brief-say-tag">You could say</span>' + App.esc(h.say) + '</div>' : '') +
            '</li>';
        }).join('') + '</ol>';
    }
    if ((r.goesWrong || []).length) {
      out += '<h4>What commonly goes wrong, and what to do</h4><ul class="brief-pitfalls">' +
        r.goesWrong.map(function (w) {
          return '<li><b>' + App.esc(w.q) + '</b><br>' + App.esc(w.a) + '</li>';
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
      'Each girl starts from the beginning the next time she opens it. Other lessons are untouched. ' +
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

  function showBrief(el) {
    var num = el.getAttribute('data-num');
    var le = briefByNum[num];
    if (!le) return;
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

  function briefPrint() {
    // Same sandbox caveat as coverPrint: window.print can silently no-op in the
    // sandboxed iframe - always leave the teacher a fallback route.
    try { global.print(); } catch (e) {}
    var st = q('#brief-status');
    if (st) plainStatus(st, 'If no print dialog appeared (some school browsers block it here), take a screenshot or keep this tab open.');
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
        'Girls who have already opened it keep their place and can finish. Nobody new will be able to start it, and it will stop being used for absence flags.' +
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
    });
  }

  /* ============================================================
     LIVE tab (dashboard + misconception patterns)
     ============================================================ */
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
            renderLiveTable();
          });
        });
      });
    });
  }

  function lessonCell(a) {
    if (!a) return '<span class="pill none">none</span>';
    var status = Number(a[0]);
    var pillClass = status === 2 ? 'done' : status === 1 ? 'started' : 'none';
    var pillText = status === 2 ? 'done' : status === 1 ? 'started' : 'none';
    var html = '<span class="pill ' + pillClass + '">' + pillText + '</span>';
    var right = Number(a[9]), total = Number(a[10]);
    if (total > 0) html += '<div class="staff-row-meta">' + Math.round((right / total) * 100) + '% recap</div>';
    var se = String(a[4] || '');
    if (se) {
      var parts = se.split('|'), conf = parts[0] || '', diffCh = parts[1] || '';
      var glyphs = conf.split('').map(function (c) {
        return c === '2' ? '&#10003;' : c === '1' ? '&#8776;' : c === '0' ? '&#10007;' : '';
      }).join(' ');
      var diffGlyph = diffCh === '0' ? '&#128994;' : diffCh === '1' ? '&#128993;' : diffCh === '2' ? '&#128308;' : '';
      if (glyphs.trim() || diffGlyph) html += '<div class="staff-row-meta">' + glyphs + (diffGlyph ? ' ' + diffGlyph : '') + '</div>';
    }
    var comment = String(a[8] || '');
    if (comment) html += '<div class="staff-row-meta" title="' + App.esc(comment) + '">' + App.esc(comment) + '</div>';
    return html;
  }

  function isStuck(r, deliveredNums) {
    for (var i = 0; i < deliveredNums.length; i++) {
      var num = deliveredNums[i];
      var a = (r.L || {})[num];
      if (!a) continue;
      var total = Number(a[10]), right = Number(a[9]);
      if (total >= 2 && (right / total) < 0.5) return true;
      if (a[3]) {
        var ex = exitRightMap[num];
        var rc = ex ? rightCountFor(String(a[3]), ex) : null;
        if (rc && rc.total > 0 && rc.right === 0) return true;
      }
      if (Number(a[0]) === 1 && (clientTmin() - Number(a[5])) > 20) return true;
    }
    return false;
  }

  function renderLiveTable() {
    var rows = dashData.rows || [];
    var joined = rows.length;
    var l1done = rows.filter(function (r) { return r.L['1'] && Number(r.L['1'][0]) === 2; }).length;
    var avgXp = joined ? Math.round(rows.reduce(function (s, r) { return s + Number(r.xp || 0); }, 0) / joined) : 0;
    var deliveredNums = Object.keys(dashData.locks || {}).filter(function (n) { return Number(dashData.locks[n].u); })
      .sort(function (a, b) { return Number(a) - Number(b); });

    var head = '<tr><th>Name</th><th>Codename</th><th>XP</th><th>Baseline</th>' +
      deliveredNums.map(function (n) { return '<th>L' + n + '</th>'; }).join('') + '</tr>';
    var body = rows.map(function (r) {
      var stuck = isStuck(r, deliveredNums);
      var bl = baselineDisplay(r);
      var cells = deliveredNums.map(function (n) { return '<td>' + lessonCell(r.L[n]) + '</td>'; }).join('');
      return '<tr' + (stuck ? ' class="is-stuck"' : '') + '>' +
        '<td><button type="button" class="modal-close" style="font-size:1rem" title="Remove this pupil from the class (her own work is untouched)" data-action="remove-pupil" data-email="' + App.esc(r.email) + '" data-name="' + App.esc(r.name) + '">&times;</button> ' +
        App.esc(r.name) + (stuck ? ' <span class="pill flag">needs you</span>' : '') + '</td>' +
        '<td>' + App.esc(r.codename) + '</td>' +
        '<td>' + Number(r.xp || 0) + '</td>' +
        '<td>' + (bl || '&mdash;') + '</td>' +
        cells + '</tr>';
    }).join('');

    var misSelect = '<option value="">-- choose a lesson --</option>' + deliveredNums.map(function (n) {
      var le = liveByNum[n];
      return '<option value="' + n + '"' + (n === misLessonNum ? ' selected' : '') + '>Lesson ' + n + ' -- ' + App.esc(le ? le.title : '') + '</option>';
    }).join('');

    var html =
      '<div class="staff-actions" style="margin-bottom:12px">' +
        '<span class="pill none">' + joined + ' joined</span>' +
        '<span class="pill none">' + l1done + ' finished Lesson 1</span>' +
        '<span class="pill none">' + avgXp + ' avg XP</span>' +
        '<button type="button" class="ghost-btn" data-action="live-refresh">Refresh</button>' +
        '<button type="button" class="ghost-btn" data-action="live-csv">Copy CSV</button>' +
      '</div>' +
      '<div id="pair-lens"></div>' +
      '<div id="tourney-slot"></div>' +
      '<div id="gallery-lens"></div>' +
      '<div class="dash-scroll"><table class="dash-table">' + head + (body || '<tr><td colspan="99">No pupils have joined this class yet.</td></tr>') + '</table></div>' +
      '<h3 style="margin-top:20px">Misconception patterns</h3>' +
      '<select id="live-mis-select" class="staff-select">' + misSelect + '</select>' +
      '<div id="live-mis-body"></div>' +
      '<p class="staff-status" id="live-status"></p>';
    setPane(html);
    if (misLessonNum && liveByNum[misLessonNum]) loadMisconceptions(liveByNum[misLessonNum]);
    initPairLens(deliveredNums);
    initTourneySlot(deliveredNums);
    initGalleryLens(deliveredNums);
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
  function tourneyInfoFor(le) {
    var id = String(le.id);
    if (!tourneyLessonCache[id]) {
      tourneyLessonCache[id] = App.fetchContent(le.file).then(function (lesson) {
        var ch = (lesson.chunks || []).filter(function (c) { return c.engine === 'tournament'; })[0];
        return ch ? { title: String((ch.config && ch.config.title) || ch.title || 'Tournament') } : null;
      }).catch(function () { return null; });
    }
    return tourneyLessonCache[id];
  }

  function initTourneySlot(deliveredNums) {
    var slot = q('#tourney-slot');
    if (!slot) return;
    var candidates = deliveredNums.map(function (n) { return liveByNum[n]; }).filter(Boolean);
    Promise.all(candidates.map(tourneyInfoFor)).then(function (infos) {
      if (!q('#tourney-slot')) return;
      var rows = [];
      infos.forEach(function (inf, i) { if (inf) rows.push({ le: candidates[i], title: inf.title }); });
      if (!rows.length) return;
      slot.innerHTML = rows.map(function (row) {
        return '<div class="pair-lens-box" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
          '<h3 style="margin:0">&#127942; ' + App.esc(row.title) + ' &mdash; Lesson ' + App.esc(String(row.le.num)) + '</h3>' +
          '<span class="pl-note" style="margin:0">hidden teams &middot; projector reveal</span>' +
          '<button type="button" class="primary-btn" style="margin-left:auto" data-action="tourney-open" data-lesson="' + App.esc(String(row.le.id)) + '">Tournament view</button>' +
          '</div>';
      }).join('');
    });
  }


  /* ---------- Press Night lens (L5 gallery): the duty-of-care view ----------
     Detection mirrors tourneyInfoFor (content chunk scan). The lens shows the
     live marquee + every signed review with REAL names, and a one-tap Remove:
     a removed review vanishes from the maker's screen on their next ~4s poll.
     Removed reviews stay listed struck-through (audit trail, rm flag). */
  function galleryInfoFor(le) {
    var id = String(le.id);
    if (!galleryLessonCache[id]) {
      galleryLessonCache[id] = App.fetchContent(le.file).then(function (lesson) {
        var ch = (lesson.chunks || []).filter(function (c) { return c.engine === 'gallery'; })[0];
        return ch ? { title: String(ch.title || 'Press Night') } : null;
      }).catch(function () { return null; });
    }
    return galleryLessonCache[id];
  }

  function initGalleryLens(deliveredNums) {
    var slot = q('#gallery-lens');
    if (!slot) return;
    var candidates = deliveredNums.map(function (n) { return liveByNum[n]; }).filter(Boolean);
    Promise.all(candidates.map(galleryInfoFor)).then(function (infos) {
      if (!q('#gallery-lens')) return;
      var rows = [];
      infos.forEach(function (inf, i) { if (inf) rows.push({ le: candidates[i], title: inf.title }); });
      if (!rows.length) return;
      if (!galleryLensLesson || !rows.some(function (r) { return String(r.le.id) === galleryLensLesson; })) {
        galleryLensLesson = String(rows[rows.length - 1].le.id);
      }
      var sel = rows.map(function (r) {
        return '<option value="' + App.esc(String(r.le.id)) + '"' + (String(r.le.id) === galleryLensLesson ? ' selected' : '') + '>' +
          App.esc(r.title) + ' &mdash; Lesson ' + App.esc(String(r.le.num)) + '</option>';
      }).join('');
      slot.innerHTML = '<div class="pair-lens-box">' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<h3 style="margin:0">&#127914; Press Night</h3>' +
        (rows.length > 1 ? '<select id="gallery-lesson-sel" class="staff-select" style="margin:0;max-width:280px">' + sel + '</select>'
          : '<span class="pl-note" style="margin:0">' + App.esc(rows[0].title) + ' &mdash; Lesson ' + App.esc(String(rows[0].le.num)) + '</span>') +
        '<span class="pl-note gal-lens-stat" style="margin:0 0 0 auto"></span></div>' +
        '<div id="gallery-lens-body">' + busyHtml('Raising the marquee') + '</div></div>';
      galleryLensTick();
      if (!galleryLensTimer) galleryLensTimer = setInterval(galleryLensTick, 5000);
    });
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
      '<p class="tourney-sub">Hidden-team tournament &mdash; scored on scoreboards the agents built themselves</p>' +
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
        '<p class="tourney-count-label">of ' + Number(r.roster) + ' agents\' scores received</p>' +
        (noTeams
          ? '<p class="tourney-note" style="margin-bottom:3vh">No hidden teams exist yet &mdash; assign them before the countdown.</p>'
          : '<div class="tourney-chips">' + chips + '</div>') +
        (Number(r.unassigned) > 0 ? '<p class="tourney-note" style="margin:0 0 2vh">' + Number(r.unassigned) + ' scored agent(s) have no team &mdash; their points only count once assigned (Teams tab).</p>' : '') +
        '<div class="tourney-actions">' +
        (noTeams
          ? '<button type="button" class="tourney-reveal-btn" data-t="assign">Auto-assign 4 hidden teams</button>'
          : '<button type="button" class="tourney-reveal-btn" data-t="reveal"' + (canReveal ? '' : ' disabled') + '>' + (r.revealed ? 'Replay the reveal' : 'REVEAL THE TEAMS') + '</button>') +
        (App.state.preview ? '<button type="button" class="tourney-ghost-btn" data-t="seed">Seed demo scores (preview)</button>' : '') +
        '</div>' +
        '<p class="tourney-note">Keep this for the very end &mdash; the suspense is the point. Revealing also shows every agent her own team on her screen.</p>';
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

  function pairedInfoFor(le) {
    var id = String(le.id);
    if (!pairedLessonCache[id]) {
      pairedLessonCache[id] = App.fetchContent(le.file).then(function (lesson) {
        return (lesson.chunks || []).some(function (ch) { return ch.config && ch.config.paired; }) || null;
      }).catch(function () { return null; });
    }
    return pairedLessonCache[id];
  }

  function initPairLens(deliveredNums) {
    var slot = q('#pair-lens');
    if (!slot) return;
    injectPairStyles();
    var candidates = deliveredNums.map(function (n) { return liveByNum[n]; }).filter(Boolean);
    Promise.all(candidates.map(pairedInfoFor)).then(function (infos) {
      if (!q('#pair-lens')) return;
      var paired = [];
      infos.forEach(function (inf, i) { if (inf) paired.push(candidates[i]); });
      if (!paired.length) return; // no delivered lesson has a paired stage
      var ids = paired.map(function (le) { return String(le.id); });
      if (ids.indexOf(pairLensLesson) === -1) pairLensLesson = ids[ids.length - 1];
      var sel = paired.map(function (le) {
        return '<option value="' + App.esc(String(le.id)) + '"' + (String(le.id) === pairLensLesson ? ' selected' : '') + '>Lesson ' + App.esc(String(le.num)) + ' -- ' + App.esc(String(le.title || '')) + '</option>';
      }).join('');
      slot.innerHTML =
        '<div class="pair-lens-box">' +
        '<div class="pl-head"><h3>Pairing &mdash; live</h3>' +
        '<select id="pair-lesson-sel" class="staff-select" style="margin:0;max-width:280px">' + sel + '</select>' +
        '<label class="pl-mute"><input type="checkbox" id="pair-mute"' + (chimeMuted ? ' checked' : '') + '> mute chime</label></div>' +
        '<div id="pair-lens-body">' + busyHtml('Listening to the room') + '</div></div>';
      pairAlerted = {};
      pairLensTick();
      if (pairLensTimer) clearInterval(pairLensTimer);
      pairLensTimer = setInterval(function () {
        if (!document.getElementById('pair-lens-body')) { clearInterval(pairLensTimer); pairLensTimer = null; return; }
        pairLensTick();
      }, 5000);
    });
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
        (!(r.queue || []).length && !(r.pairs || []).length ? '<p class="pl-note">No one has reached the pairing stage yet &mdash; this panel wakes up the moment the first agent arrives.</p>' : '');
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
          ? (Number(r.freed) + ' agent' + (Number(r.freed) === 1 ? '' : 's') + ' released &mdash; they carry on solo, nothing is lost.')
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
        var key = items[it.id] || { a: -1, mis: [] };
        var counts = {};
        rows.forEach(function (r) {
          var a = r.L[String(le.num)];
          if (!a || !a[3]) return;
          var ch = String(a[3]).charAt(i);
          if (ch === '' || ch === 'x') return;
          counts[ch] = (counts[ch] || 0) + 1;
        });
        var maxCount = 1;
        Object.keys(counts).forEach(function (k) { if (counts[k] > maxCount) maxCount = counts[k]; });
        var optCount = Math.max(key.mis.length, key.a + 1, 2);
        var bars = '';
        for (var oi = 0; oi < optCount; oi++) {
          var n = counts[String(oi)] || 0;
          var isCorrect = oi === Number(key.a);
          var label = key.mis[oi] || ('Option ' + 'ABCDEFGH'.charAt(oi));
          bars += '<div class="mis-bar"><span class="mb-label">' + App.esc(isCorrect ? (label + ' (correct)') : label) + '</span>' +
            '<span class="mb-track"><span class="mb-fill' + (isCorrect ? ' correct' : '') + '" style="width:' + Math.round((n / maxCount) * 100) + '%"></span></span>' +
            '<span class="mb-n">' + n + '</span></div>';
        }
        return '<div class="staff-row" style="display:block"><div class="staff-row-name">' + App.esc(it.stem || ('Item ' + (i + 1))) + '</div>' + bars + '</div>';
      }).join('');
      body.innerHTML = html;
    });
  }

  function liveCsv() {
    if (!dashData) return;
    var rows = dashData.rows || [];
    var deliveredNums = Object.keys(dashData.locks || {}).filter(function (n) { return Number(dashData.locks[n].u); })
      .sort(function (a, b) { return Number(a) - Number(b); });
    function csvCell(s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }
    var head = ['Name', 'Email', 'Codename', 'XP'];
    deliveredNums.forEach(function (n) { head.push('L' + n + ' status', 'L' + n + ' exit', 'L' + n + ' self-eval', 'L' + n + ' comment'); });
    var lines = [head.map(csvCell).join(',')];
    rows.forEach(function (r) {
      var line = [r.name, r.email, r.codename, r.xp];
      deliveredNums.forEach(function (n) {
        var a = r.L[n];
        var status = !a ? 'none' : (Number(a[0]) === 2 ? 'done' : Number(a[0]) === 1 ? 'started' : 'none');
        var exitTxt = '';
        if (a && a[3]) {
          var ex = exitRightMap[n];
          var rc = ex ? rightCountFor(String(a[3]), ex) : null;
          exitTxt = rc ? (rc.right + '/' + rc.total) : String(a[3]);
        }
        line.push(status, exitTxt, (a && a[4]) || '', (a && a[8]) || '');
      });
      lines.push(line.map(csvCell).join(','));
    });
    App.copyText(lines.join('\n'), 'CSV copied.');
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
      '<p class="staff-lead">Unassigned pupils (tap a name to move it)</p>' +
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
      '<h3>Leaderboard</h3>' +
      optRadio('lb-mode', 'off', lb.mode, '<b>Private (default):</b> each pupil sees only her own progress.') +
      optRadio('lb-mode', 'team', lb.mode, '<b>Hidden teams:</b> team totals are visible, members stay hidden until you reveal them.') +
      optRadio('lb-mode', 'public', lb.mode, '<b>Public board (deliberate choice):</b> a class leaderboard is shown to everyone.') +
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
      optRadio('tn-mode', 'public', String((cfg.tn || { mode: 'team' }).mode), '<b>Also show pair scores (deliberate choice):</b> after the team bars, a ranked list of pair scores with first names appears on the projector.') +
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

  function renderCoverSheet(le) {
    var link = App.classLink(cls);
    var html = '<div class="cover-sheet">' +
      '<h3>' + App.esc(cls) + ' &middot; Lesson ' + le.num + ': ' + App.esc(le.title) + '</h3>' +
      '<p>Class link: <a href="' + App.esc(link) + '" target="_blank" rel="noopener">' + App.esc(link) + '</a></p>' +
      '<canvas id="cover-qr-canvas"></canvas>' +
      '<div id="cover-what"><h4>What the class does</h4><p class="staff-status">Loading&hellip;</p></div>' +
      (le.coverNote ? ('<p class="staff-lead">' + App.esc(le.coverNote) + '</p>') : '') +
      '<h4>Running it (no DT knowledge needed)</h4><ol>' +
        '<li>Pupils open the class link above, or scan the QR code, on their own device.</li>' +
        '<li>They sign in with their usual school Google account -- the platform takes it from there.</li>' +
        '<li>The platform delivers the whole lesson on screen; you do not need to teach any content.</li>' +
        '<li>Circulate, keep pupils on task, and help with reading the instruction cards if asked.</li>' +
        '<li>If wifi drops or a pupil cannot sign in: have them retry once, then sit them next to a working pair -- progress is saved centrally, so a later retry (even next lesson) picks up where they left off.</li>' +
      '</ol>' +
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
    loadCoverWhat(le);
  }

  function loadCoverWhat(le) {
    var host = q('#cover-what');
    if (!host) return;
    if (le.status !== 'ready' || !le.file) {
      host.innerHTML = '<h4>What the class does</h4><p>' + (le.tagline ? App.esc(le.tagline) : 'Detailed content for this lesson is still being prepared -- check with the DT lead for how to run it.') + '</p>';
      return;
    }
    App.fetchContent(le.file).then(function (lesson) {
      var chunks = (lesson.chunks || []).map(function (ch) {
        return '<li>' + App.esc(ch.title || ch.engine || 'Activity') + (ch.minutes ? (' (' + ch.minutes + ' min)') : '') + '</li>';
      }).join('');
      host.innerHTML = '<h4>What the class does</h4><ol>' + (chunks || '<li>See the lesson for details.</li>') + '</ol>';
    }).catch(function () {
      host.innerHTML = '<h4>What the class does</h4><p>Could not load the lesson outline -- the pupils&rsquo; view will still work fine.</p>';
    });
  }

  function coverPrint() {
    // window.print can silently no-op inside the sandboxed iframe (review
    // finding) - always leave the teacher a fallback route.
    try { global.print(); } catch (e) {}
    var st = q('#cover-status');
    if (st) plainStatus(st, 'If no print dialog appeared (some school browsers block it here), take a screenshot of the sheet or keep this tab open for the cover teacher.');
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
      case 'select-class': cls = btn.getAttribute('data-class'); year = btn.getAttribute('data-year') || year; renderClassesFromCache(); break;
      case 'delete-class': deleteClass(btn); break;
      case 'add-class': addClass(); break;
      case 'toggle-lock': toggleLock(btn); break;
      case 'undo-delivery': undoDelivery(btn); break;
      case 'reset-lesson': resetLesson(btn); break;
      case 'show-brief': showBrief(btn); break;
      case 'brief-back': renderLessons(); break;
      case 'brief-print': briefPrint(); break;
      case 'archive-now': archiveNow(btn); break;
      case 'live-refresh': renderLive(); break;
      case 'live-csv': liveCsv(); break;
      case 'absence-dismiss': absenceDismiss(btn); break;
      case 'team-chip': openChipMenu(btn); break;
      case 'team-add-group': teamAddGroup(); break;
      case 'team-auto': teamAuto(btn); break;
      case 'team-del-group': teamDelGroup(btn); break;
      case 'options-save': optionsSave(btn); break;
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
    if (t.id === 'live-mis-select') { misLessonNum = t.value; if (misLessonNum && liveByNum[misLessonNum]) loadMisconceptions(liveByNum[misLessonNum]); return; }
    if (t.name === 'lb-mode') { var pub = q('#opt-public'); if (pub) pub.hidden = (t.value !== 'public'); return; }
    if (t.id === 'team-reveal') { teamReveal(t); return; }
    if (t.id === 'cover-pick') { coverPick = t.value; renderCoverPane(manifestCache[year]); return; }
    if (t.id === 'pair-lesson-sel') { pairLensLesson = t.value; pairAlerted = {}; pairLensTick(); return; }
    if (t.id === 'gallery-lesson-sel') { galleryLensLesson = t.value; galleryLensTick(); return; }
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
      if (pass) { touch(); renderPanel(); return; }
      renderGate(lockMsg);
      lockMsg = '';
    },
    /* called by App.closeModal for EVERY close path (the x, Escape, the idle
       clock), so the panel can never be re-opened without the passcode */
    lock: function (msg) { lockPanel(msg); }
  };

})(window);
