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
    windBack: 'The story goes back to the start of this chapter. The code you typed is still there.' };
  S.close = { kicker: 'HOME',
    barn: ['The lamb is in the barn, out of the snow. Her mother has found her.', 'NUALA: Thank you. Thank you. Thank you.', 'BEEP: Your short loops made me carry out over 100 instructions tonight.', 'BEEP: A loop lets a few short lines do a lot of work.'],
    nameTalk: 'Dad says whoever found the lamb gets to name her.', nameH: 'Type a name for the lamb, then click Name her.', nameEmpty: 'Type a name for the lamb first.',
    badges: [['The Tracks', 'You flew your first loop.'], ['The Growing Square', 'You used i to make the square grow.'], ['The Way Home', 'You named three loop bugs.']], badgeKicker: 'BADGE EARNED', badgesKicker: 'BADGES EARNED',
    recapH: 'What you did in this lesson.', recap: ['A loop does the same job many times. range says how many.', 'First count the things BEEP must light. If there are 4 walls, you write range(4).',
      'The counter i counts the rounds, and it starts at 0. The loop can use it, for example forward(i * 10).', 'A loop bug has a name: off by one, wrong turn, never stops.'],
    freeH: 'This is free flight. Click one of the three examples, or type your own loop. Then click Run. BEEP draws it in light.',
    freeStarters: [['A star', ['for i in range(5):', '    forward(80)', '    right(144)']], ['A growing square', ['for i in range(12):', '    forward(i * 8)', '    left(90)']], ['A hexagon', ['for i in range(6):', '    forward(60)', '    left(60)']]],
    freeNotRun: 'BEEP cannot fly that. Type a for loop, or click one of the three examples.',
    finished: 'The Search is finished. Your place is saved.' };
  window.SearchStrings = S;
})();
