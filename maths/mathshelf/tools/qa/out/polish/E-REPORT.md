# Package E — rulings 34, 35, 37 (waits: breathe, pronounce, react at once)

11 Sept 2026. Port 8103. Budget used: about 55 of the 60 minutes.

## What changed, file by file

### style.css — `.panel-loading` through the reduced-motion media query (my owned block)

- **Investigated ruling 34 first** ("Checking the passcode… still not pulsing on the staff login screen"), with the transport slowed to 2s exactly as the ruling describes. Result: **the existing animation was NOT dead**. Measured in rendered puppeteer frames, `getComputedStyle(#st-msg).opacity` genuinely swung 1 → 0.58 → back up across the 1.5s cycle (two samples 700ms apart differed by 0.42, well over the 0.15 floor). Two proof frames are at `tools/qa/out/polish/E/passcode-frame-1.png` / `-2.png` from the FINAL build (see numbers below).
- So the fault was not a broken CSS rule, it was legibility: a 1 → .58 opacity swing on a small gold card is easy to miss on a single glance, especially over a short round trip, and — separately — this app correctly honours `prefers-reduced-motion: reduce` by turning the animation off entirely, which on a Mac with Reduce Motion switched on would make the card genuinely static. That's a plausible, unprovable-from-here explanation for "I cannot see it move" that isn't a bug.
- Fixed anyway, per the ruling's own instruction to make it more legible: `.panel-loading` now has its own keyframe, `gj-breathe-card`, separate from the shared `gj-breathe` (which the pupil cover's `is-waiting` line still uses, untouched — that one already worked and was never the complaint). It swings opacity to **.45** (deeper than the shared .58) and adds a very slight `transform: scale(1.015)` breathe, so two things move instead of one.
  - First draft breathed the border-color and box-shadow too, matching the ruling's own suggestion — **qa-compositor correctly failed this** (box-shadow/border-color repaint every frame instead of compositing). Swapped to `transform: scale()`, which is compositor-cheap and gives the same "it's alive" read. `qa-compositor` is green.
- **Ruling 35** ("more pronounced font"): `.panel-loading` font-size raised 1.02rem → 1.15rem, line-height 1.25 → 1.3, added letter-spacing. Weight stays 800 (already extra-bold); contrast unchanged (navy on the same gold/cream gradient).
- Nothing else in the owned block was touched (`.panel-spinner`, `.spinner`, `gj-spin`, `gj-pulse` (dead/unused, left alone), `.is-waiting`, `.cover-msg.is-waiting`, `gj-breathe` are all as they were).

### staff.js — ruling 37 (a tick reacts at once) + ruling 35 (the tick's own gold card)

- `addTick(a)`'s change handler no longer does `cb.disabled = true` or waits for the round trip to do anything. The checkbox is a real checkbox — it has already flipped before any of this code runs. What actually needed fixing was everything downstream:
  - The row's whole live tick state is read from the DOM (`data-act-id` attribute added to each checkbox) rather than trusted from `c.acts`, so a **second tick on a different book while the first save is still in flight is not lost**.
  - A new `runTickSync(c)` (defined once per `showClasses()` render, above `classes.forEach`) holds a **one-deep queue per class** (`c._tickSync = { busy, queued, pending, tickWrap }`). A change event always updates the queue and calls `runTickSync`; if a call is already in flight, the new state just waits in the queue and gets sent the moment the current call returns — so two quick ticks send one call each, in order, never two racing calls.
  - On failure, every checkbox in that row is reverted to the last **server-confirmed** state (`c.acts`), not just the last-clicked one — correct even if a second book was ticked mid-flight.
  - The whisper (`cmsg.classList.add('is-waiting')`) is gone. The class line now becomes the same gold `.panel-loading` wait-card the passcode screen uses (`busyCard(cmsg, TT('tickSaving', {...}))`), in the same synchronous turn as the click — proved by the new gate check below. Screenshot: `tools/qa/out/polish/E/tick-saving.png`.
  - `a.title` and `c.name` are teacher-visible text going into `busyCard`'s `innerHTML` — both are now `esc()`-escaped (the class name is teacher-typed free text; the book title is fixed content but escaped anyway for consistency with the rest of the file's html-taking call sites).
