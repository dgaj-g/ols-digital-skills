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
 * plays on the app's own controls leaves behind exactly what a pupil's own
 * working would have:
 *   reasoned   { steps: [{ ang, val, rsn }] }
 *   classify   { pick: '<option>' }
 *   protractor { read: <degrees> }
 *   algebra    { L: [{ op, t }], fin: '<last line>' }
 *   solve/form  the same, plus `moves`: the chips she presses and the number
 *               she keys for each - a rail question cannot be answered by
 *               knowing the last line alone
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

/* THE ROUTE SHE TAKES, not just the line she ends on. The solve and form
   questions are answered on a rail of move chips - "subtract from both sides",
   and a number - so a walker that only knows the final line cannot answer one
   at all. These are the chips to press, in order, and they are derived here
   for the same reason the lines are: one home, or the validator and the walker
   drift apart without either saying so. */
function algebraMoves(M, q) {
  if (q.type !== 'solve' && q.type !== 'form') return null;
  var startStr = q.type === 'form' ? q.form.accept[0] : q.start;
  var moves = [];
  if (q.type === 'form') moves.push({ kind: 'form', operand: startStr });
  if (/\(/.test(startStr)) moves.push({ kind: 'expand', operand: null });
  var pp = M.parse(startStr);
  var Lc = M.canonSide(pp.ast.lhs), Rc = M.canonSide(pp.ast.rhs);
  var a = M.rsub(Lc.c1 || M.rat(0, 1), Rc.c1 || M.rat(0, 1));
  if (Rc.c1 && Rc.c1.n) moves.push({ kind: 'subx', operand: rat(Rc.c1) });
  if (Lc.c0 && Lc.c0.n) {
    var c = Lc.c0;
    moves.push({ kind: c.n > 0 ? '-' : '+', operand: rat({ n: Math.abs(c.n), d: c.d }) });
  }
  if (a.n !== 0 && !(a.n === 1 && a.d === 1)) moves.push({ kind: '/', operand: rat(a) });
  return moves;
}


/* ----------------------------------------------------------------- stats */
/* The Handling Data kinds store what she BUILT, not a line she wrote, so a
   model attempt is the finished board: the ordered row and its cuts, the
   running totals, the plotted points, the rule heights and readings, the five
   markers, the two sentences, the verdicts. `corrupt` returns the same board
   carrying that kind's own classic slip, so a walk of the wrong path is a walk
   of a real misconception. */
var STATS = null;
function statsEngine() {
  if (STATS) return STATS;
  if (typeof global !== 'undefined' && typeof global.window === 'undefined') global.window = global;
  var g = (typeof global !== 'undefined') ? global : window;
  if (!g.GJ_MATH) g.GJ_MATH = require('../mathcore.js');
  STATS = g.GJ_STATS || require('../statcore.js');
  return STATS;
}
function rnum(r) { return r && r.d ? r.n / r.d : Number(r); }
function rstr(r) {
  if (r == null) return '';
  if (r.d === undefined) return String(r);
  return r.d === 1 ? String(r.n) : String(Math.round((r.n / r.d) * 1e6) / 1e6);
}
function isStatKind(k) {
  return ['qlist', 'cftable', 'cfplot', 'cfread', 'boxplot', 'compare', 'judge', 'values'].indexOf(k) > -1;
}
function packRules(q) { return q.rules || null; }

function qlistBoard(S, q, wrong) {
  var vals = (q.values || []).slice();
  var idx = vals.map(function (v, i) { return i; })
    .sort(function (a, b) { return Number(vals[a]) - Number(vals[b]); });
  var n = idx.length;
  var rule = (packRules(q) || {}).quartileRule || 'n+1';
  var pos = S.quartilePositions(n, rule);
  var picks = {}, cuts = (q.ask || ['Q1', 'Q2', 'Q3', 'IQR']).filter(function (a) { return a !== 'IQR'; });
  cuts.forEach(function (c) {
    var p = pos[c];
    picks[c] = (p.d === 1) ? [p.n - 1] : [Math.floor(p.n / p.d) - 1, Math.floor(p.n / p.d)];
  });
  var truth = S.quartiles(vals, rule);
  var out = { order: idx, picks: picks, iqr: '' };
  if ((q.ask || []).indexOf('IQR') > -1) out.iqr = rstr(truth.IQR);
  if (!wrong) return out;
  /* the classic slip: the lower and upper quartile the wrong way round */
  if (picks.Q1 && picks.Q3) {
    var t = out.picks.Q1; out.picks = JSON.parse(JSON.stringify(picks));
    out.picks.Q1 = picks.Q3; out.picks.Q3 = t;
    if (out.iqr) out.iqr = rstr({ n: -truth.IQR.n, d: truth.IQR.d });
  } else if (picks[cuts[0]]) {
    out.picks[cuts[0]] = [Math.max(0, picks[cuts[0]][0] - 1)];
  } else if (out.iqr) {
    /* a question that asks only for the interquartile range: the slip is the
       one every class makes, the RANGE given instead */
    var sorted = vals.slice().sort(function (a, b) { return Number(a) - Number(b); });
    out.iqr = String(Number(sorted[sorted.length - 1]) - Number(sorted[0]));
  }
  return out;
}
function cftableBoard(S, q, wrong) {
  var truth = S.cumulate(q.classes || []);
  if (!wrong) return { cf: truth.map(String) };
  /* the frequencies copied straight down, which is the whole misconception */
  return { cf: (q.classes || []).map(function (c) { return String(c.f); }) };
}
function cfplotBoard(S, q, wrong) {
  var rules = packRules(q) || S.DEFAULT_RULES;
  var want = S.expectedPoints(q, rules).map(function (p) { return [rnum(p[0]), rnum(p[1])]; });
  if (!wrong) return { pts: want, joined: true };
  var cf = S.cumulate(q.classes || []);
  return {
    pts: (q.classes || []).map(function (c, i) { return [(Number(c.lo) + Number(c.hi)) / 2, cf[i]]; }),
    joined: true
  };
}
function snapTo(x, sq) { return Math.round(x / sq) * sq; }
function cfreadBoard(S, q, wrong) {
  var rules = packRules(q) || S.DEFAULT_RULES;
  var heights = S.readHeights(Number(q.n) || 0, rules.curveRule);
  var sqx = ((q.chart || {}).sq || {}).x || 1;
  var reads = {}, answers = {}, answer = '', iqr = '';
  (q.ask || []).forEach(function (a) {
    if (typeof a === 'string') {
      if (a === 'IQR') {
        var x1 = S.curveX(q.curve, heights.Q1), x3 = S.curveX(q.curve, heights.Q3);
        if (x1 && x3) iqr = String(snapTo(rnum(x3), sqx) - snapTo(rnum(x1), sqx));
        return;
      }
      var h = heights[a === 'median' ? 'median' : a];
      var x = S.curveX(q.curve, h);
      reads[a] = { h: rnum(h), x: x ? snapTo(rnum(x), sqx) : null };
      return;
    }
    if (a && a.type === 'atX') {
      var cf = S.curveY(q.curve, a.x);
      var cfv = cf ? rnum(cf) : null;
      reads['atX@' + a.x] = { x: a.x, cf: cfv };
      reads.atX = { x: a.x, cf: cfv };
      var N = Number(q.n) || 0;
      var v2 = '';
      if (a.want === 'countBelow') v2 = String(cfv);
      else if (a.want === 'countAbove') v2 = String(N - cfv);
      else if (a.want === 'pctBelow') v2 = String(Math.round((cfv / N) * 100));
      else if (a.want === 'pctAbove') v2 = String(Math.round(((N - cfv) / N) * 100));
      answers['atX@' + a.x] = v2;
      answer = v2;
    }
  });
  if (!wrong) return { reads: reads, answers: answers, iqr: iqr, answer: answer };
  /* half the AXIS, not half the total — the slip the axis invites */
  var axis = ((q.chart || {}).y || {}).max;
  var bad = JSON.parse(JSON.stringify(reads));
  Object.keys(bad).forEach(function (k) {
    if (k === 'atX' || !axis) return;
    bad[k].h = axis / 2;
    var xx = S.curveX(q.curve, axis / 2);
    bad[k].x = xx ? snapTo(rnum(xx), sqx) : bad[k].x;
  });
  return { reads: bad, answers: answers, iqr: iqr, answer: answer };
}
function boxTruthFive(S, q) {
  var rules = packRules(q) || S.DEFAULT_RULES;
  if (q.from === 'curve' && q.curve) {
    var h = S.readHeights(Number(q.n) || 0, rules.curveRule);
    var o = {
      min: (q.given || {}).min, max: (q.given || {}).max,
      Q1: S.curveX(q.curve, h.Q1), Q2: S.curveX(q.curve, h.median), Q3: S.curveX(q.curve, h.Q3)
    };
    ['Q1', 'Q2', 'Q3'].forEach(function (k) { if ((q.given || {})[k] !== undefined) o[k] = q.given[k]; });
    return o;
  }
  if (q.given) return q.given;
  if (q.from === 'qlist') {
    var f = S.fiveNumber(q.values || [], rules.quartileRule);
    return f ? { min: f.min, Q1: f.Q1, Q2: f.Q2, Q3: f.Q3, max: f.max } : null;
  }
  return q.answer || null;
}
function boxplotBoard(S, q, wrong) {
  var five = boxTruthFive(S, q) || {};
  var pos = {};
  ['min', 'Q1', 'Q2', 'Q3', 'max'].forEach(function (k) { pos[k] = rstr(five[k]); });
  var out = { pos: pos, drawn: true };
  if (q.from) {
    var stageQ = JSON.parse(JSON.stringify(q));
    stageQ.kind = q.from === 'curve' ? 'cfread' : q.from;
    delete stageQ.from;
    out.stage = statsBoard(S, stageQ, false);
  }
  if (!wrong) return out;
  /* the whiskers and the quartiles confused */
  var bad = JSON.parse(JSON.stringify(out));
  var t = bad.pos.min; bad.pos.min = bad.pos.Q1; bad.pos.Q1 = t;
  var u = bad.pos.max; bad.pos.max = bad.pos.Q3; bad.pos.Q3 = u;
  return bad;
}
function spreadOf(sum, meas) {
  return meas === 'range' ? (Number(sum.max) - Number(sum.min)) : (Number(sum.Q3) - Number(sum.Q1));
}
function compareBoard(S, q, wrong) {
  var A0 = (q.plots || [])[0] || { label: 'A', summary: {} };
  var B0 = (q.plots || [])[1] || { label: 'B', summary: {} };
  var words = ((q.context || {}).words || []);
  var mA = Number(A0.summary.Q2), mB = Number(B0.summary.Q2);
  var who = mA > mB ? A0.label : B0.label;
  var v1 = who === A0.label ? [String(mA), String(mB)] : [String(mB), String(mA)];
  var sA = spreadOf(A0.summary, 'iqr'), sB = spreadOf(B0.summary, 'iqr');
  var who2 = sA > sB ? A0.label : B0.label;
  var v2 = who2 === A0.label ? [String(sA), String(sB)] : [String(sB), String(sA)];
  var out = {
    s1: { who: who, who2: who, ctx: words[0], v: v1 },
    s2: { who: who2, size: 'larger', cons: 'less', meas: 'iqr', v: v2 }
  };
  if (!wrong) return out;
  /* the comparison right, the meaning in context wrong */
  var bad = JSON.parse(JSON.stringify(out));
  bad.s1.ctx = words[1];
  return bad;
}
function judgeBoard(S, q, wrong) {
  var j = (q.claims || []).map(function (c) {
    if (c.options) return { v: c.verdict };
    return { fair: c.fair, why: c.fair === false ? c.why : null };
  });
  if (!wrong) return { j: j };
  var bad = JSON.parse(JSON.stringify(j));
  var i;
  for (i = 0; i < (q.claims || []).length; i++) {
    var c = q.claims[i];
    if (c.options) {
      var other = c.options.filter(function (o) { return o !== c.verdict; })[0];
      if (other) { bad[i] = { v: other }; return { j: bad }; }
    } else if (c.fair === false) {
      bad[i] = { fair: true, why: null };                 /* a biased claim accepted */
      return { j: bad };
    }
  }
  return { j: bad };
}
function valuesBoard(S, q, wrong) {
  var order = q.order || (q.slots || []).map(function (s) { return s.id; });
  var v = {};
  order.forEach(function (id) {
    var slot = (q.slots || []).filter(function (s) { return s.id === id; })[0] || {};
    v[id] = rstr(slot.answer);
  });
  if (!wrong) return { v: v };
  var bad = JSON.parse(JSON.stringify(v));
  var first = order[0];
  bad[first] = String(Number(bad[first] || 0) + 1);
  return { v: bad };
}
function statsBoard(S, q, wrong) {
  switch (q.kind) {
    case 'qlist': return qlistBoard(S, q, wrong);
    case 'cftable': return cftableBoard(S, q, wrong);
    case 'cfplot': return cfplotBoard(S, q, wrong);
    case 'cfread': return cfreadBoard(S, q, wrong);
    case 'boxplot': return boxplotBoard(S, q, wrong);
    case 'compare': return compareBoard(S, q, wrong);
    case 'judge': return judgeBoard(S, q, wrong);
    case 'values': return valuesBoard(S, q, wrong);
    default: return null;
  }
}

/* ------------------------------------------------------------ the public */
function kindOf(q) { return q.kind || q.type || 'reasoned'; }

function correct(M, book, q) {
  var k = kindOf(q);
  if (isStatKind(k)) {
    var board = statsBoard(statsEngine(), q, false);
    return board ? { S: board } : null;
  }
  if (k === 'classify') return { pick: q.classify };
  if (k === 'protractor') return { read: q.value };
  if (k === 'reasoned') {
    var steps = angleModelRoute(q);
    return steps ? { steps: steps } : null;
  }
  var lines = algebraCorrectLines(M, q);
  var out = { L: lines, fin: lines[lines.length - 1].t };
  var mv = algebraMoves(M, q);
  if (mv) out.moves = mv;
  return out;
}

/* the kind's own classic slip, not noise: a walk of the wrong path has to be a
   walk of something a real pupil really does */
function corrupt(M, book, q) {
  var k = kindOf(q);
  if (isStatKind(k)) {
    var bad = statsBoard(statsEngine(), q, true);
    return bad ? { S: bad } : null;
  }
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

module.exports = { correct, corrupt, kindOf, angleModelRoute, algebraCorrectLines, algebraMoves, statsBoard, isStatKind };
