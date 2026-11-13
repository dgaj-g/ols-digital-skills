/* J3 L7 TEACH IT TO SEE · gate (spec A19, DFM 379): the green "Stuck? Show me" button is on every screen, at least
   150 x 40, and SHOWS what to do: 1 to 3 steps of 10 words or fewer, a ring and a tag on a real control that is on
   screen and not under the help, never the right answer alone, an example drawn on every empty drawing box (her own
   two things and half-and-half have no one example), nothing changed when it closes. The speed round's clock holds
   while help is open. Left alone, the button pulses after 20 s and the ring shows after 40 s.
   CONTROLS: the button hidden; the pointer stripped. Each must FAIL.
   node j3l7see-help.js [--url <served hour.html>] [--fresh] */
'use strict';
const fs = require('fs'), path = require('path'), lib = require('./j3l7see-lib.js'), J = lib.judge('j3l7see-help');
const faults = rs => { const f = []; rs.forEach(r => r.report.forEach(x => { if (!x.help) return; const k = r.W + ' ' + x.tag.split('|')[0];
  if (!x.helpOK) f.push(k + ': no proper Stuck? Show me button'); x.help.bad.forEach(b => f.push(k + ': ' + b));
  if (x.help.emptyPad && !x.help.demo && !/^(own|half)$/.test(x.help.draw || '')) f.push(k + ': no example drawn on the empty box'); })); return f; };
(async () => {
  const rs = await lib.reports(process.argv.includes('--fresh')), f = faults(rs);
  const demos = rs.reduce((a, r) => a + r.report.filter(x => x.help && x.help.demo).length, 0);
  J.must(!f.length, 'help is right on every screen of both routes at four sizes' + (f.length ? ' — ' + [...new Set(f)].slice(0, 10).join(' · ') : ''));
  J.must(demos >= 8 * 8, 'an example was drawn on the empty drawing boxes: ' + demos + ' times');
  // the speed round's clock holds while help is open
  let p = await lib.fresh(1366, 768); await lib.until(p, 'x-menu', 's'); await lib.click(p, '[data-arg=speed]'); await lib.click(p, '#stage [data-want]');
  await lib.sleep(600); const t0 = await p.evaluate(() => { App.help(true); return document.getElementById('clock').textContent; });
  await lib.sleep(1600); const t1 = await p.evaluate(() => document.getElementById('clock').textContent); await p.evaluate(() => App.help(false)); await lib.sleep(1300);
  const t2 = await p.evaluate(() => (document.getElementById('clock') || {}).textContent);
  J.must(t0 === t1 && t2 !== t1, 'the speed round clock holds while help is open, then runs on (' + t0 + ' / ' + t1 + ' / ' + t2 + ')'); await p.close();
  // left alone: pulse, then the ring (timed short by the idle flag; the real times are read from the page)
  p = await lib.fresh(1366, 768, 'new-fast-idle'); await lib.sleep(1000); const a = await p.evaluate(() => [document.getElementById('helpBtn').classList.contains('nudge'), !!document.querySelector('.spot')]);
  await lib.sleep(900); const b = await p.evaluate(() => [!!document.querySelector('.spot'), App.info().tag, App.info().helpOpen]);
  J.must(a[0] && !a[1] && b[0] && !!b[1] && !b[2], 'left alone, the button pulses first and the ring with its tag shows second, without help opening');
  await p.mouse.click(700, 400); await lib.sleep(100); J.must(!(await p.evaluate(() => document.querySelector('.spot') || document.querySelector('#helpBtn.nudge'))), 'one touch clears the pulse and the ring'); await p.close();
  J.must(/\? 700 : 20000;/.test(fs.readFileSync(path.join(lib.SEE, 'hour.html'), 'utf8')), 'the real wait is 20 seconds, and 40 for the ring');
  let c = await lib.walk({ W: 1366, H: 768, shots: false, maxScreens: 4, fault: "document.getElementById('helpBtn').style.display = 'none'" });
  J.control(faults([c]).some(t => /no proper/.test(t)), 'the Stuck? Show me button hidden');
  c = await lib.walk({ W: 1366, H: 768, shots: false, maxScreens: 4, fault: "if (!window.__k) { window.__k = 1; var a = DOMTokenList.prototype.add; DOMTokenList.prototype.add = function (c) { if (c !== 'spot') a.apply(this, arguments); }; }" });
  J.control(faults([c]).some(t => /points at nothing/.test(t)), 'the pointer stripped');
  await J.end();
})();
