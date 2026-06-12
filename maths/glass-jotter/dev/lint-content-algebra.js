#!/usr/bin/env node
/* Lint + arithmetic verifier for content-algebra.js (The Glass Jotter).
   Usage: node dev/lint-content-algebra.js          (exits non-zero on any inconsistency)

   Two independent layers of checking:
   1. Structure: the INTERFACES.md content-pack contract (section/movie/question
      shapes, op whitelist, tick/box line indices, caption length, marks, dx ids,
      rational normalisation, unicode-minus/× hygiene in maths-bearing strings).
   2. Arithmetic: EVERY authored answer is re-derived by a mini rational-polynomial
      evaluator written here, deliberately independent of mathcore.js. Every dx key
      must parse, must be genuinely wrong (≠ the correct answer) and must be
      distinguishable from the question's other dx keys.
   If mathcore.js is present it is ALSO loaded and the engine's own verdicts are
   cross-checked against the mini evaluator; if absent, that layer is skipped. */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(__dirname, '..');
var CONTENT_PATH = path.join(ROOT, 'content-algebra.js');
var MATHCORE_PATH = path.join(ROOT, 'mathcore.js');

var failures = [];
function fail(where, msg) { failures.push(where + ': ' + msg); }

/* ──────────────── load browser-global scripts under node ──────────────── */

function loadBrowserGlobal(file) {
  if (!fs.existsSync(file)) return { present: false };
  global.window = global.window || {};
  try {
    require(file);
    return { present: true };
  } catch (e) {
    try { // not require()-safe — evaluate with the window shim already in place
      vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
      return { present: true };
    } catch (e2) {
      return { present: true, error: e2 };
    }
  }
}

/* ──────────────── independent rational + polynomial mini-evaluator ────── */

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
function rat(n, d) {
  if (d === undefined) d = 1;
  if (d === 0) throw new Error('zero denominator');
  if (d < 0) { n = -n; d = -d; }
  var g = gcd(n, d);
  return { n: n / g, d: d / g };
}
function radd(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
function rsub(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
function rmul(a, b) { return rat(a.n * b.n, a.d * b.d); }
function rdiv(a, b) { if (b.n === 0) throw new Error('divide by zero'); return rat(a.n * b.d, a.d * b.n); }
function req(a, b) { return a.n === b.n && a.d === b.d; }
function rstr(a) { return a.d === 1 ? String(a.n) : a.n + '/' + a.d; }
var R0 = rat(0);

/* polynomial in x as [c0, c1, c2], all exact rationals */
function pConst(r0) { return [r0, R0, R0]; }
function pAdd(p, q) { return [radd(p[0], q[0]), radd(p[1], q[1]), radd(p[2], q[2])]; }
function pSub(p, q) { return [rsub(p[0], q[0]), rsub(p[1], q[1]), rsub(p[2], q[2])]; }
function pNeg(p) { return pSub(pConst(R0), p); }
function pMul(p, q) {
  var c = [R0, R0, R0, R0, R0];
  for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) c[i + j] = radd(c[i + j], rmul(p[i], q[j]));
  if (c[3].n !== 0 || c[4].n !== 0) throw new Error('degree above 2');
  return [c[0], c[1], c[2]];
}
function pDiv(p, q) {
  if (q[1].n !== 0 || q[2].n !== 0) throw new Error('division by an x term');
  return [rdiv(p[0], q[0]), rdiv(p[1], q[0]), rdiv(p[2], q[0])];
}
function pEq(p, q) { return req(p[0], q[0]) && req(p[1], q[1]) && req(p[2], q[2]); }
function pIsConst(p) { return p[1].n === 0 && p[2].n === 0; }
function pStr(p) { return rstr(p[0]) + '|' + rstr(p[1]) + '|' + rstr(p[2]); }

function numToRat(s) {
  var dot = s.indexOf('.');
  if (dot === -1) return rat(parseInt(s, 10), 1);
  var dec = s.length - dot - 1;
  return rat(parseInt(s.replace('.', ''), 10), Math.pow(10, dec));
}

function tokenize(str) {
  var s = String(str)
    .replace(/−/g, '-')   // − unicode minus
    .replace(/×/g, '*')   // ×
    .replace(/÷/g, '/')   // ÷
    .replace(/²/g, '^2'); // ²
  var toks = [], i = 0;
  while (i < s.length) {
    var ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9]/.test(ch)) {
      var j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      toks.push({ t: 'num', v: s.slice(i, j) }); i = j; continue;
    }
    if (/[a-z]/i.test(ch)) { toks.push({ t: 'let', v: ch.toLowerCase() }); i++; continue; }
    if ('+-*/^()='.indexOf(ch) !== -1) { toks.push({ t: ch }); i++; continue; }
    throw new Error('bad character "' + ch + '" in "' + str + '"');
  }
  return toks;
}

