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
      /* CROPPED TO ITS TOP (DFM 237b). The whole card is near-square, and on a
         stop slide under four or five bullets that comes out 83-141pt wide on a
         720pt canvas — a smudge. The heading plus ONE complete rating row is
         landscape, is the thing a teacher points at ("three sentences like this,
         and you pick one of these three"), and clears the floor with room. The
         J2/J3 rows are NOT cropped: their shots sit on their own bullets slides
         and already render 231-250pt, so cropping them would fix nothing and
         throw away a whole card the class can read.
      */
      cropTo: '.se-row .se-chips',
      says: 'the top of the compulsory How did it go? screen: its heading and the first rating row, untouched'
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
      /* CROPPED TO ITS TOP (DFM 237b). The whole card is near-square, and on a
         stop slide under four or five bullets that comes out 83-141pt wide on a
         720pt canvas — a smudge. The heading plus ONE complete rating row is
         landscape, is the thing a teacher points at ("three sentences like this,
         and you pick one of these three"), and clears the floor with room. The
         J2/J3 rows are NOT cropped: their shots sit on their own bullets slides
         and already render 231-250pt, so cropping them would fix nothing and
         throw away a whole card the class can read.
      */
      cropTo: '.se-row .se-chips',
      says: 'the top of the compulsory How did it go? screen: its heading and the first rating row, untouched'
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
      /* CROPPED TO ITS TOP (DFM 237b). The whole card is near-square, and on a
         stop slide under four or five bullets that comes out 83-141pt wide on a
         720pt canvas — a smudge. The heading plus ONE complete rating row is
         landscape, is the thing a teacher points at ("three sentences like this,
         and you pick one of these three"), and clears the floor with room. The
         J2/J3 rows are NOT cropped: their shots sit on their own bullets slides
         and already render 231-250pt, so cropping them would fix nothing and
         throw away a whole card the class can read.
      */
      cropTo: '.se-row .se-chips',
      says: 'the top of the compulsory How did it go? screen: its heading and the first rating row, untouched'
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
      /* CROPPED to the bottom of the first marquee card (DFM 237b): everything
         this shot CLAIMS sits above that line — the heading, the press passes, the
         two-rounds box, the studio card and a real listing — and what it drops is
         the greyed-out V2 note the selector already had to fight off once. */
      /* `.gal-marquee-grid` FIRST, and that word is load-bearing: the pupil's
         OWN studio card is also a `.gal-marquee-card` (it carries `.mine`) and
         sits ABOVE the marquee, so cropping to the first match cut the picture
         off before the marquee itself — the shot's own claim, gone, while the
         crop looked perfectly tidy. Caught by reading the picture (DFM 225b);
         a crop is a claim about a screen exactly as a shot is. */
      cropTo: '.gal-marquee-grid .gal-marquee-card',
      says: 'Press Night down to the first studio really on the marquee'
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
      /* CROPPED TO ITS TOP (DFM 237b). The whole card is near-square, and on a
         stop slide under four or five bullets that comes out 83-141pt wide on a
         720pt canvas — a smudge. The heading plus ONE complete rating row is
         landscape, is the thing a teacher points at ("three sentences like this,
         and you pick one of these three"), and clears the floor with room. The
         J2/J3 rows are NOT cropped: their shots sit on their own bullets slides
         and already render 231-250pt, so cropping them would fix nothing and
         throw away a whole card the class can read.
      */
      cropTo: '.se-row .se-chips',
      says: 'the top of the compulsory How did it go? screen: its heading and the first rating row, untouched'
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
  },

  /* ═════════════════ J2 LESSON 2 — THE TRANSLATION BUREAU ═══════════════════
     Five pictures, one per bullets slide that talks about a screen, and NONE on
     a stop slide — DFM 244(b)'s design rule, which is how these two decks clear
     the 150pt floor by construction rather than by cropping.
     Every predicate names a state that is true ONLY on the screen claimed: a
     desk with nothing matched yet, a build card with nothing placed yet, a
     console that has really stopped. Photographed a moment later, each one
     would be showing the class a screen they cannot act on. */
  'j2-02': {
    film: {
      chunk: 'film',
      selector: '.chunk-host .video-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'film') return false;
        return document.querySelectorAll('.chunk-host .vid-chapter').length >= 4 &&
          !!document.querySelector('.chunk-host video');
      },
      says: 'the film screen with its four chapter buttons'
    },
    desk: {
      chunk: 'bureau',
      selector: '.chunk-host .snap-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'bureau') return false;
        const c = document.querySelector('.chunk-host .snap-card');
        if (!c) return false;
        /* UNTOUCHED: all six blocks still on the desk, nothing snapped and
           nothing picked. A desk photographed half-cleared shows an answer. */
        return c.querySelectorAll('.snap-block').length === 6 &&
          !c.querySelector('.snap-block.snapped, .snap-block.picked, .snap-py.snapped');
      },
      /* CROPPED TO THE FIRST TWO PAIRS (DFM 237b/244b). The desk is two columns
         of six, so photographed entire it is 1572x2892 — 1:1.84 — and the deck
         scales one screenshot into about 250pt of width, which would put this
         on the board at 136pt: a ribbon, under the floor, teaching nothing.
         Keeping the top down to the second block is a COMPLETE thing in itself
         — both column headings and two pairs — and it is exactly what a teacher
         points at: "the blocks are on this side, the Python is on that side."
         The remaining four rows are the same shape repeated. */
      cropTo: '.snap-blocks .snap-list .snap-block:nth-of-type(2)',
      says: 'the top of the matching desk before anything is matched: the blocks on the left, the lines of Python on the right'
    },
    build: {
      chunk: 'build',
      selector: '.chunk-host .pyrun-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'build') return false;
        const c = document.querySelector('.chunk-host .pyrun-card[data-build="j2b-scoreboard"]');
        if (!c) return false;
        /* NOTHING PLACED YET, so the picture is the empty shape she meets, and
           RUN still asleep — which is this slide's own last bullet. */
        const run = c.querySelector('.pyrun-run');
        return c.querySelectorAll('.pyp-list .pyrun-line').length === 0 && !!run && run.disabled;
      },
      mustShow: /RUN my program/i,
      says: 'the build screen before a line is moved: the target, the lines, the empty program and RUN still asleep'
    },
    console: {
      chunk: 'build',
      selector: '.chunk-host .pyc',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'build') return false;
        const c = document.querySelector('.chunk-host .pyc.is-bad');
        const err = c && c.querySelector('.pyc-err');
        /* A RUN THAT REALLY STOPPED. `is-bad` is set only when Python raised,
           and the error box must carry Python's own words — the state this
           slide's fourth bullet is entirely about. Reached with the confused
           pupil's movers (--wrong), because the expert walker never fails. */
        return !!err && (err.textContent || '').trim().length > 8;
      },
      mustShow: /Error/i,
      says: "the console after a run that did not work: Python's own words, and a line underneath in plain English"
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
  },

  /* ═════════════════════ J3 LESSON 2 — THE CALL SHEET ═══════════════════════
     Three pictures, and the count is deliberate rather than short. The screens
     a J3 pupil could hesitate at this hour are the film player and the two
     shapes of build card; the closing How-did-it-go screen is the same one
     j3-01's deck already showed this class, and no slide here talks about it.
     **AND THE EXIT QUESTION IS NOT PHOTOGRAPHED**: DFM 37 says in as many words
     not to put the actual quiz questions in the deck, and this one is marked, so
     projecting its stem would hand the class the question. */
  'j3-02': {
    film: {
      chunk: 'film',
      selector: '.chunk-host .video-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'film') return false;
        return document.querySelectorAll('.chunk-host .vid-chapter').length >= 4 &&
          !!document.querySelector('.chunk-host video');
      },
      says: 'the film screen with its four chapter buttons'
    },
    build: {
      chunk: 'callsheet-a',
      selector: '.chunk-host .pyrun-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'callsheet-a') return false;
        /* BUILD 1 specifically, and untouched. It is the first build screen she
           ever meets, and the one that carries a typing gap with its own
           caption — the thing this slide's fourth bullet is about. */
        const c = document.querySelector('.chunk-host .pyrun-card[data-build="j3b-title"]');
        if (!c) return false;
        const run = c.querySelector('.pyrun-run');
        return c.querySelectorAll('.pyp-list .pyrun-line').length === 0 && !!run && run.disabled;
      },
      mustShow: /RUN my program/i,
      says: 'the first build before a line is moved: the target, the lines with their typing gap, and the empty program'
    },
    variable: {
      chunk: 'callsheet-b',
      selector: '.chunk-host .pyrun-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'callsheet-b') return false;
        /* BUILD 3, untouched — the first build in the lesson with an `=` line in
           its tray, which is exactly what this slide's bullets explain. */
        const c = document.querySelector('.chunk-host .pyrun-card[data-build="j3b-venue"]');
        if (!c) return false;
        const run = c.querySelector('.pyrun-run');
        return c.querySelectorAll('.pyp-list .pyrun-line').length === 0 && !!run && run.disabled;
      },
      mustShow: /venue/i,
      says: 'the build that makes a variable, before a line is moved: the = line still in the tray'
    }
  },

  /* ═══════════ J2 LESSON 3 — THE CHATBOT WORKSHOP (K42b, 14 Sep 2026) ═══════
     THE L3 GAP, CLOSED. Both Lesson 3 decks shipped without a single picture —
     five of their notes told the teacher to speak "with the picture up" on slides
     that carried none — and the spec for Lesson 4 made the rows for both L3s the
     first job of that build (§C0a.1). Every row below is a screen a pupil could
     hesitate at, named from the lesson's own chunk list and photographed only
     while its own predicate holds.
     TWO OF THESE SCREENS EXIST ONLY FOR A PUPIL WHO HAS A PARTNER, and a partner
     who is the preview's simulated one would put the word SIMULATED on a slide
     (the Press Night lesson, DFM 225b). So the capture stages a SECOND REAL
     preview pupil on the two-account rig — qa-swap-paired's machinery — and
     drives both: the photographed pupil opens the door first and genuinely
     waits (the waiting card, with Fred on it), the partner opens hers only once
     that picture is taken (the PARTNER FOUND card, with a real call sign), and
     the two then test each other's bots (the tester's seat). `mustNotShow`
     guards the two paired pictures against the simulated partner ever reaching
     a projector. */
  'j2-03': {
    film: {
      chunk: 'film-a',
      selector: '.chunk-host .video-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'film-a') return false;
        return document.querySelectorAll('.chunk-host .vid-chapter').length === 3 &&
          !!document.querySelector('.chunk-host video');
      },
      says: 'the film screen with its three chapter buttons'
    },
    asks: {
      chunk: 'training-1',
      selector: '.chunk-host .pyrun-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'training-1') return false;
        const c = document.querySelector('.chunk-host .pyrun-card[data-build="t1"]');
        if (!c) return false;
        /* THE PROGRAM HAS STOPPED AND IS WAITING — the reply space is on screen,
           live, and nothing has gone wrong yet. This is the state the slide's
           own THE ONE TO STRESS is about: a pupil who does not realise the
           program has stopped on purpose thinks it has crashed. */
        const reply = c.querySelector('.pyx-ask .pyx-reply');
        return !!reply && reply.offsetParent !== null && !reply.disabled &&
          !c.querySelector('.pyc.is-bad') && c.querySelectorAll('.pyx-row').length >= 1;
      },
      mustShow: /Your reply/i,
      says: 'the first training build, stopped and waiting: the bot has asked its question and the reply space has appeared'
    },
    console: {
      chunk: 'training-1',
      selector: '.chunk-host .pyc',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'training-1') return false;
        const c = document.querySelector('.chunk-host .pyc.is-bad');
        const err = c && c.querySelector('.pyc-err');
        /* A RUN THAT REALLY STOPPED, on the planted mistake (`naem` on line 2):
           `is-bad` is set only when Python raised, and the error box must carry
           Python's own words. The expert walker reaches this one itself — the
           worked example ships broken and is only put right after it has been
           run (walk-moves: ONLY AFTER IT HAS REALLY FAILED). */
        return !!err && (err.textContent || '').trim().length > 8;
      },
      mustShow: /Error/i,
      says: "the console after a run that did not work: Python's own words, and a line underneath in plain English"
    },
    tray: {
      chunk: 'training-3',
      selector: '.chunk-host .pyrun-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'training-3') return false;
        const c = document.querySelector('.chunk-host .pyrun-card[data-build="t3a"]');
        if (!c) return false;
        /* UNTOUCHED, AND POST-SHUFFLE (DFM 258): nothing placed, RUN asleep, and
           the tray's order is NOT the authored order — a tray that rendered in
           source order would fail this, which is what makes "shuffled" a claim
           the picture can back rather than a caption. */
        const run = c.querySelector('.pyrun-run');
        const sis = Array.from(c.querySelectorAll('.pyt-list .pyrun-line')).map(n => Number(n.getAttribute('data-si')));
        const ascending = sis.every((v, i) => i === 0 || v > sis[i - 1]);
        return c.querySelectorAll('.pyp-list .pyrun-line').length === 0 && !!run && run.disabled &&
          sis.length >= 5 && !ascending;
      },
      /* cropped to the two columns, for the same reason as j3-03's tray — and
         STARTED at them: this card carries six numbered steps and a brief above
         the columns, and whole it photographed at 1:1.5 */
      cropFrom: '.pyrun-cols',
      cropTo: '.pyt-list',
      mustShow: /RUN my bot|The lines/i,
      says: 'the third training build before a line is moved: the lines shuffled, the gaps in them, and the empty program'
    },
    plan: {
      chunk: 'mybot',
      selector: '.chunk-host .pye-plan',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'mybot') return false;
        const c = document.querySelector('.chunk-host .pye-plan');
        const start = c && c.querySelector('.pye-start');
        return !!c && c.querySelectorAll('.pye-plan-list li').length === 3 &&
          !!start && start.offsetParent !== null && !!c.querySelector('video');
      },
      mustShow: /Start writing/i,
      says: 'the PLAN face of Your bot: the goal, the film, and the three jobs, before anything can be typed'
    },
    bench: {
      chunk: 'mybot',
      selector: '.chunk-host .pye-bench',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'mybot') return false;
        const c = document.querySelector('.chunk-host .pye-bench');
        const ta = c && c.querySelector('.pye-code');
        /* EMPTY: the box before she has typed a character, the four ready-made
           lines under it, the three jobs along the top, nothing ticked */
        return !!ta && !String(ta.value || '').trim() &&
          c.querySelectorAll('.pyf-item').length === 3 &&
          c.querySelectorAll('.pyp-chip').length === 4 &&
          !c.querySelector('.pyf-item.is-matched, .pyf-item.is-notyet, .pyf-item.is-stopped');
      },
      mustShow: /RUN my bot/i,
      says: 'the BENCH face: the three jobs along the top, the empty typing box, and the four ready-made lines under it'
    },
    wait: {
      chunk: 'chatswap',
      selector: '.chunk-host .pair-wait',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'chatswap') return false;
        const w = document.querySelector('.chunk-host .pair-wait');
        /* GENUINELY WAITING, with Fred mounted: his picture is in the card and
           his opening line is on it. The partner's door is opened only after
           this picture exists (capture-teacher-layer's paired staging). */
        return !!w && !!w.querySelector('.sideshow .ss-img') && !!w.querySelector('.sideshow .ss-line') &&
          !!(w.querySelector('.pw-status') || {}).textContent;
      },
      mustShow: /Waiting for a partner/i,
      mustNotShow: /simulated|pixel/i,
      says: 'the waiting card while the website finds a partner, with Fred on it'
    },
    matched: {
      chunk: 'chatswap',
      selector: '.pair-pop .badge-pop-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'chatswap') return false;
        const pop = document.querySelector('.pair-pop.show');
        const mine = pop && pop.querySelector('.pk-mysign');
        /* A REAL PARTNER: her own call sign from the J2 pool, and no simulated
           partner anywhere on the card */
        return !!mine && /^(Spanner|Chisel|Hammer|Pliers|Drill|Clamp|Ruler|Mallet) \d$/.test((mine.textContent || '').trim()) &&
          !/simulated|pixel/i.test(pop.textContent || '');
      },
      mustShow: /PARTNER FOUND/i,
      mustNotShow: /simulated|pixel/i,
      says: "the PARTNER FOUND card: her own call sign, her partner's, and the button that opens the Swap"
    },
    tester: {
      chunk: 'chatswap',
      selector: '.chunk-host .swap-test',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'chatswap') return false;
        const c = document.querySelector('.chunk-host .swap-test');
        const reply = c && c.querySelector('.pyx-ask .pyx-reply');
        /* IN THE TESTER'S SEAT, mid-conversation: the partner's bot has spoken
           and asked, and the reply space is live */
        return !!reply && reply.offsetParent !== null && !reply.disabled &&
          c.querySelectorAll('.pyx-row').length >= 1;
      },
      mustShow: /tester/i,
      mustNotShow: /simulated|pixel/i,
      says: "the tester's seat: a partner's bot running on her screen, waiting for her answer"
    },
    extras: {
      chunk: 'extras',
      selector: '.chunk-host .pyrun-hub',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'extras') return false;
        const h = document.querySelector('.chunk-host .pyrun-hub');
        return !!h && h.querySelectorAll('.pyrun-job').length === 3 &&
          !h.querySelector('.pyrun-job-tick') && !!h.querySelector('.pyrun-finish');
      },
      mustShow: /Running out of time/i,
      says: 'the extra-jobs screen, untouched, with the button that carries her on to the rest of the lesson'
    }
  },

  /* ═══════════ J3 LESSON 3 — THE PLAYLIST ENGINE (K42b, 14 Sep 2026) ════════
     Same law, same rig. The Match is the paired set-piece here and it comes
     EARLY, so the partner is staged before the walk reaches it: the photographed
     pupil waits (Margo on the card), the partner arrives (a real Director/Editor
     call sign). The two ROUND pictures the spec also named were taken and then
     withdrawn — see the note where they stood. The partner-driver's hold on the
     first lock stays in the capture, unused, for the day he rules a round may
     be shown. */
  'j3-03': {
    film: {
      chunk: 'film-a',
      selector: '.chunk-host .video-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'film-a') return false;
        return document.querySelectorAll('.chunk-host .vid-chapter').length === 4 &&
          !!document.querySelector('.chunk-host video');
      },
      says: 'the first film screen with its four chapter buttons'
    },
    wait: {
      chunk: 'match',
      selector: '.chunk-host .pair-wait',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'match') return false;
        const w = document.querySelector('.chunk-host .pair-wait');
        return !!w && !!w.querySelector('.sideshow .ss-img') && !!w.querySelector('.sideshow .ss-line') &&
          !!(w.querySelector('.pw-status') || {}).textContent;
      },
      mustShow: /Waiting for somebody to play against/i,
      mustNotShow: /simulated|pixel/i,
      says: 'the waiting card while the website finds somebody to play against, with Margo on it'
    },
    matched: {
      chunk: 'match',
      selector: '.pair-pop .badge-pop-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'match') return false;
        const pop = document.querySelector('.pair-pop.show');
        const mine = pop && pop.querySelector('.pk-mysign');
        return !!mine && /^(Director|Editor|Producer|Camera|Sound|Lighting|Writer|Designer) \d$/.test((mine.textContent || '').trim()) &&
          !/simulated|pixel/i.test(pop.textContent || '');
      },
      mustShow: /MATCHED/,
      mustNotShow: /simulated|pixel/i,
      says: "the card that says a partner has been found: her own call sign, her opponent's, and the button that starts the Match"
    },
    /* THE TWO MATCH-ROUND PICTURES THE SPEC NAMED ARE WITHDRAWN (14 Sep 2026,
       DFM 197 — recorded, not patched quietly). §C0a.1 asked for "a commit-locked
       round and a reveal round with both predictions side by side". Both were
       captured on the two-account rig and both did what a picture of a round
       must do: they showed that round's code, its answer buttons with the right
       one lit, and — on the reveal — what Python really printed and the
       teaching line ("Counting starts at 0, so playlist[0] is Opening Night and
       playlist[1] is Curtain Up"), on a slide the teacher shows BEFORE the Match
       is played. That is DFM 37 in pixels: "do not show the actual quiz
       questions in the deck." The Match is the lesson's six questions, and a
       reveal is a question with its answer under it. No crop keeps the state
       and loses the round — the state IS the round. So the deck carries the
       waiting card and the MATCHED card, and the round itself stays off the
       board; the two withdrawn pictures are filed for his look at
       qa-l2-l5-review/l4-build/l3-deck-shots/withdrawn/, and whether any round
       may be shown is his call. */
    filmb: {
      chunk: 'film-b',
      selector: '.chunk-host .video-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'film-b') return false;
        return document.querySelectorAll('.chunk-host .vid-chapter').length === 3 &&
          !!document.querySelector('.chunk-host video');
      },
      says: 'the second film screen with its three chapter buttons'
    },
    nowplaying: {
      chunk: 'assembly-1',
      selector: '.chunk-host .pyrun-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'assembly-1') return false;
        const c = document.querySelector('.chunk-host .pyrun-card[data-build="a1"]');
        if (!c) return false;
        /* AFTER ITS RUN: the verdict says IT WORKS and the console really carries
           the Now Playing heading and the three titles — the shape of every
           playlist engine in the hour, printed by Python rather than by a caption */
        const v = c.querySelector('.pyrun-verdict.is-matched');
        const con = c.querySelector('.pyc');
        return !!v && !v.hidden && !!con && /Now Playing - Top 3/.test(con.textContent || '') &&
          /Opening Night/.test(con.textContent || '');
      },
      mustShow: /Now Playing/,
      says: 'the first build after its run: the six lines, and the console printing Now Playing and three titles'
    },
    tray: {
      chunk: 'assembly-3',
      selector: '.chunk-host .pyrun-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'assembly-3') return false;
        const c = document.querySelector('.chunk-host .pyrun-card[data-build="a3"]');
        if (!c) return false;
        const run = c.querySelector('.pyrun-run');
        const sis = Array.from(c.querySelectorAll('.pyt-list .pyrun-line')).map(n => Number(n.getAttribute('data-si')));
        const ascending = sis.every((v, i) => i === 0 || v > sis[i - 1]);
        return c.querySelectorAll('.pyp-list .pyrun-line').length === 0 && !!run && run.disabled &&
          sis.length === 6 && !ascending;
      },
      /* THE TWO COLUMNS, AND ONLY THEM (DFM 237b): whole, the card is 1572x2360
         — 1:1.5, a 166pt ribbon on the slide. The columns are the complete
         thing a teacher points at ("the lines on this side, your program on
         that side"); the goal and brief above them are the slide's own words,
         and RUN and the idle console below are the same on every build card. */
      cropFrom: '.pyrun-cols',
      cropTo: '.pyt-list',
      mustShow: /RUN my program|The lines/i,
      says: 'the third build before a line is moved: six lines shuffled, the gaps in them, and the empty program'
    },
    plan: {
      chunk: 'engine',
      selector: '.chunk-host .pye-plan',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'engine') return false;
        const c = document.querySelector('.chunk-host .pye-plan');
        const start = c && c.querySelector('.pye-start');
        return !!c && c.querySelectorAll('.pye-plan-list li').length === 5 &&
          !!start && start.offsetParent !== null;
      },
      mustShow: /Start writing/i,
      says: 'the PLAN face of the engine: the goal and the five jobs in order, before anything can be typed'
    },
    bench: {
      chunk: 'engine',
      selector: '.chunk-host .pye-bench',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'engine') return false;
        const c = document.querySelector('.chunk-host .pye-bench');
        const ta = c && c.querySelector('.pye-code');
        return !!ta && !String(ta.value || '').trim() &&
          c.querySelectorAll('.pyf-item').length === 5 &&
          !!c.querySelector('.py-help-row') &&
          !c.querySelector('.pyf-item.is-matched, .pyf-item.is-notyet, .pyf-item.is-stopped');
      },
      mustShow: /RUN my engine/i,
      says: 'the BENCH face: the five jobs along the top, the empty typing box with its line numbers, and the free help row'
    },
    extras: {
      chunk: 'extras',
      selector: '.chunk-host .pyrun-hub',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'extras') return false;
        const h = document.querySelector('.chunk-host .pyrun-hub');
        return !!h && h.querySelectorAll('.pyrun-job').length === 3 &&
          !h.querySelector('.pyrun-job-tick') && !!h.querySelector('.pyrun-finish');
      },
      mustShow: /Leave the extra jobs/i,
      says: 'the extra-jobs screen, untouched, with the button that carries her on to the rest of the lesson'
    }
  },
  /* ─────────────────────────── J2 LESSON 4 (14 Sep 2026) ───────────────────────────
     Every row is a screen a LONE pupil really stands on, taken only while its
     predicate holds. No picture shows a finished build (DFM 37 in pixels): the
     path check on the board is the FILM'S own frame of the corridor room
     (COMPOSED below), never a pupil's room after a run. */
  'j2-04': {
    briefing: {
      chunk: 'adventure',
      selector: '.chunk-host .dossier',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'adventure') return false;
        const d = document.querySelector('.chunk-host .dossier');
        const cta = d && d.querySelector('.dossier-cta');
        /* the card fully typed out, the canteen room played through at the
           bottom (its scripted demo has said everything), Start the film up */
        return !!d && d.querySelectorAll('.dossier-demo .pyx-row').length >= 6 &&
          !!cta && !cta.hidden && cta.offsetParent !== null;
      },
      /* the demo (six lines at 1.5 s each) is still playing when Start the film
         appears, and the walk would press it first — so the walk holds while
         the demo is mid-play on this card */
      hold: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'adventure') return false;
        const d = document.querySelector('.chunk-host .dossier');
        const n = d ? d.querySelectorAll('.dossier-demo .pyx-row').length : 0;
        return !!d && !!d.querySelector('.dossier-demo') && n < 6;
      },
      /* the demo panel and its note only — the card's own paragraphs above and
         below are the slide's words, and a 2,300px column reads as nothing */
      cropFrom: '.dossier-demo',
      cropTo: '.dossier-demo',
      mustShow: /trolley/i,
      says: 'the opening card\'s demo once it has played through: the canteen room, and the note under it'
    },
    film: {
      chunk: 'film-a',
      selector: '.chunk-host .video-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'film-a') return false;
        return document.querySelectorAll('.chunk-host .vid-chapter').length === 3 &&
          !!document.querySelector('.chunk-host video');
      },
      says: 'the film screen with its three chapter buttons'
    },
    console: {
      chunk: 'training-1',
      selector: '.chunk-host .pyrun-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'training-1') return false;
        const c = document.querySelector('.chunk-host .pyrun-card[data-build="t1"]');
        if (!c) return false;
        /* the planted `=` has been RUN and Python has stopped: the red console
           with its plain line, and NOT WORKING YET — before the gap is fixed */
        const con = c.querySelector('.pyc.is-bad');
        const v = c.querySelector('.pyrun-verdict.is-notyet');
        const gap = c.querySelector('.pyw-list .pyrun-blank');
        return !!con && !!c.querySelector('.pyc-err') && !!v && !v.hidden && !!gap && gap.value.trim() === '=';
      },
      cropFrom: '.pyw-prog',
      cropTo: '.pyrun-verdict',
      mustShow: /Error/,
      says: 'the first build after RUN with the planted mistake: the room, Python stopped in red, the plain line under it, and NOT WORKING YET'
    },
    plan: {
      chunk: 'myroom',
      selector: '.chunk-host .pye-plan',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'myroom') return false;
        const c = document.querySelector('.chunk-host .pye-plan');
        const start = c && c.querySelector('.pye-start');
        const words = c ? Array.from(c.querySelectorAll('.pth-words input')) : [];
        return !!c && c.querySelectorAll('.pye-plan-list li').length === 5 &&
          words.length === 2 && words.every(i => !i.value) &&
          !!start && start.offsetParent !== null;
      },
      cropFrom: '.pye-plan-h',
      cropTo: '.pye-start',
      mustShow: /Start writing/i,
      says: 'the PLAN face of her room: the five jobs in order, the two empty word boxes, and Start writing'
    },
    bench: {
      chunk: 'myroom',
      selector: '.chunk-host .pye-bench',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'myroom') return false;
        const c = document.querySelector('.chunk-host .pye-bench');
        const ta = c && c.querySelector('.pye-code');
        return !!ta && !String(ta.value || '').trim() &&
          !!c.querySelector('.pth-words-pinned') &&
          c.querySelectorAll('.pyf-item').length === 5 &&
          c.querySelectorAll('.pyp-chip').length >= 3 &&
          !c.querySelector('.pyf-item.is-matched, .pyf-item.is-notyet, .pyf-item.is-stopped');
      },
      cropTo: '.pyp-palette',
      mustShow: /RUN my room/i,
      says: 'the BENCH face: her two words pinned, the five jobs all not yet, the empty typing box, and the ready-made lines beside it'
    },
    play: {
      chunk: 'classadventure',
      selector: '.chunk-host .rly-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'classadventure') return false;
        const c = document.querySelector('.chunk-host .rly-card');
        if (!c) return false;
        /* a room mid-play: the strip, the room's own lines, the player's word,
           and the door note — a whole exchange, before the next room loads */
        return !!c.querySelector('.rly-strip .rly-room') &&
          c.querySelectorAll('.pyx-row.is-bot').length >= 2 &&
          !!c.querySelector('.pyx-row.is-user');
      },
      mustShow: /Room \d/,
      mustNotShow: /simulated|pixel/i,
      says: 'one room of the class adventure playing: the strip naming the room, its story, and the word the player typed'
    },
    end: {
      chunk: 'classadventure',
      selector: '.chunk-host .rly-end',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'classadventure') return false;
        const c = document.querySelector('.chunk-host .rly-end');
        return !!c && c.querySelectorAll('.rly-rooms .rly-room').length >= 3 &&
          !!c.querySelector('.rly-again') && !!c.querySelector('.rly-done');
      },
      mustShow: /THE END/,
      says: 'the end card: THE END, the rooms she went through, Play again, and the way on'
    },
    extras: {
      chunk: 'extras',
      selector: '.chunk-host .pyrun-hub',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'extras') return false;
        const hub = document.querySelector('.chunk-host .pyrun-hub');
        return !!hub && hub.querySelectorAll('.pyrun-job').length === 4 && !hub.querySelector('.pyrun-job-tick');
      },
      mustShow: /Click here to finish the rest of the lesson/i,
      says: 'the extra jobs screen, untouched: four jobs, none ticked, and the button that carries her on'
    }
  },

  /* ─────────────────────────── J3 LESSON 4 (14 Sep 2026) ─────────────────────────── */
  'j3-04': {
    boxoffice: {
      chunk: 'floor',
      selector: '.chunk-host .dossier',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'floor') return false;
        const d = document.querySelector('.chunk-host .dossier');
        const cta = d && d.querySelector('.dossier-cta');
        /* the twelve-order program has scrolled past at the bottom of the card
           (all seven demo rows in), and Start the film is up */
        return !!d && d.querySelectorAll('.dossier-demo .pyx-row').length >= 7 &&
          !!cta && !cta.hidden && cta.offsetParent !== null;
      },
      /* the demo panel and its note only — the card's own paragraphs above and
         below are the slide's words, and a 2,300px column reads as nothing */
      cropFrom: '.dossier-demo',
      cropTo: '.dossier-demo',
      mustShow: /Aoife x 2/i,
      says: 'the opening card\'s demo once it has scrolled past: the twelve-order program, and the note under it'
    },
    film: {
      chunk: 'film-a',
      selector: '.chunk-host .video-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'film-a') return false;
        return document.querySelectorAll('.chunk-host .vid-chapter').length === 3 &&
          !!document.querySelector('.chunk-host video');
      },
      says: 'the film screen with its three chapter buttons'
    },
    meter: {
      chunk: 'machine-1',
      selector: '.chunk-host .pyrun-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'machine-1') return false;
        const c = document.querySelector('.chunk-host .pyrun-card[data-build="m1"]');
        if (!c) return false;
        /* the meter is on the card from the start; taken BEFORE the gap is
           filled, so the missing word never reaches the board (DFM 37) */
        const gap = c.querySelector('.pyw-list .pyrun-blank');
        return !!c.querySelector('.fac-meter .fac-meter-bar') && !!gap && !gap.value.trim();
      },
      cropFrom: '.fac-meter',
      cropTo: '.fac-meter',
      mustShow: /The length meter/i,
      says: 'the length meter (the bloat meter of the spec, renamed by the L4 cold read) under the first build: two bars, 24 lines against 15, and the sentence that says both print the same'
    },
    floor: {
      chunk: 'machine-3',
      selector: '.chunk-host .pyrun-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'machine-3') return false;
        const c = document.querySelector('.chunk-host .pyrun-card[data-build="m3"]');
        if (!c) return false;
        const v = c.querySelector('.pyrun-verdict.is-matched');
        return !!v && !v.hidden && c.querySelectorAll('.fac .fac-order').length === 3 &&
          !!c.querySelector('.fac-reject');
      },
      /* the FLOOR only — the machine above it is her finished build (DFM 37) */
      cropFrom: '.fac',
      cropTo: '.fac',
      mustShow: /matches/i,
      says: 'the factory floor after a run: three product cards, each stamped matches, and the empty reject bin under them'
    },
    spec: {
      chunk: 'factory',
      selector: '.chunk-host .pye-plan',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'factory') return false;
        const c = document.querySelector('.chunk-host .pye-plan');
        const start = c && c.querySelector('.pye-start');
        return !!c && c.querySelectorAll('.fac-spec tbody tr').length === 2 &&
          c.querySelectorAll('.pye-plan-list li').length === 2 &&
          !!start && start.offsetParent !== null;
      },
      /* from the spec card down: the two jobs, the brief, Start building — the
         film above them is on its own slide */
      cropFrom: '.fac-spec',
      cropTo: '.pye-start',
      mustShow: /Start building/i,
      says: 'the PLAN face of her factory: the spec card with its two rows, the two machines it needs, and Start building'
    },
    bench: {
      chunk: 'factory',
      selector: '.chunk-host .pye-bench',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'factory') return false;
        const c = document.querySelector('.chunk-host .pye-bench');
        const ta = c && c.querySelector('.pye-code');
        return !!ta && !String(ta.value || '').trim() &&
          c.querySelectorAll('.pyf-item').length === 2 &&
          !!c.querySelector('.fac-spec') &&
          !c.querySelector('.pyf-item.is-matched, .pyf-item.is-notyet, .pyf-item.is-stopped');
      },
      cropTo: '.pye-host',
      mustShow: /RUN my program/i,
      says: 'the BENCH face: the two machines saying not yet, the compact spec, and the empty typing box'
    },
    wait: {
      chunk: 'rush',
      selector: '.chunk-host .pair-wait',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'rush') return false;
        const w = document.querySelector('.chunk-host .pair-wait');
        return !!w && !!w.querySelector('.sideshow .ss-img') && !!w.querySelector('.sideshow .ss-line') &&
          !!(w.querySelector('.pw-status') || {}).textContent;
      },
      mustShow: /Waiting for a partner/i,
      mustNotShow: /simulated|pixel/i,
      says: 'the waiting card while the website finds a partner, with Unit 7 on it'
    },
    orders: {
      chunk: 'rush',
      selector: '.chunk-host .ord-form-card',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'rush') return false;
        const c = document.querySelector('.chunk-host .ord-form-card');
        if (!c) return false;
        const inputs = Array.from(c.querySelectorAll('input'));
        return c.querySelectorAll('.ord-row').length === 3 && inputs.length >= 6 && inputs.every(i => !i.value) &&
          !!c.querySelector('.ord-send') && !/simulated|pixel/i.test(c.textContent || '');
      },
      mustShow: /Send my orders/i,
      mustNotShow: /simulated|pixel/i,
      says: "the order form once she has a partner: three empty rows, a name and a number of seats each, and Send my orders"
    },
    extras: {
      chunk: 'extras',
      selector: '.chunk-host .pyrun-hub',
      at: () => {
        const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
        if (!s || s.id !== 'extras') return false;
        const hub = document.querySelector('.chunk-host .pyrun-hub');
        return !!hub && hub.querySelectorAll('.pyrun-job').length === 4 && !hub.querySelector('.pyrun-job-tick');
      },
      mustShow: /Click here to finish the rest of the lesson/i,
      says: 'the extra jobs screen, untouched: four jobs, none ticked, and the button that carries her on'
    }
  }
};

