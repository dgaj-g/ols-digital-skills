# The Glass Jotter — UX & Flow Audit (teacher-first)

**Date:** 22 Jun 2026. **Scope:** the live v9 app — teacher markbook + pupil flow.
**Verdict:** strong bones, real promise, **not yet fit for purpose** — for one root reason, below.

---

## 1. The core diagnosis — why it feels "not right"

The app is built in **examiner voice**. It silently assumes you already know how CCEA
marking works — method vs accuracy marks, what AMBER means, why a human would override an
automated mark, what a "line" of working is. Every individual feature is sound; the problem
is the *whole* never translates itself. Two layers:

**Layer 1 — vocabulary with no translation.** Examiner shorthand appears raw at the points
that matter most: `M 1/2 · A 0/1`, `AMBER` (`◐`), "Trips at line 2", "Ex1.Q1", "the mark
scheme wants it", "WALT". None is defined on screen for a teacher (or pupil) who hasn't
marked a CCEA paper.

**Layer 2 — it doesn't explain itself / no clear narrative.**
- **No always-visible key.** Every glyph meaning on the Working Wall (`✓ ◐ ✗ ● —`) lives in
  a hover `title` tooltip — *invisible on a touch smartboard*, which is exactly where a wall
  gets used.
- **Inconsistent naming.** The same idea is glossed in one place and raw in another:
  Insights says "method (working)" / "accuracy (answers)" and the CSV says "Method marks",
  but the per-question tally — the thing you read most — just says `M`/`A`. So it reads as
  incoherent rather than wrong.
- **No "why" and no on-ramp.** The override offers "Mark it right / wrong / Back to the
  app's marking" but never says *when* you'd flip a mark. The teacher lands on a dense wall
  with five tools and no "here's the job, start here."
- **Silent actions.** Writing a step to the jotter, sending a nudge, saving a self-eval —
  all happen with no confirmation, so the user isn't sure anything happened.

**Net:** it works, but it behaves like a tool built *for the examiner who wrote it*, not for
a teacher picking it up cold. Fixing that is mostly a **translation + coherence pass**, not a
rebuild.

---

## 2. The teacher's job, in plain English (what the flow is *meant* to be)

1. **Get in** — type the department passcode → "Open the Markbook".
2. **Pick a class** — your classes list; tick which "books" (activities) each class can see;
   share the class link/QR.
3. **Watch the Working Wall** — a live grid of every pupil × every question, colour-coded.
   Spot the reds.
4. **Open a pupil (Jotter Page)** — read their actual working, see the marks, and **override**
   if the auto-mark got it wrong; **nudge** a struggling pupil to the worked example.
5. **Zoom out (Class Insights / Marking Pile / Sweep)** — where's the class stuck, what's the
   common slip, who needs support vs stretch; **Copy CSV** for records.

That's a sound flow. The audit below is about making each step *legible* so a teacher follows
it without a manual.

---

## 3. The biggest single fix: ONE plain-English vocabulary, used everywhere

Adopt this glossary and apply it at **every** point of use (tally, wall, insights, CSV, pupil
feedback). This one change does more for "fitness for purpose" than anything else.

| Examiner term (now) | Plain term (proposed) | Appears at |
|---|---|---|
| `M n/max` (method marks) | **Working: n/max** | tally `jotter.js:788`, `staff.js:931` |
| `A n/max` (accuracy marks) | **Answer: n/max** | same |
| `AMBER` / `◐` | **Answer only — no working** | wall `staff.js:800`, CSV, jotter |
| "line 2" / "Trips at line" | **step 2** / **First slip: step 2** | `staff.js:502`, `931` |
| `Ex1.Q1` | **Ex 1 · Q1** (+ legend "Exercise 1, Question 1") | wall headers `staff.js:789` |
| CSV `Status: ok/amber/err/open` | **Correct / Answer only / Wrong / In progress** | `staff.js:1135` |
| `WALT ·` (pupil) | **In this exercise:** | `script.js:859` |
| "the mark scheme wants it" (pupil) | **it earns a separate mark** | `jotter.js:693` |
| "method marks stay on the table" | **without working you can't earn the working marks** | `jotter.js:794` |

---

## 4. Make it self-explaining (two quick, high-impact adds)

**(a) An always-visible Wall legend** (not a tooltip) — one static line above/below the grid:
> `✓ correct · ◐ answer only · ✗ wrong (small number = the step it broke at) · ● working now · — not started`

**(b) The override gets a one-line "why" + clearer buttons.** This is your specific complaint.
- Rename **"Back to the app's marking"** → **"Use the automatic mark"** (it just clears your override). `staff.js:948`
- Add a one-liner above the override row:
  > *The app marks the working automatically. If its verdict looks wrong — e.g. a pupil used a
  > valid method it didn't recognise — set your own mark here. Your judgement shows on the Wall
  > straight away.*
- Note in the confirm message that "right" gives full working **and** answer marks. `staff.js:944`

---

## 5. Findings — TEACHER side (ranked, with locations for the build)

