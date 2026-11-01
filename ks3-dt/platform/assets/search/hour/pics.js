/* PROTOTYPE. The pictures Version 2 adds (spec V2 §5.6, §6, §7, §8): the trail of hoof-prints up the hill, the lamb's window,
   BEEP's view from above of the walled fields, and the stills of the opening. Each draws on the ctx it is given, in stage units (1600 x 900).
   The wall, gate, rush and torch recipes are copies of scene.js, made to take a ctx. */
(function () {
  'use strict';
  var C = window.SearchChars, Sc = window.SearchScene, TAU = C.TAU, clamp = C.clamp, lerp = C.lerp, smooth = C.smooth, sh = C.sh, rr = C.rr, glow = C.glow;
  var P = {};
  function fract(x) { return x - Math.floor(x); }
  function h1(n) { return fract(Math.sin(n * 127.1 + 311.7) * 43758.5453); }
  function hump(t, t0, d) { var u = (t - t0) / d; return u <= 0 || u >= 1 ? 0 : Math.pow(Math.sin(u * Math.PI), 1.5); }
  function light(k, cool, warm) { C.light.k = k; C.light.cool = cool; C.light.warm = warm; }
  function blinkAt(t, seed) { var u = fract(t / 3.9 + (seed || 0)); return u < 0.035 ? 1 - Math.abs(u - 0.0175) / 0.0175 : 0; }
  P.h1 = h1; P.hump = hump;

  /* ---------- copies of the scene.js recipes, ctx first ---------- */
  function wallLine(c, x0, y0, x1, y1, hgt, seed) {
    var len = Math.hypot(x1 - x0, y1 - y0), courses = Math.max(2, Math.round(hgt / 13)), ch = hgt / courses, k = 0, x, u, y, w, g, cc;
    for (cc = 0; cc < courses; cc++) {
      x = x0 - 8 - 14 * h1(seed + cc * 31);
      while (x < x0 + len) {
        w = 15 + 24 * h1(seed + k * 7 + cc * 13); k++;
        u = clamp((x + w / 2 - x0) / len, 0, 1); y = lerp(y0, y1, u) - cc * ch;
        g = 48 + 24 * h1(seed + k * 3);
        c.fillStyle = sh([g, g + 2, g + 11]); rr(c, x, y - ch + 1.2, w - 2.2, ch - 1.6, 2.5); c.fill();
        c.fillStyle = 'rgba(200,210,235,' + (0.10 + 0.10 * h1(k + seed)) + ')'; rr(c, x + 1, y - ch + 1.2, w - 4.2, ch * 0.32, 2); c.fill();
        x += w;
      }
    }
    var ym = lerp(y0, y1, 0.5); g = c.createLinearGradient(0, ym - hgt * 0.45, 0, ym + 3); g.addColorStop(0, 'rgba(10,14,30,0)'); g.addColorStop(1, 'rgba(10,14,30,0.40)'); c.fillStyle = g; c.fillRect(x0 - 10, ym - hgt * 0.45, len + 20, hgt * 0.45 + 3);
    for (x = x0 - 6; x < x0 + len + 6; x += 13) { u = clamp((x - x0) / len, 0, 1); y = lerp(y0, y1, u) - hgt; c.fillStyle = 'rgba(246,249,255,' + (0.85 + 0.1 * h1(x + seed)) + ')'; c.beginPath(); c.ellipse(x, y + 1, 9 + 3 * h1(x * 3 + seed), 3.2 + 1.6 * h1(x * 5 + seed), 0, 0, TAU); c.fill(); }
  }
  /* the same wall drawn smaller, for distance: s scales the stones */
  function wallAt(c, x0, y0, x1, y1, hgt, seed, s) { c.save(); c.translate(x0, y0); c.scale(s, s); wallLine(c, 0, 0, (x1 - x0) / s, (y1 - y0) / s, hgt / s, seed); c.restore(); }
  function gate(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.strokeStyle = sh([70, 56, 44]); c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); for (var i = 0; i < 5; i++) { c.moveTo(-70, -20 - i * 16); c.lineTo(70, -24 - i * 16); } c.moveTo(-70, -8); c.lineTo(-70, -100); c.moveTo(70, -8); c.lineTo(70, -100); c.moveTo(-66, -22); c.lineTo(66, -86); c.stroke();
    c.fillStyle = sh([246, 249, 255], 0.9); for (i = 0; i < 5; i++) { c.beginPath(); c.ellipse(0, -24 - i * 16 - 3, 72, 2.5, 0, 0, TAU); c.fill(); }
    c.restore();
  }
  function rushAt(c, x, y, s, seed) {
    var j, n = 4 + Math.floor(3 * h1(seed + 90)); c.strokeStyle = 'rgba(34,38,66,0.62)'; c.lineCap = 'round';
    c.fillStyle = 'rgba(40,46,80,0.16)'; c.beginPath(); c.ellipse(x + 4 * s, y + 2, 12 * s, 3 * s, 0, 0, TAU); c.fill();
    for (j = 0; j < n; j++) { var a = -1.15 - 0.95 * (j / n) + 0.3 * h1(seed * 7 + j), len = (9 + 11 * h1(seed * 3 + j)) * s, bx = x + j * 2.2 * s; c.lineWidth = 1.4 * s + 0.4; c.beginPath(); c.moveTo(bx, y); c.quadraticCurveTo(bx + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.6, bx + Math.cos(a) * len + 3 * s, y + Math.sin(a) * len); c.stroke(); }
  }
  function torchCone(c, x, y, ang, len, a) {
    c.save(); c.translate(x, y); c.rotate(ang);
    var g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(255,240,200,' + a + ')'); g.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(len, -len * 0.30); c.lineTo(len, len * 0.30); c.closePath(); c.fill();
    c.restore();
  }

  /* ---------- labels in the picture: Caveat, white with a dark edge, an optional curved arrow ---------- */
  function arrow(c, a, b, col, bend) {
    var bd = bend == null ? 0.18 : bend, mx = (a[0] + b[0]) / 2 + (b[1] - a[1]) * bd, my = (a[1] + b[1]) / 2 - (b[0] - a[0]) * bd, ang = Math.atan2(b[1] - my, b[0] - mx), i;
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (i = 0; i < 2; i++) {
      c.strokeStyle = i ? (col || '#fff') : 'rgba(8,10,22,0.8)'; c.lineWidth = i ? 3 : 7;
      c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(mx, my, b[0], b[1]);
      c.moveTo(b[0] - 16 * Math.cos(ang - 0.45), b[1] - 16 * Math.sin(ang - 0.45)); c.lineTo(b[0], b[1]); c.lineTo(b[0] - 16 * Math.cos(ang + 0.45), b[1] - 16 * Math.sin(ang + 0.45));
      c.stroke();
    }
  }
  P.label = function (c, text, x, y, o) {
    o = o || {}; var size = o.size || 30;
    c.save(); c.globalAlpha *= o.a == null ? 1 : clamp(o.a, 0, 1);
    if (o.to) arrow(c, o.from || [x, y + size * 0.55], o.to, o.col, o.bend);
    c.font = '700 ' + size + 'px Caveat, cursive'; c.textAlign = o.align || 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    if (o.pill) { var tw = c.measureText(text).width, px = o.align === 'center' ? x - tw / 2 : x; c.save(); c.fillStyle = 'rgba(8,10,22,0.62)'; c.beginPath(); if (c.roundRect) c.roundRect(px - 16, y - size * 0.62, tw + 32, size * 1.24, size * 0.4); else c.rect(px - 16, y - size * 0.62, tw + 32, size * 1.24); c.fill(); c.restore(); }
    c.strokeStyle = 'rgba(8,10,22,0.85)'; c.lineWidth = Math.max(5, size * 0.22); c.strokeText(text, x, y); c.fillStyle = o.col || '#fff'; c.fillText(text, x, y);
    c.restore();
  };

  /* ---------- snow ---------- */
  /* on the main canvas: scene.js's flakes, in passes, so mul can go past 1 (§5.5: the snow thickens) */
  P.snow = function (t, wind, mul) { var e = Sc.edges(); for (var k = 0; k < Math.ceil(mul - 1e-6); k++) Sc.snow(t + k * 37.3, wind, Math.min(1, mul - k), e); };
  /* on any other canvas (the lamb's window): its own flakes, sized to the space */
  var FL2 = []; (function () { for (var i = 0; i < 160; i++) FL2.push({ x: h1(i + 3000), y: h1(i + 3500), z: 0.3 + 0.7 * h1(i + 3900), w: h1(i + 4300) }); })();
  function flakes(c, w, h, t, dens, sz) {
    for (var i = 0; i < FL2.length * clamp(dens, 0, 1); i++) {
      var f = FL2[i], r = (0.6 + 1.9 * f.z) * sz, x = f.x * w + t * (6 + 22 * f.z) * sz + Math.sin(t * 1.3 + f.w * 9) * 5 * f.z * sz, y = f.y * h + t * (14 + 34 * f.z) * sz;
      x = ((x % (w + 20)) + w + 20) % (w + 20) - 10; y = ((y % (h + 20)) + h + 20) % (h + 20) - 10;
      c.fillStyle = 'rgba(245,248,255,' + (0.35 + 0.55 * f.z) + ')'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
  }

  /* ================= THE TRAIL (chapter 1) =================
     The hill from above at a slant. s is metres up the trail from the gate; print j sits at s = 10j; the stone wall at the top is at s = 210.
     tpos(s) gives the point on the picture and k, how near it is (1 at the gate, 0.45 at the top). */
  function tpos(s) {
    var z = clamp(s / 210, 0, 1), g = (1 - Math.pow(1 - 0.75 * z, 1.8)) / 0.9175, k = 1 - 0.55 * z;
    return { x: 470 + k * (120 * Math.sin(s / 40) + 40 * Math.sin(s / 17)), y: 800 - 620 * g, k: k };
  }
  P.tpos = tpos;
  var TRS = []; (function () { for (var s = -10; s <= 215; s += 5) TRS.push(tpos(s)); })();
  function trailXAt(y) { var best = TRS[0], i; for (i = 1; i < TRS.length; i++) if (Math.abs(TRS[i].y - y) < Math.abs(best.y - y)) best = TRS[i]; return best.x; }
  function depth(y) { return clamp(0.45 + 0.55 * (y - 180) / 620, 0.4, 1.1); }
  /* one lamb's print: two cloven halves, foreshortened by the slant */
  function hoof(c, x, y, ang, s, col) {
    c.save(); c.translate(x, y); c.scale(1, 0.62); c.rotate(ang); c.fillStyle = col;
    c.beginPath(); c.ellipse(-2.1 * s, 0, 1.7 * s, 3.4 * s, -0.14, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(2.1 * s, 0, 1.7 * s, 3.4 * s, 0.14, 0, TAU); c.fill();
    c.restore();
  }
  function printAt(c, j, st, t) {
    var p = tpos(10 * j), q = tpos(10 * j + 1), r = tpos(10 * j - 1), ang = Math.atan2(q.y - r.y, q.x - r.x) + Math.PI / 2, k = p.k, hs = 2.7 * k;
    var nx = -(q.y - r.y), ny = q.x - r.x, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    var lit = st.lit && st.lit[j], fill = st.fill ? st.fill[j] || 0 : 0, fl = st.flare ? st.flare[j] || 0 : 0, a;
    var feet = [[-5 * k, 3 * k], [5 * k, -3 * k]];
    if (lit) {
      glow(c, p.x, p.y, 40 * k, 'rgba(255,214,120,A)', 0.55 + 0.35 * fl);
      feet.forEach(function (f) { hoof(c, p.x + nx * f[0], p.y + ny * f[0] + f[1] * 0.6, ang, hs, '#ffd27a'); });
      if (fl > 0) {
        c.strokeStyle = 'rgba(255,236,170,' + 0.9 * fl + ')'; c.lineWidth = 3 * k; c.beginPath(); c.ellipse(p.x, p.y, (8 + 52 * (1 - fl)) * k, (5 + 30 * (1 - fl)) * k, 0, 0, TAU); c.stroke();
        for (var i = 0; i < 8; i++) { var an = i * 0.785 + j, d = (6 + 44 * (1 - fl)) * k; c.fillStyle = 'rgba(250,252,255,' + 0.8 * fl + ')'; c.beginPath(); c.arc(p.x + Math.cos(an) * d, p.y + Math.sin(an) * d * 0.6 - 16 * (1 - fl) * k, (2 + 3 * (1 - fl)) * k, 0, TAU); c.fill(); }
      }
    } else {
      a = 0.75 * (1 - fill); if (a <= 0.01) return;
      feet.forEach(function (f) { hoof(c, p.x + nx * f[0], p.y + ny * f[0] + f[1] * 0.6, ang, hs, 'rgba(60,70,110,' + a + ')'); });
    }
  }
  /* st: t, snowT, snowMul, wind, cam {x, y, z}, dark 0..0.45, black 0..1, ring 0..1 (BEEP's lights in the black),
     lit[], fill[], flare[] (by print 1..20), beep {s, torch, mood, look, sweep, flicker, jolt, tilt},
     nuala (0..1 shown), wool 0..1 (lit by the torch), labelPrints 0..1, litLabel (text or null) */
  P.trail = function (c, st) {
    var t = st.t, cam = st.cam || { x: 500, y: 480, z: 1 }, dk = st.dark || 0, i, x, y, g;
    light(lerp(0.92, 0.72, dk / 0.45), 0.75, 0);
    c.save(); c.translate(500, 480); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y);
    /* the sky over the top wall, the last light gone violet */
    g = c.createLinearGradient(0, -400, 0, 200); g.addColorStop(0, '#080a1c'); g.addColorStop(0.62, '#262852'); g.addColorStop(1, '#5d5b88'); c.fillStyle = g; c.fillRect(-600, -400, 2800, 600);
    /* the far ridge, then the stone wall along the top of the hill */
    c.fillStyle = '#4c5378'; c.beginPath(); c.moveTo(-600, 200); for (x = -600; x <= 2200; x += 20) c.lineTo(x, 150 + 10 * Math.sin(x / 90) + 7 * Math.sin(x / 37 + 1)); c.lineTo(2200, 200); c.closePath(); c.fill();
    /* the slope, far to near, lighter as it comes towards us */
    g = c.createLinearGradient(0, 176, 0, 900); g.addColorStop(0, '#8e97b8'); g.addColorStop(1, '#d9def0'); c.fillStyle = g; c.fillRect(-600, 176, 2800, 1000);
    wallAt(c, -300, 186, 1900, 176, 30, 11, 0.5);
    /* soft ripples in the snow, each with a blue shadow on its downhill side */
    for (i = 0; i < 46; i++) { y = 200 + h1(i + 40) * 680; var dp = depth(y); x = -100 + h1(i + 90) * 1300; c.fillStyle = 'rgba(70,80,135,0.10)'; c.beginPath(); c.ellipse(x + 6 * dp, y + 5 * dp, (60 + 140 * h1(i + 7)) * dp, (5 + 8 * h1(i + 8)) * dp, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.13)'; c.beginPath(); c.ellipse(x, y, (60 + 140 * h1(i + 7)) * dp, (5 + 8 * h1(i + 8)) * dp, 0, 0, TAU); c.fill(); }
    for (i = 0; i < 34; i++) { y = 214 + h1(i + 300) * 600; x = -60 + h1(i + 360) * 1150; if (Math.abs(x - trailXAt(y)) < 80 * depth(y)) continue; rushAt(c, x, y, depth(y) * 1.1, 600 + i); }
    /* the near wall with the gate standing open */
    wallLine(c, -400, 878, 404, 872, 62, 31); wallLine(c, 536, 871, 2000, 880, 62, 47);
    c.fillStyle = sh([70, 56, 44]); c.fillRect(398, 800, 10, 76); c.fillRect(532, 800, 10, 76); c.fillStyle = 'rgba(246,249,255,0.9)'; c.beginPath(); c.ellipse(403, 800, 9, 3.5, 0, 0, TAU); c.ellipse(537, 800, 9, 3.5, 0, 0, TAU); c.fill();
    gate(c, 610, 876, 0.62);
    /* the dusk going: a dark wash over the land, under everything that gives light */
    if (dk > 0) { c.fillStyle = 'rgba(6,8,26,' + dk + ')'; c.fillRect(-600, -400, 2800, 1600); }
    /* the trail */
    for (i = 1; i <= 20; i++) printAt(c, i, st, t);
    /* the wool on the top wall, at the end of the trail */
    var top = tpos(210), wl = st.wool || 0;
    if (wl > 0) glow(c, top.x + 6, top.y - 14, 60, 'rgba(255,230,160,A)', 0.7 * wl);
    for (i = 0; i < 6; i++) { c.fillStyle = 'rgba(244,236,214,' + (0.35 + 0.65 * wl) + ')'; c.beginPath(); c.arc(top.x + 6 + (h1(i + 70) - 0.5) * 14, top.y - 15 + (h1(i + 80) - 0.5) * 8, 3 + 2.5 * h1(i + 90), 0, TAU); c.fill(); }
    if (st.labelPrints) P.label(c, 'her hoof-prints', 640, 670, { a: st.labelPrints, to: [568, 706], from: [636, 684], size: 34 });
    /* Nuala by the gate, worried, her torch on the first print */
    if (st.nuala) {
      c.save(); c.globalAlpha = st.nuala;
      var nx = 215, ny = 548, ns = 100, ang = 0.86 + 0.05 * Math.sin(t * 0.8);
      torchCone(c, nx + 1.87 * ns, ny + 0.67 * ns, ang, 260, 0.20); glow(c, nx + 1.87 * ns, ny + 0.67 * ns, 30, 'rgba(255,236,180,A)', 0.6);
      c.fillStyle = 'rgba(10,14,40,0.22)'; c.beginPath(); c.ellipse(nx + 10, ny + 2.38 * ns, 70, 13, 0, 0, TAU); c.fill();
      c.save(); c.translate(nx, ny); c.scale(ns, ns); C.nuala(c, { t: t, torch: ang, phone: 1, walk: 0, look: [0.4, 0.15], blink: blinkAt(t, 0.3), worry: 1 }); c.restore();
      c.restore();
    }
    if (st.beep) beepOnTrail(c, st.beep, t);
    c.restore();
    /* in front of the picture: the snow, the lit count, the dark */
    P.snow(st.snowT == null ? t : st.snowT, st.wind == null ? 0.55 : st.wind, st.snowMul == null ? 0.7 : st.snowMul);
    if (st.litLabel) P.label(c, st.litLabel, 56, 186, { size: 38, pill: true });
    if (st.black) { var e = Sc.edges(); c.fillStyle = 'rgba(0,0,0,' + st.black + ')'; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t); }
    if (st.ring) ringOfLights(c, 500, 470, st.ring, t);
  };
  function beepOnTrail(c, b, t) {
    var G = tpos(b.s), k = G.k, sc = 46 * k, bob = Math.sin(t * 2.4) * 4 * k, jx = b.jolt ? Math.sin(t * 60) * 7 * b.jolt : 0;
    var cx = G.x + jx, cy = G.y - 110 * k + bob - 12 * (b.jolt || 0);
    var tor = (b.torch || 0) * (b.flicker ? (h1(Math.floor(t * 16) + 7) > 0.5 ? 1 - b.flicker : 1 - 0.3 * b.flicker) : 1);
    var px = G.x + (b.sweep || 0) * 70 * k, py = G.y;
    c.fillStyle = 'rgba(10,14,40,0.22)'; c.beginPath(); c.ellipse(G.x + 10 * k, G.y + 4 * k, 40 * k, 9 * k, 0, 0, TAU); c.fill();
    if (tor > 0) {
      glow(c, px, py, 70 * k, 'rgba(255,236,180,A)', 0.55 * tor);
      c.fillStyle = 'rgba(255,242,205,' + 0.30 * tor + ')'; c.beginPath(); c.ellipse(px, py, 36 * k, 11 * k, 0, 0, TAU); c.fill();
      var lx = cx, ly = cy + 0.93 * sc, g = c.createLinearGradient(lx, ly, px, py); g.addColorStop(0, 'rgba(255,240,200,' + 0.42 * tor + ')'); g.addColorStop(1, 'rgba(255,240,200,' + 0.10 * tor + ')');
      c.fillStyle = g; c.beginPath(); c.moveTo(lx - 4 * k, ly); c.lineTo(lx + 4 * k, ly); c.lineTo(px + 36 * k, py); c.lineTo(px - 36 * k, py); c.closePath(); c.fill();
    }
    var mood = b.mood == null ? 0.6 : b.mood;
    c.save(); c.translate(cx, cy); c.scale(sc, sc);
    C.beep(c, { t: t, open: 1, blink: blinkAt(t), look: b.look || [0, 0.35], mood: mood, glow: 1, rotor: 1, antenna: 1, cheeks: mood > 0.5 ? 1 : 0.3, hover: 1, tilt: (b.tilt || 0) + 0.03 * Math.sin(t * 1.7), torch: tor });
    c.restore();
  }
  /* BEEP in the black: only its ring of lights, turned to her */
  function ringOfLights(c, x, y, a, t) {
    for (var i = 0; i < 10; i++) { var an = i / 10 * TAU, f = 0.55 + 0.45 * Math.sin(t * 3 + i * 0.7); glow(c, x + Math.cos(an) * 46, y + Math.sin(an) * 30, 16, 'rgba(255,214,120,A)', 0.5 * a * f); c.fillStyle = 'rgba(255,226,150,' + a * f + ')'; c.beginPath(); c.arc(x + Math.cos(an) * 46, y + Math.sin(an) * 30, 3.4, 0, TAU); c.fill(); }
  }
  P.ringOfLights = ringOfLights;

  /* ================= THE LAMB'S WINDOW =================
     Drawn into any rectangle: the small window in the corner (220 x 170) or the whole stage at the end of the opening.
     It is designed 170 units tall and scaled to the rectangle's height.
     st: t, cold (0.55 chapter 1 .. 1), shiver 0..1, bleat 0..1, look, baa 0..1 (the word rising), dim 0..1 */
  P.lamb = function (c, x, y, w, h, st) {
    var s = h / 170, W2 = w / s, t = st.t, cold = st.cold == null ? 0.55 : st.cold, sv = st.shiver || 0, g;
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.translate(x, y); c.scale(s, s);
    g = c.createLinearGradient(0, 0, 0, 170); g.addColorStop(0, '#0c1030'); g.addColorStop(0.6, '#252b52'); g.addColorStop(1, '#3a4170'); c.fillStyle = g; c.fillRect(-2, -2, W2 + 4, 174);
    glow(c, W2 * 0.5, 74, 120, 'rgba(150,170,255,A)', 0.16);
    light(0.82, 0.85, 0);
    wallLine(c, -12, 106, W2 + 12, 103, 42, 57);
    g = c.createLinearGradient(0, 100, 0, 170); g.addColorStop(0, '#8f99c2'); g.addColorStop(1, '#d4daf0'); c.fillStyle = g; c.fillRect(-2, 104, W2 + 4, 70);
    var jx = sv * Math.sin(t * 53) * 0.9, tilt = -0.18 + sv * 0.05 * Math.sin(t * 41);
    c.save(); c.translate(W2 * 0.5 + jx, 90); c.scale(27, 27);
    C.lamb(c, { t: t, fear: 0.85, cold: clamp(cold, 0, 1), look: st.look || [0.1, -0.45], tilt: tilt, wet: 0.45 + 0.5 * cold, huddle: 1, bleat: st.bleat || 0, blink: blinkAt(t, 0.6), breath: 0 });
    c.restore();
    /* the drift she is pressed into, deeper as she gets colder */
    var dy = 10 * cold;
    g = c.createLinearGradient(0, 112 - dy, 0, 170); g.addColorStop(0, '#e9edfa'); g.addColorStop(1, '#c3cae6'); c.fillStyle = g;
    c.beginPath(); c.moveTo(-4, 172); c.lineTo(-4, 126 - dy * 0.6); c.quadraticCurveTo(W2 * 0.25, 112 - dy, W2 * 0.5, 124 - dy * 0.7); c.quadraticCurveTo(W2 * 0.78, 134 - dy * 0.5, W2 + 4, 118 - dy * 0.8); c.lineTo(W2 + 4, 172); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.2; c.stroke();
    flakes(c, W2, 170, t, 0.35 + 0.65 * cold, 0.55);
    if (cold > 0.6) { g = c.createRadialGradient(W2 / 2, 85, 60, W2 / 2, 85, Math.max(W2, 170) * 0.75); g.addColorStop(0, 'rgba(210,228,255,0)'); g.addColorStop(1, 'rgba(210,228,255,' + 0.55 * (cold - 0.6) + ')'); c.fillStyle = g; c.fillRect(-2, -2, W2 + 4, 174); }
    if (st.baa > 0 && st.baa < 1) P.label(c, 'baaa', W2 * 0.5 + 30, 48 - 16 * st.baa, { size: 24, a: 1 - Math.pow(st.baa, 3) });
    if (st.dim) { c.fillStyle = 'rgba(0,0,0,' + st.dim + ')'; c.fillRect(-2, -2, W2 + 4, 174); }
    c.restore();
    light(1, 0, 0);
  };

  /* ================= BEEP'S VIEW FROM ABOVE (chapter 2) =================
     Three walled fields in the snow: the square field, the six-sided sheepfold, the three-cornered field. Each wall is 100 metres = 180 px.
     BEEP starts each field at its first corner, facing east. Heading h: 0 = east, a left turn adds to h. */
  var FIELDS = [
    { pts: [[90, 740], [270, 740], [270, 560], [90, 560]], seed: 3 },
    { pts: [[510, 756], [690, 756], [780, 600], [690, 444], [510, 444], [420, 600]], seed: 17 },
    { pts: [[250, 356], [430, 356], [340, 200]], seed: 29 }
  ];
  var GATES = [[0, 0, 0.14], [0, 1, 0.5], [1, 5, 0.5], [1, 3, 0.72], [2, 0, 0.84]];
  var TRACKS = [[[270, 650], [465, 678]], [[560, 444], [401, 356]]];
  P.FIELDS = FIELDS;
  function wallPts(F, i) { var a = F.pts[i], b = F.pts[(i + 1) % F.pts.length]; return [a, b]; }
  /* which side of a wall the drift lies: away from the north-west wind */
  function leeNormal(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l; if (nx * 0.6 + ny * 0.8 < 0) { nx = -nx; ny = -ny; } return [nx, ny, dx / l, dy / l, l]; }
  function driftBand(c, a, b, seed, wd, col) {
    var n = leeNormal(a, b), k, u, w;
    c.fillStyle = col; c.beginPath(); c.moveTo(a[0], a[1]);
    for (k = 0; k <= 14; k++) { u = k / 14; w = wd * (0.55 + 0.45 * Math.sin(u * Math.PI)) * (0.8 + 0.4 * h1(seed + k)); c.lineTo(lerp(a[0], b[0], u) + n[0] * w, lerp(a[1], b[1], u) + n[1] * w); }
    c.lineTo(b[0], b[1]); c.closePath(); c.fill();
  }
  function stonesAlong(c, a, b, seed) {
    var n = leeNormal(a, b), l = n[4], ux = n[2], uy = n[3], d = 0, k = 0, w, g;
    c.save(); c.lineCap = 'round'; c.strokeStyle = '#2a2e44'; c.lineWidth = 15; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    c.translate(a[0], a[1]); c.rotate(Math.atan2(uy, ux));
    while (d < l) { w = Math.min(8 + 9 * h1(seed + k * 3), l - d); g = 70 + 40 * h1(seed + k * 5); c.fillStyle = sh([g, g + 3, g + 14]); rr(c, d + 0.6, -6 + 2 * h1(seed + k), w - 1.2, 5.5, 2); c.fill(); g = 66 + 40 * h1(seed + k * 7 + 1); c.fillStyle = sh([g, g + 3, g + 14]); rr(c, d + 3, 0.5, Math.max(1, w - 1.2), 5.5, 2); c.fill(); d += w; k++; }
    /* snow along the top of the wall, in broken lengths */
    c.strokeStyle = 'rgba(248,250,255,0.92)'; c.lineWidth = 4.5; c.setLineDash([16 + 6 * h1(seed), 5]); c.lineDashOffset = 20 * h1(seed + 2); c.beginPath(); c.moveTo(2, -1); c.lineTo(l - 2, -1); c.stroke(); c.setLineDash([]);
    c.restore();
  }
  function gateTop(c, a, b, u) {
    var x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
    c.save(); c.translate(x, y); c.rotate(an);
    c.fillStyle = '#c7cee6'; c.fillRect(-14, -9, 28, 18);
    c.strokeStyle = sh([120, 92, 64]); c.lineWidth = 3; c.beginPath(); c.moveTo(-13, -3); c.lineTo(13, -3); c.moveTo(-13, 3); c.lineTo(13, 3); c.stroke();
    c.fillStyle = '#2a2e44'; c.fillRect(-17, -6, 5, 12); c.fillRect(12, -6, 5, 12);
    c.restore();
  }
  function drawField(c, F, fs, t) {
    var n = F.pts.length, i, ab, cover = smooth(clamp(fs.cover || 0, 0, 1));
    if (fs.on) { c.save(); c.strokeStyle = 'rgba(233,196,106,' + (0.22 + 0.12 * Math.sin(t * 3)) + ')'; c.lineWidth = 34; c.lineJoin = 'round'; c.beginPath(); F.pts.forEach(function (p, k) { k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); c.stroke(); c.restore(); }
    for (i = 0; i < n; i++) { ab = wallPts(F, i); driftBand(c, ab[0], ab[1], F.seed + i * 11, 18 + 12 * h1(F.seed + i) + 4 + 52 * cover, 'rgba(70,82,140,0.20)'); }
    for (i = 0; i < n; i++) { ab = wallPts(F, i); driftBand(c, ab[0], ab[1], F.seed + i * 11, 18 + 12 * h1(F.seed + i) + 52 * cover, 'rgba(250,252,255,0.92)'); }
    if (fs.found != null && fs.foundA) { ab = wallPts(F, fs.found); var nn = leeNormal(ab[0], ab[1]); glow(c, (ab[0][0] + ab[1][0]) / 2 + nn[0] * 14, (ab[0][1] + ab[1][1]) / 2 + nn[1] * 14, 70, 'rgba(255,236,170,A)', 0.7 * fs.foundA); }
    for (i = 0; i < n; i++) { ab = wallPts(F, i); stonesAlong(c, ab[0], ab[1], F.seed * 13 + i * 7); }
    for (i = 0; i < n; i++) { c.fillStyle = '#2a2e44'; c.beginPath(); c.arc(F.pts[i][0], F.pts[i][1], 8.5, 0, TAU); c.fill(); c.fillStyle = 'rgba(248,250,255,0.9)'; c.beginPath(); c.arc(F.pts[i][0] - 1, F.pts[i][1] - 1.5, 4.5, 0, TAU); c.fill(); }
    if (cover > 0) { c.save(); c.strokeStyle = 'rgba(240,244,255,' + cover + ')'; c.lineWidth = 24; c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); F.pts.forEach(function (p, k) { k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); c.stroke(); c.restore(); }
  }
  /* BEEP from above: a small ring of lights between two rotors, its torch cone ahead */
  function beepTop(c, x, y, h, t, tor) {
    c.save(); c.translate(x, y); c.rotate(-h);
    if (tor > 0) { var g = c.createLinearGradient(0, 0, 96, 0); g.addColorStop(0, 'rgba(255,240,200,' + 0.5 * tor + ')'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(8, 0); c.lineTo(96, -28); c.lineTo(96, 28); c.closePath(); c.fill(); }
    glow(c, 0, 0, 40, 'rgba(255,214,120,A)', 0.45);
    for (var sg = -1; sg <= 1; sg += 2) {
      c.fillStyle = 'rgba(225,232,255,0.30)'; c.beginPath(); c.arc(-3, sg * 18, 12, 0, TAU); c.fill();
      c.save(); c.translate(-3, sg * 18); c.rotate(t * 31 * sg); c.strokeStyle = 'rgba(40,44,70,0.55)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-11, 0); c.lineTo(11, 0); c.stroke(); c.restore();
      c.strokeStyle = '#3b3f5c'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, sg * 6); c.lineTo(-3, sg * 14); c.stroke();
    }
    c.fillStyle = '#ece8dc'; c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill(); c.strokeStyle = '#2b2a3a'; c.lineWidth = 2; c.stroke();
    for (var i = 0; i < 8; i++) { var an = i / 8 * TAU, f = 0.6 + 0.4 * Math.sin(t * 4 + i); c.fillStyle = 'rgba(255,200,90,' + f + ')'; c.beginPath(); c.arc(Math.cos(an) * 7.5, Math.sin(an) * 7.5, 1.9, 0, TAU); c.fill(); }
    c.fillStyle = '#fff4d0'; c.beginPath(); c.arc(9, 0, 2.6, 0, TAU); c.fill();
    c.restore();
  }
  function compass(c, x, y) {
    c.save(); c.translate(x, y); c.fillStyle = 'rgba(12,14,26,0.55)'; c.beginPath(); c.arc(0, 0, 34, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#e9c46a'; c.beginPath(); c.moveTo(0, -26); c.lineTo(8, 4); c.lineTo(-8, 4); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(0, 26); c.lineTo(8, 4); c.lineTo(-8, 4); c.closePath(); c.fill();
    c.restore(); P.label(c, 'N', x, y - 52, { size: 30, align: 'center' });
  }
  /* st: t, snowT, fields [{on, dim, cover, found, foundA}], ribbons [{x0, y0, x1, y1, u, wall}], beep {x, y, h, torch} or null,
     labels 0..1, count (text or null), bleat 0..1 (the arrow off the top edge), dark, black, ring */
  P.map = function (c, st) {
    var t = st.t, e = Sc.edges(), i, g;
    g = c.createLinearGradient(0, e.t, 0, e.b); g.addColorStop(0, '#a6aeca'); g.addColorStop(1, '#c4cbe2'); c.fillStyle = g; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
    for (i = 0; i < 70; i++) { var x = h1(i + 700) * 1200 - 60, y = h1(i + 760) * 900, rx = 40 + 90 * h1(i + 820), ry = rx * (0.35 + 0.3 * h1(i + 880)); c.fillStyle = 'rgba(80,92,150,0.08)'; c.beginPath(); c.ellipse(x + 5, y + 6, rx, ry, 0.5, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.13)'; c.beginPath(); c.ellipse(x, y, rx, ry, 0.5, 0, TAU); c.fill(); }
    for (i = 0; i < 40; i++) { var rx2 = h1(i + 1500) * 1000, ry2 = 120 + h1(i + 1560) * 760; c.fillStyle = 'rgba(40,46,80,0.35)'; for (var k = 0; k < 5; k++) { c.beginPath(); c.arc(rx2 + (h1(i * 5 + k) - 0.5) * 10, ry2 + (h1(i * 7 + k) - 0.5) * 8, 1.6, 0, TAU); c.fill(); } }
    c.save(); c.strokeStyle = 'rgba(110,120,170,0.30)'; c.lineWidth = 9; c.lineCap = 'round'; c.setLineDash([3, 9]);
    TRACKS.forEach(function (tr) { c.beginPath(); c.moveTo(tr[0][0], tr[0][1]); c.quadraticCurveTo((tr[0][0] + tr[1][0]) / 2 + 20, (tr[0][1] + tr[1][1]) / 2 - 30, tr[1][0], tr[1][1]); c.stroke(); });
    c.restore();
    FIELDS.forEach(function (F, fi) { var fs = (st.fields && st.fields[fi]) || {}; c.save(); c.globalAlpha = fs.dim ? 0.42 : 1; drawField(c, F, fs, t); c.restore(); });
    GATES.forEach(function (gt) { var fs = (st.fields && st.fields[gt[0]]) || {}; if (smooth(clamp(fs.cover || 0, 0, 1)) > 0.6) return; c.save(); c.globalAlpha = fs.dim ? 0.42 : 1; var ab = wallPts(FIELDS[gt[0]], gt[1]); gateTop(c, ab[0], ab[1], gt[2]); c.restore(); });
    (st.ribbons || []).forEach(function (r) {
      var x1 = lerp(r.x0, r.x1, r.u), y1 = lerp(r.y0, r.y1, r.u); c.save(); c.lineCap = 'round';
      if (r.wall) { [[24, 'rgba(255,214,120,0.22)'], [11, 'rgba(255,220,140,0.55)'], [4.5, '#fff3c8']].forEach(function (pp) { c.strokeStyle = pp[1]; c.lineWidth = pp[0]; c.beginPath(); c.moveTo(r.x0, r.y0); c.lineTo(x1, y1); c.stroke(); }); }
      else { c.strokeStyle = 'rgba(255,226,150,0.5)'; c.lineWidth = 4; c.setLineDash([10, 9]); c.beginPath(); c.moveTo(r.x0, r.y0); c.lineTo(x1, y1); c.stroke(); }
      c.restore();
    });
    if (st.beep) beepTop(c, st.beep.x, st.beep.y, st.beep.h, t, st.beep.torch == null ? 1 : st.beep.torch);
    if (st.say != null && st.beep) P.label(c, String(st.say), st.beep.x + 40, st.beep.y - 50, { size: 40, pill: true, col: '#ffe3a0' });
    compass(c, 940, 790);
    P.snow(st.snowT == null ? t : st.snowT, 0.35, 0.45);
    if (st.dark) { c.fillStyle = 'rgba(6,8,26,' + st.dark + ')'; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t); }
    P.label(c, "BEEP's view from above", 40, 146, { size: 38, a: 1 - (st.bleat || 0) }); /* gives way to the bleat arrow, which climbs through this spot */
    if (st.count) P.label(c, st.count, 56, 192, { size: 34, col: '#ffe3a0', pill: true });
    if (st.labels) {
      P.label(c, 'stone wall', 150, 808, { a: st.labels, to: [196, 752], from: [190, 790], size: 30 });
      P.label(c, 'gate', 330, 612, { a: st.labels, to: [280, 645], from: [334, 628], size: 30 });
      P.label(c, 'drift', 846, 702, { a: st.labels, to: [762, 690], from: [840, 704], size: 30 });
    }
    if (st.bleat) P.label(c, 'the bleat came from up here', 372, 146, { a: st.bleat, to: [344, 112], from: [340, 186], bend: 0, size: 32, col: '#ffe3a0' });
    if (st.black) { c.fillStyle = 'rgba(0,0,0,' + st.black + ')'; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t); }
    if (st.ring) ringOfLights(c, 500, 470, st.ring, t);
  };

  /* ================= THE OPENING'S PICTURES ================= */
  /* 1. Her phone in the dark, buzzing */
  P.phone = function (c, t, buzz) {
    var e = Sc.edges(), on = buzz * (fract(t / 1.5) < 0.55 ? 1 : 0), jx = on * Math.sin(t * 95) * 4, jr = on * Math.sin(t * 77) * 0.012, g, sg;
    c.fillStyle = '#04050a'; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
    glow(c, 800, 360, 380, 'rgba(110,140,255,A)', 0.10 + 0.08 * on);
    c.save(); c.translate(800 + jx, 360); c.rotate(jr - 0.035);
    c.fillStyle = '#17181e'; rr(c, -122, -232, 244, 464, 36); c.fill(); c.strokeStyle = '#3a3c48'; c.lineWidth = 3; c.stroke();
    g = c.createLinearGradient(0, -220, 0, 220); g.addColorStop(0, '#1b2350'); g.addColorStop(1, '#3b2954'); c.fillStyle = g; rr(c, -110, -220, 220, 440, 28); c.fill();
    c.fillStyle = '#0b0c10'; rr(c, -34, -212, 68, 18, 9); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.font = '600 66px "Space Grotesk", sans-serif'; c.fillText('4:52', 0, -110);
    c.fillStyle = 'rgba(255,255,255,0.92)'; rr(c, -98, -50, 196, 92, 18); c.fill();
    c.textAlign = 'left'; c.fillStyle = '#1a1526'; c.font = '700 19px "Space Grotesk", sans-serif'; c.fillText('NUALA', -82, -18); c.fillStyle = '#6c6476'; c.font = '500 15px "Space Grotesk", sans-serif'; c.fillText('now', 48, -18);
    c.fillStyle = '#3a3346'; c.font = '500 18px "Space Grotesk", sans-serif'; c.fillText('1 new message', -82, 14);
    c.restore();
    if (on) { c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 3; c.lineCap = 'round'; for (sg = -1; sg <= 1; sg += 2) for (var r = 0; r < 2; r++) { c.beginPath(); c.arc(800 + sg * 150, 360, 18 + r * 16, sg < 0 ? Math.PI - 0.5 : -0.5, sg < 0 ? Math.PI + 0.5 : 0.5); c.stroke(); } }
  };
  /* a plain snowy night behind the message and the photos */
  P.night = function (c, t) {
    var e = Sc.edges(), g = c.createLinearGradient(0, e.t, 0, e.b); g.addColorStop(0, '#05060f'); g.addColorStop(1, '#141832'); c.fillStyle = g; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
    P.snow(t, 0.5, 0.5);
  };
  /* 3-5. The Workshop: BEEP asleep on its pad, waking, lifting. ft is the film's own clock (live film.js, beepParams) */
  function beepParams(t, wall) {
    var open = smooth((t - 9) / 1.4) * (1 - 0.8 * hump(t, 9.7, 0.5)), lift = smooth((t - 13.2) / 1.3), toUs = smooth((t - 13.8) / 0.6);
    return { t: wall, open: open, glow: smooth((t - 10) / 0.8), antenna: smooth((t - 10.2) / 0.9), rotor: smooth((t - 12.6) / 1.0), lift: lift,
      look: t < 13.8 ? [0.6 * Math.sin(1.3 * t), -0.2 + 0.3 * Math.cos(0.9 * t)] : [0, 0.1], mood: lerp(0.15, 0.85, toUs), cheeks: toUs, hover: lift,
      tilt: -0.10 * toUs + 0.03 * Math.sin(1.7 * wall) * lift, torch: 0 };
  }
  P.workshop = function (wall, ft) {
    var bp = beepParams(ft, wall);
    Sc.workshop({ t: wall, lamp: 1, awake: ft >= 9 ? 1 : 0, draw: function (cx) {
      cx.save(); cx.translate(800, lerp(420, 285, bp.lift)); cx.scale(108, 108);
      cx.fillStyle = 'rgba(0,0,0,' + 0.18 * bp.lift + ')'; cx.beginPath(); cx.ellipse(0, 1.3 + 1.3 * bp.lift, 1.1 - 0.3 * bp.lift, 0.25 - 0.08 * bp.lift, 0, 0, TAU); cx.fill();
      C.beep(cx, bp); cx.restore();
    } });
  };
  /* 6. Dusk on the hill: Nuala by the gate, the camera easing in on her */
  P.hillShot = function (wall, u) {
    var k = smooth(clamp(u, 0, 1));
    Sc.hill({ t: wall, dusk: 0.45 + 0.1 * k, wind: 0.6, cam: { x: lerp(800, 795, k), y: lerp(450, 600, k), z: lerp(1, 2.5, k) },
      nuala: { x: 790 + 6 * Math.sin(wall * 0.5), y: 598, s: 20, ang: -0.25 + 0.4 * Math.sin(wall * 0.8), walk: 0.4 } });
  };

  /* ================= CHAPTERS 3 AND 4 FROM ABOVE (spec V2 §9, §10) =================
     One picture for both: the open hill (kind 'hill') or the lane, the yard and the barn (kind 'home').
     st: t, snowT, kind, ribbons [{x0, y0, x1, y1, u, wall}], beep {x, y, h, torch} or null, lamb {x, y, a, found} (the hill),
     ring0 0..1 (where the bleat was), gates [lit 0..1 x 6], walls [lit 0..1 x 4], door 0..1, nuala {x, y} or null,
     count (text), fade 0..1 (the bleat fading: the baaa smaller and paler), dark, black, ring, ringDim */
  var LANE_Y = 780, GATE_X = [200, 330, 460, 590, 720, 850], YARD = [[720, 640], [850, 640], [850, 510], [720, 510]], DOOR = [785, 210];
  P.LANE = { y: LANE_Y, x0: 70, gates: GATE_X, yard: YARD, door: DOOR, gate: [785, 510] };
  function groundTop(c, e, dark) {
    var g = c.createLinearGradient(0, e.t, 0, e.b); g.addColorStop(0, dark ? '#5c6488' : '#a6aeca'); g.addColorStop(1, dark ? '#7a82a6' : '#c4cbe2'); c.fillStyle = g; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
    for (var i = 0; i < 70; i++) { var x = h1(i + 900) * 1200 - 60, y = h1(i + 960) * 900, rx = 40 + 90 * h1(i + 1020), ry = rx * (0.35 + 0.3 * h1(i + 1080)); c.fillStyle = 'rgba(40,46,90,0.10)'; c.beginPath(); c.ellipse(x + 5, y + 6, rx, ry, 0.5, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.10)'; c.beginPath(); c.ellipse(x, y, rx, ry, 0.5, 0, TAU); c.fill(); }
    for (i = 0; i < 26; i++) { var hx = h1(i + 1300) * 1000, hy = h1(i + 1360) * 900; c.fillStyle = 'rgba(30,36,60,0.55)'; c.beginPath(); c.arc(hx, hy, 3 + 4 * h1(i + 1400), 0, TAU); c.fill(); c.fillStyle = 'rgba(245,248,255,0.8)'; c.beginPath(); c.arc(hx - 1, hy - 2, 2 + 2 * h1(i + 1400), 0, TAU); c.fill(); }
  }
  function lambTop(c, x, y, t, a) {
    c.save(); c.translate(x, y); c.globalAlpha = a;
    c.fillStyle = 'rgba(240,244,255,0.95)'; c.beginPath(); c.ellipse(4, 6, 30, 12, 0, 0, TAU); c.fill(); /* the drift round her */
    c.fillStyle = '#f2ead8'; for (var k = 0; k < 7; k++) { c.beginPath(); c.arc(-8 + 4 * k * 0.7, -2 + 3 * Math.sin(k * 2.1), 7, 0, TAU); c.fill(); }
    c.fillStyle = '#3b3446'; c.beginPath(); c.ellipse(14, -4 + Math.sin(t * 2) * 0.6, 6, 5, 0.3, 0, TAU); c.fill();
    c.restore();
  }
  function nualaTop(c, x, y, t) {
    c.save(); c.translate(x, y);
    glow(c, 0, -30, 60, 'rgba(255,236,170,A)', 0.35);
    c.fillStyle = '#7a3b34'; c.beginPath(); c.ellipse(0, 0, 13, 10, 0, 0, TAU); c.fill();
    c.fillStyle = '#2b2230'; c.beginPath(); c.arc(0, -2, 6, 0, TAU); c.fill();
    c.fillStyle = '#f2ead8'; c.beginPath(); c.arc(7, 4, 4.5, 0, TAU); c.fill(); /* the lamb's head, inside her coat */
    c.fillStyle = '#4a3a2c'; c.beginPath(); c.ellipse(-16, 10, 9, 5, 0.4, 0, TAU); c.fill(); /* Bran at her heels */
    c.restore();
  }
  function wallTop(c, a, b, lit, seed) {
    stonesAlong(c, a, b, seed);
    if (lit > 0) { c.save(); c.lineCap = 'round'; [[24, 'rgba(255,214,120,0.22)'], [11, 'rgba(255,220,140,0.55)'], [4.5, '#fff3c8']].forEach(function (pp) { c.globalAlpha = lit; c.strokeStyle = pp[1]; c.lineWidth = pp[0]; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }); c.restore(); }
  }
  function barnTop(c, door, t) {
    var x = door[0], y = door[1];
    c.save(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x - 128, y - 150, 270, 160);
    c.fillStyle = '#4d2f2a'; c.fillRect(x - 135, y - 160, 270, 160);
    c.strokeStyle = 'rgba(240,244,255,0.9)'; c.lineWidth = 10; c.beginPath(); c.moveTo(x - 135, y - 80); c.lineTo(x + 135, y - 80); c.stroke(); /* snow along the ridge */
    c.fillStyle = 'rgba(236,240,252,0.75)'; c.fillRect(x - 135, y - 160, 270, 34);
    c.restore();
  }
  P.plan = function (c, st) {
    var t = st.t, e = Sc.edges(), i, hill = st.kind === 'hill';
    groundTop(c, e, hill);
    if (hill) {
      if (st.ring0) { c.save(); c.strokeStyle = 'rgba(255,227,160,' + 0.8 * st.ring0 + ')'; c.lineWidth = 4; c.setLineDash([12, 10]); c.beginPath(); c.arc(540, 470, 46 + 6 * Math.sin(t * 3), 0, TAU); c.stroke(); c.restore(); }
      if (st.lamb) { if (st.lamb.found) glow(c, st.lamb.x, st.lamb.y, 90, 'rgba(255,236,170,A)', 0.6 * st.lamb.found); lambTop(c, st.lamb.x, st.lamb.y, t, st.lamb.a == null ? 1 : st.lamb.a); }
    } else {
      c.save(); c.strokeStyle = 'rgba(70,78,120,0.35)'; c.lineWidth = 46; c.lineCap = 'round'; c.beginPath(); c.moveTo(20, LANE_Y); c.lineTo(980, LANE_Y); c.stroke(); c.restore(); /* the lane */
      c.save(); c.strokeStyle = 'rgba(70,78,120,0.35)'; c.lineWidth = 40; c.beginPath(); c.moveTo(785, 510); c.lineTo(DOOR[0], DOOR[1]); c.stroke(); c.restore(); /* the path to the barn */
      barnTop(c, DOOR, t);
      var dr = st.door || 0; c.fillStyle = dr ? 'rgba(255,214,130,' + (0.5 + 0.5 * dr) + ')' : '#2a1d1a'; c.fillRect(DOOR[0] - 26, DOOR[1] - 14, 52, 16);
      if (dr) glow(c, DOOR[0], DOOR[1] + 10, 120, 'rgba(255,214,130,A)', 0.6 * dr);
      for (i = 0; i < 4; i++) { var a = YARD[i], b = YARD[(i + 1) % 4]; if (i === 2) { wallTop(c, a, [a[0] - 45, a[1]], (st.walls || [])[i] || 0, 400 + i); wallTop(c, [b[0] + 45, b[1]], b, (st.walls || [])[i] || 0, 410 + i); } else wallTop(c, a, b, (st.walls || [])[i] || 0, 400 + i); }
      GATE_X.forEach(function (gx, k) {
        var lit = (st.gates || [])[k] || 0;
        c.save(); c.translate(gx, LANE_Y); c.fillStyle = '#2a2e44'; c.fillRect(-4, -40, 8, 80); c.strokeStyle = lit ? 'rgba(255,240,190,' + (0.5 + 0.5 * lit) + ')' : sh([120, 92, 64]); c.lineWidth = 4;
        for (var r = -30; r <= 30; r += 15) { c.beginPath(); c.moveTo(-3, r); c.lineTo(3, r); c.stroke(); }
        c.beginPath(); c.moveTo(0, -34); c.lineTo(0, 34); c.lineWidth = 10; c.stroke();
        c.restore(); if (lit) glow(c, gx, LANE_Y, 60, 'rgba(255,226,150,A)', 0.55 * lit);
        P.label(c, 'gate ' + (k + 1), gx, LANE_Y - 62, { size: 24, align: 'center', a: 0.85 });
      });
    }
    (st.ribbons || []).forEach(function (r) {
      var x1 = lerp(r.x0, r.x1, r.u), y1 = lerp(r.y0, r.y1, r.u); c.save(); c.lineCap = 'round';
      [[22, 'rgba(255,214,120,0.20)'], [9, 'rgba(255,220,140,0.5)'], [3.5, '#fff3c8']].forEach(function (pp) { c.strokeStyle = pp[1]; c.lineWidth = pp[0]; c.beginPath(); c.moveTo(r.x0, r.y0); c.lineTo(x1, y1); c.stroke(); });
      if (r.label && r.u > 0.5) P.label(c, r.label, (r.x0 + r.x1) / 2 + (r.lx || 0), (r.y0 + r.y1) / 2 + (r.ly || 0), { size: 24, align: 'center', col: '#ffe3a0', a: Math.min(1, (r.u - 0.5) * 2) });
      c.restore();
    });
    if (st.nuala) nualaTop(c, st.nuala.x, st.nuala.y, t);
    if (st.beep) beepTop(c, st.beep.x, st.beep.y, st.beep.h, t, st.beep.torch == null ? 1 : st.beep.torch);
    P.snow(st.snowT == null ? t : st.snowT, 0.35, 0.45 + (st.snowMore || 0));
    if (st.dark) { c.fillStyle = 'rgba(6,8,26,' + st.dark + ')'; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t); }
    P.label(c, hill ? "BEEP's view from above: the open hill" : "BEEP's view from above: the way home", 40, 146, { size: 34 });
    if (st.count) P.label(c, st.count, 56, 192, { size: 32, col: '#ffe3a0', pill: true });
    if (hill && st.baa != null) { var f = 1 - (st.fade || 0); if (f > 0.05) P.label(c, 'baaa', 700, 250, { size: 18 + 22 * f, a: 0.25 + 0.75 * f, col: '#ffe3a0' }); }
    if (st.black) { c.fillStyle = 'rgba(0,0,0,' + st.black + ')'; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t); }
    if (st.ring) ringOfLights(c, 500, 470, st.ring * (st.ringDim ? 0.45 : 1), t);
  };

  /* ================= THE CLOSE: inside the barn (spec V2 §11.1). Nuala smiles here, and only here (worry 0) ================= */
  P.barn = function (c, t, st) {
    var e = Sc.edges(), g = c.createLinearGradient(0, e.t, 0, e.b), u = smooth(clamp(st.u || 0, 0, 1));
    g.addColorStop(0, '#2a1a12'); g.addColorStop(0.55, '#5a3a22'); g.addColorStop(1, '#8a6436'); c.fillStyle = g; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
    for (var i = 0; i < 9; i++) { c.fillStyle = 'rgba(30,18,10,0.35)'; c.fillRect(i * 190 - 20, e.t, 12, 640); }
    glow(c, 520, 220, 380, 'rgba(255,200,120,A)', 0.45);
    c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(520, 200, 12, 0, TAU); c.fill(); /* the lamp */
    g = c.createLinearGradient(0, 640, 0, e.b); g.addColorStop(0, '#c9a35a'); g.addColorStop(1, '#a8823e'); c.fillStyle = g; c.fillRect(e.l, 640, e.r - e.l, e.b - 640);
    for (i = 0; i < 120; i++) { c.strokeStyle = 'rgba(240,210,130,' + (0.3 + 0.4 * h1(i)) + ')'; c.lineWidth = 2; var sx = h1(i + 50) * 1600, sy = 650 + h1(i + 90) * 250; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 26 * (h1(i + 7) - 0.5) * 2, sy + 8); c.stroke(); }
    c.fillStyle = '#6a4a2a'; c.fillRect(160, 560, 380, 16); c.fillRect(160, 610, 380, 16); c.fillRect(160, 540, 16, 120); c.fillRect(524, 540, 16, 120); /* the pen */
    c.fillStyle = '#c9a35a'; rr(c, 980, 560, 220, 90, 10); c.fill(); /* the bale */
    c.save(); c.translate(300, 590); c.scale(52, 52); light(1, 0, 0.3); C.lamb(c, { t: t, fear: 0, cold: 0, look: [0.3, 0], tilt: 0, wet: 0, huddle: 0, bleat: 0, blink: blinkAt(t, 0.2), breath: 1 }); c.restore(); /* the ewe */
    var lx = lerp(760, 420, u); c.save(); c.translate(lx, 640); c.scale(30, 30); C.lamb(c, { t: t, fear: 0, cold: lerp(0.3, 0, u), look: [-0.5, 0], tilt: 0, wet: lerp(0.4, 0.1, u), huddle: 0, bleat: 0, blink: blinkAt(t, 0.5), breath: 1 }); c.restore();
    c.save(); c.translate(620, lerp(420, 520, u)); c.scale(70, 70); C.beep(c, { t: t, open: 1, blink: blinkAt(t), look: [-0.3, 0.2], mood: 0.95, glow: 1, rotor: lerp(1, 0.1, u), antenna: 1, cheeks: 1, hover: 1 - u, tilt: 0, torch: 0 }); c.restore();
    c.save(); c.translate(820, 560); c.scale(22, 22); C.nuala(c, { t: t, torch: 0, phone: 0, walk: 0, look: [-0.3, 0.1], blink: blinkAt(t, 0.3), worry: 0, face: 1 }); c.restore();
    light(1, 0, 0);
  };
  window.Pics = P;
})();
