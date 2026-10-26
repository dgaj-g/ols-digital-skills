# J2 L6 The Headliner — build progress
Window: Opus 5.5 medium · started 26 Oct 2026 19:10 · his override: keep going to live, ignore usage warnings
Branch j2-l6-headliner · worktree ~/Sites/ols-wt-j2l6

## Done
- Worktree, spec read. Iframe hour at platform/assets/headliner/hour.html (+ hour/*.js), Engines.headliner after Engines.search.
- Gates: j2l6-judge-test (46 PASS), engine-test (36 PASS), words, walk (green: 53 screens, ~11.0 min, 3 sizes), assets.
- Content writer: KS3 DT Platform/L6_HEADLINER_BUILD/write_j2_06.js (lesson, recap r-j2-601..605, manifest, deck JSON). Deck id pending.
- qa-brief-shape REDESIGNED includes j2-06. record-tutorial/node_modules symlinked from stale clone (git-excluded).
- Pack gate faults fixed (only ledger records left): see "Strings changed".

## Now
- Cold reads r1: L6_HEADLINER_BUILD/cold-reads/r1/{L1..L6,BD-A,BD-B} (transcript hash 831182960f3f0d86). Fold: L6_HEADLINER_BUILD/fold_cold_reads.js first|second|md.

## Next
- fold → pack clean → j2l6-platform.js (A1–A13 + G5) → served walker + sit report → deck deploy (Chrome rule) → writer --deck <id> → pack, build-pathb, Apps Script V75, smoke → PR, merge, RESUME_HERE, DFM 336/K85, remove ols-wt-j2l5.

## Strings changed (record)
- S.sheet.locked added = "This box is not yours to change" (spec §6.3, build-supplied). Also lighter, nextTime, soundOn, soundOff added.
- Brief (DFM 65/26/72 gate fixes, 26 Oct): she/her → the pupil/pupils/they in purpose[0..1], prepare[0], runningTheHour, goesWrong; "girl" → pupil; verbless lines given verbs ("The platform asks five questions…", "Pupils answer three questions…", "Pupils add VAT…", "The pupil can try three free tasks…"); resource "IF in D13 decides whether to book the headliner".
- c2 h3 (DFM 35 gate): "Click D3, then press Fill down. It does the drag for you." (was "press the Fill down button"; the gate wants the button word in engines.js).
- vocab.json "ticket": J2 ordinaryWord declaration (festival ticket).
- write_j2_06.js: config.strings now strips brief/deck/recapPool (they are judged in their own places).
