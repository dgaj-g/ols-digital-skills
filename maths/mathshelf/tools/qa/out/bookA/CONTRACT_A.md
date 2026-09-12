# BOOK A — the build contract every package writes to (12 Sept 2026, Opus 5)

Pack id `stats-collect`, file `content-stats-collect.js`, `GJ_CONTENT['stats-collect']`,
engine `'stats'`, `rules` deep-equal to Book C's. DESIGN = `Claude Work/Maths/MATHS_STATS_DESIGN.md`
§17 (kinds), §18.1 (content map), §19 (movies), §4.0 (laws), §6/§7 (engine, dx).
Existing patterns to copy: `statcore.js` (units via `U(id,label,band,w,ftEarns)`, `row()`,
`markValues`, `FT_RULES`, `REASONS`, `*Board(q, wrong)` model boards, `gist`, selfTest `T()`),
`jotter-stats.js` (BUILD.<kind>(ctx) returning `{start,reset,restore,state,ready,lock,showTruth,ghost,board?}`),
`tools/qa/lib/drive.js` (press routes from the model board's `S`), `tools/qa/lib/walk-moves.js`.

Kinds Book A adds: `order`, `pick`, `stemleaf`, `pie`, `scatter`; `values` gains `fig`
(`venn2`, `venn3`, `stemleaf`); `judge` gains the `Q_*` reason bank (§17.8). `judge` itself is unchanged.

## Question schemas and S shapes

### order (§17.3)
q `{ id, kind:'order', marks:[m,a], prompt, tiles:[str…], answer:[tileIndex…], cyclic?:true, src }`
S `{ seq:[tileIndex…] }` — indices of `tiles` in the order placed.
Units: cyclic → `PAIR_0…PAIR_{n-1}` (pair i = seq[i]→seq[(i+1)%n] must be an adjacent pair of the answer cycle;
ok:1 each; the first n−1 are band `method` w1, the closing pair `accuracy` w1 — a rotation earns full marks);
not cyclic → one `SEQ` unit (band `accuracy`) exact. No dx for order.
Model board: right = `answer`; wrong = right with the middle two swapped.
DOM: host `.stat-order`; tray `[data-tray="order-tiles-<qid>"]` items `button[data-tray-item]` (text = tile),
deranged from the answer order; row `.stat-row` of placed `.stat-tile[data-placed]` (two-press returns one);
stages `tray · ordering · selected · ready`; one pill (no strip). Check `statCheckOrder` "Mark my order";
locked-why `statOrderWhy` "Put every card in the row first."

### pick (§17.4)
q `{ id, kind:'pick', marks:[1,1], prompt, options:[{ text, boxes?:[str…], best:true|false, flaw?:'Q_…' }], src }`
— every option is from the source page; exactly one `best:true`; every other option carries one `flaw` id from the Q_* bank.
S `{ pick: optionIndex, why: 'Q_…' }`
Units: `PICK` (accuracy, exact index) then `WHY` (method): ok:1 iff `why` is the `flaw` of ANY rejected option; else 0 dx `JUDGE_WRONG_REASON`.
Model board: right = best index + the first rejected option's flaw; wrong = the first non-best option picked (its own flaw as why).
DOM: host `.stat-pick`; options tray `[data-tray="pick-options-<qid>"]` items `button.stat-option[data-tray-item]`
(text, then boxes as `.stat-option-box` spans), pressed → `aria-pressed="true"`; reason tray
`[data-tray="pick-why-<qid>"]` items `button[data-tray-item][data-reason="Q_…"]` (text from `GJ_STATS.REASONS`),
shown once an option is pressed; stages `empty · picked · ready`; pills "Choose the better question" · "Say why".
Check `statCheckPick` "Mark my choice"; whys `statPickWhy` "Choose the better question first." · `statPickWhyWhy` "Say why the others fall short first."

### values with a figure (§17.1)
q as today plus `fig`: 
- `{ type:'venn2', n, circles:[{id:'A',label:'Milk'},{id:'B',label:'Sugar'}], totals:{A:81,B:48} }`;
  each slot carries `region:'A'|'B'|'AB'|'out'`.
- `{ type:'venn3', n, circles:[{id:'A',…},{id:'B',…},{id:'C',…}], totals:{A,B,C} }`; regions `A B C AB AC BC ABC out`.
- `{ type:'stemleaf', stems:[…], rows:{'2':[4,6,8,8],…}, key:{stem,leaf,means}, decimals, unit }` — drawn read-only, slots listed under it.
FT rules already in `FT_RULES`: `venn.only` (`ft:{rule:'venn.only', of:'A', from:['both']}`), `venn.outside`, `venn.both.fromTotals`, `sl.read`.
S unchanged `{ v:{slotId:'59',…} }`.
DOM: host `.stat-fig` holding `svg.stat-board` (statchart `venn`) and HTML overlay boxes
`button.stat-cell[data-region="AB"][aria-label="<slot label>"]` positioned over the regions (HTML so the overlap law judges them);
slots with no region stay in `.stat-slots` as today. Every `.stat-cell` has `aria-label` = the slot label (drive.js opens boxes by label).
Stages unchanged `empty · filling · ready`.

### stemleaf (§17.5)
q `{ id, kind:'stemleaf', marks:[m,a], prompt, values:[numbers as printed], stems:[int…], unit:'cm'|'g'|'kg'|'marks', decimals:0|1,
   key?:{ ask:true } | { stem, leaf, means } (given), back?:{ label:'Girls', mine:'Boys', values:[…] } (the given side, fully drawn on the left),
   prefill?:{ stemsDone:[0,1,2,3] }, src }`
Stem/leaf split: decimals 0 → stem = floor(v/10), leaf = v mod 10; decimals 1 → stem = floor(v), leaf = round(10·frac).
S `{ rows:{'<stem>':['<leafDigit>',…] in placed order}, key?:{ stem:'<stem>', leaf:'<digit>' } }` — rows hold only the PUPIL's leaves (prefilled rows are given).
Units: `LEAVES` (method w1: every non-prefilled value present exactly once on its true stem; else dx `SL_WRONG_STEM` if a leaf sits on a wrong stem, `SL_MISSED_LEAF` if a value is missing or doubled),
`ORDERED` (method w1: every row non-decreasing outward; dx `SL_UNORDERED`), `KEY` only when `key.ask` (accuracy w1: the tapped stem row of the TRUE data contains the tapped leaf; dx `SL_KEY_WRONG`).
Model board: right = rows sorted ascending per stem, key = first value's stem/leaf; wrong = rows in PRINTED order (`SL_UNORDERED`).
DOM: host `.stat-stemleaf`; diagram `.stat-sl` (a table: stem column `.stat-sl-stem`, per stem a pressable zone `button.stat-sl-zone[data-stem="N"]`
holding leaves `span.stat-sl-leaf[data-placed]` — a placed leaf two-presses back to the tray; prefilled and back-side leaves are plain spans, not `[data-placed]`);
leaf tray `[data-tray="stemleaf-leaves-<qid>"]` items `button[data-tray-item]` text = FULL value ("3.6"), deranged from ascending;
key (when asked): two trays `[data-tray="stemleaf-keystem-<qid>"]` (the stems) and `[data-tray="stemleaf-keyleaf-<qid>"]` (digits 0–9), the key line `.stat-sl-key` reads "2 | 1 means 2.1 cm".
Interaction: press a tray leaf (selects it, stage `leaf-selected`), press a stem zone → it lands at the END of that row.
Stages `tray · leaf-selected · placing · placed · key · ready` (`key` only when asked; `placed` = every leaf on, key still to build — dropped when no key is asked).
Pills "Place the leaves" · "Write the key". Check `statCheckStemleaf` "Mark my diagram"; whys `statSlWhy` "Put every leaf on a stem first." · `statSlKeyWhy` "Build the key first."

### pie (§17.6)
q `{ id, kind:'pie', marks:[2,2], prompt, cats:[{id,label,f}…], total, src }` (lint: total = Σf; every f·360/total an integer).
S `{ angles:{catId:'156',…}, bounds:[b1,…,b(n-1),360] (cumulative degrees clockwise from 12 o'clock, the last fixed at 360), labels:{sectorIndex:catId} }`
Units: `ANG_<id>` per cat (method w1; ok:1 iff f·360/total; ok:2 iff f·(their first angle ÷ its f) — `pie.angle.fromTheirs`; dx `PIE_PCT_NOT_DEG` when their column equals f·100/total, `PIE_TOTAL_WRONG` when their angles are consistent with one wrong total),
`SUM` (method w1: their angles sum to 360), `SECTORS` (accuracy w1, ftEarns: each placed boundary within ±2° of the running total of THEIR angles; dx `PIE_SECTOR_OFF`),
`LABELS` (accuracy w1: sector i carries cats[i]).
Model board: right = true angles, cumulative bounds, labels in order; wrong = angles as percentages (PIE_PCT_NOT_DEG), bounds consistent with them, labels right.
DOM: host `.stat-pie`; stage 1 table `.stat-table` with angle cells `button.stat-cell[aria-label="<label> angle"]`; `.btn-stage.stat-next` "Next: draw the sectors";
stage 2 `svg.stat-board` in `.stat-board-frame` (statchart `pie`): radius at 12 o'clock, rim `[data-hit]`, boundaries `.stat-pie-bound[data-placed][data-hit]`
(the last placed can be two-pressed away), read-out `.stat-readout` ("144°"), a ±1° nudge pair `.nudge-pad`; `.btn-stage.stat-draw` "✓ Draw the pie chart";
after drawing, sectors `path.stat-sector[data-sector="i"]` are pressable and the label tray `[data-tray="pie-labels-<qid>"]` items `button[data-tray-item]` (text = cat label) land as HTML overlays `.stat-pie-label[data-placed]`.
Drive channel `root.__statBoard = { toPx(deg) → [px,py] on the rim, toAxis(px,py) → deg, snap }`.
Stages `table · table-done · rim · bounds-done · drawn · ready`. Pills "Work out the angles" · "Draw the sectors" · "Label the chart".
Check `statCheckPie` "Mark my pie chart"; whys `statPieWhyTable` "Fill in every angle first." · `statPieWhyRim` "Place every sector boundary first." · `statPieWhyDraw` "Press ✓ Draw the pie chart first." · `statPieWhyLabels` "Put a label on every sector first."

### scatter (§17.7)
q `{ id, kind:'scatter', marks:[m,a], prompt, chart:{ x:{min,max,step,label}, y:{min,max,step,label}, sq }, given:[[x,y]…], toPlot:[[x,y]…],
   asks:[ {type:'lobf'}, {type:'estimate', from:'x'|'y', at:60, want:'y'|'x'}, {type:'corr', answer:'positive'|'negative'|'none'}, {type:'outlier', answer:index into given.concat(toPlot)} ], table?:{ head:[a,b], rows:[[a,b]…] }, src }`
(an axis whose `min` > 0 is drawn with the break glyph statchart already has for Book C's javelin curve).
S `{ pts:[[x,y]…], line:[[x1,y1],[x2,y2]], est:'70', corr:'positive', outlier:6 }`
Units: `POINTS` (method, w = 2 when the paper pays 2 for plotting — the pack sets `pointsW`; set equality with `toPlot` on the grid; dx `SC_XY_SWAPPED` when the swapped set matches),
`LOBF` (method w1: ok:1 iff the line passes within 1 small square (vertically) of the mean point of ALL points, its slope has the trend's sign (sign of the least-squares slope), and at least half the points lie within 1 square of it vertically; else `SC_LINE_OFF_TREND`),
`ESTIMATE` (accuracy w1: ok:1 within 1 square of the least-squares line's reading at `at`; ok:2 within 1 square of THEIR line's reading; dx `SC_READ_WRONG_AXIS` when `est` equals `at`),
`CORR` (accuracy w1; dx `SC_CORR_SIGN`), `OUTLIER` (accuracy w1, exact). Only the units the `asks` name exist (POINTS always).
Engine helpers: `GJ_STATS.leastSquares(points) → {m, c, meanX, meanY}` (rationals), `GJ_STATS.lineY(line, x)`.
Model board: right = toPlot, line = two grid points on the least-squares line at x = the chart's first and last major, est = LS reading at `at` (nearest 1 small square), corr, outlier;
wrong = toPlot with x and y swapped when every swapped point is inside the axes, else the first point one square right (POINTS 0).
DOM: host `.stat-scatter`; `svg.stat-board` in `.stat-board-frame` (statchart grid as cfplot); given points `.stat-pt.is-given`, placed `.stat-pt[data-placed][data-hit]`;
per stage a `.btn-stage.stat-next` ("Next: draw the line" · "Next: read the estimate" · "Next: name the correlation" · "Next: find the odd one out");
line handles `.stat-lobf-handle[data-hit]` (48 px, real pointer drag on the SVG moves them; the line runs across the whole chart through both);
estimate = the cfread rule mechanic at x = `at` (a vertical rule `.stat-rule` with its read-out) then `makeNumPad` in the dock;
correlation tray `[data-tray="scatter-corr-<qid>"]` items `button[data-tray-item]` (Positive · Negative · No correlation); outlier: press a point → `.stat-pt.is-outlier`.
Drive channel as cfplot: `root.__statBoard = { toPx(x,y), toAxis(px,py), snap }`.
Stages `plotting · plotted · line · estimate · corr · outlier · ready` (only the asked ones). Pills "Plot the points" · "Draw the line" · "Estimate at {at}" · "Name the correlation" · "Find the odd one out".
Check `statCheckScatter` "Mark my graph"; whys `statScWhyPlot` "Plot every point first." · `statScWhyLine` "Draw the line of best fit first." · `statScWhyEst` "Read the estimate and enter it first." · `statScWhyCorr` "Choose the correlation first." · `statScWhyOutlier` "Choose the reading that looks wrong first."

### judge (unchanged kind) — the Q_* bank
`GJ_STATS.REASONS` gains §17.8's ten ids with their exact texts. A questionnaire-critique question's claims are
conclusions a person might draw about the printed question ("These response boxes are well chosen."), `fair:false` with one `why` (`alsoWhy` for the
question's other flaws), plus one `fair:true` claim where the source supports it. `reasons:[ids]` on the question limits the bank offered (deranged).

## Player ops Book A adds (§19; CHART package, `player.js` `applyOp` → `GJ_STATCHART`)
`{venn:{circles:[{id,label}…], n?}}` lays the circles · `{vfill:{region:'AB', text:'22'}}` writes a value into a region ·
`{pie:{}}` draws the circle + radius · `{sector:{deg, label}}` sweeps the next sector clockwise at pen speed · `{stemleaf:{stems:[…], decimals, unit}}` lays the stems ·
`{leaf:{stem, leaf}}` lands one leaf · `{key:{stem, leaf, means}}` writes the key line · `{lobf:{through:[[x,y],[x,y]]}}` draws a line at pen speed on the current chart.
Existing: `write ring box tick note stamp table tcell chart plot curve rule drop scale marker bracket`. Every op kind drawn at the film's end is the film-draws law.

## Strings
Every pupil sentence lives in `GJ_STRINGS.pupil` (strings.js) or the pack — never a literal in a renderer. Book A's keys are named above; the stage
instructions are `statStage<Kind><Stage>` and name the whole act before the control (DESIGN 4.0 [Correction, 11 Sept]). Bare "tap"/"click" never.
The `tray` fiction line (`statTrayFiction`) is said once per book at its first tray; Book A's first tray is s1 q7's order tiles → `statTrayFictionOrder`.
