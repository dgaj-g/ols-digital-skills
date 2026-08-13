#!/usr/bin/env node
/* sit-wrongpath.js — THE CONFUSED PUPIL (audit gap G3, ordered 11 Aug 2026).
 *
 * WHY IT EXISTS, from the record (DFM 194c): "sit-review is an EXPERT player —
 * it types a valid log every time, so no refusal state it never triggers could
 * ever fail; the checker only ever walked the happy path." That blindness is
 * structural. Damien found the mute lock because he did what a child does:
 * pressed the thing before he had done the thing.
 *
 * So this walker does the WRONG THING FIRST at every gate it meets — clicks the
 * locked control, submits the empty box, types three words where six are wanted
 * — and after each wrong move it asks the SAME question qa-no-mute-locks asks:
 * is there a visible explanation beside this control, IN THIS STATE? Then it
 * does the right thing and moves on, so it reaches every gate in the lesson.
 *
 * It writes nothing to a real class: it runs on the preview server against the
 * Demo-8A dev store, exactly like sit-review.js, and drives the page with DOM
 * clicks inside the document (Playwright's own click refuses mid-animation
 * elements, which is what stalled qa-no-mute-locks' first attempt).
 *
 * Usage:
 *   node sit-wrongpath.js 4                       (Lesson 4)
 *   node sit-wrongpath.js 5                       (Lesson 5)
 *   node sit-wrongpath.js 4 --expect-fail         (against the pre-fix build)
 *   node sit-wrongpath.js 4 --base http://localhost:8097
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { AUDIT, EXPLAIN_PX } = require('./qa-no-mute-locks.js');

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const LESSON = String(args.find(a => /^[45]$/.test(a)) || '4');
const BASE = argOf('--base', 'http://localhost:8121');
const EXPECT_FAIL = args.includes('--expect-fail');
/* match the tile by its LESSON NUMBER, not by a word in its title: the first
   version's Lesson-5 pattern matched Lesson 2's tile and the walker cheerfully
   tested the wrong lesson while printing PASS. */
const TILE = { 4: /Lesson\s*4(?!\d)/i, 5: /Lesson\s*5(?!\d)/i };   /* the tile reads "Lesson 5Game Studio" — no space, so \b never fires */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* WHAT "WRONG" MEANS AT EACH KIND OF GATE. Every one of these is a real thing a
   real 11-year-old does in the first ten seconds of meeting the screen. */
