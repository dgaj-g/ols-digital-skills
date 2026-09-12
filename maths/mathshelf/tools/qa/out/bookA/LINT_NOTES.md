# LINT-A package notes — dev/lint-content-stats.js additions for Book A

12 Sept 2026, MathShelf Book A cut, LINT-A package. Worked only in
`maths/mathshelf` of this worktree. Files touched: `dev/lint-content-stats.js`
(additive), this file, `tools/qa/out/bookA/FIXTURE_A.txt` (draft). Did NOT
touch `dev/validate-all.js` — see "validate-all" section below. Did NOT
touch `tools/qa/fixtures/plants.js`.

## Baseline vs after (Book C only, no fixture pack)

Before AND after every edit in this session:
`NODE_PATH="$(npm root -g)" node dev/lint-content-stats.js` →
**sections: 6 · questions: 33 (qlist 5, values 4, judge 7, cftable 3,
cfplot 3, cfread 4, boxplot 6, compare 1) · movie steps: 51 · marks: 94 · PASS**
(unchanged — proven again after the final edit, not just once at the start).

`node dev/validate-all.js` → **81 questions checked — 81 sound, 0 need
attention** (unchanged, before and after).

## Rules added, by CONTRACT_A.md / DESIGN §17 section

**KINDS** gained `order`, `pick`, `stemleaf`, `pie`, `scatter` (line ~50).
**Q_IDS** (new const): the ten §17.8 questionnaire ids
(`Q_OVERLAP Q_GAP Q_NO_ZERO Q_NO_TIME Q_LEADING Q_VAGUE Q_NO_OTHER
Q_ONLY_POSITIVE Q_PERSONAL Q_OPEN`). `checkJudge`'s bank is now the §6.6
sampling bank UNION Q_IDS, for both `why`/`alsoWhy` and a new `reasons`
check. `checkPick`'s flaw check uses Q_IDS only (per CONTRACT_A, a pick
option's flaw is drawn from the questionnaire bank, not the sampling bank).

**order** (`checkOrder`): `answer` must be a permutation of `tiles` indices
(new rule, stem `order: answer is not a permutation of the N tiles`);
`cyclic:true` needs ≥3 tiles (stem `order: cyclic:true needs at least 3
tiles (got N)`).

**pick** (`checkPick`): exactly one `best:true` (stem `pick: exactly one
option must be best:true (found N)`); every other option needs a `flaw` in
Q_IDS (stem `pick: option N is not best but has no flaw id from the Q_*
bank`); no two options with identical `text` (stem `pick: options N and M
have identical text`).

**values + fig** (`checkValuesFig`, called from `checkValues`):
- `venn2`/`venn3` (`checkValuesVenn`): sums the slot answers by `region`,
  checks the whole-diagram total against `fig.n` and each circle's regions
  against `fig.totals`; a bad `region` id is also caught. Stem `venn: the
  regions do not add up — …` (three variants: whole-total, circle A, circle
  B/C). Same function handles both venn2 (4 regions) and venn3 (8 regions)
  parameterised by `is3`.
- `stemleaf` fig (`checkValuesStemleafFig`): reconstructs the printed list
  from `fig.rows` (split by `fig.decimals`), then re-derives whichever of
  range/mode/median a slot's `label`/`id` names (matched by a simple
  case-insensitive regex — CONTRACT_A does not fix a slot-id naming
  convention for this, so I inferred one; flag for the orchestrator if a
  different convention is chosen). Also checks a given `fig.key` reproduces
  a value on the diagram and that `key.means` carries that value. Stem
  `stemleaf: …`. Also runs the stemleaf-context telegraph check (below).

**stemleaf kind** (`checkStemleafKind`): leaves (from `values`, split by
`decimals` via the shared `splitStemLeaf`) reconstruct exactly onto stems
in `stems`; `prefill.stemsDone` names real stems; `back.values` split the
same way onto real stems; `key.ask` and a given `key` are mutually
exclusive; a given `key` reproduces a data value and carries `means` text.
Stems all `stemleaf: …`. NOT separately re-checked here: `LEAVES`/`ORDERED`
duplicate-or-missing-leaf detection beyond "wrong stem" (i.e. a value
present twice, or a value present zero times but on a stem that IS
correct) — the design's own dx names `SL_MISSED_LEAF`/`SL_WRONG_STEM` are
for the LIVE engine's per-attempt marking (statcore), not this static
authoring lint; the lint's job here is that the AUTHORED `values`/`stems`
data is internally consistent, which is what's implemented.

