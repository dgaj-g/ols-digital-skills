#!/usr/bin/env node
/* qa-self-eval.js — THE CARD FITS THE EXERCISE SHE JUST DID.
 *
 * G-E10 / rule 12, and it is a small fault with a specific sting: on 25 June the
 * end-of-exercise card on an ANGLES exercise showed the generic fallback chips
 * instead of that exercise's own "I can…" lines, so a pupil was asked to rate
 * herself on something she had not been doing. The fix was per-section chips;
 * this gate is what stops the fallback creeping back on a section that has its
 * own.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { objectEntries } = require('./lib/decl.js');

const TIER = 'fast';
const ORDER = 45;
const COVERS = { books: '*', kinds: [], surfaces: ['self-eval'], widths: [], projector: false, tier: ['preview'], cells: ['self-eval'] };
const CONTROLS = [
  { id: 'fallback-on-a-section-with-its-own', kind: 'fixture', plant: 'fixture-selfeval-fallback', mustFail: /the generic fallback/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-self-eval');
const trips = objectEntries(A.app('script.js'), /var\s+SELF_EVAL_TRIPS\s*=\s*/);
if (!trips) {
  g.fail('script.js', 'self-eval', 'SELF_EVAL_TRIPS is not where this gate can read it — the per-exercise chips cannot be checked at all');
  g.done(); process.exit(1);
}
A.books().forEach(book => {
  const body = trips[book];
  g.check(!!body, book, 'self-eval',
    'this book has no SELF_EVAL_TRIPS entry at all, so every one of its exercises would show the generic fallback');
  if (!body) return;
  const own = (body.match(/(?:^|[{,\s])([a-z0-9_]+)\s*:/g) || []).map(s => s.replace(/[^a-z0-9_]/g, ''));
  A.content()[book].sections.forEach(sec => {
    g.check(own.includes(sec.id), book + ' > ' + sec.id, 'self-eval',
      'this exercise has no self-evaluation chips of its own, so it shows the generic fallback — a pupil would be asked to rate herself on something she has not been doing (rule 12)');
  });
  g.note(book + ': ' + own.filter(k => k !== '_').length + ' exercises with their own chips');
});
g.done();
