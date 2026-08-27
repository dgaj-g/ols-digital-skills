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
/* THE 267(f) AUDIT RIDES THIS WALK TOO. The confused pupil stands in states the
   happy path never reaches — half-typed boxes, refused gates — which is exactly
   where an interactive control nested inside another one does its damage. One
   home for the law, two walkers asking it (DFM 144/204). */
const NI = require('./lib/nested-interactive.js');

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
/* YEAR-QUALIFIED KEYS FROM 16 AUG 2026. J1 keeps its bare-number legacy keys
   ('1'…'5', 'S1') because sit-review, qa-harness-coverage and COVERAGE_DEBT all
   name its cells that way and renaming them would break six lessons' evidence
   for nothing. Every other year is `j2-1`, `j3-1`, … so a lesson number can
   never mean two lessons. */
const LESSON = String(args.find(a => /^([1-5]|S1|j[23]-\d+)$/i.test(a)) || '4').toUpperCase()
  .replace(/^J([23])-/, 'j$1-');
const YEAR = /^j2-/.test(LESSON) ? 'j2' : /^j3-/.test(LESSON) ? 'j3' : 'j1';
/* the seeded demo class and its first-ever-login pupil, per year (dev-server.js) */
const CLASS = { j1: 'Demo-8A', j2: 'Demo-9A', j3: 'Demo-10A' }[YEAR];
const PUPIL = { j1: 'anya', j2: 'aoife', j3: 'orla' }[YEAR];
const PUPIL_KEY = { j1: 'anya.murphy@demo', j2: 'aoife.mcgrath@demo', j3: 'orla.mccann@demo' }[YEAR];
const PUPIL_NAME = { j1: 'Anya Murphy', j2: 'Aoife McGrath', j3: 'Orla McCann' }[YEAR];
const LESSON_NUM = LESSON.replace(/^j[23]-/, '');
const BASE = argOf('--base', 'http://localhost:8121');
const EXPECT_FAIL = args.includes('--expect-fail');
/* match the tile by its LESSON NUMBER, not by a word in its title: the first
   version's Lesson-5 pattern matched Lesson 2's tile and the walker cheerfully
   tested the wrong lesson while printing PASS. */
/* Lessons 1-3 and the side quest added 14 Aug 2026 (DFM 221) — the side quest
   is not "Lesson N" on its tile at all, so it matches by its own title. */
const TILE = {
  1: /Lesson\s*1(?!\d)/i, 2: /Lesson\s*2(?!\d)/i, 3: /Lesson\s*3(?!\d)/i,
  4: /Lesson\s*4(?!\d)/i, 5: /Lesson\s*5(?!\d)/i,
  S1: /Files That Follow You/i,
  'j2-1': /Lesson\s*1(?!\d)/i,
  'j3-1': /Lesson\s*1(?!\d)/i,
  'j2-2': /Lesson\s*2(?!\d)/i,
  'j3-2': /Lesson\s*2(?!\d)/i,
  'j2-3': /Lesson\s*3(?!\d)/i,
  'j3-3': /Lesson\s*3(?!\d)/i
};   /* the tile reads "Lesson 5Game Studio" — no space, so \b never fires */

/* ---- REQUIRED COVERAGE (DFM 204, his ruling of 13 Aug 2026) ----
   "why has the confused-pupil walker only reaches 4 screens of Lesson 5. this is
   unacceptable and surely violates a harness?" He is right: a checker that walks
   four screens of a ten-screen lesson and prints PASS is reporting coverage it
   does not have — the DFM 200 class. Printing an honest coverage NOTE underneath
   is not enough; nobody reads a footnote as a failure.
   So coverage is now ASSERTED. Each landmark is a real DOM surface the confused
   pupil must have STOOD ON. If the walk never reaches one, the run FAILS and
   names it. These are chosen to be reachable by ONE pupil working alone — Press
   Night is checked by its floor/waiting state, not by another pupil's review. */
