/* The Glass Jotter - algebra marking engine. Pure logic, no DOM.
   Exact rational arithmetic throughout: correctness decisions never touch
   floating point. A working line is parsed to an exact polynomial (degree
   <= 2) per side; a solving step is sound iff the new equation's solution
   set EXACTLY equals the previous line's (tested by proportionality of the
   normalised difference polynomials, which for linear equations is the
   same thing and also guards degree changes). See INTERFACES.md. */
(function () {
  'use strict';

  /* ---- rationals {n, d}: d > 0, gcd(|n|, d) = 1 ------------------- */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function rat(n, d) {
    d = (d == null) ? 1 : d;
    if (d === 0) return null;
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  function radd(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
  function rsub(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
  function rmul(a, b) { return rat(a.n * b.n, a.d * b.d); }
  function rdiv(a, b) { if (b.n === 0) return null; return rat(a.n * b.d, a.d * b.n); }
  function rneg(a) { return rat(-a.n, a.d); }
  function req(a, b) { return a && b && a.n === b.n && a.d === b.d; }
  function rzero(a) { return a && a.n === 0; }
  function rfromstr(s) {
    s = String(s).trim();
    var m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (m) return rat(parseInt(m[1], 10), parseInt(m[2], 10));
    m = s.match(/^(-?)(\d*)\.(\d+)$/);
    if (m) {
      var sign = m[1] === '-' ? -1 : 1;
      var whole = m[2] ? parseInt(m[2], 10) : 0;
      var frac = parseInt(m[3], 10), pow = Math.pow(10, m[3].length);
      return rat(sign * (whole * pow + frac), pow);
    }
    m = s.match(/^-?\d+$/);
    if (m) return rat(parseInt(s, 10), 1);
    return null;
  }
  function rtostr(a) { return a.d === 1 ? String(a.n) : (a.n + '/' + a.d); }

  /* ---- polynomials in x, degree <= 2: {c2, c1, c0} rationals ------ */
  function P(c2, c1, c0) { return { c2: c2 || rat(0, 1), c1: c1 || rat(0, 1), c0: c0 || rat(0, 1) }; }
  function pConst(r) { return P(null, null, r); }
  function pAdd(a, b) { return P(radd(a.c2, b.c2), radd(a.c1, b.c1), radd(a.c0, b.c0)); }
  function pSub(a, b) { return P(rsub(a.c2, b.c2), rsub(a.c1, b.c1), rsub(a.c0, b.c0)); }
  function pNeg(a) { return P(rneg(a.c2), rneg(a.c1), rneg(a.c0)); }
  function pMul(a, b) { // null if the product's degree would exceed 2
    var bad = (!rzero(a.c2) && (!rzero(b.c1) || !rzero(b.c2))) ||
              (!rzero(b.c2) && (!rzero(a.c1) || !rzero(a.c2)));
    if (bad) return null;
    var d2 = radd(radd(rmul(a.c2, b.c0), rmul(a.c0, b.c2)), rmul(a.c1, b.c1));
    return P(d2, radd(rmul(a.c1, b.c0), rmul(a.c0, b.c1)), rmul(a.c0, b.c0));
  }
  function pDivC(a, r) { if (!r || r.n === 0) return null; return P(rdiv(a.c2, r), rdiv(a.c1, r), rdiv(a.c0, r)); }
  function pIsConst(a) { return rzero(a.c2) && rzero(a.c1); }
  function pIsZero(a) { return pIsConst(a) && rzero(a.c0); }
  function pEq(a, b) { return req(a.c2, b.c2) && req(a.c1, b.c1) && req(a.c0, b.c0); }
  function pDeg(a) { return !rzero(a.c2) ? 2 : !rzero(a.c1) ? 1 : 0; }
  /* g == k * f for some k != 0 ? (same solution set for our school cases) */
  function pProportional(f, g) {
    if (pIsZero(f) || pIsZero(g)) return pIsZero(f) && pIsZero(g);
    var k = null;
    var pairs = [[f.c2, g.c2], [f.c1, g.c1], [f.c0, g.c0]];
    for (var i = 0; i < 3; i++) {
      var a = pairs[i][0], b = pairs[i][1];
      if (rzero(a) !== rzero(b)) return false;
      if (!rzero(a)) {
        var r = rdiv(b, a);
        if (k === null) k = r;
        else if (!req(k, r)) return false;
      }
    }
    return k !== null && k.n !== 0;
  }
  function pKey(f) { // stable cluster key: monic-normalised serialisation
    if (pIsZero(f)) return '0';
    var lead = !rzero(f.c2) ? f.c2 : !rzero(f.c1) ? f.c1 : f.c0;
    var n = pDivC(f, lead);
    return ['x2', rtostr(n.c2), 'x', rtostr(n.c1), 'c', rtostr(n.c0)].join(':');
  }

  /* ---- tokeniser + recursive-descent parser ----------------------- */
  function normalise(src) {
    return String(src)
      .replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/²/g, '^2').replace(/\s+/g, '')
      .replace(/X/g, 'x');
  }
  function tokenise(s, allowLetters) {
    var toks = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/[0-9.]/.test(c)) {
        var j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        var num = rfromstr(s.slice(i, j));
        if (!num) return { err: 'bad number "' + s.slice(i, j) + '"' };
        toks.push({ t: 'num', v: num });
        i = j;
      } else if (c === 'x') {
        toks.push({ t: 'x' }); i++;
      } else if (allowLetters && /[a-wyz]/.test(c)) {
        toks.push({ t: 'var', v: c }); i++;
      } else if ('+-*/()^='.indexOf(c) !== -1) {
        toks.push({ t: c }); i++;
      } else {
        return { err: 'unexpected "' + c + '"' };
      }
    }
    return { toks: toks };
  }

  /* parses one side into a poly (or err). vars: optional {letter: rat}
     so substitution lines evaluate letters as constants. */
  function parseSide(toks, vars) {
    var pos = 0, err = null;
    function peek() { return toks[pos]; }
    function take() { return toks[pos++]; }
    function parseExpr() {
      var sign = 1;
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        if (take().t === '-') sign = -sign;
      }
      var left = parseTerm();
      if (!left) return null;
      if (sign < 0) left = pNeg(left);
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        var op = take().t;
        var right = parseTerm();
        if (!right) return null;
        left = op === '+' ? pAdd(left, right) : pSub(left, right);
      }
      return left;
    }
    function parseTerm() {
      var left = parseUnary();
      if (!left) return null;
      for (;;) {
        var nx = peek();
        if (!nx) break;
        if (nx.t === '*' || nx.t === '/') {
          take();
          var right = parseUnary();
          if (!right) return null;
          if (nx.t === '*') {
            left = pMul(left, right);
            if (!left) { err = 'degree above x squared'; return null; }
          } else {
            if (!pIsConst(right)) { err = 'x in a denominator'; return null; }
            left = pDivC(left, right.c0);
            if (!left) { err = 'division by zero'; return null; }
          }
        } else if (nx.t === 'num' || nx.t === 'x' || nx.t === '(' || nx.t === 'var') {
          var right2 = parseUnary(); // implicit multiplication: 5(x-3), 2x, ab
          if (!right2) return null;
          left = pMul(left, right2);
          if (!left) { err = 'degree above x squared'; return null; }
        } else break;
      }
      return left;
    }
    function parseUnary() {
      var sign = 1;
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        if (take().t === '-') sign = -sign;
      }
      var p = parsePow();
      if (!p) return null;
      return sign < 0 ? pNeg(p) : p;
    }
    function parsePow() {
      var base = parsePrimary();
      if (!base) return null;
      if (peek() && peek().t === '^') {
        take();
        var e = take();
        if (!e || e.t !== 'num' || e.v.d !== 1 || e.v.n < 0) { err = 'bad power'; return null; }
        var n2 = e.v.n;
        if (n2 === 0) return pConst(rat(1, 1));
        var acc = base;
        for (var i = 1; i < n2; i++) {
          acc = acc && pMul(acc, base);
          if (!acc) { err = 'degree above x squared'; return null; }
        }
        return acc;
      }
      return base;
    }
    function parsePrimary() {
      var tk = peek();
      if (!tk) { err = 'line ends early'; return null; }
      if (tk.t === 'num') { take(); return pConst(tk.v); }
      if (tk.t === 'x') { take(); return P(null, rat(1, 1), null); }
      if (tk.t === 'var') {
        take();
        if (!vars || !(tk.v in vars)) { err = 'unknown letter "' + tk.v + '"'; return null; }
        return pConst(vars[tk.v]);
      }
      if (tk.t === '(') {
        take();
        var inner = parseExpr();
        if (!inner) return null;
        var close = take();
        if (!close || close.t !== ')') { err = 'missing bracket'; return null; }
        return inner;
      }
      err = 'unexpected "' + tk.t + '"';
      return null;
    }
    var out = parseExpr();
    if (out && pos !== toks.length) { out = null; err = err || 'could not read the whole line'; }
    return out ? { poly: out } : { err: err || 'unreadable' };
  }

  function parse(str, vars) {
    if (str == null || String(str).trim() === '') return { ok: false, err: 'empty line' };
    var s = normalise(str);
    var eqAt = s.indexOf('=');
    if (eqAt !== -1 && s.indexOf('=', eqAt + 1) !== -1) return { ok: false, err: 'two equals signs' };
    var sides = eqAt === -1 ? [s] : [s.slice(0, eqAt), s.slice(eqAt + 1)];
    if (sides.some(function (x) { return x === ''; })) return { ok: false, err: 'empty side of the equation' };
    var parsed = [];
    for (var i = 0; i < sides.length; i++) {
      var tk = tokenise(sides[i], !!vars);
      if (tk.err) return { ok: false, err: tk.err };
      var side = parseSide(tk.toks, vars);
      if (side.err) return { ok: false, err: side.err };
      parsed.push(side);
    }
    return {
      ok: true,
      ast: { eq: sides.length === 2, lhs: parsed[0], rhs: parsed[1] || null }
    };
  }
  function canonSide(side) { return side && side.poly ? side.poly : null; }
  function lineKind(parsed) { return parsed && parsed.ok && parsed.ast.eq ? 'eq' : 'expr'; }

  function eqF(ast) { return pSub(ast.lhs.poly, ast.rhs.poly); }

  function eqStep(prevStr, nextStr) {
    var p = parse(prevStr), n = parse(nextStr);
    if (!p.ok || !n.ok) return { ok: 'parse' };
    if (!p.ast.eq || !n.ast.eq) return { ok: 'notequiv', dxText: 'an equation must keep its equals sign' };
    var f = eqF(p.ast), g = eqF(n.ast);
    if (pIsZero(g)) return { ok: 'identity' };
    if (pIsZero(f)) return { ok: 'notequiv' };
    if (pDeg(g) > pDeg(f)) return { ok: 'notequiv', dxText: 'this step raises the power of x' };
    return pProportional(f, g) ? { ok: 'sound' } : { ok: 'notequiv' };
  }

  function exprStep(prevStr, nextStr) {
    var p = parse(prevStr), n = parse(nextStr);
    if (!p.ok || !n.ok) return { ok: 'parse' };
    if (p.ast.eq !== n.ast.eq) return { ok: 'notequiv' };
    if (p.ast.eq) return eqStep(prevStr, nextStr);
    return pEq(p.ast.lhs.poly, n.ast.lhs.poly) ? { ok: 'sound' } : { ok: 'notequiv' };
  }

  function inferOp(prevStr, nextStr) {
    var p = parse(prevStr), n = parse(nextStr);
    if (!p.ok || !n.ok || !p.ast.eq || !n.ast.eq) return null;
    var pl = p.ast.lhs.poly, pr = p.ast.rhs.poly;
    var nl = n.ast.lhs.poly, nr = n.ast.rhs.poly;
    if (pEq(nl, pl) && pEq(nr, pr)) return { op: 'rewrite' };
    if (pEq(nl, pr) && pEq(nr, pl)) return { op: 'rewrite' };           // swapped sides
    var dL = pSub(nl, pl), dR = pSub(nr, pr);
    if (pEq(dL, dR)) {
      if (pIsZero(dL)) return { op: 'rewrite' };
      if (pIsConst(dL)) return dL.c0.n > 0 ? { op: '+', operand: dL.c0 } : { op: '-', operand: rneg(dL.c0) };
      return { op: dL.c1.n > 0 ? '+' : '-', operand: null };            // moved an x-term
    }
    if (!pIsZero(pl) && pProportional(pl, nl)) {
      var lead = !rzero(pl.c2) ? [pl.c2, nl.c2] : !rzero(pl.c1) ? [pl.c1, nl.c1] : [pl.c0, nl.c0];
      var k = rdiv(lead[1], lead[0]);
      if (k && pEq(nr, pMul(pr, pConst(k)))) {
        if (k.n === 1 && k.d !== 1) return { op: '/', operand: rat(k.d, 1) };
        return { op: '*', operand: k };
      }
    }
    return null;
  }

  function evalCalc(str) {
    var p = parse(str);
    if (!p.ok || p.ast.eq) return { ok: false };
    var poly = p.ast.lhs.poly;
    if (!pIsConst(poly)) return { ok: false };
    return { ok: true, val: poly.c0 };
  }

  function substEval(exprStr, vars) {
    var p = parse(exprStr, vars || {});
    if (!p.ok || p.ast.eq) return { ok: false };
    var poly = p.ast.lhs.poly;
    if (!pIsConst(poly)) return { ok: false };
    return { ok: true, val: poly.c0 };
  }

  /* ---- dx matching (canonical, never string comparison) ----------- */
  function dxLookup(q, lineStr) {
    if (!q.dx) return null;
    var pl = parse(lineStr);
    if (!pl.ok) return null;
    var keys = Object.keys(q.dx);
    for (var i = 0; i < keys.length; i++) {
      var pk = parse(keys[i]);
      if (!pk.ok) continue;
      if (pl.ast.eq !== pk.ast.eq) continue;
      if (pl.ast.eq) {
        if (pProportional(eqF(pk.ast), eqF(pl.ast))) return q.dx[keys[i]];
      } else if (pEq(pk.ast.lhs.poly, pl.ast.lhs.poly)) return q.dx[keys[i]];
    }
    return null;
  }
  function clusterKey(lineStr) {
    var p = parse(lineStr);
    if (!p.ok) return 'unread:' + String(lineStr).slice(0, 30);
    return p.ast.eq ? 'eq:' + pKey(eqF(p.ast)) : 'ex:' + pKey(p.ast.lhs.poly);
  }

  /* ---- final-answer recognisers ------------------------------------ */
  function isAnswerLine(lineStr, ansX) {
    var p = parse(lineStr);
    if (!p.ok || !p.ast.eq) return false;
    var l = p.ast.lhs.poly, r = p.ast.rhs.poly;
    function isXequals(a, b) {
      return rzero(a.c2) && req(a.c1, rat(1, 1)) && rzero(a.c0) && pIsConst(b) && req(b.c0, ansX);
    }
    return isXequals(l, r) || isXequals(r, l);
  }
  /* "looks collected": no brackets, at most one x term and one x² term */
  function isCanonicalText(lineStr) {
    var s = normalise(lineStr);
    if (s.indexOf('(') !== -1) return false;
    var xs = s.replace(/x\^2/g, 'Q');
    var nx = (xs.match(/x/g) || []).length;
    var nq = (xs.match(/Q/g) || []).length;
    return nx <= 1 && nq <= 1;
  }

  /* ---- the marker ---------------------------------------------------
     attempt = {L: [{op, t}, ...], fin}
     -> {perLine, res, mk:[m,a], mkMax:[m,a]} per INTERFACES.md          */
  function checkQuestion(q, attempt) {
    var lines = (attempt && attempt.L) || [];
    var mkMax = [q.marks[0], q.marks[1]];
    var per = [];
    var type = q.type || 'solve';
    var i;

    if (!lines.length) return { perLine: [], res: 'X@1', mk: [0, 0], mkMax: mkMax };

    if (type === 'solve' || type === 'form') {
      var ansX = q.answer && q.answer.x ? rat(q.answer.x.n, q.answer.x.d) : null;
      var prev;              // chain anchor: the last parseable line
      var errorAt = -1;
      var startIdx = 0;

      if (type === 'form') {
        var first = lines[0];
        var pf = parse(first.t);
        var okForm = false;
        if (pf.ok && pf.ast.eq) {
          okForm = ((q.form && q.form.accept) || []).some(function (acc) {
            var pa = parse(acc);
            return pa.ok && pa.ast.eq && pProportional(eqF(pa.ast), eqF(pf.ast));
          });
        }
        per.push(okForm ? { ok: 1, dx: null }
          : { ok: 0, dx: dxLookup(q, first.t), note: pf.ok ? 'that equation does not describe the problem' : 'unread line', cluster: clusterKey(first.t) });
        if (!okForm) errorAt = 0;
        prev = pf.ok ? first.t : null;
        startIdx = 1;
      } else {
        prev = q.start || null;
      }

      for (i = startIdx; i < lines.length; i++) {
        var pl = parse(lines[i].t);
        if (!pl.ok) {
          per.push({ ok: 0, dx: null, note: 'unread line' });
          if (errorAt === -1) errorAt = i;
          continue;                                  // anchor unchanged
        }
        if (!prev) {
          per.push({ ok: errorAt === -1 ? 1 : 2, dx: null });
          prev = lines[i].t;
          continue;
        }
        var v = eqStep(prev, lines[i].t);
        if (v.ok === 'sound' || v.ok === 'identity') {
          per.push({ ok: errorAt === -1 ? 1 : 2, dx: null });
        } else if (v.ok === 'parse') {
          per.push({ ok: 0, dx: null, note: 'unread line' });
          if (errorAt === -1) errorAt = i;
        } else {
          per.push({ ok: 0, dx: dxLookup(q, lines[i].t), note: v.dxText || null, cluster: clusterKey(lines[i].t) });
          if (errorAt === -1) errorAt = i;
        }
        prev = lines[i].t;   // FT: judge later lines against the pupil's own line
      }

      var answerRight = ansX != null && isAnswerLine(lines[lines.length - 1].t, ansX);

      /* method evidence = sound steps that actually transformed the line */
      var methodSteps = 0;
      for (i = 0; i < lines.length; i++) {
        if (!per[i] || per[i].ok === 0) continue;
        if (type === 'form' && i === 0) { methodSteps++; continue; }
        var anchor = i === 0 ? q.start : lines[i - 1].t;
        if (!anchor) { methodSteps++; continue; }
        var io = inferOp(anchor, lines[i].t);
        if (!io || io.op !== 'rewrite') methodSteps++;
      }

      /* a single committed line that IS the answer: if that line is one
         legal operation away from the start (x+7=12 -> x=5) it IS the
         working for a one-step equation and earns full credit; if the
         leap cannot be explained as one move (5(x-3)=35 -> x=10), the
         method marks stay on the table, exactly as a CCEA scheme holds
         them for unshown working */
      var soloOp = (lines.length === 1 && q.start) ? inferOp(q.start, lines[0].t) : null;
      var amber = answerRight && errorAt === -1 && type !== 'form' && lines.length === 1 && !!q.start &&
        (!soloOp || soloOp.op === 'rewrite');
      if (amber) {
        return { perLine: per, res: 'AMBER', mk: [0, mkMax[1]], mkMax: mkMax };
      }
      if (errorAt === -1 && answerRight) {
        return { perLine: per, res: 'OK', mk: [mkMax[0], mkMax[1]], mkMax: mkMax };
      }
      return {
        perLine: per,
        res: errorAt !== -1 ? 'X@' + (errorAt + 1) : 'X@' + (lines.length + 1),
        mk: [Math.min(mkMax[0], methodSteps), answerRight ? mkMax[1] : 0],
        mkMax: mkMax
      };
    }

    if (type === 'expand' || type === 'simplify') {
      var target = q.answer && q.answer.canon
        ? P(rat(q.answer.canon.c2.n, q.answer.canon.c2.d),
            rat(q.answer.canon.c1.n, q.answer.canon.c1.d),
            rat(q.answer.canon.c0.n, q.answer.canon.c0.d))
        : null;
      var anchor2 = parse(q.start).ok ? q.start : null;
      var errAt = -1;
      for (i = 0; i < lines.length; i++) {
        var pe = parse(lines[i].t);
        if (!pe.ok) {
          per.push({ ok: 0, dx: null, note: 'unread line' });
          if (errAt === -1) errAt = i;
          continue;
        }
        if (anchor2) {
          var ve = exprStep(anchor2, lines[i].t);
          if (ve.ok === 'sound') per.push({ ok: errAt === -1 ? 1 : 2, dx: null });
          else {
            per.push({ ok: 0, dx: dxLookup(q, lines[i].t), cluster: clusterKey(lines[i].t) });
            if (errAt === -1) errAt = i;
          }
        } else per.push({ ok: 1, dx: null });
        anchor2 = lines[i].t;
      }
      var lastP = parse(lines[lines.length - 1].t);
      var finished = errAt === -1 && lastP.ok && !lastP.ast.eq && target &&
        pEq(lastP.ast.lhs.poly, target) && isCanonicalText(lines[lines.length - 1].t);
      if (finished) return { perLine: per, res: 'OK', mk: [mkMax[0], mkMax[1]], mkMax: mkMax };
      var anySound = per.some(function (x) { return x.ok === 1 || x.ok === 2; });
      return {
        perLine: per,
        res: errAt !== -1 ? 'X@' + (errAt + 1) : 'X@' + (lines.length + 1),
        mk: [anySound ? Math.min(1, mkMax[0]) : 0, 0],
        mkMax: mkMax
      };
    }

    if (type === 'subst') {
      var vars = {};
      Object.keys(q.given || {}).forEach(function (k) { vars[k] = rat(q.given[k].n, q.given[k].d); });
      var want = q.answer && q.answer.val ? rat(q.answer.val.n, q.answer.val.d) : null;
      var errS = -1;
      for (i = 0; i < lines.length; i++) {
        // allow a formula subject prefix the pupil copied ("v = 20 − 14")
        var txt = lines[i].t;
        var subjM = String(txt).match(/^\s*([a-wyz])\s*=\s*([\s\S]+)$/);
        if (subjM && !(subjM[1] in vars)) txt = subjM[2];
        var ev = substEval(txt, vars);
        if (ev.ok && want && req(ev.val, want)) per.push({ ok: errS === -1 ? 1 : 2, dx: null });
        else {
          per.push({ ok: 0, dx: dxLookup(q, lines[i].t), cluster: clusterKey(lines[i].t) });
          if (errS === -1) errS = i;
        }
      }
      var lastT = lines[lines.length - 1].t;
      var lastM = String(lastT).match(/^\s*([a-wyz])\s*=\s*([\s\S]+)$/);
      if (lastM && !(lastM[1] in vars)) lastT = lastM[2];
      var lastE = substEval(lastT, {});
      var bare = lastE.ok && want && req(lastE.val, want);
      if (errS === -1 && bare) {
        if (lines.length === 1) return { perLine: per, res: 'AMBER', mk: [0, mkMax[1]], mkMax: mkMax };
        return { perLine: per, res: 'OK', mk: [mkMax[0], mkMax[1]], mkMax: mkMax };
      }
      return {
        perLine: per,
        res: errS !== -1 ? 'X@' + (errS + 1) : 'X@' + (lines.length + 1),
        mk: [errS !== 0 && lines.length > 1 ? Math.min(1, mkMax[0]) : 0, bare ? mkMax[1] : 0],
        mkMax: mkMax
      };
    }

    return { perLine: [], res: 'X@1', mk: [0, 0], mkMax: mkMax };
  }

  /* ---- self test ---------------------------------------------------- */
  function selfTest() {
    var failures = [];
    var n = 0;
    function T(name, cond) { n++; if (!cond) failures.push(name); }
    function r(a, b) { return rat(a, b == null ? 1 : b); }
    function chk(q, lines, fin) {
      return checkQuestion(q, { L: lines.map(function (t) { return { op: 'rw', t: t }; }), fin: fin });
    }
    var MNS = '−';
    var q535 = { id: 'q1', type: 'solve', marks: [2, 1], start: '5(x - 3) = 35', answer: { x: r(10) },
      dx: { '5x-3=35': 'EXPAND_PARTIAL', '5x+15=35': 'EXPAND_SIGN' } };

    // parsing
    T('parse simple', parse('5x - 15 = 35').ok);
    T('parse unicode minus', parse('5x ' + MNS + ' 15 = 35').ok);
    T('parse implicit mult', parse('5(x-3)=35').ok);
    T('parse x squared char', parse('x² + 3x').ok);
    T('parse caret', parse('x^2 + 3x').ok);
    T('reject empty', !parse('').ok);
    T('reject double equals', !parse('x = 3 = 3').ok);
    T('reject garbage', !parse('5x + & = 2').ok);
    T('reject x denominator', !parse('5/x = 1').ok);
    T('reject degree 3', !parse('x*x*x').ok);
    T('mixed number unreadable', !parse('1⅓').ok);
    T('reject empty side', !parse('5x =').ok);

    // canon
    var c = canonSide(parse('2(x+3) - x').ast.lhs);
    T('canon collects', req(c.c1, r(1)) && req(c.c0, r(6)));
    T('lineKind eq', lineKind(parse('x=2')) === 'eq');
    T('lineKind expr', lineKind(parse('x+2')) === 'expr');

    // eqStep
    T('expand step sound', eqStep('5(x-3)=35', '5x-15=35').ok === 'sound');
    T('partial expand bad', eqStep('5(x-3)=35', '5x-3=35').ok === 'notequiv');
    T('divide-first route', eqStep('5(x-3)=35', 'x-3=7').ok === 'sound');
    T('add 15 sound', eqStep('5x-15=35', '5x=50').ok === 'sound');
    T('divide 5 sound', eqStep('5x=50', 'x=10').ok === 'sound');
    T('one side only bad', eqStep('2x+5=11', '2x=11').ok === 'notequiv');
    T('negative coeff', eqStep('3-2x=7', '-2x=4').ok === 'sound');
    T('divide by negative', eqStep('-2x=4', 'x=-2').ok === 'sound');
    T('x both sides', eqStep('3x+2=4x-3', '2=x-3').ok === 'sound');
    T('swap sides sound', eqStep('5=x', 'x=5').ok === 'sound');
    T('degree trap', eqStep('x=3', 'x*x=3x').ok === 'notequiv');
    T('fraction answer', eqStep('3x=4', 'x=4/3').ok === 'sound');
    T('decimal answer', eqStep('2x=9', 'x=4.5').ok === 'sound');
    T('collect first', eqStep('3x+2+5x=x+44', '8x+2=x+44').ok === 'sound');
    T('brackets both sides', eqStep('3(x+2)=2(x-1)', '3x+6=2x-2').ok === 'sound');
    T('scaling is sound', eqStep('2x+4=10', 'x+2=5').ok === 'sound');
    T('times both sides', eqStep('x/2=7', 'x=14').ok === 'sound');
    T('identity next', eqStep('x+2=x+3', 'x+2=x+2').ok === 'identity');
    T('parse verdict', eqStep('x+2=8', 'x + ?? = 8').ok === 'parse');

    // inferOp
    var io = inferOp('5x-15=35', '5x=50');
    T('infer +15', io && io.op === '+' && req(io.operand, r(15)));
    io = inferOp('5x=50', 'x=10');
    T('infer /5', io && io.op === '/' && req(io.operand, r(5)));
    io = inferOp('5x=50', '5x=50');
    T('infer rewrite', io && io.op === 'rewrite');
    io = inferOp('2x+5=11', '2x=6');
    T('infer -5', io && io.op === '-' && req(io.operand, r(5)));
    T('infer null when broken', inferOp('5x=50', 'x=12') === null);

    // evalCalc / substEval
    var e = evalCalc('180-38-74');
    T('calc plain', e.ok && req(e.val, r(68)));
    e = evalCalc('(2*4)+7');
    T('calc brackets', e.ok && req(e.val, r(15)));
    e = evalCalc('180 ' + MNS + ' 38');
    T('calc unicode', e.ok && req(e.val, r(142)));
    T('calc rejects x', !evalCalc('2x+1').ok);
    e = substEval('a(b - c)', { a: r(4), b: r(7), c: r(3) });
    T('subst brackets', e.ok && req(e.val, r(16)));
    e = substEval('3a - d', { a: r(3), d: r(-4) });
    T('subst negatives', e.ok && req(e.val, r(13)));
    e = substEval('u + a*t', { u: r(20), a: r(-2), t: r(7) });
    T('subst formula', e.ok && req(e.val, r(6)));

    // checkQuestion: routes
    var v = chk(q535, ['5x - 15 = 35', '5x = 50', 'x = 10']);
    T('solve OK full marks', v.res === 'OK' && v.mk[0] === 2 && v.mk[1] === 1);
    v = chk(q535, ['x - 3 = 7', 'x = 10']);
    T('alternative route OK', v.res === 'OK' && v.mk[0] === 2);
    v = chk(q535, ['5x - 3 = 35', '5x = 38']);
    T('dx EXPAND_PARTIAL at line 1', v.res === 'X@1' && v.perLine[0].dx === 'EXPAND_PARTIAL');
    T('FT after the error', v.perLine[1].ok === 2);
    v = chk(q535, ['5x + 15 = 35']);
    T('dx EXPAND_SIGN', v.perLine[0].dx === 'EXPAND_SIGN');
    v = chk(q535, ['x = 10']);
    T('amber: answer no working', v.res === 'AMBER' && v.mk[0] === 0 && v.mk[1] === 1);
    var q1step = { id: 'q1s', type: 'solve', marks: [1, 1], start: 'x + 7 = 12', answer: { x: r(5) }, dx: {} };
    v = chk(q1step, ['x = 5']);
    T('one-step solo line IS working', v.res === 'OK' && v.mk[0] === 1 && v.mk[1] === 1);
    v = chk(q535, ['5x - 15 = 35', '5x !! 50', 'x = 10']);
    T('unread line flagged', v.perLine[1].note === 'unread line' && v.res === 'X@2');
    T('chain survives unread', v.perLine[2].ok === 2);
    v = chk(q535, ['5x - 15 = 35', '5x = 20', 'x = 4']);
    T('wrong value caught', v.res === 'X@2' && v.perLine[2].ok === 2 && v.mk[1] === 0);
    T('method partial credit', v.mk[0] >= 1);

    var q2 = { id: 'q2', type: 'solve', marks: [2, 1], start: '2x + 7 = 8x - 11', answer: { x: r(3) }, dx: {} };
    v = chk(q2, ['7 = 6x - 11', '18 = 6x', '3 = x', 'x = 3']);
    T('x both sides OK', v.res === 'OK');
    var q3 = { id: 'q3', type: 'solve', marks: [1, 1], start: '6x + 2 = -10', answer: { x: r(-2) }, dx: {} };
    v = chk(q3, ['6x = -12', 'x = -2']);
    T('negative answer OK', v.res === 'OK');
    var q4 = { id: 'q4', type: 'solve', marks: [2, 1], start: '6(x + 7) = 50', answer: { x: r(4, 3) }, dx: {} };
    v = chk(q4, ['6x + 42 = 50', '6x = 8', 'x = 8/6']);
    T('fraction answer OK', v.res === 'OK');

    var qf = { id: 'qf', type: 'form', marks: [2, 1], answer: { x: r(6) }, form: { accept: ['2x+36=48', '36+2x=48'] }, dx: {} };
    v = chk(qf, ['2x + 36 = 48', '2x = 12', 'x = 6']);
    T('form question OK', v.res === 'OK');
    v = chk(qf, ['2x + 18 = 48', '2x = 30', 'x = 15']);
    T('wrong formed equation', v.res === 'X@1');

    var qe = { id: 'qe', type: 'expand', marks: [1, 1], start: '4(x - 7)',
      answer: { canon: { c2: r(0), c1: r(4), c0: r(-28) } }, dx: { '4x-7': 'EXPAND_PARTIAL' } };
    v = chk(qe, ['4x - 28']);
    T('expand OK', v.res === 'OK');
    v = chk(qe, ['4x - 7']);
    T('expand dx', v.res === 'X@1' && v.perLine[0].dx === 'EXPAND_PARTIAL');
    v = chk(qe, ['4(x - 7)']);
    T('still-bracketed not finished', v.res !== 'OK');
    var qx = { id: 'qx', type: 'expand', marks: [1, 1], start: 'x(8 - x)',
      answer: { canon: { c2: r(-1), c1: r(8), c0: r(0) } }, dx: {} };
    v = chk(qx, ['8x - x²']);
    T('expand to x squared OK', v.res === 'OK');

    var qs = { id: 'qs', type: 'simplify', marks: [1, 1], start: '5x + 7 - 3x + 2',
      answer: { canon: { c2: r(0), c1: r(2), c0: r(9) } }, dx: {} };
    v = chk(qs, ['2x + 9']);
    T('simplify OK', v.res === 'OK');

    var qb = { id: 'qb', type: 'subst', marks: [1, 1], given: { a: r(4), b: r(7), c: r(3) },
      start: 'a(b - c)', answer: { val: r(16) }, dx: {} };
    v = chk(qb, ['4(7 - 3)', '4 * 4', '16']);
    T('subst OK with working', v.res === 'OK');
    v = chk(qb, ['16']);
    T('subst amber bare answer', v.res === 'AMBER');
    v = chk(qb, ['4 * 7 - 3', '25']);
    T('subst wrong (precedence slip)', v.res === 'X@1');

    // cluster keys
    T('cluster whitespace stable', clusterKey('5x-3=35') === clusterKey('5x - 3 = 35'));
    T('cluster scale stable', clusterKey('10x-6=70') === clusterKey('5x-3=35'));
    T('cluster distinguishes', clusterKey('5x-3=35') !== clusterKey('5x-15=35'));

    return { pass: failures.length === 0, count: n, failures: failures };
  }

  var API = {
    rat: rat, radd: radd, rsub: rsub, rmul: rmul, rdiv: rdiv, rneg: rneg,
    req: req, rfromstr: rfromstr, rtostr: rtostr,
    parse: parse, canonSide: canonSide, lineKind: lineKind,
    eqStep: eqStep, exprStep: exprStep, inferOp: inferOp,
    evalCalc: evalCalc, substEval: substEval,
    checkQuestion: checkQuestion, clusterKey: clusterKey, selfTest: selfTest
  };
  if (typeof window !== 'undefined') window.GJ_MATH = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
