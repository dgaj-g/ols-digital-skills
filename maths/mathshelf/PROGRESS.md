# MathShelf v4 — build progress

**Session 1: Opus 5 MAX, 5 September 2026.** This file plus the pushed branch is
the resume point. Nothing in a chat window is needed to continue.

---

## 12 SEPT 2026, 13:45 — POLISH CUT 2 LIVE, FRONT DOOR Version 27 / DATA Version 25 (unchanged), `6263421` — it also carries the steward re-cut of 11 Sept

His second live test (12 Sept, an iPhone and a laptop) gave rulings 43–48
(feedback master; DESIGN §4.0 [Correction, 12 Sept 2026]); the steward's
q17 marking fault rode with them. All done, each with a control:
43 the board pans by touch on a phone — `touch-action: pan-x pan-y` on the
SVG, `none` on the draggable hit targets only (a point, the rule handle, a
marker; `data-hit`); a tap places only when the pointer comes UP where it
went down, so the browser's own pan never plants a point (the walker's
`pressGrid` now taps down+up); the chart host reclaims the phone gutter like
`.jq-diagram` (the words stay in the text column); while width is hidden a
thin scroll track and "Swipe the graph sideways to see all of it." sit under
the grid in their own elements, never the stage line (`sit-pupil`
`stats-board-no-pan`) · 44 every axis number is seated in `relayout()` from
the counter-scaled font — baseline one font + 4 CSS px below its line, the y
numbers 6 CSS px left of theirs, the titles a line further out — and the
grid's margins hold the numbers at phone scale (`stats-axis-number-on-the-
line`; the law measures every number's rendered box ≥ 3 px clear at every
width: 7.6 px at 375) · 45 `.stat-note` under the stage line carries the
passing notes (enough points, put it back, try again), cleared on the next
stage change; `.stat-msg.stage-now` is written only by the stage table
(`stage-line-replaced`); cfplot · 1 now reads "Plot one point for each row of
the table: across at the top of the class, up at the running total. Next:
across {hi}, up {cf}. ({n} of {m} placed.)" from the engine's own expected
points; every stage's control ("✓ Join the points", "✓ Draw the box plot",
"✓ That's my …", "Next: draw the box plot") is `.btn-stage`, filled copper,
white ink, 44 px (`qa-language` green on the sentence) · 46 "Checking the
passcode…" is the pupil's own `is-waiting` spinner line (`qa-waits`
wait-card-still re-aimed: class, breath in frames, the `::before` spin) ·
47 the tick's gold card reads "Saving changes…" · 48 `OUTBOX_WARN` 30 s; while
a save is in flight a quiet `is-waiting` "Saving…" line sits in the act bar
and Try again is disabled; the card comes at 30 s or at once on a refusal
(`qa-waits` outbox-warns-at-eight under a simulated 20 s save) · q17: statcore
`ruleAtHeight()` judges a reading to the grid's resolution — |h − wantH| <
sq.y/2 strictly (selfTest RD31–RD34, floor 156 → 160; validate-all 81/81; the
corrupt cfread board gives the RANGE for the IQR when half-the-axis would now
be right, so the wrong walk stays wrong); q17's three walk-right cells stood
at every width and their debt rows are closed. q18/q23's rows stay, dated
(not investigated: the clock).

The deploy rule (package G): `qa-manifest` post-deploy now asks that the last
FRONT DOOR row's commit carries the Code.gs md5 the last DATA row was cut with
(control `front-door-without-its-data` FIRED); `DEPLOY.md` says a client-only
cut re-cuts the front door ONLY and the manifest RESTS at `USER_ACCESSING` +
`DOMAIN`. It did (read before and after the cut): this release needed nobody's
hands on the manifest.

Faults of the cut itself the walks caught before it shipped: the gutter rule
on the whole board container overlapped the Q-number margin with tile trays
and notes (now the chart host only, the note back in the text column, board
labels inset by the measured margin); the boxplot's stage sub-ctx had no
`note()`; a tap exactly on the y-axis was lost to a half-pixel rounding at
1280 (a tap within half a square of an edge is on the edge); "Next: across
NaN" (the engine speaks in rationals).

Proved at `6263421`: `--fast` green; `--full --book stats-quartiles` green
(three widths + reduced motion) and the whole-tree `--full` GREEN with every
coverage cell closed (the nine 11 Sept debt rows now six, all q18/q23) bar
`qa-cold-read`, re-filed by the separated judge on the re-extracted
transcripts after the walkers (see the record commit); `qa-manifest` and
`qa-waits` controls FIRED (see above); `control.js --only sit-pupil` ran in
the background after the deploy — its matrix is in
`tools/qa/out/polish2/controls-sit-pupil.log` and the done message. Deploy:
Index.html fetched into the editor from the pushed branch (1,159,916 bytes,
exact), FRONT DOOR Version 27 at 13:45 by deployment id, proof rows doGet →
apiCall → doPost at 13:46 in `server/DEPLOY_LOG.md`; `MS_POST_DEPLOY=1`
qa-manifest GREEN (18), qa-repo-prod green bar the record commit. Time: clock
stamped 12:14, the cut committed and pushed at 13:42, live at 13:45 — 91
minutes of the 120; the record commit and the background controls after.
Packages C and D were built by a sonnet subagent (its notes in
`tools/qa/out/polish2/CD_NOTES.md`); the cold read by a separated sonnet judge.

## 11 SEPT 2026, evening — STEWARD RE-CUT OF EXERCISE 3'S CHART: PROVED IN THE TREE AT `f1ca1f2`, NOT YET LIVE

Fable's review of the polish cut (the steward brief, 11 Sept): repo == prod,
the manifest, the cold-read hashes, the leashes and the nine rulings all
verified; Exercise 1 (strip, instructions, "✓ That's my …", the film's three
rings at pen speed, dwell measured at 5.6 / 6.9 / 8.4 / 7.7 / 8.4 s a step, the
gold box 8 px clear of its glyphs), the tick flipping in 4 ms, the "removed
from demo's shelf" line and the unticked book absent from the pupil shelf all
seen in the preview. ONE fault, a pupil's on Monday: ruling 42's side column
was a bare 768px breakpoint (`grid-template-columns: minmax(0,1fr)
max-content`), and a chart keeps its squares at 12 px (statchart law 6), so
the table took its 408 px and the grid was SQUEEZED — 268 of its 347 px at
1280 (his laptop), 176 at 768 — with the right-hand classes behind a sideways
scroll inside the frame that nothing announces. Phones (375) were untouched:
their body was already narrower than the chart, which is the law-6 sideways
scroll the design accepts.

Harness first, then the fix, all inside a fresh 120-minute clock
(`cut-start.json` re-stamped at `5df902e`; `CUT_SCOPE.txt` names the files):
- LAW (`sit-pupil`, beside the ruling-42 reach check): a `cfplot` board that
  hides grid behind a sideways scroll while its body had the room fails —
  `BEAT_OF` now reports the frame's hidden width and the body's content
  width. Control `board-squeezed-beside-the-table` plants the bare breakpoint
  back (`stats-board-squeezed`) and must fail; the audit's row 42 names it.
- FIX 1 (`jotter-stats.js` `layoutGiven`, `style.css`): the table sits beside
  the chart only when the body's content box can hold `bd.minWidth()` + 20 +
  the table; otherwise `stat-stack` on the body keeps it after the dock. The
  decision is measured on build and by a ResizeObserver on the body.
- FIX 2 (`statchart.js`): a board is drawn at its own law-6 width and never
  stretched — the svg scales at a fixed aspect, so a frame filling a 718 px
  body drew this grid 2,500 px tall on a laptop. `frame.style.maxWidth` =
  law-6 width + the 1 px border each side. Every board on a laptop is now
  the size every phone walk already passed.
- FIX 3 (`style.css`): the given table wraps its headings (max 320 px, 8 px
  cell padding, class intervals never broken), so 347 + 20 + 320 fits a 698 px
  body: beside on a laptop, stacked on a tablet, unchanged on a phone.
  Measured after the fix: 1024/1280 beside, 0 px hidden; 768 stacked, 0 px
  hidden; 375 as before (258 px frame, 91 px of law-6 scroll).
- Docs corrected: DEPLOY_LOG's what-is-live line (was still V24/V23) and the
  front-door row's time (18:49, not 09:57); PROGRESS's resume block no longer
  names /tmp; DESIGN §4.0 carries the dated correction.
- NOT changed, for the record: the boxplot scale boards hide 54 px at 1280
  (a 750-unit scale in a 698 px body — law 6, since 8 Sept, the walker's
  law passes it because the body has no more room); the phone chart is 1,242
  px tall with Join directly under it (decision (a) of the polish cut stands).
  Both are Book A's cut to look at, not this one's. So is a third thing seen
  tonight: on the boxplot board (Ex 5) the new stage instruction ("Choose a
  marker, then choose where it belongs on the scale. All five go on.") sits
  above the kind's own plain line ("Five markers — put each one on the scale
  where it belongs.") — the same thing twice, in two wordings, his 6 Sept
  class; the said-twice law's one-token rule does not see it. The plain line
  is `statTrayFiction`, one of the named fictions, so the call is a design
  one: either the stage sentence absorbs the fiction or the fiction line
  goes; then re-judge the transcript and give the law this pair as a plant. Not tonight: a
  sentence change re-opens the cold read, and this cut is the chart.

Proof (all at the commit below): `--fast` green (qa-repo-prod red only while
the tree was dirty); `control.js --only sit-pupil` 19:47–20:40 — **14 controls
FIRED including `board-squeezed-beside-the-table`, over-tightening PASSES**;
`--full --book stats-quartiles` 19:38–19:47: the three walkers GREEN (592 /
202 / 52 checks), qa-cold-read red only because the extractor ran before the
walkers finished (re-extracted: hash 3893784d, the judged one), and
qa-coverage red on NINE cells — walk-right for q17, q18 and q23 at every
width. Those are NOT this cut's: the same walk with the re-cut stashed (the
polish tree, exactly what is live) fails the same three the same way
(20:45–21:02, `scratchpad/walkA.log` / `walkB.log`). Cause, inside the
30-minute cap: **q17 is a real marking fault of the live book** — for n = 50
the engine's `split50` convention wants the rule at (n+1)/2 = 25.5, and the
rule moves in whole small squares of 2 (half a square when dragged), so 25.5
is unreachable and "Where you read the median" is ✗ for every pupil (the
walker's 13 presses give 26). q18 and q23 are RESERVE questions no pupil sees
(`script.js`, preview `?reserve=1` only); their walker routes fail on the
polish tree too, cause not found in the cap. All nine are dated rows in
`MATHS_COVERAGE_DEBT.md` (owner named; the q17 fix is Book A's opening P0:
judge the rule to the grid's resolution, half a small square strictly, in
statcore with selfTest rows and a dated DESIGN 4.4/6.2 correction). How the
09:47 full run closed q17 walk-right on the same engine is not explained;
the sidecar it used is gone. The whole-tree `--full` (all books; the shared
files moved every book's content hash) ran 21:04–21:20: the three walkers
GREEN (592 / 202 / 52), qa-cold-read GREEN (hash 3893784d), qa-coverage
GREEN with every cell closed and the nine rows printed as debt, every other
gate GREEN; qa-repo-prod red only until the commit. The pair rebuilt
(build-pathb, qa-build), committed as `f1ca1f2` and pushed; `--fast` green at
the record commit. Deploy: the pair pasted → DATA and FRONT DOOR as new
versions by Deployment ID — Damien's two manifest edits; brief
`Maths/MATHS_BOOKC_RECUT_DEPLOY_PROMPT.txt`, or "cut it" in the steward
session. Time: 19:31 → 21:2x on a 120-minute clock, of which the A/B walk
that proved the nine cells were not this cut's took 25. The front-door cut needs
Damien's two-line manifest edit (USER_ACCESSING + DOMAIN, then back), which
the desktop app refuses Claude; until that cut, prod is the polish cut
(V26/V25) and the squeeze is live on tablets and laptops.

## 11 SEPT 2026, 18:49 — POLISH CUT LIVE, FRONT DOOR Version 26 / DATA Version 25, `f2a5f7b`

His nine rulings of 11 Sept (feedback master 34–42), all nine done, each with a
control seen to fire (audit rows 34–42 moved from F to A/B):
34 the passcode card breathes in rendered frames (its own deeper breath, proved
by two frames 700 ms apart; `qa-waits` wait-card-still) · 35 the tick's message
is the gold wait card in a larger face · 36 an unticked book is ABSENT from the
shelf (`locked-spine` retired everywhere; `qa-tickbox` shelf-shows-unticked;
the walker's shelf pass counts cards) · 37 the box flips at once, a per-class
queue serialises a second tick, the class poll already paused in Set-up ·
38 film dwell = max(1200, 350×words) ms capped at 8 s, after the drawing
(`qa-human-pace` film-too-fast) · 39 a paper `ring` draws a copper ring round
the i-th value at pen speed and the gold box is 8 px of clear paper from its
glyphs (`sit-pupil` film-ring-draws-nothing, film-box-on-the-glyphs) ·
40 the stage strip above every multi-stage board, the lit pill the one the
root's `data-stage` belongs to, one beat when a stage begins, one gold glow
when Check lights, none under reduced motion (`sit-pupil` stage-strip-behind,
stage-without-a-beat, check-without-a-glow) · 41 every stage instruction from
the design's table, in `GJ_STRINGS.pupil`, live counts, commit buttons
"✓ That’s my …"; the separated judge re-read all three transcripts and its
rewrites were honoured (pills now say "Find the quartiles", "Find the
interquartile range", "Draw the box plot"; the override lines lost "Inked" and
"the Wall") · 42 Exercise 3's table sits after the dock (beside the chart from
768px) and the walk measures the gap from chart to action row (`sit-pupil`
table-between-board-and-dock).

Two decisions of mine, stated: (a) the design's 55vh cap on the phone chart is
NOT applied — the 12 px-square law makes Book C's charts 1,240–2,460 px tall at
375 and a cap would need a vertical inner scroll the board's `touch-action:
none` cannot be driven through; the ruling's substance (the Join button
directly under the board) is met. (b) The judge's REWRITE of `statStageIqr`
("Mark my working is the algebra book's button") is declined: it IS the qlist
kind's Check label. Not honoured, next cut's: the teacher slip summaries "Ex 1
· Angles", the mark key's em dash, the cover bands "KS3 · M2" (his call — the
department's module codes), and the judge's 27 Book C FAILs that are the
transcript extractor fusing a tally into its comment with no space (the
identical transcript was 87/21/0 on 8 Sept; the fix is `sit-pupil`'s say()
joining block children, a harness item). The rig's port no longer moves the
teacher transcript's hash.

Proved: `--fast` green on every commit; `--full` (all three books) green at
`f2a5f7b` bar `qa-cold-read`, which went green once the transcripts were
re-extracted from the finished walks (the extractor runs in the pool before the
walkers finish — a harness item for next time); every coverage cell closed; the
two waived findings printed as WAIVED, not hidden. Controls: every changed
gate's battery run and every new control FIRED (qa-scope ×2, qa-tickbox
shelf-shows-unticked, qa-waits wait-card-still + tick-waits, qa-human-pace
film-too-fast, sit-pupil ×6); the three that did not are the pre-existing
qa-waits pair and qa-colour-law's plantless amber control, all on the audit's
"not yet proved" list since v4. The whole battery after the deploy was REFUSED
by the budget clock (630 of 180 minutes: 96 building, the rest waiting on the
Chrome sign-in and the manifest edit) — the leash doing what it is for; run it
at the start of the next session after deleting `tools/qa/out/cut-start.json`.

Deploy: Index.html fetched into the editor from the pushed branch (exact
length), Code.gs unchanged since V23, DATA Version 25 at 09:50, FRONT DOOR
Version 26 at 18:49 (Damien made the two-line manifest edit — the desktop
app's permission classifier refused Claude the access change, four ways).
Proof rows in `server/DEPLOY_LOG.md`; `qa-manifest` and `qa-repo-prod` green
post-deploy. The tick round trip is Google's: apiCall 7–10 s wrapping doPost
5–7 s before and after; the client no longer waits for it to move.

## 9 SEPT 2026, 22:04 — THE FRONT DOOR NEVER TOUCHES THE SHEET (V24 / V23 from `300dfc4`)

Damien's smoke with two real pupil accounts: every pupil met "You do not have
permission to access the requested document (line 342)". `doGet` ran as the
pupil and read Config through `getName_`. Fixed (Sheet-free doGet), harness
first (`qa-two-homes` executes doGet as a pupil without Sheet access; control
`front-door-touches-the-sheet` fired). Same cut: the wait card breathes, a
saving tick says so, disabled chips keep full ink. Both versions cut by Fable,
proof in `server/DEPLOY_LOG.md`. His pupil login is the proof of the pupil path.

## 8 SEPT 2026, 20:04 — BOOK C IS LIVE (the resume point for Books A and B)

FRONT DOOR Version 22 and DATA Version 21, both from `15bf8ab`, both selected by
Deployment ID, manifest read before each cut; proof rows in `server/DEPLOY_LOG.md`.
Deployed by the Fable review session on Damien's ruling of 16:30 ("Book C ships
NOW") after this build session was stopped at 19:05.

What was proved at `15bf8ab`: `--fast` 26 gates green; `--full` in 16 minutes
(pooled, `MS_WORKERS=6`), every coverage cell closed; the separated cold read
re-filed against the current transcript (108 sentences: 87 pass, 21 rewrite,
0 fail); three phone-width walker findings WAIVED on his ruling with their
pictures (`MATHS_COVERAGE_DEBT.md`, "Waived on 8 Sept 2026"). The whole control
battery ran after the deploy (20:05–20:51, pooled): 87 fired, 40 over-tightening
passed, 6 self-probes proved, 7 did not fire — listed in `MATHS_GATES_AUDIT.md`
under "After the Book C battery"; three of the seven were already known from v4
(qa-waits ×2, qa-fonts), one is a declared control with no plant written
(qa-colour-law amber-outside-a-mark: `fixture-css-amber` does not exist), and
none is a pupil-facing fault. Harness work for a later session, never a book's.

FIRST WORK OF THE NEXT CUT (Book A's), in this order — fix the CLASS, not the
cell, because the battery's over-tightening walks found the same three classes
on other questions (q13's "30 < x ≤ 40" label at 3.09:1; q8's unchosen chip
"Stay the same" at 2.18:1; Algebra q3's prompt at 2.18:1 straight after a wrong
attempt): every chip keeps full ink after Check (`.chip:disabled` opacity on
`.chip-reason` and the judge chips); the stray "0" read-out on the Exercise 4
opening at 375 (`pupil-book-contents-mid-book-375.png`); the small labels on
the paper at 375 (class intervals, tick numbers) checked at their rendered size;
the 21 REWRITE rows of `MATHS_COLD_READ_VERDICTS_stats-quartiles.md` (the
"Ex.1" contents-strip abbreviation and the bare "IQR" heading first). None is a
reason to hold Book A.

WHAT THE 9 SEPT FIX RUNS ADDED TO THAT LIST (same class, now named exactly):
the struck first attempt is drawn as a 35% ghost and the ghost carries the
TABLE's words (q14's "200 < x ≤ 300" at 3.07:1) — the design's own §4.0 says
the ghost carries points and markers only; and a judged claim's card text is
dimmed after Check (q32 at 1280, 3.02:1). One rule closes both: nothing that
carries words is ever dimmed; the state is shown by a fill or a mark.

TWO JUDGE FAILS ON BOOK C THAT ARE THE HARNESS'S, NOT THE BOOK'S (9 Sept): the
shell re-read failed s4 q15 for "no pass mark" — the pack's prompt says "The pass
mark is 36." and the extractor dropped the middle sentence of a three-sentence
prompt, so the judge never saw it (an extract-transcript fault to fix next
harness session); and s1 q8's "when it is added" has its antecedent in the
sentence before ("A wage of £110 was left off."). Neither prompt was changed.

THE RULE THIS SESSION PAID FOR: a book's DONE list is the BOOK'S OWN cells plus
no regression elsewhere; a red on an old screen is a waived debt row, never a
fix inside a book build; the whole battery never blocks a deploy. It is in the
prompt's TIME section now.

## HOW TO RESUME, in order

```bash
# 1. the worktree — ~/Sites/ols-wt-maths, NEVER under /tmp (macOS's cleaner ate /tmp/gj-wt on 10 Sept 2026); recreate only if missing
git -C ~/Sites/ols-digital-skills worktree add ~/Sites/ols-wt-maths draft/issue-24-25-maths-m2-revision
cd ~/Sites/ols-wt-maths/maths/mathshelf
node tools/qa/install-hooks.js            # SAYS NO in a linked worktree, on purpose

