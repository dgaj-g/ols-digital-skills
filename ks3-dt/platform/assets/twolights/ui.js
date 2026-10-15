/* TWO LIGHTS · the page. One iframe per stage of the hour; the platform hands the stage, seat, room, names and the save in
   the hash (Engines.twolights). Every word on screen comes from TwoLightsStrings. The page ticks the engine and draws.
   Tester only (localhost / file:): ?stage=ch1&solo=1  ·  ?stage=ch1&seat=A&room=abcd[&seats=ABC]  (two tabs, one room)
   ·  &fast=1 (short budgets)  ·  &still=1 (no motion, for screenshots)  ·  &fire=1 (the real Firebase room) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TS = TwoLightsStrings, R = TS.render, PR = TwoLightsPrograms, EN = TwoLightsEngine, A = TwoArt, SND = window.TwoSound;
  var Q = {}; location.search.slice(1).split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); Q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '1'); });
  var H = null; try { if (location.hash.length > 1) H = JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch (e) { H = null; }
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  if (!LOCAL) Q = {};
  if (Q.still) document.documentElement.classList.add('still');
  function post(type, data) { if (window.parent === window) return; var m = { op: 1, type: type }; for (var k in data || {}) m[k] = data[k]; window.parent.postMessage(m, '*'); }
  function words(t) { return String(t || '').split(/\s+/).filter(Boolean).length; }
  function pace(t) { return Q.fast ? 400 : 1200 + 350 * words(t); }   // films ≥ 1.2 s + 0.35 s a word
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- who, where ---------- */
  var STAGE, seat, seats, room, live = false;
  if (H) { STAGE = H.stage || 'ch1'; seat = H.seat || 'A'; seats = (H.seats && H.seats.length) ? H.seats : ['A']; room = H.room || null; live = seats.length > 1 && !!room; }
  else {
    STAGE = Q.stage || 'ch1'; seat = Q.seat || 'A'; room = Q.room || null;
    seats = Q.solo || !room ? ['A'] : (Q.seats || 'AB').split('');
    live = !!Q.fire && seats.length > 1;
  }
  var pair = seats.length > 1 && !!room;
  var NAMES = (H && H.names) || null;
  var BUDGETS = (H && H.budgets) || (Q.fast ? { ch1: 90000, ch2: 90000, ch3: 90000, ch4: 120000 } : null);
  var T0 = (H && H.t0) || null;
  var CALL = EN.CALL, NAME = function (s) { return PR.SEATS[s].name; };
  function othersOf(s) { return (seats.length > 1 ? seats : ['A', 'B']).filter(function (x) { return x !== s; }); }
  var clock = { now: function () { return Date.now(); }, setTimeout: function (f, ms) { return setTimeout(f, ms); } };

  /* ---------- the bus ---------- */
  var FALLBACK = false, bus = null, E = null;
  function openBus() {
    if (!pair) return null;
    if (!live) return TLLIVE.makeChannelBus(room, seat, +(Q.lag || 300));
    var hs = [], fb = null, timer, w = { on: function (h) { hs.push(h); }, send: function (t, d) { if (fb && !FALLBACK) fb.send(t, d); }, now: function () { return fb ? fb.now() : Date.now(); } };
    try {
      if (!window.firebase || !window.LIVE_CONFIG) throw new Error('files');
      var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.LIVE_CONFIG);
      fb = TLLIVE.makeFireBus(app.database(), room, seat);
      fb.on(function (m) { if (!FALLBACK) hs.forEach(function (h) { h(m); }); });
    } catch (e) { fb = null; }
    if (!fb || (H && H.fallback)) { setTimeout(goFallback, 0); return w; }
    timer = setTimeout(function () { if (!fb.connected()) goFallback(); }, TLLIVE.FALLBACK_MS);
    fb.whenConnected(function () { clearTimeout(timer); if (E) E.hello(); });
    w.fb = fb;
    return w;
  }
  function goFallback() {   // "The live link is slow. Share one laptop and take turns." (§6) — never a dead screen
    if (FALLBACK) return; FALLBACK = true; post('fallback');
    if (bus && bus.fb) bus.fb.close();
    if (seat !== 'A') {
      $('app').hidden = true; $('stage').hidden = true; $('tour').hidden = true;
      $('away').hidden = false; $('away').textContent = R('bar.slow'); return;
    }
    if (E) { E.goSlow(); render(); }
  }

  /* ---------- the stage pills ---------- */
  var PILLS = ['radio', 'coldopen', 'tour', 'ch1', 'ch2', 'ch3', 'ch4', 'home'];
  function pills() {
    var at = PILLS.indexOf(STAGE);
    $('pills').innerHTML = PILLS.map(function (p, i) { return '<span class="' + (i === at ? 'lit' : i < at ? 'past' : '') + '">' + esc(R('pill.' + p)) + '</span>'; }).join('');
  }
  function topLine(s) {
    var o = othersOf(s);
    if (!pair || (E && E.S.mode !== 'pair')) return R('top.solo');
    if (o.length > 1) return R('top.trio', { mine: NAME(s), other: NAME(o[0]), third: NAME(o[1]) });
    return R('top.pair', { mine: NAME(s), other: NAME(o[0]) });
  }

  /* ---------- the engine (chapters; also holds the save for every stage) ---------- */
  var CHS = ['ch1', 'ch2', 'ch3', 'ch4'];
  var isCh = CHS.indexOf(STAGE) >= 0;
  bus = openBus();
  E = EN.makeEngine({ seat: seat, seats: seats.length > 1 ? seats : ['A', 'B'], room: room || 'solo', stage: STAGE, mode: pair ? 'pair' : 'solo', bus: pair ? bus : null, clock: clock, budgets: BUDGETS || undefined });
  if (H && H.save) { try { E.restore(H.save); E.setStage(STAGE); } catch (e) { } }
  if (bus) { bus.on(function (m) { E.receive(m); }); E.hello(); }
  function save() { post('save', { save: E.snapshot() }); }

  /* ---------- the window: the bay ---------- */
  var bay = $('bay'), bc = bay.getContext('2d'), hornUntil = {}, rewindUntil = 0, cheerAt = 0;
  function fitBay() { var r = bay.getBoundingClientRect(), d = window.devicePixelRatio || 1; bay.width = Math.max(1, Math.round(r.width * d)); bay.height = Math.max(1, Math.round(r.height * d)); }
  function drawLight(c, v, x, y, s, T) {
    var lamp = v.lamp ? 1 : 0;
    if (lamp) A.beam(c, x, y, s * 11, T + x, 1, x > 180 ? -1 : 1);
    if (v.seat === 'C') A.lightship(c, x, y, s, { awake: lamp, smile: v.done ? 1 : 0, t: T });
    else A.lighthouse(c, x, y, s, { awake: lamp, smile: v.done ? 1 : 0, t: T });
    var hn = hornUntil[v.seat] && hornUntil[v.seat] > Date.now();
    if (hn || v.horn) {   // the horn's drawn twin: rings off the tower
      c.save(); c.strokeStyle = 'rgba(242,193,78,' + (hn ? 0.9 : 0.45) + ')'; c.lineWidth = 2;
      var k = hn ? ((Date.now() / 350) % 1) : 0.4;
      for (var i = 0; i < 3; i++) { c.beginPath(); c.arc(x + s * 1.8, y + s * 2.4, s * (0.8 + i * 0.7 + k * 0.7), -0.7, 0.7); c.stroke(); }
      c.restore();
    }
  }
  function drawBay(T) {
    var W = bay.width, Hh = bay.height; if (W < 4) return;
    var c = bc, sc = W / 369; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, Hh);
    var h = Hh / sc; c.setTransform(sc, 0, 0, sc, 0, 0);
    A.sea(c, 369, h, Math.min(90, h * 0.3), T);
    var ws = isCh || STAGE === 'tour' ? E.windowSeats() : othersOf(seat).map(function (s) { return { seat: s, lamp: 0, horn: 0 }; });
    var lit = 0, sz = Math.min(23, h / 9.5);
    ws.forEach(function (v, i) {
      var x = ws.length > 1 ? 70 + i * 140 : 150, y = Math.max(8, h * 0.08);
      drawLight(c, v, x, y, ws.length > 1 ? sz * 0.82 : sz, T); if (v.lamp) lit++;
    });
    A.rocks(c, 325, h * 0.72, 22, T);
    var p = isCh ? E.boat() : { x: 0, drifting: false };
    var turning = isCh && (E.allDone(STAGE));
    var bx = 30 + (p.x || 0) * 255, by = h * 0.76;
    A.fog(c, 369, h, T, Math.max(0.25, 0.85 - lit * 0.28 - (turning ? 0.3 : 0)));
    A.boat(c, bx, by, Math.min(21, h / 12), turning ? 'cheer' : 'worried', T, turning ? 0 : 0.05);
    if (p.drifting && p.x > 0.35) A.inset(c, 6, 6, 150, 82, 'worried', T);   // the puffins' faces, close up (art round 3)
    if (isCh && E.paused()) { c.fillStyle = 'rgba(5,12,24,.45)'; c.fillRect(0, 0, 369, h); }
  }

  /* ---------- the radios ---------- */
  var radioBuilt = '';
  function buildRadios() {
    var ws = E.windowSeats(), key = ws.map(function (v) { return v.seat; }).join('') + E.S.mode;
    if (key === radioBuilt) return; radioBuilt = key;
    var show = E.S.mode === 'pair';
    $('radios').hidden = !show; if (!show) { $('radios').innerHTML = ''; return; }
    $('radios').innerHTML = ws.map(function (v) {
      return '<div class="radio" id="radio' + v.seat + '"><div class="rh"><span>' + esc(CALL[v.seat]) + '</span><span class="rv" id="rv' + v.seat + '"></span></div>' +
        '<div class="rb">' + EN.SLIPS.map(function (k) { return '<button type="button" data-to="' + v.seat + '" data-slip="' + k + '">' + esc(R('radio.' + k)) + '</button>'; }).join('') + '</div>' +
        '<div class="slip" id="slip' + v.seat + '"></div></div>';
    }).join('');
    Array.prototype.forEach.call($('radios').querySelectorAll('button'), function (b) {
      b.onclick = function () {
        SND.unlock(); E.radio(b.dataset.to, b.dataset.slip); SND.play('crackle');
        b.classList.add('sent'); setTimeout(function () { b.classList.remove('sent'); }, 1200); render();
      };
    });
  }
  function paintRadios() {
    if (E.S.mode !== 'pair') return;
    E.windowSeats().forEach(function (v) {
      var rv = $('rv' + v.seat); if (rv) rv.textContent = v.radio ? v.radio : '';
      var sl = $('slip' + v.seat); if (!sl) return;
      var last = null; E.S.slips.forEach(function (x) { if (x.from === v.seat && x.ch === STAGE) last = x; });
      var t = last ? R('slip.' + last.slip, { SIGN: CALL[v.seat] }) : '';
      if (sl.textContent !== t) sl.textContent = t;
    });
  }

  /* ---------- the bounty board ---------- */
  var KINDS = ['name', 'type', 'indent', 'called', 'return'];
  function buildBoard(el, onPick) {
    el.innerHTML = KINDS.map(function (k) {
      var p = R('poster.' + k).split(' · ');
      return '<button class="poster" type="button" data-k="' + k + '"><span class="pins"></span><b>' + esc(p[0]) + '</b>' + esc(p[1] || '') + '</button>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('.poster'), function (b) { b.onclick = function () { onPick(b.dataset.k, b); }; });
  }
  function shake(b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
  function boardPick(k, b) {
    SND.unlock();
    var L = E.S.L[E.S.active];
    if (L && L.nameQ.length) { var r = E.name(k); if (r && !r.right) shake(b); save(); render(); return; }
    var bl = E.bar();
    if (bl && bl.card && !E.S.cardPick) { var x = E.cardAnswer(k); if (!x.right) shake(b); render(); setTimeout(function () { E.nextCard(); render(); }, 1800); }
  }
  function paintBoard() {
    var paid = {}; KINDS.forEach(function (k) { paid[k] = 0; });
    E.S.local.forEach(function (s) { var bt = E.S.L[s].bounty; Object.keys(bt).forEach(function (id) { if (bt[id] === 'paid') paid[TwoLightsJudge.KIND[id]]++; }); });
    var L = E.S.L[E.S.active], bl = E.bar(), ask = !!(L && L.nameQ.length) || !!(bl && bl.card && !E.S.cardPick);
    Array.prototype.forEach.call($('board').querySelectorAll('.poster'), function (b) {
      b.classList.toggle('ask', ask);
      var n = paid[b.dataset.k], pins = b.querySelector('.pins');
      if (pins.childNodes.length !== n) pins.innerHTML = new Array(n + 1).join('<i></i>');
    });
    var cr = E.crew();
    $('crew').textContent = STAGE === 'ch4' ? R('crew.total', { n: cr.n, m: cr.m }) : '';
  }

  /* ---------- the code ---------- */
  var ed = $('ed'), shownSeat = null, redLn = null;
  function caretLine() { return ed.value.slice(0, ed.selectionStart).split('\n').length; }
  function gutter() {
    var n = ed.value.split('\n').length, out = [];
    for (var i = 1; i <= Math.max(n, 1); i++) out.push(i === redLn ? '<b>' + i + '</b>' : String(i));
    $('gutter').innerHTML = out.join('\n');
    ed.style.height = 'auto'; ed.style.height = Math.max(ed.scrollHeight, $('code').clientHeight - 2) + 'px';
  }
  ed.addEventListener('input', function () { E.edit(ed.value, caretLine()); render(); });
  ed.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') { e.preventDefault(); var s = ed.selectionStart; ed.value = ed.value.slice(0, s) + '    ' + ed.value.slice(ed.selectionEnd); ed.selectionStart = ed.selectionEnd = s + 4; E.edit(ed.value, caretLine()); render(); }
    if (e.key === 'Enter') {   // keep the indent, as an editor would
      var st = ed.selectionStart, ls = ed.value.lastIndexOf('\n', st - 1) + 1, ind = (ed.value.slice(ls, st).match(/^ */) || [''])[0];
      if (/:\s*$/.test(ed.value.slice(ls, st))) ind += '    ';
      if (ind) { e.preventDefault(); ed.value = ed.value.slice(0, st) + '\n' + ind + ed.value.slice(ed.selectionEnd); ed.selectionStart = ed.selectionEnd = st + 1 + ind.length; E.edit(ed.value, caretLine()); render(); }
    }
  });
  ed.addEventListener('click', function () { E.S.L[E.S.active] && (E.S.L[E.S.active].line = caretLine()); });
  $('run').onclick = function () {
    SND.unlock(); var r = E.run(); if (!r) return; save();
    if (r.red) SND.play('red');
    if (E.S.mode !== 'pair' && E.S.L[E.S.active].done[STAGE] && E.S.local.some(function (s) { return !E.S.L[s].done[STAGE]; })) {
      setTimeout(function () { var was = E.S.active; E.nextProgram(); if (E.S.active !== was) showOther(was); render(); }, Q.fast ? 600 : 2600);
    }
    render();
  };
  function showOther(s) {   // solo: she moves to the other light, and now sees the one she just lit
    var v = E.windowSeats().filter(function (x) { return x.seat === s; })[0];
    if (v && v.lamp) SND.play('lamp');
    if (v && v.horn) { hornUntil[s] = Date.now() + 1400 * v.horn; setTimeout(function () { SND.play('horn'); }, 700); }
  }
  $('conwrap').onclick = function () { E.readRed(); render(); };
  function paintCode() {
    var s = E.S.active;
    if (s !== shownSeat) { shownSeat = s; ed.value = E.code(s); $('filehead').textContent = PR.SEATS[s].file; }
    var L = E.S.L[s], res = L && L.res[STAGE];
    var done = L && L.done[STAGE];
    ed.readOnly = !!done; $('run').disabled = !!done && E.S.mode === 'pair';
    var red = res && res.red ? res.redText : '';
    var m = red.match(/line (\d+)/g); redLn = m ? +m[m.length - 1].slice(5) : null;
    var con = (res ? (res.console || []).map(esc).join('\n') : '') + (red ? (res.console && res.console.length ? '\n' : '') + '<span class="r">' + esc(red) + '</span>' : '');
    if ($('con').innerHTML !== con) $('con').innerHTML = con;
    gutter();
  }

  /* ---------- the bar, the help, presence ---------- */
  var lastBar = '';
  function paintBar() {
    var b = E.bar(), t = b ? R(b.id, b.vars || {}) : '';
    if (t !== lastBar) { lastBar = t; $('barline').textContent = t; $('barline').classList.remove('flash'); void $('barline').offsetWidth; $('barline').classList.add('flash'); }
    var hp = E.help(), h = '';
    if (E.S.late && isCh) {
      var ls = E.lateLines();
      if (ls.length) h = esc(R('late.line')) + '<div class="late">' + ls.map(function (x) { return x.n + '  ' + esc(x.text); }).join('\n') + '</div>';
    } else if (hp) {
      h = hp.id === 'help.putback' ? esc(R('help.name.3', { fix: hp.code, n: hp.line })) : esc(R(hp.id, hp.vars || {}));
    }
    if ($('help').innerHTML !== h) $('help').innerHTML = h;
    var pr = E.presence().map(function (p) { return R(p.id, p.vars); }).join('   ');
    if ($('pres').textContent !== pr) $('pres').textContent = pr;
    var mine = topLine(E.S.active);
    if ($('mine').textContent !== mine) $('mine').textContent = mine;
    $('pause').textContent = R(E.paused() ? 'btn.carry' : 'btn.pause');
    var lateOk = isCh && !E.S.late && T0 && Date.now() - T0 >= 45 * 60000;
    $('late').hidden = !lateOk; $('late').textContent = R('btn.late');
    var stageDone = isCh && (E.allDone(STAGE));
    $('go').hidden = !stageDone || !turnShown; $('go').textContent = R('btn.next');
    var bl = E.bar();
    var cardOn = bl && bl.card && isCh;
    $('card').hidden = !cardOn;
    if (cardOn) {
      var x = E.card(), pk = E.S.cardPick;
      $('cardsrc').textContent = x.src;
      $('cardsay').textContent = pk ? (pk.right ? R('poster.' + pk.kind).split(' · ')[0] + ' ✓' : R('poster.' + pk.kind).split(' · ')[0]) : R('bar.name');
    }
  }
  $('pause').onclick = function () { SND.unlock(); var on = !E.paused(); E.pause(on); SND.hold(on); save(); render(); };
  $('late').onclick = function () { E.late(); save(); render(); };
  $('go').onclick = function () { $('go').disabled = true; save(); post('next'); };
  $('again').onclick = function () { startTour(false); };

  /* ---------- events: sound and its drawn twin ---------- */
  var turnShown = false, sayTimer = null;
  E.on(function (e) {
    if (e.type === 'peerrun') {
      if (e.lamp) SND.play('lamp');
      if (e.horn) { hornUntil[e.seat] = Date.now() + 1400 * e.horn; setTimeout(function () { SND.play('horn'); }, e.lamp ? 800 : 0); }
    }
    if (e.type === 'crackle' && !e.mine) { SND.play('crackle'); var r = $('radio' + e.from); if (r) { r.classList.remove('crackle'); void r.offsetWidth; r.classList.add('crackle'); } }
    if (e.type === 'bounty' || e.type === 'cardright') SND.play('coin');
    if (e.type === 'rewind') { SND.play('rewind'); rewindUntil = Date.now() + 2000; }
    if (e.type === 'turning') { SND.play('cheer'); cheerAt = Date.now(); setTimeout(function () { turnShown = true; save(); render(); }, Q.fast ? 500 : 3000); }
    if (e.type === 'pause') SND.hold(!!e.on);
    if (e.type === 'say') say(R(e.id));
  });
  function say(t) {
    $('saytext').textContent = t; $('say').hidden = false;
    var g = $('saygrille').getContext('2d'); g.clearRect(0, 0, 80, 60); A.grille(g, 40, 30, 26, 1);
    SND.play('crackle'); clearTimeout(sayTimer);
    sayTimer = setTimeout(function () { $('say').hidden = true; }, pace(t) + 4000);
  }

  /* ---------- render + tick ---------- */
  function render() {
    if (!isCh && STAGE !== 'tour') return;
    buildRadios(); paintRadios(); paintCode(); paintBar(); paintBoard();
    $('black').hidden = Date.now() >= rewindUntil; $('black').textContent = R('rewind');
  }
  var lastSave = 0;
  function frame(ms) { drawBay(ms / 1000); requestAnimationFrame(frame); }
  function startMain() {
    $('app').hidden = false; pills(); buildBoard($('board'), boardPick);
    $('run').textContent = R('btn.run'); $('conhead').textContent = R('console.head');
    $('again').textContent = R('btn.again'); $('again').hidden = !isCh;
    fitBay(); window.addEventListener('resize', function () { fitBay(); render(); });
    if (E.allDone(STAGE)) turnShown = true;
    render(); requestAnimationFrame(frame);
    setInterval(function () {
      E.tick(); render();
      if (Date.now() - lastSave > 15000) { lastSave = Date.now(); save(); }
    }, 250);
    document.title = 'ready';
  }

  /* ---------- the tour (six spotlights) ---------- */
  var tourSteps = [];
  function startTour(stageEnd) {
    tourSteps = [['code', 'tour.1'], ['conwrap', 'tour.2'], ['baywrap', 'tour.3'], ['radios', 'tour.4'], ['boardwrap', 'tour.5'], ['baywrap', 'tour.6']]
      .filter(function (s) { return s[0] !== 'radios' || !$('radios').hidden; });
    var i = 0; $('tour').hidden = false;
    function show() {
      var last = i >= tourSteps.length;
      var el = last ? $('right') : $(tourSteps[i][0]), r = el.getBoundingClientRect(), sp = $('spot');
      sp.style.left = (r.left - 6) + 'px'; sp.style.top = (r.top - 6) + 'px'; sp.style.width = (r.width + 12) + 'px'; sp.style.height = (r.height + 12) + 'px';
      $('tourstep').textContent = last ? '' : (i + 1) + ' / ' + tourSteps.length;
      $('toursay').textContent = last ? R('tour.last') : R(tourSteps[i][1]).replace(/\. /g, '.\n');
      $('tournext').textContent = R('btn.next');
      var bx = $('tourbox'), bw = Math.min(420, innerWidth - 32), left = r.left < innerWidth / 2 ? Math.min(r.right + 16, innerWidth - bw - 16) : Math.max(16, r.left - bw - 16);
      if (r.width > innerWidth * 0.6) left = (innerWidth - bw) / 2;
      bx.style.left = left + 'px'; bx.style.top = Math.max(16, Math.min(r.top, innerHeight - 220)) + 'px';
    }
    $('tournext').onclick = function () {
      SND.unlock(); i++;
      if (i > tourSteps.length) { $('tour').hidden = true; if (stageEnd) { $('tournext').disabled = true; save(); post('next'); } return; }
      show();
    };
    show();
  }

  /* ---------- the paced stages: ceremony and cold open ---------- */
  var scene = $('scene'), sx = scene.getContext('2d');
  function sceneLoop(draw) { (function f(ms) { if ($('stage').hidden) return; draw(sx, ms / 1000); requestAnimationFrame(f); })(0); }
  function playLines(lines, then) {
    var el = $('slines'); el.innerHTML = lines.map(function (l, i) { return '<p' + (i === 0 && l.big ? ' class="big"' : '') + '>' + esc(l.t) + '</p>'; }).join('');
    var ps = el.querySelectorAll('p'), i = 0;
    (function next() {
      if (i >= ps.length) { then(); return; }
      ps[i].classList.add('on'); var t = lines[i].t; i++;
      setTimeout(next, pace(t));
    })();
  }
  function ceremony() {
    $('stage').hidden = false;
    var o = othersOf(seat), lines = [{ t: R('cer.1'), big: 1 }];
    if (!pair) { lines.push({ t: R('cer.solo') }); }
    else {
      lines.push({ t: R('cer.2', { mine: NAME(seat) }) });
      if (seat === 'C') lines.push({ t: R('cer.3', { other: NAME(o[0]) + ' and the ' + NAME(o[1]) }) });
      else { lines.push({ t: R('cer.3', { other: NAME(o[0]) }) }); if (o.length > 1) lines.push({ t: R('cer.trio') }); }
      lines.push({ t: R('cer.4') }, { t: R('cer.5') });
    }
    var glowAt = Date.now();
    sceneLoop(function (c, T) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1200, 520); var s = 1200 / 369; c.setTransform(s, 0, 0, s, 0, 0);
      A.sea(c, 369, 160, 70, T); A.fog(c, 369, 160, T, 0.9);
      var k = Math.max(0, 1 - ((Date.now() - glowAt) % 2600) / 2600);
      A.grille(c, 184, 70, 34, k);
    });
    setTimeout(function () { SND.play('ceremony'); }, 300);
    playLines(lines, function () {
      $('snext').hidden = false; $('snext').textContent = R('btn.begin');
      $('snext').onclick = function () { SND.unlock(); $('snext').disabled = true; post('begin'); post('next'); };
    });
  }
  function coldOpen() {
    $('stage').hidden = false;
    sceneLoop(function (c, T) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1200, 520); var s = 1200 / 369; c.setTransform(s, 0, 0, s, 0, 0);
      A.sea(c, 369, 160, 40, T); A.rocks(c, 320, 120, 22, T);
      A.lighthouse(c, 60, 14, 12, { awake: 0, t: T });
      A.fog(c, 369, 160, T, 1); A.boat(c, 150 + Math.sin(T * 0.3) * 12, 118, 22, 'worried', T, 0.06);
      A.inset(c, 6, 6, 120, 64, 'worried', T);
    });
    setTimeout(function () { SND.play('horn'); }, 600);
    playLines([{ t: R('open.1') }, { t: R('open.2') }, { t: R('open.3') }, { t: R('open.4') }], function () {
      $('snext').hidden = false; $('snext').textContent = R('btn.tour');
      $('snext').onclick = function () { SND.unlock(); $('snext').disabled = true; save(); post('next'); };
    });
  }

  /* ---------- home ---------- */
  function home() {
    $('home').hidden = false; post('done', { save: E.snapshot() });
    var hs = $('homescene'), c = hs.getContext('2d');
    (function f(ms) {
      var T = ms / 1000; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1200, 420); var s = 1200 / 369; c.setTransform(s, 0, 0, s, 0, 0);
      A.sea(c, 369, 130, 40, T); A.beam(c, 60, 12, 300, T, 1, 1); A.lighthouse(c, 60, 12, 11, { awake: 1, smile: 1, t: T });
      A.beam(c, 310, 12, 300, T + 2, 1, -1); A.lighthouse(c, 310, 12, 11, { awake: 1, smile: 1, t: T });
      A.boat(c, 185, 100, 22, 'cheer', T, 0);
      if (!$('home').hidden) requestAnimationFrame(f);
    })(0);
    SND.play('cheer');
    var paid = 0, m = 0; E.S.local.forEach(function (s) { var b = E.S.L[s].bounty; for (var k in b) if (b[k] === 'paid') paid++; m += 3; });
    if (!m) m = 3;
    function body(names) {
      var h = '<p>' + esc(R('home.1')) + '</p>';
      if (!pair || E.S.mode !== 'pair') h += '<p class="reveal">' + esc(R('home.solo')) + '</p>';
      else othersOf(seat).forEach(function (o) {
        var first = names && names['ABC'.indexOf(o)];
        if (first) h += '<p class="reveal">' + esc(R('home.reveal', { other: NAME(o), first: first })) + '</p>';
      });
      h += '<p>' + esc(R('home.bounties', { n: paid, m: m, badges: 'Red Reader, Radio Keeper, Bounty Hunter' })) + '</p>';
      $('hbody').innerHTML = h;
    }
    body(NAMES);
    window.addEventListener('message', function (ev) { var d = ev.data || {}; if (d.type === 'names' && d.names) { NAMES = d.names; body(NAMES); } });
    setTimeout(function () {
      $('hnext').hidden = false; $('hnext').textContent = R('btn.exit');
      $('hnext').onclick = function () { $('hnext').disabled = true; post('next'); };
    }, Q.fast ? 300 : 4000);
    document.title = 'ready';
  }

  /* ---------- extras: more posters ---------- */
  function extras() {
    $('extras').hidden = false; $('xhead').textContent = R('extras.1');
    var i = 0, done = {};
    function want(x, r) {
      if (r.error) return false;
      if (x.want.print) return (r.out || []).join('\n').indexOf(x.want.print) >= 0;
      if (x.want.fx) return (r.effects || []).some(function (e) { return e.fx === x.want.fx; });
      if (x.want.radio) return (r.effects || []).some(function (e) { return e.fx === 'radio' && String(e.v) === x.want.radio; });
      return false;
    }
    function show() {
      var x = PR.EXTRAS[i], fixed = false;
      $('xbody').innerHTML = '<div style="font-size:13px;color:#6b5a3a">' + (i + 1) + ' / ' + PR.EXTRAS.length + '</div><textarea class="xsrc" id="xsrc" spellcheck="false" wrap="off"></textarea>' +
        '<button class="btn" id="xrun" type="button"></button><pre id="xcon"></pre><div id="xboard"></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px"><button class="btn" id="xnext" type="button" hidden></button><button class="ghost" id="xfin" type="button" style="color:#1b1405;border-color:#b9a77d"></button></div>';
      $('xsrc').value = x.src; $('xrun').textContent = R('btn.run'); $('xnext').textContent = R('btn.next');
      $('xfin').textContent = (H && H.finishLabel) || 'Finish';
      $('xfin').onclick = function () { save(); post('next'); };
      buildBoard($('xboard'), function (k, b) {
        if (!fixed || done[x.id]) return;
        if (k === x.kind) { done[x.id] = 1; SND.play('coin'); b.querySelector('.pins').innerHTML = '<i></i>'; if (i < PR.EXTRAS.length - 1) $('xnext').hidden = false; }
        else shake(b);
      });
      $('xrun').onclick = function () {
        SND.unlock(); var r = PyRun.run($('xsrc').value, { file: 'poster.py' });
        $('xcon').innerHTML = (r.out || []).map(esc).join('\n') + (r.red ? '<span class="r">' + esc(r.red) + '</span>' : '');
        if (r.red) SND.play('red');
        if (want(x, r)) { fixed = true; Array.prototype.forEach.call($('xboard').querySelectorAll('.poster'), function (p) { p.classList.add('ask'); }); }
      };
      $('xnext').onclick = function () { i++; show(); };
    }
    show(); document.title = 'ready';
  }

  /* ---------- go ---------- */
  window.TLUI = { E: E, R: R, render: render, goFallback: goFallback, stage: STAGE, tour: startTour };
  if (STAGE === 'radio') ceremony();
  else if (STAGE === 'coldopen') coldOpen();
  else if (STAGE === 'tour') { startMain(); setTimeout(function () { startTour(true); }, 300); }
  else if (isCh) startMain();
  else if (STAGE === 'home') home();
  else if (STAGE === 'extras') extras();
  post('ready');
})();
