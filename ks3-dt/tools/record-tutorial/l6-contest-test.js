#!/usr/bin/env node
/* J1 L6 V2 THE CONTEST — judging gates (spec §4.7 G1–G10, plus G11) and the STRINGS / WORDS / LAPTOP / DECK gates,
   each with a control that must fail. Ported from the design's prototype contest-test.js; the engine is the BUILT one
   (platform/assets/l6/contest.js), the strings are the BUILT ones (platform/assets/l6/cstrings.js).
   node tools/record-tutorial/l6-contest-test.js   → PASS/FAIL per gate and per control; exit 1 on any failure.
   Virtual clock, a local bus that replays its log on join (like makeFireBus), two or three engines.
   THE STRING RULE (26 Nov ruling): every sentence the contest shows is a word-for-word cut of a sentence of the
   design's source of record (l6v2-src/ = verbatim copies of the prototype strings.js and contest.js, and the platform
   help layer in assets/see/see/strings.js), or it is listed in cstrings.js REWRITES with its reason. */
var path = require('path'), fs = require('fs'), cp = require('child_process');
var ROOT = path.join(__dirname, '../..');
var L6 = path.join(ROOT, 'platform/assets/l6');
var C = require(path.join(L6, 'contest.js'));
var STR = require(path.join(L6, 'cstrings.js'));
var LIVE = require(path.join(L6, 'live.js'));
var SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
var N = C.N, results = [];

function ok(name, cond, note) { results.push({ name: name, pass: !!cond, note: note || '' }); }
function controlMustFail(name, fn) { var failed = false; try { if (fn() === false) failed = true; } catch (e) { failed = true; } results.push({ name: 'CONTROL ' + name, pass: failed, note: failed ? 'the gate caught it' : 'THE GATE DID NOT CATCH IT' }); }
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

/* ---- harness ---- */
function world(seats, seed, extra) {
  var T = 0, log = [], engines = {}, connected = {}, queue = [], lastBeat = 0;
  function flush() { while (queue.length) { var m = queue.shift(); Object.keys(engines).forEach(function (s) { if (s !== m.seat && connected[s]) engines[s].receive(m); }); } }
  function make(seat, opts) {
    var o = Object.assign({ seat: seat, seats: seats, seed: seed, now: function () { return T; }, send: function (m) { if (!connected[seat]) return; log.push(m); queue.push(m); } }, extra || {}, opts || {});
    var E = C.makeEngine(o); engines[seat] = E; connected[seat] = true; return E;
  }
  return {
    engines: engines, make: make, flush: flush, now: function () { return T; },
    drop: function (seat) { connected[seat] = false; },
    rejoin: function (seat, E) {
      if (E) engines[seat] = E; connected[seat] = true;
      log.slice().forEach(function (m) { if (m.seat !== seat) engines[seat].receive(m); });
      engines[seat].hello(); queue.push({ type: 'hello', seat: seat }); flush();
    },
    advance: function (ms, check) {
      var end = T + ms;
      while (T < end) {
        T = Math.min(end, T + 1000);
        if (T - lastBeat >= 5000) { lastBeat = T; Object.keys(engines).forEach(function (s) { if (connected[s]) queue.push({ type: 'beat', seat: s }); }); }
        Object.keys(engines).forEach(function (s) { if (connected[s]) engines[s].tick(); });
        flush(); if (check) check();
      }
    },
    log: log
  };
}
function right(i) { return C.rightChar(i); }
function wrong(i) { var r = right(i); var q = C.Q[i]; if (q.kind === 'part') return String((+r + 1) % 7); if (q.kind === 'mcq') return r === '1' ? '2' : '1'; return 'b'; }
function revealInvariant(E, revealedFn) {
  for (var i = 0; i < N; i++) if ((revealedFn || E.revealed)(i)) E.all.forEach(function (s) { if (E.seatState(s).a[i] === '-') throw new Error('reveal at ' + i + ' with ' + s + ' unanswered'); });
}
function playBoth(w, upTo, bAnswer) {
  var A = w.engines.A, B = w.engines.B;
  for (var i = 0; i <= upTo; i++) {
    A.answer(i, right(i)); w.flush(); revealInvariant(A); revealInvariant(B);
    if (A.revealed(i)) return false;
    B.answer(i, bAnswer ? bAnswer(i) : right(i)); w.flush(); revealInvariant(A); revealInvariant(B);
    if (!A.revealed(i) || !B.revealed(i)) return false;
    A.next(); B.next(); w.flush();
  }
  return true;
}

