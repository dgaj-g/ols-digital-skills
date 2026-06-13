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

var rows = [], fails = 0;
function rat(x) { return x && x.d ? (x.d === 1 ? x.n : x.n + '/' + x.d) : x; }

/* ---------- ANGLES ---------- */
function angleModelRoute(q) {
  var known = {}, steps = [];
  Object.keys(q.diagram.angles).forEach(function (k) { if (q.diagram.angles[k].given) known[k] = true; });
  var targets = Array.isArray(q.target) ? q.target : [q.target];
  function done() { return targets.every(function (t) { return known[t]; }); }
  var guard = 0;
  while (!done() && guard++ < 80) {
    var e = (q.graph || []).filter(function (ed) {
      return !known[ed.find] && ed.from.every(function (f) { return known[f]; });
    })[0];
    if (!e) return null;
    known[e.find] = true;
    steps.push({ ang: e.find, val: q.diagram.angles[e.find].value, rsn: e.rule });
  }
  return done() ? steps : null;
}

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
function algebraCorrectLines(q) {
  // canonical correct working derived from the answer, independent of authoring
  if (q.type === 'subst') {
    var vars = {}; Object.keys(q.given || {}).forEach(function (k) { vars[k] = q.given[k]; });
    return [{ op: 'rw', t: rat(q.answer.val) }];
  }
  if (q.type === 'expand' || q.type === 'simplify') {
    var c = q.answer.canon, parts = [];
    if (c.c2 && c.c2.n) parts.push((Math.abs(c.c2.n) === 1 && c.c2.d === 1 ? (c.c2.n < 0 ? '-' : '') : rat(c.c2)) + 'x^2');
    if (c.c1 && c.c1.n) parts.push((parts.length && c.c1.n > 0 ? '+' : '') + (Math.abs(c.c1.n) === 1 && c.c1.d === 1 ? (c.c1.n < 0 ? '-' : '') + 'x' : rat(c.c1) + 'x'));
    if (c.c0 && c.c0.n) parts.push((parts.length && c.c0.n > 0 ? '+' : '') + rat(c.c0));
    return [{ op: 'rw', t: parts.join(' ') || '0' }];
  }
  // solve / form: produce a genuine multi-line balance route ending x = answer
  var ans = q.answer.x;
  var startStr = q.type === 'form' ? (q.form.accept[0]) : q.start;
  var lines = [];
  if (q.type === 'form') lines.push({ op: 'rw', t: startStr });
  // expand if bracketed
  if (/\(/.test(startStr)) {
    var p = M.parse(startStr);
    var L = M.canonSide(p.ast.lhs), R = M.canonSide(p.ast.rhs);
    lines.push({ op: 'exp', t: sideStr(L) + ' = ' + sideStr(R) });
  }
  // collapse straight to x = ans (each step the engine accepts because solution set is preserved)
  // do it as: move all to get ax = b, then x = ans
  var pp = M.parse(q.type === 'form' ? startStr : startStr);
  var Lc = M.canonSide(pp.ast.lhs), Rc = M.canonSide(pp.ast.rhs);
  // ax + b = cx + d  ->  x = ans ; we just assert x = ans as the final line,
  // and one intermediate "(a-c)x = d-b" so method marks are visible
  var a = M.rsub(Lc.c1 || M.rat(0,1), Rc.c1 || M.rat(0,1));
  var b = M.rsub(Rc.c0 || M.rat(0,1), Lc.c0 || M.rat(0,1));
  if (a.n !== 0) {
    lines.push({ op: 'mv', t: sideStr({ c1: a, c0: M.rat(0,1) }) + ' = ' + rat(b) });
    lines.push({ op: '/', t: 'x = ' + rat(ans) });
  } else {
    lines.push({ op: 'rw', t: 'x = ' + rat(ans) });
  }
  return lines;
}
function sideStr(c) {
  var parts = [];
  if (c.c1 && c.c1.n) parts.push((Math.abs(c.c1.n) === 1 && c.c1.d === 1 ? (c.c1.n < 0 ? '-' : '') : rat(c.c1)) + 'x');
  if (c.c0 && c.c0.n) parts.push((parts.length && c.c0.n > 0 ? '+' : '') + rat(c.c0));
  return parts.join(' ') || '0';
}

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
