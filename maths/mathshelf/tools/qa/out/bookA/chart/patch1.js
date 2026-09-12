// patch statchart.js — additive Book A edits inside render()
const fs = require('fs');
const f = '/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/statchart.js';
let s = fs.readFileSync(f, 'utf8');
function rep(a, b) { if (s.indexOf(a) < 0) throw new Error('anchor not found: ' + a.slice(0, 60)); if (s.indexOf(a) !== s.lastIndexOf(a)) throw new Error('anchor not unique: ' + a.slice(0, 60)); s = s.replace(a, b); }

// 1. y-axis break glyph when y.min > 0 (mirror of the x one)
rep(`        zpath.setAttribute('data-ornament', '');
        gBreak.appendChild(zpath);
      }
    } else {`,
`        zpath.setAttribute('data-ornament', '');
        gBreak.appendChild(zpath);
      }
      /* BOOK A (12 Sept 2026): the same break on the y axis when y.min isn't 0
         - a scatter's height axis often starts at 140, and an axis that starts
         above zero without saying so is the slip the source page warns about */
      if (Math.abs(g.yMin) > 1e-9) {
        var byx = g.plotX0, byy = g.plotY1;
        var zzy = 'M ' + (byx - 6) + ' ' + (byy + 4) + ' l 5 -3 l -8 -4 l 8 -4 l -5 -3';
        var zpathy = sv('path', { d: zzy, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        zpathy.setAttribute('data-ornament', '');
        gBreak.appendChild(zpathy);
      }
    } else {`);

// 2. hit registry: a per-hit minimum size (the lobf handle is 48, everything else 44)
rep(`    function addHit(cx, cy, kind, group) {
      var hitEl = sv('circle', { cx: cx, cy: cy, r: 16, fill: 'transparent', stroke: 'none' });`,
`    function addHit(cx, cy, kind, group, minPx) {
      var hitEl = sv('circle', { cx: cx, cy: cy, r: 16, fill: 'transparent', stroke: 'none' });`);
rep(`      var rec = { el: hitEl, cx: cx, cy: cy };
      st.hitEls.push(rec);
      return rec;
    }`,
`      var rec = { el: hitEl, cx: cx, cy: cy, minPx: minPx || MIN_HIT };
      st.hitEls.push(rec);
      return rec;
    }`);
rep(`      var hitUserUnits = MIN_HIT / 2 / scaleFactor;
      for (var j = 0; j < st.hitEls.length; j++) st.hitEls[j].el.setAttribute('r', Math.max(hitUserUnits, 8));`,
`      for (var j = 0; j < st.hitEls.length; j++) {
        var hitUserUnits = (st.hitEls[j].minPx || MIN_HIT) / 2 / scaleFactor;
        st.hitEls[j].el.setAttribute('r', Math.max(hitUserUnits, 8));
      }
      if (st.lobf) redrawLobf();`);

// 3. given points (scatter): read-only, ink-filled, no hit, no data-placed
rep(`    function drawPointGlyph(px, py, ghost) {
      var gpt = sv('g', { class: 'stat-pt' + (ghost ? ' ghost' : '') });
      var dot = sv('circle', { cx: px, cy: py, r: 4.2, fill: 'var(--copper)', stroke: 'var(--panel)', 'stroke-width': 1.2 });
      gpt.appendChild(dot);`,
`    function drawPointGlyph(px, py, ghost, given) {
      var gpt = sv('g', { class: 'stat-pt' + (ghost ? ' ghost' : '') + (given ? ' is-given' : '') });
      /* BOOK A: a GIVEN point is printed in ink (the page's own data); a point
         she places is copper - nothing read is faded, the two differ by hue */
      var dot = sv('circle', { cx: px, cy: py, r: 4.2, fill: given ? 'var(--ink)' : 'var(--copper)', stroke: 'var(--panel)', 'stroke-width': 1.2 });
      gpt.appendChild(dot);`);
rep(`      var glyph = drawPointGlyph(p[0], p[1], !!o.ghost);
      gPoints.appendChild(glyph.g);`,
`      var glyph = drawPointGlyph(p[0], p[1], !!o.ghost, !!o.given);
      gPoints.appendChild(glyph.g);`);
rep(`      var hit = (o.ghost || opts.readOnly) ? null : addHit(p[0], p[1], 'point', gPoints);
      var idx = st.points.length;
      st.points.push(ax);
      st.pointEls.push({ g: glyph.g, dot: glyph.dot, hit: hit, ghost: !!o.ghost });`,
`      var hit = (o.ghost || o.given || opts.readOnly) ? null : addHit(p[0], p[1], 'point', gPoints);
      var idx = st.points.length;
      st.points.push(ax);
      glyph.g.setAttribute('data-index', idx);
      st.pointEls.push({ g: glyph.g, dot: glyph.dot, hit: hit, ghost: !!o.ghost, given: !!o.given });`);
rep(`    function selectPoint(i) {
      st.selectedPoint = i;
      st.pointEls.forEach(function (rec, idx) {
        if (!rec) return;
        rec.dot.setAttribute('stroke', idx === i ? 'var(--copper)' : 'var(--panel)');`,
`    function selectPoint(i) {
      st.selectedPoint = i;
      st.pointEls.forEach(function (rec, idx) {
        if (!rec || rec.given) return;
        rec.dot.setAttribute('stroke', idx === i ? 'var(--copper)' : 'var(--panel)');`);
// points() = HER points; allPoints() = hers and the given ones, indexed as the board indexes them
rep(`    function points() { return st.points.filter(function (p) { return p; }).map(function (p) { return [p[0], p[1]]; }); }`,
`    function points() {
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
    }`);
// movePoint never moves a given point
rep(`    function movePoint(i, x, y) {
      if (!st.pointEls[i]) return;`,
`    function movePoint(i, x, y) {
      if (!st.pointEls[i] || st.pointEls[i].given) return;`);

// 4. drop() falls back to the LOBF line when no curve is joined
rep(`      if (!st.rule || !st.curvePts || !st.curvePts.length) return null;
      var g = st.geo, hitX, hitY, mx, my;
      if (st.rule.axis === 'y') {
        hitX = curveXChord(st.curvePts, st.rule.v);
        if (hitX == null) return null;
        hitY = st.rule.v;
      } else {
        hitY = curveYChord(st.curvePts, st.rule.v);
        if (hitY == null) return null;
        hitX = st.rule.v;
      }`,
`      if (!st.rule) return null;
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
      }`);

// 5. scatter block: line(), handleAt(), markOutlier(), enablePress() — before annotate()
rep(`    // =====================================================================
    // annotate(): break mark / committed-read ticks / marked target rings
    // =====================================================================`,
`    // =====================================================================
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
          h.el.style.touchAction = 'pan-x pan-y';
          h.el.addEventListener('click', function (e) { e.stopPropagation(); fn(idx); });
          st.pressHits.push(h);
        })(i);
      }
      relayout();
    }

    // =====================================================================
    // annotate(): break mark / committed-read ticks / marked target rings
    // =====================================================================`);

// 6. handle additions
rep(`      selectedPoint: function () { return st.selectedPoint; },
      selectPoint: selectPoint,
      selectMarker: selectMarker,
      relayout: relayout
    };
    return handle;`,
`      selectedPoint: function () { return st.selectedPoint; },
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
    return handle;`);

fs.writeFileSync(f, s);
console.log('patched', s.length);
