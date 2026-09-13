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
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[2].click()); await sleep(2000);
  const q = '[data-surface="question"][data-qid="q17"]';
  console.log('before scroll:', await page.evaluate((s) => { const r = document.querySelector(s); return { roots: document.querySelectorAll(s).length, strips: [...r.querySelectorAll('.stage-strip')].map(e => { const b = e.getBoundingClientRect(); return { y: Math.round(b.y), h: Math.round(b.height), disp: getComputedStyle(e).display, text: e.textContent.trim().slice(0, 40) }; }), rootY: Math.round(r.getBoundingClientRect().y), scrollY: window.scrollY, docH: document.documentElement.scrollHeight }; }, q));
  await F.scrollIntoFrame(page, q, null, 'start');
  console.log('after toQuestion:', await page.evaluate((s) => { const r = document.querySelector(s); const e = r.querySelector('.stage-strip'); const b = e.getBoundingClientRect(); return { rootY: Math.round(r.getBoundingClientRect().y), stripY: Math.round(b.y), h: Math.round(b.height), scrollY: window.scrollY }; }, q));
  await F.scrollIntoFrame(page, q + ' .stage-strip', null, 'center');
  console.log('after centring strip:', await page.evaluate((s) => { const e = document.querySelector(s + ' .stage-strip'); const b = e.getBoundingClientRect(); return { stripY: Math.round(b.y), scrollY: window.scrollY }; }, q));
  await browser.close();
})().catch(e => { console.error('PROBE3 FAILED', e); process.exit(1); });
