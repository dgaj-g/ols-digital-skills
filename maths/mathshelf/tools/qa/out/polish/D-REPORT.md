# Package D — the retired locked spine (ruling 36, Book C polish cut, 11 Sept 2026)

Port 8102. Files touched: `script.js`, `strings.js` (two keys only), `tools/qa/qa-tickbox.js`,
`tools/qa/sit-pupil.js` (shelf pass + CONTROLS list only), `tools/qa/fixtures/plants.js`
(three plants: one new, one replaced, one untouched-but-noted), `tools/qa/MATHS_COLD_READ_VERDICTS_v4.md`
(two rows deleted). `tools/qa/MATHS_COVERAGE_DEBT.md` was checked and needed no edit (see §7).

## 1. `script.js` — `renderShelf` (ruling 36)

"I want any book that isn't ticked on the staff side not to appear on the student side at
all, only those that are ticked" (Damien Gartland, 11 Sept 2026).

- An unticked book is now skipped before any element is created: `if (!out) return;`
  straight after `var out = !!me.acts[a.id];`, inside the `ACTIVITIES.forEach`. No
  `div.book.not-set` card, no "Not set yet" label, ever renders.
- `anyLocked` is gone. The shelf-note (`#shelf-note`) always reads `T.shelfMore` now — no
  more conditional swap to `shelfNotSetNote`.
- `GJ.app.surfaces.shelf` (line ~67) no longer lists `locked-spine`:
  `['none-ticked', 'some-ticked', 'star-earned', 'in-progress']`.
- `none-ticked` is unchanged: with no book ticked, `wrap` stays empty, `anyOut` stays
  false, and the shelf still reads state `none-ticked`. `#shelf-instruction` (`T.shelfPlain`,
  "Your maths books live here. Your teacher chooses which ones are out.") is unconditional
  and still renders — it was never gated on any book's tick state, so it reads correctly
  whether the shelf is empty or full.

**A judgement call I did NOT make, per COMMON.md — flagged for the lead / cold read:**
`T.shelfMore` ("Your teacher will add more books to this shelf during the year.") is now the
*only* shelf-note, including for a class where every existing book is ticked (three ticked =
"some-ticked"/"star-earned"/"in-progress", not a special case). Whether that sentence still
reads right once the whole shelf is lit is a content judgement, not a rendering one — I did not
author a replacement sentence. Recommend the cold read re-examine `shelfMore` under an
"every book ticked" seed.

## 2. `GJ.app.surfaces` + `qa-surfaces`

Registry updated as above. `node tools/qa/qa-surfaces.js` — GREEN (162 checks, both
directions: nothing declares a state no longer written, nothing writes a state no longer
declared).

## 3. `strings.js`

Deleted exactly two keys from `GJ_STRINGS.pupil`: `shelfNotSet` and `shelfNotSetNote`.
Nothing else in the file touched. `node tools/qa/qa-strings-ledger.js` and
`node tools/qa/qa-language.js` both GREEN — no ledger row or fragment/read-first candidate
referenced either retired key.

`MATHS_COLD_READ_VERDICTS_v4.md`: deleted the two PASS rows for `shelfNotSet` /
`shelfNotSetNote` (were rows 22–23).

Grep of the whole app + tools/qa for `shelfNotSet` / `not-set` / `locked-spine`: everything
inside files I own is clean. What's left, NOT mine to touch:

- `shell.css` (`.book.not-set` block, ~line 266–279) — dead CSS now; no card will ever carry
  that class again. Package E owns shell.css.
- `server/Index.html` — a full bundled mirror of script.js/strings.js/shell.css for the GAS
  deploy. It still has the pre-ruling-36 `renderShelf`, the `not-set` CSS block, and
  `locked-spine` in its own copy of `GJ.app.surfaces` (lines ~15695, ~15750, ~1840–1853,
  ~14794). Not in my file list; needs the same mirror update before this cut deploys.
- `tools/qa/lib/walk-moves.js` line 293 — `ACTIONS.openBook` still checks
  `card.classList.contains('not-set')` after failing to find the card at all. Harmless (the
  `if (!card)` branch above it fires first now, since an unticked book has no card), but it's
  dead code referencing a retired class. Not in my file list.
- `strings.js` line ~419 and `script.js` lines 505/514: `'not-set'` also appears as an API
  **error code** (`{ ok: false, error: 'not-set' }` / `serverNotSet`) for a load/save against
  an unticked book. This is a different thing from the CSS class and the retired card — left
  alone deliberately.

