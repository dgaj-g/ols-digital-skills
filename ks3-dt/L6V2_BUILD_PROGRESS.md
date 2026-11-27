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
