# MathShelf v4 — build progress

**Session 1: Opus 5 MAX, 5 September 2026.** This file plus the pushed branch is
the resume point. Nothing in a chat window is needed to continue.

---

## HOW TO RESUME, in order

```bash
# 1. the worktree (recreate it if /tmp was cleared)
git -C ~/Sites/ols-digital-skills worktree add /tmp/gj-wt draft/issue-24-25-maths-m2-revision
cd /tmp/gj-wt/maths/mathshelf
node tools/qa/install-hooks.js            # every commit then runs the fast tier

# 2. the two preview servers (nohup, never the preview tool)
nohup python3 /tmp/gj-serve.py    /tmp/gj-wt                        8099 &   # the source tier
nohup python3 /tmp/serve-built.py /tmp/gj-wt/maths/mathshelf/server 8100 &   # the BUILT tier
#    (both scripts are in /tmp; if they are gone, see "the two servers" below)

# 3. where things stand
export NODE_PATH="$(npm root -g)"
node tools/qa/run.js                      # the fast tier — GREEN as of the last commit
node tools/qa/sit-pupil.js                # ~90s per book per width
node tools/qa/sit-confused.js
node tools/qa/sit-teacher.js
node tools/qa/control.js                  # every gate made to say no
```

**The two servers.** `/tmp/gj-serve.py` is a threading `SimpleHTTPRequestHandler`
rooted at the worktree with `Cache-Control: no-store`.
`/tmp/serve-built.py` is the same but rooted at `server/`, serving `Index.html`
at `/` with the Apps Script scriptlets filled in (`<?= classCode ?>` → `demo`,
`<?= name ?>` → `Aoife Gartland`, and so on) so the BUILT tier can be walked
exactly like the preview. Recreating either takes two minutes; both are listed
here because they are the only pieces of the rig that do not live in the repo.

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

`node tools/qa/run.js` (the fast tier, 20+ gates) is **GREEN** at the last commit.

## WHAT IS LEFT, in the order to do it

1. **Three surfaces the pupil walk does not reach yet.** `sit-pupil` finishes
   cleanly (90s per book per width, zero console errors) and its own
   required-set check reports the gap honestly:
   `dock`, `self-eval` and `book-end` are declared in `GJ.app.surfaces` and the
   walk never records standing on them. The route needs three additions in
   `walkBook` (`tools/qa/sit-pupil.js`): record the dock's sub-kind alongside
   each question state, open the end-of-exercise self-evaluation card, and walk
   past the last exercise to the tally page. Until then `--full` is red, by its
   own design, and that is the correct verdict.
2. **`node tools/qa/control.js`** — every control FIRED, every over-tightening
   PASSED. The machinery works (proved on `qa-cache-scope`); the remaining
   plants in `tools/qa/fixtures/plants.js` need aiming at the current source.
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

1. The pre-commit hook was written in P0.a and **installed the moment `--fast`
   was first green**. Installing it earlier would have blocked the five-minute
   WIP checkpoints the standing law requires. `--no-verify` has not been used.
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
