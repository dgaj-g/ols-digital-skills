# WALK-A package — progress notes

Owner: WALK-A (this package). Files touched: `tools/qa/lib/drive.js`,
`tools/qa/lib/walk-moves.js`, `tools/qa/fixtures/plants.js` (new
`stats-a-*` PLANTS entries + FIXTURE_BOOK fold-in only — fx1–fx3 and every
existing plant untouched), this file.

## Checkpoint 1 (drive.js + walk-moves.js done)

### drive.js — done
- `STAT_KINDS` gains `order, pick, stemleaf, pie, scatter` so the shared
  `maybeStop`/`reachedStage`/`curStage` scaffold (and the generic two-press
  "selected" branch) covers them for free.
- `pressValues` reworked: opens a box by `aria-label` (matched anywhere in
  the root/dock scope) when `pq.slots[].label` is authored, else falls back
  to the old positional `.stat-slots .stat-cell[i]` read. Book C packs carry
  no `slots[].label` today, so Book C's own drive is byte-identical in
  behaviour. This is the fix for "the fig's overlay boxes live in
  `.stat-fig`, not `.stat-slots`".
- `dragTo(svg, handleEl, fromXY, toXY)` added beside `pressGrid`: pointerdown
  on the handle, two pointermoves + pointerup on the svg, real `PointerEvent`s
  with a shared `pointerId`.
- New press routes, each returning `{ok:true, how, stage: curStage()}` /
  `{ok:false, why:'... on <qid>'}`, called from new dispatch `if` blocks
  right after the existing `judge` dispatch:
  - **order** `pressOrder(S, pq)` — presses `[data-tray="order-tiles-<qid>"]
    [data-tray-item]` matching `tiles[seq[oi]]` in `S.seq` order; resumable via
    `.stat-row .stat-tile[data-placed]` count. Stop after every placement
    (covers the `ordering` stop). **`selected` is NOT driven here** — it is
    the existing generic two-press branch (`wantsSelection`, matches
    `uptoStage === 'selected'` exactly), which already presses any
    `[data-placed]` BUTTON once. This only works if a placed order tile really
    is a `<button>` — CONFIRM this once BUILD.order lands; if the tile is a
    `<span>`/non-button, `wantsSelection`'s tag filter (`e.tagName ===
    'BUTTON'`) will silently skip it and the walker will report "no
    placed-work button to select" from elsewhere. Flag to RENDER package.
  - **pick** `pressPick(S, pq)` — finds the option by `options[S.pick].text`
    inside `[data-tray="pick-options-<qid>"] button.stat-option[data-tray-item]`
    (resumable: skips if one is already `aria-pressed="true"`), stop after
    picking, then the reason chip `[data-tray="pick-why-<qid>"]
    [data-tray-item][data-reason="S.why"]` (resumable the same way).
  - **stemleaf** `pressStemleaf(S, pq)` — for each stem in `Object.keys(S.rows)`
    (note: JS always iterates small-integer-like string keys ascending
    regardless of insertion order — harmless here, only ordering of STEMS
    processed, not leaves within a stem), reconstructs each leaf's full
    printed value (`decimals:0` → `stem*10+leaf`; `decimals:1` →
    `(stem + leaf/10).toFixed(1)`), matches the tray item by `Number(txt) ===
    want` (NOT string — ties DESIGN's "match by number value" instruction),
    clicks it (stop: `leaf-selected`), clicks
    `.stat-sl-zone[data-stem="N"]` (stop: landed). Resumable via
    `zone.querySelectorAll('.stat-sl-leaf[data-placed]').length`. Then, if
    `S.key`, presses the keystem/keyleaf trays by exact text and stops.
    KNOWN RISK: if two leaves reconstruct to the same printed value (e.g. two
    "36"s), the route always grabs the first DOM match — same limitation
    `pressQlist` already has for repeated values; not worth a fix here.
  - **pie** `pressPie(S, pq)` — keys every `.stat-cell[aria-label="<label>
    angle"]` via `padType` (resumable: skips if already reads the value),
    presses `.stat-next` once all keyed, then for `bounds.length - 1`
    boundaries calls `pressGrid(svg, root.__statBoard.toPx(deg))` (resumable
    via `.stat-pie-bound[data-placed]` count), presses `.stat-draw`, then for
    each `Object.keys(S.labels)` presses the label tray item
    (`[data-tray="pie-labels-<qid>"] [data-tray-item]` matching the cat's
    `label`) and dispatches a `click` MouseEvent on
    `path.stat-sector[data-sector="i"]` (SVG path, same dispatch style the
    existing `reasoned` kind uses for its arcs, since `<path>.click()` is not
    universally reliable). Stops after each atomic step.
  - **scatter** `pressScatter(S, pq)` — plots `S.pts` via `pressGrid`
    (resumable via `.stat-pt[data-placed]` count), then walks `pq.asks` in
    order, pressing `.stat-next` before each (if one is present and enabled):
    `lobf` drags both `.stat-lobf-handle[data-handle=0|1]` via `dragTo` to
    `S.line[i]`; `estimate` keys `S.est` on the numpad found at
    `.stat-answer .numpad` or `.numpad`; `corr` presses the
    `[data-tray="scatter-corr-<qid>"]` chip matching
    `GJ_STRINGS.pupil.statScPositive/Negative/None` (fallback literals
    "Positive/Negative/No correlation"); `outlier` presses the grid at
    `given.concat(toPlot)[S.outlier]`. Stops after each.

**PARSE PROOF:** `node --check tools/qa/lib/drive.js` green; the ANSWER
template's INNER source (the actual browser code, everything between the
backticks) also parses clean — verified with
`new Function('return ' + ANSWER)()` (checked after every edit, not just at
the end, since a broken template string still parses as an outer file).

