# MathShelf — module interfaces (build contract)

Plain ES5-compatible vanilla JS, no modules/build step. Each file attaches ONE global.
Load order in index.html:
`qrcode.min.js → mathcore.js → anglecore.js → content-angles.js → content-algebra.js → player.js → jotter.js → staff.js → script.js`
(script.js is the shell and boots last. All files must parse standalone — no top-level await,
no template-literal `</script>` hazards, ASCII-safe where possible; UI strings may use Unicode.)

## Rational numbers
Everywhere a number can be non-integer use `{n: int, d: int}` (normalised, d>0, gcd 1).
Helpers live in mathcore (`GJ_MATH.rat(n,d)`, `.radd .rsub .rmul .rdiv .req .rneg .rfromstr .rtostr`).

## window.GJ_MATH (mathcore.js — pure, no DOM)
- `parse(str)` → `{ok:true, ast}` | `{ok:false, err}`. Accepts: ints, decimals, fractions `a/b`,
  `x`, `x²` (also `x^2`, `x2` rejected), implicit mult `5(x−3)`, `2x`, unary minus, ASCII `-*/+`
  AND unicode `− × ÷`, brackets, `=` (0 or 1 per line). Whitespace-tolerant.
- `canonSide(ast)` → `{c2:{n,d}, c1:{n,d}, c0:{n,d}}` (quadratic-or-lower poly in x) | `null`.
- `lineKind(parsed)` → `'eq'` (has =) | `'expr'`.
- `eqStep(prevStr, nextStr)` → verdict for a solving step:
  `{ok:'sound'|'notequiv'|'identity'|'parse', dxText?:string}` — sound iff both are linear-or-
  factorable equations with EXACTLY equal solution sets (exact rational; identity/contradiction
  guarded; degree-change guarded e.g. multiplying both sides by x).
- `exprStep(prevStr, nextStr)` → same idea for expression manipulation (canonical poly equality).
- `inferOp(prevStr, nextStr)` → `{op:'+'|'-'|'*'|'/', operand:{n,d}}` | `{op:'rewrite'}` | `null`
  (inference from canonical deltas; used as teacher-facing cross-check, never pupil-facing).
