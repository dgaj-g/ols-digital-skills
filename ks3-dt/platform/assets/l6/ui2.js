/* THE OPERATION · mechanic 2 · ui. One patient, two surgeons. Build once, patch every tick. Cause and effect on THIS screen (DFM 316c).
   URL: seat=A|B|C room=xxxx | solo=1 [bot=1 computer partner] | robot=1 (computer plays me) fast=1 seed=n at=door|table|done trio=1 lag=ms idle=ms still=1 */
(function () {
  var L = LINES, OP = OPENGINE2, U = L.ui2, $ = function (id) { return document.getElementById(id); };
  var Q = {}; location.search.slice(1).split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); Q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '1'); });
  var FAST = Q.fast === '1', PACE = FAST ? 0.3 : 1;
  var LAG = Q.lag != null ? +Q.lag : (FAST ? 500 : 2000), IDLE = Q.idle != null ? +Q.idle : (FAST ? 12000 : 40000);
  var solo = Q.solo === '1', bot = Q.bot === '1', seat = Q.seat || (solo ? 'A' : null), room = Q.room, robotMe = Q.robot === '1', AT = Q.at;
  var seats = Q.trio === '1' ? ['A', 'B', 'C'] : (solo && !bot ? ['A'] : ['A', 'B']);
  if (Q.still === '1') document.documentElement.classList.add('still');
  var clock = { now: function () { return Date.now(); }, setTimeout: function (f, ms) { return setTimeout(f, ms); } };
  function seeded(s) { s = s >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var rnd = Q.seed ? seeded(+Q.seed) : Math.random;
  var base = location.pathname.split('/').pop() || 'operation-test-2.html';
  function qs(o) { var keep = ['fast', 'lag', 'idle', 'seed', 'trio', 'robot', 'still']; var out = []; for (var k in o) if (o[k] != null) out.push(k + '=' + encodeURIComponent(o[k])); keep.forEach(function (k) { if (Q[k] != null && o[k] == null) out.push(k + '=' + encodeURIComponent(Q[k])); }); return base + '?' + out.join('&'); }
  function words(t) { return (t || '').split(/\s+/).filter(Boolean).length; }
  function pace(t) { return (1200 + 350 * words(t)) * PACE; }
  /* ---------- lobby ---------- */
  $('openpair').textContent = U.lobby.pair; $('openbot').textContent = U.lobby.robot; $('opensolo').textContent = U.lobby.solo; $('lobbynote').textContent = U.lobby.note;
  if (!seat) {
    $('openpair').onclick = function () { var r = Math.random().toString(36).slice(2, 6); var w = Math.round(screen.availWidth / 2); window.open(qs({ seat: 'B', room: r }), 'op-B', 'width=' + w + ',height=' + screen.availHeight + ',left=' + w + ',top=0'); location.replace(qs({ seat: 'A', room: r })); };
    $('openbot').onclick = function () { location.replace(qs({ solo: 1, bot: 1 })); };
    $('opensolo').onclick = function () { location.replace(qs({ solo: 1 })); };
    document.title = 'ready'; window.OPUI = { stage: 'lobby' }; return;
  }
  $('lobby').classList.remove('on');
  /* ---------- bus ---------- */
  function makeChannelBus(room, lag) {
    var id = Math.random().toString(36).slice(2), n = 0, seen = {}, hs = [], key = 'op2-' + room;
    var bc = ('BroadcastChannel' in window) ? new BroadcastChannel(key) : null;
    function deliver(m) { if (!m || !m.id || seen[m.id]) return; seen[m.id] = 1; setTimeout(function () { hs.forEach(function (h) { h(m); }); }, lag); }
    if (bc) bc.onmessage = function (e) { deliver(e.data); };
    window.addEventListener('storage', function (e) { if (e.key === key && e.newValue) { try { deliver(JSON.parse(e.newValue)); } catch (_) { } } });
    return { on: function (h) { hs.push(h); }, send: function (type, data) { var m = Object.assign({ type: type, t: Date.now(), id: id + '-' + (++n) }, data); if (bc) bc.postMessage(m); try { localStorage.setItem(key, JSON.stringify(m)); } catch (_) { } } };
  }
  var E, EB, robot, robotB, bus;
  if (solo) {
    bus = OP.makeLocalBus(LAG, clock); var epA = bus.endpoint(); E = OP.makeEngine({ seat: 'A', seats: seats, bus: epA, rnd: rnd, clock: clock, idleMs: IDLE }); epA.on(E.receive);
    if (bot) { var epB = bus.endpoint(); EB = OP.makeEngine({ seat: 'B', seats: seats, bus: epB, rnd: rnd, clock: clock, idleMs: IDLE }); epB.on(EB.receive); robotB = OP.makeRobot(EB, rnd, clock, FAST ? 0.35 : 1); EB.hello(); }
  } else { bus = makeChannelBus(room, LAG); E = OP.makeEngine({ seat: seat, seats: seats, bus: bus, rnd: rnd, clock: clock, idleMs: IDLE }); bus.on(E.receive); }
  if (robotMe) robot = OP.makeRobot(E, rnd, clock, FAST ? 0.35 : 1);
  var S = E.S, P = function () { return L.patients[S.pid]; };
  E.hello(); var helloTimer = setInterval(function () { if (S.others.every(function (s) { return S.presence[s].here; })) clearInterval(helloTimer); else E.hello(); }, 1500);
  /* ---------- face (carried from mechanic 1: it was never the fault) ---------- */
  var FACE_CSS = '<style>.pup{transition:transform .3s}.m-drive .pup{animation:dart 1.1s infinite}@keyframes dart{0%,100%{transform:translateX(-14px)}50%{transform:translateX(14px)}}.m-fan .drop{animation:drip 1.2s infinite}@keyframes drip{0%{opacity:0;transform:translateY(-6px)}50%{opacity:1}100%{opacity:0;transform:translateY(16px)}}.m-mem .q{animation:floatq 1.8s infinite}@keyframes floatq{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}.m-cpu .spin{transform-origin:270px 60px;animation:none}.shake{animation:fshake .5s}@keyframes fshake{0%,100%{transform:none}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}</style>';
  function face(mood) {
    var screenFill = mood === 'gpu' ? '#07090c' : mood === 'psu' ? '#2c3134' : mood === 'fan' ? '#ff9a7a' : mood === 'cpu' ? '#cfe6ff' : '#f6f1e6';
    var led = mood === 'psu' ? '#3a3f42' : '#5fd48a';
    var inner = '';
    if (mood !== 'gpu' && mood !== 'psu') {
      var eyes = mood === 'cpu' ? '<ellipse cx="120" cy="95" rx="22" ry="12" fill="#1a1a1a"/><ellipse cx="200" cy="95" rx="22" ry="12" fill="#1a1a1a"/>'
        : mood === 'fan' ? '<path d="M98 92 q22 -16 44 0" stroke="#1a1a1a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M178 92 q22 -16 44 0" stroke="#1a1a1a" stroke-width="7" fill="none" stroke-linecap="round"/>'
        : '<ellipse cx="120" cy="92" rx="24" ry="' + (mood === 'mem' ? 30 : 24) + '" fill="#fff" stroke="#1a1a1a" stroke-width="4"/><ellipse cx="200" cy="92" rx="24" ry="' + (mood === 'mem' ? 30 : 24) + '" fill="#fff" stroke="#1a1a1a" stroke-width="4"/>'
          + '<g class="pup"><circle cx="' + (mood === 'mem' ? 112 : 120) + '" cy="' + (mood === 'mem' ? 80 : 92) + '" r="10" fill="#1a1a1a"/><circle cx="' + (mood === 'mem' ? 192 : 200) + '" cy="' + (mood === 'mem' ? 80 : 92) + '" r="10" fill="#1a1a1a"/></g>';
      var mouth = mood === 'happy' || mood === 'nothing' ? '<path d="M120 150 q40 34 80 0" stroke="#1a1a1a" stroke-width="7" fill="none" stroke-linecap="round"/>'
        : mood === 'mem' ? '<ellipse cx="160" cy="152" rx="12" ry="14" fill="#1a1a1a"/>'
        : mood === 'drive' ? '<path d="M118 152 q14 -10 28 0 t28 0 t28 0" stroke="#1a1a1a" stroke-width="7" fill="none" stroke-linecap="round"/>'
        : mood === 'cpu' ? '<ellipse cx="160" cy="152" rx="20" ry="12" fill="#1a1a1a"/><text x="196" y="160" font-size="34" font-family="Space Grotesk,sans-serif" font-weight="700" fill="#1a1a1a">…</text>'
        : mood === 'fan' ? '<ellipse cx="160" cy="154" rx="26" ry="18" fill="#1a1a1a"/><ellipse cx="160" cy="160" rx="14" ry="8" fill="#ff6b8a"/>' : '';
      var extra = mood === 'mem' ? '<g class="q" font-family="Space Grotesk,sans-serif" font-weight="700" fill="#5a4a9e"><text x="54" y="60" font-size="34">?</text><text x="246" y="56" font-size="40">?</text><text x="150" y="40" font-size="28">?</text></g>'
        : mood === 'fan' ? '<g class="drop" fill="#4aa3ff"><ellipse cx="70" cy="70" rx="7" ry="11"/><ellipse cx="250" cy="110" rx="7" ry="11"/></g><g stroke="#ff3b3b" stroke-width="4" fill="none" opacity=".7"><path d="M40 190 q10 -10 20 0 t20 0"/><path d="M240 190 q10 -10 20 0 t20 0"/></g>'
        : mood === 'cpu' ? '<g class="spin" stroke="#2a66c4" stroke-width="6" fill="none"><circle cx="270" cy="60" r="16" stroke-dasharray="60 40"/></g><g fill="#2a66c4" font-size="26"><text x="40" y="60">✻</text><text x="60" y="200">✻</text></g>'
        : mood === 'drive' ? '<g fill="#1a1a1a" opacity=".8"><rect x="36" y="44" width="40" height="30" rx="4" fill="none" stroke="#1a1a1a" stroke-width="3"/><text x="44" y="67" font-size="18" font-family="Space Grotesk,sans-serif" font-weight="700">0</text></g>' : '';
      inner = eyes + mouth + extra;
    } else if (mood === 'gpu') { inner = ''; }
    return '<svg viewBox="0 0 320 250" class="m-' + mood + '" xmlns="http://www.w3.org/2000/svg">' + FACE_CSS
      + '<rect x="6" y="6" width="308" height="214" rx="18" fill="#30383d"/><rect x="20" y="20" width="280" height="186" rx="10" fill="' + screenFill + '"/>'
      + '<g>' + inner + '</g><circle cx="290" cy="212" r="4" fill="' + led + '"/><rect x="130" y="222" width="60" height="10" rx="3" fill="#30383d"/><rect x="100" y="232" width="120" height="12" rx="5" fill="#30383d"/></svg>';
  }
  var faceKey = null; function setFace(el, mood, shake) { var k = el.id + mood + (shake ? '!' : ''); if (k === faceKey && !shake) return; faceKey = k; el.innerHTML = face(mood); if (shake) el.firstElementChild.classList.add('shake'); }
  var NAME = { mem: 'memory', drive: 'storage drive', cpu: 'processor', gpu: 'graphics card', fan: 'fan', psu: 'power supply', board: 'motherboard' };
  /* ---------- build once ---------- */
  var ORDER = OP.shuffle(['mem', 'drive', 'cpu', 'gpu', 'fan', 'psu', 'board', 'fluff'], rnd);
  function build() {
    $('stages').innerHTML = U.stages.map(function (s, i) { return '<span data-i="' + i + '">' + s + '</span>'; }).join('');
    $('team').innerHTML = teamHTML(); $('touragain').textContent = U.tourAgain; $('lobbylab').textContent = U.lobby.lab;
    var h = ''; ORDER.forEach(function (p) {
      h += '<button class="slot" data-part="' + p + '" type="button" aria-label="' + (p === 'fluff' ? 'a bit of fluff' : 'a part') + '">' + '<img src="../img/l6/' + p + '.jpg" alt="" draggable="false">' + '<span class="badge"></span><span class="name"></span><span class="tick">✓</span></button>';
    }); $('slots').innerHTML = h;
    var ln = ''; for (var i = 0; i < 7; i++) ln += '<div class="ln" data-i="' + i + '"><span class="num">' + (i + 1) + '</span><span class="body"><span class="dots">' + U.emptyLine + '</span></span></div>'; $('lines').innerHTML = ln;
    $('beginbtn').textContent = U.begin; $('againbtn').textContent = U.again2; $('caselab').textContent = E.fmt(U.caselab);
    var mq = window.matchMedia('(max-width:1000px)'); function place() { var st = $('strip'); (mq.matches ? $('bar') : $('chartcol')).appendChild(st); } place(); mq.addEventListener('change', place);
    $('slots').querySelectorAll('.slot').forEach(function (b) { b.querySelectorAll('.badge,.name,.tick').forEach(function (x) { x.style.display = 'none'; }); });
  }
  /* ---------- speech: paced, one line at a time, never skipped ---------- */
  var sp = { q: [], cur: null, until: 0, seen: 0, lastTag: '' };
  function speechTick(now) {
    while (sp.seen < S.said.length) { sp.q.push(S.said[sp.seen++]); }
    if (sp.q.length && (!sp.cur || now >= sp.until)) { sp.cur = sp.q.shift(); sp.until = now + pace(sp.cur.tag === 'quiet' ? U.quiet : sp.cur.text); showLine(sp.cur); }
  }
  function showLine(e) {
    var quiet = e.tag === 'quiet'; var text = quiet ? E.fmt(U.quiet) : e.text;
    $('bwho').textContent = P().name.toUpperCase(); $('say').textContent = text; $('bubble').classList.toggle('quiet', quiet); $('bubble').classList.remove('empty');
    if (e.tag === 'idle') { $('instr').classList.remove('pulse'); void $('instr').offsetWidth; $('instr').classList.add('pulse'); }
    sp.lastTag = e.tag;
  }
  function resetSpeech() { sp.q = []; sp.cur = null; sp.until = 0; sp.seen = 0; $('say').textContent = ''; $('bubble').classList.add('empty'); }
  /* ---------- door ---------- */
  var door = { shown: false, t0: 0, timers: [] };
  function showDoor() {
    door.shown = true; door.t0 = clock.now(); door.timers.forEach(clearTimeout); door.timers = [];
    $('door').classList.add('on'); $('app').hidden = true; resetSpeech();
    $('doorface').innerHTML = face('happy'); $('doorname').textContent = P().name; $('doorwho').textContent = P().name.toUpperCase(); $('doorsay').textContent = P().open[0];
    var ps = $('goal').querySelectorAll('p'); ps.forEach(function (p) { p.classList.remove('on'); }); $('begin').classList.remove('on');
    $('together').innerHTML = bold(E.fmt(U.team, { p: S.me }) + ' ' + E.fmt(S.others.length === 0 ? U.alone : S.others.length === 1 ? U.together : U.together3, { p: L.callsigns[S.others[0]], q: L.callsigns[S.others[1]] }));
    var t = pace(P().open[0]) * 0.6;
    U.door.forEach(function (line, i) { var txt = E.fmt(line); door.timers.push(setTimeout(function () { ps[i].textContent = txt; ps[i].classList.add('on'); if (i === 2) $('begin').classList.add('on'); }, t)); t += pace(txt); });
    document.title = 'ready';
  }
  function hideDoor() { door.shown = false; door.timers.forEach(clearTimeout); $('door').classList.remove('on'); $('app').hidden = false; $('bubble').classList.add('empty'); }
  function bold(t) { return t.replace(/Dr \w+/g, function (m) { return '<b class="' + (m === S.me ? 'me' : 'them') + '">' + m + '</b>'; }); }
  function teamHTML() { var o = S.others; return bold(E.fmt(U.team, { p: S.me }) + ' ' + E.fmt(o.length === 0 ? U.teamAlone : o.length === 1 ? U.teamWith : U.teamWith3, { p: L.callsigns[o[0]], q: L.callsigns[o[1]] })); }
  /* ---------- the spotlight tour (DFM 322): each area lit in turn, one sentence, Next; once, reopenable ---------- */
  var TOUR = (function () {
    var KEY = 'op2.tour.seen', steps = [], i = -1, on = false;
    function enabled() { if (Q.tour === '0' || AT) return false; if (Q.tour === '1') return true; try { return !localStorage.getItem(KEY); } catch (e) { return true; } }
    function build() {
      steps = []; var o = S.others;
      U.tour.forEach(function (t) {
        if (t.pair && !o.length) return;
        var html = t.at === 'team' ? teamHTML() : t.at === 'strip' ? bold(E.fmt(o.length === 1 ? U.tourStrip : U.tourStrip3, { p: L.callsigns[o[0]], q: L.callsigns[o[1]] })) : E.fmt(t.say);
        steps.push({ at: t.at, html: html });
      });
    }
    function fits(b, W, H) { return b.left >= 16 && b.top >= 12 && b.left + b.w <= W - 16 && b.top + b.h <= H - 12; }
    function place() {
      var s = steps[i]; if (!s) return; var el = $(s.at); var r = el.getBoundingClientRect(), pad = 8;
      var spot = $('spot'); spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px'; spot.style.width = (r.width + 2 * pad) + 'px'; spot.style.height = (r.height + 2 * pad) + 'px';
      $('tourstep').textContent = U.tourStep.replace('{n}', i + 1).replace('{t}', steps.length); $('toursay').innerHTML = s.html; $('tournext').textContent = i === steps.length - 1 ? U.tourStart : U.tourNext;
      var box = $('tourbox'), W = window.innerWidth, H = window.innerHeight, bw = box.offsetWidth, bh = box.offsetHeight, gap = 14;
      var sl = r.left - pad, st = r.top - pad, sr = r.right + pad, sb = r.bottom + pad;
      var cx = Math.max(16, Math.min(sl, W - bw - 16));
      var cands = [{ left: cx, top: sb + gap }, { left: cx, top: st - gap - bh }, { left: sr + gap, top: Math.max(12, Math.min(st, H - bh - 12)) }, { left: sl - gap - bw, top: Math.max(12, Math.min(st, H - bh - 12)) }];
      var pick = null; for (var k = 0; k < cands.length && !pick; k++) { var c = cands[k]; c.w = bw; c.h = bh; if (fits(c, W, H)) pick = c; }
      if (!pick) pick = { left: Math.max(16, (W - bw) / 2), top: Math.max(12, H - bh - 12) };
      box.style.left = pick.left + 'px'; box.style.top = pick.top + 'px';
      S.lastAct = clock.now();
    }
    function start() { build(); if (!steps.length) return; i = 0; on = true; $('tour').hidden = false; place(); }
    function end() { on = false; i = -1; $('tour').hidden = true; try { localStorage.setItem(KEY, '1'); } catch (e) {} S.lastAct = clock.now(); }
    function next() { i++; if (i >= steps.length) end(); else place(); }
    $('tournext').onclick = next; $('touragain').onclick = function () { if (S.stage !== 'door') start(); };
    window.addEventListener('resize', function () { if (on) place(); });
    return { enabled: enabled, start: start, end: end, next: next, active: function () { return on; }, step: function () { return i; }, steps: function () { return steps; } };
  })();
  $('beginbtn').onclick = function () { if (E.begin()) { hideDoor(); render(); if (TOUR.enabled()) TOUR.start(); } };
  /* ---------- her hand: tap, or a drag that starts on a part (a teacher will drag) ---------- */
  var press = null;
  $('slots').addEventListener('pointerdown', function (e) { var b = e.target.closest('.slot'); if (!b) return; press = { part: b.dataset.part, t: clock.now() }; e.preventDefault(); });
  window.addEventListener('pointerup', function () { if (!press) return; var p = press; press = null; if (clock.now() - p.t <= 1500) act(p.part); });
  window.addEventListener('pointercancel', function () { press = null; });
  $('slots').addEventListener('click', function (e) { if (e.detail !== 0) return; var b = e.target.closest('.slot'); if (b) act(b.dataset.part); }); /* keyboard */
  $('slots').addEventListener('dragstart', function (e) { e.preventDefault(); });
  var cardsFor = null, wrongLocal = {};
  function act(part) {
    var r = E.tap(part); var b = $('slots').querySelector('[data-part="' + part + '"]');
    if (r === 'board') { setFace($('facewrap'), 'happy', true); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
    if (r === 'theirs' || r === 'sealed') { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
    render();
  }
  $('cardlist').addEventListener('click', function (e) { var c = e.target.closest('.card'); if (!c || c.classList.contains('wrong')) return; var r = E.card(c.dataset.key); if (r === 'wrong') { c.classList.add('wrong'); wrongLocal[c.dataset.key] = 1; } render(); });
  $('againbtn').onclick = function () { if (E.again()) { cardsFor = null; showDoor(); } };
  /* ---------- render: patch, never rebuild ---------- */
  var last = { bar: '', count: -1, chart: '', strip: '', stage: '', face: '', pr: '' };
  function cls(el, name, on) { if (el.classList.contains(name) !== !!on) el.classList.toggle(name, !!on); }
  function render() {
    var now = clock.now(), pr = E.prompt();
    if (S.stage === 'door') { if (!door.shown) showDoor(); } else if (door.shown || $('app').hidden) hideDoor();
    var stage = S.stage === 'door' ? 0 : S.stage === 'done' ? 2 : 1;
    $('stages').querySelectorAll('span').forEach(function (s, i) { cls(s, 'lit', i === stage); });
    /* face: her own cut, nothing else */
    var mood = S.my.out && S.my.out !== 'board' ? S.my.out : 'happy'; setFace($('facewrap'), mood, false);
    /* slots */
    $('slots').querySelectorAll('.slot').forEach(function (b) {
      var p = b.dataset.part;
      if (p === 'fluff') { cls(b, 'gone', S.fluff !== 'in'); return; }
      var x = S.parts[p]; var mineOut = x.status === 'out' && x.by === S.seat, theirs = x.status === 'out' && x.by !== S.seat, sealed = x.status === 'sealed';
      cls(b, 'out', mineOut && p !== 'board'); cls(b, 'theirs', theirs); cls(b, 'sealed', sealed); cls(b, 'told', sealed && x.told);
      var badge = b.querySelector('.badge'), name = b.querySelector('.name'), tick = b.querySelector('.tick');
      badge.style.display = theirs ? '' : 'none'; if (theirs && badge.textContent !== L.callsigns[x.by]) badge.textContent = L.callsigns[x.by];
      name.style.display = sealed ? '' : 'none'; if (sealed && name.textContent !== NAME[p]) name.textContent = NAME[p];
      tick.style.display = sealed ? '' : 'none';
    });
    /* chart */
    var key = S.chart.join() + '|' + S.pid; if (key !== last.chart) {
      last.chart = key; $('charttitle').textContent = E.fmt(U.chart); $('chartsub').textContent = U.chartSub;
      $('lines').querySelectorAll('.ln').forEach(function (ln, i) {
        var p = S.chart[i], body = ln.querySelector('.body');
        if (!p) { body.innerHTML = '<span class="dots">' + U.emptyLine + '</span>'; ['.by', '.job'].forEach(function (c) { var e = ln.querySelector(c); if (e) e.remove(); }); return; }
        var x = S.parts[p]; body.innerHTML = '<img src="../img/l6/' + p + '.jpg" alt=""><span class="sent">' + E.fmt(L.jobs[p].line).replace('{part}', '<b>' + NAME[p] + '</b>') + '</span>';
        var job = ln.querySelector('.job'); if (job) job.remove();
        var by = ln.querySelector('.by'); if (!by) { by = document.createElement('span'); by.className = 'by'; ln.appendChild(by); } var mine = x.by === S.seat; by.textContent = E.fmt(x.told ? (mine ? U.toldMe : U.toldBy) : (mine ? U.foundMe : U.foundBy), { p: L.callsigns[x.by] }); cls(by, 'me', mine);
      });
    }
    var n = E.sealedCount(); if (n !== last.count) { last.count = n; $('count').textContent = E.fmt(U.count, { n: n }); }
    /* strip */
    var strip = $('strip'); if (!S.others.length) strip.hidden = true; else {
      var txt = S.stage === 'done' ? E.fmt(S.others.length === 1 ? U.reveal : U.reveal3) : E.presence().map(function (x) { return x.text; }).join('\n');
      if (txt !== last.strip) { last.strip = txt; strip.innerHTML = txt.split('\n').map(function (t) { return '<div>' + t.replace(/^(Dr \w+)/, '<b>$1</b>') + '</div>'; }).join(''); }
    }
    /* cards */
    var showCards = S.stage === 'op' && !!S.my.out; cls($('cards'), 'on', showCards);
    if (showCards && cardsFor !== S.my.out) {
      cardsFor = S.my.out; wrongLocal = {}; var board = cardsFor === 'board';
      $('cardimg').src = '../img/l6/' + cardsFor + '.jpg'; $('cardcap').textContent = board ? U.stays : U.took; $('cardh').textContent = board ? U.whichBoard : U.which;
      $('cardlist').innerHTML = E.cards().map(function (c) { return '<button class="card" type="button" data-key="' + c.key + '">' + c.job + '</button>'; }).join('');
    }
    if (!showCards) cardsFor = null;
    /* bar */
    if (pr.text !== last.bar) { last.bar = pr.text; $('instr').textContent = pr.text; cls($('instr'), 'sting', /again|lost|theirs|sealed/.test(pr.kind)); }
    /* done */
    var done = S.stage === 'done'; cls($('done'), 'on', done);
    if (done && last.stage !== 'done') { $('doneh').textContent = U.done; $('donep').textContent = S.seats.map(function (s) { return E.fmt(U.found, { p: L.callsigns[s], n: S.counts[s] }); }).join(' '); $('donereveal').textContent = S.others.length ? E.fmt(S.others.length === 1 ? U.reveal : U.reveal3) : ''; $('donenote').textContent = S.others.length ? U.revealNote : ''; }
    last.stage = S.stage;
    speechTick(now);
    $('hint').textContent = S.others.length && !solo ? U.lobby.note : '';
  }
  build();
  var cardsOnce = false;
  function loop() { E.tick(); if (EB) { EB.tick(); if (!TOUR.active()) robotB.tick(); } if (robot) robot.tick(); render(); }
  setInterval(loop, 100);
  /* jumps for the look and the harness */
  if (AT === 'table' || AT === 'done') { E.begin(); }
  if (AT === 'done') { OP.PARTS.forEach(function (p) { E.tap(p); E.card(p); }); }
  render(); document.title = 'ready';
  window.OPUI = { tour: TOUR, E: E, EB: EB, S: S, act: act, card: function (k) { var r = E.card(k); render(); return r; }, begin: function () { var r = E.begin(); render(); return r; }, render: render, speech: sp, Q: Q };
})();