### walk-moves.js — done
- `DETECT_KIND` fallback cascade gains, in order before `return 'unknown'`:
  `.stat-order`→order, `.stat-pick`→pick, `.stat-stemleaf`→stemleaf,
  `.stat-pie`→pie, `.stat-scatter`→scatter.
- `MOVES`/`WRONG_MOVES` gain the five kinds (see file for exact wording —
  each WRONG_MOVES line names the real model-board slip from CONTRACT_A.md,
  not an arbitrary wrong keystroke: order = middle two swapped; pick = first
  wrong option with its own flaw; stemleaf = leaves left in printed order;
  pie = angles worked as percentages; scatter = x/y swapped, or (where that
  would leave the axes) the first point one square out).
- `SETTLE` gains `order/pick/stemleaf: settle` (trays/tables, no drawn
  curve) and `pie/scatter: settleChart` (both draw on the shared SVG board —
  swept sectors, a drawn line-of-best-fit — so they get the same fixed
  further wait cfplot/cfread/boxplot already get).

**PARSE PROOF:** `node --check` green; `DETECT_KIND`'s inner source also
checked with `new Function`.

## Checkpoint 2 — all five builders landed; plants.js finished for real

`grep -n "BUILD\.order\|BUILD\.pick\|BUILD\.stemleaf\|BUILD\.pie\|BUILD\.scatter" jotter-stats.js`
now finds all five (order/pick/stemleaf landed first; pie/scatter landed a
few minutes later). Every one of the six `stats-a-*` plants now has a REAL
anchor into TODAY's landed code (no TODOs left) — each verified with a
`node -e` string-occurrence check against the actual `jotter-stats.js`
before being written, and `node --check` + `require()` after:

- **stats-a-sorted-tray** — targets stemleaf's OWN tray call, not the
  shared `derange()` definition: `renderTray()`'s
  `derange(left, answerKeys, function (o) { return o.v; }, q.id).forEach(...)`
  collapsed to `left.forEach(...)` (the un-deranged, ascending list). Scoped
  to stemleaf only, not every tray in the app.
- **stats-a-truth-before-lock** — `BUILD.pie`'s `renderTable()` cell text
  `angles[c.id] ? angles[c.id] + '°' : ''` gains a true-angle fallback
  (`Math.round(c.f * 360 / q.total) + '°'`) instead of the empty string.
- **stats-a-snap-back** — `BUILD.scatter`'s own `onGridTap(x, y)` gains a
  snap-to-nearest-`given`-point step before `bd.addPoint(x, y, ...)`.
- **stats-a-single-press-lift** — reuses the exact same shared `twoPress()`
  definition patch the Book C `stats-single-press-lift` control already
  uses (confirmed BUILD.stemleaf's `onLeaf` calls this same shared
  function), forced onto Book A via `env`.
