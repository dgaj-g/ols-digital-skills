# The Glass Jotter — OLS Maths M2 Revision Platform

Built from inbox issues #24 (Angles) and #25 (Algebra) — Mary McElroy, Maths, J3, CCEA M2,
max one period per activity. Plus Damien's platform brief: login-gated class dashboard with
teacher-controlled activity tiles, a solution to the "you can't see their working" scepticism,
many worked-example animations, feedback, and progress tracking. This file is the build contract;
HANDOVER.md (written at the end) records what shipped.

## 1. The product in one paragraph

A login-gated (Path B, C2k Google sign-in) Maths platform styled as a prize-winning pupil's
exercise book ("FAIR COPY" identity). Pupils open their class's link, land on a bookshelf of
exercise-book tiles (Angles, Algebra — extensible), and inside each activity they first watch
animated worked examples (the "method movies"), then solve questions **line by line in a digital
jotter page** — declaring each balance-rule move in the margin, choosing CCEA-phrased reasons for
every angle step. The engine marks like a CCEA examiner: method marks per line, follow-through
credit, any valid route accepted, correct-answer-with-no-working flagged amber, two attempts with
attempt 1 preserved struck-through. The teacher's markbook shows the **Working Wall** (whole class
× all questions, live), per-pupil **Jotter Pages** with one-tap tick↔cross override, the
**Marking Pile** (named misconception clusters + starter export), and a **Same-Question Sweep**.
The app pre-marks; the teacher stays the marker. That is the answer to the department's scepticism.

## 2. Naming

- Platform: **The Glass Jotter** — "every pupil's working, visible through the glass".
- Pupil working pane: the **Jotter Page**. Teacher views: **Working Wall**, **Jotter Page**
  (drill-down), **Marking Pile**, **Same-Question Sweep**.
- Activities: "Angles" (The Geometry Set, set-square teal) and "Algebra" (Ink & Balance, quill plum).
- Repo slug: `maths/glass-jotter/`. Deployed name for Apps Script project: "OLS Maths — Glass Jotter".

## 3. Architecture (Path B, GG-model, execute as: ME)

- **Server**: bound script of a Google Sheet. Deploy: Web app, Execute as **Me**, access
  **Anyone within c2ken.net** (the sign-in gate). Identity via `Session.getActiveUser().getEmail()`.
- **Tabs**: `Config` (staffPasscode; `classes` JSON `[{name, acts:{angles:bool,algebra:bool}}]`;
  `name:<email>` rows) · `Data` (one row per pupil per activity:
  `Class | Email | Name | Act | Summary | State | Updated`, all `setNumberFormat('@')`).
- **API** (all return primitive-coerced objects; LockService on writes):
  `apiWhoAmI` · `apiHello{classCode}` → {email, name, acts, summaries} ·
  `apiSave{classCode, act, state, summary}` (state = full jotter JSON ≤40k chars, summary = small
  rollup for the Wall) · `apiLoad{classCode, act}` · `apiSetName{classCode, name}` ·
  `apiAdmin{passcode, sub:…}` with subs `classes / addClass / deleteClass / setActs (the tickboxes)
  / wall {className, act} (summaries only, fast) / jotter {className, act, email} (full state)
  / override {className, act, email, q, idx, val}`.
- **Client transport**: `OLS_TRANSPORT.call(p)` shim (google.script.run) when served by Apps
  Script; offline localStorage stub otherwise with **demo mode** — staff passcode `demo` seeds a
  realistic fake class (Irish first names, varied genuine misconceptions) so the Working Wall can
  be demonstrated to the department with no live class. Offline parity mimics every server call.
- **Assembler**: `server/build-pathb.js` (GG/Mon Carnet lineage): inlines shared+activity CSS, body,
  all JS files in order, QR lib, transport shim, OLS_BOOT scriptlet; rewrites asset URLs to absolute
  github.io; re-adds the intro loader with absolute mp4 URLs; pure-ASCII guard (`\uXXXX`/`&#N;`);
  outputs `server/Code.gs` + `server/Index.html`.
- The static github.io build (`/maths/glass-jotter/`) is the always-available offline/preview tier
  (localStorage only, no identity), per playbook tiers.

## 4. Pupil experience

