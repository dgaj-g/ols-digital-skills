/* model-attempts.js — ONE HOME FOR "WHAT A CORRECT ATTEMPT LOOKS LIKE".
 *
 * WHY IT IS ONE HOME (DFM 144, and the gates design's L14). Two things need to
 * know what a right answer looks like: `dev/validate-all.js`, which proves the
 * engine marks it full, and `tools/qa/sit-pupil.js`, which drives the real
 * browser with it. If those two ever disagree about what "correct" means, the
 * validator can be green while the walker is answering a different question,
 * and neither of them would say so. So the attempts are built here, once, and
 * both callers import them.
 *
 * The attempt shapes are the client's own stored shapes, so what the walker
 * primes is exactly what a pupil's own working would have left behind:
 *   reasoned   { steps: [{ ang, val, rsn }] }
 *   classify   { pick: '<option>' }
 *   protractor { read: <degrees> }
 *   algebra    { L: [{ op, t }], fin: '<last line>' }
 *
 * `corrupt(book, q)` returns the SAME shape carrying that kind's own classic
 * slip, so a walk of the wrong path is a walk of a real misconception rather
 * than of noise.
 */
'use strict';

function rat(x) { return x && x.d ? (x.d === 1 ? x.n : x.n + '/' + x.d) : x; }

/* ---------------------------------------------------------------- angles */
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

/* --------------------------------------------------------------- algebra */
function sideStr(M, c) {
  var parts = [];
  if (c.c1 && c.c1.n) parts.push((Math.abs(c.c1.n) === 1 && c.c1.d === 1 ? (c.c1.n < 0 ? '-' : '') : rat(c.c1)) + 'x');
  if (c.c0 && c.c0.n) parts.push((parts.length && c.c0.n > 0 ? '+' : '') + rat(c.c0));
  return parts.join(' ') || '0';
}
function algebraCorrectLines(M, q) {
  if (q.type === 'subst') return [{ op: 'rw', t: rat(q.answer.val) }];
  if (q.type === 'expand' || q.type === 'simplify') {
    var c = q.answer.canon, parts = [];
    if (c.c2 && c.c2.n) parts.push((Math.abs(c.c2.n) === 1 && c.c2.d === 1 ? (c.c2.n < 0 ? '-' : '') : rat(c.c2)) + 'x^2');
    if (c.c1 && c.c1.n) parts.push((parts.length && c.c1.n > 0 ? '+' : '') + (Math.abs(c.c1.n) === 1 && c.c1.d === 1 ? (c.c1.n < 0 ? '-' : '') + 'x' : rat(c.c1) + 'x'));
    if (c.c0 && c.c0.n) parts.push((parts.length && c.c0.n > 0 ? '+' : '') + rat(c.c0));
    return [{ op: 'rw', t: parts.join(' ') || '0' }];
  }
  var ans = q.answer.x;
  var startStr = q.type === 'form' ? (q.form.accept[0]) : q.start;
  var lines = [];
  if (q.type === 'form') lines.push({ op: 'rw', t: startStr });
  if (/\(/.test(startStr)) {
    var p = M.parse(startStr);
    lines.push({ op: 'exp', t: sideStr(M, M.canonSide(p.ast.lhs)) + ' = ' + sideStr(M, M.canonSide(p.ast.rhs)) });
  }
  var pp = M.parse(startStr);
  var Lc = M.canonSide(pp.ast.lhs), Rc = M.canonSide(pp.ast.rhs);
  var a = M.rsub(Lc.c1 || M.rat(0, 1), Rc.c1 || M.rat(0, 1));
  var b = M.rsub(Rc.c0 || M.rat(0, 1), Lc.c0 || M.rat(0, 1));
  if (a.n !== 0) {
    lines.push({ op: 'mv', t: sideStr(M, { c1: a, c0: M.rat(0, 1) }) + ' = ' + rat(b) });
    lines.push({ op: '/', t: 'x = ' + rat(ans) });
  } else {
    lines.push({ op: 'rw', t: 'x = ' + rat(ans) });
  }
  return lines;
}

/* ------------------------------------------------------------ the public */
function kindOf(q) { return q.kind || q.type || 'reasoned'; }

function correct(M, book, q) {
  var k = kindOf(q);
  if (k === 'classify') return { pick: q.classify };
  if (k === 'protractor') return { read: q.value };
  if (k === 'reasoned') {
    var steps = angleModelRoute(q);
    return steps ? { steps: steps } : null;
  }
  var lines = algebraCorrectLines(M, q);
  return { L: lines, fin: lines[lines.length - 1].t };
}

/* the kind's own classic slip, not noise: a walk of the wrong path has to be a
   walk of something a real pupil really does */
function corrupt(M, book, q) {
  var k = kindOf(q);
  if (k === 'classify') {
    var wrong = (q.options || []).filter(function (o) { return o !== q.classify; })[0];
    return wrong ? { pick: wrong } : null;
  }
  if (k === 'protractor') {
    /* the wrong scale: 180 minus the true reading, which is the misconception
       the reading aid exists to make visible */
    return { read: 180 - q.value };
  }
  if (k === 'reasoned') {
    var steps = angleModelRoute(q);
    if (!steps || !steps.length) return null;
    var bad = steps.map(function (s) { return { ang: s.ang, val: s.val, rsn: s.rsn }; });
    bad[bad.length - 1].val = bad[bad.length - 1].val + 10;
    return { steps: bad };
  }
  var dxKeys = Object.keys(q.dx || {});
  if (dxKeys.length) return { L: [{ op: 'rw', t: dxKeys[0] }], fin: dxKeys[0] };
  /* no authored slip: a plainly wrong final line is still a real wrong answer */
  var lines = algebraCorrectLines(M, q);
  var last = lines[lines.length - 1].t;
  var broken = String(last).replace(/(-?\d+)(?!.*\d)/, function (n) { return String(Number(n) + 1); });
  return { L: [{ op: 'rw', t: broken }], fin: broken };
}

module.exports = { correct, corrupt, kindOf, angleModelRoute, algebraCorrectLines };
