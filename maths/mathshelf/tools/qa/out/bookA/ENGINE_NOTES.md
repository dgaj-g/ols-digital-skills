# ENGINE-A notes — statcore.js for Book A (12 Sept 2026)

Package owned exactly: `statcore.js`, `dev/test-statcore.js`, this file. Nothing else touched; nothing committed.

## Floors (before → after)
| suite | before | after |
|---|---|---|
| `node dev/test-statcore.js` | 160 cases, 0 failures | **270 cases, 0 failures** (+110 named cases) |
| `node dev/validate-all.js` | 81 sound | 81 sound (no Book A pack yet — proves nothing broke) |
| `qa-dx-coverage.js` | — | GREEN, 117 checks, 0 failed |
| `qa-selftests.js` | — | GREEN, 12 checks, 0 failed (floor still reads 160 from MATHS_GATES_AUDIT.md) |

**New floor for the orchestrator to write into MATHS_GATES_AUDIT.md: `dev/test-statcore.js` = 270.** FT_RULE_IDS is still 10 (the runner pins it; no FT rule was added — `pie.angle.fromTheirs`'s idea is re-implemented inline in markPie because pie is its own kind, not a `values` slot).

## Exports added to `GJ_STATS`
- `stemLeafOf(value, decimals) → {stem, leaf}` (numbers). decimals 0: 36 → {3, 6}; decimals 1: 3.6 → {3, 6}. One rule: scale to an integer, split at the last digit.
- `stemleafRows(values, decimals) → {'<stem>': [leaf digits ascending as numbers]}` — only stems that hold a value; the renderer unions with `q.stems`.
- `pieAngles(cats, total) → {catId: rational {n,d}}` — f × 360 ÷ total; `total` defaults to Σf.
- `leastSquares(points) → {m, c, meanX, meanY, n}` rationals; `m`/`c` null when every x is equal.
- `lineY(line, x)`, `lineX(line, y)` — `line` is `{m, c}` or two points `[[x1,y1],[x2,y2]]`; null for a vertical/undrawn line; `lineX` null for a flat one.
- `KINDS` — a copy of KINDS_LIST (13 kinds). `isStatKind` now covers the five new kinds.
Every existing export is unchanged in behaviour (all 160 prior cases green, validate-all's 81 unchanged).

## Units per kind (id · band · w · ftEarns)
- **order** cyclic: `PAIR_0…PAIR_{n-1}` — the first n−1 method, the closing pair accuracy, w1, no ft. Not cyclic: `SEQ` accuracy.
- **pick**: `PICK` accuracy · `WHY` method.
- **stemleaf**: `LEAVES` method · `ORDERED` method · `KEY` accuracy (only when `key.ask`).
- **pie**: `ANG_<id>` per cat, method, **ft earns** · `SUM` method · `SECTORS` accuracy **ft earns** · `LABELS` accuracy.
- **scatter**: `POINTS` method w = `q.pointsW || 1` · then only the asked: `LOBF` method · `ESTIMATE` accuracy **ft earns** · `CORR` accuracy · `OUTLIER` accuracy.

## The S shape each model board emits (exact; the renderer and the walker write to these)
Datasets: the cycle (s1 q7), a TV questionnaire pick, M7 Q17 twigs, M7 Q11 sports pie (60), a hand-built 7-point scatter.

### order — `{ seq:[tileIndex…] }`
right `{"seq":[0,1,2,3]}` → OK [1,1] · wrong `{"seq":[0,2,1,3]}` (middle two swapped) → X@1 [0,1], no dx (order has none). A rotation `[2,3,0,1]` marks OK.

### pick — `{ pick: optionIndex, why: 'Q_…' }`
right `{"pick":1,"why":"Q_VAGUE"}` → OK [1,1] · wrong `{"pick":0,"why":"Q_VAGUE"}` (first non-best picked, its own flaw) → X@1 [1,0] (PICK 0, WHY 1).

### stemleaf — `{ rows:{'<stem>':['<leafDigit>',…] in placed order}, key?:{stem:'<stem>', leaf:'<digit>'} }`
right `{"rows":{"2":["2","4","6","7","8","8"],"3":["0","1","3","6","9"],"4":["0","1","4","5"]},"key":{"stem":"3","leaf":"6"}}` → OK [2,1]
wrong `{"rows":{"2":["4","8","8","2","7","6"],"3":["6","1","9","0","3"],"4":["1","5","4","0"]},"key":{"stem":"3","leaf":"6"}}` (printed order) → X@2 [1,1] dx SL_UNORDERED.
Rows hold ONLY the pupil's leaves; prefilled stems (`prefill.stemsDone`) and the `back` side are given and never marked. `key` present only when `key.ask`; it is the first printed value's stem/leaf. Leaves may arrive as strings or numbers.

### pie — `{ angles:{catId:'156',…}, bounds:[b1,…,b(n-1),360], labels:{sectorIndex:catId} }`
right `{"angles":{"fb":"156","rg":"48","hk":"72","ot":"84"},"bounds":[156,204,276,360],"labels":{"0":"fb","1":"rg","2":"hk","3":"ot"}}` → OK [2,2]
wrong `{"angles":{"fb":"43.3","rg":"13.3","hk":"20","ot":"23.3"},"bounds":[43.3,56.6,76.6,360],"labels":{…same}}` (percentages to 1 dp, boundaries drawn to them) → X@1 [0,2] dx PIE_PCT_NOT_DEG (ANG_* all 0, SUM 0, SECTORS ok:2 earns, LABELS 1).
`bounds` are cumulative degrees clockwise from 12 o'clock; the last is fixed 360 and not judged; ±2° on the n−1 placed.

### scatter — `{ pts:[[x,y]…], line:[[x1,y1],[x2,y2]], est:'70', corr:'positive', outlier:6 }` (only the asked keys)
right `{"pts":[[4,9],[5,11],[6,13],[7,15]],"line":[[0,1],[10,21]],"est":"17","corr":"positive","outlier":6}` → OK [2,2]
wrong (this chart: swapped points fall outside the axes, so the first point one square right) `{"pts":[[5,9],…]}` → X@1, POINTS 0 (earned w−1), no dx. Where every swapped point fits the axes the wrong board IS the swap and carries SC_XY_SWAPPED (case SC23). **Pack note:** with `pointsW:2` and marks [2,2] the one-square-right slip still totals mk [2,2] (w−1 + LOBF) — a pack wanting the wrong path to show a dx should pick data whose swap fits the axes, as the contract's first choice does.
`line` = two grid points on the least-squares line at x = chart.x.min and chart.x.max (y snapped to `sq.y`); `est` = the LS reading at `at` snapped to `sq.y` (`sq.x` for `from:'y'`); `outlier` is an index into `given.concat(toPlot)`.

## gist (≤ 28)
order cyclic "Put the cycle in order" (plain list: "Put the cards in order") · pick "Choose the better question" · stemleaf "Stem-and-leaf · n = 15" · pie "Pie chart · 4 sectors" · scatter "Scatter graph · n = 7" (given + toPlot).

## MK_LABELS
order ['Pairs','Order'] · pick ['Reason','Choice'] · stemleaf ['Leaves','Key'] · pie ['Angles','Chart'] · scatter ['Points and line','Readings'].

## REASONS / DX_NAMES
- REASONS gains the ten `Q_*` ids with §17.8's exact texts (Q_OVERLAP, Q_GAP, Q_NO_ZERO, Q_NO_TIME, Q_LEADING, Q_VAGUE, Q_NO_OTHER, Q_ONLY_POSITIVE, Q_PERSONAL, Q_OPEN).
- DX_NAMES gains 13: SL_UNORDERED, SL_WRONG_STEM, SL_MISSED_LEAF, SL_KEY_WRONG, VENN_TOTAL_AS_ONLY, VENN_OUTSIDE_LOST, PIE_PCT_NOT_DEG, PIE_TOTAL_WRONG, PIE_SECTOR_OFF, SC_XY_SWAPPED, SC_LINE_OFF_TREND, SC_READ_WRONG_AXIS, SC_CORR_SIGN — each with ≥ 1 named case (SL6–SL10, VN2–VN6, PI5/PI9/PI15, SC5/SC8–SC10/SC13/SC15/SC20).
- **Stated omission: SL_BACK_DIRECTION.** The tap-first stem zone grows the pupil's side outward by construction, so the slip cannot be made; no detection, no name (case KA4 pins its absence).
- **Left for Book B:** AV_* (7) and RM_* (2) — no detection exists here, so they are not named (a name without a case would fail qa-dx-coverage once staff.js lists it).

## Decisions
1. "Within 1 small square" = |Δ| ≤ `chart.sq.y` vertically, `chart.sq.x` horizontally. `chart.sq = {x, y}` is the axis-value size of one small square — Book C's convention (`cfread`: `tolX = readTol × sq.x`, `ruleAtHeight` uses `sq.y / 2`; packs carry `sq: { x: 2, y: 2 }`, `sq: { x: 20, y: 1 }`). Defaults to 1. Case SC25/SC26 pin it on a grid of 2.
2. qa-dx-coverage reads DX_NAMES from **staff.js source**; staff.js merges `GJ_STATS.DX_NAMES` at runtime (staff.js:611), so Book C's stats codes are not in staff.js's source table either. The new codes are proven reachable as quoted tokens in statcore.js; the gate is green whether or not staff.js's table lists them.
3. `isStatKind` was defined twice (a hoisted duplicate with a literal list won). The duplicate now reads `KINDS_LIST` — one list.
4. stemleaf bands literal to the contract: LEAVES/ORDERED method, KEY accuracy only when asked. A no-key stemleaf has no accuracy unit → its pack marks must be [m, 0] (the reachable-marks rule will say so otherwise).
5. pick WHY ok:1 iff `S.why` is the `flaw` of ANY non-best option, whichever option she picked; else JUDGE_WRONG_REASON (no pick-specific id in §7). So the wrong board fails PICK and earns WHY.
6. pie: ANG_ units `ftEarns:true` (§6.5's default for method units; the qlist cuts are the named exception). ANG of the FIRST category never follows through from itself. **A percentage column is not a follow-through**: when the whole column reads as f·100/total (tolerance 1/20 so a 1-dp percentage counts), every cell is 0 with PIE_PCT_NOT_DEG — otherwise a pie worked entirely in percentages would earn full method marks through FT, which is not sensible marking. PIE_TOTAL_WRONG needs every cell exactly consistent with one T′ ≠ total (only checked when the column is not the percentage column, since percentages are trivially consistent with T′ = 3.6 × total). SECTORS ok:1 within ±2° of the TRUE running totals, ok:2 within ±2° of THEIR running totals (earns), else PIE_SECTOR_OFF. SUM's note says the decimal sum ("99.9, not 360").
7. scatter: ESTIMATE `ftEarns:true` ("ft their line"). LOBF's three tests use `sq.y`; the note names which test failed (middle / wrong way / half). An undrawn or vertical line is 0 with a note, not a dx. `from:'y'` solves the line for x with `sq.x`. SC_CORR_SIGN only when both the said and the true correlation are positive/negative ('none' against a sign is 0, no dx). POINTS one-out / one-missing earns w−1, as cfplot does.
8. Venn dx (§17.1) live in `markValues` via `valuesDx`, and fire only when the pack has not authored `slot.dx` (VN7): VENN_TOTAL_AS_ONLY when an "only" slot (`ft.rule:'venn.only'` or `region` = a circle id) equals that circle's total; VENN_OUTSIDE_LOST when the `region:'out'` slot is 0 or blank, or a `venn.both.fromTotals` slot equals A + B − N. The blank-slot path is unchanged for every slot that is not `region:'out'`.
9. MK_LABELS scatter = ['Points and line','Readings']: DESIGN 17.7 said "Points" / "Line and readings", but LOBF is a METHOD unit, so that tally would misreport; the label follows the bands.
10. Wrong model boards that cannot be the contract's first choice fall back deterministically: stemleaf printed-order-already-sorted → rows reversed → first leaf moved to the next stem (SL21); scatter swap-outside-axes → first point one square right; order n = 2 cyclic is degenerate (a swap is a rotation) and left as is.
11. Marking accepts leaves, indices and points as strings or numbers (the walker and the renderer differ); every value goes through `R()`.

## Proof transcript (final)
```
node dev/test-statcore.js            → statcore selfTest: 270 cases, 0 failures (+0 runner failures) ALL GREEN
node dev/validate-all.js             → 81 questions checked - 81 sound, 0 need attention
NODE_PATH="$(npm root -g)" node tools/qa/qa-dx-coverage.js → GREEN qa-dx-coverage (117 checks passed, 0 failed)
NODE_PATH="$(npm root -g)" node tools/qa/qa-selftests.js   → GREEN qa-selftests (12 checks passed, 0 failed)
```
