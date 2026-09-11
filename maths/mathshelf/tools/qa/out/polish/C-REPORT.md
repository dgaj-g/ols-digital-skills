# Package C — player.js / statchart.js (Book C polish cut, 11 Sept 2026)

Port 8101. Files touched: `player.js`, `statchart.js`, `tools/qa/MATHS_HUMAN_PACE_INVENTORY.md`
(read only — no rows added, see below). `tools/qa/fixtures/plants.js` and
`tools/qa/qa-human-pace.js` were NOT touched — see "the control I did not add".

## 1. Ruling 38 — the film's dwell (`player.js :: readTime`)

Changed:
```
Math.min(3600, Math.max(850, words * 200))   →   Math.min(8000, Math.max(1200, words * 350))
```
The dwell still runs strictly AFTER the step's own drawing finishes
(`advance()` awaits every op's promise, then calls `scheduleAuto()`), so this
is top-up reading time on top of whatever the draw itself took, not the whole
read.

**Inventory rows: none added.** `node tools/qa/qa-human-pace.js` reports this
file GREEN both before and after the change, and `player.js :: readTime` never
appears in its "clocks found" list. I checked why: `tools/qa/lib/timeconsts.js`
only registers a bare number as a clock when its own line matches
`setTimeout|setInterval|wait|delay|poll|debounce|timeout|idle|sleep|backoff|ms`
(or is inside a `setTimeout(...)`/`N*1000` literal). The line
`return Math.min(8000, Math.max(1200, words * 350));` matches none of those,
so 1200/350/8000 are invisible to the scanner — this was already true of the
old 850/200/3600 (proved with `TC.scan()` against both versions: 0 rows either
way). Adding a row keyed `player.js :: readTime :: 1200` etc. would make
`qa-human-pace`'s reverse check fail it as "names a clock that no longer
exists" (since the scanner will never produce that key), which is worse than
no record at all — DFM 269's own standard. I'm leaving this as a gap for the
lead: `tools/qa/lib/timeconsts.js` is shared infrastructure outside package
C's file list (not on CUT_SCOPE.txt for me), so I haven't touched it. The
scanner needs a rule for "a number is time-bearing because its own FUNCTION
name says so" (`readTime`) as well as its current line-based one.

## 2. Ruling 39 — a ring on a written line (`player.js :: paperRing`, new)

`applyOp` fell through PAPER-mode `ring` ops all the way to
`if (!dgm) return Promise.resolve();` and drew nothing. Added:

- `paperWrite` now splits `op.write.text` on `, ` and wraps each value in its
  own `<span class="ml-val">`, so a later ring has something exact to find and
  measure (a line with no comma is one span covering the whole line).
- `paperRing(op, instant)`: finds the target line (`op.ring.line`, else the
  last written line), takes the `i`-th `.ml-val`, measures ITS rendered rect
  and the line's rect, and draws a copper `<ellipse>` (`stroke: var(--copper)`,
  width 1.8, padded 4px) positioned by the measured offset between them —
  never a guessed pixel number. Drawn at pen speed via the existing
  `drawStroke()` helper (same one `dgm.reveal` uses), instant/reduced-motion
  draws it in one frame. The svg carries class `ml-ring`, so
  `showCaption`'s `data-step-subjects` (`.ml-ring` from the op key `ring`) has
  a real element to point at.
- Wired into `applyOp`: `if (op.ring && movie.mode === 'paper') return paperRing(op, instant);`
  (diagram-mode `ring` isn't used anywhere in the content packs, so this is
  scoped to paper).
- Multiple rings on one line all stay: `advance()` never clears the stage
  between steps, so each ring op just appends another ellipse; jumping via
  `goto()` replays every prior op instantly, rebuilding all of them. Proved
  live: the s1 film's three ring steps (4th, 2nd, 6th value of the same
  ordered line) all remain on screen together — see the 1280 screenshot after
  step 8 below, three copper rings visible on one line.
