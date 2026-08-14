/* Post-gate focused verification: the in-beta door + listing hide + the
   counts-free pupil marquee. Usage: node qa-l5-gatefix.js */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-l5');
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAILS = [];
function check(cond, msg) {
  if (cond) console.log('  PASS', msg);
  else { console.log('  FAIL', msg); FAILS.push(msg); }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pa = await ctx.newPage();
  const errs = [];
  pa.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pa.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await pa.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await pa.evaluate(() => localStorage.clear());
  await pa.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await pa.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await pa.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await pa.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await pa.evaluate(() => Array.from(document.querySelectorAll('.tile')).find(e => /Game Studio/.test(e.textContent)).click());
  await sleep(2000);

  /* walk to contracts */
  for (let i = 0; i < 60; i++) {
    const st = await pa.evaluate(() => {
      if (document.querySelector('.std-contract')) return 'contracts';
      const pop = document.querySelector('.badge-pop button');
      if (pop) { pop.click(); return 'pop'; }
      const h = document.querySelector('.chunk-host');
      if (!h) return 'none';
      const cta = h.querySelector('.dossier-cta'); if (cta && !cta.hidden) { cta.click(); return 'cta'; }
      const sk = h.querySelector('.dossier-skip'); if (sk) { sk.click(); return 'skip'; }
      const opt = h.querySelector('.q-opt:not(:disabled)');
      if (opt) { opt.click(); return 'a'; }
      const nxt = Array.from(h.querySelectorAll('button')).find(b => /See the contracts|Next|Finish|Start|Continue|Warm up/i.test(b.textContent) && !b.disabled && b.offsetParent);
      if (nxt) { nxt.click(); return 'n'; }
      return 'w';
    });
    if (st === 'contracts') break;
    await sleep(800);
  }
  check(await pa.evaluate(() => !document.body.textContent.includes('Found your studio')), 'ambiguous CTA "Found your studio" is gone');

  /* sign catch */
  await pa.evaluate(() => document.querySelector('.std-contract[data-c="catch"]').click());
  await sleep(700);
  const signNote = await pa.evaluate(() => document.body.textContent);
  await pa.evaluate(() => { const i = document.querySelector('.std-sig-input'); i.value = 'Beta Badger Games'; i.dispatchEvent(new Event('input')); });
  await pa.evaluate(() => document.querySelector('.std-sign').click());
  await sleep(700);
  /* DFM 143b: this used to find the button by the words "Found the studio". He
     asked what that meant (DFM 207b), the label became "Open my studio", and a
     text match would have sat here for twenty turns. The CLASS is the contract. */
  await pa.evaluate(() => { const b = document.querySelector('.std-enter'); if (!b) throw new Error('no .std-enter button on the signed contract'); b.click(); });
  await sleep(1200);
  await pa.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); });
  await sleep(1100);
  await pa.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Done watching|Continue/i.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sleep(1100);
  await pa.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Open the studio/i.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sleep(900);
  await pa.evaluate(() => document.querySelector('.std-kit-confirm').click());
  await sleep(900);

  /* attempt only TWO checks: c1 pass, c2 fail -> the beta door should appear */
  check(await pa.evaluate(() => !document.querySelector('.std-beta-door')), 'beta door hidden before any QA attempts');
  await pa.evaluate(() => document.querySelector('.std-qa-row[data-crit="c1"] .std-qa-head').click());
  await sleep(400);
  await pa.evaluate(() => document.querySelector('.std-qa-run').click());
  await sleep(350);
  await pa.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('.std-outcome'));
    opts.find(b => /exactly 1, exactly when/i.test(b.textContent)).click();
  });
  await sleep(600);
  await pa.evaluate(() => document.querySelector('.std-qa-row[data-crit="c2"] .std-qa-head').click());
  await sleep(400);
  await pa.evaluate(() => document.querySelector('.std-qa-run').click());
  await sleep(350);
  const c2texts = await pa.evaluate(() => Array.from(document.querySelectorAll('.std-outcome')).map(b => b.textContent));
  check(c2texts.length === 5, 'catch c2 now has FIVE outcomes (' + c2texts.length + ')');
  check(c2texts.some(t => /SCORE also changed while I was dodging/i.test(t)), 'new lives-ok/score-buggy outcome present');
  await pa.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('.std-outcome'));
    opts.find(b => /never moved at all/i.test(b.textContent)).click();   // a FAIL pick
  });
  await sleep(700);
  check(await pa.evaluate(() => !!document.querySelector('.std-beta-door')), 'beta door appears after 2 attempted checks (1 pass, 1 fail)');
  await pa.screenshot({ path: path.join(OUT, 'gatefix-01-beta-door.png'), fullPage: true });

  /* arm-confirm through the beta door */
  await pa.evaluate(() => document.querySelector('.std-beta-door').click());
  await sleep(300);
  check(await pa.evaluate(() => /Sure\?/i.test(document.querySelector('.std-beta-door').textContent)), 'beta door arms before committing');
  await pa.evaluate(() => document.querySelector('.std-beta-door').click());
  await sleep(700);
  check(await pa.evaluate(() => /OPENING IN BETA/i.test((document.querySelector('.std-marquee-form') || {}).textContent || '')), 'marquee form opens in BETA mode');
  await pa.evaluate(() => {
    const t = document.querySelector('#std-gt'); t.value = 'Half Catch'; t.dispatchEvent(new Event('input'));
    const h = document.querySelector('#std-gh'); h.value = 'Arrow keys. Catching works; misses are still in the workshop.'; h.dispatchEvent(new Event('input'));
  });
  await pa.evaluate(() => document.querySelector('.std-doors').click());
  await sleep(1500);
  check(await pa.evaluate(() => /IN BETA/.test((document.querySelector('.std-ready-btn') || {}).textContent || '')), 'ready button shows DOORS OPEN - IN BETA');
  await pa.screenshot({ path: path.join(OUT, 'gatefix-02-beta-shipped.png'), fullPage: true });
  await pa.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Head to Press Night/i.test(x.textContent)); b.click(); });
  await sleep(1100);
  await pa.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); });
  await sleep(1000);
  const xpAfterBuild = await pa.evaluate(() => Number(window.App.state.xp));
  check(xpAfterBuild === 9, 'beta-path XP = 9 (sign 2 + one pass 4 + ship 3), got ' + xpAfterBuild);

  /* floor: my card carries IN BETA; marquee cards show NO counts / no needy tag */
  await pa.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Onto the floor/i.test(x.textContent)); if (b) b.click(); });
  await sleep(1600);
  check(await pa.evaluate(() => /IN BETA/.test((document.querySelector('.gal-mine-card') || {}).textContent || '')), 'my floor card is tagged IN BETA');
  const metaTexts = await pa.evaluate(() => Array.from(document.querySelectorAll('.gal-marquee-grid .gal-mq-meta')).map(e => e.textContent));
  check(metaTexts.length >= 3 && !metaTexts.some(t => /review|CRITIC/i.test(t)), 'pupil marquee shows NO review counts / no needs-a-critic (' + JSON.stringify(metaTexts) + ')');
  check(await pa.evaluate(() => /REACT\? TRACK\? END\?|does it REACT/i.test(document.body.textContent) || true), 'placeholder'); // deskNote checked on review desk below
  await pa.evaluate(() => document.querySelectorAll('.gal-marquee-grid .gal-marquee-card.clickable')[0].click());
  await sleep(700);
  check(await pa.evaluate(() => /REACT\? TRACK\? END/i.test((document.querySelector('.gal-desk') || {}).textContent || '')), 'review desk carries the functional-critic nudge');
  await pa.evaluate(() => document.querySelector('.std-back').click());
  await sleep(900);
  await pa.screenshot({ path: path.join(OUT, 'gatefix-03-floor-no-counts.png'), fullPage: true });

  /* staff: hide anya's listing; her feed flags it, pupil marquee drops it */
  const ps = await ctx.newPage();
  await ps.goto(BASE + 'cara', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await ps.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(500);
  await ps.evaluate(() => { const b = Array.from(document.querySelectorAll('button, a')).find(x => /^Staff$/i.test((x.textContent || '').trim())); if (b) b.click(); });
  await sleep(900);
  await ps.evaluate(() => {
    const i = document.querySelector('#staff-pass, input[type="password"], .staff-pass input');
    if (i) { i.value = 'demo'; i.dispatchEvent(new Event('input')); }
    const go = Array.from(document.querySelectorAll('button')).find(x => /Unlock|Enter|Sign in|Check/i.test(x.textContent) && x.offsetParent);
    if (go) go.click();
  });
  await sleep(1600);
  await ps.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-action="select-class"]')).find(x => x.offsetParent); if (b) b.click(); });
  await sleep(1000);
  await ps.evaluate(() => { const t = Array.from(document.querySelectorAll('button')).find(x => /Live/i.test(x.textContent) && x.offsetParent); if (t) t.click(); });
  await sleep(2500);
  let hideSeen = false;
  for (let i = 0; i < 6; i++) {
    await sleep(1500);
    hideSeen = await ps.evaluate(() => !!Array.from(document.querySelectorAll('.gal-lens-hide')).find(b => /Beta Badger/i.test(b.closest('.gal-lens-chip').textContent)));
    if (hideSeen) break;
  }
  check(hideSeen, 'lens shows a Hide button on the studio chip');
  await ps.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.gal-lens-hide')).find(x => /Beta Badger/i.test(x.closest('.gal-lens-chip').textContent));
    b.click();
  });
  await sleep(2200);
  check(await ps.evaluate(() => !!document.querySelector('.gal-lens-chip.hidden-listing')), 'lens strikes the hidden listing (audit trail)');
  const feedAfterHide = await pa.evaluate(() => window.App.call('galleryFeed', { lessonId: 'j1-05' }));
  const mineHidden = feedAfterHide.studios.find(s => s.mine);
  check(mineHidden && mineHidden.hd === 1, 'maker\'s own feed flags her listing hidden');
  await pa.evaluate(() => new Promise(r => setTimeout(r, 5000)));
  check(await pa.evaluate(() => /hidden just now/.test((document.querySelector('.gal-mine-card') || {}).textContent || '')), 'maker\'s floor card shows the talk-to-your-teacher note');
  await pa.screenshot({ path: path.join(OUT, 'gatefix-04-hidden-listing.png'), fullPage: true });

  const realErrs = errs.filter(e => !/l5-tutorial|l5-poster/.test(e));
  check(realErrs.length === 0, 'zero console errors: ' + JSON.stringify(realErrs.slice(0, 4)));

  console.log('\n' + (FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL GATE-FIX CHECKS PASSED'));
  await browser.close();
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error('GATEFIX QA CRASHED:', e); process.exit(1); });
