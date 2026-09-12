/* my own eyes on Book A's boards: element screenshots of every question at two widths */
const path = require('path');
const QA = path.resolve(__dirname, '..', '..');
const B = require(path.join(QA, 'lib/browser.js'));
const S = require(path.join(QA, 'lib/stage.js'));
const W = require(path.join(QA, 'lib/walk-moves.js'));
const fs = require('fs');
const OUT = path.join(__dirname, 'eyes'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await B.launch();
  for (const width of [375, 1280]) {
    const page = await S.openApp(browser, { width });
    await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, 'stats-collect');
    await W.settle(page);
    const n = await page.evaluate(s => eval(s)(), W.ACTIONS.sectionCount);
    for (let si = 0; si < n; si++) {
      await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, si);
      await W.settle(page);
      const qids = await page.evaluate(s => eval(s)(), W.QUESTIONS_ON_SCREEN);
      for (const qid of qids) {
        const wanted = process.argv.slice(2);
        if (wanted.length && wanted.indexOf(qid) < 0) continue;
        const el = await page.$('#jq-' + qid);
        if (!el) continue;
        await el.screenshot({ path: path.join(OUT, qid + '-' + width + '-fresh.png') });
        /* play the model attempt up to the end, screenshot again */
        try {
          const r = await page.evaluate((s, q) => eval(s)(q, false, null), W.ANSWER, qid);
          await W.settle(page); await new Promise(r2 => setTimeout(r2, 1000));
          await el.screenshot({ path: path.join(OUT, qid + '-' + width + '-answered.png') });
          fs.appendFileSync(path.join(OUT, 'log.txt'), width + ' ' + qid + ' ' + JSON.stringify(r) + '\n');
        } catch (e) { fs.appendFileSync(path.join(OUT, 'log.txt'), width + ' ' + qid + ' ERR ' + e.message + '\n'); }
      }
    }
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
