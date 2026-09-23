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
    if (this.marker) this._drawMarker(this.marker);
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
      self._drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false, samples: [] };
      c.style.cursor = 'grabbing';
    });
    c.addEventListener('pointermove', function (e) {
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
})(window);
