/* scratch: measure Exercise 3's board at a width */
'use strict';
const B = require('../../lib/browser.js');
const S = require('../../lib/stage.js');
const W = require('../../lib/walk-moves.js');
const width = Number(process.argv[2] || 375);
(async () => {
  const browser = await B.launch();
  const page = await S.openApp(browser, { width });
  const qs = await S.openExercise(page, 'stats-quartiles', 2);
  console.log('questions on screen', JSON.stringify(qs));
  const m = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('[data-surface="question"]').forEach(root => {
      const svg = root.querySelector('svg.stat-board'); if (!svg) return;
      const frame = root.querySelector('.stat-board-frame');
      const fr = frame.getBoundingClientRect();
      const axisX = [...svg.querySelectorAll('[data-axis="x"]')].map(t => {
        const r = t.getBoundingClientRect();
        const line = Number(t.getAttribute('data-line'));
        const pt = svg.createSVGPoint(); pt.x = 0; pt.y = line; const c = pt.matrixTransform(svg.getScreenCTM());
        return { text: t.textContent, top: +(r.top - c.y).toFixed(1) };
      });
      const axisY = [...svg.querySelectorAll('[data-axis="y"]')].map(t => {
        const r = t.getBoundingClientRect();
        const line = Number(t.getAttribute('data-line'));
        const pt = svg.createSVGPoint(); pt.x = line; pt.y = 0; const c = pt.matrixTransform(svg.getScreenCTM());
        return { text: t.textContent, clearLeft: +(c.x - r.right).toFixed(1), left: +(r.left - fr.left).toFixed(1) };
      });
      const yt = svg.querySelector('[data-axis-title="y"]');
      const ytr = yt ? yt.getBoundingClientRect() : null;
      const xt = svg.querySelector('[data-axis-title="x"]');
      const xtr = xt ? xt.getBoundingClientRect() : null;
      const lastX = axisX.length ? svg.querySelectorAll('[data-axis="x"]')[axisX.length-1].getBoundingClientRect() : null;
      out.push({
        qid: root.getAttribute('data-qid'), kind: root.getAttribute('data-kind'),
        svgTouch: getComputedStyle(svg).touchAction,
        hits: [...svg.querySelectorAll('[data-hit]')].map(h => getComputedStyle(h).touchAction),
        frameW: fr.width, hidden: frame.scrollWidth - frame.clientWidth, bodyW: root.querySelector('.jq-body').clientWidth,
        track: root.querySelector('.stat-scroll-track') ? !root.querySelector('.stat-scroll-track').hidden : null,
        note: root.querySelector('.stat-swipe-note') ? root.querySelector('.stat-swipe-note').textContent + ' hidden=' + root.querySelector('.stat-swipe-note').hidden : null,
        axisX, axisY, yTitle: ytr ? { left: +(ytr.left - fr.left).toFixed(1), right: +(ytr.right - fr.left).toFixed(1) } : null,
        xTitleTopVsNumbersBottom: (xtr && lastX) ? +(xtr.top - lastX.bottom).toFixed(1) : null,
        svgH: svg.getBoundingClientRect().height
      });
    });
    return out;
  });
  console.log(JSON.stringify(m, null, 1));
  await page.screenshot({ path: __dirname + '/board-' + width + '.png', fullPage: false }).catch(()=>{});
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
