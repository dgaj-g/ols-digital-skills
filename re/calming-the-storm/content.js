/* ============================================================
   Calming the Storm — the content
   ------------------------------------------------------------
   ONE home for the teacher's seven parts and for every word a
   pupil reads or hears read out. Four lines must also sit in
   index.html, because they are needed before any script runs
   (the tab title, the description, the no-JavaScript line and
   the footer); tests/parity.test.js holds them to this file.

   PARTS are the teacher's own words, copied from her Word file
   (kept in the design folder, not in the repo) character for
   character (curly quotes kept). Do not "correct" them:
   tests/parity.test.js compares them with her file.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.STORM_CONTENT = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PARTS = [
    'That day when evening came, he said to his disciples, “Let us go over to the other side.”',
    'Leaving the crowd behind, they took him along, just as he was, in the boat. There were also other boats with him.',
    'A furious squall came up, and the waves broke over the boat, so that it was nearly swamped.',
    'Jesus was in the stern, sleeping on a cushion. The disciples woke him and said to him, “Teacher, don’t you care if we drown?”',
    'He got up, overpowered the wind and said to the waves, “Quiet! Be still!” Then the wind died down and it was completely calm.',
    'He said to his disciples, “Why are you so afraid? Do you still have no faith?”',
    'They were terrified and asked each other, “Who is this? Even the wind and the waves obey him!”'
  ];

  var STRINGS = {
    /* names */
    title: 'Calming the Storm',
    ref: 'Mark 4: 35-41',
    fullTitle: 'Calming the Storm (Mark 4: 35-41)',
    footer: 'OLS Digital Skills',
    pageDescription: 'Put the seven parts of the story in the right order.',

    /* opening screen */
    intro: 'This story is in seven parts, and they are mixed up. Drag each part up or down until the story is in the right order. Then press Check my order.',
    begin: 'Begin',
    inProgress: 'You have a game in progress.',
    carryOn: 'Carry on',
    startAgain: 'Start again',
    harder: 'Play the harder game',
    harderAbout: 'In the harder game, Check my order tells you how many parts are right, but not which ones.',
    bestFirst: 'Your fewest checks so far: {n}.',
    bestHarder: 'Your fewest checks in the harder game so far: {n}.',

    /* switches (the button shows how things are now; pressing it changes them) */
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    flashesOn: 'Lightning flashes: on',
    flashesOff: 'Lightning flashes: off',

    /* the game */
    listLabel: 'The seven parts of the story',
    instruct: 'Drag the parts into the right order. Then press Check my order.',
    instructHarder: 'Harder game: Check my order tells you how many parts are right, but not which ones.',
    check: 'Check my order',
    checks: 'Checks: {n}',
    lampStart: 'Not checked yet',
    lampCaption: 'Last check: {n} of 7 in the right place',
    notMoved: 'Nothing has moved since your last check. Move a part first, then press Check my order.',
    firstNone: 'No parts are in the right place yet. Move them, then press Check my order again.',
    firstOne: '1 of 7 is in the right place and is now locked. Move the others, then press Check my order again.',
    firstSome: '{n} of 7 are in the right place and are now locked. Move the others, then press Check my order again.',
    harderNone: 'Harder game: at your last check, no parts were in the right place.',
    harderOne: 'Harder game: at your last check, 1 of 7 parts was in the right place.',
    harderSome: 'Harder game: at your last check, {n} of 7 parts were in the right place.',
    keyboardHelp: 'With a keyboard: press Tab to choose a part, then the up or down arrow key to move it.',

    /* read out by a screen reader */
    cardLabel: 'Place {p} of 7. {text}',
    cardLocked: 'In the right place and locked.',
    cardWrong: 'Not in the right place.',
    movedTo: 'Moved to place {p} of 7.',
    cannotMove: 'This part is locked in the right place.',

    /* start again */
    confirmAsk: 'Start again? The parts will be mixed up again and your checks will go back to 0.',
    confirmYes: 'Yes, start again',
    confirmNo: 'No, keep going',

    /* the calm (both lines are the teacher’s words, from part 5) */
    quote1: '“Quiet! Be still!”',
    quote2: 'Then the wind died down and it was completely calm.',
    skip: 'Skip',

    /* the end screen */
    resultHead: 'The story is in order.',
    resultFirst: 'You put it in order on your first check.',
    resultMany: 'You put it in order in {n} checks.',
    resultHarderFirst: 'Harder game: you put it in order on your first check.',
    resultHarderMany: 'Harder game: you put it in order in {n} checks.',
    readStory: 'Read the story',
    playAgain: 'Play again',
    backToFirst: 'Play the first game',
    close: 'Close',

    /* small screens and old browsers */
    rotate: 'Turn your phone upright to play.',
    noScript: 'This activity will not work in this browser. Please open the link in Chrome or Safari.'
  };

  return { PARTS: PARTS, STRINGS: STRINGS };
});
