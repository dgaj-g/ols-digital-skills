# BOOK B — the build contract every package writes to (13 Sept 2026, Opus 5)

Pack id `stats-averages`, file `content-stats-averages.js`, `GJ_CONTENT['stats-averages']`, engine `'stats'`,
`rules` deep-equal to Book C's. DESIGN = `Claude Work/Maths/MATHS_STATS_DESIGN.md` §17.1 (values: slips, ft rules),
§17.2 (table), §18.2 (content map), §19 (B·s1–s5 films), §16 items 4–7 (hyphenated classes, "width 4", "frequency (x)", men/boys), §4.0 laws.
Book B adds ONE kind, `table`; `values` gains the AV_*/RM_* slip detections and `fig:{type:'list'}`; `judge` uses its existing
per-claim `options` for True / False / Not enough information (TFN_* dx already exist). Book A's contract (tools/qa/out/bookA/CONTRACT_A.md)
shows the shape of every section below; the existing `values` builder, `markValues` and `FT_RULES` (`rm.total`, `rm.newMean`, `avg.mean`, `table.mean`) are the code to extend.

## values — lists, missing values, reverse mean (§17.1, §18.2 s1–s2)
q `{ id, kind:'values', marks:[m,a], prompt, fig?:{ type:'list', values:[…as printed] }, slots:[{ id, label, stat?:'mean'|'median'|'mode'|'range'|'missing'|'total'|'newMean', answer:{n,d}, unit?, earns?:'method'|'accuracy', ft?:{ rule:'rm.total'|'rm.newMean'|'avg.mean', … } }], order?:[slotIds], src }`
S unchanged `{ v:{slotId:'…'} }`.
The engine's slip detections run when a slot is WRONG and the pack has not authored `slot.dx`, using `slot.stat` and `fig.values`:
`AV_MEDIAN_UNORDERED` (stat median; value = the middle of the list in its PRINTED order, or the mean of the middle two, when that differs from the true median) ·
`AV_MODE_AS_FREQ` (stat mode; value = the highest frequency count) · `AV_RANGE_NOT_DIFF` (stat range; value = max, or min, or max + min) ·
`AV_DIV_ROWS` (stat mean; value = sum ÷ the number of DISTINCT values) · reverse mean: `RM_AVERAGED_MEANS` (newMean = the plain average of the two means, or (old mean + x) ÷ 2) · `RM_WRONG_N` (newMean = (their total ± x) ÷ the OLD n).
Each pattern has a named selfTest case; the lint asserts per question that each applicable pattern's value differs from the truth (else `dx: "…" equals the truth`).
Reverse-mean slots: `{ id:'total', stat:'total', label:'Total of the 4 ages', answer:{n:40,d:1}, earns:'method' }` then `{ id:'newMean', stat:'newMean', answer:{n:9,d:1}, ft:{ rule:'rm.newMean', from:['total'], x:5, n:5 } }` (the ft rule carries the extra value and the NEW n; `minus:true` when a value is removed).
Constraint sets (reserve only): `answer:{constraints:{n:5, mean:6, median:5, mode:4}}` — the existing `constraintsHold` marks them; the renderer collects `S.v[slotId + '_set']` from five pad entries (already supported by markValues; the renderer needs a `set:5` slot that opens five boxes — a small extension of BUILD.values).
DOM: as today (`.stat-slots`, `.stat-cell[aria-label]`); a `fig:{type:'list'}` prints the list above the boxes (`.stat-list`).

