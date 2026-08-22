# Authoring content for the A2 Geography platform

This platform is manifest-driven: every topic is a single JS data file that registers
itself, and the shell renders it block by block. This file is the authoring contract —
content authors (and future build sessions adding Booklets 2/3) write data that
conforms to it and never touch the engine.

## Topic file shape

`topics/<topic-slug>/content.js`:

```js
window.OLS_A2PT_TOPICS = window.OLS_A2PT_TOPICS || [];
window.OLS_A2PT_TOPICS.push({
  id: 'margins-landforms',
  num: 1,                                  // booklet number
  title: 'Plate Tectonics: Margins and Landforms',
  strap: 'Evidence · Theory · Margins · Landforms',
  spec: [                                  // drives the spec-tracker
    { id: 'i',   text: '…evidence for and the theory of plate tectonics…' },
    { id: 'ii',  text: '…plate and sub-plate processes at constructive, conservative, destructive and collision plate margins…' },
    { id: 'iii', text: '…resultant landforms — ocean ridges, rift valleys, deep sea trenches, island arcs and fold mountains.' },
  ],
  chapters: [ { id, num, title, subtitle, icon, specIds: ['i'], blocks: [ /* see vocabulary */ ] } ],
});
```

Loaded from `index.html` with an ordinary `<script src="topics/margins-landforms/content.js">`
tag (never `fetch` — the site must work from `file://`). To add a topic: create the folder,
write `content.js` in this schema, add ONE script tag. The shell picks it up automatically.

## Block vocabulary

Every block is `{ type, ...fields }`. Author facts ONLY from the teacher's source
material. HTML fields accept `<strong> <em> <br> <ul><li>` only.

| type | fields | renders as |
|---|---|---|
| `heading` | `text` | in-chapter section heading (condensed caps, orange rule) |
| `text` | `html` | body prose card |
| `callout` | `genre`, `title?`, `html` | icon-headed pastel card. Genres: `keypoint` (star/blue) · `didyouknow` (bulb/navy) · `examtip` (mortarboard/gold) · `howdoweknow` (magnifier/teal) · `thinkdiscuss` (people/green) · `speclink` (book/navy) · `place` (pin/orange — spatial-context examples; add `place: '<Name>'`) |
| `keyterms` | `terms: [{term, def}]` | key-term definition cards |
| `note` | `text` | handwritten purple margin annotation (Caveat) with hand-drawn arrow |
| `diagram` | `id`, `caption?` | static SVG diagram registered in `assets/diagrams.js` |
| `sim` | `id`, `title`, `caption?` | animated GSAP simulation registered in `assets/sims.js` |
| `data` | `facts: [{value, unit?, label, detail?}]` | Data Bank stat tiles; auto-collected into the global Data Bank |
| `mcq` | `stem`, `options: [{text, correct?, why?}]` | hinge-check multiple choice (options shuffled at render; exactly one `correct: true`) |
| `cloze` | `title?`, `segments: [{t:'txt', text} \| {t:'gap', answer, show?}]` | fill-in-the-blanks in the teacher's first-letter-hint style; `show` = number of leading letters hinted (default 1); marking is case/space-insensitive |
| `match` | `title`, `prompt?`, `pairs: [{left, right}]` | drag word-bank chips onto definition targets (Pointer Events; place-all-then-check) |
| `sequence` | `title`, `prompt?`, `items: ['first', …]` | drag-to-order (author in CORRECT order; shuffled at render) |
| `classify` | `title`, `prompt?`, `columns: ['…'], items: [{text, col}]` | drag-classify into columns (her Plate/Sub-plate/Landform organiser) |
| `examq` | `qid`, `source`, `question`, `marks`, `plan?: [..]`, `scheme: [{point}]`, `model?`, `examiner?` | Exam-practice card: attempt space → self-check against scheme points → model answer + examiner note reveal (nothing revealed before the pupil commits) |
| `marker` | `qid`, `question`, `marks`, `answer`, `bands: [{band, range, descriptor}]`, `verdict: {band, mark, commentary}` | Be-the-examiner: pupil grades a real pupil answer, then sees the actual verdict |
| `checkpoint` | `title?`, `items: [mcq\|cloze blocks]` | end-of-chapter scored checkpoint; feeds chapter progress |

## Non-negotiable authoring rules

1. **Every fact traces to Kathryn's source material** (`/tmp/ols-build-37/extracts/` during
   the build). No invented numbers, dates, places, or processes.
2. **Exam material is verbatim** — questions, mark schemes, model answers, examiner
   commentary are transcribed exactly, with `source` naming the origin (e.g. "PPQ booklet").
3. **No answer leaks**: quiz stems must not contain their own answers; `mcq` options are
   authored with `correct` marked and shuffled by the engine; cloze answers never appear
   in the surrounding text; `marker` answers never hint the verdict.
4. **Spatial context**: use `callout` genre `place` for every named real-world example —
   the spec demands "general reference to places for illustration purposes".
5. **Terminology**: CCEA wording. Prefer *lithosphere/asthenosphere* over crust/mantle in
   process explanations (the teacher's explicit exam tip).
6. **Tone**: professional, second person, age 17-19. Never childish.
7. **No teacher names, class codes, or pupil data anywhere.**
