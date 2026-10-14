# J1 Lesson 6 "Inside the Machine" (The Operation): sit report

14 Oct 2026. The walker (`tools/record-tutorial/l6-walk.js`) played the whole hour as a pupil at 1366×768 and at 683×768: 31 checks, 0 failed at each size. Its control (the walker run with a landmark it must not find) went red with 3 FAIL, as it must. The pupil was paired off on the dev class, so the frame ran its solo route. The two-laptop route is covered separately by l6-harness (100/0) and l6-channel-test (17/0, real Firebase).

## What a pupil sees, in order
1. **Scrub in.** A recap, then pairing with ceremony: two anonymous surgeon names (Dr Marmalade and the rest), and the door waits until both are here.
2. **The operation.** One patient, two surgeons acting at the same time. A part comes out, the patient says what changed, and the part goes back. The fluff is cleaned and the chart fills with lines a child would say. The Surgeon badge card shows its picture, and Onward moves her on.
3. **Ward round.** Four broken computers (all six when alone). She clicks one, then clicks the missing part on the tray. A second wrong part makes the bed say the answer. The Ward round badge follows.
4. **Who is in charge** and **Inside her head.** These are frame stages, plus the film l6-inside.mp4.
5. **Put the steps in order** and **The names.** The pair's real names are revealed here, at the end and never earlier.
6. **Extra jobs** come before the exit check (DFM 265): the machine and the discharge letter, with finish labels on the hub and on every job.
7. **Exit check**, then **c8b "Exit check: the steps"**. Item 3 is a put-in-order card, so the exit check is two chunks.
8. **How did it go?** The finish screen. 45 XP, 12 chunks, 2 badges, pinned in sit-review.

## Where she could stall, and what happens
- **The door, when her partner never connects while Firebase is up.** Begin stays greyed until both seats are here. The ten-second fallback only fires when the live link itself is down, so an absent partner (off sick, wrong lesson, laptop shut) leaves her waiting at the door. The teacher's fix is to re-pair her from the Live tab, or turn pairing off for that class. **This is a judgement call for him:** a "carry on alone" way out after N seconds at the door would close it, but it is not built, because the design never named one.
- **The live link blocked at school.** This is not a stall. After 10 s, seat A's bar says "The live link is slow. Share one laptop and take turns." Seat B is told "Go and sit with Dr …. You share one laptop." Both lines were proven with the Firebase names blocked by DNS. **Still owed: one check on a pupil laptop inside school.** The 26 ms live test ran off the school network.
- **Badge pictures (found and fixed).** Both L6 badges had no icon, so the card showed a broken picture. Each now has a picture (magnifier, shield), and the walker checks that each one draws.
- **The wrong-card landmark.** The walker now clicks a wrong card on the page itself, the way a pupil does. Before, it went through the engine and skipped the page's click handler.

## Wording
- "Tap" became "Click" on every new string after the cold read (DFM rule: click, never tap). Two cold readers agreed every rewrite, in two rounds. 97 ledger rows.

## Not walked by a machine
- A real C2k pupil account on a school laptop: the network check above.
- The teacher deck in Google Slides: built by runDeckRound from the committed .gs.
