# Sit report: S1 Unit 1 Revision, Digital Data (27 Sep 2026)

Where it ran: the live test deployment, signed in with the owner's school account, class 11A DT, Chrome at 1200×785 (G4). It also ran on the harness at 1280×800 (G2). One scripted pupil answered all 82 questions with a mix of right and wrong answers, flagged 11 of them, then moved into a round 2 opened by the teacher. The full line-by-line record is in g4-sit.txt.

## What a pupil sees
1. They open the class link. The page shows "Signing you in with your school account…". Their first name comes from the school account. The name box appears only if Google does not supply it, and Continue waits for a typed name.
2. Home shows nine topic tiles. Digital Data is live: "4 stages · 82 questions · 126 marks" and Open. The other tiles say "Comes later". The round line under the tile shows how far they have got.
3. The topic page has four stage rows. A pupil can take them in any order, using Start, Carry on or Look back.
4. Each question shows:
   - a stage bar and a marks badge;
   - where the question comes from on the paper;
   - the figure on the left, then the answer control.

   "Check my answer" becomes active once every part is answered. The pupil then sees their marks, a ✓ or ✗ on each part, the mark scheme, what they wrote, and "I still don't get this one".
5. A stage card comes after each stage (the rating is required), then a topic card. The round summary shows the score by stage and the flagged questions.

## Where a pupil could stall
- **First open: Google's permission screen.** The app runs as the pupil, so each pupil approves it once. This has not yet been proven on a pupil account. It is the one thing to try first. If C2k blocks the approval, the page never loads, and nothing inside the app can fix that.
- **"Check my answer" stays grey until every part is answered.** The line "Answer every part first." says why. Typed questions have "I don't know", so no question can trap a pupil. In the sit, all 82 questions reached Check.
- **Stage card.** The next stage stays shut until a rating is picked and saved (by design). The sit confirmed that the card will not save without a rating.
- **Length.** 82 questions is more than one lesson. Each answer saves as it is marked. On a reload the pupil gets Carry on and lands on the exact question (sit: Stage 2, Question 6 of 19).
- **After round 1 there is nothing new until the teacher opens round 2** on the Rounds tab. The home line reads "Round 1 · done · 35 of 126 marks", so the pupil can see they have finished and are not stuck.
- **Writing first.** The writing box locks after "I've written my answer", so a pupil cannot go back and edit it. This is by design (ruling 13.10, from the prototype look).

## Checked, no stall found
- Layout was checked on all 82 questions, before and after Check: no text wider than its box, no card that scrolls, and drop-down text shown in full.
- Live marks equal the judge's marks on all 82 questions (hash a6eb5c62, 35 of 126).
- A repeat Check keeps the first mark.
- Round 2 opens with a new question order and keeps round 1.
- No page errors.