# 2. the two preview servers (nohup, never the preview tool)
nohup python3 tools/qa/serve-preview.py ~/Sites/ols-wt-maths                        8099 &
nohup python3 tools/qa/serve-built.py   ~/Sites/ols-wt-maths/maths/mathshelf/server 8100 &

# 3. where things stand
export NODE_PATH="$(npm root -g)"
node tools/qa/run.js                      # the fast tier — GREEN as of the last commit
node tools/qa/sit-pupil.js                # ~90s per book per width
node tools/qa/sit-confused.js
node tools/qa/sit-teacher.js
node tools/qa/control.js                  # every gate made to say no
```

**The two servers** are committed at `tools/qa/serve-preview.py` and
`tools/qa/serve-built.py`. The first serves the worktree with `no-store`; the
second serves the BUILT `Index.html` at `/` with the Apps Script scriptlets
filled in (`<?= classCode ?>` → `demo`, `<?= name ?>` → `Aoife Gartland`), so
the deployed artefact can be walked exactly like the preview. They are in the
repo on purpose: a rig that lives in /tmp is a rig that is gone after a reboot.

Preview URLs: `http://localhost:8099/maths/mathshelf/index.html?class=demo&nointro`
and `http://localhost:8100/`. Staff passcode in the preview is `demo`; clear
localStorage first so the demo class re-seeds; always `?nointro`.

