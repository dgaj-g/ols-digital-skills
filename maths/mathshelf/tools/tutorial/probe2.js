const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const F = require('./lib/film'); const C = require('./scenes/chapters'); const sleep = F.sleep;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await F.boot(page, '?nointro'); await C.ensureFilmClass(page);
  await F.boot(page, '?class=' + encodeURIComponent(F.FILM_CLASS) + '&nointro'); await F.namePupil(page); await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(1200);
  await F.pupilIn(page);
  await page.evaluate(() => document.querySelector('.book[data-book="stats-averages"]').click()); await sleep(2000);
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[1].click()); await sleep(2000);
  await F.slowSaves(page, 3200);
  const q8 = '[data-surface="question"][data-qid="q8"]';
  await page.evaluate((s) => document.querySelector(s + ' .stat-cell').click(), q8); await sleep(300);
  for (const [v, n] of [['16', 1], ['7', 0]]) { for (const ch of v) { await page.evaluate(([s, tt]) => { const b = [...document.querySelectorAll(s + ' .numpad button')].find(b => b.textContent.trim() === tt); b.click(); }, [q8, ch]); await sleep(100); } if (n) { await page.evaluate((s) => { const b = [...document.querySelectorAll(s + ' button')].find(b => /next/.test(b.textContent)); b.click(); }, q8); await sleep(200); } }
  await page.evaluate((s) => document.querySelector(s + ' .btn-stamp').click(), q8);
  for (const t of [300, 1200, 2500, 4000, 5500]) { await sleep(t - (t > 300 ? [300,1200,2500,4000][[1200,2500,4000,5500].indexOf(t)] : 0)); console.log('t=' + t + 'ms saving line:', await page.evaluate(() => { const l = document.getElementById('act-saving'); return l ? l.textContent + ' @' + Math.round(l.getBoundingClientRect().y) : null; })); }
  console.log('marked:', await page.evaluate((s) => document.querySelector(s).getAttribute('data-state'), q8));
  await page.evaluate(() => document.getElementById('act-back').click()); await sleep(1500);
  console.log('shelf tile:', await page.evaluate(() => (document.querySelector('.book[data-book="stats-averages"]') || {}).textContent.replace(/\s+/g, ' ')));
  await browser.close();
})().catch(e => { console.error('PROBE2 FAILED', e); process.exit(1); });