## 4. `tools/qa/qa-tickbox.js`

- `g.exempt()` rewritten to explain WHY the DOM half is proved by source rather than by
  driving a click: both call sites for `renderShelf()` sit inside click handlers, and
  `domstub.js`'s `addEventListener` / `click` / `dispatchEvent` are all no-ops (checked the
  file directly) — there is no way to fire a click through this sandbox and read a
  re-rendered DOM back. Confirmed empirically too: `renderShelf` has exactly two call sites
  in script.js and both are inside `.addEventListener('click', ...)`.
- Added a source-based check block: finds `renderShelf`'s body, asserts
  `/if\s*\(\s*!out\s*\)\s*return;/` is present, and asserts neither `not-set` nor
  `locked-spine` appears anywhere in script.js. Failure sentence (both checks) is exactly
  `an unticked book is still on the pupil's shelf — a book the class does not have is absent, not locked`.
- New CONTROL `shelf-shows-unticked` (id renamed once — see below), plant
  `fixture-shelf-shows-unticked`, `mustFail: /still on the pupil's shelf/`.
- `node tools/qa/qa-tickbox.js` — GREEN (28 checks).
- `node tools/qa/control.js --only qa-tickbox` — GREEN, all 4 controls FIRED including the
  new one.

**Naming correction made mid-build:** I first named the control `unticked-book-on-shelf`.
`node tools/qa/run.js`'s `qa-audit` gate failed with "qa-tickbox does not declare a control
called 'shelf-shows-unticked'" — `tools/qa/MATHS_GATES_AUDIT.md` (not mine) already names
ruling 36's control as `qa-tickbox / shelf-shows-unticked` for row 36 of the rulings ledger.
Renamed to match exactly; `qa-audit` and the control proof are both GREEN now.

## 5. `tools/qa/fixtures/plants.js`

- Added `fixture-shelf-shows-unticked`: edits script.js, removing the `if (!out) return;`
  skip (targets the exact two-line anchor `if (!out) return;\n      anyOut = true;`), so an
  unticked book is drawn again. Used by qa-tickbox's new control (§4).
- Replaced `fixture-css-locked-spine` with `fixture-css-lit-spine`: the old plant coloured
  `.book.not-set .series/.band` — a selector that can never match again. The new one plants
  a legible-looking but near-invisible ink directly on a ticked book's own cover:
  `.book .series, .book .band { color: #C9D2DF !important; }`.
- Left `fixture-css-svg-glyph-in-plate` untouched — see §6, flagged rather than fixed
  (targets the same retired `.book.not-set .motif` selector; out of my explicit scope).

## 6. `tools/qa/sit-pupil.js`

- CONTROLS list: `locked-spine-unreadable` renamed to `lit-spine-unreadable`, plant swapped
  to `fixture-css-lit-spine`, same `mustFail: /against what is actually behind it/` (the
  readability law's own sentence — unchanged, since the law itself didn't change, only what
  now carries the risk).
- **Flagged, not fixed:** `svg-glyph-lost-in-its-plate` (plant `fixture-css-svg-glyph-in-plate`)
  still targets `.book.not-set .motif text`, which can never match again post-ruling-36. This
  control is now structurally dead (same failure mode as the one I did fix) but replacing it
  wasn't named in my brief and doing so well needed a second CSS plant + control design
  decision I didn't want to make unbidden. Left a code comment pointing at this report.
  Confirmed empirically: `node tools/qa/control.js --only sit-pupil` reports it DID NOT FIRE
  (see §8 for why that run's other failures are NOT this).
- `shelfLockStatesPass`: the `locked-spine` seed/expectation is gone. Now asserts, for
  `{ angles: true }`: shelf state is `some-ticked`, the DOM holds exactly as many `.book`
  cards as there are ticked acts (`document.querySelectorAll('#shelf-tiles .book').length`),
  and zero `.book.not-set` cards exist. The `none-ticked` seed (`{}`) is unchanged and gets
  the same two new assertions (0 cards, 0 not-set cards).
- `node tools/qa/control.js --only qa-tickbox` proves the logic by source (§4). The live DOM
  walk for `shelfLockStatesPass` and the required 1280 walk (item 6) could not be completed
  end-to-end in this session — see §8, this is an environment problem, not a code one.

## 7. `tools/qa/MATHS_COVERAGE_DEBT.md`

Checked. `locked-spine` appears once, in historical prose (the "States the app declares and
no walk has yet stood on" narrative, dated 8 Sept 2026, describing a fault already found and
fixed that day) — not in an active debt-table row. No row in the actual debt tables names
`locked-spine`. Per the brief ("only if a row there names locked-spine"), no edit made.

## 8. What I could NOT finish, and why (environment, not code)

This machine is running several packages' puppeteer suites at once (E was mid-run on
`qa-waits` against its own port throughout; the working tree at points during this session
showed 18–24 files modified simultaneously by other packages). Chrome process count on the
box climbed to 84–89 concurrent processes during my session. Every attempt at a *live*
browser proof degraded or hung:

