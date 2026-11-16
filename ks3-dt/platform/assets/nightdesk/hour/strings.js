/* THE NIGHT DESK — every user-facing string of the J3 L6 hour, in one place. The deck, the brief and the recap-pool items are at the end and quote from here.
   Rules: ≤14 words a sentence, ≤40 prose words a rendered screen (DFM 292), full descriptive sentences (DFM 294), plain word before any technical one (DFM 335). */
window.S = {
  lesson: { code: 'J3 · Lesson 6', title: 'The Night Desk', slot: 'Data Newsroom' },
  rail: { late: 'Late shift', donow: 'Do now', open: 'The job', c1: '1 · The question', c2: '2 · Two at once', c3: '3 · One week', c4: '4 · Either one', c5: '5 · Leave out', c6: '6 · The rush', front: 'Front page', close: 'Finish' },
  common: { next: 'Next', partOf: 'Part {n} of 9', minsLeft: '{m} minutes left', pause: 'Pause', paused: 'Paused. Nothing is lost.', resume: 'Carry on', here: 'You are here', xp: '{n} points', hintN: 'Hint {n} of 3', hint: 'Hint', ask: 'Ask the table', clear: 'Clear', showing: 'Showing {n} of {all} {what}', people: 'people', days: 'days', andMore: 'and {n} more rows', bank: 'Word bank: click a word to add it.', boxHint: 'Type a rule, then press Enter' },
  stamp: { PRINT: 'PRINT', SPIKE: 'SPIKE', why: 'Why?', reasons: { numbers: 'The numbers say no', few: 'Too few people', cherry: 'Only the best bit', cause: 'One did not cause the other', backed: 'The numbers back it' }, confirm: 'Stamp it', missing: 'Pick a stamp and a reason first.', stamped: 'You stamped it {stamp}. Your reason: {reason}' },
  donow: { kicker: 'Do now', intro: 'Here are five quick questions from earlier lessons. Click an answer to see if it is right.', progress: 'Question {n} of 5', right: 'Right.', wrong: 'Not that one. The green one is right.', finish: 'You have done all five questions. Next is tonight’s job.', button: 'Start tonight' },
  opening: { kicker: 'Tonight', line1: 'You will check if headlines are telling the truth.', line2: 'Posts, adverts and the news are not always true.', button: 'Start' },
  story: { kicker: '10:02 pm · Dee Lavery, editor', from: 'Dee', b1: 'Fionn, our reporter, went home sick.', b2: 'Check his six headlines before midnight.', b3: 'PRINT the true ones. SPIKE the rest. SPIKE means you throw the headline in the bin.', readAll: 'Show all the texts', go: 'Open the desk' },
  facts: { kicker: 'What Fionn collected', intro: 'Fionn’s facts are in two tables. Each table has rows and columns.', t1: 'Table one: 60 people of Rathmore answered a survey.', t2: 'Table two: 92 summer days at the harbour.', button: 'Show me the desk' },
  tour: { kicker: 'The desk', s1: 'This is the table. Each row is one person.', s2: 'Type a rule in this box. The table keeps only rows that fit.', s3: 'This is the count. It shows how many rows are left.', next: 'Next', done: 'Got it' },
  c1: {
    title: 'The question', headline: 'Eight hours of sleep lifts exam scores', byline: 'Fionn · page 3',
    showKicker: 'Dee shows you', show1: 'A rule has a column, a sign and a number.', showDemo: 'age < 20', show2: '< means less than, so this keeps people under 20.',
    ask: 'Keep only the people who slept eight hours or more.', h1: 'The column is sleep_hours. Eight or more is >=.', h2: 'Write sleep_hours, then >=, then 8.', h3: 'Type this, then press Enter.', h3code: 'sleep_hours >= 8',
    judge: { ok: 'Right: 17 people. A rule like this is a query.', wrong: 'Your rule keeps {got} rows, not 17. Check the sign.' },
    compareKicker: 'Now compare', compare1: 'Those 17 scored 61.0 on average.', compare2: 'The other 43 scored 65.3.', predict: 'Is the headline true?', options: ['No. The people who slept eight hours or more scored lower.', 'Yes. Sleep lifted the scores.'], right: 'Right. The numbers say the opposite.', wrong: 'No. People who slept eight or more hours scored lower than others, not higher.',
    stampShowKicker: 'How Dee stamps', stampShow1: 'Fionn asked only three people.', stampShow2: 'Dee stamped it SPIKE: do not print.', stampShow3: 'Her reason: too few people.',
    stampAsk: 'Your turn now. Stamp the sleep headline.', stampOk: 'SPIKE. Those who slept eight hours or more scored lower, not higher.', stampNo: 'Look at the two averages. Which group scored higher?', reasonNo: 'Seventeen people is enough. The averages say no.', doneLine: 'You have done one headline. Five are left.'
  },
  c2: {
    title: 'Two at once', headline: 'Most Rathmore teens are on their phones five hours a day', byline: 'Fionn · page 1',
    showKicker: 'Dee shows you', show1: 'AND keeps rows where both rules are true.', showDemo: 'age < 20 AND pet = "dog"', show2: 'Here: teens who have a dog.', show3: 'Words go in quotes. Numbers do not.',
    ask: 'Keep teens who use their phone five hours or more.', h1: 'For teens, use age < 20. For five hours or more, use phone_hours >= 5.', h2: 'Put AND between the two rules.', h3: 'Type this, then press Enter.', h3code: 'age < 20 AND phone_hours >= 5',
    judge: { ok: 'Right: 6 of the 18 teens use their phone that much.', wrong: 'Your rule keeps {got} rows, not 6. Check both rules.' },
    predict: 'Fionn wrote "most". Six of 18 is…', options: ['One in three', 'Most of them', 'Half of them'], right: 'Right. Six of eighteen is one in three.', wrong: 'Six of eighteen is one in three. One in three is not most.',
    stampAsk: 'Now you stamp it.', stampOk: 'SPIKE. The numbers say no: 6 of 18 is not most.', stampNo: 'Six of the 18 teens use their phone five hours or more. Is that most of them?', reasonNo: 'Eighteen teens is enough. The problem is the word "most".', doneLine: 'You have done two headlines. Four are left.'
  },
  c3: {
    title: 'One week', headline: 'Rathmore harbour gets 3,000 visitors a day', byline: 'Fionn · page 2',
    showKicker: 'Dee shows you', show1: 'BETWEEN keeps every number from the first to the second.', showDemo: 'temp_c BETWEEN 20 AND 22', show2: 'Here: summer days at 20, 21 or 22 degrees.',
    ask: 'Fionn only looked at days 40 to 46. Keep those days.', h1: 'The column is day_no.', h2: 'Write day_no, then BETWEEN, then the first day, then AND, then the last day.', h3: 'Type this, then press Enter.', h3code: 'day_no BETWEEN 40 AND 46',
    judge: { ok: 'Right: 7 days. They are regatta week, the week of the boat races.', wrong: 'Your rule keeps {got} days, not 7. Check both ends.' },
    compareKicker: 'Now compare', compare1: 'Those 7 days had 3,158 visitors a day.', compare2: 'All 92 days had 2,215 visitors a day.', predict: 'What did Fionn do?', options: ['Took the best week and called it the summer.', 'Added the days up wrong.', 'He did nothing wrong. 3,000 is the right number.'], right: 'Right. One good week is not the whole summer.', wrong: 'He took the best week and called it the summer.',
    stampAsk: 'Now you stamp it.', stampOk: 'SPIKE. Fionn used only the best week. Regatta week is not the whole summer.', stampNo: 'Can seven days show the whole summer?', reasonNo: 'Those seven days are real, but they were the best week of the summer.', doneLine: 'You have done three headlines. Three are left.'
  },
  c4: {
    title: 'Either one', headline: 'More than half of Rathmore people have a dog or a cat', byline: 'Fionn · page 5',
    showKicker: 'Dee shows you', show1: 'OR keeps rows where either rule is true.', showDemo: 'area = "Marsh" OR area = "Hill"', show2: 'Here: people in Marsh or Hill.', show3: 'Write the column name on both sides of OR.',
    ask: 'Keep everyone with a dog or a cat.', h1: 'The column is pet. Words go in quotes: "dog".', h2: 'Type pet = "dog" OR pet = "cat". Each side is a full rule.', h3: 'Type this, then press Enter.', h3code: 'pet = "dog" OR pet = "cat"',
    judge: { ok: 'Right. 31 people have a dog or a cat.', wrong: 'Your rule keeps {got} rows, not 31. Write the column name on both sides of OR.' },
    predict: 'Is the headline true?', options: ['Yes. 31 of 60 is over half.', 'No. 31 is too few.'], right: 'Right. This one is true.', wrong: 'Thirty-one of sixty is over half. This one is true.',
    stampAsk: 'Now you stamp it.', stampOk: 'PRINT. The numbers back it: 31 of 60.', stampNo: '31 of 60 is over half. Is it true?', reasonNo: 'This one is true. Why do you print it?', doneLine: 'You have done four headlines. Two are left.'
  },
  c5: {
    title: 'Leave out', headline: 'Outside Old Town, everyone loves the new bus', byline: 'Fionn · page 4',
    showKicker: 'Dee shows you', show1: 'NOT flips a rule. It keeps the rows the rule throws out.', showDemo: 'NOT area = "Old Town"', show2: 'Here: everyone outside Old Town.', show3: 'Put NOT first.',
    ask: 'Keep people outside Old Town who gave the bus any stars.', h1: 'You need two rules: one for Old Town and one for the stars. Put NOT at the start of the Old Town rule.', h2: 'Join the two with AND.', h3: 'Type this, then press Enter.', h3code: 'NOT area = "Old Town" AND bus_stars > 0',
    judge: { ok: 'Right. Your rule keeps 4 people.', wrong: 'Your rule keeps {got} rows. Look at the part about stars. Giving any stars means giving more than 0 stars.' },
    compareKicker: 'Now compare', compare1: 'All four gave five stars.', compare2: 'The other 40 people outside Old Town did not rate the bus.', predict: 'Fionn wrote "everyone". He had…', options: ['Ratings from four people', 'Ratings from 44 people', 'Ratings from all 60 people'], right: 'Right. Four people cannot tell us what all 44 think.', wrong: 'Four people rated it. They cannot tell us what all 44 think.',
    stampAsk: 'Now you stamp it.', stampOk: 'SPIKE. The reason is too few people. Only 4 of the 44 people outside Old Town rated the bus.', stampNo: 'Just 4 of 44 rated the bus. Is that everyone?', reasonNo: 'The four did love it. But four is too few.', doneLine: 'You have done five headlines. One is left.'
  },
  c6: {
    title: 'The rush', headline: 'Ice cream sales cause sea rescues', byline: 'Fionn · page 1',
    ring: 'One headline is left. The printing press starts in three minutes. If time runs out, the press prints Fionn’s headline.', ringButton: 'Start the clock',
    intro: 'Check hot days, then cold days.',
    ask1: 'Keep the hot days: 24 degrees or more.', h1a: 'The column is temp_c.', h1b: 'Twenty-four or more is >=.', h1c: 'Type this, then press Enter.', h1code: 'temp_c >= 24',
    judge1: { ok: 'Right. An average hot day had 290 ice creams sold and 2.8 sea rescues.', wrong: 'Your rule keeps {got} days, not 27. Check the sign.' },
    ask2: 'Now keep the days under 18 degrees.', h2a: 'Under 18 is <.', h2b: 'Write temp_c, then <, then 18.', h2c: 'Type this, then press Enter.', h2code: 'temp_c < 18',
    judge2: { ok: 'Right. An average cold day had 91 ice creams sold and 0.5 sea rescues.', wrong: 'Your rule keeps {got} days, not 28. Check the sign.' },
    stampAsk: 'Be quick. Stamp the headline now.', stampOk: 'SPIKE. Ice cream did not cause the rescues. Hot weather caused the sales and the rescues.', stampNo: 'Sales and rescues both rise on hot days. What causes both?', reasonNo: 'The numbers are real. But could something else cause both the ice cream sales and the sea rescues?',
    timeLeft: '{s} seconds left', timeUp: 'It is midnight. Time ran out.', printedKicker: 'Midnight', printedLine: 'The press printed Fionn’s headline on page one.', morningKicker: 'The next morning', letter1: 'Dear Editor, I sell ice cream. My ice cream does not cause sea rescues.', letter2: 'Hot weather causes both the sales and the rescues.', letter3: 'Marie Byrne', letterButton: 'Fix the stamp',
    fixAsk: 'Stamp it again.', fixOk: 'You fixed it. The heat caused the sales and the rescues.', doneLine: 'See the front page'
  },
  front: { kicker: 'Midnight', masthead: 'The Harbour Post', date: 'Rathmore · Saturday', intro: 'The page you made.', printedSub: 'Survey of 60 people', spikedTitle: 'Spiked headlines', byline: 'Night desk: {name}', you: 'you', rename: 'Type your name for the page', button: 'Print my page', wrongSub: 'Not checked · by Fionn' },
  close: {
    badgesTitle: 'Tonight',
    badges: [{ id: 'asker', name: 'First question', line: 'You wrote your first query.' }, { id: 'both', name: 'Two at once', line: 'You used AND.' }, { id: 'week', name: 'The week', line: 'You used BETWEEN.' }, { id: 'either', name: 'Either one', line: 'You used OR.' }, { id: 'rest', name: 'Leave out', line: 'You used NOT.' }, { id: 'rush', name: 'The rush', line: 'You finished before the press started.' }],
    recapTitle: 'Remember these', recap: ['AND keeps rows where both rules are true. OR keeps rows where either rule is true.', 'BETWEEN keeps the first number, the last number and every number in between.', 'NOT goes before a rule. It keeps the rows that the rule would throw out.', 'Check the numbers before you print.'],
    exitTitle: 'Last five questions', exitOf: 'Question {n} of 5', exitRight: 'Right.', exitWrong: 'Not that one. The green one is right.', exitDone: 'You have finished the last five questions.',
    exit: [
      { stem: 'Which rule keeps teens who live in Hill?', options: ['age < 20 AND area = "Hill"', 'age < 20 OR area = "Hill"', 'NOT age < 20'] },
      { stem: 'Fionn wrote that most teens use their phone five hours a day. Only six of the 18 teens do. Eighteen teens is enough people to check. Why does Dee spike the headline?', options: ['The numbers say no', 'Too few people', 'One did not cause the other'] },
      { stem: 'day_no BETWEEN 40 AND 46 keeps how many days?', options: ['7', '6', '40'] },
      { stem: 'Hot days have more ice cream sales and more sea rescues. Which sentence explains this best?', options: ['The heat causes both', 'Ice cream causes rescues', 'Rescued swimmers then buy ice cream'] },
      { stem: 'Which rule keeps everyone except Old Town?', options: ['NOT area = "Old Town"', 'area = "Old Town"', 'area = "Old" AND area = "Town"'] }],
    feltTitle: 'How did it go?', feltIntro: 'Answer honestly.', felt: ['I can write a rule with AND, OR or NOT.', 'I can say what BETWEEN keeps.', 'I can say why a headline gets spiked.'], feltScale: ['Not yet', 'Nearly', 'Yes'], difficulty: 'How hard was today?', difficultyScale: ['Easy', 'About right', 'Hard'], comment: 'A note for your teacher', send: 'Send and finish',
    people: 'People', days: 'Days',
    end: 'The hour is over. Everything you did is saved.'
  }
};
/* ---------- the deck (teacher's slides, shown on the board while the hour runs), the one-page brief and the five recap-pool items ---------- */
window.S.deck = [
  {
    "id": "d1",
    "kind": "title",
    "kicker": "OUR LADY'S GRAMMAR SCHOOL · DIGITAL TECHNOLOGY",
    "heading": "The Night Desk",
    "sub": "You will check if headlines are telling the truth. Posts, adverts and the news are not always true.",
    "notes": "SAY: read the sentences on the slide aloud, once, then stop. Say nothing about what happens on screen. The hour is a surprise."
  },
  {
    "id": "d2",
    "kind": "bullets",
    "heading": "What you will do today",
    "bullets": [
      "Ask a table a question by typing a rule.",
      "Join two rules with AND or OR. AND needs both. OR needs one.",
      "Use BETWEEN to keep every number from one end to the other.",
      "Use NOT to keep the rows that a rule does not match.",
      "Say if the numbers back a headline. If they do not, say why."
    ],
    "notes": "SAY: these are the five things. Do not explain them now. The screens teach them one at a time, with an example before every ask."
  },
  {
    "id": "d3",
    "kind": "bullets",
    "heading": "Headphones on",
    "bullets": [
      "The hour has sound. Put your headphones on now.",
      "No headphones? Press the speaker button to turn sound off.",
      "Every sound has its words on the screen too. Nothing is lost."
    ],
    "notes": "SAY: headphones on. If you have none, turn the sound off with the speaker button."
  },
  {
    "id": "d4",
    "kind": "bullets",
    "heading": "On your own",
    "bullets": [
      "You work through your own screens at your own pace.",
      "Stuck? Press the green button, Stuck? Show me. It is free.",
      "Hint gives more help, but the headline then earns fewer points."
    ],
    "notes": "SAY: this is your own hour. Stuck? Press the green Stuck? Show me button first. It shows you what to do next. Then try Hint."
  },
  {
    "id": "d5",
    "kind": "bullets",
    "heading": "Read every screen",
    "bullets": [
      "Every screen says what to do and when it is done.",
      "The strip at the top shows which part you are in.",
      "Lost? Read the screen again from the top."
    ],
    "notes": "SAY: nothing on these screens is decoration. Read every line."
  },
  {
    "id": "d6",
    "kind": "stop",
    "beacon": "1",
    "heading": "Start now",
    "bullets": [
      "Open the link and sign in with your school account.",
      "Start with the five warm-up questions.",
      "When a screen says Finish, you are done."
    ],
    "notes": "SAY: go. Leave the deck on this slide for the rest of the hour."
  },
  {
    "id": "d7",
    "kind": "bullets",
    "heading": "The last screens",
    "bullets": [
      "After the badges come five last questions and how it felt.",
      "Then the late shift opens: extra jobs to fill the hour.",
      "Keep going until your teacher stops you. Everything is saved."
    ],
    "notes": "SAY: when you see your badges, do the last questions. Then keep going in the late shift until I stop you."
  },
  {
    "id": "d8",
    "kind": "closer",
    "heading": "Before you leave",
    "sub": "See you in a fortnight.",
    "bullets": [
      "Your work is saved. You have nothing to hand in.",
      "The late shift saves your best scores for next time."
    ],
    "notes": "SAY: everything is saved. See you in a fortnight."
  }
];
window.S.brief = {
  "purpose": [
    "The skill is asking a table a question by typing a rule, such as age < 20. A rule keeps only the rows that fit it. Pupils join rules with AND and OR, and use BETWEEN and NOT. They then judge whether the numbers back a headline. They meet three ways that a true-looking pattern can mislead. The three ways are too few people, only the best bit, and one thing that did not cause the other.",
    "The pupils check six headlines. They stamp each one PRINT or SPIKE and give a reason. PRINT sends a headline to the paper. SPIKE throws it out. The front page that results is shown on screen. Nothing prints on paper."
  ],
  "prepare": [
    {
      "title": "Nothing to print",
      "text": "Each pupil needs the lesson link and their school account to sign in. Headphones help, if pupils have them. The slide deck for the board is optional."
    },
    {
      "title": "Do not give away the story",
      "text": "Let the pupils work from their own screens. Each screen tells them what to do. You do not need to explain the lesson to the class. First, each pupil answers five warm-up questions on their own screen. Next, each pupil's screen says what the lesson is for. Slide 1 on the board has the same words as that screen."
    }
  ],
  "resources": [
    {
      "label": "The lesson",
      "what": "The pupil hour, J3 Lesson 6, in the platform. One link, signed in.",
      "href": ""
    },
    {
      "label": "The deck",
      "what": "Eight slides with no story. Slide 6 is the Start beacon; leave it up.",
      "href": ""
    }
  ],
  "runningTheHour": [
    {
      "part": "Do-Now · Slide 1",
      "mins": 5,
      "text": "Pupils answer five questions from earlier lessons. The questions mark themselves. Nothing is recorded against the pupil.",
      "say": "Five warm-up questions. Click the answer you think is right."
    },
    {
      "part": "The job · Slides 2–6",
      "mins": 5,
      "text": "The night desk is the screen where pupils do their work. After the warm-up questions, the first screen tells the pupils what the hour is for. Next, a short message from the night editor, Dee, explains the job. Last, a tour in three steps shows the pupils around the night desk.",
      "say": "Read every screen. Nothing happens until you press the button."
    },
    {
      "part": "Headlines 1 to 3",
      "mins": 20,
      "text": "Pupils type one rule, then a rule with AND, then a rule with BETWEEN. Every headline shows a worked example first. The hints get more help each time. The last hint shows the rule.",
      "say": "Stuck? Press the green Stuck? Show me button. Then try Hint."
    },
    {
      "part": "Headlines 4 and 5",
      "mins": 10,
      "text": "A rule is a question that a pupil types into the question box. The table then keeps only the rows that fit the rule. In part 4, pupils type a rule that uses the word OR. In part 5, they type a rule that uses the word NOT. Pupils also stamp each headline. The PRINT stamp sends a headline to the paper. The SPIKE stamp throws it out. Headline 4 is in part 4. It is the only true headline in the lesson. Pupils should stamp it PRINT and pick the reason \"The numbers back it\".",
      "say": "Not every headline is wrong. Read the count before you stamp."
    },
    {
      "part": "Headline 6",
      "mins": 8,
      "text": "Part 6 has a clock that counts down three minutes. The headline in part 6 is false. Fionn, the reporter, wrote it. If the clock runs out, the paper prints the headline exactly as Fionn wrote it. The next morning, a letter from a reader appears on screen and complains. The pupil then picks a stamp and a reason for the headline again. All the pupil's earlier work is still saved.",
      "say": "If the clock runs out, you fix it on the next screen."
    },
    {
      "part": "Finishing and the late shift · Slides 7–8",
      "mins": 12,
      "text": "The pupils see their front page, their badges and a recap. Then come five last questions and a short check on how the hour went. Then the late shift opens. It has five kinds of extra job, with 70 tasks, to fill the rest of the hour.",
      "say": "After the last questions, keep going in the late shift."
    }
  ],
  "atAGlance": [
    {
      "part": "Do-Now",
      "what": "Five warm-up questions"
    },
    {
      "part": "Headline 1",
      "what": "One rule: sleep_hours >= 8"
    },
    {
      "part": "Headline 2",
      "what": "AND: two rules at once"
    },
    {
      "part": "Headline 3",
      "what": "BETWEEN: a run of days"
    },
    {
      "part": "Headline 4",
      "what": "OR keeps a row when either rule is true. This part has the one true headline."
    },
    {
      "part": "Headline 5",
      "what": "NOT: keep the rows that a rule would not match"
    },
    {
      "part": "Headline 6",
      "what": "Hot days and cold days, with a three-minute clock"
    },
    {
      "part": "Close",
      "what": "The front page, badges, a recap, five last questions, then the late shift"
    }
  ],
  "goesWrong": [
    {
      "q": "The table cannot read a pupil's rule.",
      "a": "The screen says what a rule needs: a column, a sign and a value. The last hint shows the full rule."
    },
    {
      "q": "A pupil leaves the quote marks off a word.",
      "a": "A pupil may type a word in a rule without quote marks. For example, they may type area = Old Town instead of area = \"Old Town\". The question box still accepts it, so the rule still works. Every hint shows the word in quote marks."
    },
    {
      "q": "The three-minute clock ran out.",
      "a": "If time runs out in part 6, the paper prints Fionn's false headline: ice cream sales cause sea rescues. The screen then jumps to the next morning in the story, where a letter from a reader complains. The pupil then picks a stamp (PRINT or SPIKE) and a reason for that headline again. All the pupil's earlier work is still saved."
    },
    {
      "q": "A pupil stamps a headline PRINT when the headline should be SPIKE.",
      "a": "The screen says why and asks again. There are five reasons to choose from."
    },
    {
      "q": "A pupil finishes early.",
      "a": "The late shift opens after the last questions. It has more headlines, Hit the number, Fix the rule, a Rule race and Count first. A pupil can finish the lesson from it at any time."
    }
  ]
};
window.S.recapPool = [
  { id: 'r-j3-601', lesson: 'j3-06', stem: 'An editor stamps a headline PRINT or SPIKE, meaning do not print. A reporter wrote: most teens are on their phones five hours a day. A table of 18 teens shows only 6 do. Which stamp?', options: ['SPIKE: the numbers say no', 'PRINT: the numbers back it', 'SPIKE: one did not cause the other'] },
  { id: 'r-j3-602', lesson: 'j3-06', stem: 'A table has a column called pet. Which rule keeps every person with a dog or a cat?', options: ['pet = "dog" OR pet = "cat"', 'pet = "dog" AND pet = "cat"', 'NOT pet = "dog"'] },
  { id: 'r-j3-603', lesson: 'j3-06', stem: 'A table has a column called day_no. Which rule (a question for the table) keeps days 40 to 46, both included?', options: ['day_no BETWEEN 40 AND 46', 'day_no > 40 AND day_no < 46', 'day_no = 40 OR 46'] },
  { id: 'r-j3-604', lesson: 'j3-06', stem: 'An editor spikes a headline, which means the headline is not printed. A reporter used the busiest week to describe the whole summer. Which reason should the editor give?', options: ['Only the best bit', 'Too few people', 'The numbers say no'] },
  { id: 'r-j3-605', lesson: 'j3-06', stem: 'Hot days bring more ice creams and more sea rescues. What caused the rescues?', options: ['The heat brought the swimmers', 'The ice cream', 'Rescued swimmers then buy ice cream'] }
];

