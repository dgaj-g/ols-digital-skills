/* J1 L6 THE CONTEST — the pure engine (no DOM). Runs in the page and in node (contest-test.js).
   Spec: J1_L6_SPEC_V2.md §4. One snapshot per seat, broadcast whole; stand-ins by Bernadette are a pure function of (seed, seat, i). */
(function (root) {
  var PARTS = ['mem', 'drive', 'cpu', 'gpu', 'fan', 'psu', 'board'];
  var PART_NAME = { mem: 'memory', drive: 'storage drive', cpu: 'processor', gpu: 'graphics card', fan: 'fan', psu: 'power supply', board: 'motherboard' };
  var ROUNDS = [
    { n: 1, name: 'Ward round', from: 0, to: 5 },
    { n: 2, name: 'Who is in charge?', from: 6, to: 8 },
    { n: 3, name: "Inside Bernadette's head", from: 9, to: 11 },
    { n: 4, name: 'The real names', from: 12, to: 16 }
  ];
  /* right answer first in every opts list; shuffled on screen by seed, identically on both PCs */
  var Q = [
    { kind: 'part', patient: 'the library computer', says: 'All my files are gone. I cannot find a single one.', right: 'drive', why: 'Files live on the storage drive. It keeps them when the power is off.' },
    { kind: 'part', patient: "Mr Byrne's gaming PC", says: 'I get so hot that I switch myself off.', right: 'fan', why: 'The fan blows the heat out. If the computer gets too hot, it shuts down.' },
    { kind: 'part', patient: "Granny Rose's computer", says: 'When you open two things at once, I forget what I was doing.', right: 'mem', why: 'Memory holds what the computer is working on right now.' },
    { kind: 'part', patient: 'the till at the chip shop', says: 'No electricity gets in. I will not turn on at all.', right: 'psu', why: 'The power supply brings the electricity in from the wall.' },
    { kind: 'part', patient: 'the school office computer', says: 'I am working, but my screen shows nothing.', right: 'gpu', why: 'The graphics card draws the picture that goes to the screen.' },
    { kind: 'part', patient: 'the cinema ticket machine', says: 'Two plus two takes me all day. I cannot think.', right: 'cpu', why: 'The processor does all the thinking. It works out every sum and every step.' },
    { kind: 'mcq', ask: 'Which one tells all the parts what to do?', opts: ['The operating system', 'The fan', 'The keyboard', 'The screen'], why: 'The operating system runs the whole machine. It is a program, not a part.' },
    { kind: 'mcq', ask: 'Which one of these is an operating system?', opts: ['Windows', 'Microsoft Word', 'Minecraft', 'Google Chrome, a web browser'], why: 'Windows runs the PC. The other three are programs that run on it.' },
    { kind: 'mcq', ask: 'The school PCs run Windows. What does Windows do?', opts: ['Runs the machine and starts your programs', 'Keeps the PC cool', 'Keeps your files safe when the PC is off', 'Does the sums'], why: 'Windows is the operating system. It runs the whole PC. It starts your programs and lets each one use the parts.' },
    { kind: 'mcq', ask: 'Where does the processor get each instruction from?', opts: ['Memory', 'The fan', 'The screen', 'The power supply'], why: 'Memory holds the next instruction until the processor reads it.' },
    { kind: 'mcq', ask: 'The processor has finished one step of a sum. Where does the answer go?', opts: ['Back into memory', 'Into the fan', 'Onto the screen straight away', 'It is lost'], why: 'The answer goes back into memory, ready for the next step.' },
    { kind: 'order', ask: 'Put the four steps from the film in order, first to last.', blocks: ['Memory holds the instruction', 'The processor reads the instruction', 'The processor does what the instruction says', 'The answer goes back into memory'], why: 'The steps go from memory to the processor and back to memory. They repeat millions of times a second.' },
    { kind: 'mcq', ask: "This part does all of Bernadette's thinking. What is its real name?", opts: ['processor (CPU)', 'memory (RAM)', 'storage (SSD)', 'power supply (PSU)'], why: 'On the box of a new PC it says processor (CPU).' },
    { kind: 'mcq', ask: 'This part holds what Bernadette is working on right now. What is its real name?', opts: ['memory (RAM)', 'storage (SSD)', 'processor (CPU)', 'graphics card (GPU)'], why: 'On the box of a new PC it says memory (RAM).' },
    { kind: 'mcq', ask: "This part keeps Bernadette's files, even when she is off. What is its real name?", opts: ['storage (SSD or hard drive)', 'memory (RAM)', 'motherboard', 'fan'], why: 'On the box of a new PC it says storage (SSD or hard drive).' },
    { kind: 'mcq', ask: "This part draws the picture on Bernadette's screen. What is its real name?", opts: ['graphics card (GPU)', 'processor (CPU)', 'power supply (PSU)', 'memory (RAM)'], why: 'On the box of a new PC it says graphics card (GPU).' },
    { kind: 'mcq', ask: 'This part brings the electricity in from the wall. What is its real name?', opts: ['power supply (PSU)', 'graphics card (GPU)', 'storage (SSD)', 'motherboard'], why: 'On the box of a new PC it says power supply (PSU).' }
  ];
  var N = Q.length; /* 17; q === N is the result */
  var GONE_MS = 30000, LATE_MS = 90000, SOLO_MS = 1500;

  /* ---- helpers ---- */
  function hash32(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function dash(n) { return new Array(n + 1).join('-'); }
  function zeros(n) { return new Array(n + 1).join('0'); }
  function setAt(str, i, ch) { return str.slice(0, i) + ch + str.slice(i + 1); }
  /* permutations of [0,1,2,3] in lexicographic order; index 0 = identity = the right order */
  var PERMS = (function () { var out = []; function rec(p, rest) { if (!rest.length) { out.push(p); return; } rest.forEach(function (x, k) { rec(p.concat([x]), rest.slice(0, k).concat(rest.slice(k + 1))); }); } rec([], [0, 1, 2, 3]); return out; })();
  function permChar(perm) { var idx = PERMS.findIndex(function (p) { return p.join('') === perm.join(''); }); return String.fromCharCode(97 + idx); }
  function charPerm(ch) { return PERMS[ch.charCodeAt(0) - 97]; }
  function roundOf(i) { for (var r = 0; r < ROUNDS.length; r++) if (i >= ROUNDS[r].from && i <= ROUNDS[r].to) return ROUNDS[r]; return null; }
  function seededShuffle(arr, key) { var a = arr.slice(), h = hash32(key); for (var i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; var j = h % (i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* the order options appear on screen, the same on every PC for this seed and question: list of canonical indexes */
  function screenOrder(seed, i) {
    var q = Q[i];
    if (q.kind === 'part') return seededShuffle(PARTS.map(function (_, k) { return k; }), seed + ':tray:' + i);
    if (q.kind === 'mcq') return seededShuffle([0, 1, 2, 3], seed + ':opts:' + i);
    return seededShuffle([0, 1, 2, 3], seed + ':blocks:' + i); /* order question: the blocks' start positions */
  }
  function rightChar(i) { var q = Q[i]; return q.kind === 'part' ? String(PARTS.indexOf(q.right)) : q.kind === 'mcq' ? '0' : 'a'; }
  function isRight(i, ch) { return ch !== '-' && ch === rightChar(i); }
  function answerName(i, ch) {
    var q = Q[i]; if (ch === '-') return '';
    if (q.kind === 'part') return PART_NAME[PARTS[+ch]];
    if (q.kind === 'mcq') return q.opts[+ch];
    return charPerm(ch).map(function (b) { return q.blocks[b]; }).join(' → ');
  }
  /* Bernadette's stand-in answer: right 2 in 5, otherwise one fixed wrong option; identical on every PC */
  function standIn(seed, seat, i) {
    var h = hash32(seed + ':' + seat + ':' + i), q = Q[i];
    if (h % 5 < 2) return rightChar(i);
    var k = (h >>> 3);
    if (q.kind === 'part') { var wrong = PARTS.filter(function (p) { return p !== q.right; }); return String(PARTS.indexOf(wrong[k % wrong.length])); }
    if (q.kind === 'mcq') return String(1 + (k % 3));
    return String.fromCharCode(97 + 1 + (k % 23));
  }
  /* LEAVE (V97, the way out part-way): a pupil who presses Leave the contest sends one last snapshot with q = N + 1 (LEFT).
     Every other PC then lets Bernadette answer for her at once, flagged '3', on every question she did not answer
     herself (her own answers are the ones her own snapshot flags '0'). Each PC works the same flags out from the same last
     snapshot, so both screens give the same reason (DFM 399), and a '3' is never written into the s map. */
  var LEFT = N + 1;
  /* A LATE stand-in travels in the s map in capitals (digit d -> letter A+d; an order letter upper-cased), a GONE one as the plain answer char,
     so the PC it was made for keeps the reason at no extra byte. m[i] is '1' for gone, '2' for late. */
  function toLate(ch) { return /[0-9]/.test(ch) ? String.fromCharCode(65 + +ch) : ch.toUpperCase(); }
  function isLate(ch) { return /[A-Z]/.test(ch); }
  function fromLate(ch, i) { if (!isLate(ch)) return ch; return Q[i].kind === 'order' ? ch.toLowerCase() : String(ch.charCodeAt(0) - 65); }

  /* ---- the engine ---- */
  /* opt: { seat, seats (all real seats, mine included; [] or ['A'] = solo), seed, send(msg), now(), presence(seat) -> ms since last beat or Infinity, onChange(ev) } */
  function makeEngine(opt) {
    var me = opt.seat, seats = (opt.seats && opt.seats.length) ? opt.seats.slice() : [me];
    var solo = seats.length < 2;
    var others = solo ? ['Z'] : seats.filter(function (s) { return s !== me; });
    var all = seats.concat(solo ? ['Z'] : []);
    var seed = String(opt.seed || 'seed');
    var S = {}; all.forEach(function (s) { S[s] = { q: 0, a: dash(N), m: zeros(N) }; });
    var mine = S[me];
    var sIn = {}; others.forEach(function (o) { sIn[o] = dash(N); });
    var answeredAt = {}, lastSeen = {}, standEv = {};
    var own = {}; /* per other seat: the answers she gave herself (her snapshot's '0' flags), '-' elsewhere */
    function hasLeft(o) { return o !== 'Z' && !!S[o] && S[o].q > N; }
    function ownCh(o, i) { return own[o] ? own[o][i] : '-'; }
    /* she has left: every answer that is not her own is Bernadette's, for that reason, on every PC */
    function relabelLeft(o) { for (var i = 0; i < N; i++) if (ownCh(o, i) === '-' && S[o].a[i] !== '-' && S[o].m[i] !== '3') { S[o].m = setAt(S[o].m, i, '3'); standEv[o + ':' + i] = 'left'; } }
    var goneMs = opt.goneMs || GONE_MS, lateMs = opt.lateMs || LATE_MS; /* overridable ONLY by the gate controls */
    function now() { return opt.now ? opt.now() : Date.now(); }
    others.forEach(function (o) { if (o !== 'Z') lastSeen[o] = now(); }); /* the partner was here a second ago: the operation just ended */
    function seenNow(o) { lastSeen[o] = now(); if (lastSeen[o + ':wasGone']) { lastSeen[o + ':wasGone'] = 0; emit({ back: o }); } }
    function emit(ev) { if (opt.onChange) opt.onChange(ev || {}); }
    function snapshot() { var s = {}; others.forEach(function (o) { if (o !== 'Z' && /[^-]/.test(sIn[o])) s[o] = sIn[o]; }); return { type: 'cstate', seat: me, q: mine.q, a: mine.a, m: mine.m, s: s }; }
    function broadcast() { if (opt.send && !solo) return opt.send(snapshot()); }
    function allAnswered(i) { return all.every(function (s) { return S[s].a[i] !== '-'; }); }
    function revealed(i) { return i < N && allAnswered(i); }
    function putStandIn(o, i, kind) {
      var ch = standIn(seed, o, i), flag = kind === 'late' ? '2' : kind === 'left' ? '3' : '1';
      if (o !== 'Z' && flag !== '3') sIn[o] = setAt(sIn[o], i, flag === '2' ? toLate(ch) : ch);
      S[o].a = setAt(S[o].a, i, ch); S[o].m = setAt(S[o].m, i, flag);
      standEv[o + ':' + i] = kind;
      broadcast(); emit({ standIn: { seat: o, i: i, kind: kind } });
    }
    var E = {
      me: me, seats: seats, others: others, all: all, solo: solo, seed: seed, N: N,
      Q: Q, ROUNDS: ROUNDS, PARTS: PARTS, PART_NAME: PART_NAME,
      screenOrder: function (i) { return screenOrder(seed, i); },
      answer: function (i, ch) {
        if (i !== mine.q || mine.a[i] !== '-') return false;
        mine.a = setAt(mine.a, i, ch); answeredAt[i] = now();
        broadcast(); emit({ answered: i });
        return true;
      },
      answerPart: function (i, partKey) { return E.answer(i, String(PARTS.indexOf(partKey))); },
      answerOrder: function (i, perm) { return E.answer(i, permChar(perm)); },
      next: function () { if (mine.q < N && revealed(mine.q)) { mine.q++; broadcast(); emit({ next: mine.q }); return true; } return false; },
      hello: function () { broadcast(); },
      /* Leave the contest: one last snapshot that says so. Returns what send returned (the push), so the page can wait for it. */
      leave: function () { if (mine.q > N) return null; mine.q = LEFT; var r = broadcast(); emit({ leave: me }); return r; },
      hasLeft: hasLeft,
      receive: function (m) {
        if (!m || m.seat === me) return;
        if (m.type === 'hello') { broadcast(); return; }
        if (m.type === 'beat') { if (S[m.seat]) seenNow(m.seat); return; }
        if (m.type !== 'cstate' || !S[m.seat]) return;
        var o = m.seat, changed = false, mineChanged = false;
        seenNow(o);
        for (var i = 0; i < N; i++) {
          if (m.a && m.a[i] !== '-' && S[o].a[i] === '-') { S[o].a = setAt(S[o].a, i, m.a[i]); S[o].m = setAt(S[o].m, i, (m.m || zeros(N))[i]); changed = true; }
        }
        if (m.a) { var ow = own[o] || dash(N); for (var k = 0; k < N; k++) if (ow[k] === '-' && m.a[k] !== '-' && (m.m || zeros(N))[k] === '0') ow = setAt(ow, k, m.a[k]); own[o] = ow; }
        if ((m.q || 0) > S[o].q) { var wasIn = S[o].q <= N; S[o].q = m.q; changed = true; if (wasIn && m.q > N) { relabelLeft(o); emit({ left: o }); } }
        var sm = m.s || {};
        Object.keys(sm).forEach(function (target) {
          if (!S[target]) return;
          for (var i = 0; i < N; i++) {
            var raw = sm[target][i]; if (raw === '-') continue;
            var ch = fromLate(raw, i), flag = isLate(raw) ? '2' : '1';
            if (target !== me && hasLeft(target) && ownCh(target, i) === '-') flag = '3';
            if (target !== me && S[target].m[i] === '3') continue; /* a '3' is never changed back */
            if (target === me) {
              if (mine.a[i] !== ch || mine.m[i] !== flag) { mine.a = setAt(mine.a, i, ch); mine.m = setAt(mine.m, i, flag); standEv[me + ':' + i] = flag === '2' ? 'late' : 'forMe'; mineChanged = true; }
            } else if (S[target].a[i] !== ch || S[target].m[i] !== flag) {
              S[target].a = setAt(S[target].a, i, ch); S[target].m = setAt(S[target].m, i, flag); if (sIn[target]) sIn[target] = setAt(sIn[target], i, raw); changed = true;
            }
          }
        });
        if (mineChanged) broadcast();
        if (changed || mineChanged) emit({ merged: o });
      },
      /* called every second by the page, or by the virtual clock in the gates */
      tick: function () {
        var t = now();
        others.forEach(function (o) {
          if (o === 'Z') {
            for (var i = 0; i < N; i++) if (mine.a[i] !== '-' && S.Z.a[i] === '-' && answeredAt[i] != null && t - answeredAt[i] >= SOLO_MS) putStandIn('Z', i, 'solo');
            return;
          }
          if (hasLeft(o)) { for (var j = 0; j < N; j++) if (mine.a[j] !== '-' && S[o].a[j] === '-') putStandIn(o, j, 'left'); return; }
          var seen = t - lastSeen[o];
          if (opt.presence) seen = Math.min(seen, opt.presence(o));
          var gone = seen >= goneMs;
          if (gone && !lastSeen[o + ':wasGone']) { lastSeen[o + ':wasGone'] = 1; emit({ gone: o }); }
          for (var i = 0; i < N; i++) {
            if (mine.a[i] === '-' || S[o].a[i] !== '-') continue;
            if (gone) { putStandIn(o, i, 'gone'); continue; }
            if (S[o].q === i && answeredAt[i] != null && t - answeredAt[i] >= lateMs) putStandIn(o, i, 'late');
          }
        });
      },
      load: function (snap) { /* the platform draft on remount */
        if (!snap || snap.seat !== me) return;
        mine.q = snap.q || 0; mine.a = snap.a || dash(N); mine.m = snap.m || zeros(N);
        for (var k = 0; k < N; k++) if (mine.a[k] !== '-') answeredAt[k] = now(); /* the 90 s clock restarts after a reload */
        Object.keys(snap.s || {}).forEach(function (o) { if (sIn[o]) { sIn[o] = snap.s[o]; for (var i = 0; i < N; i++) if (snap.s[o][i] !== '-') { S[o].a = setAt(S[o].a, i, fromLate(snap.s[o][i], i)); S[o].m = setAt(S[o].m, i, isLate(snap.s[o][i]) ? '2' : '1'); } } });
        if (solo) for (var i = 0; i < N; i++) if (mine.a[i] !== '-' && S.Z.a[i] === '-') { S.Z.a = setAt(S.Z.a, i, standIn(seed, 'Z', i)); S.Z.m = setAt(S.Z.m, i, '1'); }
      },
      snapshot: snapshot,
      revealed: revealed,
      score: function (s) { var n = 0; for (var i = 0; i < N; i++) if (isRight(i, S[s].a[i])) n++; return n; },
      isGone: function (o) { return !!lastSeen[o + ':wasGone']; },
      seatState: function (s) { return S[s]; },
      standKind: function (s, i) { return standEv[s + ':' + i] || (S[s].m[i] === '3' ? 'left' : S[s].m[i] === '2' ? 'late' : S[s].m[i] === '1' ? 'forMe' : ''); },
      /* a plain picture of where I am, for the page */
      view: function () {
        var q = mine.q, i = q < N ? q : N - 1, r = roundOf(i);
        var done = q >= N && all.every(function (s) { return S[s].a.indexOf('-') === -1; });
        var partnerState = {};
        others.forEach(function (o) {
          var st = S[o];
          if (o === 'Z') partnerState[o] = 'solo';
          else if (hasLeft(o)) partnerState[o] = 'left';
          else if (lastSeen[o + ':wasGone']) partnerState[o] = 'gone';
          else if (q < N && st.a[q] !== '-') partnerState[o] = 'answered';
          else if (st.q < q) partnerState[o] = 'behind';
          else if (st.q > q) partnerState[o] = 'ahead';
          else partnerState[o] = 'thinking';
        });
        var scores = {}; all.forEach(function (s) { scores[s] = E.score(s); });
        return { q: q, i: i, round: r, idxInRound: i - r.from + 1, roundTotal: r.to - r.from + 1, mine: mine, S: S, revealed: q < N && revealed(q), done: done, partnerState: partnerState, scores: scores, firstOfRound: q < N && q === r.from, lastOfRound: q < N && q === r.to };
      }
    };
    return E;
  }

  /* SHARED (live.js codec): the one entry the build adds. type|seat|q|a|m|Bs17,Cs17 — mirrors live.js encode/decode style. */
  var CSTATE_CODE = 'x';
  function encodeCstate(m) {
    if (m.type !== 'cstate') return null;
    var s = m.s || {};
    return [CSTATE_CODE, m.seat || '', m.q == null ? '' : m.q, m.a || '', m.m || '', Object.keys(s).map(function (k) { return k + s[k]; }).join(',')].join('|');
  }
  function decodeCstate(str) {
    if (typeof str !== 'string') return null;
    var h = str.split('|'); if (h[0] !== CSTATE_CODE) return null;
    var m = { type: 'cstate', seat: h[1] || null, q: h[2] === '' ? 0 : +h[2], a: h[3] || dash(N), m: h[4] || zeros(N), s: {} };
    (h[5] ? h[5].split(',') : []).forEach(function (x) { if (x.length > 1) m.s[x[0]] = x.slice(1); });
    return m;
  }

  var api = { LEFT: LEFT, makeEngine: makeEngine, codec: { encode: encodeCstate, decode: decodeCstate, code: CSTATE_CODE }, Q: Q, N: N, ROUNDS: ROUNDS, PARTS: PARTS, PART_NAME: PART_NAME, PERMS: PERMS, hash32: hash32, standIn: standIn, rightChar: rightChar, isRight: isRight, answerName: answerName, screenOrder: screenOrder, permChar: permChar, charPerm: charPerm, GONE_MS: GONE_MS, LATE_MS: LATE_MS, SOLO_MS: SOLO_MS };
  root.L6CONTEST = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