/* recursive descent: expr -> term (± term)*; term -> unary ((×÷|implicit) unary)*;
   unary -> ± unary | power; power -> atom (^2)?; atom -> num | letter | (expr) */
function evalExpr(str, vars) {
  var toks = tokenize(str), pos = 0;
  function peek() { return toks[pos]; }
  function expr() {
    var v = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      var op = toks[pos++].t, w = term();
      v = op === '+' ? pAdd(v, w) : pSub(v, w);
    }
    return v;
  }
  function term() {
    var v = unary();
    for (;;) {
      var p = peek();
      if (!p) break;
      if (p.t === '*' || p.t === '/') { pos++; var w = unary(); v = p.t === '*' ? pMul(v, w) : pDiv(v, w); continue; }
      if (p.t === 'num' || p.t === 'let' || p.t === '(') { v = pMul(v, unary()); continue; } // implicit ×
      break;
    }
    return v;
  }
  function unary() {
    var p = peek();
    if (p && (p.t === '-' || p.t === '+')) { pos++; var v = unary(); return p.t === '-' ? pNeg(v) : v; }
    return power();
  }
  function power() {
    var v = atom();
    if (peek() && peek().t === '^') {
      pos++;
      var e = toks[pos++];
      if (!e || e.t !== 'num' || e.v !== '2') throw new Error('only squares supported');
      v = pMul(v, v);
    }
    return v;
  }
  function atom() {
    var p = toks[pos++];
    if (!p) throw new Error('unexpected end of "' + str + '"');
    if (p.t === 'num') return pConst(numToRat(p.v));
    if (p.t === 'let') {
      if (vars && vars[p.v]) return pConst(rat(vars[p.v].n, vars[p.v].d));
      if (p.v === 'x') return [R0, rat(1), R0];
      throw new Error('letter "' + p.v + '" has no given value in "' + str + '"');
    }
    if (p.t === '(') {
      var v = expr();
      if (!peek() || toks[pos++].t !== ')') throw new Error('missing ) in "' + str + '"');
      return v;
    }
    throw new Error('unexpected token in "' + str + '"');
  }
  var out = expr();
  if (pos !== toks.length) throw new Error('trailing tokens in "' + str + '"');
  return out;
}

/* equation signature: 'sol:<n/d>' | 'identity' | 'none' (linear only; degree-2 rejected) */
function eqSignature(str, vars) {
  var parts = String(str).split('=');
  if (parts.length !== 2) throw new Error('expected exactly one = in "' + str + '"');
  var diff = pSub(evalExpr(parts[0], vars), evalExpr(parts[1], vars));
  if (diff[2].n !== 0) throw new Error('not linear: "' + str + '"');
  if (diff[1].n === 0) return diff[0].n === 0 ? 'identity' : 'none';
  return 'sol:' + rstr(rdiv(pSub(pConst(R0), diff)[0], diff[1]));
}
function solveLinear(str, vars) {
  var sig = eqSignature(str, vars);
  if (sig.indexOf('sol:') !== 0) throw new Error('"' + str + '" has no unique solution (' + sig + ')');
  var bits = sig.slice(4).split('/');
  return rat(parseInt(bits[0], 10), bits.length > 1 ? parseInt(bits[1], 10) : 1);
}

/* substitution value: for an '=' line use whichever side fully evaluates (the
   formula questions carry an unknown subject on the left, e.g. v = u + at) */
