# J1 L6 V2 loose ends → Version 97 (build window, 27 Nov 2026)

Ask (parent session, Damien's "yes, go ahead"): (1) decide the 12 design-window disputed strings myself, log each; (2) second separated cold reader on the build's 18 one-reader strings (two must agree to rewrite, two rounds max, then I decide); (3) a way out of the contest part-way (STOP), partner's screen sensible (Bernadette stands in, same reason both screens), leads to extras + exit check; gate with a control that fails on V96, add to qa-l6-paired; (4) extras Finish button class primary-btn (engines.js:11989), drop p1/xp read-back keys (DFM 402d), decide Ward round badge, fix deck title "Inside the Machine"; (5) full gates, pack, PR, merge, deploy V97, live solo walk, RESUME_HERE (HIS CHECK = paired walk only; STILL HIS empty), memory.
Worktree ~/Sites/ols-wt-l6v2, branch j1-l6-v97 from origin/main 0285a1b8. Next DFM 406, next K131.

## Log
- 13:50 branch made; week usage 50%.

## 14:20 THE 12 DESIGN-WINDOW DISPUTES: DECIDED (my calls; feedback_gate_judgement_not_asking)
1. begin.solo[1] "Bernadette is awake now. She wants to play against you." KEEP. Bernadette is the drawn talking face the whole hour has used since the door; a face that talks is the lesson's premise, not a slip.
2. wait.gone ("link" vs "connection") KEEP "link". The built line already says what happened ("has sent nothing for 30 seconds", agreed by both round-2 readers); "link" is the one word the door, the away card and the score line all use (DFM 397), and "connection" is longer, not plainer.
3. rounds[3].lines[1] "It uses the real names." CHANGE to "This round uses the real names. There are five questions." The sentence before is about the box of a new PC, so "It" can be read as the box. Same facts, no new claim.
4. Q[5].why "...It works out every sum and every step." KEEP. Both facts are true and "step" is the word round 3 teaches four questions later (one step of a sum; the four steps), so the reveal plants it.
5. Q[11].ask "Put the four steps from the film in order, first to last." KEEP. The reader miscounted; there are four blocks.
6. hub.intro (the extras list): CHANGE, name the button. "The lesson stops when your teacher says STOP." becomes a line that says what to do and names Finish the lesson (text set with the way-out strings and read cold by two fresh readers).
7. hub.done "Job done" KEEP. It is a tick label on a job card, read beside the job's title; a sentence would crowd six cards.
8. Sam needs memory KEEP. Lots of things open and slowing right down is the lesson's own memory symptom (Bernadette's memory line).
9. Aoife needs the graphics card KEEP. "the picture on my screen keeps jumping" is the graphics card's job as the operation taught it (it draws the picture on the screen).
10. cust.question "add" KEEP. The whiff and the help both say "the part to add to each PC" on the same screen; the question is read under the customer's PC.
11. fluffMe (fluff vs dust) KEEP. The line names both on purpose: the thing she clicked is fluff, and dust is why it matters.
12. Q[11] "first to last" KEEP. It is the order the film showed; the blocks are numbered 1 to 4 on screen.

## 14:45 CHECKPOINT: the way out is coded (not yet run)
- contest.js: LEFT = N+1; own[] map; hasLeft/ownCh/relabelLeft; leave(); flag '3' worked out on each PC (never in the s map); tick puts 'left' stand-ins; view partnerState 'left'; broadcast returns the push.
- contest-ui.js: phases leave/leaving; #leaveBtn in the top bar (hidden on result/leave/leaving); leaveNow waits for the push (4 s cap) then post('done',{left:1}); reload after leaving re-posts done.
- live.js send returns the push thenable. contest.html: #leaveBtn markup + busy spinner CSS.
- cstrings.js: top.leave, job.leave/leaving, leave{}, wait.left, score.left, help.leave + 14 REWRITES.
- engines.js: done{left:1} -> finishChunk(ctx,'contest=left',0,false) (no ward badge for a leaver); hub Finish button = primary-btn.
## 14:50 TITLE CALL
- DFM 405(b) flagged the deck title. Block b3 "Inside the Machine" holds lessons 6-9, so the lesson repeating the block name is the fault. Lesson j1-06 becomes "The Operation" on the deck (deckName + slide 1), the manifest, the lesson JSON and the Slides file title. Block name stays. l6-walk tile check follows.