**pie kind** (`checkPieKind`): `total` = Σf (else `pie: total = X does not
equal Σf = Y`); every `f·360/total` an integer (else the CONTRACT_A-fixed
sentence `pie: angle for "<label>" is not a whole number of degrees`);
angles sum to 360 (else `pie: angles sum to N, not 360`); distinguishability
— percentage column vs degree column, else `dx: "PIE_PCT_NOT_DEG" equals
the truth` (fixed sentence, from the task spec).

  **Left / flagged for Damien or the orchestrator:** the PIE_PCT_NOT_DEG
  distinguishability test as specified compares `f·100/total` to
  `f·360/total` for the SAME `total` — these two formulas can only be
  numerically equal, for any category with f > 0, if 100 = 360, which is
  never. So on any real (positive-frequency) pie question this branch is
  mathematically unreachable — it can never fire a false negative on
  authored content, which is safe, but it also means the design's stated
  purpose ("so the slip is detectable") is automatically satisfied by any
  real data, not something the lint needs to actively verify per-question.
  I implemented it faithfully anyway (harmless, and proves the code path),
  and the FIXTURE_A.txt proof for it necessarily uses a degenerate
  all-zero-frequency pack to exercise the branch at all. Worth a second
  look before Book A ships if the intent was actually something else (e.g.
  comparing against a fixed total of 100).

**scatter kind** (`checkScatterKind`, plus module-level `leastSquares`/
`pearsonR`): `given`/`toPlot` disjoint (`scatter: given and toPlot share a
point`); every point on the grid and inside the axes, reusing the same
off-grid logic as `checkCfplot` generalised to any `y.min` (`scatter: (x,
y) is off the grid`); ≥2-square headroom on each axis (`scatter: x/y axis
has less than 2 squares of headroom …`); `corr` sign matches the
independently-computed least-squares slope's sign, with `'none'` allowed
only when the computed Pearson r has |r| < 0.3 (`scatter: corr answer "…"
disagrees with the least-squares slope's sign (…)` / `corr answer "none"
but |r| = … >= 0.3`); every `estimate.at` lies inside the plotted range of
its axis (`scatter: estimate at N lies outside the plotted range`); the
`outlier` index exists and its distance from the least-squares line FITTED
WITHOUT it exceeds every other point's distance from that same line
(`scatter: outlier at index N is not the point furthest from the line
fitted without it` / `outlier answer index N does not exist in
given.concat(toPlot)`). Distinguishability: the swapped-(y,x) multiset of
`toPlot` must differ from the true multiset, else `dx: "SC_XY_SWAPPED"
equals the truth` (fixed sentence, from the task spec).

**Telegraph phrases**: `TELEGRAPH_PHRASES` gained `× 360`, `360 ÷`,
`divide by the total`, `multiply by 360` (checked on every question's
prompt, existing mechanism, existing stem `prompt: telegraphs "…"`). A
separate targeted check, `checkStemleafTelegraph`, bans `(n + 1) ÷ 2`
ONLY inside a `stemleaf`-kind prompt or a `values` question whose `fig`
is a `stemleaf` — same stem. `"start in the middle"` is deliberately
absent from every list (Colette's own movie-caption hint, per §19/§16 —
NOT a prompt telegraph).

**Movie ops** (`checkMovie`, extended): `MOVIE_OPS` gained `venn`, `vfill`,
`pie`, `sector`, `stemleaf`, `leaf`, `key`, `lobf` (CONTRACT_A §19). Movie-
scoped state added: `vennRegions` (set by `venn`, used by `vfill.region`),
`stemleafStems` (set by `stemleaf`, used by `leaf.stem`), `filmLeaves`
(accumulated by `leaf`, used by `key`), `sectorSum`/`sectorCount` (checked
at the end of the movie against 360), `lastChart` (set by `chart`, used by
`lobf.through`). New movie stems, all rule `'movie'`:
`vfill.region "X" is not one of the film's venn regions at step N` ·
`sector degrees sum to N, not 360` · `leaf.stem N is not among the film's
stems at step N` · `key stem/leaf is not a value of the film's leaves at
step N` · `lobf.through has a point outside the film's chart at step N`.
Structural (missing-argument) faults on the same ops use rule `'structure'`
in the same style as the existing ops (e.g. `venn op needs 2 or 3 circles
at step N`, `sector.deg must be positive at step N`).

