const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1180, height: 1400 }, deviceScaleFactor: 1 });
  p.on('console', m => { if (m.type()==='error') console.log('ERR', m.text()); });
  const fails = [];
  p.on('requestfailed', r => fails.push(r.url()));
  await p.goto('file://' + process.argv[2], { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  // every <img> must have real intrinsic pixels — a broken src renders as nothing
  const imgs = await p.evaluate(() => [...document.querySelectorAll('img')]
    .map(i => ({ src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight })));
  const dead = imgs.filter(i => !i.w);
  console.log(`images=${imgs.length} dead=${dead.length}`, dead.slice(0,4));
  if (fails.length) console.log('requests failed:', fails.slice(0,5));
  await p.screenshot({ path: process.argv[3], fullPage: false });
  await p.evaluate(() => window.scrollTo(0, 700));
  await p.waitForTimeout(400);
  await p.screenshot({ path: process.argv[4] });
  await b.close();
})();
