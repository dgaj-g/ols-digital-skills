# MathShelf v4 — build progress (Opus 5 MAX, 5 Sept 2026)

Resume point: this file + the last pushed commit. A fresh session re-runs the
FIRST ACTIONS of `MATHS_V4_OPUS_PROMPT_GATED.txt`, then
`node tools/qa/run.js` (fast), `node tools/qa/run.js --control` and
`node tools/qa/run.js --full`, and continues at the first red.

Preview server: `nohup python3 /tmp/gj-serve.py /tmp/gj-wt 8099 &` then
`http://localhost:8099/maths/mathshelf/index.html?class=demo&nointro`.
Staff passcode in the preview is `demo`; clear localStorage first so the demo
class re-seeds. Puppeteer is global: `NODE_PATH="$(npm root -g)"`.

## Baseline recorded at 45b03ed (the FLOORS — they may only rise)
| suite | count |
|---|---|
| mathcore selfTest | 73 |
| dev/test-anglecore.js | 72 |
| dev/lint-content-angles.js | PASS |
| dev/lint-content-algebra.js | PASS |
| dev/validate-all.js | 48 of 48 |
| dev/test-server-scoping.js | 20 |

All six still hold. `dev/validate-all.js` now builds its attempts from
`dev/model-attempts.js`, which is the SAME home the pupil walker drives the
browser from — the validator and the walker can no longer disagree about what a
correct attempt is.

## Ordering decisions (recorded)
1. The pre-commit hook was WRITTEN in P0.a and INSTALLED the moment `--fast`
   was first green. Installing it earlier would have blocked the five-minute WIP
   checkpoints the standing law requires; `--no-verify` has not been used.
2. `git mv maths/glass-jotter maths/mathshelf` happened as the first act of P1
   rather than after P0.d, because several P0 gates are RED BY DESIGN until the
   thing they guard exists (that is what harness-first means) and waiting for
   them would have deadlocked the rename that is part of their own fix.

## Where it stands
- [x] P0.a skeleton — run.js (three tiers, derived gate list, two matrices),
      lib/browser.js, lib/report.js (one failure-line shape), lib/decl.js (the
      KS3 DT parsers copied verbatim), lib/app.js, lib/hash.js, lib/mockenv.js
      (Apps Script, with the real 50,000-character cell cap), lib/domstub.js
      (enough browser to EXECUTE the offline stub under node), lib/audits.js,
      lib/walk-moves.js, lib/stage.js, lib/verbs.js, lib/strings.js,
      lib/timeconsts.js; contrast-audit / empty-elements / nested-interactive
      copied verbatim; state-audit and placed-work adapted.
- [x] P0.b qa-surfaces + qa-coverage (the machine of Part 3).
- [x] P0.c fixtures + `tools/qa/control.js` (the --control battery).
- [x] P0.d the node-only gates. **`node tools/qa/run.js` is GREEN: 20 gates.**
- [x] P1 rebrand — folder, name sweep, blackboard shell (shell.css), new cover
      and shelf, fonts vendored (Schibsted Grotesk + Spline Sans Mono in,
      Caveat + Courier Prime out), the DOM contract on every surface, the whole
      strings migration (`strings.js`, 0 outstanding literals).
- [x] P2 staff IA — class page, exercise view, question view, Set-up with
      series-grouped tickboxes and audience bands, Full grid demoted, Insights
      dissolved, the markbook re-gates on leave and after fifteen minutes idle.
- [x] P3 login — front door (execute-as-User) + relay + shared secret, the
      data-side secret guard, the companion retired, DEPLOY.md rewritten as an
      ordered two-deployment checklist, the outbox.
- [~] P4 the DONE list — walkers written and running; the control battery runs;
      the separated cold read is next.
- [ ] P5 deploy.

## FINDINGS — each with its control (harness first)

