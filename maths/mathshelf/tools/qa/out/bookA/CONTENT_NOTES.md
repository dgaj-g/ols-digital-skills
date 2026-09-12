# Book A content notes — Handling Data · Collecting and displaying

Pack: `tools/qa/out/bookA/content-stats-collect.js` (authored in scratch, per CONTRACT_A —
the orchestrator moves it to the app root). Vocab: `tools/qa/vocab/stats-collect.json`.
Page renders: `tools/qa/out/bookA/pages/pN-NN.png` (200dpi unless noted).

## Final lint result

```
NODE_PATH="$(npm root -g)" node dev/lint-content-stats.js --pack tools/qa/out/bookA/content-stats-collect.js
...
[lint-content-stats] sections: 5 · questions: 32 (judge 14, pick 3, order 1, values 5, pie 2, stemleaf 4, scatter 3) · movie steps: 39 · marks: 87
  statcore.js present — independent numbers cross-checked against the engine
PASS
```

15 real LINT-A failures were found and fixed on the first run (none were "unknown kind" —
LINT-A's Book A rules were already complete by the time this pack ran the lint):
1. s1 q2/q4/q14 `pick`: two options had identical `text` — reworded the third variant's
   question text (still the same underlying flaw) so all three are textually distinct.
2. s2 movie: `vfill.region` used the circles' own ids (`M`,`S`,`MS`) — the venn ops use the
   fixed region alphabet (`A`,`B`,`AB`,`out`) regardless of the circles' display ids;
   circles renamed `A`/`B` (labels stay "Milk"/"Sugar").
3. s2 q16 "Field altogether": **dropped**. The venn checker (`checkValuesVenn`) requires
   every slot to occupy exactly one of the four partition regions and the full set to sum
   to `n` — a circle-total slot isn't expressible in that model (it would double-count
   region B). q16 now has 4 slots (both, trackOnly, neither, fieldOnly), marks [2,2].
   See the "Q16 reasoning" section below for the fuller honest-ft-chain discussion this
   forced.
4. s2 q17 (reserve, venn3): region ids must be the canonical `A/B/C/AB/AC/BC/ABC/out`,
   not custom labels (`Ab`) — circles renamed to canonical `A`=Sailing, `B`=Cycling,
   `C`=Abseiling, and every slot's region and the `totals` dict keys renamed to match.
   The "8 regions sum to 82, not 90" failure was a side-effect of the same bug (the
   invalid-region slot was silently excluded from the sum); it resolved once the regions
   were valid. Marks trimmed from [5,3] (structurally invalid, total 8) to [3,2].
