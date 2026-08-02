/* THE RALLY WEDGE (review finding S-1, fixed 2 Aug 2026).
 *
 * What broke: pressing Transmit landed every pupil on "Saving your badge..."
 * for ever. awardBadge replaces the whole chunk host with that panel, and the
 * tournament engine is the ONLY caller that carries on IN PLACE afterwards -
 * so it painted its suspense room into a card that had already been thrown
 * away, and the reveal poller stopped itself on sight of a detached box.
 * A refresh recovered it; no Year 8 knows to refresh.
 *
 * What this harness proves, in one run:
 *   1. THE CONTROL. It reads engines.js AT COMMIT cacd072 out of git and
 *      checks that the shipped line really was `.then(... afterTransmit())`,
 *      then makes the live app take that exact branch (the fix is guarded by
 *      `if (App.remountChunk)`, so removing it runs the pre-fix code) and
 *      asserts the wedge REPRODUCES: spinner panel, no suspense room.
 *      A control that cannot reproduce the bug proves nothing, so a control
 *      that comes back clean FAILS this harness.
 *   2. THE FIX. Same journey, untouched app: after the badge is dismissed the
 *      suspense room must be on screen, in the live DOM, with no refresh -
 *      sealed line, the scores counter, and a Continue.
 *
 * Usage: node qa-l3-rally.js      (server: launch config digital-skills-l4, :8096)
 */
const { chromium } = require('./node_modules/playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-j1-audit');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const REPO = path.join(__dirname, '../../..');
const PIN = 'cacd072';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };

/* walk the lesson like a person: 420 ms between presses, one action per look,
   never two clicks into the same card (the ghost-click guard is real) */
async function step(page) {
  return page.evaluate(() => {
    const q = s => document.querySelector(s);
    const vis = e => e && e.offsetParent !== null && !e.disabled;
    if (q('.badge-pop button')) { q('.badge-pop button').click(); return 'badge'; }
    if (q('.rally-transmit')) return 'AT-RALLY';
    if (vis(q('.dossier-cta'))) { q('.dossier-cta').click(); return 'briefing'; }
    if (q('.dossier-skip')) { q('.dossier-skip').click(); return 'briefing-skip'; }
    if (q('.q-feedback button') && vis(q('.q-feedback button'))) { q('.q-feedback button').click(); return 'q-next'; }
    if (q('.q-opt:not(:disabled)')) { q('.q-opt:not(:disabled)').click(); return 'q-opt'; }
    const confirm = Array.from(document.querySelectorAll('.confirm-step:not(.ticked)')).find(vis);
    if (confirm) { confirm.click(); return 'confirm'; }
    const host = q('.chunk-host');
    if (!host) return 'none';
    const btns = Array.from(host.querySelectorAll('button')).filter(vis);
    const by = rx => btns.find(b => rx.test((b.textContent || '').trim()));
    const pick = by(/It worked on the device/i) || by(/Start climbing|Back to the ladder/i) ||
      by(/Finish the ladder without it/i) || by(/Done watching|Watched it/i) ||
      by(/Run the HQ Inspection|Claim the badge/i) || by(/^Warm up$/i) ||
      by(/Start today.s lesson/i) || by(/Continue|Next|Ready|Onward|Start/i);
    if (pick) { pick.click(); return (pick.textContent || '').trim().slice(0, 28); }
    return 'stuck';
  });
}

async function toRally(page, label) {
  for (let i = 0; i < 90; i++) {
    const s = await step(page);
    if (s === 'AT-RALLY') return true;
    if (s === 'stuck' || s === 'none') await sleep(700);
    await sleep(420);
  }
  console.log('  (' + label + ') never reached the Rally console');
  return false;
}

async function transmit(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.rally-round').forEach((slot, i) => {
      const plus = slot.querySelector('.rally-step[data-d="1"]');
      for (let n = 0; n < 5 + i; n++) plus.click();
    });
    const tick = document.querySelector('.rally-confirm');
    if (tick && !tick.classList.contains('ticked')) tick.click();
  });
  await sleep(700);
  const armed = await page.evaluate(() => {
    const t = document.querySelector('.rally-transmit');
    return !!t && !t.disabled;
  });
  if (!armed) return false;
  await page.evaluate(() => document.querySelector('.rally-transmit').click());
  await sleep(1400);
  /* the badge pop, dismissed exactly as a pupil dismisses it */
  for (let i = 0; i < 25; i++) {
    const gone = await page.evaluate(() => {
      const b = document.querySelector('.badge-pop button');
      if (b) { b.click(); return false; }
      return !document.querySelector('.badge-pop');
    });
    if (gone) break;
    await sleep(420);
  }
  return true;
}

