# MATHSHELF — THE GATES AUDIT

The record the gates read, and the record `qa-audit.js` reads back. Every
numbered rule of `MATHS_FEEDBACK_MASTER.md` appears in exactly ONE status
section below (A–F). A rule with no home is a rule with no enforcement.

---

## THE FLOORS — these numbers may only rise (read by `qa-selftests.js`)

| suite | floor | recorded |
|---|---|---|
| mathcore.selfTest | 73 | 45b03ed, 5 Sept 2026 |
| dev/test-anglecore.js | 72 | 45b03ed, 5 Sept 2026 |
| dev/validate-all.js | 48 | 45b03ed, 5 Sept 2026 |
| dev/test-server-scoping.js | 20 | 45b03ed, 5 Sept 2026 |
| dev/test-statcore.js | 80 | not yet built (Handling Data C) |

## PINNED REFS — the pre-fix states the controls are served from

| ref | what it is | used by |
|---|---|---|
| `45b03ed` | v3 live as MAIN Version 25; the behaviour reference | qa-v3-shape, qa-drag-smooth |
| `95cc8ec^` | before the addClass field-name parity fix (the live "bad-name") | qa-two-homes |
| `8b12079^` | before the CF-01 answer-leak fix | qa-consequence |
| `792870c^` | before "Want to see how?" was gated behind two wrong attempts | qa-consequence, qa-support-gate |
| `7ada10f^` | before the four 25-Jun live-feedback fixes (nudge target, self-eval chips) | qa-support-gate, qa-self-eval |
| `2ed1ae7^` | before the red-on-correct fix | qa-colour-law |
| `6242823^` | before the plain-English translation (the examiner jargon) | qa-language |
| `bbeffa3^` | before per-teacher scoping | qa-staff-authority |
| `9a585aa^` | before `@layer reset` — the unlayered `body.gj p{margin:0}` trap. DERIVED: `git log -S'@layer reset' --format=%h -1 -- style.css` | qa-geometry (m) |
| `9a585aa^` | before the flick prefetch cache invalidation. DERIVED: `git log -S'delete view.jotterCache'` | qa-pencil-ink |

## WHAT THE CONTROL BATTERY CHANGED (5 September, second pass)

Running `control.js` end to end is what turned the gate system from a set of
gates into a set of gates that have each been made to say no. Nine faults were
in the harness itself, and each of them meant a rule that could not have failed:

| what was wrong | what it meant |
|---|---|
| the coverage matrix read its surface registry from a sidecar another gate writes | run alone, the whole surface half of the matrix vanished and the totals still printed GREEN |
| the fresh-build comparison copied the app folder flat | the assembler could never find its two repo-root inputs, so the strongest pre-deploy question had never once been asked |
| the model-attempt table was keyed by question id alone | eighteen ids are shared between the two books, so algebra questions were answered with an angles pupil's working |
| the walkers wrote down the state they meant to reach | a drive that silently did nothing still filed a row saying she had stood there |
| five of seven question kinds never stamped `data-state` | every gate reading the DOM contract on a question read "fresh" for a question that had just been marked |
| the object-entry scanner split on every comma | twenty of the app's own sentences never parsed, so qa-language had never read one with a comma in it |
| qa-needs-you read `c.q` and `c.reason` | fields no chip has ever carried: the check could not fail |
| qa-earned-stays compared two values both empty | which is exactly what the fault it guards against looks like |
| the pre-commit hook was installed in `$GIT_DIR/hooks` of a linked worktree | git reads the shared hooks directory, so the hook had never run |

Every control's evidence is written to `tools/qa/out/control/<gate>.<id>.log` on
each run, and the CONTROL MATRIX prints whatever the verdict.

## APPROVALS — a book is UNDER REVIEW unless this table says otherwise

