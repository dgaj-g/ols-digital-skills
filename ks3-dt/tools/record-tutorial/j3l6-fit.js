/* J3 L6 THE NIGHT DESK · gate (V85): every state of all three routes (model, honest fails, the late shift) fits the
   frame at the five window sizes, the school PC's 1366x625 (a 484 px frame) first:
   1 the page is never taller than the frame and never scrolls sideways;
   2 no button, box, table, job line or Stuck? Show me button sits outside the window;
   3 the words stay inside every button.
   CONTROLS (each must FAIL): a block 300 px tall added to the page; a button with words too long for it.
   node j3l6-fit.js [--url <served hour.html>] [--sizes 1366x625,...] */
'use strict';
const lib = require('./j3l6-lib.js'), J = lib.judge('j3l6-fit');
const SIZES = lib.argOf('--sizes', '') ? lib.argOf('--sizes').split(',').map(s => s.split('x').map(Number)) : lib.SIZES;
const faults = rs => { const f = []; rs.forEach(r => r.report.forEach(m => { const k = r.W + 'x' + r.H + ' ' + r.route + ' ' + m.screen;
  if (m.over > 0) f.push(k + ': ' + m.over + ' px taller than the frame'); if (m.side > 0) f.push(k + ': ' + m.side + ' px sideways');
  if (m.out.length) f.push(k + ': outside the window — ' + m.out.join('; ')); if (m.spill.length) f.push(k + ': words spill out of — ' + m.spill.join('; ')); })); return f; };
(async () => {
  const rs = [];
  for (const [W, H] of SIZES) for (const route of ['model', 'fails', 'late']) { const r = await lib.walk({ W, H, route, help: false }); rs.push(r);
    console.log('  walked ' + W + 'x' + H + ' (frame ' + (H - lib.BAR) + ') ' + route + ': ' + r.report.length + ' states' + (r.done ? '' : ' — DID NOT FINISH')); }
  const f = faults(rs), states = rs.reduce((a, r) => a + r.report.length, 0);
  J.must(rs.every(r => r.done && !r.errs.length), 'all ' + rs.length + ' walks reach the end with no page errors');
  J.must(!f.length, 'all ' + states + ' states fit their frame, nothing outside the window, no words spilling' + (f.length ? ' — ' + [...new Set(f)].slice(0, 10).join(' · ') : ''));
  let c = await lib.walk({ W: 1366, H: 625, route: 'model', help: false, maxStates: 4, fault: "var d = document.createElement('div'); d.style.height = '300px'; document.querySelector('main').appendChild(d);" });
  J.control(faults([c]).some(t => /taller than the frame/.test(t)), 'a block 300 px tall added to the page');
  c = await lib.walk({ W: 1366, H: 625, route: 'model', help: false, maxStates: 4, fault: "var b = document.querySelector('main button'); if (b) { b.style.width = '60px'; b.style.whiteSpace = 'nowrap'; b.style.overflow = 'hidden'; }" });
  J.control(faults([c]).some(t => /words spill/.test(t)), 'a button with words too long for it');
  await J.end();
})();
