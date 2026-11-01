/* J2 L5 THE SEARCH — every pupil-facing string of the hour, in one table.
   The bang's captions live in the frozen search/film.js (chapter 0) and are not repeated here.
   {n}-style slots are filled by the engine with HER numbers. The words gate (hour/wordsgate.js) reads this file. */
(function () {
  'use strict';
  var S = {};
  S.strip = ['Do now', '1 The tracks', '2 The walls', '3 The growing square', '4 The way home', 'Home'];
  S.btn = { next: 'Next', back: 'Back', run: 'Run', stop: 'Stop it', pause: 'Pause', home: 'Home', carryOn: 'Carry on', startAgain: 'Start again',
    nameHer: 'Name her', finish: 'Finish', tryAgain: 'Try again' };
  S.common = { paused: 'Paused. Click Pause again to carry on.', runningOut: 'Running out of time? Finish this chapter and click Home. Your place is saved.',
    welcome: 'Welcome back, {name}. You were at {chapter}. {lamb} is safe in the barn.', welcomeNoLamb: 'Welcome back, {name}. You were at {chapter}.',
    windBack: 'The story winds back. Your lines are kept.' };
  S.close = { kicker: 'HOME',
    barn: ['She is in, out of the snow. Her mother has found her.', 'NUALA: Thank you. Thank you. Thank you.', 'BEEP: Your short loops made me carry out over 100 instructions tonight.', 'BEEP: That is what loops are for.'],
    nameTalk: 'Dad says the one who found her names her.', nameH: 'Type a name for the lamb, then click Name her.', nameEmpty: 'Type a name for the lamb first.',
    badges: [['The Tracks', 'You flew your first loop.'], ['The Growing Square', 'You used i to grow the search.'], ['The Way Home', 'You named three loop bugs.']], badgeKicker: 'BADGE EARNED',
    recapH: 'What you did tonight.', recap: ['A loop does the same job many times. range says how many.', 'You count the number from the job: 4 walls, range(4).',
      'i counts the rounds, from 0. The loop can use it, like forward(i * 10).', 'A loop bug has a name: off by one, wrong turn, never stops.'],
    freeH: 'Free flight. Click one of the three examples, or type your own loop. Then click Run. BEEP draws it in light.',
    freeStarters: [['A star', ['for i in range(5):', '    forward(80)', '    right(144)']], ['A growing square', ['for i in range(12):', '    forward(i * 8)', '    left(90)']], ['A hexagon', ['for i in range(6):', '    forward(60)', '    left(60)']]],
    freeNotRun: 'BEEP cannot fly that. Type a for loop, or click one of the three examples.',
    finished: 'The Search is finished. Your place is saved.' };
  window.SearchStrings = S;
})();
