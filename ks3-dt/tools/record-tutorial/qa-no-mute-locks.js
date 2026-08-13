#!/usr/bin/env node
/* qa-no-mute-locks.js — DFM_ENFORCEMENT_AUDIT gap G2, ordered by Damien 11 Aug 2026.
 *
 * THE RULE IT ENFORCES (DFM 42/85/161, and 192f/193a which wrote it in blood):
 * a pupil-facing control that will not act must SAY WHY, on screen, beside
 * itself, in the state the pupil is actually in.
 *
 * WHY IT EXISTS. Damien sat Lesson 4 and hit the same wall twice:
 *   (1) the re-play stamp was born `disabled` with an empty log box, and the
 *       explaining nudge rendered only once the box was NON-empty — so the
 *       state he was in was the one state with no explanation at all;
 *   (2) he then typed a real log, and the stamp STILL refused him, because a
 *       hidden word-list demanded one of eight vocabulary words.
 * Both are this harness's controls. It is worth nothing if it cannot fail on
 * the build he actually sat, so it is written to be run BOTH ways:
 *
 *   node qa-no-mute-locks.js --base http://localhost:8096 --expect-fail
 *       against the PRE-FIX build (git 7bba564). MUST report findings.
 *   node qa-no-mute-locks.js --base http://localhost:8096
 *       against the current build. MUST report none.
 *
 * A control is "explained" when, while it is unactionable, a visible text node
 * sits within EXPLAIN_PX of it, or it carries aria-describedby pointing at
 * visible text, or its own label says what unlocks it.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8096');
const EXPECT_FAIL = args.includes('--expect-fail');
const EXPLAIN_PX = 190;          // "beside itself" — a note two steps away is the bug

/* HIS TWO CASES, exactly. Each stages a real pupil state and names the control
   that must speak in it. */
const SCENARIOS = [
  {
    id: 'empty-log',
    what: 'Case 01 open, log box untouched — the state Damien was in when the tick did nothing',
    type: () => null,
  },
  {
    id: 'own-words-log',
    /* THE SENTENCE MATTERS, and the first one I tried was a bad control. The old
       gate matched its eight words as SUBSTRINGS, so "hat" was found inside
       "t-HAT" and the sentence sailed through by accident. That is worth
       recording on its own: whether a child's honest log was accepted came down
       to whether one of eight fragments happened to appear anywhere inside it.
       This sentence contains none of them, as a substring or otherwise, so the
       pre-fix gate genuinely refuses it — which is what makes it a control. */
    what: 'Case 01, an honest 18-word log in a pupil\'s own words that the old hidden word-list refuses',
    type: () => 'the shark could not go right because one piece of code was missing, so I put it back',
  },
];

function isUnactionable(el) {
  return el.disabled === true ||
    el.getAttribute('aria-disabled') === 'true' ||
    el.classList.contains('locked');
}

/* page-side: find every unactionable pupil control and decide if it is explained */
const AUDIT = (EXPLAIN_PX) => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && getComputedStyle(e).visibility !== 'hidden' &&
      getComputedStyle(e).display !== 'none';
  };
  const unactionable = (e) =>
    e.disabled === true || e.getAttribute('aria-disabled') === 'true' || e.classList.contains('locked');
  const host = document.querySelector('.chunk-host') || document.body;
  const out = [];
  const controls = Array.from(host.querySelectorAll('button, input[type=submit]')).filter(vis);
  /* a control that has already been USED is not a mute lock: it shows a tick and
     its job is done. Only controls the pupil still has to unlock are in scope. */
  const inScope = controls.filter(e => unactionable(e) && !e.classList.contains('ticked'));
  /* every visible text node on screen, with its rectangle */
  const texts = Array.from(host.querySelectorAll('p, span, li, label, div'))
    .filter(e => vis(e) && e.children.length === 0 && (e.textContent || '').trim().length > 12)
    .map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), r }; });

  inScope.forEach((btn) => {
    const b = btn.getBoundingClientRect();
    const label = (btn.textContent || '').trim();
    /* 1. does its own label say what unlocks it? */
    if (/unlock|until|once you|when you|type |fill in|write /i.test(label)) return;
    /* 2. aria-describedby pointing at visible text */
    const dby = btn.getAttribute('aria-describedby');
    if (dby) {
      const d = document.getElementById(dby);
      if (d && vis(d) && (d.textContent || '').trim().length > 12) return;
    }
    /* 3. a visible explanation sitting beside it */
    const near = texts.find((x) => {
      const dy = Math.max(0, Math.max(x.r.top - b.bottom, b.top - x.r.bottom));
      const dx = Math.max(0, Math.max(x.r.left - b.right, b.left - x.r.right));
      return Math.hypot(dx, dy) <= EXPLAIN_PX &&
        /unlock|until|locked|needs|write|type|fill|both halves|appears|at least/i.test(x.t);
    });
    if (near) return;
    out.push({ label: label.slice(0, 70), rect: [Math.round(b.x), Math.round(b.y)] });
  });
  return out;
};

