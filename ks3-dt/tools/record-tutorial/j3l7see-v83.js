/* J3 L7 TEACH IT TO SEE · gate for the fixes after the live walk of V82 (15 Nov), V83.
   1 Read its mind: the result shows both rows of choices; the right one is green with a tick, a wrong guess is red with a cross,
     and a line says what red and green mean (or that both guesses were right).
   2 Who checks?: every number in the result sentence has its thing after it (points, checks, mistakes).
   3 The speed round: a right drawing shows "Right! It saw your ..." in green, the box holds still for a moment
     (her extra lines do not land), then it clears for the next drawing.
   4 Drawing golf: the count says how many drawings she may use ("Drawings used: 2 of 8.").
   5 A third thing: at 6 of 6 the line says it still got every one right, not "more ways to be wrong".
   CONTROLS (each must FAIL): the two rows taken off; the old "Checked: 7." sentence; the "Right!" line blanked;
   the old count without its limit; the old 6-of-6 line.
   node j3l7see-v83.js [--url <served hour.html>] */
'use strict';
const lib = require('./j3l7see-lib.js'), J = lib.judge('j3l7see-v83');
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.trim() : ''; }, s);
const nStrokes = p => p.evaluate(() => JSON.parse(App.snap().split('|').pop()).length);
async function openExtra(p, id) { await lib.until(p, 'x-menu', 's'); await lib.click(p, '[data-arg=' + id + ']'); }
/* the same trick the pupil uses: draw what the screen asks, then press the yellow button */
async function step(p, seed) {
  const i = await lib.info(p);
  if (i.pad && !(await p.evaluate(() => { const b = document.querySelector('#btns [data-want], [data-want]'); return !!b && !b.disabled; }))) await lib.draw(p, await lib.picFor(p, i, seed));
  await lib.click(p, '[data-want]'); await lib.sleep(40);
}

/* 1 */
async function mind(fault) {
  const p = await lib.fresh(1366, 768), o = { rounds: [] };
  await openExtra(p, 'mind');
  for (let r = 0; r < 6; r++) {
    await lib.click(p, '[data-act=a][data-arg="1"]'); await lib.click(p, '[data-act=b][data-arg="0"]'); await lib.click(p, '[data-act=show]');
    if (fault) await p.evaluate(() => document.querySelectorAll('.mr').forEach(e => e.remove()));
    o.rounds.push(await p.evaluate(() => {
      const rows = [...document.querySelectorAll('#stage .mr')], say = [...document.querySelectorAll('#stage .say')].map(e => e.textContent).join(' ');
      const pts = +((say.match(/Points: (\d) of 2/) || [])[1] || NaN), S = SeeStrings.mind;
      return { rows: rows.length, good: rows.map(r => r.querySelectorAll('.mk.good').length), bad: rows.reduce((a, r) => a + r.querySelectorAll('.mk.bad').length, 0),
        marks: rows.every(r => [...r.querySelectorAll('.mk.good')].every(e => /✓$/.test(e.textContent)) && [...r.querySelectorAll('.mk.bad')].every(e => /✗$/.test(e.textContent))),
        pts, key: say.includes(S.key), both: say.includes(S.both) };
    }));
    await lib.click(p, '[data-act=nx]');
  }
  o.errs = p._errs; await p.close(); return o;
}

/* 2 */
async function checks(fault) {
  const p = await lib.fresh(1366, 768), o = { lines: [] };
  await openExtra(p, 'checks');
  for (let r = 0; r < 4; r++) {
    await lib.click(p, '[data-act=pick][data-arg="' + (r % 3) + '"]');
    if (fault) await p.evaluate(() => { const e = document.querySelector('#stage > .say'); if (e) e.textContent = 'Checked: 7. Cheapest, in green: 6.'; });
    o.lines.push(await txt(p, '#stage > .say'));
    await lib.click(p, '[data-act=nx]');
  }
  o.errs = p._errs; await p.close(); return o;
}
const bareNumber = s => (s.match(/\d+(?!\s*(points?|checks?|mistakes?|%))\b/g) || []);

/* 3 */
async function speed(fault) {
  const p = await lib.fresh(1366, 768), o = {};
  await openExtra(p, 'speed');
  if (fault) await p.evaluate(() => { SeeStrings.speed.hit = ''; });
  // the hold is short in the robot's quick mode; stretch it so the robot can look during it
  await p.evaluate(() => { const T = window.setTimeout; window.setTimeout = (f, d, ...a) => T(f, d === 150 ? 2500 : d, ...a); });
  await lib.click(p, '[data-act=go]');
  for (let k = 0; k < 4 && !o.hit; k++) {
    const i = await lib.info(p); await lib.draw(p, await lib.picFor(p, i, 31 + k));
    const w = await p.evaluate(() => { const e = document.getElementById('warn'); return { t: e.textContent, ok: e.classList.contains('ok'), rub: (document.querySelector('[data-act=rub]') || {}).disabled }; });
    if (w.ok || /Right/.test(w.t) || w.rub) { o.hit = true; o.warn = w; } else await lib.click(p, '[data-act=rub]');
  }
  if (o.hit) {
    const before = await nStrokes(p); await lib.draw(p, [[[100, 100], [200, 200], [300, 120]]]); o.held = await nStrokes(p) === before && before > 0;
    await lib.sleep(2800);
    o.after = await p.evaluate(() => ({ t: document.getElementById('warn').textContent, n: JSON.parse(App.snap().split('|').pop()).length, rub: (document.querySelector('[data-act=rub]') || {}).disabled, scr: App.info().scr }));
    await lib.draw(p, [[[100, 100], [200, 200], [300, 120]]]); o.drawsAgain = await nStrokes(p) === 1;
  }
  o.errs = p._errs; await p.close(); return o;
}