1. **`M`/`A` tally is bare jargon at the point of use** — `staff.js:931` (+ pupil `jotter.js:788`). → "Working / Answer". *(Highest impact.)*
2. **Override: opaque "Back to the app's marking" + no "why"** — `staff.js:948`. → §4(b).
3. **No legend on the Working Wall; meanings hidden in hover tooltips (dead on touch boards)** — `staff.js:786–832`. → §4(a).
4. **AMBER invisible/unexplained:** raw `amber` in CSV, no inline label on the Jotter Page, `◐` with no key — `staff.js:800,931,1135`. → "Answer only — no working" everywhere.
5. **`Ex1.Q1` and "Trips at line N" undefined** — `staff.js:789,502`. → "Ex 1 · Q1" + "step N" + legend.
6. **`support / stretch` summary tile shows a bare `2 / 1`** — ambiguous which is which — `staff.js:469`. → split into two labelled tiles.
7. **Nudge wording/granularity** — "Nudge: watch the method ▸" is informal, and it acts at *section* level though shown per *question* — `staff.js:957`. → "Send the worked example for Ex N →" + a one-line tooltip.
8. **CSV `Status` raw codes; `Self-confidence n/3` and `Time (s)` unexplained** — `staff.js:1135,1139`. → human-readable status + a scale note.
9. **Marking Pile silently excludes AMBER** — if every struggler is "answer-only", the Pile says "empty", reading as "no problems" — `staff.js:1007`. → say so in the empty state; "Open the pile" button on the Sweep should read "Show all working".
10. **No teacher on-ramp** — lands on a dense wall + 5 tools with no "start here". → a one-line orientation on the wall ("Spot the reds → tap a cell to open that pupil's jotter").

---

## 6. Findings — PUPIL side (ranked)

1. **`M · A` tally is invisible jargon to pupils too** — `jotter.js:788`. → "Working / Answer".
2. **Step-size placeholder leaks the method: `e.g. 180−38`** — `jotter.js:656`. → `e.g. 65` (neutral).
3. **No confirmation when a step is written to the jotter** — `jotter.js:685–706`. → flash "✓ step added" + highlight the new line.
4. **Correct/score text shows in RED** (the tick glyph is green, but the score `1/1` + comment use `--marking-red`) — `style.css` `.mk-tally`/`.mk-comment`. → green for correct, red only for wrong.
5. **"What are you doing to both sides?" shown for simplify/expand (no sides)** — `jotter.js:525`. → conditional on solve/form only.
6. **Teacher nudge opens support silently — no "your teacher suggested this"** — `script.js:909–913`. → render the one-line message.
7. **"you measured N°" suffix on a *correct* protractor answer adds noise** — `jotter.js:407`. → show only when wrong.
8. **"WALT", "mark scheme" — examiner/teacher register** — `script.js:859`, `jotter.js:693`. → §3.
9. **Locked book gives sighted pupils no visible "not set yet"** — `script.js:710`. → visible padlock + label.
10. **"method marks stay on the table" — opaque idiom** — `jotter.js:794`. → plain rewrite.

---

## 7. The concrete bugs already diagnosed (earlier in the session)

- **Protractor reads ~120 for a true 115** — the reading aid rounds the crossing to the
  nearest 10 (`jotter.js:340`, `Math.round(dd/10)*10`), so 115 lights "120". Fix: light both
  flanking tens (110 **and** 120) with the gold tick on the true 115. *(Geometry itself is
  accurate.)*
- **`[1 mark]` tiny** (`.q-marks` 12px → ~15px). **Faded text** (darken `--ink`/`--pencil`,
  body weight 450–500). **Feedback hugs the Check button** (add `.jq-feedback` margin-top).
- **PVQ has no P/Q labels** — points named `_P`/`_Q`; the `_` hides them — `content-angles.js`
  `q5()`. → rename to `P`/`Q`.

---

## 8. Recommended plan

Make it **fit for purpose** in three phases — the first delivers ~80% of the felt improvement:

**Phase 1 — Translation + key (the "make it legible" pass).** §3 vocabulary everywhere,
§4 wall legend + override "why"/rename, CSV/status humanised. Mostly find-and-replace of copy
+ a couple of small adds. Highest value, lowest risk.

**Phase 2 — The concrete bugs (§7).** Protractor reading aid, red-on-correct, spacing,
`[1 mark]`, faded text, P/Q labels, the placeholder leak, the missing confirmations (jotter
step, nudge message, self-eval save signal).

**Phase 3 — On-ramp & polish.** Teacher orientation line, split support/stretch tile, nudge
wording, AMBER-in-Pile empty state, locked-book affordance, the non-equation prompt.

All client-side (`staff.js`, `script.js`, `jotter.js`, `content-angles.js`, `style.css`) →
rebuild `Index.html` → verify in the offline preview → **redeploy Index only** (no Code.gs,
no companion, no manifest).

**Tier:** Opus 4.8 at normal effort; route any read-heavy sweeps to sonnet. No ultracode/Fable.
