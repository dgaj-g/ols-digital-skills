/* walk-moves.js — ONE HOME FOR "WHAT SCREEN AM I ON, AND HOW DO I WORK IT".
 *
 * WHY THIS FILE EXISTS. `sit-review.js` learned, over five lessons and many
 * rounds, how to drive every engine this platform has: a Vault file is a real
 * pointer DRAG, the oath needs a press-and-HOLD, a case log must be typed
 * before its close button arms, a QA row must be expanded before its test can
 * run. That knowledge is expensive and it was, until now, written down once.
 *
 * Then `capture-deck-shots.js` needed to stand on those same screens to
 * photograph them — and the FIRST version of that script wrote its own, dumber
 * navigator, which could not drag. It stalled at Lesson 1's Vault, ignored its
 * own arrival check, and photographed the Vault under three other screens'
 * names. Those slides were projected eight feet wide in front of a class
 * (DFM 225b). **The second copy of the walk was the fault.**
 *
 * So the detector lives HERE, once, and both walkers ask it (DFM 144: a fact
 * that changes lives in exactly one file; DFM 143b: when the app changes, every
 * walker re-stages, not just the one in front of you). `sit-review` keeps its
 * own bookkeeping — its screenshots, its XP counters, its pinned end-of-run
 * shape — because those are its job and not shared knowledge. What is shared is
 * the only thing both must agree about: what is on screen.
 *
 * PROOF THE EXTRACTION IS FAITHFUL: sit-review 1–5 must come back at their
 * EXACT pinned shapes (DFM 199 — the deterministic numbers, never the turn
 * count). If this file misread a single screen, those numbers move. That is why
 * the extraction is safe to make: the test that would catch it already exists
 * and is already required to run this round.
 *
 * Everything exported here is a PURE BROWSER FUNCTION — it is handed to
 * page.evaluate and must never close over anything in Node.
 */

/* ─────────────────────────── THE DETECTOR ─────────────────────────────────
   Priority order is load-bearing and is NOT alphabetical or tidy: a control
   that needs a special gesture must be recognised BEFORE the generic
   "click the primary button" fallback can reach it, or the walker clicks the
   wrong thing and reports a screen it never really worked. */