| thing | status | date |
|---|---|---|
| Angles (content + v3 renderers) | APPROVED — live as MAIN Version 25 | 28 Jun 2026 |
| Algebra (content + v3 renderers) | APPROVED — live as MAIN Version 25 | 28 Jun 2026 |
| v4 MathShelf (the shell, the markbook, the login) | PENDING | — |
| Handling Data A / B / C | PENDING (not built) | — |

---

## A. HARNESSED — the rule has a gate, and the gate has a control

| rule | gate | controls |
|---|---|---|
| 1 | qa-language | must-fail-exhibits, must-pass-exemplars |
| 4 | qa-colour-law | marking-colour-as-decoration, dark-work-surface |
| 5 | qa-selftests | mutated-engine |
| 6 | qa-numpad | free-text-box |
| 7 | qa-numpad | sticky-dock |
| 8 | sit-confused | always-on-help-strip |
| 9 (the wording of the feedback) | qa-language | must-fail-exhibits |
| 10 | qa-two-homes | addclass-field-parity |
| 11 | sit-pupil | unreachable-planted-fault |
| 12 | qa-self-eval | fallback-on-a-section-with-its-own |
| 13 | qa-earned-stays | setacts-deletes-rows |
| 14 | qa-two-homes | data-without-secret-guard |
| 15 | qa-voice | dead-name, split-literal-in-built-artefact |
| 16 | qa-compositor | banned-pair, expensive-keyframe |
| 17 | qa-tickbox | setacts-wipes-rows, new-book-defaults-true |
| 18 (sentence difficulty, mechanically) | qa-language | must-fail-exhibits |
| 19 | qa-language | bare-gesture |
| 20 | qa-click-safety | single-press-lift |
| 21 | qa-two-attempts | third-attempt |
| 22 | qa-waits | control-with-no-busy-state, outbox-dropped-on-reload |
| 23 | qa-strings-ledger | literal-on-a-render-path |
| 24 | qa-surfaces | root-without-attribute, registered-never-rendered, state-nothing-writes |
| 25 | qa-manifest | front-door-cut-as-me, missing-proof-row |
| 27 | qa-content-source | question-without-src |
| 28 | qa-period-budget | over-budget-book |
| 29 | qa-language | must-pass-exemplars |
| 30 (the locked renderers' marking) | qa-v3-shape | a-mark-moved |

## B. JUDGED — the rule is a judgement, and the judgement is machine-gated

| rule | where the judgement is filed |
|---|---|
| 3 | the content audit of 25 Jun 2026; `qa-text-damage` pins every string against `45b03ed` |
| 18 (the reading itself) | `MATHS_COLD_READ_VERDICTS_*.md`, gated by `qa-cold-read.js` |
| 9 (does the feedback fit what she did) | the per-item block, section 5 of `COLD_READ_CHECKLIST.md` |

## C. THE COLD-READ CHECKLIST

The judge is handed `tools/qa/COLD_READ_CHECKLIST.md` and the transcript, and
nothing else. Author is never judge (DFM 270). Rule 30 lives here too: an
approved book is reported on, never re-opened.

## D. STANDING ORDERS — no gate is possible; the order stands

| rule | order |
|---|---|
| 2 | WALT stays; it is the department's own heading and pupils know it |
| 26 | the live smoke list is his eyes, after any server change, recorded in `server/DEPLOY_LOG.md` |
| 30 (an approved thing is reported on) | an approved thing is reported on, never re-opened |

## E. HIS CALLS / SETTLED

_His calls are recorded in `MATHS_FEEDBACK_MASTER.md` with their dates and his
own words. A call that is also HELD BY A GATE is filed under A, and a call that
is a standing order is filed under D — a rule filed twice is a rule two people
think somebody else is holding. Nothing is filed here that is filed there._

| rule | the call |
|---|---|
_(none: every settled call this platform has is either harnessed or a standing order.)_

## F. GAPS — each with an owner and a phase

| rule | gap | owner / phase |
|---|---|---|
_(none open at the close of the v4 build; a gap here blocks the DONE list.)_