/* what the pupil can see, right now, with no refresh */
function readScreen(page) {
  return page.evaluate(() => {
    const host = document.querySelector('.chunk-host');
    const after = document.querySelector('.rally-after');
    return {
      spinner: !!document.querySelector('.chunk-host .panel-loading'),
      hostText: host ? (host.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200) : '',
      sealed: !!document.querySelector('.rally-sealed'),
      counter: !!document.querySelector('.rally-counter-text'),
      continueBtn: !!document.querySelector('.rally-continue'),
      afterAttached: !!(after && document.body.contains(after)),
      afterText: after ? (after.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160) : ''
    };
  });
}

async function boot(page) {
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
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /Scoreboard Engineer/i.test(e.textContent));
    if (t) t.click();
  });
  await sleep(2200);
}

(async () => {
  /* ---------- 1. pin the control to the code that actually shipped ---------- */
  console.log('== the pre-fix control, pinned to ' + PIN + ' ==');
  const before = execFileSync('git', ['-C', REPO, 'show', PIN + ':ks3-dt/platform/engines.js'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const shipped = /ctx\.awardBadge\(ctx\.chunk\.badge, detail\)\.then\(function \(\) \{ afterTransmit\(\); \}\);/.test(before);
  check(shipped, PIN + ' really did answer the badge with a bare afterTransmit() - that is the wedge, in the shipped file');
  check(!/remountChunk/.test(before), PIN + ' had no remountChunk, so removing it at runtime IS the pre-fix path');
  const now = fs.readFileSync(path.join(REPO, 'ks3-dt/platform/engines.js'), 'utf8');
  check(/if \(App\.remountChunk\) App\.remountChunk\(\); else afterTransmit\(\);/.test(now),
    'the fix is guarded, so the control can select the old branch without editing a file');

  const browser = await chromium.launch({ headless: true });

  /* ---------- 2. the control MUST reproduce the wedge ---------- */
  console.log('\n== control run: the pre-fix branch ==');
  const ctlPage = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const ctlErrs = [];
  ctlPage.on('pageerror', e => ctlErrs.push('PAGEERROR ' + e.message));
  await boot(ctlPage);
  const ctlReached = await toRally(ctlPage, 'control');
  check(ctlReached, 'control run reached the Rally console');
  let ctl = null;
  if (ctlReached) {
    await ctlPage.evaluate(() => { delete window.App.remountChunk; });  // become cacd072
    const sent = await transmit(ctlPage);
    check(sent, 'control run transmitted a score');
    await sleep(2500);
    ctl = await readScreen(ctlPage);
    console.log('  control screen: ' + JSON.stringify(ctl));
    check(ctl.spinner && /Saving your badge/i.test(ctl.hostText),
      'CONTROL REPRODUCES THE WEDGE: the pupil is left on the "Saving your badge..." spinner');
    check(!ctl.sealed && !ctl.continueBtn,
      'CONTROL REPRODUCES THE WEDGE: no suspense room, no Continue - the lesson cannot be finished');
    await ctlPage.screenshot({ path: path.join(OUT, 'rally-control-wedge.png') });
  }
  await ctlPage.close();

  /* ---------- 3. the fixed path ---------- */
  console.log('\n== fixed run: the app exactly as it ships ==');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await boot(page);
  const reached = await toRally(page, 'fixed');
  check(reached, 'fixed run reached the Rally console');
  if (reached) {
    const sent = await transmit(page);
    check(sent, 'fixed run transmitted a score');
    await sleep(2500);
    const scr = await readScreen(page);
    console.log('  fixed screen: ' + JSON.stringify(scr));
    check(!scr.spinner, 'no "Saving your badge..." spinner is left on screen');
    check(scr.sealed, 'the suspense room is on screen, LIVE, with no refresh');
    check(scr.counter, 'the scores-landing counter is on screen (the reveal poller has something to write into)');
    check(scr.continueBtn, 'a Continue exists, so the lesson can be finished');
    check(scr.afterAttached, 'the rally-after box is attached to the live document, not a detached card');
    check(/SEALED|landing/i.test(scr.afterText), 'the suspense text really rendered: ' + JSON.stringify(scr.afterText.slice(0, 80)));
    await page.screenshot({ path: path.join(OUT, 'rally-fixed-suspense.png') });

    /* the poller must keep running against the LIVE box - the old bug also
       switched the reveal off, so a passing suspense room is not enough */
    await sleep(6000);
    const polling = await page.evaluate(() => {
      const t = document.querySelector('.rally-counter-text');
      return t ? (t.textContent || '') : '';
    });
    check(/reporting in|landing/i.test(polling), 'the reveal poller is alive and writing to the live counter: ' + JSON.stringify(polling));
  }
  check(errs.length === 0, 'zero console errors: ' + JSON.stringify(errs.slice(0, 3)));
  await page.close();
  await browser.close();

  console.log('');
  if (FAILS.length) { console.log('FAILURES:'); FAILS.forEach(f => console.log('- ' + f)); process.exit(1); }
  console.log('ALL RALLY WEDGE CHECKS PASSED (control reproduced the bug; the fix cleared it)');
})();
