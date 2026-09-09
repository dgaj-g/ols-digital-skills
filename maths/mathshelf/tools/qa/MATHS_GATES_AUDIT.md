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
| dev/validate-all.js | 81 | 45b03ed, 5 Sept 2026 |
| dev/test-server-scoping.js | 20 | 45b03ed, 5 Sept 2026 |
| dev/test-statcore.js | 156 | Handling Data C, 8 Sept 2026 (design floor 80; rises to 120+ with books A and B) |

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
| Handling Data C (Quartiles, curves and box plots) | PENDING HIS SMOKE | 8 Sept 2026 |
| Handling Data A / B | PENDING (not built) | — |

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

| 31 | qa-colour-law | amber-outside-a-mark |
| 32 | qa-tickbox | new-book-defaults-true |
| 33 | qa-language | must-fail-exhibits, must-pass-exemplars |

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

## CONTROLS NOT YET PROVED — named, not quietly dropped

Every gate below PASSES on the shipped tree and has other controls that fire.
What is not yet proved is that these particular controls can make them say no:
the planted fault is not reaching the page the gate reads, and the cause is in
the control plumbing rather than in the gate. Recorded here rather than
weakened, hidden, or marked green.

| gate | control | what is known |
|---|---|---|
| qa-numpad | free-text-box | the `fixture-renderers` plant demonstrably writes its script and its tag into a sandbox, and a hand-served sandbox shows the planted free-text box on the page; through `control.js` the same plant produces no console error and no box, so the fixture script is not executing in that run |
| qa-click-safety | single-press-lift | same plant, same symptom |
| qa-waits | control-with-no-busy-state, outbox-dropped-on-reload | not yet investigated |
| qa-fonts | face-removed | the plant removes a face file; with the gate now asking the face to LOAD rather than whether it was painted, the control needs re-aiming at that question |

### After the front-door fix — 9 Sept 2026, 22:07–22:52, at `15ceb30`

Whole battery, pooled: **88 controls FIRED** (one more than 8 Sept: the new
`front-door-touches-the-sheet`), **41 over-tightening checks PASSED** (sit-pupil's
now passes — the disabled-chip fix cleared it), **6 self-probes proved, 6 did not
fire**: the same five harness-plumbing controls as 8 Sept (extract-transcript
`no-walk-no-transcript`, qa-colour-law `amber-outside-a-mark` with no plant
written, qa-fonts `face-removed`, qa-waits ×2) and sit-confused's own
"the shipped tree must pass" check, red on one phone-width readability finding
of the dimmed-after-Check class already waived. None is a pupil-facing fault.

### After the Book C battery — 8 Sept 2026, 20:05–20:51, at `daca300`

Whole battery, pooled (`MS_WORKERS=6`): **87 controls FIRED, 40 over-tightening
checks PASSED, 6 self-probes proved, 7 did not fire.** Run in the background
AFTER the Book C deploy, as the TIME rule says; reported here, not waited for.
Evidence: `tools/qa/out/control/<gate>.<id>.log`. Five of the seven are controls whose plant no longer reaches its gate — the
next harness session's, not a book's. The other two are the walkers' own
"the shipped tree must pass" checks, red on phone-width readability findings of
the SAME THREE CLASSES as the rows waived on 8 Sept (an unchosen chip fading
after Check; a prompt measured in the moment it re-renders after a wrong
attempt; a small label on the paper), on other questions. The waiver covered
three cells; the next cut fixes the classes.

| gate | control | verdict | note |
|---|---|---|---|
| extract-transcript | no-walk-no-transcript | DID NOT FIRE | the gate passed a planted fault; new after Book C |
| qa-colour-law | amber-outside-a-mark | CANNOT RUN | no plant named fixture-css-amber; new after Book C |
| qa-fonts | face-removed | DID NOT FIRE | the gate passed a planted fault; known since v4 (see the table above) |
| qa-waits | control-with-no-busy-state | DID NOT FIRE | the gate passed a planted fault; known since v4 (see the table above) |
| qa-waits | outbox-dropped-on-reload | DID NOT FIRE | the gate passed a planted fault; known since v4 (see the table above) |
| sit-pupil | over-tightening | RED | the shipped tree fails its own walk in the sandbox, on ONE phone-width readability finding: a class-interval label "30 < x ≤ 40" on Book C q13 after Check at 3.09:1 — the same class as the waived rows (a small label on the paper, measured at 375) |
| sit-confused | over-tightening | RED | two phone-width readability findings of the classes already waived: an Algebra prompt straight after a wrong attempt at 2.18:1 (q3), and an unchosen judge chip "Stay the same" after Check at 2.18:1 (Book C q8) |

## THE THREE LAWS ADDED ON 6 SEPTEMBER 2026, AND WHY THEY WERE MISSING

He opened the deployed markbook and could not read it: white class names on a
white table, a chip sitting on top of a book's series line, and a shell so dark
he asked why, and a question that told him the same thing twice in two wordings.
Twenty-six gates were green. The reason is written up as F35-F39 in
`PROGRESS.md`, and it is worth stating plainly here because it is a lesson about
gates rather than about CSS:

**1. READABILITY — "can she read it?", measured in rendered pixels.**
`lib/contrast-audit.js` had been in this repo since 28 August, ported from the
KS3 DT platform, written for exactly this fault. `lib/audits.js` offered it as a
call the caller "decides how often it is worth" making. No caller ever decided;
three walkers listed `readability` among their cells and none of them invoked
it. It also could not have worked if they had: its root was the FIRST
`[data-surface]` in the document, which is the hidden cover, so it collected
nothing — and returned PASS for nothing. It now runs from `run()` on every
recorded state, refuses to call an empty measurement a pass, and asks a second
way (computed colour composited through ancestors) wherever the pixel sampler
cannot separate glyph from plate. Control: `invisible-class-names` plants his own
fault back into `.ledger` and the teacher walk has to see it.

**2. OVERLAP — no two pieces of text may sit on one another.**
There was no rule of any kind for this. The geometry audit asks whether a thing
stays inside its card; nothing asked whether it lands on its neighbour. Control:
`text-under-a-floating-chip` puts the band back in the corner it used to float
in.

**3. SAID-TWICE — the screen must not tell her the same thing twice.**
Twenty-eight gates read the strings table; `qa-strings-ledger` proves every
string is used and `qa-language` proves each one is rule-138 plain. Not one of
them read the SCREEN, so two different strings saying one thing, painted at the
same moment in two places, was invisible to all of them. The law walks every
instruction line on every recorded state. It invented four faults before it was
honest (F39a) and each narrowing is now a rule: instruction lines only, inside
one question or one book only, nothing under 25 characters or 5 words, and a
pair must be identical or exactly one token apart. Control:
`told-twice-in-two-wordings` puts his own repeated line back into the
substitution board and the pupil walk has to see it.

All three are in the coverage RIDERS, so every walked state must produce a
verdict for them or the matrix says so.

**And a verdict is not evidence — a count is.** The readability audit reported
PASS on every state of every walk while measuring nothing at all, and PASS is
what a green matrix is made of. Both laws that can measure nothing now carry the
number of things they looked at out with the verdict, the walk adds those up,
and it fails if the total is zero: `readability x awake` on the teacher walk,
`readability x awake` and `said-twice x awake` on the pupil walk. A screen with
no instruction on it still passes said-twice honestly; a whole walk that never
found one means the law is asleep, and that is the only shape of failure F35a
could ever have shown.

**A LAW MEASURED IN PIXELS MUST BE MADE TO PROVE ITS OWN PIXELS.** The contrast
law was believed for a day and a half and it was wrong in five separate ways, all
of which made blank paper look like a fault at about 1.1:1 and, worse, could
have hidden a real one just as easily. The picture was the viewport while the
boxes were in document coordinates; the scroll offset was read a tick after the
boxes; a row scrolled off the frame was clamped to its top-left corner; the
plate was never checked against the element's own ground; and - the one that
mattered - it measured the EDGES of letters rather than their cores, because it
took the cluster nearest the declared colour and antialiasing only ever pulls
glyph pixels towards the paper (F42, F42a).

Two rules came out of it and they are worth more than the fixes:

1. **Photograph what you condemn.** Every walker now saves the screen beside the
   finding (`tools/qa/out/shots/`), and every contrast finding names its element
   and its box. Three false findings were settled by looking at the picture in
   under a minute each, after an hour of arguing with a number that named
   nothing. `MS_DEBUG_FINDINGS=1` prints the raw row a finding was made of.
2. **Prove the law still bites AFTER you narrow it, not only before.** Every
   narrowing here was followed by planting white-on-white in the markbook again.
   A law loosened until it stops complaining is worse than no law, and there is
   no way to tell the two apart except by making it say no on demand.

**A width you did not walk is a width you did not test.** The three laws were
proved at 1280 and called done. The shipped tree's own `over-tightening`
control - which walks 375, 768 and 1280 - then failed on the shelf: the book
series line was 3.49:1 on a tablet and 4.39:1 on a phone while reading clean on
a laptop (F40). Run `node tools/qa/run.js --full` before saying a visual law is
green, or say which widths you actually walked.

**And a control that fails for the wrong reason is worse than no control.**
Three of them read DID NOT FIRE while every law they guard was working: the
sandbox carried a hardcoded list of repo-root files, `index.html` had grown one
more, and every browser control was walking a page that 404'd on the crest
(F41). The failure looked like a broken gate, so the real answer never arrived.
Read the evidence in `tools/qa/out/control/` before believing a DID NOT FIRE.

The common lesson, and the reason all three were missing: **every gate here read
a PART — a file, a string, a rule, an element. None of them read the finished
screen the way she meets it.** Readability, overlap and said-twice are the first
three laws on this platform that measure the composition rather than its
ingredients. Any future fault he finds by looking at the live site should be
checked against that sentence first.

## F. GAPS — each with an owner and a phase

| rule | gap | owner / phase |
|---|---|---|
_(none open at the close of the v4 build; a gap here blocks the DONE list.)_
