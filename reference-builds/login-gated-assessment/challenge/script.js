/* ============================================================
   Login-gated assessment engine (reference) — Computational Thinking Challenge
   One front-end, two transports + NAMED CLASS BOARDS.

   Each class is its own competition, reached at  …?class=NAME  — its own
   leaderboard, its own results. The teacher creates / selects / deletes
   classes and shows a per-class QR code from the staff panel.

   • Path B (login-gated): window.GG_TRANSPORT routes to google.script.run;
     the server is authoritative (scoring, timer, leaderboard, anti-cheat),
     the answer key never reaches the browser, and the class + /exec URL are
     injected via window.GG_BOOT (the sandboxed iframe can't read its own URL).
   • Offline/preview: a localStorage mock that mirrors the same async API,
     per class, grading against the bundled bank (window.GG_QUESTIONS). Add
     ?class=10A to the preview URL to try a class board.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- config ---------------- */
  var TIME_LIMIT_SEC = 40 * 60;
  var MAX_SCORE = 250;
  var TITLES = [
    { min: 91, label: 'Digital Thinking Master', icon: '👑', msg: 'Outstanding — you think like a true computer scientist. Incredible work.' },
    { min: 76, label: 'Logic Legend', icon: '🏆', msg: 'Brilliant thinking under pressure. You are a real force in this competition.' },
    { min: 51, label: 'Computational Champion', icon: '💎', msg: 'Excellent problem solving — you cracked some genuinely tricky puzzles.' },
    { min: 26, label: 'Problem Solver', icon: '🚀', msg: 'Great effort — your logic is growing stronger with every challenge.' },
    { min: 0,  label: 'Curious Thinker', icon: '🌱', msg: 'A brave start — every expert began exactly here. Keep that curiosity going.' }
  ];
  function rankTitle(pct) { for (var i = 0; i < TITLES.length; i++) if (pct >= TITLES[i].min) return TITLES[i]; return TITLES[TITLES.length - 1]; }

  /* ---------------- helpers ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function yearOf(c) { var m = String(c || '').match(/(\d{1,2})/); return m ? 'Year ' + m[1] : 'Other'; }
  function showScreen(id) { $all('.screen').forEach(function (s) { s.classList.toggle('is-active', s.id === id); }); window.scrollTo(0, 0); }
  var toastT = null;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2600); }
  var confirmYes = null;
  function askConfirm(title, text, yesLabel, onYes) { $('#confirm-title').textContent = title; $('#confirm-text').textContent = text; $('#confirm-yes').textContent = yesLabel || 'Yes'; confirmYes = onYes; $('#confirm-modal').hidden = false; }
  function compareRank(a, b) {
    return b.score - a.score || b.timeRemainingSec - a.timeRemainingSec || b.expertCorrect - a.expertCorrect ||
      b.hardCorrect - a.hardCorrect || b.mediumCorrect - a.mediumCorrect || b.easyCorrect - a.easyCorrect || a.completionSec - b.completionSec;
  }

  /* ---------------- which class board are we on? ---------------- */
  var CLASS = (window.GG_BOOT && window.GG_BOOT.classCode) || new URLSearchParams(location.search).get('class') || 'default';
  function classLink(name) {
    var base = (window.GG_BOOT && window.GG_BOOT.baseUrl) ? window.GG_BOOT.baseUrl : (location.origin + location.pathname);
    return base + '?class=' + encodeURIComponent(name);
  }
  function gotoTop(url) { var a = document.createElement('a'); a.href = url; a.target = '_top'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }

  /* ============================================================
     TRANSPORT — Path B (google.script.run) or offline mock
     ============================================================ */
  function makeTransport() { if (window.GG_TRANSPORT && window.GG_TRANSPORT.call) return window.GG_TRANSPORT; return offlineTransport(); }

  function offlineTransport() {
    var LS = window.localStorage, PASS = 'COMP2026';
    var K_CLASSES = 'gg_classes_v1', K_SEEDED = 'gg_seeded_v2';
    function boardKey(c) { return 'gg_board_v1_' + c; }
    function attemptKey(c) { return 'gg_attempt_v1_' + c; }
    function read(k, d) { try { return JSON.parse(LS.getItem(k)) || d; } catch (e) { return d; } }
    function write(k, v) { LS.setItem(k, JSON.stringify(v)); }
    function classes() { return read(K_CLASSES, []); }
    function setClasses(a) { write(K_CLASSES, a); }
    function board(c) { return read(boardKey(c), []); }

    seedDemo();
    function seedDemo() {
      if (LS.getItem(K_SEEDED)) return;
      setClasses(['10A', '10B', '10C']);
      write(boardKey('10A'), [
        mkRec('Emma', 'Gallagher', '10A', 195, { easy: 5, medium: 5, hard: 4, expert: 3 }, 410, 22 * 60),
        mkRec('Aoife', 'Murphy', '10A', 180, { easy: 5, medium: 4, hard: 4, expert: 2 }, 300, 21 * 60),
        mkRec('Saoirse', 'Kelly', '10A', 120, { easy: 5, medium: 3, hard: 2, expert: 1 }, 700, 19 * 60)
      ]);
      write(boardKey('10B'), [
        mkRec('Katie', 'Boyle', '10B', 165, { easy: 5, medium: 5, hard: 3, expert: 2 }, 520, 23 * 60),
        mkRec('Niamh', 'Doherty', '10B', 150, { easy: 4, medium: 4, hard: 3, expert: 2 }, 640, 24 * 60),
        mkRec('Orla', 'Quinn', '10B', 95, { easy: 4, medium: 3, hard: 1, expert: 1 }, 880, 18 * 60)
      ]);
      write(boardKey('10C'), [
        mkRec('Erin', 'Lynch', '10C', 90, { easy: 4, medium: 2, hard: 2, expert: 0 }, 900, 18 * 60),
        mkRec('Cara', 'Press', '10C', 55, { easy: 3, medium: 2, hard: 0, expert: 0 }, 1100, 17 * 60)
      ]);
      LS.setItem(K_SEEDED, '1');
    }
    function bandPerQ(perBand) {
      var pq = {}, byBand = { easy: [], medium: [], hard: [], expert: [] };
      (window.GG_QUESTIONS || []).forEach(function (q) { (byBand[q.band] || (byBand[q.band] = [])).push(q.id); });
      Object.keys(byBand).forEach(function (b) { byBand[b].forEach(function (id, i) { pq[id] = i < (perBand[b] || 0); }); });
      return pq;
    }
    function mkRec(first, surname, cls, score, perBand, completionSec, timeRemainingSec) {
      var correct = perBand.easy + perBand.medium + perBand.hard + perBand.expert, pct = Math.round(score / MAX_SCORE * 100);
      return { email: 'demo.' + first.toLowerCase() + '.' + cls + '@example.org', firstName: first, surname: surname, surnameInitial: surname.charAt(0).toUpperCase(),
        className: cls, year: yearOf(cls), score: score, pct: pct, correct: correct, total: 20,
        easyCorrect: perBand.easy, mediumCorrect: perBand.medium, hardCorrect: perBand.hard, expertCorrect: perBand.expert,
        timeRemainingSec: timeRemainingSec, completionSec: completionSec, title: rankTitle(pct).label, status: 'finished', perQuestion: bandPerQ(perBand) };
    }

    function qById(id) { for (var i = 0; i < window.GG_QUESTIONS.length; i++) if (window.GG_QUESTIONS[i].id === id) return window.GG_QUESTIONS[i]; return null; }
    function buildAttempt(cls, form) {
      var byBand = { easy: [], medium: [], hard: [], expert: [] };
      window.GG_QUESTIONS.forEach(function (q) { (byBand[q.band] || (byBand[q.band] = [])).push(q); });
      var order = []; ['easy', 'medium', 'hard', 'expert'].forEach(function (b) { shuffle(byBand[b] || []).forEach(function (q) { order.push(q.id); }); });
      var optMap = {}; order.forEach(function (qid) { var q = qById(qid); optMap[qid] = shuffle(q.options.map(function (text, i) { return { id: 'o' + i, text: text, correct: i === q.correctIndex }; })); });
      return { id: 'local', firstName: form.firstName, surname: form.surname, className: cls, email: 'preview.player@c2ken.net',
        startedAt: Date.now(), order: order, optMap: optMap, answers: {}, finished: false, finishedAt: 0, result: null };
    }
    function sanitise(att) { return att.order.map(function (qid) { var q = qById(qid); return { id: q.id, band: q.band, points: q.points, title: q.title, scenario: q.scenario, prompt: q.prompt, visual: q.visual, options: att.optMap[qid].map(function (o) { return { id: o.id, text: o.text }; }) }; }); }
    function remaining(att) { return Math.max(0, TIME_LIMIT_SEC - Math.floor((Date.now() - att.startedAt) / 1000)); }
    function attemptState(att) { return { id: att.id, startedAt: att.startedAt, remainingSec: remaining(att), timeLimitSec: TIME_LIMIT_SEC, currentIndex: Object.keys(att.answers).length, finished: att.finished, result: att.result, questions: sanitise(att) }; }
    function grade(att) {
      var score = 0, correct = 0, perBand = { easy: 0, medium: 0, hard: 0, expert: 0 }, perQ = {};
      att.order.forEach(function (qid) { var q = qById(qid), chosen = att.answers[qid], ok = false; if (chosen != null) { var o = att.optMap[qid].filter(function (x) { return x.id === chosen; })[0]; ok = !!(o && o.correct); } perQ[qid] = ok; if (ok) { score += q.points; correct++; perBand[q.band]++; } });
      var pct = Math.round(score / MAX_SCORE * 100), t = rankTitle(pct);
      var completionSec = Math.min(TIME_LIMIT_SEC, Math.floor((att.finishedAt - att.startedAt) / 1000));
      return { score: score, pct: pct, correct: correct, total: 20, perBand: perBand, perQuestion: perQ, timeRemainingSec: Math.max(0, TIME_LIMIT_SEC - completionSec), completionSec: completionSec, title: t.label, icon: t.icon, message: t.msg };
    }
    function pushBoard(cls, att) {
      var b = board(cls), r = att.result; b = b.filter(function (x) { return x.email !== att.email; });
      b.push({ email: att.email, firstName: att.firstName, surname: att.surname, surnameInitial: (att.surname || '?').charAt(0).toUpperCase(), className: cls, year: yearOf(cls), score: r.score, pct: r.pct, correct: r.correct, total: 20, easyCorrect: r.perBand.easy, mediumCorrect: r.perBand.medium, hardCorrect: r.perBand.hard, expertCorrect: r.perBand.expert, timeRemainingSec: r.timeRemainingSec, completionSec: r.completionSec, title: r.title, status: 'finished', perQuestion: r.perQuestion });
      write(boardKey(cls), b);
      if (classes().indexOf(cls) === -1) { var cl = classes(); cl.push(cls); setClasses(cl); }
    }
    function rankedLb(cls, meEmail) {
      var b = board(cls).slice().sort(compareRank);
      var top = b.slice(0, 5).map(function (r) { return { firstName: r.firstName, surnameInitial: r.surnameInitial, className: r.className, score: r.score, isMe: r.email === meEmail }; });
      var pos = 0, my = 0; for (var i = 0; i < b.length; i++) if (b[i].email === meEmail) { pos = i + 1; my = b[i].score; }
      return { top: top, me: { pos: pos, score: my, total: b.length } };
    }

    var api = {
      whoami: function () { return Promise.resolve({ ok: true, email: 'preview.player@c2ken.net', preview: true }); },
      resume: function (p) { var c = p.classCode, att = read(attemptKey(c), null); if (!att) return Promise.resolve({ ok: true, none: true }); if (!att.finished && remaining(att) <= 0) { att.finished = true; att.finishedAt = att.startedAt + TIME_LIMIT_SEC * 1000; att.result = grade(att); write(attemptKey(c), att); pushBoard(c, att); } return Promise.resolve({ ok: true, attempt: attemptState(att) }); },
      start: function (p) { var c = p.classCode; var att = read(attemptKey(c), null); if (att) return Promise.resolve({ ok: true, attempt: attemptState(att) }); att = buildAttempt(c, p); write(attemptKey(c), att); if (classes().indexOf(c) === -1) { var cl = classes(); cl.push(c); setClasses(cl); } return Promise.resolve({ ok: true, attempt: attemptState(att) }); },
      answer: function (p) { var c = p.classCode, att = read(attemptKey(c), null); if (!att || att.finished) return Promise.resolve({ ok: false, error: 'closed' }); if (remaining(att) <= 0) return api.finish(p); if (!(p.questionId in att.answers)) att.answers[p.questionId] = p.optionId; write(attemptKey(c), att); var o = att.optMap[p.questionId].filter(function (x) { return x.id === p.optionId; })[0]; var q = qById(p.questionId); return Promise.resolve({ ok: true, awarded: (o && o.correct) ? q.points : 0 }); },
      finish: function (p) { var c = p.classCode, att = read(attemptKey(c), null); if (!att) return Promise.resolve({ ok: false }); if (!att.finished) { att.finished = true; att.finishedAt = Date.now(); att.result = grade(att); write(attemptKey(c), att); pushBoard(c, att); } return Promise.resolve({ ok: true, attempt: attemptState(att), leaderboard: rankedLb(c, att.email) }); },
      leaderboard: function (p) { return Promise.resolve(Object.assign({ ok: true }, rankedLb(p.classCode, 'preview.player@c2ken.net'))); },
      admin: function (p) {
        if (String(p.passcode || '') !== PASS) return Promise.resolve({ ok: false, error: 'bad-passcode' });
        if (p.sub === 'classes') { var cs = classes().map(function (n) { return { name: n, count: board(n).length }; }); cs.sort(function (a, b) { return a.name.localeCompare(b.name); }); return Promise.resolve({ ok: true, classes: cs }); }
        if (p.sub === 'addClass') { var nm = sanitizeClass(p.className); if (!nm) return Promise.resolve({ ok: false, error: 'bad-name' }); var cl = classes(); if (cl.indexOf(nm) === -1) { cl.push(nm); setClasses(cl); } return Promise.resolve({ ok: true, name: nm }); }
        if (p.sub === 'deleteClass') { var d = String(p.className || ''); LS.removeItem(boardKey(d)); LS.removeItem(attemptKey(d)); var cl2 = classes(); var i = cl2.indexOf(d); if (i > -1) { cl2.splice(i, 1); setClasses(cl2); } return Promise.resolve({ ok: true, name: d }); }
        if (p.sub === 'reset') { if (p.className === '__ALL__') { classes().forEach(function (n) { write(boardKey(n), []); LS.removeItem(attemptKey(n)); }); } else { write(boardKey(p.className), []); LS.removeItem(attemptKey(p.className)); } return Promise.resolve({ ok: true, reset: true }); }
        // default: raw data across all classes
        var parts = []; classes().forEach(function (n) { board(n).forEach(function (r) { parts.push(Object.assign({ name: r.firstName + ' ' + r.surnameInitial + '.' }, r)); }); });
        var counts = classes().map(function (n) { return { name: n, count: board(n).length }; });
        return Promise.resolve({ ok: true, participants: parts, classes: counts });
      }
    };
    function sanitizeClass(name) { return String(name || '').trim().replace(/[^A-Za-z0-9_\- ]/g, '').replace(/\s+/g, '-').slice(0, 40); }
    return { call: function (p) { var fn = api[p.action]; return fn ? fn(p) : Promise.resolve({ ok: false, error: 'unknown' }); } };
  }

  var T = makeTransport();
  function call(action, params) { return T.call(Object.assign({ action: action, classCode: CLASS }, params || {})); }

  /* ============================================================ STATE ============================================================ */
  var me = { email: '', preview: false };
  var att = null, idx = 0, selected = null, localScore = 0, deadline = 0, timerInt = null, lbPoll = null, finishing = false;

  /* ============================================================ BOOT ============================================================ */
  document.addEventListener('DOMContentLoaded', init);
  function init() {
    wireEvents();
    var hasClass = CLASS && CLASS !== 'default';
    call('whoami').then(function (w) {
      me.email = (w && w.email) || ''; me.preview = !!(w && w.preview);
      var st = $('#signin-state');
      if (!hasClass) {
        st.innerHTML = 'Open <strong>your class’s link</strong> to take part. If you are a teacher, tap the key (bottom-right) to set up class boards.';
        $('#to-welcome').hidden = true; return;
      }
      if (me.email) {
        st.classList.add('ok');
        st.innerHTML = (me.preview ? 'Preview mode — sign-in is simulated as ' : 'Signed in as ') + '<span class="who">' + esc(me.email) + '</span>';
        $('#to-welcome').disabled = false;
        $('#welcome-signed').textContent = (me.preview ? 'Preview — ' : 'Signed in as ') + me.email;
        $('#welcome-class').textContent = CLASS; $('#welcome-class-line').hidden = false;
        $('#lb-class-name').textContent = '· ' + CLASS;
      } else { st.textContent = 'You need to sign in with your school account to take part.'; }
    });
    if (hasClass) call('resume').then(function (r) { if (r && r.ok && r.attempt) { att = r.attempt; if (att.finished) showResultsFromAttempt(); else resumeIntoChallenge(); } });
  }

  /* ============================================================ EVENTS ============================================================ */
  function wireEvents() {
    $('#to-welcome').addEventListener('click', function () { showScreen('screen-welcome'); $('#f-first').focus(); });
    $('#details-form').addEventListener('submit', onStart);
    $('#next-btn').addEventListener('click', onNext);
    document.addEventListener('keydown', onKey);
    // staff
    $('#staff-fab').addEventListener('click', openStaff);
    $('#staff-close').addEventListener('click', function () { showScreen(att && att.finished ? 'screen-results' : (att ? 'screen-challenge' : 'screen-landing')); });
    $('#staff-unlock').addEventListener('click', staffUnlock);
    $('#staff-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') staffUnlock(); });
    // class management
    $('#cm-add').addEventListener('click', cmAdd);
    $('#cm-new').addEventListener('keydown', function (e) { if (e.key === 'Enter') cmAdd(); });
    $('#cm-copy').addEventListener('click', function () { var n = $('#cm-select').value; if (n) copyLink(classLink(n), 'Link copied for ' + n + '.'); });
    $('#cm-qr').addEventListener('click', function () { var n = $('#cm-select').value; if (n) showQr(n); });
    $('#cm-goto').addEventListener('click', function () { var n = $('#cm-select').value; if (n) gotoTop(classLink(n)); });
    $('#cm-delete').addEventListener('click', cmDelete);
    // reporting
    $('#report-class').addEventListener('change', renderDash);
    $('#filter-year').addEventListener('change', renderDash);
    $('#filter-min').addEventListener('input', renderDash);
    $('#filter-max').addEventListener('input', renderDash);
    $('#filter-clear').addEventListener('click', function () { $('#filter-year').value = ''; $('#filter-min').value = ''; $('#filter-max').value = ''; renderDash(); });
    $('#staff-refresh').addEventListener('click', loadDash);
    $('#staff-csv').addEventListener('click', exportCsv);
    $('#staff-reset').addEventListener('click', onReset);
    $all('#dash-table th[data-sort]').forEach(function (th) { th.addEventListener('click', function () { setSort(th.getAttribute('data-sort')); }); });
    // modals
    $('#confirm-no').addEventListener('click', function () { $('#confirm-modal').hidden = true; confirmYes = null; });
    $('#confirm-yes').addEventListener('click', function () { $('#confirm-modal').hidden = true; var fn = confirmYes; confirmYes = null; if (fn) fn(); });
    $all('#qr-modal [data-close]').forEach(function (el) { el.addEventListener('click', function () { $('#qr-modal').hidden = true; }); });
  }
  function onKey(e) {
    if ($('#screen-challenge').classList.contains('is-active')) {
      var opts = $all('.opt'), k = e.key.toUpperCase(), map = { '1': 0, '2': 1, '3': 2, '4': 3, 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      if (k in map && opts[map[k]]) { selectOption(opts[map[k]]); e.preventDefault(); }
      else if (e.key === 'Enter' && !$('#next-btn').disabled) onNext();
    }
  }

  /* ============================================================ START / WELCOME ============================================================ */
  function onStart(e) {
    e.preventDefault();
    var first = $('#f-first').value.trim(), surname = $('#f-surname').value.trim(), note = $('#form-note');
    if (!first || !surname) { note.textContent = 'Please fill in both boxes before you start.'; note.hidden = false; return; }
    if (!me.email) { note.textContent = 'You must be signed in with your school account first.'; note.hidden = false; return; }
    note.hidden = true; $('#start-btn').disabled = true;
    call('start', { firstName: first, surname: surname }).then(function (r) {
      $('#start-btn').disabled = false;
      if (!r || !r.ok) { note.textContent = 'Could not start — please try again.'; note.hidden = false; return; }
      att = r.attempt; if (att.finished) { showResultsFromAttempt(); return; } beginChallenge();
    }).catch(function (err) {
      $('#start-btn').disabled = false; note.textContent = 'Could not start — please try again in a moment.'; note.hidden = false;
      if (window.console) console.error('start failed', err);
    });
  }

  /* ============================================================ CHALLENGE ============================================================ */
  function beginChallenge() { idx = att.currentIndex || 0; localScore = 0; startTimer(att.remainingSec); showScreen('screen-challenge'); renderQuestion(); }
  function resumeIntoChallenge() { idx = att.currentIndex || 0; localScore = 0; startTimer(att.remainingSec); showScreen('screen-challenge'); renderQuestion(); toast('Welcome back — picking up where you left off.'); }
  function startTimer(remainingSec) { deadline = Date.now() + remainingSec * 1000; tick(); clearInterval(timerInt); timerInt = setInterval(tick, 1000); }
  function tick() { var rem = Math.max(0, Math.round((deadline - Date.now()) / 1000)); var el = $('#hud-timer'); el.textContent = fmtTime(rem); el.classList.toggle('warn', rem <= 120); if (rem <= 0) { clearInterval(timerInt); finishChallenge(true); } }

  function renderQuestion() {
    if (idx >= att.questions.length) { finishChallenge(false); return; }
    var q = att.questions[idx]; selected = null;
    $('#hud-q').innerHTML = 'Question ' + (idx + 1) + ' <span class="hud-q-of">of ' + att.questions.length + '</span>';
    $('#hud-score').innerHTML = localScore + ' <small>pts</small>';
    $('#progress-fill').style.width = (idx / att.questions.length * 100) + '%';
    var bandName = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' }[q.band] || q.band;
    $('#qband').innerHTML = bandName + ' &middot; worth <b>' + q.points + ' points</b>';
    $('#next-btn').textContent = (idx === att.questions.length - 1) ? 'Finish challenge' : 'Next question';
    $('#next-btn').disabled = true;

    var card = $('#qcard'); card.innerHTML = '';
    var eb = document.createElement('p'); eb.className = 'q-eyebrow'; eb.innerHTML = '<span class="chip">' + esc(bandName) + '</span> ' + esc(q.points) + ' points &middot; ' + esc(q.title);
    var h = document.createElement('h2'); h.className = 'q-title'; h.textContent = q.title;
    var sc = document.createElement('p'); sc.className = 'q-scenario'; sc.textContent = q.scenario;
    card.appendChild(eb); card.appendChild(h); card.appendChild(sc);
    if (q.visual) { var v = renderVisual(q.visual); if (v) card.appendChild(v); }
    var pr = document.createElement('p'); pr.className = 'q-prompt'; pr.textContent = q.prompt; card.appendChild(pr);
    var ol = document.createElement('div'); ol.className = 'opts'; ol.setAttribute('role', 'group'); ol.setAttribute('aria-label', 'Answer options');
    q.options.forEach(function (o, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.setAttribute('data-id', o.id);
      b.innerHTML = '<span class="opt-key" aria-hidden="true">' + 'ABCD'.charAt(i) + '</span><span class="opt-text">' + esc(o.text) + '</span>';
      b.addEventListener('click', function () { selectOption(b); }); ol.appendChild(b);
    });
    card.appendChild(ol); card.focus && card.focus();
  }
  function selectOption(btn) { $all('.opt').forEach(function (b) { b.classList.remove('sel'); b.setAttribute('aria-pressed', 'false'); }); btn.classList.add('sel'); btn.setAttribute('aria-pressed', 'true'); selected = btn.getAttribute('data-id'); $('#next-btn').disabled = false; }
  function onNext() {
    if (selected == null || $('#next-btn').disabled) return;
    $('#next-btn').disabled = true; var q = att.questions[idx];
    call('answer', { questionId: q.id, optionId: selected }).then(function (r) {
      if (r && r.ok && typeof r.awarded === 'number') localScore += r.awarded;
      if (r && r.expired) { finishChallenge(true); return; }
      idx++; if (idx >= att.questions.length) finishChallenge(false); else renderQuestion();
    }).catch(function (err) {
      $('#next-btn').disabled = false; toast('Hiccup saving that answer — tap again.');
      if (window.console) console.error('answer failed', err);
    });
  }
  function finishChallenge(timedOut) {
    if (finishing) return; finishing = true; clearInterval(timerInt);
    call('finish', {}).then(function (r) { finishing = false; if (r && r.attempt) att = r.attempt; showResultsFromAttempt(timedOut); })
      .catch(function (err) { finishing = false; $('#next-btn').disabled = false; toast('Could not save your result — check your connection and tap Finish again.'); if (window.console) console.error('finish failed', err); });
  }

  /* ============================================================ RESULTS + LEADERBOARD ============================================================ */
  function showResultsFromAttempt(timedOut) {
    clearInterval(timerInt); var res = att && att.result; if (!res) { showScreen('screen-results'); return; }
    var t = rankTitle(res.pct);
    $('#rank-icon').textContent = res.icon || t.icon; $('#rank-title').textContent = res.title || t.label;
    $('#result-msg').textContent = (timedOut ? 'Time’s up! ' : '') + (res.message || t.msg);
    $('#sb-score').textContent = res.score; $('#sb-pct').textContent = res.pct + '%'; $('#sb-correct').textContent = res.correct + '/' + res.total; $('#sb-time').textContent = fmtTime(res.timeRemainingSec);
    $('#lb-class-name').textContent = '· ' + CLASS;
    showScreen('screen-results'); refreshLeaderboard(); clearInterval(lbPoll); lbPoll = setInterval(refreshLeaderboard, 12000);
  }
  function refreshLeaderboard() {
    call('leaderboard').then(function (r) {
      if (!r || !r.ok) return; var list = $('#lb-list'); list.innerHTML = '';
      (r.top || []).forEach(function (row, i) {
        var li = document.createElement('li'); li.className = 'lb-row' + (row.isMe ? ' me' : '');
        li.innerHTML = '<span class="lb-pos">' + (i + 1) + '</span><span class="lb-name">' + esc(row.firstName) + ' ' + esc(row.surnameInitial) + '.' + (row.isMe ? ' <small>(you)</small>' : '') + '</span><span class="lb-class">' + esc(row.className) + '</span><span class="lb-score">' + row.score + '</span>';
        list.appendChild(li);
      });
      if (r.me && r.me.pos) {
        $('#sb-rank').textContent = '#' + r.me.pos;
        var inTop = (r.top || []).some(function (x) { return x.isMe; });
        $('#lb-mine').innerHTML = inTop ? 'You are <b>#' + r.me.pos + '</b> of ' + r.me.total + ' in ' + esc(CLASS) + ' so far — well done!' : 'You are <b>#' + r.me.pos + '</b> of ' + r.me.total + ' in ' + esc(CLASS) + ' with <b>' + r.me.score + ' points</b>. Keep watching as more results come in.';
      }
    });
  }

  /* ============================================================ VISUAL RENDERER (8 types) ============================================================ */
  function renderVisual(v) {
    if (!v || !v.type) return null; var data = v.data || v; var wrap = document.createElement('div'); wrap.className = 'viz'; var body;
    try { switch (v.type) {
      case 'iconRow': body = vizIconRow(data); break; case 'iconGrid': body = vizIconGrid(data); break; case 'table': body = vizTable(data); break;
      case 'graph': body = vizGraph(data); break; case 'sequence': body = vizSequence(data); break; case 'tree': body = vizTree(data); break;
      case 'gridRoute': body = vizGridRoute(data); break; case 'pixelGrid': body = vizPixel(data); break; default: return null;
    } } catch (e) { return null; }
    if (!body) return null; wrap.appendChild(body);
    if (data.caption) { var c = document.createElement('p'); c.className = 'viz-caption'; c.textContent = data.caption; wrap.appendChild(c); }
    return wrap;
  }
  function iconCell(o) { var d = document.createElement('div'); var unknown = o && (o.icon === '?' || o.unknown); d.className = 'icon-cell' + (unknown ? ' unknown' : ''); if (!o) { d.style.visibility = 'hidden'; return d; } d.innerHTML = '<span class="ic">' + esc(unknown ? '?' : (o.icon || '')) + '</span>' + (o.label ? '<span class="ic-label">' + esc(o.label) + '</span>' : ''); return d; }
  function vizIconRow(d) { var r = document.createElement('div'); r.className = 'icon-row'; (d.items || []).forEach(function (o) { r.appendChild(iconCell(o)); }); return r; }
  function vizIconGrid(d) { var g = document.createElement('div'); g.className = 'icon-grid'; g.style.gridTemplateColumns = 'repeat(' + (d.cols || 3) + ', auto)'; (d.cells || []).forEach(function (o) { g.appendChild(iconCell(o)); }); return g; }
  function vizTable(d) {
    var wrap = document.createElement('div'); wrap.className = 'viz-table-wrap'; var t = document.createElement('table'); t.className = 'viz-table';
    var hi = {}; (d.highlight || []).forEach(function (p) { hi[p[0] + ',' + p[1]] = true; });
    var nums = [], hasNum = false; if (d.heat) (d.rows || []).forEach(function (row) { row.forEach(function (c) { var n = parseFloat(c); if (!isNaN(n) && String(c).trim() !== '') { nums.push(n); hasNum = true; } }); });
    var lo = hasNum ? Math.min.apply(null, nums) : 0, hiN = hasNum ? Math.max.apply(null, nums) : 1;
    if (d.headers) { var thead = document.createElement('thead'); var tr = document.createElement('tr'); d.headers.forEach(function (h) { var th = document.createElement('th'); th.textContent = h; tr.appendChild(th); }); thead.appendChild(tr); t.appendChild(thead); }
    var tb = document.createElement('tbody');
    (d.rows || []).forEach(function (row, ri) { var tr = document.createElement('tr'); row.forEach(function (c, ci) {
      var fch = (ci === 0 && d.rowHeaders); var cell = document.createElement(fch ? 'th' : 'td'); cell.textContent = c; if (hi[ri + ',' + ci]) cell.className = 'hi';
      if (d.heat && !fch) { var n = parseFloat(c); if (!isNaN(n) && String(c).trim() !== '') { var f = hiN === lo ? 0.5 : (n - lo) / (hiN - lo); cell.style.background = 'rgba(91,60,196,' + (0.08 + f * 0.5).toFixed(2) + ')'; if (f > 0.6) cell.style.color = '#fff'; } }
      tr.appendChild(cell); }); tb.appendChild(tr); });
    t.appendChild(tb); wrap.appendChild(t); return wrap;
  }
  function vizSequence(d) { var s = document.createElement('div'); s.className = 'seq'; (d.tiles || []).forEach(function (tile, i) { var el = document.createElement('div'); el.className = 'seq-tile'; var inner = ''; if (d.showIndex) inner += '<span class="st-idx">' + (i + 1) + '</span>'; if (tile.icon) inner += '<span class="st-icon">' + esc(tile.icon) + '</span>'; if (tile.label != null) inner += '<span class="st-label">' + esc(tile.label) + '</span>'; el.innerHTML = inner; s.appendChild(el); }); return s; }
  function vizPixel(d) { var g = document.createElement('div'); g.className = 'pix'; g.style.gridTemplateColumns = 'repeat(' + d.w + ', 26px)'; var pal = d.palette || {}; (d.cells || []).forEach(function (row) { row.forEach(function (k) { var c = document.createElement('div'); c.className = 'pix-cell'; c.style.background = pal[k] || '#fff'; g.appendChild(c); }); }); return g; }
  function svgWrap(vbW, vbH, inner, maxW) { var div = document.createElement('div'); div.innerHTML = '<svg viewBox="0 0 ' + Math.round(vbW) + ' ' + Math.round(vbH) + '" preserveAspectRatio="xMidYMid meet" role="img" style="width:100%;height:auto;max-width:' + Math.round(maxW || vbW) + 'px"><defs><marker id="gg-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="viz-arrow"/></marker></defs>' + inner + '</svg>'; return div.firstChild; }
  function edgeStop(cx, cy, ox, oy, halfW, halfH) { var dx = ox - cx, dy = oy - cy, len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len, rx = halfW + 3, ry = halfH + 3; var t = 1 / Math.sqrt((ux / rx) * (ux / rx) + (uy / ry) * (uy / ry)); return { x: cx + ux * t, y: cy + uy * t }; }
  function vizGraph(d) {
    var W = 360, H = 230, pad = 30, FS = 13, nodes = d.nodes || [], edges = d.edges || [], pos = {};
    nodes.forEach(function (n) { var w = Math.max(34, esc(n.label).length * 6.7 + 16); pos[n.id] = { x: pad + (n.x / 100) * (W - 2 * pad), y: pad + (n.y / 100) * (H - 2 * pad), w: w, h: 25 }; });
    var inner = '';
    edges.forEach(function (e) { var a = pos[e.from], b = pos[e.to]; if (!a || !b) return; var s = edgeStop(a.x, a.y, b.x, b.y, a.w / 2, a.h / 2), t = edgeStop(b.x, b.y, a.x, a.y, b.w / 2, b.h / 2);
      inner += '<line x1="' + s.x.toFixed(1) + '" y1="' + s.y.toFixed(1) + '" x2="' + t.x.toFixed(1) + '" y2="' + t.y.toFixed(1) + '" class="viz-edge"' + (d.directed ? ' marker-end="url(#gg-arrow)"' : '') + '/>';
      if (e.weight != null) { var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; inner += '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="11" fill="#fff" stroke="#E2E6EF"/><text x="' + mx.toFixed(1) + '" y="' + (my + 4).toFixed(1) + '" class="viz-edge-w" text-anchor="middle" font-size="' + FS + '">' + esc(e.weight) + '</text>'; } });
    nodes.forEach(function (n) { var p = pos[n.id]; inner += '<g class="viz-node"><rect x="' + (p.x - p.w / 2).toFixed(1) + '" y="' + (p.y - p.h / 2).toFixed(1) + '" width="' + p.w.toFixed(1) + '" height="' + p.h + '" rx="12"/><text x="' + p.x.toFixed(1) + '" y="' + (p.y + 4).toFixed(1) + '" text-anchor="middle" font-size="' + FS + '">' + esc(n.label) + '</text></g>'; });
    return svgWrap(W, H, inner, 560);
  }
  function vizGridRoute(d) {
    var cs = 44, w = d.w, h = d.h, W = w * cs, H = h * cs, wall = {}; (d.walls || []).forEach(function (p) { wall[p[0] + ',' + p[1]] = true; }); var inner = '';
    for (var r = 0; r < h; r++) for (var c = 0; c < w; c++) { var cls = wall[c + ',' + r] ? 'grid-wall' : 'grid-cell'; inner += '<rect x="' + (c * cs) + '" y="' + (r * cs) + '" width="' + cs + '" height="' + cs + '" class="' + cls + '"/>'; }
    if (d.start) inner += '<rect x="' + (d.start[0] * cs + 3) + '" y="' + (d.start[1] * cs + 3) + '" width="' + (cs - 6) + '" height="' + (cs - 6) + '" rx="7" class="grid-start"/>';
    if (d.goal) inner += '<rect x="' + (d.goal[0] * cs + 3) + '" y="' + (d.goal[1] * cs + 3) + '" width="' + (cs - 6) + '" height="' + (cs - 6) + '" rx="7" class="grid-goal"/>';
    (d.markers || []).forEach(function (m) { var cx = m.c * cs + cs / 2, cy = m.r * cs + cs / 2, both = m.icon && m.label != null; if (m.icon) inner += '<text x="' + cx + '" y="' + (cy + (both ? -3 : 6)) + '" text-anchor="middle" font-size="20">' + esc(m.icon) + '</text>'; if (m.label != null) inner += '<text x="' + cx + '" y="' + (cy + (both ? 13 : 5)) + '" class="grid-label" font-size="' + (esc(m.label).length > 3 ? 11 : 14) + '">' + esc(m.label) + '</text>'; });
    if (d.path && d.path.length > 1) { var pts = d.path.map(function (p) { return (p[0] * cs + cs / 2) + ',' + (p[1] * cs + cs / 2); }).join(' '); inner += '<polyline points="' + pts + '" class="grid-path"/>'; }
    return svgWrap(W, H, inner, Math.min(W, 480));
  }
  function vizTree(d) {
    var nodes = d.nodes || [], byId = {}; nodes.forEach(function (n) { byId[n.id] = Object.assign({ children: [] }, n); });
    nodes.forEach(function (n) { if (n.parent && byId[n.parent]) byId[n.parent].children.push(byId[n.id]); });
    var root = byId[d.rootId] || byId[(nodes[0] || {}).id]; if (!root) return null;
    var leaf = 0, maxDepth = 0;
    (function place(n, depth) { n.depth = depth; if (depth > maxDepth) maxDepth = depth; if (!n.children.length) n.x = leaf++; else { n.children.forEach(function (c) { place(c, depth + 1); }); n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2; } })(root, 0);
    var maxLabel = 0; nodes.forEach(function (n) { maxLabel = Math.max(maxLabel, esc(n.label).length); });
    var pillH = 28, FS = maxLabel > 9 ? 12 : 13, cw = Math.max(70, maxLabel * (FS * 0.62) + 22), rh = 66, cols = Math.max(1, leaf), rows = maxDepth + 1, W = cols * cw, H = rows * rh;
    function cx(n) { return n.x * cw + cw / 2; } function cy(n) { return n.depth * rh + pillH / 2 + 6; }
    var inner = '';
    nodes.forEach(function (raw) { var n = byId[raw.id]; n.children.forEach(function (c) { inner += '<line x1="' + cx(n).toFixed(1) + '" y1="' + (cy(n) + pillH / 2) + '" x2="' + cx(c).toFixed(1) + '" y2="' + (cy(c) - pillH / 2) + '" class="viz-edge"/>'; }); });
    nodes.forEach(function (raw) { var n = byId[raw.id], tw = Math.min(cw - 8, Math.max(40, esc(n.label).length * (FS * 0.62) + 16)); inner += '<g class="viz-node"><rect x="' + (cx(n) - tw / 2).toFixed(1) + '" y="' + (cy(n) - pillH / 2) + '" width="' + tw.toFixed(1) + '" height="' + pillH + '" rx="9"/><text x="' + cx(n).toFixed(1) + '" y="' + (cy(n) + 4) + '" text-anchor="middle" font-size="' + FS + '">' + esc(n.label) + '</text></g>'; });
    return svgWrap(W, H, inner, Math.min(W, 640));
  }

  /* ============================================================ STAFF: class management + reporting ============================================================ */
  function openStaff() { showScreen('screen-staff'); $('#staff-panel').hidden = true; $('#staff-locked').style.display = 'grid'; $('#staff-pass').value = ''; $('#staff-pass').focus(); }
  function staffUnlock() {
    var pass = $('#staff-pass').value, note = $('#staff-note'); note.hidden = true;
    call('admin', { passcode: pass, sub: 'data' }).then(function (r) {
      if (!r || !r.ok) {
        var msg = 'Could not open the dashboard — please try again.';
        if (r && r.error === 'bad-passcode') { msg = 'That passcode was not recognised.' + (typeof r.gotLen === 'number' ? ' (you sent ' + r.gotLen + ' characters; the saved passcode has ' + r.expLen + ')' : ''); }
        note.textContent = msg; note.hidden = false; return;
      }
      window._ggPass = pass; dashData = r; $('#staff-locked').style.display = 'none'; $('#staff-panel').hidden = false;
      loadClasses(); populateReport(r); renderDash();
    }).catch(function (err) {
      note.textContent = 'Could not open the dashboard — please try again in a moment.'; note.hidden = false;
      if (window.console) console.error('admin unlock failed', err);
    });
  }
  function loadDash() { if (!window._ggPass) return; call('admin', { passcode: window._ggPass, sub: 'data' }).then(function (r) { if (r && r.ok) { dashData = r; loadClasses(); populateReport(r); renderDash(); toast('Refreshed.'); } }); }

  function cmStatus(m) { $('#cm-status').textContent = m || ''; }
  function loadClasses() {
    call('admin', { passcode: window._ggPass, sub: 'classes' }).then(function (r) {
      if (!r || !r.ok) return; var sel = $('#cm-select'), keep = sel.value;
      sel.innerHTML = r.classes.length ? r.classes.map(function (c) { return '<option value="' + esc(c.name) + '">' + esc(c.name) + ' (' + c.count + ' done)</option>'; }).join('') : '<option value="">— no classes yet —</option>';
      if (keep) sel.value = keep;
      if (!r.classes.length) cmStatus('No classes yet — add your first one to start.');
    });
  }
  function cmAdd() { var name = $('#cm-new').value.trim(); if (!name) return; call('admin', { passcode: window._ggPass, sub: 'addClass', className: name }).then(function (r) { if (r && r.ok) { $('#cm-new').value = ''; cmStatus('Added ' + r.name + '. Share its link or QR with that class.'); loadClasses(); loadDash(); } else { cmStatus('Could not add that class name.'); } }); }
  function cmDelete() {
    var n = $('#cm-select').value; if (!n) return;
    askConfirm('Delete class ' + n + '?', 'This permanently deletes the ' + n + ' board and every result in it. This cannot be undone.', 'Delete ' + n, function () {
      call('admin', { passcode: window._ggPass, sub: 'deleteClass', className: n }).then(function (r) { if (r && r.ok) { cmStatus('Deleted ' + n + '.'); loadClasses(); loadDash(); } });
    });
  }
  function copyLink(link, done) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { cmStatus(done); }).catch(function () { cmStatus(link); }); else cmStatus(link); }
  function showQr(name) {
    var link = classLink(name), canvas = $('#qr-canvas'); $('#qr-class').textContent = name; $('#qr-link').textContent = link;
    if (!(window.QRCode && window.QRCode.toCanvas)) { cmStatus('QR library not loaded; link: ' + link); return; }
    window.QRCode.toCanvas(canvas, link, { width: 260, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#5B3CC4', light: '#ffffff' } }, function (err) { if (err) { cmStatus('Could not draw the QR code.'); return; } $('#qr-modal').hidden = false; });
  }

  /* ---- reporting (computed client-side from the raw participant list) ---- */
  var dashData = null, sortKey = 'rank', sortDir = 1;
  function populateReport(r) {
    var rc = $('#report-class'), yf = $('#filter-year'), rcv = rc.value, yv = yf.value;
    var classNames = (r.classes || []).map(function (c) { return c.name; });
    rc.innerHTML = '<option value="__ALL__">All classes</option>' + classNames.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
    var years = {}; (r.participants || []).forEach(function (p) { if (p.year) years[p.year] = 1; });
    yf.innerHTML = '<option value="">All years</option>' + Object.keys(years).sort().map(function (y) { return '<option>' + esc(y) + '</option>'; }).join('');
    rc.value = rcv || '__ALL__'; yf.value = yv;
  }
  function scopeParticipants() {
    if (!dashData) return [];
    var rc = $('#report-class').value, yr = $('#filter-year').value;
    var mn = parseInt($('#filter-min').value, 10); if (isNaN(mn)) mn = -1;
    var mx = parseInt($('#filter-max').value, 10); if (isNaN(mx)) mx = 99999;
    return dashData.participants.filter(function (p) { return (rc === '__ALL__' || p.className === rc) && (!yr || p.year === yr) && p.score >= mn && p.score <= mx; });
  }
  function withRanks(list) {
    var fin = list.filter(function (p) { return p.status === 'finished'; }).slice().sort(compareRank);
    var rankByEmail = {}; fin.forEach(function (p, i) { rankByEmail[p.email] = i + 1; });
    return list.map(function (p) { return Object.assign({}, p, { rank: p.status === 'finished' ? rankByEmail[p.email] : '' }); });
  }
  function setSort(key) { if (sortKey === key) sortDir = -sortDir; else { sortKey = key; sortDir = 1; } renderDash(); }
  function renderDash() {
    if (!dashData) return;
    var scoped = scopeParticipants(), ranked = withRanks(scoped), isAll = $('#report-class').value === '__ALL__';
    // stat cards
    var fin = scoped.filter(function (p) { return p.status === 'finished'; }), scores = fin.map(function (p) { return p.score; });
    var stats = [
      { n: scoped.length, l: 'participants' },
      { n: (scoped.length ? Math.round(fin.length / scoped.length * 100) : 0) + '%', l: 'completed' },
      { n: scores.length ? Math.round(scores.reduce(function (a, c) { return a + c; }, 0) / scores.length) : 0, l: 'average score' },
      { n: scores.length ? Math.max.apply(null, scores) : 0, l: 'highest' },
      { n: scores.length ? Math.min.apply(null, scores) : 0, l: 'lowest' }
    ];
    $('#stat-row').innerHTML = stats.map(function (s) { return '<div class="stat"><div class="stat-num">' + esc(s.n) + '</div><div class="stat-label">' + esc(s.l) + '</div></div>'; }).join('');
    // per-class overview (only on All classes)
    renderOverview(isAll);
    // table
    var rows = ranked.slice(); rows.sort(function (a, b) { var x = a[sortKey], y = b[sortKey]; if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y) * sortDir; return ((x || 0) - (y || 0)) * sortDir; });
    var tb = $('#dash-body'); tb.innerHTML = '';
    rows.forEach(function (p) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + (p.rank || '') + '</td><td>' + esc(p.name) + '</td><td>' + esc(p.className) + '</td><td class="score-cell">' + p.score + '</td><td>' + p.pct + '%</td><td>' + p.correct + '/' + p.total + '</td><td>' + fmtTime(p.timeTakenSec || p.completionSec || 0) + '</td><td>' + esc(p.title || '') + '</td><td><span class="pill ' + (p.status === 'finished' ? 'done' : 'live') + '">' + (p.status === 'finished' ? 'Finished' : 'In progress') + '</span></td>';
      tb.appendChild(tr);
    });
    if (!rows.length) tb.innerHTML = '<tr><td colspan="9" class="muted" style="text-align:center;padding:24px">No pupils match this view yet.</td></tr>';
    renderQStats(fin, isAll);
  }
  function renderOverview(show) {
    var box = $('#class-overview');
    if (!show) { box.hidden = true; box.innerHTML = ''; return; }
    var byClass = {}; dashData.participants.forEach(function (p) { (byClass[p.className] || (byClass[p.className] = [])).push(p); });
    var names = Object.keys(byClass).sort();
    if (!names.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = names.map(function (n) {
      var list = byClass[n], fin = list.filter(function (p) { return p.status === 'finished'; }), scores = fin.map(function (p) { return p.score; });
      var avg = scores.length ? Math.round(scores.reduce(function (a, c) { return a + c; }, 0) / scores.length) : 0;
      var top = fin.slice().sort(compareRank)[0];
      return '<div class="co-card"><div class="co-name">' + esc(n) + ' <span class="co-n">' + list.length + ' in &middot; ' + fin.length + ' done</span></div>' +
        '<div class="co-stats"><div class="co-stat">avg <b>' + avg + '</b></div><div class="co-stat">high <b>' + (scores.length ? Math.max.apply(null, scores) : 0) + '</b></div><div class="co-stat">low <b>' + (scores.length ? Math.min.apply(null, scores) : 0) + '</b></div><div class="co-stat">done <b>' + (list.length ? Math.round(fin.length / list.length * 100) : 0) + '%</b></div></div>' +
        (top ? '<div class="co-top">🥇 ' + esc(top.firstName) + ' ' + esc(top.surnameInitial) + '. — <b>' + top.score + '</b></div>' : '') + '</div>';
    }).join('');
  }
  function renderQStats(finished, isAll) {
    $('#qstats-sub').textContent = isAll ? 'Across all classes — the questions fewest pupils got right float to the top.' : 'For ' + $('#report-class').value + ' — the questions fewest pupils got right float to the top.';
    var qs = (window.GG_QUESTIONS || []).map(function (q) {
      var att = 0, ok = 0; finished.forEach(function (p) { if (p.perQuestion && q.id in p.perQuestion) { att++; if (p.perQuestion[q.id]) ok++; } });
      return { title: q.title, band: q.band, points: q.points, correctPct: att ? Math.round(ok / att * 100) : null };
    });
    qs.sort(function (a, b) { var x = a.correctPct == null ? 999 : a.correctPct, y = b.correctPct == null ? 999 : b.correctPct; return x - y; });
    $('#qstats').innerHTML = qs.map(function (q) {
      var pct = q.correctPct;
      return '<div class="qstat"><span class="qstat-label"><b>' + esc(q.title) + '</b> <small>' + esc(q.band) + ' · ' + q.points + 'pt</small></span><div class="qbar"><span class="' + (pct != null && pct < 40 ? 'low' : '') + '" style="width:' + (pct == null ? 0 : pct) + '%"></span></div><span class="qstat-pct">' + (pct == null ? '—' : pct + '%') + '</span></div>';
    }).join('');
  }
  function onReset() {
    var rc = $('#report-class').value;
    if (rc === '__ALL__') askConfirm('Clear ALL classes?', 'This permanently deletes every pupil result in EVERY class. The class boards themselves stay. This cannot be undone.', 'Clear everything', function () { doReset('__ALL__'); });
    else askConfirm('Clear results for ' + rc + '?', 'This permanently deletes every pupil result in ' + rc + ' so that class can take the challenge fresh. The ' + rc + ' board stays. This cannot be undone.', 'Clear ' + rc, function () { doReset(rc); });
  }
  function doReset(which) { call('admin', { passcode: window._ggPass, sub: 'reset', className: which }).then(function (r) { if (r && r.ok) { toast('Results cleared.'); loadDash(); } else { toast('Could not clear.'); } }); }
  function exportCsv() {
    var rows = withRanks(scopeParticipants());
    rows.sort(function (a, b) { return (a.className || '').localeCompare(b.className || '') || (a.rank || 99) - (b.rank || 99); });
    var head = ['Class', 'Rank', 'First name', 'Surname initial', 'Year', 'Score', 'Percentage', 'Correct', 'Total', 'Time taken (s)', 'Time left (s)', 'Title', 'Status'];
    var lines = [head.join(',')];
    rows.forEach(function (p) { lines.push([p.className, p.rank, p.firstName, p.surnameInitial, p.year, p.score, p.pct, p.correct, p.total, p.timeTakenSec || p.completionSec || 0, p.timeRemainingSec, p.title, p.status].map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',')); });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'challenge-results.csv'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }
})();
