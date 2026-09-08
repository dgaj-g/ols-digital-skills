TRANSCRIPT HASH: 78410a4047f2e16c

I judged every one of the 271 lines in `_v4.md`, in the order the transcript gives them, against `COLD_READ_CHECKLIST.md` sections 0, 1, 2, 3, 3b, 4, 6 and 7 only (section 5, the per-item design rubric, was out of scope for this read). Lines under `strings.js > pupil` and under `stats-quartiles` were read from the eleven/twelve-year-old's seat (sections 1–2). Lines under `strings.js > teacher` were read from the busy, never-seen-this-markbook-before teacher's seat (section 6). Every "[carried from the approved build, flagged for a read]" line got its own row and a genuine fresh read, not a wave-through. 235 lines pass clean. 24 fail outright. 12 need a rewrite. The three worst: a placeholder token ("Aoife") rendering as the value name on ten different pupil screens instead of the actual maths term; two teacher-facing error strings that tell a real teacher to "Tell Damien" about "the front door" and "the data deployment" — raw internal/developer language shipped straight to production; and four worked-example film lines that are bare verbless fragments joined by commas, the exact shape banned in section 4 and shown failing in section 3's own exhibits.

| verdict | where it is | the sentence | why |
|---|---|---|---|
| PASS | strings.js > pupil > coverBusy | Opening your books… | Plain, three words, nothing to picture wrong. |
| PASS | strings.js > pupil > coverGetting | Getting your details… | Plain loading text. |
| PASS | strings.js > pupil > coverWelcome | Welcome | Fine. |
| PASS | strings.js > pupil > coverOpen | Open your books | Concrete action, matches the shelf metaphor. |
| PASS | strings.js > pupil > coverSwitch | Not you? Switch account | Clear, actionable. |
| PASS | strings.js > pupil > coverFirstTime | First time here? Google will ask your permission once, then you are straight in. | Reads clean aloud; "straight in" is ordinary spoken English a 12-year-old uses. |
| PASS | strings.js > pupil > coverNoServer | We could not reach the server. Check your connection and reload the page. | Doesn't blame "the wifi"; two plain actionable verbs. |
| PASS | strings.js > pupil > coverWrongClass | That class link is not active. Ask your teacher for the link again. | Clear, tells her exactly who to ask. |
| PASS | strings.js > pupil > coverNameLabel | Your name | Fine. |
| PASS | strings.js > pupil > coverNamePrompt | We could not read your name from your account. Write it once and it is saved. | Clear, action-first. |
| PASS | strings.js > pupil > coverNameMissing | Write your name first, so your teacher sees it on her class list. | Action first, reason after, as the shape rule wants. |
| REWRITE | strings.js > pupil > coverPreview | This is the preview copy of MathShelf. Nothing here is saved to school. | "Saved to school" is not how anyone says this — she'd have to guess what it means. Replace with: "This is a preview copy of MathShelf. Nothing you do here is saved for your school." |
| PASS | strings.js > pupil > shelfGreetingMorning | Good morning | Fine. |
| PASS | strings.js > pupil > shelfGreetingAfternoon | Good afternoon | Fine. |
| PASS | strings.js > pupil > shelfPlain | Your maths books live here. Your teacher chooses which ones are out. | Named as a must-pass exemplar in the checklist itself (3b). |
| PASS | strings.js > pupil > shelfNotSet | Not set yet | Short, clear label. |
| REWRITE | strings.js > pupil > shelfNotSetNote | A book that is not set yet is one your teacher has not put out for this class. | Circular construction ("not set yet is one... has not put out") — she'd have to read it twice to untangle who did what. Replace with: "Your teacher has not put this book out for your class yet." |
| PASS | strings.js > pupil > shelfMore | Your teacher will add more books to this shelf during the year. | Clear, sets expectation. |
| PASS | strings.js > pupil > shelfMarks | 6 of 8 marks · 5 of 8 answered | Real numbers, matches the approved "N of N" stat pattern. |
| PASS | strings.js > pupil > backToShelf | The shelf | Named concept from section 1. |
| PASS | strings.js > pupil > opening | Opening Angles… | Book name, plain. |
| PASS | strings.js > pupil > nudgeBanner | Your teacher suggested watching this method. | Verbatim must-pass exemplar (3b). |
| PASS | strings.js > pupil > selfEvalSaved | Saved. Your teacher sees this on her class list. | Elliptical opener matches approved house style; rest is plain. |
| PASS | strings.js > pupil > selfEvalHeading | Exercise finished — how did that go? | Friendly, direct, no jargon. |
| PASS | strings.js > pupil > selfEvalOptional | optional | Fine. |
| PASS | strings.js > pupil > saveWaiting | Still saving your work… | Clear. |
| PASS | strings.js > pupil > saveRetry | Try again | Clear. |
| PASS | strings.js > pupil > saveHeldLocal | Your work is safe on this device and will be sent as soon as the page can reach the server. | Reassuring, concrete, consistent with the app's other "reach the server" wording. |
| PASS | strings.js > pupil > statCheckCftable | Mark my table | Matches the named Check-button family (section 1). |
| PASS | strings.js > pupil > statCheckCfplot | Mark my points and curve | Names things she can see (points, curve). |
| PASS | strings.js > pupil > statCheckCfread | Mark my readings | Plain, consistent. |
| PASS | strings.js > pupil > statCheckBoxplot | Mark my box plot | Plain, consistent. |
| PASS | strings.js > pupil > statCheckCompare | Mark my comparison | Verbatim named in section 1. |
| PASS | strings.js > pupil > statCheckJudge | Mark my answers | Verbatim named in section 1. |
| PASS | strings.js > pupil > statCheckValues | Mark my answers | Same, consistent. |
| PASS | strings.js > pupil > statAlreadyMarked | This question is already marked. | Clear. |
| PASS | strings.js > pupil > statTryAgain | Not quite. Your first go stays above — one more attempt. | Elliptical style matches the approved "Bang on — careful measuring" pattern. |
| PASS | strings.js > pupil > statPutBack | Press it again to put it back. | Device-neutral verb, clear. |
| PASS | strings.js > pupil > statRemoveLast | Remove the last one | Clear. |
| PASS | strings.js > pupil > statNextRow | next ↓ | Short nav label, fine. |
| PASS | strings.js > pupil > statThatsMine | That's my answer | Plain, and shows what the correct generic pattern looks like (see the Aoife rows below). |
| PASS | strings.js > pupil > statRuleFiction | The rule is the line that crosses the graph. Move it up the frequency axis to the height you need, then read where it meets the curve. | Defines the fiction in plain words at first meeting, then gives the instruction using an approved verb ("move") and the checklist's own approved noun ("frequency axis"). |
| PASS | strings.js > pupil > statTrayFiction | Five markers — put each one on the scale where it belongs. | Verbatim must-pass exemplar (3b). |
| PASS | strings.js > pupil > statMedian | median | Defined glossary term, plain label. |
| PASS | strings.js > pupil > statLowerQuartile | lower quartile | Defined glossary term, plain label. |
| PASS | strings.js > pupil > statUpperQuartile | upper quartile | Defined glossary term, plain label. |
| PASS | strings.js > pupil > statIqr | interquartile range | Defined glossary term, plain label. |
| PASS | strings.js > pupil > statRange | range | Plain everyday word. |
| PASS | strings.js > pupil > statLowest | Lowest | Plain label. |
| PASS | strings.js > pupil > statHighest | Highest | Plain label. |
| PASS | strings.js > pupil > statClassColumn | Group | Plain table-column label. |
| PASS | strings.js > pupil > statFrequency | Frequency | Defined term, plain label. |
| PASS | strings.js > pupil > statCumulativeFrequency | Cumulative frequency | Defined term, plain label. |
| PASS | strings.js > pupil > statReading | reading | Plain word. |
| PASS | strings.js > pupil > statQlistOrder | Choose the values in order, smallest first. | Uses the approved device-neutral verb "choose" — exactly what the checklist's own fix for the banned "Tap the values in order" exhibit asks for. |
| PASS | strings.js > pupil > statQlistOrderWhy | Put every value in the row first. | Clear tooltip. |
| PASS | strings.js > pupil > statQlistPickWhy | Choose each value you were asked for first. | Clear tooltip. |
| FAIL | strings.js > pupil > statThatsMyOne | That's my Aoife | This is not English — "Aoife" reads as a person's name where a maths term belongs, and she'd stop dead and ask "who's Aoife?" This is an unsubstituted placeholder token (compare the correct sibling string above, "That's my answer"); it should show the actual value name. Replace with: "That's my median" (or whichever of median / lower quartile / upper quartile / interquartile range / range the question is actually asking for). |
| FAIL | strings.js > pupil > statQlistPick | Now choose the Aoife. | Same placeholder bug — "the Aoife" is not a thing on her screen. Replace with: "Now choose the median." (substituting the real term for the value being picked). |
| FAIL | strings.js > pupil > statQlistCommit | That's my Aoife | Same bug, second occurrence. Replace with: "That's my median." (or the correct term for this question). |
| PASS | strings.js > pupil > statQlistCommitWhy | Choose a value in the row first. | Clear tooltip. |
| PASS | strings.js > pupil > statQlistIqr | Work out the interquartile range. | Names the task, not the method. |
| PASS | strings.js > pupil > statQlistIqrWhy | Work out the interquartile range first. | Clear. |
| PASS | strings.js > pupil > statQlistTruth | In order: 4, 7, 7, 9, 12, 15, 21 | Plain reveal, real numbers. |
| FAIL | strings.js > pupil > statPickOne | Aoife = 65 | Same placeholder bug — a value is being labelled with a person's name instead of its term. Replace with: "Median = 65" (or the correct term for this question). |
| FAIL | strings.js > pupil > statPickPair | Aoife = (9 + 12) ÷ 2 = 65 | Same bug. Replace with: "Median = (9 + 12) ÷ 2 = 65" (or the correct term). |
| FAIL | strings.js > pupil > statLineOne | Aoife = 65 | Same bug, third occurrence. Replace with: "Median = 65" (or the correct term). |
| FAIL | strings.js > pupil > statLinePair | Aoife = (9 + 12) ÷ 2 = 65 | Same bug. Replace with: "Median = (9 + 12) ÷ 2 = 65" (or the correct term). |
| PASS | strings.js > pupil > statCftableStart | Choose a box in the last column and put its running total in. | Action first, concrete, one clean sentence. |
| PASS | strings.js > pupil > statCftableRow | Cumulative frequency up to 65 minutes | Label, consistent with the defined term. |
| PASS | strings.js > pupil > statCftableWhy | Put a running total in at least one row first. | Clear. |
| PASS | strings.js > pupil > statCftableTruth | Running totals: 4, 7, 7, 9, 12, 15, 21 | Plain reveal. |
| PASS | strings.js > pupil > statPlotPlaceWhy | Place every point first. | Clear. |
| PASS | strings.js > pupil > statPlotJoinWhy | Join the points first. | Clear. |
| PASS | strings.js > pupil > statJoinPoints | Join the points | Clear button. |
| PASS | strings.js > pupil > statPlotJoinedAlready | The points are joined. | Clear. |
| PASS | strings.js > pupil > statPlotEnough | You have all the points you need — move one instead. | Person leads, approved verb "move". |
| PASS | strings.js > pupil > statPointReadout | (30, 18) | Coordinate readout, real numbers. |
| PASS | strings.js > pupil > statScrollGraph | Scroll the graph sideways to see all of it. | Device-neutral, clear. |
| PASS | strings.js > pupil > statNudgeLabel | Move it one square | Approved verb, clear. |
| PASS | strings.js > pupil > statNudgeLeft | One square left | Short directional label, fine on a four-arrow pad. |
| PASS | strings.js > pupil > statNudgeRight | One square right | Same. |
| PASS | strings.js > pupil > statNudgeUp | One square up | Same. |
| PASS | strings.js > pupil > statNudgeDown | One square down | Same. |
| PASS | strings.js > pupil > statRemovePoint | Take this point off | Device-neutral, clear. |
| FAIL | strings.js > pupil > statReadFind | Find the Aoife. | Same placeholder bug — "the Aoife" is meaningless to her. Replace with: "Find the median." (or the correct term for this question). |
| PASS | strings.js > pupil > statReadWhy | Find every value you were asked for first. | Clear. |
| PASS | strings.js > pupil > statReadMoveWhy | Move the rule to the height you need first. | Consistent with the rule fiction's own wording. |
| PASS | strings.js > pupil > statReadIqr | Work out the interquartile range. | Names the task, not the method. |
| PASS | strings.js > pupil > statReadAtX | Move the rule across to 30. | Concrete, real number, matches the taught mechanic. |
| PASS | strings.js > pupil > statReadAtXWhy | Move the rule across and put your answer in first. | Clear. |
| PASS | strings.js > pupil > statValueReadout | 65 | Real number readout. |
| PASS | strings.js > pupil > statCfReadout | 65 | Real number readout. |
| PASS | strings.js > pupil > statHowManyAbove | How many above | Short field label, consistent with other terse column labels in this table. |
| PASS | strings.js > pupil > statHowManyBelow | How many below | Same. |
| PASS | strings.js > pupil > statPctAbove | Percentage above | Same. |
| PASS | strings.js > pupil > statPctBelow | Percentage below | Same. |
| PASS | strings.js > pupil > statBoxChooseMarker | Choose a marker. | Clear, concrete ("marker" is the defined term). |
| PASS | strings.js > pupil > statBoxPlaceOnScale | Now press the scale where it belongs. | Approved verb, named noun. |
| FAIL | strings.js > pupil > statBoxPlaced | Aoife at 65 | Same placeholder bug. Replace with: "Median at 65" (or the correct term for this marker). |
| PASS | strings.js > pupil > statBoxPlaceWhy | Put all five markers on the scale first. | Consistent with "five markers" established elsewhere. |
| PASS | strings.js > pupil > statDrawBoxPlot | Draw the box plot | Clear button. |
| PASS | strings.js > pupil > statBoxDrawWhy | Draw the box plot first. | Clear. |
| PASS | strings.js > pupil > statBoxDrawnAlready | The box plot is drawn. | Clear. |
| REWRITE | strings.js > pupil > statBoxStageWhy | Finish the first part first. | "First... first" twice in four words trips the tongue and the eye on a reread. Replace with: "Finish the earlier part first." |
| PASS | strings.js > pupil > statNextDrawBox | Next: draw the box plot | Short, clear stage label. |
| PASS | strings.js > pupil > statCompareStart | Finish both sentences. | Clear. |
| PASS | strings.js > pupil > statCompareWhy | Finish both sentences first. | Clear. |
| PASS | strings.js > pupil > statCompareValue | Value | Chip label. |
| PASS | strings.js > pupil > statCmpHigherMedian | had the higher median | Sentence-building chip, fine as a fragment since it's designed to be dropped into a blank. |
| PASS | strings.js > pupil > statCmpAgainst | against | Chip word. |
| PASS | strings.js > pupil > statCmpSoOnAverage | so on average | Chip phrase. |
| PASS | strings.js > pupil > statCmpWere | were | Chip word. |
| PASS | strings.js > pupil > statCmpHadThe | had the | Chip phrase. |
| PASS | strings.js > pupil > statCmpLarger | larger | Chip word. |
| PASS | strings.js > pupil > statCmpSmaller | smaller | Chip word. |
| PASS | strings.js > pupil > statCmpSoTheirs | so theirs were | Chip phrase. |
| PASS | strings.js > pupil > statCmpMore | more | Chip word. |
| PASS | strings.js > pupil > statCmpLess | less | Chip word. |
| PASS | strings.js > pupil > statCmpConsistent | consistent | Chip word, standard GCSE stats vocabulary for the older shelf. |
| REWRITE | strings.js > pupil > statJudgeStart | Decide about each claim. | "Decide about" is an unnatural collocation and doesn't say what she's deciding (fair or not?). Replace with: "Decide whether each claim is fair to say." |
| PASS | strings.js > pupil > statFairToSay | Fair to say | Clear chip. |
| PASS | strings.js > pupil > statNotFair | Not fair | Clear chip. |
| PASS | strings.js > pupil > statJudgeDecideWhy | Decide every claim first. | Clear tooltip. |
| PASS | strings.js > pupil > statJudgeReasonWhy | Give a reason for each one you called not fair. | Clear, refers back to her own "Not fair" choice. |
| PASS | strings.js > pupil > statValuesStart | Choose a box and put your answer in. | Clear compound instruction. |
| PASS | strings.js > pupil > statValuesWhy | Put a number in at least one box first. | Clear. |
| PASS | strings.js > pupil > movieWorkedExample | Worked example | Named concept. |
| PASS | strings.js > pupil > moviePrevStep | Previous step | Clear. |
| PASS | strings.js > pupil > movieNextStep | Next step | Clear. |
| PASS | strings.js > pupil > moviePlayLabel | Play | Clear. |
| PASS | strings.js > pupil > moviePlayBtn | ▶ Play | Clear. |
| PASS | strings.js > pupil > moviePauseBtn | ❚❚ Pause | Clear. |
| PASS | strings.js > pupil > movieReplayBtn | ↺ Replay | Clear. |
| PASS | strings.js > pupil > classifyYourAnswer | You answered "62" — your teacher can see this and will pick it up in class. | Person leads, concrete, no harshness, states a real fact about what happens next. |
| PASS | strings.js > pupil > protractorCheckBtn | Mark my measurement | Matches the named Check-button family. |
| REWRITE | strings.js > pupil > protractorInstructions | Put the small crosshair at the centre of the protractor on the corner. Turn the protractor with a rotate knob at either end, until 0 sits along one arm, then read where the other arm crosses. | This is a three-step sequence run into prose — the shape rule says a sequence like this is a numbered list, not a sentence. Replace with:<br>1. Put the small crosshair at the centre of the protractor, on the corner.<br>2. Turn the protractor with the rotate knob at either end, until 0 sits along one arm.<br>3. Read where the other arm crosses. |
| PASS | strings.js > pupil > protractorReadTrueWrongScale | You read the other scale — use the one that starts at 0 on the arm you lined up. The true size is 65°. | Names a real, specific misconception; true answer appears only at this final-feedback stage. |
| PASS | strings.js > pupil > protractorReadTrueGeneric | Not quite — line the centre on the corner and 0 along an arm, then read again. The true size is 65°. | Same pattern, clear. |
| PASS | strings.js > pupil > protractorScaleRetry | Close — but check you are reading the scale that starts at 0 on your lined-up arm. One more go. | Clear, no answer reveal, appropriate for a first retry. |
| PASS | strings.js > pupil > protractorLineUpRetry | Line it up carefully and read again — one more attempt. | Clear. |
| PASS | strings.js > pupil > protractorTypeFirst | Type the size you measured first. | Clear. |
| PASS | strings.js > pupil > protractorMaxRange | A protractor measures up to 180° — read the size again. | Clear, factual. |
| PASS | strings.js > pupil > protractorMeasureLabel | Your measurement in degrees | Clear. |
| PASS | strings.js > pupil > protractorMeasurePlaceholder | the size you measure, in degrees | Fine as placeholder text. |
| PASS | strings.js > pupil > measuredReadout | · you measured 65° | Fine as an appended readout fragment. |
| PASS | strings.js > pupil > checkLockedWhy | This one is finished. | Clear. |
| PASS | strings.js > pupil > checkNeedsLineWhy | Write a line of working first. | Clear. |
| PASS | strings.js > pupil > checkNeedsAngleWhy | Work out the angle you were asked for first. | Clear. |
| PASS | strings.js > pupil > addedToJotter | ✓ Added to your jotter. | "Jotter" is the everyday school word for this; clear. |
| PASS | strings.js > pupil > algebraNextLine | Write your next line of working: | Action-first, clear. |
| PASS | strings.js > pupil > removeLastLineBtn | ↶ remove last line | Clear button. |
| PASS | strings.js > pupil > removedLastLine | Removed your last line. | Clear. |
| PASS | strings.js > pupil > lineTooLong | That line is too long for the page — split it into two steps. | Clear, actionable. |
| FAIL | strings.js > pupil > lineUnreadable | That line does not read as maths yet — check it and try again. (angles on a straight line add to 180) | The bracketed aside hands her the method (angles on a straight line sum to 180) exactly as the checklist's own must-fail exhibit bans ("e.g. 180−38" leaking the subtraction method). Delete it. Replace with: "That line does not read as maths yet — check it and try again." |
| PASS | strings.js > pupil > pageFull | That is a full page — press Mark my working. | Names the real button by its real text. |
| PASS | strings.js > pupil > secondAttemptNote | Second attempt — your first try stays on the page. | Elliptical style matches house voice, clear. |
| PASS | strings.js > pupil > algebraLinePlaceholder | your next line, then "add line" | Quotes the real button text; fine as placeholder. |
| PASS | strings.js > pupil > addLineBtn | add line | Clear button. |
| PASS | strings.js > pupil > moveAnnotationEquation | What are you doing to both sides? — tag the move (optional) | The checklist's own must-fail exhibit bans this line only when shown on a non-equation (substitution) question. This key is the equation-specific variant (there is a separate "Generic" one for other contexts), so it is scoped correctly here. |
| PASS | strings.js > pupil > moveAnnotationGeneric | What's your next step? — tag the move (optional) | Clear, correctly generic. |
| PASS | strings.js > pupil > chipCollectTerms | Collect terms | Standard algebra term. |
| PASS | strings.js > pupil > chipJustRewrite | Just rewrite | Clear chip. |
| PASS | strings.js > pupil > moveOperandLabel | How much? | Clear. |
| PASS | strings.js > pupil > moveOperandPlaceholder | how much? e.g. 15 or 3x | Illustrates input format only, not this question's answer. |
| PASS | strings.js > pupil > moveOperandNext | next → | Clear. |
| PASS | strings.js > pupil > substIntro | Choose each letter below to put its number in. | Action-first, approved verbs. |
| PASS | strings.js > pupil > substGivenLabel | given: | Clear label. |
| PASS | strings.js > pupil > substAnswerPrompt | Now work it out, then enter the value: | Action-first, clear. |
| FAIL | strings.js > pupil > expandIntro | Multiply every term — choose the right product for each box. | On an "expand the brackets" question, telling her up front to "multiply every term" hands her the exact method the question is testing — the same failure as the checklist's "Plot at the upper class boundaries" exhibit. Replace with: "Expand the brackets — choose the right product for each box." |
| PASS | strings.js > pupil > solveChooseMove | Choose a move — you will see the next line, already checked for balance. | Clear, explains the mechanic without giving the answer. |
| PASS | strings.js > pupil > solveNeedNumber | Enter a number for that move first. | Clear. |
| REWRITE | strings.js > pupil > angleOneOpenHint | One angle is dashed on the diagram — choose it, give its size, and choose the reason. | Three actions run into one sentence — this is exactly the "dock hint with three steps" the shape rule says must be a numbered list. Replace with:<br>1. Choose the dashed angle on the diagram.<br>2. Give its size.<br>3. Choose the reason. |
| REWRITE | strings.js > pupil > angleMultiOpenHint | Choose a dashed angle on the diagram, give its size and reason, then work your way to a. | Same numbered-list problem, and "work your way to a." reads as an unfinished sentence — a single lowercase "a" looks like the article "a", not the angle's name. Replace with:<br>1. Choose a dashed angle on the diagram.<br>2. Give its size and the reason.<br>3. Work your way to angle a. |
| PASS | strings.js > pupil > removeLastStepBtn | ↶ remove last step | Clear. |
| PASS | strings.js > pupil > removedLastStep | Removed your last step. | Clear. |
| FAIL | strings.js > pupil > angleStepHeading | Work out ∠Aoife | Same placeholder bug as the stats screens — this is meant to show the angle's letter (e.g. "Work out ∠a"), not a person's name. Replace with: "Work out ∠a" (or whichever letter this angle actually has). |
| FAIL | strings.js > pupil > angleSizeLabel | Size of angle Aoife | Same bug. Replace with: "Size of angle a" (or the correct letter). |
| PASS | strings.js > pupil > angleSizePlaceholder | the size in degrees | Clear placeholder. |
| PASS | strings.js > pupil > angleUnreadable | That does not read as a number yet. Put in the size in degrees, or a sum that works it out. | Clear, no method leak. |
| PASS | strings.js > pupil > nudgeBannerStar | ★ Your teacher suggested watching this method. | Matches approved exemplar. |
| PASS | strings.js > pupil > selfEvalSavedFlash | ✓ Saved — your teacher sees this on her class list. | Clear, consistent. |
| PASS | strings.js > pupil > selfEvalSavedIdle | Saved as you go — your teacher sees this on her class list. | Clear. |
| PASS | strings.js > pupil > angleUnreadableLine | That does not read as a number yet. Put in the size in degrees, or a sum that works it out. | Same as above, clear. |
| REWRITE | strings.js > teacher > artefactUndrawable | Her work is saved, but this screen could not re-draw the board. | Uses "Her" for a generic pupil, which section 6 bans outright — a teacher scanning fast needs the name, not a pronoun. Replace with: "This pupil's work is saved, but this screen could not re-draw the board." |
| PASS | strings.js > teacher > passcodeChecking | Checking the passcode… | Clear. |
| PASS | strings.js > teacher > openMarkbook | Open the markbook | Self-explanatory compound word, needs no gloss. |
| PASS | strings.js > teacher > noServer | We could not reach the server. Try again. | Clear. |
| REWRITE | strings.js > teacher > wallStale | This class page could not be refreshed. What you see is the last it loaded. | "The last it loaded" is clumsy and would make a fast-reading teacher stumble. Replace with: "This class page could not refresh. You are seeing what it last loaded." |
| PASS | strings.js > teacher > serverNotInitialised | This markbook has not been set up yet. Open Set-up and add a class first. | Names the exact control, actionable. |
| PASS | strings.js > teacher > serverNotSignedIn | Google did not say who you are. Reload the page and sign in again. | Plain, actionable. |
| PASS | strings.js > teacher > serverBadName | That name could not be saved. Letters and spaces only. | Plain, matches house's elliptical style. |
| PASS | strings.js > teacher > serverUnknownClass | There is no class with that code. Check the link, or the code on the board. | Clear, concrete. |
| PASS | strings.js > teacher > serverNotSet | That book is not switched on for this class. Tick it on in Set-up. | Clear, actionable. |
| PASS | strings.js > teacher > serverNotYourClass | That class was made by another teacher, so it is not yours to change. | Clear. |
| PASS | strings.js > teacher > serverExists | There is already a class with that name. | Clear. |
| PASS | strings.js > teacher > serverNotFound | That could not be found. Reload the page and try again. | Clear. |
| FAIL | strings.js > teacher > serverUnreachableStore | The app cannot reach its own store, so nothing was saved and nothing was lost. Tell Damien the front door is not joined to the data deployment. | Raw internal/developer language ("the front door", "the data deployment") shipped straight to a real teacher, and it tells her to contact a named individual by first name, as if he's the school's support line. Any teacher reading this would ask "who's Damien?" Replace with: "The app could not save or load anything just now, so nothing was lost. Try again in a few minutes, and contact your school's technical support if it keeps happening." |
| FAIL | strings.js > teacher > serverTooBig | There is more working in this book than one save can carry. Tell Damien before the class writes any more. | Same fault — a developer's name in a production message a teacher has no way to act on. Replace with: "There is more work in this book than one save can hold. Stop the class writing any more until this is fixed, and contact your school's technical support." |
| REWRITE | strings.js > teacher > serverUnknownAction | The app asked for something this server does not know about. Reload the page. | Describes internal client-server plumbing to a non-specialist reader, who would ask "why is the app asking the server things, and what do I do differently?" Replace with: "Something went wrong that this page cannot explain. Reload the page and try again." |
| PASS | strings.js > teacher > signedInAs | Signed in as aoife.gartland@c2ken.net | Dynamic — shows whoever is actually signed in; fine as a pattern. |
| PASS | strings.js > teacher > loadingClass | Loading 10A-Maths… | Clear, dynamic class name. |
| PASS | strings.js > teacher > readingBooks | Reading 5 of 8 books… | Clear, real numbers. |
| PASS | strings.js > teacher > relockedLeft | The markbook closed when you left it. Enter the passcode to open it again. | Clear. |
| PASS | strings.js > teacher > relockedIdle | The markbook closed itself after fifteen minutes. Enter the passcode to open it again. | Spells out "fifteen minutes" rather than a code; clear. |
| PASS | strings.js > teacher > inkChange | Tap or click a mark to change it. | Correctly names both gestures for a laptop-or-smartboard reader, as section 6 asks. |
| PASS | strings.js > teacher > inkMine | Mark it right | Clear. |
| PASS | strings.js > teacher > inkMineWrong | Mark it wrong | Clear. |
| PASS | strings.js > teacher > inkUseApp | Use the app's mark | Clear. |
| PASS | strings.js > teacher > needsYouLabel | Needs you now | Clear heading. |
| PASS | strings.js > teacher > needsYouWrongTwice | Wrong twice on Angles, Ex 2, Q4 | Names book, exercise and question plainly; not a bare code like the banned "Ex1.Q1". |
| PASS | strings.js > teacher > needsYouPulledHelp | Used the method help on Angles, Ex 2, Q4 and is still wrong | Clear, self-explanatory. |
| PASS | strings.js > teacher > needsYouStuck | Nothing saved for 20 minutes on Angles, Ex 2, Q4 | Clear, real number. |
| PASS | strings.js > teacher > csvCopied | Copied. Paste it into a spreadsheet. | Plain, no jargon. |
| PASS | strings.js > teacher > csvFallback | Your browser would not let the page copy for you. Select the text below and copy it yourself. | Clear, actionable. |
| PASS | strings.js > teacher > setUpHint | Tick the books this class should see. | Clear. |
| PASS | strings.js > teacher > overConfident | Over-confident — confidence high, working weaker | Legend/glossary entry, reads as a definition, not narrative prose. |
| PASS | strings.js > teacher > quietlyExcelling | Quietly excelling — doing well, low confidence | Same, clear. |
| PASS | strings.js > teacher > cellWrongAtStep | Wrong at step 2 | Matches the checklist's own approved fix for this exact pattern. |
| PASS | strings.js > teacher > cellWrongFirstSlip | Wrong — first slip at step 2 | Clear, consistent. |
| PASS | strings.js > teacher > markedAria | Marked right | Clear accessibility label. |
| PASS | strings.js > teacher > reteachTitle | Sends this exercise's worked example (Angles) to this pupil | Clear, names the book. |
| PASS | strings.js > teacher > closeMarkbook | Close the markbook | Clear. |
| PASS | strings.js > teacher > whereYouAre | Where you are | Clear heading. |
| PASS | strings.js > teacher > whichBook | Which book | Clear heading. |
| PASS | strings.js > teacher > needsYouAria | Pupils who need you now | Clear. |
| PASS | strings.js > teacher > nobodyStuck | Nobody is stuck in Angles right now. | Clear, reassuring. |
| PASS | strings.js > teacher > copyByHand | Copy this by hand: ols.link/10a | Plain-text link, clear. |
| PASS | strings.js > teacher > couldNotSave | We could not save that. | Clear. |
| PASS | strings.js > teacher > deleteClassAria | Delete 10A-Maths | Clear. |
| PASS | strings.js > teacher > loadingGrid | Loading the full grid… | Clear. |
| PASS | strings.js > teacher > gridOrient | Each cell is one pupil and one question. Look for the reds, then open a cell to read that pupil's book. | Clear, orients a first-time reader in one pass. |
| PASS | strings.js > teacher > cellNotStarted | Not started | Clear. |
| PASS | strings.js > teacher > cellRight | Right — working and answer both sound | Clear legend entry. |
| PASS | strings.js > teacher > cellAmber | Answer only, no working shown | Matches the checklist's own approved wording (3b). |
| PASS | strings.js > teacher > fetchingBook | Fetching this pupil's book… | Clear. |
| PASS | strings.js > teacher > pencilPosture | These marks are the app's. Tap or click any mark to change it to yours — yours is the one that counts. | Clear, explains ownership, names both gestures. |
| PASS | strings.js > teacher > reteachBtn | Show them this method again → | Sits in a row against the named pupil, so "them" points back at a name already on screen. |
| PASS | strings.js > teacher > reteachSent | Sent ✓ — this pupil sees it next time | Clear. |
| PASS | strings.js > teacher > reteachFailed | We could not send that. | Clear. |
| PASS | strings.js > teacher > saveFailedMark | We could not save that — choose the mark again to try once more. | Clear, actionable. |
| PASS | strings.js > teacher > readingEveryBook | Reading every book… | Clear. |
| PASS | strings.js > teacher > starterBtn | Next-lesson starter ▶ | Clear feature name. |
| REWRITE | strings.js > teacher > csvCopiedFull | CSV copied — paste it straight into a spreadsheet. | "CSV" is unexplained and unnecessary — its own sibling string (csvCopied, above) says the same thing without the acronym. A non-specialist teacher would ask what it means. Replace with: "Copied — paste it straight into a spreadsheet." |
| FAIL | strings.js > teacher > seriesKs3 | KS3 · M2 | "M2" is exactly the kind of undecoded code the checklist bans — a teacher has to guess what it means. Replace with: "KS3 · Module 2" |
| FAIL | strings.js > teacher > seriesGcse | GCSE · M3 & M4 | Same fault. Replace with: "GCSE · Modules 3 and 4" |
| PASS | stats-quartiles > s1 > movie > step3 > say | Position of the median = (n + 1) ÷ 2. / Ring the 4th value. | Worked-example film content — this is exactly where the method should be taught; clear and concrete. |
| PASS | stats-quartiles > s1 > movie > step4 > say | Position of the lower quartile = (n + 1) ÷ 4 = 8 ÷ 4 = 2. / Ring the 2nd value. | Same, a real worked calculation, clear. |
| PASS | stats-quartiles > s1 > movie > step5 > say | Position of the upper quartile = (n + 1) ÷ 4 × 3 = 2 × 3 = 6. / Ring the 6th value. | Same, clear. |
| PASS | stats-quartiles > s1 > q2 > prompt | The speeds of 11 cars passing a speed camera, in mph: 19, 22, 26, 28, 28, 29, 29, 30, 30, 31, 36. | Anchored, plain, real data. |
| PASS | stats-quartiles > s1 > q6 > prompt | The ages of 11 trees, from youngest to oldest, are shown below. | Reads clean; a natural way to describe naturally-ordered data. |
| PASS | stats-quartiles > s1 > q7 > prompt | The scores, from lowest to highest, are shown below. | Same, clean. |
| FAIL | stats-quartiles > s1 > q8 > prompt | Say what happens to each average and to the range when it is added. | "It" has no antecedent in what she's given here — she'd have to ask "what's been added?" before she can even start. Replace with a self-contained version, e.g.: "A new value of 45 is added to the list. Say what happens to each average and to the range." |
| PASS | stats-quartiles > s2 > q10 > prompt | The marks in an examination, out of 80, are grouped below for 112 candidates. | Anchored, plain, real numbers. |
| FAIL | stats-quartiles > s3 > movie > step2 > say | Upper class limit along the bottom, cumulative frequency up the side. | Two verbless clauses joined by a comma — the exact fragment-chain shape the checklist bans and shows failing in its own exhibits. Replace with: "The upper class limit goes along the bottom. The cumulative frequency goes up the side." |
| FAIL | stats-quartiles > s3 > movie > step6 > say | Nineteen more boys, so the total reaches 37. | Same fault — "Nineteen more boys" has no verb, joined by a comma to a clause that does. Replace with: "Nineteen more boys are added, so the total reaches 37." |
| PASS | stats-quartiles > s3 > q13 > prompt | The marks in an examination, out of 80, are shown in the table below for 112 candidates. | Anchored, plain. |
| REWRITE | stats-quartiles > s3 > q14 > prompt | In a survey, 184 people stated their weekly wage, grouped below. | "Grouped below" dangles — it's unclear whether the people or the wage data is grouped, and she'd have to reread it. Replace with: "In a survey, 184 people stated their weekly wage. The wages are grouped in the table below." |
| FAIL | stats-quartiles > s4 > q15 > prompt | The cumulative frequency graph shows the marks of 112 candidates in an examination. / What percentage of candidates passed? | "Passed" is undefined here — no pass mark is given, so she'd have to ask what counts as a pass. Replace with a self-contained version, e.g.: "The cumulative frequency graph shows the marks of 112 candidates in an examination. The pass mark was 45. What percentage of candidates passed?" |
| FAIL | stats-quartiles > s5 > movie > step4 > say | Five markers, one box plot. | Two verbless noun phrases joined by a comma — almost a word-for-word match to the checklist's own banned exhibit "Four fixes, one game." Replace with: "Five markers make one box plot." |
| FAIL | stats-quartiles > s5 > movie > step6 > say | Quartiles 16 and 25, median 20. | Same fault — three verbless fragments joined by commas. Replace with: "The quartiles are 16 and 25, and the median is 20." |
| PASS | stats-quartiles > s5 > q19 > prompt | The table shows some information about the heights, in cm, of some plants. | Reads clean, grammatical, every noun picturable — no jargon, no telegraphed method. |
| PASS | stats-quartiles > s5 > q20 > prompt | The table shows some information about the weights, in grams, of some potatoes: range 101 g, lower quartile 110 g, median 132 g, upper quartile 162 g, maximum 185 g. | Reads as a plain data summary, same pattern as the raw data lists elsewhere in this book; clear. |
| PASS | stats-quartiles > s5 > q21 > prompt | The times, in seconds, of 15 students running a race are shown below: 52, 54, 54, 55, 58, 58, 59, 60, 60, 61, 61, 64, 67, 70, 75. | Plain data list, clear. |
| PASS | stats-quartiles > s5 > q24 > prompt | The box plots show the age distributions of two cities, A and B. Decide which city has the greater interquartile range, and which city's people are generally older. | Two clear, parallel, readable sentences. |
| PASS | stats-quartiles > s5 > q27 > prompt | The table shows information about the times, in minutes, that some boys took to complete a puzzle: interquartile range 8, minimum 12, median 18, upper quartile 23, maximum 29. | Plain data summary, clear. |
| FAIL | stats-quartiles > s6 > q29 > prompt | Decide whether his survey gives a fair picture of the town, and why. | "His" needs a named person given just before it, and nothing here supplies one — she'd have to ask "whose survey?" Replace with a version that names him, e.g.: "Decide whether Peter's survey gives a fair picture of the town, and why." |
| PASS | stats-quartiles > s6 > q30 > prompt | Decide whether this survey gives a fair picture of everyone, and why. | "This survey" points at material described just above it on the same screen — a normal, unforced reference, not a bare pronoun standing in for a name. |
| PASS | stats-quartiles > s6 > q31 > prompt | Decide whether each survey gives a fair picture of the town, and why. | Same reasoning — "each survey" refers to surveys described on screen, reads clean. |
| PASS | stats-quartiles > s6 > q32 > prompt | Decide whether each survey gives a fair picture, and why. | Same, clean. |
| PASS | strings.js > pupil > classifyTryAgain | Not that one — look again at its size against 90° and 180°. | Clear, redirects without giving the classification away. |
