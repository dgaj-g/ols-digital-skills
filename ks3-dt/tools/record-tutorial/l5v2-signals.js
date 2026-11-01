/* J3 L5 V78 · A16 partner signals + A17 Enter keeps the indent. node tools/record-tutorial/l5v2-signals.js
   Pupils are paired at random across the room, so the only way to ask for help is a ready-made signal.
   The Fixer's "I'm stuck" (Point and Fix) and the Reader's "Show where" (Fix only): one live signal per pupil;
   twenty fast presses deliver one; it unlocks when the partner presses OK or after 30 s; three per pupil per fault,
   then the button is gone; a step change clears it; none in solo, paused, Run, Name or swap; "I'm stuck" reaches
   both Readers in a trio and opens the Reader's code box 30 s later instead of 90 s. Every signal string says
   "your partner" and has no slot for a name (pupils learn who they worked with only at the end).
   Control: the engine without its one-live-signal rule must turn this red. */
const fs = require('fs'), path = require('path');
const L = require('./l5v2-lib.js');
const UI = fs.readFileSync(path.join(L.DIR, 'ui.js'), 'utf8');
const ev = (seat, t, k, d) => ({ id: seat + ':' + t + ':' + k + ':' + JSON.stringify(d || {}), seat, t, n: 990, k, d: d || {} });
const ROOMS = ['abcdefabcdef', 'zz9k2m4q7xw1', 'room00000042'];
function marksOf(E, seats, room, mode) {
  const marks = {};
  const r = L.simulate(E, { seats, room, mode, hook(st) {
    const f = st.ch && st.ch.fault; if (!f || !f.step) return;
    if (!marks[f.no + f.step]) marks[f.no + f.step] = { at: f.stepAt, step: f.step };
  } });
  return { r, marks: Object.values(marks).filter(m => m.at != null) };
}
function check(E) {
  const fails = [];
  const need = (ok, msg) => { if (!ok) fails.push(msg); };
  for (const room of ROOMS) {
    const { r, marks } = marksOf(E, ['A', 'B'], room, 'pair');
    for (const m of marks) {
      const at = m.at, pre = r.log.filter(e => e.t <= at), base = E.fold(pre, at, r.opt), f = base.ch.fault;
      if (!f || f.step !== m.step) continue;
      const tag = room + ' fault ' + f.no + ' ' + f.step + ': ', fx = f.fixerNow, rd = f.readersNow[0];
      const at2 = (dt, extra) => E.fold(pre.concat(extra || []), at + dt, r.opt);
      const sigs = (st, seat) => st.ch.fault.sigs.filter(g => g.from === seat).length;
      if (m.step === 'run' || m.step === 'name' || m.step === 'swap') {
        const s = at2(1500, [ev(fx, at + 300, 'signal', { s: 'stuck' }), ev(rd, at + 400, 'signal', { s: 'where' })]);
        if (s.ch.fault.no === f.no) need(s.ch.fault.sigs.length === 0, tag + 'a signal was sent in the ' + m.step + ' step');
        continue;
      }
      if (m.step === 'point') {
        // twenty fast presses deliver one
        const many = []; for (let i = 0; i < 20; i++) many.push(ev(fx, at + 100 + i * 100, 'signal', { s: 'stuck' }));
        const s1 = at2(3000, many);
        need(sigs(s1, fx) === 1, tag + '20 fast presses of I\'m stuck delivered ' + sigs(s1, fx));
        const me = E.sigState(s1, fx), you = E.sigState(s1, rd);
        need(me.btn === 'stuck' && me.live === true, tag + 'the Fixer\'s button is not greyed as sent');
        need(you.inc && you.inc.s === 'stuck', tag + 'the Reader does not see I\'m stuck');
        need(!E.sigState(s1, fx).inc, tag + 'the Fixer sees their own signal');
        // OK unlocks; the sender sees "your partner saw it"
        const ok = [ev(fx, at + 100, 'signal', { s: 'stuck' }), ev(rd, at + 5000, 'sigok')];
        const s2 = at2(6000, ok);
        need(E.sigState(s2, fx).saw === true && E.sigState(s2, fx).live === false, tag + 'after OK the sender is not told the partner saw it');
        need(!E.sigState(s2, rd).inc, tag + 'after OK the Reader still sees the message');
        need(E.sigState(at2(9500, ok), fx).saw === false, tag + '"your partner saw it" stays longer than 3 s');
        need(sigs(at2(7000, ok.concat([ev(fx, at + 6500, 'signal', { s: 'stuck' })])), fx) === 2, tag + 'after OK the Fixer cannot send again');
        // no OK: locked for 30 s, then free
        const early = [ev(fx, at + 100, 'signal', { s: 'stuck' }), ev(fx, at + 20000, 'signal', { s: 'stuck' })];
        need(sigs(at2(21000, early), fx) === 1, tag + 'a second signal went before 30 s with no OK');
        need(sigs(at2(32000, [early[0], ev(fx, at + 31000, 'signal', { s: 'stuck' })]), fx) === 2, tag + 'the button did not unlock after 30 s');
        need(!E.sigState(at2(31000, [early[0]]), rd).inc, tag + 'a signal with no OK still shows after 30 s');
        // three per pupil per fault, then the button is gone
        const three = [];
        for (let i = 0; i < 4; i++) three.push(ev(fx, at + 100 + i * 2000, 'signal', { s: 'stuck' }), ev(rd, at + 1100 + i * 2000, 'sigok'));
        const s3 = at2(9000, three);
        need(sigs(s3, fx) === 3, tag + 'the Fixer sent ' + sigs(s3, fx) + ' signals, not at most 3');
        need(E.sigState(s3, fx).btn === null, tag + 'the button is still there after 3 signals');
        need(E.sigState(at2(3000), fx).left === 3, tag + 'a fresh fault does not start with 3 signals');
        // wrong person, wrong step
        need(at2(2000, [ev(rd, at + 100, 'signal', { s: 'where' })]).ch.fault.sigs.length === 0, tag + 'Show where was sent in the Point step');
        need(at2(2000, [ev(rd, at + 100, 'signal', { s: 'stuck' })]).ch.fault.sigs.length === 0, tag + 'the Reader sent I\'m stuck');
        need(E.sigState(at2(2000), rd).btn === null, tag + 'the Reader has a signal button in the Point step');
        // paused
        const sp = at2(2000, [ev(rd, at + 100, 'pause'), ev(fx, at + 300, 'signal', { s: 'stuck' })]);
        need(sp.ch.fault.sigs.length === 0 && E.sigState(sp, fx).btn === null, tag + 'a signal was sent while paused');
        const sp2 = at2(2000, [ev(fx, at + 100, 'signal', { s: 'stuck' }), ev(rd, at + 300, 'pause')]);
        need(!E.sigState(sp2, rd).inc, tag + 'the message shows while paused');
        continue;
      }
      if (m.step === 'fix') {
        // the step change clears a Point-step signal
        const late = [ev(fx, at - 1000, 'signal', { s: 'stuck' })], sb = E.fold(r.log.filter(e => e.t < at).concat(late), at - 500, r.opt);
        if (sb.ch.fault.no === f.no && sb.ch.fault.step === 'point') {
          need(!!E.sigState(sb, rd).inc, tag + 'a Point-step signal does not show before the step changes');
          need(!E.sigState(E.fold(pre.concat(late), at + 500, r.opt), rd).inc, tag + 'a Point-step signal still shows after the step changed');
        }
        // Show where reaches the Fixer, filled from the fault
        const sw = at2(2500, [ev(rd, at + 2000, 'signal', { s: 'where' })]), inc = E.sigState(sw, fx).inc;
        need(inc && inc.s === 'where', tag + 'the Fixer does not see Show where');
        const words = L.render('sig.where.' + f.kind, { n: f.right });
        need(!/\{\w+\}/.test(words) && /^Your partner/.test(words), tag + 'Show where reads: ' + words);
        need(at2(2500, [ev(fx, at + 2000, 'signal', { s: 'where' })]).ch.fault.sigs.length === 0, tag + 'the Fixer sent Show where');
        // I'm stuck opens the Reader's code box 30 s after it, not 90 s
        const stuck = [ev(fx, at + 2000, 'signal', { s: 'stuck' })];
        need(at2(31500, stuck.concat([ev(rd, at + 31000, 'text', { src: 'x' })])).ch.fault.src !== 'x', tag + 'the Reader\'s code box opened before 30 s after I\'m stuck');
        need(at2(33000, stuck.concat([ev(rd, at + 32500, 'text', { src: 'x' })])).ch.fault.src === 'x', tag + 'the Reader\'s code box did not open 30 s after I\'m stuck');
        need(at2(33000, [ev(rd, at + 32500, 'text', { src: 'x' })]).ch.fault.src !== 'x', tag + 'the Reader\'s code box opened at 32 s with no I\'m stuck');
      }
    }
  }
  // solo: no signals
  { const { r, marks } = marksOf(E, ['A'], ROOMS[0], 'solo');
    for (const m of marks.filter(x => x.step === 'point' || x.step === 'fix')) {
      const pre = r.log.filter(e => e.t <= m.at), s = E.fold(pre.concat([ev('A', m.at + 100, 'signal', { s: 'stuck' })]), m.at + 1000, r.opt);
      need(s.ch.fault.sigs.length === 0 && E.sigState(s, 'A').btn === null, 'solo ' + m.step + ': a signal was possible on your own');
    } }
  // trio: I'm stuck reaches both Readers
  { const { r, marks } = marksOf(E, ['A', 'B', 'C'], ROOMS[1], 'pair');
    for (const m of marks.filter(x => x.step === 'point')) {
      const pre = r.log.filter(e => e.t <= m.at), f = E.fold(pre, m.at, r.opt).ch.fault;
      const s = E.fold(pre.concat([ev(f.fixerNow, m.at + 100, 'signal', { s: 'stuck' })]), m.at + 2000, r.opt);
      f.readersNow.forEach(rd => need(!!E.sigState(s, rd).inc, 'trio fault ' + f.no + ': Reader ' + rd + ' does not see I\'m stuck'));
    } }
  // the words: "your partner", never a slot for a name
  const keys = Object.keys(L.S).filter(k => /^sig\./.test(k));
  need(keys.length >= 8, 'only ' + keys.length + ' sig.* strings');
  keys.forEach(k => {
    const s = L.S[k], slots = (s.match(/\{(\w+)\}/g) || []).filter(x => x !== '{n}');
    need(!slots.length, k + ' has a slot ' + slots.join(' ') + ': it could carry a name');
    if (/^sig\.(stuck|where)\.(msg|red|silent|none)/.test(k)) need(/^Your partner /.test(s), k + ' does not start "Your partner": ' + s);
  });
  ['sig.sent', 'sig.saw'].forEach(k => need(/your partner/i.test(L.S[k] || ''), k + ' does not say "your partner"'));
  return fails;
}
// A17 Enter keeps the indent (+4 after a colon)
function indentFails(body) {
  const fails = [], fn = new Function(body + '\nreturn enterIndent;')();
  [['def bearing():', '    '], ['    print("x")', '    '], ['print("x")', ''], ['    if a:', '        '], ['def bearing():  ', '    '], ['', '']]
    .forEach(([line, want]) => { const got = fn(line); if (got !== want) fails.push('Enter after "' + line + '" gives ' + JSON.stringify(got) + ', not ' + JSON.stringify(want)); });
  if (!/key === 'Enter'[\s\S]{0,200}enterIndent\(/.test(UI)) fails.push('the editor does not call enterIndent on Enter');
  return fails;
}
const a = UI.indexOf('  function enterIndent('), b = UI.indexOf('\n  }', a) + 4;
const IND = a < 0 ? null : UI.slice(a, b);
const E = L.loadEngine();
const real = check(E).concat(IND ? indentFails(IND) : ['ui.js has no enterIndent']);
const control = check(L.loadEngine(s => s.replace("if (mine.some(function (g) { return sigLive(f, g, t); })) return;", '')))
  .concat(IND ? indentFails(IND.replace("/:\\s*$/.test(line) ? '    ' : ''", "''")) : ['no enterIndent']);
L.report('A16 signals + A17 indent', real, control);
