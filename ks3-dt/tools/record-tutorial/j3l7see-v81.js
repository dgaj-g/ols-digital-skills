/* J3 L7 TEACH IT TO SEE · gate for the fixes after the live walk of 15 Nov (V81).
   1 She leaves an extra for the end questions in the middle of a drawing. "Back to where I was" (from the questions,
     and from the finished screen) puts her back on the same extra screen with her drawing, or her answered test.
   2 Half and half opens again after her save has been through the platform (packed and unpacked).
   3 Every screen of every extra has "Back to the activities", on screen, at the smallest size.
   4 No answer shows on a test drawing before she presses the yellow button, and none while the stranger draws.
   5 The grey example stays on the box after it has drawn itself, until she starts drawing.
   6 An unfinished drawing is still on the box after a reload.
   CONTROLS (each must FAIL): the way back thrown away; Half and half opened the old way; the menu buttons taken off;
   a live answer put back on the test screen; the example rubbed out by her first line; the unfinished drawing not saved.
   node j3l7see-v81.js [--url <served hour.html>] */
'use strict';
const lib = require('./j3l7see-lib.js'), J = lib.judge('j3l7see-v81');
const ink = p => p.evaluate(() => JSON.stringify(JSON.parse(App.snap().split('|').pop()).map(q => q.map(v => [Math.round(v[0]), Math.round(v[1])])))), scr = async p => (await lib.info(p)).scr;
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.trim() : ''; }, s);
const half = n => { const P = lib.People(n); return P.sun().concat(P.fish()); };
const BACKC = 'Back to where I was';

/* 1 */
async function backFromExtra(lose) {
  const p = await lib.fresh(1366, 768), o = {};
  await lib.until(p, 'x-menu', 's'); await lib.click(p, '[data-arg=half]'); await lib.draw(p, half(11)); const mine = await ink(p);
  o.drew = mine.length > 20 && await scr(p) === 'x-half';
  await lib.click(p, '#endBtn'); o.qs = await scr(p) === 'e-q'; o.label1 = await txt(p, '#endBtn');
  if (lose) await p.evaluate(() => { App.st().ret = null; });
  await lib.click(p, '#endBtn'); o.back1 = await scr(p) === 'x-half' && await ink(p) === mine;
  if (!lose) {
    await lib.click(p, '#endBtn'); for (let k = 0; k < 40 && await scr(p) !== 'e-done'; k++) { await lib.click(p, '#stage [data-want]'); await lib.sleep(30); }
    o.done = await scr(p) === 'e-done'; o.label2 = await txt(p, '[data-act=back]');
    await lib.click(p, '[data-act=back]'); o.back2 = await scr(p) === 'x-half' && await ink(p) === mine;
    /* A third thing: leave with a test answered on screen, come back to the same answer */
    await lib.click(p, '[data-act=menu]'); await lib.click(p, '[data-arg=third]');
    for (let k = 0; k < 40; k++) {
      const i = await lib.info(p), n = await p.evaluate(() => App.st().x.third.tests.length); if (n === 1 && i.shown) break;
      if (i.pad && i.draw && !i.shown) await lib.draw(p, lib.People(30 + k)[i.draw]());
      await lib.click(p, '#draw [data-want], #side [data-want], #stage [data-want]');
    }
    const was = await p.evaluate(() => App.st().x.third.tests.length + '|' + App.info().shown), pic = await ink(p);
    await lib.click(p, '#endBtn'); o.toDone = await scr(p) === 'e-done'; o.label3 = await txt(p, '[data-act=back]');
    await lib.click(p, '[data-act=back]');
    o.third = was === '1|1' && await scr(p) === 'x-third' && await p.evaluate(() => App.st().x.third.tests.length + '|' + App.info().shown) === was && await ink(p) === pic;
    o.errs = p._errs.slice();
  }
  await p.close(); return o;
}
/* 2 */
async function reopenHalf(oldWay) {
  const p = await lib.fresh(1366, 768), o = {};
  await lib.until(p, 'x-menu', 's');
  await p.evaluate(() => { App.st().x.half = { pics: [], done: 1 }; Object.assign(App.st(), App.unpack(App.pack())); });
  o.packed = await p.evaluate(() => JSON.stringify(App.st().x.half));
  await lib.click(p, '[data-arg=half]');
  if (oldWay) await p.evaluate(() => { App.st().x.half = { done: 1, best: 0 }; });
  try { await lib.draw(p, half(12)); } catch (e) { o.drawErr = e.message; }
  o.open = !o.drawErr && await scr(p) === 'x-half' && (await lib.info(p)).pad && await p.evaluate(() => !!document.querySelector('[data-act=keep]')) && !p._errs.length;
  o.errs = p._errs.slice(); if (o.drawErr) o.errs.push('no box to draw on'); await p.close(); return o;
}
/* 3 */
const RECM = "try{var a=JSON.parse(localStorage.getItem('see-gate-m')||'[]'),b=[].slice.call(document.querySelectorAll('[data-act=menu]')).some(function(e){var r=e.getBoundingClientRect();return e.offsetParent!==null&&!e.disabled&&!e.closest('[hidden]')&&r.bottom<=innerHeight&&r.right<=innerWidth&&r.top>=0});a.push([App.info().scr,b]);localStorage.setItem('see-gate-m',JSON.stringify(a))}catch(x){}";
async function menus(fault, max) {
  let p = await lib.fresh(1024, 768); await p.evaluate(() => localStorage.removeItem('see-gate-m')); await p.close();
  const w = await lib.walk({ W: 1024, H: 768, shots: false, maxScreens: max || 0, fault: (fault || '') + RECM });
  p = await lib.fresh(1024, 768); const rows = JSON.parse(await p.evaluate(() => localStorage.getItem('see-gate-m') || '[]')); await p.close();
  return { w, x: rows.filter(r => /^x-/.test(r[0]) && r[0] !== 'x-menu') };
}
/* 4 */
async function noEarlyAnswer(inject) {
  const p = await lib.fresh(1366, 768), o = {};
  await lib.until(p, 't-test', 's'); await lib.draw(p, lib.People(5).sun());
  if (inject) await p.evaluate(() => document.getElementById('side').insertAdjacentHTML('beforeend', '<div id="live">It thinks: sun</div>'));
  o.before = await p.evaluate(() => !document.getElementById('live') && !/%/.test(document.getElementById('side').textContent));
  await lib.click(p, '[data-act=fin]');
  o.after = await p.evaluate(() => App.info().shown === 1 && /%/.test(document.getElementById('side').textContent));
  if (!inject) {
    await lib.until(p, 'f-1', 's'); let plays = 0, seen = 0;
    for (let k = 0; k < 300; k++) { const i = await lib.info(p); if (i.play) { plays++; if (await p.evaluate(() => !!document.getElementById('live') || /%/.test(document.getElementById('side').textContent))) seen++; } else if (plays) break; await lib.sleep(10); }
    o.plays = plays; o.stranger = seen === 0;
    await lib.until(p, 's-cat', 's'); await lib.draw(p, lib.People(8).cat());
    o.cat = await p.evaluate(() => !document.getElementById('live') && !/%/.test(document.getElementById('side').textContent));
  }
  await p.close(); return o;
}
/* 5 — real speed, so the example draws itself */
async function ghostStays(rub) {
  const p = await lib.fresh(1366, 768, 'new'), o = {};
  await p.evaluate(() => App.help(true));
  for (let k = 0; k < 120; k++) { const i = await lib.info(p); if (i.demoRuns && !i.demoOn) break; await lib.sleep(100); }
  await p.evaluate(() => App.help(false)); await lib.sleep(1600);
  if (rub) await lib.draw(p, [[[100, 100], [120, 120]]]);
  o.stays = (await lib.info(p)).ghost === true;
  if (!rub) { await lib.draw(p, [[[100, 100], [140, 140]]]); o.gone = (await lib.info(p)).ghost === false; }
  await p.close(); return o;
}
/* 6 */
async function inkSurvives(unsaved) {
  const p = await lib.fresh(1366, 768), o = {};
  await lib.until(p, 't-test', 's'); await lib.draw(p, lib.People(6).sun().slice(0, 2)); const mine = await ink(p);
  if (unsaved) await p.evaluate(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = localStorage.getItem(k); if (/"scr"/.test(v)) { const s = JSON.parse(v); s.ink = null; localStorage.setItem(k, JSON.stringify(s)); } } });
  await p.goto(lib.url('fast'), { waitUntil: 'load' });
  o.same = await scr(p) === 't-test' && mine.length > 10 && await ink(p) === mine;
  await p.close(); return o;
}

