/* MathShelf - statcore.js
   window.GJ_STATS: the Handling Data marking engine. Pure logic: no DOM, no
   state, no network. It marks a pupil's ordered list, cumulative-frequency
   column, plotted points, curve read-offs, box plot, comparison, judgement or
   number-pad slots against the question's own data, and returns one row per
   MARKING UNIT.

   Exactness: every value is an exact rational {n,d} through GJ_MATH's helpers
   (mathcore.js loads first, as anglecore.js does). Chart coordinates are
   integers in small-square units, so snapping and tolerance are integer work.
   Nothing here ever touches a float for correctness.

   The unit table (UNITS) is the ONE place that says, per unit: which band it
   belongs to (method or accuracy), what it weighs (w), and whether a
   follow-through tick earns its mark (ftEarns). Everything else - the pupil's
   tally, the teacher's rows, the lint's reachable-marks rule - reads it.
*/
(function (root) {
  'use strict';

  var M = root.GJ_MATH ||
    (typeof module !== 'undefined' && typeof require === 'function' ? require('./mathcore.js') : null);
  if (!M || typeof M.rat !== 'function') {
    throw new Error('statcore.js needs GJ_MATH (mathcore.js) loaded first');
  }

  /* ---------- rationals (GJ_MATH's, named locally) ---------- */

  var rat = M.rat, radd = M.radd, rsub = M.rsub, rmul = M.rmul, rdiv = M.rdiv,
      req = M.req, rfromstr = M.rfromstr, rtostr = M.rtostr;

  function rint(k) { return rat(k, 1); }
  function rlt(a, b) { return a.n * b.d < b.n * a.d; }
  function rle(a, b) { return a.n * b.d <= b.n * a.d; }
  function rnum(a) { return a.n / a.d; }
  function rabs(a) { return a.n < 0 ? rat(-a.n, a.d) : a; }
  function rmin(a, b) { return rlt(a, b) ? a : b; }
  function rmax(a, b) { return rlt(a, b) ? b : a; }

  /* Anything a pack or an attempt can carry -> a rational, or null.
     Accepts {n,d}, a number, and the strings a number pad produces
     ('7', '4.5', '-2', '11/2'), with the unicode minus tolerated. */
  function R(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object' && typeof v.n === 'number' && typeof v.d === 'number' && v.d !== 0) {
      return rat(v.n, v.d);
    }
    if (typeof v === 'number') {
      if (!isFinite(v)) return null;
      var d = 1;
      while (Math.abs(v * d - Math.round(v * d)) > 1e-9 && d < 1e9) d *= 10;
      return rat(Math.round(v * d), d);
    }
    if (typeof v === 'string') {
      var s = v.replace(/−/g, '-').replace(/\s+/g, '');
      if (s === '') return null;
      var r = rfromstr(s);
      return r || null;
    }
    return null;
  }
  function Rs(list) { return (list || []).map(R); }
  function terminates(r) {
    if (!r) return true;
    var d = r.d;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    return d === 1;
  }

  /* ---------- the dx library (plain English lives in DX_NAMES) ---------- */

  var DX_NAMES = {
    QL_UNORDERED: 'Picked from the list without ordering it',
    QL_Q_POSITION_OFF: 'Counted to the wrong position for a quartile',
    QL_MEDIAN_AS_Q: 'Used the median where a quartile was asked',
    QL_Q_SWAPPED: 'Lower and upper quartile the wrong way round',
    IQR_ADDED: 'Added the quartiles instead of subtracting',
    IQR_RANGE: 'Gave the range instead of the interquartile range',
    IQR_NEGATED: 'Took the lower quartile minus the upper',
    CF_NOT_CUMULATIVE: 'Copied the frequencies instead of the running total',
    CF_SKIPPED_ROW: 'Running total skipped a row',
    CF_WRONG_ROW_ADDED: 'Added the wrong row’s frequency',
    PLOT_MIDPOINT: 'Plotted at the midpoints, not the upper boundaries',
    PLOT_LOWER_BOUND: 'Plotted at the lower boundaries',
    PLOT_FREQ_NOT_CF: 'Plotted the frequencies, not the cumulative totals',
    PLOT_AXES_SWAPPED: 'Axes the wrong way round',
    PLOT_ONE_OUT: 'One point a square out',
    READ_HALF_AXIS: 'Read at half the axis, not half the total',
    READ_Q_SWAPPED: 'Quartile heights the wrong way round',
    READ_WRONG_AXIS: 'Read the wrong axis',
    READ_REPORTED_HEIGHT: 'Gave the frequency, not the value on the scale',
    READ_COUNT_NOT_COMPLEMENT: 'Gave the number below when the number above was asked',
    PCT_OF_WRONG_TOTAL: 'Percentage taken of the axis, not of the total',
    BOX_WHISKER_SWAP: 'Whiskers and quartiles confused',
    BOX_CF_AS_VALUES: 'Used cumulative frequencies as the values',
    BOX_MAX_IS_N: 'Put the highest value at the total frequency',
    BOX_MEDIAN_CENTRED: 'Placed the median in the middle of the box by guess',
    CMP_WRONG_GROUP: 'Named the wrong group',
    CMP_CONTEXT_FLIPPED: 'Comparison right, meaning in context wrong',
    CMP_VALUES_WRONG: 'Right comparison, wrong values quoted',
    CMP_MEASURE_VALUES_SWAPPED: 'Quoted the range’s values for the interquartile range (or the reverse)',
    CMP_SPREAD_MEANING: 'Larger spread called “more consistent”',
    JUDGE_ACCEPTS_CLAIM: 'Accepted a claim from a biased sample',
    JUDGE_OVERCLAIM: 'Treated a sample estimate as an exact figure',
    JUDGE_REJECTS_FAIR: 'Rejected a fair conclusion',
    JUDGE_WRONG_REASON: 'Right verdict, wrong limitation',
    TFN_GROUPED_EXACT: 'Claimed an exact value from grouped data',
    TFN_ESTIMATE_AS_FALSE: 'Called a sound estimate false because it was not exact',
    /* Books A and B (DESIGN §7). SL_BACK_DIRECTION is deliberately absent: the
       tap-first stem zone grows the pupil's side outward by construction, so
       the slip cannot be made. The AV_* and RM_* ids are Book B's and arrive
       with their detections. */
    SL_UNORDERED: 'Leaves not in order along the stem',
    SL_WRONG_STEM: 'A leaf on the wrong stem',
    SL_MISSED_LEAF: 'A value left out (or entered twice)',
    SL_KEY_WRONG: 'Key does not match the data',
    VENN_TOTAL_AS_ONLY: 'Put the whole-circle total in the “only” region',
    VENN_OUTSIDE_LOST: 'Forgot the people outside both circles',
    PIE_PCT_NOT_DEG: 'Worked in percentages, not degrees',
    PIE_TOTAL_WRONG: 'Divided by the wrong total',
    PIE_SECTOR_OFF: 'A sector drawn to the wrong angle',
    SC_XY_SWAPPED: 'Plotted the two values the wrong way round',
    SC_LINE_OFF_TREND: 'Line of best fit does not follow the points',
    SC_READ_WRONG_AXIS: 'Read the estimate from the wrong axis',
    SC_CORR_SIGN: 'Correlation named the wrong way (positive/negative)'
  };

  /* The reason bank for `judge`. Ids are fixed; the sentence a pupil reads is
     authored in the pack from the source's own words - these are the teacher's
     names for them, and the pack's reason text is checked against these ids. */
  var REASONS = {
    SMALL: 'The sample is too small to be sure.',
    BIASED: 'The sample is not random — it left some people out.',
    WRONG_POP: 'The people asked are not the population the claim is about.',
    ESTIMATE: 'A sample can only estimate — it can’t give the exact figure.',
    TIME_PLACE: 'When and where the sample was taken changes the answer.',
    USE_IQR_OUTLIERS: 'The interquartile range ignores extreme values.',
    USE_RANGE_ALL: 'The range uses every value, so one odd value distorts it.',
    USE_MIDDLE_HALF: 'The IQR tells you how spread out the middle half is.',
    /* the questionnaire bank (DESIGN §17.8) - `pick` flaws and `judge` reasons */
    Q_OVERLAP: 'Two boxes overlap — a value could go in both.',
    Q_GAP: 'Some values have no box.',
    Q_NO_ZERO: 'There is no box for none / zero.',
    Q_NO_TIME: 'It does not say over what time (a week? a month?).',
    Q_LEADING: 'It leads people towards one answer.',
    Q_VAGUE: 'Words like ‘a lot’ mean different things to different people.',
    Q_NO_OTHER: 'There is no other / don’t know option.',
    Q_ONLY_POSITIVE: 'Every option is positive.',
    Q_PERSONAL: 'It asks something too personal.',
    Q_OPEN: 'It is open-ended — the answers cannot be counted.'
  };

  /* ---------- pack conventions ---------- */

  var DEFAULT_RULES = {
    quartileRule: 'n+1', curveRule: 'split50', startPoint: true,
    curveStyle: 'smooth', readTol: 1, plotTol: 0
  };
  function rulesOf(q, rules) {
    var r = {}, k;
    for (k in DEFAULT_RULES) if (DEFAULT_RULES.hasOwnProperty(k)) r[k] = DEFAULT_RULES[k];
    if (rules) for (k in rules) if (rules.hasOwnProperty(k)) r[k] = rules[k];
    if (q && q.rules) for (k in q.rules) if (q.rules.hasOwnProperty(k)) r[k] = q.rules[k];
    return r;
  }

  /* ---------- quartiles from a list ---------- */

  /* The 1-indexed positions the convention asks for. 'n+1' is the CCEA/NI
     rule Colette's notes use: (n+1)/4, (n+1)/2, 3(n+1)/4. */
  function quartilePositions(n, rule) {
    if (rule === 'halves') return null;                 /* positions are per half */
    var np1 = rint(n + 1);
    return {
      Q1: rdiv(np1, rint(4)),
      Q2: rdiv(np1, rint(2)),
      Q3: rdiv(rmul(rint(3), np1), rint(4))
    };
  }

  /* A position is EXPRESSIBLE when a pupil can point at it: a whole position
     (one tile) or a half (two neighbouring tiles). A quarter position cannot
     be tapped, so the lint refuses such a list for `qlist`. */
  function expressible(pos) {
    return !!pos && pos.d === 1 || (!!pos && pos.d === 2);
  }
  function positionsExpressible(n, rule) {
    var p = quartilePositions(n, rule);
    if (!p) return true;
    return expressible(p.Q1) && expressible(p.Q2) && expressible(p.Q3);
  }

  /* The value at a (possibly half) 1-indexed position of an ordered array. */
  function atPosition(arr, pos) {
    if (!arr.length) return null;
    if (pos.d === 1) {
      var i = pos.n - 1;
      if (i < 0) i = 0;
      if (i > arr.length - 1) i = arr.length - 1;
      return arr[i];
    }
    var lo = Math.floor(rnum(pos)) - 1, hi = lo + 1;
    if (lo < 0) lo = 0;
    if (hi > arr.length - 1) hi = arr.length - 1;
    return rdiv(radd(arr[lo], arr[hi]), rint(2));
  }
  /* Which indices a pupil would tap for that position (0-indexed). */
  function indicesFor(n, pos) {
    if (pos.d === 1) return [Math.min(Math.max(pos.n - 1, 0), n - 1)];
    var lo = Math.min(Math.max(Math.floor(rnum(pos)) - 1, 0), n - 1);
    return [lo, Math.min(lo + 1, n - 1)];
  }

  function medianOf(arr) {
    var n = arr.length;
    if (!n) return null;
    return n % 2 ? arr[(n - 1) / 2] : rdiv(radd(arr[n / 2 - 1], arr[n / 2]), rint(2));
  }

  function sortR(list) {
    return list.slice().sort(function (a, b) { return rnum(a) - rnum(b); });
  }

  /* quartiles(values, rule) -> {Q1,Q2,Q3,IQR,sorted,pos,expressible} */
  function quartiles(values, rule) {
    var v = Rs(values).filter(function (x) { return !!x; });
    var s = sortR(v), n = s.length;
    if (!n) return null;
    var Q1, Q2, Q3, pos = null;
    if (rule === 'halves') {
      Q2 = medianOf(s);
      var half = (n - (n % 2)) / 2;
      Q1 = medianOf(s.slice(0, half));
      Q3 = medianOf(s.slice(n - half));
    } else {
      pos = quartilePositions(n, rule);
      Q1 = atPosition(s, pos.Q1);
      Q2 = atPosition(s, pos.Q2);
      Q3 = atPosition(s, pos.Q3);
    }
    return {
      Q1: Q1, Q2: Q2, Q3: Q3, IQR: rsub(Q3, Q1), sorted: s, pos: pos,
      expressible: rule === 'halves' ? true : positionsExpressible(n, rule)
    };
  }

  function fiveNumber(values, rule) {
    var q = quartiles(values, rule);
    if (!q) return null;
    return { min: q.sorted[0], Q1: q.Q1, Q2: q.Q2, Q3: q.Q3, max: q.sorted[q.sorted.length - 1] };
  }

  /* ---------- cumulative frequency ---------- */

  function cumulate(classes) {
    var out = [], run = 0, i;
    for (i = 0; i < (classes || []).length; i++) {
      run += Number(classes[i].f) || 0;
      out.push(run);
    }
    return out;
  }

  /* ---------- the curve ---------- */

  /* A curve is the CHORD through its plotted points - the spline is a drawing
     convenience and the mark scheme allows a square either way. Both readings
     are exact rationals; null outside the curve's own range, in both
     directions, so the round trip is a contract the selfTest pins. */
  function curvePts(curve) {
    return (curve || []).map(function (p) { return [R(p[0]), R(p[1])]; })
      .filter(function (p) { return p[0] && p[1]; })
      .sort(function (a, b) { return rnum(a[0]) - rnum(b[0]); });
  }
  function curveX(curve, h) {
    var p = curvePts(curve), y = R(h), i;
    if (!p.length || !y) return null;
    if (rlt(y, p[0][1]) || rlt(p[p.length - 1][1], y)) return null;
    for (i = 0; i < p.length - 1; i++) {
      var y0 = p[i][1], y1 = p[i + 1][1];
      if (rle(y0, y) && rle(y, y1)) {
        if (req(y0, y1)) return p[i][0];
        var t = rdiv(rsub(y, y0), rsub(y1, y0));
        return radd(p[i][0], rmul(t, rsub(p[i + 1][0], p[i][0])));
      }
    }
    return p[p.length - 1][0];
  }
  function curveY(curve, x) {
    var p = curvePts(curve), X = R(x), i;
    if (!p.length || !X) return null;
    if (rlt(X, p[0][0]) || rlt(p[p.length - 1][0], X)) return null;
    for (i = 0; i < p.length - 1; i++) {
      var x0 = p[i][0], x1 = p[i + 1][0];
      if (rle(x0, X) && rle(X, x1)) {
        if (req(x0, x1)) return p[i][1];
        var t = rdiv(rsub(X, x0), rsub(x1, x0));
        return radd(p[i][1], rmul(t, rsub(p[i + 1][1], p[i][1])));
      }
    }
    return p[p.length - 1][1];
  }
  function curveMonotone(curve) {
    var p = curvePts(curve), i;
    for (i = 1; i < p.length; i++) if (rlt(p[i][1], p[i - 1][1])) return false;
    return true;
  }

  /* The heights the rule is slid to. Colette's notes: for n <= 50 the median
     sits at (n+1)/2 and the quartiles at (n+1)/4 and 3(n+1)/4; above 50 the
     +1 is dropped. */
  function readHeights(n, rule) {
    var N = rint(n), np1 = rint(n + 1), base;
    if (rule === 'n/2') base = N;
    else if (rule === 'n+1/2') base = np1;
    else base = (n <= 50) ? np1 : N;                       /* 'split50' */
    return {
      median: rdiv(base, rint(2)),
      Q1: rdiv(base, rint(4)),
      Q3: rdiv(rmul(rint(3), base), rint(4))
    };
  }

  /* ---------- the unit table: band, weight, follow-through ---------- */

  /* One row per marking unit of a question, in the order the pupil earns them.
     `band` decides which of the two marks it can pay for; `w` is what it
     weighs (1 unless a paper pays more than one mark for one act); `ftEarns`
     says whether a hollow (follow-through) tick earns that weight. */

  function unitsOf(q, rules) {
    var r = rulesOf(q, rules);
    switch (q.kind) {
      case 'qlist': return qlistUnits(q);
      case 'cftable': return cftableUnits(q);
      case 'cfplot': return cfplotUnits(q);
      case 'cfread': return cfreadUnits(q);
      case 'boxplot': return boxplotUnits(q, r);
      case 'compare': return compareUnits(q);
      case 'judge': return judgeUnits(q);
      case 'values': return valuesUnits(q);
      case 'order': return orderUnits(q);
      case 'pick': return pickUnits(q);
      case 'stemleaf': return stemleafUnits(q);
      case 'pie': return pieUnits(q);
      case 'scatter': return scatterUnits(q);
      default: return [];
    }
  }

  function U(id, label, band, w, ftEarns) {
    return { id: id, label: label, band: band, w: w == null ? 1 : w, ftEarns: !!ftEarns };
  }

  var CUT_LABEL = { Q1: 'Lower quartile', Q2: 'Median', Q3: 'Upper quartile', IQR: 'Interquartile range' };

  function askCuts(q) {
    return (q.ask || ['Q1', 'Q2', 'Q3', 'IQR']).filter(function (a) { return typeof a === 'string'; });
  }

  function qlistUnits(q) {
    var out = [U('ORDER', 'The ordered list', 'method', 1, false)], cuts = askCuts(q);
    cuts.forEach(function (c) {
      if (c === 'IQR') out.push(U('IQR', CUT_LABEL.IQR, 'accuracy', 1, false));
      else out.push(U(c, CUT_LABEL[c] || c, 'method', 1, false));
    });
    /* When no IQR is asked the LAST cut carries the accuracy mark (§6.5). */
    if (cuts.indexOf('IQR') === -1 && out.length > 1) {
      var last = out[out.length - 1];
      last.band = 'accuracy';
    }
    return out;
  }

  function cftableUnits(q) {
    var pre = q.prefill || [], out = [];
    (q.classes || []).forEach(function (c, i) {
      if (pre.indexOf(i) > -1) return;
      out.push(U('CF' + i, 'Up to ' + c.hi + (q.unit ? ' ' + q.unit : ''), 'method', 1, true));
    });
    if (out.length) {
      out[out.length - 1].band = 'accuracy';                /* the final total */
      out[out.length - 1].ftEarns = true;                   /* every CF row earns on ft */
    }
    return out;
  }

  function cfplotUnits(q) {
    var w = (q.mkUnits && q.mkUnits.POINTS) || 1;
    return [U('POINTS', 'Points', 'method', w, false), U('CURVE', 'Curve', 'accuracy', 1, true)];
  }

  function cfreadUnits(q) {
    var out = [];
    (q.ask || []).forEach(function (a) {
      if (typeof a === 'string') {
        if (a === 'IQR') { out.push(U('IQR', CUT_LABEL.IQR, 'accuracy', 1, false)); return; }
        out.push(U('RULE_' + a, 'Where you read the ' + lower(CUT_LABEL[a] || a), 'method', 1, false));
        out.push(U('VALUE_' + a, CUT_LABEL[a] || a, 'accuracy', 1, false));
      } else if (a && a.type === 'atX') {
        out.push(U('RULE_X', 'Where you read across', 'method', 1, false));
        out.push(U('VALUE_CF', 'The reading', 'accuracy', 1, false));
        out.push(U('ANSWER', wantLabel(a.want), 'accuracy', 1, true));
      }
    });
    return out;
  }
  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function wantLabel(want) {
    if (want === 'countAbove') return 'How many above';
    if (want === 'countBelow') return 'How many below';
    if (want === 'pctAbove') return 'Percentage above';
    if (want === 'pctBelow') return 'Percentage below';
    return 'Answer';
  }

  function stageUnits(q) {
    if (!q.from) return [];
    var stage = { kind: q.from === 'curve' ? 'cfread' : q.from };
    var k;
    for (k in q) if (q.hasOwnProperty(k) && k !== 'kind' && k !== 'from') stage[k] = q[k];
    stage.kind = q.from === 'curve' ? 'cfread' : q.from;
    return unitsOf(stage);
  }

  function boxplotUnits(q, r) {
    var ft = !!q.from;                                     /* their own five numbers carry forward */
    return stageUnits(q).concat([
      U('BOX', 'Box', 'method', 1, ft),
      U('WHISKERS', 'Whiskers', 'accuracy', 1, ft)
    ]);
  }

  function compareUnits() {
    return [U('MEDIAN_CMP', 'Average', 'method', 1, false),
            U('SPREAD_CMP', 'Spread', 'accuracy', 1, false)];
  }

  function judgeUnits(q) {
    var out = [];
    (q.claims || []).forEach(function (c, i) {
      out.push(U('JUDGE_' + i, 'Claim ' + (i + 1), 'accuracy', 1, false));
      if (!c.options && c.fair === false) out.push(U('WHY_' + i, 'Reason ' + (i + 1), 'method', 1, true));
    });
    return out;
  }

  function valuesUnits(q) {
    var order = q.order || (q.slots || []).map(function (s) { return s.id; });
    return order.map(function (id) {
      var s = slotById(q, id) || { id: id, label: id };
      return U('V_' + id, s.label || id, s.earns === 'method' ? 'method' : 'accuracy', s.w || 1, !!s.ft);
    });
  }
  function slotById(q, id) {
    var i, s = q.slots || [];
    for (i = 0; i < s.length; i++) if (s[i].id === id) return s[i];
    return null;
  }

  /* ---- Book A's kinds (CONTRACT_A.md; DESIGN §17) ---- */

  /* order: a cycle is marked pair by pair so a rotation earns full marks; the
     closing pair carries the accuracy mark. A plain sequence is one unit. */
  function orderUnits(q) {
    var n = (q.answer || []).length, out = [], i;
    if (!q.cyclic) return [U('SEQ', 'The order', 'accuracy', 1, false)];
    for (i = 0; i < n; i++) {
      out.push(U('PAIR_' + i, 'Pair ' + (i + 1), i === n - 1 ? 'accuracy' : 'method', 1, false));
    }
    return out;
  }

  function pickUnits() {
    return [U('PICK', 'The better question', 'accuracy', 1, false),
            U('WHY', 'Why the others fall short', 'method', 1, false)];
  }

  /* stemleaf: LEAVES and ORDERED are method; KEY (only when asked) accuracy -
     the contract's bands, taken literally: a no-key question carries marks
     [m, 0]. */
  function stemleafUnits(q) {
    var out = [U('LEAVES', 'Every leaf on its stem', 'method', 1, false),
               U('ORDERED', 'Leaves in order', 'method', 1, false)];
    if (q.key && q.key.ask) out.push(U('KEY', 'The key', 'accuracy', 1, false));
    return out;
  }

  /* pie: one angle unit per category (a follow-through from THEIR first angle
     earns - §6.5's default for method units), the self-check SUM, then the
     drawn SECTORS (ft earns: drawn to their own table) and LABELS. */
  function pieUnits(q) {
    var out = [];
    (q.cats || []).forEach(function (c) {
      out.push(U('ANG_' + c.id, (c.label || c.id) + ' angle', 'method', 1, true));
    });
    out.push(U('SUM', 'Angles add to 360°', 'method', 1, false));
    out.push(U('SECTORS', 'Sectors', 'accuracy', 1, true));
    out.push(U('LABELS', 'Labels', 'accuracy', 1, false));
    return out;
  }

  /* scatter: POINTS always; the rest only as the asks name them. ESTIMATE
     earns on follow-through from their own line (the schemes' "ft their
     line"). */
  function scatterUnits(q) {
    var out = [U('POINTS', 'Points', 'method', q.pointsW || 1, false)];
    (q.asks || []).forEach(function (a) {
      if (!a) return;
      if (a.type === 'lobf') out.push(U('LOBF', 'Line of best fit', 'method', 1, false));
      else if (a.type === 'estimate') out.push(U('ESTIMATE', 'Estimate at ' + a.at, 'accuracy', 1, true));
      else if (a.type === 'corr') out.push(U('CORR', 'Correlation', 'accuracy', 1, false));
      else if (a.type === 'outlier') out.push(U('OUTLIER', 'The odd one out', 'accuracy', 1, false));
    });
    return out;
  }
  function askOf(q, type) {
    var i, a = q.asks || [];
    for (i = 0; i < a.length; i++) if (a[i] && a[i].type === type) return a[i];
    return null;
  }

  /* ---------- the tally labels a pupil and a teacher read ---------- */

  /* WHAT THE SECOND BAND IS CALLED DEPENDS ON WHAT WAS ASKED. A list question
     that asks only for the two quartiles carries its accuracy mark on the LAST
     cut, not on an interquartile range nobody asked for - and the tally was
     printing "Interquartile range 1 of 1" on a question with no IQR in it
     (separated read, 8 Sept 2026). The band's name is the name of the unit
     that carries it. */
  function mkLabelsFor(q, units) {
    var labs = MK_LABELS[q && q.kind] || ['Working', 'Answer'];
    if (!q || q.kind !== 'qlist' || !units) return labs;
    var acc = units.filter(function (u) { return u.band === 'accuracy'; })[0];
    return [labs[0], acc ? acc.label : labs[1]];
  }

  var MK_LABELS = {
    qlist: ['Quartiles', 'Interquartile range'],
    cftable: ['Running totals', 'Total'],
    cfplot: ['Points', 'Curve'],
    cfread: ['Readings', 'Values'],
    boxplot: ['Box', 'Whiskers'],
    compare: ['Average', 'Spread'],
    judge: ['Reasons', 'Judgements'],
    values: ['Working', 'Answers'],
    order: ['Pairs', 'Order'],
    pick: ['Reason', 'Choice'],
    stemleaf: ['Leaves', 'Key'],
    pie: ['Angles', 'Chart'],
    scatter: ['Points and line', 'Readings']
  };

  /* ---------- follow-through rules for `values` slots (a CLOSED table) ---- */

  var FT_RULES = {
    /* a circle's "only" region = that circle's total minus their overlap(s) */
    'venn.only': function (slot, q, got) {
      var tot = R(figTotal(q, slot.ft.of));
      if (!tot) return null;
      var sum = sumOf(slot.ft.from, got);
      return sum === null ? null : rsub(tot, sum);
    },
    /* outside both = N minus every inside region they wrote */
    'venn.outside': function (slot, q, got) {
      var n = R(q.fig && q.fig.n);
      var sum = sumOf(slot.ft.from, got);
      return (n && sum !== null) ? rsub(n, sum) : null;
    },
    /* both = A + B - (N - their outside) */
    'venn.both.fromTotals': function (slot, q, got) {
      var a = R(figTotal(q, slot.ft.of[0])), b = R(figTotal(q, slot.ft.of[1]));
      var n = R(q.fig && q.fig.n), outside = got[slot.ft.from[0]];
      if (!a || !b || !n || !outside) return null;
      return rsub(radd(a, b), rsub(n, outside));
    },
    'pie.angle': function (slot, q) {
      var f = R(slot.ft.f), tot = R(q.total);
      if (!f || !tot || tot.n === 0) return null;
      return rdiv(rmul(f, rint(360)), tot);
    },
    /* their first angle implies a degrees-per-item; carry it through */
    'pie.angle.fromTheirs': function (slot, q, got) {
      var first = got[slot.ft.from[0]], f0 = R(slot.ft.f0), f = R(slot.ft.f);
      if (!first || !f0 || !f || f0.n === 0) return null;
      return rmul(rdiv(first, f0), f);
    },
    'rm.total': function (slot, q) {
      var mean = R(slot.ft.mean), n = R(slot.ft.n);
      return (mean && n) ? rmul(mean, n) : null;
    },
    'rm.newMean': function (slot, q, got) {
      var total = got[slot.ft.from[0]], x = R(slot.ft.x), n = R(slot.ft.n);
      if (!total || !x || !n || n.n === 0) return null;
      return rdiv(slot.ft.minus ? rsub(total, x) : radd(total, x), n);
    },
    'avg.mean': function (slot, q) {
      var vals = Rs((q.fig && q.fig.values) || []);
      if (!vals.length) return null;
      var s = vals.reduce(function (a, b) { return radd(a, b); }, rint(0));
      return rdiv(s, rint(vals.length));
    },
    'table.mean': function (slot, q, got) {
      var fx = got[slot.ft.from[0]], f = got[slot.ft.from[1]];
      return (fx && f && f.n !== 0) ? rdiv(fx, f) : null;
    },
    /* a read taken from the pupil's own stem-and-leaf (Book A supplies it) */
    'sl.read': function (slot, q, got, stage) {
      if (!stage || !stage.values) return null;
      var v = sortR(Rs(stage.values));
      if (slot.ft.want === 'range') return rsub(v[v.length - 1], v[0]);
      if (slot.ft.want === 'median') return medianOf(v);
      return null;
    }
  };
  function figTotal(q, key) {
    if (typeof key === 'number') return key;
    return q.fig && q.fig.totals ? q.fig.totals[key] : null;
  }
  function sumOf(ids, got) {
    var s = rint(0), i;
    for (i = 0; i < (ids || []).length; i++) {
      if (!got[ids[i]]) return null;
      s = radd(s, got[ids[i]]);
    }
    return s;
  }

  /* ---------- check ---------- */

  function stateOf(att) {
    if (!att) return {};
    if (att.S && typeof att.S === 'object') return att.S;
    return att;
  }

  function check(q, att, rules) {
    var r = rulesOf(q, rules);
    var S = stateOf(att);
    var units = unitsOf(q, r);
    var per;
    switch (q.kind) {
      case 'qlist': per = markQlist(q, S, r, units); break;
      case 'cftable': per = markCftable(q, S, r, units); break;
      case 'cfplot': per = markCfplot(q, S, r, units); break;
      case 'cfread': per = markCfread(q, S, r, units); break;
      case 'boxplot': per = markBoxplot(q, S, r, units); break;
      case 'compare': per = markCompare(q, S, r, units); break;
      case 'judge': per = markJudge(q, S, r, units); break;
      case 'values': per = markValues(q, S, r, units); break;
      case 'order': per = markOrder(q, S, r, units); break;
      case 'pick': per = markPick(q, S, r, units); break;
      case 'stemleaf': per = markStemleaf(q, S, r, units); break;
      case 'pie': per = markPie(q, S, r, units); break;
      case 'scatter': per = markScatter(q, S, r, units); break;
      default: per = units.map(function (u) { return row(u, 0, null, 'not marked'); });
    }
    return settle(q, per, units);
  }

  function row(u, ok, dx, note) {
    return { unit: u.id, label: u.label, band: u.band, w: u.w, ftEarns: u.ftEarns,
             ok: ok, dx: dx || null, note: note || null,
             earned: earnedFor(u, ok) };
  }
  function earnedFor(u, ok) {
    if (ok === 1) return u.w;
    if (ok === 2 && u.ftEarns) return u.w;
    return 0;
  }

  function settle(q, per, units) {
    var marks = q.marks || [1, 1];
    var m = 0, a = 0, i, firstBad = -1;
    for (i = 0; i < per.length; i++) {
      if (per[i].band === 'accuracy') a += per[i].earned; else m += per[i].earned;
      if (firstBad === -1 && per[i].ok !== 1) firstBad = i;
    }
    var mk = [Math.min(marks[0] || 0, m), Math.min(marks[1] || 0, a)];
    var dx = null;
    for (i = 0; i < per.length; i++) if (per[i].dx) { dx = per[i].dx; break; }
    return {
      perLine: per,
      res: firstBad === -1 ? 'OK' : ('X@' + (firstBad + 1)),
      errAt: firstBad,
      dx: dx,
      mk: mk,
      mkMax: [marks[0] || 0, marks[1] || 0],
      mkLabels: mkLabelsFor(q, units),
      /* this book writes its tally in words: "Quartiles 3 of 3", never "3/3" */
      mkOf: true
    };
  }

  /* ---------- qlist ---------- */

  function markQlist(q, S, r, units) {
    var vals = Rs(q.values || []), n = vals.length;
    var truth = quartiles(q.values || [], r.quartileRule);
    var order = S.order || [];
    var rowVals = order.map(function (i) { return vals[i]; }).filter(function (x) { return !!x; });
    var complete = rowVals.length === n;
    var ordered = complete && isNonDecreasing(rowVals);
    var per = [], picks = S.picks || {};

    /* the cut a pupil's OWN row puts at the convention position */
    function cutOfRow(c) {
      if (!complete) return null;
      if (r.quartileRule === 'halves') {
        var qq = quartiles(rowVals.map(rtostr), 'halves');
        return qq ? qq[c] : null;
      }
      var pos = quartilePositions(n, r.quartileRule);
      return atPosition(rowVals, pos[c]);
    }
    function pickValue(c) {
      var p = picks[c];
      if (!p || !p.length || !complete) return null;
      if (p.length === 1) return rowVals[p[0]] || null;
      var a = rowVals[p[0]], b = rowVals[p[1]];
      return (a && b) ? rdiv(radd(a, b), rint(2)) : null;
    }
    function atConventionPosition(c) {
      var p = picks[c];
      if (!p || !p.length) return false;
      var pos = quartilePositions(n, r.quartileRule);
      if (!pos) return false;
      var want = indicesFor(n, pos[c]);
      if (want.length !== p.length) return false;
      var i;
      for (i = 0; i < want.length; i++) if (want[i] !== p[i]) return false;
      return true;
    }

    var cuts = askCuts(q).filter(function (c) { return c !== 'IQR'; });
    var swapped = cuts.indexOf('Q1') > -1 && cuts.indexOf('Q3') > -1 &&
      truth && eqR(pickValue('Q1'), truth.Q3) && eqR(pickValue('Q3'), truth.Q1) &&
      !eqR(truth.Q1, truth.Q3);

    units.forEach(function (u) {
      if (u.id === 'ORDER') {
        if (!complete) { per.push(row(u, 0, null, 'not every value is in the row')); return; }
        if (!ordered) { per.push(row(u, 0, 'QL_UNORDERED', null)); return; }
        per.push(row(u, 1, null, null));
        return;
      }
      if (u.id === 'IQR') {
        per.push(markIqr(q, S, r, u, truth, pickValue, vals));
        return;
      }
      var c = u.id, val = pickValue(c);
      if (!val) { per.push(row(u, 0, null, 'no value chosen')); return; }
      if (truth && eqR(val, truth[c])) { per.push(row(u, 1, null, null)); return; }
      if (!ordered && atConventionPosition(c)) { per.push(row(u, 2, null, 'read from your own row')); return; }
      var dx = null;
      if (swapped) dx = 'QL_Q_SWAPPED';
      else if (c !== 'Q2' && truth && eqR(val, truth.Q2)) dx = 'QL_MEDIAN_AS_Q';
      else if (positionOffByOne(c)) dx = 'QL_Q_POSITION_OFF';
      per.push(row(u, 0, dx, null));

      function positionOffByOne(c2) {
        var p = picks[c2], pos = quartilePositions(n, r.quartileRule);
        if (!p || p.length !== 1 || !pos || pos[c2].d !== 1) return false;
        return Math.abs(p[0] - (pos[c2].n - 1)) === 1;
      }
    });
    return per;
  }

  function markIqr(q, S, r, u, truth, pickValue, vals) {
    var given = R(S.iqr);
    if (!given) return row(u, 0, null, 'left blank');
    var theirQ1 = pickValue('Q1'), theirQ3 = pickValue('Q3');
    var theirIqr = (theirQ1 && theirQ3) ? rsub(theirQ3, theirQ1) : null;
    if (truth && eqR(given, truth.IQR)) return row(u, 1, null, null);
    if (theirIqr && eqR(given, theirIqr)) return row(u, 2, null, 'from your own quartiles');
    var dx = null;
    if (theirQ1 && theirQ3 && eqR(given, radd(theirQ3, theirQ1))) dx = 'IQR_ADDED';
    else if (truth && truth.sorted.length &&
             eqR(given, rsub(truth.sorted[truth.sorted.length - 1], truth.sorted[0]))) dx = 'IQR_RANGE';
    else if (theirQ1 && theirQ3 && eqR(given, rsub(theirQ1, theirQ3))) dx = 'IQR_NEGATED';
    return row(u, 0, dx, null);
  }

  function isNonDecreasing(list) {
    var i;
    for (i = 1; i < list.length; i++) if (rlt(list[i], list[i - 1])) return false;
    return true;
  }
  function eqR(a, b) { return !!a && !!b && req(a, b); }

  /* ---------- cftable ---------- */

  function markCftable(q, S, r, units) {
    var classes = q.classes || [], truth = cumulate(classes);
    var cf = S.cf || [], pre = q.prefill || [];
    var theirs = classes.map(function (c, i) {
      if (pre.indexOf(i) > -1) return rint(truth[i]);
      return R(cf[i]);
    });
    var allFreq = classes.length > 1 && classes.every(function (c, i) {
      return theirs[i] && eqR(theirs[i], rint(Number(c.f) || 0));
    });
    var per = [], idx = 0, cfDxDone = false;
    classes.forEach(function (c, i) {
      if (pre.indexOf(i) > -1) return;
      var u = units[idx++];
      var mine = theirs[i];
      if (!mine) { per.push(row(u, 0, null, 'left blank')); return; }
      if (eqR(mine, rint(truth[i]))) { per.push(row(u, 1, null, null)); return; }
      var prev = i > 0 ? theirs[i - 1] : rint(0);
      if (prev && eqR(mine, radd(prev, rint(Number(c.f) || 0)))) {
        per.push(row(u, 2, null, 'the running total is right from your own row above'));
        return;
      }
      var dx = null;
      if (allFreq && !cfDxDone) { dx = 'CF_NOT_CUMULATIVE'; cfDxDone = true; }
      else if (prev && eqR(mine, prev)) dx = 'CF_SKIPPED_ROW';
      else if (wrongNeighbourAdded(i, mine)) dx = 'CF_WRONG_ROW_ADDED';
      var note = (i === classes.length - 1 && !eqR(mine, rint(truth[i])))
        ? 'the last total should reach ' + truth[truth.length - 1] : null;
      per.push(row(u, 0, dx, note));
    });
    return per;

    function wrongNeighbourAdded(i, mine) {
      var t = rint(truth[i]), j;
      for (j = 0; j < classes.length; j++) {
        if (j === i) continue;
        var f = rint(Number(classes[j].f) || 0);
        if (eqR(mine, radd(t, f)) || eqR(mine, rsub(t, f))) return true;
      }
      return false;
    }
  }

  /* ---------- cfplot ---------- */

  function expectedPoints(q, r) {
    var classes = q.classes || [], cf = cumulate(classes), out = [];
    var start = (q.startPoint === undefined) ? r.startPoint : q.startPoint;
    if (start && classes.length) out.push([R(classes[0].lo), rint(0)]);
    classes.forEach(function (c, i) { out.push([R(c.hi), rint(cf[i])]); });
    return out;
  }
  function ptKey(p) { return rtostr(p[0]) + ',' + rtostr(p[1]); }
  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    var ka = a.map(ptKey).sort(), kb = b.map(ptKey).sort(), i;
    for (i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return false;
    return true;
  }

  function markCfplot(q, S, r, units) {
    var want = expectedPoints(q, r);
    var got = (S.pts || []).map(function (p) { return [R(p[0]), R(p[1])]; })
      .filter(function (p) { return p[0] && p[1]; });
    var classes = q.classes || [], cf = cumulate(classes);
    var uP = units[0], uC = units[1];
    var per = [];

    var exact = sameSet(got, want);
    var dx = null, note = null, earnedOverride = null;
    if (!exact) {
      var startPt = (q.startPoint === undefined) ? (r.startPoint !== false) : q.startPoint;
      var mids = classes.map(function (c, i) { return [rdiv(radd(R(c.lo), R(c.hi)), rint(2)), rint(cf[i])]; });
      if (startPt && classes.length) mids.unshift([R(classes[0].lo), rint(0)]);
      var lows = classes.map(function (c, i) { return [R(c.lo), rint(cf[i])]; });
      var freqs = classes.map(function (c, i) { return [R(c.hi), rint(Number(c.f) || 0)]; });
      var swap = want.map(function (p) { return [p[1], p[0]]; });
      if (sameSet(got, mids)) dx = 'PLOT_MIDPOINT';
      else if (sameSet(got, lows)) dx = 'PLOT_LOWER_BOUND';
      else if (sameSet(got, freqs)) dx = 'PLOT_FREQ_NOT_CF';
      else if (sameSet(got, swap)) dx = 'PLOT_AXES_SWAPPED';
      else {
        var d = setDiff(got, want);
        if (d.missing.length === 1 && d.extra.length === 1 && oneSquareApart(d.extra[0], d.missing[0], q)) {
          dx = 'PLOT_ONE_OUT';
          note = 'one point is a square out';
          earnedOverride = Math.max(0, uP.w - 1);
        } else if (d.missing.length === 1 && d.extra.length === 0) {
          note = 'one point is missing';
          earnedOverride = Math.max(0, uP.w - 1);
        } else if (d.extra.length && !d.missing.length) {
          note = 'there is an extra point';
        }
      }
    }
    var pRow = row(uP, exact ? 1 : 0, dx, note);
    if (!exact && earnedOverride !== null) pRow.earned = earnedOverride;
    per.push(pRow);

    var joined = !!S.joined;
    var monotone = curveMonotone(got.map(function (p) { return [p[0], p[1]]; }));
    if (!joined) per.push(row(uC, 0, null, 'the points are not joined'));
    else if (exact) per.push(row(uC, 1, null, null));
    else if (monotone) per.push(row(uC, 2, null, 'a smooth curve through your own points'));
    else per.push(row(uC, 0, null, 'the curve does not rise all the way'));
    return per;
  }
  function setDiff(got, want) {
    var kg = got.map(ptKey), kw = want.map(ptKey);
    var missing = want.filter(function (p) { return kg.indexOf(ptKey(p)) === -1; });
    var extra = got.filter(function (p) { return kw.indexOf(ptKey(p)) === -1; });
    return { missing: missing, extra: extra };
  }
  function oneSquareApart(a, b, q) {
    var sq = (q.chart && q.chart.sq) || { x: 1, y: 1 };
    var dx = rabs(rsub(a[0], b[0])), dy = rabs(rsub(a[1], b[1]));
    var sx = R(sq.x) || rint(1), sy = R(sq.y) || rint(1);
    var okx = req(dx, rint(0)) || req(dx, sx);
    var oky = req(dy, rint(0)) || req(dy, sy);
    return okx && oky && !(req(dx, rint(0)) && req(dy, rint(0)));
  }

  /* ---------- cfread ---------- */

  function markCfread(q, S, r, units) {
    var n = Number(q.n) || 0;
    var heights = readHeights(n, r.curveRule);
    var reads = S.reads || {};
    var tol = R(r.readTol == null ? 1 : r.readTol) || rint(1);
    var sqx = R((q.chart && q.chart.sq && q.chart.sq.x) || 1) || rint(1);
    var tolX = rmul(tol, sqx);
    var per = [], ui = 0;

    (q.ask || []).forEach(function (a) {
      if (typeof a === 'string') {
        if (a === 'IQR') {
          per.push(markReadIqr(q, S, r, units[ui++], heights, reads, tolX));
          return;
        }
        var uR = units[ui++], uV = units[ui++];
        var rec = reads[a] || {};
        var h = R(rec.h), x = R(rec.x);
        var wantH = heights[a === 'median' ? 'median' : a];
        /* A READING IS JUDGED TO THE GRID'S RESOLUTION (DESIGN 4.4 / 6.2 as
           corrected 12 Sept 2026, the steward's q17 finding). For n = 50 the
           split50 convention wants the rule at (n+1)/2 = 25.5, and a rule that
           moves in whole small squares of 2 (half a square dragged) can never
           stand there - so RULE_median was a cross for every pupil who read the
           javelin curve right. The rule is right when it is within half a
           small square of the convention height, STRICTLY: 25 and 26 are both
           right for 25.5; 26 is wrong for 25 (a whole square out). */
        if (!h) per.push(row(uR, 0, null, 'the rule was not moved'));
        else if (ruleAtHeight(h, wantH, q)) per.push(row(uR, 1, null, null));
        else per.push(row(uR, 0, ruleDx(a, h, wantH, heights, q), null));

        var trueX = curveX(q.curve, wantH);
        var theirX = h ? curveX(q.curve, h) : null;
        if (!x) per.push(row(uV, 0, null, 'no value was read'));
        else if (trueX && within(x, trueX, tolX)) per.push(row(uV, 1, null, null));
        else if (theirX && within(x, theirX, tolX)) per.push(row(uV, 2, null, 'read correctly from your own rule'));
        else if (h && eqR(x, h)) per.push(row(uV, 0, 'READ_REPORTED_HEIGHT', null));
        else per.push(row(uV, 0, null, null));
        return;
      }
      if (a && a.type === 'atX') {
        var uRX = units[ui++], uCF = units[ui++], uA = units[ui++];
        /* a question may ask for TWO reads at two values (the CF notes ask at
           167 cm and at 153 cm), so each is stored under its own key and the
           bare `atX` slot is kept for the single-read shape */
        var at = reads['atX@' + a.x] || (reads.atX && reads.atX.x !== undefined ? reads.atX : {}) || {};
        var gx = R(at.x), gcf = R(at.cf);
        var wantX = R(a.x);
        if (!gx) per.push(row(uRX, 0, null, 'the rule was not moved'));
        else if (eqR(gx, wantX)) per.push(row(uRX, 1, null, null));
        else per.push(row(uRX, 0, null, null));

        var trueCf = curveY(q.curve, wantX);
        var theirCf = gx ? curveY(q.curve, gx) : null;
        var tolY = rmul(tol, R((q.chart && q.chart.sq && q.chart.sq.y) || 1) || rint(1));
        if (!gcf) per.push(row(uCF, 0, null, 'no reading was taken'));
        else if (trueCf && within(gcf, trueCf, tolY)) per.push(row(uCF, 1, null, null));
        else if (theirCf && within(gcf, theirCf, tolY)) per.push(row(uCF, 2, null, 'read from your own rule'));
        else per.push(row(uCF, 0, null, null));

        per.push(markAtXAnswer(q, S, a, uA, trueCf, gcf, n));
        return;
      }
    });
    return per;
  }

  /* |h - wantH| < sq.y / 2, strictly - half a small square of the board the
     question is drawn on (sq.y defaults to 1) */
  function ruleAtHeight(h, wantH, q) {
    if (!h || !wantH) return false;
    var sqy = R((q.chart && q.chart.sq && q.chart.sq.y) || 1) || rint(1);
    var half = rdiv(sqy, rint(2));
    return rlt(rabs(rsub(h, wantH)), half);
  }

  function ruleDx(item, h, wantH, heights, q) {
    var axisMax = R(q.chart && q.chart.y && q.chart.y.max);
    if (axisMax && eqR(h, rdiv(axisMax, rint(2)))) return 'READ_HALF_AXIS';
    if (item === 'Q1' && eqR(h, heights.Q3)) return 'READ_Q_SWAPPED';
    if (item === 'Q3' && eqR(h, heights.Q1)) return 'READ_Q_SWAPPED';
    var xs = (q.curve || []).map(function (p) { return R(p[0]); });
    var i;
    for (i = 0; i < xs.length; i++) if (xs[i] && eqR(h, xs[i])) return 'READ_WRONG_AXIS';
    return null;
  }

  function markAtXAnswer(q, S, a, u, trueCf, theirCf, n) {
    var answers = S.answers || {};
    var raw = answers['atX@' + a.x] !== undefined ? answers['atX@' + a.x] : S.answer;
    var given = R(raw);
    if (!given) return row(u, 0, null, 'left blank');
    var N = rint(n);
    function fromCf(cf) {
      if (!cf) return null;
      if (a.want === 'countBelow') return cf;
      if (a.want === 'countAbove') return rsub(N, cf);
      if (a.want === 'pctBelow') return roundWhole(rmul(rdiv(cf, N), rint(100)));
      if (a.want === 'pctAbove') return roundWhole(rmul(rdiv(rsub(N, cf), N), rint(100)));
      return null;
    }
    var truth = fromCf(trueCf), mine = fromCf(theirCf);
    if (truth && eqR(given, truth)) return row(u, 1, null, null);
    if (mine && eqR(given, mine)) return row(u, 2, null, 'from your own reading');
    if (trueCf && (a.want === 'countAbove') && eqR(given, trueCf)) return row(u, 0, 'READ_COUNT_NOT_COMPLEMENT', null);
    if (trueCf && (a.want === 'countBelow') && eqR(given, rsub(N, trueCf))) return row(u, 0, 'READ_COUNT_NOT_COMPLEMENT', null);
    var axisMax = R(q.chart && q.chart.y && q.chart.y.max);
    if (axisMax && trueCf && /^pct/.test(a.want)) {
      var wrongTotal = a.want === 'pctAbove'
        ? roundWhole(rmul(rdiv(rsub(axisMax, trueCf), axisMax), rint(100)))
        : roundWhole(rmul(rdiv(trueCf, axisMax), rint(100)));
      if (eqR(given, wrongTotal)) return row(u, 0, 'PCT_OF_WRONG_TOTAL', null);
    }
    return row(u, 0, null, null);
  }
  function roundWhole(r) { return rint(Math.round(rnum(r))); }

  /* An interquartile range read off a curve is the difference of TWO estimates,
     and the scheme allows a small square either way on each of them - so the
     difference is allowed two. Exactness here would fail every pupil and every
     model attempt alike: on a grid of 2 the true quartiles of the javelin curve
     fall at 80.7 and 85.4, which no pupil can key and no board can show. */
  function markReadIqr(q, S, r, u, heights, reads, tolX) {
    var given = R(S.iqr);
    if (!given) return row(u, 0, null, 'left blank');
    var trueQ1 = curveX(q.curve, heights.Q1), trueQ3 = curveX(q.curve, heights.Q3);
    var truth = (trueQ1 && trueQ3) ? rsub(trueQ3, trueQ1) : null;
    var mineQ1 = R(reads.Q1 && reads.Q1.x), mineQ3 = R(reads.Q3 && reads.Q3.x);
    var mine = (mineQ1 && mineQ3) ? rsub(mineQ3, mineQ1) : null;
    var band = tolX ? rmul(rint(2), tolX) : rint(0);
    if (truth && within(given, truth, band)) return row(u, 1, null, null);
    if (mine && eqR(given, mine)) return row(u, 2, null, 'from your own readings');
    if (mineQ1 && mineQ3 && eqR(given, radd(mineQ3, mineQ1))) return row(u, 0, 'IQR_ADDED', null);
    if (mineQ1 && mineQ3 && eqR(given, rsub(mineQ1, mineQ3))) return row(u, 0, 'IQR_NEGATED', null);
    return row(u, 0, null, null);
  }

  function within(a, b, tol) { return rle(rabs(rsub(a, b)), tol); }

  /* ---------- boxplot ---------- */

  var FIVE = ['min', 'Q1', 'Q2', 'Q3', 'max'];

  function boxTruth(q, r) {
    /* FROM A CURVE the paper gives the least and the greatest and she reads the
       three cuts off her own graph, so the truth is half printed and half
       derived - taking q.given alone left the three quartiles undefined and no
       box could ever be right. */
    if (q.from === 'curve' && q.curve) {
      var heights = readHeights(Number(q.n) || 0, r.curveRule);
      var o2 = {
        min: R(q.given && q.given.min), max: R(q.given && q.given.max),
        Q1: curveX(q.curve, heights.Q1), Q2: curveX(q.curve, heights.median), Q3: curveX(q.curve, heights.Q3)
      };
      if (q.given) {
        if (q.given.Q1 !== undefined) o2.Q1 = R(q.given.Q1);
        if (q.given.Q2 !== undefined) o2.Q2 = R(q.given.Q2);
        if (q.given.Q3 !== undefined) o2.Q3 = R(q.given.Q3);
      }
      return o2;
    }
    if (q.given) {
      var out = {}, i;
      for (i = 0; i < FIVE.length; i++) out[FIVE[i]] = R(q.given[FIVE[i]]);
      return out;
    }
    if (q.from === 'qlist') {
      var f = fiveNumber(q.values || [], r.quartileRule);
      return f ? { min: f.min, Q1: f.Q1, Q2: f.Q2, Q3: f.Q3, max: f.max } : null;
    }
    if (q.answer) {
      var o = {}, j;
      for (j = 0; j < FIVE.length; j++) o[FIVE[j]] = R(q.answer[FIVE[j]]);
      return o;
    }
    return null;
  }

  /* The five numbers the pupil's OWN first stage produced. */
  function boxTheirFive(q, S, r) {
    if (!q.from) return null;
    var out = {}, i;
    if (q.from === 'qlist') {
      var vals = Rs(q.values || []), order = S.stage && S.stage.order ? S.stage.order : [];
      var rowVals = order.map(function (k) { return vals[k]; }).filter(function (x) { return !!x; });
      if (rowVals.length !== vals.length) return null;
      var picks = (S.stage && S.stage.picks) || {};
      function pick(c) {
        var p = picks[c];
        if (!p || !p.length) return null;
        if (p.length === 1) return rowVals[p[0]] || null;
        var a = rowVals[p[0]], b = rowVals[p[1]];
        return (a && b) ? rdiv(radd(a, b), rint(2)) : null;
      }
      out.min = rowVals[0]; out.max = rowVals[rowVals.length - 1];
      out.Q1 = pick('Q1'); out.Q2 = pick('Q2'); out.Q3 = pick('Q3');
      return out;
    }
    if (q.from === 'curve') {
      var reads = (S.stage && S.stage.reads) || {};
      out.Q1 = R(reads.Q1 && reads.Q1.x);
      out.Q2 = R((reads.median && reads.median.x) || (reads.Q2 && reads.Q2.x));
      out.Q3 = R(reads.Q3 && reads.Q3.x);
      out.min = R(q.given && q.given.min); out.max = R(q.given && q.given.max);
      return out;
    }
    if (q.from === 'values') {
      var v = (S.stage && S.stage.v) || {};
      for (i = 0; i < FIVE.length; i++) out[FIVE[i]] = R(v[FIVE[i]]);
      return out;
    }
    return null;
  }

  function markBoxplot(q, S, r, units) {
    var per = [], stageRows = [];
    /* a box plot built from HER OWN read-offs carries the curve's tolerance on
       its three cuts: she is placing an estimate, not a printed number */
    var boxTol = (q.from === 'curve')
      ? rmul(R(r.readTol == null ? 1 : r.readTol) || rint(1),
             R((q.chart && q.chart.sq && q.chart.sq.x) || (q.scale && q.scale.sq) || 1) || rint(1))
      : rint(0);

    if (q.from) {
      var stageQ = {}, k;
      for (k in q) if (q.hasOwnProperty(k)) stageQ[k] = q[k];
      stageQ.kind = q.from === 'curve' ? 'cfread' : q.from;
      delete stageQ.from;
      var sUnits = unitsOf(stageQ, r);
      var sState = S.stage || {};
      switch (stageQ.kind) {
        case 'qlist': stageRows = markQlist(stageQ, sState, r, sUnits); break;
        case 'cfread': stageRows = markCfread(stageQ, sState, r, sUnits); break;
        case 'values': stageRows = markValues(stageQ, sState, r, sUnits); break;
        default: stageRows = [];
      }
      per = per.concat(stageRows);
    }
    var uBox = units[units.length - 2], uWh = units[units.length - 1];
    var truth = boxTruth(q, r), mine = boxTheirFive(q, S, r);
    var pos = S.pos || {};
    var got = {}, i;
    for (i = 0; i < FIVE.length; i++) got[FIVE[i]] = R(pos[FIVE[i]]);

    var unplaced = FIVE.filter(function (k2) { return !got[k2]; });
    var boxOk = markGroup(['Q1', 'Q2', 'Q3']);
    var whOk = markGroup(['min', 'max']);

    var dxAll = boxDx(q, got, truth, r);
    per.push(finish(uBox, boxOk, ['Q1', 'Q2', 'Q3']));
    if (!S.drawn) per.push(row(uWh, 0, null, 'the box plot was not drawn'));
    else per.push(finish(uWh, whOk, ['min', 'max']));
    return per;

    function markGroup(keys) {
      var allTrue = truth && keys.every(function (k2) { return got[k2] && truth[k2] && within(got[k2], truth[k2], boxTol); });
      if (allTrue) return 1;
      var allMine = mine && keys.every(function (k2) { return got[k2] && mine[k2] && eqR(got[k2], mine[k2]); });
      if (allMine) return 2;
      return 0;
    }
    function finish(u, ok, keys) {
      if (!S.drawn && u === uBox) return row(u, ok, ok === 0 ? dxAll : null, 'the box plot was not drawn');
      var miss = keys.filter(function (k2) { return !got[k2]; });
      if (miss.length) return row(u, 0, null, 'a marker was not placed');
      return row(u, ok, ok === 0 ? dxAll : null, ok === 2 ? 'from your own values' : null);
    }
  }

  function boxDx(q, got, truth, r) {
    if (!truth) return null;
    if (got.min && got.Q1 && truth.min && truth.Q1 &&
        eqR(got.min, truth.Q1) && eqR(got.Q1, truth.min)) return 'BOX_WHISKER_SWAP';
    if (got.max && got.Q3 && truth.max && truth.Q3 &&
        eqR(got.max, truth.Q3) && eqR(got.Q3, truth.max)) return 'BOX_WHISKER_SWAP';
    if (q.n) {
      var heights = readHeights(Number(q.n), r.curveRule);
      if (got.Q2 && eqR(got.Q2, heights.median)) return 'BOX_CF_AS_VALUES';
      if (got.max && eqR(got.max, rint(Number(q.n)))) return 'BOX_MAX_IS_N';
    }
    if (got.Q1 && got.Q3 && got.Q2 && truth.Q2 &&
        eqR(got.Q2, rdiv(radd(got.Q1, got.Q3), rint(2))) && !eqR(got.Q2, truth.Q2)) return 'BOX_MEDIAN_CENTRED';
    return null;
  }

  /* ---------- compare ---------- */

  function markCompare(q, S, r, units) {
    var plots = q.plots || [], ctx = q.context || {};
    var A0 = plots[0] || { label: 'A', summary: {} }, B0 = plots[1] || { label: 'B', summary: {} };
    var medA = R(A0.summary.Q2), medB = R(B0.summary.Q2);
    var s1 = S.s1 || {}, s2 = S.s2 || {};
    var per = [];

    /* sentence 1: who had the higher median, and what that means in context */
    var higher = (medA && medB) ? (rlt(medB, medA) ? A0.label : (rlt(medA, medB) ? B0.label : null)) : null;
    var uM = units[0];
    if (!s1.who) per.push(row(uM, 0, null, 'the first sentence is not finished'));
    else if (higher === null && q.equal) per.push(row(uM, s1.who === 'same' ? 1 : 0, null, null));
    else if (s1.who !== higher) per.push(row(uM, 0, 'CMP_WRONG_GROUP', null));
    else if (s1.who2 !== s1.who) per.push(row(uM, 0, 'CMP_WRONG_GROUP', null));
    else if (s1.ctx !== contextWord(ctx, true)) per.push(row(uM, 0, 'CMP_CONTEXT_FLIPPED', null));
    else if (!valuesMatch(s1.v, orderBy(s1.who, medA, medB), q)) per.push(row(uM, 0, 'CMP_VALUES_WRONG', null));
    else per.push(row(uM, 1, null, null));

    /* sentence 2: spread, in whichever measure the pupil chose */
    var uS = units[1];
    var meas = s2.meas === 'range' ? 'range' : 'iqr';
    var spA = spread(A0.summary, meas), spB = spread(B0.summary, meas);
    var bigger = (spA && spB) ? (rlt(spB, spA) ? A0.label : (rlt(spA, spB) ? B0.label : null)) : null;
    if (!s2.who) per.push(row(uS, 0, null, 'the second sentence is not finished'));
    else {
      var wantSize = (s2.who === bigger) ? 'larger' : 'smaller';
      var otherSp = otherMeasure(A0.summary, B0.summary, meas);
      if (s2.who !== bigger && s2.who !== otherLabel(bigger, A0, B0)) per.push(row(uS, 0, 'CMP_WRONG_GROUP', null));
      else if (s2.size !== wantSize) per.push(row(uS, 0, 'CMP_WRONG_GROUP', null));
      else if (!consistent(s2.size, s2.cons)) per.push(row(uS, 0, 'CMP_SPREAD_MEANING', null));
      else if (valuesMatch(s2.v, orderBy(s2.who, otherSp[0], otherSp[1]), q)) per.push(row(uS, 0, 'CMP_MEASURE_VALUES_SWAPPED', null));
      else if (!valuesMatch(s2.v, orderBy(s2.who, spA, spB), q)) per.push(row(uS, 0, 'CMP_VALUES_WRONG', null));
      else per.push(row(uS, 1, null, null));
    }
    return per;

    function otherLabel(l, a, b) { return l === a.label ? b.label : a.label; }
    function orderBy(who, forA, forB) { return who === A0.label ? [forA, forB] : [forB, forA]; }
    function otherMeasure(sa, sb, m) {
      var o = m === 'range' ? 'iqr' : 'range';
      return [spread(sa, o), spread(sb, o)];
    }
  }
  function spread(sum, meas) {
    if (meas === 'range') {
      var mn = R(sum.min), mx = R(sum.max);
      return (mn && mx) ? rsub(mx, mn) : null;
    }
    var a = R(sum.Q1), b = R(sum.Q3);
    return (a && b) ? rsub(b, a) : null;
  }
  function contextWord(ctx, higher) {
    var pair = ctx.words || [];
    if (pair.length !== 2) return null;
    return higher ? pair[0] : pair[1];
  }
  function consistent(size, cons) {
    if (size === 'larger') return cons === 'less';
    if (size === 'smaller') return cons === 'more';
    return false;
  }
  function valuesMatch(v, want, q) {
    if (!want || !want[0] || !want[1]) return false;
    var a = R(v && v[0]), b = R(v && v[1]);
    if (!a || !b) return false;
    var tol = R(q.readTol || 0) || rint(0);
    return within(a, want[0], tol) && within(b, want[1], tol);
  }

  /* ---------- judge ---------- */

  function markJudge(q, S, r, units) {
    var claims = q.claims || [], j = S.j || [], per = [], ui = 0;
    claims.forEach(function (c, i) {
      var uJ = units[ui++], mine = j[i] || {};
      if (c.options) {
        var v = mine.v;
        if (!v) per.push(row(uJ, 0, null, 'not answered'));
        else if (v === c.verdict) per.push(row(uJ, 1, null, null));
        else per.push(row(uJ, 0, tfnDx(c, v), null));
        return;
      }
      var said = mine.fair;
      if (said === undefined || said === null) per.push(row(uJ, 0, null, 'not answered'));
      else if (said === c.fair) per.push(row(uJ, 1, null, null));
      else if (c.fair === false && said === true) {
        per.push(row(uJ, 0, c.why === 'ESTIMATE' ? 'JUDGE_OVERCLAIM' : 'JUDGE_ACCEPTS_CLAIM', null));
      } else per.push(row(uJ, 0, 'JUDGE_REJECTS_FAIR', null));

      if (c.fair === false) {
        var uW = units[ui++];
        if (said !== false) { per.push(row(uW, 0, null, 'no reason was needed until the claim is called not fair')); return; }
        if (!mine.why) { per.push(row(uW, 0, null, 'no reason given')); return; }
        if (mine.why === c.why) { per.push(row(uW, 1, null, null)); return; }
        if ((c.alsoWhy || []).indexOf(mine.why) > -1) { per.push(row(uW, 2, null, 'another fair reason')); return; }
        per.push(row(uW, 0, 'JUDGE_WRONG_REASON', null));
      }
    });
    return per;
  }
  function tfnDx(c, v) {
    if (c.verdict === 'Not enough information' && v === 'True') return 'TFN_GROUPED_EXACT';
    if (c.verdict === 'True' && v === 'False') return 'TFN_ESTIMATE_AS_FALSE';
    return null;
  }

  /* ---------- values ---------- */

  function markValues(q, S, r, units) {
    var order = q.order || (q.slots || []).map(function (s) { return s.id; });
    var v = S.v || {}, got = {}, per = [];
    order.forEach(function (id) { got[id] = R(v[id]); });
    order.forEach(function (id, i) {
      var u = units[i], slot = slotById(q, id) || {};
      var mine = got[id];
      if (!mine) {
        /* a blank OUTSIDE region is the classic Venn slip, not an unfinished board */
        per.push(row(u, 0, slot.region === 'out' ? 'VENN_OUTSIDE_LOST' : null, 'left blank'));
        return;
      }
      var want = R(slot.answer && slot.answer.constraints ? null : slot.answer);
      if (slot.answer && slot.answer.constraints) {
        per.push(row(u, constraintsHold(slot, S) ? 1 : 0, null, null));
        return;
      }
      var tol = R(slot.tol || 0) || rint(0);
      if (want && within(mine, want, tol)) { per.push(row(u, 1, null, null)); return; }
      var ftv = slot.ft && FT_RULES[slot.ft.rule] ? FT_RULES[slot.ft.rule](slot, q, got, S.stage) : null;
      if (ftv && within(mine, ftv, tol) && (!want || !eqR(ftv, want))) {
        per.push(row(u, 2, null, 'from your own earlier answer'));
        return;
      }
      per.push(row(u, 0, slot.dx || valuesDx(slot, q, mine), null));
    });
    return per;
  }
  function constraintsHold(slot, S) {
    var set = Rs((S.v && S.v[slot.id + '_set']) || []);
    var cons = slot.answer.constraints || {}, ok = true;
    if (!set.length) return false;
    if (cons.n !== undefined && set.length !== cons.n) ok = false;
    if (cons.mean !== undefined) {
      var s = set.reduce(function (a, b) { return radd(a, b); }, rint(0));
      if (!eqR(rdiv(s, rint(set.length)), R(cons.mean))) ok = false;
    }
    if (cons.median !== undefined && !eqR(medianOf(sortR(set)), R(cons.median))) ok = false;
    if (cons.range !== undefined) {
      var srt = sortR(set);
      if (!eqR(rsub(srt[srt.length - 1], srt[0]), R(cons.range))) ok = false;
    }
    return ok;
  }

  /* The Venn slips (DESIGN §17.1): an "only" region holding the circle's
     whole total; the outside forgotten - the outside slot at 0, or `both`
     computed as A + B - N. Only when the pack has not named a dx itself. */
  function valuesDx(slot, q, mine) {
    var ft = slot.ft || {}, fig = q.fig || {}, totals = fig.totals || {};
    var circle = ft.rule === 'venn.only' ? ft.of : (slot.region && totals[slot.region] !== undefined ? slot.region : null);
    if (circle !== null && circle !== undefined) {
      var tot = R(figTotal(q, circle));
      if (tot && eqR(mine, tot)) return 'VENN_TOTAL_AS_ONLY';
    }
    if (slot.region === 'out' && eqR(mine, rint(0))) return 'VENN_OUTSIDE_LOST';
    if (ft.rule === 'venn.both.fromTotals') {
      var a = R(figTotal(q, ft.of[0])), b = R(figTotal(q, ft.of[1])), n = R(fig.n);
      if (a && b && n && eqR(mine, rsub(radd(a, b), n))) return 'VENN_OUTSIDE_LOST';
    }
    return null;
  }

  /* ---------- order ---------- */

  function markOrder(q, S, r, units) {
    var answer = (q.answer || []).map(Number), n = answer.length;
    var seq = (S.seq || []).map(Number);
    var complete = seq.length === n && answer.every(function (a) { return seq.indexOf(a) > -1; });
    if (!q.cyclic) {
      var u = units[0];
      if (!complete) return [row(u, 0, null, 'not every card is in the row')];
      var same = seq.every(function (v, i) { return v === answer[i]; });
      return [row(u, same ? 1 : 0, null, same ? null : 'the cards are not in the right order')];
    }
    var pairs = {}, i;
    for (i = 0; i < n; i++) pairs[answer[i] + '>' + answer[(i + 1) % n]] = true;
    return units.map(function (u2, k) {
      if (!complete) return row(u2, 0, null, 'not every card is in the row');
      var ok = !!pairs[seq[k] + '>' + seq[(k + 1) % n]];
      return row(u2, ok ? 1 : 0, null, ok ? null : 'these two do not follow each other');
    });
  }

  /* ---------- pick ---------- */

  function markPick(q, S, r, units) {
    var opts = q.options || [], best = -1, flaws = [], i;
    for (i = 0; i < opts.length; i++) {
      if (opts[i].best) best = i;
      else if (opts[i].flaw) flaws.push(opts[i].flaw);
    }
    var per = [], uP = units[0], uW = units[1];
    var pick = (S.pick === undefined || S.pick === null || S.pick === '') ? null : Number(S.pick);
    if (pick === null || isNaN(pick)) per.push(row(uP, 0, null, 'no question chosen'));
    else per.push(row(uP, pick === best ? 1 : 0, null, pick === best ? null : 'the better question is another one'));
    if (!S.why) per.push(row(uW, 0, null, 'no reason given'));
    else if (flaws.indexOf(S.why) > -1) per.push(row(uW, 1, null, null));
    else per.push(row(uW, 0, 'JUDGE_WRONG_REASON', null));
    return per;
  }

  /* ---------- stemleaf ---------- */

  /* The split. decimals 0: 36 -> 3 | 6. decimals 1: 3.6 -> 3 | 6. Done as one
     rule on the value scaled to an integer, so both are exact. */
  function stemLeafOf(value, decimals) {
    var v = R(value);
    if (!v) return null;
    var scale = rint(Math.pow(10, Number(decimals) || 0));
    var N = Math.round(rnum(rmul(v, scale)));
    var stem = Math.floor(N / 10), leaf = N - stem * 10;
    return { stem: stem, leaf: leaf };
  }
  /* {stem: [leaf digits ascending]} - the true rows for a list of values */
  function stemleafRows(values, decimals) {
    var rows = {};
    (values || []).forEach(function (v) {
      var sl = stemLeafOf(v, decimals);
      if (!sl) return;
      (rows[sl.stem] = rows[sl.stem] || []).push(sl.leaf);
    });
    Object.keys(rows).forEach(function (k) { rows[k].sort(function (a, b) { return a - b; }); });
    return rows;
  }
  function slPairs(rows) {
    var out = [];
    Object.keys(rows || {}).forEach(function (stem) {
      (rows[stem] || []).forEach(function (leaf) {
        if (leaf === '' || leaf === null || leaf === undefined) return;
        out.push({ stem: Number(stem), leaf: Number(leaf) });
      });
    });
    return out;
  }
  function pairDiff(got, want) {
    var key = function (p) { return p.stem + '|' + p.leaf; };
    var pool = want.map(key), extra = [], missing, i, at;
    for (i = 0; i < got.length; i++) {
      at = pool.indexOf(key(got[i]));
      if (at === -1) extra.push(got[i]); else pool.splice(at, 1);
    }
    missing = pool.map(function (k) { var p = k.split('|'); return { stem: Number(p[0]), leaf: Number(p[1]) }; });
    return { missing: missing, extra: extra };
  }

  function markStemleaf(q, S, r, units) {
    var dec = Number(q.decimals) || 0;
    var done = (q.prefill && q.prefill.stemsDone) ? q.prefill.stemsDone.map(Number) : [];
    var want = (q.values || []).map(function (v) { return stemLeafOf(v, dec); })
      .filter(function (p) { return p && done.indexOf(p.stem) === -1; });
    var rows = S.rows || {}, got = slPairs(rows);
    var per = [], byId = {};
    units.forEach(function (u) { byId[u.id] = u; });

    var uL = byId.LEAVES, d = pairDiff(got, want);
    if (!got.length) per.push(row(uL, 0, null, 'no leaves placed'));
    else if (!d.missing.length && !d.extra.length) per.push(row(uL, 1, null, null));
    else {
      var wrongStem = d.extra.some(function (e) {
        return d.missing.some(function (m) { return m.leaf === e.leaf && m.stem !== e.stem; });
      });
      per.push(row(uL, 0, wrongStem ? 'SL_WRONG_STEM' : 'SL_MISSED_LEAF',
        wrongStem ? null : (d.missing.length ? 'a value is missing' : 'a value is in twice')));
    }

    var uO = byId.ORDERED;
    if (!got.length) per.push(row(uO, 0, null, 'no leaves placed'));
    else {
      var ordered = Object.keys(rows).every(function (stem) {
        var leaves = (rows[stem] || []).map(Number), i;
        for (i = 1; i < leaves.length; i++) if (leaves[i] < leaves[i - 1]) return false;
        return true;
      });
      per.push(row(uO, ordered ? 1 : 0, ordered ? null : 'SL_UNORDERED', null));
    }

    if (byId.KEY) {
      var uK = byId.KEY, key = S.key || {};
      if (key.stem === undefined || key.stem === null || key.stem === '' ||
          key.leaf === undefined || key.leaf === null || key.leaf === '') {
        per.push(row(uK, 0, null, 'no key built'));
      } else {
        var truth = stemleafRows(q.values || [], dec);
        var okK = (truth[Number(key.stem)] || []).indexOf(Number(key.leaf)) > -1;
        per.push(row(uK, okK ? 1 : 0, okK ? null : 'SL_KEY_WRONG', null));
      }
    }
    return per;
  }

  /* ---------- pie ---------- */

  /* {catId: rational degrees}; total defaults to the sum of the frequencies */
  function pieAngles(cats, total) {
    var out = {}, tot = R(total);
    if (!tot) tot = (cats || []).reduce(function (a, c) { return radd(a, R(c.f) || rint(0)); }, rint(0));
    (cats || []).forEach(function (c) {
      var f = R(c.f);
      out[c.id] = (f && tot.n !== 0) ? rdiv(rmul(f, rint(360)), tot) : null;
    });
    return out;
  }

  function markPie(q, S, r, units) {
    var cats = q.cats || [], tot = R(q.total), n = cats.length;
    var truth = pieAngles(cats, q.total);
    var angles = S.angles || {}, mine = {}, per = [], byId = {}, i;
    units.forEach(function (u) { byId[u.id] = u; });
    cats.forEach(function (c) { mine[c.id] = R(angles[c.id]); });
    var allIn = cats.every(function (c) { return !!mine[c.id]; });

    /* the two column-wide slips, judged once */
    var pctTol = rat(1, 20);                                /* a percentage keyed to 1 dp */
    var allPct = allIn && tot && cats.every(function (c) {
      return within(mine[c.id], rdiv(rmul(R(c.f), rint(100)), tot), pctTol);
    });
    var wrongTotal = null;
    if (allIn && !allPct && cats.every(function (c) { return mine[c.id].n !== 0; })) {
      var T = null, same = true;
      cats.forEach(function (c) {
        var t = rdiv(rmul(R(c.f), rint(360)), mine[c.id]);
        if (T === null) T = t; else if (!req(T, t)) same = false;
      });
      if (same && T && tot && !req(T, tot)) wrongTotal = T;
    }
    var first = mine[cats[0] && cats[0].id], f0 = cats[0] ? R(cats[0].f) : null;

    cats.forEach(function (c, k) {
      var u = byId['ANG_' + c.id], m = mine[c.id], want = truth[c.id];
      if (!m) { per.push(row(u, 0, null, 'left blank')); return; }
      if (want && eqR(m, want)) { per.push(row(u, 1, null, null)); return; }
      /* a follow-through needs a first angle that IS an angle: a percentage
         column is one slip repeated, not a slip carried through */
      if (k > 0 && !allPct && first && f0 && f0.n !== 0) {
        var ftv = rmul(rdiv(first, f0), R(c.f));
        if (eqR(m, ftv) && !eqR(ftv, want)) { per.push(row(u, 2, null, 'from your own first angle')); return; }
      }
      per.push(row(u, 0, allPct ? 'PIE_PCT_NOT_DEG' : (wrongTotal ? 'PIE_TOTAL_WRONG' : null), null));
    });

    var uS = byId.SUM;
    if (!allIn) per.push(row(uS, 0, null, 'left blank'));
    else {
      var sum = cats.reduce(function (a, c) { return radd(a, mine[c.id]); }, rint(0));
      var ok360 = eqR(sum, rint(360));
      per.push(row(uS, ok360 ? 1 : 0, null, ok360 ? null : 'the angles add to ' + rstr2(sum) + ', not 360'));
    }

    var uB = byId.SECTORS, bounds = (S.bounds || []).map(R), tol = rint(2);
    if (bounds.length < n || bounds.slice(0, Math.max(0, n - 1)).some(function (b) { return !b; })) {
      per.push(row(uB, 0, null, 'not every boundary is placed'));
    } else {
      var runT = rint(0), runM = rint(0), okTrue = true, okMine = allIn;
      for (i = 0; i < n - 1; i++) {
        runT = radd(runT, truth[cats[i].id] || rint(0));
        if (!within(bounds[i], runT, tol)) okTrue = false;
        if (allIn) {
          runM = radd(runM, mine[cats[i].id]);
          if (!within(bounds[i], runM, tol)) okMine = false;
        }
      }
      if (okTrue) per.push(row(uB, 1, null, null));
      else if (okMine) per.push(row(uB, 2, null, 'drawn to your own angles'));
      else per.push(row(uB, 0, 'PIE_SECTOR_OFF', null));
    }

    var uLb = byId.LABELS, labels = S.labels || {};
    var placed = cats.every(function (c, k) { return labels[k] !== undefined && labels[k] !== null && labels[k] !== ''; });
    if (!placed) per.push(row(uLb, 0, null, 'not every sector is labelled'));
    else {
      var okL = cats.every(function (c, k) { return labels[k] === c.id; });
      per.push(row(uLb, okL ? 1 : 0, null, okL ? null : 'a label is on the wrong sector'));
    }
    return per;
  }

  /* ---------- scatter ---------- */

  /* The least-squares line through a set of points, exact:
     m = (nΣxy − ΣxΣy) / (nΣx² − (Σx)²), c = ȳ − m·x̄. m is null when every x
     is the same. */
  function leastSquares(points) {
    var p = (points || []).map(function (q) { return [R(q[0]), R(q[1])]; })
      .filter(function (q) { return q[0] && q[1]; });
    var n = p.length;
    if (!n) return null;
    var sx = rint(0), sy = rint(0), sxy = rint(0), sxx = rint(0);
    p.forEach(function (q) {
      sx = radd(sx, q[0]); sy = radd(sy, q[1]);
      sxy = radd(sxy, rmul(q[0], q[1])); sxx = radd(sxx, rmul(q[0], q[0]));
    });
    var N = rint(n), meanX = rdiv(sx, N), meanY = rdiv(sy, N);
    var den = rsub(rmul(N, sxx), rmul(sx, sx));
    if (den.n === 0) return { m: null, c: null, meanX: meanX, meanY: meanY, n: n };
    var m = rdiv(rsub(rmul(N, sxy), rmul(sx, sy)), den);
    var c = rsub(meanY, rmul(m, meanX));
    return { m: m, c: c, meanX: meanX, meanY: meanY, n: n };
  }
  /* a line is {m, c} or two points [[x1,y1],[x2,y2]]; null when undrawable */
  function lineOf(line) {
    if (!line) return null;
    if (line.m !== undefined) return (line.m && line.c) ? { m: line.m, c: line.c } : null;
    if (!Array.isArray(line) || line.length < 2) return null;
    var x1 = R(line[0][0]), y1 = R(line[0][1]), x2 = R(line[1][0]), y2 = R(line[1][1]);
    if (!x1 || !y1 || !x2 || !y2 || req(x1, x2)) return null;
    var m = rdiv(rsub(y2, y1), rsub(x2, x1));
    return { m: m, c: rsub(y1, rmul(m, x1)) };
  }
  function lineY(line, x) {
    var L = lineOf(line), X = R(x);
    return (L && X) ? radd(rmul(L.m, X), L.c) : null;
  }
  function lineX(line, y) {
    var L = lineOf(line), Y = R(y);
    if (!L || !Y || L.m.n === 0) return null;
    return rdiv(rsub(Y, L.c), L.m);
  }
  function sqOf(q) {
    var sq = (q.chart && q.chart.sq) || {};
    return { x: R(sq.x) || rint(1), y: R(sq.y) || rint(1) };
  }
  function ptsR(list) {
    return (list || []).map(function (p) { return [R(p[0]), R(p[1])]; })
      .filter(function (p) { return p[0] && p[1]; });
  }
  function sign(r) { return !r ? 0 : (r.n > 0 ? 1 : (r.n < 0 ? -1 : 0)); }

  function markScatter(q, S, r, units) {
    var want = ptsR(q.toPlot), all = ptsR((q.given || []).concat(q.toPlot || []));
    var got = ptsR(S.pts), sq = sqOf(q), per = [], byId = {};
    units.forEach(function (u) { byId[u.id] = u; });

    var uP = byId.POINTS, exact = sameSet(got, want);
    if (exact) per.push(row(uP, 1, null, null));
    else {
      var dx = null, note = null, earned = null;
      if (sameSet(got, want.map(function (p) { return [p[1], p[0]]; }))) dx = 'SC_XY_SWAPPED';
      else {
        var d = setDiff(got, want);
        if (d.missing.length === 1 && d.extra.length === 1) { note = 'one point is out'; earned = Math.max(0, uP.w - 1); }
        else if (d.missing.length === 1 && !d.extra.length) { note = 'one point is missing'; earned = Math.max(0, uP.w - 1); }
        else if (d.extra.length && !d.missing.length) note = 'there is an extra point';
      }
      var pRow = row(uP, 0, dx, note);
      if (earned !== null) pRow.earned = earned;
      per.push(pRow);
    }

    var LS = leastSquares(all), theirs = lineOf(S.line);
    if (byId.LOBF) {
      var uL = byId.LOBF;
      if (!theirs) per.push(row(uL, 0, null, 'the line is not drawn'));
      else if (!LS || !LS.m) per.push(row(uL, 0, null, 'the points give no trend'));
      else {
        var atMean = lineY(theirs, LS.meanX);
        var throughMean = within(atMean, LS.meanY, sq.y);
        var rightSign = sign(theirs.m) === sign(LS.m);
        /* HOW NEAR IS NEAR (12 Sept 2026, Book A's own data). "Within one small
           square" is the right rule on the paper's grid, but a chart whose
           points only land ON the grid at sq.y = 0.1 (M7's engine sizes:
           8.6, 9.4, 5.9 km) makes one square a tenth of a kilometre, and the
           least-squares line itself then has two of seven points "near" it.
           So the band is one small square OR twice the median residual of
           the least-squares line, whichever is wider: the true line always
           passes its own test, and a pupil's line passes when it sits with
           the points as well as the true one does. */
        var F = function (v) { return (v && v.d !== undefined) ? v.n / v.d : Number(v); };
        var resid = all.map(function (p) { return Math.abs(F(p[1]) - F(lineY(LS, p[0]))); }).sort(function (x, y) { return x - y; });
        var medRes = resid.length ? resid[Math.floor((resid.length - 1) / 2)] : 0;
        var band = Math.max(F(sq.y), 2 * medRes);
        var near = all.filter(function (p) { return Math.abs(F(p[1]) - F(lineY(theirs, p[0]))) <= band + 1e-9; }).length;
        var halfNear = near * 2 >= all.length;
        var okL = throughMean && rightSign && halfNear;
        per.push(row(uL, okL ? 1 : 0, okL ? null : 'SC_LINE_OFF_TREND',
          okL ? null : (!throughMean ? 'the line misses the middle of the points' :
                        (!rightSign ? 'the line slopes the wrong way' : 'fewer than half the points are near the line'))));
      }
    }

    if (byId.ESTIMATE) {
      var uE = byId.ESTIMATE, ask = askOf(q, 'estimate') || {}, at = R(ask.at), est = R(S.est);
      var fromY = ask.from === 'y';
      var tolE = fromY ? sq.x : sq.y;
      var trueRead = LS && LS.m && at ? (fromY ? lineX(LS, at) : lineY(LS, at)) : null;
      var mineRead = theirs && at ? (fromY ? lineX(theirs, at) : lineY(theirs, at)) : null;
      if (!est) per.push(row(uE, 0, null, 'left blank'));
      else if (trueRead && within(est, trueRead, tolE)) per.push(row(uE, 1, null, null));
      else if (mineRead && within(est, mineRead, tolE)) per.push(row(uE, 2, null, 'read from your own line'));
      else if (at && eqR(est, at)) per.push(row(uE, 0, 'SC_READ_WRONG_AXIS', null));
      else per.push(row(uE, 0, null, null));
    }

    if (byId.CORR) {
      var uC = byId.CORR, askC = askOf(q, 'corr') || {}, said = S.corr;
      var signs = ['positive', 'negative'];
      if (!said) per.push(row(uC, 0, null, 'no correlation chosen'));
      else if (said === askC.answer) per.push(row(uC, 1, null, null));
      else if (signs.indexOf(said) > -1 && signs.indexOf(askC.answer) > -1) per.push(row(uC, 0, 'SC_CORR_SIGN', null));
      else per.push(row(uC, 0, null, null));
    }

    if (byId.OUTLIER) {
      var uO = byId.OUTLIER, askO = askOf(q, 'outlier') || {};
      var pickO = (S.outlier === undefined || S.outlier === null || S.outlier === '') ? null : Number(S.outlier);
      if (pickO === null || isNaN(pickO)) per.push(row(uO, 0, null, 'no point chosen'));
      else per.push(row(uO, pickO === Number(askO.answer) ? 1 : 0, null,
        pickO === Number(askO.answer) ? null : 'that reading fits the pattern'));
    }
    return per;
  }

  /* ---------- gist: the exercise grid's one-line header (<= 28 chars) ----- */

  function gist(q) {
    var s;
    switch (q.kind) {
      case 'qlist':
        s = askCuts(q).filter(function (c) { return c !== 'IQR'; })
          .map(function (c) { return c === 'Q2' ? 'median' : c; }).join(', ');
        s = (s ? s + ' of ' : 'Quartiles of ') + (q.values || []).length + ' values';
        break;
      case 'cftable': s = 'CF table · ' + (q.classes || []).length + ' classes'; break;
      case 'cfplot': s = 'Plot the CF curve · n = ' + lastCf(q); break;
      case 'cfread': s = readGist(q); break;
      case 'boxplot': s = q.from ? 'Box plot from ' + q.from : 'Box plot'; break;
      case 'compare': s = 'Compare two box plots'; break;
      case 'judge': s = 'Is the claim fair? ×' + (q.claims || []).length; break;
      case 'values': s = (q.slots || []).length + ' values to find'; break;
      case 'order': s = q.cyclic ? 'Put the cycle in order' : 'Put the cards in order'; break;
      case 'pick': s = 'Choose the better question'; break;
      case 'stemleaf': s = 'Stem-and-leaf · n = ' + (q.values || []).length; break;
      case 'pie': s = 'Pie chart · ' + (q.cats || []).length + ' sectors'; break;
      case 'scatter': s = 'Scatter graph · n = ' + ((q.given || []).length + (q.toPlot || []).length); break;
      default: s = q.kind;
    }
    return s.length > 28 ? s.slice(0, 27) + '…' : s;
  }
  function lastCf(q) {
    var c = cumulate(q.classes || []);
    return c.length ? c[c.length - 1] : 0;
  }
  function readGist(q) {
    var names = (q.ask || []).map(function (a) {
      if (typeof a === 'string') return a === 'median' ? 'median' : a;
      return 'a reading';
    });
    if (names.length === 1) return capitalise(names[0]) + ' from the curve';
    return 'From the curve: ' + names.join(', ');
  }
  function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }


  /* ---------- what a MODEL board looks like, and what a slip looks like ----
     ONE HOME (DFM 144). Three callers need this and must never disagree:
     dev/validate-all.js proves the model marks full, tools/qa's walker plays it
     on the real controls, and script.js's demo seed fills the markbook with
     work that has authentic slips in it. It lives here because knowing what a
     right answer looks like is the engine's job. */
  var RULES = null;
  function rnum2(r) { return r && r.d ? r.n / r.d : Number(r); }
  function rstr2(r) {
    if (r == null) return '';
    if (r.d === undefined) return String(r);
    return r.d === 1 ? String(r.n) : String(Math.round((r.n / r.d) * 1e6) / 1e6);
  }
  function isStatKind(k) { return KINDS_LIST.indexOf(k) > -1; }
  var KINDS_LIST = ['qlist', 'cftable', 'cfplot', 'cfread', 'boxplot', 'compare', 'judge', 'values',
                    'order', 'pick', 'stemleaf', 'pie', 'scatter'];
  function modelBoard(q, wrong, rules) {
    RULES = rules || null;
    return statsBoard(q, !!wrong);
  }
