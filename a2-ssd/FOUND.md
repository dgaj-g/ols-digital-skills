# FOUND — faults found in the inherited design, each with its fix and the gate that now catches it

Format: F<n> · where · the fault · fix · gate.

F1 · prototype/lesson.js · a struck wrong option stays struck-looking but is never re-marked once the right option is chosen (build prompt names it) · the settled check re-renders every option with its final state · G5 lesson-check script: wrong → right leaves the struck option marked and its why visible.
F2 · lessons.json INSERT · the lesson bakes today's date as literal text · the lesson computes today's date at render (content holds a {today} token, the engine fills it) · G4 greps lessons for a literal ISO date in any INSERT step.
F3 · lessons.json CREATE "The whole thing" · shared cluster step text names DIVE ("write the exam answer for DIVE"), wrong for the five other CREATE parts · text made paper-neutral · G4 check: shared step text may not contain any paper's table name.
F4 · SPEC §3.6 door/beat strings (Show me first, See it done, See a similar one done) superseded by §12a (Learn it first, The lesson) · strings.json takes §12a/prototype wording · G4 coined-label list includes the old names.
F5 · prototype staff mock footnote "Tags: cold = … · seen = …" · coined labels in teacher text · staff shows the SPEC §3.8 tag words (unaided, saw answer) · G4 coined-label scan covers staff strings.
F6 · SPEC §9 T-CREATE-3 is CHILD, the very table the CREATE lesson builds line by line — Another question would re-serve the worked example · T-CREATE-3 re-targeted to SESSIONBOOKING (Tinies set 4) · G1 twin audit: no twin's table may be a lesson's statement table in the same cluster.
F7 · judge.js normaliser · a dropped comma in a VALUES row, a column list, a composite PK or DATEDIFF; a dropped or extra bracket (FK close, GETDATE, DEFAULT, IDENTITY, the CREATE body, a VALUES row); a dropped quote; a value left unquoted; a semicolon on every line — each cost marks (up to all of a point) although ruling 13 says punctuation never costs · a best-reading judge (six normaliser readings, best mark per point) plus bracket repair (short pre-pass, non-fit close, open pass with GETDATE priority), forgotten-comma repair on one-line CREATE bodies, quote repair that puts a lost opening quote after the = / ( / , when only plain words lie between, multi-word unquoted values (Tinies 1) · G1 written-exam battery: every model and twin model × every single-character slip, semicolons, line breaks, prefixes, AS, JOIN spelling, case, [names], GO, ASC → FULL; plus exact-input controls in controls.js.
F8 · markpoints.js 2022-c, 2024-d, 2025-b · the FROM point was awarded for any table at all (FROM zzztable scored it) · FROM must name a table in the part's chain (MARK_POINTS §0: any table in the chain) · G1 must-cost: FROM table replaced → below full.
F9 · markpoints.js 2021-b P10 · ORDER BY VetSurname, AppTime needed the two as the only items in that order; a pupil who puts another field between loses the mark though the scheme only asks surname then time · relaxed to surname first, time later · control.
F10 · markpoints.js / twinpoints.js hints · three hints promised punctuation ("in brackets", "in quotes") — 2015-3 P2, 2016-2 P5/P6, B-2c P5 · reworded to the content only · G1 punctuation scan over every label and hint.
F11 · T-CREATE-1 control 'no commas, one line, no separators' expected 5 (ruling 12's charge) · ruling 13 withdrew the charge: 6 · control corrected.
F12 · judge.js normaliser · both brackets of a group left off cost marks: COUNT DISTINCT x, SUM x in HAVING, DATEDIFF YEAR, a, b, a bare DATEADD inside MONTH( ), PRIMARY KEY a, b, FOREIGN KEY x REFERENCES, REFERENCES T col, CHECK x >= GETDATE(), IDENTITY 1,1, VARCHAR 6, an INSERT column list, a second VALUES row; and a stray ) at a fragment's end was given an opener that stole another group's ) (CHECK (x >= GETDATE ) lost the CHECK mark) · the group is read where its word says it runs (calls before the bracket pass, keys and rows after); an opener that makes a fitting group stop fitting is refused · G1 battery gains "both brackets dropped" for every pair; 15 exact-input controls (two confirm a wrong field or number inside a bare group still loses).
F13 · SPEC §6 / prototype expected/*.json · expected rows precomputed at design time; the seeds date themselves from today, so by the next day Same rows could say Different to a right answer · expected rows computed live from the model on a fresh seed (D12) · G5 A-check runs a right answer on two anchor dates and needs Same rows on both; G2 multi-date.
F14 · tools/tsql2sqlite.js · DATEADD(month|year, …) used SQLite's month modifier, which overflows (31 Mar − 1 month = 3 Mar), so "last month" questions went empty at month ends (2021-c empty on 31 Mar and 31 Dec) · clamped to the month's last day (D21) · G2 SHIM battery (month and year clamps, leap day) + nine-anchor runs.
F15 · tools/tsql2sqlite.js · ORDER BY a bare field that two joined tables share (2018-b-i JobNo) is ambiguous in SQLite though SQL Server accepts it when the SELECT list names t.JobNo · a bare ORDER BY name takes the qualifier from its SELECT-list item · G2 SHIM case "ORDER BY a qualified name".
F16 · tools/tsql2sqlite.js · SQL Server runs statements with no semicolon between them (2026-c two INSERTs); SQLite stops with a syntax error · statements split at each statement keyword at depth 0 (not after UNION/ALL/AS, not a CTE's or INSERT…SELECT's SELECT) · G2 SHIM cases: two INSERTs without a semicolon, INSERT…SELECT, CTE, UNION, UPDATE then SELECT.
F17 · tools/tsql2sqlite.js · DEFAULT GETDATE() became DEFAULT date('now'), which SQLite refuses without brackets (2024-c-i) · DEFAULT (date('now')) · G2 runs every ALTER/CREATE model.
F18 · src/judge/judge.js resolvePrefixes · SET STOCK.price = STOCK.price * 1.1 was read as a field compared with itself (a join slip) and cost the SET mark · a field followed by arithmetic is a calculation (D23) · controls.js EX "UPDATE with the table prefix on both sides".
F19 · src/judge/judge.js shortEnd/fits · IDENTITY(1,1,1) was "repaired" to IDENTITY(1,1),1) and scored the IDENTITY mark · identity reads any number of arguments, so a third number is seen and loses the mark · controls.js EX "IDENTITY with three numbers".
F20 · src/judge/markpoints.js depthSplit · the normaliser leaves "and(" with no space, so a WHERE of the form a and(b or c) was one conjunct and comma-FROM answers lost the pairing marks · split at top-level AND/OR with a bracket or space either side · answer-space sets 1–6 (G1 step 6).
F21 · src/judge/markpoints.js 2018-b-i p9 · a bracketed OR group under an AND hid the Frequency='M' + date pairing, so the model form with the pairing inside brackets lost the point · andPaired walks OR branches and AND conjuncts; one atom never counts as both halves · answer-space set 3.
F22 · src/judge/judge.js ownersOf · a bare field was owned by no table when the answer had no FROM yet, so a partial answer scored less than it should · looks across the paper's tables until a FROM appears (D24) · G1 step 3 (read as far as it goes).
F23 · gates · the six reader answer sets were run by hand and not by any gate · G1 step 6 runs gates/answerspace/run.js and fails on any disagreement or broken control; control: removing adjudicated.json turns G1 FAIL (checked 27 Sep).
F24 · src/judge/judge.js kindNote · "The question asks for a an ALTER TABLE" — the article was added twice · withArticle picks a/an once from the word · G1 step 7 judges every part and twin with the wrong kind of statement and checks the line
F25 · src/judge/judge.js fixSemis · a semicolon before REFERENCES / NOT NULL / DEFAULT inside CREATE brackets became a comma, splitting the definition and losing the foreign key · those words carry the definition on · controls
F26 · src/judge/markpoints.js setOf · SET a = 1 b = 2 (comma forgotten) hid the second field · a new "field =" starts the next item · controls
F27 · src/judge/markpoints.js nextDays · DATEADD(day 7 GETDATE()) with the commas dropped scored 0 · commas or spaces between arguments · controls
F28 · src/judge/twinpoints.js is/txt · O'Neill typed with one quote, or a value with its quotes missing, lost the value mark · values compare quote-blind · controls
F29 · content/lessons.json INSERT · the INSERT lesson built STOCKORDER, the table B-2b asks for, so the lesson handed over that answer · lesson moved to SESSIONBOOKING · G1 step 8
F30 · content/lessons.json INSERT · (a) worked rows overlapped a practice question's values; (b) a line told pupils quoting marks cost marks (ruling 13 says they never do); (c) a quick-check option '3' was marked wrong though it is right; (d) the worked date was a literal that went stale · rewritten (D34), {today} token, strike re-mark in lesson.js · cold reads + G4
F31 · src/judge/markpoints.js 2018-a + judge.js parseCreate · one CHECK holding both date rules joined by AND, e.g. CHECK ((StartDate >= GETDATE()) AND (EndDate > StartDate)), scored 0 for both rules though it enforces both · checkBodies/conjuncts split every CHECK at its top-level AND (BETWEEN kept whole); 2018-a, 2023-a and 2026-b read the split rules · controls (AND earns both; OR, which enforces neither, must lose both)

## F32 — lesson statements lost the comma before a field whose name starts with a keyword
Found while rendering CREATE-RULES: `OrderNo INT,` followed by `OrderDate DATE,` rendered as `OrderNo INT` with no comma, because the comma repair in platform/lessonview.js treated any line starting ORDER (or SET, LEFT, VALUES, …) as a clause keyword. OrderDate, Settings, Leftover and similar field names all triggered it, giving a statement that would not run.
Fix: CLOSER now matches the keyword only as a whole word. Gate: G1's lesson gate runs every step's statement on the seed, so a dropped comma fails the build.

## F33 — 2024-c-i refused DATETIME for the new StartDate field
MARK_POINTS §2015·1 accepts DATETIME for DATE, and the judge accepts it in 2015-1, 2023-a and 2026-b, but the 2024-c-i type point was written `date(?!time)`, so `ADD StartDate DATETIME DEFAULT GETDATE()` scored 3/4. Under ruling 13 a date type for a date field is not a wrong field.
Fix: the point accepts DATE, DATETIME, DATETIME2 and SMALLDATETIME. Controls: DATETIME → 4; VARCHAR(10) → 3.

## F34 · An INSERT with the word VALUES left out lost every row (inherited judge)
- Found: 27 Sep 2026, while probing 2024-a and 2025-a-ii for the two-row INSERT lesson.
- Fault: `INSERT INTO LSLOT_INSTRUCT (15, 18), (15, 27)` scored 1 of 3: the parser read (15, 18) as a column list, so neither row was seen. MARK_POINTS.md says "deduct 1 (floor 0) if VALUES is missing" → 2. Same for 2024-a (2 instead of 3: only the VALUES mark should go), 2015-3, 2017-1, 2026-c and every twin INSERT.
- Fix: parseInsert reads brackets holding a number, a quoted value or today's date as rows when VALUES is missing, and flags `noValues`. Points named VALUES (2015-3 P2, 2024-a P3, 2017-1 P4 and one slip on P2, 2026-c P3 and P6) need VALUES present; the rows points still read the rows. A new part-level `deduct` shows a scheme's "deduct 1" as its own line worth 0 or −1; totals never go below 0. 2025-a-ii and every twin INSERT carry the VALUES deduction.
- Gate: eight WX controls (2025-a-ii ×3, 2024-a, 2015-3, 2026-c, 2017-1, T-INSERT-1). Client must print a deduct line as "−1" (pending, client step).

## F35 — the examiners' own 2017 model answer scored 3 of 5
- Fault: the 2017 Q1 mark scheme leaves BookingStatus as an empty place in the VALUES row (`5,,2,2`) so the field takes its DEFAULT. The normaliser folded every `,,` into one comma, so the empty place vanished and every later value shifted one field left: BookingStatus got 2, NoOfChildren got '1004'. 3/5 for the model itself.
- Fix: judge.js gains one more reading, `emptySlot` (tried only when the answer holds `,,`): inside a VALUES row an empty place becomes DEFAULT. The best reading wins, so a doubled comma typed by mistake (2015-3 `(23,,3,…)`) still reads as one comma and keeps its 4.
- Gate: three controls in controls.js — the raw mark-scheme model → 5; the empty place with no column list → 5; two empty places where only one field has a default → 4. Controls 691, GREEN.

## F36 — two questions asked about something the pupil could not see
- Fault: 2026-c is marked on leaving out every field except SupplierID and EstDeliveryDate, but on the platform the SUPPLIERSTOCKORDER design shows plain types: the identity and the two defaults were set in part (b), which a pupil opening (c) on its own never sees. 2024-c-ii asks about "this change" without saying what the change was.
- Fix: papers.json parts gain a `lead` line, printed above the question as "From part (b): …" in the exam's own words (2026-c, 2024-c-ii). The question text itself stays verbatim.
- Gate: G1 checks every part whose marks depend on an earlier part (2026-c, 2024-c-ii) carries a `lead`, and G4 reads the lead with the other strings. The client prints it (A-test in G5).

## F37 — a test joined by OR in place of AND kept its mark (inherited judge)
- Found: 27 Sep 2026, probing 2016-2 for the joins lesson.
- Fault: `WHERE LocationName='Outlet' AND SalesDate='2016-01-29' OR SalesTime BETWEEN '13:00' AND '15:00'` scored 7/7. The date and time points only looked for the condition somewhere in the WHERE, so a row from any day between 1 and 3 pm would pass and the answer still earned both. Same shape in 2017-2 and 2017-3 (BookingNo), 2019-b (the <= reorder test) and 2024-b (SpecialID = 2).
- Fix: ctx gains `req(src)`: the condition sits on every OR branch of the WHERE, or is joined by AND into a JOIN's ON. A point that needs a test every row must pass uses `must()`: held → mark; present but only on one OR branch → 0 with the note "This test is joined to the others by OR, so a row can pass without it…"; missing → 0. Brackets that keep the tests together still earn the marks. Points that only ask for a clause to be present (2016-2 "WHERE LocationName", 2019-b "WHERE SupplierNo=12") and 2021-b's own AND point are unchanged.
- Gate: controls — 2016-2 date OR time → 5; the tests bracketed together → 7; the date test inside JOIN … ON → 7; 2017-2 second booking by OR, 2019-b OR for the reorder test. Controls 699, GREEN.

## F38 — '29/01/16' and '1pm' lost marks (inherited judge)
- Found: 27 Sep 2026, same probe.
- Fault: literal() read dd/mm/yyyy but not dd/mm/yy, and read 13:00 but not 1pm / 3 p.m. Both are clear to an examiner, so under ruling 13 neither may cost.
- Fix: literal() reads dd/mm/yy as 20yy, and h[:mm] am/pm (with or without dots and a space) as 24-hour time. '1:00' and '3:00' stay the morning and keep losing the time mark.
- Gate: controls — '29/01/16' → 7; '1pm' AND '3 p.m.' → 7; '1:00' AND '3:00' → 6.

## F39 — a percentage rise was checked at one value only (inherited judge)
- Found: 27 Sep 2026, probing 2016-3 for the UPDATE lesson.
- Fault: 2016-3, 2019-a, B-2a and T-UPDATE-1 worked the SET expression out at Price = 100 and compared it with 110 (or 105). At 100, `Price + 10` is 110, and so is a bare `110`, so "add ten pounds" and "set every price to 110" both earned the 10 % mark.
- Fix: `J.scaledBy(expr, field, factor)` works the expression out at 100, 37 and 250 and needs field × factor at all three. The four points call it in place of their one-value test.
- Gate: controls (F39 block) — + 10 and a bare 110 lose the mark on 2016-3; + 5 loses it on 2019-a and B-2a; + 10 loses it on T-UPDATE-1; * 110 / 100 and + x * 0.05 keep it; 2024-b's two tests in either order → 4, StaffID alone → 3. Controls 708, GREEN.

## F40 — "IS NULL AND" earned the "IS NULL, joined by OR" mark (inherited judge)
- Found: 27 Sep 2026, probing 2018-b-i for the NULL-OR lesson.
- Fault: point 7 needed "DateLastCarriedOut IS NULL" and the word OR anywhere in the WHERE. `DateLastCarriedOut IS NULL AND Frequency = 'W' OR ...` lists a never-done job only when it is weekly, yet scored 11 / 11. The scheme says "or (required)" at exactly that place.
- Fix: `orAlone(where, test)` needs the IS NULL test to be a whole branch of an OR, at the top level or inside any bracket. An outer AND round the whole OR group (comma-FROM joins) keeps the mark, and so does a bracket in the wrong place (ruling 13: brackets never cost).
- Gate: controls (F40 block, 10 rows) — IS NULL AND → 10; = NULL → 10; no brackets → 11; the never-done test last → 11; M OR date → 10; a bare 'M' → 10; DATEDIFF >= 23 → 11; DATEDIFF reversed → 10; date test the wrong way → 10; GETDATE() - 23 → 11. Controls 718, GREEN.

## F41 — two mark-point hints named a field in the wrong table (inherited judge)
- Found: writing the NULL-OR lesson, reading 2018-b-i's points against the printed design.
- Fault: the 2018-b-i hint "JOB gives JobType and DateLastCarriedOut" is false: DateLastCarriedOut is in CONTRACTJOB. The 2017-3 hint "ROOM gives the room number and its type" suggests ROOM holds the type; it holds only TypeNo. A pupil who missed the point would be sent to the wrong table.
- Fix: "JOB gives JobType, and the SkillNo that leads to SKILL." and "ROOM links each room to its TypeNo, which leads to ROOMTYPE."
- Gate: G1 gains a hint check: every design field name a hint mentions must belong to a table the same hint names, or to no printed table at all (tools/g1-judge.js, hint-field rule).

## F42 — the detector never ran on lessons with a statement per part, so the joins lesson handed over 4 of 7 marks of a practice question
- Found: extending the detector for the counting lesson; it crashed on SELECT-JOIN's per-part src list ("src.split is not a function"), so that lesson had never been checked.
- Fault: SELECT-JOIN's 2015-2 statement (both B-4b joins + ORDER BY BookingDate ascending) and its 2019-b statement (both joins + four fields with AmountPaid) each scored 4/7 on B-4b, a practice question in the same SELECT-JOIN cluster (SPEC §9). A pupil could copy the lesson into the practice question for more than half the marks.
- Fix: det.js loops over every src variant with every step reached. 2015-2's lesson task now asks for the most recent session first (ORDER BY BookingDate DESC), and the order step teaches both directions, so the exam check (earliest first = ascending) is a real transfer. 2019-b's SELECT no longer shows AmountPaid (it is tested, not shown; the select step says so). Both now score 3/7 on B-4b. Every lesson re-run: none over half.
- Gate: G1's detector check runs over every src variant of every lesson and fails any statement scoring more than half on any SQL part or practice question (tools/g1-judge.js, detector check).

## F43 — the practice database counted a four-hour session as 239 minutes, and weeks by sevens
- Found: before writing the weekly-hours lesson, a probe of the SQL Server → SQLite converter on DATEDIFF(MINUTE, '08:00', '12:00').
- Fault: minutes and hours came from a floating-point day fraction truncated to an integer, so 08:00–12:00 gave 239 and 09:30–13:30 gave 3 hours. SQL Server counts boundaries crossed: 240 minutes, 4 hours, and DATEDIFF(HOUR, '09:59', '10:01') is 1. Weeks were whole sevens of days, where SQL Server counts Sunday boundaries (Saturday to Sunday is 1 week).
- Fix: minutes and hours are whole-second epoch values divided by 60 or 3600 and subtracted (boundary count); weeks count Sundays crossed from a Sunday reference (31/12/1899).
- Gate: G2 shim controls — MINUTE 08:00–12:00 = 240, 13:00–16:30 = 210, HOUR 09:59–10:01 = 1, hh 09:30–13:30 = 4, week Sat→Sun = 1, Sun→Sat = 0, two Sundays = 2. Four of the seven fail on the old converter.

## F44 — one wrong COUNT field cost two marks on 2022·d
- Found: before writing the orders-by-month lesson, probing the judge with COUNT(cakeOrderID) in place of COUNT(cakeTypeID).
- Fault: the HAVING point demanded COUNT(cakeTypeID) or COUNT(*) inside HAVING, so the same field choice lost the COUNT mark and the HAVING mark. MARK_POINTS 2022·d row 6 is "HAVING COUNT(…) > 1": any argument.
- Fix: the HAVING point accepts COUNT of any field (> 1 or >= 2). The COUNT point in the SELECT is unchanged (row 2: cakeTypeID, * fine).
- Gate: G1 control "2022-d COUNT(cakeOrderID) twice" expects 6/7; the old judge gave 5/7.

## F45 — the practice database lost the time when adding minutes
- Found: before writing the add-a-slot lesson, converting DATEADD(MINUTE, 150, '09:00').
- Fault: every DATEADD went through date( ), which keeps only the date, so adding minutes or hours to a time gave '2000-01-01', never '11:30'.
- Fix: DATEADD with MINUTE or HOUR keeps the time: a time stays a time (HH:MM), a date-time stays a date-time.
- Gate: G2 shim controls DATEADD(MINUTE, 150, '09:00') = 11:30, (minute, 30, '17:00:00') = 17:30, (HOUR, 4, '08:00') = 12:00, (mi, -45, '13:00') = 12:15. All four fail on the old converter.

## F46 — the table name SITE_STOCK earned the "depends on the site" mark
- Found: checking the written-answer lessons against 2026·a and its practice question.
- Fault: the test looked for the word "site" anywhere, and found it inside SITE_STOCK. "Because it is in the SITE_STOCK table for each item" scored 1 of 1 without saying anything about sites.
- Fix: the table name (SITE_STOCK or "site stock") is taken out before the test reads the answer, on 2026·a and on T-PROSE-1.
- Gate: controls pin "Because it is in the SITE_STOCK table for each item." = 0 (2026·a and T-PROSE-1), "It is stored in site stock for each item." = 0, and "Each site uses different amounts, so SITE_STOCK holds a level for each site." = 1. The first two fail on the old test. controls 723 GREEN.

## F47 — a lesson step with no quick question (AGG-WEEK, 2025·b)
- Found: the new lesson gate (G1 step 10), first run.
- Fault: the SELECT step of the weekly-hours lesson had no quick question for 2025·b, so the pupil moved on without checking anything against the exam tables.
- Fix: a quick question asks which table holds the instructors' names (INSTRUCTOR, named in the question's note, not drawn).
- Gate: G1 step 10 fails any shown step without a quick question for every part the lesson serves; control "step has no quick check" must be caught.

## F48 — a wrong-click reason for a table the pupil cannot click (INSERT-ROWS, 2025·a·ii)
- Found: G1 step 10, first run.
- Fault: the table question had a reason for clicking INSTRUCTOR, which the 2025 design never draws. Dead text, and a sign the question was written from memory, not from the drawn tables.
- Fix: removed.
- Gate: every wrong key of a field or table question must be a table or field of the part's exam design.

## F49 — the practice-question check compared table names across databases
- Found: G1 step 8 after lessonFor replaced the one-lesson-per-cluster field.
- Fault: B-1a (INSERT into CHILD, Tinies set 1) was flagged against INSERT-LINKED (CHILD in set 4): same name, different table.
- Fix: step 8 flags a practice question only when it writes the table the lesson builds in the same database.
- Gate: G1 step 8.

## F50 — a CREATE lesson could not be run on its own database
- Found: G1 step 10 running every step statement.
- Fault: none in the lessons; the gate first ran CREATE TABLE on a seed that already had the table. The gate now drops that table first (foreign keys off), so every CREATE step is proved to run.
- Gate: G1 step 10.

## F51 — the rows label named the answer (2021-a, T-PROSE-2)
- Found: reading the practice-question labels for the rows input.
- Fault: "AnimalID: PRIMARY KEY, with the reason" printed the constraint the pupil must name.
- Fix: the public label becomes "AnimalID: the constraint, with the reason" (D55); the judge's label shows only after marking.
- Gate: G4 fails if any public label matches a constraint keyword followed by ", with the reason".

## F52 — the prototype's quick check read "outside" before the wrong pick's own line
- Found: re-reading prototype/lesson.js for the port.
- Fault: a wrong field with its own reason in wrong{} got the generic "That field is in another table" line.
- Fix: order is wrong[picked], then outside, then '*' (D62).
- Gate: G5 A-lesson clicks a field with its own wrong line and reads that line.

## F53 — build guard tripped by its own comment
- Found: first run of tools/build-server.js.
- Fault: the Code.gs.template header comment listed the @@…@@ markers, so the unfilled-placeholder guard refused the build.
- Fix: the comment names the settings in words.
- Gate: build-server placeholder guard (every @@X@@ anywhere in the filled template refuses the build).

## F54 — lesson tag regex read as an Apps Script scriptlet
- Found: first run of tools/build-server.js.
- Fault: lessonview.js held `⟪(<?)`, which HtmlService would read as a scriptlet opener.
- Fix: `([<]?)`.
- Gate: build-server stray `<?` / `?>` guard.

## F55 — "Different rows" when the query did not run
- Found: full-part walk (walk2) at 1280×800.
- Fault: a query that would not run here showed the badge "Different rows" beside the run error.
- Fix: the badge says "Did not run" (result.noRun).
- Gate: G5 A7 reads the badge for a query that errors.

## F56 — a fill-in answer that runs into the next blank scored nothing
- Found: marking 2026-d with the whole HAVING line in blank 3 and blank 4 left empty.
- Fault: 0/1 on both blanks, where the written paper gives both marks for an answer that runs across the two printed lines.
- Fix: judge.js clozeSpill re-splits a run-on answer between a blank and its empty neighbour when both halves earn their points (ruling 13).
- Gate: controls.js — run-on forward (4/4), run-on backward (4/4), run-on with the wrong test (2/4, must fail the extra marks).

## F57 — two pupils on one browser shared drafts, doors and cached marks
- Found: G5 A7 — a fresh pupil opened a part and met no doors, because the pupil before them on the same browser had already opened its lesson.
- Fault: browser storage keys (drafts, lesson state, door, last verdict, evaluation outbox) were not keyed by the signed-in account; on a shared school PC the next pupil would see the last pupil's draft and mark.
- Fix: every app.js storage key is prefixed with the signed-in email (LS.key).
- Gate: G5 A6/A7 run several pupils in one browser; a fresh pupil must meet both doors.

## F58 — two pupils with the same first name looked identical on Live
- Found: G3 staff screenshot — five dev pupils all read "Dev".
- Fault: the Live pupil column showed the first name only; two Aoifes in one class could not be told apart.
- Fix: a shared first name adds the account name (the part before @) in small grey type.
- Gate: G3 staff probe; G5 A13 Live.

## F59 — the class count included the teacher who opened the class link
- Fault: on the live site, opening the pupil link as the owner made Classes read "U6-SSD · 1 pupil" with no pupils in the class.
- Fix: the count leaves out the viewer's own record, as the CSV already does (D57). Shipped in version 2.
- Gate: dev harness (teacher alone = 0 pupils; one pupil = 1); live Classes row after version 2 read "U6-SSD · 0 pupils" with the owner's record present — passed 27 Sep 2026 11:17.