---

## WHAT IS DONE

| phase | state |
|---|---|
| P0 the gate system | **done.** 30 gates + 3 walkers under `tools/qa/`, each with `COVERS` and `CONTROLS`; `run.js` (fast / full / control / --book); `control.js`; the fixtures and plants; the coverage machine; the pre-commit hook installed. |
| P1 rebrand | **done.** `maths/mathshelf`, the name swept everywhere, the blackboard shell (`shell.css`), the new cover and shelf, fonts vendored (Schibsted Grotesk + Spline Sans Mono in, Caveat + Courier Prime out and off disk), the DOM contract on every surface, the whole strings migration (`strings.js`; the ledger reports **0 outstanding**). |
| P2 staff IA | **done.** Class page → exercise view → question view → book view, Set-up with series-grouped tickboxes and audience bands, Full grid demoted, Insights dissolved, the markbook re-gates on leave and after fifteen minutes idle. |
| P3 login | **done.** Front door (execute-as-User) + relay + shared secret, the data-side secret guard, the companion retired, `server/DEPLOY.md` rewritten as an ordered two-deployment checklist, the outbox. `qa-two-homes` is green over 45 assertions across both homes. |
| P4 the DONE list | **in progress** — see below. |
| P5 deploy | **not started.** Nothing is live yet; MAIN Version 25 is still the deployed app. |

