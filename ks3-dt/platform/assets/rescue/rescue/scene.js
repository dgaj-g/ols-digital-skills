/* The Rescue: the storm, the tree, the branch, the ladder. One full-window Canvas 2D,
   no library, no image files. Everything that moves is a function of the storm time st,
   so the film can run the storm backwards.
   World units: 1 = one CSS pixel at zoom 1 on a 1366-wide window. y runs down; the ground is y = 0. */
(function () {
  'use strict';
  var C = window.RescueChars, light = C.light, sh = C.sh, TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function fract(x) { return x - Math.floor(x); }
  function h1(n) { return fract(Math.sin(n * 127.1 + 311.7) * 43758.5453); }
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  var canvas, ctx, W = 0, H = 0, k = 1, dpr = 1, tex = {};
  var NIGHT = [0.57, 0.63, 0.80];

  /* ---------- the geometry of the world ---------- */
  var G = { BY: -1500, R: 58, JX: 70, TIP: 1160, KX: 640, PX: 880, CR0: 50, CR1: 330, HOL: { x: -6, y: -1322, rx: 44, ry: 58 }, LADX: 760, RUNG: 40 };
  G.FEETY = G.BY + (1.95 + 3.1) * G.R;
  G.RAIL = 62;
  G.LT1 = G.FEETY + G.RAIL + 6;               /* the basket floor when the ladder has reached them */
  G.LT0 = G.LT1 + 8 * G.RUNG;         /* and where it starts: eight rungs short */
  G.L = G.TIP - G.JX;
  var SHOT = {
    TYPING: { x: 734, y: -1164, z: 0.86 },
    FOOT: { x: 380, y: -210, z: 1.0 },
    KIT: { x: G.KX + 6, y: -1372, z: 2.45 },
    PUP: { x: G.PX - 6, y: -1372, z: 2.45 },
    BOTH: { x: 760, y: -1335, z: 1.5 },
    CRACK: { x: 270, y: G.BY + 16, z: 2.3 },
    OWL: { x: 150, y: G.HOL.y + 6, z: 2.7 }
  };

  /* ---------- cloud textures, made once (the storm build's method) ---------- */
  function hash2(ix, iy, seed) {
    var h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2147483647) | 0;
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  }
  function vnoise(x, y, px, seed) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px;
    var a = hash2(x0, yi, seed), b = hash2(x1, yi, seed), c = hash2(x0, yi + 1, seed), d = hash2(x1, yi + 1, seed);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
  function fbm(x, y, px, seed) {
    var s = 0, amp = 0.5, f = 1, norm = 0;
    for (var o = 0; o < 5; o++) { s += amp * vnoise(x * f, y * f, px * f, seed + o * 17); norm += amp; amp *= 0.5; f *= 2; }
    return s / norm;
  }
  function makeDensity(seed, w, h) {
    var d = new Float32Array(w * h);
    for (var j = 0; j < h; j++) {
      var fall = smooth(j / (h * 0.16)) * smooth((h - j) / (h * 0.30));
      for (var i = 0; i < w; i++) d[j * w + i] = fbm(i / w * 5, j / h * 2.4, 5, seed) * (0.35 + 0.65 * fall);
    }
    return d;
  }
  function makeCloud(d, w, h, dark, lite, lo, hi) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    /* kept in ordinary memory, so a lost graphics context cannot empty the clouds */
    var g = c.getContext('2d', { willReadFrequently: true }), img = g.createImageData(w, h), px = img.data;
    for (var q = 0; q < w * h; q++) {
      var n = d[q], a = smooth((n - lo) / (hi - lo)), core = smooth((n - lo) / 0.30);
      var up = q - w * 6 >= 0 ? d[q - w * 6] : n, rim = clamp((n - up) * 7 + 0.35, 0, 1);
      var t = clamp(core * 0.85 - rim * 0.45 + 0.2, 0, 1);
      px[q * 4] = lerp(lite[0], dark[0], t); px[q * 4 + 1] = lerp(lite[1], dark[1], t); px[q * 4 + 2] = lerp(lite[2], dark[2], t); px[q * 4 + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function buildTextures() {
    var w = 512, h = 256, d1 = makeDensity(11, w, h), d2 = makeDensity(47, w, h);
    tex.a = makeCloud(d1, w, h, [7, 11, 20], [62, 78, 108], 0.30, 0.52);
    tex.b = makeCloud(d2, w, h, [4, 7, 14], [42, 56, 84], 0.27, 0.50);
    tex.flash = makeCloud(d1, w, h, [70, 92, 132], [232, 242, 255], 0.30, 0.52);
  }

  /* ---------- fixed things, made once from fixed seeds ---------- */
  var NC = 22;
  var bark = [], blobs = [], fringe = [], twigs = [], grass = [], drops = [], blades = [], crackPts = [], bolts = {};
  function buildFixed() {
    var r = rng(5), i;
    for (i = 0; i < 520; i++) bark.push({ x: r() * 2 - 1, y: -2500 + r() * 2560, len: 50 + r() * 190, w: 1.5 + r() * 3.5, d: r() < 0.6, wob: (r() - 0.5) * 14 });
    r = rng(8);
    for (i = 0; i < 64; i++) {
      var x = -620 + r() * 1700, floor = -1668 - Math.max(0, x - 150) * 0.22 - Math.abs(r() - 0.5) * 30;
      var y = floor - Math.pow(r(), 1.5) * 760;
      blobs.push({ x: x, y: y, r: 78 + r() * 96, ph: r() * 6.28, sh: r(), depth: (y - floor) / -760 });
    }
    blobs.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < 70; i++) { var fx = -600 + r() * 1650; fringe.push({ x: fx, y: -1640 - Math.max(0, fx - 150) * 0.22 + (r() - 0.5) * 50, a: r() * 6.28, s: 13 + r() * 12, ph: r() * 6.28 }); }
    r = rng(13);
    [[330, -1, 70], [470, 1, 46], [700, -1, 92], [845, -1, 54], [960, -1, 110], [1035, 1, 60], [1072, -1, 96], [1088, -1, 60]].forEach(function (t, n) {
      var lv = [], m = 3 + (n % 3);
      for (var j = 0; j < m; j++) lv.push({ u: 0.45 + 0.55 * (j + 1) / m, side: j % 2 ? 1 : -1, s: 15 + r() * 10, ph: r() * 6.28 });
      twigs.push({ lx: t[0], dir: t[1], len: t[2], ang: (r() - 0.5) * 0.5 + 0.35, leaves: lv });
    });
    r = rng(21);
    for (i = 0; i < 420; i++) grass.push({ x: -900 + r() * 2700, h: 16 + r() * 40, ph: r() * 6.28, s: r() });
    for (i = 0; i < 300; i++) drops.push({ a: r(), b: r(), v: 0.75 + r() * 0.5, len: 14 + r() * 16, near: i < 110 });
    for (i = 0; i < 520; i++) blades.push({ x: r() * 2 - 1, z: 60 * Math.pow(r(), 1.8), h: 0.5 + r() * 0.9, ph: r() * 6.28 });
    /* the split: a jagged line across the grain, from the top of the branch near the trunk */
    r = rng(77);
    for (i = 0; i <= NC; i++) {
      var u = i / NC, lx = lerp(G.CR0, G.CR1, u), top = bc(lx) - hh(lx), bot = bc(lx) + hh(lx), mid = i > 0 && i < NC;
      /* wood splits along the grain: long shallow runs, then a short step down */
      crackPts.push([lx + (mid ? (r() - 0.5) * 6 : 0), lerp(top, bot, (Math.floor(u * 5.999) + smooth((u * 6 % 1 - 0.72) / 0.28)) / 6 * 0.9 + u * 0.1) + (mid ? (r() - 0.5) * 3 : 0)]);
    }
  }
  /* the branch, in its own frame: x from the joint, y from the centre line */
  function bc(lx) { return -0.00004 * lx * lx; }
  function hh(lx) { return lerp(31, 11, clamp(lx / G.L, 0, 1)) + 2.2 * Math.sin(lx * 0.031) + 24 * Math.exp(-Math.max(0, lx) / 34); }
  function stepAt(x) { return x < 120 ? 12 : 40; }

  /* ---------- wind, lightning ---------- */
  function wind(st) { return 0.55 + 0.25 * Math.sin(st * 0.7) + 0.2 * Math.sin(st * 1.9 + 2); }
  function gust(st) { return Math.pow(Math.max(0, Math.sin(st * 1.64 + 0.6)), 6); }
  var FILM_STRIKES = [0, 7.6, 12.8, 21.0, 27.2, 33.4, 39.2, 45.6];
  function strikeTime(n) { return n < FILM_STRIKES.length ? FILM_STRIKES[n] : 52 + 7 * (n - FILM_STRIKES.length) + 1.6 * h1(n * 3.1); }
  function strike(st) {
    var n = 0;
    if (st >= 52) n = FILM_STRIKES.length + Math.max(0, Math.floor((st - 52) / 7) - 1);
    var best = -1;
    for (var i = n; i < n + 12; i++) { if (strikeTime(i) <= st) best = i; else break; }
    if (best < 0) return { idx: -1, age: 99 };
    return { idx: best, age: st - strikeTime(best) };
  }
  function flashAt(age) {
    if (age < 0) return 0;
    if (age < 0.04) return age / 0.04;
    if (age < 0.14) return lerp(1, 0.12, (age - 0.04) / 0.10);
    if (age < 0.19) return lerp(0.12, 0.72, (age - 0.14) / 0.05);
    if (age < 0.55) return 0.72 * Math.pow(1 - (age - 0.19) / 0.36, 2);
    return 0;
  }
  function softFlashAt(age) { return age < 0 || age > 0.9 ? 0 : 0.30 * Math.sin(age / 0.9 * Math.PI); }
  function grow(r, out, x0, y0, x1, y1, disp, width, depth) {
    var pts = [[x0, y0], [x1, y1]];
    for (var it = 0; it < 6; it++) {
      var nx = [pts[0]];
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2 + (r() - 0.5) * disp, my = (a[1] + b[1]) / 2 + (r() - 0.5) * disp * 0.35;
        nx.push([mx, my], b);
        if (depth < 2 && it >= 1 && it <= 3 && r() < 0.13) {
          var len = (y1 - y0) * (0.18 + r() * 0.22), ang = (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.5);
          grow(r, out, mx, my, mx + Math.sin(ang) * len, my + Math.cos(ang) * len, len * 0.22, width * 0.5, depth + 1);
        }
      }
      pts = nx; disp *= 0.52;
    }
    out.push({ pts: pts, w: width });
  }
  function boltFor(idx) {
    if (bolts[idx]) return bolts[idx];
    var r = rng(900 + idx * 7), out = [], x0 = 0.30 + 0.55 * r(), y1 = 0.52 + 0.3 * r();
    grow(r, out, x0, -0.04, x0 + (r() - 0.5) * 0.22, y1, 0.16, 1, 0);
    return (bolts[idx] = out);
  }
  function drawBolt(idx, a, clipFrac) {
    var b = boltFor(idx), passes = [[11, 0.07], [5, 0.18], [1.7, 0.95]];
    ctx.save();
    if (clipFrac < 1) { ctx.beginPath(); ctx.rect(0, 0, W, H * 0.9 * clipFrac); ctx.clip(); }
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var p = 0; p < 3; p++) {
      ctx.strokeStyle = 'rgba(214,230,255,' + passes[p][1] * a + ')';
      for (var i = 0; i < b.length; i++) {
        ctx.lineWidth = passes[p][0] * b[i].w * k; ctx.beginPath();
        for (var j = 0; j < b[i].pts.length; j++) { var q = b[i].pts[j]; if (j) ctx.lineTo(q[0] * W, q[1] * H); else ctx.moveTo(q[0] * W, q[1] * H); }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------- drawing, back to front ---------- */
  function sky(flash) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgb(' + (5 + 40 * flash | 0) + ',' + (8 + 48 * flash | 0) + ',' + (18 + 70 * flash | 0) + ')');
    g.addColorStop(1, 'rgb(' + (17 + 50 * flash | 0) + ',' + (29 + 58 * flash | 0) + ',' + (50 + 76 * flash | 0) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function band(img, alpha, scale, speed, y, bh, st, comp) {
    if (alpha < 0.01) return;
    var bw = Math.round(bh * 2 * scale), ox = Math.round(((st * speed * k) % bw + bw) % bw);
    ctx.globalAlpha = clamp(alpha, 0, 1); if (comp) ctx.globalCompositeOperation = comp;
    /* the texture is drawn inset by one texel so the tile edges never show as a line */
    for (var x = ox - bw; x < W; x += bw) ctx.drawImage(img, 1, 0, img.width - 2, img.height, x, Math.round(y), bw, Math.round(bh));
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function clouds(st, flash, yoff) {
    band(tex.b, 0.92, 1.7, 20, -0.22 * H + yoff, 1.05 * H, st);
    band(tex.a, 0.90, 1.25, 44, 0.04 * H + yoff, 1.06 * H, st);
    if (flash > 0.01) band(tex.flash, flash * 0.85, 1.25, 44, 0.04 * H + yoff, 1.06 * H, st, 'lighter');
  }
  function rain(st, near, flash, camShift) {
    var w = wind(st) + gust(st) * 0.6, slant = 0.30 + 0.34 * w, spanY = H + 80, spanX = W + 200;
    ctx.strokeStyle = near ? 'rgba(206,226,244,' + (0.34 + flash * 0.3) + ')' : 'rgba(160,190,220,' + (0.16 + flash * 0.2) + ')';
    ctx.lineWidth = (near ? 1.35 : 0.9) * k; ctx.beginPath();
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i]; if (d.near !== near) continue;
      var v = d.v * (near ? 1500 : 980) * k, len = d.len * (near ? 1.3 : 0.8) * k;
      var y = ((d.b * spanY + v * st + camShift * (near ? 0.9 : 0.5)) % spanY + spanY) % spanY - 40;
      var x = ((d.a * spanX + v * slant * st) % spanX + spanX) % spanX - 100;
      ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y - len);
    }
    ctx.stroke();
  }
  function leafPath(s) { ctx.beginPath(); ctx.moveTo(0, -s); ctx.bezierCurveTo(s * 0.62, -s * 0.5, s * 0.62, s * 0.45, 0, s); ctx.bezierCurveTo(-s * 0.62, s * 0.45, -s * 0.62, -s * 0.5, 0, -s); }
  function flyingLeaves(st) {
    for (var i = 0; i < 12; i++) {
      var p = 2.2 + h1(i) * 2.2, u = fract(st / p + h1(i + 40)), x = (-0.1 + u * 1.2) * W, y = (h1(i + 80) * 0.8 + 0.08 * Math.sin(u * 7 + i)) * H + u * 80 * k;
      ctx.save(); ctx.translate(x, y); ctx.rotate(st * (3 + i % 4) + i); ctx.scale(1, 0.55 + 0.45 * Math.sin(st * 5 + i));
      leafPath((6 + h1(i + 7) * 6) * k); ctx.fillStyle = sh(i % 3 ? [36, 66, 40] : [70, 80, 40], 0.9); ctx.fill(); ctx.restore();
    }
  }
  function trunkHalf(y) { return 70 + 12 * (1 + y / 2500) + 60 * Math.exp(y / 90) + 3 * Math.sin(y / 37); }
  function drawTrunk(y0, y1) {
    var y, hw;
    ctx.beginPath();
    for (y = y0; y <= y1; y += 30) { hw = trunkHalf(y); if (y === y0) ctx.moveTo(-hw, y); else ctx.lineTo(-hw, y); }
    for (y = y1; y >= y0; y -= 30) { hw = trunkHalf(y); ctx.lineTo(hw + 2 * Math.sin(y / 23), y); }
    ctx.closePath();
    var g = ctx.createLinearGradient(-90, 0, 100, 0);
    g.addColorStop(0, sh([104, 82, 70])); g.addColorStop(0.3, sh([80, 60, 48])); g.addColorStop(1, sh([40, 29, 25]));
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip(); ctx.lineCap = 'round';
    for (var i = 0; i < bark.length; i++) {
      var b = bark[i]; if (b.y > y1 || b.y + b.len < y0) continue;
      hw = trunkHalf(b.y);
      ctx.strokeStyle = b.d ? sh([30, 21, 18], 0.55) : sh([132, 106, 88], 0.30); ctx.lineWidth = b.w;
      ctx.beginPath(); ctx.moveTo(b.x * hw, b.y); ctx.quadraticCurveTo(b.x * hw + b.wob, b.y + b.len / 2, b.x * hw + b.wob * 0.4, b.y + b.len); ctx.stroke();
    }
    /* the cold light down the wet side */
    g = ctx.createLinearGradient(-90, 0, -48, 0);
    g.addColorStop(0, 'rgba(160,190,255,' + (0.10 + 0.22 * light.flash) + ')'); g.addColorStop(1, 'rgba(160,190,255,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(-140, y0, 140, y1 - y0);
    ctx.restore();
  }
  function drawHollow(S) {
    var h = G.HOL;
    ctx.fillStyle = sh([122, 96, 76]); ctx.beginPath(); ctx.ellipse(h.x, h.y, h.rx + 9, h.ry + 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = sh([52, 38, 32]); ctx.beginPath(); ctx.ellipse(h.x + 2, h.y + 2, h.rx + 3, h.ry + 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgb(6,5,8)'; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.rx, h.ry, 0, 0, TAU); ctx.fill();
    var o = S.owl;
    if (o && o.open > 0.01) {
      var out = o.body || 0, r = 34 + 5 * out;
      /* the amber glow of the eyes in the dark */
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(h.x, h.y - 6, 4, h.x, h.y - 6, 120);
      g.addColorStop(0, 'rgba(255,170,40,' + 0.30 * o.open * (1 - 0.6 * out) + ')'); g.addColorStop(1, 'rgba(255,170,40,0)');
      ctx.fillStyle = g; ctx.fillRect(h.x - 130, h.y - 130, 260, 260); ctx.restore();
      ctx.save();
      if (out < 0.6) { ctx.beginPath(); ctx.ellipse(h.x, h.y, h.rx, h.ry, 0, 0, TAU); ctx.clip(); }
      ctx.translate(h.x + out * 6, h.y - 6 - out * 10); ctx.scale(r, r);
      var keep = light.night; light.night = [0.80, 0.80, 0.86];
      C.owl(ctx, { t: S.st, open: o.open, turn: o.turn || 0, body: out, look: o.look, pupil: o.pupil });
      light.night = keep;
      ctx.restore();
    }
  }
  function drawCanopy(st, y0, y1) {
    var w = wind(st), g = gust(st), i;
    for (i = 0; i < blobs.length; i++) {
      var b = blobs[i]; if (b.y - b.r > y1 || b.y + b.r < y0) continue;
      var ox = Math.sin(st * 2.1 + b.ph) * 7 + (w + g) * 12, oy = Math.cos(st * 1.7 + b.ph) * 4;
      var col = b.depth > 0.6 ? [16, 30, 24] : b.sh < 0.4 ? [22, 42, 30] : [30, 54, 36];
      ctx.fillStyle = sh(col); ctx.beginPath();
      for (var j = 0; j <= 30; j++) {
        var a = j / 30 * TAU, rr = b.r * (0.86 + 0.09 * Math.sin(a * 5 + b.ph + st * 1.3) + 0.05 * Math.sin(a * 11 + b.ph * 2));
        var px = b.x + ox + Math.cos(a) * rr, py = b.y + oy + Math.sin(a) * rr * 0.82;
        if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.fill();
    }
    for (i = 0; i < fringe.length; i++) {
      var f = fringe[i]; if (f.y - 40 > y1 || f.y + 40 < y0) continue;
      ctx.save(); ctx.translate(f.x + (w + g) * 12, f.y); ctx.rotate(f.a + Math.sin(st * 6 + f.ph) * 0.5 + 0.9 * w);
      leafPath(f.s); ctx.fillStyle = sh(i % 3 ? [34, 62, 40] : [48, 78, 44]); ctx.fill(); ctx.restore();
    }
  }
  function branchPath(lx0, lx1, alongCrack) {
    var x, i;
    ctx.beginPath();
    if (alongCrack === 'piece') {
      ctx.moveTo(crackPts[0][0], crackPts[0][1]);
      for (x = Math.ceil(crackPts[0][0] / 40) * 40; x <= lx1; x += 40) ctx.lineTo(x, bc(x) - hh(x));
      ctx.lineTo(lx1 + 8, bc(lx1));
      for (x = lx1; x >= crackPts[NC][0]; x -= 40) ctx.lineTo(x, bc(x) + hh(x));
      for (i = NC; i >= 0; i--) ctx.lineTo(crackPts[i][0], crackPts[i][1]);
    } else if (alongCrack === 'stump') {
      ctx.moveTo(lx0, bc(lx0) - hh(lx0));
      for (x = lx0; x < crackPts[0][0]; x += 12) ctx.lineTo(x, bc(x) - hh(x));
      for (i = 0; i <= NC; i++) ctx.lineTo(crackPts[i][0], crackPts[i][1]);
      for (x = Math.floor(crackPts[NC][0] / 12) * 12; x >= lx0; x -= stepAt(x)) ctx.lineTo(x, bc(x) + hh(x));
      ctx.lineTo(lx0, bc(lx0) + hh(lx0));
    } else {
      ctx.moveTo(lx0, bc(lx0) - hh(lx0));
      for (x = lx0; x <= lx1; x += stepAt(x)) ctx.lineTo(x, bc(x) - hh(x));
      ctx.lineTo(lx1 + 8, bc(lx1));
      for (x = lx1; x >= lx0; x -= stepAt(x - 1)) ctx.lineTo(x, bc(x) + hh(x));
      ctx.lineTo(lx0, bc(lx0) + hh(lx0));
    }
    ctx.closePath();
  }
  function paintBranch() {
    var g = ctx.createLinearGradient(0, -34, 0, 34);
    g.addColorStop(0, sh([112, 88, 72])); g.addColorStop(0.45, sh([78, 58, 46])); g.addColorStop(1, sh([36, 26, 22]));
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.lineCap = 'round';
    for (var i = 0; i < 46; i++) {
      var x = h1(i + 300) * G.L, y = bc(x) + (h1(i + 350) * 2 - 1) * hh(x) * 0.8, len = 30 + h1(i + 400) * 80;
      ctx.strokeStyle = i % 2 ? sh([28, 20, 17], 0.5) : sh([136, 110, 92], 0.28); ctx.lineWidth = 1.5 + h1(i + 450) * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len / 2, y + (h1(i) - 0.5) * 6 + bc(x + len / 2) - bc(x), x + len, y + bc(x + len) - bc(x)); ctx.stroke();
    }
    /* wet shine along the top */
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(170,200,255,' + (0.20 + 0.55 * light.flash) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); for (x = 0; x <= G.L; x += stepAt(x)) { if (x) ctx.lineTo(x, bc(x) - hh(x) + 3); else ctx.moveTo(x, bc(x) - hh(x) + 3); } ctx.stroke();
    /* the collar of bark where the branch leaves the trunk */
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = sh([28, 20, 17], 0.55); ctx.lineWidth = 3;
    for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(4 + i * 13, bc(0), 9, hh(4 + i * 13) + 4, 0, -1.25, 1.25); ctx.stroke(); }
    ctx.restore();
  }
  function drawTwigs(st, from) {
    var w = wind(st) + gust(st);
    for (var i = 0; i < twigs.length; i++) {
      var t = twigs[i]; if (t.lx < from) continue;
      var bx = t.lx, by = bc(bx) + t.dir * hh(bx) * 0.7, a = (t.dir < 0 ? -Math.PI / 2 : Math.PI / 2) + t.ang + 0.10 * w * Math.sin(st * 4 + i);
      var ex = bx + Math.cos(a) * t.len, ey = by + Math.sin(a) * t.len;
      ctx.strokeStyle = sh([60, 44, 36]); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      for (var j = 0; j < t.leaves.length; j++) {
        var l = t.leaves[j], px = lerp(bx, ex, l.u), py = lerp(by, ey, l.u);
        ctx.save(); ctx.translate(px, py); ctx.rotate(a + l.side * 1.0 + Math.sin(st * 7 + l.ph) * 0.45 * w + 0.5 * w); ctx.translate(0, -l.s);
        leafPath(l.s); ctx.fillStyle = sh(j % 2 ? [40, 74, 44] : [56, 92, 50]); ctx.fill();
        ctx.strokeStyle = sh([24, 44, 28], 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -l.s); ctx.lineTo(0, l.s); ctx.stroke();
        ctx.restore();
      }
    }
  }
  function crackPoly(pts, m, wf, extra) {
    var i, L = [], R = [], d = 0, ds = [0];
    for (i = m - 1; i >= 0; i--) { d += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); ds[m - i] = d; }
    for (i = 0; i <= m; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(m, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      var w = (ds[m - i] * wf + (i < m ? extra : 0)) / 2, nx = -dy / l, ny = dx / l;
      L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1] - 2);
    for (i = 1; i <= m; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (i = m; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1] - (i === 0 ? 2 : 0));
    ctx.closePath();
    return { L: L, R: R };
  }
  function drawCrack(c, open) {
    if (c <= 0.001) return;
    var f = c * NC, n = Math.floor(f), pts = [], i;
    for (i = 0; i <= Math.min(n, NC); i++) pts.push(crackPts[i]);
    if (n < NC && f - n > 0.02) pts.push([lerp(crackPts[n][0], crackPts[n + 1][0], f - n), lerp(crackPts[n][1], crackPts[n + 1][1], f - n)]);
    var m = pts.length - 1; if (m < 1) return;
    /* pale torn wood, then the dark of the split inside it */
    crackPoly(pts, m, open, 4.5); ctx.fillStyle = sh([226, 196, 150]); ctx.fill();
    ctx.strokeStyle = sh([120, 90, 62], 0.9); ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.stroke();
    var e = crackPoly(pts, m, open, 1.6); ctx.fillStyle = 'rgb(9,5,6)'; ctx.fill();
    /* fibres still holding across the split */
    ctx.strokeStyle = sh([240, 214, 170], 0.9); ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    for (i = Math.max(1, m - 5); i < m; i++) {
      ctx.beginPath(); ctx.moveTo(e.L[i][0] - 2, e.L[i][1] - 1); ctx.lineTo(e.R[i][0] + 3, e.R[i][1] + 2 + (i % 2) * 3); ctx.stroke();
    }
    /* splinters lifting along the edge */
    ctx.fillStyle = sh([236, 208, 164]);
    for (i = 2; i < m; i += 4) {
      var q = e.L[i], h2 = 4 + (i % 3) * 2 + open * 40;
      ctx.beginPath(); ctx.moveTo(q[0] - 3, q[1]); ctx.lineTo(q[0] + 4, q[1] - h2); ctx.lineTo(q[0] + 5, q[1] + 1); ctx.closePath(); ctx.fill();
    }
  }
  function tornFace(side) {
    /* the pale wood where it tore, with long splinters */
    var i, d = side === 'stump' ? 1 : -1;
    ctx.beginPath();
    for (i = 0; i <= NC; i++) { if (i) ctx.lineTo(crackPts[i][0], crackPts[i][1]); else ctx.moveTo(crackPts[i][0], crackPts[i][1]); }
    for (i = NC; i >= 0; i--) ctx.lineTo(crackPts[i][0] - d * (12 + 5 * (i % 3)), crackPts[i][1] - d * (4 + (i % 2) * 4));
    ctx.closePath(); ctx.fillStyle = sh([214, 182, 136]); ctx.fill();
    ctx.fillStyle = sh([238, 212, 168]);
    for (i = 1; i < NC; i += 1) {
      var len = 10 + 16 * h1(i * 3.7 + (d > 0 ? 0 : 5)), q = crackPts[i];
      ctx.beginPath(); ctx.moveTo(q[0] - d * 3, q[1] - 3); ctx.lineTo(q[0] + d * len, q[1] + d * (2 + len * 0.25)); ctx.lineTo(q[0] - d * 2, q[1] + 3); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = sh([130, 98, 66], 0.8); ctx.lineWidth = 1;
    for (i = 0; i < NC; i += 2) { ctx.beginPath(); ctx.moveTo(crackPts[i][0] - d * 2, crackPts[i][1]); ctx.lineTo(crackPts[i][0] - d * (11 + 4 * (i % 3)), crackPts[i][1] - d * 3); ctx.stroke(); }
  }
  function box(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawLadder(S, front) {
    var LT = G.LT0 - S.rungs * G.RUNG, x = G.LADX, sway = (S.ladderSway || 0) * Math.sin(S.st * 1.3) * 5, i, y;
    ctx.save(); ctx.translate(sway * clamp((0 - LT) / 900, 0, 1), 0);
    if (!front) {
      /* the dashed marks: the eight rungs still to go */
      if (S.ghost > 0) {
        ctx.setLineDash([9, 8]); ctx.lineWidth = 2.5;
        for (i = 1; i <= 8; i++) {
          y = G.LT0 - G.RAIL - i * G.RUNG; if (i <= S.rungs + 0.01) continue;
          var a = S.ghost >= i ? 1 : clamp(S.ghost - (i - 1), 0, 1);
          if (a <= 0) continue;
          ctx.strokeStyle = 'rgba(255,255,255,' + 0.50 * a + ')';
          ctx.beginPath(); ctx.moveTo(x - 132, y); ctx.lineTo(x + 132, y); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,' + 0.85 * a + ')'; ctx.font = '700 19px "Space Grotesk", system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText(String(i), x - 144, y + 1);
        }
        ctx.setLineDash([]);
      }
      /* the fixed lower ladder, from the ground */
      var topFixed = G.LT0 + 70;
      ctx.strokeStyle = sh([196, 150, 52]); ctx.lineWidth = 9; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(x - 52, 0); ctx.lineTo(x - 52, topFixed); ctx.moveTo(x + 52, 0); ctx.lineTo(x + 52, topFixed); ctx.stroke();
      ctx.strokeStyle = sh([150, 152, 160]); ctx.lineWidth = 5;
      ctx.beginPath(); for (y = -30; y > topFixed; y -= 40) { ctx.moveTo(x - 52, y); ctx.lineTo(x + 52, y); } ctx.stroke();
      /* the sliding upper ladder */
      ctx.strokeStyle = sh([236, 186, 66]); ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(x - 40, LT + 430); ctx.lineTo(x - 40, LT); ctx.moveTo(x + 40, LT + 430); ctx.lineTo(x + 40, LT); ctx.stroke();
      ctx.strokeStyle = sh([190, 192, 200]); ctx.lineWidth = 5;
      ctx.beginPath(); for (i = 1; i <= 10; i++) { ctx.moveTo(x - 40, LT + i * 40); ctx.lineTo(x + 40, LT + i * 40); } ctx.stroke();
      /* the lock, where the two ladders meet */
      var lk = S.latch || { open: 0, check: 0 };
      ctx.fillStyle = sh([54, 58, 70]); ctx.fillRect(x + 46, topFixed - 2, 40, 30);
      ctx.fillStyle = sh([170, 174, 184]); ctx.fillRect(x + 30 + lk.open * 16, topFixed + 9, 22, 8);
      var lc = lk.check > 0 ? [120, 255, 150] : lk.open > 0.5 ? [255, 176, 40] : [70, 200, 110];
      ctx.fillStyle = 'rgb(' + lc.join(',') + ')'; ctx.beginPath(); ctx.arc(x + 74, topFixed + 13, 5, 0, TAU); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(x + 74, topFixed + 13, 0, x + 74, topFixed + 13, 26 + 30 * lk.check);
      g.addColorStop(0, 'rgba(' + lc.join(',') + ',' + (0.5 + 0.4 * lk.check) + ')'); g.addColorStop(1, 'rgba(' + lc.join(',') + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x + 14, topFixed - 47, 120, 120); ctx.restore();
      /* the basket: back rail and the blanket */
      ctx.strokeStyle = sh([214, 166, 58]); ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 150, LT); ctx.lineTo(x - 150, LT - 62); ctx.lineTo(x + 150, LT - 62); ctx.lineTo(x + 150, LT); ctx.stroke();
      ctx.beginPath(); for (i = -2; i <= 2; i++) { ctx.moveTo(x + i * 50, LT); ctx.lineTo(x + i * 50, LT - 62); } ctx.stroke();
      ctx.fillStyle = sh([226, 208, 190]); ctx.beginPath(); ctx.moveTo(x - 142, LT); ctx.quadraticCurveTo(x, LT - 40, x + 142, LT); ctx.closePath(); ctx.fill();
    } else {
      /* the basket: floor, front lip, lamp */
      ctx.fillStyle = sh([112, 86, 40]); ctx.fillRect(x - 156, LT - 2, 312, 14);
      ctx.fillStyle = sh([236, 186, 66]); ctx.beginPath(); ctx.moveTo(x - 156, LT - 26); ctx.lineTo(x + 156, LT - 26); ctx.lineTo(x + 150, LT + 4); ctx.lineTo(x - 150, LT + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = sh([150, 110, 40], 0.9); ctx.fillRect(x - 152, LT - 8, 304, 4);
      /* the lift's own screen, on an arm beside the basket: every word printed to the lift shows here */
      var sg = S.sign;
      if (sg && sg.on > 0.01) {
        var sx = x - 326, sy = LT - 106, sw = 154, sH = 124, n;
        ctx.save(); ctx.globalAlpha = sg.on;
        ctx.strokeStyle = sh([90, 92, 104]); ctx.lineWidth = 6; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(sx + sw, LT - 16); ctx.lineTo(x - 150, LT - 16); ctx.stroke();
        ctx.fillStyle = sh([66, 70, 84]); box(sx - 6, sy - 6, sw + 12, sH + 12, 10); ctx.fill();
        ctx.fillStyle = 'rgb(5,12,11)'; box(sx, sy, sw, sH, 5); ctx.fill();
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = '700 12px "Space Grotesk", system-ui, sans-serif'; ctx.fillStyle = 'rgba(160,180,200,0.85)'; ctx.fillText('LIFT', sx + 11, sy + 14);
        ctx.fillStyle = sg.lines && sg.lines.length ? 'rgb(120,255,150)' : 'rgba(120,255,150,0.25)'; ctx.beginPath(); ctx.arc(sx + sw - 14, sy + 14, 3.5, 0, TAU); ctx.fill();
        ctx.font = '700 21px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
        for (n = 0; sg.lines && n < sg.lines.length; n++) {
          var ln = sg.lines[n], fw = sg.flash || 0, hot = Math.max(fw, ln.hot || 0);
          ctx.globalAlpha = sg.on * clamp(ln.a == null ? 1 : ln.a, 0, 1);
          ctx.fillStyle = 'rgb(' + Math.round(lerp(120, 240, hot)) + ',255,' + Math.round(lerp(150, 230, hot)) + ')';
          ctx.fillText(ln.text, sx + 13, sy + 39 + n * 23);
        }
        if (sg.lines && sg.lines.length) {
          ctx.globalAlpha = sg.on; ctx.globalCompositeOperation = 'lighter';
          g = ctx.createRadialGradient(sx + sw / 2, sy + sH / 2, 10, sx + sw / 2, sy + sH / 2, 150);
          g.addColorStop(0, 'rgba(90,255,140,' + (0.10 + 0.16 * (sg.flash || 0)) + ')'); g.addColorStop(1, 'rgba(90,255,140,0)');
          ctx.fillStyle = g; ctx.fillRect(sx - 80, sy - 90, sw + 160, sH + 180);
        }
        ctx.restore();
      }
      var lx = x + 156, ly = LT - 104, fl = 0.86 + 0.14 * Math.sin(S.st * 23) * Math.sin(S.st * 7.3);
      ctx.strokeStyle = sh([90, 92, 104]); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(lx, LT - 20); ctx.lineTo(lx, ly + 10); ctx.stroke();
      ctx.fillStyle = 'rgb(255,232,170)'; ctx.beginPath(); ctx.arc(lx, ly, 10, 0, TAU); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 230);
      g.addColorStop(0, 'rgba(255,200,110,' + 0.55 * fl + ')'); g.addColorStop(0.25, 'rgba(255,170,70,' + 0.16 * fl + ')'); g.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.fillStyle = g; ctx.fillRect(lx - 230, ly - 230, 460, 460); ctx.restore();
    }
    ctx.restore();
  }
  function drawGround(S, x0, x1) {
    var st = S.st, i, x;
    /* the far hills, and one lit window a long way off */
    ctx.fillStyle = sh([14, 22, 40]); ctx.beginPath(); ctx.moveTo(x0, 40);
    for (x = x0; x <= x1 + 40; x += 40) ctx.lineTo(x, -96 - 46 * Math.sin(x * 0.0031 + 1) - 22 * Math.sin(x * 0.0083));
    ctx.lineTo(x1 + 40, 40); ctx.closePath(); ctx.fill();
    var hx = 1010, hy = -96 - 46 * Math.sin(hx * 0.0031 + 1) - 22 * Math.sin(hx * 0.0083);
    ctx.fillStyle = 'rgb(7,10,18)'; ctx.fillRect(hx - 15, hy - 16, 30, 18); ctx.beginPath(); ctx.moveTo(hx - 19, hy - 16); ctx.lineTo(hx, hy - 30); ctx.lineTo(hx + 19, hy - 16); ctx.fill();
    ctx.fillStyle = 'rgb(255,206,120)'; ctx.fillRect(hx - 4, hy - 11, 7, 7);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; var g = ctx.createRadialGradient(hx, hy - 8, 0, hx, hy - 8, 44); g.addColorStop(0, 'rgba(255,190,100,0.45)'); g.addColorStop(1, 'rgba(255,190,100,0)'); ctx.fillStyle = g; ctx.fillRect(hx - 44, hy - 52, 88, 88); ctx.restore();
    /* the field */
    g = ctx.createLinearGradient(0, -20, 0, 400); g.addColorStop(0, sh([22, 40, 30])); g.addColorStop(1, sh([8, 14, 12]));
    ctx.fillStyle = g; ctx.fillRect(x0, -14, x1 - x0, 600);
  }
  function drawGrass(S, x0, x1) {
    var st = S.st, i, w = wind(st) + gust(st);
    /* the dark where the trunk meets the ground */
    var g = ctx.createRadialGradient(0, 6, 10, 0, 6, 260); g.addColorStop(0, 'rgba(2,6,6,0.75)'); g.addColorStop(1, 'rgba(2,6,6,0)');
    ctx.save(); ctx.translate(0, 6); ctx.scale(1, 0.16); ctx.translate(0, -6); ctx.fillStyle = g; ctx.fillRect(-260, -254, 520, 520); ctx.restore();
    ctx.lineCap = 'round';
    for (i = 0; i < grass.length; i++) {
      var b = grass[i]; if (b.x < x0 - 20 || b.x > x1 + 20) continue;
      var lean = (0.5 + 0.5 * Math.sin(st * 3.2 + b.ph + b.x * 0.01)) * w * b.h * 0.7;
      ctx.strokeStyle = sh(b.s < 0.5 ? [30, 56, 36] : [44, 74, 44]); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(b.x, -8 + b.s * 34); ctx.quadraticCurveTo(b.x + lean * 0.3, -8 + b.s * 34 - b.h * 0.6, b.x + lean, -8 + b.s * 34 - b.h); ctx.stroke();
    }
  }
  function drawLadderFoot() {
    var x = G.LADX;
    ctx.fillStyle = sh([58, 62, 76]); ctx.fillRect(x - 96, -40, 192, 30);
    ctx.fillStyle = sh([196, 150, 52]); ctx.fillRect(x - 96, -44, 192, 6);
    ctx.fillStyle = sh([24, 24, 30]); ctx.beginPath(); ctx.arc(x - 66, -6, 15, 0, TAU); ctx.arc(x + 66, -6, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = sh([120, 124, 136]); ctx.beginPath(); ctx.arc(x - 66, -6, 5, 0, TAU); ctx.arc(x + 66, -6, 5, 0, TAU); ctx.fill();
  }

  /* where a point on the branch is in the world, for a given sag and fall */
  function branchXf(S) {
    var sag = (0.010 + 0.040 * S.crack) + gust(S.st) * (0.012 + 0.016 * S.crack) + (S.dip || 0);
    var fp = S.fp || 0, phi = 1.25 * smooth(fp * 1.3), drop = 1700 * Math.pow(Math.max(0, fp - 0.25) / 0.75, 2);
    return { sag: sag, phi: phi, drop: drop, hx: crackPts[NC][0], hy: crackPts[NC][1] };
  }
  function onBranch(xf, lx, ly, piece) {
    var x = lx, y = ly, c, s;
    if (piece && xf.phi > 0) { c = Math.cos(xf.phi); s = Math.sin(xf.phi); var dx = x - xf.hx, dy = y - xf.hy; x = xf.hx + dx * c - dy * s; y = xf.hy + dx * s + dy * c + xf.drop; }
    c = Math.cos(xf.sag); s = Math.sin(xf.sag);
    return { x: G.JX + x * c - y * s, y: G.BY + x * s + y * c };
  }
  function blinkAt(t, seed) { var p = 3.3 + seed, u = fract(t / p + seed * 0.37) * p; return u < 0.13 ? Math.sin(u / 0.13 * Math.PI) : 0; }
  function charPose(S, which) {
    var st = S.st, fp = S.fp || 0, o = (which === 'kit' ? S.kit : S.pup) || {}, w = wind(st), g = gust(st);
    var grip = 1 - smooth((fp - 0.15) / 0.10), ph = which === 'kit' ? 0 : 1.9;
    var p = {
      t: st, fear: 1, grip: grip, wind: w + g, name: which === 'kit' ? 'BILLY' : 'BOBBY',
      look: o.look || [0, 0], mouth: Math.max(o.mouth || 0, fp > 0.12 ? 1 : 0), blink: o.blink != null ? o.blink : (fp > 0 ? 0 : blinkAt(st, which === 'kit' ? 0.2 : 0.9)),
      bodySway: Math.sin(st * 2.3 + ph + 0.6) * 0.07 + g * 0.08,
      reach: which === 'kit' ? smooth((fp - 0.20) / 0.26) : 0, tears: 1
    };
    if (o.earFlat != null) p.earFlat = o.earFlat;
    if (o.grip != null) p.grip = o.grip;
    if (o.fear != null) p.fear = o.fear;
    if (o.tears != null) p.tears = o.tears;
    if (o.joy != null) p.joy = o.joy;
    /* safe in the basket: paws down, no more swinging from the branch */
    if (o.down != null) { p.down = o.down; p.bodySway *= 1 - 0.85 * o.down; }
    if (o.wave != null) p.wave = o.wave;
    if (o.hop != null) p.hop = o.hop;
    return p;
  }
  function drawChar(S, xf, which) {
    var lx = (which === 'kit' ? G.KX : G.PX) - G.JX, fp = S.fp || 0, st = S.st, o = (which === 'kit' ? S.kit : S.pup) || {};
    var rel = Math.min(fp, 0.20), xfr = { sag: xf.sag, phi: 1.25 * smooth(rel * 1.3), drop: 0, hx: xf.hx, hy: xf.hy };
    var hp = onBranch(xfr, lx, bc(lx), true), u = clamp((fp - 0.20) / 0.80, 0, 1), ph = which === 'kit' ? 0 : 1.9;
    var sway = (Math.sin(st * 2.3 + ph) * 0.055 + gust(st) * 0.07) * (1 - 0.9 * (o.down || 0)) + (which === 'kit' ? -1 : 1) * 0.5 * u;
    var sc = 1 + (which === 'kit' ? 0.16 : 0.08) * smooth(u * 2);
    var p = charPose(S, which);
    light.lamp = (S.lampOn === 0 ? 0 : 1) * (0.06 + 0.46 * (S.rungs / 8)) * (which === 'kit' ? 0.8 : 1) * (1 - u);
    var dim = S.charDim || 0; light.night = [NIGHT[0] * (1 - 0.78 * dim), NIGHT[1] * (1 - 0.76 * dim), NIGHT[2] * (1 - 0.70 * dim)];
    ctx.save();
    ctx.translate(hp.x + (which === 'kit' ? -70 : 60) * u + (o.dx || 0), hp.y + 1500 * u * u + (o.slip || 0));
    ctx.rotate(sway); ctx.translate(0, 1.95 * G.R * sc); ctx.scale(G.R * sc, G.R * sc);
    p.px = G.R * sc * S.cam.z * k;
    (which === 'kit' ? C.kitten : C.puppy)(ctx, p);
    ctx.restore();
    light.lamp = 0; light.night = NIGHT;
    return hp;
  }

  function toScreen(cam, wx, wy) { return [W / 2 + (wx - cam.x) * cam.z * k, H / 2 + (wy - cam.y) * cam.z * k]; }

  function drawWorld(S) {
    var cam = S.cam, z = cam.z * k, st = S.st, flash = S.flash || 0, i;
    light.flash = flash; light.night = NIGHT; light.lamp = 0;
    var shx = 0, shy = 0;
    if (S.shake > 0) { shx = (h1(Math.floor(st * 60)) - 0.5) * 2 * S.shake * k; shy = (h1(Math.floor(st * 60) + 9) - 0.5) * 2 * S.shake * k; }
    sky(flash);
    clouds(st, flash, clamp((-1164 - cam.y) * 0.05 * k, -0.2 * H, 0.1 * H));
    rain(st, false, flash, -cam.y * z);
    if (S.boltIdx >= 0 && flash > 0.02) drawBolt(S.boltIdx, Math.min(1, flash * 1.6), 1);
    if (S.rewindBolt > 0) drawBolt(4, 0.9, S.rewindBolt);
    /* into the world */
    ctx.save();
    ctx.translate(W / 2 + shx, H / 2 + shy); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
    var y0 = cam.y - H / 2 / z - 60, y1 = cam.y + H / 2 / z + 60, x0 = cam.x - W / 2 / z - 60, x1 = cam.x + W / 2 / z + 60;
    if (y1 > -260) drawGround(S, x0, x1);
    drawCanopy(st, y0, y1);
    drawTrunk(Math.max(-2500, Math.floor(y0 / 30) * 30), Math.min(0, Math.ceil(y1 / 30) * 30));
    drawHollow(S);
    if (y1 > -120) drawLadderFoot();
    drawLadder(S, false);
    if (y1 > -80) drawGrass(S, x0, x1);
    /* the branch */
    var xf = branchXf(S), fp = S.fp || 0;
    ctx.save(); ctx.translate(G.JX, G.BY); ctx.rotate(xf.sag);
    if (fp <= 0) {
      branchPath(0, G.L); paintBranch(); drawTwigs(st, 0);
      drawCrack(S.crack, 0.012 + 0.05 * gust(st) + 0.035 * S.crack + (S.dip || 0) * 2);
    } else {
      branchPath(0, G.L, 'stump'); paintBranch(); tornFace('stump');
      if (xf.drop < 2400) {
        ctx.save(); ctx.translate(0, xf.drop); ctx.translate(xf.hx, xf.hy); ctx.rotate(xf.phi); ctx.translate(-xf.hx, -xf.hy);
        branchPath(0, G.L, 'piece'); paintBranch(); tornFace('piece'); drawTwigs(st, 340);
        ctx.restore();
      }
    }
    ctx.restore();
    /* splashes where the rain hits the branch */
    if (fp <= 0) {
      ctx.strokeStyle = 'rgba(200,222,255,0.5)'; ctx.lineWidth = 1.5;
      for (i = 0; i < 12; i++) {
        var uu = fract(st * 2.6 + i * 0.37), n = Math.floor(st * 2.6 + i * 0.37), lx = h1(n * 7.3 + i) * G.L, pp = onBranch(xf, lx, bc(lx) - hh(lx), false);
        ctx.globalAlpha = 1 - uu; ctx.beginPath(); ctx.moveTo(pp.x - 3 - uu * 7, pp.y - uu * 9); ctx.lineTo(pp.x, pp.y); ctx.lineTo(pp.x + 3 + uu * 7, pp.y - uu * 9); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    /* the two */
    var hk = null, hp = null;
    /* hanging, they are behind the basket's front lip; falling, they pass in front of it */
    var late = fp > 0.2;
    if (!late && S.chars !== 0) { hp = drawChar(S, xf, 'pup'); hk = drawChar(S, xf, 'kit'); }
    drawLadder(S, true);
    if (late && fp < 0.999 && S.chars !== 0) { hp = drawChar(S, xf, 'pup'); hk = drawChar(S, xf, 'kit'); }
    /* the splinter that falls from the split */
    if (S.splinter) {
      ctx.save(); ctx.translate(S.splinter.x, S.splinter.y); ctx.rotate(S.splinter.rot); ctx.scale(S.splinter.s || 1, S.splinter.s || 1);
      ctx.fillStyle = sh([226, 196, 150]); ctx.beginPath(); ctx.moveTo(-13, -2); ctx.lineTo(11, -4); ctx.lineTo(14, 1); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = sh([92, 68, 54]); ctx.beginPath(); ctx.moveTo(-13, -2); ctx.lineTo(11, -4); ctx.lineTo(9, -6); ctx.lineTo(-11, -4); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (S.splinter.puff > 0) { ctx.strokeStyle = 'rgba(200,222,255,' + (1 - S.splinter.puff) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(S.splinter.x, -4, 10 + 40 * S.splinter.puff, 3 + 9 * S.splinter.puff, 0, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
    /* back in screen space */
    flyingLeaves(st);
    rain(st, true, flash, -cam.y * z);
    /* the words that stand in for sounds */
    if (S.labels) for (i = 0; i < S.labels.length; i++) {
      var L = S.labels[i]; if (L.a <= 0.01) continue;
      var q = toScreen(cam, L.wx, L.wy);
      ctx.save(); ctx.translate(q[0] + shx, q[1] + shy); ctx.rotate(L.rot || 0); ctx.globalAlpha = clamp(L.a, 0, 1);
      ctx.font = '700 ' + Math.round((L.size || 34) * k) + 'px "Caveat", "Space Grotesk", cursive'; ctx.textAlign = L.align || 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 6 * k; ctx.strokeStyle = 'rgba(6,10,20,0.75)'; ctx.lineJoin = 'round'; ctx.strokeText(L.text, 0, 0);
      ctx.fillStyle = L.col || '#ffffff'; ctx.fillText(L.text, 0, 0); ctx.restore();
    }
    return { kit: hk, pup: hp };
  }

  /* ---------- the run across the field ---------- */
  function treeSil(x, base, f, d, flash) {
    var u = f / d, hgt = 30 * u, tw = 1.9 * u, i;
    ctx.fillStyle = sh([5, 7, 12]);
    ctx.beginPath(); ctx.moveTo(x - tw * 0.95, base); ctx.quadraticCurveTo(x - tw * 0.42, base - hgt * 0.12, x - tw * 0.36, base - hgt * 0.9); ctx.lineTo(x + tw * 0.36, base - hgt * 0.9); ctx.quadraticCurveTo(x + tw * 0.42, base - hgt * 0.12, x + tw * 0.95, base); ctx.closePath(); ctx.fill();
    /* the one long branch, and two small shapes hanging under it */
    var by = base - hgt * 0.60, bl = 15 * u;
    ctx.beginPath(); ctx.moveTo(x, by - 0.6 * u); ctx.lineTo(x + bl, by - 0.5 * u); ctx.lineTo(x + bl, by - 0.2 * u); ctx.lineTo(x, by + 0.6 * u); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + bl * 0.52, by + 1.5 * u, 0.5 * u, 1.5 * u, 0, 0, TAU); ctx.ellipse(x + bl * 0.74, by + 1.5 * u, 0.6 * u, 1.5 * u, 0, 0, TAU); ctx.fill();
    /* the ladder that stops short of them */
    var lx = x + bl * 0.63, lt = by + 9 * u, lw = Math.max(1, 0.14 * u);
    ctx.fillRect(lx - 0.7 * u, lt, lw, base - lt); ctx.fillRect(lx + 0.7 * u, lt, lw, base - lt);
    if (u > 5) for (i = 0; lt + i * 0.9 * u < base; i++) ctx.fillRect(lx - 0.7 * u, lt + i * 0.9 * u, 1.4 * u, Math.max(1, 0.08 * u));
    ctx.fillRect(lx - 1.9 * u, lt - 0.3 * u, 3.8 * u, 0.5 * u);
    ctx.fillStyle = 'rgba(255,214,140,0.95)'; ctx.beginPath(); ctx.arc(lx + 1.9 * u, lt - 1.0 * u, Math.max(1.2, 0.16 * u), 0, TAU); ctx.fill();
    ctx.fillStyle = sh([5, 7, 12]);
    /* the crown */
    for (i = 0; i < 22; i++) {
      var a = h1(i + 60) * TAU, rr = (3.2 + 3.4 * h1(i + 90)) * u, cx = x + Math.cos(a) * 8.5 * u * h1(i + 30) + 2.5 * u, cy = base - hgt * 0.92 + Math.sin(a) * 4.6 * u * h1(i + 20) - 2 * u;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    }
  }
  function drawField(S) {
    var st = S.st, flash = S.flash || 0, u = S.fieldU, i;
    light.flash = flash; light.night = NIGHT; light.lamp = 0;
    var bob = Math.sin(st * 8.4) * 3 * k * (0.4 + u), hz = H * 0.56 + bob;
    sky(flash); clouds(st, flash, -0.10 * H);
    if (S.boltIdx >= 0 && flash > 0.02) drawBolt(S.boltIdx, Math.min(1, flash * 1.6), 1);
    rain(st, false, flash, 0);
    var d = 1.25 + 150 * Math.pow(1 - u, 1.7), f = W * 0.36, travelled = 150 - (d - 1.25);
    ctx.fillStyle = sh([12, 19, 34]); ctx.beginPath(); ctx.moveTo(0, H);
    for (var x = 0; x <= W + 30; x += 30) ctx.lineTo(x, hz - (10 + 9 * Math.sin(x / W * 5 + 1) + 5 * Math.sin(x / W * 13)) * k);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    var g = ctx.createLinearGradient(0, hz, 0, H); g.addColorStop(0, sh([16, 30, 26])); g.addColorStop(1, sh([8, 16, 12]));
    ctx.fillStyle = g; ctx.fillRect(0, hz, W, H - hz);
    treeSil(W * 0.5 + 1.2 / d * f, hz + 1.0 / d * f, f, d, flash);
    var w = wind(st) + gust(st);
    ctx.lineCap = 'round';
    for (var pass = 0; pass < 3; pass++) {
      ctx.strokeStyle = sh(pass === 0 ? [20, 40, 28] : pass === 1 ? [32, 60, 38] : [50, 84, 48]); ctx.beginPath();
      for (i = pass; i < blades.length; i += 3) {
        var b = blades[i], zz = (((b.z - travelled) % 60) + 60) % 60 + 0.35;
        var sx = W * 0.5 + b.x * (2.2 / zz + 1.5) * f, sy = hz + 1.0 / zz * f;
        if (sy > H + 60 || sx < -60 || sx > W + 60) continue;
        var bh = b.h * 0.62 / zz * f, lean = (0.25 + 0.3 * Math.sin(st * 3 + b.ph)) * w * bh;
        ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + lean * 0.3, sy - bh * 0.6, sx + lean, sy - bh);
      }
      ctx.lineWidth = (pass + 1.2) * k; ctx.stroke();
    }
    flyingLeaves(st);
    rain(st, true, flash, 0);
  }

  function finish(S) {
    var flash = S.flash || 0, g;
    if (flash > 0.01) { ctx.fillStyle = 'rgba(214,228,255,' + flash * 0.11 + ')'; ctx.fillRect(0, 0, W, H); }
    if (S.hold > 0.01) { ctx.fillStyle = 'rgba(70,112,210,' + 0.15 * clamp(S.hold, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
    g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.max(W, H) * 0.74);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,6,0.62)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (S.heart > 0.01) {
      /* the heartbeat, drawn: the edges of the screen pulse */
      g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.66);
      g.addColorStop(0, 'rgba(120,0,10,0)'); g.addColorStop(1, 'rgba(150,6,18,' + 0.55 * S.heart + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (S.white > 0.01) { ctx.fillStyle = 'rgba(236,242,255,' + clamp(S.white, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
    if (S.dark > 0.01) { ctx.fillStyle = 'rgba(0,0,0,' + clamp(S.dark, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
  }

  var api = { G: G, SHOT: SHOT, strike: strike, strikeTime: strikeTime, flashAt: flashAt, softFlashAt: softFlashAt, gust: gust, wind: wind, toScreen: toScreen, onBranch: onBranch, branchXf: branchXf, bc: bc };
  api.resize = function () {
    var r = Math.min(window.devicePixelRatio || 1, api.maxDpr || 2);
    W = window.innerWidth || 1366; H = window.innerHeight || 768; dpr = r;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    k = Math.min(W / 1366, H / 700);
    api.k = k; api.W = W; api.H = H;
  };
  api.init = function (c) { canvas = c; ctx = c.getContext('2d'); buildTextures(); buildFixed(); api.resize(); };
  api.draw = function (S) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var out = null;
    if (S.mode === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    else if (S.mode === 'field') drawField(S);
    else out = drawWorld(S);
    finish(S);
    return out;
  };
  /* the weather, lent to the scenes of the later chapters. Nothing in chapter 1 reads this. */
  api.kit = { sky: sky, clouds: clouds, rain: rain, drawBolt: drawBolt, flyingLeaves: flyingLeaves, finish: finish, leafPath: leafPath, box: box, h1: h1, rng: rng, blinkAt: blinkAt, ctx: function () { return ctx; }, dpr: function () { return dpr; } };
  window.RescueScene = api;
})();
