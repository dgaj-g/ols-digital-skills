/* J1 L3 probe for audit blocker B-08: the block never teaches the `forever`
 * loop, but L4's Case 03 requires one and L4's brief calls it revision.
 *
 * Damien's decision: teach it in LESSON 3 - "a scoreboard that continuously
 * checks is the natural home for a loop". L3's hour is already exactly 60
 * minutes (57 of chunks + the auto-inserted 3-minute Do-Now), so the loop has
 * to be taught at ZERO extra cost. The proposal is to move the scoreboard's
 * DISPLAY out of the button handlers and into a forever loop in Rung 1, which
 * REMOVES a block from rungs 2 and 3 rather than adding one.
 *
 * That only works if three claims are true on the real device. This measures
 * all three in the MakeCode simulator rather than asserting them:
 *
 *  1. A brand-new MakeCode project already contains an EMPTY `forever` block,
 *     so the pupil drops one block into it rather than dragging two.
 *  2. `forever { show number score }` lights the display with NO button press -
 *     the observable proof that a loop runs on its own.
 *  3. Deleting the forever leaves the display DARK even when the score changes -
 *     a genuine, stark fail state, which is what this ladder promises.
 *
 * It also checks the rally's real hazard: `show number` on a TWO-DIGIT score
 * scrolls off (same defect class as L2's blocker), and whether the loop is what
 * brings it back.
 *
 * Usage: node probe-microbit-forever.js            (headless)
 *        node probe-microbit-forever.js --headed   (watch it)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('./node_modules/playwright');
const { MakeCode, sleep } = require('./lib/driver');

const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-j1-audit');
fs.mkdirSync(OUT, { recursive: true });
const HEADED = process.argv.includes('--headed');
const SAMPLE_MS = 100;
const RUN_MS = 9000;

/* Each variant is the FULL program, exactly as a pupil's blocks would compile.
   `score` starts at 0, so nothing here needs a button press to be measurable -
   which is the whole point of claim 2. */
const VARIANTS = [
  {
    id: '1-proposed-rung1',
    label: 'PROPOSED Rung 1: forever { show number score } + on button A { set score to 1 }',
    code: 'let score = 0\ninput.onButtonPressed(Button.A, function () {\n    score = 1\n})\nbasic.forever(function () {\n    basic.showNumber(score)\n})\n',
    expect: 'LIT with no press'
  },
  {
    id: '2-forever-deleted',
    label: 'THE FAIL STATE: forever DELETED, display block gone with it',
    code: 'let score = 0\ninput.onButtonPressed(Button.A, function () {\n    score = 1\n})\n',
    expect: 'DARK'
  },
  {
    id: '3-current-build',
    label: 'CURRENT build: show number INSIDE the button handler (nothing runs until a press)',
    code: 'let score = 0\ninput.onButtonPressed(Button.A, function () {\n    score = 1\n    basic.showNumber(score)\n})\n',
    expect: 'DARK until pressed'
  },
  {
    id: '4-twodigit-in-handler',
    label: 'THE RALLY HAZARD: show number 10 inside a handler (fires once, then scrolls away)',
    code: 'let score = 10\nbasic.showNumber(score)\n',
    expect: 'scrolls then DARK'
  },
  {
    id: '5-twodigit-in-forever',
    label: 'THE RALLY FIX: forever { show number 10 } - the scrolled number keeps coming back',
    code: 'let score = 10\nbasic.forever(function () {\n    basic.showNumber(score)\n})\n',
    expect: 'never settles dark'
  }
];

async function readLeds(drv) {
  const f = drv.simFrame();
  if (!f) return null;
  return f.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.sim-led'));
    const leds = all.filter(l => !/sim-led-back/.test(l.getAttribute('class') || ''));
    let lit = 0, sum = 0;
    for (const l of leds) {
      const attr = parseFloat(l.getAttribute('opacity'));
      const comp = parseFloat(getComputedStyle(l).opacity || '0');
      const op = Number.isFinite(attr) ? attr : comp;
      sum += op;
      if (op > 0.25) lit++;
    }
    return { count: leds.length, lit: lit, brightness: Math.round(sum * 100) / 100 };
  }).catch(() => null);
}

