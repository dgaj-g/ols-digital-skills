/* AUDIT PROBE (26 Jul 2026): does J1 L2's Rung 4 behave as the lesson claims?
   The lesson teaches: on shake -> show string "MOVE IT!" -> pause 1000 -> clear
   screen, and asserts "without the pause, the words wipe the instant they
   finish". If basic.showString() scrolls the text fully OFF the display, the
   screen is already blank when the pause starts, so pause and clear screen are
   both unobservable and all three variants look identical.
   This runs the three variants in the REAL MakeCode simulator and samples how
   many LEDs are lit over time. */
const { chromium } = require('./node_modules/playwright');
const { MakeCode } = require('./lib/driver');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const VARIANTS = {
  'A_as_taught': `input.onGesture(Gesture.Shake, function () {\n    basic.showString("MOVE IT!")\n    basic.pause(1000)\n    basic.clearScreen()\n})\n`,
  'B_no_pause': `input.onGesture(Gesture.Shake, function () {\n    basic.showString("MOVE IT!")\n    basic.clearScreen()\n})\n`,
  'C_no_clear': `input.onGesture(Gesture.Shake, function () {\n    basic.showString("MOVE IT!")\n    basic.pause(1000)\n})\n`,
  'D_icon_variant': `input.onGesture(Gesture.Shake, function () {\n    basic.showIcon(IconNames.Happy)\n    basic.pause(1000)\n    basic.clearScreen()\n})\n`,
  'E_icon_no_pause': `input.onGesture(Gesture.Shake, function () {\n    basic.showIcon(IconNames.Happy)\n    basic.clearScreen()\n})\n`,
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const mc = new MakeCode(page, console.log);
  await mc.openEditor();
  console.log('editor open');

  const results = {};
  for (const [name, code] of Object.entries(VARIANTS)) {
    await mc.setProgram(code);
    await sleep(3500);
    // fire the shake gesture in the simulator
    const fired = await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('iframe')).find(i => /simulator/.test(i.src));
      return !!f;
    });
    const frame = mc.simFrame();
    if (!frame) { console.log(name, 'NO SIM FRAME'); continue; }
    // the simulator exposes a shake button in the board chrome
    const shook = await frame.evaluate(() => {
      const cands = Array.from(document.querySelectorAll('[aria-label], .sim-button, .sim-shake, [class*="shake"]'));
      const b = cands.find(e => /shake/i.test((e.getAttribute('aria-label') || '') + ' ' + (e.className && e.className.baseVal ? e.className.baseVal : e.className || '')));
      if (b) { b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); b.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); b.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }
      return false;
    }).catch(() => false);
    const samples = [];
    const t0 = Date.now();
    const readLeds = async () => frame.evaluate(() => {
      // MakeCode sim LEDs: <rect class="sim-led"> with a per-LED opacity that
      // is ~0 when off and rises toward 1 with brightness. Read the ATTRIBUTE
      // (computed style reports the CSS default, not the animated value).
      const leds = Array.from(document.querySelectorAll('rect.sim-led'));
      if (!leds.length) return { n: -1, tot: 0 };
      let on = 0, tot = 0;
      for (const l of leds) {
        const o = parseFloat(l.style.opacity || l.getAttribute('opacity') || '0');
        tot += isNaN(o) ? 0 : o;
        if (o > 0.15) on++;
      }
      return { n: on, tot: Math.round(tot * 100) / 100, count: leds.length };
    }).catch(() => ({ n: -2, tot: 0 }));
    for (let i = 0; i < 100; i++) {           // ~10 s at 100 ms
      const r = await readLeds();
      samples.push([Date.now() - t0, r.n, r.tot]);
      await sleep(100);
    }
    const lit = samples.filter(s => s[1] > 0);
    results[name] = {
      shookViaButton: shook,
      ledElements: (samples[0] || [])[3],
      firstLitMs: lit.length ? lit[0][0] : null,
      lastLitMs: lit.length ? lit[lit.length - 1][0] : null,
      maxLeds: Math.max(...samples.map(s => s[1])),
      litSamples: lit.length,
      trace: samples.map(s => s[1]).join(''),
    };
    console.log(name, JSON.stringify(results[name]));
  }
  console.log('\n==== SUMMARY ====');
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})().catch(e => { console.error('PROBE CRASH', e.message); process.exit(2); });
