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
      /* THE MARGINS HOLD THE NUMBERS AT PHONE SCALE (12 Sept 2026). relayout()
         counter-scales every label to LABEL_TARGET_PX, so at the smallest
         square (law 6) a digit is 27 user units tall, not 13: the bottom margin
         must hold a row of numbers AND the axis title at that size, and the
         left margin the widest frequency plus the rotated title. */
      var fMax = LABEL_TARGET_PX / (MIN_SQUARE_PX / SQ_UNIT);
      var yDigits = String(Math.round(yMax)).length;
      var marginLeft = Math.ceil(fMax + 10 + yDigits * fMax * 0.56 + 12), marginRight = 26, marginTop = 26;
      var marginBottom = Math.ceil(fMax * 2 + 24);
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
      /* ROOM FOR THE LABELS. Five marker labels on a phone are wider than the
         scale they sit on, so the stagger needs rows above AND below the
         track; these margins are what those rows live in. */
      var marginLeft = 30, marginRight = 30, marginTop = 110, marginBottom = 78, trackH = 8;
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
    /* A BOARD IS DRAWN AT ITS OWN SIZE, NEVER STRETCHED (steward re-cut,
       11 Sept 2026). The svg scales with its frame at a fixed aspect, so a
       frame that fills a 718px body drew this book's CF grid 2,500px tall on
       a laptop - the same grid a phone draws at 347 x 1,242, the size every
       phone walk has already passed. The frame is capped at the width law 6
       needs (a small square at MIN_SQUARE_PX); on a narrower body it still
       scrolls sideways, exactly as before. */
    frame.style.maxWidth = (Math.ceil(st.geo.vbw * (MIN_SQUARE_PX / SQ_UNIT)) + 2) + 'px';   /* + the frame's 1px border each side (border-box) */
    frame.setAttribute('data-work', '');

    var svg = sv('svg', {
      viewBox: '0 0 ' + st.geo.vbw + ' ' + st.geo.vbh,
      class: 'stat-board',
      preserveAspectRatio: 'xMinYMid meet'
    });
    /* everything presentational lives in style.css under .stat-board; only
       what is COMPUTED is set here (law: a sentence, a colour and a face are
       read by gates in the stylesheet, not out of a string literal) */
    /* A WIDE BOARD PANS BY TOUCH (ruling 43, 12 Sept 2026). `none` on the
       whole SVG blocked every pan, so on a phone the last point of Exercise 3
       could not be reached at all. The SVG permits the frame's sideways pan
       (and the page's vertical one); `none` goes on the DRAGGABLE hit targets
       only - addHit() - so a drag that starts on a point moves the point. */
    svg.style.touchAction = 'pan-x pan-y';
    svg.setAttribute('data-work', '');
    frame.appendChild(svg);

    var htmlLayer = he('div', 'stat-label-layer');
    htmlLayer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
    frame.appendChild(htmlLayer);

    host.appendChild(frame);

    /* WHERE SHE IS IN A BOARD WIDER THAN HER SCREEN (ruling 43): a thin track
       under the grid whose thumb is the visible share of the board, and - in
       its own line, never the stage line - the words that say to swipe. Both
       exist only while the frame hides width (relayout() decides). */
    var track = he('div', 'stat-scroll-track');
    track.setAttribute('data-ornament', '');
    track.setAttribute('aria-hidden', 'true');
    var thumb = he('div', 'stat-scroll-thumb');
    track.appendChild(thumb);
    track.hidden = true;
    host.appendChild(track);
    var swipeNote = null;
    if (opts.scrollNote) {
      swipeNote = he('p', 'stat-swipe-note');
      swipeNote.textContent = opts.scrollNote;
      swipeNote.hidden = true;
      host.appendChild(swipeNote);
    }
    function layoutTrack() {
      var hidden = frame.scrollWidth - frame.clientWidth;
      var show = hidden > 1;
      track.hidden = !show;
      if (swipeNote) swipeNote.hidden = !show;
      if (!show) return;
      var share = frame.clientWidth / frame.scrollWidth;
      thumb.style.width = Math.max(8, Math.round(share * 100)) + '%';
      thumb.style.left = Math.round((frame.scrollLeft / frame.scrollWidth) * 100) + '%';
    }
    frame.addEventListener('scroll', layoutTrack, { passive: true });

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
      // tick numbers at xStep/yStep - SEATED BY relayout(), never by a constant
      // (ruling 44, 12 Sept 2026: a fixed 16 units below the axis while the
      // counter-scaled font grew to 27 put the digits' tops on the line)
      var nx = Math.round((g.xMax - g.xMin) / g.xStep);
      for (var k = 0; k <= nx; k++) {
        var vx = g.xMin + k * g.xStep;
        var pxk = g.plotX0 + (vx - g.xMin) / g.sqX * SQ_UNIT;
        var xl = svgLabel(pxk, g.plotY1 + 16, fmtNum(vx), { anchor: 'middle' });
        xl.setAttribute('data-axis', 'x'); xl.setAttribute('data-line', g.plotY1);
        gAxis.appendChild(xl);
      }
      var ny = Math.round((g.yMax - g.yMin) / g.yStep);
      for (var k2 = 0; k2 <= ny; k2++) {
        var vy = g.yMin + k2 * g.yStep;
        var pyk = g.plotY1 - (vy - g.yMin) / g.sqY * SQ_UNIT;
        var yl = svgLabel(g.plotX0 - 10, pyk + 4, fmtNum(vy), { anchor: 'end' });
        yl.setAttribute('data-axis', 'y'); yl.setAttribute('data-line', g.plotX0); yl.setAttribute('data-at', pyk);
        gAxis.appendChild(yl);
      }
      // axis titles (the x title is seated under the numbers by relayout())
      if (g.xLabel) {
        var xt = svgLabel((g.plotX0 + g.plotX1) / 2, g.vbh - 8, g.xLabel, { anchor: 'middle' });
        xt.setAttribute('data-axis-title', 'x'); xt.setAttribute('data-line', g.plotY1);
        gAxis.appendChild(xt);
      }
      if (g.yLabel) {
        var yt = svgLabel(0, 0, g.yLabel, { anchor: 'middle' });
        yt.setAttribute('data-axis-title', 'y'); yt.setAttribute('data-at', (g.plotY0 + g.plotY1) / 2);
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
      /* BOOK A (12 Sept 2026): the same break on the y axis when y.min isn't 0
         - a scatter's height axis often starts at 140, and an axis that starts
         above zero without saying so is the slip the source page warns about */
      if (Math.abs(g.yMin) > 1e-9) {
        /* ON the axis line just above the origin (the textbook glyph), so it
           never touches the first y number, which sits 6 CSS px left of the axis */
        var byx = g.plotX0, byy = g.plotY1;
        var zzy = 'M ' + byx + ' ' + (byy - 3) + ' l -5 -3 l 10 -5 l -10 -5 l 5 -3';
        var zpathy = sv('path', { d: zzy, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        zpathy.setAttribute('data-ornament', '');
        gBreak.appendChild(zpathy);
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
        if (onStep) {
          var sl = svgLabel(psx, s.trackY + 26, fmtNum(vsx), { anchor: 'middle' });
          sl.setAttribute('data-axis', 'x'); sl.setAttribute('data-line', s.trackY + 10);
          gAxis.appendChild(sl);
        }
      }
      gAxis.appendChild(sv('line', { x1: s.plotX0, y1: s.trackY, x2: s.plotX1, y2: s.trackY, stroke: 'currentColor', 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke' }));
      if (s.label) {
        var stl = svgLabel((s.plotX0 + s.plotX1) / 2, s.vbh - 8, s.label, { anchor: 'middle' });
        stl.setAttribute('data-axis-title', 'x'); stl.setAttribute('data-line', s.trackY + 10);
        gAxis.appendChild(stl);
      }
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
      /* WHERE A MOVING LABEL GOES. Three things have to be true at once and
         they used to be settled in three different coordinate spaces: the
         layer is measured in CSS pixels while toPx gives viewBox units; a
         label must stay ON the board it labels; and no two labels may sit on
         one another - which is the whole reason these are HTML and not SVG
         text (the overlap law exempts everything inside an SVG). So: scale,
         clamp, then stagger upward using the box that was actually placed. */
      var ids = Object.keys(st.labels);
      if (!ids.length) return;
      var sc = st.lastScale || 1;
      var layerW = htmlLayer.clientWidth || (st.geo.vbw * sc);
      var layerH = htmlLayer.clientHeight || (st.geo.vbh * sc);
      /* A LABEL STAYS OUT OF THE GUTTER (12 Sept 2026). On a phone the host
         reclaims the question-number column (a negative margin, style.css);
         the grid may sit there, but a label's words may not - the overlap law
         found "lower quartile" under "Q2". The inset is measured, never guessed. */
      var inset = 0;
      try { inset = Math.max(0, -parseFloat(getComputedStyle(host).marginLeft || '0')) ; } catch (e) { inset = 0; }
      if (inset > 0) inset += 4;
      /* A LABEL WITH NO BOARD UNDER IT IS NOT A LABEL. On the exercise page the
         boards below the fold are laid out after their labels are made, so the
         layer is momentarily nothing at all - and a label placed on a layer of
         no height sits at the collapsed board's origin, which on a phone is on
         top of the next question's prompt. That is what the overlap law kept
         reporting on book-contents. It waits for its board: relayout() runs
         again when the host has a size, and puts it back. */
      if (!(layerH > 8) || !(layerW > 8)) {
        for (var h = 0; h < ids.length; h++) st.labels[ids[h]].el.hidden = true;
        return;
      }
      for (var v = 0; v < ids.length; v++) st.labels[ids[v]].el.hidden = false;
      var i, recs = [];
      for (i = 0; i < ids.length; i++) {
        var rec = st.labels[ids[i]];
        var p = toPx(rec.axisAt);
        rec.el.style.left = '0px';
        rec.el.style.top = '0px';
        rec.w = rec.el.offsetWidth || 40;
        rec.h = rec.el.offsetHeight || 16;
        rec.wantX = Math.max(inset + rec.w / 2, Math.min(p[0] * sc, layerW - rec.w / 2));
        rec.wantY = Math.max(rec.h, Math.min(p[1] * sc - 10, layerH));
        recs.push(rec);
      }
      recs.sort(function (a, b) { return a.wantX - b.wantX; });
      /* THE PITCH IS WHAT A LABEL ACTUALLY MEASURES, not what its font size
         says: a 13px face in a padded box is 18px tall, and stepping by 19
         left an eight-pixel overlap between two rows - which is exactly what
         the overlap law reported. */
      var tallest = 0;
      for (i = 0; i < recs.length; i++) tallest = Math.max(tallest, recs[i].h);
      var rowH = tallest + 5;
      var placed = [];
      for (i = 0; i < recs.length; i++) {
        /* UP FIRST, THEN DOWN. On a phone the five box-plot labels are wider
           than the board, so two rows above the scale are not enough; when the
           space above runs out the stagger continues BELOW the track, which is
           empty, rather than giving up and letting two labels sit on one
           another. */
        /* AND NEVER OFF THE BOARD. The stagger goes up and then down, and the
           downward rows could run past the bottom of the layer - where the
           layer's own clip hid the label from the pupil while its box still
           landed on the prompt of the question below, which is what the overlap
           law reported. A row that would leave the board is not offered at all
           and the search carries on to the next one. Clamping the answer
           afterwards was the wrong shape and made it worse: it threw away the
           free slot the search had just found and stacked five box-plot labels
           on top of one another. */
        /* AND SIDEWAYS AS WELL AS UP. Two cuts of a box plot can sit within a
           few pixels of one another on a phone - "lower quartile" and "median"
           overlapped by twelve - and no row above or below is free either,
           because they are the same two labels in every row. The board is wider
           than the pair, so the search also slides each label along its own
           row; the wanted place is tried first, so nothing moves that does not
           have to. */
        var r = recs[i], row = 0, box = null, firstLegal = null;
        var maxUp = Math.max(0, Math.floor((r.wantY - r.h) / rowH));
        var DX = [0, 10, -10, 20, -20, 32, -32, 46, -46, 62, -62, 80, -80];
        for (row = 0; row < 40 && !box; row++) {
          var top = (row <= maxUp)
            ? r.wantY - row * rowH
            : r.wantY + (row - maxUp) * rowH;
          for (var d = 0; d < DX.length; d++) {
            var cx = Math.max(inset + r.w / 2, Math.min(layerW - r.w / 2, r.wantX + DX[d]));
            var cand = { l: cx - r.w / 2, t: top - r.h, r: cx + r.w / 2, b: top, x: cx };
            if (cand.t < 0 || cand.b > layerH) continue;
            if (!firstLegal) firstLegal = cand;
            var hit = false;
            for (var j = 0; j < placed.length; j++) {
              var q2 = placed[j];
              if (cand.l < q2.r && cand.r > q2.l && cand.t < q2.b && cand.b > q2.t) { hit = true; break; }
            }
            if (!hit) { box = cand; break; }
          }
        }
        /* every row on the board is taken: put it in the first one that fits
           the board at all and let the overlap law say so - a label off the
           board is one she cannot read, which is worse than one she can */
        if (!box) box = firstLegal || { l: r.wantX - r.w / 2, t: 0, r: r.wantX + r.w / 2, b: r.h, x: r.wantX };
        r.el.style.left = (box.x == null ? r.wantX : box.x) + 'px';
        r.el.style.top = box.b + 'px';
        placed.push(box);
      }
    }

    // =====================================================================
    // hit-target registry (law 6): every interactive glyph gets a
    // same-centred invisible target kept >= 44x44 CSS px by relayout()
    // =====================================================================
    function addHit(cx, cy, kind, group, minPx) {
      var hitEl = sv('circle', { cx: cx, cy: cy, r: 16, fill: 'transparent', stroke: 'none' });
      /* touch-action none HERE and only here (ruling 43): a drag that starts
         on a point, a rule handle or a marker moves it; one that starts on
         empty grid pans the frame */
      hitEl.style.cssText = 'pointer-events:all;cursor:pointer;touch-action:none;';
      hitEl.setAttribute('data-hit', kind);
      (group || svg).appendChild(hitEl);
      var rec = { el: hitEl, cx: cx, cy: cy, minPx: minPx || MIN_HIT };
      st.hitEls.push(rec);
      return rec;
    }
    function moveHit(rec, cx, cy) { rec.cx = cx; rec.cy = cy; rec.el.setAttribute('cx', cx); rec.el.setAttribute('cy', cy); }

    // =====================================================================
    // points (cfplot)
    // =====================================================================
    function drawPointGlyph(px, py, ghost, given) {
      var gpt = sv('g', { class: 'stat-pt' + (ghost ? ' ghost' : '') + (given ? ' is-given' : '') });
      /* BOOK A: a GIVEN point is printed in ink (the page's own data); a point
         she places is copper - nothing read is faded, the two differ by hue */
      var dot = sv('circle', { cx: px, cy: py, r: 4.2, fill: given ? 'var(--ink)' : 'var(--copper)', stroke: 'var(--panel)', 'stroke-width': 1.2 });
      gpt.appendChild(dot);
      if (ghost) {
        gpt.setAttribute('opacity', '0.35');
        gpt.style.color = 'var(--pencil)';
        dot.setAttribute('fill', 'var(--pencil)');
        gpt.appendChild(sv('line', { x1: px - 6, y1: py - 6, x2: px + 6, y2: py + 6, stroke: 'var(--pencil)', 'stroke-width': 1 }));
      }
      /* a ghost is looked at, never pressed: the struck first attempt sits at
         the very positions her second go has to press, and an unclickable
         ghost is the difference between being able to answer twice and not */
      if (ghost) gpt.style.pointerEvents = 'none';
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
        if (!rec || rec.given) return;
        rec.dot.setAttribute('stroke', idx === i ? 'var(--copper)' : 'var(--panel)');
        rec.dot.setAttribute('r', idx === i ? 5.5 : 4.2);
      });
      if (typeof opts.onChange === 'function') opts.onChange({ type: 'point-select', i: i });
    }
    function addPoint(x, y, o) {
      o = o || {};
      var ax = st.snapDivisor === 1 ? [snapX(x), snapY(y)] : [x, y];
      var p = toPx(ax);
      var glyph = drawPointGlyph(p[0], p[1], !!o.ghost, !!o.given);
      gPoints.appendChild(glyph.g);
      /* A GHOST IS NOT A POINT. The struck first attempt is drawn on the same
         board so she can see what she did, but it is not part of what she has
         placed: counted among the points it made her second go look finished
         before she had started it, so the Join never lit and the question could
         not be answered twice. It draws, and nothing else knows about it. */
      if (o.ghost) { relayout(); return -1; }
      var hit = (o.ghost || o.given || opts.readOnly) ? null : addHit(p[0], p[1], 'point', gPoints);
      var idx = st.points.length;
      st.points.push(ax);
      glyph.g.setAttribute('data-index', idx);
      st.pointEls.push({ g: glyph.g, dot: glyph.dot, hit: hit, ghost: !!o.ghost, given: !!o.given });
      if (hit) hit.el.addEventListener('pointerdown', pointDrag(idx));
      if (o.select) selectPoint(idx);
      relayout();
      return idx;
    }
    function movePoint(i, x, y) {
      if (!st.pointEls[i] || st.pointEls[i].given) return;
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
    function points() {
      var out = [];
      for (var i = 0; i < st.points.length; i++) {
        if (!st.points[i] || (st.pointEls[i] && st.pointEls[i].given)) continue;
        out.push([st.points[i][0], st.points[i][1]]);
      }
      return out;
    }
    /* every point on the board with its board index and whether it was given -
       the scatter outlier ask indexes given.concat(toPlot), and the LOBF test
       uses ALL the points, so both lists exist */
    function allPoints() {
      var out = [];
      for (var i = 0; i < st.points.length; i++) {
        if (!st.points[i]) continue;
        out.push({ i: i, x: st.points[i][0], y: st.points[i][1], given: !!(st.pointEls[i] && st.pointEls[i].given) });
      }
      return out;
    }

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
      /* the struck curve is looked at, never pressed - a 2px stroke across the
         board would otherwise swallow the taps her second go is made of */
      if (o.ghost) target.style.pointerEvents = 'none';
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
    /* the read-out comes OFF when the rule is parked at the axis (the stray "0"
       on Exercise 4's opening at 375, 12 Sept 2026) - clearing without drawing */
    function clearDrop() {
      gDrop.innerHTML = '';
      removeLabelsByPrefix('drop:');
    }
    function drop(o) {
      o = o || {};
      clearDrop();
      if (!st.rule) return null;
      /* BOOK A: with no curve joined the read is against the line of best fit
         (its two clipped ends make a chord that IS the line) */
      var readPts = (st.curvePts && st.curvePts.length) ? st.curvePts : (st.lobf && st.lobf.ends);
      if (!readPts || !readPts.length) return null;
      var g = st.geo, hitX, hitY, mx, my;
      if (st.rule.axis === 'y') {
        hitX = curveXChord(readPts, st.rule.v);
        if (hitX == null) return null;
        hitY = st.rule.v;
      } else {
        hitY = curveYChord(readPts, st.rule.v);
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
        if (onStep) {
          var sl2 = svgLabel(psx, s.trackY + 26, fmtNum(vsx), { anchor: 'middle' });
          sl2.setAttribute('data-axis', 'x'); sl2.setAttribute('data-line', s.trackY + 10);
          gAxis.appendChild(sl2);
        }
      }
      gAxis.appendChild(sv('line', { x1: s.plotX0, y1: s.trackY, x2: s.plotX1, y2: s.trackY, stroke: 'currentColor', 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke' }));
      gAxis.style.color = 'var(--ink)';
      if (s.label) {
        var stl2 = svgLabel((s.plotX0 + s.plotX1) / 2, s.vbh - 8, s.label, { anchor: 'middle' });
        stl2.setAttribute('data-axis-title', 'x'); stl2.setAttribute('data-line', s.trackY + 10);
        gAxis.appendChild(stl2);
      }
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
    // (the qlist "circle the middle two" beat). This ring only ever knows
    // about a CHART POINT (st.points[i]) - it has no idea what a written
    // paper line is, and never did. Ruling 39 (11 Sept 2026) needed a ring
    // on a WRITTEN line too ("ring the 4th value" in an ordered list, mode
    // 'paper', no chart in sight) - that one lives in player.js's own
    // paperRing(), a separate function against a separate model (the
    // .ml-val spans a written line splits itself into), not a call to this
    // one. The two rings share a look (copper ellipse, pen-speed draw) and
    // nothing else - no deviation left open here.
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
    // BOOK A (12 Sept 2026) - scatter: the line of best fit, its two handles,
    // the outlier ring, and a press on any point. The line is defined by two
    // AXIS points and drawn EXTENDED to the edges of the plot rectangle
    // (clipped, Liang-Barsky), so wherever her handles sit the line runs
    // across the whole chart - the paper convention the mark scheme reads.
    // =====================================================================
    function clipLineToPlot(p1, p2) {
      var g = st.geo;
      if (g.isScale) return null;
      var a = toPx(p1), b = toPx(p2);
      var dx = b[0] - a[0], dy = b[1] - a[1];
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return null;
      /* parametric t along the infinite line through a and b; keep the segment inside the plot rect */
      var t0 = -Infinity, t1 = Infinity;
      function clipDim(p, d, lo, hi) {
        if (Math.abs(d) < 1e-12) return p >= lo - 1e-9 && p <= hi + 1e-9;
        var ta = (lo - p) / d, tb = (hi - p) / d;
        if (ta > tb) { var tmp = ta; ta = tb; tb = tmp; }
        if (ta > t0) t0 = ta;
        if (tb < t1) t1 = tb;
        return t0 <= t1;
      }
      if (!clipDim(a[0], dx, g.plotX0, g.plotX1)) return null;
      if (!clipDim(a[1], dy, g.plotY0, g.plotY1)) return null;
      if (t0 > t1) return null;
      var e1 = [a[0] + t0 * dx, a[1] + t0 * dy], e2 = [a[0] + t1 * dx, a[1] + t1 * dy];
      return { px: [e1, e2], ends: [toAxis(e1[0], e1[1]), toAxis(e2[0], e2[1])] };
    }
    function redrawLobf() {
      var L = st.lobf;
      if (!L || !L.el) return;
      var c = clipLineToPlot(L.p1, L.p2);
      if (!c) { L.el.setAttribute('visibility', 'hidden'); L.ends = null; return; }
      L.el.removeAttribute('visibility');
      L.el.setAttribute('x1', c.px[0][0]); L.el.setAttribute('y1', c.px[0][1]);
      L.el.setAttribute('x2', c.px[1][0]); L.el.setAttribute('y2', c.px[1][1]);
      L.ends = c.ends;
    }
    function line(p1, p2, o) {
      o = o || {};
      if (st.lobf && st.lobf.el) { st.lobf.el.remove(); }
      var elL = sv('line', { class: o.cls || 'stat-lobf', 'stroke-width': 2.2, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round' });
      elL.style.color = 'var(--copper)';
      elL.setAttribute('stroke', 'currentColor');
      gCurve.appendChild(elL);
      st.lobf = { p1: [p1[0], p1[1]], p2: [p2[0], p2[1]], el: elL, ends: null };
      redrawLobf();
      if (o.animate) animatePath(elL, o.instant);
      var api = {
        el: elL,
        update: function (q1, q2) { st.lobf.p1 = [q1[0], q1[1]]; st.lobf.p2 = [q2[0], q2[1]]; redrawLobf(); return api; },
        remove: function () { if (st.lobf && st.lobf.el === elL) { elL.remove(); st.lobf = null; } },
        /* y on the line at x (the estimate the mark scheme reads), null when off the plot */
        yAt: function (x) { return st.lobf && st.lobf.ends ? curveYChord(st.lobf.ends, x) : null; },
        ends: function () { return st.lobf && st.lobf.ends ? st.lobf.ends.map(function (e) { return [e[0], e[1]]; }) : null; }
      };
      return api;
    }
    st.lobfHandles = {};
    function lobfDrag(i) {
      var down = false, start = null, moved = false;
      function onMove(e) {
        if (!down) return;
        var p = svgPointFromEvent(e);
        var ax = toAxis(p.x, p.y);
        moved = true;
        moveHandle(i, ax[0], ax[1]);
        if (typeof opts.onChange === 'function') opts.onChange({ type: 'lobf-move', i: i, x: st.lobfHandles[i].at[0], y: st.lobfHandles[i].at[1] });
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
        down = true; moved = false;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      };
    }
    /* a draggable 48 px handle at an axis point; the visible ring IS the hit
       (class stat-lobf-handle, data-hit, data-handle=i) with a copper dot at
       its centre. Two handles define the line; moving either redraws it. */
    function handleAt(x, y, i) {
      i = i == null ? Object.keys(st.lobfHandles).length : i;
      var ax = [snapX(x), snapY(y)];
      var p = toPx(ax);
      var old = st.lobfHandles[i];
      if (old) { old.g.remove(); var oi = st.hitEls.indexOf(old.hit); if (oi >= 0) st.hitEls.splice(oi, 1); }
      var gH = sv('g', { class: 'stat-lobf-handle-g', 'data-handle': i });
      var dot = sv('circle', { cx: p[0], cy: p[1], r: 4.5, fill: 'var(--copper)', stroke: 'var(--panel)', 'stroke-width': 1.2 });
      gMarkers.appendChild(gH);
      var hit = addHit(p[0], p[1], 'lobf-handle', gH, 48);
      hit.el.setAttribute('class', 'stat-lobf-handle');
      hit.el.setAttribute('data-handle', i);
      hit.el.setAttribute('fill', 'rgba(166,82,43,0.08)');
      hit.el.setAttribute('stroke', 'var(--copper)');
      hit.el.setAttribute('stroke-width', 1.2);
      hit.el.setAttribute('stroke-dasharray', '3 3');
      hit.el.setAttribute('vector-effect', 'non-scaling-stroke');
      if (!opts.readOnly) { hit.el.setAttribute('data-placed', ''); hit.el.addEventListener('pointerdown', lobfDrag(i)); }
      gH.appendChild(dot);
      st.lobfHandles[i] = { at: ax, g: gH, dot: dot, hit: hit };
      syncLobfToHandles();
      relayout();
      return hit.el;
    }
    function moveHandle(i, x, y) {
      var h = st.lobfHandles[i];
      if (!h) return;
      var gm = st.geo;
      var ax = [clamp(snapX(x), gm.xMin, gm.xMax), clamp(snapY(y), gm.yMin, gm.yMax)];
      h.at = ax;
      var p = toPx(ax);
      h.dot.setAttribute('cx', p[0]); h.dot.setAttribute('cy', p[1]);
      moveHit(h.hit, p[0], p[1]);
      syncLobfToHandles();
    }
    function syncLobfToHandles() {
      var ks = Object.keys(st.lobfHandles);
      if (ks.length < 2) return;
      var a = st.lobfHandles[ks[0]].at, b = st.lobfHandles[ks[1]].at;
      if (a[0] === b[0] && a[1] === b[1]) return;   /* two handles on one spot define no line; the last good line stays */
      if (st.lobf && st.lobf.el) { st.lobf.p1 = [a[0], a[1]]; st.lobf.p2 = [b[0], b[1]]; redrawLobf(); }
      else line(a, b, {});
    }
    function handles() {
      return Object.keys(st.lobfHandles).sort().map(function (k) { return [st.lobfHandles[k].at[0], st.lobfHandles[k].at[1]]; });
    }
    function removeHandles() {
      Object.keys(st.lobfHandles).forEach(function (k) {
        var h = st.lobfHandles[k];
        h.g.remove();
        var hi = st.hitEls.indexOf(h.hit); if (hi >= 0) st.hitEls.splice(hi, 1);
      });
      st.lobfHandles = {};
    }
    /* the odd one out: a copper ring on point i (class is-outlier on its glyph) */
    function markOutlier(i) {
      clearOutlier();
      var rec = st.pointEls[i], pt = st.points[i];
      if (!rec || !pt) return null;
      var p = toPx(pt);
      var r = sv('circle', { cx: p[0], cy: p[1], r: 9, fill: 'none', stroke: 'var(--copper)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', class: 'stat-outlier-ring' });
      gRing.appendChild(r);
      rec.g.classList.add('is-outlier');
      st.outlier = { i: i, el: r };
      return r;
    }
    function clearOutlier() {
      if (!st.outlier) return;
      st.outlier.el.remove();
      var rec = st.pointEls[st.outlier.i];
      if (rec) rec.g.classList.remove('is-outlier');
      st.outlier = null;
    }
    /* a press on ANY point (given or hers) - the outlier stage. Adds a 44 px
       press target per point (data-hit="point-press"); calls fn(i). Off again
       with enablePress(null). */
    st.pressHits = [];
    function enablePress(fn) {
      st.pressHits.forEach(function (h) { h.el.remove(); var hi = st.hitEls.indexOf(h); if (hi >= 0) st.hitEls.splice(hi, 1); });
      st.pressHits = [];
      if (typeof fn !== 'function') return;
      for (var i = 0; i < st.points.length; i++) {
        if (!st.points[i] || !st.pointEls[i]) continue;
        (function (idx) {
          var p = toPx(st.points[idx]);
          var h = addHit(p[0], p[1], 'point-press', gPoints);
          /* a PRESS target, not a drag target: it pans like the grid and is
             not a [data-hit] the reach law's drag rule speaks about */
          h.el.style.touchAction = 'pan-x pan-y';
          h.el.removeAttribute('data-hit');
          h.el.setAttribute('data-press', 'point');
          h.el.addEventListener('click', function (e) { e.stopPropagation(); fn(idx); });
          st.pressHits.push(h);
        })(i);
      }
      relayout();
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
    /* THE LAPTOP MARGIN RECLAIM (12 Sept 2026, Book A cut). On a 1280 laptop
       a 0-60 scale board is 752 px at law 6 and the question body is 698, so
       54 px hid behind a sideways scroll while the question-number column to
       the host's LEFT sat empty. If the host is narrower than the board's
       law-6 width, the host is not already pulled left by the phone CSS (a
       negative computed margin at <= 480 px - left alone), and the deficit
       fits in the strip between the host and its question's left edge, the
       host takes exactly that strip. layoutLabels() reads the computed margin
       and keeps every label out of the reclaimed strip on its own. */
    function reclaimMargin() {
      try {
        var lawW = st.geo.vbw * (MIN_SQUARE_PX / SQ_UNIT) + 2;
        if (host.getAttribute('data-reclaimed') != null) { host.style.marginLeft = ''; host.removeAttribute('data-reclaimed'); }
        var ml = parseFloat(getComputedStyle(host).marginLeft || '0') || 0;
        if (ml < 0) return;
        var avail = host.clientWidth;
        if (!(avail > 0)) return;
        var deficit = Math.ceil(lawW - avail);
        if (deficit <= 0) return;
        var anc = host.closest ? host.closest('.jotter-q, [data-surface="question"]') : null;
        if (!anc) return;
        var room = host.getBoundingClientRect().left - anc.getBoundingClientRect().left - 8;
        if (deficit > room) return;
        host.style.marginLeft = (-deficit) + 'px';
        host.setAttribute('data-reclaimed', deficit);
      } catch (e) {}
    }
    function relayout() {
      if (!HAS_DOM || !svg.getScreenCTM) return;
      svg.style.width = '100%';
      reclaimMargin();
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
      seatAxisText(fontUserUnits, scaleFactor);
      for (var j = 0; j < st.hitEls.length; j++) {
        var hitUserUnits = (st.hitEls[j].minPx || MIN_HIT) / 2 / scaleFactor;
        st.hitEls[j].el.setAttribute('r', Math.max(hitUserUnits, 8));
      }
      if (st.lobf) redrawLobf();
      layoutLabels();
      layoutTrack();
    }
    /* AN AXIS NUMBER NEVER CROSSES ITS AXIS LINE (ruling 44). Every number is
       seated from the font it is actually drawn at: an x number's baseline one
       font plus 4 CSS px below its line (so the digits' tops clear the line
       by 4 CSS px whatever the scale); a y number's right edge 6 CSS px left of
       its axis, centred on its tick; the x title a line under the numbers. */
    function seatAxisText(f, scale) {
      var css = function (px) { return px / scale; };
      var xs = svg.querySelectorAll('[data-axis="x"]');
      var k;
      for (k = 0; k < xs.length; k++) xs[k].setAttribute('y', (Number(xs[k].getAttribute('data-line')) + f + css(4)).toFixed(2));
      var ys = svg.querySelectorAll('[data-axis="y"]');
      for (k = 0; k < ys.length; k++) {
        ys[k].setAttribute('x', (Number(ys[k].getAttribute('data-line')) - css(6)).toFixed(2));
        ys[k].setAttribute('y', (Number(ys[k].getAttribute('data-at')) + f * 0.35).toFixed(2));
      }
      var xt = svg.querySelectorAll('[data-axis-title="x"]');
      for (k = 0; k < xt.length; k++) xt[k].setAttribute('y', (Number(xt[k].getAttribute('data-line')) + f + css(4) + f + css(6)).toFixed(2));
      var yt = svg.querySelectorAll('[data-axis-title="y"]');
      for (k = 0; k < yt.length; k++) yt[k].setAttribute('transform', 'translate(' + (f * 0.75 + css(2)).toFixed(2) + ',' + yt[k].getAttribute('data-at') + ') rotate(-90)');
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
      /* A TAP PLACES; A SWIPE PANS (ruling 43). With the SVG free to pan, the
         browser fires pointerdown at the start of a swipe too and pointercancel
         once it has decided to scroll - so the press is only a tap when the
         pointer comes UP where it went down. The place it went down is the
         place she meant (a finger lifts a little off true). */
      var tap = null;
      svg.addEventListener('pointerdown', function (e) {
        tap = null;
        if (e.target !== svg && e.target.tagName !== 'line' && e.target !== gGrid) {
          // ignore taps that landed on an interactive glyph (handled by its own listener)
          if (e.target.closest && (e.target.closest('.stat-pt') || e.target.closest('.stat-marker') || e.target.closest('.stat-rule'))) return;
        }
        tap = { id: e.pointerId, x: e.clientX, y: e.clientY, p: svgPointFromEvent(e) };
      });
      svg.addEventListener('pointercancel', function () { tap = null; });
      svg.addEventListener('pointerup', function (e) {
        if (!tap || (e.pointerId !== undefined && tap.id !== undefined && e.pointerId !== tap.id)) { tap = null; return; }
        var moved = Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y);
        var p = tap.p;
        tap = null;
        if (moved > 12) return;                       /* a swipe, not a tap */
        var ax = toAxis(p.x, p.y);
        var g2 = st.geo;
        /* a tap within half a small square of the edge is ON the edge - the
           point snaps there anyway, and a press on the axis line itself (x = 0)
           must place, not vanish on a half-pixel rounding of the event */
        var tx = (g2.isScale ? g2.sq : g2.sqX) / 2 + 1e-6, ty = (g2.isScale ? 0 : g2.sqY / 2) + 1e-6;
        var inBounds = g2.isScale
          ? (ax[0] >= g2.xMin - tx && ax[0] <= g2.xMax + tx)
          : (ax[0] >= g2.xMin - tx && ax[0] <= g2.xMax + tx && ax[1] >= g2.yMin - ty && ax[1] <= g2.yMax + ty);
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
      clearDrop: clearDrop,
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
      /* the width below which a small square would fall under MIN_SQUARE_PX
         (law 6) - what a layout must be able to hold before it puts anything
         beside this board (jotter-stats.js layoutGiven, 11 Sept 2026) */
      minWidth: function () { return st.geo.vbw * (MIN_SQUARE_PX / SQ_UNIT); },
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
      relayout: relayout,
      /* BOOK A - scatter */
      frame: frame,
      allPoints: allPoints,
      line: line,
      handleAt: handleAt,
      moveHandle: moveHandle,
      handles: handles,
      removeHandles: removeHandles,
      lobf: function () { return st.lobf ? { p1: st.lobf.p1.slice(), p2: st.lobf.p2.slice(), ends: st.lobf.ends } : null; },
      markOutlier: markOutlier,
      clearOutlier: clearOutlier,
      enablePress: enablePress
    };
    return handle;
  }

  /* THE NUMBER, WRITTEN THE WAY THE BOARD WRITES IT. The read-out beside the
     rule has always shown two decimal places at most; the working line the
     pupil commits was printing the raw intersection - "median = 10.3125" under
     a board that says 10.31. One number, one shape, one place it is decided. */
  // =======================================================================
  // BOOK A (12 Sept 2026) - three more boards in the same paper: a Venn
  // diagram, a pie chart, and a stem-and-leaf for the FILM. They share one
  // scaffold (frame + svg.stat-board + HTML label layer + the counter-scaled
  // 13 px labels of law 4) and hand back handles in the style of render().
  // Every text node is .stat-svg-label (fill: currentColor, colour carries
  // the ink); every geometric answer (a region centre, a rim point) is
  // COMPUTED from the drawn shapes, never a constant, so it holds at 375.
  // =======================================================================
  function makeBoard(host, vbw, vbh, opts) {
    opts = opts || {};
    if (!opts.append) host.innerHTML = '';
    var frame = he('div', 'stat-board-frame');
    frame.style.cssText = 'position:relative;overflow:hidden;width:100%;background:var(--panel);';
    /* drawn at its own size, never stretched: one user unit is at most one CSS px */
    frame.style.maxWidth = (vbw + 2) + 'px';
    frame.setAttribute('data-work', '');
    var svg = sv('svg', { viewBox: '0 0 ' + vbw + ' ' + vbh, class: 'stat-board' + (opts.cls ? ' ' + opts.cls : ''), preserveAspectRatio: 'xMinYMid meet' });
    svg.style.touchAction = 'pan-x pan-y';
    svg.setAttribute('data-work', '');
    frame.appendChild(svg);
    var layer = he('div', 'stat-label-layer');
    layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;';
    frame.appendChild(layer);
    host.appendChild(frame);
    var hits = [];
    var b = {
      frame: frame, svg: svg, layer: layer, vbw: vbw, vbh: vbh, scale: 1, hits: hits,
      text: function (x, y, str, o) {
        o = o || {};
        var t = sv('text', { x: x, y: y, 'text-anchor': o.anchor || 'middle', class: 'stat-svg-label' + (o.cls ? ' ' + o.cls : '') });
        t.setAttribute('data-autosize', '');
        if (o.ink) t.style.color = o.ink;
        if (o.mono) t.style.fontFamily = 'var(--f-stationery, ui-monospace, monospace)';
        if (o.weight) t.style.fontWeight = o.weight;
        t.textContent = str;
        (o.group || svg).appendChild(t);
        return t;
      },
      /* CSS px relative to the frame for a user-unit point */
      toCss: function (ux, uy) {
        var fr = frame.getBoundingClientRect(), sr = svg.getBoundingClientRect();
        var sc = sr.width / vbw || 1;
        return { x: (sr.left - fr.left) + ux * sc, y: (sr.top - fr.top) + uy * sc };
      },
      /* user units for a CSS px point relative to the frame */
      toUser: function (px, py) {
        var fr = frame.getBoundingClientRect(), sr = svg.getBoundingClientRect();
        var sc = sr.width / vbw || 1;
        return { x: (px - (sr.left - fr.left)) / sc, y: (py - (sr.top - fr.top)) / sc };
      },
      userFromEvent: function (e) {
        var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        var ctm = svg.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
        var p = pt.matrixTransform(ctm.inverse()); return { x: p.x, y: p.y };
      },
      addHit: function (cx, cy, kind, group, minPx) {
        var hitEl = sv('circle', { cx: cx, cy: cy, r: 16, fill: 'transparent', stroke: 'none' });
        hitEl.style.cssText = 'pointer-events:all;cursor:pointer;touch-action:none;';
        hitEl.setAttribute('data-hit', kind);
        (group || svg).appendChild(hitEl);
        var rec = { el: hitEl, cx: cx, cy: cy, minPx: minPx || MIN_HIT };
        hits.push(rec);
        return rec;
      },
      removeHit: function (rec) { var i = hits.indexOf(rec); if (i >= 0) hits.splice(i, 1); rec.el.remove(); },
      relayout: function () {
        if (!HAS_DOM || !svg.getScreenCTM) return;
        var ctm = svg.getScreenCTM();
        var sc = ctm ? ctm.a : 1;
        if (!sc || !isFinite(sc) || sc <= 0) sc = 1;
        b.scale = sc;
        var f = LABEL_TARGET_PX / sc;
        var nodes = svg.querySelectorAll('[data-autosize]');
        for (var i = 0; i < nodes.length; i++) nodes[i].setAttribute('font-size', f.toFixed(2));
        for (var j = 0; j < hits.length; j++) hits[j].el.setAttribute('r', Math.max((hits[j].minPx || MIN_HIT) / 2 / sc, 8));
        if (typeof opts.onLayout === 'function') opts.onLayout(sc, f);
      },
      destroy: function () { if (b.ro) { try { b.ro.disconnect(); } catch (e) {} } frame.remove(); }
    };
    if (typeof ResizeObserver !== 'undefined') { b.ro = new ResizeObserver(function () { b.relayout(); }); b.ro.observe(frame); }
    b.relayout();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(b.relayout);
    return b;
  }
  /* a fade-in for SVG text under law 4 (never a faded resting state: it ends at full ink) */
  function writeOn(node, instant, ms) {
    if (REDUCED || instant) return Promise.resolve();
    ms = ms || 320;
    node.style.opacity = 0; node.getBoundingClientRect();
    node.style.transition = 'opacity ' + ms + 'ms ease';
    node.style.opacity = 1;
    return new Promise(function (r) { setTimeout(r, ms + 30); });
  }

  // -----------------------------------------------------------------------
  // venn(host, spec, opts) -> handle
  // spec { circles:[{id,label}] (2 or 3), n? }
  // Regions venn2: A B AB out; venn3: A B C AB AC BC ABC out.
  // regionCenter(region) is the DEEPEST point of that region (the point
  // farthest from every boundary - circle rims and the universe rectangle),
  // found by sampling the drawn geometry; the renderer positions its HTML
  // value boxes there, and a box at the deepest point has the most room.
  // -----------------------------------------------------------------------
  function venn(host, spec, opts) {
    opts = opts || {};
    spec = spec || {};
    var circles = (spec.circles || []).slice(0, 3);
    var three = circles.length === 3;
    var W = 420, H = three ? 400 : 310;
    var b = makeBoard(host, W, H, { cls: 'stat-venn' + (opts.cls ? ' ' + opts.cls : ''), append: opts.append });
    var svg = b.svg;
    var gShape = sv('g', { 'data-role': 'shape' }), gVals = sv('g', { 'data-role': 'values' }), gText = sv('g', { 'data-role': 'labels' });
    svg.appendChild(gShape); svg.appendChild(gVals); svg.appendChild(gText);
    var R = 95, PAD = 12;
    var rect = { x: PAD, y: PAD, w: W - 2 * PAD, h: H - 2 * PAD };
    var cs;
    if (three) {
      /* an equilateral triangle of centres; each pair overlaps by R - 55 */
      var cx = W / 2, cy = 175, d = 110;
      cs = [
        { x: cx - d / 2, y: cy - d * 0.2887 },
        { x: cx + d / 2, y: cy - d * 0.2887 },
        { x: cx, y: cy + d * 0.5774 }
      ];
    } else {
      cs = [{ x: W / 2 - 55, y: 152 }, { x: W / 2 + 55, y: 152 }];
    }
    gShape.appendChild(sv('rect', { x: rect.x, y: rect.y, width: rect.w, height: rect.h, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke', rx: 2 }));
    var circleEls = cs.map(function (c, i) {
      var el = sv('circle', { cx: c.x, cy: c.y, r: R, fill: 'none', stroke: 'var(--copper)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', class: 'stat-venn-circle' });
      el.setAttribute('data-circle', circles[i] && circles[i].id != null ? circles[i].id : String.fromCharCode(65 + i));
      gShape.appendChild(el);
      return el;
    });
    /* circle labels: A and B above their circles leaning outward; C below its circle */
    var labelEls = cs.map(function (c, i) {
      var lab = circles[i] && circles[i].label != null ? String(circles[i].label) : '';
      var lx, ly, anchor = 'middle';
      if (three && i === 2) { lx = c.x; ly = c.y + R + 20; }
      else { lx = c.x + (i === 0 ? -R * 0.45 : R * 0.45); ly = c.y - R - 9; }
      return b.text(lx, ly, lab, { anchor: anchor, cls: 'stat-venn-label', group: gText, ink: 'var(--ink)' });
    });
    var nEl = null;
    /* the total sits in the BOTTOM-RIGHT corner, clear of the circle labels
       (top-left met "Maths (M)" at 375, my own eyes 12 Sept 2026) and of the
       outside region's box, which prefers the bottom-left */
    if (spec.n != null) nEl = b.text(rect.x + rect.w - 8, rect.y + rect.h - 10, 'n = ' + spec.n, { anchor: 'end', cls: 'stat-venn-n', group: gText, ink: 'var(--ink)' });

    var ids = cs.map(function (_, i) { return circles[i] && circles[i].id != null ? String(circles[i].id) : String.fromCharCode(65 + i); });
    function membership(x, y) {
      var key = '';
      for (var i = 0; i < cs.length; i++) {
        var dx = x - cs[i].x, dy = y - cs[i].y;
        if (dx * dx + dy * dy < R * R) key += ids[i];
      }
      return key || 'out';
    }
    /* the region name for a membership key in canonical order (A, B, C as given) */
    function regionKey(region) {
      if (region === 'both') return ids[0] + ids[1];      /* the film's word for the overlap of two */
      if (region === 'out' || region === 'outside' || region === 'neither') return 'out';
      var parts = String(region).split('').filter(function (ch) { return ids.indexOf(ch) >= 0; });
      return ids.filter(function (id) { return parts.indexOf(id) >= 0; }).join('') || region;
    }
    var centres = {};
    function computeCentres() {
      var best = {};
      var step = 3;
      for (var y = rect.y + step; y < rect.y + rect.h; y += step) {
        for (var x = rect.x + step; x < rect.x + rect.w; x += step) {
          var key = membership(x, y);
          var depth = Math.min(x - rect.x, rect.x + rect.w - x, y - rect.y, rect.y + rect.h - y);
          for (var i = 0; i < cs.length; i++) {
            var dd = Math.abs(Math.sqrt((x - cs[i].x) * (x - cs[i].x) + (y - cs[i].y) * (y - cs[i].y)) - R);
            if (dd < depth) depth = dd;
          }
          /* keep the boxes out from under the labels at the top: a label row is a soft boundary */
          if (key === 'out') {
            if (nEl && y < rect.y + 34 && x < rect.x + 90) depth = Math.min(depth, 2);
            /* prefer the lower corners for the outside value - it is the last one read */
            depth += (y - rect.y) / rect.h * 6;
          }
          if (!best[key] || depth > best[key].depth) best[key] = { x: x, y: y, depth: depth };
        }
      }
      centres = {};
      Object.keys(best).forEach(function (k) { centres[k] = { x: best[k].x, y: best[k].y }; });
    }
    computeCentres();

    var valueEls = {};
    function regionCenterUser(region) { return centres[regionKey(region)] || null; }
    function regionCenter(region) {
      var c = regionCenterUser(region);
      if (!c) return null;
      return b.toCss(c.x, c.y);
    }
    function fill(region, text, o) {
      o = o || {};
      var k = regionKey(region);
      var c = centres[k];
      if (!c) return null;
      if (valueEls[k]) valueEls[k].remove();
      var t = b.text(c.x, c.y, String(text), { cls: 'stat-venn-val' + (o.cls ? ' ' + o.cls : ''), group: gVals, ink: 'var(--copper-ink)', weight: 600 });
      t.setAttribute('data-region', k);
      t.setAttribute('dominant-baseline', 'middle');
      valueEls[k] = t;
      b.relayout();
      return { el: t, done: writeOn(t, o.instant) };
    }
    function clearFill(region) {
      if (region == null) { Object.keys(valueEls).forEach(function (k) { valueEls[k].remove(); }); valueEls = {}; return; }
      var k = regionKey(region);
      if (valueEls[k]) { valueEls[k].remove(); delete valueEls[k]; }
    }
    return {
      svg: svg, frame: b.frame, layer: b.layer,
      regions: function () { return Object.keys(centres); },
      regionCenter: regionCenter,
      regionCenterUser: regionCenterUser,
      /* the circles' geometry in user units and CSS px, for a caller that wants to test containment itself */
      geometry: function () { return { R: R, centres: cs.map(function (c) { return { x: c.x, y: c.y }; }), ids: ids.slice(), rect: rect, scale: b.scale }; },
      contains: function (region, ux, uy) { return membership(ux, uy) === regionKey(region); },
      fill: fill,
      clearFill: clearFill,
      relayout: b.relayout,
      destroy: b.destroy
    };
  }

  // -----------------------------------------------------------------------
  // pie(host, opts) -> handle
  // A circle of radius R with the copper radius at 12 o'clock. Degrees are
  // integers, 0-360 clockwise from 12 o'clock. rimPoint/degAt/labelPoint are
  // in CSS px relative to the frame (the renderer's overlay space).
  // opts: onRimTap(deg), onBoundaryMove(i, deg), onBoundaryPress(i),
  //       onSectorPress(i), readOnly
  // -----------------------------------------------------------------------
  function pie(host, opts) {
    opts = opts || {};
    var W = 320, H = 320, CX = 160, CY = 160, R = 118;
    var b = makeBoard(host, W, H, { cls: 'stat-pie-board' + (opts.cls ? ' ' + opts.cls : ''), append: opts.append });
    var svg = b.svg;
    var gSectors = sv('g', { 'data-role': 'sectors' }), gDisc = sv('g', { 'data-role': 'disc' }), gBounds = sv('g', { 'data-role': 'bounds' }), gText = sv('g', { 'data-role': 'labels' });
    svg.appendChild(gSectors); svg.appendChild(gDisc); svg.appendChild(gBounds); svg.appendChild(gText);
    gSectors.style.color = 'var(--copper)';
    var disc = sv('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.8, 'vector-effect': 'non-scaling-stroke', class: 'stat-pie-disc' });
    gDisc.appendChild(disc);
    var radius0 = sv('line', { x1: CX, y1: CY, x2: CX, y2: CY - R, stroke: 'var(--copper)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', class: 'stat-pie-radius' });
    gDisc.appendChild(radius0);
    var centreDot = sv('circle', { cx: CX, cy: CY, r: 2.4, fill: 'var(--ink)' });
    gDisc.appendChild(centreDot);
    /* the rim is a tap target the whole way round: a transparent stroke on the
       circle, 44 px wide (kept so by relayout) */
    var rim = sv('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: 'transparent', 'stroke-width': 44, class: 'stat-pie-rim' });
    /* a tap target on the rim (44 px wide stroke); touch-action none so the
       reach law's rule for every [data-hit] holds - a swipe that starts on the
       rim places nothing (pointerup must land where pointerdown did) and does
       not pan, which on a 320 px board is a ring a thumb's width */
    rim.style.cssText = 'pointer-events:stroke;cursor:crosshair;touch-action:none;';
    rim.setAttribute('data-hit', 'rim');
    if (!opts.readOnly) gDisc.appendChild(rim);

    function normDeg(d) { d = Math.round(d) % 360; if (d < 0) d += 360; return d; }
    function rimUser(deg, rr) {
      var th = (deg - 90) * Math.PI / 180;    /* 0 deg = 12 o'clock, clockwise */
      rr = rr == null ? R : rr;
      return [CX + rr * Math.cos(th), CY + rr * Math.sin(th)];
    }
    function degAtUser(ux, uy) {
      var a = Math.atan2(uy - CY, ux - CX) * 180 / Math.PI + 90;
      return normDeg(a);
    }
    function rimPoint(deg) { var u = rimUser(deg); var c = b.toCss(u[0], u[1]); return [c.x, c.y]; }
    function degAt(px, py) { var u = b.toUser(px, py); return degAtUser(u.x, u.y); }
    function labelPoint(fromDeg, toDeg) {
      var span = normDeg(toDeg - fromDeg) || 360;
      var mid = fromDeg + span / 2;
      var u = rimUser(mid, R * 0.65);
      return b.toCss(u[0], u[1]);
    }
    function sectorPath(fromDeg, toDeg) {
      var span = toDeg - fromDeg;
      if (span <= 0) return '';
      if (span >= 360 - 1e-6) return 'M ' + CX + ' ' + (CY - R) + ' A ' + R + ' ' + R + ' 0 1 1 ' + CX + ' ' + (CY + R) + ' A ' + R + ' ' + R + ' 0 1 1 ' + CX + ' ' + (CY - R) + ' Z';
      var a = rimUser(fromDeg), c = rimUser(toDeg);
      var large = span > 180 ? 1 : 0;
      return 'M ' + CX + ' ' + CY + ' L ' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + ' A ' + R + ' ' + R + ' 0 ' + large + ' 1 ' + c[0].toFixed(2) + ' ' + c[1].toFixed(2) + ' Z';
    }

    /* boundaries: radius lines placed by the pupil (or the film), each with a
       44 px hit at its rim end that drags round the rim */
    var bounds = [];
    function boundaryDrag(rec) {
      var down = false, moved = false;
      function onMove(e) {
        if (!down) return;
        var u = b.userFromEvent(e);
        var d = degAtUser(u.x, u.y);
        moved = true;
        setBoundary(rec, d);
        if (typeof opts.onBoundaryMove === 'function') opts.onBoundaryMove(bounds.indexOf(rec), rec.deg);
      }
      function onUp() {
        down = false;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        if (!moved && typeof opts.onBoundaryPress === 'function') opts.onBoundaryPress(bounds.indexOf(rec));
      }
      return function (e) {
        if (opts.readOnly) return;
        e.stopPropagation();
        down = true; moved = false;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      };
    }
    function setBoundary(rec, deg) {
      rec.deg = normDeg(deg);
      var u = rimUser(rec.deg);
      rec.line.setAttribute('x2', u[0].toFixed(2)); rec.line.setAttribute('y2', u[1].toFixed(2));
      rec.hit.cx = u[0]; rec.hit.cy = u[1];
      rec.hit.el.setAttribute('cx', u[0].toFixed(2)); rec.hit.el.setAttribute('cy', u[1].toFixed(2));
      rec.knob.setAttribute('cx', u[0].toFixed(2)); rec.knob.setAttribute('cy', u[1].toFixed(2));
    }
    function boundary(deg, o) {
      o = o || {};
      if (o.i != null && bounds[o.i]) { setBoundary(bounds[o.i], deg); return o.i; }
      if (o.plain) {
        /* the FILM's boundary: a radius line and nothing to press */
        var u0 = rimUser(normDeg(deg));
        var pl = sv('line', { x1: CX, y1: CY, x2: u0[0].toFixed(2), y2: u0[1].toFixed(2), stroke: 'var(--copper)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', class: 'stat-pie-bound-line' });
        gBounds.appendChild(pl);
        return -1;
      }
      var g = sv('g', { class: 'stat-pie-bound-g' });
      var line = sv('line', { x1: CX, y1: CY, x2: CX, y2: CY - R, stroke: 'var(--copper)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', class: 'stat-pie-bound-line' });
      var knob = sv('circle', { cx: CX, cy: CY - R, r: 5, fill: 'var(--panel)', stroke: 'var(--copper)', 'stroke-width': 2, class: 'stat-pie-knob' });
      g.appendChild(line);
      gBounds.appendChild(g);
      var hit = b.addHit(CX, CY - R, 'pie-bound', g);
      hit.el.setAttribute('class', 'stat-pie-bound');
      if (o.placed !== false) hit.el.setAttribute('data-placed', '');
      g.appendChild(knob);
      var rec = { deg: 0, g: g, line: line, knob: knob, hit: hit };
      bounds.push(rec);
      setBoundary(rec, deg);
      hit.el.setAttribute('data-bound', bounds.length - 1);
      if (!opts.readOnly) hit.el.addEventListener('pointerdown', boundaryDrag(rec));
      b.relayout();
      if (o.animate && !REDUCED) animatePath(line, false);
      return bounds.length - 1;
    }
    function removeBoundary(i) {
      var rec = bounds[i];
      if (!rec) return;
      rec.g.remove();
      b.removeHit(rec.hit);
      bounds.splice(i, 1);
      bounds.forEach(function (r2, k) { r2.hit.el.setAttribute('data-bound', k); });
    }
    function boundaryDegs() { return bounds.map(function (r2) { return r2.deg; }); }

    /* sectors: a copper-tinted wedge per sector, swept at pen speed */
    var sectors = {};
    function sector(fromDeg, toDeg, i, o) {
      o = o || {};
      fromDeg = normDeg(fromDeg);
      var span = toDeg - fromDeg;
      if (span <= 0) span = normDeg(toDeg - fromDeg) || 360;
      i = i == null ? Object.keys(sectors).length : i;
      if (sectors[i]) sectors[i].el.remove();
      var p = sv('path', { class: 'stat-sector', 'data-sector': i, fill: 'rgba(166,82,43,0.16)', stroke: 'currentColor', 'stroke-width': 1.2, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' });
      p.style.cssText = 'pointer-events:all;cursor:pointer;';
      if (typeof opts.onSectorPress === 'function') p.addEventListener('click', function (e) { e.stopPropagation(); opts.onSectorPress(i); });
      gSectors.appendChild(p);
      sectors[i] = { el: p, from: fromDeg, to: fromDeg + span };
      var done;
      if (REDUCED || o.instant) {
        p.setAttribute('d', sectorPath(fromDeg, fromDeg + span));
        done = Promise.resolve();
      } else {
        /* the sweep: the arc grows from the first boundary clockwise at pen
           speed (about 0.45 px/ms along the rim, floored so a sliver still
           reads as a movement and capped so a big sector never stalls) */
        var arcLen = R * span * Math.PI / 180;
        var dur = Math.max(220, Math.min(900, arcLen / 0.45));
        p.setAttribute('d', sectorPath(fromDeg, fromDeg + 0.5));
        done = new Promise(function (res) {
          var t0 = null, finished = false;
          function finish() { if (finished) return; finished = true; p.setAttribute('d', sectorPath(fromDeg, fromDeg + span)); res(); }
          function tick(ts) {
            if (finished) return;
            if (t0 == null) t0 = ts;
            var f = Math.min(1, (ts - t0) / dur);
            p.setAttribute('d', sectorPath(fromDeg, fromDeg + Math.max(0.5, span * f)));
            if (f < 1) requestAnimationFrame(tick); else finish();
          }
          requestAnimationFrame(tick);
          setTimeout(finish, dur + 250);   /* the backstop for a page with no frames */
        });
      }
      return { el: p, done: done, from: fromDeg, to: fromDeg + span };
    }
    function clearSectors() { Object.keys(sectors).forEach(function (k) { sectors[k].el.remove(); }); sectors = {}; }
    function sectorLabel(fromDeg, toDeg, text, o) {
      /* SVG text at the mid-angle (the FILM's label; the question's labels are
         HTML overlays the renderer places at labelPoint) */
      o = o || {};
      var span = normDeg(toDeg - fromDeg) || 360;
      var u = rimUser(fromDeg + span / 2, R * 0.62);
      var t = b.text(u[0], u[1], String(text), { cls: 'stat-sector-label' + (o.cls ? ' ' + o.cls : ''), group: gText, ink: 'var(--ink)' });
      t.setAttribute('dominant-baseline', 'middle');
      b.relayout();
      return { el: t, done: writeOn(t, o.instant) };
    }
    /* the read-out beside the rim end of the last boundary (HTML label in the layer) */
    var readoutEl = null;
    function readout(text, deg) {
      if (!readoutEl) {
        readoutEl = he('div', 'stat-label');
        readoutEl.setAttribute('data-board-label', '');
        readoutEl.setAttribute('data-label-kind', 'readout');
        readoutEl.setAttribute('role', 'status');
        readoutEl.style.fontSize = LABEL_TARGET_PX + 'px';
        b.layer.appendChild(readoutEl);
      }
      readoutEl.textContent = text;
      var d = deg != null ? deg : (bounds.length ? bounds[bounds.length - 1].deg : 0);
      var u = rimUser(d, R + 26);
      var c = b.toCss(u[0], u[1]);
      var w = readoutEl.offsetWidth || 40, hgt = readoutEl.offsetHeight || 16;
      var layerW = b.layer.clientWidth || W, layerH = b.layer.clientHeight || H;
      readoutEl.style.left = Math.max(w / 2, Math.min(layerW - w / 2, c.x)) + 'px';
      readoutEl.style.top = Math.max(hgt, Math.min(layerH, c.y + hgt / 2)) + 'px';
    }
    function clearReadout() { if (readoutEl) { readoutEl.remove(); readoutEl = null; } }

    if (!opts.readOnly && typeof opts.onRimTap === 'function') {
      var tap = null;
      rim.addEventListener('pointerdown', function (e) { tap = { x: e.clientX, y: e.clientY, u: b.userFromEvent(e) }; });
      rim.addEventListener('pointerup', function (e) {
        if (!tap) return;
        var moved = Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y);
        var u = tap.u; tap = null;
        if (moved > 12) return;
        opts.onRimTap(degAtUser(u.x, u.y));
      });
      rim.addEventListener('pointercancel', function () { tap = null; });
    }

    return {
      svg: svg, frame: b.frame, layer: b.layer, R: R,
      rimPoint: rimPoint, degAt: degAt, labelPoint: labelPoint,
      rimUser: rimUser, degAtUser: degAtUser, centreUser: function () { return [CX, CY]; },
      centre: function () { var c = b.toCss(CX, CY); return [c.x, c.y]; },
      snap: normDeg,
      boundary: boundary, removeBoundary: removeBoundary, boundaries: boundaryDegs,
      sector: sector, clearSectors: clearSectors, sectorLabel: sectorLabel,
      readout: readout, clearReadout: clearReadout,
      relayout: b.relayout, destroy: b.destroy
    };
  }

  // -----------------------------------------------------------------------
  // stemleafFilm(host, spec) -> handle   (the FILM's stem-and-leaf; the
  // question board is HTML in jotter-stats.js)
  // spec { stems:[ints], decimals, unit, back?:bool (two sides: leaves grow
  // leftward on the left of the stem) }
  // addLeaf(stem, digit, side) appends outward; key(stem, leaf, means) writes
  // the key line under the rows. Monospace digits, 13 px rendered.
  // -----------------------------------------------------------------------
  function stemleafFilm(host, spec, opts) {
    opts = opts || {};
    spec = spec || {};
    var stems = (spec.stems || []).map(String);
    var back = !!spec.back;
    var ROW = 34, LEAF = 24, TOP = 22, KEYH = 44;
    var W = 400, H = TOP + stems.length * ROW + KEYH;
    var b = makeBoard(host, W, H, { cls: 'stat-sl-board' + (opts.cls ? ' ' + opts.cls : ''), append: opts.append });
    var svg = b.svg;
    var gLines = sv('g', { 'data-role': 'lines' }), gText = sv('g', { 'data-role': 'text' });
    svg.appendChild(gLines); svg.appendChild(gText);
    var stemX = back ? W / 2 : 76;
    var colHalf = 16;    /* half the stem column's width */
    /* the stem column's two rules */
    gLines.appendChild(sv('line', { x1: stemX - colHalf, y1: TOP - 10, x2: stemX - colHalf, y2: TOP + stems.length * ROW - 4, stroke: 'var(--ink)', 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke' }));
    gLines.appendChild(sv('line', { x1: stemX + colHalf, y1: TOP - 10, x2: stemX + colHalf, y2: TOP + stems.length * ROW - 4, stroke: 'var(--ink)', 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke' }));
    if (!back) gLines.children[0].remove();
    var rows = {};
    stems.forEach(function (stm, r) {
      var y = TOP + r * ROW + ROW * 0.68;
      var t = b.text(stemX, y, stm, { cls: 'stat-sl-stem', group: gText, mono: true, ink: 'var(--ink)', weight: 600 });
      t.setAttribute('data-stem', stm);
      rows[stm] = { y: y, right: [], left: [], stemEl: t };
    });
    if (spec.title) b.text(stemX, TOP - 14, String(spec.title), { cls: 'stat-sl-title', group: gText, ink: 'var(--pencil)' });
    if (back && spec.sides) {
      if (spec.sides[0]) b.text(stemX - colHalf - 10, TOP - 14, String(spec.sides[0]), { anchor: 'end', cls: 'stat-sl-side', group: gText, ink: 'var(--pencil)' });
      if (spec.sides[1]) b.text(stemX + colHalf + 10, TOP - 14, String(spec.sides[1]), { anchor: 'start', cls: 'stat-sl-side', group: gText, ink: 'var(--pencil)' });
    }
    function addLeaf(stem, digit, side, o) {
      o = o || {};
      var row = rows[String(stem)];
      if (!row) return null;
      side = side === 'left' ? 'left' : 'right';
      var list = row[side];
      var k = list.length;
      var x = side === 'right' ? stemX + colHalf + 14 + k * LEAF : stemX - colHalf - 14 - k * LEAF;
      var t = b.text(x, row.y, String(digit), { cls: 'stat-sl-leaf' + (o.cls ? ' ' + o.cls : ''), group: gText, mono: true, ink: o.ink || 'var(--copper-ink)' });
      t.setAttribute('data-stem', String(stem)); t.setAttribute('data-side', side); t.setAttribute('data-k', k);
      list.push(t);
      b.relayout();
      return { el: t, done: writeOn(t, o.instant, o.ms || 180) };
    }
    var keyEl = null;
    function key(stem, leaf, means, o) {
      o = o || {};
      if (keyEl) keyEl.remove();
      var y = TOP + stems.length * ROW + 24;
      var txt = String(stem) + ' | ' + String(leaf) + '  means  ' + String(means);
      keyEl = b.text(back ? stemX : stemX - colHalf, y, txt, { anchor: back ? 'middle' : 'start', cls: 'stat-sl-key-text' + (o.cls ? ' ' + o.cls : ''), group: gText, mono: true, ink: 'var(--ink)' });
      b.relayout();
      return { el: keyEl, done: writeOn(keyEl, o.instant) };
    }
    /* the copper ring round one leaf (the median beat) */
    function ringLeaf(stem, k, side) {
      var row = rows[String(stem)];
      if (!row) return null;
      var t = row[side === 'left' ? 'left' : 'right'][k];
      if (!t) return null;
      var x = Number(t.getAttribute('x')), y = Number(t.getAttribute('y'));
      var f = LABEL_TARGET_PX / (b.scale || 1);
      var e = sv('ellipse', { cx: x, cy: y - f * 0.35, rx: f * 0.7, ry: f * 0.72, fill: 'none', stroke: 'var(--copper)', 'stroke-width': 1.8, 'vector-effect': 'non-scaling-stroke', class: 'stat-sl-ring' });
      gLines.appendChild(e);
      animatePath(e, false);
      return e;
    }
    return {
      svg: svg, frame: b.frame,
      addLeaf: addLeaf, key: key, ringLeaf: ringLeaf,
      leaves: function (stem, side) { var row = rows[String(stem)]; return row ? row[side === 'left' ? 'left' : 'right'].map(function (t) { return t.textContent; }) : []; },
      relayout: b.relayout, destroy: b.destroy
    };
  }

  var API = { render: render, fmtNum: fmtNum, venn: venn, pie: pie, stemleafFilm: stemleafFilm };
  if (typeof window !== 'undefined') window.GJ_STATCHART = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
