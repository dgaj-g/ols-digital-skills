# Adding a topic to Terra Mobilis

This atlas is a **platform**, not a one-off page. Volume I covers *Plate Tectonics:
Margins and Landforms* (the teacher's Booklet 1 of 3). The two volumes she is expected to
want next are:

- **Volume II — Volcanic activity and response** (her Booklet 2)
- **Volume III — Earthquake activity and response** (her Booklet 3)

Both slot in without touching the engine. This file is the whole recipe.

---

## The short version

1. Create `topics/<your-topic-slug>/content.js`.
2. Write the topic object in the schema below (the authoring contract is `AUTHORING.md`).
3. Add **one** line to `index.html`:
   ```html
   <script src="topics/<your-topic-slug>/content.js"></script>
   ```
4. Run `node tools/validate-content.js`. Fix anything it reports.

That is all. The shell reads `window.OLS_A2PT_TOPICS`, so the contents page, the progress
ribbon, the spec tracker, the search index and the Examiner's Folio all pick the new topic
up on their own.

**Never `fetch()` the content.** It is loaded with a plain `<script>` tag so the whole
atlas still works when opened straight from a file, with no server.

---

## The topic object

```js
window.OLS_A2PT_TOPICS = window.OLS_A2PT_TOPICS || [];
window.OLS_A2PT_TOPICS.push({
  id: 'volcanic-activity',          // unique slug
  num: 2,                           // booklet number
  title: 'Volcanic Activity and Response',
  volumeName: 'Volcanic Activity',  // the words on the spine
  strap: 'Types · Hazards · Prediction · Response',
  spec: [                           // drives the spec tracker on the contents page
    { id: 'i',  text: '…the specification statement, verbatim…' },
    { id: 'ii', text: '…' }
  ],
  chapters: [ /* see below */ ]
});
```

Each chapter:

```js
{
  id: 'volcano-types',       // unique across the whole atlas
  num: 1,
  title: 'Types of Volcano',
  subtitle: 'The line that sits above the title',
  specIds: ['i'],            // which spec statements this chapter serves
  blocks: [ /* the block vocabulary — see AUTHORING.md */ ]
}
```

### What the shell does automatically

- **The spine rail** on the contents page shows Volume I live and Volumes II and III as
  embossed "in press" spines. Register a second topic and its spine activates by itself —
  the rail keys off how many topics are registered, so there is nothing to switch on.
- **Progress, the gold ribbon, the wax seals and the leader dots** are all computed from
  the interactive blocks you author. A chapter with no interactive blocks will always read
  0%, which is why the validator warns about it.
- **Search** indexes prompt-side text only. It deliberately never indexes an answer — see
  the leak rules below.

---

## Adding an animation, a diagram or a plate

**A new animation** — add it to `SIMS` in `assets/sims.js`:

```js
SIMS['my-sim'] = {
  title: '…',
  plate: 'p-my-sim',              // optional: the plate its "Now label it" opens
  plateFrame(e) { /* optional */ },
  build() { /* returns { svg, …named elements } */ },
  stages: [ { title, caption, enter(tl, els) {} } ]
};
```

Then reference it from a chapter with `{ type: 'sim', id: 'my-sim' }`.

Three things to get right, because they have all bitten this build already:

- **Build the scene with `TM_SCENE`** (`scene`, `asthenosphere`, `slab`, `magmaArrow`,
  `motionArrow`, `label`). That is what makes every diagram in the atlas look like one
  hand drew them. Scene space is 1000 × 580.
- **Keep the colour code.** Blue = oceanic, brown = continental, red = magma. This is the
  convention the teacher requires in drawn exam diagrams, so the animations have to train
  it. `TM_SCENE.C` has the exact values.
- **Give it a `plateFrame` if the stages contradict each other.** A sim moves through time;
  a plate is one finished diagram. If your sim closes an ocean or releases a strain, the
  plate needs to be told which state to settle on — and it should hide any in-scene caption
  that the plate's own labels duplicate.

**A new plate** — add an entry to `PLATES` in `assets/plates.js`:

```js
{ id: 'p-my-sim', title: '…', chapter: 'volcano-types',
  from: 'sim', ref: 'my-sim',          // or from: 'diagram', ref: 'd3'
  labels: [ { text: 'Something', x: 700, y: 120, to: [520, 260], anchor: 'start' } ],
  caption: '…' }
```

`x`/`y` position the label text; `to` is the point on the diagram its dotted leader runs
to. Plates are numbered in array order, so inserting one renumbers those after it — that is
fine, the numbers are display-only.

Test mode builds its chip bank from this plate's labels **plus two or three decoys pulled
from other plates**, so a pupil cannot solve it by elimination. Nothing extra to configure.

**A new static diagram** — add to `DIAGRAMS` in `assets/diagrams.js`, returning
`{ svg, labels }`, then reference it with `{ type: 'diagram', id: 'd3' }` and give it a
plate entry so it can be studied and tested like the rest.

---

## The rules that are not negotiable

These come from `AUTHORING.md` and the repo build playbook. The validator enforces the
ones it can; the rest are on you.

1. **Every fact traces to the teacher's own material.** No invented figures, dates, places
   or processes. If a number is not in her files, teach the pattern and leave the number
   out — that is what was done with the ages of the ocean floor at the continental margins.
2. **Exam material is verbatim, and says where it came from.** Anything transcribed carries
   its real provenance in `source`. Anything written in the exam style but not from a real
   paper must say so — the label used in Volume I is `IN THE STYLE OF CCEA A2 1`. Never
   invent a past-paper attribution.
3. **A verdict that is ours, not hers, must say so.** The Second Marking card in Volume I
   carries a caveat explaining that the mark is our reading of the level descriptors. Keep
   that honesty.
4. **No answer leaks — visible or invisible.** A question must not contain its own answer,
   a cloze answer must not appear in the surrounding prose, and nothing on the answer side
   may sit in the DOM before the pupil commits. `tools/validate-content.js` checks the
   first two automatically and will fail the build on either.
5. **Genuine consequence.** Sorting and matching tasks are place-all-then-check: pupils can
   be wrong, wrong is visible, and wrong stays movable. Never force a correct answer.
6. **CCEA terminology**, and prefer *lithosphere* / *asthenosphere* over *crust* / *mantle*
   in process explanations — the teacher's explicit exam tip.
7. **Tone**: professional, second person, pitched at 17–19. Never childish.
8. **No teacher names, class codes, or pupil data anywhere.**

---

## Before you hand it over

```bash
node tools/validate-content.js          # must report no errors
```

Then look at it, at 375 px and at 1280 px: every new animation, every new plate in all
three modes (Study, Test, Board), every checkpoint in its wrong-answer state. The
animations are the part that goes wrong quietly — a scene can be geologically right and
still have a label sitting on top of another one.