- `evalCalc(str)` → `{ok, val:{n,d}}` — numeric calc strings like `180-38-74`, `(2*4)+7`, no x.
- `substEval(exprStr, vars)` → `{ok, val}` where `vars = {a:{n,d}, …}`.
- `checkQuestion(q, attempt)` → THE marker. `attempt = {L:[{op,t}], fin}` (see jotter state).
  Returns `{perLine:[{ok:0|1|2, dx:string|null, note?:string}], res:'OK'|'X@n'|'AMBER', mk:[method,acc],
  mkMax:[m,a]}` where ok: 1 sound · 0 first error · 2 follow-through-sound-after-error.
  Implements: any-valid-route, FT after first error (consistency vs pupil's own wrong line),
  answer-without-working → AMBER + method withheld, dx matched from `q.dx` map (canonicalised
  comparison, not string match) else auto-cluster key = canonical form of the wrong line.
- `selfTest()` → `{pass:bool, failures:[string]}` — ≥60 cases incl. every dx, ÷5-first routes,
  fraction answers, negative coefficients, identity traps, degree traps, parse traps.

## window.GJ_ANGLES (anglecore.js — pure, no DOM)
- Reason ids (canonical, shared with content + UI):
  `STR` straight line 180 · `PNT` point 360 · `VOP` vertically opposite · `TRI` triangle 180 ·
  `QUAD` quadrilateral 360 · `ALT` alternate · `COR` corresponding · `INT` interior/U-shape 180 ·
  `ISO` isosceles base angles · `PGRAM` opposite angles of parallelogram · `EQT` equilateral ·
  `GIVEN`.
- `checkSteps(q, steps)` — `steps = [{ang, val:{n,d}|number, calc?:str, rsn}]`.
  Valid iff: value arithmetically correct for that angle AND rsn is an authored edge rule linking
  `ang` to angles all of which are given or previously established by the pupil (prerequisite/DAG
  check; report `preqMissing:[angleIds]` when the value is right but the route isn't shown) AND the
  edge's arithmetic matches (e.g. STR partners sum 180). Returns
  `{perStep:[{val:0|1|2, rsn:0|1, preq:bool, dx}], res, mk:[m,a], mkMax}` (FT honoured: correct rule
  applied to pupil's earlier wrong value ⇒ val:2 hollow).
- `selfTest()` → ≥40 cases: multi-route, circular-reasoning catch, ALT↔COR swap dx, COINT_EQUAL dx,
  TRI_SUM_360 dx, calc-string entries, FT chains.

## Content packs — `window.GJ_CONTENT.angles` / `.algebra` (content-*.js)
```
{ id, title, cover:{accent:'teal'|'plum', motif:'protractor'|'radical'},
  reasonBank: [{id:'STR', group:'Lines & points', text:'Angles on a straight line add up to 180°'}…]   // angles only; exact CCEA phrasings; groups: 'Lines & points'|'Triangles & quadrilaterals'|'Parallel lines'|'Special shapes'
  sections: [{ id:'s1', title, walt,                       // walt = the teacher's WALT wording
     movie: MOVIE, questions:[Q…] }] }
```
### MOVIE (consumed by player.js)
```
{ title, mode:'paper'|'diagram', diagram?:DIAGRAM,
  steps:[{ say:string,                                  // caption, ≤140 chars, pupil-voice teacherly
           do:[OP…] }] }
OP (paper mode): {write:{text:'5x − 15 = 35', margin:'(expand)'}} · {sub:{from:'5(x − 3)', to:'5x − 15', glow:true}}
  · {tick:{line:n}} · {box:{line:n}} · {note:{text, red:true}} · {grid:{a:'3',b:['x','6'],vals:['3x','18']}}
  · {balance:{l:'5x−15', r:'35', tip:0}} · {balance:{op:'+15', tip:[-6,0]}} · {clear:{}}
OP (diagram mode): {seg:{id}} · {arc:{ang}} · {value:{ang, to:number}} · {label:{ang|seg, text}}
  · {stamp:{reason:'ALT'}} · {pulse:{ang}} · {zshape:{angs:[..]}} (draws the Z/F/U overlay)
Player animates ops sequentially within a step; steps advance on ▶ or auto after delay; ◀ steps back.
```
### DIAGRAM (shared renderer in player.js, reused by jotter.js)
```
{ w:100, h:70,                                          // abstract units, viewBox scaled
  pts:{A:[x,y],…},
  segs:[{id, from:'A', to:'B', par?:1|2, dash?:true}],  // par draws arrowheads (1 or 2)
  angles:{ AEF:{at:'E', from:'A', to:'F', reflex?:true,
           value:number, given?:true, label?:'x'} … } } // never render value unless given or established
```
### Q — angles
```
{ id, marks:[m,a], prompt, diagram:DIAGRAM,
  graph:[{find:'EFD', rule:'ALT', from:['AEF']}, …],     // EVERY valid derivation edge, multi-route
  target:'x', dx:{…optional value-pattern → code} }
```
### Q — algebra
```
{ id, marks:[m,a], type:'solve'|'expand'|'simplify'|'subst'|'form',
  prompt, start?:'5(x − 3) = 35',                        // line 0, pre-written, pencil grey
  given?:{a:{n,d},…},                                    // subst questions
  answer:{x:{n,d}} | {canon:{c2,c1,c0}} | {val:{n,d}},
  form?: {accept:[canonical equation strings]},          // 'form' questions: the form-the-equation line is marked
  dx:{'5x-3=35':'EXPAND_PARTIAL', …} }                   // keys parsed+canonicalised at load
```
dx codes (full library, use these exact ids): EXPAND_PARTIAL, EXPAND_SIGN, SUB_INSTEAD_DIV,
DIV_BEFORE_SUB, SIGN_FLIP_MOVE, COLLECT_X_NUM, NEG_MUL_SIGN, BOTHSIDES_ONE_SIDE, SWAP_NOFLIP,
ALT_CORR_SWAP, COINT_EQUAL, TRI_SUM_360, STRAIGHT_360, VOP_SUPP.

## Jotter attempt state (owned by jotter.js; saved via script.js)
```
state = {v:1, act, start:epochSec,
  qs:{ q4:{ att:[ {L:[{op:'exp'|'+15'|'/5'|'rw'|'col', t:'5x−15=35', s:sec, e:editCount}…],
                   steps?:[{ang,val,calc,rsn,s}…],       // angles questions use steps not L
                   res:'OK'|'X@1'|'AMBER', dur}… ],      // res written at Check
            fin?, mk:[m,a], lock:bool, ovr:null|{...} } } }
summary = {v:1, act, name, marks:[got,max], done:n, total:n, upd:epochSec,
  qs:{ q4:{st:'ok'|'amber'|'err'|'open'|'un', errAt?:n, dx?:code, mk:[m,a], t:sec} }}
```
script.js exposes to jotter/staff: `GJ.app.save(state)` (debounced ≤1/10 s, builds summary),
`GJ.app.content(actId)`, `GJ.app.boot` = `{classCode, baseUrl, email, name, acts}`.

## window.GJ_STATS (statcore.js — pure, no DOM; reuses GJ_MATH's rationals)

The Handling Data engine. Everything is an exact rational `{n,d}`; chart
coordinates are integers in small-square units, so snapping and tolerance are
integer comparisons.

```
GJ_STATS.quartiles(values, rule)      -> {Q1,Q2,Q3,IQR,sorted,pos,expressible}
GJ_STATS.quartilePositions(n, rule)   -> {Q1,Q2,Q3}   1-indexed, may be halves
GJ_STATS.positionsExpressible(n,rule) -> bool         a quarter position cannot be pointed at
GJ_STATS.fiveNumber(values, rule)     -> {min,Q1,Q2,Q3,max}
GJ_STATS.cumulate(classes)            -> [cf…]
GJ_STATS.curveX(curve, h)             -> {n,d}|null   x where the CHORD reaches height h
GJ_STATS.curveY(curve, x)             -> {n,d}|null   the chord's height at x
GJ_STATS.curveMonotone(curve)         -> bool
GJ_STATS.readHeights(n, rule)         -> {median,Q1,Q3}
GJ_STATS.expectedPoints(q, rules)     -> [[x,y]…]     the points a cfplot expects
GJ_STATS.unitsOf(q, rules)            -> [{id,label,band,w,ftEarns}…]   THE unit table
GJ_STATS.check(q, att, rules)         -> {perLine:[{unit,label,band,w,ok,dx,note,earned}…],
                                          res:'OK'|'X@n', errAt, dx, mk, mkMax, mkLabels}
GJ_STATS.modelBoard(q, wrong, rules)  -> the S a right (or classically wrong) attempt leaves
GJ_STATS.gist(q)                      -> <= 28 chars for the exercise grid
GJ_STATS.DX_NAMES / REASONS / MK_LABELS / DEFAULT_RULES / FT_RULE_IDS
GJ_STATS.KINDS                        -> [13 kind ids]   isStatKind(k) covers all thirteen
GJ_STATS.stemLeafOf(value, decimals)     -> {stem,leaf}         numbers; decimals 0: 36->{3,6}; decimals 1: 3.6->{3,6}
                                                                  (one rule: scale to an integer, split at the last digit)
GJ_STATS.stemleafRows(values, decimals)  -> {'<stem>':[leaf digits ascending as numbers]}   only stems that hold a
                                                                  value; the renderer unions the result with q.stems
GJ_STATS.pieAngles(cats, total)          -> {catId:{n,d}}       f * 360 / total; total defaults to the sum of f
GJ_STATS.leastSquares(points)            -> {m,c,meanX,meanY,n} rationals; m/c null when every x is equal
GJ_STATS.lineY(line, x) / lineX(line, y) -> {n,d}|null          line is {m,c} or two points [[x1,y1],[x2,y2]];
                                                                  null for a vertical/undrawn line, lineX null for a flat one
GJ_STATS.selfTest()                   -> {pass, count, failures}
```

**The unit table is the one home** of what each marking unit is worth (`w`),
which mark it can pay for (`band`), and whether a follow-through tick earns it
(`ftEarns`). The pupil's tally, the teacher's rows and the lint's
reachable-marks rule all read it, and the selfTest pins every flag.

### Units per kind (Book A: order, pick, stemleaf, pie, scatter)
- `order` — cyclic: `PAIR_0…PAIR_{n-1}` (method w1 for the first n−1, accuracy w1 for the closing
  pair; no ft — a rotation of the answer cycle still marks full). Not cyclic: one `SEQ` unit, accuracy w1, exact.
- `pick` — `PICK` accuracy w1 (exact option index) · `WHY` method w1 (ok:1 iff `S.why` is the `flaw`
  of ANY rejected option, whichever she picked; else 0, dx `JUDGE_WRONG_REASON`).
- `stemleaf` — `LEAVES` method w1 (every non-prefilled value present exactly once on its true stem;
  dx `SL_WRONG_STEM`/`SL_MISSED_LEAF`) · `ORDERED` method w1 (each row non-decreasing outward; dx
  `SL_UNORDERED`) · `KEY` accuracy w1, **only present when `key.ask`** — a no-key stemleaf has no
  accuracy unit, so its pack `marks` must read `[m, 0]`.
- `pie` — `ANG_<id>` per category, method w1, **ftEarns** (ok:1 exact f·360/total; ok:2 follows their
  own first angle; a whole column read as a percentage earns nothing and carries `PIE_PCT_NOT_DEG` —
  percentages are not treated as a follow-through) · `SUM` method w1 (their angles sum to 360) ·
  `SECTORS` accuracy w1, **ftEarns** (each placed boundary within ±2° of the running total, hers or
  the true one; dx `PIE_SECTOR_OFF`) · `LABELS` accuracy w1 (sector i carries `cats[i]`).
- `scatter` — `POINTS` method, `w = q.pointsW || 1` (set equality with `toPlot`; dx `SC_XY_SWAPPED`
  when the swapped set is the one that fits inside the axes) · then only the units the question's
  `asks` name: `LOBF` method w1 (dx `SC_LINE_OFF_TREND`) · `ESTIMATE` accuracy w1, **ftEarns** (ok:1
  off the true least-squares line, ok:2 off THEIR line; dx `SC_READ_WRONG_AXIS`) · `CORR` accuracy w1
  (dx `SC_CORR_SIGN`) · `OUTLIER` accuracy w1, exact index into `given.concat(toPlot)`.

### Units per kind (Book B: table; values additions) — 13 Sept 2026
- `table` — in table order then ask order: `C_<col>_<i>` per derived cell (method w1, **ftEarns**:
  ok:1 exact; ok:2 iff consistent with HER inputs in that row — fx = f × her mid, cf = her previous cf + f;
  dx `AV_NO_MIDPOINT` when a mid cell equals the class bound) · `T_<col>` per total (method w1,
  **ftEarns**: ok:2 iff the sum of her own column) · value asks `A_<id>` (accuracy w1; ok:1 exact or
  within the `dp` rounding; ok:2 iff `ft` `sum(fx)/sum(f)` reproduces it from her table; dx
  `AV_DIV_ROWS`, `AV_FX_NOT_SUMMED`) · row asks `A_<id>` (accuracy w1, exact 0-based index; dx
  `AV_MEDIAN_CLASS_OFF` one row off on a median-named ask). `GJ_STATS.tableDerive(q)` is the truth
  (`derive:'f*x'` uses `mid` when present else `x`; `'mid'` = (lo+hi)/2; `'cum'` the running total;
  `medianRow` = the first row whose cumulative frequency reaches (n+1)/2). Tally `['Table', 'Answers']`.
- `values` additions — a slot may carry `stat` (mean/median/mode/range/missing/total/newMean) and the
  question `fig:{type:'list', values}`; when a stat slot is wrong and the pack authored no `dx`, the
  engine detects `AV_MEDIAN_UNORDERED`, `AV_MODE_AS_FREQ`, `AV_RANGE_NOT_DIFF`, `AV_DIV_ROWS`,
  `RM_AVERAGED_MEANS`, `RM_WRONG_N` from the printed list / the ft chain (`dx:false` waives a slot the
  lint proves indistinguishable). A slot with `set:n` (or `answer.constraints.n`) is a set of n boxes read
  from `S.v[id+'_set']`; `constraintsHold` marks n/mean/median/mode/range. `rm.newMean` takes `xFrom` to
  chain through a second total. `fig:{type:'table', cols}` prints a given table above the boxes.

## Stats content pack — `window.GJ_CONTENT['stats-quartiles']` (and -collect, -averages)

```
{ id, engine:'stats', rules:{quartileRule:'n+1', curveRule:'split50', startPoint,
    curveStyle, readTol, plotTol}, authoredNarration:[…], sections:[
  { id, title, walt, cans:[…], movie:{title, mode, src, steps:[{say, do:[op…]}]},
    questions:[ { id, kind, marks:[m,a], prompt, src, reserve?, …kind-specific } ] } ] }
```
Kinds and their stored `S`:
```
qlist    {order:[idx…], picks:{Q1:[i]|[i,j], …}, iqr:'11'}
cftable  {cf:['8','21',…]}                        prefill:[rowIdx] rows are given
cfplot   {pts:[[x,y]…], joined:bool}              startPoint per pack or per question
cfread   {reads:{median:{h,x}, 'atX@36':{x,cf}…}, answers:{'atX@36':'32'}, iqr}
boxplot  {pos:{min,Q1,Q2,Q3,max}, drawn, stage?}  from:'qlist'|'values'|'curve'
compare  {s1:{who,who2,ctx,v:[a,b]}, s2:{who,size,cons,meas,v:[a,b]}}
judge    {j:[{fair,why} | {v}]}                   claims may carry their own options
values   {v:{slotId:'84'}}                        slots may carry a closed ft.rule id; `q.fig` may draw the
                                                    question's own figure (venn2/venn3/stemleaf/list — see below)

-- Book A (12 Sept 2026) --
order    {seq:[tileIndex…]}                       indices of q.tiles in the order placed; cyclic marks pairwise
pick     {pick:optionIndex, why:'Q_…'}            why = the Q_* flaw id of ANY rejected option, not just hers
stemleaf {rows:{'<stem>':['<leafDigit>'…] in placed order}, key?:{stem:'<stem>', leaf:'<digit>'}}
                                                    rows hold ONLY the pupil's leaves — prefilled stems and the
                                                    `back` side are given and never marked; key present only when `key.ask`
pie      {angles:{catId:'156',…}, bounds:[b1,…,b(n-1),360], labels:{sectorIndex:catId}}
                                                    bounds are cumulative degrees clockwise from 12 o'clock; last is fixed 360
scatter  {pts:[[x,y]…], line:[[x1,y1],[x2,y2]], est:'70', corr:'positive', outlier:6}
                                                    only the keys the question's `asks` name exist (pts always)
table    {cells:{fx:['23','96',…], mid:[…]}, totals:{f:'20', fx:'503'}, asks:{mean:'25.15', modal:2}}
                                                    cells/totals hold strings ('' = blank); a row ask holds a 0-based index or null
```
Leaves, indices and points may arrive as strings or numbers (the walker and the renderer differ); every
value is normalised through `R()` before comparison.

### `values` with a figure — `q.fig` (§17.1, Book A)
`q` carries `fig` alongside the existing `slots`:
```
{ type:'venn2', n, circles:[{id:'A',label:'Milk'},{id:'B',label:'Sugar'}], totals:{A:81,B:48} }
    // each slot carries region:'A'|'B'|'AB'|'out'
{ type:'venn3', n, circles:[{id:'A',…},{id:'B',…},{id:'C',…}], totals:{A,B,C} }
    // regions 'A'|'B'|'C'|'AB'|'AC'|'BC'|'ABC'|'out'
{ type:'stemleaf', stems:[…], rows:{'2':[4,6,8,8],…}, key:{stem,leaf,means}, decimals, unit }
    // drawn read-only via GJ_STATCHART or slTable(); the pupil's slots are listed under it
{ type:'list', values:[…] }   // plain printed list, no figure interaction
```
`S` is unchanged: `{v:{slotId:'59',…}}`. FT rules already in `FT_RULES` cover the venn figure:
`venn.only` (`ft:{rule:'venn.only', of:'A', from:['both']}`), `venn.outside`, `venn.both.fromTotals`;
a read-off from a given stemleaf figure uses `sl.read`. Venn dx fire only when the pack has not
authored `slot.dx`: `VENN_TOTAL_AS_ONLY` (an "only" slot equals that circle's total),
`VENN_OUTSIDE_LOST` (the `region:'out'` slot blank/zero, or a `fromTotals` slot equals A+B−N).

DOM (jotter-stats.js): host `.stat-fig.stat-fig-<type>` holds the drawing — `GJ_STATCHART.venn(host, fig, {})`
for venn2/venn3, `slTable(…)` for stemleaf, a plain `<p class="stat-list">` for list. **Only venn2** moves
its slots onto the figure: each such slot renders as an HTML overlay `div.stat-fig-box[data-region="AB"]`
(positioned at `venn.regionCenter(region)`, clamped inside the frame) containing a label
`span.stat-fig-box-label` and the pressable `button.stat-cell[aria-label="<slot label>"][data-placed?]`
(the actual pressed/typed cell — `aria-label` always = the slot's label, so drive.js opens boxes by label).
venn3 has eight regions and collided at 375, so its slots (and every non-`region` slot on any fig) stay
listed under the drawing in `.stat-slots` as `.stat-slot` rows, same `.stat-cell` button. Stages unchanged:
`empty · filling · ready`.

### DOM contract — trays for the new kinds (jotter-stats.js)
Every tray is `[data-tray="<name>-<qid>"]` holding `button[data-tray-item]` items, same convention as
every existing kind's tray:
- `order-tiles-<qid>` — the tiles, deranged from the answer order; placed tiles sit in a `.stat-row` of
  `.stat-tile[data-placed]` (two-press returns one to the tray).
- `pick-options-<qid>` — the options (`.stat-option`, `aria-pressed`); `pick-why-<qid>` — the reason bank,
  shown only once an option is pressed.
- `stemleaf-leaves-<qid>` — the values as full text ("3.6"), deranged from ascending; a pressed leaf
  selects (stage `leaf-selected`) then lands in a stem zone (`button.stat-sl-zone[data-stem="N"]`).
  When a key is asked: `stemleaf-keystem-<qid>` (the stems) and `stemleaf-keyleaf-<qid>` (digits 0–9).
- `pie-labels-<qid>` — the category labels, landing as HTML overlays `.stat-pie-label[data-placed]` on
  the drawn sectors.
- `scatter-corr-<qid>` — Positive · Negative · No correlation.
The venn2 figure's own overlay is `.stat-fig-box` (documented above) — not a tray; it has no derangement,
each box sits fixed over its region.

### MOVIE ops for stats packs — `player.js` `applyOp` (CHART family)
Existing (unchanged): `write ring box tick note stamp table tcell chart plot curve rule drop scale
marker bracket`. Book A adds, drawn on the film's own canvas at the film-draws law's pace:
```
{venn:{circles:[{id,label}…], n?}}     lays the circles (GJ_STATCHART.venn, {append:true})
{vfill:{region:'AB', text:'22'}}       writes a value into a region (vennBd.fill() write-on)
{pie:{}}                               draws the disc + radius; the running angle starts at 0
{sector:{deg, label?}}                 sweeps the NEXT sector clockwise from the running angle at pen
                                         speed, then a plain radius at its end and the label at the mid-angle
{stemleaf:{stems:[…], decimals, unit, back?, sides?, title?}}   lays the stems (stemleafFilm)
{leaf:{stem, leaf, side?}}             one leaf lands (180 ms)
{key:{stem, leaf, means}}              writes the key line
{lobf:{through:[[x,y],[x,y]]}}         draws a line at pen speed through the two points, extended to the
                                         plot edges, on the current chart (the film's own .ml-chart)
```
`rule` gains a vertical form `{rule:{x}}` (existing `{rule:{h}}` unchanged); `{drop:{}}` after either
reads the lobf when no curve is joined. Every op kind drawn at the film's end is the film-draws law
(`tools/qa/sit-pupil.js` `KIND` map); the eight new ops are `.ml-venn .ml-vfill .ml-pie .ml-sector
.ml-stemleaf .ml-leaf .ml-key .ml-lobf`.

## window.GJ_STATCHART (statchart.js)
- `render(host, chart|scale, opts)` → handle `{svg, toPx, toAxis, snap, addPoint, movePoint,
  removePoint, points, curveThrough, clearCurve, rule, ruleX, drop, readout, clearReadout,
  scale, marker, moveMarker, removeMarker, markers, box, clearBox, ring, bracket, annotate,
  selectPoint, selectMarker, needsScroll, relayout, destroy}`.
  `opts`: `readOnly`, `snapDivisor`, `onChange(evt)`, `onGridTap(x, y)`.
  **Book A scatter additions to the handle:** `addPoint(x, y, {given:true})` → board index (draws
  `g.stat-pt.is-given[data-index]`, never selectable — `points()` now excludes given points, so it
  is exactly `S.pts`); `allPoints()` → `[{i,x,y,given}…]` every point in draw order (given first,
  so it indexes `given.concat(toPlot)` for the outlier ask); `line(p1, p2, {cls, animate?, instant?})`
  → `{el, update(p1,p2), remove(), yAt(x), ends()}` draws `line.stat-lobf` extended to the plot rect;
  `handleAt(x, y, i)` → the 48 px drag handle `circle.stat-lobf-handle[data-handle=i][data-placed]`
  (real pointer drag moves it, snapped to the grid; fires `opts.onChange({type:'lobf-move', i, x, y})`);
  `moveHandle(i, x, y)`, `handles()` → `[[x,y],[x,y]]` sorted by i, `removeHandles()`; `markOutlier(i)`
  → the ring element (`.is-outlier` on the point), `clearOutlier()`; `enablePress(fn)` adds a 44 px
  press target over every point and calls `fn(boardIndex)` on click (`enablePress(null)` removes it);
  `clearDrop()` clears the rule's drop drawing with no new draw. `ruleX(x)` (pre-existing) + `drop()`
  now fall back to reading the lobf line when no curve is joined.
  Labels that MOVE are HTML over the board (`.stat-label[data-board-label]`) so the overlap
  law can judge them; SVG text is inked by `fill: currentColor`; every label renders at
  13 CSS px or more after the counter-scale, and a board scrolls sideways rather than let a
  small square fall under 12 px.
- `chart.snap` (scatter charts only): an integer divisor on the placed-point grid — the board snaps to
  `sq / snap`, so `snap: 2` lets a plotted point sit on a HALF small square (`sq` stays the labelled
  square size). Defaults to 1. Read by both the renderer's grid and `dev/lint-content-stats.js`.
- `venn(host, spec, opts)` → handle. `spec:{circles:[{id,label}] (2 or 3), n?}`; `opts:{append?, cls?}`.
  Draws `.stat-board-frame > svg.stat-board.stat-venn` (circles `circle.stat-venn-circle[data-circle=id]`,
  labels, `text.stat-venn-n` "n = 130"). Handle: `regionCenter(region)` → `{x,y}` CSS px relative to the
  frame (regions venn2 `A B AB out`, venn3 `A B C AB AC BC ABC out`), `regionCenterUser`, `contains`,
  `geometry()`, `regions()`, `fill(region, text, {instant?, cls?})` → `{el, done}` write-on (320 ms),
  `clearFill(region?)`, `svg`, `frame`, `layer`, `relayout()`, `destroy()`.
- `pie(host, opts)` → handle. `opts:{readOnly?, append?, cls?, onRimTap(deg), onBoundaryMove(i,deg),
  onBoundaryPress(i), onSectorPress(i)}`. Degrees are integers 0–360 clockwise from 12 o'clock. Handle:
  `rimPoint(deg)` → `[px,py]`, `degAt(px,py)` → integer deg, `rimUser`, `degAtUser`, `centre()`,
  `centreUser()`, `snap(deg)`, `boundary(deg, {placed?, i?, plain?, animate?})` → index (real drag moves
  it; a press with no movement fires `onBoundaryPress`), `removeBoundary(i)`, `boundaries()` → `[deg…]`,
  `sector(fromDeg, toDeg, i, {instant?})` → `{el, done, from, to}` sweeps clockwise at pen speed,
  `clearSectors()`, `labelPoint(fromDeg, toDeg)` → `{x,y}` for an HTML `.stat-pie-label` overlay,
  `sectorLabel(from, to, text, opts)` → `{el, done}`, `readout(text, deg?)`, `clearReadout()`, `svg`,
  `frame`, `layer`, `R`, `relayout()`, `destroy()`.
- `stemleafFilm(host, spec, opts)` → handle (FILM only — the jotter's own pupil-facing stemleaf is
  the `.stat-sl` table in jotter-stats.js, not this). `spec:{stems:[…], decimals, unit, back?, sides?,
  title?}`. Handle: `addLeaf(stem, digit, side, {instant?, cls?, ms?, ink?})` → `{el, done}` appends
  outward, `key(stem, leaf, means, opts)` → `{el, done}` writes "2 | 1  means  2.1 cm", `ringLeaf(stem,
  k, side)` (the median beat), `leaves(stem, side)`, `svg`, `frame`, `relayout()`, `destroy()`.

## window.GJ_JOTTER_STATS (jotter-stats.js)
- `handles(kind)`, `mount(host, q, savedRec, hooks)` — the same contract as `GJ_JOTTER.mount`;
  jotter.js dispatches to it in one line and the v3 renderers are untouched.
- `renderReadOnly(host, q, att, verdict)` — the teacher's copy of a pupil's board.
- `STAGES` / `stagesFor(q)` — the named in-between boards; every question root carries
  `data-stage` and `data-stages`, and the walk stands on every one.
- `KINDS` — all fourteen kind ids: the eight pre-Book-A kinds (`qlist cftable cfplot cfread boxplot
  compare judge values`), Book A's five (`order pick stemleaf pie scatter`) and Book B's `table`
  (DOM: `.stat-tablekind` › `table.stat-table.stat-table-edit` with `button.stat-cell[data-col][data-row]`
  (`data-row="total"` for a total), value asks `.stat-slots .stat-cell[aria-label]`, row asks
  `button.stat-rowpick[data-ask][data-row][aria-pressed]`; stages `empty filling asking ready`). A judge
  question's `fig:{type:'list'}` / `data:{cols}` and a values question's `fig:{type:'table'}` are drawn
  read-only above the board (`givenTable`).

## window.GJ_PLAYER (player.js)
- `mount(el, movie)` → controller `{play, pause, step(+1|-1), goto(n), destroy, onend(cb)}`.
- `renderDiagram(el, diagram, opts)` → handle `{showValue(ang), pulse(ang), arcEl(ang), …}` —
  exported because jotter.js reuses it for angle questions and staff.js for drill-down re-render.

## window.GJ_JOTTER (jotter.js)
- `mount(el, q, savedAttempts, hooks)` → controller; hooks = `{onSave(qid, attemptsState), onDone}`.
  Owns chips/keypad/reason-picker/check sequence/attempt locking. Marks via GJ_MATH/GJ_ANGLES.

## window.GJ_STAFF (staff.js)
- `open()` — the whole teacher experience; uses `GJ.app.call('admin', {...})` transport
  (sequence tokens, in-flight guards, clipboard fallback chain, two-tap delete, per playbook).

## Transport (script.js)
`GJ.app.call(action, payload)` → Promise. Actions: whoami, hello, load, save, setname, admin.
Online: `window.OLS_TRANSPORT` (injected by assembler). Offline: localStorage stub with FULL
parity + demo mode (staff passcode `demo`, seeded class `10B Maths` with ~12 fake pupils whose
states contain authentic misconceptions across both activities).

## Server (server/Code.gs.template) — see DESIGN.md §3 for tabs/API; GG-lineage hygiene mandatory:
setNumberFormat('@') everywhere, LockService on writes, primitive coercion on every return,
passcode trim/lowercase server-side, classes registry in Config, per-class acts map honoured in
`hello` (a pupil NEVER receives a disabled activity's content gate as openable).

### Per-teacher scoping (markbook only — pupils are unaffected)
The shared `staffPasscode` lets any staff member in; their **verified active email**
(`Session.getActiveUser`, same identity the pupil API trusts within c2ken.net) then scopes the
markbook. Each class record carries an `owner` (lower-cased email), stamped at `addClass` =
caller. A teacher sees and manages ONLY classes they own; the **deploy owner** (`Session.getEffectiveUser`
= whoever deployed the web app, the HOD) sees and manages ALL — a no-maintenance rule that
survives staff handover (re-deploying transfers it). A legacy class with no `owner` is deploy-owner-only.
`guardClass_` enforces ownership on EVERY admin sub that names a class (deleteClass/setActs/wall/
jotter/override) — **list filtering alone is not enough**; a passcode-holder could otherwise reach
another teacher's class by name. Class names stay GLOBALLY unique (the `?class=` routing key), so
`addClass` collision is checked across all owners. `admin` `classes` returns `{me, isAdmin, classes:[{name,acts,count}]}`.
Proof: `node dev/test-server-scoping.js` (mocks Apps Script globals, runs apiAdmin as A/B/deployer).
