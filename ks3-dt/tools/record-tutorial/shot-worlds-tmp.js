const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-l2-l5-review/year-worlds');
require('fs').mkdirSync(OUT, { recursive: true });
const YEARS = [
  { id: 'j1', cls: 'Demo-8A', as: 'anya', label: 'J1 — Midnight Command (untouched)' },
  { id: 'j2', cls: 'Demo-9A', as: 'aoife', label: 'J2 — The Workbench' },
  { id: 'j3', cls: 'Demo-10A', as: 'orla', label: 'J3 — The Screening Room' }
];
(async () => {
  const b = await chromium.launch({ headless: true });
  for (const Y of YEARS) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto('http://localhost:8121/ks3-dt/platform/index.html?class=' + Y.cls + '&as=' + Y.as, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelectorAll('button.tile').length > 0, null, { timeout: 25000 });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(OUT, Y.id + '-hub.png') });
    const info = await p.evaluate(() => ({
      kit: App.kitName(), fx: (document.getElementById('fx-layer') || {}).className || 'none',
      theme: (App.state.kit.themes.find(t => t.id === (App.state.me.th || App.defaultThemeId())) || {}).name,
      rank: App.kitWord('rankWord') + ' ' + App.clearanceFor(App.state.xp).cur.level + ' — ' + App.clearanceFor(App.state.xp).cur.name
    }));
    console.log(Y.label + '  →  wardrobe "' + info.kit + '" · look "' + info.theme + '" · fx ' + info.fx + ' · ' + info.rank);
    await p.evaluate(() => App.openKit());
    await p.waitForTimeout(1200);
    await p.screenshot({ path: path.join(OUT, Y.id + '-wardrobe.png'), fullPage: true });
    await p.close();
  }
  await b.close();
  console.log('\nshots in ' + OUT);
})();