## 15:05 CHECKPOINT
- Content: title The Operation (lesson JSON, manifest, deck JSON, l6-walk tile check); badge l6-ward named Head to Head; l6-p1/l6-xp keys deleted; brief STOP row + say line + goesWrong name Leave the contest.
- G12 (l6-contest-test) green; V96 engine control and drop-without-leave control both fail as required.
- qa-l6-paired --scenario leave written, not yet run. contentVersion 2026-11-27c; walk-build packed.

## 15:25 CHECKPOINT
- qa-l6-paired --scenario leave: 19 checks, 0 failed (badge check now reads XP + detail token; the record keeps no badge id).
- l6-contest-look T-leave block added (top bar, pair card, Stay goes back, done left:1, partner's side line, alone card) + --transcript writer. --only leave,solo: 24/0 after adding the missing Next press.
- Next: l6-walk 1366 --transcript, build-packets, two cold readers.

## 15:40 CHECKPOINT
- l6-walk 1366: 46/0 with --transcript. Packets v97-r1-a (34) + v97-r1-b (18) built, hash 75085e9525dc2c33; readers launched.
- Reader b: PASS 14, REWRITE 4 (leave.pair[2], help.leave[0], help.leave[1], rounds[3].lines[1]). Reader a pending.
- Deck Slides edited in place in Chrome: file name "KS3 DT · J1 Lesson 6 — The Operation (Teacher Deck)", slide 1 heading The Operation, slide 7 SAY line. build-deck-gs.js rerun: .gs matches (4 lines).

## 16:10 · round-1 rewrites APPLIED (two readers agreed on each)
- cstrings.js: job.away + fixes.fallbackSit -> "Sit together at one PC. Use yours or a partner's." (r1-b build + v97-r1-a);
  cust.question -> "Which part should the computer shop add to this customer's PC?" (jobs-r1-a + v97-r1-a; extras.js fills no
  placeholder, so the words say it); op.alone -> "You work alone on {me}." (jobs-r1-a + v97-r1-a); leave.pair[2]/alone[2] ->
  "Next you choose from six extra jobs."; help.leave -> "Press Leave the contest to go to the extra jobs." / "Press Stay in the
  contest to go back to the contest."; rounds[3].lines[1] -> "This round uses the real names of the parts. There are five
  questions." (v97-r1-a + r1-b both). REWRITES keys renamed, reasons cite the readers; 3 new entries for the old strings.
- lines2.js teamAlone + alone -> "You work alone on {me}." (my call: the same sentence shows in the operation's team line;
  fixing one copy and not the other would leave the fault on screen).
- content-src j1-06.json keys.l6-x1.explain -> "Memory holds what the computer is working on right now. If memory stops
  working, the computer forgets what it was doing." (r2-b build + v97-r1-a, identical rewrite).
- walk-build repacked. Walk 1366 + leave look rerunning for the r2 transcripts. Next: v97-r2-a/b packets (builder at
  scratchpad/v97/build-packets-r2.js), two fresh cold readers, reconcile, decide, COLD_READ_SUMMARY V97 section.

## 16:45 · cold reads CLOSED, DFM + audit written
- Round 2 (v97-r2-a/b): both PASS 6, REWRITE 4 on the same four paths. My calls (DFM 406): away + fallbackSit -> "Sit
  together at one PC. Use your PC or your partner's PC."; leave.*[2] -> "Next you choose from six extra jobs about computer
  parts."; leave.*[1] -> "You cannot come back." (card budget: pair 24, alone 23); rounds[3].lines[1] -> "The five questions
  use the real names of the parts." (card was 28 words). l6-contest-test 39 PASS, 0 FAIL.
- COLD_READ_SUMMARY.md V97 section appended. DFM 406-411 written. Audit rows for 390-411 (401 + 404 now real rows after
  three HTTP codes in section F were reworded so the gate stops reading them as rules). qa-dfm-audit ALL GREEN.
- Brief goesWrong[8].a reworded without "her" (DFM 65); ledger re-recorded. qa-language ALL GREEN.
- Next: real pack, all gates, commit, PR, merge, deploy V97.

- 17:42 checkpoint: pack EXIT 0 (2026-11-27c stamped). Full gate run going: contest-test, walk683, walk1366, contest-look, jobs-look, channel all PASS; paired running.
- 17:13 gates: all green except two gate-side fixes. (1) qa-l6-paired leave check compared XP totals across two pages that share one localStorage store; Anya lost her op entry in a write race (both pressed Next). Check now reads what each PC sent + each record's own contest key; rerun 20/0; control (leaver gets badge) caught twice-checked. (2) l6-harness solo line expected the old "on your own" wording; now V97 wording; 101/0. qa-exit-resume needs a running server: --port=8126 gave 81/0. Next: commit, PR, merge, deploy V97.
