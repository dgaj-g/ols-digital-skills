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
      saveHeldLocal: 'Your work is safe on this device and will be sent as soon as the page can reach the server.'
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
