'use strict';
const path = require('path');
const QA = path.resolve(__dirname, '../../..');
const B = require(path.join(QA, 'lib/browser.js'));
const S = require(path.join(QA, 'lib/stage.js'));
const W = require(path.join(QA, 'lib/walk-moves.js'));
(async () => {
  const browser = await B.launch();
  const page = await B.newPage(browser, { width: 1280, height: 900 });
  await page.goto(S.BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await W.settle(page);
  await page.evaluate(() => document.getElementById('cover-open').click());
  await W.settle(page);
  await page.screenshot({ path: path.join(__dirname, 'shelf-1280.png') });
  const o = await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, 'stats-averages');
  await W.settle(page);
  await page.screenshot({ path: path.join(__dirname, 'contents-1280.png') });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
