/* THE OPERATION · mechanic 2 · ONE PATIENT, TWO SURGEONS · engine.
   One shared patient. Every seat runs this engine; all cross-seat facts travel as bus messages and each window derives
   its own patient speech, so cause and effect stay on the screen that acted (DFM 316c). Clock is injectable: no timers
   inside, tick() does the time work, so the whole thing runs in virtual time for the gates.
   makeEngine({seat, seats, bus, pid, rnd, clock, idleMs}) → {S, hello, begin, tap, card, again, receive, tick, prompt, presence, free, cards, fmt} */
(function (root) {
  var L = root.LINES || (typeof require !== 'undefined' ? (require('./lines.js'), require('./lines2.js')) : null);
  var PARTS = ['mem', 'drive', 'cpu', 'gpu', 'fan', 'psu', 'board'];
  var PULLABLE = ['mem', 'drive', 'cpu', 'gpu', 'fan', 'psu'];
  var PIDS = ['bernadette', 'desmond', 'nigel'];
  var NOTICE_MS = 3000, SECOND_LINE_MS = 4000;
  function shuffle(a, rnd) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function makeEngine(o) {
    var seat = o.seat, seats = o.seats || ['A', 'B'], bus = o.bus, rnd = o.rnd || Math.random;
    var clock = o.clock || { now: function () { return Date.now(); } };
    var IDLE = o.idleMs != null ? o.idleMs : 40000;
    var others = seats.filter(function (s) { return s !== seat; });
    var S = { seat: seat, seats: seats, me: L.callsigns[seat], others: others, round: 0, pid: o.pid || PIDS[0], stage: 'door',
      parts: {}, fluff: 'in', my: { out: null, wrongs: 0, outAt: 0, said2: false }, said: [], notice: null, chart: [], counts: {}, presence: {},
      lastAct: 0, idleN: 0, waitSaid: false, log: [], hooks: [], stats: { wrong: 0, told: 0, lost: 0, taps: 0 } };
    seats.forEach(function (s) { S.counts[s] = 0; }); others.forEach(function (s) { S.presence[s] = { here: false, state: 'away', at: 0 }; });
    function P() { return L.patients[S.pid]; }
    function fmt(s, extra) {
      var p = P(), x = extra || {}, pn = x.p != null ? x.p : (others[0] ? L.callsigns[others[0]] : ''), qn = others[1] ? L.callsigns[others[1]] : '';
      return s.replace(/\{me\}/g, p.name).replace(/\{Pro\}/g, cap(p.pronoun)).replace(/\{pro\}/g, p.pronoun).replace(/\{him\}/g, p.pronoun === 'she' ? 'her' : 'him')
        .replace(/\{his\}/g, p.his).replace(/\{His\}/g, cap(p.his)).replace(/\{p\}/g, pn).replace(/\{q\}/g, qn).replace(/\{n\}/g, x.n != null ? x.n : sealedCount());
    }
    function log(k, d) { S.log.push({ t: clock.now(), k: k, d: d || null }); S.hooks.forEach(function (h) { h(k, d); }); }
    function say(text, tag) { var e = { text: text, tag: tag, t: clock.now() }; S.said.push(e); log('say', e); }
    function send(type, data) { data = data || {}; data.seat = seat; data.round = S.round; bus.send(type, data); }
    function notice(key, who) { S.notice = { key: key, seat: who || null, t: clock.now() }; log('notice', key); }
    function sealedCount() { var n = 0; PARTS.forEach(function (p) { if (S.parts[p].status === 'sealed') n++; }); return n; }
    function free() { return PARTS.filter(function (p) { return S.parts[p].status === 'in'; }); }
    function reset(pid) {
      S.pid = pid; S.stage = 'door'; S.fluff = 'in'; S.my = { out: null, wrongs: 0, outAt: 0, said2: false }; S.said = []; S.notice = null; S.chart = []; S.waitSaid = false; S.idleN = 0;
      PARTS.forEach(function (p) { S.parts[p] = { status: 'in', by: null, at: 0, told: false }; }); seats.forEach(function (s) { S.counts[s] = 0; });
      others.forEach(function (s) { if (S.presence[s].here) S.presence[s].state = 'look'; });
    }
    reset(S.pid);
    function markSealed(part, by, told) {
      var p = S.parts[part]; if (p.status === 'sealed') return false;
      p.status = 'sealed'; p.by = by; p.told = !!told; p.sealedAt = clock.now(); S.counts[by] = (S.counts[by] || 0) + 1; S.chart.push(part); log('sealed', { part: part, by: by, told: !!told });
      if (sealedCount() === PARTS.length) { S.stage = 'done'; say(P().done, 'done'); log('done'); }
      return true;
    }
    /* ---------- her actions ---------- */
    function hello() { send('hello'); }
    function begin() { if (S.stage !== 'door') return false; S.stage = 'op'; S.lastAct = clock.now(); say(P().open[2], 'open'); log('begin'); return true; }
    function tap(part) {
      if (S.stage !== 'op') return 'nostage';
      S.lastAct = clock.now(); S.stats.taps++;
      if (part === 'fluff') { if (S.fluff !== 'in') return 'gone'; S.fluff = 'gone'; say(P().pulled.fluff, 'fluff'); send('clean'); log('fluff'); return 'fluff'; }
      var p = S.parts[part]; if (!p) return 'nopart';
      if (S.my.out) return 'busy';
      if (p.status === 'sealed') { notice('sealed'); return 'sealed'; }
      if (p.status === 'out') { notice('theirs', p.by); return 'theirs'; }
      var t = clock.now(); p.status = 'out'; p.by = seat; p.at = t; S.my = { out: part, wrongs: 0, outAt: t, said2: false }; S.notice = null;
      send('pull', { part: part, at: t }); log('pull', part);
      if (part === 'board') { say(P().pulled.board, 'refuse'); return 'board'; }
      say(P().pulled[part], part === 'psu' ? 'quiet' : 'pulled'); return 'out';
    }
    /* the patient contradicts the WRONG CARD she tapped, not a fixed line: no[part] is a string or {card: line, '*': line} */
    function noLine(P, part, job) { var n = P.no[part]; return typeof n === 'string' ? n : (n[job] || n['*']); }
    function card(job) {
      var part = S.my.out; if (!part || S.stage !== 'op') return 'none';
      S.lastAct = clock.now();
      if (job === part) { say(P().back[part], 'back'); seal(part, false); return 'right'; }
      S.my.wrongs++; S.stats.wrong++; log('wrong', { part: part, card: job });
      if (S.my.wrongs >= 2) { say(P().told[part], 'told'); S.stats.told++; seal(part, true); notice('told'); return 'told'; }
      say(noLine(P(), part, job), 'no'); notice('again'); return 'wrong';
    }
    function seal(part, told) { S.my.out = null; markSealed(part, seat, told); send('seal', { part: part, told: !!told }); }
    function setRound(n) { if (n > S.round) { S.round = n; reset(PIDS[n % PIDS.length]); log('again', S.pid); } } /* she came back to a later patient */
    function again() { if (S.stage !== 'done') return false; S.round++; reset(PIDS[S.round % PIDS.length]); send('again'); log('again', S.pid); return true; }
    /* ---------- the bus ---------- */
    function receive(m) {
      if (!m || m.seat === seat || S.presence[m.seat] === undefined) return;
      var pr = S.presence[m.seat]; var wasHere = pr.here; pr.here = true; pr.at = clock.now(); if (pr.state === 'away') pr.state = 'look';
      if (m.type === 'again') { if (m.round > S.round) { S.round = m.round; reset(PIDS[S.round % PIDS.length]); log('again', S.pid); } return; }
      if (m.round != null && m.round !== S.round) return; /* a different patient: stale */
      var p;
      if (m.type === 'hello') { if (S.stage !== 'door' || wasHere === false) send('state', { parts: PARTS.map(function (k) { var x = S.parts[k]; return { part: k, status: x.status, by: x.by, at: x.at, told: x.told }; }), fluff: S.fluff }); log('hello', m.seat); return; }
      if (m.type === 'state') {
        (m.parts || []).forEach(function (x) { var q = S.parts[x.part]; if (!q) return;
          if (x.status === 'sealed') { if (q.by === seat && S.my.out === x.part) { S.my.out = null; notice('lost', x.by); } markSealed(x.part, x.by, x.told); }
          else if (x.status === 'out' && x.by === m.seat && q.status === 'in') { q.status = 'out'; q.by = m.seat; q.at = x.at; } });
        if (m.fluff === 'gone') S.fluff = 'gone'; return;
      }
      if (m.type === 'clean') { S.fluff = 'gone'; pr.state = 'clean'; log('clean', m.seat); return; }
      if (m.type === 'pull') {
        p = S.parts[m.part]; if (!p || p.status === 'sealed') return;
        pr.state = 'pull';
        if (p.status === 'in') { p.status = 'out'; p.by = m.seat; p.at = m.at; log('theirpull', { part: m.part, by: m.seat }); return; }
        /* clash: both tapped the same part inside the lag. Earliest stamp owns it; a tie goes to the earlier seat letter. */
        if (m.at < p.at || (m.at === p.at && m.seat < p.by)) {
          if (p.by === seat) { S.my.out = null; S.stats.lost++; notice('lost', m.seat); log('lost', { part: m.part, to: m.seat }); }
          p.by = m.seat; p.at = m.at;
        }
        return;
      }
      if (m.type === 'seal') {
        p = S.parts[m.part]; if (!p || p.status === 'sealed') return;
        if (p.by === seat && S.my.out === m.part) { S.my.out = null; S.stats.lost++; notice('lost', m.seat); }
        pr.state = 'seal'; markSealed(m.part, m.seat, m.told); if (S.stage === 'done') pr.state = 'done'; return;
      }
    }
    /* ---------- time ---------- */
    function tick() {
      var now = clock.now(); if (S.stage !== 'op') return;
      if (S.my.out && !S.my.said2 && now - S.my.outAt >= SECOND_LINE_MS) { S.my.said2 = true; var l2 = P().pulled2 && P().pulled2[S.my.out]; if (l2) say(l2, 'pulled2'); }
      if (!S.my.out) {
        if (!free().length) { if (!S.waitSaid) { S.waitSaid = true; say(P().waiting, 'waiting'); } }
        else if (now - S.lastAct >= IDLE) { say(P().idle[S.idleN % P().idle.length], 'idle'); S.idleN++; S.lastAct = now; log('idle'); }
      }
    }
    function prompt() {
      var U = L.ui2, now = clock.now();
      if (S.stage === 'door') return { kind: 'door', text: '' };
      if (S.stage === 'done') return { kind: 'done', text: U.done };
      if (S.notice && now - S.notice.t < NOTICE_MS) return { kind: S.notice.key, text: fmt(U[S.notice.key], { p: S.notice.seat ? L.callsigns[S.notice.seat] : '' }) };
      if (S.my.out) return S.my.out === 'board' ? { kind: 'cardBoard', text: U.cardBoard } : { kind: 'card', text: U.card };
      if (!free().length) return { kind: 'wait', text: U.wait };
      return { kind: 'pull', text: U.pull };
    }
    function presence() {
      var U = L.ui2.presence, n = sealedCount();
      return others.map(function (s) { var pr = S.presence[s], st = pr.here ? (S.stage === 'done' ? 'done' : pr.state) : 'away'; var tpl = U[st] || U.look; return { seat: s, state: st, text: fmt(tpl, { p: L.callsigns[s], n: n }) }; });
    }
    function cards() { return shuffle(PARTS, rnd).map(function (k) { return { key: k, job: fmt(L.jobs[k].card) }; }); }
    return { S: S, setRound: setRound, hello: hello, begin: begin, tap: tap, card: card, again: again, receive: receive, tick: tick, prompt: prompt, presence: presence, free: free, cards: cards, fmt: fmt, sealedCount: sealedCount, PARTS: PARTS, PULLABLE: PULLABLE, L: L };
  }
  /* The computer as a surgeon: a human pace, right four times in five. */
  function makeRobot(E, rnd, clock, speed) {
    speed = speed || 1; var next = {}; var S = E.S;
    function due(key, minMs, maxMs) { var now = clock.now(); if (next[key] == null) next[key] = now + (minMs + rnd() * (maxMs - minMs)) * speed; if (now >= next[key]) { next[key] = null; return true; } return false; }
    return { tick: function () {
      if (S.stage === 'door') { if (due('begin', 500, 1500)) E.begin(); return; }
      if (S.stage !== 'op') return;
      if (S.my.out) { if (due('card', 4000, 9000)) { var out = S.my.out, wrong = PARTS.filter(function (k) { return k !== out; }); E.card(rnd() < 0.8 ? out : wrong[Math.floor(rnd() * wrong.length)]); } return; }
      var fr = E.free(); if (!fr.length) return;
      if (due('pull', 6000, 14000)) { if (S.fluff === 'in' && rnd() < 0.25) E.tap('fluff'); else E.tap(fr[Math.floor(rnd() * fr.length)]); }
    } };
  }
  function makeLocalBus(lag, clock) { /* in-page endpoints with honest delay (solo with the computer as partner, and the virtual-time gates) */
    var ends = []; var st = clock.setTimeout ? function (f, ms) { clock.setTimeout(f, ms); } : function (f, ms) { setTimeout(f, ms); };
    function mk() { var hs = []; var e = { on: function (h) { hs.push(h); }, send: function (type, data) { var m = Object.assign({ type: type, t: clock.now() }, data); ends.forEach(function (x) { if (x !== e) st(function () { x._deliver(m); }, lag); }); }, _deliver: function (m) { hs.forEach(function (h) { h(m); }); } }; ends.push(e); return e; }
    return { endpoint: mk };
  }
  root.OPENGINE2 = { makeEngine: makeEngine, makeRobot: makeRobot, makeLocalBus: makeLocalBus, PARTS: PARTS, PULLABLE: PULLABLE, PIDS: PIDS, shuffle: shuffle };
  if (typeof module !== 'undefined') module.exports = root.OPENGINE2;
})(typeof window !== 'undefined' ? window : globalThis);
