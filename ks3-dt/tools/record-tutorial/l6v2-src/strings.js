/* J1 L6 THE CONTEST — every pupil-facing string (rule 138: full sentences, ≤12 words, plain classroom words).
   This file is the string source of record (J1_L6_SPEC_V2.md §5 lists the same lines). The build copies it, never retypes.
   {x} are filled in by the page. Callsigns: Dr Marmalade (A), Dr Custard (B), Dr Pickle (C). Bernadette = the patient. */
(function (root) {
  var S = {
    callsigns: { A: 'Dr Marmalade', B: 'Dr Custard', C: 'Dr Pickle', Z: 'Bernadette' },
    top: {
      begin: 'The contest · Against {partner}',
      round: 'Round {n} of 4 · {roundName} · Question {k} of {total} · Against {partner}',
      roundIntro: 'Round {n} of 4 · {roundName} · Against {partner}',
      film: "Round 3 of 4 · Inside Bernadette's head · The film · Against {partner}",
      job: 'Extra jobs · {job} · On your own',
      result: 'The result · Against {partner}',
      hub: 'Extra jobs · On your own',
      you: 'You are {me}'
    },
    bottom: {
      begin: 'Read the card, then press Start round 1.',
      intro: 'Read the card, then press the button.',
      pickPart: 'Click the part this computer needs.',
      pickOne: 'Click the right answer.',
      order: 'Move the four steps into the right order, then press Lock in.',
      locked: 'Your answer is locked in. Wait for the other answer.',
      next: 'Read the answers, then press {btn}.',
      film: 'Watch the film. It is short and has no sound.',
      filmSeen: 'Press On to the questions. Or watch it again first.',
      result: 'Read the result, then press Continue.',
      hub: 'Click a job to start it. Each job has a Back to the extra jobs button at the top.',
      job: 'To leave this job, click Back to the extra jobs at the top.'
    },
    begin: {
      kicker: 'You worked with your partner. Now you play against them.',
      soloKicker: 'On your own · Against Bernadette',
      title: 'The contest',
      lines: ['You and {partner} fixed Bernadette together.', 'Now you play against each other, in four rounds.', 'The same question comes up on both screens.', 'Answer on your own. Nobody sees your answer yet.', 'When you and your partner have answered, each screen shows the two answers.', 'One point for each right answer.', 'Whoever has the most points at the end is head surgeon.'],
      solo: ['You fixed Bernadette on your own.', 'Bernadette is awake now. She wants to play against you.', 'You play four rounds. You and Bernadette get the same question each time.', 'You answer first. Then Bernadette answers.', 'One point for each right answer.', 'Whoever has the most points at the end is head surgeon.'],
      team: ['You and {name} share this PC as one team.', 'You play against Bernadette, in four rounds.', 'Agree each answer together, then click it.', 'One point for each right answer.'],
      button: 'Start round 1'
    },
    rounds: [
      { kicker: 'Round 1 of 4 · Against {partner}', title: 'Ward round', lines: ['Six more computers are broken.', 'Each one tells you what is wrong, in its own words.', 'Click the part it needs from the tray of seven photos.', 'One point for each computer you get right.'], button: 'See the first computer' },
      { kicker: 'Round 2 of 4 · Against {partner}', title: 'Who is in charge?', lines: ['Bernadette has seven parts. None of them is in charge.', 'One program tells them all what to do.', 'It is called the operating system.', 'Windows, ChromeOS, iPadOS and Android are operating systems.', 'There are three questions. The easy ones come first.'], button: 'First question' },
      { kicker: 'Round 3 of 4 · Against {partner}', title: "Inside Bernadette's head", lines: ['Watch Bernadette add 4 and 3.', 'The film shows memory and the processor passing the work between them.', 'Then you answer two questions and put four steps in order.'], button: 'Play the film', again: 'Watch it again', go: 'On to the questions' },
      { kicker: 'Round 4 of 4 · Against {partner}', title: 'The real names', lines: ['You know what each part does.', 'The box of a new PC does not say "the thinking part".', 'It uses the real names. There are five questions.'], button: 'First question' }
    ],
    film: ['Bernadette wants to add 4 and 3.', 'Memory holds the instruction: add 4 and 3.', 'The processor reads the instruction from memory.', 'The processor does it. 4 + 3 = 7.', 'The answer, 7, goes back into memory.', 'Then the processor reads the next instruction. Then it reads the one after that.', 'Every computer works like this. It does these steps millions of times every second.'],
    filmBoard: { think: '4 + 3 = ?', mem: 'MEMORY', cpu: 'PROCESSOR', waiting: ['add 7 and 2', 'take 1 from 9', 'add 5 and 5'], current: 'add 4 and 3' },
    q: {
      says: '{patient} says:',
      tray: 'These seven photos are the tray. Click the part this computer needs.', trayLocked: 'These seven photos are the tray. Your answer is locked in.',
      orderLock: 'Lock in this order',
      up: 'Move up', down: 'Move down'
    },
    wait: {
      partner: 'You picked {mine}. Wait for {partner} to answer.',
      order: 'Your order is locked in. Wait for {partner}.',
      behind: '{partner} has not reached this question yet.',
      bernadette: 'Bernadette is thinking.',
      gone: "{partner}'s PC has lost its link to yours. Bernadette answers for {partner} until the link is back.",
      late: '{partner} took too long to answer. Bernadette answered instead.',
      back: "{partner}'s PC is linked to yours again.",
      partnerAnswered: '{partner} has answered this one.'
    },
    rev: {
      rightMe: 'You were right.', wrongMe: 'You were not right.',
      partnerRight: '{partner} was right.', partnerWrong: '{partner} was not right.',
      bothRight: 'You were both right. You each get a point.',
      allRight: 'All three of you were right. You each get a point.',
      chipRight: 'Right', chipWrong: 'Not right',
      answer: 'The answer: {right}.',
      orderRight: 'Your order was right.', orderWrong: 'Your order was not right.',
      standInForMe: "Your PC lost its link to your partner's PC for a moment. Bernadette answered this question for you.",
      standInLate: 'Bernadette answered this question for you because you took too long.',
      next: 'Next', nextRound: 'On to round {n}', toResult: 'See the result'
    },
    score: {
      head: 'Points so far',
      legendRight: 'right', legendWrong: 'not right', legendHidden: 'answered, but the answer is hidden for now',
      me: '(you)',
      answered: '{partner} has answered.',
      thinking: '{partner} is still on this question.',
      behind: '{partner} is on question {k} of round {r}.',
      gone: "{partner}'s PC has lost its link to yours.",
      solo: 'Bernadette answers after you.',
      ahead: '{partner} is on the next question and is waiting for you.'
    },
    result: {
      winMe: 'You are head surgeon. You scored {a} points. Your partner scored {b}.',
      winThem: '{winner} is head surgeon. {winner} scored {a} points. You scored {b}.',
      draw: 'It is a draw. You each have {a} points. You are both head surgeons.',
      trio: '{winner} is head surgeon with {a} points. {second} has {b} points. {third} has {c} points.',
      soloWin: 'You beat Bernadette. You scored {a} points. She scored {b}.',
      soloLose: 'Bernadette won. She scored {b} points. You scored {a}.',
      soloDraw: 'It is a draw with Bernadette. You each have {a} points.',
      reveal: '{partner} was {name}.',
      revealSolo: 'You played on your own today.',
      roundCol: 'Round',
      button: 'Continue'
    },
    hub: {
      kicker: 'On your own · Extra jobs',
      title: 'Six extra jobs. Do any, in any order.',
      intro: 'Leave a job at any moment with the Back button at the top. The lesson stops when your teacher says STOP.',
      jobs: [
        { id: 'desmond', title: 'Operate on Desmond', whiff: 'Desmond is a second patient. You take out all seven parts by yourself.' },
        { id: 'nigel', title: 'Operate on Nigel', whiff: 'Nigel is a third patient. He talks more than the other patients.' },
        { id: 'find', title: 'Find the parts in a real PC', whiff: 'You see a photo of an open PC. A line names one part. Click that part in the photo.' },
        { id: 'customers', title: 'The right part for three customers', whiff: 'Three customers in a computer shop say what their PC needs. Click the part to add to each PC.' },
        { id: 'own', title: 'Your own PC', whiff: 'You see three facts about the PC you are sitting at.' },
        { id: 'letter', title: 'The discharge letter', whiff: "This is Bernadette's letter home. It lists what you did today." }
      ],
      finish: 'Finish the lesson',
      finished: 'Next is the exit check. It is four questions. You answer them on your own.',
      back: 'Back to the extra jobs',
      done: 'Job done',
      stub: 'This job is not ready yet. Click Back to the extra jobs at the top.'
    },
    find: { ask: 'Click the {part}.', right: 'Yes. That is the {part}.', wrong: 'That is not the part the line names. Try again.', done: 'You found all seven.' },
    cust: {
      ask: "{customer} says: '{need}' Which part should the computer shop add?",
      people: [
        { who: 'Aoife', need: 'I edit videos and the picture on my screen keeps jumping.', right: 'gpu', why: 'The graphics card draws the picture. A better one keeps video smooth.' },
        { who: 'Mr Doyle', need: 'I keep thousands of photos and I have no room left.', right: 'drive', why: 'Photos live on the storage drive. A bigger one holds more.' },
        { who: 'Sam', need: 'When I have lots of things open, my computer slows right down.', right: 'mem', why: 'Memory holds everything that is open right now. With more memory, the computer has more room.' }
      ],
      right: 'Yes. {why}', wrong: 'That is not the right part. Read what the customer says again.', done: 'You have helped all three customers.', next: 'Next customer'
    },
    exit: [
      { id: 'l6-x1', ask: 'Which part holds what the computer is working on right now?', opts: ['memory', 'storage drive', 'processor', 'fan'] },
      { id: 'l6-x2', ask: 'Which part keeps your files when the power is off?', opts: ['storage drive', 'memory', 'graphics card', 'power supply'] },
      { id: 'l6-x4', ask: 'Which part do all the other parts plug into?', opts: ['motherboard', 'fan', 'processor', 'screen'] },
      { id: 'l6-x5', ask: 'The processor has finished one step of a sum. Where does the answer go?', opts: ['back into memory', 'to the fan', 'to the power supply', 'it is lost'] }
    ],
    fixes: {
      doorInside: 'Inside {him} are seven parts. Each part does one job. One thing inside {him} is not a part.',
      fluffMe: 'That was fluff, not a part. Dust stops the fan from cooling the PC.',
      fluffThem: '{partner} cleaned out the fluff.',
      fluffTile: 'Cleaned',
      fallbackMe: "This PC cannot link to your partner's PC. Your partner is {name}.",
      fallbackSit: 'Sit together at one of your two PCs. You play as a team.',
      fallbackButton: 'We are together. Carry on',
      linkLost: "Your PC has lost its link to your partner's PC. Wait for the link to come back.",
      linkAlone: 'Carry on against Bernadette',
      opDone: 'Continue to the contest',
      ownCores: "This PC's processor can do {n} things at once.",
      ownMem: 'This PC has about {n} gigabytes (GB) of memory. GB is how memory is measured. More GB means more room.',
      ownScreen: "This PC's screen is {w} by {h} dots.",
      ownUnknown: 'This PC does not say how much memory it has.',
      team: 'You are a team'
    },
    help: 'Answer on your own. When you and your partner have answered, each screen shows the two answers.',
    helpSolo: 'Answer on your own. When you click, Bernadette answers too. Then you see both answers.',
    helpTeam: 'Agree each answer together, then click it. Bernadette answers too. Then you see both answers.',
    helpMore: 'You get one point for each right answer. Whoever has the most points at the end is head surgeon.',
    helpClose: 'Close'
  };
  root.L6C_STRINGS = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
