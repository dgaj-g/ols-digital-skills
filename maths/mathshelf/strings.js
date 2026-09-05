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
      shelfNotSet: 'Not set yet',
      shelfNotSetNote: 'A book that is not set yet is one your teacher has not put out for this class.',
      shelfMore: 'Your teacher will add more books to this shelf during the year.',
      shelfMarks: '{got} of {max} marks · {done} of {total} answered',

      /* inside a book */
      contentsMarks: 'My marks',
      backToShelf: 'The shelf',
      opening: 'Opening {book}…',
      nudgeBanner: 'Your teacher suggested watching this method.',
      selfEvalSaved: 'Saved. Your teacher sees this on her class list.',
      saveWaiting: 'Still saving your work…',
      saveRetry: 'Try again',
      saveHeldLocal: 'Your work is safe on this device and will be sent as soon as the page can reach the server.',

      /* the jotter: the composer and number-pad widgets (default labels — most
         callers pass their own, but these are the ones actually reached) */
      composeDefaultLabel: 'Write the next step of working',
      composeDefaultPlaceholder: 'write the new line here',
      composeDefaultCommit: '✓ Done',
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
      protractorInstructions: 'Put the small red centre mark on the corner. Turn the protractor with a rotate knob at either end, until 0 sits along one arm, then read where the other arm crosses.',
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
      substMethodPrompt: 'Now work it out, then write the value:',
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
      angleMultiOpenHint: 'Choose a dashed angle on the diagram, give its size and reason, then work your way to {target}.',
      removeLastStepBtn: '↶ remove last step',
      removedLastStep: 'Removed your last step.',
      angleStepHeading: 'Work out ∠{name}',
      angleSizeLabel: 'Size of angle {name}',
      angleSizePlaceholder: 'the size, e.g. 65',
      angleSizeHint: 'Type the size — a number, or a sum like 180−124.',
      angleChooseReasonSub: 'Then choose the reason — it earns its own mark:',
      angleNeedSize: 'First type the size of the angle above.',
      angleUnreadable: 'That does not read as a number yet — type a number, or a calculation like 180−65.',
      angleOutOfRange: 'An angle here is between 0° and 360° — check the size.',

      /* the last of the migration: sentences that used to live on a render path */
      nudgeBannerStar: '★ Your teacher suggested watching this method.',
      selfEvalSavedFlash: '✓ Saved — your teacher sees this on her class list.',
      selfEvalSavedIdle: 'Saved as you go — your teacher sees this on her class list.',
      angleWorkOut: 'Work out ∠',
      angleSizeHintLine: 'Type the size — a number, or a sum like 180−124.',
      angleUnreadableLine: 'That does not read as a number yet — type a number, or a calculation like 180−65.',
      amberNoWorkingLine: 'Right answer — but with no working shown, you can’t earn the working marks.',
      angleChooseReasonPrompt: 'Now choose the reason below ↓ — it earns its own mark.'
    },

    /* ── what a teacher reads ───────────────────────────────────────── */
    teacher: {
      passcodeLabel: 'Staff passcode',
      passcodeEmpty: 'Enter the staff passcode.',
      passcodeChecking: 'Checking the passcode…',
      passcodeWrong: 'That passcode was not accepted.',
      openMarkbook: 'Open the markbook',
      noServer: 'We could not reach the server. Try again.',
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

      /* the markbook's own words */
      selfEvalHeading: 'Exercise finished — how did that go?',
      selfEvalOptional: 'optional',
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
      cellUntouched: 'Not started',
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
})();
