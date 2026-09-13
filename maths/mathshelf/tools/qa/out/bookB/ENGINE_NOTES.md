# ENGINE-B notes — statcore.js for Book B (13 Sept 2026)

Package owned exactly: `statcore.js`, `dev/test-statcore.js`, this file. Nothing else touched; nothing committed.

## Floors (before → after)
| suite | before | after |
|---|---|---|
| `node dev/test-statcore.js` | 270 cases, 0 failures | **360 cases, 0 failures** (+90 named cases: TB1–49, LS1–5, AV1–14, RM1–12, CS1–10) |
| `node dev/validate-all.js` | 113 sound | 113 sound (no Book B pack yet — proves nothing broke) |
| `qa-dx-coverage.js` | GREEN 117 | GREEN, 117 checks, 0 failed |
| `qa-selftests.js` | GREEN 12 | GREEN, 12 checks, 0 failed (floor still reads 270 from MATHS_GATES_AUDIT.md) |

**New floor for the orchestrator to write into MATHS_GATES_AUDIT.md: `dev/test-statcore.js` = 360.** FT_RULE_IDS is still 10 (the runner pins it; `rm.newMean` gained an OPTION, not a new id). The runner now pins KINDS = 14, MK_LABELS covers `table`, `tableDerive`/`listStats` exported, and all nine AV_*/RM_* ids named.

## Exports added to `GJ_STATS`
- `tableDerive(q) → { rows, cells:{col:[rational…]}, totals:{col:rational}, n, sumFx, mean:rational|null, modalRow, medianRow, mid:[rational…]|null, fId, xId, midId }`
  `cells` holds every NUMERIC column (given ones read as rationals, derived ones computed; the class column is not in `cells`). `totals[col]` for every numeric column (not only `q.totals`). `mean` = Σ(f × mid-or-x) ÷ Σf (null when there is no f or no value column). `modalRow` = the first row with the largest f; `medianRow` per the rule below; both −1 when there is no f column.
  Derivations: `derive:'f*x'` = f × mid when the table has a `derive:'mid'` column, else f × x; `derive:'mid'` = (lo + hi) ÷ 2 of the class column (the column whose `given[0]` is an object with `lo`); `derive:'cum'` = the running total of f.