(async () => {
  const a = await backFromExtra(false);
  J.must(a.drew && a.qs && a.label1 === BACKC, 'from Half and half mid-drawing, the end questions open and the way back says "' + BACKC + '" (it says "' + a.label1 + '")');
  J.must(a.back1, 'from the questions, it returns her to Half and half with her drawing');
  J.must(a.done && a.label2 === BACKC && a.back2, 'from the finished screen, "' + a.label2 + '" returns her to Half and half with her drawing');
  J.must(a.toDone && a.label3 === BACKC && a.third, 'from A third thing with a test answered, she comes back to the same answer');
  J.must(!a.errs.length, 'no page errors' + (a.errs[0] ? ' — ' + a.errs[0] : ''));
  const b = await reopenHalf(false);
  J.must(b.open, 'Half and half opens and draws after the save went through the platform (' + b.packed + ')' + (b.errs[0] ? ' — ' + b.errs[0] : ''));
  const m = await menus();
  const miss = [...new Set(m.x.filter(r => !r[1]).map(r => r[0]))];
  J.must(m.x.length >= 30 && !miss.length, 'Back to the activities is on screen on all ' + m.x.length + ' screens of the extras at 1024 x 768' + (miss.length ? ' — missing on ' + miss.join(', ') : ''));
  const c = await noEarlyAnswer(false);
  J.must(c.before, 'a test drawing in Part 1 shows no answer before she presses the yellow button');
  J.must(c.after, 'the answer and how sure it is show once she presses it');
  J.must(c.plays > 0 && c.stranger, 'no answer shows while the stranger draws (' + c.plays + ' looks while it drew)');
  J.must(c.cat, 'no answer shows on the cat before she presses the yellow button');
  const g = await ghostStays(false);
  J.must(g.stays, 'the grey example is still on the box after it has drawn itself and the help has closed');
  J.must(g.gone, 'it goes when she starts drawing');
  const i = await inkSurvives(false);
  J.must(i.same, 'an unfinished drawing is still on the box after a reload');
  const k1 = await backFromExtra(true); J.control(!k1.back1, 'the way back thrown away before she goes back');
  const k2 = await reopenHalf(true); J.control(!k2.open, 'Half and half opened the old way');
  const k3 = await menus("document.querySelectorAll('[data-act=menu]').forEach(function(e){e.remove()});", 0); J.control(k3.x.length > 0 && k3.x.some(r => !r[1]), 'the menu buttons taken off');
  const k4 = await noEarlyAnswer(true); J.control(!k4.before, 'a live answer put back on the test screen');
  const k5 = await ghostStays(true); J.control(!k5.stays, 'the example rubbed out by her first line');
  const k6 = await inkSurvives(true); J.control(!k6.same, 'the unfinished drawing not saved');
  await J.end();
})();