1. **Cover (login/landing)**: navy buckram book cover, gold-foil "MATHEMATICS — M2 REVISION",
   crest, printed cream NAME/CLASS label = the form (name asked once, ever; class from `?class=`).
   STAFF oval stamp bottom-right → teacher panel. 3D page-turn into the shelf.
2. **The Shelf (dashboard)**: exercise-book tiles (teal Angles, plum Algebra) with printed labels,
   completion ticks on the label, gold foil star at full marks. Tiles the teacher hasn't ticked for
   this class appear as faint spine-out "coming soon" books (not interactive). Future topics = new
   tiles (manifest-driven, `ACTIVITIES` array).
3. **Inside an activity** — sections, each = *Method → Practice*:
   - **Method movie**: data-driven animated worked example (SVG pen-speed draws, writing reveals,
     counting values, theorem stamps, balance beam for algebra). Play/pause/step-back/step-forward;
     captioned narration per step. EVERY WALT has at least one movie (≈10 per activity).
   - **Practice (Jotter Page)**: 2–4 questions per section.
     *Algebra*: full chip strip always visible ([+][−][×][÷]→operand pad, [Expand], [Collect],
     [Just rewrite]) + custom maths keypad (div-based caret; native keyboard never opens; physical
     keyboard mapped on desktop). Committed lines render typeset with the declared move in the
     margin "(+15)". *Angles*: precise SVG diagram, 44px+ tap targets (radial magnified picker on
     crowded vertices); per step: angle → value (calc-strings allowed and stored: "180−38−74") →
     reason (grouped-then-randomised full CCEA bank, exact phrasings). Found angles become givens;
     any valid route (DAG-validated, prerequisite check catches "you haven't shown that yet" —
     stored, surfaced to teacher).
   - **Check My Working** (enabled when complete): place-all-then-check; marking performed like a
     returned jotter (pen-speed red ticks in the margin, M·M·A tally, boxed answer, one Caveat
     comment). Wrong line ⇒ first-error box + lines-after greyed (hollow FT ticks if internally
     consistent), NO correction revealed, ONE more attempt (attempt 1 struck through). Locks after.
4. **Progress instruments** (no progress bars anywhere): Angles = engraved SVG protractor, needle
   sweeps as sections complete (damped-needle easing); Algebra = beam balance that levels.
   End of activity: marks tally page + the pupil's whole jotter as a flickable artefact.

## 5. Marking engine (the IP)

- **Algebra**: tolerant tokeniser (unicode minus, implicit ×, fractions) → recursive-descent parser
  → exact rational canonical form (linear: `ax+b` each side; expressions to degree 2). Equation step
  soundness = solution-set equality (exact, not sampled) + identity/degree guards. Expression tasks
  = canonical coefficient equality. Declared-move cross-check by operation inference; mismatch is a
  **teacher-facing amber only** (never nags the pupil mid-flow). "Just rewrite" to the answer =
  amber "no working shown", method credit withheld.
- **Angles**: per-question authored angle graph (nodes=angles incl. given values; edges=rules).
  A step is sound iff its value is right AND its reason names a rule that genuinely connects it to
  angles already established AND prerequisites are shown. Value/reason marked separately.
- **Misconception library (dx codes)** matched at Check: EXPAND_PARTIAL, EXPAND_SIGN,
  SUB_INSTEAD_DIV, DIV_BEFORE_SUB, SIGN_FLIP_MOVE, COLLECT_X_NUM, ALT_CORR_SWAP, COINT_EQUAL,
  TRI_SUM_360, STRAIGHT_360 … plus **auto-clustering of identical unmatched wrong lines** so
  unknown misconceptions still surface as named groups.
- Storage: ≤80 chars/line-object; ~8–10 KB per pupil per activity; client guards JSON length,
  prunes attempt-1 texts to dx codes if approaching 40 k. Committed lines only — no keystroke
  logging. Per-line seconds + edit counts shown only as quiet grey integrity notes on drill-down.

## 6. Teacher experience (passcode-gated, same app)

Classes list (create/delete, per-class **activity tickboxes**, copy link, in-page QR) →
per class: **Working Wall** (rows=pupils, cols=questions; glyphs: solid tick / amber half-tick
"right answer, no working" / red cross + first-error line № / hollow blue dot "working now",
20 s poll / grey dash; column totals + dominant-dx chips; shape-coded, board-readable) ·
**Jotter Page** drill-down (her page as a jotter; flip any tick↔cross — override stored, wins
everywhere; swipe to next pupil = flicking the pile) · **Same-Question Sweep** (all pupils' pages
open at question N, errors pre-highlighted) · **Marking Pile** (ranked named misconception
clusters; "Next-lesson starter" full-screen export = top-3 wrong lines as Spot-the-Slip cards;
CSV export for the department file / ETI trail).

