/* SIT-REVIEW: walk a J1 lesson as a pupil and capture EVERYTHING for the
   L2-L5 review (DFM 127). Screenshots every distinct card/state, captures the
   ? help modal once per chunk, measures the video player, and dumps every
   visible string to a text log for the register/claims review.

   Usage: node sit-review.js <lessonNum: 2|3|4|5|S1> [persona]
   Server: expects dev-static on :8121 (launch config "ks3dt-review").
   Output: Claude Work/KS3 DT Platform/qa-l2-l5-review/l<num>/
   Reuses the qa-j1-l1.js walker pattern (GHOST_WAIT click-like-a-person). */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');
const WALK = require('./lib/walk-moves.js');
/* THE 267(f) AUDIT RIDES THE WALK. The nesting it looks for happens at RENDER,
   so no grep can find it and no static harness can stand where it lives — but
   this walker already stands on every screen of every lesson, in the real app,
   every round. Asking the question here is what gives the law its reach; the
   question itself lives in ONE home so both walkers and the probe say the same
   thing (DFM 144). A hit is a FAILURE of the walk, never a note under a pass
   (DFM 204). */
const NI = require('./lib/nested-interactive.js');
/* THE THREE AUDITS THAT RIDE EVERY SCREEN (J13b/c/d, DFM 271's derived coverage).
   The walker already stands on every screen of every lesson — the DFM 206 gate
   forces it — so the questions that used to depend on somebody remembering to
   point a checker at a surface are asked HERE, on every screen, every run:
     · can she READ it            (contrast, in real pixels, every text node)
     · is anything EMPTY          (a visible container holding nothing)
     · does a CLICK destroy work  (a body click on placed work)
   Coverage stops being a to-do and becomes a property of walking. */
const EE = require('./lib/empty-elements.js');
const PW = require('./lib/placed-work.js');
const CA = require('./lib/contrast-audit.js');
/* THE SECOND-SIT LAWS (29 Aug 2026, J2_L3_SIT2_FIXES_SPEC S1/S4/S9). Three of
   his eleven faults lived on screens NO gate had ever measured, and the reason
   was the key: readability was asked once per CHUNK, at the state the walker
   happened to enter on, so the offer card, the tester's finished line and the
   seal card — all LATER states of chunks that had already been "measured" —
   were structurally invisible. Coverage is now keyed by STATE. The same module
   carries the two laws that had no gate at all: a numbered steps list is
   left-aligned (DFM 274, his ruling) and nothing a card renders may stick out
   past that card's edge. */
const SA = require('./lib/state-audit.js');
/* AND THE DEBT LEDGER STOPS BEING A MEMO (S1). "Exit check — part 2" shipped
   onto a new pupil card while sitting on line 119 of ENGINE_STRINGS_DEBT.md
   marked OUTSTANDING. Nothing read the file. Now the walk does, on every state
   it stands on, against a committed baseline of what each lesson already
   renders — so old debt is printed and NEW debt fails (DFM 221 + DFM 235). */
const LD = require('./lib/ledger.js');
const RD = require('./lib/rendered-debt.js');

const NUM = String(process.argv[2] || '2').replace(/^J([23])-/i, 'j$1-');
/* YEAR-QUALIFIED KEYS FROM 16 AUG 2026 (see sit-wrongpath.js for the reason J1
   keeps its bare-number legacy keys). `j2-1` is J2's Lesson 1; '1' is J1's. */
const YEAR = /^j2-/.test(NUM) ? 'j2' : /^j3-/.test(NUM) ? 'j3' : 'j1';
const CLASS = { j1: 'Demo-8A', j2: 'Demo-9A', j3: 'Demo-10A' }[YEAR];
const DEFAULT_WHO = { j1: 'anya', j2: 'aoife', j3: 'orla' }[YEAR];
const PUPIL_KEY = { anya: 'anya.murphy@demo', aoife: 'aoife.mcgrath@demo', orla: 'orla.mccann@demo' };
const PUPIL_NAME = { anya: 'Anya Murphy', aoife: 'Aoife McGrath', orla: 'Orla McCann' };
const WHO = process.argv[3] || DEFAULT_WHO;
/* the port is overridable so the SAME walker can be pointed at the build he
   sat (the DFM 196 worktree on :8097) without editing this file — comparing a
   number against a different build is how this round proves things. */
const HOST = process.env.KS3DT_BASE || 'http://localhost:8121';
const BASE = HOST + '/ks3-dt/platform/index.html?class=' + CLASS + '&as=';
/* ------------------------------------------------------------------ *
 * WHAT THIS RUN MUST PROVE (DFM 199 — his ruling, 13 Aug 2026:
 * "pin the stable numbers and carry on with the rest").
 *
 * The old gate pinned the TURN COUNT, and the turn count is this file's own
 * loop counter: it counts the passes where the walker WAITS for an animation
 * exactly as it counts the passes where it acts. Lesson 5's Mission Briefing
 * types itself out, so whether a look lands during the typing or just after it
 * depends on machine load — the same build measured 61, then 62. A pass/fail
 * gate built on a number that moves on its own is a false alarm waiting to
 * happen, which is the very fault this round exists to remove.
 *
 * So the turn count is REPORTED, and these are ASSERTED. Every one of them was
 * identical across every run of both builds: what the pupil actually does.
 * ------------------------------------------------------------------ */
/* Lessons 1, 2, 3 and the side quest joined this table on 14 Aug 2026, closing
   their COVERAGE_DEBT rows (DFM 221). Each number below was MEASURED on two
   independent clean runs against `4ab8208` and was identical both times — the
   only property DFM 199 asks of a pinned number. Nothing here is estimated.
   L1's Vault is walked with auto-pairing OFF (the solo path), which is the
   only single-pupil-deterministic route through a paired activity; the paired
   path is covered by its own two-browser harnesses. */