function substValue(str, vars) {
  var parts = String(str).split('=');
  if (parts.length === 1) {
    var p = evalExpr(str, vars);
    if (!pIsConst(p)) throw new Error('"' + str + '" did not reduce to a number');
    return p[0];
  }
  if (parts.length !== 2) throw new Error('too many = in "' + str + '"');
  var vals = [];
  parts.forEach(function (side) {
    try {
      var q = evalExpr(side, vars);
      if (pIsConst(q)) vals.push(q[0]);
    } catch (e) { /* the unknown-subject side */ }
  });
  if (vals.length === 0) throw new Error('no side of "' + str + '" evaluates with the given values');
  if (vals.length === 2 && !req(vals[0], vals[1])) throw new Error('sides of "' + str + '" disagree');
  return vals[0];
}

/* ──────────────── mini-evaluator self-test (insurance for the checker) ── */

(function selfTestMini() {
  function expect(cond, msg) { if (!cond) { console.error('MINI-EVALUATOR SELF-TEST FAILED: ' + msg); process.exit(2); } }
  expect(pEq(evalExpr('x(8 − 2x)'), [R0, rat(8), rat(-2)]), 'x(8−2x)');
  expect(pEq(evalExpr('(−3)(4 − 2x)'), [rat(-12), rat(6), R0]), '(−3)(4−2x)');
  expect(pEq(evalExpr('6x² + 3x − 2x² − x'), [R0, rat(2), rat(4)]), 'x² collect');
  expect(req(solveLinear('3 − 2x = 7'), rat(-2)), '3−2x=7');
  expect(req(solveLinear('6(x + 7) = 50'), rat(4, 3)), '6(x+7)=50 → 4/3');
  expect(eqSignature('x + 1 = x + 1') === 'identity', 'identity guard');
  expect(eqSignature('x + 1 = x + 2') === 'none', 'contradiction guard');
  expect(req(substValue('v = u + at', { u: rat(20), a: rat(-2), t: rat(7) }), rat(6)), 'v=u+at');
  expect(req(substValue('a(2b − c)', { a: rat(7), b: rat(5), c: rat(-3) }), rat(91)), 'a(2b−c)');
})();

/* ──────────────── structural constants ─────────────────────────────────── */

var DX_LIBRARY = ['EXPAND_PARTIAL', 'EXPAND_SIGN', 'SUB_INSTEAD_DIV', 'DIV_BEFORE_SUB',
  'SIGN_FLIP_MOVE', 'COLLECT_X_NUM', 'NEG_MUL_SIGN', 'BOTHSIDES_ONE_SIDE', 'SWAP_NOFLIP',
  'ALT_CORR_SWAP', 'COINT_EQUAL', 'TRI_SUM_360', 'STRAIGHT_360', 'VOP_SUPP'];
var Q_TYPES = ['solve', 'expand', 'simplify', 'subst', 'form'];
var PAPER_OPS = ['write', 'sub', 'tick', 'box', 'note', 'grid', 'balance', 'stamp', 'clear'];

function isRat(v) {
  return v && typeof v === 'object' && Number.isInteger(v.n) && Number.isInteger(v.d) &&
    v.d > 0 && gcd(v.n, v.d) === 1;
}
/* maths-bearing UI strings must use unicode − × ² (never ASCII -, *, ^) */
function checkMathsString(s, where) {
  if (/[-*^]/.test(s)) fail(where, 'ASCII -, * or ^ in maths string "' + s + '" — use unicode − × ²');
}
function checkPromptString(s, where) {
  if (/[-*^]/.test(s)) fail(where, 'ASCII -, * or ^ in prompt — use unicode − × ² (got "' + s + '")');
}

/* ──────────────── movie validation ─────────────────────────────────────── */

