# MathShelf — session handover

**What it is:** the OLS maths platform. Pupils open a shelf of books and work
through exercises line by line; the engines mark like a CCEA examiner; teachers
get a live markbook that answers their questions in the order they ask them.
Built from inbox issues #24 (Angles) and #25 (Algebra), on branch
`draft/issue-24-25-maths-m2-revision`, PR #22.

Read `DESIGN.md` and `INTERFACES.md` for the module contracts, `ADDING_A_TOPIC.md`
to add a book, `server/DEPLOY.md` before any deploy, and `PROGRESS.md` for where
the current build got to (the harness-speed pass of 8 Sept — MS_WORKERS,
`--changed`, the per-book hash — is written up in full in
`tools/qa/HARNESS_SPEED_PASS.md` rather than in PROGRESS.md itself).

---

## The gate system (read this before changing anything)

Nothing on this platform is done until the gate that guards it is green **and**
its control has been seen to fire. That is not a style preference; it is the
answer to a specific problem, in Damien's words on 5 September 2026: *"so that
I will have less or no work to do to make repeated changes, which is something
I'm finding far too time-consuming."*

```
node tools/qa/run.js              # the fast tier: every commit runs this
node tools/qa/run.js --control    # every gate is made to say no, and seen to
node tools/qa/run.js --full       # the walkers, three widths, both tiers
node tools/qa/run.js --book angles   # scope the WALKERS; nothing else narrows
```

**Speed (package SPEED, 8 Sept 2026 — detail in `tools/qa/HARNESS_SPEED_PASS.md`).**
At the `--full` tier, `run.js` and `control.js` run their gates/controls through
a pool of `MS_WORKERS` processes (default 6 — set the env var to change it); the
fast-tier gates still run first, serially, and `qa-coverage` still runs LAST,
alone. `sit-pupil`/`sit-confused` shard across the pool by book × width and
`sit-teacher` by width; every worker gets its own preview server and port, and
the results/coverage matrices print in the same declared order regardless of
which order the pool actually finished them in. `control.js --changed` narrows
the control battery to gates this commit could plausibly have broken (its own
file, what it requires, or a book it COVERS whose files changed), derived from
`git diff` against the commit recorded in PROGRESS.md as `controls: green
<date> <commit>` — with no such line it runs everything, same as today. And
`lib/hash.js` now exports `bookHash(APP, bookId)`: a walker sidecar for one
book is stamped with the hash of THAT book's own pack, engine and renderer,
plus the shared client — never the whole app directory — so adding a file no
book loads yet (mid-build, as `statcore.js`/`statchart.js`/`jotter-stats.js`
all were on 8 Sept) can no longer invalidate every other book's evidence.

`tools/qa/install-hooks.js` puts the fast tier on `pre-commit` — but **it says
no in a linked worktree, on purpose**: git reads a linked worktree's hooks from
the shared `.git/hooks`, and this repository is worked in from more than one
place at a time, so installing there would run the MathShelf gates on another
session's commits. In a worktree, run `node tools/qa/run.js` yourself before
each commit. `--no-verify` is not used here.

- **`tools/qa/MATHS_FEEDBACK_MASTER.md`** — every ruling he has made, numbered,
  dated, in his words. Read it before writing a sentence a pupil will see.
- **`tools/qa/MATHS_GATES_AUDIT.md`** — where each of those rules is HELD, plus
  the floors, the pinned refs and the approvals. `qa-audit.js` proves every rule
  has exactly one home.
- **`tools/qa/COLD_READ_CHECKLIST.md`** — what the separated judge is handed.
- **`tools/qa/MATHS_COVERAGE_DEBT.md`** — the only place a coverage cell may be
  owed, and the freeze that stops you editing a file whose coverage you owe.

The two things most likely to catch you out:
1. **Coverage is DERIVED.** Adding a book, a kind, a surface or a state
   automatically creates cells; `qa-coverage` fails naming any cell nothing
   closes. There is no list to update — that is the point.
2. **Every screen declares itself** (`data-surface` / `data-state`), and
   `GJ.app.surfaces` in `script.js` is the app's own statement of what it can
   render. Both directions are checked.

And two rules the second pass of the control battery paid for:

3. **A walk records what was on screen, never what it meant to reach.**
   `record()` reads `data-state` off the root and the walk settles up at the
   end: every state it aimed at has to have been stood on at least once. Four
   real faults were invisible until this was true, including five of the seven
   question kinds never stamping their state at all.
4. **The walker presses the app's own controls** (`tools/qa/lib/drive.js`): it
   taps letters into an expression, sorts tiles into family bins, picks a
   product per grid cell, plays the move rail chip by chip, taps an arc and
   chooses a reason. If you add a question kind with a new scaffold, it needs a
   branch there — otherwise the walk cannot answer it, and will say so.

