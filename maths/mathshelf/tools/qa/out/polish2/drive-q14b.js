'use strict';
const B = require('../../lib/browser.js');
const S = require('../../lib/stage.js');
const W = require('../../lib/walk-moves.js');
const width = Number(process.argv[2] || 1280), qid = process.argv[3] || 'q14';
(async () => {
  const browser = await B.launch();
  const page = await S.openApp(browser, { width });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await S.openExercise(page, 'stats-quartiles', 2);
  const r = await page.evaluate((id) => {
    const root = [...document.querySelectorAll('[data-surface="question"]')].filter(r => r.getAttribute('data-qid') === id)[0];
    const bd = root.__statBoard;
    const att = window.__modelAttempt(id, false);
    const pts = att.S.pts;
    const out = [];
    const svg = bd.svg;
    for (const pt of pts) {
      const px = bd.toPx(Number(pt[0]), Number(pt[1]));
      const p = svg.createSVGPoint(); p.x = px[0]; p.y = px[1]; const c = p.matrixTransform(svg.getScreenCTM());
      const before = bd.points().length;
      const init = { bubbles: true, clientX: c.x, clientY: c.y, pointerId: 1, isPrimary: true, button: 0 };
      svg.dispatchEvent(new PointerEvent('pointerdown', init));
      svg.dispatchEvent(new PointerEvent('pointerup', init));
      out.push({ pt, px: px.map(v => +v.toFixed(1)), client: [+c.x.toFixed(1), +c.y.toFixed(1)], placed: bd.points().length - before, axisBack: bd.toAxis ? bd.toAxis(px[0], px[1]) : null });
    }
    return { geo: { vb: svg.getAttribute('viewBox') }, out, final: bd.points() };
  }, qid);
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