/* ═══════════════════ THE COMPOSED STILLS (spec §2 per lesson) ══════════════
   `from` names where the pictures come from IN THE LESSON'S OWN CONTENT, so the
   gate can check the deck is showing the class a picture the lesson really
   owns rather than one somebody dropped in a folder. */
const COMPOSED = {
  /* THE LESSON 4 PATH CHECK AND REJECT BIN ARE THE FILMS' OWN FRAMES (14 Sep
     2026). Both surfaces exist on a pupil's card only after a run of a FINISHED
     build, which is exactly the picture DFM 37 forbids on the board. The films
     draw the same surfaces with the platform's own renderer on the HOUSE room
     and the spec's own reference machines (DFM 210), so the board shows the
     film's frame — the caption band cropped away, the surface whole. The
     timestamps were chosen by eye from the part files; the md5 rides with each
     frame so a re-recorded film invalidates its own still. */
  'j2-04': {
    pathcheck: {
      kind: 'film-frame',
      src: 'assets/video/j2/j2-l4-b.mp4',
      /* chosen by eye: the whole table in view, the banana row outlined — two
         rows say no door — and the film's caption clear of the crop */
      tSeconds: 158.0,
      crop: { x: 88, y: 85, w: 1104, h: 396 },
      says: 'the path check as the film draws it for the corridor room with its else door line missing: three plays, two of them with no door'
    }
  },
  'j3-04': {
    reject: {
      kind: 'film-frame',
      src: 'assets/video/j3/j3-l4-b.mp4',
      /* chosen by eye: the cost machine that PRINTED — four cards stamped
         nothing came back, the bin's one-sentence collapse ("Every product came
         back as None…"), and the one pair, None beside 8; the caption clear */
      tSeconds: 140.0,
      crop: { x: 88, y: 85, w: 1104, h: 396 },
      says: 'the reject bin as the film draws it for a cost machine that printed instead of returning: every product None, the one-sentence explanation, and your product beside what the spec wanted'
    }
  },
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
      /* `is-flagged` is the engine's own class, read out of engines.js rather than
         guessed — the first version tested `.flagged` and `.is-on`, neither of
         which exists, so it would have accepted a room with flags already on it */
      at: () => {
        const st = document.querySelector('.chunk-host .insp-stage');
        return !!st && !document.querySelector('.chunk-host .insp-zone.is-flagged');
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
      /* ── .q-feedback EXISTS FROM THE START, HIDDEN, AND THAT COST THIS ROW A
         RUN. `engines.js` renders `<div class="q-feedback" hidden></div>` with the
         question, so "does a feedback box exist" is true on an unanswered card —
         a predicate that looks falsifiable and is not, which is the exact fault
         this file's own header warns about. It shipped a picture of an UNANSWERED
         question under a caption promising the verdict and the reason, and every
         machine passed it; my own eyes on the contact sheet caught it. So the test
         is now the three things that are only true AFTER a click: the box is not
         hidden, it carries real words, and the card knows it has been answered. */
      at: () => {
        const c = document.querySelector('.chunk-host .q-card');
        if (!c) return false;
        const fb = c.querySelector('.q-feedback');
        return !!fb && !fb.hidden && (fb.textContent || '').trim().length > 20;
      }
    },
    '07-exit.png': {
      chunk: 'exit', says: 'the marked exit question, before it is answered',
      /* BEFORE it is answered has to be tested, or the caption is a hope */
      at: () => {
        const c = document.querySelector('.chunk-host .q-card');
        if (!c) return false;
        const fb = c.querySelector('.q-feedback');
        return (!fb || fb.hidden) && !c.querySelector('.q-opt[disabled]');
      }
    },
    '08-selfeval.png': {
      chunk: 'selfeval', says: 'the final screen, untouched — compulsory, and the comment box comes to the teacher',
      at: () => {
        const c = document.querySelector('.chunk-host .se-card');
        return !!c && !c.querySelector('.se-chip.on, .se-chip.sel, .se-chip[aria-pressed="true"]');
      }
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
      /* see j2-01's 06-warrant row: the feedback box is in the DOM from the start,
         hidden, so only "not hidden AND carrying words" proves a case was judged */
      at: () => {
        const c = document.querySelector('.chunk-host .q-card');
        if (!c) return false;
        const fb = c.querySelector('.q-feedback');
        return !!fb && !fb.hidden && (fb.textContent || '').trim().length > 20;
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
      /* BEFORE it is answered has to be tested, or the caption is a hope */
      at: () => {
        const c = document.querySelector('.chunk-host .q-card');
        if (!c) return false;
        const fb = c.querySelector('.q-feedback');
        return (!fb || fb.hidden) && !c.querySelector('.q-opt[disabled]');
      }
    },
    '08-selfeval.png': {
      chunk: 'selfeval', says: 'the final screen, untouched — compulsory, and the comment box comes to the teacher',
      at: () => {
        const c = document.querySelector('.chunk-host .se-card');
        return !!c && !c.querySelector('.se-chip.on, .se-chip.sel, .se-chip[aria-pressed="true"]');
      }
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
