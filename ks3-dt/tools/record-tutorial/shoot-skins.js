const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, '../../../qa-l2-l5-review/j2j3-skins-17aug');
require('fs').mkdirSync(OUT, { recursive: true });
const LOOKS = [
  ['j2','Demo-9A','workbench'],['j2','Demo-9A','copperline'],['j2','Demo-9A','firewall'],
  ['j3','Demo-10A','screeningroom'],['j3','Demo-10A','premiere'],['j3','Demo-10A','cuttingroom']
];
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  for (const [yr, cls, id] of LOOKS) {
    await p.goto('http://localhost:8096/ks3-dt/platform/index.html?class=' + cls, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    await p.evaluate((themeId) => {
      App.state.me = App.state.me || {}; App.state.me.th = themeId; App.applyKit();
    }, id);
    await p.waitForTimeout(3500);   // let the slow cycles get somewhere visible
    await p.screenshot({ path: path.join(OUT, yr + '-' + id + '.png') });
    console.log('shot ' + id);
  }
  await b.close();
})();