const LANDMARKS = {
  /* ---- Lessons 1-3 + the side quest, added 14 Aug 2026 (DFM 221) ----
     Every entry is a real interactive surface of that lesson, named from its
     own chunk list and its engine's rendered DOM — not from memory. A walk
     that does not reach one of these FAILS and says which (DFM 204). */
  /* A THIRD FIELD MAY NAME THE CHUNK the landmark must be reached IN, and on
     these four lessons it is not optional. Lessons 1-3 ask questions on three
     different screens — the warm-up, the Licence Exam and the exit check — and
     all three are drawn by ONE shared question renderer, so they share
     `.q-opt` exactly. Selector-only landmarks therefore ticked the exam and the
     exit check the moment the walker answered the FIRST warm-up question: 4 of
     11 "reached" on a walk that had stood on three screens. That is coverage
     claimed and not had — the DFM 204 sin, inside the harness written to
     enforce DFM 204. The chunk id makes each landmark mean the screen it names. */
  1: [
    ['the welcome briefing', '.dossier-cta, .briefing-card', 'briefing'],
    ['the warm-up questions', '.q-opt', 'calibration'],
    ['Badge 1 — the account cards', '.confirm-step', 'b1-login'],
    ['Badge 2 — the guided tour', '.tour-callout', 'b2-navigator'],
    ['the Vault', '.vault-file, .vault-folder', 'b3-vault'],
    ['the Real Vault steps', '.confirm-step', 'realvault'],
    ['the Licence Exam', '.q-opt, .seal-card', 'b4-exam'],
    ['the codename picker', '.codename-card, .codename-display', 'b5-codename'],
    ['the oath', '.oath-card, .oath-sign', 'b5-codename'],
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'selfeval']
  ],
  2: [
    ['the mission briefing', '.dossier-cta, .briefing-card', 'hook'],
    ['the film', 'video', 'howto'],
    ['the ladder', '.ladder-card, .rung-card, .rung-actions', 'ladder'],
    ['Bank Your Build', '.af-steps, .af-demo', 'bank'],
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the ordering puzzle', '.parsons-card, .parsons-tray', 'exitp'],
    ['the pack-up card', '.confirm-step', 'packup'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'selfeval']
  ],
  3: [
    ['the mission briefing', '.dossier-cta, .briefing-card', 'hook'],
    ['the ladder', '.ladder-card, .rung-card, .rung-actions', 'ladder'],
    ['Register Your Rig', '.af-steps, .af-demo', 'rig'],
    ['the Reaction Rally', '.rally-round, .rally-timer-btn', 'rally'],
    ['the score gate', '.rally-transmit, .rally-confirm', 'rally'],
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the ordering puzzle', '.parsons-card, .parsons-tray', 'exitp'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'selfeval']
  ],
  S1: [
    ['the side-quest briefing', '.dossier-cta, .briefing-card', 'sq-brief'],
    ['the Drive steps', '.confirm-step', 'sq-drive'],
    ['the folder check', '.dc-card, .dc-list, .dc-sim', 'sq-inspect'],
    /* DFM 262's two rows. The Inspection blocks correctly, and a live run has no
       back-navigation (DFM 142b) — so the film that TAUGHT the thing being
       checked has to be reachable from the check itself, and from the failure
       state above all, because that is where a pupil who has forgotten is
       standing. Both are asserted, never reported (DFM 204): the second one is
       only reachable because the preview's inspection is now made to fail once,
       seeded above. */
    ['the inspection\'s Show me how, on the INTRO card', '.intro-card .step-clip-btn', 'sq-inspect'],
    ['the inspection\'s Show me how, on the FAILED card', '.dc-card .step-clip-btn', 'sq-inspect'],
    ['the OneDrive steps', '.confirm-step', 'sq-onedrive'],
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'selfeval']
  ],
  4: [
    ['the case board', '.case-file, .case-pin'],
    ['Evidence Intake', '.case-filecard .confirm-step'],
    ['a case file with a log box', '.case-log-input'],
    ['the clue ladder', '.case-clue-btn, .case-clue-open'],
    ['the release desk', '.case-rc-score, .case-rc-btn'],
    ['the ship steps', '.case-ship, .case-ship-btn'],
    ['the exit check', '.q-opt, .exit-q'],
    ['the closing screen', '.se-row, .se-card, .se-submit']
  ],
  5: [
    ['the contracts desk', '.std-contract'],
    ['the shared brief', '.std-brief'],
    ['a contract, open', '.std-contract-full'],
    ['the signing gate', '.std-sig-input, .std-sign'],
    ['the studio desk', '.std-desk'],
    ['the kit card', '.std-kit-confirm, .std-tool'],
    ['the blueprint', '.std-blueprint, .std-blueprint-btn'],
    ['the QA desk', '.std-qadesk, .std-qa-row'],
    ['the READY gate', '.std-ready-btn'],
    ['Press Night', '.gal-desk, .gal-floor, .gal-waiting, .gal-marquee-grid', 'press'],
    /* THE CHUNK QUALIFIER MATTERS ON THESE TWO, and its absence was a coverage
       LIE (23 Aug 2026). `.q-opt` is the option class of every marked question
       on the platform, so without a chunk this row ticked on the Do-Now at the
       START of the hour and reported "the exit check ✓" on a walk that never
       reached it — a landmark that can be satisfied by a different screen is not
       a landmark (DFM 204's own point, turned on the list itself). Every other
       lesson's rows already carry theirs; Lesson 5's did not. */
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'selfeval']
  ],
  /* ---- J2 Lesson 1, 16 Aug 2026. Named from its own chunk list and the
     inspect engine's rendered DOM, not from the design document. The three
     `inspect` landmarks are the three states that matter to a confused pupil:
     a scene with nothing flagged (the file button must explain itself rather
     than sit dead), the report card she gets back, and the OPTIONAL fifth
     scene, which must say it is optional AND give her the control to refuse it
     (his K11d stretch). The chunk id is carried on every question landmark for
     the same reason it is on J1's: the snapshot, the warrant and the exit check
     are all drawn by one shared `.q-opt` renderer. ---- */
  'j2-1': [
    ['the welcome briefing', '.dossier-cta, .dossier', 'briefing'],
    ['the workbench steps', '.confirm-step', 'workbench'],
    ['the inspection rules card', '.insp-rules, .insp-intro-steps', 'inspection'],
    ['an inspection scene, nothing flagged', '.insp-stage, .insp-zone', 'inspection'],
    ['the inspection report', '.insp-report, .insp-rows', 'inspection'],
    ['the optional Hard Inspection', '.insp-skip', 'inspection'],
    ['the Snapshot questions', '.q-opt', 'snapshot'],
    ['the Warrant questions', '.q-opt', 'warrant'],
    ['the what-you-build-next card', '.confirm-step', 'next'],
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'selfeval']
  ],
  /* ---- J3 Lesson 1, 16 Aug 2026, from its own chunk list and rendered DOM.
     The three that matter most to a confused pupil: the SENIOR-CASE gate (it
     must say the two extra cases are optional AND give her a control to
     decline), the COMPASS BOARD before she has tapped anything (its settle
     button is born disabled, so it has to say what unlocks it), and the
     COMPASS RESULT, which is the one screen in the lesson that could read as a
     verdict about her and must not.
     The kit modal is deliberately NOT here: it is a hub surface no lesson
     walker stands on, and "nothing promises a level that does not exist" is
     qa-kit-years' assertion, not a landmark. ---- */
  /* ---- J2 AND J3 LESSON 2, 19 Aug 2026, the Python hours ----------------
     Named from each lesson's own chunk list and from the DOM its engines really
     render (qa-pyrun mounts and drives both, so these selectors are the ones a
     pupil's screen actually carries, not remembered ones).
     THE THREE THAT MATTER MOST TO A CONFUSED PUPIL are the fail states, because
     they are the whole design: the console after a run that did NOT work, the
     NOT YET verdict that refuses to name a line, and — on J3 — the empty-box
     refusal, which is the one control in either lesson that can be pressed
     before it is ready and therefore the one that must explain itself
     (DFM 205). A walk that never stands on those has walked the happy path,
     which is exactly the blindness sit-wrongpath exists to end (DFM 194c). */
  /* ---- J2 LESSON 3 (27 Aug 2026) ----------------------------------------
     Every row names a surface THIS walker really reaches, alone, with no
     partner in the room — the rule that has caught this file before. So the
     Swap is checked by the two states a lone pupil genuinely lands in: the
     WAITING card with the side show on it, and the SOLO seat she is put in when
     no partner arrives. Neither is a second pupil's screen. */
  'j2-3': [
    ['the Do-Now', '.q-opt', '_recap'],
    ['the workshop briefing', '.dossier-cta, .dossier', 'workshop'],
    ['the film and its chapters', '.video-card, .vid-chapter', 'film-a'],
    ['the worked example, read not built', '.pyw-card .pyw-prog', 'training-1'],
    ['the ordering puzzle', '.parsons-card, .parsons-tray', 'training-2'],
    ['the build tray with a gap in it', '.pyt-list .pyrun-line', 'training-3'],
    ['the console after a run that did NOT work', '.pyc.is-bad, .pyc-err', 'training-3'],
    ['NOT YET, with no line named', '.pyrun-verdict.is-notyet', 'training-3'],
    ['the editor, empty, before she types anything', '.pye-card .pye-code', 'mybot'],
    ['the ready-made lines beside it', '.pyp-chip', 'mybot'],
    ['the checklist that only ticks on a run', '.pyf-list .pyf-item', 'mybot'],
    ['the free help row', '.py-help-row', 'mybot'],
    /* THE WAIT, AND THE SIDE SHOW ON IT. A lone walker never gets a partner, so
       this is the state she really stands in, and K36b's whole point is that
       Fred appears here and nowhere else. A landmark for a paired screen this
       walk cannot reach would be coverage claimed and not had (DFM 204). */
    ['waiting for a partner', '.pair-wait .pw-status', 'chatswap'],
    ['Fred, on the waiting card', '.sideshow .ss-img', 'chatswap'],
    ['the solo seat, when nobody comes', '.swap-card', 'chatswap'],
    ['the report form', '.swap-report', 'chatswap'],
    ['the extra jobs hub, untouched', '.pyrun-hub .pyrun-job', 'extras'],
    ['the way out, INSIDE a job (265c)', '.pyrun-card .pyrun-exit-row .pyrun-finish', 'extras'],
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'close']
  ],
  /* ---- J3 LESSON 3 (27 Aug 2026) ----------------------------------------
     Same rule: the Match is checked by the states a pupil alone really reaches
     — the wait with Margo on it, and the solo run she is given when no partner
     arrives — never by a second pupil's committed answer. */
  'j3-3': [
    ['the Do-Now', '.q-opt', '_recap'],
    ['the call-room briefing', '.dossier-cta, .dossier', 'callroom'],
    ['the first film and its chapters', '.video-card, .vid-chapter', 'film-a'],
    ['waiting for a partner', '.pair-wait .pw-status', 'match'],
    ['Margo, on the waiting card', '.sideshow .ss-img', 'match'],
    ['a round of the Match', '.duel-card .duel-code', 'match'],
    ['the second film', '.video-card, .vid-chapter', 'film-b'],
    ['the worked example, read not built', '.pyw-card .pyw-prog', 'assembly-1'],
    ['the ordering puzzle', '.parsons-card, .parsons-tray', 'assembly-2'],
    ['the build tray with a gap in it', '.pyt-list .pyrun-line', 'assembly-3'],
    ['the console after a run that did NOT work', '.pyc.is-bad, .pyc-err', 'assembly-3'],
    ['NOT YET, with no line named', '.pyrun-verdict.is-notyet', 'assembly-3'],
    ['the editor, empty, with nothing to drag into it', '.pye-card .pye-code', 'engine'],
    ['the checklist that only ticks on a run', '.pyf-list .pyf-item', 'engine'],
    ['the free help row', '.py-help-row', 'engine'],
    ['the extra jobs hub, untouched', '.pyrun-hub .pyrun-job', 'extras'],
    ['the way out, INSIDE a job (265c)', '.pyrun-card .pyrun-exit-row .pyrun-finish', 'extras'],
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the closing ordering puzzle', '.parsons-card, .parsons-tray', 'exitp'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'close']
  ],
  'j2-2': [
    ['the Do-Now', '.q-opt', '_recap'],
    ['the Bureau briefing', '.dossier-cta, .dossier', 'briefing'],
    ['the film and its chapters', '.video-card, .vid-chapter', 'film'],
    ['the snap desk, untouched', '.snap-card .snap-list', 'bureau'],
    ['a block picked, waiting for its twin', '.snap-block.picked', 'bureau'],
    ['the build tray', '.pyt-list .pyrun-line', 'build'],
    ['the console after a run that did NOT work', '.pyc.is-bad, .pyc-err', 'build'],
    ['NOT YET, with no line named', '.pyrun-verdict.is-notyet', 'build'],
    ['MATCHED', '.pyrun-verdict.is-matched', 'build'],
    /* THE EXTRA JOBS ZONE, WALKED AS HE DESCRIBED IT (DFM 265, 26 Aug 2026).
       The V54 offer card is gone and its landmark with it; four rows replace it,
       and every one names a state THIS walker really reaches, because a landmark
       naming a state its own walk cannot produce is the DFM 146a fault this file
       has already been caught by once.
         1. the hub untouched — the list, before she has opened anything, with the
            sentence on it that says these pay nothing;
         2. the way out, ON A JOB CARD — 265(c)'s whole point is that it is not on
            the hub only, so it is asserted where a pupil at time-up is standing;
         3. the hub again with nothing ticked — she opened a job, abandoned it half
            built, and came back to a list that records no progress for it;
         4. the tray full again on re-entry is proved by qa-extras-zone in pixels;
            what this walk proves is the ROUTE.
       Then she presses Finish the lesson and the three rows below — the closing
       card, the exit check and the evaluation — are what prove his time-up
       scenario end to end: nothing after the zone is skipped by leaving it. */
    ['the extra jobs hub, untouched', '.pyrun-hub .pyrun-job', 'extras'],
    ['the way out, INSIDE a job (265c)', '.pyrun-card .pyrun-exit-row .pyrun-finish', 'extras'],
    ['back on the hub after abandoning a job, with nothing ticked', '.pyrun-hub .pyrun-jobs', 'extras'],
    ['the what-you-did-next card', '.confirm-step', 'next'],
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'selfeval']
  ],
  'j3-2': [
    ['the Do-Now', '.q-opt', '_recap'],
    ['the call-sheet briefing', '.dossier-cta, .dossier', 'briefing'],
    ['the film and its chapters', '.video-card, .vid-chapter', 'film'],
    ['the target, before she has moved anything', '.pyrun-target-out', 'callsheet-a'],
    ['a program assembled but not yet run', '.pyp-list .pyrun-line', 'callsheet-a'],
    ['the empty-gap refusal, explaining itself', '.pyrun-verdict.is-note', 'callsheet-a'],
    ['NOT YET, with no line named', '.pyrun-verdict.is-notyet', 'callsheet-a'],
    ['MATCHED', '.pyrun-verdict.is-matched', 'callsheet-a'],
    ['the variable build', '.pyrun-target-out', 'callsheet-b'],
    /* THE ERROR CONSOLE IS FILED WHERE IT CAN ACTUALLY HAPPEN (corrected 19 Aug
       2026). It was declared against `callsheet-a`, and callsheet-a CANNOT raise
       a Python error: both of its builds are `print( )` lines holding string
       literals, so every wrong answer there is a wrong OUTPUT, never a stopped
       program. A landmark that names a state its own chunk cannot produce is the
       DFM 146a fault in the coverage gate itself — it can only ever be satisfied
       by loosening it. The state is real and it lives one chunk along:
       `j3b-takings` carries `print("Money taken: " + price * seats + " pounds")`
       as a decoy, and adding a number to a string is a TypeError, which is
       exactly the error the build's own errorWords answer. */
    ['the console after a run that did NOT work', '.pyc.is-bad, .pyc-err', 'callsheet-b'],
    /* THE ENCORE SHEET, WALKED — see the note on j2-2's own rows (DFM 265) */
    ['the encore sheet, untouched', '.pyrun-hub .pyrun-job', 'extras'],
    ['the way out, INSIDE a job (265c)', '.pyrun-card .pyrun-exit-row .pyrun-finish', 'extras'],
    ['back on the encore sheet after abandoning a job, with nothing ticked', '.pyrun-hub .pyrun-jobs', 'extras'],
    ['the what-you-did-next card', '.confirm-step', 'next'],
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'selfeval']
  ],
  'j3-1': [
    ['the welcome briefing', '.dossier-cta, .dossier', 'briefing'],
    ['the orientation steps', '.confirm-step', 'orientation'],
    ['a studio-code case, unanswered', '.q-opt', 'code'],
    ['a studio-code verdict', '.q-feedback', 'code'],
    ['the optional Hard Cases', '.stretch-skip', 'code'],
    ['the Portfolio Zero questions', '.q-opt', 'portfolio'],
    ['the Portfolio Zero seal card', '.seal-card', 'portfolio'],
    ['the compass board, before any tap', '.cmp-side', 'compass'],
    ['the compass result', '.cmp-needle', 'compass'],
    ['the where-this-year-goes card', '.confirm-step', 'next'],
    ['the exit check', '.q-opt, .exit-q', 'exit'],
    ['the closing screen', '.se-row, .se-card, .se-submit', 'selfeval']
  ]
};
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
  const nestedHits = [];
  const visited = [];
  /* the text-box battery runs ONCE per screen. It wipes the box when it is done
     (so the next gate is met fresh), and running it every loop meant the walker
     wiped the good answer it had just typed and bounced back to the board for
     ever — a walker that never leaves the first room proves nothing about the
     rest of the lesson. */
  const battered = new Set();
  const log = (m) => console.log('[wrongpath ' + LESSON + '] ' + m);

  /* ---- boot a fresh pupil, exactly as sit-review.js / qa-no-mute-locks do ---- */
  const URL = BASE + '/ks3-dt/platform/index.html?class=' + CLASS + '&as=' + PUPIL;
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate((seed) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {};
    db.locks[seed.cls] = db.locks[seed.cls] || {};
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks[seed.cls][n] = { u: now, on: 1 };
    db.cfg[seed.cls] = db.cfg[seed.cls] || {};
    /* PAIRING IS ON FOR A LESSON WHOSE OWN LANDMARK LIST NAMES THE WAITING
       CARD. Switching it off everywhere meant the two Lesson 3 set-pieces went
       straight to their solo seat, so the wait — and the character his ruling
       put on it — could not be reached by this walk at all, and two landmarks
       failed for a reason that was the harness's own configuration. The rule is
       read off the list rather than written twice (DFM 144). */
    db.cfg[seed.cls].pairing = { on: seed.pairing ? 1 : 0 };
    /* THE DO-NOW HAD NOTHING TO SERVE, SO THE WALK NEVER STOOD ON IT (19 Aug
       2026). Rule 134 gates every recap item on a lesson this pupil has
       COMPLETED, and this walker seeded `L: {}` — nothing completed — so from
       Lesson 2 on the warm-up rendered empty and passed straight through. That
       is a real screen of every lesson but the first, it is the first thing a
       confused pupil meets, and no walk had ever pressed anything on it.
       Staged exactly as sit-review.js stages it, and for the same reason: a
       pupil arriving at Lesson N has done the lessons before it. */
    const target = seed.target;
    const done = {};
    if (typeof target === 'number') {
      for (let n = 1; n < target; n++) done[String(n)] = 1;
      if (target >= 3) done['S1'] = 1;
    } else if (target === 'S1') { done['1'] = 1; }
    const L = {};
    Object.keys(done).forEach((kk, ix) => { L[kk] = [2, 10, 'sit' + kk + '=1', '1', '222|1', 100 + ix, 10, 0, '', 0, 0]; });
    db.pupils = db.pupils || {};
    const k = seed.cls + ':' + seed.key;
    db.pupils[k] = Object.assign(
      db.pupils[k] || { n: seed.name, cn: '', j: 1, xp: 0, g: '' }, { L });
    /* THE SIDE QUEST'S INSPECTION IS MADE TO FAIL ONCE (DFM 262, 26 Aug 2026).
       This is the confused-pupil walker: its whole job is to stand where a pupil
       who got it wrong stands, and until today the preview's simulated check
       always passed, so the FAILED-inspection card — the card his finding is
       about — had never been stood on by anything. `driveFail: 1` fails the
       first check and passes the second, which is the real journey rather than a
       dead end: the walk still reaches the OneDrive card, the exit and the
       closing screen. Preview-only; the deployed server is untouched. */
    if (seed.target === 'S1') { db.sim = Object.assign({}, db.sim, { driveFail: 1 }); }
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, { cls: CLASS, key: PUPIL_KEY, name: PUPIL_NAME,
       pairing: (LANDMARKS[LESSON] || []).some(function (l) { return /pair-wait/.test(String(l[1])); }),
       target: LESSON === 'S1' ? 'S1' : Number(LESSON_NUM) });
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
  await page.evaluate(v => { window.__WP_TRACE = v; }, !!process.env.KS3DT_WP_TRACE);
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
    let after = await page.evaluate(AUDIT, EXPLAIN_PX);
    /* A CONTROL THAT FREES ITSELF WAS NEVER A LOCK (added 14 Aug 2026, DFM 221).
       Lesson 1's oath arms only once the last promise has finished typing
       itself out, and Lesson 5's briefing does the same — for a second or two
       the button really is disabled with no sentence beside it, but the pupil
       is watching the lines appear and it opens on its own with nothing asked
       of her. Reporting that as a mute lock is the DFM 146a fault; waiting and
       looking again is what a pupil does. Anything still refusing after this
       pause needed an action nobody told her about, which is the real thing
       DFM 205 is about. */
    if (after.length) {
      await sleep(2600);
      const still = await page.evaluate(AUDIT, EXPLAIN_PX);
      const stillLabels = new Set(still.map(b => b.label));
      const freed = after.filter(b => !stillLabels.has(b.label));
      if (freed.length) log('  (' + freed.length + ' control(s) armed themselves while we waited — not locks)');
      after = still;
    }
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
  /* the authored pass index per QA criterion, read from the packed content */
  const PASS_BY_CRIT = (() => {
    try {
      const f = path.join(__dirname, '..', '..', 'content', YEAR, 'lessons',
        LESSON === 'S1' ? 'j1-sq1.json'
          : YEAR + '-' + String(LESSON_NUM).padStart(2, '0') + '.json');
      const L = JSON.parse(fs.readFileSync(f, 'utf8'));
      /* the criteria live under each contract TEMPLATE (catch/maze/quiz), and
         their ids repeat (c1..c4) across templates — same index each time, so a
         flat id map is correct here; walking the whole tree keeps it true if the
         shape ever moves. */
      const map = {};
      (function walk(o) {
        if (!o || typeof o !== 'object') return;
        if (Array.isArray(o)) return o.forEach(walk);
        if (o.id && Array.isArray(o.outcomes)) {
          const i = o.outcomes.findIndex(x => x && x.pass);
          if (i >= 0) map[o.id] = i;
        }
        Object.values(o).forEach(walk);
      })(L);
      return map;
    } catch (e) { return {}; }
  })();

  /* ---- LESSON 1's two hand-made gates (added 14 Aug 2026, DFM 221) ----
     Neither is a button the generic mover can press: the Vault is a pointer
     DRAG whose answer key never reaches the client in plaintext (salted
     hashes), and the oath is a press-and-HOLD so nobody signs by accident
     (rule 104's family). Both are driven here with synthetic pointer events,
     the folders tried in DOM order until one accepts — deterministic, and it
     exercises the reject path a confused pupil really meets. */
  async function vaultAndOath() {
    return page.evaluate(async () => {
      const sleep2 = ms => new Promise(r => setTimeout(r, ms));
      const vis = (e) => e && e.offsetParent !== null;
      const centre = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      const pev = (el, type, pt) => el.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, clientX: pt.x, clientY: pt.y }));
      const file = document.querySelector('.chunk-host .vault-file:not(.filed)');
      if (file && vis(file)) {
        if (!file.setPointerCapture) file.setPointerCapture = () => {};
        const folders = Array.from(document.querySelectorAll('.chunk-host .vault-folder'));
        for (const fo of folders) {
          const a = centre(file), b = centre(fo);
          pev(file, 'pointerdown', a); await sleep2(25);
          pev(file, 'pointermove', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); await sleep2(25);
          pev(file, 'pointermove', b); await sleep2(25);
          pev(file, 'pointerup', b); await sleep2(300);
          if (file.classList.contains('filed')) return 'vault-filed:' + (file.getAttribute('data-id') || '');
        }
        return 'vault-refused:' + (file.getAttribute('data-id') || '');
      }
      const sign = document.querySelector('.chunk-host .oath-sign:not([disabled])');
      if (sign && vis(sign)) {
        if (!sign.setPointerCapture) sign.setPointerCapture = () => {};
        const p = centre(sign);
        pev(sign, 'pointerdown', p);
        await sleep2(1800);      /* the hold is 1200ms — hold past it */
        pev(sign, 'pointerup', p);
        await sleep2(400);
        return 'oath-signed';
      }
      return null;
    });
  }

  /* ---- LESSON 3's REACTION RALLY (added 14 Aug 2026, DFM 221) ----
     A timed activity is played, not poked at. Each go's score steppers stay
     shut until THAT go's five seconds have run (DFM 185a) — and the engine
     says so beside them, on a `.rally-locked-tag` reading "Run the timer
     first". Driving it one-move-per-loop made the walker start the next go's
     timer instead of entering the score it had just unlocked, for ever. So the
     whole activity runs here as one block, the way a pupil plays it: start the
     go, wait out the five seconds, key the number in, then the next go. */
  const ralliedGoes = new Set();
  async function playRally() {
    const has = await page.evaluate(() =>
      !!document.querySelector('.chunk-host .rally-round') &&
      !!document.querySelector('.chunk-host .rally-timer-btn'));
    if (!has) return null;
    const goes = await page.evaluate(() => document.querySelectorAll('.chunk-host .rally-round').length);
    /* Once every go has been played and keyed in, this activity is FINISHED and
       the walker must fall through to the referee tick and "Send in my scores".
       Without this it re-keyed the same two scores for its whole budget — the
       steppers stay live so she can correct a number, which is correct
       behaviour and is not an invitation to play the game again. */
    if (ralliedGoes.size >= goes) return null;
    for (let i = 0; i < goes; i++) {
      if (ralliedGoes.has(i)) continue;
      const scored = await page.evaluate((n) => {
        const slot = document.querySelectorAll('.chunk-host .rally-round')[n];
        const up = slot && slot.querySelector('.rally-step[data-d="1"]');
        return !!(up && !up.disabled);
      }, i);
      if (!scored) {
        const started = await page.evaluate(() => {
          const b = document.querySelector('.chunk-host .rally-timer-btn:not([disabled])');
          if (b && b.offsetParent !== null && !b.hidden) { b.click(); return true; }
          return false;
        });
        if (!started) continue;
        let armed = false;
        for (let w = 0; w < 30 && !armed; w++) {
          await sleep(700);
          armed = await page.evaluate((n) => {
            const slot = document.querySelectorAll('.chunk-host .rally-round')[n];
            const up = slot && slot.querySelector('.rally-step[data-d="1"]');
            return !!(up && !up.disabled && up.offsetParent !== null);
          }, i);
        }
        if (!armed) { log('  go ' + (i + 1) + ': the score box never opened after the timer ran'); return 'rally-stalled'; }
      }
      await page.evaluate((n) => {
        const slot = document.querySelectorAll('.chunk-host .rally-round')[n];
        const up10 = slot.querySelector('.rally-step[data-d="10"]');
        const up1 = slot.querySelector('.rally-step[data-d="1"]');
        for (let k = 0; k < 2; k++) if (up10 && !up10.disabled) up10.click();
        for (let k = 0; k < 3; k++) if (up1 && !up1.disabled) up1.click();
      }, i);
      ralliedGoes.add(i);
      log('  played go ' + (i + 1) + ' of ' + goes + ' and keyed the score in');
      await sleep(400);
    }
    return 'rally-played';
  }

  /* THE FOURTH WALKER CAUGHT NOT KNOWING THE TWO NEW ENGINES (19 Aug 2026).
     This one advances by clicking primary and ghost buttons, and neither Python
     screen has one to click: the matching desk is cleared by pairing six blocks,
     the build card by assembling a program and pressing RUN. So the confused
     pupil never reached the exit check or the closing screen on EITHER Lesson 2,
     and this harness said so honestly — two COVERAGE failures per lesson, which
     is DFM 204 doing its job.
     Fixed like the other three: ask the shared detector, and if the screen has a
     mover in lib/walk-moves.js, run THAT mover before falling back to buttons.
     One fact, one home (DFM 144). The wrong-path walk still gets its wrong path:
     the snap mover brute-forces the desk, which exercises a wrong pair before a
     right one, and the build mover leaves the decoys in the tray. */
  const WALK = require('./lib/walk-moves.js');
  let wpPrimed = false;
  async function engineStep() {
    if (!wpPrimed) { await WALK.primeDevKeys(page, BASE); wpPrimed = true; }
    const st = await page.evaluate(WALK.detectKind);
    /* THE WRONG MOVER FIRST (19 Aug 2026). Delegating to the shared movers fixed
       the stall, and introduced a subtler fault in its place: those movers drive
       from the answer key, so the CONFUSED pupil built the right program every
       time and never once saw a run that did not work. `WRONG_MOVES` fails each
       build once — on a decoy the author planted, or a gap left empty — and then
       puts it right, so the three fail-state landmarks are really stood on and
       the walk still reaches the closing screen. */
    const mv = st && (WALK.WRONG_MOVES[st.kind] || WALK.MOVES[st.kind]);
    if (!mv) return null;
    await page.evaluate(([src]) => { (new Function('return (' + src + ')')())(); }, [String(mv)]);
    await new Promise(r => setTimeout(r, WALK.SETTLE[st.kind] || 600));
    return 'engine:' + st.kind;
  }

  async function goRight() {
    const special = await vaultAndOath();
    if (special) return special;
    const rally = await playRally();
    if (rally) return rally;
    const eng = await engineStep();
    if (eng) return eng;
    return page.evaluate((PASS_BY_CRIT) => {
      const q = (s) => document.querySelector(s);
      const vis = (e) => e && e.offsetParent !== null;
      const pop = q('.badge-pop button'); if (pop) { pop.click(); return 'badge'; }
      const skip = q('.intro-skip'); if (vis(skip)) { skip.click(); return 'intro-skip'; }
      const rallyConfirm = q('.chunk-host .rally-confirm:not(.ticked)');
      if (vis(rallyConfirm)) { rallyConfirm.click(); return 'rally-confirm'; }
      const rallyTx = q('.chunk-host .rally-transmit:not([disabled])');
      if (vis(rallyTx)) { rallyTx.click(); return 'rally-send'; }
      /* the codename picker: keep the first name offered rather than shuffling
         for ever — the shuffle is a loop with no end state */
      const cnKeep = q('.chunk-host #cn-keep');
      if (vis(cnKeep)) { cnKeep.click(); return 'codename-keep'; }
      /* J3's COMPASS. Its settle button is born disabled and stays disabled
         until all three pairs are answered, and a `.cmp-side` is not a primary
         button — so without this the confused pupil clicked the locked settle
         button for ever and the walk died on the compass board, eight screens
         short of the end. Found 16 Aug 2026 by raising the coverage assertion,
         which is exactly what DFM 204 says coverage assertions are for. */
      const cmpRow = Array.from(document.querySelectorAll('.chunk-host .cmp-row'))
        .find(r => vis(r) && !r.querySelector('.cmp-side.on'));
      if (cmpRow) { cmpRow.querySelector('.cmp-side').click(); return 'compass-pick'; }
      const cmpSettle = q('.chunk-host .cmp-settle:not([disabled])');
      if (vis(cmpSettle)) { cmpSettle.click(); return 'compass-settle'; }
      const cmpDone = q('.chunk-host .cmp-done');
      if (vis(cmpDone)) { cmpDone.click(); return 'compass-done'; }
      /* the optional tail on an items chunk: the CONFUSED pupil refuses it,
         which is the path that proves the refusal actually works */
      const stretchSkip = q('.chunk-host .stretch-skip');
      if (vis(stretchSkip)) { stretchSkip.click(); return 'stretch-skip'; }
      /* fill anything that wants words, honestly and at length */
      /* `input[type=text]` does NOT match `<input class="case-log-input">`: an
         attribute selector needs the attribute to be PRESENT, and this one has no
         type at all. That one missing selector meant the walker never typed the
         case log, so the tick never unlocked and it bounced between the board and
         Case 01 for ninety loops while reporting PASS. */
      /* WHAT COUNTS AS "FILLED" DEPENDS ON THE FIELD, and getting this wrong is
         what stopped the Lesson 5 walk dead at four screens while printing PASS
         (his find, DFM 204). The old rule was "fewer than six words = keep
         typing". A STUDIO NAME is three words and its box is maxlength 24, so it
         could never reach six: the walker retyped it ninety times, never clicked
         Sign, and never saw the rest of the lesson. A short field is filled when
         it has something in it; a log box is filled when it has a sentence. */
      const needsFill = (e) => {
        const v = (e.value || '').trim();
        const ml = Number(e.getAttribute('maxlength') || 0);
        if (e.type === 'number') return v === '';
        if (e.tagName === 'INPUT' && ml && ml <= 40) return v.length < 2;
        return !v || v.split(/\s+/).filter(Boolean).length < 6;
      };
      const ta = Array.from(document.querySelectorAll(
        '.chunk-host textarea, .chunk-host input[type=text], .chunk-host input[type=number], .chunk-host input:not([type])'))
        .filter(vis).find(needsFill);
      if (ta) {
        ta.value = ta.type === 'number' ? '7'
          : (Number(ta.getAttribute('maxlength') || 0) && Number(ta.getAttribute('maxlength')) <= 40)
            ? 'Pixel Otter Studio'
            : 'the code that moves it to the right was missing, so I put that block back in';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
        return 'typed:' + (ta.className || 'input').split(' ')[0];
      }
      /* the exit check's options are `.q-opt`, not `.opt` — with the wrong class
         the walker reached the exit check and could not answer a single
         question, so it never got to the closing screen (DFM 204). */
      /* `:not([disabled])` added 14 Aug 2026, and it was a REAL WALKER DEFECT:
         the question engine marks an answered question by DISABLING its
         options (engines.js: `.q-opt` … `b.disabled = true`), and adds no
         .chosen/.picked class at all. The old selector therefore kept finding
         the same answered option, "clicked" it to no effect, and reported a
         move — so the walk sat on Lesson 1's first warm-up question for its
         whole budget and reached three screens. It is the DFM 205 lesson
         again: a walker that cannot recognise a finished control does not
         test the lesson, however green it prints. */
      const opt = Array.from(document.querySelectorAll(
        '.chunk-host .q-opt:not(.chosen):not(.picked):not([disabled]), .chunk-host .opt:not(.chosen):not([disabled])')).filter(vis)[0];
      if (opt) { opt.click(); return 'answer'; }
      /* the verdict panel's own Next button — without it the walk stops at the
         first marked answer of every lesson */
      const qnext = Array.from(document.querySelectorAll('.chunk-host .q-feedback button:not([disabled])')).filter(vis)[0];
      if (qnext) { qnext.click(); return 'q-next'; }
      /* the ordering puzzle: move every block out of the tray, then check —
         the same two moves sit-review.js makes */
      const pblock = Array.from(document.querySelectorAll('.chunk-host .parsons-tray .parsons-block')).filter(vis)[0];
      if (pblock) { pblock.click(); return 'parsons-place'; }
      const pcheck = Array.from(document.querySelectorAll('.chunk-host .parsons-check:not([disabled])')).filter(vis)[0];
      if (pcheck) { pcheck.click(); return 'parsons-check'; }
      /* the closing screen answers with CHIPS, not .opt buttons */
      const chip = Array.from(document.querySelectorAll(
        '.chunk-host .se-row .se-chip:not(.chosen):not(.on), .chunk-host .se-diff-chips .se-chip:not(.chosen):not(.on)'))
        .filter(vis)[0];
      if (chip) { chip.click(); return 'se-chip'; }
      /* Lesson 5's QA checks: record an outcome so the desk can move on. The
         walker's job is coverage, not a good score — but a check left unanswered
         keeps READY dark and Press Night unreachable. */
      /* RECORD THE OUTCOME THE CONTENT MARKS `pass`, by its AUTHORED INDEX.
         Clicking the first outcome on screen fails the check roughly three times
         in four (the engine shuffles them), so the walker re-ran the same check
         for ever, never lit READY, and never reached Press Night. This is the
         same lesson qa-l5-sweep paid for on 13 Aug — read the pass index from
         the content, never from the order on screen (DFM 200's finding 1). */
      const outs = Array.from(document.querySelectorAll('.chunk-host .std-outcome')).filter(vis);
      if (outs.length) {
        const crit = (document.querySelector('.chunk-host .std-qa-row.open') || {}).dataset;
        const want = crit && PASS_BY_CRIT[crit.crit];
        const pick2 = (want != null && outs.find(o => Number(o.getAttribute('data-oi')) === want)) || outs[0];
        pick2.click();
        return 'qa-outcome:' + pick2.getAttribute('data-oi') + (want != null ? '(pass)' : '(first)');
      }
      const qaRun = Array.from(document.querySelectorAll('.chunk-host .std-qa-run:not([disabled])')).filter(vis)[0];
      if (qaRun) { qaRun.click(); return 'qa-run'; }
      /* A QA CHECK OPENS BY ITS OWN HEADER, and that header is neither a
         .primary-btn nor a .ghost-btn — so the walker could not open one, never
         answered a check, never lit READY, and never reached Press Night. It
         looped desk → blueprint → back instead. Open the first row that has not
         passed yet. */
      const qaHead = Array.from(document.querySelectorAll(
        '.chunk-host .std-qa-row:not(.open):not(.pass) .std-qa-head:not([disabled])')).filter(vis)[0];
      if (qaHead) { qaHead.click(); return 'qa-open'; }
      /* The studio's own gates are not .primary-btn / .ghost-btn either, so the
         walker could not press READY once it was lit — it went round the
         blueprint 28 times instead and never opened its doors. Every one of
         these is the step the lesson itself says comes next. */
      /* Press Night: a review starts by picking a studio off the marquee, and
         those cards are `.gal-marquee-card.clickable` — not buttons the walker
         recognised — so it stood on the gallery floor with its two press passes
         unspent and its V2 note correctly locked, and called that the end of the
         lesson. (The lesson was right; the walker could not review.) */
      /* ONLY go back to the marquee while reviews are still OWED. The V2 card is
         locked exactly while she owes them, so that card is the honest signal —
         without it the walker re-entered a review desk that had already told it
         "all three press passes are spent", on a loop, and never filed the V2
         note that is the only way off the gallery floor. */
      const v2locked = document.querySelector('.chunk-host .gal-v2-card.locked');
      const mq = v2locked && Array.from(document.querySelectorAll(
        '.chunk-host .gal-marquee-card.clickable:not(.reviewed)')).filter(vis)[0];
      if (mq) { mq.click(); return 'review:' + (mq.getAttribute('data-sid') || ''); }
      const studioGate = Array.from(document.querySelectorAll(
        '.chunk-host .std-ready-btn:not([disabled]), .chunk-host .std-doors:not([disabled]), ' +
        '.chunk-host .std-continue:not([disabled]), .chunk-host .std-enter:not([disabled]), ' +
        '.chunk-host .gal-file-btn:not([disabled]), .chunk-host .gal-v2-save:not([disabled]), ' +
        '.chunk-host .gal-wrap:not([disabled])')).filter(vis)[0];
      if (studioGate) {
        studioGate.click();
        return 'studio-gate:' + (studioGate.className || '').split(' ')[0];
      }
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
      /* NEVER TAKE A ONE-WAY DOOR (DFM 204, found by tracing this walk). After
         signing its contract the walker pressed "Click again to shred this
         contract" — twice, because the tear-up is a deliberate two-press door —
         and destroyed its own studio, landing back at the contracts desk. It did
         that on a loop and never saw eight of Lesson 5's twelve surfaces.
         The lesson was behaving correctly: the door announced itself and asked
         twice. It is the WALKER that must not walk through it. A confused pupil
         explores; she does not systematically undo her own work. */
      const isDestructive = (e) =>
        e.classList.contains('std-tearup') ||
        /shred|tear up|tear it up|delete|start again|swap contract|reset|undo|clear my/i
          .test((e.textContent || ''));
      /* A DOWNLOAD OR AN EXTERNAL LINK IS NOT PROGRESS (DFM 204). `.primary-btn`
         is a CLASS, and the kit's "⬇️ Download the Catch It kit" is an <a> that
         carries it — so the walker clicked it on a loop, never ticked the kit
         confirm, and never reached Press Night. Anchors that leave the page or
         fetch a file cannot advance the lesson. */
      const isExit = (e) => e.tagName === 'A' &&
        (e.hasAttribute('download') || e.getAttribute('target') === '_blank');
      /* A RE-WATCH IS NOT PROGRESS (added 14 Aug 2026, DFM 221 — the third
         member of this family, after the back button and the download link).
         Every ladder screen carries "Watch the film again" by law (DFM 143, so
         one mis-click on "Done watching" can never strand a pupil), and it is
         a .ghost-btn like any other — so the walker opened the film, closed
         it, opened it again, and never climbed a single rung of Lesson 2. The
         control is right; a walker that keeps re-watching proves nothing about
         the rest of the lesson. */
      /* the label differs per lesson — Lesson 2 says "Watch the film again",
         Lesson 3's per-rung player says "↻ Watch this part again" — so match
         the SHAPE (watch … again), never one lesson's exact words. Matching
         literally is what let Lesson 3 re-watch its way through the whole
         budget after Lesson 2 had already been fixed. */
      const isReplay = (e) =>
        e.classList.contains('rung-film-btn') ||
        /watch\b[^.!?]{0,24}\bagain|show me how|re-?watch/i.test((e.textContent || ''));
      const btns = Array.from(document.querySelectorAll(
        '.chunk-host .primary-btn:not([disabled]):not(.locked), .chunk-host .ghost-btn:not([disabled])'))
        .filter(vis).filter(e => !isDestructive(e) && !isExit(e) && !isReplay(e));
      const on = btns.filter(e => !isBack(e))[0];
      if (on) { on.click(); return 'go:' + (on.textContent || '').trim().slice(0, 24); }
      const back = btns[0];
      if (back) {
        const dbg = window.__WP_TRACE ? (' [desk=' + !!document.querySelector('.chunk-host .gal-desk') +
          ' textareas=' + document.querySelectorAll('.chunk-host textarea').length +
          ' spentNote=' + !!Array.from(document.querySelectorAll('.chunk-host p')).find(n=>/passes are spent/i.test(n.textContent||'')) + ']') : '';
        back.click(); return 'back:' + (back.textContent || '').trim().slice(0, 24) + dbg;
      }
      return 'stuck';
    }, PASS_BY_CRIT);
  }

  const seenLandmarks = new Set();
  /* the loop budget is not the standard — Lesson 5 is a longer lesson with a
     Press Night in the middle of it, and a walk that runs out of loops must not
     be mistaken for a walk that finished (DFM 204). */
  /* J2 Lesson 1 walks five inspection scenes with five zones each on top of an
     eighteen-question hour, so it needs the longest budget of the set. */
  /* THE TWO LESSON 3s ARE THE LONGEST WALKS ON THE PLATFORM. Each carries a
     paired set-piece that the walk now genuinely WAITS through (fourteen seconds
     before the preview's partner arrives, on purpose, so the waiting card and
     the character on it are really stood on), and J3 adds six committed rounds,
     two films and a typed editor on top of twelve chunks. J3 Lesson 3 ran out
     of loops at 110 and reported fourteen coverage failures for it — a walk that
     runs out of budget must never be mistaken for a walk that finished. */
  /* J2 Lesson 3 raised 220 -> 300 as well: the confused walker now presses RUN
     on a broken program three times before it puts a gap right — which is what a
     pupil does, and what keeps a failing console on screen long enough to be
     stood on — and at 220 some runs finished the lesson while others ran out
     two landmarks short. A gate that reports coverage differently on two
     identical runs is a gate nobody can act on. */
  const MAX = LESSON === 'j3-3' ? 300 : LESSON === 'j2-3' ? 300
    : LESSON === 'j2-1' ? 260 : LESSON === 'j3-1' ? 220
    : LESSON === "5" ? 160 : (LESSON === "1" ? 200 : (LESSON === "3" ? 170 : 110));
  let stuckRuns = 0;
  for (let i = 0; i < MAX; i++) {
    const where = await page.evaluate(() => {
      const h = document.querySelector('.chunk-host .card h2, .chunk-host h2');
      return (h ? h.textContent : (document.title || 'screen')).trim().slice(0, 46);
    });
    if (visited[visited.length - 1] !== where) { visited.push(where); log('screen: ' + where); }

    /* ---- the 267(f) audit, on this screen, in whatever state the wrong move
       has just left it in ---- */
    const nested = await page.evaluate(q => eval(q)(), NI.QUERY);
    nested.forEach(f => {
      const line = where + ': ' + NI.describe(f);
      if (nestedHits.indexOf(line) === -1) { nestedHits.push(line); }
    });
    /* record every required landmark that is on screen RIGHT NOW (DFM 204),
       in the CHUNK it belongs to where the list names one */
    const chunkNow = await page.evaluate(() => {
      const s = window.App && window.App.state;
      return (s && s.chunks && s.chunks[s.chunkIdx] && s.chunks[s.chunkIdx].id) || '';
    });
    const here = await page.evaluate(rows => rows.filter(r => {
      const e = document.querySelector('.chunk-host ' + r.sel.split(',').map(x => x.trim()).join(', .chunk-host '));
      return e && e.offsetParent !== null;
    }).map(r => r.key), (LANDMARKS[LESSON] || [])
      .filter(l => !l[2] || l[2] === chunkNow)
      .map(l => ({ sel: l[1], key: l[0] + '|' + l[1] })));
    here.forEach(s => seenLandmarks.add(s));
    await beWrong(where);
    const moved = await goRight();
    /* KS3DT_WP_TRACE=1 prints the move and the state of every box on the screen.
       It is off by default and it is here because it is what found the two
       walker faults of 23 Aug: without seeing "3" sitting in a release-note
       box, both read as lesson defects rather than walker ones. */
    if (process.env.KS3DT_WP_TRACE) {
      const dbg = await page.evaluate(() => Array.from(document.querySelectorAll(
        '.chunk-host textarea, .chunk-host input')).filter(e => e.offsetParent !== null)
        .map(e => (e.className || e.type) + '=' + JSON.stringify(String(e.value || '').slice(0, 40))));
      log('    move: ' + moved + '  boxes: ' + JSON.stringify(dbg));
    }
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
    if (process.env.KS3DT_WP_TRACE) log('  move: ' + moved);
    await sleep(750);
  }

  const shot = path.join(__dirname, 'qa-l2-l5-review', 'l4-sit-fixes',
    'wrongpath-l' + LESSON + (EXPECT_FAIL ? '-prefix' : '') + '.png');
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot, fullPage: true });
  await browser.close();

  /* COVERAGE IS ASSERTED, NOT REPORTED (DFM 204). It used to print an honest
     note saying which screens it had reached and pass anyway — which is how a
     four-screen walk of Lesson 5 sat under the word PASS for a day. */
  const distinct = Array.from(new Set(visited));
  console.log('\nSCREENS THE CONFUSED PUPIL STOOD ON (' + distinct.length + ' distinct, ' +
    visited.length + ' visits):');
  distinct.forEach(v => console.log('   · ' + v));

  const required = LANDMARKS[LESSON] || [];
  const keyOf = ([name, sel]) => name + '|' + sel;
  const missed = required.filter(l => !seenLandmarks.has(keyOf(l)));
  if (required.length) {
    console.log('\nREQUIRED COVERAGE: ' + (required.length - missed.length) + ' of ' +
      required.length + ' landmarks reached');
    required.forEach(l =>
      console.log('   ' + (seenLandmarks.has(keyOf(l)) ? '✓' : '✗') + ' ' + l[0]));
    missed.forEach(([name, sel]) => findings.push(
      'COVERAGE: the confused pupil never stood on ' + name + ' (' + sel + '). ' +
      'A walk that does not reach a screen has not checked it (DFM 204).'));
  }
  console.log('  gates tested per screen: every unactionable control clicked; every text box ' +
    'submitted empty and then with three words.');
  if (consoleErrors.length) {
    console.log('\nCONSOLE ERRORS (' + consoleErrors.length + '):');
    consoleErrors.slice(0, 6).forEach(e => console.log('   ! ' + e.slice(0, 160)));
  }

  nestedHits.forEach(h => findings.push(h));
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
