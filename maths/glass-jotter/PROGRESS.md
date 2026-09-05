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
| qa-human-pace.unrecorded-clock | 45b03ed (28 clocks, no inventory) — fixed by writing MATHS_HUMAN_PACE_INVENTORY.md | out/qa-human-pace.log |
| qa-cache-scope.key-without-class | 45b03ed — and it OVER-TIGHTENED (it condemned the legitimate whole-store key by its variable NAME). Narrowed to resolve the constant first; the whole-store key is now a printed exemption. | out/qa-cache-scope.log |
| qa-coverage.control-declaration | 45b03ed (no gate declared KINDS; 48 truth cells had nothing to close them) — fixed by adding KINDS to both lints and validate-all | out/qa-coverage.log |
| qa-two-homes.addclass-field-parity | shipped tree passes; the pinned `95cc8ec^` control is run by `--control` | out/qa-two-homes.log |

## Phase log
- [x] P0.a skeleton: run.js (tiers, derived gate list, two matrices), lib/browser.js
      (puppeteer proven: launch + screenshot), lib/report.js (the one failure-line
      shape), lib/decl.js (the KS3 DT parsers, copied verbatim so a comment cannot
      fool the coverage gate), lib/app.js (paths + the derived content grid:
      48 questions, 8 kinds, 12 movies, 2 books), lib/state-audit.js (adapted),
      lib/placed-work.js (adapted to [data-placed] + the two-press),
      lib/contrast-audit.js + empty-elements.js + nested-interactive.js (verbatim).
- [x] P0.b qa-surfaces (written; RED against 45b03ed as designed — the DOM contract lands with P1)
      + qa-coverage (the machine of Part 3: 416 cells derived; truth 48/48 and
      human-pace 28/28 closed; the rest wait on the walkers and the deploy gates)
- [ ] P0.d gates written so far: qa-selftests, qa-content-source, qa-period-budget,
      qa-human-pace, qa-cache-scope, qa-two-homes
- [ ] P0.c fixtures
- [ ] P0.d the node-only gates
- [ ] P1 rebrand · P2 staff IA · P3 login · P4 the DONE list · P5 deploy


## FINDINGS (each with its control, harness first)

### F1 — the server does not enforce the tickbox gate on save/load  (found by qa-two-homes, 5 Sept)
`apiSave` and `apiLoad` check that the class exists and the act name is valid, but
NOT that the class has that book ticked. The pupil UI never offers an unticked
book, so nothing reachable by accident — but the platform's own law (gates design
G-F3, and the `hello` law "a pupil NEVER receives a disabled activity's content
gate as openable") is not enforced where it has to be, on the server.
- control fired: qa-two-homes.tickbox-not-enforced at 45b03ed (out/qa-two-homes.log)
- fix: lands with P3's data-side guard, which is the same request path.

### F2 — the relay and the shared secret do not exist yet  (by design, P3)
- control fired: qa-two-homes.relay at 45b03ed.

### F3 — qa-cache-scope invented a fault on its first run (L6)
It read the variable NAME at the call site and condemned `LSKEY`, which is the
single whole-store key and is class-qualified inside its own object. Narrowed:
the constant is resolved to its literal first, and the whole-store key is a
printed exemption. The shipped tree is its permanent pass-control.
