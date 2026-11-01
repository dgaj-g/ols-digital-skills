BUILD: J2 Lesson 5 "Loop Machines" · THE SEARCH Version 2 · RESUME from State 9. Opus 5.5 at MEDIUM.

Handover (read its last two blocks first): /Users/damiengartland/Sites/ols-wt-j2l5v2/ks3-dt/J2L5V2_BUILD_PROGRESS.md
Original build prompt (all rules still stand): /Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/J2_L5_REDESIGN/J2_L5_V2_BUILD_PROMPT.md
Worktree: /Users/damiengartland/Sites/ols-wt-j2l5v2 (branch j2-l5-v2, last commit 7a33612, pushed). Content source: /Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/content-src/

Measured state at stop (1 Nov 2026 21:25): engine + content + cold-read rewrites done; gates 11–19, A18 PASS at 4 viewports (Home 14.0 min); engine gate PASS. DFM 370–374 audit row EXISTS (DFM_ENFORCEMENT_AUDIT.md line 146), so the pack block is cleared. Week 45% at stop (resets 4 Nov 2026 21:00). Do not open before then unless Damien overrides the week stop.

No Damien step. Never two windows in Chrome. Dev servers by Bash nohup (8790 = /search/hour.html, 8125 = worktree root). Never /tmp. Every judgement is yours, recorded in DFM. No AskUserQuestion popup. No chat progress reports. Never edit another window's block.

First actions:
1. get_session + get_usage "self"; print the WINDOW line. list_sessions: no other window on the KS3 DT repo or in Chrome.
2. Set content-src index.json contentVersion above main's latest (at stop: "2026-11-01j3l5b" → use "2026-11-01k", or higher if main moved); git fetch && git merge origin/main first if main moved.
3. Teacher brief: STANDING rule (1 Nov 2026), briefs short and to the point, the J3 L5 V2 brief is the model. Cut the J2 L5 teacherBrief in content-src to match before packing.
4. node ks3-dt/tools/pack-content.js until green; git diff --stat ks3-dt/content must revert no J3 content. Then platform gate: node ks3-dt/tools/record-tutorial/j2l5-platform.js --base http://localhost:8125; rerun j2l5-walk2.js at 1366×768 (walks one at a time, never parallel).
5. Write /Users/damiengartland/Sites/ols-wt-j2l5v2/ks3-dt/J2L5V2_SIT_REPORT.md (one page: what a pupil sees, where they would stall; note the close-caption nit at 1024).
6. Deck via Chrome (list_sessions first; say "macOS may show a permission popup"): paste OLS_KS3_DT_Slide_Decks.gs by the hidden-window route, rebuildJ2Lesson5Deck on the SAME Drive id, exportAllDeckProofs, read every proof slide; qa-deck-* and qa-brief-* green.
7. build-pathb.js; re-read RESUME_HERE; deploy Apps Script version ≥ (live + 1, at stop ≥79); smoke LIVE lesson as pupil; check **with headphones** bold in the brief.
8. PR open + merge; RESUME_HERE new top block; DFM 340–359 (decision list in progress State 8); K88–K99; update memory project_j2_l5_the_search.md + its MEMORY.md line.
9. One plain-English done message: version, lesson link, deck link, his test-pupil check.

METER: every 20 calls or 15 min, get_usage "self" and print `METER hh:mm · context NNNk · 5h NN% · week NN% · calls N`. Hard stops: 5-hour ≥70 %, week ≥45 % (measured against the new week), 400 calls → append PROGRESS, write a new NEXT_WINDOW_PROMPT, pbcopy it (LC_CTYPE=en_US.UTF-8), say so first, stop.

macOS popup warning: before each deck and deploy step say "macOS may show a permission popup"; if a step hangs over 60 s say "POPUP: look at the Mac".