/* ---------- additions ---------- */
(function (S) {
  var C = S.common;
  C.check = 'Check it'; C.done = 'Done'; C.start = 'Start'; C.got = 'Got it'; C.tourStop = 'Step {n} of 3'; C.headlineN = 'Headline {n} of 6'; C.nextOne = 'Next one';
  C.errEmpty = 'The box is empty. Type a rule first.'; C.errSyntax = 'That rule is not written the right way. Write a column name, then a sign. Then write a number, or a word in quotes.'; C.errColumn = 'There is no column called {word}. Click a column name in the word bank.'; C.errDangling = 'Your rule is not finished. A rule needs a column name, then a sign. Then it needs a number or a word.'; C.errValue = 'After the sign, type a number or a word in quotes.';
  S.c6.compare1 = 'Hot days averaged 290 ice creams and 2.8 rescues a day.'; S.c6.compare2 = 'Cold days averaged 91 ice creams and 0.5 rescues a day.'; S.c6.printedStamp = 'PRINTED';
  S.front.corrected = 'corrected after printing';
})(window.S);

/* Added 26 Oct 2026 for the spec: strings the platform shows round the hour; the prototype does not render them. */
(function (S) { Object.assign(S.common, { welcomeBack: 'Welcome back. You were on {where}. The desk is exactly as you left it.', startAgain: 'Start again', outOfTime: 'Time is nearly up. Finish this headline. Then press Finish in the row of parts at the top. The parts you have not done stay open for next time.' }); })(window.S);
/* build additions (J3L6_BUILD_PROGRESS.md; listed in tools/record-tutorial/j3l6/string-edits.json): the plumbing's
   own lines, the dock, Welcome back, the review chips and the free-time average cards */
