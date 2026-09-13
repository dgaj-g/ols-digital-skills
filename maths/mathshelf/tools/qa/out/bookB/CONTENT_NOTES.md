# CONTENT_NOTES — Book B, "Handling Data · Averages" (content-stats-averages.js)

CONTENT-B package, 13 Sept 2026. Owns exactly: this file, content-stats-averages.js
(in this scratch folder — the orchestrator moves it), tools/qa/vocab/stats-averages.json,
tools/qa/out/bookB/pages/ (extracted booklet PNGs). Worked in
/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf only; nothing committed.

## Status
Pack `node --check`s clean. Lints PASS both alone and loaded alongside
content-stats-quartiles.js (Book C) and tools/qa/out/bookA/content-stats-collect.js
(Book A) — `NODE_PATH="$(npm root -g)" node dev/lint-content-stats.js --pack ...`.
No unknown-kind or unknown-rule failures: mid-session the build coordinator reported
LINT-B's `table` kind and FT rules had landed in statcore.js, and by the time this
pack was linted the structural lint (dev/lint-content-stats.js) already recognised
`table` too — so this pack got a full structural + re-derivation pass, not just a
syntax check.

29 questions across 5 sections (values 16, table 9, judge 4). **Core units: 22**
(s1 6, s2 6, s3 3, s4 3, s5 4 — values/table/judge = 1 unit each, §20.4), under the
≤26 cap and close to the design's own "≈23" estimate. 7 reserve questions.
No section states a WALT in any source — every `walt` string is authored in her
register from the section title, per §16 convention 1's precedent (flagged here
per instructions, not per-section below).

## Images read (booklet PNGs, extracted 13 Sept 2026)
`unzip -o -j "Data Collection and analysis Booklet no answers.docx" 'word/media/*' -d tools/qa/out/bookB/pages/`
— image numbering confirmed against SOURCE_INVENTORY.md §1.4's own file-order list.
Rendered and read directly (Read tool on the PNG):
- **image3.png** (definitions poster) — exact quoted text: "The mode is the value
  that appears most often in a set of data." / "The range is the difference between
  the lowest value and the highest value." / "The median is the middle number in a
  list of numbers ordered from lowest to highest." / "The mean is the total of all
  the values, divided by the number of values." Used near-verbatim in the s1 movie.
- **image5.png** (advantages/disadvantages/used-for table, Mode/Median/Mean) — full
  text read and condensed into the s5 movie's opening table (her words, credited
  in authoredNarration).
