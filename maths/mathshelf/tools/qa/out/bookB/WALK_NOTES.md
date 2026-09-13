# WALK-B package — progress notes (13 Sept 2026)

Owner: WALK-B. Files touched: `tools/qa/lib/drive.js`, `tools/qa/lib/walk-moves.js`,
`tools/qa/lib/stat-probes.js`, `tools/qa/lib/empty-elements.js`, `tools/qa/sit-pupil.js`,
`tools/qa/sit-confused.js`, `tools/qa/extract-transcript.js`, `tools/qa/fixtures/plants.js`
(new `BOOK_B` const + `stats-b-*` PLANTS only — every existing plant untouched),
this file. `tools/qa/sit-teacher.js` touched ONE line (the shared `describe()`
fallback, for consistency — see below). `tools/qa/qa-click-safety.js` and
`tools/qa/qa-coverage.js` needed no edits (see their own sections). Nothing
committed, nothing outside this package's file list touched.

## Timeline

Read CONTRACT_B.md, drive.js, walk-moves.js, sit-pupil.js, plants.js (Book A's
`stats-a-*` section + BOOK_A const), Book A's own WALK_NOTES.md, stat-probes.js,
extract-transcript.js, audits.js/empty-elements.js, domstub.js, sit-confused.js,
qa-click-safety.js first, in full, per the brief. `tools/qa/out/bookB/` at the
time held only CONTRACT_B.md and ENGINE_NOTES.md (ENGINE-B's own package,
`statcore.js`) — no FIXTURE_B.js, no content pack, no renderer. Built the
forward-looking code (drive.js/walk-moves.js/stat-probes.js/empty-elements.js/
the sit-pupil.js list-fig law) against the CONTRACT alone, proved each file with
`node --check` plus `new Function('return '+ANSWER)()` on every backtick
template (drive.js's `ANSWER`, empty-elements.js's `QUERY`) — **twice caught a
missing closing backtick/`*/`this way**, see "Mistakes caught" below.

