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
  const decl = await page.evaluate((s, id) => eval(s)(id), W.STAGES_OF, qid);
  console.log('declared', JSON.stringify(decl));
  for (const stg of (decl.stages || [])) {
    const a = await page.evaluate((s2, args) => eval(s2)(args), W.ANSWER, [qid, false, stg]);
    const b = await page.evaluate((s2, id) => eval(s2)(id), W.BEAT_OF, qid);
    console.log('stage', stg, '->', JSON.stringify(a), '\n   lines', JSON.stringify(b.lines), 'touch', JSON.stringify(b.touch && { hidden: b.touch.hidden, hits: b.touch.hits, n: b.touch.hitCount, note: b.touch.noteShown, axis: b.touch.axisClear }));
    await W.settle(page);
    const now = await page.evaluate((s2, id) => eval(s2)(id), W.STAGES_OF, qid);
    console.log('   now', now.stage);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
