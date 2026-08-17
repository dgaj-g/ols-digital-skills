/* deck-shot-plan.js — WHAT EVERY PICTURE IN THE TEACHER LAYER CLAIMS TO BE.
 *
 * One row per picture, for all five lessons: the chunk it belongs to, the
 * predicate that must be TRUE at the shutter, and a plain sentence saying what
 * it shows. The capture script reads this; the gate reads the manifest the
 * capture writes. Keeping the plan in its own file means the claim and the
 * machinery that honours it can be read side by side — and it is the file to
 * open when a lesson changes shape.
 *
 * THREE KINDS OF ROW:
 *   `app`           — a real screenshot of the running app, taken only while
 *                     its predicate holds (DFM 225b).
 *   `content-asset` — composed from pictures the lesson already owns (the hook
 *                     photographs, the annotated reset-button photo). Nothing
 *                     is redrawn and no caption is rewritten: the board says
 *                     what her screen says (DFM 144).
 *   `film-frame`    — a single frame lifted out of a LOCKED film, so the class
 *                     sees the film's own pixels. The timestamp was chosen by
 *                     eye, not by arithmetic, and the film's md5 rides with it
 *                     so a re-recorded film invalidates its own stills.
 *
 * PREDICATES ARE WRITTEN TO BE FALSIFIABLE. "the ladder is on screen" is not a
 * predicate — `.chunk-host` is always on screen. What is written here is the
 * thing that is true ONLY on the screen being claimed: the rung card open and
 * unanswered, the log box still empty, the marquee carrying another studio.
 */

