/* J3 L7 TEACH IT TO SEE · gate: the robot pupil gets through the whole hour both ways (Fool it with "Somebody is
   beside me" and with "Nobody is beside me") at four sizes and is never stuck; the end questions can be reached
   from every screen of every extra; leaving for the end questions in the middle of a drawing keeps the drawing, and
   "Back to where I was" (from the questions, and from the finished screen) puts it back, and she can carry on.
   CONTROLS: the saved drawing is thrown away before she goes back; the way to the end questions is hidden in the
   extras. Each must FAIL.
   node j3l7see-walk.js [--url <served hour.html>] [--fresh] */
'use strict';
const lib = require('./j3l7see-lib.js'), J = lib.judge('j3l7see-walk');
/* her drawing, to the whole pixel (the page keeps it rounded when she steps away) */
const ink = p => p.evaluate(() => JSON.stringify(JSON.parse(App.snap().split('|').pop()).map(q => q.map(v => [Math.round(v[0]), Math.round(v[1])])))), scr = async p => (await lib.info(p)).scr;
const REC = "try{var a=JSON.parse(localStorage.getItem('see-gate-x')||'[]'),e=document.getElementById('endBtn');a.push([App.info().scr,!e.hidden&&e.offsetParent!==null&&e.getBoundingClientRect().bottom<=innerHeight&&e.getBoundingClientRect().right<=innerWidth]);localStorage.setItem('see-gate-x',JSON.stringify(a))}catch(x){}";
async function extras(fault, max) {
  let p = await lib.fresh(1366, 768); await p.evaluate(() => localStorage.removeItem('see-gate-x')); await p.close();
  const w = await lib.walk({ W: 1366, H: 768, shots: false, maxScreens: max || 0, fault: (fault || '') + REC });
  p = await lib.fresh(1366, 768); const rows = JSON.parse(await p.evaluate(() => localStorage.getItem('see-gate-x') || '[]')); await p.close();
  return { w, x: rows.filter(r => /^x-/.test(r[0])) };
}
async function lateExit(lose) {
  const p = await lib.fresh(1366, 768, 'new-fast-late'), out = {};
  out.there = await lib.until(p, 's-cat', 's'); await lib.draw(p, lib.People(7).cat()); const mine = await ink(p);
  out.drew = mine.length > 20; out.endShown = await p.evaluate(() => !document.getElementById('endBtn').hidden);
  await lib.click(p, '#endBtn'); out.toQs = await scr(p) === 'e-q';
  if (lose) await p.evaluate(() => { App.st().retS = null; });
  await lib.click(p, '#endBtn'); out.back1 = await scr(p) === 's-cat' && await ink(p) === mine;
  if (!lose) {
    await lib.click(p, '#endBtn'); for (let k = 0; k < 40 && await scr(p) !== 'e-done'; k++) { await lib.click(p, '#stage [data-want]'); await lib.sleep(30); }
    out.done = await scr(p) === 'e-done'; await lib.click(p, '[data-act=back]'); out.back2 = await scr(p) === 's-cat' && await ink(p) === mine;
    out.on = await lib.until(p, 'x-menu', 's'); out.errs = p._errs.length;
  }
  await p.close(); return out;
}
(async () => {
  const rs = await lib.reports(process.argv.includes('--fresh'));
  rs.forEach(r => J.must(r.ended && !r.errs.length && !r.report.some(x => /^STUCK/.test(x.tag)) && r.report.length > 50, r.W + 'x' + r.H + ' route ' + r.who + ': reached the finished screen, ' + r.report.length + ' screens, never stuck, no errors' + (r.errs[0] ? ' — ' + r.errs[0] : '')));
  J.must(rs.every(r => r.packSize > 0 && r.packSize < 7600), 'what the page saves is under its 7600 limit at the end of every walk: ' + rs.map(r => r.packSize).join(', '));
  const e = await extras(), names = new Set(e.x.map(r => r[0]));
  J.must(['x-menu', 'x-third', 'x-speed', 'x-half', 'x-bad', 'x-own'].every(n => names.has(n)) && e.x.length >= 30, 'all five extras walked: ' + e.x.length + ' screens');
  J.must(e.x.every(r => r[1]), 'Go to the end questions is on every screen of every extra' + (e.x.every(r => r[1]) ? '' : ' — missing on ' + [...new Set(e.x.filter(r => !r[1]).map(r => r[0]))].join(', ')));
  const a = await lateExit(false);
  J.must(a.there && a.drew && a.endShown, 'late in the hour, the way to the end questions shows in the main lesson, in the middle of a drawing');
  J.must(a.toQs && a.back1, 'from the questions, Back to where I was returns her to the same screen with her drawing');
  J.must(a.done && a.back2, 'from the finished screen, Back to where I was returns her to the same screen with her drawing');
  J.must(a.on && !a.errs, 'and she can carry on to the extras from there');
  const c1 = await lateExit(true); J.control(!c1.back1, 'the saved drawing thrown away before she goes back');
  const c2 = await extras("document.getElementById('endBtn').hidden=true;", 38); J.control(c2.x.length > 0 && !c2.x.every(r => r[1]), 'the way to the end questions hidden in the extras');
  await J.end();
})();
