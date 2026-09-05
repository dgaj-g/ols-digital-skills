# MathShelf — session handover

**What it is:** the OLS maths platform. Pupils open a shelf of books and work
through exercises line by line; the engines mark like a CCEA examiner; teachers
get a live markbook that answers their questions in the order they ask them.
Built from inbox issues #24 (Angles) and #25 (Algebra), on branch
`draft/issue-24-25-maths-m2-revision`, PR #22.

Read `DESIGN.md` and `INTERFACES.md` for the module contracts, `ADDING_A_TOPIC.md`
to add a book, `server/DEPLOY.md` before any deploy, and `PROGRESS.md` for where
the current build got to.

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

`tools/qa/install-hooks.js` puts the fast tier on `pre-commit`. `--no-verify` is
not used here.

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

_(filled in by the deploy; `qa-repo-prod` post-deploy requires the commit and
both /exec URLs to be named here)_

| | /exec | version | executeAs |
|---|---|---|---|
| FRONT DOOR (everybody) | — | — | USER_ACCESSING |
| DATA (nobody; the relay only) | — | — | USER_DEPLOYING |

Apps Script project `1otJG5454zR6a0WKZW23czKnehxtQ3Oj6CrrRWYys1H4bPxZOoaZ3qPmC`,
Sheet `164nmiqGLLr2SktTuPnZy70KQZL9Us4CItMW5VnbCyMY`, both titled
"OLS — MathShelf". Staff passcode `0lsMaths26*`.

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
