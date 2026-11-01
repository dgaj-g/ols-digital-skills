# J3 L5 V2 "Same Light" — build progress
Window: Opus 5.5 medium · started 1 Nov 2026 ~15:50
Worktree ~/Sites/ols-wt-l5v2 · branch j3-l5-samelight · base origin/main 70afbcf · live V76 · target V77

## Step 1 — setup: DONE
- Worktree made; sessions checked (no other deploy window).
- Spec + prototype engine read. Prototype lib/* == live assets/twolights/* (judge, programs, pyrun, clock, art, sound).

## Step 2 — gates: IN PROGRESS (16:18)
- l5v2-lib.js shared (engine loader with mutation controls, bot simulator, FIX table).
- A6 fold PASS · control RED (Fixer RUN in step 1 changes state).
- A7 steps PASS · control RED (Fixer RUN live).
- A8 help PASS · control RED (ladder names line 4, red names 9).
- A11 clock (node half) PASS · control RED (boat drifts before first RUN). Pace half waits for built hour.
- A1 words: §8 byte-for-byte PASS; controls RED; §9 exit questions FAIL until j3-05.json rewritten (step 4).
- To write: A2 tour, A13 reload (puppeteer, need built hour), qa-l5-paired (A4/A14/A15).
## FAIL lines
- 16:18 A1: exit 2 options / exit 4 stem / exit 5 stem+options differ from spec §9 (content still V1) — expected, fixed in step 4.
- Earlier gate-own bugs fixed (not product): steps probes by time not event; help red = last File line N; clock kept prefix.
## 16:43 checkpoint
- Step 4 content: j3-05 V2 in staging content-src-l5v2 (NOT in git: private source; excluded via .git/info/exclude). A WIP commit at 16:33 pushed it by mistake; amended + force-pushed the branch within a minute (branch ref no longer holds it).
- Cold read V77 j3-05: two readers, two rounds (J3_L5_REDESIGN/cold-reads/build/{A,B,R2-A,R2-B}); 9 agreed r1 rewrites, 8 applied, exit q4 kept (spec §9 byte for byte; t3 teaches "hands back"); r2 help → numbered list. Verdicts: KS3 DT Platform/COLD_READ_VERDICTS_V77_j3-05.md, hash 688c8e970ecd51ab.
- Deck: slide 7 "extra posters" → "more faults to fix" (DFM 338: V2 has no posters); notes same; chunk refs radio/ch4 → twolights. .gs rebuilt (KS3DT_DECK_ROOT=content-src-l5v2). The Google Slides deck itself must get the one-line change at deploy (run the .gs).
- contentVersion 2026-11-01j3l5. PACK rc=0. A1 words PASS (control RED).
- A2 tour gate written (l5v2-serve.js + l5v2-tour.js): FAIL 1366/1600 px card 4 covered the step bar → ui.js renderTour fixed (measures card, side placement only when room) → PASS 40 cards; control RED 16.
- NEXT: A13 reload gate, qa-l5-paired (real Firebase), A11 pace, A5 python3, walkers ×3 sizes, SIT report, then deploy (step 6).
## 17:40 checkpoint — step 5 gates
- A13 reload, A11 pace, A5 python3, A12 walker: green (see earlier runs in this window; re-run before pack).
- qa-l5-paired V2 (real Firebase channel, platform pages): pair PASS 14 · reload (A4) PASS 18 · gone (A15) PASS 12 · blocked PASS 12 · trio (A14) PASS 17 · CONTROL (second PairKit.ensure) RED 1.
- Product bugs found by the gates and fixed:
  1. live.js: '.info/connected' could fire before `api` existed → page error "Cannot set properties of undefined (setting 'connected')". Guarded.
  2. ui.js renderLink: the "partner has gone quiet" bar never showed (test `live.quiet(s,1e12)===true` never true). Now uses the fold's st.gone. Prototype has the same bug (prototype not edited).
  3. engines.js twolights: a badge saved a moment before 'done' could race the finish save (trio run lost j3-b15 for one seat once). The finish now waits for badge saves in flight.
  4. ui.js home badges: replace('Bounty earned: ') → replace('Badge earned: ') so the chips read "Red Reader" not "Badge earned: Red Reader".
- Gate-own fixes (driver): soundDone option; watch tolerates passed phases; looser named wait; point click short timeout + re-loop (screen had moved to fix).
- V1 gates retired to tools/record-tutorial/retired/ (*-v1.js). sit-review EXPECT j3-5 → 49 XP, 5 chunks, 3 badges.
- NEXT: final all-scenario run, bare walks ×3 sizes + control, SIT REPORT, commit/push, deploy.
## 18:10 checkpoint — step 5 DONE
- qa-l5-paired --scenario all: 73 checks PASS (pair, reload, trio, gone, blocked); control RED.
- l5v2-walk: 18 walks (pair/solo/trio × right/wrong × 683/760/1366) PASS; reload walk 34 reloads PASS; reload control RED.
- A1/A6/A7/A8/A11 PASS with built-in controls RED; A2 tour PASS, control RED 16; A5 redtext 833 vs python3 PASS; judge 1017, clock 188, effects 207, sound 5 PASS.
- Further product fixes: swap card "Fault 8 of 7" after the last fault (ui.js, f.no < E.TOTAL); link bar pushes the page down (body.linkon).
- SIT REPORT written: ks3-dt/L5V2_SIT_REPORT.md.
- NEXT: step 6 deploy (re-read RESUME_HERE 1–40, Chrome rule, pack, build-pathb, Apps Script version, PR, smoke as two pupils).

## DEPLOYED — 1 Nov 2026, 18:00
- VERSION 77 live, deployment id unchanged, description "V77 1 Nov 2026: J3 L5 Same Light (PR 96 + PR 97)". Code.gs ea4a5ee2… unchanged; Index.html 0772d98d3e8cbaef9ad3782ed0488993 = raw at 1f77380.
- main 1f77380 = PR #96 (lesson) + PR #97 (deck stop slide names "Short of time?"; contentVersion 2026-11-01j3l5b).
- Deck 1SD1-XW5KmBXLnvde1SrwPca10f7HLxslikDyL97pgdE rebuilt in place, 8 slides, read back clean.
- Live smoke on Pages: l5v2-walk pair 683 + 1366 PASS; reload walk 37 reloads PASS; qa-l5-paired live: pair, reload, trio PASS; gone + blocked RED only because live gives test speed to staff and localhost only (engines.js 11492); blocked pair still finished, records done (DFM 374).
- Records: DFM 370–373, K116–K119, RESUME_HERE block below the top block, memory note updated.

## V78 — "Help you can see" (his approval 1 Nov 2026, ~19:30)
His words: "it can't say katie, it has to say your partner because they can't be told who they're working with until the end. apart from that, these suggestions are fine. however, it needs to be explicit that help is available and how both in the lesson itself (signpost it and alway make it colourful, animated and eye-catching) and the teacher deck."
Branch j3-l5-v78-help (from main bedcb45). Nothing edited yet at 19:55.

### (a) Partner signals (pupils are RANDOMLY paired across the room; never side by side)
- Fixer button "I'm stuck": Point and Fix steps. Reader(s) see "Your partner is stuck. Press Help: it opens on both screens." and their Help button pulses. It also opens the Reader's code box 30 s after the signal (instead of 90 s: awake = fix && (t >= stepAt+WAKE_AT || (stuckAt!=null && t >= stuckAt+30000))).
- Reader button "Show where": Fix step only. Auto-filled from the fault: red → "Look at line {n}." · silent → "Look at the end of the program." · none → "Look inside bearing, under the print."
- Rate: one live signal per pupil; after sending the button greys and reads "Sent. Your partner can see it."; unlocks when partner presses OK or after 30 s; on OK the sender sees "Your partner saw it." (3 s). Max 3 per pupil per fault, then the button is gone.
- Display: one message, always the same place (#sig under #job); clears on step change; never steals focus from the code box; one soft sound. Trio: "I'm stuck" reaches both Readers. No signals in solo, gone, paused, Run, Name or swap.
- NEVER a name. Always "your partner" (pupils learn who they worked with only at the end).
- Engine plan: events `signal {s:'stuck'|'where'}` and `sigok {id}`; fault gets sigs:[], sigCount:{}, stuckAt:null; T.SIG_LIVE 30000, SIG_MAX 3, STUCK_WAKE 30000, SAW_SHOW 3000. Signal live while ok==null && step unchanged && t < at+SIG_LIVE. Blocked when solo/paused/gone/wrong role/wrong step/over max/one already live.

### (b) Help explicit, signposted, colourful + animated (lesson AND deck)
- Help button on BOTH screens (Fixer too) from the start of Point and Fix; any active seat may press Help and "More help" (no wait). Help stays shared on both screens.
- Help button: bright, animated (gentle pulse/glow; prefers-reduced-motion = static but still bright), with a signpost line beside it ("Stuck? Press Help.").
- Tour gains card 5 pointing at the Help row (gate l5v2-tour.js → 5 cards).
- Deck minute-0 slide (content-src-l5v2/j3/decks/j3-05.deck.json, NOT in git): line "Stuck? Press Help: either of you can, and it opens on both screens." Replace "More help appears by itself if a line is not right." Ledger the edit; bump contentVersion (2026-11-01j3l5b → next).

### (c) Indent
- Enter keeps the indent of the line above; +4 after a line ending ":".
- job.fix.none(.solo) and help.none.3 say "pushed in 4 spaces (press Tab)"; help.IndentationError.3 the same.
- A top-level `return` gives SyntaxError "'return' outside function": job line gets its own message (push return in 4 spaces so it sits inside bearing), not job.fix.stillnone.
- Supersedes the RESUME_HERE "QUEUED for after his test" line.

### Gates to write FIRST (each with a control that must go RED)
1. NEW l5v2-signals.js: 20 fast presses deliver 1; unlock on OK or 30 s; max 3; step change clears; none in solo/gone/paused/run/name/swap; stuck → awake at 30 s; every sig.* string has no seat name and says "your partner". Control: mutated engine without the one-live rule.
2. l5v2-help.js: now the Fixer's Help DOES open the ladder; More help from either seat; keep auto-ladder 45/90/135 and lookout 30 s.
3. l5v2-tour.js: 5 cards.
4. Indent check (Enter after "def bearing():" gives 4 spaces; after an indented line keeps it).
5. l5v2-words.js picks up new strings.
Then: cold reads (two cold-reader agents) of new strings, sit report addendum, pack, build-pathb, PR, Apps Script Version 78 (hidden-window route), deck rebuild, live smoke, DFM 375+, K122+, RESUME block below the top block.

## 20:03 checkpoint — V78 step 2 DONE, step 3 code written (stopped at 5h 68%, hard stop 70%)
- Gates written FIRST and shown RED before the build: l5v2-signals.js (A16 signals + A17 indent, NEW), l5v2-help.js (Fixer's Help now opens the ladder; More help from either pupil at once), l5v2-tour.js (5 cards; DOM click so the control can't crash).
- Built: engine.js (T.SIG_LIVE/SIG_MAX/STUCK_WAKE/SAW_SHOW, sigKind/sigLive/sigFor/wakeAt/sigState, events signal + sigok, Help from any seat, awake = wakeAt(f)); ui.js (Help on both screens + help.sign signpost + urgent pulse on "stuck", #sigbtn sender states, #sig bar under the job line with OK + nudge sound + mousedown keeps focus, More help for anyone, enterIndent + Enter handler, job.fix.outside for 'return' outside function, tour card 5 → #helpgo, one-column tour scrolls its target into view); strings.js + spec §8 (V78 strings, 15 new, 4 changed); sound.js (nudge); hour.html (#sig, #helpgo/#helpsign/#sigbtn, colourful animated Help CSS, reduced-motion static).
- GREEN: A16+A17 signals/indent PASS (control RED: 20 presses delivered 3), A8 help PASS (control RED), A1 words PASS (controls RED), A6 fold, A7 steps, A11 clock PASS, A2 tour 50 cards PASS (control RED 18).
- NOT YET RUN: l5v2-walk (pair/solo/trio × right/wrong × 683/760/1366), l5v2-drive, qa-l5-paired local --scenario all, A5/A12/A13; a browser look at #sig + Help at 683×768 and 1366×768 (does the #sig bar push the page? screenshot both roles).

## 20:40 checkpoint — V78 step 3 DONE, all gates green, committing
- Cold reads (2 Sonnet readers, v78 packet): 7 rewrites agreed, made in strings.js + spec §8 (verdicts in J3_L5_REDESIGN/cold-reads/v78/COLD_READ_VERDICTS.md).
- Look at 683×768 + 1366×768: the #sig bar first pushed the code down; now it lies over the job line (code moves 0 px) and the "stuck" message carries its own pulsing Help button (at one column Help sits below the fold; pressing it scrolls Help into view). New gate l5v2-look.js PASS, control (bar in flow) RED 2.
- Deck s1.4 "On your own screen": Help bullet + signals bullet + notes; ledger rows set; contentVersion 2026-11-01j3l5c; DFM audit row for 370–374 added (the pack's qa-dfm-audit needs one per rule).
- GREEN: A1, A2 (5 cards), A8, A16/A17, look; walks 18 + reload PASS; check walks pair/wrong 683 + trio/right 1366 PASS; qa-l5-paired local all 73 PASS; pack rc=0; build-pathb: bundle byte-identical to 1f77380 (the hour loads from Pages, no server change).
- NEXT: commit ks3-dt/ only → PR → merge → Apps Script Version 78 (same bundle, new version so the record reads V78) → deck rebuild + read-back → live smoke → records (DFM 375+, audit row, K122+, RESUME_HERE, memory).
