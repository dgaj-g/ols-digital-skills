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
- R5 RESULT: A YES/YES/YES; B YES/NO/YES; control NO (correct). B's NO cites only "neutral"/"calm", which my prompt named in error. The sheet (and the lesson) uses asleep/awake/smile + worried/cheer, and B called every shown state distinct. ART GATE PASSED by judgement (eye + both readers agree on every state that exists). Step 2 DONE 18:35.

## 19:45 · l5-redtext gate PASS
- `node tools/record-tutorial/l5-redtext.js` → PASS · all 754 match python3 byte for byte (166 core, 588 generated mistakes; real script runs, python 3.14).
  Outcomes in python3: IndentationError 119 · NameError 259 · SyntaxError 201 · TypeError 42 · UnboundLocalError 1 · ValueError 1 · clean 131.
- CONTROL (`--control`: suggestion MOVE=1 + caret marks swapped) → `l5-redtext: FAIL · 151 of 754 differ from python3`
  first FAIL line: `FAIL A ch1 stage 1 [red]` (caret line `^^^^^^^~~` vs `~~~~~~~^^`).
- Script-mode rules learned: 'return' outside function shows the line + carets; EOF "expected an indented block" names the file's LAST line, shows it, no caret.
- NEXT: judge.js + l5-judge-test.js, then effects/clock/words/walk gates, channel port, A1–A14.

## 20:05 · judge, effects, clock gates PASS (each control fails)
- judge.js (line reader, §5.5; red/console words from PyRun) · l5-judge-test PASS 909 checks · CONTROL (case-folded judge) → `FAIL control capital L faults · got [] want [S1]` · `l5-judge-test: FAIL · 2 of 909`.
- l5-effects-test PASS 207 states vs python3 · CONTROL (radio ignores return) → `l5-effects-test: FAIL · 78 of 207`.
- clock.js (pure f(room,now,budget)) · l5-clock-test PASS 188 · CONTROL (drift from chapter open) → `FAIL budget 300 s no drift before the first key at 6000` · `FAIL · 8 of 188`.
- N8: shouting = Python shows red. S2 with Q3 sleeps (lamp_on never called → the + never runs) until she adds lamp_on(); then the TypeError appears. Found by the judge gate; Python's truth kept.
- N9: pause is a room event (pauses[] in the room record) so every seat's boat agrees; reload recomputes exactly.

## 20:20 · words gate PASS; lost calls typed anywhere
- strings.js = every §8 string (90). l5-words PASS 371 checks · CONTROL → `FAIL ctl.long · 16 words in a line (max 12)` · `FAIL ctl.bare · a number without its thing` · `FAIL · 2 of 376`.
- N10: solo symptoms "The light is out." / "The radio sent None." derived from §6's one example "The horn is silent.".
- N11: tour spotlights and the top line are CARDS (each sentence its own line, ≤ 12 words each): tour 5/6 and the trio top line are 13 words as the spec writes them. Poster title and line shown apart.
- N12: a lost call typed back anywhere (help: "Type lamp_on() on a new last line.") counts as that call. Judge gate now 1017 checks PASS.
