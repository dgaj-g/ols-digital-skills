/* Warming stripes: colour scale, draw and animated paint.
   Idea: Professor Ed Hawkins (CC BY 4.0). Data: Met Office HadCRUT5 (OGL), shifted to 1850–1900 = 0. */
(function () {
  var STOPS = [
    [-0.30, '#08306B'], [-0.20, '#08519C'], [-0.10, '#2171B5'], [0.00, '#4292C6'], [0.10, '#6BAED6'],
    [0.20, '#9ECAE1'], [0.30, '#C6DBEF'], [0.40, '#DEEBF7'], [0.50, '#FEE0D2'], [0.65, '#FCBBA1'],
    [0.80, '#FC9272'], [0.95, '#FB6A4A'], [1.10, '#EF3B2C'], [1.25, '#CB181D'], [1.45, '#A50F15'],
    [1.70, '#67000D'], [2.20, '#3F0010'], [3.00, '#1C0008']
  ];
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  var RGB = STOPS.map(function (s) { return [s[0], hex(s[1])]; });
  function colour(a) {
    if (a <= RGB[0][0]) return 'rgb(' + RGB[0][1].join(',') + ')';
    for (var i = 1; i < RGB.length; i++) {
      if (a <= RGB[i][0]) {
        var lo = RGB[i - 1], hi = RGB[i], f = (a - lo[0]) / (hi[0] - lo[0]);
        return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(lo[1][k] + (hi[1][k] - lo[1][k]) * f); }).join(',') + ')';
      }
    }
    return 'rgb(' + RGB[RGB.length - 1][1].join(',') + ')';
  }

  function fit(canvas) {
    var r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return canvas.getContext('2d');
  }

  /* values: array of anomalies; upto: how many to show (default all); slots: total stripe slots (default values.length) */
  function draw(canvas, values, upto, slots) {
    var ctx = fit(canvas), W = canvas.width, H = canvas.height;
    var n = slots || values.length, k = upto == null ? values.length : upto;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < k && i < values.length; i++) {
      var x0 = Math.floor(i * W / n), x1 = Math.floor((i + 1) * W / n);
      ctx.fillStyle = colour(values[i]);
      ctx.fillRect(x0, 0, Math.max(1, x1 - x0 + 0.5), H);
    }
  }

  /* Animated paint, left to right. onYear(index) called as each stripe lands. Returns a cancel function. */
  function paint(canvas, values, ms, onYear, slots, from) {
    var start = null, raf, n = values.length, f0 = from || 0;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || ms <= 0) { draw(canvas, values, n, slots); if (onYear) onYear(n - 1); return function () {}; }
    function step(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / ms), k = f0 + Math.round((n - f0) * p);
      draw(canvas, values, k, slots);
      if (onYear) onYear(Math.max(0, k - 1));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return function () { cancelAnimationFrame(raf); };
  }

  window.TDTH_STRIPES = { colour: colour, draw: draw, paint: paint, STOPS: STOPS };
})();