| # | what | control fired at | fixed |
|---|---|---|---|
| F1 | the server never checked a class's tickboxes on `save`/`load`: a book a class does not have was closed in the shelf and open on the wire | qa-two-homes at 45b03ed | `actTicked_` on both, and in the offline stub |
| F2 | `coerceActs_` was hardcoded to `{angles, algebra}`, so a third book could be ticked in the markbook and silently dropped — the Handling Data book could never have been switched on | qa-tickbox at 45b03ed | derived from `ACTS` |
| F3 | "Every line earns its mark." was live in `COMMENTS.perfect` — the banned tagline, on a pupil's screen | qa-language, must-fail exhibits | rewritten to "Every step is there." |
| F4 | the markbook's own posture line leaked the internal pencil/ink metaphor to a teacher | qa-voice | rewritten |
| F5 | `@keyframes step-land` animated `background` | qa-compositor | moved to an overlay whose opacity moves |
| F6 | the message voices (`.msg-validation`, `.sc-msg`, `.act-load-error`) wore AMBER — a marking colour with one meaning — while the stylesheet's own opening rule says UI errors never do | qa-colour-law, on the walkers | moved to `--support-rose` |
| F7 | the v3 cover's navy radial survived the re-skin and painted over the whole blackboard shell: correct in every token, NAVY in the pixels | the colour law, measured in rendered pixels | the dead v3 cover/shelf CSS deleted; screens paint no ground of their own |
| F8 | `SWAP_NOFLIP` was a misconception nobody could trigger, and `ALT_CORR_SWAP` was named in two words | qa-dx-coverage | one deleted, one rewritten |
| F9 | the protractor's centre mark was drawn in MARKING RED — the colour that means WRONG — so a pupil lining up her protractor was looking at the colour her mistakes are drawn in | qa-colour-law | the COLOUR moved to navy (the behaviour is untouched and qa-v3-shape proves it); the instruction no longer says "red" |
| F10 | a pupil's next save WIPED the teacher's inked verdict: she marks a question, the pupil types one more line, and the mark reverts with nothing on any screen saying so | qa-pencil-ink, under the mocked server | every stored `ovr` is merged forward on the one write path in `apiSave` |
| F11 | **the live site has never served this folder**: every vendored font the deployed page asked github.io for was answering 404, so MathShelf and the Glass Jotter before it have been rendering in whatever face the machine had | qa-build's live-asset probe, with its known-absent control | the five faces are carried IN the page as data: URIs, one block per file with merged weight ranges (+215KB, and one whole class of "it worked in the preview" gone) |
| F12 | the reason note ran 89px off the right edge of the paper at 375px — a pupil could not read the reason she had just chosen | sit-pupil @375 | it wraps on a phone |
| F13 | a disabled Check said nothing about what it was waiting for | sit-pupil, mute-locks | `data-locked-why` with three plain sentences |
| F14 | the gold box-draw and the gold star read as marks wearing the wrong colour | qa-colour-law | they declare themselves `data-celebrate` |
| F15 | the film's step dots stuck 2px out of the film at 375px | sit-pupil @375 | they wrap |


## Gates that invented a fault and were narrowed (L6 — each keeps its pass-control)
- qa-cache-scope read a variable NAME and condemned the legitimate whole-store key.
- qa-cache-scope again: it could not follow a key BUILDER, and condemned the outbox.
- the colour law condemned the wordmark, the focus ring and the primary button
  for being gold; narrowed to its intent — gold is a fault on a reading surface,
  on a mark, or as a value.
- the colour law condemned empty grid cells for an inherited `color` that paints
  no glyph.
- qa-build read only `moduleJs` and reported that qrcode.min.js was not inlined.
- qa-needs-you guessed a function signature and reported its own ignorance.
- qa-needs-you matched "25" inside the date "25 Jun 2026" and reported a double filing.
- the clock scanner read `15 * 60 * 1000` as three clocks.
- qa-audit refused a split filing that names its part (the design allows it).

## Still to do
1. Triage the walkers' findings (the pupil walk reports a diagram overflowing
   its card by ~43px at 375 — a real phone-width geometry fault).
2. `--control`: every control FIRED, every over-tightening PASSED.
3. The separated cold read: a fresh context handed ONLY
   `tools/qa/out/transcript/_teacher.md`, `_v4.md` and
   `tools/qa/COLD_READ_CHECKLIST.md`, filing
   `MATHS_COLD_READ_VERDICTS_TEACHER.md` and `MATHS_COLD_READ_VERDICTS_v4.md`.
4. `--full` green at one commit; push; deploy both deployments per
   `server/DEPLOY.md`; `MS_POST_DEPLOY=1` on qa-manifest and qa-repo-prod.
5. HANDOVER.md, PR #22, memory.
