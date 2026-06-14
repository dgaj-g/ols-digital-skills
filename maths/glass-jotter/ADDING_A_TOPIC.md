# Adding a new topic to The Glass Jotter

This platform was built to grow. A new topic (e.g. "Fractions", "Percentages",
"Sequences") is a **new tile on the shelf** — it does **not** require touching the
login, the dashboard, the marking engines, the teacher markbook, or the server.
Any future Claude session can follow this guide cold; nothing here depends on the
conversation that first built it.

**Read `INTERFACES.md` (the content-pack schema) and one existing pack
(`content-angles.js` or `content-algebra.js`) before you start — they are the
templates.** Then work through the checklist below.

---

## What a topic is made of

A topic is **one file**: `content-<topic>.js`, which attaches
`window.GJ_CONTENT.<topic>` — a pack of 4–6 sections, each with one animated
**method movie** and 2–4 **questions**. That's it. The same line-by-line jotter,
the same examiner-style marking, the same Working Wall and override and Marking
Pile all work on it automatically, because they iterate `GJ_CONTENT[actId]`.

There are **two marking engines** already built; pick the one your topic needs:

| Engine | Marks | Use it for |
|---|---|---|
| `mathcore.js` (`GJ_MATH.checkQuestion`) | typed algebra working, line by line — exact-rational equivalence, any valid route, dx misconceptions | equations, expanding, factorising, substitution, sequences-as-formulae, anything where pupils **type maths** |
| `anglecore.js` (`GJ_ANGLES.checkSteps`) | angle chains on a diagram — value + named reason per step, follow-through, prerequisite check | anything that is **find-the-value-on-a-diagram with a reason** (bearings, circle theorems, polygons) |
| `kind: 'classify'` (built into `jotter.js`) | pick-the-right-label from the full option set, two attempts | "what type of … is this?" recognition questions |

If a topic needs a genuinely new interaction (e.g. a number line, a probability
tree), that's a bigger job — a new `kind` and a new branch in `jotter.js` +
`script.js`/`staff.js` marking. Most arithmetic/algebra topics fit `mathcore`
as-is, and most geometry topics fit `anglecore` as-is. Say so honestly in the PR
if a topic needs engine work rather than just a content file.

---

## The checklist (≈ 6 edits + verify)

### 1. Get the teacher's source material
Same as any OLS build: the WALTs and the textbook chapter(s). Read them fully,
extract every rule, worked example and exercise style. The teacher's worked
examples become the **method movies**; their exercise styles become the
**questions**. Verify every answer.

### 2. Write `content-<topic>.js`
Copy the nearest existing pack and follow `INTERFACES.md` exactly:
- `window.GJ_CONTENT.<topic> = { id, title, cover:{accent,motif}, [reasonBank], sections:[…] }`
- Each section: `{ id, title, walt, movie, questions }`.
- **Movies** are data — `steps:[{say, do:[ops]}]`. Ops for "paper" mode
  (`write/sub/tick/box/grid/balance/stamp/note`) and "diagram" mode
  (`seg/arc/value/label/stamp/pulse/zshape`). See `player.js` for the full op
  list. Keep every `say` caption ≤ 140 chars, warm and teacherly.
- **Questions** carry a `marks:[method,accuracy]`, a `dx` map of classic wrong
  lines → misconception codes, and the type-specific fields in `INTERFACES.md`
  (`solve/expand/simplify/subst/form` for algebra; `graph`+`diagram`+`target`
  for angles; `classify` for recognition).
- **Diagrams are computed geometry**, never sketched — build ray endpoints by
  angle so the figure genuinely subtends the stated values (see how
  `content-angles.js` does `ray()` / `parallelQ()`).
- **Genuine-consequence rules still apply** (playbook §"Assessment integrity"):
  full option/reason banks shown every time and shuffled, no giveaways, real
  fail states.

### 3. Register the tile — `script.js`
Add one entry to the `ACTIVITIES` array near the top of `script.js`:
```js
{ id: 'fractions', title: 'Fractions', sub: 'The Number Line', accent: '#5A3B7A',
  meta: 'Ex. M2·03 · CCEA M2', motif: 'radical' }   // motif: 'protractor' | 'radical' (add a new one in bookMotif() if wanted)
```
`id` **must** match the `GJ_CONTENT.<id>` key. The tile, progress ticks, gold
star, and the teacher tickbox all appear automatically.

### 4. Load the file — `index.html`
Add a `<script src="content-<topic>.js"></script>` line, **after the engine it
uses** (`mathcore.js`/`anglecore.js`) and before `player.js`. Match the existing
order.

### 5. Tell the assembler — `server/build-pathb.js`
Add `content-<topic>.js` to the assembler's input/inline list (it's an explicit
array of the JS files it bundles into `Index.html`). If you skip this, the
github.io build works but the **deployed login-gated app won't include the new
topic**.

### 6. Add a content lint (strongly recommended)
Copy `dev/lint-content-<existing>.js` to `dev/lint-content-<topic>.js` and point
it at your pack. The angles lint re-measures every diagram angle from its
coordinates and re-proves every derivation; the algebra lint re-derives every
answer with `mathcore` + an independent mini-evaluator. This is what catches a
wrong answer before a pupil sees it.

### 7. Verify (do not skip — it's maths)
```bash
cd maths/glass-jotter
node mathcore.js && node -e "require('./mathcore.js').selfTest()"   # if you touched the engine
node dev/lint-content-<topic>.js          # your new content
node dev/validate-all.js                  # add your pack's loop to this file; proves every Q marks correctly
node server/build-pathb.js                # regenerate Code.gs + Index.html (commit these)
```
Then a browser pass (preview server → the activity): play every movie to its
last step and answer every question, watching the console for errors. The
`validate-all.js` per-question table is the receipt to put in the PR.

### 8. Ship it the normal way
New draft branch, draft PR closing the inbox issue, `/publish` when Damien's
happy. **If it's already deployed live** (the Apps Script `/exec` exists), the
topic reaches pupils by: re-run the assembler → paste the new `Code.gs` +
`Index.html` into the Apps Script editor → **deploy a new VERSION** (not a new
deployment) → the teacher ticks the topic on for her classes in the markbook.
No new URL, no re-sharing. See `server/DEPLOY.md`.

---

## Why this survives a fresh session

Everything a future session needs is **in the repo**, not in anyone's memory:
- `DESIGN.md` — what the platform is and why.
- `INTERFACES.md` — the exact module contracts and the content-pack schema.
- `ADDING_A_TOPIC.md` — this file.
- `content-angles.js` / `content-algebra.js` — two worked reference packs.
- `dev/*.js` — the lints and `validate-all.js` that prove a new topic is sound.
- `server/DEPLOY.md` + `server/build-pathb.js` — how it goes live.

A future `/build` or `/next` session that's asked "add Percentages to the Maths
platform" should: pull main, read this file + `INTERFACES.md` + the nearest pack,
get the teacher's material, and work the checklist. The marking engines, the
login, the class management and the markbook are already done and reused for
free.