/* ══════════════════════════ THE DECK SHOTS ════════════════════════════════ */
const DECK_SHOTS = {

  /* ─────────────────────────────── LESSON 2 ─────────────────────────────── */
  'j1-02': {
    film: {
      chunk: 'howto',
      selector: '.chunk-host .card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'howto') return false;
        /* the PLAYER with its chapter buttons — not the intro card that
           precedes it. Four chapters is what this film has; fewer means the
           card underneath is a different one. */
        return document.querySelectorAll('.chunk-host .vid-chapter').length >= 4 &&
          !!document.querySelector('.chunk-host video');
      },
      says: 'the film screen with its four chapter buttons'
    },
    rung2: {
      chunk: 'ladder',
      selector: '.chunk-host .ladder-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'ladder') return false;
        const c = document.querySelector('.chunk-host .ladder-card');
        if (!c) return false;
        /* rung 2 OPEN and UNANSWERED: its target on screen, its test panel
           rendered, and no tick yet on its confirm */
        return /HAPPY FACE/i.test(c.textContent || '') &&
          !!c.querySelector('.rung-test') &&
          !c.querySelector('.confirm-step.ticked');
      },
      says: 'a rung card — the challenge, the test and the Debug Hint'
    },
    bank: {
      chunk: 'bank',
      /* A TIGHTER ELEMENT, and why. The whole card is the right SCREEN and the
         wrong SHAPE: photographed entire it comes out taller than 1:1.6, and
         the deck scales a single shot into about 250pt of width — so the class
         would be shown a ribbon. This selector is a smaller COMPLETE element
         that carries what the slide's own bullets talk about. The picture is
         never squashed; a different, honest part of the screen is framed. */
      selector: '.chunk-host .af-steps',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'bank') return false;
        const c = document.querySelector('.chunk-host .af-card');
        /* the steps card BEFORE the inspection has run — an af-result with
           words in it means the badge moment, which is a different screen */
        const res = c && c.querySelector('.af-result');
        return !!c && !!c.querySelector('.af-steps') &&
          (!res || !(res.textContent || '').trim());
      },
      says: 'the three Bank Your Build steps'
    },
    selfeval: {
      chunk: 'selfeval',
      selector: '.chunk-host .se-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'selfeval') return false;
        const c = document.querySelector('.se-card');
        /* UNTOUCHED: no chip chosen anywhere. A photographed self-evaluation
           with answers already on it teaches the class the wrong thing. */
        return !!c && !c.querySelector('.se-chip.on, .se-chip.sel, .se-chip[aria-pressed="true"]');
      },
      says: 'the compulsory How did it go? screen, untouched'
    }
  },

  /* ─────────────────────────────── LESSON 3 ─────────────────────────────── */
  'j1-03': {
    rung1: {
      chunk: 'ladder',
      /* A TIGHTER ELEMENT, and why. The whole card is the right SCREEN and the
         wrong SHAPE: photographed entire it comes out taller than 1:1.6, and
         the deck scales a single shot into about 250pt of width — so the class
         would be shown a ribbon. This selector is a smaller COMPLETE element
         that carries what the slide's own bullets talk about. The picture is
         never squashed; a different, honest part of the screen is framed. */
      selector: '.chunk-host .rung-part',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'ladder') return false;
        const c = document.querySelector('.chunk-host .ladder-card');
        if (!c) return false;
        /* rung 1 with ITS OWN part film on the card — the DFM 168 shape, and
           the thing that makes Lesson 3's ladder different from Lesson 2's */
        return /wake the scoreboard/i.test(c.textContent || '') &&
          !!c.querySelector('.rung-part-video') &&
          !c.querySelector('.confirm-step.ticked');
      },
      says: 'a rung’s own slice of the film, sitting on the rung card'
    },
    rig: {
      chunk: 'rig',
      selector: '.chunk-host .af-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'rig') return false;
        const c = document.querySelector('.chunk-host .af-card');
        const res = c && c.querySelector('.af-result');
        return !!c && !!c.querySelector('.af-steps') &&
          (!res || !(res.textContent || '').trim());
      },
      says: 'the Register Your Rig check-in card'
    },
    rally: {
      chunk: 'rally',
      /* A TIGHTER ELEMENT, and why. The whole card is the right SCREEN and the
         wrong SHAPE: photographed entire it comes out taller than 1:1.6, and
         the deck scales a single shot into about 250pt of width — so the class
         would be shown a ribbon. This selector is a smaller COMPLETE element
         that carries what the slide's own bullets talk about. The picture is
         never squashed; a different, honest part of the screen is framed. */
      selector: '.chunk-host .rally-timer',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'rally') return false;
        const c = document.querySelector('.chunk-host .rally-card');
        if (!c) return false;
        /* BEFORE a single score exists: the timer not started and every round
           still locked. A rally console photographed with numbers on it puts a
           pupil's own data on a projector. */
        const nums = Array.from(c.querySelectorAll('.rally-round-num, .rally-round input'))
          .map(e => (e.value !== undefined ? e.value : e.textContent) || '');
        const started = /\brunning\b|\bstop\b/i.test((c.querySelector('.rally-timer-btn') || {}).textContent || '');
        return !!c.querySelector('.rally-timer') && !started &&
          nums.every(v => !String(v).trim() || String(v).trim() === '0');
      },
      says: 'the Rally timer before it is started — whose screen it is, and the start button'
    },
    selfeval: {
      chunk: 'selfeval',
      selector: '.chunk-host .se-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'selfeval') return false;
        const c = document.querySelector('.se-card');
        return !!c && !c.querySelector('.se-chip.on, .se-chip.sel, .se-chip[aria-pressed="true"]');
      },
      says: 'the compulsory How did it go? screen, untouched'
    }
  },

  /* ─────────────────────────────── LESSON 4 ─────────────────────────────── */
  'j1-04': {
    board: {
      chunk: 'board',
      selector: '.chunk-host .case-board',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'board') return false;
        const b = document.querySelector('.chunk-host .case-board');
        /* the board AS SHE MEETS IT: no case closed yet */
        return !!b && !b.querySelector('.case-stamp');
      },
      says: 'the Case Board, the hour’s home, with nothing closed yet'
    },
    intake: {
      chunk: 'board',
      selector: '.chunk-host .card',
      mustShow: /detective examines the REAL broken thing/i,
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'board') return false;
        const h = document.querySelector('.chunk-host');
        if (!h || document.querySelector('.case-board')) return false;
        /* the Evidence Intake view, its steps rendered and NOT yet confirmed */
        return /A detective examines the REAL broken thing/i.test(h.textContent || '') &&
          !!h.querySelector('.confirm-step:not(.ticked)');
      },
      says: 'the Evidence Intake card — how she gets the broken game'
    },
    case1: {
      chunk: 'board',
      /* A TIGHTER ELEMENT, and why. The whole card is the right SCREEN and the
         wrong SHAPE: photographed entire it comes out taller than 1:1.6, and
         the deck scales a single shot into about 250pt of width — so the class
         would be shown a ribbon. This selector is a smaller COMPLETE element
         that carries what the slide's own bullets talk about. The picture is
         never squashed; a different, honest part of the screen is framed. */
      selector: '.chunk-host .case-ticket',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'board') return false;
        const h = document.querySelector('.chunk-host');
        if (!h) return false;
        const ta = h.querySelector('.case-log-input');
        /* a case file AS FIRST MET: the log box empty and no stamp on it. The
           empty box is not a detail — it is what keeps an answer off the
           slide (DFM 37). */
        return !!h.querySelector('.case-close-btn') && !!ta && !ta.value &&
          !h.querySelector('.case-stamp.big') &&
          /shark/i.test(h.textContent || '');
      },
      says: 'the case ticket as a pupil first meets it — the players’ own report'
    },
    release: {
      chunk: 'board',
      selector: '.chunk-host .card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'board') return false;
        const h = document.querySelector('.chunk-host');
        if (!h) return false;
        const num = h.querySelector('input[type=number], .case-count-input');
        return /whole game is played/i.test(h.textContent || '') &&
          (!num || !num.value);
      },
      says: 'the release desk — the whole-game check'
    },
    selfeval: {
      chunk: 'selfeval',
      selector: '.chunk-host .se-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'selfeval') return false;
        const c = document.querySelector('.se-card');
        return !!c && !c.querySelector('.se-chip.on, .se-chip.sel, .se-chip[aria-pressed="true"]');
      },
      says: 'the compulsory How did it go? screen, untouched'
    }
  },

  /* ─────────────────────────────── LESSON 5 ─────────────────────────────── */
  'j1-05': {
    contracts: {
      chunk: 'sign',
      selector: '.chunk-host .std-contracts',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'sign') return false;
        const c = document.querySelector('.chunk-host .std-contracts');
        if (!c) return false;
        /* all three OPEN and NOTHING signed — the screen where she is still
           choosing, which is the one the teacher talks the class through */
        return c.querySelectorAll('.std-contract').length === 3 &&
          !c.querySelector('.std-contract.signed') &&
          !c.querySelector('.std-signed-chip');
      },
      says: 'the contracts desk, all three still open'
    },
    film: {
      chunk: 'masterclass',
      selector: '.chunk-host .card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'masterclass') return false;
        return document.querySelectorAll('.chunk-host .vid-chapter').length >= 2 &&
          !!document.querySelector('.chunk-host video');
      },
      says: 'the masterclass player and its two chapters'
    },
    desk: {
      chunk: 'build',
      /* A TIGHTER ELEMENT. The whole `.std-desk` is four stacked cards — kit,
         blueprint, QA desk, stretch — and photographs at 1892x3818 (1:2.02),
         which the deck would shrink to about 124pt wide. `1 · THE KIT` is the
         card the slide's own bullets talk about and the one a pupil meets
         first; the QA checks below it are described in the text and shown at
         their own moment. */
      selector: '.chunk-host .std-tool',
      mustShow: /the kit/i,
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'build') return false;
        const h = document.querySelector('.chunk-host');
        if (!h) return false;
        const rows = h.querySelectorAll('.std-qa-row');
        /* TOP OF THE SPRINT, before the kit is ticked: every QA row still
           LOCKED, so their outcome lists — each of which carries the exact fix
           — are not rendered at all. This is the DFM 37 guarantee for the one
           screen on the platform where an answer is one click from the shutter. */
        return rows.length > 0 &&
          Array.from(rows).every(r => r.classList.contains('locked')) &&
          !h.querySelector('.std-qa-outcomes:not([hidden])');
      },
      says: 'the Studio Desk at the top of the sprint, QA checks still locked'
    },
    press: {
      chunk: 'press',
      /* the marquee GRID itself — the thing Press Night is. A comma list here
         photographed a greyed-out V2 note card instead (see `mustShow`). */
      /* the whole Press Night card — heading, press passes, the two review
         stems AND the marquee. The grid alone is a strip of listings with no
         sign of what screen it belongs to, and the slide's pinned expectation
         is the heading and the stems. */
      /* `.gal-floor` — read out of the engine rather than guessed at. Press
         Night's own wrapper is a `.std-desk.gal-floor`, NOT a `.card`, so every
         card-based selector fell through to the fallback and grabbed the
         greyed-out `.card.gal-v2-card` sitting inside it. Two selector guesses
         (`:has()` then `:has-text()`) both failed the same way, and `mustShow`
         caught both — which is exactly what it is for. */
      selector: '.chunk-host .gal-floor',
      /* the grid names the studios themselves, so what it must show is a real
         listing — and above all NOT the word SIMULATED, which is the preview's
         and never a classroom's */
      mustShow: /press night/i,
      mustNotShow: /simulated/i,
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'press') return false;
        const h = document.querySelector('.chunk-host');
        if (!h) return false;
        /* a REAL marquee: at least one OTHER studio listed. Without the second
           account this screen is empty, and an empty marquee on a slide teaches
           a class that Press Night looks like nothing (DFM 225b's lesson from
           the paired Vault). */
        return h.querySelectorAll('.gal-marquee-card').length >= 1 &&
          /press night/i.test(h.textContent || '');
      },
      says: 'Press Night with another studio really on the marquee'
    },
    selfeval: {
      chunk: 'selfeval',
      selector: '.chunk-host .se-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'selfeval') return false;
        const c = document.querySelector('.se-card');
        return !!c && !c.querySelector('.se-chip.on, .se-chip.sel, .se-chip[aria-pressed="true"]');
      },
      says: 'the compulsory How did it go? screen, untouched'
    }
  },

  /* ══════════════════════════ J2 LESSON 1 (17 Aug 2026) ═══════════════════
     THE ONE DELIBERATE ABSENCE, and it is a design decision rather than an
     oversight: NO INSPECTION SCENE IS PHOTOGRAPHED. The rooms are the puzzle —
     every station in them is an answer — and a room on the board is a room the
     class has already been walked through. What the deck shows instead is the
     MECHANIC: the numbered "how the inspection works" list off the intro card,
     which is the thing a pupil who has never met a flag-a-station screen
     actually hesitates at. Same reasoning keeps every Warrant question and
     every marked exit question off the slides (DFM 37).

     AND THE TWO DIAGNOSTIC SHOTS ARE PINNED TO NON-`matched` ITEMS. Lesson 1's
     own deck photographs a Licence Exam question that IS re-served in June, so
     one baseline item is pre-exposed on a wall. Here each shot names the stem it
     must be standing on, and both are items the year-end re-serve never asks
     again — so a class sees exactly what the screen looks like and nothing that
     June measures is spent. */
  'j2-01': {
    workbench: {
      chunk: 'workbench',
      selector: '.chunk-host .step-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'workbench') return false;
        const c = document.querySelector('.chunk-host .step-card');
        if (!c) return false;
        /* STEP 3 specifically — the Saved chip, which is the step the slide's
           own third bullet is about — and UNTICKED, because a card photographed
           with its box already ticked shows the class a screen they cannot act on */
        return /STEP 3 OF 5/i.test(c.textContent || '') &&
          !c.querySelector('.confirm-step.ticked');
      },
      mustShow: /watch your work save itself/i,
      says: 'a workbench step: what to look for, and the box to tick when it is found'
    },
    badge: {
      chunk: 'workbench',
      selector: '.badge-pop-card',
      at: () => {
        const c = document.querySelector('.badge-pop-card');
        return !!c && /your workbench/i.test(c.textContent || '');
      },
      mustShow: /badge earned/i,
      says: 'the badge card that appears over the lesson, with its points'
    },
    'inspect-intro': {
      chunk: 'inspection',
      /* A TIGHTER ELEMENT, and the reason is DFM 237(b). The whole intro card is
         660x962 in the preview — 1:1.46 — and the deck scales one screenshot into
         about 250 points of width, so the card entire would render 172pt wide and
         its six rules would be unreadable from the back of a room. This element is
         the numbered mechanic on its own: a complete thing, 1:0.32, and it renders
         at the full 250pt. The rules are on the slide before it, in the teacher's
         own voice, which is where he ruled they belong. */
      selector: '.chunk-host .insp-intro-steps',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'inspection') return false;
        /* the intro card, before the first scene: the steps list exists only there */
        return !!document.querySelector('.chunk-host .insp-intro-steps') &&
          !document.querySelector('.chunk-host .insp-stage');
      },
      mustShow: /file my inspection report/i,
      says: 'how the inspection works, in the four steps off its own opening card'
    },
    'snapshot-q': {
      chunk: 'snapshot',
      selector: '.chunk-host .q-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'snapshot') return false;
        const c = document.querySelector('.chunk-host .q-card');
        if (!c) return false;
        /* NAMED BY ITS STEM, not by its number, and the stem is deliberately one
           of the items the year-end re-serve does NOT ask again. Unanswered, so
           no choice of anybody's is projected. */
        return /A robot is told to take three steps/i.test(c.textContent || '') &&
          !c.querySelector('.q-logged');
      },
      mustShow: /1 OF 12/i,
      says: 'a Snapshot question, unanswered — one question, four choices, no verdict'
    },
    'warrant-intro': {
      chunk: 'warrant',
      selector: '.chunk-host .intro-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'warrant') return false;
        return !!document.querySelector('.chunk-host .intro-card') &&
          !document.querySelector('.chunk-host .q-card');
      },
      mustShow: /your warrant is your proof/i,
      says: 'the card that opens the Workshop Warrant'
    },
    selfeval: {
      chunk: 'selfeval',
      selector: '.chunk-host .se-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'selfeval') return false;
        const c = document.querySelector('.se-card');
        /* UNTOUCHED: a photographed self-evaluation with answers already on it
           teaches the class what to answer */
        return !!c && !c.querySelector('.se-chip.on, .se-chip.sel, .se-chip[aria-pressed="true"]');
      },
      mustShow: /how did it go/i,
      says: 'the compulsory How did it go? screen, untouched'
    }
  },

  /* ══════════════════════════ J3 LESSON 1 (17 Aug 2026) ═══════════════════
     Same two decisions as J2's, for the same reasons: NO CASE is photographed
     (the six judgements are the whole activity), and the Portfolio Zero shot is
     pinned to a NON-`matched` item so the year-end re-serve is untouched. What
     the deck shows is every screen whose SHAPE is new to her — the orientation
     step, the badge card, the card that opens the code, a question in its
     unanswered state, the Compass board, and the final screen. */
  'j3-01': {
    orientation: {
      chunk: 'orientation',
      selector: '.chunk-host .step-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'orientation') return false;
        const c = document.querySelector('.chunk-host .step-card');
        if (!c) return false;
        return /STEP 3 OF 5/i.test(c.textContent || '') &&
          !c.querySelector('.confirm-step.ticked');
      },
      mustShow: /watch your work save itself/i,
      says: 'an orientation step: what to look for, and the box to tick when it is found'
    },
    badge: {
      chunk: 'orientation',
      selector: '.badge-pop-card',
      at: () => {
        const c = document.querySelector('.badge-pop-card');
        return !!c && /studio pass/i.test(c.textContent || '');
      },
      mustShow: /badge earned/i,
      says: 'the badge card that appears over the lesson, with its points'
    },
    'code-intro': {
      chunk: 'code',
      selector: '.chunk-host .intro-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'code') return false;
        return !!document.querySelector('.chunk-host .intro-card') &&
          !document.querySelector('.chunk-host .q-card');
      },
      /* the sentence that changes how the class works — "Nothing wrong here is a
         real answer" — has to be IN the picture, not merely on the page */
      mustShow: /nothing wrong here is a real answer/i,
      says: 'the card that opens the Studio Code and explains the judging job'
    },
    'portfolio-q': {
      chunk: 'portfolio',
      selector: '.chunk-host .q-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'portfolio') return false;
        const c = document.querySelector('.chunk-host .q-card');
        if (!c) return false;
        /* the SECOND item, named by its stem: item 1 is re-served at the end of
           the year and item 2 is not, so this is the one that costs nothing to
           put on a wall */
        return /A playlist holds four songs/i.test(c.textContent || '') &&
          !c.querySelector('.q-logged');
      },
      mustShow: /2 OF 12/i,
      says: 'a Portfolio Zero question, unanswered — one question, four choices, no verdict'
    },
    compass: {
      chunk: 'compass',
      selector: '.chunk-host .cmp-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'compass') return false;
        const c = document.querySelector('.chunk-host .cmp-card');
        /* the BOARD, not the result, and nothing picked on it yet: a Compass
           photographed with a side already chosen shows the class an answer to
           a question that has none */
        return !!c && !c.classList.contains('cmp-result') && !c.querySelector('.cmp-side.on');
      },
      mustShow: /which one sounds more like you/i,
      says: 'the Compass board — three pairs, nothing picked, the settle button still locked'
    },
    selfeval: {
      chunk: 'selfeval',
      selector: '.chunk-host .se-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'selfeval') return false;
        const c = document.querySelector('.se-card');
        return !!c && !c.querySelector('.se-chip.on, .se-chip.sel, .se-chip[aria-pressed="true"]');
      },
      mustShow: /how did it go/i,
      says: 'the compulsory How did it go? screen, untouched'
    }
  }
};