/* ----------------------------------------------------------------- stats */
/* The Handling Data kinds store what she BUILT, not a line she wrote, so a
   model attempt is the finished board: the ordered row and its cuts, the
   running totals, the plotted points, the rule heights and readings, the five
   markers, the two sentences, the verdicts. `corrupt` returns the same board
   carrying that kind's own classic slip, so a walk of the wrong path is a walk
   of a real misconception. */
function isStatKind(k) {
  return KINDS_LIST.indexOf(k) > -1;
}

function qlistBoard(q, wrong) {
  var vals = (q.values || []).slice();
  var idx = vals.map(function (v, i) { return i; })
    .sort(function (a, b) { return Number(vals[a]) - Number(vals[b]); });
  var n = idx.length;
  var rule = rulesOf(q, RULES).quartileRule;
  var pos = quartilePositions(n, rule);
  var picks = {}, cuts = (q.ask || ['Q1', 'Q2', 'Q3', 'IQR']).filter(function (a) { return a !== 'IQR'; });
  cuts.forEach(function (c) {
    var p = pos[c];
    picks[c] = (p.d === 1) ? [p.n - 1] : [Math.floor(p.n / p.d) - 1, Math.floor(p.n / p.d)];
  });
  var truth = quartiles(vals, rule);
  var out = { order: idx, picks: picks, iqr: '' };
  if ((q.ask || []).indexOf('IQR') > -1) out.iqr = rstr2(truth.IQR);
  if (!wrong) return out;
  /* the classic slip: the lower and upper quartile the wrong way round */
  if (picks.Q1 && picks.Q3) {
    var t = out.picks.Q1; out.picks = JSON.parse(JSON.stringify(picks));
    out.picks.Q1 = picks.Q3; out.picks.Q3 = t;
    if (out.iqr) out.iqr = rstr2({ n: -truth.IQR.n, d: truth.IQR.d });
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
function cftableBoard(q, wrong) {
  var truth = cumulate(q.classes || []);
  if (!wrong) return { cf: truth.map(String) };
  /* the frequencies copied straight down, which is the whole misconception */
  return { cf: (q.classes || []).map(function (c) { return String(c.f); }) };
}
function cfplotBoard(q, wrong) {
  var rules = rulesOf(q, RULES);
  var want = expectedPoints(q, rules).map(function (p) { return [rnum2(p[0]), rnum2(p[1])]; });
  if (!wrong) return { pts: want, joined: true };
  /* THE SLIP HAS TO BE ANSWERABLE. Plotting at the midpoints is the classic
     fault, but she still places the same NUMBER of points - including the
     start point where the book plots one - or the Join never lights and the
     board can never be checked at all. */
  var cf = cumulate(q.classes || []);
  var start = (q.startPoint === undefined) ? (rules.startPoint !== false) : q.startPoint;
  var mid = [];
  if (start && (q.classes || []).length) mid.push([Number(q.classes[0].lo), 0]);
  (q.classes || []).forEach(function (c, i) { mid.push([(Number(c.lo) + Number(c.hi)) / 2, cf[i]]); });
  return { pts: mid, joined: true };
}
function snapTo(x, sq) { return Math.round(x / sq) * sq; }
function cfreadBoard(q, wrong) {
  var rules = rulesOf(q, RULES);
  var heights = readHeights(Number(q.n) || 0, rules.curveRule);
  var sqx = ((q.chart || {}).sq || {}).x || 1;
  var reads = {}, answers = {}, answer = '', iqr = '';
  (q.ask || []).forEach(function (a) {
    if (typeof a === 'string') {
      if (a === 'IQR') {
        var x1 = curveX(q.curve, heights.Q1), x3 = curveX(q.curve, heights.Q3);
        if (x1 && x3) iqr = String(snapTo(rnum2(x3), sqx) - snapTo(rnum2(x1), sqx));
        return;
      }
      var h = heights[a === 'median' ? 'median' : a];
      var x = curveX(q.curve, h);
      reads[a] = { h: rnum2(h), x: x ? snapTo(rnum2(x), sqx) : null };
      return;
    }
    if (a && a.type === 'atX') {
      var cf = curveY(q.curve, a.x);
      var cfv = cf ? rnum2(cf) : null;
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
  /* WHEN HALF THE AXIS IS THE RIGHT HEIGHT, IT IS NOT A SLIP (12 Sept 2026). A
     reading is judged to the grid's resolution (half a small square, strictly),
     so on a board whose axis runs to n - q17's javelin curve, 50 on an axis to
     50 - "half the axis" lands within that of the convention height and would
     be marked RIGHT: a wrong path that is a right path proves nothing. The slip
     every class makes instead is the RANGE given for the interquartile range. */
  var sqy = ((q.chart || {}).sq || {}).y || 1;
  var halfAxisRight = false;
  Object.keys(bad).forEach(function (k) {
    if (k === 'atX' || k.indexOf('atX@') === 0 || !axis) return;
    var wantH = heights[k === 'median' ? 'median' : k];
    if (wantH && Math.abs(axis / 2 - rnum2(wantH)) < sqy / 2) halfAxisRight = true;
  });
  if (halfAxisRight && iqr !== '') {
    var xs = (q.curve || []).map(function (p) { return Number(p[0]); });
    return { reads: reads, answers: answers, iqr: String(Math.max.apply(null, xs) - Math.min.apply(null, xs)), answer: answer };
  }
  Object.keys(bad).forEach(function (k) {
    if (k === 'atX' || !axis) return;
    bad[k].h = axis / 2;
    var xx = curveX(q.curve, axis / 2);
    bad[k].x = xx ? snapTo(rnum2(xx), sqx) : bad[k].x;
  });
  return { reads: bad, answers: answers, iqr: iqr, answer: answer };
}
function boxTruthFive(q) {
  var rules = rulesOf(q, RULES);
  if (q.from === 'curve' && q.curve) {
    var h = readHeights(Number(q.n) || 0, rules.curveRule);
    var o = {
      min: (q.given || {}).min, max: (q.given || {}).max,
      Q1: curveX(q.curve, h.Q1), Q2: curveX(q.curve, h.median), Q3: curveX(q.curve, h.Q3)
    };
    ['Q1', 'Q2', 'Q3'].forEach(function (k) { if ((q.given || {})[k] !== undefined) o[k] = q.given[k]; });
    return o;
  }
  if (q.given) return q.given;
  if (q.from === 'qlist') {
    var f = fiveNumber(q.values || [], rules.quartileRule);
    return f ? { min: f.min, Q1: f.Q1, Q2: f.Q2, Q3: f.Q3, max: f.max } : null;
  }
  return q.answer || null;
}
function boxplotBoard(q, wrong) {
  var five = boxTruthFive(q) || {};
  var pos = {};
  /* A MARKER GOES ON THE GRID. A cut read off a curve is an exact rational
     (37/6 on the javelin curve) and no pupil can put a marker there: she
     places it on the nearest small square, and the engine marks a curve-read
     box plot to the reading tolerance. So the model board is what she can
     actually place. */
  var sq = Number((q.scale && q.scale.sq) || 1) || 1;
  ['min', 'Q1', 'Q2', 'Q3', 'max'].forEach(function (k) {
    var v = five[k];
    var n = (v && v.d !== undefined) ? v.n / v.d : Number(v);
    if (isNaN(n)) { pos[k] = rstr2(v); return; }
    pos[k] = String(q.from ? Math.round(n / sq) * sq : (Math.round(n * 1e6) / 1e6));
  });
  var out = { pos: pos, drawn: true };
  if (q.from) {
    var stageQ = JSON.parse(JSON.stringify(q));
    stageQ.kind = q.from === 'curve' ? 'cfread' : q.from;
    delete stageQ.from;
    out.stage = statsBoard(stageQ, false);
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
function compareBoard(q, wrong) {
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
function judgeBoard(q, wrong) {
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
function valuesBoard(q, wrong) {
  var order = q.order || (q.slots || []).map(function (s) { return s.id; });
  var v = {};
  order.forEach(function (id) {
    var slot = (q.slots || []).filter(function (s) { return s.id === id; })[0] || {};
    v[id] = rstr2(slot.answer);
  });
  if (!wrong) return { v: v };
  var bad = JSON.parse(JSON.stringify(v));
  var first = order[0];
  bad[first] = String(Number(bad[first] || 0) + 1);
  return { v: bad };
}
/* ---- Book A's boards (CONTRACT_A.md) ---- */
function orderBoard(q, wrong) {
  var seq = (q.answer || []).slice();
  if (!wrong || seq.length < 2) return { seq: seq };
  /* the middle two swapped: a broken link in the cycle, a wrong sequence */
  var i = Math.floor(seq.length / 2) - 1, t = seq[i];
  seq[i] = seq[i + 1]; seq[i + 1] = t;
  return { seq: seq };
}
function pickBoard(q, wrong) {
  var opts = q.options || [], best = -1, firstBad = -1, k;
  for (k = 0; k < opts.length; k++) {
    if (opts[k].best && best === -1) best = k;
    if (!opts[k].best && firstBad === -1) firstBad = k;
  }
  if (!wrong) return { pick: best, why: firstBad > -1 ? (opts[firstBad].flaw || null) : null };
  /* the printed bad question chosen, its own flaw named */
  return { pick: firstBad, why: firstBad > -1 ? (opts[firstBad].flaw || null) : null };
}
function stemleafBoard(q, wrong) {
  var dec = Number(q.decimals) || 0;
  var done = (q.prefill && q.prefill.stemsDone) ? q.prefill.stemsDone.map(Number) : [];
  var mine = (q.values || []).filter(function (v) {
    var sl = stemLeafOf(v, dec);
    return sl && done.indexOf(sl.stem) === -1;
  });
  var rows = {};
  function place(v) {
    var sl = stemLeafOf(v, dec);
    (rows[sl.stem] = rows[sl.stem] || []).push(String(sl.leaf));
  }
  var out;
  if (!wrong) {
    mine.slice().sort(function (a, b) { return Number(a) - Number(b); }).forEach(place);
    out = { rows: rows };
  } else {
    /* the leaves in PRINTED order (SL_UNORDERED). When the printed order
       already happens to be sorted on every stem, each row is reversed; when
       no row has two different leaves, the first leaf goes on the next stem. */
    mine.forEach(place);
    var ordered = function () {
      return Object.keys(rows).every(function (s2) {
        var l = rows[s2].map(Number), i;
        for (i = 1; i < l.length; i++) if (l[i] < l[i - 1]) return false;
        return true;
      });
    };
    if (ordered()) Object.keys(rows).forEach(function (s2) { rows[s2].reverse(); });
    if (ordered() && mine.length) {
      var sl0 = stemLeafOf(mine[0], dec), from = rows[sl0.stem];
      from.splice(from.indexOf(String(sl0.leaf)), 1);
      if (!from.length) delete rows[sl0.stem];
      (rows[sl0.stem + 1] = rows[sl0.stem + 1] || []).push(String(sl0.leaf));
    }
    out = { rows: rows };
  }
  if (q.key && q.key.ask && (q.values || []).length) {
    var k0 = stemLeafOf(q.values[0], dec);
    out.key = { stem: String(k0.stem), leaf: String(k0.leaf) };
  }
  return out;
}
function pieBoard(q, wrong) {
  var cats = q.cats || [], tot = Number(q.total) || 0, i;
  var angles = {}, bounds = [], labels = {}, run = 0;
  /* right: f × 360 ÷ total (whole degrees - the lint insists). wrong: the
     column worked in PERCENTAGES, keyed to 1 dp as a number pad allows
     (PIE_PCT_NOT_DEG reads a 1-dp percentage), the boundaries drawn to them. */
  var vals = cats.map(function (c) {
    var f = Number(c.f);
    return wrong ? Math.round(f * 1000 / tot) / 10 : f * 360 / tot;
  });
  cats.forEach(function (c, k) { angles[c.id] = String(vals[k]); labels[k] = c.id; });
  for (i = 0; i < cats.length - 1; i++) { run += vals[i]; bounds.push(Math.round(run * 10) / 10); }
  bounds.push(360);
  return { angles: angles, bounds: bounds, labels: labels };
}
function scatterBoard(q, wrong) {
  var all = (q.given || []).concat(q.toPlot || []);
  var LS = leastSquares(all), chart = q.chart || {}, x = chart.x || {}, y = chart.y || {};
  var sq = sqOf(q), sqx = rnum2(sq.x), sqy = rnum2(sq.y);
  var out = { pts: (q.toPlot || []).map(function (p) { return [Number(p[0]), Number(p[1])]; }) };
  var asks = q.asks || [];
  function has(t) { return asks.some(function (a) { return a && a.type === t; }); }
  function ask(t) { return asks.filter(function (a) { return a && a.type === t; })[0]; }
  if (has('lobf') && LS && LS.m) {
    var x1 = Number(x.min) || 0, x2 = Number(x.max) || 0;
    out.line = [[x1, snapTo(rnum2(lineY(LS, x1)), sqy)], [x2, snapTo(rnum2(lineY(LS, x2)), sqy)]];
  }
  if (has('estimate') && LS && LS.m) {
    var a = ask('estimate');
    var read = a.from === 'y' ? lineX(LS, a.at) : lineY(LS, a.at);
    out.est = read ? String(snapTo(rnum2(read), a.from === 'y' ? sqx : sqy)) : '';
  }
  if (has('corr')) out.corr = ask('corr').answer;
  if (has('outlier')) out.outlier = Number(ask('outlier').answer);
  if (!wrong) return out;
  /* the two values the wrong way round when every swapped point fits the
     axes; else the first point one square to the right */
  var swapped = out.pts.map(function (p) { return [p[1], p[0]]; });
  var inside = swapped.every(function (p) {
    return p[0] >= Number(x.min) && p[0] <= Number(x.max) && p[1] >= Number(y.min) && p[1] <= Number(y.max);
  });
  if (inside && swapped.length) out.pts = swapped;
  else if (out.pts.length) out.pts[0] = [out.pts[0][0] + sqx, out.pts[0][1]];
  return out;
}
function statsBoard(q, wrong) {
  switch (q.kind) {
    case 'qlist': return qlistBoard(q, wrong);
    case 'cftable': return cftableBoard(q, wrong);
    case 'cfplot': return cfplotBoard(q, wrong);
    case 'cfread': return cfreadBoard(q, wrong);
    case 'boxplot': return boxplotBoard(q, wrong);
    case 'compare': return compareBoard(q, wrong);
    case 'judge': return judgeBoard(q, wrong);
    case 'values': return valuesBoard(q, wrong);
    case 'order': return orderBoard(q, wrong);
    case 'pick': return pickBoard(q, wrong);
    case 'stemleaf': return stemleafBoard(q, wrong);
    case 'pie': return pieBoard(q, wrong);
    case 'scatter': return scatterBoard(q, wrong);
    default: return null;
  }
}



  /* ---------- selfTest ---------- */

  function selfTest() {
    var failures = [], count = 0;
    function T(name, cond) { count++; if (!cond) failures.push(name); }
    function n(x) { return { n: x, d: 1 }; }
    function mk(v, m, a) { return v.mk[0] === m && v.mk[1] === a; }
    function unit(v, i) { return v.perLine[i]; }
    function okAt(v, i, k) { return v.perLine[i] && v.perLine[i].ok === k; }
    function dxAt(v, i, code) { return v.perLine[i] && v.perLine[i].dx === code; }

    /* ---- Q: quartiles from a list ---- */
    var q7 = [5, 5, 6, 8, 9, 10, 12];                        /* n = 7 (4k+3) */
    var Q7 = quartiles(q7, 'n+1');
    T('Q1 n=7 lower quartile', req(Q7.Q1, n(5)));
    T('Q2 n=7 median', req(Q7.Q2, n(8)));
    T('Q3 n=7 upper quartile', req(Q7.Q3, n(10)));
    T('Q4 n=7 IQR exact', req(Q7.IQR, n(5)));
    T('Q5 n=7 positions expressible', Q7.expressible === true);
    var q11 = [3, 4, 4, 6, 7, 7, 8, 9, 11, 12, 15];          /* n = 11 (4k+3) */
    var Q11 = quartiles(q11, 'n+1');
    T('Q6 n=11 quartiles', req(Q11.Q1, n(4)) && req(Q11.Q2, n(7)) && req(Q11.Q3, n(11)));
    var q9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];                    /* n = 9 (4k+1): halves */
    var Q9 = quartiles(q9, 'n+1');
    T('Q7 n=9 half positions averaged', req(Q9.Q1, { n: 5, d: 2 }) && req(Q9.Q3, { n: 15, d: 2 }));
    T('Q8 n=9 expressible (halves)', Q9.expressible === true);
    T('Q9 n=8 quarter position refused', positionsExpressible(8, 'n+1') === false);
    T('Q10 n=6 quarter position refused', positionsExpressible(6, 'n+1') === false);
    T('Q11 unsorted input is sorted', req(quartiles([12, 5, 8, 5, 10, 6, 9], 'n+1').Q2, n(8)));
    var Qh = quartiles(q9, 'halves');
    T('Q12 halves rule odd n', req(Qh.Q1, { n: 5, d: 2 }) && req(Qh.Q3, { n: 15, d: 2 }));
    var Qh8 = quartiles([1, 2, 3, 4, 5, 6, 7, 8], 'halves');
    T('Q13 halves rule even n', req(Qh8.Q1, { n: 5, d: 2 }) && req(Qh8.Q2, { n: 9, d: 2 }));
    T('Q14 repeated values keep exactness', req(quartiles([2, 2, 2, 2, 2, 2, 2], 'n+1').IQR, n(0)));
    T('Q15 negative values', req(quartiles([-9, -5, -1, 0, 3, 7, 11], 'n+1').Q1, n(-5)));
    T('Q16 decimal values exact', req(quartiles([1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5], 'n+1').Q2, { n: 9, d: 2 }));
    T('Q17 n=1 does not crash', !!quartiles([4], 'n+1'));
    T('Q18 n=2 does not crash', !!quartiles([4, 8], 'n+1'));
    var F5 = fiveNumber(q11, 'n+1');
    T('Q19 fiveNumber min and max', req(F5.min, n(3)) && req(F5.max, n(15)));

    /* ---- qlist marking ---- */
    var QL = { id: 'ql', kind: 'qlist', marks: [3, 1], values: q7, ask: ['Q1', 'Q2', 'Q3', 'IQR'] };
    var ord = [0, 1, 2, 3, 4, 5, 6];
    var v = check(QL, { S: { order: ord, picks: { Q1: [1], Q2: [3], Q3: [5] }, iqr: '5' } });
    T('QL1 all right', v.res === 'OK' && mk(v, 3, 1));
    T('QL2 five units in order', v.perLine.length === 5 && v.perLine[0].unit === 'ORDER');
    T('QL3 tally labels are the kind’s', v.mkLabels[0] === 'Quartiles');
    v = check(QL, { S: { order: ord, picks: { Q1: [5], Q2: [3], Q3: [1] }, iqr: '-5' } });
    T('QL4 quartiles swapped', dxAt(v, 1, 'QL_Q_SWAPPED') && dxAt(v, 3, 'QL_Q_SWAPPED'));
    v = check(QL, { S: { order: ord, picks: { Q1: [3], Q2: [3], Q3: [5] }, iqr: '2' } });
    T('QL5 median used as a quartile', dxAt(v, 1, 'QL_MEDIAN_AS_Q'));
    v = check(QL, { S: { order: ord, picks: { Q1: [2], Q2: [3], Q3: [5] }, iqr: '4' } });
    T('QL6 counted one position out', dxAt(v, 1, 'QL_Q_POSITION_OFF'));
    var unord = [6, 5, 4, 3, 2, 1, 0];                        /* the list copied backwards */
    v = check(QL, { S: { order: unord, picks: { Q1: [1], Q2: [3], Q3: [5] }, iqr: '-5' } });
    T('QL7 unordered row named', okAt(v, 0, 0) && dxAt(v, 0, 'QL_UNORDERED'));
    T('QL8 picks at their own positions earn a hollow tick', okAt(v, 1, 2));
    T('QL9 accuracy withheld on an unordered row', v.mk[1] === 0);
    v = check(QL, { S: { order: ord, picks: { Q1: [1], Q2: [3], Q3: [5] }, iqr: '15' } });
    T('QL10 quartiles added', dxAt(v, 4, 'IQR_ADDED'));
    v = check(QL, { S: { order: ord, picks: { Q1: [1], Q2: [3], Q3: [5] }, iqr: '7' } });
    T('QL11 range given for the IQR', dxAt(v, 4, 'IQR_RANGE'));
    v = check(QL, { S: { order: ord, picks: { Q1: [1], Q2: [3], Q3: [5] }, iqr: '-5' } });
    T('QL12 quartiles subtracted the wrong way', dxAt(v, 4, 'IQR_NEGATED'));
    v = check(QL, { S: { order: ord, picks: { Q1: [2], Q2: [3], Q3: [5] }, iqr: '4' } });
    T('QL13 IQR follows through from their own cuts', okAt(v, 4, 2) && v.mk[1] === 0);
    T('QL14 method mark still earned after one wrong cut', v.mk[0] === 3);
    v = check(QL, { S: { order: [0, 1, 2], picks: {}, iqr: '' } });
    T('QL15 an unfinished row is not marked right', v.res === 'X@1' && okAt(v, 0, 0));
    v = check(QL, { S: { order: ord, picks: { Q1: [1], Q2: [3], Q3: [5] }, iqr: '' } });
    T('QL16 blank IQR is named', v.perLine[4].note === 'left blank');
    var QLp = { id: 'qlp', kind: 'qlist', marks: [2, 1], values: q11, ask: ['Q1', 'Q2', 'Q3'] };
    v = check(QLp, { S: { order: [0,1,2,3,4,5,6,7,8,9,10], picks: { Q1: [2], Q2: [5], Q3: [8] } } });
    T('QL17 last cut carries the accuracy mark', v.res === 'OK' && mk(v, 2, 1));
    var QLh = { id: 'qlh', kind: 'qlist', marks: [2, 1], values: q9, ask: ['Q1', 'Q2', 'Q3'] };
    v = check(QLh, { S: { order: [0,1,2,3,4,5,6,7,8], picks: { Q1: [1, 2], Q2: [4], Q3: [6, 7] } } });
    T('QL18 a bracket of two tiles gives the half position', v.res === 'OK');

    /* ---- CF ---- */
    var cls = [{ lo: 0, hi: 5, f: 8 }, { lo: 5, hi: 10, f: 13 }, { lo: 10, hi: 15, f: 14 }, { lo: 15, hi: 20, f: 5 }];
    T('CF1 cumulate runs the total', cumulate(cls).join(',') === '8,21,35,40');
    T('CF2 last total is n', cumulate(cls)[3] === 40);
    var CT = { id: 'ct', kind: 'cftable', marks: [2, 1], classes: cls, unit: 'cm' };
    v = check(CT, { S: { cf: ['8', '21', '35', '40'] } });
    T('CF3 all right', v.res === 'OK' && mk(v, 2, 1));
    v = check(CT, { S: { cf: ['8', '13', '14', '5'] } });
    T('CF4 frequencies copied', dxAt(v, 1, 'CF_NOT_CUMULATIVE') || dxAt(v, 0, 'CF_NOT_CUMULATIVE'));
    v = check(CT, { S: { cf: ['8', '21', '21', '26'] } });
    T('CF5 a row skipped', dxAt(v, 2, 'CF_SKIPPED_ROW'));
    v = check(CT, { S: { cf: ['8', '20', '34', '39'] } });
    T('CF6 running total right from their own slip', okAt(v, 2, 2) && okAt(v, 3, 2));
    T('CF7 a CF row earns on follow-through', v.perLine[2].earned === 1);
    v = check(CT, { S: { cf: ['8', '21', '', '40'] } });
    T('CF8 a blank cell is named', v.perLine[2].note === 'left blank');
    v = check(CT, { S: { cf: ['8', '21', '35', '39'] } });
    T('CF9 the final total is checked against n', /reach 40/.test(v.perLine[3].note || ''));
    var CTp = { id: 'ctp', kind: 'cftable', marks: [1, 1], classes: cls, prefill: [0, 1], unit: 'cm' };
    T('CF10 prefilled rows are not units', unitsOf(CTp).length === 2);
    T('CF11 single-class table safe', check({ kind: 'cftable', marks: [1, 1], classes: [{ lo: 0, hi: 5, f: 3 }] }, { S: { cf: ['3'] } }).res === 'OK');

    /* ---- plot ---- */
    var PL = { id: 'pl', kind: 'cfplot', marks: [2, 1], classes: cls, startPoint: true,
               mkUnits: { POINTS: 2 }, chart: { x: { min: 0, max: 20, step: 5 }, y: { min: 0, max: 40, step: 5 }, sq: { x: 1, y: 1 } } };
    var goodPts = [[0, 0], [5, 8], [10, 21], [15, 35], [20, 40]];
    v = check(PL, { S: { pts: goodPts, joined: true } });
    T('PT1 all points and the curve', v.res === 'OK' && mk(v, 2, 1));
    T('PT2 POINTS weighs 2', v.perLine[0].w === 2 && v.perLine[0].earned === 2);
    v = check(PL, { S: { pts: goodPts, joined: false } });
    T('PT3 not joined earns no curve mark', okAt(v, 1, 0) && v.mk[1] === 0);
    v = check(PL, { S: { pts: [[0, 0], [2.5, 8], [7.5, 21], [12.5, 35], [17.5, 40]], joined: true } });
    T('PT4 midpoints named (the start point still plotted)', dxAt(v, 0, 'PLOT_MIDPOINT'));
    T('PT5 curve through their own points is hollow and earns', okAt(v, 1, 2) && v.mk[1] === 1);
    v = check(PL, { S: { pts: [[0, 8], [5, 21], [10, 35], [15, 40]], joined: true } });
    T('PT6 lower boundaries named', dxAt(v, 0, 'PLOT_LOWER_BOUND'));
    v = check(PL, { S: { pts: [[5, 8], [10, 13], [15, 14], [20, 5]], joined: true } });
    T('PT7 frequencies plotted', dxAt(v, 0, 'PLOT_FREQ_NOT_CF'));
    T('PT8 a falling shape earns no curve mark', okAt(v, 1, 0));
    v = check(PL, { S: { pts: [[0, 0], [8, 5], [21, 10], [35, 15], [40, 20]], joined: true } });
    T('PT9 axes swapped', dxAt(v, 0, 'PLOT_AXES_SWAPPED'));
    v = check(PL, { S: { pts: [[0, 0], [5, 8], [10, 22], [15, 35], [20, 40]], joined: true } });
    T('PT10 one point a square out', dxAt(v, 0, 'PLOT_ONE_OUT'));
    T('PT11 one square out still earns w-1', v.perLine[0].earned === 1);
    v = check(PL, { S: { pts: [[0, 0], [5, 8], [15, 35], [20, 40]], joined: true } });
    T('PT12 a missing point is named and earns w-1', /missing/.test(v.perLine[0].note || '') && v.perLine[0].earned === 1);
    v = check(PL, { S: { pts: goodPts.concat([[12, 30]]), joined: true } });
    T('PT13 an extra point is named', /extra/.test(v.perLine[0].note || ''));
    v = check(PL, { S: { pts: [[5, 8], [0, 0], [20, 40], [10, 21], [15, 35]], joined: true } });
    T('PT14 points given in any order still match', v.res === 'OK');
    var PLn = { id: 'pln', kind: 'cfplot', marks: [1, 1], classes: cls, startPoint: false,
                chart: { x: { min: 0, max: 20, step: 5 }, y: { min: 0, max: 40, step: 5 }, sq: { x: 1, y: 1 } } };
    T('PT15 startPoint false expects four points', expectedPoints(PLn, DEFAULT_RULES).length === 4);

    /* ---- read ---- */
    var curve = [[0, 0], [5, 8], [10, 21], [15, 35], [20, 40]];
    T('RD1 curveY at a plotted point', req(curveY(curve, 10), n(21)));
    T('RD2 curveY mid-chord exact', req(curveY(curve, { n: 15, d: 2 }), { n: 29, d: 2 }));
    T('RD3 curveY outside the range is null', curveY(curve, 25) === null);
    T('RD4 curveX at a height', req(curveX(curve, 8), n(5)));
    T('RD5 curveX outside is null', curveX(curve, 60) === null);
    T('RD6 round trip x -> y -> x', req(curveX(curve, curveY(curve, 7)), n(7)));
    T('RD7 curveX at 0', req(curveX(curve, 0), n(0)));
    T('RD8 curveX at n', req(curveX(curve, 40), n(20)));
    var H50 = readHeights(40, 'split50');
    T('RD9 n <= 50 uses (n+1)', req(H50.median, { n: 41, d: 2 }) && req(H50.Q1, { n: 41, d: 4 }));
    var H80 = readHeights(80, 'split50');
    T('RD10 n > 50 uses n', req(H80.median, n(40)) && req(H80.Q1, n(20)) && req(H80.Q3, n(60)));
    T('RD11 n=50 gives 25.5, 12.75, 38.25', req(readHeights(50, 'split50').median, { n: 51, d: 2 }));
    T('RD12 the n/2 rule is still available', req(readHeights(40, 'n/2').median, n(20)));
    T('RD13 the (n+1)/2 rule is still available', req(readHeights(80, 'n+1/2').median, { n: 81, d: 2 }));
    T('RD14 a falling authored curve is caught', curveMonotone([[0, 0], [5, 9], [10, 4]]) === false);

    var RDq = { id: 'rd', kind: 'cfread', marks: [1, 1], n: 80, curve: [[0, 0], [5, 20], [10, 40], [15, 60], [20, 80]],
                ask: ['median'], chart: { x: { min: 0, max: 20, step: 5 }, y: { min: 0, max: 100, step: 10 }, sq: { x: 1, y: 1 } } };
    v = check(RDq, { S: { reads: { median: { h: 40, x: 10 } } } });
    T('RD15 median read right', v.res === 'OK' && mk(v, 1, 1));
    v = check(RDq, { S: { reads: { median: { h: 40, x: 11 } } } });
    T('RD16 one square either way is accepted', v.res === 'OK');
    v = check(RDq, { S: { reads: { median: { h: 40, x: 12 } } } });
    T('RD17 two squares out is not', okAt(v, 1, 0));
    v = check(RDq, { S: { reads: { median: { h: 40, x: 40 } } } });
    T('RD18 the height reported as the value', dxAt(v, 1, 'READ_REPORTED_HEIGHT'));
    v = check(RDq, { S: { reads: { median: { h: 50, x: 12.5 } } } });
    T('RD19 half the axis, not half the total', dxAt(v, 0, 'READ_HALF_AXIS'));
    T('RD20 a value read right at their own height is hollow', okAt(v, 1, 2));
    T('RD21 a hollow VALUE earns nothing', v.mk[1] === 0);
    var RDq3 = { id: 'rd3', kind: 'cfread', marks: [2, 2], n: 80, curve: RDq.curve, ask: ['Q1', 'Q3', 'IQR'],
                 chart: RDq.chart };
    v = check(RDq3, { S: { reads: { Q1: { h: 20, x: 5 }, Q3: { h: 60, x: 15 } }, iqr: '10' } });
    T('RD22 quartiles and IQR from the curve', v.res === 'OK');
    v = check(RDq3, { S: { reads: { Q1: { h: 60, x: 15 }, Q3: { h: 20, x: 5 } }, iqr: '-10' } });
    T('RD23 quartile heights swapped', dxAt(v, 0, 'READ_Q_SWAPPED'));
    v = check(RDq3, { S: { reads: { Q1: { h: 20, x: 6 }, Q3: { h: 60, x: 15 } }, iqr: '9' } });
    T('RD24 a read a square out still subtracts to a right IQR', okAt(v, 4, 1));
    v = check(RDq3, { S: { reads: { Q1: { h: 20, x: 2 }, Q3: { h: 60, x: 15 } }, iqr: '13' } });
    T('RD24a IQR follows through from their own reads when they are further out', okAt(v, 4, 2));
    T('RD24b a followed-through IQR earns nothing itself', v.perLine[4].earned === 0);
    v = check(RDq3, { S: { reads: { Q1: { h: 5, x: 5 }, Q3: { h: 60, x: 15 } }, iqr: '10' } });
    T('RD25 reading the wrong axis', dxAt(v, 0, 'READ_WRONG_AXIS'));
    /* the grid's resolution (12 Sept 2026): n = 50 under split50 wants 25.5,
       which a rule moving in squares of 2 cannot reach - both neighbours are
       right, a whole square out is not, and an exact convention height still
       refuses its neighbour a whole square away */
    var RDg = { id: 'rdg', kind: 'cfread', marks: [1, 1], n: 50, ask: ['median'],
                curve: [[70, 0], [75, 10], [80, 25], [85, 40], [90, 50]],
                chart: { x: { min: 70, max: 90, step: 5 }, y: { min: 0, max: 50, step: 10 }, sq: { x: 1, y: 2 } } };
    v = check(RDg, { S: { reads: { median: { h: 25, x: 80 } } } });
    var vg26 = check(RDg, { S: { reads: { median: { h: 26, x: 80 } } } });
    T('RD31 grid: 25 and 26 are both right for 25.5', okAt(v, 0, 1) && okAt(vg26, 0, 1) && v.res === 'OK');
    v = check(RDg, { S: { reads: { median: { h: 24, x: 80 } } } });
    T('RD32 grid: 24 is a whole square out for 25.5', okAt(v, 0, 0));
    var RDe = { id: 'rde', kind: 'cfread', marks: [1, 1], n: 49, ask: ['median'], curve: RDg.curve, chart: RDg.chart };
    v = check(RDe, { S: { reads: { median: { h: 26, x: 80 } } } });
    T('RD33 grid: 26 is wrong for an exact 25', okAt(v, 0, 0));
    v = check(RDe, { S: { reads: { median: { h: 25, x: 80 } } } });
    T('RD34 grid: 25 is right for an exact 25', okAt(v, 0, 1));
    var RDx = { id: 'rdx', kind: 'cfread', marks: [1, 2], n: 80, curve: RDq.curve, chart: RDq.chart,
                ask: [{ type: 'atX', x: 12, want: 'countAbove' }] };
    v = check(RDx, { S: { reads: { atX: { x: 12, cf: 48 } }, answer: '32' } });
    T('RD26 a read at a value, then the complement', v.res === 'OK' && mk(v, 1, 2));
    v = check(RDx, { S: { reads: { atX: { x: 12, cf: 48 } }, answer: '48' } });
    T('RD27 gave the number below instead of above', dxAt(v, 2, 'READ_COUNT_NOT_COMPLEMENT'));
    v = check(RDx, { S: { reads: { atX: { x: 12, cf: 50 } }, answer: '30' } });
    T('RD28 the answer follows through from their own reading', okAt(v, 2, 2) && v.perLine[2].earned === 1);
    var RDp = { id: 'rdp', kind: 'cfread', marks: [1, 2], n: 80, curve: RDq.curve, chart: RDq.chart,
                ask: [{ type: 'atX', x: 12, want: 'pctAbove' }] };
    v = check(RDp, { S: { reads: { atX: { x: 12, cf: 48 } }, answer: '40' } });
    T('RD29 a percentage of the total', v.res === 'OK');
    v = check(RDp, { S: { reads: { atX: { x: 12, cf: 48 } }, answer: '40.0' } });
    T('RD30 a decimal string reads as the same number', v.res === 'OK');

    /* ---- box plot ---- */
    var BX = { id: 'bx', kind: 'boxplot', marks: [1, 1], given: { min: 11, Q1: 28, Q2: 37, Q3: 42, max: 51 },
               scale: { min: 0, max: 60, step: 10, sq: 1 } };
    v = check(BX, { S: { pos: { min: '11', Q1: '28', Q2: '37', Q3: '42', max: '51' }, drawn: true } });
    T('BX1 five markers right', v.res === 'OK' && mk(v, 1, 1));
    T('BX2 tally labels box and whiskers', v.mkLabels[0] === 'Box' && v.mkLabels[1] === 'Whiskers');
    v = check(BX, { S: { pos: { min: '28', Q1: '11', Q2: '37', Q3: '42', max: '51' }, drawn: true } });
    T('BX3 whisker and quartile swapped', dxAt(v, 0, 'BOX_WHISKER_SWAP') || dxAt(v, 1, 'BOX_WHISKER_SWAP'));
    v = check(BX, { S: { pos: { min: '11', Q1: '28', Q2: '35', Q3: '42', max: '51' }, drawn: true } });
    T('BX4 median guessed at the centre of the box', dxAt(v, 0, 'BOX_MEDIAN_CENTRED'));
    v = check(BX, { S: { pos: { min: '11', Q1: '28', Q2: '37', Q3: '42' }, drawn: true } });
    T('BX5 a marker not placed is named', /not placed/.test(v.perLine[1].note || ''));
    v = check(BX, { S: { pos: { min: '11', Q1: '28', Q2: '37', Q3: '42', max: '51' }, drawn: false } });
    T('BX6 not drawn earns no whisker mark', okAt(v, 1, 0) && v.mk[1] === 0);
    v = check(BX, { S: { pos: { min: '11', Q1: '28', Q2: '37', Q3: '43', max: '51' }, drawn: true } });
    T('BX7 a marker a square off is wrong', okAt(v, 0, 0));
    var BXeq = { id: 'bxe', kind: 'boxplot', marks: [1, 1], given: { min: 12, Q1: 12, Q2: 20, Q3: 27, max: 40 },
                 scale: { min: 0, max: 50, step: 10, sq: 1 } };
    T('BX8 two markers may share a value', check(BXeq, { S: { pos: { min: '12', Q1: '12', Q2: '20', Q3: '27', max: '40' }, drawn: true } }).res === 'OK');
    var BXn = { id: 'bxn', kind: 'boxplot', marks: [1, 1], n: 40, given: { min: 5, Q1: 12, Q2: 20, Q3: 28, max: 39 },
                scale: { min: 0, max: 45, step: 5, sq: 1 } };
    v = check(BXn, { S: { pos: { min: '5', Q1: '12', Q2: '20', Q3: '28', max: '40' }, drawn: true } });
    T('BX9 the highest value put at the total frequency', dxAt(v, 1, 'BOX_MAX_IS_N'));
    var BXq = { id: 'bxq', kind: 'boxplot', marks: [2, 2], from: 'qlist', values: q7, ask: ['Q1', 'Q2', 'Q3'],
                scale: { min: 0, max: 15, step: 5, sq: 1 } };
    v = check(BXq, { S: { stage: { order: ord, picks: { Q1: [1], Q2: [3], Q3: [5] } },
                          pos: { min: '5', Q1: '5', Q2: '8', Q3: '10', max: '12' }, drawn: true } });
    T('BX10 a two-stage item marks its stage first', v.perLine[0].unit === 'ORDER' && v.res === 'OK');
    T('BX11 a two-stage item has one verdict', v.perLine.length === 6);
    v = check(BXq, { S: { stage: { order: ord, picks: { Q1: [2], Q2: [3], Q3: [5] } },
                          pos: { min: '5', Q1: '6', Q2: '8', Q3: '10', max: '12' }, drawn: true } });
    T('BX12 a box plot from their own wrong cut is hollow and earns', okAt(v, 4, 2) && v.perLine[4].earned === 1);
    var BXv = { id: 'bxv', kind: 'boxplot', marks: [1, 1], from: 'values',
                slots: [{ id: 'min', label: 'Lowest', answer: { n: 84, d: 1 }, earns: 'method' }],
                given: { min: 84, Q1: 120, Q2: 140, Q3: 160, max: 185 },
                scale: { min: 80, max: 200, step: 20, sq: 1 } };
    v = check(BXv, { S: { stage: { v: { min: '84' } },
                          pos: { min: '84', Q1: '120', Q2: '140', Q3: '160', max: '185' }, drawn: true } });
    T('BX13 a values stage runs before the plot', v.perLine[0].unit === 'V_min' && v.res === 'OK');

    /* ---- compare ---- */
    var CMP = { id: 'cmp', kind: 'compare', marks: [1, 1],
      plots: [{ label: 'Girls', summary: { min: 10, Q1: 16, Q2: 25, Q3: 42, max: 45 } },
              { label: 'Boys', summary: { min: 5, Q1: 18, Q2: 32, Q3: 40, max: 48 } }],
      context: { measure: 'time', higherIs: 'slower', words: ['slower', 'faster'] } };
    v = check(CMP, { S: { s1: { who: 'Boys', who2: 'Boys', ctx: 'slower', v: [32, 25] },
                          s2: { who: 'Girls', size: 'larger', cons: 'less', meas: 'iqr', v: [26, 22] } } });
    T('CM1 both sentences right', v.res === 'OK' && mk(v, 1, 1));
    v = check(CMP, { S: { s1: { who: 'Girls', who2: 'Girls', ctx: 'slower', v: [25, 32] },
                          s2: { who: 'Girls', size: 'larger', cons: 'less', meas: 'iqr', v: [26, 22] } } });
    T('CM2 the wrong group named', dxAt(v, 0, 'CMP_WRONG_GROUP'));
    v = check(CMP, { S: { s1: { who: 'Boys', who2: 'Boys', ctx: 'faster', v: [32, 25] },
                          s2: { who: 'Girls', size: 'larger', cons: 'less', meas: 'iqr', v: [26, 22] } } });
    T('CM3 higher median called faster', dxAt(v, 0, 'CMP_CONTEXT_FLIPPED'));
    v = check(CMP, { S: { s1: { who: 'Boys', who2: 'Boys', ctx: 'slower', v: [30, 25] },
                          s2: { who: 'Girls', size: 'larger', cons: 'less', meas: 'iqr', v: [26, 22] } } });
    T('CM4 right comparison, wrong values', dxAt(v, 0, 'CMP_VALUES_WRONG'));
    v = check(CMP, { S: { s1: { who: 'Boys', who2: 'Boys', ctx: 'slower', v: [32, 25] },
                          s2: { who: 'Girls', size: 'larger', cons: 'more', meas: 'iqr', v: [26, 22] } } });
    T('CM5 larger spread called more consistent', dxAt(v, 1, 'CMP_SPREAD_MEANING'));
    v = check(CMP, { S: { s1: { who: 'Boys', who2: 'Boys', ctx: 'slower', v: [32, 25] },
                          s2: { who: 'Girls', size: 'larger', cons: 'less', meas: 'iqr', v: [35, 43] } } });
    T('CM6 the range’s values quoted for the IQR', dxAt(v, 1, 'CMP_MEASURE_VALUES_SWAPPED'));
    v = check(CMP, { S: { s1: { who: 'Boys', who2: 'Boys', ctx: 'slower', v: [32, 25] },
                          s2: { who: 'Boys', size: 'larger', cons: 'less', meas: 'range', v: [43, 35] } } });
    T('CM7 range is a legitimate spread measure', v.res === 'OK');
    v = check(CMP, { S: { s1: {}, s2: {} } });
    T('CM8 an unfinished comparison is not marked right', v.res === 'X@1');

    /* ---- judge ---- */
    var JD = { id: 'jd', kind: 'judge', marks: [1, 2], prompt: 'p',
      claims: [{ text: 'a', fair: false, why: 'BIASED', alsoWhy: ['WRONG_POP'] },
               { text: 'b', fair: true, why: null }] };
    v = check(JD, { S: { j: [{ fair: false, why: 'BIASED' }, { fair: true }] } });
    T('JD1 both judged right', v.res === 'OK' && mk(v, 1, 2));
    v = check(JD, { S: { j: [{ fair: true }, { fair: true }] } });
    T('JD2 a biased claim accepted', dxAt(v, 0, 'JUDGE_ACCEPTS_CLAIM'));
    v = check(JD, { S: { j: [{ fair: false, why: 'WRONG_POP' }, { fair: true }] } });
    T('JD3 another fair reason is hollow and earns', okAt(v, 1, 2) && v.mk[0] === 1);
    v = check(JD, { S: { j: [{ fair: false, why: 'SMALL' }, { fair: true }] } });
    T('JD4 right verdict, wrong limitation', dxAt(v, 1, 'JUDGE_WRONG_REASON'));
    v = check(JD, { S: { j: [{ fair: false, why: null }, { fair: true }] } });
    T('JD5 no reason given is named', /no reason given/.test(v.perLine[1].note || ''));
    v = check(JD, { S: { j: [{ fair: false, why: 'BIASED' }, { fair: false, why: 'SMALL' }] } });
    T('JD6 a fair conclusion rejected', dxAt(v, 2, 'JUDGE_REJECTS_FAIR'));
    var JDe = { id: 'jde', kind: 'judge', marks: [1, 1],
      claims: [{ text: 'exact', fair: false, why: 'ESTIMATE' }] };
    T('JD7 an exact figure from a sample', dxAt(check(JDe, { S: { j: [{ fair: true }] } }), 0, 'JUDGE_OVERCLAIM'));
    var JDo = { id: 'jdo', kind: 'judge', marks: [0, 3],
      claims: [{ text: 'mean', options: ['Increase', 'Decrease', 'Stay the same'], verdict: 'Increase' },
               { text: 'mode', options: ['Increase', 'Decrease', 'Stay the same'], verdict: 'Stay the same' },
               { text: 'x', options: ['True', 'False', 'Not enough information'], verdict: 'Not enough information' }] };
    v = check(JDo, { S: { j: [{ v: 'Increase' }, { v: 'Stay the same' }, { v: 'Not enough information' }] } });
    T('JD8 per-claim options judged exactly', v.res === 'OK' && mk(v, 0, 3));
    v = check(JDo, { S: { j: [{ v: 'Increase' }, { v: 'Stay the same' }, { v: 'True' }] } });
    T('JD9 an exact claim from grouped data', dxAt(v, 2, 'TFN_GROUPED_EXACT'));
    var JDt = { id: 'jdt', kind: 'judge', marks: [0, 1],
      claims: [{ text: 'y', options: ['True', 'False', 'Not enough information'], verdict: 'True' }] };
    T('JD10 a sound estimate called false', dxAt(check(JDt, { S: { j: [{ v: 'False' }] } }), 0, 'TFN_ESTIMATE_AS_FALSE'));
    T('JD11 an unknown reason id does not crash',
      check(JD, { S: { j: [{ fair: false, why: 'BANANA' }, { fair: true }] } }).perLine[1].dx === 'JUDGE_WRONG_REASON');
    T('JD12 options claims carry no reason unit', unitsOf(JDo).length === 3);

    /* ---- values ---- */
    var VL = { id: 'vl', kind: 'values', marks: [1, 1],
      slots: [{ id: 'min', label: 'Lowest', answer: { n: 84, d: 1 }, earns: 'method' },
              { id: 'iqr', label: 'Interquartile range', answer: { n: 30, d: 1 }, earns: 'accuracy' }],
      order: ['min', 'iqr'] };
    v = check(VL, { S: { v: { min: '84', iqr: '30' } } });
    T('VL1 both slots right', v.res === 'OK' && mk(v, 1, 1));
    v = check(VL, { S: { v: { min: '84' } } });
    T('VL2 a blank box is a fail state, not a block', v.perLine[1].note === 'left blank');
    v = check(VL, { S: { v: { min: '85', iqr: '30' } } });
    T('VL3 one wrong slot', v.res === 'X@1' && v.mk[0] === 0 && v.mk[1] === 1);
    var VLf = { id: 'vlf', kind: 'values', marks: [1, 1],
      fig: { type: 'venn2', n: 130, totals: { milk: 81 } },
      slots: [{ id: 'both', label: 'Both', answer: { n: 22, d: 1 }, earns: 'method' },
              { id: 'milkOnly', label: 'Milk only', answer: { n: 59, d: 1 }, earns: 'accuracy',
                ft: { rule: 'venn.only', of: 'milk', from: ['both'] } }],
      order: ['both', 'milkOnly'] };
    v = check(VLf, { S: { v: { both: '20', milkOnly: '61' } } });
    T('VL4 a Venn region follows through from their own overlap', okAt(v, 1, 2));
    T('VL5 an unknown ft rule id is not silently accepted', !FT_RULES['venn.nope']);
    T('VL6 a slot with tol accepts a graphical read',
      check({ kind: 'values', marks: [0, 1], slots: [{ id: 'a', label: 'A', answer: { n: 18, d: 1 }, tol: { n: 1, d: 1 }, earns: 'accuracy' }], order: ['a'] },
            { S: { v: { a: '19' } } }).res === 'OK');

    /* ---- the unit table's own contract ---- */
    T('UT1 IQR never earns on follow-through',
      unitsOf(QL).filter(function (u) { return u.id === 'IQR'; })[0].ftEarns === false);
    T('UT2 a CF row earns on follow-through', unitsOf(CT)[0].ftEarns === true);
    T('UT3 CURVE earns on follow-through', unitsOf(PL)[1].ftEarns === true);
    T('UT4 a qlist cut never earns on follow-through',
      unitsOf(QL).filter(function (u) { return u.id === 'Q1'; })[0].ftEarns === false);
    T('UT5 VALUE_* never earns on follow-through',
      unitsOf(RDq).filter(function (u) { return u.id === 'VALUE_median'; })[0].ftEarns === false);
    T('UT6 BOX earns on follow-through only in a two-stage item',
      unitsOf(BX)[0].ftEarns === false && unitsOf(BXq).filter(function (u) { return u.id === 'BOX'; })[0].ftEarns === true);
    T('UT7 WHY_* earns on follow-through',
      unitsOf(JD).filter(function (u) { return u.id === 'WHY_0'; })[0].ftEarns === true);
    T('UT8 every method unit weighs at least one',
      unitsOf(PL).every(function (u) { return u.w >= 1; }));
    T('UT9 reachable marks: cfplot POINTS weighs the paper’s two',
      unitsOf(PL).filter(function (u) { return u.band === 'method'; })
        .reduce(function (a, u) { return a + u.w; }, 0) >= PL.marks[0]);

    /* ---- gist ---- */
    T('GS1 qlist gist', gist(QL).length <= 28 && /values/.test(gist(QL)));
    T('GS2 cftable gist', gist(CT) === 'CF table · 4 classes');
    T('GS3 cfplot gist names n', /n = 40/.test(gist(PL)));
    T('GS4 cfread gist', gist(RDq).length <= 28);
    T('GS5 boxplot gist', gist(BX) === 'Box plot');
    T('GS6 compare gist', gist(CMP) === 'Compare two box plots');
    T('GS7 judge gist counts the claims', gist(JD) === 'Is the claim fair? ×2');
    T('GS8 every gist is at most 28 characters',
      [QL, CT, PL, RDq, BX, CMP, JD, VL].every(function (qq) { return gist(qq).length <= 28; }));

    /* ================= Book A (CONTRACT_A.md, 12 Sept 2026) ================= */

    /* ---- order: the data-handling cycle (booklet 1.4) ---- */
    var OR = { id: 'or', kind: 'order', marks: [1, 1], prompt: 'p', cyclic: true,
               tiles: ['Collect the data', 'Present the data', 'Analyse the data', 'Interpret the results'],
               answer: [0, 1, 2, 3] };
    v = check(OR, { S: { seq: [0, 1, 2, 3] } });
    T('OR1 the cycle in order earns full', v.res === 'OK' && mk(v, 1, 1));
    T('OR2 a cycle of four is four pair units', v.perLine.length === 4 && v.perLine[0].unit === 'PAIR_0' && v.perLine[3].unit === 'PAIR_3');
    T('OR3 the closing pair carries the accuracy mark', unitsOf(OR)[3].band === 'accuracy' && unitsOf(OR)[2].band === 'method');
    v = check(OR, { S: { seq: [2, 3, 0, 1] } });
    T('OR4 a rotation of the cycle earns full', v.res === 'OK' && mk(v, 1, 1));
    v = check(OR, { S: { seq: [0, 2, 1, 3] } });
    T('OR5 the middle two swapped breaks three pairs', v.res === 'X@1' && okAt(v, 0, 0) && okAt(v, 1, 0) && okAt(v, 2, 0) && okAt(v, 3, 1));
    v = check(OR, { S: { seq: [3, 2, 1, 0] } });
    T('OR6 the cycle backwards earns nothing', mk(v, 0, 0));
    v = check(OR, { S: { seq: [0, 1, 2] } });
    T('OR7 an unfinished row is not marked right', v.res === 'X@1' && /not every card/.test(v.perLine[0].note || ''));
    T('OR8 order has no dx of its own', v.dx === null);
    var ORw = statsBoard(OR, true);
    T('OR9 the wrong model board fails and the right one passes',
      check(OR, { S: statsBoard(OR, false) }).res === 'OK' && check(OR, { S: ORw }).res !== 'OK');
    var ORs = { id: 'ors', kind: 'order', marks: [0, 1], prompt: 'p', tiles: ['3', '1', '2'], answer: [1, 2, 0] };
    v = check(ORs, { S: { seq: [1, 2, 0] } });
    T('OR10 a plain sequence is one accuracy unit', v.perLine.length === 1 && v.perLine[0].unit === 'SEQ' && v.res === 'OK' && mk(v, 0, 1));
    v = check(ORs, { S: { seq: [2, 0, 1] } });
    T('OR11 a rotation of a plain sequence is wrong', okAt(v, 0, 0));
    T('OR12 order gist', gist(OR) === 'Put the cycle in order' && gist(ORs) === 'Put the cards in order');

    /* ---- pick: the better questionnaire question ---- */
    var PK = { id: 'pk', kind: 'pick', marks: [1, 1], prompt: 'p',
               options: [{ text: 'How much TV do you watch?', best: false, flaw: 'Q_VAGUE' },
                         { text: 'How many hours of TV did you watch last week?', boxes: ['0–2', '3–5', '6–8', 'more than 8'], best: true },
                         { text: 'How many hours of TV do you watch?', boxes: ['0–2', '2–4', '4–6'], best: false, flaw: 'Q_OVERLAP' }] };
    v = check(PK, { S: { pick: 1, why: 'Q_VAGUE' } });
    T('PK1 the best question and a rejected option’s flaw', v.res === 'OK' && mk(v, 1, 1));
    T('PK2 PICK is accuracy, WHY is method', unitsOf(PK)[0].band === 'accuracy' && unitsOf(PK)[1].band === 'method');
    v = check(PK, { S: { pick: 1, why: 'Q_OVERLAP' } });
    T('PK3 the OTHER rejected option’s flaw is accepted too', okAt(v, 1, 1));
    v = check(PK, { S: { pick: 0, why: 'Q_VAGUE' } });
    T('PK4 the wrong question picked fails PICK', okAt(v, 0, 0) && v.mk[1] === 0);
    v = check(PK, { S: { pick: 1, why: 'Q_LEADING' } });
    T('PK5 a reason no option has is the wrong limitation', dxAt(v, 1, 'JUDGE_WRONG_REASON'));
    v = check(PK, { S: { pick: 1 } });
    T('PK6 no reason given is named', /no reason/.test(v.perLine[1].note || ''));
    v = check(PK, { S: {} });
    T('PK7 nothing chosen is a fail state', v.res === 'X@1' && /no question chosen/.test(v.perLine[0].note || ''));
    T('PK8 the model boards: right passes, wrong fails PICK',
      check(PK, { S: statsBoard(PK, false) }).res === 'OK' && okAt(check(PK, { S: statsBoard(PK, true) }), 0, 0));
    T('PK9 the ten Q_* reasons are in the bank with their texts',
      ['Q_OVERLAP', 'Q_GAP', 'Q_NO_ZERO', 'Q_NO_TIME', 'Q_LEADING', 'Q_VAGUE', 'Q_NO_OTHER', 'Q_ONLY_POSITIVE', 'Q_PERSONAL', 'Q_OPEN']
        .every(function (k) { return typeof REASONS[k] === 'string' && /\.$/.test(REASONS[k]); }) &&
      REASONS.Q_GAP === 'Some values have no box.');
    T('PK10 pick gist', gist(PK) === 'Choose the better question');

    /* ---- stemleaf: M7 Q17's twigs (whole cm) ---- */
    var twigs = [36, 24, 28, 41, 31, 28, 45, 22, 39, 30, 27, 44, 33, 26, 40];
    var SLq = { id: 'sl', kind: 'stemleaf', marks: [2, 1], prompt: 'p', values: twigs, stems: [2, 3, 4], unit: 'cm', decimals: 0, key: { ask: true } };
    var slRight = { '2': ['2', '4', '6', '7', '8', '8'], '3': ['0', '1', '3', '6', '9'], '4': ['0', '1', '4', '5'] };
    v = check(SLq, { S: { rows: slRight, key: { stem: '3', leaf: '6' } } });
    T('SL1 every leaf on its stem, in order, with a key', v.res === 'OK' && mk(v, 2, 1));
    T('SL2 three units LEAVES ORDERED KEY', v.perLine.map(function (p) { return p.unit; }).join(',') === 'LEAVES,ORDERED,KEY');
    var sl2 = stemLeafOf(36, 0), sl3 = stemLeafOf('3.6', 1), sl4 = stemLeafOf(40, 0);
    T('SL3 the split at decimals 0', sl2.stem === 3 && sl2.leaf === 6 && sl4.stem === 4 && sl4.leaf === 0);
    T('SL4 the split at decimals 1', sl3.stem === 3 && sl3.leaf === 6 && stemLeafOf(2.4, 1).stem === 2 && stemLeafOf(2.4, 1).leaf === 4);
    var rows15 = stemleafRows(twigs, 0);
    T('SL5 stemleafRows sorts each stem', rows15['2'].join('') === '246788' && rows15['3'].join('') === '01369' && rows15['4'].join('') === '0145');
    v = check(SLq, { S: { rows: { '2': ['4', '8', '8', '2', '7', '6'], '3': ['6', '1', '9', '0', '3'], '4': ['1', '5', '4', '0'] }, key: { stem: '3', leaf: '6' } } });
    T('SL6 leaves in printed order are unordered', okAt(v, 0, 1) && dxAt(v, 1, 'SL_UNORDERED') && mk(v, 1, 1));
    v = check(SLq, { S: { rows: { '2': ['2', '4', '6', '7', '8', '8', '9'], '3': ['0', '1', '3', '6'], '4': ['0', '1', '4', '5'] }, key: { stem: '3', leaf: '6' } } });
    T('SL7 a leaf on the wrong stem', dxAt(v, 0, 'SL_WRONG_STEM') && okAt(v, 1, 1));
    v = check(SLq, { S: { rows: { '2': ['2', '4', '6', '7', '8'], '3': ['0', '1', '3', '6', '9'], '4': ['0', '1', '4', '5'] }, key: { stem: '3', leaf: '6' } } });
    T('SL8 a value left out', dxAt(v, 0, 'SL_MISSED_LEAF') && /missing/.test(v.perLine[0].note || ''));
    v = check(SLq, { S: { rows: { '2': ['2', '4', '6', '7', '8', '8', '8'], '3': ['0', '1', '3', '6', '9'], '4': ['0', '1', '4', '5'] }, key: { stem: '3', leaf: '6' } } });
    T('SL9 a value entered twice', dxAt(v, 0, 'SL_MISSED_LEAF') && /twice/.test(v.perLine[0].note || ''));
    v = check(SLq, { S: { rows: slRight, key: { stem: '2', leaf: '9' } } });
    T('SL10 a key the data does not hold', dxAt(v, 2, 'SL_KEY_WRONG') && v.mk[1] === 0);
    v = check(SLq, { S: { rows: slRight, key: { stem: '4', leaf: '5' } } });
    T('SL11 any true stem-leaf pair is a right key', okAt(v, 2, 1));
    v = check(SLq, { S: { rows: slRight } });
    T('SL12 no key built is named', /no key/.test(v.perLine[2].note || ''));
    v = check(SLq, { S: { rows: {} } });
    T('SL13 an empty diagram is a fail state, not a crash', v.res === 'X@1' && okAt(v, 0, 0) && okAt(v, 1, 0));
    var SLd = { id: 'sld', kind: 'stemleaf', marks: [2, 0], prompt: 'p', values: [2.4, 3.6, 2.8, 3.1, 2.2], stems: [2, 3], unit: 'kg', decimals: 1 };
    v = check(SLd, { S: { rows: { '2': ['2', '4', '8'], '3': ['1', '6'] } } });
    T('SL14 decimals 1: 3.6 is 3 | 6', v.res === 'OK' && mk(v, 2, 0));
    T('SL15 no key asked, no KEY unit', unitsOf(SLd).length === 2);
    var SLp = { id: 'slp', kind: 'stemleaf', marks: [2, 0], prompt: 'p', values: twigs, stems: [2, 3, 4], unit: 'cm', decimals: 0,
                prefill: { stemsDone: [2, 3] } };
    v = check(SLp, { S: { rows: { '4': ['0', '1', '4', '5'] } } });
    T('SL16 prefilled stems are given, not marked', v.res === 'OK');
    v = check(SLp, { S: { rows: { '4': ['0', '1', '4', '5'], '3': ['6'] } } });
    T('SL17 a leaf placed on a prefilled stem is a doubled value', okAt(v, 0, 0));
    var SLb = { id: 'slb', kind: 'stemleaf', marks: [2, 0], prompt: 'p', values: [12, 15, 21], stems: [1, 2], unit: 'marks', decimals: 0,
                back: { label: 'Girls', mine: 'Boys', values: [11, 14, 19, 23] } };
    v = check(SLb, { S: { rows: { '1': ['2', '5'], '2': ['1'] } } });
    T('SL18 the back side is given: only my side is marked', v.res === 'OK' && unitsOf(SLb).length === 2);
    var SLw = statsBoard(SLq, true), SLr = statsBoard(SLq, false);
    T('SL19 the right model board passes with its key', check(SLq, { S: SLr }).res === 'OK' && SLr.key.stem === '3' && SLr.key.leaf === '6');
    T('SL20 the wrong model board is the printed order', check(SLq, { S: SLw }).dx === 'SL_UNORDERED');
    T('SL21 a wrong board whose printed order is sorted still fails',
      check(SLd, { S: statsBoard({ id: 'x', kind: 'stemleaf', marks: [2, 0], values: [2.2, 2.4, 2.8, 3.1, 3.6], stems: [2, 3], decimals: 1 }, true) }).res !== 'OK');
    T('SL22 stemleaf gist', gist(SLq) === 'Stem-and-leaf · n = 15');

    /* ---- pie: M7 Q11's sports (60 pupils) ---- */
    var PI = { id: 'pi', kind: 'pie', marks: [2, 2], prompt: 'p', total: 60,
               cats: [{ id: 'fb', label: 'Football', f: 26 }, { id: 'rg', label: 'Rugby', f: 8 },
                      { id: 'hk', label: 'Hockey', f: 12 }, { id: 'ot', label: 'Other', f: 14 }] };
    var piA = pieAngles(PI.cats, 60);
    T('PI1 pieAngles is exact', req(piA.fb, n(156)) && req(piA.rg, n(48)) && req(piA.hk, n(72)) && req(piA.ot, n(84)));
    var piGood = { angles: { fb: '156', rg: '48', hk: '72', ot: '84' }, bounds: [156, 204, 276, 360], labels: { 0: 'fb', 1: 'rg', 2: 'hk', 3: 'ot' } };
    v = check(PI, { S: piGood });
    T('PI2 the whole pie right', v.res === 'OK' && mk(v, 2, 2));
    T('PI3 seven units: four angles, SUM, SECTORS, LABELS', v.perLine.length === 7 && v.perLine[4].unit === 'SUM' && v.perLine[6].unit === 'LABELS');
    T('PI4 SECTORS earns on follow-through, LABELS does not', unitsOf(PI)[5].ftEarns === true && unitsOf(PI)[6].ftEarns === false);
    v = check(PI, { S: { angles: { fb: '43.3', rg: '13.3', hk: '20', ot: '23.3' }, bounds: [43.3, 56.6, 76.6, 360], labels: piGood.labels } });
    T('PI5 the column worked in percentages', dxAt(v, 0, 'PIE_PCT_NOT_DEG') && v.dx === 'PIE_PCT_NOT_DEG');
    T('PI6 a percentage column is not a follow-through', okAt(v, 1, 0) && okAt(v, 2, 0));
    T('PI7 sectors drawn to their own percentages are hollow and earn', okAt(v, 5, 2) && v.perLine[5].earned === 1);
    T('PI8 the SUM unit fails short of 360', okAt(v, 4, 0) && /99\.9, not 360/.test(v.perLine[4].note || ''));
    v = check(PI, { S: { angles: { fb: '187.2', rg: '57.6', hk: '86.4', ot: '100.8' }, bounds: [187.2, 244.8, 331.2, 360], labels: piGood.labels } });
    T('PI9 every angle consistent with one wrong total (÷ 50)', dxAt(v, 0, 'PIE_TOTAL_WRONG'));
    T('PI10 the rest follow through from the first angle', okAt(v, 1, 2) && okAt(v, 2, 2) && okAt(v, 3, 2) && v.perLine[1].earned === 1);
    v = check(PI, { S: { angles: { fb: '150', rg: '48', hk: '72', ot: '84' }, bounds: [150, 198, 270, 360], labels: piGood.labels } });
    T('PI11 one angle wrong on its own carries no column dx', okAt(v, 0, 0) && v.perLine[0].dx === null && okAt(v, 1, 1));
    T('PI12 a sum that is not 360 is named', okAt(v, 4, 0) && /354/.test(v.perLine[4].note || ''));
    T('PI13 sectors drawn to their own wrong angle are hollow', okAt(v, 5, 2));
    v = check(PI, { S: { angles: piGood.angles, bounds: [158, 204, 278, 360], labels: piGood.labels } });
    T('PI14 a boundary within 2° is right', okAt(v, 5, 1));
    v = check(PI, { S: { angles: piGood.angles, bounds: [160, 204, 276, 360], labels: piGood.labels } });
    T('PI15 a boundary 4° out is a sector drawn to the wrong angle', dxAt(v, 5, 'PIE_SECTOR_OFF'));
    v = check(PI, { S: { angles: piGood.angles, bounds: [156, 204, 276, 360], labels: { 0: 'fb', 1: 'hk', 2: 'rg', 3: 'ot' } } });
    T('PI16 two labels swapped', okAt(v, 6, 0) && v.mk[1] === 1);
    v = check(PI, { S: { angles: piGood.angles, bounds: [156, 204], labels: {} } });
    T('PI17 boundaries and labels not placed are named', /boundary/.test(v.perLine[5].note || '') && /label/.test(v.perLine[6].note || ''));
    v = check(PI, { S: { angles: { fb: '156', rg: '48' }, bounds: [], labels: {} } });
    T('PI18 a blank angle is left blank and SUM waits', v.perLine[2].note === 'left blank' && v.perLine[4].note === 'left blank');
    var PIw = statsBoard(PI, true), PIr = statsBoard(PI, false);
    T('PI19 the right model board passes', check(PI, { S: PIr }).res === 'OK' && PIr.bounds.join(',') === '156,204,276,360');
    T('PI20 the wrong model board is the percentage column and fails', check(PI, { S: PIw }).dx === 'PIE_PCT_NOT_DEG' && PIw.angles.fb === '43.3');
    T('PI21 pie gist', gist(PI) === 'Pie chart · 4 sectors');

    /* ---- scatter: M7 Q12's engine sizes (litres) against mpg — a hand-built set ---- */
    var SCch = { x: { min: 0, max: 10, step: 1, label: 'x' }, y: { min: 0, max: 20, step: 2, label: 'y' }, sq: { x: 1, y: 1 } };
    var LS1 = leastSquares([[1, 3], [2, 5], [3, 7], [4, 9]]);
    T('LS1 a perfect line comes back exactly', req(LS1.m, n(2)) && req(LS1.c, n(1)) && req(LS1.meanX, { n: 5, d: 2 }) && req(LS1.meanY, n(6)));
    var LS2 = leastSquares([[1, 2], [2, 4], [3, 5], [4, 4], [5, 5]]);
    T('LS2 least squares on a scatter, as rationals', req(LS2.m, { n: 3, d: 5 }) && req(LS2.c, { n: 11, d: 5 }) && req(LS2.meanX, n(3)) && req(LS2.meanY, n(4)));
    T('LS3 all x the same has no slope', leastSquares([[2, 1], [2, 5]]).m === null);
    T('LS4 lineY and lineX on a two-point line', req(lineY([[0, 1], [10, 21]], 4), n(9)) && req(lineX([[0, 1], [10, 21]], 9), n(4)));
    T('LS5 a vertical line is undrawable', lineY([[3, 1], [3, 9]], 3) === null);
    var SC = { id: 'sc', kind: 'scatter', marks: [2, 2], prompt: 'p', chart: SCch, pointsW: 2,
               given: [[1, 3], [2, 5], [3, 7]], toPlot: [[4, 9], [5, 11], [6, 13], [7, 15]],
               asks: [{ type: 'lobf' }, { type: 'estimate', from: 'x', at: 8, want: 'y' }, { type: 'corr', answer: 'positive' }, { type: 'outlier', answer: 6 }] };
    var scGood = { pts: [[4, 9], [5, 11], [6, 13], [7, 15]], line: [[0, 1], [10, 21]], est: '17', corr: 'positive', outlier: 6 };
    v = check(SC, { S: scGood });
    T('SC1 the whole graph right', v.res === 'OK' && mk(v, 2, 2));
    T('SC2 POINTS weighs the paper’s two', v.perLine[0].w === 2 && v.perLine[0].earned === 2);
    T('SC3 five units in the asks’ order', v.perLine.map(function (p) { return p.unit; }).join(',') === 'POINTS,LOBF,ESTIMATE,CORR,OUTLIER');
    var SCo = { id: 'sco', kind: 'scatter', marks: [1, 0], prompt: 'p', chart: SCch, given: SC.given, toPlot: SC.toPlot, asks: [] };
    T('SC4 only the asked units exist', unitsOf(SCo).length === 1 && unitsOf(SCo)[0].id === 'POINTS');
    v = check(SC, { S: { pts: [[9, 4], [11, 5], [13, 6], [15, 7]], line: scGood.line, est: '17', corr: 'positive', outlier: 6 } });
    T('SC5 the two values the wrong way round', dxAt(v, 0, 'SC_XY_SWAPPED') && v.perLine[0].earned === 0);
    v = check(SC, { S: { pts: [[4, 9], [5, 11], [6, 14], [7, 15]], line: scGood.line, est: '17', corr: 'positive', outlier: 6 } });
    T('SC6 one point out is named and earns w−1', /one point is out/.test(v.perLine[0].note || '') && v.perLine[0].earned === 1);
    v = check(SC, { S: { pts: scGood.pts, line: [[0, 2], [10, 20]], est: '17', corr: 'positive', outlier: 6 } });
    T('SC7 a sound line drawn by eye passes the three-part test', okAt(v, 1, 1));
    v = check(SC, { S: { pts: scGood.pts, line: [[0, 4], [10, 24]], est: '20', corr: 'positive', outlier: 6 } });
    T('SC8 a line missing the mean point', dxAt(v, 1, 'SC_LINE_OFF_TREND') && /middle/.test(v.perLine[1].note || ''));
    v = check(SC, { S: { pts: scGood.pts, line: [[0, 15], [10, 0]], est: '3', corr: 'positive', outlier: 6 } });
    T('SC9 a line sloping the wrong way', dxAt(v, 1, 'SC_LINE_OFF_TREND') && /wrong way/.test(v.perLine[1].note || ''));
    v = check(SC, { S: { pts: scGood.pts, line: [[0, -15], [10, 45]], est: '33', corr: 'positive', outlier: 6 } });
    T('SC10 a steep line through the mean has too few points near it', dxAt(v, 1, 'SC_LINE_OFF_TREND') && /half/.test(v.perLine[1].note || ''));
    v = check(SC, { S: { pts: scGood.pts, line: [[0, 2], [10, 20]], est: '16', corr: 'positive', outlier: 6 } });
    T('SC11 an estimate within a square of the true line is right', okAt(v, 2, 1));
    v = check(SC, { S: { pts: scGood.pts, line: [[0, 4], [10, 24]], est: '20', corr: 'positive', outlier: 6 } });
    T('SC12 an estimate read from their own off line is hollow and earns', okAt(v, 2, 2) && v.perLine[2].earned === 1);
    v = check(SC, { S: { pts: scGood.pts, line: scGood.line, est: '8', corr: 'positive', outlier: 6 } });
    T('SC13 the asked value given back is the wrong axis', dxAt(v, 2, 'SC_READ_WRONG_AXIS'));
    v = check(SC, { S: { pts: scGood.pts, line: scGood.line, est: '12', corr: 'positive', outlier: 6 } });
    T('SC14 an estimate far from both lines is wrong with no dx', okAt(v, 2, 0) && v.perLine[2].dx === null);
    v = check(SC, { S: { pts: scGood.pts, line: scGood.line, est: '17', corr: 'negative', outlier: 6 } });
    T('SC15 correlation named the wrong way', dxAt(v, 3, 'SC_CORR_SIGN'));
    v = check(SC, { S: { pts: scGood.pts, line: scGood.line, est: '17', corr: 'none', outlier: 6 } });
    T('SC16 no correlation for a clear trend is wrong without the sign dx', okAt(v, 3, 0) && v.perLine[3].dx === null);
    v = check(SC, { S: { pts: scGood.pts, line: scGood.line, est: '17', corr: 'positive', outlier: 2 } });
    T('SC17 the wrong point named as the odd one out', okAt(v, 4, 0) && v.perLine[4].earned === 0 && /fits the pattern/.test(v.perLine[4].note || ''));
    v = check(SC, { S: { pts: scGood.pts } });
    T('SC18 a line not drawn, nothing read, nothing chosen', /not drawn/.test(v.perLine[1].note || '') && v.perLine[2].note === 'left blank' && /no correlation/.test(v.perLine[3].note || '') && /no point/.test(v.perLine[4].note || ''));
    var SCy = { id: 'scy', kind: 'scatter', marks: [1, 1], prompt: 'p', chart: SCch, given: SC.given, toPlot: SC.toPlot,
                asks: [{ type: 'lobf' }, { type: 'estimate', from: 'y', at: 17, want: 'x' }] };
    v = check(SCy, { S: { pts: scGood.pts, line: scGood.line, est: '8' } });
    T('SC19 an estimate from y solves the line for x', okAt(v, 2, 1) && v.res === 'OK');
    v = check(SCy, { S: { pts: scGood.pts, line: scGood.line, est: '17' } });
    T('SC20 from y, the asked value given back is the wrong axis', dxAt(v, 2, 'SC_READ_WRONG_AXIS'));
    var SCr = statsBoard(SC, false), SCw = statsBoard(SC, true);
    T('SC21 the right model board passes with the LS line at the majors', check(SC, { S: SCr }).res === 'OK' && SCr.line[0][0] === 0 && SCr.line[1][0] === 10 && SCr.est === '17');
    T('SC22 the wrong model board fails POINTS', okAt(check(SC, { S: SCw }), 0, 0));
    var SCsw = { id: 'scsw', kind: 'scatter', marks: [1, 0], prompt: 'p', chart: { x: { min: 0, max: 20, step: 2 }, y: { min: 0, max: 20, step: 2 }, sq: { x: 1, y: 1 } },
                 given: [], toPlot: [[4, 9], [5, 11]], asks: [] };
    T('SC23 the wrong board swaps x and y when the swapped points fit the axes', check(SCsw, { S: statsBoard(SCsw, true) }).dx === 'SC_XY_SWAPPED');
    T('SC24 scatter gist counts every point', gist(SC) === 'Scatter graph · n = 7');
    var SCg = { id: 'scg', kind: 'scatter', marks: [1, 1], prompt: 'p', chart: { x: { min: 0, max: 10, step: 1 }, y: { min: 0, max: 40, step: 4 }, sq: { x: 1, y: 2 } },
                given: SC.given.map(function (p) { return [p[0], p[1] * 2]; }), toPlot: SC.toPlot.map(function (p) { return [p[0], p[1] * 2]; }),
                asks: [{ type: 'lobf' }, { type: 'estimate', from: 'x', at: 8, want: 'y' }] };
    v = check(SCg, { S: { pts: SCg.toPlot, line: [[0, 2], [10, 42]], est: '36' } });
    T('SC25 "one small square" reads chart.sq: 2 units either way on a grid of 2', okAt(v, 2, 1));
    v = check(SCg, { S: { pts: SCg.toPlot, line: [[0, 2], [10, 42]], est: '37' } });
    T('SC26 three units out on a grid of 2 is wrong', okAt(v, 2, 0));

    /* ---- values on a Venn figure: the two slips ---- */
    var VN = { id: 'vn', kind: 'values', marks: [2, 1], prompt: 'p',
               fig: { type: 'venn2', n: 130, circles: [{ id: 'A', label: 'Milk' }, { id: 'B', label: 'Sugar' }], totals: { A: 81, B: 48 } },
               slots: [{ id: 'both', label: 'Both', region: 'AB', answer: { n: 22, d: 1 }, earns: 'method', ft: { rule: 'venn.both.fromTotals', of: ['A', 'B'], from: ['out'] } },
                       { id: 'aOnly', label: 'Milk only', region: 'A', answer: { n: 59, d: 1 }, earns: 'method', ft: { rule: 'venn.only', of: 'A', from: ['both'] } },
                       { id: 'out', label: 'Neither', region: 'out', answer: { n: 23, d: 1 }, earns: 'accuracy' }],
               order: ['out', 'both', 'aOnly'] };
    v = check(VN, { S: { v: { out: '23', both: '22', aOnly: '59' } } });
    T('VN1 the Venn right', v.res === 'OK' && mk(v, 2, 1));
    v = check(VN, { S: { v: { out: '23', both: '22', aOnly: '81' } } });
    T('VN2 the whole-circle total in the only region', dxAt(v, 2, 'VENN_TOTAL_AS_ONLY'));
    v = check(VN, { S: { v: { out: '0', both: '-1', aOnly: '82' } } });
    T('VN3 the outside at zero is the outside forgotten', dxAt(v, 0, 'VENN_OUTSIDE_LOST'));
    v = check(VN, { S: { v: { out: '23', both: '-1', aOnly: '82' } } });
    T('VN4 both = A + B − N is the outside forgotten in the overlap', dxAt(v, 1, 'VENN_OUTSIDE_LOST'));
    T('VN5 the only region follows through from their own overlap', okAt(v, 2, 2));
    v = check(VN, { S: { v: { both: '22', aOnly: '59' } } });
    T('VN6 a blank outside slot names the slip and stays left blank', dxAt(v, 0, 'VENN_OUTSIDE_LOST') && v.perLine[0].note === 'left blank');
    T('VN7 a pack-authored slot dx still wins',
      check({ kind: 'values', marks: [1, 0], slots: [{ id: 'a', label: 'A', region: 'A', answer: { n: 5, d: 1 }, earns: 'method', dx: 'CF_SKIPPED_ROW' }], order: ['a'],
              fig: { type: 'venn2', n: 10, totals: { A: 7 } } }, { S: { v: { a: '7' } } }).dx === 'CF_SKIPPED_ROW');

    /* ---- the kinds list, the labels, the names ---- */
    T('KA1 the five Book A kinds are stat kinds', ['order', 'pick', 'stemleaf', 'pie', 'scatter'].every(isStatKind) && !isStatKind('table'));
    T('KA2 every kind has a two-word tally', KINDS_LIST.every(function (k) { return MK_LABELS[k] && MK_LABELS[k].length === 2; }));
    T('KA3 every Book A dx has a plain-English name',
      ['SL_UNORDERED', 'SL_WRONG_STEM', 'SL_MISSED_LEAF', 'SL_KEY_WRONG', 'VENN_TOTAL_AS_ONLY', 'VENN_OUTSIDE_LOST',
       'PIE_PCT_NOT_DEG', 'PIE_TOTAL_WRONG', 'PIE_SECTOR_OFF', 'SC_XY_SWAPPED', 'SC_LINE_OFF_TREND', 'SC_READ_WRONG_AXIS', 'SC_CORR_SIGN']
        .every(function (k) { return typeof DX_NAMES[k] === 'string' && DX_NAMES[k].split(' ').length >= 3; }));
    T('KA4 SL_BACK_DIRECTION is a stated omission', DX_NAMES.SL_BACK_DIRECTION === undefined && DX_NAMES.AV_DIV_ROWS === undefined);
    T('KA5 every Book A gist is at most 28 characters', [OR, ORs, PK, SLq, PI, SC].every(function (qq) { return gist(qq).length <= 28; }));
    T('KA6 every wrong model board fails at least one unit',
      [OR, ORs, PK, SLq, SLd, PI, SC].every(function (qq) { return check(qq, { S: statsBoard(qq, true) }).res !== 'OK'; }));
    T('KA7 every right model board marks full',
      [OR, ORs, PK, SLq, SLd, SLp, PI, SC, SCy].every(function (qq) { var vv = check(qq, { S: statsBoard(qq, false) }); return vv.res === 'OK' && vv.mk[0] === vv.mkMax[0] && vv.mk[1] === vv.mkMax[1]; }));

    /* ---- rationals and rounding ---- */
    T('RT1 a terminating decimal is recognised', terminates(rat(1, 4)) === true);
    T('RT2 a recurring decimal is recognised', terminates(rat(1, 3)) === false);
    T('RT3 a pupil string parses exactly', req(R('4.5'), { n: 9, d: 2 }));
    T('RT4 a unicode minus parses', req(R('−3'), n(-3)));
    T('RT5 an empty box is null', R('') === null);

    return { pass: failures.length === 0, failures: failures, count: count };
  }

  /* ---------- exports ---------- */

  var API = {
    quartiles: quartiles,
    quartilePositions: quartilePositions,
    positionsExpressible: positionsExpressible,
    fiveNumber: fiveNumber,
    cumulate: cumulate,
    curveX: curveX,
    curveY: curveY,
    curveMonotone: curveMonotone,
    readHeights: readHeights,
    expectedPoints: expectedPoints,
    unitsOf: unitsOf,
    modelBoard: modelBoard,
    isStatKind: isStatKind,
    check: check,
    gist: gist,
    rat: R,
    terminates: terminates,
    /* Book A's helpers (renderer, lint and walker read these) */
    stemLeafOf: stemLeafOf,
    stemleafRows: stemleafRows,
    pieAngles: pieAngles,
    leastSquares: leastSquares,
    lineY: lineY,
    lineX: lineX,
    KINDS: KINDS_LIST.slice(),
    DEFAULT_RULES: DEFAULT_RULES,
    FT_RULE_IDS: Object.keys(FT_RULES),
    REASONS: REASONS,
    DX_NAMES: DX_NAMES,
    MK_LABELS: MK_LABELS,
    selfTest: selfTest
  };
  if (typeof window !== 'undefined') window.GJ_STATS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

})(typeof window !== 'undefined' ? window :
   typeof globalThis !== 'undefined' ? globalThis : this);
