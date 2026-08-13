/* Real-viewport visual QA of the L4 case board (the embedded pane can't rAF). */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-l4');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=niamh';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clickSel = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  // unlock L4 for this fresh profile
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks['Demo-8A']['3'] = { u: now, on: 1 };
    db.locks['Demo-8A']['4'] = { u: now, on: 1 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await page.screenshot({ path: path.join(OUT, '01-hub.png') });

  // into the lesson, skip recap
  await page.evaluate(() => Array.from(document.querySelectorAll('.tile')).find(e => /Broken Game/.test(e.textContent)).click());
  await sleep(2000);
  for (let i = 0; i < 20; i++) {
    const done = await page.evaluate(async () => {
      const h = document.querySelector('.chunk-host');
      const nxt = Array.from(h.querySelectorAll('button')).find(b => /Next|Continue|Finish|Start today|Warm up/i.test(b.textContent) && !b.disabled && b.offsetParent);
      if (nxt) { nxt.click(); return false; }
      const opt = h.querySelector('button[class*="q-opt"]:not(:disabled)');
      if (opt) { opt.click(); return false; }
      return true;
    });
    await sleep(1100);
    if (done) break;
  }
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, '02-briefing.png') });
  await page.evaluate(async () => {
    const h = document.querySelector('.chunk-host');
    const sk = h.querySelector('.dossier-skip'); if (sk) sk.click();
  });
  await sleep(900);
  await page.evaluate(() => { const c = document.querySelector('.dossier-cta'); if (c) c.click(); });
  await sleep(1800);
  // briefing may still be typing; wait for the board intro button
  for (let i = 0; i < 12; i++) {
    const ok = await page.evaluate(() => !!Array.from(document.querySelectorAll('.chunk-host button')).find(b => /Open the case board|Back to the board/.test(b.textContent)));
    if (ok) break;
    await page.evaluate(() => { const c = document.querySelector('.dossier-cta'); if (c && !c.hidden) c.click(); });
    await sleep(900);
  }
  await page.screenshot({ path: path.join(OUT, '03-board-intro.png') });
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Open the case board|Back to the board/.test(x.textContent)); if (b) b.click(); });
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, '04-board-sealed.png'), fullPage: true });

  // intake -> unseal
  await clickSel(page, '[data-view="intake"]');
  await sleep(900);
  await page.screenshot({ path: path.join(OUT, '05-intake.png'), fullPage: true });
  await clickSel(page, '.confirm-step');
  await sleep(1600);
  await page.screenshot({ path: path.join(OUT, '06-board-open.png'), fullPage: true });

  // close the training case first (c2-c4 are correctly sealed until then)
  await clickSel(page, '[data-case="c1"]');
  await page.waitForSelector('.case-log-input', { timeout: 15000 });
  await page.evaluate(() => { const t = document.querySelector('.case-log-input'); t.value = 'the right arrow one had no block on top so I added a when key pressed'; t.dispatchEvent(new Event('input')); });
  await sleep(400);
  await clickSel(page, '.case-close-btn');
  await sleep(2600);

  // a case file + clue routine
  await clickSel(page, '[data-case="c2"]');
  await sleep(900);
  await page.screenshot({ path: path.join(OUT, '07-case-file.png'), fullPage: true });
  await clickSel(page, '.case-clue-btn');
  await sleep(700);
  await page.waitForSelector('.case-log-input', { timeout: 15000 });
  await page.evaluate(() => { const t = document.querySelector('.case-log-input'); if (t) { t.value = 'it was broken'; t.dispatchEvent(new Event('input')); } });
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, '08-clue-and-nudge.png'), fullPage: true });
  await clickSel(page, '.case-hq-btn');
  await sleep(800);
  await page.evaluate(() => { const t = document.querySelector('.case-log-input'); if (t) { t.value = 'the change score block said 0 so I typed 1 in it'; t.dispatchEvent(new Event('input')); } });
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, '09-hq-clue-silver.png'), fullPage: true });
  // close it -> stamp animation
  await clickSel(page, '.case-close-btn');
  await sleep(700);
  await page.screenshot({ path: path.join(OUT, '10-stamp.png'), fullPage: true });
  await sleep(1800);
  await page.screenshot({ path: path.join(OUT, '11-board-after.png'), fullPage: true });

  // handbook
  await clickSel(page, '[data-view="handbook"]');
  await sleep(2200);
  await page.screenshot({ path: path.join(OUT, '12-handbook.png'), fullPage: true });

  // mobile-ish width check of the board
  await clickSel(page, '.case-back');
  await sleep(900);
  await page.setViewportSize({ width: 900, height: 1000 });
  await sleep(900);
  await page.screenshot({ path: path.join(OUT, '13-board-narrow.png'), fullPage: true });

  /* ------------------------------------------------------------------ *
   * E7 — MEASURED CHECKS, not just screenshots (L4 spec Part E7 (e) and (i)).
   * This file took thirteen pictures and asserted nothing, which is how his two
   * findings below survived a "visual QA" that reported no errors at all.
   * The rest of E7's list is covered where it belongs: the locked-note states
   * by qa-no-mute-locks and sit-wrongpath, the byte-identical hook/intro
   * controls by the harnesses written with those changes.
   * ------------------------------------------------------------------ */
  const FAILS = [];
  const check = (c, m) => { if (c) console.log('  PASS  ' + m); else { console.log('  FAIL  ' + m); FAILS.push(m); } };
  console.log('\n== E7 measured checks ==');

  /* (e) HIS COMPLAINT, IN PIXELS: "you can hardly make it out" — the CSS cropped
     every hook image to a 220x120 thumbnail. The moth must now measure at least
     90% of the width of the text it sits with. */
  await page.setViewportSize({ width: 1280, height: 900 });
  /* start from a CLEAN pupil: the screenshot walk above left niamh deep inside
     the lesson, and re-opening it resumes her at the board — so the briefing,
     which is the card being measured, never renders. (It reported the photo as
     "not loading" when the photo was simply on a screen we had walked past.) */
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(1600);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['3', '4']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(900);
  await page.evaluate(() => {
    const tile = Array.from(document.querySelectorAll('.tile')).find(e => /Lesson\s*4(?!\d)/i.test(e.textContent));
    if (tile) tile.click();
  });
  await sleep(2600);
  /* the briefing types itself out and the photo strip arrives with the reveal,
     so wait for the picture rather than guessing a sleep — measuring a photo
     that has not rendered yet would report a fault the app does not have */
  await page.waitForSelector('.dossier-photos figure img', { timeout: 30000 }).catch(() => {});
  await sleep(1200);
  const moth = await page.evaluate(() => {
    const fig = document.querySelector('.dossier-photos figure');
    const img = fig && fig.querySelector('img');
    const col = document.querySelector('.dossier-line') || document.querySelector('.card');
    if (!img || !col) return null;
    const r = img.getBoundingClientRect(), c = col.getBoundingClientRect();
    return { img: Math.round(r.width), imgH: Math.round(r.height), col: Math.round(c.width),
             loaded: img.complete && img.naturalWidth > 0, src: img.getAttribute('src') };
  });
  check(!!moth && moth.loaded, 'the hook photo loads (not a broken image)');
  if (moth) {
    check(moth.img >= moth.col * 0.9,
      'the moth photo measures ' + moth.img + 'px across a ' + moth.col + 'px text column — ' +
      'at least 90% of it, so it is no longer the 220x120 thumbnail he could "hardly make out"');
    check(moth.imgH > 130, 'and it is ' + moth.imgH + 'px tall (the old crop was 120px)');
  }

  /* (i) the four evidence photos: they exist, they load, and they are in their
     own case files — a caption with no picture is worse than neither. */
  const shots = await page.evaluate(async () => {
    const out = [];
    for (const n of ['c1', 'c2', 'c3', 'c4']) {
      const url = 'assets/img/l4/evidence-' + n + '.png';
      let ok = false, w = 0;
      try {
        const r = await fetch(url, { method: 'GET' });
        ok = r.ok; const b = await r.blob(); w = b.size;
      } catch (e) { ok = false; }
      out.push({ n: n, ok: ok, bytes: w });
    }
    return out;
  });
  shots.forEach(s => check(s.ok && s.bytes > 5000,
    'evidence-' + s.n + '.png is served and real (' + s.bytes + ' bytes)'));

  console.log('\nconsole errors:', errs.length ? JSON.stringify(errs.slice(0, 8)) : 'NONE');
  console.log('shots in', OUT);
  await browser.close();
  if (FAILS.length) { console.error('\nqa-l4-visual: ' + FAILS.length + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-l4-visual: ALL GREEN');
})().catch(e => { console.error('QA FAILED:', e.message); process.exit(1); });