function checkMovie(secId, movie) {
  var w = secId + '.movie';
  if (!movie || typeof movie !== 'object') { fail(w, 'missing movie'); return 0; }
  if (typeof movie.title !== 'string' || !movie.title) fail(w, 'missing title');
  if (movie.mode !== 'paper') fail(w, 'algebra movies must be mode "paper" (got ' + movie.mode + ')');
  if (!Array.isArray(movie.steps)) { fail(w, 'steps missing'); return 0; }
  if (movie.steps.length < 6 || movie.steps.length > 10)
    fail(w, 'movies must be rich: 6–10 steps (got ' + movie.steps.length + ')');

  var lines = 0, redNotes = 0;
  movie.steps.forEach(function (step, si) {
    var ws = w + '.step' + (si + 1);
    if (typeof step.say !== 'string' || !step.say.trim()) fail(ws, 'missing caption');
    else if (step.say.length > 140) fail(ws, 'caption over 140 chars (' + step.say.length + ')');
    if (!Array.isArray(step.do) || step.do.length === 0) { fail(ws, 'empty do[]'); return; }
    step.do.forEach(function (op, oi) {
      var wo = ws + '.op' + (oi + 1);
      var keys = Object.keys(op);
      if (keys.length !== 1) { fail(wo, 'op must have exactly one key (got ' + keys.join(',') + ')'); return; }
      var k = keys[0];
      if (PAPER_OPS.indexOf(k) === -1) { fail(wo, 'unknown op "' + k + '"'); return; }
      var v = op[k];
      switch (k) {
        case 'write':
          if (typeof v.text !== 'string' || !v.text) fail(wo, 'write.text missing');
          else checkMathsString(v.text, wo);
          if (v.margin !== undefined && typeof v.margin !== 'string') fail(wo, 'write.margin must be a string');
          if (v.margin) checkMathsString(v.margin, wo + '.margin');
          lines++;
          break;
        case 'sub':
          if (typeof v.to !== 'string' || !v.to) fail(wo, 'sub.to missing');
          else checkMathsString(v.to, wo);
          lines++; // the player renders sub as a fresh paper line
          break;
        case 'tick': case 'box':
          if (!Number.isInteger(v.line) || v.line < 0 || v.line >= lines)
            fail(wo, k + '.line ' + v.line + ' out of range (lines written so far: ' + lines + ')');
          break;
        case 'note':
          if (typeof v.text !== 'string' || !v.text) fail(wo, 'note.text missing');
          if (v.red) redNotes++;
          break;
        case 'grid':
          if (typeof v.a !== 'string' || !Array.isArray(v.b) || !Array.isArray(v.vals) ||
              v.b.length === 0 || v.b.length !== v.vals.length) { fail(wo, 'grid needs a, b[], vals[] of equal length'); break; }
          v.b.forEach(function (cell, ci) {
            try {
              if (!pEq(pMul(evalExpr(v.a), evalExpr(cell)), evalExpr(v.vals[ci])))
                fail(wo, 'grid cell wrong: ' + v.a + ' × ' + cell + ' ≠ ' + v.vals[ci]);
            } catch (e) { fail(wo, 'grid cell unparseable: ' + e.message); }
          });
          break;
        case 'balance':
          if (v.l === undefined && v.r === undefined && v.op === undefined && v.tip === undefined)
            fail(wo, 'balance op carries nothing');
          if (v.tip !== undefined && typeof v.tip !== 'number' &&
              !(Array.isArray(v.tip) && v.tip.every(function (t) { return typeof t === 'number'; })))
            fail(wo, 'balance.tip must be a number or array of numbers');
          break;
        case 'stamp':
          if ((typeof v.text !== 'string' || !v.text) && typeof v.reason !== 'string')
            fail(wo, 'stamp needs text or reason');
          break;
        case 'clear':
          lines = 0;
          break;
      }
    });
  });
  if (redNotes > 1) fail(w, 'kitsch ration: at most ONE red (Caveat) note per movie, got ' + redNotes);
  return movie.steps.length;
}

/* ──────────────── question validation ──────────────────────────────────── */

function dxKeySignature(q, key) {
  // signature used both for "is it actually wrong?" and pairwise-distinct checks
  if (q.type === 'solve' || q.type === 'form') {
    if (String(key).split('=').length !== 2) throw new Error('solve/form dx key must be an equation');
    return eqSignature(key);
  }
  if (q.type === 'subst') return 'val:' + rstr(substValue(key, q.given));
  return 'poly:' + pStr(evalExpr(key)); // simplify / expand
}

