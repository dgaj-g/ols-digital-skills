/* MathShelf — every sentence the app itself says.
 *
 * RULE 23, and the reason for it: a sentence hardcoded inside a renderer is a
 * sentence no gate ever reads. On the KS3 DT platform "Found the studio" and
 * "Exit check — part 2" walked onto a pupil's screen that way, past a language
 * harness that was reading the CONTENT while those sentences sat in the CODE.
 *
 * So: every pupil- and teacher-facing sentence that is not part of a book lives
 * here, in two tables. The book's own words live in its content pack. The three
 * named tables (COMMENTS in jotter.js, DX_NAMES in staff.js, SELF_EVAL_TRIPS in
 * script.js) stay where they are and are read AS TABLES.
 *
 * HOW THESE ARE WRITTEN (the checklist, section 4):
 *   - the person leads the sentence: "You...", never "The app will..."
 *   - concrete nouns: the page, the pad, the tray, the scale, the curve
 *   - DEVICE-NEUTRAL VERBS. The room is mixed - Chromebooks and iPads in class,
 *     phones at home, a smartboard for the starter. Never a bare "tap" or
 *     "click" as THE gesture: say what to DO, and name both when a gesture has
 *     to be named ("tap or click").
 *   - one reading age, eleven or twelve, for every book
 *   - no taglines, no pedagogy, no internal names, no dead product names
 *   - UK English
 *
 * A placeholder is written {like this} and filled by the caller.
 */