`node tools/qa/run.js` (the fast tier, 20+ gates) is run by hand before each
commit — see the ordering decision below about why the hook is not installed
here.

## WHAT IS LEFT, in the order to do it

1. **The three walkers, clean, at one commit.** They now press the app's own
   controls (`tools/qa/lib/drive.js`) and record the state the app was actually
   in, so a walk is worth what it says. Each run has been finding real faults
   and the run after a fix has to be a fresh one — a walker launched before an
   edit keeps testing the old code. Watch for two things in the log: `expected
   X, stood on Y` notes (honest, and settled at the end of the walk) and any
   `the browser tab died part-way` line, which is the rig, not the app.
2. **`node tools/qa/control.js`** — every control FIRED, every over-tightening
   PASSED. **The node tier is done: 28 gates green, 65 controls fired, one red
   — `qa-cold-read`'s over-tightening, which stays red until the separated
   judge has filed its verdicts (step 3).** The browser tier (colour law,
   fonts, numpad, waits, click-safety, preview-honest, staff-relock,
   two-attempts and the three walkers) runs its battery on its own: each
   browser control now gets its own preview server on its own sandbox, and it
   must not be run at the same time as a walk — both want the machine, and a
   control that fails under load has told you nothing.
3. **The separated cold read.** Run `node tools/qa/extract-transcript.js`, then
   hand a FRESH context (a subagent that has seen nothing of this build) ONLY
   `tools/qa/out/transcript/_teacher.md`, `_v4.md` and
   `tools/qa/COLD_READ_CHECKLIST.md`. It files
   `tools/qa/MATHS_COLD_READ_VERDICTS_TEACHER.md` and `..._v4.md`, each naming
   the transcript hash. `qa-cold-read.js` refuses a stale hash. Author is never
   judge: do not write these verdicts yourself.
4. **`run.js --full` green at one commit**, then push.
5. **Deploy**, following `server/DEPLOY.md` exactly — DATA first, the manifest
   READ before each version cut, the Executions log quoted into
   `server/DEPLOY_LOG.md`. Then `MS_POST_DEPLOY=1` on `qa-manifest` and
   `qa-repo-prod`. The Apps Script editor is already open and signed in as
   `dgartland021@c2ken.net`.
6. **Close:** `HANDOVER.md`'s "What is live" table, PR #22 retitled, the memory
   note, and the done message with the eight-line smoke list.

## STILL OWED AFTER THIS SESSION (not part of P0-P5, and not forgotten)

- **The silent captioned tutorial film** for the teacher, and the teacher guide
  it sits in. His standing law is that this platform lives or dies by ease of
  use and beauty, and that those two are deliverables, not extras. The cold read
  is the half of it that is built; the film is not.
