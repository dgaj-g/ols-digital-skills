/* J3 L7 TEACH IT TO SEE · the hour at a pupil's pace.
   Walks the whole lesson (main lesson, every extra, end questions) on the built page and logs every action a pupil
   must take: each new thing to read (words), each drawing (strokes), each press, each name typed, each wait while the
   stranger draws (timed at real speed). Then prices the log for three pupils on a school PC with a mouse.
   node j3l7see-clock.js [--url <served hour.html>] [--who s|n]   → prints minutes per part and writes clock.json */
'use strict';
const lib = require('./j3l7see-lib.js'), fs = require('fs'), path = require('path');
const WHO = lib.argOf('--who', 's');
/* pace of a pupil, all in seconds (reading in words a minute) */
const PUPILS = {
  fast:    { wpm: 240, look: 1.5, press: 0.7, base: 1.5, stroke: 0.6, char: 0.25, halfTries: 2, ownTests: 6,  replay: 0, scan: 0.8, dot: 0.3, doNow: 1 },
  typical: { wpm: 170, look: 3,   press: 1.2, base: 3,   stroke: 1.1, char: 0.4,  halfTries: 3, ownTests: 5,  replay: 0, scan: 1.5, dot: 0.5, doNow: 1.5 },
  slow:    { wpm: 110, look: 6,   press: 2,   base: 5,   stroke: 1.8, char: 0.7,  halfTries: 4, ownTests: 3,  replay: 0, scan: 2.5, dot: 0.8, doNow: 2.5 }
};
const PART = s => /^about/.test(s) ? 'Draw anything' : /^t-/.test(s) ? '1 Teach it' : /^f-/.test(s) ? '2 Fool it' : /^s-/.test(s) ? '3 Sure and wrong'
  : /^c-/.test(s) ? '4 Your card' : s === 'x-menu' ? 'Extras menu' : /^x-/.test(s) ? 'Extra: ' + s.slice(2) : /^e-/.test(s) ? 'End questions' : s;

