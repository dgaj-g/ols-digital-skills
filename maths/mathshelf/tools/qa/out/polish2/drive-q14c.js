'use strict';
const B = require('../../lib/browser.js');
const S = require('../../lib/stage.js');
const width = Number(process.argv[2] || 1280), qid = process.argv[3] || 'q14';
(async () => {
  const browser = await B.launch();
  const page = await S.openApp(browser, { width });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => console.log('CONSOLE', m.text()));
  await S.openExercise(page, 'stats-quartiles', 2);
  const r = await page.evaluate((id) => {
    const root = [...document.querySelectorAll('[data-surface="question"]')].filter(r => r.getAttribute('data-qid') === id)[0];
    const bd = root.__statBoard; const svg = bd.svg;
    const press = (x, y) => {
      const px = bd.toPx(x, y); const p = svg.createSVGPoint(); p.x = px[0]; p.y = px[1]; const c = p.matrixTransform(svg.getScreenCTM());
      const init = { bubbles: true, clientX: c.x, clientY: c.y, pointerId: 1, isPrimary: true, button: 0 };
      const before = bd.points().length;
      svg.dispatchEvent(new PointerEvent('pointerdown', init)); svg.dispatchEvent(new PointerEvent('pointerup', init));
      return bd.points().length - before;
    };
    const log = [];
    log.push(['(0,0) first', press(0, 0)]);
    log.push(['(0,0) second', press(0, 0)]);
    log.push(['(100,4)', press(100, 4)]);
    log.push(['(0,0) third', press(0, 0)]);
    log.push(['(0,20)', press(0, 20)]);
    log.push(['(20,0)', press(20, 0)]);
    return { log, pts: bd.points(), state: root.getAttribute('data-state'), stage: root.getAttribute('data-stage') };
  }, qid);
  console.log(JSON.stringify(r));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
