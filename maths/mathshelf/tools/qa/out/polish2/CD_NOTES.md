# Packages C+D notes — rulings 46,47,48 (12 Sept 2026)

Started: $(date)

## Plan
- staff.js: waitingLine helper + unlock() ruling 46
- strings.js: tickSaving text fix (47), saveInFlight new key (48)
- style.css: .act-saving rule, check disabled button rule
- script.js: OUTBOX_WARN 30000, saveInFlight flag, saveLine(), syncRetry()
- tools/qa/qa-waits.js: re-aim wait-card-still, add pupil save law, controls
- tools/qa/fixtures/plants.js: fixture-passcode-line-still, fixture-outbox-warns-at-eight
- tools/qa/MATHS_HUMAN_PACE_INVENTORY.md: update row


## Progress (checkpoint)
- staff.js: waitingLine() helper added; unlock() uses it with TT('passcodeChecking'); tickSaving call site now busyCard(cmsg, TT('tickSaving')) — DONE
- strings.js: tickSaving -> 'Saving changes…'; saveInFlight: 'Saving…' added beside saveWaiting — DONE
- style.css: .act-saving rule added near .is-waiting; .gj-save-trouble button[disabled] override (opacity:1) added — DONE
- script.js: OUTBOX_WARN=30000 + comment fixed; saveInFlight flag; flushSave guards against concurrent calls, re-schedules if dirty came back true on success; saveLine()/syncRetry() helpers; saveTrouble() creates button pre-disabled when in flight — DONE
- tools/qa/MATHS_HUMAN_PACE_INVENTORY.md: row updated to `script.js :: scheduleSave :: 30000` (confirmed exact key via qa-human-pace.js output) — DONE
- tools/qa/fixtures/plants.js: added fixture-passcode-line-still, fixture-outbox-warns-at-eight after fixture-tick-waits; kept fixture-wait-card-still (no orphan-plant gate found in control.js) — DONE
- tools/qa/qa-waits.js: re-aimed wait-card-still control's plant to fixture-passcode-line-still; passcode sample now checks is-waiting class + ::before animation-name; added CONTROLS entry outbox-warns-at-eight; added new pupil-save-law test block; updated header comment — DONE

## Gate results so far
- qa-human-pace.js: GREEN (105 checks, 0 failed) after inventory fix
- qa-strings-ledger.js: GREEN (0/0 — no outstanding literals)
- qa-language.js: GREEN (87 checks, 0 failed) — pre-existing REPORTED items on approved books unrelated to this work
- run.js --fast: all GREEN except qa-repo-prod RED (expected: dirty tree, 11 uncommitted files incl. other session's statcore.js/DEPLOY.md/CUT_SCOPE.txt). budget: 14 of 120 minutes used. qa-scope PASS (my changes inside cut scope).
- qa-waits.js standalone: GREEN (11 checks, 0 failed) after fixing the pupil-save-law test's transport hook — script.js's pupil call() is a private closure that never goes through window.GJ.app.call (only staff.js's admin calls do); had to install window.OLS_TRANSPORT AFTER the book/exercise is already open (so boot uses the fast offline path) to slow only the save. Passcode line breathes (is-waiting, diff=0.42, ::before animation-name=gj-spin). Pupil save line breathes too (diff=0.417).

## Next
- control.js --only qa-waits
- sit-teacher.js --width 1280 (time permitting)

## control.js --only qa-waits
- wait-card-still: FIRED (plant fixture-passcode-line-still caught correctly)
- tick-waits: FIRED
- outbox-warns-at-eight: FIRED (new control for ruling 48)
- over-tightening: PASSES
- control-with-no-busy-state (plant fixture-renderers, mustFail /with nothing on screen/): DID NOT FIRE
  — pre-existing/orphaned: the string "with nothing on screen" does not appear ANYWHERE in the
    repo except this one CONTROLS line. FIXTURE_RENDERERS (plants.js) has no busy-state fault in
    it at all. This control cannot ever fire as currently wired; not touched by C/D, not caused
    by this session's edits (confirmed via git diff — my qa-waits.js changes never touch the
    `declared.length > 0` check or its surroundings).
- outbox-dropped-on-reload (plant fixture-no-outbox, mustFail /her work would be gone/): DID NOT FIRE
  — pre-existing gate bug: the plant renames `outboxReplay` -> `outboxReplayDISABLED` and nulls its
    call site, but qa-waits.js's source check is `/outboxReplay/.test(src)` with no word boundary,
    so it still matches inside "outboxReplayDISABLED" and the check passes regardless. Confirmed
    the two outboxReplay call/def sites in script.js are untouched by my edits (line numbers moved
    from my insertions above them, but the exact strings the plant matches are unchanged).
  Both flagged in the final report as out-of-scope, pre-existing gate defects — not fixed here per
  "never edit a gate to make a red go away" and per the 45-minute package budget.

## sit-teacher.js --width 1280
- Ran past 200s and was moved to background by the harness; no verdict captured inside the 45-min
  package budget. Brief marks this optional ("if time allows, ≈2 min") — not spent further budget
  chasing it. Not known to be red or green at time of this report.
