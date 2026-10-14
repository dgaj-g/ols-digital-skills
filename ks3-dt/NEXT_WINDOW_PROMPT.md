BUILD: J1 Lesson 6 "Inside the Machine" (THE OPERATION). Continue. Opus 5.5 medium.

Handover: /Users/damiengartland/Sites/ols-wt-l6/ks3-dt/L6_BUILD_PROGRESS.md (read the 16:05 checkpoint first)
Spec: /Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/J1_L6_OPERATION_SPEC.md
Worktree /Users/damiengartland/Sites/ols-wt-l6, branch j1-l6-operation (last push 2c36774). Dev server: node ks3-dt/tools/dev-static.js 8126 /Users/damiengartland/Sites/ols-wt-l6 (port 8121 belongs to another window: leave it alone).

DONE AND GREEN: l6-engine-test 89/89; l6-look; l6-harness 100 ok; l6-walk at 1366 and 683 (31/0), control red; EXPECT['6'] pinned; qa-deck-shots PASSED (82); cold read and ledger; badge icons fixed in content-src.

FIRST ACTIONS
1. Start the dev server. Run node ks3-dt/tools/pack-content.js (the real pack, no flag) until it passes, then commit ks3-dt/content.
2. Write ks3-dt/tools/record-tutorial/l6-channel-test.js per spec §6.4: two clients swap a move through live Firebase in under 1 s; aborting *.firebaseio.com triggers the fallback line; room deleted on completion; a wrong-length code write is refused (control); room JSON has no @, no names, no class code. Controls go red first, and the FAIL lines go in the progress file. If it fails twice, stop and say so.
3. Run qa-harness-coverage, qa-xp-ceiling, l6-engine-test and the existing suites.
4. Write ks3-dt/L6_SIT_REPORT.md (one page). Note: the extras before the exit check, the frame stages, c8b, tap→click after the cold read, the broken badge pictures found and fixed, and that a paired pupil whose partner never connects waits at the door (Begin disabled) when Firebase is up.
5. Server: room and seat in apiPairJoin (check), plus sweepRooms_ (nightly) and pingLive_ (weekly, emails only on failure).
6. build-pathb, then the Apps Script deploy (hidden-window Chrome route), the two-pupil smoke test, then the PR to dgaj-g/ols-digital-skills with the gate counts and the sit report, then merge. Then the RESUME_HERE V72 top block and ONE plain done message.

OWED BY DAMIEN: open https://dgaj-g.github.io/ols-digital-skills/ks3-dt/platform/live-test.html on a pupil laptop at school and report its one sentence. The build is not done without it.

METER: get_usage every 20 calls or 15 minutes; print METER hh:mm · context · 5h · week · calls. His "carry on" overrides the stops.
macOS may show a permission popup (Chrome, Screen Recording, Automation) during deploy. If a step hangs over 60 s, say "POPUP: look at the Mac" and wait.
Never enter credentials; never approve pupil share requests; no pupil identity in Firebase; LC_CTYPE=en_US.UTF-8 pbcopy for anything he pastes.

FIREBASE OWNERS (DFM 330 / K79): one owner: the school account; Gmail removed. Write it that way in RESUME_HERE V72. Nothing in the build depends on the owner list.
