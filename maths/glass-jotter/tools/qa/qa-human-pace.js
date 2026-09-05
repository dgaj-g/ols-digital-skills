#!/usr/bin/env node
/* qa-human-pace.js — EVERY CLOCK IS WRITTEN DOWN, AND NONE OF THEM MEASURES A PUPIL.
 *
 * G-D6 / DFM 269. FAULT: a budget billed against a child's thinking. On KS3 DT
 * it was a five-second clock on a Python run; here the classes are the save
 * debounce, the wall poll, the pen-speed durations, the busy cards, the relay's
 * UrlFetch and the markbook's idle re-lock.
 *
 * Two directions, both failures (L14): a constant with no inventory row, and an
 * inventory row for a constant that no longer exists. A record that drifts from
 * the code is worse than no record, because it is read and believed.
 *
 * And one assertion that is the whole point: NO CODE PATH COMPARES ELAPSED TIME
 * AGAINST PUPIL INPUT. A maths question has no execution budget and never may.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const TC = require('./lib/timeconsts.js');
const { stripComments } = require('./lib/decl.js');

const TIER = 'fast';
const ORDER = 46;
const COVERS = { books: '*', kinds: '*', surfaces: '*', widths: [], projector: false, tier: ['preview', 'built'], cells: ['human-pace'] };
const CONTROLS = [
  { id: 'unrecorded-clock', kind: 'mutation', mustFail: /no inventory row/ },
  { id: 'stale-row', kind: 'fixture', plant: 'fixture-pace-stale', mustFail: /names a clock that no longer exists/ },
  { id: 'budget-on-a-child', kind: 'mutation', mustFail: /times a pupil/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-human-pace');
g.exempt(['a delay under ' + TC.FLOOR + 'ms is a frame, not a budget, and is not inventoried',
  'the animation step durations inside player.js movie ops are inventoried once per function, not once per call']);

const rows = new Map();
if (A.exists(A.qa('MATHS_HUMAN_PACE_INVENTORY.md'))) {
  A.read(A.qa('MATHS_HUMAN_PACE_INVENTORY.md')).split('\n').forEach(l => {
    const m = /^\|\s*`([^`]+)`\s*\|\s*([^|]*?)\s*\|/.exec(l);
    if (m) rows.set(m[1].trim(), m[2].trim());
  });
}
const found = TC.all(A.APP);
g.note(found.length + ' clocks in the client and the template; ' + rows.size + ' inventory rows');

found.forEach(c => {
  const why = rows.get(c.key);
  g.check(!!why, c.file + ' :: ' + c.fn + ' :: ' + c.value, 'human-pace',
    'no inventory row — say what this clock bounds and why a slow child cannot trip it  [' + c.text + ']');
  if (why) g.check(why.length > 15, c.key, 'human-pace',
    'the inventory row says nothing useful ("' + why + '") — a row that explains nothing is a row nobody read');
});
const keys = new Set(found.map(c => c.key));
rows.forEach((why, key) => {
  g.check(keys.has(key), key, 'human-pace',
    'the inventory names a clock that no longer exists in the code — a record that drifts is read and believed');
});

/* ---- and the one that matters: nothing times the pupil ------------------ */
const marking = /(check|mark|lock|submit|attempt|commit|answer)/i;
A.renderFiles().forEach(f => {
  const src = stripComments(A.read(f));
  src.split('\n').forEach((l, i) => {
    if (!/(Date\.now|performance\.now)\s*\(\s*\)/.test(l)) return;
    if (!/[-<>]/.test(l)) return;
    /* a difference of two clocks compared against a limit, on a path whose own
       name says it is about her answer */
    if (!/(Date\.now|performance\.now)\s*\(\s*\)\s*-\s*/.test(l)) return;
    if (!marking.test(l)) return;
    g.fail(f.split('/').pop() + ':' + (i + 1), 'human-pace',
      'this line times a pupil: an elapsed-time comparison on a marking path — a maths question has no execution budget  [' + l.trim().slice(0, 90) + ']');
  });
});

g.done();
