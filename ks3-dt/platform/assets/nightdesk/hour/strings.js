/* THE NIGHT DESK — every user-facing string of the J3 L6 hour, in one place. The deck, the brief and the recap-pool items are at the end and quote from here.
   Rules: ≤14 words a sentence, ≤40 prose words a rendered screen (DFM 292), full descriptive sentences (DFM 294), plain word before any technical one (DFM 335). */
window.S = {
  lesson: { code: 'J3 · Lesson 6', title: 'The Night Desk', slot: 'Data Newsroom' },
  rail: { donow: 'Do now', open: 'The job', c1: '1 · The question', c2: '2 · Two at once', c3: '3 · One week', c4: '4 · Either one', c5: '5 · Leave out', c6: '6 · The rush', front: 'Front page', close: 'Finish' },
  common: { next: 'Next', partOf: 'Part {n} of 9', minsLeft: '{m} minutes left', pause: 'Pause', paused: 'Paused. Nothing is lost.', resume: 'Carry on', here: 'You are here', xp: '{n} points', hintN: 'Hint {n} of 3', hint: 'Hint', ask: 'Ask the table', clear: 'Clear', showing: 'Showing {n} of {all} {what}', people: 'people', days: 'days', andMore: 'and {n} more rows', bank: 'Word bank. Click a word to put it in the question box.', boxHint: 'Type a rule, then press Enter' },
  stamp: { PRINT: 'PRINT', SPIKE: 'SPIKE', why: 'Why?', reasons: { numbers: 'The numbers say no', few: 'Too few people', cherry: 'Only the best bit', cause: 'One did not cause the other', backed: 'The numbers back it' }, confirm: 'Stamp it', missing: 'Pick a stamp and a reason first.', stamped: 'You stamped it {stamp}. Your reason: {reason}' },
  donow: { kicker: 'Do now', intro: 'Here are five quick questions from earlier lessons. Click an answer to see if it is right.', progress: 'Question {n} of 5', right: 'Right.', wrong: 'Not that one. The green one is right.', finish: 'You have done all five questions. Next is tonight’s job.', button: 'Start tonight' },
  opening: { kicker: 'Tonight', line1: 'Today you find out if a headline is telling the truth.', line2: 'You check it against the facts it came from.', line3: 'Social media, adverts and the news tell you things every day. Some of those things are not true.', button: 'Start' },
  story: { kicker: '10:02 pm · Dee Lavery, editor', from: 'D', b1: 'Fionn, our reporter, has gone home sick. He wrote six headlines and nobody has checked them.', b2: 'The paper prints at midnight. Nothing prints without a check.', b3: 'You are on the night desk tonight. The facts are in a table of data. You ask the table questions. Then you stamp each headline PRINT or SPIKE. PRINT sends it to the paper. SPIKE throws it out.', readAll: 'Read all six headlines', go: 'Open the desk' },
  facts: { kicker: 'What Fionn collected', intro: 'Fionn put his facts in two tables: grids of rows and columns. Every headline tonight comes from one of them.', t1: '60 people of Rathmore answered a survey.', t1cols: 'age · area · phone hours · sleep hours · exam score · café visits · pet · bus stars', t2: 'Table two holds 92 summer days at the harbour.', t2cols: 'date · temperature · rain · visitors · ice creams sold · sea rescues', button: 'Show me the desk' },
  tour: { kicker: 'The desk', s1: 'This is the table. It has sixty people. Each person is one row.', s2: 'This is the question box. Type a rule here, then press Enter. A rule is a question for the table. The table keeps only the rows that fit your rule.', s3: 'This is the count. It tells you how many rows are left.', next: 'Next', done: 'Got it' },
  c1: {
    title: 'The question', headline: 'Eight hours of sleep lifts exam scores', byline: 'Fionn · page 3',
    showKicker: 'Dee shows you', show1: 'A rule has a column, a sign and a number.', showDemo: 'age < 20', show2: 'age is the column. < means less than. It keeps people under 20.', show3: 'A rule is also called a query.',
    ask: 'Keep only the people who slept eight hours or more.', h1: 'The column is sleep_hours. The sign for eight or more is >=.', h2: 'Write the column, then the sign, then the number: sleep_hours, then >=, then 8.', h3: 'Type this, then press Enter.', h3code: 'sleep_hours >= 8',
    judge: { ok: 'Showing 17 of 60. Seventeen people slept eight hours or more.', wrong: 'Your rule shows {got} rows, but it should show 17. Check the sign.' },
    compareKicker: 'Now compare', compare1: 'Those 17 scored 61.0 on average.', compare2: 'The other 43 scored 65.3.', predict: 'Is the headline true?', options: ['No. The people who slept eight hours or more scored lower.', 'Yes. Sleep lifted the scores.'], right: 'Right. The numbers say the opposite.', wrong: 'Look again. The people who slept eight hours or more scored lower, not higher.',
    stampShowKicker: 'How Dee stamps', stampShow1: 'Fionn asked only three people.', stampShow2: 'Dee stamped it SPIKE, meaning do not print.', stampShow3: 'Her reason was too few people. Every stamp needs a reason.',
    stampAsk: 'Your turn. Stamp it, then pick a reason.', stampOk: 'SPIKE. The numbers say no. People who slept eight hours or more scored 61.0. Everyone else scored 65.3.', stampNo: 'Look at the two averages. Which group scored higher?', reasonNo: 'Seventeen people is enough to check. The averages show the headline is wrong.', doneLine: 'One headline checked. Five are left.'
  },
  c2: {
    title: 'Two at once', headline: 'Most Rathmore teens are on their phones five hours a day', byline: 'Fionn · page 1',
    showKicker: 'Dee shows you', show1: 'AND joins two rules. It keeps a row only when both are true.', showDemo: 'age < 20 AND pet = "dog"', show2: 'This keeps teens with a dog: 3 of 60.', show3: 'Words go in quotes. Numbers do not.',
    ask: 'Keep teens who use their phone five hours or more.', h1: 'For teens, use age < 20. For five hours or more, use phone_hours >= 5.', h2: 'Put AND between the two rules.', h3: 'Type this, then press Enter.', h3code: 'age < 20 AND phone_hours >= 5',
    judge: { ok: 'Showing 6 of 60. Six of the 18 teens use their phone that much.', wrong: 'Your rule shows {got} rows, but it should show 6. Check both rules.' },
    predict: 'Fionn wrote "most". Six of 18 is…', options: ['One in three', 'Most of them', 'Half of them'], right: 'Right. Six of eighteen is one in three.', wrong: 'Six of eighteen is one in three. One in three is not most.',
    stampAsk: 'Now stamp it, with a reason.', stampOk: 'SPIKE. The numbers say no: 6 of 18 is not most.', stampNo: 'Only six of the eighteen teens use their phone that much. Is that most?', reasonNo: 'Eighteen teens is enough to go on. The problem is the word "most".', doneLine: 'Two headlines checked.'
  },
  c3: {
    title: 'One week', headline: 'Rathmore harbour gets 3,000 visitors a day', byline: 'Fionn · page 2',
    showKicker: 'Dee shows you', show1: 'BETWEEN keeps every number from one end to the other, and both ends.', showDemo: 'temp_c BETWEEN 20 AND 22', show2: 'This rule keeps 16 days, from 20 to 22 degrees.', show3: 'Each row here is one summer day.',
    ask: 'Fionn only looked at days 40 to 46. Keep those days.', h1: 'The column is day_no.', h2: 'Write day_no, then BETWEEN, then the first day, then AND, then the last day.', h3: 'Type this, then press Enter.', h3code: 'day_no BETWEEN 40 AND 46',
    judge: { ok: 'Showing 7 of 92 days. These 7 days are regatta week, 10 to 16 July. That is the week of the harbour boat races.', wrong: 'Your rule shows {got} days, but it should show 7. Check both ends.' },
    compareKicker: 'Now compare', compare1: 'Those 7 days had 3,158 visitors a day.', compare2: 'All 92 days had 2,215 visitors a day.', predict: 'What did Fionn do?', options: ['Took the best week and called it the summer.', 'Added the days up wrong.', 'He did nothing wrong. 3,000 is the right number.'], right: 'Right. One good week is not the whole summer.', wrong: 'He took the best week and called it the summer.',
    stampAsk: 'Now stamp it, with a reason.', stampOk: 'SPIKE. Fionn used only the best week. Regatta week is not the whole summer.', stampNo: 'Fionn used seven days out of 92. Can seven days show the whole summer?', reasonNo: 'The numbers for that week are true. The problem is that Fionn picked the best week.', doneLine: 'Three headlines checked.'
  },
  c4: {
    title: 'Either one', headline: 'More than half of Rathmore people have a dog or a cat', byline: 'Fionn · page 5',
    showKicker: 'Dee shows you', show1: 'OR keeps a row when either rule is true.', showDemo: 'area = "Marsh" OR area = "Hill"', show2: 'This keeps the 30 people in Marsh or Hill.', show3: 'Each side of OR is a whole rule, with its own column and sign.',
    ask: 'Keep everyone with a dog or a cat.', h1: 'The column is pet. Words go in quotes: "dog".', h2: 'Type pet = "dog" OR pet = "cat". Each side is a full rule.', h3: 'Type this, then press Enter.', h3code: 'pet = "dog" OR pet = "cat"',
    judge: { ok: 'Showing 31 of 60. That is more than half.', wrong: 'Your rule shows {got} rows, but it should show 31. Write a full rule on each side of OR.' },
    predict: 'Is the headline true?', options: ['Yes. 31 of 60 is over half.', 'No. 31 is too few.'], right: 'Right. This one is true.', wrong: 'Thirty-one of sixty is over half. This one is true.',
    stampAsk: 'Now stamp it, with a reason.', stampOk: 'PRINT. The numbers back it: 31 of 60.', stampNo: 'Not every headline is wrong. 31 of 60 is over half.', reasonNo: 'This headline is true. The reason to print is that the numbers back it.', doneLine: 'Four headlines checked. One printed.'
  },
  c5: {
    title: 'Leave out', headline: 'Outside Old Town, everyone loves the new bus', byline: 'Fionn · page 4',
    showKicker: 'Dee shows you', show1: 'NOT reverses a rule. It keeps the rows the rule would throw out.', showDemo: 'NOT area = "Old Town"', show2: 'This keeps the 44 people who are not in Old Town.', show3: 'Type NOT before the rule.',
    ask: 'Keep people outside Old Town who gave the bus any stars.', h1: 'For outside Old Town, use NOT area = "Old Town". For any stars, use bus_stars > 0.', h2: 'Join the two with AND.', h3: 'Type this, then press Enter.', h3code: 'NOT area = "Old Town" AND bus_stars > 0',
    judge: { ok: 'Showing 4 of 60. Four people rated the bus at all.', wrong: 'Your rule shows {got} rows, but it should show 4. Type NOT first. Then type AND between the two rules.' },
    compareKicker: 'Now compare', compare1: 'All four gave five stars.', compare2: 'The other 40 people outside Old Town did not rate the bus.', predict: 'Fionn wrote "everyone". He had…', options: ['Ratings from four people', 'Ratings from 44 people', 'Ratings from all 60 people'], right: 'Right. Four people cannot tell us what all 44 think.', wrong: 'Four people rated it. They cannot tell us what all 44 think.',
    stampAsk: 'Now stamp it, with a reason.', stampOk: 'SPIKE. Too few people: only 4 of the 44 rated the bus.', stampNo: 'Only four of the 44 people rated the bus. Is that enough for "everyone"?', reasonNo: 'The four did love it. There are just too few of them.', doneLine: 'Five headlines checked.'
  },
  c6: {
    title: 'The rush', headline: 'Ice cream sales cause sea rescues', byline: 'Fionn · page 1',
    ring: 'This is Dee. One headline is left. The printing press starts in three minutes. If time runs out, the paper prints Fionn’s headline as he wrote it.', ringButton: 'Start the clock',
    intro: 'Fionn says more ice creams mean more sea rescues. Check the hot days, then the cold days.',
    ask1: 'Keep the hot days: 24 degrees or more.', h1a: 'The column is temp_c.', h1b: 'Twenty-four or more is >=.', h1c: 'Type this, then press Enter.', h1code: 'temp_c >= 24',
    judge1: { ok: 'Showing 27 of 92 days. On an average hot day, 290 ice creams were sold. There were 2.8 sea rescues.', wrong: 'Your rule shows {got} days, but it should show 27. Check the sign.' },
    ask2: 'Now keep the days under 18 degrees.', h2a: 'Under 18 is <.', h2b: 'Write temp_c, then <, then 18.', h2c: 'Type this, then press Enter.', h2code: 'temp_c < 18',
    judge2: { ok: 'Showing 28 of 92 days. On an average cold day, 91 ice creams were sold. There were 0.5 sea rescues.', wrong: 'Your rule shows {got} days, but it should show 28. Check the sign.' },
    stampAsk: 'Now stamp it, with a reason.', stampOk: 'SPIKE. Ice cream did not cause the rescues. Hot weather brought both.', stampNo: 'Both rise on hot days. Does one cause the other, or does the heat cause both?', reasonNo: 'The numbers are real, and there are enough days. Ask yourself what is causing what.',
    timeLeft: '{s} seconds until the press starts', timeUp: 'It is midnight and time is up. The press printed Fionn’s headline on page one.', printedKicker: 'Midnight', printedLine: 'The press printed Fionn’s headline. It is on page one.', morningKicker: 'The next morning', letter1: 'Dear Editor, I sell ice cream at the harbour.', letter2: 'Your front page blamed my cones for three rescues.', letter3: 'Hot days bring swimmers and my customers.', letter4: 'The hot weather caused it, not the ice cream. Marie Byrne.', letterButton: 'Fix the stamp',
    fixAsk: 'Stamp it again. Pick the right reason this time.', fixOk: 'You fixed it. The heat caused both. Nothing is lost.', doneLine: 'Six headlines checked. The press is printing the paper now.'
  },
  front: { kicker: 'Midnight', masthead: 'The Harbour Post', date: 'Rathmore · Saturday', intro: 'The page you made.', printedSub: 'Survey of 60 people', spikedTitle: 'Spiked headlines', byline: 'Night desk: {name}', you: 'you', rename: 'Type your name for the page', button: 'Finish the hour', wrongSub: 'Not checked · by Fionn' },
  close: {
    badgesTitle: 'Tonight',
    badges: [{ id: 'asker', name: 'First question', line: 'You wrote your first query.' }, { id: 'both', name: 'Two at once', line: 'You used AND.' }, { id: 'week', name: 'The week', line: 'You used BETWEEN.' }, { id: 'either', name: 'Either one', line: 'You used OR.' }, { id: 'rest', name: 'Leave out', line: 'You used NOT.' }, { id: 'rush', name: 'The rush', line: 'You beat the clock.' }],
    recapTitle: 'Remember these', recap: ['A query asks a table a question.', 'AND needs both rules. OR needs one.', 'BETWEEN keeps both ends.', 'NOT reverses a rule.', 'Before you print, check: enough people, the whole picture, the numbers, the cause.'],
    exitTitle: 'Last five questions', exitOf: 'Question {n} of 5', exitRight: 'Right.', exitWrong: 'Not that one. The green one is right.', exitDone: 'You have finished the last five questions.',
    exit: [
      { stem: 'Which rule keeps teens who live in Hill?', options: ['age < 20 AND area = "Hill"', 'age < 20 OR area = "Hill"', 'NOT age < 20'] },
      { stem: 'Fionn wrote that most teens use their phone five hours a day. Only six of the 18 teens do. Eighteen teens is enough people to check. Why does Dee spike the headline?', options: ['The numbers say no', 'Too few people', 'One did not cause the other'] },
      { stem: 'day_no BETWEEN 40 AND 46 keeps how many days?', options: ['7', '6', '40'] },
      { stem: 'Hot days have more ice cream sales and more sea rescues. Which sentence explains this best?', options: ['The heat causes both', 'Ice cream causes rescues', 'Rescued swimmers then buy ice cream'] },
      { stem: 'Which rule keeps everyone except Old Town?', options: ['NOT area = "Old Town"', 'area = "Old Town"', 'area = "Old" AND area = "Town"'] }],
    feltTitle: 'How did it go?', feltIntro: 'Answer honestly.', felt: ['I can write a rule with AND, OR or NOT.', 'I can say what BETWEEN keeps.', 'I can say why a headline gets spiked.'], feltScale: ['Not yet', 'Nearly', 'Yes'], difficulty: 'How hard was today?', difficultyScale: ['Easy', 'About right', 'Hard'], comment: 'A note for your teacher', send: 'Send and finish',
    freeTitle: 'Free time', freeIntro: 'Here are two more headlines from Fionn. Check them with your own rules.', reveal: 'What Dee thinks', people: 'People', days: 'Days',
    free: [{ headline: 'Harbour people visit the café most', table: 'people', hint: 'Try area = "Harbour" and read the café average.', reveal: 'People who live in Harbour average 7.9 café visits. Everyone else averages 7.4. These are almost the same, so Dee spikes the headline.' }, { headline: 'Rain keeps the visitors away', table: 'days', hint: 'Try rain_mm > 5, then rain_mm = 0. Read the visitors average.', reveal: 'Wet days had 1,846 visitors a day. Dry days had 2,559. The numbers back the headline, so Dee prints it.' }],
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
    "sub": "Today you find out if a headline is telling the truth. You check it against the facts it came from. Your feed, adverts and the news tell you things every day. Some are not true.",
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
      "Stuck? Press Hint. The last hint shows the rule.",
      "Hints never cost you anything."
    ],
    "notes": "SAY: this is your own hour. Stuck means press the hint button, not put your hand up."
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
      "When you reach the badges, you are nearly finished.",
      "Five last questions on today, then one about how it felt.",
      "Press Finish. Everything you did is saved."
    ],
    "notes": "SAY: when you see your badges, you have about ten minutes left. Finish the last questions."
  },
  {
    "id": "d8",
    "kind": "closer",
    "heading": "Before you leave",
    "sub": "See you in a fortnight.",
    "bullets": [
      "Your work is saved. You have nothing to hand in.",
      "Finished early? The last screen offers more to try."
    ],
    "notes": "SAY: everything is saved. See you in a fortnight."
  }
];
window.S.brief = {
  "purpose": [
    "The skill: asking a table a question by typing a rule. Pupils join rules with AND, OR, BETWEEN and NOT. They judge whether the numbers back a headline. They meet three ways that a true-looking pattern can mislead. The three ways are too few people, only the best bit, and one thing that did not cause the other.",
    "What the pupils make: six checked headlines. Each headline is stamped PRINT or SPIKE with a reason. The front page that results is shown on screen. Nothing prints on paper."
  ],
  "prepare": [
    {
      "title": "Nothing to print",
      "text": "Each pupil needs the link, signed in with their school account, and headphones if they have them. The deck is optional."
    },
    {
      "title": "Do not give away the story",
      "text": "The deck does not tell the newspaper story. Please do not describe what happens on screen. After the warm-up, the first screen says what the hour is for, in the same words as slide 1."
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
      "part": "Do-Now",
      "mins": 5,
      "text": "Pupils answer five questions from earlier lessons. The questions mark themselves. Nothing is recorded against the pupil.",
      "say": "Five warm-up questions. Click the answer you think is right."
    },
    {
      "part": "The job",
      "mins": 5,
      "text": "The first screen says what the hour is for. Then a short story begins. The pupils are shown the night desk, the screen where they work, in three stops.",
      "say": "Read every screen. Nothing happens until you press the button."
    },
    {
      "part": "Headlines 1 to 3",
      "mins": 20,
      "text": "Pupils type one rule, then a rule with AND, then a rule with BETWEEN. Every headline shows a worked example first. The hints get more help each time. The last hint shows the rule.",
      "say": "Stuck? Press Hint. The last hint shows you the rule."
    },
    {
      "part": "Headlines 4 and 5",
      "mins": 10,
      "text": "Pupils type a rule with OR, then a rule with NOT. Headline 4 is the one true headline of the night. The pupil must stamp it PRINT with the right reason.",
      "say": "Not every headline is wrong. Read the count before you stamp."
    },
    {
      "part": "Headline 6",
      "mins": 8,
      "text": "Part 6 has a three-minute clock. If the clock runs out, the wrong headline prints and a reader complains. The pupil then stamps it again. Nothing is lost.",
      "say": "If the clock runs out, you fix it on the next screen."
    },
    {
      "part": "Finishing",
      "mins": 12,
      "text": "The pupils see their front page, their badges and a recap. Then come five last questions and one question about how the hour went. Pupils who finish early get two more headlines to check.",
      "say": "When you reach the badges, you are nearly done."
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
      "what": "OR: either rule. This part has the one true headline."
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
      "what": "The front page, badges, a recap and five last questions"
    }
  ],
  "goesWrong": [
    {
      "q": "The table cannot read a pupil's rule.",
      "a": "The screen says what a rule needs: a column, a sign and a value. The last hint shows the full rule."
    },
    {
      "q": "A pupil leaves the quote marks off a word.",
      "a": "The table reads a word without quotes as text, so the rule still works. Every hint shows the quotes."
    },
    {
      "q": "The three-minute clock ran out.",
      "a": "The headline prints as it is. A reader complains. The pupil then stamps it again. Nothing is lost."
    },
    {
      "q": "A pupil stamps PRINT when it should be SPIKE.",
      "a": "The screen says why and asks again. There are five reasons to choose from."
    },
    {
      "q": "A pupil finishes early.",
      "a": "The last screen has two more headlines. The pupil checks them with their own rules."
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
  S.c6.compare1 = 'Hot days averaged 290 ice creams and 2.8 rescues.'; S.c6.compare2 = 'Cold days averaged 91 ice creams and 0.5 rescues.'; S.c6.printedStamp = 'PRINTED';
  S.front.corrected = 'corrected after printing'; S.close.freeOf = 'Headline {n} of 2';
})(window.S);

/* Added 26 Oct 2026 for the spec: strings the platform shows round the hour; the prototype does not render them. */
(function (S) { Object.assign(S.common, { welcomeBack: 'Welcome back. You were on {where}. The desk is exactly as you left it.', startAgain: 'Start again', outOfTime: 'Time is nearly up. Finish this headline. Then press Finish in the row of parts at the top. The parts you have not done stay open for next time.' }); })(window.S);
/* build additions (J3L6_BUILD_PROGRESS.md; listed in tools/record-tutorial/j3l6/string-edits.json): the plumbing's
   own lines, the dock, Welcome back, the review chips and the free-time average cards */
(function (S) {
  Object.assign(S.common, { soundOn: 'Sound is on', soundOff: 'Sound is off', lighter: 'The lesson is running in a simpler way on this computer.', carryOn: 'Carry on', nextTime: 'Leave it for next time', back: 'Back', avgCafe: 'These people average {v} café visits.', avgVisitors: 'These days average {v} visitors.' });
  Object.assign(S.c1, { stampShowCard: 'Harbour café is the town favourite', stampShowBy: 'Fionn · last night' });
})(window.S);
