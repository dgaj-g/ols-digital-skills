/* Build-time validator for content-angles.js (DESIGN.md §9: every authored
   value re-derived before shipping). Checks, per question:
   - GJ_ANGLES.verifyGraph: edge arithmetic vs authored values, arity,
     self-reference, target reachable from the givens
   - GEOMETRY: every angle re-MEASURED from the authored coordinates and
     compared to its stated value (tolerance 1.2°) — the drawn figure must
     genuinely subtend what it claims
   - classify questions: the drawn angle's true class matches the answer
   - structure: unique ids, marks shape, reason bank ids/groups, movie ops
     reference real segs/angles/points
   Exit 0 = ship; non-zero = fix first. */
'use strict';

global.window = global;
require('../anglecore.js');
require('../mathcore.js');
require('../content-angles.js');

var pack = global.GJ_CONTENT.angles;
var A = global.GJ_ANGLES;
var problems = [];

function deg(at, p) { return Math.atan2(-(p[1] - at[1]), p[0] - at[0]) * 180 / Math.PI; }
function measure(diagram, def) {
  var v = diagram.pts[def.at], f = diagram.pts[def.from], t = diagram.pts[def.to];
  if (!v || !f || !t) return null;
  var a1 = deg(v, f), a2 = deg(v, t);
  var sweep = ((a2 - a1) % 360 + 360) % 360;
  var minor = Math.min(sweep, 360 - sweep);
  return def.reflex ? 360 - minor : minor;
}
function classOf(value) {
  if (value < 90) return 'acute';
  if (value === 90) return 'right';
  if (value < 180) return 'obtuse';
  if (value === 180) return 'straight';
  return 'reflex';
}

var GROUPS = ['Lines & points', 'Triangles & quadrilaterals', 'Parallel lines', 'Special shapes'];
var bankIds = {};
pack.reasonBank.forEach(function (r) {
  bankIds[r.id] = true;
  if (A.REASONS.indexOf(r.id) === -1) problems.push('reasonBank: unknown id ' + r.id);
  if (GROUPS.indexOf(r.group) === -1) problems.push('reasonBank: unknown group ' + r.group);
  if (!/°/.test(r.text) && r.id !== 'VOP' && r.id !== 'ISO' && r.id !== 'PGRAM' && r.id !== 'ALT' && r.id !== 'COR') {
    problems.push('reasonBank: ' + r.id + ' text looks wrong: ' + r.text);
  }
});

function lintDiagramGeometry(tag, diagram) {
  Object.keys(diagram.angles || {}).forEach(function (nm) {
    var def = diagram.angles[nm];
    var m = measure(diagram, def);
    if (m == null) { problems.push(tag + ' angle ' + nm + ': missing point'); return; }
    if (Math.abs(m - def.value) > 1.2) {
      problems.push(tag + ' angle ' + nm + ': drawn ' + m.toFixed(1) + '° but states ' + def.value + '°');
    }
  });
  (diagram.segs || []).forEach(function (s) {
    if (!diagram.pts[s.from] || !diagram.pts[s.to]) problems.push(tag + ' seg ' + s.id + ': missing point');
  });
}

function lintMovie(tag, movie) {
  if (!movie) { problems.push(tag + ': no movie'); return 0; }
  var dg = movie.diagram || {};
  movie.steps.forEach(function (st, i) {
    if (!st.say || st.say.length > 160) problems.push(tag + ' step ' + i + ': bad caption');
    (st.do || []).forEach(function (op) {
      if (op.seg && !(dg.segs || []).some(function (s) { return s.id === op.seg.id; }))
        problems.push(tag + ' step ' + i + ': seg ' + op.seg.id + ' not in diagram');
      ['arc', 'value', 'pulse'].forEach(function (k) {
        if (op[k] && !(dg.angles || {})[op[k].ang]) problems.push(tag + ' step ' + i + ': angle ' + op[k].ang + ' not in diagram');
      });
      if (op.zshape && op.zshape.pts) op.zshape.pts.forEach(function (p) {
        if (!(dg.pts || {})[p]) problems.push(tag + ' step ' + i + ': zshape point ' + p + ' missing');
      });
      if (op.stamp && op.stamp.reason && !bankIds[op.stamp.reason])
        problems.push(tag + ' step ' + i + ': stamp reason ' + op.stamp.reason + ' not in bank');
    });
  });
  if (movie.mode === 'diagram') lintDiagramGeometry(tag + ' movie-diagram', dg);
  return movie.steps.length;
}

