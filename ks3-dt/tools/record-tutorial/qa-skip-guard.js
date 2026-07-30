/* qa-skip-guard.js - the 30 Jul 2026 live bug: a chunk could be SKIPPED FOREVER.
 *
 * Found by Damien on the deployed app, never by me, for one reason: the preview
 * saves in 180ms and Apps Script takes a second or two. In that gap the finished
 * activity was still on screen with its Finish button live, so the natural second
 * click advanced twice - marking the NEXT chunk complete without ever showing it.
 * Badge 2 and the whole Vault were lost that way, with no route back.
 *
 * So this harness runs the preview AT LIVE SPEED (dev-server's LATENCY rewritten
 * to 2s on the way through) and double-clicks like a pupil would. The CONTROL
 * serves the pinned pre-fix app.js + engines.js and must still lose a chunk.
 *
 *   node qa-skip-guard.js
 * Needs the preview on 8096 (launch config digital-skills-l4).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');

const ROOT = path.resolve(__dirname, '../../..');
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=';
const PREFIX_REF = process.env.KS3DT_SKIP_PREFIX_REF || '2f28033'; // last commit before this fix
const LIVE_LATENCY = 2000;   // measured shape of a real Apps Script round trip
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }
function gitShow(ref, rel) {
  return execSync('git -C "' + ROOT + '" show ' + ref + ':' + rel, { maxBuffer: 40 * 1024 * 1024 }).toString('utf8');
}

/* Serve the platform with a REAL-WORLD save delay, and optionally with the
   pre-fix client, so the control is the same scenario and not a different one. */
async function makePage(ctx, opts) {
  opts = opts || {};
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.route('**/platform/dev-server.js', route => {
    let body = opts.prefix ? gitShow(PREFIX_REF, 'ks3-dt/platform/dev-server.js')
      : fs.readFileSync(path.join(ROOT, 'ks3-dt/platform/dev-server.js'), 'utf8');
    body = body.replace('var LATENCY = 180;', 'var LATENCY = ' + LIVE_LATENCY + ';');
    route.fulfill({ status: 200, contentType: 'application/javascript', body: body });
  });
  if (opts.prefix) {
    for (const f of ['app.js', 'engines.js']) {
      const src = gitShow(PREFIX_REF, 'ks3-dt/platform/' + f);
      await page.route('**/platform/' + f, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: src }));
    }
  }
  page._errs = errs;
  return page;
}

/* every call now takes 2s, so wait for readiness rather than guessing */
async function ready(page, ms) {
  const until = Date.now() + (ms || 40000);
  while (Date.now() < until) {
    const ok = await page.evaluate(() => !!(window.App && window.App.state && window.App.state.man));
    if (ok) return true;
    await page.evaluate(() => { const x = document.querySelector('.intro-skip, .intro-overlay button'); if (x) x.click(); });
    await sleep(600);
  }
  return false;
}

