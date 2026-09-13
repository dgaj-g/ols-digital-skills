'use strict';
const path = require('path');
const QA = path.resolve(__dirname, '../../..');
const B = require(path.join(QA, 'lib/browser.js'));
const S = require(path.join(QA, 'lib/stage.js'));
const W = require(path.join(QA, 'lib/walk-moves.js'));
(async () => {
  const browser = await B.launch();
  const page = await B.newPage(browser, { width: 375, height: 900 });
  await page.goto(S.BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await W.settle(page);
  await page.evaluate(() => document.getElementById('cover-open').click());
  await W.settle(page);
  await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, 'stats-averages');
  await W.settle(page);
  await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, 3);
  await W.settle(page);
  const m = await page.evaluate(() => ['q22', 'q23'].map((qid) => {
    const r = document.querySelector('[data-qid="' + qid + '"]');
    const host = r.querySelector('.stat-table-host'), t = r.querySelector('table');
    const cols = [...t.querMuerySelectorAll ? [] : t.querySelectorAll('thead th')].map(th => th.textContent + ':' + Math.round(th.getBoundingClientRect().width));
    return { qid, host: Math.round(host.clientWidth), table: Math.round(t.getBoundingClientRect().width), scroll: host.scrollWidth, cols, body: Math.round(r.querySelector('.stat-boards').clientWidth) };
  }));
  console.log(JSON.stringify(m, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
