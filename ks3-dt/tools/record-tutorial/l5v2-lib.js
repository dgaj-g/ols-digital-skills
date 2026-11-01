/* J3 L5 V2 SAME LIGHT · shared bits for the node gates (A6 fold, A7 steps, A8 help, A11 clock).
   loadEngine(mutate) compiles platform/assets/twolights/engine.js, optionally mutated for a control.
   simulate(E, opts) plays a whole hour as bots on a 1 s tick and returns the event log. */
const fs = require('fs'), path = require('path'), Module = require('module');
const DIR = path.join(__dirname, '..', '..', 'platform', 'assets', 'twolights');
function compile(file, src) {
  const m = new Module(file); m.filename = file; m.paths = Module._nodeModulePaths(DIR); m._compile(src, file); return m.exports;
}
function loadEngine(mutate) {
  let src = fs.readFileSync(path.join(DIR, 'engine.js'), 'utf8');
  if (mutate) { const s2 = mutate(src); if (s2 === src) throw new Error('the control mutation did not apply'); src = s2; }
  return compile(path.join(DIR, 'engine.js'), src);
}
const STR = require(path.join(DIR, 'strings.js')), S = STR.S;
const FIX = {
  S1: s => s.replace(/lampp_on\(\)|lamp_oon\(\)/, 'lamp_on()'),
  S2: s => s.replace('" + beam)', '" + str(beam))'),
  S3: s => s.replace(/\nprint\(name/, '\n    print(name'),
  Q1: s => s.includes('b = bearing()') ? s.replace('b = bearing()', 'fog_horn()\nb = bearing()') : s + '\nfog_horn()',
  Q2: s => s.replace('    print("Bearing " + str(channel))', '    print("Bearing " + str(channel))\n    return channel'),
  Q3: s => s.includes('fog_horn()\nb') ? s.replace('fog_horn()\nb', 'lamp_on()\nfog_horn()\nb') : s.replace('b = bearing()', 'lamp_on()\nb = bearing()')
};
const strip = st => { const c = JSON.parse(JSON.stringify(st)); delete c.events; delete c.now; return c; };
/* opts: seats, room, mode, until(st,t) → stop, hook(st,t,send) runs before the bots, wrongFirst, idleReader */
function simulate(E, o) {
  const seats = o.seats, log = [], n = {}, mem = {}, opt = { seats, room: o.room, mode: o.mode, gone: o.gone };
  seats.forEach(s => { n[s] = 0; mem[s] = {}; });
  const send = (s, t, k, d) => log.push({ id: s + ':' + t + ':' + (++n[s]), seat: s, t, n: n[s], k, d: d || {} });
  let t = 1000;
  for (; t < (o.limit || 3600000); t += 1000) {
    const st = E.fold(log, t, opt);
    if (o.hook && o.hook(st, t, send) === 'stop') break;
    if (st.phase === 'home' && seats.every(s => st.local[s].ready.home)) break;
    const f = st.ch && st.ch.fault;
    for (const s of seats) {
      if (st.gone && st.gone[s]) continue;
      const L = st.local[s], m = mem[s];
      if (m.next && t < m.next) continue;
      m.next = t + (o.gap || 2000);
      if (['wait', 'watch', 'chapter', 'extras'].indexOf(L.stage) < 0) { send(s, t, 'ready', { stage: L.stage }); continue; }
      if (L.stage === 'extras') { send(s, t, 'ready', { stage: 'home' }); continue; }
      if (L.stage === 'watch') { if (t >= st.w.startAt + E.T.W_SKIP && !st.w.skipped[s]) send(s, t, 'skip'); continue; }
      if (!f || st.paused) continue;
      const rd = f.readersNow.indexOf(s) >= 0, fx = f.fixerNow === s, first = f.readersNow[0] === s;
      if (f.step === 'run' && first) send(s, t, 'run');
      else if (f.step === 'point' && f.picks[s] == null) {
        const wrong = o.wrongFirst && !m['w' + f.no]; if (wrong) m['w' + f.no] = 1;
        send(s, t, 'point', { line: wrong ? (f.right === 1 ? 2 : 1) : f.right });
      } else if (f.step === 'fix' && fx) {
        if (m.typed !== f.no) { m.typed = f.no; send(s, t, 'text', { src: FIX[f.id](f.src) }); } else send(s, t, 'run');
      } else if (f.step === 'name' && !f.name && first && !(o.idleReader)) send(s, t, 'name', { card: f.kind });
    }
  }
  return { log, end: t, opt };
}
const SHUFFLE = (a, seed) => { a = a.slice(); let x = seed; for (let i = a.length - 1; i > 0; i--) { x = (x * 1103515245 + 12345) & 0x7fffffff; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function report(name, real, control) {
  const ok = real.length === 0 && control.length > 0;
  real.forEach(l => console.log('FAIL ' + name + ': ' + l));
  if (!control.length) console.log('FAIL ' + name + ': the control did not go red');
  else console.log(name + ' control RED as it must: ' + control[0]);
  console.log(name + (ok ? ' PASS' : ' FAIL'));
  process.exit(ok ? 0 : 1);
}
module.exports = { DIR, loadEngine, compile, S, render: STR.render, FIX, strip, simulate, SHUFFLE, report };