/* EXPORTED so sit-wrongpath.js asks the SAME question this harness asks —
   "is this control explained, right here, in this state?" Two definitions of
   "explained" would mean two different standards, and the one nobody ran would
   be the lenient one (DFM 144). */
module.exports = { AUDIT, EXPLAIN_PX };

if (require.main === module) (async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const findings = [];
  const log = (m) => console.log('[mute-locks] ' + m);

  /* Boot exactly as sit-review.js does — a fresh pupil in Demo-8A with every
     earlier lesson complete and pairing off. Copied deliberately rather than
     re-invented: a harness that reaches the screen a DIFFERENT way is testing a
     different screen. */
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
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
    /* NO prior lessons marked complete. Rule 134 means the Do-Now warm-up serves
       only COMPLETED lessons, so a pupil with none walks straight into the hook.
       That is deliberate here: this harness is about the CASE CARD's locked
       controls, and a recap quiz in front of it is just distance to travel. */
    const L = {};
    db.pupils = db.pupils || {};
    db.pupils['Demo-8A:anya.murphy@demo'] = Object.assign(
      db.pupils['Demo-8A:anya.murphy@demo'] || { n: 'Anya Murphy', cn: '', j: 1, xp: 0, g: '' }, { L });
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

  /* Drive to Case 01 with DOM clicks inside the page, exactly as sit-review.js
     does. Playwright's own click() enforces visibility/stability and refuses
     mid-animation elements — which is what stalled the first attempt. A DOM
     click is also what a badge-pop overlay cannot swallow. */
  const step = async () => page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const vis = (e) => e && e.offsetParent !== null;
    // clear any badge/intro overlay first
    const pop = q('.badge-pop button');
    if (pop) { pop.click(); return 'badge'; }
    const skip = q('.intro-skip');
    if (vis(skip)) { skip.click(); return 'intro-skip'; }
    // the case card is the destination
    if (q('.case-log-input')) return 'ARRIVED';
    const c1 = q('.case-file[data-case="c1"]:not([disabled])');
    if (vis(c1)) { c1.click(); return 'case-c1'; }
    // evidence intake: open it, then tick its confirm
    const intakeTick = q('.case-filecard .confirm-step:not(.ticked)');
    if (vis(intakeTick) && /broken game is open/i.test(intakeTick.textContent || '')) {
      intakeTick.click(); return 'intake-confirm';
    }
    const intake = q('[data-view="intake"]:not([disabled])');
    if (vis(intake) && !intake.classList.contains('done')) { intake.click(); return 'intake'; }
    // the hook card's CTA appears on a timer
    const cta = q('.dossier-cta');
    if (vis(cta) && !cta.hidden) { cta.click(); return 'dossier-cta'; }
    // any remaining primary button advances the intro cards
    const pb = Array.from(document.querySelectorAll('.chunk-host .primary-btn')).find(vis);
    if (pb) { pb.click(); return 'primary:' + (pb.textContent || '').trim().slice(0, 24); }
    return 'wait';
  });

  let arrived = false;
  const trail = [];
  for (let i = 0; i < 40 && !arrived; i++) {
    const what = await step();
    if (what !== 'wait') trail.push(what);
    if (what === 'ARRIVED') { arrived = true; break; }
    await sleep(900);
  }
  if (!arrived) {
    console.error('could not reach Case 01. Trail: ' + trail.join(' -> '));
    await browser.close();
    process.exit(2);
  }
  log('reached Case 01 via: ' + trail.join(' -> '));

  for (const sc of SCENARIOS) {
    const typed = sc.type();
    if (typed !== null) {
      await page.fill('.case-log-input', typed);
      await page.waitForTimeout(500);
    }
    const bad = await page.evaluate(AUDIT, EXPLAIN_PX);
    const shot = path.join(__dirname, 'qa-l2-l5-review', 'l4-sit-fixes',
      'mutelocks-' + (EXPECT_FAIL ? 'prefix' : 'fixed') + '-' + sc.id + '.png');
    fs.mkdirSync(path.dirname(shot), { recursive: true });
    await page.screenshot({ path: shot, fullPage: true });
    if (bad.length) {
      bad.forEach(b => findings.push(`${sc.id}: "${b.label}" is locked with no explanation beside it — ${sc.what}`));
      log(`FINDING x${bad.length} in ${sc.id}`);
    } else {
      log(`clean: ${sc.id}`);
    }
  }

  await browser.close();

  if (EXPECT_FAIL) {
    if (!findings.length) {
      console.error('CONTROL FAILED: --expect-fail was asked for, but the build under test ' +
        'explained every locked control. This harness cannot be credited with catching ' +
        'a fault it does not catch.');
      process.exit(1);
    }
    console.log(`\nCONTROL OK — the pre-fix build fails, as it must. ${findings.length} finding(s):`);
    findings.forEach(f => console.log('  ✗ ' + f));
    process.exit(0);
  }
  if (findings.length) {
    console.error(`\nqa-no-mute-locks: ${findings.length} FAILURE(S)`);
    findings.forEach(f => console.error('  ✗ ' + f));
    process.exit(1);
  }
  console.log('\nqa-no-mute-locks: PASS — every locked control on the walked path explains itself.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
