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
