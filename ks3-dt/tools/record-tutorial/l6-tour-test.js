#!/usr/bin/env node
/* l6-tour-test — The Operation (assets/l6/ui2.js), the spotlight tour on the LESSON route (deep check 25 Oct 2026).
   Spec §3.1 + DFM 322: Begin starts the six-step tour, once per pupil. On the lesson route her Begin is on the door page,
   which ends that stage; the operation stage opens at the table, so the tour must open there. Before the fix it never did.
   - fresh pupil opening the operation stage: the tour is up (five steps on her own, six with a partner: the partner step);
     the Nexts close it
   - opened again: no tour (once); the door stage: no tour; a seat sent to her partner's laptop (fallback B): no tour
   Firebase is blocked, so no room is ever written. Needs dev-static on :8131 (or --base).
   CONTROL: ui2.js live before the deep check (commit 38746c9, Version 72) must FAIL the first check.
   Usage: node l6-tour-test.js [--base http://localhost:8131] */
'use strict';
const pw = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path');
const args = process.argv.slice(2);
const BASE = args.indexOf('--base') >= 0 ? args[args.indexOf('--base') + 1] : 'http://localhost:8131';
const PAGE = BASE + '/ks3-dt/platform/assets/l6/operation.html';
const BEFORE = '38746c9';
let checks = 0, fails = 0;
function must(ok, what) { checks++; if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); return ok; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function open(ctx, H, oldUi) {
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message || e)));
  /* no Firebase at all: its files are refused, so the page goes straight to the shared-laptop fallback, as on a blocked link */
  await p.route(/\/vendor\/firebase-[a-z-]+\.js/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  if (oldUi) await p.route(/\/assets\/l6\/ui2\.js/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: oldUi }));
  await p.goto(PAGE + '#' + encodeURIComponent(JSON.stringify(H)), { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 15000 }).catch(() => {});
  await sleep(600);
  const s = await p.evaluate(() => ({
    active: !!(window.OPUI && OPUI.tour && OPUI.tour.active()),
    shown: !document.getElementById('tour').hidden,
    step: (document.getElementById('tourstep') || {}).textContent || '',
    away: !!document.getElementById('away') && !document.getElementById('away').hidden
  })).catch(e => ({ err: String(e) }));
  return { p, s, errs };
}

async function run(browser, oldUi, label) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const r = {};
  /* a fresh pupil on her own opens the operation stage */
  let o = await open(ctx, { stage: 'op', seat: 'A', seats: ['A'], room: null, seed: 5 }, oldUi);
  r.fresh = o.s; r.errs = o.errs.slice();
  if (o.s.active) {
    for (let i = 0; i < 6 && await o.p.evaluate(() => OPUI.tour.active()); i++) { await o.p.click('#tournext').catch(() => {}); await sleep(150); }
    r.closed = await o.p.evaluate(() => !OPUI.tour.active() && document.getElementById('tour').hidden && localStorage.getItem('op2.tour.seen') === '1');
  }
  await o.p.close();
  /* the same pupil opens it again (a reload, or a second operation stage): once only */
  o = await open(ctx, { stage: 'op', seat: 'A', seats: ['A'], room: null, seed: 5 }, oldUi); r.again = o.s; await o.p.close();
  await ctx.close();
  /* fresh pupils: the door page; a paired seat A; a seat B sent to her partner's laptop */
  const one = async H => { const c = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const x = await open(c, H, oldUi); await c.close(); return x; };
  r.door = (await one({ stage: 'door', seat: 'A', seats: ['A'], room: null, seed: 5 })).s;
  const pa = await one({ stage: 'op', seat: 'A', seats: ['A', 'B'], room: 'tourtest', seed: 5, fallback: 1 }); r.pairA = pa.s; r.errs.push(...pa.errs);
  const pb = await one({ stage: 'op', seat: 'B', seats: ['A', 'B'], room: 'tourtest', seed: 5, fallback: 1 }); r.fbB = pb.s; r.errs.push(...pb.errs);
  console.log('  ' + label + ': fresh ' + JSON.stringify(r.fresh) + ' · again ' + r.again.active + ' · door ' + r.door.active + ' · pair A ' + r.pairA.active + ' · fallback B tour ' + r.fbB.shown + ' away ' + r.fbB.away);
  return r;
}

(async () => {
  const browser = await pw.chromium.launch();
  try {
    const now = await run(browser, null, 'fixed code');
    must(now.fresh.active && now.fresh.shown && /Step 1 of 5/.test(now.fresh.step), 'a fresh pupil on her own opening the operation stage gets the tour, Step 1 of 5 (' + now.fresh.step + ')');
    must(now.closed === true, 'its Nexts close it and it is remembered');
    must(!now.again.active && !now.again.shown, 'opened again, no tour (it runs once)');
    must(!now.door.active, 'the door page has no tour');
    must(now.pairA.active && /Step 1 of 6/.test(now.pairA.step), 'a paired seat A (sharing the laptop on a slow link) gets the tour with the partner step, Step 1 of 6 (' + now.pairA.step + ')');
    must(!now.fbB.shown && now.fbB.away, 'a seat sent to her partner\'s laptop sees the away card, no tour over it');
    must(now.errs.length === 0, 'no page errors' + (now.errs.length ? ': ' + now.errs.slice(0, 3).join(' | ') : ''));
    let old = null;
    try { old = require('child_process').execSync('git show ' + BEFORE + ':ks3-dt/platform/assets/l6/ui2.js', { cwd: path.join(__dirname, '../../..'), stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) {}
    if (old) {
      const o = await run(browser, old, 'CONTROL code before the deep check');
      must(!o.fresh.active, 'CONTROL the old code never shows the tour on the lesson route');
    } else must(false, 'CONTROL: no old code to run against');
  } finally { await browser.close(); }
  console.log('\nl6-tour: ' + (fails ? 'FAIL · ' + fails + ' of ' + checks : 'PASS · ' + checks + ' checks'));
  process.exit(fails ? 1 : 0);
})();
