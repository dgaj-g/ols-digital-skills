# WORDS-C — Book A cut, 12 Sept 2026

Package: honour the cold read's REWRITE/FAIL rows on Book C (stats-quartiles),
carried forward per PROGRESS.md's "POLISH CUT 2" entry. Judged against
`tools/qa/MATHS_COLD_READ_VERDICTS_stats-quartiles.md` (transcript hash
`2948e55f2149278c`) and `tools/qa/COLD_READ_CHECKLIST.md`. Owned files only:
`content-stats-quartiles.js` and this notes file. Nothing else touched.

There are exactly 6 REWRITE + 2 FAIL rows in the pack (matches PROGRESS.md's
"Book C 101 PASS / 6 REWRITE / 2 FAIL"). All 8 are accounted for below.

## Honoured — in content-stats-quartiles.js

| # | where | old | new | note |
|---|---|---|---|---|
| 1 | s1 › q2 › prompt (FAIL) | "The speeds of 11 cars passing a speed camera, in mph: 19, 22, 26, 28, 28, 29, 29, 30, 30, 31, 36. Find the median, the lower quartile, the upper quartile and the interquartile range." | "Here are the speeds of 11 cars passing a speed camera, in mph: 19, 22, 26, 28, 28, 29, 29, 30, 30, 31, 36. Find the median, the lower quartile, the upper quartile and the interquartile range." | Applied verbatim as the judge's own replacement — a full sentence now introduces the list, matching q1's "Here are their results:" pattern. |
| 2 | s1 › q8 › claims[1].text (mean) (REWRITE) | "The mean wage will" | "When the £110 wage is added, the mean wage will…" | Not the judge's literal "___" fix — the answer here is a CHIP (Increase/Decrease/Stay the same), not a pad blank, so a text underscore is the wrong control. Followed the orchestrator's instruction: each claim now reads as a sentence the chip completes. |
| 3 | s1 › q8 › claims[2].text (modal) (REWRITE) | "The modal wage will" | "Add the £110 wage to the list, and the modal wage will…" | See note below on wording — same fix as #2, but reworded (not just "When the £110 wage is added, the modal wage will…") to clear `qa-text-damage`'s SURVIVOR REPORT, which flagged the four claims as near-duplicate text (94–96% Levenshtein-similar) when all four opened identically. All four still end "…the [average] wage/wages will…", i.e. still consistent in FORM as instructed; the opening clause now varies. |
| 4 | s1 › q8 › claims[3].text (median) (REWRITE) | "The median wage will" | "Once the £110 wage joins the list, the median wage will…" | Same fix as #2/#3, reworded for the same duplicate-text reason. |
| 5 | s1 › q8 › claims[4].text (range) (REWRITE) | "The range of the wages will" | "With the £110 wage added to the list, the range of the wages will…" | Same fix as #2–#4, reworded for the same duplicate-text reason. |
| 6 | s3 › q14 › prompt (REWRITE) | "In a survey, 184 people stated their weekly wage, grouped below. Draw the cumulative frequency graph for this information." | "In a survey, 184 people stated their weekly wage. The results are shown in the table below. Draw the cumulative frequency graph for this information." | Not the judge's literal "The results are grouped below" fix — followed the orchestrator's instruction to name what is below ("in the table below"), which also matches this exercise's own sibling stems (q12/q13: "…are shown in the table below"). |

### On the q8 rewording (important for the next cut/cold read)

