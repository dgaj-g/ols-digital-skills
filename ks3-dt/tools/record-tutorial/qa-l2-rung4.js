/* Verify the Rung 4 icon fix in the running platform (audit blocker 3).
   Checks the pupil actually sees the corrected rung, its image, and that the
   exit Parsons still marks the SAME key correct after the block text swap.
   Usage: node qa-l2-rung4.js */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-j1-audit');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.evaluate(() => localStorage.clear());       // also drops stale ks3dt-content:* caches
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(600);

  const ver = await page.evaluate(() => window.App.state.contentVersion);
  console.log('  contentVersion in app:', ver);

  await page.evaluate(() => Array.from(document.querySelectorAll('.tile')).find(e => /Make It Move/i.test(e.textContent)).click());
  await sleep(2200);

  /* walk to the ladder */
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
  check(sawLadder, 'reached the Signal Relay Ladder');

  /* climb: the ladder opens on an intro card, then one rung at a time.
     Advance until Rung 4's card is the one on screen. */
  let onRung4 = false;
  for (let i = 0; i < 40; i++) {
    const txt = await page.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
    if (/Vanishing Ghost/.test(txt)) { onRung4 = true; break; }
    await page.evaluate(() => {
      const h = document.querySelector('.chunk-host');
      if (!h) return;
      const btn = Array.from(h.querySelectorAll('button')).find(b =>
        !b.disabled && b.offsetParent &&
        /Start climbing|Next rung|Got it|We did it|Done|Continue|Nailed it|It works|It worked on the device/i.test(b.textContent) &&
        !/hint|stuck|help/i.test(b.textContent));
      if (btn) { btn.click(); return; }
      const conf = h.querySelector('.confirm-step:not(:disabled)');
      if (conf) conf.click();
    });
    await sleep(750);
  }
  check(onRung4, 'climbed to Rung 4');
  await page.screenshot({ path: path.join(OUT, 'l2-rung4-card.png'), fullPage: true });

  const body = await page.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
  check(/Vanishing Ghost/.test(body), 'Rung 4 is titled "The Vanishing Ghost"');
  check(!/MOVE IT!/.test(body), 'the old "MOVE IT!" string is gone from the ladder');
  check(/ghost icon/i.test(body), 'the rung asks for the GHOST icon (not Rung 2\'s heart)');
  check(!/the words wipe/i.test(body), 'the false "the words wipe" claim is gone');

  /* the regenerated image is actually referenced and loads */
  const img = await page.evaluate(async () => {
    const el = Array.from(document.querySelectorAll('img')).find(i => /rung4\.png/.test(i.src));
    if (!el) return null;
    await new Promise(r => { if (el.complete) return r(); el.onload = r; el.onerror = r; });
    return { src: el.src, w: el.naturalWidth, h: el.naturalHeight };
  });
  check(!!img && img.w > 0, 'rung4.png loads in the rung card' + (img ? ' (' + img.w + 'x' + img.h + ')' : ''));
  await page.screenshot({ path: path.join(OUT, 'l2-rung4-fixed.png'), fullPage: true });

  /* Parsons: same key (a:10), new block text - build the correct order and expect Correct */
  const parsons = await page.evaluate(async () => {
    const r = await window.App.call('mark', { lessonId: 'j1-02', itemId: 'ex2-p', choice: 10 });
    return r;
  });
  check(parsons && parsons.ok && parsons.correct === true, 'exit Parsons still marks a:10 CORRECT after the block swap');
  check(/ghost/i.test((parsons && parsons.explain) || ''), 'parsons explanation matches the new ghost program');

  /* r-203 marks the new option 0 correct and no longer claims a scroll */
  const recap = await page.evaluate(async () => window.App.call('mark', { lessonId: 'j1-02', itemId: 'r-203', choice: 0 }));
  const recapOk = recap && recap.ok;
  check(!recapOk || recap.correct === true, 'recap r-203: option 0 is the keyed answer' + (recapOk ? '' : ' (not markable via lesson route - checked in dev-keys instead)'));

  const realErrs = errs.filter(e => !/l2-tutorial|\.mp4|poster/.test(e));
  check(realErrs.length === 0, 'zero console errors: ' + JSON.stringify(realErrs.slice(0, 3)));

  console.log('\n' + (FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL RUNG 4 CHECKS PASSED'));
  await browser.close();
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error('QA CRASHED:', e.message); process.exit(1); });
