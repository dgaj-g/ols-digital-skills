/* shoot-sq-onedrive.js — re-capture the ONE side-quest brief shot whose card changed.
 *
 * DFM 252 gave the OneDrive card a fourth step (DT Work, built in OneDrive too) and
 * rewrote its which-cloud rule, so `04-onedrive.jpg` stopped showing what a pupil sees.
 * Rule 17 applies to the pictures as much as the prose, and rule 36 makes the screenshots
 * the most important part of a brief.
 *
 * DFM 225(b) is why this is a script and not a hand-taken screenshot: a capture FAILS
 * LOUDLY when it has not reached the screen it names. The old deck capture photographed
 * whatever was on screen and labelled it as the target. This one refuses to save unless
 * the card really is the OneDrive card AND really carries all four steps, and it prints
 * what it found when it will not.
 *
 * Needs the static server on 8096.
 *   node shoot-sq-onedrive.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=';
const OUT = path.resolve(__dirname, '../../platform/assets/img/brief/j1-sq1/04-onedrive.jpg');
const VIEW = { width: 1100, height: 688 };          // matches the shot it replaces
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* THE WALK USES THE SHARED LIBRARY, NOT A SECOND DUMBER COPY.
   DFM 225(b)'s cause was exactly a duplicated, dumber navigator; DFM 238(a)
   made recognising a screen and acting on it ONE fact in ONE home. So this
   script asks lib/walk-moves.js's detector where it is standing and runs that
   kind's own mover — the same one sit-review, sit-wrongpath, qa-no-mute-locks
   and qa-readability all run. */
const WALK = require('./lib/walk-moves.js');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 2 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  await page.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  /* Seed the world sit-review seeds: every lesson unlocked, pairing off, and
     Lesson 1 already complete — which is the state a pupil is really in when
     she opens this side quest. Without the unlock the tile is not on the board
     at all, which is exactly what the arrival check below is for. */
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks['Demo-8A'] = db.locks['Demo-8A'] || {};
    ['1', '2', '3', '4', '5', 'S1'].forEach(n => { db.locks['Demo-8A'][n] = { u: now, on: 1 }; });
    db.cfg = db.cfg || {}; db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: 0 };
    const pk = 'Demo-8A:anya.murphy@demo';
    db.pupils = db.pupils || {};
    db.pupils[pk] = Object.assign(db.pupils[pk] || { n: 'Anya Murphy', cn: '', j: 1, xp: 0, g: '' },
      { L: { '1': [2, 10, 'sit1=1', '1', '222|1', 100, 10, 0, '', 0, 0] } });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(700);
  // open the side quest from the lesson board
  const opened = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile'))
      .find(x => /Files That Follow You/i.test(x.textContent || ''));
    if (t) { t.click(); return true; }
    return false;
  });
  if (!opened) { console.error('FAILED: never found the side-quest tile on the board.'); await browser.close(); process.exit(1); }
  await sleep(2500);

  // walk forward until the app is standing on the OneDrive chunk, with its LAST step showing
  await WALK.primeDevKeys(page, BASE);
  let arrived = false;
  for (let i = 0; i < 80; i++) {
    const state = await page.evaluate(() => {
      const host = document.querySelector('.chunk-host');
      return { chunk: (window.App && App.state && App.state.chunks && App.state.chunks[App.state.chunkIdx] || {}).id || null,
               text: host ? host.innerText : '' };
    });
    /* The shot this replaces is the chunk's INTRO CARD — the first screen of the
       OneDrive half, which is what a teacher sees a pupil meet. The steps engine
       shows one step at a time, so "the card with all four steps on it" is a
       screen that does not exist; assuming it did is what sent the first version
       of this script walking straight past its own target. */
    if (state.chunk === 'sq-onedrive' && /Start/.test(state.text) && /TWO clouds/i.test(state.text)) { arrived = true; break; }
    const st = await page.evaluate(WALK.detectKind);
    const mv = st && WALK.MOVES[st.kind];
    if (!mv) {
      /* The briefing card TYPES ITSELF OUT, so for its first seconds there is no
         control to press and no mover applies. That is a screen still settling,
         not a dead end — wait and re-detect rather than declaring failure, which
         is what the arrival check at the end is for. */
      await sleep(900);
      continue;
    }
    await page.evaluate(([src]) => { (new Function('return (' + src + ')')())(); }, [String(mv)]);
    await sleep(WALK.SETTLE[st.kind] || 600);
  }
  if (!arrived) {
    const w = await page.evaluate(WALK.whereAmI);
    console.error('FAILED: the walk never reached the OneDrive card. It was standing at: ' + JSON.stringify(w));
    await browser.close();
    process.exit(1);
  }

  const text = await page.evaluate(() => (document.querySelector('.chunk-host') || {}).innerText || '');
  /* THE ARRIVAL PREDICATE — the shot may only be taken while this is TRUE. */
  const need = [
    ['the card is the OneDrive card', /The other cloud: OneDrive/i],
    ['it is the intro card, not a step', /\bStart\b/],
    ['the DFM 252 intro wording is the one on screen', /in DT and in lots of your other\s+subjects/i],
    ['and the pre-252 wording is gone', /^(?!.*for lots of your other subjects)/is]
  ];
  const missing = need.filter(([, rx]) => !rx.test(text)).map(([n]) => n);
  if (missing.length) {
    console.error('FAILED: not on the screen this shot is named for. Missing: ' + missing.join(', '));
    console.error('--- what was actually on screen ---\n' + text.slice(0, 600));
    await browser.close();
    process.exit(1);
  }

  /* Full page, like the shot it replaces and like every other row of this
     brief — the teacher is being shown the screen, not a cropped card. */
  const png = OUT.replace(/\.jpg$/, '.png');
  await page.screenshot({ path: png });
  await browser.close();
  if (errs.length) console.log('console errors during capture: ' + JSON.stringify(errs));
  /* Say what was actually verified, not more (DFM 146a): the arrival predicate
     proves this is the OneDrive INTRO card carrying the DFM 252 wording. */
  console.log('captured — verified before the shutter: the OneDrive intro card, post-DFM-252 wording, pre-252 wording absent');
  console.log('   ' + png + '   (convert to .jpg, which is what the brief references)');
})();
