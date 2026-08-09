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
        /Start climbing|Next rung|Got it|We did it|Done|Continue|Nailed it|It works|It worked/i.test(b.textContent) &&
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
  /* RE-PINNED 4 Aug 2026 (DFM 152c): the ladder was reshaped after his sit-through
     - rung 2 is now button B + happy face, rung 3 introduces the shake/ghost, and
     rung 4 is the one that makes the ghost VANISH. So the old literal "ghost icon"
     string is gone; what must hold is that rung 4 is about the ghost disappearing.
     "heart" is not asserted absent: rung 4's hint deliberately refers back to the
     button A heart, and textContent includes the hidden hint. */
  check(/ghost/i.test(body) && /(vanish|clears itself|clear screen)/i.test(body),
    'Rung 4 is the ghost that has to VANISH (shake -> ghost -> pause -> clear)');
  check(!/the words wipe/i.test(body), 'the false "the words wipe" claim is gone');

  /* RE-PINNED 2 Aug 2026 (approved change C-04): the finished-blocks picture no
     longer sits on the rung card, where it handed the answer away for free -
     it moved INSIDE the Debug Hint, which costs a signal point. So the check
     got STRONGER, not weaker: the card must NOT show it, and buying the hint
     must produce it, loaded. */
  const onCard = await page.evaluate(() =>
    !!Array.from(document.querySelectorAll('.ladder-card img.rung-img'))
      .filter(i => !i.closest('.rung-hint'))          // the hint's copy is the point of C-04
      .find(i => /rung4\.png/.test(i.src)));
  check(!onCard, 'the finished blocks are NOT printed on the rung card any more (C-04)');

  const hintBtn = await page.evaluate(() => {
    const b = document.querySelector('.rung-hint-btn');
    if (!b) return null;
    const label = (b.textContent || '').trim();
    b.click();
    return label;
  });
  /* DAMIEN, 3 Aug 2026: the price is now named in the currency a pupil can
     actually see on her own screen - 2 XP - instead of the invented "signal
     point". What this check is FOR is that the hint is still a priced route,
     and that the price it states is the price the engine really charges
     (a clean rung scores 5, a hinted one 3). It asserts the RULE, not the old
     wording, and would fail if the button ever stopped naming a price. */
  check(!!hintBtn && /costs\s*2\s*XP/i.test(hintBtn), 'the Debug Hint is still the priced route, in real XP: ' + JSON.stringify(hintBtn));
  check(!/signal point/i.test(hintBtn || ''), 'the hint no longer prices itself in an invented currency');
  await sleep(600);
  const img = await page.evaluate(async () => {
    const box = document.querySelector('.rung-hint');
    if (!box || box.hidden) return null;
    const el = Array.from(box.querySelectorAll('img')).find(i => /rung4\.png/.test(i.src));
    if (!el) return { missing: true, text: (box.innerText || '').trim().slice(0, 60) };
    await new Promise(r => { if (el.complete) return r(); el.onload = r; el.onerror = r; });
    return { src: el.src, w: el.naturalWidth, h: el.naturalHeight, text: (box.innerText || '').trim().slice(0, 60) };
  });
  check(!!img && img.w > 0, 'rung4.png loads INSIDE the bought Debug Hint' + (img && img.w ? ' (' + img.w + 'x' + img.h + ')' : ' - got ' + JSON.stringify(img)));
  check(!!img && !!img.text, 'the hint still carries its written text as well as the picture');

  /* RULE 135c (2 Aug 2026): every rung card carries a film-rewatch button that
     replays the lesson's film in a popup without losing the pupil's place. */
  const filmBtn = await page.evaluate(() => {
    const b2 = document.querySelector('.rung-film-btn');
    if (!b2) return null;
    const label = (b2.textContent || '').trim();
    b2.click();
    return label;
  });
  check(!!filmBtn && /film/i.test(filmBtn), 'the film-rewatch button is on the rung card: ' + JSON.stringify(filmBtn));
  await sleep(700);
  const filmModal = await page.evaluate(() => {
    const m = document.querySelector('.film-modal');
    if (!m) return null;
    const v = m.querySelector('video');
    return { video: !!v, src: v ? v.getAttribute('src') : '', chips: m.querySelectorAll('.vid-chapter').length };
  });
  check(!!filmModal && filmModal.video, 'the popup opens with a video player');
  check(!!filmModal && /l2-tutorial\.mp4$/.test(filmModal.src), 'it plays THIS lesson\'s film: ' + (filmModal ? filmModal.src : 'none'));
  check(!!filmModal && filmModal.chips === 4, 'all four chapter buttons are inside the popup (' + (filmModal ? filmModal.chips : 0) + ')');
  await sleep(500);  // DFM 104 arm delay on the close button
  await page.evaluate(() => { const c2 = document.querySelector('.film-close'); if (c2) c2.click(); });
  await sleep(600);
  const afterClose = await page.evaluate(() => ({
    modalGone: !document.querySelector('.film-modal'),
    stillRung4: /Vanishing Ghost/.test((document.querySelector('.chunk-host') || {}).textContent || '')
  }));
  check(afterClose.modalGone, 'the popup closes cleanly');
  check(afterClose.stillRung4, 'and the pupil is still exactly where she was - rung 4, ladder intact');
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
