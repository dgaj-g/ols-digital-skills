/* qa-review-jump.js - the finished-lesson rail must let a pupil jump, and must
 * NOT let her skip anything during a live run.
 *
 * DAMIEN, 3 Aug 2026: "once they complete a lesson and they want to go back to
 * that lesson and perhaps just check out a small section of it, example, the
 * rules ... are they going to have to go through all the Work again?"
 * Answer: no longer. In REVIEW mode every rail dot is a button.
 *
 * The dangerous half is the CONTROL: badges are completed in turn (DFM 37/41),
 * so a live run must still have a dead rail. Both halves are asserted here.
 *
 * Needs the static server on 8096 (config digital-skills-l4).
 *   node qa-review-jump.js
 */
const path = require('path');
const { chromium } = require('playwright');

const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}

async function boot(page, complete) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate((done) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks['Demo-8A']['1'] = { u: now, on: 1 };
    db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: 0 };
    db.pupils = db.pupils || {};
    const p = db.pupils['Demo-8A:anya.murphy@demo'] ||
      { n: 'Anya Murphy', cn: 'Scarlet Cascade', j: 1, xp: 0, g: '' };
    /* state 2 = COMPLETED, which is what puts the lesson into review mode */
    p.L = done ? { '1': [2, 110, 'sit1=1', '1', '222|0', 100, 8, 0, '', 0, 0] } : {};
    db.pupils['Demo-8A:anya.murphy@demo'] = p;
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, complete);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(700);
  await page.evaluate(() => {
    const tile = Array.from(document.querySelectorAll('.tile')).find(e => /Mission Control/.test(e.textContent));
    if (tile) tile.click();
  });
  await sleep(3000);
}

