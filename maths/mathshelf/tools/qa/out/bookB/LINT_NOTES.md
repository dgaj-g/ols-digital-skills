# LINT-B package notes — dev/lint-content-stats.js additions for Book B

13 Sept 2026, MathShelf Book B cut, LINT-B package. Worked only in
`maths/mathshelf` of this worktree. Files touched (all owned): `dev/lint-content-stats.js`
(additive), `dev/validate-all.js` (KINDS line only), `tools/qa/qa-tray-order.js`
(STAT_KINDS/COVERS literal + `expected()` documentation), this file, and the two
throwaway proof packs `tools/qa/out/bookB/lint-probe-pass.js` /
`lint-probe-fail.js`. Did NOT touch `dev/test-statcore.js` (ENGINE-B had already
made the exact KINDS-count-line edit I was to make — 14/'table' — before I got
to it; verified, left alone) or `tools/qa/qa-period-budget.js` (its `STATS_KINDS`
already listed `'table'` in the base tree before this session started — verified,
nothing to add). Did NOT touch `plants.js`, `statcore.js`, `content-stats-averages.js`,
or any other package's files. Nothing committed.

## Baseline vs after

Before any edit: `NODE_PATH="$(npm root -g)" node dev/lint-content-stats.js`
(Books C + A only, no Book B pack existed yet) → sections 11, questions 65,
PASS. `node dev/test-statcore.js` → 360 cases, 0 failures. `NODE_PATH=...
node dev/validate-all.js` → 113 sound.