async function boot(page, as) {
  await page.goto(BASE + as, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
    delete db.userProps;                      // clear any saved resume position
    delete db.rst;                            // ...and any reset stamp a previous run left behind,
                                              // which would otherwise wipe this run's draft
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const ok = await ready(page);
  await page.evaluate(() => { const x = document.querySelector('.intro-skip, .intro-overlay button'); if (x) x.click(); });
  await sleep(700);
  return ok;
}

const chunkNow = page => page.evaluate(() => {
  const s = window.App.state;
  return s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : '(none)';
});

/* Walk Badge 2 (the tour) to its very last question, leaving the Finish button
   on screen - the exact position Damien was in. */
async function toBadge2Finish(page) {
  await page.evaluate(() => window.App.openLesson('j1-01'));
  /* openLesson mounts, THEN its draft load resolves and re-seats the pupil at
     her resume position - so wait for the first chunk to actually be on screen
     before jumping, or the jump gets undone under us */
  for (let i = 0; i < 60 && !(await page.evaluate(() => !!document.querySelector('.dossier'))); i++) await sleep(500);
  await sleep(800);
  await page.evaluate(() => { window.App.state.chunkIdx = 2; window.App.nextChunk(); }); // -> b2-navigator
  for (let i = 0; i < 30 && !(await page.evaluate(() => !!document.querySelector('.chunk-host .intro-card'))); i++) await sleep(400);
  await sleep(600);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Follow the beacon/i.test(x.textContent));
    if (b) b.click();
  });
  await sleep(900);
  for (let i = 0; i < 12; i++) {   // through every tour stop
    const clicked = await page.evaluate(() => {
      const b = document.querySelector('.tour-callout button');
      if (b) { b.click(); return true; }
      return false;
    });
    if (!clicked) break;
    await sleep(400);
  }
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /^Go$/i.test(x.textContent.trim()));
    if (b) b.click();
  });
  await sleep(1200);
  for (let i = 0; i < 30; i++) {   // answer every question, stop ON the Finish card (2 steps each)
    const state = await page.evaluate(() => {
      const fin = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Finish/i.test(x.textContent));
      if (fin) return 'finish';
      const nxt = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /^Next$/i.test(x.textContent.trim()));
      if (nxt) { nxt.click(); return 'next'; }
      const opt = document.querySelector('.q-opt:not([disabled])');
      if (opt) { opt.click(); return 'answered'; }
      return 'none';
    });
    if (state === 'finish') return true;
    await sleep(state === 'answered' ? LIVE_LATENCY + 900 : 700);   // marking is a live round trip
  }
  console.log('     (walk stalled at: ' + JSON.stringify(await page.evaluate(() => ({
    chunk: window.App.state.chunks[window.App.state.chunkIdx].id,
    buttons: Array.from(document.querySelectorAll('.chunk-host button')).map(x => x.textContent.trim().slice(0, 22))
  }))) + ')');
  return false;
}

/* The pupil's own double-click: Finish, then Finish again while the save runs. */
async function doubleClickFinish(page) {
  await page.evaluate(() => {
    const fin = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Finish/i.test(x.textContent));
    if (fin) fin.click();
  });
  await sleep(120);
  await page.evaluate(() => {                       // the badge pop is up; dismiss it fast
    const b = document.querySelector('.badge-pop button');
    if (b) b.click();
  });
  await sleep(150);
  await page.evaluate(() => {                       // ...and the old Finish is still there
    const fin = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Finish/i.test(x.textContent));
    if (fin) fin.click();
  });
  /* a pupil clicks through whatever appears next, including a second badge pop
     - which is exactly how the skip completed itself in the room */
  for (let i = 0; i < 10; i++) {
    await sleep(700);
    await page.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); });
  }
  await sleep(LIVE_LATENCY + 2500);
}

