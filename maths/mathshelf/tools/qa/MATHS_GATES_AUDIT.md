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
_(filled by the build; `qa-audit.js` requires every HARNESSED row to name a gate that exists and a CONTROLS id that exists in that gate's source.)_

## B. JUDGED — the rule is a judgement, and the judgement is machine-gated

| rule | where the judgement is filed |
|---|---|
| 18 one reading age | `MATHS_COLD_READ_VERDICTS_*.md`, gated by `qa-cold-read.js` |
| 9 feedback fits the kind | the per-item block, §5 of `COLD_READ_CHECKLIST.md` |

## C. THE COLD-READ CHECKLIST

The judge is handed `tools/qa/COLD_READ_CHECKLIST.md` and the transcript, and
nothing else. Author is never judge (DFM 270).

## D. STANDING ORDERS — no gate is possible; the order stands

| rule | order |
|---|---|
| 3 | content is verbatim MEP; no content edit without his word |
| 30 | an approved thing is reported on, never re-opened |

## E. HIS CALLS / SETTLED

| rule | the call |
|---|---|
| 15 | the name is MathShelf, spelled so |
| 17 | no class "level" field; the tickboxes are the mechanism |
| 2 | WALT stays |

## F. GAPS — each with an owner and a phase

| rule | gap | owner / phase |
|---|---|---|
_(none open at the close of the v4 build; a gap here blocks the DONE list.)_
