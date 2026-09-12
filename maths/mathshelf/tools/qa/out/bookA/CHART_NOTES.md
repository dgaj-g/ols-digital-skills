# CHART-A package notes — Book A cut (12 Sept 2026)

Owner: `statchart.js`, `player.js`, this file, `tools/qa/out/bookA/chart/*`. Nothing else touched.
Status: **DONE — proof ALL PASS at 375 (reduced motion, instant goto) and 1280 (animated advance).**
Both files parse (`node --check`). Existing behaviour byte-stable for existing callers (every changed
line is a default-off flag or an identical path when the new state is absent — see "Decisions").

Scratch: `tools/qa/out/bookA/chart/scratch.html` (film using every new op once + a scatter grid, a pie
board, a venn3, and the laptop-reclaim rig), `prove.js` (headless via `tools/qa/lib/browser.js`, python3
http.server on a free port; run `cd tools/qa/out/bookA/chart && NODE_PATH="$(npm root -g)" node prove.js`),
`scratch-375.png`, `scratch-1280.png`, `proof-output.txt`, `patch1-7.js` (the exact edits, replayable).

## Read findings (what exists that Book A leans on)
- `handle.ruleX(x)` ALREADY existed on the grid renderer (vertical rule at a snapped x, draggable handle at
  the x-axis foot, `data-hit="rule-handle"`); `drop()` reads y where the vertical meets the curve. The cfread
  `atX` mechanic is `bd.ruleX(x); bd.drop()`. For scatter the estimate reads against the LOBF, not a curve:
  `drop()` now falls back to the lobf line when no curve is joined (additive; identical when a curve exists).
- The player's `chart`/`plot`/`curve`/`rule`/`drop` ops draw on the PLAYER's own 400×268 canvas (`.ml-chart`),
  not on GJ_STATCHART. `lobf` therefore draws on that same canvas (clipped to its plot rect) so A·s5's
  `chart → plot → lobf → rule/drop → stamp` beat is one picture. `rule {x}` (vertical) is added there too.
- Film-draws law (`tools/qa/sit-pupil.js` ~L353 `KIND`): op → selector; an unknown kind FAILS by name. The
  additions it needs are below.
- **Pre-existing, not mine, flagged:** the player's own `.ml-chart` axis text renders at 8.8–10.4 CSS px at
  375 (style.css `.movie-stage .ml-axis-num { font-size: 11px }` on a 400-unit canvas drawn ~330 px wide) —
  Book C's films have this today; the 13 px board law is written for `svg.stat-board`. Orchestrator's call
  whether Book A's cut fixes it (a counter-scale on the player canvas, or a style.css bump to 13px + a
  wider left margin); I did not touch it ("existing ops untouched").

## Handle API shipped (exact signatures)

### Grid renderer `GJ_STATCHART.render(host, chart, opts)` — additions on the returned handle
- `addPoint(x, y, {given:true})` → board index. Draws `g.stat-pt.is-given[data-index]` (ink-filled dot,
  NO `data-placed`, NO hit, never selectable/movable). Every `g.stat-pt` now carries `data-index`.
- `points()` → `[[x,y]…]` HER points only (given excluded — this is `S.pts`). `allPoints()` →
  `[{i, x, y, given}]` every point with its board index (the outlier ask indexes `given.concat(toPlot)`;
  `allPoints()` is in draw order, so draw the given ones first and the indices line up).
- `line(p1, p2, {cls:'stat-lobf', animate?:bool, instant?:bool})` → `{ el, update(p1,p2), remove(),
  yAt(x) → y|null, ends() → [[x,y],[x,y]]|null }`. Draws ONE `line.stat-lobf` through the two axis points
  EXTENDED to the plot rect (Liang-Barsky clip; hidden when the line misses the plot). A second call
  replaces the first. Stored as the board's lobf: `drop()` reads it when no curve is joined; `lobf()` on
  the handle returns `{p1, p2, ends}`.
- `handleAt(x, y, i)` → the hit element `circle.stat-lobf-handle[data-hit="lobf-handle"][data-handle=i][data-placed]`
  (48 px kept by relayout; dashed copper ring with a copper dot at centre, in `g.stat-lobf-handle-g`). Snaps
  to the grid (`snapDivisor`). Real pointer drag moves it (clamped to the axes); with TWO handles the lobf
  line is created/redrawn through them automatically; `opts.onChange({type:'lobf-move', i, x, y})` fires
  during drag. `moveHandle(i, x, y)`, `handles()` → `[[x,y],[x,y]]` (sorted by i), `removeHandles()`.