function checkQuestion(secId, q, seenIds) {
  var w = secId + '.' + (q.id || '?');
  if (!q.id || !/^q\d+$/.test(q.id)) fail(w, 'bad id');
  else if (seenIds[q.id]) fail(w, 'duplicate id'); else seenIds[q.id] = true;

  if (!Array.isArray(q.marks) || q.marks.length !== 2 ||
      !Number.isInteger(q.marks[0]) || !Number.isInteger(q.marks[1]) ||
      q.marks[0] < 1 || q.marks[1] < 1 || q.marks[0] + q.marks[1] > 3)
    fail(w, 'marks must be [method,accuracy], each ≥1, total ≤3 (CCEA 1–3 mark questions)');

  if (Q_TYPES.indexOf(q.type) === -1) fail(w, 'unknown type "' + q.type + '"');
  if (typeof q.prompt !== 'string' || !q.prompt.trim()) fail(w, 'missing prompt');
  else {
    checkPromptString(q.prompt, w + '.prompt');
    if (q.type === 'solve' && !/You must show your working\./.test(q.prompt))
      fail(w, 'solve prompts must carry the M2 phrasing "You must show your working."');
  }

  // dx maps: REQUIRED on every solve/expand/form question; optional elsewhere
  var dxKeys = q.dx ? Object.keys(q.dx) : [];
  if ((q.type === 'solve' || q.type === 'expand' || q.type === 'form') && dxKeys.length === 0)
    fail(w, q.type + ' questions must carry a dx map');
  dxKeys.forEach(function (k) {
    if (DX_LIBRARY.indexOf(q.dx[k]) === -1) fail(w, 'dx code "' + q.dx[k] + '" not in the library');
    checkMathsString(k, w + '.dx"' + k + '"');
  });

  // answer + start shape, then arithmetic, per type
  try {
    if (q.type === 'subst') {
      if (!q.given || !Object.keys(q.given).length) fail(w, 'subst needs given values');
      else Object.keys(q.given).forEach(function (g) {
        if (!isRat(q.given[g])) fail(w, 'given.' + g + ' is not a normalised rational');
      });
      if (!q.answer || !isRat(q.answer.val)) fail(w, 'subst answer must be {val:{n,d}} normalised');
      if (typeof q.start !== 'string') fail(w, 'subst needs a start expression');
      else {
        checkMathsString(q.start, w + '.start');
        var got = substValue(q.start, q.given);
        if (!req(got, q.answer.val))
          fail(w, 'WRONG ANSWER: ' + q.start + ' evaluates to ' + rstr(got) + ', authored ' + rstr(q.answer.val));
      }
    } else if (q.type === 'simplify' || q.type === 'expand') {
      var c = q.answer && q.answer.canon;
      if (!c || !isRat(c.c2) || !isRat(c.c1) || !isRat(c.c0)) fail(w, 'answer must be {canon:{c2,c1,c0}} normalised');
      if (typeof q.start !== 'string') fail(w, q.type + ' needs a start expression');
      else {
        checkMathsString(q.start, w + '.start');
        var p = evalExpr(q.start);
        if (!pEq(p, [rat(c.c0.n, c.c0.d), rat(c.c1.n, c.c1.d), rat(c.c2.n, c.c2.d)]))
          fail(w, 'WRONG CANON: ' + q.start + ' → ' + pStr(p) + ', authored c0|c1|c2 = ' +
            rstr(c.c0) + '|' + rstr(c.c1) + '|' + rstr(c.c2));
      }
    } else if (q.type === 'solve') {
      if (!q.answer || !isRat(q.answer.x)) fail(w, 'solve answer must be {x:{n,d}} normalised');
      if (typeof q.start !== 'string') fail(w, 'solve needs a start equation');
      else {
        checkMathsString(q.start, w + '.start');
        var sol = solveLinear(q.start);
        if (!req(sol, q.answer.x))
          fail(w, 'WRONG ANSWER: ' + q.start + ' solves to x = ' + rstr(sol) + ', authored ' + rstr(q.answer.x));
      }
    } else if (q.type === 'form') {
      if (!q.answer || !isRat(q.answer.x)) fail(w, 'form answer must be {x:{n,d}} normalised');
      if (!q.form || !Array.isArray(q.form.accept) || q.form.accept.length === 0)
        fail(w, 'form needs form.accept[]');
      else q.form.accept.forEach(function (acc) {
        checkMathsString(acc, w + '.accept');
        var s2 = solveLinear(acc);
        if (!req(s2, q.answer.x))
          fail(w, 'accept equation "' + acc + '" solves to x = ' + rstr(s2) + ', authored ' + rstr(q.answer.x));
      });
      if (q.start !== undefined) fail(w, 'form questions must not pre-write the equation (no start)');
    }
  } catch (e) { fail(w, 'arithmetic check threw: ' + e.message); }

  // every dx key must parse, be genuinely wrong, and be distinct from its siblings
  var sigs = {};
  dxKeys.forEach(function (k) {
    try {
      var sig = dxKeySignature(q, k);
      var correct =
        (q.type === 'solve' || q.type === 'form') ? 'sol:' + rstr(q.answer.x) :
        q.type === 'subst' ? 'val:' + rstr(q.answer.val) :
        'poly:' + rstr(q.answer.canon.c0) + '|' + rstr(q.answer.canon.c1) + '|' + rstr(q.answer.canon.c2);
      if (sig === correct) fail(w, 'dx key "' + k + '" is not wrong — it matches the correct answer');
      if (sigs[sig]) fail(w, 'dx keys "' + sigs[sig] + '" and "' + k + '" are canonically identical — ambiguous match');
      sigs[sig] = k;
    } catch (e) { fail(w, 'dx key "' + k + '": ' + e.message); }
  });
}

