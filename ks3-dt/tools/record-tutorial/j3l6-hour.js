/* J3 L6 THE NIGHT DESK · gate (V85, the J3 L7 hour standard): there is enough to do for the whole hour.
   Walks the built hour as the model pupil (the main lesson on the model and honest-fails routes, then every extra
   in the late shift) at the school PC's 1366x625 and logs what a pupil must do: each new thing to read (words),
   each rule typed (a think, the keys, a look at the rows it keeps), each choice (a think and a press), each other
   press, each film. Then prices the log for three pupils on a school PC with a mouse:
   1 a fast pupil cannot run out: the main lesson and every extra take her 55 minutes or more;
   2 a typical pupil has more than the hour: 65 minutes or more;
   3 the main lesson still fits a slow pupil: 50 minutes or less, with her wrong tries.
   Each rule-race level is capped at its own 90-second clock. Inside the platform the hour has no Do now screen (the
   lesson skips it when framed), so it is not counted; its end questions stand in for the platform's own five
   questions and "How did it go?".
   CONTROL (must FAIL): the same fast total without the late shift does not reach check 1.
   node j3l6-hour.js [--url <served hour.html>]   → prints minutes per part, writes j3l6/hour.json */
'use strict';
const fs = require('fs'), path = require('path'), lib = require('./j3l6-lib.js'), J = lib.judge('j3l6-hour');
const FAST = 55, TYP = 65, CORE = 50;
/* pace of a pupil, in seconds (reading in words a minute); retry = how many goes a late-shift rule takes her */
const PUPILS = {
  fast:    { wpm: 240, base: 1.5, press: 0.7, choice: 3,  rule: 10, char: 0.25, scan: 2, retry: 1.0 },
  typical: { wpm: 170, base: 3,   press: 1.2, choice: 5,  rule: 20, char: 0.4,  scan: 4, retry: 1.3 },
  slow:    { wpm: 110, base: 5,   press: 2,   choice: 8,  rule: 35, char: 0.7,  scan: 6, retry: 1.6 }
};
const PART = s => /^(donow)$/.test(s) ? null : /^(opening|story|facts|tour)$/.test(s) ? 'The job' : /^c\d/.test(s) ? 'Part ' + s[1]
  : /^(front|badges|recap)$/.test(s) ? 'Front page' : /^(exit|felt)$/.test(s) ? 'End questions' : s === 'free' ? 'Late shift menu' : /^late-/.test(s) ? 'Extra: ' + s.slice(5) : s;
const CHOICE = /data-(opt|pick|xpick|stamp|reason|ro|cnt|felt|lvl|x)=/;
function readable() {
  const v = e => e.getClientRects().length > 0 && !e.closest('[hidden]') && !e.closest('#help');
  const t = [document.getElementById('job')].concat([...document.querySelectorAll('main p, main li, main h1, main h2, main .kick, main label, main .headline, main .badge, main button, main code')])
    .filter(e => e && v(e)).map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return [...new Set(t)];
}
async function log(route) {
  const p = await lib.page(1366, 625, lib.ROUTES[route]), ev = []; let last = new Set(), guard = 0, scr0 = '';
  while (guard++ < 1500) {
    const scr = await p.evaluate(() => Hour.screen()), part = PART(scr);
    if (scr !== scr0) { scr0 = scr; ev.push({ part, kind: 'screen', n: 1, scr }); const film = await p.evaluate(() => Hour.measure().film); if (film) ev.push({ part, kind: 'film', n: film }); }
    const now = await p.evaluate(readable), fresh = now.filter(t => !last.has(t)); last = new Set(now);
    const words = fresh.join(' ').replace('Your job now: ', '').split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length; if (words) ev.push({ part, kind: 'read', n: words, scr });
    const w = await p.evaluate(() => Hour.want()); if (!w || w.kind === 'done') break;
    if (w.kind === 'type') ev.push({ part, kind: 'rule', n: w.text.length + 1, scr });
    else if (w.kind === 'click') ev.push({ part, kind: CHOICE.test(w.sel) ? 'choice' : 'press', n: 1, scr });
    await lib.act(p, w);
  }
  const errs = p._errs; await p.close(); return { ev, errs };
}
function price(ev, P, late) {
  const m = {};
  ev.filter(e => e.part).forEach(e => { let s = 0, lt = /^Extra/.test(e.part);
    if (e.kind === 'screen') s = P.base; else if (e.kind === 'film') s = e.n; else if (e.kind === 'read') s = e.n * 60 / P.wpm;
    else if (e.kind === 'press') s = P.press; else if (e.kind === 'choice') s = P.choice + P.press;
    else if (e.kind === 'rule') s = (P.rule + e.n * P.char + P.scan) * (lt ? P.retry : 1);
    m[e.part] = (m[e.part] || 0) + s; });
  if (m['Extra: race']) m['Extra: race'] = Math.min(m['Extra: race'], 3 * (90 + 10));
  Object.keys(m).forEach(k => { m[k] = +(m[k] / 60).toFixed(1); }); return m;
}
const sum = (m, keep) => +Object.keys(m).filter(keep || (() => true)).reduce((a, k) => a + m[k], 0).toFixed(1);
(async () => {
  const model = await log('model'), fails = await log('fails'), late = await log('late');
  const errs = model.errs.concat(fails.errs, late.errs), lateEv = late.ev.filter(e => /^(Extra|Late)/.test(e.part));
  const M = { fast: price(model.ev.concat(lateEv), PUPILS.fast), typical: price(fails.ev.concat(lateEv), PUPILS.typical), slow: price(fails.ev.concat(lateEv), PUPILS.slow) };
  fs.mkdirSync(lib.OUTDIR, { recursive: true }); fs.writeFileSync(path.join(lib.OUTDIR, 'hour.json'), JSON.stringify({ minutes: M, counts: { model: model.ev.length, fails: fails.ev.length, late: late.ev.length } }, null, 1));
  const parts = Object.keys(M.typical); console.log('  minutes          fast  typical  slow');
  parts.forEach(k => console.log('  ' + k.padEnd(18) + String(M.fast[k] || 0).padStart(4) + String(M.typical[k]).padStart(8) + String(M.slow[k]).padStart(7)));
  const core = k => !/^(Extra|Late)/.test(k), fastAll = sum(M.fast), typAll = sum(M.typical), slowCore = sum(M.slow, core), fastCore = sum(M.fast, core);
  console.log('  totals: fast ' + fastAll + ', typical ' + typAll + ', slow main lesson ' + slowCore + ' minutes');
  J.must(!errs.length, 'the three walks run with no page errors' + (errs[0] ? ' — ' + errs[0] : ''));
  J.must(fastAll >= FAST, 'a fast pupil has ' + fastAll + ' minutes of work (needs ' + FAST + ')');
  J.must(typAll >= TYP, 'a typical pupil has ' + typAll + ' minutes of work (needs ' + TYP + ')');
  J.must(slowCore <= CORE, 'the main lesson takes a slow pupil ' + slowCore + ' minutes, with her wrong tries (must be ' + CORE + ' or less)');
  J.control(fastCore < FAST, 'without the late shift a fast pupil has only ' + fastCore + ' minutes');
  await J.end();
})();
