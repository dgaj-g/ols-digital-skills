/* THE OPERATION · mechanic 2 · ui. One patient, two surgeons. Build once, patch every tick. Cause and effect on THIS screen (DFM 316c).
   URL: seat=A|B|C room=xxxx | solo=1 [bot=1 computer partner] | robot=1 (computer plays me) fast=1 seed=n at=door|table|done trio=1 lag=ms idle=ms still=1 */
(function () {
  var L = LINES, OP = OPENGINE2, U = L.ui2, $ = function (id) { return document.getElementById(id); };
  var Q = {}; location.search.slice(1).split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); Q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '1'); });
  /* THE LESSON ROUTE (spec §7): the platform hands the stage, seat and room in the hash; the query string above is the tester's
     only, and only on this machine (DFM 323: pupils never see a tester lobby). */
  var H = null; try { if (location.hash.length > 1) H = JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch (e) { H = null; }
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  if (!LOCAL) Q = {};
  if (H) { Q = {}; Q.at = H.stage === 'op' ? 'table' : null; if (H.seed != null) Q.seed = String(H.seed); }
  var STAGE = H ? (H.stage || 'door') : (Q.stage || 'door');
  if (STAGE === 'ward' || STAGE === 'letter') { window.OPHASH = H || { stage: STAGE, seat: Q.seat || 'A', seats: (Q.seats || 'A').split(''), room: Q.room || null }; return; }
  function post(type, data) { if (window.parent === window) return; var m = { op: 1, type: type }; for (var k in data || {}) m[k] = data[k]; window.parent.postMessage(m, '*'); }
  var NAMES = (H && H.names) || null;
  var FAST = Q.fast === '1', PACE = FAST ? 0.3 : 1;
  var LAG = Q.lag != null ? +Q.lag : (FAST ? 500 : 2000), IDLE = Q.idle != null ? +Q.idle : (FAST ? 12000 : 40000);
  var solo = Q.solo === '1', bot = Q.bot === '1', seat = Q.seat || (solo ? 'A' : null), room = Q.room, robotMe = Q.robot === '1', AT = Q.at;
  var seats = Q.trio === '1' ? ['A', 'B', 'C'] : (solo && !bot ? ['A'] : ['A', 'B']);
  var live = false; /* true: the Firebase room (the lesson route, or the tester with fire=1) */
  if (H) { seats = (H.seats && H.seats.length) ? H.seats : ['A']; seat = H.seat || 'A'; room = H.room || null; solo = seats.length < 2 || !room; live = !solo; }
  else if (!LOCAL) { solo = true; seat = 'A'; seats = ['A']; }
  else if (Q.fire === '1' && room) live = true;
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
  if (!seat && LOCAL && !H) {
    $('openpair').onclick = function () { var r = Math.random().toString(36).slice(2, 6); var w = Math.round(screen.availWidth / 2); window.open(qs({ seat: 'B', room: r }), 'op-B', 'width=' + w + ',height=' + screen.availHeight + ',left=' + w + ',top=0'); location.replace(qs({ seat: 'A', room: r })); };
    $('openbot').onclick = function () { location.replace(qs({ solo: 1, bot: 1 })); };
    $('opensolo').onclick = function () { location.replace(qs({ solo: 1 })); };
    document.title = 'ready'; window.OPUI = { stage: 'lobby' }; return;
  }
  if (!seat) { solo = true; seat = 'A'; seats = ['A']; }
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
  /* ---------- the live room (spec §4): Firebase, no sign-in; never a dead screen ---------- */
  var FALLBACK = false, FB = { A: 'The live link is slow. Share one laptop and take turns.', B: 'Go and sit with {p}. You share one laptop.' };
  function openLive() {
    var hs = [], fb = null, timer;
    var w = { on: function (h) { hs.push(h); }, send: function (t, d) { if (fb && !FALLBACK) fb.send(t, d); } };
    try {
      if (!window.firebase || !window.LIVE_CONFIG || !window.OPLIVE) throw new Error('files');
      var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.LIVE_CONFIG);
      fb = OPLIVE.makeFireBus(app.database(), room, seat);
      fb.on(function (m) { if (!FALLBACK) hs.forEach(function (h) { h(m); }); });
      window.OPBUS = fb;
    } catch (e) { fb = null; }
    if (!fb || (H && H.fallback)) { setTimeout(goFallback, 0); return w; }
    timer = setTimeout(function () { if (!fb.connected()) goFallback(); }, OPLIVE.FALLBACK_MS);
    fb.whenConnected(function () { clearTimeout(timer); });
    return w;
  }
  function goFallback() {
    if (FALLBACK) return; FALLBACK = true; post('fallback');
    if (window.OPBUS) window.OPBUS.close();
    if (seat !== 'A') { $('door').classList.remove('on'); $('app').hidden = true; $('tour').hidden = true; $('away').hidden = false; $('awaysay').textContent = FB.B.replace('{p}', L.callsigns.A); document.title = 'ready'; return; }
    /* seat A's laptop runs both surgeons, taking turns, part by part */
    var pair = ['A', 'B'], lb = OP.makeLocalBus(150, clock), ea = lb.endpoint(), eb = lb.endpoint();
    var stage = S.stage; E = OP.makeEngine({ seat: 'A', seats: pair, bus: ea, rnd: rnd, clock: clock, idleMs: IDLE }); ea.on(E.receive);
    EB = OP.makeEngine({ seat: 'B', seats: pair, bus: eb, rnd: rnd, clock: clock, idleMs: IDLE }); eb.on(EB.receive);
    if (stage !== 'door') { E.begin(); EB.begin(); }
    S = E.S; E.hello(); EB.hello(); turns.on = true; turns.n = 0; resetSpeech(); cardsFor = null; last.chart = ''; last.strip = ''; $('team').innerHTML = teamHTML(); render();
  }
  var turns = { on: false, n: 0 };
  function turnTick() { /* the part is back in: hand the laptop to the other surgeon */
    if (!turns.on || S.stage !== 'op' || S.my.out) return; var n = E.sealedCount(); if (n === turns.n) return; turns.n = n;
    var t = E; E = EB; EB = t; S = E.S; sp.seen = S.said.length; sp.q = []; cardsFor = null; last.chart = ''; last.strip = ''; $('team').innerHTML = teamHTML();
  }
  var E, EB, robot, robotB, bus;
  if (solo) {
    bus = OP.makeLocalBus(LAG, clock); var epA = bus.endpoint(); E = OP.makeEngine({ seat: 'A', seats: seats, bus: epA, rnd: rnd, clock: clock, idleMs: IDLE }); epA.on(E.receive);
    if (bot) { var epB = bus.endpoint(); EB = OP.makeEngine({ seat: 'B', seats: seats, bus: epB, rnd: rnd, clock: clock, idleMs: IDLE }); epB.on(EB.receive); robotB = OP.makeRobot(EB, rnd, clock, FAST ? 0.35 : 1); EB.hello(); }
  } else if (live) {
    bus = openLive(); E = OP.makeEngine({ seat: seat, seats: seats, bus: bus, rnd: rnd, clock: clock, idleMs: IDLE }); bus.on(E.receive);
  } else { bus = makeChannelBus(room, LAG); E = OP.makeEngine({ seat: seat, seats: seats, bus: bus, rnd: rnd, clock: clock, idleMs: IDLE }); bus.on(E.receive); }
  if (robotMe) robot = OP.makeRobot(E, rnd, clock, FAST ? 0.35 : 1);
  var S = E.S, P = function () { return L.patients[S.pid]; };
  if (H && H.round > 0) E.setRound(+H.round);
  E.hello(); var helloTimer = setInterval(function () { if (S.others.every(function (s) { return S.presence[s].here; })) clearInterval(helloTimer); else E.hello(); }, 1500);
  /* ---------- face (carried from mechanic 1: it was never the fault) ---------- */
  var face = window.OPFACE;
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
    door.ready = false; door.togetherHtml = $('together').innerHTML;
    U.door.forEach(function (line, i) { var txt = E.fmt(line); door.timers.push(setTimeout(function () { ps[i].textContent = txt; ps[i].classList.add('on'); if (i === 2) door.ready = true; doorBegin(); }, t)); t += pace(txt); });
    document.title = 'ready';
  }
  function allHere() { return solo || turns.on || S.others.every(function (s) { return S.presence[s].here; }); }
  function doorBegin() {
    if (!door.shown) return; var here = allHere();
    cls($('begin'), 'on', door.ready);
    $('beginbtn').disabled = !here;
    var away = S.others.filter(function (s) { return !S.presence[s].here; });
    var html = here ? door.togetherHtml : bold(away.map(function (s) { return E.fmt(U.presence.away, { p: L.callsigns[s] }); }).join(' '));
    if ($('together').innerHTML !== html) $('together').innerHTML = html;
  }
  function hideDoor() { door.shown = false; door.timers.forEach(clearTimeout); $('door').classList.remove('on'); $('app').hidden = false; $('bubble').classList.add('empty'); }
  function bold(t) { return t.replace(/Dr \w+/g, function (m) { return '<b class="' + (m === S.me ? 'me' : 'them') + '">' + m + '</b>'; }); }
  function teamHTML() { var o = S.others; return bold(E.fmt(U.team, { p: S.me }) + ' ' + E.fmt(o.length === 0 ? U.teamAlone : o.length === 1 ? U.teamWith : U.teamWith3, { p: L.callsigns[o[0]], q: L.callsigns[o[1]] })); }
  /* ---------- the spotlight tour (DFM 322): each area lit in turn, one sentence, Next; once, reopenable ---------- */
  var TOUR = (function () {
    var KEY = 'op2.tour.seen', steps = [], i = -1, on = false;
    function enabled() { if (Q.tour === '0' || (AT && !H)) return false; if (Q.tour === '1') return true; try { return !localStorage.getItem(KEY); } catch (e) { return true; } }
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
  $('beginbtn').onclick = function () {
    if (!allHere()) return;
    if (H && STAGE === 'door') { $('beginbtn').disabled = true; post('begin'); return; }
    if (turns.on && EB) EB.begin();
    if (E.begin()) { hideDoor(); render(); if (TOUR.enabled()) TOUR.start(); }
  };
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
  $('againbtn').onclick = function () { if (E.again()) { if (turns.on && EB) { EB.setRound(S.round); turns.n = 0; } cardsFor = null; post('save', { round: S.round }); showDoor(); } };
  /* ---------- render: patch, never rebuild ---------- */
  var last = { bar: '', count: -1, chart: '', strip: '', stage: '', face: '', pr: '' };
  function cls(el, name, on) { if (el.classList.contains(name) !== !!on) el.classList.toggle(name, !!on); }
  function render() {
    var now = clock.now(), pr = E.prompt();
    if (FALLBACK && seat !== 'A') return;
    if (S.stage === 'door') { if (!door.shown) showDoor(); doorBegin(); } else if (door.shown || $('app').hidden) hideDoor();
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
    if (done && last.stage !== 'done') {
      $('doneh').textContent = U.done; $('donep').textContent = S.seats.map(function (s) { return E.fmt(U.found, { p: L.callsigns[s], n: S.counts[s] }); }).join(' ');
      revealNames(); $('donenote').textContent = S.others.length && !H ? U.revealNote : '';
      post('done', { save: { pid: S.pid, round: S.round, seats: S.seats, counts: S.counts, chart: S.chart.map(function (p) { return { part: p, by: S.parts[p].by, told: !!S.parts[p].told }; }) } });
    }
    last.stage = S.stage;
    speechTick(now);
    var hint = S.others.length && !solo && !H ? U.lobby.note : ''; if ($('hint').textContent !== hint) $('hint').textContent = hint;
    var ln = turns.on ? FB.A : ''; if ($('livenote').textContent !== ln) { $('livenote').textContent = ln; $('livenote').hidden = !ln; }
  }
  /* the real names, from the platform once the chart is complete (as Lesson 1's reveal) */
  function revealNames() {
    var o = turns.on ? [] : S.others, el = $('donereveal');
    if (!o.length) { el.textContent = ''; return; }
    if (H && !NAMES) { el.textContent = ''; return; }
    var nm = function (s) { var i = S.seats.indexOf(s); return NAMES && NAMES[i] ? NAMES[i] : L.callsigns[s]; };
    el.textContent = E.fmt(o.length === 1 ? U.reveal : U.reveal3, { p: nm(o[0]) }).replace(L.callsigns[o[1]] || '\u0000', o[1] ? nm(o[1]) : '');
  }
  window.addEventListener('message', function (e) {
    var m = e.data; if (e.source !== window.parent || !m || m.op !== 1) return;
    if (m.type === 'names' && m.names) { NAMES = m.names; if (S.stage === 'done') revealNames(); }
  });
  if (H) { $('nextbtn').textContent = 'Continue'; $('nextbtn').hidden = false; $('nextbtn').onclick = function () { post('next'); }; $('awaybtn').textContent = 'Continue'; $('awaybtn').onclick = function () { post('next'); }; }
  build();
  var cardsOnce = false;
  function loop() { if (FALLBACK && seat !== 'A') return; E.tick(); if (EB) { EB.tick(); if (robotB && !TOUR.active()) robotB.tick(); } if (robot) robot.tick(); turnTick(); render(); }
  setInterval(loop, 100);
  /* jumps for the look and the harness */
  if (AT === 'table' || AT === 'done') { E.begin(); }
  if (AT === 'done') { OP.PARTS.forEach(function (p) { E.tap(p); E.card(p); }); }
  render(); document.title = 'ready';
  post('ready', { stage: STAGE });
  window.OPUI = { tour: TOUR, get E() { return E; }, get EB() { return EB; }, get S() { return S; }, fallback: function () { return FALLBACK; }, goFallback: goFallback, act: act, card: function (k) { var r = E.card(k); render(); return r; }, begin: function () { var r = E.begin(); render(); return r; }, render: render, speech: sp, Q: Q };
})();
