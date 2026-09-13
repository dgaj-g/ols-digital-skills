const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const F = require('./lib/film'); const sleep = F.sleep;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await F.boot(page, '?nointro'); await F.staffIn(page);
  await page.evaluate((nm) => { const rows = [...document.querySelectorAll('#st-rows tr')]; const r = rows.find(tr => tr.textContent.indexOf(nm) > -1); [...r.querySelectorAll('button')].find(b => /Open the markbook/.test(b.textContent)).click(); }, F.PRACTICE_CLASS); await sleep(2800);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.cp-books .toolbtn')].find(b => /Averages/.test(b.textContent)); b.click(); }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.excard').click()); await sleep(2500);
  await page.evaluate(() => document.querySelector('.grid.staff-panel td.cell').click()); await sleep(2800);
  const sized = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].slice(0, 3).map(n => { const r = n.getBoundingClientRect(); return { cls: n.className.toString().slice(0, 40), y: Math.round(r.y + window.scrollY), h: Math.round(r.height), w: Math.round(r.width), t: (n.textContent || '').trim().slice(0, 30) }; }), sel);
  for (const s of ['.jotter .q-marks', '.jotter .wl-mark', '.jotter [data-mark]', '.jotter .jq-margin', '.jotter .mk-tally', '.jp-reteach', '.jotter .ink', '.jotter .ic-tick', '.jotter .jq-feedback', '.jotter .posture, .jp-posture', '.jotter .ui-msg']) console.log(s, JSON.stringify(await sized(s)));
  await page.evaluate(() => { const m = document.querySelector('.jotter [data-mark]'); if (m) m.click(); }); await sleep(800);
  console.log('after tapping a mark: ic-tick', JSON.stringify(await sized('.jotter .ic-tick')), 'ink', JSON.stringify(await sized('.jotter .ink')));
  await page.screenshot({ path: 'out/recon/bookview.png' });
  await browser.close();
})().catch(e => { console.error('PROBE5 FAILED', e); process.exit(1); });
