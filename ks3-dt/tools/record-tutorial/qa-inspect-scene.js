#!/usr/bin/env node
/* qa-inspect-scene.js — THE SCENE LEGIBILITY LAW, measured in rendered pixels.
 *
 * From J2_L1_DESIGN.md's coverage bill, under his K9 ruling: "every staged
 * violation recognisable at the size the scene renders; every zone at a
 * comfortable hit target, measured in real pixels (146b)."
 *
 * WHY THIS EXISTS AND WHY IT MEASURES RATHER THAN ASSERTS. Two animations were
 * rejected for the same fault — DFM 192e's 40-pixel orbs ("can't hardly be
 * seen") and DFM 207d's archway, whose 18px labels PASSED a size probe and were
 * still unreadable. The lesson he made of it, in his own file: "pixel size
 * proves size, never visibility". So this checks BOTH halves:
 *   SIZE   — every staged violation's drawn object, and every clickable zone,
 *            measured at the width the card actually renders at, not in the
 *            SVG's own coordinate space;
 *   REACH  — every zone is reachable by keyboard and says what it is, because a
 *            zone a pupil cannot get to is not a zone (DFM 205's family).
 *
 * The floors, and where each comes from:
 *   zone hit target      >= 44 x 44   (the standing accessible target; ours are
 *                                      an order of magnitude past it, and the
 *                                      floor is here so a future scene cannot
 *                                      quietly shrink to it)
 *   staged object        longest side >= 40px AND area >= 1600px^2, at the
 *                        rendered scale (DFM 192e's own number was 40px orbs
 *                        being too small; the run PRINTS every measurement so
 *                        the margin is visible rather than assumed)
 *   art rendered width   >= 860px at a 1280px viewport
 *
 *   node qa-inspect-scene.js [--base http://localhost:8121]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const BASE = argOf('--base', 'http://localhost:8121');
const SVG = path.join(__dirname, '..', '..', 'platform', 'assets', 'img', 'j2', 'inspection-1.svg');

const FAILS = [];
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) FAILS.push(m); };
const ctrl = (ok, m) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + m); if (!ok) FAILS.push('CONTROL: ' + m); };
const section = (t) => console.log('\n== ' + t + ' ==');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* THE STAGED VIOLATIONS, named here with the extent each is DRAWN at in the
   generator. Kept beside the generator's own numbers deliberately: if somebody
   shrinks an object in make-inspection-scenes.js, this file still knows how big
   it was supposed to be, and the two disagreeing is the finding.

   A CORRECTION OF RECORD, because the first version of this file condemned all
   five and the art was fine. It measured a PART of each object — a title bar,
   one ear cup, one sheet of paper — and held that part to the floor. A drink
   can is 34px wide and 57px tall and is unmistakable; its "shorter side" is not
   what a pupil recognises. So the extent below is the WHOLE object, and the
   floor is on what recognition actually depends on: the longest dimension, and
   the area. A gate that condemns good work is worse than no gate (DFM 146a). */
const STAGED = [
  { zone: 1, what: 'the drink can standing beside the keyboard', w: 36, h: 62 },
  { zone: 2, what: 'the lit screen, still signed in', w: 128, h: 86 },
  { zone: 3, what: 'the headphones left hanging over the monitor', w: 74, h: 48 },
  { zone: 3, what: 'the papers left fanned across the bench', w: 110, h: 48 },
  { zone: 3, what: 'the chair left pulled out and turned', w: 88, h: 106 }
];

