# The Glass Jotter — Insights, Self-Evaluation & Stretch/Support — DESIGN

Status: **DESIGN for sign-off** (19 Jun 2026). Grounded in a full read of the
existing data model, marking engine, markbook and content (see "Grounding facts").
Nothing here is built yet. Build is phased and checkpointed (see §8).

Author intent (Damien): make the markbook *truly meaningful* — class- and pupil-level
patterns of what's consistently got wrong, flag pupils of concern (and unlock
support) and pupils excelling (and unlock stretch), and capture pupil
self-evaluation after each exercise in a measurable, actionable way that surfaces
both strugglers and the gifted/talented. **The working must count as much as the
answer** (it already does — see below). **Do not stray from Mary's source content.**

---

## 0. Grounding facts (what already exists — so we build on fact)

- **The working IS the record.** The marker (`mathcore.checkQuestion`, `anglecore.checkSteps`)
  derives the answer from the working chain; there is no separately-scored "answer".
  Marks are `[method, accuracy]` per question. → "working = answer" is already true.
- **Per-question state** (`state.qs[qid]`): an `att[]` array (max 2 attempts), each attempt holds
  the full working (`L:[{op,t,s}]` algebra / `steps:[{ang,val,calc,rsn,s}]` angles), `res`
  (`OK`/`X@n`/`AMBER`), and `dur` (seconds). Plus `lock`, `mk`, `ovr` (teacher override).
- **Per-question summary** (the cheap rollup the Working Wall polls every 20 s, ≤8 000 chars):
  `{st, errAt, dx, mk, t}` — status (ok/amber/err/open/un), **first-error line index**,
  **misconception code**, marks, total time. Already enough for a lot of class analytics
  *without* the heavy full-state fetch.
- **Misconception taxonomy** already exists and is named (`DX_NAMES`, 16 codes): algebra
  (EXPAND_PARTIAL, EXPAND_SIGN, SIGN_FLIP_MOVE, DIV_BEFORE_SUB, COLLECT_X_NUM, …), angles
  (ALT_CORR_SWAP, COINT_EQUAL, TRI_SUM_360, STRAIGHT_360, VOP_SUPP), protractor (WRONG_SCALE).
- **Attempts-to-correct** = derivable from `att.length` + each `att[i].res` (1st-try OK / 2nd-try OK / never).
- **AMBER = answer-without-working** is a first-class outcome — lets us reward/penalise showing working.
- **Markbook today**: Working Wall (cell glyphs + per-column totals + dominant-dx chip, 20 s poll),
  Jotter Page (full per-pupil replay + tick↔cross override), Marking Pile (dx clusters ranked +
  anonymised "next-lesson starter"), Same-Question Sweep, Copy CSV. `fullStates()` is the heavy
  path (sequentially fetches every pupil's full state) used by Pile/Sweep.
- **Content**: Angles 6 sections/18 Q, Algebra 6 sections/24 Q. Difficulty is **latent** in
  `marks[0]` (1→2→3) and section order — there is **no** explicit difficulty/stretch/extension tag,
  and **no source documents in the repo** (Mary's WALTs + MEP textbook chapters were used during the
  build; brackets-both-sides + past-paper-style Qs were *authored* and flagged for Mary to spot-check).
- **No per-section "exercise complete" moment exists yet** — the natural hook is the `onSave`
  closure in `script.js renderSection` (detect `sectionTicks(sec) === sec.questions.length`).

---

## 1. Design principles

1. **Surface, don't re-capture.** Most metrics come from data already saved. New *capture* is small:
   (a) pupil self-evaluation, (b) one extra scalar in the summary cell (attempts), (c) optionally a
   persisted per-line error map (Phase 2; else recompute via `fullStates`).
2. **Two cost tiers.** Cheap class analytics run off the Summary the wall already polls. Deep
   per-line/per-step analytics run on demand via the existing `fullStates()` path (same as the Pile).
3. **Working is weighted as much as the answer.** Every flag and stat splits **method** vs **accuracy**
   marks; "excelling" *requires shown working* (not AMBER); "concern" can flag answer-only (AMBER) pupils.
4. **Content-safe.** Analytics/flags/self-eval add **no** maths content. Support reuses the **existing**
   method movies/hints. Stretch uses **existing** items (or a Mary-authored slot) — never auto-authored.
5. **Measurable & actionable.** Self-eval is structured (ratings + WALT-linked skill tags), so it
   aggregates to class %s and per-pupil trends — not just free text.
6. **Extensible.** Self-eval skill chips and any stretch slot live in the content pack, so every future
   "book" on the shelf inherits the same machinery (manifest-driven, per `ADDING_A_TOPIC.md`).

---

## 2. Pupil self-evaluation (new capture)

**When:** at the moment a section's last question locks (hook in `renderSection`'s `onSave`, when
`sectionTicks(sec) === sec.questions.length`), and also reachable from the end-of-activity tally. A
gentle card slides in: *"You've finished [section]. How did that go?"* — skippable, never blocking.