var ids = {}, totalQ = 0, totalSteps = 0, totalMarks = 0, classifyN = 0, numericN = 0;
pack.sections.forEach(function (sec) {
  if (!sec.walt) problems.push(sec.id + ': missing WALT');
  totalSteps += lintMovie(sec.id + ' movie "' + (sec.movie && sec.movie.title) + '"', sec.movie);
  sec.questions.forEach(function (q) {
    totalQ++;
    if (ids[q.id]) problems.push('duplicate question id ' + q.id);
    ids[q.id] = true;
    if (!q.prompt) problems.push(q.id + ': missing prompt');
    if (!q.marks || q.marks.length !== 2) problems.push(q.id + ': bad marks');
    else totalMarks += q.marks[0] + q.marks[1];
    lintDiagramGeometry(q.id, q.diagram);

    if (q.kind === 'classify') {
      classifyN++;
      var def = q.diagram.angles.T;
      if (!def) { problems.push(q.id + ': classify needs angle T'); return; }
      if (def.given) problems.push(q.id + ': classify angle must NOT be given (value would leak)');
      if (classOf(def.value) !== q.classify) problems.push(q.id + ': drawn class ' + classOf(def.value) + ' != answer ' + q.classify);
      if (!q.options || q.options.length < 4) problems.push(q.id + ': classify needs the full option set');
      if (q.options.indexOf(q.classify) === -1) problems.push(q.id + ': answer missing from options');
      return;
    }
    numericN++;
    var vg = A.verifyGraph(q);
    if (!vg.ok) vg.problems.forEach(function (p) { problems.push(p); });
    (q.graph || []).forEach(function (e) {
      if (!bankIds[e.rule] && e.rule !== 'GIVEN') problems.push(q.id + ': edge rule ' + e.rule + ' not in the pupil-facing reason bank');
    });
    // dx keys: 'val' or 'ang:val' — each must NOT equal the true value of that angle
    Object.keys(q.dx || {}).forEach(function (k) {
      var parts = k.split(':');
      var ang = parts.length === 2 ? parts[0] : null;
      var val = Number(parts[parts.length - 1]);
      if (ang && q.diagram.angles[ang] && q.diagram.angles[ang].value === val)
        problems.push(q.id + ': dx key ' + k + ' equals the TRUE value');
    });
    // the model route must actually mark OK through the live engine
    var known = {}, steps = [];
    Object.keys(q.diagram.angles).forEach(function (k) { if (q.diagram.angles[k].given) known[k] = true; });
    var guard = 0;
    var targets = Array.isArray(q.target) ? q.target : [q.target];
    function allTargets() { return targets.every(function (t) { return known[t]; }); }
    while (!allTargets() && guard++ < 60) {
      var e = (q.graph || []).filter(function (ed) {
        return !known[ed.find] && ed.from.every(function (f) { return known[f]; });
      })[0];
      if (!e) break;
      known[e.find] = true;
      steps.push({ ang: e.find, val: q.diagram.angles[e.find].value, rsn: e.rule });
    }
    if (!allTargets()) { problems.push(q.id + ': could not assemble a model route'); return; }
    var verdict = A.checkSteps(q, steps);
    if (verdict.res !== 'OK') problems.push(q.id + ': model route marks ' + verdict.res + ', expected OK');
    if (verdict.mk[0] !== q.marks[0] || verdict.mk[1] !== q.marks[1])
      problems.push(q.id + ': model route earns [' + verdict.mk + '] of [' + q.marks + ']');
  });
});

console.log('[lint-content-angles] sections: ' + pack.sections.length +
  ' · questions: ' + totalQ + ' (' + classifyN + ' classify, ' + numericN + ' reasoned)' +
  ' · movie steps: ' + totalSteps + ' · marks: ' + totalMarks);
if (problems.length) {
  console.error('PROBLEMS (' + problems.length + '):');
  problems.forEach(function (p) { console.error('  - ' + p); });
  process.exit(1);
}
console.log('PASS');