- **The Handling Data book** (Colette's third). `statcore` does not exist yet;
  `qa-selftests` reports it as NOT BUILT rather than passing over it, and the
  shelf will offer it unticked to every class the day it lands.
- **A vocabulary per book** (`tools/qa/vocab/<book>.json`), which is what would
  wake the define-before-use rule. It is on the debt ledger with its reason.
- **The eight-item live smoke list** in `server/DEPLOY_LOG.md`. It is his,
  because it cannot be anyone else's: Apps Script serves the app inside a
  cross-origin sandboxed iframe, so a synthetic click reaches the outer document
  and stops. The deploy is proved as far as the automation can reach - the
  Executions chain, the composited cover, the artefact over HTTP - and the eight
  presses are the part that needs a person. The audit row flips to approved when
  the log carries `smoke: Damien, <date>, 1-8`.

---

## THE BASELINE (the FLOORS — they may only rise)

| suite | floor | still true |
|---|---|---|
| mathcore selfTest | 73 | yes |
| dev/test-anglecore.js | 72 | yes |
| dev/lint-content-angles.js | PASS | yes |
| dev/lint-content-algebra.js | PASS | yes |
| dev/validate-all.js | 48 of 48 | yes |
| dev/test-server-scoping.js | 20 | yes |

`dev/validate-all.js` now builds its attempts from `dev/model-attempts.js`,
which is the same home `sit-pupil` drives the browser from: the validator and
the walker can no longer disagree about what a correct attempt is.

## ORDERING DECISIONS (recorded, so they are not re-argued)

1. The pre-commit hook is written and committed (`tools/qa/hooks/pre-commit`)
   but is **NOT installed in this worktree, deliberately**. A linked worktree
   shares `.git/hooks` with the main checkout, which may hold another session's
   work, and installing there would run the MathShelf gates on that session's
   commits. `install-hooks.js` now detects this and refuses, naming the
   override. The fast tier is run by hand before each commit instead;
   `--no-verify` has not been used, and there is nothing to bypass.
2. `git mv maths/glass-jotter maths/mathshelf` happened as the first act of P1
   rather than after P0.d, because several P0 gates are RED BY DESIGN until the
   thing they guard exists — that is what harness-first means — and waiting
   would have deadlocked the rename that is part of their own fix.

---

## FINDINGS — each with the gate that caught it (harness first)

| # | what it was | caught by | what was done |
|---|---|---|---|
| F1 | the server never checked a class's tickboxes on `save`/`load`: a book a class does not have was closed on the shelf and open on the wire | qa-two-homes at 45b03ed | `actTicked_` on both homes |
| F2 | `coerceActs_` was hardcoded to `{angles, algebra}`, so a third book could be ticked in the markbook and silently dropped — **the Handling Data book could never have been switched on** | qa-tickbox | derived from `ACTS` |
| F3 | "Every line earns its mark." was live in `COMMENTS.perfect` — the banned tagline, on a pupil's screen | qa-language must-fail exhibits | rewritten |
| F4 | the markbook's posture line leaked the internal pencil/ink metaphor to a teacher | qa-voice | rewritten |
| F5 | `@keyframes step-land` animated `background` | qa-compositor | moved to an overlay whose opacity moves |
| F6 | the message voices wore AMBER — a marking colour — while the stylesheet's own opening rule says UI errors never do | the colour law, in pixels | moved to `--support-rose` |
| F7 | the v3 cover's navy radial survived the re-skin and painted over the whole blackboard shell: correct in every token, NAVY in the pixels | the colour law, in pixels | the dead v3 CSS deleted; screens paint no ground of their own |
| F8 | `SWAP_NOFLIP` was a slip nobody could trigger; `ALT_CORR_SWAP` was named in two words | qa-dx-coverage | one deleted, one rewritten |
| F9 | the protractor's centre mark was drawn in MARKING RED — the colour that means WRONG | the colour law | the colour moved to navy; behaviour untouched, and qa-v3-shape proves it |
| F10 | **a pupil's next save wiped the teacher's inked verdict** — she marks a question, the pupil types one more line, the mark reverts, nothing says so | qa-pencil-ink | every stored `ovr` is merged forward on the one write path |
| F11 | **the live site has never served this folder**: every vendored font the deployed page asked github.io for was answering 404, so MathShelf and the Glass Jotter before it have been rendering in fallback faces | qa-build's live-asset probe, with its known-absent control | the five faces are carried IN the page as data: URIs (+215KB, and a whole class of "it worked in the preview" gone) |
| F12 | the reason note ran 89px off the right edge of the paper at 375px | sit-pupil @375 | it wraps on a phone |
| F13 | a disabled Check said nothing about what it was waiting for | sit-pupil, mute-locks | `data-locked-why`, three plain sentences |
| F14 | the gold box-draw and star read as marks wearing the wrong colour | the colour law | they declare themselves `data-celebrate` |
| F15 | the film's step dots stuck 2px out of the film at 375px | sit-pupil @375 | they wrap |
| F16 | the walker was pressing a correctly-disabled Check on every classify and protractor question and calling the result "checked-right" | the walker's own Check reading its `data-locked-why` | the walker now presses the option card and types on the pad, the way she does |

| F17 | the coverage matrix **silently dropped its whole surface half** whenever qa-surfaces had not run first (a control sandbox, or `--only`): the registry was read from a sidecar that gate writes, and the totals still printed GREEN | the control battery | the registry is parsed from `GJ.app.surfaces` in the source; the sidecar only reports drift |
| F18 | qa-repo-prod's strongest question — is the committed server pair the same as a fresh build? — **had never once been asked**: it copied the app folder flat, the assembler could not find its two repo-root inputs, and the build failed every time | the control battery | the scratch keeps the repo's shape; the comparison now runs, and the committed pair does match |
| F19 | the walker's model-attempt table was keyed by question id alone, and **eighteen of the thirty ids appear in both books** — so every algebra question was answered with an angles pupil's working, and quietly refused | the walkers recording what was on screen | keyed by book and question; `sit-confused`'s duplicate copy of the table deleted |
| F20 | **the walkers wrote down the state they meant to reach**, not the state the app was in, so a drive that silently did nothing still filed a row saying she had stood there — and coverage counted every one | itself, once it read `data-state` | `record()` reads the DOM contract, records what it saw, and fails on a mismatch |
| F21 | **five of the seven question kinds never said what state they were in.** Only classify and protractor stamped `data-state`; substitute, collect, expand, solve, form and the angles route went from `fresh` to marked in silence | the honest walkers | every kind now stamps mid-attempt, checked-right, amber, checked-wrong-1/2 and locked-restore |
| F22 | **qa-language had never read a sentence with a comma in it.** The copied entry scanner split on every comma, so twenty of the app's own pupil sentences — the longest ones — never parsed | qa-language's own control | the scanner steps over quoted text; 162 readable sentences became 188 |
| F23 | qa-needs-you's "a flag that never clears" check read `c.q` and `c.reason`, fields no chip has ever carried, so it could not have failed | the control battery | reads `c.qid` and `c.why` |
| F24 | qa-earned-stays' "her work is still hers" check compared two values that were both empty when the row had been orphaned — which is exactly the fault | the control battery | it insists there was work there before it says the work came back |

| F25 | the pre-commit hook was installed in `$GIT_DIR/hooks` of a **linked worktree**, which git never reads — it had sat there since it was written and had never once run, while the record said every commit ran the fast tier | looking, after the control battery made the claim worth checking | the installer now names the directory git really reads (the SHARED one), refuses unless told outright, and the fast tier is run by hand |
| F26 | `book-contents` was stamped "fresh" once in the markup and never again, so "mid-book" and "finished" were declared and rendered by nothing | the honest walkers | the contents page counts her own locked questions and says which of the three it is |
| F27 | seven places printed the **server's own error code** onto a teacher's screen — "not-configured" at ten to nine on a Tuesday | reading the deploy path for what a first visit does | every code the server can return has one sentence; anything unlisted falls back to the caller's own words |
| F28 | **twenty-four states** the registry claimed and nothing ever wrote — a third of the whole registry, counted as coverage cells all along | the new qa-surfaces rule, written the moment F21 showed the shape of the fault | each one written where it happens; the gate cuts the registry out of its own evidence first |
| F29 | **the film froze at step three and the Next arrow did nothing.** The angle count-up is the one animation driven by requestAnimationFrame; a page the browser is not painting gets no frames, the promise never settled, and the player's busy latch never cleared | the walker watching a film the way she does, one step arrow at a time | a backstop timer finishes the count where the frames do not come |

| F30 | **every browser-tier control was reading the wrong tree** — the fault was planted in a sandbox copy and the gate was then pointed at `localhost:8099`, the real worktree, so eleven gates' controls passed honestly and could never have fired | the battery, once the node tier was clean | each browser control gets its own preview server on its own sandbox |
| F31 | qa-fonts reported **Schibsted Grotesk — the interface face on every screen — as not loading.** `document.fonts.check()` asks whether the browser has already painted with a face, and a headless page is never painted | the browser battery | the gate asks the face to LOAD, which is the question it means |
| F32 | the film's gold F/Z/U tracing line read to the colour law as **gold on a reading surface**, on every angles question the film had run over | the walk, at three widths | the trace declares itself an ornament; the film is unchanged (the three colours are meant to accumulate) |
| F33 | **the relay never reached the data deployment at all.** DATA is published to "Anyone within the domain", and the front door's `UrlFetchApp.fetch` carried no credentials: Google answered it with the sign-in page instead of running `doPost`. Every pupil would have met a dead cover on the first morning | the live Executions log, after the front door was cut - `apiCall` completed and there was NO `doPost` row to match it | the relay presents `ScriptApp.getOAuthToken()` as a bearer; the caller is the pupil, and she is in the domain. qa-two-homes already printed the blind spot in its own NOT MEASURED line: "the relay hop is exercised sandbox-to-sandbox; the real network is not called" |
| F34 | **the bearer did not open the door either: `RELAYDIAG code=401`.** A web app published to "Anyone within the domain" cannot be called server-to-server at all - `UrlFetchApp` carries no session, and a token from `ScriptApp.getOAuthToken()` is refused unless the caller also holds a Drive scope, which would put "see and download all your Drive files" on every pupil's consent screen | a temporary `console.log` of the response code, run from the editor against the live DATA deployment | DATA is published to **Anyone**, and the shared secret (256 bits, script property only, URL never sent to a browser) is the whole lock - written up in `server/DEPLOY.md` under WHY DATA IS PUBLISHED TO ANYONE |
| F35 | **the readability audit was already here, and nothing ever called it.** `lib/contrast-audit.js` was ported from the KS3 DT platform on 28 August, written for exactly this fault class - "an INHERITED colour, the DARK shell's text token, on a light parchment card" - and `lib/audits.js` exposed it as a separate call "the caller decides how often it is worth taking one". No caller ever decided. Three walkers listed `readability` among the cells they covered and not one of them invoked it | he opened the markbook and could not read it | it runs on every recorded state, from `run()`, not by invitation |
| F35a | the audit's root was `document.querySelector('[data-surface]')` - the FIRST surface in the document, which is `#scr-cover` and is `hidden` on every screen but the cover. It collected nothing, and "nothing" went through the filter as a clean PASS. Zero elements measured on every state of every walk, reported green | a probe that asked it to measure a page and print how many elements it had looked at | the root is the visible surface; a measurement of nothing is now `EMPTY`, never `PASS` |
| F35b | glyphs the pixel sampler cannot separate from their plate were dropped as a "skip with its reason" - and white on white is exactly that case. The worst fault the gate exists for was the one it stayed silent about | the same probe, with an invisible sentence planted | unmeasurable rows are asked again in computed colour composited through their ancestors, and a gradient is refused rather than guessed (which had reported white-on-teal at 1:1) |
| F36 | **`.ledger` set its own white ground and never set a text colour**, so the markbook's class table inherited the shell's near-white chalk. Class names, pupil counts and "Open the markbook" at **1.04:1** | him, on the live site | a light surface declares its own ink, in the same rule as its ground |
| F37 | **the audience chip floated over the series name.** `.bcover .band` was `position: absolute`, so it took no space and "LETTERS & BALANCE" ran clean underneath it. Nothing measured geometry BETWEEN elements at all - the geometry audit asks only whether a thing stays inside its card | him, on the live shelf | the chip is in the flow beside the series; a new overlap law walks every visible text box and fails on any pair that lands on another |
| F38 | **the name WAS read, and then thrown away.** `doGet` put her real name in BOOT from her own Google token - the userinfo call returns 200 with `"name": "D Gartland", "given_name": "D", "family_name": "Gartland"`, measured 6 Sept 2026 - and the cover painted it. Then `hello` came back and `me.name = r.name \|\| ''` overwrote it with what the Sheet held, which for a pupil who has never typed a name is nothing. A good name was wiped by an empty one and she was asked to write it herself | a probe that asked Google the question the app asks and printed the answer | `r.name \|\| me.name \|\| ''` - a name she saved wins, and nothing is not a name she saved |
| F38a | the guard around `autoName_` (`getEffectiveUser` vs `getActiveUser`) was blamed for this first and removed. It was NOT the cause - the probe shows both return the same address - but the guard protected a case that cannot happen (the data deployment serves no page) and could only ever have done harm, so it stays gone. Recorded because a wrong diagnosis that got as far as a deploy belongs on the record next to the right one |
| F39 | **the substitution board told her the same thing twice, in two wordings.** `commitMethod()` wrote "Now work it out, then write the value:" into the instruction line at the top of the question, and `showAnswer()` put "Now work it out, then enter the value:" directly above the number pad. One sentence, two spellings, and the top one nowhere near the box it was talking about. Twenty-eight gates read the strings table, and none of them read the SCREEN | him, on the live substitution question | the prompt belongs beside the box it is about, once; a new said-twice law walks every instruction line on every recorded state and fails on a pair inside one question that is identical or one word apart |
| F39a | the said-twice law invented four faults before it was honest: the contents page (404 findings - every exercise title matched every other), the self-evaluation list, the shelf marks, and an exercise heading against its own nav chip. Each narrowing is a rule now: it reads only instruction lines (the ui-msg class, this platform's own class for a sentence addressed to the reader), it compares only inside one question or one book, it ignores anything under 25 characters or 5 words, and a pair must be identical or exactly one token apart. A law that cries wolf is a law he turns off |
| F40 | **the shelf failed on a phone and a tablet, and the 1280 walk never knew.** "The Geometry Set" measured 3.49:1 at 768 and 4.39:1 at 375 against a 4.5 floor - white, 11px, uppercase, on the brightest pixel of a teal gradient. Two things were wrong and only one of them was the plate: turning the gradient over so the dark end sits under the labels got the worst pixel to 5.36:1 and it STILL measured 4.44:1, because an 11px face at .16em letter-spacing is mostly edge - the sampler reads glyphs that are half plate, and so does an eye at the back of a room. Both stops are now at or below the token colour and the label is 600 | the shipped tree's own `over-tightening` control, which walks all three widths - the pass I had run by hand was 1280 only | a thin small label on a saturated ground is a contrast fault even when the arithmetic on the two colours says it is not |
| F41 | **three controls read DID NOT FIRE and every law they guard was working.** The control sandbox carried two hardcoded files out of the repo root and `index.html` had quietly grown a third, so every browser control ran against a page that 404'd on the crest: seven console errors on every state, the walk failing for the missing file instead of for the planted fault. A control that fails for the wrong reason is worse than no control, because it reads as a broken gate and the real answer never arrives. The sandbox now reads its asset list out of the page | a network trace of a hand-built sandbox, printing what actually 404'd | one list, held in the file that owns it |
| F42 | **the contrast law was measuring the EDGES of letters, not the letters.** It took the pixel cluster whose mean was NEAREST the colour the browser says the text is, and for a thin or short string the nearest cluster is a pale blend of ink and paper. Antialiasing only ever pulls glyph pixels TOWARDS the plate. That is how "Added to your jotter." - green on white, readable across a table - came back at 1.16:1, and the question prompts, navy on paper, at 2.18 and 3.09 | photographing the screen the gate had just condemned, three times, and finding nothing wrong with any of them | among clusters that are recognisably the text's own colour, the core is the one FARTHEST from the plate: the middle of a stroke, where a reader's eye lands. Proved to still bite AFTERWARDS - planted white-on-white in the markbook still gives 1:1 |
| F42a | four more faults in the same sampler, each of which made blank paper look like a fault at about 1.1:1: the picture was the VIEWPORT and the boxes were in DOCUMENT coordinates (every scrolled screen sampled a scroll-offset away); the offset was read a tick after the boxes, so a page still scrolling to show a verdict measured in two frames of reference; a row scrolled off the picture was CLAMPED to its top-left corner instead of skipped; and the plate was never checked against the element's own ground - a navy button sampled as white paper had not been sampled at all. Every one was mine, introduced while fixing the one before it |
| F43 | **the faults that were real, once the law could be believed**: the disabled "Mark my working" at 2.57:1 (the whole control was faded to 55%, so the one action on the page was barely readable while she worked towards it); the theorem stamp permanently at nine tenths opacity in its BASE rule; the bins' family labels - X TERMS, X SQUARED TERMS, NUMBERS, which ARE the instruction for the sort - at 4.04:1; the substitution board's GIVEN label at the same; "WHERE IT WENT WRONG", the heading on the card she reads after two wrong tries, at 3.57:1; and the amber near-miss note, "Close, but check you are reading the scale", at 3.57:1 | the walkers, once the sampler was honest - and two of them by reading the files after the gates had gone quiet | each darkened past the point where its own rendering loss still clears the floor |
| F44 | **five controls had never fired, and three could not have.** One quoted a sentence its gate had stopped printing; one planted the legend fault while waiting for the exercise-card message; one deleted a CSS line the relight had already made redundant; one planted a script.js from before the v4 rebuild, which hung the walk at nought per cent and is why the confused battery had never once finished; and one duplicated a law another gate owns, with a plant that had to reach into a renderer it only passes through | running the batteries to completion for the first time | a control quotes the sentence its gate actually prints, plants ONE fault, plants it in TODAY's code, and lives in the gate that owns the law |
| F44a | and two harness faults that made controls lie: `control.js` restarts its port counter at 8300 every run and spawns its servers detached, so an interrupted battery leaves them behind - the next run's server failed to bind, the "is it up?" curl succeeded against the STALE one, and a walk tested a tree from hours earlier. It now steps over any port something is already answering on AND the sandbox carries a token the server must hand back. The other: `stage.js` and `sit-teacher.js` typed into the staff passcode box before it existed, which killed the FIRST teacher control of every battery |

## GATES THAT INVENTED A FAULT AND WERE NARROWED (L6)

Each keeps the correct thing it condemned as its permanent pass-control.

- qa-cache-scope read a variable NAME and condemned the whole-store key; then
  could not follow a key BUILDER and condemned the outbox.
- the colour law condemned the wordmark, the focus ring and the primary button
  for being gold — narrowed to its intent: gold is a fault on a reading
  surface, on a mark, or as a value.
- the colour law condemned empty grid cells for an inherited colour that paints
  no glyph.
- the consequence law condemned the marking feedback itself for making the
  chosen option look different — narrowed to before Check.
- FITS treated a column with no drawn edge as a card, and condemned every phone
  diagram for leaving a boundary that is not drawn anywhere.
- qa-build read only `moduleJs` and reported that qrcode.min.js was not inlined.
- qa-needs-you guessed a function signature; and matched "25" inside a date.
- the clock scanner read `15 * 60 * 1000` as three clocks.
- qa-audit refused a split filing that names its part, which the design allows.
- qa-support-gate looked for `>= 2` and missed the same gate written as `< 2`.

## THINGS THE RIG LEARNED THE HARD WAY

- **Screenshots and page.evaluate are fine; a long walk is not.** Walking a
  whole book in one page churns several hundred SVG mounts through one renderer
  and it takes the browser down. The walkers now use a fresh browser per book
  and a fresh document per exercise. It costs about 90 seconds per book per
  width and it is why the walk finishes.
- **A stale node process reports stale findings.** Node caches its requires at
  start, so a walker launched before an edit keeps testing the old code. Kill
  the old run before believing a new one.
- A backtick inside a template-literal comment silently ends the literal.
- **A walk that names its own states is not a walk.** Four of the eight faults
  above were invisible until `record()` started reading `data-state` instead of
  being told it. A harness that reports what it intended is a harness that
  agrees with itself.
- **A control sandbox has to keep the repo's shape.** Two gates read files from
  the repo root; a flat copy of the app folder made both of them fail for the
  wrong reason, and one of them had been failing that way in every run.
- The dock is rendered INSIDE the question root, so a query across "the
  question and the dock" returns every control twice.
- **Ask "can she see it?" before "is it disabled?"** A renderer is entitled to
  take a control away rather than grey it out, and this one does exactly that
  once a question is marked. Asking the questions the other way round reported
  seventeen marked questions as controls that would not act and would not say
  why.
- **Do not edit the app while a full run is walking it.** The sidecars a walk
  writes carry the content hash they were taken at, and at the full tier a
  stale sidecar counts as absent - so a fix committed mid-run invalidates the
  evidence that run had already gathered, and the coverage matrix reports
  thousands of cells nobody stood on. The run is a photograph; changing the
  subject halfway through gets you neither picture.
- **There is no requestAnimationFrame in a headless page.** Not a throttled
  one - none. Any promise that waits on a frame waits for ever, and the app
  code that does it is the code a walk can never get past.

## 6 SEPT 2026 — THE DEPLOY, AND WHY IT MOVED HOUSE

- FRONT DOOR cut on the old project as Version 27 (10:46). It served the page,
  but the relay never arrived: no `doPost` row beside the `apiCall` row. Cause
  (F33): the OAuth grant on the deployer's account dated from 18 June and had
  never carried `script.external_request`, so `UrlFetchApp.fetch` threw before
  it reached the network. The relay now sends the caller's bearer as well.
- Removing that stale grant put the consent screen back in front of us, and the
  consent screen read **"OLS Maths - Glass Jotter (Unverified)"** - a dead name
  on the first screen a pupil ever sees. The name is held on the OAuth client
  Apps Script minted in June; renaming the script does not touch it, and a
  reload proved it was not a cache.
- Damien's call: rebuild in a project whose consent screen is right. Taken the
  cheaper road to the same place - COPY THE SHEET. A copied spreadsheet brings
  its bound script with it as a NEW project with a NEW OAuth client, so the
  consent name is the new name, the script stays BOUND (no `openById`, no code
  change, no widening of `spreadsheets.currentonly` onto pupils), and the Sheet
  gets the rename it was owed anyway.
- NEW HOME: Sheet "OLS - MathShelf" `1xVDBKmPP83MMZPqpPJr0GQRR0N9estf9ebhKyhGQd0Y`
  (copied 6 Sept 2026 from `164nmiqGLLr2SktTuPnZy70KQZL9Us4CItMW5VnbCyMY`).
  The old Sheet and the old script project are to be retired, not deleted.

## 6 SEPT 2026, AFTERNOON — THE FOUR FAULTS HE FOUND BY LOOKING

He opened the deployed app and found, in one sitting: a markbook he could not
read, a chip sitting on a book's series line, a shell too dark to work in, a
cover asking him to type a name the app already knew, and a question that told
him the same thing twice. Twenty-six gates were green. Written up as F35-F39.

What went out in response:

- **the shell relit** to light (his ruling: *"B - lighter background, the other
  one looks terrible"*): `--board-0/1/2`, `--chalk`, `--chalk-muted`,
  `--gold-ink`, `--link` retuned, nine hardcoded `#fff` shell-text rules moved
  onto `var(--chalk)`, and seventeen light grounds in `style.css` given an ink
  of their own in the same rule as their ground.
- **the name kept**: `me.name = r.name || me.name || ''` — a name she saved
  wins, and nothing is not a name she saved (F38).
- **the chip put in the flow** beside the series, not floating over it (F37).
- **a line that is waiting says so**: `.is-waiting` breathes and carries a
  spinner, on all five call sites, and does neither under
  `prefers-reduced-motion`. His words: *"when it says things like 'Checking the
  passcode...' they should be pulsing to indicate something is happening"*.
- **the instruction given once**, beside the box it is about (F39).

And three laws that read the finished screen rather than its parts —
`readability`, `overlap`, `said-twice` — each with a control that plants his own
fault back, each a coverage RIDER, and each carrying a count of what it looked
at so a law that measures nothing cannot report green.

## WHAT WAS DONE TO THE OLD PROJECT (retired, not deleted)

`1otJG5454zR6a0WKZW23czKnehxtQ3Oj6CrrRWYys1H4bPxZOoaZ3qPmC`, renamed in the
editor to **"MathShelf - RETIRED 6 Sept 2026 - see the new project"** so two
projects cannot be confused for one another. All THREE of its live deployments
are ARCHIVED, so nothing can land on a MathShelf that writes to the old Sheet:

- the front door cut this morning (Version 27),
- the old main `/exec` (Version 26, `DATA - MathShelf v4`),
- the auto-name companion (Version 21) - the retirement the charter asked for.

The `autonameUrl` row is deleted from the new Sheet's Config tab; nothing reads
it any more.

## WHAT THE HARNESS COULD NOT DRIVE (said plainly, DFM 213)

The served page runs inside Apps Script's sandboxed iframe, and keystrokes sent
by the browser automation do not reach it: clicks land and focus moves, but the
staff passcode box stays empty. So the eight-item smoke list is still HIS to
run - the server chain is proved from the Executions log, the interface is not
proved from a driven keyboard. This is a limit of the driving surface, not a
finding about the app.

---

# HANDLING DATA — BOOKS C, A, B (started 8 September 2026)

The build of the GCSE Handling Data series onto the live MathShelf, from
`Claude Work/Maths/MATHS_STATS_DESIGN.md`, `MATHS_GATES_DESIGN.md` Part 8 and
`MATHS_STATS_OPUS_PROMPT_GATED.txt` (8 Sept revision). Book C first, then A,
then B; one deploy per book.

## Preconditions, verified 8 Sept 2026 before any change
- v4 IS live: `maths/mathshelf` on the tip `a237177`; HANDOVER.md "What is live"
  and `server/DEPLOY_LOG.md` carry the FRONT DOOR (Version 20, execute-as-User)
  and DATA (Version 19, execute-as-Me) rows from commit `c6f55e3`.
- Colette's sources present: twelve files plus `SOURCE_INVENTORY.md`.
- The gate system exists and `run.js --fast` is GREEN — 26 gates, 1.1 s.
  `content-fixture.js` correctly absent (plants.js writes it into the sandbox).
- Baseline `--full` and `--control` started in the background BEFORE any edit,
  so the photograph is of the unchanged tree.

## Work packages (TIME c) — by file ownership
| package | owner | files | state |
|---|---|---|---|
| ENGINE | this session | `statcore.js`, `dev/test-statcore.js` | GREEN — 154 selfTest cases, floor 80 |
| CHART | sonnet subagent | `statchart.js` | running |
| LINT | sonnet subagent | `dev/lint-content-stats.js` | running |
| SOURCES | sonnet subagent | `stats_sources/GRAPHICAL_READS.md` (outside the repo tree) | running |
| RENDER | this session | `jotter-stats.js` | in hand |
| CONTENT-C, WALK, SPEED, V4-STATES | queued behind the baseline battery | | |

## The baseline run, and what it is and is not worth (8 Sept 2026)

`run.js --fast` was GREEN on the unchanged tree (26 gates, 1.1 s) before a byte
was touched. `run.js --full` then ran for **35 minutes** (budget: 20) and ended
RED on two gates:

- **qa-repo-prod** — the seven files this build had created by then were
  uncommitted. That is mine, not the tree's.
- **qa-coverage** — 3,027 cells, every walker-ridden family reading `0 closed`.
  **This number is not the pre-existing red, and it is not a fault in the app.**
  All eighteen walker sidecars were declared STALE: `contentHash` (lib/hash.js)
  hashes EVERY `.js`/`.css`/`.html` in the app directory, and this session
  created `statcore.js`, `statchart.js` and `jotter-stats.js` while the walk was
  running — files nothing loads yet. Each new file moved the hash, so every
  sidecar written before it counted as absent. The walkers themselves were
  green: sit-pupil 868 checks, sit-confused 852, sit-teacher 94, zero failures.

Two things follow, and both are written down rather than absorbed:

1. **The rule "never edit the app while a full walk is running" includes ADDING
   a file the app does not load.** I read it as being about edits to what the
   page serves; the content hash does not. The authoritative baseline is the
   next `--full`, run on a quiescent tree.
2. **A harness finding for package SPEED:** one content hash over the whole app
   directory means any new file invalidates every sidecar of every book. Hashing
   per book (which SPEED's brief already asks for) also fixes this.

The baseline `--control` was started and then **killed deliberately**: it would
have been a photograph of a tree that was about to change under it, and the
control battery's own record (PROGRESS F-series, 7 Sept) already has all
fourteen controls green at this commit. The battery that counts is the one
before the deploy.

## Where Book C got to (8 September 2026)

Green under their own proofs, at HEAD:
- `node dev/test-statcore.js` — **156 cases**, floor raised from 80.
- `node dev/lint-content-stats.js` — PASS: 6 sections, 33 questions, 51 movie
  steps, 94 marks, every answer re-derived independently of the engine.
- `node dev/validate-all.js` — **81 questions**, model and corrupted attempt
  each through the live engine; floor raised from 48.
- `node tools/qa/run.js --fast` — green (the only red is the uncommitted tree
  between commits).
- In a real browser, at 375, 768 and 1280: all 33 questions mount across all
  eight kinds, each declaring its stages, each with a Check that says what it
  is waiting for, none showing the truth before Check, zero console errors; and
  all 33 re-draw read-only for the teacher (13 of 13 board kinds draw a board).
  A `qlist` question was driven end to end by hand — tray deranged, ordered,
  three cuts committed with their read-outs, the IQR keyed wrong, marked
  "Quartiles 3/3 · Interquartile range 0/1", first attempt struck and a fresh
  board offered.

Two engine limits the validator found, fixed rather than designed around:
1. **Two reads at two values in one question.** `markAtXAnswer` read a single
   top-level `S.answer`, so a second `atX` ask could never be marked. Reads and
   answers are now keyed `atX@<x>`, and the CF notes' "above 167 cm" and
   "below 153 cm" can both be asked.
2. **A box plot built from a curve** whose least and greatest are printed while
   its three cuts are read off the graph: `boxTruth` treated `given` as the
   whole truth and never fell through to the curve, so such a question could
   only ever be marked follow-through.

And one thing the design said would not be needed: **a book is not entirely
client-only.** `server/Code.gs.template` keeps `var ACTS` and refuses any other
act id (`bad-act`), so without its id the book could not save a mark, appear on
the Working Wall or be drilled into. `qa-store-scale` found it. The id is added,
every other two-book default in the server derives from `ACTS`, and the offline
stub is shaped the same way from `ACTIVITIES`. It means this deploy carries a
server change, so his eight-item live smoke list applies, not just the book's.

## The walk of Book C, and the twenty faults it found (8 September 2026)

Green at HEAD, each proved by running it:
- `dev/test-statcore.js` 156 cases · `dev/lint-content-stats.js` PASS ·
  `dev/validate-all.js` 81 of 81 · `run.js --fast` 26 gates.
- `sit-pupil` on Book C: **590 checks, 0 failed**, 538 states stood on, no
  console errors. `sit-confused`: 199 checks, 0 failed. `qa-two-attempts`,
  `qa-tray-order`, `qa-click-safety`, `qa-colour-law`, `qa-numpad`,
  `qa-build`, `qa-manifest`: green.

What the walk found that reading could not. Every one is fixed at the root and
every one would have met a class:
1. **No decimal point on the number pad.** The two questions whose answers are
   1.5 and 1.8 could not be answered at all, and tap-first means there is no
   other way in.
2. **A commit that never enabled.** A reading question's "That's my answer" was
   judged once when the dock was built and never again.
3. **The dock rebuilt itself under her hands** on every nudge, throwing away
   the pad she was typing into mid-number.
4. **A judge question had no reason bank**, so a claim called not fair could
   never be given one.
5. **A single press could put placed work back** - DFM 272 itself - because the
   clearing click was heard only on the question's own body.
6. **The struck first attempt was counted as work already placed**, so a second
   go could not be finished; and it took the presses her second go was made of.
7. **A tray could still come out in the answer order** when values repeat.
8. **Five box-plot labels sat on one another** on a phone.
9. **Feedback did not fit the kind**: a list question praised for its curve.
10. **A book is not client-only** (the server's ACTS list).
...and ten more of the same shape, each in its own commit message.

Two gates were also saying things that were not true and were fixed at the
rule, each re-planted with the fault it exists for: a card that SCROLLS is not
a card that spills; a hyphen inside an English word is not a minus sign; a
question that names people in a scenario is not naming the reader; a citation
is not prose.

## The harness, after package SPEED
`--fast` 1.19 s. `--full --book angles` **4:30 pooled against 21:48 serial**.
All-books `--full` 10-12 minutes (budget 20). `MS_WORKERS` defaults to 6;
`control.js --changed` exists and runs everything until PROGRESS carries a
`controls: green <date> <commit>` line. Detail in `tools/qa/HARNESS_SPEED_PASS.md`.

## Notes to whoever picks this up
- `node dev/test-statcore.js` is the engine's own proof and takes under a second.
- The engine's unit table (`UNITS` / `unitsOf`) is the ONE home of band, weight
  and `ftEarns` per marking unit; the selfTest pins every one of them (UT1–UT9).

## 8 September, the afternoon: what the new walks found in v4

Package V4-STATES put walkers on thirty-odd screens nobody had ever stood on.
Standing on a screen is how a law gets asked about it, and eleven things came
back. Six were faults in the app, three were the contrast law saying things that
were not true, and two were the walker's own.

**In the app**

1. A book a class has not been given was drawn in the gold of a lit book: its
   emblem measured 1.01 to 1 against its own plate.
2. The markbook's QR panel announced nothing to a screen reader, because the
   line it announces into was written away every time the panel opened.
3. The Set-up series headings were 11px in the muted chalk at 4.31 to 1.
4. The teacher's cover never said it was waiting, and never said it was in.
5. A class page that could not be refreshed said nothing at all.
6. The full grid's scroll listener was on a div that cannot scroll.
7. Opening one question across the class was drawn as the book view, so the
   question view's own ink control could never be reached.
8. **The reading rule had no floor.** Holding the down arrow at the bottom
   carried it off the graph into negative frequencies, where it crosses no
   curve - so the reading came back empty and the working line the pupil had
   just committed read `median = {value}` on her own screen.
9. The same line printed the raw intersection - `median = 10.3125` - under a
   board whose own read-out says 10.31.
10. Two box-plot labels could sit on one another on a phone when no row above
    or below was free either.
11. The demo class's amber pupil showed full working on every question, so the
    one verdict her profile exists to demonstrate never appeared.

**In the contrast law** (each narrowed at the rule, each proved to still bite by
planting the fault back)

- A glyph drawn in SVG is painted with `fill`, not `color`: the sampler was
  hunting for white pixels inside a dark italic "x" and reporting 1.01 to 1 on a
  letter you can read across a room - and would have said the same about an
  invisible one.
- A row behind the preview banner was judged on pixels nobody can see: trimmed
  where the bar cuts it, dropped where the bar covers it, and clamped to the
  picture before either.
- A glyph run turned on its side, and a sampled core paler than the ink can be
  at full opacity, are answered in computed colour instead of in pixels.

**In the walker**

- The rule nudge pressed an absolute number of steps up the axis, which is only
  right if the rule is parked - and the drive is called once per stage on the
  same board. A box plot drawn perfectly off those readings came back
  "Box 2/2 · Whiskers 2/2" and a red verdict in the same breath.
- sit-teacher replaced the app's own `call` to prove `set-up:error` and never
  put it back, so every screen after it in the route was reading a refused
  server.

Coverage per rider family: **204 closed / 21 missing** after V4-STATES, and now
**every one of those 21 is answered** - twenty walked, and `question:amber`
recorded as a screen the app's own place-all-then-check law puts out of reach
(the value pad does not exist until the letters are placed, so a one-line right
answer cannot be written). `qa-coverage` reads that table now and prints it.