function detectKind() {
  /* WHAT "STILL NEEDS WRITING" MEANS, and it is not "is empty" (23 Aug 2026).
     Several gates on this platform arm on a WORD COUNT, not on a keystroke: the
     Jellyfish note wants six real words, and so does Press Night's review desk.
     The old test was `!e.value` — so the moment the confused-pupil battery
     dropped a three-word answer in to see the refusal, the box stopped looking
     empty, the screen fell through to the generic `button` kind, and the walker
     clicked a permanently locked tick for the rest of its budget. sit-wrongpath 4
     reported three honest coverage failures for it and they read as a lesson
     fault for months. A walker that cannot recognise an UNDER-filled control
     tests the lesson no better than one that cannot recognise a finished one
     (DFM 205). Short box (maxlength <= 40 — a name, a title): filled once it has
     anything. Number box: needs a number. Anything else: needs a sentence.
     IT IS INLINE, TWICE, ON PURPOSE — this function and the `input` mover are
     serialised into the PAGE, where nothing in module scope exists. */
  const needsWriting = (e) => {
    const v = String(e.value || '').trim();
    const ml = Number(e.getAttribute('maxlength') || 0);
    if (e.type === 'number') return v === '';
    if (e.tagName === 'INPUT' && ml && ml <= 40) return v.length < 2;
    return v.split(/\s+/).filter(Boolean).length < 6;
  };
  const q = s => document.querySelector(s);
  const vis = e => e && e.offsetParent !== null && !e.disabled;

  if (q('.badge-pop button')) {
    return {
      kind: 'badge',
      label: ((q('.badge-pop-card h2') || q('.badge-pop-card h3') || {}).textContent) || ''
    };
  }
  if (vis(q('.dossier-cta'))) return { kind: 'dossier-cta' };
  if (q('.se-card')) return { kind: 'selfeval' };

  /* ---- PRESS NIGHT (23 Aug 2026) ----------------------------------------
     THE HOLE THIS CLOSES, and it is DFM 238(a) exactly. The gallery floor and
     the review desk had no kind of their own, so the detector fell through to
     the generic `button` and the generic mover clicked whatever button it found
     first — which on the floor is the one that leaves the lesson. sit-review
     never noticed because it has its own switch; sit-wrongpath 5 walked to the
     gallery floor, was sent back to the hub and reported an honest coverage
     failure ("never stood on the closing screen") for MONTHS with nobody
     reading it as a walker fault. Recognising a state and acting on it are one
     fact and they live in one home. */
  if (q('.gal-desk')) {
    const empty = Array.from(document.querySelectorAll('.gal-desk .gal-stem-input'))
      .find(t => (t.value || '').trim().split(/\s+/).filter(Boolean).length < 5);
    if (empty) return { kind: 'gal-write' };
    if (vis(q('.gal-desk .gal-file-btn'))) return { kind: 'gal-file' };
    return { kind: 'gal-back' };
  }
  if (q('.gal-floor')) {
    if (vis(q('.gal-v2-save:not([disabled])'))) return { kind: 'gal-v2' };
    if (vis(q('.gal-wrap:not([disabled])'))) return { kind: 'gal-wrap' };
    if (q('.gal-v2-card.locked') &&
        Array.from(document.querySelectorAll('.gal-marquee-card.clickable')).some(vis)) {
      return { kind: 'gal-review' };
    }
    return { kind: 'gal-wait' };
  }

  /* studio QA desk: expand a row → run its test → pick the outcome → READY */
  if (q('.std-qa-row')) {
    if (q('.std-qa-outcomes:not([hidden]) .std-outcome')) return { kind: 'std-outcome' };
    if (Array.from(document.querySelectorAll('.std-qa-run')).some(b => vis(b))) return { kind: 'std-run' };
    const head = Array.from(document.querySelectorAll('.std-qa-row:not(.pass) .std-qa-head:not([disabled])')).find(vis);
    if (head) return { kind: 'std-expand', label: (head.textContent || '').trim().slice(0, 30) };
    if (q('.std-ready-btn.lit:not([disabled])')) return { kind: 'std-ready' };
  }

  /* studio sign phase: the three contract cards are on screen together */
  {
    const host1 = q('.chunk-host');
    if (q('.std-sig-input') && vis(q('.std-sig-input')) && !q('.std-qa-row') &&
        host1 && /Maze Escape/.test(host1.textContent) && /Quiz Master/.test(host1.textContent)) {
      return { kind: 'std-sign' };
    }
  }

  if (q('.rally-transmit')) {
    const after = q('.rally-after');
    if (after && after.textContent.trim()) {
      return { kind: 'rally-after', revealed: !!q('.rally-reveal .reveal-row, .rally-reveal [class*="bar"]') };
    }
    return { kind: 'rally' };
  }

  /* Lesson 1's Vault and oath. Both outrank the generic handlers below: a vault
     file is not a button, and the oath's sign control does nothing at all on a
     plain click. */
  if (q('.vault-file:not(.filed)') && vis(q('.vault-folder'))) return { kind: 'vault' };
  if (vis(q('.oath-sign:not([disabled])'))) return { kind: 'hold-sign' };

  /* J3's Compass (the `compass` engine, 16 Aug 2026) and the optional tail on
     an items chunk. Both outrank the generic handlers: a compass side is not a
     primary button, and the stretch gate has TWO real choices on it. */
  if (q('.stretch-go') && vis(q('.stretch-go'))) return { kind: 'stretch-gate' };
  if (q('.cmp-needle')) return { kind: 'cmp-done' };
  if (q('.cmp-card') && q('.cmp-side')) {
    return vis(q('.cmp-settle')) && !q('.cmp-settle').disabled
      ? { kind: 'cmp-settle' } : { kind: 'cmp-pick' };
  }

  /* J2's Workshop Safety Inspection (the `inspect` engine, 16 Aug 2026). Two
     states, and they must be told apart before the generic handlers below: a
     scene she is still flagging, and the report card she gets back after
     filing. The report outranks the scene because both are on screen together
     — filing leaves the picture up with the report underneath it. */
  if (q('.insp')) {
    if (vis(q('.insp-next'))) return { kind: 'insp-next' };
    if (vis(q('.insp-file'))) return { kind: 'insp-scene' };
  }

  /* J2/J3 Lesson 2 — the snap desk and the build card (19 Aug 2026). Both
     outrank the generic handlers below and BOTH halves are taught here at once:
     `walk-moves` exists so that recognising a screen and acting on it are one
     fact in one home, and the last round proved what happens when only the
     detector learns a new year (DFM 238a — six screens recognised and
     unactionable, every walker but sit-review stalled at the first room). */
  if (q('.snap-card')) {
    if (vis(q('.snap-done button'))) return { kind: 'snap-done' };
    if (q('.snap-block.picked')) return { kind: 'snap-try' };
    if (vis(q('.snap-block'))) return { kind: 'snap-pick' };
  }
  /* THE EXTRA JOBS ZONE (DFM 265, 26 Aug 2026) — and the V54 stretch OFFER it
     replaced, now deleted from this file along with the card it drove.
     A detector that recognises a screen nothing renders any more is dead weight
     that reads like coverage; `.pyrun-offer-card` exists in no engine and in no
     lesson, so it goes in the same edit as the engine change.
     WHAT REPLACES IT IS TAUGHT TO THE DETECTOR AND TO THE MOVERS TOGETHER,
     because DFM 238(a) is exactly the fault of doing one without the other: six
     J2/J3 screens were once recognised and unactionable, and every walker but
     sit-review stalled at the first room.
     The two walkers do OPPOSITE things here, and both halves matter (K11d):
     the right-path walker takes every job and then finishes, so no job's card,
     tray or verdict ever ships with nothing having stood on it; the
     confused-pupil walker opens one, ABANDONS it half-built, and then presses
     Finish the lesson from the hub — which is his own time-up scenario. */
  /* ---- J2/J3 LESSON 3, and the reason this block exists ------------------
     The expert walker ran 180 turns on ONE card of j2-03 and never left it: the
     worked example opens a CONVERSATION, and a conversation has a reply box —
     a surface that did not exist anywhere on the platform before this round, so
     no kind matched it, so the walker fell through to the generic button
     handler, which found nothing to press, and looped. That is the exact fault
     recorded at the top of this file for Press Night, arriving again with a new
     engine (DFM 204): a walk that stops is not a lesson that is covered.
     THE CONVERSATION COMES FIRST, before any pyrun rule, because it is drawn
     INSIDE a `.pyrun-card` and would otherwise be shadowed by the card's own
     tray and RUN rules. */
  /* WAITING FOR A PARTNER IS A STATE, NOT A STUCK SCREEN. The only control on
     the waiting card is the ghost button that gives up and works alone, so a
     walker with no rule for this card pressed it — and left the pair every
     time, which is why neither Lesson 3 walk could ever reach its own paired
     activity. A pupil waits; so does the walk. */
  if (q('.pair-wait') && !q('.swap-card') && !q('.duel-card')) return { kind: 'pair-wait' };

  if (vis(q('.pyx-ask .pyx-reply:not([disabled])'))) return { kind: 'pyx-reply' };

  /* THE MATCH. Options first, then the typed rounds, then the reveal's own way
     on — each a distinct state with a distinct control, so a stuck walker names
     which one it stuck on rather than "a duel card". */
  if (q('.duel-card')) {
    /* ANSWER FIRST, THEN LOCK. The first cut asked whether the LOCK button was
       armed before looking for an option to pick -- and lock only arms once an
       answer exists, so the walker could never reach the picking branch, fell
       through to a `.duel-goal` that is an <h2> and not a button at all, and
       committed nothing for six rounds while the run still printed green. */
    if (vis(q('.duel-next:not([disabled])'))) return { kind: 'duel-next' };
    if (vis(q('.duel-done:not([disabled])'))) return { kind: 'duel-done' };
    if (q('.duel-lock')) {
      const opts = Array.from(document.querySelectorAll('.duel-options .duel-option'));
      if (opts.length && !opts.some(o => o.classList.contains('is-picked'))) return { kind: 'duel-pick' };
      const typed = q('.duel-say:not([disabled]):not([readonly])');
      if (typed && !String(typed.value || '').trim()) return { kind: 'duel-type' };
      if (vis(q('.duel-lock:not([disabled])'))) return { kind: 'duel-lock' };
      return { kind: 'duel-wait' };
    }
    /* the way out is the LAST thing looked at, never the first: checking it
       first made the expert walker leave the Match on its opening screen and
       collect a badge for having predicted nothing */
    if (vis(q('.duel-finish:not([disabled])'))) return { kind: 'duel-finish' };
    return { kind: 'duel-wait' };
  }

  /* THE SWAP. Same discipline: the report form, the send, the seal and the
     solo seat are four different screens and four different kinds. */
  if (q('.swap-card')) {
    if (vis(q('.swap-send-report:not([disabled])'))) {
      const empty = Array.from(document.querySelectorAll('.swap-report .swap-field'))
        .filter(vis).find(f => !String(f.value || '').trim());
      if (empty) return { kind: 'swap-write' };
      return { kind: 'swap-send' };
    }
    if (vis(q('.swap-report-btn:not([disabled])'))) return { kind: 'swap-report' };
    if (vis(q('.swap-solo-go:not([disabled])')) || vis(q('.swap-solo-btn:not([disabled])'))) return { kind: 'swap-solo' };
    if (vis(q('.swap-go:not([disabled])'))) return { kind: 'swap-go' };
    if (vis(q('.swap-done:not([disabled])'))) return { kind: 'swap-done' };
    /* last, for the same reason as the Match's */
    if (vis(q('.swap-finish:not([disabled])'))) return { kind: 'swap-finish' };
    return { kind: 'swap-wait' };
  }

  /* THE TYPED EDITOR. It has no tray to place from, so every pyrun rule below
     would miss it. The starter button is taken FIRST when the box is empty,
     because that is the route a pupil with nothing on the page is offered. */
  /* AN EXPERT WRITES A PROGRAM. The first cut of this had the walker press the
     ready-made-line chips, which is what a pupil who is stuck does, and it
     never pressed RUN -- so the editor, its checklist and its verdict were
     walked past rather than through. It now types ONE working program (from the
     encrypted keys, never from the pupil's own screen) and runs it, which is
     the only way the checklist can be proved to tick on a real run rather than
     on a read. */
  /* THE STAGED SHAPE SHOWS ITS PLAN FIRST (K41, 27 Aug 2026). A face with one
     button on it is not a screen the editor rules can act on, and the detector
     falling through to `pyrun-run` is how the walk came to press an EMPTY RUN on
     every turn for ever — DFM 238(a)'s exact fault: a state that is RECOGNISED
     and unactionable. The plan has its own kind and its own mover. */
  if (q('.pye-plan') && vis(q('.pye-start'))) return { kind: 'pye-plan' };
  /* `.pye-bench` is the second face and it IS an editor card. `.pye-card` stays
     in the list because the unstaged shape still exists in the engine. */
  const pyeCard = Array.from(document.querySelectorAll('.pye-bench, .pye-card'))
    .find(n => n.tagName === 'DIV' && n.querySelector('.pye-code'));
  if (pyeCard) {
    const ta = pyeCard.querySelector('.pye-code');
    const bid = pyeCard.getAttribute('data-build');
    const key = window.__walkKey ? window.__walkKey(bid) : null;
    const want = key && key.program ? String(key.program) : null;
    if (want && String(ta.value || '') !== want) return { kind: 'pye-write', ph: bid || '' };
    if (!want && !String(ta.value || '').trim() && vis(pyeCard.querySelector('.pyp-chip'))) return { kind: 'pye-chip' };
    if (vis(q('.pye-send-card:not([disabled])'))) return { kind: 'pye-send' };
    if (vis(pyeCard.querySelector('.pyrun-run:not([disabled])'))) return { kind: 'pye-run' };
    if (vis(q('.pyrun-verdict .primary-btn'))) return { kind: 'pyrun-next' };
  }

  if (q('.pyrun-hub')) {
    const jobs = Array.prototype.slice.call(document.querySelectorAll('.pyrun-hub .pyrun-job'));
    const left = jobs.filter(function (b) { return !b.querySelector('.pyrun-job-tick'); }).length;
    return { kind: 'pyrun-hub', jobs: jobs.length, left: left };
  }
  if (q('.pyrun-card')) {
    /* inside an extras job the way back is the exit row's own button, and after a
       MATCH it is the one promoted to primary — so the verdict never carries a
       primary button of its own there, and `pyrun-next` would find nothing */
    const extraRow = q('.pyrun-card .pyrun-exit-row');
    if (extraRow && vis(q('.pyrun-card .pyrun-back.primary-btn'))) return { kind: 'pyrun-job-done' };
    if (vis(q('.pyrun-verdict .primary-btn'))) return { kind: 'pyrun-next' };
    /* "THE TRAY IS NOT EMPTY" DOES NOT MEAN "STILL PLACING" (19 Aug 2026, found
       by the first real walk of j2-2). Parsons empties its tray, so tray-empty
       was a safe proxy there. A pyrun build deliberately leaves its DECOYS in the
       tray for ever — j2-02 keeps three lines with real slips in them, and that
       is the whole design — so this rule could never be satisfied and the walker
       looped on pyrun-place with all four correct lines already in place and RUN
       sitting armed beside it. Ask the real question instead: is anything the
       program still WANTS unplaced? The key comes from the walker's own route
       (see primeDevKeys), never from the pupil's client, which does not hold it. */
    const wantOrder = (() => {
      /* A WORKED CARD HAS AN ORDER AND NO TRAY (28 Aug 2026). The worked example was
         given an answer key so a machine could RUN it and prove its card's target is
         true — and the moment it had one, this test said "lines still to place" on a
         card with nothing to place, and the walk stalled there with thirteen screens
         unvisited. The key is about the PROGRAM; the tray is about the SCREEN. Ask
         the screen. */
      if (q('.pyw-card') && !q('.pyt-list')) return null;
      const card = q('.pyrun-card');
      const bid = card && card.getAttribute('data-build');
      const k = window.__walkKey ? window.__walkKey(bid) : null;
      return (k && k.order) || null;
    })();
    if (wantOrder) {
      const placed = Array.from(document.querySelectorAll('.pyp-list .pyrun-line'))
        .map(n => Number(n.getAttribute('data-si')));
      /* THE ORDER IS THE ANSWER, NOT THE MEMBERSHIP (28 Aug 2026, from the trace).
         This asked only "is anything MISSING?" — so a walker holding the right four
         lines in the wrong order was told there was nothing to place, fell through to
         RUN, and pressed it unchanged for the rest of its budget. The confused walker
         takes lines in the order the shuffled tray offers them, so that is the state it
         reaches on every assemble card. What is placed has to be a PREFIX of what the
         answer asks for; anything else is still a placing job. The expert places in the
         answer's own order, so her sequence is always a prefix and nothing changes for
         her. */
      /* THE ORDER TEST ONLY APPLIES WHERE THE CARD OFFERS A LABELLED WAY BACK
         (28 Aug 2026, after the locked-lesson regression caught me twice). Putting a
         wrongly-placed line right means taking one OFF, and on a card whose tray ejects
         on click that is the same gesture as putting one ON — so the strip and the take
         fight each other and the walk stops. Every card that carries a `.take-back`
         button has `trayClickEject: false` and can be undone safely; every card without
         one is a signed-off lesson behaving exactly as it did before tonight, and DFM 221
         says I do not change that without his word. So: reorder where it is safe, and
         leave the locked lessons on the behaviour they shipped with. */
      /* THE ORDER TEST IS OFF (28 Aug 2026, 02:10). It was written for J3's Build 3,
         where the confused walker ends up holding the right lines in the wrong order and
         has a labelled take-back button to put them right with. It took that card from a
         dead stop to a full pass — and it also took two LOCKED lessons from 15-of-15 and
         16-of-16 down to 9 and 10, proved by running both from the `7d9c274` worktree.
         Three attempts to scope it safely made things worse, not better, and a harness
         change that breaks two signed-off lessons is not shippable however good its
         intent. So it is DISABLED here, in one line, with its machinery left in place and
         its reasoning intact for the round that finishes it properly. The two L3 confused
         walks go back to stopping at Build 3; that gap is named in COVERAGE_DEBT.md rather
         than papered over. */
      const underReview = ['j2-3', 'j3-3'].indexOf(window.__walkLesson) !== -1;
      const prefixOk = !underReview || placed.every((v, i) => v === Number(wantOrder[i]));
      const missing = wantOrder.some(si => placed.indexOf(Number(si)) === -1);
      /* GAPS FIRST, THEN THE RUN THAT FAILS (28 Aug 2026). With the order test in, the
         walker fixed the arrangement before it had typed anything into the gaps — so its
         two "press RUN and let it fail" goes were spent on a program the engine REFUSES
         to run at all ("one of the gaps is still empty"), and the two failure-state
         landmarks, the red console and NOT YET, were never on screen to be stood on.
         A pupil fills the gaps and then runs it. So does she: while every line the answer
         wants is present, an empty gap outranks a wrong order. */
      const emptyBlank = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank'))
        .filter(vis).some(i => !i.value);
      if (missing || (!prefixOk && !emptyBlank)) {
        return { kind: extraRow ? 'pyrun-extra-place' : 'pyrun-place' };
      }
    } else if (q('.pyt-list .pyrun-line')) {
      return { kind: extraRow ? 'pyrun-extra-place' : 'pyrun-place' };
    }
    /* AN EMPTY TRAY IS NOT THE SAME AS A RIGHT PROGRAM (27 Aug 2026, the second
       J3 confused walk). The confused walker takes EVERY line across, decoys
       included, so the tray empties while the program is still wrong. This test
       fell straight through to the blanks, so 'pyrun-place' — where the move that
       takes a decoy BACK lives — could never be reached again, and the walk
       pressed RUN on the same wrong program until it ran out of screens: DFM
       238(a)'s fault exactly, a state RECOGNISED and unactionable.
       It is gated on a run that has really FAILED, so the expert walker (which
       never over-places) is untouched, and the confused one undoes her mistake
       the way a pupil does — after seeing it not work, not before. */
    if (wantOrder && wantOrder.length && ['j2-3', 'j3-3'].indexOf(window.__walkLesson) !== -1) {
      const placedNow = document.querySelectorAll('.pyp-list .pyrun-line').length;
      if (placedNow > wantOrder.length) {
        return { kind: extraRow ? 'pyrun-extra-place' : 'pyrun-place' };
      }
    }
    const blank = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank'))
      .filter(vis).find(i => !i.value);
    if (blank) return { kind: 'pyrun-blank', ph: blank.getAttribute('data-key') || '' };
    /* A PRE-FILLED BLANK CAN STILL BE THE THING THAT IS WRONG. The worked
       example ships with `naem` already typed into it -- the planted mistake the
       whole card is about -- so "find a blank with no value in it" found nothing
       and the walker pressed RUN on the same broken program for ever.
       ONLY AFTER IT HAS REALLY FAILED. An expert sitting the lesson presses RUN,
       reads what Python says, and then fixes the spelling; a walker that
       corrected it before trying would sail past the one thing the card teaches
       and prove that the planted mistake was never met. */
    const failed = !!(q('.pyc.is-bad') || q('.pyrun-verdict.is-notyet'));
    if (failed) {
      const card2 = q('.pyrun-card');
      const bid2 = card2 && card2.getAttribute('data-build');
      const k2 = window.__walkKey ? window.__walkKey(bid2) : null;
      const wrong = (k2 && k2.blanks)
        ? Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank'))
            .filter(vis).find(i => {
              const kk = i.getAttribute('data-key');
              return k2.blanks[kk] != null && String(i.value) !== String(k2.blanks[kk]);
            })
        : null;
      if (wrong) return { kind: 'pyrun-blank-fix', ph: wrong.getAttribute('data-key') || '' };
    }
    if (vis(q('.pyrun-run'))) return { kind: 'pyrun-run' };
  }

  if (q('.q-feedback button') && vis(q('.q-feedback button'))) return { kind: 'q-next' };
  if (q('.q-opt:not(:disabled)')) return { kind: 'q-opt' };

  /* L4 case board: drive the PIN BUTTONS by priority — intake first, then open
     cases, then the stretch, then the release desk. A closed pin carries a
     .case-stamp child. */
  if (q('.case-board')) {
    const pins = Array.from(document.querySelectorAll('button.case-pin:not([disabled])'));
    const intake = pins.find(p => p.getAttribute('data-view') === 'intake' && !p.classList.contains('done'));
    const openCase = pins.find(p => p.hasAttribute('data-case') && !p.querySelector('.case-stamp'));
    const stretch = pins.find(p => p.classList.contains('case-stretch') && !p.querySelector('.case-stamp'));
    const release = pins.find(p => p.getAttribute('data-view') === 'release' && !/signed off/i.test(p.textContent));
    const pick = intake || openCase || stretch || release;
    if (pick) {
      return { kind: 'case-pin', label: (pick.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
    }
    /* board exhausted — fall through to generic (a Continue should exist) */
  }

  if (q('.parsons-card')) return { kind: 'parsons' };

  /* L4 case file open: fill the log, THEN the close button arms */
  if (q('.case-close-btn')) {
    const btn = q('.case-close-btn');
    const ta = q('.case-log-input');
    if (q('.case-stamp.big')) return { kind: 'case-stamped' };
    if (ta && !ta.value) return { kind: 'case-log' };
    if (!btn.disabled && !btn.classList.contains('ticked')) return { kind: 'case-close' };
    return { kind: 'case-wait' };
  }

  /* an empty gating textarea/input outranks a pending confirm — logs and notes
     must be written before their confirms arm */
  {
    const host0 = q('.chunk-host');
    if (host0) {
      const ta0 = Array.from(host0.querySelectorAll('textarea, input[type=text], input[type=number], input:not([type])'))
        .filter(vis).filter(needsWriting);
      if (ta0.length) return { kind: 'input', ph: ta0.map(e => e.placeholder || e.className).join(' | ') };
    }
  }

  /* `:not(.locked)`: the casework gate redesign replaced `disabled` with a
     `.locked` class + aria-disabled, so a locked control can still be CLICKED
     and answer why it is locked. A walker that can click a locked control is a
     walker whose green means less than it looks. */
  const CONFIRM_OPEN = '.confirm-step:not(.ticked):not([disabled]):not(.locked)';
  if (q(CONFIRM_OPEN)) return { kind: 'confirm', label: (q(CONFIRM_OPEN) || {}).textContent || '' };
  if (q('.tour-callout button')) return { kind: 'tour' };
  if (q('.panel-loading')) return { kind: 'loading' };

  const host = q('.chunk-host');
  if (!host) return { kind: 'nohost' };
  const ta = Array.from(host.querySelectorAll('textarea, input[type=text], input[type=number], input:not([type])'))
    .filter(vis).filter(needsWriting);
  if (ta.length) return { kind: 'input', ph: ta.map(e => e.placeholder || e.className).join(' | ') };
  const b = Array.from(host.querySelectorAll('button')).filter(vis);
  if (!b.length) return { kind: 'stuck', text: (host.textContent || '').replace(/\s+/g, ' ').slice(0, 160) };
  const pri = b.find(x => x.classList.contains('primary-btn')) || b[0];
  return { kind: 'button', label: (pri.textContent || '').trim().slice(0, 40), all: b.map(x => (x.textContent || '').trim().slice(0, 30)) };
}

/* ─────────────── WHERE THE WALK IS STANDING (for honest failure) ───────────
   Used by both walkers when something goes wrong. A capture that cannot say
   where it was standing is exactly the capture that shipped the Vault three
   times under other screens' names. */
function whereAmI() {
  const s = window.App && App.state && App.state.chunks && App.state.chunks[App.state.chunkIdx];
  const h = document.querySelector('.chunk-host');
  const head = h && h.querySelector('h1, h2, h3');
  return {
    chunk: s ? s.id : '(no chunk)',
    heading: head ? (head.textContent || '').trim().slice(0, 80) : '(no heading)',
    text: h ? (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160) : '(no host)'
  };
}

/* the chunk id the app is really on — the one fact every predicate leans on */
function chunkNow() {
  const s = window.App && App.state && App.state.chunks && App.state.chunks[App.state.chunkIdx];
  return s ? s.id : null;
}

/* ───────────────────── THE MOVES (pure, one per kind) ─────────────────────
   `sit-review` keeps its own switch, because it takes a screenshot between the
   sub-steps of several of these and counts what it presses. The CAPTURE walk
   wants none of that bookkeeping — it only wants to arrive — so it uses these.
   Both sides read the SAME detector above, which is the part that must agree.

   Each move is written to be safe when it is not applicable: it does what it
   can and returns, rather than throwing, because the walk re-detects every
   turn anyway. */
const MOVES = {
  badge: () => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); },
  'dossier-cta': () => { const b = document.querySelector('.dossier-cta'); if (b) b.click(); },
  confirm: () => {
    const c = document.querySelector('.confirm-step:not(.ticked):not([disabled]):not(.locked)');
    if (c) c.click();
  },
  tour: () => { const b = document.querySelector('.tour-callout button'); if (b) b.click(); },
  /* ---- J2/J3 Lesson 2 --------------------------------------------------
     THE SNAP DESK IS BRUTE-FORCED, ON PURPOSE. The engine reveals nothing on a
     wrong pair, which is the point of it — so a walker cannot be told the
     answer by the screen and must not be handed one in a second copy of the
     content (DFM 225b's fault). It picks a block and tries each Python line it
     has not yet tried against THAT block, so the walk terminates in at most
     n tries per block and exercises the wrong path as well as the right one. */
  /* ---- J2/J3 Lesson 3 ---------------------------------------------------- */
  /* A REAL ANSWER, not a keystroke. The bot asks what she is called and what she
     likes; an empty string would be answered by a bot that then prints "Hello "
     and nothing, which is a screen no pupil produces. */
  'pair-wait': () => {},
  'pyx-reply': () => {
    const box = document.querySelector('.pyx-ask .pyx-reply:not([disabled])');
    if (!box) return;
    window.__pyxN = (window.__pyxN || 0) + 1;
    const words = ['Aoife', 'chips', 'Down', 'Art', 'green', 'Tuesday'];
    box.value = words[window.__pyxN % words.length];
    box.dispatchEvent(new Event('input', { bubbles: true }));
    const send = document.querySelector('.pyx-ask .pyx-send:not([disabled])');
    if (send) send.click();
  },
  /* THE EXPERT ANSWERS THE MATCH, and answers it RIGHT. The first cut picked
     the first option it found and typed one fixed string, which scored 0 of 6
     every run -- so the round's badge was never earned and the whole earning
     path went untested while the walk printed green. */
  'duel-pick': () => {
    const card = document.querySelector('.duel-card');
    const at = Number(card && card.getAttribute('data-round'));
    const ans = window.__walkAnswers ? window.__walkAnswers() : null;
    const want = (ans && !isNaN(at)) ? ans['r' + (at + 1)] : null;
    const norm = x => String(x == null ? '' : x).replace(/\s+/g, ' ').trim().toLowerCase();
    const opts = Array.from(document.querySelectorAll('.duel-options .duel-option'));
    const hit = want != null ? opts.find(o => norm(o.getAttribute('data-v')) === norm(want)) : null;
    const pick = hit || opts.find(o => !o.classList.contains('is-picked')) || opts[0];
    if (pick) pick.click();
  },
  'duel-type': () => {
    const t = document.querySelector('.duel-say:not([disabled]):not([readonly])');
    if (!t) return;
    const card = document.querySelector('.duel-card');
    const at = Number(card && card.getAttribute('data-round'));
    const ans = window.__walkAnswers ? window.__walkAnswers() : null;
    const want = (ans && !isNaN(at)) ? ans['r' + (at + 1)] : null;
    t.value = want != null ? String(want) : 'Curtain Up';
    t.dispatchEvent(new Event('input', { bubbles: true }));
  },
  'duel-lock': () => { const b = document.querySelector('.duel-lock:not([disabled])'); if (b) b.click(); },
  'duel-done': () => { const b = document.querySelector('.duel-done:not([disabled])'); if (b) b.click(); },
  'duel-next': () => { const b = document.querySelector('.duel-next:not([disabled])'); if (b) b.click(); },
  'duel-finish': () => { const b = document.querySelector('.duel-finish:not([disabled])'); if (b) b.click(); },
  'duel-wait': () => {},
  'swap-go': () => { const b = document.querySelector('.swap-go:not([disabled])'); if (b) b.click(); },
  'swap-solo': () => { const b = document.querySelector('.swap-solo-go:not([disabled]), .swap-solo-btn:not([disabled])'); if (b) b.click(); },
  'swap-report': () => { const b = document.querySelector('.swap-report-btn:not([disabled])'); if (b) b.click(); },
  /* every box filled with a sentence a pupil could really have written — a
     one-character report would tick the same gate and prove nothing */
  'swap-write': () => {
    const said = ['It asked my name and what I like.',
                  'The first line made me laugh.',
                  'It never used my second answer for anything.',
                  'I would keep the ending.'];
    Array.from(document.querySelectorAll('.swap-report .swap-field')).forEach((f, i) => {
      if (String(f.value || '').trim()) return;
      f.value = said[i % said.length];
      f.dispatchEvent(new Event('input', { bubbles: true }));
    });
  },
  'swap-send': () => { const b = document.querySelector('.swap-send-report:not([disabled])'); if (b) b.click(); },
  'swap-done': () => { const b = document.querySelector('.swap-done:not([disabled])'); if (b) b.click(); },
  'swap-finish': () => { const b = document.querySelector('.swap-finish:not([disabled])'); if (b) b.click(); },
  'swap-wait': () => {},
  'pye-plan': () => { const b = document.querySelector('.pye-start'); if (b) b.click(); },
  'pye-starter': () => { const b = document.querySelector('.pye-starter-btn:not([disabled])'); if (b) b.click(); },
  'pye-write': () => {
    const card = Array.from(document.querySelectorAll('.pye-bench, .pye-card'))
      .find(n => n.tagName === 'DIV' && n.querySelector('.pye-code'));
    if (!card) return;
    const key = window.__walkKey ? window.__walkKey(card.getAttribute('data-build')) : null;
    if (!key || !key.program) return;
    const ta = card.querySelector('.pye-code');
    ta.value = String(key.program);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  },
  'pye-chip': () => { const c = document.querySelector('.pyp-chip'); if (c) c.click(); },
  'pye-send': () => { const b = document.querySelector('.pye-send-card:not([disabled])'); if (b) b.click(); },
  'pye-run': () => { const b = document.querySelector('.pyrun-run:not([disabled])'); if (b) b.click(); },
  'snap-pick': () => {
    const b = document.querySelector('.snap-block:not(.snapped)');
    if (b) b.click();
  },
  'snap-try': () => {
    window.__snapTried = window.__snapTried || {};
    const picked = document.querySelector('.snap-block.picked');
    if (!picked) return;
    const bi = picked.getAttribute('data-b');
    const done = window.__snapTried[bi] || (window.__snapTried[bi] = {});
    const next = Array.from(document.querySelectorAll('.snap-py:not(.snapped)'))
      .find(n => !done[n.getAttribute('data-p')]);
    if (next) { done[next.getAttribute('data-p')] = 1; next.click(); }
    else picked.click();   /* every line tried: unpick and let the walk re-detect */
  },
  'snap-done': () => { const b = document.querySelector('.snap-done button'); if (b) b.click(); },

  /* ---- PRESS NIGHT: pick a studio, write the review, file it, then the V2
     note and the wrap. Every one of these is a control the lesson itself tells
     her to press, in the order it tells her. */
  'gal-review': () => {
    const vis2 = (e) => e && e.offsetParent !== null;
    const mq = Array.from(document.querySelectorAll('.gal-marquee-card.clickable:not(.reviewed)'))
      .filter(vis2)[0] || Array.from(document.querySelectorAll('.gal-marquee-card.clickable')).filter(vis2)[0];
    if (mq) mq.click();
  },
  'gal-write': () => {
    /* the desk refuses anything under five real words per line, on purpose —
       so the walker writes a real sentence rather than padding (DFM 193a: the
       machine never vets her words, but it does hold an honesty floor) */
    const t = Array.from(document.querySelectorAll('.gal-desk .gal-stem-input'))
      .find(x => (x.value || '').trim().split(/\s+/).filter(Boolean).length < 5);
    if (!t) return;
    t.value = t.getAttribute('data-stem') === 'wonder'
      ? 'I wonder whether a second danger would make the middle harder'
      : 'I liked the way the score jumps the moment you catch one';
    t.dispatchEvent(new Event('input', { bubbles: true }));
    t.dispatchEvent(new Event('change', { bubbles: true }));
  },
  'gal-file': () => { const b = document.querySelector('.gal-desk .gal-file-btn'); if (b) b.click(); },
  'gal-back': () => { const b = document.querySelector('.gal-desk .std-back'); if (b) b.click(); },
  'gal-v2': () => {
    const t = document.querySelector('.gal-v2-card textarea');
    if (t && (t.value || '').trim().split(/\s+/).filter(Boolean).length < 5) {
      t.value = 'In version 2 I would add a second danger that moves faster';
      t.dispatchEvent(new Event('input', { bubbles: true }));
      t.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const b = document.querySelector('.gal-v2-save:not([disabled])');
    if (b) b.click();
  },
  'gal-wrap': () => { const b = document.querySelector('.gal-wrap:not([disabled])'); if (b) b.click(); },
  /* WAITING IS A STATE, NOT A STALL. On the floor with every pass spent and the
     V2 note filed, the only thing left is the wrap — and if it is not lit yet
     the honest move is to press nothing. Clicking the first button in sight
     here is what walked the old walker out of the lesson. */
  'gal-wait': () => {},

  /* THE BUILD CARD IS DRIVEN FROM THE LESSON'S OWN ANSWER KEY, and that is a
     deliberate difference from the snap desk. Correctness here is decided by
     RUNNING the program, so there is nothing on screen to brute-force against
     and a tray with real-slip decoys has more orders than a walk could try.
     The order and the blank values therefore live in the lesson's ENCRYPTED
     keys, which the client already holds for instant marking (rule 97) — so
     the walker reads exactly what the pupil's own machine holds, and nothing
     is duplicated into this file. The ENGINE never reads them: qa-pyrun proves
     that by stripping the key and watching a correct build still MATCH. */
  'pyrun-place': () => {
    const card = document.querySelector('.pyrun-card');
    const bid = card && card.getAttribute('data-build');
    const key = window.__walkKey ? window.__walkKey(bid) : null;
    const order = key && key.order;
    if (order && order.length) {
      const placed = Array.from(document.querySelectorAll('.pyp-list .pyrun-line'))
        .map(n => Number(n.getAttribute('data-si')));
      const want = order.find(si => placed.indexOf(Number(si)) === -1);
      if (want != null) {
        const n = document.querySelector('.pyt-list .pyrun-line[data-si="' + want + '"]');
        if (n) { n.click(); return; }
      }
      /* every wanted line is placed: leave the decoys in the tray */
      return;
    }
    /* AND IF THERE IS NOTHING MISSING BUT SOMETHING EXTRA, TAKE THE EXTRA BACK.
       The expert never over-places, so this cannot fire for her in practice — it is
       here so that "more lines placed than the answer needs" is an ACTIONABLE state
       on both walkers rather than a dead end on one of them (DFM 238a). */
    if (order && order.length) {
      const keep = new Set(order.map(String));
      for (const li of Array.from(document.querySelectorAll('.pyp-list li'))) {
        const line = li.querySelector('.pyrun-line');
        const si = line && line.getAttribute('data-si');
        if (si != null && !keep.has(String(si))) {
          const back = li.querySelector('.take-back');
          if (back) { back.click(); return; }
          (line.querySelector('code') || line).click(); return;
        }
      }
    }
    /* NO KEY, NO GUESS. This used to click any line in the tray, which is how a
       walk with no key placed all seven and looped on RUN for ever. */
  },
  'pyrun-blank': () => {
    const card = document.querySelector('.pyrun-card');
    const bid = card && card.getAttribute('data-build');
    const key = window.__walkKey ? window.__walkKey(bid) : null;
    const inp = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank'))
      .find(i => !i.value);
    if (!inp) return;
    const k = inp.getAttribute('data-key');
    const v = (key && key.blanks && key.blanks[k] != null) ? String(key.blanks[k]) : 'x';
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  },
  'pyrun-blank-fix': () => {
    const card = document.querySelector('.pyrun-card');
    const bid = card && card.getAttribute('data-build');
    const key = window.__walkKey ? window.__walkKey(bid) : null;
    if (!key || !key.blanks) return;
    const inp = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank'))
      .find(i => {
        const k = i.getAttribute('data-key');
        return key.blanks[k] != null && String(i.value) !== String(key.blanks[k]);
      });
    if (!inp) return;
    inp.value = String(key.blanks[inp.getAttribute('data-key')]);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  },
  'pyrun-run': () => { const b = document.querySelector('.pyrun-run:not([disabled])'); if (b) b.click(); },
  'pyrun-next': () => { const b = document.querySelector('.pyrun-verdict .primary-btn'); if (b) b.click(); },
  /* THE EXPERT TAKES EVERY EXTRA JOB, then leaves by the way out (DFM 265).
     Otherwise three job cards, their trays and their verdicts would ship with
     nothing having ever stood on them — and the walk would still print green,
     because a zone nobody enters raises no findings. */
  'pyrun-hub': () => {
    const next = Array.prototype.slice.call(document.querySelectorAll('.pyrun-hub .pyrun-job'))
      .find(function (b) { return !b.querySelector('.pyrun-job-tick'); });
    if (next) { next.click(); return; }
    const fin = document.querySelector('.pyrun-hub .pyrun-finish');
    if (fin) fin.click();
  },
  'pyrun-job-done': () => { const b = document.querySelector('.pyrun-card .pyrun-back'); if (b) b.click(); },
  /* an extras job is assembled EXACTLY as a core build is on the right path; the
     kind is separate only so the CONFUSED pupil can behave differently in the
     zone without touching how she behaves on a badged build (see WRONG_MOVES).
     Aliased rather than copied — two copies of the placement rule would drift the
     first time one of them was corrected (DFM 144). Assigned after the object is
     built, at the foot of this file. */

  'q-opt': () => { const o = document.querySelector('.q-opt:not(:disabled)'); if (o) o.click(); },
  'q-next': () => { const b = document.querySelector('.q-feedback button'); if (b) b.click(); },
  'case-pin': () => {
    const pins = Array.from(document.querySelectorAll('button.case-pin:not([disabled])'));
    const intake = pins.find(p => p.getAttribute('data-view') === 'intake' && !p.classList.contains('done'));
    const openCase = pins.find(p => p.hasAttribute('data-case') && !p.querySelector('.case-stamp'));
    const stretch = pins.find(p => p.classList.contains('case-stretch') && !p.querySelector('.case-stamp'));
    const release = pins.find(p => p.getAttribute('data-view') === 'release' && !/signed off/i.test(p.textContent));
    const pick = intake || openCase || stretch || release;
    if (pick) pick.click();
  },
  'case-log': () => {
    const ta = document.querySelector('.case-log-input');
    if (ta) {
      ta.value = 'The score stayed on zero when the shark caught the fish.';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },
  'case-close': () => { const b = document.querySelector('.case-close-btn'); if (b && !b.disabled) b.click(); },
  'case-stamped': () => {},
  'case-wait': () => {},
  /* ══════ THE J2/J3 SCREENS THE DETECTOR KNEW AND NOTHING HERE COULD MOVE ═══
     Found 17 Aug 2026, pointing the deck capture at J2/J3 Lesson 1 for the first
     time. The detector was taught both years' new screens when they were built
     on 16 August; MOVES and ACTIONS were not. So this shared library recognised
     six screens it could not get past — an inspection room, the optional-cases
     gate, and all three Compass states — and every walker except sit-review
     (which keeps its own switch, because it photographs and counts between the
     sub-steps) stalled at the first one it met.
     That is a shared library with a private half, which is the DFM 144 fault the
     extraction of this file was written to end. Recorded plainly rather than
     quietly patched, because "the detector knows it" had been standing in for
     "the walkers can do it". sit-review's behaviour is untouched, so every
     pinned shape is untouched. */
  'stretch-gate': () => {
    /* the EXPERT default: take the optional work. sit-wrongpath is the walker
       that stands on the refusal, and it presses the skip itself. */
    const go = document.querySelector('.stretch-go');
    if (go && !go.disabled) { go.click(); return; }
    const skip = document.querySelector('.stretch-skip');
    if (skip && !skip.disabled) skip.click();
  },
  'cmp-pick': () => {
    /* deterministically the FIRST side of every pair, which is what keeps the
       result card the same on every run (DFM 199) */
    document.querySelectorAll('.cmp-row').forEach(r => {
      if (r.querySelector('.cmp-side.on')) return;
      const b = r.querySelector('.cmp-side');
      if (b) b.click();
    });
  },
  'cmp-settle': () => {
    const b = document.querySelector('.cmp-settle');
    if (b && !b.disabled) b.click();
  },
  'cmp-done': () => {
    const b = document.querySelector('.cmp-done');
    if (b) b.click();
  },
  'std-expand': () => {
    const vis = e => e && e.offsetParent !== null;
    const head = Array.from(document.querySelectorAll('.std-qa-row:not(.pass) .std-qa-head:not([disabled])')).find(vis);
    if (head) head.click();
  },
  'std-run': () => {
    const vis = e => e && e.offsetParent !== null;
    const run = Array.from(document.querySelectorAll('.std-qa-run')).find(vis);
    if (run) run.click();
  },
  'std-outcome': () => {
    /* data-oi=0 is the authored PASS outcome on every criterion */
    const o = document.querySelector('.std-qa-outcomes:not([hidden]) .std-outcome[data-oi="0"]') ||
      document.querySelector('.std-qa-outcomes:not([hidden]) .std-outcome');
    if (o) o.click();
  },
  'std-ready': () => { const b = document.querySelector('.std-ready-btn.lit'); if (b) b.click(); },
  parsons: () => {
    const t = document.querySelector('.parsons-tray .parsons-block');
    if (t) { t.click(); return; }
    /* THE CARD'S OWN CHECK BUTTON, BY CLASS — and the text fallback needs WORD
       BOUNDARIES (27 Aug 2026). This used to be a substring test for
       `check|lock|submit`, and the moment a placed row gained a labelled way back
       reading "Take it back to the bLOCKs", the walker started pressing THAT on
       every turn: place four, unbuild one, place it again, for ever. It never
       reached the rest of the lesson, and the walk printed five screens of nine.
       A loose match would have done the same to "unlock", "blocked" or "clock".
       DFM 143(b)'s law, in a walker instead of a harness: a change on one side
       re-stages every reader of it. */
    const own = document.querySelector('.chunk-host .parsons-check:not([disabled])');
    if (own) { own.click(); return; }
    const b = Array.from(document.querySelectorAll('.chunk-host button'))
      .find(x => /\b(check|lock|submit)\b/i.test(x.textContent) && !x.disabled);
    if (b) b.click();
  },
  input: () => {
    const vis = e => e && e.offsetParent !== null && !e.disabled;
    const needsWriting = (e) => {
      const v = String(e.value || '').trim();
      const ml = Number(e.getAttribute('maxlength') || 0);
      if (e.type === 'number') return v === '';
      if (e.tagName === 'INPUT' && ml && ml <= 40) return v.length < 2;
      return v.split(/\s+/).filter(Boolean).length < 6;
    };
    const t = Array.from(document.querySelectorAll('.chunk-host textarea, .chunk-host input[type=text], .chunk-host input[type=number], .chunk-host input:not([type])'))
      .filter(vis).filter(needsWriting)[0];
    if (!t) return;
    /* WHAT THE WALKER TYPES ENDS UP ON A SLIDE. Lesson 5's marquee lists the
       studio name, the game title and the one-line pitch a pupil wrote — and
       the deck photographs that marquee. Filling every box with the same
       placeholder produced a listing reading "Preview capture run." three
       times, projected to a class as an example of a pupil's work.
       A number box also genuinely needs a number: prose leaves it empty, and
       the walk then loops for ever on a screen it believes it has filled. */
    const hint = (t.className + ' ' + (t.placeholder || '') + ' ' + (t.id || '')).toLowerCase();
    const pick = () => {
      /* THE ID FIRST, and this is not fussiness. Lesson 5's marquee form uses
         `#std-gt` (game title) and `#std-gh` (how to play) — and BOTH carry the
         class `std-sig-input`, the same class as the studio-name box. Matching
         on the class alone typed the studio name into all three, and the deck
         then photographed a marquee listing that read "Golden Otter Games"
         three times over, projected as an example of a pupil's work. */
      /* PER-PUPIL IDENTITY. Press Night's marquee lists other studios, and the
         deck photographs it — so if every simulated pupil types the same studio
         name and game title, the slide shows a pupil apparently reviewing
         herself. The capture sets `window.__studioIdentity` per pupil before
         the walk starts; anything else falls back to the first identity. */
      const who = (window.__studioIdentity || {});
      const id = (t.id || '').toLowerCase();
      if (id === 'std-gt') return who.title || 'Apple Catcher';
      if (id === 'std-gh') return who.how || 'Arrow keys move the bowl. Catch the apples — miss three and it ends.';
      if (id === 'std-name') return who.studio || 'Golden Otter Games';
      /* A TEXTAREA IS NEVER A NUMBER BOX, and this line used to say otherwise
         (23 Aug 2026). The heuristic matched the word "fish" ANYWHERE in the
         class, the id or the placeholder — and Lesson 4's Jellyfish Job asks for
         a release note in a textarea whose placeholder names the jellyfish. The
         walker typed "3" into it, the six-word gate stayed locked for ever, and
         sit-wrongpath 4 spent the rest of its budget on that one screen and
         reported three coverage failures that read as lesson faults.
         The type is the fact; the words were a guess (DFM 194c). */
      if (t.type === 'number') return '3';
      if (t.tagName === 'INPUT' && /\b(count|score|number|fish caught)\b/.test(hint)) return '3';
      if (/studio|sig|founder/.test(hint)) return (window.__studioIdentity || {}).studio || 'Golden Otter Games';
      if (/title|game name|call it/.test(hint)) return 'Apple Catcher';
      if (/how|play|pitch|one line|describe/.test(hint)) {
        return 'Arrow keys move the bowl. Catch the apples — miss three and the game ends.';
      }
      if (/v2|version 2|next/.test(hint)) return 'In version 2 I would add a golden apple worth three points, because it would make you choose which one to chase.';
      if (/log|what was wrong|changed/.test(hint)) return 'The score stayed on zero when the shark caught the fish, so I changed "change score by 0" to "change score by 1".';
      if (/note|stretch|added/.test(hint)) return 'A second variable that counts the lives left.';
      return 'Preview capture run.';
    };
    t.value = pick();
    t.dispatchEvent(new Event('input', { bubbles: true }));
  },
  loading: () => {},
  button: () => {
    const vis = e => e && e.offsetParent !== null && !e.disabled;
    const b = Array.from(document.querySelectorAll('.chunk-host button')).filter(vis);
    const pri = b.find(x => x.classList.contains('primary-btn')) || b[0];
    if (pri) pri.click();
  }
};

/* ═══════════ THE CONFUSED PUPIL'S OWN MOVERS (19 Aug 2026) ════════════════
   WHY A SECOND TABLE RATHER THAN A FLAG ON THE FIRST. `MOVES` drives from the
   build's answer key, which is correct for sit-review — it is an EXPERT player
   and its job is a deterministic finish. But the moment sit-wrongpath started
   using the shared movers (the DFM 238a fix), the confused pupil began building
   the RIGHT program every time, and the three landmarks that matter most to a
   confused pupil went unreached: the console after a run that did NOT work, the
   NOT YET verdict, and J3's empty-gap refusal. A walker that cannot fail has
   walked the happy path, which is the blindness this walker exists to end
   (DFM 194c).
   So the wrong path gets its own movers, in the same home as the right ones
   (DFM 144), and sit-wrongpath prefers them. Each build is failed ONCE and then
   corrected, so the walk still reaches the end of the lesson: a walker that
   never finishes proves nothing about the screens after the one it died on.
   NOTHING HERE INVENTS A MISTAKE. Every wrong move is one the lesson itself
   offers: a decoy line the author put in the tray on purpose, a gap left empty,
   a number typed that is not the number asked for. */
const WRONG_MOVES = {
  /* A CONFUSED PUPIL DOES NOT KNOW THE ANSWER, so she does not correct a gap the
     moment Python complains — she reads the red, presses RUN again, and only
     after a few goes does she get it right. The expert's `pyrun-blank-fix`
     corrects it on the FIRST failure, which is right for that walker and wrong
     for this one: dropped into this walk it shortened the failure window on J3
     Lesson 2 so much that "the console after a run that did NOT work" was
     reached on one run and missed on the next. A landmark that depends on how
     fast the walker recovers is a landmark nobody can trust.
     Three goes of pressing RUN on the broken thing, then she gets there. */
  /* A CONFUSED PUPIL MOVES EVERYTHING ACROSS (27 Aug 2026). The expert places
     only the lines the key names; this walker, on a card with DECOY lines, takes
     the lot — which is exactly what a pupil who has not read them does, and it
     is the only way she ever produces a run that FAILS on a card whose gaps she
     is free to name anything she likes. Without it, j2-03's build 3 could never
     reach "the console after a run that did NOT work" or "NOT YET, with no line
     named": both blanks accept any word, so no wrong VALUE exists to type, and
     the two landmarks were unreachable rather than merely flaky.
     She puts it right afterwards by the ordinary route, so the walk still ends
     where it should. */
  'pyrun-place': () => {
    const tray = Array.from(document.querySelectorAll('.pyt-list .pyrun-line'));
    const placed = document.querySelectorAll('.pyp-list .pyrun-line').length;
    const key = (function () {
      const c = document.querySelector('.pyrun-card');
      return window.__walkKey ? window.__walkKey(c && c.getAttribute('data-build')) : null;
    })();
    const wanted = key && key.order ? key.order.length : 0;
    /* first pass: take EVERY line, decoys included.
       ONCE SHE HAS STARTED PUTTING THEM BACK, SHE DOES NOT TAKE THEM AGAIN
       (28 Aug 2026). Without this flag the two halves of this move fought each
       other: the undo branch below handed a decoy back to the tray, the next
       turn saw a line sitting in the tray and took it straight back, and the
       walk spent its whole 300-loop budget on Build 3 — reaching the lesson's
       last five screens never. The flag is per BUILD, so the next card starts
       its own first pass. */
    const bid0 = (function () {
      const c = document.querySelector('.pyrun-card');
      return (c && c.getAttribute('data-build')) || '';
    })();
    /* EVERY ONE OF TONIGHT'S CHANGES TO THIS MOVE IS CONFINED TO CARDS THAT OFFER A
       LABELLED WAY BACK (28 Aug 2026). Run from the `7d9c274` worktree, both locked
       Lesson 2s walk their full 15 and 16 landmarks and PASS; run from tonight's tree
       they reached 9 and 10. That is not a lesson fault and it is not a coverage gap —
       it is mine. A card with no take-back button cannot be un-placed except by the same
       click that places, so none of the undo/reorder machinery can work there, and the
       only honest thing to do is leave those cards on the behaviour they shipped with
       (DFM 221). `canUndo` gates all of it. */
    const canUndoHere = ['j2-3', 'j3-3'].indexOf(window.__walkLesson) !== -1;
    if (window.__undoingFor !== bid0) window.__undoing = false;
    if (tray.length && (!canUndoHere || !window.__undoing)) { (tray[0].querySelector('code') || tray[0]).click(); return; }
    /* everything is across and it is more than the answer needs: run it and let
       it fail, then take the extras back the way the card offers */
    if (wanted && placed > wanted) {
      /* A RUN THE ENGINE REFUSES IS NOT A GO (28 Aug 2026, from the trace — the fourth
         look at this card and the first that produced a fact). Her two "press RUN and
         let it fail" goes were being spent while the gaps were still empty, and the
         engine answers that with "one of the gaps is still empty" and does not run at
         all. So by the time the program could really fail, the counter was spent, no
         failing run ever happened, and the two failure-state landmarks — the red console
         and NOT YET — were unreachable on both L3 lessons. Count a go only when there is
         something to count. */
      const gapOpen = canUndoHere && Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank'))
        .filter(i => i.offsetParent !== null).some(i => !i.value);
      if (window.__wrongRunFor !== bid0) { window.__wrongRunFor = bid0; window.__wrongRun = 0; }
      if (!gapOpen) {
        window.__wrongRun = (window.__wrongRun || 0) + 1;
        if (window.__wrongRun <= 2) {
          const run = document.querySelector('.pyrun-run:not([disabled])');
          if (run) { run.click(); return; }
        }
      }
      const rows = Array.from(document.querySelectorAll('.pyp-list li'));
      const keep = new Set(key.order.map(String));
      for (const li of rows) {
        const line = li.querySelector('.pyrun-line');
        const si = line && line.getAttribute('data-si');
        if (si != null && !keep.has(String(si))) {
          window.__undoing = true; window.__undoingFor = bid0;
          const back = li.querySelector('.take-back');
          if (back) { back.click(); return; }
          (line.querySelector('code') || line).click(); return;
        }
      }
    }
    /* AND IN THE END SHE WORKS IT OUT (28 Aug 2026, found by tracing the walk move by
       move rather than guessing at it a fourth time). She took every line across in the
       order the TRAY happened to offer them, so once the decoys are back she is left
       holding the right four lines in the wrong order — and nothing in this move set
       could ever re-order them. She pressed RUN on the same wrong program until the
       walk ran out of screens: DFM 238(a) again, three cards further on than the last
       one. A pupil who has failed four times stops guessing and puts them in properly,
       and so does she: strip back to the longest run that is already right, then place
       the next one the answer asks for. Lines only ever land on the END, so that is the
       only shape that converges. */
    if (wanted && key && key.order && canUndoHere) {
      const placedSis = Array.from(document.querySelectorAll('.pyp-list .pyrun-line'))
        .map(n => Number(n.getAttribute('data-si')));
      const prefixOk = placedSis.every((v, i) => v === Number(key.order[i]));
      if (!prefixOk) {
        /* AND THE SAME FLAG THE DECOY UNDO SETS (28 Aug 2026, found by the locked-lesson
           regression). Stripping a line back puts it in the tray, and the first branch of
           this move takes ANY line sitting in the tray — so on a card whose tray ejects on
           click, the strip and the re-take fought each other exactly as the decoy undo once
           did, and J2 Lesson 2 stopped at eight of fifteen screens. One flag, both jobs. */
        window.__undoing = true; window.__undoingFor = bid0;
        const rows = Array.from(document.querySelectorAll('.pyp-list li'));
        const last = rows[rows.length - 1];
        if (last) {
          const back = last.querySelector('.take-back');
          if (back) { back.click(); return; }
          const line = last.querySelector('.pyrun-line');
          if (line) { (line.querySelector('code') || line).click(); return; }
        }
      } else if (placedSis.length < key.order.length) {
        const want = Number(key.order[placedSis.length]);
        const node = Array.from(document.querySelectorAll('.pyt-list .pyrun-line'))
          .find(n => Number(n.getAttribute('data-si')) === want);
        if (node) { (node.querySelector('code') || node).click(); return; }
      }
    }
  },
  'pyrun-blank-fix': () => {
    window.__blankFixN = (window.__blankFixN || 0) + 1;
    if (window.__blankFixN <= 3) {
      const run = document.querySelector('.pyrun-run:not([disabled])');
      if (run) run.click();
      return;
    }
    const card = document.querySelector('.pyrun-card');
    const key = window.__walkKey ? window.__walkKey(card && card.getAttribute('data-build')) : null;
    if (!key || !key.blanks) return;
    const inp = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank'))
      .find(i => {
        const k = i.getAttribute('data-key');
        return key.blanks[k] != null && String(i.value) !== String(key.blanks[k]);
      });
    if (!inp) return;
    inp.value = String(key.blanks[inp.getAttribute('data-key')]);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  },
  /* THE REFUSAL, AND HIS TIME-UP SCENARIO, WALKED (DFM 265c, 26 Aug 2026).
     K11d's law is that a stretch which cannot be refused is not a stretch, and a
     refusal nothing ever presses is a claim rather than a behaviour. The V54
     offer card had one button for that; the extras zone has two things to prove
     instead, and this walker proves both on every run:
       · she OPENS a job and ABANDONS it half-built, and the hub takes her back
         with the job returned to its start (see `pyrun-extra-place` below);
       · then she presses "Finish the lesson" from the hub — which is exactly
         what he asked for: "the teacher says it's nearly time up and to finish —
         how can they leave their current task". */
  'pyrun-hub': () => {
    const st = (window.__wpExtras = (window.__wpExtras || 0) + 1);
    if (st === 1) {
      const j = document.querySelector('.pyrun-hub .pyrun-job');
      if (j) { j.click(); return; }
    }
    const fin = document.querySelector('.pyrun-hub .pyrun-finish');
    if (fin) fin.click();
  },
  'pyrun-job-done': () => { const b = document.querySelector('.pyrun-card .pyrun-back'); if (b) b.click(); },
  /* SHE GETS ONE LINE IN AND THEN WALKS OUT. That is the state DFM 265(c) is
     about — not a finished job, a HALF-DONE one — and it is the only way to
     prove the hub really puts it back to its start rather than remembering it. */
  'pyrun-extra-place': () => {
    const placed = document.querySelectorAll('.pyp-list .pyrun-line').length;
    if (placed >= 1) {
      const back = document.querySelector('.pyrun-card .pyrun-exit-row .pyrun-back');
      if (back) { back.click(); return; }
    }
    const n = document.querySelector('.pyt-list .pyrun-line');
    if (n) n.click();
  },

  /* THE EMPTY GAP. J3's `blankEmptySay` refusal is the one control in either
     lesson that can be pressed before it is ready, so it is pressed. */
  'pyrun-blank': () => {
    const card = document.querySelector('.pyrun-card');
    const bid = (card && card.getAttribute('data-build')) || '?';
    const st = (window.__wpWrong = window.__wpWrong || {})[bid] ||
      (window.__wpWrong[bid] = {});
    const run = document.querySelector('.pyrun-run');
    if (!st.emptyRun && run && !run.disabled) { st.emptyRun = 1; run.click(); return; }
    /* then fill it exactly as the right-path mover does */
    const key = window.__walkKey ? window.__walkKey(bid) : null;
    const inp = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank')).find(i => !i.value);
    if (!inp) return;
    const k = inp.getAttribute('data-key');
    const v = (key && key.blanks && key.blanks[k] != null) ? String(key.blanks[k]) : 'x';
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  },

  /* THE RUN THAT DOES NOT WORK. Phases, one build at a time:
       decoy  → place a line the author planted as a real slip, then RUN
       (or, on a build with no decoy at all — j3b-title is one line and a gap —
        type a value that is not the one asked for, then RUN)
       then put it right and RUN properly, so the walk goes on.
     A build with neither a decoy nor a gap simply runs correctly; there is no
     wrong move available and pretending otherwise would be a fiction. */
  'pyrun-run': () => {
    const card = document.querySelector('.pyrun-card');
    const bid = (card && card.getAttribute('data-build')) || '?';
    const st = (window.__wpWrong = window.__wpWrong || {})[bid] ||
      (window.__wpWrong[bid] = {});
    const key = window.__walkKey ? window.__walkKey(bid) : null;
    const order = (key && key.order) || null;
    const wanted = (si) => !order || order.indexOf(Number(si)) !== -1;
    const runIt = () => { const b = document.querySelector('.pyrun-run:not([disabled])'); if (b) b.click(); };

    if (order && !st.decoy) {
      const d = Array.from(document.querySelectorAll('.pyt-list .pyrun-line'))
        .find(n => !wanted(n.getAttribute('data-si')));
      if (d) { st.decoy = 'placed'; d.click(); return; }
      st.decoy = 'none';
    }
    if (st.decoy === 'placed') { st.decoy = 'ran'; runIt(); return; }
    if (st.decoy === 'ran') {
      st.decoy = 'removed';
      const d = Array.from(document.querySelectorAll('.pyp-list .pyrun-line'))
        .find(n => !wanted(n.getAttribute('data-si')));
      if (d) d.click();
      return;
    }
    if (st.decoy === 'none' && !st.badVal) {
      const inp = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank'))
        .filter(i => i.offsetParent !== null)[0];
      if (inp) {
        st.badVal = 'set';
        inp.value = 'not that';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      st.badVal = 'skip';
    }
    if (st.badVal === 'set') { st.badVal = 'ran'; runIt(); return; }
    if (st.badVal === 'ran') {
      st.badVal = 'fixed';
      Array.from(document.querySelectorAll('.pyp-list .pyrun-blank')).forEach(function (i) {
        const k = i.getAttribute('data-key');
        const v = (key && key.blanks && key.blanks[k] != null) ? String(key.blanks[k]) : 'x';
        i.value = v;
        i.dispatchEvent(new Event('input', { bubbles: true }));
      });
      return;
    }
    runIt();
  }
};

/* how long each move needs before the screen has settled enough to re-detect */
const SETTLE = {
  badge: 600, 'dossier-cta': 1100, confirm: 700, tour: 600, 'q-opt': 900, 'q-next': 700,
  'snap-pick': 350, 'snap-try': 750, 'snap-done': 700,
  'pyrun-place': 260, 'pyrun-blank': 220, 'pyrun-run': 2600, 'pyrun-next': 700,
  'pyrun-hub': 700, 'pyrun-job-done': 700, 'pyrun-extra-place': 300,
  /* the staged editor: the plan face is one press, the write is a real type,
     and a RUN on a conversation card has to wait for the probe pass as well */
  'pye-plan': 900, 'pye-write': 400, 'pye-chip': 400, 'pye-run': 3200, 'pye-starter': 700, 'pye-send': 1200,
  'case-pin': 900, 'case-log': 400, 'case-close': 1200, 'case-stamped': 700, 'case-wait': 700,
  'std-expand': 700, 'std-run': 700, 'std-outcome': 900, 'std-ready': 1200,
  'gal-review': 900, 'gal-write': 250, 'gal-file': 1200, 'gal-back': 700,
  'gal-v2': 700, 'gal-wrap': 1100, 'gal-wait': 1400,
  parsons: 400, input: 400, loading: 700, button: 700, vault: 900, 'hold-sign': 1800,
  'pair-wait': 1300, 'swap-wait': 1200, 'duel-wait': 1200,
  'std-sign': 1100, rally: 900, 'rally-after': 900, selfeval: 800
};

/* ═══════════════ THE GESTURES THAT ARE NOT SINGLE CLICKS ══════════════════
   Five screens on this platform cannot be worked by clicking one button, and
   every one of them has bitten a walker before:
     · the Vault is a real pointer DRAG (it stalled the first capture script);
     · the oath is a press-and-HOLD;
     · the Rally is a LIVE five-second timer, twice, and each go's score box
       unlocks only after that go has actually run (DFM 185) — about fifteen
       seconds of real waiting, which is the price of a real timer;
     · the Rally's reveal is fired by the TEACHER, not the pupil;
     · signing a contract is pick → type a studio name → sign.
   These need to wait, so they are Node-side and take the page.

   HONESTLY RECORDED, because a half-shared file is worse than an admitted one:
   `sit-review.js` still has its OWN copies of these, because its versions take
   screenshots between the sub-steps and count what they press. The DETECTOR —
   the part that decides WHAT SCREEN THIS IS, and the part whose disagreement
   caused DFM 225b — is shared and proved. The gestures below are not yet.
   Folding sit-review's action switch onto these is real work on a pinned
   harness and is NOT being done at the end of a long build; it is named here so
   it is a known debt with an owner rather than a quiet duplicate. */
const nap = ms => new Promise(r => setTimeout(r, ms));

const ACTIONS = {
  /* ══════ THE INSPECTION, ADDED 17 AUG 2026 — AND IT WAS A REAL HOLE ════════
     The DETECTOR above has known `insp-scene` and `insp-next` since J2 Lesson 1
     was built, and neither MOVES nor ACTIONS could act on either of them: the
     only code that could drive an inspection scene was sit-review's own private
     switch. So any walker using this shared library — which is every walker
     except sit-review — stalled at the first room and reported the walk stuck.
     The deck capture hit it the first time it was pointed at J2 Lesson 1.
     That is the exact fault the extraction of this file was meant to end (DFM
     144: one home): a detector that recognises a screen nothing here can move
     past is a shared library with a private half. sit-review keeps its own
     switch, because it photographs and counts between the sub-steps, so its
     pinned shape is untouched by this — but nothing else has to write a second,
     dumber copy any more, which is precisely how DFM 225b happened.

     THE ZONES TO FLAG ARE READ OUT OF THE RUNNING LESSON, never held here: a
     walker with its own idea of which station is wrong would go on passing after
     the content moved. Same rule sit-review already follows. */
  async 'insp-scene'(page) {
    const flagged = await page.evaluate(() => {
      const s = window.App && window.App.state;
      const ch = s && s.chunks[s.chunkIdx];
      const scenes = ((ch || {}).config || {}).scenes || [];
      const tab = (document.querySelector('.insp-tab') || {}).textContent || '';
      const sc = scenes.find(x => (x.tab || '') === tab) || scenes[0];
      let n = 0;
      ((sc || {}).zones || []).forEach((z, i) => {
        if (!z.breaks) return;
        const b = document.querySelector('.insp-zone[data-z="' + i + '"]');
        if (b) { b.click(); n++; }
      });
      return n;
    });
    await nap(420);
    await page.evaluate(() => {
      const f = document.querySelector('.insp-file');
      if (f && !f.disabled) f.click();
    });
    return flagged;
  },

  async 'insp-next'(page) {
    await page.evaluate(() => {
      const n = document.querySelector('.insp-next');
      if (n) n.click();
    });
  },

  async 'hold-sign'(page) {
    await page.evaluate(async () => {
      const s2 = ms => new Promise(r => setTimeout(r, ms));
      const b = document.querySelector('.chunk-host .oath-sign, .chunk-host .hold-btn');
      if (!b) return;
      const r = b.getBoundingClientRect();
      const pt = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      const ev = t => b.dispatchEvent(new PointerEvent(t, Object.assign({
        bubbles: true, cancelable: true, pointerId: 1, isPrimary: true }, pt)));
      if (!b.setPointerCapture) b.setPointerCapture = () => {};
      ev('pointerdown'); await s2(1800); ev('pointerup');   /* the hold is 1200ms */
    });
  },

  async vault(page) {
    await page.evaluate(async () => {
      const s2 = ms => new Promise(r => setTimeout(r, ms));
      const centre = e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
      for (let g = 0; g < 40; g++) {
        const file = document.querySelector('.chunk-host .vault-file:not(.filed)');
        if (!file) break;
        const folders = Array.from(document.querySelectorAll('.chunk-host .vault-folder'));
        if (!folders.length) break;
        if (!file.setPointerCapture) file.setPointerCapture = () => {};
        let done = false;
        for (const fo of folders) {
          const a = centre(file), b = centre(fo);
          const ev = (t, p) => file.dispatchEvent(new PointerEvent(t, {
            bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, clientX: p.x, clientY: p.y }));
          ev('pointerdown', a); await s2(30);
          ev('pointermove', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); await s2(30);
          ev('pointermove', b); await s2(30);
          ev('pointerup', b); await s2(320);
          if (file.classList.contains('filed')) { done = true; break; }
        }
        if (!done) break;
      }
    });
  },

  async 'std-sign'(page) {
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('.chunk-host .std-contract'))
        .find(c => /Catch It/i.test(c.textContent || ''));
      if (card) card.click();
    });
    await nap(800);
    await page.evaluate(() => {
      const i = document.querySelector('.std-sig-input');
      if (i) { i.value = 'Golden Otter Games'; i.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await nap(300);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('.chunk-host button'))
        .find(x => /sign/i.test(x.textContent || '') && !x.disabled);
      if (b) b.click();
    });
  },

  /* played like a pupil: each go's timer really runs before its box unlocks */
  async rally(page) {
    const goes = await page.evaluate(() => document.querySelectorAll('.rally-round').length);
    const targets = [23, 27];
    for (let i = 0; i < goes; i++) {
      await page.evaluate(() => {
        const b = document.querySelector('.rally-timer-btn');
        if (b && !b.disabled && !b.hidden) b.click();
      });
      let open = false;
      for (let t = 0; t < 40 && !open; t++) {
        await nap(500);
        open = await page.evaluate((n) => {
          const slot = document.querySelectorAll('.rally-round')[n];
          const plus = slot && slot.querySelector('.rally-step[data-d="1"]');
          return !!plus && !plus.disabled;
        }, i);
      }
      await page.evaluate(([n, want]) => {
        const slot = document.querySelectorAll('.rally-round')[n];
        if (!slot) return;
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
    await nap(500);
    await page.evaluate(() => {
      const t = document.querySelector('.rally-transmit');
      if (t && !t.disabled) t.click();
    });
  },

  /* the team reveal is the TEACHER's button, so the walk must play the teacher
     for a moment or the pupil screen waits for ever on a thing she cannot do */
  async 'rally-after'(page) {
    await page.evaluate(async () => {
      const S = window.OLS_DEV_SERVER;
      if (!S) return;
      await S.call({ action: 'admin', sub: 'autoGroup', passcode: 'demo', className: 'Demo-8A', n: 4 });
      await S.call({ action: 'admin', sub: 'setReveal', passcode: 'demo', className: 'Demo-8A', revealed: true });
    });
    for (let w = 0; w < 30; w++) {
      const seen = await page.evaluate(() => {
        const r = document.querySelector('.rally-reveal');
        return !!r && (r.textContent || '').trim().length > 0;
      });
      if (seen) break;
      await nap(700);
    }
    await nap(2000);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('.chunk-host button'))
        .find(x => /continue/i.test(x.textContent || '') && x.offsetParent && !x.disabled);
      if (b) b.click();
    });
  },

  async selfeval(page) {
    await page.evaluate(() => {
      document.querySelectorAll('.se-chips').forEach(r => {
        const c = r.querySelector('.se-chip'); if (c) c.click();
      });
      const d = document.querySelector('.se-diff-chips .se-chip'); if (d) d.click();
      const t = document.querySelector('.se-card textarea');
      if (t) { t.value = 'Preview capture run.'; t.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await nap(400);
    await page.evaluate(() => { const b = document.querySelector('.se-submit'); if (b && !b.disabled) b.click(); });
  }
};

/* WHERE A BUILD'S ANSWER REALLY LIVES — corrected 19 Aug 2026 by the first real
   walk of j2-2, which placed all SEVEN lines, emptied the tray and then pressed
   RUN fifty-one times against a program that could never match.
   The movers read `App.state.localKeys`, on the stated belief that "the client
   already holds the build order for instant marking". **IT DOES NOT, and it
   should not.** Both servers filter that call to multiple-choice keys only
   (`if (typeof k.a !== 'number') return;` in dev-server.js and in
   Code.gs.template), so a pyrun key — `{order, blanks}`, with no `a` — has never
   reached a pupil's browser. That is correct and must stay correct: `pyrun`
   decides correctness by RUNNING the program, so shipping the answer to her
   machine would give away the lesson for nothing.
   So the WALKER gets its own route, and only the walker. `dev-keys.json` is the
   preview's own git-ignored marking file, served beside the packed content;
   a harness may read it because a harness is not a pupil. `primeDevKeys` fetches
   it once and installs `window.__walkKey`, which prefers it and falls back to
   whatever the client happens to hold. If neither answers, the mover now does
   NOTHING rather than placing every line in the tray — a walk that stalls is a
   report; a walk that quietly builds the wrong program and reports "0 badges" is
   a lie (DFM 146a). */
async function primeDevKeys(page, host) {
  const url = (host || 'http://localhost:8121') + '/ks3-dt/content/dev-keys.json';
  await page.evaluate(async (u) => {
    if (window.__walkKey) return;
    let all = null;
    try { const r = await fetch(u, { cache: 'no-store' }); if (r.ok) all = await r.json(); } catch (e) {}
    window.__devKeys = all;
    window.__walkKey = function (bid) {
      if (!bid) return null;
      if (all) {
        for (const fid of Object.keys(all)) {
          const k = all[fid] && all[fid][bid];
          if (k) return k;
        }
      }
      return (window.App && App.state && App.state.localKeys && App.state.localKeys[bid]) || null;
    };
    /* THE MATCH'S OWN ANSWERS. A commit-and-reveal round carries no build id on
       its card, so they are found the way the walker finds everything else --
       by asking its own key file, never the pupil's screen, which does not hold
       them at all. Any key entry with an `answers` map is one. */
    window.__walkAnswers = function () {
      if (!all) return null;
      for (const fid of Object.keys(all)) {
        for (const k of Object.keys(all[fid] || {})) {
          const e = all[fid][k];
          if (e && e.answers) return e.answers;
        }
      }
      return null;
    };
  }, url);
}

/* ONE placement rule, two kinds pointing at it (see the note in MOVES). */
MOVES['pyrun-extra-place'] = MOVES['pyrun-place'];

module.exports = { detectKind, whereAmI, chunkNow, MOVES, WRONG_MOVES, SETTLE, ACTIONS, primeDevKeys };