(async () => {
  console.log('KS3 DT skip-guard harness - the 30 Jul live bug (save latency ' + LIVE_LATENCY + 'ms)');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  section('A. CONTROL - the pre-fix client really did lose a chunk');
  try {
    const old = await makePage(ctx, { prefix: true });
    await boot(old, 'cara');
    const reached = await toBadge2Finish(old);
    check(reached, 'CONTROL: reached Badge 2\'s Finish button');
    if (reached) {
      await doubleClickFinish(old);
      const where = await chunkNow(old);
      check(where !== 'b3-vault' && where !== 'b2-navigator',
        'CONTROL: pre-fix, the double-click SKIPPED past the Vault - landed on "' + where + '"');
      /* NOT asserted here: that the skip is PERMANENT. It is - Damien could not
         get back to the Vault on the live app, which is why a reset control had
         to be built - but this rig's draft write does not settle reliably enough
         to make it a check, and a check that passes for the wrong reason is
         worse than none. The skip itself, above, is the reproduction. */

    }
    await old.close();
  } catch (e) { check(false, 'CONTROL threw: ' + e.message); }

  section('B. FIXED - the same double-click lands on the next chunk, once');
  const page = await makePage(ctx, {});
  await boot(page, 'anya');
  const reached = await toBadge2Finish(page);
  check(reached, 'reached Badge 2\'s Finish button');
  if (reached) {
    await doubleClickFinish(page);
    const where = await chunkNow(page);
    check(where === 'b3-vault', 'the double-click advances exactly ONE chunk, to the Vault (got "' + where + '")');
    const done = await page.evaluate(() => (window.App.state.draft && window.App.state.draft.done) || []);
    check(done.indexOf('b3-vault') === -1, 'and the Vault is NOT marked complete: ' + JSON.stringify(done));
    check(done.indexOf('b2-navigator') !== -1, 'while the badge just finished IS recorded: ' + JSON.stringify(done));
  }
  /* and it holds in SAVED state, not just in memory: the skipped chunk must not
     be sitting in her stored progress, or a refresh would jump her past it.
     (Resume itself starts at the first chunk she has not done, so it is the
     stored list that decides, not where the tab happens to be.) */
  await sleep(LIVE_LATENCY + 2500);
  const stored = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
    const me = Object.keys(db.userProps || {}).find(e => /anya/.test(e));
    return ((db.userProps[me] || {}).draft || {})['1'] || {};
  });
  check((stored.done || []).indexOf('b3-vault') === -1,
    'her SAVED progress does not contain the Vault either: ' + JSON.stringify(stored.done || []));
  check((stored.done || []).indexOf('b2-navigator') !== -1,
    'while the badge she really finished is saved: ' + JSON.stringify(stored.done || []));
  check(page._errs.length === 0, 'zero console errors: ' + JSON.stringify(page._errs));

  section('C. "Start again" - the teacher can put a lesson back to the beginning');
  const before = await page.evaluate(() => ({
    done: (window.App.state.draft && window.App.state.draft.done) || [],
    xp: Number(window.App.state.xp)
  }));
  check(before.done.length > 0 && before.xp > 0, 'the pupil has progress and XP to lose (' + before.xp + ' XP)');
  const reset = await page.evaluate(() => window.App.call('admin', {
    passcode: 'demo', sub: 'resetLesson', className: 'Demo-8A', lessonNum: '1'
  }));
  check(reset && reset.ok, 'resetLesson returns ok: ' + JSON.stringify(reset));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.evaluate(() => { const x = document.querySelector('.intro-skip, .intro-overlay button'); if (x) x.click(); });
  await sleep(600);
  await page.evaluate(() => window.App.openLesson('j1-01'));
  for (let i = 0; i < 40 && !(await page.evaluate(() => !!(window.App.state.chunks && window.App.state.chunks.length))); i++) await sleep(500);
  await sleep(1500);
  const after = await page.evaluate(() => ({
    idx: Number(window.App.state.chunkIdx),
    chunk: window.App.state.chunks[window.App.state.chunkIdx].id,
    done: (window.App.state.draft && window.App.state.draft.done) || [],
    xp: Number(window.App.state.xp)
  }));
  check(after.idx === 0 && after.chunk === 'briefing',
    'the lesson opens at the very beginning again (' + after.chunk + ')');
  check(after.done.length === 0, 'her saved place is gone: ' + JSON.stringify(after.done));
  check(after.xp < before.xp, 'the XP earned in that lesson went back with it (' + before.xp + ' -> ' + after.xp + ')');
  await page.close();

  await browser.close();
  console.log('\n=========================================');
  console.log('CHECKS RUN: ' + (PASS + FAILS.length) + '   PASSED: ' + PASS + '   FAILED: ' + FAILS.length);
  if (FAILS.length) { FAILS.forEach(f => console.log('  FAILED: ' + f)); console.log('SKIP-GUARD CHECKS FAILED'); process.exit(1); }
  console.log('ALL SKIP-GUARD CHECKS PASSED');
})();
