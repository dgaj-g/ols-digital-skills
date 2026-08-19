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
  /* "…first" joined this list on 14 Aug 2026 (DFM 221). It is one of the plainest
   ways English says what has to happen before a control will work, and the
   platform already uses it: Lesson 3's Rally prints "Run the timer first" on a
   tag directly above the score steppers, exactly where a pupil looks — and the
   list recognised "first you" but not a sentence ENDING in "first", so five
   controls on a signed-off lesson were reported as unexplained when the screen
   was explaining them perfectly. A gate that invents a fault is worse than no
   gate (DFM 146a), and this is a recognition rule, not a loosening: a control
   with no sentence beside it at all still fails. */
const EXPLAINS = /unlock|until|locked|needs|write|type|fill|both halves|appears|at least|lights up|turns on|wakes|opens when|available when|once all|once you|when all|when your|as soon as|first you|you need|\bfirst\b/i;
  const host = document.querySelector('.chunk-host') || document.body;
  const out = [];
  /* NOTHING BEHIND A MODAL IS IN SCOPE (added 14 Aug 2026, DFM 221).
     While a badge pop, the ? help window or a film window is open, the card
     underneath is deliberately inert — that is what a modal IS — and the pop
     itself is the explanation, with its own button on it. Auditing through
     the overlay reported Lesson 1's "Finish" as an unexplained mute lock
     twice: it was disabled because "Badge earned · Onward" was sitting on top
     of it. A pupil is never refused by a control she cannot even see. */
  const modal = Array.from(document.querySelectorAll(
    '.badge-pop, .ols-modal, #help-modal, .pop-card, .clearance-pop')).filter(vis)[0];
  if (modal) return out;
  const controls = Array.from(host.querySelectorAll('button, input[type=submit]')).filter(vis);
  /* A control that has already been USED is not a mute lock: it shows a tick and
     its job is done. Only controls the pupil still has to unlock are in scope.
     DFM 204: "done" is not always marked on the BUTTON. The studio desk's kit
     confirm renders `disabled` with its tick on an inner `.confirm-box.done`
     span, and an answered QA row disables its own head — both are finished
     controls showing a tick, and reading only the button's own class list made
     the confused-pupil walker report six faults that were not there. A gate that
     invents a fault is worse than no gate (DFM 146a), so ask the same question
     the pupil's eye asks: is there a tick on or inside this control? */
  const FINISHED_STATE = ['ticked', 'done', 'shipped', 'pass', 'signed', 'closed'];
  const finished = (e) => {
    if (FINISHED_STATE.some(c => e.classList.contains(c))) return true;
    if (e.querySelector('.done, .confirm-box.done, .std-qa-state.pass')) return true;
    if (/✓|✔|&#10003;/.test(e.innerHTML || '')) return true;
    /* An ANSWERED ordering puzzle disables every one of its blocks on purpose —
       "no more moving" once she has checked — and the verdict is on screen right
       there. Those are finished controls, not mute locks (DFM 204/146a). */
    const card = e.closest('.parsons-card');
    if (card) {
      const fb = card.querySelector('.q-feedback');
      if (fb && !fb.hidden && (fb.textContent || '').trim().length > 4) return true;
    }
    /* A BUILD THAT HAS MATCHED IS A FINISHED CARD (19 Aug 2026, and it is the
       ordering puzzle's clause word for word, on the engine that replaced it).
       `pyrun` locks the whole card the moment the program matches: RUN goes to
       0.38 opacity with `cursor: not-allowed`, and every one of the seven lines
       is disabled so she cannot edit a program she has already got right. The
       confused-pupil walk reported all eight of them as unexplained mute locks
       on BOTH Lesson 2s — fourteen findings in one round — and the screen was
       LOOKED AT before this clause was written rather than after (DFM 194c):
       the console says "Your program printed this: Score: 2", the verdict panel
       161px below RUN says MATCHED and what she has just built, and the next
       control, Continue, is lit inside that same panel. Nothing on that screen
       is waiting on her.
       The reason the generic test could not see it is worth naming, because it
       is NOT a reason to loosen the generic test: the sentence beside RUN is a
       COMPLETION notice, not an unlock condition, so it can never match the
       EXPLAINS list — and EXPLAINS must go on meaning "here is what would turn
       this on", or it stops catching real locks (DFM 204's own warning: widen on
       the principle, never until the finding goes away).
       DELIBERATELY NARROW: only `is-matched` rescues the card. A NOT YET verdict
       and the empty-gap `is-note` refusal do not, because in both of those
       states the pupil still has work to do and a mute control would be a real
       fault — which is exactly what qa-no-mute-locks exists to find. */
    const pyc = e.closest('.pyrun-card');
    if (pyc) {
      const v = pyc.querySelector('.pyrun-verdict.is-matched');
      if (v && !v.hidden && v.getBoundingClientRect().height > 4) return true;
    }

    /* AN ANSWERED QUESTION IS A FINISHED CONTROL (added 14 Aug 2026, DFM 221).
       The shared question renderer marks a question as answered by DISABLING
       all four of its options — that is what stops a pupil changing her mind
       after the verdict — and the verdict panel is on screen beside them,
       which is the explanation. Reading only the button's own classes made the
       confused-pupil walk report FOUR faults per answered question across
       Lessons 1-3: 40+ inventions in one run. DFM 146a: a gate that invents a
       fault is worse than no gate — and it would have buried anything real. */
    /* A FILED INSPECTION SCENE IS ANSWERED (16 Aug 2026, and it is the same
       class as the ordering puzzle above). Once she presses File my inspection
       report every zone is disabled on purpose — that is what stops her editing
       her answer after seeing the verdict — and the explanation is as close as
       an explanation gets: the zone's own label is overwritten with "You found
       it" / "Missed" / "Nothing wrong here", and the report underneath names
       the rule each one broke. The confused-pupil walk reported two of these
       per scene, ten in a run, and every one of them was the checker not
       recognising a finished control (DFM 146a). */
    if (e.classList.contains('insp-zone') && e.classList.contains('is-done')) return true;

    if (e.classList.contains('q-opt')) {
      const qc = e.closest('.q-card');
      if (qc && (qc.classList.contains('answered') ||
        qc.querySelector('.q-feedback, .q-verdict, .q-ack, .exit-fb'))) return true;
      /* the exam gives no verdict BY DESIGN (rule 77) — its own "Answer saved"
         acknowledgement is the finished mark, and it is beside the options */
      const host2 = document.querySelector('.chunk-host');
      if (qc && host2 && /answer saved/i.test(host2.textContent || '')) return true;
    }
    return false;
  };
  const inScope = controls.filter(e => unactionable(e) && !finished(e));
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
        /* WHAT AN EXPLANATION LOOKS LIKE. A set of "this happens WHEN that
           happens" constructions, not a list of magic words — widened (DFM 204)
           after it reported the READY button as mute while the sentence "Lights
           up when all four QA checks pass." sat directly beneath it. Widened on
           the principle, not until the finding went away: every addition below is
           a precondition phrasing a child would read as one.
           (JS has no free-spacing flag — kept on one line deliberately.) */
        EXPLAINS.test(x.t.replace(/\s+/g, ' '));
    });
    if (near) return;
    /* carry the control's real markup with every finding, so a false positive
       can be told from a real one without re-running the whole walk (DFM 146a) */
    out.push({ label: label.slice(0, 70), rect: [Math.round(b.x), Math.round(b.y)],
      cls: btn.className, inner: (btn.innerHTML || '').replace(/\s+/g, ' ').slice(0, 120) });
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

  /* ══ THE PYRUN CLAUSE, PROVED BOTH WAYS (19 Aug 2026, DFM 196) ═════════════
     `finished()` gained a clause that exempts every control inside a build card
     whose verdict reads MATCHED. An exemption is exactly the thing that can go
     on printing green over a real fault (DFM 213: an exemption that hides a
     class of pupil surface is worse than no check), so it is proved in both
     directions on the real j2-02 build card, in a real browser:
       A · MATCHED — RUN and all seven lines are disabled on purpose, with the
           console and the verdict beside them. The audit must be SILENT.
       B · NOT YET — the same card, one press earlier, with RUN forced disabled
           and the locked note hidden: a genuine mute lock in the one state
           where she still has work to do. The audit must CATCH it.
     If B ever goes quiet, the clause has stopped being narrow and this gate has
     stopped being a gate. */
  const WALK = require('./lib/walk-moves.js');
  async function pyrunControls() {
    const p2 = await ctx.newPage();
    await p2.goto(BASE + '/ks3-dt/platform/index.html?class=Demo-9A&as=aoife', { waitUntil: 'domcontentloaded' });
    await sleep(1400);
    await p2.evaluate(() => localStorage.clear());
    await p2.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await p2.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
      const now = Math.floor((Date.now() - 1767225600000) / 60000);
      db.locks['Demo-9A'] = db.locks['Demo-9A'] || {};
      for (const n of ['1', '2']) db.locks['Demo-9A'][n] = { u: now, on: 1 };
      db.cfg['Demo-9A'] = db.cfg['Demo-9A'] || {};
      db.cfg['Demo-9A'].pairing = { on: 0 };
      db.pupils = db.pupils || {};
      const k = 'Demo-9A:aoife.mcgrath@demo';
      db.pupils[k] = Object.assign(db.pupils[k] || { n: 'Aoife McGrath', cn: '', j: 1, xp: 0, g: '' },
        { L: { '1': [2, 10, 'sit1=1', '1', '222|1', 100, 10, 0, '', 0, 0] } });
      localStorage.setItem('ks3dt-dev', JSON.stringify(db));
    });
    await p2.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2400);
    await p2.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
    await sleep(700);
    await p2.evaluate(() => {
      const t = Array.from(document.querySelectorAll('.tile')).find(e => /Lesson\s*2(?!\d)/i.test(e.textContent));
      if (t) t.click();
    });
    await sleep(3000);
    await WALK.primeDevKeys(p2, BASE);

    /* walk until the build card is assembled and RUN is armed — one press short
       of MATCHED, which is where control B lives */
    let armed = false;
    for (let i = 0; i < 220 && !armed; i++) {
      armed = await p2.evaluate(() => {
        const r = document.querySelector('.pyrun-run');
        return !!(r && !r.disabled && !document.querySelector('.pyrun-verdict.is-matched'));
      });
      if (armed) break;
      const st = await p2.evaluate(WALK.detectKind);
      const mv = st && WALK.MOVES[st.kind];
      if (!mv) { await sleep(1200); continue; }
      await p2.evaluate(([src]) => { (new Function('return (' + src + ')')())(); }, [String(mv)]);
      await sleep(WALK.SETTLE[st.kind] || 600);
    }
    if (!armed) { await p2.close(); return ['pyrun control: never reached an armed build card']; }

    const out = [];
    /* B — plant the mute lock in the NOT-YET state and demand the audit sees it */
    await p2.evaluate(() => {
      const r = document.querySelector('.pyrun-run');
      const n = document.querySelector('.pyrun-locked-note');
      if (r) r.disabled = true;
      if (n) n.hidden = true;
    });
    await sleep(400);
    const planted = await p2.evaluate(AUDIT, EXPLAIN_PX);
    if (!planted.some(b => /RUN/i.test(b.label))) {
      out.push('CONTROL B FAILED: a build card with RUN disabled, no note beside it and no ' +
        'MATCHED verdict was NOT reported — the pyrun exemption is too wide.');
    } else {
      log('control B ok: a planted mute lock on the un-matched build card is caught');
    }
    /* put it back and let the card really match */
    await p2.evaluate(() => {
      const r = document.querySelector('.pyrun-run');
      const n = document.querySelector('.pyrun-locked-note');
      if (r) r.disabled = false;
      if (n) n.hidden = false;
    });
    let matched = false;
    for (let i = 0; i < 220 && !matched; i++) {
      matched = await p2.evaluate(() => !!document.querySelector('.pyrun-verdict.is-matched'));
      if (matched) break;
      const st = await p2.evaluate(WALK.detectKind);
      const mv = st && WALK.MOVES[st.kind];
      if (!mv) { await sleep(1200); continue; }
      await p2.evaluate(([src]) => { (new Function('return (' + src + ')')())(); }, [String(mv)]);
      await sleep(WALK.SETTLE[st.kind] || 600);
    }
    if (!matched) { out.push('pyrun control: never reached MATCHED'); await p2.close(); return out; }
    await sleep(500);
    const afterMatch = await p2.evaluate(AUDIT, EXPLAIN_PX);
    if (afterMatch.length) {
      out.push('CONTROL A FAILED: a build card showing MATCHED still reports ' +
        afterMatch.length + ' unexplained control(s): ' + afterMatch.map(b => b.label).join(' | '));
    } else {
      log('control A ok: a MATCHED build card is silent — its verdict and Continue are the explanation');
    }
    await p2.screenshot({ path: path.join(__dirname, 'qa-l2-l5-review', 'l4-sit-fixes', 'mutelocks-pyrun-matched.png'), fullPage: true });
    await p2.close();
    return out;
  }
  (await pyrunControls()).forEach(f => findings.push(f));

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