- `markOutlier(i)` → ring element (`circle.stat-outlier-ring` in the ring group; the point's `g.stat-pt`
  gains `.is-outlier`); one at a time (a new call clears the last). `clearOutlier()`.
- `enablePress(fn)` adds a 44 px press target (`data-hit="point-press"`, pans allowed) over EVERY point
  (given and hers) and calls `fn(boardIndex)` on click — the outlier stage. `enablePress(null)` removes them.
- `clearDrop()` — `gDrop.innerHTML=''` + drop labels removed, no drawing (coordinator's request; cfread
  calls `bd.clearDrop()` when the rule is parked at the axis).
- `frame` — the `.stat-board-frame` element.
- Axis break glyph: drawn on the y axis just above the origin when `y.min ≠ 0` (mirror of the x one).
- **Laptop margin reclaim** (coordinator's request) in `relayout()`: if `host.clientWidth` < the board's law-6
  width (`vbw × 12/24 + 2`), the host's computed `margin-left` is not already negative (phone CSS ≤ 480 left
  alone), and the deficit ≤ (host left − nearest `.jotter-q, [data-surface="question"]` left − 8), then
  `host.style.marginLeft = -deficit px` and `host[data-reclaimed=deficit]`; otherwise both cleared. Measured
  in the rig at 1280: host 698 px, law-6 752 px → reclaimed **54 px**, hidden width **54 → 0 px**.
  `layoutLabels()` reads the computed margin (`inset`), so labels stay out of the reclaimed strip — checked:
  the code path is unchanged and reads `getComputedStyle(host).marginLeft`, which an inline style sets.

### `GJ_STATCHART.venn(host, spec, opts)` → handle
spec `{ circles:[{id,label}] (2 or 3), n? }`; opts `{ append?:bool, cls? }` (`append` leaves the host's
existing children — the player uses it; default clears the host as `render` does).
Draws `.stat-board-frame > svg.stat-board.stat-venn` (viewBox 420×310 venn2 / 420×400 venn3, frame
max-width = viewBox px so it never stretches) + `.stat-label-layer`: universe `rect` (ink), circles
`circle.stat-venn-circle[data-circle=id]` (copper 2 px), labels `text.stat-svg-label.stat-venn-label`
(ink, ≥13 px), `text.stat-venn-n` "n = 130" top-left (pencil).
- `regionCenter(region)` → `{x, y}` **CSS px relative to the frame** (position an HTML box with
  `left/top` + `translate(-50%,-50%)`). Regions venn2 `A B AB out`; venn3 `A B C AB AC BC ABC out`
  (ids are the spec's ids; any order of letters works, `'both'` = the two-circle overlap,
  `'outside'|'neither'` = `out`). Centres are the DEEPEST point of each region (farthest from every rim and
  the rectangle edge), found by sampling the drawn geometry — never a constant, so they hold at 375.
- `regionCenterUser(region)` → user units; `contains(region, ux, uy)`; `geometry()` → `{R, centres, ids, rect, scale}`;
  `regions()`.
- `fill(region, text, {instant?, cls?})` → `{ el, done:Promise }` writes `text.stat-svg-label.stat-venn-val[data-region]`
  (copper-ink, 600, `dominant-baseline: middle`) at the region centre with a 320 ms write-on (instant under
  REDUCED/instant). `clearFill(region?)`.
- `svg`, `frame`, `layer`, `relayout()`, `destroy()`.

### `GJ_STATCHART.pie(host, opts)` → handle
opts `{ readOnly?, append?, cls?, onRimTap(deg), onBoundaryMove(i, deg), onBoundaryPress(i), onSectorPress(i) }`.
viewBox 320×320, centre (160,160), R = 118 user units. Disc `circle.stat-pie-disc` (ink), copper radius at
12 o'clock `line.stat-pie-radius`, rim tap target `circle.stat-pie-rim[data-hit="rim"]` (transparent 44-unit
stroke, pointer-events stroke; absent when readOnly). Degrees are INTEGERS, 0–360 clockwise from 12.
- `rimPoint(deg)` → `[px, py]` CSS px relative to the frame; `degAt(px, py)` → integer deg (CSS px relative
  to the frame); `rimUser(deg, r?)`, `degAtUser(ux, uy)`, `centre()` → `[px,py]`, `centreUser()`, `snap(deg)`.
