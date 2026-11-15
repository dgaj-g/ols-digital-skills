/* J3 L7 TEACH IT TO SEE · gate: there is enough to do for the whole hour (V82).
   Runs the clock (j3l7see-clock.js) on both routes and reads its minutes for three pupils on a school PC with a mouse.
   1 A fast pupil cannot run out: the whole lesson, every extra and the Do now take her 55 minutes or more, on both routes.
   2 A typical pupil has more than the hour: 65 minutes or more.
   3 The core still fits a slow pupil: everything except the extras, plus the Do now, is 50 minutes or less.
   4 The new games keep her best score when her save goes through the platform (pack, then unpack).
   CONTROL (must FAIL): the same totals with the five new games taken out do not reach check 1.
   node j3l7see-hour.js [--reuse]   (--reuse reads the last clock-*.json instead of walking again) */
'use strict';
const lib = require('./j3l7see-lib.js'), J = lib.judge('j3l7see-hour'), fs = require('fs'), path = require('path'), cp = require('child_process');
const NEW = ['golf', 'tricks', 'mind', 'messy', 'checks'], FAST = 55, TYP = 65, CORE = 50;
const DO_NOW = { fast: 1, typical: 1.5, slow: 2.5 };
(async () => {
  const clocks = {};
  for (const who of ['s', 'n']) {
    const f = path.join(__dirname, 'j3l7see', 'clock-' + who + '.json');
    if (!process.argv.includes('--reuse')) cp.execFileSync('node', [path.join(__dirname, 'j3l7see-clock.js'), '--who', who], { stdio: 'ignore', env: process.env });
    clocks[who] = JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  const sum = (m, keep) => Object.keys(m).filter(k => !/^TOTAL/.test(k) && keep(k)).reduce((a, k) => a + m[k], 0);
  for (const who of ['s', 'n']) {
    const M = clocks[who].minutes, tot = n => +(sum(M[n], () => true) + DO_NOW[n]).toFixed(1);
    console.log('  route ' + who + ': fast ' + tot('fast') + ', typical ' + tot('typical') + ', slow ' + tot('slow') + ' minutes (with the Do now)');
    J.must(tot('fast') >= FAST, 'route ' + who + ': a fast pupil has ' + tot('fast') + ' minutes of work (needs ' + FAST + ')');
    J.must(tot('typical') >= TYP, 'route ' + who + ': a typical pupil has ' + tot('typical') + ' minutes of work (needs ' + TYP + ')');
    const core = +(sum(M.slow, k => !/^Extra/.test(k)) + DO_NOW.slow).toFixed(1);
    J.must(core <= CORE, 'route ' + who + ': the core takes a slow pupil ' + core + ' minutes (must be ' + CORE + ' or less)');
    const cut = +(sum(M.fast, k => !NEW.some(n => k === 'Extra: ' + n)) + DO_NOW.fast).toFixed(1);
    J.control(cut < FAST, 'route ' + who + ': without the five new games a fast pupil has only ' + cut + ' minutes');
  }
  const p = await lib.fresh(1366, 768);
  const kept = await p.evaluate(names => { const st = App.st(); names.forEach((n, i) => { st.x[n] = { best: 7 + i, done: 1, i: 3, h: 3, r: 2, j: 1 }; }); const u = JSON.parse(JSON.stringify(App.pack())); App.unpack(u); return names.filter((n, i) => App.st().x[n] && App.st().x[n].best === 7 + i && App.st().x[n].done); }, NEW);
  J.must(kept.length === NEW.length, 'the new games keep her best score through pack and unpack: ' + kept.join(', '));
  J.must(!p._errs.length, 'no page errors' + (p._errs[0] ? ' — ' + p._errs[0] : ''));
  await J.end();
})();
