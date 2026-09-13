TRANSCRIPT HASH: 36bfbaeacc2634c6

This is a second re-file, following the build that incorporated the "Averages" book's REWRITEs. I diffed the new `_v4.md` against the one behind my last filing, line for line: the entire shell/strings catalogue (all 362 "strings.js" lines) and every candidate except one are byte-identical, so all of that carries forward unchanged with its verdict untouched. The one difference is that `stats-averages > s5 > movie > step6 > say` has dropped out of the read-first candidates tail entirely — it no longer gets flagged, because the build report says its text changed from "That is exactly the method — true." to "Dividing 1855 by 20 is exactly the method — the claim is true.", which resolves the bare-"That" fault I raised on it. That new wording appears in neither transcript I am allowed to read (film lines were never in the pupil transcript, and the shell transcript's tail no longer lists this path at all), so — as with the stats-averages verdict file — it gets no formal row rather than an invented one; for the record, naming the actual division instead of "That" is exactly the fix that was needed. The sentence count in the header has moved from 401 to 400 to match. Two faults already on file stay open and unfixed: statStageIqr still tells her to press "Mark my working" for a button actually named "Mark my answers", and statStageCfplotPlace still hands her the cumulative-frequency height ("Next: across 15, up 18") that the question is meant to test. Everything from the previous filing — the paragraph on how I read the "strings.js > pupil", "strings.js > teacher" and book-content lines, the eighteen typographic apostrophe/quote fixes, the eighteen new "Averages"-book table strings, and the twenty-four "[carried from the approved build, flagged for a read]" reaffirmations — still describes the table below; nothing in any of that changed tonight.

## The sentence table

