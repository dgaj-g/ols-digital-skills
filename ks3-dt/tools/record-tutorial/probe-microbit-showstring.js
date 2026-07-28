/* J1 L2 blocker probe: does `show string` leave anything on the display when
   it finishes?
   L2's ladder Rung 3 teaches: "show string, THEN pause 1000, THEN clear
   screen ... without the pause, the words wipe the instant they finish."
   The 26 Jul audit claims a multi-character string SCROLLS OFF and the
   display is already blank, so pause+clear are unobservable and three
   different programs look identical. This settles it with numbers.

   The driver's own ledsOn() is unreliable here: '[class*="sim-led"]' also
   matches the dark BACKING rects (.sim-led-back), so the count barely moves
   between lit and unlit. This probe reads only the real LED rects and takes
   the opacity ATTRIBUTE (which the sim animates) as well as computed style.

   Usage: node probe-microbit-showstring.js            (headless)
          node probe-microbit-showstring.js --headed   (watch it)  */
const fs = require('fs');
const path = require('path');
const { chromium } = require('./node_modules/playwright');
const { MakeCode, sleep } = require('./lib/driver');

const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-j1-audit');
fs.mkdirSync(OUT, { recursive: true });
const HEADED = process.argv.includes('--headed');

/* --set icon : the PROPOSED replacement for Rung 3 - is the pause
   observably load-bearing when the display block is an ICON rather than a
   scrolling string? (showIcon renders and returns; we need to know how long
   the heart actually survives with and without the explicit pause.) */
const ICON_VARIANTS = [
  { id: 'E-icon-only', label: 'show icon heart only (nothing after it)',
    code: 'basic.showIcon(IconNames.Heart)\n' },
  { id: 'F-icon-pause-clear', label: 'show icon + pause 1000 + clear screen  <-- PROPOSED correct answer',
    code: 'basic.showIcon(IconNames.Heart)\nbasic.pause(1000)\nbasic.clearScreen()\n' },
  { id: 'G-icon-clear-nopause', label: 'show icon + clear screen (pause DELETED) <-- the fail state pupils must see',
    code: 'basic.showIcon(IconNames.Heart)\nbasic.clearScreen()\n' }
];

/* the exact programs L2 Rung 3 distinguishes between */
const STRING_VARIANTS = [
  { id: 'A-showstring-only', label: 'show string only (no pause, no clear)',
    code: 'basic.showString("HELLO")\n' },
  { id: 'B-taught-answer', label: 'show string + pause 1000 + clear screen  <-- what L2 teaches as CORRECT',
    code: 'basic.showString("HELLO")\nbasic.pause(1000)\nbasic.clearScreen()\n' },
  { id: 'C-no-pause', label: 'show string + clear screen  <-- what L2 says "wipes instantly"',
    code: 'basic.showString("HELLO")\nbasic.clearScreen()\n' },
  { id: 'D-single-char', label: 'show string "A" (single character) - control',
    code: 'basic.showString("A")\n' }
];

const VARIANTS = process.argv.includes('--set') && process.argv[process.argv.indexOf('--set') + 1] === 'icon'
  ? ICON_VARIANTS : STRING_VARIANTS;

const SAMPLE_MS = 100;
const RUN_MS = process.argv.includes('--set') ? 8000 : 14000;

