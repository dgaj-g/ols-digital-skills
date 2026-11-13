/* Teach It To See · the learner. Pure JavaScript, no canvas, so the same code runs in the page and in the node gates.
   A drawing becomes 28 x 28 numbers (how much ink is in each small square), softened once.
   To guess, it compares a new drawing with the three most alike drawings of each thing. Position is NOT normalised on purpose:
   "it learned where, not what" (The bad teacher) depends on it. */
(function (g) {
  var N = 28;
  function raster(strokes, size) {
    var k = N / (size || 420), v = new Float32Array(N * N), b = new Float32Array(N * N), i, j;
    function stamp(x, y) {
      for (var jj = Math.floor(y - 1.7); jj <= Math.ceil(y + 1.7); jj++) for (var ii = Math.floor(x - 1.7); ii <= Math.ceil(x + 1.7); ii++) {
        if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
        var d = Math.hypot(ii + .5 - x, jj + .5 - y), a = d <= .7 ? 1 : d >= 1.7 ? 0 : 1.7 - d, q = jj * N + ii;
        if (a > v[q]) v[q] = a;
      }
    }
    strokes.forEach(function (s) {
      for (var n = 0; n < s.length; n++) {
        var ax = s[n][0] * k, ay = s[n][1] * k;
        if (n === s.length - 1) { stamp(ax, ay); break; }
        var bx = s[n + 1][0] * k, by = s[n + 1][1] * k, m = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / .4));
        for (var t = 0; t < m; t++) stamp(ax + (bx - ax) * t / m, ay + (by - ay) * t / m);
      }
    });
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var t2 = 0, n2 = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var X = i + dx, Y = j + dy;
        if (X >= 0 && Y >= 0 && X < N && Y < N) { t2 += v[Y * N + X]; n2++; }
      }
      b[j * N + i] = t2 / n2;
    }
    return b;
  }
  function cos(a, b) { var d = 0, x = 0, y = 0; for (var i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : 0; }
  function score(v, set) {
    var s = set.map(function (e) { return cos(v, e); }).sort(function (a, b) { return b - a; }).slice(0, 3);
    return s.length ? s.reduce(function (a, b) { return a + b; }, 0) / s.length : -1;
  }
  /* sets: one array of vectors per thing. Returns the winning index c, how sure p (0 to 1), and every share ps. */
  function classify(v, sets) {
    var sc = sets.map(function (set) { return score(v, set); }), z = 0, ps, c = 0;
    ps = sc.map(function (s) { var e = s < 0 ? 0 : Math.exp(14 * s); z += e; return e; }).map(function (e) { return z ? e / z : 0; });
    ps.forEach(function (p, i) { if (p > ps[c]) c = i; });
    return { c: c, p: ps[c], ps: ps };
  }
  function mean(set) { var m = new Float32Array(N * N); set.forEach(function (e) { for (var i = 0; i < m.length; i++) m[i] += e[i] / set.length; }); return m; }
  function ink(strokes) { var L = 0; strokes.forEach(function (s) { for (var i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); }); return L; }
  g.SeeEngine = { N: N, raster: raster, cos: cos, score: score, classify: classify, mean: mean, ink: ink };
})(typeof window !== 'undefined' ? window : module.exports);
