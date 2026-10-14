# J3 L5 TWO LIGHTS — build progress (Opus 5.5 medium window, 14 Oct 2026)
Worktree ~/Sites/ols-wt-l5, branch j3-l5-twolights from origin/main 896eef6.
Spec of record: Claude Work/KS3 DT Platform/J3_L5_TWO_LIGHTS_SPEC.md

## Build notes (decisions inside the spec's room)
- N1 Channel: RTDB rules allow only rooms/$code/{presence/$s:number, $seat/$push:{j,t}}. Spec §6 shapes are
  carried as typed messages pushed under the sender's seat (L6 OPLIVE pattern). Rules unchanged (law 15).
- N2 PairKit: room + hooks.quiet copied byte-identical from L6 branch j1-l6-operation so the merge is trivial.
- N3 Content source = Claude Work/KS3 DT Platform/content-src/j3 (packed by tools/pack-content.js into ks3-dt/content).

## Steps
1 worktree DONE
2 art gate — 
3 gates — 
4 prototype — 
5 engine — 
6 content — 
7 gates run / walks / sit report — 
8 deck deploy — 
9 pack + deploy + PR — 

## Step 2 art gate — STOPPED after round 2 (14 Oct 2026)
- Round 2 readers A and B: Q1 YES, Q3 YES, Q2 NO. Both: worried puffins are not readable at boat size (fine in the close-up). Reader A also: awake is close to neutral. Reader B also: the cheer boat looks neutral until the hats go up.
- Control (flat smile/cheer) said NO as it should: the gate discriminates.
- Two rounds used: per the prompt, stopped for Damien. Verdicts: L5_PROTOTYPES/art-gate-r2-*.md; image twolights-art-test.png.
- Build notes still to record: N4 multi-line editor (Enter = new line; Ctrl/Cmd+Enter, Shift+Enter, RUN button run). N5 S3 = first body line not indented; ladder/bar line numbers come from the real fault line.
- L6 peer (14 Oct): L6 now takes contentVersion 2026-10-14b → L5 bumps to 2026-10-14c or later. L6 also adds a DFM_ENFORCEMENT_AUDIT section D row for rules 332 + 333: rebase onto it, don't clash.

## Art rounds 3–5 (14 Oct 2026, his standing word: judge it myself, eye + agents)
- R3: both readers Q2 NO (inset too small; cheer eyes read calm). Fixed: open shining cheer eyes + laughing mouth, inset 170×92, worried "o" + frown.
- R4: A YES/YES/YES; B Q2 NO (awake ≈ smile at size, inset faces alike); control NO (correct).
- R5 fix: awake = round alert "O" mouth (smile keeps crescent eyes + grin + sparkles); window South Light 23 (was 18); inset puffins vary in size, height, tilt. Readers running.

## Build notes N6–N7
- N6: S1 (lamp_oon) and Q3 (lamp_on() call deleted) hit the same line, so S1 pairs only with Q1Q2 → 7 ch4 variants per seat (S1+Q1Q2; S2/S3 × Q1Q2,Q1Q3,Q2Q3) = 21 gated in real Python, not 27. Seeding base = hash(room)%7, seat i = VARIANTS[(base+2i)%7] → seats always distinct.
- N7: traceback file names north_light.py / south_light.py / lightship.py.
