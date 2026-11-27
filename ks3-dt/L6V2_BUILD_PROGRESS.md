# J1 L6 V2 "The Operation" contest hour — build progress (Version 96)
Started 27 Nov 2026 07:55. Worktree ~/Sites/ols-wt-l6v2, branch j1-l6-contest off origin/main 907edd3f (V95 + content fix 2026-11-26u).
Build prompt: /Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/J1_L6_REDESIGN/J1_L6_V2_BUILD_PROMPT.md (STATE AT OPEN stale; real state above).
Target: Apps Script Version 96, contentVersion 2026-11-27a.

## Steps
- [x] 1 read spec + prototype + live code
- [ ] 2 gates first (contest-test, channel-test, look, strings, deck, coverage)
- [x] 3 live.js T2C cstate (x|seat|q|a|m|Bs17,Cs17; 80-byte round trip = contest.js codec)
- [ ] 4 engine + page
- [ ] 5 content + film
- [ ] 6 deck
- [ ] 7 all gates + sit report + cold readers
- [ ] 8 pack + PR + deploy V96
- [ ] 9 live walk single-pupil parts at 1366x681

## Calls made (record in RESUME_HERE + DFM 390-400)
- Separate page assets/l6/contest.html as cfg.page on c3, same Engines.operation engine (id clash; V1 untouched). Departs from spec 8 "sections in operation.html".
- Hub = platform pyrun-hub, six frame stages (desmond, nigel, solo/round1/2 ; find, customers, own in extras.js ; letter).
- Film = prototype in-card DOM animation, captions one at a time (25-word law beats spec 10 printed list).
- Stand-in notice = its own card before the reveal (standInForMe/standInLate, button rev.next).
- Reveal counted = answer line + why line (<=25); chips held apart (<=6 words); headline dropped; order kind shows right order as list.
- "{patient} says:" / "{customer} says:" = kicker labels.
- Wait lines trimmed (partner / others / gone / late). Job lines from bottom.*.
- Begin + round intro cards trimmed to 3 lines; rest moved into help list.
- Trio result '{winner} is head surgeon with {a} points.'; others in table.
- Draft opC = E.snapshot()+fin; reload at result merges via E.receive.
- Seat A destroys room ~5 s after all seats reach q===N.
- Job bar at bottom ("Your job now:" + green Stuck? Show me), top keeps mode line.
- lines.js "Granny Rose's laptop" -> "computer".
- contest.js Q[8].why trimmed to 14 words.

## Log
- 27 Nov 08:40 contest.js copied, live.js codec done. Next: cstrings.js + l6-contest-test.js.
- 27 Nov 10:10 GATES WRITTEN. cstrings.js (all contest strings, REWRITES with reasons; 7 rewrites), l6v2-src/{strings,contest}.js (verbatim prototype copies = source of record), l6-contest-test.js (engine G1-G11 + STRINGS subsequence rule + WORDS composed screens + LAPTOP + DECK; all green except LAPTOP+DECK, which wait on the surfaces), l6-contest-look.js (playwright, real Firebase, T-begin/r1-r4/room/gone/late/fallback/solo/narrow, words+fit at 4 sizes, controls). Next: contest-ui.js + contest.html to the look-gate contract.
  Calls since: reveal hides ask+says; chips '{You|callsign}: Right/Not right'; WHY CUT drops the why's last sentence while chips+why > 25; 'The answer: X' dropped, right tile marked in the disabled buttons; order blocks are buttons (ArrowUp/Down + Move up/down); linkLost lives in the aside state line, linkAlone button there after 60 s; partner stand-in reported in the aside, my own stand-in = notice card.
  Look contract: window.L6C={E,ui,bus}; body[data-phase]=begin|intro|film|q|notice|result|away, body[data-rev]=1 on reveal, body[data-beat]; #top #card aside#side(.state) .job #job #helpBtn #help(#helpHow ol#helpText) [data-act]=start|introgo|filmplay|filmagain|filmgo|pick(data-v)|up|down|lock|next|noticeok|together|alone|cont; window.__posted logs postMessages.
