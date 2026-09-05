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
  qlist: null, table: null, cftable: null, cfplot: 2, cfread: 1, boxplot: 2,
  compare: 2, judge: 1, values: null, order: 1, pick: 1, stemleaf: 2, pie: 2, scatter: 2,
  fixture: 27
};

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
  const c = COST[r.kind];
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
