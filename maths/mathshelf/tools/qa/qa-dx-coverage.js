#!/usr/bin/env node
/* qa-dx-coverage.js — A MISCONCEPTION CODE THAT IS A PROMISE, NOT A DIAGNOSIS.
 *
 * FAULT: a code sitting in DX_NAMES that nothing can ever produce, and its
 * mirror image — a pack that cites a code DX_NAMES has never heard of. Both
 * read as green until the exact wrong line comes up in class: the first
 * shows the teacher nothing where a name was promised, the second shows her
 * a raw code (NEG_MUL_SIGN) instead of a sentence. A table of names is only
 * as trustworthy as the wiring that reaches it in both directions.
 *
 * DX_NAMES is read from staff.js's own source (never required — staff.js is
 * browser code), the same way every gate reads its own declarations: from
 * the file, comments stripped, never re-typed as a second copy that can go
 * stale (DFM 144). A code counts as "reachable by an engine" only when it is
 * a quoted, upper-case-with-underscore token inside mathcore.js or
 * anglecore.js source AND it already names a DX_NAMES key — that second
 * clause is deliberate, not an oversight: anglecore.js's own selfTest fixes
 * its diagnosis codes against deliberately-wrong labels ('ZZZ', 'BANANA',
 * 'NOPE', 'CUSTOM_20', 'HALF_GIVEN') to prove the matcher rejects a bad
 * guess, and none of those is a diagnosis a pupil could ever be shown — so
 * treating every shouting-case token in engine source as "a dx code" would
 * invent five faults out of a test harness's own fixture data (L6). Only
 * the intersection with the DX_NAMES table itself is a real signal.
 *
 * ONE KNOWN GAP, reported rather than silently patched: WRONG_SCALE and
 * MISREAD are genuinely produced at runtime — jotter.js's protractor marker
 * returns { dx: 'WRONG_SCALE' } and 'MISREAD' directly — but the contract
 * above only inspects mathcore.js and anglecore.js as "engines", so this
 * gate cannot see that jotter.js is the one emitting them. See the run
 * report for what that means for today's shipped result.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { objectEntries, stripComments } = require('./lib/decl.js');

const TIER = 'fast';
const ORDER = 23;
const COVERS = { books: '*', kinds: '*', surfaces: [], widths: [], projector: false, tier: ['preview'], cells: ['dx'] };
const CONTROLS = [
  { id: 'name-without-case', kind: 'fixture', plant: 'fixture-engine', mustFail: /no selfTest case and no pack can trigger it/ },
  { id: 'pack-cites-unknown-code', kind: 'fixture', plant: 'fixture-book', mustFail: /not in DX_NAMES/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-dx-coverage');
g.exempt([
  'jotter.js is not read as an "engine" by this gate — only mathcore.js and anglecore.js are (the contract as given); a code emitted only by jotter.js (the protractor marker) will read here as unreachable even when it is not — see the WRONG_SCALE / MISREAD note in the run output',
  'the reverse direction ("every engine-emitted code has a DX_NAMES entry") is true by construction, because an engine token only counts as "emitted" once it already matches a DX_NAMES key — so it is noted, not separately asserted, to avoid a check that can never fail meaning anything'
]);

/* ---- 1. DX_NAMES, read from staff.js's own source ----------------------- */
const entries = objectEntries(A.app('staff.js'), /var\s+DX_NAMES\s*=\s*/);
if (!entries) {
  g.fail('staff.js', 'dx', 'no DX_NAMES table was found in staff.js — every misconception code needs a plain-English name somewhere a teacher can read, and this gate could not find that table at all');
  g.done();
  process.exit(1);
}
const DX_NAMES = {};
Object.keys(entries).forEach(k => {
  const m = /^\s*'((?:[^'\\]|\\.)*)'\s*$/.exec(entries[k]) || /^\s*"((?:[^"\\]|\\.)*)"\s*$/.exec(entries[k]);
  DX_NAMES[k] = m ? m[1] : null;
});
const codes = Object.keys(DX_NAMES);
g.note(codes.length + ' codes in DX_NAMES: ' + codes.join(', '));

/* ---- 2. codes authored in a pack: the VALUES of q.dx, and q.slips[].dx --- */
const packCodes = new Map();   /* code -> [locations] */
function addUse(map, code, where) { if (!map.has(code)) map.set(code, []); map.get(code).push(where); }
A.grid().forEach(r => {
  const q = r.question;
  const where = r.book + ' > ' + r.section + ' > ' + r.qid;
  if (q && q.dx && typeof q.dx === 'object') {
    Object.keys(q.dx).forEach(k => { const v = q.dx[k]; if (typeof v === 'string') addUse(packCodes, v, where); });
  }
  if (q && Array.isArray(q.slips)) {
    q.slips.forEach(s => { if (s && typeof s.dx === 'string') addUse(packCodes, s.dx, where); });
  }
});
g.note(packCodes.size + ' distinct codes authored across the packs');