/* ──────────────── optional mathcore cross-check ────────────────────────── */

function canonToString(c) {
  // build a display string like "−2x² + 8x" from a canon, for exprStep cross-checks
  var parts = [];
  function term(coef, suffix) {
    if (coef.n === 0) return;
    var sign = coef.n < 0 ? '−' : (parts.length ? '+' : '');
    var mag = rat(Math.abs(coef.n), coef.d);
    var body = (req(mag, rat(1)) && suffix) ? suffix : rstr(mag) + suffix;
    parts.push(sign ? sign + ' ' + body : body);
  }
  term(rat(c.c2.n, c.c2.d), 'x²');
  term(rat(c.c1.n, c.c1.d), 'x');
  term(rat(c.c0.n, c.c0.d), '');
  return parts.length ? parts.join(' ').replace(/^− /, '−') : '0';
}

function crossCheckWithEngine(M, pack) {
  var n = 0;
  pack.sections.forEach(function (sec) {
    sec.questions.forEach(function (q) {
      var w = 'engine:' + sec.id + '.' + q.id;
      try {
        if (q.type === 'solve') {
          var ans = 'x = ' + (q.answer.x.d === 1 ? q.answer.x.n : q.answer.x.n + '/' + q.answer.x.d);
          var v = M.eqStep(q.start, ans);
          if (!v || v.ok !== 'sound') fail(w, 'eqStep(start, "' + ans + '") not sound: ' + JSON.stringify(v));
          Object.keys(q.dx || {}).forEach(function (k) {
            var vk = M.eqStep(q.start, k);
            if (vk && vk.ok === 'sound') fail(w, 'dx key "' + k + '" judged SOUND by the engine — not a misconception');
          });
          n++;
        } else if (q.type === 'form') {
          var ansF = 'x = ' + (q.answer.x.d === 1 ? q.answer.x.n : q.answer.x.n + '/' + q.answer.x.d);
          q.form.accept.forEach(function (acc) {
            var va = M.eqStep(acc, ansF);
            if (!va || va.ok !== 'sound') fail(w, 'eqStep("' + acc + '", answer) not sound');
          });
          n++;
        } else if (q.type === 'simplify' || q.type === 'expand') {
          var target = canonToString(q.answer.canon);
          var ve = M.exprStep(q.start, target);
          if (!ve || ve.ok !== 'sound') fail(w, 'exprStep(start, "' + target + '") not sound: ' + JSON.stringify(ve));
          Object.keys(q.dx || {}).forEach(function (k) {
            var vk2 = M.exprStep(q.start, k);
            if (vk2 && vk2.ok === 'sound') fail(w, 'dx key "' + k + '" judged SOUND by the engine');
          });
          n++;
        } else if (q.type === 'subst') {
          var exprPart = q.start.indexOf('=') !== -1 ? q.start.split('=')[1] : q.start;
          var sv = M.substEval(exprPart, q.given);
          if (!sv || !sv.ok || sv.val.n !== q.answer.val.n || sv.val.d !== q.answer.val.d)
            fail(w, 'substEval gave ' + JSON.stringify(sv && sv.val) + ', authored ' + JSON.stringify(q.answer.val));
          n++;
        }
      } catch (e) { fail(w, 'engine threw: ' + e.message); }
    });
  });
  return n;
}

/* ──────────────── run ──────────────────────────────────────────────────── */

