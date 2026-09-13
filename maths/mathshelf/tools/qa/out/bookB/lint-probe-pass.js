/* LINT-B package — throwaway PROOF pack: every new Book B rule this package
   added to dev/lint-content-stats.js, on CORRECT data. Must PASS with 0
   failures. Not part of any book; loaded only via --pack. See LINT_NOTES.md
   for how each question maps to a rule and the exact command used. */
(function () {
  'use strict';
  window.GJ_CONTENT = window.GJ_CONTENT || {};
  window.GJ_CONTENT['lint-probe-b-pass'] = {
    id: 'lint-probe-b-pass',
    title: 'LINT-B probe (pass)',
    engine: 'stats',
    cover: { accent: 'copper', motif: 'table-bar' },
    rules: { quartileRule: 'n+1', curveRule: 'split50', startPoint: true, curveStyle: 'smooth', readTol: 1, plotTol: 0 },
    sections: [{
      id: 's1', title: 'table kind', walt: 'A fixture WALT.',
      movie: { title: 'm', steps: [{ say: 'A fixture caption.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }] },
      questions: [
        { id: 'q1', kind: 'table', marks: [3, 2], src: 'fixture',
          prompt: 'Fill the table and answer the questions.',
          cols: [
            { id: 'cls', head: 'Height (h)', given: [{ lo: 0, hi: 10, text: '0-10' }, { lo: 10, hi: 20, text: '10-20' }, { lo: 20, hi: 30, text: '20-30' }] },
            { id: 'f', head: 'Frequency', given: [5, 2, 3] },
            { id: 'mid', head: 'Midpoint', derive: 'mid' },
            { id: 'fx', head: 'f × x', derive: 'f*x' }
          ],
          totals: ['f', 'fx'],
          asks: [
            { type: 'value', id: 'mean', label: 'Mean =', answer: { n: 13, d: 1 }, ft: 'sum(fx)/sum(f)' },
            { type: 'row', id: 'modal', label: 'Modal class', answer: 0 },
            { type: 'row', id: 'medianClass', label: 'Class containing the median', answer: 1 }
          ] }
      ]
    }, {
      id: 's2', title: 'values averages + reverse mean + constraints', walt: 'A fixture WALT.',
      movie: { title: 'm', steps: [{ say: 'A fixture caption.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }] },
      questions: [
        { id: 'q2', kind: 'values', marks: [1, 3], src: 'fixture',
          prompt: 'Find the mean, median, mode and range.',
          fig: { type: 'list', values: [8, 3, 5, 6, 8] },
          slots: [
            { id: 'mean', label: 'Mean', stat: 'mean', answer: { n: 6, d: 1 }, earns: 'method' },
            { id: 'median', label: 'Median', stat: 'median', answer: { n: 6, d: 1 }, earns: 'accuracy' },
            { id: 'mode', label: 'Mode', stat: 'mode', answer: { n: 8, d: 1 }, earns: 'accuracy' },
            { id: 'range', label: 'Range', stat: 'range', answer: { n: 5, d: 1 }, earns: 'accuracy' }
          ],
          order: ['mean', 'median', 'mode', 'range'] },
        { id: 'q3', kind: 'values', marks: [1, 1], src: 'fixture',
          prompt: 'Four girls have a mean age of 10. A fifth girl, aged 5, joins them. Find the new mean.',
          slots: [
            { id: 'total', label: 'Total of the 4 ages', stat: 'total', answer: { n: 40, d: 1 }, earns: 'method', given: { mean: 10, n: 4 } },
            { id: 'newMean', label: 'New mean', stat: 'newMean', answer: { n: 9, d: 1 }, earns: 'accuracy', ft: { rule: 'rm.newMean', from: ['total'], x: 5, n: 5 } }
          ],
          order: ['total', 'newMean'] },
        { id: 'q4', kind: 'values', marks: [0, 1], reserve: true, src: 'fixture',
          prompt: 'Write down five numbers with mean 6, median 5 and mode 4.',
          slots: [{ id: 'set', label: 'Your five numbers', answer: { constraints: { n: 5, mean: 6, median: 5, mode: 4 } }, earns: 'accuracy' }] }
      ]
    }, {
      id: 's3', title: 'judge TFN proofs', walt: 'A fixture WALT.',
      movie: { title: 'm', steps: [{ say: 'A fixture caption.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }] },
      questions: [
        { id: 'q5', kind: 'judge', marks: [0, 5], src: 'fixture',
          prompt: 'Decide True, False or Not enough information.',
          data: { cols: [
            { id: 'cls', head: 'x', given: [{ lo: 0, hi: 10, text: '0-10' }, { lo: 10, hi: 20, text: '10-20' }, { lo: 20, hi: 30, text: '20-30' }] },
            { id: 'f', head: 'Frequency', given: [5, 2, 3] }
          ] },
          claims: [
            { text: 'The estimated mean = total ÷ 10.', options: ['True', 'False', 'Not enough information'], verdict: 'True', proof: { kind: 'estMeanDivisor', divisor: 10 } },
            { text: '3 values are 20 or more.', options: ['True', 'False', 'Not enough information'], verdict: 'True', proof: { kind: 'countAtLeast', lo: 20, says: 3 } },
            { text: 'The median interval is 10-20.', options: ['True', 'False', 'Not enough information'], verdict: 'True', proof: { kind: 'medianInterval', row: 1 } },
            { text: 'The modal interval is 0-10.', options: ['True', 'False', 'Not enough information'], verdict: 'True', proof: { kind: 'modalInterval', row: 0 } },
            { text: 'The exact mean can be found.', options: ['True', 'False', 'Not enough information'], verdict: 'Not enough information', proof: { kind: 'exactFromGrouped', stat: 'mean' } }
          ] },
        { id: 'q6', kind: 'judge', marks: [0, 2], src: 'fixture',
          prompt: 'Decide True, False or Not enough information.',
          data: { cols: [
            { id: 'cls', head: 'x', given: [{ lo: 0, hi: 10, text: '0-10' }, { lo: 10, hi: 20, text: '10-20' }] },
            { id: 'f', head: 'Frequency', given: [5, 5] }
          ] },
          claims: [
            { text: '3 loaves cost 87p.', options: ['True', 'False', 'Not enough information'], verdict: 'Not enough information', proof: { kind: 'costOf', n: 3, says: 87 } },
            { text: 'Adding a large value increases the mean.', options: ['Increase', 'Decrease', 'Stay the same'], verdict: 'Increase', proof: { kind: 'changes', stat: 'mean', before: [4, 6, 8], after: [4, 6, 8, 14] } }
          ] },
        { id: 'q7', kind: 'judge', marks: [0, 1], src: 'fixture',
          prompt: 'Which group has the higher mean?',
          claims: [{ text: 'Group B has the higher mean.', options: ['Group A', 'Group B', 'Not enough information'], verdict: 'Group B',
            proof: { kind: 'compareAverage', stat: 'mean', A: { values: [4, 6, 8] }, B: { values: [10, 12, 14] } } }] }
      ]
    }]
  };
})();
