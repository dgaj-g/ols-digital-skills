# J3 L6 The Night Desk — build progress
Updated 26 Oct 2026.
- Worktree ~/Sites/ols-wt-j3l6, branch j3-l6-nightdesk.
- DONE: gates judge/data/engine green with controls failing; words + assets gates written (fail until surfaces exist).
- DONE: hour/{query,data,judge,sound,strings,donow}.js ported; strings edits 92→91, 1,847→1,846 recorded in j3l6/string-edits.json.
- NOTE: data.js row 1 "Aoife" vs spec §22.13 "Niamh": recorded, data.js not edited.
- NEXT: hour.html + bridge.js + main.js; j3l6-walk.js; j3l6-platform.js; Engines.nightdesk; content.

## Checkpoint 26 Oct 2026 — hour + engine
- hour/main.js written (ports prototype screens onto J2 plumbing). Walk gate j3l6-walk.js PASS: 41 screens, 11.0 model min at 3 sizes; --fails 44 screens 12.67 min; G4 + G6 PASS.
- Front page tightened (namerow, max-height CSS). render() no longer reads a stale box into st.q.
- Engines.nightdesk appended to engines.js (save/badge/frontpage/done).
- Next: content j3-06.json, manifest, recap pool, deck, credits; then words gate with walk dirs; platform gate.

## Checkpoint 26 Oct 2026 — gates green, sit report, cold reads
- Content written (write_j3_06.js in Desktop L6_NIGHTDESK_BUILD); packed with --walk-build for preview.
- Served (:8136) walk PASS 41/11.0 at 3 sizes, --fails 44/12.67; platform gate j3l6-platform.js PASS 66 checks, control CONTROL OK.
- sit-review.js EXPECT j3-6 {xp 22, chunks 5, marks 22, badges 1}; sit-wrongpath.js j3-6 landmarks.
- Sit report ks3-dt/J3L6_SIT_REPORT.md written. New stall fixed: boxHint shortened to "Type a rule, then press Enter" (string-edits.json).
- Cold reads r1 in Desktop L6_NIGHTDESK_BUILD/cold-reads/r1 (L1–L6, BD-A, BD-B). Fold with fold_cold_reads.js first → r2 --only second-paths → second → apply agreed → md.
- NEXT: fold, rewrites, qa-language 0, re-run gates; deck deploy; pack + V76; PR; records.

## Checkpoint — cold read r1b folded (26 Oct 2026)
- Second reader on 105 lesson lines: PASS 15 (recorded), agreed rewrite 90. Applied via L6_NIGHTDESK_BUILD/apply_agreed_r2.js (84 swaps + 6 same-words).
- Then cut back by the build's own call so every sentence ≤ 14 words, every screen ≤ 40 prose words and the hour inside its time: all logged in j3l6/string-edits.json.
- j3l6-words.js now matches cold-read edits (ledger-path keys) by their old words (BYTEXT); manifest tagline kept in step by write_j3_06.js.
- Gates on served :8136: walk PASS 41 screens 11.21 min; --fails PASS 44 / 12.95; words PASS 96 checks over 85 walked screens; platform PASS 66; judge PASS; engine PASS.
- Next: round 2 cold reads (L1 + L1B lesson; BD-A + BD-B deck/brief) on every changed line, fold third, own call, qa-language.

## r2 cold reads launched (22:47)
Six readers on r2/{L1,L1B,L2,L2B,BD-A,BD-B}. fold third now pairs L2/L2B. Sit report numbers updated to 11.21 / 12.95.
- 26 Oct: cold read r3 (two readers on the 30 r2 own-call lines): 13 PASS recorded (apply-4.jsonl); 17 both-failed on the same fault, readers' wording taken (apply_own_call_r3.js), trimmed for 14/40 rules; r4 two-reader read running on those 17. Gates: walk PASS 41/11.26, fails 44/13.02, words PASS 96, judge/engine PASS, platform PASS 66, control OK (no-lesson build via KS3DT_SRC scratch copy). Transcript hash fa6bde727b86be16.
- 23:16 r4 folded (apply_own_call_r4.js): 5 PASS filed; 6 lines judged on pre-trim text + 8 both-fail own calls (reader B wording; c6 reasonNo + c3 show1 own words) → r5 two-reader read of 12 lines running. All lesson gates green after show1 trim (walk 41/11.28, fails 44/13.03, words 96, judge, engine). Next: fold r5 → ledger 0 → qa-language → PR1 → deck (Chrome rule).
- 23:25 r6 folded: 7 PASS filed; own call show1 (B cut to screen) + prepare[1] (A); gates green; r7 read of show1, prepare[1], stampAsk, letter2 running.
- 26 Oct late: cold reads closed (r11/r12 on brief goesWrong[2], own call, r12 filed as record). qa-language ALL GREEN, ledger 0 missing, all gates green. PR #93 (lesson + deck art) MERGED → main e9d9576.
- BLOCKED (his action): opening the deck project 1Wg30Cxm…/edit?authuser=1 in his Chrome goes to Google's "Verify that it's you" for dgartland021@c2ken.net. Password entry is his. Once re-signed-in: paste .gs from main e9d9576 → createJ3Lesson6Deck → id → write_j3_06.js --deck <id> → proofs → deck gates → PR2 → pack → build-pathb → V76 → LIVE smoke → records (DFM 337, K86).
