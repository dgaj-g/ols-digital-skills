/* J3 L5 V2 · A6 the fold. node tools/record-tutorial/l5v2-fold.js
   Two windows fed the same events in different arrival orders reach byte-identical state at every event, in pair, trio
   and solo, right and wrong paths, for three rooms; every simulated log replays to Home; a Fixer RUN in step 1 and a
   Reader text at 60 s change nothing. Control: the Reader-only seat check on RUN removed must turn this red. */
const L = require('./l5v2-lib.js');
const ROOMS = ['abcdefabcdef', 'zz9k2m4q7xw1', 'room00000042'];
function check(E) {
  const fails = [];
  for (const room of ROOMS) for (const [seats, mode] of [[['A', 'B'], 'pair'], [['A', 'B', 'C'], 'trio'], [['A'], 'solo']]) for (const wrongFirst of [false, true]) {
    const tag = room + '/' + mode + (wrongFirst ? '/wrong' : '/right');
    const r = L.simulate(E, { seats, room, mode, wrongFirst });
    const end = E.fold(r.log, r.end, r.opt);
    if (end.phase !== 'home' || end.fixedCount !== 7) fails.push(tag + ': the log does not replay to Home with 7 faults fixed (phase ' + end.phase + ')');
    for (let k = 1; k <= r.log.length; k++) {
      const t = r.log[k - 1].t, a = L.SHUFFLE(r.log.slice(0, k), k), b = L.SHUFFLE(r.log.slice(0, k), k * 7 + 3);
      if (JSON.stringify(E.fold(a, t, r.opt)) !== JSON.stringify(E.fold(b, t, r.opt))) { fails.push(tag + ': the two windows differ at event ' + k); break; }
    }
    if (mode === 'solo') continue;
    // a Fixer RUN during step 1 and a Reader text at 60 s into step 3 change nothing
    let probes = 0;
    for (let k = 1; k <= r.log.length; k++) {
      const pre = r.log.slice(0, k), t = r.log[k - 1].t + 500, st = E.fold(pre, t, r.opt), f = st.ch && st.ch.fault;
      if (!f) continue;
      let ev = null;
      if (f.step === 'run') ev = { seat: f.fixerNow, t, k: 'run', d: {} };
      else if (f.step === 'fix' && t < f.stepAt + 1000) ev = { seat: f.readersNow[0], t: f.stepAt + 60000, k: 'text', d: { src: '# changed' } };
      if (!ev) continue;
      probes++;
      ev.id = ev.seat + ':' + ev.t + ':999'; ev.n = 999;
      const before = L.strip(E.fold(pre, ev.t, r.opt)), after = L.strip(E.fold(pre.concat([ev]), ev.t, r.opt));
      if (JSON.stringify(before) !== JSON.stringify(after)) { fails.push(tag + ': a ' + (ev.k === 'run' ? 'Fixer RUN in step 1' : 'Reader key at 60 s') + ' changed the state at fault ' + f.no); break; }
    }
    if (probes < 7) fails.push(tag + ': only ' + probes + ' seat probes ran');
  }
  return fails;
}
const real = check(L.loadEngine());
const control = check(L.loadEngine(s => s.replace("if (f.step === 'run' && (isRd || solo(st)))", "if (f.step === 'run')")));
L.report('A6 fold', real, control);