/* ---- G1 ---- */
(function () {
  var w = world(['A', 'B'], 'g1'); w.make('A'); w.make('B');
  var fine = playBoth(w, 16, function (i) { return i % 2 ? wrong(i) : right(i); });
  var A = w.engines.A, B = w.engines.B;
  var keyA = 17, keyB = 9;
  ok('G1 two engines, 17 questions, scores equal the key', fine && A.score('A') === keyA && B.score('A') === keyA && A.score('B') === keyB && B.score('B') === keyB, A.score('A') + '/' + A.score('B'));
  ok('G1 snapshots identical after the last merge', eq(A.seatState('B'), B.seatState('B')) && eq(A.seatState('A'), B.seatState('A')) && A.view().done && B.view().done);
  controlMustFail('G1 a key with a wrong answer marked right', function () { return A.score('A') === keyA - 1; });
})();

/* ---- G2 ---- */
(function () {
  var w = world(['A', 'B'], 'g2'); w.make('A'); w.make('B');
  var A = w.engines.A, B = w.engines.B, threw = false;
  A.answer(0, right(0)); w.flush();
  try { revealInvariant(A); revealInvariant(B); } catch (e) { threw = true; }
  ok('G2 reveal never fires with a seat unanswered', !threw && !A.revealed(0) && !B.revealed(0));
  controlMustFail('G2 a reveal forced at one answered', function () { revealInvariant(A, function (i) { return A.seatState('A').a[i] !== '-'; }); });
})();

/* ---- G3 ---- */
(function () {
  var w = world(['A', 'B'], 'g3'); w.make('A'); w.make('B');
  playBoth(w, 7, function (i) { return i % 3 ? right(i) : wrong(i); });
  var A = w.engines.A, oldB = w.engines.B, before = JSON.parse(JSON.stringify(oldB.seatState('B'))), scoreB = oldB.score('B'), aBefore = JSON.stringify(A.seatState('A')) + A.score('A');
  var draft = oldB.snapshot();
  w.drop('B');
  var B2 = C.makeEngine({ seat: 'B', seats: ['A', 'B'], seed: 'g3', now: w.now, send: function (m) { w.log.push(m); } });
  B2.load(JSON.parse(JSON.stringify(draft)));
  w.rejoin('B', B2);
  ok('G3 reload from draft + replay: same a, m, q, score; A unaffected', eq(B2.seatState('B'), before) && B2.score('B') === scoreB && B2.seatState('B').q === 8 && eq(B2.seatState('A'), A.seatState('A')) && aBefore === JSON.stringify(A.seatState('A')) + A.score('A'));
})();

/* ---- G4 ---- */
function g4(goneMs) {
  var w = world(['A', 'B'], 'g4', goneMs ? { goneMs: goneMs } : null); w.make('A'); w.make('B');
  playBoth(w, 3);
  var A = w.engines.A, B = w.engines.B;
  w.drop('B');
  A.answer(4, right(4)); w.flush();
  w.advance(29000);
  var none29 = !A.revealed(4) && A.seatState('B').a[4] === '-';
  w.advance(1000);
  var expect = C.standIn('g4', 'B', 4);
  var at30 = A.revealed(4) && A.seatState('B').a[4] === expect && A.snapshot().s.B[4] === expect && A.view().partnerState.B === 'gone';
  w.advance(30000);
  w.rejoin('B'); w.advance(1000);
  var back = B.seatState('B').a[4] === expect && B.seatState('B').m[4] === '1' && A.seatState('B').m[4] === '1' && B.revealed(4) && A.view().partnerState.B !== 'gone';
  return { none29: none29, at30: at30, back: back };
}
(function () {
  var r = g4();
  ok('G4 gone 30 s: no stand-in at 29 s, stand-in at 30 s, B rejoins with it', r.none29 && r.at30 && r.back, JSON.stringify(r));
  controlMustFail('G4 a stand-in generated at 20 s gone', function () { return g4(20000).none29; });
})();