- The outcome sentences (`'... is now on ...'` / `'... removed from ...'`) were literal string concatenation on the render path. `qa-strings-ledger` does not actually flag them (its `.textContent =` pattern only matches a plain string literal starting right at `=`, not a concatenation — a pre-existing gap in that gate's regex, not something I fixed since it's outside this package's remit) — but COMMON.md's rule 10 is unconditional, so I moved them to `GJ_STRINGS.teacher.tickOn` / `.tickOff` anyway rather than leaving a known-bad pattern in place.

### strings.js — `GJ_STRINGS.teacher` only

Added, next to `tickSaving`:
```
tickOn:  '{book} is now on {class}’s shelf.',
tickOff: '{book} removed from {class}’s shelf.',
```

### The 20-second poll pausing in Set-up (ruling 37, second half)

**Investigated, found already correct, changed nothing.** `shell()` (called by every screen, including `showClasses()`/Set-up) already calls `stopPolling()` unconditionally on entry, and `showClassPage()` re-arms a fresh `setInterval` via `loadWall()` every time it's rendered — including when a teacher returns to it from Set-up. Proved live with two puppeteer scripts against the passcode-gated demo class:
- Opened a class's markbook (one `wall` call fires), clicked "Set-up", waited a full **23 seconds** — no second `wall` call fired (would have if the old interval kept ticking).
- Returned to the same class's markbook from Set-up — a fresh `wall` call fired immediately, confirming the poll resumes.

No code change was needed here; I did not touch this path.

### tools/qa/qa-waits.js — CONTROLS + two new checks

- Added a **rendered-frame check** for the passcode wait-card: opens the staff cover with the transport slowed to 2s (same trick as the existing pupil-side check), samples `getComputedStyle(#st-msg).opacity` twice, 700ms apart, and fails with the exact sentence `the wait card does not breathe in rendered frames — a breath the eye cannot see is not a breath` if the two samples don't differ by ≥0.15 or the element isn't a `.panel-loading` card at both samples. Saves `tools/qa/out/polish/E/passcode-frame-1.png` and `-2.png`.
- Added a **tick-reacts-at-once check**: opens the staff Set-up screen (via `S.openApp(browser, {staff:true})`), slows the transport, clicks the first class tickbox, and — synchronously, before the slowed promise can resolve — asserts the box's `checked` state already flipped AND the message slot is already a `.panel-loading` card. Fails with the exact sentence `a tick waits for the server before it moves — the box flips at once and the card says it is saving`. Saves `tools/qa/out/polish/E/tick-saving.png`.
- **Control ids match `MATHS_GATES_AUDIT.md`'s pre-existing table** (I found this only by running `qa-audit.js` and reading its failures — the audit doc already named rulings 34→`wait-card-still` and 35/37→`tick-waits` before I wrote a line of the gate): CONTROLS are `wait-card-still` (plant `fixture-wait-card-still`) and `tick-waits` (plant `fixture-tick-waits`, covers both the immediate-flip half and the gold-card half in one control, matching the audit doc's own mapping of both rulings to the same control id).
- Both proved: `node tools/qa/control.js --only qa-waits` → **FIRED** for both.
- Pre-existing, NOT caused by this package: `control-with-no-busy-state` and `outbox-dropped-on-reload` still **DID NOT FIRE**. Confirmed via `git diff HEAD -- tools/qa/qa-waits.js` that I never touched the code those controls exercise, and `MATHS_GATES_AUDIT.md` (lines 198–199) already documents this as "known since v4" — a stale/orphaned `mustFail` pattern (e.g. the outbox one does a plain `/outboxReplay/.test(src)` substring check that still matches the plant's own `outboxReplayDISABLED`). Flagged as a background task below; did not attempt a fix, out of this package's scope and rulings.

### tools/qa/fixtures/plants.js

Two new plants, appended just before `verdicts.bad.md`:
- `fixture-wait-card-still` — appends `.panel-loading { animation: none !important; }` to the sandbox's `style.css`.
- `fixture-tick-waits` — edits `staff.js` so the change handler's first line undoes the native checkbox flip (`cb.checked = !cb.checked;`) until the server answers.

### tools/qa/CUT_SCOPE.txt

Added one line + comment for `tools/qa/qa-waits.js` (it wasn't in the original scope list even though this package was explicitly asked to own that file). I initially left this alone since it isn't in package E's named file list, but another package added its own gate file (`tools/qa/qa-human-pace.js`) to this same list mid-run with the same kind of comment, which is clearly the established pattern for this cut — so I followed it rather than leaving `qa-scope` red for no reason.

### tools/qa/MATHS_HUMAN_PACE_INVENTORY.md

No changes — this package added no new `setTimeout`/`setInterval` constant to any client file. `qa-human-pace.js` stays green (105 checks, 35 clocks/35 rows).

### server/Code.gs.template

Not touched. No server change was needed — the tick fix only changes when/how the existing `setActs` call is made and how its answer is displayed, never what's sent or how the server responds.

## Proof

- `node tools/qa/qa-waits.js` → GREEN, 7 checks. Note line: `passcode wait-card opacity: t={"opacity":1,...}, t+700ms={"opacity":0.45,...}, diff=0.550` (≥0.15 required).
- `node tools/qa/control.js --only qa-waits` → `wait-card-still` FIRED, `tick-waits` FIRED.
- `node tools/qa/qa-compositor.js` → GREEN (the `gj-breathe-card` keyframe only animates `opacity, transform`).
- `node tools/qa/qa-scope.js` → GREEN.
- `node tools/qa/qa-strings-ledger.js`, `qa-language.js`, `qa-human-pace.js` → all GREEN.
- `node tools/qa/run.js` (fast tier) → RED only on `qa-repo-prod` (expected, dirty tree) and `qa-audit` (one remaining failure, not mine — see below).
- Screenshots, all in `tools/qa/out/polish/E/`:
  - `passcode-frame-1.png`, `passcode-frame-2.png` — the gold card at opacity 1.0 and 0.45, 700ms apart, pronounced two-line font.
  - `tick-saving.png` — "demo" class's Set-up screen mid-tick: the Handling Data box already ticked, the class line already showing the gold "Saving Handling Data for demo…" card, in the pronounced font.

## What I could not finish, and why

Nothing in this package's own remit is unfinished. Two things outside it, found while running the fast tier, for the lead:

1. **`qa-audit` is red** on exactly one row: `qa-tickbox does not declare a control called "shelf-shows-unticked"` — ruling 36 (the unticked-shelf retirement), owned by a different package, not yet landed as of this run.
2. **`qa-waits`'s two pre-existing controls** (`control-with-no-busy-state`, `outbox-dropped-on-reload`) still don't fire — a real, `MATHS_GATES_AUDIT.md`-documented, "known since v4" defect in the gate's own detection logic (the outbox one's regex matches its own plant's renamed function by substring). I own this file now but it's unrelated to rulings 34/35/37 and I didn't touch that code; flagging rather than fixing under the time budget.

I've raised both as background tasks rather than leaving them only in this file.
