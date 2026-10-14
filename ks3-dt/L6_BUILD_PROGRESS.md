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
