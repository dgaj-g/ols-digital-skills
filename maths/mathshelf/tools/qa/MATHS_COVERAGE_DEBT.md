# MATHSHELF — THE COVERAGE DEBT LEDGER

A coverage cell may be OWED only as a row here, and only with a reason, an owner
or phase, and the CONTENT HASH of the file it belongs to. **A file carrying debt
that has been EDITED (its hash has moved) stops the pack**: you may not change a
thing whose coverage you owe. A row carrying `WAIVED BY HIS RULING <date>` lifts
the freeze for that cell only — and is still printed as debt on every run.

Format (one row per cell):

    | cell | reason | owner / phase | file | sha1 | waiver |

---

## Waivers standing

| cell | reason | owner / phase | file | sha1 | waiver |
|---|---|---|---|---|---|
| angles × source | the Angles pack predates the per-question `src` rule; its content map is MEP Y8 Practice Book A ch.11 (11.1 Angle Measures, 11.2 Parallel and Intersecting Lines) + Mary McElroy's WALTs, recorded in the pack header and audited to zero errors on 25 Jun 2026 | locked content, rule 30 | content-angles.js | (any) | WAIVED BY HIS RULING 25 Jun 2026 |
| algebra × source | the Algebra pack predates the per-question `src` rule; its content map is MEP Y7 bk7_16 §16.1/16.3 and MEP Y8 bk8_8 §8.1/8.2, audited to zero errors on 25 Jun 2026 ("6 + b = 6 + 7 = 13" is verbatim-correct MEP) | locked content, rule 30 | content-algebra.js | (any) | WAIVED BY HIS RULING 25 Jun 2026 |
| angles × period-budget | 24 Core questions predate the one-period 26-unit rule and are approved and live as Version 25 | locked content, rule 30 | content-angles.js | (any) | WAIVED BY HIS RULING 28 Jun 2026 |
| algebra × period-budget | 24 Core questions predate the one-period 26-unit rule and are approved and live as Version 25 | locked content, rule 30 | content-algebra.js | (any) | WAIVED BY HIS RULING 28 Jun 2026 |

## Open debt — surfaces the v4 design names that the build has not reached yet

_Each row is deleted as the surface lands. The DONE list refuses a deploy with a
row still open and no dated waiver, so this list is the build's own to-do and
the machine's, not mine._

| cell | reason | owner / phase | file | sha1 | waiver |
|---|---|---|---|---|---|

## Rules that exist and have no data to hold yet

_A rule with nothing to read is not a rule that passed. `qa-language` says so
in its own run; this row is here so the silence is on the record too._

| rule | what is missing | what it would take | owner / phase |
|---|---|---|---|
| define-before-use (`qa-language`) | there is no `tools/qa/vocab/<book>.json` for any book, so the rule reads nothing and the gate notes it every run | a vocabulary per book: each term with the plain-words phrase its film must say first. Writing one for Angles or Algebra means re-opening approved prompts if a term turns out to be used before it is explained, which is rule 30's business and his call | a content session, after the deploy — the control proves the detector works against a planted vocabulary |

## Cells the app itself makes impossible

_Not debt, and not a fault: a screen that cannot be got wrong has no wrong path
to walk, and the walk says so rather than inventing one._

| cell | why it cannot be walked |
|---|---|
| algebra q5 × walk-wrong | "x + 8x − 5x" is three terms of one family, so the collect screen has ONE bin and the app does the arithmetic once the tiles are sorted. A pupil cannot mis-sort, and so cannot get this question wrong on this screen. `sit-confused` reports it and moves on; the other three collect questions have two families and a real wrong answer. |

## States the app declares and no walk has yet stood on (6 Sept 2026)

_Written down rather than left as a red nobody reads. Each is a real screen the
app can render; none is a fault found. The walkers reach 40 of the 77 states in
the registry; these are the rest, with what it would take to walk each._

| cell | what it would take | owner / phase |
|---|---|---|
| `cover:first-visit`, `cover:returning`, `cover:fallback-name`, `cover:wrong-class`, `cover:busy`, `cover:staff` | a cover pass that clears storage between each and drives a bad class code, a slow server and the staff route | the next session — cheap, one small walker |
| `class-page:loading-cold`, `class-page:empty-class`, `class-page:no-flags`, `class-page:error`, `set-up:error` | a class with no pupils, a class with nothing flagged, and a mocked server error; the teacher walk drives a seeded demo class only | the next session |
| `question:amber`, `question:locked-restore`, `question:resume-mid` | answer-with-no-working, then a reload mid-attempt; the model attempts always show working, so amber needs an attempt written for it | the next session — needs one new model attempt |
| `dock:numpad`, `dock:numpad-fraction`, `dock:nudge-pad`, `dock:disabled-explained`, `dock:keyboard-hidden` | the dock is recorded once per question and only reports the state it happens to be in; it needs recording again after each dock change | the next session |
| `movie:nudge-banner`, `movie:reduced-motion` on the confused/teacher walks | a teacher nudge delivered to a pupil, and the reduced-motion pass extended past sit-pupil | the next session |
| `set-up:add-class-busy`, `set-up:delete-armed`, `set-up:csv-copied`, `set-up:csv-fallback-box`, `set-up:link-qr-modal`, `set-up:tickboxes` | the teacher walk drives these but the demo store answers instantly, so the busy states pass through faster than a record can catch them | the next session — record on the way in, not after |
| `book-view:flicking`, `book-view:worth-a-look-open`, `class-page:book-switch`, `question-view:ink-open`, `question-view:loading-progressive`, `full-grid:sticky-scroll` | driven by the teacher walk; each depends on demo data that happens not to produce the condition (a second book ticked, an amber verdict to fold a corner on) | the next session — needs a richer demo class |
