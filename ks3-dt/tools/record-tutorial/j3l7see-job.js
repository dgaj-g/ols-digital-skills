/* J3 L7 TEACH IT TO SEE · gate: every screen has its "Your job now:" line (a full sentence, on screen) and the row of
   parts of the hour with exactly one part lit.
   CONTROL: the job line is emptied; the same check must then FAIL.
   node j3l7see-job.js [--url <served hour.html>] [--fresh] */
'use strict';
const lib = require('./j3l7see-lib.js'), J = lib.judge('j3l7see-job');
const faults = rs => { const f = []; rs.forEach(r => r.report.forEach(x => { if (x.jobOK == null) return; const k = r.W + ' ' + x.tag.split('|')[0]; if (!x.jobOK) f.push(k + ': job line "' + x.job + '"'); if (x.chips !== 7 || x.here !== 1) f.push(k + ': parts ' + x.chips + ', lit ' + x.here); })); return f; };
(async () => {
  const rs = await lib.reports(process.argv.includes('--fresh')), f = faults(rs);
  J.must(rs.every(r => r.report.length > 50), 'each walk saw more than 50 screens');
  J.must(!f.length, 'every screen has a full job line and seven parts with one lit' + (f.length ? ' — ' + [...new Set(f)].slice(0, 8).join(' · ') : ''));
  const c = await lib.walk({ W: 1366, H: 768, shots: false, maxScreens: 4, fault: "document.getElementById('job').textContent = ''" });
  J.control(faults([c]).length > 0, 'the job line emptied');
  await J.end();
})();
