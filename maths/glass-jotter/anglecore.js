/* The Glass Jotter - anglecore.js
   window.GJ_ANGLES: pure angle-chain marking engine. No DOM, no state.
   Marks a pupil's chain of angle steps against the question's authored
   derivation graph (see INTERFACES.md). GJ_MATH is only consulted for
   calc-string entries ("180-38-74"); everything else is standalone.
*/
(function (root) {
  'use strict';

  /* ---------- exact rationals ({n,d}, d>0, gcd 1) ---------- */

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }
  function norm(r) {
    var n = r.n, d = r.d;
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  // number | {n,d} -> normalised rational, else null.
  // Decimal degree values (67.5) are converted exactly via powers of ten.
  function ratFrom(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object' && typeof v.n === 'number' &&
        typeof v.d === 'number' && v.d !== 0) return norm(v);
    if (typeof v === 'number' && isFinite(v)) {
      var d = 1;
      while (Math.abs(v * d - Math.round(v * d)) > 1e-9 && d < 1e6) d *= 10;
      return norm({ n: Math.round(v * d), d: d });
    }
    return null;
  }
  function req(a, b) { return !!a && !!b && a.n === b.n && a.d === b.d; }
  function rsub(a, b) { return norm({ n: a.n * b.d - b.n * a.d, d: a.d * b.d }); }
  function rint(k) { return { n: k, d: 1 }; }

  /* ---------- rule arithmetic ----------
     The TRUE value of every angle comes from the authored diagram, so plain
     correctness is a value match. This table is only needed to (a) recompute
     a rule from the pupil's OWN earlier values for follow-through credit and
     (b) drive the misconception (dx) patterns. */

  var RULE = {
    STR:   { kind: 'sum', k: 180 }, // angles on a straight line
    PNT:   { kind: 'sum', k: 360 }, // angles at a point
    TRI:   { kind: 'sum', k: 180 }, // angles of a triangle
    QUAD:  { kind: 'sum', k: 360 }, // angles of a quadrilateral
    INT:   { kind: 'sum', k: 180 }, // interior / U-shape (co-interior)
    VOP:   { kind: 'eq' },          // vertically opposite
    ALT:   { kind: 'eq' },          // alternate (Z)
    COR:   { kind: 'eq' },          // corresponding (F)
    ISO:   { kind: 'eq' },          // isosceles base angles
    PGRAM: { kind: 'eq' },          // opposite angles of a parallelogram
    EQT:   { kind: 'const', k: 60 },// equilateral triangle
    GIVEN: { kind: 'given' }
  };
  var REASONS = ['STR', 'PNT', 'VOP', 'TRI', 'QUAD', 'ALT', 'COR', 'INT',
                 'ISO', 'PGRAM', 'EQT', 'GIVEN'];

  // What the rule yields when applied to the supplied from-values.
  function ruleExpected(rule, fromVals) {
    var r = RULE[rule];
    if (!r) return null;
    if (r.kind === 'const') return rint(r.k);
    if (r.kind === 'eq') return fromVals.length ? fromVals[0] : null;
    if (r.kind === 'sum') {
      if (!fromVals.length) return null;
      var acc = rint(r.k);
      for (var i = 0; i < fromVals.length; i++) acc = rsub(acc, fromVals[i]);
      return acc;
    }
    return null;
  }

  /* ---------- step value resolution ---------- */

  // Calc-string wins when GJ_MATH can evaluate it (it is the working the
  // pupil actually typed); the committed val is the fallback.
  function resolveVal(step) {
    var M = root.GJ_MATH;
    if (step.calc !== null && step.calc !== undefined &&
        M && typeof M.evalCalc === 'function') {
      var r = M.evalCalc(String(step.calc));
      if (r && r.ok && r.val) {
        var rv = ratFrom(r.val);
        if (rv) return rv;
      }
    }
    return ratFrom(step.val);
  }

  // q.target may be an angle id, the angle's label ('x'), or an array.
  function resolveTargets(q) {
    var t = q.target;
    if (t === null || t === undefined) return [];
    var list = Object.prototype.toString.call(t) === '[object Array]' ? t.slice() : [t];
    var angles = (q.diagram && q.diagram.angles) || {};
    var out = [], i, k, hit;
    for (i = 0; i < list.length; i++) {
      hit = null;
      if (angles[list[i]]) hit = list[i];
      else for (k in angles) {
        if (angles[k] && angles[k].label === list[i]) { hit = k; break; }
      }
      out.push(hit || list[i]); // unresolved id can never complete; the
    }                           // content build's verifyGraph flags it loudly
    return out;
  }

  /* ---------- misconception (dx) detection ---------- */

  // Authored q.dx value-pattern map. Keys: '142' (any angle) or 'EFD:142'
  // (that angle only, takes priority). Values may be '67.5' or '135/2'.
  function keyValEq(s, v) {
    var ix = s.indexOf('/'), r;
    if (ix > -1) r = ratFrom({ n: parseInt(s.slice(0, ix), 10), d: parseInt(s.slice(ix + 1), 10) });
    else r = ratFrom(parseFloat(s));
    return !!r && req(r, v);
  }
  function dxMapMatch(map, ang, v) {
    var bare = null, k, ix;
    for (k in map) {
      ix = k.indexOf(':');
      if (ix > -1) {
        if (k.slice(0, ix) === ang && keyValEq(k.slice(ix + 1), v)) return map[k];
      } else if (bare === null && keyValEq(k, v)) bare = map[k];
    }
    return bare;
  }

  function detectDx(q, st, v, tv, edges, trueValOf) {
    if (!v) return null;
    if (q.dx) {
      var hit = dxMapMatch(q.dx, st.ang, v);
      if (hit) return hit;
    }
    var e = edges && edges[0], i, j;
    if (e) {
      var fromTrue = [], all = true;
      for (i = 0; i < e.from.length; i++) {
        var t = trueValOf(e.from[i]);
        if (!t) { all = false; break; }
        fromTrue.push(t);
      }
      if (all && fromTrue.length) {
        if (st.rsn === 'TRI' || st.rsn === 'STR') {
          // used 360 where the rule sums to 180
          var acc = rint(360);
          for (i = 0; i < fromTrue.length; i++) acc = rsub(acc, fromTrue[i]);
          if (req(v, acc)) return st.rsn === 'TRI' ? 'TRI_SUM_360' : 'STRAIGHT_360';
        }
        if (st.rsn === 'VOP' && fromTrue.length === 1 &&
            req(v, rsub(rint(180), fromTrue[0]))) return 'VOP_SUPP';
        if (st.rsn === 'INT' && fromTrue.length === 1 &&
            req(v, fromTrue[0])) return 'COINT_EQUAL';
      }
    }
    if (st.rsn === 'ALT' || st.rsn === 'COR') {
      // matched the WRONG parallel-line partner: the value given belongs to
      // a different angle that takes part in an ALT/COR relation
      var g = q.graph || [];
      for (i = 0; i < g.length; i++) {
        if (g[i].rule !== 'ALT' && g[i].rule !== 'COR') continue;
        var ids = [g[i].find].concat(g[i].from || []);
        for (j = 0; j < ids.length; j++) {
          var t2 = trueValOf(ids[j]);
          if (t2 && !(tv && req(t2, tv)) && req(v, t2)) return 'ALT_CORR_SWAP';
        }
      }
    }
    return null;
  }

  /* ---------- the marker ---------- */

  function checkSteps(q, steps) {
    steps = steps || [];
    var marks = q.marks || [0, 0];
    var angles = (q.diagram && q.diagram.angles) || {};
    function trueValOf(id) { var a = angles[id]; return a ? ratFrom(a.value) : null; }

    var shown = {};      // ang -> true: given, or a value committed by an EARLIER step
    var pupil = {};      // ang -> the pupil's working value (right or wrong), for FT
    var byStepTrue = {}; // ang -> true: a pupil step established the TRUE value
    var k;
    for (k in angles) {
      if (angles[k] && angles[k].given) { shown[k] = true; pupil[k] = trueValOf(k); }
    }

    var perStep = [], methodUnits = 0, firstErr = 0, anyPreq = false;
    var i, j, f;

    for (i = 0; i < steps.length; i++) {
      var st = steps[i];
      var entry = { val: 0, rsn: 0, preq: false, dx: null };
      var v = resolveVal(st);
      var tv = trueValOf(st.ang);
      var valRight = !!(v && tv && req(v, tv));

      if (st.rsn === 'GIVEN') {
        // restating a given: reason valid iff the angle really is given;
        // never counts as a method step
        entry.rsn = (angles[st.ang] && angles[st.ang].given) ? 1 : 0;
        entry.val = valRight ? 1 : 0;
      } else {
        var edges = [], g = q.graph || [];
        for (j = 0; j < g.length; j++) {
          if (g[j].find === st.ang && g[j].rule === st.rsn) edges.push(g[j]);
        }
        // Best edge = fewest unshown prerequisites. 'shown' holds only the
        // givens plus EARLIER committed steps, so circular routes (the angle
        // itself, or angles only established later) fail here sequentially.
        var best = null, bestMiss = null;
        for (j = 0; j < edges.length; j++) {
          var miss = [];
          for (f = 0; f < edges[j].from.length; f++) {
            if (!shown[edges[j].from[f]]) miss.push(edges[j].from[f]);
          }
          if (!best || miss.length < bestMiss.length) { best = edges[j]; bestMiss = miss; }
          if (!bestMiss.length) break;
        }

        if (best && bestMiss.length === 0) {
          entry.rsn = 1; // authored edge, route fully shown
          if (valRight) entry.val = 1;
          else if (v) {
            // follow-through: the right rule applied faithfully to the
            // pupil's OWN earlier values earns a hollow val:2
            var fv = [], have = true;
            for (f = 0; f < best.from.length; f++) {
              if (!pupil[best.from[f]]) { have = false; break; }
              fv.push(pupil[best.from[f]]);
            }
            var exp = have ? ruleExpected(st.rsn, fv) : null;
            if (exp && req(v, exp)) entry.val = 2;
          }
        } else if (best && valRight) {
          // value right, route not shown yet: counted but flagged
          entry.rsn = 1;
          entry.val = 1;
          entry.preq = true;
          entry.preqMissing = bestMiss.slice();
          anyPreq = true;
        } else {
          // wrong rule for this angle (or right rule, neither value nor route)
          entry.rsn = 0;
          entry.val = valRight ? 1 : 0;
          if (valRight && (st.rsn === 'ALT' || st.rsn === 'COR') && !edges.length) {
            // right value, wrong family (said alternate, relation is
            // corresponding, or vice versa)
            var sib = st.rsn === 'ALT' ? 'COR' : 'ALT';
            for (j = 0; j < g.length; j++) {
              if (g[j].find === st.ang && g[j].rule === sib) { entry.dx = 'ALT_CORR_SWAP'; break; }
            }
          }
        }
        if (entry.val === 0 && !entry.dx) {
          entry.dx = detectDx(q, st, v, tv, edges, trueValOf);
        }
      }

      // Derived glyph code for the jotter's marking pass (same scale as
      // mathcore perLine.ok): 1 tick, 2 hollow follow-through, 0 cross.
      // A preq step is ok:1 - the AMBER result is what turns it amber.
      entry.ok = entry.val === 2 ? 2 : (entry.val === 1 && entry.rsn === 1) ? 1 : 0;

      if (v) { shown[st.ang] = true; pupil[st.ang] = v; }
      if (valRight) byStepTrue[st.ang] = true;
      if (entry.rsn === 1 && !entry.preq && st.rsn !== 'GIVEN' &&
          (entry.val === 1 || entry.val === 2)) methodUnits++;
      if (!firstErr && (entry.val === 0 || entry.rsn === 0)) firstErr = i + 1;
      perStep.push(entry);
    }

    var targets = resolveTargets(q);
    var complete = true;
    for (i = 0; i < targets.length; i++) if (!byStepTrue[targets[i]]) complete = false;

    var res;
    if (firstErr) res = 'X@' + firstErr;
    else if (!complete) res = 'X@' + (steps.length + 1); // no wrong line, chain stops short
    else res = anyPreq ? 'AMBER' : 'OK';

    // Marks: a fully-sound complete route earns full marks whatever its
    // length (any-valid-route). Otherwise method = one mark per sound
    // derivation step (FT included, preq-flagged and GIVEN restatements
    // excluded) capped at m; accuracy = a iff the target's true value was
    // established by a step.
    var m = marks[0] || 0, a = marks[1] || 0, mk;
    if (res === 'OK') mk = [m, a];
    else mk = [Math.min(m, methodUnits), complete ? a : 0];

    return { perStep: perStep, res: res, mk: mk, mkMax: [m, a] };
  }

  /* ---------- authoring-time graph verification ----------
     Used by the content build's self-test harness: every edge's arithmetic
     re-derived against the authored diagram values, arity checked, and the
     target proven reachable from the givens. */

  function verifyGraph(q) {
    var problems = [];
    var angles = (q.diagram && q.diagram.angles) || {};
    function tv(id) { var a = angles[id]; return a ? ratFrom(a.value) : null; }
    var ARITY = { STR: -1, PNT: -1, TRI: -1, QUAD: -1, INT: 1, VOP: 1,
                  ALT: 1, COR: 1, ISO: 1, PGRAM: 1, EQT: 0 };
    var g = q.graph || [], i, j;
    for (i = 0; i < g.length; i++) {
      var e = g[i];
      var tag = (q.id || '?') + ' edge#' + i + ' (' + e.rule + ' -> ' + e.find + ')';
      if (!RULE[e.rule] || e.rule === 'GIVEN') {
        problems.push(tag + ': unknown or illegal rule');
        continue;
      }
      if (!angles[e.find]) problems.push(tag + ': find angle missing from diagram');
      var ar = ARITY[e.rule], from = e.from || [];
      if (ar === 0 && from.length) problems.push(tag + ': EQT takes no from angles');
      if (ar === 1 && from.length !== 1) problems.push(tag + ': rule needs exactly one from angle');
      if (ar === -1 && !from.length) problems.push(tag + ': sum rule needs from angles');
      var fv = [], ok = true;
      for (j = 0; j < from.length; j++) {
        if (from[j] === e.find) problems.push(tag + ': from contains the angle itself');
        var t = tv(from[j]);
        if (!t) { problems.push(tag + ': from angle ' + from[j] + ' missing value'); ok = false; }
        else fv.push(t);
      }
      var exp = ok ? ruleExpected(e.rule, fv) : null;
      var want = tv(e.find);
      if (exp && want && !req(exp, want)) problems.push(tag + ': arithmetic mismatch');
    }
    // every target must be derivable from the givens via the edges
    var est = {}, k, grew = true;
    for (k in angles) if (angles[k] && angles[k].given) est[k] = true;
    while (grew) {
      grew = false;
      for (i = 0; i < g.length; i++) {
        if (est[g[i].find]) continue;
        var all = true, from2 = g[i].from || [];
        for (j = 0; j < from2.length; j++) if (!est[from2[j]]) { all = false; break; }
        if (all) { est[g[i].find] = true; grew = true; }
      }
    }
    var targets = resolveTargets(q);
    for (i = 0; i < targets.length; i++) {
      if (!est[targets[i]]) problems.push((q.id || '?') + ': target ' + targets[i] + ' not derivable from the givens');
    }
    return { ok: !problems.length, problems: problems };
  }

  /* ---------- selfTest ---------- */

  function selfTest() {
    var failures = [], count = 0;
    function T(name, cond) { count++; if (!cond) failures.push(name); }
    // perStep[i] matches {val, rsn, preq}?
    function S(r, i, val, rsn, preq) {
      var s = r.perStep[i];
      return !!s && s.val === val && s.rsn === rsn && !!s.preq === !!preq;
    }
    function MK(r, m, a) { return r.mk[0] === m && r.mk[1] === a; }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    var C = checkSteps;

    T('0 GJ_MATH present for calc-string cases',
      !!(root.GJ_MATH && typeof root.GJ_MATH.evalCalc === 'function'));

    /* Fixture A: straight line. AOB=110 given, BOC=70 (x). [1 method, 1 acc] */
    var qA = {
      id: 'qa', marks: [1, 1], target: 'x',
      diagram: { angles: { AOB: { value: 110, given: true }, BOC: { value: 70, label: 'x' } } },
      graph: [{ find: 'BOC', rule: 'STR', from: ['AOB'] },
              { find: 'AOB', rule: 'STR', from: ['BOC'] }]
    };
    var r = C(qA, [{ ang: 'BOC', val: 70, rsn: 'STR' }]);
    T('A1 correct single step OK', r.res === 'OK' && S(r, 0, 1, 1, false) && MK(r, 1, 1) && r.mkMax[0] === 1 && r.mkMax[1] === 1);
    T('A2 calc-string value', C(qA, [{ ang: 'BOC', calc: '180-110', rsn: 'STR' }]).res === 'OK');
    T('A3 unicode-minus calc', C(qA, [{ ang: 'BOC', calc: '180\u2212110', rsn: 'STR' }]).res === 'OK');
    T('A4 rational val {n,d}', C(qA, [{ ang: 'BOC', val: { n: 70, d: 1 }, rsn: 'STR' }]).res === 'OK');
    r = C(qA, [{ ang: 'BOC', val: 60, rsn: 'STR' }]);
    T('A5 wrong value X@1', r.res === 'X@1' && S(r, 0, 0, 1, false) && r.perStep[0].dx === null && MK(r, 0, 0));
    r = C(qA, [{ ang: 'BOC', val: 250, rsn: 'STR' }]);
    T('A6 STRAIGHT_360 dx', r.res === 'X@1' && r.perStep[0].dx === 'STRAIGHT_360');
    r = C(qA, [{ ang: 'BOC', val: 70, rsn: 'PNT' }]);
    T('A7 right value wrong rule', r.res === 'X@1' && S(r, 0, 1, 0, false) && r.perStep[0].dx === null && MK(r, 0, 1));
    r = C(qA, [{ ang: 'AOB', val: 110, rsn: 'GIVEN' }, { ang: 'BOC', val: 70, rsn: 'STR' }]);
    T('A8 GIVEN restate then solve', r.res === 'OK' && S(r, 0, 1, 1, false) && MK(r, 1, 1));
    r = C(qA, [{ ang: 'AOB', val: 100, rsn: 'GIVEN' }]);
    T('A9 GIVEN with wrong value', S(r, 0, 0, 1, false) && r.res === 'X@1');
    r = C(qA, [{ ang: 'BOC', val: 70, rsn: 'GIVEN' }]);
    T('A10 GIVEN on non-given angle', S(r, 0, 1, 0, false) && r.res === 'X@1');
    r = C(qA, []);
    T('A11 no steps', r.res === 'X@1' && r.perStep.length === 0 && MK(r, 0, 0));
    r = C(qA, [{ ang: 'ZZZ', val: 70, rsn: 'STR' }]);
    T('A12 unknown angle id safe', S(r, 0, 0, 0, false) && r.res === 'X@1');
    r = C(qA, [{ ang: 'BOC', val: 70, rsn: 'BANANA' }]);
    T('A13 unknown reason id safe', S(r, 0, 1, 0, false));
    T('A14 bad calc falls back to val', C(qA, [{ ang: 'BOC', calc: '180-', val: 70, rsn: 'STR' }]).res === 'OK');
    T('A15 calc wins over stale val', C(qA, [{ ang: 'BOC', calc: '180-110', val: 99, rsn: 'STR' }]).res === 'OK');
    var qA2 = clone(qA);
    qA2.dx = { '55': 'HALF_GIVEN', 'BOC:20': 'CUSTOM_20' };
    T('A16 authored dx bare key', C(qA2, [{ ang: 'BOC', val: 55, rsn: 'STR' }]).perStep[0].dx === 'HALF_GIVEN');
    T('A17 authored dx angle key', C(qA2, [{ ang: 'BOC', val: 20, rsn: 'STR' }]).perStep[0].dx === 'CUSTOM_20');

    /* Fixture B: vertically opposite cross. AOC=38 given; BOD=38, AOD=142,
       BOC=142 (target). Two distinct 2-step routes. [2,1] */
    var qB = {
      id: 'qb', marks: [2, 1], target: 'BOC',
      diagram: { angles: { AOC: { value: 38, given: true }, BOD: { value: 38 },
                           AOD: { value: 142 }, BOC: { value: 142 } } },
      graph: [{ find: 'BOD', rule: 'VOP', from: ['AOC'] },
              { find: 'AOD', rule: 'STR', from: ['AOC'] },
              { find: 'BOC', rule: 'VOP', from: ['AOD'] },
              { find: 'BOC', rule: 'STR', from: ['BOD'] },
              { find: 'AOD', rule: 'VOP', from: ['BOC'] }]
    };
    r = C(qB, [{ ang: 'AOD', val: 142, rsn: 'STR' }, { ang: 'BOC', val: 142, rsn: 'VOP' }]);
    T('B1 route via AOD', r.res === 'OK' && MK(r, 2, 1));
    r = C(qB, [{ ang: 'BOD', val: 38, rsn: 'VOP' }, { ang: 'BOC', calc: '180-38', rsn: 'STR' }]);
    T('B2 route via BOD (distinct)', r.res === 'OK' && MK(r, 2, 1));
    r = C(qB, [{ ang: 'BOC', val: 142, rsn: 'VOP' }]);
    T('B3 prerequisite flagged AMBER', r.res === 'AMBER' && S(r, 0, 1, 1, true) &&
      r.perStep[0].preqMissing.length === 1 && r.perStep[0].preqMissing[0] === 'AOD' && MK(r, 0, 1));
    r = C(qB, [{ ang: 'BOD', val: 142, rsn: 'VOP' }]);
    T('B4 VOP_SUPP dx', r.res === 'X@1' && S(r, 0, 0, 1, false) && r.perStep[0].dx === 'VOP_SUPP');
    r = C(qB, [{ ang: 'BOD', val: 48, rsn: 'VOP' }, { ang: 'BOC', calc: '180-48', rsn: 'STR' }]);
    T('B5 follow-through val:2', r.res === 'X@1' && S(r, 0, 0, 1, false) && S(r, 1, 2, 1, false) && MK(r, 1, 0));
    r = C(qB, [{ ang: 'BOC', val: 142, rsn: 'VOP' }, { ang: 'AOD', val: 142, rsn: 'VOP' }]);
    T('B6 circular order caught as preq', r.res === 'AMBER' && r.perStep[0].preq === true && S(r, 1, 1, 1, false));
    r = C(qB, [{ ang: 'BOD', val: 38, rsn: 'VOP' }, { ang: 'BOC', val: 100, rsn: 'STR' }]);
    T('B7 first-error index X@2', r.res === 'X@2' && S(r, 1, 0, 1, false) && MK(r, 1, 0));
    r = C(qB, [{ ang: 'BOD', rsn: 'VOP' }, { ang: 'BOC', val: 142, rsn: 'STR' }]);
    T('B8 valueless step never establishes', r.res === 'X@1' && S(r, 0, 0, 1, false) &&
      r.perStep[1].preq === true && r.perStep[1].preqMissing[0] === 'BOD');
    r = C(qB, [{ ang: 'BOD', val: 38, rsn: 'VOP' }, { ang: 'BOD', val: 38, rsn: 'VOP' },
               { ang: 'BOC', calc: '180-38', rsn: 'STR' }]);
    T('B9 restated step harmless', r.res === 'OK' && MK(r, 2, 1));

    /* Fixture C: triangle. A=38, B=74 given; C=68 (x). [1,1] */
    var qC = {
      id: 'qc', marks: [1, 1], target: 'C',
      diagram: { angles: { A: { value: 38, given: true }, B: { value: 74, given: true },
                           C: { value: 68, label: 'x' } } },
      graph: [{ find: 'C', rule: 'TRI', from: ['A', 'B'] }]
    };
    T('C1 triangle calc-string', C(qC, [{ ang: 'C', calc: '180-38-74', rsn: 'TRI' }]).res === 'OK');
    r = C(qC, [{ ang: 'C', val: 248, rsn: 'TRI' }]);
    T('C2 TRI_SUM_360 dx', r.res === 'X@1' && r.perStep[0].dx === 'TRI_SUM_360');
    r = C(qC, [{ ang: 'C', val: 72, rsn: 'TRI' }]);
    T('C3 plain arithmetic slip', r.res === 'X@1' && S(r, 0, 0, 1, false) && r.perStep[0].dx === null);
    T('C4 bracketed calc-string', C(qC, [{ ang: 'C', calc: '180-(38+74)', rsn: 'TRI' }]).res === 'OK');
    T('C5 wrong calc result', C(qC, [{ ang: 'C', calc: '180-38', rsn: 'TRI' }]).res === 'X@1');

    /* Fixture D: parallel lines. AEF=38 & GEB=38 given; EFD=38, EFC=142 (x).
       Routes: INT direct, ALT+STR, COR+STR. [2,1] */
    var qD = {
      id: 'qd', marks: [2, 1], target: 'EFC',
      diagram: { angles: { AEF: { value: 38, given: true }, GEB: { value: 38, given: true },
                           EFD: { value: 38 }, EFC: { value: 142, label: 'x' } } },
      graph: [{ find: 'EFD', rule: 'ALT', from: ['AEF'] },
              { find: 'EFD', rule: 'COR', from: ['GEB'] },
              { find: 'EFC', rule: 'INT', from: ['AEF'] },
              { find: 'EFC', rule: 'STR', from: ['EFD'] }]
    };
    r = C(qD, [{ ang: 'EFC', calc: '180-38', rsn: 'INT' }]);
    T('D1 one-step INT route, full marks', r.res === 'OK' && MK(r, 2, 1));
    r = C(qD, [{ ang: 'EFD', val: 38, rsn: 'ALT' }, { ang: 'EFC', calc: '180-38', rsn: 'STR' }]);
    T('D2 ALT then STR route', r.res === 'OK' && MK(r, 2, 1));
    r = C(qD, [{ ang: 'EFD', val: 38, rsn: 'COR' }, { ang: 'EFC', val: 142, rsn: 'STR' }]);
    T('D3 COR then STR route', r.res === 'OK' && MK(r, 2, 1));
    r = C(qD, [{ ang: 'EFC', val: 38, rsn: 'INT' }]);
    T('D4 COINT_EQUAL dx', r.res === 'X@1' && S(r, 0, 0, 1, false) && r.perStep[0].dx === 'COINT_EQUAL');
    r = C(qD, [{ ang: 'EFD', val: 142, rsn: 'ALT' }]);
    T('D5 ALT supplement is not swap dx', r.res === 'X@1' && S(r, 0, 0, 1, false) && r.perStep[0].dx === null);
    var qD2 = clone(qD);
    qD2.graph = [{ find: 'EFD', rule: 'ALT', from: ['AEF'] },
                 { find: 'EFC', rule: 'INT', from: ['AEF'] },
                 { find: 'EFC', rule: 'STR', from: ['EFD'] }];
    r = C(qD2, [{ ang: 'EFD', val: 38, rsn: 'COR' }]);
    T('D6 right value wrong family dx', r.res === 'X@1' && S(r, 0, 1, 0, false) && r.perStep[0].dx === 'ALT_CORR_SWAP');

    /* Fixture E: triangle between parallels (the 3-step composite with two
       distinct valid routes). PAB=38, QAC=74 given; BAC=68, ABC=38, ACB=74 (x). [2,1] */
    var qE = {
      id: 'qe', marks: [2, 1], target: 'ACB',
      diagram: { angles: { PAB: { value: 38, given: true }, QAC: { value: 74, given: true },
                           BAC: { value: 68 }, ABC: { value: 38 }, ACB: { value: 74, label: 'x' } } },
      graph: [{ find: 'BAC', rule: 'STR', from: ['PAB', 'QAC'] },
              { find: 'ABC', rule: 'ALT', from: ['PAB'] },
              { find: 'ACB', rule: 'ALT', from: ['QAC'] },
              { find: 'ACB', rule: 'TRI', from: ['BAC', 'ABC'] },
              { find: 'ABC', rule: 'TRI', from: ['BAC', 'ACB'] },
              { find: 'BAC', rule: 'TRI', from: ['ABC', 'ACB'] }]
    };
    r = C(qE, [{ ang: 'BAC', calc: '180-38-74', rsn: 'STR' },
               { ang: 'ABC', val: 38, rsn: 'ALT' },
               { ang: 'ACB', calc: '180-68-38', rsn: 'TRI' }]);
    T('E1 3-step composite route', r.res === 'OK' && MK(r, 2, 1) &&
      S(r, 0, 1, 1, false) && S(r, 1, 1, 1, false) && S(r, 2, 1, 1, false));
    r = C(qE, [{ ang: 'ACB', val: 74, rsn: 'ALT' }]);
    T('E2 1-step ALT route (distinct)', r.res === 'OK' && MK(r, 2, 1));
    r = C(qE, [{ ang: 'ABC', val: 38, rsn: 'ALT' },
               { ang: 'BAC', val: 68, rsn: 'STR' },
               { ang: 'ACB', val: 74, rsn: 'TRI' }]);
    T('E3 any establishment order', r.res === 'OK');
    r = C(qE, [{ ang: 'ACB', val: 74, rsn: 'TRI' },
               { ang: 'BAC', val: 68, rsn: 'STR' },
               { ang: 'ABC', val: 38, rsn: 'ALT' }]);
    T('E4 uses angles established after it', r.res === 'AMBER' && r.perStep[0].preq === true &&
      r.perStep[0].preqMissing.length === 2);
    r = C(qE, [{ ang: 'ABC', val: 74, rsn: 'ALT' }]);
    T('E5 ALT_CORR_SWAP wrong partner value', r.res === 'X@1' && S(r, 0, 0, 1, false) &&
      r.perStep[0].dx === 'ALT_CORR_SWAP');
    r = C(qE, [{ ang: 'BAC', val: 78, rsn: 'STR' },
               { ang: 'ABC', val: 38, rsn: 'ALT' },
               { ang: 'ACB', calc: '180-78-38', rsn: 'TRI' }]);
    T('E6 FT chain through 3 steps', r.res === 'X@1' && S(r, 0, 0, 1, false) &&
      S(r, 1, 1, 1, false) && S(r, 2, 2, 1, false) && MK(r, 2, 0));
    r = C(qE, [{ ang: 'BAC', val: 68, rsn: 'STR' },
               { ang: 'ABC', val: 38, rsn: 'STR' },
               { ang: 'ACB', calc: '180-68-38', rsn: 'TRI' }]);
    T('E7 wrong rule mid-chain X@2', r.res === 'X@2' && S(r, 1, 1, 0, false) && MK(r, 2, 1));
    r = C(qE, [{ ang: 'BAC', val: 68, rsn: 'STR' }, { ang: 'ABC', val: 38, rsn: 'ALT' }]);
    T('E8 sound but incomplete', r.res === 'X@3' && MK(r, 2, 0));

    /* Fixture F: point. AOB=120, BOC=130 given; COA=110. [1,1] */
    var qF = {
      id: 'qf', marks: [1, 1], target: 'COA',
      diagram: { angles: { AOB: { value: 120, given: true }, BOC: { value: 130, given: true },
                           COA: { value: 110 } } },
      graph: [{ find: 'COA', rule: 'PNT', from: ['AOB', 'BOC'] }]
    };
    T('F1 angles at a point calc', C(qF, [{ ang: 'COA', calc: '360-120-130', rsn: 'PNT' }]).res === 'OK');
    r = C(qF, [{ ang: 'COA', val: 100, rsn: 'PNT' }]);
    T('F2 point wrong value', r.res === 'X@1' && r.perStep[0].dx === null);

    /* Fixture G: isosceles. B=71 given; C=71 (ISO), A=38 (x). [2,1] */
    var qG = {
      id: 'qg', marks: [2, 1], target: 'A',
      diagram: { angles: { B: { value: 71, given: true }, C: { value: 71 },
                           A: { value: 38, label: 'x' } } },
      graph: [{ find: 'C', rule: 'ISO', from: ['B'] },
              { find: 'A', rule: 'TRI', from: ['B', 'C'] }]
    };
    r = C(qG, [{ ang: 'C', val: 71, rsn: 'ISO' }, { ang: 'A', calc: '180-71-71', rsn: 'TRI' }]);
    T('G1 isosceles route', r.res === 'OK' && MK(r, 2, 1));
    r = C(qG, [{ ang: 'C', val: 61, rsn: 'ISO' }, { ang: 'A', calc: '180-71-61', rsn: 'TRI' }]);
    T('G2 FT after wrong ISO value', r.res === 'X@1' && S(r, 1, 2, 1, false) && MK(r, 1, 0));

    /* Fixture H: equilateral, edge with empty from. [1,1] */
    var qH = {
      id: 'qh', marks: [1, 1], target: 'E1',
      diagram: { angles: { E1: { value: 60, label: 'x' } } },
      graph: [{ find: 'E1', rule: 'EQT', from: [] }]
    };
    T('H1 equilateral 60', C(qH, [{ ang: 'E1', val: 60, rsn: 'EQT' }]).res === 'OK');
    r = C(qH, [{ ang: 'E1', val: 90, rsn: 'EQT' }]);
    T('H2 equilateral wrong', r.res === 'X@1' && S(r, 0, 0, 1, false));

    /* Fixture I: parallelogram. P1=65 given; P2=115 (INT), P3=65 (PGRAM, x). [2,1] */
    var qI = {
      id: 'qi', marks: [2, 1], target: 'P3',
      diagram: { angles: { P1: { value: 65, given: true }, P2: { value: 115 },
                           P3: { value: 65, label: 'x' } } },
      graph: [{ find: 'P3', rule: 'PGRAM', from: ['P1'] },
              { find: 'P2', rule: 'INT', from: ['P1'] },
              { find: 'P3', rule: 'STR', from: ['P2'] }]
    };
    T('I1 PGRAM opposite angle', C(qI, [{ ang: 'P3', val: 65, rsn: 'PGRAM' }]).res === 'OK');
    r = C(qI, [{ ang: 'P2', calc: '180-65', rsn: 'INT' }, { ang: 'P3', calc: '180-115', rsn: 'STR' }]);
    T('I2 PGRAM long route', r.res === 'OK' && MK(r, 2, 1));
    r = C(qI, [{ ang: 'P2', val: 65, rsn: 'INT' }]);
    T('I3 COINT_EQUAL in pgram', r.res === 'X@1' && r.perStep[0].dx === 'COINT_EQUAL');

    /* Fixture J: quadrilateral. 85, 95, 100 given; D4=80 (x). [1,1] */
    var qJ = {
      id: 'qj', marks: [1, 1], target: 'D4',
      diagram: { angles: { A4: { value: 85, given: true }, B4: { value: 95, given: true },
                           C4: { value: 100, given: true }, D4: { value: 80, label: 'x' } } },
      graph: [{ find: 'D4', rule: 'QUAD', from: ['A4', 'B4', 'C4'] }]
    };
    T('J1 quadrilateral calc', C(qJ, [{ ang: 'D4', calc: '360-85-95-100', rsn: 'QUAD' }]).res === 'OK');
    T('J2 quadrilateral rational val', C(qJ, [{ ang: 'D4', val: { n: 80, d: 1 }, rsn: 'QUAD' }]).res === 'OK');
    T('J3 quadrilateral wrong', C(qJ, [{ ang: 'D4', val: 90, rsn: 'QUAD' }]).res === 'X@1');

    /* Fixture K: non-integer degrees. K1=112.5 given; K2=67.5 (x). [1,1] */
    var qK = {
      id: 'qk', marks: [1, 1], target: 'K2',
      diagram: { angles: { K1: { value: 112.5, given: true }, K2: { value: 67.5, label: 'x' } } },
      graph: [{ find: 'K2', rule: 'STR', from: ['K1'] }]
    };
    T('K1 decimal number val', C(qK, [{ ang: 'K2', val: 67.5, rsn: 'STR' }]).res === 'OK');
    T('K2 exact rational val 135/2', C(qK, [{ ang: 'K2', val: { n: 135, d: 2 }, rsn: 'STR' }]).res === 'OK');
    T('K3 decimal calc-string', C(qK, [{ ang: 'K2', calc: '180-112.5', rsn: 'STR' }]).res === 'OK');
    T('K4 near-miss decimal rejected', C(qK, [{ ang: 'K2', val: 67, rsn: 'STR' }]).res === 'X@1');

    /* Fixture L: pathological self-referencing edge (circular). */
    var qL = {
      id: 'ql', marks: [1, 1], target: 'L1',
      diagram: { angles: { L1: { value: 50 }, L2: { value: 130, given: true } } },
      graph: [{ find: 'L1', rule: 'VOP', from: ['L1'] },
              { find: 'L1', rule: 'STR', from: ['L2'] }]
    };
    r = C(qL, [{ ang: 'L1', val: 50, rsn: 'VOP' }]);
    T('L1 from includes the angle itself', r.res !== 'OK' && r.perStep[0].preq === true &&
      r.perStep[0].preqMissing[0] === 'L1');
    T('L2 honest route still OK', C(qL, [{ ang: 'L1', val: 50, rsn: 'STR' }]).res === 'OK');

    /* Derived perStep.ok glyph code (consumed by jotter.js drawMark) */
    r = C(qA, [{ ang: 'BOC', val: 70, rsn: 'STR' }]);
    T('OK1 sound step ok:1', r.perStep[0].ok === 1);
    r = C(qA, [{ ang: 'BOC', val: 60, rsn: 'STR' }]);
    T('OK2 wrong value ok:0', r.perStep[0].ok === 0);
    r = C(qA, [{ ang: 'BOC', val: 70, rsn: 'PNT' }]);
    T('OK3 right value wrong rule ok:0', r.perStep[0].ok === 0);
    r = C(qB, [{ ang: 'BOD', val: 48, rsn: 'VOP' }, { ang: 'BOC', calc: '180-48', rsn: 'STR' }]);
    T('OK4 FT step ok:2', r.perStep[0].ok === 0 && r.perStep[1].ok === 2);
    r = C(qB, [{ ang: 'BOC', val: 142, rsn: 'VOP' }]);
    T('OK5 preq step ok:1 under AMBER', r.res === 'AMBER' && r.perStep[0].ok === 1);

    /* verifyGraph (authoring harness) */
    T('V1 sound graph verifies', verifyGraph(qE).ok === true);
    var qBad = clone(qC);
    qBad.diagram.angles.C.value = 70; // 180-38-74 = 68, not 70
    T('V2 arithmetic mismatch caught', verifyGraph(qBad).ok === false);
    var qUn = clone(qA);
    qUn.graph = [{ find: 'BOC', rule: 'STR', from: ['NOPE'] }];
    T('V3 unreachable target caught', verifyGraph(qUn).ok === false);

    return { pass: failures.length === 0, failures: failures, count: count };
  }

  root.GJ_ANGLES = {
    REASONS: REASONS,
    checkSteps: checkSteps,
    verifyGraph: verifyGraph,
    selfTest: selfTest
  };

})(typeof window !== 'undefined' ? window :
   typeof globalThis !== 'undefined' ? globalThis : this);