**Reachable marks** (`myUnitsOf`): gained `orderUnits`, a literal 2-entry
array for `pick` (PICK accuracy w1 + WHY method w1), `stemleafKindUnits`
(LEAVES + ORDERED method w1 each, +KEY accuracy w1 only when `key.ask`),
`pieKindUnits` (one method unit per cat = ANG_<id>, +SUM method w1,
+SECTORS accuracy w1, +LABELS accuracy w1), `scatterKindUnits` (POINTS
method w = `q.pointsW || 1`, + one unit per `asks[].type`: `lobf`→method
w1, `estimate`/`corr`/`outlier`→accuracy w1 each — only the units the
`asks` array actually names, per CONTRACT_A). All wired through the
existing `checkReachableMarks`/`marks: [m,a] cannot be earned` stem
unchanged.

## Where the lint's CONTROLS live (for the orchestrator)

`tools/qa/qa-selftests.js`, `const CONTROLS = [...]` at line 24. Today it
holds only `mutated-engine` and `lowered-floor`; its lint-run loop (line
~93) runs `dev/lint-content-angles.js` and `dev/lint-content-algebra.js`
only — **it does not yet run `dev/lint-content-stats.js` at all**, against
either the real packs or a fixture. `tools/qa/fixtures/plants.js` already
has `FIXTURE_BOOK`'s s2 section with the ORIGINAL ten Book-C §11.1 fixture
questions (`q101`-`q108`) proving the original ten stems — those are
untouched by this package. The orchestrator needs to (a) add a stats lint
run to `qa-selftests.js` (via `--pack` against a file built from
`FIXTURE_BOOK` plus this package's new fixture section), and (b) add
control id(s) for the Book A rules, each `mustFail` a regex on one of the
sentences recorded above / in `FIXTURE_A.txt`.

## Proof method

Built a throwaway pack `tools/qa/out/bookA/_dev_test_bookA.js` (9 sections,
21 questions + 3 movies, one deliberate fault per item, marks/units chosen
so `checkReachableMarks` never adds an incidental extra failure), ran:

    node dev/lint-content-stats.js --pack tools/qa/out/bookA/_dev_test_bookA.js

captured all 29 printed FAIL lines, matched each to its intended rule (one
retry needed: the first `outlier` fixture accidentally satisfied its own
"furthest from the line fitted without it" test — index 0 was genuinely the
biggest residual under that specific leave-one-out line, so I re-picked an
ordinary on-trend point as the wrong index instead, which correctly fails).
Pasted every sentence into `FIXTURE_A.txt`, then deleted the throwaway pack
(not one of this package's four owned files) after extracting the proof.
Book C's lint and `validate-all.js` were re-run with NO `--pack` flag
immediately after, both green with unchanged counts (see top of this file).

## Left / not done, for the next package or Damien

1. **PIE_PCT_NOT_DEG unreachability** — see the flagged note under "pie
   kind" above. Worth a second look at the design intent.
2. **`dev/validate-all.js` untouched.** Its `KINDS` const and stats loop
   iterate `['stats-collect','stats-averages','stats-quartiles']` and
   already skip a pack that doesn't exist (`try { require(...) } catch`),
   so nothing broke — but it has NO per-kind corrupted-attempt builder yet
   for `order`/`pick`/`stemleaf`/`pie`/`scatter` in `dev/model-attempts.js`
   (a file I did not open — out of this package's ownership). That is
   needed before Book A's actual content pack can pass `validate-all.js`,
   but is not this package's job per the brief ("only if its stats loop
   needs a per-kind corrupted-attempt LABEL" — it doesn't need a label
   change, it needs new builder functions in `model-attempts.js`, a
   different file).
3. **Not separately fixtured** (mechanism proven by a sibling case, or
   judged lower-risk given the 60-minute cap): venn3 (same function as
   venn2, parameterised); stemleaf `LEAVES`/`ORDERED` duplicate-or-missing
   detection beyond wrong-stem; `back.values` stem mismatch; a given
   stemleaf key failing to reproduce a data value; movie `key` op vs
   `filmLeaves` mismatch; movie `lobf.through` outside the film's chart;
   `judge`/`reasons` naming an id in neither bank (the union itself IS
   exercised — every pick-fixture option above uses a real Q_* id and
   passes that half cleanly). All use the SAME code paths already
   exercised by a passing case in the throwaway pack, just not driven to
   fail there too.
4. **Slot-name convention for stemleaf-fig reads** (range/mode/median) is
   inferred (case-insensitive match on `label`/`id`) because CONTRACT_A
   doesn't fix one — flagged above, worth confirming with whoever authors
   the actual Book A content.
