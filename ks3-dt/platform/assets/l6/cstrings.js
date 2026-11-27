/* J1 L6 V2 THE CONTEST — every pupil-facing string of contest.html (Version 96).
   COPIED from the design's source of record (J1_L6_REDESIGN/prototype/strings.js = spec §5), never retyped. Under the
   26 Nov ruling (≤25 words a screen, ≤14 a sentence) some cards are TRIMMED: a trim keeps the source's own words in
   order and drops the rest; a dropped line moves into the help list of the same screen. The few lines that are not a
   plain trim are listed in REWRITES with the reason; tools/record-tutorial/l6-contest-test.js holds every string to
   that rule (a sentence is a word-for-word cut of a source sentence, or it is in REWRITES).
   The help layer's words (Stuck? Show me, Got it, Do this, Press this, Choose one, the still-stuck line) are the
   platform's own, copied from see/hour.html. {x} are filled in by the page. */
(function (root) {
  var S = {
    callsigns: { A: 'Dr Marmalade', B: 'Dr Custard', C: 'Dr Pickle', Z: 'Bernadette' },
    top: {
      begin: 'The contest · Against {partner}',
      round: 'Round {n} of 4 · {roundName} · Question {k} of {total} · Against {partner}',
      roundIntro: 'Round {n} of 4 · {roundName} · Against {partner}',
      film: "Round 3 of 4 · Inside Bernadette's head · The film · Against {partner}",
      result: 'The result · Against {partner}',
      you: 'You are {me}',
      team: 'You are a team',
      job: 'Extra jobs · {job} · On your own',
      hub: 'Extra jobs · On your own',
      solo: 'On your own · You are {me}',
      pair: 'With your partner · You are {me}'
    },
    /* the job line ("Your job now: …"), ≤14 words each */
    job: {
      begin: 'Read the card, then press Start round 1.',
      intro: 'Read the card, then press {btn}.',
      pickPart: 'Click the part this computer needs.',
      pickOne: 'Click the right answer.',
      order: 'Move the four steps into the right order, then press Lock in this order.',
      locked: 'Your answer is locked in. Wait for the other answer.',
      next: 'Read the answers, then press {btn}.',
      film: 'Watch the film. It is short and has no sound.',
      filmSeen: 'Press On to the questions. Or watch it again first.',
      result: 'Read the result, then press Continue.',
      notice: 'Read the card, then press {btn}.',
      away: 'Sit together at one of your two PCs.',
      hub: 'Click a job to start it.',
      job: 'To leave this job, click Back to the extra jobs at the top.'
    },
    begin: {
      kicker: 'You worked with your partner. Now you play against them.',
      soloKicker: 'On your own · Against Bernadette',
      teamKicker: 'You are a team · Against Bernadette',
      title: 'The contest',
      lines: ['Now you play against each other, in four rounds.', 'Answer on your own.', 'One point for each right answer.'],
      solo: ['Bernadette is awake now. She wants to play against you.', 'You answer first. Then Bernadette answers.', 'One point for each right answer.'],
      team: ['You and {name} share this PC as one team.', 'You play against Bernadette, in four rounds.', 'Agree each answer, then click it.'],
      button: 'Start round 1'
    },
    rounds: [
      { kicker: 'Round 1 of 4 · Against {partner}', title: 'Ward round', lines: ['Six more computers are broken.', 'Each one tells you what is wrong, in its own words.', 'Click the part it needs.'], button: 'See the first computer' },
      { kicker: 'Round 2 of 4 · Against {partner}', title: 'Who is in charge?', lines: ['Bernadette has seven parts.', 'One program tells them all what to do.', 'It is called the operating system.'], button: 'First question' },
      { kicker: 'Round 3 of 4 · Against {partner}', title: "Inside Bernadette's head", lines: ['Watch Bernadette add 4 and 3.', 'Then you answer two questions and put four steps in order.'], button: 'Play the film', again: 'Watch it again', go: 'On to the questions' },
      { kicker: 'Round 4 of 4 · Against {partner}', title: 'The real names', lines: ['The box of a new PC does not say "the thinking part".', 'It uses the real names. There are five questions.'], button: 'First question' }
    ],
    film: ['Bernadette wants to add 4 and 3.', 'Memory holds the instruction: add 4 and 3.', 'The processor reads the instruction from memory.', 'The processor does it. 4 + 3 = 7.', 'The answer, 7, goes back into memory.', 'Then the processor reads the next instruction. Then it reads the one after that.', 'Every computer works like this. It does these steps millions of times every second.'],
    filmBoard: { think: '4 + 3 = ?', mem: 'MEMORY', cpu: 'PROCESSOR', waiting: ['add 7 and 2', 'take 1 from 9', 'add 5 and 5'], current: 'add 4 and 3' },
    q: {
      says: '{patient} says:',
      orderLock: 'Lock in this order',
      up: 'Move up', down: 'Move down'
    },
    wait: {
      partner: 'Wait for {partner} to answer.',
      others: 'Wait for the others to answer.',
      behind: '{partner} has not reached this question yet.',
      bernadette: 'Bernadette is thinking.',
      gone: '{partner}\'s PC has sent nothing for 30 seconds. Bernadette answers for {partner} until it does.',
      late: '{partner} took too long. Bernadette answered instead.',
      back: "{partner}'s PC is linked to yours again.",
      partnerAnswered: '{partner} has answered this one.',
      linkLost: "Your PC has lost its link to your partner's PC. Wait for the link to come back."
    },
    rev: {
      kicker: 'Question {k} of {total} · The answer',
      you: 'You',
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
      title: 'The result',
      winMe: 'You are head surgeon. You scored {a} points. Your partner scored {b}.',
      winThem: '{winner} is head surgeon. {winner} scored {a} points. You scored {b}.',
      draw: 'It is a draw. You each have {a} points. You are both head surgeons.',
      trio: '{winner} is head surgeon with {a} points.',
      soloWin: 'You beat Bernadette. You scored {a} points. She scored {b}.',
      soloLose: 'Bernadette won. She scored {b} points. You scored {a}.',
      soloDraw: 'It is a draw with Bernadette. You each have {a} points.',
      reveal: '{partner} was {name}.',
      revealSolo: 'You played on your own today.',
      roundCol: 'Round',
      button: 'Continue'
    },
    fixes: {
      fallbackMe: "This PC cannot link to your partner's PC. Your partner is {name}.",
      fallbackSit: 'Sit together at one of your two PCs.', /* 'You play as a team.' moved to help.away: a first name with an accent (Bríd) counts as two words */
      fallbackButton: 'We are together. Carry on',
      linkAlone: 'Carry on against Bernadette',
      team: 'You are a team',
      /* the operation (operation.html) */
      fallbackPC: "This PC cannot link to your partner's PC.",
      fallbackGo: 'Go and sit with {name}.',
      doorInside: 'There are seven parts inside {him}. There is also one more thing in there that is not a part.', /* 'Each part does one job.' moved to help.door */
      fluffMe: 'That was fluff, not a part. Dust stops the fan from cooling the PC.',
      fluffThem: '{partner} cleaned out the fluff.',
      fluffTile: 'Cleaned',
      opDone: 'Continue to the contest',
      ownCores: "This PC's processor can do {n} things at once.",
      ownMem: 'This PC has about {n} gigabytes (GB) of memory.', /* 'GB is how memory is measured. More GB means more room.' moved to help.own */
      ownScreen: "This PC's screen is {w} by {h} dots.",
      ownUnknown: 'This PC does not say how much memory it has.'
    },
    /* THE EXTRA JOBS (the platform's hub card, then each job's own screen) */
    hub: {
      kicker: 'On your own · Extra jobs',
      title: 'Six extra jobs. Do any, in any order.',
      intro: 'The lesson stops when your teacher says STOP.', /* the leave-a-job line moved to help.hub */
      jobs: [
        { id: 'desmond', title: 'Operate on Desmond', whiff: 'Desmond is a second patient. You take out all seven parts by yourself.' },
        { id: 'nigel', title: 'Operate on Nigel', whiff: 'Nigel is a third patient. He talks more than the other patients.' },
        { id: 'find', title: 'Find the parts in a real PC', whiff: 'You see a photo of a PC with its case open. The screen shows the name of one part. Click that part in the photo.' },
        { id: 'customers', title: 'The right part for three customers', whiff: 'Three customers in a computer shop say what their PC needs. Click the part to add to each PC.' },
        { id: 'own', title: 'Your own PC', whiff: 'You see three facts about the PC you are sitting at.' },
        { id: 'letter', title: 'The discharge letter', whiff: "This is Bernadette's letter home. It lists what you did today." }
      ],
      finish: 'Finish the lesson',
      finished: 'Next is the exit check. It is four questions. You answer them on your own.',
      back: 'Back to the extra jobs',
      done: 'Job done'
    },
    find: { ask: 'Click the {part}.', right: 'Yes. That is the {part}.', wrong: 'That is not the part the line names. Try again.', done: 'You found all seven.' },
    cust: {
      says: '{customer} says:',
      question: 'Which part should the computer shop add?',
      people: [
        { who: 'Aoife', need: 'I edit videos and the picture on my screen keeps jumping.', right: 'gpu', why: 'The graphics card draws the picture. A better one keeps video smooth.' },
        { who: 'Mr Doyle', need: 'I keep thousands of photos and I have no room left.', right: 'drive', why: 'Photos live on the storage drive. A bigger one holds more.' },
        { who: 'Sam', need: 'When I have lots of things open, my computer slows right down.', right: 'mem', why: 'Memory holds everything that is open right now.', more: 'With more memory, the computer has more room.' }
      ],
      right: 'Yes. {why}', wrong: 'That is not the right part. Read what the customer says again.', done: 'You have helped all three customers.', next: 'Next customer'
    },
    /* the operation's own lines, cut from the live V1 lines2.js (frozen copy in tools/record-tutorial/l6v2-src) */
    op: { together: '{p} is your partner, at another PC in this room.', together3: '{p} and {q} are your partners, at other PCs in this room.', alone: 'You work on {me} on your own.', found: '{p} found {n} of the 7 jobs.' },
    parts: { mem: 'memory', drive: 'storage drive', cpu: 'processor', gpu: 'graphics card', fan: 'fan', psu: 'power supply', board: 'motherboard' },
    /* THE HELP LIST per screen ("Do this"): the screen's job line first, then the lines the trims moved off the card,
       then the mode's own help. Every line is a sentence of the source, cut down only. */
    help: {
      begin: ['The same question comes up on both screens.', 'Your partner cannot see your answer until you have both answered.', 'Whoever has the most points at the end is head surgeon.'],
      beginSolo: ['You play four rounds.', 'You and Bernadette get the same question each time.', 'Whoever has the most points at the end is head surgeon.'],
      beginTeam: ['Agree each answer together, then click it.', 'One point for each right answer.', 'Whoever has the most points at the end is head surgeon.'],
      rounds: [
        ['One point for each computer you get right.'],
        ['Windows, ChromeOS, iPadOS and Android are operating systems.', 'There are three questions. The easy ones come first.'],
        ['The film shows memory and the processor passing the work between them.'],
        ['You know what each part does.']
      ],
      pair: ['Answer on your own.', 'When you and your partner have answered, each screen shows the two answers.'],
      solo: ['Answer on your own.', 'When you click, Bernadette answers too. Then you see both answers.'],
      team: ['Agree each answer together, then click it.', 'Bernadette answers too. Then you see both answers.'],
      more: ['You get one point for each right answer.', 'Whoever has the most points at the end is head surgeon.'],
      away: ['Your partner is {name}.', 'You play as a team.', 'Press the button "We are together. Carry on".'],
      /* the operation and the extra jobs */
      door: ['Each part does one job.', 'Click a part to take it out.', 'Read what {me} says next.', 'Click the job that part did. It goes in {his} chart.'],
      doorPair: 'You work on {me} together.',
      opAway: ['Your partner is {name}.', 'Press the button "We are together. Carry on".'],
      hub: ['Click a job to start it.', 'You can leave a job at any time. Press "Back to the extra jobs" at the top.'],
      find: ['The screen shows the name of one part.', 'Click that part in the photo.'],
      cust: ['Read what the customer says.', 'Click the part to add to each PC.'],
      own: ['GB is how memory is measured.', 'More GB means more room.']
    },
    /* the platform's own help layer (see/hour.html), copied */
    layer: {
      jobLead: 'Your job now: ', helpBtn: 'Stuck? Show me', helpBack: 'Got it', helpHow: 'Do this',
      tagPress: 'Press this', tagChoose: 'Choose one',
      helpStuck: 'Still stuck? Ask the person beside you. Then put your hand up.'
    }
  };
  /* The lines that are not a word-for-word cut of a source sentence, with why (the cold readers check each). */
  S.REWRITES = {
    'Move the four steps into the right order, then press Lock in this order.': 'source "then press Lock in." names a button that is called Lock in this order',
    'Read the card, then press {btn}.': 'source "Read the card, then press the button." names the button, as the begin line does',
    'Wait for the others to answer.': 'trio form of wait.partner (two seats still to answer)',
    'Windows is the operating system. It runs the whole PC. It starts your programs and lets each one use the parts.': 'Q8 why (contest.js): the source\'s four sentences (25 words) cannot sit beside the answer chips; cold readers r1 (27 Nov 2026), both readers failed it: "boss program" came without its real name, and "shares out the parts" was too vague to picture; cold readers r2 (27 Nov 2026), both readers failed it: "them" was unclear and "shares the PC\'s parts" too abstract (both); "boss program" read as a metaphor (reader a); the line now echoes the answer chip, runs the machine and starts your programs',
    'Press the button "We are together. Carry on".': 'the help names the fallback button by its words, never by colour (26 Nov); cold readers r1 (27 Nov 2026), both readers failed it: the button\'s own full stop split the line into two sentences, so its words now sit in quotes',
    '{partner}\'s PC has sent nothing for 30 seconds. Bernadette answers for {partner} until it does.': 'cold readers r1 (27 Nov 2026), both readers failed it: "the link" is a word she was never given; the line now says whose PC went quiet; cold readers r2 (27 Nov 2026), both readers failed it: "gone quiet" is an idiom, a PC does not talk, and "until that PC is back" left back from where open; 30 seconds is the engine\'s GONE_MS; trimmed from reader b\'s rewrite to fit the 25-word card',
    'Your partner cannot see your answer until you have both answered.': 'cold readers r1 (27 Nov 2026), both readers failed it: "Nobody sees your answer yet" left who, and until when, open',
    'There are seven parts inside {him}. There is also one more thing in there that is not a part.': 'cold readers r1 (27 Nov 2026), both readers failed it: "Inside her are seven parts" turns the sentence round and had to be read twice; cold readers r2 (27 Nov 2026), both readers failed it: "One thing inside her is not a part" read as a riddle, and "inside her" came twice',
    '{p} is your partner, at another PC in this room.': 'cold readers r1 (27 Nov 2026), both readers failed it: "at the same table" read as a real table, but the partner sits at another PC in the room',
    '{p} and {q} are your partners, at other PCs in this room.': 'cold readers r1 (27 Nov 2026), both readers failed it: the team-of-three form of the line above, same fault',
    'Read what {me} says next.': 'cold readers r1 (27 Nov 2026), both readers failed it: "See what goes wrong" did not say where to look; the patient\'s words are the clue',
    'Click the job that part did. It goes in {his} chart.': 'cold readers r1 (27 Nov 2026), both readers failed it: "Fill in" said she writes, but she clicks a job card and the chart fills itself',
    'You can leave a job at any time. Press "Back to the extra jobs" at the top.': 'cold readers r1 (27 Nov 2026), both readers failed it: "the Back button" is not the button\'s name, and "at any moment" is an idiom',
    'The screen shows the name of one part.': 'cold readers r1 (27 Nov 2026), both readers failed it: "A line" is not a thing she has met; cold readers r2 (27 Nov 2026), both readers failed it: "name" read as a noun on the first pass, so the line was read twice',
    'You see a photo of a PC with its case open. The screen shows the name of one part. Click that part in the photo.': 'cold readers r1 (27 Nov 2026), both readers failed it: "an open PC" and "A line" did not say what she sees (kept the same as the lesson card); cold readers r2 (27 Nov 2026), both readers failed it: "The screen names" read as a noun pair, so the line was read twice (kept the same as the lesson card)',
    'You are a team · Against Bernadette': 'team kicker: fixes.team + the mode line (modes announce themselves)',
    'Question {k} of {total} · The answer': 'reveal kicker: the top bar\'s question count + "The answer" from rev.answer',
    'Answer four marked questions on your own.': 'exit check job line (lesson JSON c8): the live line "Answer three marked questions on your own." with the count moved from three to four (spec §2, §5.9: x5 joins)',
    'Four questions before you finish': 'exit check card title (lesson JSON c8): the live "Three questions before you finish" with the count moved to four (spec §5.9)',
    'Go and sit with {name}.':'the operation\'s blocked link runs both surgeons on seat A\'s PC (as V1), so seat B is sent to A by her real name: the live V1 line "Go and sit with {p}." with its second sentence dropped'
  };
  root.L6C_STRINGS = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
