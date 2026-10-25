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
  S.common = { clockStarts: 'The snow starts filling the prints when you type. If it buries the trail, you start again.', clockStartsRun: 'The clock starts when you press Run. If the time runs out, BEEP winds time back and you try again.',
    notRun: 'That line did not work. The line to type is on the card.', indent: 'Put 4 spaces before that line, so it is inside the loop.',
    ringed: 'Type the line with the circle round it. Keep its 4 spaces.', wind: '', lighter: 'This computer is slow, so the pictures are simpler. Your flight is the same.',
    paused: 'Paused. Press Pause again to carry on.', runningOut: 'Running out of time? Finish this chapter and press Home. Your place is saved.',
    welcome: 'Welcome back, {name}. You were at {chapter}. {lamb} is still out there.', welcomeNoLamb: 'Welcome back, {name}. You were at {chapter}.',
    tab: 'Press the Tab key to make 4 spaces.', forNoColon: 'The for line needs a colon at the end.', forCap: 'Python needs the word "for" to be in small letters.',
    forIndent: 'The for line should not be pushed in. Start it at the left, with no spaces before it.', spaces: 'Push that line in by exactly 4 spaces. Press the Tab key to make them.' };
  /* CHAPTER 1: THE TRACKS */
  S.ch1 = { kicker: 'THE TRACKS',
    h1: 'Type forward(10) to fly BEEP to the first hoof-print.', h1b: 'Type look() to light it.',
    tour: ['This is the box you type in.', 'This card shows the line to type.', 'BEEP will fly along these hoof-prints.'],
    keepGoing: 'The snow is filling the prints from the top. Keep going.',
    j: { fwdOk: 'BEEP flew 10 metres to print {n} of 20.', lookOk: 'The torch is on. Print {n} of 20 is lit.', capF: 'Python needs the word "forward" to be in small letters.',
      noBr: 'forward needs brackets round its number: forward(10)', noClose: 'The line needs a closing bracket at the end.', noNum: 'forward needs a number in its brackets: forward(10)',
      lookNoBr: 'look needs its brackets, with nothing inside: look()', lookArg: 'look takes nothing in its brackets: look()', lookTwice: 'The torch is on at a print that is already lit. Fly forward first.',
      fwdTwice: 'Print {n} is not lit yet. Type look() before you fly on.', fwdN: 'forward({n}) misses the next print. Each print is 10 metres on, so type forward(10).', capL: 'Python needs the word "look" to be in small letters.' },
    h2: 'Fly and light every hoof-print. Type two lines for each one.', gauge: 'Time until the snow buries the trail', count: 'Print {n} of 20 is lit.',
    fail: ['The snow has buried the trail. I am winding time back.', 'You typed the same two lines for every print. The snow was faster.'],
    fast: ['You typed all 40 lines in time. The trail is lit.', 'If you had typed more slowly, the snow would have buried the trail.'],
    holdDark: 'The snow waits while I show you this.',
    lesson: ['Look at this. You needed forward(10) and then look(), again and again, twenty times.', 'I can do the same thing again and again. Repeating is my job.',
      'This one line tells me how many times: for i in range(20):', 'The letter i is the name of the loop\'s count. It counts each time round. You will use i in chapter 3, The spiral.', 'Your two lines go under the for line. Push them in by four spaces.',
      'I repeat the pushed-in lines 20 times.', 'You need only three lines, not forty. Type them and watch me go.'],
    h4: 'Type these 3 lines. Where you see 4 dots, type 4 spaces instead.', lines4: ['for i in range(20):', '    forward(10)', '    look()'],
    j4: { forOk: 'range({w}) means {w} times. The colon says more lines come next.',
      forNoBr: 'range needs brackets round its number: range({w})',
      forN: 'range({n}) would fly {n} prints. There are 20 prints, so type range(20).', forNoI: 'The letter i is missing. Type i after the word for. The whole line is: for i in range({w}):',
      fwdIn: 'This line is pushed in, so it is inside the loop.', fwdNoIndent: 'Put 4 spaces before forward, so it is inside the loop. Press the Tab key to make them.',
      lookIn: 'look is inside the loop too. Both lines will fly 20 times.', lookNoIndent: 'Put 4 spaces before look, so it is inside the loop too.',
      forNoNum: 'range needs a number in its brackets: range({w})' },
    flyIt: 'Press Fly it. I will do the rest.', screenCount: 'Print {n} of 20', held: 'You typed 3 lines. BEEP did 40 things.',
    close: [
      { h: 'A loop repeats the pushed-in lines for you.', under: ['Typing every line yourself would take 40 lines. The loop took 3 lines.', 'BEEP flew the same two lines 20 times.'] },
      { h: 'These 3 lines are called a for loop.', labels: [['for i in range(20):', 'range(20) means do it 20 times.'], ['    forward(10)', 'This line is pushed in, so it is inside the loop.'], ['    look()', 'This line is pushed in too, so it repeats.']], box: 'The pushed-in lines run once each time round the loop. range(20) means the loop goes round 20 times.' },
      { seen: 'You saw this: range(20) flew the two lines 20 times.', q: 'A new field has 12 hoof-prints. Which line flies BEEP to all of them?',
        opts: [['for i in range(12):', 'Yes. range(12) runs the pushed-in lines 12 times.', true], ['for i in range(20):', 'That would fly BEEP to 20 prints. The new field has 12.', false], ['forward(12)', 'That flies 12 metres once. A loop needs for and range.', false]] }
    ] };
  /* CHAPTER 2: THE FIELDS */
  S.ch2 = { kicker: 'THE FIELDS', film: ['The trail ends at a gate into three walled fields.', 'The lost lamb is in one of the fields. Light every wall of a field to see if she is in it.'],
    fields: [
      { name: 'square', h: 'Light every wall. Count the walls, then type that number in the for line.', sign: 'Turn: left(90)', walls: 4, turn: 90, help1: 'The square has 4 walls.', ok: '4 flights lit 4 walls. She is not in this field.', shortMore: 'I flew {k} times. The square has more walls than that.' },
      { name: 'sheep pen', h: 'This sheep pen has more walls. Count the walls, then type the number in the for line.', sign: 'Turn: left(60)', walls: 6, turn: 60, help1: 'Count the dark walls, one by one.', ok: '6 flights lit 6 walls. She is not in this field.', shortMore: 'I flew {k} times. Count the walls again.' },
      { name: 'three-cornered field', h: 'This is the last field. Count the walls, then type that number in the for line.', sign: 'Turn: left(120)', walls: 3, turn: 120, help1: 'Count the dark walls, one by one.', ok: 'She is not in this field either. She is further up.', shortMore: 'I flew {k} times. Count the walls again.' }
    ],
    card: ['for i in range(?):', '    forward(100)', '    left({a})'], gauge: 'Daylight left before the sky goes dark',
    j: { short1: 'I flew {k} times. Count the walls.', over: 'That is {k} flights for {w} walls. That is too many. Type the number of walls in the brackets.', noNum: 'range needs a number in its brackets. Count the walls.',
      wrongTurn: 'The sign says left({a}). Use the turn on the sign.', wrongLen: 'Each wall is 100 metres. Use forward(100).', noTurn: 'Your loop has no turn. The sign says left({a}). Add it as a pushed-in line.' },
    fail: ['It is too dark to see the walls. I am winding time back.'],
    close: [
      { h: 'The number in the brackets is how many times the loop runs.', under: ['You counted 4, 6 and 3 walls. The loop flew 4 times, then 6 times, then 3 times.'] },
      { h: 'A loop that runs one time too few has a name: off by one.', labels: [['for i in range({k}):', '{k} flights for {w} walls. One wall stayed dark.']], box: 'Off by one means the number was one too small or one too big. Then the loop runs one time too few or one time too many.' },
      { q: 'A field has 5 walls. Which line lights them all?', opts: [['for i in range(5):', 'Yes. 5 walls need 5 flights.', true], ['for i in range(4):', 'That is one too few. One wall stays dark. This bug is called off by one.', false], ['for i in range(6):', 'That is one too many. BEEP flies the first wall twice.', false]] }
    ] };
  /* CHAPTER 3: THE SPIRAL */
  S.ch3 = { kicker: 'THE SPIRAL', film: ['Beyond the top wall the field is open, and her bleat is fading.', 'I cannot search a whole field one wall at a time.', 'Watch me count. Then make my flight grow.'],
    h1: 'Type these 2 lines. Each time round, BEEP will say the number in i.', lines1: ['for i in range(3):', '    say(i)'],
    j1: { forOk: 'The loop goes round 3 times. Now type the pushed-in line.', sayOk: 'say(i) says the count. Press Fly it.', say3: 'say(3) says 3 every time round. Type say(i), so it says the count.',
      sayNoBr: 'say needs brackets round the i: say(i)', sayNoIndent: 'Put 4 spaces before say, so it is inside the loop.', forN: 'The card says range({w}). Type that first.', changeOk: 'range(5) means 5 times. Press Fly it.' },
    held1: 'BEEP said 0, 1, 2. The count starts at 0.', change: 'Change the 3 to 5 and press Fly it again.', held2: 'range(5) gave 5 counts: 0, 1, 2, 3 and 4. BEEP never says 5.',
    h2: 'Fly a spiral that grows bigger. Use i in the forward line, so each flight is longer than the last.', card2: ['for i in range(10):', '    forward(i * 10)', '    left(90)'], gauge: 'Time left before her bleat fades',
    j2: { found: 'You found her!', found10i: '10 * i is the same as i * 10. You found her!', fwd10: 'forward(10) flies 10 metres every time round, so the spiral never grows. Put i in the brackets.',
      fwdI: 'forward(i) grows by only 1 metre each time round. This is too slow. Try forward(i * 10).', shortRange: 'Going round {k} times only reached {m} metres. She is further out. Use range(10).',
      longRange: 'You found her when i was 9. After that, the loop went round {k} more times. Use range(10) to stop there.', noTurn: 'Your loop has no turn, so it is not a spiral. Add left(90).', right90: 'right(90) spirals the other way round. You found her!' },
    help1: 'i is 0, then 1, then 2. i * 10 is 0, 10, 20.',
    fail: ['Her bleat has faded away. I am winding time back.', 'Try again from the middle of the field.'],
    foundHer: 'You found her.', held3: 'When i was 0, BEEP flew 0 metres. When i was 9, BEEP flew 90 metres.',
    close: [
      { h: 'i is the count. It starts at 0 and changes every time round.', under: ['The loop went round ten times. i went from 0 to 9. The flight grew with it.'] },
      { h: 'You used the count inside the loop.', labels: [['for i in range(10):', 'The loop goes round 10 times. i goes 0, 1, 2, up to 9.'], ['    forward(i * 10)', 'i * 10 is 0, then 10, then 20, then 90 at the end.'], ['    left(90)', 'A quarter turn each time round makes the spiral.']], box: 'i is a variable, a box with a name on it. The loop puts a new number in it each time round.' },
      { q: 'BEEP runs a loop with two lines. The first line is for i in range(4): The second line is say(i). What does BEEP say?', opts: [['0 1 2 3', 'Yes. There are four counts, and they start at 0.', true], ['1 2 3 4', 'The count starts at 0, not 1.', false], ['0 1 2 3 4', 'range(4) is four counts, so it stops after 3.', false]] }
    ] };
  /* CHAPTER 4: THE WAY HOME */
  S.ch4 = { kicker: 'THE WAY HOME', film: ['The lamb walks under BEEP\'s light. Nuala and her dog Bran are coming up the lane.', 'BEEP\'s battery is low. BEEP has three flights left.',
      'Nuala: Dad wrote programs for the drone last spring. They are on its screen.', 'Each program has a bug, a mistake. Read it before you run it, then fix one word.'],
    read: 'Read it. What will this fly?', fix: 'Fix one word, then press Run.', fixFirst: 'Replace the first line with a for line that has range and a number. Then press Run.', name: 'Name the bug.', runSee: 'Run it and see.',
    bugs: { off: 'Off by one', turn: 'Wrong turn', never: 'Never stops' },
    p: [
      { above: 'The lane has 6 gates.', lines: ['for i in range(5):', '    forward(100)', '    look()'], predict: ['Lights all 6 gates', 'Lights 5 gates, one stays dark', 'Never stops'],
        held: 'BEEP flew 5 times for 6 gates. The last gate is dark.', fixedHeld: 'BEEP flew 6 times for 6 gates. Nuala is through the last gate.',
        wrong: { over: 'That is {k} flights for 6 gates. That is one flight too many.', len: 'Each gate is 100 metres on. Keep forward(100).', still: 'BEEP flew {k} times for 6 gates. The last gate is still dark.' },
        bug: 'off', nameFb: { off: 'Yes. This is off by one. There are 5 flights for 6 gates.', turn: 'There is no turn in this loop.', never: 'The loop did stop, after 5 flights. The bug is the count.' } },
      { above: 'The yard has 4 walls, with a left turn at each corner.', lines: ['for i in range(4):', '    forward(100)', '    left(80)'], predict: ['Lights the 4 walls and closes the square', 'Drifts off the walls', 'Never stops'],
        held: 'BEEP turned left(80) four times. The square did not close.', fixedHeld: 'BEEP turned left(90) four times. The yard is lit.',
        wrong: { turn: 'BEEP turned left({a}) four times. The square did not close.', count: 'BEEP flew {k} times with left(80). The square still did not close.' },
        bug: 'turn', nameFb: { turn: 'Yes. A turn of 80 does not make a square corner. A turn of 90 does.', off: 'The yard has 4 walls and BEEP flew 4 times. The count was right.', never: 'The loop did stop, after 4 flights. The bug is the turn.' } },
      { above: 'The barn is 60 metres further on. BEEP\'s battery has one flight left.', lines: ['while True:', '    forward(10)', '    look()'], predict: ['Lights the way to the barn and stops', 'Never stops', 'Stops short of the barn'],
        held: 'There is no count, so the loop has no end. It never stops.', fixedHeld: 'BEEP flew 6 steps and stopped. The barn door is open.', gauge: 'Battery power left',
        wrong: { big: 'range({k}) flies {k} steps of 10 metres. The barn is 6 steps on.', whileAgain: 'while True has no count. Use for and range.', noColon: 'The for line needs a colon at the end.', short: 'range({k}) is {k} steps. The barn is 6 steps on.' },
        fail: ['The program never stopped, so the battery ran out. I am winding time back.', 'Try again from the start of the lane.'],
        bug: 'never', nameFb: { never: 'Yes. while True has no count, so the loop has no end.', off: 'No. This loop has no count, so it cannot be off by one.', turn: 'There is no turn in this loop.' } }
    ],
    close: [
      { h: 'A loop bug has a name.', under: ['Off by one means the count is 5 but there are 6 gates. Wrong turn means you turned 80 instead of 90. Never stops means while True has no end.'] },
      { h: 'Read the loop before you run it.', labels: [['range(5) for 6 gates', 'Off by one. The count is one short, or one over.'], ['left(80) for a square', 'Wrong turn. The turn does not match the shape.'], ['while True:', 'Never stops. The loop has no count, so it has no end.']], box: 'Before you press Run, check three things. Check the count. Check the turn. Check that the loop has an end.' },
      { q: 'This loop should light 10 gates: for i in range(9). What is the bug?', opts: [['Off by one', 'Yes. The loop goes round 9 times, but there are 10 gates.', true], ['Wrong turn', 'There is no turn in this loop.', false], ['Never stops', 'range(9) stops after 9 times round.', false]] }
    ] };
  /* THE CLOSE */
  S.close = { kicker: 'HOME',
    barn: ['The lamb is in the barn, and her mother is with her.', 'Nuala: Thank you. Thank you. Thank you.', 'You typed {n} lines. I did {m} things.', 'A loop lets a few lines make BEEP do many things.'],
    nameH: 'Nuala: Dad says the person who found her gets to name her. That person is you. Type her name in the box.', nameUnder: '', nameEmpty: 'Type a name for the lamb first.',
    badges: [['The Tracks', 'You flew the first loop.'], ['The Spiral', 'You used i in the flight.'], ['The Way Home', 'You named three bugs.']], badgeKicker: 'BADGE EARNED',
    recapH: 'What you did today.', recapH2: 'What you did today, part two.', recap: ['A loop runs its pushed-in lines once each time round. range sets how many.', 'The number in the brackets sets how many times the loop runs. If it is one too small, the bug is called off by one.',
      'i is the count. It starts at 0 and changes every time round. The loop can use it.', 'A loop bug has a name: off by one, wrong turn, never stops.'],
    last5H: 'BEEP\'s last 5 questions',
    feltH: 'How sure are you about each of these?', felt: ['I can write a loop with for and range.', 'I can use i inside the loop.', 'I can name a loop bug when I see one.'],
    feltDone: 'You have finished. Free flight is next if there is time.',
    freeH: 'Free flight. Click one of the three examples, or type your own loop. Then press Run. BEEP draws it in light.', freeStarters: [['A star', ['for i in range(5):', '    forward(80)', '    right(144)']], ['A growing spiral', ['for i in range(12):', '    forward(i * 8)', '    left(90)']], ['A hexagon', ['for i in range(6):', '    forward(60)', '    left(60)']]],
    freeNotRun: 'BEEP cannot fly that. Type a for loop, or press one of the three examples.',
    finished: 'The Search is finished. Your place is saved.' };
  window.SearchStrings = S;
})();