- `statchart.js`'s own header comment above `ring(i)` (~line 979) is rewritten:
  it no longer describes an open "deviation noted in the build report" — it
  now says plainly that this ring only ever knows a chart point, and the
  paper-mode ring is player.js's own separate function.

## 3. Ruling 39 — the gold box no longer encroaches (`player.js :: paperBox`)

Root cause (found empirically, not guessed): the old code built the SVG's
`viewBox` from `eq.offsetWidth + 22, eq.offsetHeight + 8` — numbers that don't
match `.answer-boxed`'s own CSS padding (`2px 10px`), so the SVG's real
on-screen size (`width:100%/height:100%` of that padded box, per style.css,
which I may not edit) never agreed with the coordinate system the path was
drawn in. Two bugs stacked:

1. A `<span>` reports a different rendered rect as a flex item than it does
   once nested one level deeper inside a plain inline-block wrapper — measured
   ~4px difference, not rounding noise. Fixed by wrapping FIRST, then
   measuring `eq.getBoundingClientRect()` from its final, settled position.
2. `.movie-stage svg { max-width: 100%; ... }` (style.css line ~301) applies to
   every SVG on the stage, including this one, and silently clamped an
   explicit inline `width` back down to the wrapper's own width. Fixed with an
   inline `max-width:none; max-height:none` override — style.css itself is
   untouched.

New code measures `eq`'s rect only after it is wrapped, measures the offset
between the wrapper's box and the glyph's own box (never assumes they
coincide), and sets every SVG dimension — `left`, `top`, `width`, `height`,
`max-width`, `max-height` — inline from that one measurement. Padding is
exactly 8px, verified live (see below): all four gaps measured 8.0px, not
"≥7", not "close enough."

## Proof

Preview on port 8101, puppeteer script in scratch dir, driven via `.mc-fwd`
step by step at 1280 and 375. Book: Handling Data (`stats-quartiles`), Ex.1
"Quartiles and the interquartile range from a list", movie "Ordering first"
(mode `paper`, 8 steps; steps 3/4/5 ring the 4th/2nd/6th value of the ordered
line, step 8 boxes the IQR line).

### Rings — screenshots and measured rects

`tools/qa/out/polish/C/ring-step{3,4,5}-{1280,375}.png` (6 files).

| width | step | value rung | ring rect encloses value rect |
|---|---|---|---|
| 1280 | 3 (4th value, £9.25) | yes |
| 1280 | 4 (2nd value, £8.70) | yes |
| 1280 | 5 (6th value, £10.75) | yes |
| 375  | 3 | yes |
| 375  | 4 | yes |
| 375  | 5 | yes |

Example (1280, step 3): ring `{left:444.5, top:406.9, right:507.7, bottom:440.9}`
encloses value `{left:448.5, top:410.9, right:503.7, bottom:436.9}` on every
side. Full numbers for all six in `tools/qa/out/polish/C/proof-data.json`.
Visual check on the step-8 screenshot (below) shows all three rings still
present on the one ordered line, as the ruling requires.

### Box — screenshots and measured rects

`tools/qa/out/polish/C/box-step8-{1280,375}.png`.

At 375: text rect `{left:29.80, top:571.88, right:269.06, bottom:594.88}`;
box (`.box-draw` svg) rect `{left:21.80, top:563.88, right:277.06, bottom:602.88}`.
Gaps: left 8.0px, top 8.0px, right 8.0px, bottom 8.0px — exact, comfortably
past the "≥7px, do not touch" bar. Same result at 1280 (screenshot only
attached there since the numeric proof was run at 375; the geometry is
width-independent by construction — every dimension comes from the measured
glyph rect, not a fixed viewport number). Visual check: the gold box sits
cleanly around "IQR = £10.75 − £8.70 = £2.05" with visible paper between the
box and every character, at both widths.

### Pace — dwell timing while the film plays

Caption-change timestamps recorded via a `MutationObserver` on `.cap-text`
while `.mc-play` ran the film at 1280:

