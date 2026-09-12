#!/usr/bin/env node
/* Lint + arithmetic verifier for the Handling Data stats packs (MathShelf).
   Usage:
     node dev/lint-content-stats.js
       — scans ROOT for content-stats-quartiles.js, content-stats-collect.js
         and content-stats-averages.js; loads whichever exist (0..3); with
         NONE present it reports "0 sections" and PASSes (§11.1, MATHS_STATS_
         DESIGN.md — no stats pack is authored yet).
     node dev/lint-content-stats.js --pack /path/a.js --pack /path/b.js
       — lints exactly the given pack file(s) instead of the default three
         (repeatable flag, or a single comma-separated --pack a.js,b.js).
         Used to run this lint against a throwaway fixture pack outside the
         repo (see the design pack's fixture-proof instructions). Equivalent
         env var: GJ_LINT_STATS_PACK=/a.js,/b.js

   Design source: Claude Work/Maths/MATHS_STATS_DESIGN.md §11.1 (the every-
   bullet spec), §4 (kind shapes), §6.2/§6.5 (rules + unit weights), §7 (dx
   ids), §8 (movie ops), §16 (conventions), §17.1 (`values` + ft.rule table),
   §20.3.

   Two independent layers, exactly as lint-content-algebra.js:
   1. Structure: pack/section/question/movie shapes, op whitelist, marks,
      src, dp, telegraph phrases, unicode hygiene, dx/verdict whitelists.
   2. Re-derivation: every authored answer is re-computed here by a SECOND,
      small, independent implementation (rational quartiles, cumulative
      totals, chord/spline curve intersection, five-number summaries,
      comparison truths) — never by calling into statcore.js for the answer
      itself. statcore.js (window.GJ_STATS), if present, is loaded ONLY to
      (a) cross-check this lint's independent numbers against the engine's,
      and (b) read FT_RULE_IDS / DX_NAMES as closed-table whitelists. */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(__dirname, '..');
var MATHCORE_PATH = path.join(ROOT, 'mathcore.js');
var STATCORE_PATH = path.join(ROOT, 'statcore.js');
var DEFAULT_PACK_PATHS = [
  path.join(ROOT, 'content-stats-quartiles.js'),
  path.join(ROOT, 'content-stats-collect.js'),
  path.join(ROOT, 'content-stats-averages.js')
];

/* WHAT THIS LINT RE-DERIVES, declared so the coverage machine (qa-coverage.js,
   tools/qa/lib/decl.js) can prove that every authored question of every kind
   this book uses is re-derived by something. A kind added to a pack and not
   added here fails coverage by name. */
const KINDS = ['qlist', 'cftable', 'cfplot', 'cfread', 'boxplot', 'compare', 'judge', 'values',
  /* Book A (CONTRACT_A.md, 12 Sept 2026) */ 'order', 'pick', 'stemleaf', 'pie', 'scatter'];

/* ──────────────────────────────── failures / report shape ──────────────── */

var failures = [];   /* { book, section, qid, rule, sentence } — the FIXED shape */
var infos = [];       /* non-fatal notes (e.g. a deliberate startPoint override) */

function fail(book, section, qid, rule, sentence) {
  failures.push({ book: book, section: section, qid: qid, rule: rule, sentence: sentence });
}
function info(line) { infos.push(line); }

/* ──────────────────────────────── argv / env pack selection ─────────────── */

function packPathsFromArgv(argv) {
  var out = [];
  for (var i = 0; i < argv.length; i++) {
    if (argv[i] === '--pack' && argv[i + 1]) {
      argv[i + 1].split(',').forEach(function (p) { if (p.trim()) out.push(path.resolve(p.trim())); });
      i++;
    }
  }
  return out;
}
var argvPacks = packPathsFromArgv(process.argv.slice(2));
var envPacks = (process.env.GJ_LINT_STATS_PACK || '')
  .split(',').map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) { return path.resolve(p); });
var PACK_PATHS = argvPacks.length ? argvPacks : (envPacks.length ? envPacks : DEFAULT_PACK_PATHS);
var USING_FIXTURE = argvPacks.length > 0 || envPacks.length > 0;

/* ──────────────────────────────── load browser-global scripts under node ── */

function loadBrowserGlobal(file) {
  if (!fs.existsSync(file)) return { present: false };
  global.window = global.window || {};
  try {
    require(file);
    return { present: true };
  } catch (e) {
    try {
      vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
      return { present: true };
    } catch (e2) {
      return { present: true, error: e2 };
    }
  }
}