/* ---- 3. codes emitted by MARKING CODE -----------------------------------
   WHICH FILES COUNT, and why the first cut of this list was wrong. A slip is
   "reachable" if any code that marks a pupil's attempt can emit it. The two
   engines are the obvious homes - but the protractor renderer marks its own
   question (it decides whether she read the wrong scale or misplaced the
   protractor), and it lives in jotter.js. Naming only the engines condemned
   WRONG_SCALE and MISREAD as unreachable while they were being emitted six
   lines from a pupil's screen: a gate inventing a fault (L6). The list is the
   files that can mark, and a new renderer that marks joins it. */
const engineCodes = new Set();
['mathcore.js', 'anglecore.js', 'jotter.js', 'jotter-stats.js', 'statcore.js']
  .filter(f => A.exists(A.app(f)))
  .forEach(f => {
  const src = stripComments(A.read(A.app(f)));
  const re = /['"]([A-Z][A-Z0-9_]*)['"]/g;
  let m;
  while ((m = re.exec(src))) { if (Object.prototype.hasOwnProperty.call(DX_NAMES, m[1])) engineCodes.add(m[1]); }
});
g.note('codes emitted by marking code: ' + ([...engineCodes].sort().join(', ') || '(none)'));

/* ---- 4. every DX_NAMES code is authored in a pack OR emitted by an engine */
codes.forEach(code => {
  const authored = packCodes.has(code);
  const emitted = engineCodes.has(code);
  g.check(authored || emitted, code, 'dx',
    '"' + code + '" has a DX_NAMES entry but no selfTest case and no pack can trigger it — nobody can ever be shown this diagnosis, so it is a promise, not a diagnosis');
});

/* ---- 5. every code a pack cites has a DX_NAMES entry --------------------- */
packCodes.forEach((wheres, code) => {
  g.check(Object.prototype.hasOwnProperty.call(DX_NAMES, code), code, 'dx',
    'the pack cites the code "' + code + '" (first at ' + wheres[0] + ') which is not in DX_NAMES — a teacher who hits this line would read the raw code instead of a sentence');
});
/* the engine direction is true by construction (see the exemption above);
   noted rather than re-asserted */
g.note('every engine-emitted code is, by how it was collected, already a DX_NAMES key — that direction cannot fail and is not separately checked');

/* ---- 6. every DX_NAMES sentence is plain English ------------------------- */
const JARGON = [/\bexaminer\b/i, /\bmark scheme\b/i, /\bM\/A\b/, /\bpedagogy\b/i];
codes.forEach(code => {
  const s = DX_NAMES[code];
  if (s == null) { g.fail(code, 'dx', 'the DX_NAMES entry for "' + code + '" is not a plain string literal — write it as one so a teacher (and this gate) can read it'); return; }
  const words = s.trim().split(/\s+/).filter(Boolean);
  g.check(/^[A-Z]/.test(s), code, 'dx', 'the DX_NAMES sentence for "' + code + '" does not start with a capital letter: "' + s + '"');
  g.check(words.length >= 3, code, 'dx', 'the DX_NAMES sentence for "' + code + '" is only ' + words.length + ' word(s) long — a teacher needs at least a short plain sentence, not two words: "' + s + '"');
  g.check(!/\.$/.test(s), code, 'dx', 'the DX_NAMES sentence for "' + code + '" ends with a full stop, unlike every other entry in the table: "' + s + '"');
  const codeShapedWord = words.find(w => /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(w));
  g.check(!codeShapedWord, code, 'dx', 'the DX_NAMES sentence for "' + code + '" contains a raw code-shaped word ("' + codeShapedWord + '") instead of plain English: "' + s + '"');
  const leaked = codes.find(other => other !== code && s.indexOf(other) !== -1);
  g.check(!leaked, code, 'dx', 'the DX_NAMES sentence for "' + code + '" names another raw code ("' + leaked + '") instead of describing the slip in words: "' + s + '"');
  const jargonHit = JARGON.find(re => re.test(s));
  g.check(!jargonHit, code, 'dx', 'the DX_NAMES sentence for "' + code + '" uses exam-board jargon a pupil should never have to decode: "' + s + '"');
});

/* ---- 7. window.GJ_DX is exported from staff.js --------------------------- */
const staffSrc = stripComments(A.read(A.app('staff.js')));
g.check(/window\.GJ_DX\s*=\s*DX_NAMES/.test(staffSrc), 'staff.js', 'dx',
  'staff.js does not export window.GJ_DX = DX_NAMES — the pupil-side "Want to see how?" flow has no table to read a slip\'s name from');

g.done();