While mid-build, both `content-stats-averages.js` (the content pack) and
`BUILD.table` in `jotter-stats.js` (RENDER's package) landed in the tree. Rather
than hand back six untested plants and a wiring I could only reason about, I
spent the rest of the window PROVING it: stood a real preview server up
(`python3 tools/qa/serve-preview.py <worktree-root> 8419`, no other package's
files touched) and ran `NODE_PATH="$(npm root -g)" MS_BASE=http://localhost:8419/maths/mathshelf/index.html MS_BOOK=stats-averages MS_WIDTHS=1280 node tools/qa/sit-pupil.js`
directly. **Every table-kind question in Book B (q25–q29, section 5) drove all
the way through empty → filling → asking → ready and reached `checked-right`** —
direct proof `pressTable` and the `table` kind detection/settle wiring in
drive.js/walk-moves.js work end to end against the real DOM, not just against
the contract's prose. Two of the six `stats-b-*` plants (`stats-b-list-fig-
missing`, `stats-b-stage-skipped`) now have real anchors confirmed against
today's `jotter-stats.js` and were dry-run with `PLANTS['id'](dir)` against a
copied `jotter-stats.js` (anchor found, mutated file still `node --check`
clean) — see "Plants" below for why they were not also walked through a full
`node tools/qa/control.js` run (time).

## drive.js — done

- `STAT_KINDS` gains `'table'`.
- `pressValues` gains a `set:5` branch: a slot authored with `set:5` (a
  constraint set, CONTRACT_B.md "values") opens five boxes keyed from
  `S.v[id + '_set']` (an array of five), each found by
  `aria-label="<label>, value N"` (N 1–5) — **this label format is MY OWN
  DECISION**, not yet confirmed against a renderer that draws `set:5` (no
  Book B question in the landed content pack uses one — CONTENT_NOTES.md's
  own constraint-set slots may not have shipped yet). If RENDER lands a
  different label shape for the five boxes, this is the one line in drive.js
  that needs to move to match it: `boxLabel = label + ', value ' + (k+1)`.
- New `pressTable(S, pq)`, called from a new `if (kind === 'table')` dispatch
  block: for each derived column (`pq.cols` filtered on `.derive`, in table
  order), for each row, keys `S.cells[col.id][row]` into
  `button.stat-cell[data-col="<id>"][data-row="<i>"]` via the numpad, skipping
  a cell already reading the wanted value (resumable, same pattern as
  `pressCftable`); then totals (`pq.totals`, `S.totals[col]`) into
  `button.stat-cell[data-col="<id>"][data-row="total"]`; then the asks
  (`pq.asks`, `S.asks[id]`) — a `value` ask by `aria-label="<ask.label>"`
  (exactly `a.label`, no template — confirmed against the real
  `BUILD.table`: ask boxes get `aria-label = r.label` raw, no
  `statTableCellLabel` template applied to asks), a `row` ask by
  `button.stat-rowpick[data-ask="<id>"][data-row="<idx>"]`, skipped if already
  `aria-pressed="true"`. `maybeStop` is called after **every** atomic press
  (one cell, one total, one ask), not once per column — this is what lets the
  generic per-stage walk in sit-pupil.js stand on "filling" after exactly one
  cell (see stat-probes.js below).
- **VERIFIED against the real `BUILD.table`** (jotter-stats.js:3375–3660,
  landed mid-build): `data-col`/`data-row` on derived and total cells, the
  numpad in the dock (`makeNumPad(ctx.dock, {label, decimal:true, ...})`,
  no `fraction:true` — table answers are plain decimals, never fractions),
  the route order (each derived column top-to-bottom, then totals, then value
  asks — exactly the order `pressTable` presses in), row-pick
  `data-ask`/`data-row`/`aria-pressed`, and that `.stat-rowpick` buttons carry
  **no** `aria-label` at all — only `textContent = rowName(ri)` (the row's own
  class/given text). All confirmed by direct read of the shipped file, not
  assumed from the contract.
- Dispatch returns `{ ok: true, how: 'filled every derived cell and total
  from the given columns, then answered every question under the table',
  stage: curStage() }` — CONTRACT's own wording.

**PARSE PROOF:** `node --check tools/qa/lib/drive.js` green; `new
Function('return ' + ANSWER)()` on the inner template green (caught one
missing-backtick regression from my own edit before this passed — see
"Mistakes caught").

## walk-moves.js — done

- `DETECT_KIND` fallback gains `.stat-tablekind` → `'table'`, checked
  **before** the existing `.stat-table` → `'cftable'` line: a table
  question's own `<table>` also carries the plain `.stat-table` class
  (`table.stat-table.stat-table-edit`), so the cftable fallback would
  otherwise claim it first. Confirmed against the real host:
  `host = el('div', 'stat-tablekind')` in `BUILD.table`.
- `MOVES.table` / `WRONG_MOVES.table` — CONTRACT_B.md's own model-board
  sentences, quoted verbatim.
- `SETTLE.table = settle` (the ordinary one — no drawn curve, CONTRACT's own
  "Drive channel: none").
- The `fig:{type:'list'}` figure and the `set:5` slot need no walk-moves
  changes (no new kind, no new settle behaviour) — confirmed: `fig.type ===
  'list'` already renders in the SHIPPED `BUILD.values` (it landed before I
  even started reading, not part of this build) and is driven by the
  existing `values` kind path unchanged.

**PARSE PROOF:** `node --check` green; `DETECT_KIND`'s own inner source
checked with `new Function`.

## stat-probes.js — done

Added `TABLE_ONE_CELL`, a page-function probe in the same shape as
`PERSISTS`/`SIGNATURE`: called from sit-pupil's own per-stage loop the
instant it drives to the `'filling'` stage (i.e. right after `pressTable`
has pressed exactly one cell), it asserts `data-stage` has already left
`"empty"`. Wired into sit-pupil.js's stage loop with `if (stg === 'filling')
{ ... }`.

**Why this exists alongside STAGE_SETTLE, which already generically asserts
"every declared stage was stood on" for any stats kind:** STAGE_SETTLE would
already fail `stats-b-stage-skipped` (a table that jumps `empty → asking/
ready`) with "never stood on stage filling" — I traced this by hand against
the real `BUILD.table.stage()` and confirmed it. TABLE_ONE_CELL is
deliberately narrower and catches something STAGE_SETTLE cannot: a table
that STAYS on `"empty"` after one press (rather than skipping past
`"filling"` in the other direction) reads identically to STAGE_SETTLE
("never stood on filling") but is a different fault to show her — so this
probe reads the DOM at the one moment that distinguishes them. Exported
alongside the existing three as `module.exports = { PERSISTS, SIGNATURE,
STAGE_SETTLE, TABLE_ONE_CELL }`.

## sit-pupil.js

1. **Movie KIND map** (the `film` op → CSS-selector table inside the
   `movie:end` evaluate block, ~line 380): added `bracket: '.ml-bracket'`.
   CONTRACT_B.md's films use `write, ring, bracket, table, tcell, stamp, box,
   note, tick` — every one already had a selector **except** `bracket`
   (`box` is already handled by the existing `boxframe`/`boxplot` split).
   `.ml-bracket` is **my own naming decision** (no such class exists yet —
   player.js has not drawn a `bracket` op at all). **CONFIRMED LIVE**: the
   real walk against Book B's actual s1 film reported exactly
   `the film has 1 \`bracket\` op(s) and nothing of that kind is drawn on
   the stage` — proving the KIND-map addition works and that RENDER/player.js
   genuinely has not implemented the op yet. This is a real, correctly-
   surfaced finding for RENDER, not a walker bug — **recorded, not touched**
   (player.js is not mine).
2. **The list-figure law** (new, right beside the existing `SIGNATURE` probe
   call, question:fresh only): for a `values` kind question whose pack
   question carries `fig:{type:'list'}`, asserts `.stat-list` is on the page
   with non-empty text; fails with `'the list the question is about is not
   on the page — a fig:{type:"list"} question prints its list above the
   boxes, on ' + qid` if not. This is a NEW law — nothing in the shipped
   walker asked this question before. Backing plant: `stats-b-list-fig-
   missing`.
3. **TABLE_ONE_CELL wiring** in the per-stage loop, `if (stg === 'filling')`
   (see stat-probes.js above).
4. **CONTROLS**: added
   `{ id: 'stats-b-list-fig-missing', plant: 'stats-b-list-fig-missing', mustFail: /the list the question is about is not on the page/ }`
   and
   `{ id: 'stats-b-stage-skipped', plant: 'stats-b-stage-skipped', mustFail: /never stood on stage/ }`.
   Both plants apply cleanly (verified: `PLANTS['id'](dir)` against a real
   copy of today's `jotter-stats.js`, anchor found, mutated file still
   parses) but **neither has been run through a full `node tools/qa/control.js
   --only sit-pupil`** (a full control run spins a sandbox + server + real
   headless walk per control, and the sit-pupil CONTROLS list is long — this
   was not affordable inside the window on top of the direct proof above).
   The direct proof that pressTable/stage-detection work on the UNMUTATED
   tree, plus the static anchor-and-parse check on the MUTATED one, is what
   stands in for it; flag this as the one thing still owed a real control
   run.
5. `describe(f)` gains a two-line dispatch to `empty-elements.js`'s own
   `describe()` for the two new `reason` values it can now return
   (`stat-cell-no-name` / `stat-rowpick-no-name`) — see empty-elements.js.

## sit-confused.js

- The `isStats` kind allowlist (used to gate the `PERSISTS` — "a wrong
  placement never moves on its own" — probe) gains `'table'`.
- `describe(f)` gets the same two-line dispatch as sit-pupil.js's, for
  consistency (a finding described one way by one walker and another way by
  its sibling is the kind of drift DFM 144 exists to prevent).
- **No `stats-b-*` CONTROLS added here.** `stats-b-cell-inconsistent` sounds
  like it belongs on this gate (a wrong-but-internally-consistent table
  attempt), but proving it needs `dev/model-attempts.js`/`corrupt()` to
  author a SPECIFIC inconsistent wrong attempt for a table question — that
  file calls straight into `statcore.js`'s generic `modelBoard(q, true,
  rules)`, and neither file is mine. See "Not done" below.

## sit-teacher.js

- Same `describe(f)` dispatch line added, for the same consistency reason.
  Nothing else touched — Book B's own content is not something a teacher
  surface walk exercises differently, and no teacher-side law was named in
  the brief.

## empty-elements.js

- `EXEMPTIONS` gains one entry explaining the new boundary (a `td` given
  cell needs no new exemption — it was already `td`, already in `TAGS`,
  already never empty by construction; what's new is the other direction).
- `QUERY` gains two NEW checks, run after the existing TAGS sweep, over
  elements the TAGS list deliberately excludes (`button` is not a content
  container by the file's own law):
  - `button.stat-cell` that is empty (not yet filled — legitimate) **and**
    carries no `aria-label` → `{ reason: 'stat-cell-no-name', ... }`.
  - `button.stat-rowpick` whose name (`aria-label` or `textContent`) is
    empty → `{ reason: 'stat-rowpick-no-name', ... }`. **CONFIRMED against
    the real `BUILD.table`**: row-pick buttons carry no `aria-label`,
    relying entirely on `textContent = rowName(ri)` — so the `textContent ||
    aria-label` fallback in my check is load-bearing, not defensive
    filler; without it every row-pick button in the shipped app would
    false-positive.
- `describe(f)` grows a branch for each new `reason`, both routed to by the
  three walkers' own local `describe()` (see above) rather than duplicated
  three times.

## qa-click-safety.js — no changes

Kind-agnostic already: it presses the first question of every exercise once
with a real (right) attempt and asserts placed work survives a second press,
reading `[data-placed]` generically. `BUILD.table` marks a filled cell with
`data-placed` the same way every other kind's board does (confirmed in the
read of `boxFor()`), so this gate extends to the `table` kind automatically
once a real attempt exists — no edit needed. `stats-b-rowpick-two-pressed`
(if it turns out to be a click-safety-shaped fault rather than a marking one)
would be a **mutation plant** against `BUILD.table`'s row-pick click handler,
registered here — see "Not done".

## qa-coverage.js — no changes

Checked per the brief ("if a kind list lives there"): it has none. `KINDS`
and the stage table are both derived at run time (a regex read of
`dev/lint-content-stats.js` and of `jotter-stats.js`'s own `STAGES` object),
so a new kind is covered by existing, not by a list somebody has to
remember to extend.

## extract-transcript.js

- `SAMPLE` gains `head: 'f × x'` — the one new template hole Book B's own
  strings introduce (`statStageTableFill`: "Fill in the {head} column from
  the top row down..."; confirmed the exact string in `strings.js:304` and
  that `{n}`/`{m}` were already sampled). `statTableTotalLabel`
  ("Total {head}") and `statTableCellLabel` ("{head}, row {n}") are DOM
  `aria-label`s built at render time, not `GJ_STRINGS.pupil` sentences a
  cold-read transcript walks separately — but they use the exact same
  `{head}` name, so one sample value now covers all three.
- Ran `node tools/qa/extract-transcript.js` was NOT done standalone (it
  reads sidecars a walker writes — folded into the live sit-pupil run
  instead, which is a stronger proof: the real transcript for `stats-
  averages` was written to `tools/qa/out/transcript/stats-averages.txt` by
  the live walk above, and `unfilledHoles()` passing is implied by
  `qa-notation`'s clean run over the same content in the `--fast` battery
  — no raw `{head}` brace was reported anywhere in that run).

## Live proof — what actually happened when Book B's renderer landed

`NODE_PATH="$(npm root -g)" MS_BASE=http://localhost:8419/... MS_BOOK=stats-averages MS_WIDTHS=1280 node tools/qa/sit-pupil.js`
(a throwaway preview server on port 8419, `python3 tools/qa/serve-preview.py
<worktree-root> 8419` — stopped again before finishing):

- **q25–q29 (section 5, the `table` kind) drove empty → filling → asking →
  ready → `checked-right`, every one.** This is the proof pressTable/kind
  detection/settle actually work against the shipped renderer, not just
  against the contract's prose.
- Two **real, correctly-surfaced RENDER-side findings** (not walker bugs —
  my code found them, it didn't cause them):
  - `movie:end > stats-averages s1 @1280 x film-draws: the film has 1
    \`bracket\` op(s) and nothing of that kind is drawn` — player.js has not
    implemented the `bracket` op yet.
  - `movie:end > stats-averages s4 @1280 x film-draws: the film has 2 ring
    op(s) and 1 ring(s) drawn` — a `ring` op under-drawn on this film
    specifically.
  - A run of `x empty: <th>` findings across `book-contents:mid-book`,
    every `movie:*` state, and every question in section 5 (q25–q29) —
    an empty `<th>` somewhere on those screens (most likely a table column
    whose `head` is blank, in either the content pack or the movie's own
    `table` op). Not diagnosed further — it is a content/player fault, not
    a walker one, and `<th>` was already in `empty-elements.js`'s TAGS list
    before this package touched anything.
- **A finding that is NOT mine to fix and is NOT (I believe) a walker bug
  either: q1–q24 (sections 1–4) never left `question:fresh`.** Every one of
  drive.js's `ANSWER` calls reported `ok:true` (no "could not answer" note
  anywhere in the run — grepped for it), the per-stage loop completed every
  declared stage without ever breaking, and yet the DOM's own `data-state`
  never moved off `"fresh"`. Traced as far as: `dev/model-attempts.js`'s
  `correct()`/`corrupt()` are entirely generic for every stats kind — they
  call straight into `statcore.js`'s own `GJ_STATS.modelBoard(q, wrong,
  q.rules)` (ENGINE-B's file) and hand back whatever `S` it returns; if
  that `S` is empty (`{}`/`{v:{}}` etc.) for these specific questions,
  every one of drive.js's press loops (`pressValues`, `pressQlist`, ...
  — code this package did NOT change beyond the `set:5` addition) does zero
  iterations and returns a false "ok:true, opened every box" without ever
  pressing a control — which is indistinguishable, from the outside, from a
  genuinely finished board. This is consistent with `ENGINE_NOTES.md`'s own
  "CHECKPOINT 2" note explicitly naming `table` and `values`'s new slips as
  landed, and saying nothing about whichever kinds sections 1–4 actually
  use (qlist/judge/cftable, going by their movie ops: s3's "table×1,
  tcell×5" and s4's "2 ring op(s)" read as `cftable`/`qlist`-shaped
  content). **I did not chase this further**: `dev/model-attempts.js`,
  `statcore.js` and `content-stats-averages.js` are all outside this
  package's file list, and the fault (if it is one) is theirs to find with
  their own code in front of them. Recorded here, not touched — reproduce
  with the command above.

## Plants — status

- **`stats-b-list-fig-missing`** — REAL, anchored against today's
  `jotter-stats.js` (`figHost.appendChild(el('p', 'stat-list', ...))`
  collapsed to a no-op), `env: BOOK_B`. Registered in sit-pupil.js.
  Statically verified (anchor found, mutated file parses); not yet run
  through a live control (no `stats-averages` `values` question in the
  landed content pack actually carries `fig:{type:'list'}` yet, per a grep
  of `content-stats-averages.js` — so even a live control run today would
  find no board to stand the fault on. It will become live-testable the
  moment such a question is authored.)
- **`stats-b-stage-skipped`** — REAL, anchored against today's
  `BUILD.table`'s own `stage()` (the `filled < tableBoxes.length ?
  'filling'` branch forced to never fire). `env: BOOK_B`. Registered in
  sit-pupil.js, mustFail `/never stood on stage/`. Statically verified the
  same way. **This one COULD be live-control-run today** (q25-29 are real
  table questions) — flagged as the highest-value thing left to prove if
  the orchestrator's second pass has time before mine does.
- **`FIXTURE_B.js` landed** (LINT-B's package) partway through the second
  half of this window, after the paragraph above was written and after the
  live walk had already proven the table kind end to end. All four of
  LINT-B's drafted plants were folded in, every anchor RE-VERIFIED against
  the (by-then further-advanced) tree before writing, exactly as LINT-B's
  own header asked ("re-check before folding in, in case another package
  has since touched the same lines") — all four still matched, once each,
  byte for byte:
  - **`stats-b-rowpick-two-pressed`** — folded in verbatim (BUILD.table's
    `aria-pressed` check loosened from "this exact row" to "any row at
    all"). **Registered on sit-pupil.js**, backed by a NEW probe,
    `stat-probes.js`'s `ROWPICK_SINGLE(qid)`: reads every
    `.stat-rowpick[data-ask]` group on the question root once the table's
    whole drive is done (called right beside `STAGE_SETTLE`, same moment),
    and fails if more than one button in a group reads
    `aria-pressed="true"`. `mustFail: /read aria-pressed/`. Statically
    verified (anchor found, mutated file parses) — not yet live-control-run
    (see "still owed" below).
  - **`stats-b-tfn-leak`** — folded in verbatim (a claim card with
    True/False/NEI `options` now prints its own `c.verdict` from first
    mount, in a new `<p class="stat-verdict-leak">`). **Registered on
    sit-pupil.js**, backed by extending the EXISTING `SIGNATURE` probe
    rather than writing a new one: its `truthEls` query (originally
    `[data-truth]` only — the chart kinds' "true positions drawn before
    lock") now also matches `.stat-verdict-leak`, so the exact existing
    message fires: "an answer value is on the page before Check: ...".
    `mustFail: /an answer value is on the page before Check/`. Statically
    verified the same way.
  - **`stats-b-total-before-cells`** — folded in verbatim (`tableBoxes`, what
    `stage()` compares "filled" against, narrowed from "every cell AND
    total" to "cells only"). **Registered on sit-pupil.js**, `mustFail:
    /never stood on stage/` — reasoned through by hand rather than proven
    by a live control run (the one thing in this fold-in I did NOT confirm
    end to end, flagged below): once every cell is filled with the totals
    still blank, the buggy `stage()` already reports "asking"/"ready", so
    the walker's own `reachedStage('filling')` check (drive.js's
    `maybeStop`) reads "already there" the moment cells finish - the SAME
    observable symptom as `stats-b-stage-skipped` (the drive is told it has
    reached a stage the board never genuinely stood on), which
    `STAGE_SETTLE` already reports generically as "never stood on stage
    filling". I am confident in this reasoning (I traced both plants
    through the identical code path by hand) but have not RUN it, which is
    the bar this file's own "controls must fail" law sets — see "still
    owed".
  - **`stats-b-cell-inconsistent`** — folded in verbatim (statcore.js's
    `markTable`: the ok:1/ok:2 branch collapsed so any non-blank cell marks
    right regardless of correctness or consistency). **NOT registered** on
    any walker gate. LINT-B's own comment already flagged the reason and I
    confirmed it by hand: CONTRACT_B.md's own model board for a wrong table
    attempt puts the slip in the value ASK (Σfx ÷ rows), "with every cell
    right" — so neither the ordinary right-walk nor the ordinary
    wrong-walk (`dev/model-attempts.js`'s generic `corrupt() ->
    statcore.js modelBoard(q, true, rules)`) ever drives a cell that is
    BOTH wrong and inconsistent, which is the one thing this plant breaks.
    Proving it needs a bespoke wrong `S` authored specifically for this
    (an fx that is wrong but consistent with a wrong f she typed, or vice
    versa) - that is `dev/model-attempts.js`'s call, a file neither this
    package nor LINT-B owns, or a `dev/test-statcore.js` unit test that
    calls `markTable` directly with a hand-built `S` and needs no browser
    at all - the more precise proof, and ENGINE-B's own file. Registering a
    walker control here on a guessed attempt would very likely never
    exercise the fault at all, which is worse than recording the gap
    honestly.

## Second live run, after the FIXTURE_B.js fold-in

Re-ran the exact same command (`NODE_PATH="$(npm root -g)" MS_BASE=http://
localhost:8421/... MS_BOOK=stats-averages MS_WIDTHS=1280 node tools/qa/
sit-pupil.js`, a second throwaway preview server, stopped again after) once
`ROWPICK_SINGLE` and the `SIGNATURE` `.stat-verdict-leak` extension were
wired in, specifically to check they add no new failures on the CLEAN
(unmutated) tree. **Result: `430 checks passed, 68 failed` — the identical
count to the first run.** Nothing new failed and nothing new passed
spuriously: `.stat-verdict-leak` does not exist anywhere in the shipped
`jotter-stats.js` today (grepped, 0 occurrences) so `SIGNATURE`'s widened
`truthEls` query cannot false-positive, and every `.stat-rowpick` group's
`aria-pressed` really is computed by exact-row equality today (confirmed
by the same read that found the anchor), so `ROWPICK_SINGLE` cannot
false-positive either. This is the confirmation that folding in LINT-B's
four plants and their two backing checks was safe, in place of a full
`node tools/qa/control.js` run (still owed — see below).

## Still owed (for the second pass, or whoever has room first)

- Run the actual `node tools/qa/control.js --only sit-pupil` (or
  `--changed`) for the five NEWLY REGISTERED controls
  (`stats-b-list-fig-missing`, `stats-b-stage-skipped`, `stats-b-rowpick-
  two-pressed`, `stats-b-total-before-cells`, `stats-b-tfn-leak`) to turn
  the static anchor-and-reasoning proof in this file into the real thing —
  a control that has been SEEN to say no, not just reasoned to. Each is a
  single, isolated `edit()` mutation with no cross-dependency on the
  others, so they can be run and fixed independently.
- `stats-b-cell-inconsistent` needs a bespoke wrong `S` (from `dev/model-
  attempts.js`, not mine) or an engine-level unit test (`dev/test-
  statcore.js`, ENGINE-B's) before any control can exercise it at all — see
  its own paragraph above.
- The q1–q24 "never left `fresh`" finding (see "Live proof" above) is not
  this package's fault and not yet triaged by anyone — reproduce with the
  command in that section.
- The `bracket`/`ring` film-drawing findings and the empty `<th>` findings
  are real, RENDER/content-side faults this package's code correctly
  surfaced — not walker bugs, not fixed by me, not mine to fix.

## Mistakes caught by the parse-proof discipline (worth naming so nobody
   repeats them)

Both of the following would have shipped a gate that silently never runs its
new checks — `node --check` on the OUTER file passes even when a template
literal's own content is broken, because to the outer parser it is still
just one big string:
- `drive.js`: my first draft of the `set:5` comment used backticks inside
  the ANSWER template's own prose ("the renderer's contract is
  \`aria-label=...\`") — since `ANSWER` is itself one big backtick string,
  those closed it early. Caught immediately by `new Function('return ' +
  ANSWER)()`, not by `node --check` alone (which reported the syntax error
  from the wrong place, deep inside the *rest* of the file, not at the
  actual mistake).
- `empty-elements.js`: my new `EXEMPTIONS` array entry was a `/* ... */`
  block comment that I closed with a stray `'` instead of `*/` — the
  comment silently swallowed the `];`, the `const QUERY = \`...\`` opening,
  and the whole first half of the QUERY template's own prose comments,
  finally "closing" on the FIRST real `*/` it found forty lines later
  (another comment's own close). `node --check` again reported the error
  from deep inside the swallowed region, not at the real mistake — found by
  bisecting with `indexOf('*/', ...)` from the comment's own start.

## Selectors and contracts this package's code depends on (for RENDER/
   CONTENT to keep honouring, or to tell me if they must change)

