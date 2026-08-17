/* probe-fx.js — does each year look ACTUALLY animate, and by how much?
   Written 17 Aug 2026 after he reported "not seeing any animation" on three of
   them. The first cut of this probe applied a J3 look on a J2 class and printed
   "NO LAYER" — the kit is sliced per year, so a look from another year is not
   in it. That was the probe being wrong, not the app; the class now follows the
   look (DFM 146a). */
const { chromium } = require('playwright');
const LOOKS = [
  ['Demo-9A','workbench'],['Demo-9A','copperline'],['Demo-9A','firewall'],
  ['Demo-10A','screeningroom'],['Demo-10A','premiere'],['Demo-10A','cuttingroom']
];
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  let cur = '';
  for (const [cls, theme] of LOOKS) {
    if (cls !== cur) {
      await p.goto('http://localhost:8096/ks3-dt/platform/index.html?class=' + cls, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(2500); cur = cls;
    }
    await p.evaluate(t => { App.state.me = App.state.me||{}; App.state.me.th = t; App.applyKit(); }, theme);
    await p.waitForTimeout(400);
    const shot = () => p.evaluate(() => {
      const l = document.getElementById('fx-layer');
      const st = document.getElementById('stars');
      if (!l) return null;
      return {
        layer: l.className,
        sky: st ? getComputedStyle(st).transform : 'none',
        kids: Array.from(l.children).map(c => {
          const cs = getComputedStyle(c);
          return { cls: c.className, op: parseFloat(cs.opacity), tf: cs.transform };
        })
      };
    });
    const a = await shot();
    if (!a) { console.log('\n=== ' + theme + ': NO LAYER ==='); continue; }
    await p.waitForTimeout(3000);
    const c = await shot();
    let moving = 0, biggest = 0;
    a.kids.forEach((k, i) => {
      const k2 = c.kids[i] || {};
      const d = Math.abs((k2.op || 0) - k.op);
      if (d > 0.05 || k.tf !== k2.tf) moving++;
      if (d > biggest) biggest = d;
    });
    console.log('\n=== ' + theme + ' (' + a.layer + ') ===');
    console.log('  ' + moving + ' of ' + a.kids.length + ' layers visibly moving in 3s' +
      ' · biggest opacity change ' + biggest.toFixed(2) +
      ' · starfield ' + (a.sky !== c.sky ? 'DRIFTING' : 'still'));
  }
  await b.close();
})();