(async () => {
  const b = await lib.open(), p = await b.newPage(); await p.setViewport({ width: 1366, height: 768 - lib.BAR, deviceScaleFactor: 1 });
  await p.goto(lib.url('new'), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  const ev = [], tiles = await lib.tilesOf(p); let seed = 1, last = '', guard = 0; const menuSeen = new Set();
  const log = (scr, kind, n) => ev.push({ part: PART(scr), kind, n });
  async function read(scr) {
    const prose = await p.evaluate(() => { const v = e => e && e.offsetParent !== null; return [document.getElementById('job')].concat([...document.querySelectorAll('#stage .say, #stage .big, #stage .stem, #stage p, #side .say, #side .big, #warn, #stage button, #side button')]).filter(e => v(e) && !e.closest('#help')).map(e => e.textContent.trim()).filter(Boolean); });
    const sig = prose.join('\n'); if (sig === last) return;
    const before = new Set(last.split('\n')); last = sig;
    let fresh = prose.filter(t => !before.has(t));
    if (scr === 'x-menu') { fresh = fresh.filter(t => !menuSeen.has(t)); prose.forEach(t => menuSeen.add(t)); }   /* back at the menu she reads only what is new on it */
    fresh = fresh.join(' ').replace('Your job now: ', '');
    log(scr, 'read', fresh.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length);
  }
  const pic = i => lib.picFor(p, i, seed++);
  while (guard++ < 900) {
    const i = await lib.info(p);
    if (i.play) { const t = Date.now(); while ((await lib.info(p)).play) await lib.sleep(50); log(i.scr, 'watch', (Date.now() - t) / 1000); continue; }
    await read(i.scr);
    if (i.scr === 'x-menu') { log(i.scr, 'press', 1); if (tiles.length) { await lib.click(p, '[data-arg=' + tiles.shift() + ']'); continue; } await lib.click(p, '#endBtn'); continue; }
    if (i.scr === 'x-speed' && i.pad) { log(i.scr, 'timed', 90); await p.evaluate(() => { App.st().x.speed.best = 9; }); while ((await lib.info(p)).pad) { await lib.draw(p, await pic(await lib.info(p))); } continue; }
    if (i.scr === 'x-half' && i.pad) { const s = await pic(i); log(i.scr, 'half', s.length); }
    if (i.pad && i.draw && !i.shown) { const s = await pic(i); log(i.scr, i.scr === 'x-tricks' && s.length > 6 ? 'dots' : 'draw', s.length); await lib.draw(p, s); await read(i.scr); }
    if (i.scr === 'x-own' && i.pad && (await p.evaluate(() => App.st().x.own.cls && App.st().x.own.cls[1].ex.length >= 5))) { log(i.scr, 'own', 8); }
    if (i.scr === 'c-card' && !(await p.evaluate(() => App.st().name))) log(i.scr, 'type', 12);
    if (i.scr === 'f-who') { log(i.scr, 'press', 1); await lib.click(p, '[data-act=' + WHO + ']'); continue; }
    if (i.scr === 'e-done') break;
    if (i.scan) { log(i.scr, 'scan', i.scan); log(i.scr, 'marks', (await p.evaluate(() => App.messyBad())).length); }
    if (await lib.extraStep(p, i)) { log(i.scr, 'press', 1); continue; }
    log(i.scr, 'press', 1);
    if (!(await lib.click(p, '#draw [data-want], #stage [data-want], #side [data-want]')) && !(await lib.click(p, '[data-want]'))) { if (!(await lib.click(p, '[data-act=menu]'))) { console.log('STUCK on ' + i.scr); break; } }
  }
  await lib.close();
  /* price it */
  const parts = [...new Set(ev.map(e => e.part))], out = { who: WHO, events: ev.length, counts: {}, minutes: {} };
  parts.forEach(pt => { const e = ev.filter(x => x.part === pt); out.counts[pt] = { read: e.filter(x => x.kind === 'read').reduce((a, x) => a + x.n, 0), screens: e.filter(x => x.kind === 'read').length, draws: e.filter(x => x.kind === 'draw').length, strokes: e.filter(x => x.kind === 'draw').reduce((a, x) => a + x.n, 0), presses: e.filter(x => x.kind === 'press').length, watch: Math.round(e.filter(x => x.kind === 'watch').reduce((a, x) => a + x.n, 0)) }; });
  for (const [name, P] of Object.entries(PUPILS)) {
    const m = {}; let tot = 0;
    parts.forEach(pt => {
      let s = 0;
      ev.filter(x => x.part === pt).forEach(x => {
        if (x.kind === 'read') s += P.look + x.n / P.wpm * 60;
        else if (x.kind === 'draw') s += P.base + x.n * P.stroke;
        else if (x.kind === 'press') s += P.press;
        else if (x.kind === 'scan') s += x.n * P.scan;
        else if (x.kind === 'marks') s += x.n * P.press;
        else if (x.kind === 'dots') s += P.base + x.n * P.dot;
        else if (x.kind === 'watch') s += x.n;
        else if (x.kind === 'timed') s += x.n + 6;
        else if (x.kind === 'type') s += x.n * P.char + 3;
        else if (x.kind === 'half') s += (P.halfTries - 1) * (P.base + x.n * P.stroke + P.press + P.look);
        else if (x.kind === 'own') s += P.ownTests * (P.base + x.n * P.stroke + 2 * P.press + P.look);
      });
      m[pt] = +(s / 60).toFixed(1); tot += s;
    });
    m.TOTAL_without_do_now = +(tot / 60).toFixed(1); out.minutes[name] = m; m.TOTAL_with_do_now = +(tot / 60 + P.doNow).toFixed(1);
  }
  fs.writeFileSync(path.join(__dirname, 'j3l7see', 'clock-' + WHO + '.json'), JSON.stringify(out, null, 1));
  console.log('route ' + WHO + ' · ' + ev.length + ' actions');
  console.log('part'.padEnd(22) + 'fast'.padStart(7) + 'typical'.padStart(9) + 'slow'.padStart(7) + '   counts');
  parts.concat('TOTAL_without_do_now', 'TOTAL_with_do_now').forEach(pt => console.log(pt.padEnd(22) + String(out.minutes.fast[pt]).padStart(7) + String(out.minutes.typical[pt]).padStart(9) + String(out.minutes.slow[pt]).padStart(7) + '   ' + (out.counts[pt] ? JSON.stringify(out.counts[pt]) : '')));
})();