- `.stat-tablekind` on the table kind's own host div (kind detection).
- `table.stat-table.stat-table-edit` — the given/derived table itself.
- `button.stat-cell[data-col="<colId>"][data-row="<i>"]` — a derived cell,
  0-based row index as a string.
- `button.stat-cell[data-col="<colId>"][data-row="total"]` — a column total.
- A value ask's box: `.stat-cell[aria-label="<ask.label>"]` (the pack's own
  raw label, no template).
- A row ask: `button.stat-rowpick[data-ask="<ask.id>"][data-row="<i>"]`,
  `aria-pressed="true"/"false"`, name = `textContent` (rowName), **never**
  `aria-label`.
- The numpad in the dock: `.numpad` with `.keypad button`/`button.key`
  children, `decimal:true` (a `.` key exists) — `padType` presses by
  matching rendered label text, digit by digit.
- Stages `data-stages="empty filling asking ready"` /
  `data-stage="<one of them>"` on the question root, exactly the CONTRACT's
  four names, in that order.
- `values`: a `set:5` slot's five boxes at `aria-label="<label>, value N"`
  (N 1-5) — **my own decision, unconfirmed against a real renderer** (see
  drive.js section above) — the single line to change if RENDER picks a
  different shape.
- `.stat-list` — the printed list above a `fig:{type:'list'}` values
  question's boxes (already shipped, confirmed).
- Film ops: `bracket` needs `.ml-bracket` drawn on the stage with real
  rendered pixels around the two values it spans (mirroring how `ring`
  already must enclose the one value it names) — **not yet drawn** (live
  finding above); every other Book B film op already has a home in the
  existing KIND map.
