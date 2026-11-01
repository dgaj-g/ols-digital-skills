/* J3 L5 V2 · A8 help. node tools/record-tutorial/l5v2-help.js
   The ladder opens by either pupil's Help button (V78: the Fixer's too) and by itself every 45 s, the same on both
   screens (it lives in the fold); each step's words fill every slot; a red step names the line Python's red names; the
   third step is the exact fix; the lookout at 30 s, Reader only, once, one coin; the Reader's editor wakes at 90 s.
   Control: the ladder given a stored line number instead of the red's must turn this red. */
const fs = require('fs'), path = require('path');
const L = require('./l5v2-lib.js');
const UI = fs.readFileSync(path.join(L.DIR, 'ui.js'), 'utf8');
function ladder(E, mutate) {
  let body = UI.slice(UI.indexOf('  function ladderVars(f)'), UI.indexOf('  function renderBaySide'));
  if (mutate) { const b2 = mutate(body); if (b2 === body) throw new Error('control mutation did not apply'); body = b2; }
  return new Function('E', body + '\nreturn { ladderVars: ladderVars, ladderKind: ladderKind };')(E);
}
const ev = (seat, t, k, d) => ({ id: seat + ':' + t + ':' + k, seat, t, n: 990, k, d: d || {} });
function check(E, LD) {
  const fails = [];
  for (const room of ['abcdefabcdef', 'zz9k2m4q7xw1', 'room00000042', 'qqqqqqqqqqq1']) {
    const marks = {};
    const r = L.simulate(E, { seats: ['A', 'B'], room, mode: 'pair', hook(st, t) {
      const f = st.ch && st.ch.fault; if (!f) return;
      if ((f.step === 'point' || f.step === 'fix') && !marks[f.no + f.step]) marks[f.no + f.step] = f.stepAt;
    } });
    for (const key of Object.keys(marks)) {
      const at = marks[key], pre = r.log.filter(e => e.t <= at), base = E.fold(pre, at, r.opt), f = base.ch.fault;
      const tag = room + ' fault ' + f.no + ' (' + f.id + ') ' + f.step + ': ', fx = f.fixerNow, rd = f.readersNow[0];
      const at2 = (dt, extra) => E.fold(pre.concat(extra || []), at + dt, r.opt).ch.fault;
      [[44000, 0], [45000, 1], [90000, 2], [135000, 3], [400000, 3]].forEach(([dt, n]) => { if (at2(dt).helpShown !== n) fails.push(tag + 'at ' + dt / 1000 + ' s the ladder shows ' + at2(dt).helpShown + ' steps, not ' + n); });
      if (at2(1000, [ev(rd, at + 500, 'help')]).helpShown !== 1) fails.push(tag + 'the Reader\'s Help button does not open the ladder');
      if (at2(1000, [ev(fx, at + 500, 'help')]).helpShown !== 1) fails.push(tag + 'the Fixer\'s Help button does not open the ladder');
      if (at2(1500, [ev(fx, at + 500, 'help'), ev(rd, at + 900, 'help')]).helpShown !== 2) fails.push(tag + 'More help from the other pupil does not open the next step at once');
      // the words of every step
      const v = LD.ladderVars(f), kind = LD.ladderKind(f);
      for (let i = 1; i <= 3; i++) { const w = L.render('help.' + kind + '.' + i, v); if (/\{\w+\}/.test(w)) fails.push(tag + 'help.' + kind + '.' + i + ' leaves a slot empty: ' + w); }
      if (f.kind === 'red') {
        const all = (f.lastRun.red || '').match(/File "[^"]*", line \d+/g) || [], m = all.length ? [0, all[all.length - 1].replace(/.*line /, '')] : null; if (!m || +m[1] !== v.n) fails.push(tag + 'the ladder names line ' + v.n + ' but the red names ' + (m && m[1]));
      }
      const fixed = L.FIX[f.id](f.src).split('\n'), three = L.render('help.' + kind + '.3', v);
      if (kind === 'NameError' && fixed[v.n - 1].trim() !== v.text) fails.push(tag + 'step 3 says type ' + v.text + ' but the fix is ' + fixed[v.n - 1].trim());
      if (kind === 'TypeError' && fixed[v.n - 1].indexOf('str(beam)') < 0) fails.push(tag + 'step 3 is not the fix');
      if (kind === 'IndentationError' && !/^ {4}\S/.test(fixed[v.n - 1])) fails.push(tag + 'step 3 is not the fix');
      if (kind === 'silent' && fixed.indexOf(v.name + '()') < 0) fails.push(tag + 'step 3 ' + three + ' is not the fix');
      if (kind === 'none' && fixed.indexOf('    return channel') < 0) fails.push(tag + 'step 3 is not the fix');
      if (f.step !== 'fix') continue;
      // the lookout and the wake
      const want = E.lineOf(f.src, E.LOOK[base.ch.id]);
      const coins = base.coins, fold = extra => E.fold(pre.concat(extra), at + 100000, r.opt);
      if (fold([ev(rd, at + 29000, 'lookout', { line: want })]).coins !== coins) fails.push(tag + 'the lookout pays before 30 s');
      if (fold([ev(fx, at + 31000, 'lookout', { line: want })]).coins !== coins) fails.push(tag + 'the Fixer can answer the lookout');
      if (fold([ev(rd, at + 31000, 'lookout', { line: want })]).coins !== coins + 1) fails.push(tag + 'a right lookout does not pay one coin');
      if (fold([ev(rd, at + 31000, 'lookout', { line: want }), ev(rd, at + 32000, 'lookout', { line: want })]).coins !== coins + 1) fails.push(tag + 'the lookout pays twice');
      if (!at2(29000).lookoutShown === false || at2(31000).lookoutShown !== true) fails.push(tag + 'the lookout does not show at 30 s');
      if (at2(89500, [ev(rd, at + 89000, 'text', { src: 'x' })]).src === 'x') fails.push(tag + 'the Reader\'s editor wakes before 90 s');
      if (at2(91000, [ev(rd, at + 90500, 'text', { src: 'x' })]).src !== 'x') fails.push(tag + 'the Reader\'s editor does not wake at 90 s');
    }
  }
  return fails;
}
const E = L.loadEngine();
const real = check(E, ladder(E));
const control = check(E, ladder(E, b => b.replace('n: f.right', 'n: 4')));
L.report('A8 help', real, control);