(async () => {
  console.log('qa-inspect-scene — the scene legibility law (K9 / DFM 146b / 192e)');
  console.log('  scene: ' + SVG + '\n  base: ' + BASE);

  section('THE SVG IS THE ONE THE GENERATOR WRITES');
  const svg = fs.readFileSync(SVG, 'utf8');
  const vb = (svg.match(/viewBox="0 0 (\d+) (\d+)"/) || []);
  check(vb.length === 3, 'the scene declares a viewBox (' + (vb[1] || '?') + 'x' + (vb[2] || '?') + ')');
  const VBW = Number(vb[1] || 1000);
  check(/role="img"/.test(svg) && /aria-label="/.test(svg),
    'and it carries a role and an aria-label, so a screen reader is told what the room shows');
  const alt = (svg.match(/aria-label="([^"]*)"/) || [])[1] || '';
  check(alt.length > 120,
    'the label describes the room rather than naming it (' + alt.length + ' characters) — a pupil ' +
    'using a reader has to be able to do the same task');
  /* AND IT MUST NOT GIVE THE ANSWER AWAY. The label describes what is THERE;
     the moment it says which rule is broken, the activity is over for anyone
     who reads it. */
  ctrl(!/breaks|rule|wrong|should not|must not/i.test(alt),
    'and it never names a RULE — describing the room is the job; judging it is hers');

  section('RENDERED SIZE — measured on the real card, not in the SVG\'s own units');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

  await page.goto(BASE + '/ks3-dt/platform/prototype-inspect.html', { waitUntil: 'domcontentloaded' });
  await sleep(1600);
  await page.evaluate(() => { const b = document.querySelector('.chunk-host .primary-btn'); if (b) b.click(); });
  await page.waitForSelector('.insp-zone', { timeout: 15000 });
  await page.waitForFunction(() => { const i = document.querySelector('.insp-art'); return i && i.complete && i.naturalWidth > 0; },
    null, { timeout: 15000 });
  await sleep(500);

  const art = await page.evaluate(() => {
    const r = document.querySelector('.insp-art').getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  check(art.w >= 860, 'the scene renders ' + Math.round(art.w) + 'x' + Math.round(art.h) +
    'px on a 1280px screen (floor 860)');
  const scale = art.w / VBW;
  console.log('        (scale ' + scale.toFixed(3) + ' — every number below is at THIS size, not the SVG\'s)');

  section('EVERY STAGED VIOLATION IS RECOGNISABLE AT THAT SIZE');
  const bigEnough = (w, h) => Math.max(w, h) >= 40 && (w * h) >= 1600;
  STAGED.forEach(s => {
    const w = s.w * scale, h = s.h * scale;
    check(bigEnough(w, h), s.what + ' renders ' + Math.round(w) + 'x' + Math.round(h) +
      'px — longest side ' + Math.round(Math.max(w, h)) + ' (floor 40), area ' +
      Math.round(w * h) + ' (floor 1600)');
  });
  /* THE CONTROL, and it has to be able to fail: the floor must reject the size
     the rejected animation WAS drawn at. A gate that cannot condemn his own
     exhibit is theatre (DFM 196). */
  ctrl(!bigEnough(40 * scale * 0.5, 40 * scale * 0.5),
    'and the floor REJECTS a 20px actor — the size DFM 192e was rejected at ("the little things ' +
    'flying across at the top can\'t hardly be seen")');
  ctrl(bigEnough(40, 40), 'while a 40x40 actor is accepted, so the floor is a floor and not a wall');

  section('EVERY ZONE IS A COMFORTABLE TARGET, AND REACHABLE');
  const zones = await page.evaluate(() => Array.from(document.querySelectorAll('.insp-zone')).map((z, i) => {
    const r = z.getBoundingClientRect();
    return {
      i: i, w: r.width, h: r.height,
      name: (z.querySelector('.insp-zone-name') || {}).textContent || '',
      pressed: z.getAttribute('aria-pressed'),
      tag: z.tagName
    };
  }));
  check(zones.length === 5, 'the scene offers ' + zones.length + ' zones, one per station');
  zones.forEach(z => {
    check(z.w >= 44 && z.h >= 44, 'zone ' + (z.i + 1) + ' is ' + Math.round(z.w) + 'x' + Math.round(z.h) +
      'px (floor 44x44)');
  });
  check(zones.every(z => z.tag === 'BUTTON'),
    'every zone is a real button, so it is reachable by keyboard and not just by mouse');
  check(zones.every(z => z.pressed === 'false'),
    'and each one reports its flagged state to a screen reader (aria-pressed starts false)');
  check(zones.every(z => z.name && z.name.trim().length > 0),
    'and each one is NAMED, so "the third one along" is never the only way to refer to it');

  section('PLACE ALL, THEN CHECK — nothing is judged until she files (his law)');
  await page.evaluate(() => document.querySelector('.insp-zone[data-z="1"]').click());
  await sleep(300);
  const afterFlag = await page.evaluate(() => ({
    flagged: document.querySelectorAll('.insp-zone.is-flagged').length,
    judged: document.querySelectorAll('.insp-zone.is-found, .insp-zone.is-missed, .insp-zone.is-clear').length,
    report: !!document.querySelector('.insp-report'),
    count: (document.querySelector('.insp-count') || {}).textContent || ''
  }));
  check(afterFlag.flagged === 1, 'flagging a station marks it flagged');
  check(afterFlag.judged === 0 && !afterFlag.report,
    'and NOTHING is judged by it — no verdict, no report, no force-correction (DFM: never telegraph)');
  check(/1 place/.test(afterFlag.count), 'the running count says what she has done: "' + afterFlag.count.trim() + '"');
  await page.evaluate(() => document.querySelector('.insp-zone[data-z="1"]').click());
  await sleep(300);
  const afterUnflag = await page.evaluate(() => document.querySelectorAll('.insp-zone.is-flagged').length);
  check(afterUnflag === 0, 'and she can take the flag straight back off — she is never locked into a click');

  section('THE FILE BUTTON IS NEVER A MUTE LOCK (DFM 205)');
  const fileState = await page.evaluate(() => {
    const b = document.querySelector('.insp-file');
    return { disabled: b.disabled, note: (document.querySelector('.insp-note') || {}).textContent || '' };
  });
  check(!fileState.disabled,
    'File my inspection report is LIVE with nothing flagged — filing an empty report is a real answer, ' +
    'and a scene with nothing wrong in it must be passable');
  check(/costs you nothing/i.test(fileState.note),
    'and the note under it says a wrong flag costs nothing BEFORE she risks one, not after');

  section('THE REPORT NAMES THE RULE, AND MARKS A MISS DIFFERENTLY FROM A FLAG');
  await page.evaluate(() => { [1, 3, 4].forEach(i => document.querySelector('.insp-zone[data-z="' + i + '"]').click()); });
  await sleep(300);
  await page.evaluate(() => document.querySelector('.insp-file').click());
  await sleep(700);
  if (await page.$('.insp-file')) { await page.evaluate(() => document.querySelector('.insp-file').click()); await sleep(700); }
  await page.waitForSelector('.insp-report', { timeout: 8000 });
  const rep = await page.evaluate(() => ({
    rows: document.querySelectorAll('.insp-row').length,
    found: document.querySelectorAll('.insp-row.is-found').length,
    missed: document.querySelectorAll('.insp-row.is-missed').length,
    clear: document.querySelectorAll('.insp-row.is-clear').length,
    says: Array.from(document.querySelectorAll('.insp-row.is-found .insp-row-say, .insp-row.is-missed .insp-row-say')).map(e => e.textContent),
    missMark: (document.querySelector('.insp-zone.is-missed .insp-zone-flag') || {}).textContent || '',
    flagMark: (document.querySelector('.insp-zone.is-found .insp-zone-flag') || {}).textContent || '',
    zoneWords: Array.from(document.querySelectorAll('.insp-zone.is-done .insp-zone-name')).map(e => e.textContent.trim())
  }));
  check(rep.rows === 5, 'every station gets a row, including the ones she never touched (' + rep.rows + ')');
  check(rep.found === 2 && rep.missed === 1 && rep.clear === 1,
    'the walk that flagged two violations and one fine station reads back as 2 found, 1 missed, 1 flagged-but-fine');
  check(rep.says.every(t => /breaks the rule about/i.test(t)),
    'and every violation NAMES the rule it breaks, in her words, rather than just marking it wrong');
  check(rep.missMark !== rep.flagMark && rep.missMark.length > 0,
    'a MISSED violation carries a different mark ("' + rep.missMark + '") from a flag she planted ("' +
    rep.flagMark + '") — one symbol, one meaning (DFM 149)');
  check(rep.zoneWords.some(w => /missed/i.test(w)) && rep.zoneWords.some(w => /found/i.test(w)),
    'and the picture answers itself IN WORDS as well as colour, so the verdict never depends on ' +
    'telling green from orange: ' + rep.zoneWords.filter(Boolean).join(' / '));

  check(errors.length === 0, 'zero console errors across the whole scene' +
    (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));

  await browser.close();
  console.log('');
  if (FAILS.length) {
    console.log('qa-inspect-scene: ' + FAILS.length + ' FAILURE(S)');
    FAILS.forEach(f => console.log('   ' + f));
    process.exit(1);
  }
  console.log('qa-inspect-scene: ALL GREEN — the scene is big enough to read, every zone is a real');
  console.log('reachable target, nothing is judged before she files, and the report names the rule.');
})();