/* 4 */
async function golf(fault) {
  const p = await lib.fresh(1366, 768), o = {};
  await openExtra(p, 'golf'); await lib.click(p, '[data-act=go]');
  // she teaches it a sun, then labels a second sun as a fish, so some tests go wrong and the hole carries on
  for (let k = 0; k < 2; k++) { await lib.draw(p, lib.People(41 + k).sun()); await lib.click(p, '[data-act=lab][data-want]'); await lib.sleep(40); }
  if (fault) await p.evaluate(() => { const e = document.querySelector('#side .say'); if (e) e.textContent = e.textContent.replace(/ of \d+\./, '.'); });
  o.status = await txt(p, '#side .say');
  o.errs = p._errs; await p.close(); return o;
}

/* 5 */
async function third(fault) {
  const p = await lib.fresh(1366, 768), o = {};
  await openExtra(p, 'third');
  if (fault) await p.evaluate(() => { SeeStrings.third.sumAll = SeeStrings.third.sumLines; });
  for (let k = 0; k < 60 && !/It got \d+ of 6/.test(await txt(p, '#stage .big')); k++) await step(p, 51 + k);
  o.big = await txt(p, '#stage .big');
  o.says = await p.evaluate(() => [...document.querySelectorAll('#stage .say')].map(e => e.textContent).join(' | '));
  o.errs = p._errs; await p.close(); return o;
}

(async () => {
  const m = await mind(false), wrong = m.rounds.filter(r => r.pts < 2), right = m.rounds.filter(r => r.pts === 2);
  J.must(m.rounds.length === 6 && m.rounds.every(r => r.rows === 2 && r.good.every(g => g === 1) && r.marks), 'Read its mind: every result shows both rows, one green tick in each (' + JSON.stringify(m.rounds.map(r => r.good)) + ')');
  J.must(wrong.length > 0 && wrong.every(r => r.bad === 2 - r.pts && r.key), 'a wrong guess is red with a cross, one red per lost point, and the line says what red and green mean (' + wrong.length + ' rounds with a miss)');
  J.must(right.every(r => r.bad === 0 && r.both), 'when both guesses are right there is no red and the line says so (' + right.length + ' rounds)');
  const c = await checks(false), bare = c.lines.map(bareNumber).flat();
  J.must(c.lines.length === 4 && c.lines.every(l => /Your choice cost \d+ points?: \d+ checks? and \d+ mistakes?\./.test(l)) && !bare.length, 'Who checks?: every number in the result has its thing after it — "' + c.lines[0] + '"' + (bare.length ? ' — bare: ' + bare.join(', ') : ''));
  const s = await speed(false);
  J.must(s.hit && s.warn.ok && /^Right! It saw your \w+\.$/.test(s.warn.t), 'The speed round: a right drawing shows "' + (s.warn || {}).t + '" in green');
  J.must(s.held && s.warn.rub, 'the box holds still for a moment: her extra line does not land and Rub it out waits');
  J.must(s.after && s.after.t === '' && s.after.n === 0 && !s.after.rub && s.drawsAgain, 'then the box clears and she can draw the next one (' + JSON.stringify(s.after) + ')');
  const g = await golf(false);
  J.must(/Drawings used: \d+ of \d+\./.test(g.status), 'Drawing golf: the count says how many she may use — "' + g.status + '"');
  const t = await third(false), six = /It got 6 of 6/.test(t.big);
  J.must(six, 'A third thing: this pupil gets 6 of 6 (' + t.big + ')');
  J.must(six && t.says.includes('every one right') && !t.says.includes('more ways to be wrong'), 'at 6 of 6 the line says it got every one right (' + t.says + ')');
  const errs = [].concat(m.errs, c.errs, s.errs, g.errs, t.errs);
  J.must(!errs.length, 'no page errors' + (errs[0] ? ' — ' + errs[0] : ''));
  const k1 = await mind(true); J.control(!k1.rounds.every(r => r.rows === 2), 'the two rows taken off');
  const k2 = await checks(true); J.control(k2.lines.map(bareNumber).flat().length > 0, 'the old "Checked: 7." sentence');
  const k3 = await speed(true); J.control(!(k3.hit && /^Right!/.test(k3.warn.t)), 'the "Right!" line blanked');
  const k4 = await golf(true); J.control(!/ of \d+\./.test(k4.status), 'the old count without its limit');
  const k5 = await third(true); J.control(!k5.says.includes('every one right'), 'the old 6-of-6 line');
  await J.end();
})();