(async () => {
  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const log = (...a) => console.log('[probe]', ...a);
  const drv = new MakeCode(page, log);

  await drv.openEditor();
  await sleep(4000);
  await drv.dismissDialogs();

  /* ---- CLAIM 1: what does a brand-new project already contain? ---- */
  log('=== CLAIM 1: the default new-project canvas ===');
  const startBlocks = await page.evaluate(() => {
    const txt = Array.from(document.querySelectorAll('.blocklyText')).map(t => t.textContent);
    return { joined: txt.join(' | ').slice(0, 400), hasForever: txt.some(t => /forever/i.test(t)),
      hasOnStart: txt.some(t => /on start/i.test(t)) };
  });
  log('  canvas text     :', startBlocks.joined);
  log('  has `forever`   :', startBlocks.hasForever);
  log('  has `on start`  :', startBlocks.hasOnStart);
  await page.screenshot({ path: path.join(OUT, 'forever-00-default-canvas.png') });

  const results = [{ id: '0-default-canvas', label: 'default new project', defaultForever: startBlocks.hasForever,
    defaultOnStart: startBlocks.hasOnStart, canvasText: startBlocks.joined }];

  for (const v of VARIANTS) {
    log('=== ' + v.id + ' : ' + v.label);
    await drv.setProgram(v.code);
    await sleep(1500);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('[role="button"], button'))
        .find(e => /restart/i.test(e.getAttribute('aria-label') || e.title || ''));
      if (b) b.click();
    });
    await sleep(800);

    const series = [];
    const t0 = Date.now();
    while (Date.now() - t0 < RUN_MS) {
      const r = await readLeds(drv);
      if (r) series.push({ t: Date.now() - t0, lit: r.lit, b: r.brightness, n: r.count });
      await sleep(SAMPLE_MS);
    }
    if (!series.length) { log('  NO SIMULATOR FRAME - aborting'); break; }

    const ledCount = series[0].n;
    const peak = Math.max(...series.map(s => s.lit));
    const firstLit = series.find(s => s.lit > 0);
    const tail = series.filter(s => s.t > RUN_MS - 3000);
    const tailMaxLit = Math.max(...tail.map(s => s.lit));
    const litSamples = series.filter(s => s.lit > 0).length;
    const litPct = Math.round((litSamples / series.length) * 100);
    const verdict = peak === 0 ? 'NEVER LIT (display stays dark)'
      : (tailMaxLit === 0 ? 'lit then ENDS BLANK' : 'STILL SHOWING (' + tailMaxLit + ' LEDs)');

    log('  led rects        :', ledCount, ledCount === 25 ? '(correct 5x5)' : '(UNEXPECTED)');
    log('  peak LEDs lit    :', peak);
    log('  first lit at     :', firstLit ? firstLit.t + 'ms' : 'never');
    log('  lit for          :', litPct + '% of the run');
    log('  final 3s max lit :', tailMaxLit);
    log('  VERDICT          :', verdict, '(expected: ' + v.expect + ')');

    await page.screenshot({ path: path.join(OUT, 'forever-' + v.id + '-end.png') });
    results.push({ id: v.id, label: v.label, expect: v.expect, ledCount, peak, litPct,
      firstLitMs: firstLit ? firstLit.t : null, tailMaxLit, verdict });
  }

  fs.writeFileSync(path.join(OUT, 'microbit-forever-results.json'), JSON.stringify(results, null, 1));

  console.log('\n================ SUMMARY ================');
  for (const r of results.slice(1)) {
    console.log(r.id.padEnd(24), '| peak', String(r.peak).padStart(2),
      '| lit', String(r.litPct).padStart(3) + '%',
      '| final3s', String(r.tailMaxLit).padStart(2), '|', r.verdict);
  }
  const p1 = results.find(r => r.id === '1-proposed-rung1');
  const p2 = results.find(r => r.id === '2-forever-deleted');
  const p3 = results.find(r => r.id === '3-current-build');
  const p4 = results.find(r => r.id === '4-twodigit-in-handler');
  const p5 = results.find(r => r.id === '5-twodigit-in-forever');
  console.log('\nCLAIM 1 - a new project already has an empty forever block :',
    results[0].defaultForever ? 'TRUE' : 'FALSE');
  console.log('CLAIM 2 - forever lights the display with NO button press  :',
    (p1 && p1.peak > 0 && p1.tailMaxLit > 0) ? 'TRUE (peak ' + p1.peak + ', still lit at the end)' : 'FALSE');
  console.log('CLAIM 3 - deleting the forever leaves it DARK              :',
    (p2 && p2.peak === 0) ? 'TRUE (never lit)' : 'FALSE');
  console.log('    (control: the CURRENT build is also dark until pressed :',
    (p3 && p3.peak === 0) ? 'dark, as expected)' : 'UNEXPECTEDLY LIT - check the probe)');
  console.log('RALLY - a two-digit score in a handler ends blank          :',
    (p4 && p4.peak > 0 && p4.tailMaxLit === 0) ? 'TRUE (scrolls away)' : 'NOT REPRODUCED');
  console.log('RALLY - the same score inside forever keeps coming back    :',
    (p5 && p5.litPct > (p4 ? p4.litPct : 100)) ? 'TRUE (lit ' + p5.litPct + '% vs ' + p4.litPct + '%)' : 'NOT SHOWN');
  await browser.close();
})();
