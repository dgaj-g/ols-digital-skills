/* Teach It To See · J3 Lesson 7 · EVERY user-facing string. {curly} words are filled in by the page.
   Rules these obey: full sentences; no sentence over 14 words; plain classroom words; every screen has a job line and a Stuck? Show me help of two or three short steps; 25 prose words a screen at most. */
(function (g) {
  g.SeeStrings = {
    title: 'Teach It To See',
    jobLead: 'Your job now: ',
    chips: ['Do now', '1 · Teach it', '2 · Fool it', '3 · Sure and wrong', '4 · Your card', 'More to try', 'End questions'],
    helpBtn: 'Stuck? Show me', helpBack: 'Got it', helpHow: 'Do this',
    tagDraw: 'Draw here', tagPress: 'Press this', tagChoose: 'Choose one', tagWatch: 'Like this', tagBar: 'Watch this bar', helpStuck: 'Still stuck? Ask the person beside you. Then put your hand up.',
    endBtn: 'Go to the end questions', endDone: 'See your result',
    rub: 'Rub it out', next: 'Next', start: 'Start',
    thinks: 'What your computer thinks', drawSomething: 'Draw something.', waitPress: 'It answers when you press the yellow button.', waitDraw: 'It answers when the stranger finishes.', itThinks: 'It thinks: {n}', howSure: 'It is {pc} % sure.', notVery: 'That is not very sure.',
    learned: 'What it has learned', learnedSay: 'These are its drawings, laid on top of each other.', idea: 'All its drawings of {a}',
    yours: 'Your {pl}: {c}', has: 'The {pl} it has: {c}',
    keep: 'Keep this {n}', finished: 'I have finished my {n}',
    said: 'Your computer said {g}.', right: 'Right.', wrong: 'Wrong. It was {a}.',
    tooSmall: 'Draw a bit more first.',

    quiz: { right: 'Right.', wrong: 'Not that one. The green one is right.', nextQ: 'Next question', count: 'Question {i} of {of}' },
    donow: { job: 'Answer five questions from earlier lessons.', help: ['Read the question at the top.', 'Press the answer you think is right.', 'A wrong one costs nothing.'], done: 'Go to today\'s lesson' },

    about: {
      job: 'Draw anything in the white box.',
      help: ['Press and hold in the white box. Move to draw.', 'The button turns yellow. Press it.'],
      noIdea: 'No idea.',
      lines: ['It knows nothing yet.', 'Today you teach it.'],
      go: 'Start teaching it'
    },

    teach: {
      job: 'Draw {a} in the white box. This is {n} {i} of {of}.',
      help: ['Press and hold in the white box. Move to draw.', 'Rough is fine. Press the yellow button.', 'Do this {of} times.'],
      testJob: 'Draw {a}. Will it know? This is test {i} of {of}.',
      testHelp: ['Draw it in the white box.', 'Press the yellow button.', 'Read what your computer thinks.'],
      nextTest: 'Next test',
      sumJob: 'Read its score.',
      sumHelp: ['The big line is its score.', 'The blurred pictures are your drawings, stacked.', 'Press the yellow button.'],
      sum: 'Your computer got {r} of {of} right.',
      sumLines: ['Nobody told it what a sun looks like.', 'It compares your drawing with these.'],
      go: 'Go to Part 2'
    },

    fool: {
      whoJob: 'Choose who draws next.',
      whoHelp: ['Someone beside you? Press the first button.', 'Nobody beside you? Press the second button.'],
      whoLines: ['It has only seen your drawings.', 'Will it know another person\'s sun?'],
      whoN: 'The person beside me will draw', whoS: 'Nobody is beside me',
      nJob: 'Swap seats. The person beside you draws {a}. This is drawing {i} of {of}.',
      nHelp: ['Swap seats with the person beside you.', 'They draw it in the white box.', 'They press the yellow button.'],
      sJob: 'Watch a stranger draw {a}. This is drawing {i} of {of}.',
      sHelp: ['Watch the stranger draw.', 'See what your computer says when the stranger finishes.', 'Press the yellow button.'],
      nextD: 'Next drawing',
      s1Job: 'Read its score.',
      s1Help: ['Look at each drawing: tick or cross?', 'A cross means it was wrong.', 'Press the yellow button.'],
      s1: 'It got {r} of {of} right.',
      s1Bad: ['It only knows the way you draw.', 'Other people draw {pl} differently.'],
      s1Good: ['It got them all. Their drawings were like yours.', 'It will not always be lucky.'],
      learn: 'Teach it these six drawings',
      s2Job: 'Read the two scores.',
      s2Help: ['The first score is before you taught it.', 'The second score is after.', 'Press the yellow button.'],
      s2: 'Before: {p1} % right. After: {p2} % right.', learned: 'It has learned those six drawings. These four are new.',
      s2Up: ['It got better.', 'It now has drawings from two people.'],
      s2Same: ['It still gets some wrong.', 'It needs many more drawings, from many more people.'],
      go: 'Go to Part 3'
    },

    sure: {
      catJob: 'Draw a cat. It has never seen one.', catDoneJob: 'Read what your computer called your cat.',
      catHelp: ['Draw a cat\'s face in the white box.', 'Press the yellow button.', 'See what your computer calls it.'],
      anyJob: 'Draw anything but a sun or a fish.', anyDoneJob: 'Read what your computer called your drawing.',
      anyHelp: ['Draw a house, a face or a tree.', 'Press the yellow button.'],
      finCat: 'I have finished my cat', finAny: 'I have finished my drawing',
      saidCat: 'Your computer said {g}. It was {pc} % sure.',
      catLines: ['It has only two answers.', 'It cannot say: I do not know.'],
      anyLines: ['It is wrong again.', 'It can be very sure and still wrong.'], anyLow: ['It is wrong again. It was not very sure.', 'It still gave an answer.'],
      catLow: ['It has only two answers.', 'It was not very sure. It still answered.'],
      nextAny: 'Draw one more thing', toLine: 'Next',
      lineJob: 'Press a number to choose when a person checks.',
      lineHelp: ['Press 60 %. Then press 95 %.', 'Watch how many drawings a person checks.', 'Keep the one you like.'],
      lineLines: [],
      linePick: 'A person checks when it is under:',
      lineNone: 'Press a number to set the line.',
      lineChecks: 'A person checks {n} of {of} drawings.', linePast: '{n} wrong answers get past with no check.', linePast1: '1 wrong answer gets past with no check.', linePast0: 'No wrong answer gets past.',
      lineTrade: 'A high line catches more mistakes but makes more work.',
      lineKeep: 'Keep this line',
      legendChk: 'A person checks this one', legendBad: 'Wrong, and nobody checks'
    },

    card: {
      job: 'Name it. Then choose its weak spot.',
      help: ['Type a name, or press one.', 'Press a weak spot. All three are true.', 'Press the yellow button.'],
      head: 'Model card', nameLabel: 'Its name', namePh: 'Type a name', names: ['Doodle', 'Blink', 'Squiggle', 'Peeper'],
      taught: 'Taught with {s} suns and {f} fish by two people.',
      tested: 'It got {r} of {of} test drawings right.',
      line: 'A person checks under {l} % sure.',
      gapLabel: 'Its weak spot', gaps: ['It only knows two things.', 'It can be very sure and still wrong.', 'It learned from only two people.'],
      keep: 'Keep my card',
      keptJob: 'Read your card.',
      keptHelp: ['Look at your card. It is saved.', 'Press the yellow button.'],
      keptLines: ['The main lesson is done. Well done.', 'Your card is kept for Lessons 8 and 9.'],
      go: 'See more to try'
    },

    menu: {
      job: 'Choose any activity.',
      help: ['Press any activity.', 'Stop any time: press Go to the end questions.'],
      mins: 'About {m} minutes', done: 'Done', stretch: 'Harder', back: 'Back to the activities',
      tiles: [
        { id: 'third', t: 'A third thing', d: 'Teach it a star. Does it still know a sun?', m: 4 },
        { id: 'speed', t: 'The speed round', d: 'Ninety seconds. How many can it get right?', m: 3 },
        { id: 'half', t: 'Half and half', d: 'Draw one picture it cannot decide on.', m: 4 },
        { id: 'bad', t: 'The bad teacher', d: 'Teach a new one badly, on purpose. See what it learns.', m: 6, s: 1 },
        { id: 'own', t: 'Your own two things', d: 'You choose what it learns.', m: 6 }
      ]
    },

    third: {
      job: 'Draw a star in the white box. This is star {i} of {of}.',
      help: ['Draw a star in the white box.', 'Press the yellow button.', 'Do this five times.'],
      testJob: 'Draw {a}. Does it know all three? This is test {i} of {of}.',
      testHelp: ['Draw it in the white box.', 'Press the yellow button.'],
      sumJob: 'Read its score.',
      sumHelp: ['The big line is its score.', 'Press Back to the activities.'],
      sum: 'It got {r} of {of} right.', sumLines: ['With three answers there are more ways to be wrong.']
    },
    speed: {
      readyJob: 'Press Start. You have ninety seconds.', readyHelp: ['Press Start.', 'Draw each thing fast.', 'You score when your computer knows it.'],
      readyLines: ['Draw what you are told, fast.', 'You score when your computer knows it.'],
      job: 'Draw {a}. Fast.', help: ['Draw it in the white box, fast.', 'Press Got it to start the clock again.'],
      skip: 'Skip this one', left: '{s} seconds left', score: 'Drawings right so far: {n}',
      endJob: 'Read your score. Play again or go back.', endHelp: ['Press Play again to beat your best.', 'Or press Back to the activities.'],
      end: 'Time. Your computer got {n} right.', best: 'Your best is {n} right.', again: 'Play again'
    },
    half: {
      job: 'Draw one picture it calls half sun, half fish.', help: ['Try a sun with a fish tail.', 'Watch the bar. Aim for the middle.', 'Press the yellow button.'],
      aim: 'Get it between 45 % and 55 % sure.', keep: 'Keep this picture', kept: 'Pictures it could not decide on: {n}',
      lines: ['It cannot decide. This picture is like both.', 'A person would know at once what you drew.']
    },
    bad: {
      introJob: 'Read the plan.', introHelp: ['Read the two lines.', 'Press Start. Your own computer is not changed.'],
      introLines: ['Teach a new computer badly, on purpose.', 'Every sun goes in the top box.', 'Every fish goes in the bottom box.'],
      job: 'Draw {a} inside the dotted box. This is {n} {i} of {of}.', help: ['Draw inside the dotted box.', 'Press the yellow button.'],
      out: 'Keep your drawing inside the dotted box.',
      trickJob: 'Now draw {a} inside the dotted box.', trickHelp: ['The box has moved. Draw inside it.', 'Press the yellow button.'],
      lines: ['You taught it where, not what.', 'It learned the wrong clue from your drawings.', 'Real AI does this too.'],
      endJob: 'Read what went wrong.', endHelp: ['Look where your fish is: the top box.', 'Every sun it was given was up there.', 'Press Back to the activities.']
    },
    own: {
      pickJob: 'Choose the two things your computer will learn.', pickHelp: ['Press a pair, or type two words.', 'Press Start.'],
      a: 'First thing', b: 'Second thing', pairs: [['cat', 'dog'], ['tree', 'house'], ['happy face', 'sad face'], ['car', 'boat']],
      job: 'Draw: {n}. This is drawing {i} of {of}.', help: ['Draw it in the white box.', 'Press the yellow button.', 'Do this five times.'],
      keep: 'Keep this drawing', count: '{n}: {c} drawings',
      testJob: 'Draw either thing. See if your computer knows which.', testHelp: ['Draw one of your two things.', 'Was it wrong? Press what it really was.', 'It learns from that.'],
      another: 'Try another drawing', was: 'It was: {n}. Learn it.'
    },

    end: {
      job: 'Answer five questions about today.', help: ['Read the question at the top.', 'Press the answer you think is right.'],
      qs: [
        { stem: 'Nobody told your computer what a sun is. How does it know one?', options: ['It compares your new drawing with the drawings it was given', 'Someone typed in the rules for a sun', 'It looks up the word sun on the internet', 'It understands what the sun is'], explain: ['Yes. It compares a new drawing with the examples you gave it.', 'Nobody typed any rules. It only had your drawings.', 'It never used the internet. It only had your drawings.', 'It does not understand the sun. It only compares drawings.'] },
        { stem: 'Your computer knew your drawings but got another person\'s wrong. Why?', options: ['It had only learned from the way one person draws', 'The other person drew too slowly', 'It had forgotten your drawings by then', 'The other person used a different mouse'], explain: ['Yes. It had only seen the way you draw.', 'Speed does not matter. It only looks at the finished drawing.', 'It still had your drawings. It had never seen how other people draw.', 'The mouse does not matter. The way a person draws does.'] },
        { stem: 'You drew a cat. Your computer named it, and it was very sure. What does that show?', options: ['A computer can be very sure and still be wrong', 'It had seen lots of cats before', 'It knew it was a cat but did not say', 'When it is very sure it is always right'], explain: ['Yes. It only knew suns and fish, so it picked one of them.', 'It had never seen a cat. You only taught it suns and fish.', 'It could not know a cat. Nobody gave it a cat.', 'It was very sure about the cat, and it was wrong.'] },
        { stem: 'What made your computer better at another person\'s drawings?', options: ['Giving it more examples, drawn by more people', 'Drawing the same sun again, more slowly', 'Giving it fewer drawings to remember', 'Telling it to try harder'], explain: ['Yes. More examples from more people showed it more ways to draw.', 'The same drawing again teaches it nothing new.', 'Fewer drawings teach it less. More drawings helped it.', 'It cannot try harder. It only compares drawings.'] },
        { stem: 'A hospital uses a computer like yours to read X-rays. When should a person check its answer?', options: ['When the computer is not very sure of its answer', 'Never, because computers do not make mistakes', 'Only when the X-ray is very clear', 'Only on the first day it is used'], explain: ['Yes. When it is not very sure, a person should look.', 'Computers do make mistakes. Yours called a cat a sun or a fish.', 'How clear the X-ray is does not matter. A person should check when the computer is not very sure.', 'It can be wrong on any day, not only the first.'] }
      ],
      toFelt: 'Next',
      feltJob: 'Say how today went for you.', feltHelp: ['Press one answer on each line.', 'Press Finish.'],
      felt: ['I can teach a computer with examples.', 'I can say why it gets some drawings wrong.', 'I can say when a person should check its answer.'], feltOpts: ['Not yet', 'Nearly', 'Yes'],
      finish: 'Finish',
      doneJob: 'To draw more, press {b}.', doneHelp: ['You are done. Everything is saved.', 'Want to draw more? Press the button.'],
      doneLines: ['You have finished. Well done.', 'Everything you made is saved.'], score: 'End questions: {r} of {of} right.',
      backX: 'Back to the activities', backC: 'Back to where I was'
    },

    /* For the teacher brief (not shown to pupils). */
    teacher: { stop: 'Press Go to the end questions now.' }
  };
})(typeof window !== 'undefined' ? window : module.exports);
