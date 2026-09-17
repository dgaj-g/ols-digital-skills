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

  /* ---- J2/J3 LESSON 4 (14 Sep 2026): the class adventure, the Rush, the words box
     and the publish row — every one taught here and in MOVES in the same edit,
     because a screen the detector knows and no mover can act on is DFM 238(a)'s
     own fault. ---- */
  /* THE CLASS ADVENTURE plays itself between questions: a room fetching, a story
     being read, a door being taken. The only button on that card is the ghost
     that LEAVES the adventure, so a walker with no rule here would press it and
     pay nothing — exactly what the Rush's waits and the Swap's had done before
     their rules existed. Waiting is a state, not a stuck screen. */
  if (q('.rly-card')) {
    const ask = q('.rly-leave-ask');
    if (ask && !ask.hidden && vis(q('.rly-leave-no'))) return { kind: 'rly-keep-going' };
    return { kind: 'rly-wait' };
  }
  /* THE RUSH: the order form, the run card (its RUN, then a wait), the check card
     (six cards to answer, one Yes at a time) and its waits */
  /* the solo seat: the Studio's own orders, offered when she stopped waiting */
  if (q('.ord-card-own') && vis(q('.ord-card-own .ord-own-go'))) return { kind: 'ord-own' };
  if (q('.ord-form-card')) {
    const wait = q('.ord-form-card .ord-wait');
    if (wait && !wait.hidden && !vis(q('.ord-send:not([disabled])'))) return { kind: 'ord-wait' };
    if (vis(q('.ord-send:not([disabled])'))) return { kind: 'ord-form' };
    return { kind: 'ord-wait' };
  }
  if (q('.ord-run-card')) {
    if (vis(q('.ord-run-card .pyrun-run:not([disabled])'))) return { kind: 'pyrun-run' };
    return { kind: 'ord-wait' };
  }
  if (q('.ord-check-card')) {
    const open = Array.from(document.querySelectorAll('.ord-check-card .ord-card'))
      .find(cd => !cd.querySelector('.ord-yn .is-on'));
    if (open) return { kind: 'ord-check' };
    return { kind: 'ord-wait' };
  }
  /* THE TWO WORDS on a PLAN face come before its Start button: Start refuses
     until both are typed and different, and the refusal is a state with nothing
     for the plan mover to press differently */
  if (q('.pye-plan .pth-words') && Array.from(document.querySelectorAll('.pye-plan .pth-words input')).some(i => !String(i.value || '').trim())) {
    return { kind: 'l4-words' };
  }
  /* THE PUBLISHED card's own way on, and the publish button once it wakes —
     both live INSIDE the bench card, above the editor rules that would otherwise
     press RUN on an already-published room for ever */
  if (vis(q('.pth-published-go'))) return { kind: 'l4-published' };
  if (vis(q('.pth-publish-skip'))) return { kind: 'l4-publish-skip' };
  if (vis(q('.pth-publish-btn:not([disabled])'))) return { kind: 'l4-publish' };

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
  const pyeCard = Array.from(document.querySelectorAll('.pye-bench, .pye-wall'))
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
      /* AND THE GATE IS THE CARD, NOT THE LESSON'S NAME (28 Aug 2026, the fix).
         For one night this read `['j2-3','j3-3'].indexOf(window.__walkLesson)`, because
         when it was written those were the only two lessons whose cards offered a
         labelled way back. Then he ruled that the click-cannot-destroy fix should go to
         the four approved lessons for consistency — so EVERY pyrun card in all six now
         carries a `.take-back` button, and the list became a stale enumeration of the
         very thing it was standing in for (DFM 271: derived, never enumerated).
         Ask the screen instead. A card offers a way back exactly when its placed rows
         carry one, which is the same DOM fact `trayClickEject: false` produces — and it
         is asked of THIS card, so a card that ever opts out is still safe. */
      const wayBack = !!q('.pyp-list .take-back');
      const prefixOk = !wayBack || placed.every((v, i) => v === Number(wantOrder[i]));
      const missing = wantOrder.some(si => placed.indexOf(Number(si)) === -1);
      /* GAPS FIRST, THEN THE RUN THAT FAILS (28 Aug 2026). With the order test in, the
         walker fixed the arrangement before it had typed anything into the gaps — so its
         two "press RUN and let it fail" goes were spent on a program the engine REFUSES
         to run at all ("one of the gaps is still empty"), and the two failure-state
         landmarks, the red console and NOT YET, were never on screen to be stood on.
         A pupil fills the gaps and then runs it. So does she: while every line the answer
         wants is present, an empty gap outranks a wrong order. */
      const emptyBlank = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank, .pyp-fixed .pyrun-blank'))
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
    /* THE WAY BACK IS NOT OPTIONAL (28 Aug 2026, the fix). This carried the same
       stale lesson list, and that is precisely how J2 Lesson 2 died: the confused
       move took all seven lines across on every lesson, and only two lessons were
       allowed to recognise "more placed than the answer needs" as a state worth
       acting on. Everywhere else the walk over-placed and then had nowhere to go
       but RUN, for ever — DFM 238(a), recognised and unactionable, written by the
       gate that was meant to prevent it. Same derived test as the order check. */
    if (wantOrder && wantOrder.length && q('.pyp-list .take-back')) {
      const placedNow = document.querySelectorAll('.pyp-list .pyrun-line').length;
      if (placedNow > wantOrder.length) {
        return { kind: extraRow ? 'pyrun-extra-place' : 'pyrun-place' };
      }
    }
    /* `.pyp-fixed .pyrun-blank` (14 Sep 2026): a gap can live inside a LOCKED
       line above the tray (j2-04's fourth-road question); the expert pressed
       RUN for ever on an empty one it could not see — the card's own
       "type in the gap first" note is not a NOT YET, so nothing else moved */
    const blank = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank, .pyp-fixed .pyrun-blank'))
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
        ? Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank, .pyp-fixed .pyrun-blank'))
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
  /* ---- J2/J3 Lesson 4 (14 Sep 2026) ---- */
  'rly-wait': () => {},
  'rly-keep-going': () => { const b = document.querySelector('.rly-leave-no'); if (b) b.click(); },
  'ord-wait': () => {},
  'ord-own': () => { const b = document.querySelector('.ord-card-own .ord-own-go'); if (b) b.click(); },
  'ord-form': () => {
    /* three orders a partner's factory can make: names any twelve-year-old could
       type, seats inside the form's own 1–9 floor */
    const rows = [['Aoife', 2], ['Ben', 4], ['Cara', 1]];
    rows.forEach((r, i) => {
      const n = document.querySelector('.ord-form-card [data-name="' + (i + 1) + '"]');
      const s = document.querySelector('.ord-form-card [data-seats="' + (i + 1) + '"]');
      if (n) { n.value = r[0]; n.dispatchEvent(new Event('input', { bubbles: true })); }
      if (s) { s.value = String(r[1]); s.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    const b = document.querySelector('.ord-send:not([disabled])');
    if (b) b.click();
  },
  'ord-check': () => {
    /* the first card not yet answered: Yes where a product came back, No where
       nothing did — the honest check a pupil makes */
    const cd = Array.from(document.querySelectorAll('.ord-check-card .ord-card')).find(x => !x.querySelector('.ord-yn .is-on'));
    if (!cd) return;
    const none = cd.classList.contains('is-none');
    const b = cd.querySelector('.ord-yn [data-yn="' + (none ? 'n' : 'y') + '"]');
    if (b) b.click();
  },
  'l4-words': () => {
    const plan = document.querySelector('.pye-plan');
    const key = window.__walkKey ? window.__walkKey(plan && plan.getAttribute('data-build')) : null;
    /* the words come from the lesson's own key (myroom carries `words`), never
       invented — a room checked under words the key never wrote is not the walk
       the key pins */
    const words = (key && key.words) || [];
    if (!words.length) return;
    document.querySelectorAll('.pye-plan .pth-words input').forEach((inp, i) => {
      inp.value = String(words[i] || '');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
  },
  'l4-publish': () => { const b = document.querySelector('.pth-publish-btn:not([disabled])'); if (b) b.click(); },
  'l4-published': () => { const b = document.querySelector('.pth-published-go'); if (b) b.click(); },
  'l4-publish-skip': () => { const b = document.querySelector('.pth-publish-skip'); if (b) b.click(); },
  'pye-starter': () => { const b = document.querySelector('.pye-starter-btn:not([disabled])'); if (b) b.click(); },
  'pye-write': () => {
    const card = Array.from(document.querySelectorAll('.pye-bench, .pye-wall'))
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
    const inp = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank, .pyp-fixed .pyrun-blank'))
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
    const inp = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank, .pyp-fixed .pyrun-blank'))
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
    /* EVERY ONE OF THIS MOVE'S CHANGES IS CONFINED TO CARDS THAT OFFER A LABELLED WAY
       BACK — AND THE CARD IS ASKED, NOT THE LESSON'S NAME (28 Aug 2026, the fix).
       This read `['j2-3','j3-3'].indexOf(window.__walkLesson)` for one night, and the
       expression it fed — `(!canUndoHere || !window.__undoing)` — INVERTED on the very
       lessons it was written to protect: it left the risky half of this move (take every
       line across, decoys included) fully on wherever the safe half (put them back,
       re-order them) was off. Over-place, with no way back. That is how J2 Lesson 2 fell
       from fifteen landmarks to eight, and it was mine, not the platform's.
       Ask the SCREEN, in three states:
         true  — placed rows carry a `.take-back`: the whole confused route is safe here.
         false — something is placed and there is no way back: this move DECLINES, and
                 the dispatcher runs the ordinary mover, so the card behaves exactly as
                 it shipped (DFM 221).
         null  — nothing placed yet, so the card cannot be asked. Place a line the ANSWER
                 wants, which is safe on any card ever built, and ask again next turn. */
    /* NO KEY, NO CONFUSED ROUTE. Everything below turns on knowing which lines the
       answer wants, so that a decoy can be told from a keeper. Without the key there
       is no such thing as a decoy, and the ordinary mover's own "NO KEY, NO GUESS"
       rule is the right one — so decline rather than invent (DFM 146a). */
    if (!wanted) { window.__wpNote = 'defer:no-key'; return 'defer'; }
    const wayBack = document.querySelector('.pyp-list li .pyrun-line')
      ? !!document.querySelector('.pyp-list .take-back')
      : null;
    if (wayBack === false) { window.__wpNote = 'defer:no-way-back'; return 'defer'; }
    if (wayBack === null) {
      const first = Number(key.order[0]);
      const node = tray.find(n => Number(n.getAttribute('data-si')) === first);
      if (node) { (node.querySelector('code') || node).click(); }
      return;
    }
    if (window.__undoingFor !== bid0) window.__undoing = false;
    if (tray.length && !window.__undoing) { window.__wpNote = 'take'; (tray[0].querySelector('code') || tray[0]).click(); return; }
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
      const gapOpen = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank, .pyp-fixed .pyrun-blank'))
        .filter(i => i.offsetParent !== null).some(i => !i.value);
      /* THE TWO GOES ARE PER MISTAKE, NOT PER CARD (14 Sep 2026, K42b — the j3-2
         walker landmark). Keyed on the build alone, the counter was spent by the
         FIRST decoy she tried, and every decoy after it was handed straight back
         without ever being run — so on a card with two decoys of different kinds
         (j3b-takings: one that makes Python STOP, one that merely prints the wrong
         words) only the decoy the shuffled tray happened to offer first was ever
         run, and the red console was a coin toss per render (CONTROL-run1..3: 16,
         15, 15 of 16). The key is the build PLUS the extra lines now placed, so
         each mistake gets its two goes and the next decoy starts afresh. */
      /* THE GAPS ARE FILLED BEFORE THE DECOYS ARE JUDGED (17 Sep 2026). On a card
         with gaps the two wrong runs were skipped while a gap was empty — right —
         but the extras were then taken straight back in the same breath, so on
         j2-04's third training build (two gaps, two decoys) no wrong run ever
         happened and the red console, NOT YET and the no-door row went unstood
         on. A pupil who has moved everything across fills the gaps next; so does
         she. The key's values, exactly as the blank-fix mover types them. */
      if (gapOpen) {
        Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank, .pyp-fixed .pyrun-blank'))
          .filter(i => i.offsetParent !== null && !i.value).forEach(function (i) {
            const k = i.getAttribute('data-key');
            const v = (key.blanks && key.blanks[k] != null) ? String(key.blanks[k]) : 'x';
            i.value = v; i.dispatchEvent(new Event('input', { bubbles: true }));
          });
        window.__wpNote = 'fill-gaps';
        return;
      }
      const extrasNow = Array.from(document.querySelectorAll('.pyp-list .pyrun-line'))
        .map(n => String(n.getAttribute('data-si')))
        .filter(si => key.order.map(String).indexOf(si) === -1).sort().join(',');
      const runKey = bid0 + '|' + extrasNow;
      if (window.__wrongRunFor !== runKey) { window.__wrongRunFor = runKey; window.__wrongRun = 0; }
      /* ---- AND SHE ORDERS THE REAL LINES BEFORE SHE PRESSES RUN (29 Aug 2026) ----
         THE LOTTERY, AND ITS CAUSE, MEASURED RATHER THAN GUESSED. She took every
         line across in the order the TRAY offered them — a fresh derangement on
         every render (DFM 258) — so whether the program she ran DIED or merely
         printed the wrong thing was a coin toss: if `print("… " + box + " …")`
         happened to land above the `box = input(…)` line, Python raised NameError
         and the run died. Both outcomes used to satisfy "NOT YET, with no line
         named", so the landmark looked flaky rather than unreachable.
         THIS ROUND'S OWN FIX REMOVED ONE OF THOSE TWO ROUTES, and that is the
         honest reason this is being made deliberate now: S2(b) means a run that
         DIES no longer says NOT YET — it says the program stopped and marks
         nothing wrong, which is right for a pupil and leaves this landmark
         reachable by one route instead of two.
         So the confused pupil gets the mistake she is really making. She is not
         confused about ORDER — build 2 taught her that ten minutes ago — she is
         confused about WHICH LINES BELONG. She puts the real lines in the order
         she was taught, leaves the decoys she does not recognise on the end, and
         presses RUN: the program runs every time, does the wrong thing every
         time, and NOT YET is reached every time. Deterministic, and a truer
         picture of the pupil than the shuffle was. */
      /* THE DECOYS ARE NOT "OUT OF ORDER" (17 Sep 2026). This compared every
         placed row against the answer's order, so a decoy she had taken across
         in the tray's own shuffle sat "out of order" among the lines that
         belong, and the reorder branch below handed it back BEFORE the two wrong
         runs — the runs then had nothing wrong in them, and on j2-04's third
         training build the failing run never happened. Order is judged on the
         lines the answer WANTS; a decoy may sit anywhere until it has been run. */
      const keep0 = new Set(key.order.map(String));
      const inOrder = (function () {
        const sis = Array.from(document.querySelectorAll('.pyp-list .pyrun-line'))
          .map(n => String(n.getAttribute('data-si'))).filter(si => keep0.has(si));
        return key.order.every((v, i) => sis[i] === String(v));
      })();
      if (!gapOpen && !inOrder) {
        /* one ordering step: strip back to the longest run that is already
           right, then let the next turn place the next line the answer asks for.
           Lines only ever land on the END, so this is the shape that converges —
           the same argument as the branch below, applied before the run rather
           than after it. */
        const rows2 = Array.from(document.querySelectorAll('.pyp-list li'));
        let j2 = 0;   /* the next wanted line the answer expects; decoys are skipped over */
        for (let i = 0; i < rows2.length; i++) {
          const ln = rows2[i].querySelector('.pyrun-line');
          const si = ln && Number(ln.getAttribute('data-si'));
          if (!keep0.has(String(si))) continue;
          if (j2 < key.order.length && si === Number(key.order[j2])) { j2++; continue; }
          window.__undoing = true; window.__undoingFor = bid0; window.__wpNote = 'reorder';
          const back2 = rows2[i].querySelector('.take-back');
          if (back2) { back2.click(); return; }
          (ln.querySelector('code') || ln).click(); return;
        }
      }
      if (!gapOpen) {
        window.__wrongRun = (window.__wrongRun || 0) + 1;
        if (window.__wrongRun <= 2) {
          const run = document.querySelector('.pyrun-run:not([disabled])');
          window.__wpNote = run ? 'wrong-run-' + window.__wrongRun : 'wrong-run-NO-BUTTON';
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
          /* a decoy handed back AFTER its two goes has been tried — say so where
             the run mover keeps its list, so it is not placed and run a second
             time on the way past (one home for "which mistakes she has made") */
          if (!gapOpen) {
            const wp = (window.__wpWrong = window.__wpWrong || {});
            wp[bid0] = wp[bid0] || {};
            wp[bid0].tried = wp[bid0].tried || [];
            if (wp[bid0].tried.indexOf(String(si)) === -1) wp[bid0].tried.push(String(si));
          }
          window.__wpNote = 'take-back-extra';
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
    if (wanted && key && key.order) {
      const placedSis = Array.from(document.querySelectorAll('.pyp-list .pyrun-line'))
        .map(n => Number(n.getAttribute('data-si')));
      const prefixOk = placedSis.every((v, i) => v === Number(key.order[i]));
      if (!prefixOk) {
        /* AND THE SAME FLAG THE DECOY UNDO SETS (28 Aug 2026, found by the locked-lesson
           regression). Stripping a line back puts it in the tray, and the first branch of
           this move takes ANY line sitting in the tray — so on a card whose tray ejects on
           click, the strip and the re-take fought each other exactly as the decoy undo once
           did, and J2 Lesson 2 stopped at eight of fifteen screens. One flag, both jobs. */
        window.__wpNote = 'strip'; window.__undoing = true; window.__undoingFor = bid0;
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
    const inp = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank, .pyp-fixed .pyrun-blank'))
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
    /* then fill it exactly as the right-path mover does — on every card that
       carries a gap: the tray, the worked card (j3-04's machine-1 opens with an
       EMPTY gap in a worked card, the first one anywhere), and the locked lines */
    const key = window.__walkKey ? window.__walkKey(bid) : null;
    const inp = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank, .pyw-list .pyrun-blank, .pyp-fixed .pyrun-blank')).find(i => !i.value);
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
  /* ---- LESSON 4 (14 Sep 2026, spec §C10): two mistakes a pupil really makes ----
     SHE PRESSES START WITH THE WORD BOXES EMPTY. The PLAN face refuses and says
     why (the `emptySay`), and that refusal is a landmark a lone walker must
     stand on. Once, then she fills the boxes from the key as the expert does. */
  'l4-words': () => {
    const plan = document.querySelector('.pye-plan');
    const bid = (plan && plan.getAttribute('data-build')) || '?';
    const st = (window.__wpWrong = window.__wpWrong || {})[bid] || (window.__wpWrong[bid] = {});
    if (!st.wordsTried) {
      st.wordsTried = true;
      const go = document.querySelector('.pye-start:not([disabled])');
      if (go) { go.click(); return; }
    }
    /* The mover is evaluated inside the page, where MOVES does not exist; the
       ordinary move is the walker's to make (it runs the plain mover on 'defer'). */
    return 'defer';
  },
  /* SHE STOPS WAITING AND TAKES THE STUDIO'S ORDERS (14 Sep 2026, spec §C10:
     the lone walker's solo route). On the Rush the long wait offers a button
     that lets her do the activity alone — the Studio's own three orders through
     her own machines, to the same check and the same seal. A lone pupil on a
     cover day presses it, so the walker does: once, on the Rush's wait only
     (the engine, read off the chunk — never a lesson's name, DFM 271). The
     Swap's and the Match's waits keep their own walks. */
  'pair-wait': () => {
    const s = window.App && App.state && App.state.chunks && App.state.chunks[App.state.chunkIdx];
    if (!s || s.engine !== 'orders') return 'defer';
    const st = (window.__wpWrong = window.__wpWrong || {});
    const own = document.querySelector('.pair-wait .pw-own');
    /* she watches Unit 7 for a beat before she gives up on a partner — the
       side show is the state the landmark names, so it is stood on first */
    const unit7 = document.querySelector('.sideshow .ss-img');
    if (!st.ordOwnTaken && own && own.offsetParent !== null && unit7 && unit7.offsetParent !== null) { st.ordOwnTaken = true; own.click(); return; }
    return 'defer';
  },
  /* SHE PUTS THE SHAPE IN AND PRESSES RUN BEFORE SHE HAS TYPED A WORD (14 Sep
     2026, the j3-4 walker: "a NOT YET that repeats every unfinished job under
     itself" was never stood on). The staged editor offers the shape for free,
     and a pupil who takes it and runs it as it stands is the commonest sight in
     the room. The verdict then lists every job under itself, which is the
     landmark. Once per build; then the ordinary write. */
  'pye-write': () => {
    const card = Array.from(document.querySelectorAll('.pye-bench, .pye-wall'))
      .find(n => n.tagName === 'DIV' && n.querySelector('.pye-code'));
    if (!card) return 'defer';
    const bid = card.getAttribute('data-build') || '?';
    const st = (window.__wpWrong = window.__wpWrong || {})[bid] || (window.__wpWrong[bid] = {});
    if (!st.shapeRun) {
      const starter = card.querySelector('.pye-starter-btn:not([disabled])');
      if (starter && starter.offsetParent !== null) { st.shapeRun = 'shape'; starter.click(); return; }
      st.shapeRun = 'none';
    }
    if (st.shapeRun === 'shape') {
      const run = card.querySelector('.pyrun-run:not([disabled])');
      st.shapeRun = 'ran';
      if (run && run.offsetParent !== null) { run.click(); return; }
    }
    if (st.shapeRun === 'ran') {
      /* the run takes a moment; typing over it mid-run would be a second
         mistake nobody makes. Stand still until the verdict is up. */
      const v = card.querySelector('.pyrun-verdict');
      const btn = card.querySelector('.pyrun-run');
      if (btn && btn.disabled && !(v && !v.hidden)) return;
      st.shapeRun = 'seen';
    }
    /* SHE FORGETS A DOOR (17 Sep 2026, j2-4 walks 12–13: "a row of the path check
       with NO door" was never stood on). The starter and the answer both end every
       road with a NEXT: door line, so no run so far has ever left a road doorless.
       Once the shape run has been seen she types the answer with its first door
       line missing and runs it — the path check then shows a road with no door and
       the verdict says NOT YET — and only then does the plain mover type the answer.
       Derived from the card: the answer (key.program) must contain a door line;
       never from a lesson's name (DFM 271). */
    if (st.shapeRun === 'seen' && !st.doorless) {
      const key = window.__walkKey ? window.__walkKey(bid) : null;
      const prog = key && key.program ? String(key.program) : '';
      const lines = prog.split('\n');
      const di = lines.findIndex(l => /NEXT: door [AB]/.test(l));
      st.doorless = 'typed';
      if (di !== -1) {
        lines.splice(di, 1);
        const ta = card.querySelector('.pye-code');
        ta.value = lines.join('\n');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        const run = card.querySelector('.pyrun-run:not([disabled])');
        window.__wpNote = 'forget-door';
        if (run && run.offsetParent !== null) { run.click(); return; }
      }
    }
    if (st.doorless === 'typed') {
      const v = card.querySelector('.pyrun-verdict');
      const btn = card.querySelector('.pyrun-run');
      if (btn && btn.disabled && !(v && !v.hidden)) return;
      st.doorless = 'seen';
    }
    return 'defer';
  },
  /* SHE PRESSES THE WAY OUT IN THE MIDDLE OF THE ADVENTURE. The card asks first
     (leaveAsk) and offers Keep going; the ask is the landmark, and Keep going is
     the plain mover's answer. Once per lesson, on a room that is playing. */
  'rly-wait': () => {
    const st = (window.__wpWrong = window.__wpWrong || {});
    if (!st.rlyLeaveTried && document.querySelector('.rly-card .pyx-row') && !(document.querySelector('.rly-leave-ask') && !document.querySelector('.rly-leave-ask').hidden)) {
      st.rlyLeaveTried = true;
      const out = document.querySelector('.rly-card .rly-finish:not([disabled])');
      if (out) { out.click(); return; }
    }
  },
  'pyrun-run': () => {
    const card = document.querySelector('.pyrun-card');
    const bid = (card && card.getAttribute('data-build')) || '?';
    const st = (window.__wpWrong = window.__wpWrong || {})[bid] ||
      (window.__wpWrong[bid] = {});
    const key = window.__walkKey ? window.__walkKey(bid) : null;
    const order = (key && key.order) || null;
    const wanted = (si) => !order || order.indexOf(Number(si)) !== -1;
    const runIt = () => { const b = document.querySelector('.pyrun-run:not([disabled])'); if (b) b.click(); };

    /* SHE TRIES EVERY LINE SHE DOES NOT RECOGNISE, ONE AT A TIME (14 Sep 2026,
       K42b — the j3-2 walker landmark, walker only, the lesson untouched).
       This placed "a decoy" — the FIRST unwanted line the deranged tray happened
       to offer (DFM 258) — ran it once, and took it back. So on a card with two
       decoys of different KINDS, which mistake she made was a coin toss per
       render: j3b-takings carries one line that makes Python STOP (a number
       added straight onto words, the TypeError its own errorWords answer) and
       one that merely prints the wrong words, and "the console after a run that
       did NOT work" was reached on one walk in three against the build he sat
       (j3-2-walker/CONTROL-run1..3: 16, 15, 15 of 16). A landmark that turns on
       a shuffle is a lottery, not coverage (DFM 199).
       A pupil who does not recognise the lines does not try one of them and
       stop: she tries each. So does she now — every decoy on the card, in the
       order the tray offers them, placed, run, taken back — and only then the
       ordinary route. Derived from the key and the card, never from a lesson's
       name (DFM 271): a card with one decoy walks exactly as it did, a card with
       none takes the badVal route as it did, and a card whose rows carry a
       labelled way back is taken back by it (the shipped L3 cards do not eject
       on click). */
    /* SHE TYPES THE WRONG THING IN EVERY GAP, ONE AT A TIME (14 Sep 2026, the
       j3-4 walker: "the reject bin with something in it" was never stood on).
       This used to be one gap, one wrong word ('not that'), and only on a card
       with no decoy at all — so a gap card that also carried decoys never saw a
       wrong VALUE, and the wrong word could only ever make Python STOP. A pupil
       who has stopped reading types a NUMBER where the slot's name should go
       (`def price(4):` is machine-3's own decoy, the same misconception), and a
       number in the second gap RUNS: `return 7 * 4` makes twelve wrong products
       and fills the reject bin, which a stopped program never can. So: every
       gap in turn, a wrong number in it, RUN, the right value back — BEFORE the
       decoys are tried (a harmless decoy can MATCH and end the card, so the
       gaps go first; 16 Sep 2026) — and only then the ordinary run. Derived from the card, never from
       a lesson's name (DFM 271). */
    /* A GAP THAT HOLDS ONE OF HER OWN WORDS CANNOT BE WRONG (17 Sep 2026): on a
       path-check card the key carries `words`, the gap IS the second word, and
       whatever she types there is by definition what the room is tested with —
       so the wrong-value route can only MATCH and end the card before a decoy
       is ever tried. On such a card the decoys go first. */
    if (!st.gapsDone && key && key.words) st.gapsDone = true;
    if (!st.gapsDone) {
      const blanks = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank')).filter(i => i.offsetParent !== null);
      const right = (i) => { const k = i.getAttribute('data-key'); return (key && key.blanks && key.blanks[k] != null) ? String(key.blanks[k]) : 'x'; };
      st.badAt = st.badAt || 0;
      if (st.badVal === 'ran') {
        st.badVal = null;
        blanks.forEach(function (i) { i.value = right(i); i.dispatchEvent(new Event('input', { bubbles: true })); });
        st.badAt++;
        return;
      }
      if (st.badAt >= blanks.length) st.gapsDone = true;
      if (st.badAt < blanks.length) {
        /* the wrong value and the RUN in ONE move: a gap holding the wrong
           value is a `pyrun-blank` state to the detector, and the blank-fix
           mover would put it right before any run — so the run has to be
           pressed in the same breath the wrong value is typed */
        const inp = blanks[st.badAt];
        const r = right(inp);
        st.badVal = 'ran';
        inp.value = /^\d+$/.test(r) ? String(Number(r) + 3) : '7';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        runIt();
        return;
      }
    }
    if (order && st.decoy !== 'none' && st.decoy !== 'done') {
      st.tried = st.tried || [];
      const placedDecoy = () => Array.from(document.querySelectorAll('.pyp-list li')).find(l => {
        const n = l.querySelector('.pyrun-line');
        return n && !wanted(n.getAttribute('data-si'));
      });
      if (st.decoy === 'placed') {
        /* ON A CARD WITH A LABELLED WAY BACK the over-placed rule takes the card
           the moment the decoy lands — runs it twice and hands it back — before
           this mover is asked again, so "placed" can already mean "tried and gone".
           Run it only if it is still there; otherwise move to the next one. */
        if (placedDecoy()) { st.decoy = 'ran'; runIt(); return; }
        st.decoy = 'removed';
      }
      if (st.decoy === 'ran') {
        st.decoy = 'removed';
        const li = placedDecoy();
        if (li) {
          const tb = li.querySelector('.take-back');
          const n = li.querySelector('.pyrun-line');
          (tb || (n.querySelector('code') || n)).click();
          return;
        }
      }
      /* fresh, or the last one is back in the tray: the next decoy not yet tried */
      const d = Array.from(document.querySelectorAll('.pyt-list .pyrun-line'))
        .find(n => !wanted(n.getAttribute('data-si')) && st.tried.indexOf(String(n.getAttribute('data-si'))) === -1);
      if (d) { st.tried.push(String(d.getAttribute('data-si'))); st.decoy = 'placed'; d.click(); return; }
      /* 'done' = there were decoys and every one has been tried: run it properly,
         as the single-decoy route always did; 'none' = a card with no decoy at all,
         which takes the wrong-VALUE route below, as it always did */
      st.decoy = st.tried.length ? 'done' : 'none';
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
  'rly-wait': 1200, 'rly-keep-going': 500, 'ord-wait': 1400, 'ord-own': 1500, 'ord-form': 1500, 'ord-check': 400,
  'l4-words': 300, 'l4-publish': 1500, 'l4-published': 800, 'l4-publish-skip': 800,
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
        /* THE OPEN LESSON'S OWN FILE FIRST (14 Sep 2026, the first j2-4 walk).
           Build ids repeat across lessons — j2-03's worked card and j2-04's are
           both `t1`, each with a gap `t1a` — and a scan in file order handed
           the Lesson 4 walk Lesson 3's answer ("name" for a gap that wanted
           "=="), so the expert "fixed" the fork line wrong and pressed RUN on
           it for ever. The platform knows which lesson is open; ask it. */
        const entry = window.App && App.state && App.state.lessonEntry;
        const own = entry && entry.file ? String(entry.file).replace(/\.json$/, '') : null;
        if (own && all[own] && all[own][bid]) return all[own][bid];
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
