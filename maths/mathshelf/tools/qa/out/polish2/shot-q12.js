'use strict';
const B = require('../../lib/browser.js');
const S = require('../../lib/stage.js');
const W = require('../../lib/walk-moves.js');
const width = Number(process.argv[2] || 375);
(async () => {
  const browser = await B.launch();
  const page = await S.openApp(browser, { width });
  await S.openExercise(page, 'stats-quartiles', 2);
  /* place two points so the instruction names the third, then tap once more at the end */
  await page.evaluate((s2, args) => eval(s2)(args), W.ANSWER, ['q12', false, 'selected']);
  await W.settle(page);
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-surface="question"]')].filter(r => r.getAttribute('data-qid') === 'q12')[0];
    root.querySelector('.stage-strip').scrollIntoView();
    const frame = root.querySelector('.stat-board-frame');
    frame.scrollLeft = 40;
    return { top: root.querySelector('.stage-strip').getBoundingClientRect().top + window.scrollY, dock: root.querySelector('[data-surface="dock"]').getBoundingClientRect().bottom + window.scrollY, fb: frame.getBoundingClientRect().bottom + window.scrollY };
  });
  await page.screenshot({ path: __dirname + '/q12-head-' + width + '.png', clip: { x: 0, y: r.top - 10, width, height: 420 } });
  await page.screenshot({ path: __dirname + '/q12-tail-' + width + '.png', clip: { x: 0, y: r.fb - 160, width, height: (r.dock - r.fb) + 190 } });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
