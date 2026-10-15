/* TWO LIGHTS · the engine. Pure: no DOM, no timers of its own (the page ticks it), so the gates drive it in node with
   a virtual clock. One engine per laptop. It keeps the seats this laptop keeps (one in a pair; both in solo, in the
   one-laptop fallback and after a partner goes dark), hears the other seats over the bus, and answers the page's
   questions: the ONE bar line (law 5), the help step (law 10), the boat (law 6, 7), the window (law 2), the crew total.
   Bus messages (live.js encodes them under 200 bytes):
     state {seat, st, lamp, horn, radio, line, done, red, ran, found, typing, at}   (every change and every 5 s: presence)
     boat  {ch, t0}          first key of the chapter, either seat; earliest wins
     fail  {ch, at}          the rocks; first write wins, every seat rewinds
     pause {ch, at, on}      Pause the story (N9: a room event)
     tell  {seat, to, slip}  a radio slip (light | horn | none | clear)
     hello {seat}            "say your state again" (a reload, a late join)
   UMD: window.TwoLightsEngine; require() in the gates. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./programs.js'), require('./judge.js'), require('./clock.js'));
  else root.TwoLightsEngine = factory(root.TwoLightsPrograms, root.TwoLightsJudge, root.TwoLightsClock);
}(typeof self !== 'undefined' ? self : this, function (PR, J, CK) {
  'use strict';
  var CHS = ['ch1', 'ch2', 'ch3', 'ch4'];
  var ORDER = { radio: 0, coldopen: 1, tour: 2, ch1: 3, ch2: 4, ch3: 5, ch4: 6, home: 7, extras: 8 };
  var CALL = { A: 'NORTH LIGHT', B: 'SOUTH LIGHT', C: 'LIGHTSHIP' };
  var SLIPS = ['light', 'horn', 'none', 'clear'];
  var HELP_STEP = 40000, SILENT_FIRST = 60000, TELL_AFTER = 30000, QUIET = 60000, DARK = 180000, BEAT = 5000;
  var READ_RED = 6000, SLIP_READ = 8000, NOTICE = 9000;
  var BUDGETS = { ch1: 90000, ch2: 90000, ch3: 90000, ch4: 231000 };   // replaced by the walk's B1–B4 (§1)

  function seatName(s) { return PR.SEATS[s].name; }
  function wantFx(ch, r) {   // which effect is missing from a clean run, in the order the night needs them
    if (!r) return null;
    if (ch === 'ch1') return r.lamp ? null : 'light';
    if (ch === 'ch2') return r.horn ? null : 'horn';
    if (ch === 'ch3') return r.radio && r.radio !== 'None' ? null : 'none';
    if (ch === 'ch4') return !r.lamp ? 'light' : !r.horn ? 'horn' : (!r.radio || r.radio === 'None') ? 'none' : null;
    return null;
  }

  function makeEngine(o) {
    var clock = o.clock || { now: function () { return Date.now(); } };
    var now = function () { return o.bus && o.bus.now ? o.bus.now() : clock.now(); };
    var budgets = o.budgets || BUDGETS;
    var seats = (o.seats && o.seats.length) ? o.seats.slice() : ['A', 'B'];
    var S = {
      seat: o.seat || 'A', seats: seats, room: o.room || 'solo', stage: o.stage || 'ch1',
      mode: o.mode || (seats.length > 1 && o.bus ? 'pair' : 'solo'),
      local: [], active: null, turned: {}, L: {}, P: {}, boat: {}, slips: [], sent: {}, said: {},
      notice: null, late: false, lateAt: null, card: 0, cardPick: null, cardsDone: 0, events: [], seenRun: {}, homeAt: null
    };
    if (S.mode === 'solo' && seats.length < 2) { seats = S.seats = ['A', 'B']; }
    var subs = [];
    function emit(type, data) { var e = { type: type, at: now() }; for (var k in data || {}) e[k] = data[k]; S.events.push(e); subs.forEach(function (f) { f(e); }); }
    function send(type, data) { if (o.bus && S.mode === 'pair') o.bus.send(type, data); }

    function newLocal(s) {
      var v = PR.seatVariant(S.room, s);
      S.L[s] = { seat: s, variant: v, code: {}, res: {}, done: {}, best: {}, since: {}, readRed: {}, ranAt: {},
        bounty: {}, nameQ: [], line: 1, typing: 0, keyAt: 0, live: {} };
    }
    function addLocal(s) { if (S.local.indexOf(s) < 0) { S.local.push(s); if (!S.L[s]) newLocal(s); } }
    if (S.mode === 'pair') addLocal(S.seat); else seats.forEach(addLocal);
    seats.forEach(function (s) { if (S.local.indexOf(s) < 0) S.P[s] = { st: null, lamp: 0, horn: 0, radio: '', line: 0, done: 0, red: 0, ran: 0, found: 0, typing: 0, at: null, ranAt: null }; });

    /* ---------- the chapter ---------- */
    function ch() { return S.stage; }
    function isCh(st) { return CHS.indexOf(st) >= 0; }
    function code(s, c) {
      var L = S.L[s]; c = c || ch(); if (!isCh(c)) c = 'ch1';   // the tour stands on the first chapter's program
      if (L.code[c] == null) L.code[c] = J.givenProgram(c, s, L.variant);
      return L.code[c];
    }
    function boat(c) { c = c || ch(); return S.boat[c] || (S.boat[c] = { t0: null, fails: [], pauses: [], doneAt: null }); }
    function seatDone(s, c) {
      c = c || ch();
      if (S.L[s] && S.local.indexOf(s) >= 0) return !!S.L[s].done[c];
      var p = S.P[s]; if (!p || p.st == null) return false;
      return ORDER[p.st] > ORDER[c] || (p.st === c && !!p.done);
    }
    function allDone(c) { return seats.every(function (s) { return seatDone(s, c); }); }
    function pickActive() {
      if (!isCh(ch())) { S.active = S.local[0]; return; }
      var a = null; S.local.forEach(function (s) { if (!a && !S.L[s].done[ch()]) a = s; });
      S.active = a || S.local[0];
    }

    /* ---------- judging (§5.5) ---------- */
    function judgeNow(s) { var L = S.L[s]; return J.judge(ch(), s, code(s), { variant: L.variant }); }
    function score(r) { var n = r.broken.filter(function (b) { return b.canonLine; }).length; for (var k in r.faults) if (r.faults[k].present) n++; return n; }
    function markChange(s, r) {
      var L = S.L[s], c = ch(), sc = score(r);
      if (L.best[c] == null || sc < L.best[c]) { L.best[c] = sc; L.since[c] = now(); }
    }

    /* ---------- her actions ---------- */
    function firstKey() {
      if (!isCh(ch())) return;
      var b = boat(); if (b.t0 != null) return;
      b.t0 = now(); send('boat', { ch: ch(), t0: b.t0 });
    }
    function edit(text, line) {
      var s = S.active, L = S.L[s]; if (!L || !isCh(ch())) return;
      firstKey();
      L.code[ch()] = String(text); L.line = line || L.line; L.typing = 1; L.keyAt = now();
      var r = judgeNow(s); L.live[ch()] = r; markChange(s, r);
    }
    function run() {
      var s = S.active, L = S.L[s], c = ch(); if (!L || !isCh(c)) return null;
      firstKey();
      var before = L.res[c] ? L.res[c].faults : null;
      var r = judgeNow(s); L.live[c] = r; markChange(s, r);
      var prev = L.res[c];
      L.res[c] = { ran: 1, red: r.shout ? 1 : 0, lamp: r.effects.lamp ? 1 : 0, horn: r.effects.horn || 0,
        radio: r.effects.radio || '', redText: r.red, console: r.console, faults: r.faults, broken: r.broken, n: (prev ? prev.n : 0) + 1 };
      L.ranAt[c] = now(); L.typing = 0;
      if (r.shout) emit('red', { seat: s });
      // ch4: every fault that stood at the last run and is gone now is fixed → "Name it." (law: naming at the moment of the fix)
      if (c === 'ch4') {
        var had = before || J.judge(c, s, J.givenProgram(c, s, L.variant), { variant: L.variant }).faults;
        Object.keys(had).forEach(function (id) {
          if (had[id].present && !r.faults[id].present && !L.bounty[id]) {
            if (S.late) L.bounty[id] = 'late'; else { L.bounty[id] = 'fixed'; L.nameQ.push(id); }
          }
        });
      }
      if (r.clean && !L.done[c]) {
        L.done[c] = 1;
        if (c === 'ch2' && !S.said.ch2) say('ch2');
        if (c === 'ch3' && !S.said.ch3) say('ch3');
        emit('clean', { seat: s, ch: c });
      }
      if (r.effects.horn && c === 'ch2' && !S.said.ch2) say('ch2');
      emit('run', { seat: s, lamp: r.effects.lamp, horn: r.effects.horn, radio: r.effects.radio, red: r.shout });
      broadcast();
      // in solo the next program waits until she has read her clean run: the page calls nextProgram()
      return L.res[c];
    }
    function nextProgram() { pickActive(); broadcast(); }
    function readRed() {
      var L = S.L[S.active], c = ch(); if (!L) return;
      if (!L.readRed[c]) { L.readRed[c] = now(); if (c === 'ch1' && !S.said.ch1) say('ch1'); }
    }
    function say(c) { S.said[c] = now(); emit('say', { id: 'say.' + c }); }
    function radio(to, slip) {
      if (SLIPS.indexOf(slip) < 0 || S.mode !== 'pair') return;
      S.sent[ch() + to] = { slip: slip, at: now() };
      send('tell', { seat: S.seat, to: to, slip: slip });
      emit('crackle', { to: to, slip: slip, mine: 1 });
    }
    function name(kind) {
      var L = S.L[S.active]; if (!L || !L.nameQ.length) return null;
      var id = L.nameQ.shift(), right = J.KIND[id] === kind;
      L.bounty[id] = right ? 'paid' : 'missed';
      emit(right ? 'bounty' : 'wrongposter', { seat: S.active, id: id, kind: J.KIND[id], picked: kind });
      broadcast();
      return { right: right, kind: J.KIND[id] };
    }
    function cardAnswer(kind) {
      var x = PR.EXTRAS[S.card % PR.EXTRAS.length], right = x.kind === kind;
      S.cardPick = { right: right, kind: x.kind, picked: kind, at: now() };
      emit(right ? 'cardright' : 'wrongposter', { kind: x.kind, picked: kind, card: 1 });
      return S.cardPick;
    }
    function nextCard() { S.card++; S.cardsDone++; S.cardPick = null; }
    function pause(on) {
      if (!isCh(ch())) return;
      var t = now(); applyPause(ch(), t, on); send('pause', { ch: ch(), at: t, on: on ? 1 : 0 });
    }
    function applyPause(c, t, on) {
      var b = boat(c), open = b.pauses.filter(function (p) { return p.to == null; })[0];
      if (on && !open) b.pauses.push({ from: t, to: null });
      if (!on && open) open.to = Math.max(t, open.from);
      emit('pause', { on: !!on });
    }
    function paused() { return boat().pauses.some(function (p) { return p.to == null; }); }
    function late() { S.late = true; S.lateAt = now(); emit('late', {}); }
    function lateLines() {   // the lines still to type for the active seat: {n, text}
      var s = S.active, L = S.L[s]; if (!L || !isCh(ch())) return [];
      var r = L.live[ch()] || judgeNow(s), c = J.chapter(ch(), s), out = [];
      Object.keys(r.faults).forEach(function (id) {
        if (!r.faults[id].present) return;
        var f = c.faults.filter(function (x) { return x.id === id; })[0];
        out.push({ n: r.faults[id].line, text: c.canon[f.idx].trim(), id: id, add: f.form === null });
      });
      r.broken.forEach(function (b) { if (b.canonLine) out.push({ n: b.line, text: b.canonLine.trim(), id: 'put' }); });
      return out.sort(function (a, b) { return a.n - b.n; });
    }

    /* ---------- the room ---------- */
    function myState(s) {
      var L = S.L[s], c = ch(), r = L.res[c] || {};
      return { seat: s, st: c, lamp: r.lamp ? 1 : 0, horn: r.horn ? 1 : 0, radio: r.radio || '', line: L.line || 0,
        done: L.done[c] ? 1 : 0, red: r.red ? 1 : 0, ran: r.n || 0, found: foundBy(s), typing: L.typing && now() - L.keyAt < 4000 ? 1 : 0, at: now() };
    }
    function foundBy(s) { var L = S.L[s], n = 0; for (var k in L.bounty) n++; return n; }
    var lastSent = '', lastBeat = 0;
    function broadcast(force) {
      if (S.mode !== 'pair') return;
      var m = myState(S.seat), k = JSON.stringify([m.st, m.lamp, m.horn, m.radio, m.line, m.done, m.red, m.ran, m.found, m.typing]);
      if (!force && k === lastSent && now() - lastBeat < BEAT) return;
      lastSent = k; lastBeat = now(); send('state', m);
    }
    function hello() { send('hello', { seat: S.seat }); broadcast(true); }
    function receive(m) {
      if (!m || !m.type) return;
      if (m.type === 'hello') {
        if (m.seat !== S.seat) {
          broadcast(true);
          Object.keys(S.boat).forEach(function (c) {
            var b = S.boat[c]; if (b.t0 != null) send('boat', { ch: c, t0: b.t0 });
            b.fails.forEach(function (f) { send('fail', { ch: c, at: f }); });
            b.pauses.forEach(function (p) { send('pause', { ch: c, at: p.from, on: 1 }); if (p.to != null) send('pause', { ch: c, at: p.to, on: 0 }); });
          });
        }
        return;
      }
      if (m.type === 'state') {
        if (S.local.indexOf(m.seat) >= 0) return;
        var p = S.P[m.seat]; if (!p) return;
        var ranBefore = p.ran, stBefore = p.st;
        ['st', 'lamp', 'horn', 'radio', 'line', 'done', 'red', 'ran', 'found', 'typing'].forEach(function (k) { if (m[k] !== undefined) p[k] = m[k]; });
        p.at = Math.max(p.at || 0, m.at || now());
        if (m.ran && (m.ran !== ranBefore || m.st !== stBefore)) {
          p.ranAt = m.at || now();
          if (m.st === ch() && (now() - p.ranAt) < 15000) emit('peerrun', { seat: m.seat, lamp: m.lamp, horn: m.horn, radio: m.radio, red: m.red });
        }
        return;
      }
      if (m.type === 'boat') { var b = boat(m.ch); if (b.t0 == null || m.t0 < b.t0) b.t0 = m.t0; return; }
      if (m.type === 'fail') { addFail(m.ch, m.at); return; }
      if (m.type === 'pause') { applyPause(m.ch, m.at, !!m.on); return; }
      if (m.type === 'tell') {
        if (S.local.indexOf(m.to) < 0 || m.seat === S.seat) return;
        S.slips.push({ from: m.seat, to: m.to, slip: m.slip, ch: ch(), at: now(), read: null });
        emit('crackle', { from: m.seat, slip: m.slip });
      }
    }
    function addFail(c, at) {
      var b = boat(c);
      for (var i = 0; i < b.fails.length; i++) {
        if (Math.abs(b.fails[i] - at) < CK.BLACK_MS + 1500) { if (at < b.fails[i]) b.fails[i] = at; return false; }
      }
      b.fails.push(at); b.fails.sort(function (x, y) { return x - y; });
      emit('rewind', { ch: c });
      return true;
    }
    function boatRoom(c) {
      var b = boat(c);
      return { t0: b.t0, pauses: b.pauses, fails: b.fails, doneAt: b.doneAt };
    }
    function budgetOf(c) { return (budgets[c] || 300000) * (S.mode === 'pair' ? 1 : Math.max(1, S.local.length)); }   // N13: per light kept
    function boatNow() { return CK.position(boatRoom(ch()), now(), budgetOf(ch())); }

    /* ---------- the tick: rocks, chapter end, dark partner, heartbeat ---------- */
    function tick() {
      var t = now(), c = ch();
      if (isCh(c)) {
        var b = boat(c);
        if (b.doneAt == null && allDone(c)) b.doneAt = t;   // every light on: the boat is safe from here
        if (b.doneAt != null && !S.turned[c] && !naming()) { S.turned[c] = 1; emit('turning', { ch: c }); }   // after her last name
        var pos = CK.position(boatRoom(c), t, budgetOf(c));
        if (!pos.black && pos.x >= 1 && b.doneAt == null) { if (addFail(c, t) && failWriter(t) === S.seat) send('fail', { ch: c, at: t }); }
      }
      if (S.mode === 'pair') {
        S.seats.forEach(function (s) {
          var p = S.P[s]; if (!p || S.local.indexOf(s) >= 0) return;
          var since = p.at != null ? t - p.at : (S.joinedAt ? t - S.joinedAt : 0);
          if (isCh(c) && since > DARK && !seatDone(s, c)) goDark(s);
        });
      }
      S.local.forEach(function (s) { var L = S.L[s]; if (L.typing && t - L.keyAt > 4000) L.typing = 0; });
      S.slips.forEach(function (x) { if (!x.read && x.shownAt && t - x.shownAt > SLIP_READ) x.read = t; });
      broadcast();
    }
    function failWriter(t) {   // the rocks are written once: by the first seat still heard from (every seat rewinds by itself)
      return S.seats.filter(function (s) { return S.local.indexOf(s) >= 0 || (S.P[s] && S.P[s].at != null && t - S.P[s].at < 15000); })[0];
    }
    function goDark(s) {   // silent partner 3 min (§6): she keeps both lights from her place
      addLocal(s); delete S.P[s];
      S.notice = { id: 'bar.dark', vars: { other: seatName(s) }, at: now() };
      if (S.local.length === S.seats.length) S.mode = 'dark';
      pickActive(); emit('dark', { seat: s });
    }
    function goSlow() {   // the live link is slow (§6): this laptop keeps every light, taking turns A then B
      if (S.mode === 'slow') return;
      S.seats.forEach(addLocal); S.P = {}; S.mode = 'slow';
      S.notice = { id: 'bar.slow', vars: {}, at: now() };
      pickActive(); emit('slow', {});
    }

    /* ---------- what the page shows ---------- */
    function others() { return S.seats.filter(function (s) { return s !== S.active; }); }
    function view(s) {   // what the active keeper sees of seat s through the window (law 2: never her own)
      var c = ch();
      if (S.local.indexOf(s) >= 0) {
        var r = S.L[s].res[c] || {};
        return { seat: s, name: seatName(s), lamp: r.lamp ? 1 : 0, horn: r.horn ? 1 : 0, radio: r.radio || '', done: !!S.L[s].done[c], local: true, ran: r.n || 0 };
      }
      var p = S.P[s] || {}, here = p.st === c;
      return { seat: s, name: seatName(s), lamp: here && p.lamp ? 1 : 0, horn: here && p.horn ? 1 : 0, radio: here ? p.radio || '' : '',
        done: seatDone(s, c), local: false, ran: here ? p.ran : 0, at: p.at };
    }
    function windowSeats() { return others().map(view); }
    function unreadSlip() {
      for (var i = S.slips.length - 1; i >= 0; i--) { var x = S.slips[i]; if (!x.read && x.ch === ch() && x.to === S.active) return x; }
      return null;
    }
    function tellNeed() {   // a partner ran clean-but-silent 30 s ago and I have not radioed (law 5: their need first)
      if (S.mode !== 'pair') return null;
      var t = now(), best = null;
      S.seats.forEach(function (s) {
        if (S.local.indexOf(s) >= 0) return;
        var p = S.P[s]; if (!p || p.st !== ch() || !p.ran || p.red || p.done) return;
        var miss = wantFx(ch(), p); if (!miss) return;
        var sent = S.sent[ch() + s];
        if (sent && sent.at >= p.ranAt) return;
        if (t - p.ranAt < TELL_AFTER) return;
        if (!best) best = { seat: s, slip: miss };
      });
      return best;
    }
    function topIssue(s) {
      var L = S.L[s], c = ch(), r = L.live[c], res = L.res[c];
      if (!r) r = L.live[c] = judgeNow(s);
      var put = r.broken.filter(function (b) { return b.canonLine; })[0];
      if (put) return { kind: 'putback', line: put.line, canon: put.canonLine };
      var ids = Object.keys(r.faults).filter(function (id) { return r.faults[id].present; });
      if (!ids.length) return null;
      var rl = r.shout ? redLine(r.red) : null;   // follow the red: the fault on the line Python names comes first
      var quiet = res && res.ran && !res.red;   // her last run showed no red: a sleeping shout (N8) waits behind the silent fault
      ids.sort(function (a, b) { var A = r.faults[a], B = r.faults[b]; return ((B.line === rl) - (A.line === rl)) || (quiet ? A.shout - B.shout : B.shout - A.shout) || (A.line - B.line); });
      var id = ids[0], f = r.faults[id], cc = J.chapter(c, s), fd = cc.faults.filter(function (x) { return x.id === id; })[0];
      var shoutNow = res && res.red;
      return { kind: f.kind, id: id, line: f.line, shout: f.shout, fix: cc.canon[fd.idx].trim(), red: !!shoutNow,
        fn: id === 'Q1' ? 'fog_horn' : 'lamp_on' };
    }
    function bar() {
      var t = now(), c = ch();
      if (S.notice && t - S.notice.at < NOTICE) return S.notice;
      if (!isCh(c)) return null;
      var nq = naming(); if (nq) { S.active = nq; return { id: 'bar.name' }; }   // the last fix is named before the turning
      if (boat().doneAt != null || allDone(c)) return { id: 'bar.turning' };
      var need = tellNeed(); if (need) return { id: 'bar.tell.' + need.slip, seat: need.seat };
      var slip = unreadSlip(); if (slip) { if (!slip.shownAt) slip.shownAt = t; return { id: 'bar.slip' }; }
      var s = S.active, L = S.L[s];
      if (L.nameQ.length) return { id: 'bar.name' };
      if (L.done[c]) {
        if (S.local.length > 1 && S.local.some(function (x) { return !S.L[x].done[c]; })) return { id: 'bar.run' };
        return lookout();
      }
      var res = L.res[c], iss = topIssue(s);
      if (iss && iss.kind === 'putback' && !(L.typing && t - L.keyAt < 2500)) return { id: 'bar.putback', vars: { n: iss.line } };
      if (!res) return { id: 'bar.run' };
      if (res.red) {
        if (!L.readRed[c] && t - L.ranAt[c] < READ_RED) return { id: 'bar.readred' };
        if (!L.readRed[c]) readRed();
        var ln = redLine(res.redText);
        return ln ? { id: 'bar.fixline', vars: { n: ln } } : { id: 'bar.readred' };
      }
      if (iss && !iss.shout) {
        if (S.mode !== 'pair') { var miss = wantFx(c, res); if (miss) return { id: 'solo.' + miss }; }
        return { id: 'bar.hunt' };
      }
      return { id: 'bar.run' };
    }
    function naming() { for (var i = 0; i < S.local.length; i++) if (S.L[S.local[i]].nameQ.length) return S.local[i]; return null; }
    function lookout() {
      var c = ch(), L = S.L[S.active];
      if (c === 'ch1' && now() - (L.ranAt[c] || 0) < 10000) return { id: 'bar.lampon' };
      return { id: 'bar.name', card: true };
    }
    function redLine(red) {   // the line Python names last (the line her fault is on)
      var m = String(red || '').match(/line (\d+)/g); if (!m) return null;
      return +m[m.length - 1].replace('line ', '');
    }
    function help() {
      var s = S.active, L = S.L[s], c = ch(); if (!L || !isCh(c) || L.done[c] || L.nameQ.length) return null;
      var iss = topIssue(s); if (!iss) return null;
      var t = now(), t0 = boat().t0 != null ? boat().t0 : t, since = Math.max(L.since[c] != null ? L.since[c] : t0, t0);
      var lastFail = boat().fails.length ? boat().fails[boat().fails.length - 1] + CK.BLACK_MS : 0;
      var waited = t - since, step = 0;
      if (iss.kind === 'putback') { if (waited >= HELP_STEP) return { id: 'help.putback', code: iss.canon.trim(), line: iss.line }; return null; }
      if (!iss.shout) {
        if (!L.res[c]) return null;   // she has not run yet: the bar says RUN
        var heard = S.slips.filter(function (x) { return x.ch === c && x.to === s; })[0];
        var first = Math.min(since + SILENT_FIRST, heard ? heard.at : Infinity);
        if (t >= first) step = 1 + Math.floor((t - first) / HELP_STEP);
      } else step = Math.floor(waited / HELP_STEP);
      if (lastFail && step < 1 && t > lastFail) step = Math.max(step, 0);
      step = Math.min(3, step); if (step < 1) return null;
      var vars = { n: iss.line, fix: iss.fix, fn: iss.fn };
      return { id: 'help.' + iss.kind + '.' + step, vars: vars, step: step, kind: iss.kind };
    }
    function presence() {
      if (S.mode !== 'pair') return [];
      var t = now(), trio = S.seats.length > 2;
      return S.seats.filter(function (s) { return S.local.indexOf(s) < 0 && S.P[s]; }).map(function (s) {
        var p = S.P[s], who = trio ? 'The ' + seatName(s) : 'Your partner';
        if (p.at == null || t - p.at > QUIET) return { seat: s, id: 'pres.quiet', vars: { Who: who } };
        if (p.typing) return { seat: s, id: 'pres.typing', vars: { Who: who } };
        return { seat: s, id: 'pres.line', vars: { Who: who, n: p.line || 1 } };
      });
    }
    function crew() {
      var n = 0;
      S.local.forEach(function (s) { n += foundBy(s); });
      Object.keys(S.P).forEach(function (s) { n += S.P[s].found || 0; });
      var paid = 0; S.local.forEach(function (s) { var b = S.L[s].bounty; for (var k in b) if (b[k] === 'paid') paid++; });
      return { n: n, m: 3 * S.seats.length, paid: paid };
    }
    function setStage(st) {
      S.stage = st; S.notice = S.notice && now() - S.notice.at < NOTICE ? S.notice : null;
      if (isCh(st)) S.local.forEach(function (s) { code(s); });
      pickActive(); broadcast(true);
    }
    function snapshot() {   // what the platform saves (law 11): her lines, her bounties, the room's knowledge
      var L = {}; S.local.forEach(function (s) { var x = S.L[s]; L[s] = { code: x.code, done: x.done, bounty: x.bounty, nameQ: x.nameQ, res: x.res, readRed: x.readRed, ranAt: x.ranAt }; });
      return { v: 1, mode: S.mode, local: S.local, L: L, boat: S.boat, said: S.said, sent: S.sent, late: S.late, card: S.card };
    }
    function restore(z) {
      if (!z || z.v !== 1) return;
      if (z.mode === 'slow') goSlow();
      (z.local || []).forEach(function (s) { if (S.local.indexOf(s) < 0) { addLocal(s); delete S.P[s]; } });
      if (S.local.length === S.seats.length && S.mode === 'pair') S.mode = 'dark';
      Object.keys(z.L || {}).forEach(function (s) {
        if (!S.L[s]) newLocal(s);
        var x = S.L[s], y = z.L[s];
        ['code', 'done', 'bounty', 'res', 'readRed', 'ranAt'].forEach(function (k) { if (y[k]) x[k] = y[k]; });
        x.nameQ = y.nameQ || [];
      });
      Object.keys(z.boat || {}).forEach(function (c) {
        var b = boat(c), y = z.boat[c];
        if (y.t0 != null && (b.t0 == null || y.t0 < b.t0)) b.t0 = y.t0;
        (y.fails || []).forEach(function (f) { addFail(c, f); });
        if (!b.pauses.length) b.pauses = (y.pauses || []).slice();
        if (y.doneAt != null) b.doneAt = y.doneAt;
      });
      S.said = z.said || {}; S.sent = z.sent || {}; S.late = !!z.late; S.card = z.card || 0;
      S.events = [];
      pickActive();
    }
    S.joinedAt = now();
    setStage(S.stage);
    return {
      S: S, on: function (f) { subs.push(f); }, receive: receive, hello: hello, tick: tick,
      edit: edit, run: run, readRed: readRed, radio: radio, name: name, cardAnswer: cardAnswer, nextCard: nextCard,
      pause: pause, paused: paused, late: late, lateLines: lateLines, nextProgram: nextProgram, setStage: setStage,
      goSlow: goSlow, goDark: goDark, bar: bar, help: help, presence: presence, crew: crew, windowSeats: windowSeats,
      boat: boatNow, code: function (s, c) { return code(s || S.active, c); }, allDone: allDone, seatDone: seatDone,
      snapshot: snapshot, restore: restore, topIssue: function () { return topIssue(S.active); }, unreadSlip: unreadSlip,
      tellNeed: tellNeed, card: function () { return PR.EXTRAS[S.card % PR.EXTRAS.length]; }, now: now
    };
  }

  /* ---------- the local bus: the tester's pair and the one-laptop fallback ---------- */
  function makeLocalBus(lag, clock) {
    var eps = [];
    return {
      endpoint: function () {
        var hs = [], me = { hs: hs };
        eps.push(me);
        return {
          on: function (h) { hs.push(h); },
          send: function (type, data) {
            var m = {}; for (var k in data) m[k] = data[k]; m.type = type;
            eps.forEach(function (e) { if (e === me) return; clock.setTimeout(function () { e.hs.forEach(function (h) { h(m); }); }, lag); });
          },
          now: function () { return clock.now(); }
        };
      }
    };
  }

  return { makeEngine: makeEngine, makeLocalBus: makeLocalBus, CALL: CALL, SLIPS: SLIPS, BUDGETS: BUDGETS, wantFx: wantFx,
    T: { HELP_STEP: HELP_STEP, SILENT_FIRST: SILENT_FIRST, TELL_AFTER: TELL_AFTER, QUIET: QUIET, DARK: DARK, READ_RED: READ_RED } };
}));