| verdict | where it is | the sentence | why |
|---|---|---|---|
| PASS | strings.js > pupil > coverBusy | Opening your books… | Clear loading state. |
| PASS | strings.js > pupil > coverGetting | Getting your details… | Clear. |
| PASS | strings.js > pupil > coverWelcome | Welcome | Plain. |
| PASS | strings.js > pupil > coverOpen | Open your books | Clear, actionable. |
| PASS | strings.js > pupil > coverSwitch | Not you? Switch account | A familiar pattern from real account-switcher screens; clear in context. |
| PASS | strings.js > pupil > coverFirstTime | First time here? Google will ask your permission once, then you are straight in. | Clear, reassuring, explains what happens. |
| PASS | strings.js > pupil > coverNoServer | We could not reach the server. Check your connection and reload the page. | Clear, doesn't blame "the wifi", actionable. |
| PASS | strings.js > pupil > coverWrongClass | That class link is not active. Ask your teacher for the link again. | Clear, actionable. |
| PASS | strings.js > pupil > coverNameLabel | Your name | Plain field label. |
| PASS | strings.js > pupil > coverNamePrompt | We could not read your name from your account. Write it once and it is saved. | Clear, reassuring. |
| PASS | strings.js > pupil > coverNameMissing | Write your name first, so your teacher sees it on her class list. | Clear, true to the screen. |
| PASS | strings.js > pupil > coverPreview | This is the preview copy of MathShelf. Nothing here is saved to school. | "This" points at the whole screen in front of her — immediate enough to follow. |
| PASS | strings.js > pupil > shelfGreetingMorning | Good morning | Plain. |
| PASS | strings.js > pupil > shelfGreetingAfternoon | Good afternoon | Plain. |
| PASS | strings.js > pupil > shelfPlain | Your maths books live here. Your teacher chooses which ones are out. | Approved shelf line. |
| PASS | strings.js > pupil > shelfMore | Your teacher decides which books are on this shelf, and may add more during the year. | Clear, honest. |
| PASS | strings.js > pupil > shelfMarks | 6 of 8 marks · 5 of 8 answered | Plain progress readout. |
| PASS | strings.js > pupil > backToShelf | The shelf | Named concrete noun. |
| PASS | strings.js > pupil > opening | Opening Angles… | Clear loading state. |
| PASS | strings.js > pupil > nudgeBanner | Your teacher suggested watching this method. | Approved exemplar text. |
| PASS | strings.js > pupil > selfEvalSaved | Saved. Your teacher sees this on her class list. | Honest, clear. |
| PASS | strings.js > pupil > selfEvalHeading | Exercise finished — how did that go? | Clear. |
| PASS | strings.js > pupil > selfEvalOptional | optional | Plain tag. |
| PASS | strings.js > pupil > saveWaiting | Still saving your work… | Clear status. |
| PASS | strings.js > pupil > saveRetry | Try again | Plain button. |
| PASS | strings.js > pupil > saveHeldLocal | Your work is safe on this device and will be sent as soon as the page can reach the server. | Reassuring, honest, doesn't blame the wifi. |
| PASS | strings.js > pupil > saveRefused | The server will not accept your save right now. Nothing you wrote is lost — try again in a moment, or tell your teacher. | Clear, reassuring, doesn't blame "the wifi"; gives her two real options (retry, or tell her teacher) without assuming a teacher is present. |
| PASS | strings.js > pupil > statCheckCftable | Mark my table | Names the Check button clearly. |
| PASS | strings.js > pupil > statCheckCfplot | Mark my points and curve | Clear. |
| PASS | strings.js > pupil > statCheckCfread | Mark my readings | Clear. |
| PASS | strings.js > pupil > statCheckBoxplot | Mark my box plot | Clear. |
| PASS | strings.js > pupil > statCheckCompare | Mark my comparison | Clear. |
| PASS | strings.js > pupil > statCheckJudge | Mark my answers | Clear. |
| PASS | strings.js > pupil > statCheckValues | Mark my answers | Clear. |
| PASS | strings.js > pupil > statAlreadyMarked | This question is already marked. | Clear status. |
| PASS | strings.js > pupil > statTryAgain | Not quite. Your first go stays above — one more attempt. | Short, clear opener; tells her exactly what happens and how many goes are left, without giving the answer. |
| PASS | strings.js > pupil > statPutBack | Press it again to put it back. | Device-neutral, clear. |
| PASS | strings.js > pupil > statRemoveLast | Remove the last one | Clear. |
| PASS | strings.js > pupil > statNextRow | next ↓ | Plain, iconed. |
| PASS | strings.js > pupil > statThatsMine | ✓ That’s my answer | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > pupil > statThatsMyOne | ✓ That’s my median | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > pupil > statRuleFiction | The rule is the line that crosses the graph. Move it up the frequency axis to the height you need, then read where it meets the curve. | Names the rule and where it goes before she uses it — matches the approved fiction. |
| PASS | strings.js > pupil > statTrayFiction | The tray is the row of markers waiting to be used. A marker leaves the tray when it goes on the scale. | The box-plot instantiation of the shelf's named tray fiction (cards / values / markers), matching the approved template exactly — names the fiction plainly before use. |
| PASS | strings.js > pupil > statMedian | median | Plain term, defined by the film. |
| PASS | strings.js > pupil > statLowerQuartile | lower quartile | Plain term. |
| PASS | strings.js > pupil > statUpperQuartile | upper quartile | Plain term. |
| PASS | strings.js > pupil > statIqr | interquartile range | Plain term. |
| PASS | strings.js > pupil > statRange | range | Plain term. |
| PASS | strings.js > pupil > statLowest | Lowest | Plain label. |
| PASS | strings.js > pupil > statHighest | Highest | Plain label. |
| PASS | strings.js > pupil > statClassColumn | Group | Plain column header. |
| PASS | strings.js > pupil > statFrequency | Frequency | Plain header. |
| PASS | strings.js > pupil > statCumulativeFrequency | Cumulative frequency | Plain header, term defined by the film. |
| PASS | strings.js > pupil > statReading | reading | Plain word. |
| PASS | strings.js > pupil > statQlistOrderWhy | Put every value in the row first. | Clear, device-neutral. |
| PASS | strings.js > pupil > statQlistPickWhy | Choose each value you were asked for first. | Clear. |
| PASS | strings.js > pupil > statQlistCommit | ✓ That’s my median | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > pupil > statQlistCommitWhy | Choose a value in the row first. | Clear. |
| PASS | strings.js > pupil > statQlistIqrWhy | Work out the interquartile range first. | Clear. |
| PASS | strings.js > pupil > statQlistTruth | In order: 4, 7, 7, 9, 12, 15, 21 | A truth line shown after the question is locked — the checklist allows the answer to appear once marking is done, so the only test is plainness. Read as a labelled data readout ("In order:" plus her ordered list), it is plain, matching the many other label-plus-value readouts already approved on this shelf. |
| PASS | strings.js > pupil > statPickOne | median = 65 | An echo of her own typed value, like "You answered '62'". |
| PASS | strings.js > pupil > statPickPair | median = (9 + 12) ÷ 2 = 65 | Echo template. |
| PASS | strings.js > pupil > statLineOne | median = 65 | Echo template. |
| PASS | strings.js > pupil > statLinePair | median = (9 + 12) ÷ 2 = 65 | Echo template. |
| PASS | strings.js > pupil > statCftableRow | Cumulative frequency up to 65 minutes | Plain row label. |
| PASS | strings.js > pupil > statCftableWhy | Fill in at least one row of running totals before you check. | Fixed — the earlier "Put a running total in at least one row first" stacked two prepositions; this reads clean aloud. |
| PASS | strings.js > pupil > statCftableTruth | Running totals: 4, 7, 7, 9, 12, 15, 21 | Same reasoning as statQlistTruth — a post-lock truth line, plain as a labelled readout, and the checklist allows the reveal at this point. |
| PASS | strings.js > pupil > statPlotPlaceWhy | Place every point first. | Clear. |
| PASS | strings.js > pupil > statPlotJoinWhy | Join the points first. | Clear. |
| PASS | strings.js > pupil > statJoinPoints | ✓ Join the points | Concrete. |
| PASS | strings.js > pupil > statPlotJoinedAlready | The points are joined. | Clear status. |
| PASS | strings.js > pupil > statPlotEnough | You have all the points you need — move one instead. | Clear, tells her what to do. |
| PASS | strings.js > pupil > statPointReadout | (30, 18) | Coordinate echo template. |
| PASS | strings.js > pupil > statScrollGraph | Scroll or swipe the graph sideways to see all of it. | Names both gestures, device-neutral, clear. |
| PASS | strings.js > pupil > statNudgeLabel | Move it one square | Device-neutral, clear. |
| PASS | strings.js > pupil > statNudgeLeft | One square left | Clear. |
| PASS | strings.js > pupil > statNudgeRight | One square right | Clear. |
| PASS | strings.js > pupil > statNudgeUp | One square up | Clear. |
| PASS | strings.js > pupil > statNudgeDown | One square down | Clear. |
| PASS | strings.js > pupil > statRemovePoint | Take this point off | Clear. |
| PASS | strings.js > pupil > statReadWhy | Find every value you were asked for first. | Clear. |
| PASS | strings.js > pupil > statReadMoveWhy | Move the rule to the height you need first. | Clear, tells her what to do before the control. |
| PASS | strings.js > pupil > statReadAtXWhy | Move the rule across and put your answer in first. | Clear. |
| PASS | strings.js > pupil > statValueReadout | 65 | Echo template. |
| PASS | strings.js > pupil > statCfReadout | 65 | Echo template. |
| PASS | strings.js > pupil > statHowManyAbove | How many above | Plain label. |
| PASS | strings.js > pupil > statHowManyBelow | How many below | Plain label. |
| PASS | strings.js > pupil > statPctAbove | Percentage above | Plain label. |
| PASS | strings.js > pupil > statPctBelow | Percentage below | Plain label. |
| PASS | strings.js > pupil > statBoxPlaceWhy | Put all five markers on the scale first. | Clear. |
| PASS | strings.js > pupil > statDrawBoxPlot | ✓ Draw the box plot | Concrete. |
| PASS | strings.js > pupil > statBoxDrawWhy | Draw the box plot first. | Clear. |
| PASS | strings.js > pupil > statBoxDrawnAlready | The box plot is drawn. | Clear status. |
| PASS | strings.js > pupil > statBoxStageWhy | Finish the first part before this one. | Clear enough. |
| PASS | strings.js > pupil > statNextDrawBox | Next: draw the box plot | Clear. |
| PASS | strings.js > pupil > statCompareWhy | Finish both sentences first. | Clear. |
| PASS | strings.js > pupil > statCompareValue | Value | Plain label. |
| PASS | strings.js > pupil > statCmpHigherMedian | had the higher median | A sentence-building chip, fine in context. |
| PASS | strings.js > pupil > statCmpAgainst | against | Chip word. |
| PASS | strings.js > pupil > statCmpSoOnAverage | so on average | Chip word. |
| PASS | strings.js > pupil > statCmpWere | were | Chip word. |
| PASS | strings.js > pupil > statCmpHadThe | had the | Chip word. |
| PASS | strings.js > pupil > statCmpLarger | larger | Chip word. |
| PASS | strings.js > pupil > statCmpSmaller | smaller | Chip word. |
| PASS | strings.js > pupil > statCmpSoTheirs | so theirs were | Chip word. |
| PASS | strings.js > pupil > statCmpMore | more | Chip word. |
| PASS | strings.js > pupil > statCmpLess | less | Chip word. |
| PASS | strings.js > pupil > statCmpConsistent | consistent | Chip word, term for the film to define. |
| PASS | strings.js > pupil > statFairToSay | Fair to say | Matches approved judgement-chip style. |
| PASS | strings.js > pupil > statNotFair | Not fair | Short, clear binary chip, paired plainly with "Fair to say". |
| PASS | strings.js > pupil > statJudgeDecideWhy | Decide every claim first. | Clear. |
| PASS | strings.js > pupil > statJudgeReasonWhy | Give a reason for each one you called not fair. | Clear. |
| PASS | strings.js > pupil > statValuesStart | Choose a box and put your answer in. | Clear. |
| PASS | strings.js > pupil > statValuesWhy | Put a number in one box before you check. | Fixed — the earlier "Put a number in at least one box first" had the same stacked-preposition problem as statCftableWhy; this reads clean. |
| PASS | strings.js > pupil > statPillOrder | Put in order | Plain stage label. |
| PASS | strings.js > pupil > statPillCuts | Find the quartiles | Plain. |
| PASS | strings.js > pupil > statPillIqr | Find the interquartile range | Plain. |
| PASS | strings.js > pupil > statPillCftable | Fill the running total | Plain. |
| PASS | strings.js > pupil > statPillValues | Work out the values | Plain. |
| PASS | strings.js > pupil > statPillPlot | Plot the points | Plain. |
| PASS | strings.js > pupil > statPillJoin | Join the points | Plain. |
| PASS | strings.js > pupil > statPillRead | Read the median | Plain. |
| PASS | strings.js > pupil > statPillReadAt | Read at 30 | Template with example value. |
| PASS | strings.js > pupil > statPillBoxPlace | Place the markers | Plain. |
| PASS | strings.js > pupil > statPillBoxDraw | Draw the box plot | Plain. |
| PASS | strings.js > pupil > statPillCompare1 | The averages | Plain. |
| PASS | strings.js > pupil > statPillCompare2 | The spread | Plain. |
| PASS | strings.js > pupil > statPillJudge | Decide each one | Plain. |
| PASS | strings.js > pupil > statStageQlistOrder | Build the ordered list. Choose the smallest value first, then the next smallest, and keep going until every value is in the row. (3 still to place.) | Very clear, step by step, doesn't leak. |
| PASS | strings.js > pupil > statStageQlistPick | Now choose the value you think is the median. If it sits between two values, choose both. Then press ✓ That’s my median. | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| FAIL | strings.js > pupil > statStageIqr | Enter the interquartile range on the pad. When it is in, press Mark my working. | "Mark my working" is not one of this book's named Check buttons for a pad answer — the naming pattern elsewhere is "Mark my answers". A pupil pressing what's actually on screen won't find a button by this name. → "Enter the interquartile range on the pad. When it is in, press Mark my answers." |
| PASS | strings.js > pupil > statStageIqrCommit | Enter the interquartile range on the pad, then press ✓ That’s my answer. | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > pupil > statStageCftable | Fill in the running total from the top row down: each box is the total so far plus that row’s frequency. Choose a box, then use the pad. | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| FAIL | strings.js > pupil > statStageCfplotPlace | Plot one point for each row of the table: across at the top of the class, up at the running total. Next: across 15, up 18. (3 of 5 placed.) | The method line is fine, but "Next: across 15, up 18" hands her the exact height (the cumulative frequency) she is meant to be reading from her own table — the thing this exercise is testing. → "Plot one point for each row of the table: across at the top of the class, up at the running total. (3 of 5 placed.)" |
| PASS | strings.js > pupil > statStageCfplotJoin | Every point is placed. Join them to draw the curve: press ✓ Join the points. | Clear, action before control name. |
| PASS | strings.js > pupil > statStageCfread | Move the rule up the frequency axis to the height for the median, then read where it meets the curve. Press ✓ That’s my median to keep it. | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > pupil > statStageCfreadAtX | Move the rule along the bottom axis to 30, and read the total where it meets the curve. Then enter the answer on the pad. | The x-value (30) is a given from the question itself, not the answer — fine. |
| PASS | strings.js > pupil > statStageBoxPlace | Choose a marker, then choose where it belongs on the scale. All five go on. (3 of 5 placed.) | Clear, doesn't leak positions. |
| PASS | strings.js > pupil > statStageBoxDraw | All five markers are on the scale. Press ✓ Draw the box plot. | Clear. |
| PASS | strings.js > pupil > statStageCompare1 | Finish the first sentence: choose the group with the higher median, then enter both medians. | Clear; deciding which group is the task itself, not a leak. |
| PASS | strings.js > pupil > statStageCompare2 | Finish the second sentence: choose the measure, the group and the two values. | Clear. |
| PASS | strings.js > pupil > statStageJudge | For each statement choose Fair to say or Not fair. If you choose Not fair, choose the reason as well. | Clear. |
| PASS | strings.js > pupil > statStageJudgeOptions | Choose what happens to each one. | Clear. |
| PASS | strings.js > pupil > statStageJudgeChoose | Read each statement and choose one of the answers under it. | Clear, action-first, device-neutral ("choose"), doesn't leak which answer is right. |
| PASS | strings.js > pupil > statCheckOrder | Mark my order | Names the Check button clearly, matches the established "Mark my X" pattern. |
| PASS | strings.js > pupil > statCheckPick | Mark my choice | Clear, matches the pattern. |
| PASS | strings.js > pupil > statCheckStemleaf | Mark my diagram | Clear; "diagram" matches the stem-and-leaf vocabulary already used. |
| PASS | strings.js > pupil > statCheckPie | Mark my pie chart | Clear, concrete noun. |
| PASS | strings.js > pupil > statCheckScatter | Mark my graph | Clear; "graph" matches the vocabulary already used in the scatter stems. |
| PASS | strings.js > pupil > statOrderWhy | Put every card in the row first. | Clear, matches the established "Put every X in the row first" pattern. |
| PASS | strings.js > pupil > statPickWhy | Choose the better question first. | Clear. |
| PASS | strings.js > pupil > statPickWhyWhy | Say why the others fall short first. | Clear enough in context — "the others" points at the two questions she didn't choose, just seen. |
| PASS | strings.js > pupil > statSlWhy | Put every leaf on a stem first. | Clear. |
| PASS | strings.js > pupil > statSlKeyWhy | Build the key first. | Clear. |
| PASS | strings.js > pupil > statPieWhyTable | Fill in every angle first. | Clear, "Fill in" matches the verb already used for the cumulative frequency table. |
| PASS | strings.js > pupil > statPieWhyRim | Place every sector boundary first. | Clear. |
| PASS | strings.js > pupil > statPieWhyDraw | Press ✓ Draw the pie chart first. | Matches the approved "Press ✓ X first" pattern already used for Join/Draw controls. |
| PASS | strings.js > pupil > statPieWhyLabels | Put a label on every sector first. | Clear. |
| PASS | strings.js > pupil > statScWhyPlot | Plot every point first. | Clear. |
| PASS | strings.js > pupil > statScWhyLine | Draw the line of best fit first. | Clear, names the full term "line of best fit" already used in the stems. |
| PASS | strings.js > pupil > statScWhyEst | Read the estimate and enter it first. | Clear. |
| PASS | strings.js > pupil > statScWhyCorr | Choose the correlation first. | Clear. |
| PASS | strings.js > pupil > statScWhyOutlier | Choose the reading that looks wrong first. | Plain, concrete — "looks wrong" is the phrasing its sibling strings now match. |
| PASS | strings.js > pupil > statTrayFictionOrder | The tray is the row of cards waiting to be used. A card leaves the tray when it goes into the row. | Matches the approved tray-fiction template exactly, verbatim to the text already passed in the stats-collect book. |
| PASS | strings.js > pupil > statTrayFictionLeaves | The tray is the row of values waiting to be used. A value leaves the tray when its leaf goes on a stem. | Matches the approved tray-fiction template exactly, verbatim to the text already passed in the stats-collect book. |
| PASS | strings.js > pupil > statPillPickChoose | Choose the better question | Plain stage label. |
| PASS | strings.js > pupil > statPillPickWhy | Say why | Plain, terse, matches the brevity of other pill labels. |
| PASS | strings.js > pupil > statPillSlPlace | Place the leaves | Plain. |
| PASS | strings.js > pupil > statPillSlKey | Write the key | Plain. |
| PASS | strings.js > pupil > statPillPieTable | Work out the angles | Plain. |
| PASS | strings.js > pupil > statPillPieRim | Draw the sectors | Plain. |
| PASS | strings.js > pupil > statPillPieLabels | Label the chart | Plain. |
| PASS | strings.js > pupil > statPillScPlot | Plot the points | Plain. |
| PASS | strings.js > pupil > statPillScLine | Draw the line | Plain. |
| PASS | strings.js > pupil > statPillScEst | Estimate at 60 | Template with an example value, matches the approved "Read at 30" pattern. |
| PASS | strings.js > pupil > statPillScCorr | Name the correlation | Plain. |
| PASS | strings.js > pupil > statPillScOutlier | Find the reading that looks wrong | Fixed — was the banned idiom "Find the odd one out"; now matches this same control's own instruction text (statScWhyOutlier, statStageScOutlier), which already said "looks wrong". |
| PASS | strings.js > pupil > statStageOrder | Put the cards in the order the cycle happens. Choose the card that comes first, then the next, until every card is in the row. (3 still to place.) | Clear, step-ordered, matches the approved statStageQlistOrder pattern exactly in structure. |
| PASS | strings.js > pupil > statStageOrderDone | Every card is in the row. If one is out of place, press it to send it back. Then press Mark my order. | Clear, device-neutral ("press", not "tap"), names the actual Check button. |
| PASS | strings.js > pupil > statStagePick | Read the three questions. Choose the one that would work best on a questionnaire. | Clear, action-first. |
| PASS | strings.js > pupil > statStagePickWhy | Now choose the reason the other questions fall short. Then press Mark my choice. | Clear, names the actual Check button. |
| PASS | strings.js > pupil > statStageSlPlace | Build the diagram. Choose a value from the tray, then choose the stem it belongs on; its leaf lands at the end of that row. (3 of 5 placed.) | Clear, concrete, consistent with the tray fiction defined alongside it. |
| PASS | strings.js > pupil > statStageSlKey | Every leaf is on. Now write the key: choose a stem, then a leaf, and the key line writes itself. Then press Mark my diagram. | Clear, has its verb before the colon ("write the key:"), honestly explains the key writes itself. |
| PASS | strings.js > pupil > statStageSlDone | Every leaf is on. If one is on the wrong stem, press it to send it back. Then press Mark my diagram. | Clear, matches the statStageOrderDone pattern. |
| PASS | strings.js > pupil > statStagePieTable | Work out the angle for each row and put it in the Angle column. Choose a box, then use the pad. (3 of 5 filled.) | Clear. |
| PASS | strings.js > pupil > statStagePieTableDone | Every angle is in. Press Next: draw the sectors. | Clear, names the actual next-button text. |
| PASS | strings.js > pupil > statStagePieRim | Draw the sectors in the order of your table, clockwise from the top. Choose a point on the rim for each boundary; use the arrows to move it one degree. (3 of 5 placed.) | Clear, step-ordered, device-neutral ("use the arrows"). |
| PASS | strings.js > pupil > statStagePieBoundsDone | Every boundary is placed. Press ✓ Draw the pie chart. | Clear, matches the "All five markers are on the scale. Press ✓ Draw the box plot." pattern. |
| PASS | strings.js > pupil > statStagePieLabels | Label each sector: choose a label, then choose the sector it belongs to. (3 of 5 labelled.) | "Label each sector:" is a complete imperative clause before the colon — unlike the twig-lengths fragment, this one has its verb. |
| PASS | strings.js > pupil > statStageScPlot | Plot one point for each pair in the table: across for the first value, up for the second. Choose a spot to place a point; choose a placed point to move it with the arrows. (3 of 5 placed.) | "Plot one point for each pair in the table:" has its verb before the colon; clear, device-neutral. |
| PASS | strings.js > pupil > statStageScPlotDone | Every point is placed. Press Next: draw the line. | Clear. |
| PASS | strings.js > pupil > statStageScLine | Draw the line of best fit. Move the two handles so the line runs through the middle of the points, following their slope. Then press ✓ That’s my line. | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > pupil > statStageScEst | The rule stands at 60. Read where it meets your line, then enter the estimate on the pad. | Clear, uses the named "rule" fiction consistently; the value 60 is a given input, not a leaked answer. |
| PASS | strings.js > pupil > statStageScCorr | Choose the word that describes the correlation you see. | Clear, doesn't leak which word is correct. |
| PASS | strings.js > pupil > statStageScOutlier | One reading does not follow the others. Choose the point that looks wrong. | Clear, plain ("looks wrong", no idiom). |
| PASS | strings.js > pupil > statScNextLine | Next: draw the line | Matches the pattern. |
| PASS | strings.js > pupil > statScThatsMyLine | ✓ That’s my line | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > pupil > statScNextEst | Next: read the estimate | Matches the pattern. |
| PASS | strings.js > pupil > statScNextCorr | Next: name the correlation | Matches the approved "Next: X" pattern. |
| PASS | strings.js > pupil > statScNextOutlier | Next: find the reading that looks wrong | Fixed — was the same idiom as statPillScOutlier ("Next: find the odd one out"); now matches this button's own instruction text. |
| PASS | strings.js > pupil > statScPositive | Positive | Plain chip word. |
| PASS | strings.js > pupil > statScNegative | Negative | Plain chip word, paired with Positive and No correlation. |
| PASS | strings.js > pupil > statScNone | No correlation | Plain chip word. |
| PASS | strings.js > pupil > statPieNextRim | Next: draw the sectors | Matches the approved "Next: X" pattern. |
| PASS | strings.js > pupil > statPieDraw | ✓ Draw the pie chart | Matches the approved "✓ Draw/Join the X" pattern. |
| PASS | strings.js > pupil > statPieAngleLabel | Football angle | An example-data readout template, like the approved coordinate and value echoes elsewhere. |
| PASS | strings.js > pupil > statPieDegrees | 156° | Plain numeric readout template. |
| PASS | strings.js > pupil > statPieReadout | Boundary at 156° | Echo template, consistent with other numeric readouts. |
| PASS | strings.js > pupil > statPieNumber | Number | Plain header. |
| PASS | strings.js > pupil > statPieCategory | Category | Plain header. |
| PASS | strings.js > pupil > statPieTotal | Total | Plain header. |
| PASS | strings.js > pupil > statPieNoAngles | no angles yet | Plain empty-state label for a table cell. |
| PASS | strings.js > pupil > statPieAngle | Angle | Plain column header. |
| PASS | strings.js > pupil > statSlStem | Stem | Plain header. |
| PASS | strings.js > pupil > statSlLeaf | Leaf | Plain header. |
| PASS | strings.js > pupil > statSlKeyLine | 4 \| 3 means 4.3 cm | Echo template with its verb ("means"), matches the key-line pattern already used in the stats-collect transcript. |
| PASS | strings.js > pupil > statSlKeyStem | Stem | Plain header. |
| PASS | strings.js > pupil > statSlKeyLeaf | Leaf | Plain header. |
| PASS | strings.js > pupil > statEstimateLabel | Estimate | Plain field label. |
| PASS | strings.js > pupil > statCheckTable | Mark my table and answers | Names the Check button clearly; matches the shelf's "Mark my X" pattern. |
| PASS | strings.js > pupil > statTableWhyCells | Fill in at least one box of the table first. | Clear, device-neutral, matches the "Fill in at least one X first" pattern already approved for the running-total table. |
| PASS | strings.js > pupil > statTableWhyAsks | Answer every question under the table first. | Clear. |
| PASS | strings.js > pupil > statPillTableFill | Fill the table | Plain stage label, matches "Fill the running total". |
| PASS | strings.js > pupil > statPillTableAsks | The answers | Plain, terse, matches the brevity of "The averages" / "The spread". |
| PASS | strings.js > pupil > statStageTableFill | Fill in the f × x column from the top row down. Choose a box, then use the pad. (3 of 5 filled.) | Clear, action-first, step-ordered; "f × x" is maths notation, not a prose fault. |
| PASS | strings.js > pupil > statStageTableTotals | Now the totals row. Add up each column and put its total in the box at the bottom. (3 of 5 filled.) | Clear, action-first, doesn't leak any total. |
| PASS | strings.js > pupil > statStageTableAsks | Now the questions under the table. Choose the Football box, then use the pad. | Clear; "Football" is a template example, matching the convention already used for "Read at 30" and "Estimate at 60". |
| PASS | strings.js > pupil > statStageTableRow | Choose the row of the table that answers: Football. | Clear, same template convention. |
| PASS | strings.js > pupil > statStageTableDone | Everything is in. If a box is wrong, choose it and change it. Then press Mark my table and answers. | Clear, names the actual Check button, matches the "If one is out of place, press it to send it back" pattern. |
| PASS | strings.js > pupil > statTableTotal | Total | Plain column label. |
| PASS | strings.js > pupil > statScrollTable | Scroll or swipe the table sideways to see all of it. | Names both gestures, device-neutral, matches statScrollGraph exactly. |
| PASS | strings.js > pupil > statTableNoTotal | No total is asked for this column. | Clear status line. |
| PASS | strings.js > pupil > statTableCellLabel | f × x, row 3 | A labelled data readout template, like "Cumulative frequency up to 65 minutes"; notation is content. |
| PASS | strings.js > pupil > statTableTotalLabel | Total f × x | Plain column-total label. |
| PASS | strings.js > pupil > statValuesSetLabel | Football, value 3 | A template example-data readout, matching "Football angle". |
| PASS | strings.js > pupil > statValuesSetTruth | One set that fits: 4, 7, 7, 9, 12, 15, 21 | A post-lock truth line, plain as a labelled readout — same reasoning already approved for statQlistTruth and statCftableTruth. |
| PASS | strings.js > pupil > movieWorkedExample | Worked example | Plain label. |
| PASS | strings.js > pupil > moviePrevStep | Previous step | Plain. |
| PASS | strings.js > pupil > movieNextStep | Next step | Plain. |
| PASS | strings.js > pupil > moviePlayLabel | Play | Plain. |
| PASS | strings.js > pupil > moviePlayBtn | ▶ Play | Plain. |
| PASS | strings.js > pupil > moviePauseBtn | ❚❚ Pause | Plain. |
| PASS | strings.js > pupil > movieReplayBtn | ↺ Replay | Plain. |
| PASS | strings.js > pupil > classifyYourAnswer | You answered “62” — your teacher can see this and will pick it up in class. | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > pupil > protractorCheckBtn | Mark my measurement | Clear. |
| PASS | strings.js > pupil > protractorInstructions | Put the small crosshair at the centre of the protractor on the corner. Turn the protractor with a rotate knob at either end, until 0 sits along one arm, then read where the other arm crosses. | Thorough, step-ordered, concrete — good beginner instruction. |
| PASS | strings.js > pupil > protractorReadTrueWrongScale | You read the other scale — use the one that starts at 0 on the arm you lined up. The true size is 65°. | A second-attempt reveal, correctly timed. |
| PASS | strings.js > pupil > protractorReadTrueGeneric | Not quite — line the centre on the corner and 0 along an arm, then read again. The true size is 65°. | Short clear opener; reveal correctly timed to a second attempt. |
| PASS | strings.js > pupil > protractorScaleRetry | Close — but check you are reading the scale that starts at 0 on your lined-up arm. One more go. | Clear, doesn't reveal on a first attempt. |
| PASS | strings.js > pupil > protractorLineUpRetry | Line it up carefully and read again — one more attempt. | Clear. |
| PASS | strings.js > pupil > protractorTypeFirst | Type the size you measured first. | Clear. |
| PASS | strings.js > pupil > protractorMaxRange | A protractor measures up to 180° — read the size again. | Clear, factual. |
| PASS | strings.js > pupil > protractorMeasureLabel | Your measurement in degrees | Plain. |
| PASS | strings.js > pupil > protractorMeasurePlaceholder | the size you measure, in degrees | A placeholder inside a box — fragments are the normal convention there. |
| PASS | strings.js > pupil > measuredReadout |  · you measured 65° | Echo template. |
| PASS | strings.js > pupil > checkLockedWhy | This one is finished. | Approved exemplar. |
| PASS | strings.js > pupil > checkNeedsLineWhy | Write a line of working first. | Clear. |
| PASS | strings.js > pupil > checkNeedsAngleWhy | Work out the angle you were asked for first. | Clear. |
| PASS | strings.js > pupil > addedToJotter | ✓ Added to your jotter. | Concrete named object. |
| PASS | strings.js > pupil > algebraNextLine | Write your next line of working: | Action-first, clear. |
| PASS | strings.js > pupil > removeLastLineBtn | ↶ remove last line | Plain button. |
| PASS | strings.js > pupil > removedLastLine | Removed your last line. | Clear status. |
| PASS | strings.js > pupil > lineTooLong | That line is too long for the page — split it into two steps. | Tells her what to do about it. |
| PASS | strings.js > pupil > lineUnreadable | That line does not read as maths yet — check it and try again. (angles on a straight line add to 180) | Reminds her of a general rule, not a specific answer; clear enough with the example. |
| REWRITE | strings.js > pupil > pageFull | That is a full page — press Mark my working. | Bare "That" where the concrete noun is right there. → "The page is full — press Mark my working." |
| PASS | strings.js > pupil > secondAttemptNote | Second attempt — your first try stays on the page. | Clear, matches the design elsewhere. |
| PASS | strings.js > pupil > algebraLinePlaceholder | your next line, then “add line” | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > pupil > addLineBtn | add line | Plain button. |
| PASS | strings.js > pupil > moveAnnotationEquation | What are you doing to both sides? — tag the move (optional) | Correctly scoped to an equation question — "both sides" applies here, unlike the banned substitution-question case. |
| PASS | strings.js > pupil > moveAnnotationGeneric | What’s your next step? — tag the move (optional) | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > pupil > chipCollectTerms | Collect terms | Plain chip. |
| PASS | strings.js > pupil > chipJustRewrite | Just rewrite | Plain chip. |
| PASS | strings.js > pupil > moveOperandLabel | How much? | Plain. |
| PASS | strings.js > pupil > moveOperandPlaceholder | how much? e.g. 15 or 3x | Placeholder, fine convention. |
| PASS | strings.js > pupil > moveOperandNext | next → | Plain button. |
| PASS | strings.js > pupil > substIntro | Choose each letter below to put its number in. | Clear. |
| PASS | strings.js > pupil > substGivenLabel | given: | Plain label. |
| PASS | strings.js > pupil > substAnswerPrompt | Now work it out, then enter the value: | Action-first, clear. |
| PASS | strings.js > pupil > expandIntro | Multiply every term — choose the right product for each box. | Names the general method, not a specific value — fine. |
| PASS | strings.js > pupil > solveChooseMove | Choose a move — you will see the next line, already checked for balance. | Clear, reassuring. |
| PASS | strings.js > pupil > solveNeedNumber | Enter a number for that move first. | Clear. |
| PASS | strings.js > pupil > angleOneOpenHint | One angle is dashed on the diagram — choose it, give its size, and choose the reason. | Clear, step-ordered, concrete. |
| PASS | strings.js > pupil > angleMultiOpenHint | Choose a dashed angle on the diagram, give its size and reason, then work your way to angle a. | Clear. |
| PASS | strings.js > pupil > removeLastStepBtn | ↶ remove last step | Plain button. |
| PASS | strings.js > pupil > removedLastStep | Removed your last step. | Clear. |
| PASS | strings.js > pupil > angleStepHeading | Work out ∠x | Standard notation. |
| PASS | strings.js > pupil > angleSizeLabel | Size of angle x | Plain. |
| PASS | strings.js > pupil > angleSizePlaceholder | the size in degrees | Placeholder, fine. |
| REWRITE | strings.js > pupil > angleUnreadable | That does not read as a number yet. Put in the size in degrees, or a sum that works it out. | Same bare "That" as pageFull. → "What you typed does not read as a number yet. Put in the size in degrees, or a sum that works it out." |
| PASS | strings.js > pupil > nudgeBannerStar | ★ Your teacher suggested watching this method. | Consistent with the approved banner text. |
| PASS | strings.js > pupil > selfEvalSavedFlash | ✓ Saved — your teacher sees this on her class list. | Honest, clear. |
| PASS | strings.js > pupil > selfEvalSavedIdle | Saved as you go — your teacher sees this on her class list. | Honest, clear. |
| REWRITE | strings.js > pupil > angleUnreadableLine | That does not read as a number yet. Put in the size in degrees, or a sum that works it out. | Same fix as angleUnreadable. → "What you typed does not read as a number yet. Put in the size in degrees, or a sum that works it out." |
| PASS | strings.js > teacher > artefactUndrawable | The pupil’s work is saved, but this screen could not re-draw the board. | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > teacher > passcodeChecking | Checking the passcode… | Plain, honest status line — nothing wrong with it. |
| PASS | strings.js > teacher > tickSaving | Saving changes… | Plain, honest status line. |
| PASS | strings.js > teacher > overrideRight | Marked right — full marks. Your mark is the one pupils and staff now see. | Clear consequence stated plainly. |
| PASS | strings.js > teacher > overrideWrong | Marked wrong. Your mark is the one pupils and staff now see. | Clear. |
| PASS | strings.js > teacher > tickOn | Angles is now on 10A-Maths’s shelf. | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > teacher > tickOff | Angles removed from 10A-Maths’s shelf. | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > teacher > openMarkbook | Open the markbook | Plain button. |
| PASS | strings.js > teacher > noServer | We could not reach the server. Try again. | Clear, actionable. |
| PASS | strings.js > teacher > wallStale | This class page could not be refreshed. What you see is the last it loaded. | Honest about staleness. |
| PASS | strings.js > teacher > serverNotInitialised | This markbook has not been set up yet. Open Set-up and add a class first. | Clear, actionable. |
| PASS | strings.js > teacher > serverNotSignedIn | Google did not say who you are. Reload the page and sign in again. | Clear, actionable. |
| PASS | strings.js > teacher > serverBadName | That name could not be saved. Letters and spaces only. | Clear for a professional reader; the referent is what she just typed. |
| PASS | strings.js > teacher > serverUnknownClass | There is no class with that code. Check the link, or the code on the board. | Clear. |
| REWRITE | strings.js > teacher > serverNotSet | That book is not switched on for this class. Tick it on in Set-up. | "Tick it on in" stacks two prepositions awkwardly. → "That book is not switched on for this class. Go to Set-up and tick it on." |
| PASS | strings.js > teacher > serverNotYourClass | That class was made by another teacher, so it is not yours to change. | Clear, honest. |
| PASS | strings.js > teacher > serverExists | There is already a class with that name. | Clear. |
| PASS | strings.js > teacher > serverNotFound | That could not be found. Reload the page and try again. | Clear. |
| PASS | strings.js > teacher > serverUnreachableStore | The app cannot reach its store, so nothing was saved and nothing was lost. Tell the ICT office. | Plain, honest, actionable for any teacher — names the ICT office, not a developer. |
| PASS | strings.js > teacher > serverStoreSlow | The store did not answer in time, so that did not go through. Nothing was lost. Try again in a moment. If it keeps happening, tell the ICT office. | Plain, actionable — no internal names. |
| PASS | strings.js > teacher > serverTooBig | There is more working in this book than one save can carry. Tell the ICT office before the class writes any more. | Plain, actionable — no internal names. |
| PASS | strings.js > teacher > serverUnknownAction | The app asked for something this server does not know about. Reload the page. | Acceptable for a rare fallback; honest, actionable. |
| PASS | strings.js > teacher > signedInAs | Signed in as aoife.gartland@c2ken.net | Plain, clear pattern; the demo email shown is a data question, not a wording fault. |
| PASS | strings.js > teacher > loadingClass | Loading 10A-Maths… | Clear. |
| PASS | strings.js > teacher > readingBooks | Reading 5 of 8 books… | Clear. |
| PASS | strings.js > teacher > relockedLeft | The markbook closed when you left it. Enter the passcode to open it again. | Clear, explains why. |
| PASS | strings.js > teacher > relockedIdle | The markbook closed itself after fifteen minutes. Enter the passcode to open it again. | Clear, explains why. |
| PASS | strings.js > teacher > inkChange | Tap or click a mark to change it. | Correctly names both gestures. |
| PASS | strings.js > teacher > inkMine | Mark it right | Plain. |
| PASS | strings.js > teacher > inkMineWrong | Mark it wrong | Plain. |
| PASS | strings.js > teacher > inkUseApp | Use the app’s mark | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > teacher > needsYouLabel | Needs you now | Clear. |
| PASS | strings.js > teacher > needsYouWrongTwice | Wrong twice on Angles, Ex 2, Q4 | Names book, exercise and question plainly — not a code to decode. |
| PASS | strings.js > teacher > needsYouPulledHelp | Used the method help on Angles, Ex 2, Q4 and is still wrong | Clear. |
| PASS | strings.js > teacher > needsYouStuck | Nothing saved for 20 minutes on Angles, Ex 2, Q4 | Clear. |
| PASS | strings.js > teacher > csvCopied | Copied. Paste it into a spreadsheet. | Clear. |
| PASS | strings.js > teacher > csvFallback | Your browser would not let the page copy for you. Select the text below and copy it yourself. | Clear fallback. |
| PASS | strings.js > teacher > setUpHint | Tick the books this class should see. | Clear. |
| PASS | strings.js > teacher > setUpClosedHint | A book that is not ticked is closed for that class: it is not on the pupils’ shelf at all. | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > teacher > overConfident | Over-confident — confidence high, working weaker | Self-glossed, clear to a colleague. |
| PASS | strings.js > teacher > quietlyExcelling | Quietly excelling — doing well, low confidence | Self-glossed. |
| PASS | strings.js > teacher > cellWrongAtStep | Wrong at step 2 | Uses "step", the approved word, not a code. |
| PASS | strings.js > teacher > cellWrongFirstSlip | Wrong — first slip at step 2 | Clear. |
| PASS | strings.js > teacher > markedAria | Marked right | Plain. |
| PASS | strings.js > teacher > reteachTitle | Sends this exercise’s worked example (Angles) to this pupil | Same wording as before, now with a correct curly apostrophe or quotation mark in place of the straight one — a typographic fix, not a content change. |
| PASS | strings.js > teacher > closeMarkbook | Close the markbook | Plain. |
| PASS | strings.js > teacher > whereYouAre | Where you are | Plain. |
| PASS | strings.js > teacher > whichBook | Which book | Plain. |
| PASS | strings.js > teacher > needsYouAria | Pupils who need you now | Clear. |
| PASS | strings.js > teacher > nobodyStuck | Nobody is stuck in Angles right now. | Clear, reassuring. |
| PASS | strings.js > teacher > copyByHand | Copy this by hand: ols.link/10a | Clear fallback. |
| PASS | strings.js > teacher > couldNotSave | We could not save that. | Clear. |
| PASS | strings.js > teacher > deleteClassAria | Delete 10A-Maths | Plain. |
| PASS | strings.js > teacher > loadingGrid | Loading the full grid… | Clear, names the grid. |
| PASS | strings.js > teacher > gridOrient | Each cell is one pupil and one question. Look for the reds, then open a cell to read that pupil's book. | Clear, well-explained onboarding. |
| PASS | strings.js > teacher > cellNotStarted | Not started | Plain. |
| PASS | strings.js > teacher > cellRight | Right — working and answer both sound | Self-glossed. |
| PASS | strings.js > teacher > cellAmber | Answer only, no working shown | Matches the checklist's own approved fix for this exact state. |
| PASS | strings.js > teacher > fetchingBook | Fetching this pupil's book… | Clear. |
| PASS | strings.js > teacher > pencilPosture | These marks are the app's. Tap or click any mark to change it to yours — yours is the one that counts. | Correctly names both gestures, explains ownership plainly. |
| REWRITE | strings.js > teacher > reteachBtn | Show them this method again → | "Them" is vaguer than this same feature's own tooltip, which says "this pupil". → "Show this pupil this method again →" |
| PASS | strings.js > teacher > reteachSent | Sent ✓ — this pupil sees it next time | Consistent, clear. |
| PASS | strings.js > teacher > reteachFailed | We could not send that. | Clear. |
| PASS | strings.js > teacher > saveFailedMark | We could not save that — choose the mark again to try once more. | Clear, actionable. |
| PASS | strings.js > teacher > readingEveryBook | Reading every book… | Clear. |
| PASS | strings.js > teacher > starterBtn | Next-lesson starter ▶ | Clear. |
| PASS | strings.js > teacher > csvCopiedFull | CSV copied — paste it straight into a spreadsheet. | Clear for this reader. |
| REWRITE | strings.js > teacher > seriesKs3 | KS3 · M2 | "M2" is an unglossed code — nothing nearby says what it stands for. → "KS3" (drop the code, or spell out what M2 means if it matters to her) |
| REWRITE | strings.js > teacher > seriesGcse | GCSE · M3 & M4 | Same unglossed code. → "GCSE" (drop the code, or spell out what M3 & M4 mean) |
| PASS | stats-averages > s1 > movie > step2 > say | Nine numbers, exactly as printed. | A terse film caption setting up a worked example — matches the accepted caption style for this medium. |
| PASS | stats-averages > s1 > q5 > prompt | The mean of 3, 5, 6 and ?  /  The mean of 7, 8, 4 and ? | This internal field drops the "is 6" / "is 8" that the pupil actually sees in her full stem, which gives each clause its verb — read in the place she actually meets it, it is clean. |
| PASS | stats-averages > s2 > movie > step3 > say | A fifth girl joins them, aged 5. | Has its verb ("joins"); clear film caption. |
| PASS | stats-averages > s2 > q9 > prompt | A fourth player, who scored 6 goals, joins them. | Has its own verb ("joins"); reads clean lifted out of its stem. |
| PASS | stats-averages > s2 > q13 > prompt | A girl runs 8 laps of a track in an average time of 48.2 seconds per lap.  /  Calculate her average time per lap for the last 2 laps. | Both halves have their verb ("runs", "Calculate"); anchored, clear. |
| PASS | stats-averages > s3 > q18 > prompt | The table shows the number of days absent in a term.  /  Calculate the mean number of days absent. | Matches its full stem exactly; both sentences have their verb. |
| PASS | stats-averages > s4 > movie > step1 > say | During 3 hours at Heathrow, 55 aircraft arrived late. | Has its verb ("arrived"); anchored, concrete film scenario. |
| PASS | stats-averages > s4 > movie > step2 > say | Each class stands in for its midpoint — halfway between its two ends. | Has its verb ("stands"); exactly what a film caption is for — defining "midpoint" in plain words before the exercise leans on it. |
| PASS | stats-averages > s4 > movie > step9 > say | A grouped table gives an estimate, never an exact value — the individual arrival times are gone once they are grouped. | Has its verb ("gives"); explains plainly why an estimate, not an exact value, is expected. |
| PASS | stats-averages > s5 > walt | Decide which average to use, predict what changes it, and judge a claim from a grouped table as true, false or not enough information | Matches Ex 5's WALT exactly; clear, names all three skills. |
| PASS | stats-averages > s5 > movie > step8 > say | Claim: "3 loaves of bread cost 87p."  /  A grouped table cannot say what one loaf cost — not enough information. | Names the claim directly by quoting it, then explains the reasoning in full sentences with their own verbs — a clean worked example. |
| PASS | stats-averages > s5 > q26 > prompt | A grouped frequency table shows the performance of 22 students in a test.  /  Decide the effect of amending the table. | Both halves have their verb; matches its stem. |
| PASS | stats-averages > s5 > q27 > prompt | A table shows the salaries of 120 workers, grouped into unequal class widths (the top class stretches from £50,000 to £200,000). | Has its verb ("shows"); anchored; matches its stem's opening sentence. |
| PASS | stats-averages > s5 > q28 > prompt | After a week she measured the heights of thirty seedlings, in millimetres, and recorded her results in the table below. | Has its verb ("measured", "recorded"); "she" points back at "Alma", named in the sentence immediately before this one in the full stem. |
| PASS | stats-collect > s1 > movie > step7 > say | Another leading question, this time about sport on television. | A film caption reinforcing the term "leading question" through a second worked example — exactly what a film is for; terse captioning is the accepted convention for this medium. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-collect > s2 > q15 > prompt | 89 like maths, 44 like science, 21 like both and 37 like neither. | Part of a stem that has its verb ("are asked"); reads clean as the normal convention for stating survey counts. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-collect > s4 > movie > step1 > say | The weights of 13 boys, in kg, as recorded. | A terse film caption naming the data a worked example is about to use — the accepted caption style for this medium, distinct from pupil question prose. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-collect > s4 > q22 > prompt | The stem-and-leaf diagram shows the weights, in kg, of some babies. | Has its verb ("shows"); reads clean. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > movie > step3 > say | Position of the median = (n + 1) ÷ 2.  /  Ring the 4th value. | A worked example teaching the method — exactly what a film is for. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > movie > step4 > say | Position of the lower quartile = (n + 1) ÷ 4 = 8 ÷ 4 = 2.  /  Ring the 2nd value. | Same, fine. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > movie > step5 > say | Position of the upper quartile = (n + 1) ÷ 4 × 3 = 2 × 3 = 6.  /  Ring the 6th value. | Same, fine. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > q6 > prompt | The ages of 11 trees, from youngest to oldest, are shown below. | Has its verb; reads clean. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > q7 > prompt | The scores, from lowest to highest, are shown below. | Clean in context. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > q8 > prompt | Say what happens to each average and to the range when it is added. | One clear instruction. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s2 > q10 > prompt | The marks in an examination, out of 80, are grouped below for 112 candidates. | Has its verb; clean. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s3 > q13 > prompt | The marks in an examination, out of 80, are shown in the table below for 112 candidates. | Clean. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s3 > q14 > prompt | In a survey, 184 people stated their weekly wage. | Has its own verb and reads clean on its own. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s4 > q15 > prompt | The cumulative frequency graph shows the marks of 112 candidates in an examination.  /  What percentage of candidates passed? | Clean, doesn't leak. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s5 > q19 > prompt | The table shows some information about the heights, in cm, of some plants. | Concrete, clear. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s5 > q20 > prompt | The table shows some information about the weights, in grams, of some potatoes: range 101 g, lower quartile 110 g, median 132 g, upper quartile 162 g, maximum 185 g. | Clear, one answer follows. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s5 > q21 > prompt | The times, in seconds, of 15 students running a race are shown below: 52, 54, 54, 55, 58, 58, 59, 60, 60, 61, 61, 64, 67, 70, 75. | Clean. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s5 > q24 > prompt | The box plots show the age distributions of two cities, A and B. Decide which city has the greater interquartile range, and which city’s people are generally older. | Clean, clear ask. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s5 > q27 > prompt | The table shows information about the times, in minutes, that some boys took to complete a puzzle: interquartile range 8, minimum 12, median 18, upper quartile 23, maximum 29. | Clear, one answer follows. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s6 > q29 > prompt | Decide whether his survey gives a fair picture of the town, and why. | Clean instruction. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s6 > q30 > prompt | Decide whether this survey gives a fair picture of everyone, and why. | Clean instruction. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s6 > q31 > prompt | Decide whether each survey gives a fair picture of the town, and why. | Clean instruction. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s6 > q32 > prompt | Decide whether each survey gives a fair picture, and why. | Clean instruction. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | strings.js > pupil > classifyTryAgain | Not that one — look again at its size against 90° and 180°. | Short opener, gives a real comparison without the answer. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |

## Read-first candidates

| verdict | path | the sentence | why |
|---|---|---|---|
| PASS | stats-averages > s1 > movie > step2 > say | Nine numbers, exactly as printed. | A terse film caption setting up a worked example — matches the accepted caption style for this medium. |
| PASS | stats-averages > s1 > q5 > prompt | The mean of 3, 5, 6 and ?  /  The mean of 7, 8, 4 and ? | This internal field drops the "is 6" / "is 8" that the pupil actually sees in her full stem, which gives each clause its verb — read in the place she actually meets it, it is clean. |
| PASS | stats-averages > s2 > movie > step3 > say | A fifth girl joins them, aged 5. | Has its verb ("joins"); clear film caption. |
| PASS | stats-averages > s2 > q9 > prompt | A fourth player, who scored 6 goals, joins them. | Has its own verb ("joins"); reads clean lifted out of its stem. |
| PASS | stats-averages > s2 > q13 > prompt | A girl runs 8 laps of a track in an average time of 48.2 seconds per lap.  /  Calculate her average time per lap for the last 2 laps. | Both halves have their verb ("runs", "Calculate"); anchored, clear. |
| PASS | stats-averages > s3 > q18 > prompt | The table shows the number of days absent in a term.  /  Calculate the mean number of days absent. | Matches its full stem exactly; both sentences have their verb. |
| PASS | stats-averages > s4 > movie > step1 > say | During 3 hours at Heathrow, 55 aircraft arrived late. | Has its verb ("arrived"); anchored, concrete film scenario. |
| PASS | stats-averages > s4 > movie > step2 > say | Each class stands in for its midpoint — halfway between its two ends. | Has its verb ("stands"); exactly what a film caption is for — defining "midpoint" in plain words before the exercise leans on it. |
| PASS | stats-averages > s4 > movie > step9 > say | A grouped table gives an estimate, never an exact value — the individual arrival times are gone once they are grouped. | Has its verb ("gives"); explains plainly why an estimate, not an exact value, is expected. |
| PASS | stats-averages > s5 > walt | Decide which average to use, predict what changes it, and judge a claim from a grouped table as true, false or not enough information | Matches Ex 5's WALT exactly; clear, names all three skills. |
| PASS | stats-averages > s5 > movie > step8 > say | Claim: "3 loaves of bread cost 87p."  /  A grouped table cannot say what one loaf cost — not enough information. | Names the claim directly by quoting it, then explains the reasoning in full sentences with their own verbs — a clean worked example. |
| PASS | stats-averages > s5 > q26 > prompt | A grouped frequency table shows the performance of 22 students in a test.  /  Decide the effect of amending the table. | Both halves have their verb; matches its stem. |
| PASS | stats-averages > s5 > q27 > prompt | A table shows the salaries of 120 workers, grouped into unequal class widths (the top class stretches from £50,000 to £200,000). | Has its verb ("shows"); anchored; matches its stem's opening sentence. |
| PASS | stats-averages > s5 > q28 > prompt | After a week she measured the heights of thirty seedlings, in millimetres, and recorded her results in the table below. | Has its verb ("measured", "recorded"); "she" points back at "Alma", named in the sentence immediately before this one in the full stem. |
| PASS | stats-collect > s1 > movie > step7 > say | Another leading question, this time about sport on television. | A film caption reinforcing the term "leading question" through a second worked example — exactly what a film is for; terse captioning is the accepted convention for this medium. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-collect > s2 > q15 > prompt | 89 like maths, 44 like science, 21 like both and 37 like neither. | Part of a stem that has its verb ("are asked"); reads clean as the normal convention for stating survey counts. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-collect > s4 > movie > step1 > say | The weights of 13 boys, in kg, as recorded. | A terse film caption naming the data a worked example is about to use — the accepted caption style for this medium, distinct from pupil question prose. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-collect > s4 > q22 > prompt | The stem-and-leaf diagram shows the weights, in kg, of some babies. | Has its verb ("shows"); reads clean. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > movie > step3 > say | Position of the median = (n + 1) ÷ 2.  /  Ring the 4th value. | A worked example teaching the method — exactly what a film is for. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > movie > step4 > say | Position of the lower quartile = (n + 1) ÷ 4 = 8 ÷ 4 = 2.  /  Ring the 2nd value. | Same, fine. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > movie > step5 > say | Position of the upper quartile = (n + 1) ÷ 4 × 3 = 2 × 3 = 6.  /  Ring the 6th value. | Same, fine. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > q6 > prompt | The ages of 11 trees, from youngest to oldest, are shown below. | Has its verb; reads clean. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > q7 > prompt | The scores, from lowest to highest, are shown below. | Clean in context. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s1 > q8 > prompt | Say what happens to each average and to the range when it is added. | One clear instruction. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s2 > q10 > prompt | The marks in an examination, out of 80, are grouped below for 112 candidates. | Has its verb; clean. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s3 > q13 > prompt | The marks in an examination, out of 80, are shown in the table below for 112 candidates. | Clean. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s3 > q14 > prompt | In a survey, 184 people stated their weekly wage. | Has its own verb and reads clean on its own. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s4 > q15 > prompt | The cumulative frequency graph shows the marks of 112 candidates in an examination.  /  What percentage of candidates passed? | Clean, doesn't leak. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s5 > q19 > prompt | The table shows some information about the heights, in cm, of some plants. | Concrete, clear. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s5 > q20 > prompt | The table shows some information about the weights, in grams, of some potatoes: range 101 g, lower quartile 110 g, median 132 g, upper quartile 162 g, maximum 185 g. | Clear, one answer follows. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s5 > q21 > prompt | The times, in seconds, of 15 students running a race are shown below: 52, 54, 54, 55, 58, 58, 59, 60, 60, 61, 61, 64, 67, 70, 75. | Clean. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s5 > q24 > prompt | The box plots show the age distributions of two cities, A and B. Decide which city has the greater interquartile range, and which city’s people are generally older. | Clean, clear ask. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s5 > q27 > prompt | The table shows information about the times, in minutes, that some boys took to complete a puzzle: interquartile range 8, minimum 12, median 18, upper quartile 23, maximum 29. | Clear, one answer follows. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s6 > q29 > prompt | Decide whether his survey gives a fair picture of the town, and why. | Clean instruction. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s6 > q30 > prompt | Decide whether this survey gives a fair picture of everyone, and why. | Clean instruction. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s6 > q31 > prompt | Decide whether each survey gives a fair picture of the town, and why. | Clean instruction. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | stats-quartiles > s6 > q32 > prompt | Decide whether each survey gives a fair picture, and why. | Clean instruction. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
| PASS | strings.js > pupil > classifyTryAgain | Not that one — look again at its size against 90° and 180°. | Short opener, gives a real comparison without the answer. The bracketed note is the build tool's own flag, not text a reader ever sees; judging the sentence itself, it still reads clean. |
