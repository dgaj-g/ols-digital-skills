#!/usr/bin/env node
/* qa-film-laws.js — DFM 201a/b, from his 13 Aug Lesson 4 sit.
 *
 * HIS FINDINGS: a caption clipped by the bottom of the frame ("Down the left side
 * live all the blocks Scratch knows,"), the pointer resting on the words "the
 * whole", and the definition of SCRIPTS nowhere to be seen — all three of which
 * he had been told would not happen again.
 *
 * The real-take control lives in the recorder (`KS3DT_FILM_LAWS=report node
 * lib/record.js …`), and it reproduced all three against the build he sat. But a
 * control that needs scratch.mit.edu and ten minutes is a control nobody runs.
 * THIS file proves the same two laws deterministically, on a blank page, in
 * seconds — so they are checked on every scoped run from now on, and so the
 * geometry that produced his clipped caption can never quietly come back.
 *
 * Each law is proved BOTH WAYS: 'report' mode (no fitting, no parking) must
 * reproduce the fault, and 'enforce' mode must resolve it.
 *
 *   node qa-film-laws.js
 */
const { chromium } = require('playwright');
const { Cinema } = require('./lib/cinema');

const findings = [];
const results = [];
function check(pass, label, detail) {
  results.push({ pass, label, detail });
  if (!pass) findings.push(label + (detail ? ' — ' + detail : ''));
  console.log((pass ? '  PASS  ' : '  FAIL  ') + label + (detail ? '\n           ' + detail : ''));
}

/* the three anchors that actually broke on him, measured from the real editor
   in the 13 Aug control run (film-law-control-PREFIX-77d194e-l4.txt) */
const ANCHORS = {
  codeArea: { x: 81, y: 87, w: 668, h: 627, side: 'below',
    text: 'The middle is the <b>CODE AREA</b>. These stacks of blocks are the Shark’s <b>SCRIPTS</b> &mdash; its instructions. Every sprite carries its own.' },
  palette: { x: -3, y: 97, w: 69, h: 567, side: 'below',
    text: 'Down the left side live all the blocks Scratch knows, sorted into colour groups. You drag them in &mdash; you never type code.' },
  stage: { x: 646, y: 60, w: 634, h: 418, side: 'below',
    text: 'This side is the <b>STAGE</b> &mdash; where the game actually plays. The green flag starts the game; the red sign stops it.' },
  sprites: { x: 786, y: 458, w: 410, h: 266, side: 'above',
    text: 'These little pictures are the game’s <b>SPRITES</b> &mdash; one for each character or thing. This game has a Shark and a Fish.' }
};
const MAP_CAPTION = 'Sprites, scripts, the stage &mdash; that is the whole map. <b>Now read some code.</b>';

async function withPage(mode, fn) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.setContent('<body style="margin:0;background:#20304a;height:100vh"></body>');
  const cine = new Cinema(page, () => {});
  cine.lawMode = mode;                     // override the env for this pass
  await cine.install();
  await cine.ensureCursor(640, 430);
  try { return await fn(page, cine); }
  finally { await ctx.close(); await browser.close(); }
}
const rectOf = (page, sel) => page.evaluate((s) => {
  const n = document.querySelector(s);
  if (!n) return null;
  const r = n.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
}, sel);
/* the pill is the only fixed div carrying the gold border at its z-index; find it
   by its tag, which every drawn text surface sets */
const textRects = (page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('[data-cine-text]')).map(n => {
    const r = n.getBoundingClientRect();
    return { text: (n.textContent || '').trim().slice(0, 40), left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }));