const EXPECT = {
  '1': { xp: 95, chunks: 10, presses: 17, marks: 33, badges: 5 },
  '2': { xp: 43, chunks: 9, presses: 14, marks: 7, badges: 2 },
  '3': { xp: 51, chunks: 8, presses: 12, marks: 8, badges: 3 },
  '4': { xp: 42, chunks: 6, presses: 8, marks: 7, badges: 1 },
  /* PRESSES RE-PINNED 17 -> 20, 23 Aug 2026, WITH THE EVIDENCE AND NOT ON TRUST.
     Press Night gained proper kinds in `lib/walk-moves.js` this round (the
     gallery floor and the review desk had none, so BOTH walkers fell through to
     the generic `button` and sit-wrongpath 5 was walked out of the lesson). The
     new movers take the route the lesson actually asks for — pick a studio,
     write the review, file it, back to the floor — which is three turns more
     than clicking the first primary button in sight.
     WHAT PROVES THIS IS THE WALKER AND NOT THE LESSON: every other number in the
     shape is UNCHANGED — xp 42, screens 10, marks 7, badges 4, errors 0 — and
     those are the numbers that describe what a pupil gets. The same walk, run
     earlier the same day with this round's content and the OLD movers, gave
     17. Nothing a pupil does moved; the walker's own route did. (The same
     discipline as the qa-j1-unchanged re-pin of 23 Aug: prove it, then pin it,
     and write down why.) */
  '5': { xp: 42, chunks: 10, presses: 20, marks: 7, badges: 4 },
  'S1': { xp: 30, chunks: 6, presses: 6, marks: 1, badges: 1 },
  /* J2 Lesson 1, pinned from a real run on 16 Aug 2026 — deterministic values
     only (DFM 199). The turn count is still reported, never asserted. */
  'j2-1': { xp: 83, chunks: 8, presses: 8, marks: 19, badges: 4 },
  /* J3 Lesson 1, pinned from a real run on 16 Aug 2026, identical on a second.
     The Compass is deterministic here because the walker always takes the FIRST
     side of each pair — a clean sweep, so the result card is the same every run
     (DFM 199: pin only what does not move). */
  'j3-1': { xp: 62, chunks: 8, presses: 8, marks: 21, badges: 4 },
  /* J2 Lesson 2, measured on 19 Aug 2026 — and XP IS DELIBERATELY NOT PINNED.
     Two runs gave 27 and 28. That is not flakiness in the walker: the matching
     desk SHUFFLES its Python column at mount (`Math.random`), which is the whole
     point of it — a pupil who learns the order learns nothing. The walker
     brute-forces that desk on purpose, so how many pairs it gets first time
     depends on the shuffle, and `firstTryXp` turns that into XP. Everything a
     shuffle cannot touch was identical on both runs and is pinned here. Pinning
     the 27 would have made this gate fail every other run for a reason that is
     the design working (DFM 199: pin only what does not move). */
  /* RE-PINNED 26 Aug 2026 on the extras-zone round's evidence, measured twice
     and IDENTICAL both times. The V54 stretch OFFER is gone (DFM 265) and an
     `extras` chunk stands in its place, so chunks 8 -> 9. The expert walker now
     takes ALL THREE extra jobs and then leaves by "Finish the lesson", which is
     where presses 9 -> 29 and marks 10 -> 12 come from: three jobs opened, each
     one assembled, run and returned from, plus the way out. A zone nobody enters
     would have printed green with three job cards nobody had ever stood on.
     XP is still NOT pinned here, for the unchanged reason below (the snap desk
     is shuffled, so how many pairs land first-try moves between runs) — and
     nothing the extras zone does can move it anyway: the chunk carries no badge,
     so it grants nothing and writes nothing (DFM 265a), which the record proves
     by carrying `bureau=…;build=…` and no `extras` entry at all. */
  'j2-2': { chunks: 9, presses: 29, marks: 12, badges: 2 },
  /* ══ J2 AND J3 LESSON 3, measured 27 Aug 2026, IDENTICAL ON TWO RUNS ══════
     Every number here moved at least once during the night, and each move was a
     fault this walk found rather than noise to be averaged away:
       · the walker sat 180 turns on the worked example, because a conversation
         reply box was a surface no kind matched;
       · it could not fix the planted `naem`, because a worked card puts its
         blanks in `.pyw-list` and the rule only looked in `.pyp-list`;
       · it could not place a line in either gap-fill build, because no build in
         either lesson carried an `order`;
       · it clicked palette chips at random in the typed editors instead of
         writing a program;
       · it left the Prediction Match on its opening screen and was handed the
         badge for predicting nothing;
       · it typed the Match's typed round into `.duel-typed`, which is the row,
         not the box;
       · and it clicked `.pye-cardsend`, which is a div.
     XP IS PINNED on both, unlike j2-2: neither lesson shuffles anything that
     can change what a walk earns. J2's tray IS shuffled, but its builds are
     judged by RUNNING the program, so the shuffle cannot move the score.
     `ep=0` on J3 is the parsons walker's standing limitation (it clicks the tray
     in the order it finds it), the same on every year — not a J3 fault. */
  /* ⭐ RE-PINNED 29 Aug 2026, and the reason matters more than the numbers.
     Both walks now reach the END of their lesson — j2-3 eleven screens where it
     was pinned at NINE, j3-3 thirteen where it was pinned at TEN — and both bank
     the exit check they never used to reach (xp 58 → 68 and 55 → 65, marks
     10 → 13 and 7 → 11; badges unchanged at 3, because the two extra screens
     carry none).
     WHAT CHANGED IS THE FAULT HE FILED. The extras zone was a dead end: with all
     three jobs done, the only way onward was a grey line beginning "Running out
     of time?", written for a pupil ABANDONING the zone and offered to one who
     had finished it. He met that as a pupil; the WALKER met it as a wall, and
     stopped there. S11(a) promotes the exit row to a real primary button once
     every job shows done, and both walks now simply carry on.
     So the old pin was a photograph of a stalled walk, and because it was
     pinned, every run since has reported "the shape holds". A number pinned at
     the value a fault produces is a fault with a certificate — which is exactly
     what DFM 199 asks to be guarded against, in the other direction.
     MEASURED TWICE EACH, IDENTICAL BOTH TIMES, before being written down. */
  'j2-3': { xp: 68, chunks: 11, presses: 47, marks: 13, badges: 3 },
  'j3-3': { xp: 65, chunks: 13, presses: 48, marks: 11, badges: 3 },
  /* J3 Lesson 2, measured 19 Aug 2026, IDENTICAL on a second run — every number
     including XP, because this lesson has no shuffled surface: four builds, each
     driven from the same key to the same answer. */
  /* RE-PINNED 25 Aug 2026, measured twice and IDENTICAL both times including
     XP. presses 8 -> 9 (the encore's own button), marks 10 -> 11 (the encore).
     AND THE XP MOVED 31 -> 62, which is the whole lesson's real arithmetic
     (21 + 31 + the exit's flat 10) rather than a number a defect had been
     truncating: both of this lesson's badged chunks are `pyrun`, so both wrote
     the detail key `py=`, and the server grants XP only on a NEW key — the Call
     Sheet Printed badge had never granted a point. The key is the chunk's own id
     now. The old 31 was a pinned shape agreeing with a fault, which is the
     failure mode DFM 199 warns about in its own words. */
  /* RE-PINNED 26 Aug 2026, measured twice and IDENTICAL both times including XP.
     chunks 8 -> 9 (the encore sheet is its own chunk now), presses 9 -> 28 and
     marks 11 -> 13 (three jobs taken instead of one stretch), and **XP 62 -> 57**
     — which is the five the encore used to pay, withdrawn by his own ruling
     (DFM 265a). Nothing else moved: the record still reads
     `callsheet-a=2/2;callsheet-b=2/2`, now without the `+s` tail and with no
     `extras` entry, because the zone grants nothing and writes nothing. */
  'j3-2': { xp: 57, chunks: 9, presses: 28, marks: 13, badges: 2 }
};
const OUT = path.join('/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform',
  'qa-l2-l5-review', 'l' + NUM.toLowerCase() + (WHO === 'anya' ? '' : '-' + WHO));
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GHOST_WAIT = 420;

/* Lesson 1 joined this table on 14 Aug 2026, closing its COVERAGE_DEBT row
   (DFM 221). It was the last J1 lesson no expert walker had ever driven — it
   shipped before this file existed and was never retro-fitted. */
const TITLES = { '1': 'Mission Control', '2': 'Make It Move', '3': 'Scoreboard Engineer', '4': 'The Broken Game', '5': 'Game Studio', 'S1': 'Files That Follow You',
  'j2-1': 'Welcome to the Workshop', 'j3-1': 'The Studio Opens',
  'j2-2': 'Translation Bureau', 'j3-2': 'First Words in Python',
  'j2-3': 'Chatbot Workshop', 'j3-3': 'Playlist Engine' };

let shotN = 0;
const shotOnce = new Set();   /* the Python screens repeat many turns; shoot each kind once */
const log = [];
function note(s) { log.push(s); console.log(s); }

