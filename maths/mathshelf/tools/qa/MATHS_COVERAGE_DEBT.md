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
| question:amber | AMBER is a right answer written on ONE line, and `mathcore.js` returns it only for a substitution (line 514). On a substitution screen the value pad does not exist until every letter has been tapped into place — that is the place-all-then-check law doing its job — so the working line is always there before the answer can be, and a pupil cannot produce a one-line right answer at all. Driven and confirmed on 8 Sept 2026: every substitution question in the book answers "no value pad" when the letters are left alone. The verdict is still real in the markbook, where the demo class's amber pupil carries it, and the app is right to have a screen for it; nothing a pupil can do reaches that screen. |
| algebra q5 × walk-wrong | "x + 8x − 5x" is three terms of one family, so the collect screen has ONE bin and the app does the arithmetic once the tiles are sorted. A pupil cannot mis-sort, and so cannot get this question wrong on this screen. `sit-confused` reports it and moves on; the other three collect questions have two families and a real wrong answer. |

## States the app declares and no walk has yet stood on (8 Sept 2026, package V4-STATES)

_Written down rather than left as a red nobody reads. Each is a real screen the
app can render; none is a fault found. Of the 33 rows the 6 Sept table carried
(32 states plus one width-partial), 26 now have a walker standing on them —
`sit-pupil.js`'s cover pass, shelf-lock pass, movie-nudge probe and resume-mid
probe, and `sit-teacher.js`'s widened set-up/class-page/book-view/question-view
routes. The dock row is gone outright: every one of its five states was
already being reached (by sit-confused's wrong-path drive and sit-pupil's own
questions) — the 6 Sept note about it was stale, not a fault.

Two faults were found on the way, not invented by the walk: `shelf:none-ticked`
and `shelf:locked-spine` both fail readability on the not-set book card's
series band and its "x" motif (never checked before because nothing had ever
stood on either state), and `set-up:link-qr-modal`'s `#st-qmsg` paragraph is an
empty non-live-region (built by raw innerHTML, so it never got the `role=
"status"` the `el()` helper gives every other `.ui-msg`). Both are staff.js /
CSS faults, not walker faults. Both are fixed (8 Sept 2026), each with a control
that plants it back. The cell itself was closed either way: the walker stood
there and the audit gave an honest verdict, which is what coverage asks for.

What remained was seven:

_All seven are now settled (8 Sept 2026, later the same day). Six were product
faults with a fix, and each is walked: the cover now says it is waiting and says
when it is in; a class page that cannot be refreshed says so where she is
looking; the full grid listens on the box that actually scrolls; opening one
question across the class is drawn as the question view, which is what it is,
so that screen's own ink control can be reached; and the demo class's amber
pupil now writes the answer and nothing else — which is what her name has always
meant — so a book worth a second look is a fact about her book rather than a
coin flip. The seventh, `question:amber`, went into the table above: it is not
debt, it is a screen the app's own place-all-then-check law puts out of reach._
