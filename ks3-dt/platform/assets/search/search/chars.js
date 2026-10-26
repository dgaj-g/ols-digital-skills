/* The Search, art test: the cast, drawn by code. BEEP the drone, the lamb, and Nuala by distance.
   Faces first: each face is a few big shapes a 12-year-old can read from across the room.
   Everything is drawn in a unit space; the caller translates and scales. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  /* the light on the cast: k dims, cool pushes toward dusk blue, warm toward lamplight */
  var L = { k: 1, cool: 0, warm: 0 };
  function sh(c, a) {
    var r = c[0] * L.k * (1 - 0.28 * L.cool) * (1 + 0.10 * L.warm), g = c[1] * L.k * (1 - 0.12 * L.cool) * (1 + 0.02 * L.warm), b = c[2] * L.k * (1 + 0.10 * L.cool) * (1 - 0.18 * L.warm);
    return 'rgba(' + clamp(r, 0, 255).toFixed(0) + ',' + clamp(g, 0, 255).toFixed(0) + ',' + clamp(b, 0, 255).toFixed(0) + ',' + (a == null ? 1 : a) + ')';
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function glow(ctx, x, y, r, col, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  /* ---------- a soft animal eye: big iris, wet gloss, a lid whose angle says worried or calm ---------- */
  function cuteEye(ctx, o) {
    var rx = o.rx, ry = o.ry, s = o.side || 1, look = o.look || [0, 0], lx = look[0] * rx * 0.22, ly = look[1] * ry * 0.22;
    var close = clamp(o.blink || 0, 0, 1), worry = o.worry || 0, soft = o.soft || 0, ir = rx * (o.irisR || 0.86), asp = ry / rx;
    ctx.save(); ctx.translate(o.x, o.y);
    ctx.fillStyle = sh(o.rim); ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.12, ry * 1.12, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = sh(o.white || [236, 236, 240]); ctx.fillRect(-rx, -ry, 2 * rx, 2 * ry);
    var g = ctx.createRadialGradient(lx, ly + ir * 0.25, ir * 0.05, lx, ly, ir);
    g.addColorStop(0, sh(o.iris[2])); g.addColorStop(0.55, sh(o.iris[1])); g.addColorStop(0.88, sh(o.iris[0])); g.addColorStop(1, sh(o.rim));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(lx, ly, ir, ir * asp, 0, 0, TAU); ctx.fill();
    var pr = ir * (o.pupil || 0.55);
    ctx.fillStyle = 'rgb(6,6,10)'; ctx.beginPath(); ctx.ellipse(lx, ly, pr, pr * asp, 0, 0, TAU); ctx.fill();
    /* light pooling low in the iris: the wet look */
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(lx, ly + ir * 0.62 * asp, 0, lx, ly + ir * 0.62 * asp, ir * 0.85);
    g.addColorStop(0, 'rgba(255,225,190,' + (0.30 + 0.25 * (o.wet || 0)) + ')'); g.addColorStop(1, 'rgba(255,225,190,0)');
    ctx.fillStyle = g; ctx.fillRect(-rx, -ry, 2 * rx, 2 * ry);
    ctx.globalCompositeOperation = 'source-over';
    g = ctx.createLinearGradient(0, -ry, 0, ry * 0.3); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(-rx, -ry, 2 * rx, 2 * ry);
    if (o.wet > 0.05) {
      var wy = ry * (0.62 - 0.12 * o.wet), t = o.t || 0;
      ctx.fillStyle = 'rgba(210,235,255,' + 0.40 * o.wet + ')'; ctx.beginPath(); ctx.moveTo(-rx, ry);
      for (var k = 0; k <= 10; k++) { var u = k / 10; ctx.lineTo(lerp(-rx, rx, u), wy + Math.sin(u * 8 + t * 3 + s) * ry * 0.03); }
      ctx.lineTo(rx, ry); ctx.closePath(); ctx.fill();
    }
    /* the upper lid. worried: outer corner down, inner corner up. soft: both lids come in a little */
    var yo = lerp(-ry * (1.18 - 0.70 * worry - 0.25 * soft), ry * 1.05, close), yi = lerp(-ry * (1.22 - 0.30 * soft), ry * 1.05, close);
    var xo = s * rx * 1.3, xi = -s * rx * 1.3, cy = (yo + yi) / 2 - ry * 0.30 * (1 - close);
    ctx.fillStyle = sh(o.lid);
    ctx.beginPath(); ctx.moveTo(xo, yo); ctx.quadraticCurveTo(0, cy, xi, yi); ctx.lineTo(xi, -ry * 2.2); ctx.lineTo(xo, -ry * 2.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = sh(o.rim); ctx.lineWidth = rx * 0.14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xo, yo); ctx.quadraticCurveTo(0, cy, xi, yi); ctx.stroke();
    var sm = o.smile || 0;
    if (sm > 0.02) {
      var sy = ry * (1.08 - 0.42 * sm), sc = ry * (1.08 - 1.05 * sm);
      ctx.beginPath(); ctx.moveTo(-rx * 1.3, sy); ctx.quadraticCurveTo(0, sc, rx * 1.3, sy); ctx.lineTo(rx * 1.3, ry * 2.2); ctx.lineTo(-rx * 1.3, ry * 2.2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-rx * 1.3, sy); ctx.quadraticCurveTo(0, sc, rx * 1.3, sy); ctx.stroke();
    }
    ctx.restore();
    if (close < 0.7) {
      var a = 1 - close / 0.7;
      ctx.fillStyle = 'rgba(255,255,255,' + 0.95 * a + ')'; ctx.beginPath(); ctx.ellipse(lx - rx * 0.30, ly - ry * 0.28, rx * 0.26, ry * 0.21, -0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + 0.85 * a + ')'; ctx.beginPath(); ctx.arc(lx + rx * 0.34, ly + ry * 0.22, rx * 0.11, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + 0.65 * a + ')'; ctx.beginPath(); ctx.arc(lx - rx * 0.08, ly + ry * 0.52, rx * 0.05, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ================= BEEP ================= */
  var B = { shell: [243, 239, 228], shellLo: [196, 203, 215], belly: [112, 120, 134], metal: [70, 76, 88], metalHi: [168, 176, 190], glass: [8, 20, 44], glassEdge: [3, 9, 22],
    iris: [[18, 92, 190], [62, 190, 255], [200, 250, 255]], amber: 'rgba(255,184,70,A)', pink: 'rgba(255,128,150,A)', cyan: 'rgba(110,230,255,A)', blue: 'rgba(90,120,200,A)' };
  function rotor(ctx, x, y, s, spin, t, back) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    /* the hub */
    ctx.fillStyle = sh(B.metal); rr(ctx, -0.16, -0.10, 0.32, 0.26, 0.08); ctx.fill();
    ctx.fillStyle = sh(B.metalHi); ctx.beginPath(); ctx.ellipse(0, -0.10, 0.16, 0.06, 0, 0, TAU); ctx.fill();
    /* guard ring, seen from a little above */
    ctx.strokeStyle = sh(B.shellLo, back ? 0.7 : 1); ctx.lineWidth = 0.07; ctx.beginPath(); ctx.ellipse(0, -0.12, 0.70, 0.20, 0, 0, TAU); ctx.stroke();
    if (spin > 0.05) {
      ctx.fillStyle = 'rgba(200,210,225,' + (0.10 + 0.14 * spin) + ')'; ctx.beginPath(); ctx.ellipse(0, -0.12, 0.66, 0.18, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(230,236,245,' + 0.35 * spin + ')'; ctx.lineWidth = 0.05;
      for (var i = 0; i < 3; i++) { var a = t * 38 * spin + i * TAU / 3; ctx.beginPath(); ctx.moveTo(0, -0.12); ctx.lineTo(Math.cos(a) * 0.62, -0.12 + Math.sin(a) * 0.17); ctx.stroke(); }
    }
    if (spin < 0.95) {
      ctx.strokeStyle = sh(B.metal, 1 - spin); ctx.lineWidth = 0.09; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-0.58, -0.14); ctx.lineTo(0.58, -0.10); ctx.stroke();
    }
    ctx.restore();
  }
  /* p: t, open, blink, look, mood (-1 sad .. 1 happy), glow, rotor, tilt, antenna, torch, cheeks, hover, think */
  function beep(ctx, p) {
    var t = p.t || 0, open = p.open == null ? 1 : p.open, blink = clamp((p.blink || 0) + (1 - open), 0, 1), look = p.look || [0, 0], i, g;
    var mood = p.mood == null ? 0.6 : p.mood, gl = p.glow == null ? 1 : p.glow, spin = p.rotor == null ? 1 : p.rotor, ant = p.antenna == null ? 1 : p.antenna, cheeks = p.cheeks == null ? 1 : p.cheeks;
    var bob = (p.hover == null ? 1 : p.hover) * spin * Math.sin(t * 2.6) * 0.05, think = p.think || 0, sad = mood < 0 ? -mood : 0, happy = mood > 0 ? mood : 0;
    ctx.save(); ctx.translate(0, bob); ctx.rotate(p.tilt || 0);
    /* back rotors, behind the shell */
    rotor(ctx, -1.08, -1.02, 0.82, spin, t, true); rotor(ctx, 1.08, -1.02, 0.82, spin, t + 0.37, true);
    ctx.strokeStyle = sh(B.shellLo); ctx.lineWidth = 0.16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.7, -0.55); ctx.lineTo(-1.08, -0.9); ctx.moveTo(0.7, -0.55); ctx.lineTo(1.08, -0.9); ctx.stroke();
    /* arms to the front rotors */
    ctx.strokeStyle = sh(B.shell); ctx.lineWidth = 0.20;
    ctx.beginPath(); ctx.moveTo(-0.95, -0.25); ctx.lineTo(-1.55, -0.55); ctx.moveTo(0.95, -0.25); ctx.lineTo(1.55, -0.55); ctx.stroke();
    /* the antenna: perks up when it is keen, droops when it is sad */
    ctx.save(); ctx.translate(0.52, -0.90); ctx.rotate(lerp(0.9, -0.15, ant) + Math.sin(t * 3.1) * 0.05 * ant);
    ctx.strokeStyle = sh(B.metal); ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.05, -0.3, 0, -0.55); ctx.stroke();
    glow(ctx, 0, -0.60, 0.22, B.amber, 0.55 * gl); ctx.fillStyle = sh([255, 200, 90]); ctx.beginPath(); ctx.arc(0, -0.60, 0.075, 0, TAU); ctx.fill();
    ctx.restore();
    /* the shell: a soft pebble, lit from above */
    g = ctx.createLinearGradient(0, -1.0, 0, 1.0); g.addColorStop(0, sh(B.shell)); g.addColorStop(0.72, sh(B.shell)); g.addColorStop(1, sh(B.shellLo));
    ctx.fillStyle = g; rr(ctx, -1.2, -0.98, 2.4, 1.96, 0.82); ctx.fill();
    ctx.strokeStyle = sh(B.shellLo, 0.8); ctx.lineWidth = 0.04; ctx.stroke();
    /* the belly plate and the little torch */
    ctx.save(); rr(ctx, -1.2, -0.98, 2.4, 1.96, 0.82); ctx.clip();
    ctx.fillStyle = sh(B.belly); ctx.beginPath(); ctx.ellipse(0, 1.18, 1.05, 0.42, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = sh(B.metal); ctx.beginPath(); ctx.ellipse(0, 0.93, 0.17, 0.07, 0, 0, TAU); ctx.fill();
    if (p.torch > 0) { ctx.fillStyle = 'rgba(255,236,180,' + 0.85 * p.torch + ')'; ctx.beginPath(); ctx.ellipse(0, 0.93, 0.11, 0.045, 0, 0, TAU); ctx.fill(); }
    /* skids */
    ctx.strokeStyle = sh(B.metal); ctx.lineWidth = 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.75, 0.98); ctx.lineTo(-0.75, 1.14); ctx.lineTo(-0.35, 1.14); ctx.moveTo(0.75, 0.98); ctx.lineTo(0.75, 1.14); ctx.lineTo(0.35, 1.14); ctx.stroke();
    /* cheeks: two warm lights low on the shell, beside the mouth, so blush and smile make one face */
    if (cheeks > 0) { glow(ctx, -0.80, 0.52, 0.28, B.pink, 0.45 * cheeks * gl); glow(ctx, 0.80, 0.52, 0.28, B.pink, 0.45 * cheeks * gl); }
    /* the mouth: one bar of light, well clear of the eye. it curves up when happy, down when sad, and becomes three slow dashes when thinking */
    var col = sad > 0.2 ? B.blue : think > 0.5 ? B.cyan : B.amber, my = 0.70, mw = 0.34 + 0.10 * happy, bend = 0.20 * happy - 0.15 * sad;
    if (think > 0.5) {
      for (i = -1; i <= 1; i++) { var on = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 6 - i * 1.4)); glow(ctx, i * 0.18, my, 0.12, col, 0.8 * on * gl); ctx.fillStyle = sh([255, 255, 255], 0.45 + 0.55 * on); ctx.beginPath(); ctx.arc(i * 0.18, my, 0.045, 0, TAU); ctx.fill(); }
    } else {
      for (i = 0; i < 7; i++) { var u = (i - 3) / 3; glow(ctx, u * mw, my + bend * (1 - u * u), 0.15, col, 0.5 * gl); }
      ctx.strokeStyle = 'rgba(255,250,236,' + (0.22 + 0.78 * gl) + ')'; ctx.lineWidth = 0.085; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-mw, my); ctx.quadraticCurveTo(0, my + 2 * bend, mw, my); ctx.stroke();
    }
    /* the eye: smaller than a camera lens and set in a cream lid ring, so it reads as an eye. glass, the blue light inside, a small pupil, the gloss */
    var R = 0.46, ey = -0.16;
    ctx.save(); ctx.translate(0, ey);
    g = ctx.createRadialGradient(-0.1, -0.15, R * 0.8, 0, 0, R * 1.24); g.addColorStop(0, sh(B.shellLo)); g.addColorStop(1, sh(B.shell));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.22, 0, TAU); ctx.fill();
    ctx.fillStyle = sh(B.metal); ctx.beginPath(); ctx.arc(0, 0, R * 1.07, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
    g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R); g.addColorStop(0, sh(B.glass)); g.addColorStop(1, sh(B.glassEdge));
    ctx.fillStyle = g; ctx.fillRect(-R, -R, 2 * R, 2 * R);
    var lx = look[0] * R * 0.28, ly = look[1] * R * 0.24, ir = R * 0.80;
    g = ctx.createRadialGradient(lx, ly, 0, lx, ly, ir); g.addColorStop(0, sh(B.iris[2], gl)); g.addColorStop(0.35, sh(B.iris[1], 0.95 * gl)); g.addColorStop(0.8, sh(B.iris[0], 0.8 * gl)); g.addColorStop(1, sh(B.iris[0], 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, ir, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + 0.08 * gl + ')'; ctx.lineWidth = 0.012;
    for (i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(lx, ly, ir * i / 4, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = 'rgb(4,6,14)'; ctx.beginPath(); ctx.arc(lx, ly, ir * (0.30 + 0.05 * think), 0, TAU); ctx.fill();
    /* light pooling low in the eye, the wet look the lamb has */
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(lx, ly + ir * 0.6, 0, lx, ly + ir * 0.6, ir * 0.9); g.addColorStop(0, 'rgba(170,220,255,' + 0.32 * gl + ')'); g.addColorStop(1, 'rgba(170,220,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-R, -R, 2 * R, 2 * R);
    ctx.globalCompositeOperation = 'source-over';
    /* the upper lid: a hair of it always, a third of the eye when sad, half when thinking, all of it when asleep. it sags in the middle when sad */
    var lid = Math.max(blink, 0.05 + 0.30 * sad + (think > 0.5 ? 0.12 : 0) * (1 - blink));
    if (lid > 0.01) {
      var yl = lerp(-R * 1.15, R * 1.1, lid), sag = R * (0.22 * (1 - lid) + 0.30 * sad);
      var lg = ctx.createRadialGradient(-R * 0.15, -R * 0.3, R * 0.1, 0, 0, R * 1.05); lg.addColorStop(0, sh(B.shell)); lg.addColorStop(1, sh(B.shellLo));
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-R * 1.2, yl); ctx.quadraticCurveTo(0, yl + sag, R * 1.2, yl); ctx.lineTo(R * 1.2, -R * 1.5); ctx.lineTo(-R * 1.2, -R * 1.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = sh(B.shellLo); ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(-R * 1.2, yl); ctx.quadraticCurveTo(0, yl + sag, R * 1.2, yl); ctx.stroke();
    }
    /* the lower lid rises with a smile */
    if (happy > 0.3) {
      var sm = (happy - 0.3) / 0.7, ys = lerp(R * 1.15, R * 0.60, sm);
      ctx.fillStyle = sh(B.shell); ctx.beginPath(); ctx.moveTo(-R * 1.2, R * 1.2); ctx.lineTo(-R * 1.2, ys + R * 0.18); ctx.quadraticCurveTo(0, ys - R * 0.22, R * 1.2, ys + R * 0.18); ctx.lineTo(R * 1.2, R * 1.2); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    /* asleep: the lid is down and a soft closed-eye line curves across it */
    if (blink > 0.85) { var ca = (blink - 0.85) / 0.15; ctx.strokeStyle = sh(B.metal, 0.75 * ca); ctx.lineWidth = 0.07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-R * 0.62, R * 0.02); ctx.quadraticCurveTo(0, R * 0.42, R * 0.62, R * 0.02); ctx.stroke(); }
    /* glass gloss: never dimmed */
    if (blink < 0.75) {
      var a = 1 - blink / 0.75;
      ctx.fillStyle = 'rgba(255,255,255,' + 0.85 * a + ')'; ctx.beginPath(); ctx.ellipse(-R * 0.34, -R * 0.42, R * 0.30, R * 0.20, -0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + 0.7 * a + ')'; ctx.beginPath(); ctx.arc(R * 0.36, R * 0.30, R * 0.09, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = sh(B.metalHi, 0.5); ctx.lineWidth = 0.03; ctx.beginPath(); ctx.arc(0, 0, R * 1.02, 0, TAU); ctx.stroke();
    ctx.restore();
    /* the brow: a thin seam above the eye that tilts with the mood. a gentle arch when happy, a worried peak when sad, one end raised when thinking */
    var by = ey - R * 1.36, bw = 0.44;
    ctx.strokeStyle = sh(B.metal, 0.45 + 0.3 * sad); ctx.lineWidth = 0.055; ctx.lineCap = 'round'; ctx.beginPath();
    if (think > 0.5) { ctx.moveTo(-bw, by + 0.02); ctx.quadraticCurveTo(0, by - 0.12, bw, by - 0.05); }
    else { ctx.moveTo(-bw, by + 0.10 * sad); ctx.quadraticCurveTo(0, by - 0.05 - 0.12 * sad, bw, by + 0.10 * sad); }
    ctx.stroke();
    /* front rotors, over the shell */
    rotor(ctx, -1.55, -0.62, 1, spin, t + 0.11, false); rotor(ctx, 1.55, -0.62, 1, spin, t + 0.53, false);
    ctx.restore();
  }

  /* ================= THE LAMB ================= */
  var K = { fleece: [246, 243, 236], fleeceLo: [205, 206, 212], face: [36, 34, 40], faceHi: [66, 64, 74], muzzle: [58, 56, 64], nose: [122, 96, 108], pinkIn: [150, 92, 110],
    iris: [[48, 30, 22], [96, 64, 40], [160, 118, 70]], rim: [12, 10, 12], white: [230, 226, 224], snow: [250, 252, 255] };
  function curl(ctx, x, y, r, dark) {
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, sh(K.fleece)); g.addColorStop(0.75, sh(K.fleece)); g.addColorStop(1, sh(K.fleeceLo, dark ? 1 : 0.85));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function fleeceBlob(ctx, cx, cy, rx, ry, n, r, seed) {
    var i, a, x, y, k = seed || 0;
    for (i = 0; i < n; i++) { a = i / n * TAU; var rr2 = r * (0.85 + 0.3 * Math.abs(Math.sin(i * 2.3 + k))); x = cx + Math.cos(a) * (rx - rr2 * 0.6); y = cy + Math.sin(a) * (ry - rr2 * 0.6); curl(ctx, x, y, rr2, Math.sin(a) > 0.2); }
    var g = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.5, 0, cx, cy, Math.max(rx, ry)); g.addColorStop(0, sh(K.fleece)); g.addColorStop(1, sh(K.fleeceLo, 0.9));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, rx - r * 0.4, ry - r * 0.4, 0, 0, TAU); ctx.fill();
    /* inner rings of curls, so the body is a ball of fleece and not a ring */
    var n2 = Math.round(n * 0.62), rx2 = rx - r * 1.6, ry2 = ry - r * 1.6;
    for (i = 0; i < n2; i++) { a = (i + 0.5) / n2 * TAU; curl(ctx, cx + Math.cos(a) * rx2, cy + Math.sin(a) * ry2, r * (0.86 + 0.18 * Math.abs(Math.sin(i * 1.7 + k))), Math.sin(a) > 0.3); }
    if (rx - r * 2.9 > r * 0.3) { var n3 = Math.round(n * 0.38), rx3 = rx - r * 2.9, ry3 = Math.max(ry - r * 2.9, r * 0.3); for (i = 0; i < n3; i++) { a = i / n3 * TAU; curl(ctx, cx + Math.cos(a) * rx3, cy + Math.sin(a) * ry3, r * 0.82, Math.sin(a) > 0.4); } }
    if (rx - r * 4 > 0) curl(ctx, cx, cy, r * 0.9, false);
  }
  function snowCap(ctx, x, y, w, a) {
    if (a <= 0) return;
    ctx.fillStyle = sh(K.snow, 0.92 * a); ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.42, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + 0.5 * a + ')'; ctx.beginPath(); ctx.ellipse(x - w * 0.25, y - w * 0.12, w * 0.4, w * 0.18, 0, 0, TAU); ctx.fill();
  }
  function leg(ctx, x0, y0, x1, y1, w, far) {
    ctx.strokeStyle = far ? sh([22, 20, 26]) : sh(K.face); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    if (!far) { ctx.strokeStyle = sh(K.faceHi, 0.55); ctx.lineWidth = w * 0.22; ctx.beginPath(); ctx.moveTo(x0 - w * 0.26, y0 + w * 0.3); ctx.lineTo(x1 - w * 0.26, y1 - w * 0.2); ctx.stroke(); }
    ctx.fillStyle = sh(K.rim); ctx.beginPath(); ctx.ellipse(x1, y1 + w * 0.2, w * 0.62, w * 0.42, 0, 0, TAU); ctx.fill();
  }
  function ear(ctx, s, droop, t, cold) {
    ctx.save(); ctx.translate(s * 0.60, -0.22); ctx.rotate(s * (0.30 + 0.55 * droop) + Math.sin(t * 1.7 + s) * 0.03);
    ctx.fillStyle = sh(K.face); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.45, -0.30, s * 0.82, -0.02); ctx.quadraticCurveTo(s * 0.50, 0.26, 0, 0.12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sh(K.pinkIn, 0.9); ctx.beginPath(); ctx.moveTo(s * 0.12, 0.02); ctx.quadraticCurveTo(s * 0.42, -0.16, s * 0.68, 0.0); ctx.quadraticCurveTo(s * 0.45, 0.15, s * 0.12, 0.08); ctx.closePath(); ctx.fill();
    snowCap(ctx, s * 0.5, -0.13, 0.16, cold);
    ctx.restore();
  }
  /* p: t, look, blink, fear (0..1), bleat (0..1), cold (snow 0..1), tilt, safe (0..1), wet, breath */
  function lamb(ctx, p) {
    var t = p.t || 0, fear = p.fear == null ? 0.8 : p.fear, safe = p.safe || 0, hd = clamp(p.huddle || 0, 0, 1), bleat = p.bleat || 0, cold = p.cold == null ? 0.7 : p.cold, look = p.look || [0, -0.3];
    var shiver = (Math.sin(t * 43) + Math.sin(t * 57 + 0.8)) * 0.007 * fear * (1 - safe), breathe = 1 + 0.018 * Math.sin(t * 2.4 + 1);
    var droop = clamp(lerp(0.55, 0.15, safe) + 0.3 * hd, 0, 1), wet = p.wet == null ? 0.6 * fear : p.wet, i;
    ctx.save(); ctx.translate(shiver, 0);
    /* far legs and the tail, behind the body */
    leg(ctx, -0.52, 1.70 + 0.1 * hd, -0.60, 2.40 - 0.28 * hd, 0.24, true); leg(ctx, 0.88, 1.72 + 0.1 * hd, 0.96, 2.40 - 0.28 * hd, 0.24, true);
    ctx.save(); ctx.translate(-1.22, 1.08); ctx.rotate(Math.sin(t * (safe > 0.5 ? 9 : 1.6)) * (0.1 + 0.5 * safe)); curl(ctx, 0, 0, 0.24, true); curl(ctx, -0.08, -0.2, 0.19, false); ctx.restore();
    /* the body, a little ball of fleece */
    ctx.save(); ctx.translate(0.15, 1.35 + 0.08 * hd); ctx.scale(1 + 0.05 * hd, breathe * (1 - 0.06 * hd)); fleeceBlob(ctx, 0, 0, 1.22, 0.86, 16, 0.26, 3); ctx.restore();
    snowCap(ctx, -0.1, 0.62, 0.40, cold * 0.9); snowCap(ctx, 0.75, 0.70, 0.30, cold * 0.7);
    leg(ctx, -0.26, 1.95 + 0.1 * hd, -0.30, 2.52 - 0.28 * hd, 0.27); leg(ctx, 0.56, 1.95 + 0.1 * hd, 0.60, 2.52 - 0.28 * hd, 0.27);
    /* the neck, then the head: turned a little, tilted when curious */
    ctx.save(); ctx.translate(0, 0.22 * hd); ctx.rotate((p.tilt == null ? -0.10 : p.tilt) + Math.sin(t * 0.9) * 0.02);
    fleeceBlob(ctx, 0.05, 0.55, 0.62, 0.50, 10, 0.2, 7);
    ear(ctx, -1, droop, t, cold); ear(ctx, 1, droop, t, cold);
    /* the face: a soft black pear, lighter where the light catches the forehead */
    var g = ctx.createRadialGradient(-0.15, -0.35, 0.05, 0, 0.1, 1.1); g.addColorStop(0, sh(K.faceHi)); g.addColorStop(1, sh(K.face));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-0.66, -0.40); ctx.bezierCurveTo(-0.76, 0.12, -0.56, 0.70, -0.32, 0.90); ctx.quadraticCurveTo(0, 1.02, 0.32, 0.90);
    ctx.bezierCurveTo(0.56, 0.70, 0.76, 0.12, 0.66, -0.40); ctx.quadraticCurveTo(0, -0.80, -0.66, -0.40); ctx.closePath(); ctx.fill();
    /* a few pale speckles, like a real Mourne lamb */
    ctx.fillStyle = sh([150, 146, 150], 0.35);
    var sp = [[-0.46, 0.25, 0.05], [0.44, 0.32, 0.04], [-0.2, 0.42, 0.03], [0.26, -0.1, 0.03], [-0.38, -0.12, 0.035], [0.5, 0.0, 0.03]];
    for (i = 0; i < sp.length; i++) { ctx.beginPath(); ctx.ellipse(sp[i][0], sp[i][1], sp[i][2] * 1.3, sp[i][2], 0.4, 0, TAU); ctx.fill(); }
    /* the muzzle: lighter, with the nose and the mouth */
    g = ctx.createRadialGradient(0, 0.55, 0.05, 0, 0.62, 0.42); g.addColorStop(0, sh(K.muzzle)); g.addColorStop(1, sh(K.face, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0.64, 0.40, 0.32, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = sh(K.nose); ctx.beginPath(); ctx.moveTo(-0.17, 0.52); ctx.quadraticCurveTo(0, 0.44, 0.17, 0.52); ctx.quadraticCurveTo(0.14, 0.70, 0, 0.74); ctx.quadraticCurveTo(-0.14, 0.70, -0.17, 0.52); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sh(K.rim, 0.8); ctx.beginPath(); ctx.ellipse(-0.075, 0.60, 0.035, 0.05, -0.4, 0, TAU); ctx.ellipse(0.075, 0.60, 0.035, 0.05, 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-0.05, 0.50, 0.05, 0.025, 0, 0, TAU); ctx.fill();
    /* the mouth: a small line, lifted when she is safe, open when she bleats */
    ctx.strokeStyle = sh(K.rim); ctx.lineWidth = 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0.74); ctx.lineTo(0, 0.80); ctx.moveTo(-0.14 - 0.05 * safe, 0.80 + 0.03 * (1 - safe) - 0.03 * safe); ctx.quadraticCurveTo(0, 0.80 + 0.18 * safe, 0.14 + 0.05 * safe, 0.80 + 0.03 * (1 - safe) - 0.03 * safe); ctx.stroke();
    if (bleat > 0.05) {
      ctx.fillStyle = sh(K.rim); ctx.beginPath(); ctx.ellipse(0, 0.84, 0.10, 0.11 * bleat, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = sh(K.pinkIn); ctx.beginPath(); ctx.ellipse(0, 0.90, 0.06, 0.05 * bleat, 0, 0, TAU); ctx.fill();
    }
    snowCap(ctx, 0.02, 0.47, 0.13, cold);
    /* the eyes: big, low, wide apart, looking up at us */
    for (i = -1; i <= 1; i += 2) {
      cuteEye(ctx, { x: i * 0.37, y: 0.03, rx: 0.215 + 0.012 * safe, ry: 0.20 + 0.015 * safe, side: i, look: [look[0], look[1] - 0.15 * hd], blink: p.blink || 0, worry: 0.9 * fear * (1 - safe), soft: 0.45 * safe, smile: 0.40 * safe,
        wet: wet, t: t, rim: K.rim, lid: K.face, white: K.white, iris: K.iris, irisR: 0.9, pupil: 0.62 + 0.12 * fear });
    }
    /* the topknot: a cap of fleece over the brow, with snow on it */
    curl(ctx, -0.34, -0.56, 0.24, false); curl(ctx, 0.04, -0.66, 0.27, false); curl(ctx, 0.40, -0.54, 0.23, false); curl(ctx, -0.14, -0.52, 0.20, false); curl(ctx, 0.24, -0.50, 0.19, false);
    snowCap(ctx, 0.02, -0.80, 0.30, cold);
    ctx.restore();
    /* the breath, a small cloud that drifts up and fades */
    if (p.breath > 0) {
      var ph = p.breath; ctx.fillStyle = 'rgba(235,242,255,' + 0.28 * (1 - ph) + ')';
      ctx.beginPath(); ctx.ellipse(0.25 + ph * 0.5, 0.95 - ph * 0.45, 0.18 + ph * 0.4, 0.12 + ph * 0.22, -0.3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ================= NUALA: the farmer's daughter, 13. Red coat, bobble hat, scarf, plait, mittens, torch, phone. A clean shape by distance; her face is drawn only when she is near. ================= */
  var N = { coat: [204, 40, 46], coatHi: [234, 72, 74], coatLo: [126, 20, 28], hat: [30, 46, 96], hatLo: [16, 26, 60], bobble: [240, 240, 244], scarf: [236, 232, 220], jeans: [62, 72, 108], jeansLo: [38, 44, 70], boot: [30, 26, 28], hair: [84, 50, 32], hairHi: [124, 80, 50], mitt: [228, 184, 56], mittLo: [172, 130, 28], skin: [230, 194, 172], skinLo: [192, 146, 124] };
  /* a limb with weight: a dark edge under, the lit colour over */
  function limb(ctx, x0, y0, x1, y1, w, hi, lo) {
    ctx.lineCap = 'round'; ctx.strokeStyle = sh(lo); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0 + 0.025, y0 + 0.03); ctx.lineTo(x1 + 0.025, y1 + 0.03); ctx.stroke();
    ctx.strokeStyle = sh(hi); ctx.lineWidth = w * 0.86; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  /* a cuff where a sleeve ends, across the arm */
  function cuff(ctx, x, y, dx, dy) {
    var l = Math.hypot(dx, dy) || 1, nx = -dy / l * 0.12, ny = dx / l * 0.12, cx = x - dx / l * 0.05, cy = y - dy / l * 0.05;
    ctx.strokeStyle = sh(N.coatLo); ctx.lineWidth = 0.07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - nx, cy - ny); ctx.lineTo(cx + nx, cy + ny); ctx.stroke();
  }
  /* a mitten: a shaded pad with a thumb, sitting exactly where the sleeve ends */
  function mitten(ctx, x, y, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = sh(N.mittLo); ctx.beginPath(); ctx.ellipse(0.02, 0.03, 0.135, 0.115, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = sh(N.mitt); ctx.beginPath(); ctx.ellipse(0, 0, 0.13, 0.11, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-0.07, -0.09, 0.055, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-0.04, -0.04, 0.06, 0.035, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function boot(ctx, x) {
    ctx.fillStyle = sh([14, 12, 14]); rr(ctx, x - 0.18, 2.30, 0.40, 0.09, 0.03); ctx.fill();
    ctx.fillStyle = sh(N.boot); rr(ctx, x - 0.16, 2.10, 0.34, 0.26, 0.08); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.beginPath(); ctx.ellipse(x - 0.05, 2.17, 0.08, 0.04, 0, 0, TAU); ctx.fill();
  }
  /* p: t, torch (angle in radians, 0 = to the right), phone (0..1), walk (0..1), look, blink */
  function nuala(ctx, p) {
    var t = p.t || 0, walk = p.walk || 0, st = Math.sin(t * 5.5) * walk, big = ctx.getTransform().a >= 70, g, k;
    ctx.save();
    /* the hood, down at her back, behind the shoulders */
    ctx.fillStyle = sh(N.coatLo); ctx.beginPath(); ctx.ellipse(0.04, 0.08, 0.40, 0.20, 0, 0, TAU); ctx.fill();
    /* legs: jeans with weight, then boots with a sole */
    limb(ctx, -0.17, 1.30, -0.21 + st * 0.18, 2.20, 0.30, N.jeans, N.jeansLo);
    limb(ctx, 0.17, 1.30, 0.21 - st * 0.18, 2.20, 0.30, N.jeans, N.jeansLo);
    boot(ctx, -0.21 + st * 0.18); boot(ctx, 0.21 - st * 0.18);
    /* the coat, to above the knee: lit from the left, darker to the hem, a zip and two pockets */
    function coatPath() { ctx.beginPath(); ctx.moveTo(-0.42, 0.10); ctx.quadraticCurveTo(-0.60, 0.75, -0.56, 1.40); ctx.lineTo(0.56, 1.40); ctx.quadraticCurveTo(0.60, 0.75, 0.42, 0.10); ctx.quadraticCurveTo(0, -0.02, -0.42, 0.10); ctx.closePath(); }
    g = ctx.createLinearGradient(-0.6, 0, 0.6, 0); g.addColorStop(0, sh(N.coat)); g.addColorStop(0.3, sh(N.coatHi)); g.addColorStop(0.75, sh(N.coat)); g.addColorStop(1, sh(N.coatLo));
    ctx.fillStyle = g; coatPath(); ctx.fill();
    g = ctx.createLinearGradient(0, 0.3, 0, 1.4); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)'); ctx.fillStyle = g; coatPath(); ctx.fill();
    ctx.strokeStyle = sh(N.coatLo, 0.8); ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(0, 0.22); ctx.lineTo(0, 1.38); ctx.stroke();
    ctx.fillStyle = sh(N.coatLo, 0.55); rr(ctx, -0.46, 0.92, 0.22, 0.05, 0.02); ctx.fill(); rr(ctx, 0.24, 0.92, 0.22, 0.05, 0.02); ctx.fill();
    /* arms: the left holds the phone up by her chest, the right holds the torch out ahead */
    limb(ctx, -0.36, 0.26, -0.70, 0.64, 0.23, N.coat, N.coatLo);
    limb(ctx, -0.70, 0.64, -0.80, 0.40, 0.21, N.coat, N.coatLo); cuff(ctx, -0.80, 0.40, -0.10, -0.24);
    limb(ctx, 0.36, 0.26, 0.80, 0.40, 0.23, N.coat, N.coatLo); cuff(ctx, 0.80, 0.40, 0.44, 0.14);
    /* the phone, in the left mitten, its screen lit toward her */
    if (p.phone > 0) {
      ctx.save(); ctx.translate(-0.84, 0.22); ctx.rotate(-0.25);
      ctx.fillStyle = sh([28, 30, 38]); rr(ctx, -0.09, -0.16, 0.18, 0.30, 0.03); ctx.fill();
      ctx.fillStyle = 'rgba(200,225,255,' + 0.9 * p.phone + ')'; rr(ctx, -0.07, -0.14, 0.14, 0.26, 0.02); ctx.fill();
      ctx.restore(); glow(ctx, -0.84, 0.22, 0.40, 'rgba(180,215,255,A)', 0.35 * p.phone);
    }
    mitten(ctx, -0.82, 0.40, -0.9);
    /* the torch in the right mitten, pointing where she looks, with its lit lens */
    ctx.save(); ctx.translate(0.84, 0.40); ctx.rotate(p.torch == null ? -0.15 : p.torch);
    ctx.fillStyle = sh([58, 58, 64]); rr(ctx, -0.04, -0.075, 0.46, 0.15, 0.05); ctx.fill();
    ctx.fillStyle = sh([92, 92, 100]); rr(ctx, 0.30, -0.095, 0.15, 0.19, 0.04); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.95)'; ctx.beginPath(); ctx.ellipse(0.45, 0, 0.035, 0.085, 0, 0, TAU); ctx.fill(); glow(ctx, 0.47, 0, 0.18, 'rgba(255,240,200,A)', 0.5);
    ctx.restore();
    mitten(ctx, 0.84, 0.40, 0.1);
    /* the scarf round her neck, with a tail down the coat */
    ctx.fillStyle = sh(N.scarf); ctx.beginPath(); ctx.ellipse(0, 0.10, 0.34, 0.13, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = sh(N.scarf); ctx.lineWidth = 0.14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-0.16, 0.14); ctx.quadraticCurveTo(-0.28, 0.38, -0.22, 0.62); ctx.stroke();
    ctx.strokeStyle = sh([206, 200, 186], 0.8); ctx.lineWidth = 0.025; for (k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 0.12, 0.01); ctx.lineTo(k * 0.12 - 0.02, 0.20); ctx.stroke(); }
    /* the plait, from behind her right ear, over the shoulder, with beads along it and a bobble at the end */
    var px0 = 0.30, py0 = -0.22, px1 = 0.40 + st * 0.05, px2 = 0.34 + st * 0.08, py2 = 0.72;
    ctx.strokeStyle = sh(N.hair); ctx.lineWidth = 0.16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px0, py0); ctx.quadraticCurveTo(px1, 0.28, px2, py2); ctx.stroke();
    for (var pi = 0; pi < 5; pi++) { var pu = 0.14 + pi * 0.19, qa = (1 - pu) * (1 - pu), qb = 2 * (1 - pu) * pu, qc = pu * pu, bx = qa * px0 + qb * px1 + qc * px2, byy = qa * py0 + qb * 0.28 + qc * py2;
      ctx.fillStyle = sh(pi % 2 ? N.hairHi : N.hair); ctx.beginPath(); ctx.ellipse(bx + (pi % 2 ? 0.045 : -0.045), byy, 0.08, 0.065, 0.3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = sh(N.mitt); ctx.beginPath(); ctx.arc(px2, py2 + 0.08, 0.07, 0, TAU); ctx.fill();
    /* the head: hair, then the face, then the hat. a thirteen-year-old's head: longer than it is wide, the eyes at the middle */
    ctx.fillStyle = sh(N.hair); ctx.beginPath(); ctx.ellipse(0, -0.30, 0.37, 0.40, 0, 0, TAU); ctx.fill();
    g = ctx.createRadialGradient(-0.10, -0.36, 0.05, 0, -0.26, 0.42); g.addColorStop(0, sh(N.skin)); g.addColorStop(0.72, sh(N.skin)); g.addColorStop(1, sh(N.skinLo));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -0.24, 0.30, 0.35, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = sh(N.hair); ctx.beginPath(); ctx.ellipse(-0.30, -0.26, 0.07, 0.22, 0.1, 0, TAU); ctx.ellipse(0.30, -0.26, 0.07, 0.22, -0.1, 0, TAU); ctx.fill();
    if (big) {
      /* brows, eyes, a nose, cheeks, a small smile, and the phone's light on her cheek */
      ctx.strokeStyle = sh(N.hair); ctx.lineWidth = 0.028; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-0.19, -0.355); ctx.quadraticCurveTo(-0.12, -0.39, -0.05, -0.365); ctx.moveTo(0.05, -0.365); ctx.quadraticCurveTo(0.12, -0.39, 0.19, -0.355); ctx.stroke();
      for (var e = -1; e <= 1; e += 2) cuteEye(ctx, { x: e * 0.12, y: -0.26, rx: 0.062, ry: 0.070, side: e, look: p.look || [0.1, 0], blink: p.blink || 0, worry: 0.25, soft: 0.3, smile: 0.25, wet: 0.25, t: t, rim: [40, 26, 22], lid: N.skin, white: [244, 240, 238], iris: [[46, 28, 20], [98, 62, 38], [158, 112, 64]], irisR: 0.80, pupil: 0.52 });
      ctx.strokeStyle = sh(N.skinLo); ctx.lineWidth = 0.022; ctx.beginPath(); ctx.moveTo(0.01, -0.20); ctx.quadraticCurveTo(0.05, -0.14, 0.00, -0.12); ctx.stroke();
      ctx.fillStyle = 'rgba(255,110,110,0.22)'; ctx.beginPath(); ctx.ellipse(-0.19, -0.12, 0.08, 0.05, 0, 0, TAU); ctx.ellipse(0.19, -0.12, 0.08, 0.05, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = sh([120, 50, 48]); ctx.lineWidth = 0.028; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-0.08, -0.04); ctx.quadraticCurveTo(0, 0.02, 0.08, -0.04); ctx.stroke();
      glow(ctx, -0.22, -0.18, 0.30, 'rgba(180,215,255,A)', 0.14 * (p.phone || 0));
    }
    /* the hat: a lit crown, a ribbed band, the bobble sitting on top */
    g = ctx.createLinearGradient(-0.4, -1.0, 0.4, -0.4); g.addColorStop(0, sh(N.hat)); g.addColorStop(1, sh(N.hatLo));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-0.40, -0.49); ctx.quadraticCurveTo(0, -1.15, 0.40, -0.49); ctx.quadraticCurveTo(0, -0.38, -0.40, -0.49); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = sh(N.hat); ctx.lineWidth = 0.11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-0.40, -0.51); ctx.quadraticCurveTo(0, -0.38, 0.40, -0.51); ctx.stroke();
    ctx.strokeStyle = sh(N.hatLo, 0.7); ctx.lineWidth = 0.02; for (k = -3; k <= 3; k++) { var ky = -0.445 + k * k * 0.006; ctx.beginPath(); ctx.moveTo(k * 0.11, ky - 0.05); ctx.lineTo(k * 0.11, ky + 0.04); ctx.stroke(); }
    ctx.fillStyle = sh(N.bobble); ctx.beginPath(); ctx.arc(0.02, -0.89, 0.13, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-0.02, -0.93, 0.05, 0, TAU); ctx.fill();
    ctx.restore();
  }

  window.SearchChars = { beep: beep, lamb: lamb, nuala: nuala, eye: cuteEye, light: L, sh: sh, rr: rr, glow: glow, curl: curl, TAU: TAU, clamp: clamp, lerp: lerp, smooth: smooth };
})();
