/* Regenerate assets/img/l2/rung4.png for L2's "Rung 4 — The Vanishing Heart".
   The old image showed `show string "MOVE IT!"`, which the 26 Jul audit found
   teaches an effect the device does not produce (a scrolled string clears
   itself, so the pause+clear are invisible). The rung now uses show icon,
   where deleting the pause genuinely shows the pupil nothing.
   Usage: node make-rung4-image.js */
const path = require('path');
const { chromium } = require('./node_modules/playwright');
const { MakeCode, sleep } = require('./lib/driver');

const OUT = path.join(__dirname, '..', '..', 'platform', 'assets', 'img', 'l2', 'rung4.png');
const CODE = 'input.onGesture(Gesture.Shake, function () {\n' +
  '    basic.showIcon(IconNames.Ghost)\n' +
  '    basic.pause(1000)\n' +
  '    basic.clearScreen()\n' +
  '})\n';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 2 });
  const log = (...a) => console.log('[img]', ...a);
  const drv = new MakeCode(page, log);

  await drv.openEditor();
  await sleep(4000);
  await drv.dismissDialogs();
  await drv.setProgram(CODE);      // leaves the editor on the Blocks tab
  await sleep(3500);
  await drv.dismissDialogs();

  /* the on-shake stack is the only top-level block once the default
     on-start/forever have been replaced by setProgram */
  const box = await page.evaluate(() => {
    const stacks = Array.from(document.querySelectorAll('.blocklyBlockCanvas > g.blocklyDraggable'))
      .filter(g => !g.closest('.blocklyFlyout'));
    let best = null;
    for (const g of stacks) {
      const r = g.getBoundingClientRect();
      if (r.width < 60 || r.height < 40) continue;
      if (!best || r.width * r.height > best.w * best.h) best = { x: r.x, y: r.y, w: r.width, h: r.height };
    }
    return best;
  });
  if (!box) throw new Error('no block stack found on the canvas');
  log('stack bbox', JSON.stringify(box));

  const pad = 16;
  await page.screenshot({
    path: OUT,
    clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.w + pad * 2, height: box.h + pad * 2 }
  });
  log('wrote', OUT);

  /* prove the rendered blocks say what we think they say */
  const text = await page.evaluate(() => {
    const norm = s => (s || '').replace(/[​-‍﻿ ]/g, ' ').replace(/\s+/g, ' ').trim();
    return Array.from(document.querySelectorAll('.blocklyBlockCanvas .blocklyText')).map(e => norm(e.textContent)).join(' | ');
  });
  log('block text:', text);
  const ok = /shake/i.test(text) && /pause/i.test(text) && /clear screen/i.test(text) && !/show string/i.test(text);
  console.log(ok ? 'VERIFIED: on shake + icon + pause + clear screen, no show string'
                 : 'WARNING: unexpected block text - check the image by eye');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('IMAGE BUILD FAILED:', e.message); process.exit(1); });