- `listStats(values) → { mean, median, mode:[rational…], range, n, sum, maxFreq, distinct }` — exact rationals. `mode` is EMPTY when every distinct value appears equally often and there is more than one distinct value (no mode); `[v]` for a single value repeated; several when they tie.
- `KINDS` is now 14 (`table` joined); `isStatKind('table')` true.
Every existing export is unchanged in behaviour (all 270 prior cases green; validate-all's 113 unchanged).

## The median-class rule (decided, pinned by TB5 / TB23 / TB32 / TB44)
The median of n values is the ((n + 1) ÷ 2)th value; **the median row is the first row whose cumulative frequency reaches (n + 1) ÷ 2** (`rle(half, running)`). Sweets n = 20 → position 10.5 → cf 1, 5, 14 → row 2 (the 10th and 11th bags both hold 25). Heathrow n = 55 → position 28 → cf 27, 37 → row 1 ("10-20"). Cats n = 30 → position 15.5 → cf 6, 19 → row 1. The same (n + 1) ÷ 2 the list `medianOf` uses, so a pupil taught one rule meets one rule; where n ÷ 2 and (n + 1) ÷ 2 would name different rows (cf exactly n ÷ 2 at a row boundary) this engine names the LATER row — CCEA's "the class containing the 10.5th value".

## `table` — units, S, marking
**Units** (`tableUnits`), in table order then ask order:
- `C_<col>_<i>` per derived cell, label "<head>, row i+1", **method w1 ftEarns** — ok:1 exact; ok:2 iff consistent with THEIR row inputs: `f*x` = f × their mid (only when a mid column exists — with a given x there is no pupil input in the row, so exact only); `cum` = their previous cf + f (row 0 follows nothing); `mid` never follows through.
- `T_<col>` per `q.totals` entry, label "Total <head lower-cased>", **method w1 ftEarns** — ok:1 exact; ok:2 iff = the sum of THEIR column (every cell filled). A given column's total (T_f) is exact only.
- `A_<id>` per ask, label = ask label, **accuracy w1**; a value ask with `ft` has `ftEarns:true` (the CCEA "M1 for ÷ their total" pattern — DESIGN §17.2); a row ask `ftEarns:false`.
**S** (the contract's, exactly): `{ cells:{ fx:['23','96','225','78','81'], mid:[…], cf:[…] }, totals:{ f:'20', fx:'503' }, asks:{ mean:'25.15', modal:2, medianClass:2 } }` — cell/total strings ('' = blank); row asks a 0-based index (a numeric string also marks — the walker sends strings), null/undefined/'' = "no row chosen".
**Value ask:** ok:1 iff |mine − answer| ≤ dpTol where dpTol = 5 × 10^−(dp+1) ("within the dp rounding" = half a unit in the dp-th place; exact when no dp — so 1.33 passes 4/3 at dp 2, 1.3 fails). ok:2 iff the `ft` reproduces mine from THEIR table: `ft` is the single closed form `sum(<a>)/sum(<b>)`; `sum(col)` = their total of that column when `q.totals` lists it and they wrote one, else the sum of their cells (every cell filled), and a given column's sum is the truth. Same dpTol on the FT match.
**dx:** `AV_DIV_ROWS` when a value ask = Σfx ÷ rows (within dpTol) · `AV_FX_NOT_SUMMED` when it = Σmid ÷ rows (Σx ÷ rows for an ungrouped table — the same slip) · `AV_NO_MIDPOINT` per mid cell equal to that class's hi OR lo · `AV_MEDIAN_CLASS_OFF` when a row ask whose id or label contains "median" is exactly one row off (a modal row one off has no name — "Median class off by one row" would misreport it).
**gist:** a value ask → "Mean from a table · N rows"; else a class column → "Grouped table · N classes"; else "Frequency table · N rows". **MK_LABELS** `['Table','Answers']`.
**Model board** (`tableBoard`): right = every derived cell, total and ask true — a value ask with `dp` is written ROUNDED to dp (a non-terminating mean with no dp cannot be typed and the lint's model-marks-full check will say so — the pack must set `dp`). Wrong = the value ask at Σfx ÷ rows (to dp) with every cell right → AV_DIV_ROWS; with no value ask, the median row ask one off (+1, or −1 on the last row) → AV_MEDIAN_CLASS_OFF; failing that, the first row ask one off; failing that, the first derived cell + 1.
**Pack note on marks:** with marks [m, 1] and three asks, the ÷-rows slip still earns the single accuracy mark from the two row asks (mk full, res X@…). CCEA pays the mean 3 (M1 M1 A1) and each class read 1 — a pack wanting the slip to COST a mark carries e.g. `marks:[2,3]` (TB8/TB21 use it: the wrong board then marks [2,2]).

## `values` — the slips (DESIGN §17.1), `valuesDx(slot, q, mine, got)`
Fire only when the slot is WRONG and the pack authored no `slot.dx` (VN7 still pins the authored dx winning). Keyed on `slot.stat` against `q.fig.values` (the list as PRINTED):
- `median`: mine = `medianOf(printed list unsorted)` and that ≠ the true median → `AV_MEDIAN_UNORDERED` (a printed list already in order makes the slip invisible — no false name, AV9).
- `mode`: mine = the highest frequency count → `AV_MODE_AS_FREQ`.
- `range`: mine = max, or min, or max + min → `AV_RANGE_NOT_DIFF`.
- `mean`: mine = sum ÷ the number of DISTINCT values → `AV_DIV_ROWS` (invisible when every value is distinct).
- `newMean`: `RM_AVERAGED_MEANS` when mine = (old mean + x) ÷ 2 (or (old mean + `ft.mean2`) ÷ 2 when a pack carries a second group's mean); `RM_WRONG_N` when mine = (their total ± x) ÷ the OLD n. The old mean and n are read from the total slot's `rm.total` rule (`slot.ft.from[0]` → that slot's `ft.mean`/`ft.n`), or from this slot's own `ft.oldMean`/`ft.oldN` when given; "their total" = their value in the `from` slot, the true total when blank.
`slipValue(stat, vals)` is ONE function shared by the dx and the wrong model board (they can never disagree).
**`rm.newMean` gains optional `xFrom`:** a slot id whose value replaces the constant `x`, so the laps chain (their 10-lap total − their 8-lap total, ÷ 2) follows through BOTH totals (RM8–RM10). No new rule id.
**Constraint slots (`set:5`):** the renderer stores `S.v[slot.id + '_set']` as five strings; `S.v[slot.id]` itself is never written. `markValues` now reads the set FIRST for a constraints slot (before this cut, the `!mine` blank test ran first and a set-only slot was always "left blank" — fixed). `constraintsHold` checks n / mean / median / **mode** (the set's ONE mode equals it — new; the contract's example needs it) / range, all exact via `listStats`. An empty set → "left blank".
**Model board** (`valuesBoard`): right = every slot's answer (`rstr2`); a constraint slot gets `constraintSet(cons)` — a small whole-number search that returns one satisfying set (mean 6 · median 5 · mode 4 → [4, 4, 5, 6, 11]). Wrong = the FIRST slot in `order` whose `stat` has a visible slip: median → the printed-order middle; mode → its frequency; range → the maximum; mean → sum ÷ distinct; newMean → (total ± x) ÷ old n (RM_WRONG_N); when no slot can slip visibly, the first slot + 1 (unchanged), and a constraint set has its last value + 1.

## DX_NAMES (+9, §7's exact texts)
AV_DIV_ROWS · AV_MEDIAN_UNORDERED · AV_MODE_AS_FREQ · AV_RANGE_NOT_DIFF · AV_NO_MIDPOINT · AV_FX_NOT_SUMMED · AV_MEDIAN_CLASS_OFF · RM_AVERAGED_MEANS · RM_WRONG_N — each fires in ≥ 1 named case AND is shown NOT firing on a right answer (AV1, RM1, TB8, TB34). qa-dx-coverage reads DX_NAMES from staff.js's source (Book A decision 2), so these codes are outside its table — reachable as quoted tokens in statcore.js regardless.

## Selftest pins changed (two, both to stay true)
KA1 `!isStatKind('table')` → `!isStatKind('histogram')`; KA4 dropped its `AV_DIV_ROWS === undefined` half (Book B has arrived). No case deleted.

## Decisions (numbered, for the orchestrator)
1. Median row = first cf ≥ (n + 1) ÷ 2 (above). 2. Value-ask FT EARNS (ftEarns:true) — the mark scheme's "÷ their total". 3. dp tolerance = half a unit at dp; the same on FT. 4. AV_NO_MIDPOINT is per CELL (hi or lo) not per column — a pupil who did it once has the misconception. 5. AV_MEDIAN_CLASS_OFF only on asks named "median"; modal one-off unnamed. 6. AV_FX_NOT_SUMMED covers Σx ÷ rows on ungrouped tables. 7. `ft` on a value ask is one closed regex form, not an expression language. 8. `rm.newMean` `xFrom` (option, no new id). 9. constraints gain `mode`; the set is read before the blank test. 10. `listStats.mode` = [] for "no mode". 11. valuesBoard wrong picks the first slot WITH a visible slip (so a reverse-mean item's `total` slot, which has none, is skipped and `newMean` slips). 12. The tableBoard writes dp-rounded asks; packs with non-terminating means must set `dp`.

## Proof transcript (final)
```
node dev/test-statcore.js            → statcore selfTest: 360 cases, 0 failures (+0 runner failures) ALL GREEN
node dev/validate-all.js             → 113 questions checked - 113 sound, 0 need attention
NODE_PATH="$(npm root -g)" node tools/qa/qa-dx-coverage.js → GREEN qa-dx-coverage (117 checks passed, 0 failed)
NODE_PATH="$(npm root -g)" node tools/qa/qa-selftests.js   → GREEN qa-selftests (12 checks passed, 0 failed)
```
