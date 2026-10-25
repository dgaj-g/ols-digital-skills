/* The Search, art test: the places, drawn by code. The Workshop bench at dusk, and the hill in the snow.
   One canvas, one stage of 1600 x 900 units scaled to cover the window. Nothing here is a picture file. */
(function () {
  'use strict';
  var C = window.SearchChars, TAU = C.TAU, clamp = C.clamp, lerp = C.lerp, smooth = C.smooth, sh = C.sh, rr = C.rr, glow = C.glow;
  var W = 1600, H = 900, canvas = document.getElementById('c'), ctx = canvas.getContext('2d'), dpr = 1, scale = 1, ox = 0, oy = 0, cw = 0, ch = 0;
  function fract(x) { return x - Math.floor(x); }
  function h1(n) { return fract(Math.sin(n * 127.1 + 311.7) * 43758.5453); }
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1); cw = window.innerWidth; ch = window.innerHeight;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    scale = (window.SearchSceneFit === 'contain' ? Math.min : Math.max)(cw / W, ch / H); /* the film covers the window; the hour page asks for contain so its panel is never cut (hour/ui.js) */ ox = (cw - W * scale) / 2; oy = (ch - H * scale) / 2;
  }
  function begin() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cw, ch); ctx.setTransform(dpr * scale, 0, 0, dpr * scale, ox * dpr, oy * dpr); }
  /* the visible stage edges in stage units, so nothing important sits in the cropped margin */
  function edges() { return { l: -ox / scale, r: W + (cw - (ox + W * scale)) / scale, t: -oy / scale, b: H + (ch - (oy + H * scale)) / scale }; }

  /* ---------- snow: three layers, each a set of flakes drifting with the wind ---------- */
  var FL = [];
  (function () { for (var i = 0; i < 420; i++) FL.push({ x: h1(i) * 2000 - 200, y: h1(i + 500) * 1100 - 100, z: 0.35 + 0.65 * h1(i + 900), w: h1(i + 1300) }); })();
  function snow(t, wind, dens, e) {
    var i, f, x, y, r, a;
    for (i = 0; i < FL.length * dens; i++) {
      f = FL[i]; r = 1.2 + 3.2 * f.z; a = 0.35 + 0.55 * f.z;
      x = f.x + t * (18 + 70 * f.z) * wind + Math.sin(t * 1.3 + f.w * 9) * 14 * f.z; y = f.y + t * (34 + 86 * f.z);
      x = ((x - e.l) % (e.r - e.l + 400) + (e.r - e.l + 400)) % (e.r - e.l + 400) + e.l - 200; y = ((y - e.t) % (e.b - e.t + 200) + (e.b - e.t + 200)) % (e.b - e.t + 200) + e.t - 100;
      ctx.fillStyle = 'rgba(245,248,255,' + a + ')'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }
  function vignette(a) {
    var g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H / 2, W * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + a + ')');
    var e = edges(); ctx.fillStyle = g; ctx.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
  }

  /* ---------- the hill at dusk ---------- */
  function ridge(y0, amp, seed, col) {
    var e = edges(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(e.l, e.b);
    for (var x = e.l; x <= e.r + 20; x += 20) {
      var u = x / W, y = y0 - amp * (0.55 * Math.sin(u * 2.1 + seed) + 0.30 * Math.sin(u * 5.3 + seed * 2) + 0.15 * Math.sin(u * 11 + seed * 3)) - amp * 0.8 * Math.exp(-Math.pow((u - 0.62 - seed * 0.05) * 3.2, 2));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(e.r + 20, e.b); ctx.closePath(); ctx.fill();
  }
  /* a drystone wall: courses of flat stones, staggered, with snow lying along the top */
  function wallLine(x0, y0, x1, y1, hgt, seed) {
    var len = Math.hypot(x1 - x0, y1 - y0), courses = Math.max(2, Math.round(hgt / 13)), ch = hgt / courses, c, x, u, y, w, k = 0, g;
    for (c = 0; c < courses; c++) {
      x = x0 - 8 - 14 * h1(seed + c * 31);
      while (x < x0 + len) {
        w = 15 + 24 * h1(seed + k * 7 + c * 13); k++;
        u = clamp((x + w / 2 - x0) / len, 0, 1); y = lerp(y0, y1, u) - c * ch;
        g = 48 + 24 * h1(seed + k * 3);
        ctx.fillStyle = sh([g, g + 2, g + 11]); rr(ctx, x, y - ch + 1.2, w - 2.2, ch - 1.6, 2.5); ctx.fill();
        ctx.fillStyle = 'rgba(200,210,235,' + (0.10 + 0.10 * h1(k + seed)) + ')'; rr(ctx, x + 1, y - ch + 1.2, w - 4.2, ch * 0.32, 2); ctx.fill();
        x += w;
      }
    }
    /* the lowest courses sit in their own shadow, so the wall has weight */
    var ym = lerp(y0, y1, 0.5); g = ctx.createLinearGradient(0, ym - hgt * 0.45, 0, ym + 3); g.addColorStop(0, 'rgba(10,14,30,0)'); g.addColorStop(1, 'rgba(10,14,30,0.40)'); ctx.fillStyle = g; ctx.fillRect(x0 - 10, ym - hgt * 0.45, len + 20, hgt * 0.45 + 3);
    for (x = x0 - 6; x < x0 + len + 6; x += 13) { u = clamp((x - x0) / len, 0, 1); y = lerp(y0, y1, u) - hgt; ctx.fillStyle = 'rgba(246,249,255,' + (0.85 + 0.1 * h1(x + seed)) + ')'; ctx.beginPath(); ctx.ellipse(x, y + 1, 9 + 3 * h1(x * 3 + seed), 3.2 + 1.6 * h1(x * 5 + seed), 0, 0, TAU); ctx.fill(); }
  }
  function gate(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = sh([70, 56, 44]); ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); for (var i = 0; i < 5; i++) { ctx.moveTo(-70, -20 - i * 16); ctx.lineTo(70, -24 - i * 16); } ctx.moveTo(-70, -8); ctx.lineTo(-70, -100); ctx.moveTo(70, -8); ctx.lineTo(70, -100); ctx.moveTo(-66, -22); ctx.lineTo(66, -86); ctx.stroke();
    ctx.fillStyle = sh([246, 249, 255], 0.9); for (i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(0, -24 - i * 16 - 3, 72, 2.5, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function farmhouse(x, y, s, lit, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = sh([28, 30, 40]); ctx.fillRect(-60, -40, 120, 40); ctx.beginPath(); ctx.moveTo(-66, -40); ctx.lineTo(0, -78); ctx.lineTo(66, -40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sh([246, 249, 255], 0.9); ctx.beginPath(); ctx.moveTo(-66, -41); ctx.lineTo(0, -80); ctx.lineTo(66, -41); ctx.lineTo(60, -36); ctx.lineTo(0, -72); ctx.lineTo(-60, -36); ctx.closePath(); ctx.fill();
    ctx.fillRect(30, -92, 12, 20);
    if (lit > 0) { glow(ctx, -22, -22, 60, 'rgba(255,190,110,A)', 0.55 * lit); ctx.fillStyle = 'rgba(255,205,130,' + lit + ')'; ctx.fillRect(-32, -30, 18, 16); ctx.fillRect(14, -30, 18, 16); }
    /* smoke from the chimney: five puffs, each older one higher, wider and fainter, leaning with the wind */
    for (var k = 0; k < 5; k++) { var u = fract(t * 0.09 + k * 0.2); ctx.fillStyle = 'rgba(200,200,215,' + 0.22 * (1 - u) + ')'; ctx.beginPath(); ctx.arc(36 + 26 * u + 3 * Math.sin(t * 1.1 + k), -98 - 56 * u, 4 + 11 * u, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function tree(x, y, s, seed) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = sh([22, 22, 30]); ctx.lineCap = 'round';
    function br(x0, y0, a, len, w, d) {
      if (d > 5 || len < 6) return; var x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      br(x1, y1, a - 0.45 - 0.3 * h1(seed + d * 7 + x0), len * 0.68, w * 0.62, d + 1); br(x1, y1, a + 0.40 + 0.3 * h1(seed + d * 11 + y0), len * 0.66, w * 0.62, d + 1);
    }
    br(0, 0, -Math.PI / 2 + 0.25, 60, 9, 0);
    ctx.restore();
  }
  /* a clump of rushes through the snow: thin dark blades fanned out, leaning with the wind, a little shadow at their foot. s scales with distance */
  function rushAt(x, y, s, seed) {
    var j, n = 4 + Math.floor(3 * h1(seed + 90)); ctx.strokeStyle = 'rgba(34,38,66,0.62)'; ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(40,46,80,0.16)'; ctx.beginPath(); ctx.ellipse(x + 4 * s, y + 2, 12 * s, 3 * s, 0, 0, TAU); ctx.fill();
    for (j = 0; j < n; j++) { var a = -1.15 - 0.95 * (j / n) + 0.3 * h1(seed * 7 + j), len = (9 + 11 * h1(seed * 3 + j)) * s, bx = x + j * 2.2 * s; ctx.lineWidth = 1.4 * s + 0.4; ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.6, bx + Math.cos(a) * len + 3 * s, y + Math.sin(a) * len); ctx.stroke(); }
  }
  function rushes(e, seed, n, keep) {
    for (var i = 0; i < n; i++) { var x = e.l + h1(seed + i) * (e.r - e.l), y = 600 + h1(seed + i + 50) * 290, sc = 0.35 + (y - 600) / 290; if (keep && Math.abs(x - keep.x) < 300 && Math.abs(y - keep.y - 30) < 130) continue; rushAt(x, y, sc, seed + i); }
  }
  function torchCone(x, y, ang, len, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    var g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(255,240,200,' + a + ')'); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, -len * 0.30); ctx.lineTo(len, len * 0.30); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* p: t, dusk (0 last light .. 1 dark), wind, cam {x, y, z}: the point of the stage at the centre of the window, z = zoom, lamb {x, y, s, ...} drawn by the caller, nuala {x, y} */
  function hill(p) {
    var t = p.t, d = clamp(p.dusk, 0, 1), e, cam = p.cam || { x: W / 2, y: H / 2, z: 1 };
    C.light.k = lerp(0.95, 0.70, d); C.light.cool = lerp(0.35, 0.85, d); C.light.warm = 0;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    e = edges(); e = { l: cam.x + (e.l - W / 2) / cam.z, r: cam.x + (e.r - W / 2) / cam.z, t: cam.y + (e.t - H / 2) / cam.z, b: cam.y + (e.b - H / 2) / cam.z };
    /* the sky: the last orange going out low in the west, violet above, stars coming */
    var g = ctx.createLinearGradient(0, e.t, 0, 560);
    g.addColorStop(0, sh([lerp(40, 10, d), lerp(44, 14, d), lerp(92, 40, d)])); g.addColorStop(0.55, sh([lerp(96, 28, d), lerp(72, 30, d), lerp(130, 72, d)])); g.addColorStop(1, sh([lerp(232, 70, d), lerp(130, 48, d), lerp(90, 80, d)]));
    ctx.fillStyle = g; ctx.fillRect(e.l, e.t, e.r - e.l, 560 - e.t);
    for (var i = 0; i < 70; i++) { var sx = h1(i) * W, sy = h1(i + 77) * 380, sa = (0.25 + 0.75 * h1(i + 150)) * d * (0.6 + 0.4 * Math.sin(t * 2 + i)); ctx.fillStyle = 'rgba(255,255,255,' + sa + ')'; ctx.fillRect(sx, sy, 2, 2); }
    /* a thin moon */
    ctx.fillStyle = 'rgba(255,250,230,' + (0.5 + 0.5 * d) + ')'; ctx.beginPath(); ctx.arc(1180, 150, 26, 0, TAU); ctx.fill();
    ctx.fillStyle = sh([lerp(60, 14, d), lerp(50, 18, d), lerp(100, 48, d)]); ctx.beginPath(); ctx.arc(1168, 142, 24, 0, TAU); ctx.fill();
    /* the Mournes, two ridges, then the snow field coming down toward us */
    ridge(470, 150, 0.4, sh([lerp(58, 20, d), lerp(48, 22, d), lerp(92, 52, d)]));
    ridge(520, 110, 1.9, sh([lerp(44, 14, d), lerp(38, 16, d), lerp(74, 40, d)]));
    g = ctx.createLinearGradient(0, 520, 0, e.b); g.addColorStop(0, sh([lerp(200, 120, d), lerp(206, 132, d), lerp(226, 176, d)])); g.addColorStop(1, sh([lerp(226, 150, d), lerp(230, 160, d), lerp(242, 200, d)]));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(e.l, 560); ctx.quadraticCurveTo(400, 505, 900, 528); ctx.quadraticCurveTo(1300, 548, e.r, 520); ctx.lineTo(e.r, e.b); ctx.lineTo(e.l, e.b); ctx.closePath(); ctx.fill();
    /* the drifts: soft shading where the ground rolls */
    for (i = 0; i < 6; i++) { g = ctx.createRadialGradient(200 + i * 290, 640 + 50 * Math.sin(i), 0, 200 + i * 290, 640 + 50 * Math.sin(i), 260); g.addColorStop(0, 'rgba(255,255,255,' + 0.10 * (1 - d) + ')'); g.addColorStop(1, 'rgba(90,100,150,0.12)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(200 + i * 290, 640 + 50 * Math.sin(i), 260, 70, 0, 0, TAU); ctx.fill(); }
    /* mist lying along the foot of the hills, where the field meets the ridge */
    g = ctx.createLinearGradient(0, 490, 0, 600); g.addColorStop(0, 'rgba(205,214,240,0)'); g.addColorStop(0.5, 'rgba(205,214,240,' + (0.20 - 0.08 * d) + ')'); g.addColorStop(1, 'rgba(205,214,240,0)'); ctx.fillStyle = g; ctx.fillRect(e.l, 490, e.r - e.l, 110);
    /* the wind has combed the snow into long faint streaks, and glints catch the last of the light */
    for (i = 0; i < 26; i++) { var wx = h1(i + 2000) * W, wy = 600 + h1(i + 2100) * 300, wr = 60 + 90 * h1(i + 2200), wa = -0.04 + 0.08 * h1(i + 2300); ctx.fillStyle = 'rgba(255,255,255,' + 0.07 * (1 - 0.5 * d) + ')'; ctx.beginPath(); ctx.ellipse(wx, wy, wr, 2.2, wa, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(90,100,150,0.10)'; ctx.beginPath(); ctx.ellipse(wx, wy + 4, wr * 0.9, 1.6, wa, 0, TAU); ctx.fill(); }
    for (i = 0; i < 150; i++) { var gx = h1(i + 3000) * W, gy = 590 + h1(i + 3100) * 320, ga = (0.25 + 0.55 * h1(i + 3200)) * (0.45 + 0.55 * Math.sin(t * 2.6 + i * 1.7)) * (1 - 0.45 * d); ctx.fillStyle = 'rgba(255,255,255,' + ga + ')'; ctx.fillRect(gx, gy, 1.6, 1.6); }
    farmhouse(1250, 548, 0.55, 0.6 + 0.4 * d, t);
    tree(300, 556, 0.5, 3); tree(1420, 552, 0.42, 9);
    /* the far wall, running across the field, with the gate */
    wallLine(e.l - 40, 602, 700, 592, 34, 11); gate(760, 600, 0.55); wallLine(820, 592, e.r + 40, 606, 34, 23);
    g = ctx.createLinearGradient(0, 600, 0, 650); g.addColorStop(0, 'rgba(24,30,64,0.30)'); g.addColorStop(1, 'rgba(24,30,64,0)'); ctx.fillStyle = g; ctx.fillRect(e.l, 600, e.r - e.l, 50);
    /* rushes through the snow, in clumps, smaller the further off; none in the hollow where the lamb sits */
    rushes(e, 4000, 22, p.near || null);
    if (p.nuala) {
      var nx = p.nuala.x, ny = p.nuala.y, ns = p.nuala.s;
      torchCone(nx + 1.87 * ns, ny + 0.67 * ns, p.nuala.ang, 420, 0.22);
      /* her torch warms the snow at her feet and a little of her: one small warm figure in a big cold field */
      glow(ctx, nx + 1.87 * ns, ny + 0.67 * ns, 3.6 * ns, 'rgba(255,226,160,A)', 0.30);
      ctx.fillStyle = 'rgba(255,236,190,0.16)'; ctx.beginPath(); ctx.ellipse(nx + 2.6 * ns, ny + 2.42 * ns, 4.2 * ns, 0.9 * ns, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(nx, ny); ctx.scale(ns, ns); ctx.fillStyle = 'rgba(10,14,30,0.30)'; ctx.beginPath(); ctx.ellipse(0.1, 2.38, 0.70, 0.13, 0, 0, TAU); ctx.fill(); C.nuala(ctx, { t: t, torch: p.nuala.ang, phone: 1, walk: p.nuala.walk }); ctx.restore();
    }
    /* hoof prints, when the shot asks for them */
    if (p.prints) for (i = 0; i < p.prints.length; i++) { var pr = p.prints[i]; ctx.fillStyle = 'rgba(70,80,120,' + pr.a + ')'; ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 6, 4, pr.r, 0, TAU); ctx.fill(); }
    /* the near wall the lamb shelters under: its shadow on the snow, a drift banked against its foot, a few fallen stones, rushes either side, and the hollow she sits in. the lamb is drawn by the caller */
    if (p.near) {
      var qx = p.near.x, qy = p.near.y, dx, dy, k;
      wallLine(qx - 420, qy - 12, qx + 420, qy + 8, 62, 31);
      g = ctx.createLinearGradient(0, qy + 6, 0, qy + 92); g.addColorStop(0, 'rgba(20,26,56,0.42)'); g.addColorStop(1, 'rgba(20,26,56,0)'); ctx.fillStyle = g; ctx.fillRect(qx - 420, qy + 6, 840, 86);
      for (k = 0; k < 2; k++) {
        if (k) { ctx.fillStyle = sh([62, 64, 82]); rr(ctx, qx - 262, qy - 18, 24, 14, 5); ctx.fill(); rr(ctx, qx + 112, qy - 14, 17, 11, 4); ctx.fill(); rr(ctx, qx + 326, qy - 20, 27, 15, 5); ctx.fill(); }
        g = ctx.createLinearGradient(0, qy - (k ? 20 : 10), 0, qy + (k ? 36 : 30)); g.addColorStop(0, k ? 'rgba(238,244,255,0.96)' : 'rgba(126,140,188,0.42)'); g.addColorStop(0.55, k ? 'rgba(238,244,255,0.90)' : 'rgba(126,140,188,0.30)'); g.addColorStop(1, k ? 'rgba(238,244,255,0)' : 'rgba(126,140,188,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(qx - 420, qy + 40);
        for (dx = -420; dx <= 420; dx += 20) { dy = 12 - (14 + 10 * Math.sin(dx * 0.011 + 1) + 5 * Math.sin(dx * 0.031)) + (k ? 0 : 7); ctx.lineTo(qx + dx, qy + dy); }
        ctx.lineTo(qx + 420, qy + 40); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(246,249,255,0.9)'; ctx.beginPath(); ctx.ellipse(qx - 250, qy - 17, 10, 3, 0, 0, TAU); ctx.ellipse(qx + 340, qy - 19, 11, 3, 0, 0, TAU); ctx.fill();
      g = ctx.createRadialGradient(qx, qy + 30, 0, qx, qy + 30, 300); g.addColorStop(0, 'rgba(40,48,90,0.22)'); g.addColorStop(1, 'rgba(40,48,90,0)'); ctx.fillStyle = g; ctx.fillRect(qx - 320, qy - 40, 640, 140);
      rushAt(qx - 235, qy + 50, 1.0, 77); rushAt(qx + 215, qy + 56, 1.05, 78); rushAt(qx + 395, qy + 30, 0.9, 79);
    }
    if (p.draw) p.draw(ctx);
    ctx.restore();
    /* the snow falls between the camera and the hill, so it is the same size however close we are */
    snow(t, p.wind == null ? 0.6 : p.wind, lerp(0.45, 1, d), edges());
    vignette(0.55 + 0.25 * d);
  }

  /* ---------- the Workshop bench ---------- */
  function workshop(p) {
    var t = p.t, e = edges(), lamp = p.lamp == null ? 1 : p.lamp, i, g;
    C.light.k = 0.92; C.light.cool = 0.1; C.light.warm = 0.55 * lamp;
    /* the room: dark, a pegboard wall, a window with the dusk in it */
    g = ctx.createLinearGradient(0, e.t, 0, e.b); g.addColorStop(0, '#0b0d14'); g.addColorStop(1, '#1a1612'); ctx.fillStyle = g; ctx.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
    /* the pegboard: a warm board down to the bench, rows of holes, each hole lit along its lower rim where the lamp reaches */
    g = ctx.createLinearGradient(0, e.t, 0, 560); g.addColorStop(0, '#15110e'); g.addColorStop(1, '#221b14'); ctx.fillStyle = g; ctx.fillRect(e.l, e.t, e.r - e.l, 560 - e.t);
    for (i = 0; i < 28; i++) for (var j = 0; j < 12; j++) { var hx = e.l + 40 + i * 62, hy = 60 + j * 48, hl = clamp(1 - Math.hypot(hx - 800, hy - 220) / 760, 0, 1) * lamp; ctx.fillStyle = '#0a0807'; ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,200,140,' + (0.08 + 0.42 * hl) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0.3, Math.PI - 0.3); ctx.stroke(); }
    if (lamp > 0) { g = ctx.createRadialGradient(800, 200, 30, 800, 200, 520); g.addColorStop(0, 'rgba(255,200,130,' + 0.14 * lamp + ')'); g.addColorStop(1, 'rgba(255,200,130,0)'); ctx.fillStyle = g; ctx.fillRect(e.l, e.t, e.r - e.l, 560 - e.t); }
    /* the window: snow falling past it, the hill far off */
    ctx.save(); rr(ctx, 1090, 70, 330, 220, 14); ctx.clip();
    g = ctx.createLinearGradient(0, 70, 0, 290); g.addColorStop(0, '#1c1f45'); g.addColorStop(0.7, '#4a2e55'); g.addColorStop(1, '#9a5a56'); ctx.fillStyle = g; ctx.fillRect(1090, 70, 330, 220);
    ctx.fillStyle = '#16142a'; ctx.beginPath(); ctx.moveTo(1090, 255); ctx.quadraticCurveTo(1180, 195, 1300, 225); ctx.quadraticCurveTo(1380, 240, 1420, 218); ctx.lineTo(1420, 290); ctx.lineTo(1090, 290); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c8cce0'; ctx.beginPath(); ctx.moveTo(1090, 259); ctx.quadraticCurveTo(1180, 199, 1300, 229); ctx.quadraticCurveTo(1380, 244, 1420, 222); ctx.lineTo(1420, 236); ctx.quadraticCurveTo(1380, 258, 1300, 243); ctx.quadraticCurveTo(1180, 212, 1090, 272); ctx.closePath(); ctx.fill();
    for (i = 0; i < 50; i++) { var fx = 1090 + ((h1(i) * 330 + t * (15 + 30 * h1(i + 9))) % 330), fy = 70 + ((h1(i + 40) * 220 + t * (40 + 50 * h1(i + 3))) % 220); ctx.fillStyle = 'rgba(240,244,255,' + (0.4 + 0.5 * h1(i + 70)) + ')'; ctx.beginPath(); ctx.arc(fx, fy, 1.5 + 2 * h1(i + 5), 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 14; rr(ctx, 1090, 70, 330, 220, 14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(1255, 70); ctx.lineTo(1255, 290); ctx.moveTo(1090, 180); ctx.lineTo(1420, 180); ctx.stroke();
    /* tools on the wall: a spanner, a screwdriver, a coil of copper wire, a hammer. steel and wood, each with a lit left edge, each on a steel peg, each throwing its shadow on the board */
    var steel = 'rgba(176,182,192,0.92)', steelLo = 'rgba(92,98,108,0.95)', wood = 'rgba(152,106,62,0.95)', woodLo = 'rgba(92,60,34,0.95)';
    function bar(x0, y0, x1, y1, w, hi, lo) { ctx.lineCap = 'round'; ctx.strokeStyle = lo; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = hi; ctx.lineWidth = w * 0.5; ctx.beginPath(); ctx.moveTo(x0 - w * 0.2, y0); ctx.lineTo(x1 - w * 0.2, y1); ctx.stroke(); }
    function tools(K) {
      bar(260, 150, 260, 300, 14, K.steel, K.steelLo);
      ctx.strokeStyle = K.steelLo; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(260, 128, 26, 0.45, TAU - 0.45); ctx.stroke(); ctx.strokeStyle = K.steel; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(258, 128, 24, 0.7, Math.PI); ctx.stroke();
      ctx.fillStyle = K.steelLo; ctx.beginPath(); ctx.arc(260, 312, 18, 0, TAU); ctx.fill(); ctx.fillStyle = K.hole; ctx.beginPath(); ctx.arc(260, 312, 8, 0, TAU); ctx.fill();
      bar(360, 120, 360, 250, 8, K.steel, K.steelLo);
      ctx.fillStyle = K.red; rr(ctx, 344, 250, 32, 88, 10); ctx.fill(); ctx.fillStyle = K.redHi; rr(ctx, 348, 256, 10, 76, 5); ctx.fill();
      ctx.strokeStyle = K.copper; ctx.lineWidth = 10; ctx.lineCap = 'round';
      for (var q = 0; q < 5; q++) { ctx.beginPath(); ctx.ellipse(520, 200 + q * 2, 62 - q * 3, 52 - q * 2, 0.15 * q, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = K.copperHi; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(520, 200, 58, 48, 0, 2.6, 4.6); ctx.stroke();
      bar(680, 175, 680, 330, 16, K.wood, K.woodLo);
      ctx.fillStyle = K.steelLo; rr(ctx, 638, 132, 84, 46, 8); ctx.fill(); ctx.fillStyle = K.steel; rr(ctx, 642, 136, 30, 38, 6); ctx.fill();
    }
    var SHADOW = 'rgba(0,0,0,0.42)';
    ctx.save(); ctx.translate(7, 10); tools({ steel: SHADOW, steelLo: SHADOW, hole: SHADOW, red: SHADOW, redHi: SHADOW, copper: SHADOW, copperHi: SHADOW, wood: SHADOW, woodLo: SHADOW }); ctx.restore();
    tools({ steel: steel, steelLo: steelLo, hole: '#15110e', red: 'rgba(120,30,30,0.95)', redHi: 'rgba(212,72,62,0.9)', copper: 'rgba(122,72,40,0.95)', copperHi: 'rgba(216,142,82,0.9)', wood: wood, woodLo: woodLo });
    var pegs = [[260, 100], [360, 114], [520, 146], [680, 126]];
    for (i = 0; i < pegs.length; i++) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(pegs[i][0] + 3, pegs[i][1] + 4, 6, 0, TAU); ctx.fill(); ctx.fillStyle = steelLo; ctx.beginPath(); ctx.arc(pegs[i][0], pegs[i][1], 6, 0, TAU); ctx.fill(); ctx.fillStyle = steel; ctx.beginPath(); ctx.arc(pegs[i][0] - 1.5, pegs[i][1] - 1.5, 2.6, 0, TAU); ctx.fill(); }
    /* the lamp: a cone of warm light from above the bench */
    if (lamp > 0) { g = ctx.createRadialGradient(800, 120, 20, 800, 520, 700); g.addColorStop(0, 'rgba(255,200,120,' + 0.42 * lamp + ')'); g.addColorStop(0.5, 'rgba(255,190,110,' + 0.12 * lamp + ')'); g.addColorStop(1, 'rgba(255,180,100,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(800, 120); ctx.lineTo(80, e.b); ctx.lineTo(1520, e.b); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.moveTo(740, 60); ctx.lineTo(860, 60); ctx.lineTo(900, 128); ctx.lineTo(700, 128); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(800, e.t); ctx.lineTo(800, 60); ctx.stroke();
    ctx.fillStyle = '#3a332c'; ctx.beginPath(); ctx.moveTo(740, 60); ctx.lineTo(760, 60); ctx.lineTo(724, 128); ctx.lineTo(700, 128); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,160,' + (0.5 + 0.5 * lamp) + ')'; ctx.beginPath(); ctx.ellipse(800, 128, 96, 10, 0, 0, TAU); ctx.fill();
    if (lamp > 0) glow(ctx, 800, 134, 110, 'rgba(255,214,150,A)', 0.30 * lamp);
    /* the bench: a thick plank, grain, a front edge; a mug and a screwdriver on it */
    g = ctx.createLinearGradient(0, 560, 0, 640); g.addColorStop(0, sh([150, 110, 72])); g.addColorStop(1, sh([110, 78, 50]));
    ctx.fillStyle = g; ctx.fillRect(e.l, 560, e.r - e.l, 80);
    ctx.strokeStyle = 'rgba(70,45,25,0.35)'; ctx.lineWidth = 2; for (i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(e.l, 572 + i * 5.5 + 2 * Math.sin(i)); ctx.bezierCurveTo(400, 568 + i * 6, 1100, 580 + i * 5, e.r, 574 + i * 5.5); ctx.stroke(); }
    ctx.fillStyle = sh([70, 50, 34]); ctx.fillRect(e.l, 640, e.r - e.l, 36);
    g = ctx.createLinearGradient(0, 676, 0, e.b); g.addColorStop(0, '#1a1410'); g.addColorStop(1, '#070608'); ctx.fillStyle = g; ctx.fillRect(e.l, 676, e.r - e.l, e.b - 676);
    /* the drawers under the bench, warm where the lamp reaches them */
    if (lamp > 0) { ctx.save(); ctx.translate(800, 600); ctx.scale(1, 0.16); g = ctx.createRadialGradient(0, 0, 40, 0, 0, 560); g.addColorStop(0, 'rgba(255,210,140,' + 0.22 * lamp + ')'); g.addColorStop(1, 'rgba(255,210,140,0)'); ctx.fillStyle = g; ctx.fillRect(-600, -300, 1200, 600); ctx.restore(); }
    var lit = 0.55 + 0.45 * lamp;
    for (i = 0; i < 4; i++) {
      var dx = i % 2 ? 830 : 350, dy = i < 2 ? 700 : 796, dl = lit * (i < 2 ? 1 : 0.8);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(ctx, dx + 4, dy + 6, 420, 78, 6); ctx.fill();
      g = ctx.createLinearGradient(dx, dy, dx + 420, dy); g.addColorStop(0, sh([lerp(50, 112, dl), lerp(36, 76, dl), lerp(26, 50, dl)])); g.addColorStop(1, sh([lerp(40, 84, dl), lerp(28, 56, dl), lerp(20, 36, dl)])); ctx.fillStyle = g; rr(ctx, dx, dy, 420, 78, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 1.5; for (var k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(dx + 8, dy + 12 + k * 14 + 3 * Math.sin(k + i)); ctx.bezierCurveTo(dx + 140, dy + 8 + k * 14, dx + 280, dy + 16 + k * 14, dx + 412, dy + 10 + k * 14); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,224,180,' + 0.20 * dl + ')'; rr(ctx, dx, dy, 420, 6, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,224,180,' + 0.10 * dl + ')'; rr(ctx, dx, dy, 6, 78, 3); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.30)'; rr(ctx, dx, dy + 72, 420, 6, 3); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.40)'; ctx.beginPath(); ctx.arc(dx + 212, dy + 42, 10, 0, TAU); ctx.fill();
      g = ctx.createRadialGradient(dx + 207, dy + 35, 1, dx + 210, dy + 39, 11); g.addColorStop(0, sh([lerp(150, 222, dl), lerp(150, 222, dl), lerp(160, 230, dl)])); g.addColorStop(1, sh([lerp(60, 96, dl), lerp(60, 98, dl), lerp(70, 108, dl)])); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx + 210, dy + 39, 10, 0, TAU); ctx.fill();
    }
    g = ctx.createRadialGradient(800, 690, 40, 800, 690, 700); g.addColorStop(0, 'rgba(255,200,120,' + 0.16 * lamp + ')'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(e.l, 676, e.r - e.l, e.b - 676);
    /* a mug of tea going cold, a thread of steam still rising; its shadow lies on the bench */
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(1332, 566, 48, 8, 0, 0, TAU); ctx.fill();
    g = ctx.createLinearGradient(1290, 0, 1360, 0); g.addColorStop(0, sh([104, 150, 192])); g.addColorStop(0.55, sh([70, 110, 150])); g.addColorStop(1, sh([40, 66, 96])); ctx.fillStyle = g; rr(ctx, 1290, 494, 70, 68, 8); ctx.fill();
    ctx.strokeStyle = sh([40, 66, 96]); ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(1366, 526, 18, -1.25, 1.25); ctx.stroke(); ctx.strokeStyle = sh([96, 140, 180]); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(1364, 526, 17, -1.1, 0.2); ctx.stroke();
    ctx.fillStyle = sh([122, 168, 208]); ctx.beginPath(); ctx.ellipse(1325, 494, 35, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a1e16'; ctx.beginPath(); ctx.ellipse(1325, 495, 29, 4.6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(1318, 494, 10, 1.6, 0, 0, TAU); ctx.fill();
    ctx.lineCap = 'round'; for (i = 0; i < 3; i++) { var sx0 = 1312 + i * 12; ctx.strokeStyle = 'rgba(255,255,255,' + (0.05 + 0.04 * lamp) + ')'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(sx0, 488); ctx.bezierCurveTo(sx0 - 10 + 8 * Math.sin(t * 1.1 + i), 468, sx0 + 12 + 8 * Math.sin(t * 0.9 + i * 2), 450, sx0 + 2 + 10 * Math.sin(t * 0.7 + i), 428); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.10 + 0.06 * lamp) + ')'; ctx.lineWidth = 3; ctx.stroke(); }
    /* the screwdriver on the bench, and its shadow */
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(303, 562); ctx.lineTo(423, 558); ctx.stroke(); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(423, 558); ctx.lineTo(563, 554); ctx.stroke();
    ctx.strokeStyle = sh([200, 60, 50]); ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(300, 556); ctx.lineTo(420, 552); ctx.stroke(); ctx.strokeStyle = sh([240, 120, 110]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(302, 553); ctx.lineTo(418, 549); ctx.stroke(); ctx.strokeStyle = sh([170, 175, 185]); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(420, 552); ctx.lineTo(560, 548); ctx.stroke();
    /* the charging pad with its little lamp: amber while asleep, green when it wakes */
    ctx.fillStyle = sh([40, 42, 50]); ctx.beginPath(); ctx.ellipse(800, 560, 190, 26, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = sh([64, 68, 80]); ctx.beginPath(); ctx.ellipse(800, 552, 190, 26, 0, 0, TAU); ctx.fill();
    var padCol = p.awake > 0.5 ? 'rgba(120,255,160,A)' : 'rgba(255,180,70,A)', padA = p.awake > 0.5 ? 0.9 : 0.5 + 0.4 * Math.sin(t * 1.5);
    glow(ctx, 960, 548, 40, padCol, padA); ctx.fillStyle = padCol.replace('A', 1); ctx.beginPath(); ctx.arc(960, 548, 6, 0, TAU); ctx.fill();
    if (p.draw) p.draw(ctx);
    vignette(0.5);
  }

  /* ---------- the photo on Nuala's phone: a bright afternoon, a hazy sky, blue hills far off, the lamb on the near slope with her shadow on the grass, the sun catching the lens ---------- */
  function photo(ctx, w, h, t) {
    var g = ctx.createLinearGradient(0, 0, 0, h * 0.6); g.addColorStop(0, '#7fbbf2'); g.addColorStop(0.7, '#cfe6fb'); g.addColorStop(1, '#eaf2f8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#93adc4'; ctx.beginPath(); ctx.moveTo(0, h * 0.52); ctx.quadraticCurveTo(w * 0.25, h * 0.36, w * 0.5, h * 0.46); ctx.quadraticCurveTo(w * 0.78, h * 0.33, w, h * 0.47); ctx.lineTo(w, h * 0.62); ctx.lineTo(0, h * 0.62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6f927c'; ctx.beginPath(); ctx.moveTo(0, h * 0.58); ctx.quadraticCurveTo(w * 0.4, h * 0.45, w, h * 0.55); ctx.lineTo(w, h * 0.64); ctx.lineTo(0, h * 0.64); ctx.closePath(); ctx.fill();
    g = ctx.createLinearGradient(0, h * 0.55, 0, h); g.addColorStop(0, '#a3d456'); g.addColorStop(0.45, '#6fae3a'); g.addColorStop(1, '#3d7a25');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, h * 0.60); ctx.quadraticCurveTo(w * 0.5, h * 0.51, w, h * 0.58); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,90,30,0.45)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    for (var i = 0; i < 90; i++) { var x = h1(i) * w, y = h * 0.60 + h1(i + 30) * h * 0.40, l = 4 + 9 * h1(i + 2) * (0.4 + (y - h * 0.6) / h); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1.5, y - l); ctx.moveTo(x + 2, y); ctx.lineTo(x + 3.5, y - l * 0.8); ctx.stroke(); }
    C.glow(ctx, w * 0.86, h * 0.08, h * 0.36, 'rgba(255,250,220,A)', 0.55);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(w * 0.28, h * 0.17, w * 0.11, h * 0.045, 0, 0, TAU); ctx.ellipse(w * 0.58, h * 0.11, w * 0.14, h * 0.05, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(25,60,15,0.30)'; ctx.beginPath(); ctx.ellipse(w * 0.52, h * 0.875, w * 0.17, h * 0.035, 0, 0, TAU); ctx.fill();
    C.light.k = 1.08; C.light.cool = 0; C.light.warm = 0.22;
    ctx.save(); ctx.translate(w * 0.5, h * 0.40); ctx.scale(h * 0.19, h * 0.19); C.lamb(ctx, { t: t, fear: 0, safe: 1, cold: 0, look: [0.15, -0.1], tilt: 0.08, wet: 0 }); ctx.restore();
    C.light.k = 1; C.light.warm = 0;
    g = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.35, w * 0.5, h * 0.5, h * 0.95); g.addColorStop(0, 'rgba(20,30,10,0)'); g.addColorStop(1, 'rgba(20,30,10,0.30)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w * 0.72, h * 0.3); ctx.rotate(-0.55); ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(-w * 0.03, -h * 1.5, w * 0.06, h * 3); ctx.restore();
  }

  window.SearchScene = { W: W, H: H, ctx: ctx, canvas: canvas, size: size, begin: begin, edges: edges, hill: hill, workshop: workshop, photo: photo, snow: snow, vignette: vignette };
})();