| step | words in caption | dwell measured (caption→caption) | floor applied (`min(8000, max(1200, 350×words))`) | pass |
|---|---|---|---|---|
| 1→2 | 16 | 5603 ms | 5600 ms | yes |
| 2→3 | 18 | 6907 ms | 6300 ms | yes |
| 3→4 | 26 | 8362 ms | 8000 ms (capped) | yes |

The measured dwell is caption-to-caption (draw time + the readTime top-up), so
it is always ≥ the readTime floor alone — a stricter, not looser, check than
the ruling asked for. Raw log in `proof-data.json`. She is never trapped in
the wait: `.mc-back`, `.mc-fwd` and the dot rail all call `stopAuto()` first,
so pause/step-back/skip-ahead work at any point mid-dwell — unchanged by this
edit.

## The control I did not add

The prompt asked for a plant `fixture-pace-fast-film` (reverting `readTime` to
`words * 200` / floor 850) with a control `film-too-fast` in
`qa-human-pace.js`'s `CONTROLS`, `mustFail: /no inventory row/`, **only if
qa-human-pace can actually detect it**. It cannot: proved with
`TC.scan()` against both the old and new `player.js` — `readTime`'s constants
never appear in the scanner's output either way (same root cause as section 1
above: the line has no trigger keyword). A plant that reverts the numbers
would leave `qa-human-pace` GREEN, undetected — the control could never FIRE,
so adding it would be a control that lies about protecting something. I did
not add the plant or the control. This is the same scanner gap noted in
section 1; fixing `tools/qa/lib/timeconsts.js` (not mine to touch) would let
both the inventory row and this control exist honestly.

## Fast tier

`node tools/qa/run.js`: **GREEN** apart from:
- `qa-repo-prod` — RED, dirty tree, expected until the lead commits.
- `qa-scope` — RED, because `tools/qa/qa-waits.js` was edited outside
  CUT_SCOPE.txt. Not my edit (`git diff tools/qa/qa-waits.js` shows +85 lines,
  none from me) — another package's in-flight work.
- `qa-compositor` — RED, `style.css @keyframes gj-breathe-card` animates
  `box-shadow`/`border-color`. Not my edit — I never touched style.css; `git
  diff --stat style.css` shows another package's changes (+84/-7 lines).

`qa-human-pace` itself: **GREEN** (90 checks). `node tools/qa/control.js
--only qa-human-pace`: all four of its existing controls FIRED/PASSED
(`unrecorded-clock`, `stale-row`, `budget-on-a-child` all FIRED;
`over-tightening` PASSES) — my `readTime` change didn't disturb any of them.

`node tools/qa/qa-scope.js` on its own also shows the same single
out-of-scope line (`qa-waits.js`) — nothing of mine.

## Files changed by me

- `/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/player.js`
- `/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/statchart.js` (header comment only, one function's doc-comment block — no behaviour change)

`tools/qa/MATHS_HUMAN_PACE_INVENTORY.md`, `tools/qa/fixtures/plants.js` and
`tools/qa/qa-human-pace.js`: read, not edited (see sections 1 and "the control
I did not add").

## Screenshots and data

All in `/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/tools/qa/out/polish/C/`:
`ring-step3-1280.png`, `ring-step3-375.png`, `ring-step4-1280.png`,
`ring-step4-375.png`, `ring-step5-1280.png`, `ring-step5-375.png`,
`box-step8-1280.png`, `box-step8-375.png`, `proof-data.json` (raw rects and
pace timestamps).

## Left for the lead

- The `qa-human-pace` scanner blind spot on function-named clocks
  (`tools/qa/lib/timeconsts.js`, out of package C's scope) — affects
  `player.js :: readTime` and would affect any other clock built the same way
  (returned from a `Math.min/Math.max` expression with no line-level trigger
  word).
- `qa-scope` and `qa-compositor` reds are other packages' in-flight edits
  (`tools/qa/qa-waits.js`, `style.css`), not mine — flagging so the lead
  doesn't chase them here.
