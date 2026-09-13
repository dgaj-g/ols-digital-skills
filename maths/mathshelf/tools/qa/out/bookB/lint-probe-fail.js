/* LINT-B package — throwaway PROOF pack: one deliberate fault per question
   (Book A's own precedent, tools/qa/out/bookA/FIXTURE_A.txt), each name in a
   comment above it, exercising a rule THIS package added. Every failing
   sentence is pasted into LINT_NOTES.md from a real run of:
     NODE_PATH="$(npm root -g)" node dev/lint-content-stats.js --pack tools/qa/out/bookB/lint-probe-fail.js
   Never shipped; not part of any book. */
(function () {
  'use strict';
  window.GJ_CONTENT = window.GJ_CONTENT || {};
  window.GJ_CONTENT['lint-probe-b-fail'] = {
    id: 'lint-probe-b-fail',
    title: 'LINT-B probe (fail)',
    engine: 'stats',
    cover: { accent: 'copper', motif: 'table-bar' },
    rules: { quartileRule: 'n+1', curveRule: 'split50', startPoint: true, curveStyle: 'smooth', readTol: 1, plotTol: 0 },
    sections: [{
      id: 's1', title: 'table faults', walt: 'A fixture WALT.',
      movie: { title: 'm', steps: [{ say: 'A fixture caption.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }] },
      questions: [
        /* 1: both x and cls present */
        { id: 'q1', kind: 'table', marks: [1, 0], src: 'fixture', prompt: 'p',
          cols: [{ id: 'x', head: 'x', given: [1, 2] }, { id: 'cls', head: 'c', given: [{ lo: 0, hi: 5, text: '0-5' }, { lo: 5, hi: 10, text: '5-10' }] }, { id: 'f', head: 'f', given: [1, 1] }],
          asks: [] },
        /* 2: neither x nor cls */
        { id: 'q2', kind: 'table', marks: [1, 0], src: 'fixture', prompt: 'p',
          cols: [{ id: 'f', head: 'f', given: [1, 1] }], asks: [] },
        /* 3: no f column */
        { id: 'q3', kind: 'table', marks: [1, 0], src: 'fixture', prompt: 'p',
          cols: [{ id: 'x', head: 'x', given: [1, 2] }], asks: [] },
        /* 4: class lo >= hi */
        { id: 'q4', kind: 'table', marks: [1, 0], src: 'fixture', prompt: 'p',
          cols: [{ id: 'cls', head: 'c', given: [{ lo: 10, hi: 5, text: '10-5' }] }, { id: 'f', head: 'f', given: [3] }], asks: [] },
        /* 5: class with no text */
        { id: 'q5', kind: 'table', marks: [1, 0], src: 'fixture', prompt: 'p',
          cols: [{ id: 'cls', head: 'c', given: [{ lo: 0, hi: 5, text: '' }] }, { id: 'f', head: 'f', given: [3] }], asks: [] },
        /* 6: classes not contiguous (gap of 3) */
        { id: 'q6', kind: 'table', marks: [1, 0], src: 'fixture', prompt: 'p',
          cols: [{ id: 'cls', head: 'c', given: [{ lo: 0, hi: 5, text: '0-5' }, { lo: 8, hi: 13, text: '8-13' }] }, { id: 'f', head: 'f', given: [3, 2] }], asks: [] },
        /* 7: totals names an unknown column */
        { id: 'q7', kind: 'table', marks: [1, 0], src: 'fixture', prompt: 'p',
          cols: [{ id: 'x', head: 'x', given: [1, 2] }, { id: 'f', head: 'f', given: [3, 2] }], totals: ['nope'], asks: [] },
        /* 8: mean value ask wrong answer (dp unset) */
        { id: 'q8', kind: 'table', marks: [1, 1], src: 'fixture', prompt: 'p',
          cols: [{ id: 'x', head: 'x', given: [1, 2, 3] }, { id: 'f', head: 'f', given: [1, 1, 1] }, { id: 'fx', head: 'f × x', derive: 'f*x' }],
          asks: [{ type: 'value', id: 'mean', label: 'Mean', answer: { n: 99, d: 1 }, ft: 'sum(fx)/sum(f)' }] },
        /* 9: mean ask ft not of the closed sum(a)/sum(b) form */
        { id: 'q9', kind: 'table', marks: [1, 1], src: 'fixture', prompt: 'p',
          cols: [{ id: 'x', head: 'x', given: [1, 2, 3] }, { id: 'f', head: 'f', given: [1, 1, 1] }, { id: 'fx', head: 'f × x', derive: 'f*x' }],
          asks: [{ type: 'value', id: 'mean', label: 'Mean', answer: { n: 2, d: 1 }, ft: 'fx/f' }] },
        /* 10: a median value ask carrying an ft (must carry none) */
        { id: 'q10', kind: 'table', marks: [1, 1], src: 'fixture', prompt: 'p',
          cols: [{ id: 'x', head: 'x', given: [1, 2, 3] }, { id: 'f', head: 'f', given: [1, 1, 1] }, { id: 'fx', head: 'f × x', derive: 'f*x' }],
          asks: [{ type: 'value', id: 'median', label: 'Median', answer: { n: 2, d: 1 }, ft: 'sum(fx)/sum(f)' }] },
        /* 11: modal row ask wrong index */
        { id: 'q11', kind: 'table', marks: [1, 0], src: 'fixture', prompt: 'p',
          cols: [{ id: 'x', head: 'x', given: [1, 2] }, { id: 'f', head: 'f', given: [1, 5] }],
          asks: [{ type: 'row', id: 'modal', label: 'Modal', answer: 0 }] },
        /* 12: mean ask distinguishability — AV_DIV_ROWS equals the truth (every f = 1, so ÷rows = ÷n by coincidence) */
        { id: 'q12', kind: 'table', marks: [1, 1], src: 'fixture', prompt: 'p',
          cols: [{ id: 'x', head: 'x', given: [1, 2, 3] }, { id: 'f', head: 'f', given: [1, 1, 1] }, { id: 'fx', head: 'f × x', derive: 'f*x' }],
          asks: [{ type: 'value', id: 'mean', label: 'Mean', answer: { n: 2, d: 1 }, ft: 'sum(fx)/sum(f)' }] }
      ]
    }, {
      id: 's2', title: 'values faults', walt: 'A fixture WALT.',
      movie: { title: 'm', steps: [{ say: 'A fixture caption.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }] },
      questions: [
        /* 13: earns not method/accuracy */
        { id: 'q13', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'p',
          slots: [{ id: 'a', label: 'A', answer: { n: 1, d: 1 }, earns: 'bonus' }], order: ['a'] },
        /* 14: order names an unknown slot */
        { id: 'q14', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'p',
          slots: [{ id: 'a', label: 'A', answer: { n: 1, d: 1 } }], order: ['nope'] },
        /* 15: stat not recognised */
        { id: 'q15', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'p',
          fig: { type: 'list', values: [1, 2, 3] },
          slots: [{ id: 'a', label: 'A', stat: 'stdev', answer: { n: 1, d: 1 } }], order: ['a'] },
        /* 16: stat mean, wrong answer against the printed list */
        { id: 'q16', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'p',
          fig: { type: 'list', values: [1, 2, 3] },
          slots: [{ id: 'a', label: 'Mean', stat: 'mean', answer: { n: 99, d: 1 } }], order: ['a'] },
        /* 17: stat range — the slip (max) equals the truth (min = 0) */
        { id: 'q17', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'p',
          fig: { type: 'list', values: [0, 4, 8] },
          slots: [{ id: 'a', label: 'Range', stat: 'range', answer: { n: 8, d: 1 } }], order: ['a'] },
        /* 18: stat missing, prompt/label do not state the mean */
        { id: 'q18', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'Find the missing value.',
          slots: [{ id: 'a', label: 'The missing value is', stat: 'missing', answer: { n: 10, d: 1 } }], order: ['a'] },
        /* 19: stat missing with given.mean/n that does not reconcile */
        { id: 'q19', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'The mean of 3, 5 and ? is 6.',
          fig: { type: 'list', values: [3, 5, '?'] },
          slots: [{ id: 'a', label: 'The mean of 3, 5 and ? is 6. The missing value is', stat: 'missing', answer: { n: 99, d: 1 }, given: { mean: 6, n: 3 } }], order: ['a'] },
        /* 20: constraint set unsatisfiable */
        { id: 'q20', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'p',
          slots: [{ id: 'a', label: 'A', answer: { constraints: { n: 5, mean: 1, median: 29, mode: 1 } } }] },
        /* 21: fig list with no values */
        { id: 'q21', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'p',
          fig: { type: 'list', values: [] }, slots: [{ id: 'a', label: 'A', answer: { n: 1, d: 1 } }], order: ['a'] },
        /* 22: reverse mean — total slot's given.mean/n does not reconcile with its own answer */
        { id: 'q22', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'p',
          slots: [{ id: 'total', label: 'Total', stat: 'total', answer: { n: 999, d: 1 }, given: { mean: 10, n: 4 } }], order: ['total'] },
        /* 23: reverse mean — newMean without ft.rule rm.newMean */
        { id: 'q23', kind: 'values', marks: [0, 1], src: 'fixture', prompt: 'p',
          slots: [{ id: 'nm', label: 'New mean', stat: 'newMean', answer: { n: 9, d: 1 } }], order: ['nm'] },
        /* 24: reverse mean — newMean's own re-derivation is wrong */
        { id: 'q24', kind: 'values', marks: [0, 2], src: 'fixture', prompt: 'p',
          slots: [
            { id: 'total', label: 'Total', stat: 'total', answer: { n: 40, d: 1 }, given: { mean: 10, n: 4 } },
            { id: 'nm', label: 'New mean', stat: 'newMean', answer: { n: 999, d: 1 }, ft: { rule: 'rm.newMean', from: ['total'], x: 5, n: 5 } }
          ], order: ['total', 'nm'] },
        /* 25: reverse mean distinguishability — RM_AVERAGED_MEANS equals the truth
           (old mean 10, x = 10 too, so (10+10)/2 = 10 = the correct new mean).
           The old mean/n for this check come ONLY from the total slot's OWN
           `ft.rule:'rm.total'` (exactly as statcore's reverseMeanCtx reads
           them) — a total slot authored with `given:{mean,n}` instead (as
           q22/q24 above, and as most of CONTENT-B's own pack does) carries
           no oldMean either the engine or this lint can read, so this slip
           is undetectable on that shape; recorded in LINT_NOTES.md. */
        { id: 'q25', kind: 'values', marks: [0, 2], src: 'fixture', prompt: 'p',
          slots: [
            { id: 'total', label: 'Total', stat: 'total', answer: { n: 40, d: 1 }, earns: 'method', ft: { rule: 'rm.total', mean: 10, n: 4 } },
            { id: 'nm', label: 'New mean', stat: 'newMean', answer: { n: 10, d: 1 }, ft: { rule: 'rm.newMean', from: ['total'], x: 10, n: 5 } }
          ], order: ['total', 'nm'] }
      ]
    }, {
      id: 's3', title: 'judge faults', walt: 'A fixture WALT.',
      movie: { title: 'm', steps: [{ say: 'A fixture caption.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }, { say: 'Another.' }] },
      questions: [
        /* 26: TFN claim with no proof at all */
        { id: 'q26', kind: 'judge', marks: [0, 1], src: 'fixture', prompt: 'p',
          claims: [{ text: 'Something.', options: ['True', 'False', 'Not enough information'], verdict: 'True' }] },
        /* 27: estMeanDivisor — verdict disagrees with the proof */
        { id: 'q27', kind: 'judge', marks: [0, 1], src: 'fixture', prompt: 'p',
          data: { cols: [{ id: 'x', head: 'x', given: [1, 2] }, { id: 'f', head: 'f', given: [3, 7] }] },
          claims: [{ text: 'Divide by 2.', options: ['True', 'False', 'Not enough information'], verdict: 'True', proof: { kind: 'estMeanDivisor', divisor: 2 } }] },
        /* 28: exactFromGrouped — verdict is not NEI */
        { id: 'q28', kind: 'judge', marks: [0, 1], src: 'fixture', prompt: 'p',
          data: { cols: [{ id: 'cls', head: 'c', given: [{ lo: 0, hi: 5, text: '0-5' }, { lo: 5, hi: 10, text: '5-10' }] }, { id: 'f', head: 'f', given: [2, 2] }] },
          claims: [{ text: 'The mean is exact.', options: ['True', 'False', 'Not enough information'], verdict: 'True', proof: { kind: 'exactFromGrouped', stat: 'mean' } }] },
        /* 29: NOT a fault — kept as a witness that exactFromGrouped(range)
           does NOT mis-fire on uniform-width classes (it would have under
           the naive all-lo/all-hi construction; see LINT_NOTES.md for why
           the "coincide" branch of the range special-case is, in fact,
           unreachable for any table with positive class widths — a proof,
           not a bug, recorded rather than forced with degenerate data). */
        { id: 'q29', kind: 'judge', marks: [0, 1], src: 'fixture', prompt: 'p',
          data: { cols: [{ id: 'cls', head: 'c', given: [{ lo: 0, hi: 5, text: '0-5' }, { lo: 5, hi: 10, text: '5-10' }, { lo: 10, hi: 15, text: '10-15' }] }, { id: 'f', head: 'f', given: [2, 2, 2] }] },
          claims: [{ text: 'The range is 10.', options: ['True', 'False', 'Not enough information'], verdict: 'Not enough information', proof: { kind: 'exactFromGrouped', stat: 'range' } }] },
        /* 30: compareAverage — both groups have the same mean */
        { id: 'q30', kind: 'judge', marks: [0, 1], src: 'fixture', prompt: 'p',
          claims: [{ text: 'A is better.', options: ['A', 'B', 'Not enough information'], verdict: 'A',
            proof: { kind: 'compareAverage', stat: 'mean', A: { values: [4, 6, 8] }, B: { values: [2, 6, 10] } } }] }
      ]
    }]
  };
})();
