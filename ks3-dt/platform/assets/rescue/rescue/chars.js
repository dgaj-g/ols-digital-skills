/* The Rescue: Billy the kitten, Bobby the puppy and Blink the owl, drawn in code on a
   Canvas 2D context. No image files.
   Units: 1 = half the width of the head. Origin = the centre of the head. y runs down.
   The caller translates, scales and rotates; these routines only draw.
   For the two who hang, the middle of the branch is at y = -1.95 and they grip it there. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ s >>> 15, 1 | s);
      t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- light: every colour goes through sh() ---------- */
  var light = { night: [0.57, 0.63, 0.80], flash: 0, lamp: 0 };
  function sh(c, a) {
    var f = light.flash, n = light.night, l = light.lamp;
    var r = c[0] * (n[0] + f * 0.62 + l * 0.42) + 235 * f * 0.07;
    var g = c[1] * (n[1] + f * 0.60 + l * 0.30) + 240 * f * 0.07;
    var b = c[2] * (n[2] + f * 0.42 + l * 0.08) + 255 * f * 0.08;
    return 'rgba(' + (r > 255 ? 255 : r | 0) + ',' + (g > 255 ? 255 : g | 0) + ',' + (b > 255 ? 255 : b | 0) + ',' + (a == null ? 1 : a) + ')';
  }

  /* ---------- fur: short strokes scattered inside an ellipse, made once ---------- */
  function makeFur(seed, n, rx, ry, cy) {
    var r = rng(seed), out = [];
    while (out.length < n) {
      var x = (r() * 2 - 1) * rx, y = (r() * 2 - 1) * ry;
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 0.96) continue;
      out.push({ x: x, y: y + cy, a: Math.atan2(y, x) + (r() - 0.5) * 0.7, l: 0.05 + r() * 0.07, d: r() < 0.5 ? 1 : 0, o: 0.035 + r() * 0.065 });
    }
    return out;
  }
  function drawFur(ctx, fur, lightC, darkC, lw) {
    ctx.lineCap = 'round'; ctx.lineWidth = lw;
    for (var i = 0; i < fur.length; i++) {
      var f = fur[i];
      ctx.strokeStyle = sh(f.d ? darkC : lightC, f.o);
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(f.a) * f.l, f.y + Math.sin(f.a) * f.l); ctx.stroke();
    }
  }

  /* ---------- the eye: the whole point of the art test ---------- */
  function drawEye(ctx, o) {
    var rx = o.rx, ry = o.ry, s = o.side, t = o.t;
    var lx = o.look[0] * rx * 0.20, ly = o.look[1] * ry * 0.20;
    var ir = rx * 0.94, asp = ry / rx;
    ctx.save(); ctx.translate(o.x, o.y);
    /* dark rim */
    ctx.fillStyle = sh(o.rim); ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.10, ry * 1.10, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = sh([232, 240, 250]); ctx.fillRect(-rx, -ry, 2 * rx, 2 * ry);
    /* iris */
    var g = ctx.createRadialGradient(lx, ly + ir * 0.30, ir * 0.08, lx, ly, ir);
    g.addColorStop(0, sh(o.iris[2])); g.addColorStop(0.50, sh(o.iris[1])); g.addColorStop(0.86, sh(o.iris[0])); g.addColorStop(1, sh(o.rim));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(lx, ly, ir, ir * asp, 0, 0, TAU); ctx.fill();
    /* pupil, wide with fear */
    var pr = ir * o.pupil;
    ctx.fillStyle = 'rgb(7,9,15)'; ctx.beginPath(); ctx.ellipse(lx, ly, pr, pr * asp, 0, 0, TAU); ctx.fill();
    /* light pooling in the bottom of the iris */
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(lx, ly + ir * 0.66 * asp, 0, lx, ly + ir * 0.66 * asp, ir * 0.80);
    g.addColorStop(0, 'rgba(210,235,255,' + (0.34 + 0.40 * light.flash) + ')'); g.addColorStop(1, 'rgba(210,235,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-rx, -ry, 2 * rx, 2 * ry);
    ctx.globalCompositeOperation = 'source-over';
    /* the shadow of the upper lid */
    g = ctx.createLinearGradient(0, -ry, 0, ry * 0.25);
    g.addColorStop(0, 'rgba(4,8,24,0.62)'); g.addColorStop(1, 'rgba(4,8,24,0)');
    ctx.fillStyle = g; ctx.fillRect(-rx, -ry, 2 * rx, 2 * ry);
    /* tears welling along the lower lid */
    if (o.wet > 0) {
      var wy = ry * (0.60 - 0.10 * o.wet);
      ctx.fillStyle = 'rgba(205,232,255,' + (0.34 + 0.22 * light.flash) + ')';
      ctx.beginPath(); ctx.moveTo(-rx, ry);
      for (var k = 0; k <= 12; k++) {
        var u = k / 12, xx = lerp(-rx, rx, u);
        ctx.lineTo(xx, wy + Math.sin(u * 9 + t * 3.1 + s) * ry * 0.035 + Math.sin(u * 4 - t * 1.7) * ry * 0.03);
      }
      ctx.lineTo(rx, ry); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 + 0.3 * light.flash) + ')'; ctx.lineWidth = rx * 0.045;
      ctx.beginPath();
      for (k = 0; k <= 12; k++) {
        u = k / 12; xx = lerp(-rx * 0.8, rx * 0.8, u);
        var yy = wy + Math.sin((0.1 + 0.8 * u) * 9 + t * 3.1 + s) * ry * 0.035 + Math.sin((0.1 + 0.8 * u) * 4 - t * 1.7) * ry * 0.03;
        if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
    /* the upper lid: outer corner pulled down, inner corner raised = worried */
    var close = o.blink;
    var yo = lerp(-ry * (1.16 - 0.74 * o.worry), ry * 1.05, close);
    var yi = lerp(-ry * 1.22, ry * 1.05, close);
    var xo = s * rx * 1.25, xi = -s * rx * 1.25, cy = (yo + yi) / 2 - ry * 0.22 * (1 - close);
    ctx.fillStyle = sh(o.lid);
    ctx.beginPath(); ctx.moveTo(xo, yo); ctx.quadraticCurveTo(0, cy, xi, yi); ctx.lineTo(xi, -ry * 2); ctx.lineTo(xo, -ry * 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = sh(o.rim); ctx.lineWidth = rx * 0.16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xo, yo); ctx.quadraticCurveTo(0, cy, xi, yi); ctx.stroke();
    /* the lower lid: pushed up by a smile */
    var sm = o.smile || 0;
    if (sm > 0.02) {
      var ly = ry * (1.05 - 0.38 * sm), lc = ry * (1.05 - 1.02 * sm);
      ctx.beginPath(); ctx.moveTo(-rx * 1.3, ly); ctx.quadraticCurveTo(0, lc, rx * 1.3, ly); ctx.lineTo(rx * 1.3, ry * 2); ctx.lineTo(-rx * 1.3, ry * 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-rx * 1.3, ly); ctx.quadraticCurveTo(0, lc, rx * 1.3, ly); ctx.stroke();
    }
    ctx.restore();
    /* the gloss: one big light, one small, one spark. These are never dimmed by the night. */
    if (close < 0.7) {
      var a = 1 - close / 0.7, bloom = 1 + 0.25 * light.flash;
      ctx.fillStyle = 'rgba(255,255,255,' + 0.96 * a + ')';
      ctx.beginPath(); ctx.ellipse(lx - rx * 0.30, ly - ry * 0.26, rx * 0.27 * bloom, ry * 0.22 * bloom, -0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + 0.85 * a + ')';
      ctx.beginPath(); ctx.arc(lx + rx * 0.34, ly + ry * 0.20, rx * 0.115, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + 0.7 * a + ')';
      ctx.beginPath(); ctx.arc(lx - rx * 0.10, ly + ry * 0.52, rx * 0.055, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* a tear: it swells on the lower lid, then runs down the cheek and drops */
  function drawTear(ctx, x, y, s, t, phase, size) {
    var u = ((t * 0.30 + phase) % 1 + 1) % 1, r, px = x, py = y;
    if (u < 0.42) { r = size * (0.25 + 0.75 * u / 0.42); }
    else {
      var v = (u - 0.42) / 0.58;
      r = size * (1 - 0.25 * v);
      py = y + v * v * 1.25; px = x + s * 0.05 * Math.sin(v * 3);
      ctx.strokeStyle = 'rgba(200,228,255,' + 0.20 * (1 - v) + ')'; ctx.lineWidth = size * 0.7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(px, py); ctx.stroke();
    }
    var g = ctx.createRadialGradient(px - r * 0.3, py - r * 0.2, r * 0.1, px, py, r * 1.2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(190,225,255,0.80)'); g.addColorStop(1, 'rgba(120,170,230,0.55)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(px, py - r * 1.7); ctx.bezierCurveTo(px + r * 1.1, py - r * 0.3, px + r * 1.0, py + r, px, py + r);
    ctx.bezierCurveTo(px - r * 1.0, py + r, px - r * 1.1, py - r * 0.3, px, py - r * 1.7); ctx.fill();
  }

  /* a limb as a tapered stroke */
  function limb(ctx, x0, y0, x1, y1, w, col, bend) {
    var mx = (x0 + x1) / 2 + (bend || 0), my = (y0 + y1) / 2;
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    /* the lit edge and the shaded edge */
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(190,212,255,' + (0.08 + 0.14 * light.flash) + ')'; ctx.lineWidth = w * 0.30;
    ctx.beginPath(); ctx.moveTo(x0 - w * 0.33, y0); ctx.quadraticCurveTo(mx - w * 0.33, my, x1 - w * 0.33, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(8,10,34,0.09)'; ctx.lineWidth = w * 0.34;
    ctx.beginPath(); ctx.moveTo(x0 + w * 0.31, y0); ctx.quadraticCurveTo(mx + w * 0.31, my, x1 + w * 0.31, y1); ctx.stroke();
    ctx.lineCap = 'round';
  }
  /* a tuft: soft spikes of fur hanging from a line */
  function tuft(ctx, x, y, w, h, n, col, lean) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w, y);
    for (var i = 0; i < n; i++) {
      var a = x - w + (2 * w) * i / n, b = x - w + (2 * w) * (i + 1) / n, k = 1 - Math.abs((i + 0.5) / n - 0.5) * 1.1;
      ctx.quadraticCurveTo(a + (b - a) * 0.2, y + h * k * 0.8, (a + b) / 2 + (lean || 0), y + h * k);
      ctx.quadraticCurveTo(b - (b - a) * 0.2, y + h * k * 0.6, b, y);
    }
    ctx.closePath(); ctx.fill();
  }
  function socket(ctx, x, y, r) {
    var g = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.55);
    g.addColorStop(0, 'rgba(30,14,30,0.26)'); g.addColorStop(1, 'rgba(30,14,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, TAU); ctx.fill();
  }
  /* drops shaken off wet fur */
  function drips(ctx, pts, t) {
    for (var i = 0; i < pts.length; i++) {
      var u = ((t * (0.55 + 0.11 * i) + i * 0.37) % 1 + 1) % 1;
      var x = pts[i][0] + u * 0.10, y = pts[i][1] + u * u * 1.5;
      ctx.fillStyle = 'rgba(190,220,255,' + 0.55 * (1 - u) + ')';
      ctx.beginPath(); ctx.ellipse(x, y, 0.022, 0.05 + 0.04 * u, 0.1, 0, TAU); ctx.fill();
    }
  }
  /* the rim of cold light down the lit side, clipped to whatever path is current */
  function rim(ctx, x0, y0, x1, y1, k) {
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createLinearGradient(x0, y0, x1, y1), a = (0.16 + 0.50 * light.flash) * (k || 1);
    g.addColorStop(0, 'rgba(170,200,255,' + a + ')'); g.addColorStop(1, 'rgba(170,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-3, -3, 6, 9);
    ctx.restore();
  }
  function shadeUnder(ctx, y0, y1, a) {
    ctx.save(); ctx.clip();
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(6,10,30,0)'); g.addColorStop(1, 'rgba(6,10,30,' + a + ')');
    ctx.fillStyle = g; ctx.fillRect(-3, y0, 6, y1 - y0 + 3);
    ctx.restore();
  }

  /* =====================================================================
     BILLY, the kitten
     ===================================================================== */
  var K = {
    fur: [242, 152, 64], dark: [196, 100, 28], lite: [252, 190, 112], white: [255, 245, 230],
    pink: [240, 138, 142], ear: [232, 140, 140], rim: [44, 22, 12], lid: [226, 134, 52],
    iris: [[22, 110, 104], [64, 198, 160], [176, 244, 196]], collar: [44, 110, 220], tag: [240, 196, 70]
  };
  var kFur = makeFur(11, 230, 0.94, 0.84, -0.04), kBody = makeFur(12, 120, 0.50, 0.85, 1.45);
  function kHead(ctx) {
    ctx.beginPath(); ctx.moveTo(-1.0, 0.05);
    ctx.bezierCurveTo(-1.06, -0.60, -0.58, -0.92, 0, -0.92);
    ctx.bezierCurveTo(0.58, -0.92, 1.06, -0.60, 1.0, 0.05);
    ctx.lineTo(1.13, 0.17); ctx.lineTo(0.97, 0.25); ctx.lineTo(1.09, 0.40); ctx.lineTo(0.89, 0.44);
    ctx.bezierCurveTo(0.70, 0.73, 0.36, 0.85, 0, 0.85);
    ctx.bezierCurveTo(-0.36, 0.85, -0.70, 0.73, -0.89, 0.44);
    ctx.lineTo(-1.09, 0.40); ctx.lineTo(-0.97, 0.25); ctx.lineTo(-1.13, 0.17); ctx.closePath();
  }
  function kEar(ctx, s, flat, tw) {
    var ax = s * 0.84, ay = -0.44, bx = s * 0.24, by = -0.88;
    var tx = lerp(s * 0.80, s * 1.46, flat) + tw, ty = lerp(-1.58, -0.94, flat);
    ctx.fillStyle = sh(K.fur);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(lerp(ax, tx, 0.6) + s * 0.10, lerp(ay, ty, 0.6), tx, ty);
    ctx.quadraticCurveTo(lerp(bx, tx, 0.5), lerp(by, ty, 0.5) - 0.10, bx, by); ctx.closePath(); ctx.fill();
    var cx = (ax + bx + tx) / 3, cy = (ay + by + ty) / 3, k = 0.58;
    ctx.fillStyle = sh(K.ear);
    ctx.beginPath(); ctx.moveTo(lerp(cx, ax, k), lerp(cy, ay, k)); ctx.quadraticCurveTo(lerp(cx, tx, 0.5) + s * 0.05, lerp(cy, ty, 0.5), lerp(cx, tx, k + 0.14), lerp(cy, ty, k + 0.14));
    ctx.lineTo(lerp(cx, bx, k), lerp(cy, by, k)); ctx.closePath(); ctx.fill();
    /* pale tufts in the ear */
    ctx.strokeStyle = sh(K.white, 0.8); ctx.lineWidth = 0.03; ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var u = 0.25 + i * 0.22;
      ctx.beginPath(); ctx.moveTo(lerp(ax, bx, u), lerp(ay, by, u) - 0.02); ctx.lineTo(lerp(lerp(ax, bx, u), tx, 0.32), lerp(lerp(ay, by, u), ty, 0.32)); ctx.stroke();
    }
  }
  function tail(ctx, x0, y0, sway, puff, t) {
    var n = 18, pts = [], i;
    for (i = 0; i <= n; i++) {
      var u = i / n;
      var x = x0 + u * 0.92 + Math.sin(u * 3.0 + t * 2.2) * 0.07 * u + sway * u * 1.2;
      var y = y0 + 0.72 * Math.sin(u * 2.6) - 0.42 * u * u;
      pts.push([x, y]);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    /* the bottle-brush of a frightened cat: soft fur past the edge, under the tail itself */
    if (puff > 0.05) {
      ctx.lineWidth = 0.035; ctx.strokeStyle = sh(K.lite, 0.55);
      for (i = 2; i <= n; i++) {
        for (var j = -1; j <= 1; j += 2) {
          var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.sqrt(dx * dx + dy * dy) || 1;
          var nx = -dy / l * j, ny = dx / l * j, w2 = lerp(0.14, 0.11, i / n) * (1 + 0.45 * puff);
          ctx.beginPath(); ctx.moveTo(pts[i][0] + nx * w2 * 0.8, pts[i][1] + ny * w2 * 0.8);
          ctx.lineTo(pts[i][0] + nx * (w2 + 0.07) + dx * 0.6, pts[i][1] + ny * (w2 + 0.07) + dy * 0.6); ctx.stroke();
        }
      }
    }
    for (i = 0; i < n; i++) {
      var w = lerp(0.28, 0.22, i / n) * (1 + 0.45 * puff);
      ctx.strokeStyle = sh((i % 5 < 3) ? K.fur : K.dark); ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
    }
    ctx.strokeStyle = sh(K.white); ctx.lineWidth = 0.22 * (1 + 0.45 * puff);
    ctx.beginPath(); ctx.moveTo(pts[n - 1][0], pts[n - 1][1]); ctx.lineTo(pts[n][0], pts[n][1]); ctx.stroke();
  }
  function kitten(ctx, p) {
    var t = p.t, fear = p.fear == null ? 1 : p.fear, grip = p.grip == null ? 1 : p.grip, s, i, joy = p.joy || 0, wv = 1 - 0.55 * joy, down = p.down || 0, wave = p.wave || 0, hop = p.hop || 0;
    var shv = (Math.sin(t * 47) + Math.sin(t * 61 + 1.3)) * 0.008 * fear;
    var bs = p.bodySway || 0, kick = Math.sin(t * 8.3), reach = p.reach || 0;
    ctx.save();
    /* arms, behind the head, up to the branch */
    /* where a front paw is: on the branch, thrown wide in the air, or down at his side once he is safe (the outer one waves, once) */
    function kp(s) {
      var x = lerp(s * 1.25 + Math.sin(t * 9 * wv + s) * 0.15, s * 0.50, grip), y = lerp(-1.0 + Math.cos(t * 8 * wv + s) * 0.2, -1.92, grip);
      if (down > 0) {
        var rx = s * 0.88, ry = 1.66, w = s < 0 ? wave : 0;
        rx = lerp(rx, s * 1.46 + Math.sin(t * 9) * 0.20, w); ry = lerp(ry, 0.12 + Math.cos(t * 9) * 0.05, w);
        x = lerp(x, rx, down); y = lerp(y, ry, down);
      }
      return [x, y];
    }
    if (hop > 0) ctx.translate(0, -Math.abs(Math.sin(t * 6.5)) * 0.11 * hop);
    for (s = -1; s <= 1; s += 2) {
      var pk = kp(s), px = pk[0], py = pk[1];
      if (s > 0 && reach > 0) continue;
      limb(ctx, s * 0.52, 0.40, px, py, 0.44, sh(K.fur), s * 0.06);
      ctx.strokeStyle = sh(K.dark, 0.8); ctx.lineWidth = 0.07;
      for (i = 0; i < 3; i++) { var u = 0.30 + i * 0.16; ctx.beginPath(); ctx.moveTo(lerp(s * 0.52, px, u) - 0.16, lerp(0.40, py, u)); ctx.lineTo(lerp(s * 0.52, px, u) + 0.16, lerp(0.40, py, u) - 0.03); ctx.stroke(); }
    }
    /* body, swinging a little more than the head */
    ctx.save(); ctx.translate(0, 0.55); ctx.rotate(bs); ctx.translate(0, -0.55);
    tail(ctx, 0.30, 2.45, bs * 0.8 + (p.wind || 0) * 0.25, fear, t);
    for (s = -1; s <= 1; s += 2) {
      var fx = s * 0.36 + kick * s * 0.07, fy = 2.92 + kick * s * 0.10;
      limb(ctx, s * 0.30, 2.05, fx, fy, 0.36, sh(K.fur), s * 0.05);
      ctx.fillStyle = sh(K.white); ctx.beginPath(); ctx.ellipse(fx, fy + 0.05, 0.21, 0.16, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = sh(K.dark, 0.5); ctx.lineWidth = 0.02;
      ctx.beginPath(); ctx.moveTo(fx - 0.06, fy + 0.08); ctx.lineTo(fx - 0.06, fy + 0.19); ctx.moveTo(fx + 0.06, fy + 0.08); ctx.lineTo(fx + 0.06, fy + 0.19); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-0.46, 0.50); ctx.bezierCurveTo(-0.66, 1.2, -0.68, 1.9, -0.50, 2.22); ctx.bezierCurveTo(-0.30, 2.52, 0.30, 2.52, 0.50, 2.22); ctx.bezierCurveTo(0.68, 1.9, 0.66, 1.2, 0.46, 0.50); ctx.closePath();
    ctx.fillStyle = sh(K.fur); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = sh(K.white); ctx.beginPath(); ctx.ellipse(0, 1.62, 0.33, 0.78, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = sh(K.dark, 0.75); ctx.lineWidth = 0.08; ctx.lineCap = 'round';
    for (i = 0; i < 4; i++) for (s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.moveTo(s * 0.70, 1.0 + i * 0.30); ctx.quadraticCurveTo(s * 0.55, 1.02 + i * 0.30, s * 0.40, 1.10 + i * 0.30); ctx.stroke(); }
    drawFur(ctx, kBody, K.lite, K.dark, 0.022);
    tuft(ctx, 0, 0.86, 0.40, 0.36, 5, sh(K.white), bs * 0.3);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-0.46, 0.50); ctx.bezierCurveTo(-0.66, 1.2, -0.68, 1.9, -0.50, 2.22); ctx.bezierCurveTo(-0.30, 2.52, 0.30, 2.52, 0.50, 2.22); ctx.bezierCurveTo(0.68, 1.9, 0.66, 1.2, 0.46, 0.50); ctx.closePath();
    shadeUnder(ctx, 0.5, 1.5, 0.0); rim(ctx, -0.7, 1.4, 0.1, 1.5, 0.9);
    ctx.restore();

    /* head */
    ctx.save(); ctx.translate(shv, shv * 0.6); ctx.rotate(0.07 * joy);
    var flat = p.earFlat == null ? 0.72 * fear : p.earFlat, tw = Math.sin(t * 31) * 0.012 * fear;
    kEar(ctx, -1, flat, tw); kEar(ctx, 1, flat, -tw);
    ctx.save(); ctx.translate(0, -0.86); ctx.scale(1, -1); tuft(ctx, 0, 0, 0.20, 0.20, 3, sh(K.fur), (p.wind || 0) * 0.10 + Math.sin(t * 6) * 0.02); ctx.restore();
    kHead(ctx); ctx.fillStyle = sh(K.fur); ctx.fill();
    ctx.save(); kHead(ctx); ctx.clip();
    /* lighter crown and cheeks, darker under the chin */
    var g = ctx.createRadialGradient(-0.25, -0.45, 0.1, 0, -0.1, 1.25);
    g.addColorStop(0, sh(K.lite, 0.75)); g.addColorStop(0.7, sh(K.lite, 0)); ctx.fillStyle = g; ctx.fillRect(-1.3, -1.1, 2.6, 2.2);
    /* white muzzle, chin and a blaze up the nose */
    ctx.fillStyle = sh(K.white);
    ctx.beginPath(); ctx.ellipse(-0.20, 0.47, 0.30, 0.23, 0.12, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.20, 0.47, 0.30, 0.23, -0.12, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0.70, 0.26, 0.20, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.10, 0.34); ctx.quadraticCurveTo(-0.05, 0.10, 0, -0.10); ctx.quadraticCurveTo(0.05, 0.10, 0.10, 0.34); ctx.closePath(); ctx.fill();
    /* tabby marks: the M on the brow, two on each cheek */
    ctx.strokeStyle = sh(K.dark, 0.85); ctx.lineCap = 'round'; ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.moveTo(-0.24, -0.86); ctx.quadraticCurveTo(-0.20, -0.66, -0.14, -0.54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -0.90); ctx.lineTo(0, -0.56); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.24, -0.86); ctx.quadraticCurveTo(0.20, -0.66, 0.14, -0.54); ctx.stroke();
    for (s = -1; s <= 1; s += 2) {
      ctx.beginPath(); ctx.moveTo(s * 1.02, 0.02); ctx.quadraticCurveTo(s * 0.90, 0.06, s * 0.80, 0.14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 1.00, 0.24); ctx.quadraticCurveTo(s * 0.88, 0.27, s * 0.76, 0.33); ctx.stroke();
    }
    drawFur(ctx, kFur, K.lite, K.dark, 0.022);
    ctx.restore();
    kHead(ctx); shadeUnder(ctx, 0.35, 0.95, 0.30);
    kHead(ctx); rim(ctx, -1.1, -0.5, 0.0, 0.1, 1);

    /* eyes */
    var look = p.look || [0, 0], blink = p.blink || 0;
    ctx.save(); kHead(ctx); ctx.clip(); socket(ctx, -0.45, 0.02, 0.36); socket(ctx, 0.45, 0.02, 0.36); ctx.restore();
    for (s = -1; s <= 1; s += 2) {
      drawEye(ctx, { x: s * 0.45, y: 0.02, rx: 0.335, ry: 0.365, side: s, look: look, pupil: lerp(0.52, 0.74, fear), worry: fear, blink: blink, wet: p.tears == null ? 1 : p.tears, smile: joy, t: t, iris: K.iris, rim: K.rim, lid: K.lid });
    }
    /* worried brows: the inner ends pulled up */
    ctx.strokeStyle = sh(K.dark, 0.55); ctx.lineWidth = 0.05; ctx.lineCap = 'round';
    for (s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.moveTo(s * 0.70, -0.40 + 0.02 * fear); ctx.quadraticCurveTo(s * 0.48, -0.52 - 0.04 * fear, s * 0.24, -0.50 - 0.12 * fear); ctx.stroke(); }
    /* nose and mouth */
    var mew = p.mouth || 0, q = Math.sin(t * 38) * 0.008 * fear;
    ctx.fillStyle = sh(K.pink);
    ctx.beginPath(); ctx.moveTo(-0.085, 0.30); ctx.quadraticCurveTo(0, 0.27, 0.085, 0.30); ctx.quadraticCurveTo(0.05, 0.40, 0, 0.415); ctx.quadraticCurveTo(-0.05, 0.40, -0.085, 0.30); ctx.fill();
    ctx.strokeStyle = sh(K.rim, 0.85); ctx.lineWidth = 0.028; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0.415); ctx.lineTo(0, 0.48); ctx.stroke();
    if (mew > 0.05) {
      var mh = 0.20 * mew, mw = 0.13 + 0.05 * mew;
      ctx.fillStyle = sh([110, 26, 40]); ctx.beginPath(); ctx.ellipse(0, 0.50 + mh * 0.75, mw, mh, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = sh([244, 128, 140]); ctx.beginPath(); ctx.ellipse(0, 0.50 + mh * 1.25, mw * 0.62, mh * 0.45, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = sh([255, 255, 250]);
      ctx.beginPath(); ctx.moveTo(-mw * 0.62, 0.50 + mh * 0.05); ctx.lineTo(-mw * 0.42, 0.50 + mh * 0.62); ctx.lineTo(-mw * 0.22, 0.50 + mh * 0.02); ctx.fill();
      ctx.beginPath(); ctx.moveTo(mw * 0.62, 0.50 + mh * 0.05); ctx.lineTo(mw * 0.42, 0.50 + mh * 0.62); ctx.lineTo(mw * 0.22, 0.50 + mh * 0.02); ctx.fill();
      ctx.strokeStyle = sh(K.rim, 0.85);
      ctx.beginPath(); ctx.moveTo(-mw * 1.25, 0.47); ctx.quadraticCurveTo(-mw * 0.6, 0.52, 0, 0.48); ctx.quadraticCurveTo(mw * 0.6, 0.52, mw * 1.25, 0.47); ctx.stroke();
    } else if (joy > 0.05) {
      /* safe: an open smile */
      ctx.fillStyle = sh([110, 26, 40]); ctx.beginPath(); ctx.moveTo(-0.12, 0.525); ctx.quadraticCurveTo(0, 0.50, 0.12, 0.525); ctx.quadraticCurveTo(0.09, 0.53 + 0.19 * joy, 0, 0.54 + 0.21 * joy); ctx.quadraticCurveTo(-0.09, 0.53 + 0.19 * joy, -0.12, 0.525); ctx.fill();
      ctx.fillStyle = sh([244, 128, 140]); ctx.beginPath(); ctx.ellipse(0, 0.55 + 0.14 * joy, 0.055, 0.05 * joy, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.22, 0.47 - 0.05 * joy); ctx.quadraticCurveTo(-0.10, 0.59, 0, 0.48); ctx.quadraticCurveTo(0.10, 0.59, 0.22, 0.47 - 0.05 * joy); ctx.stroke();
    } else {
      /* frightened: the corners pulled down and trembling, the lip a little open. A cat's resting mouth reads as a smile, so it is only used when calm. */
      var fm = smooth((fear - 0.3) / 0.4), cy = lerp(0.50, 0.615, fm), ky = lerp(0.56, 0.485, fm), my = lerp(0.48, 0.505, fm);
      if (fm > 0.5) { ctx.beginPath(); ctx.moveTo(0, 0.48); ctx.lineTo(0, my); ctx.stroke();
        ctx.fillStyle = sh([110, 26, 40]); ctx.beginPath(); ctx.moveTo(-0.075, 0.535 + q); ctx.quadraticCurveTo(0, 0.50, 0.075, 0.535 - q); ctx.quadraticCurveTo(0, 0.60 + q, -0.075, 0.535 + q); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-0.17, cy + q); ctx.quadraticCurveTo(-0.10, ky + q, 0, my); ctx.quadraticCurveTo(0.10, ky - q, 0.17, cy - q); ctx.stroke();
    }
    /* whiskers, shaking */
    ctx.strokeStyle = sh([255, 255, 255], 0.85); ctx.lineWidth = 0.016;
    for (s = -1; s <= 1; s += 2) for (i = 0; i < 3; i++) {
      var wq = Math.sin(t * 29 + i * 2 + s) * 0.02 * fear;
      ctx.beginPath(); ctx.moveTo(s * 0.34, 0.46 + i * 0.05); ctx.quadraticCurveTo(s * 0.80, 0.42 + i * 0.10 + wq, s * 1.30, 0.50 + i * 0.17 + wq * 2); ctx.stroke();
    }
    /* tears */
    if ((p.tears == null ? 1 : p.tears) > 0.2) { drawTear(ctx, -0.56, 0.34, -1, t, 0.15, 0.065); drawTear(ctx, 0.58, 0.33, 1, t, 0.68, 0.058); }
    drips(ctx, [[-0.5, 0.80], [0.3, 0.85], [0.95, 0.45]], t);
    ctx.restore();

    /* collar and name tag */
    collar(ctx, K.collar, K.tag, p.name || 'BILLY', 0.46, 0.80, p.px || 0);

    /* front paws on the branch (or thrown wide when the branch has gone) */
    for (s = -1; s <= 1; s += 2) {
      if (s > 0 && reach > 0) continue;
      var qk = kp(s), qx = qk[0], qy = qk[1];
      if (qy > 0.8) { ctx.save(); ctx.translate(qx, qy - 0.10); ctx.scale(1, -1); paw(ctx, 0, 0, 0.27, K.white, K.pink, 0, s); ctx.restore(); }
      else paw(ctx, qx, qy - 0.16, 0.27, K.white, K.pink, grip, s);
    }
    /* the paw that reaches for her as they go */
    if (reach > 0) {
      var rx2 = 1.28 + reach * 0.42, ry2 = -0.40 - reach * 0.55, rr = 0.30 + reach * 0.46;
      ctx.strokeStyle = sh(K.fur); ctx.lineCap = 'round';
      for (i = 0; i < 10; i++) {
        var u2 = i / 9; ctx.lineWidth = lerp(0.44, rr * 1.25, u2);
        ctx.strokeStyle = sh(i % 3 === 1 ? K.dark : K.fur);
        ctx.beginPath(); ctx.moveTo(lerp(0.74, rx2, u2), lerp(0.66, ry2 + rr * 0.5, u2)); ctx.lineTo(lerp(0.74, rx2, Math.min(1, u2 + 0.12)), lerp(0.66, ry2 + rr * 0.5, Math.min(1, u2 + 0.12))); ctx.stroke();
      }
      bigPaw(ctx, rx2, ry2, rr, K.white, K.pink, reach);
    }
    ctx.restore();
  }

  function collar(ctx, col, tagCol, name, w, y, px) {
    ctx.strokeStyle = sh(col); ctx.lineWidth = 0.13; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(-w, y - 0.06); ctx.quadraticCurveTo(0, y + 0.17, w, y - 0.06); ctx.stroke();
    ctx.fillStyle = sh(tagCol); ctx.beginPath(); ctx.arc(0, y + 0.24, 0.135, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.4 * light.flash) + ')'; ctx.beginPath(); ctx.arc(-0.04, y + 0.20, 0.04, 0, TAU); ctx.fill();
    if (px * 0.075 >= 7) {
      ctx.fillStyle = sh([70, 44, 8]); ctx.font = '700 0.078px "Space Grotesk", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(name, 0, y + 0.245);
    }
  }
  function paw(ctx, x, y, r, col, bean, grip, s) {
    ctx.fillStyle = sh(col);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.78, 0, 0, TAU); ctx.fill();
    for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(x + i * r * 0.58, y - r * 0.50, r * 0.34, r * 0.36, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = sh([60, 40, 30], 0.35); ctx.lineWidth = r * 0.06;
    ctx.beginPath(); ctx.moveTo(x - r * 0.29, y - r * 0.40); ctx.lineTo(x - r * 0.29, y - r * 0.05); ctx.moveTo(x + r * 0.29, y - r * 0.40); ctx.lineTo(x + r * 0.29, y - r * 0.05); ctx.stroke();
    if (grip > 0.5) {
      /* claws dug in */
      ctx.strokeStyle = sh([250, 246, 236]); ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
      for (i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.58, y - r * 0.80); ctx.lineTo(x + i * r * 0.58 + s * r * 0.05, y - r * 1.08); ctx.stroke(); }
    }
  }
  function bigPaw(ctx, x, y, r, col, bean, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25);
    ctx.fillStyle = sh(col);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.92, 0, 0, TAU); ctx.fill();
    for (var i = 0; i < 4; i++) { var an = -2.25 + i * 0.47; ctx.beginPath(); ctx.ellipse(Math.cos(an) * r * 0.95, Math.sin(an) * r * 0.95, r * 0.34, r * 0.38, an + Math.PI / 2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = sh(bean);
    ctx.beginPath(); ctx.moveTo(-r * 0.42, r * 0.22); ctx.bezierCurveTo(-r * 0.50, -r * 0.30, r * 0.50, -r * 0.30, r * 0.42, r * 0.22); ctx.bezierCurveTo(r * 0.30, r * 0.52, -r * 0.30, r * 0.52, -r * 0.42, r * 0.22); ctx.fill();
    for (i = 0; i < 4; i++) { an = -2.25 + i * 0.47; ctx.beginPath(); ctx.ellipse(Math.cos(an) * r * 0.90, Math.sin(an) * r * 0.90, r * 0.19, r * 0.23, an + Math.PI / 2, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = sh([250, 246, 236]); ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
    for (i = 0; i < 4; i++) { an = -2.25 + i * 0.47; ctx.beginPath(); ctx.moveTo(Math.cos(an) * r * 1.26, Math.sin(an) * r * 1.26); ctx.lineTo(Math.cos(an) * r * 1.46, Math.sin(an) * r * 1.46); ctx.stroke(); }
    ctx.restore();
  }

  /* =====================================================================
     BOBBY, the puppy
     ===================================================================== */
  var D = {
    fur: [236, 200, 146], dark: [150, 88, 44], deep: [112, 62, 30], lite: [250, 226, 184], white: [255, 248, 236],
    nose: [36, 26, 26], rim: [40, 22, 14], lid: [220, 180, 126], lidP: [136, 78, 38],
    iris: [[58, 32, 16], [136, 80, 36], [214, 150, 86]], collar: [214, 48, 52], tag: [240, 196, 70]
  };
  var dFur = makeFur(21, 230, 0.92, 0.88, -0.02), dBody = makeFur(22, 130, 0.58, 0.85, 1.45);
  function dHead(ctx) {
    ctx.beginPath(); ctx.moveTo(-0.98, 0.0);
    ctx.bezierCurveTo(-1.02, -0.62, -0.56, -0.96, 0, -0.96);
    ctx.bezierCurveTo(0.56, -0.96, 1.02, -0.62, 0.98, 0.0);
    ctx.bezierCurveTo(0.98, 0.54, 0.60, 0.92, 0, 0.92);
    ctx.bezierCurveTo(-0.60, 0.92, -0.98, 0.54, -0.98, 0.0); ctx.closePath();
  }
  function dEar(ctx, s, swing) {
    ctx.save(); ctx.translate(s * 0.70, -0.66); ctx.rotate(-s * 0.10 + swing);
    ctx.beginPath(); ctx.moveTo(-s * 0.16, -0.04);
    ctx.bezierCurveTo(s * 0.30, -0.22, s * 0.66, 0.20, s * 0.56, 0.86);
    ctx.bezierCurveTo(s * 0.52, 1.30, s * 0.10, 1.36, s * 0.02, 0.92);
    ctx.bezierCurveTo(-s * 0.04, 0.52, -s * 0.10, 0.26, -s * 0.16, -0.04); ctx.closePath();
    ctx.fillStyle = sh(D.dark); ctx.fill();
    ctx.save(); ctx.clip();
    var g = ctx.createLinearGradient(0, 0, s * 0.6, 1.2); g.addColorStop(0, sh(D.dark, 0)); g.addColorStop(1, sh(D.deep, 0.85));
    ctx.fillStyle = g; ctx.fillRect(-1, -0.4, 2, 2);
    ctx.restore();
    ctx.restore();
  }
  function puppy(ctx, p) {
    var t = p.t, fear = p.fear == null ? 1 : p.fear, grip = p.grip == null ? 1 : p.grip, s, i, joy = p.joy || 0, wv = 1 - 0.55 * joy, down = p.down || 0, wave = p.wave || 0, hop = p.hop || 0;
    var shv = (Math.sin(t * 43 + 1) + Math.sin(t * 57 + 2.1)) * 0.009 * fear;
    var bs = p.bodySway || 0, kick = Math.sin(t * 10.1 + 1);
    ctx.save();
    function dp(s) {
      var x = lerp(s * 1.3 + Math.sin(t * 8 * wv + s) * 0.15, s * 0.40, grip), y = lerp(-0.9 + Math.cos(t * 9 * wv + s) * 0.2, -1.95, grip);
      if (down > 0) {
        var rx = s * 0.96, ry = 1.66, w = s > 0 ? wave : 0;
        rx = lerp(rx, s * 1.62 + Math.sin(t * 9 + 1) * 0.20, w); ry = lerp(ry, 0.16 + Math.cos(t * 9 + 1) * 0.05, w);
        x = lerp(x, rx, down); y = lerp(y, ry, down);
      }
      return [x, y];
    }
    if (hop > 0) ctx.translate(0, -Math.abs(Math.sin(t * 6.5 + 1.1)) * 0.11 * hop);
    for (s = -1; s <= 1; s += 2) {
      var pd = dp(s), px = pd[0], py = pd[1];
      limb(ctx, s * 0.58, 0.42, px, py, 0.54, sh(D.fur), s * 0.16 * (1 - down));
    }
    ctx.save(); ctx.translate(0, 0.55); ctx.rotate(bs); ctx.translate(0, -0.55);
    /* a short tail, tucked under */
    limb(ctx, 0.10, 2.25, -0.20 + Math.sin(t * 14) * (0.03 + 0.34 * joy), 2.62, 0.20, sh(D.dark), 0.22);
    for (s = -1; s <= 1; s += 2) {
      var fx = s * 0.40 + kick * s * 0.09, fy = 2.86 + kick * s * 0.13;
      limb(ctx, s * 0.34, 2.02, fx, fy, 0.44, sh(D.fur), s * 0.08);
      ctx.fillStyle = sh(D.white); ctx.beginPath(); ctx.ellipse(fx, fy + 0.06, 0.26, 0.19, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = sh(D.deep, 0.45); ctx.lineWidth = 0.022;
      ctx.beginPath(); ctx.moveTo(fx - 0.08, fy + 0.10); ctx.lineTo(fx - 0.08, fy + 0.23); ctx.moveTo(fx + 0.08, fy + 0.10); ctx.lineTo(fx + 0.08, fy + 0.23); ctx.stroke();
    }
    function body() { ctx.beginPath(); ctx.moveTo(-0.54, 0.50); ctx.bezierCurveTo(-0.78, 1.2, -0.80, 1.95, -0.58, 2.24); ctx.bezierCurveTo(-0.34, 2.56, 0.34, 2.56, 0.58, 2.24); ctx.bezierCurveTo(0.80, 1.95, 0.78, 1.2, 0.54, 0.50); ctx.closePath(); }
    body(); ctx.fillStyle = sh(D.fur); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = sh(D.white); ctx.beginPath(); ctx.ellipse(0, 1.66, 0.42, 0.80, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = sh(D.dark); ctx.beginPath(); ctx.ellipse(0.62, 1.30, 0.34, 0.42, 0.3, 0, TAU); ctx.fill();
    drawFur(ctx, dBody, D.lite, D.dark, 0.022);
    tuft(ctx, 0, 0.92, 0.44, 0.34, 5, sh(D.white), bs * 0.3);
    ctx.restore();
    body(); rim(ctx, -0.8, 1.4, 0.1, 1.5, 0.9);
    ctx.restore();

    ctx.save(); ctx.translate(shv, shv * 0.5); ctx.rotate(-0.07 * joy);
    var swing = (p.wind || 0) * 0.16 + Math.sin(t * 5.2) * 0.05;
    ctx.save(); ctx.translate(0, -0.90); ctx.scale(1, -1); tuft(ctx, 0, 0, 0.16, 0.16, 3, sh(D.white), (p.wind || 0) * 0.10 + Math.sin(t * 7) * 0.02); ctx.restore();
    dHead(ctx); ctx.fillStyle = sh(D.fur); ctx.fill();
    ctx.save(); dHead(ctx); ctx.clip();
    var g = ctx.createRadialGradient(-0.25, -0.45, 0.1, 0, -0.1, 1.25);
    g.addColorStop(0, sh(D.lite, 0.8)); g.addColorStop(0.7, sh(D.lite, 0)); ctx.fillStyle = g; ctx.fillRect(-1.3, -1.1, 2.6, 2.2);
    /* the patch over one eye */
    ctx.fillStyle = sh(D.dark); ctx.beginPath(); ctx.ellipse(0.52, -0.12, 0.50, 0.58, -0.25, 0, TAU); ctx.fill();
    /* the blaze and the muzzle */
    ctx.fillStyle = sh(D.white);
    ctx.beginPath(); ctx.moveTo(-0.20, 0.30); ctx.quadraticCurveTo(-0.10, -0.40, -0.05, -0.98); ctx.lineTo(0.07, -0.98); ctx.quadraticCurveTo(0.12, -0.40, 0.22, 0.30); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0.50, 0.54, 0.40, 0, 0, TAU); ctx.fill();
    drawFur(ctx, dFur, D.lite, D.dark, 0.022);
    ctx.restore();
    dHead(ctx); shadeUnder(ctx, 0.40, 1.0, 0.28);
    dHead(ctx); rim(ctx, -1.1, -0.5, 0.0, 0.1, 1);
    dEar(ctx, -1, swing); dEar(ctx, 1, swing);

    var look = p.look || [0, 0], blink = p.blink || 0;
    ctx.save(); dHead(ctx); ctx.clip(); socket(ctx, -0.43, -0.04, 0.33); socket(ctx, 0.43, -0.04, 0.33); ctx.restore();
    for (s = -1; s <= 1; s += 2) {
      drawEye(ctx, { x: s * 0.43, y: -0.04, rx: 0.305, ry: 0.335, side: s, look: look, pupil: lerp(0.56, 0.76, fear), worry: fear, blink: blink, wet: p.tears == null ? 1 : p.tears, smile: joy, t: t + 1.7, iris: D.iris, rim: D.rim, lid: s > 0 ? D.lidP : D.lid });
    }
    /* brow spots, inner ends up */
    for (s = -1; s <= 1; s += 2) {
      ctx.save(); ctx.translate(s * 0.36, -0.52 - 0.07 * fear); ctx.rotate(s * (0.35 + 0.25 * fear - 0.45 * joy));
      ctx.fillStyle = sh(s > 0 ? D.fur : D.dark, 0.9); ctx.beginPath(); ctx.ellipse(0, 0, 0.13, 0.065, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    /* nose */
    ctx.fillStyle = sh(D.nose);
    ctx.beginPath(); ctx.moveTo(-0.17, 0.25); ctx.bezierCurveTo(-0.17, 0.14, 0.17, 0.14, 0.17, 0.25); ctx.bezierCurveTo(0.17, 0.36, 0.06, 0.43, 0, 0.43); ctx.bezierCurveTo(-0.06, 0.43, -0.17, 0.36, -0.17, 0.25); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.45 + 0.4 * light.flash) + ')'; ctx.beginPath(); ctx.ellipse(-0.05, 0.22, 0.06, 0.03, -0.2, 0, TAU); ctx.fill();
    /* mouth: turned down and trembling; it opens to whimper */
    var wh = p.mouth || 0, q = Math.sin(t * 34) * 0.010 * fear;
    ctx.strokeStyle = sh(D.rim, 0.9); ctx.lineWidth = 0.032; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0.43); ctx.lineTo(0, 0.56); ctx.stroke();
    var mc = lerp(0.70, 0.50, joy), mk = lerp(0.54, 0.70, joy);
    if (joy > 0.05 && wh <= 0.05) {
      /* safe: mouth open in a grin, tongue out */
      ctx.fillStyle = sh([96, 22, 34]); ctx.beginPath(); ctx.moveTo(-0.17, 0.61); ctx.quadraticCurveTo(0, 0.56, 0.17, 0.61); ctx.quadraticCurveTo(0.14, 0.62 + 0.20 * joy, 0, 0.63 + 0.21 * joy); ctx.quadraticCurveTo(-0.14, 0.62 + 0.20 * joy, -0.17, 0.61); ctx.fill();
      ctx.fillStyle = sh([240, 124, 136]); ctx.beginPath(); ctx.ellipse(0, 0.65 + 0.14 * joy, 0.08, 0.075 * joy, 0, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(-0.26, mc + q); ctx.quadraticCurveTo(-0.12, mk, 0, 0.56); ctx.quadraticCurveTo(0.12, mk, 0.26, mc - q); ctx.stroke();
    if (wh > 0.05) {
      ctx.fillStyle = sh([96, 22, 34]); ctx.beginPath(); ctx.ellipse(0, 0.66 + 0.05 * wh, 0.10 + 0.03 * wh, 0.10 * wh, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = sh([240, 124, 136]); ctx.beginPath(); ctx.ellipse(0, 0.70 + 0.06 * wh, 0.06, 0.045 * wh, 0, 0, TAU); ctx.fill();
    }
    /* freckles */
    ctx.fillStyle = sh(D.deep, 0.5);
    for (s = -1; s <= 1; s += 2) for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(s * (0.20 + i * 0.09), 0.50 + (i % 2) * 0.06, 0.014, 0, TAU); ctx.fill(); }
    if ((p.tears == null ? 1 : p.tears) > 0.2) { drawTear(ctx, -0.52, 0.26, -1, t, 0.45, 0.062); drawTear(ctx, 0.54, 0.26, 1, t, 0.02, 0.066); }
    drips(ctx, [[-0.85, 0.75], [0.1, 0.92], [0.9, 0.80]], t + 0.4);
    ctx.restore();

    collar(ctx, D.collar, D.tag, p.name || 'BOBBY', 0.52, 0.86, p.px || 0);
    for (s = -1; s <= 1; s += 2) {
      var qd = dp(s), qx = lerp(qd[0], s * 0.34, grip), qy = qd[1];
      if (qy > 0.8) { ctx.save(); ctx.translate(qx, qy - 0.10); ctx.scale(1, -1); paw(ctx, 0, 0, 0.33, D.white, [70, 50, 50], 0, s); ctx.restore(); }
      else paw(ctx, qx, qy - 0.18, 0.33, D.white, [70, 50, 50], 0, s);
    }
    ctx.restore();
  }

  /* =====================================================================
     BLINK, the owl. Origin = the centre of the head. open = how far the eyes are open.
     turn = radians the head has turned (a whole turn = the rewind).
     ===================================================================== */
  var O = { fur: [122, 86, 54], dark: [72, 48, 30], lite: [172, 132, 88], disc: [236, 218, 184], amber: [[196, 92, 6], [255, 172, 26], [255, 226, 110]], beak: [226, 190, 96] };
  function owl(ctx, p) {
    var t = p.t, open = p.open == null ? 1 : p.open, turn = p.turn || 0, body = p.body == null ? 1 : p.body, s, i;
    var c = Math.cos(turn), sn = Math.sin(turn);
    ctx.save();
    if (body > 0.01) {
      ctx.globalAlpha = body;
      ctx.beginPath(); ctx.moveTo(-0.95, 0.5); ctx.bezierCurveTo(-1.25, 1.4, -1.0, 2.5, 0, 2.6); ctx.bezierCurveTo(1.0, 2.5, 1.25, 1.4, 0.95, 0.5); ctx.closePath();
      ctx.fillStyle = sh(O.fur); ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = sh(O.disc, 0.9); ctx.beginPath(); ctx.ellipse(0, 1.75, 0.62, 0.95, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = sh(O.dark, 0.8); ctx.lineWidth = 0.045; ctx.lineCap = 'round';
      for (i = 0; i < 14; i++) { var bx = -0.42 + (i % 5) * 0.21 + ((i / 5 | 0) % 2) * 0.10, by = 1.15 + (i / 5 | 0) * 0.34; ctx.beginPath(); ctx.moveTo(bx - 0.06, by); ctx.lineTo(bx, by + 0.09); ctx.lineTo(bx + 0.06, by); ctx.stroke(); }
      ctx.restore();
      for (s = -1; s <= 1; s += 2) { ctx.fillStyle = sh(O.dark); ctx.beginPath(); ctx.ellipse(s * 0.98, 1.55, 0.26, 0.92, s * 0.12, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    /* head */
    var hx = sn * 0.06;
    ctx.save(); ctx.translate(hx, 0);
    if (body > 0.01) {
      ctx.globalAlpha = body;
      for (s = -1; s <= 1; s += 2) { ctx.fillStyle = sh(O.dark); ctx.beginPath(); ctx.moveTo(s * 0.50 + sn * 0.2, -0.70); ctx.lineTo(s * 0.92 + sn * 0.3, -1.42); ctx.lineTo(s * 0.90 + sn * 0.2, -0.50); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = sh(O.fur); ctx.beginPath(); ctx.ellipse(0, 0, 1.0, 0.92, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 1.0, 0.92, 0, 0, TAU); rim(ctx, -1.1, -0.5, 0.0, 0.1, 1);
      ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 1.0, 0.92, 0, 0, TAU); ctx.clip();
    if (c > 0.02) {
      /* the face slides round the head as it turns */
      ctx.translate(sn * 0.95, 0); ctx.scale(c, 1);
      if (body > 0.01) {
        ctx.globalAlpha = body;
        for (s = -1; s <= 1; s += 2) {
          ctx.fillStyle = sh(O.disc); ctx.beginPath(); ctx.ellipse(s * 0.42, 0.04, 0.50, 0.56, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = sh(O.lite, 0.7); ctx.lineWidth = 0.02;
          for (i = 0; i < 14; i++) { var an = i / 14 * TAU; ctx.beginPath(); ctx.moveTo(s * 0.42 + Math.cos(an) * 0.34, 0.04 + Math.sin(an) * 0.37); ctx.lineTo(s * 0.42 + Math.cos(an) * 0.48, 0.04 + Math.sin(an) * 0.53); ctx.stroke(); }
        }
        /* stern brows */
        ctx.strokeStyle = sh(O.dark); ctx.lineWidth = 0.12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-0.90, -0.52); ctx.quadraticCurveTo(-0.40, -0.52, 0, -0.16); ctx.quadraticCurveTo(0.40, -0.52, 0.90, -0.52); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      /* the eyes: amber, and the only thing seen at first */
      for (s = -1; s <= 1; s += 2) {
        var ex = s * 0.42, ey = 0.02, er = 0.30;
        ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, er, er * clamp(open, 0.02, 1), 0, 0, TAU); ctx.clip();
        ctx.fillStyle = 'rgb(20,12,6)'; ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
        var g = ctx.createRadialGradient(ex, ey + er * 0.2, er * 0.1, ex, ey, er * 0.95);
        g.addColorStop(0, 'rgb(' + O.amber[2].join(',') + ')'); g.addColorStop(0.55, 'rgb(' + O.amber[1].join(',') + ')'); g.addColorStop(1, 'rgb(' + O.amber[0].join(',') + ')');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, er * 0.95, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgb(8,6,6)'; ctx.beginPath(); ctx.arc(ex + (p.look ? p.look[0] : 0) * 0.04, ey + (p.look ? p.look[1] : 0) * 0.04, er * (p.pupil || 0.50), 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(ex - er * 0.28, ey - er * 0.30, er * 0.17, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(ex + er * 0.26, ey + er * 0.26, er * 0.08, 0, TAU); ctx.fill();
        ctx.restore();
      }
      if (body > 0.01) {
        ctx.globalAlpha = body;
        ctx.fillStyle = sh(O.beak); ctx.beginPath(); ctx.moveTo(-0.10, 0.20); ctx.quadraticCurveTo(0, 0.12, 0.10, 0.20); ctx.quadraticCurveTo(0.06, 0.44, 0, 0.52); ctx.quadraticCurveTo(-0.06, 0.44, -0.10, 0.20); ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else if (body > 0.01) {
      /* the back of the head */
      ctx.globalAlpha = body; ctx.strokeStyle = sh(O.dark, 0.8); ctx.lineWidth = 0.05; ctx.lineCap = 'round';
      for (i = 0; i < 18; i++) { var fx2 = -0.7 + (i % 6) * 0.28 + ((i / 6 | 0) % 2) * 0.14 + sn * 0.3, fy2 = -0.45 + (i / 6 | 0) * 0.36; ctx.beginPath(); ctx.moveTo(fx2 - 0.08, fy2); ctx.lineTo(fx2, fy2 + 0.12); ctx.lineTo(fx2 + 0.08, fy2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  window.RescueChars = { light: light, sh: sh, kitten: kitten, puppy: puppy, owl: owl };
  /* the drawing tools, lent to the hedgehog of the later chapters. Nothing in chapter 1 reads this. */
  window.RescueChars.kit = { drawEye: drawEye, drawTear: drawTear, limb: limb, tuft: tuft, socket: socket, drips: drips, rim: rim, shadeUnder: shadeUnder, makeFur: makeFur, drawFur: drawFur, rng: rng };
})();