/* ═══════════════════ THE COMPOSED STILLS (spec §2 per lesson) ══════════════
   `from` names where the pictures come from IN THE LESSON'S OWN CONTENT, so the
   gate can check the deck is showing the class a picture the lesson really
   owns rather than one somebody dropped in a folder. */
const COMPOSED = {
  'j1-02': {
    'inputs-trio': {
      kind: 'content-asset',
      from: { chunk: 'hook', field: 'images' },
      says: 'the three input photographs from her own hook, with their captions'
    },
    'reset-button': {
      kind: 'content-asset',
      from: { chunk: 'packup', step: 1 },
      /* CC BY 4.0 — the credit is on her card and must be on the board */
      creditMust: /SimonWaldherr/,
      says: 'the annotated reset-button photo, credit intact'
    },
    /* `prep-flash` is the SAME frame as `flash-film`, and it is a composed still
       rather than a screenshot because the brief's own caption says what it is:
       "the film's own frame of the move pupils will make". It sits in the
       brief's PREPARE section, where a teacher is finding out what the lesson
       asks of her before she stands in front of it. */
    'flash-film': {
      kind: 'film-frame',
      src: 'assets/video/l2/l2-tutorial.mp4',
      /* chosen by eye: the .hex is mid-drag, the MICROBIT drive is highlighted
         under the pointer, and the film's own caption is clear of it (DFM 141a) */
      tSeconds: 238.0,
      /* The moment is right; the SCALE of the target was the problem — the drag
         lands on a sidebar row about ten pixels tall, smaller on a projector
         than the sentence describing it.
         WHAT WAS TRIED AND REJECTED, recorded because the rejection is the
         useful part: cropping to the file-explorer window made the row bigger
         and CUT THE FILM'S OWN CAPTION IN HALF — DFM 201(a) exactly, the
         clipped-caption fault he ordered a harness for, reintroduced by hand in
         the act of fixing something else. A magnified inset was tried with it
         and was worse than useless: the row is under a semi-transparent drag
         ghost, so enlarging it enlarges the blur.
         WHAT SHIPS: the whole frame as the film shows it, caption intact, with
         the MICROBIT drive RINGED. A ring adds no words, invents no pixels and
         costs no legibility — it is the annotation pattern the Guide film
         already uses (DFM 116), and the teacher's voice does the rest.
         (Coordinates are in the film's own 1280x720 frame.) */
      ring: { x: 270, y: 498, w: 232, h: 32 },
      says: 'the .hex mid-drag onto the MICROBIT drive, from the film itself, with the drive ringed'
    },
    /* The teacher's brief wants this same frame in its PREPARE section, and its
       caption already says what it is — "the film's own frame of the move
       pupils will make". It was in the walk's list until that caption was read,
       which would have had the capture hunting for an app screen that does not
       exist. One frame, one home (DFM 144); it just lands in the brief folder. */
    'prep-flash': {
      kind: 'film-frame',
      out: 'brief',
      file: 'prep-flash.png',
      src: 'assets/video/l2/l2-tutorial.mp4',
      tSeconds: 238.0,
      ring: { x: 270, y: 498, w: 232, h: 32 },
      says: 'the same film frame, for the brief’s prepare section'
    }
  },
  'j1-03': {
    'scores-trio': {
      kind: 'content-asset',
      from: { chunk: 'hook', field: 'images' },
      says: 'the arcade, the GAA scoreboard and Lesson 2’s trackers'
    },
    'variable-box': {
      kind: 'film-frame',
      src: 'assets/video/l3/l3-part1.mp4',
      /* the lid open and the value landing in the box named `score` — the
         arrival is the teaching moment, so the frame is taken mid-arrival */
      tSeconds: 17.0,
      says: 'the named box with its value arriving, from the film itself'
    }
  },
  'j1-04': {
    moth: {
      kind: 'content-asset',
      from: { chunk: 'hook', field: 'images' },
      creditMust: /public domain/i,
      says: 'the 1947 moth, wide, with its public-domain credit'
    }
  },
  'j1-05': {
    'ifelse-film': {
      kind: 'film-frame',
      src: 'assets/video/l5/l5-half1.mp4',
      /* the real if/else block at billboard size on the NEUTRAL snack machine,
         both gaps visible and labelled. No contract kit is in frame, which is
         the whole point of DFM 210 — nobody is handed their own answer. */
      tSeconds: 244.0,
      says: 'the real if/else block on the neutral demo, both parts labelled'
    }
  }
};

