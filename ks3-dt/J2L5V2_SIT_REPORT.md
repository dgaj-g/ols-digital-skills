# J2 Lesson 5 "Loop Machines" (The Search), Version 2: sit report

1 Nov 2026. The walker (`tools/record-tutorial/j2l5-walk2.js`) played the whole served lesson as a pupil, film to the last screen, at 1512×860, 1366×768, 1280×720 and 1024×768 (13 checks each, all passed; Home reached in 13.5 to 14.0 lesson minutes). It also ran the "running out of time" paths (`--mins 48` and `--mins 50`, 14 checks each, passed). The platform gate (sign-in, saves, Welcome back, lamb name, notes, free flight) passed 46 of 46. Screenshots at every size were looked at by eye.

## What a pupil sees, in order
1. **Recap**, then **Do now**: the opening film (the bang, the lamb is lost). Each caption waits for Next.
2. **1 The tracks.** She types one print, then tries the long way against a clock. The snow wins, BEEP winds the story back, and she writes her first `for` loop. All 20 prints light up.
3. **2 The walls.** She counts the walls of a square field, a sheepfold (timed) and a three-cornered field. She puts the count in `range()`.
4. **3 The growing square.** BEEP counts `i` aloud from 0. She uses `i` to make each side longer, and they find the lamb.
5. **4 The way home.** Three loop bugs: a wrong turn, a wrong count, a line outside the loop. She fixes each, then the last timed flight to the barn.
6. **The close.** The barn film, her lamb's name and badges, one recap screen, BEEP's 5 questions, how it felt, then Finish or Free flight.

## Where she could stall, and what happens
- **Her first loop (tracks, step 5).** A missing colon or missing spaces can cost a weak pupil up to four runs. Each message names one fix. After two wrong runs, the card line she got wrong is ringed. There is no clock, so it costs minutes, not a fail.
- **A timed beat (sheepfold, growing square, barn).** If the clock runs out, BEEP winds back to the start of that step. Her code stays in the box and the clock restarts. This is one extra pass, never a dead end.
- **Running out of the hour.** After minute 48, a note comes up and each chapter end offers Carry on or Home. Her place is saved, and the next sign-in opens at Welcome back.
- **Reading the help.** The help now says: read the card, type in the box, the line under the box says what to change, and Pause is at the bottom left.

## Wording
- Two separated cold readers read every one of the 117 pupil strings. The 16 lines where both asked for a rewrite were changed, and round 2 passed all of them. One help sentence was then cut to 14 words for the words gate. Split verdicts were kept as written (DFM 270).
- The hour's own `strings.js` mirrors the lesson file. The words gate checks the 516 strings in both.

## Small things seen, kept as they are
- At 1024×768 the close screen's caption bar runs under the empty lower edge of the right panel. No text is covered, so it is cosmetic.

## Not walked by a machine
- A real C2k pupil account on a school laptop. The live smoke after the Apps Script version covers sign-in and the opening.
- Real-time length with a class. The walks run fast mode, which shortens every wait except the clocks.
