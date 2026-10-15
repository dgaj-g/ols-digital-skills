# J3 Lesson 5 "Bug Bounty" (TWO LIGHTS): sit report

15 October 2026. Version 73 build, Opus 5.5 at medium effort.

## How it was walked

`l5-walk.js` drives two real browser pupils, Bríd (North Light) and Aoife (South Light), through the whole hour on the local dev build. It was run at 1366×768 and at 683×768 (half a C2k screen).

Result: 49 checks, 0 failed, at both widths. The walk recorded:
- 12 chunks
- 82 presses
- 49 marks
- 3 badges

Its control (a landmark nobody can stand on) fails as it must.

The engine model (`l5-walk-model.js`) walks every room seed for a pair and for a trio. With the help ladder never used, she is home by minute 47. With every ladder step used once in each chapter, she is home by minute 52.

## What a pupil sees, in order

1. **Recap.** She answers the five recap questions.
2. **The pairing screen.** "Finding another light." The radio scene pairs her laptop with her partner's. If no partner arrives, she gets the solo button: "Keep both lights yourself".
3. **The fog.** Four story lines.
4. **The tour.** Seven cards over the chapter 1 program. Card 6 now says that Marigold the boat drifts to the rocks while a fault is left.
5. **Chapters 1 to 4.** Each light has its own program. She finds a fault in one of three ways:
   - reading the red text;
   - hearing about it on the radio from her partner (the silent faults show only on the other screen);
   - getting a slip.

   She then names the fault on one of five posters, and each right name pays a bounty. Chapter 4 mixes all five kinds of fault, in seven seeded versions.
6. **Home.** The bounties she earned, then "Go to the five questions".
7. **Five questions.**
8. **How did it go.**
9. **Extra posters.** Six optional programs: bell, tide board, pier lamp, night horn, depth call and cliff light.
10. **Finish.** The platform's finish card.

## Where she could stall

- **The pairing screen, if her partner is slow to sign in.** The wait line tells her to stay put. After 10 s with no link, seat A keeps both lights and seat B is told: "The link to your partner is slow. Share one computer and take turns." This is gate A8, and it passes.
- **Chapter 2, the first silent fault.** Nothing is red and nothing happened. The bar now says "Find the fault in your code." The step that moves her on is her partner's radio. This is the moment to watch in a real room.
- **The poster step.** "Click the poster that names this fault." She gets one try. A wrong name costs that bounty but never stops the story.
- **At 683 wide.** The again-button, posters and pills now fit. The walk asserts that every pressed button is wholly on screen.

## Judgement calls made in the build (his standing ruling: a sensible call, agreed by the eye and the agents)

- **The extras come after the close.** The lesson ends on the platform finish card, not on the extras screen. The walker accepts either ending.
- **The chapters carry no finishLabel.** The page's own Next moves her on.
- **The pairing screen keeps the words "another light".** One round-1 reader flagged them and the other did not, so the split stands. The radio scene beside the words shows what they mean.
- **Five resources, including the Solo run button.**
- **The drift budget is multiplied for each light she keeps.** A solo pupil keeping both lights is not raced at pair speed.
- **The chapter 4 help defines "bug" the first time the word is used.**
- **The tour shows the chapter 1 program.** It is the program she meets next.
- **The robot walk is fast.** The 90 s minimum budgets still apply to real pupils.
- **Narrow-screen and scene fixes.** These were found on the eye-check:
  - the stage is sized by height, so Begin is no longer clipped at 768;
  - the lighthouse roof and the boat sit inside the window scene at 1366.
- **The cold read.** In round 1 both readers misread Marigold (the boat) as a pupil. Their literal rewrites were not used. The agreed faults were fixed in fresh words:
  - exit question 2 had no person for "Her", and "Python is slow." was a joke option;
  - exit question 5 had "the keeper" unnamed;
  - seven strings.js lines.

  In round 2, reader A passed all 10 rows and reader B passed 9, flagging only "rewind". That is a split, so it stands. The verdicts are in `KS3 DT Platform/COLD_READ_VERDICTS_V73_j3-05.md`.
- **The old J3 L5 sorting/searching "unresolved" flag is marked resolved** in J2J3_KICKOFF_NOTES.md.

## What he checks as two pupils

1. Sign in on two laptops as two test pupils and open J3 Lesson 5. They should pair within seconds.
2. In chapter 2, the pupil whose console is clean is told by the radio, and the partner sees None.
3. Check that Home shows the earned bounties, then the five questions, then the finish card.
