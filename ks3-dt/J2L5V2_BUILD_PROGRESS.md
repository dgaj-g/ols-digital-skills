# J2 L5 V2 BUILD PROGRESS (window opened 1 Nov 2026, Opus 5.5 medium)
Worktree ~/Sites/ols-wt-j2l5v2 branch j2-l5-v2. Spec: ~/Desktop/Claude Work/KS3 DT Platform/J2_L5_REDESIGN/J2_L5_SPEC_V2.md. Prototype: J2_L5_REDESIGN/prototype/.
Content source: ~/Desktop/Claude Work/KS3 DT Platform/content-src/j2/lessons/j2-05.json (edit there, then pack).
## State
- Step 1 setup: done (sources read). calls ~33, 5h 24%, week 37% at 18:11.
## Decisions (to go to DFM 340+)
- D1 V2 bang uses prototype Pics film (P.phone/workshop/hillShot); film.js stays byte-for-byte, not loaded by V2 hour.
- D2 hour layout: chars.js(worry)+scene+sound; hour/{strings,py,sound2,cast,pics,ui,box,bridge,chapters,chapters2,free,main}.js
- D3 place v2 {chapter,step,lambName,foundAt,got,mine,v:2}; V74 record (no step) -> step 1 of its chapter.
## Next
- gates (step 2)
- D4 (supersedes D2 file list) hour/{strings,py,sound2,cast,pics,ui,box,bridge,chapters,free}.js; judge.js, main.js retired; chapters 3-4 + close + flow live in chapters.js; free.js = V2 free flight on Box+Py (360 s clock), window.FreeFlight.
- D5 chapter 3 hill: 4 px/m, centre (540,470), lamb at (40,40) m; found = any arm within 12 m of her. Judge order + lines in chapters.js judge3.
- D6 chapter 4: lane/yard 1.3 px/m, barn 5 px/m; endless barn run capped at 14 rounds; battery clock 40 s from first Run, restarts after wind-back.
- D7 each flight = guess screen (Dad's lines read-only, Run off until a guess) -> fix (card "Dad's flight", no ring) -> name-the-bug quiz.
- D8 new strings: S.close.nameH 'Type a name for the lamb, then click Name her.'; welcome '...is safe in the barn.'; 'Click' wording throughout.
- D9 U.minutes wall clock (+?mins= for the walker); 48-min note = U.note toast + between-chapter Carry on/Home after ch1-3; Home early = badges+recap, place kept at next chapter.
- D10 Escape and tab-hidden pause; U.menu removed; ?at= jump kept for the walker.
## State 2
- Engine written (chapters.js ch3/ch4/close/flow, free.js, hour.html, ui/box/pics patches). Not yet loaded in a browser. Next: smoke load each ?at=, then gates.

## State 3 (1 Nov 2026 18:44, week 38%)
- Engine verified headless: close (barn, name, badges plural "BADGES EARNED", recap with 4 drawn moments as small inline SVG icons), resume (V74 chapter record -> welcome -> first step of chapter; v2 t4 -> t3; v2 close with badges), free flight (stage 'free' now starts on window load; Run moved beside Finish so the panel fits 768 high).
- ui.js: a string `back` names the Back button (Welcome back shows "Start again").
- Not yet verified: the 48-minute between()/homeEarly path (cover in gate).
- Next: retire old tools; gates 1-10 update + 11-19 + A1-A19 (spec lines 659-702); chars.js hash + pixel diff; V74-record gate.

## State 4 (1 Nov 2026 18:58, week 38%, commit 9e7e599)
- Gates green: j2l5-frozen.js (chars.js hash c956cd60…, V74 hash ba5ff232…; only SearchChars.worry may be set by the hour), j2l5-worry.js NEW (W1 zero changed pixels at worry 0 and no flag vs tools/record-tutorial/j2l5-chars-v74.js, 6 poses x sizes 24/90; CONTROL worry 1 changes 6760 px; W2 gate 15), j2l5-twins.js ported to V2 §13 sound table (60 checks).
- DECISION (DFM 341 candidate): chars.js face threshold kept at V74's `transform.a >= 70`; a new opt-in `p.face` draws her face small. Only the barn passes face:1. My earlier dpr-based threshold changed film pixels at 1x screens and was reverted.
- Old V1 hour tools moved to tools/record-tutorial/retired/ (j2l5-walk, j2l5-python, j2l5-judge-test, j2l5/ judge cases).
- Still to port: j2l5-words.js (needs content step + V2 sources: ch1-2 = prototype J2_L5_REDESIGN/prototype, ch3-4 = spec §9-§11), j2l5-clock-test.js (needs dev server on 8125 serving repo root; V2 clocks), j2l5-platform.js (P1-P7 against platform, badge names now The Tracks / The Growing Square / The Way Home).
- To write: j2l5-walk2.js = runtime walker collecting every panel screen (gates 11, 12, 14, 16-19, A17, A18 26-min model), plus V74-record resume gate (A16).

## State 5 (1 Nov 2026 19:05, week 38%)
- j2l5-clock-test.js ported to V2: PASS 13 (clocks 55,45,45,40,360 from first key / first Run; Pause, tab change, Escape hold; Enter goes on; orange 20 s, red + heartbeat last 10 s only).
- DECISION (DFM 342 candidate): the big clock runs on real elapsed time (ui.js realDt, capped 1 s a frame), not on the 0.1 s-clamped animation step: at 5 frames a second the clamp made a 2 s clock last 4 s (gate 16).
- j2l5-walk2.js NEW (walker: gates 11, 17, 19, A18) + j2l5-walk2-answers.js (right answers per step). Iterating answers. Run: node ks3-dt/tools/record-tutorial/j2l5-walk2.js (needs 8790 server).

## State 6 (1 Nov 2026, ~19:45)
- Walker j2l5-walk2.js: walks film → close end (SearchBridge.done('end')) at 1366×768 · PASS 10 checks: A18 13.5 min, gate 19 step lines (U.stepNow + STEPLINE), gate 11 Next delay (76 screens), gate 17 cold by entry level, no page errors. Shots per step with --shots dir.
- ENGINE FIX: sound2.js S.round with n null (while True) gave NaN → AudioParam crash at h4. Now wraps the ladder. (DFM candidate 343.)
- Walker fixes: exact option text first (g5 "0 1 2 3" vs "0 1 2 3 4"); bug quiz answers per step; name box before Next.
- CONTENT (content-src, not git): j2-05.json config.strings regenerated from strings.js (strip/btn/common/close; the stale V1 ch1–ch4/stripNamed copies dropped: nothing reads them, hour reads strings.js); b14 → "The Growing Square"; help Press→Click (two help strings); teacherBrief §17 (+2.4% words); exit items §11.4 with keys; recap r-j2-501/503/505 rewritten (no layout words); deck §18 slides 1,2,5.
- DECISIONS: prepare[4] title left plain (staff.js already shows titles bold; ** would show doubled); deck headings keep no full stop like every other deck; exit q5 keeps the forward( ? ) code with left(90) as a distractor; slide-1 notes gain "Today is Lesson 5, Loop Machines." at the start of its SAY.
- staff.js: purpose lines go through briefText (bold). Gate j2l5-brief-bold.js PASS (15 briefs identical, control fails on old staff.js).
- Backups of content before edits in the session scratchpad (j2-05.before.json, recap-pool.before.json, j2-05.deck.before.json).
- NEXT: viewport walks (1512/1280/1024) running; LOOK at shots; A16 resume gate + ?mins=50 between path; port j2l5-words.js + j2l5-platform.js; cold reads; sit report; deck (Chrome); pack; deploy ≥78; PR; records.