- 27 Nov 08:29 context compacted; resuming contest-ui.js + contest.html (step 3).
- 27 Nov 08:35 fallbackSit trimmed (accented name = 2 words); test model name Bríd. Writing contest.html + contest-ui.js.
- 09:14 contest-ui.js written (full page script). Next: run l6-contest-test + l6-contest-look on :8126.
- 11:05 contest page ALL LOOK GATES GREEN (solo 12/12, paired 197/0, fallback 15/0 after blockedNet exemption: the Firebase-blocked browser's own ERR_NAME_NOT_RESOLVED is expected there only). Step 4 next: op page (door trim, fluff notices, opDone, green Stuck? Show me = tour), extras find/customers/own, hub chunk via platform ShowMe (job/showMe/ring in chunk config, app.js 749/781, no app.js edit).

## Op page + extras calls (27 Nov, step 4) — record in DFM 390-400 + sit report
- D1 Door = two cards <=25 words each. Card 1: kicker 'With your partner · You are {me}' (REWRITE; alone 'On your own · You are {me}'), face, name, bubble open[0], door[0], button Next. Card 2: fixes.doorInside (trim) + together cut ('{p} is at the same table.' / trio / alone 'You work on {me} on your own.'), button Begin the operation. door[1] replaced by doorInside; door[2] + 'Each part does one job.' + 'You work on {me} together.' -> help.door. Bottom job bar + green Stuck? Show me (non-blocking help box, rings active button 'Press this').
- D2 Table counted by zones; chrome uncounted (#top #team #count #strip #caselab slot names #lines rows #cardlist choices #hint; #instr = job line <=14). Zones: patient (#bwho #say #cardh #cardcap), chart head, done card, #livenote.
- D3 Green Stuck? Show me in #bar right (starts the tour); 'Your job now: ' lead span before #instr.
- D4 Fluff: tap -> fixes.fluffMe; partner's -> fixes.fluffThem; slot shows fixes.fluffTile 'Cleaned'.
- D5 Done in platform: againbtn hidden; nextbtn = fixes.opDone (main) or hub.back (desmond/nigel); donep = her own found line only; donereveal hidden (reveal is at the contest result).
- D6 Fallback strings = contest fixes.fallbackMe/fallbackSit/fallbackButton (op + ward2).
- D7 Desmond/Nigel extras = local op run with setRound(1/2); fixed top bar #xtop: top.job + Back to the extra jobs (xback) + Finish the lesson (xfinish).
- D8 extras.js rewritten: find (case photo hotspots, motherboard last), customers (3 people, tray of 7 parts), own (one fact at a time). End button = hub.back posting next (marks job done).
- D9 Hub: title + intro (15 words); kicker/buttons chrome; job 'Click a job to start it.'; ring the job buttons.
- Live V1 lines.js/lines2.js frozen into l6v2-src/ as extra STRINGS sources (op-page cuts of live strings pass).
- 09:42 D1-D9 recorded; editing op page now.
- 09:49 cstrings V2 op/hub/find/cust/own strings + frozen live lines sources; STRINGS gate green with controls. Next: operation.html + ui2.js.
- 10:25 Op page V2 wired: two-card door, job line + Stuck? Show me, fluff stays (clean), PC not laptop, H-mode done screen; engines.js hub (ShowMe ring) + job routing (next ticks, xback, xfinish); extras.js find/customers/own; letter as a job (two columns, top bar, job bar). New gate l6-jobs-look.js PASS at 4 frame sizes, 4 controls caught; find boxes checked by overlay + zoom on case.jpg. Next: laptop grep, tests click #doornext, j1-06.json.
- 10:26 Old gates moved to the two-card door + fluff clean: l6-harness 101/0, l6-look OK, l6-tour PASS, l6-engine 105. Next: j1-06.json + brief, pack, l6-walk V2.
- 10:45 j1-06.json rewritten (scratchpad mk-j106.js; c3 contest, extras hub, c8 four items x1 x2 x4 x5, keys l6-x5, brief no laptop, STOP-mid-contest goesWrong[8]). Hub ring moved from chunk config to app.js RINGS.operation (a ring in JSON counts as pupil sentences). 96 + 29 deck + 3 read-aloud records written. Brief extras row 6 min so the run sheet sums to 60.
- D10 Deck rewritten to 8 slides (spec §11) BUT slides 2 and 3 swapped: qa-teacher-spine (DFM 219c) demands title then objectives. Run sheet updated (Slide 2 aims, Slide 3 what today is about). Objectives = spec §1 words on the deck; lesson JSON objectives untouched.
- D11 .gs rebuilt from packed decks (walk-build first, then build-deck-gs, then real pack). REAL PACK GREEN, contentVersion 2026-11-27a, PathB_Index rebuilt.
- Next: WIP push; l6-contest-test, l6-walk V2 + sit-wrongpath '6' landmarks; film check; gates; sit report; readers; Slides deck via Chrome; deploy V96.

11:30 · l6-walk.js moved to V2: c1 door (two cards), c2 operation, c3 the contest solo vs Bernadette (17 questions, film to its end, one slip on Q2, result Continue), extras (own to its end, letter, Desmond left by the top bar's Back), c8, c9. LANDMARKS['6'] now 25 (11 on the contest). EXPECT['6'] re-pinned chunks 12→7, presses 103 (reported); xp 45, marks 45, badges 2 unchanged. Walk 46/46 PASS; --control --expect-fail CAUGHT (letter skipped + planted landmark).
