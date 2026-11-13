/* J3 L7 TEACH IT TO SEE · gate: every screen fits its frame at 1280x800, 1366x768, 1440x900 and 1024x768 (the frame
   is the window less the platform's two bars: lib BAR, which j3l7see-save.js measures on the platform itself).
   No words outside a button, nothing off the edge, no sideways scroll, no page taller than the frame.
   CONTROL: the drawing box is forced back to its full 428 px, as the first build had it; the check must then FAIL.
   node j3l7see-fit.js [--url <served hour.html>] [--fresh] */
'use strict';
const lib = require('./j3l7see-lib.js'), J = lib.judge('j3l7see-fit');
const faults = rs => { const f = []; rs.forEach(r => r.report.forEach(x => { if (x.scrollH == null) return; const k = r.W + 'x' + r.H + ' ' + x.tag.split('|')[0];
  if (x.bad.length) f.push(k + ': words outside a button: ' + x.bad.join(', ')); if (x.out.length) f.push(k + ': off the edge: ' + x.out.join(', '));
  if (x.hOver) f.push(k + ': sideways scroll'); if (x.scrollH > x.viewH) f.push(k + ': ' + (x.scrollH - x.viewH) + ' px taller than the frame'); })); return f; };
(async () => {
  const rs = await lib.reports(process.argv.includes('--fresh')), f = faults(rs);
  J.must(rs.length === 8 && new Set(rs.map(r => r.W)).size === 4, 'both routes walked at four sizes');
  J.must(!f.length, 'every screen fits its frame' + (f.length ? ' — ' + [...new Set(f)].slice(0, 10).join(' · ') : ''));
  const c = await lib.walk({ W: 1366, H: 768, shots: false, maxScreens: 6, fault: "document.getElementById('pad').style.setProperty('width', '428px', 'important')" });
  J.control(faults([c]).some(t => /taller|off the edge/.test(t)), 'the drawing box forced to full size in the short frame');
  await J.end();
})();
