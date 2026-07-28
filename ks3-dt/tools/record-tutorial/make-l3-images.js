/* Regenerate assets/img/l3/rung1..3.png and stretch.png for L3's Scoreboard
   Ladder. Audit blocker B-08: the block never taught the `forever` loop, so
   L3's ladder now builds the scoreboard's DISPLAY inside a forever loop rather
   than inside the two button events. The rung cards show the finished blocks,
   so every one of those four images is now wrong until it is rebuilt from the
   real editor.

   Unlike make-rung4-image.js, these programs have MORE THAN ONE top-level stack
   (the loop and the events are deliberately separate), so the shot is the union
   bounding box of every stack on the canvas, not the largest one.

   Usage: node make-l3-images.js            (all four)
          node make-l3-images.js rung2      (just one)  */
const path = require('path');
const { chromium } = require('./node_modules/playwright');
const { MakeCode, sleep } = require('./lib/driver');

const DIR = path.join(__dirname, '..', '..', 'platform', 'assets', 'img', 'l3');

const SHOTS = [
  {
    name: 'rung1',
    code: 'let score = 0\n' +
      'input.onButtonPressed(Button.A, function () {\n    score = 1\n})\n' +
      'basic.forever(function () {\n    basic.showNumber(score)\n})\n',
    must: ['forever', 'show', 'number', 'on button', 'A', 'set', 'score', 'to'],
    mustNot: ['change']
  },
  {
    name: 'rung2',
    code: 'let score = 0\n' +
      'input.onButtonPressed(Button.A, function () {\n    score += 1\n})\n' +
      'basic.forever(function () {\n    basic.showNumber(score)\n})\n',
    must: ['forever', 'show', 'number', 'on button', 'A', 'change', 'score', 'by'],
    mustNot: ['set']
  },
  {
    name: 'rung3',
    code: 'let score = 0\n' +
      'input.onButtonPressed(Button.A, function () {\n    score += 1\n})\n' +
      'input.onButtonPressed(Button.B, function () {\n    score = 0\n})\n' +
      'basic.forever(function () {\n    basic.showNumber(score)\n})\n',
    must: ['forever', 'show', 'number', 'on button', 'A', 'B', 'change', 'by', 'set', 'to'],
    mustNot: []
  },
  {
    name: 'stretch',
    code: 'let highScore = 0\nlet score = 0\n' +
      'input.onButtonPressed(Button.A, function () {\n    score += 1\n})\n' +
      'input.onButtonPressed(Button.B, function () {\n    score = 0\n})\n' +
      'input.onGesture(Gesture.Shake, function () {\n    if (score > highScore) {\n        highScore = score\n    }\n})\n' +
      'basic.forever(function () {\n    basic.showNumber(score)\n    basic.pause(1000)\n    basic.showString("H")\n    basic.showNumber(highScore)\n    basic.pause(1000)\n})\n',
    must: ['forever', 'shake', 'highScore', 'if', 'then', 'pause (ms)', 'show', 'string', 'H'],
    mustNot: []
  }
];

const only = process.argv[2];
const wanted = only ? SHOTS.filter(s => s.name === only) : SHOTS;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
  const log = (...a) => console.log('[img]', ...a);
  const drv = new MakeCode(page, log);

  await drv.openEditor();
  await sleep(4000);
  await drv.dismissDialogs();

  let allOk = true;
  for (const shot of wanted) {
    log('=== ' + shot.name);
    await drv.setProgram(shot.code);
    await sleep(3500);
    await drv.dismissDialogs();

    /* union of EVERY top-level stack - these programs have two or three */
    const box = await page.evaluate(() => {
      const stacks = Array.from(document.querySelectorAll('.blocklyBlockCanvas > g.blocklyDraggable'))
        .filter(g => !g.closest('.blocklyFlyout'));
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
      for (const g of stacks) {
        const r = g.getBoundingClientRect();
        if (r.width < 60 || r.height < 30) continue;
        n++;
        x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
        x1 = Math.max(x1, r.x + r.width); y1 = Math.max(y1, r.y + r.height);
      }
      return n ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0, stacks: n } : null;
    });
    if (!box) { console.error('  NO STACKS FOUND for ' + shot.name); allOk = false; continue; }
    log('  ' + box.stacks + ' stack(s), bbox ' + Math.round(box.w) + 'x' + Math.round(box.h));

    const pad = 18;
    const out = path.join(DIR, shot.name + '.png');
    await page.screenshot({
      path: out,
      clip: {
        x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
        width: Math.min(box.w + pad * 2, 1500 - Math.max(0, box.x - pad)),
        height: Math.min(box.h + pad * 2, 1000 - Math.max(0, box.y - pad))
      }
    });

    /* prove the rendered blocks say what the rung card claims they say */
    const text = await page.evaluate(() => {
      const norm = s => (s || '').replace(/[​-‍﻿ ]/g, ' ').replace(/\s+/g, ' ').trim();
      return Array.from(document.querySelectorAll('.blocklyBlockCanvas .blocklyText')).map(e => norm(e.textContent)).join(' | ');
    });
    log('  block text: ' + text);
    /* MakeCode renders each block FIELD as its own .blocklyText node, so the
       joined text is not reading-order ("on button | A | pressed"). Assert on
       tokens present, never on contiguous phrases - the same trap the L4/L5
       video pipeline hit with scratch-blocks. */
    const tokens = text.split('|').map(t => t.trim().toLowerCase());
    const has = t => tokens.indexOf(String(t).toLowerCase()) !== -1;
    const missing = shot.must.filter(t => !has(t));
    const forbidden = shot.mustNot.filter(t => has(t));
    if (missing.length || forbidden.length) {
      allOk = false;
      console.error('  VERIFY FAILED - missing ' + missing + ' | forbidden present ' + forbidden);
    } else {
      log('  VERIFIED + wrote ' + out);
    }
  }

  await browser.close();
  console.log(allOk ? '\nALL L3 IMAGES REBUILT AND VERIFIED' : '\nSOME L3 IMAGES FAILED VERIFICATION');
  process.exit(allOk ? 0 : 1);
})().catch(e => { console.error('IMAGE BUILD FAILED:', e.message); process.exit(1); });
