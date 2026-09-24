/* engine.js — My Amazing World: the canvas globe (d3-geo orthographic). Drag to spin with inertia, wheel to zoom, tap to answer.
   Pure rendering + input. Judging lives in judge.js; game flow in script.js. */
(function (root) {
  'use strict';
  var d3 = root.d3;
  function clampLat(v) { return Math.max(-90, Math.min(90, v)); }

  function Globe(canvas, layers, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.layers = layers;
    this.opts = Object.assign({
      onTap: null, home: [30, -25],
      water: ['#3F84D2', '#123367'], land: '#EFE6CC', landStroke: '#8C7B52', border: '#B9A87A',
      graticule: 'rgba(255,255,255,0.16)', gold: '#E4B824', goldFill: 'rgba(228,184,36,0.55)'
    }, opts || {});
    this.rotation = this.opts.home.slice();
    this.zoom = 1;
    this.highlight = null;   // a GeoJSON feature to light up
    this.marker = null;      // { lonlat, text, tone }
    this.pins = [];          // [{ lonlat, label }]
    this.mode = 'spin';      // 'spin' | 'ruler' (Leg 7 measure)
    this.ruler = null;       // { a, b } lon/lat ends
    this.projection = d3.geoOrthographic().clipAngle(90).rotate(this.rotation);
    this.path = d3.geoPath(this.projection, this.ctx);
    this.graticule = d3.geoGraticule10();
    this.sphere = { type: 'Sphere' };
    this._land = { type: 'FeatureCollection', features: layers.land };
    this._continents = { type: 'FeatureCollection', features: layers.continents };
    this._drag = null; this._raf = null; this._inertia = null; this._fly = null;
    this._bind();
    this.resize();
  }

  Globe.prototype.resize = function () {
    var box = this.canvas.parentNode.getBoundingClientRect();
    var size = Math.max(240, Math.floor(Math.min(box.width - 24, 620, (root.innerHeight || 800) - 180)));
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    this.size = size; this.dpr = dpr;
    this.canvas.width = size * dpr; this.canvas.height = size * dpr;
    this.canvas.style.width = size + 'px'; this.canvas.style.height = size + 'px';
    this.baseScale = size / 2 - 6;
    this.projection.translate([size / 2, size / 2]).scale(this.baseScale * this.zoom);
    this.render();
  };

  Globe.prototype.centre = function () { return [-this.rotation[0], -this.rotation[1]]; };
  Globe.prototype.visible = function (ll) { return d3.geoDistance(ll, this.centre()) < Math.PI / 2 - 0.03; };

  Globe.prototype.render = function () {
    var ctx = this.ctx, p = this.path, size = this.size, o = this.opts;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    var t = this.projection.translate(), r = this.projection.scale();
    var g = ctx.createRadialGradient(t[0] - r * 0.4, t[1] - r * 0.4, r * 0.05, t[0], t[1], r);
    g.addColorStop(0, o.water[0]); g.addColorStop(1, o.water[1]);
    ctx.beginPath(); p(this.sphere); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); p(this.graticule); ctx.lineWidth = 0.6; ctx.strokeStyle = o.graticule; ctx.stroke();
    ctx.beginPath(); p(this._land); ctx.fillStyle = o.land; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = o.landStroke; ctx.stroke();
    ctx.beginPath(); p(this._continents); ctx.lineWidth = 0.5; ctx.strokeStyle = o.border; ctx.stroke();
    if (this.highlight) { ctx.beginPath(); p(this.highlight); ctx.fillStyle = o.goldFill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = o.gold; ctx.stroke(); }
    ctx.beginPath(); p(this.sphere); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.stroke();
    for (var i = 0; i < this.pins.length; i++) this._drawPin(this.pins[i]);
    if (this.ruler && this.ruler.b) {
      ctx.beginPath(); p({ type: 'LineString', coordinates: [this.ruler.a, this.ruler.b] });
      ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeStyle = o.gold; ctx.stroke(); ctx.setLineDash([]);
      [this.ruler.a, this.ruler.b].forEach(function (e) { if (this.visible(e)) { var q = this.projection(e); ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = o.gold; ctx.stroke(); } }, this);
    }
    if (this.marker) this._drawMarker(this.marker);
  };
  Globe.prototype.setMode = function (m) { this.mode = m; this.canvas.style.cursor = m === 'ruler' ? 'crosshair' : 'grab'; };
  Globe.prototype._ll = function (e) {
    var rect = this.canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
    var t = this.projection.translate(), r = this.projection.scale();
    if (Math.hypot(x - t[0], y - t[1]) > r) return null;
    var ll = this.projection.invert([x, y]); return ll && isFinite(ll[0]) && isFinite(ll[1]) ? ll : null;
  };

  Globe.prototype._drawPin = function (pin) {
    if (!this.visible(pin.lonlat)) return;
    var ctx = this.ctx, xy = this.projection(pin.lonlat);
    ctx.beginPath(); ctx.arc(xy[0], xy[1], 6, 0, Math.PI * 2); ctx.fillStyle = pin.color || this.opts.gold; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    if (pin.label) this._label(xy, pin.label, '#1A3A6B', '#fff');
  };

  var TONES = { good: ['#2E7D5B', '#fff'], bad: ['#B6413A', '#fff'], info: ['#1A3A6B', '#fff'] };
  Globe.prototype._drawMarker = function (m) {
    if (!this.visible(m.lonlat)) return;
    var ctx = this.ctx, xy = this.projection(m.lonlat), tone = TONES[m.tone] || TONES.info;
    ctx.beginPath(); ctx.arc(xy[0], xy[1], 9, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = tone[0]; ctx.stroke();
    ctx.beginPath(); ctx.arc(xy[0], xy[1], 3, 0, Math.PI * 2); ctx.fillStyle = tone[0]; ctx.fill();
    if (m.text) this._label(xy, m.text, tone[0], tone[1]);
  };

  Globe.prototype._label = function (xy, text, bg, fg) {
    var ctx = this.ctx, size = this.size;
    ctx.font = '600 14px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    var w = ctx.measureText(text).width + 18, h = 26;
    var x = Math.max(4, Math.min(size - w - 4, xy[0] - w / 2));
    var y = xy[1] - 18 - h; if (y < 4) y = xy[1] + 16;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 8); else ctx.rect(x, y, w, h);
    ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(text, x + 9, y + h / 2 + 1);
  };

  Globe.prototype._schedule = function () {
    var self = this;
    if (this._raf) return;
    this._raf = root.requestAnimationFrame(function () { self._raf = null; self.render(); });
  };
  Globe.prototype._apply = function () { this.projection.rotate(this.rotation); this._schedule(); };
  Globe.prototype._k = function () { return 75 / (this.baseScale * this.zoom); };

  Globe.prototype._stopMotion = function () {
    if (this._inertia) { this._inertia.stop(); this._inertia = null; }
    if (this._fly) { this._fly.stop(); this._fly = null; }
  };

  Globe.prototype._bind = function () {
    var c = this.canvas, self = this;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', function (e) {
      if (self._drag) return;
      c.setPointerCapture(e.pointerId);
      self._stopMotion();
      if (self.mode === 'ruler') { var a = self._ll(e); if (a) { self.ruler = { a: a, b: null }; self._rulerId = e.pointerId; } return; }
      self._drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false, samples: [] };
      c.style.cursor = 'grabbing';
    });
    c.addEventListener('pointermove', function (e) {
      if (self.mode === 'ruler' && self._rulerId === e.pointerId && self.ruler) { var b = self._ll(e); if (b) { self.ruler.b = b; self._schedule(); if (self.opts.onRuler) self.opts.onRuler(self.ruler); } return; }
      var d = self._drag; if (!d || d.id !== e.pointerId) return;
      var dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) d.moved = true;
      if (!d.moved) return;
      var k = self._k();
      self.rotation[0] += dx * k; self.rotation[1] = clampLat(self.rotation[1] - dy * k);
      d.samples.push([performance.now(), dx * k, dy * k]); if (d.samples.length > 6) d.samples.shift();
      self._apply();
    });
    function up(e) {
      if (self._rulerId === e.pointerId) { self._rulerId = null; if (self.opts.onRuler && self.ruler) self.opts.onRuler(self.ruler, true); return; }
      var d = self._drag; if (!d || d.id !== e.pointerId) return;
      self._drag = null; c.style.cursor = 'grab';
      if (!d.moved) { if (performance.now() - d.t < 800) self._tap(e); return; }
      var now = performance.now(), recent = d.samples.filter(function (s) { return now - s[0] < 90; });
      if (recent.length) {
        var vx = 0, vy = 0; recent.forEach(function (s) { vx += s[1]; vy += s[2]; }); vx /= recent.length; vy /= recent.length;
        if (Math.hypot(vx, vy) > 0.2) self._startInertia(vx, vy);
      }
    }
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', function (e) { e.preventDefault(); self.setZoom(self.zoom * (e.deltaY < 0 ? 1.12 : 0.89)); }, { passive: false });
    root.addEventListener('resize', function () { self.resize(); });
  };

  Globe.prototype._startInertia = function (vx, vy) {
    var self = this, cx = vx, cy = vy;
    this._inertia = d3.timer(function () {
      cx *= 0.93; cy *= 0.93;
      self.rotation[0] += cx; self.rotation[1] = clampLat(self.rotation[1] - cy);
      self._apply();
      if (Math.hypot(cx, cy) < 0.02) { self._inertia.stop(); self._inertia = null; }
    });
  };

  Globe.prototype._tap = function (e) {
    var rect = this.canvas.getBoundingClientRect();
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    var t = this.projection.translate(), r = this.projection.scale();
    if (Math.hypot(x - t[0], y - t[1]) > r) return;
    var ll = this.projection.invert([x, y]);
    if (!ll || !isFinite(ll[0]) || !isFinite(ll[1])) return;
    if (this.opts.onTap) this.opts.onTap(ll, [x, y]);
  };

  Globe.prototype.setZoom = function (z) {
    this.zoom = Math.max(1, Math.min(2.6, z));
    this.projection.scale(this.baseScale * this.zoom);
    this._schedule();
  };

  Globe.prototype.reset = function () { this._stopMotion(); this.rotation = this.opts.home.slice(); this.zoom = 1; this.projection.scale(this.baseScale); this._apply(); };

  /* Fly the centre of the globe to a point, shortest way round. */
  Globe.prototype.flyTo = function (lonlat, ms, done) {
    this._stopMotion();
    var from = this.rotation.slice(), to = [-lonlat[0], -lonlat[1]];
    var dl = ((to[0] - from[0] + 540) % 360) - 180, target = [from[0] + dl, to[1]];
    var self = this, t0 = performance.now(), dur = ms || 900;
    this._fly = d3.timer(function () {
      var t = Math.min(1, (performance.now() - t0) / dur), e = d3.easeCubicInOut(t);
      self.rotation = [from[0] + (target[0] - from[0]) * e, from[1] + (target[1] - from[1]) * e];
      self._apply();
      if (t >= 1) { self._fly.stop(); self._fly = null; if (done) done(); }
    });
  };

  root.MAW_Globe = Globe;

  /* ---------- FlatMap: the flat charts for Legs 2–5 (equal-earth world, conic Europe / Northern Ireland / Ireland) ----------
     scene = { projection: d3 projection (unfitted), fit: GeoJSON to fit, aspect: h/w, zoomMax, fixed (no pan/zoom, for drag tiles),
               fills: [{ features, fill, stroke, lw }], lines: [{ features, stroke, lw }], hills: [{ name, at }], dots: [{ name, at }] }
     Draw state: painted [{ feature, fill }], highlight (feature, gold), marker { lonlat, text, tone }, pins [{ lonlat, label, color }]. */
  function FlatMap(canvas, opts) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.opts = Object.assign({ onTap: null, onView: null, sea: '#2F6FB8', sea2: '#1F4F8F', gold: '#E4B824', goldFill: 'rgba(228,184,36,0.6)' }, opts || {});
    this.scene = null; this.k = 1; this.tx = 0; this.ty = 0;
    this.painted = []; this.highlight = null; this.marker = null; this.pins = [];
    this._pts = {}; this._raf = null;
    this._bind();
  }
  FlatMap.prototype.setScene = function (scene) {
    this.scene = scene; this.painted = []; this.highlight = null; this.marker = null; this.pins = [];
    this.k = 1; this.tx = 0; this.ty = 0; this.resize();
  };
  FlatMap.prototype.resize = function () {
    if (!this.scene) return;
    var box = this.canvas.parentNode.getBoundingClientRect();
    var w = Math.max(260, Math.floor(box.width - 24));
    var h = Math.floor(Math.min(w * this.scene.aspect, Math.max(300, (root.innerHeight || 800) - 150), 640));
    if (h < w * this.scene.aspect) w = Math.floor(h / this.scene.aspect);
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = w * dpr; this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.projection = this.scene.projection.fitExtent([[8, 8], [w - 8, h - 8]], this.scene.fit);
    this.path = d3.geoPath(this.projection, this.ctx);
    this.render();
    if (this.opts.onView) this.opts.onView();
  };
  /* screen <-> lon/lat through pan/zoom */
  FlatMap.prototype.toScreen = function (ll) { var q = this.projection(ll); return q ? [q[0] * this.k + this.tx, q[1] * this.k + this.ty] : null; };
  FlatMap.prototype.invert = function (xy) { var ll = this.projection.invert([(xy[0] - this.tx) / this.k, (xy[1] - this.ty) / this.k]); return ll && isFinite(ll[0]) && isFinite(ll[1]) ? ll : null; };
  FlatMap.prototype._clampPan = function () {
    var w = this.w, h = this.h, k = this.k;
    this.tx = Math.min(0, Math.max(w - w * k, this.tx)); this.ty = Math.min(0, Math.max(h - h * k, this.ty));
  };
  FlatMap.prototype.zoomAt = function (xy, f) {
    var z = this.scene.zoomMax || 3, k2 = Math.max(1, Math.min(z, this.k * f)), r = k2 / this.k;
    this.tx = xy[0] - (xy[0] - this.tx) * r; this.ty = xy[1] - (xy[1] - this.ty) * r; this.k = k2;
    this._clampPan(); this._schedule();
  };
  /* Bring a point into view (used by a reveal). */
  FlatMap.prototype.show = function (ll) {
    if (this.k === 1) return;
    var q = this.projection(ll); this.tx = this.w / 2 - q[0] * this.k; this.ty = this.h / 2 - q[1] * this.k; this._clampPan(); this._schedule();
  };
  FlatMap.prototype._schedule = function () { var self = this; if (this._raf) return; this._raf = root.requestAnimationFrame(function () { self._raf = null; self.render(); if (self.opts.onView) self.opts.onView(); }); };
  FlatMap.prototype.render = function () {
    var sc = this.scene; if (!sc) return;
    var ctx = this.ctx, p = this.path, o = this.opts, k = this.k, self = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    var g = ctx.createLinearGradient(0, 0, 0, this.h); g.addColorStop(0, o.sea); g.addColorStop(1, o.sea2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
    ctx.setTransform(this.dpr * k, 0, 0, this.dpr * k, this.dpr * this.tx, this.dpr * this.ty);
    if (sc.sphere) { ctx.beginPath(); p({ type: 'Sphere' }); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(); }
    function fill(L) {
      L.features.forEach(function (f) { ctx.beginPath(); p(f); ctx.fillStyle = L.fill; ctx.fill(); });
      ctx.beginPath(); L.features.forEach(function (f) { p(f); }); ctx.lineWidth = (L.lw || 0.8) / k; ctx.strokeStyle = L.stroke; ctx.stroke();
    }
    /* Water (over: true) goes on top of painted counties, or a found county would hide its loughs. */
    (sc.fills || []).forEach(function (L) { if (!L.over) fill(L); });
    this.painted.forEach(function (x) { ctx.beginPath(); p(x.feature); ctx.fillStyle = x.fill; ctx.fill(); ctx.lineWidth = 1 / k; ctx.strokeStyle = '#fff'; ctx.stroke(); });
    (sc.fills || []).forEach(function (L) { if (L.over) fill(L); });
    (sc.lines || []).forEach(function (L) { ctx.beginPath(); L.features.forEach(function (f) { p(f); }); ctx.lineWidth = (L.lw || 2) / k; ctx.strokeStyle = L.stroke; ctx.lineJoin = 'round'; ctx.stroke(); });
    if (this.highlight) {
      ctx.beginPath(); p(this.highlight);
      if (/Line/.test(this.highlight.geometry.type)) { ctx.lineWidth = 6 / k; ctx.strokeStyle = o.gold; ctx.stroke(); }
      else { ctx.fillStyle = o.goldFill; ctx.fill(); ctx.lineWidth = 2.5 / k; ctx.strokeStyle = o.gold; ctx.stroke(); }
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    (sc.hills || []).forEach(function (h) { var q = self.toScreen(h.at); if (!q) return; var s = 9;
      ctx.beginPath(); ctx.moveTo(q[0], q[1] - s); ctx.lineTo(q[0] + s, q[1] + s * 0.7); ctx.lineTo(q[0] - s, q[1] + s * 0.7); ctx.closePath();
      ctx.fillStyle = h.gold ? o.gold : '#7A5C3A'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); });
    (sc.dots || []).forEach(function (d) { var q = self.toScreen(d.at); if (!q) return;
      ctx.beginPath(); ctx.arc(q[0], q[1], 5.5, 0, Math.PI * 2); ctx.fillStyle = d.gold ? o.gold : '#1E2A44'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); });
    this.pins.forEach(function (pin) { var q = self.toScreen(pin.lonlat); if (!q) return;
      ctx.beginPath(); ctx.arc(q[0], q[1] - 12, 7, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(q[0], q[1]); ctx.closePath();
      ctx.fillStyle = pin.color || o.gold; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      if (pin.label) self._label([q[0], q[1] - 14], pin.label, '#1A3A6B', '#fff'); });
    if (this.marker) { var q = this.toScreen(this.marker.lonlat), tone = TONES[this.marker.tone] || TONES.info;
      if (q) { ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = tone[0]; ctx.stroke();
        ctx.beginPath(); ctx.arc(q[0], q[1], 3, 0, Math.PI * 2); ctx.fillStyle = tone[0]; ctx.fill(); if (this.marker.text) this._label(q, this.marker.text, tone[0], tone[1]); } }
  };
  FlatMap.prototype._label = function (xy, text, bg, fg) { Globe.prototype._label.call({ ctx: this.ctx, size: this.w }, xy, text, bg, fg); };
  FlatMap.prototype._bind = function () {
    var c = this.canvas, self = this;
    c.style.touchAction = 'none';
    function local(e) { var r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    c.addEventListener('pointerdown', function (e) {
      c.setPointerCapture(e.pointerId);
      self._pts[e.pointerId] = { xy: local(e), start: local(e), t: performance.now(), moved: false };
      if (Object.keys(self._pts).length === 2) { var a = Object.keys(self._pts).map(function (k) { return self._pts[k].xy; }); self._pinch = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); }
    });
    c.addEventListener('pointermove', function (e) {
      var d = self._pts[e.pointerId]; if (!d) return;
      var xy = local(e), dx = xy[0] - d.xy[0], dy = xy[1] - d.xy[1]; d.xy = xy;
      if (!d.moved && Math.hypot(xy[0] - d.start[0], xy[1] - d.start[1]) > 6) d.moved = true;
      if (!d.moved || (self.scene && self.scene.fixed)) return;
      var ids = Object.keys(self._pts);
      if (ids.length === 2 && self._pinch) {
        var a = ids.map(function (k) { return self._pts[k].xy; }), dist = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
        self.zoomAt([(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2], dist / self._pinch); self._pinch = dist; return;
      }
      self.tx += dx; self.ty += dy; self._clampPan(); self._schedule();
    });
    function up(e) {
      var d = self._pts[e.pointerId]; if (!d) return;
      var multi = Object.keys(self._pts).length > 1; delete self._pts[e.pointerId]; if (Object.keys(self._pts).length < 2) self._pinch = null;
      if (!d.moved && !multi && performance.now() - d.t < 800 && self.opts.onTap) { var ll = self.invert(d.xy); if (ll) self.opts.onTap(ll, d.xy); }
    }
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', function (e) { if (!self.scene || self.scene.fixed) return; e.preventDefault(); self.zoomAt(local(e), e.deltaY < 0 ? 1.15 : 0.87); }, { passive: false });
    root.addEventListener('resize', function () { if (c.offsetParent) self.resize(); });
  };
  root.MAW_FlatMap = FlatMap;
})(window);
