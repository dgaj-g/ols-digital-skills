const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  for (let n = 1; n <= 5; n++) {
    await p.goto('http://localhost:8121/ks3-dt/platform/prototype-inspect.html?scene=' + n, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const b = document.querySelector('.chunk-host .primary-btn'); if (b) b.click(); });
    await p.waitForSelector('.insp-zone', { timeout: 15000 });
    await p.waitForFunction(() => { const i = document.querySelector('.insp-art'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 });
    await p.waitForTimeout(600);
    const el = await p.$('.insp-stage, .insp-art');
    await el.screenshot({ path: require('path').join(__dirname,'../../../qa-l2-l5-review/j2-scenes-16aug/scene-' + n + '.png') });
    console.log('shot scene ' + n);
  }
  await b.close();
})();