## table — derived columns, totals, then the reads (§17.2)
q `{ id, kind:'table', marks:[m,a], prompt, cols:[ {id:'x', head, given:[…] } | {id:'cls', head, given:[{lo,hi,text}…]} | {id:'f', head:'Frequency', given:[…]} | {id:'fx', head:'f × x', derive:'f*x'} | {id:'mid', head:'Midpoint', derive:'mid'} | {id:'cf', head:'Cumulative frequency', derive:'cum'} ], totals?:['f','fx'], asks:[ {type:'value', id:'mean', label:'Mean =', answer:{n,d}, ft:'sum(fx)/sum(f)', dp?:2}, {type:'row', id:'modal', label:'Modal class', answer:rowIndex}, {type:'row', id:'medianClass', label:'Class containing the median', answer:rowIndex} ], src }`
— `derive:'f*x'` multiplies the `f` column by the `x` column (or by `mid` when the table has a `mid` column); `derive:'mid'` = (lo + hi) ÷ 2 of the `cls` column; `derive:'cum'` = the running total of `f`. A grouped table's `cls.given` carries `lo`/`hi` boundaries and the printed `text` ("0-10", "0 < p ≤ 3"); §16 item 4: render `text` as printed, mark from lo/hi.
S `{ cells:{ fx:['23','96',…], mid:[…], cf:[…] }, totals:{ f:'20', fx:'503' }, asks:{ mean:'25.15', modal:2, medianClass:2 } }` — cells hold strings as keyed (empty string = blank); row asks hold a row index (0-based) or null.
Units, in table order then ask order: `C_<col>_<i>` per derived cell (method w1; ok:1 exact; ok:2 iff the cell is consistent with the PUPIL's own inputs in that row — fx = f × their mid; cf = their previous cf + f); `T_<col>` per total (method w1; ok:1 exact; ok:2 iff the sum of THEIR column); value asks `A_<id>` (accuracy w1; ok:1 exact, or within the `dp` rounding when `dp` is set; ok:2 iff `ft` reproduces the value from THEIR cells — `sum(fx)/sum(f)` over their fx cells and their f total); row asks `A_<id>` (accuracy w1; exact index).
dx: `AV_MEDIAN_CLASS_OFF` (a row ask one row off), `AV_DIV_ROWS` (mean = Σfx ÷ the number of rows), `AV_NO_MIDPOINT` (the mid column equals the class upper (or lower) bounds), `AV_FX_NOT_SUMMED` (mean = Σ(mid) ÷ rows — frequencies ignored). Tally labels `['Table', 'Answers']`.
Model board: right = every derived cell, total and ask true; wrong = `AV_DIV_ROWS` (the mean divided by the number of rows) with every cell right — or, for a table with no value ask, the median row one off.
DOM: host `.stat-tablekind`; the table `table.stat-table.stat-table-edit`: given cells plain `td`, derived cells `button.stat-cell[data-col="fx"][data-row="2"][aria-label="<head>, row 3"]`, the totals row `button.stat-cell[data-col="f"][data-row="total"][aria-label="Total <head>"]`; the numpad in the dock (`makeNumPad`, `decimal:true`), auto-advance down the column then to the next derived column, then the totals; after the cells, the asks: value asks as `.stat-slots` rows (`.stat-cell[aria-label="<label>"]`), row asks as a pressable button per row `button.stat-rowpick[data-ask="modal"][data-row="i"]` (one ask at a time; the chosen row `aria-pressed="true"`, copper highlight; press again clears).
Stages `empty · filling · asking · ready` (`asking` dropped when there are no asks). Pills "Fill the table" · "The answers". Check `statCheckTable` "Mark my table and answers"; locked-why `statTableWhyCells` "Fill in at least one box of the table first." · `statTableWhyAsks` "Answer every question under the table first."
Drive channel: none (no board). The walker keys each derived cell by `aria-label`, each total, each value ask by label; presses `.stat-rowpick[data-ask][data-row]` for a row ask.

## judge with True / False / Not enough information
`claims:[{ text, options:['True','False','Not enough information'], verdict:'True'|'False'|'Not enough information' }]`; the existing options mechanism; `TFN_GROUPED_EXACT` / `TFN_ESTIMATE_AS_FALSE` already fire. The lint proves each verdict (§20.3): TRUE by computation, FALSE by computation, NEI by constructing two consistent datasets.

## Strings (GJ_STRINGS.pupil, strings.js — the orchestrator's)
`statCheckTable`, `statTableWhyCells`, `statTableWhyAsks`, `statPillTableFill`, `statPillTableAsks`, `statStageTableFill` ("Fill in the {head} column from the top row down. Choose a box, then use the pad. ({n} of {m} filled.)"), `statStageTableTotals`, `statStageTableAsks` ("Now the questions under the table: {label}."), `statStageTableRow` ("Choose the row of the table that is the {label}."), `statTableTotal` ("Total"). Bare "tap"/"click" never.

## Films (§19 B·s1–s5) use existing ops only: write, ring, bracket, table, tcell, stamp, box, note, tick. `bracket {i, j}` on a written list line brackets the middle two (the "circle the middle two" beat); `ring {i}` rings one value.
