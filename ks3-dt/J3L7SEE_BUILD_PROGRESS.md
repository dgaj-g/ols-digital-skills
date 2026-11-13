# J3 L7 Teach It To See — build progress (Version 80)

Updated 13 Nov 2026, 14:40. Worktree ~/Sites/ols-wt-j3l7see, branch j3-l7-see. Build prompt: KS3 DT Platform/J3_L7_SEE_BUILD_PROMPT.md.

## Done
- Engine wiring (Engines.see), assets/see ported, lesson JSON, recap pool, manifest (status stays "ready": "live" is not a status the platform knows), deck JSON (8 slides, deck id pending).
- Cold reads: two rounds + author's call; all in the ledger; COLD_READ_VERDICTS_V80_j3-07.md written.
- Gates written and green: j3l7see-engine.js (G1–G5 with controls). Shared robot pupil: j3l7see-lib.js.
- Coverage: LANDMARKS['j3-7'] (sit-wrongpath.js), EXPECT['j3-7'] measured: xp 10, chunks 2, marks 10, badges 0, stretch flag on the chunk, DFM audit rows 378 and 379.
- Local pack (--offline) GREEN. contentVersion 2026-11-13a.

## Fixed and gated since 14:05
- hour.html fits the real frame (window minus 141 px) at all four sizes: fit() + tight/stack/squeeze. Help no longer points at a hidden button. No strings changed.
- ALL SIX page gates + the platform gate GREEN on the served lesson, each with its control failing:
  j3l7see-words (3), -job (3), -fit (3), -help (8), -walk (17), -save (45, platform at localhost:8137).
  Walks: 79 screens (her own drawings) and 81 (the stranger) at 1280x800, 1366x768, 1440x900, 1024x768; 0 errors, never stuck. Page save 6557-6628 of 7600; whole lesson draft 6457 of 8000.
- Save gate proves welcome-back from the PLATFORM's draft alone (page's own localStorage wiped first), end questions filed once (record [2,10,..]), page stays open.

## Still to do, in order
1. Forced minutes + sit report ks3-dt/J3L7SEE_SIT_REPORT.md. Look at the screenshots at all four sizes.
2. Deck shots (capture-deck-shots rows + CHROME_PINS j3-07), deck deploy (Chrome rule), `node write_j3_07.js <deckId>` and `node write_j3_07_deck.js <deckId>`, proofs read, qa green.
3. Merge origin/main if moved; re-run every gate; online pack (bump contentVersion if content changed); build-pathb; Version 80 via hidden window; pair hashes; live smoke at 1366 and 1024.
4. PR "J3 L7 Teach It To See — Version 80", merge, RESUME_HERE top block, DFM (next 380) / K rulings + audit rows, done message.

## Run the gates
cd ~/Sites/ols-wt-j3l7see/ks3-dt/tools/record-tutorial; server: python3 -m http.server 8137 from the worktree root.
NODE_PATH=$(npm root -g) node j3l7see-<words|job|fit|help|walk>.js --url http://localhost:8137/ks3-dt/platform/assets/see/hour.html ; node j3l7see-save.js

## 15:25 checkpoint
- Teacher deck CREATED: id 1SRGKjmilrd4nV5fpv8jUk873JCcnu3-zmDFFVooiSbU (8 slides). Ids written into lesson + brief. Branch HEAD 5ebf2ec0 pushed.
- Deck pictures + backgrounds live on Pages via PR 118 and PR 119 (already merged to main).
- contentVersion 2026-11-13c; offline pack green.
- Slide Decks script project holds a temporary first line (aaRunExportJ3Lesson7Proofs) — replace with the exact repo .gs at the end.
- REMAINING: read 8 proofs; restore exact .gs; re-run all gates; online pack; build-pathb; Version 80 deploy; live smoke 1366 + 1024; PR + merge; RESUME_HERE block; DFM 380+ rulings with audit rows; done message.

## 14:43 — VERSION 80 DEPLOYED
- Confirmation read "Version 80 on 13 Nov 2026, 14:42"; Deployment ID unchanged; description "V80 13 Nov 2026: J3 L7 Teach It To See" (house style, no long dash).
- Pair hashes: PathB_Code.gs ea4a5ee2156bdc6b27edcde67c1a7735 (unchanged) · PathB_Index.html 9b9c1347fe05756dfd9f74d34488073f; editor compared equal to raw at 1aaa4da after a reload.
- Before deploy: words, job, fit, help, walk, save, engine all PASS; online pack clean at 2026-11-13c; 8 deck proofs read; Slide Decks project = repo .gs (compared equal).
- REMAINING: PR + merge; Pages live check; live smoke 1366 + 1024; RESUME_HERE; DFM 380+ / K127+ with audit rows; close Chrome tab; done message.
