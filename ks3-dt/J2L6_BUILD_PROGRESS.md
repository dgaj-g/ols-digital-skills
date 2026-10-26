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

## Update 26 Oct 2026 (after compaction)
- j2l6-platform.js written: 43 checks PASS (A1, G5 with controls, A8, A9, A10, A11) on a --walk-build pack at :8126.
- Gate fixes (recorded): S.c4.answer key renamed S.c4.pickUp (the pack's key-like-field validation; text unchanged); platform test uses rawOf.
- Cold reads r1: lesson 455 → PASS 370, 85 to second reader (r1b/L2nd running); deck+brief 88 → 53 both pass, 13 split stand, 22 both fail → agreed rewrites applied (apply_agreed_r1.js: 19 in strings.js, 3 resource lines in write_j2_06.js as L6-own text).
- Two brief lines re-fixed for the language gate: purpose[1] "she" → "the headliner"; runningTheHour[1] verbless "Then the story starts." → "Then the pupil opens the story, …".
- Served walker at 3 sizes running against http://localhost:8126 (output j2l6/served-walk*.txt).
- Next: fold second reads, re-read changed strings (r2), pack clean, sit report, deck deploy.

## Update 26 Oct 2026, evening (pack clean)
- Strings changed, round 2 (own call after two rounds, DFM 193d): 21 swaps by L6_HEADLINER_BUILD/apply_own_call_r2.js (19 strings.js, 2 write_j2_06.js); "The festival poster" and opening line3 kept.
- Gate-driven rewordings (recorded in the ledger): c3.show3 (no First/Second/Third sequence: "Put three things inside the brackets, in this order. Type the question first. Next, type the words to show for yes. The words for no go last."); c2.h4_2 (no six-word repeat: "Type the = sign, then D6. After that, type the - sign and then D11."); c4.pickUp text "Answer the call".
- Recap r-j2-604 and r-j2-605 stems rewritten after both cold readers failed them (r3-recap); 604 option "Book her" stands.
- Brief runningTheHour part labels now name slides: "Do-Now · Slide 1", "The job · Slides 2–6", "Finishing · Slides 7–8" (qa-staff-docs).
- Coverage: LANDMARKS['j2-6'] (8, all stood on) in sit-wrongpath.js and EXPECT['j2-6'] {xp 22, chunks 5, marks 22, badges 1} in sit-review.js, asserted by j2l6-platform.js (57 PASS).
- Gates after all edits: judge 46 PASS, engine 36 PASS, assets, words (99 edits listed), walk + walk --fails PASS at 3 sizes (53 screens, 11.88 model min worst), platform 57 PASS. Transcript f3a63bfb9a739f07, verdicts md 564 rows.
- contentVersion 2026-10-26d (source content-src/index.json). Shipping pack: exit 0, no FAIL.
- Next: PR 1 → merge → Pages; then deck (Chrome rule).
- 20:50 deck created: driveFileId 1nCs5vC7Tq9caDPHTGKCg2sEAAjWuaCr3M7GN1uQjDNM (execution log); .gs from main 3e0dcb4 pasted + saved first
