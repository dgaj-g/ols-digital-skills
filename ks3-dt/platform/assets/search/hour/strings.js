/* J2 L5 THE SEARCH — every pupil-facing string of the hour, in one table.
   The bang's captions live in the frozen search/film.js (chapter 0) and are not repeated here.
   {n}-style slots are filled by the engine with HER numbers. The words gate (hour/wordsgate.js) reads this file. */
(function () {
  'use strict';
  var S = {};
  S.strip = ['Do now', '1 The tracks', '2 The fields', '3 The spiral', '4 The way home', 'Home'];
  S.stripNamed = 'The strip at the bottom shows where you are in the hour.';
  S.btn = { next: 'Next', back: 'Back', fly: 'Fly it', run: 'Run', stop: 'Stop it', pause: 'Pause', soundOn: 'Sound is on', soundOff: 'Sound is off',
    home: 'Home', carryOn: 'Carry on', startAgain: 'Start again', nameHer: 'Name her', freeFlight: 'Free flight', finish: 'Finish', tryOne: 'Try this one',
    watchOther: 'Watch the ending you missed', readIt: 'Read it', start: 'Start the hour', check: 'Check', yes: 'Yes', nearly: 'Nearly', notYet: 'Not yet' };
  S.common = { clockStarts: 'The snow starts filling the prints when you type. If it buries the trail, you start again.', clockStartsRun: 'The clock starts at Run. If it runs out, BEEP winds time back and you try again.',
    notRun: 'That line did not work. The line to type is on the card.', indent: 'Put 4 spaces before that line, so it is inside the loop.',
    ringed: 'Type the line with the circle round it. Keep its 4 spaces.', wind: '', lighter: 'This computer is slow, so the pictures are simpler. Your flight is the same.',
    paused: 'Paused. Press Pause again to carry on.', runningOut: 'Running out of time? Finish this chapter and press Home. Your place is saved.',
    welcome: 'Welcome back, {name}. You were at {chapter}. {lamb} is still out there.', welcomeNoLamb: 'Welcome back, {name}. You were at {chapter}.',
    tab: 'Press the Tab key to make 4 spaces.', forNoColon: 'The for line needs a colon at the end.', forCap: 'Python needs for in small letters.',
    forIndent: 'The for line is not pushed in. Start it at the left.', spaces: 'Push that line in by exactly 4 spaces. Tab makes them.' };
  /* CHAPTER 1: THE TRACKS */
  S.ch1 = { kicker: 'THE TRACKS',
    h1: 'Type forward(10) to fly BEEP to the first hoof-print.', h1b: 'Type look() to light it.',
    tour: ['This is the box you type in.', 'This card shows the line to type.', 'BEEP will fly along these hoof-prints.'],
    keepGoing: 'The snow is filling the prints from the top. Keep going.',
    j: { fwdOk: 'BEEP flew 10 metres to print {n} of 20.', lookOk: 'The torch is on. Print {n} of 20 is lit.', capF: 'Python needs forward in small letters.',
      noBr: 'forward needs brackets round its number: forward(10)', noClose: 'The line needs a closing bracket at the end.', noNum: 'forward needs a number in its brackets: forward(10)',
      lookNoBr: 'look needs its brackets, with nothing inside: look()', lookArg: 'look takes nothing in its brackets: look()', lookTwice: 'The torch is on at a print that is already lit. Fly forward first.',
      fwdTwice: 'Print {n} is not lit yet. Type look() before you fly on.', fwdN: 'forward({n}) is not one print. Each print is 10 metres on: forward(10)', capL: 'Python needs look in small letters.' },
    h2: 'Fly and light every hoof-print. Type two lines for each one.', gauge: 'Time until the snow buries the trail', count: 'Print {n} of 20 is lit.',
    fail: ['The snow has buried the trail. I am winding time back.', 'You typed the same two lines for every print. The snow was faster.'],
    fast: ['You typed all 40 lines in time. The trail is lit.', 'A slower typist loses the trail under the snow.'],
    holdDark: 'The snow waits while I show you this.',
    lesson: ['Look. forward(10) then look(), twenty times over.', 'I can do the same thing again and again. Doing things again is what I am for.',
      'This one line tells me how many times: for i in range(20):', 'The i is the count\u2019s name. You will use it in The spiral.', 'Your two lines go under it, pushed in by four spaces.',
      'I repeat the pushed-in lines 20 times.', 'You need only three lines, not forty. Type them and watch me go.'],
    h4: 'Type these 3 lines. The dots are 4 spaces.', lines4: ['for i in range(20):', '    forward(10)', '    look()'],
    j4: { forOk: 'range({w}) means {w} times. The colon says more lines come next.',
      forNoBr: 'range needs brackets round its number: range({w})',
      forN: 'range({n}) would fly {n} prints. There are 20 prints, so type range(20).', forNoI: 'The letter i is missing. Type it after for: for i in range({w}):',
      fwdIn: 'This line is pushed in, so it is inside the loop.', fwdNoIndent: 'Put 4 spaces before forward, so it is inside the loop. Tab makes them.',
      lookIn: 'look is inside the loop too. Both lines will fly 20 times.', lookNoIndent: 'Put 4 spaces before look, so it is inside the loop too.',
      forNoNum: 'range needs a number in its brackets: range({w})' },
    flyIt: 'Press Fly it. I will do the rest.', screenCount: 'Print {n} of 20', held: 'You typed 3 lines. BEEP did 40 things.',
    close: [
      { h: 'A loop repeats the pushed-in lines for you.', under: ['The long way was 40 lines. The loop was 3 lines.', 'BEEP flew the same two lines 20 times.'] },
      { h: 'That is called a for loop.', labels: [['for i in range(20):', 'range(20) means do it 20 times.'], ['    forward(10)', 'Pushed in, so it is inside the loop.'], ['    look()', 'Pushed in, so it repeats too.']], box: 'The pushed-in lines run once each time round. range(20) means 20 times round.' },
      { seen: 'You saw this: range(20) flew the two lines 20 times.', q: 'The far field has 12 prints. Which line flies them all?',
        opts: [['for i in range(12):', 'Yes. range(12) runs the pushed-in lines 12 times.', true], ['for i in range(20):', 'That would fly 20 prints. The far field has 12.', false], ['forward(12)', 'That flies 12 metres once. A loop needs for and range.', false]] }
    ] };
  /* CHAPTER 2: THE FIELDS */
  S.ch2 = { kicker: 'THE FIELDS', film: ['The trail ends at a gate into three walled fields.', 'She is in one of them. Light every wall and we will see her.'],
    fields: [
      { name: 'square', h: 'Light every wall. Count them, then write the number.', sign: 'Turn: left(90)', walls: 4, turn: 90, help1: 'The square has 4 walls.', ok: '4 flights lit 4 walls. She is not in this field.', shortMore: 'I flew {k} times. The square has more walls than that.' },
      { name: 'pen', h: 'This pen has more walls. Count them, then type the number in the for line.', sign: 'Turn: left(60)', walls: 6, turn: 60, help1: 'Count the dark walls, one by one.', ok: '6 flights lit 6 walls. She is not in this field.', shortMore: 'I flew {k} times. Count the walls again.' },
      { name: 'three-cornered field', h: 'The last field. Count the walls and write the number.', sign: 'Turn: left(120)', walls: 3, turn: 120, help1: 'Count the dark walls, one by one.', ok: 'Not here either. She is further up.', shortMore: 'I flew {k} times. Count the walls again.' }
    ],
    card: ['for i in range(?):', '    forward(100)', '    left({a})'], gauge: 'Daylight left before the sky goes dark',
    j: { short1: 'I flew {k} times. Count the walls.', over: 'That is {k} flights for {w} walls. Type the true count.', noNum: 'range needs a number in its brackets. Count the walls.',
      wrongTurn: 'The sign says left({a}). Use the turn on the sign.', wrongLen: 'Each wall is 100 metres. Use forward(100).', noTurn: 'The sign says left({a}). Use the turn on the sign.' },
    fail: ['It is too dark to see the walls. I am winding time back.'],
    close: [
      { h: 'The number in the brackets is how many times the loop runs.', under: ['You counted 4, 6 and 3 walls. The loop flew each number of times.'] },
      { h: 'A loop that runs one time too few has a name: off by one.', labels: [['for i in range({k}):', '{k} flights for {w} walls. One wall stayed dark.']], box: 'Off by one: the loop ran one time too few, or one too many.' },
      { q: 'A field has 5 walls. Which line lights them all?', opts: [['for i in range(5):', 'Yes. 5 walls need 5 flights.', true], ['for i in range(4):', 'That is one short. One wall stays dark: off by one.', false], ['for i in range(6):', 'That is one too many. BEEP flies the first wall twice.', false]] }
    ] };
  /* CHAPTER 3: THE SPIRAL */
  S.ch3 = { kicker: 'THE SPIRAL', film: ['Beyond the top wall the field is open, and her bleat is fading.', 'I cannot search a whole field one wall at a time.', 'Watch me count. Then make my flight grow.'],
    h1: 'Type these 2 lines. BEEP says its count.', lines1: ['for i in range(3):', '    say(i)'],
    j1: { forOk: 'The loop goes round 3 times. Now type the pushed-in line.', sayOk: 'say(i) says the count. Press Fly it.', say3: 'say(3) says 3 every time round. Type say(i), so it says the count.',
      sayNoBr: 'say needs brackets round the i: say(i)', sayNoIndent: 'Put 4 spaces before say, so it is inside the loop.', forN: 'The card says range({w}). Type that first.', changeOk: 'range(5) means 5 times. Press Fly it.' },
    held1: 'BEEP said 0, 1, 2. The count starts at 0.', change: 'Change the 3 to 5 and press Fly it again.', held2: 'range(5) gave 5 counts: 0 to 4. It never says 5.',
    h2: 'Fly a spiral that grows. Use i in the flight.', card2: ['for i in range(10):', '    forward(i * 10)', '    left(90)'], gauge: 'Time left before her bleat fades',
    j2: { found: 'You found her!', found10i: '10 * i is the same as i * 10. You found her!', fwd10: 'forward(10) flies 10 metres every time round, so the spiral never grows. Put i in the brackets.',
      fwdI: 'forward(i) grows by only 1 metre each time round. This is too slow. Try forward(i * 10).', shortRange: '{k} times round reached {m} metres. She is further out. Use range(10).',
      longRange: 'You found her when i was 9. The loop went round {k} more times. Use range(10).', noTurn: 'Your loop has no turn, so it is not a spiral. Add left(90).', right90: 'right(90) spirals the other way round. You found her!' },
    help1: 'i is 0, then 1, then 2. i * 10 is 0, 10, 20.',
    fail: ['Her bleat has faded away. I am winding time back.', 'Try again from the middle of the field.'],
    foundHer: 'Found her.', held3: 'Pass 0 flew 0 metres. Pass 9 flew 90 metres.',
    close: [
      { h: 'i is the count. It starts at 0 and changes every time round.', under: ['The loop went round ten times. i went from 0 to 9. The flight grew with it.'] },
      { h: 'You used the count inside the loop.', labels: [['for i in range(10):', '10 times round. i goes 0, 1, 2, up to 9.'], ['    forward(i * 10)', 'i * 10 is 0, then 10, then 20, then 90 at the end.'], ['    left(90)', 'A quarter turn each time round makes the spiral.']], box: 'i is a variable, a box with a name on it. The loop puts a new number in it each time round.' },
      { q: 'BEEP runs for i in range(4): with say(i). What does it say?', opts: [['0 1 2 3', 'Yes. Four counts, starting at 0.', true], ['1 2 3 4', 'The count starts at 0, not 1.', false], ['0 1 2 3 4', 'range(4) is four counts, so it stops after 3.', false]] }
    ] };
  /* CHAPTER 4: THE WAY HOME */
  S.ch4 = { kicker: 'THE WAY HOME', film: ['The lamb walks under BEEP\'s light. Nuala and her dog Bran are coming up the lane.', 'BEEP\'s battery is low. Three flights left.',
      'Nuala: Dad wrote programs for the drone last spring. They are on its screen.', 'Each program has a bug, a mistake. Read it before you run it, then fix one word.'],
    read: 'Read it. What will this fly?', fix: 'Fix one word, then press Run.', fixFirst: 'Swap the first line for a for line with a count, then press Run.', name: 'Name the bug.', runSee: 'Run it and see.',
    bugs: { off: 'Off by one', turn: 'Wrong turn', never: 'Never stops' },
    p: [
      { above: 'The lane has 6 gates.', lines: ['for i in range(5):', '    forward(100)', '    look()'], predict: ['Lights all 6 gates', 'Lights 5 gates, one stays dark', 'Never stops'],
        held: 'BEEP flew 5 times for 6 gates. The last gate is dark.', fixedHeld: 'BEEP flew 6 times for 6 gates. Nuala is through the last gate.',
        wrong: { over: 'That is {k} flights for 6 gates. One too many.', len: 'Each gate is 100 metres on. Keep forward(100).', still: 'BEEP flew {k} times for 6 gates. The last gate is still dark.' },
        bug: 'off', nameFb: { off: 'Yes. 5 flights for 6 gates.', turn: 'There is no turn in this loop.', never: 'It stopped after 5. The bug is the count.' } },
      { above: 'The yard has 4 walls, with a left turn at each corner.', lines: ['for i in range(4):', '    forward(100)', '    left(80)'], predict: ['Lights the 4 walls and closes the square', 'Drifts off the walls', 'Never stops'],
        held: 'Four turns of 80. The square did not close.', fixedHeld: 'Four turns of 90. The yard is lit.',
        wrong: { turn: 'Four turns of {a}. The square did not close.', count: '{k} flights at 80. The square still did not close.' },
        bug: 'turn', nameFb: { turn: 'Yes. A turn of 80 does not make a square corner. A turn of 90 does.', off: '4 walls, 4 flights. The count was right.', never: 'It stopped after 4. The bug is the turn.' } },
      { above: 'The barn is 60 metres on. One flight of battery left.', lines: ['while True:', '    forward(10)', '    look()'], predict: ['Lights the way to the barn and stops', 'Never stops', 'Stops short of the barn'],
        held: 'There is no count, so the loop has no end. It never stops.', fixedHeld: 'BEEP flew 6 steps and stopped. The barn door is open.', gauge: 'Battery power left',
        wrong: { big: 'range({k}) flies {k} steps of 10 metres. The barn is 6 steps on.', whileAgain: 'while True has no count. Use for and range.', noColon: 'The for line needs a colon at the end.', short: 'range({k}) is {k} steps. The barn is 6 steps on.' },
        fail: ['The program never stopped, so the battery ran out. I am winding time back.', 'Try again from the start of the lane.'],
        bug: 'never', nameFb: { never: 'Yes. while True has no count, so no end.', off: 'There was no count to be off by.', turn: 'There is no turn in this loop.' } }
    ],
    close: [
      { h: 'A loop bug has a name.', under: ['Off by one means the count is 5 but there are 6 gates. Wrong turn means you turned 80 instead of 90. Never stops means while True has no end.'] },
      { h: 'Read the loop before you run it.', labels: [['range(5) for 6 gates', 'Off by one. The count is one short, or one over.'], ['left(80) for a square', 'Wrong turn. The turn does not match the shape.'], ['while True:', 'Never stops. No count, so no end.']], box: 'Check the count, the turn and the end before you press Run.' },
      { q: 'This loop should light 10 gates: for i in range(9). What is the bug?', opts: [['Off by one', 'Yes. 9 times round for 10 gates.', true], ['Wrong turn', 'There is no turn in this loop.', false], ['Never stops', 'range(9) stops after 9 times round.', false]] }
    ] };
  /* THE CLOSE */
  S.close = { kicker: 'HOME',
    barn: ['She is in. Her mother has found her.', 'Nuala: Thank you. Thank you. Thank you.', 'You typed {n} lines. I did {m} things.', 'Loops are how one line does many things.'],
    nameH: 'Nuala: Dad says the one who found her names her. Type it here.', nameUnder: '', nameEmpty: 'She needs a name first.',
    badges: [['The Tracks', 'You flew the first loop.'], ['The Spiral', 'You used i in the flight.'], ['The Way Home', 'You named three bugs.']], badgeKicker: 'BADGE EARNED',
    recapH: 'What you did today.', recapH2: 'What you did today, part two.', recap: ['A loop runs its pushed-in lines once each time round. range sets how many.', 'The number in the brackets sets how many times. One too small is a bug called off by one.',
      'i is the count. It starts at 0 and changes every time round. The loop can use it.', 'A loop bug has a name: off by one, wrong turn, never stops.'],
    last5H: 'BEEP\'s last 5 questions',
    feltH: 'How sure are you about each of these?', felt: ['I can write a loop with for and range.', 'I can use i inside the loop.', 'I can name a loop bug when I see one.'],
    feltDone: 'Done. The free flight is next if there is time.',
    freeH: 'Free flight. Tap a starter or type a loop. BEEP draws it in light.', freeStarters: [['A star', ['for i in range(5):', '    forward(80)', '    right(144)']], ['A growing spiral', ['for i in range(12):', '    forward(i * 8)', '    left(90)']], ['A hexagon', ['for i in range(6):', '    forward(60)', '    left(60)']]],
    freeNotRun: 'BEEP cannot fly that. Type a for loop, or press one of the three examples.',
    finished: 'The Search is finished. Your place is saved.' };
  window.SearchStrings = S;
})();