const WRONG = {
  /* free-text boxes: press the button with nothing typed, then with far too little */
  emptyThenThin: [
    { sel: '.case-log-input', thin: 'it was broke' },
    { sel: '.std-sig-input', thin: 'ab' },
    { sel: '.gal-rev-input', thin: 'good game' },
    { sel: 'textarea', thin: 'it was good' }
  ]
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const findings = [];
  const visited = [];
  /* the text-box battery runs ONCE per screen. It wipes the box when it is done
     (so the next gate is met fresh), and running it every loop meant the walker
     wiped the good answer it had just typed and bounced back to the board for
     ever — a walker that never leaves the first room proves nothing about the
     rest of the lesson. */
  const battered = new Set();
  const log = (m) => console.log('[wrongpath ' + LESSON + '] ' + m);

  /* ---- boot a fresh pupil, exactly as sit-review.js / qa-no-mute-locks do ---- */
  const URL = BASE + '/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
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
  await sleep(700);
  const opened = await page.evaluate((rx) => {
    const tile = Array.from(document.querySelectorAll('.tile')).find(e => new RegExp(rx, 'i').test(e.textContent));
    if (tile) { tile.click(); return (tile.textContent || '').trim().slice(0, 40); }
    return null;
  }, TILE[LESSON].source);
  if (!opened) { console.error('could not find the Lesson ' + LESSON + ' tile'); await browser.close(); process.exit(2); }
  await sleep(3000);
  log('opened: ' + opened.replace(/\s+/g, ' '));

  /* ---- THE WRONG MOVE BATTERY, run on whatever screen we are standing on ---- */
  async function beWrong(where) {
    /* (1) click every control that will not act, and demand an explanation */
    const before = await page.evaluate(AUDIT, EXPLAIN_PX);
    const clicked = await page.evaluate(() => {
      const vis = (e) => e && e.offsetParent !== null;
      const stuck = Array.from(document.querySelectorAll('.chunk-host button'))
        .filter(e => vis(e) && !e.classList.contains('ticked') &&
          (e.disabled === true || e.getAttribute('aria-disabled') === 'true' || e.classList.contains('locked')));
      stuck.forEach(e => { try { e.click(); } catch (x) { /* a disabled button may swallow it */ } });
      return stuck.map(e => (e.textContent || '').trim().slice(0, 50));
    });
    if (clicked.length) await sleep(700);
    const after = await page.evaluate(AUDIT, EXPLAIN_PX);
    after.forEach(b => findings.push(where + ': "' + b.label +
      '" will not act and nothing on screen says why — not before the click, and not after it'));
    if (clicked.length && !after.length) {
      log('  wrong move: clicked ' + clicked.length + ' locked control(s) — each explained itself');
    }
    if (before.length && !after.length) log('  (the click made the explanation appear — allowed, it is visible in that state)');

    /* (2) submit an empty box, then a far-too-thin answer */
    if (battered.has(where)) return;
    battered.add(where);
    for (const g of WRONG.emptyThenThin) {
      const has = await page.evaluate(s => {
        const e = document.querySelector('.chunk-host ' + s);
        return !!(e && e.offsetParent !== null);
      }, g.sel);
      if (!has) continue;
      for (const value of ['', g.thin]) {
        await page.evaluate((a) => {
          const e = document.querySelector('.chunk-host ' + a.s);
          if (!e) return;
          e.value = a.v;
          e.dispatchEvent(new Event('input', { bubbles: true }));
        }, { s: g.sel, v: value });
        await sleep(350);
        await page.evaluate(() => {
          const vis = (e) => e && e.offsetParent !== null;
          const b = Array.from(document.querySelectorAll('.chunk-host button'))
            .find(e => vis(e) && !e.classList.contains('ticked') &&
              /confirm-step|primary-btn|std-sign|std-doors|gal-file|std-ready/.test(e.className));
          if (b) { try { b.click(); } catch (x) { /* refused is the point */ } }
        });
        await sleep(650);
        const bad = await page.evaluate(AUDIT, EXPLAIN_PX);
        bad.forEach(b => findings.push(where + ' [' + (value ? 'three words typed' : 'nothing typed') +
          ']: "' + b.label + '" refuses and nothing beside it says what it wants'));
        if (!bad.length) log('  wrong move: ' + (value ? 'a three-word answer' : 'an empty box') +
          ' in ' + g.sel + ' — the refusal explains itself');
      }
      /* leave the box empty again: the next screen's own gate should be met fresh */
      await page.evaluate(s => {
        const e = document.querySelector('.chunk-host ' + s);
        if (e) { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }
      }, g.sel);
    }
  }

  /* ---- the RIGHT move, so the walk reaches the next gate ---- *
   * Deliberately the same shapes sit-review.js uses. This walker's job is not
   * to finish the lesson with a good score — it is to stand on every gate. */
  async function goRight() {
    return page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const vis = (e) => e && e.offsetParent !== null;
      const pop = q('.badge-pop button'); if (pop) { pop.click(); return 'badge'; }
      const skip = q('.intro-skip'); if (vis(skip)) { skip.click(); return 'intro-skip'; }
      /* fill anything that wants words, honestly and at length */
      /* `input[type=text]` does NOT match `<input class="case-log-input">`: an
         attribute selector needs the attribute to be PRESENT, and this one has no
         type at all. That one missing selector meant the walker never typed the
         case log, so the tick never unlocked and it bounced between the board and
         Case 01 for ninety loops while reporting PASS. */
      const ta = Array.from(document.querySelectorAll(
        '.chunk-host textarea, .chunk-host input[type=text], .chunk-host input:not([type])'))
        .filter(vis).find(e => !e.value || e.value.split(/\s+/).filter(Boolean).length < 6);
      if (ta) {
        ta.value = ta.classList.contains('std-sig-input')
          ? 'Pixel Otter Studio'
          : 'the code that moves it to the right was missing, so I put that block back in';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        return 'typed:' + (ta.className || 'input').split(' ')[0];
      }
      const opt = Array.from(document.querySelectorAll('.chunk-host .opt:not(.chosen)')).filter(vis)[0];
      if (opt) { opt.click(); return 'answer'; }
      /* Lesson 5's first real gate is a CHOICE of contract, and it is a card,
         not a button with a primary class — without this the walk stopped dead
         at the contracts desk and reported three screens as if that were the
         lesson. */
      const pick = Array.from(document.querySelectorAll('.chunk-host .std-contract:not(.signed)')).filter(vis)[0];
      if (pick) { pick.click(); return 'contract:' + (pick.getAttribute('data-c') || ''); }
      const cta = q('.dossier-cta'); if (vis(cta) && !cta.hidden) { cta.click(); return 'dossier-cta'; }
      const conf = q('.confirm-step:not(.ticked):not([disabled]):not(.locked)');
      if (vis(conf)) { conf.click(); return 'confirm'; }
      /* board pins, in the order a pupil is TOLD to use them: get the game
         first, then the cases, then the release desk. The Detective's Handbook
         (the film) is skipped on purpose — it is a 6-minute video and it is not
         a gate; the walker's job is the places the lesson says NO. */
      const pins = Array.from(document.querySelectorAll('.chunk-host button.case-pin:not([disabled])'))
        .filter(vis).filter(e => e.getAttribute('data-view') !== 'handbook');
      const intake = pins.find(e => e.getAttribute('data-view') === 'intake' && !e.classList.contains('done'));
      /* a CLOSED case is still clickable — she can re-read it — so the walker
         must prefer an unclosed one, or it re-opens Case 01 for ever and never
         meets Case 02's gates. (It did exactly that, while printing PASS.) */
      const pin = intake ||
        pins.find(e => e.classList.contains('case-file') && !e.classList.contains('closed')) ||
        pins.find(e => e.getAttribute('data-view') === 'release') || null;
      if (pin) { pin.click(); return 'pin:' + (pin.getAttribute('data-view') || (pin.textContent || '').trim().slice(0, 22)); }
      /* NEVER take a way OUT while there is a way ON. The first walk spent
         ninety loops going board -> Evidence Intake -> "Back to the board",
         because a back button is a .primary-btn like any other. A walker that
         keeps leaving the room proves nothing about the rest of the lesson. */
      const isBack = (e) => /back to|←|&larr;|return to/i.test((e.textContent || ''));
      const btns = Array.from(document.querySelectorAll(
        '.chunk-host .primary-btn:not([disabled]):not(.locked), .chunk-host .ghost-btn:not([disabled])')).filter(vis);
      const on = btns.filter(e => !isBack(e))[0];
      if (on) { on.click(); return 'go:' + (on.textContent || '').trim().slice(0, 24); }
      const back = btns[0];
      if (back) { back.click(); return 'back:' + (back.textContent || '').trim().slice(0, 24); }
      return 'stuck';
    });
  }

  const MAX = 90;
  let stuckRuns = 0;
  for (let i = 0; i < MAX; i++) {
    const where = await page.evaluate(() => {
      const h = document.querySelector('.chunk-host .card h2, .chunk-host h2');
      return (h ? h.textContent : (document.title || 'screen')).trim().slice(0, 46);
    });
    if (visited[visited.length - 1] !== where) { visited.push(where); log('screen: ' + where); }
    await beWrong(where);
    const moved = await goRight();
    /* 'stuck' is usually just EARLY — a card that renders on a timer, a badge
       popping, a chunk still mounting. qa-no-mute-locks learned the same lesson:
       wait and look again rather than declaring the walk over. */
    if (moved === 'stuck') {
      stuckRuns++;
      if (stuckRuns === 3) log('  (nothing to click yet — waiting)');
      if (stuckRuns > 8) { log('  walk ends: nothing actionable for 8 looks'); break; }
      await sleep(1100);
      continue;
    }
    stuckRuns = 0;
    await sleep(750);
  }

  const shot = path.join(__dirname, 'qa-l2-l5-review', 'l4-sit-fixes',
    'wrongpath-l' + LESSON + (EXPECT_FAIL ? '-prefix' : '') + '.png');
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot, fullPage: true });
  await browser.close();

  /* HONEST COVERAGE. This walker reaches the screens it can drive itself to;
     it is not a claim to have walked the whole lesson, and saying so is the
     point — a harness that overstates its reach is the false assurance this
     round exists to remove. Distinct screens, and what it never stood on. */
  const distinct = Array.from(new Set(visited));
  console.log('\nSCREENS THE CONFUSED PUPIL STOOD ON (' + distinct.length + ' distinct, ' +
    visited.length + ' visits):');
  distinct.forEach(v => console.log('   · ' + v));
  console.log('  gates tested per screen: every unactionable control clicked; every text box ' +
    'submitted empty and then with three words.');
  if (consoleErrors.length) {
    console.log('\nCONSOLE ERRORS (' + consoleErrors.length + '):');
    consoleErrors.slice(0, 6).forEach(e => console.log('   ! ' + e.slice(0, 160)));
  }

  const uniq = Array.from(new Set(findings));
  if (EXPECT_FAIL) {
    if (!uniq.length) {
      console.error('\nCONTROL FAILED: --expect-fail was asked for and every refusal on this build ' +
        'explained itself. A harness cannot be credited with catching what it does not catch.');
      process.exit(1);
    }
    console.log('\nCONTROL OK — the pre-fix build fails the confused pupil. ' + uniq.length + ' finding(s):');
    uniq.forEach(f => console.log('  ✗ ' + f));
    process.exit(0);
  }
  if (uniq.length) {
    console.error('\nsit-wrongpath ' + LESSON + ': ' + uniq.length + ' FAILURE(S)');
    uniq.forEach(f => console.error('  ✗ ' + f));
    process.exit(1);
  }
  console.log('\nsit-wrongpath ' + LESSON + ': PASS — every refusal on the walked path explained itself, ' +
    'in the state the pupil was actually in.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