5. s4 movie: a `ring` op at step 8 referenced index 20 into nothing (the coin diagram
   isn't a `write` line) — dropped the ring, kept the write+tick.
6. s4 q24: the given key `{stem:2, leaf:1, means:'21 marks'}` didn't reproduce a value
   actually in the question's own `values` (boys). SOURCE_INVENTORY.md's own transcription
   of this key ("2|1 means 12 marks") is internally inconsistent (stem 2 leaf 1 reads as
   21, not 12, under this pack's stem-first convention throughout) and neither reading
   matches a boys' value under stem 2. Replaced with `{stem:2, leaf:4, means:'24 marks'}`
   — 24 is a real boys' value, prefilled (stem 2 is in `stemsDone`), so the key is
   self-consistent with the diagram exactly as drawn.
7. s5 movie: `rule` op needs `h`, not `x`, even when the read is along the horizontal
   axis (the op's parameter name is fixed, reused from `cfread`) — step 6 fixed.

## Page-read values (re-rendered from "Statistics M7 (1).pdf", 200dpi except noted)

Physical PDF page numbers drift from the DESIGN §18.1 / SOURCE_INVENTORY.md "Qn" labels
from Q11 onward (Q9/Q10 together consume 2 pages, Q21 consumes 2 pages, etc. — the compiled
test bank's own printed numbering is NOT "Q1 on p4, one per page" past Q10). Page evidence:

- **p7** (`p7-07.png`) prints "Q4" — Tim/June scatter, matches the design map's citation
  exactly (used only in the s5 movie, not a question).
- **p15** (`p15-15.png`) prints **"Q11"**, not "Q12" — this is the engine-size v distance-
  per-litre scatter (table: 1.0/1.8/2.4/1.2/2.1/1.5/2.7 litres against 12/8.6/5/9.4/5.9/
  10.2/3.8 km per litre). DESIGN §18.1 and SOURCE_INVENTORY.md both cite it as "Q12" — the
  dataset is unambiguous regardless; the pack's `src` field on q29 records both the design
  citation and the printed-page discrepancy. Axes read from the page: x "Engine size
  (litres)" 0–3 step 1; y "Distance (km)" 0–12 step 2. All data is 1-decimal, so both axes
  need `sq:0.1` to land every point on the grid (this makes the y-axis 120 small squares
  "up" — the ≤60 rule is read as an x-axis-only "across" cap, since Book C's own cfplot
  q12 already ships a 100-square y-axis).
- **p22** (`p22-22.png`) prints "Q18" (days-absent mean table) — used only to re-confirm
  the drift, not authored.
- **p23** (`p23-23.png`) prints **"Q19"** — height/weight scatter, matching the design
  citation exactly (no drift at this specific item). Axes read: x "height (cm)" with a
  break below ~155, labelled 160–200, grid extends to about 205; y "weight (kg)" with a
  break below ~38, labelled 40–80, grid extends to about 87. Chart authored as
  x:{min:160,max:210,step:10}, y:{min:40,max:90,step:10}, sq:{x:1,y:1} (heights/weights
  include odd numbers — 165, 197, 45, 77, 65, 63 — so sq must be 1, not 2).
- **p25–p26** (`p25-25.png`, `p26-26.png`) print "Q21" across two pages — not used (Q21
  is Book C content); rendered only to keep pace with the drift while hunting for Q25.
- **p27** (`p27-27.png`) prints "Q22" — not used; confirms drift is +5 by this point.
- **p28** (`p28-28.png`) prints "Q23" (28-mark stem-and-leaf) — this is the pack's
  reserve q26; the 28 printed values were cross-checked by count (28 ✓) rather than
  needing a second render.
- **p30** (`p30-30.png`) prints **"Q25"** — the voltage/current scatter, resolving the
  contract's flagged ambiguity decisively: **Student 2 = (Voltage 50, Current 5.2);
  Student 3 = (Voltage 30, Current 3.2)**, read directly off the three pre-plotted × marks
  on the page and cross-checked against the printed table's own column order (Student
  row: 1,2,3,4,5,6,7,8,9; Voltage row: 10,50,30,20,80,40,60,70,90 — column 2 is Student 2
  at Voltage 50). This matches the table's positional/column-order reading, not whichever
  alternative the inventory's prose note implied. The outlier (Student 7, Voltage 60,
  Current 3.8) is unaffected either way, as the contract noted. `given` = the three
  plotted points; `toPlot` = the remaining six in table order (Students 4–9), so the
  outlier's index into `given.concat(toPlot)` is 6.
- **p31** (`p31-31.png`) prints "Q26" (box plot, unscaled grid) — not used; confirms Q25
  ends before Q26 starts, closing the page hunt.

Pie totals (Q1 ice cream, Q11 sports, Q16 dogs) and stem-leaf data/keys (Q17 twigs, Q30
babies, Q12/Q13 back-to-back marks) were taken as fully and reliably transcribed text in
SOURCE_INVENTORY.md (not image reads at that point — the PDF is image-only but the
inventory's own transcription is exact printed text, e.g. table cells) and independently
re-verified here by arithmetic before authoring: Q1 48+31+29+12=120 and 48×3/31×3/29×3/
12×3 = 144/93/87/36; Q11 26+8+12+14=60 and ×6 = 156/48/72/84; Q16 12+9+14+5=40 and ×9 =
108/81/126/45; Q17's 15 twig values counted =15; Q30's 17 baby values counted =17 (range
2.7, mode 3.5 ×3, median 3.7, all recomputed from the sorted list); Q13's 27 boys' values
and Q12's 27 girls' values both counted =27, and the boys'/girls' medians recomputed
(39 vs 32) to settle q25's "who did better" verdict independently of the source's own
unstated answer. No page render was needed for these; recomputation from the fully
legible transcribed text was the re-check the task asked for.

## Q16 "Field altogether" — the ft-chain reasoning (recorded per the task's request)

The naive shortcut `fieldOnly = N − both − trackOnly − neither`, expressed as
`ft:{rule:'venn.outside', from:['both','trackOnly','neither']}`, is arithmetically correct
but was rejected: `venn.outside` is documented as "outside both = N minus every inside
region they wrote", and using it to derive an INSIDE region (fieldOnly, which sits inside
the Field circle) launders the rule's name to mean something it doesn't. The honest
alternative — `fieldTotal = fieldOnly + both`, derived as `N − trackOnly − neither`
(the two regions that genuinely lie entirely OUTSIDE the Field circle) — IS a semantically
clean use of `venn.outside`, and was the version kept in an earlier draft of this pack.
It was removed only because the venn checker (see fix #3 above) does not support a slot
outside the four-region partition at all, not because the reasoning was wrong. `fieldOnly`
itself now carries no `ft` (a plain accuracy answer): none of the three closed-table rules
(`venn.only`, `venn.outside`, `venn.both.fromTotals`) can honestly derive a circle-only
region from a pupil-entered value without either a static circle total (which Field
doesn't have) or the now-removed `fieldTotal` slot to route through.

For the reserve q17 (venn3, activity centre), `sailOnly` genuinely is the LAST unaccounted
region once the other seven are known, so `venn.outside` over all seven other slots is an
uncontroversial, correctly-scoped use of the same rule.

## Unit count (§20.4)

Core interaction units (order/pick/judge/values/stemleaf = 1; pie/scatter = 1.5):

| section | core units | core marks |
|---|---|---|
| s1 Questions and questionnaires | 9 | 20 (16 method + 14 accuracy across all 9, method/accuracy split above) |
| s2 Venn diagrams | 2 | 8 |
| s3 Pie charts | 3 | 8 |
| s4 Stem-and-leaf | 6 | 13 |
| s5 Scatter graphs | 5.5 | 16 |
| **Total core** | **25.5** | **65** |

25.5 ≤ 26 — under the cap with no need to move anything to Reserve. Marks total (core +
reserve, all 32 questions) = 87 per the lint's own count (16+14 s1, 7+6 s2, 4+4 s3, 8+12
s4, 9+7 s5 = 87 method+accuracy summed).

Reserve: s1 has 5 items (4 judge from textbook Exercise 13.4 items 2/3/5/6, 1 pick from
Corbett Q10(b)); s2 has 1 item (venn3, activity centre); s3 has none (the folder's whole
pie supply is the two Core items — DESIGN §18.1's "known thinness" note, not padded); s4
has 3 items (Q23 stem-leaf, the press-ups back-to-back pair + its judge); s5 has none
(Q27(b), "two variables with no correlation", is open-ended and not authored, matching the
existing convention of leaving free-response parts out rather than inventing a closed
form for them).

## WALT wording

No source in `stats_sources/` states an explicit WALT/"you should now" line for any of
these five topics (Surveys questions.docx has one unrelated footer fragment for a
different topic, decision trees). Every `walt:` field in this pack is therefore authored
in her S1 GCSE register directly from the section title, exactly as flagged as a
requirement in the build brief — flagging again here per the task's explicit ask.

## Left outstanding / judgement calls a reviewer should see

- `cans` self-evaluation chips (present in Book C's pack) are **not** included — CONTRACT_A's
  schema section for Book A does not list them, so they were treated as out of scope rather
  than guessed at.
- s4 q24/q27 back-to-back "given" sides are pack choices, not literal source scaffolding:
  Q13's own diagram only pre-fills the boys' stems 0–3 (girls' side is itself the answer to
  the companion Q12), and the press-ups notes example gives NEITHER side pre-drawn. Both
  are documented in `authoredNarration` as deliberate, non-inventive engine accommodations
  (real data, repositioned which side is "given").
- s1 pick questions (q2, q4, q14) source open pupil-design tasks with no printed model
  answer; the "best" option and the single-flaw variant are pack-constructed corrections
  of the source's own flawed boxes, per §17.4's own anticipation of this case (documented
  in `authoredNarration`).
- Every judge `claims` array beyond the single "fair:false + reason" claim (the paired
  "fair:true" claim, and every multi-option verdict claim) is a pack-authored sentence —
  the sources print blank criticism lines, never a model claim, matching Book C's own
  s6 convention.
