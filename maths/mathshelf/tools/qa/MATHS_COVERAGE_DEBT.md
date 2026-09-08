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
CSS faults, not walker faults, and neither is mine to fix this session — flagged
separately. The cell itself is still closed: the walker stood there and the
audit gave an honest verdict, which is what coverage asks for.

What remains is five states with no code path that ever sets them, confirmed by
reading every `setState`/`SURF`/`shell(...)` call in the app for each surface,
plus two more that a code path DOES exist for but the walk could not stand on
honestly this session:

| cell | why nothing can stand on it | owner / phase |
|---|---|---|
| `question:amber` | AMBER needs a model attempt with exactly one working line (`mathcore.js` line 514, `lines.length===1`); every attempt in `dev/model-attempts.js` shows full working by design, and that file is shared with `dev/validate-all.js` and not owned by this package. Needs one new attempt written there. | content/model-attempts session |
| `staff-cover:busy`, `staff-cover:open` | declared in `GJ.app.surfaces` (script.js) but no `setState`/`SURF` call anywhere in the app ever names them for the `staff-cover` surface — only `passcode-empty` (index.html) and `passcode-wrong` (staff.js:222) are ever set. Needs staff.js to actually render a busy state while the passcode call is in flight and an "open" state once it settles, or the two rows to come out of the registry. | staff.js, not owned this session |
| `class-page:error` | `staffError()` (staff.js:1409) is the only code that ever sets a surface to `error`, and its one call site (staff.js:336) is the delete-class catch handler, reached only from the `set-up` surface — no code path fails while `class-page` is current (`loadWall`'s own catch, staff.js:775, swallows the rejection silently and never calls `staffError`). Needs staff.js's class-page load to surface a failure the same way set-up does. | staff.js, not owned this session |
| `question-view:ink-open` | `.qv-card` (staff.js, S3 "The Question View") is built as plain display markup with no click handler and no `.verdict-mark` button; the only `.verdict-mark` in the app lives inside `showJotterPage()` (S2, book-view), and that function's own `shell()` call hardcodes `surface:'book-view'` regardless of how it was reached — including its own "across the class" sweep mode (`ctx.qlabel`). The `SURF('question-view','ink-open')` sitting in that same click handler (staff.js ~1272) can accordingly never fire while `question-view` is the current surface. Needs question-view's own cards to carry the ink control, or the handler's SURF call to be reachable some other way. | staff.js, not owned this session |
| `full-grid:sticky-scroll` | `showWall()`'s scroll listener is on `body` (its own local, unclassed wrapper div, staff.js ~975), and checks THAT element's own `scrollTop`/`scrollLeft` — but `body` carries no CSS enabling it to overflow at all (an empty class name, `el('div', '')`), so it never scrolls no matter how the content inside it does. The grid genuinely overflows — `.wall` (`body`'s own child) confirmed scrollable at 375px in testing — but scroll happens there, one level down from where the listener is asking, so the condition it checks never goes true. Confirmed by scrolling `.wall` directly (a real, non-zero `scrollLeft`) and watching `full-grid` stay on `loaded` regardless. Needs the listener moved to `.wall`, or `body` given the CSS to be the scrolling element the listener assumes it is. | staff.js / style.css, not owned this session |
| `book-view:worth-a-look-open` | reachable in principle (`res.st==='amber' \|\| (res.st==='err' && !res.dx)`, staff.js ~1183) but the demo class's per-question amber/undx-wrong assignment is a deterministic coin flip seeded per pupil+book (script.js `synthState`'s own PRNG) — not a fault, just not guaranteed to land inside the one exercise this walk's route reaches. Widening the search to the full grid (all 24 questions, far better odds) was tried and reverted: the full grid's cells open `showJotterPage` with a different ctx shape (`{qlabel}`, the "sweep" mode) than the exercise grid's (`{q}`), and whatever renders differently under sweep mode broke the six ink-control states that follow it in the same walk — trading one probable cell for six confirmed ones was the wrong trade. Needs either a fixed (non-random) amber question in the demo seed, or the sweep-mode rendering difference tracked down so the full grid can be used safely. | the next session — demo data or a sweep-mode fix |