/* ──────────────────────────────── independent rational arithmetic ───────── */
/* Deliberately re-implemented here rather than required from mathcore.js /
   statcore.js — this is the "second, small implementation" the design asks
   for, exactly as lint-content-algebra.js's mini-evaluator is independent of
   mathcore.js. It is used ONLY for cross-checking; statcore's own GJ_MATH is
   never called to produce a truth this lint reports. */

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
function rat(n, d) {
  if (d === undefined) d = 1;
  if (d === 0) throw new Error('zero denominator');
  if (d < 0) { n = -n; d = -d; }
  var g = gcd(Math.round(n), Math.round(d)) || 1;
  return { n: Math.round(n) / g, d: Math.round(d) / g };
}
function radd(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
function rsub(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
function rmul(a, b) { return rat(a.n * b.n, a.d * b.d); }
function rdiv(a, b) { if (b.n === 0) throw new Error('divide by zero'); return rat(a.n * b.d, a.d * b.n); }
function req(a, b) { return a && b && a.n === b.n && a.d === b.d; }
function rlt(a, b) { return a.n * b.d < b.n * a.d; }
function rle(a, b) { return a.n * b.d <= b.n * a.d; }
function rabs(a) { return a.n < 0 ? rat(-a.n, a.d) : a; }
function rnum(a) { return a.n / a.d; }
function rstr(a) { return a.d === 1 ? String(a.n) : a.n + '/' + a.d; }
var R0 = rat(0), R1 = rat(1), R2 = rat(2), R4 = rat(4), R3 = rat(3);

/* Accepts a normalised {n,d}, a plain number, or a pupil/author string
   ('7', '-3', '4.5', '11/2', a unicode minus). Returns null if unparseable. */
function R(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && typeof v.n === 'number' && typeof v.d === 'number' && v.d !== 0) return rat(v.n, v.d);
  if (typeof v === 'number') {
    if (!isFinite(v)) return null;
    var d = 1;
    while (Math.abs(v * d - Math.round(v * d)) > 1e-9 && d < 1e9) d *= 10;
    return rat(Math.round(v * d), d);
  }
  if (typeof v === 'string') {
    var s = v.replace(/−/g, '-').replace(/\s+/g, '');
    if (s === '') return null;
    var slash = s.indexOf('/');
    if (slash !== -1) {
      var num = parseInt(s.slice(0, slash), 10), den = parseInt(s.slice(slash + 1), 10);
      if (!isFinite(num) || !isFinite(den) || !den) return null;
      return rat(num, den);
    }
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    return R(parseFloat(s));
  }
  return null;
}
function Rs(list) { return (list || []).map(R); }
function isRatShape(v) { return v && typeof v === 'object' && Number.isInteger(v.n) && Number.isInteger(v.d) && v.d > 0; }
function terminates(r) {
  if (!r) return true;
  var d = r.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}
function sortR(list) { return list.slice().sort(function (a, b) { return rnum(a) - rnum(b); }); }

/* ──────────────────────────────── §4.1 qlist — quartiles ────────────────── */

/* Positions per §6.2/§16: 'n+1' -> (n+1)/4, (n+1)/2, 3(n+1)/4 (1-indexed);
   'halves' -> handled separately (median of each half). */
function quartilePositions(n, rule) {
  if (rule === 'halves') return null;
  var np1 = rat(n + 1);
  return { Q1: rdiv(np1, R4), Q2: rdiv(np1, R2), Q3: rdiv(rmul(R3, np1), R4) };
}
function expressible(pos) { return !!pos && (pos.d === 1 || pos.d === 2); }
function positionsExpressible(n, rule) {
  var p = quartilePositions(n, rule);
  if (!p) return true;
  return expressible(p.Q1) && expressible(p.Q2) && expressible(p.Q3);
}
function atPosition(sorted, pos) {
  if (!sorted.length) return null;
  if (pos.d === 1) {
    var i = Math.min(Math.max(pos.n - 1, 0), sorted.length - 1);
    return sorted[i];
  }
  var lo = Math.min(Math.max(Math.floor(rnum(pos)) - 1, 0), sorted.length - 1);
  var hi = Math.min(lo + 1, sorted.length - 1);
  return rdiv(radd(sorted[lo], sorted[hi]), R2);
}
function medianOf(sorted) {
  var n = sorted.length;
  if (!n) return null;
  return n % 2 ? sorted[(n - 1) / 2] : rdiv(radd(sorted[n / 2 - 1], sorted[n / 2]), R2);
}
function myQuartiles(values, rule) {
  var v = Rs(values).filter(Boolean), s = sortR(v), n = s.length;
  if (!n) return null;
  var Q1, Q2, Q3;
  if (rule === 'halves') {
    Q2 = medianOf(s);
    var half = (n - (n % 2)) / 2;
    Q1 = medianOf(s.slice(0, half));
    Q3 = medianOf(s.slice(n - half));
  } else {
    var pos = quartilePositions(n, rule);
    Q1 = atPosition(s, pos.Q1); Q2 = atPosition(s, pos.Q2); Q3 = atPosition(s, pos.Q3);
  }
  return { Q1: Q1, Q2: Q2, Q3: Q3, IQR: rsub(Q3, Q1), sorted: s, n: n };
}

/* ──────────────────────────────── §4.2 cftable — running total ──────────── */

function myCumulate(classes) {
  var out = [], run = 0;
  (classes || []).forEach(function (c) { run += Number(c.f) || 0; out.push(run); });
  return out;
}

/* ──────────────────────────────── §4.3 cfplot — expected points ─────────── */

function myExpectedPoints(q, rules) {
  var classes = q.classes || [], cf = myCumulate(classes), out = [];
  var start = (q.startPoint === undefined) ? rules.startPoint : q.startPoint;
  if (start && classes.length) out.push([R(classes[0].lo), R0]);
  classes.forEach(function (c, i) { out.push([R(c.hi), rat(cf[i])]); });
  return out;
}
function ptEq(a, b) { return req(a[0], b[0]) && req(a[1], b[1]); }
function pointSetEq(a, b) {
  if (a.length !== b.length) return false;
  var used = b.slice();
  return a.every(function (p) {
    var i = used.findIndex(function (q) { return ptEq(p, q); });
    if (i === -1) return false;
    used.splice(i, 1);
    return true;
  });
}
/* Elementwise (not set) comparison — used for the distinguishability check,
   which compares a whole mis-plotted SERIES against the truth series. */
function seriesEq(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (!ptEq(a[i], b[i])) return false;
  return true;
}

/* ──────────────────────────────── §4.4 cfread — chord + spline ──────────── */

function readHeightsOf(n, rule) {
  var N = rat(n), np1 = rat(n + 1), base;
  if (rule === 'n/2') base = N;
  else if (rule === 'n+1/2') base = np1;
  else base = (n <= 50) ? np1 : N; /* 'split50' */
  return { median: rdiv(base, R2), Q1: rdiv(base, R4), Q3: rdiv(rmul(R3, base), R4) };
}
function curvePts(curve) {
  return (curve || []).map(function (p) { return [R(p[0]), R(p[1])]; })
    .filter(function (p) { return p[0] && p[1]; })
    .sort(function (a, b) { return rnum(a[0]) - rnum(b[0]); });
}
/* The CHORD (piecewise-linear) reading — the mark scheme's own tolerance
   already allows for the spline being a drawing convenience (§6.1). */
function chordX(curve, h) {
  var p = curvePts(curve), y = R(h);
  if (!p.length || !y) return null;
  if (rlt(y, p[0][1]) || rlt(p[p.length - 1][1], y)) return null;
  for (var i = 0; i < p.length - 1; i++) {
    var y0 = p[i][1], y1 = p[i + 1][1];
    if (rle(y0, y) && rle(y, y1)) {
      if (req(y0, y1)) return p[i][0];
      var t = rdiv(rsub(y, y0), rsub(y1, y0));
      return radd(p[i][0], rmul(t, rsub(p[i + 1][0], p[i][0])));
    }
  }
  return p[p.length - 1][0];
}
function chordY(curve, x) {
  var p = curvePts(curve), X = R(x);
  if (!p.length || !X) return null;
  if (rlt(X, p[0][0]) || rlt(p[p.length - 1][0], X)) return null;
  for (var i = 0; i < p.length - 1; i++) {
    var x0 = p[i][0], x1 = p[i + 1][0];
    if (rle(x0, X) && rle(X, x1)) {
      if (req(x0, x1)) return p[i][1];
      var t = rdiv(rsub(X, x0), rsub(x1, x0));
      return radd(p[i][1], rmul(t, rsub(p[i + 1][1], p[i][1])));
    }
  }
  return p[p.length - 1][1];
}

/* An independent monotone cubic spline (Fritsch-Carlson), used ONLY to prove
   the drawn spline never wanders more than half a small square from the
   chord at any height the pack actually asks for ("curve too bendy"). Built
   fresh here rather than shared with any renderer/engine code. */
function buildMonotoneSpline(points) {
  var xs = points.map(function (p) { return rnum(p[0]); });
  var ys = points.map(function (p) { return rnum(p[1]); });
  var n = xs.length;
  if (n < 2) return null;
  var d = [], m = [];
  for (var i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (i = 1; i < n - 1; i++) m.push(d[i - 1] === 0 || d[i] === 0 || (d[i - 1] > 0) !== (d[i] > 0) ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    var a = m[i] / d[i], b = m[i + 1] / d[i], h = Math.hypot(a, b);
    if (h > 3) { var t = 3 / h; m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  function evalAt(x) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    var k = 0;
    while (k < n - 2 && x > xs[k + 1]) k++;
    var h = xs[k + 1] - xs[k], t = (x - xs[k]) / h;
    var h00 = 2 * t * t * t - 3 * t * t + 1, h10 = t * t * t - 2 * t * t + t;
    var h01 = -2 * t * t * t + 3 * t * t, h11 = t * t * t - t * t;
    return h00 * ys[k] + h10 * h * m[k] + h01 * ys[k + 1] + h11 * h * m[k + 1];
  }
  return { evalAt: evalAt, xMin: xs[0], xMax: xs[n - 1] };
}
/* x such that spline.evalAt(x) == h, by dense sampling + linear refinement —
   deliberately not the same algorithm as the chord's exact rational solve. */
function splineX(spline, h) {
  if (!spline) return null;
  var H = typeof h === 'number' ? h : rnum(h);
  var STEPS = 400, x0 = spline.xMin, x1 = spline.xMax;
  var prevX = x0, prevY = spline.evalAt(x0);
  for (var i = 1; i <= STEPS; i++) {
    var x = x0 + (x1 - x0) * i / STEPS, y = spline.evalAt(x);
    if ((prevY <= H && H <= y) || (y <= H && H <= prevY)) {
      var t = (y === prevY) ? 0 : (H - prevY) / (y - prevY);
      return prevX + t * (x - prevX);
    }
    prevX = x; prevY = y;
  }
  return null;
}

/* ──────────────────────────────── §17.1 ft.rule closed table (own copy) ─── */
/* A second, independent implementation of the named rules, used to re-derive
   a values-slot's follow-through value from the pupil's OWN earlier slots —
   here used only to prove the closed table (no id outside it) and to
   re-derive constraint-set answers; never to grade a live attempt. */
var FT_RULE_NAMES = ['venn.only', 'venn.outside', 'venn.both.fromTotals', 'pie.angle',
  'pie.angle.fromTheirs', 'rm.total', 'rm.newMean', 'avg.mean', 'table.mean', 'sl.read'];

/* ──────────────────────────────── §6.6 reason bank (own copy) ───────────── */
var REASON_IDS = ['SMALL', 'BIASED', 'WRONG_POP', 'ESTIMATE', 'TIME_PLACE',
  'USE_IQR_OUTLIERS', 'USE_RANGE_ALL', 'USE_MIDDLE_HALF'];

/* ──────────────────────────────── §17.8 questionnaire bank (own copy) ───── */
/* Book A's ten Q_* ids (design §17.8) — a `judge` claim's `why`/`alsoWhy` and
   a question's `reasons` may name these as well as the §6.6 bank above; a
   `pick` option's `flaw` is drawn from THIS bank only (CONTRACT_A §pick). */
var Q_IDS = ['Q_OVERLAP', 'Q_GAP', 'Q_NO_ZERO', 'Q_NO_TIME', 'Q_LEADING',
  'Q_VAGUE', 'Q_NO_OTHER', 'Q_ONLY_POSITIVE', 'Q_PERSONAL', 'Q_OPEN'];

/* ──────────────────────────────── telegraph phrases (§11.1, extendable) ── */
var TELEGRAPH_PHRASES = ['upper class boundar', 'Q3 − Q1', 'Q3-Q1', 'n/2', 'half of',
  /* Book A additions (this package) */ '× 360', '360 ÷', 'divide by the total', 'multiply by 360'];
/* "start in the middle" is deliberately NOT in this list — it is Colette's
   own hint, quoted verbatim in the A·s2 movie caption (design §19), not a
   telegraph of the method inside a QUESTION prompt. */

/* "(n + 1) ÷ 2" is banned only inside a stem-and-leaf READ prompt (a `values`
   question reading range/mode/median off a stem-and-leaf `fig`, or a
   `stemleaf` kind's own prompt) — checked separately from the general list
   above because the phrase is legitimate maths-register elsewhere (e.g. it is
   exactly how a qlist median position is described in the movie). */
function checkStemleafTelegraph(book, secId, qid, prompt) {
  if (typeof prompt !== 'string') return;
  if (prompt.replace(/−/g, '-').indexOf('(n + 1) ÷ 2') !== -1 || prompt.replace(/−/g, '-').indexOf('(n+1) ÷ 2') !== -1)
    fail(book, secId, qid, 'prompt', 'telegraphs "(n + 1) ÷ 2"');
}

function checkTelegraph(book, secId, qid, prompt) {
  if (typeof prompt !== 'string') return;
  var lower = prompt.toLowerCase();
  TELEGRAPH_PHRASES.forEach(function (ph) {
    if (lower.indexOf(ph.toLowerCase()) !== -1) fail(book, secId, qid, 'prompt', 'telegraphs "' + ph + '"');
  });
}
/* Unicode −/× hygiene: narrowed to symbols that are NEVER legitimate ASCII in
   a stats prompt (× and ^ as a power). ASCII '-' is deliberately NOT banned
   here: §16 item 4 requires hyphenated class ranges ("0-10") to render
   exactly as printed, so a blanket ban would fail correctly authored
   content. */
function checkUnicodeHygiene(book, secId, qid, s, where) {
  if (typeof s !== 'string') return;
  if (/\*/.test(s)) fail(book, secId, qid, 'prompt', 'ASCII * in ' + where + ' — use unicode × ("' + s + '")');
  if (/\^/.test(s)) fail(book, secId, qid, 'prompt', 'ASCII ^ in ' + where + ' — use unicode ² ("' + s + '")');
}

/* ──────────────────────────────── run ────────────────────────────────────── */

var mathcoreLoad = loadBrowserGlobal(MATHCORE_PATH);
var statcoreLoad = loadBrowserGlobal(STATCORE_PATH);
var GJ_STATS = (statcoreLoad.present && !statcoreLoad.error && global.window.GJ_STATS) || null;
var engineLine;
if (!mathcoreLoad.present || !statcoreLoad.present) {
  engineLine = 'statcore.js not present — engine cross-check and FT_RULE_IDS/DX_NAMES whitelist skipped';
} else if (statcoreLoad.error || !GJ_STATS) {
  engineLine = 'statcore.js present but did not load cleanly — engine cross-check skipped' +
    (statcoreLoad.error ? ' (' + statcoreLoad.error.message + ')' : '');
} else {
  engineLine = 'statcore.js present — independent numbers cross-checked against the engine';
}
var DX_NAMES = GJ_STATS ? GJ_STATS.DX_NAMES : null;
var FT_RULE_IDS = GJ_STATS ? GJ_STATS.FT_RULE_IDS : FT_RULE_NAMES;

var packs = [];
PACK_PATHS.forEach(function (p) {
  var loaded = loadBrowserGlobal(p);
  if (!loaded.present) return;
  if (loaded.error) { console.error('FAIL: ' + p + ' did not evaluate: ' + loaded.error.message); process.exit(1); }
});
/* Every key GJ_CONTENT now carries is a pack this run should lint (the
   default three files each attach exactly one; a fixture may attach one
   under any id). */
(Object.keys((global.window && global.window.GJ_CONTENT) || {})).forEach(function (id) {
  packs.push(global.window.GJ_CONTENT[id]);
});

var totalSections = 0, totalQ = 0, totalSteps = 0, totalMarks = 0;
var typeCounts = {};
var report = [];

/* ──────────────────────────────── movie validation ───────────────────────── */

var CHART_OPS = ['table', 'tcell', 'chart', 'plot', 'curve', 'rule', 'drop', 'scale', 'marker', 'box', 'ring', 'bracket'];
var PAPER_OPS = ['write', 'sub', 'tick', 'note', 'stamp', 'clear'];
/* Book A ops (CONTRACT_A.md "Player ops Book A adds", §19) */
var BOOKA_OPS = ['venn', 'vfill', 'pie', 'sector', 'stemleaf', 'leaf', 'key', 'lobf'];
var MOVIE_OPS = CHART_OPS.concat(PAPER_OPS).concat(BOOKA_OPS);
var VENN_REGIONS_2 = ['A', 'B', 'AB', 'out'];
var VENN_REGIONS_3 = ['A', 'B', 'C', 'AB', 'AC', 'BC', 'ABC', 'out'];

function checkMovie(book, secId, movie, rules) {
  var w = secId;
  if (!movie || typeof movie !== 'object' || !Array.isArray(movie.steps)) {
    fail(book, secId, 'movie', 'structure', 'missing movie or steps[]');
    return 0;
  }
  if (movie.steps.length < 6 || movie.steps.length > 10)
    fail(book, secId, 'movie', 'structure', 'movies must be 6-10 steps (got ' + movie.steps.length + ')');

  var lines = 0, redNotes = 0, lastListLen = 0, markersPlaced = 0;
  var tableFreq = null; /* the movie's own frequency column, once a `table` op sets it */
  var movieN = null;
  /* Book A movie state (this package) */
  var vennRegions = null;      /* set once a `venn` op lays circles */
  var stemleafStems = null;    /* set once a `stemleaf` op lays stems */
  var filmLeaves = [];         /* {stem,leaf} pairs placed by `leaf` ops so far */
  var sectorSum = 0, sectorCount = 0;
  var lastChart = null;        /* {x:{min,max}, y:{min,max}} of the last `chart` op */

  movie.steps.forEach(function (step, si) {
    if (typeof step.say !== 'string' || !step.say.trim()) fail(book, secId, 'movie', 'structure', 'step ' + (si + 1) + ' missing caption');
    else if (step.say.length > 140) fail(book, secId, 'movie', 'structure', 'step ' + (si + 1) + ' caption over 140 chars');
    (step.do || []).forEach(function (op, oi) {
      var keys = Object.keys(op);
      if (keys.length !== 1) { fail(book, secId, 'movie', 'structure', 'step ' + (si + 1) + ' op ' + (oi + 1) + ' must have exactly one key'); return; }
      var k = keys[0], v = op[k];
      if (MOVIE_OPS.indexOf(k) === -1) { fail(book, secId, 'movie', 'structure', 'step ' + (si + 1) + ' unknown op "' + k + '"'); return; }
      switch (k) {
        case 'write': case 'sub':
          var text = k === 'write' ? v.text : v.to;
          if (typeof text !== 'string' || !text) fail(book, secId, 'movie', 'structure', k + '.text/to missing at step ' + (si + 1));
          else {
            var items = text.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            if (items.length > 1) lastListLen = items.length;
          }
          lines++;
          break;
        case 'tick':
          if (!Number.isInteger(v.line) || v.line < 0 || v.line >= lines)
            fail(book, secId, 'movie', 'structure', 'tick.line ' + v.line + ' out of range at step ' + (si + 1));
          break;
        case 'note':
          if (v.red) redNotes++;
          break;
        case 'table':
          if (!v.head || !v.rows) fail(book, secId, 'movie', 'structure', 'table op needs head/rows at step ' + (si + 1));
          else {
            var fCol = v.head.findIndex(function (h) { return /freq/i.test(String(h)); });
            if (fCol !== -1) tableFreq = v.rows.map(function (row) { return Number(row[fCol]) || 0; });
          }
          break;
        case 'tcell':
          if (!Number.isInteger(v.r) || !Number.isInteger(v.c)) fail(book, secId, 'movie', 'structure', 'tcell needs r,c at step ' + (si + 1));
          break;
        case 'chart':
          if (!v.x || !v.y) fail(book, secId, 'movie', 'structure', 'chart op needs x/y axes at step ' + (si + 1));
          else lastChart = { x: v.x, y: v.y };
          break;
        case 'plot':
          if (v.x === undefined || v.y === undefined) { fail(book, secId, 'movie', 'structure', 'plot op needs x,y at step ' + (si + 1)); break; }
          if (tableFreq) {
            var cf = [], run = 0;
            tableFreq.forEach(function (f) { run += f; cf.push(run); });
            movieN = run;
            var atCf = cf.indexOf(Number(v.y));
            if (atCf === -1) info('movie ' + secId + ' step ' + (si + 1) + ': plot (' + v.x + ',' + v.y + ') — could not confirm against the movie\'s own table (no matching CF row); skipped, not failed (heuristic table read)');
          }
          break;
        case 'curve':
          if (v.through !== 'all' && !Array.isArray(v.through)) fail(book, secId, 'movie', 'structure', 'curve.through must be "all" or a point list at step ' + (si + 1));
          break;
        case 'rule':
          if (v.h === undefined) { fail(book, secId, 'movie', 'structure', 'rule op needs h at step ' + (si + 1)); break; }
          if (movieN != null) {
            var heights = readHeightsOf(movieN, rules.curveRule);
            var h = R(v.h);
            var isConv = h && [heights.median, heights.Q1, heights.Q3].some(function (c) { return c && req(h, c); });
            if (h && !isConv)
              fail(book, secId, 'movie', 'movie', 'rule op at h = ' + rstr(h) + ' is not a convention height');
          }
          break;
        case 'scale':
          if (v.min === undefined || v.max === undefined) fail(book, secId, 'movie', 'structure', 'scale op needs min/max at step ' + (si + 1));
          break;
        case 'marker':
          if (['min', 'Q1', 'Q2', 'Q3', 'max'].indexOf(v.role) === -1) fail(book, secId, 'movie', 'structure', 'marker.role "' + v.role + '" unknown at step ' + (si + 1));
          if (v.at === undefined) fail(book, secId, 'movie', 'structure', 'marker op needs "at" at step ' + (si + 1));
          markersPlaced++;
          break;
        case 'box':
          if (v && v.line !== undefined) {
            if (!Number.isInteger(v.line) || v.line < 0 || v.line >= lines)
              fail(book, secId, 'movie', 'structure', 'box.line ' + v.line + ' out of range at step ' + (si + 1));
          } else if (markersPlaced < 5) {
            fail(book, secId, 'movie', 'structure', 'box (assemble) op before five markers placed at step ' + (si + 1));
          }
          break;
        case 'ring':
          if (!Number.isInteger(v.i) || v.i < 0 || (lastListLen && v.i >= lastListLen))
            fail(book, secId, 'movie', 'structure', 'ring.i ' + v.i + ' outside the written list at step ' + (si + 1));
          break;
        case 'bracket':
          if (!Number.isInteger(v.i) || !Number.isInteger(v.j) ||
              (lastListLen && (v.i >= lastListLen || v.j >= lastListLen)))
            fail(book, secId, 'movie', 'structure', 'bracket indices outside the written list at step ' + (si + 1));
          break;
        case 'stamp':
          if ((typeof v.text !== 'string' || !v.text) && typeof v.reason !== 'string')
            fail(book, secId, 'movie', 'structure', 'stamp needs text or reason at step ' + (si + 1));
          break;
        case 'drop':
          break;
        case 'clear':
          lines = 0;
          break;
        /* ── Book A ops (CONTRACT_A.md §19) ────────────────────────────── */
        case 'venn':
          if (!Array.isArray(v.circles) || (v.circles.length !== 2 && v.circles.length !== 3))
            fail(book, secId, 'movie', 'structure', 'venn op needs 2 or 3 circles at step ' + (si + 1));
          else {
            var badCircle = v.circles.some(function (c) { return !c || !c.id || typeof c.label !== 'string'; });
            if (badCircle) fail(book, secId, 'movie', 'structure', 'venn op circle missing id/label at step ' + (si + 1));
            else vennRegions = v.circles.length === 3 ? VENN_REGIONS_3 : VENN_REGIONS_2;
          }
          break;
        case 'vfill':
          if (!v.region || v.text === undefined) fail(book, secId, 'movie', 'structure', 'vfill op needs region/text at step ' + (si + 1));
          else if (vennRegions && vennRegions.indexOf(v.region) === -1)
            fail(book, secId, 'movie', 'movie', 'vfill.region "' + v.region + '" is not one of the film\'s venn regions at step ' + (si + 1));
          break;
        case 'pie':
          break; /* draws the circle + radius; nothing to validate positionally */
        case 'sector':
          if (typeof v.deg !== 'number' || v.deg <= 0)
            fail(book, secId, 'movie', 'structure', 'sector.deg must be positive at step ' + (si + 1));
          else { sectorSum += v.deg; sectorCount++; }
          break;
        case 'stemleaf':
          if (!Array.isArray(v.stems) || !v.stems.length)
            fail(book, secId, 'movie', 'structure', 'stemleaf op needs stems[] at step ' + (si + 1));
          else stemleafStems = v.stems;
          filmLeaves = [];
          break;
        case 'leaf':
          if (v.stem === undefined || v.leaf === undefined)
            fail(book, secId, 'movie', 'structure', 'leaf op needs stem/leaf at step ' + (si + 1));
          else {
            if (stemleafStems && stemleafStems.indexOf(v.stem) === -1)
              fail(book, secId, 'movie', 'movie', 'leaf.stem ' + v.stem + ' is not among the film\'s stems at step ' + (si + 1));
            filmLeaves.push({ stem: v.stem, leaf: v.leaf });
          }
          break;
        case 'key':
          if (v.stem === undefined || v.leaf === undefined || typeof v.means !== 'string' || !v.means)
            fail(book, secId, 'movie', 'structure', 'key op needs stem/leaf/means at step ' + (si + 1));
          else {
            var isFilmValue = filmLeaves.some(function (l) { return l.stem === v.stem && l.leaf === v.leaf; });
            if (filmLeaves.length && !isFilmValue)
              fail(book, secId, 'movie', 'movie', 'key stem/leaf is not a value of the film\'s leaves at step ' + (si + 1));
          }
          break;
        case 'lobf':
          if (!Array.isArray(v.through) || v.through.length !== 2)
            fail(book, secId, 'movie', 'structure', 'lobf.through needs two points at step ' + (si + 1));
          else if (lastChart) {
            var outside = v.through.some(function (p) {
              return p[0] < lastChart.x.min || p[0] > lastChart.x.max || p[1] < lastChart.y.min || p[1] > lastChart.y.max;
            });
            if (outside) fail(book, secId, 'movie', 'movie', 'lobf.through has a point outside the film\'s chart at step ' + (si + 1));
          }
          break;
      }
    });
  });
  if (redNotes > 1) fail(book, secId, 'movie', 'structure', 'kitsch ration: at most one red note per movie, got ' + redNotes);
  if (sectorCount && Math.abs(sectorSum - 360) > 1e-9)
    fail(book, secId, 'movie', 'movie', 'sector degrees sum to ' + sectorSum + ', not 360');
  return movie.steps.length;
}

/* ──────────────────────────────── §6.5-style own unit-weight table ──────── */
/* An independent re-implementation of the method/accuracy unit table (§6.5 +
   the 7 Sept review's weights), used ONLY to prove "reachable marks" — never
   consulted by the answer re-derivation above. */

function myUnitsOf(q, rules) {
  switch (q.kind) {
    case 'qlist': return qlistUnits(q);
    case 'cftable': return cftableUnits(q);
    case 'cfplot': return cfplotUnits(q);
    case 'cfread': return cfreadUnits(q);
    case 'boxplot': return boxplotUnits(q, rules);
    case 'compare': return [{ band: 'method', w: 1 }, { band: 'accuracy', w: 1 }];
    case 'judge': return judgeUnits(q);
    case 'values': return valuesUnits(q);
    case 'order': return orderUnits(q);
    case 'pick': return [{ band: 'accuracy', w: 1 }, { band: 'method', w: 1 }]; /* PICK, WHY */
    case 'stemleaf': return stemleafKindUnits(q);
    case 'pie': return pieKindUnits(q);
    case 'scatter': return scatterKindUnits(q);
    default: return [];
  }
}
function orderUnits(q) {
  var n = (q.tiles || []).length;
  if (q.cyclic) {
    var out = [];
    for (var i = 0; i < n - 1; i++) out.push({ band: 'method', w: 1 });
    out.push({ band: 'accuracy', w: 1 });
    return out;
  }
  return [{ band: 'accuracy', w: 1 }]; /* SEQ */
}
function stemleafKindUnits(q) {
  var out = [{ band: 'method', w: 1 }, { band: 'method', w: 1 }]; /* LEAVES, ORDERED */
  if (q.key && q.key.ask) out.push({ band: 'accuracy', w: 1 }); /* KEY */
  return out;
}
function pieKindUnits(q) {
  var out = (q.cats || []).map(function () { return { band: 'method', w: 1 }; }); /* ANG_<id> */
  out.push({ band: 'method', w: 1 }); /* SUM */
  out.push({ band: 'accuracy', w: 1 }); /* SECTORS */
  out.push({ band: 'accuracy', w: 1 }); /* LABELS */
  return out;
}
function scatterKindUnits(q) {
  var out = [{ band: 'method', w: q.pointsW || 1 }]; /* POINTS */
  (q.asks || []).forEach(function (a) {
    if (a.type === 'lobf') out.push({ band: 'method', w: 1 });
    else if (a.type === 'estimate') out.push({ band: 'accuracy', w: 1 });
    else if (a.type === 'corr') out.push({ band: 'accuracy', w: 1 });
    else if (a.type === 'outlier') out.push({ band: 'accuracy', w: 1 });
  });
  return out;
}
function qlistUnits(q) {
  var out = [{ band: 'method', w: 1 }]; /* ORDER */
  var cuts = (q.ask || ['Q1', 'Q2', 'Q3', 'IQR']).filter(function (a) { return typeof a === 'string'; });
  cuts.forEach(function (c) { out.push({ band: c === 'IQR' ? 'accuracy' : 'method', w: 1 }); });
  if (cuts.indexOf('IQR') === -1 && out.length > 1) out[out.length - 1].band = 'accuracy';
  return out;
}
function cftableUnits(q) {
  var pre = q.prefill || [], out = [];
  (q.classes || []).forEach(function (c, i) { if (pre.indexOf(i) === -1) out.push({ band: 'method', w: 1 }); });
  if (out.length) out[out.length - 1].band = 'accuracy';
  return out;
}
function cfplotUnits(q) {
  var w = (q.mkUnits && q.mkUnits.POINTS) || 1;
  return [{ band: 'method', w: w }, { band: 'accuracy', w: 1 }];
}
function cfreadUnits(q) {
  var out = [];
  (q.ask || []).forEach(function (a) {
    if (typeof a === 'string') {
      if (a === 'IQR') { out.push({ band: 'accuracy', w: 1 }); return; }
      out.push({ band: 'method', w: 1 }); out.push({ band: 'accuracy', w: 1 });
    } else if (a && a.type === 'atX') {
      out.push({ band: 'method', w: 1 }); out.push({ band: 'accuracy', w: 1 }); out.push({ band: 'accuracy', w: 1 });
    }
  });
  return out;
}
function boxplotUnits(q, rules) {
  var stage = [];
  if (q.from === 'qlist') stage = qlistUnits(q);
  else if (q.from === 'curve') stage = cfreadUnits(q);
  else if (q.from === 'values') stage = valuesUnits(q);
  return stage.concat([{ band: 'method', w: 1 }, { band: 'accuracy', w: 1 }]);
}
function judgeUnits(q) {
  var out = [];
  (q.claims || []).forEach(function (c) {
    out.push({ band: 'accuracy', w: 1 });
    if (!c.options && c.fair === false) out.push({ band: 'method', w: 1 });
  });
  return out;
}
function valuesUnits(q) {
  var order = q.order || (q.slots || []).map(function (s) { return s.id; });
  return order.map(function (id) {
    var s = (q.slots || []).filter(function (x) { return x.id === id; })[0] || {};
    return { band: s.earns === 'method' ? 'method' : 'accuracy', w: s.w || 1 };
  });
}
function checkReachableMarks(book, secId, q, rules) {
  if (!Array.isArray(q.marks)) return;
  var units = myUnitsOf(q, rules);
  var mSum = 0, aSum = 0;
  units.forEach(function (u) { if (u.band === 'accuracy') aSum += u.w; else mSum += u.w; });
  if (mSum < (q.marks[0] || 0) || aSum < (q.marks[1] || 0))
    fail(book, secId, q.id, 'marks', '[' + q.marks[0] + ',' + q.marks[1] + '] cannot be earned');
}

/* ──────────────────────────────── judge verdict/options check ───────────── */
function checkJudgeOptions(book, secId, q) {
  (q.claims || []).forEach(function (c, i) {
    if (c.options) {
      if (c.options.indexOf(c.verdict) === -1)
        fail(book, secId, q.id, 'answer', 'authored verdict "' + c.verdict + '" but re-derived options are ' + c.options.join('/'));
    }
  });
}

/* ──────────────────────────────── src / dp / dx-whitelist (generic) ─────── */
function checkGenericFields(book, secId, q) {
  if (typeof q.src !== 'string' || !q.src.trim()) fail(book, secId, q.id, 'src', 'no src on this question');
  if (q.dx) {
    var keys = Array.isArray(q.dx) ? q.dx : Object.keys(q.dx);
    keys.forEach(function (code) {
      var c = Array.isArray(q.dx) ? code : q.dx[code];
      if (DX_NAMES && !DX_NAMES.hasOwnProperty(c))
        fail(book, secId, q.id, 'dx', 'authored dx id "' + c + '" not in DX_NAMES');
    });
  }
}

/* ──────────────────────────────── per-kind re-derivation ─────────────────── */

function checkQlist(book, secId, q, rules) {
  var r = (q.rules && q.rules.quartileRule) || rules.quartileRule;
  var n = (q.values || []).length;
  if (r !== 'halves' && !positionsExpressible(n, r))
    fail(book, secId, q.id, 'qlist', 'n = ' + n + ' leaves a quartile between two tiles');
  var truth = myQuartiles(q.values, r);
  if (!truth || !q.answer) return;
  ['Q1', 'Q2', 'Q3', 'IQR'].forEach(function (c) {
    if (!q.answer[c]) return;
    var authored = R(q.answer[c]), got = truth[c];
    if (authored && got && !req(authored, got))
      fail(book, secId, q.id, 'answer', 'authored ' + c + ' = ' + rstr(authored) + ' but re-derived ' + c + ' = ' + rstr(got));
  });
  if (GJ_STATS && GJ_STATS.quartiles) {
    var eng = GJ_STATS.quartiles(q.values, r);
    if (eng && truth) {
      ['Q1', 'Q2', 'Q3', 'IQR'].forEach(function (c) {
        if (eng[c] && truth[c] && !req(eng[c], truth[c]))
          fail(book, secId, q.id, 'answer', 'engine cross-check: independent ' + c + ' = ' + rstr(truth[c]) + ' disagrees with statcore\'s ' + rstr(eng[c]));
      });
    }
  }
}

function checkCftable(book, secId, q) {
  var truth = myCumulate(q.classes);
  if (!Array.isArray(q.answerCF)) return;
  truth.forEach(function (t, i) {
    var authored = Number(q.answerCF[i]);
    if (q.answerCF[i] !== undefined && authored !== t)
      fail(book, secId, q.id, 'answer', 'authored CF[' + i + '] = ' + q.answerCF[i] + ' but re-derived CF[' + i + '] = ' + t);
  });
  var lastTruth = truth.length ? truth[truth.length - 1] : 0;
  var sumF = (q.classes || []).reduce(function (a, c) { return a + (Number(c.f) || 0); }, 0);
  if (lastTruth !== sumF) fail(book, secId, q.id, 'answer', 'authored classes do not sum to their own last CF (internal inconsistency)');
}

function checkCfplot(book, secId, q, rules) {
  if (!q.chart || !q.chart.sq) return;
  var truth = myExpectedPoints(q, rules);
  var sqx = R(q.chart.sq.x) || R1, sqy = R(q.chart.sq.y) || R1;
  var xmin = R(q.chart.x && q.chart.x.min), xmax = R(q.chart.x && q.chart.x.max);
  var ymin = R(q.chart.y && q.chart.y.min), ymax = R(q.chart.y && q.chart.y.max);
  truth.forEach(function (p) {
    var offGrid = !req(rat(rnum(p[0]) % rnum(sqx) < 1e-9 ? 0 : 1), R0) ||
      (Math.abs(rnum(p[0]) / rnum(sqx) - Math.round(rnum(p[0]) / rnum(sqx))) > 1e-9) ||
      (Math.abs(rnum(p[1]) / rnum(sqy) - Math.round(rnum(p[1]) / rnum(sqy))) > 1e-9);
    var outOfAxes = (xmin && rlt(p[0], xmin)) || (xmax && rlt(xmax, p[0])) ||
      (ymin && rlt(p[1], ymin)) || (ymax && rlt(ymax, p[1]));
    if (offGrid || outOfAxes)
      fail(book, secId, q.id, 'plot', '(' + rstr(p[0]) + ', ' + rstr(p[1]) + ') is off the grid');
  });

  /* distinguishability: the classic mis-plots must not coincide with truth */
  var classes = q.classes || [], cf = myCumulate(classes);
  var startIdx = truth.length - classes.length; /* 0 or 1, matching myExpectedPoints */
  var truthNoStart = truth.slice(startIdx);
  var mids = classes.map(function (c, i) { return [rdiv(radd(R(c.lo), R(c.hi)), R2), rat(cf[i])]; });
  var lows = classes.map(function (c, i) { return [R(c.lo), rat(cf[i])]; });
  var freqs = classes.map(function (c, i) { return [R(c.hi), rat(Number(c.f) || 0)]; });
  if (seriesEq(mids, truthNoStart)) fail(book, secId, q.id, 'dx', '"PLOT_MIDPOINT" equals the truth');
  if (seriesEq(lows, truthNoStart)) fail(book, secId, q.id, 'dx', '"PLOT_LOWER_BOUND" equals the truth');
  if (seriesEq(freqs, truthNoStart)) fail(book, secId, q.id, 'dx', '"PLOT_FREQ_NOT_CF" equals the truth');

  /* pack-default report (non-fatal, §6.2): a question's own startPoint that
     differs from the pack default is a deliberate, supported override — we
     only NOTE it so the difference is visibly intentional, we do not fail it. */
  if (q.startPoint !== undefined && q.startPoint !== rules.startPoint)
    info('cfplot ' + secId + '/' + q.id + ': startPoint (' + q.startPoint + ') differs from the pack default (' + rules.startPoint + ') — reported per §6.2, not failed');
}

function checkCfread(book, secId, q, rules) {
  if (!q.curve || !q.n) return;
  var n = Number(q.n);
  var heights = readHeightsOf(n, (q.rules && q.rules.curveRule) || rules.curveRule);
  var sq = (q.chart && q.chart.sq && q.chart.sq.x) || 1;
  var tolSquares = rat(1, 2);

  /* Only the heights actually asked (§11.1: "at every asked height") — an
     'IQR' ask needs both Q1 and Q3 read even though IQR itself is not one
     of the three named heights. */
  var askedStrings = (q.ask || []).filter(function (a) { return typeof a === 'string'; });
  var itemsToCheck = askedStrings.filter(function (a) { return a !== 'IQR'; });
  if (askedStrings.indexOf('IQR') !== -1) {
    if (itemsToCheck.indexOf('Q1') === -1) itemsToCheck.push('Q1');
    if (itemsToCheck.indexOf('Q3') === -1) itemsToCheck.push('Q3');
  }

  itemsToCheck.forEach(function (item) {
    var h = item === 'median' ? heights.median : heights[item];
    var chord = chordX(q.curve, h);
    if (chord === null) return;
    var spline = buildMonotoneSpline(curvePts(q.curve));
    var sx = splineX(spline, h);
    if (sx !== null) {
      var diffSquares = Math.abs(sx - rnum(chord)) / sq;
      if (diffSquares > 0.5 + 1e-9)
        fail(book, secId, q.id, 'curve', 'too bendy at h = ' + rstr(h));
    }
    if (q.answer && q.answer[item] && item !== 'IQR') {
      var authored = R(q.answer[item]);
      if (authored && !req(authored, chord))
        fail(book, secId, q.id, 'answer', 'authored ' + item + ' = ' + rstr(authored) + ' but re-derived ' + item + ' = ' + rstr(chord));
    }
    if (GJ_STATS && GJ_STATS.curveX) {
      var eng = GJ_STATS.curveX(q.curve, h);
      if (eng && chord && !req(eng, chord))
        fail(book, secId, q.id, 'answer', 'engine cross-check: independent ' + item + ' = ' + rstr(chord) + ' disagrees with statcore\'s curveX ' + rstr(eng));
    }
  });
  if (q.answer && q.answer.IQR) {
    var q1 = chordX(q.curve, heights.Q1), q3 = chordX(q.curve, heights.Q3);
    if (q1 && q3) {
      var truthIqr = rsub(q3, q1), authoredIqr = R(q.answer.IQR);
      if (authoredIqr && !req(authoredIqr, truthIqr))
        fail(book, secId, q.id, 'answer', 'authored IQR = ' + rstr(authoredIqr) + ' but re-derived IQR = ' + rstr(truthIqr));
    }
  }

  /* distinguishability: n/2 must differ from half the axis max; Q1/Q3 must differ from each other */
  var yMax = R(q.chart && q.chart.y && q.chart.y.max);
  if (yMax && req(heights.median, rdiv(yMax, R2)))
    fail(book, secId, q.id, 'dx', '"READ_HALF_AXIS" equals the truth');
  if (req(heights.Q1, heights.Q3))
    fail(book, secId, q.id, 'dx', '"READ_Q_SWAPPED" equals the truth');

  /* atX items */
  (q.ask || []).forEach(function (a) {
    if (!a || a.type !== 'atX') return;
    var cf = chordY(q.curve, a.x);
    if (cf === null || !q.answer) return;
    var N = rat(n), given;
    if (a.want === 'countBelow') given = cf;
    else if (a.want === 'countAbove') given = rsub(N, cf);
    else if (a.want === 'pctBelow') given = rat(Math.round(rnum(rmul(rdiv(cf, N), rat(100)))));
    else if (a.want === 'pctAbove') given = rat(Math.round(rnum(rmul(rdiv(rsub(N, cf), N), rat(100)))));
    if (given && q.answer.atX !== undefined) {
      var authored = R(q.answer.atX);
      if (authored && !req(authored, given))
        fail(book, secId, q.id, 'answer', 'authored atX answer = ' + rstr(authored) + ' but re-derived ' + rstr(given));
    }
  });
}

function checkBoxplot(book, secId, q, rules) {
  var truth = null;
  if (q.given) {
    truth = {};
    ['min', 'Q1', 'Q2', 'Q3', 'max'].forEach(function (k) { truth[k] = R(q.given[k]); });
    if (truth.min && truth.Q1 && rlt(truth.Q1, truth.min))
      fail(book, secId, q.id, 'answer', 'authored Q1 sits below the authored minimum (internal inconsistency)');
    if (truth.max && truth.Q3 && rlt(truth.max, truth.Q3))
      fail(book, secId, q.id, 'answer', 'authored max sits below the authored upper quartile (internal inconsistency)');
  } else if (q.from === 'qlist') {
    var qt = myQuartiles(q.values, (q.rules && q.rules.quartileRule) || rules.quartileRule);
    if (qt) truth = { min: qt.sorted[0], Q1: qt.Q1, Q2: qt.Q2, Q3: qt.Q3, max: qt.sorted[qt.sorted.length - 1] };
  } else if (q.from === 'curve' && q.curve && q.n) {
    var heights = readHeightsOf(Number(q.n), (q.rules && q.rules.curveRule) || rules.curveRule);
    truth = {
      Q1: chordX(q.curve, heights.Q1), Q2: chordX(q.curve, heights.median), Q3: chordX(q.curve, heights.Q3),
      min: q.given && R(q.given.min), max: q.given && R(q.given.max)
    };
  } else if (q.from === 'values' && Array.isArray(q.slots)) {
    truth = {};
    ['min', 'Q1', 'Q2', 'Q3', 'max'].forEach(function (k) {
      var slot = q.slots.filter(function (s) { return s.id === k; })[0];
      if (slot && slot.answer) truth[k] = R(slot.answer);
    });
  }
  if (truth && q.answer) {
    ['min', 'Q1', 'Q2', 'Q3', 'max'].forEach(function (k) {
      if (q.answer[k] === undefined || truth[k] === undefined || truth[k] === null) return;
      var authored = R(q.answer[k]);
      if (authored && !req(authored, truth[k]))
        fail(book, secId, q.id, 'answer', 'authored ' + k + ' = ' + rstr(authored) + ' but re-derived ' + k + ' = ' + rstr(truth[k]));
    });
  }
  /* distinguishability: the CF-as-values pattern must differ from the truth */
  if (truth && q.from === 'curve' && q.n) {
    var N = Number(q.n);
    var cfPattern = { Q1: rat(N, 4), Q2: rat(N, 2), Q3: rat(3 * N, 4) };
    if (truth.Q1 && truth.Q2 && truth.Q3 &&
        req(truth.Q1, cfPattern.Q1) && req(truth.Q2, cfPattern.Q2) && req(truth.Q3, cfPattern.Q3))
      fail(book, secId, q.id, 'dx', '"BOX_CF_AS_VALUES" equals the truth');
  }
}

function contextWord(ctx, forHigher) {
  if (!ctx || !ctx.higherIs) return null;
  return forHigher ? ctx.higherIs : ctx.higherIs;
}
function checkCompare(book, secId, q) {
  var plots = q.plots || [];
  if (plots.length !== 2) return;
  var A0 = plots[0], B0 = plots[1];
  var medA = R(A0.summary && A0.summary.Q2), medB = R(B0.summary && B0.summary.Q2);
  if (medA && medB && req(medA, medB) && !q.equal)
    fail(book, secId, q.id, 'answer', 'authored plots have equal medians but q.equal is not set — no group is definitively higher');
  if (!q.context || !q.context.higherIs)
    fail(book, secId, q.id, 'src', 'compare question missing context.higherIs');
}

function checkJudge(book, secId, q) {
  /* Book A: a judge claim's why/alsoWhy, and a question's `reasons` filter,
     may name the §6.6 sampling bank OR the §17.8 Q_* questionnaire bank. */
  var bank = (GJ_STATS ? Object.keys(GJ_STATS.REASONS || {}) : REASON_IDS).concat(Q_IDS);
  (q.claims || []).forEach(function (c, i) {
    if (c.options) return; /* verdict/options checked separately */
    if (c.fair === false) {
      if (!c.why) fail(book, secId, q.id, 'src', 'claim ' + (i + 1) + ' is fair:false with no why');
      else if (bank.indexOf(c.why) === -1) fail(book, secId, q.id, 'src', 'claim ' + (i + 1) + ' why "' + c.why + '" not in the reason bank');
      (c.alsoWhy || []).forEach(function (w) {
        if (bank.indexOf(w) === -1) fail(book, secId, q.id, 'src', 'claim ' + (i + 1) + ' alsoWhy "' + w + '" not in the reason bank');
      });
    } else if (c.why) {
      fail(book, secId, q.id, 'src', 'claim ' + (i + 1) + ' is fair:true but carries a why');
    }
  });
  (q.reasons || []).forEach(function (rid) {
    if (bank.indexOf(rid) === -1) fail(book, secId, q.id, 'src', 'reasons names "' + rid + '" which is not in the reason bank');
  });
  checkJudgeOptions(book, secId, q);
}

function checkValues(book, secId, q) {
  (q.slots || []).forEach(function (slot) {
    if (!slot.answer || slot.answer.constraints) return;
    var a = R(slot.answer);
    if (!a) return;
    if (!terminates(a) && slot.dp === undefined && q.dp === undefined)
      fail(book, secId, q.id, 'values', 'a non-terminating answer with no dp');
    if (slot.ft && slot.ft.rule && FT_RULE_IDS.indexOf(slot.ft.rule) === -1)
      fail(book, secId, q.id, 'src', 'slot "' + slot.id + '" ft.rule "' + slot.ft.rule + '" not in the closed table');
  });
  checkValuesFig(book, secId, q);
}

/* ──────────────────────────────── §17.3 order — permutation re-check ────── */
function checkOrder(book, secId, q) {
  var tiles = q.tiles || [], answer = q.answer;
  if (!Array.isArray(answer) || answer.length !== tiles.length) {
    fail(book, secId, q.id, 'order', 'answer is not a permutation of the ' + tiles.length + ' tiles');
    return;
  }
  var seen = {}, ok = true;
  answer.forEach(function (i) {
    if (!Number.isInteger(i) || i < 0 || i >= tiles.length || seen[i]) ok = false;
    seen[i] = true;
  });
  if (!ok) fail(book, secId, q.id, 'order', 'answer is not a permutation of the ' + tiles.length + ' tiles');
  if (q.cyclic && tiles.length < 3)
    fail(book, secId, q.id, 'order', 'cyclic:true needs at least 3 tiles (got ' + tiles.length + ')');
}

/* ──────────────────────────────── §17.4 pick — one best, every other flawed */
function checkPick(book, secId, q) {
  var options = q.options || [];
  var bestCount = options.filter(function (o) { return o.best === true; }).length;
  if (bestCount !== 1)
    fail(book, secId, q.id, 'pick', 'exactly one option must be best:true (found ' + bestCount + ')');
  options.forEach(function (o, i) {
    if (o.best) return;
    if (!o.flaw || Q_IDS.indexOf(o.flaw) === -1)
      fail(book, secId, q.id, 'pick', 'option ' + (i + 1) + ' is not best but has no flaw id from the Q_* bank');
  });
  for (var i = 0; i < options.length; i++) {
    for (var j = i + 1; j < options.length; j++) {
      if (options[i].text !== undefined && options[i].text === options[j].text)
        fail(book, secId, q.id, 'pick', 'options ' + (i + 1) + ' and ' + (j + 1) + ' have identical text');
    }
  }
}

/* ──────────────────────────────── §17.1 values figures — venn2/venn3/stemleaf */
function slotAnswerNum(slot) {
  if (!slot || slot.answer === undefined || slot.answer === null || (slot.answer && slot.answer.constraints)) return null;
  return R(slot.answer);
}
function checkValuesVenn(book, secId, q, is3) {
  var fig = q.fig, slots = q.slots || [];
  var n = R(fig.n);
  var regionIds = is3 ? VENN_REGIONS_3 : VENN_REGIONS_2;
  var sums = {};
  regionIds.forEach(function (r) { sums[r] = R0; });
  var anyMissing = false;
  slots.forEach(function (s) {
    if (!s.region) { fail(book, secId, q.id, 'venn', 'slot "' + s.id + '" has no region'); return; }
    if (regionIds.indexOf(s.region) === -1) {
      fail(book, secId, q.id, 'venn', 'slot "' + s.id + '" region "' + s.region + '" is not one of ' + regionIds.join('/'));
      return;
    }
    var v = slotAnswerNum(s);
    if (!v) { anyMissing = true; return; }
    sums[s.region] = radd(sums[s.region], v);
  });
  if (anyMissing) return; /* can't re-derive totals with an unauthored slot answer */
  var totalAll = regionIds.reduce(function (acc, r) { return radd(acc, sums[r]); }, R0);
  if (n && !req(totalAll, n))
    fail(book, secId, q.id, 'venn', 'the regions do not add up — the ' + regionIds.length + ' regions sum to ' + rstr(totalAll) + ', not n = ' + rstr(n));
  var totals = fig.totals || {};
  var circleIds = is3 ? ['A', 'B', 'C'] : ['A', 'B'];
  circleIds.forEach(function (c) {
    if (totals[c] === undefined) return;
    var t = R(totals[c]);
    var inCircle = regionIds.filter(function (r) { return r !== 'out' && r.indexOf(c) !== -1; });
    var circleSum = inCircle.reduce(function (acc, r) { return radd(acc, sums[r]); }, R0);
    if (t && !req(circleSum, t))
      fail(book, secId, q.id, 'venn', 'the regions do not add up — circle ' + c + '\'s regions sum to ' + rstr(circleSum) + ', not totals.' + c + ' = ' + rstr(t));
  });
}
/* decimals 0 -> stem=floor(v/10), leaf=v mod 10; decimals 1 -> stem=floor(v), leaf=round(10*frac) */
function splitStemLeaf(v, decimals) {
  var num = rnum(v);
  if (decimals === 1) {
    var stem = Math.floor(num + 1e-9);
    var leaf = Math.round((num - stem) * 10);
    return { stem: stem, leaf: leaf };
  }
  var stem2 = Math.floor(num / 10 + 1e-9);
  var leaf2 = Math.round(num - stem2 * 10);
  return { stem: stem2, leaf: leaf2 };
}
function checkValuesStemleafFig(book, secId, q) {
  var fig = q.fig, slots = q.slots || [];
  var rows = fig.rows || {};
  var list = [];
  Object.keys(rows).forEach(function (stem) {
    (rows[stem] || []).forEach(function (leaf) {
      var num = fig.decimals === 1 ? (Number(stem) + Number(leaf) / 10) : (Number(stem) * 10 + Number(leaf));
      list.push(num);
    });
  });
  list.sort(function (a, b) { return a - b; });
  if (!list.length) return;
  var min = list[0], max = list[list.length - 1];
  var freq = {}; list.forEach(function (v) { freq[v] = (freq[v] || 0) + 1; });
  var modeVal = null, modeCount = -1;
  list.forEach(function (v) { if (freq[v] > modeCount) { modeCount = freq[v]; modeVal = v; } });
  var mid = Math.floor(list.length / 2);
  var medianVal = list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
  var truthByName = { range: max - min, mode: modeVal, median: medianVal };
  slots.forEach(function (s) {
    var name = /range/i.test(s.label || s.id || '') ? 'range' : /mode/i.test(s.label || s.id || '') ? 'mode' : /median/i.test(s.label || s.id || '') ? 'median' : null;
    if (!name) return;
    var authored = slotAnswerNum(s);
    if (!authored) return;
    var truth = R(truthByName[name]);
    if (truth && !req(authored, truth))
      fail(book, secId, q.id, 'stemleaf', 'slot "' + s.id + '" (' + name + ') authored ' + rstr(authored) + ' but re-derived from the diagram ' + rstr(truth));
  });
  if (fig.key && fig.key.stem !== undefined && fig.key.leaf !== undefined) {
    var kv = fig.decimals === 1 ? (Number(fig.key.stem) + Number(fig.key.leaf) / 10) : (Number(fig.key.stem) * 10 + Number(fig.key.leaf));
    var kstem = String(fig.key.stem);
    var rowHasLeaf = (rows[kstem] || rows[Number(kstem)] || []).some(function (l) { return Number(l) === Number(fig.key.leaf); });
    if (!rowHasLeaf)
      fail(book, secId, q.id, 'stemleaf', 'key stem/leaf does not reproduce a value on the diagram');
    if (typeof fig.key.means !== 'string' || fig.key.means.indexOf(String(kv)) === -1)
      fail(book, secId, q.id, 'stemleaf', 'key.means does not carry the value ' + kv);
  }
}
function checkValuesFig(book, secId, q) {
  if (!q.fig || !q.fig.type) return;
  if (q.fig.type === 'venn2') checkValuesVenn(book, secId, q, false);
  else if (q.fig.type === 'venn3') checkValuesVenn(book, secId, q, true);
  else if (q.fig.type === 'stemleaf') { checkValuesStemleafFig(book, secId, q); checkStemleafTelegraph(book, secId, q.id, q.prompt); }
}

/* ──────────────────────────────── §17.5 stemleaf kind — build the diagram ── */
function checkStemleafKind(book, secId, q) {
  checkStemleafTelegraph(book, secId, q.id, q.prompt);
  var decimals = q.decimals, stems = q.stems || [];
  var values = q.values || [];
  var seenPairs = {};
  values.forEach(function (v) {
    var sl = splitStemLeaf(R(v), decimals);
    if (stems.indexOf(sl.stem) === -1)
      fail(book, secId, q.id, 'stemleaf', 'value ' + v + '\'s stem ' + sl.stem + ' is not in stems');
    seenPairs[sl.stem + '|' + sl.leaf] = (seenPairs[sl.stem + '|' + sl.leaf] || 0) + 1;
  });
  if (q.prefill && Array.isArray(q.prefill.stemsDone)) {
    q.prefill.stemsDone.forEach(function (s) {
      if (stems.indexOf(s) === -1)
        fail(book, secId, q.id, 'stemleaf', 'prefill.stemsDone names stem ' + s + ' which is not in stems');
    });
  }
  if (q.back && Array.isArray(q.back.values)) {
    q.back.values.forEach(function (v) {
      var sl = splitStemLeaf(R(v), decimals);
      if (stems.indexOf(sl.stem) === -1)
        fail(book, secId, q.id, 'stemleaf', 'back value ' + v + '\'s stem ' + sl.stem + ' is not in stems');
    });
  }
  var keyGiven = q.key && q.key.stem !== undefined && q.key.leaf !== undefined;
  var keyAsked = q.key && q.key.ask === true;
  if (keyGiven && keyAsked)
    fail(book, secId, q.id, 'stemleaf', 'key.ask and a given key cannot both be present');
  if (keyGiven) {
    var pairKey = q.key.stem + '|' + q.key.leaf;
    if (!seenPairs[pairKey])
      fail(book, secId, q.id, 'stemleaf', 'given key stem/leaf does not reproduce a value of the data');
    if (typeof q.key.means !== 'string' || !q.key.means)
      fail(book, secId, q.id, 'stemleaf', 'given key has no means text');
  }
}

/* ──────────────────────────────── §17.6 pie kind ─────────────────────────── */
function checkPieKind(book, secId, q) {
  var cats = q.cats || [];
  var total = R(q.total);
  var sumF = cats.reduce(function (a, c) { return a + (Number(c.f) || 0); }, 0);
  if (total && Math.abs(rnum(total) - sumF) > 1e-9)
    fail(book, secId, q.id, 'pie', 'total = ' + rstr(total) + ' does not equal Σf = ' + sumF);
  if (!total || !rnum(total)) return;
  var angleSum = 0, pctColumn = [], degColumn = [];
  cats.forEach(function (c) {
    var f = Number(c.f) || 0;
    var angle = f * 360 / rnum(total);
    var pct = f * 100 / rnum(total);
    degColumn.push(angle); pctColumn.push(pct);
    if (Math.abs(angle - Math.round(angle)) > 1e-9)
      fail(book, secId, q.id, 'pie', 'angle for "' + c.label + '" is not a whole number of degrees');
    angleSum += Math.round(angle);
  });
  if (angleSum !== 360)
    fail(book, secId, q.id, 'pie', 'angles sum to ' + angleSum + ', not 360');
  var indistinguishable = pctColumn.every(function (p, i) { return Math.abs(p - degColumn[i]) < 1e-9; });
  if (indistinguishable)
    fail(book, secId, q.id, 'dx', '"PIE_PCT_NOT_DEG" equals the truth');
}

/* ──────────────────────────────── §17.7 scatter kind ─────────────────────── */
function pointKey(p) { return rnum(R(p[0])) + ',' + rnum(R(p[1])); }
function leastSquares(points) {
  var n = points.length;
  var sx = 0, sy = 0;
  points.forEach(function (p) { sx += p[0]; sy += p[1]; });
  var mx = sx / n, my = sy / n;
  var num = 0, den = 0;
  points.forEach(function (p) { num += (p[0] - mx) * (p[1] - my); den += (p[0] - mx) * (p[0] - mx); });
  var m = den ? num / den : 0;
  return { m: m, c: my - m * mx, meanX: mx, meanY: my };
}
function pearsonR(points) {
  var n = points.length, sx = 0, sy = 0;
  points.forEach(function (p) { sx += p[0]; sy += p[1]; });
  var mx = sx / n, my = sy / n;
  var num = 0, dx = 0, dy = 0;
  points.forEach(function (p) { num += (p[0] - mx) * (p[1] - my); dx += (p[0] - mx) * (p[0] - mx); dy += (p[1] - my) * (p[1] - my); });
  return (dx && dy) ? num / Math.sqrt(dx * dy) : 0;
}
function checkScatterKind(book, secId, q) {
  var given = q.given || [], toPlot = q.toPlot || [];
  var all = given.concat(toPlot);
  var chart = q.chart || {};
  var sqx = (chart.sq && (chart.sq.x !== undefined ? chart.sq.x : chart.sq)) || 1;
  var sqy = (chart.sq && (chart.sq.y !== undefined ? chart.sq.y : chart.sq)) || sqx;
  var xr = chart.x || {}, yr = chart.y || {};

  /* given/toPlot disjoint */
  var givenKeys = {}; given.forEach(function (p) { givenKeys[pointKey(p)] = true; });
  var overlap = toPlot.some(function (p) { return givenKeys[pointKey(p)]; });
  if (overlap) fail(book, secId, q.id, 'scatter', 'given and toPlot share a point');

  /* on-grid + inside axes with >=2 squares headroom */
  /* `snap` (2 = a point may sit on a half small square): the board snaps to
     sq / snap, so that is the grid a point must be on */
  var snapDiv = (q.chart && Number(q.chart.snap) >= 1) ? Number(q.chart.snap) : 1;
  var gx = sqx / snapDiv, gy = sqy / snapDiv;
  all.forEach(function (p) {
    var offGridX = Math.abs(p[0] / gx - Math.round(p[0] / gx)) > 1e-9;
    var offGridY = Math.abs(p[1] / gy - Math.round(p[1] / gy)) > 1e-9;
    var outOfAxes = (xr.min !== undefined && p[0] < xr.min) || (xr.max !== undefined && p[0] > xr.max) ||
      (yr.min !== undefined && p[1] < yr.min) || (yr.max !== undefined && p[1] > yr.max);
    var headroomX = xr.max !== undefined && (xr.max - p[0]) < 2 * sqx && (p[0] - (xr.min || 0)) < 2 * sqx ? false : true;
    if (offGridX || offGridY || outOfAxes)
      fail(book, secId, q.id, 'scatter', '(' + p[0] + ', ' + p[1] + ') is off the grid');
  });
  if (xr.max !== undefined && xr.min !== undefined) {
    var xHeadroom = (xr.max - xr.min) - (Math.max.apply(null, all.map(function (p) { return p[0]; })) - Math.min.apply(null, all.map(function (p) { return p[0]; })));
    if (xHeadroom < 2 * sqx - 1e-9) fail(book, secId, q.id, 'scatter', 'x axis has less than 2 squares of headroom around the plotted points');
  }
  if (yr.max !== undefined && yr.min !== undefined) {
    var yHeadroom = (yr.max - yr.min) - (Math.max.apply(null, all.map(function (p) { return p[1]; })) - Math.min.apply(null, all.map(function (p) { return p[1]; })));
    if (yHeadroom < 2 * sqy - 1e-9) fail(book, secId, q.id, 'scatter', 'y axis has less than 2 squares of headroom around the plotted points');
  }

  if (all.length < 2) return;
  var ls = leastSquares(all);
  var r = pearsonR(all);
  var asks = q.asks || [];

  asks.forEach(function (a) {
    if (a.type === 'corr' && q.answer) { /* no per-question authored answer field in the schema for corr at author time beyond asks[].answer */
    }
    if (a.type === 'corr' && a.answer) {
      var sign = ls.m > 1e-9 ? 'positive' : ls.m < -1e-9 ? 'negative' : 'none';
      if (a.answer === 'none' && Math.abs(r) >= 0.3)
        fail(book, secId, q.id, 'scatter', 'corr answer "none" but |r| = ' + Math.abs(r).toFixed(2) + ' >= 0.3');
      else if (a.answer !== 'none' && a.answer !== sign)
        fail(book, secId, q.id, 'scatter', 'corr answer "' + a.answer + '" disagrees with the least-squares slope\'s sign (' + sign + ')');
    }
    if (a.type === 'estimate') {
      var axisRange = a.from === 'y' ? { min: Math.min.apply(null, all.map(function (p) { return p[1]; })), max: Math.max.apply(null, all.map(function (p) { return p[1]; })) }
        : { min: Math.min.apply(null, all.map(function (p) { return p[0]; })), max: Math.max.apply(null, all.map(function (p) { return p[0]; })) };
      if (a.at < axisRange.min || a.at > axisRange.max)
        fail(book, secId, q.id, 'scatter', 'estimate at ' + a.at + ' lies outside the plotted range');
    }
    if (a.type === 'outlier') {
      var idx = a.answer;
      if (!Number.isInteger(idx) || idx < 0 || idx >= all.length) {
        fail(book, secId, q.id, 'scatter', 'outlier answer index ' + idx + ' does not exist in given.concat(toPlot)');
      } else {
        var without = all.filter(function (_, i) { return i !== idx; });
        var lsWithout = leastSquares(without);
        var distOf = function (p) { return Math.abs(p[1] - (lsWithout.m * p[0] + lsWithout.c)); };
        var outlierDist = distOf(all[idx]);
        var maxOther = Math.max.apply(null, without.map(distOf));
        if (outlierDist <= maxOther)
          fail(book, secId, q.id, 'scatter', 'outlier at index ' + idx + ' is not the point furthest from the line fitted without it');
      }
    }
  });

  /* distinguishability: swapped (y,x) set must differ from the true toPlot set */
  var swapped = toPlot.map(function (p) { return [p[1], p[0]]; });
  var trueKeys = {}; toPlot.forEach(function (p) { trueKeys[pointKey(p)] = (trueKeys[pointKey(p)] || 0) + 1; });
  var swapKeys = {}; swapped.forEach(function (p) { swapKeys[pointKey(p)] = (swapKeys[pointKey(p)] || 0) + 1; });
  var sameSet = Object.keys(trueKeys).length === Object.keys(swapKeys).length &&
    Object.keys(trueKeys).every(function (k) { return trueKeys[k] === swapKeys[k]; });
  if (sameSet) fail(book, secId, q.id, 'dx', '"SC_XY_SWAPPED" equals the truth');
}

/* ──────────────────────────────── shared dataset (movie vs question) ────── */
function datasetSignature(q) {
  var parts = {};
  if (q.classes) parts.classes = q.classes;
  if (q.values) parts.values = q.values;
  if (q.curve) parts.curve = q.curve;
  if (!Object.keys(parts).length) return null;
  return JSON.stringify(parts);
}

/* ──────────────────────────────── main loop ──────────────────────────────── */

packs.forEach(function (pack) {
  if (!pack || !Array.isArray(pack.sections)) return;
  var bookName = pack.title || pack.id || 'stats';
  var rules = pack.rules || {};

  /* structural: pack rules present and shaped like the convention set */
  ['quartileRule', 'curveRule', 'startPoint', 'curveStyle', 'readTol', 'plotTol'].forEach(function (k) {
    if (!(k in rules)) fail(bookName, '—', 'pack', 'structure', 'pack.rules missing "' + k + '"');
  });

  var qIds = {};
  pack.sections.forEach(function (sec, i) {
    totalSections++;
    if (!sec.id) fail(bookName, 'section' + i, 'pack', 'structure', 'section missing id');
    if (typeof sec.walt !== 'string' || !sec.walt) fail(bookName, sec.id || ('section' + i), 'pack', 'structure', 'missing walt');

    var steps = checkMovie(bookName, sec.id, sec.movie, Object.assign({ quartileRule: 'n+1', curveRule: 'split50', startPoint: true }, rules));
    totalSteps += steps;

    /* "no dataset shared between a MOVIE and a question of its own section"
       (§11.1) — this is movie-vs-question only. Two questions of the same
       section legitimately share a table (§4.3: a cfplot commonly reuses the
       cftable question right before it — "keep them separate questions"),
       so question-vs-question is deliberately NOT compared here. */
    var movieSig = sec.movie && datasetSignature({ classes: sec.movie.classes, values: sec.movie.values, curve: sec.movie.curve });

    (sec.questions || []).forEach(function (q) {
      totalQ++;
      if (!q.id || !/^q\d+$/.test(q.id)) fail(bookName, sec.id, q.id || '?', 'structure', 'bad question id');
      else if (qIds[q.id]) fail(bookName, sec.id, q.id, 'structure', 'duplicate question id');
      qIds[q.id] = true;

      typeCounts[q.kind] = (typeCounts[q.kind] || 0) + 1;
      if (KINDS.indexOf(q.kind) === -1) fail(bookName, sec.id, q.id, 'structure', 'unknown kind "' + q.kind + '"');

      /* §11.1 "marks each >=1, total <=5" is the general rule, but §4.7's own
         tfn-mode example is explicitly marks:[0,n] ("accuracy marks only") —
         so a single component may be 0 as long as the total is 1-5. */
      if (!Array.isArray(q.marks) || q.marks.length !== 2 ||
          !Number.isInteger(q.marks[0]) || !Number.isInteger(q.marks[1]) ||
          q.marks[0] < 0 || q.marks[1] < 0 || q.marks[0] + q.marks[1] < 1 || q.marks[0] + q.marks[1] > 5)
        fail(bookName, sec.id, q.id, 'structure', 'marks must be [method,accuracy], each >=0, total 1-5');
      else totalMarks += q.marks[0] + q.marks[1];

      checkTelegraph(bookName, sec.id, q.id, q.prompt);
      checkUnicodeHygiene(bookName, sec.id, q.id, q.prompt, 'prompt');
      checkGenericFields(bookName, sec.id, q);

      var rulesForQ = Object.assign({ quartileRule: 'n+1', curveRule: 'split50', startPoint: true, readTol: 1, plotTol: 0 }, rules);
      switch (q.kind) {
        case 'qlist': checkQlist(bookName, sec.id, q, rulesForQ); break;
        case 'cftable': checkCftable(bookName, sec.id, q); break;
        case 'cfplot': checkCfplot(bookName, sec.id, q, rulesForQ); break;
        case 'cfread': checkCfread(bookName, sec.id, q, rulesForQ); break;
        case 'boxplot': checkBoxplot(bookName, sec.id, q, rulesForQ); break;
        case 'compare': checkCompare(bookName, sec.id, q); break;
        case 'judge': checkJudge(bookName, sec.id, q); break;
        case 'values': checkValues(bookName, sec.id, q); break;
        case 'order': checkOrder(bookName, sec.id, q); break;
        case 'pick': checkPick(bookName, sec.id, q); break;
        case 'stemleaf': checkStemleafKind(bookName, sec.id, q); break;
        case 'pie': checkPieKind(bookName, sec.id, q); break;
        case 'scatter': checkScatterKind(bookName, sec.id, q); break;
      }
      checkReachableMarks(bookName, sec.id, q, rulesForQ);

      var qSig = datasetSignature(q);
      if (qSig && movieSig && qSig === movieSig)
        fail(bookName, sec.id, q.id, 'structure', 'shares its dataset with the movie of ' + sec.id);
    });

    report.push('  ' + (sec.id || '?') + '  ' + (sec.title || '') + ' — ' + (sec.questions || []).length +
      ' questions, movie ' + steps + ' steps');
  });
});

/* three packs' rules objects deep-equal (only meaningful once >=2 loaded) */
if (packs.length >= 2) {
  var byBook = packs.map(function (p) { return { name: p.title || p.id, rules: p.rules || {} }; });
  var refName = byBook[0].name, refRules = byBook[0].rules;
  for (var pi = 1; pi < byBook.length; pi++) {
    if (JSON.stringify(byBook[pi].rules) !== JSON.stringify(refRules))
      fail(byBook[pi].name, '—', 'rules', 'rules', 'differs from the pack default');
  }
}

/* ──────────────────────────────── report ─────────────────────────────────── */

console.log('MathShelf — content-stats lint' + (USING_FIXTURE ? ' (fixture: ' + PACK_PATHS.join(', ') + ')' : ''));
if (report.length) console.log(report.join('\n'));
console.log('[lint-content-stats] sections: ' + totalSections +
  ' · questions: ' + totalQ + ' (' +
  Object.keys(typeCounts).map(function (t) { return t + ' ' + typeCounts[t]; }).join(', ') +
  ') · movie steps: ' + totalSteps + ' · marks: ' + totalMarks);
console.log('  ' + engineLine);
if (infos.length) {
  console.log('  notes:');
  infos.forEach(function (i) { console.log('    - ' + i); });
}

if (failures.length) {
  console.error('\nFAIL — ' + failures.length + ' problem(s):');
  failures.forEach(function (f) {
    console.error('FAIL  ' + f.book + ' › ' + f.section + ' › ' + f.qid + ' × ' + f.rule + ': ' + f.sentence);
  });
  process.exit(1);
}
console.log('PASS');
process.exit(0);