/* term-rich case-log sentences for L4 (logTerms gating) */
const CASE_LOGS = {
  c1: 'The right-arrow script had no hat block at the top, so it never started. I added the when right arrow key pressed event trigger.',
  c2: 'The change score block said 0 not 1, so eating a fish added zero points. I changed the number to 1 so each fish scores one point.',
  c3: 'The fish-maker script only ran once with no forever loop, so I wrapped the spawn blocks in a forever loop so fish keep coming again and again.',
  c4: 'The stage script switched to the white backdrop and waited before showing the sea, so I moved the ocean switch first in the order.'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const u = (m.location() && m.location().url) || '';
    if (/intro\.mp4|intro-portrait\.mp4|crest\.png/.test(u)) return;
    errs.push(m.text() + (u ? ' @ ' + u : ''));
  });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  async function shot(tag) {
    shotN++;
    const name = String(shotN).padStart(3, '0') + '-' + tag.replace(/[^a-z0-9-]/gi, '_').slice(0, 60) + '.png';
    await page.screenshot({ path: path.join(OUT, name) });
    return name;
  }
  async function hostText() {
    return page.evaluate(() => {
      const h = document.querySelector('.chunk-host');
      return h ? (h.innerText || '').trim() : '(no host)';
    });
  }
  async function chunkId() {
    return page.evaluate(() => {
      const s = window.App && window.App.state;
      return s && s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : '(none)';
    });
  }

  /* ---------- boot: fresh pupil, all lessons delivered NOW, pairing off ---------- */
  await page.goto(BASE + WHO, { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  /* cara is the SECOND pupil in the paired Vault run and keeps anya's world;
     every other persona (including J2's aoife and J3's orla) starts clean. */
  if (WHO !== 'cara') await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate((seed) => {
    const TARGET_NUM = seed.target;
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {};
    db.locks[seed.cls] = db.locks[seed.cls] || {};
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks[seed.cls][n] = { u: now, on: 1 };
    db.cfg[seed.cls] = db.cfg[seed.cls] || {};
    db.cfg[seed.cls].pairing = { on: 0 };
    /* rule 134 (2 Aug 2026): the Do-Now serves only lessons this pupil has
       COMPLETED, so a fresh persona would get no warm-up at all. Stage the
       sitting pupil the way a real one arrives: every lesson BEFORE the one
       being sat already complete (plus the side quest from L3 onward, which
       is when it is due). Keeps the Do-Now on screen with honest content. */
    const target = TARGET_NUM;
    const done = {};
    if (typeof target === 'number') {
      for (let n = 1; n < target; n++) done[String(n)] = 1;
      if (target >= 3) done['S1'] = 1;
    } else if (target === 'S1') { done['1'] = 1; }
    const L = {};
    Object.keys(done).forEach((k, ix) => { L[k] = [2, 10, 'sit' + k + '=1', '1', '222|1', 100 + ix, 10, 0, '', 0, 0]; });
    db.pupils = db.pupils || {};
    const pk = seed.cls + ':' + seed.key;
    db.pupils[pk] = Object.assign(
      db.pupils[pk] || { n: seed.name, cn: '', j: 1, xp: 0, g: '' }, { L });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, { cls: CLASS, key: PUPIL_KEY[WHO] || (WHO + '@demo'), name: PUPIL_NAME[WHO] || WHO,
       target: NUM === 'S1' ? 'S1' : Number(String(NUM).replace(/^j[23]-/, '')) });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(700);
  await shot('hub');

  /* open the lesson tile */
  const title = TITLES[NUM];
  await page.evaluate(t => {
    const tile = Array.from(document.querySelectorAll('.tile')).find(e => e.textContent.includes(t));
    if (tile) tile.click();
  }, title);
  await sleep(2400);
  note('OPENED ' + title + ' as ' + WHO);

  /* ---------- the walker ---------- */
  const helpSeen = new Set();
  let lastKey = '', same = 0, turns = 0;
  const seen = { chunks: new Set(), presses: 0, marks: 0, badges: 0 };
  const askedTexts = new Set();
  const nestedHits = [];
  const emptyHits = [], clickHits = [], contrastHits = [];
  const stepsHits = [], fitsHits = [];
  const contrastSeen = new Set();
  /* STATE, not chunk: the fault class this round exists to kill */
  const stateSeen = new Set();
  const debtSeen = new Set();
  const LEDGER_ROWS = LD.outstanding();
  const LEDGER_TEXTS = LEDGER_ROWS.map(r => r.text);

  for (turns = 0; turns < 400; turns++) {
    const done = await page.evaluate(() => !!document.querySelector('.badge-pop-card.finish'));
    if (done) { await shot('LESSON-COMPLETE'); note('LESSON COMPLETE at turn ' + turns); break; }

    const ck = await chunkId();

    /* ---- the 267(f) audit, on this screen, in this state ---- */
    const nested = await page.evaluate(q => eval(q)(), NI.QUERY);
    nested.forEach(f => {
      const line = ck + ': ' + NI.describe(f);
      if (nestedHits.indexOf(line) === -1) { nestedHits.push(line); note('NESTED-INTERACTIVE ' + line); }
    });

    /* ---- J13(c): a VISIBLE container with nothing in it, on this screen ---- */
    const empties = await page.evaluate(q => eval(q)(), EE.QUERY);
    empties.forEach(f => {
      const line = ck + ': ' + EE.describe(f);
      if (emptyHits.indexOf(line) === -1) { emptyHits.push(line); note('EMPTY-CONTAINER ' + line); }
    });

    /* ---- J13(d): does a single body click destroy placed work? It CLICKS, and
       it puts the work back if it was destroyed, so the walk it is riding is not
       itself unbuilding the lesson it is measuring. ---- */
    const placed = await page.evaluate(q => eval(q)(), PW.QUERY);
    (placed.findings || []).forEach(f => {
      const line = ck + ': ' + PW.describe(f);
      if (clickHits.indexOf(line) === -1) { clickHits.push(line); note('CLICK-DESTROYS ' + line); }
    });

    /* ---- DFM 274: every rendered numbered list, left-aligned, in this state ---- */
    const steps = await page.evaluate(q => eval(q)(), SA.STEPS_QUERY);
    steps.forEach(f => {
      const line = ck + ': ' + SA.describeSteps(f);
      if (stepsHits.indexOf(line) === -1) { stepsHits.push(line); note('STEPS-NOT-LEFT ' + line); }
    });

    /* ---- does everything on this screen stay inside its own card? ---- */
    const fits = await page.evaluate(q => eval(q)(), SA.FITS_QUERY);
    fits.forEach(f => {
      const line = ck + ': ' + SA.describeFits(f);
      if (fitsHits.indexOf(line) === -1) { fitsHits.push(line); note('OVERFLOWS-CARD ' + line); }
    });

    /* ---- is this screen rendering a sentence the ledger still calls OUTSTANDING? ---- */
    if (LEDGER_TEXTS.length) {
      const debt = await page.evaluate(q => eval(q), LD.QUERY(LEDGER_TEXTS));
      debt.forEach(t => {
        const row = (LEDGER_ROWS.find(r => r.text === t) || {}).at || '?';
        const line = ck + ': ' + LD.describe(row, t);
        if (!debtSeen.has(line)) { debtSeen.add(line); note('ENGINE-DEBT-ON-SCREEN ' + line); }
      });
    }

    /* ---- CAN SHE READ IT — ONCE PER STATE, NOT ONCE PER CHUNK ------------
       The whole of fault class (A) from his second sit. The offer card, the
       tester's finished-with-their-bot line and the seal card are all LATER
       states of chunks this walk had already ticked off, so measuring on entry
       measured everything except the three screens he could not read. The key
       is now a signature of the screen itself (lib/state-audit.js). ---- */
    const sig = await page.evaluate(q => eval(q)(), SA.SIG);
    if (!stateSeen.has(sig)) {
      stateSeen.add(sig);
      contrastSeen.add(ck);
      try {
        await SA.settle(page);
        const overlay = await SA.overlayRoot(page);
        const rects = await page.evaluate(CA.COLLECT, [[], [], overlay]);
        if (rects.length) {
          const png = await SA.measureShot(page, overlay);
          const measured = await page.evaluate(CA.MEASURE,
            ['data:image/png;base64,' + png.toString('base64'), rects]);
          measured.forEach(m => {
            if (m.skip || m.icon) return;
            const floor = CA.floorFor(m);
            if (m.ratio >= floor) return;
            const line = ck + ': ' + m.sel + ' — ' + m.ratio + ':1 (needs ' + floor + '), ink ' +
              m.ink + ' on ' + m.plate + '  "' + String(m.text || '').slice(0, 44) + '"';
            if (contrastHits.indexOf(line) === -1) { contrastHits.push(line); note('UNREADABLE ' + line); }
          });
        }
      } catch (e) { note('CONTRAST-AUDIT could not run on ' + ck + ': ' + e.message); }
    }

    /* once per chunk: capture the ? help modal */
    if (ck !== '(none)' && !helpSeen.has(ck)) {
      helpSeen.add(ck);
      seen.chunks.add(ck);
      const t = await hostText();
      note('\n==== CHUNK ' + ck + ' ====\n' + t.slice(0, 3000));
      await shot(ck + '-enter');
      /* ---- J13(b): CAN SHE READ IT — every rendered text node on this screen,
         measured in real pixels off a screenshot the walker is taking anyway.
         qa-readability keeps the per-THEME sweep; this is the half that makes
         COVERAGE derived: a screen is measured because it was visited, not
         because somebody remembered to add it to a list (DFM 271). ---- */
      const helped = await page.evaluate(() => {
        const b = document.querySelector('#help-beacon');
        if (b && !b.hidden) { b.click(); return true; }
        return false;
      });
      if (helped) {
        await sleep(500);
        const ht = await page.evaluate(() => {
          const m = document.querySelector('#help-modal');
          return m ? (m.innerText || '').trim() : '(no modal)';
        });
        note('HELP[' + ck + ']: ' + ht.replace(/\s+/g, ' ').slice(0, 300));
        await shot(ck + '-help');
        await page.evaluate(() => { const c = document.querySelector('#help-close'); if (c) c.click(); });
        await sleep(400);
      }
      /* video metrics if a player is on screen */
      const vm = await page.evaluate(() => {
        const v = document.querySelector('.chunk-host video');
        if (!v) return null;
        const r = v.getBoundingClientRect();
        const card = v.closest('.card');
        const cr = card ? card.getBoundingClientRect() : null;
        return { video: { w: Math.round(r.width), h: Math.round(r.height) }, card: cr && { w: Math.round(cr.width), h: Math.round(cr.height) }, viewport: { w: innerWidth, h: innerHeight } };
      });
      if (vm) note('VIDEO METRICS[' + ck + ']: ' + JSON.stringify(vm));
    }

    /* THE DETECTOR LIVES IN lib/walk-moves.js — one home, both walkers.
       It used to live inline here, and the day capture-deck-shots needed the
       same knowledge it wrote its own dumber copy instead, could not drag, and
       shipped the Vault under three other screens' names (DFM 225b). The
       proof this extraction is faithful is this file's own pinned shape: if a
       single screen were now read differently, the end-of-run numbers move. */
    const st = await page.evaluate(WALK.detectKind);

    const key = ck + ':' + st.kind + ':' + (st.label || '');
    same = key === lastKey ? same + 1 : 0;
    lastKey = key;
    if (same > 45) { note('!! WALKER STUCK on ' + JSON.stringify(st) + ' @ ' + ck); await shot('STUCK-' + ck); break; }

    switch (st.kind) {
      case 'badge':
        /* THE GHOST GUARD APPLIES HERE TOO (found 16 Aug 2026, while pinning
           J2 Lesson 1). This was the one case that clicked without waiting, so
           the pop's own 350ms mount guard (DFM 104) swallowed the click, the
           pop was still on screen next turn, and the SAME badge was counted
           twice — J2 Lesson 1 reported five badges for four. A harness that
           inflates its own number and then pins it is DFM 146a's fault, and it
           would have baked the wrong shape in for ever. */
        await sleep(GHOST_WAIT);
        await shot(ck + '-badge-pop');
        seen.badges++;
        note('BADGE POP @ ' + ck + ': ' + (st.label || '').trim());
        await page.evaluate(() => document.querySelector('.badge-pop button').click());
        await sleep(600); break;

      case 'dossier-cta':
        await sleep(GHOST_WAIT);
        await shot(ck + '-briefing-full');
        await page.evaluate(() => document.querySelector('.dossier-cta').click());
        await sleep(1100); break;

      case 'confirm':
        await sleep(GHOST_WAIT);
        /* the same guard as the selector that decided this turn — clicking a
           control the walker just declared unavailable is how a harness quietly
           starts testing a screen no pupil can reach */
        await page.evaluate(() => document.querySelector('.confirm-step:not(.ticked):not([disabled]):not(.locked)').click());
        await sleep(700); break;

      case 'tour':
        await sleep(GHOST_WAIT);
        await page.evaluate(() => document.querySelector('.tour-callout button').click());
        await sleep(600); break;

      case 'q-opt': {
        await sleep(GHOST_WAIT);
        const qt = await page.evaluate(() => (document.querySelector('.q-stem') || {}).textContent || '');
        if (!askedTexts.has(qt)) { askedTexts.add(qt); await shot(ck + '-question'); }
        const t0 = Date.now();
        await page.evaluate(() => {
          const o = document.querySelectorAll('.q-opt:not(:disabled)');
          o[0].click();
        });
        /* measure marking latency: wait for verdict/ack */
        let latency = -1;
        for (let w = 0; w < 40; w++) {
          const got = await page.evaluate(() => !!document.querySelector('.q-verdict, .q-ack, .q-feedback'));
          if (got) { latency = Date.now() - t0; break; }
          await sleep(50);
        }
        seen.marks++;
        note('MARKING LATENCY @ ' + ck + ': ' + latency + 'ms');
        await shot(ck + '-answered');
        await sleep(500); break;
      }

      case 'q-next':
        await sleep(GHOST_WAIT);
        await page.evaluate(() => document.querySelector('.q-feedback button').click());
        await sleep(700); break;

      /* THE EXPERT INSPECTOR. She reads the room correctly: every station that
         really breaks a rule gets a flag and no station that does not. The
         zones' truth is read from the CLIENT'S OWN chunk config, never from a
         copy in this file — the walker must not hold its own idea of which
         station is wrong, or it would keep passing after the content moved.
         She also TAKES the optional Hard Inspection (this is the expert walk;
         the floor path that sets the §4b threshold is arithmetic, not a walk),
         so the skip button is deliberately never pressed here — sit-wrongpath
         is what stands on it. */
      case 'insp-scene': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-inspect-scene');
        const flagged = await page.evaluate(() => {
          const s = window.App.state;
          const ch = s.chunks[s.chunkIdx];
          const scenes = (ch.config || {}).scenes || [];
          const tab = (document.querySelector('.insp-tab') || {}).textContent || '';
          const sc = scenes.find(x => (x.tab || '') === tab) || scenes[0];
          let n = 0;
          (sc.zones || []).forEach((z, i) => {
            if (!z.breaks) return;
            const b = document.querySelector('.insp-zone[data-z="' + i + '"]');
            if (b) { b.click(); n++; }
          });
          return n;
        });
        note('INSPECT: flagged ' + flagged + ' station(s) @ ' + ck);
        await sleep(400);
        await shot(ck + '-inspect-flagged');
        await sleep(GHOST_WAIT);
        await page.evaluate(() => document.querySelector('.insp-file').click());
        await sleep(900); break;
      }

      /* THE EXPERT TAKES THE OPTIONAL WORK. sit-review is the best-path walk,
         so it presses "Give them a go" and answers the Hard Cases; the floor
         path that sets the §4b threshold is arithmetic, and the REFUSAL is what
         sit-wrongpath stands on. */
      case 'stretch-gate':
        await sleep(GHOST_WAIT);
        await shot(ck + '-stretch-gate');
        note('STRETCH OFFERED @ ' + ck + ' — the expert walk takes it');
        await page.evaluate(() => document.querySelector('.stretch-go').click());
        await sleep(900); break;

      case 'cmp-pick': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-compass-board');
        /* one side per row, deterministically the FIRST side, so the pinned
           shape does not move between runs (DFM 199) */
        const picked = await page.evaluate(() => {
          let n = 0;
          document.querySelectorAll('.cmp-row').forEach(r => {
            if (r.querySelector('.cmp-side.on')) return;
            const b = r.querySelector('.cmp-side'); if (b) { b.click(); n++; }
          });
          return n;
        });
        note('COMPASS: picked ' + picked + ' side(s) @ ' + ck);
        await sleep(400); break;
      }

      case 'cmp-settle':
        await sleep(GHOST_WAIT);
        await shot(ck + '-compass-ready');
        await page.evaluate(() => document.querySelector('.cmp-settle').click());
        await sleep(1400); break;

      case 'cmp-done': {
        await sleep(GHOST_WAIT);
        const lean = await page.evaluate(() => ((document.querySelector('.cmp-result h2') || {}).textContent || '').trim());
        note('COMPASS RESULT @ ' + ck + ': ' + lean);
        await shot(ck + '-compass-result');
        await page.evaluate(() => document.querySelector('.cmp-done').click());
        await sleep(900); break;
      }

      case 'insp-next': {
        await sleep(GHOST_WAIT);
        const score = await page.evaluate(() => ((document.querySelector('.insp-score') || {}).textContent || '').trim());
        note('INSPECT REPORT @ ' + ck + ': ' + score);
        await shot(ck + '-inspect-report');
        await page.evaluate(() => document.querySelector('.insp-next').click());
        await sleep(900); break;
      }

      case 'parsons': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-parsons');
        for (let i = 0; i < 8; i++) {
          const moved = await page.evaluate(() => {
            const t = document.querySelector('.parsons-tray .parsons-block');
            if (t) { t.click(); return true; }
            return false;
          });
          if (!moved) break;
          await sleep(350);
        }
        await shot(ck + '-parsons-placed');
        await page.evaluate(() => {
          /* the card's own control first, and WORD BOUNDARIES on the fallback —
             a substring test for "lock" also matches "Take it back to the
             bLOCKs", which is how this walk spent every turn unbuilding the
             program it had just built (27 Aug 2026). */
          const own = document.querySelector('.chunk-host .parsons-check:not([disabled])');
          if (own) { own.click(); return; }
          const b = Array.from(document.querySelectorAll('.chunk-host button'))
            .find(x => /\b(check|lock|submit)\b/i.test(x.textContent) && !x.disabled);
          if (b) b.click();
        });
        await sleep(1300);
        await shot(ck + '-parsons-checked');
        break;
      }

      case 'selfeval': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-selfeval');
        await page.evaluate(() => {
          document.querySelectorAll('.se-chips').forEach(r => r.querySelector('.se-chip').click());
          const d = document.querySelector('.se-diff-chips .se-chip'); if (d) d.click();
          const c = document.querySelector('.se-card textarea'); if (c) { c.value = 'Preview sit-through - review run.'; c.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        await sleep(400);
        await page.evaluate(() => { const b = document.querySelector('.se-submit'); if (b && !b.disabled) b.click(); });
        await sleep(6000);
        await shot(ck + '-selfeval-done');
        break;
      }

      case 'std-sign': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-contracts');
        await page.evaluate(() => {
          const card = Array.from(document.querySelectorAll('.chunk-host [class*="contract"], .chunk-host .card')).find(c => /Catch It/.test(c.textContent));
          const pick = card && card.querySelector('button');
          if (pick) pick.click();
        });
        await sleep(700);
        await page.evaluate(() => {
          const i = document.querySelector('.std-sig-input');
          if (i) { i.value = 'Golden Otter Games'; i.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        await sleep(300);
        await shot(ck + '-signed-name');
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /sign/i.test(x.textContent) && !x.disabled);
          if (b) b.click();
        });
        await sleep(1100); break;
      }

      case 'std-expand': {
        await sleep(GHOST_WAIT);
        await page.evaluate(() => {
          const vis = e => e && e.offsetParent !== null;
          const head = Array.from(document.querySelectorAll('.std-qa-row:not(.pass) .std-qa-head:not([disabled])')).find(vis);
          if (head) head.click();
        });
        await sleep(700);
        await shot(ck + '-qa-expanded');
        break;
      }
      case 'std-run': {
        await sleep(GHOST_WAIT);
        await page.evaluate(() => {
          const vis = e => e && e.offsetParent !== null;
          const run = Array.from(document.querySelectorAll('.std-qa-run')).find(vis);
          if (run) run.click();
        });
        await sleep(700);
        await shot(ck + '-qa-outcomes-open');
        break;
      }
      case 'std-outcome': {
        await sleep(GHOST_WAIT);
        await page.evaluate(() => {
          /* data-oi=0 is the authored PASS outcome on every criterion */
          const o = document.querySelector('.std-qa-outcomes:not([hidden]) .std-outcome[data-oi="0"]') ||
                    document.querySelector('.std-qa-outcomes:not([hidden]) .std-outcome');
          if (o) o.click();
        });
        await sleep(900);
        await shot(ck + '-qa-pass-recorded');
        break;
      }
      case 'std-ready': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-READY-lit');
        await page.evaluate(() => document.querySelector('.std-ready-btn.lit').click());
        await sleep(1200);
        await shot(ck + '-doors');
        break;
      }

      /* ---- LESSON 1's VAULT (added 14 Aug 2026, DFM 221) ----
         The filing game is a real pointer DRAG, and its answer key never
         reaches the client in plaintext: the engine compares a salted hash
         (`vhash(salt|fileId|folderId) === check[fileId]`), and the packed
         content carries `keysEnc`, not `keys`. So the walker cannot look the
         answer up, and it does not need to: it tries the folders in DOM order
         and stops at the one the Vault accepts. That is DETERMINISTIC — the
         same order, the same content, the same result every run — which is the
         only property DFM 199 asks of a pinned number. A wrong drop is a real
         part of this activity (it bounces back and hands the controls over),
         so the walk exercises the reject path as well as the accept path. */
      case 'vault': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-vault-stage');
        const filed = await page.evaluate(async () => {
          const sleep2 = ms => new Promise(r => setTimeout(r, ms));
          const centre = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
          const drag = async (fileEl, folderEl) => {
            const a = centre(fileEl), b = centre(folderEl);
            const ev = (type, pt) => fileEl.dispatchEvent(new PointerEvent(type, {
              bubbles: true, cancelable: true, pointerId: 1, isPrimary: true,
              clientX: pt.x, clientY: pt.y
            }));
            /* setPointerCapture would redirect the later events to the node;
               the engine calls it, so a stub keeps the synthetic drag alive */
            if (!fileEl.setPointerCapture) fileEl.setPointerCapture = () => {};
            ev('pointerdown', a);
            await sleep2(30);
            ev('pointermove', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
            await sleep2(30);
            ev('pointermove', b);
            await sleep2(30);
            ev('pointerup', b);
            await sleep2(320);
          };
          const report = [];
          for (let guard = 0; guard < 40; guard++) {
            const file = document.querySelector('.chunk-host .vault-file:not(.filed)');
            if (!file) break;
            const folders = Array.from(document.querySelectorAll('.chunk-host .vault-folder'));
            if (!folders.length) break;
            let tries = 0, done = false;
            for (const fo of folders) {
              tries++;
              await drag(file, fo);
              if (file.classList.contains('filed')) {
                report.push((file.getAttribute('data-id') || '?') + '->' +
                  (fo.getAttribute('data-id') || '?') + ' on try ' + tries);
                done = true;
                break;
              }
            }
            if (!done) { report.push((file.getAttribute('data-id') || '?') + ' REFUSED BY EVERY FOLDER'); break; }
          }
          return report;
        });
        filed.forEach(f => note('VAULT: ' + f));
        await sleep(1200);
        await shot(ck + '-vault-filed');
        break;
      }

      /* Lesson 1's codename signing is a PRESS AND HOLD (rule 104's family:
         nobody signs by accident). A click does nothing at all, which is
         correct behaviour and was the second place this walk stopped. */
      case 'hold-sign': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-oath');
        await page.evaluate(async () => {
          const sleep2 = ms => new Promise(r => setTimeout(r, ms));
          const b = document.querySelector('.chunk-host .oath-sign, .chunk-host .hold-btn, .chunk-host [class*="hold"]');
          if (!b) return;
          const r = b.getBoundingClientRect();
          const pt = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
          const ev = (t) => b.dispatchEvent(new PointerEvent(t, Object.assign({
            bubbles: true, cancelable: true, pointerId: 1, isPrimary: true }, pt)));
          if (!b.setPointerCapture) b.setPointerCapture = () => {};
          ev('pointerdown');
          await sleep2(1800);          /* the hold is 1200ms; hold past it */
          ev('pointerup');
        });
        await sleep(2200);
        await shot(ck + '-signed');
        break;
      }

      case 'input': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-input-' + (st.ph || '').slice(0, 20));
        await page.evaluate(logs => {
          const vis = e => e && e.offsetParent !== null && !e.disabled;
          const host = document.querySelector('.chunk-host');
          const hostText = (host.innerText || '');
          const tas = Array.from(host.querySelectorAll('textarea, input[type=text], input[type=number], input:not([type])')).filter(vis).filter(e => !e.value);
          for (const ta of tas) {
            let v = 'Tested and working - review run.';
            const ph = (ta.placeholder || '') + ' ' + (ta.className || '');
            /* authored examples are the best fill: "e.g. Sushi Drop" -> "Sushi Drop" */
            const eg = /^e\.g\.\s+(.+)$/.exec((ta.placeholder || '').trim());
            if (eg) {
              ta.value = eg[1];
              ta.dispatchEvent(new Event('input', { bubbles: true }));
              continue;
            }
            let cid = null;
            const caseCard = ta.closest('[data-case]');
            if (caseCard) cid = caseCard.getAttribute('data-case');
            if (!cid) {
              if (/Frozen Shark/i.test(hostText)) cid = 'c1';
              else if (/Broken Scoreboard/i.test(hostText)) cid = 'c2';
              else if (/Vanishing Fish/i.test(hostText)) cid = 'c3';
              else if (/White Void/i.test(hostText)) cid = 'c4';
            }
            if (cid && logs[cid] && ta.tagName === 'TEXTAREA') v = logs[cid];
            else if (/marquee|title/i.test(ph)) v = 'Sushi Drop';
            else if (/how|play/i.test(ph)) v = 'Arrow keys to move. Catch sushi, dodge the wasabi!';
            else if (/fish|number|score/i.test(ph)) v = '7';
            else if (/wrong|changed|log/i.test(ph)) v = logs.c1;
            else if (/version 2|v2|review said/i.test(ph)) v = 'In version 2 I would add a golden apple worth 3 points because a review said the scoring felt flat.';
            else if (/like/i.test(ph)) v = 'I like how the lives counter makes every drop feel risky - the wasabi got me twice.';
            else if (/wonder/i.test(ph)) v = 'I wonder what a golden apple worth 3 points would add to the late game.';
            else if (/added|variable/i.test(ph)) v = 'I added a timer variable that counts down from 60 - tested and working.';
            ta.value = v;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, CASE_LOGS);
        await sleep(400);
        /* after filling, press ONLY a primary or a now-armed confirm — never
           a ghost/back button (that's how the L4 loop happened) */
        await page.evaluate(() => {
          const host = document.querySelector('.chunk-host');
          const b = Array.from(host.querySelectorAll('button')).filter(x => x.offsetParent && !x.disabled);
          const pick = b.find(x => x.classList.contains('primary-btn')) ||
                       b.find(x => x.classList.contains('confirm-step') && !x.classList.contains('ticked'));
          if (pick) pick.click();
        });
        await sleep(1000); break;
      }

      case 'button': {
        await sleep(GHOST_WAIT);
        seen.presses++;
        note('BUTTONS @ ' + ck + ': [' + (st.all || []).join(' | ') + '] -> pressing "' + st.label + '"');
        await shot(ck + '-btn-' + st.label);
        await page.evaluate(() => {
          const host = document.querySelector('.chunk-host');
          const b = Array.from(host.querySelectorAll('button')).filter(x => x.offsetParent && !x.disabled);
          const pri = b.find(x => x.classList.contains('primary-btn')) || b[0];
          pri.click();
        });
        await sleep(1000); break;
      }

      case 'rally': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-rally-console');
        /* DFM 185: each go's score box unlocks only after THAT go's five-second
           timer has run, so the walker plays the goes like a pupil - about
           fifteen seconds of real waiting, which is the price of a real timer. */
        const goes = await page.evaluate(() => document.querySelectorAll('.rally-round').length);
        const targets = [23, 27];
        for (let i = 0; i < goes; i++) {
          await page.evaluate(() => {
            const b = document.querySelector('.rally-timer-btn');
            if (b && !b.disabled && !b.hidden) b.click();
          });
          if (i === 0) { await sleep(3200); await shot(ck + '-rally-timer-running'); }
          let open = false;
          for (let t = 0; t < 40 && !open; t++) {
            await sleep(500);
            open = await page.evaluate((n) => {
              const slot = document.querySelectorAll('.rally-round')[n];
              const plus = slot && slot.querySelector('.rally-step[data-d="1"]');
              return !!plus && !plus.disabled;
            }, i);
          }
          await page.evaluate(([n, want]) => {
            const slot = document.querySelectorAll('.rally-round')[n];
            const up10 = slot.querySelector('.rally-step[data-d="10"]');
            const up1 = slot.querySelector('.rally-step[data-d="1"]');
            for (let k = 0; k < Math.floor(want / 10); k++) up10.click();
            for (let k = 0; k < want % 10; k++) up1.click();
          }, [i, targets[i] || 20]);
        }
        await page.evaluate(() => {
          const tick = document.querySelector('.rally-confirm');
          if (tick && !tick.classList.contains('ticked')) tick.click();
        });
        await sleep(500);
        await shot(ck + '-rally-filled');
        await page.evaluate(() => {
          const t = document.querySelector('.rally-transmit');
          if (t && !t.disabled) t.click();
        });
        await sleep(1500);
        break;
      }
      case 'rally-after': {
        await shot(ck + '-rally-sealed');
        /* staff moment: assign hidden teams, then fire the reveal */
        await page.evaluate(async () => {
          const S = window.OLS_DEV_SERVER;
          await S.call({ action: 'admin', sub: 'autoGroup', passcode: 'demo', className: 'Demo-8A', n: 4 });
          await S.call({ action: 'admin', sub: 'setReveal', passcode: 'demo', className: 'Demo-8A', revealed: true });
        });
        note('STAFF: autoGroup + setReveal fired');
        /* wait for the pupil screen to paint the reveal (poll is 5s) */
        let revealed = false;
        for (let w = 0; w < 30; w++) {
          revealed = await page.evaluate(() => !!document.querySelector('.rally-reveal') && document.querySelector('.rally-reveal').textContent.trim().length > 0);
          if (revealed) break;
          await sleep(700);
        }
        await sleep(2500); /* bar animation */
        await shot(ck + '-rally-REVEAL' + (revealed ? '' : '-MISSING'));
        note('RALLY REVEAL on pupil screen: ' + revealed);
        const revealText = await page.evaluate(() => {
          const r = document.querySelector('.rally-reveal');
          return r ? (r.innerText || '').trim().slice(0, 600) : '(none)';
        });
        note('REVEAL TEXT:\n' + revealText);
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /continue/i.test(x.textContent) && x.offsetParent && !x.disabled);
          if (b) b.click();
        });
        await sleep(1200);
        break;
      }
      case 'case-log': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-case-file');
        await page.evaluate(logs => {
          const hostText = (document.querySelector('.chunk-host').innerText || '');
          let cid = 'c1';
          if (/Broken Scoreboard/i.test(hostText)) cid = 'c2';
          else if (/Vanishing Fish/i.test(hostText)) cid = 'c3';
          else if (/White Void/i.test(hostText)) cid = 'c4';
          const ta = document.querySelector('.case-log-input');
          ta.value = logs[cid];
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }, CASE_LOGS);
        await sleep(400);
        await shot(ck + '-case-log-filled');
        break;
      }
      case 'case-close': {
        await sleep(GHOST_WAIT);
        await page.evaluate(() => document.querySelector('.case-close-btn').click());
        await sleep(1000);
        await shot(ck + '-case-stamped');
        await sleep(1400); /* auto-return to board */
        break;
      }
      case 'case-stamped': case 'case-wait': await sleep(700); break;
      case 'case-pin': {
        await sleep(GHOST_WAIT);
        note('OPENING PIN: ' + st.label);
        await page.evaluate(() => {
          const pins = Array.from(document.querySelectorAll('button.case-pin:not([disabled])'));
          const intake = pins.find(p => p.getAttribute('data-view') === 'intake' && !p.classList.contains('done'));
          const openCase = pins.find(p => p.hasAttribute('data-case') && !p.querySelector('.case-stamp'));
          const stretch = pins.find(p => p.classList.contains('case-stretch') && !p.querySelector('.case-stamp'));
          const release = pins.find(p => p.getAttribute('data-view') === 'release' && !/signed off/i.test(p.textContent));
          const pick = intake || openCase || stretch || release;
          if (pick) pick.click();
        });
        await sleep(1000);
        await shot(ck + '-pin-' + st.label.slice(0, 24));
        break;
      }
      case 'loading':
        /* CONFIRMED DEFECT (2 Aug review): after the rally's transmit badge,
           "Saving your badge..." never clears — the engine paints its suspense
           room into a detached node (awardBadge wiped the host). The pupil-side
           recovery is a refresh (the designed resume path). Use it, and record
           that we did. */
        if (same === 8) {
          const isWedge = await page.evaluate(() => {
            const p = document.querySelector('#chunk-host .panel-loading');
            return p && /Saving your badge/i.test(p.textContent || '');
          });
          if (isWedge) {
            note('!! CONFIRMED WEDGE: "Saving your badge..." never clears @ ' + ck + ' — refreshing (the designed resume path)');
            await shot(ck + '-WEDGE-saving-badge');
            await page.reload({ waitUntil: 'domcontentloaded' });
            await sleep(2400);
            await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
            await sleep(1200);
            await page.evaluate(t => {
              const tile = Array.from(document.querySelectorAll('.tile')).find(e => e.textContent.includes(t));
              if (tile) tile.click();
            }, TITLES[NUM]);
            await sleep(2600);
            await shot(ck + '-after-refresh-resume');
            same = 0; lastKey = '';
          }
        }
        await sleep(700); break;
      /* THE TWO PYTHON ENGINES — DRIVEN FROM lib/walk-moves.js, NOT FROM A COPY
         HERE (19 Aug 2026, found by the first real walk of j2-2, which stalled
         eighteen turns deep on the matching desk).
         DFM 238a is the law and this is its MIRROR IMAGE. That entry was written
         when only the DETECTOR learned a new year: six screens recognised and
         unactionable, every walker but this one stalled. So the last round taught
         both halves of walk-moves.js — and this file was never in the list,
         because it does not use MOVES at all. It reads the detector from the one
         home and then works every screen from its own switch, so a new engine is
         recognised here and has nowhere to go.
         Fixed by delegating: the seven new kinds run the SAME mover both other
         walkers run, which is what "one fact, one home" is supposed to mean
         (DFM 144). The gestures stay in walk-moves; only the screenshots and the
         counters, which are this walker's own job, stay here. */
      case 'snap-pick':
      case 'snap-try':
      case 'snap-done':
      case 'pyrun-place':
      case 'pyrun-blank':
      case 'pyrun-run':
      case 'pyrun-next': {
        await sleep(GHOST_WAIT);
        /* installed here rather than at boot so it survives any navigation, and
           it early-returns once it is in place */
        await WALK.primeDevKeys(page, HOST);
        if (!shotOnce.has(st.kind)) { shotOnce.add(st.kind); await shot(ck + '-' + st.kind); }
        /* A STUCK WALKER THAT SAYS NOTHING IS THE PROBLEM (19 Aug 2026). The
           first three walks of j2-2 each stalled somewhere different and the log
           said only "STATE pyrun-place" forty-five times. The mover's own view of
           the card is reported on every turn, so the next stall names its cause
           on the first line instead of the forty-sixth. */
        const why = await page.evaluate(([k, src]) => {
          const fn = new Function('return (' + src + ')')();
          fn();
          const card = document.querySelector('.pyrun-card');
          const bid = card && card.getAttribute('data-build');
          const key = window.__walkKey ? window.__walkKey(bid) : null;
          return {
            build: bid, key: key ? (key.order || []).join(',') : 'NONE',
            tray: document.querySelectorAll('.pyt-list .pyrun-line').length,
            prog: Array.from(document.querySelectorAll('.pyp-list .pyrun-line')).map(n => n.getAttribute('data-si')).join(','),
            blanks: Array.from(document.querySelectorAll('.pyp-list .pyrun-blank')).map(i => i.getAttribute('data-key') + '=' + (i.value || '')).join(' '),
            run: (() => { const b = document.querySelector('.pyrun-run'); return b ? (b.disabled ? 'asleep' : 'armed') : 'none'; })()
          };
        }, [st.kind, String(WALK.MOVES[st.kind])]);
        if (same === 0 || same > 40) note('  ' + st.kind + ' :: ' + JSON.stringify(why));
        if (st.kind === 'pyrun-run') seen.marks++;
        await sleep(WALK.SETTLE[st.kind] || 600);
        break;
      }

      /* ANY KIND THE SHARED LIBRARY CAN DRIVE, DRIVEN (23 Aug 2026).
         This walker used to have no case for a kind it did not name, so a kind
         added to `lib/walk-moves.js` for the OTHER walker left this one printing
         "STATE gal-review" forty-five times and calling it stuck — which is DFM
         238(a) turned round the other way, and I did it to myself: Press Night
         got its own kinds for sit-wrongpath and this walk stopped dead at six
         screens of ten. Recognising a state and acting on it are one fact.
         THE PRESS COUNT IS MEASURED, NOT ASSUMED. The pinned shape counts what a
         pupil PRESSES, and these screens used to be pressed through the generic
         `button` case, which counted one each time. So the page counts the real
         clicks the mover makes and that number is added — the pin keeps meaning
         exactly what it meant (DFM 199). */
      default: {
        const mv = WALK.MOVES[st.kind];
        if (!mv) {
          note('STATE ' + st.kind + ' @ ' + ck + (st.text ? ' :: ' + st.text : ''));
          await sleep(800);
          break;
        }
        await sleep(GHOST_WAIT);
        if (!shotOnce.has(st.kind)) { shotOnce.add(st.kind); await shot(ck + '-' + st.kind); }
        const clicks = await page.evaluate(([src]) => {
          let n = 0;
          const count = () => { n++; };
          document.addEventListener('click', count, true);
          try { (new Function('return (' + src + ')')())(); } finally {
            document.removeEventListener('click', count, true);
          }
          return n;
        }, [String(mv)]);
        /* ONE TURN, ONE PRESS — the same accounting the `button` case above has
           always used, so the pinned number keeps measuring the same thing. A
           turn that only types counts nothing, exactly as `input` counts
           nothing. */
        if (clicks > 0) seen.presses++;
        note('SHARED MOVER ' + st.kind + ' @ ' + ck + ' (' + clicks + ' click(s))' + (st.dbg ? ' :: ' + st.dbg : ''));
        await sleep(WALK.SETTLE[st.kind] || 700);
        break;
      }
    }
  }

  /* final XP + record */
  const xp = await page.evaluate(() => window.App && window.App.state ? Number(window.App.state.xp) : -1);
  note('\nFINAL XP: ' + xp);
  /* AND WHAT THE RECORD ACTUALLY HOLDS (25 Aug 2026). `App.state.xp` is the
     CLIENT'S view; the number that matters to a pupil is the one in her record,
     which is what the year map, the clearance ladder and the Kit Locker all read.
     DFM 234's law is that a behaviour implemented in two places is a contract —
     and until today this walk reported one side of it and nothing checked the
     other. It is REPORTED, not asserted: the dev store is a preview mimic, and
     pinning a mimic's number would be exactly the mistake 234 was written about. */
  const rec = await page.evaluate(() => {
    try {
      const db = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
      const p = db.pupils || {};
      const k = Object.keys(p).find(x => (window.App && App.state && App.state.email)
        ? x.indexOf(App.state.email) !== -1 : false) || Object.keys(p)[0];
      return k ? { key: k, xp: p[k].xp, L: p[k].L } : null;
    } catch (e) { return { error: String(e.message) }; }
  });
  note('RECORD (preview store, reported not pinned): ' + JSON.stringify(rec));
  note('TURNS: ' + turns + '  (reported, asserted by nothing — DFM 199: this is the walker\'s own ' +
    'loop counter and it counts the passes where it waits for an animation)');
  note('CONSOLE ERRORS: ' + (errs.length ? '\n' + errs.join('\n') : 'none'));

  /* ---- THE GATE (DFM 199): only what holds steady ---- */
  /* CONTROL (DFM 146a/196): a gate nobody has ever seen fail is a decoration.
     KS3DT_CONTROL=1 moves one expected number by one and the run MUST then
     fail — proof the counters are real and the comparison bites.
     Run it after any change here:  KS3DT_CONTROL=1 node sit-review.js 5   */
  const CONTROL = process.env.KS3DT_CONTROL === '1';
  const want = EXPECT[NUM] && (CONTROL
    ? Object.assign({}, EXPECT[NUM], { presses: EXPECT[NUM].presses + 1 })
    : EXPECT[NUM]);
  const got = { xp: xp, chunks: seen.chunks.size, presses: seen.presses, marks: seen.marks, badges: seen.badges };
  let bad = [];
  if (want) {
    Object.keys(want).forEach(k => {
      if (got[k] !== want[k]) bad.push(k + ': expected ' + want[k] + ', got ' + got[k]);
    });
  }
  if (errs.length) bad.push('console errors: expected none, got ' + errs.length);
  const LOCKED = new Set(['1', '2', '3', '4', '5', 'S1', 'j2-1', 'j2-2', 'j3-1', 'j3-2']);
  /* DFM 267(f): an interactive control nested inside another one is a defect of
     the same class as his Space bar, wherever the walk finds it. */
  if (nestedHits.length) {
    bad.push('nested interactive controls: expected none, found ' + nestedHits.length);
    nestedHits.forEach(h => bad.push('  ' + h));
  }
  /* J13(b/c/d): the three derived audits. The DECLARED EXEMPTIONS are printed on
     every run, whether or not anything was found — an exemption nobody prints
     reads as a pass (DFM 204/213). */
  note('\nDERIVED AUDITS — asked on all ' + stateSeen.size + ' distinct SCREEN STATE(S) this walk stood on');
  note('  (readability is keyed by state, not by chunk — the second-sit fix: ' + contrastSeen.size +
       ' chunk(s), ' + stateSeen.size + ' states)');
  note('  contrast exemptions, declared: ' + CA.EXEMPTIONS.join(' · '));
  note('  empty-container exemptions, declared: ' + EE.EXEMPTIONS.join(' · '));
  note('  state-audit exemptions, declared: ' + SA.EXEMPTIONS.join(' · '));
  note('  ledger exemptions, declared: ' + LD.EXEMPTIONS.join(' · '));
  /* ---- A LOCKED LESSON'S EXPOSURE IS PRINTED, NOT FIXED (DFM 221 + 273a) ----
     Keying readability by STATE instead of by chunk turned the audit on hundreds
     of screens nobody had ever measured, and it found real faults on lessons he
     signed off weeks ago — ten on Lesson 3, four on Lesson 4, eleven on Lesson 5.
     Failing those walks would re-open his approvals, and he ruled on 28 August
     that approvals are never re-opened and that a locked lesson's exposure is
     REPORTED until he says the word. So on a locked lesson every finding is
     printed IN FULL and the walk does not fail; on a lesson under review it
     fails it. This is the same shape sit-wrongpath already uses for the
     click-destroys-placed-work trap, and for the same reason. */
  const waived = LOCKED.has(NUM);
  const findingsOut = [];
  if (emptyHits.length) findingsOut.push(['visible empty containers: expected none, found ' + emptyHits.length, emptyHits]);
  if (clickHits.length) findingsOut.push(['a single click destroyed placed work: expected never, found ' + clickHits.length, clickHits]);
  if (contrastHits.length) findingsOut.push(['text below its contrast floor: expected none, found ' + contrastHits.length, contrastHits]);
  if (findingsOut.length && waived) {
    note('\n' + findingsOut.reduce((a, f) => a + f[1].length, 0) + ' WAIVED FINDING(S) — ' + NUM +
      ' is LOCKED and signed off, so these are PRINTED rather than fixed (DFM 221/273a).');
    note('  They are real, and one word from him applies the fixes here too:');
    findingsOut.forEach(f => { note('  · ' + f[0]); f[1].forEach(h => note('    - ' + h)); });
  } else {
    findingsOut.forEach(f => { bad.push(f[0]); f[1].forEach(h => bad.push('  ' + h)); });
  }
  /* DFM 274, his own ruling of 28 Aug 2026 — and it applies to the locked
     lessons too, in his words, so this is a FAILURE on every lesson and not a
     printed note on the ones already signed off. */
  if (stepsHits.length) {
    bad.push('a numbered steps list is not left-aligned (DFM 274): found ' + stepsHits.length);
    stepsHits.forEach(h => bad.push('  ' + h));
  }
  /* fits-its-card is a NEW law (S9) meeting old screens, so it follows the same
     locked-lesson rule as readability: printed in full, never a silent pass, and
     it fails only a lesson under review. J1 Lesson 3's LED panel is the first
     thing it found — a decorative strip that bleeds 12px past its card on
     purpose — which is exactly why a law this young does not get to re-open a
     signed-off lesson on its own say-so (DFM 221/273a). */
  if (fitsHits.length && LOCKED.has(NUM)) {
    note('\n' + fitsHits.length + ' WAIVED FINDING(S) — ' + NUM + ' is LOCKED, so an element ' +
      'that renders outside its card is PRINTED here rather than changed:');
    fitsHits.forEach(h => note('  - ' + h));
  } else if (fitsHits.length) {
    bad.push('an element renders outside its own card: found ' + fitsHits.length);
    fitsHits.forEach(h => bad.push('  ' + h));
  }
  /* THE LEDGER GATE (S1). Debt this lesson ALREADY renders is printed on every
     run and never silently carried; debt it did not render before is a failure,
     because that is a new engine sentence walking onto a pupil card — the exact
     path "Exit check — part 2" took. His approvals are never re-opened
     (DFM 273a), so the baseline is what the shipped build already showed. */
  const debtNow = [...debtSeen].map(l => l.replace(/^[^:]*: /, ''));
  const debtVerdict = RD.check(NUM, debtNow);
  note('\nENGINE-DEBT ON SCREEN — ' + debtNow.length + ' outstanding ledger sentence(s) rendered by ' + NUM);
  debtNow.forEach(d => note('  · ' + d));
  if (debtVerdict.unset) note('  (no ceiling committed yet — run qa-engine-debt.js to write ENGINE_STRINGS_RENDERED.md)');
  if (debtVerdict.fresh.length) {
    bad.push('a sentence still OUTSTANDING on ENGINE_STRINGS_DEBT.md reached a pupil card that ' +
      'did not render it before: ' + debtVerdict.fresh.length);
    debtVerdict.fresh.forEach(h => bad.push('  NEW DEBT ON SCREEN: ' + h));
  }
  if (debtVerdict.gone.length) {
    note('  (' + debtVerdict.gone.length + ' baseline row(s) no longer rendered — re-run ' +
      'qa-engine-debt.js to lower the ceiling)');
  }
  RD.write(NUM, debtNow);
  fs.writeFileSync(path.join(OUT, '_derived-audits.json'), JSON.stringify({
    lesson: NUM, chunks: [...contrastSeen], states: stateSeen.size,
    contrast: contrastHits, empty: emptyHits, click: clickHits,
    steps: stepsHits, fits: fitsHits, engineDebt: debtNow, newDebt: debtVerdict.fresh,
    exemptions: { contrast: CA.EXEMPTIONS, empty: EE.EXEMPTIONS, state: SA.EXEMPTIONS, ledger: LD.EXEMPTIONS }
  }, null, 1) + '\n');
  /* A WALK THAT REACHED NOTHING IS NEVER A PASS, WHATEVER THE PIN SAYS
     (16 Aug 2026, and it caught itself). J3 Lesson 1 was pinned with a
     placeholder of all zeros while its numbers were still being measured; the
     lesson then failed to open at all, the walker visited 0 screens, and the
     run printed "the pinned shape holds". A gate that agrees with a walk that
     never happened is DFM 204's exact sin, inside the harness that exists to
     enforce it. Coverage is asserted, never merely compared. */
  if (got.chunks === 0) bad.push('the walk reached 0 screens — the lesson never opened, so nothing was tested');
  const line = 'SHAPE  xp=' + got.xp + '  screens=' + got.chunks + '  presses=' + got.presses +
    '  marking=' + got.marks + '  badges=' + got.badges + '  errors=' + errs.length;
  note(line);
  if (!want) note('(no pinned shape for lesson ' + NUM + ' — reported only)');
  else if (bad.length) {
    note('\nSIT-REVIEW ' + NUM + ': FAILED THE PINNED SHAPE');
    bad.forEach(b => note('  x ' + b));
  } else {
    note('\nSIT-REVIEW ' + NUM + ': the pinned shape holds — every number a pupil moves is exactly as expected.');
  }

  fs.writeFileSync(path.join(OUT, '_log.md'), log.join('\n'));
  await browser.close();
  console.log('\n' + line);
  if (bad.length) { bad.forEach(b => console.error('  x ' + b)); }
  console.log('DONE -> ' + OUT + '  (' + shotN + ' screenshots)');
  if (CONTROL) {
    if (bad.length) { console.log('CONTROL OK — a shape that is wrong by ONE press fails the gate.'); process.exit(0); }
    console.error('CONTROL FAILED — the gate did not notice a wrong number. It is decoration.');
    process.exit(1);
  }
  if (bad.length) process.exit(1);
})().catch(e => { console.error('DRIVER CRASH', e); process.exit(1); });