/* ---- G5 ---- */
(function () {
  var w = world(['A', 'B'], 'g5'); w.make('A'); w.make('B');
  playBoth(w, 8);
  var A = w.engines.A, B = w.engines.B;
  A.answer(9, right(9)); w.flush();
  w.advance(89000);
  var none89 = A.seatState('B').a[9] === '-' && !A.revealed(9) && A.view().partnerState.B === 'thinking';
  w.advance(1000);
  var expect = C.standIn('g5', 'B', 9);
  var at90 = A.seatState('B').a[9] === expect && A.revealed(9) && B.seatState('B').a[9] === expect && B.seatState('B').m[9] === '2' && A.seatState('B').m[9] === '2' && B.revealed(9);
  ok('G5 late 90 s on the same question: none at 89 s, stand-in at 90 s on both PCs, flagged late (m = 2) on both', none89 && at90);
  controlMustFail('G5 a late stand-in sent without its reason (plain answer char)', function () {
    var snap = A.snapshot(); snap.s.B = snap.s.B.split('').map(function (c, k) { return k === 9 ? expect : c; }).join('');
    var B3 = C.makeEngine({ seat: 'B', seats: ['A', 'B'], seed: 'g5', now: w.now }); B3.receive(snap);
    return B3.seatState('B').m[9] === '2';
  });
  ok('G5 gone stand-in stays m = 1 (G4) while late is m = 2: the two reasons never share a flag', C.makeEngine({ seat: 'A', seats: ['A', 'B'], seed: 'g5', now: w.now }).seatState('B').m[9] === '0' && B.seatState('B').m[9] === '2');
})();

/* ---- G6 ---- */
(function () {
  var w = world(['A', 'B'], 'g6'); w.make('A'); w.make('B');
  playBoth(w, 5);
  var A = w.engines.A, B = w.engines.B;
  A.answer(6, right(6)); B.answer(6, right(6)); w.flush(); A.next(); B.next(); w.flush();
  A.answer(7, right(7)); B.answer(7, right(7)); w.flush(); A.next(); w.flush();
  A.answer(8, right(8)); w.flush();
  var stand = false;
  w.advance(600000, function () { if (A.seatState('B').a[8] !== '-') stand = true; });
  ok('G6 behind: B on 7 while A waits on 8 for 10 minutes: no stand-in', !stand && A.view().partnerState.B === 'behind' && !A.revealed(8));
})();

/* ---- G7 ---- */
(function () {
  var here = []; for (var i = 0; i < N; i++) here.push(C.standIn('det', 'B', i));
  var other = cp.execFileSync(process.execPath, ['-e', 'var C=require(' + JSON.stringify(path.join(L6, 'contest.js')) + ');var o=[];for(var i=0;i<' + N + ';i++)o.push(C.standIn("det","B",i));process.stdout.write(o.join(""))']).toString();
  var same = here.join('') === other;
  var rightN = 0, total = 10000; for (var s = 0; s < total; s++) { var k = s % N; if (C.isRight(k, C.standIn('seed' + s, 'B', k))) rightN++; }
  var rate = rightN / total;
  ok('G7 stand-ins identical across two processes; right-rate 0.38–0.42', same && rate >= 0.38 && rate <= 0.42, 'rate ' + rate);
  controlMustFail('G7 a stand-in made with Math.random', function () { var r1 = Math.random() < 0.4 ? right(3) : wrong(3), r2 = Math.random() < 0.4 ? right(3) : wrong(3), r3 = Math.random() < 0.4 ? right(3) : wrong(3); return r1 === r2 && r2 === r3 && Math.random() < 0.2; });
})();

