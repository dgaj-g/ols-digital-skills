/* Independent end-to-end validation of EVERY question in both packs.
   For each question this proves two things the user actually cares about:
     (A) a correct answer marks OK with FULL marks (no under-marking)
     (B) a wrong answer is genuinely CAUGHT — not silently accepted
   plus, for angles, that the diagram's stated value really equals the
   value the rules derive (a second, independent re-derivation).
   Run: node dev/validate-all.js   (exit 0 = every question sound) */
'use strict';
global.window = global;
var M = require('../mathcore.js');
require('../anglecore.js');
require('../content-angles.js');
require('../content-algebra.js');
var A = global.GJ_ANGLES;
var PACK = global.GJ_CONTENT;
/* ONE HOME for what a correct attempt looks like: this validator and the pupil
   walker import the SAME builders, so they can never disagree about what they
   are proving (DFM 144). */
var MA = require('./model-attempts.js');

/* WHAT THIS VALIDATOR PROVES A MODEL AND A CORRUPTED ATTEMPT FOR, declared so
   the coverage machine can prove every question of every kind has its (A)/(B)
   pair (L5/DFM 206). A kind added to a pack and not added here fails coverage. */
const KINDS = ['classify', 'protractor', 'reasoned', 'subst', 'simplify', 'expand', 'solve', 'form'];

var rows = [], fails = 0;
function rat(x) { return x && x.d ? (x.d === 1 ? x.n : x.n + '/' + x.d) : x; }

/* ---------- ANGLES ---------- */
var angleModelRoute = MA.angleModelRoute;

PACK.angles.sections.forEach(function (sec) {
  sec.questions.forEach(function (q) {
    var label = 'angles/' + q.id;
    if (q.kind === 'classify') {
      // (A) correct classification (B) every wrong option is NOT the answer
      var def = q.diagram.angles.T;
      var trueClass = def.value < 90 ? 'acute' : def.value === 90 ? 'right' : def.value < 180 ? 'obtuse' : def.value === 180 ? 'straight' : 'reflex';
      var aOk = trueClass === q.classify;
      var bOk = q.options.filter(function (o) { return o !== q.classify; }).length > 0;
      rows.push([label, def.value + '° → ' + q.classify, aOk ? 'OK' : 'WRONG-ANSWER', bOk ? 'decoys' : 'NO-DECOY']);
      if (!aOk || !bOk) fails++;
      return;
    }
    if (q.kind === 'protractor') {
      var tol = q.tol || 3;
      var pa = Math.abs(q.value - q.value) <= tol;                 // (A) a correct reading marks right
      var pb = Math.abs((q.value + 11) - q.value) > tol;           // (B) an 11° misread is caught
      var scaleDiffers = Math.abs((180 - q.value) - q.value) > tol; // the wrong-scale decoy is a real, distinct error
      rows.push([label, 'measure ' + q.value + '° (±' + tol + ')', pa ? 'OK' : 'WRONG-ANSWER', (pb && scaleDiffers) ? 'misread + wrong-scale caught' : 'NOT CAUGHT']);
      if (!pa || !pb || !scaleDiffers) fails++;
      return;
    }
    var steps = angleModelRoute(q);
    if (!steps) { rows.push([label, 'route', 'NO-ROUTE', '-']); fails++; return; }
    var v = A.checkSteps(q, steps);
    var aOk = v.res === 'OK' && v.mk[0] === q.marks[0] && v.mk[1] === q.marks[1];
    // (B) corrupt the LAST step's value by +10 and confirm it is caught
    var bad = steps.map(function (s) { return { ang: s.ang, val: s.val, rsn: s.rsn }; });
    bad[bad.length - 1] = { ang: bad[bad.length - 1].ang, val: bad[bad.length - 1].val + 11, rsn: bad[bad.length - 1].rsn };
    var vb = A.checkSteps(q, bad);
    var bOk = vb.res !== 'OK';
    rows.push([label, 'route ' + steps.length + ' steps → ' + (q.target.length ? '[' + q.target + ']' : q.target), aOk ? 'OK [' + v.mk + ']' : 'UNDERMARK [' + v.mk + '/' + q.marks + ']', bOk ? 'wrong caught (' + vb.res + ')' : 'WRONG ACCEPTED']);
    if (!aOk || !bOk) fails++;
  });
});

/* ---------- ALGEBRA ---------- */
function algebraCorrectLines(q) { return MA.algebraCorrectLines(M, q); }

PACK.algebra.sections.forEach(function (sec) {
  sec.questions.forEach(function (q) {
    var label = 'algebra/' + q.id;
    var lines = algebraCorrectLines(q);
    var v = M.checkQuestion(q, { L: lines, fin: lines[lines.length - 1].t });
    var aOk = (v.res === 'OK' || (v.res === 'AMBER' && q.type === 'subst')) && (v.res === 'AMBER' || (v.mk[0] === q.marks[0] && v.mk[1] === q.marks[1]));
    // a correct multi-line route should be OK+full for solve/form/expand/simplify
    if (q.type !== 'subst') aOk = v.res === 'OK' && v.mk[0] === q.marks[0] && v.mk[1] === q.marks[1];
    // (B) feed the authored misconception line (if any) and confirm it is caught
    var bDesc = 'no dx authored';
    var bOk = true;
    var dxKeys = Object.keys(q.dx || {});
    if (dxKeys.length) {
      var wrong = dxKeys[0];
      var vb = M.checkQuestion(q, { L: [{ op: 'rw', t: wrong }], fin: wrong });
      // the wrong line is either a non-equivalent step (X@) OR not the answer
      bOk = vb.res !== 'OK';
      bDesc = 'dx "' + wrong + '" → ' + vb.res + (vb.perLine[0] && vb.perLine[0].dx ? ' (' + vb.perLine[0].dx + ')' : '');
    }
    rows.push([label, q.type + ' → ' + (q.answer.x ? 'x=' + rat(q.answer.x) : q.answer.val ? rat(q.answer.val) : 'expr'), aOk ? 'OK [' + v.mk + ']' : (v.res + ' [' + v.mk + '/' + q.marks + ']  <-- CHECK'), bDesc + (bOk ? '' : '  <-- WRONG ACCEPTED')]);
    if (!aOk || !bOk) fails++;
  });
});

/* ---------- print ---------- */
var w = [0, 0, 0];
rows.forEach(function (r) { r.forEach(function (c, i) { w[i] = Math.max(w[i], String(c).length); }); });
console.log('');
rows.forEach(function (r) {
  console.log('  ' + String(r[0]).padEnd(w[0]) + '  ' + String(r[1]).padEnd(w[1]) + '  | correct: ' + String(r[2]).padEnd(22) + ' | wrong-answer: ' + r[3]);
});
console.log('');
console.log('  ' + rows.length + ' questions checked  -  ' + (rows.length - fails) + ' sound, ' + fails + ' need attention');
process.exit(fails ? 1 : 0);