var contentLoad = loadBrowserGlobal(CONTENT_PATH);
if (!contentLoad.present) { console.error('FAIL: ' + CONTENT_PATH + ' not found'); process.exit(1); }
if (contentLoad.error) { console.error('FAIL: content-algebra.js did not evaluate: ' + contentLoad.error.message); process.exit(1); }

var pack = global.window.GJ_CONTENT && global.window.GJ_CONTENT.algebra;
if (!pack) { console.error('FAIL: window.GJ_CONTENT.algebra not attached'); process.exit(1); }

if (pack.id !== 'algebra') fail('pack', 'id must be "algebra"');
if (typeof pack.title !== 'string' || !pack.title) fail('pack', 'missing title');
if (!pack.cover || pack.cover.accent !== 'plum') fail('pack', 'cover.accent must be "plum" (Ink & Balance)');
if (!pack.cover || pack.cover.motif !== 'radical') fail('pack', 'cover.motif must be "radical"');
if (pack.reasonBank !== undefined) fail('pack', 'reasonBank is angles-only');
if (!Array.isArray(pack.sections) || pack.sections.length !== 6) fail('pack', 'expected exactly 6 sections');

var seenIds = {}, totalQ = 0, totalSteps = 0, totalMarks = 0;
var typeCounts = {}, dxUsed = {};
var report = [];

(pack.sections || []).forEach(function (sec, i) {
  var wantId = 's' + (i + 1);
  if (sec.id !== wantId) fail('sections[' + i + ']', 'id should be ' + wantId + ' (got ' + sec.id + ')');
  if (typeof sec.title !== 'string' || !sec.title) fail(wantId, 'missing title');
  if (typeof sec.walt !== 'string' || !sec.walt) fail(wantId, 'missing walt');

  var steps = checkMovie(sec.id, sec.movie);
  totalSteps += steps;

  if (!Array.isArray(sec.questions) || sec.questions.length !== 4)
    fail(wantId, 'expected exactly 4 questions (got ' + (sec.questions || []).length + ')');
  (sec.questions || []).forEach(function (q) {
    checkQuestion(sec.id, q, seenIds);
    totalQ++;
    typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
    if (Array.isArray(q.marks)) totalMarks += (q.marks[0] || 0) + (q.marks[1] || 0);
    Object.keys(q.dx || {}).forEach(function (k) { dxUsed[q.dx[k]] = (dxUsed[q.dx[k]] || 0) + 1; });
  });

  report.push('  ' + sec.id + '  ' + sec.title + ' — ' + (sec.questions || []).length +
    ' questions, movie ' + steps + ' steps');
});

/* mathcore layer */
var engineLine;
var coreLoad = loadBrowserGlobal(MATHCORE_PATH);
if (!coreLoad.present) {
  engineLine = 'mathcore.js not present — engine cross-check skipped (structure + independent arithmetic only)';
} else if (coreLoad.error) {
  fail('mathcore', 'mathcore.js exists but failed to evaluate: ' + coreLoad.error.message);
  engineLine = 'mathcore.js present but did not load';
} else {
  var M = global.window.GJ_MATH;
  if (!M || typeof M.eqStep !== 'function' || typeof M.exprStep !== 'function' || typeof M.substEval !== 'function') {
    fail('mathcore', 'mathcore.js loaded but GJ_MATH is missing eqStep/exprStep/substEval');
    engineLine = 'mathcore.js loaded but incomplete';
  } else {
    var checked = crossCheckWithEngine(M, pack);
    engineLine = 'mathcore.js present — engine cross-checked ' + checked + ' questions against the mini evaluator';
  }
}

/* ──────────────── report ───────────────────────────────────────────────── */

console.log('The Glass Jotter — content-algebra lint');
console.log(report.join('\n'));
console.log('  totals: ' + totalQ + ' questions (' +
  Object.keys(typeCounts).map(function (t) { return t + ' ' + typeCounts[t]; }).join(', ') +
  '), ' + totalSteps + ' movie steps, ' + totalMarks + ' marks');
console.log('  dx codes used: ' + Object.keys(dxUsed).sort().map(function (c) { return c + '×' + dxUsed[c]; }).join(', '));
console.log('  ' + engineLine);

if (failures.length) {
  console.error('\nFAIL — ' + failures.length + ' problem(s):');
  failures.forEach(function (f) { console.error('  ✗ ' + f); });
  process.exit(1);
}
console.log('PASS');
process.exit(0);
