/* J3 L5 V2 · A11 clock honesty (node half; the pace half is prototype/tools/pace.js against the built hour).
   For every fault of every chapter: no drift before the fault's first event (its RUN); one constant rate after it; Pause
   holds the boat; Carry on resumes it; B1–B4 = 120 s; the rocks at exactly the budget; a boat fail rewinds (black, then
   the start mark) and the typed lines are kept. Control: a drift from the chapter's start must turn this red. */
const L = require('./l5v2-lib.js');
const ev = (seat, t, k, d) => ({ id: seat + ':' + t + ':' + k, seat, t, n: 990, k, d: d || {} });
function check(E) {
  const fails = [];
  ['ch1', 'ch2', 'ch3', 'ch4'].forEach(c => { if (E.BUDGET[c] !== 120000) fails.push('budget ' + c + ' is ' + E.BUDGET[c] + ' ms, not 120000'); });
  const marks = {}; let rocks = 0;
  const r = L.simulate(E, { seats: ['A', 'B'], room: 'abcdefabcdef', mode: 'pair', hook(st, t) {
    const f = st.ch && st.ch.fault; if (f && f.step === "run" && !marks[f.no]) marks[f.no] = t;
  } });
  Object.keys(marks).forEach(no => {
    const at = marks[no], pre = r.log.filter(e => e.t < at), st0 = E.fold(pre, at, r.opt), f0 = st0.ch.fault, tag = 'fault ' + no + ': ';
    const rd = f0.readersNow[0], run = ev(rd, at + 5000, 'run');
    const x = (dt, extra) => E.fold(pre.concat(extra || []), at + dt, r.opt).ch.fault.boat;
    if (x(4900).x !== 0 || x(4900).drifting) fails.push(tag + 'the boat drifts before the first RUN');
    const a = x(15000, [run]).x, b = x(25000, [run]).x, c = x(35000, [run]).x;
    if (!(a > 0) || Math.abs((b - a) - (c - b)) > 1e-9 || Math.abs(a - 10000 / 120000) > 1e-9) fails.push(tag + 'the drift is not one constant rate from the RUN (' + a + ', ' + b + ', ' + c + ')');
    const paused = [run, ev(rd, at + 10000, 'pause')];
    if (x(10000, paused).x !== x(40000, paused).x) fails.push(tag + 'Pause does not hold the boat');
    const resumed = paused.concat([ev(rd, at + 40000, 'carry')]);
    if (Math.abs(x(50000, resumed).x - 15000 / 120000) > 1e-9) fails.push(tag + 'Carry on does not resume the drift');
    const f1 = E.fold(pre.concat([run]), at + 5000, r.opt).ch.fault;
    if (f1.rocksAt !== at + 5000 + 120000 && f1.step !== 'name') fails.push(tag + 'the rocks are not at the budget (' + (f1.rocksAt - at - 5000) + ' ms)');
    if (f1.step === 'point') {
      const typed = [run, ev(rd, at + 6000, 'point', { line: f1.right }), ev(f1.fixerNow, at + 6000, 'point', { line: f1.right })];
      const f2 = E.fold(pre.concat(typed), at + 7000, r.opt).ch.fault;
      if (f2.step === 'fix') {
        const kept = pre.concat(typed, [ev(f2.fixerNow, at + 8000, 'text', { src: f2.src + '\n# kept' }), ev(rd, at + 125000, 'boat', { fail: 1 })]);
        rocks++;
        const blk = E.fold(kept, at + 126000, r.opt).ch.fault, back = E.fold(kept, at + 127500, r.opt).ch.fault;
        if (!blk.boat.black) fails.push(tag + 'the rocks do not black the screen');
        if (!(back.boat.x < 0.01) || back.boat.black) fails.push(tag + 'the rocks do not rewind to the start mark');
        if (back.src.indexOf('# kept') < 0) fails.push(tag + 'the rocks threw away the typed lines');
      }
    }
  });
  if (rocks < 7) fails.push('only ' + rocks + ' rocks probes ran');
  if (Object.keys(marks).length !== 7) fails.push('only ' + Object.keys(marks).length + ' faults were clocked');
  return fails;
}
const real = check(L.loadEngine());
const control = check(L.loadEngine(s => s.replace('var room = { t0: f.runAt,', 'var room = { t0: st.ch.startAt,').replace('f.boat = f.runAt == null ? { x: 0, drifting: false, black: false } : ', 'f.boat = ')));
L.report('A11 clock', real, control);