- **stats-a-stage-skipped** — `BUILD.scatter`'s `stage()` function, the
  line `else if (c === 'line') ctx.setStage('line');` (the ONLY place the
  app ever declares that stage) removed outright. NOTE: this is a
  RENDERER-side plant, unlike Book C's `stats-stage-skipped` sibling (a
  WALKER-side plant in `lib/drive.js`) — I switched to the renderer version
  on the coordinator's steer, since the exact `ctx.setStage('line')` line
  now demonstrably exists; both are legitimate ways to prove "every stage
  stood on" fails when a stage is never reached, just from different sides
  (app never offers it vs. walk never asks for it). My original drive.js
  version (disabling `pressScatter`'s own `lobf` branch) has been REPLACED
  by this one, not left behind as a second control.
- **stats-a-signature-leak** — `BUILD.order`'s `renderRow()` gains an
  unconditional line, right after its closing `}` block, printing
  `(q.answer || []).map(i => tiles[i]).join(' → ')` into a
  `.stat-order-placeholder` element appended to the row — present from
  first mount, not merely once she has started (this matches "printed
  ... as a placeholder text" more literally than my first draft, which only
  showed the next tile and only once the row was partly built).

All six use `return { env: BOOK_A }` (`{ MS_BOOK: 'stats-collect' }`, added
beside the existing `BOOK_C` constant near the top of plants.js) so whichever
gate runs them walks Book A, where these five kinds actually live.

**FIXTURE_A.txt fold-in:** landed (21 KB) and folded into `FIXTURE_BOOK` as
three new sections (`s3` = the 18 per-question single-fault items; `s4`/`s5`/
`s6` = the three movie-only faults, each paired with a clean one-item `pick`
padding question so `checkReachableMarks` adds no incidental failure) —
`fx1`–`fx3` and the existing `s1`/`s2` sections are byte-for-byte untouched.
Transcribed content, not re-verified: LINT-A owns the proof that these
sentences are what `dev/lint-content-stats.js` actually prints; I only
wrapped their already-valid JS object literals into FIXTURE_BOOK's shape.

**PARSE PROOF (all three owned files, final):** `node --check` green on
`tools/qa/lib/drive.js`, `tools/qa/lib/walk-moves.js` and
`tools/qa/fixtures/plants.js`; `node -e "require('./tools/qa/fixtures/plants.js')"`
loads; every one of the six `stats-a-*` anchors confirmed to occur exactly
once in today's `jotter-stats.js` by direct string search (not just
`edit()`'s own throw-on-miss, checked proactively before writing each one).
`NODE_PATH="$(npm root -g)" node tools/qa/run.js --fast --only qa-selftests`
GREEN (12 checks passed) with these changes in the tree, budget line read
"22 of 270 minutes used" at that point (the whole build's budget, not this
package's).

## CONTROLS — ready-to-paste blocks for the owning gates

Not applied by me (I own plants.js/drive.js/walk-moves.js only, never the
gate files). Each block below is the entry its OWNER should paste into its
own `CONTROLS` array/table. `mustFail` is quoted from DESIGN §11.3's table
verbatim (rule E.1); confirm each against what the gate ACTUALLY prints
before trusting it verbatim, per the same rule — I have not run these gates
against the plants (no renderer walk was possible in my window; the plants
are proven only by exact-string presence in today's source, per above).

**sit-pupil** (CONSEQUENCE rider — truth-before-lock):
```js
{ id: 'stats-a-truth-before-lock', plant: 'stats-a-truth-before-lock',
  mustFail: /truth-before-lock/ }
```

**sit-confused** (CONSEQUENCE — wrong placement persists):
```js
{ id: 'stats-a-snap-back', plant: 'stats-a-snap-back',
  mustFail: /did not persist/ }
```

**qa-tray-order**:
```js
{ id: 'stats-a-sorted-tray', plant: 'stats-a-sorted-tray',
  mustFail: /came out in the answer order/ }
```

**qa-click-safety**:
```js
{ id: 'stats-a-single-press-lift', plant: 'stats-a-single-press-lift',
  mustFail: /A SINGLE PRESS DESTROYED PLACED WORK/ }
```

**walker settle-up** (owner unclear to WALK-A — whichever module currently
asserts "every stage stood on" for Book C, likely inside sit-pupil or a
shared settle-up helper both pupil walkers call; RENDER/orchestrator please
route to the right file):
```js
{ id: 'stats-a-stage-skipped', plant: 'stats-a-stage-skipped',
  mustFail: /never stood on stage/ }
```

**sit-pupil** (the answer-signature law, `question:fresh` only):
```js
{ id: 'stats-a-signature-leak', plant: 'stats-a-signature-leak',
  mustFail: /an answer value is on the page before Check/ }
```

## Outstanding for the orchestrator / RENDER

- Confirm a placed `order` tile (`.stat-tile[data-placed]`, set by the
  shared `twoPress()`) really is a `<button>` — BUILD.order's own code
  (read at checkpoint 2) confirms this: `el('button', 'stat-tile stat-card
  stat-tile-placed')`. CONFIRMED, no action needed.
- `stats-a-stage-skipped` REPLACES my earlier drive.js-side draft of the
  same control name — nothing to reconcile, the final version above is the
  only one in the file.
- Six `stats-a-*` plants are otherwise complete and proven by exact-string
  match against today's tree; they still need an actual gate run
  (`node tools/qa/control.js --only <gate>`) once each owning gate pastes in
  its CONTROLS entry above, to prove each fires for real.