(async () => {
  console.log('FILM LAWS — proved both ways on a blank 1280x720 frame (DFM 201a/b)\n');

  /* ---------- LAW A1: IN-FRAME ---------- */
  console.log('A1 IN-FRAME — the three anchors that clipped on his screen:');
  for (const [name, a] of Object.entries(ANCHORS)) {
    const reported = await withPage('report', async (page, cine) => {
      await cine.callout({ x: a.x, y: a.y, w: a.w, h: a.h }, a.text, { side: a.side, hold: 1 });
      return cine.violations.slice();
    });
    const enforced = await withPage('enforce', async (page, cine) => {
      await cine.callout({ x: a.x, y: a.y, w: a.w, h: a.h }, a.text, { side: a.side, hold: 1 });
      return { violations: cine.violations.slice(), rects: await textRects(page) };
    });
    const wasOut = reported.some(v => v.law === 'IN-FRAME' || v.law === 'ANCHOR-OFF-FRAME');
    check(wasOut, `report mode reproduces the ${name} fault`,
      wasOut ? reported.map(v => v.law + ' ' + JSON.stringify(v.rect)).join(' · ') : 'nothing reported');
    check(enforced.violations.length === 0, `enforce mode draws the ${name} callout legally`,
      enforced.violations.length ? JSON.stringify(enforced.violations[0]) : 'no violations');
  }

  /* the convergence case: a pill whose width depends on how much room it has.
     Shrink-to-fit made this oscillate (644px at left 636, 654px at left 626)
     and it took two enforced takes to see it. It is a permanent control now. */
  const conv = await withPage('enforce', async (page, cine) => {
    await cine.callout({ x: 1100, y: 300, w: 170, h: 60 },
      'A long label anchored hard against the right edge of the frame, long enough that it must wrap more than once to fit inside the picture at all.',
      { side: 'below', hold: 1 });
    return { violations: cine.violations.slice(), rects: await textRects(page) };
  });
  const inFrame = conv.rects.every(r => r.left >= 9 && r.top >= 9 && r.right <= 1271 && r.bottom <= 711);
  check(conv.violations.length === 0 && inFrame,
    'a right-edge pill converges instead of oscillating (the shrink-to-fit trap)',
    JSON.stringify(conv.rects[0]));

  /* ---------- LAW A2: THE CURSOR ---------- */
  console.log('\nA2 CURSOR-ON-TEXT — his exact frame ("that is the whole map"):');
  const capReport = await withPage('report', async (page, cine) => {
    await cine.ensureCursor(834, 624);           // where ch1 really left it
    await cine.captionShow(MAP_CAPTION);
    return cine.violations.slice();
  });
  check(capReport.some(v => v.law === 'CURSOR-ON-TEXT'),
    'report mode reproduces the pointer sitting on the caption',
    capReport.length ? JSON.stringify(capReport[0].cursor) + ' inside ' + JSON.stringify(capReport[0].rect) : 'nothing reported');

  const capEnforce = await withPage('enforce', async (page, cine) => {
    await cine.ensureCursor(834, 624);
    await cine.captionShow(MAP_CAPTION);
    const hit = await page.evaluate(() => window.__cine.cursorClear());
    return { violations: cine.violations.slice(), hit, cursor: [cine.cx, cine.cy] };
  });
  check(!capEnforce.hit, 'enforce mode parks the pointer clear of the caption',
    'cursor parked at ' + JSON.stringify(capEnforce.cursor));

  /* the same law on a CALLOUT PILL — the ch2 instance he predicted ("this issue
     repeats in other parts of the video"), which the old law also could not see */
  const pillReport = await withPage('report', async (page, cine) => {
    await cine.ensureCursor(700, 430);
    await cine.callout({ x: 140, y: 340, w: 640, h: 60 },
      'A <b>HAT BLOCK</b>. It names the trigger: WHEN this happens, run everything below', { side: 'below', hold: 1 });
    return cine.violations.slice();
  });
  check(pillReport.some(v => v.law === 'CURSOR-ON-TEXT'),
    'report mode reproduces the pointer sitting on a callout pill (his ch2 instance)',
    pillReport.filter(v => v.law === 'CURSOR-ON-TEXT').map(v => JSON.stringify(v.cursor)).join(''));

  const pillEnforce = await withPage('enforce', async (page, cine) => {
    await cine.ensureCursor(700, 430);
    await cine.callout({ x: 140, y: 340, w: 640, h: 60 },
      'A <b>HAT BLOCK</b>. It names the trigger: WHEN this happens, run everything below', { side: 'below', hold: 1 });
    return cine.violations.slice();
  });
  check(pillEnforce.length === 0, 'enforce mode parks the pointer clear of a callout pill',
    pillEnforce.length ? JSON.stringify(pillEnforce[0]) : 'no violations');

  /* ---------- the over-tightening guard ---------- */
  console.log('\nGUARD — a legal beat must not be reported:');
  const legal = await withPage('enforce', async (page, cine) => {
    await cine.ensureCursor(120, 120);
    await cine.callout({ x: 400, y: 200, w: 300, h: 80 }, 'A short, well-placed label', { side: 'below', hold: 1 });
    await cine.captionShow('An ordinary caption in the lower third of the frame.');
    return cine.violations.slice();
  });
  check(legal.length === 0, 'an ordinary callout + caption raises nothing',
    legal.length ? JSON.stringify(legal[0]) : 'silent');

  console.log('');
  if (findings.length) {
    console.log('qa-film-laws: ' + findings.length + ' FAILURE(S)');
    findings.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
    process.exit(1);
  }
  console.log('qa-film-laws: ALL PASSED (' + results.length + ' checks, each proved both ways)');
})().catch(e => { console.error('qa-film-laws CRASHED: ' + e.message); process.exit(1); });
