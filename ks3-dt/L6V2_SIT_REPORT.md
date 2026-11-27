# SIT REPORT · J1 L6 "The Operation" (V2, the contest) · build window · 27 Nov 2026

One page. What a pupil sees and where she would stall. Walked by l6-walk.js (the whole hour in the platform preview,
right and wrong paths: 46/46 at 683 × 768 and 46/46 at 1366 × 768; 103 presses, 45 XP, 2 badges), l6-contest-look.js
(two seats on the live channel, seat A at 1366 × 681 and seat B at 750 × 900, every screen fitted at four sizes),
l6-channel-test.js (17/17) and qa-l6-paired.js (two and three real platform windows on the live Firebase channel: pair,
partner gone, partner gone mid-operation, link blocked, reload, trio: 89 checks, 0 failed). 0 page errors on every run.

| Moment | What she sees | Would she stall? |
|---|---|---|
| Door | Her lesson name and her partner's ("Dr Marmalade", "Dr Custard"; a trio adds "Dr Pickle"). Two short cards, then Begin. Partner not here: "Dr Marmalade is not here yet. Waiting a while? You can work on your own instead." with Work on my own. | Only while a partner is late; the line says so and the way out is there. |
| Operation | Unchanged from V1: pull a part, read the patient, click the job card. Partner gone mid-operation: she finishes the patient alone. | First part only; the tour and Stuck? Show me carry it. |
| Contest begin | "The contest", her partner by lesson name, "Start round 1". Alone: "On your own · Against Bernadette" and "You answer first. Then Bernadette answers." | No. |
| Rounds 1–4 | "Round 1 of 4 · Question 1 of 6", the same question on both screens, both answers shown once both have answered. Round 3 opens with the film (captions, no sound, 32 s), then four steps to put in order. | The fast partner waits; the scoreboard shows how far the other has got. Seat B at 750 wide reads cleanly. |
| Result | "You beat Bernadette. You scored 16 points. She scored 7. You played on your own today." In a pair it names the head surgeon and the partner's real name. | No. |
| Extra jobs | Six jobs, any order. Each job has a top bar with where she is, Back to the extra jobs and Finish the lesson, live from the first frame. | No. |
| Exit check, How did it go? | Four questions on her own, then three sentences with a button under each. | No. |

Where a pupil could still stall:
- At 1366 × 768 the operation's "Which job was it doing?" list shows about four and a half of its seven cards and
  scrolls. This is the V1 layout, untouched by this build.
- At 683 × 768 the fourth option of round 2's question sits right at the card's foot. It is visible and clickable.
- Preview only (teachers, never pupils): the "PREVIEW · Anya" badge covers the second line of a two-line job bar at 683.
- STOP while a pair is still in the contest: there is no way out part-way. The pair finishes the contest, then the next
  screen shows Finish the lesson (the brief's "goes wrong" row says so). His call whether that is enough.
- Between the operation and the contest the platform shows its own pairing card ("Finding your table partner.")
  for a moment while it checks the pair, as it did before V1's ward. A pupil working alone sees it too. It clears by
  itself.
