#!/usr/bin/env node
/* qa-v3-shape.js — THE LOCKED RENDERERS MARK EXACTLY AS THEY DID.
 *
 * G-E11 / DFM 176, 218 and rule 30. v4 re-skins every pixel around the v3 tap
 * renderers, and "unchanged" is a claim that only a per-question pinned verdict
 * can prove. The DOM changes by design; the MARKING must not move by a mark.
 *
 * The reference is generated once, from the model attempts, and pinned in
 * tools/qa/fixtures/v3-shape.json. After that, any change to a verdict or a
 * mark on any of the 48 approved questions fails by name — including a change
 * that looks like an improvement, because an approved thing is not re-opened to
 * make something else tidy.
 *
 * Regenerate deliberately, never casually:
 *     node tools/qa/qa-v3-shape.js --pin
 * and say in PROGRESS.md why the pin moved.
 */
'use strict';
const fs = require('fs');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'fast';
const ORDER = 27;
const COVERS = { books: '*', kinds: '*', surfaces: [], widths: [], projector: false, tier: ['preview'], cells: ['v3-shape'] };
const CONTROLS = [
  { id: 'a-mark-moved', kind: 'fixture', plant: 'fixture-engine-mark', mustFail: /marking moved/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-v3-shape');
g.exempt(['this pins VERDICTS and MARKS, not pixels: v4 changes the DOM around these renderers by design',
  'a question added after the pin is REPORTED as unpinned rather than failed — it has no approved "before" to be measured against']);

global.window = global;
const M = require(A.app('mathcore.js'));
require(A.app('anglecore.js'));
const AN = global.GJ_ANGLES;
const MA = require(A.app('dev/model-attempts.js'));

function shape() {
  const out = {};
  A.grid().forEach(r => {
    const q = r.question, k = r.kind;
    let v = null;
    try {
      const a = MA.correct(M, r.book, q);
      if (!a) return;
      if (k === 'classify') v = { res: a.pick === q.classify ? 'OK' : 'X@1', mk: [0, a.pick === q.classify ? 1 : 0] };
      else if (k === 'protractor') { const ok = Math.abs(a.read - q.value) <= (q.tol || 3); v = { res: ok ? 'OK' : 'X@1', mk: [0, ok ? 1 : 0] }; }
      else if (k === 'reasoned') { const r2 = AN.checkSteps(q, a.steps); v = { res: r2.res, mk: r2.mk }; }
      else { const r2 = M.checkQuestion(q, { L: a.L, fin: a.fin }); v = { res: r2.res, mk: r2.mk }; }
    } catch (e) { v = { res: 'THREW', mk: null }; }
    out[r.book + '/' + r.qid] = v;
  });
  return out;
}

const PIN = A.qa('fixtures/v3-shape.json');
const now = shape();

if (process.argv.includes('--pin')) {
  fs.writeFileSync(PIN, JSON.stringify(now, null, 1));
  console.log('  pinned ' + Object.keys(now).length + ' questions to ' + PIN);
  console.log('  say in PROGRESS.md WHY this pin moved.');
  process.exit(0);
}

if (!A.exists(PIN)) {
  g.fail('the locked renderers', 'v3-shape',
    'there is no pinned reference — run `node tools/qa/qa-v3-shape.js --pin` at the approved commit, or nothing can prove the approved marking has not moved');
  g.done();
  process.exit(1);
}
const was = JSON.parse(A.read(PIN));
Object.keys(was).forEach(key => {
  const a = was[key], b = now[key];
  if (!b) { g.fail(key, 'v3-shape', 'this question is pinned but is no longer in any pack — an approved question has been deleted'); return; }
  g.check(a.res === b.res, key, 'v3-shape',
    'the verdict was "' + a.res + '" at the approved commit and is "' + b.res + '" now — a locked renderer\'s marking moved');
  g.check(JSON.stringify(a.mk) === JSON.stringify(b.mk), key, 'v3-shape',
    'the marks were ' + JSON.stringify(a.mk) + ' at the approved commit and are ' + JSON.stringify(b.mk) + ' now — a locked renderer\'s marking moved');
});
const added = Object.keys(now).filter(k => !was[k]);
if (added.length) g.note(added.length + ' question(s) are not pinned (added since the reference): ' + added.slice(0, 6).join(', '));
g.note(Object.keys(was).length + ' approved questions pinned and unchanged');
g.done();