- `node tools/qa/control.js --only sit-pupil` (full matrix, MS_WORKERS=6): completed, but 3
  unrelated controls (`unreachable-planted-fault`, `stage-strip-behind`, and the
  already-flagged `svg-glyph-lost-in-its-plate`) plus `over-tightening` came back
  DID-NOT-FIRE/RED, every one of them with the identical signature —
  `the browser tab died part-way through this walk (Attempted to use detached Frame ...)`
  followed by `ConnectionClosedError: Connection closed.` — a Chrome crash under load, not a
  gate finding. **My own new/changed control, `lit-spine-unreadable`, FIRED cleanly in this
  same run** (log: `tools/qa/out/control/sit-pupil.lit-spine-unreadable.log`).
- A retry at `MS_WORKERS=2` was killed by me after 12+ minutes with no output, to free
  resources for the next attempt.
- A screenshot-only puppeteer script (seed `{angles:true}` in localStorage, open the class,
  screenshot at 375/1280, plus a `{}` none-ticked shot) timed out on
  `Page.captureScreenshot` three times running, even at a 60s protocol timeout.
- Sanity check: a **blank-page** (`about:blank`) puppeteer screenshot, no app code involved
  at all, also failed to return inside 40s while system Chrome count was ~84. This confirms
  the bottleneck is machine-wide resource contention, not anything in script.js/sit-pupil.js.
- The required `MS_WIDTHS=1280 MS_BOOK=angles node tools/qa/sit-pupil.js` run against
  `MS_BASE=http://localhost:8102/...` was attempted twice and produced zero output both
  times (stuck before its first browser launch even completed) while system Chrome count
  was 84–118. Stopped rather than left to hang indefinitely.
- Screenshots for `tools/qa/out/polish/D/` (item 6) were NOT captured, for the same reason.
  I did not fabricate or guess at them.

**What stands in place of the live proof:** the logic is proved by source
(`qa-tickbox`'s new checks, §4) and the assertions I added to `shelfLockStatesPass` are
correct by inspection (card-count equality + zero not-set cards) even though I could not get
a clean end-to-end browser run to exercise them tonight. `qa-surfaces`, `qa-strings-ledger`,
`qa-language`, `qa-scope`, `qa-audit` and the full fast tier (`node tools/qa/run.js`) are all
GREEN — see §9. I'd recommend the lead re-run
`MS_WIDTHS=1280 MS_BOOK=angles node tools/qa/sit-pupil.js` and
`node tools/qa/control.js --only sit-pupil` once the machine is quieter, rather than trust my
one partial run.

## 9. Fast tier

`node tools/qa/run.js` — GREEN apart from `qa-repo-prod` (dirty tree, expected per
COMMON.md). Confirmed clean twice, once before and once after the `shelf-shows-unticked`
rename.

## 10. For the lead

- `server/Index.html` needs the same `renderShelf`/`surfaces`/CSS mirror update before this
  cut deploys (§3).
- `tools/qa/lib/walk-moves.js:293` has dead-but-harmless reference to `.not-set` (§3).
- `tools/qa/MATHS_GATES_AUDIT.md` row for ruling 36 (row ~295, section F GAPS) still says
  "the registry's `locked-spine` state change with it" — now historical; the state is gone,
  not changed. Not mine to edit.
- `sit-pupil`'s `svg-glyph-lost-in-its-plate` control needs the same lit-spine treatment I
  gave `locked-spine-unreadable`, if the lead wants it closed this cut (§6).
- Cold-read judgement owed on whether `shelfMore` still reads right for a fully-ticked shelf
  (§1).
