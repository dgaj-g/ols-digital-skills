#!/usr/bin/env node
/* qa-period-budget.js — ONE PERIOD PER BOOK, AS A RULE A MACHINE CHECKS.
 *
 * G-A6. FAULT: a book that cannot fit the period it was written for (rule 28).
 * A promise the timetable cannot keep is the DFM 35 class: the screen offers
 * what the room will not deliver, and the teacher discovers it in the lesson.
 *
 * The Core budget is 26 interaction units. A unit is one thing a pupil DOES
 * that has to be thought about — derived from the question's own shape (its
 * marks and its kind's cost), never from a typed estimate per question.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'fast';
const ORDER = 25;
const COVERS = { books: '*', kinds: '*', surfaces: [], widths: [], projector: false, tier: ['preview'], cells: ['period'] };
const CONTROLS = [
  { id: 'over-budget-book', kind: 'fixture', plant: 'fixture-book', mustFail: /Core = \d+ units, cap 26/ },
  { id: 'marks-out-of-range', kind: 'fixture', plant: 'fixture-book', mustFail: /marks/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const CAP = 26;
/* the cost of a kind, in units — what she has to think about once. A tap kind
   that asks for one classification is one unit; a multi-line route is one unit
   per mark, because a mark is what the scheme pays for a step. */
const COST = {
  classify: 1, protractor: 2, reasoned: null,      /* null: cost = total marks */
  subst: null, simplify: null, expand: null, solve: null, form: null,
  fixture: 27
};
/* THE STATS RULE IS THE DESIGN'S, NOT AN INVENTED ONE (STATS §20.4, corrected
   by the build-readiness review of 7 Sept 2026). What costs a class time is
   what she has to DO, not what the paper pays: a two-stage item is two acts, a
   read at a value is half an act more than a read at a height, and a chart
   with a nudge pad is half an act more than a chip. Scoring `qlist` at its
   MARKS - which is what this table said before - made Book C read as about 36
   units against a cap of 26 and would have had the build cut a third of the
   book to satisfy an arithmetic the design never used. */
const STATS_KINDS = ['qlist', 'cftable', 'cfplot', 'cfread', 'boxplot', 'compare', 'judge', 'values',
  'order', 'pick', 'stemleaf', 'pie', 'scatter', 'table'];
function statsCost(q) {
  if (q && q.from) return 2;                                     /* a two-stage item */
  if (q && Array.isArray(q.ask) && q.ask.some(a => a && a.type === 'atX')) return 1.5;
  if (q && ['cfplot', 'pie', 'scatter'].indexOf(q.kind) > -1) return 1.5;
  return 1;
}

const g = new Gate('qa-period-budget');
g.exempt(['a book with a dated period waiver in MATHS_COVERAGE_DEBT.md is REPORTED, never failed (rule 30)',
  'a reserve question costs nothing — Reserve is what the teacher reaches for when the class is quick']);

const ledger = A.read(A.qa('MATHS_COVERAGE_DEBT.md'));
const waived = new Set();
ledger.split('\n').forEach(l => {
  const m = /^\|\s*([a-z0-9-]+)\s*×\s*([a-z-]+)\s*\|/.exec(l);
  if (m && /WAIVED BY HIS RULING/.test(l)) waived.add(m[1] + '×' + m[2]);
});

const per = {};
A.grid().forEach(r => {
  const marks = Array.isArray(r.marks) ? r.marks.reduce((a, b) => a + b, 0) : 1;
  if (!waived.has(r.book + '×period-budget')) {
    g.check(marks >= 1 && marks <= 5, r.book + ' > ' + r.section + ' > ' + r.qid, 'period',
      'marks total ' + marks + ' — a question is worth between 1 and 5 marks or it is two questions');
  }
  if (r.reserve) return;
  const c = STATS_KINDS.indexOf(r.kind) > -1 ? statsCost(r.question) : COST[r.kind];
  per[r.book] = (per[r.book] || 0) + (c == null ? Math.max(1, marks) : c);
});
Object.keys(per).sort().forEach(book => {
  const n = per[book];
  if (waived.has(book + '×period-budget')) { g.note(book + ': Core = ' + n + ' units (WAIVED — approved and live)'); return; }
  g.check(n <= CAP, book, 'period',
    'Core = ' + n + ' units, cap ' + CAP + ' — move a question to Reserve before it costs the class its period');
  g.note(book + ': Core = ' + n + ' units');
});
g.done();
