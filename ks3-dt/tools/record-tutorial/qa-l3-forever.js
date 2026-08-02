/* Verify audit blocker B-08 in the running platform: the block now TEACHES the
   `forever` loop, in Lesson 3, and Lesson 4's brief claim about it is true.
   Modelled on qa-l2-rung4.js. Usage: node qa-l3-forever.js */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-j1-audit');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };

(async () => {
  /* ---------- 0. the source-of-truth checks the audit made by grep ---------- */
  console.log('== source: is `forever` genuinely taught now? ==');
  const l2 = fs.readFileSync(path.join(SRC, 'j1/lessons/j1-02.json'), 'utf8');
  const l3 = fs.readFileSync(path.join(SRC, 'j1/lessons/j1-03.json'), 'utf8');
  const l4 = fs.readFileSync(path.join(SRC, 'j1/lessons/j1-04.json'), 'utf8');
  const l3f = (l3.match(/forever/gi) || []).length;
  check(l3f >= 6, 'j1-03 now teaches `forever` (' + l3f + ' occurrences; the audit found 1, a misconception label)');
  check(/frozen forever/.test(l3) ? l3f > 1 : true, 'the L3 hits are not just the old "frozen forever" label');
  const l3lad = JSON.parse(l3).chunks.find(c => c.id === 'ladder').config;
  check(/forever/i.test(l3lad.rungs[0].target), 'Rung 1 asks the pupil to build the forever loop');
  check(/dark/i.test(l3lad.rungs[0].test), 'Rung 1 has a genuine fail state (take it out, the screen goes dark)');
  check(/loop/i.test(l3lad.intro) && /event/i.test(l3lad.intro), 'the ladder intro names both shapes: loop AND event');
  check(!/show number score/i.test(l3lad.rungs[1].target) && !/show number score/i.test(l3lad.rungs[2].target),
    'rungs 2 and 3 no longer put the display inside the button events');
  /* L4's claim must be TRUE after the change, not merely reworded.
     RE-PINNED 2 Aug 2026: the brief was rebuilt to the seven-section standard,
     so `pitfalls` no longer exists. The assertion is unchanged in strength -
     it still demands a sentence that mentions forever AND names Lesson 3 - it
     just reads every prose string in the brief, whichever shape it is in. */
  const briefStrings = (function (b) {
    const out = [];
    (function walk(o) {
      if (typeof o === 'string') out.push(o);
      else if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k]));
    })(b);
    return out;
  })(JSON.parse(l4).teacherBrief);
  const claim = briefStrings.find(s => /forever/.test(s) && /Lesson 3|micro:bit/.test(s));
  check(!!claim && /Lesson 3/.test(claim), 'L4 brief now points at Lesson 3 by name');
  check(!!claim && !/They met forever on the micro:bit/.test(claim), 'the old vague claim is gone');
  check((l2.match(/forever/gi) || []).length === 0, 'L2 is untouched (its hour is Damien\'s open blocker)');

  /* ---------- browser ---------- */
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(600);

  console.log('\n== in the platform ==');
  const ver = await page.evaluate(() => window.App.state.contentVersion);
  console.log('  contentVersion reported by the app:', ver, '(preview always reports "dev-preview")');
  const packedVer = JSON.parse(fs.readFileSync(path.join(__dirname, '../../content/index.json'), 'utf8')).contentVersion;
  const srcVer = JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8')).contentVersion;
  check(packedVer === srcVer, 'packed contentVersion matches content-src (' + srcVer + ') - the pack is current');
  check(packedVer >= '2026-07-27a', 'content is at or past the forever fix (' + packedVer + ')');

  await page.evaluate(() => Array.from(document.querySelectorAll('.tile')).find(e => /Scoreboard Engineer/i.test(e.textContent)).click());
  await sleep(2200);

  let sawLadder = false;
  for (let i = 0; i < 70; i++) {
    const st = await page.evaluate(() => {
      if (document.querySelector('.rung, [class*="rung"]')) return 'ladder';
      const pop = document.querySelector('.badge-pop button'); if (pop) { pop.click(); return 'pop'; }
      const h = document.querySelector('.chunk-host'); if (!h) return 'none';
      const cta = h.querySelector('.dossier-cta'); if (cta && !cta.hidden) { cta.click(); return 'cta'; }
      const sk = h.querySelector('.dossier-skip'); if (sk) { sk.click(); return 'skip'; }
      const vid = Array.from(h.querySelectorAll('button')).find(b => /Done watching/i.test(b.textContent) && b.offsetParent);
      if (vid) { vid.click(); return 'video'; }
      const opt = h.querySelector('.q-opt:not(:disabled)'); if (opt) { opt.click(); return 'a'; }
      const nxt = Array.from(h.querySelectorAll('button')).find(b => /Next|Finish|Start|Continue|Warm up|Begin|Ready/i.test(b.textContent) && !b.disabled && b.offsetParent);
      if (nxt) { nxt.click(); return 'n'; }
      return 'w';
    });
    if (st === 'ladder') { sawLadder = true; break; }
    await sleep(800);
  }
  check(sawLadder, 'reached the Scoreboard Ladder');

  /* climb to Rung 1's card */
  let onRung1 = false;
  for (let i = 0; i < 25; i++) {
    const txt = await page.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
    if (/Wake the Scoreboard/.test(txt)) { onRung1 = true; break; }
    await page.evaluate(() => {
      const h = document.querySelector('.chunk-host'); if (!h) return;
      const btn = Array.from(h.querySelectorAll('button')).find(b =>
        !b.disabled && b.offsetParent &&
        /Start climbing|Next rung|Got it|Done|Continue|Ready/i.test(b.textContent) &&
        !/hint|stuck|help/i.test(b.textContent));
      if (btn) btn.click();
    });
    await sleep(700);
  }
  check(onRung1, 'Rung 1 is now "Wake the Scoreboard"');
  const card = await page.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
  check(/forever/i.test(card), 'the pupil is asked for the forever block on screen');
  check(/already/i.test(card), 'the card tells her the forever block is already on the canvas');
  check(/goes dark|dark and STAYS dark/i.test(card), 'the fail state is on the card, in the pupil\'s own words');
  await page.screenshot({ path: path.join(OUT, 'l3-rung1-forever.png'), fullPage: true });

  const img = await page.evaluate(async () => {
    const el = Array.from(document.querySelectorAll('img')).find(i => /l3\/rung1\.png/.test(i.src));
    if (!el) return null;
    await new Promise(r => { if (el.complete) return r(); el.onload = r; el.onerror = r; });
    return { w: el.naturalWidth, h: el.naturalHeight };
  });
  check(!!img && img.w > 0, 'the REGENERATED rung1.png loads on the card' + (img ? ' (' + img.w + 'x' + img.h + ')' : ''));

  /* the parsons key, marked through the real server path */
  console.log('\n== marking ==');
  const par = await page.evaluate(() => window.App.call('mark', { lessonId: 'j1-03', itemId: 'ex3-p', choice: 15 }));
  check(par && par.ok && par.correct === true, 'exit Parsons marks the new order (a:15) CORRECT');
  const parWrong = await page.evaluate(() => window.App.call('mark', { lessonId: 'j1-03', itemId: 'ex3-p', choice: 0 }));
  check(parWrong && parWrong.ok && parWrong.correct === false, 'and a wrong arrangement is still marked wrong');
  check(/loop/i.test((par && par.explain) || '') && /event/i.test((par && par.explain) || ''),
    'the parsons explanation contrasts the loop with the event');

  /* recap fairness: the new loop item, the re-stemmed event item, and r-403 */
  /* Recap items are marked by the recap engine, not the lesson `mark` route, so
     their authored answers are checked in the packed key file (the same place
     the preview marks from) and their SERVING is exercised through recapStart. */
  const dk = JSON.parse(fs.readFileSync(path.join(__dirname, '../../content/dev-keys.json'), 'utf8'))['j1/recap-pool'];
  check(dk['r-306'] && dk['r-306'].a === 0, 'new recap r-306 (loop vs event) keys option 0 as correct');
  check(dk['r-202'] && dk['r-202'].a === 0, 're-stemmed r-202 keys option 0 as correct');
  check(Array.isArray(dk['r-306'].mis) && dk['r-306'].mis[1], 'r-306 carries authored misconception labels for the dashboard');

  const packedPool = JSON.parse(fs.readFileSync(path.join(__dirname, '../../content/j1/recap-pool.json'), 'utf8'));
  const packed306 = (packedPool.items || []).find(i => i.id === 'r-306');
  check(!!packed306 && packed306.options.length === 4, 'r-306 survived the pack with 4 options');
  check(!/forever just goes/.test(JSON.stringify(packedPool.items)), 'the packed pool leaks no answer text into the items (guard holds)');

  /* prove the new item can actually be SERVED to a pupil */
  const served = await page.evaluate(async () => {
    const seen = {};
    for (let i = 0; i < 14; i++) {
      const r = await window.App.call('recapStart', { lessonNum: '4' });
      (r && r.items || []).forEach(it => { seen[it.id] = 1; });
    }
    return Object.keys(seen);
  });
  console.log('  recap ids offered across 14 Do-Now draws:', JSON.stringify(served));
  check(served.indexOf('r-306') !== -1, 'r-306 is actually served by the Do-Now engine');
  check(served.indexOf('r-403') !== -1, 'r-403 is still served after being re-tagged to j1-03');

  /* the item that USED to assume forever had been taught */
  const pool = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/recap-pool.json'), 'utf8'));
  const r403 = pool.items.find(i => i.id === 'r-403');
  check(r403 && r403.lesson === 'j1-03', 'r-403 ("a block inside a forever loop runs...") is tagged to the lesson that TEACHES it now');
  const r202src = pool.items.find(i => i.id === 'r-202');
  check(r202src && !r202src.options.some(o => /forever block on its own/i.test(o)),
    'r-202 no longer offers "a forever block on its own" as a WRONG answer (it is now demonstrably right)');
  const l3items = pool.items.filter(i => i.lesson === 'j1-03');
  check(l3items.length === 7, 'L3 now has ' + l3items.length + ' recap items (was 5)');

  const realErrs = errs.filter(e => !/tutorial|\.mp4|poster/.test(e));
  check(realErrs.length === 0, 'zero console errors: ' + JSON.stringify(realErrs.slice(0, 3)));

  console.log('\n' + (FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL L3 FOREVER CHECKS PASSED'));
  await browser.close();
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error('QA CRASHED:', e.message); process.exit(1); });