The orchestrator's brief gave the pattern *"When the £110 wage is added, the
mean wage will…"* and asked for it "consistent across the four." Applied
literally to all four, the four claim texts became 94–96% identical by
Levenshtein distance (only the average's name differs), and
`tools/qa/qa-text-damage.js`'s SURVIVOR REPORT (§5, "these two text strings
are the same words — it looks like the sentence was written twice") FAILED
on all three pairs. That check is real and not a false alarm to override —
`claims[].text` is not in its `TEMPLATE_FIELDS` exemption (only `prompt` and
`start` are), so four hand-authored claim sentences are expected to be
distinct prose, not a fill-in-the-blank template.

Fix: kept claim #1 exactly as briefed, and varied the opening clause of
claims #2–#4 ("Add the £110 wage to the list, and…", "Once the £110 wage
joins the list, …", "With the £110 wage added to the list, …") so each is a
genuinely different sentence. All four still: (a) end as a sentence the
CHIP completes, with no marked text blank; (b) say the same underlying
thing — the £110 wage joining the list of eight wages already given in the
stem; (c) use only words already anchored by the stem ("wages", "the £110
wage", "the list"). Re-ran the full check list after the change —
`qa-language`, `qa-content-source`, `qa-notation`, `qa-text-damage` all
GREEN, `lint-content-stats.js` PASS with unchanged counts (33 questions, 94
marks). If the next cold read still doesn't like the variation, that's a
question for the judge, not a wiring bug.

## Declined

None. Every REWRITE/FAIL row in the pack that lands on a field this package
owns was honoured (see table above); nothing was judged unsafe to fix or in
conflict with the checklist.

## Not mine — for the orchestrator (live in other files)

| # | file | where | old | new |
|---|---|---|---|---|
| 7 | `jotter.js` line 129 | Ex 4 › q15 › feedback pool ("perfect" bucket) (REWRITE) | `'Clean read-off.'` | `'You read it off exactly right.'` |
| 8 | `jotter.js` line 133 | Ex 5 › q21 › feedback pool ("perfect" bucket) (FAIL) | `'A tidy box plot — every mark earned.'` | `'A tidy box plot, and every part of it is right.'` |

Both are single strings inside an array literal (a `perfect: [...]` bucket
that also holds two sibling feedback lines each — do not touch the siblings,
only the one quoted string in each row). I did not touch `jotter.js` — it is
outside this package's ownership.

## Checked, not owed

- **The two teacher lines that name Damien** (PROGRESS.md, carried-forward
  list): searched every `.js` file in this directory for `Damien` — the only
  three hits are code comments in `script.js` (lines 176, 526, 1058), none
  pupil- or teacher-facing. Confirms PROGRESS.md's own note that these were
  "already fixed in the films cut." Nothing outstanding.
- **The preview's localhost link**: not found in any pupil- or
  teacher-facing string in this directory; PROGRESS.md already marks it
  "not pupil-facing." Nothing to do here.
- **`statStageCfplotPlace`**: DECLINED verdict from the polish-cut-2 judge,
  standing reason given in PROGRESS.md (the cfplot table is given and
  filled; reading it is Exercise 2's skill). Not in the stats-quartiles pack
  I was handed, and not touched.
- **`statScrollGraph`**: PROGRESS.md flags this FAIL for honouring "first
  thing in Book A's cut." Checked `strings.js` line 134 — it already reads
  `'Scroll or swipe the graph sideways to see all of it.'`, the honoured
  wording, not the old FAIL text ("Swipe the graph sideways…"). Already
  done, by whichever package owns `strings.js`; nothing outstanding. (Not a
  row in `MATHS_COLD_READ_VERDICTS_stats-quartiles.md` either way — outside
  the pack I was told to honour, and outside `content-stats-quartiles.js`.)

## Checks run (this package's scope)

- `NODE_PATH="$(npm root -g)" node dev/lint-content-stats.js` — **PASS**,
  unchanged counts: 6 sections, 33 questions (qlist 5, values 4, judge 7,
  cftable 3, cfplot 3, cfread 4, boxplot 6, compare 1), 51 movie steps, 94
  marks.
- `node tools/qa/qa-language.js` — **GREEN** (87 checks passed, 0 failed).
- `node tools/qa/qa-content-source.js` — **GREEN** (40 checks passed, 0
  failed).
- `node tools/qa/qa-notation.js` — **GREEN** (0 checks failed).
- `node tools/qa/qa-text-damage.js` — **GREEN** (0 checks failed) after the
  q8 rewording above; first pass was RED (3 SURVIVOR REPORT failures on the
  four near-identical q8 claim texts).
- `qa-cold-read` was **not** run by this package. Per the brief, the hash
  will move now that these sentences have changed and it is expected to go
  RED until the separated judge re-files at the end of the cut.
