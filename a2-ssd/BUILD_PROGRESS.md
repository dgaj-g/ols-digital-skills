# A2 SSD Platform — BUILD PROGRESS (checkpoint file; everything that matters lives here)

Window: Opus 5.5 XHIGH (his ruling 27 Sep 2026). Prompt: "Claude Work/A2 SSD Platform/BUILD_PROMPT_OPUS55_XHIGH.md".
Worktree: ~/Sites/ols-wt-a2 (branch a2-ssd-build). Private src: "Claude Work/A2 SSD Platform/src/".

## Checkpoint 1 — 27 Sep 2026
- Worktree made; judge/content/seeds/tools copied; controls 484 GREEN; judge + content moved to private src (D2).
- DECISIONS D1–D5, FOUND F1–F6 written.
- Next: content audit per cluster → gates G1/G2 → seeds for the nine missing papers.

## Checkpoint 2 — 27 Sep 2026
Content audit done (SPEC, judge, markpoints, every part). Decisions D6–D8 written. Next: prototype read, then gate G1 (tools/g1-judge.js) with the written-exam variant battery; confirm harshness candidates (bracket-less VALUES, bare/unclosed getdate and brackets, unclosed quote, 2021-b ORDER BY anchor, bracket-worded hints) with failing controls; fix judge in src.

## Checkpoint 3 — 27 Sep 2026
- G1 built (tools/g1-judge.js): controls + written-exam battery + read-as-far-as-it-goes + must-cost + punctuation scan. G1 PASS — 1559 checks. Judge fixes F7–F11; decisions D9–D11.
- Six separated Sonnet readers writing answer-space controls (gates/answerspace/answers-1..6.json, private) from brief-1..6.json.
- Next: exact-input controls in controls.js; G2 seeds for 2017–2026 + Tinies; then adjudicate the answer space.

## Checkpoint 4 — 27 Sep 2026
- F12: bracketless groups (COUNT x, DATEDIFF a, b, c, FOREIGN KEY x, PRIMARY KEY a, b, CHECK x, IDENTITY 1,1, INSERT column list, later VALUES rows) now read in full; stray-) opener may not break a fitting group. G1 battery gains "both brackets dropped". controls 525 GREEN; G1 PASS 1660.
- Answer-space readers (6) still running. Next: G2 seeds.

## Checkpoint 5 — 27 Sep 2026
- G2 built (tools/g2-seeds.js): shim battery; every paper table/field/alias; every SELECT model (papers + twins) ≥1 row on nine anchor dates; every CREATE runs, every other statement compiles. G2 PASS — 397 checks.
- Tinies seeds 1–4 written (traps beside the wanted rows). Shim fixes F14–F17; D12–D22 logged.
- Answer-space readers: 1 (465 controls), 3 (570), 6 (285) done; 2, 4, 5 running.
- Next: 2023-c CLEAN decision; adjudicate answer space when readers land; content (quick checks, lessons, F twins); pack-content; server; client; G3–G5; deploy.

## Checkpoint 6 — 27 Sep 2026
- Answer space settled: six reader sets, 3,135 controls, 0 disagreements; 40 recorded rulings in gates/answerspace/adjudicated.json (private). G1 step 6 runs it; control (adjudications removed) turns G1 FAIL.
- controls 543 GREEN (EX block pins each engine change); G1 PASS 4793 checks. F18–F23, D23–D26 logged.
- Next: content — quick checks, lessons, twins, {today}, strings.json, cold reads; then pack-content, server, client, G3–G5, deploy.
