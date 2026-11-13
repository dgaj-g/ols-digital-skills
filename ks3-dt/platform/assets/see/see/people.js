/* Teach It To See · drawings made by rule. Used for (1) the stranger in Part 2 when nobody sits beside her, (2) the walker and the gates.
   Every drawing is a list of strokes on the 420 x 420 pad. A seed makes the same drawing every time. */
(function (g) {
  function mul(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function People(seed) {
    var r = mul(seed), j = function (a) { return (r() - .5) * a; };
    function ell(cx, cy, rx, ry, a0, a1, n) { var s = []; n = n || 26; for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; s.push([cx + rx * Math.cos(a) + j(5), cy + ry * Math.sin(a) + j(5)]); } return s; }
    function rays(cx, cy, r0, r1, n, a0, a1) { var s = []; for (var k = 0; k < n; k++) { var a = a0 + (a1 - a0) * k / n; s.push([[cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)], [cx + (r1 + j(10)) * Math.cos(a), cy + (r1 + j(10)) * Math.sin(a)]]); } return s; }
    var T = 6.283;
    var me = {
      sun: function (style) {
        var cx, cy, R, s;
        if (style === 'a') { cx = 300 + j(20); cy = 115 + j(20); R = 38 + j(8); return [ell(cx, cy, R, R, 0, T)].concat(rays(cx, cy, R + 8, R + 75, 6, 0, T)); }
        if (style === 'b') { cx = 210 + j(20); cy = 210 + j(20); s = []; for (var i = 0; i <= 70; i++) { var a = i / 70 * T * 3, q = 6 + i * 1.5; s.push([cx + q * Math.cos(a) + j(4), cy + q * Math.sin(a) + j(4)]); } return [s]; }
        if (style === 'c') { cx = 210 + j(30); cy = 400; R = 105 + j(15); return [ell(cx, cy, R, R, 3.1416, T, 20)].concat(rays(cx, cy, R + 12, R + 80, 6, 3.4, 6.5)); }
        cx = 210 + j(50); cy = 210 + j(50); R = 70 + j(30);
        return [ell(cx, cy, R, R, 0, T)].concat(rays(cx, cy, R + 12, R + 45, 8, 0, T));
      },
      fish: function (style) {
        var cx, cy, w;
        if (style === 'a') { cx = 235 + j(30); cy = 210 + j(40); w = 95 + j(20); return [ell(cx, cy, w, w * .45, 0, T), [[cx - w, cy], [cx - w - 55, cy - 45 + j(8)], [cx - w - 55, cy + 45 + j(8)], [cx - w, cy]], [[cx + w * .5, cy - 8], [cx + w * .5 + 3, cy - 8]]]; }
        if (style === 'b') { cx = 210 + j(30); cy = 185 + j(30); w = 95 + j(15); return [ell(cx, cy, w * .45, w, 0, T), [[cx, cy + w], [cx - 45 + j(8), cy + w + 55], [cx + 45 + j(8), cy + w + 55], [cx, cy + w]], [[cx - 8, cy - w * .5], [cx - 8, cy - w * .5 + 3]]]; }
        if (style === 'c') { cx = 120 + j(20); cy = 320 + j(20); w = 48 + j(8); return [ell(cx, cy, w, w * .5, 0, T), [[cx + w, cy], [cx + w + 30, cy - 24], [cx + w + 30, cy + 24], [cx + w, cy]]]; }
        cx = 190 + j(50); cy = 210 + j(50); w = 95 + j(30);
        return [ell(cx, cy, w, w * .45, 0, T), [[cx + w, cy], [cx + w + 55, cy - 45 + j(8)], [cx + w + 55, cy + 45 + j(8)], [cx + w, cy]], [[cx - w * .5, cy - 8], [cx - w * .5 + 3, cy - 8]]];
      },
      cat: function () {
        var cx = 210 + j(30), cy = 235 + j(30), R = 85 + j(15);
        return [ell(cx, cy, R, R * .9, 0, T), [[cx - R * .8, cy - R * .5], [cx - R * .75, cy - R * 1.5], [cx - R * .2, cy - R * .85]], [[cx + R * .8, cy - R * .5], [cx + R * .75, cy - R * 1.5], [cx + R * .2, cy - R * .85]],
          [[cx - 30, cy - 15], [cx - 27, cy - 15]], [[cx + 30, cy - 15], [cx + 27, cy - 15]], [[cx - 20, cy + 25], [cx - R - 40, cy + 15]], [[cx + 20, cy + 25], [cx + R + 40, cy + 15]], [[cx - 20, cy + 35], [cx - R - 35, cy + 50]], [[cx + 20, cy + 35], [cx + R + 35, cy + 50]]];
      },
      star: function () {
        var cx = 210 + j(40), cy = 215 + j(40), R = 120 + j(30), s = [];
        for (var i = 0; i <= 5; i++) { var a = -1.5708 + i * 2 * T / 5; s.push([cx + R * Math.cos(a) + j(6), cy + R * Math.sin(a) + j(6)]); }
        return [s];
      },
      house: function () {
        var x = 110 + j(30), y = 190 + j(30), w = 200 + j(30), h = 170 + j(20);
        return [[[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], [[x - 15, y], [x + w / 2, y - 110], [x + w + 15, y]], [[x + w * .4, y + h], [x + w * .4, y + h * .5], [x + w * .6, y + h * .5], [x + w * .6, y + h]]];
      },
      /* shrink a drawing into a box [x, y, w, h] on the pad */
      into: function (strokes, box) { return strokes.map(function (s) { return s.map(function (p) { return [box[0] + box[2] * (.12 + .76 * p[0] / 420), box[1] + box[3] * (.12 + .76 * p[1] / 420)]; }); }); }
    };
    return me;
  }
  g.SeePeople = People;
})(typeof window !== 'undefined' ? window : module.exports);