And one rule the live site paid for, on 6 September 2026:

5. **Read the finished screen, not its ingredients.** Twenty-six gates were
   green when he opened the deployed app and found white text on white, a chip
   sitting on a book's series line, and a question that told him the same thing
   twice in two wordings. Every gate read a PART — a file, a string, a rule, an
   element. Three laws now read the composition: `readability` (rendered-pixel
   contrast), `overlap` (no two text boxes on one another) and `said-twice` (no
   instruction repeated inside one question). All three run from `run()` on
   every recorded state, all three are coverage RIDERS, and each has a control
   that plants his own fault back: `invisible-class-names`,
   `text-under-a-floating-chip`, `told-twice-in-two-wordings`. When he finds a
   fault by *looking* at the live site, ask first whether a law that reads the
   whole screen would have caught it.

## Verify

```
cd maths/mathshelf
node -e "require('./mathcore.js').selfTest()"   # 73 cases
node dev/test-anglecore.js                       # 72, ALL GREEN
node dev/lint-content-angles.js                  # PASS
node dev/lint-content-algebra.js                 # PASS
node dev/validate-all.js                         # 48 of 48 sound
node dev/test-server-scoping.js                  # 20 passed
node server/build-pathb.js                       # regenerate the deploy pair
```

Preview (never the preview tool — a dev server goes up with nohup):
```
nohup python3 /tmp/gj-serve.py /tmp/gj-wt 8099 &
http://localhost:8099/maths/mathshelf/index.html?class=demo&nointro
```
Staff passcode in the preview is `demo`. Clear localStorage first so the demo
class re-seeds, and always use `?nointro`.

## What is live

**Live since 7 September 2026, from commit `c6f55e3`.**

| | /exec | version | executeAs | who can reach it |
|---|---|---|---|---|
| FRONT DOOR (everybody) | `https://script.google.com/a/macros/c2ken.net/s/AKfycbzUZ3bDjcFas_zQ02VrJQCEkPQgEjs3Re4JZ1OQtLACa090AC1B0Md2yUkL4aX81LwP/exec` | Version 20, 18:11 | USER_ACCESSING | anyone in `c2ken.net` |
| DATA (nobody; the relay only) | `https://script.google.com/macros/s/AKfycbyO6pQnLHujpost5Otxe9oJB2iFdbno3Kxxw5RU51A9prKiqDMrIm__UWuLEDn2f4wo/exec` | Version 19, 18:09 | USER_DEPLOYING | anyone who holds the shared secret — see `server/DEPLOY.md` |

Apps Script project `1oW-8eFK4DUvTZaB56jg_rYd7l_L_zPY-5Um16v0gtq_dlbThvbLczhOX`,
Sheet `1xVDBKmPP83MMZPqpPJr0GQRR0N9estf9ebhKyhGQd0Y`, both titled
"OLS — MathShelf". Staff passcode `0lsMaths26*`.

**The project that was left behind.** `OLS Maths — Glass Jotter`
(script `1otJG5454zR6a0WKZW23czKnehxtQ3Oj6CrrRWYys1H4bPxZOoaZ3qPmC`, Sheet
`164nmiqGLLr2SktTuPnZy70KQZL9Us4CItMW5VnbCyMY`) is RETIRED, not deleted. Its
OAuth client still carries the June name, so its permission screen read
"OLS Maths — Glass Jotter" to every pupil; renaming a script does not rename its
client, and copying the Sheet was the only way to get a new one. Any old class
link points at the old front door and must be reissued.

## Worktree gotcha (read this to resume)

The main working tree `~/Sites/ols-digital-skills` is shared by other concurrent
sessions and may hold their uncommitted work. **Do not clobber it.** This work is
done in an isolated worktree:

```
git -C ~/Sites/ols-digital-skills worktree add /tmp/gj-wt draft/issue-24-25-maths-m2-revision
cd /tmp/gj-wt/maths/mathshelf
node tools/qa/install-hooks.js
```

The KS3 DT platform (`ks3-dt/`) is **read-only** in every respect. Every module
copied out of it carries a header line naming the source path, commit and date,
and no gate here requires across trees: the maths gates run when that tree is
absent.

## The three books

| book | audience | status |
|---|---|---|
| Angles | KS3 · M2 | approved, live since 28 Jun 2026, content verbatim MEP |
| Algebra | KS3 · M2 | approved, live since 28 Jun 2026, content verbatim MEP |
| Handling Data (Colette's) | GCSE · M3 & M4 | designed, not built — `MATHS_STATS_OPUS_PROMPT_GATED.txt` |

Angles and Algebra are **approved**: their content is reported on, never
re-opened (rule 30). `6 + b = 6 + 7 = 13` is verbatim-correct MEP and must never
be "fixed".
