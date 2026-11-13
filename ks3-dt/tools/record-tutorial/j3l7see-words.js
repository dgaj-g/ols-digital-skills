/* J3 L7 TEACH IT TO SEE · gate: no screen says more than 25 words, no sentence more than 14.
   Counted on every screen of both routes at four sizes. Not counted (spec A19): the end questions, how-did-it-go,
   and the help while it is open. (The Do now is the platform's own screen.)
   CONTROL: a 30-word job line is written in; the same count must then FAIL.
   node j3l7see-words.js [--url <served hour.html>] [--fresh] */
'use strict';
const lib = require('./j3l7see-lib.js'), J = lib.judge('j3l7see-words');
const skip = t => /^e-(q|felt)/.test(t);
const faults = rs => { const f = []; rs.forEach(r => r.report.forEach(x => { if (x.words == null || skip(x.tag)) return; if (x.words > 25) f.push(r.W + ' ' + x.tag.split('|')[0] + ': ' + x.words + ' words'); x.long.forEach(s => f.push(r.W + ' ' + x.tag.split('|')[0] + ': long sentence: ' + s)); })); return f; };
(async () => {
  const rs = await lib.reports(process.argv.includes('--fresh')), n = rs.reduce((a, r) => a + r.report.filter(x => x.words != null && !skip(x.tag)).length, 0), f = faults(rs);
  J.must(n > 400, 'screens counted across both routes and four sizes: ' + n);
  J.must(!f.length, 'every screen says 25 words or fewer, in sentences of 14 words or fewer' + (f.length ? ' — ' + [...new Set(f)].slice(0, 8).join(' · ') : ''));
  const c = await lib.walk({ W: 1366, H: 768, shots: false, maxScreens: 4, fault: "document.getElementById('job').textContent = 'Your job now: ' + Array(31).join('word ') + 'end.'" });
  J.control(faults([c]).length > 0, 'a 30-word job line');
  await J.end();
})();