(function () {
  'use strict';

  window.GJ_STRINGS = {

    /* ── what a pupil reads ─────────────────────────────────────────── */
    pupil: {
      /* the cover */
      coverBusy: 'Opening your books…',
      coverGetting: 'Getting your details…',
      coverWelcome: 'Welcome',
      coverOpen: 'Open your books',
      coverSwitch: 'Not you? Switch account',
      coverFirstTime: 'First time here? Google will ask your permission once, then you are straight in.',
      coverNoServer: 'We could not reach the server. Check your connection and reload the page.',
      coverWrongClass: 'That class link is not active. Ask your teacher for the link again.',
      coverNameLabel: 'Your name',
      coverNamePrompt: 'We could not read your name from your account. Write it once and it is saved.',
      coverNameMissing: 'Write your name first, so your teacher sees it on her class list.',
      coverPreview: 'This is the preview copy of MathShelf. Nothing here is saved to school.',

      /* the shelf */
      shelfGreetingMorning: 'Good morning',
      shelfGreetingAfternoon: 'Good afternoon',
      shelfPlain: 'Your maths books live here. Your teacher chooses which ones are out.',
      shelfMore: 'Your teacher decides which books are on this shelf, and may add more during the year.',
      shelfMarks: '{got} of {max} marks · {done} of {total} answered',

      /* inside a book */
      contentsMarks: 'My marks',
      backToShelf: 'The shelf',
      opening: 'Opening {book}…',
      nudgeBanner: 'Your teacher suggested watching this method.',
      selfEvalSaved: 'Saved. Your teacher sees this on her class list.',
      selfEvalHeading: 'Exercise finished — how did that go?',
      selfEvalOptional: 'optional',
      saveWaiting: 'Still saving your work…',
      saveInFlight: 'Saving…',
      saveRetry: 'Try again',
      saveHeldLocal: 'Your work is safe on this device and will be sent as soon as the page can reach the server.',
      /* RULING 51 (12 Sept 2026): the store can take a while, and that is not
         the same as the store saying no. This is the one sentence for when
         it genuinely refuses a save, so trying again on her own is not the
         only thing she is told to do. */
      saveRefused: 'The server will not accept your save right now. Nothing you wrote is lost — try again in a moment, or tell your teacher.',

      /* the jotter: the composer and number-pad widgets (default labels — most
         callers pass their own, but these are the ones actually reached) */
      composeDefaultLabel: 'Write the next step of working',
      composeDefaultPlaceholder: 'write the new line here',
      composeDefaultCommit: '✓ Done',

      /* ── Handling Data (the stats books): every sentence these boards say.
           Device-neutral verbs throughout - the room is Chromebooks, iPads,
           phones and a smartboard - and the two named fictions, `rule` and
           `tray`, each carry their plain-words line. ─────────────────────── */
      statCheckQlist: 'Mark my working',
      statCheckCftable: 'Mark my table',
      statCheckCfplot: 'Mark my points and curve',
      statCheckCfread: 'Mark my readings',
      statCheckBoxplot: 'Mark my box plot',
      statCheckCompare: 'Mark my comparison',
      statCheckJudge: 'Mark my answers',
      statCheckValues: 'Mark my answers',
      statAlreadyMarked: 'This question is already marked.',
      statTryAgain: 'Not quite. Your first go stays above — one more attempt.',
      statPutBack: 'Press it again to put it back.',
      statRemoveLast: 'Remove the last one',
      statNextRow: 'next ↓',
      statThatsMine: '✓ That’s my answer',
      statThatsMyOne: '✓ That’s my {name}',
      /* the two fictions */
      statRuleFiction: 'The rule is the line that crosses the graph. Move it up the frequency axis to the height you need, then read where it meets the curve.',
      statTrayFiction: 'The tray is the row of markers waiting to be used. A marker leaves the tray when it goes on the scale.',
      /* names the boards use for the statistics themselves */
      statMedian: 'median',
      statLowerQuartile: 'lower quartile',
      statUpperQuartile: 'upper quartile',
      statIqr: 'interquartile range',
      statRange: 'range',
      statLowest: 'Lowest',
      statHighest: 'Highest',
      statClassColumn: 'Group',
      statFrequency: 'Frequency',
      statCumulativeFrequency: 'Cumulative frequency',
      statReading: 'reading',
      /* the ordered list and its cuts */
      statQlistOrderWhy: 'Put every value in the row first.',
      statQlistPickWhy: 'Choose each value you were asked for first.',
      statQlistCommit: '✓ That’s my {name}',
      statQlistCommitWhy: 'Choose a value in the row first.',
      statQlistIqrWhy: 'Work out the interquartile range first.',
      statQlistTruth: 'In order: {list}',
      statPickOne: '{name} = {value}',
      statPickPair: '{name} = ({a} + {b}) ÷ 2 = {value}',
      statLineOne: '{name} = {value}',
      statLinePair: '{name} = ({a} + {b}) ÷ 2 = {value}',
      /* the cumulative frequency column */
      statCftableRow: 'Cumulative frequency up to {value} {unit}',
      statCftableWhy: 'Put a running total in at least one row first.',
      statCftableTruth: 'Running totals: {list}',
      /* plotting and joining */
      statPlotPlaceWhy: 'Place every point first.',
      statPlotJoinWhy: 'Join the points first.',
      statJoinPoints: '✓ Join the points',
      statPlotJoinedAlready: 'The points are joined.',
      statPlotEnough: 'You have all the points you need — move one instead.',
      statPointReadout: '({x}, {y})',
      statScrollGraph: 'Scroll or swipe the graph sideways to see all of it.',
      /* the nudge pad */
      statNudgeLabel: 'Move it one square',
      statNudgeLeft: 'One square left',
      statNudgeRight: 'One square right',
      statNudgeUp: 'One square up',
      statNudgeDown: 'One square down',
      statRemovePoint: 'Take this point off',
      /* reading the curve */
      statReadWhy: 'Find every value you were asked for first.',
      statReadMoveWhy: 'Move the rule to the height you need first.',
      statReadAtXWhy: 'Move the rule across and put your answer in first.',
      statValueReadout: '{value}',
      statCfReadout: '{value}',
      statHowManyAbove: 'How many above',
      statHowManyBelow: 'How many below',
      statPctAbove: 'Percentage above',
      statPctBelow: 'Percentage below',
      /* the box plot */
      statBoxPlaceWhy: 'Put all five markers on the scale first.',
      statDrawBoxPlot: '✓ Draw the box plot',
      statBoxDrawWhy: 'Draw the box plot first.',
      statBoxDrawnAlready: 'The box plot is drawn.',
      statBoxStageWhy: 'Finish the first part before this one.',
      statNextDrawBox: 'Next: draw the box plot',
      /* comparing two distributions */
      statCompareWhy: 'Finish both sentences first.',
      statCompareValue: 'Value',
      statCmpHigherMedian: 'had the higher median',
      statCmpAgainst: 'against',
      statCmpSoOnAverage: 'so on average',
      statCmpWere: 'were',
      statCmpHadThe: 'had the',
      statCmpLarger: 'larger',
      statCmpSmaller: 'smaller',
      statCmpSoTheirs: 'so theirs were',
      statCmpMore: 'more',
      statCmpLess: 'less',
      statCmpConsistent: 'consistent',
      /* weighing a claim */
      statFairToSay: 'Fair to say',
      statNotFair: 'Not fair',
      statJudgeDecideWhy: 'Decide every claim first.',
      statJudgeReasonWhy: 'Give a reason for each one you called not fair.',
      /* number-pad answers */
      statValuesStart: 'Choose a box and put your answer in.',
      statValuesWhy: 'Put a number in at least one box first.',

      /* THE STAGE STRIP AND THE CURRENT INSTRUCTION (DESIGN 4.0, Correction
         11 Sept 2026 — his first live test of Book C). A pill is two or three
         words; an instruction names the whole act, how many, and what happens
         next; every {n} is a live count. The instruction table in the design
         is the source of every sentence here. */
      statPillOrder: 'Put in order',
      statPillCuts: 'Find the quartiles',
      statPillIqr: 'Find the interquartile range',
      statPillCftable: 'Fill the running total',
      statPillValues: 'Work out the values',
      statPillPlot: 'Plot the points',
      statPillJoin: 'Join the points',
      statPillRead: 'Read the {name}',
      statPillReadAt: 'Read at {x}',
      statPillBoxPlace: 'Place the markers',
      statPillBoxDraw: 'Draw the box plot',
      statPillCompare1: 'The averages',
      statPillCompare2: 'The spread',
      statPillJudge: 'Decide each one',
      statStageQlistOrder: 'Build the ordered list. Choose the smallest value first, then the next smallest, and keep going until every value is in the row. ({n} still to place.)',
      statStageQlistPick: 'Now choose the value you think is the {name}. If it sits between two values, choose both. Then press ✓ That’s my {name}.',
      statStageIqr: 'Enter the interquartile range on the pad. When it is in, press Mark my working.',
      statStageIqrCommit: 'Enter the interquartile range on the pad, then press ✓ That’s my answer.',
      statStageCftable: 'Fill in the running total from the top row down: each box is the total so far plus that row’s frequency. Choose a box, then use the pad.',
      statStageCfplotPlace: 'Plot one point for each row of the table: across at the top of the class, up at the running total. Next: across {hi}, up {cf}. ({n} of {m} placed.)',
      statStageCfplotJoin: 'Every point is placed. Join them to draw the curve: press ✓ Join the points.',
      statStageCfread: 'Move the rule up the frequency axis to the height for the {name}, then read where it meets the curve. Press ✓ That’s my {name} to keep it.',
      statStageCfreadAtX: 'Move the rule along the bottom axis to {x}, and read the total where it meets the curve. Then enter the answer on the pad.',
      statStageBoxPlace: 'Choose a marker, then choose where it belongs on the scale. All five go on. ({n} of 5 placed.)',
      statStageBoxDraw: 'All five markers are on the scale. Press ✓ Draw the box plot.',
      statStageCompare1: 'Finish the first sentence: choose the group with the higher median, then enter both medians.',
      statStageCompare2: 'Finish the second sentence: choose the measure, the group and the two values.',
      statStageJudge: 'For each statement choose Fair to say or Not fair. If you choose Not fair, choose the reason as well.',
      statStageJudgeOptions: 'Choose what happens to each one.',

      /* ── BOOK A — Collecting and displaying (12 Sept 2026): the kinds order,
         pick, stemleaf, pie and scatter, and values on a figure. Same law as
         above: a pill is two or three words; an instruction names the whole
         act before the control that does it; nothing names one gesture. */
      statCheckOrder: 'Mark my order',
      statCheckPick: 'Mark my choice',
      statCheckStemleaf: 'Mark my diagram',
      statCheckPie: 'Mark my pie chart',
      statCheckScatter: 'Mark my graph',
      statOrderWhy: 'Put every card in the row first.',
      statPickWhy: 'Choose the better question first.',
      statPickWhyWhy: 'Say why the others fall short first.',
      statSlWhy: 'Put every leaf on a stem first.',
      statSlKeyWhy: 'Build the key first.',
      statPieWhyTable: 'Fill in every angle first.',
      statPieWhyRim: 'Place every sector boundary first.',
      statPieWhyDraw: 'Press ✓ Draw the pie chart first.',
      statPieWhyLabels: 'Put a label on every sector first.',
      statScWhyPlot: 'Plot every point first.',
      statScWhyLine: 'Draw the line of best fit first.',
      statScWhyEst: 'Read the estimate and enter it first.',
      statScWhyCorr: 'Choose the correlation first.',
      statScWhyOutlier: 'Choose the reading that looks wrong first.',
      statTrayFictionOrder: 'The tray is the row of cards waiting to be used. A card leaves the tray when it goes into the row.',
      statTrayFictionLeaves: 'The tray is the row of values waiting to be used. A value leaves the tray when its leaf goes on a stem.',
      statPillPickChoose: 'Choose the better question',
      statPillPickWhy: 'Say why',
      statPillSlPlace: 'Place the leaves',
      statPillSlKey: 'Write the key',
      statPillPieTable: 'Work out the angles',
      statPillPieRim: 'Draw the sectors',
      statPillPieLabels: 'Label the chart',
      statPillScPlot: 'Plot the points',
      statPillScLine: 'Draw the line',
      statPillScEst: 'Estimate at {at}',
      statPillScCorr: 'Name the correlation',
      statPillScOutlier: 'Find the odd one out',
      statStageOrder: 'Put the cards in the order the cycle happens. Choose the card that comes first, then the next, until every card is in the row. ({n} still to place.)',
      statStageOrderDone: 'Every card is in the row. If one is out of place, press it to send it back. Then press Mark my order.',
      statStagePick: 'Read the three questions. Choose the one that would work best on a questionnaire.',
      statStagePickWhy: 'Now choose the reason the other questions fall short. Then press Mark my choice.',
      statStageSlPlace: 'Build the diagram. Choose a value from the tray, then choose the stem it belongs on; its leaf lands at the end of that row. ({n} of {m} placed.)',
      statStageSlKey: 'Every leaf is on. Now write the key: choose a stem, then a leaf, and the key line writes itself. Then press Mark my diagram.',
      statStageSlDone: 'Every leaf is on. If one is on the wrong stem, press it to send it back. Then press Mark my diagram.',
      statStagePieTable: 'Work out the angle for each row and put it in the Angle column. Choose a box, then use the pad. ({n} of {m} filled.)',
      statStagePieTableDone: 'Every angle is in. Press Next: draw the sectors.',
      statStagePieRim: 'Draw the sectors in the order of your table, clockwise from the top. Choose a point on the rim for each boundary; use the arrows to move it one degree. ({n} of {m} placed.)',
      statStagePieBoundsDone: 'Every boundary is placed. Press ✓ Draw the pie chart.',
      statStagePieLabels: 'Label each sector: choose a label, then choose the sector it belongs to. ({n} of {m} labelled.)',
      statStageScPlot: 'Plot one point for each pair in the table: across for the first value, up for the second. Choose a spot to place a point; choose a placed point to move it with the arrows. ({n} of {m} placed.)',
      statStageScPlotDone: 'Every point is placed. Press Next: draw the line.',
      statStageScLine: 'Draw the line of best fit. Move the two handles so the line runs through the middle of the points, following their slope. Then press ✓ That’s my line.',
      statStageScEst: 'The rule stands at {at}. Read where it meets your line, then enter the estimate on the pad.',
      statStageScCorr: 'Choose the word that describes the correlation you see.',
      statStageScOutlier: 'One reading does not follow the others. Choose the point that looks wrong.',
      statScNextLine: 'Next: draw the line',
      statScThatsMyLine: '✓ That’s my line',
      statScNextEst: 'Next: read the estimate',
      statScNextCorr: 'Next: name the correlation',
      statScNextOutlier: 'Next: find the odd one out',
      statScPositive: 'Positive',
      statScNegative: 'Negative',
      statScNone: 'No correlation',
      statPieNextRim: 'Next: draw the sectors',
      statPieDraw: '✓ Draw the pie chart',
      statPieAngleLabel: '{label} angle',
      statPieDegrees: '{deg}°',
      statPieReadout: 'Boundary at {deg}°',
      statPieNumber: 'Number',
      statPieCategory: 'Category',
      statPieTotal: 'Total',
      statPieNoAngles: 'no angles yet',
      statPieAngle: 'Angle',
      statSlStem: 'Stem',
      statSlLeaf: 'Leaf',
      statSlKeyLine: '{stem} | {leaf} means {means}',
      statSlKeyStem: 'Stem',
      statSlKeyLeaf: 'Leaf',
      statEstimateLabel: 'Estimate',
      numpadDefaultLabel: 'Enter a number',

      /* the movie player */
      movieWorkedExample: 'Worked example',
      moviePrevStep: 'Previous step',
      movieNextStep: 'Next step',
      moviePlayLabel: 'Play',
      moviePlayBtn: '▶ Play',
      moviePauseBtn: '❚❚ Pause',
      movieReplayBtn: '↺ Replay',

      /* classify questions (choose the type of angle) */
      classifyCheckBtn: 'Mark my answer',
      classifyYourAnswer: 'You answered “{answer}” — your teacher can see this and will pick it up in class.',
      classifyTryAgain: 'Not that one — look again at its size against 90° and 180°. One more attempt.',

      /* protractor questions (measure the angle) */
      protractorCheckBtn: 'Mark my measurement',
      protractorInstructions: 'Put the small crosshair at the centre of the protractor on the corner. Turn the protractor with a rotate knob at either end, until 0 sits along one arm, then read where the other arm crosses.',
      protractorReadTrueWrongScale: 'You read the other scale — use the one that starts at 0 on the arm you lined up. The true size is {value}°.',
      protractorReadTrueGeneric: 'Not quite — line the centre on the corner and 0 along an arm, then read again. The true size is {value}°.',
      protractorScaleRetry: 'Close — but check you are reading the scale that starts at 0 on your lined-up arm. One more go.',
      protractorLineUpRetry: 'Line it up carefully and read again — one more attempt.',
      protractorTypeFirst: 'Type the size you measured first.',
      protractorMaxRange: 'A protractor measures up to 180° — read the size again.',
      protractorMeasureLabel: 'Your measurement in degrees',
      protractorMeasurePlaceholder: 'the size you measure, in degrees',
      measuredReadout: ' · you measured {value}°',

      /* the jotter: the shared check control */
      checkWorkingBtn: 'Mark my working',
      checkLockedWhy: 'This one is finished.',
      checkNeedsLineWhy: 'Write a line of working first.',
      checkNeedsAngleWhy: 'Work out the angle you were asked for first.',
      cancelBtn: 'Cancel',
      addedToJotter: '✓ Added to your jotter.',
      checkFailedSaved: 'Something went wrong marking this — your working is saved for your teacher.',
      amberNoWorking: 'Right answer — but with no working shown, you can’t earn the working marks.',
      lineWrongNoReveal: 'The line in the red box is where it went wrong — nothing is given away. One more attempt.',

      /* the jotter: algebra free-writing (expand/simplify fallback and rewrite) */
      algebraNextLine: 'Write your next line of working:',
      removeLastLineBtn: '↶ remove last line',
      removedLastLine: 'Removed your last line.',
      lineTooLong: 'That line is too long for the page — split it into two steps.',
      lineUnreadable: 'That line does not read as maths yet — check it and try again. ({reason})',
      pageFull: 'That is a full page — press Mark my working.',
      addToWorkingBtn: 'Add to my working',
      secondAttemptNote: 'Second attempt — your first try stays on the page.',
      algebraLinePlaceholder: 'your next line, then “add line”',
      addLineBtn: 'add line',

      /* the jotter: the move-chip annotation (algebra free-writing + solve) —
         the four arithmetic chips and "expand brackets" are the same tool in
         both places, so one label serves both */
      moveAnnotationEquation: 'What are you doing to both sides? — tag the move (optional)',
      moveAnnotationGeneric: 'What’s your next step? — tag the move (optional)',
      chipAdd: '+ add',
      chipSubtract: '− subtract',
      chipMultiply: '× multiply',
      chipDivide: '÷ divide',
      chipExpandBrackets: 'Expand brackets',
      chipCollectTerms: 'Collect terms',
      chipJustRewrite: 'Just rewrite',
      moveOperandLabel: 'How much?',
      moveOperandPlaceholder: 'how much? e.g. 15 or 3x',
      moveOperandNext: 'next →',

      /* the jotter: substitution questions */
      substIntro: 'Choose each letter below to put its number in.',
      substGivenLabel: 'given:',
      substAnswerPrompt: 'Now work it out, then enter the value:',
      substValueLabel: 'The value',

      /* the jotter: simplify (collect like terms into bins) */
      simplifyIntro: 'Sort each term into its family, then combine.',
      allSortedNowCombine: 'All sorted — now combine.',
      combineTermsBtn: 'Combine these terms',

      /* the jotter: expand (multiply out a bracket) */
      expandIntro: 'Multiply every term — choose the right product for each box.',

      /* the jotter: form an equation, then solve it */
      formChooseEquation: 'Form the equation — which one matches the situation?',

      /* the jotter: solve (the move-chip rail) */
      solveChooseMove: 'Choose a move — you will see the next line, already checked for balance.',
      solveNeedNumber: 'Enter a number for that move first.',
      solveMoveUnbalanced: 'That move doesn’t keep it balanced — try another.',
      chipTakeXBothSides: 'Take □x off both sides',
      promptTakeXBothSides: 'Take how many x off both sides?',
      promptSubtractBoth: 'Subtract how much from both sides?',
      promptAddBoth: 'Add how much to both sides?',
      promptDivideBoth: 'Divide both sides by?',
      promptMultiplyBoth: 'Multiply both sides by?',
      applyBtn: 'Apply',

      /* the jotter: angle reasoning steps */
      angleOneOpenHint: 'One angle is dashed on the diagram — choose it, give its size, and choose the reason.',
      angleMultiOpenHint: 'Choose a dashed angle on the diagram, give its size and reason, then work your way to angle {target}.',
      removeLastStepBtn: '↶ remove last step',
      removedLastStep: 'Removed your last step.',
      angleStepHeading: 'Work out ∠{name}',
      angleSizeLabel: 'Size of angle {name}',
      angleSizePlaceholder: 'the size in degrees',
      angleSizeHint: 'Type the size — a number, or a sum like 180−124.',
      angleChooseReasonSub: 'Then choose the reason — it earns its own mark:',
      angleNeedSize: 'First type the size of the angle above.',
      angleUnreadable: 'That does not read as a number yet. Put in the size in degrees, or a sum that works it out.',
      angleOutOfRange: 'An angle here is between 0° and 360° — check the size.',

      /* the last of the migration: sentences that used to live on a render path */
      nudgeBannerStar: '★ Your teacher suggested watching this method.',
      selfEvalSavedFlash: '✓ Saved — your teacher sees this on her class list.',
      selfEvalSavedIdle: 'Saved as you go — your teacher sees this on her class list.',
      angleWorkOut: 'Work out ∠',
      angleSizeHintLine: 'Type the size — a number, or a sum like 180−124.',
      angleUnreadableLine: 'That does not read as a number yet. Put in the size in degrees, or a sum that works it out.',
      amberNoWorkingLine: 'Right answer — but with no working shown, you can’t earn the working marks.',
      angleChooseReasonPrompt: 'Now choose the reason below ↓ — it earns its own mark.'
    },

    /* ── what a teacher reads ───────────────────────────────────────── */
    teacher: {
      /* when a pupil's own board cannot be re-drawn on this screen - a saved
         record from a version of the book that no longer exists, say. It says
         what is missing and does not pretend the work is not there. */
      artefactUndrawable: 'The pupil’s work is saved, but this screen could not re-draw the board.',
      passcodeLabel: 'Staff passcode',
      passcodeEmpty: 'Enter the staff passcode.',
      passcodeChecking: 'Checking the passcode…',
      tickSaving: 'Saving changes…',
      overrideRight: 'Marked right — full marks. Your mark is the one pupils and staff now see.',
      overrideWrong: 'Marked wrong. Your mark is the one pupils and staff now see.',
      overrideBack: 'Back to the app’s mark.',
      /* the outcome of a tick, named (rule 23): these used to be built by
         string concatenation on the render path itself, invisible to any
         language gate */
      tickOn: '{book} is now on {class}’s shelf.',
      tickOff: '{book} removed from {class}’s shelf.',
      passcodeWrong: 'That passcode was not accepted.',
      openMarkbook: 'Open the markbook',
      noServer: 'We could not reach the server. Try again.',
      wallStale: 'This class page could not be refreshed. What you see is the last it loaded.',
      /* WHAT THE SERVER SAID, IN WORDS. Every one of these is a code the
         server can return, and the markbook used to print the code itself on
         a teacher's screen - "not-configured" at ten to nine on a Tuesday. A
         code is a thing to look up; a sentence is a thing to act on. */
      serverNotInitialised: 'This markbook has not been set up yet. Open Set-up and add a class first.',
      serverNotSignedIn: 'Google did not say who you are. Reload the page and sign in again.',
      serverBadName: 'That name could not be saved. Letters and spaces only.',
      serverUnknownClass: 'There is no class with that code. Check the link, or the code on the board.',
      serverNotSet: 'That book is not switched on for this class. Tick it on in Set-up.',
      serverBadPasscode: 'That passcode was not accepted.',
      serverNotYourClass: 'That class was made by another teacher, so it is not yours to change.',
      serverExists: 'There is already a class with that name.',
      serverNotFound: 'That could not be found. Reload the page and try again.',
      serverUnreachableStore: 'The app cannot reach its store, so nothing was saved and nothing was lost. Tell the ICT office.',
      serverStoreSlow: 'The store did not answer in time, so that did not go through. Nothing was lost. Try again in a moment. If it keeps happening, tell the ICT office.',
      serverTooBig: 'There is more working in this book than one save can carry. Tell the ICT office before the class writes any more.',
      serverUnknownAction: 'The app asked for something this server does not know about. Reload the page.',
      signedInAs: 'Signed in as {email}',
      loadingClass: 'Loading {class}…',
      readingBooks: 'Reading {done} of {total} books…',
      relockedLeft: 'The markbook closed when you left it. Enter the passcode to open it again.',
      relockedIdle: 'The markbook closed itself after fifteen minutes. Enter the passcode to open it again.',
      inkChange: 'Tap or click a mark to change it.',
      inkMine: 'Mark it right',
      inkMineWrong: 'Mark it wrong',
      inkUseApp: 'Use the app’s mark',
      needsYouLabel: 'Needs you now',
      needsYouWrongTwice: 'Wrong twice on {book}, {exercise}, {question}',
      needsYouPulledHelp: 'Used the method help on {book}, {exercise}, {question} and is still wrong',
      needsYouStuck: 'Nothing saved for {minutes} minutes on {book}, {exercise}, {question}',
      csvCopied: 'Copied. Paste it into a spreadsheet.',
      csvFallback: 'Your browser would not let the page copy for you. Select the text below and copy it yourself.',
      setUpHint: 'Tick the books this class should see.',
      setUpClosedHint: 'A book that is not ticked is closed for that class: it is not on the pupils’ shelf at all.',

      /* the markbook's own words */
      overConfident: 'Over-confident — confidence high, working weaker',
      quietlyExcelling: 'Quietly excelling — doing well, low confidence',
      cellWrongAtStep: 'Wrong at step {step}',
      cellWrongFirstSlip: 'Wrong — first slip at step {step}',
      markedAria: 'Marked {verdict}',
      workingLabel: 'Working',
      reteachTitle: 'Sends this exercise’s worked example ({title}) to this pupil',
      closeMarkbook: 'Close the markbook',
      whereYouAre: 'Where you are',
      whichBook: 'Which book',
      needsYouAria: 'Pupils who need you now',
      nobodyStuck: 'Nobody is stuck in {book} right now.',
      copyByHand: 'Copy this by hand: {text}',
      couldNotSave: 'We could not save that.',
      copyLink: 'Copy link',
      deleteClassAria: 'Delete {class}',
      nameTheClass: 'Give the class a name first.',
      loadingGrid: 'Loading the full grid…',
      gridOrient: 'Each cell is one pupil and one question. Look for the reds, then open a cell to read that pupil\'s book.',
      cellNotStarted: 'Not started',
      cellRight: 'Right — working and answer both sound',
      cellAmber: 'Answer only, no working shown',
      cellAmber2: 'Answer only — no working shown',
      fetchingBook: 'Fetching this pupil\'s book…',
      pencilPosture: 'These marks are the app\'s. Tap or click any mark to change it to yours — yours is the one that counts.',
      openedExample: 'Opened the worked example after getting stuck',
      reteachBtn: 'Show them this method again →',
      reteachSent: 'Sent ✓ — this pupil sees it next time',
      reteachFailed: 'We could not send that.',
      saving: 'Saving…',
      saveFailedMark: 'We could not save that — choose the mark again to try once more.',
      inkYes: '✓ mine',
      inkNo: '✗ mine',
      inkUse: 'use the app’s mark',
      inkYourMark: 'Your mark:',
      readingEveryBook: 'Reading every book…',
      starterBtn: 'Next-lesson starter ▶',
      csvCopiedFull: 'CSV copied — paste it straight into a spreadsheet.',
      seriesKs3: 'KS3 · M2',
      seriesGcse: 'GCSE · M3 & M4'
    }
  };

  /* fill {placeholders}; a placeholder with no value is left visible on purpose,
     because a sentence with a hole in it is a bug somebody should see */
  window.GJ_STRINGS.fill = function (s, vals) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) {
      return (vals && vals[k] != null) ? String(vals[k]) : m;
    });
  };

  /* one code -> one sentence. Anything not on this list is not shown raw: the
     caller's own fallback sentence is used instead, because a teacher reading
     "bad-act" learns nothing she can act on. */
  var SERVER_SAYS = {
    'not-initialised': 'serverNotInitialised',
    'not-signed-in': 'serverNotSignedIn',
    'bad-name': 'serverBadName',
    'no-name': 'serverBadName',
    'unknown-class': 'serverUnknownClass',
    'not-set': 'serverNotSet',
    'bad-act': 'serverNotSet',
    'bad-passcode': 'serverBadPasscode',
    'not-your-class': 'serverNotYourClass',
    'exists': 'serverExists',
    'no-row': 'serverNotFound',
    'no-question': 'serverNotFound',
    'no-email': 'serverNotSignedIn',
    'bad-secret': 'serverUnreachableStore',
    'no-secret-configured': 'serverUnreachableStore',
    'not-configured': 'serverUnreachableStore',
    /* A SLOW STORE IS NOT A BROKEN ONE (12 Sept 2026). 'relay-failed' is what
       the front door says when the data deployment's answer did not arrive
       in time - his 15:03 passcode check took 68 s on Google's side and every
       call that day completed - and the old row read that as "not joined to
       the data deployment", a sentence that names a fault nobody had. The
       joined-or-not sentence is kept for the codes that actually mean it. */
    'relay-failed': 'serverStoreSlow',
    /* THE STORE TOKEN (ruling 51, the store cut). The page's own call to the
       store is answered 'token-expired' or 'token-bad' when its token is old
       or wrong; script.js fetches a fresh one and retries, then falls back to
       the relay, so neither word should ever reach a screen. If one does, it
       is the slow-store sentence - never "not joined", which names a fault
       that is not there. */
    'token-expired': 'serverStoreSlow',
    'token-bad': 'serverStoreSlow',
    'state-too-big': 'serverTooBig',
    'summary-too-big': 'serverTooBig',
    'unknown-action': 'serverUnknownAction',
    'unknown-sub': 'serverUnknownAction'
  };
  window.GJ_STRINGS.serverSays = function (code, fallback) {
    var key = SERVER_SAYS[String(code || '')];
    var t = window.GJ_STRINGS.teacher || {};
    return (key && t[key]) || fallback || t.noServer || '';
  };

})();