const state = page => page.evaluate(() => {
  const s = window.App.state;
  return {
    review: !!s.review,
    idx: s.chunkIdx,
    chunk: s.chunks[s.chunkIdx] && s.chunks[s.chunkIdx].id,
    titles: s.chunks.map(c => c.title),
    jumps: document.querySelectorAll('#chunk-rail .rail-jump').length,
    dots: document.querySelectorAll('#chunk-rail .rail-dot').length,
    label: (document.getElementById('rail-label') || {}).textContent || null
  };
});

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('\n== A. a FINISHED lesson: the rail is the way back in ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await boot(page, true);
  let s = await state(page);
  check(s.review, 'the completed lesson re-opened in review mode');
  check(s.dots > 0 && s.jumps === s.dots, 'every rail dot is a real button (' + s.jumps + '/' + s.dots + ')');
  check(!!s.label && /click any dot/i.test(s.label), 'a line under the rail says what the dots do: ' + JSON.stringify(s.label));
  check(/You are on:/.test(s.label || ''), 'and it names the part she is on');

  /* the actual thing he asked for: jump to the rules without walking the hour */
  const rulesIdx = s.titles.findIndex(t => /Account and the Rules/i.test(t || ''));
  check(rulesIdx > 1, 'the rules are several parts in (index ' + rulesIdx + '), so this is a real skip');
  await page.evaluate(i => document.querySelectorAll('#chunk-rail .rail-jump')[i].click(), rulesIdx);
  await sleep(1800);
  s = await state(page);
  check(s.idx === rulesIdx && s.chunk === 'b1-login',
    'clicking that dot landed straight on the rules (' + s.chunk + ')');
  const onScreen = await page.evaluate(() => document.querySelector('#chunk-host').textContent || '');
  check(/Account and the Rules|password/i.test(onScreen), 'and the rules card is really on screen');

  /* and back out again, to a LATER part - jumping works in both directions */
  await page.evaluate(() => document.querySelectorAll('#chunk-rail .rail-jump')[0].click());
  await sleep(1600);
  s = await state(page);
  check(s.idx === 0, 'she can jump backwards too (now on ' + s.chunk + ')');

  /* a celebration pop must not survive the jump (found while verifying on 3 Aug:
     the clearance pop was left floating over the card she jumped to) */
  await page.evaluate(() => {
    const ov = document.createElement('div');
    ov.className = 'badge-pop show';
    ov.innerHTML = '<div class="badge-pop-card"><h2>Clearance upgraded</h2></div>';
    document.body.appendChild(ov);
  });
  await sleep(200);
  check(await page.evaluate(() => !!document.querySelector('.badge-pop')), 'a celebration pop is on screen');
  await page.evaluate(() => document.querySelectorAll('#chunk-rail .rail-jump')[5].click());
  await sleep(900);
  check(!(await page.evaluate(() => !!document.querySelector('.badge-pop'))),
    'jumping took the celebration pop down with it - nothing is orphaned over the new card');

  /* DAMIEN, 3 Aug 2026: a re-read must LOOK like a re-read. Gold banner, gold
     label, a badge she already holds saying so, and no claim that anything is
     being saved (nothing is). */
  const look = await page.evaluate(() => {
    const b = document.getElementById('review-banner');
    const l = document.getElementById('rail-label');
    return {
      bannerShown: !!(b && !b.hidden),
      bannerSaysDone: !!(b && /ALREADY COMPLETED/i.test(b.textContent || '')),
      bannerSaysNothingSaved: !!(b && /nothing is saved/i.test(b.textContent || '')),
      bannerGold: b ? getComputedStyle(b.querySelector('.review-banner-text')).color : '',
      labelGold: l ? getComputedStyle(l).color : '',
      labelSize: l ? parseFloat(getComputedStyle(l).fontSize) : 0
    };
  });
  const GOLD = 'rgb(255, 216, 77)';
  check(look.bannerShown, 'a banner is on screen for the whole re-read, not a toast that vanishes');
  check(look.bannerSaysDone, 'it says ALREADY COMPLETED');
  check(look.bannerSaysNothingSaved, 'and that nothing is saved');
  check(look.bannerGold === GOLD, 'the banner is gold, not shell-coloured (' + look.bannerGold + ')');
  check(look.labelGold === GOLD, 'the rail label is gold too (' + look.labelGold + ')');
  check(look.labelSize >= 14, 'and larger than it was (' + look.labelSize + 'px, was 13.1)');

  const badge = await page.evaluate(async () => {
    window.App.badgeCelebration({ name: 'Test', icon: 'assets/badges/shield.png', xp: 0, already: true });
    await new Promise(r => setTimeout(r, 500));
    const c = document.querySelector('.badge-pop-card');
    const o = { h: c.querySelector('h2').textContent, xp: !!c.querySelector('.badge-pop-xp') };
    const p = document.querySelector('.badge-pop'); if (p) p.remove();
    return o;
  });
  check(/already have this badge/i.test(badge.h),
    'a badge she already holds does NOT say "Badge earned" again (' + JSON.stringify(badge.h) + ')');
  check(!badge.xp, 'and no XP is shown for it');

  const leave = await page.evaluate(() => {
    const src = window.App.leaveLesson ? String(window.App.leaveLesson) : '';
    return { review: !!window.App.state.review };
  });
  check(leave.review, 'still in review mode after all of that');

  /* review must still write nothing - the whole reason jumping is safe */
  const before = await page.evaluate(() => JSON.stringify(localStorage.getItem('ks3dt-dev')).length);
  await page.evaluate(() => document.querySelectorAll('#chunk-rail .rail-jump')[3].click());
  await sleep(1500);
  const after = await page.evaluate(() => JSON.stringify(localStorage.getItem('ks3dt-dev')).length);
  check(before === after, 'jumping around a finished lesson wrote nothing (' + before + ' -> ' + after + ')');
  await page.close();

  console.log('\n== B. CONTROL: a LIVE run must have a dead rail (DFM 37/41) ==');
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await boot(p2, false);
  const s2 = await state(p2);
  check(!s2.review, 'a first sitting is NOT review mode');
  check(s2.dots > 0 && s2.jumps === 0,
    'not one rail dot is clickable during a live run (' + s2.jumps + ' of ' + s2.dots + ')');
  check(!s2.label, 'and no jump label is shown');
  const tag = await p2.evaluate(() => {
    const d = document.querySelector('#chunk-rail .rail-dot');
    return d ? d.tagName : '(none)';
  });
  check(tag === 'SPAN', 'the live dots are inert spans, not buttons (got ' + tag + ')');
  const liveBanner = await p2.evaluate(() => {
    const b = document.getElementById('review-banner');
    return !!(b && !b.hidden);
  });
  check(!liveBanner, 'and the ALREADY COMPLETED banner is NOT shown on a first sitting');
  await p2.close();

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL REVIEW-JUMP CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
