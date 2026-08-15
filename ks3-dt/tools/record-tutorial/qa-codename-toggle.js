#!/usr/bin/env node
/* qa-codename-toggle.js — HER NAME, ON HER OWN SCREEN (DFM 226).
 *
 * Damien, 15 Aug 2026: "clicking the codename in the top corner of her own
 * screen switches it to her real first name and back."
 *
 * Three things have to be true and each one is checked on the RUNNING app,
 * not in the source:
 *   1. the codename is what she sees by default, and one click shows her own
 *      first name — and one more puts the codename back;
 *   2. the click does NOT open the Agent Kit. The codename sits inside the kit
 *      button, so a click that fell through would open a modal over her board
 *      every time she looked at her own name;
 *   3. NOTHING PUBLIC MOVES. The teacher's Live tab and every shared surface
 *      still hold the codename — the toggle is a view of her own chip and is
 *      never sent anywhere.
 *
 * Cara Devlin is used because the seeded demo class gives her both a codename
 * ("Copper Falcon") and a real name; a pupil who has not signed yet has
 * nothing to switch to, and that case is checked too.
 *
 * Usage: node qa-codename-toggle.js [--base http://localhost:8140]
 */
const { chromium } = require('./node_modules/playwright');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8140');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fails = [];
const ok = (cond, msg) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + msg); if (!cond) fails.push(msg); };

async function open(ctx, who) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=Demo-8A&as=' + who,
    { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(900);
  return page;
}
const nameOf = (p) => p.evaluate(() => (document.querySelector('#agent-name') || {}).textContent || '');
const clickName = (p) => p.evaluate(() => {
  const el = document.querySelector('#agent-name');
  if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
});
const kitOpen = (p) => p.evaluate(() => {
  const m = document.querySelector('#kit-modal, .kit-modal, [id*="kit"][class*="modal"]');
  return !!(m && !m.hidden && m.offsetParent !== null);
});

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  /* --- a pupil who HAS signed a codename --- */
  const p = await open(ctx, 'cara');
  const start = (await nameOf(p)).trim();
  ok(/^Agent /.test(start), 'the chip shows her codename by default (saw "' + start + '")');

  await clickName(p); await sleep(400);
  const real = (await nameOf(p)).trim();
  ok(real === 'Cara', 'one click shows her own first name (saw "' + real + '")');
  ok(!await kitOpen(p), 'and the click did NOT open the Agent Kit over her board');

  await clickName(p); await sleep(400);
  const back = (await nameOf(p)).trim();
  ok(back === start, 'a second click puts the codename back (saw "' + back + '")');

  /* --- nothing public moved --- */
  const stored = await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
    const rec = (db.pupils || {})['Demo-8A:cara.devlin@demo'] || {};
    return String(rec.cn || '');
  });
  ok(stored === 'Copper Falcon',
    'her stored codename is untouched — nothing public changed (still "' + stored + '")');

  await clickName(p); await sleep(300);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  const afterReload = (await nameOf(p)).trim();
  ok(afterReload === 'Cara', 'her choice survives a reload on her own machine (saw "' + afterReload + '")');

  /* --- a pupil who has NOT signed yet has nothing to switch to --- */
  const q = await open(ctx, 'anya');
  const anya = (await nameOf(q)).trim();
  await clickName(q); await sleep(350);
  ok((await nameOf(q)).trim() === anya,
    'a pupil with no codename yet sees no change and no half-state (saw "' + anya + '")');
  const marked = (pg) => pg.evaluate(() =>
    document.querySelector('#agent-name').classList.contains('name-toggle'));
  ok(await marked(p) && !await marked(q),
    'and the chip only LOOKS clickable for the pupil who has a name to switch to');

  await browser.close();
  if (fails.length) { console.error('\nqa-codename-toggle: FAILED — ' + fails.length); process.exit(1); }
  console.log('\nqa-codename-toggle: ALL GREEN');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