- **image25.png** (the two T/F/NEI worked tables) — full text read for BOTH tables:
  left (Alma's seedlings, n=30, Σf=30, Σfx=415) verbatim statement wording used in
  q28; right (bread prices, n=20, Σfx=1855) used for the s5 movie's three judged
  claims (mean TRUE, modal-interval FALSE, "3 loaves cost 87p" NEI).
Not rendered (inventory's own transcription was already unhedged and used as-is):
image4 (list), image6 (rhyme + worksheets a-f), image7 (g/h constraints), image8
(Alice's cards), image10/11 (reverse mean), image12 (sweets), image13 (rugby),
image14 (vouchers), image15 (cats), image16-18 (grouped/Heathrow/laps), image19
(words-per-sentence), image20 (test results), image23 (salaries), image24 (Xtra
Brite/Bright Bulbs), image26 (sunshine), image27 (surgery).
Statistics M7 (1).pdf: Q6 (laps), Q18 (days absent), Q20 (pocket money), Q22
(grouped reasoning), Q30(b) (4.6→4.5) all taken from SOURCE_INVENTORY.md §1.9's own
transcription (unhedged); no PDF pages rendered for this book (Book A already
rendered the pages this pack's M7 items live on; the datasets are unambiguous and
the inventory quotes them fully).

## Every re-derived answer, with the arithmetic
**s1** (a) 3,12,4,6,8,5,4 → sorted 3,4,4,5,6,8,12: mean 42/7=6, median 5, mode 4,
range 12−3=9. (b) 7,21,2,17,3,13,7,4,9,7,9 (n=11) → sum 99, mean 9, median (6th)
7, mode 7 (×3), range 21−2=19. (c) 12,1,10,1,9,3,4,9,7,9 (n=10) → sum 65, mean 6.5,
median (5th+6th)/2=(7+9)/2=8, mode 9 (×3), range 12−1=11. (d) 8,0,3,3,1,7,4,1,4,4
(n=10) → sum 35, mean 3.5, median (3+4)/2=3.5, mode 4 (×3), range 8−0=8.
(e) 3+5+6=14, mean×4=24, missing=10. (f) 7+8+4=19, mean×4=32, missing=13.
Alice: known 3,8,5; mode 5 needs a second 5; sum needed 6×5=30, remaining two sum
14, so 5 and 9; sorted 3,5,5,8,9 → range 6.
Reserve (g) mean6/median5/mode4/n5: e.g. {4,4,5,7,10} (sum30, median5, mode4).
(h) mean=median=mode=range=4/n5: e.g. {2,4,4,4,6} (sum20, median4, mode4, range4).
Both solutions exist; not embedded in the pack (only the constraints are), noted
here as the "at least one solution exists" evidence the design asks for.

**s2** grid1: 2×8=16, +5=21, /3=7. grid2: 3×18=54, +6=60, /4=15. grid4: 3×15=45,
new total 4×12=48, added=48−45=3. grid7: 5×30=150, new total 4×25=100, removed=
150−100=50. grid9: 9×10=90 (boys), 9×15=135 (girls), combined 225/18=12.5.
M7 Q6: 8×48.2=385.6, 10×49.4=494, last 2 total=494−385.6=108.4, per-lap=54.2.
Reserve grid8: 25×26=650, sell a 20yo → (650−20)/24=630/24=26.25. grid10:
10×21.8=218, adults 4×35=140, children (218−140)/6=78/6=13. grid11/grid12
(father's age; the two-team player-swap) are NOT authored — both need a value
solved from two combined constraints that the closed FT_RULES table cannot express
without contriving an `n:1` "just subtract" call; rather than force an artificial
formula through `rm.newMean`, they are left out. Hand-worked for the record:
grid11 father=35 (parents' total 126−39−20=67; father+(father−3)=67); grid12
Team B's new mean = 328/12 = 27⅓.

**s3** rugby: n=23, cumulative 5,10,19,23; median position (23+1)/2=12th value →
falls in age 20 (cum reaches 19 at age20, 10<12≤19) → median 20. cats: fx=6×0+13×1+
7×2+3×3+1×4=0+13+14+9+4=40, n=30, mean=40/30=4/3≈1.33. M7 Q18: fx=0+8+12+21+8+5=54,
n=36, mean=54/36=3/2=1.5. Reserve vouchers: fx=5×34+10×26+20×9+50×7+100×4=170+260+
180+350+400=1360, n=80, mean=1360/80=17; mode=£5 (freq34, highest); median position
(80+1)/2=40.5th, cumulative 34,60,69,76,80 → both 40th and 41st fall in the £10
class (cum reaches 60 at £10) → median=£10. The "which average makes her ≥£15
statement correct" judge claim (mean=17≥15, true) is NOT authored as a scored
question: none of the seven landed `proof` kinds (estMeanDivisor, countAtLeast,
medianInterval, modalInterval, exactFromGrouped, costOf, changes, compareAverage)
fit a three-way "which of mode/median/mean satisfies a threshold" claim on an
UNGROUPED table — compareAverage is positional/binary (A/B), the rest are grouped-
table-specific. Deferred rather than forced; flagged for LINT-B/design to add a
matching proof kind if this claim is wanted as a scored item later.

**s4** Heathrow (movie): midpoints 5,15,25,35,45,55; fx=135,150,175,175,180,110;
Σf=55, Σfx=925, mean=925/55=16.8 (dp1); modal class row0 (freq27 highest); median
position (55+1)/2=28th, cumulative 27,37,... → 28th falls in row1 (10-20).
words-per-sentence: midpoints 3,8,13,18,23; fx=18,40,52,36,69; Σfx=215/20=10.75;
modal row0 (freq6); median position (20+1)/2=10.5th, cumulative 6,11,15,17,20 →
both 10th and 11th fall in row1 (6-10) → median row1. test results: midpoints
47,62,77,92; fx=235,496,539,368; Σfx=1638/24=68.25; modal row1 (freq8); median
position (24+1)/2=12.5th, cumulative 5,13,20,24 → 12th and 13th both in row1
(55-69) → median row1. M7 Q20 pocket money: midpoints 1.5,4.5,7.5,10.5,13.5,16.5;
fx=9,81,120,231,175.5,66; Σfx=682.5/79=8.6392…≈8.64 (dp2, 1365/158 exactly); median
position (79+1)/2=40th, cumulative 6,24,40,62,75,79 → 40th is the last value of
row2 (6<p≤9) → median class row2. Reserve sunshine: fx=27,202.5,277.5,199.5,54;
Σfx=760.5/123=507/82≈6.18 (dp2). surgery: fx=17.5,60,62.5,87.5,90,27.5; Σfx=345/30=
11.5; modal row1 (5<t≤10, freq8 highest). AA (n=160, sums to 2+23+48+31+27+18+11=
160 ✓) and roots (n=47, sums to 6+9+15+9+6+2=47 ✓) are confirmed but NOT authored
as questions — the design map names them only by `n`, with no mean/modal/median
target given, so there is nothing to build against; left for a future pass if
Colette asks for more grouped-table reserve material.

**s5** M7 Q30(b): babies' 17 weights from the stem-and-leaf (2.4,2.6,2.8,2.8,3.0,
3.5,3.5,3.5,3.7,3.8,3.9,4.1,4.2,4.2,4.3,4.6,5.1); replacing 4.6→4.5 changes neither
the min/max (range unchanged), nor the 9th/median value 3.7 (unchanged), nor the
modal value 3.5×3 (unchanged) — only the mean shifts down by 0.1/17. Same source
item as Book A's own q23; reused here per §18.2 s5 q1's explicit instruction,
worded as four Changes/Stays-the-same claims instead of Book A's Change/Stay-the-
same-per-stat phrasing.
M7 Q22: original table 0≤x<20(7),20≤x<40(4),40≤x<60(4),60≤x<80(3),80≤x<100(4),
n=22; both new scores (21, 39) land in class 20≤x<40, raising its frequency to 6,
n=24. Modelled as midpoint-repeated lists (10×7,30×4,50×4,70×3,90×4 before; 10×7,
30×6,50×4,70×3,90×4 after) so the `changes` proof's before/after arrays are
literally the grouped-mean estimation method applied twice — range 90−10=80 both
times (unchanged); mean 960/22=43.6363…→1020/24=42.5 (matches the design's own
stated values exactly, confirming this is the intended method, not an invented
shortcut). New median-containing class: cumulative (after) 7,13,17,20,24, position
(24+1)/2=12.5th → row1 (20≤x<40).
Salaries extension: not independently re-derived to a full mean/median estimate —
the authored claim is the qualitative "median better represents typical salary"
verdict the source's own part (c) asks for (the top class 50<s≤200 is wide and its
few high earners would pull a mean estimate up; the median sits inside a normal,
narrow class). `proof:{kind:'compareAverage', stat:'typical salary', better:'B'}`
uses a POSITIONAL reading of A/B (A=claims[0].options[0]='Mean', B=options[1]=
'Median') since the landed proof shape names A/B for a two-GROUP comparison and
this is a single-dataset either/or claim — the nearest fit, documented in the
pack's authoredNarration array too, not just here.
Alma's seedlings (image25 left): Σf=30, Σfx=415 → "415÷5" uses the wrong divisor
(should be 30) → False. Range: only knowable as "between 20 and 25", not the exact
25 claimed → NEI. "5 seeds ≥20mm": only class 20<h≤25 (freq7) qualifies → actually
7, not 5 → False. Median position (30+1)/2=15.5th, cumulative 5,10,14,23,30 → 15th
and 16th both fall in row3 (15<h≤20, cum reaches 23) → median interval 15<h≤20 →
True as claimed. Modal row is row3 (freq9, highest) — the claim asserts row0
("was 5", reading the class's upper bound as if it were the answer) → False.
Reserve Xtra Brite: Σf=200 across 0<t≤12(19),12<t≤24(53),24<t≤36(74),36<t≤48(42),
48<t≤120(12); cumulative 19,72,146,188,200; median position 100th falls in class
24<t≤36 (cum reaches 146); interpolated median = 24 + ((100−72)/74)×12 =
24 + 336/74 = 24 + 168/37 = 1056/37 = 28.5405… → authored to 1dp as 28.5 (slot
`dp:1`), distinct from Bright Bulbs' given 30, exactly as the design requires.

## Judge `proof` metadata (mid-session addition, per the build coordinator)
Every judge claim with `options` carries a `proof` object for LINT-B's forthcoming
independent re-derivation checker; the pupil-facing engine (statcore.js `markJudge`)
does not read `proof` — it grades from `options`/`verdict` alone, unchanged from
Books A/C. Full mapping:
- q25 (Q30b): four `{kind:'changes', stat, before, after}` — before/after are the
  17 babies' weights, one with 4.6 replaced by 4.5.
- q26 (Q22): two `{kind:'changes', stat:'range'|'mean', before, after}` using the
  midpoint-repeated lists above, one `{kind:'medianInterval', row:1}` with `data`
  carrying the AFTER table's cols (cls + f).
- q27 (salaries): one `{kind:'compareAverage', stat:'typical salary', better:'B'}`,
  positional A/B as explained above.
- q28 (seedlings): `{kind:'estMeanDivisor', divisor:5}`, `{kind:'exactFromGrouped',
  stat:'range'}`, `{kind:'countAtLeast', lo:20, says:5}`, `{kind:'medianInterval',
  row:3}`, `{kind:'modalInterval', row:0}` — `data` carries Alma's table (cls+f).
No `proof` on q29 (Xtra Brite) — authored as a `values` question (a single number
to estimate), not a `judge` claim, so no proof kind applies.

## Deviations from a literal source-marks copy (documented, not silent)
- q6 (Alice's cards): range slot given `w:2` so the item's 2 method + 2 accuracy
  units are reachable, matching the source's printed [4] total (2 missing values +
  a doubled-weight range, rather than 3 evenly-weighted units summing to 3).
- q20/q21 (words-per-sentence, test results): booklet gives no marks (blank
  pupil exercise) — assigned `[2,3]` (5 total, the lint's per-question cap) rather
  than the `[3,3]` first drafted, which exceeded the 1-5 total-marks rule.
- s2 movie: the contract's own text calls this "5 steps (short by design)", but
  the general movie-structure rule requires 6-10 steps; split the closing
  box+red-note beat into two steps to reach 6 without adding any new content.

## Notation
Every printed class range renders exactly as the source prints it (§16 item 4):
plain hyphens for the booklet's own "0-10"-style classes (Heathrow, words-per-
sentence, test results — the source has no inequality signs there) and the
inequality form ("0 < p ≤ 3" etc.) for M7 Q20, Q22 and the extension-pack tables,
which the source itself prints with ≤/< signs. `lo`/`hi` boundaries are given
alongside every printed `text` per the contract. "Frequency" is the header
throughout (§16 item 6); "men" is not used anywhere in this book (grid3, the one
booklet item with the "24 men / 25 boys" inconsistency, is not in the design map
for Book B and was not authored). No "width 4" note is echoed (§16 item 5 — N/A,
this book's own grouped tables are all correctly described).

## Left outstanding
- Image9 (three "fill in the boxes" puzzles) and the salaries-mean/median-estimate
  and Xtra-Brite-percentage-over-5-years sub-parts are not authored (reserve,
  "if expressible" / time cap) — content is fully transcribed in
  SOURCE_INVENTORY.md §1.4 if wanted later.
- s2 reserve grid11 (father's age) and grid12 (team swap) not authored — see the
  s2 arithmetic note above for why the closed FT_RULES table doesn't fit cleanly,
  with both hand-worked so a future pass can author them as plain (no-ft) answer
  slots if wanted.
- s3 reserve vouchers: the table (mode/median/mean) IS authored (q19); the
  companion "which average makes her statement correct" judge claim is not,
  pending a proof kind that fits an ungrouped three-way comparison.
- s4 reserve AA/roots: not authored (design map gives no target beyond `n`).
- Fable re-review not requested this session (time-capped package; the orchestrator
  owns cross-package review).

## Post-install fixes (coordinator round, after the pack was copied to the app root)
All in tools/qa/out/bookB/content-stats-averages.js only, then re-copied to the
root by me on the coordinator's explicit authorisation, per their instruction:
1. authoredNarration[4] and q20's `src`: "images 16-18" → "images 16–18" (en-dash;
   qa-notation reads the ASCII hyphen between "6" and "1" as a minus sign).
2. q8 prompt: "A third girl, aged 5, joins them" → "Another girl aged 5 joins
   them" (qa-language's bare-gesture-adjacent lexicon fires on "girl,").
3. s5 movie step 7 `say`: the two-dash chain ("...was 10." Ten is only the
   frequency — the modal interval is 95-99 — false.") rewritten as one
   semicolon-joined sentence with a single en-dash range: "...was 10." Ten is
   only the frequency; the modal interval is 95–99, so this is false.'
4. vocab define-before-use: "average" re-pointed to a NEW s1 film caption
   ("Mean, median and mode are all types of average — one number that sums up
   a whole list.", added as s1's opening step, taking the film from 8 to 9
   steps) since no existing caption anywhere before s2's q13 (which uses the
   word "average") actually defined the term; "grouped" re-pointed to the
   exact substring of s4's own closing red note ("A grouped table gives an
   estimate, never an exact value...") — the previous phrase was a paraphrase
   that didn't literally match any caption, so the define-before-use checker
   couldn't find it at all.
5. Text-damage near-duplicates: s5 film retitled "The £110 test" (was
   96% identical to the section title); q5 slot labels shortened to "First
   missing value"/"Second missing value" (was 92% alike) with both means
   moved into the prompt; q10/q11 "Total of..." labels reworded to "Total
   before the number is added" / "Total of all five before one is removed".
6. q5: both means now stated in the prompt text itself (needed for the
   stat:'missing' mentions-the-mean check now that the means are no longer in
   the slot labels).
7. q29: slot `stat:'medianClass'` — first dropped per the coordinator's
   instruction, then RESTORED once a newer lint landed a proper
   `checkValuesMedianClass` re-derivation for exactly this stat (named after
   this package in the lint's own comment). Restoring it needed a `fig:
   {type:'table', cols:[...]}` carrying the Xtra Brite grouped table (added)
   so the interpolated-median truth (1056/37 ≈ 28.5405…) could be checked
   against the authored 28.5 (dp:1) — it passes.
8. q4 (worksheet (d), list 8,0,3,3,1,7,4,1,4,4): the newly-landed
   AV_RANGE_NOT_DIFF distinguishability check failed, because this list's
   minimum is 0 — max, min and max+min all equal the true range (8) on this
   exact printed list, so the classic range-slip is genuinely undetectable
   here. This is a property of the source data, not an authoring error, so
   the range slot carries the pack's documented `dx:false` waiver rather than
   forcing a different (undetectable) dx or altering the source list.
9. q25 (M7 Q30(b)): added `fig:{type:'list', values:[...]}` with the 17 babies'
   weights (the same "before" list as the claims' `changes` proofs) so the
   renderer shows the list above the claims — the pupil can see whether 4.6
   is genuinely the mode/median before judging what changes.
10. q27 (salaries extension): added `data:{cols:[...]}` — the salary table as
    the extension source prints it (0<s≤10(8), 10<s≤20(48), 20<s≤30(50),
    30<s≤50(11), 50<s≤200(3), n=120) — SOURCE_INVENTORY.md §1.4 image23
    explicitly transcribes this as a printed table, not bare prose, so the
    full grouped table is now shown, not just the two headline averages.

All four gates green after these fixes, run from the app root exactly as
instructed: `NODE_PATH="$(npm root -g)" node dev/lint-content-stats.js --pack
tools/qa/out/bookB/content-stats-averages.js` → PASS; `node tools/qa/qa-language.js`
→ GREEN (194 checks); `node tools/qa/qa-notation.js` → GREEN; `node
tools/qa/qa-text-damage.js` → GREEN. The lint's four `myTableDerive` "table
gives 4/3 (133/100 to 2dp)" rows on q17/q22/q23 that appeared in an earlier
run were a lint-side rounding bug per the coordinator (LINT-B fixing) and are
not present in the latest run in any case.
