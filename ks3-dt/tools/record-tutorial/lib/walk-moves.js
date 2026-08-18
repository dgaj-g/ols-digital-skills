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
  if (q('.pyrun-card')) {
    if (vis(q('.pyrun-verdict .primary-btn'))) return { kind: 'pyrun-next' };
    if (q('.pyt-list .pyrun-line')) return { kind: 'pyrun-place' };
    const blank = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank'))
      .filter(vis).find(i => !i.value);
    if (blank) return { kind: 'pyrun-blank', ph: blank.getAttribute('data-key') || '' };
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
        .filter(vis).filter(e => !e.value);
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
    .filter(vis).filter(e => !e.value);
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
    const key = (window.App && App.state && App.state.localKeys && App.state.localKeys[bid]) || null;
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
    const any = document.querySelector('.pyt-list .pyrun-line');
    if (any) any.click();
  },
  'pyrun-blank': () => {
    const card = document.querySelector('.pyrun-card');
    const bid = card && card.getAttribute('data-build');
    const key = (window.App && App.state && App.state.localKeys && App.state.localKeys[bid]) || null;
    const inp = Array.from(document.querySelectorAll('.pyp-list .pyrun-blank')).find(i => !i.value);
    if (!inp) return;
    const k = inp.getAttribute('data-key');
    const v = (key && key.blanks && key.blanks[k] != null) ? String(key.blanks[k]) : 'x';
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  },
  'pyrun-run': () => { const b = document.querySelector('.pyrun-run:not([disabled])'); if (b) b.click(); },
  'pyrun-next': () => { const b = document.querySelector('.pyrun-verdict .primary-btn'); if (b) b.click(); },

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
    const b = Array.from(document.querySelectorAll('.chunk-host button'))
      .find(x => /check|lock|submit/i.test(x.textContent) && !x.disabled);
    if (b) b.click();
  },
  input: () => {
    const vis = e => e && e.offsetParent !== null && !e.disabled;
    const t = Array.from(document.querySelectorAll('.chunk-host textarea, .chunk-host input[type=text], .chunk-host input[type=number], .chunk-host input:not([type])'))
      .filter(vis).filter(e => !e.value)[0];
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
      if (t.type === 'number' || /count|score|number|fish/.test(hint)) return '3';
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

/* how long each move needs before the screen has settled enough to re-detect */
const SETTLE = {
  badge: 600, 'dossier-cta': 1100, confirm: 700, tour: 600, 'q-opt': 900, 'q-next': 700,
  'snap-pick': 350, 'snap-try': 750, 'snap-done': 700,
  'pyrun-place': 260, 'pyrun-blank': 220, 'pyrun-run': 2600, 'pyrun-next': 700,
  'case-pin': 900, 'case-log': 400, 'case-close': 1200, 'case-stamped': 700, 'case-wait': 700,
  'std-expand': 700, 'std-run': 700, 'std-outcome': 900, 'std-ready': 1200,
  parsons: 400, input: 400, loading: 700, button: 700, vault: 900, 'hold-sign': 1800,
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

module.exports = { detectKind, whereAmI, chunkNow, MOVES, SETTLE, ACTIONS };
