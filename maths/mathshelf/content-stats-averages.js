/* MathShelf — content pack: Handling Data · Book B ("Averages").
   Sources: stats_sources/ (Colette's files; transcriptions in SOURCE_INVENTORY.md
   §1.4 "Data Collection and analysis Booklet no answers.docx" and §1.9
   "Statistics M7 (1).pdf"). Every dataset below is copied from a named source
   item; nothing is invented. Where the inventory's transcription needed
   confirming, the booklet's own images were extracted (unzip -j 'word/media/*'
   into tools/qa/out/bookB/pages/) and read directly — see CONTENT_NOTES.md for
   the full evidence log (image3 definitions poster, image5 advantages/
   disadvantages table, image25 the two T/F/NEI tables, all quoted verbatim
   from the rendered PNGs).
   Conventions: quartileRule 'n+1', curveRule 'split50' — inherited unused
   defaults, deep-equal to Book A/C's rules object (this book adds no
   qlist/cfplot content of its own).
   Authoring note (13 Sept 2026, per the build coordinator, mid-session): the
   engine (statcore.js) has landed the `table` kind and its FT rules; the
   structural lint (dev/lint-content-stats.js) has not yet added `table` to
   its KINDS whitelist nor a `proof` re-derivation checker for `judge`
   claims — both are LINT-B's, landing in parallel. This pack is authored to
   the CONTRACT_B.md / engine shape now, including the `proof` metadata each
   judge claim will need once that checker lands (never consulted by the
   pupil-facing engine itself — statcore.js grades a judge claim from
   `options`/`verdict` alone, exactly as Books A/C do). Every `proof` here is
   documented against its own hand-worked arithmetic in CONTENT_NOTES.md. */
