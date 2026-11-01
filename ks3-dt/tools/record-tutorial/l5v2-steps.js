/* J3 L5 V2 · A7 the steps. node tools/record-tutorial/l5v2-steps.js
   Each fault runs Run → Point → Fix → Name; only the right seat's control is live in each step; Point agreement per §5.5
   (pair: both; trio: any two; a wrong agreed line clears the picks); A fixes 1, 3, 5, 7 and B 2, 4, 6; the trio rotates
   A, B, C; the swap card's job for each seat matches the next fault's Fixer. Control: RUN live for both seats in step 1. */
const L = require('./l5v2-lib.js');
function ev(seat, t, k, d) { return { id: seat + ':' + t + ':9' + k.length, seat, t, n: 900 + k.length, k, d: d || {} }; }
function check(E) {
  const fails = [], room = 'abcdefabcdef';
  for (const [seats, mode] of [[['A', 'B'], 'pair'], [['A', 'B', 'C'], 'trio']]) {
    const order = [], seen = {}, steps = {};
    const r = L.simulate(E, { seats, room, mode, hook(st, t) {
      const f = st.ch && st.ch.fault; if (!f) return;
      if (!seen[f.no]) { seen[f.no] = 1; order.push(f.fixer); }
      (steps[f.no] = steps[f.no] || []).indexOf(f.step) < 0 && steps[f.no].push(f.step);
    } });
    const want = mode === 'pair' ? 'ABABABA' : 'ABCABCA';
    if (order.join('') !== want) fails.push(mode + ': the Fixers ran ' + order.join('') + ', not ' + want);
    Object.keys(steps).forEach(no => { const s = steps[no].filter(x => x !== 'swap' && x !== 'over').join('>'); if (s !== 'run>point>fix>name') fails.push(mode + ': fault ' + no + ' ran ' + s); });
    // probe each step with each seat
    let probed = 0; const fixDone = {};
    const probedAt = {};
    for (let t = 1300; t < r.end; t += 500) {
      const pre = r.log.filter(e => e.t < t), st = E.fold(pre, t, r.opt), f = st.ch && st.ch.fault;
      if (!f || f.step === 'swap' || f.step === 'over') continue;
      const key = f.no + f.step + (f.name ? 'N' : '') + Object.keys(f.picks).length; if (probedAt[key]) continue; probedAt[key] = 1;
      const fx = f.fixerNow, rd = f.readersNow[0];
      const tryEv = (e) => JSON.stringify(L.strip(E.fold(pre, e.t, r.opt))) !== JSON.stringify(L.strip(E.fold(pre.concat([e]), e.t, r.opt)));
      const tag = mode + ' fault ' + f.no + ' step ' + f.step + ': ';
      if (f.step === 'run') { probed++; if (tryEv(ev(fx, t, 'run'))) fails.push(tag + 'the Fixer\'s RUN is live'); if (!tryEv(ev(rd, t, 'run'))) fails.push(tag + 'the Reader\'s RUN is dead'); }
      if (f.step === 'fix' && !fixDone[f.no] && t < f.stepAt + E.T.WAKE_AT) {
        fixDone[f.no] = 1; probed++;
        if (tryEv(ev(rd, t, 'text', { src: 'x' }))) fails.push(tag + 'the Reader\'s editor is live before 90 s');
        if (!tryEv(ev(fx, t, 'text', { src: 'x' }))) fails.push(tag + 'the Fixer\'s editor is dead');
        if (tryEv(ev(fx, t, 'name', { card: f.kind }))) fails.push(tag + 'a name is accepted in step 3');
      }
      if (f.step === 'name' && !f.name) { probed++; if (tryEv(ev(fx, t, 'name', { card: f.kind }))) fails.push(tag + 'the Fixer can name'); if (!tryEv(ev(rd, t, 'name', { card: f.kind }))) fails.push(tag + 'the Reader cannot name'); }
      if (f.step === 'point' && !Object.keys(f.picks).length) {
        probed++;
        const one = E.fold(pre.concat([ev(seats[0], t, 'point', { line: f.right })]), t, r.opt).ch.fault;
        if (one.step !== 'point') fails.push(tag + 'one click agreed alone');
        const two = E.fold(pre.concat([ev(seats[0], t, 'point', { line: f.right }), ev(seats[1], t + 1, 'point', { line: f.right })]), t + 1, r.opt).ch.fault;
        if (two.step !== 'fix') fails.push(tag + 'two right clicks did not agree');
        const bad = f.right === 1 ? 2 : 1;
        const wr = E.fold(pre.concat([ev(seats[0], t, 'point', { line: bad }), ev(seats[1], t + 1, 'point', { line: bad })]), t + 1, r.opt).ch.fault;
        if (wr.step !== 'point' || Object.keys(wr.picks).length || !wr.wrongAgreed) fails.push(tag + 'a wrong agreed line did not clear the picks');
      }
    }
    if (probed < 28) fails.push(mode + ': only ' + probed + ' step probes ran');
  }
  // the swap words name the right job: swap.fixer/reader keyed by the next Fixer
  ['swap.fixer', 'swap.reader', 'swap.first.fixer', 'swap.first.reader'].forEach(k => { if (!L.S[k]) fails.push('missing string ' + k); });
  if (!/Fixer/.test(L.S['swap.fixer']) || !/Reader/.test(L.S['swap.reader'])) fails.push('the swap card words name the wrong job');
  return fails;
}
const real = check(L.loadEngine());
const control = check(L.loadEngine(s => s.replace("if (f.step === 'run' && (isRd || solo(st)))", "if (f.step === 'run')")));
L.report('A7 steps', real, control);