async function readLeds(drv) {
  const f = drv.simFrame();
  if (!f) return null;
  return f.evaluate(() => {
    /* only the real LED rects - EXCLUDE .sim-led-back (the dark grid) */
    const all = Array.from(document.querySelectorAll('.sim-led'));
    const leds = all.filter(l => !/sim-led-back/.test(l.getAttribute('class') || ''));
    let lit = 0;
    let sum = 0;
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

  const results = [];

  for (const v of VARIANTS) {
    log('=== ' + v.id + ' : ' + v.label);
    await drv.setProgram(v.code);
    await sleep(1500);

    /* restart the simulator so the program runs from the top */
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
    if (!series.length) { log('NO SIMULATOR FRAME - aborting'); break; }

    const ledCount = series[0].n;
    const peak = Math.max(...series.map(s => s.lit));
    const firstLit = series.find(s => s.lit > 0);
    const lastLit = [...series].reverse().find(s => s.lit > 0);
    /* "settled" = the final 3 seconds, well after any scroll has finished */
    const tail = series.filter(s => s.t > RUN_MS - 3000);
    const tailMaxLit = Math.max(...tail.map(s => s.lit));
    const tailMaxBright = Math.max(...tail.map(s => s.b));

    const litSamples = series.filter(s => s.lit > 0).length;
    const litMs = litSamples * SAMPLE_MS;
    const verdict = tailMaxLit === 0
      ? 'DISPLAY ENDS BLANK'
      : 'DISPLAY STILL SHOWING (' + tailMaxLit + ' LEDs)';

    log('  led rects found      :', ledCount, ledCount === 25 ? '(correct - 5x5)' : '(UNEXPECTED)');
    log('  peak LEDs lit        :', peak, peak > 0 ? '(text did render)' : '(NOTHING EVER LIT - probe broken?)');
    log('  first lit at         :', firstLit ? firstLit.t + 'ms' : 'never');
    log('  last lit at          :', lastLit ? lastLit.t + 'ms' : 'never');
    log('  final 3s: max lit    :', tailMaxLit, '| max brightness', tailMaxBright);
    log('  total time lit       : ~' + litMs + 'ms');
    log('  VERDICT              :', verdict);

    await page.screenshot({ path: path.join(OUT, 'microbit-' + v.id + '-end.png') });
    results.push({ id: v.id, label: v.label, ledCount, peak, litMs,
      firstLitMs: firstLit ? firstLit.t : null, lastLitMs: lastLit ? lastLit.t : null,
      tailMaxLit, tailMaxBright, verdict, series });
  }

  fs.writeFileSync(path.join(OUT, 'microbit-showstring-results.json'), JSON.stringify(results, null, 1));

  console.log('\n================ SUMMARY ================');
  for (const r of results) {
    console.log(r.id.padEnd(22), '| peak lit', String(r.peak).padStart(2),
      '| lit for ~' + String(r.litMs).padStart(5) + 'ms',
      '| last lit', String(r.lastLitMs).padStart(6) + 'ms',
      '|', r.verdict);
  }
  const a = results.find(r => r.id === 'A-showstring-only');
  const b = results.find(r => r.id === 'B-taught-answer');
  const c = results.find(r => r.id === 'C-no-pause');
  const d = results.find(r => r.id === 'D-single-char');
  if (a && b && c) {
    const identical = a.tailMaxLit === 0 && b.tailMaxLit === 0 && c.tailMaxLit === 0;
    console.log('\nA, B and C all end blank?  ', identical ? 'YES - the three programs are indistinguishable' : 'NO - they differ');
    console.log('So the pause+clear are     ', identical ? 'UNOBSERVABLE (audit blocker CONFIRMED)' : 'observable (audit blocker NOT confirmed)');
  }
  if (d) console.log('Single character "A"       ', d.tailMaxLit > 0 ? 'STAYS on the display (' + d.tailMaxLit + ' LEDs) - persists, unlike a scrolled string' : 'also ends blank');
  const f2 = results.find(r => r.id === 'F-icon-pause-clear');
  const g2 = results.find(r => r.id === 'G-icon-clear-nopause');
  if (f2 && g2) {
    const diff = f2.litMs - g2.litMs;
    console.log('\nICON PROPOSAL: with pause the heart is lit ~' + f2.litMs + 'ms; with the pause DELETED ~' + g2.litMs + 'ms.');
    console.log('Difference: ~' + diff + 'ms - ' + (diff >= 600 ? 'CLEARLY VISIBLE to a pupil. The pause is genuinely load-bearing.' : 'TOO SMALL - this replacement would have the same flaw.'));
  }
  console.log('\nScreenshots + raw series in', OUT);

  await browser.close();
})().catch(e => { console.error('PROBE FAILED:', e.message); process.exit(1); });
