/* PROBE PACK (scratch, never shipped): the orchestrator's own smoke for BUILD.table
   and the values list/set:5 renderer. Data: Corbett "Averages from a frequency
   table" sweets (SOURCE_INVENTORY 1.4, image 12); worksheet (a) (image 7). */
(function () {
  'use strict';
  window.GJ_CONTENT = window.GJ_CONTENT || {};
  window.GJ_CONTENT['stats-averages'] = {
    id: 'stats-averages', title: 'Handling Data', cover: { accent: 'copper', motif: 'ftable' }, engine: 'stats',
    rules: { quartileRule: 'n+1', curveRule: 'split50', startPoint: true, curveStyle: 'smooth', readTol: 1, plotTol: 0 },
    authoredNarration: [],
    sections: [{
      id: 's1', title: 'Averages from a table', walt: 'Find the mean from a frequency table',
      movie: { title: 'Probe', src: 'probe', steps: [
        { say: 'The sweets in each packet were counted.', do: [{ write: { text: '23, 24, 25, 26, 27' } }] },
        { say: 'Multiply each value by its frequency.', do: [{ write: { text: '23 × 1 = 23' } }] }
      ] },
      questions: [
        { id: 'q1', kind: 'values', marks: [0, 4], prompt: 'Find the mean, median, mode and range of the list.',
          fig: { type: 'list', values: [3, 12, 4, 6, 8, 5, 4] },
          slots: [
            { id: 'mean', label: 'Mean', stat: 'mean', answer: { n: 6, d: 1 } },
            { id: 'median', label: 'Median', stat: 'median', answer: { n: 5, d: 1 } },
            { id: 'mode', label: 'Mode', stat: 'mode', answer: { n: 4, d: 1 } },
            { id: 'range', label: 'Range', stat: 'range', answer: { n: 9, d: 1 } }
          ], src: 'probe' },
        { id: 'q2', kind: 'table', marks: [2, 1], prompt: 'The table shows the number of sweets in 20 packets. Work out the mean number of sweets.',
          cols: [
            { id: 'x', head: 'Sweets', given: [23, 24, 25, 26, 27] },
            { id: 'f', head: 'Frequency', given: [1, 4, 9, 3, 3] },
            { id: 'fx', head: 'Frequency × sweets', derive: 'f*x' }
          ],
          totals: ['f', 'fx'],
          asks: [{ type: 'value', id: 'mean', label: 'Mean', answer: { n: 503, d: 20 }, ft: 'sum(fx)/sum(f)', dp: 2 },
                 { type: 'row', id: 'modal', label: 'Modal number of sweets', answer: 2 }],
          src: 'probe' },
        { id: 'q3', kind: 'values', marks: [0, 1], prompt: 'Write five numbers with a mean of 6 and a mode of 4.', reserve: true,
          slots: [{ id: 'set', label: 'Your five numbers', set: 5, answer: { constraints: { n: 5, mean: 6, mode: 4 } }, example: [4, 4, 6, 7, 9] }],
          src: 'probe' }
      ]
    }]
  };
})();
