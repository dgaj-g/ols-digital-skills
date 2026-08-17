/* qa-fx-motion.js — AN AMBIENT EFFECT MUST BE PERCEPTIBLE, MEASURED IN A BROWSER.
 *
 * HIS FINDING, 17 Aug 2026, on the deployed build: "i'm not seeing any
 * animation on the j3 cutting room. not seeing any animation from j2 copper
 * line or firewall but the workbench looks much better."
 *
 * Every one of those looks WAS animating. `qa-year-worlds` proved it from the
 * source — the keyframes existed, the classes existed, every look declared an
 * effect — and all of that was true while three of the six were, to his eye,
 * completely still. The wash moved from 0.55 to 0.58 opacity in three seconds.
 * The copper blooms moved 0.02. Technically animated; humanly static.
 *
 * THE LESSON, and it is DFM 146(b) in its own words: what is promised VISUALLY
 * is verified VISUALLY, in pixels. A source check can prove an animation is
 * DECLARED. Only a running browser can prove it is SEEN. This gate measures
 * what actually changes on screen over three seconds and fails a look that a
 * pupil would call still — which is the only definition of "animated" that
 * matters, because it is his.
 *
 * It is also the answer to the over-correction: his K21 ruling killed the
 * travelling lines for being too loud, and the fix went so far the other way
 * that the motion disappeared. Gentle is a range, not a direction, and this
 * gate holds the quiet end of it.
 *
 *   node qa-fx-motion.js               (needs the dev server on :8096)
 *   node qa-fx-motion.js --controls    (+ the too-subtle timings must FAIL)
 */
const { chromium } = require('playwright');

const BASE = process.env.KS3DT_BASE || 'http://localhost:8096';
const FAILS = [];
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) FAILS.push(m); };
const ctrl = (ok, m) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + m); if (!ok) FAILS.push('CONTROL: ' + m); };

/* the class follows the look: the kit is sliced per year, so a J3 look asked
   for on a J2 class is simply not in the wardrobe (the first cut of this probe
   reported "no layer" and the app was fine — DFM 146a) */
const LOOKS = [
  ['Demo-9A', 'workbench'], ['Demo-9A', 'copperline'], ['Demo-9A', 'firewall'],
  ['Demo-10A', 'screeningroom'], ['Demo-10A', 'premiere'], ['Demo-10A', 'cuttingroom']
];
/* THE FLOORS. Chosen from the measured difference between the build he called
   still and the build he could see: the still one peaked at 0.02-0.03 opacity
   change with one layer moving; the visible one peaks above 0.6 with several.
   The floors sit well above the first and well below the second, so they catch
   "he cannot see it" without dictating taste. */
/* WHAT TO MEASURE, and it took two wrong attempts to get right.
   Particles fade in and out by design in EVERY version, so their opacity swing
   is large whether or not the look reads as animated — measuring them said the
   broken build was fine. What he was actually seeing (and not seeing) is the
   BIG LIGHT: the wash, the blooms, the veil, the sheen, the beam, the forge
   glow — the areas that fill the screen. Those moved 0.02-0.07 in three seconds
   on the build he called still, and above 0.2 on the one he could see. So the
   floor is on the light, and the particles are checked for presence, not swing. */
const LIGHT = /fx-(wash|bloom|veil|sheen|beam|house|forge|flash|marquee)/;
const MIN_LIGHT_SWING = 0.15;   // the largest opacity change among the light layers
const MIN_PARTICLES = 1;        // and at least one particle actually travelling

const WINDOW_MS = 3000;
/* SETTLE FIRST. Measuring from the moment the layer mounts catches every
   particle's initial fade-in, which is a transient every effect has — the
   too-subtle build scored just as well on it as the visible one, so the gate
   was measuring the wrong thing. A pupil is not watching the first second of a
   costume change; she is looking at a page that has been open a while. So the
   effects are left to settle and then watched, which is the state she is in. */
const SETTLE_MS = 8000;

