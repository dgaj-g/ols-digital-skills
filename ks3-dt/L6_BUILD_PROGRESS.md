# J1 L6 THE OPERATION — build progress (Opus 5.5 medium)
Prompt: KS3 DT Platform/J1_L6_OPERATION_BUILD_PROMPT.md · Spec: J1_L6_OPERATION_SPEC.md
Worktree ~/Sites/ols-wt-l6 · branch j1-l6-operation · from origin/main 6247ca9 (prompt said c418760: stale)
Usage at open: 5h 13% · week 51% — week hard stop OVERRIDDEN by his "carry on" (meter still printed).

## Architecture (decided)
- Rescue pattern: Engines.operation mounts an iframe page platform/assets/l6/operation.html (+ engine2.js, lines.js, lines2.js, ui2.js, live bus).
- Stage by chunk.config.stage: door | op | ward | letter. Room + seat from the pair payload (server: pairMatch_ adds room for j1-06).
- Firebase model: rooms/{code}/{seat}/{n} = {j: move JSON <200 bytes, t}; rooms/{code}/presence/{seat} = tick. No identity.

## Gates
- l6-engine-test.js: 89/89 green on the build. Controls fail as they must (8 controls).
  RED on a broken build (told rule mutated to 3 wrongs): `FAIL second wrong → told, sealed with the told tag`, `FAIL told bar line`, `FAIL chart has one line credited to A`.

## Steps
- [x] worktree, prototype copied to platform/assets/l6 + img/l6 (CREDITS carried)
- [x] l6-engine-test
- [ ] l6-look · l6-harness · l6-channel-test
- [ ] Firebase (DAMIEN stops) · vendor SDK · live-test.html
- [ ] engine + server · content · film · gates · walker + SIT REPORT · pack · deploy · smoke · PR · RESUME_HERE

## Firebase (14 Oct 2026, 13:16)
- Project `ols-ks3-dt-live` (Spark), parent org c2ken.net, owner dgartland021. Analytics off, Gemini off.
- RTDB europe-west1: https://ols-ks3-dt-live-default-rtdb.europe-west1.firebasedatabase.app
- Rules = platform/live/database.rules.json, PUBLISHED via Cloud Shell REST PUT (console Publish button absent). Response {"status":"ok"}.
- Rule checks by curl: good-code read null ✓; bad code / root read denied ✓; good write ok ✓; seat D denied ✓; extra field denied ✓; stale t denied ✓; presence ok ✓; test room deleted.
- Next: register web app → platform/live-config.js; DAMIEN owner stop.
- Web app "KS3 DT platform" appId 1:831317210522:web:8790b76f693937c21bb623 → platform/live-config.js (apiKey verified valid).
- Personal Gmail added + accepted as Owner (13:30).
- Vendored firebase compat 10.12.2 + CREDITS. live-test.html LIVE via PR #76 (merged a41411a): https://dgaj-g.github.io/ols-digital-skills/ks3-dt/platform/live-test.html — 25 ms from the Mac. OWED: his pupil-laptop sentence.

## 14:02 checkpoint
- Film gate qa-l6-film.js PASS (24.7 s). Controls caught: "film is 70.0 s, over 60 s"; "beat 3 holds 1 s, needs 2.95 s"; "burned captions differ from scenes/l6.js"; "beat 4 has no caption on screen".
- Design calls: boss/names/machine = operation frame stages; exit item 3 = parsons chunk c8b; extras zone (machine + letter jobs) sits BEFORE the exit check (DFM 265), finish label on hub + every job; new strings use "Tap" to match approved frame.
- Pupil cold read packet-A (116 strings): r1 107/9, r2 98/18. Applied only BOTH-agreed rewrites (tagline, trioHoldSay, soloTitle, exit item 1 stem, c8b doneText, names.again, ward needed "memory part", darkStill). 97 ledger rows written; lesson strings missing = 0.
- Teacher brief + deck merged (qa-brief-shape PASS, j1-06 held to 60). Teacher/deck cold read packet-B (137 strings) running, two readers.
- Engine test 89/89 after rewrites.
- NEXT: walker cannot reach inside the operation iframe yet -> add operation movers + LANDMARKS/EXPECT for 6; l6-channel-test, l6-look, l6-harness; server sweep/ping; pack/deploy.

## 14:35 checkpoint
- Wording: "Tap" changed to "Click" across the lesson, brief, deck and frame (qa-language bans tap; DFM 138.1.6). The cold readers read "Tap"; same meaning. l6-engine-test re-pointed: 89/89 PASS.
- Teacher brief merged into j1-06.json; DFM 65 (no she/her) and DFM 72 (no verbless lines) fixes; teacher cold read packet B r1+r2 done; only agreed rewrites applied. COLD_READ_VERDICTS_L6.md written (## LESSON 6).
- Ledger: missing 0; qa-language ALL GREEN.
- Walk coverage: LANDMARKS['6'] (20) in sit-wrongpath.js, EXPECT['6'] placeholder in sit-review.js, early exits in both pointing to new tools/record-tutorial/l6-harness.js.
- l6-harness FIRST RUN = RED (21 of 29 failed: Lesson 6 not packed yet, tile locked). FAIL lines: "FAIL the lesson reaches its done card (null)", "FAIL stood on: the Do-Now" … "FAIL stood on: the closing screen".
- Pack blocked by qa-deck-shots: 15 stale shots in j2-03, j2-04, j3-03 (packed content of 8 Oct newer than the shots; same on main). Re-capturing with capture-teacher-layer.js --base http://localhost:8126 (log in scratchpad capture.log).
