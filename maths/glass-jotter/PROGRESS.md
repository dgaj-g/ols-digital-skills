# MathShelf v4 — build progress (Opus 5 MAX, 5 Sept 2026)

Resume point: this file + the last pushed WIP commit. A fresh session re-runs the
FIRST ACTIONS of `MATHS_V4_OPUS_PROMPT_GATED.txt`, then `node tools/qa/run.js --fast`
and `--control`, and continues at the first red.

## Baseline recorded at 45b03ed (the FLOORS — they may only rise)
| suite | count |
|---|---|
| mathcore selfTest | 73 |
| dev/test-anglecore.js | 72 |
| dev/lint-content-angles.js | PASS (6 sections, 24 questions, 44 movie steps, 54 marks) |
| dev/lint-content-algebra.js | PASS (24 questions) |
| dev/validate-all.js | 48 of 48 |
| dev/test-server-scoping.js | 20 |

## Ordering decision (recorded, 5 Sept)
The pre-commit hook is WRITTEN in P0.a and INSTALLED the moment `--fast` is first
green. Installing it before that would block the five-minute WIP checkpoints the
standing law requires, and `--no-verify` is not used. Every commit from the
install onward runs `--fast`.

## Controls fired (harness first — the gate is seen RED on the pre-fix state)
| gate.control | fired at | log |
|---|---|---|
| qa-surfaces.root-without-attribute | 45b03ed (the whole tree is the pre-fix state: no DOM contract existed) | out/qa-surfaces.log |

## Phase log
- [x] P0.a skeleton: run.js (tiers, derived gate list, two matrices), lib/browser.js
      (puppeteer proven: launch + screenshot), lib/report.js (the one failure-line
      shape), lib/decl.js (the KS3 DT parsers, copied verbatim so a comment cannot
      fool the coverage gate), lib/app.js (paths + the derived content grid:
      48 questions, 8 kinds, 12 movies, 2 books), lib/state-audit.js (adapted),
      lib/placed-work.js (adapted to [data-placed] + the two-press),
      lib/contrast-audit.js + empty-elements.js + nested-interactive.js (verbatim).
- [ ] P0.b qa-surfaces (written, RED against 45b03ed as designed) + qa-coverage
- [ ] P0.c fixtures
- [ ] P0.d the node-only gates
- [ ] P1 rebrand · P2 staff IA · P3 login · P4 the DONE list · P5 deploy
