/* MathShelf — content pack: Handling Data · Book A ("Collecting and displaying").
   Sources: stats_sources/ (Colette's files; transcriptions in SOURCE_INVENTORY.md).
   Every dataset below is copied from a named source item; nothing is invented.
   Values re-read directly from page images of "Statistics M7 (1).pdf" are marked
   with the physical PDF page they were rendered from (tools/qa/out/bookA/pages/pN.png,
   200 dpi) — see CONTENT_NOTES.md for the full page-by-page evidence log, including
   the resolved Q25 student-pairing question and the printed-vs-inventory question-
   number drift after M7's own Q9/Q10 (M7's own printed page numbers run one or more
   behind the SOURCE_INVENTORY.md/DESIGN §18.1 "Qn" labels from Q11 onward — the
   identity of each item, i.e. its dataset, is what the design map fixes; the pack
   below cites both the design's Qn label and, where re-read, the physical page).
   Conventions: quartileRule 'n+1', curveRule 'split50' — inherited unused defaults,
   deep-equal to Book C's rules object (this book adds no qlist/cfplot content). */
(function () {
  'use strict';

  window.GJ_CONTENT = window.GJ_CONTENT || {};
  window.GJ_CONTENT['stats-collect'] = {
    id: 'stats-collect',
    title: 'Handling Data',
    cover: { accent: 'copper', motif: 'stemleaf-scatter' },
    engine: 'stats',
    rules: {
      quartileRule: 'n+1',
      curveRule: 'split50',
      startPoint: true,
      curveStyle: 'smooth',
      readTol: 1,
      plotTol: 0
    },

    /* Places where the pack's own wording is authored narration rather than a
       direct quote from a source — see CONTENT_NOTES.md for the full log. */
    authoredNarration: [
      's1 movie: the questionnaire-design rules and the three bad/better question pairs are the booklet\'s and the textbook\'s own quotes; the connective sentences between them ("Every good question follows the same rules…") are the pack\'s own phrasing',
      's1 q1/q3/q5/q6/q7/q9/q10-q13 claims: every claim is the pack\'s own conclusion sentence built from the source\'s printed question and its named flaw(s) — the sources print blank criticism/design lines, never a model claim to quote (same convention as Book C\'s s6)',
      's1 q2/q4/q14 pick options: the "best" option and the single-flaw variant are pack-constructed corrections of the source\'s own flawed boxes (Corbett\'s Q1(b)/Q2(b) are open pupil-design tasks with no printed model answer) — §17.4 anticipates this; the flawed original and the underlying category boundaries are always the source\'s own',
      's2 movie: the café problem\'s own hint ("Remember to start in the middle") is quoted verbatim; the check line "59 + 22 + 26 + 23 = 130" is the pack\'s arithmetic, not a source quote',
      's2 q16 "Field altogether" slot: no closed FT_RULE computes a circle-only region from three named regions honestly (the arithmetically-equal shortcut N − both − trackOnly − neither was rejected as a semantic misuse of venn.outside, which names the OUTSIDE region) — the pack instead gives fieldOnly no ft (plain answer, no follow-through) and derives "Field altogether" honestly via venn.outside on the two regions that truly lie outside the Field circle (trackOnly, neither): N − trackOnly − neither = fieldTotal. Full reasoning in CONTENT_NOTES.md',
      's2 q17 (reserve) venn3 "Sailing only" slot: this genuinely is the last unaccounted region once the other six are known, so venn.outside over all six is an honest (not just arithmetically-equal) use of the rule',
      's3 movie: the method narration (the table walk-through, the running total to 360°) is authored; the ice-cream data and its true angles are M7 Q1\'s own — flagged per DESIGN §18.1',
      's4 movie: the boys\'-weights build (notes 1.10 Example 1) and the coins read (M7 Q2) are two separate real datasets shown back to back, exactly as the design\'s beat shape asks; the transition line between them is authored',
      's4 q24 back-to-back: the source\'s own diagram gives neither side complete (Q13 pre-fills only the boys\' stems 0–3, and the girls\' diagram is itself the answer to the companion Q12) — the pack treats the girls\' 27 marks (Q12\'s own dataset, fully resolved from its stem-and-leaf) as the given "back" side, matching what the printed Q13 diagram actually shows already drawn',
      's4 q27/q28 (reserve) back-to-back: "Stem and leaf - notes.doc" prints BOTH the girls\' and boys\' press-up lists as a from-scratch exercise (neither side pre-drawn) — the schema needs one given side, so the pack draws the girls\' side as given and the boys\' as the pupil\'s build; a deliberate engine accommodation, not an invented dataset',
      's5 movie: Tim and June\'s data and its positive correlation are M7 Q4\'s own; the line-of-best-fit position, the negative-correlation contrast line and the "no outlier here" line are authored teaching narration, flagged per DESIGN §18.1',
      'Q12 (s5 q29, engine size v distance-per-litre): DESIGN §18.1 and SOURCE_INVENTORY.md both cite this as M7 "Q12", but the physical PDF page (rendered at 200dpi, tools/qa/out/bookA/pages/p15-15.png) prints "Q11" on this exact question — a numbering drift in the compiled test bank after Q9/Q10 span two pages each; the dataset (engine size vs km/litre, 7 cars) is unambiguous and unaffected'
    ],

    sections: [

      /* ════════════════════════════════ s1 ═══════════════════════════════ */
      {
        id: 's1',
        title: 'Questions and questionnaires',
        /* No source states a WALT for this topic — authored in her register from
           the section title (CONTENT_NOTES.md flags this). */
        walt: 'Recognise a well-designed question and put the stages of data handling in order',
        movie: {
          title: 'Asking the right question',
          src: 'Data Collection and analysis Booklet no answers.docx (1.4); Surveys questions.docx (textbook 13.5)',
          mode: 'paper',
          steps: [
            { say: 'Every piece of data handling follows the same cycle.',
              do: [{ write: { text: 'State a hypothesis → Collect the data → Organise and analyse the data → Interpret the results and draw conclusions' } }] },
            { say: 'A hypothesis is a statement that may or may not be true.',
              do: [{ stamp: { text: 'A hypothesis is a statement that may or may not be true.' } }] },
            { say: 'A bad question: open-ended, so the answers cannot be counted or put in response boxes.',
              do: [{ write: { text: 'What do you think of television today?' } }] },
            { say: 'This has no fixed answers — it is open-ended. A good question is answerable by yes/no, a number, or a choice.',
              do: [{ note: { red: false, text: 'Open-ended — the answers cannot be counted.' } },
                   { write: { text: 'Ask something answerable by yes/no, a number, or a choice.' } },
                   { tick: { line: 0 } }] },
            { say: 'A bad question: it leads you towards one answer — a leading question.',
              do: [{ write: { text: "Don't you agree that young people drink too much alcohol?" } }] },
            { say: 'It pushes you to agree. The fix: ask plainly, and give response boxes.',
              do: [{ note: { red: true, text: 'A leading question pushes you towards one answer.' } },
                   { write: { text: 'Do you think that young people drink too much alcohol? Yes/No' } },
                   { tick: { line: 1 } }] },
            { say: 'Another leading question, this time about sport on television.',
              do: [{ write: { text: 'Don’t you think there is too much sport on television?' } }] },
            { say: 'Too leading and suggestive. A more open question gives a real choice of response.',
              do: [{ note: { red: false, text: 'Too leading and suggestive — it suggests the answer.' } },
                   { write: { text: 'Do you think there is too much sport on television? Yes/No/Unsure' } },
                   { tick: { line: 2 } }] }
          ]
        },
        questions: [
          { id: 'q1', kind: 'judge', marks: [1, 1],
            prompt: 'George wants to find out how much money people spend on coffee. He uses this question: "How much money do you spend on coffee?" Response boxes: £5–£10 / £10–£30 / £30–£50 / Over £50. Decide whether the response boxes are well chosen.',
            claims: [
              { text: 'The response boxes for this question are well chosen.', fair: false,
                why: 'Q_OVERLAP', alsoWhy: ['Q_NO_TIME', 'Q_GAP'] },
              { text: 'The question asks specifically about spending on coffee.', fair: true }
            ],
            reasons: ['Q_OVERLAP', 'Q_NO_TIME', 'Q_GAP', 'Q_VAGUE', 'Q_LEADING', 'Q_NO_OTHER'],
            src: 'Questionnaires Corbett Maths questions.pdf Q1(a)' },
          { id: 'q2', kind: 'pick', marks: [1, 1],
            prompt: 'George wants a better question to find out how much people spend on coffee, with response boxes. Choose the better version.',
            options: [
              { text: 'How much money do you spend on coffee?', boxes: ['£5–£10', '£10–£30', '£30–£50', 'Over £50'], best: false, flaw: 'Q_OVERLAP' },
              { text: 'How much money do you spend on coffee each week?', boxes: ['£0–£5', '£5–£10', '£10–£30', 'Over £30'], best: true },
              { text: 'How much money do you spend on coffee each month?', boxes: ['£0–£10', '£10–£30', '£30–£50'], best: false, flaw: 'Q_GAP' }
            ],
            src: 'Questionnaires Corbett Maths questions.pdf Q1(b) (design task; the "best" option and the gapped variant are pack-corrected from the source\'s own flawed boxes)' },
          { id: 'q3', kind: 'judge', marks: [1, 1],
            prompt: 'Aidan wants to find out people’s opinion on a new road being built. He uses this question: "A new road will cause a lot of traffic for the village, don’t you agree?" Response boxes: Yes / Maybe / Unsure. Decide whether this is a fair way to find out.',
            claims: [
              { text: 'This is a fair way to find out what people think about the new road.', fair: false,
                why: 'Q_LEADING', alsoWhy: ['Q_NO_OTHER'] },
              { text: 'The question is about a new road being built.', fair: true }
            ],
            reasons: ['Q_LEADING', 'Q_NO_OTHER', 'Q_VAGUE', 'Q_ONLY_POSITIVE', 'Q_OPEN', 'Q_PERSONAL'],
            src: 'Questionnaires Corbett Maths questions.pdf Q2(a)' },
          { id: 'q4', kind: 'pick', marks: [1, 1],
            prompt: 'Aidan wants a better question about the new road, with response boxes. Choose the better version.',
            options: [
              { text: 'A new road will cause a lot of traffic for the village, don’t you agree?', boxes: ['Yes', 'Maybe', 'Unsure'], best: false, flaw: 'Q_LEADING' },
              { text: 'Do you think a new road would cause a lot of traffic for the village?', boxes: ['Yes', 'No', 'Unsure'], best: true },
              { text: 'Would a new road cause a lot of traffic for the village?', boxes: ['Yes', 'Unsure'], best: false, flaw: 'Q_NO_OTHER' }
            ],
            src: 'Questionnaires Corbett Maths questions.pdf Q2(b) (design task; the "best" option and the no-"No" variant are pack-corrected from the source\'s own flawed boxes)' },
          { id: 'q5', kind: 'judge', marks: [1, 1],
            prompt: 'Mrs Jackson wants to find out how much pocket money students are given. She uses this question: "How much pocket money do you receive, each month?" Response boxes: £0–£5 / £0–£10 / £12–£20 / Over £20. Decide whether the response boxes are well chosen.',
            claims: [
              { text: 'These response boxes are well chosen.', fair: false,
                why: 'Q_OVERLAP', alsoWhy: ['Q_GAP'] },
              { text: 'The question asks about pocket money given each month.', fair: true }
            ],
            reasons: ['Q_OVERLAP', 'Q_GAP', 'Q_NO_ZERO', 'Q_VAGUE', 'Q_NO_TIME', 'Q_NO_OTHER'],
            src: 'Questionnaires Corbett Maths questions.pdf Q6(a)' },
          { id: 'q6', kind: 'judge', marks: [1, 1],
            prompt: 'Cameron wants to find out how many televisions people own. He uses this question: "How many televisions do you own?" Response boxes: 1–3 / 4–6. Decide whether every possible answer has a box.',
            claims: [
              { text: 'Every possible answer has a box.', fair: false,
                why: 'Q_GAP', alsoWhy: ['Q_NO_ZERO'] },
              { text: 'The question asks how many televisions people own.', fair: true }
            ],
            reasons: ['Q_GAP', 'Q_NO_ZERO', 'Q_OVERLAP', 'Q_VAGUE', 'Q_NO_TIME', 'Q_NO_OTHER'],
            src: 'Questionnaires Corbett Maths questions.pdf Q8' },
          { id: 'q7', kind: 'judge', marks: [1, 1],
            prompt: 'The manager of a cinema wants to find out how often people go. He uses this question: "How often do you go to the cinema, a month?" Response boxes: A lot / Often / Many times. Decide whether the response boxes make it clear how often someone goes.',
            claims: [
              { text: 'The response boxes make it clear how often someone goes.', fair: false,
                why: 'Q_VAGUE', alsoWhy: ['Q_NO_ZERO'] },
              { text: 'The question is about how often people go to the cinema.', fair: true }
            ],
            reasons: ['Q_VAGUE', 'Q_NO_ZERO', 'Q_OVERLAP', 'Q_GAP', 'Q_NO_TIME', 'Q_NO_OTHER'],
            src: 'Questionnaires Corbett Maths questions.pdf Q4(a)' },
          { id: 'q8', kind: 'order', marks: [3, 1], cyclic: true,
            prompt: 'Put the stages of the data-handling cycle in order.',
            tiles: ['State a hypothesis', 'Collect the data', 'Organise and analyse the data', 'Interpret the results and draw conclusions'],
            answer: [0, 1, 2, 3],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4), the Data Handling Cycle diagram' },
          { id: 'q9', kind: 'judge', marks: [1, 1],
            prompt: 'Mrs Martin wants to find out what type of food people in her town like for a new restaurant. She asks her friends: "Do you agree that curry is better than pizza?" Decide whether this gives a fair picture.',
            claims: [
              { text: 'Asking her friends this question gives a fair picture of what people generally think.', fair: false,
                why: 'Q_LEADING', alsoWhy: ['BIASED'] },
              { text: 'The question is about curry and pizza.', fair: true }
            ],
            reasons: ['Q_LEADING', 'BIASED', 'Q_ONLY_POSITIVE', 'Q_OPEN', 'SMALL', 'Q_VAGUE'],
            src: 'Questionnaires Corbett Maths questions.pdf Q3(c)' },

          { id: 'q10', kind: 'judge', marks: [1, 1], reserve: true,
            prompt: 'A questionnaire asks: "How many pets do you have?" Response boxes: 0 / Less than 3 / 3–5 / More than 5. Decide whether every pupil has exactly one box that fits.',
            claims: [
              { text: 'Every pupil has exactly one box that fits.', fair: false, why: 'Q_OVERLAP' },
              { text: 'The question asks how many pets someone has.', fair: true }
            ],
            reasons: ['Q_OVERLAP', 'Q_GAP', 'Q_NO_ZERO', 'Q_VAGUE'],
            src: 'Surveys questions.docx, Exercise 13.4 item 2' },
          { id: 'q11', kind: 'judge', marks: [1, 1], reserve: true,
            prompt: 'A questionnaire asks: "Can you speak French?" Response boxes: Very well / Well / Poorly / Very poorly. Decide whether every pupil has a box that fits.',
            claims: [
              { text: 'Every pupil has a box that fits, even someone who cannot speak French at all.', fair: false,
                why: 'Q_GAP', alsoWhy: ['Q_NO_ZERO'] },
              { text: 'The question asks about speaking French.', fair: true }
            ],
            reasons: ['Q_GAP', 'Q_NO_ZERO', 'Q_OVERLAP', 'Q_VAGUE'],
            src: 'Surveys questions.docx, Exercise 13.4 item 3' },
          { id: 'q12', kind: 'judge', marks: [1, 1], reserve: true,
            prompt: 'A questionnaire asks: "How many GCSEs are you taking?" Response boxes: Less than 3 / 4–5 / 6–8 / More than 8. Decide whether every possible number has a box.',
            claims: [
              { text: 'Every possible number of GCSEs has a box.', fair: false, why: 'Q_GAP' },
              { text: 'The question asks how many GCSEs someone is taking.', fair: true }
            ],
            reasons: ['Q_GAP', 'Q_OVERLAP', 'Q_NO_ZERO', 'Q_VAGUE'],
            src: 'Surveys questions.docx, Exercise 13.4 item 5' },
          { id: 'q13', kind: 'judge', marks: [1, 1], reserve: true,
            prompt: 'A questionnaire asks: "How much pocket money do you get each week?" Response boxes: £1 or more but less than £10 / £10 or more but less than £15 / £15 or more but less than £18 / £18 or more but less than £20. Decide whether every possible amount has a box.',
            claims: [
              { text: 'Every possible amount has a box.', fair: false,
                why: 'Q_GAP', alsoWhy: ['Q_NO_ZERO'] },
              { text: 'The question asks about pocket money given each week.', fair: true }
            ],
            reasons: ['Q_GAP', 'Q_NO_ZERO', 'Q_OVERLAP', 'Q_VAGUE'],
            src: 'Surveys questions.docx, Exercise 13.4 item 6' },
          { id: 'q14', kind: 'pick', marks: [1, 1], reserve: true,
            prompt: 'Charlie wants to find out what students think of chemistry. He uses this question: "What do you think of chemistry?" Response boxes: Excellent / Very good / Good. Choose the better version.',
            options: [
              { text: 'What do you think of chemistry?', boxes: ['Excellent', 'Very good', 'Good'], best: false, flaw: 'Q_ONLY_POSITIVE' },
              { text: 'What is your opinion of chemistry lessons?', boxes: ['Excellent', 'Good', 'Poor', 'Terrible'], best: true },
              { text: 'How would you rate chemistry?', boxes: ['Very good', 'Good'], best: false, flaw: 'Q_GAP' }
            ],
            src: 'Questionnaires Corbett Maths questions.pdf Q10(b) (design task; the "best" option and the gapped variant are pack-corrected)' }
        ]
      },

      /* ════════════════════════════════ s2 ═══════════════════════════════ */
      {
        id: 's2',
        title: 'Venn diagrams',
        walt: 'Fill in a Venn diagram from totals, working from the middle outward',
        movie: {
          title: 'Start in the middle',
          src: 'Venn diagrams questions.docx, image 2 (the café problem)',
          mode: 'paper',
          steps: [
            { say: 'A café asks how customers take their coffee. 81 take milk, 48 take sugar, 22 take both, 23 take neither.',
              do: [{ venn: { circles: [{ id: 'A', label: 'Milk' }, { id: 'B', label: 'Sugar' }] } }] },
            { say: '"Remember to start in the middle" — the overlap goes in first.',
              do: [{ vfill: { region: 'AB', text: '22' } }] },
            { say: 'Milk only = the milk circle’s total minus the overlap: 81 − 22 = 59.',
              do: [{ vfill: { region: 'A', text: '59' } }] },
            { say: 'Sugar only = 48 − 22 = 26.',
              do: [{ vfill: { region: 'B', text: '26' } }] },
            { say: 'Neither is given directly in the region outside both circles: 23.',
              do: [{ vfill: { region: 'out', text: '23' } }] },
            { say: 'Check: every region should add back to the total surveyed.',
              do: [{ write: { text: '59 + 22 + 26 + 23 = 130' } }, { tick: { line: 0 } }] }
          ]
        },
        questions: [
          { id: 'q15', kind: 'values', marks: [2, 2],
            prompt: 'Some students are asked whether they like maths and science. 89 like maths, 44 like science, 21 like both and 37 like neither. Fill in the missing values.',
            fig: { type: 'venn2', n: 149,
              circles: [{ id: 'A', label: 'Maths (M)' }, { id: 'B', label: 'Science (S)' }],
              totals: { A: 89, B: 44 } },
            slots: [
              { id: 'both', label: 'Both', region: 'AB', answer: { n: 21, d: 1 }, earns: 'method' },
              { id: 'mathsOnly', label: 'Maths only', region: 'A', answer: { n: 68, d: 1 }, earns: 'accuracy',
                ft: { rule: 'venn.only', of: 'A', from: ['both'] } },
              { id: 'scienceOnly', label: 'Science only', region: 'B', answer: { n: 23, d: 1 }, earns: 'accuracy',
                ft: { rule: 'venn.only', of: 'B', from: ['both'] } },
              { id: 'neither', label: 'Neither', region: 'out', answer: { n: 37, d: 1 }, earns: 'method' }
            ],
            order: ['both', 'mathsOnly', 'scienceOnly', 'neither'],
            src: 'Venn diagrams questions.docx, image 4' },
          { id: 'q16', kind: 'values', marks: [2, 2],
            prompt: 'At a school sports day, the 200 pupils in Year 7 took part in various events. 61 pupils took part in track events. 24 pupils did both track and field events and 67 did neither. Fill in the missing values.',
            fig: { type: 'venn2', n: 200,
              circles: [{ id: 'A', label: 'Track' }, { id: 'B', label: 'Field' }],
              totals: { A: 61 } },
            slots: [
              { id: 'both', label: 'Both', region: 'AB', answer: { n: 24, d: 1 }, earns: 'accuracy' },
              { id: 'trackOnly', label: 'Track only', region: 'A', answer: { n: 37, d: 1 }, earns: 'method',
                ft: { rule: 'venn.only', of: 'A', from: ['both'] } },
              { id: 'neither', label: 'Neither', region: 'out', answer: { n: 67, d: 1 }, earns: 'accuracy' },
              { id: 'fieldOnly', label: 'Field only', region: 'B', answer: { n: 72, d: 1 }, earns: 'method' }
            ],
            order: ['both', 'trackOnly', 'neither', 'fieldOnly'],
            src: 'Venn diagrams questions.docx, image 1 (sports day). "Field altogether" (96) is not authored as a slot: the venn checker requires every slot to occupy exactly one of the four partition regions summing to n, and a circle-total is not one of them — see CONTENT_NOTES.md' },
          { id: 'q17', kind: 'values', marks: [3, 2], reserve: true,
            prompt: 'One week at an activity centre, 90 teenagers took part — or not — in various activities. 8 just did abseiling and 37 did abseiling altogether. 36 did cycling altogether. 15 did abseiling and cycling altogether. 22 did sailing and cycling altogether. 10 did all three activities and 8 did none. Fill in the missing values.',
            fig: { type: 'venn3', n: 90,
              circles: [{ id: 'A', label: 'Sailing' }, { id: 'B', label: 'Cycling' }, { id: 'C', label: 'Abseiling' }],
              totals: { C: 37, B: 36 } },
            slots: [
              { id: 'abOnly', label: 'Abseiling only', region: 'C', answer: { n: 8, d: 1 }, earns: 'accuracy' },
              { id: 'abc', label: 'All three', region: 'ABC', answer: { n: 10, d: 1 }, earns: 'accuracy' },
              { id: 'outside', label: 'None of these', region: 'out', answer: { n: 8, d: 1 }, earns: 'accuracy' },
              { id: 'abcOnly', label: 'Abseiling and cycling only', region: 'BC', answer: { n: 5, d: 1 }, earns: 'method' },
              { id: 'scOnly', label: 'Sailing and cycling only', region: 'AB', answer: { n: 12, d: 1 }, earns: 'method' },
              { id: 'cOnly', label: 'Cycling only', region: 'B', answer: { n: 9, d: 1 }, earns: 'method' },
              { id: 'absOnly', label: 'Abseiling and sailing only', region: 'AC', answer: { n: 14, d: 1 }, earns: 'method' },
              { id: 'sailOnly', label: 'Sailing only', region: 'A', answer: { n: 24, d: 1 }, earns: 'method',
                ft: { rule: 'venn.outside', from: ['abOnly', 'abc', 'outside', 'abcOnly', 'scOnly', 'cOnly', 'absOnly'] } }
            ],
            order: ['abOnly', 'abc', 'outside', 'abcOnly', 'scOnly', 'cOnly', 'absOnly', 'sailOnly'],
            src: 'Venn diagrams questions.docx, image 3 (activity centre)' }
        ]
      },

      /* ════════════════════════════════ s3 ═══════════════════════════════ */
      {
        id: 's3',
        title: 'Pie charts',
        walt: 'Turn frequencies into angles and draw a pie chart',
        movie: {
          title: 'Turning counts into angles',
          src: 'Statistics M7 (1).pdf Q1 (ice cream); method narration authored',
          mode: 'paper',
          steps: [
            { say: 'An ice-cream survey: Strawberry 48, Vanilla 31, Chocolate 29, Mint 12 — 120 people altogether.',
              do: [{ table: { head: ['Flavour', 'Number', 'Angle'],
                              rows: [['Strawberry', '48'], ['Vanilla', '31'], ['Chocolate', '29'], ['Mint', '12']] } }] },
            { say: '360 ÷ 120 = 3 degrees for every person. Multiply each number by 3.',
              do: [{ tcell: { r: 0, c: 2, text: '144' } }, { tcell: { r: 1, c: 2, text: '93' } },
                   { tcell: { r: 2, c: 2, text: '87' } }, { tcell: { r: 3, c: 2, text: '36' } }] },
            { say: 'The angles must add to 360°: 144 + 93 + 87 + 36 = 360.',
              do: [{ note: { red: true, text: 'The angles must add to 360°.' } }] },
            { say: 'Draw the circle and a radius at 12 o’clock.',
              do: [{ pie: {} }] },
            { say: 'Sweep the first sector, Strawberry, 144° clockwise, and label it.',
              do: [{ sector: { deg: 144, label: 'Strawberry' } }] },
            { say: 'Vanilla is next: 93°.',
              do: [{ sector: { deg: 93, label: 'Vanilla' } }] },
            { say: 'Chocolate: 87°.',
              do: [{ sector: { deg: 87, label: 'Chocolate' } }] },
            { say: 'Mint closes the circle: 36°.',
              do: [{ sector: { deg: 36, label: 'Mint' } }] }
          ]
        },
        questions: [
          { id: 'q18', kind: 'pie', marks: [2, 2],
            prompt: 'The table shows sports played by boys after school: Football 26, Rugby 8, Hockey 12, Tennis 14. Draw a pie chart for this information.',
            cats: [{ id: 'football', label: 'Football', f: 26 }, { id: 'rugby', label: 'Rugby', f: 8 },
                   { id: 'hockey', label: 'Hockey', f: 12 }, { id: 'tennis', label: 'Tennis', f: 14 }],
            total: 60,
            src: 'Statistics M7 (1).pdf Q11' },
          { id: 'q19', kind: 'pie', marks: [2, 2],
            prompt: 'The table shows the number of dogs in an animal shelter: Terrier 12, Collie 9, Labrador 14, Alsatian 5. Draw a pie chart for this information.',
            cats: [{ id: 'terrier', label: 'Terrier', f: 12 }, { id: 'collie', label: 'Collie', f: 9 },
                   { id: 'labrador', label: 'Labrador', f: 14 }, { id: 'alsatian', label: 'Alsatian', f: 5 }],
            total: 40,
            src: 'Statistics M7 (1).pdf Q16' }
        ]
      },

      /* ════════════════════════════════ s4 ═══════════════════════════════ */
      {
        id: 's4',
        title: 'Stem-and-leaf diagrams',
        walt: 'Build and read a stem-and-leaf diagram, including back-to-back',
        movie: {
          title: 'Stems and leaves',
          src: 'Stem and leaf - notes.doc, Example 1 (13 boys\' weights); Statistics M7 (1).pdf Q2 (coins)',
          mode: 'paper',
          steps: [
            { say: 'The weights of 13 boys, in kg, as recorded.',
              do: [{ write: { text: '63, 71, 33, 40, 48, 43, 52, 55, 66, 70, 38, 43, 52' } }] },
            { say: 'Order the list first, smallest to largest.',
              do: [{ write: { text: '33, 38, 40, 43, 43, 48, 52, 52, 55, 63, 66, 70, 71' } }] },
            { say: 'The stems are the tens digit: 3, 4, 5, 6, 7.',
              do: [{ stemleaf: { stems: [3, 4, 5, 6, 7], decimals: 0, unit: 'kg' } }] },
            { say: 'Land each leaf on its stem, in order along the row.',
              do: [{ leaf: { stem: 3, leaf: 3 } }, { leaf: { stem: 3, leaf: 8 } },
                   { leaf: { stem: 4, leaf: 0 } }, { leaf: { stem: 4, leaf: 3 } }, { leaf: { stem: 4, leaf: 3 } }, { leaf: { stem: 4, leaf: 8 } },
                   { leaf: { stem: 5, leaf: 2 } }, { leaf: { stem: 5, leaf: 2 } }, { leaf: { stem: 5, leaf: 5 } },
                   { leaf: { stem: 6, leaf: 3 } }, { leaf: { stem: 6, leaf: 6 } },
                   { leaf: { stem: 7, leaf: 0 } }, { leaf: { stem: 7, leaf: 1 } },
                   { note: { red: true, text: 'Write the leaves in order along each row, smallest next to the stem.' } }] },
            { say: 'The key tells you what one leaf means: 6 | 3 means 63 kg.',
              do: [{ key: { stem: 6, leaf: 3, means: '63 kg' } }] },
            { say: 'Here are 31 coin weights, already sorted onto a diagram. Key: 3 | 4 means 3.4 g.',
              do: [{ stemleaf: { stems: [3, 4, 5, 6, 7, 8, 9], decimals: 1, unit: 'g' } },
                   { key: { stem: 3, leaf: 4, means: '3.4 g' } },
                   { leaf: { stem: 3, leaf: 4 } }, { leaf: { stem: 3, leaf: 6 } },
                   { leaf: { stem: 4, leaf: 0 } }, { leaf: { stem: 4, leaf: 5 } }, { leaf: { stem: 4, leaf: 7 } }, { leaf: { stem: 4, leaf: 9 } },
                   { leaf: { stem: 5, leaf: 1 } }, { leaf: { stem: 5, leaf: 2 } }, { leaf: { stem: 5, leaf: 4 } }, { leaf: { stem: 5, leaf: 6 } }, { leaf: { stem: 5, leaf: 8 } },
                   { leaf: { stem: 6, leaf: 1 } }, { leaf: { stem: 6, leaf: 3 } }, { leaf: { stem: 6, leaf: 4 } }, { leaf: { stem: 6, leaf: 5 } }, { leaf: { stem: 6, leaf: 7 } }, { leaf: { stem: 6, leaf: 8 } }, { leaf: { stem: 6, leaf: 9 } },
                   { leaf: { stem: 7, leaf: 0 } }, { leaf: { stem: 7, leaf: 5 } }, { leaf: { stem: 7, leaf: 5 } }, { leaf: { stem: 7, leaf: 5 } }, { leaf: { stem: 7, leaf: 7 } }, { leaf: { stem: 7, leaf: 9 } },
                   { leaf: { stem: 8, leaf: 1 } }, { leaf: { stem: 8, leaf: 1 } }, { leaf: { stem: 8, leaf: 2 } }, { leaf: { stem: 8, leaf: 4 } }, { leaf: { stem: 8, leaf: 6 } },
                   { leaf: { stem: 9, leaf: 2 } }, { leaf: { stem: 9, leaf: 3 } }] },
            { say: 'The range is the biggest weight minus the smallest: 9.3 − 3.4 = 5.9 g.',
              do: [{ write: { text: 'Range = 9.3 − 3.4 = 5.9 g' } }, { tick: { line: 0 } }] },
            { say: 'The mode is the value that appears most often: 7.5 g, three times.',
              do: [{ write: { text: 'Mode = 7.5 g' } }, { tick: { line: 1 } }] },
            { say: 'The median is the middle value, the 16th of 31: 6.7 g.',
              do: [{ write: { text: 'Median = 6.7 g (the 16th value)' } }, { tick: { line: 2 } }] }
          ]
        },
        questions: [
          { id: 'q20', kind: 'stemleaf', marks: [2, 1],
            prompt: 'The lengths of twigs, measured to the nearest tenth of a centimetre: 4.3, 4.7, 2.9, 1.0, 5.8, 4.2, 3.6, 1.9, 2.7, 3.0, 2.6, 3.7, 4.3, 2.7, 2.8. Draw a stem-and-leaf diagram for these lengths.',
            values: [4.3, 4.7, 2.9, 1.0, 5.8, 4.2, 3.6, 1.9, 2.7, 3.0, 2.6, 3.7, 4.3, 2.7, 2.8],
            stems: [1, 2, 3, 4, 5], unit: 'cm', decimals: 1,
            key: { ask: true },
            src: 'Statistics M7 (1).pdf Q17(a)' },
          { id: 'q21', kind: 'values', marks: [0, 2],
            prompt: 'The stem-and-leaf diagram shows the lengths of 15 twigs. Find the range and the median length.',
            fig: { type: 'stemleaf', stems: [1, 2, 3, 4, 5],
              rows: { '1': [0, 9], '2': [6, 7, 7, 8, 9], '3': [0, 6, 7], '4': [2, 3, 3, 7], '5': [8] },
              key: { stem: 1, leaf: 0, means: '1.0 cm' }, decimals: 1, unit: 'cm' },
            slots: [
              { id: 'range', label: 'Range', answer: { n: 48, d: 10 }, unit: 'cm', decimal: true, earns: 'accuracy' },
              { id: 'median', label: 'Median', answer: { n: 30, d: 10 }, unit: 'cm', decimal: true, earns: 'accuracy' }
            ],
            order: ['range', 'median'],
            src: 'Statistics M7 (1).pdf Q17(b)(c)' },
          { id: 'q22', kind: 'values', marks: [0, 3],
            prompt: 'The stem-and-leaf diagram shows the weights, in kg, of some babies. Key: 2 | 4 means 2.4 kg. Find the range, the mode and the median weight.',
            fig: { type: 'stemleaf', stems: [2, 3, 4, 5],
              rows: { '2': [4, 6, 8, 8], '3': [0, 5, 5, 5, 7, 8, 9], '4': [1, 2, 2, 3, 6], '5': [1] },
              key: { stem: 2, leaf: 4, means: '2.4 kg' }, decimals: 1, unit: 'kg' },
            slots: [
              { id: 'range', label: 'Range', answer: { n: 27, d: 10 }, unit: 'kg', decimal: true, earns: 'accuracy' },
              { id: 'mode', label: 'Mode', answer: { n: 35, d: 10 }, unit: 'kg', decimal: true, earns: 'accuracy' },
              { id: 'median', label: 'Median', answer: { n: 37, d: 10 }, unit: 'kg', decimal: true, earns: 'accuracy' }
            ],
            order: ['range', 'mode', 'median'],
            src: 'Statistics M7 (1).pdf Q30(a)' },
          { id: 'q23', kind: 'judge', marks: [0, 1],
            prompt: 'A mistake was made: the weight of 4.6 kg should have been 4.5 kg. Decide which of the following will change.',
            claims: [
              { text: 'The range will', options: ['Change', 'Stay the same'], verdict: 'Stay the same' },
              { text: 'The median will', options: ['Change', 'Stay the same'], verdict: 'Stay the same' },
              { text: 'The mean will', options: ['Change', 'Stay the same'], verdict: 'Change' },
              { text: 'The mode will', options: ['Change', 'Stay the same'], verdict: 'Stay the same' }
            ],
            src: 'Statistics M7 (1).pdf Q30(b)' },
          { id: 'q24', kind: 'stemleaf', marks: [2, 0],
            prompt: '27 boys did the same test as the girls. Their marks are shown, with the rows up to stem 3 already entered for you. Complete the diagram for the boys.',
            values: [12, 12, 24, 26, 26, 26, 27, 30, 35, 36, 36, 38, 39, 39, 40, 42, 43, 44, 47, 52, 54, 56, 56, 58, 58, 59, 59],
            stems: [0, 1, 2, 3, 4, 5], unit: 'marks', decimals: 0,
            key: { stem: 2, leaf: 4, means: '24 marks' },
            prefill: { stemsDone: [0, 1, 2, 3] },
            back: { label: 'Girls', mine: 'Boys',
              values: [1, 3, 4, 14, 14, 15, 16, 20, 21, 23, 25, 27, 27, 32, 34, 34, 36, 36, 36, 44, 45, 48, 49, 50, 50, 53, 55] },
            src: 'Statistics M7 (1).pdf Q13(b) (boys); Q12 (girls, the given back side)' },
          { id: 'q25', kind: 'judge', marks: [0, 2],
            prompt: 'Using the stem-and-leaf diagram, decide whether the boys or the girls did better in the test, and how you can tell.',
            claims: [
              { text: 'Who did better in the test?', options: ['Boys', 'Girls'], verdict: 'Boys' },
              { text: 'How can you tell?', options: ['The boys have the higher median mark.', 'The boys have the bigger range.', 'The boys have more leaves on the diagram.'], verdict: 'The boys have the higher median mark.' }
            ],
            src: 'Statistics M7 (1).pdf Q13(c)' },

          { id: 'q26', kind: 'stemleaf', marks: [2, 1], reserve: true,
            prompt: 'The marks for 28 pupils in a test are shown. Construct a stem-and-leaf diagram for these marks.',
            values: [12, 58, 39, 40, 52, 59, 43, 59, 26, 39, 44, 42, 56, 54, 58, 43, 47, 24, 27, 26, 30, 26, 38, 56, 36, 36, 35, 12],
            stems: [1, 2, 3, 4, 5], unit: 'marks', decimals: 0,
            key: { ask: true },
            src: 'Statistics M7 (1).pdf Q23' },
          { id: 'q27', kind: 'stemleaf', marks: [2, 1], reserve: true,
            prompt: 'The number of press-ups completed in one minute by 17 boys is shown below. The girls’ results are given. Complete a back-to-back stem-and-leaf diagram for the boys.',
            values: [31, 32, 47, 15, 19, 34, 45, 26, 32, 16, 30, 33, 33, 25, 41, 31, 29],
            stems: [1, 2, 3, 4], unit: 'press-ups', decimals: 0,
            key: { ask: true },
            back: { label: 'Girls', mine: 'Boys',
              values: [21, 36, 41, 25, 18, 32, 40, 36, 22, 16, 24, 33, 36, 27, 32, 20, 28] },
            src: 'Stem and leaf - notes.doc, Back to Back Example 1 (press-ups)' },
          { id: 'q28', kind: 'judge', marks: [0, 1], reserve: true,
            prompt: 'Using the back-to-back stem-and-leaf diagram, decide whether the boys or the girls did more press-ups.',
            claims: [
              { text: 'Who did more press-ups?', options: ['Boys', 'Girls'], verdict: 'Boys' }
            ],
            src: 'Stem and leaf - notes.doc, Back to Back Example 1 ("Do you think the boys were better than the girls? Why?")' }
        ]
      },

      /* ════════════════════════════════ s5 ═══════════════════════════════ */
      {
        id: 's5',
        title: 'Scatter graphs',
        walt: 'Plot a scatter graph, draw a line of best fit and use it to estimate',
        movie: {
          title: 'The line through the cloud',
          src: 'Statistics M7 (1).pdf Q4 (Tim and June); method narration authored',
          mode: 'paper',
          steps: [
            { say: 'Tim and June recorded minutes spent on different homeworks in one week.',
              do: [{ chart: { x: { min: 0, max: 100, step: 10, label: 'Tim (minutes)' },
                              y: { min: 0, max: 100, step: 10, label: 'June (minutes)' } } }] },
            { say: 'Maths, English and Art are already plotted.',
              do: [{ plot: { x: 70, y: 85 } }, { plot: { x: 85, y: 100 } }, { plot: { x: 95, y: 90 } }] },
            { say: 'Plot the rest: Geography, History, Science, Music, ICT.',
              do: [{ plot: { x: 50, y: 75 } }, { plot: { x: 65, y: 70 } }, { plot: { x: 40, y: 60 } },
                   { plot: { x: 10, y: 40 } }, { plot: { x: 50, y: 60 } }] },
            { say: 'Draw a line of best fit through the middle of the cloud of points.',
              do: [{ lobf: { through: [[10, 35], [95, 95]] } }] },
            { say: 'A common slip: the line does not have to pass through the origin, or through every point.',
              do: [{ note: { red: true, text: 'A line of best fit follows the trend — it need not touch every point or start at (0, 0).' } }] },
            { say: 'Tim spent 60 minutes on Technology. Read up to the line, then across.',
              do: [{ rule: { h: 60 } }, { drop: { fromRule: true } }] },
            { say: 'As Tim’s time goes up, June’s does too — a positive correlation.',
              do: [{ stamp: { text: 'Positive correlation.' } }] },
            { say: 'If one score rose while the other fell, that would be a negative correlation. Every point here follows the trend, so there is no outlier.',
              do: [{ stamp: { text: 'Negative correlation would be the reverse. No outlier here.' } }] }
          ]
        },
        questions: [
          { id: 'q29', kind: 'scatter', marks: [3, 2], pointsW: 2,
            prompt: 'The table shows the engine size (litres) of different cars and the distance (km) they can travel on one litre of petrol. Draw a scatter graph, a line of best fit, and use it to estimate the engine size of a car that travels 7 km on one litre.',
            chart: { x: { min: 0, max: 3, step: 1, label: 'Engine size (litres)' },
                     y: { min: 0, max: 12, step: 2, label: 'Distance (km)' },
                     sq: { x: 0.1, y: 0.1 } },
            given: [], toPlot: [[1.0, 12], [1.8, 8.6], [2.4, 5], [1.2, 9.4], [2.1, 5.9], [1.5, 10.2], [2.7, 3.8]],
            table: { head: ['Engine size', 'Distance'], rows: [['1.0', '12'], ['1.8', '8.6'], ['2.4', '5'], ['1.2', '9.4'], ['2.1', '5.9'], ['1.5', '10.2'], ['2.7', '3.8']] },
            asks: [{ type: 'lobf' }, { type: 'estimate', from: 'y', at: 7, want: 'x' }, { type: 'corr', answer: 'negative' }],
            src: 'Statistics M7 (1).pdf Q12 (printed "Q11" on the physical page — see authoredNarration)' },
          { id: 'q30', kind: 'scatter', marks: [3, 1], pointsW: 2,
            prompt: 'The heights and weights of 7 people are given. Draw a scatter diagram, a line of best fit, and use it to estimate the weight of a person whose height is 185 cm.',
            chart: { x: { min: 160, max: 210, step: 10, label: 'height (cm)' },
                     y: { min: 40, max: 90, step: 10, label: 'weight (kg)' },
                     sq: { x: 1, y: 1 } },
            given: [], toPlot: [[165, 45], [197, 77], [178, 58], [168, 50], [180, 65], [174, 60], [190, 63]],
            table: { head: ['height (cm)', 'weight (kg)'], rows: [['165', '45'], ['197', '77'], ['178', '58'], ['168', '50'], ['180', '65'], ['174', '60'], ['190', '63']] },
            asks: [{ type: 'lobf' }, { type: 'estimate', from: 'x', at: 185, want: 'y' }],
            src: 'Statistics M7 (1).pdf Q19' },
          { id: 'q31', kind: 'scatter', marks: [3, 2], pointsW: 2,
            prompt: 'Nine science students each measured the current (in amps) that flowed through a circuit at various voltages. The first three points have already been plotted. Complete the scatter graph, find the student who took an incorrect reading, draw a line of best fit, and use it to estimate the correct current.',
            chart: { x: { min: 0, max: 100, step: 10, label: 'Voltage (volts)' },
                     y: { min: 0, max: 10, step: 1, label: 'Current (amps)' },
                     sq: { x: 2, y: 0.1 } },
            given: [[10, 1.1], [50, 5.2], [30, 3.2]],
            toPlot: [[20, 1.9], [80, 8.2], [40, 3.7], [60, 3.8], [70, 6.5], [90, 9.3]],
            table: { head: ['Student', 'Voltage', 'Current'],
              rows: [['1', '10', '1.1'], ['2', '50', '5.2'], ['3', '30', '3.2'], ['4', '20', '1.9'], ['5', '80', '8.2'],
                     ['6', '40', '3.7'], ['7', '60', '3.8'], ['8', '70', '6.5'], ['9', '90', '9.3']] },
            asks: [{ type: 'outlier', answer: 6 }, { type: 'lobf' }, { type: 'estimate', from: 'x', at: 60, want: 'y' }],
            src: 'Statistics M7 (1).pdf Q25; student-to-pair mapping confirmed from the page image (tools/qa/out/bookA/pages/p30-30.png): student 2 = (50, 5.2), student 3 = (30, 3.2) — see CONTENT_NOTES.md' },
          { id: 'q32', kind: 'judge', marks: [0, 2],
            prompt: 'Complete the sentences about family cars.',
            claims: [
              { text: 'As the age of a family car increases, its value', options: ['Increases', 'Decreases', 'Stays the same'], verdict: 'Decreases' },
              { text: 'So the correlation between age and value is', options: ['Positive', 'Negative', 'No correlation'], verdict: 'Negative' }
            ],
            src: 'Statistics M7 (1).pdf Q27(a)' }
        ]
      }
    ]
  };
})();
