'use strict';
const path = require('path');
const QA = path.resolve(__dirname, '../../..');
const B = require(path.join(QA, 'lib/browser.js'));
const S = require(path.join(QA, 'lib/stage.js'));
const W = require(path.join(QA, 'lib/walk-moves.js'));
(async () => {
  const browser = await B.launch();
  const width = Number(process.argv[2] || 375);
  const secs = (process.argv[3] || '0,1,2,3,4').split(',').map(Number);
  const page = await B.newPage(browser, { width, height: 900 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(S.BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await W.settle(page);
  await page.evaluate(() => document.getElementById('cover-open').click());
  await W.settle(page);
  for (const si of secs) {
    const o = await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, 'stats-averages');
    await W.settle(page);
    await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, si);
    await W.settle(page);
    const qids = await page.evaluate(s => eval(s)(), W.QUESTIONS_ON_SCREEN);
    console.log('s' + (si + 1), JSON.stringify(qids));
    for (const qid of qids) {
      const info = await page.evaluate((qid) => {
        const r = document.querySelector('[data-qid="' + qid + '"]');
        if (!r) return null;
        r.scrollIntoView();
        const rect = r.getBoundingClientRect();
        const over = [...r.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && getComputedStyle(e).visibility !== 'hidden').map(e => e.className).slice(0, 5);
        return { kind: r.getAttribute('data-kind'), stages: r.getAttribute('data-stages'), h: Math.round(rect.height), overflow: over, swipe: !!(r.querySelector('.stat-table-note') && !r.querySelector('.stat-table-note').hidden) };
      }, qid);
      console.log('  ', qid, JSON.stringify(info));
      await page.screenshot({ path: path.join(__dirname, 'shot-' + width + '-s' + (si + 1) + '-' + qid + '.png') });
    }
  }
  console.log('errors', JSON.stringify(errs));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
