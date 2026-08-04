/* Regenerate Lesson 2's rung pictures after Damien's 4 Aug reshape (DFM 152c).
 *
 * Rung 2 stopped being "button A -> heart" (the film's own task, which is what
 * he spotted: "Why is rung 2 the exact same task that they've already done as a
 * pair while working through the video tutorial/teacher demo?"), and rung 3
 * became the shake/ghost rung. So:
 *
 *   ghost-icon.png  the GHOST ICON on its own, cropped from the real simulator.
 *                   His item 5: "I really don't know which one it is myself
 *                   without hovering over and waiting for the wee pop up to
 *                   tell me!" It goes ON rung 3's card so she can find it in
 *                   the dropdown - identifying a symbol is not the answer.
 *   rung3.png       the finished on-shake + show icon blocks, for the paid hint.
 *
 * Both are captured from real MakeCode rather than drawn, so the ghost is the
 * actual pattern the device lights and not my memory of it (rule 35).
 *
 *   node make-l2-rung23-images.js
 */
const path = require('path');
const { chromium } = require('./node_modules/playwright');
const { MakeCode, sleep } = require('./lib/driver');

const IMG = path.join(__dirname, '..', '..', 'platform', 'assets', 'img', 'l2');
const CODE = 'input.onGesture(Gesture.Shake, function () {\n' +
  '    basic.showIcon(IconNames.Ghost)\n' +
  '})\n';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 2 });
  const log = (...a) => console.log('[img]', ...a);
  const drv = new MakeCode(page, log);

  await drv.openEditor();
  await sleep(4000);
  await drv.dismissDialogs();
  await drv.setProgram(CODE);
  await sleep(4000);
  await drv.dismissDialogs();

  /* ---------- 1. the finished blocks, for the hint ---------- */
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
  const pad = 16;
  await page.screenshot({
    path: path.join(IMG, 'rung3.png'),
    clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.w + pad * 2, height: box.h + pad * 2 }
  });
  log('wrote rung3.png (the on-shake blocks)');

  const blockText = await page.evaluate(() => {
    const norm = s => (s || '').replace(/[\u200b-\u200d\ufeff\u00a0]/g, ' ').replace(/\s+/g, ' ').trim();
    return Array.from(document.querySelectorAll('.blocklyBlockCanvas .blocklyText')).map(e => norm(e.textContent)).join(' | ');
  });

  /* ---------- 2. the ghost icon itself, off the simulator's LED grid ----------
     Rather than trying to fake a shake gesture in the simulator, just run a
     program that draws the ghost the moment it starts. The LEDs light the same
     pattern either way, and this needs no gesture plumbing. */
  await drv.setProgram('basic.showIcon(IconNames.Ghost)\n');
  await sleep(4000);
  await drv.dismissDialogs();
  await sleep(1500);

  /* The simulator lives in a cross-origin IFRAME, so the LED grid is not
     reachable from the top document - that is why a page-level selector found
     nothing. Playwright can screenshot an element inside the frame directly and
     works out the page coordinates itself. */
  const simFrame = page.frames().find(f => /---simulator/.test(f.url()));
  if (!simFrame) throw new Error('no simulator frame found');
  const lit = await simFrame.evaluate(() => {
    const leds = document.querySelectorAll('.sim-led');
    return { total: leds.length, on: Array.from(leds).filter(l => Number(getComputedStyle(l).opacity) > 0.4).length };
  });
  log('LEDs: ' + lit.on + ' lit of ' + lit.total);
  /* boundingBox() is page-relative even for an element inside a frame, so pad
     it and clip at page level - a bare element screenshot cropped the outer
     LEDs in half and made the ghost unreadable. */
  /* measure the LEDs themselves: .sim-display is a backing rect that does not
     line up with the 5x5 grid, so cropping to it sliced the outer LEDs in half
     and caught the yellow board edge underneath. */
  const ledLoc = simFrame.locator('.sim-led');
  const count = await ledLoc.count();
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (let i = 0; i < count; i++) {
    const b = await ledLoc.nth(i).boundingBox();
    if (!b) continue;
    x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
    x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
  }
  if (!isFinite(x1)) throw new Error('could not measure the LED grid');
  const dbox = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  const pad2 = Math.round(dbox.width * 0.035);
  await page.screenshot({
    path: path.join(IMG, 'ghost-icon.png'),
    clip: { x: dbox.x - pad2, y: dbox.y - pad2, width: dbox.width + pad2 * 2, height: dbox.height + pad2 * 2 }
  });
  log('wrote ghost-icon.png (' + Math.round(dbox.width) + 'x' + Math.round(dbox.height) + ' + ' + pad2 + 'px pad)');

  log('block text:', blockText);
  const blocksOk = /shake/i.test(blockText) && /show icon/i.test(blockText) &&
    !/pause/i.test(blockText) && !/button/i.test(blockText);
  /* a ghost lights most of the grid; a blank or half-drawn frame would not.
     This is the guard against shipping a picture of an icon that is not there. */
  const ghostOk = lit.total === 25 && lit.on >= 14 && lit.on <= 24;
  console.log(blocksOk ? 'VERIFIED blocks: on shake + show icon only (no pause, no button)'
                       : 'WARNING: unexpected block text - check by eye before shipping');
  console.log(ghostOk ? 'VERIFIED ghost: ' + lit.on + ' of 25 LEDs lit'
                      : 'WARNING: ' + lit.on + ' of ' + lit.total + ' LEDs lit - that is not a ghost');
  await browser.close();
  process.exit(blocksOk && ghostOk ? 0 : 1);
})().catch(e => { console.error('IMAGE BUILD FAILED:', e.message); process.exit(1); });