**What (low-friction, ~10 seconds), all measurable:**
- **Confidence**: one tap, 3-point traffic light (1 "still unsure" · 2 "getting there" · 3 "confident").
- **Skill self-rating**: 2–3 **"I can…"** statements *per section, restated from the existing WALT*
  (content-safe rephrasing of Mary's learning outcomes), each tapped 🟢/🟡/🔴. E.g. parallel-lines
  section → "I can spot Z (alternate) angles", "…F (corresponding)", "…U (interior, add to 180°)".
  These live in the content pack as `sec.cans:[{id,text}]` (Mary can adjust wording).
- **Optional one-liner**: "Anything that tripped you up?" (free text, ≤140 chars).

**Stored** (round-trips through existing save plumbing — no transport change):
```
state.evals[sectionId]   = { conf:1|2|3, skills:{ canId: 1|2|3 }, note?:string, ts:epochSec }
summary.evals[sectionId] = { conf, skills, ts }   // small; copied in summarise() so the wall sees it
```
(Keyed by the section's stable string `id` — e.g. `s1` — NOT a numeric index, so reordering sections never re-buckets evals.)
Byte cost is tens of chars — negligible against the 8 000-char summary cap.

**Why it's powerful:** the self-rating is keyed to WALT skills, so it aggregates ("62% of 10A flagged
U-angles 🔴") and — crucially — can be set against the *auto-mark* to surface **confidence↔performance
mismatch**: over-confident (thinks fine, marks low → intervene) and under-confident (doing well, anxious
→ reassure/stretch; a classic hidden-gifted signal).

---

## 3. Teacher analytics (new surfaces, reusing the markbook)

### 3a. Class Insights panel  *(new 4th tool button in the Working Wall tools row)*
Runs entirely off the **cheap wall summary** (no full-state fetch), so it's instant and pollable:

- **Class band**: % complete · avg **method** & **accuracy** marks (split, to honour working) ·
  avg confidence · #needs-support · #ready-for-stretch.
- **Hardest questions / where the working breaks** (the core "patterns" ask, class level): per question —
  how many wrong, the **dominant misconception** (`dx`), the **working line that trips most pupils**
  (histogram of `errAt` across the class → "most pupils first slip at line 2: dividing before
  subtracting"), and the **attempts-to-correct mix** (got-it-1st / on-retry / not-yet). Ranked worst-first.
- **Flag board**: two lists — **Needs support** and **Ready for stretch** — each pupil with the *reason*
  (e.g. "4 wrong · 2 retries · slow on s4 · low confidence" / "all first-try · full method marks ·
  confident"). Tap a name → Jotter Page.
- **Confidence vs performance**: the over/under-confident pupils called out explicitly.

### 3b. Per-pupil (extend the existing Jotter Page)
Add a header strip above the existing replay: attempts-to-correct, time-on-task vs class median, the
pupil's **self-eval** (confidence + which "I can…" they rated 🔴) **set against their actual marks**,
their per-section confidence trend, and the support/stretch flag with its reasons.

### 3c. Reuse what exists
Marking Pile (dx clusters + starter) and Same-Question Sweep stay as the deep-dive tools; Insights links
to them. Copy CSV gains columns: confidence, attempts, time, flag, top struggle-skill.

---

## 4. Pupil flags (computed; thresholds are sensible defaults, teacher-tunable later)

Computed from existing metrics; **method marks and shown-working are first-class**, not just answers.

Computed over **finished** (locked) questions, with teacher overrides folded in (a corrected first
attempt counts as a first-try everywhere). Implemented defaults (tunable later; hoist to constants):
- **Needs support** (≥3 finished) if any of: ≥34% `err`; ≥40% AMBER (answer-only = skipping working);
  avg time > 1.6× class median; or low self-confidence (≤1.5) alongside weak *assessable* method (<60%).
- **Ready for stretch** if ≥max(5, 60% of) finished AND: ≥80% correct on the **first** attempt; method
  rate **assessable and ≥90%** (working shown, not AMBER — a section with no method marks is *not*
  eligible); no AMBER; and self-confidence not low.
- Working is weighted as much as the answer: `methodRate` is `null` (not 100%) when a question type has
  no method marks, so a tap-only question can never read as "full working shown".

Flags are advisory, shown with their evidence, never punitive or pupil-visible by default.

---

## 5. Unlocking support & stretch (content-safe)

- **Support (safe now):** for a struggling pupil/question, surface the **existing** authored help — the
  section's **method movie**, the angle **reading-aid**, a worked first line — as an opt-in *"Want to see
  how? ▶"* the pupil can pull (and/or the teacher can nudge on). **No new content.**
- **Stretch — needs a decision (see §7).** Content-safe options, in order of safety:
  1. **Reveal/reorder existing harder items** by latent difficulty (`marks[0]`) — a "Challenge" filter
     that front-loads the 2- and 3-mark questions. Zero new content.
  2. **A Mary-authored extension slot** per section (manifest-driven, like adding a topic) that Mary
     fills with vetted stretch questions when she wants to. New content, but **authored by the teacher**.
  3. ~~Auto-generate harder questions~~ — **rejected**: repeats the already-flagged unverified-provenance
     risk (no past papers supplied) and strays from source. Not without Mary's material + sign-off.

---

## 6. Data-model changes (small + backward-compatible)

- `summary.qs[qid]` gains **`at`** (attempts used) and **`a1`** (first-attempt outcome: 1 ok / 0 not) —
  ~6 chars/question, enables attempts-to-correct on the cheap wall data. (`st, errAt, dx, mk, t` already there.)
- `summary.evals` + `state.evals` — the self-eval (see §2).
- Content pack: `section.cans:[{id,text}]` — the "I can…" chips (restated WALTs).
- Phase 2 only: optionally persist a compact per-line error vector per question to avoid recomputation;
  otherwise the deep view recomputes via `fullStates()` (existing pattern). No new Sheet **columns** ever
  (the Data tab's 7 columns are fixed; everything rides inside Summary/State JSON).

---

## 7. Decisions for Damien (before build)

1. **Stretch content policy** — pick: (1) reveal/reorder existing harder items only [safe, recommended
   for now], (2) add a Mary-authored extension slot too, (3) hold stretch until Mary supplies / signs off
   challenge material. (Support via existing movies is safe and in regardless.)
2. **Self-eval shape** — confidence (1–3) + per-section "I can…" skill chips + optional one-liner.
   Good? Or lighter (confidence only) / heavier (add "how hard did that feel?")?
3. **Phase-1 scope** (see §8) — self-eval + Class Insights + flags + per-pupil header, all off cheap
   data. Agree as the first shippable slice?
4. **"I can…" wording** — restating Mary's WALTs as pupil-voice statements is content-safe, but Mary
   may want to word them. OK to draft and let her tweak?

---

## 8. Phased build (each phase = its own checkpoint: commit + push + deploy)

- **Phase 1 — Self-eval + Class Insights (cheap data)** *(recommended first)*: capture self-eval at
  section end; add `at`/`a1` to summary; build the Class Insights panel (band, hardest-questions/where-
  working-breaks from `errAt`+`dx`+attempts, flag board, confidence↔performance) and the per-pupil
  Jotter-Page header; extend CSV. Mostly surfacing existing data + small capture. High value, low risk.
- **Phase 2 — Deep step analytics + support unlock**: full per-line/per-step failure analysis via
  `fullStates()` (exact working step the class breaks on, beyond first-error); pupil-pullable "see how"
  support reusing the movies; teacher "nudge support to this pupil".
- **Phase 3 — Stretch content** *(gated on Decision 1 / Mary)*: the chosen content-safe stretch path.

Offline-preview + screenshot each phase before deploy; redeploy as a new version of the same `/exec`.

---

## Grounding source
Full read-out: workflow `gj-analytics-understand` (5 briefs: capture & marking, server & persistence,
markbook UX, content & source fidelity, pupil flow & self-eval insertion). Key file:symbols cited inline.
