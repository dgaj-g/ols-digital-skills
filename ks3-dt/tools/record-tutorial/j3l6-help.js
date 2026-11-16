/* J3 L6 THE NIGHT DESK · gate (V85, the J3 L7 help standard): on every state of all three routes (model, honest
   fails, the late shift) at the five window sizes —
   1 the job line reads "Your job now: …", 3 to 14 words, ending in a full stop;
   2 the green "Stuck? Show me" button is there, at least 150 x 40, inside the window (only the lesson's last
     screen, with nothing left to do, has none);
   3 opening it SHOWS what to do: 1 to 3 steps of 10 words or fewer, a ring and a tag on a real control that is on
     screen and not under the help, nothing of hers under the help box, the page no taller;
   4 every empty rule box gets an example typed in grey, and the example never keeps the rows (or the number) the
     task wants; closing help changes nothing of hers and leaves no ring or example behind.
   Then: the rush clock and the rule-race clock hold while help is open and run on after it closes; left alone the
   button pulses first and the ring with its tag comes second, without help opening; one touch clears both.
   CONTROLS (each must FAIL): the button hidden; the ring stripped; the example swapped for the answer.
   node j3l6-help.js [--url <served hour.html>] [--sizes 1366x625,...] */
'use strict';
const fs = require('fs'), path = require('path'), lib = require('./j3l6-lib.js'), J = lib.judge('j3l6-help');
const SIZES = lib.argOf('--sizes', '') ? lib.argOf('--sizes').split(',').map(s => s.split('x').map(Number)) : lib.SIZES;
const faults = rs => { const f = []; rs.forEach(r => r.report.forEach(m => { const k = r.W + 'x' + r.H + ' ' + r.route + ' ' + m.screen;
  if (!m.jobOK) f.push(k + ': job line "' + m.job + '"');
  if (m.steps && !m.helpOK) f.push(k + ': no proper Stuck? Show me button');
  if (!m.steps && m.screen !== 'late-end') f.push(k + ': no help on this screen');
  if (m.help) m.help.bad.forEach(b => f.push(k + ': ' + b)); })); return f; };
(async () => {
  const rs = [];
  for (const [W, H] of SIZES) for (const route of ['model', 'fails', 'late']) { const r = await lib.walk({ W, H, route }); rs.push(r);
    console.log('  walked ' + W + 'x' + H + ' ' + route + ': ' + r.report.length + ' states' + (r.done ? '' : ' — DID NOT FINISH')); }
  const f = faults(rs), states = rs.reduce((a, r) => a + r.report.length, 0), opened = rs.reduce((a, r) => a + r.report.filter(m => m.help).length, 0);
  const demos = new Set(), demoRuns = rs.reduce((a, r) => a + r.report.filter(m => m.help && m.help.demo).map(m => demos.add(m.help.demo.text)).length, 0);
  J.must(rs.every(r => r.done && !r.errs.length), 'all ' + rs.length + ' walks reach the end with no page errors' + (rs.find(r => r.errs.length) ? ' — ' + rs.find(r => r.errs.length).errs[0] : ''));
  J.must(!f.length, 'job line and help are right on all ' + states + ' states (help opened ' + opened + ' times)' + (f.length ? ' — ' + [...new Set(f)].slice(0, 10).join(' · ') : ''));
  J.must(demos.size >= 9 && demoRuns >= 9 * SIZES.length, 'an example is typed in every empty box: ' + demos.size + ' different examples, ' + demoRuns + ' times');
  J.must(/\? 700 : 20000;/.test(fs.readFileSync(path.resolve(__dirname, '../../platform/assets/nightdesk/hour/main.js'), 'utf8')), 'the real wait is 20 seconds, and 40 for the ring');

  /* the rush clock holds while help is open */
  let p = await lib.page(1366, 625, 'x=0'); await p.evaluate(() => Hour.go(Hour.ids().indexOf('c6-ask1'))); await lib.sleep(700);
  const c0 = await p.evaluate(() => { Hour.help(true); return Hour.state.remain; }); await lib.sleep(1500);
  const c1 = await p.evaluate(() => Hour.state.remain); await p.evaluate(() => Hour.help(false)); await lib.sleep(1200);
  const c2 = await p.evaluate(() => Hour.state.remain);
  J.must(Math.abs(c1 - c0) < 60 && c0 - c2 > 900, 'the rush clock holds while help is open, then runs on (' + [c0, c1, c2].map(Math.round).join(' / ') + ' ms left)'); await p.close();
  /* the rule-race clock holds too */
  p = await lib.page(1366, 625, 'late=1'); await p.click('[data-x="race"]'); await lib.sleep(150); await p.click('[data-lvl]'); await lib.sleep(700);
  const raceLeft = () => { const r = Hour.state.lt.race; return r ? (r.left != null ? r.left : r.ms != null ? r.ms : r.remain) : null; };
  const r0 = await p.evaluate(raceLeft); await p.evaluate(() => Hour.help(true)); const r1 = await p.evaluate(raceLeft); await lib.sleep(1500);
  const r2 = await p.evaluate(raceLeft); await p.evaluate(() => Hour.help(false)); await lib.sleep(1200); const r3 = await p.evaluate(raceLeft);
  J.must(r0 != null && Math.abs(r2 - r1) < 60 && r2 - r3 > 900, 'the rule-race clock holds while help is open, then runs on (' + [r1, r2, r3].map(Math.round).join(' / ') + ')'); await p.close();
  /* left alone: pulse, then ring; one touch clears both */
  p = await lib.page(1366, 625, 'idle=1'); await p.evaluate(() => Hour.go(Hour.ids().indexOf('c1-ask'))); await p.evaluate(() => { Hour.state.idleAt = Date.now(); }); await lib.sleep(1000);
  const a = await p.evaluate(() => [document.getElementById('helpBtn').classList.contains('nudge'), !!document.querySelector('.help-spot')]); await lib.sleep(900);
  const b = await p.evaluate(() => [!!document.querySelector('.help-spot'), !document.getElementById('tag').hidden, !document.getElementById('help').hidden]);
  J.must(a[0] && !a[1] && b[0] && b[1] && !b[2], 'left alone, the button pulses first and the ring with its tag comes second, without help opening (' + a.concat(b).join(',') + ')');
  await p.mouse.click(5, 300); await lib.sleep(120);
  J.must(!(await p.evaluate(() => document.querySelector('.help-spot') || document.querySelector('#helpBtn.nudge'))), 'one touch clears the pulse and the ring'); await p.close();

  /* controls */
  let c = await lib.walk({ W: 1366, H: 625, route: 'model', maxStates: 6, fault: "document.getElementById('helpBtn').style.display = 'none'" });
  J.control(faults([c]).some(t => /no proper/.test(t)), 'the Stuck? Show me button hidden');
  c = await lib.walk({ W: 1366, H: 625, route: 'model', maxStates: 6, fault: "if (!window.__k) { window.__k = 1; var a = DOMTokenList.prototype.add; DOMTokenList.prototype.add = function (x) { if (x !== 'help-spot') a.apply(this, arguments); }; }" });
  J.control(faults([c]).some(t => /points at nothing/.test(t)), 'the ring stripped');
  c = await lib.walk({ W: 1366, H: 625, route: 'model', maxStates: 12, fault: "S.help.demo.c1 = 'sleep_hours >= 8'" });
  J.control(faults([c]).some(t => /example is the answer/.test(t)), 'the example swapped for the answer');
  await J.end();
})();
