#!/usr/bin/env node
/* qa-content-source.js — A QUESTION THAT CANNOT SAY WHERE IT CAME FROM WAS INVENTED.
 *
 * G-A5. FAULT: an invented dataset, stem or worked example; an unflagged
 * authored method narration. The standing law on this platform is "author
 * nothing until the sources arrive" (rule 27), and a law with no gate is a law
 * that will be broken the first time a book is a question short.
 *
 * The two LOCKED packs are grandfathered by dated waiver rows in
 * MATHS_COVERAGE_DEBT.md naming their MEP content map — read from that file, so
 * the waiver and the record of the waiver are one thing (DFM 222b).
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'fast';
const ORDER = 24;
const COVERS = { books: '*', kinds: '*', surfaces: [], widths: [], projector: false, tier: ['preview'], cells: ['source'] };
const CONTROLS = [
  { id: 'question-without-src', kind: 'fixture', plant: 'fixture-book', mustFail: /no src/ },
  { id: 'unflagged-narration', kind: 'fixture', plant: 'fixture-book', mustFail: /narrates a method/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-content-source');

/* the waivers, read from the ledger */
const ledger = A.read(A.qa('MATHS_COVERAGE_DEBT.md'));
const waived = new Set();
ledger.split('\n').forEach(l => {
  const m = /^\|\s*([a-z0-9-]+)\s*×\s*([a-z-]+)\s*\|/.exec(l);
  if (m && /WAIVED BY HIS RULING/.test(l)) waived.add(m[1] + '×' + m[2]);
});
g.note('waivers standing: ' + [...waived].join(', '));
g.exempt(['a book with a dated waiver row in MATHS_COVERAGE_DEBT.md is REPORTED, never failed — an approved thing is never re-opened (rule 30)']);

const C = A.content();
A.grid().forEach(r => {
  const key = r.book + '×source';
  if (waived.has(key)) return;
  g.check(!!r.question.src, r.book + ' > ' + r.section + ' > ' + r.qid, 'source',
    'no src — a question that cannot say where it came from was invented');
});
A.movies().forEach(m => {
  const key = m.book + '×source';
  if (waived.has(key)) return;
  g.check(!!m.movie.src, m.book + ' > ' + m.section + ' > movie', 'source',
    'no src on the movie — a worked example with no source was invented');
});

/* authored narration: a movie whose METHOD WORDS are ours rather than the
   paper's must be declared in the pack header, so the flag is visible when the
   teacher reads the book rather than buried in a build log */
Object.keys(C).forEach(book => {
  if (waived.has(book + '×source')) return;
  const pack = C[book];
  const declared = pack.authoredNarration;
  g.check(Array.isArray(declared), book, 'source',
    'the pack narrates a method with no authoredNarration list in its header — say which movies are in our words');
});

const total = A.grid().length;
g.note(total + ' questions across ' + A.books().length + ' books; ' + waived.size + ' cells waived');
g.done();
