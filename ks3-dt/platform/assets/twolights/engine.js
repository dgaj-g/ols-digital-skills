/* SAME LIGHT · the fold (spec V2 §2, §5.5, §7). Pure: fold(log, now, opts) → state. No DOM, no timers.
   Every window folds the same ordered log and must reach the same state (gate A6).
   UMD: window.SameLight in the page, require() in the gates. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./judge.js'), require('./programs.js'), require('./pyrun.js'), require('./clock.js'));
  else root.SameLight = factory(root.TwoLightsJudge, root.TwoLightsPrograms, root.PyRun, root.TwoLightsClock);
}(typeof self !== 'undefined' ? self : this, function (J, PR, Py, CK) {
  'use strict';
  var SEAT = 'A';   // one light for the pair: every program is the North Light's (K100)
  var PHASES = ['pre1', 'w1', 'ch1', 'pre2', 'w2', 'ch2', 'pre3', 'w3', 'ch3', 'ch4', 'home'];
  var LOCAL = { pre1: ['sound', 'pair', 'cold', 'tour', 'r1'], pre2: ['r2'], pre3: ['t3'], home: ['home'] };
  var T = { W_LEN: 34000, W_SKIP: 8000, NAME_SHOW: 2500, SWAP: 2000, CARD: 2200, HELP_EVERY: 45000, LOOKOUT_AT: 30000, WAKE_AT: 90000, GONE: 180000, LINK: 10000 };
  var BUDGET = { ch1: 120000, ch2: 120000, ch3: 120000, ch4: 120000 };   // B1–B4 set by tools/pace.js 31 Oct 2026 (A11): longest walked stand 65 s × 1.25 = 81 s → the 120 s floor
  var KIND = { S1: 'red', S2: 'red', S3: 'red', Q1: 'silent', Q2: 'none', Q3: 'silent' };
  var PYTYPE = { NameError: 'S1', TypeError: 'S2', IndentationError: 'S3' };
  var DEF = { Q1: 'def fog_horn():', Q3: 'def lamp_on():', Q2: 'def bearing():' };
  var FN = { Q1: 'fog_horn', Q3: 'lamp_on', Q2: 'bearing', S1: 'lamp_on' };
  var LOOK = { ch1: '    light(beam)', ch2: '    horn(blasts)', ch3: 'radio(b)', ch4: '    light(beam)' };
  var TOTAL = 7;

  /* ---------- the programs ---------- */
  function variant(room) { return PR.seatVariant(room || '', SEAT); }
  function given(ch, room) { return J.givenProgram(ch, SEAT, variant(room)); }
  function idsOf(ch, room) { return ch === 'ch4' ? PR.variantFaults(variant(room)) : { ch1: ['S1', 'S2'], ch2: ['Q1'], ch3: ['Q2'] }[ch]; }
  function judgeSrc(ch, room, src) { return J.judge(ch, SEAT, src, { variant: variant(room) }); }
  function lineOf(src, canon) {
    var n = J.norm(canon), ls = String(src).split('\n');
    for (var i = 0; i < ls.length; i++) if (J.norm(ls[i]) === n) return i + 1;
    return null;
  }
  function lineText(src, n) { var ls = String(src).split('\n'); return n >= 1 && n <= ls.length ? ls[n - 1].trim() : ''; }
  // which fault the run reveals: a red names its own; else the first silent fault still present, in line order
  function reveal(ch, room, r) {
    var ids = idsOf(ch, room), c = J.chapter(ch, SEAT), idx = {};
    c.faults.forEach(function (f) { idx[f.id] = f.idx; });
    var present = ids.filter(function (id) { return r.faults[id] && r.faults[id].present; });
    if (r.shout && r.run && r.run.error) {
      var s = PYTYPE[r.run.error.type];
      if (s && present.indexOf(s) >= 0) return s;
      var anyShout = present.filter(function (id) { return J.SHOUT[id]; });
      if (anyShout.length) return anyShout[0];
    }
    var quiet = present.filter(function (id) { return !J.SHOUT[id]; }).sort(function (a, b) { return idx[a] - idx[b]; });
    return quiet[0] || present[0] || null;
  }
  function rightLine(f, r) {
    if (!f.id) return null;
    if (KIND[f.id] === 'red') return r.run && r.run.error ? r.run.error.line : null;
    return lineOf(f.src, DEF[f.id]);
  }
  function fixedNow(f, r) { return !!f.id && r.faults[f.id] && !r.faults[f.id].present && r.broken.length === 0; }

  /* ---------- the worked examples (§6.2) ---------- */
  var W = {
    w1: { src: 'beam = 24\n\ndef lamp_on():\n    light(beam)\n\nlamp_onn()', line: 6, fix: 'lamp_on()', fixed: 'beam = 24\n\ndef lamp_on():\n    light(beam)\n\nlamp_on()', effect: 'lamp', card: 'red', kind: 'NameError' },
    w2: { src: 'blasts = 2\n\ndef fog_horn():\n    horn(blasts)', line: 3, fix: 'fog_horn()', fixed: 'blasts = 2\n\ndef fog_horn():\n    horn(blasts)\nfog_horn()', effect: 'horn', card: 'silent', kind: 'silent', append: true },
    w3: { src: 'def bearing():\n    print("Bearing 214")\n\nb = bearing()\nradio(b)', line: 1, fix: '    return 214', fixed: 'def bearing():\n    print("Bearing 214")\n    return 214\n\nb = bearing()\nradio(b)', effect: 'radio', card: 'none', kind: 'none', insertAfter: 2 }
  };
  Object.keys(W).forEach(function (k) { var w = W[k]; w.red = Py.run(w.src, { file: 'north_light.py' }).red || ''; w.out = Py.run(w.fixed, { file: 'north_light.py' }).out || []; });

  /* ---------- the extras (§8 EXTRAS; one fault each, solo) ---------- */
  function judgeExtra(x, text) {
    var want = x.fixed.split('\n').filter(function (l) { return l.trim() && l.trim()[0] !== '#'; }).map(J.norm);
    var got = String(text).split('\n').filter(function (l) { return l.trim() && l.trim()[0] !== '#'; }).map(J.norm);
    var run; try { run = Py.run(String(text), { file: 'extra.py' }); } catch (e) { run = { out: [], red: '', error: null }; }
    var same = want.length === got.length && want.every(function (l, i) { return l === got[i]; });
    return { fixed: same && !run.error, red: run.red || '', console: run.out || [], error: run.error };
  }

  /* ---------- the fold ---------- */
  function fresh(opts) {
    var seats = opts.seats || ['A', 'B'];
    var st = { mode: opts.mode || (seats.length === 1 ? 'solo' : seats.length === 3 ? 'trio' : 'pair'), seats: seats, room: opts.room || '',
      phase: 'pre1', phaseAt: null, local: {}, w: null, ch: null, faultNo: 0, fixedCount: 0, coins: 0, pauses: [], badges: [],
      bay: { lamp: 0, horn: 0, radio: null }, cards: [], events: 0, gone: opts.gone || {}, extras: {} };
    seats.forEach(function (s) { st.local[s] = { ready: {}, stage: 'sound', nosound: false, firstAt: null }; st.extras[s] = { coins: 0, done: {} }; });
    return st;
  }
  function active(st) { return st.seats.filter(function (s) { return !st.gone[s]; }); }
  function fixerOf(st) {
    if (!st.ch || !st.ch.fault) return null;
    var f = st.ch.fault, a = active(st);
    if (a.indexOf(f.fixer) >= 0) return f.fixer;
    return a[0] || f.fixer;
  }
  function readersOf(st) { var fx = fixerOf(st); var r = active(st).filter(function (s) { return s !== fx; }); return r.length ? r : [fx]; }
  function isReader(st, seat) { return readersOf(st).indexOf(seat) >= 0; }
  function isFixer(st, seat) { return fixerOf(st) === seat; }
  function solo(st) { return active(st).length <= 1; }

  function nextPhase(st, t) {
    var i = PHASES.indexOf(st.phase);
    st.phase = PHASES[i + 1]; st.phaseAt = t;
    if (st.phase[0] === 'w') st.w = { id: st.phase, startAt: t, skipped: {}, skipAt: null };
    if (st.phase[0] === 'c') startChapter(st, st.phase, t);
    if (st.phase === 'home') { st.badges.push('j3-b15'); }
  }
  function startChapter(st, ch, t) {
    st.ch = { id: ch, ids: idsOf(ch, st.room), src: given(ch, st.room), startAt: t, fault: null, done: false, doneAt: null, last: null, fixedIds: [] };
    if (ch === 'ch4') st.bay = { lamp: 0, horn: 0, radio: null };
    nextFault(st, t);
  }
  function nextFault(st, t) {
    var c = st.ch;
    var left = c.ids.filter(function (id) { return c.fixedIds.indexOf(id) < 0; });
    if (!left.length) { c.done = true; c.doneAt = t; st.ch.fault = null; if (c.id === 'ch1') st.badges.push('j3-b13'); if (c.id === 'ch3') st.badges.push('j3-b14'); nextPhase(st, t); return; }
    st.faultNo++;
    var fx = st.seats[(st.faultNo - 1) % st.seats.length];
    c.fault = { no: st.faultNo, fixer: fx, step: 'run', stepAt: t, id: null, kind: null, src: c.src, runAt: null, picks: {}, right: null, agreed: false, wrongAgreed: false,
      help: { steps: 0, progressAt: t }, lookout: { answered: false, by: null, line: null, right: null }, name: null, fails: [], fixedAt: null, lastRun: null, skipped: false };
  }
  function runJudge(st, src) { return judgeSrc(st.ch.id, st.room, src); }
  function applyEffects(st, r) {
    var e = r.effects;
    if (st.ch.id === 'ch4') st.bay = { lamp: e.lamp, horn: e.horn, radio: e.radio };
    else { if (e.lamp) st.bay.lamp = 1; if (e.horn) st.bay.horn = 1; if (e.radio != null) st.bay.radio = e.radio; }
  }
  function advance(st, t) {
    for (var guard = 0; guard < 12; guard++) {
      if (st.phase[0] === 'w' && st.w) {
        var a = active(st), all = a.length > 0 && a.every(function (s) { return st.w.skipped[s]; });
        var end = all ? st.w.skipAt : st.w.startAt + T.W_LEN;
        if (t >= end) { nextPhase(st, end); continue; }
      }
      if (st.ch && st.ch.fault && st.ch.fault.step === 'name' && st.ch.fault.name) {
        var f = st.ch.fault, at = f.name.at;
        if (t >= at + T.NAME_SHOW + T.SWAP) { st.ch.fixedIds.push(f.id); f.step = 'over'; nextFault(st, at + T.NAME_SHOW + T.SWAP); continue; }
        if (t >= at + T.NAME_SHOW && f.step !== 'swap') { f.step = 'swap'; f.stepAt = at + T.NAME_SHOW; }
      }
      break;
    }
  }
  function apply(st, e) {
    var seat = e.seat, t = e.t, d = e.d || {};
    st.events++;
    if (!st.local[seat]) return;
    if (st.local[seat].firstAt == null) st.local[seat].firstAt = t;
    var k = e.k;
    if (k === 'pause') { var open = st.pauses.some(function (p) { return p.to == null; }); if (!open) st.pauses.push({ from: t, to: null, by: seat }); return; }
    if (k === 'carry') { st.pauses.forEach(function (p) { if (p.to == null) p.to = t; }); return; }
    if (k === 'ready') {
      var L = st.local[seat]; L.ready[d.stage] = true; if (d.nosound) L.nosound = true;
      var list = LOCAL[st.phase] || [];
      if (list.indexOf(d.stage) >= 0 && d.stage === list[list.length - 1]) {
        var all = active(st).every(function (s) { return st.local[s].ready[d.stage]; });
        if (all && st.phase !== 'home') nextPhase(st, t);
      }
      return;
    }
    if (k === 'skip') { if (st.phase[0] === 'w' && st.w && !st.w.skipped[seat]) { st.w.skipped[seat] = true; st.w.skipAt = t; } return; }
    if (k === 'extra') {   // solo, per seat: {id, src}
      var X = st.extras[seat], x = PR.EXTRAS.filter(function (q) { return q.id === d.id; })[0]; if (!x) return;
      var jr = judgeExtra(x, d.src); if (jr.fixed && !X.done[d.id]) { X.done[d.id] = true; X.coins++; }
      X.last = { id: d.id, red: jr.red, console: jr.console, fixed: jr.fixed }; return;
    }
    if (!st.ch || !st.ch.fault) return;
    var f = st.ch.fault, isFx = isFixer(st, seat), isRd = isReader(st, seat), awake = f.step === 'fix' && t >= f.stepAt + T.WAKE_AT;
    if (k === 'run') {
      if (f.step === 'run' && (isRd || solo(st))) {
        var r = runJudge(st, f.src); f.lastRun = r; st.ch.last = r; f.runAt = t;
        f.id = reveal(st.ch.id, st.room, r);
        if (!f.id) { f.skipped = true; f.name = { at: t, skipped: true }; f.step = 'name'; return; }
        f.kind = KIND[f.id]; f.right = rightLine(f, r); f.step = 'point'; f.stepAt = t; f.help.progressAt = t;
        if (!r.shout) applyEffects(st, r);
        return;
      }
      if (f.step === 'fix' && (isFx || awake || solo(st))) {
        var r2 = runJudge(st, f.src); f.lastRun = r2; st.ch.last = r2; f.help.progressAt = t; f.lastRunAt = t;
        if (!r2.shout) applyEffects(st, r2);
        if (fixedNow(f, r2)) { f.fixedAt = t; f.step = 'name'; f.stepAt = t; f.name = null; }
        return;
      }
      return;
    }
    if (k === 'text') {
      if (f.step === 'fix' && (isFx || awake || solo(st))) { f.src = String(d.src); st.ch.src = f.src; f.help.progressAt = t; f.typingBy = seat; f.typingAt = t; }
      return;
    }
    if (k === 'point') {
      if (f.step !== 'point') return;
      f.picks[seat] = d.line; f.help.progressAt = t;
      var a = active(st), picks = a.map(function (s) { return f.picks[s]; }).filter(function (v) { return v != null; });
      var need = a.length >= 3 ? 2 : a.length;
      var count = {}; picks.forEach(function (v) { count[v] = (count[v] || 0) + 1; });
      var agreedLine = null; Object.keys(count).forEach(function (v) { if (count[v] >= need) agreedLine = Number(v); });
      if (agreedLine == null) return;
      if (agreedLine === f.right) { f.agreed = true; f.wrongAgreed = false; f.step = 'fix'; f.stepAt = t; f.help.progressAt = t; }
      else { f.wrongAgreed = true; f.picks = {}; }
      return;
    }
    if (k === 'help') { if ((f.step === 'point' || f.step === 'fix') && (isRd || solo(st))) { f.help.steps = Math.min(3, f.help.steps + 1); f.help.openedAt = t; } return; }
    if (k === 'lookout') {
      if (f.step === 'fix' && isRd && !solo(st) && t >= f.stepAt + T.LOOKOUT_AT && !f.lookout.answered) {
        var want = lineOf(f.src, LOOK[st.ch.id]); f.lookout = { answered: true, by: seat, line: d.line, right: d.line === want, want: want, at: t };
        if (f.lookout.right) st.coins++;
      }
      return;
    }
    if (k === 'name') {
      if (f.step === 'name' && !f.name && (isRd || solo(st))) { f.name = { card: d.card, right: d.card === f.kind, at: t, by: seat }; if (f.name.right) st.coins++; st.fixedCount++; }
      return;
    }
    if (k === 'boat') {
      if (f.step === 'point' || f.step === 'fix') {
        var last = f.fails.length ? f.fails[f.fails.length - 1] : -Infinity;
        if (t - last > CK.BLACK_MS) f.fails.push(t);
      }
      return;
    }
  }
  function sortLog(log) { return log.slice().sort(function (a, b) { return a.t - b.t || (a.seat < b.seat ? -1 : a.seat > b.seat ? 1 : 0) || (a.n || 0) - (b.n || 0); }); }
  function fold(log, now, opts) {
    var st = fresh(opts || {});
    sortLog(log).forEach(function (e) { advance(st, e.t); apply(st, e); });
    advance(st, now);
    st.now = now;
    // derived, for the renderer
    st.seats.forEach(function (s) {
      var L = st.local[s], list = LOCAL[st.phase] || [];
      L.stage = null;
      for (var i = 0; i < list.length; i++) if (!L.ready[list[i]]) { L.stage = list[i]; break; }
      if (L.stage == null) L.stage = st.phase[0] === 'w' ? 'watch' : st.phase[0] === 'c' ? 'chapter' : st.phase === 'home' ? 'extras' : 'wait';
    });
    if (st.ch && st.ch.fault) {
      var f = st.ch.fault;
      f.helpShown = f.step === 'point' || f.step === 'fix' ? Math.max(f.help.steps, Math.min(3, Math.floor((now - f.help.progressAt) / T.HELP_EVERY))) : 0;
      f.lookoutShown = f.step === 'fix' && now >= f.stepAt + T.LOOKOUT_AT && !solo(st);
      f.awake = f.step === 'fix' && now >= f.stepAt + T.WAKE_AT;
      var room = { t0: f.runAt, fails: f.fails, pauses: st.pauses, doneAt: f.fixedAt };
      f.boat = f.runAt == null ? { x: 0, drifting: false, black: false } : CK.position(room, now, BUDGET[st.ch.id]);
      f.rocksAt = f.runAt == null ? null : CK.rocksAt(room, now, BUDGET[st.ch.id]);
      f.fixerNow = fixerOf(st); f.readersNow = readersOf(st);
    }
    st.paused = st.pauses.some(function (p) { return p.to == null; });
    return st;
  }
  return { fold: fold, T: T, BUDGET: BUDGET, KIND: KIND, FN: FN, DEF: DEF, LOOK: LOOK, TOTAL: TOTAL, W: W, PHASES: PHASES, LOCAL: LOCAL,
    given: given, idsOf: idsOf, judgeSrc: judgeSrc, lineOf: lineOf, lineText: lineText, judgeExtra: judgeExtra, variant: variant, SEAT: SEAT, sortLog: sortLog };
}));
