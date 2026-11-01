# SIT REPORT · J3 L5 "Same Light" (V2) · build window · 1 Nov 2026

One page. What a pupil sees on the REAL platform (Lesson 5 tile, signed in), where she would stall, and what the build
does. Walked by qa-l5-paired.js (two and three real platform windows on the live Firebase channel: pair, reload, trio,
partner gone, link blocked; 73 checks) and l5v2-walk.js (the hour page alone, right and wrong paths, pair/solo/trio, at
683×768, 760×900, 1366×768; 18 walks, plus 34 reloads). 0 page errors on every run. The design window's prototype sit
report (J3_L5_REDESIGN/prototype/SIT_REPORT.md) still stands for the stage-by-stage story; this page covers what the
build adds or changes.

| Moment | What she sees | Would she stall? |
|---|---|---|
| Opens Lesson 5 | Do now, then the hour in its frame. Sound check first ("Sound the horn", Yes/No). | No. |
| Pairing | ONE pairing card per pupil for the whole lesson (PairKit runs once; the gate counts it). Odd class: one trio, three names. | Only while she waits for a partner to open the lesson; the card says so. |
| Link blocked (school filter) | "ONE KEEPER. ONE LIGHTHOUSE." and the solo hour. Nothing hangs. | No. |
| Fault steps | Run · Point · Fix · Name lit in the strip; jobs swap at every fault; "Fault 2 of 7. Now you are the Fixer…". | No. Fixed in build: the swap card no longer says "Fault 8 of 7" after the last fault. |
| Reload or laptop lid | Back on the same chapter, fault, step and coins; no second pairing card; same partner. | No. |
| Partner leaves | After about 9 s at test speed (3 min in class) a red bar: "Your partner has gone quiet. Keep going on your own." The hour carries on solo. | No. Fixed in build: the bar never showed before; it now also pushes the page down instead of covering Pause. |
| Home | "Marigold is home…", her coins, three badge chips (Red Reader, Radio Keeper, Bounty Hunter), then the five questions. | No. Fixed in build: the chips read the badge names, not "Badge earned: …" twice. |
| Her record | 49 XP, three badges, once each, for every seat (pair and trio). | Fixed in build: a badge saved a moment before the finish could be lost; the finish now waits. |

Where a pupil would still stall (unchanged from the design look): the first Point (reading the line number in the red)
and the first Fix for the Reader of a slow Fixer. The help ladder, the 30 s lookout and the 90 s editor carry both.

## V78 addendum — help you can see (1 Nov 2026)
What a pupil sees now, from the screenshots at 683×768 and 1366×768 (tools/record-tutorial/out/l5v2-look/):
- In Point and Fix, an orange Help button glows beside "Stuck? Press Help. It opens on both screens." Tour card 5 points at it before the hour starts.
- The Fixer has "I’m stuck" (Point, Fix). Pressed: the button greys to "Sent. Your partner can see it." The Reader's screen chimes and a yellow message lies over the job line: "Your partner is stuck. Press Help: it opens on both screens." with its own pulsing Help button and OK. The code does not move (0 px measured).
- Help pressed inside that message opens Help on both screens; on a small screen the page scrolls Help into view.
- The Reader has "Show where" in Fix. The Fixer sees "Your partner says: look at line 9." (or the end of the program, or inside bearing under the print line).
- Enter keeps the indent and adds 4 spaces after a colon, so return channel lands in the right place after Enter on the print line.
Where a pupil could still stall: the yellow message covers the job line until OK or 30 s, and at 683 it half-covers the "YOUR CODE" label. Both are brief and the job line comes back on OK.
