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
