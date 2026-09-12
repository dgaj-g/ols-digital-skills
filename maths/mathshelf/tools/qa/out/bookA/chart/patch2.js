const fs = require('fs');
const f = '/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/statchart.js';
let s = fs.readFileSync(f, 'utf8');
function rep(a, b) { if (s.indexOf(a) < 0) throw new Error('anchor not found: ' + a.slice(0, 60)); if (s.indexOf(a) !== s.lastIndexOf(a)) throw new Error('anchor not unique'); s = s.replace(a, b); }

rep(`  var API = { render: render, fmtNum: fmtNum };`,
`  // =======================================================================
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
    if (spec.n != null) nEl = b.text(rect.x + 8, rect.y + 20, 'n = ' + spec.n, { anchor: 'start', cls: 'stat-venn-n', group: gText, ink: 'var(--pencil)' });

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
    rim.style.cssText = 'pointer-events:stroke;cursor:crosshair;';
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

  var API = { render: render, fmtNum: fmtNum, venn: venn, pie: pie, stemleafFilm: stemleafFilm };`);
fs.writeFileSync(f, s);
console.log('patched', s.length);