/* ═════════════════════════ THE BRIEF IMAGES ════════════════════════════════
   The teacher's brief carries a picture at each moment she needs to recognise
   a screen (rule 36 — the most repeated point in his whole review). These are
   captured on the SAME walk as the deck shots, so both are of one build.
   `_recap` is the Do-Now: a synthetic chunk the app injects rather than one the
   lesson JSON declares, and it is marked so the gate judges it on the recap
   pool instead of hunting for a chunk that does not exist. */
const BRIEF_SHOTS = {
  /* EVERY ROW CARRIES ITS OWN PREDICATE, and the reason is a fault this plan
     had until it was checked. Six of Lesson 4's brief images all belong to the
     `board` chunk. Keyed on the chunk alone, the walk would have taken all six
     at the FIRST board screen it met — six identical pictures filed under six
     different names, which is DFM 225b happening again in the teacher's brief
     instead of on a slide.
     The predicates below were written from each row's OWN CAPTION in the brief,
     because the caption is the claim the picture has to honour. Two rows were
     plainly wrong before that reading and are corrected here: `prep-flash` is
     the FILM'S own frame (its caption says so) and has moved to the composed
     stills, and both "exit" pictures in Lessons 3 and 4 are captioned as the
     ORDERING PUZZLE, which is a different chunk from the exit check. */
  'j1-02': {
    'glance-donow.png': {
      chunk: '_recap', says: 'the Do-Now, mid-question',
      at: () => !!document.querySelector('.chunk-host .q-stem')
    },
    'glance-briefing.png': { chunk: 'hook', says: 'the briefing card pupils read before anything is plugged in' },
    'glance-film.png': {
      chunk: 'howto', says: 'the film screen with its four chapter buttons',
      at: () => document.querySelectorAll('.chunk-host .vid-chapter').length >= 4
    },
    'glance-rung.png': {
      chunk: 'ladder', says: 'a rung card — the challenge at the top, the real test underneath',
      at: () => {
        const c = document.querySelector('.chunk-host .ladder-card');
        return !!c && !!c.querySelector('.rung-target') && !!c.querySelector('.rung-test');
      }
    },
    'brief-rung.png': {
      chunk: 'ladder', says: 'a rung card showing the Debug Hint and its 2 XP price',
      /* a DIFFERENT rung from the one above: same kind of screen, and the brief
         prints them in two different places, so two identical files would be a
         picture pretending to be evidence of something it is not */
      at: () => {
        const c = document.querySelector('.chunk-host .ladder-card');
        return !!c && /debug hint/i.test(c.textContent || '') && /2 XP/i.test(c.textContent || '');
      }
    },
    'glance-bank.png': {
      chunk: 'bank', says: 'Bank Your Build — three steps, then the check',
      at: () => !!document.querySelector('.chunk-host .af-steps')
    },
    'glance-puzzle.png': {
      chunk: 'exitp', says: 'the block puzzle, before any block is placed',
      at: () => {
        const c = document.querySelector('.chunk-host .parsons-card');
        return !!c && !c.querySelector('.parsons-slot .parsons-block');
      }
    },
    'glance-packup.png': {
      chunk: 'packup', says: 'the hand-back card with the annotated reset-button photograph',
      at: () => !!document.querySelector('.chunk-host img[src*="microbit-reset"]')
    },
    'glance-selfeval.png': { chunk: 'selfeval', says: 'the final screen — compulsory' }
  },

  'j1-03': {
    '01-do-now.jpg': {
      chunk: '_recap', says: 'the Do-Now, mid-question',
      at: () => !!document.querySelector('.chunk-host .q-stem')
    },
    '02-briefing.jpg': { chunk: 'hook', says: 'the briefing card that opens the lesson' },
    '04-rung-card.jpg': {
      chunk: 'ladder', says: 'a rung card with its own part-film on top, then the steps and the proof',
      at: () => {
        const c = document.querySelector('.chunk-host .ladder-card');
        return !!c && !!c.querySelector('.rung-part-video') && !!c.querySelector('.rung-test');
      }
    },
    'glance-stretch.png': {
      chunk: 'ladder', says: 'the stretch card — a second variable and the first if-block they meet',
      at: () => {
        const c = document.querySelector('.chunk-host .ladder-card');
        return !!c && /stretch|high-score/i.test(c.textContent || '');
      }
    },
    '05-rig.jpg': {
      chunk: 'rig', says: 'Register Your Rig — the Lesson 2 Drive routine, checked for real',
      at: () => !!document.querySelector('.chunk-host .af-steps')
    },
    '06-rally.jpg': {
      chunk: 'rally', says: 'the Rally console, before any score is entered',
      at: () => {
        const c = document.querySelector('.chunk-host .rally-card');
        return !!c && !!c.querySelector('.rally-timer') &&
          !/\brunning\b/i.test((c.querySelector('.rally-timer-btn') || {}).textContent || '');
      }
    },
    '08-exit.jpg': {
      chunk: 'exitp', says: 'the two-stack puzzle, before any block is placed',
      at: () => {
        const c = document.querySelector('.chunk-host .parsons-card');
        return !!c && !c.querySelector('.parsons-slot .parsons-block');
      }
    },
    'glance-selfeval.png': { chunk: 'selfeval', says: 'the final screen — compulsory' }
  },

  'j1-04': {
    '01-do-now.jpg': {
      chunk: '_recap', says: 'the Do-Now, mid-question',
      at: () => !!document.querySelector('.chunk-host .q-stem')
    },
    '02-briefing.jpg': {
      chunk: 'hook', says: 'the briefing, with the real 1947 logbook page',
      at: () => !!document.querySelector('.chunk-host img[src*="moth"]')
    },
    '03-board.jpg': {
      chunk: 'board', says: 'the Case Board — the hour’s home screen',
      at: () => !!document.querySelector('.chunk-host .case-board')
    },
    'glance-intake.png': {
      chunk: 'board', says: 'Evidence Intake — four steps to get the broken game open',
      at: () => {
        const h = document.querySelector('.chunk-host');
        return !!h && !document.querySelector('.case-board') &&
          /A detective examines the REAL broken thing/i.test(h.textContent || '');
      }
    },
    '04-case.jpg': {
      chunk: 'board', says: 'a case file as a pupil first meets it — log box empty',
      at: () => {
        const h = document.querySelector('.chunk-host');
        const ta = h && h.querySelector('.case-log-input');
        return !!h && !!h.querySelector('.case-close-btn') && !!ta && !ta.value &&
          !h.querySelector('.case-stamp.big');
      }
    },
    'glance-clues.png': {
      chunk: 'board', says: 'the help steps, open — two free, one that costs a gold stamp',
      at: () => {
        const h = document.querySelector('.chunk-host');
        return !!h && !!h.querySelector('.case-close-btn') &&
          /costs? you a gold|gold stamp/i.test(h.textContent || '');
      }
    },
    'glance-jellyfish.png': {
      chunk: 'board', says: 'the Jellyfish Job — the stretch, with next lesson’s block previewed',
      at: () => {
        const h = document.querySelector('.chunk-host');
        return !!h && !document.querySelector('.case-board') && /jellyfish/i.test(h.textContent || '');
      }
    },
    '05-release.jpg': {
      chunk: 'board', says: 'the release desk — four things to watch, and the count that proves she played',
      at: () => {
        const h = document.querySelector('.chunk-host');
        return !!h && /whole game is played/i.test(h.textContent || '');
      }
    },
    '06-exit.jpg': {
      chunk: 'exitp', says: 'the ordering puzzle, before any block is placed',
      at: () => {
        const c = document.querySelector('.chunk-host .parsons-card');
        return !!c && !c.querySelector('.parsons-slot .parsons-block');
      }
    }
  },

  'j1-05': {
    '01-do-now.jpg': {
      chunk: '_recap', says: 'the Do-Now, mid-question',
      at: () => !!document.querySelector('.chunk-host .q-stem')
    },
    '02-briefing.jpg': { chunk: 'hook', says: 'the briefing pupils read at the start of the hour' },
    '03-contracts.jpg': {
      chunk: 'sign', says: 'the contracts desk, all three still open',
      at: () => {
        const c = document.querySelector('.chunk-host .std-contracts');
        return !!c && !c.querySelector('.std-contract.signed');
      }
    },
    '04-film.jpg': {
      chunk: 'masterclass', says: 'the masterclass film — part one plays here',
      at: () => document.querySelectorAll('.chunk-host .vid-chapter').length >= 2
    },
    '05-sprint.jpg': {
      chunk: 'build', says: 'the Studio Desk — the kit, the blueprint and the four QA checks',
      at: () => document.querySelectorAll('.chunk-host .std-qa-row').length > 0
    },
    '06-press.jpg': {
      chunk: 'press', says: 'the marquee at Press Night',
      at: () => document.querySelectorAll('.chunk-host .gal-marquee-card').length >= 1
    },
    '08-ship.jpg': {
      chunk: 'ship', says: 'Ship your game — the same save-to-Drive routine as every build this term',
      at: () => !!document.querySelector('.chunk-host .af-steps')
    },
    '09-exit.jpg': {
      chunk: 'exit', says: 'an exit-check question, verdict held back until the report is filed',
      at: () => !!document.querySelector('.chunk-host .q-stem')
    }
  },

  /* ═══════════════ J2 LESSON 1's BRIEF (17 Aug 2026) ══════════════════════
     A teacher's brief is not a deck: rule 36 is the most repeated point in his
     whole review — "the teacher must SEE what pupils will see, and when" — and
     the DFM 37 no-answers rule governs the BOARD, not her own run document. So
     the brief DOES carry the inspection room and a marked question with its
     verdict, because she needs to recognise both. The precedent is Lesson 1's
     own brief, which prints a Badge 1 question after answering. */
  'j2-01': {
    '01-briefing.png': {
      chunk: 'briefing', says: 'the welcome card pupils read together at the start of the hour',
      /* THE BRIEFING IS NOT A `.card` AND IT TYPES ITSELF OUT — two facts that
         cost this row its first run. The engine renders `.dossier`, and its CTA
         is built hidden and revealed only when the last line has landed, so the
         button appearing is the one honest signal that the card is COMPLETE. A
         shot taken a second earlier is a half-written screen. */
      at: () => {
        const d = document.querySelector('.chunk-host .dossier');
        if (!d) return false;
        const cta = d.querySelector('.dossier-cta');
        return !!cta && !cta.hidden && /welcome to the workshop/i.test(d.textContent || '');
      }
    },
    '02-workbench.png': {
      chunk: 'workbench', says: 'a workbench step — what to look for, and the box to tick',
      at: () => {
        const c = document.querySelector('.chunk-host .step-card');
        return !!c && /STEP 3 OF 5/i.test(c.textContent || '');
      }
    },
    '03-inspect-intro.png': {
      chunk: 'inspection', says: 'the inspection opening card: the six rules, then how it works',
      at: () => !!document.querySelector('.chunk-host .insp-intro-steps') &&
        !document.querySelector('.chunk-host .insp-stage')
    },
    '04-inspect-scene.png': {
      chunk: 'inspection', says: 'a room being inspected, before any station is flagged',
      at: () => {
        const st = document.querySelector('.chunk-host .insp-stage');
        return !!st && !document.querySelector('.chunk-host .insp-zone.flagged, .chunk-host .insp-zone.is-on');
      }
    },
    '05-snapshot.png': {
      chunk: 'snapshot', says: 'a Snapshot question — no verdict on these, by design',
      at: () => {
        const c = document.querySelector('.chunk-host .q-card');
        return !!c && /OF 12/i.test(c.textContent || '');
      }
    },
    '06-warrant.png': {
      chunk: 'warrant', says: 'a Warrant question after answering: the verdict and the reason',
      at: () => {
        const c = document.querySelector('.chunk-host .q-card');
        return !!c && !!c.querySelector('.q-feedback');
      }
    },
    '07-exit.png': {
      chunk: 'exit', says: 'the marked exit question, before it is answered',
      at: () => !!document.querySelector('.chunk-host .q-card')
    },
    '08-selfeval.png': {
      chunk: 'selfeval', says: 'the final screen — compulsory, and the comment box comes to her'
    }
  },

  /* ═══════════════ J3 LESSON 1's BRIEF (17 Aug 2026) ═════════════════════ */
  'j3-01': {
    '01-briefing.png': {
      chunk: 'briefing', says: 'the opening card, including what January\'s options actually mean',
      at: () => {
        const d = document.querySelector('.chunk-host .dossier');
        if (!d) return false;
        const cta = d.querySelector('.dossier-cta');
        return !!cta && !cta.hidden && /the studio is open/i.test(d.textContent || '');
      }
    },
    '02-orientation.png': {
      chunk: 'orientation', says: 'an orientation step — what to look for, and the box to tick',
      at: () => {
        const c = document.querySelector('.chunk-host .step-card');
        return !!c && /STEP 3 OF 5/i.test(c.textContent || '');
      }
    },
    '03-code-intro.png': {
      chunk: 'code', says: 'the card that opens the Studio Code and explains the judging job',
      at: () => !!document.querySelector('.chunk-host .intro-card') &&
        !document.querySelector('.chunk-host .q-card')
    },
    '04-case.png': {
      chunk: 'code', says: 'a judged case: the verdict and the reason underneath it',
      at: () => {
        const c = document.querySelector('.chunk-host .q-card');
        return !!c && !!c.querySelector('.q-feedback');
      }
    },
    '05-portfolio.png': {
      chunk: 'portfolio', says: 'a Portfolio Zero question — no verdict on these, by design',
      at: () => {
        const c = document.querySelector('.chunk-host .q-card');
        return !!c && /OF 12/i.test(c.textContent || '');
      }
    },
    '06-compass.png': {
      chunk: 'compass', says: 'the Compass board — three pairs, nothing picked yet',
      at: () => {
        const c = document.querySelector('.chunk-host .cmp-card');
        return !!c && !c.classList.contains('cmp-result') && !c.querySelector('.cmp-side.on');
      }
    },
    '07-exit.png': {
      chunk: 'exit', says: 'the marked exit question, before it is answered',
      at: () => !!document.querySelector('.chunk-host .q-card')
    },
    '08-selfeval.png': {
      chunk: 'selfeval', says: 'the final screen — compulsory, and the comment box comes to her'
    }
  }
};

/* Pictures the briefs point at that this round deliberately does NOT re-take,
   each with the reason. Named here rather than left as a silent gap, because a
   capture list that quietly omits rows reads as "everything is fresh" when it
   is not (DFM 204's family: coverage is asserted, never assumed). */
const REUSED = {
  'j1-01/16-lessons-tab.png': 'the staff Lessons tab — teacher-side chrome, unchanged this round',
  'j1-03/07-rally-lobby.jpg': 'the Rally lobby is the TEACHER’s projector screen; a real-class re-shoot is a September upgrade (template §5)',
  'j1-05/07-press-lens.jpg': 'the Press Night teacher lens, unchanged this round'
};

module.exports = { DECK_SHOTS, COMPOSED, BRIEF_SHOTS, REUSED };
