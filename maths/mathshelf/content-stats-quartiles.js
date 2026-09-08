/* MathShelf — content pack: Handling Data · Book C (copper, "Quartiles, curves
   and box plots").
   Sources: stats_sources/ (Colette's files; transcriptions in SOURCE_INVENTORY.md,
   graphical reads in GRAPHICAL_READS.md). Every dataset below is copied from a
   named source item; nothing is invented. Where the schema cannot reproduce a
   printed part (a free-typed "give a reason" line, an unscaled "choose your own
   axis" mark, a table with no from:'curve' stage) that part is left out and
   said so in the build's done message / the authoring report.
   Conventions: quartileRule 'n+1', curveRule 'split50' (both quoted verbatim
   in Colette's own notes — see rules below and DESIGN.md §16). */
(function () {
  'use strict';

  window.GJ_CONTENT = window.GJ_CONTENT || {};
  window.GJ_CONTENT['stats-quartiles'] = {
    id: 'stats-quartiles',
    title: 'Handling Data',
    cover: { accent: 'copper', motif: 'cfcurve' },
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
       direct quote from a source — kept here so a reviewer can find every one
       without re-reading the whole file. Nothing on this list invents a
       dataset; each is connective phrasing, a paraphrase, or (for s6) a
       deliberate choice to keep the movie's teaching material free of any
       scenario also used by this section's own questions. */
    authoredNarration: [
      's1 movie: connective narration around MMcK p1 Example 3 (the ordering beat, then the three rings and the subtraction) — the closing line on what the IQR is for paraphrases MMcK p7’s comparison notes ("the middle 50%... excludes the extremely high and extremely low values")',
      's1 q8 claim 1: reworded as the negation of MMcK p8 Q12(e) ("The interquartile range is a better measure of spread than the range") so the judge kind’s fair:false + reason mechanic can collect a why — the engine only offers a reason step on a claim marked not fair, and Q12(e) as printed is a statement to affirm, not reject',
      's2 movie: the definition of cumulative frequency is lightly cleaned up from the source’s own line ("Cumulative Frequency means the number of times a value, or something less that it occurs")',
      's3 movie: the classic midpoint-plotting slip is taught through the caption and the one red note only — there is no "draw the wrong point, then cross it" op in the movie whitelist, so the beat is verbal, not drawn; the start-point caption paraphrases the source’s margin note "No one under 130cm"',
      's4 movie curve (intermediate points): CF notes Example 2 (80 plants) prints no class table, only the four worked answers (median 9, lower quartile 6, upper quartile 13, IQR 7) and a hand-drawn curve; the movie’s curve points (0,0),(3,3),(6,20),(9,40),(13,60),(18,74),(24,80) are authored to reproduce those four answers exactly under split50 with n = 80 (median read at height 40, lower quartile at 20, upper at 60), the shape taken from the hand-drawn image',
      's4 movie: "read from half the total, not half the axis" is a paraphrase of the standing warning, not a source quote',
      's5 movie: the closing note on range and spread quotes MMcK p7’s comparison method notes ("A large range means the data is more spread out... a smaller range means... the results are more consistent")',
      's6 movie: built only from the Data Handling Cycle diagram and the hypothesis definition/example in "Data Collection and analysis Booklet no answers.docx" — deliberately carries NO numbered sample scenario, so it shares no dataset with any of s6’s four Core questions (M7 Q3, Q14, Q28, the Corbett trio); "how many were asked" / "who was left out" is the pack’s own plain-English gloss on the standing two-question check, not a source quote',
      's6 q29/q30/q31/q32/q33: every judged claim is a conclusion sentence built by the pack from the scenario’s own printed facts (school, place, sample size) — the source prints only blank "give a reason" lines with no model claim to quote',
      's5 q23 compare: the context words ("more"/"less" money raised) are the pack’s own choice — the source gives no ready-made context-word pair for a money scenario the way it does for times ("faster"/"slower")'
    ],

    sections: [

      /* ════════════════════════════════ s1 ═══════════════════════════════ */
      {
        id: 's1',
        title: 'Quartiles and the interquartile range from a list',
        walt: 'Calculate the quartiles and interquartile range of a list of values, and understand what they are used for',
        /* Movie ← "Quartiles and Box Plots booklet MMcK.pdf" p1: the position
           formulae verbatim, and Example 3 (7 hourly rates, printed
           UNORDERED — the ordering beat). */
        movie: {
          title: 'Ordering first',
          src: 'Quartiles and Box Plots booklet MMcK.pdf p1 (1.6), Examples 1 to 3',
          mode: 'paper',
          steps: [
            { say: 'Here are the hourly rates of pay for 7 workers, in the order they were recorded.',
              do: [{ write: { text: '£8.50, £9.25, £8.70, £14.10, £9.50, £10.75, £8.80' } }] },
            { say: 'Order the list first, smallest to largest — the quartiles only make sense once it is in order.',
              do: [{ write: { text: '£8.50, £8.70, £8.80, £9.25, £9.50, £10.75, £14.10' } }] },
            { say: 'Position of the median = (n + 1) ÷ 2. There are 7 values, so (7 + 1) ÷ 2 = 4. Ring the 4th value.',
              do: [{ ring: { i: 3 } }] },
            { say: 'Position of the lower quartile = (n + 1) ÷ 4 = 8 ÷ 4 = 2. Ring the 2nd value.',
              do: [{ ring: { i: 1 } }] },
            { say: 'Position of the upper quartile = (n + 1) ÷ 4 × 3 = 2 × 3 = 6. Ring the 6th value.',
              do: [{ ring: { i: 5 } }] },
            { say: 'Subtract the lower quartile from the upper quartile: £10.75 − £8.70 = £2.05.',
              do: [{ write: { text: 'IQR = £10.75 − £8.70 = £2.05' } }, { tick: { line: 2 } }] },
            { say: 'The interquartile range covers the middle 50% of the data — one unusually high or low value cannot distort it the way the range can.',
              do: [{ note: { red: true, text: 'The IQR covers the middle 50%, so an unusually high or low value cannot distort it.' } }] },
            { say: 'That is the interquartile range — three numbers taken from an ordered list.',
              do: [{ box: { line: 2 } }] }
          ]
        },
        questions: [
          { id: 'q1', kind: 'qlist', marks: [3, 1],
            prompt: 'Seven students sat a test. Here are their results: 58%, 61%, 64%, 66%, 67%, 68%, 70%. Find the median, the lower quartile, the upper quartile and the interquartile range.',
            values: [58, 61, 64, 66, 67, 68, 70],
            ask: ['Q1', 'Q2', 'Q3', 'IQR'],
            answer: { Q1: { n: 61, d: 1 }, Q2: { n: 66, d: 1 }, Q3: { n: 68, d: 1 }, IQR: { n: 7, d: 1 } },
            src: 'Quartiles and Box Plots booklet MMcK.pdf p2 Q1' },
          { id: 'q2', kind: 'qlist', marks: [3, 1],
            prompt: 'The speeds of 11 cars passing a speed camera, in mph: 19, 22, 26, 28, 28, 29, 29, 30, 30, 31, 36. Find the median, the lower quartile, the upper quartile and the interquartile range.',
            values: [19, 22, 26, 28, 28, 29, 29, 30, 30, 31, 36],
            ask: ['Q1', 'Q2', 'Q3', 'IQR'],
            answer: { Q1: { n: 26, d: 1 }, Q2: { n: 29, d: 1 }, Q3: { n: 30, d: 1 }, IQR: { n: 4, d: 1 } },
            src: 'Quartiles and Box Plots booklet MMcK.pdf p2 Q2' },
          { id: 'q3', kind: 'qlist', marks: [1, 1],
            prompt: '11 people took part in a puzzle. The times they took, in minutes, are shown below: 8, 3, 7, 8, 9, 13, 4, 9, 9, 10, 9. Find the lower quartile and the upper quartile.',
            values: [8, 3, 7, 8, 9, 13, 4, 9, 9, 10, 9],
            ask: ['Q1', 'Q3'],
            answer: { Q1: { n: 7, d: 1 }, Q3: { n: 9, d: 1 } },
            src: 'Quartiles and Box Plots booklet MMcK.pdf p3 Q4' },
          { id: 'q4', kind: 'qlist', marks: [1, 1],
            prompt: 'Here are the ages of 15 people: 24, 26, 29, 30, 31, 36, 36, 37, 39, 40, 43, 48, 50, 51, 55. Work out the interquartile range of the ages.',
            values: [24, 26, 29, 30, 31, 36, 36, 37, 39, 40, 43, 48, 50, 51, 55],
            ask: ['IQR'],
            answer: { IQR: { n: 18, d: 1 } },
            src: 'Quartiles and Box Plots booklet MMcK.pdf p3 Q5' },
          { id: 'q5', kind: 'qlist', marks: [1, 1], reserve: true,
            prompt: '11 students guessed the number of jelly beans in a jar. Here are their guesses: 400, 673, 850, 900, 1001, 1200, 1222, 1280, 1350, 1371, 2600. Work out the interquartile range of the guesses.',
            values: [400, 673, 850, 900, 1001, 1200, 1222, 1280, 1350, 1371, 2600],
            ask: ['IQR'],
            answer: { IQR: { n: 500, d: 1 } },
            src: 'Quartiles and Box Plots booklet MMcK.pdf p3 Q6(b) (part (a), the range, is not representable by qlist)' },
          { id: 'q6', kind: 'values', marks: [0, 2], reserve: true,
            prompt: 'The ages of 11 trees, from youngest to oldest, are shown below. Two are missing: [ ], 26, 30, 43, 49, 49, 55, 58, [ ], 76, 90. The range of the ages is 73 years. The interquartile range of the ages is 30 years. Find the two missing ages.',
            slots: [
              { id: 'lowest', label: 'The smaller missing age', answer: { n: 17, d: 1 }, earns: 'accuracy' },
              { id: 'other', label: 'The other missing age', answer: { n: 60, d: 1 }, earns: 'accuracy' }
            ],
            order: ['lowest', 'other'],
            src: 'Quartiles and Box Plots booklet MMcK.pdf p4 Q7' },
          { id: 'q7', kind: 'values', marks: [0, 2], reserve: true,
            prompt: 'Seven judges scored a joke out of 10. The scores, from lowest to highest, are shown below. Some are missing: 1.1, [ ], 1.8, [ ], 2.7, 5.1, 6.5. The median score is half the interquartile range. The interquartile range is two thirds of the range. Find the two missing scores.',
            slots: [
              { id: 'a', label: 'The smaller missing score', answer: 1.5, earns: 'accuracy' },
              { id: 'b', label: 'The larger missing score', answer: 1.8, earns: 'accuracy' }
            ],
            order: ['a', 'b'],
            src: 'Quartiles and Box Plots booklet MMcK.pdf p4 Q8' },
          { id: 'q8', kind: 'judge', marks: [1, 4],
            prompt: 'Decide whether the statement about spread is fair. These wages were listed: £202, £212, £221, £242, £250, £250, £260, £284. A wage of £110 was left off. Say what happens to each average and to the range when it is added.',
            claims: [
              { text: 'The range is a better measure of spread than the interquartile range.', fair: false,
                why: 'USE_IQR_OUTLIERS', alsoWhy: ['USE_RANGE_ALL', 'USE_MIDDLE_HALF'] },
              { text: 'The mean wage will', options: ['Increase', 'Decrease', 'Stay the same'], verdict: 'Decrease' },
              { text: 'The modal wage will', options: ['Increase', 'Decrease', 'Stay the same'], verdict: 'Stay the same' },
              { text: 'The median wage will', options: ['Increase', 'Decrease', 'Stay the same'], verdict: 'Decrease' },
              { text: 'The range of the wages will', options: ['Increase', 'Decrease', 'Stay the same'], verdict: 'Increase' }
            ],
            src: 'Quartiles and Box Plots booklet MMcK.pdf p8 Q12(e); Statistics M7 (1).pdf Q5' }
        ]
      },

      /* ════════════════════════════════ s2 ═══════════════════════════════ */
      {
        id: 's2',
        title: 'Cumulative frequency tables',
        walt: 'Build a cumulative frequency table from a frequency table',
        /* Movie ← "Cumulative Frequency_notes.doc": Example 1, 50 boys'
           heights, 130–180 cm in 5 classes of width 10. */
        movie: {
          title: 'A running total',
          src: 'Cumulative Frequency_notes.doc, Example 1 (50 boys\' heights)',
          mode: 'paper',
          steps: [
            { say: 'Cumulative frequency is the number of times a value, or something less than it, occurs — a running total.',
              do: [{ table: { head: ['Height, h (cm)', 'Frequency'],
                              rows: [['130 ≤ h < 140', '5'], ['140 ≤ h < 150', '13'],
                                     ['150 ≤ h < 160', '19'], ['160 ≤ h < 170', '10'], ['170 ≤ h < 180', '3']] } }] },
            { say: 'The first row’s running total is just its own frequency: 5.',
              do: [{ tcell: { r: 0, c: 2, text: '5' } }] },
            { say: 'Row 2: add the next frequency to the total so far. 5 + 13 = 18.',
              do: [{ tcell: { r: 1, c: 2, text: '18' } }] },
            { say: 'Row 3: 18 + 19 = 37.',
              do: [{ tcell: { r: 2, c: 2, text: '37' } }] },
            { say: 'Row 4: 37 + 10 = 47.',
              do: [{ tcell: { r: 3, c: 2, text: '47' } }] },
            { say: 'Row 5: 47 + 3 = 50 — the running total.',
              do: [{ tcell: { r: 4, c: 2, text: '50' } }] },
            { say: 'The last total must equal the number of people — 50 boys, so the column must finish at 50.',
              do: [{ note: { red: true, text: 'The last total must equal the number of people — here, 50.' } }] },
            { say: 'Each total counts everyone up to and including that height.',
              do: [{ stamp: { text: 'Each total counts everyone up to that height.' } }] }
          ]
        },
        questions: [
          { id: 'q9', kind: 'cftable', marks: [3, 1],
            prompt: 'The times that 100 students spent doing homework during one week are grouped below. Complete the cumulative frequency column.',
            classes: [{ lo: 0, hi: 5, f: 18 }, { lo: 5, hi: 10, f: 30 }, { lo: 10, hi: 15, f: 32 },
                      { lo: 15, hi: 20, f: 15 }, { lo: 20, hi: 25, f: 5 }],
            unit: 'hours',
            answerCF: [18, 48, 80, 95, 100],
            src: 'Statistics M7 (1).pdf Q31(a)(i)' },
          { id: 'q10', kind: 'cftable', marks: [3, 1],
            prompt: 'The marks in an examination, out of 80, are grouped below for 112 candidates. Complete the cumulative frequency column.',
            classes: [{ lo: 0, hi: 10, f: 4 }, { lo: 10, hi: 20, f: 6 }, { lo: 20, hi: 30, f: 16 }, { lo: 30, hi: 40, f: 24 },
                      { lo: 40, hi: 50, f: 30 }, { lo: 50, hi: 60, f: 16 }, { lo: 60, hi: 70, f: 12 }, { lo: 70, hi: 80, f: 4 }],
            unit: 'marks',
            answerCF: [4, 10, 26, 50, 80, 96, 108, 112],
            src: 'Statistics M7 (1).pdf Q21(a)' },
          { id: 'q11', kind: 'cftable', marks: [3, 1],
            prompt: 'In a survey, people were asked to state their weekly wage. The results for 184 people are grouped below. The first two rows have already been filled in. Complete the rest of the cumulative frequency column.',
            classes: [{ lo: 0, hi: 100, f: 4 }, { lo: 100, hi: 200, f: 16 }, { lo: 200, hi: 300, f: 25 }, { lo: 300, hi: 400, f: 32 },
                      { lo: 400, hi: 500, f: 54 }, { lo: 500, hi: 600, f: 25 }, { lo: 600, hi: 700, f: 20 }, { lo: 700, hi: 800, f: 6 },
                      { lo: 800, hi: 900, f: 2 }],
            unit: '£',
            prefill: [0, 1],
            answerCF: [4, 20, 45, 77, 131, 156, 176, 182, 184],
            src: 'Statistics M7 (1).pdf Q24(a) (identical table to Q15(a), used here for its own printed frequencies)' }
        ]
      },

      /* ════════════════════════════════ s3 ═══════════════════════════════ */
      {
        id: 's3',
        title: 'Drawing the cumulative frequency curve',
        walt: 'Draw a cumulative frequency curve from a table',
        /* Movie ← "Cumulative Frequency_notes.doc" Example 1's own curve
           (same 50-boys table as s2's movie — the two movies are allowed to
           share a dataset; only a movie sharing with a QUESTION of its own
           section is disallowed). */
        movie: {
          title: 'The curve draws itself',
          src: 'Cumulative Frequency_notes.doc, Example 1\'s curve',
          mode: 'paper',
          steps: [
            { say: 'The same 50 boys’ heights — this time we plot them.',
              do: [{ table: { head: ['Height (cm)', 'Frequency'],
                              rows: [['130 ≤ h < 140', '5'], ['140 ≤ h < 150', '13'],
                                     ['150 ≤ h < 160', '19'], ['160 ≤ h < 170', '10'], ['170 ≤ h < 180', '3']] } }] },
            { say: 'Upper class limit along the bottom, cumulative frequency up the side.',
              do: [{ chart: { x: { min: 130, max: 180, step: 10, label: 'Height (cm)' },
                              y: { min: 0, max: 50, step: 10, label: 'Cumulative frequency' } } }] },
            { say: 'No one was under 130 cm, so the curve starts at (130, 0).',
              do: [{ plot: { x: 130, y: 0 } }] },
            { say: 'Plot each point at the upper boundary of its class, against its running total. 140 is the top of the first class; its total is 5.',
              do: [{ plot: { x: 140, y: 5 } }] },
            { say: '150 has a running total of 18.',
              do: [{ plot: { x: 150, y: 18 } }] },
            { say: 'Nineteen more boys, so the total reaches 37.',
              do: [{ plot: { x: 160, y: 37 } }] },
            { say: 'Another ten takes it to 47.',
              do: [{ plot: { x: 170, y: 47 } }] },
            { say: '180 has a running total of 50 — everyone.',
              do: [{ plot: { x: 180, y: 50 } }] },
            { say: 'Join the points together in a smooth curve — never straight lines.',
              do: [{ curve: { through: 'all' } }] },
            { say: 'A common slip: plotting at the middle of each class instead of its top. Always use the upper boundary.',
              do: [{ note: { red: true, text: 'Plot at the top of each class, not its middle.' } }] }
          ]
        },
        questions: [
          { id: 'q12', kind: 'cfplot', marks: [2, 1],
            prompt: 'The times that 100 students spent doing homework during one week are shown in the table below. Draw the cumulative frequency graph for this information.',
            classes: [{ lo: 0, hi: 5, f: 18 }, { lo: 5, hi: 10, f: 30 }, { lo: 10, hi: 15, f: 32 },
                      { lo: 15, hi: 20, f: 15 }, { lo: 20, hi: 25, f: 5 }],
            startPoint: true,
            chart: { x: { min: 0, max: 25, step: 5, label: 'Time (hours)' },
                     y: { min: 0, max: 100, step: 20, label: 'Cumulative frequency' },
                     sq: { x: 1, y: 1 } },
            mkUnits: { POINTS: 2 },
            src: 'Statistics M7 (1).pdf Q31(a)(ii)' },
          { id: 'q13', kind: 'cfplot', marks: [1, 1],
            prompt: 'The marks in an examination, out of 80, are shown in the table below for 112 candidates. Draw the cumulative frequency graph for this information.',
            classes: [{ lo: 0, hi: 10, f: 4 }, { lo: 10, hi: 20, f: 6 }, { lo: 20, hi: 30, f: 16 }, { lo: 30, hi: 40, f: 24 },
                      { lo: 40, hi: 50, f: 30 }, { lo: 50, hi: 60, f: 16 }, { lo: 60, hi: 70, f: 12 }, { lo: 70, hi: 80, f: 4 }],
            startPoint: true,
            chart: { x: { min: 0, max: 80, step: 10, label: 'Mark (m)' },
                     y: { min: 0, max: 120, step: 10, label: 'Cumulative frequency' },
                     sq: { x: 2, y: 2 } },
            src: 'Statistics M7 (1).pdf Q21(b)' },
          { id: 'q14', kind: 'cfplot', marks: [2, 1], reserve: true,
            prompt: 'In a survey, 184 people stated their weekly wage, grouped below. Draw the cumulative frequency graph for this information.',
            classes: [{ lo: 0, hi: 100, f: 4 }, { lo: 100, hi: 200, f: 16 }, { lo: 200, hi: 300, f: 25 }, { lo: 300, hi: 400, f: 32 },
                      { lo: 400, hi: 500, f: 54 }, { lo: 500, hi: 600, f: 25 }, { lo: 600, hi: 700, f: 20 }, { lo: 700, hi: 800, f: 6 },
                      { lo: 800, hi: 900, f: 2 }],
            startPoint: true,
            chart: { x: { min: 0, max: 900, step: 100, label: 'Weekly wage (£)' },
                     y: { min: 0, max: 200, step: 20, label: 'Cumulative frequency' },
                     sq: { x: 20, y: 1 } },
            mkUnits: { POINTS: 2 },
            src: 'Statistics M7 (1).pdf Q24(b) (Q15 asks the identical graph but its own axes are missing from the source — §16 item 9)' }
        ]
      },

      /* ════════════════════════════════ s4 ═══════════════════════════════ */
      {
        id: 's4',
        title: 'Reading the curve: median, quartiles, IQR',
        walt: 'Estimate the median, quartiles and interquartile range from a cumulative frequency curve',
        /* Movie ← "Cumulative Frequency_notes.doc" Example 2 (80 plants). No
           printed class table exists in the source for this example — only
           n = 80 and the four worked answers (median 9, LQ 6, UQ 13, IQR 7)
           and a hand-drawn curve. The curve below is authored to reproduce
           those four answers exactly (see authoredNarration). */
        movie: {
          title: 'The rule and the drop',
          src: 'Cumulative Frequency_notes.doc, Example 2 (80 plants)',
          mode: 'paper',
          steps: [
            { say: 'A cumulative frequency graph for 80 plants.',
              do: [{ chart: { x: { min: 0, max: 24, step: 4, label: 'Height (cm)' },
                              y: { min: 0, max: 80, step: 10, label: 'Cumulative frequency' } } }] },
            { say: 'n = 80 — that is over 50, so we read straight from the curve itself.',
              do: [{ curve: { through: [[0, 0], [3, 3], [6, 20], [9, 40], [13, 60], [18, 74], [24, 80]] } }] },
            { say: '80 plants, so the median sits at cumulative frequency 40. Read down to the curve, then across: the median is 9.',
              do: [{ rule: { h: 40 } }, { drop: { fromRule: true } }] },
            { say: 'A quarter of the plants have a cumulative frequency of 20. Down and across: the lower quartile is 6.',
              do: [{ rule: { h: 20 } }, { drop: { fromRule: true } }] },
            { say: 'Three quarters have a cumulative frequency of 60. Down and across: the upper quartile is 13.',
              do: [{ rule: { h: 60 } }, { drop: { fromRule: true } }] },
            { say: 'Subtract: 13 − 6 = 7.',
              do: [{ write: { text: 'IQR = 13 − 6 = 7' } }, { tick: { line: 0 } }] },
            { say: 'Always read from the total on the frequency axis, not from a number on the value axis.',
              do: [{ note: { red: true, text: 'Read from the total on the frequency axis, never from the value axis.' } }] },
            { say: 'That is the interquartile range, straight from the curve.',
              do: [{ box: { line: 0 } }] }
          ]
        },
        questions: [
          { id: 'q15', kind: 'cfread', marks: [2, 3],
            prompt: 'The cumulative frequency graph shows the marks of 112 candidates in an examination. Use the graph to estimate the median and the interquartile range. The pass mark is 36. What percentage of candidates passed?',
            n: 112,
            curve: [[0, 0], [10, 4], [20, 10], [30, 26], [40, 50], [50, 80], [60, 96], [70, 108], [80, 112]],
            chart: { x: { min: 0, max: 80, step: 10, label: 'Mark (m)' },
                     y: { min: 0, max: 120, step: 10, label: 'Cumulative frequency' },
                     sq: { x: 2, y: 2 } },
            ask: ['median', 'IQR', { type: 'atX', x: 36, want: 'pctAbove' }],
            src: 'Statistics M7 (1).pdf Q21(c)(i)(ii)(d)' },
          { id: 'q16', kind: 'cfread', marks: [1, 2],
            prompt: 'The cumulative frequency graph shows the weekly wage of 184 people. Use the graph to estimate the median. Then estimate the percentage of people who earn more than £640 per week.',
            n: 184,
            curve: [[0, 0], [100, 4], [200, 20], [300, 45], [400, 77], [500, 131], [600, 156], [700, 176], [800, 182], [900, 184]],
            chart: { x: { min: 0, max: 900, step: 100, label: 'Weekly wage (£)' },
                     y: { min: 0, max: 200, step: 20, label: 'Cumulative frequency' },
                     sq: { x: 20, y: 1 } },
            ask: ['median', { type: 'atX', x: 640, want: 'pctAbove' }],
            src: 'Statistics M7 (1).pdf Q24(c)' },
          { id: 'q17', kind: 'cfread', marks: [1, 2],
            prompt: 'The cumulative frequency graph shows the distances thrown by 50 competitors in a javelin competition. Use the graph to estimate the median distance thrown and the interquartile range.',
            n: 50,
            /* Re-read from the printed graph, page 12 of the PDF (pixel-
               calibrated): 82→16, 86→42 — see GRAPHICAL_READS.md §1 and the
               task correction over §15’s original estimate. */
            curve: [[70, 0], [74, 2], [78, 6], [82, 16], [86, 42], [90, 50]],
            chart: { x: { min: 70, max: 90, step: 4, label: 'Distance (m)' },
                     y: { min: 0, max: 50, step: 10, label: 'Cumulative frequency' },
                     sq: { x: 2, y: 2 } },
            ask: ['median', 'IQR'],
            src: 'Statistics M7 (1).pdf Q9(a)(b); curve points re-read from the graph, page 12 (GRAPHICAL_READS.md §1)' },
          { id: 'q18', kind: 'cfread', marks: [1, 2], reserve: true,
            prompt: 'The cumulative frequency graph shows the heights of 50 boys. Use the graph to estimate how many boys are taller than 167 cm.',
            n: 50,
            curve: [[130, 0], [140, 5], [150, 18], [160, 37], [170, 47], [180, 50]],
            chart: { x: { min: 130, max: 180, step: 10, label: 'Height (cm)' },
                     y: { min: 0, max: 50, step: 10, label: 'Cumulative frequency' },
                     sq: { x: 2, y: 1 } },
            /* Only ONE atX ask: statcore's markAtXAnswer reads a single
               top-level S.answer for the final figure, shared across every
               atX item in the question, so a second independent atX ask (the
               source's "below 153cm" part) cannot be marked correctly in the
               same question and is left out — noted here, not silently
               dropped. */
            ask: [{ type: 'atX', x: 167, want: 'countAbove' }],
            /* The source's own printed working ("50 − 4 = 46") is internally
               inconsistent (§16 item 8) — the app's own curve is used instead,
               and its chord reads CF(167) = 44, so 6 boys above, not the
               notes' 4/46. */
            src: 'Cumulative Frequency_notes.doc ("estimate how many boys are above 167cm tall", after Example 1); answer re-derived from the app’s own curve, not copied from the source’s inconsistent working (§16 item 8); the "below 153cm" part is not authored (see comment)' }
        ]
      },

      /* ════════════════════════════════ s5 ═══════════════════════════════ */
      {
        id: 's5',
        title: 'Box plots — drawing and comparing',
        walt: 'Draw and compare box plots',
        /* Movie ← "Cumulative Frequency_notes.doc": the gym sun-beds example
           (January table → box plot; June box plot given → compare). */
        movie: {
          title: 'Five numbers, one picture',
          src: 'Cumulative Frequency_notes.doc, the gym sun-beds example',
          mode: 'paper',
          steps: [
            { say: 'A gym manager recorded how many times the sun-beds were used each day in January. Five numbers describe the whole spread.',
              do: [{ write: { text: 'Minimum 16, Lower quartile 23, Median 28, Upper quartile 33, Maximum 40' } },
                   { scale: { min: 0, max: 55, step: 5, label: 'Number of times' } }] },
            { say: 'Place the lowest and highest values first — these become the whiskers.',
              do: [{ marker: { role: 'min', at: 16 } }, { marker: { role: 'max', at: 40 } }] },
            { say: 'Now the lower and upper quartiles.',
              do: [{ marker: { role: 'Q1', at: 23 } }, { marker: { role: 'Q3', at: 33 } }] },
            { say: 'And the median, 28. Five markers, one box plot.',
              do: [{ marker: { role: 'Q2', at: 28 } }, { box: {} }] },
            { say: 'June’s box plot is drawn the same way — from its own five numbers.',
              do: [{ scale: { min: 0, max: 55, step: 5, label: 'Number of times' } },
                   { marker: { role: 'min', at: 3 } }, { marker: { role: 'max', at: 37 } }] },
            { say: 'Quartiles 16 and 25, median 20.',
              do: [{ marker: { role: 'Q1', at: 16 } }, { marker: { role: 'Q3', at: 25 } },
                   { marker: { role: 'Q2', at: 20 } }, { box: {} }] },
            { say: 'The median is 8 lower for June than in January (28 − 20 = 8).',
              do: [{ write: { text: 'The median is 8 lower for June than in January (28 − 20 = 8).' } }, { tick: { line: 1 } }] },
            { say: 'The range is much bigger in June than in January.',
              do: [{ write: { text: 'The range is much bigger in June than in January (37 − 3 = 34 compared with 40 − 16 = 24).' } }, { tick: { line: 2 } }] },
            { say: 'A large range means the data is more spread out; a small range means the results are more consistent.',
              do: [{ note: { red: true, text: 'A larger range means more spread out; a smaller range means more consistent.' } }] }
          ]
        },
        questions: [
          { id: 'q19', kind: 'boxplot', marks: [1, 1],
            prompt: 'The table shows some information about the heights, in cm, of some plants. Draw a box plot for this information.',
            given: { min: 11, Q1: 28, Q2: 37, Q3: 42, max: 51 },
            scale: { min: 0, max: 60, step: 10, sq: 1 },
            src: 'Quartiles and Box Plots booklet MMcK.pdf p6 Q1' },
          { id: 'q20', kind: 'boxplot', marks: [1, 1],
            prompt: 'The table shows some information about the weights, in grams, of some potatoes: range 101 g, lower quartile 110 g, median 132 g, upper quartile 162 g, maximum 185 g. Work out the lowest weight, then draw a box plot for this information.',
            from: 'values',
            slots: [{ id: 'min', label: 'Lowest weight', answer: { n: 84, d: 1 }, earns: 'method' }],
            order: ['min'],
            given: { min: 84, Q1: 110, Q2: 132, Q3: 162, max: 185 },
            scale: { min: 80, max: 200, step: 20, sq: 1 },
            src: 'Quartiles and Box Plots booklet MMcK.pdf p6 Q2' },
          { id: 'q21', kind: 'boxplot', marks: [1, 1],
            prompt: 'The times, in seconds, of 15 students running a race are shown below: 52, 54, 54, 55, 58, 58, 59, 60, 60, 61, 61, 64, 67, 70, 75. Draw a box plot for this information.',
            from: 'qlist',
            values: [52, 54, 54, 55, 58, 58, 59, 60, 60, 61, 61, 64, 67, 70, 75],
            ask: ['Q1', 'Q2', 'Q3'],
            answer: { min: 52, Q1: 55, Q2: 60, Q3: 64, max: 75 },
            scale: { min: 50, max: 80, step: 5, sq: 1 },
            src: 'Quartiles and Box Plots booklet MMcK.pdf p6 Q3' },
          { id: 'q22', kind: 'boxplot', marks: [1, 1],
            prompt: 'Some girls did a sponsored swim to raise money for charity. The table shows the amounts of money they raised: least £10, lower quartile £16, median £25, upper quartile £42, greatest £45. Draw a box plot for this information.',
            given: { min: 10, Q1: 16, Q2: 25, Q3: 42, max: 45 },
            scale: { min: 0, max: 60, step: 10, sq: 1 },
            src: 'Quartiles and Box Plots booklet MMcK.pdf p10 (charity swim, girls’ table)' },
          { id: 'q23', kind: 'compare', marks: [1, 1], reserve: true,
            prompt: 'Compare the amounts of money the girls raised with the amounts of money the boys raised in the sponsored swim.',
            plots: [{ label: 'Girls', summary: { min: 10, Q1: 16, Q2: 25, Q3: 42, max: 45 } },
                    { label: 'Boys', summary: { min: 5, Q1: 18, Q2: 32, Q3: 40, max: 48 } }],
            context: { measure: 'money', higherIs: 'more', words: ['more', 'less'] },
            src: 'Quartiles and Box Plots booklet MMcK.pdf p10 (charity swim, boys’ plot re-read graphically — GRAPHICAL_READS.md §2)' },
          { id: 'q24', kind: 'judge', marks: [0, 2],
            prompt: 'The box plots show the age distributions of two cities, A and B. Decide which city has the greater interquartile range, and which city’s people are generally older.',
            claims: [
              { text: 'Which city has the greater interquartile range?', options: ['City A', 'City B'], verdict: 'City A' },
              { text: 'In which city are people generally older?', options: ['City A', 'City B'], verdict: 'City B' }
            ],
            src: 'Statistics M7 (1).pdf Q8(a)(b); City B’s upper quartile re-read as 70, not 68 (GRAPHICAL_READS.md §5 — correction over §15’s estimate)' },
          { id: 'q25', kind: 'values', marks: [0, 1], reserve: true,
            prompt: 'The box plots show the age distributions of two cities, A and B. Complete the sentence: 75% of the people in city A are aged over ___.',
            slots: [{ id: 'a', label: 'Aged over', answer: { n: 18, d: 1 }, earns: 'accuracy' }],
            order: ['a'],
            src: 'Statistics M7 (1).pdf Q8(c)' },
          { id: 'q26', kind: 'boxplot', marks: [2, 2], reserve: true,
            prompt: 'The cumulative frequency graph shows the time that 100 students spent doing homework during one week. Use the graph to estimate the median. The least time was 2 hours and the greatest time was 24 hours — draw a box plot for this information.',
            from: 'curve',
            n: 100,
            curve: [[0, 0], [5, 18], [10, 48], [15, 80], [20, 95], [25, 100]],
            chart: { x: { min: 0, max: 25, step: 5, label: 'Time (hours)' },
                     y: { min: 0, max: 100, step: 20, label: 'Cumulative frequency' },
                     sq: { x: 1, y: 1 } },
            ask: ['median', 'Q1', 'Q3'],
            /* statcore's boxTruth() treats ANY q.given as the complete
               five-number truth (it does not fall through to the from:'curve'
               chord read for the missing keys), so Q1/Q2/Q3 are supplied here
               too, computed by intersecting this same curve at heights 25, 50
               and 75 (n = 100, split50 rule): Q1 = 37/6, median = 165/16,
               Q3 = 455/32 — exact chord values, re-derived independently in
               the proof script and matched against GJ_STATS.curveX. */
            given: { min: 2, Q1: '37/6', Q2: '165/16', Q3: '455/32', max: 24 },
            scale: { min: 0, max: 25, step: 5, sq: 1 },
            src: 'Statistics M7 (1).pdf Q31(b)(c)' },
          { id: 'q27', kind: 'values', marks: [0, 1], reserve: true,
            prompt: 'The table shows information about the times, in minutes, that some boys took to complete a puzzle: interquartile range 8, minimum 12, median 18, upper quartile 23, maximum 29. Work out the lower quartile.',
            slots: [{ id: 'lq', label: 'Lower quartile', answer: { n: 15, d: 1 }, earns: 'accuracy' }],
            order: ['lq'],
            src: 'Quartiles and Box Plots booklet MMcK.pdf p9 Q7 (the boys’ table only — the girls’ box plot has an ambiguous median and is not authored)' },
          { id: 'q28', kind: 'boxplot', marks: [2, 2], reserve: true,
            prompt: 'In a group of 11 pupils, the number of days absent from school was recorded: 12, 6, 5, 2, 8, 2, 3, 11, 4, 10, 7. Draw a box plot for this data.',
            from: 'qlist',
            values: [12, 6, 5, 2, 8, 2, 3, 11, 4, 10, 7],
            ask: ['Q1', 'Q2', 'Q3'],
            answer: { min: 2, Q1: 3, Q2: 6, Q3: 10, max: 12 },
            /* The source's own grid has no printed axis numbers at all — a
               "choose your own scale" mark this app cannot reproduce
               tap-first; a fixed 0–14 scale is supplied instead. */
            scale: { min: 0, max: 14, step: 2, sq: 1 },
            src: 'Statistics M7 (1).pdf Q26' }
        ]
      },

      /* ════════════════════════════════ s6 ═══════════════════════════════ */
      {
        id: 's6',
        title: 'Samples — what you can and can’t say',
        walt: 'Say what a sample can and can’t tell you about a population',
        /* Movie ← "Data Collection and analysis Booklet no answers.docx": the
           Data Handling Cycle diagram and the hypothesis definition/example.
           Deliberately carries no numbered sample so it cannot share a
           dataset with any of this section's four Core questions. */
        movie: {
          title: 'A sample is not the population',
          src: 'Data Collection and analysis Booklet no answers.docx (1.4), the data-handling cycle and the hypothesis definition',
          mode: 'paper',
          steps: [
            { say: 'Every piece of data handling follows the same cycle.',
              do: [{ write: { text: 'State a hypothesis → Collect the data → Organise and analyse the data → Interpret the results and draw conclusions' } }] },
            { say: 'A hypothesis is a statement that may or may not be true.',
              do: [{ write: { text: 'A hypothesis is a statement that may or may not be true.' } }] },
            { say: 'For example — a hypothesis you could test: girls spend more time on social media than boys.',
              do: [{ write: { text: 'Girls spend more time on social media than boys.' } }] },
            { say: 'You cannot ask everyone, so a hypothesis is tested on a sample — not the whole population.',
              do: [{ stamp: { text: 'A hypothesis is tested on a SAMPLE, not the whole population.' } }] },
            { say: 'A sample only gives a fair test if it is big enough, and if it does not leave any group out.',
              do: [{ note: { red: true, text: 'A fair sample is big enough, and does not leave any group out.' } }] },
            { say: 'So always ask, of any sample: how many were asked?',
              do: [{ stamp: { text: 'How many were asked?' } }] },
            { say: 'And: who was left out?',
              do: [{ stamp: { text: 'Who was left out?' } }] },
            { say: 'Only then can you interpret the results and draw a conclusion the sample can actually support.',
              do: [{ write: { text: 'Draw a conclusion the sample can actually support.' } }, { tick: { line: 3 } }] }
          ]
        },
        questions: [
          { id: 'q29', kind: 'judge', marks: [1, 1],
            prompt: 'Jack is a pupil at Northfield Boys School. He wants to know how many times a month the people in his town go to a football match, so he asks 600 pupils in his school. Decide whether his survey gives a fair picture of the town, and why.',
            claims: [
              { text: 'Jack’s survey tells him how often people in his town go to a football match.', fair: false,
                why: 'BIASED', alsoWhy: ['WRONG_POP'] }
            ],
            src: 'Statistics M7 (1).pdf Q3' },
          { id: 'q30', kind: 'judge', marks: [1, 1],
            prompt: 'A questionnaire about mobile phone use was given to 20 people who left a supermarket between 10 am and 11 am on a Monday morning. Decide whether this survey gives a fair picture of everyone, and why.',
            claims: [
              { text: 'This survey tells us how people generally use their mobile phones.', fair: false,
                why: 'TIME_PLACE', alsoWhy: ['BIASED', 'SMALL'] }
            ],
            src: 'Statistics M7 (1).pdf Q14' },
          { id: 'q31', kind: 'judge', marks: [2, 2],
            prompt: 'Jean and Joyce are both pupils at Eastwood Girls High School. They want to know how many times a month, on average, people in their town go to church. Jean asks 300 pupils in her school; Joyce stands outside her local church and asks 300 people on their way in. Decide whether each survey gives a fair picture of the town, and why.',
            claims: [
              { text: 'Asking 300 pupils in her own school tells Jean about the whole town.', fair: false,
                why: 'WRONG_POP', alsoWhy: ['BIASED'] },
              { text: 'Standing outside a church and asking the people going in tells Joyce about the whole town.', fair: false,
                why: 'BIASED' }
            ],
            src: 'Statistics M7 (1).pdf Q28(a)(b)' },
          { id: 'q32', kind: 'judge', marks: [3, 2],
            prompt: 'Three pupils each tried to find something out from a small sample. George asked 10 people in his class how much they spend on coffee. Mrs Martin posted a questionnaire to 100 people chosen at random across the whole country to find out what food people in her town like. Charlie asked 10 Year 7 students what they think of school. Decide whether each survey gives a fair picture, and why.',
            claims: [
              { text: 'George’s survey tells him how much people generally spend on coffee.', fair: false,
                why: 'SMALL', alsoWhy: ['BIASED'] },
              { text: 'Posting the questionnaire to 100 people across the country will tell Mrs Martin what food to serve in her local restaurant.', fair: false,
                why: 'WRONG_POP' },
              { text: 'Charlie’s survey tells him what all students at his school think about school.', fair: false,
                why: 'WRONG_POP', alsoWhy: ['SMALL', 'BIASED'] }
            ],
            src: 'Questionnaires Corbett Maths questions.pdf Q1(c), Q3(b), Q10(a)' },
          { id: 'q33', kind: 'judge', marks: [1, 1], reserve: true,
            prompt: 'Charlie asked 10 Year 7 students what they think about school. Decide whether each of these conclusions is fair to draw from his survey.',
            claims: [
              { text: 'Charlie’s survey gives him a rough idea of what Year 7 pupils think about school.', fair: true },
              { text: 'Charlie’s survey proves exactly what all students in the school think about school.', fair: false,
                why: 'ESTIMATE', alsoWhy: ['WRONG_POP', 'SMALL'] }
            ],
            src: 'Questionnaires Corbett Maths questions.pdf Q10(a) (the same scenario, read for what a sample CAN fairly say)' }
        ]
      }
    ]
  };

  /* "I can…" self-evaluation chips — pupil-voice restatements of each
     section's WALT. Ids are stable — do not renumber once pupils have used
     the activity. */
  (function () {
    var CANS = {
      s1: [{ id: 's1c1', text: 'I can put a list of values in order and find the quartiles' },
           { id: 's1c2', text: 'I can work out the interquartile range' }],
      s2: [{ id: 's2c1', text: 'I can build a running total from a frequency table' }],
      s3: [{ id: 's3c1', text: 'I can plot the points and draw a cumulative frequency curve' }],
      s4: [{ id: 's4c1', text: 'I can read the median and quartiles from a cumulative frequency curve' }],
      s5: [{ id: 's5c1', text: 'I can draw a box plot from five numbers' },
           { id: 's5c2', text: 'I can compare two box plots' }],
      s6: [{ id: 's6c1', text: 'I can say whether a sample gives a fair picture of a population' }]
    };
    window.GJ_CONTENT['stats-quartiles'].sections.forEach(function (s) { s.cans = CANS[s.id] || []; });
  })();
})();
