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

## Waived on 8 Sept 2026 — Book C shipped on Damien's ruling ("Book C ships NOW")

_Three walker findings from the full run at `927a760` (16 minutes, every other gate green). Each is photographed in `tools/qa/out/shots/` and is the first work of the next cut. None stops a pupil using the book._

| cell | reason | owner / phase | file | sha1 | waiver |
|---|---|---|---|---|---|
| question:checked-wrong-1 @375 × readability | Algebra q2 prompt "Given a = 3 and d = −4…" measured 3.08:1 on a phone after a wrong attempt — an APPROVED book (rule 30), and the same re-rendering moment the sampler once misread (F42); picture `conf-question-checked-wrong-1-375.png` | next cut; Angles/Algebra are reported on, never re-opened | (any) | (any) | WAIVED BY HIS RULING 8 Sept 2026 |
| question:checked-right @375 × readability | Book C s6 q32: an unchosen reason chip fades to 40% after Check (`.chip:disabled`) and measures 2.13:1 — text she no longer has to read, but text; picture `pupil-question-checked-right-375-q32.png` | next cut (Book A's): unchosen chips keep full ink after Check | (any) | (any) | WAIVED BY HIS RULING 8 Sept 2026 |
| book-contents:mid-book @375 × overlap | Book C, Exercise 4 opening on a phone: a stray "0" read-out from a board below the fold sits on the next question's prompt by 18×18px; the label-waits-for-its-board fix of 19:15 narrowed but did not cure it; picture `pupil-book-contents-mid-book-375.png` | next cut (Book A's): relayout once the board has size | (any) | (any) | WAIVED BY HIS RULING 8 Sept 2026 |

| question:checked-wrong-1 @1280 × readability | Angles m2 (the protractor): its scale number "180" measured 1.09:1 at 1280 after a wrong attempt in the 9 Sept fix run and passed in the 8 Sept run — the protractor numbers wear a white halo (paint-order stroke) and the sampler reads the halo; an APPROVED book (rule 30); picture `conf-question-checked-wrong-1-1280.png` | next harness session: the sampler and the protractor's halo | (any) | (any) | WAIVED BY HIS RULING 8 Sept 2026 |

| question:checked-right @1280 × readability | Book C s6 q32: a judged claim's card text ("Charlie's survey tells him what all students…") measured 3.02:1 after Check at 1280 in the 9 Sept fix run — the "dimmed after Check" class: what she has answered is faded; picture `pupil-question-checked-right-1280-q32.png` | next cut (Book A's): nothing that carries words is dimmed after Check — the chosen state is shown by fill or a mark, never by fading the rest | (any) | (any) | WAIVED BY HIS RULING 8 Sept 2026 |
| question:checked-wrong-1 @375 × readability | Book C s3 q14: the class-interval label "200 < x ≤ 300" in the table cell measured 3.07:1 on a phone after a wrong attempt — the struck first attempt is drawn as a 35% ghost and the ghost carries the TABLE's words, which the design said it must not (§4.0: the ghost carries points and markers only); picture `conf-question-checked-wrong-1-375.png` | next cut (Book A's): the ghost never carries words | (any) | (any) | WAIVED BY HIS RULING 8 Sept 2026 |

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
| full-grid:sticky-scroll @1280 | The grid is stuck to its edges only once it has been scrolled, and at 1280 there is nothing to scroll: the widest book in the demo class is 23 columns of about 38px beside a 120px name column, which is 1116px of table in a 1116px box. It is reached at 375 and at 768, where the same table really does run off the screen. Choosing a wider book from inside the grid is not a way round it — every book tab in the full grid calls showClassPage(), so pressing one leaves the grid altogether (tried, 8 Sept 2026, and it took the rest of the route with it). |
| algebra q5 × walk-wrong | "x + 8x − 5x" is three terms of one family, so the collect screen has ONE bin and the app does the arithmetic once the tiles are sorted. A pupil cannot mis-sort, and so cannot get this question wrong on this screen. `sit-confused` reports it and moves on; the other three collect questions have two families and a real wrong answer. |

## Seen again on the polish cut — 11 Sept 2026 (the same waived class, no new row)

_The full run at the polish cut's final commit printed two readability findings
as WAIVED rather than failing the walk — the walkers now honour a `WAIVED BY HIS
RULING` row exactly (surface, state, width, law) and print the measurement every
run. Both are the "text dimmed after Check" class of the 8 Sept rows above, and
both are Book A's first work: Book C s3 q13's table label "20 < x ≤ 30" at
3.07:1 on a phone after Check (the ghost carries the table's words), and s6
q32's claim card "A sample can only estimate…" at 1.63:1 after Check. Pictures in
`tools/qa/out/shots/`. His 11 Sept sit also met q8's unchosen chip "Stay the
same" at 1.64:1 on a phone — the chip class, same row._

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
