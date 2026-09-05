#!/usr/bin/env node
/* qa-selftests.js — THE ENGINES' OWN CONTRACTS, MONOTONIC.
 *
 * G-A1. FAULT: an engine contract regressing silently (a dx that no longer
 * fires, a follow-through case that flipped); or a new book quietly LOWERING a
 * count, which reads as green because "the suite passed".
 *
 * The floors are read from MATHS_GATES_AUDIT.md, never from memory and never
 * from a constant in this file: the number and the record of the number are the
 * same fact, and a fact has one home (DFM 144).
 *
 * The CONTROL is a mutation: mathcore's own selfTest is loaded with one of its
 * assertions inverted and must fail. A suite that cannot be made to fail is not
 * proving anything.
 */
'use strict';
const { execFileSync } = require('child_process');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'fast';
const ORDER = 20;
const COVERS = { books: '*', kinds: '*', surfaces: [], widths: [], projector: false, tier: ['preview'], cells: ['selftest'] };
const CONTROLS = [
  { id: 'mutated-engine', kind: 'mutation', plant: 'fixture-engine-broken', mustFail: /selfTest: .* of .* cases failed/ },
  { id: 'lowered-floor', kind: 'fixture', plant: 'fixture-floor-drop', mustFail: /below its floor/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-selftests');
g.exempt(['a suite that does not exist yet (statcore) is reported as NOT BUILT, and its floor is not applied until the file lands']);

/* ---- the floors, from the audit file ---------------------------------- */
function floors() {
  const md = A.read(A.qa('MATHS_GATES_AUDIT.md'));
  const out = {};
  const start = md.indexOf('## THE FLOORS');
  const end = md.indexOf('## PINNED REFS');
  md.slice(start, end).split('\n').forEach(l => {
    const m = /^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/.exec(l);
    if (m) out[m[1].trim()] = Number(m[2]);
  });
  return out;
}
const F = floors();
g.note('floors read from MATHS_GATES_AUDIT.md: ' + JSON.stringify(F));

function runNode(script) {
  try { return { ok: true, out: execFileSync(process.execPath, [script], { cwd: A.APP, encoding: 'utf8', maxBuffer: 32e6 }) }; }
  catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || '') }; }
}

/* ---- mathcore -------------------------------------------------------- */
{
  global.window = global;
  const m = require(A.app('mathcore.js'));
  const r = m.selfTest();
  g.check(r.pass, 'mathcore', 'selfTest',
    r.failures.length + ' of ' + r.count + ' cases failed — first: "' + (r.failures[0] || '') + '"');
  const floor = F['mathcore.selfTest'];
  g.check(r.count >= floor, 'mathcore', 'selfTest',
    'the suite now runs ' + r.count + ' cases, below its floor of ' + floor + ' — a case deleted is a contract dropped');
  g.note('mathcore: ' + r.count + ' cases');
  g.cover({ cell: 'selftest', engine: 'mathcore', count: r.count });
}

/* ---- anglecore ------------------------------------------------------- */
{
  const r = runNode(A.app('dev/test-anglecore.js'));
  const n = Number((/anglecore selfTest: (\d+) cases/.exec(r.out) || [])[1] || 0);
  const fails = Number((/(\d+) failures/.exec(r.out) || [])[1] || 0);
  g.check(r.ok && fails === 0, 'anglecore', 'selfTest',
    fails + ' of ' + n + ' cases failed — see dev/test-anglecore.js output');
  const floor = F['dev/test-anglecore.js'];
  g.check(n >= floor, 'anglecore', 'selfTest',
    'the suite now runs ' + n + ' cases, below its floor of ' + floor);
  g.note('anglecore: ' + n + ' cases');
  g.cover({ cell: 'selftest', engine: 'anglecore', count: n });
}

/* ---- statcore, when it exists ---------------------------------------- */
if (A.exists(A.app('dev/test-statcore.js'))) {
  const r = runNode(A.app('dev/test-statcore.js'));
  const n = Number((/(\d+) cases/.exec(r.out) || [])[1] || 0);
  g.check(r.ok, 'statcore', 'selfTest', 'the statcore suite did not pass');
  const floor = F['dev/test-statcore.js'];
  g.check(n >= floor, 'statcore', 'selfTest', 'the suite now runs ' + n + ' cases, below its floor of ' + floor);
} else {
  g.note('statcore: NOT BUILT (Handling Data is the next session) — its floor is not applied');
}

/* ---- the two lints and validate-all ---------------------------------- */
[['dev/lint-content-angles.js', 'angles'], ['dev/lint-content-algebra.js', 'algebra']].forEach(([f, book]) => {
  const r = runNode(A.app(f));
  g.check(r.ok && /PASS/.test(r.out), book, 'lint',
    'the content lint did not pass — every authored answer must be re-derived by a second implementation\n' +
    r.out.split('\n').filter(l => /problem|FAIL|✗/i.test(l)).slice(0, 6).map(l => '        ' + l).join('\n'));
});
{
  const r = runNode(A.app('dev/validate-all.js'));
  const m = /(\d+) questions checked\s*-\s*(\d+) sound, (\d+) need attention/.exec(r.out);
  const checked = m ? Number(m[1]) : 0, sound = m ? Number(m[2]) : 0, bad = m ? Number(m[3]) : 1;
  g.check(r.ok && bad === 0, 'validate-all', 'truth',
    bad + ' of ' + checked + ' questions did not mark a model attempt full or did not catch a corrupted one');
  const floor = F['dev/validate-all.js'];
  g.check(checked >= floor, 'validate-all', 'truth',
    'only ' + checked + ' questions were checked, below the floor of ' + floor);
  g.note('validate-all: ' + sound + ' of ' + checked + ' sound');
}
{
  const r = runNode(A.app('dev/test-server-scoping.js'));
  const n = Number((/(\d+) passed/.exec(r.out) || [])[1] || 0);
  const floor = F['dev/test-server-scoping.js'];
  g.check(r.ok, 'server-scoping', 'authority', 'the per-teacher scoping suite did not pass');
  g.check(n >= floor, 'server-scoping', 'authority',
    'only ' + n + ' scoping assertions ran, below the floor of ' + floor);
}

g.done();