## 7. FAIR COPY identity system (summary; full tokens in style.css)

- Palette: Page Cream #FAF7F0 · Cover Navy #1A3A6B · Ink #14213A · Foil Gold #E4B824 (+sheen stops
  #F6D55C/#B8860B) · Graph Blue rgba(27,90,135,.10/.16) · Margin Rose #E8A0A8 · **Marking Red
  #C8102E (semantically reserved for marking only)** · Pencil Graphite #5B6470 · Set-Square Teal
  #0F6B66 · Quill Plum #7A3B5E · Page Edge #EFE9DC.
- Type (committed woff2, served from absolute github.io URLs): Fraunces (display) · STIX Two Text
  (body + ALL mathematics; U+2212 minus, real ×, °) · Courier Prime (stationery/labels/buttons) ·
  Caveat (red teacher comments ONLY, max one per view).
- Grid law: `--sq: 20px`; every line-height/padding/size an integer multiple; squared-paper
  background via crossed linear-gradients (bold rule every 4 squares); functional margin column.
- Motion law: nothing fades/slides like an app — things are WRITTEN (clip-path reveals led by a
  pencil-tip cursor), DRAWN (stroke-dashoffset at constant pen speed ~0.45 px/ms), STAMPED
  (cubic-bezier(.2,.9,.3,1.2), 120–180 ms), or TURNED (450 ms page-turn). Protractor needle/beam
  use a damped overshoot curve. Hard cap 450 ms; full prefers-reduced-motion fallbacks.
- Kitsch ration: max one skeuomorphic prop per view; UI errors are pencil-grey + Courier (never
  marking red); no confetti, no skeleton shimmer, no pill buttons, no emoji.

## 8. Genuine-consequence compliance (playbook)

Place-all-then-check per question · two attempts, attempt 1 struck-through · no answer reveal,
no force-correct · full chip set + full reason bank always shown, randomised within groups ·
no per-line ticks before Check · zero-knowledge test: values must be computed, reasons chosen from
the full bank, routes free — nothing matchable by eye.

## 9. Content scope (from Mary's materials — see PR for source map)

- **Angles** (WALTs doc + MEP bk8 ch11): classify acute/right/obtuse/reflex; estimate-the-angle
  with on-screen protractor reading (drag-to-place, dual scale = genuine fail state); straight line
  180 / point 360; vertically opposite; triangle 180 / quadrilateral 360; alternate (Z) /
  corresponding (F) / interior-U-shape 180 (teacher's wording; "allied/co-interior" noted);
  parallelogram & rhombus facts; isosceles triangle/trapezium; 2–4-rule composites (incl. the
  book's triangle-between-parallels and trapezium-in-triangle styles); M2-style "give reasons".
- **Algebra** (WALTs doc + MEP bk7 ch16 + bk8 ch8): substitution incl. negatives (formulae
  s=½(u+v)t, v=u+at); collect like terms; negative-number rules; expand single brackets (grid
  method shown in movies; negative multipliers; x outside → x²); solve: one-step, two-step,
  x both sides, single bracket, **brackets both sides (authored — no source content, flagged)**;
  form-and-solve from perimeter/angles contexts. Function machines appear in method movies as the
  inverse-operations story, not as exam questions.
- All question values verified by the content build's self-test harness (every authored answer
  re-derived by the marking engine at build time; mismatch fails loudly).

## 10. Flags for Damien (carried to PR)

1. "Jotter" naming — NI departments sometimes say "exercise book"; rename is one string.
2. Brackets-both-sides content authored in M2 style (no source material) — spot-check.
3. M2 past-paper-style questions are authored in authentic style, not transcribed from real papers
   (none supplied) — Mary should sanity-check tone/difficulty.
4. Interior angles: UI uses the WALT's "Interior angles (U shape) add up to 180°" phrasing with
   "(also called allied or co-interior)" in the method movie once.
5. Deploy: build → Damien deploys (Sheet + Apps Script paste + one OAuth consent) → verify
   together, per playbook rhythm. Offline demo mode reviews everything before any deploy.