- `boundary(deg, {placed:true, i?, plain?, animate?})` → index. Draws `g.stat-pie-bound-g > line.stat-pie-bound-line`
  + knob + the 44 px hit `circle.stat-pie-bound[data-hit="pie-bound"][data-placed][data-bound=i]` at the rim
  end; real pointer drag moves it round the rim (`onBoundaryMove`), a press without movement fires
  `onBoundaryPress(i)` (the two-press remove). `{i}` moves an existing boundary. `{plain:true}` draws a
  radius line only (the film). `removeBoundary(i)` (re-indexes `data-bound`), `boundaries()` → `[deg…]`.
- `sector(fromDeg, toDeg, i, {instant?})` → `{ el, done:Promise, from, to }`. `path.stat-sector[data-sector=i]`
  copper tint `rgba(166,82,43,.16)` + 1.2 px copper edge, pressable (`onSectorPress(i)`); the sweep grows
  clockwise from `fromDeg` at pen speed (~0.45 px/ms along the rim, 220–900 ms, rAF with a timer backstop),
  instant under REDUCED. `clearSectors()`.
- `labelPoint(fromDeg, toDeg)` → `{x, y}` CSS px at the mid-angle, 0.65R — for the renderer's HTML
  `.stat-pie-label` overlays. `sectorLabel(from, to, text, {instant?, cls?})` writes SVG text at 0.62R (the
  FILM's label) → `{el, done}`.
- `readout(text, deg?)` — an HTML `.stat-label[data-label-kind="readout"]` in the board's layer beside the
  rim end of the last (or given) boundary; `clearReadout()`. (The renderer's own `.stat-readout` line under
  the board is the renderer's — this is the on-board one; use either.)
- `svg`, `frame`, `layer`, `R`, `relayout()`, `destroy()`.

### `GJ_STATCHART.stemleafFilm(host, spec, opts)` → handle (FILM only)
spec `{ stems:[…], decimals, unit, back?:bool, sides?:[leftLabel, rightLabel], title? }`.
viewBox 400 × (22 + 34·rows + 44). Stem column rules (ink), stems `text.stat-sl-stem[data-stem]`
(mono, 600), leaves `text.stat-sl-leaf[data-stem][data-side][data-k]` (mono, copper-ink), key
`text.stat-sl-key-text`. All ≥13 px rendered.
- `addLeaf(stem, digit, side='right'|'left', {instant?, cls?, ms?, ink?})` → `{el, done}` appends OUTWARD
  (left side grows leftward; `back:true` puts the stem column at centre).
- `key(stem, leaf, means, {instant?, cls?})` → `{el, done}` writes "2 | 1  means  2.1 cm" under the rows.
- `ringLeaf(stem, k, side)` copper ellipse round the k-th leaf (the median beat); `leaves(stem, side)`.
- `svg`, `frame`, `relayout()`, `destroy()`.

## Player ops shipped (`player.js` `applyOp`, chart family; existing ops untouched)
| op | draws | countable element (class) |
|---|---|---|
| `{venn:{circles, n?}}` | `div.ml-board.ml-venn` host → `GJ_STATCHART.venn(…, {append:true})`, centred on the paper | `.ml-venn` |
| `{vfill:{region, text}}` | `vennBd.fill()` write-on (320 ms) | `text.ml-vfill` |
| `{pie:{}}` | `div.ml-board.ml-pie` → `GJ_STATCHART.pie(host, {readOnly:true})`; running angle starts at 0 | `.ml-pie` |
| `{sector:{deg, label?}}` | the NEXT sector clockwise from the running angle, swept at pen speed; then a plain radius at its end (unless it closes 360) and the label at the mid-angle | `path.ml-sector`, `text.ml-sector-label` |
| `{stemleaf:{stems, decimals, unit, back?, sides?, title?}}` | `div.ml-board.ml-stemleaf` → `stemleafFilm` | `.ml-stemleaf` |
| `{leaf:{stem, leaf, side?}}` | one leaf lands in 180 ms | `text.ml-leaf` |
| `{key:{stem, leaf, means}}` | the key line | `text.ml-key` |
| `{lobf:{through:[[x,y],[x,y]]}}` | on the film's OWN `.ml-chart`: the line through the two points extended to the plot edges, pen speed | `path.ml-lobf` |
| `{rule:{x}}` (new form; `{rule:{h}}` unchanged) | a VERTICAL dashed rule at x sliding in | `.ml-rule[data-axis="x"]` |
| `{drop:{}}` after `rule{x}` | up the rule to the lobf (or curve), across to the y axis, y read out `.ml-read` | `.ml-drop` |
`{drop:{}}` after a horizontal `rule{h}` also reads the lobf when no curve is joined.
Every op replays instantly from the op history (`goto`) and instantly under REDUCED (proved at 375).

## Film-law selector additions (tools/qa/sit-pupil.js `KIND` map — orchestrator edits, not me)
```js
venn: '.ml-venn', vfill: '.ml-vfill', pie: '.ml-pie', sector: '.ml-sector',
stemleaf: '.ml-stemleaf', leaf: '.ml-leaf', key: '.ml-key', lobf: '.ml-lobf'
```
(`rule` and `drop` keep `.ml-rule` / `.ml-drop` — the vertical forms carry the same classes.) Plants for
the control gate: `film-no-venn … film-no-lobf` in the same shape as `film-no-table`.

## CSS block for style.css (orchestrator pastes; tokens only — every colour is already inline as a var())
```css
/* ═══ Book A boards (CHART-A, 12 Sept 2026) — venn · pie · stem-and-leaf film · scatter ═══ */
.stat-venn-val { font-family: var(--f-maths); font-weight: 600; }        /* copper-ink is set inline (var(--copper-ink)) */
.stat-venn-label, .stat-sector-label { font-family: var(--f-maths); }
.stat-sl-stem, .stat-sl-leaf, .stat-sl-key-text { font-family: var(--f-stationery, ui-monospace, monospace); }
.stat-pt.is-given circle { fill: var(--ink); }                            /* the page's own data, in ink; hers are copper */
.stat-pt.is-outlier circle { stroke: var(--copper); stroke-width: 2; }
.stat-lobf { stroke: var(--copper); }
.stat-lobf-handle { cursor: grab; }
.stat-lobf-handle:active { cursor: grabbing; }
.stat-sector { fill: rgba(166, 82, 43, 0.16); stroke: var(--copper); }
.stat-sector:focus-visible, .stat-pie-bound:focus-visible, .stat-lobf-handle:focus-visible { outline: 2px solid var(--copper); outline-offset: 2px; }
.stat-pie-rim { cursor: crosshair; }
.stat-pie-bound-line, .stat-pie-radius { stroke: var(--copper); }
.stat-pie-disc { stroke: var(--ink); }
.movie-stage .ml-board { margin: 8px auto; }                              /* a film board sits centred on the paper like the chart */
.movie-stage .ml-board .stat-board-frame { margin: 0 auto; }
```

## Proof output (tools/qa/out/bookA/chart/proof-output.txt — verbatim)
```
== width 375 (reduced motion, goto instant) — film ended on step 8/8
PASS film-draws: every op kind drawn — {"venn":1,"vfill":4,"pie":1,"sector":4,"stemleaf":1,"leaf":3,"key":1,"chart":1,"plot":4,"lobf":1,"rule":1,"drop":1,"stamp":1}
PASS stat-board SVG text >= 13 CSS px rendered (51 texts, min 13.60)
     (player's own .ml-chart text sizes, pre-existing style.css: [8.8,9.6,10.4] — not mine, noted)
PASS venn3 region centres inside their regions (user + CSS round-trip): out✓ A✓ B✓ AB✓ ABC✓ AC✓ BC✓ C✓
PASS film venn2: four vfills each inside its region: [{"region":"AB","at":"AB","ok":true,"text":"22"},{"region":"A","at":"A","ok":true,"text":"59"},{"region":"B","at":"B","ok":true,"text":"26"},{"region":"out","at":"out","ok":true,"text":"23"}]
PASS pie rimPoint(90) is to the right of centre, level with it
PASS pie degAt(rimPoint(d)) ≈ d for d = 0..359 step 37: 0→0 37→37 74→74 111→111 148→148 185→185 222→222 259→259 296→296 333→333
PASS pie question board: 2 sectors, 2 placed boundaries (hit widths 44.0,44.0 px), bounds [156,240], labelPoint(0,156)=237,146
PASS every [data-hit] >= 44 px (lobf handles >= 48)
PASS grid: 5 given (.is-given, no data-placed/hit), points()=1 hers, allPoints()=6
PASS grid: lobf line 1 (box 223,186), handles 2, outlier 1, ends [[8.000000000000002,20],[100,96.66666666666667]]
PASS grid: ruleX(60) + drop() reads the LOBF: {"x":60,"y":63.333333333333336} (line through (20,30),(80,80) gives y=63.33 at x=60)
PASS grid: y.min=20 draws the y-axis break glyph (1 break path; x.min=0 draws none)
     rig at 375: hidden 0, reclaimed 54, margin -54px (phone: not asserted)
PASS zero console errors

== width 1280 (animated advance) — film ended on step 8/8
PASS film-draws: every op kind drawn — {"venn":1,"vfill":4,"pie":1,"sector":4,"stemleaf":1,"leaf":3,"key":1,"chart":1,"plot":4,"lobf":1,"rule":1,"drop":1,"stamp":1}
PASS stat-board SVG text >= 13 CSS px rendered (51 texts, min 13.60)
     (player's own .ml-chart text sizes, pre-existing style.css: [11,12,13] — not mine, noted)
PASS venn3 region centres inside their regions (user + CSS round-trip): out✓ A✓ B✓ AB✓ ABC✓ AC✓ BC✓ C✓
PASS film venn2: four vfills each inside its region: […all four ok:true…]
PASS pie rimPoint(90) is to the right of centre, level with it
PASS pie degAt(rimPoint(d)) ≈ d for d = 0..359 step 37: 0→0 37→37 … 333→333
PASS pie question board: 2 sectors, 2 placed boundaries (hit widths 44.0,44.0 px), bounds [156,240], labelPoint(0,156)=237,146
PASS every [data-hit] >= 44 px (lobf handles >= 48)
PASS grid: 5 given (.is-given, no data-placed/hit), points()=1 hers, allPoints()=6
PASS grid: lobf line 1 (box 223,186), handles 2, outlier 1, ends [[8,20],[100,96.67]]
PASS grid: ruleX(60) + drop() reads the LOBF: {"x":60,"y":63.33}
PASS grid: y.min=20 draws the y-axis break glyph (1 break path; x.min=0 draws none)
PASS laptop reclaim: host 752 px vs law-6 752 px → reclaimed 54 px (margin-left -54px), hidden width now 0 px
PASS zero console errors

ALL PASS
```
(The 1280 rig line reports `host 752` because the measurement runs AFTER the reclaim widened the host from
698; `data-reclaimed=54` is the before/after difference. The scratch page's rig widths at 375 are the same
rig forced to 770 px — the phone path is not what it tests.)

## Decisions
1. **Given points are in the same index space as hers.** `addPoint(…,{given:true})` returns a board index
   like any point; `points()` filters them out (so `S.pts` is hers), `allPoints()` keeps them. Draw `given`
   first so `allPoints()[k]` = `given.concat(toPlot)[k]` for the outlier ask.
2. **A snapping handle means the film's `(80,78)` lands on `(80,80)` on a 5-grid** — `handleAt` snaps like
   every board position (law 9). The scratch uses on-grid handle points; the film's `lobf` op on the
   player's own canvas does NOT snap (it draws exactly what the op says).
3. **Sectors carry no `data-hit`** (they are pressable via pointer-events + `onSectorPress`, and large) so a
   thin sector cannot trip the 44 px hit law; boundaries and the rim do carry `data-hit`.
4. **The film's boundaries are plain radius lines** (`boundary(deg,{plain:true})`), no knobs or hits on a
   read-only picture.
5. **Region centres are computed, not constants** (deepest-point search over the drawn geometry); the
   `out` box prefers a lower corner and avoids the "n =" note.
6. **`reclaimMargin()` runs first in `relayout()`** so the square size and label counter-scale are measured
   on the widened host; it clears its own inline margin before re-measuring, so a resize back to a wide
   body releases the strip (no ResizeObserver loop: the final layout of a pass equals the previous one).
7. **y-axis break glyph sits ON the axis just above the origin** (textbook glyph); a first draft beside the
   axis touched the first y number at phone scale — moved after the screenshot showed it.
8. Byte-stability: the 22 deleted lines in the diff are each replaced by a superset (a default-off flag,
   a `given` guard, `drop()`'s fallback that is bypassed whenever a curve exists, `addHit`'s optional
   `minPx` defaulting to 44, the handle object gaining keys). No existing call site changes behaviour.

## Left / for the orchestrator
- Paste the CSS block; add the eight `KIND` entries (+ their plants) to sit-pupil.js.
- Decide on the pre-existing `.ml-chart` axis text (8.8–10.4 px at 375) — Book C films have it today.
- jotter-stats.js renderers: venn boxes via `regionCenter()` (position `.stat-cell` with
  `translate(-50%,-50%)`), pie via `rimPoint/degAt/boundary/sector/labelPoint` + `root.__statBoard =
  { toPx:(d)=>bd.rimPoint(d), toAxis:(px,py)=>bd.degAt(px,py), snap:bd.snap }` (note rimPoint/degAt are
  frame-relative CSS px), scatter via `addPoint({given:true})`, `handleAt`, `line`, `ruleX+drop`, `enablePress`,
  `markOutlier`.