/* ---- G8 ---- */
(function () {
  function prng(seed) { var h = C.hash32('rng' + seed); return function () { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0; return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
  function soloRun(seed, pick) {
    var T = 0, E = C.makeEngine({ seat: 'A', seats: ['A'], seed: 'solo' + seed, now: function () { return T; } });
    for (var i = 0; i < N; i++) { E.answer(i, pick(i)); T += 1500; E.tick(); if (!E.revealed(i)) throw new Error('solo reveal missing at ' + i); E.next(); }
    return { me: E.score('A'), z: E.score('Z'), done: E.view().done };
  }
  var runs = 2000, lose = 0, winAll = 0;
  for (var s = 0; s < runs; s++) {
    var rnd = prng(s);
    var r = soloRun(s, function (i) { var q = C.Q[i]; if (q.kind === 'part') return String(Math.floor(rnd() * 7)); if (q.kind === 'mcq') return String(Math.floor(rnd() * 4)); return String.fromCharCode(97 + Math.floor(rnd() * 24)); });
    if (r.me < r.z) lose++;
    var r2 = soloRun(s, right); if (r2.me > r2.z && r2.done) winAll++;
  }
  ok('G8 solo: a random answerer loses to Bernadette in ≥ 85 %; always-right wins 100 %', lose / runs >= 0.85 && winAll === runs, 'random loses ' + (lose / runs) + ', always-right wins ' + winAll + '/' + runs);
})();

/* ---- G9: the contest snapshot rides the platform's real wire (live.js codec) ---- */
(function () {
  var w = world(['A', 'B', 'C'], 'g9'); w.make('A'); w.make('B'); w.make('C');
  var types = {}; w.log.forEach(function (m) { types[m.type] = 1; });
  var A = w.engines.A; for (var i = 0; i < N; i++) { A.answer(i, right(i)); w.engines.B.answer(i, right(i)); w.drop('C'); }
  w.log.forEach(function (m) { types[m.type] = 1; });
  var full = { type: 'cstate', seat: 'A', q: 17, a: '0123456012301230b', m: '11111111111111111', s: { B: '0123456012301230b', C: '0123456012301230b' } };
  var j = LIVE.codec.encode(full), back = LIVE.codec.decode(j), jc = C.codec.encode(full);
  var liveOnly = Object.keys(types).every(function (t) { return t === 'cstate' || t === 'hello'; });
  ok('G9 every contest message is cstate or hello; live.js and contest.js encode cstate the same; fullest < 200 bytes; round-trips', liveOnly && j === jc && j.length < 200 && eq(back, full), j.length + ' bytes: ' + j);
  controlMustFail('G9 a snapshot that carries every seat\'s a and m', function () { var bad = JSON.stringify({ t: 'x', A: { a: full.a, m: full.m }, B: { a: full.a, m: full.m }, C: { a: full.a, m: full.m }, s: full.s }); return bad.length < 200; });
  /* the old operation's types still round-trip through the same codec (no collision with the new code) */
  var old = { type: 'hello', seat: 'B', name: 'x' }, ob = LIVE.codec.decode(LIVE.codec.encode(old));
  ok('G9 live.js still carries the operation\'s own hello after cstate was added', ob && ob.type === 'hello' && ob.seat === 'B');
})();

/* ---- G10 ---- */
(function () {
  var w = world(['A', 'B', 'C'], 'g10'); w.make('A'); w.make('B'); w.make('C');
  var E = w.engines;
  for (var i = 0; i <= 11; i++) { ['A', 'B', 'C'].forEach(function (s) { E[s].answer(i, right(i)); }); w.flush(); if (!E.A.revealed(i) || !E.C.revealed(i)) throw new Error('trio reveal missing at ' + i); ['A', 'B', 'C'].forEach(function (s) { E[s].next(); }); w.flush(); }
  w.drop('C');
  E.A.answer(12, right(12)); w.flush();
  var waitB = !E.A.revealed(12);
  E.B.answer(12, wrong(12)); w.flush();
  var waitC = !E.A.revealed(12) && !E.B.revealed(12);
  w.advance(30000);
  var expect = C.standIn('g10', 'C', 12);
  var rev = E.A.revealed(12) && E.B.revealed(12) && E.A.seatState('C').a[12] === expect && E.B.seatState('C').a[12] === expect;
  var cols = Object.keys(E.A.view().scores).length === 3 && Object.keys(E.B.view().scores).length === 3;
  ok('G10 trio, one gone at 12: reveal waits for both present + the stand-in; three columns', waitB && waitC && rev && cols);
})();

/* ---- G11: a late stand-in crosses the REAL wire with its reason ---- */
(function () {
  var w = world(['A', 'B'], 'g11'); w.make('A'); w.make('B');
  playBoth(w, 8);
  var A = w.engines.A; A.answer(9, right(9)); w.flush(); w.advance(90000);
  var snap = A.snapshot(), wire = LIVE.codec.encode(snap), back = LIVE.codec.decode(wire);
  var B4 = C.makeEngine({ seat: 'B', seats: ['A', 'B'], seed: 'g11', now: w.now }); B4.receive(back);
  ok('G11 late stand-in through live.js: same answer and flag 2 on the other PC; < 200 bytes', B4.seatState('B').a[9] === C.standIn('g11', 'B', 9) && B4.seatState('B').m[9] === '2' && wire.length < 200, wire.length + ' bytes');
  controlMustFail('G11 a codec that lowercases the s-map loses the flag', function () {
    var bad = LIVE.codec.decode(wire); Object.keys(bad.s || {}).forEach(function (k) { bad.s[k] = bad.s[k].toLowerCase(); });
    var B5 = C.makeEngine({ seat: 'B', seats: ['A', 'B'], seed: 'g11', now: w.now }); B5.receive(bad);
    return B5.seatState('B').m[9] === '2';
  });
})();

/* =================== STRINGS =================== */
function literals(file) { /* every quoted string literal of a source file */
  var t = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/mg, ' '), out = [], re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g, m;
  while ((m = re.exec(t))) out.push((m[1] != null ? m[1] : m[2]).replace(/\\(['"\\])/g, '$1'));
  return out;
}
function pieces(s) { return String(s).split(/(?<=[.!?])\s+|\s+·\s+|\n/).map(function (x) { return x.trim(); }).filter(Boolean); }
function toks(s) { return (String(s).toLowerCase().replace(/’/g, "'").match(/\{[a-z]+\}|[a-z0-9]+(?:'[a-z]+)?/g) || []); }
function isPh(t) { return t.charAt(0) === '{'; }
function subseq(c, s) { var j = 0; for (var i = 0; i < s.length && j < c.length; i++) if (c[j] === s[i] || isPh(c[j]) || isPh(s[i])) j++; return j === c.length; }
var SOURCE = [].concat(literals(path.join(__dirname, 'l6v2-src/strings.js')), literals(path.join(__dirname, 'l6v2-src/contest.js')), literals(path.join(ROOT, 'platform/assets/see/see/strings.js')));
var SRC_SENT = []; SOURCE.forEach(function (s) { pieces(s).forEach(function (p) { var t = toks(p); if (t.length) SRC_SENT.push(t); }); });
function fromSource(sentence) { var c = toks(sentence); if (!c.length) return true; return SRC_SENT.some(function (s) { return s.length >= c.length && subseq(c, s); }); }
function walkStrings(x, p, f) { if (typeof x === 'string') f(x, p); else if (Array.isArray(x)) x.forEach(function (v, k) { walkStrings(v, p + '[' + k + ']', f); }); else if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { if (k !== 'REWRITES') walkStrings(x[k], p + '.' + k, f); }); }
function stringRule(S, Q, rewrites) {
  var bad = [];
  walkStrings(S, 'S', function (str, p) { if (rewrites[str]) return; pieces(str).forEach(function (sent) { if (!fromSource(sent)) bad.push(p + ': ' + sent); }); });
  Q.forEach(function (q, i) { ['patient', 'says', 'ask', 'why'].forEach(function (k) { if (q[k] && !rewrites[q[k]]) pieces(q[k]).forEach(function (sent) { if (!fromSource(sent)) bad.push('Q' + i + '.' + k + ': ' + sent); }); }); (q.opts || []).concat(q.blocks || []).forEach(function (o) { if (!fromSource(o)) bad.push('Q' + i + ' option: ' + o); }); });
  return bad;
}
(function () {
  var bad = stringRule(STR, C.Q, STR.REWRITES || {});
  ok('STRINGS every sentence is a word-for-word cut of the design source, or in REWRITES with a reason', bad.length === 0, bad.slice(0, 12).join(' | ') + (bad.length > 12 ? ' … +' + (bad.length - 12) : ''));
  var noReason = Object.keys(STR.REWRITES || {}).filter(function (k) { return !(STR.REWRITES[k] && STR.REWRITES[k].length > 10); });
  ok('STRINGS every REWRITE carries its reason', noReason.length === 0, noReason.join(' | '));
  controlMustFail('STRINGS an invented sentence', function () { return stringRule({ x: 'Bernadette loves pizza on Fridays.' }, [], {}).length === 0; });
  controlMustFail('STRINGS a source sentence with its words reordered', function () { return stringRule({ x: 'Answer own on your.' }, [], {}).length === 0; });
  controlMustFail('STRINGS a source sentence with one word swapped', function () { return stringRule({ x: 'Now wait for {partner} to leave.' }, [], {}).length === 0; });
})();

/* =================== WORDS (26 Nov ruling, counted the way qa-words-26nov.js counts) =================== */
function W(s) { return (String(s || '').match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length; }
function sentences(s) { return String(s || '').split(/[.!?]\s+|\n/).filter(function (x) { return x.trim(); }); }
function maxSent(arr) { var m = 0; arr.forEach(function (s) { sentences(s).forEach(function (x) { m = Math.max(m, W(x)); }); }); return m; }
function fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : 'Dr Marmalade'; }); }
var LONGNAME = 'Dr Marmalade'; /* the longest callsign, in words; real first names are one word */
/* THE WHY CUT (contest-ui.js whyFor): the why loses its last sentence while the reveal card is over 25 words */
function chipWords(seats) { /* "You: Not right" + "Dr Custard: Not right" per other seat */ return W(STR.rev.you + ': ' + STR.rev.chipWrong) + (seats - 1) * W(LONGNAME + ': ' + STR.rev.chipWrong); }
function whyFor(i, seats) { var parts = sentences(C.Q[i].why).map(function (x) { return x.replace(/[.!?]?$/, '.'); }); var base = chipWords(seats); while (parts.length > 1 && base + W(parts.join(' ')) > 25) parts.pop(); return parts.join(' '); }
function screens(S) { /* every composed card of the contest: [name, counted text[], job line] */
  var out = [], P = { partner: LONGNAME, name: 'Bríd', me: LONGNAME /* an accented first name counts as two words (the qa-words count) */, btn: 'See the first computer', n: '2', k: '3', total: '6', r: '2', roundName: 'Who is in charge?', a: '17', b: '17', winner: LONGNAME, patient: 'Pixel', right: 'storage (SSD or hard drive)' };
  function add(name, texts, job, help) { out.push({ name: name, texts: texts.map(function (t) { return fill(t, P); }), job: fill(job || '', P), help: (help || []).map(function (t) { return fill(t, P); }) }); }
  add('begin pair', [S.begin.title].concat(S.begin.lines), S.job.begin, S.help.begin);
  add('begin solo', [S.begin.title].concat(S.begin.solo), S.job.begin, S.help.beginSolo);
  add('begin team', [S.begin.title].concat(S.begin.team), S.job.begin, S.help.beginTeam);
  S.rounds.forEach(function (r, k) { add('round ' + (k + 1) + ' card', [r.title].concat(r.lines), S.job.intro.replace('{btn}', r.button), S.help.rounds[k]); });
  S.film.forEach(function (line, k) { add('film beat ' + (k + 1), [line], S.job.film, []); });
  C.Q.forEach(function (q, i) {
    var job = q.kind === 'part' ? S.job.pickPart : q.kind === 'order' ? S.job.order : S.job.pickOne;
    add('Q' + i + ' question', q.kind === 'part' ? [q.says] : [q.ask], job, S.help.pair);
    add('Q' + i + ' answered, waiting', (q.kind === 'part' ? [q.says] : [q.ask]).concat([S.wait.partner]), S.job.locked, S.help.pair);
    [1, 2, 3].forEach(function (seats) {
      var chips = [S.rev.you + ': ' + S.rev.chipWrong]; for (var k = 1; k < seats; k++) chips.push(LONGNAME + ': ' + S.rev.chipWrong);
      add('Q' + i + ' reveal, ' + seats + ' seat' + (seats > 1 ? 's' : ''), chips.concat([whyFor(i, seats)]), S.job.next.replace('{btn}', S.rev.nextRound.replace('{n}', '4')), S.help.more);
    });
  });
  add('notice: my stand-in, link', [S.rev.standInForMe], S.job.notice.replace('{btn}', S.rev.next), []);
  add('notice: my stand-in, late', [S.rev.standInLate], S.job.notice.replace('{btn}', S.rev.next), []);
  add('fallback card', [S.fixes.fallbackMe, S.fixes.fallbackSit], S.job.away, S.help.away);
  /* the result card as contest-ui.js resultLines() builds it: a pair shows one reveal, solo shows revealSolo, a trio
     shows two reveals and its headline is a whole-sentence cut (firstSent) of winMe / draw, or the trio line */
  function firstSent(s, n) { return sentences(s).slice(0, n).map(function (x) { return x.replace(/[.!?]?$/, '.'); }).join(' '); }
  ['winMe', 'winThem', 'draw'].forEach(function (k) { add('result pair ' + k, [S.result.title, S.result[k], S.result.reveal], S.job.result, S.help.more); });
  ['soloWin', 'soloLose', 'soloDraw'].forEach(function (k) { add('result ' + k, [S.result.title, S.result[k], S.result.revealSolo], S.job.result, S.help.more); });
  add('result trio, other wins', [S.result.title, S.result.trio, S.result.reveal, S.result.reveal], S.job.result, S.help.more);
  add('result trio, I win', [S.result.title, firstSent(S.result.winMe, 2), S.result.reveal, S.result.reveal], S.job.result, S.help.more);
  add('result trio, tie with me', [S.result.title, firstSent(S.result.draw, 2), S.result.reveal, S.result.reveal], S.job.result, S.help.more);
  add('result trio, tie without me', [S.result.title, firstSent(S.result.draw, 1), S.result.reveal, S.result.reveal], S.job.result, S.help.more);
  return out;
}
function wordGate(S) {
  var bad = [];
  screens(S).forEach(function (sc) {
    var n = sc.texts.reduce(function (a, t) { return a + W(t); }, 0);
    if (n > 25) bad.push(sc.name + ': ' + n + ' words');
    var ms = maxSent(sc.texts); if (ms > 14) bad.push(sc.name + ': a sentence of ' + ms);
    if (!sc.job) bad.push(sc.name + ': no job line'); else if (W(sc.job) > 14) bad.push(sc.name + ': job line ' + W(sc.job));
    sc.help.forEach(function (h) { if (maxSent([h]) > 14) bad.push(sc.name + ': help line ' + W(h)); });
  });
  walkStrings(S.wait, 'wait', function (s, p) { if (maxSent([fill(s, {})]) > 14) bad.push(p + ' ' + W(s)); });
  walkStrings(S.score, 'score', function (s, p) { if (maxSent([fill(s, {})]) > 14) bad.push(p + ' ' + W(s)); });
  /* the scoreboard's state line (aside): one partner line, or the link-lost line + its button */
  ['answered', 'thinking', 'behind', 'gone', 'solo', 'ahead'].forEach(function (k) { if (W(fill(S.score[k], {})) > 14) bad.push('score.' + k + ' ' + W(S.score[k])); });
  if (W(S.wait.linkLost) > 20 || maxSent([S.wait.linkLost]) > 14) bad.push('wait.linkLost ' + W(S.wait.linkLost));
  if (W(S.wait.gone) + W(fill(S.score.gone, {})) > 25) bad.push('aside gone lines ' + (W(S.wait.gone) + W(S.score.gone)));
  walkStrings(S.job, 'job', function (s, p) { if (W(fill(s, { btn: 'See the first computer' })) > 14) bad.push(p + ' ' + W(s)); });
  return bad;
}
(function () {
  var bad = wordGate(STR);
  ok('WORDS every contest card ≤ 25 counted words, ≤ 14 a sentence, a job line ≤ 14, help lines ≤ 14 (why cut applied)', bad.length === 0, bad.slice(0, 12).join(' | ') + (bad.length > 12 ? ' … +' + (bad.length - 12) : ''));
  controlMustFail('WORDS the begin card with every source line put back', function () { var S2 = JSON.parse(JSON.stringify(STR)); S2.begin.lines = S2.begin.lines.concat(S2.help.begin); return wordGate(S2).length === 0; });
  controlMustFail('WORDS a job line of 16 words', function () { var S2 = JSON.parse(JSON.stringify(STR)); S2.job.pickOne = 'Click the right answer and then wait for your partner to click their own answer too.'; return wordGate(S2).length === 0; });
  var helpful = ['begin', 'beginSolo', 'beginTeam', 'pair', 'solo', 'team', 'more', 'away'].every(function (k) { return STR.help[k] && STR.help[k].length; }) && STR.help.rounds.length === 4 && STR.help.rounds.every(function (r) { return r.length; });
  ok('WORDS every screen has a help list behind its Stuck? Show me button', helpful && STR.layer.helpBtn === 'Stuck? Show me');
})();

/* =================== LAPTOP / DECK =================== */
function stripComments(t) { return t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/(^|[^:'"\\])\/\/.*$/mg, '$1'); }
function laptopHits(files) { var hits = []; files.forEach(function (f) { if (!fs.existsSync(f)) return; var t = stripComments(fs.readFileSync(f, 'utf8')); var m = t.match(/[^\n]{0,40}laptop[^\n]{0,40}/ig); if (m) hits.push(path.basename(f) + ': ' + m[0].trim()); }); return hits; }
var L6_BUILT = fs.readdirSync(L6).filter(function (f) { return /\.(js|html|css)$/.test(f); }).map(function (f) { return path.join(L6, f); });
var LESSON = path.join(SRC, 'j1/lessons/j1-06.json'), DECK = path.join(SRC, 'j1/decks/j1-06.deck.json');
function deckGate(text) { var hits = []; ['Bernadette', 'Dr Marmalade', 'Dr Custard', 'Dr Pickle', 'laptop', 'Desmond', 'Nigel', 'Granny Rose'].forEach(function (w) { if (text.toLowerCase().indexOf(w.toLowerCase()) !== -1) hits.push(w); }); return hits; }
(function () {
  var hits = laptopHits(L6_BUILT.concat([LESSON]));
  ok('LAPTOP no "laptop" in any built l6 asset (comments stripped) or in j1-06.json', hits.length === 0, hits.join(' | '));
  controlMustFail('LAPTOP "Granny Rose\'s laptop" planted', function () { var f = path.join(require('os').tmpdir(), 'l6-laptop-control-' + process.pid + '.js'); fs.writeFileSync(f, "var x = 'Granny Rose\\'s laptop';"); var h = laptopHits([f]); fs.unlinkSync(f); return h.length === 0; });
  var deck = fs.existsSync(DECK) ? fs.readFileSync(DECK, 'utf8') : '';
  ok('DECK exists, no story names, no laptop', deck.length > 0 && deckGate(deck).length === 0, deck ? deckGate(deck).join(',') : 'no deck file');
  controlMustFail('DECK "Bernadette" planted', function () { return deckGate('{"title":"Bernadette wakes up"}').length === 0; });
})();

/* ---- report ---- */
var fails = 0;
results.forEach(function (r) { if (!r.pass) fails++; console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.note ? '  — ' + r.note : '')); });
console.log(fails ? ('\n' + fails + ' FAILED') : '\nALL GATES PASS, ALL CONTROLS CAUGHT');
process.exit(fails ? 1 : 0);
