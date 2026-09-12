const path = require('path'); const QA = path.resolve(__dirname, '..', '..');
const B = require(path.join(QA, 'lib/browser.js')); const S = require(path.join(QA, 'lib/stage.js')); const W = require(path.join(QA, 'lib/walk-moves.js'));
(async () => {
  const browser = await B.launch();
  const page = await S.openApp(browser, { width: 1280 });
  await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, 'stats-collect'); await W.settle(page);
  await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, 3); await W.settle(page);
  const r = await page.evaluate(() => {
    const st = document.querySelector('.movie-stage'); const p = window.GJ_PLAYER || null;
    const btn = [...document.querySelectorAll('button')].filter(b => /next step/i.test(b.getAttribute('aria-label') || b.textContent))[0];
    return { hasStage: !!st, next: !!btn };
  });
  console.log(r);
  for (let i = 0; i < 40; i++) {
    const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].filter(b => /next step/i.test(b.getAttribute('aria-label') || '')).filter(b => !b.disabled)[0]; if (b) { b.click(); return true; } return false; });
    await new Promise(r2 => setTimeout(r2, 2500));
    const done = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].filter(b => /next step/i.test(b.getAttribute('aria-label') || ''))[0]; return !b || b.disabled; });
    if (done && !clicked) break;
  }
  const out = await page.evaluate(() => {
    const st = document.querySelector('.movie-stage');
    return { lines: st.querySelectorAll('.movie-line').length, ticks: st.querySelectorAll('.mark-tick').length,
      tickBoxes: [...st.querySelectorAll('.mark-tick')].map(t => { const b = t.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height), getComputedStyle(t).display, getComputedStyle(t).visibility, getComputedStyle(t).opacity]; }),
      lineTexts: [...st.querySelectorAll('.movie-line')].map(l => l.textContent.slice(0, 40)) };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
