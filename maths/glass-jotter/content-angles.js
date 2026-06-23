/* The Glass Jotter — Angles content pack (CCEA M2, J3 revision).
   Source: Mary McElroy's WALTs + MEP Y8 Practice Book A ch.11 (11.1 Angle
   Measures, 11.2 Parallel and Intersecting Lines). The teacher's WALT
   wording is used for the interior/U-shape rule.

   Geometry is computed, not sketched: every ray endpoint is constructed
   by angle, so the drawn figure genuinely subtends the stated values —
   dev/lint-content-angles.js re-measures every angle from the coordinates
   and re-derives every graph edge with GJ_ANGLES.verifyGraph. */
(function () {
  'use strict';

  /* deg measured anticlockwise from "east", y-up (screen y flipped) */
  function ray(v, deg, len) {
    var r = deg * Math.PI / 180;
    return [round2(v[0] + len * Math.cos(r)), round2(v[1] - len * Math.sin(r))];
  }
  function round2(x) { return Math.round(x * 100) / 100; }

  /* ── the eight-angle parallel-lines template ──────────────────────
     Two horizontal parallel lines crossed by a transversal of acute
     angle alpha. Angle slots (e at upper crossing E, f at lower F):
       e1 right/above · e2 left/above · e3 left/below (interior)
       e4 right/below (interior) · f1 right/above (interior)
       f2 left/above (interior) · f3 left/below · f4 right/below
     include = {slot: {id, label?, given?}}; target = id; the generator
     emits every TRUE edge among the included angles (VOP, COR, ALT,
     INT, STR-with-neighbours), so any legitimate route is accepted.  */
  function parallelQ(alpha, include, opts) {
    var yTop = opts.yTop || 20, yBot = opts.yBot || 52;
    var E = [opts.ex || 60, yTop];
    var run = (yBot - yTop) / Math.tan(alpha * Math.PI / 180);
    var F = [round2(E[0] - run), yBot];
    var T = ray(E, alpha, opts.stub || 13);
    var U = ray(F, 180 + alpha, opts.stub || 13);
    var pts = {
      E: E, F: F, _T: T, _U: U,
      _EL: [Math.min(10, F[0] - 8), yTop], _ER: [96, yTop],
      _FL: [Math.min(6, F[0] - 12), yBot], _FR: [90, yBot]
    };
    var segs = [
      { id: 'top', from: '_EL', to: '_ER', par: 1 },
      { id: 'bottom', from: '_FL', to: '_FR', par: 1 },
      { id: 'trans', from: '_T', to: '_U' }
    ];
    var defs = {
      e1: { at: 'E', from: '_ER', to: '_T', value: alpha },
      e2: { at: 'E', from: '_T', to: '_EL', value: 180 - alpha },
      e3: { at: 'E', from: '_EL', to: 'F', value: alpha },
      e4: { at: 'E', from: 'F', to: '_ER', value: 180 - alpha },
      f1: { at: 'F', from: '_FR', to: 'E', value: alpha },
      f2: { at: 'F', from: 'E', to: '_FL', value: 180 - alpha },
      f3: { at: 'F', from: '_FL', to: '_U', value: alpha },
      f4: { at: 'F', from: '_U', to: '_FR', value: 180 - alpha }
    };
    var angles = {}, slotOf = {};
    Object.keys(include).forEach(function (slot) {
      var spec = include[slot];
      var d = defs[slot];
      angles[spec.id] = {
        at: d.at, from: d.from, to: d.to, value: d.value,
        given: !!spec.given, label: spec.given ? undefined : (spec.label || spec.id)
      };
      slotOf[slot] = spec.id;
    });
    var EQ = { VOP: [['e1', 'e3'], ['e2', 'e4'], ['f1', 'f3'], ['f2', 'f4']],
               COR: [['e1', 'f1'], ['e2', 'f2'], ['e3', 'f3'], ['e4', 'f4']],
               ALT: [['e3', 'f1'], ['e4', 'f2']] };
    var SUM = { INT: [['e3', 'f2'], ['e4', 'f1']],
                STR: [['e1', 'e2'], ['e2', 'e3'], ['e3', 'e4'], ['e4', 'e1'],
                      ['f1', 'f2'], ['f2', 'f3'], ['f3', 'f4'], ['f4', 'f1']] };
    var graph = [];
    function pairEdges(rule, pairs) {
      pairs.forEach(function (pr) {
        var a = slotOf[pr[0]], b = slotOf[pr[1]];
        if (!a || !b) return;
        if (!angles[a].given) graph.push({ find: a, rule: rule, from: [b] });
        if (!angles[b].given) graph.push({ find: b, rule: rule, from: [a] });
      });
    }
    pairEdges('VOP', EQ.VOP); pairEdges('COR', EQ.COR); pairEdges('ALT', EQ.ALT);
    pairEdges('INT', SUM.INT); pairEdges('STR', SUM.STR);
    return { diagram: { w: 100, h: 64, pts: pts, segs: segs, angles: angles }, graph: graph };
  }

  /* ── small diagram builders ───────────────────────────────────────── */
  function lineFig(V, rays, lineDeg, lineLen) {
    /* a straight line through V (at lineDeg) plus extra rays; returns pts+segs */
    var pts = { V: V }, segs = [];
    var a = ray(V, lineDeg, lineLen), b = ray(V, lineDeg + 180, lineLen);
    pts._P = b; pts._Q = a;
    segs.push({ id: 'line', from: '_P', to: '_Q' });
    rays.forEach(function (r, i) {
      var nm = '_R' + (i + 1);
      pts[nm] = ray(V, r, lineLen * 0.62);
      segs.push({ id: 'ray' + (i + 1), from: 'V', to: nm });
    });
    return { pts: pts, segs: segs };
  }

  var REASON_BANK = [
    { id: 'STR', group: 'Lines & points', text: 'Angles on a straight line add up to 180°' },
    { id: 'PNT', group: 'Lines & points', text: 'Angles at a point add up to 360°' },
    { id: 'VOP', group: 'Lines & points', text: 'Vertically opposite angles are equal' },
    { id: 'TRI', group: 'Triangles & quadrilaterals', text: 'Angles in a triangle add up to 180°' },
    { id: 'QUAD', group: 'Triangles & quadrilaterals', text: 'Angles in a quadrilateral add up to 360°' },
    { id: 'ISO', group: 'Triangles & quadrilaterals', text: 'Base angles of an isosceles triangle are equal' },
    { id: 'EQT', group: 'Triangles & quadrilaterals', text: 'Each angle in an equilateral triangle is 60°' },
    { id: 'ALT', group: 'Parallel lines', text: 'Alternate angles are equal (Z shape)' },
    { id: 'COR', group: 'Parallel lines', text: 'Corresponding angles are equal (F shape)' },
    { id: 'INT', group: 'Parallel lines', text: 'Interior angles add up to 180° (U shape)' },
    { id: 'PGRAM', group: 'Special shapes', text: 'Opposite angles of a parallelogram are equal' }
  ];

  /* ════ Section 1 — Know your angles (classify) ════════════════════ */
  function classifyFig(deg1, deg2, value, reflex) {
    var V = [30, 28];
    var pts = { V: V, _A: ray(V, deg1, 21), _B: ray(V, deg2, 21) };
    var ang = { at: 'V', from: '_A', to: '_B', value: value };
    if (reflex) ang.reflex = true;
    return { w: 60, h: 48, pts: pts, segs: [
      { id: 's1', from: 'V', to: '_A' }, { id: 's2', from: 'V', to: '_B' }
    ], angles: { T: ang } };
  }
  var CLASSIFY_OPTS = ['acute', 'right', 'obtuse', 'reflex', 'straight'];

  var s1 = {
    id: 's1', title: 'Know your angles',
    walt: 'Identify and measure acute, obtuse and reflex angles accurately.',
    movie: {
      title: 'The six types of angle', mode: 'diagram', deferred: true,
      diagram: (function () {
        var pts = {}, segs = [], angles = {};
        function fig(n, V, d1, d2, val, reflex, right) {
          pts['_a' + n] = ray(V, d1, right ? 12 : 11);
          pts['_b' + n] = ray(V, d2, right ? 12 : 11);
          pts['V' + n] = V;
          segs.push({ id: 'f' + n + 'a', from: 'V' + n, to: '_a' + n });
          segs.push({ id: 'f' + n + 'b', from: 'V' + n, to: '_b' + n });
          angles['t' + n] = { at: 'V' + n, from: '_a' + n, to: '_b' + n, value: val, given: true };
          if (reflex) angles['t' + n].reflex = true;
        }
        fig(1, [13, 26], 5, 40, 35);
        fig(2, [38, 26], 0, 90, 90, false, true);
        fig(3, [62, 26], 10, 140, 130);
        fig(4, [86, 27], 8, 188, 180);
        fig(5, [38, 52], 75, 130, 305, true);
        return { w: 100, h: 62, labelled: false, pts: pts, segs: segs, angles: angles };
      })(),
      steps: [
        { say: 'Angles measure turn, in degrees. Watch each type draw itself — sizes matter, names matter.', do: [{ seg: { id: 'f1a' } }, { seg: { id: 'f1b' } }] },
        { say: 'ACUTE — less than 90°. Sharp, like an open scissors blade.', do: [{ arc: { ang: 't1' } }] },
        { say: 'RIGHT ANGLE — exactly 90°. We mark it with a small square, never an arc.', do: [{ seg: { id: 'f2a' } }, { seg: { id: 'f2b' } }, { arc: { ang: 't2' } }] },
        { say: 'OBTUSE — between 90° and 180°. Wider than the square, not yet flat.', do: [{ seg: { id: 'f3a' } }, { seg: { id: 'f3b' } }, { arc: { ang: 't3' } }] },
        { say: 'STRAIGHT LINE — exactly 180°. Half a full turn.', do: [{ seg: { id: 'f4a' } }, { seg: { id: 'f4b' } }, { arc: { ang: 't4' } }] },
        { say: 'REFLEX — more than 180°. The arc sweeps the long way round.', do: [{ seg: { id: 'f5a' } }, { seg: { id: 'f5b' } }, { arc: { ang: 't5' } }] },
        { say: 'A full turn is 360°. Every angle fact you revise today comes from 180° and 360°.', do: [{ stamp: { text: 'Half turn 180° · Full turn 360°' } }] }
      ]
    },
    questions: [
      { id: 'c1', kind: 'classify', marks: [0, 1], classify: 'acute', options: CLASSIFY_OPTS,
        prompt: 'Look at the size of the marked angle. What type of angle is it?', diagram: classifyFig(5, 40, 35) },
      { id: 'c2', kind: 'classify', marks: [0, 1], classify: 'obtuse', options: CLASSIFY_OPTS,
        prompt: 'What type of angle is marked at V?', diagram: classifyFig(10, 140, 130) },
      { id: 'c3', kind: 'classify', marks: [0, 1], classify: 'reflex', options: CLASSIFY_OPTS,
        prompt: 'Careful — look at which way the arc sweeps. What type of angle is marked?', diagram: classifyFig(75, 130, 305, true) },
      { id: 'c4', kind: 'classify', marks: [0, 1], classify: 'straight', options: CLASSIFY_OPTS,
        prompt: 'What type of angle is marked at V?', diagram: classifyFig(12, 192, 180) },
      { id: 'm1', kind: 'protractor', marks: [0, 1], value: 115, tol: 3, armDeg: 22,
        vertex: [248, 206], armLen: 132,
        prompt: 'Measure the angle with the protractor. Drag it onto the corner, line the zero line up with one arm, then read the size off the scale and type it.' },
      { id: 'm2', kind: 'protractor', marks: [0, 1], value: 50, tol: 3, armDeg: 12,
        vertex: [248, 206], armLen: 132,
        prompt: 'Now measure this one. Remember to use the scale that starts at 0 on the arm you lined up.' }
    ]
  };

  /* ════ Section 2 — Straight lines and full turns ══════════════════ */
  function q5() {
    var V = [50, 36];
    var pts = { V: V, P: [8, 36], Q: [92, 36], _R: ray(V, 56, 28) };
    return {
      id: 'q5', marks: [1, 1], target: 'a',
      prompt: 'PVQ is a straight line. Work out the size of angle a. Give a reason for your answer.',
      diagram: { w: 100, h: 50, pts: pts, segs: [
        { id: 'line', from: 'P', to: 'Q' }, { id: 'ray', from: 'V', to: '_R' }
      ], angles: {
        PVR: { at: 'V', from: 'P', to: '_R', value: 124, given: true },
        a: { at: 'V', from: '_R', to: 'Q', value: 56, label: 'a' }
      } },
      graph: [{ find: 'a', rule: 'STR', from: ['PVR'] }]
    };
  }
  function q6() {
    var V = [50, 38];
    var pts = { V: V, _P: [8, 38], _Q: [92, 38], _S: ray(V, 143, 26), _R: ray(V, 53, 26) };
    return {
      id: 'q6', marks: [1, 1], target: 'b',
      prompt: 'The line is straight and the square marks a right angle. Work out angle b. Give a reason.',
      diagram: { w: 100, h: 50, pts: pts, segs: [
        { id: 'line', from: '_P', to: '_Q' },
        { id: 'r1', from: 'V', to: '_S' }, { id: 'r2', from: 'V', to: '_R' }
      ], angles: {
        g37: { at: 'V', from: '_P', to: '_S', value: 37, given: true },
        g90: { at: 'V', from: '_S', to: '_R', value: 90, given: true },
        b: { at: 'V', from: '_R', to: '_Q', value: 53, label: 'b' }
      } },
      graph: [{ find: 'b', rule: 'STR', from: ['g37', 'g90'] }]
    };
  }
  function q7() {
    var V = [50, 28];
    var pts = { V: V, _A: ray(V, 70, 22), _B: ray(V, 200, 22), _C: ray(V, 350, 22) };
    return {
      id: 'q7', marks: [1, 1], target: 'c',
      prompt: 'Three angles meet at a point. Work out the size of angle c. Give a reason.',
      diagram: { w: 100, h: 56, pts: pts, segs: [
        { id: 'r1', from: 'V', to: '_A' }, { id: 'r2', from: 'V', to: '_B' }, { id: 'r3', from: 'V', to: '_C' }
      ], angles: {
        AVB: { at: 'V', from: '_A', to: '_B', value: 130, given: true },
        BVC: { at: 'V', from: '_B', to: '_C', value: 150, given: true },
        c: { at: 'V', from: '_C', to: '_A', value: 80, label: 'c' }
      } },
      graph: [{ find: 'c', rule: 'PNT', from: ['AVB', 'BVC'] }]
    };
  }
  function q8() {
    var V = [50, 28];
    var pts = { V: V, _A: ray(V, 60, 22), _B: ray(V, 140, 22) };
    return {
      id: 'q8', marks: [1, 1], target: 'd',
      prompt: 'The reflex angle shown is 280°. Work out the size of angle d. Give a reason.',
      diagram: { w: 100, h: 56, pts: pts, segs: [
        { id: 'r1', from: 'V', to: '_A' }, { id: 'r2', from: 'V', to: '_B' }
      ], angles: {
        refl: { at: 'V', from: '_B', to: '_A', value: 280, given: true, reflex: true },
        d: { at: 'V', from: '_A', to: '_B', value: 80, label: 'd' }
      } },
      graph: [{ find: 'd', rule: 'PNT', from: ['refl'] }]
    };
  }
  var s2 = {
    id: 's2', title: 'Straight lines and full turns',
    walt: 'Angles on a straight line total 180°. Angles at a point total 360°.',
    movie: {
      title: 'On the line, round the point', mode: 'diagram', deferred: true,
      diagram: (function () {
        var V1 = [28, 30], V2 = [76, 30];
        var pts = {
          V1: V1, _P: [6, 30], _Q: [50, 30], _R: ray(V1, 62, 18),
          V2: V2, _A: ray(V2, 80, 16), _B: ray(V2, 210, 16), _C: ray(V2, 320, 16)
        };
        return { w: 100, h: 60, labelled: false, pts: pts, segs: [
          { id: 'line', from: '_P', to: '_Q' }, { id: 'ray', from: 'V1', to: '_R' },
          { id: 'p1', from: 'V2', to: '_A' }, { id: 'p2', from: 'V2', to: '_B' }, { id: 'p3', from: 'V2', to: '_C' }
        ], angles: {
          g: { at: 'V1', from: '_P', to: '_R', value: 118, given: true },
          u: { at: 'V1', from: '_R', to: '_Q', value: 62 },
          p1: { at: 'V2', from: '_A', to: '_B', value: 130, given: true },
          p2: { at: 'V2', from: '_B', to: '_C', value: 110, given: true },
          p3: { at: 'V2', from: '_C', to: '_A', value: 120 }
        } };
      })(),
      steps: [
        { say: 'A straight line is half a turn — 180°. Two angles on it must share the 180 between them.', do: [{ seg: { id: 'line' } }, { seg: { id: 'ray' } }, { arc: { ang: 'g' } }] },
        { say: 'One angle is 118°. So its partner is 180° − 118°.', do: [{ arc: { ang: 'u' } }, { stamp: { reason: 'STR' } }] },
        { say: '180 − 118 = 62. Watch it count up — and notice the working IS the line we wrote.', do: [{ value: { ang: 'u', to: 62 } }] },
        { say: 'Round a point is a FULL turn — 360°. Here two of the three angles are known.', do: [{ seg: { id: 'p1' } }, { seg: { id: 'p2' } }, { seg: { id: 'p3' } }, { arc: { ang: 'p1' } }, { arc: { ang: 'p2' } }] },
        { say: '360 − 130 − 110 leaves the missing angle.', do: [{ arc: { ang: 'p3' } }, { stamp: { reason: 'PNT' } }] },
        { say: '360 − 130 − 110 = 120. In your jotter you will type the calculation — that counts as working.', do: [{ value: { ang: 'p3', to: 120 } }] },
        { say: 'Good habit: always NAME the rule — the reason earns its own mark.', do: [{ note: { text: 'Reason = a mark. Every time.', red: true } }] }
      ]
    },
    questions: [q5(), q6(), q7(), q8()]
  };

  /* ════ Section 3 — Crossing lines ═════════════════════════════════ */
  function q9() {
    var O = [50, 28];
    var pts = { O: O, _A: ray(O, 20, 34), _C: ray(O, 200, 34), _B: ray(O, 84, 26), _D: ray(O, 264, 26) };
    return {
      id: 'q9', marks: [1, 1], target: 'p',
      prompt: 'Two straight lines cross at O. Work out the size of angle p. Give a reason.',
      diagram: { w: 100, h: 56, pts: pts, segs: [
        { id: 'l1', from: '_A', to: '_C' }, { id: 'l2', from: '_B', to: '_D' }
      ], angles: {
        AOB: { at: 'O', from: '_A', to: '_B', value: 64, given: true },
        p: { at: 'O', from: '_C', to: '_D', value: 64, label: 'p' }
      } },
      graph: [{ find: 'p', rule: 'VOP', from: ['AOB'] }]
    };
  }
  function q10() {
    var O = [50, 28];
    var pts = { O: O, _A: ray(O, 10, 34), _C: ray(O, 190, 34), _B: ray(O, 72, 26), _D: ray(O, 252, 26) };
    return {
      id: 'q10', marks: [2, 1], target: 'q',
      prompt: 'Two straight lines cross at O. Work out the size of angle q. Give a reason for each step.',
      diagram: { w: 100, h: 56, pts: pts, segs: [
        { id: 'l1', from: '_A', to: '_C' }, { id: 'l2', from: '_B', to: '_D' }
      ], angles: {
        G: { at: 'O', from: '_B', to: '_C', value: 118, given: true },
        m: { at: 'O', from: '_A', to: '_B', value: 62, label: 'm' },
        q: { at: 'O', from: '_C', to: '_D', value: 62, label: 'q' }
      } },
      graph: [
        { find: 'm', rule: 'STR', from: ['G'] },
        { find: 'q', rule: 'VOP', from: ['m'] },
        { find: 'q', rule: 'STR', from: ['G'] },
        { find: 'm', rule: 'VOP', from: ['q'] }
      ],
      dx: { 'q:118': 'VOP_SUPP' }
    };
  }
  function q11() {
    var O = [50, 28];
    var pts = { O: O, _A: [86, 28], _D: [14, 28],
      _B: ray(O, 40, 30), _E: ray(O, 220, 30), _C: ray(O, 105, 26), _F: ray(O, 285, 26) };
    return {
      id: 'q11', marks: [2, 1], target: 'f',
      prompt: 'Three straight lines cross at O. Work out the size of angle f. Give a reason for each step.',
      diagram: { w: 100, h: 56, pts: pts, segs: [
        { id: 'l1', from: '_D', to: '_A' }, { id: 'l2', from: '_E', to: '_B' }, { id: 'l3', from: '_F', to: '_C' }
      ], angles: {
        g1: { at: 'O', from: '_A', to: '_B', value: 40, given: true },
        g2: { at: 'O', from: '_B', to: '_C', value: 65, given: true },
        e: { at: 'O', from: '_C', to: '_D', value: 75, label: 'e' },
        m: { at: 'O', from: '_D', to: '_E', value: 40, label: 'm' },
        n: { at: 'O', from: '_E', to: '_F', value: 65, label: 'n' },
        f: { at: 'O', from: '_F', to: '_A', value: 75, label: 'f' }
      } },
      graph: [
        { find: 'e', rule: 'STR', from: ['g1', 'g2'] },
        { find: 'f', rule: 'VOP', from: ['e'] },
        { find: 'e', rule: 'VOP', from: ['f'] },
        { find: 'm', rule: 'VOP', from: ['g1'] },
        { find: 'n', rule: 'VOP', from: ['g2'] },
        { find: 'f', rule: 'STR', from: ['m', 'n'] },
        { find: 'f', rule: 'STR', from: ['g1', 'g2'] },
        { find: 'e', rule: 'STR', from: ['m', 'n'] }
      ]
    };
  }
  var s3 = {
    id: 's3', title: 'Crossing lines',
    walt: 'Recognise that vertically opposite angles are equal.',
    movie: {
      title: 'The X never lies', mode: 'diagram', deferred: true,
      diagram: (function () {
        var O = [50, 28];
        return { w: 100, h: 58, labelled: false, pts: {
          O: O, _A: ray(O, 15, 30), _C: ray(O, 195, 30), _B: ray(O, 85, 24), _D: ray(O, 265, 24)
        }, segs: [
          { id: 'l1', from: '_A', to: '_C' }, { id: 'l2', from: '_B', to: '_D' }
        ], angles: {
          k1: { at: 'O', from: '_A', to: '_B', value: 70, given: true },
          k2: { at: 'O', from: '_B', to: '_C', value: 110 },
          k3: { at: 'O', from: '_C', to: '_D', value: 70 },
          k4: { at: 'O', from: '_D', to: '_A', value: 110 }
        } };
      })(),
      steps: [
        { say: 'Two straight lines cross. Four angles appear — and they come in matching pairs.', do: [{ seg: { id: 'l1' } }, { seg: { id: 'l2' } }, { arc: { ang: 'k1' } }] },
        { say: 'The angle OPPOSITE the 70° — through the X — is its vertically opposite twin.', do: [{ arc: { ang: 'k3' } }, { pulse: { ang: 'k1' } }, { pulse: { ang: 'k3' } }] },
        { say: 'Vertically opposite angles are EQUAL. No arithmetic needed — that is the whole rule.', do: [{ value: { ang: 'k3', to: 70 } }, { stamp: { reason: 'VOP' } }] },
        { say: 'The angle BESIDE the 70° sits with it on a straight line.', do: [{ pulse: { ang: 'k1', on: false } }, { pulse: { ang: 'k3', on: false } }, { arc: { ang: 'k2' } }] },
        { say: '180 − 70 = 110. Two rules, four angles, all found from one given.', do: [{ value: { ang: 'k2', to: 110 } }, { stamp: { reason: 'STR' } }] },
        { say: 'Last one yourself: the angle opposite the 110°. Say the value, then watch.', do: [{ arc: { ang: 'k4' } }] },
        { say: '110 — vertically opposite. In the exercise, every step needs its reason chosen.', do: [{ value: { ang: 'k4', to: 110 } }] }
      ]
    },
    questions: [q9(), q10(), q11()]
  };

  /* ════ Section 4 — Triangles and quadrilaterals ═══════════════════ */
  function q12() {
    return {
      id: 'q12', marks: [1, 1], target: 't',
      prompt: 'Work out the size of angle t in the triangle. Give a reason.',
      diagram: { w: 100, h: 60, pts: { A: [15, 52], B: [85, 52], C: [72.19, 7.31] }, segs: [
        { id: 'ab', from: 'A', to: 'B' }, { id: 'ac', from: 'A', to: 'C' }, { id: 'bc', from: 'B', to: 'C' }
      ], angles: {
        BAC: { at: 'A', from: 'B', to: 'C', value: 38, given: true },
        ABC: { at: 'B', from: 'C', to: 'A', value: 74, given: true },
        t: { at: 'C', from: 'A', to: 'B', value: 68, label: 't' }
      } },
      graph: [{ find: 't', rule: 'TRI', from: ['BAC', 'ABC'] }]
    };
  }
  function q13() {
    return {
      id: 'q13', marks: [2, 1], target: 'y',
      prompt: 'Triangle DEF is isosceles, with FD = FE. Work out the size of angle y. Give a reason for each step.',
      diagram: { w: 100, h: 64, pts: { D: [32, 58], E: [68, 58], F: [50, 8.55] }, segs: [
        { id: 'de', from: 'D', to: 'E' }, { id: 'df', from: 'D', to: 'F' }, { id: 'ef', from: 'E', to: 'F' }
      ], angles: {
        bD: { at: 'D', from: 'E', to: 'F', value: 70, given: true },
        b: { at: 'E', from: 'F', to: 'D', value: 70, label: 'b' },
        y: { at: 'F', from: 'D', to: 'E', value: 40, label: 'y' }
      } },
      graph: [
        { find: 'b', rule: 'ISO', from: ['bD'] },
        { find: 'y', rule: 'TRI', from: ['bD', 'b'] }
      ]
    };
  }
  function q14() {
    return {
      id: 'q14', marks: [1, 1], target: 'n',
      prompt: 'The squares mark right angles. Work out the size of angle n in the quadrilateral. Give a reason.',
      diagram: { w: 100, h: 64, pts: { K: [15, 15], L: [85, 15], M: [85, 55], N: [43, 55] }, segs: [
        { id: 'kl', from: 'K', to: 'L' }, { id: 'lm', from: 'L', to: 'M' },
        { id: 'mn', from: 'M', to: 'N' }, { id: 'nk', from: 'N', to: 'K' }
      ], angles: {
        aK: { at: 'K', from: 'L', to: 'N', value: 55, given: true },
        aL: { at: 'L', from: 'M', to: 'K', value: 90, given: true },
        aM: { at: 'M', from: 'N', to: 'L', value: 90, given: true },
        n: { at: 'N', from: 'K', to: 'M', value: 125, label: 'n' }
      } },
      graph: [{ find: 'n', rule: 'QUAD', from: ['aK', 'aL', 'aM'] }]
    };
  }
  function q15() {
    return {
      id: 'q15', marks: [2, 1], target: 'b',
      prompt: 'BCD is a straight line. Work out the size of angle b. Give a reason for each step.',
      diagram: { w: 100, h: 62, pts: { B: [20, 55], C: [70, 55], _D: [92, 55], A: [43.9, 3.8] }, segs: [
        { id: 'base', from: 'B', to: '_D' }, { id: 'ab', from: 'A', to: 'B' }, { id: 'ac', from: 'A', to: 'C' }
      ], angles: {
        BAC: { at: 'A', from: 'B', to: 'C', value: 52, given: true },
        ext: { at: 'C', from: 'A', to: '_D', value: 117, given: true },
        c: { at: 'C', from: 'B', to: 'A', value: 63, label: 'c' },
        b: { at: 'B', from: 'C', to: 'A', value: 65, label: 'b' }
      } },
      graph: [
        { find: 'c', rule: 'STR', from: ['ext'] },
        { find: 'b', rule: 'TRI', from: ['BAC', 'c'] }
      ]
    };
  }
  var s4 = {
    id: 's4', title: 'Triangles and quadrilaterals',
    walt: 'Angles in a triangle add up to 180°. Angles in a quadrilateral add up to 360°.',
    movie: {
      title: 'Three corners, four corners', mode: 'diagram', deferred: true,
      diagram: (function () {
        return { w: 100, h: 60, labelled: false, pts: {
          _A: [12, 50], _B: [48, 50], _C: [32.2, 17.6],
          _K: [60, 16], _L: [94, 16], _M: [94, 52], _N: [73.8, 52]
        }, segs: [
          { id: 'tab', from: '_A', to: '_B' }, { id: 'tac', from: '_A', to: '_C' }, { id: 'tbc', from: '_B', to: '_C' },
          { id: 'qkl', from: '_K', to: '_L' }, { id: 'qlm', from: '_L', to: '_M' },
          { id: 'qmn', from: '_M', to: '_N' }, { id: 'qnk', from: '_N', to: '_K' },
          { id: 'diag', from: '_K', to: '_M', dash: true }
        ], angles: {
          tA: { at: '_A', from: '_B', to: '_C', value: 58, given: true },
          tB: { at: '_B', from: '_C', to: '_A', value: 64, given: true },
          tC: { at: '_C', from: '_A', to: '_B', value: 58 },
          qK: { at: '_K', from: '_L', to: '_N', value: 69, given: true },
          qL: { at: '_L', from: '_M', to: '_K', value: 90, given: true },
          qM: { at: '_M', from: '_N', to: '_L', value: 90, given: true },
          qN: { at: '_N', from: '_K', to: '_M', value: 111 }
        } };
      })(),
      steps: [
        { say: 'Every triangle, any shape at all: its three angles add up to exactly 180°.', do: [{ seg: { id: 'tab' } }, { seg: { id: 'tac' } }, { seg: { id: 'tbc' } }, { arc: { ang: 'tA' } }, { arc: { ang: 'tB' } }, { stamp: { reason: 'TRI' } }] },
        { say: 'Two angles known: 58° and 64°. The third must make the total 180.', do: [{ arc: { ang: 'tC' } }] },
        { say: '180 − 58 − 64 = 58. Type that calculation in your jotter — it IS your working.', do: [{ value: { ang: 'tC', to: 58 } }] },
        { say: 'Now a quadrilateral. Cut it corner to corner — it is just TWO triangles.', do: [{ seg: { id: 'qkl' } }, { seg: { id: 'qlm' } }, { seg: { id: 'qmn' } }, { seg: { id: 'qnk' } }, { seg: { id: 'diag' } }] },
        { say: 'Two triangles of 180° each — so a quadrilateral holds 360°.', do: [{ stamp: { reason: 'QUAD' } }, { arc: { ang: 'qK' } }, { arc: { ang: 'qL' } }, { arc: { ang: 'qM' } }] },
        { say: '360 − 69 − 90 − 90 finds the last corner.', do: [{ arc: { ang: 'qN' } }] },
        { say: '= 111°. Remember: the squares are right angles — they count as 90 in your sum.', do: [{ value: { ang: 'qN', to: 111 } }] }
      ]
    },
    questions: [q12(), q13(), q14(), q15()]
  };

  /* ════ Section 5 — Parallel lines ═════════════════════════════════ */
  var q16 = (function () {
    var b = parallelQ(70, {
      e1: { id: 'g70', given: true }, e3: { id: 'm', label: 'm' }, f1: { id: 't', label: 't' }
    }, { ex: 62 });
    return { id: 'q16', marks: [1, 1], target: 't',
      prompt: 'The arrows mark parallel lines. Work out the size of angle t. Give a reason.',
      diagram: b.diagram, graph: b.graph };
  })();
  var q17 = (function () {
    var b = parallelQ(40, {
      e3: { id: 'g40', given: true }, e4: { id: 'v', label: 'v' },
      f1: { id: 'u', label: 'u' }, f2: { id: 'w', label: 'w' }
    }, { ex: 72 });
    return { id: 'q17', marks: [2, 1], target: 'w',
      prompt: 'Work out the size of angle w. Give a reason for each step of your working.',
      diagram: b.diagram, graph: b.graph, dx: { 'w:40': 'COINT_EQUAL' } };
  })();
  var q18 = (function () {
    var b = parallelQ(68, {
      f4: { id: 'g112', given: true }, f2: { id: 'p', label: 'p' },
      e4: { id: 'r', label: 'r' }, e2: { id: 's', label: 's' }
    }, { ex: 58 });
    return { id: 'q18', marks: [2, 1], target: 's',
      prompt: 'Work out the size of angle s. Give a reason for each step of your working.',
      diagram: b.diagram, graph: b.graph };
  })();
  var q19 = (function () {
    var b = parallelQ(81, {
      e1: { id: 'g81', given: true }, e3: { id: 'm2', label: 'm' },
      f1: { id: 'n2', label: 'n' }, f2: { id: 'w2', label: 'w' }
    }, { ex: 56 });
    return { id: 'q19', marks: [2, 1], target: 'w2',
      prompt: 'Work out the size of angle w. Give a reason for each step of your working.',
      diagram: b.diagram, graph: b.graph };
  })();
  var s5 = (function () {
    var mb = parallelQ(30, {
      e2: { id: 'a', given: true }, e1: { id: 'b' }, e3: { id: 'c' },
      f2: { id: 'd' }, f1: { id: 'e' }
    }, { ex: 64, yTop: 24, yBot: 48, stub: 10 });
    // movie shows the unknowns being found, so strip their labels showing as letters only
    return {
      id: 's5', title: 'Parallel lines',
      walt: 'Alternate angles are equal (Z shape). Corresponding angles are equal (F shape). Interior angles add up to 180° (U shape).',
      movie: {
        title: 'The book’s own example: a = 150°', mode: 'diagram', deferred: true,
        diagram: mb.diagram,
        steps: [
          { say: 'Two parallel lines (matching arrows) and one transversal. One angle given: a = 150°.', do: [{ seg: { id: 'top' } }, { seg: { id: 'bottom' } }, { seg: { id: 'trans' } }, { arc: { ang: 'a' } }] },
          { say: 'b sits with a on a straight line: b = 180° − 150° = 30°.', do: [{ arc: { ang: 'b' } }, { stamp: { reason: 'STR' } }, { value: { ang: 'b', to: 30 } }] },
          { say: 'c is vertically opposite b — equal. c = 30°.', do: [{ arc: { ang: 'c' } }, { stamp: { reason: 'VOP' } }, { value: { ang: 'c', to: 30 } }] },
          { say: 'd CORRESPONDS to a — same position at the next crossing. Trace the F shape.', do: [{ arc: { ang: 'd' } }, { zshape: { pts: ['_T', 'E', '_EL'], colour: '#E4B824' } }, { zshape: { pts: ['F', '_FL'], colour: '#E4B824' } }] },
          { say: 'Corresponding angles are equal: d = 150°.', do: [{ stamp: { reason: 'COR' } }, { value: { ang: 'd', to: 150 } }] },
          { say: 'e and c are ALTERNATE — the Z shape between the lines. e = 30°.', do: [{ arc: { ang: 'e' } }, { zshape: { pts: ['_ER', 'E', 'F', '_FL'], colour: '#0F6B66' } }, { stamp: { reason: 'ALT' } }, { value: { ang: 'e', to: 30 } }] },
          { say: 'And c with d make the U shape: INTERIOR angles, adding to 180°. (The book calls these allied or co-interior.)', do: [{ zshape: { pts: ['_EL', 'E', 'F', '_FL'], colour: '#7A3B5E' } }, { stamp: { reason: 'INT' } }] },
          { say: 'Five angles from one given — and every step had a NAMED reason. That is what the examiner pays for.', do: [{ note: { text: 'Z = alternate · F = corresponding · U = interior', red: true } }] }
        ]
      },
      questions: [q16, q17, q18, q19]
    };
  })();

  /* ════ Section 6 — Putting it together ════════════════════════════ */
  function q20() {
    return {
      id: 'q20', marks: [3, 1], target: ['a', 'b', 'c'],
      prompt: 'PQRS is a parallelogram. Work out angles a, b and c. Give a reason for each step.',
      diagram: { w: 100, h: 64, pts: { P: [22, 20], Q: [74, 20], R: [88.92, 52], S: [36.92, 52] }, segs: [
        { id: 'pq', from: 'P', to: 'Q', par: 1 }, { id: 'sr', from: 'S', to: 'R', par: 1 },
        { id: 'ps', from: 'P', to: 'S', par: 2 }, { id: 'qr', from: 'Q', to: 'R', par: 2 }
      ], angles: {
        aP: { at: 'P', from: 'Q', to: 'S', value: 65, given: true },
        a: { at: 'Q', from: 'R', to: 'P', value: 115, label: 'a' },
        b: { at: 'R', from: 'S', to: 'Q', value: 65, label: 'b' },
        c: { at: 'S', from: 'P', to: 'R', value: 115, label: 'c' }
      } },
      graph: [
        { find: 'a', rule: 'INT', from: ['aP'] },
        { find: 'c', rule: 'INT', from: ['aP'] },
        { find: 'b', rule: 'PGRAM', from: ['aP'] },
        { find: 'a', rule: 'PGRAM', from: ['c'] },
        { find: 'c', rule: 'PGRAM', from: ['a'] },
        { find: 'b', rule: 'INT', from: ['a'] },
        { find: 'b', rule: 'INT', from: ['c'] },
        { find: 'a', rule: 'INT', from: ['b'] },
        { find: 'c', rule: 'INT', from: ['b'] },
        { find: 'b', rule: 'QUAD', from: ['aP', 'a', 'c'] },
        { find: 'a', rule: 'QUAD', from: ['aP', 'b', 'c'] },
        { find: 'c', rule: 'QUAD', from: ['aP', 'a', 'b'] }
      ]
    };
  }
  function q21() {
    return {
      id: 'q21', marks: [2, 1], target: 'x',
      prompt: 'The two horizontal lines are parallel. Work out the size of angle x. Give a reason for each step.',
      diagram: { w: 100, h: 64, pts: {
        D: [8, 58], G: [89.3, 58], M: [41.6, 18],
        _LL: [2, 58], _LR: [97, 58], _UL: [6, 18], _UR: [96, 18]
      }, segs: [
        { id: 'lower', from: '_LL', to: '_LR', par: 1 }, { id: 'upper', from: '_UL', to: '_UR', par: 1 },
        { id: 'md', from: 'M', to: 'D' }, { id: 'mg', from: 'M', to: 'G' }
      ], angles: {
        g1: { at: 'D', from: 'G', to: 'M', value: 50, given: true },
        g2: { at: 'G', from: 'D', to: 'M', value: 40, given: true },
        a: { at: 'M', from: '_UL', to: 'D', value: 50, label: 'a' },
        b: { at: 'M', from: 'G', to: '_UR', value: 40, label: 'b' },
        x: { at: 'M', from: 'D', to: 'G', value: 90, label: 'x' }
      } },
      graph: [
        { find: 'a', rule: 'ALT', from: ['g1'] },
        { find: 'b', rule: 'ALT', from: ['g2'] },
        { find: 'x', rule: 'STR', from: ['a', 'b'] },
        { find: 'x', rule: 'TRI', from: ['g1', 'g2'] }
      ]
    };
  }
  function q22() {
    return {
      id: 'q22', marks: [3, 1], target: 'x2',
      prompt: 'DEF is a straight line and BC is parallel to DE. Work out the size of angle x. Give a reason for each step.',
      diagram: { w: 100, h: 64, pts: {
        D: [18, 58], E: [70, 58], _F: [88, 58], A: [44, 22.2], B: [32.3, 38.3], C: [55.7, 38.3]
      }, segs: [
        { id: 'base', from: 'D', to: '_F' },
        { id: 'ad', from: 'A', to: 'D' }, { id: 'ae', from: 'A', to: 'E' },
        { id: 'bc', from: 'B', to: 'C', par: 1 }, { id: 'de2', from: 'D', to: 'E', par: 1 }
      ], angles: {
        aA: { at: 'A', from: 'D', to: 'E', value: 72, given: true },
        ext: { at: 'E', from: 'A', to: '_F', value: 126, given: true },
        d: { at: 'E', from: 'A', to: 'D', value: 54, label: 'd' },
        e: { at: 'D', from: 'E', to: 'A', value: 54, label: 'e' },
        x2: { at: 'B', from: 'A', to: 'C', value: 54, label: 'x' }
      } },
      graph: [
        { find: 'd', rule: 'STR', from: ['ext'] },
        { find: 'e', rule: 'TRI', from: ['aA', 'd'] },
        { find: 'x2', rule: 'COR', from: ['e'] }
      ]
    };
  }
  var s6 = {
    id: 's6', title: 'Putting it together',
    walt: 'Revise angle facts and use these in problem solving.',
    movie: {
      title: 'The parallelogram — three ways in', mode: 'diagram', deferred: true,
      diagram: { w: 100, h: 64, labelled: false, pts: {
        _P: [20, 18], _Q: [72, 18], _R: [84.38, 52], _S: [32.38, 52]
      }, segs: [
        { id: 'pq', from: '_P', to: '_Q', par: 1 }, { id: 'sr', from: '_S', to: '_R', par: 1 },
        { id: 'ps', from: '_P', to: '_S', par: 2 }, { id: 'qr', from: '_Q', to: '_R', par: 2 }
      ], angles: {
        gP: { at: '_P', from: '_Q', to: '_S', value: 70, given: true },
        a: { at: '_Q', from: '_R', to: '_P', value: 110 },
        b: { at: '_S', from: '_P', to: '_R', value: 110 },
        c: { at: '_R', from: '_S', to: '_Q', value: 70 }
      } },
      steps: [
        { say: 'The book’s Example 2: a parallelogram with one angle given, 70°. Find the rest.', do: [{ seg: { id: 'pq' } }, { seg: { id: 'qr' } }, { seg: { id: 'sr' } }, { seg: { id: 'ps' } }, { arc: { ang: 'gP' } }] },
        { say: 'a and 70° sit between the parallels — interior angles, the U shape. a = 180 − 70.', do: [{ arc: { ang: 'a' } }, { stamp: { reason: 'INT' } }, { value: { ang: 'a', to: 110 } }] },
        { say: 'b the same way down the other side: b = 180 − 70 = 110°.', do: [{ arc: { ang: 'b' } }, { value: { ang: 'b', to: 110 } }] },
        { say: 'Now c — and here the book shows THREE different routes.', do: [{ arc: { ang: 'c' } }] },
        { say: 'Route 1: interior angles with a: c = 180 − 110 = 70.', do: [{ stamp: { reason: 'INT' } }] },
        { say: 'Route 2: angle sum of a quadrilateral: c = 360 − (70 + 110 + 110) = 70.', do: [{ stamp: { reason: 'QUAD' } }] },
        { say: 'Route 3: opposite angles of a parallelogram are equal: c = 70.', do: [{ stamp: { reason: 'PGRAM' } }, { value: { ang: 'c', to: 70 } }] },
        { say: 'ANY correct route earns the marks. The Glass Jotter marks every valid route too — pick yours.', do: [{ note: { text: 'Any valid route. Always with reasons.', red: true } }] }
      ]
    },
    questions: [q20(), q21(), q22()]
  };

  window.GJ_CONTENT = window.GJ_CONTENT || {};
  window.GJ_CONTENT.angles = {
    id: 'angles',
    title: 'Angles',
    cover: { accent: 'teal', motif: 'protractor' },
    reasonBank: REASON_BANK,
    sections: [s1, s2, s3, s4, s5, s6]
  };

  /* "I can…" self-evaluation chips — pupil-voice restatements of each section's
     WALT (content-safe; Mary may reword). Surfaced at exercise end and in the
     teacher's Insights. The ids are stable — they key the saved self-eval, so do
     not renumber them once pupils have used the activity. */
  (function () {
    var CANS = {
      s1: [{ id: 'a1c1', text: 'I can name acute, right, obtuse, straight and reflex angles' },
           { id: 'a1c2', text: 'I can measure an angle with a protractor' }],
      s2: [{ id: 'a2c1', text: 'I can use angles on a straight line adding to 180°' },
           { id: 'a2c2', text: 'I can use angles round a point adding to 360°' }],
      s3: [{ id: 'a3c1', text: 'I can use vertically opposite angles being equal' }],
      s4: [{ id: 'a4c1', text: 'I can use angles in a triangle adding to 180°' },
           { id: 'a4c2', text: 'I can use angles in a quadrilateral adding to 360°' }],
      s5: [{ id: 'a5c1', text: 'I can spot Z (alternate) angles are equal' },
           { id: 'a5c2', text: 'I can spot F (corresponding) angles are equal' },
           { id: 'a5c3', text: 'I can use U (interior) angles adding to 180°' }],
      s6: [{ id: 'a6c1', text: 'I can combine several angle facts in one problem' },
           { id: 'a6c2', text: 'I can explain the angle rule behind each step' }]
    };
    window.GJ_CONTENT.angles.sections.forEach(function (s) { s.cans = CANS[s.id] || []; });
  })();
})();
