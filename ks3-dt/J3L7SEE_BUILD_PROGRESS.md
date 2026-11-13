# J3 L7 Teach It To See — build progress (Version 80)

Updated 13 Nov 2026, 14:05. Worktree ~/Sites/ols-wt-j3l7see, branch j3-l7-see. Build prompt: KS3 DT Platform/J3_L7_SEE_BUILD_PROMPT.md.

## Done
- Engine wiring (Engines.see), assets/see ported, lesson JSON, recap pool, manifest (status stays "ready": "live" is not a status the platform knows), deck JSON (8 slides, deck id pending).
- Cold reads: two rounds + author's call; all in the ledger; COLD_READ_VERDICTS_V80_j3-07.md written.
- Gates written and green: j3l7see-engine.js (G1–G5 with controls). Shared robot pupil: j3l7see-lib.js.
- Coverage: LANDMARKS['j3-7'] (sit-wrongpath.js), EXPECT['j3-7'] (sit-review.js, still TO MEASURE), stretch flag on the chunk, DFM audit rows 378 and 379.
- Local pack (--offline) GREEN. contentVersion 2026-11-13a.

## Found, being fixed
- The real lesson frame is the window minus 141 px (measured: 659, 627, 759, 627 px tall at 1280x800, 1366x768, 1440x900, 1024x768). The prototype assumed more. At 1366x768 the buttons under the drawing box fall off the bottom. Fix = hour.html layout only (no strings, no engine). Lib default BAR must become 141.

## Still to do, in order
1. Fix hour.html so every screen fits the real frame at all four sizes. Lib BAR 141.
2. Gates: j3l7see-words.js, -job.js, -help.js, -fit.js, -walk.js, -save.js (save = platform gate, model j3l6-platform.js; it stands on LANDMARKS and measures EXPECT). Each with a failing control.
3. Sit report J3L7SEE_SIT_REPORT.md. Look at the screenshots.
4. Deck shots, deck deploy (Chrome rule), online pack, PathB build, Version 80, live smoke at 1366 and 1024.
5. PR, merge, RESUME_HERE top block, DFM/K rulings + audit rows, done message.