(function (S) {
  Object.assign(S.common, { soundOn: 'Sound is on', soundOff: 'Sound is off', lighter: 'The lesson is running in a simpler way on this computer.', carryOn: 'Carry on', nextTime: 'You did not earn this badge this time.', back: 'Back', avgCafe: 'These people average {v} café visits.', avgVisitors: 'These days average {v} visitors.' });
  Object.assign(S.c1, { stampShowCard: 'Harbour café is the town favourite', stampShowBy: 'Fionn · last night' });
})(window.S);
/* V85 (16 Nov 2026): the help layer (job line, Stuck? Show me) and the late shift that fills the hour.
   Every line is listed in tools/record-tutorial/j3l6/string-edits.json. Late-shift numbers are tokens the hour
   works out from the data, so a card can never show a wrong number: {n} kept, {rn} the rest, {a:col} kept
   average, {r:col} rest average, {c:ref} count of another rule, {x:col:ref} average over another rule. */
(function (S) {
  Object.assign(S.common, { jobLead: 'Your job now:', stuck: 'Stuck? Show me', helpClose: 'Got it', helpKicker: 'How to do it', stillStuck: 'Still stuck? Ask the person beside you. Then put your hand up.', tagPress: 'Press this', tagChoose: 'Choose one', tagType: 'Type here', tagLike: 'Like this', errBetween: 'BETWEEN needs the small number first.', errSide: 'Each side of OR needs its own column name. Write the column again after OR.' });
  Object.assign(S.c5, { wrongNot: 'Your rule keeps {got} rows. Put NOT before area.', wrongAnd: 'Your rule keeps {got} rows. Join the two rules with AND.' });
  S.job = {
    choose: 'click the answer you think is right.', opening: 'press Start to begin.', story: 'read Dee’s texts, then press Open the desk.',
    facts: 'see where Fionn’s facts come from, then press Show me the desk.', tour: 'see how the desk works, then press Next.',
    title: 'read Fionn’s headline, then press Check it.', show1: 'watch Dee’s rule work.', show: 'watch Dee use {kw}.',
    ask: 'write a rule, then press Enter.', askFix: 'fix your rule, then press Enter.', ok: 'read the green line, then press the button.',
    compare: 'compare the numbers, then choose an answer.', predict: 'choose the right answer.', picked: 'read the line, then press Next.',
    stampshow: 'see how Dee stamps a headline.', stamp: 'choose a stamp and a reason, then press Stamp it.', ring: 'press Start the clock.',
    printed: 'read what happened, then press Next.', letter: 'read Marie’s letter, then press Fix the stamp.',
    front: 'type your name, then press Print my page.', badges: 'see your badges, then press Next.', recap: 'remember these four, then press Next.',
    felt: 'answer each question, then press Send and finish.', welcome: 'press Carry on.', review: 'look back, then press Back.',
    late: 'choose an extra job, or finish the lesson.', heads: 'write the rule, then stamp the headline.', hit: 'make your rule keep exactly {n} rows.',
    fix: 'fix Fionn’s rule, then press Enter.', raceMenu: 'choose a level to start the race.', race: 'pick the right rule before the clock runs out.',
    raceEnd: 'race again, or go back to the menu.', count: 'pick how many rows this rule keeps.', end: 'you have nothing more to do. The lesson is finished.',
    donowEnd: 'press Start tonight.', after: 'read the line, then press {btn}.'
  };
  S.help = {
    next: ['Read the screen from the top.', 'Then press the button with the ring.'],
    story: ['Read each text from Dee.', 'Then press Open the desk.'],
    tour: ['Read the line beside the ring.', 'Then press Next.'],
    askEmpty: ['Click a column name in the word bank.', 'Click a sign, then type a number.', 'Press Enter. Check the count.'],
    askRed: ['Read the red line under your rule.', 'Fix one part, then press Enter.', 'Press Hint if you need more.'],
    askTyped: ['Press Enter to run your rule.', 'Then read the line under it.'],
    ok: ['Read the green line.', 'Then press the button under it.'],
    predict: ['Look at the numbers on the desk.', 'Choose the answer that fits them.'],
    stampNone: ['Do the numbers back the headline?', 'Yes: press PRINT. No: press SPIKE.'],
    stampReason: ['Now choose the reason that fits best.'],
    stampReady: ['Press Stamp it.'],
    stampWrong: ['Read the red line.', 'Try another stamp or reason.'],
    front: ['Type your name in the box.', 'Then press Print my page.'],
    late: ['Click one of the five extra jobs to try it.', 'Or press Finish the lesson.'],
    hit: ['Write a rule, then press Enter.', 'Read the count. It shows how many rows are left.', 'Change your rule until it keeps the number you need.'],
    fix: ['Read what Fionn wanted.', 'Change one part of his rule.', 'Press Enter. Read the line.'],
    raceMenu: ['Press a level to start.', 'Level 1 is the easiest.'],
    race: ['Read the question at the top.', 'Click the rule that answers the question.'],
    count: ['Think about what the rule keeps.', 'Click the number you think is right.'],
    choose: ['Read the question.', 'Click the answer you think is right.'],
    felt: ['Click one answer in each row.', 'Then press Send and finish.'],
    demo: { c1: 'cafe_visits >= 8', c2: 'area = "Hill" AND pet = "dog"', c3: 'temp_c BETWEEN 15 AND 17', c4: 'area = "Harbour" OR area = "Old Town"', c5: 'NOT pet = "dog" AND age > 30', c6a: 'rain_mm >= 5', c6b: 'rain_mm < 2', people: 'age > 30', days: 'rain_mm > 3' }
  };
  S.late = {
    kicker: 'The late shift', intro: 'The paper is printed. Fionn left more work. Pick one.', finish: 'Finish the lesson', menuBack: 'Back to the menu', skip: 'Skip this one',
    ofN: '{n} of {all} done', best: 'Your best: {n} of {all} right', end: 'The lesson is finished. Everything you did is saved.', allDone: 'You have done all five jobs. Pick one to try again.',
    tiles: { heads: { name: 'More headlines', line: 'Check Fionn’s other headlines.' }, hit: { name: 'Hit the number', line: 'Write a rule that keeps exactly the number of rows you are asked for.' }, fix: { name: 'Fix the rule', line: 'Mend Fionn’s broken rules.' }, race: { name: 'Rule race', line: 'Pick the right rule before the clock runs out.' }, count: { name: 'Count first', line: 'Guess how many rows a rule keeps.' } },
    heads: {
      next: 'Next headline', stampAsk: 'Now stamp it.', wrong: 'Your rule keeps {got} rows. Read what to keep again.',
      no: { PRINT: 'Compare the two numbers. Do they back the headline?', numbers: 'Compare the two numbers. Do they back the headline?', few: 'Look at how many rows your rule kept.', cherry: 'Do these days show the whole summer, or only the best days?' },
      reasonNo: { backed: 'The numbers agree with the headline. Which reason says that?', numbers: 'There are enough rows. What do the numbers show?', few: 'Look at how many rows your rule kept.', cherry: 'Do these days show the whole summer, or only the best days?', cause: 'The numbers are real. But could something else be the real cause?' },
      items: [
        { t: 'people', head: 'Hill people go to the café less than everyone else', ask: 'Keep the people who live in Hill.', rule: 'area = "Hill"', card: ['These {n} people average {a:cafe_visits} café visits.', 'The other {rn} people average {r:cafe_visits}.'], stamp: 'PRINT', reason: 'backed', ok: 'PRINT. Hill averages {a:cafe_visits} visits. Everyone else averages {r:cafe_visits}.', claim: { col: 'cafe_visits', dir: 'less' } },
        { t: 'people', head: 'Fish owners are the café’s best customers', ask: 'Keep the people who own a fish.', rule: 'pet = "fish"', card: ['These {n} people average {a:cafe_visits} café visits.', 'The other {rn} people average {r:cafe_visits}.'], stamp: 'SPIKE', reason: 'few', ok: 'SPIKE. Only {n} people own a fish. That is too few people to trust the average.', claim: { col: 'cafe_visits', dir: 'more', few: true } },
        { t: 'people', head: 'Harbour people are older than everyone else', ask: 'Keep the people who live in Harbour.', rule: 'area = "Harbour"', card: ['These {n} people are {a:age} years old on average.', 'The other {rn} people average {r:age} years.'], stamp: 'PRINT', reason: 'backed', ok: 'PRINT. Harbour people average {a:age} years. Everyone else averages {r:age}.', claim: { col: 'age', dir: 'more' } },
        { t: 'people', head: 'Teenagers sleep less than adults', ask: 'Keep the people under 20.', rule: 'age < 20', card: ['These {n} teens sleep {a:sleep_hours} hours a night on average.', 'The other {rn} people sleep {r:sleep_hours} hours.'], stamp: 'SPIKE', reason: 'numbers', ok: 'SPIKE. Teens sleep {a:sleep_hours} hours a night and adults sleep {r:sleep_hours} hours. Teens sleep more, not less.', claim: { col: 'sleep_hours', dir: 'less', wrong: true } },
        { t: 'days', head: 'Wet days have fewer visitors', ask: 'Keep the days with more than 5 mm of rain.', rule: 'rain_mm > 5', card: ['These {n} wet days average {a:visitors} visitors.', 'The other {rn} days average {r:visitors} visitors.'], stamp: 'PRINT', reason: 'backed', ok: 'PRINT. Wet days average {a:visitors} visitors. Other days average {r:visitors}.', claim: { col: 'visitors', dir: 'less' } },
        { t: 'days', head: 'A scorching summer: 30 degrees at the harbour', ask: 'Keep the days of 30 degrees or more.', rule: 'temp_c >= 30', card: ['{n} day reached 30 degrees.', 'The other {rn} days averaged {r:temp_c} degrees.'], stamp: 'SPIKE', reason: 'cherry', ok: 'SPIKE. Just {n} day hit 30 degrees. The rest averaged {r:temp_c}.', claim: { col: 'temp_c', dir: 'more', few: true } },
        { t: 'people', head: 'Old Town people use their phones more than everyone else', ask: 'Keep the people who live in Old Town.', rule: 'area = "Old Town"', card: ['These {n} people use their phones {a:phone_hours} hours a day.', 'The other {rn} people average {r:phone_hours} hours.'], stamp: 'PRINT', reason: 'backed', ok: 'PRINT. Old Town averages {a:phone_hours} hours. Everyone else averages {r:phone_hours}.', claim: { col: 'phone_hours', dir: 'more' } },
        { t: 'people', head: 'Living in Old Town makes you use your phone more', ask: 'Keep the people who live in Old Town again.', rule: 'area = "Old Town"', card: ['These {n} people use their phones {a:phone_hours} hours a day. The rest average {r:phone_hours}.', 'These {n} people are {a:age} years old on average. The rest average {r:age}.'], stamp: 'SPIKE', reason: 'cause', no: 'Look at the ages of the Old Town people. Could their age explain how much they use their phones?', ok: 'SPIKE. All the Old Town people are teenagers. Their age explains the phone use, not the place they live.', claim: { col: 'phone_hours', dir: 'more', cause: 'area = "Old Town" AND age >= 20' } },
        { t: 'days', head: 'July was the busiest month at the harbour', ask: 'Keep the days in July.', rule: 'month = "July"', refs: { june: 'month = "June"', aug: 'month = "August"' }, card: ['July days average {a:visitors} visitors.', 'June averaged {x:visitors:june}. August averaged {x:visitors:aug}.'], stamp: 'PRINT', reason: 'backed', ok: 'PRINT. July averaged {a:visitors} visitors, more than June or August.', claim: { col: 'visitors', dir: 'most', others: ['june', 'aug'] } },
        { t: 'days', head: 'August was the driest month', ask: 'Keep the days in August.', rule: 'month = "August"', refs: { june: 'month = "June"', july: 'month = "July"' }, card: ['August days average {a:rain_mm} mm of rain.', 'June averaged {x:rain_mm:june} mm. July averaged {x:rain_mm:july} mm.'], stamp: 'SPIKE', reason: 'numbers', ok: 'SPIKE. August had the most rain, not the least.', claim: { col: 'rain_mm', dir: 'least', others: ['june', 'july'], wrong: true } },
        { t: 'people', head: 'Cat owners are older than everyone else', ask: 'Keep the people who own a cat.', rule: 'pet = "cat"', card: ['These {n} people are {a:age} years old on average.', 'The other {rn} people average {r:age} years.'], stamp: 'PRINT', reason: 'backed', ok: 'PRINT. Cat owners average {a:age} years. Everyone else averages {r:age}.', claim: { col: 'age', dir: 'more' } },
        { t: 'people', head: 'Pet owners go to the café far more', ask: 'Keep the people who have a pet. Use NOT.', rule: 'NOT pet = "none"', card: ['These {n} pet owners average {a:cafe_visits} café visits.', 'The other {rn} people average {r:cafe_visits}.'], stamp: 'SPIKE', reason: 'numbers', ok: 'SPIKE. Pet owners average {a:cafe_visits} café visits. Everyone else averages {r:cafe_visits}. The two numbers are almost the same. Pet owners do not visit far more.', claim: { col: 'cafe_visits', dir: 'more', big: true, wrong: true } },
        { t: 'days', head: 'Hot days bring the biggest crowds', ask: 'Keep the days of 24 degrees or more.', rule: 'temp_c >= 24', card: ['These {n} hot days average {a:visitors} visitors.', 'The other {rn} days average {r:visitors}.'], stamp: 'PRINT', reason: 'backed', ok: 'PRINT. Hot days average {a:visitors} visitors. Other days average {r:visitors}.', claim: { col: 'visitors', dir: 'more' } },
        { t: 'days', head: 'Wet days bring more sea rescues', ask: 'Keep the days with more than 5 mm of rain.', rule: 'rain_mm > 5', card: ['These {n} wet days average {a:sea_rescues} sea rescues.', 'The other {rn} days average {r:sea_rescues}.'], stamp: 'SPIKE', reason: 'numbers', ok: 'SPIKE. Wet days had fewer rescues, not more.', claim: { col: 'sea_rescues', dir: 'more', wrong: true } },
        { t: 'people', head: 'Everyone in Hill has a cat', ask: 'Keep the people in Hill who own a cat.', rule: 'area = "Hill" AND pet = "cat"', refs: { hill: 'area = "Hill"' }, card: ['{n} people in Hill own a cat.', 'Hill has {c:hill} people.'], stamp: 'SPIKE', reason: 'numbers', ok: 'SPIKE. Only {n} of the {c:hill} people in Hill own a cat.', claim: { all: 'hill', wrong: true } },
        { t: 'people', head: 'Marsh people use their phones less than everyone else', ask: 'Keep the people who live in Marsh.', rule: 'area = "Marsh"', card: ['These {n} people use their phones {a:phone_hours} hours a day.', 'The other {rn} people average {r:phone_hours} hours.'], stamp: 'PRINT', reason: 'backed', ok: 'PRINT. Marsh averages {a:phone_hours} hours. Everyone else averages {r:phone_hours}.', claim: { col: 'phone_hours', dir: 'less' } },
        { t: 'people', head: 'People over 70 hardly ever go to the café', ask: 'Keep the people over 70.', rule: 'age > 70', card: ['{n} person is over 70. They visit the café {a:cafe_visits} times.', 'The other {rn} people average {r:cafe_visits}.'], stamp: 'SPIKE', reason: 'few', ok: 'SPIKE. Only {n} person is over 70. One person is too few to show what people over 70 are like.', claim: { col: 'cafe_visits', dir: 'less', few: true } }
      ]
    },
    hit: {
      ask: 'Keep exactly {n} {what}.', what: { people: 'people', days: 'days' }, one: { people: 'person', days: 'day' }, need: 'Use {need} in your rule.', fewer: 'Your rule keeps {got}. You need {n}, so keep fewer.', more: 'Your rule keeps {got}. You need {n}, so keep more.',
      missing: 'Your rule keeps the right number, {n}. But this job needs {need} in your rule.', ok: 'Your rule keeps exactly {n} rows. Well done.', next: 'Next number',
      items: [
        { t: 'people', n: 9, need: '', tip: 'Try the pet column.', rule: 'pet = "dog"' },
        { t: 'people', n: 4, need: '', tip: 'Try the age column.', rule: 'age < 16' },
        { t: 'people', n: 3, need: 'AND', tip: 'Try age and pet.', rule: 'age < 20 AND pet = "dog"' },
        { t: 'people', n: 6, need: 'AND', tip: 'Try area and pet.', rule: 'area = "Hill" AND pet = "cat"' },
        { t: 'people', n: 13, need: 'OR', tip: 'Try the pet column twice.', rule: 'pet = "dog" OR pet = "fish"' },
        { t: 'days', n: 1, need: '', tip: 'Try the temp_c column.', rule: 'temp_c >= 30' },
        { t: 'days', n: 11, need: 'BETWEEN', tip: 'Try the day_no column.', rule: 'day_no BETWEEN 10 AND 20' },
        { t: 'people', n: 38, need: 'NOT', tip: 'Try the pet column.', rule: 'NOT pet = "cat"' },
        { t: 'days', n: 7, need: 'AND', tip: 'Try temp_c and rain_mm.', rule: 'temp_c >= 24 AND rain_mm = 0' },
        { t: 'people', n: 29, need: 'OR', tip: 'Try the area column twice.', rule: 'area = "Marsh" OR area = "Harbour"' },
        { t: 'days', n: 12, need: '', tip: 'Try the rain_mm column.', rule: 'rain_mm = 0' },
        { t: 'people', n: 10, need: 'BETWEEN', tip: 'Try the age column.', rule: 'age BETWEEN 40 AND 49' },
        { t: 'days', n: 4, need: 'AND', tip: 'Try month and temp_c.', rule: 'month = "June" AND temp_c >= 24' },
        { t: 'people', n: 5, need: '', tip: 'Try the bus_stars column.', rule: 'bus_stars > 0' }
      ]
    },
    fix: {
      intro: 'Fionn’s rule does not do what he wanted. Fix it.', wanted: 'He wanted {ask}.', wrong: 'Your rule keeps {got} rows. Read what he wanted again.', ok: 'Fixed. {why}', next: 'Next rule',
      items: [
        { t: 'people', ask: 'people with a dog or a cat', broken: 'pet = "dog" OR "cat"', fix: 'pet = "dog" OR pet = "cat"', why: 'Write the column name on both sides of OR.' },
        { t: 'days', ask: 'days of 20 to 23 degrees', broken: 'temp_c BETWEEN 23 AND 20', fix: 'temp_c BETWEEN 20 AND 23', why: 'BETWEEN needs the small number first.' },
        { t: 'people', ask: 'people in Old Town', broken: 'area = Old Town', fix: 'area = "Old Town"', why: 'Words go in quotes.' },
        { t: 'people', ask: 'people aged 16 or under', broken: 'age < 16', fix: 'age <= 16', why: '"16 or under" includes people who are exactly 16. So use <=, not <.' },
        { t: 'people', ask: 'teens who own a cat', broken: 'age < 20 OR pet = "cat"', fix: 'age < 20 AND pet = "cat"', why: 'Both must be true, so use AND.' },
        { t: 'people', ask: 'people outside Hill', broken: 'area NOT = "Hill"', fix: 'NOT area = "Hill"', why: 'NOT goes before the rule.' },
        { t: 'days', ask: 'days with no rain', broken: 'rain_mm < 0', fix: 'rain_mm = 0', why: 'No rain means exactly 0.' },
        { t: 'people', ask: 'people who sleep under 6 hours', broken: 'sleep_hours > 6', fix: 'sleep_hours < 6', why: 'Under means less than, so use <, not >.' },
        { t: 'days', ask: 'days in July or August', broken: 'month = "July" AND month = "August"', fix: 'month = "July" OR month = "August"', why: 'No day is in both months, so use OR.' },
        { t: 'people', ask: 'people in Marsh with no pet', broken: 'area = "Marsh" pet = "none"', fix: 'area = "Marsh" AND pet = "none"', why: 'Two rules need AND between them.' },
        { t: 'days', ask: 'days hotter than 25 degrees', broken: 'temp > 25', fix: 'temp_c > 25', why: 'The column is called temp_c.' },
        { t: 'people', ask: 'people aged 20 to 29', broken: 'age BETWEEN 20 29', fix: 'age BETWEEN 20 AND 29', why: 'BETWEEN needs AND between the numbers.' }
      ]
    },
    race: {
      intro: 'Pick the right rule for each question, fast. Each race lasts 90 seconds.', levels: ['Level 1: one rule', 'Level 2: AND and OR', 'Level 3: BETWEEN and NOT'],
      time: '{s} seconds left', qOf: 'Question {n} of {all}', right: 'Right.', wrong: 'That was not the right rule. The rule in green is the right one.', end: 'You got {n} of {all} right.', timeUp: 'Time is up.', again: 'Race again',
      items: [
        [
          { t: 'people', q: 'People under 20', right: 'age < 20', wrong: ['age > 20', 'age = 20'] },
          { t: 'people', q: 'People with a cat', right: 'pet = "cat"', wrong: ['pet = "dog"', 'area = "cat"'] },
          { t: 'days', q: 'Days with no rain', right: 'rain_mm = 0', wrong: ['rain_mm > 0', 'rain_mm < 0'] },
          { t: 'people', q: 'People aged 60 or over', right: 'age >= 60', wrong: ['age <= 60', 'age < 60'] },
          { t: 'days', q: 'Days of 25 degrees or more', right: 'temp_c >= 25', wrong: ['temp_c > 25', 'temp_c <= 25'] },
          { t: 'people', q: 'People in Marsh', right: 'area = "Marsh"', wrong: ['area = "Hill"', 'pet = "Marsh"'] },
          { t: 'days', q: 'Days with over 3,000 visitors', right: 'visitors > 3000', wrong: ['visitors < 3000', 'visitors > 300'] },
          { t: 'people', q: 'People who sleep 9 hours or more', right: 'sleep_hours >= 9', wrong: ['sleep_hours <= 9', 'phone_hours >= 9'] }
        ],
        [
          { t: 'people', q: 'Teens with a dog', right: 'age < 20 AND pet = "dog"', wrong: ['age < 20 OR pet = "dog"', 'age > 20 AND pet = "dog"'] },
          { t: 'people', q: 'People in Hill or Marsh', right: 'area = "Hill" OR area = "Marsh"', wrong: ['area = "Hill" AND area = "Marsh"', 'area = "Hill" OR "Marsh"'] },
          { t: 'days', q: 'Hot days with no rain', right: 'temp_c >= 24 AND rain_mm = 0', wrong: ['temp_c >= 24 OR rain_mm = 0', 'temp_c < 24 AND rain_mm = 0'] },
          { t: 'people', q: 'People with a fish or a dog', right: 'pet = "fish" OR pet = "dog"', wrong: ['pet = "fish" AND pet = "dog"', 'NOT pet = "dog"'] },
          { t: 'days', q: 'July days over 25 degrees', right: 'month = "July" AND temp_c > 25', wrong: ['month = "July" OR temp_c > 25', 'month = "July" AND temp_c < 25'] },
          { t: 'people', q: 'Harbour people aged 60 or over', right: 'area = "Harbour" AND age >= 60', wrong: ['area = "Harbour" OR age >= 60', 'area = "Harbour" AND age <= 60'] },
          { t: 'days', q: 'Days in June or August', right: 'month = "June" OR month = "August"', wrong: ['month = "June" AND month = "August"', 'NOT month = "June"'] },
          { t: 'people', q: 'Teens in Old Town', right: 'age < 20 AND area = "Old Town"', wrong: ['age < 20 OR area = "Old Town"', 'age > 20 AND area = "Old Town"'] }
        ],
        [
          { t: 'days', q: 'Days 1 to 10', right: 'day_no BETWEEN 1 AND 10', wrong: ['day_no BETWEEN 10 AND 1', 'day_no > 1 AND day_no < 10'] },
          { t: 'people', q: 'People not in Hill', right: 'NOT area = "Hill"', wrong: ['area = "Hill"', 'NOT area = "Marsh"'] },
          { t: 'people', q: 'People aged 20 to 29', right: 'age BETWEEN 20 AND 29', wrong: ['age < 20 OR age > 29', 'age BETWEEN 29 AND 20'] },
          { t: 'people', q: 'People with a pet', right: 'NOT pet = "none"', wrong: ['pet = "none"', 'NOT pet = "dog"'] },
          { t: 'days', q: 'Days from 15 to 20 degrees, counting both 15 and 20', right: 'temp_c BETWEEN 15 AND 20', wrong: ['temp_c > 15 AND temp_c < 20', 'temp_c BETWEEN 20 AND 15'] },
          { t: 'days', q: 'Days not in July', right: 'NOT month = "July"', wrong: ['month = "July"', 'NOT month = "June"'] },
          { t: 'people', q: 'Adults with no dog', right: 'age >= 20 AND NOT pet = "dog"', wrong: ['age >= 20 OR NOT pet = "dog"', 'age < 20 AND NOT pet = "dog"'] },
          { t: 'people', q: 'People who gave the bus 2, 3, 4 or 5 stars', right: 'bus_stars BETWEEN 2 AND 5', wrong: ['bus_stars > 2 AND bus_stars < 5', 'bus_stars BETWEEN 5 AND 2'] }
        ]
      ]
    },
    count: {
      ask: 'How many rows does this rule keep?', right: 'Right. {why}', wrong: 'It keeps {right}. {why}', next: 'Next rule',
      items: [
        { t: 'people', facts: 'The table has 9 dog owners and 22 cat owners.', rule: 'pet = "dog" OR pet = "cat"', opts: [31, 9, 0], why: 'OR keeps both groups: 9 + 22 = 31.' },
        { t: 'people', facts: 'The table has 9 dog owners and 22 cat owners.', rule: 'pet = "dog" AND pet = "cat"', opts: [0, 31, 9], why: 'No one’s pet is a dog and a cat at once.' },
        { t: 'people', facts: 'The table has 60 people. 22 of them own a cat.', rule: 'NOT pet = "cat"', opts: [38, 22, 60], why: 'NOT keeps everyone else: 60 − 22 = 38.' },
        { t: 'people', facts: '4 people are under 16. 7 people are exactly 16.', rule: 'age <= 16', opts: [11, 4, 7], why: 'The sign <= keeps people under 16 and people who are exactly 16. So the count is 4 + 7 = 11.' },
        { t: 'people', facts: '4 people are under 16. 7 people are exactly 16.', rule: 'age < 16', opts: [4, 11, 7], why: 'The sign < leaves out the 7 people who are exactly 16. So it keeps only the 4 people under 16.' },
        { t: 'days', facts: 'The days are numbered 1 to 92.', rule: 'day_no BETWEEN 10 AND 20', opts: [11, 10, 9], why: 'BETWEEN keeps both the first and the last day. Day 10 and day 20 both count. So days 10 to 20 make 11 days.' },
        { t: 'days', facts: 'The days are numbered 1 to 92.', rule: 'day_no > 90', opts: [2, 3, 90], why: 'Only days 91 and 92 are over 90.' },
        { t: 'days', facts: 'June has 30 days. July and August have 31 each.', rule: 'month = "June" OR month = "July"', opts: [61, 30, 0], why: 'OR keeps both months: 30 + 31 = 61.' },
        { t: 'days', facts: 'June has 30 days. July and August have 31 each.', rule: 'NOT month = "August"', opts: [61, 31, 92], why: 'NOT keeps June and July: 92 − 31 = 61.' },
        { t: 'days', facts: 'June has 30 days. July and August have 31 each.', rule: 'month = "July" AND month = "August"', opts: [0, 62, 31], why: 'No day is in two months at once.' },
        { t: 'people', facts: '16 people live in Old Town. 15 live in Hill.', rule: 'area = "Old Town" OR area = "Hill"', opts: [31, 16, 0], why: 'OR keeps both areas: 16 + 15 = 31.' },
        { t: 'people', facts: 'The table has 60 people. 16 live in Old Town.', rule: 'NOT area = "Old Town"', opts: [44, 16, 60], why: 'NOT keeps everyone else: 60 − 16 = 44.' },
        { t: 'people', facts: 'All 16 Old Town people are teens. There are 18 teens.', rule: 'age < 20 AND area = "Old Town"', opts: [16, 18, 2], why: 'Every Old Town person is a teen, so all 16 stay.' },
        { t: 'people', facts: 'The table has 60 people. 25 have no pet.', rule: 'NOT pet = "none"', opts: [35, 25, 60], why: 'NOT keeps the pet owners: 60 − 25 = 35.' },
        { t: 'people', facts: 'The oldest person is 74.', rule: 'age > 100', opts: [0, 1, 60], why: 'No one is over 100, so no rows are left.' },
        { t: 'days', facts: 'The days are numbered 1 to 92.', rule: 'day_no BETWEEN 1 AND 30', opts: [30, 29, 31], why: 'BETWEEN keeps both ends: days 1 to 30 is 30 days.' }
      ]
    }
  };
})(window.S);