async function measure(page, cls, theme, cur) {
  if (cls !== cur.v) {
    await page.goto(BASE + '/ks3-dt/platform/index.html?class=' + cls, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    cur.v = cls;
  }
  await page.evaluate(t => { App.state.me = App.state.me || {}; App.state.me.th = t; App.applyKit(); }, theme);
  await page.waitForTimeout(SETTLE_MS);
  const shot = () => page.evaluate(() => {
    const l = document.getElementById('fx-layer');
    const st = document.getElementById('stars');
    if (!l) return null;
    return {
      sky: st ? getComputedStyle(st).transform : 'none',
      kids: Array.from(l.children).map(c => {
        const cs = getComputedStyle(c);
        return { cls: c.className, op: parseFloat(cs.opacity), tf: cs.transform };
      })
    };
  });
  const a = await shot();
  if (!a) return null;
  await page.waitForTimeout(WINDOW_MS);
  const b = await shot();
  let lightSwing = 0, particles = 0, moving = 0;
  a.kids.forEach((k, i) => {
    const k2 = b.kids[i] || {};
    const d = Math.abs((k2.op == null ? 0 : k2.op) - k.op);
    const shifted = k.tf !== k2.tf;
    if (d > 0.05 || shifted) moving++;
    if (LIGHT.test(k.cls)) { if (d > lightSwing) lightSwing = d; }
    else if (shifted) particles++;
  });
  return { moving, total: a.kids.length, lightSwing, particles, drifting: a.sky !== b.sky };
}

(async () => {
  console.log('qa-fx-motion — an ambient effect must be SEEN, not merely declared');
  console.log('  base: ' + BASE + '  ·  settle ' + (SETTLE_MS / 1000) + 's then watch ' +
    (WINDOW_MS / 1000) + 's  ·  floors: light shift ' + MIN_LIGHT_SWING + ', ' +
    MIN_PARTICLES + ' travelling particle\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const cur = { v: '' };

  for (const [cls, theme] of LOOKS) {
    const m = await measure(page, cls, theme, cur);
    if (!m) { check(false, theme + ': no fx layer rendered at all'); continue; }
    const ok = m.lightSwing >= MIN_LIGHT_SWING && m.particles >= MIN_PARTICLES;
    check(ok, theme + ': the light shifts ' + m.lightSwing.toFixed(2) + ' in ' + (WINDOW_MS / 1000) +
      's and ' + m.particles + ' particle(s) are travelling (' + m.moving + ' of ' + m.total +
      ' layers in motion)' + (ok ? '' : '  — a pupil would call this still'));
    check(m.drifting, theme + ': and the starfield is drifting behind it');
  }

  if (process.argv.includes('--controls')) {
    console.log('\n== CONTROL — the timings he could not see must FAIL this gate ==');
    /* NAVIGATE FIRST, then inject. The first cut injected the old rules and then
       called measure(), which navigated because the previous look was on the
       other year's class — and a navigation throws the injected stylesheet away,
       so the control measured the FIXED build and reported it as the broken one. */
    await page.goto(BASE + '/ks3-dt/platform/index.html?class=Demo-9A', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    cur.v = 'Demo-9A';
    await page.evaluate(() => { App.state.me = App.state.me || {}; App.state.me.th = 'copperline'; App.applyKit(); });
    await page.waitForTimeout(300);
    /* the ACTUAL pre-fix rules, restored in full — durations, delays and the
       keyframes themselves. The first cut of this control changed only the
       durations and the gate stayed green, because a particle left on the new
       fast keyframe still swings hard whatever its cycle length. A control that
       does not reproduce the reported state proves nothing (DFM 189's lesson:
       assert that the gate under test actually fired). */
    await page.addStyleTag({
      content: `.fx-wash { animation: oldWash 19s ease-in-out infinite alternate !important; }
        @keyframes oldWash { from { opacity: 0.55; transform: scale(1); } to { opacity: 1; transform: scale(1.08); } }
        .fx-copperglow .fx-bloom.b1 { animation: oldBloom 23s ease-in-out infinite alternate !important; }
        .fx-copperglow .fx-bloom.b2 { animation: oldBloom 29s ease-in-out infinite alternate-reverse 4s !important; }
        @keyframes oldBloom { from { opacity: 0.4; transform: scale(0.94); } to { opacity: 0.9; transform: scale(1.1); } }
        @keyframes oldDrift {
          0% { transform: translate3d(0,0,0); opacity: 0; }
          20% { opacity: 0.6; } 70% { opacity: 0.35; }
          100% { transform: translate3d(-3vw,-46vh,0); opacity: 0; } }
        .fx-glint.m1 { animation: oldDrift 34s ease-in-out infinite 0s !important; }
        .fx-glint.m2 { animation: oldDrift 41s ease-in-out infinite 5.5s !important; }
        .fx-glint.m3 { animation: oldDrift 37s ease-in-out infinite 11s !important; }
        .fx-glint.m4 { animation: oldDrift 45s ease-in-out infinite 3s !important; }
        .fx-glint.m5 { animation: oldDrift 32s ease-in-out infinite 16s !important; }
        .fx-glint.m6 { animation: oldDrift 39s ease-in-out infinite 8.5s !important; }
        .fx-glint.m7 { animation: oldDrift 43s ease-in-out infinite 13.5s !important; }
        #stars.is-drifting { animation: oldSky 42s ease-in-out infinite alternate !important; }
        @keyframes oldSky { from { transform: translate3d(-0.6vw,0.4vh,0) scale(1.015); }
                            to { transform: translate3d(0.7vw,-0.5vh,0) scale(1.035); } }`
    });
    /* restart every animation so the restored timings begin from zero rather
       than continuing at whatever phase the fast ones had already reached */
    await page.evaluate(() => {
      const l = document.getElementById('fx-layer');
      if (l) { const c = l.className; l.className = ''; void l.offsetWidth; l.className = c; }
    });
    await page.waitForTimeout(500);
    const m = await measure(page, 'Demo-9A', 'copperline', cur);
    ctrl(m.lightSwing < MIN_LIGHT_SWING,
      'with the 19s/23s/29s timings restored, the light shifts only ' +
      m.lightSwing.toFixed(2) + ' in 3s — under the ' + MIN_LIGHT_SWING +
      ' floor, which is the build he could not see any animation in');
  }

  await browser.close();
  console.log('');
  if (FAILS.length) {
    console.log('qa-fx-motion: ' + FAILS.length + ' FAILURE(S)');
    FAILS.forEach(f => console.log('   ' + f));
    process.exit(1);
  }
  console.log('qa-fx-motion: ALL GREEN — every year look is visibly, gently in motion.');
})();