(function () {
  'use strict';

  window.GJ_CONTENT = window.GJ_CONTENT || {};
  window.GJ_CONTENT['stats-averages'] = {
    id: 'stats-averages',
    title: 'Handling Data · Averages',
    cover: { accent: 'copper', motif: 'table-bar' },
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
      's1 movie: the four definitions (image3, a screenshot poster) are quoted near-verbatim in her register ("The mode is the value that appears most often", "The range is the difference between the lowest value and the highest value", "The median is the middle number in a list of numbers ordered from lowest to highest", "The mean is the total of all the values, divided by the number of values") — read directly from tools/qa/out/bookB/pages/image3.png; the rhyme (image6) is quoted exactly as printed as the film\'s one red note',
      's1 movie: the connective sentences walking through image4\'s list (13,18,13,14,13,16,14,21,13) are the pack\'s own phrasing; the data and every computed value (mode 13, median 14, mean 15, range 8) are the booklet\'s own',
      's2 movie: "find the total first" is the pack\'s own naming of the booklet\'s reverse-mean method (image10); the arithmetic (4×10=40, 40+5=45, 45÷5=9) is the booklet\'s own worked example',
      's3 movie: the method narration (the f×x column filling, "add each column, then divide") is authored; the sweets data and its true mean (503÷20=25.15) are Corbett\'s own (image12)',
      's4 movie: the method narration (midpoints, ringing the modal/median rows) is authored; the Heathrow data and its true mean/modal/median class (925÷55=16.8; 0–10; 10–20, "the 28th value") are the booklet\'s own (images 16–18)',
      's5 movie: the advantages/disadvantages wording is read directly from image5 (tools/qa/out/bookB/pages/image5.png) and lightly condensed into her register; the £110 wage case and its four true effects (mean down, mode same, median down, range up) are M7 Q5\'s own; the bread-prices table and its three judged claims are image25\'s own (right-hand table), read directly from the rendered PNG',
      's5 q1 (M7 Q30(b), 4.6→4.5): Book A already authored this exact item as its own q23 (the babies\' stem-and-leaf, "the mean only changes"); §18.2 s5 q1 names it again for Book B, worded differently here as four Changes/Stays-the-same claims rather than Book A\'s four options-per-claim phrasing — same source, same re-derived truth, different question shape',
      's5 q2 (M7 Q22): the range/mean "changes" claims are proved here from the grouped table\'s own ESTIMATION method (each class stands in for its midpoint, repeated by its frequency) — this is not an invented dataset, it is the standard grouped-mean method the section\'s own movie teaches, applied to prove a before/after change; the two added scores (21, 39) both fall inside the existing class 20≤x<40, so that class\'s frequency rises by 2, exactly as M7\'s own printed scenario describes',
      's5 q3 (salaries extension, Mean/Median): the `proof:{kind:\'compareAverage\'}` shape names two positional slots \'A\'/\'B\'; for a single-dataset Mean-vs-Median claim (not a two-group comparison) this pack maps option order onto them positionally — options[0] (\'Mean\') = \'A\', options[1] (\'Median\') = \'B\' — documented here since the coordinator\'s shape was specified for A/B group comparisons and this is the nearest fit for a same-dataset either/or claim',
      's5 q4 (Alma\'s seedlings) and its `data` table: read directly from image25 (left-hand table), tools/qa/out/bookB/pages/image25.png',
      's2 reserve grid8/grid10: authored using the `rm.newMean` FT rule with a constant `x` standing in for a second known total (grid10\'s adults\' total, 140) — an honest reuse of the closed table\'s (total ± x) ÷ n shape, not a new rule'
    ],

    sections: [

      /* ════════════════════════════════ s1 ═══════════════════════════════ */
      {
        id: 's1',
        title: 'Mean, median, mode and range',
        /* No source states a WALT for this topic — authored in her register
           from the section title (CONTENT_NOTES.md flags this). */
        walt: 'Find the mean, median, mode and range of a list, and work back from a missing value',
        movie: {
          title: 'Four averages, one list',
          src: 'Data Collection and analysis Booklet no answers.docx (1.4) images 3, 4, 6',
          mode: 'paper',
          steps: [
            { say: 'Mean, median and mode are all types of average — one number that sums up a whole list.',
              do: [{ stamp: { text: 'An average is one number that sums up a whole list.' } }] },
            { say: 'Nine numbers, exactly as printed.',
              do: [{ write: { text: '13, 18, 13, 14, 13, 16, 14, 21, 13' } }] },
            { say: 'Put them in order, smallest to largest.',
              do: [{ write: { text: '13, 13, 13, 13, 14, 14, 16, 18, 21' } }] },
            { say: 'The mode is the value that appears most often — 13, four times.',
              do: [{ ring: { i: 0 } }] },
            { say: 'The median is the middle number once they are in order.',
              do: [{ ring: { i: 4 } }] },   /* one middle value on an odd count: the ring IS the bracket (player.js has no bracket op — orchestrator, 13 Sept) */
            { say: 'The mean is the total of all the values, divided by the number of values.',
              do: [{ write: { text: '13+13+13+13+14+14+16+18+21 = 135' } }] },
            { say: 'Nine values, so divide the total by 9.',
              do: [{ write: { text: '135 ÷ 9 = 15' } }] },
            { say: 'The range is the difference between the lowest value and the highest value.',
              do: [{ write: { text: '21 − 13 = 8' } }] },
            { say: 'Here is a rhyme to help you keep the four apart.',
              do: [{ note: { red: true, text: 'Mode, Mode, Mode the Most. Range is High to Low. Median\'s in the middle, of an Ordered Row.' } }] }
          ]
        },
        questions: [
          { id: 'q1', kind: 'values', marks: [1, 2],
            prompt: 'Find the mean, median, mode and range of this list of values.',
            fig: { type: 'list', values: [3, 12, 4, 6, 8, 5, 4] },
            slots: [
              { id: 'mean', label: 'Mean', stat: 'mean', answer: { n: 6, d: 1 }, earns: 'method' },
              { id: 'median', label: 'Median', stat: 'median', answer: { n: 5, d: 1 }, earns: 'accuracy' },
              { id: 'mode', label: 'Mode', stat: 'mode', answer: { n: 4, d: 1 }, earns: 'accuracy' },
              { id: 'range', label: 'Range', stat: 'range', answer: { n: 9, d: 1 }, earns: 'accuracy' }
            ],
            order: ['mean', 'median', 'mode', 'range'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image6 worksheet (a)' },
          { id: 'q2', kind: 'values', marks: [1, 2],
            prompt: 'Find the mean, median, mode and range of this list of values.',
            fig: { type: 'list', values: [7, 21, 2, 17, 3, 13, 7, 4, 9, 7, 9] },
            slots: [
              { id: 'mean', label: 'Mean', stat: 'mean', answer: { n: 9, d: 1 }, earns: 'method' },
              { id: 'median', label: 'Median', stat: 'median', answer: { n: 7, d: 1 }, earns: 'accuracy' },
              { id: 'mode', label: 'Mode', stat: 'mode', answer: { n: 7, d: 1 }, earns: 'accuracy' },
              { id: 'range', label: 'Range', stat: 'range', answer: { n: 19, d: 1 }, earns: 'accuracy' }
            ],
            order: ['mean', 'median', 'mode', 'range'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image6 worksheet (b)' },
          { id: 'q3', kind: 'values', marks: [1, 2],
            prompt: 'Find the mean, median, mode and range of this list of values.',
            fig: { type: 'list', values: [12, 1, 10, 1, 9, 3, 4, 9, 7, 9] },
            slots: [
              { id: 'mean', label: 'Mean', stat: 'mean', answer: { n: 13, d: 2 }, earns: 'method', decimal: true },
              { id: 'median', label: 'Median', stat: 'median', answer: { n: 8, d: 1 }, earns: 'accuracy' },
              { id: 'mode', label: 'Mode', stat: 'mode', answer: { n: 9, d: 1 }, earns: 'accuracy' },
              { id: 'range', label: 'Range', stat: 'range', answer: { n: 11, d: 1 }, earns: 'accuracy' }
            ],
            order: ['mean', 'median', 'mode', 'range'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image6 worksheet (c)' },
          { id: 'q4', kind: 'values', marks: [1, 2],
            prompt: 'Find the mean, median, mode and range of this list of values.',
            fig: { type: 'list', values: [8, 0, 3, 3, 1, 7, 4, 1, 4, 4] },
            slots: [
              { id: 'mean', label: 'Mean', stat: 'mean', answer: { n: 7, d: 2 }, earns: 'method', decimal: true },
              { id: 'median', label: 'Median', stat: 'median', answer: { n: 7, d: 2 }, earns: 'accuracy', decimal: true },
              { id: 'mode', label: 'Mode', stat: 'mode', answer: { n: 4, d: 1 }, earns: 'accuracy' },
              { id: 'range', label: 'Range', stat: 'range', answer: { n: 8, d: 1 }, earns: 'accuracy', dx: false }
            ],
            order: ['mean', 'median', 'mode', 'range'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image6 worksheet (d); range slot carries dx:false — the printed list\'s minimum is 0, so the AV_RANGE_NOT_DIFF slip (max, min, or max+min) collides with the true range (8) on this exact list; a property of the source data, waived rather than forced' },
          { id: 'q5', kind: 'values', marks: [1, 1],
            prompt: 'Find the missing value in each list. The mean of 3, 5, 6 and ? is 6. The mean of 7, 8, 4 and ? is 8.',
            slots: [
              { id: 'missing1', label: 'First missing value', stat: 'missing', answer: { n: 10, d: 1 }, earns: 'method' },
              { id: 'missing2', label: 'Second missing value', stat: 'missing', answer: { n: 13, d: 1 }, earns: 'accuracy' }
            ],
            order: ['missing1', 'missing2'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image6 (e) and (f)' },
          { id: 'q6', kind: 'values', marks: [2, 2] /* range slot carries w:2, matching the source's [4] total */,
            prompt: 'Alice has five cards, each with a number on them. Three of the numbers are shown: 3, 8, ?, 5, ?. The mode of the five numbers is 5. The mean of the five numbers is 6. Work out the range of the five numbers. You must show your working.',
            slots: [
              { id: 'missA', label: 'One missing card is', stat: 'missing', answer: { n: 5, d: 1 }, earns: 'method' },
              { id: 'missB', label: 'The other missing card is', stat: 'missing', answer: { n: 9, d: 1 }, earns: 'method' },
              { id: 'range', label: 'Range', stat: 'range', answer: { n: 6, d: 1 }, earns: 'accuracy', w: 2 }
            ],
            order: ['missA', 'missB', 'range'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image8' },

          { id: 'q7', kind: 'values', marks: [0, 2], reserve: true,
            prompt: 'Write five numbers so that the mean is 6, the median is 5 and the mode is 4. Then write five different numbers so that the mean, median, mode and range are all 4.',
            slots: [
              { id: 'setA', label: 'Five numbers: mean 6, median 5, mode 4', answer: { constraints: { n: 5, mean: 6, median: 5, mode: 4 } }, set: 5, earns: 'accuracy' },
              { id: 'setB', label: 'Five numbers: mean, median, mode and range all 4', answer: { constraints: { n: 5, mean: 4, median: 4, mode: 4, range: 4 } }, set: 5, earns: 'accuracy' }
            ],
            order: ['setA', 'setB'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image7 (g) and (h, mislabelled "a")' }
        ]
      },

      /* ════════════════════════════════ s2 ═══════════════════════════════ */
      {
        id: 's2',
        title: 'Reverse mean',
        walt: 'Work backwards from a mean to find a total, and use it to find a new mean',
        movie: {
          title: 'Find the total first',
          src: 'Data Collection and analysis Booklet no answers.docx (1.4) image10',
          mode: 'paper',
          steps: [
            { say: 'Four girls have a mean age of 10.',
              do: [{ write: { text: '4 girls, mean age 10' } }] },
            { say: 'Turn the mean back into a total first: 4 girls times the mean age.',
              do: [{ write: { text: '4 × 10 = 40' } }] },
            { say: 'A fifth girl joins them, aged 5. Add her age to the total.',
              do: [{ write: { text: '40 + 5 = 45' } }] },
            { say: 'Now share the new total between the new number of girls.',
              do: [{ write: { text: '45 ÷ 5 = 9' } }] },
            { say: 'Find the total first — that is the whole method, every time.',
              do: [{ box: { line: 3 } }] },
            { say: 'Every reverse-mean question follows the same three lines.',
              do: [{ note: { red: true, text: 'Find the total first, then share it out again by the new number.' } }] }
          ]
        },
        questions: [
          { id: 'q8', kind: 'values', marks: [1, 1],
            prompt: 'The mean age of 2 girls is 8. Another girl aged 5 joins them. Find the mean age of the 3 girls.',
            slots: [
              { id: 'total', label: 'Total age of the 2 girls', stat: 'total', answer: { n: 16, d: 1 }, earns: 'method' },
              { id: 'newMean', label: 'New mean age of 3', stat: 'newMean', answer: { n: 7, d: 1 }, earns: 'accuracy',
                ft: { rule: 'rm.newMean', from: ['total'], x: 5, n: 3 } }
            ],
            order: ['total', 'newMean'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image11, grid 1' },
          { id: 'q9', kind: 'values', marks: [1, 1],
            prompt: 'The mean number of goals for 3 players is 18. A fourth player, who scored 6 goals, joins them. Find the new mean number of goals for the 4 players.',
            slots: [
              { id: 'total', label: 'Total goals of the 3 players', stat: 'total', answer: { n: 54, d: 1 }, earns: 'method' },
              { id: 'newMean', label: 'New mean of 4', stat: 'newMean', answer: { n: 15, d: 1 }, earns: 'accuracy',
                ft: { rule: 'rm.newMean', from: ['total'], x: 6, n: 4 } }
            ],
            order: ['total', 'newMean'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image11, grid 2' },
          { id: 'q10', kind: 'values', marks: [1, 1],
            prompt: 'The mean of 3 numbers is 15. A number is added, and the new mean of the 4 numbers is 12. Find the number that was added.',
            slots: [
              { id: 'total', label: 'Total before the number is added', stat: 'total', answer: { n: 45, d: 1 }, earns: 'method' },
              { id: 'added', label: 'The number added', stat: 'missing', answer: { n: 3, d: 1 }, earns: 'accuracy' }
            ],
            order: ['total', 'added'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image11, grid 4' },
          { id: 'q11', kind: 'values', marks: [1, 1],
            prompt: 'The mean of 5 numbers is 30. A number is removed, and the mean of the remaining 4 numbers is 25. Find the number that was removed.',
            slots: [
              { id: 'total', label: 'Total of all five before one is removed', stat: 'total', answer: { n: 150, d: 1 }, earns: 'method' },
              { id: 'removed', label: 'The number removed', stat: 'missing', answer: { n: 50, d: 1 }, earns: 'accuracy' }
            ],
            order: ['total', 'removed'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image11, grid 7' },
          { id: 'q12', kind: 'values', marks: [1, 1],
            prompt: 'The mean age of 9 boys is 10. The mean age of 9 girls is 15. Find the mean age of all 18 boys and girls together.',
            slots: [
              { id: 'boysTotal', label: 'Total age of the 9 boys', stat: 'total', answer: { n: 90, d: 1 }, earns: 'method' },
              { id: 'mean18', label: 'Mean age of all 18', stat: 'newMean', answer: { n: 25, d: 2 }, earns: 'accuracy', decimal: true,
                ft: { rule: 'rm.newMean', from: ['boysTotal'], x: 135, n: 18 } }
            ],
            order: ['boysTotal', 'mean18'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image11, grid 9' },
          { id: 'q13', kind: 'values', marks: [2, 1],
            prompt: 'A girl runs 8 laps of a track in an average time of 48.2 seconds per lap. After completing another 2 laps, her overall average time is 49.4 seconds per lap. Calculate her average time per lap for the last 2 laps.',
            slots: [
              { id: 'total10', label: 'Total time for all 10 laps', stat: 'total', answer: { n: 494, d: 1 }, earns: 'method', decimal: true },
              { id: 'last2Total', label: 'Total time for the last 2 laps', stat: 'total', answer: { n: 542, d: 5 }, earns: 'method', decimal: true },
              { id: 'perLap', label: 'Average time per lap for the last 2 laps', stat: 'newMean', answer: { n: 271, d: 5 }, earns: 'accuracy', decimal: true,
                ft: { rule: 'rm.newMean', from: ['last2Total'], x: 0, n: 2 } }
            ],
            order: ['total10', 'last2Total', 'perLap'],
            src: 'Statistics M7 (1).pdf Q6' },

          { id: 'q14', kind: 'values', marks: [1, 1], reserve: true,
            prompt: 'The mean age of a 25-player team is 26. A 20-year-old player is sold. Find the new mean age of the remaining 24 players.',
            slots: [
              { id: 'total', label: 'Total age of the 25 players', stat: 'total', answer: { n: 650, d: 1 }, earns: 'method' },
              { id: 'newMean', label: 'New mean age of 24', stat: 'newMean', answer: { n: 105, d: 4 }, earns: 'accuracy', decimal: true,
                ft: { rule: 'rm.newMean', from: ['total'], x: 20, n: 24, minus: true } }
            ],
            order: ['total', 'newMean'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image11, grid 8' },
          { id: 'q15', kind: 'values', marks: [1, 1], reserve: true,
            prompt: '4 adults and 6 children have a mean age of 21.8. The adults\' mean age is 35. Find the children\'s mean age.',
            slots: [
              { id: 'combinedTotal', label: 'Total age of all 10', stat: 'total', answer: { n: 218, d: 1 }, earns: 'method', decimal: true },
              { id: 'childrenMean', label: 'Mean age of the 6 children', stat: 'newMean', answer: { n: 13, d: 1 }, earns: 'accuracy',
                ft: { rule: 'rm.newMean', from: ['combinedTotal'], x: 140, n: 6, minus: true } }
            ],
            order: ['combinedTotal', 'childrenMean'],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image11, grid 10' }
        ]
      },

      /* ════════════════════════════════ s3 ═══════════════════════════════ */
      {
        id: 's3',
        title: 'Averages from a frequency table',
        walt: 'Find the mean, median and mode from a frequency table',
        movie: {
          title: 'f times x',
          src: 'Data Collection and analysis Booklet no answers.docx (1.4) image12 (Corbettmaths)',
          mode: 'paper',
          steps: [
            { say: '20 bags of sweets — the table shows how many bags held each count.',
              do: [{ table: { head: ['Number of sweets', 'Frequency', 'f × x'],
                               rows: [['23', '1', ''], ['24', '4', ''], ['25', '9', ''], ['26', '3', ''], ['27', '3', '']] } }] },
            { say: 'Multiply each number of sweets by its frequency.',
              do: [{ tcell: { r: 0, c: 2, text: '23' } }] },
            { say: 'Keep going down the column.',
              do: [{ tcell: { r: 1, c: 2, text: '96' } }] },
            { say: 'Keep going.',
              do: [{ tcell: { r: 2, c: 2, text: '225' } }] },
            { say: 'Nearly there.',
              do: [{ tcell: { r: 3, c: 2, text: '78' } }, { tcell: { r: 4, c: 2, text: '81' } }] },
            { say: 'Add the frequency column, then add the f × x column.',
              do: [{ write: { text: '1+4+9+3+3 = 20' } }, { write: { text: '23+96+225+78+81 = 503' } }] },
            { say: 'Divide the f × x total by the frequency total for the mean.',
              do: [{ write: { text: '503 ÷ 20 = 25.15' } }] }
          ]
        },
        questions: [
          { id: 'q16', kind: 'table', marks: [0, 1],
            prompt: 'The table shows the ages of an under-21 rugby squad. Find the median age.',
            cols: [
              { id: 'age', head: 'Age', given: ['18', '19', '20', '21'] },
              { id: 'f', head: 'Frequency', given: ['5', '5', '9', '4'] }
            ],
            asks: [
              { type: 'value', id: 'median', label: 'Median age =', answer: { n: 20, d: 1 } }
            ],
            src: 'Statistics M7 (1).pdf, "median-from-a-frequency-table" Q1 (image13, Corbettmaths)' },
          { id: 'q17', kind: 'table', marks: [2, 1],
            prompt: 'Thirty students were asked how many cats they owned. Calculate the mean number of cats owned per student.',
            cols: [
              { id: 'x', head: 'Number of cats', given: ['0', '1', '2', '3', '4'] },
              { id: 'f', head: 'Frequency', given: ['6', '13', '7', '3', '1'] },
              { id: 'fx', head: 'f × x', derive: 'f*x' }
            ],
            totals: ['f', 'fx'],
            asks: [
              { type: 'value', id: 'mean', label: 'Mean =', answer: { n: 4, d: 3 }, ft: 'sum(fx)/sum(f)', dp: 2 }
            ],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image15, Q4' },
          { id: 'q18', kind: 'table', marks: [2, 1],
            prompt: 'The table shows the number of days absent in a term. Calculate the mean number of days absent.',
            cols: [
              { id: 'x', head: 'Days absent', given: ['0', '1', '2', '3', '4', '5'] },
              { id: 'f', head: 'Frequency', given: ['12', '8', '6', '7', '2', '1'] },
              { id: 'fx', head: 'f × x', derive: 'f*x' }
            ],
            totals: ['f', 'fx'],
            asks: [
              { type: 'value', id: 'mean', label: 'Mean =', answer: { n: 3, d: 2 }, ft: 'sum(fx)/sum(f)' }
            ],
            src: 'Statistics M7 (1).pdf Q18' },

          { id: 'q19', kind: 'table', marks: [2, 3], reserve: true,
            prompt: 'A shop sells 80 gift vouchers valued at £5, £10, £20, £50 or £100. Find the mode, the median and the mean value of a voucher sold.',
            cols: [
              { id: 'x', head: 'Value (£)', given: ['5', '10', '20', '50', '100'] },
              { id: 'f', head: 'Frequency', given: ['34', '26', '9', '7', '4'] },
              { id: 'fx', head: 'f × x', derive: 'f*x' }
            ],
            totals: ['f', 'fx'],
            asks: [
              { type: 'value', id: 'mode', label: 'Mode =', answer: { n: 5, d: 1 } },
              { type: 'value', id: 'median', label: 'Median =', answer: { n: 10, d: 1 } },
              { type: 'value', id: 'mean', label: 'Mean =', answer: { n: 17, d: 1 }, ft: 'sum(fx)/sum(f)' }
            ],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image14' }
        ]
      },

      /* ════════════════════════════════ s4 ═══════════════════════════════ */
      {
        id: 's4',
        title: 'Grouped tables',
        walt: 'Estimate the mean, and find the modal class and the class containing the median, from a grouped table',
        movie: {
          title: 'Midpoints stand in for the data',
          src: 'Data Collection and analysis Booklet no answers.docx (1.4) images 16–18, Heathrow example',
          mode: 'paper',
          steps: [
            { say: 'During 3 hours at Heathrow, 55 aircraft arrived late. The table groups them by minutes late.',
              do: [{ table: { head: ['Minutes late', 'Frequency', 'Midpoint', 'f × x'],
                               rows: [['0-10', '27', '', ''], ['10-20', '10', '', ''], ['20-30', '7', '', ''],
                                      ['30-40', '5', '', ''], ['40-50', '4', '', ''], ['50-60', '2', '', '']] } }] },
            { say: 'Each class stands in for its midpoint — halfway between its two ends.',
              do: [{ tcell: { r: 0, c: 2, text: '5' } }, { tcell: { r: 1, c: 2, text: '15' } }, { tcell: { r: 2, c: 2, text: '25' } },
                   { tcell: { r: 3, c: 2, text: '35' } }, { tcell: { r: 4, c: 2, text: '45' } }, { tcell: { r: 5, c: 2, text: '55' } }] },
            { say: 'Multiply each midpoint by its frequency.',
              do: [{ tcell: { r: 0, c: 3, text: '135' } }, { tcell: { r: 1, c: 3, text: '150' } }, { tcell: { r: 2, c: 3, text: '175' } }] },
            { say: 'Keep going down the column.',
              do: [{ tcell: { r: 3, c: 3, text: '175' } }, { tcell: { r: 4, c: 3, text: '180' } }, { tcell: { r: 5, c: 3, text: '110' } }] },
            { say: 'Total the frequencies: 55 aircraft altogether.',
              do: [{ write: { text: '27+10+7+5+4+2 = 55' } }] },
            { say: 'Total the f × x column, then divide by 55 for an estimate of the mean.',
              do: [{ write: { text: '135+150+175+175+180+110 = 925' } }, { write: { text: '925 ÷ 55 = 16.8' } }] },
            { say: 'The modal class is the one with the most aircraft: 27 of them, in the 0–10 class.',
              do: [{ write: { text: 'Modal class: 27 aircraft in 0–10' } }, { ring: { i: 0 } }] },
            { say: 'The median is the 28th aircraft of 55. The first class holds 27, so the 28th falls in the next class, 10–20.',
              do: [{ write: { text: 'Median: the 28th of 55 is in 10–20' } }, { ring: { i: 0 } }] },
            { say: 'A grouped table gives an estimate, never an exact value — the individual arrival times are gone once they are grouped.',
              do: [{ note: { red: true, text: 'Grouped data gives an ESTIMATE of the mean, never the exact value.' } }] }
          ]
        },
        questions: [
          { id: 'q20', kind: 'table', marks: [2, 3],
            prompt: 'The table gives the number of words in each sentence of a page of writing. Estimate the mean number of words per sentence, and find the modal class and the class containing the median.',
            cols: [
              { id: 'cls', head: 'Number of words', given: [
                { lo: 1, hi: 5, text: '1-5' }, { lo: 6, hi: 10, text: '6-10' }, { lo: 11, hi: 15, text: '11-15' },
                { lo: 16, hi: 20, text: '16-20' }, { lo: 21, hi: 25, text: '21-25' }
              ] },
              { id: 'f', head: 'Frequency', given: ['6', '5', '4', '2', '3'] },
              { id: 'mid', head: 'Midpoint', derive: 'mid' },
              { id: 'fx', head: 'f × x', derive: 'f*x' }
            ],
            totals: ['f', 'fx'],
            asks: [
              { type: 'value', id: 'mean', label: 'Estimate for the mean =', answer: { n: 43, d: 4 }, ft: 'sum(fx)/sum(f)', dp: 2 },
              { type: 'row', id: 'modal', label: 'Modal class', answer: 0 },
              { type: 'row', id: 'medianClass', label: 'Class containing the median', answer: 1 }
            ],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image19, Q1' },
          { id: 'q21', kind: 'table', marks: [2, 3],
            prompt: 'The table shows the results of 24 students in a test. Estimate the mean mark, and find the modal class and the class containing the median.',
            cols: [
              { id: 'cls', head: 'Mark', given: [
                { lo: 40, hi: 54, text: '40-54' }, { lo: 55, hi: 69, text: '55-69' },
                { lo: 70, hi: 84, text: '70-84' }, { lo: 85, hi: 99, text: '85-99' }
              ] },
              { id: 'f', head: 'Frequency', given: ['5', '8', '7', '4'] },
              { id: 'mid', head: 'Midpoint', derive: 'mid' },
              { id: 'fx', head: 'f × x', derive: 'f*x' }
            ],
            totals: ['f', 'fx'],
            asks: [
              { type: 'value', id: 'mean', label: 'Estimate for the mean =', answer: { n: 273, d: 4 }, ft: 'sum(fx)/sum(f)', dp: 2 },
              { type: 'row', id: 'modal', label: 'Modal class', answer: 1 },
              { type: 'row', id: 'medianClass', label: 'Class containing the median', answer: 1 }
            ],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image20, Q2' },
          { id: 'q22', kind: 'table', marks: [4, 1],
            prompt: 'The table shows the amount of pocket money (p) for a group of students. Estimate the mean pocket money, and find the class containing the median.',
            cols: [
              { id: 'cls', head: 'Pocket money (£)', given: [
                { lo: 0, hi: 3, text: '0 < p ≤ 3' }, { lo: 3, hi: 6, text: '3 < p ≤ 6' }, { lo: 6, hi: 9, text: '6 < p ≤ 9' },
                { lo: 9, hi: 12, text: '9 < p ≤ 12' }, { lo: 12, hi: 15, text: '12 < p ≤ 15' }, { lo: 15, hi: 18, text: '15 < p ≤ 18' }
              ] },
              { id: 'f', head: 'Frequency', given: ['6', '18', '16', '22', '13', '4'] },
              { id: 'mid', head: 'Midpoint', derive: 'mid' },
              { id: 'fx', head: 'f × x', derive: 'f*x' }
            ],
            totals: ['f', 'fx'],
            asks: [
              { type: 'value', id: 'mean', label: 'Estimate for the mean =', answer: { n: 1365, d: 158 }, ft: 'sum(fx)/sum(f)', dp: 2 },
              { type: 'row', id: 'medianClass', label: 'Class containing the median', answer: 2 }
            ],
            src: 'Statistics M7 (1).pdf Q20' },

          { id: 'q23', kind: 'table', marks: [3, 1], reserve: true,
            prompt: 'The number of hours of daily sunshine is recorded at a resort during four months. Calculate an estimate of the mean number of hours of daily sunshine.',
            cols: [
              { id: 'cls', head: 'Hours of sunshine (h)', given: [
                { lo: 0, hi: 3, text: '0 < h ≤ 3' }, { lo: 3, hi: 6, text: '3 < h ≤ 6' }, { lo: 6, hi: 9, text: '6 < h ≤ 9' },
                { lo: 9, hi: 12, text: '9 < h ≤ 12' }, { lo: 12, hi: 15, text: '12 < h ≤ 15' }
              ] },
              { id: 'f', head: 'Frequency', given: ['18', '45', '37', '19', '4'] },
              { id: 'mid', head: 'Midpoint', derive: 'mid' },
              { id: 'fx', head: 'f × x', derive: 'f*x' }
            ],
            totals: ['f', 'fx'],
            asks: [
              { type: 'value', id: 'mean', label: 'Estimate for the mean =', answer: { n: 507, d: 82 }, ft: 'sum(fx)/sum(f)', dp: 2 }
            ],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image26' },
          { id: 'q24', kind: 'table', marks: [3, 2], reserve: true,
            prompt: 'The waiting times for patients at a surgery are recorded in the table. Find the modal class, and estimate the mean waiting time.',
            cols: [
              { id: 'cls', head: 'Waiting time (t, minutes)', given: [
                { lo: 0, hi: 5, text: '0 < t ≤ 5' }, { lo: 5, hi: 10, text: '5 < t ≤ 10' }, { lo: 10, hi: 15, text: '10 < t ≤ 15' },
                { lo: 15, hi: 20, text: '15 < t ≤ 20' }, { lo: 20, hi: 25, text: '20 < t ≤ 25' }, { lo: 25, hi: 30, text: '25 < t ≤ 30' }
              ] },
              { id: 'f', head: 'Frequency', given: ['7', '8', '5', '5', '4', '1'] },
              { id: 'mid', head: 'Midpoint', derive: 'mid' },
              { id: 'fx', head: 'f × x', derive: 'f*x' }
            ],
            totals: ['f', 'fx'],
            asks: [
              { type: 'row', id: 'modal', label: 'Modal class', answer: 1 },
              { type: 'value', id: 'mean', label: 'Estimate for the mean =', answer: { n: 23, d: 2 }, ft: 'sum(fx)/sum(f)', dp: 1 }
            ],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image27' }
        ]
      },

      /* ════════════════════════════════ s5 ═══════════════════════════════ */
      {
        id: 's5',
        title: 'Which average, and what a table can\'t tell you',
        walt: 'Decide which average to use, predict what changes it, and judge a claim from a grouped table as true, false or not enough information',
        movie: {
          title: 'The £110 test',
          src: 'Data Collection and analysis Booklet no answers.docx (1.4) image5; Statistics M7 (1).pdf Q5; image25 (right, bread prices)',
          mode: 'paper',
          steps: [
            { say: 'Mode, median and mean each have their own advantages and disadvantages.',
              do: [{ table: { head: ['Average', 'Mode', 'Median', 'Mean'],
                               rows: [['Advantages', 'Very easy to find; not affected by extreme values', 'Easy to find; not affected by extreme values', 'Uses all the values'],
                                      ['Disadvantages', "Doesn't use all the values; may not exist", "Doesn't use all the values", 'Extreme values can distort it'],
                                      ['Used for', 'Non-numerical data', 'Data with extreme values', 'Data spread in a balanced way']] } }] },
            { say: 'Eight office workers\' weekly wages.',
              do: [{ write: { text: '£202, £212, £221, £242, £250, £250, £260, £284' } }] },
            { say: 'A ninth wage of £110 was missed off the list. Add it in.',
              do: [{ write: { text: '+ £110' } }] },
            { say: 'Check each average in turn: the mean falls, the mode stays the same, the median falls, and the range rises.',
              do: [{ write: { text: 'mean: £240.13 → £225.67' } }, { tick: { line: 2 } },
                   { write: { text: 'mode: £250 → £250' } }, { tick: { line: 3 } },
                   { write: { text: 'median: £246 → £242' } }, { tick: { line: 4 } },
                   { write: { text: 'range: £82 → £174' } }, { tick: { line: 5 } }] },
            { say: 'A grouped table of bread prices in different shops.',
              do: [{ table: { head: ['Price (p)', 'Frequency', 'Midpoint', 'f × x'],
                               rows: [['80-84', '2', '82', '164'], ['85-89', '3', '87', '261'],
                                      ['90-94', '5', '92', '460'], ['95-99', '10', '97', '970']] } }] },
            { say: 'Claim: "The estimated mean = 1855 ÷ 20." Dividing 1855 by 20 is exactly the method — the claim is true.',
              do: [{ write: { text: 'The estimated mean = 1855 ÷ 20.' } }, { stamp: { text: 'TRUE' } }] },
            { say: 'Claim: "The modal interval price of bread was 10." Ten is only the frequency; the modal interval is 95–99, so this is false.',
              do: [{ write: { text: 'The modal interval price of bread was 10.' } }, { stamp: { text: 'FALSE' } }] },
            { say: 'Claim: "3 loaves of bread cost 87p." A grouped table cannot say what one loaf cost — not enough information.',
              do: [{ write: { text: '3 loaves of bread cost 87p.' } }, { stamp: { text: 'NOT ENOUGH INFORMATION' } }] },
            { say: 'A grouped table can give you an estimate and a typical class — never one exact value hiding inside it.',
              do: [{ note: { red: true, text: 'Grouped data can give an estimate, never one exact value inside a class.' } }] }
          ]
        },
        questions: [
          { id: 'q25', kind: 'judge', marks: [0, 1],
            prompt: 'A mistake was made: a baby\'s weight of 4.6 kg should have been 4.5 kg. Decide whether each of the following changes or stays the same.',
            fig: { type: 'list', values: [2.4, 2.6, 2.8, 2.8, 3.0, 3.5, 3.5, 3.5, 3.7, 3.8, 3.9, 4.1, 4.2, 4.2, 4.3, 4.6, 5.1] },
            claims: [
              { text: 'When 4.6 kg is corrected to 4.5 kg, the range of the weights will…', options: ['Change', 'Stay the same'], verdict: 'Stay the same',
                proof: { kind: 'changes', stat: 'range',
                  before: [2.4, 2.6, 2.8, 2.8, 3.0, 3.5, 3.5, 3.5, 3.7, 3.8, 3.9, 4.1, 4.2, 4.2, 4.3, 4.6, 5.1],
                  after: [2.4, 2.6, 2.8, 2.8, 3.0, 3.5, 3.5, 3.5, 3.7, 3.8, 3.9, 4.1, 4.2, 4.2, 4.3, 4.5, 5.1] } },
              { text: 'After the correction, the median weight will…', options: ['Change', 'Stay the same'], verdict: 'Stay the same',
                proof: { kind: 'changes', stat: 'median',
                  before: [2.4, 2.6, 2.8, 2.8, 3.0, 3.5, 3.5, 3.5, 3.7, 3.8, 3.9, 4.1, 4.2, 4.2, 4.3, 4.6, 5.1],
                  after: [2.4, 2.6, 2.8, 2.8, 3.0, 3.5, 3.5, 3.5, 3.7, 3.8, 3.9, 4.1, 4.2, 4.2, 4.3, 4.5, 5.1] } },
              { text: 'With 4.5 kg in place of 4.6 kg, the mean weight will…', options: ['Change', 'Stay the same'], verdict: 'Change',
                proof: { kind: 'changes', stat: 'mean',
                  before: [2.4, 2.6, 2.8, 2.8, 3.0, 3.5, 3.5, 3.5, 3.7, 3.8, 3.9, 4.1, 4.2, 4.2, 4.3, 4.6, 5.1],
                  after: [2.4, 2.6, 2.8, 2.8, 3.0, 3.5, 3.5, 3.5, 3.7, 3.8, 3.9, 4.1, 4.2, 4.2, 4.3, 4.5, 5.1] } },
              { text: 'Once the weight is corrected, the modal weight will…', options: ['Change', 'Stay the same'], verdict: 'Stay the same',
                proof: { kind: 'changes', stat: 'mode',
                  before: [2.4, 2.6, 2.8, 2.8, 3.0, 3.5, 3.5, 3.5, 3.7, 3.8, 3.9, 4.1, 4.2, 4.2, 4.3, 4.6, 5.1],
                  after: [2.4, 2.6, 2.8, 2.8, 3.0, 3.5, 3.5, 3.5, 3.7, 3.8, 3.9, 4.1, 4.2, 4.2, 4.3, 4.5, 5.1] } }
            ],
            src: 'Statistics M7 (1).pdf Q30(b) (same source item as Book A\'s q23; worded here as four Changes/Stays-the-same claims per §18.2 s5 q1)' },
          { id: 'q26', kind: 'judge', marks: [0, 3],
            prompt: 'A grouped frequency table shows the performance of 22 students in a test. The teacher then discovers he forgot to record two students, who scored 21 and 39, and amends the table. Decide the effect of amending the table.',
            data: { cols: [
              { id: 'cls', head: 'Score', given: [
                { lo: 0, hi: 20, text: '0 ≤ x < 20' }, { lo: 20, hi: 40, text: '20 ≤ x < 40' }, { lo: 40, hi: 60, text: '40 ≤ x < 60' },
                { lo: 60, hi: 80, text: '60 ≤ x < 80' }, { lo: 80, hi: 100, text: '80 ≤ x < 100' }
              ] },
              { id: 'f', head: 'Frequency', given: ['7', '6', '4', '3', '4'] }
            ] },
            claims: [
              { text: 'Once the two missing scores are added, the range will…', options: ['Change', 'Stay the same'], verdict: 'Stay the same',
                proof: { kind: 'changes', stat: 'range',
                  before: [10, 10, 10, 10, 10, 10, 10, 30, 30, 30, 30, 50, 50, 50, 50, 70, 70, 70, 90, 90, 90, 90],
                  after: [10, 10, 10, 10, 10, 10, 10, 30, 30, 30, 30, 30, 30, 50, 50, 50, 50, 70, 70, 70, 90, 90, 90, 90] } },
              { text: 'With 21 and 39 in the table, the mean will…', options: ['Change', 'Stay the same'], verdict: 'Change',
                proof: { kind: 'changes', stat: 'mean',
                  before: [10, 10, 10, 10, 10, 10, 10, 30, 30, 30, 30, 50, 50, 50, 50, 70, 70, 70, 90, 90, 90, 90],
                  after: [10, 10, 10, 10, 10, 10, 10, 30, 30, 30, 30, 30, 30, 50, 50, 50, 50, 70, 70, 70, 90, 90, 90, 90] } },
              { text: 'After the table is amended, the class containing the median will be…', options: ['0 ≤ x < 20', '20 ≤ x < 40', '40 ≤ x < 60', '60 ≤ x < 80', '80 ≤ x < 100'], verdict: '20 ≤ x < 40',
                proof: { kind: 'medianInterval', row: 1 } }
            ],
            src: 'Statistics M7 (1).pdf Q22' },
          { id: 'q27', kind: 'judge', marks: [0, 1],
            prompt: 'A table shows the salaries of 120 workers, grouped into unequal class widths (the top class stretches from £50,000 to £200,000). Decide which average better represents a typical salary here.',
            data: { cols: [
              { id: 'cls', head: 'Salary (£1000s)', given: [
                { lo: 0, hi: 10, text: '0 < s ≤ 10' }, { lo: 10, hi: 20, text: '10 < s ≤ 20' }, { lo: 20, hi: 30, text: '20 < s ≤ 30' },
                { lo: 30, hi: 50, text: '30 < s ≤ 50' }, { lo: 50, hi: 200, text: '50 < s ≤ 200' }
              ] },
              { id: 'f', head: 'Frequency', given: ['8', '48', '50', '11', '3'] }
            ] },
            claims: [
              { text: 'Which average better represents a typical salary?', options: ['Mean', 'Median'], verdict: 'Median',
                proof: { kind: 'compareAverage', stat: 'typical salary', better: 'B' } }
            ],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image23, Extension Q1 (Corbett Maths); proof.better is positional over q.claims[0].options — A = options[0] \'Mean\', B = options[1] \'Median\' (see authoredNarration)' },
          { id: 'q28', kind: 'judge', marks: [0, 5],
            prompt: 'Alma planted some seeds to test different composts. After a week she measured the heights of thirty seedlings, in millimetres, and recorded her results in the table below. Decide if each statement is True, False, or Not enough information.',
            data: { cols: [
              { id: 'cls', head: 'Height of seedling (h)', given: [
                { lo: 0, hi: 5, text: '0 < h ≤ 5' }, { lo: 5, hi: 10, text: '5 < h ≤ 10' }, { lo: 10, hi: 15, text: '10 < h ≤ 15' },
                { lo: 15, hi: 20, text: '15 < h ≤ 20' }, { lo: 20, hi: 25, text: '20 < h ≤ 25' }
              ] },
              { id: 'f', head: 'Frequency', given: ['5', '5', '4', '9', '7'] }
            ] },
            claims: [
              { text: 'The estimated mean = 415 ÷ 5.', options: ['True', 'False', 'Not enough information'], verdict: 'False',
                proof: { kind: 'estMeanDivisor', divisor: 5 } },
              { text: 'The range of the heights was 25.', options: ['True', 'False', 'Not enough information'], verdict: 'Not enough information',
                proof: { kind: 'exactFromGrouped', stat: 'range' } },
              { text: 'There were 5 seeds with a height of 20mm or more.', options: ['True', 'False', 'Not enough information'], verdict: 'False',
                proof: { kind: 'countAtLeast', lo: 20, says: 5 } },
              { text: 'The median interval is 15 < h ≤ 20.', options: ['True', 'False', 'Not enough information'], verdict: 'True',
                proof: { kind: 'medianInterval', row: 3 } },
              { text: 'The modal interval of the heights was 5.', options: ['True', 'False', 'Not enough information'], verdict: 'False',
                proof: { kind: 'modalInterval', row: 0 } }
            ],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image25 (left, Alma\'s seedlings)' },

          { id: 'q29', kind: 'values', marks: [0, 1], reserve: true,
            prompt: 'Bright Bulbs\' median lifetime is given as 30 months. Xtra Brite\'s lifetime is grouped, so its median must be estimated. Estimate Xtra Brite\'s median lifetime, in months, to 1 decimal place.',
            fig: { type: 'table', cols: [
              { id: 'cls', head: 'Lifetime (months)', given: [
                { lo: 0, hi: 12, text: '0 < t ≤ 12' }, { lo: 12, hi: 24, text: '12 < t ≤ 24' }, { lo: 24, hi: 36, text: '24 < t ≤ 36' },
                { lo: 36, hi: 48, text: '36 < t ≤ 48' }, { lo: 48, hi: 120, text: '48 < t ≤ 120' }
              ] },
              { id: 'f', head: 'Frequency', given: ['19', '53', '74', '42', '12'] }
            ] },
            slots: [
              { id: 'medianEstimate', label: 'Estimated median lifetime (months)', stat: 'medianClass', answer: { n: 285, d: 10 }, earns: 'accuracy', decimal: true, dp: 1 }
            ],
            src: 'Data Collection and analysis Booklet no answers.docx (1.4) image24, Extension Q2 (Xtra Brite lifetimes, grouped: 0<t≤12(19), 12<t≤24(53), 24<t≤36(74), 36<t≤48(42), 48<t≤120(12), n=200 — interpolated median ≈ 28.5, distinct from Bright Bulbs\' given 30)' }
        ]
      }
    ]
  };
})();