After every edit in this session, re-proven (not just once at the start):
- `node dev/test-statcore.js` → still 360 cases, 0 failures, ALL GREEN.
- `NODE_PATH=... node dev/validate-all.js` → 142 sound, 0 need attention
  (113 → 142 as CONTENT-B's `table` questions came in through model-attempts.js,
  which is not this package's file).
- `NODE_PATH=... node dev/lint-content-stats.js --pack content-stats-quartiles.js,content-stats-collect.js`
  (Books C + A ISOLATED from Book B) → sections 11, questions 65, PASS,
  UNCHANGED from the pre-session baseline. This is the hard requirement
  ("must stay GREEN on Books C and A") and it holds throughout.
- `NODE_PATH=... node dev/lint-content-stats.js` (all three packs together,
  once content-stats-averages.js existed) → sections 16, questions 94
  (…table 9), PASS.
- `node tools/qa/run.js --fast` → every gate GREEN except `qa-repo-prod`
  (24 uncommitted files — expected mid-session, not a defect; I commit
  nothing per the brief). Earlier in the session `qa-notation` was
  transiently RED from `content-stats-averages.js`'s own `authoredNarration`
  (an ASCII hyphen in a class-range mention inside a longer PROSE sentence —
  NOT my file, NOT the same case as a bare `cls.given[i].text` — CONTENT-B
  fixed it; confirmed clean on the final full run I ran, none of my files
  ever appeared in a `--fast` red.

## 1. KINDS += 'table' (and the three sibling counts)

`dev/lint-content-stats.js` `KINDS` (line ~50) gained `'table'` (14 entries).
`dev/validate-all.js`'s `KINDS` (line ~35, a coverage-declaration array, not
a dispatch table) gained `'table'` too. `dev/test-statcore.js`'s
`S.KINDS.length === 13` line was ALREADY changed to `14`/`'table'` by
ENGINE-B by the time I reached it (statcore.js's own `KINDS_LIST` already
carried `'table'` as its 14th entry, `KINDS: KINDS_LIST.slice()` in the
export) — verified green, left untouched, per the brief's "the KINDS count
line only" scope (I did not touch the neighbouring `MK_LABELS covers every
kind` line, which is not in my ownership and still passes unaffected since
it only iterates the kinds it explicitly lists).
`tools/qa/qa-tray-order.js`'s `STAT_KINDS` and `COVERS.kinds` both gained
`'table'` as a literal string in the literal array (COVERS stays a literal
object — the coverage matrix parses it textually, per the brief).
`tools/qa/qa-period-budget.js`'s `STATS_KINDS` already contained `'table'`
in the base tree before this session (confirmed by re-reading the file and
by `git status` never listing it as modified) — nothing to do there.

## 2. `qa-tray-order.js` — `table` and `values`+`fig:{type:'list'}` have no tray

Added an explicit documentation comment in `expected()` (no functional
change was needed: the function already had no branch for either shape,
which IS "none" — but the brief asked the omission to be recorded, so it now
says so in the file itself, next to the other Book B additions).

## 3. `table` kind (`checkTableKind`, §17.2 / CONTRACT_B.md)

An independent second implementation, `myTableDerive(cols)` (plus
`tColById`/`tClassCol`/`tColByRole`/`tDerivedCols`/`tRows`), mirroring
statcore's `tableDerive` but built fresh (own rational arithmetic, own
cumulative-frequency walk) — cross-checked against `GJ_STATS.tableDerive(q)`
when present (mean / modalRow / medianRow), exactly as `checkQlist` already
cross-checks `GJ_STATS.quartiles`.

**Structure:** column ids unique; exactly one of an `x` column or a class
(`cls`) column (fails "has both…"/"has neither…"); an `f` column present
with numeric `given` entries; every `cls.given[i]` has numeric `lo < hi` and
non-empty `text`; consecutive classes are contiguous — `hi_i == lo_{i+1}`
(touching, "0-10,10-20") or `lo_{i+1} - hi_i == 1` (discrete, "1-5,6-10") are
both accepted, anything else fails naming the two row numbers and both
boundary values. `totals` entries must name a real column and must not name
the class column (no numeric total on class boundaries).

**Hyphenated class text finding (§16 item 4, brief item 3):** read
`qa-notation.js`'s `mathsBearing()` closely. It only flags a string once a
digit touches a LETTER (or `=`) — `/\d[a-zA-Z]|[a-zA-Z]\d|\d\s*=|=\s*\d/`,
after CSS units/hex colours are stripped. A BARE class-range string like
`"0-10"` has no letter anywhere in it, so `mathsBearing("0-10")` is `false`
and `checkAsciiOp` returns before ever reaching its hyphen regex — the gate
CANNOT flag a standalone `cls.given[i].text` value, confirmed by direct
inspection of the regex, not by inference. (Mid-session this was borne out
the other way too: `content-stats-averages.js`'s `authoredNarration[4]`
DID trip `qa-notation` for "0-1", "0-2", "6-1" — because those hyphens sat
inside a longer PROSE sentence that ALSO contained ordinary letter-digit
contact elsewhere in the same string, e.g. "s4 movie", making the WHOLE
string mathsBearing and the hyphen check then scan across all of it. That
was CONTENT-B's file, not mine, and CONTENT-B fixed it — but it is exactly
the distinction this brief item asked me to record: a bare printed class
boundary is safe; the same digits woven into a sentence are not.) No ban is
added in `checkTableKind` for class text itself — one would incorrectly
fail exactly the content §16 item 4 requires ("render as printed"). This
mirrors the file's own existing comment above `TELEGRAPH_PHRASES` for the
identical reasoning.

**Value asks — the `ft` correction (from the coordinator mid-session):** a
value ask's `ft`, when present, is ONLY the closed `sum(<colA>)/sum(<colB>)`
form (regex `/^sum\((\w+)\)\/sum\((\w+)\)$/` — matched against `dev/
lint-content-stats.js`'s own copy `ASK_FT_LINT`, kept textually identical to
statcore's `ASK_FT`); referenced column/total ids are checked to exist. A
`median`/`mode` value ask (recognised by a case-insensitive match on the
ask's `id`/`label` — CONTRACT_B fixes no naming convention here, same
situation Book A's `LINT_NOTES.md` flagged for stem-and-leaf reads) MUST
carry no `ft` at all and fails if it does, naming which of the two it is.
A `mean` ask (or any ask whose `ft` IS the sum/sum form) is checked against
`D.mean`; a `median` ask (ungrouped only — a grouped table's median is a ROW
ask, "medianClass", not a value ask; a median value ask on a grouped table
is `info()`-reported, not checked, and says so) against the x/mid value at
`D.medianRow`; a `mode` ask against the x/mid value at `D.modalRow` (fails
if the frequency column ties, since no single mode exists).

**`dp` acceptance — a bug the coordinator caught in the FIRST real-pack
run:** the engine marks a value-ask answer right if it equals EITHER the
exact rational OR the value rounded to `dp` (its `dpTol` is half a unit in
the dp-th place) — so an author may write either form. My first version of
`checkTableValue` only accepted the rounded form when `dp` was set, and
failed `content-stats-averages.js`'s own exact-rational answers
(`ask "mean" gives 4/3 (133/100 to 2 dp) but answer says 4/3`, a false
positive). Fixed: when `dp` is set, accept `req(answer, truth)` OR
`req(answer, roundToDpRat(truth, dp))`; only neither is a fault. Re-ran the
full lint immediately after — the false positive is gone and every other
proof still fires correctly (see the probe below).

**Row asks:** `modal` = argmax(f), fails on a tie; a row ask whose id/label
matches `/median/i` = `D.medianRow` (the SAME cumulative-frequency rule as
the value-ask median, see below). Both compare the authored 0-based row
index against the truth exactly.

**The median-row/straddle rule — mirrored EXACTLY per the coordinator's
correction, not per my own first reading of CONTRACT_B:** `D.medianRow` is
the FIRST row whose cumulative frequency reaches `(n+1)/2` — for `n` even
this is the row holding the UPPER of the two middle values (`n/2 + 1`), not
an average of two rows and not a fail when the `n/2`th and `n/2+1`th values
fall in different rows ("straddle"). `myTableDerive` computes `straddle`
(both a `lowerRow` — first row reaching `n/2` — and the real `medianRow` —
first reaching `(n+1)/2` — computed independently, `straddle` true iff `n`
is even and they differ) and `checkTableKind` reports it with `info()`,
never `fail()`. Proven live: `content-stats-averages.js` s4/q24 (Heathrow,
n = 55 is ODD so no straddle there, but s1's `stats-averages` s4 grouped
table with n = 20/24/36/79/etc. produced the exact "n is even…" info line on
a real question during this session, confirmed in the lint's own output).

**Distinguishability (mean asks only):** `AV_DIV_ROWS` (Σfx ÷ rows),
`AV_NO_MIDPOINT` (Σf·hi ÷ Σf and Σf·lo ÷ Σf, grouped tables only),
`AV_FX_NOT_SUMMED` (Σ(mid or x) ÷ rows) — each compared to the true mean at
the SAME `dp` rounding as the authored answer; a match fails naming the dx.
These are LINT-time proofs of detectability, not calls into the engine's
own (narrower) `askDx` — the engine only ever names `AV_DIV_ROWS`/
`AV_FX_NOT_SUMMED` live (confirmed by reading `statcore.js`'s `askDx`,
~line 2024); `AV_NO_MIDPOINT` is engine-checked only per-CELL (a single
midpoint cell equal to its class's lo/hi), never at the whole-mean level —
this lint proves the WHOLE-MEAN version is still distinguishable on the
authored data, which is the brief's explicit requirement, even though nothing live ever fires that exact dx by that route.

**Unit counting (`tableKindUnits`, wired into `myUnitsOf`):** one method
unit per derived cell (rows × derived columns), one method unit per total,
one accuracy unit per ask — COUNTS only, matching `checkReachableMarks`'
existing contract; labels and `ftEarns` are the engine's business (per the
coordinator's note) and are not replicated here.

## 4. `values` — Book B's `stat`/`fig:{type:'list'}`/reverse-mean/constraints

`checkValuesAverages`: for a slot with `slot.stat` ∈ mean/median/mode/range
against `q.fig.values` (any fig carrying a flat `.values` array, not only
`type:'list'`, per CONTRACT_B's wording), re-derives via a fresh
`myListStats(values)` (own mean/median-as-printed/median-of-sorted/mode/
range/distinct-count — never calling into statcore's `listStats` for the
truth, only `GJ_STATS` is consulted nowhere in this path since a second
implementation was wanted end-to-end here) and fails on disagreement,
naming the printed-list value and the authored answer. Distinguishability:
`AV_MEDIAN_UNORDERED` (median of the PRINTED, unsorted order),
`AV_MODE_AS_FREQ` (the frequency count itself), `AV_RANGE_NOT_DIFF` (the
maximum — the one representative case the design names as sufficient to
prove a list distinguishes), `AV_DIV_ROWS` (sum ÷ distinct count) — a match
fails `dx: "…" equals the truth` UNLESS `slot.dx === false`, which is
honoured as an explicit waiver and `info()`-recorded. **Proven on real
content**, not just the probe pack: `content-stats-averages.js` s1/q4's
range slot (list `[8,0,3,3,1,7,4,1,4,4]`, min 0 so max 8 = range 8 exactly)
tripped this FAIL on the first full-pack run of the session — a genuine,
correctly-caught authoring case (a pupil who only wrote the max would be
marked right and mislabelled). CONTENT-B resolved it with an authored
`slot.dx: false` waiver before the final run; both states (failing, then
waived-and-passing) were observed live.

`stat:'missing'`: fails unless the prompt OR the slot's own `label` mentions
"mean" (case-insensitive) — broadened to include `label` after the first
real-pack run showed `content-stats-averages.js` states the mean entirely
inside each slot's label ("The mean of 3, 5, 6 and ? is 6…") with a generic
prompt ("Find the missing value in each list.") — checking `q.prompt` alone
was a false positive on real, correct content. When `slot.given:{mean,n}`
is authored, cross-checked: known values (skipping `null`/`'?'` placeholders)
+ the answer must sum to `mean × n`, and the list length must equal `n`.

`stat:'total'`/`'newMean'` (reverse mean, `checkValuesReverseMean`): a
`total` slot is checked against `slot.given.mean × slot.given.n` when
given, ELSE (both accepted per the brief) back-derived from a sibling
`newMean` slot's own `ft` (`total = newMean_answer × n ∓ x`, `info()`-noting
which path was used — real content uses the `given` path exclusively, six
`info()` lines confirm it live). A `newMean` slot must carry
`ft.rule:'rm.newMean'`; its own re-derivation (`(total ± x) ÷ n`, `x` from
`ft.x` or a sibling slot via `ft.xFrom`) is checked, and `RM_AVERAGED_MEANS`/
`RM_WRONG_N` distinguishability is proved from `ft.oldMean`/`ft.oldN` OR —
mirroring `statcore.js`'s own `reverseMeanCtx` EXACTLY — the referenced
total slot's own `ft.mean`/`ft.n`. **Finding, not fixed (engine-owned):**
when a `total` slot is authored with `given:{mean,n}` rather than
`ft:{rule:'rm.total', mean, n}` (which is how EVERY `total` slot in
`content-stats-averages.js` is currently authored), neither the live engine
nor this lint can read an "old mean" for the `RM_AVERAGED_MEANS`/
`RM_WRONG_N` slip proof — both paths need the total slot's OWN `.ft`, not
its `.given`. This is not a gap I can close from the lint side (it would
mean inventing a numeric input the pack never supplies, and the engine has
the identical limitation, confirmed by reading `reverseMeanCtx`), so the
distinguishability checks simply don't run on `content-stats-averages.js`'s
six reverse-mean questions today — recorded here for whoever authors the
next such question, or for ENGINE-B if `rm.total`'s `ft` form is meant to
become the required shape.

`stat:'medianClass'` (CONTENT-B's own name, NOT in the original CONTRACT_B
list I was given — the Xtra Brite reserve item, §18.2 s5 q5, an
interpolated-median ESTIMATE from a grouped table): accepted as a
recognised stat and re-derived via a fresh `interpolatedMedian(D)`
(standard `L + ((n/2 − CF_before) / f_median) × width`) WHEN the question
carries `fig:{type:'table', cols:[…]}` — the same `cols` shape as the
`table` kind. `content-stats-averages.js`'s actual q29 (s5, reserve) has NO
such `fig` yet (the grouped data — "0<t≤12(19), 12<t≤24(53)…" — lives only
in its `src` comment, not structured data), so this is currently `info()`-
reported, not checked; flagged for CONTENT-B to add the `fig` if the
≈28.5-month estimate is meant to be lint-proved (it is real, hand-worked
arithmetic in `CONTENT_NOTES.md`, just not yet machine-checkable).

`earns` (any `values` slot, any book): fails if present and not
`'method'`/`'accuracy'` exactly (was previously unchecked). `order` (when
authored): every id must name a real slot (previously unchecked — a stray
id would have silently dropped that slot from both `valuesUnits` and
`markValues`, which both iterate `order`, never `slots`).

`set:5` constraint sets (`checkConstraintSet`/`constraintSetSatisfiable`):
brute-forces non-decreasing 5-tuples of positive integers ≤ 30 (≤ C(34,5) =
278,256 combinations, well under a second even unpruned; `median` fixes the
middle value up front, pruning hard in the common case) and fails if none
satisfy `{n, mean, median, mode, range}`. Proven satisfiable on
CONTENT_NOTES.md's own worked examples ({4,4,5,7,10} for mean 6/median
5/mode 4) and proven-unsatisfiable in the probe pack below.

`fig:{type:'list'}`: recognised in `checkValuesFig` (previously fell through
untouched) — fails if `values[]` is missing/empty, or if any entry (other
than a `null`/`'?'` missing-value placeholder) does not parse as a number.

## 5. `judge` — True/False/Not-enough-information proofs

**Scope decision (recorded, since CONTRACT_B's wording could be read two
ways and the "must stay GREEN on Books C and A" requirement decides it):**
"every TFN/options claim must carry a provable proof" is enforced ONLY for
a claim whose `options` includes `'Not enough information'` — Book C's
existing `options` claims (`['Increase','Decrease','Stay the same']`,
`['City A','City B']`) predate this rule and are not retrofitted, exactly
as rule 30 treats other locked-content precedent. Confirmed: Book C alone
still passes with zero proof-related failures.

**`q.data` shape (my decision, since `CONTENT_NOTES.md` did not exist yet
when I reached this rule and CONTRACT_B left the field name open):**
`q.data = { cols:[…] }` — the IDENTICAL `cols` shape as the `table` kind
(reusing `myTableDerive` unchanged) for every grouped/frequency proof; for a
plain list, `q.data = { values:[…] }`; for a two-group comparison,
`q.data = { A:{values:[…]}, B:{values:[…]}} }` (or `proof.A`/`proof.B`
directly, both accepted). **This guess turned out to be EXACTLY what
CONTENT-B authored independently** (`content-stats-averages.js` s5/q28,
Alma's seedlings — verified by reading the live pack: `data: { cols: [{id:
'cls', …}, {id:'f', …}] }`, character-for-character the shape decided here)
— no adaptation was needed once `CONTENT_NOTES.md` appeared.

Seven proof kinds, each evaluated independently and compared to the
authored `verdict` (fails naming both):
- `estMeanDivisor:{divisor}` — True iff `divisor == Σf`.
- `countAtLeast:{lo,says}` — an ungrouped list: exact count. A grouped
  table: NEI unless `lo` sits exactly on a class boundary, in which case
  the sum of frequencies from that boundary up is compared to `says`.
- `medianInterval:{row}` / `modalInterval:{row}` — True/False (NEVER NEI —
  a grouped table's median/modal ROW is always determinable) against
  `D.medianRow`/`D.modalRow` (ties make modalInterval unproven, `info()`).
- `exactFromGrouped:{stat}` (`checkExactFromGroupedProof`, its own function
  since it doesn't fit the generic verdict-compare shape) — the authored
  verdict MUST be NEI, PROVED by constructing two datasets consistent with
  the table (every item at its class's lower bound; every item at its
  upper bound) and showing `stat` differs between them; if they coincide,
  that's a real authoring fault (the claim is not actually undecidable on
  this data) and fails, naming the shared value. **Bug found and fixed
  mid-session:** the naive "all-lo vs all-hi" construction is WRONG for
  `stat:'range'` specifically — shifting every item together by a class's
  width leaves the RANGE unchanged whenever classes are equal width (the
  common case; caught live on `content-stats-averages.js` s5/q28's own
  Alma data, all five classes width 5: all-lo range = 20−0 = 20, all-hi
  range = 25−5 = 20, IDENTICAL, which would have wrongly failed a correct
  NEI claim). Fixed with the textbook-correct pair instead: widest possible
  (first class's lo to last class's hi) vs narrowest possible (first
  class's hi to last class's lo) — these differ by `width_first + width_last`,
  which is ALWAYS positive for any table with at least one class of
  positive width. **Consequence, recorded honestly:** this means the
  "coincide → fail" branch of the range special-case is, by that same
  algebra, UNREACHABLE for any validly-authored table (mirrors Book A's
  documented `PIE_PCT_NOT_DEG` unreachability) — implemented faithfully
  anyway, proven not to false-positive on real data (the probe pack's q29),
  and recorded here rather than silently dropped.
- `costOf:{n,says}` — NEI when `q.data.cols` has a class column; True/False
  when `q.data.values` is a uniform-price plain list (`n × price` vs
  `says`); otherwise not checked (`info()`).
- `changes:{stat,before,after}` — computes `stat` on both arrays via
  `myListStats` and compares to the authored verdict word
  (`Increase`/`Decrease`/`Stay the same`).
- `compareAverage:{stat,A,B}` (`checkCompareAverageProof`, also its own
  function) — deliberately NOT verdict-matched: which group is "better" is
  a domain judgement this lint cannot make (exactly how `checkCompare`
  already treats `context.higherIs` for the `compare` kind) — only
  DISTINGUISHABILITY is proved: the two groups' named stat must differ,
  else the claim can't be justified and it fails, naming the shared value.

A claim naming a `proof.kind` outside these seven, or no `proof` at all,
fails `claim has no lint-provable proof`.

## 6. Films (bracket/ring on a written list)

Read `checkMovie`'s existing `ring`/`bracket` cases closely (they already
check an index against `lastListLen`, itself updated by the most recent
`write`/`sub` op with more than one comma-separated item — exactly the
"parse the written line's numbers" mechanism the brief asked for, already
shared with every other book's movies, e.g. Book A's `ring` on a
stem-and-leaf median leaf). **No change was needed or made** — B·s1's own
movie ("four averages, one list": `write` the list, `write` it ordered,
`ring` the mode, `bracket` the middle) is proven correctly by the existing,
unmodified code, confirmed by the full-pack lint run showing zero movie
faults on `content-stats-averages.js`'s s1 movie.

## Proof method

Two throwaway `--pack` proof files, kept under this directory (not deleted,
per the brief's explicit path):
`node dev/lint-content-stats.js --pack tools/qa/out/bookB/lint-probe-pass.js`
→ 3 sections, 7 questions (table 1, values 3, judge 3), PASS, 0 failures —
every new rule exercised on CORRECT data (a grouped table with distinct
modal/median rows, a printed list with all four averages, a reverse-mean
pair matching the design's own canonical "4 girls, +1 aged 5 → 9" example, a
`set:5` constraint pack, and one judge question carrying all seven proof
kinds, all agreeing).
`node dev/lint-content-stats.js --pack tools/qa/out/bookB/lint-probe-fail.js`
→ 30 questions, one deliberate fault each (Book A's own precedent), 41
failures total (a few questions carry one incidental co-occurring
`marks: […] cannot be earned` alongside their intended fault, exactly as
Book A's `FIXTURE_A.txt` notes the same pattern — the marks arrays were
chosen quickly for the throwaway pack and were not the point of those
items). Every intended sentence fired; the full list (43 FAIL lines) is
reproducible verbatim with the command above. Representative lines:

```
table: has both an "x" column and a class column — exactly one is allowed
table: has neither an "x" column nor a class column
table: has no frequency ("f") column
table: class row 1 has lo ≥ hi (10–5)
table: class row 1 has no printed text
table: classes 1 and 2 are not contiguous (row 1 ends at 5, row 2 starts at 8)
table: totals names "nope" which is not a column
table: ask "mean" (mean): table gives 2 but answer says 99
dx: ask "mean": "AV_DIV_ROWS" equals the truth
dx: ask "mean": "AV_FX_NOT_SUMMED" equals the truth
table: ask "mean" ft "fx/f" is not of the closed sum(a)/sum(b) form
table: ask "median" is a median value ask and must carry no ft (ft is only ever sum(a)/sum(b), for a mean)
table: ask "modal" (modal row): table gives row 1 but answer says 0
values: slot "a" earns "bonus" — must be method or accuracy
values: order names "nope" which is not one of this question's slots
values: slot "a" stat "stdev" is not a recognised stat
values: slot "a" stat mean: printed list gives 2 but answer says 99
dx: slot "a": "AV_RANGE_NOT_DIFF" equals the truth
values: slot "a" is stat:"missing" — a missing value cannot be found from the list alone, and neither the prompt nor the slot label states the mean
values: slot "a" (missing value) does not reconcile with given.mean = 6, given.n = 3
values: slot "a" constraints (n:5, mean:1, median:29, mode:1) have no solution of 5 positive integers ≤ 30
values: fig:{type:"list"} has no values[] printed
values: slot "total" (total): given.mean × given.n = 40 but answer says 999
values: slot "nm" stat:"newMean" needs ft.rule "rm.newMean"
values: slot "nm" (newMean): re-derived 9 but answer says 999
dx: slot "nm": "RM_AVERAGED_MEANS" equals the truth
judge: claim 1 has no lint-provable proof
judge: claim 1: proof (estMeanDivisor) gives verdict "False" but authored verdict is "True"
judge: claim 1 (exactFromGrouped): only NEI can be proved from grouped data, but the authored verdict is "True"
judge: claim 1 (compareAverage): both groups' mean are 6 — no group is definitively better
```

Both proof packs were re-run after every subsequent edit in this file (not
only once at the start) — most recently right before writing this note.

## Left / not done, for the next package or Damien

1. **`stat:'medianClass'` (Xtra Brite estimate) has no structured `fig` yet**
   — see §4 above; needs `fig:{type:'table', cols:[…]}` from CONTENT-B to
   become lint-proved rather than `info()`-reported.
2. **RM_AVERAGED_MEANS/RM_WRONG_N are unprovable on `content-stats-averages.js`'s
   six reverse-mean questions today** because every `total` slot uses
   `given:{mean,n}` rather than `ft:{rule:'rm.total',…}` — an engine-shared
   limitation (see §4), not something this package can or should patch
   unilaterally.
3. **CONTENT-B's own flag, relayed:** the s3 "which average makes her ≥£15
   statement correct" judge claim (rugby/cats/M7 section) was deliberately
   left unauthored because none of the seven proof kinds fit a three-way
   "which of mode/median/mean crosses a threshold" claim on an UNGROUPED
   table — `compareAverage` is positional/binary (A vs B), the rest are
   grouped-table-specific. If that claim is wanted as a scored item, it
   needs an eighth proof kind (e.g. `thresholdCompare:{stat,threshold,says}`)
   — not built here, for the 60-minute cap.
4. **`exactFromGrouped(range)`'s "coincide" branch is mathematically
   unreachable** for any table with at least one positive-width class (see
   §5) — implemented faithfully, proven not to misfire, recorded rather than
   silently dropped, exactly as Book A's `PIE_PCT_NOT_DEG` finding was.
5. Not separately fixtured (mechanism proven by a sibling case, or judged
   lower-risk given the time cap): `countAtLeast` on a grouped table where
   `lo` does NOT sit on a class boundary (should read NEI — same code path
   as the boundary case, just the `onBoundary` guard, not driven to fail
   in the probe pack); `medianInterval`/`modalInterval` returning `undefined`
   (missing data, `info()`-only) when `q.data.cols` is absent entirely;
   `costOf` on a non-uniform-price list (falls through to `info()`, not
   `fail()`, by design — there is no single price to check against `says`).
