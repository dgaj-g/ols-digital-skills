/* The Rescue, the later chapters: the baby hedgehog, drawn in code with the same tools as
   Billy, Bobby and Blink. No image files.
   Units: 1 = half the width of the face. Origin = the centre of the face. y runs down.
   The feet stand at about y = 1.95. The caller translates and scales; this only draws. */
(function () {
  'use strict';
  var C = window.RescueChars, T = C.kit, sh = C.sh, light = C.light, TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var HG = {
    spine: [92, 64, 46], mid: [122, 88, 62], dark: [58, 38, 28], tip: [214, 190, 150], face: [246, 226, 190], shade: [222, 190, 146],
    belly: [250, 236, 208], pink: [240, 150, 150], nose: [226, 118, 126], rim: [40, 24, 16], lid: [232, 206, 164],
    iris: [[46, 26, 14], [128, 78, 36], [226, 176, 110]], paw: [236, 196, 160]
  };

  /* the spines, made once: rings of quills round the dome, each with a pale tip */
  var quills = (function () {
    var r = T.rng(77), out = [], ring, i;
    for (ring = 0; ring < 7; ring++) {
      var n = 44 - ring * 4, rad = 1.0 - ring * 0.118;
      for (i = 0; i < n; i++) {
        var a = -Math.PI * 1.16 + (i + (ring % 2) * 0.5 + (r() - 0.5) * 0.6) * (Math.PI * 1.32 / (n - 1));
        out.push({ a: a, rad: rad + (r() - 0.5) * 0.05, len: 0.26 + r() * 0.15, w: 0.062 + r() * 0.022, d: r() < 0.38, m: r() < 0.3 });
      }
    }
    return out;
  })();
  var ballQuills = (function () {
    var r = T.rng(91), out = [], ring, i;
    for (ring = 0; ring < 7; ring++) {
      var n = 46 - ring * 6, rad = 1.0 - ring * 0.142;
      for (i = 0; i < n; i++) out.push({ a: (i + (ring % 2) * 0.5 + (r() - 0.5) * 0.5) * TAU / n, rad: rad, len: 0.26 + r() * 0.14, w: 0.066 + r() * 0.022, d: r() < 0.38, m: r() < 0.3 });
    }
    return out;
  })();
  function quill(ctx, cx, cy, rx, ry, q, bristle, lean) {
    var a = q.a + lean, ca = Math.cos(a), sa = Math.sin(a);
    var bx = cx + ca * rx * q.rad, by = cy + sa * ry * q.rad, l = q.len * (1 + 0.35 * bristle);
    var tx = bx + ca * l, ty = by + sa * l, nx = -sa * q.w, ny = ca * q.w;
    ctx.fillStyle = sh(q.d ? HG.dark : q.m ? HG.mid : HG.spine);
    ctx.beginPath(); ctx.moveTo(bx - ca * 0.16 + nx, by - sa * 0.16 + ny); ctx.lineTo(tx, ty); ctx.lineTo(bx - ca * 0.16 - nx, by - sa * 0.16 - ny); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sh(HG.tip, 0.82);
    ctx.beginPath(); ctx.moveTo(lerp(bx, tx, 0.62) + nx * 0.38, lerp(by, ty, 0.62) + ny * 0.38); ctx.lineTo(tx, ty); ctx.lineTo(lerp(bx, tx, 0.62) - nx * 0.38, lerp(by, ty, 0.62) - ny * 0.38); ctx.closePath(); ctx.fill();
  }
  function facePath(ctx) {
    ctx.beginPath(); ctx.moveTo(-0.98, -0.02);
    ctx.bezierCurveTo(-1.0, -0.58, -0.52, -0.80, 0, -0.80);
    ctx.bezierCurveTo(0.52, -0.80, 1.0, -0.58, 0.98, -0.02);
    ctx.bezierCurveTo(0.96, 0.40, 0.52, 0.80, 0, 0.92);
    ctx.bezierCurveTo(-0.52, 0.80, -0.96, 0.40, -0.98, -0.02); ctx.closePath();
  }

  /* curled up: a ball of spines that rolls. Only the nose shows. */
  function ball(ctx, p) {
    var i, roll = p.roll || 0;
    ctx.save(); ctx.translate(0, 0.72); ctx.rotate(roll);
    ctx.fillStyle = sh(HG.spine); ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, TAU); ctx.fill();
    for (i = 0; i < ballQuills.length; i++) quill(ctx, 0, 0, 1.12, 1.12, ballQuills[i], 0.3, 0);
    ctx.beginPath(); ctx.arc(0, 0, 1.18, 0, TAU); T.rim(ctx, -1.2, -0.6, 0.2, 0.1, 0.8);
    ctx.fillStyle = sh(HG.face); ctx.beginPath(); ctx.ellipse(0.18, 0.30, 0.30, 0.24, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = sh(HG.nose); ctx.beginPath(); ctx.ellipse(0.26, 0.36, 0.11, 0.09, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function hog(ctx, p) {
    var t = p.t || 0, fear = p.fear == null ? 1 : p.fear, joy = p.joy || 0, sleep = p.sleep || 0, i, s;
    if ((p.ball || 0) > 0.5) { ball(ctx, p); return; }
    var blink = Math.max(p.blink || 0, sleep), look = p.look || [0, 0];
    var shv = (Math.sin(t * 53) + Math.sin(t * 67 + 0.7)) * 0.010 * fear * (1 - sleep);
    var breathe = Math.sin(t * (sleep > 0.5 ? 1.5 : 3.2)) * 0.02;
    var hop = p.hop || 0;
    ctx.save();
    if (hop > 0) ctx.translate(0, -Math.abs(Math.sin(t * 7.3)) * 0.14 * hop);
    ctx.translate(shv, shv * 0.5);
    /* the dome of spines, bristling when it is afraid */
    var cx = 0, cy = 0.42, rx = 1.28, ry = 1.42 + breathe;
    ctx.fillStyle = sh(HG.spine);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.06, ry * 1.06, 0, 0, TAU); ctx.fill();
    for (i = 0; i < quills.length; i++) quill(ctx, cx, cy, rx, ry, quills[i], fear, (p.wind || 0) * 0.05 + Math.sin(t * 5 + i) * 0.012 * fear);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.02, ry * 1.02, 0, 0, TAU); T.rim(ctx, -1.4, -0.4, 0.1, 0.3, 0.7);
    /* tiny feet */
    for (s = -1; s <= 1; s += 2) {
      ctx.fillStyle = sh(HG.paw); ctx.beginPath(); ctx.ellipse(s * 0.40, 1.86, 0.25, 0.14, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = sh(HG.rim, 0.45); ctx.lineWidth = 0.022;
      ctx.beginPath(); ctx.moveTo(s * 0.34, 1.82); ctx.lineTo(s * 0.34, 1.95); ctx.moveTo(s * 0.47, 1.82); ctx.lineTo(s * 0.47, 1.95); ctx.stroke();
    }
    /* the belly */
    ctx.beginPath(); ctx.ellipse(0, 1.18, 0.74, 0.72 + breathe, 0, 0, TAU); ctx.fillStyle = sh(HG.belly); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 1.18, 0.74, 0.72 + breathe, 0, 0, TAU); T.shadeUnder(ctx, 0.7, 1.9, 0.22);
    /* tiny arms: held tight when afraid, thrown up when happy, tucked when asleep */
    for (s = -1; s <= 1; s += 2) {
      var ax = s * 0.60, ay = 0.98, hx = lerp(s * 0.34, s * 1.02, joy), hy = lerp(1.22, 0.30 + Math.sin(t * 9 + s) * 0.06, joy);
      T.limb(ctx, ax, ay, hx, hy, 0.20, sh(HG.paw), s * 0.04);
      ctx.fillStyle = sh(HG.paw); ctx.beginPath(); ctx.arc(hx, hy, 0.125, 0, TAU); ctx.fill();
    }
    /* ears */
    for (s = -1; s <= 1; s += 2) {
      ctx.fillStyle = sh(HG.shade); ctx.beginPath(); ctx.ellipse(s * 0.80, -0.56, 0.24, 0.26, s * 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = sh(HG.pink, 0.85); ctx.beginPath(); ctx.ellipse(s * 0.80, -0.54, 0.13, 0.15, s * 0.4, 0, TAU); ctx.fill();
    }
    /* the face */
    facePath(ctx); ctx.fillStyle = sh(HG.face); ctx.fill();
    ctx.save(); facePath(ctx); ctx.clip();
    var g = ctx.createRadialGradient(-0.2, -0.3, 0.1, 0, 0, 1.2);
    g.addColorStop(0, sh([255, 244, 220], 0.8)); g.addColorStop(0.7, sh([255, 244, 220], 0)); ctx.fillStyle = g; ctx.fillRect(-1.2, -1, 2.4, 2.2);
    /* the fringe where the spines meet the brow */
    ctx.save(); ctx.translate(0, -0.84); T.tuft(ctx, 0, 0, 1.05, 0.42, 9, sh(HG.spine), 0); ctx.restore();
    if (sleep < 0.5) for (s = -1; s <= 1; s += 2) T.socket(ctx, s * 0.42, 0.02, 0.30);
    ctx.restore();
    facePath(ctx); T.shadeUnder(ctx, 0.2, 1.0, 0.16); facePath(ctx); T.rim(ctx, -1.0, 0, 0, 0.1, 0.8);
    /* the eyes: big, dark and wet */
    for (s = -1; s <= 1; s += 2) {
      if (sleep > 0.5) {
        /* asleep: a soft closed lid and its lashes, no open eye behind it */
        ctx.strokeStyle = sh(HG.rim, 0.9); ctx.lineWidth = 0.05; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s * 0.42 - 0.22, 0.02); ctx.quadraticCurveTo(s * 0.42, 0.20, s * 0.42 + 0.22, 0.02); ctx.stroke();
        ctx.lineWidth = 0.03;
        for (i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(s * 0.42 + i * 0.12, 0.105 - Math.abs(i) * 0.035); ctx.lineTo(s * 0.42 + i * 0.16, 0.185 - Math.abs(i) * 0.03); ctx.stroke(); }
        continue;
      }
      T.drawEye(ctx, { x: s * 0.42, y: 0.0, rx: 0.30, ry: 0.335, side: s, look: look, pupil: lerp(0.60, 0.80, fear), worry: fear * (1 - sleep), blink: blink, wet: p.tears == null ? fear : p.tears, smile: joy, t: t + 0.9, iris: HG.iris, rim: HG.rim, lid: HG.lid });
    }
    /* snout, nose and mouth */
    ctx.fillStyle = sh([255, 240, 214]); ctx.beginPath(); ctx.ellipse(0, 0.50, 0.32, 0.25, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = sh(HG.nose); ctx.beginPath(); ctx.ellipse(0, 0.40, 0.135, 0.105, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-0.04, 0.37, 0.04, 0.025, -0.4, 0, TAU); ctx.fill();
    var m = p.mouth || 0, q = Math.sin(t * 40) * 0.008 * fear;
    ctx.strokeStyle = sh(HG.rim); ctx.lineWidth = 0.04; ctx.lineCap = 'round';
    if (m > 0.1) {
      ctx.fillStyle = sh([88, 30, 40]); ctx.beginPath(); ctx.ellipse(0, 0.66 + q, 0.09 + 0.05 * m, 0.05 + 0.10 * m, 0, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (joy > 0.4) {
      ctx.beginPath(); ctx.moveTo(-0.15, 0.60); ctx.quadraticCurveTo(0, 0.60 + 0.16 * joy, 0.15, 0.60); ctx.stroke();
    } else if (sleep > 0.5) {
      ctx.beginPath(); ctx.moveTo(-0.07, 0.64); ctx.quadraticCurveTo(0, 0.67, 0.07, 0.64); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-0.10, 0.66 + q); ctx.quadraticCurveTo(0, 0.61 + q - 0.03 * fear, 0.10, 0.66 + q); ctx.stroke();
    }
    /* cheeks */
    ctx.fillStyle = sh(HG.pink, 0.30 + 0.25 * joy);
    for (s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.ellipse(s * 0.66, 0.40, 0.14, 0.09, 0, 0, TAU); ctx.fill(); }
    /* tears */
    if ((p.tears == null ? fear : p.tears) > 0.2 && sleep < 0.5) { T.drawTear(ctx, -0.52, 0.32, -1, t, 0.30, 0.06); T.drawTear(ctx, 0.54, 0.31, 1, t, 0.81, 0.055); }
    if (p.wet) T.drips(ctx, [[-1.0, 0.9], [0.9, 1.1], [-0.4, 1.7], [1.1, 0.2]], t);
    ctx.restore();
  }
  C.hog = hog;
})();
