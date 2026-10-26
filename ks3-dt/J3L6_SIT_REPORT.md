# SIT REPORT — J3 Lesson 6, The Night Desk (Data Newsroom), 26 October 2026

How it was sat: the served hour walked end to end at 1280×800, 1440×900 and 1024×768, once answering right and once taking every wrong path first (`j3l6-walk.js --url` and `--fails`), plus the platform walk around it (`j3l6-platform.js`: sign-in tile, Do now, the hour, five questions, Free time, both free headlines). Screens read by eye at the smallest size. Set against the design window's sit (`L6_J2J3_PROTOTYPES/SIT_REPORT_J3.md`).

## What a pupil sees
1. Do now: five questions from earlier lessons.
2. The opening: today she finds out if a headline is telling the truth. Then the job: Dee, the night editor, messages her; Fionn has collected two tables (People, 60 rows; Days, 92 rows); a three-stop tour of the desk.
3. The desk: the table on the left, the question box and word bank above it, the headline card and the stamps on the right. The row of parts along the top says where she is.
4. Headline 1: Dee shows a rule, she types `sleep_hours >= 8` (17 people), sees the two averages, and stamps SPIKE with the reason The numbers say no.
5. Headline 2 uses AND, headline 3 BETWEEN on the Days table, headline 4 OR — the true one, so she stamps PRINT — and headline 5 NOT (too few people).
6. Headline 6, the rush: three minutes on the clock, hints still open, two rules on Days, SPIKE because one did not cause the other. If the clock runs out the paper prints, a letter arrives next morning, and Fix it lets her stamp it again.
7. The front page: The Harbour Post with her printed headline, the five spiked ones with reasons, and her name on the page.
8. Finish: badges, the recap, five last questions, then Free time with two more headlines.

Modelled time: 41 screens, 11.0 model minutes on the straight path; 44 screens and 12.7 minutes taking every wrong path (design sit: 10.6 and 12.1). The rush done right at 4 keys a second takes 8.5 s of its 180 s.

## Where a pupil could stall, and what catches her
| Place | Stall | What catches her |
|---|---|---|
| Question box, first time | Does not know what to type | The word bank puts any column, sign or word in the box by click; hint 3 shows the rule |
| Question box hint at 1024 and 1280 | **New in this sit:** the grey hint in the box was cut off mid-word ("Type a rule (a question fo") | **Fixed:** the hint is now "Type a rule, then press Enter", the line the design named; the tour already says a rule is a question for the table (recorded in `j3l6/string-edits.json`) |
| The table at 1024 | Nine columns | All nine fit at 1024, 1280 and 1440; 12 rows show with "and 48 more rows" |
| Headline 1 | Writes the number first | The line says the column comes first |
| Any word rule | Leaves the quotes off | The table reads a bare word as text; no stall |
| Headline 3 | 40 AND 45 drops a day | Her count is shown against the right one; BETWEEN keeps both ends |
| Headline 4 | AND for OR keeps nobody | The line names 0 rows and says one rule OR the other |
| Headline 6 | The clock | Hints stay open; running out is a story beat (the letter, Fix it), never a lock; Pause and a tab change both freeze it |
| Coming back | Leaves mid-hour | Welcome back with Carry on or Start again restores the rule, the stamps and the clock's seconds |

No dead end was found. Every wrong rule, every engine error and a missing stamp or reason has a line and a way on. At 1024×768 the row of parts wraps onto two lines but stays readable. The one new stall (the cut-off hint) is fixed.
