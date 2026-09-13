'use strict';
const path = require('path');
const QA = path.resolve(__dirname, '../../..');
const B = require(path.join(QA, 'lib/browser.js'));
const S = require(path.join(QA, 'lib/stage.js'));
const W = require(path.join(QA, 'lib/walk-moves.js'));
const E = require(path.join(QA, 'lib/empty-elements.js'));
(async () => {
  const browser = await B.launch();
  const page = await B.newPage(browser, { width: 1280, height: 900 });
  await page.goto(S.BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await W.settle(page);
  await page.evaluate(() => document.getElementById('cover-open').click());
  await W.settle(page);
  await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, 'stats-averages');
  await W.settle(page);
  console.log('contents', JSON.stringify(await page.evaluate(s => eval(s)(), E.QUERY)));
  for (const si of [2, 3, 4]) {
    await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, si);
    await W.settle(page);
    const out = await page.evaluate(s => eval(s)(), E.QUERY);
    console.log('s' + (si + 1), JSON.stringify(out).slice(0, 600));
    await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, 'stats-averages');
    await W.settle(page);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
