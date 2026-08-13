#!/usr/bin/env node
/* qa-l4-round6-visual.js — the rendered-pixel half of round 6 (DFM 146b, 201e/g).
 *
 * Three of his findings are about what a screen LOOKS like, and no amount of
 * reading the source proves those: the "Doing that in Scratch" panel he walked
 * past ("it needs to stand out more because I missed that!"), and the closed
 * case that swallowed its own instructions ("I couldn't go back and check").
 * This measures both on the real rendered card, and screenshots them.
 *
 *   node qa-l4-round6-visual.js [--base http://localhost:8096] [--expect-fail]
 *
 * --expect-fail is the DFM 196 control: point it at the build he sat and the
 * checks must FAIL there (no gold bar, no closed-case record).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const BASE = argOf('--base', 'http://localhost:8096');
const EXPECT_FAIL = process.argv.includes('--expect-fail');
const SHOTS = path.join(__dirname, 'qa-l2-l5-review', 'l4-round6');
const findings = [];
const log = (m) => console.log('  ' + m);
const check = (pass, label, detail) => {
  if (!pass) findings.push(label + (detail ? ' — ' + detail : ''));
  console.log((pass ? '  ✓ ' : '  ✗ ') + label + (detail ? '  [' + detail + ']' : ''));
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  /* boot exactly as sit-review.js / qa-no-mute-locks.js do — a harness that
     reaches the screen a different way is testing a different screen */
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=Demo-8A&as=anya', { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: 0 };
    db.pupils = db.pupils || {};
    db.pupils['Demo-8A:anya.murphy@demo'] = Object.assign(
      db.pupils['Demo-8A:anya.murphy@demo'] || { n: 'Anya Murphy', cn: '', j: 1, xp: 0, g: '' }, { L: {} });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(800);
  await page.evaluate(() => {
    const tile = Array.from(document.querySelectorAll('.tile')).find(e => /Broken Game/i.test(e.textContent));
    if (tile) tile.click();
  });
  await sleep(1600);

  /* Drive to a case card. CASE 02 IS SEALED UNTIL CASE 01 CLOSES — found by
     running this and watching it stall on intake-confirm — so the walk closes
     the training case first, exactly as a pupil must. That also gives us Case
     01's closed card to check the "for the record" section on. */
  const step = async (want) => page.evaluate((wantCase) => {
    const q = (s) => document.querySelector(s);
    const vis = (e) => e && e.offsetParent !== null;
    const pop = q('.badge-pop button'); if (pop) { pop.click(); return 'badge'; }
    const skip = q('.intro-skip'); if (vis(skip)) { skip.click(); return 'intro-skip'; }
    /* Evidence Intake FIRST: it is also a .case-filecard, so the generic
       leave-this-card rule below would bounce straight back off it and the walk
       would ping-pong for ever (it did — 20 times, in the trail). */
    const intakeTick = q('.case-filecard .confirm-step:not(.ticked)');
    if (vis(intakeTick) && /broken game is open/i.test(intakeTick.textContent || '')) { intakeTick.click(); return 'intake-confirm'; }
    /* On a case card? Decide by the CARD, not by whether it has a textarea —
       a CLOSED card has no textarea, so keying off the log box stranded the
       walk on Case 01's closed file with no way back to the board. */
    const card = q('.case-filecard');
    if (card) {
      const kicker = (card.querySelector('.intro-kicker') || {}).textContent || '';
      const isTarget = kicker.indexOf(wantCase) !== -1;
      if (isTarget && card.querySelector('.case-log-input')) return 'ARRIVED';
      if (!/EVIDENCE/i.test(kicker)) {
        const back = card.querySelector('.case-back');
        if (vis(back)) { back.click(); return 'back-from-' + kicker.trim().slice(0, 8); }
      }
    }
    const target = q('.case-file[data-case="' + (wantCase === 'CASE 01' ? 'c1' : 'c2') + '"]:not([disabled])');
    if (vis(target)) { target.click(); return 'open-' + wantCase; }
    const intake = q('[data-view="intake"]:not([disabled])');
    if (vis(intake) && !intake.classList.contains('done')) { intake.click(); return 'intake'; }
    const cta = q('.dossier-cta'); if (vis(cta) && !cta.hidden) { cta.click(); return 'dossier-cta'; }
    const pb = Array.from(document.querySelectorAll('.chunk-host .primary-btn')).find(vis);
    if (pb) { pb.click(); return 'primary:' + (pb.textContent || '').trim().slice(0, 24); }
    return 'wait';
  }, want);
  const driveTo = async (want) => {
    const trail = [];
    for (let i = 0; i < 45; i++) {
      const w = await step(want);
      if (w !== 'wait') trail.push(w);
      if (w === 'ARRIVED') { log('reached ' + want + ' via: ' + trail.join(' -> ')); return true; }
      await sleep(900);
    }
    console.error('could not reach ' + want + '. Trail: ' + trail.join(' -> '));
    return false;
  };
  /* Close the open case, then RE-OPEN it from the board. The engine returns to
     the board by itself 1.5s after the stamp lands, so the closed card is only
     ever seen by going back into it — which is exactly what he did when he tried
     to check what "three catches" meant, and exactly why it has to carry its
     record. (Found by running this and getting a null card.) */
  const closeOpenCase = async (logText, caseSel) => {
    await page.evaluate((t) => {
      const ta = document.querySelector('.case-log-input');
      ta.value = t;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, logText);
    await sleep(400);
    await page.evaluate(() => { const b = document.querySelector('.case-close-btn'); if (b) b.click(); });
    await sleep(2600);                                   // stamp + auto-return
    await page.evaluate(() => { const p = document.querySelector('.badge-pop button'); if (p) p.click(); });
    await sleep(600);
    await page.evaluate((sel) => {
      const pin = document.querySelector('.case-file[data-case="' + sel + '"]');
      if (pin) pin.click();
    }, caseSel);
    await sleep(1200);
  };

  if (!await driveTo('CASE 01')) { await browser.close(); process.exit(2); }
  await closeOpenCase('The right arrow script had no hat block on top of it, so I added a when right arrow key pressed block.', 'c1');
  /* CASE 01, now closed — the DFM 201e surface */
  const c1closed = await page.evaluate(() => {
    const card = document.querySelector('.case-filecard');
    const rec = card ? card.querySelector('.case-record') : null;
    return { isClosed: !!(card && card.classList.contains('closed-file')),
      present: !!rec, text: rec ? rec.textContent.replace(/\s+/g, ' ').trim() : '',
      inputs: card ? card.querySelectorAll('input, textarea, .confirm-step:not(.ticked)').length : -1,
      ladder: card ? card.querySelectorAll('.case-clue-btn, .case-clue-open').length : -1 };
  });
  await page.screenshot({ path: path.join(SHOTS, (EXPECT_FAIL ? 'prefix' : 'fixed') + '-case01-closed.png'), fullPage: true });
  console.log('\nDFM 201e — a CLOSED case must keep its file readable:');
  check(c1closed.isClosed, 'Case 01 really closed');
  check(c1closed.present, 'the closed card keeps a "for the record" section');
  check(/Full lap swum|all four arrows/i.test(c1closed.text),
    'the proof line he could not go back to check is still readable',
    (c1closed.text.match(/Full lap[^.]*/i) || ['not found'])[0].slice(0, 60));
  check(/HAT BLOCK|curved top/i.test(c1closed.text), 'the Scratch steps survive on the closed card');
  check(c1closed.inputs === 0, 'nothing on the closed card is still an active control', c1closed.inputs + ' controls');
  check(c1closed.ladder === 0, 'the help ladder is gone from the closed card', c1closed.ladder + ' ladder parts');

  /* now Case 02, which the training case has just unsealed */
  if (!await driveTo('CASE 02')) { await browser.close(); process.exit(2); }

  console.log('\nDFM 201g — the "Doing that in Scratch" panel must stand out:');
  const mech = await page.evaluate(() => {
    const p = document.querySelector('.case-filecard .case-mechanic');
    if (!p) return null;
    const cs = getComputedStyle(p);
    const card = getComputedStyle(document.querySelector('.case-filecard'));
    const r = p.getBoundingClientRect();
    return {
      borderLeftWidth: parseFloat(cs.borderLeftWidth), borderLeftColor: cs.borderLeftColor,
      background: cs.backgroundColor, cardBackground: card.backgroundColor,
      w: Math.round(r.width), h: Math.round(r.height),
      steps: document.querySelectorAll('.case-filecard .case-mech-steps li').length
    };
  });
  if (!mech) check(false, 'the case card renders a "Doing that in Scratch" panel', 'not present');
  else {
    check(mech.borderLeftWidth >= 3, 'it carries a gold bar at least 3px wide',
      mech.borderLeftWidth + 'px ' + mech.borderLeftColor);
    check(/228,\s*184,\s*36/.test(mech.borderLeftColor), 'the bar is the platform gold', mech.borderLeftColor);
    check(mech.background !== mech.cardBackground, 'its background differs from the card',
      mech.background + ' vs card ' + mech.cardBackground);
    check(mech.steps >= 3, 'Case 02 now carries its own numbered Scratch steps', mech.steps + ' steps');
  }

  console.log('\nDFM 201f — the help ladder must state its own price:');
  await page.evaluate(() => { const b = document.querySelector('.case-clue-btn'); if (b) b.click(); });
  await sleep(600);
  const price = await page.evaluate(() => {
    const p = document.querySelector('.case-clue-price');
    const open = document.querySelector('.case-clue-open');
    return { text: p ? p.textContent.trim() : null, first: open ? open.firstElementChild.className : null,
      heads: Array.from(document.querySelectorAll('.case-clue-open p b')).map(b => b.textContent.trim()) };
  });
  check(!!price.text && /FREE/.test(price.text) && /GOLD|SILVER/.test(price.text),
    'the ladder opens by naming what it costs', price.text ? price.text.slice(0, 72) + '…' : 'absent');
  check(price.first === 'case-clue-price', 'the price line is the FIRST thing in the ladder', price.first);
  check(price.heads.some(h => /another detective pair/i.test(h)),
    'the step-2 heading defines "agency" where it is used', price.heads.join(' | ').slice(0, 90));
  await page.screenshot({ path: path.join(SHOTS, (EXPECT_FAIL ? 'prefix' : 'fixed') + '-case02-card.png'), fullPage: true });

  console.log('\nDFM 201e — Case 02 closed keeps the proof line he asked about:');
  await closeOpenCase('The change score block was set to zero so the score never moved, and I changed it to one.', 'c2');
  const closed = await page.evaluate(() => {
    const card = document.querySelector('.case-filecard');
    const rec = card ? card.querySelector('.case-record') : null;
    return { present: !!rec, text: rec ? rec.textContent.replace(/\s+/g, ' ').trim() : '',
      isClosed: !!(card && card.classList.contains('closed-file')) };
  });
  check(closed.isClosed && closed.present, 'Case 02 closed and kept its record');
  check(/Three restarts/.test(closed.text),
    'the tick wording he could not go back to check is readable on the closed card',
    (closed.text.match(/Three restarts[^—]*/) || ['not found'])[0].slice(0, 60));
  await page.screenshot({ path: path.join(SHOTS, (EXPECT_FAIL ? 'prefix' : 'fixed') + '-case02-closed.png'), fullPage: true });

  check(errors.length === 0, 'zero console errors', errors.slice(0, 2).join(' | '));
  await browser.close();

  console.log('');
  if (findings.length) {
    console.log('FINDINGS: ' + findings.length);
    findings.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f));
    if (EXPECT_FAIL) { console.log('\n(--expect-fail: the control reproduced on the pre-fix build)'); process.exit(0); }
    process.exit(1);
  }
  console.log('ALL PASSED — measured on the real rendered card, screenshots in qa-l2-l5-review/l4-round6/');
  if (EXPECT_FAIL) { console.log('\n--expect-fail was set but nothing failed — the control did not reproduce.'); process.exit(1); }
})().catch(e => { console.error('qa-l4-round6-visual CRASHED: ' + e.message); process.exit(1); });
