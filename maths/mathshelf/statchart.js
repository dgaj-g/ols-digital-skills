/* MathShelf - statchart.js
   window.GJ_STATCHART: the shared paper-grid SVG renderer for Handling Data
   (Book C). One `render(host, chart, opts)` builds either a two-axis chart
   (cumulative-frequency grid) or a collapsed one-axis scale (box plot), and
   hands back a handle the movie player, the seven question renderers and the
   teacher's read-only view all drive the same way: place points, join a
   curve, slide a rule, drop a read-out, place markers, assemble a box.

   This file draws. It never writes a pupil-facing sentence (no instruction
   strings live here - every label that reaches the page comes from the
   caller's chart/scale spec or from an explicit `label`/`text` argument).

   Two NEW tokens this file leans on, added to style.css by the styling
   package (not by this file): --grid-major (#979083, the darker lines a
   pupil counts by) and --grid-minor (#CFC9BC, the small squares). A third,
   --copper-ink (#7E3B1C), is the ink for the floating read-out/marker labels
   this file draws in HTML - copper under 18px is too light to read as text.

   House style: ES5, `var`, one IIFE, `window.GJ_STATCHART` + `module.exports`
   for node, no dependencies (GJ_STATS is used ONLY if already on the page,
   for the exact chord read-off behind `drop()`/`ruleX()+drop()` - the drawing
   still works without it, just less exact).
*/
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var HAS_DOM = typeof document !== 'undefined';
  var REDUCED = (typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var MIN_LABEL_PX = 13;     // law 4: every board label >= 13 CSS px, rendered
  var LABEL_TARGET_PX = 13.6; // a hair above the floor so measurement noise never trips it
  var MIN_SQUARE_PX = 12;    // law 6: a small square is never rendered under this
  var MIN_HIT = 44;          // law 6: every interactive target >= 44x44 CSS px

  // ---------------------------------------------------------------------
  // small helpers
  // ---------------------------------------------------------------------
  function sv(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }
  function he(tag, cls) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    return d;
  }
  function num(v, fallback) { v = +v; return isFinite(v) ? v : (fallback || 0); }
  function round6(v) { return Math.round(v * 1e6) / 1e6; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // a plain number, or an exact {n,d} rational from statcore/GJ_MATH -> a float
  function toNum(v) {
    if (v == null) return null;
    if (typeof v === 'object' && typeof v.n === 'number' && typeof v.d === 'number') return v.n / v.d;
    var f = +v;
    return isFinite(f) ? f : null;
  }

  // fixed-point-ish display string for a read-out value: whole numbers plain,
  // otherwise up to 2dp with trailing zeros trimmed. Never a sentence.
  function fmtNum(v) {
    if (v == null) return '';
    var r = Math.round(v * 100) / 100;
    if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
    return String(r);
  }
  function fmtPt(x, y) { return '(' + fmtNum(x) + ', ' + fmtNum(y) + ')'; }

  // integer-index snapping (law 9): never a float equality test decides
  // anything - a value snaps to min + idx*(sq/divisor) for a whole idx.
  function snapper(min, sq, divisor) {
    sq = sq || 1; divisor = divisor || 1;
    var step = sq / divisor;
    return function (v) {
      var idx = Math.round((num(v, min) - min) / step);
      return round6(min + idx * step);
    };
  }

  var GJ_STATS = (typeof window !== 'undefined' && window.GJ_STATS) || null;

  // chord (piecewise-linear) read-off through a set of [x,y] points, mirroring
  // statcore's curveX/curveY contract (null outside the range) but in plain
  // floats - this file draws with it, statcore.js marks with the exact one.
  function chordSort(pts) {
    return (pts || []).slice().sort(function (a, b) { return a[0] - b[0]; });
  }
  function chordAt(pts, key, wantKey) {
    // key/wantKey are 0 (x) or 1 (y): chordAt(pts,1,0) => x at height h; chordAt(pts,0,1) => y at x
    var p = chordSort(pts);
    if (!p.length) return null;
    var lo = p[0][key], hi = p[p.length - 1][key];
    return function (v) {
      if (v == null || v < Math.min(lo, hi) || v > Math.max(lo, hi)) return null;
      for (var i = 0; i < p.length - 1; i++) {
        var a = p[i], b = p[i + 1];
        var a0 = a[key], b0 = b[key];
        if ((v >= a0 && v <= b0) || (v >= b0 && v <= a0)) {
          if (a0 === b0) return a[wantKey];
          var t = (v - a0) / (b0 - a0);
          return a[wantKey] + t * (b[wantKey] - a[wantKey]);
        }
      }
      return p[p.length - 1][wantKey];
    };
  }
  function curveXChord(pts, h) {
    if (GJ_STATS && GJ_STATS.curveX) {
      var r = GJ_STATS.curveX(pts, h);
      return r == null ? null : toNum(r);
    }
    return chordAt(pts, 1, 0)(h);
  }
  function curveYChord(pts, x) {
    if (GJ_STATS && GJ_STATS.curveY) {
      var r = GJ_STATS.curveY(pts, x);
      return r == null ? null : toNum(r);
    }
    return chordAt(pts, 0, 1)(x);
  }

  // monotone-in-x smooth curve through sorted points -> an SVG path `d`
  // (Fritsch-Carlson-style tangents, the standard monotone-cubic-Hermite
  // construction; a drawing convenience only - the chord above is what any
  // read-off is measured against).
  function monotonePath(ptsPx) {
    var p = ptsPx;
    var n = p.length;
    if (n < 2) return n === 1 ? ('M ' + p[0][0] + ' ' + p[0][1]) : '';
    if (n === 2) return 'M ' + p[0][0] + ' ' + p[0][1] + ' L ' + p[1][0] + ' ' + p[1][1];
    var dx = [], m = [], t = [];
    var i;
    for (i = 0; i < n - 1; i++) {
      dx[i] = p[i + 1][0] - p[i][0];
      m[i] = dx[i] === 0 ? 0 : (p[i + 1][1] - p[i][1]) / dx[i];
    }
    t[0] = m[0];
    t[n - 1] = m[n - 2];
    for (i = 1; i < n - 1; i++) {
      if (m[i - 1] === 0 || m[i] === 0 || (m[i - 1] < 0) !== (m[i] < 0)) { t[i] = 0; continue; }
      var w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
      t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
    }
    // Fritsch-Carlson clamp: keep each tangent from overshooting its segment
    for (i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      var a = t[i] / m[i], b = t[i + 1] / m[i];
      var s = a * a + b * b;
      if (s > 9) {
        var tau = 3 / Math.sqrt(s);
        t[i] = tau * a * m[i];
        t[i + 1] = tau * b * m[i];
      }
    }
    var d = 'M ' + p[0][0] + ' ' + p[0][1];
    for (i = 0; i < n - 1; i++) {
      var c1x = p[i][0] + dx[i] / 3, c1y = p[i][1] + t[i] * dx[i] / 3;
      var c2x = p[i + 1][0] - dx[i] / 3, c2y = p[i + 1][1] - t[i + 1] * dx[i] / 3;
      d += ' C ' + c1x + ' ' + c1y + ' ' + c2x + ' ' + c2y + ' ' + p[i + 1][0] + ' ' + p[i + 1][1];
    }
    return d;
  }

  function animatePath(pathEl, instant) {
    if (REDUCED || instant) return;
    var len;
    try { len = pathEl.getTotalLength(); } catch (e) { return; }
    if (!len) return;
    pathEl.style.strokeDasharray = len;
    pathEl.style.strokeDashoffset = len;
    pathEl.getBoundingClientRect();
    pathEl.style.transition = 'stroke-dashoffset ' + Math.min(900, len * 1.6) + 'ms linear';
    pathEl.style.strokeDashoffset = 0;
  }

  // ---------------------------------------------------------------------
  // render()
  // ---------------------------------------------------------------------
  function render(host, chart, opts) {
    opts = opts || {};
    chart = chart || {};
    host.innerHTML = '';

    var SQ_UNIT = 24; // user units per small square

    // ---- state -----------------------------------------------------
    var st = {
      geo: null,
      points: [],         // [[x,y], ...] axis units
      pointEls: [],        // {g, dot, hit, ghost}
      selectedPoint: null,
      curvePts: null,      // last-joined [[x,y],...]
      curveEl: null,
      markers: {},         // role -> { at, el, dot, hit, labelId, ghost }
      selectedMarker: null,
      rule: null,          // { axis:'y'|'x', v, el, handle }
      dropEls: null,
      boxEl: null,
      labels: {},          // id -> { el, axisAt, text }
      hitEls: [],          // { el, kind:'circle'|'rect' }
      needsScroll: false,
      lastScale: 1,
      snapDivisor: opts.snapDivisor || 1
    };

    // ---- geometry ----------------------------------------------------
    var isScale = !(chart.x && chart.y);

    function buildGridGeometry(c) {
      var xMin = num(c.x.min, 0), xMax = num(c.x.max, 10);
      var yMin = num(c.y.min, 0), yMax = num(c.y.max, 10);
      var sqX = num(c.x.step && c.sq && c.sq.x, 1) || num(c.sq && c.sq.x, 1);
      sqX = num(c.sq && c.sq.x, 1);
      var sqY = num(c.sq && c.sq.y, 1);
      var major = num(c.major, 5);
      var nSqX = Math.max(1, Math.round((xMax - xMin) / sqX));
      var nSqY = Math.max(1, Math.round((yMax - yMin) / sqY));
      var marginLeft = 68, marginRight = 26, marginTop = 26, marginBottom = 58;
      var plotW = nSqX * SQ_UNIT, plotH = nSqY * SQ_UNIT;
      return {
        isScale: false,
        xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax,
        sqX: sqX, sqY: sqY, major: major,
        xStep: num(c.x.step, sqX * major), yStep: num(c.y.step, sqY * major),
        xLabel: c.x.label || '', yLabel: c.y.label || '',
        marginLeft: marginLeft, marginTop: marginTop, marginRight: marginRight, marginBottom: marginBottom,
        plotX0: marginLeft, plotY0: marginTop,
        plotX1: marginLeft + plotW, plotY1: marginTop + plotH,
        plotW: plotW, plotH: plotH,
        vbw: marginLeft + plotW + marginRight,
        vbh: marginTop + plotH + marginBottom
      };
    }
    function buildScaleGeometry(c) {
      var min = num(c.min, 0), max = num(c.max, 10);
      var sq = num(c.sq, num(c.step, 1));
      var step = num(c.step, sq);
      var nSq = Math.max(1, Math.round((max - min) / sq));
      var marginLeft = 30, marginRight = 30, marginTop = 92, marginBottom = 34, trackH = 8;
      var plotW = nSq * SQ_UNIT;
      return {
        isScale: true,
        xMin: min, xMax: max, sq: sq, step: step,
        label: c.label || '',
        marginLeft: marginLeft, marginTop: marginTop, marginRight: marginRight, marginBottom: marginBottom,
        plotX0: marginLeft, plotX1: marginLeft + plotW,
        trackY: marginTop + trackH / 2, trackH: trackH,
        plotW: plotW,
        vbw: marginLeft + plotW + marginRight,
        vbh: marginTop + trackH + marginBottom
      };
    }

    st.geo = isScale ? buildScaleGeometry(chart) : buildGridGeometry(chart);

    // ---- DOM scaffold --------------------------------------------------
    var frame = he('div', 'stat-board-frame');
    frame.style.cssText = 'position:relative;overflow-x:auto;overflow-y:hidden;width:100%;background:var(--panel);';
    frame.setAttribute('data-work', '');

    var svg = sv('svg', {
      viewBox: '0 0 ' + st.geo.vbw + ' ' + st.geo.vbh,
      class: 'stat-board',
      preserveAspectRatio: 'xMinYMid meet'
    });
    /* everything presentational lives in style.css under .stat-board; only
       what is COMPUTED is set here (law: a sentence, a colour and a face are
       read by gates in the stylesheet, not out of a string literal) */
    svg.style.touchAction = 'none';
    svg.setAttribute('data-work', '');
    frame.appendChild(svg);

    var htmlLayer = he('div', 'stat-label-layer');
    htmlLayer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
    frame.appendChild(htmlLayer);

    host.appendChild(frame);

    // groups, back to front
    var gGrid = sv('g', { 'data-role': 'grid' });
    var gBreak = sv('g', { 'data-role': 'break' });
    var gGhostCurve = sv('g', { 'data-role': 'ghost-curve' });
    var gCurve = sv('g', { 'data-role': 'curve' });
    var gBox = sv('g', { 'data-role': 'box' });
    var gRule = sv('g', { 'data-role': 'rule' });
    var gDrop = sv('g', { 'data-role': 'drop' });
    var gPoints = sv('g', { 'data-role': 'points' });
    var gMarkers = sv('g', { 'data-role': 'markers' });
    var gRing = sv('g', { 'data-role': 'ring' });
    var gAnnot = sv('g', { 'data-role': 'annotate' });
    var gAxis = sv('g', { 'data-role': 'axis' });
    [gGrid, gBreak, gGhostCurve, gCurve, gBox, gRing, gRule, gDrop, gMarkers, gPoints, gAnnot, gAxis]
      .forEach(function (g) { svg.appendChild(g); });

    // ---- axes / grid ----------------------------------------------------
    function svgLabel(x, y, text, opts2) {
      opts2 = opts2 || {};
      var t = sv('text', {
        x: x, y: y,
        'text-anchor': opts2.anchor || 'middle',
        class: 'stat-svg-label'
      });
      t.setAttribute('data-autosize', '');
      /* .stat-svg-label carries the face and the ink; see style.css */
      t.textContent = text;
      return t;
    }
    function arrowHead(x1, y1, x2, y2) {
      var ang = Math.atan2(y2 - y1, x2 - x1);
      var s = 6;
      var p1 = [x2 - s * Math.cos(ang - 0.4), y2 - s * Math.sin(ang - 0.4)];
      var p2 = [x2 - s * Math.cos(ang + 0.4), y2 - s * Math.sin(ang + 0.4)];
      return sv('path', {
        d: 'M ' + p1[0] + ' ' + p1[1] + ' L ' + x2 + ' ' + y2 + ' L ' + p2[0] + ' ' + p2[1],
        fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      });
    }

    if (!isScale) {
      var g = st.geo;
      // minor gridlines
      var ix;
      for (ix = 0; ix <= Math.round((g.xMax - g.xMin) / g.sqX) + 0.0001; ix++) {
        var ax = g.xMin + ix * g.sqX;
        if (ax > g.xMax + 1e-6) break;
        var px = g.plotX0 + ix * SQ_UNIT;
        var isMajorX = Math.round(ix % g.major) === 0;
        gGrid.appendChild(sv('line', {
          x1: px, y1: g.plotY0, x2: px, y2: g.plotY1,
          stroke: isMajorX ? 'var(--grid-major)' : 'var(--grid-minor)',
          'stroke-width': isMajorX ? 1.1 : 0.7,
          'vector-effect': 'non-scaling-stroke'
        }));
      }
      var iy;
      for (iy = 0; iy <= Math.round((g.yMax - g.yMin) / g.sqY) + 0.0001; iy++) {
        var ay = g.yMin + iy * g.sqY;
        if (ay > g.yMax + 1e-6) break;
        var py = g.plotY1 - iy * SQ_UNIT;
        var isMajorY = Math.round(iy % g.major) === 0;
        gGrid.appendChild(sv('line', {
          x1: g.plotX0, y1: py, x2: g.plotX1, y2: py,
          stroke: isMajorY ? 'var(--grid-major)' : 'var(--grid-minor)',
          'stroke-width': isMajorY ? 1.1 : 0.7,
          'vector-effect': 'non-scaling-stroke'
        }));
      }
      // axis lines + arrowheads
      gAxis.appendChild(sv('line', { x1: g.plotX0, y1: g.plotY1, x2: g.plotX1 + 10, y2: g.plotY1, stroke: 'currentColor', 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke' }));
      gAxis.appendChild(sv('line', { x1: g.plotX0, y1: g.plotY1, x2: g.plotX0, y2: g.plotY0 - 10, stroke: 'currentColor', 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke' }));
      gAxis.appendChild(arrowHead(g.plotX0, g.plotY1, g.plotX1 + 10, g.plotY1));
      gAxis.appendChild(arrowHead(g.plotX0, g.plotY1, g.plotX0, g.plotY0 - 10));
      gAxis.style.color = 'var(--ink)';
      // tick numbers at xStep/yStep
      var nx = Math.round((g.xMax - g.xMin) / g.xStep);
      for (var k = 0; k <= nx; k++) {
        var vx = g.xMin + k * g.xStep;
        var pxk = g.plotX0 + (vx - g.xMin) / g.sqX * SQ_UNIT;
        gAxis.appendChild(svgLabel(pxk, g.plotY1 + 16, fmtNum(vx), { anchor: 'middle' }));
      }
      var ny = Math.round((g.yMax - g.yMin) / g.yStep);
      for (var k2 = 0; k2 <= ny; k2++) {
        var vy = g.yMin + k2 * g.yStep;
        var pyk = g.plotY1 - (vy - g.yMin) / g.sqY * SQ_UNIT;
        gAxis.appendChild(svgLabel(g.plotX0 - 10, pyk + 4, fmtNum(vy), { anchor: 'end' }));
      }
      // axis titles
      if (g.xLabel) gAxis.appendChild(svgLabel((g.plotX0 + g.plotX1) / 2, g.vbh - 8, g.xLabel, { anchor: 'middle' }));
      if (g.yLabel) {
        var yt = svgLabel(0, 0, g.yLabel, { anchor: 'middle' });
        yt.setAttribute('transform', 'translate(16,' + ((g.plotY0 + g.plotY1) / 2) + ') rotate(-90)');
        gAxis.appendChild(yt);
      }
      // law 11: zigzag break mark beside the origin when x.min isn't 0
      if (Math.abs(g.xMin) > 1e-9) {
        var bx = g.plotX0, by = g.plotY1;
        var zz = 'M ' + (bx - 4) + ' ' + (by + 6) + ' l 3 -5 l 4 8 l 4 -8 l 3 5';
        var zpath = sv('path', { d: zz, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        zpath.setAttribute('data-ornament', '');
        gBreak.appendChild(zpath);
      }
    } else {
      var s = st.geo;
      gAxis.style.color = 'var(--ink)';
      // minor ticks at sq, major numbered ticks at step
      var nsq = Math.round((s.xMax - s.xMin) / s.sq);
      for (var mi = 0; mi <= nsq; mi++) {
        var vsx = s.xMin + mi * s.sq;
        var psx = s.plotX0 + mi * SQ_UNIT;
        var onStep = Math.abs((vsx - s.xMin) % s.step) < 1e-6;
        gGrid.appendChild(sv('line', {
          x1: psx, y1: s.trackY - (onStep ? 10 : 6), x2: psx, y2: s.trackY + (onStep ? 10 : 6),
          stroke: onStep ? 'var(--grid-major)' : 'var(--grid-minor)',
          'stroke-width': onStep ? 1.2 : 0.8,
          'vector-effect': 'non-scaling-stroke'
        }));
        if (onStep) gAxis.appendChild(svgLabel(psx, s.trackY + 26, fmtNum(vsx), { anchor: 'middle' }));
      }
      gAxis.appendChild(sv('line', { x1: s.plotX0, y1: s.trackY, x2: s.plotX1, y2: s.trackY, stroke: 'currentColor', 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke' }));
      if (s.label) gAxis.appendChild(svgLabel((s.plotX0 + s.plotX1) / 2, s.vbh - 8, s.label, { anchor: 'middle' }));
      if (Math.abs(s.xMin) > 1e-9) {
        var bx2 = s.plotX0, by2 = s.trackY;
        var zz2 = 'M ' + (bx2 - 4) + ' ' + (by2 + 6) + ' l 3 -5 l 4 8 l 4 -8 l 3 5';
        var zpath2 = sv('path', { d: zz2, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        zpath2.setAttribute('data-ornament', '');
        gBreak.appendChild(zpath2);
      }
    }

    // ---- coordinate transforms -----------------------------------------
    var snapX, snapY;
    function rebuildSnappers() {
      if (!st.geo.isScale) {
        snapX = snapper(st.geo.xMin, st.geo.sqX, st.snapDivisor);
        snapY = snapper(st.geo.yMin, st.geo.sqY, st.snapDivisor);
      } else {
        snapX = snapper(st.geo.xMin, st.geo.sq, st.snapDivisor);
        snapY = function (v) { return 0; };
      }
    }
    rebuildSnappers();

    function toPx(axisPt, y2) {
      var x, y;
      if (arguments.length >= 2 && typeof y2 === 'number') { x = axisPt; y = y2; }
      else if (Array.isArray(axisPt)) { x = axisPt[0]; y = axisPt[1]; }
      else if (axisPt && typeof axisPt === 'object') { x = axisPt.x; y = axisPt.y; }
      else { x = axisPt; y = 0; }
      var gm = st.geo;
      if (!gm.isScale) {
        return [gm.plotX0 + (x - gm.xMin) / gm.sqX * SQ_UNIT, gm.plotY1 - ((y || 0) - gm.yMin) / gm.sqY * SQ_UNIT];
      }
      return [gm.plotX0 + (x - gm.xMin) / gm.sq * SQ_UNIT, gm.trackY];
    }
    function toAxis(px, py) {
      var gm = st.geo;
      if (!gm.isScale) {
        return [gm.xMin + (px - gm.plotX0) / SQ_UNIT * gm.sqX, gm.yMin + (gm.plotY1 - py) / SQ_UNIT * gm.sqY];
      }
      return [gm.xMin + (px - gm.plotX0) / SQ_UNIT * gm.sq, 0];
    }
    function snap(x, y) { return [snapX(x), snapY(y)]; }

    // ---- pointer-position helper (screen -> svg user units) -------------
    function svgPointFromEvent(e) {
      var pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      var p = pt.matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    }

    // =====================================================================
    // floating HTML labels (law 5): .stat-label[data-board-label], staggered
    // =====================================================================
    function makeLabel(id, text, axisAt, opts3) {
      opts3 = opts3 || {};
      var rec = st.labels[id];
      if (!rec) {
        var elx = he('div', 'stat-label');
        elx.setAttribute('data-board-label', '');
        elx.setAttribute('role', 'status');
        elx.style.fontSize = LABEL_TARGET_PX + 'px';
        if (opts3.kind) elx.setAttribute('data-label-kind', opts3.kind);
        htmlLayer.appendChild(elx);
        rec = st.labels[id] = { el: elx, axisAt: axisAt, text: text, dy: 0 };
      }
      rec.el.textContent = text;
      rec.axisAt = axisAt;
      rec.text = text;
      layoutLabels();
      return rec;
    }
    function removeLabel(id) {
      var rec = st.labels[id];
      if (!rec) return;
      rec.el.parentNode && rec.el.parentNode.removeChild(rec.el);
      delete st.labels[id];
    }
    function removeLabelsByPrefix(prefix) {
      Object.keys(st.labels).forEach(function (id) { if (id.indexOf(prefix) === 0) removeLabel(id); });
    }
    // position every live label at its axis point, then push any that would
    // overlap a neighbour into a second row - never SAME_TWICE, never on top
    // of one another.
    function layoutLabels() {
      var ids = Object.keys(st.labels);
      var boxes = [];
      var i;
      /* THE LAYER IS IN CSS PIXELS, THE BOARD IS IN VIEWBOX UNITS. toPx gives
         viewBox units; the HTML label sits on a layer measured in CSS pixels,
         so a scaled board put every label in the wrong place - and one at the
         origin landed below the board entirely, on the marking tally. Multiply
         by the board's own screen scale, and keep every label inside the layer
         so it can never sit on something that is not the board. */
      var sc = st.lastScale || 1;
      var layerW = htmlLayer.clientWidth || (st.geo.vbw * sc);
      var layerH = htmlLayer.clientHeight || (st.geo.vbh * sc);
      for (i = 0; i < ids.length; i++) {
        var rec = st.labels[ids[i]];
        var p = toPx(rec.axisAt);
        rec.baseX = p[0] * sc; rec.baseY = p[1] * sc - 10; rec.dy = 0;
        rec.limitW = layerW; rec.limitH = layerH;
      }
      // apply base position first so offsetWidth/Height are measurable
      for (i = 0; i < ids.length; i++) {
        var rec2 = st.labels[ids[i]];
        rec2.el.style.left = rec2.baseX + 'px';
        rec2.el.style.top = rec2.baseY + 'px';
      }
      // now stagger: sort by x, push a later label down a row if its box
      // would meet an earlier one already placed at the same row
      var order = ids.slice().sort(function (a, b) { return st.labels[a].baseX - st.labels[b].baseX; });
      var placed = [];
      var rowH = LABEL_TARGET_PX + 6;
      for (i = 0; i < order.length; i++) {
        var r = st.labels[order[i]];
        var w = r.el.offsetWidth || 30, h = r.el.offsetHeight || 16;
        var row = 0, collided = true;
        while (collided) {
          collided = false;
          var top = r.baseY - row * rowH;
          var rect = { l: r.baseX - w / 2, t: top - h, r: r.baseX + w / 2, b: top };
          for (var j = 0; j < placed.length; j++) {
            var pr = placed[j];
            if (rect.l < pr.r && rect.r > pr.l && rect.t < pr.b && rect.b > pr.t) { collided = true; break; }
          }
          if (collided) row++;
        }
        r.dy = row * rowH;
        /* never outside the board: a label is a label ON something */
        var topPx = Math.max(h, Math.min(r.baseY - r.dy, (r.limitH || 1e6)));
        var leftPx = Math.max(w / 2, Math.min(r.baseX, (r.limitW || 1e6) - w / 2));
        r.el.style.top = topPx + 'px';
        r.el.style.left = leftPx + 'px';
        placed.push({ l: r.baseX - w / 2, t: (r.baseY - r.dy) - h, r: r.baseX + w / 2, b: r.baseY - r.dy });
      }
    }

    // =====================================================================
    // hit-target registry (law 6): every interactive glyph gets a
    // same-centred invisible target kept >= 44x44 CSS px by relayout()
    // =====================================================================
    function addHit(cx, cy, kind, group) {
      var hitEl = sv('circle', { cx: cx, cy: cy, r: 16, fill: 'transparent', stroke: 'none' });
      hitEl.style.cssText = 'pointer-events:all;cursor:pointer;';
      (group || svg).appendChild(hitEl);
      var rec = { el: hitEl, cx: cx, cy: cy };
      st.hitEls.push(rec);
      return rec;
    }
    function moveHit(rec, cx, cy) { rec.cx = cx; rec.cy = cy; rec.el.setAttribute('cx', cx); rec.el.setAttribute('cy', cy); }

    // =====================================================================
    // points (cfplot)
    // =====================================================================
    function drawPointGlyph(px, py, ghost) {
      var gpt = sv('g', { class: 'stat-pt' + (ghost ? ' ghost' : '') });
      var dot = sv('circle', { cx: px, cy: py, r: 4.2, fill: 'var(--copper)', stroke: 'var(--panel)', 'stroke-width': 1.2 });
      gpt.appendChild(dot);
      if (ghost) {
        gpt.setAttribute('opacity', '0.35');
        gpt.style.color = 'var(--pencil)';
        dot.setAttribute('fill', 'var(--pencil)');
        gpt.appendChild(sv('line', { x1: px - 6, y1: py - 6, x2: px + 6, y2: py + 6, stroke: 'var(--pencil)', 'stroke-width': 1 }));
      }
      return { g: gpt, dot: dot };
    }
    function pointDrag(index) {
      var down = null;
      function onMove(e) {
        if (!down) return;
        var p = svgPointFromEvent(e);
        var ax = toAxis(p.x, p.y);
        movePoint(index, ax[0], ax[1]);
        if (typeof opts.onChange === 'function') opts.onChange({ type: 'point-move', i: index, x: st.points[index][0], y: st.points[index][1] });
      }
      function onUp() {
        down = null;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      }
      return function (e) {
        if (opts.readOnly) return;
        e.stopPropagation();
        selectPoint(index);
        down = true;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      };
    }
    function selectPoint(i) {
      st.selectedPoint = i;
      st.pointEls.forEach(function (rec, idx) {
        if (!rec) return;
        rec.dot.setAttribute('stroke', idx === i ? 'var(--copper)' : 'var(--panel)');
        rec.dot.setAttribute('r', idx === i ? 5.5 : 4.2);
      });
      if (typeof opts.onChange === 'function') opts.onChange({ type: 'point-select', i: i });
    }
    function addPoint(x, y, o) {
      o = o || {};
      var ax = st.snapDivisor === 1 ? [snapX(x), snapY(y)] : [x, y];
      var p = toPx(ax);
      var glyph = drawPointGlyph(p[0], p[1], !!o.ghost);
      gPoints.appendChild(glyph.g);
      var hit = (o.ghost || opts.readOnly) ? null : addHit(p[0], p[1], 'point', gPoints);
      var idx = st.points.length;
      st.points.push(ax);
      st.pointEls.push({ g: glyph.g, dot: glyph.dot, hit: hit, ghost: !!o.ghost });
      if (hit) hit.el.addEventListener('pointerdown', pointDrag(idx));
      if (o.select) selectPoint(idx);
      relayout();
      return idx;
    }
    function movePoint(i, x, y) {
      if (!st.pointEls[i]) return;
      var ax = st.snapDivisor >= 1 ? [snapX(x), snapY(y)] : [x, y];
      st.points[i] = ax;
      var p = toPx(ax);
      var rec = st.pointEls[i];
      rec.dot.setAttribute('cx', p[0]); rec.dot.setAttribute('cy', p[1]);
      if (rec.hit) moveHit(rec.hit, p[0], p[1]);
      if (st.curvePts) rejoinIfTracking();
    }
    function removePoint(i) {
      var rec = st.pointEls[i];
      if (!rec) return;
      rec.g.parentNode && rec.g.parentNode.removeChild(rec.g);
      if (rec.hit) { var hi = st.hitEls.indexOf(rec.hit); if (hi >= 0) st.hitEls.splice(hi, 1); rec.hit.el.remove(); }
      st.pointEls[i] = null;
      st.points[i] = null;
    }
    function points() { return st.points.filter(function (p) { return p; }).map(function (p) { return [p[0], p[1]]; }); }

    // curve tracks the live points only if it was joined with the sentinel
    // 'all' (curveThrough(null) / curveThrough('all')); a caller-authored
    // fixed curve (cfread's given curve) never moves under it.
    var trackingAll = false;
    function rejoinIfTracking() { if (trackingAll) curveThrough('all'); }

    function curveThrough(pts, o) {
      o = o || {};
      var list;
      if (pts === 'all' || pts == null) { trackingAll = true; list = points(); }
      else { trackingAll = false; list = pts; }
      st.curvePts = list.slice();
      var sorted = chordSort(list);
      var px = sorted.map(function (p) { return toPx(p); });
      var d = monotonePath(px);
      var target = o.ghost ? gGhostCurve : gCurve;
      if (!o.ghost) { if (st.curveEl) { st.curveEl.remove(); st.curveEl = null; } }
      var path = sv('path', { d: d, fill: 'none', 'stroke-width': o.ghost ? 1.6 : 2.2 });
      path.style.color = o.ghost ? 'var(--pencil)' : 'var(--copper)';
      path.setAttribute('stroke', 'currentColor');
      if (o.ghost) path.setAttribute('opacity', '0.35');
      target.appendChild(path);
      if (!o.ghost) st.curveEl = path;
      animatePath(path, o.instant);
      return path;
    }
    function clearCurve() {
      trackingAll = false;
      if (st.curveEl) { st.curveEl.remove(); st.curveEl = null; }
      st.curvePts = null;
    }

    // =====================================================================
    // rule / drop (cfread)
    // =====================================================================
    function drawRuleHandle(px, py, axis) {
      var g = sv('g', { class: 'stat-rule' });
      var isY = axis === 'y';
      var x1 = isY ? st.geo.plotX0 : px, y1 = isY ? py : st.geo.plotY0;
      var x2 = isY ? st.geo.plotX1 : px, y2 = isY ? py : st.geo.plotY1;
      var line = sv('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: 'var(--ink)', 'stroke-width': 1.5, 'stroke-dasharray': '2 3', 'vector-effect': 'non-scaling-stroke' });
      g.appendChild(line);
      var hx = isY ? st.geo.plotX0 : px, hy = isY ? py : st.geo.plotY1;
      var handle = sv('circle', { cx: hx, cy: hy, r: 6, fill: 'var(--panel)', stroke: 'var(--copper)', 'stroke-width': 2 });
      g.appendChild(handle);
      gRule.innerHTML = '';
      gRule.appendChild(g);
      return { g: g, line: line, handle: handle, hx: hx, hy: hy };
    }
    function ruleHandleDrag(axis) {
      var down = false;
      function onMove(e) {
        if (!down) return;
        var p = svgPointFromEvent(e);
        var ax = toAxis(p.x, p.y);
        if (axis === 'y') rule(ax[1]); else ruleX(ax[0]);
        if (typeof opts.onChange === 'function') opts.onChange({ type: axis === 'y' ? 'rule' : 'rulex', v: st.rule.v });
      }
      function onUp() {
        down = false;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      }
      return function (e) {
        if (opts.readOnly) return;
        e.stopPropagation();
        down = true;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      };
    }
    function rule(h) {
      var v = snapY(h);
      var p = toPx(st.geo.xMin, v);
      var drawn = drawRuleHandle(p[0], p[1], 'y');
      st.rule = { axis: 'y', v: v };
      if (!opts.readOnly) {
        var hit = addHit(drawn.hx, drawn.hy, 'rule-handle', gRule);
        hit.el.addEventListener('pointerdown', ruleHandleDrag('y'));
      }
      relayout();
      return v;
    }
    function ruleX(x) {
      var v = snapX(x);
      var p = toPx(v, st.geo.yMin);
      var drawn = drawRuleHandle(p[0], p[1], 'x');
      st.rule = { axis: 'x', v: v };
      if (!opts.readOnly) {
        var hit = addHit(drawn.hx, drawn.hy, 'rule-handle', gRule);
        hit.el.addEventListener('pointerdown', ruleHandleDrag('x'));
      }
      relayout();
      return v;
    }
    function drop(o) {
      o = o || {};
      gDrop.innerHTML = '';
      removeLabelsByPrefix('drop:');
      if (!st.rule || !st.curvePts || !st.curvePts.length) return null;
      var g = st.geo, hitX, hitY, mx, my;
      if (st.rule.axis === 'y') {
        hitX = curveXChord(st.curvePts, st.rule.v);
        if (hitX == null) return null;
        hitY = st.rule.v;
      } else {
        hitY = curveYChord(st.curvePts, st.rule.v);
        if (hitY == null) return null;
        hitX = st.rule.v;
      }
      var meet = toPx(hitX, hitY);
      var base = toPx(hitX, g.yMin);
      var side = toPx(g.xMin, hitY);
      gDrop.appendChild(sv('circle', { cx: meet[0], cy: meet[1], r: 3, fill: 'var(--copper)' }));
      gDrop.appendChild(sv('line', { x1: meet[0], y1: meet[1], x2: base[0], y2: base[1], stroke: 'var(--pencil)', 'stroke-width': 1.2, 'stroke-dasharray': '2 3', 'vector-effect': 'non-scaling-stroke' }));
      if (st.rule.axis === 'x') {
        gDrop.appendChild(sv('line', { x1: meet[0], y1: meet[1], x2: side[0], y2: side[1], stroke: 'var(--pencil)', 'stroke-width': 1.2, 'stroke-dasharray': '2 3', 'vector-effect': 'non-scaling-stroke' }));
      }
      var text = o.text != null ? o.text : fmtNum(st.rule.axis === 'y' ? hitX : hitY);
      makeLabel('drop:readout', text, st.rule.axis === 'y' ? [hitX, g.yMin] : [g.xMin, hitY], { kind: 'drop' });
      return { x: hitX, y: hitY };
    }

    // =====================================================================
    // generic readout (also used for a selected point's live coordinate)
    // =====================================================================
    function readout(text, at) { makeLabel('readout', text, at, { kind: 'readout' }); }
    function clearReadout() { removeLabel('readout'); }

    // =====================================================================
    // scale(): reconfigure this same handle to a fresh number-line, clearing
    // points/curve/markers - the two-stage boxplot boards (from a qlist / a
    // curve read-off) reuse one host for their second stage this way.
    // =====================================================================
    function scale(spec) {
      st.points = []; st.pointEls.forEach(function (r) { r && r.g.remove(); }); st.pointEls = [];
      clearCurve();
      Object.keys(st.markers).forEach(function (role) { removeMarkerInternal(role); });
      st.hitEls.forEach(function (h) { h.el.remove(); }); st.hitEls = [];
      Object.keys(st.labels).forEach(removeLabel);
      gGrid.innerHTML = ''; gAxis.innerHTML = ''; gBreak.innerHTML = ''; gBox.innerHTML = '';
      st.geo = buildScaleGeometry(spec);
      svg.setAttribute('viewBox', '0 0 ' + st.geo.vbw + ' ' + st.geo.vbh);
      rebuildSnappers();
      // redraw axis/grid for the new scale (reuse the scale-mode branch above)
      var s = st.geo;
      var nsq = Math.round((s.xMax - s.xMin) / s.sq);
      for (var mi = 0; mi <= nsq; mi++) {
        var vsx = s.xMin + mi * s.sq;
        var psx = s.plotX0 + mi * SQ_UNIT;
        var onStep = Math.abs((vsx - s.xMin) % s.step) < 1e-6;
        gGrid.appendChild(sv('line', {
          x1: psx, y1: s.trackY - (onStep ? 10 : 6), x2: psx, y2: s.trackY + (onStep ? 10 : 6),
          stroke: onStep ? 'var(--grid-major)' : 'var(--grid-minor)',
          'stroke-width': onStep ? 1.2 : 0.8, 'vector-effect': 'non-scaling-stroke'
        }));
        if (onStep) gAxis.appendChild(svgLabel(psx, s.trackY + 26, fmtNum(vsx), { anchor: 'middle' }));
      }
      gAxis.appendChild(sv('line', { x1: s.plotX0, y1: s.trackY, x2: s.plotX1, y2: s.trackY, stroke: 'currentColor', 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke' }));
      gAxis.style.color = 'var(--ink)';
      if (s.label) gAxis.appendChild(svgLabel((s.plotX0 + s.plotX1) / 2, s.vbh - 8, s.label, { anchor: 'middle' }));
      relayout();
    }

    // =====================================================================
    // markers (boxplot)
    // =====================================================================
    function drawMarkerGlyph(px, py, ghost) {
      var g = sv('g', { class: 'stat-marker' + (ghost ? ' ghost' : '') });
      var pill = sv('rect', { x: px - 5, y: py - 12, width: 10, height: 10, rx: 3, fill: 'var(--panel)', stroke: ghost ? 'var(--pencil)' : 'var(--copper)', 'stroke-width': 1.6 });
      var stem = sv('line', { x1: px, y1: py - 2, x2: px, y2: py + 8, stroke: ghost ? 'var(--pencil)' : 'var(--copper)', 'stroke-width': 1.6 });
      g.appendChild(stem); g.appendChild(pill);
      if (ghost) g.setAttribute('opacity', '0.35');
      return { g: g, pill: pill, stem: stem };
    }
    function markerDrag(role) {
      var down = false;
      function onMove(e) {
        if (!down) return;
        var p = svgPointFromEvent(e);
        var ax = toAxis(p.x, p.y);
        moveMarker(role, ax[0]);
        if (typeof opts.onChange === 'function') opts.onChange({ type: 'marker-move', role: role, at: st.markers[role].at });
      }
      function onUp() {
        down = false;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      }
      return function (e) {
        if (opts.readOnly) return;
        e.stopPropagation();
        selectMarker(role);
        down = true;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      };
    }
    function selectMarker(role) {
      st.selectedMarker = role;
      Object.keys(st.markers).forEach(function (r) {
        var m = st.markers[r];
        m.pill.setAttribute('stroke-width', r === role ? 2.6 : 1.6);
      });
      if (typeof opts.onChange === 'function') opts.onChange({ type: 'marker-select', role: role });
    }
    function removeMarkerInternal(role) {
      var m = st.markers[role];
      if (!m) return;
      m.g.remove();
      if (m.hit) { var hi = st.hitEls.indexOf(m.hit); if (hi >= 0) st.hitEls.splice(hi, 1); m.hit.el.remove(); }
      removeLabel('marker:' + role);
      delete st.markers[role];
    }
    function marker(role, at, o) {
      o = o || {};
      var x = st.geo.isScale ? snapX(at) : at;
      var p = toPx(x, 0);
      var glyph = drawMarkerGlyph(p[0], st.geo.isScale ? st.geo.trackY : p[1], !!o.ghost);
      gMarkers.appendChild(glyph.g);
      var hit = (o.ghost || opts.readOnly) ? null : addHit(p[0], st.geo.isScale ? st.geo.trackY : p[1], 'marker', gMarkers);
      st.markers[role] = { at: x, g: glyph.g, pill: glyph.pill, stem: glyph.stem, hit: hit, ghost: !!o.ghost };
      if (hit) hit.el.addEventListener('pointerdown', markerDrag(role));
      if (o.label) makeLabel('marker:' + role, o.label, x, { kind: 'marker' });
      if (o.select) selectMarker(role);
      relayout();
      return role;
    }
    function moveMarker(role, at) {
      var m = st.markers[role];
      if (!m) return;
      var x = st.geo.isScale ? snapX(at) : at;
      m.at = x;
      var p = toPx(x, 0);
      var py = st.geo.isScale ? st.geo.trackY : p[1];
      m.pill.setAttribute('x', p[0] - 5); m.pill.setAttribute('y', py - 12);
      m.stem.setAttribute('x1', p[0]); m.stem.setAttribute('x2', p[0]); m.stem.setAttribute('y1', py - 2); m.stem.setAttribute('y2', py + 8);
      if (m.hit) moveHit(m.hit, p[0], py);
      if (st.labels['marker:' + role]) { st.labels['marker:' + role].axisAt = x; layoutLabels(); }
      if (st.boxEl) box();
    }

    // box + whiskers assembled from the five roles (or o.values override)
    function box(o) {
      o = o || {};
      gBox.innerHTML = '';
      var v = o.values;
      if (!v) {
        v = {};
        ['min', 'Q1', 'Q2', 'Q3', 'max'].forEach(function (r) { v[r] = st.markers[r] ? st.markers[r].at : null; });
      }
      if (v.min == null || v.Q1 == null || v.Q2 == null || v.Q3 == null || v.max == null) return null;
      var y = st.geo.isScale ? st.geo.trackY : toPx(0, 0)[1];
      var pMin = toPx(v.min, 0)[0], pQ1 = toPx(v.Q1, 0)[0], pQ2 = toPx(v.Q2, 0)[0], pQ3 = toPx(v.Q3, 0)[0], pMax = toPx(v.max, 0)[0];
      var h = 22;
      var whiskerColor = 'var(--ink)';
      gBox.appendChild(sv('line', { x1: pMin, y1: y, x2: pQ1, y2: y, stroke: whiskerColor, 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke' }));
      gBox.appendChild(sv('line', { x1: pMin, y1: y - h / 2, x2: pMin, y2: y + h / 2, stroke: whiskerColor, 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke' }));
      gBox.appendChild(sv('line', { x1: pQ3, y1: y, x2: pMax, y2: y, stroke: whiskerColor, 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke' }));
      gBox.appendChild(sv('line', { x1: pMax, y1: y - h / 2, x2: pMax, y2: y + h / 2, stroke: whiskerColor, 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke' }));
      var rect = sv('rect', { x: Math.min(pQ1, pQ3), y: y - h / 2, width: Math.max(1, Math.abs(pQ3 - pQ1)), height: h, fill: 'rgba(166,82,43,.10)', stroke: whiskerColor, 'stroke-width': 1.6 });
      gBox.appendChild(rect);
      gBox.appendChild(sv('line', { x1: pQ2, y1: y - h / 2, x2: pQ2, y2: y + h / 2, stroke: whiskerColor, 'stroke-width': 1.8, 'vector-effect': 'non-scaling-stroke' }));
      st.boxEl = rect;
      if (!REDUCED && !o.instant) {
        rect.style.opacity = 0; rect.getBoundingClientRect();
        rect.style.transition = 'opacity 260ms ease'; rect.style.opacity = 1;
      }
      return rect;
    }

    // =====================================================================
    // ring / bracket - decorative highlight over already-plotted points
    // (the qlist "circle the middle two" beat; deviation noted in the
    // build report - see statchart's header comment).
    // =====================================================================
    function ring(i) {
      var pt = st.points[i];
      if (!pt) return null;
      var p = toPx(pt);
      var r = sv('ellipse', { cx: p[0], cy: p[1], rx: 11, ry: 9, fill: 'none', stroke: 'var(--copper)', 'stroke-width': 1.8 });
      gRing.appendChild(r);
      if (!REDUCED) animatePath(r.getTotalLength ? r : r, false);
      return r;
    }
    function bracket(i, j) {
      var a = st.points[i], b = st.points[j];
      if (!a || !b) return null;
      var pa = toPx(a), pb = toPx(b);
      var midX = (pa[0] + pb[0]) / 2, top = Math.min(pa[1], pb[1]) - 14;
      var d = 'M ' + pa[0] + ' ' + (pa[1] - 8) + ' Q ' + pa[0] + ' ' + top + ' ' + midX + ' ' + top +
        ' Q ' + pb[0] + ' ' + top + ' ' + pb[0] + ' ' + (pb[1] - 8);
      var br = sv('path', { d: d, fill: 'none', stroke: 'var(--copper)', 'stroke-width': 1.6, 'stroke-linecap': 'round' });
      gRing.appendChild(br);
      return br;
    }

    // =====================================================================
    // annotate(): break mark / committed-read ticks / marked target rings
    // =====================================================================
    function annotate(kind, at, o) {
      o = o || {};
      var p = toPx(at);
      if (kind === 'tick') {
        var t = sv('line', { x1: p[0], y1: p[1] - 6, x2: p[0], y2: p[1] + 6, stroke: 'var(--copper)', 'stroke-width': 1.4 });
        t.setAttribute('data-ornament', '');
        gAnnot.appendChild(t);
        return t;
      }
      if (kind === 'target') {
        var ring1 = sv('circle', { cx: p[0], cy: p[1], r: 6, fill: 'none', stroke: 'var(--pencil)', 'stroke-width': 1.4, 'stroke-dasharray': '2 2' });
        gAnnot.appendChild(ring1);
        return ring1;
      }
      if (kind === 'right' || kind === 'wrong') {
        var c = sv('circle', { cx: p[0], cy: p[1], r: 7, fill: 'none', 'stroke-width': 2 });
        c.style.color = kind === 'right' ? 'var(--marking-green)' : 'var(--marking-red)';
        c.setAttribute('stroke', 'currentColor');
        c.setAttribute('data-mark', '');
        gAnnot.appendChild(c);
        return c;
      }
      return null;
    }

    // =====================================================================
    // relayout(): laws 4 + 6 - counter-scale SVG label text so its RENDERED
    // size never drops below 13px, keep every small square >= 12px (falling
    // back to horizontal scroll rather than shrinking further), and keep
    // every hit target >= 44x44 CSS px. Re-run on resize.
    // =====================================================================
    function relayout() {
      if (!HAS_DOM || !svg.getScreenCTM) return;
      svg.style.width = '100%';
      var ctm = svg.getScreenCTM();
      var scaleFactor = ctm ? ctm.a : 1;
      if (!scaleFactor || !isFinite(scaleFactor) || scaleFactor <= 0) scaleFactor = 1;
      var squarePx = SQ_UNIT * scaleFactor;
      if (squarePx < MIN_SQUARE_PX) {
        var fixedW = st.geo.vbw * (MIN_SQUARE_PX / SQ_UNIT);
        svg.style.width = fixedW + 'px';
        st.needsScroll = true;
        var ctm2 = svg.getScreenCTM();
        scaleFactor = ctm2 ? ctm2.a : (MIN_SQUARE_PX / SQ_UNIT);
      } else {
        st.needsScroll = false;
      }
      st.lastScale = scaleFactor;
      var fontUserUnits = LABEL_TARGET_PX / scaleFactor;
      var nodes = svg.querySelectorAll('[data-autosize]');
      for (var i = 0; i < nodes.length; i++) nodes[i].setAttribute('font-size', fontUserUnits.toFixed(2));
      var hitUserUnits = MIN_HIT / 2 / scaleFactor;
      for (var j = 0; j < st.hitEls.length; j++) st.hitEls[j].el.setAttribute('r', Math.max(hitUserUnits, 8));
      layoutLabels();
    }

    var ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(function () { relayout(); });
      ro.observe(frame);
    }
    // first layout pass (font/hit sizing needs a laid-out SVG; do it now and
    // once more on the next frame in case the host wasn't in the document yet)
    relayout();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(relayout);

    // =====================================================================
    // destroy()
    // =====================================================================
    function destroy() {
      if (ro) { try { ro.disconnect(); } catch (e) {} }
      host.innerHTML = '';
    }

    // background tap -> caller decides whether it means "place a point"
    if (!opts.readOnly && typeof opts.onGridTap === 'function') {
      svg.addEventListener('pointerdown', function (e) {
        if (e.target !== svg && e.target.tagName !== 'line' && e.target !== gGrid) {
          // ignore taps that landed on an interactive glyph (handled by its own listener)
          if (e.target.closest && (e.target.closest('.stat-pt') || e.target.closest('.stat-marker') || e.target.closest('.stat-rule'))) return;
        }
        var p = svgPointFromEvent(e);
        var ax = toAxis(p.x, p.y);
        var g2 = st.geo;
        var inBounds = g2.isScale
          ? (ax[0] >= g2.xMin - 1e-6 && ax[0] <= g2.xMax + 1e-6)
          : (ax[0] >= g2.xMin - 1e-6 && ax[0] <= g2.xMax + 1e-6 && ax[1] >= g2.yMin - 1e-6 && ax[1] <= g2.yMax + 1e-6);
        if (!inBounds) return;
        opts.onGridTap(snapX(ax[0]), snapY(ax[1]));
      });
    }

    var handle = {
      svg: svg,
      toPx: toPx,
      toAxis: toAxis,
      snap: snap,
      addPoint: addPoint,
      movePoint: movePoint,
      removePoint: removePoint,
      points: points,
      curveThrough: curveThrough,
      clearCurve: clearCurve,
      rule: rule,
      ruleX: ruleX,
      drop: drop,
      readout: readout,
      clearReadout: clearReadout,
      scale: scale,
      marker: marker,
      moveMarker: moveMarker,
      box: box,
      ring: ring,
      bracket: bracket,
      annotate: annotate,
      destroy: destroy,
      needsScroll: function () { return st.needsScroll; },
      /* a marker comes OFF the scale when a pupil presses it twice (the
         two-press law), so removal is part of the contract, not an internal */
      removeMarker: removeMarkerInternal,
      markers: function () {
        var out = {};
        Object.keys(st.markers).forEach(function (r) { out[r] = st.markers[r].at; });
        return out;
      },
      clearBox: function () { gBox.innerHTML = ''; st.boxEl = null; },
      selectedPoint: function () { return st.selectedPoint; },
      selectPoint: selectPoint,
      selectMarker: selectMarker,
      relayout: relayout
    };
    return handle;
  }

  var API = { render: render };
  if (typeof window !== 'undefined') window.GJ_STATCHART = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
