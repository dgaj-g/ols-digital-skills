/* The Rescue, the later chapters: the river, the lane, the door and the fire, drawn in code on
   chapter 1's canvas with chapter 1's weather and chapter 1's characters. No image files.
   Stage units: 1366 wide by 700 tall, centred in the window (the same safe area as chapter 1).
   This file only draws. hour.js decides what is where and when. */
(function () {
  'use strict';
  var Sc = window.RescueScene, C = window.RescueChars, K = Sc.kit, sh = C.sh, light = C.light, TAU = Math.PI * 2;
  var NIGHT = [0.57, 0.63, 0.80];
  var ctx, W, H, k, VW, VH, cam, CAM0 = { x: 683, y: 326, z: 1 };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  var h1 = K.h1;

  function begin(V) {
    ctx = K.ctx(); var dpr = K.dpr(); W = Sc.W; H = Sc.H; k = Sc.k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    VW = W / k; VH = H / k; cam = V.cam || CAM0;
    light.flash = V.flash || 0; light.night = NIGHT; light.lamp = 0;
  }
  function world() { ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k * cam.z, k * cam.z); ctx.translate(-cam.x, -cam.y); }
  function screen(c, x, y) { c = c || CAM0; return [Sc.W / 2 + (x - c.x) * c.z * Sc.k, Sc.H / 2 + (y - c.y) * c.z * Sc.k]; }
  function weatherBack(V, yoff) {
    var flash = V.flash || 0;
    K.sky(flash); K.clouds(V.st, flash, yoff == null ? -0.12 * H : yoff);
    if (V.boltIdx >= 0 && flash > 0.02) K.drawBolt(V.boltIdx, Math.min(1, flash * 1.6), 1);
    K.rain(V.st, false, flash, 0);
  }
  function weatherFront(V) { K.flyingLeaves(V.st); K.rain(V.st, true, V.flash || 0, 0); }
  function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
  function grad(x0, y0, x1, y1, a, b) { var g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function glow(x, y, r, rgb, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }

  /* ---------- the cast ---------- */
  var FEET = { billy: 3.1, bobby: 3.1, hog: 1.95 };
  function animal(kind, a) {
    if (!a || a.show === false) return;
    var fn = kind === 'hog' ? C.hog : kind === 'billy' ? C.kitten : C.puppy, p = a.p || {};
    /* a frightened animal standing still shakes */
    var shake = a.shiver ? Math.sin((p.t || 0) * 43 + a.s) * 1.1 * a.shiver : 0;
    ctx.save(); ctx.translate(a.x + shake, a.y); if (a.rot) ctx.rotate(a.rot);
    ctx.translate(0, -FEET[kind] * a.s * (a.ball ? 0.52 : 1)); ctx.scale(a.s, a.s);
    p.px = a.s * cam.z * k; fn(ctx, p); ctx.restore();
  }
  /* Blink: the owl of chapter 1, with wings when she flies. x, y is where her feet are. */
  function blink(b, t) {
    if (!b || b.show === false) return;
    var s = b.s || 23, fly = b.fly || 0, hy = b.y - 2.6 * s, keep = light.night, i, sd;
    glow(b.x, hy, s * 3.6, '255,170,40', 0.10);
    light.night = [0.80, 0.80, 0.86];
    ctx.save(); ctx.translate(b.x, hy); ctx.scale(s, s);
    if (fly > 0.02) {
      var flap = Math.sin(t * 11) * 0.5;
      for (sd = -1; sd <= 1; sd += 2) {
        ctx.save(); ctx.translate(sd * 0.8, 1.0); ctx.scale(sd, 1); ctx.rotate(-0.25 + flap * 0.55 * fly);
        ctx.globalAlpha = Math.min(1, fly * 1.5);
        ctx.fillStyle = sh([72, 48, 30]); ctx.beginPath(); ctx.moveTo(0, -0.2);
        ctx.quadraticCurveTo(1.6, -1.1, 3.3, -0.5);
        for (i = 0; i < 5; i++) { var u0 = 1 - i / 5, u1 = 1 - (i + 1) / 5; ctx.quadraticCurveTo(3.3 * (u0 + u1) / 2 + 0.1, 0.25 + 0.75 * (1 - (u0 + u1) / 2) + 0.42, 3.3 * u1, 0.2 + 0.8 * (1 - u1)); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = sh([122, 86, 54]); ctx.beginPath(); ctx.moveTo(0, -0.2); ctx.quadraticCurveTo(1.5, -0.95, 2.9, -0.42); ctx.quadraticCurveTo(1.5, 0.1, 0, 0.75); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    C.owl(ctx, { t: t, open: b.open == null ? 1 : b.open, turn: b.turn || 0, body: 1, look: b.look || [0.4, 0], pupil: b.pupil });
    if (b.wink) {
      /* one eye shut: a lid and a lash line over her left eye */
      ctx.fillStyle = sh([236, 218, 184]); ctx.beginPath(); ctx.ellipse(-0.42, 0.02, 0.32, 0.32, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = sh([72, 48, 30]); ctx.lineWidth = 0.07; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-0.70, 0.02); ctx.quadraticCurveTo(-0.42, 0.20, -0.14, 0.02); ctx.stroke();
    }
    ctx.restore(); light.night = keep;
  }

  /* a billowing storm wall with lightning inside it. pts: the centres of its leading puffs. */
  function stormWall(pts, r, st, body) {
    var i, p;
    ctx.fillStyle = 'rgb(3,4,9)'; if (body) { poly(body); ctx.fill(); }
    for (i = 0; i < pts.length; i++) { p = pts[i]; ctx.beginPath(); ctx.arc(p[0] + Math.sin(st * 0.9 + i * 1.7) * r * 0.08, p[1] + Math.cos(st * 0.7 + i) * r * 0.06, r * (0.8 + 0.4 * h1(i + 3)), 0, TAU); ctx.fill(); }
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      var beat = Math.floor(st * 3.1 + i * 0.37), on = h1(beat * 1.3 + i * 7.7) > 0.86 ? 1 - (st * 3.1 + i * 0.37 - beat) : 0;
      if (on > 0.02 && !stormWall.calm) glow(p[0] - r * 0.4, p[1], r * 1.5, '150,170,255', 0.34 * on);
      ctx.fillStyle = 'rgba(40,48,74,0.5)'; ctx.beginPath(); ctx.arc(p[0] + r * 0.18, p[1] - r * 0.2, r * 0.55, 0, TAU); ctx.fill();
    }
  }

  /* ---------- the river ---------- */
  var R = {
    bank: 508, back: 474, nearEdge: 416, farEdge: 694, w0: 622, w1: 548,
    rock: { x: 556, top: 572 }, pn: { x: 318, top: 312, foot: 492 }, pf: { x: 756, top: 312, foot: 492 },
    hang: 112, u0: 390, u1: 712, dip: 40,
    near: { billy: 124, bobby: 208 }, far: { billy: 922, bobby: 848, hog: 774 }, size: { billy: 34, bobby: 34, hog: 25, ball: 18 }
  };
  function ropeY(x, load) { var t = clamp((x - R.pn.x) / (R.pf.x - R.pn.x), 0, 1); return R.pn.top + 12 + (22 + 9 * (load || 0)) * 4 * t * (1 - t); }
  /* where the rim of the bucket is, for a place along the rope */
  function bucketAt(b) { var x = lerp(R.u0, R.u1, b.u || 0); return { x: x, y: ropeY(x, b.load) + R.hang + (b.dip || 0) * R.dip, rope: ropeY(x, b.load) }; }
  function waterY(V) { return lerp(R.w0, R.w1, V.water || 0); }

  var blades = (function () { var r = K.rng(404), out = []; for (var i = 0; i < 230; i++) out.push({ x: r(), d: r(), h: 9 + r() * 15, ph: r() * 6 }); return out; })();
  function grassOn(x0, x1, yFront, yBack, st, pass) {
    var w = Sc.wind(st) + Sc.gust(st), i;
    ctx.lineCap = 'round';
    ctx.strokeStyle = sh(pass === 0 ? [26, 50, 32] : pass === 1 ? [38, 66, 40] : [54, 88, 50]); ctx.lineWidth = 1.5 + pass * 0.5; ctx.beginPath();
    for (i = pass; i < blades.length; i += 3) {
      var b = blades[i], x = lerp(x0, x1, b.x), y = lerp(yBack, yFront, b.d), bh = b.h * (0.55 + 0.6 * b.d), lean = (0.3 + 0.3 * Math.sin(st * 3 + b.ph)) * w * bh;
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.3, y - bh * 0.6, x + lean, y - bh);
    }
    ctx.stroke();
  }
  function riverBack(V) {
    var st = V.st, lit = V.homeLit == null ? 1 : V.homeLit, i;
    /* far hills, and home on the hill */
    ctx.fillStyle = sh([12, 19, 34]); ctx.beginPath(); ctx.moveTo(-500, 620);
    for (i = -500; i <= 1900; i += 40) ctx.lineTo(i, 392 - 34 * Math.sin(i / 310 + 0.6) - 16 * Math.sin(i / 97 + 2));
    ctx.lineTo(1900, 620); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sh([9, 15, 27]); ctx.beginPath(); ctx.moveTo(560, 620);
    ctx.bezierCurveTo(660, 420, 760, 300, 872, 282); ctx.bezierCurveTo(1010, 290, 1180, 400, 1900, 430); ctx.lineTo(1900, 620); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sh([9, 15, 27]); ctx.beginPath(); ctx.moveTo(-500, 620); ctx.bezierCurveTo(-200, 400, 120, 380, 330, 420); ctx.bezierCurveTo(430, 440, 500, 470, 540, 620); ctx.closePath(); ctx.fill();
    /* the lane home, climbing the hill in five stretches */
    ctx.strokeStyle = sh([46, 52, 64], 0.6); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(800, 470); ctx.lineTo(742, 432); ctx.lineTo(842, 398); ctx.lineTo(770, 362); ctx.lineTo(856, 330); ctx.lineTo(846, 296); ctx.stroke();
    /* the house, with one lit window */
    ctx.fillStyle = 'rgb(6,9,16)';
    poly([838, 290, 838, 262, 832, 262, 866, 236, 878, 245, 878, 236, 886, 236, 886, 251, 900, 262, 894, 262, 894, 290]); ctx.fill();
    if (lit > 0.01) {
      ctx.fillStyle = 'rgba(255,206,120,' + lit + ')'; ctx.fillRect(858, 266, 15, 15);
      ctx.strokeStyle = 'rgba(40,24,8,' + lit + ')'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(865.5, 266); ctx.lineTo(865.5, 281); ctx.moveTo(858, 273.5); ctx.lineTo(873, 273.5); ctx.stroke();
      glow(865, 273, 70, '255,190,100', 0.42 * lit * (0.92 + 0.08 * Math.sin(st * 5)));
    }
    /* the river coming down between the hills */
    ctx.fillStyle = grad(0, 410, 0, 560, sh([52, 62, 86]), sh([70, 64, 60]));
    ctx.beginPath(); ctx.moveTo(R.nearEdge - 40, 600); ctx.bezierCurveTo(R.nearEdge + 20, 470, 470, 440, 372, 418); ctx.lineTo(402, 414);
    ctx.bezierCurveTo(560, 428, 640, 470, R.farEdge + 40, 600); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = sh([170, 176, 190], 0.30); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (i = 0; i < 12; i++) {
      var d = ((i / 12 + st * 0.10) % 1), y = 428 + d * d * 80, hw = 20 + d * d * 130, x = lerp(470, 555, d) + (h1(i + 5) - 0.5) * hw * 1.5;
      ctx.beginPath(); ctx.moveTo(x - 5 - 20 * d, y); ctx.lineTo(x + 5 + 20 * d, y + 1.5); ctx.stroke();
    }
  }
  function waveLine(base, st, amp, sp, ph, x0, x1) {
    ctx.beginPath(); ctx.moveTo(x0, 900);
    for (var x = x0; x <= x1; x += 12) ctx.lineTo(x, base + amp * Math.sin(x * 0.045 + st * sp + ph) + amp * 0.6 * Math.sin(x * 0.11 - st * sp * 1.4 + ph * 2));
    ctx.lineTo(x1, 900); ctx.closePath();
  }
  function water(V, layer) {
    var st = V.st, wy = waterY(V), base = wy + [-16, -7, 4][layer], amp = [3, 4.5, 6][layer], sp = [2.2, 2.9, 3.6][layer], i;
    var col = [[64, 58, 56], [92, 74, 58], [120, 94, 66]][layer], x0 = R.nearEdge - 62, x1 = R.farEdge + 62;
    ctx.save(); poly([R.nearEdge - 2, R.back, R.farEdge + 2, R.back, R.farEdge + 34, 900, R.nearEdge - 34, 900]); ctx.clip();
    waveLine(base, st, amp, sp, layer * 1.9, x0, x1);
    ctx.fillStyle = grad(0, base, 0, base + 150, sh(col), sh([30, 24, 22])); ctx.fill();
    /* the crest of each wave, and foam torn along it */
    ctx.strokeStyle = sh([226, 218, 204], 0.30 + 0.16 * layer); ctx.lineWidth = 1.6 + layer * 0.5; ctx.beginPath();
    for (var x = x0; x <= x1; x += 12) { var y = base + amp * Math.sin(x * 0.045 + st * sp + layer * 1.9) + amp * 0.6 * Math.sin(x * 0.11 - st * sp * 1.4 + layer * 3.8); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = sh([236, 228, 212], 0.42 + 0.12 * layer);
    for (i = 0; i < 9; i++) {
      var fx = x0 + ((h1(i * 3.3 + layer * 17) * (x1 - x0) + st * (60 + 30 * layer) * (0.6 + h1(i + layer))) % (x1 - x0)), fy = base + amp * Math.sin(fx * 0.045 + st * sp + layer * 1.9) + 3 + h1(i * 9.1 + layer) * (16 + 14 * layer);
      ctx.beginPath(); ctx.ellipse(fx, fy, 5 + 7 * h1(i + 40 + layer), 1.5 + layer * 0.5, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function banks(V) {
    var st = V.st, s, e;
    for (s = 0; s < 2; s++) {
      e = s === 0 ? R.nearEdge : R.farEdge;
      var out = s === 0 ? -700 : 2100, dir = s === 0 ? 1 : -1;
      /* the earth face, cut away by the flood */
      ctx.fillStyle = grad(0, R.bank, 0, R.bank + 170, sh([62, 46, 34]), sh([24, 18, 15]));
      poly([out, R.bank - 2, e, R.bank - 2, e - dir * 9, R.bank + 26, e - dir * 4, R.bank + 60, e - dir * 22, R.bank + 120, e - dir * 30, 900, out, 900]); ctx.fill();
      ctx.strokeStyle = sh([20, 15, 12], 0.8); ctx.lineWidth = 2;
      for (var j = 0; j < 5; j++) { var rx = e - dir * (30 + 46 * j + 20 * h1(j + s * 9)), ry = R.bank + 18 + 30 * h1(j * 3 + s); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(rx + dir * 8, ry + 14, rx - dir * 4, ry + 34 + 20 * h1(j + 4)); ctx.stroke(); }
      /* the grass top, running back to the hills */
      ctx.fillStyle = grad(0, R.back, 0, R.bank + 6, sh([16, 30, 26]), sh([26, 46, 30]));
      poly([out, R.back, e + dir * 44, R.back, e, R.bank - 6, e - dir * 3, R.bank + 5, out, R.bank + 5]); ctx.fill();
    }
    grassOn(-360, R.nearEdge - 8, R.bank + 2, R.back + 4, st, 0); grassOn(R.farEdge + 8, 1720, R.bank + 2, R.back + 4, st + 3, 0);
    grassOn(-360, R.nearEdge - 8, R.bank + 2, R.back + 4, st, 1); grassOn(R.farEdge + 8, 1720, R.bank + 2, R.back + 4, st + 3, 1);
  }
  function wood(x, y, w, h, c) { ctx.fillStyle = sh(c); ctx.fillRect(x - w / 2, y, w, h); ctx.fillStyle = sh([c[0] * 0.6, c[1] * 0.6, c[2] * 0.6], 0.9); ctx.fillRect(x + w / 2 - w * 0.3, y, w * 0.3, h); }
  function bridgeStumps() {
    /* what is left of the bridge: two snapped posts and a plank hanging in the flood */
    var c = [70, 52, 38];
    ctx.save(); ctx.translate(R.nearEdge - 16, R.bank - 2); ctx.rotate(-0.07);
    wood(0, -50, 13, 52, c); ctx.fillStyle = sh(c); poly([-6.5, -50, -3, -64, 0, -52, 3, -60, 6.5, -50]); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(R.nearEdge - 6, R.bank - 6); ctx.rotate(0.62); ctx.fillStyle = sh([60, 44, 32]); ctx.fillRect(0, -5, 72, 9);
    ctx.fillStyle = sh([36, 26, 20]); poly([72, -5, 84, -2, 74, 0, 82, 4, 72, 4]); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(R.farEdge + 16, R.bank - 2); ctx.rotate(0.10);
    wood(0, -38, 13, 40, c); ctx.fillStyle = sh(c); poly([-6.5, -38, -2, -52, 1, -41, 4, -47, 6.5, -38]); ctx.fill();
    ctx.restore();
  }
  function tree(V) {
    /* the foot of the tree they came down, and the ladder */
    var x = -44;
    ctx.fillStyle = sh([38, 30, 26]);
    ctx.beginPath(); ctx.moveTo(x - 80, -400); ctx.lineTo(x + 86, -400); ctx.bezierCurveTo(x + 90, 200, x + 96, 440, x + 136, R.bank + 2); ctx.lineTo(x - 140, R.bank + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = sh([20, 16, 14], 0.9); ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (var i = 0; i < 7; i++) { var bx = x + 10 + i * 12; ctx.beginPath(); ctx.moveTo(bx, 60 + 40 * h1(i)); ctx.quadraticCurveTo(bx + 6, 280, bx + 4 + i * 2.2, 470 + 20 * h1(i + 2)); ctx.stroke(); }
    ctx.strokeStyle = sh([96, 74, 50]); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x + 100, R.bank); ctx.lineTo(x + 70, 100); ctx.moveTo(x + 144, R.bank); ctx.lineTo(x + 114, 100); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath();
    for (i = 0; i < 9; i++) { var ly = R.bank - 30 - i * 40, lx = x + 100 - (R.bank - ly) * 0.0735; ctx.moveTo(lx, ly); ctx.lineTo(lx + 44, ly); }
    ctx.stroke();
  }
  function post(p, st) {
    wood(p.x, p.top, 18, p.foot - p.top + 6, [86, 64, 44]);
    ctx.fillStyle = sh([62, 46, 32]); ctx.fillRect(p.x - 12, p.top - 4, 24, 8);
    /* the pulley wheel the rope runs over */
    ctx.fillStyle = sh([70, 74, 84]); ctx.beginPath(); ctx.arc(p.x, p.top + 12, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = sh([30, 32, 40]); ctx.beginPath(); ctx.arc(p.x, p.top + 12, 3, 0, TAU); ctx.fill();
  }
  function rope(V) {
    var b = V.bucket || {}, at = bucketAt(b), x;
    ctx.strokeStyle = sh([150, 130, 96]); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(R.pn.x, R.pn.top + 12);
    for (x = R.pn.x + 15; x < R.pf.x; x += 15) ctx.lineTo(x, ropeY(x, b.load) + (Math.abs(x - at.x) < 60 ? (b.load || 0) * 5 * (1 - Math.abs(x - at.x) / 60) : 0));
    ctx.lineTo(R.pf.x, R.pf.top + 12); ctx.stroke();
  }
  function winch(V) {
    var w = V.winch || {}, on = w.on || 0, x = R.pn.x, y = 340, bw = 124, bh = 104, i;
    /* the box, its crank and its little screen */
    ctx.fillStyle = sh([54, 60, 76]); K.box(x - bw / 2, y, bw, bh, 9); ctx.fill();
    ctx.strokeStyle = sh([112, 122, 146]); ctx.lineWidth = 2.5; K.box(x - bw / 2, y, bw, bh, 9); ctx.stroke();
    ctx.save(); ctx.translate(x - bw / 2 - 4, y + 72); ctx.rotate(w.spin || 0);
    ctx.strokeStyle = sh([150, 156, 172]); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.moveTo(0, 0); ctx.lineTo(13, 0); ctx.stroke();
    ctx.fillStyle = sh([214, 60, 52]); ctx.beginPath(); ctx.arc(13, 0, 5, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgb(' + Math.round(4 + 6 * on) + ',' + Math.round(8 + 10 * on) + ',' + Math.round(8 + 6 * on) + ')'; K.box(x - 52, y + 10, 104, 70, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,122,' + (0.25 + 0.6 * on) + ')'; ctx.lineWidth = 2; K.box(x - 52, y + 10, 104, 70, 5); ctx.stroke();
    if (on > 0.3) glow(x, y + 45, 90, '255,200,110', 0.10 * on);
    var lines = w.lines || [];
    ctx.font = '700 17px ui-monospace, "SF Mono", Menlo, Consolas, monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (i = 0; i < lines.length && i < 3; i++) {
      ctx.fillStyle = lines[i].hot ? 'rgb(157,255,180)' : 'rgba(238,242,252,0.86)';
      if (lines[i].hot) { ctx.shadowColor = 'rgba(120,255,150,0.9)'; ctx.shadowBlur = 10; }
      ctx.fillText(lines[i].text, x - 44, y + 25 + i * 20, 90); ctx.shadowBlur = 0;
    }
    if (on > 0.3 && !lines.length && Math.sin(V.t * 5) > 0) { ctx.fillStyle = 'rgba(255,210,122,0.9)'; ctx.fillRect(x - 44, y + 18, 9, 15); }
    /* a small lamp on the box: lit while the winch runs */
    ctx.fillStyle = w.run ? 'rgb(157,255,180)' : sh([70, 78, 96]); ctx.beginPath(); ctx.arc(x + 46, y + 92, 4.5, 0, TAU); ctx.fill();
    if (w.run) glow(x + 46, y + 92, 22, '120,255,150', 0.5);
  }
  var PAW = { billy: [255, 245, 230], bobby: [255, 248, 236], hog: [236, 196, 160] };
  function bucket(V) {
    var b = V.bucket || {}, at = bucketAt(b), rider = V.rider, ch = rider && V.chars[rider], tilt = (b.tilt || 0) + (b.sw || 0), s, c = Math.cos(tilt), sn = Math.sin(tilt);
    /* the pulley on the rope and the two cords down to the rim */
    ctx.strokeStyle = sh([150, 130, 96]); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath();
    for (s = -1; s <= 1; s += 2) { ctx.moveTo(at.x, at.rope + 8); ctx.lineTo(at.x + s * 46 * c, at.y + s * 46 * sn); }
    ctx.stroke();
    ctx.fillStyle = sh([78, 82, 94]); ctx.beginPath(); ctx.arc(at.x, at.rope + 3, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = sh([28, 30, 38]); ctx.beginPath(); ctx.arc(at.x, at.rope + 3, 2.6, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(at.x, at.y); ctx.rotate(tilt);
    /* the inside of the pail */
    ctx.fillStyle = sh([34, 24, 18]); ctx.beginPath(); ctx.ellipse(0, 0, 48, 9, 0, 0, TAU); ctx.fill();
    if (ch) {
      var sz = ch.s || R.size[rider];
      ctx.save(); ctx.beginPath(); ctx.rect(-140, -260, 280, 264); ctx.clip();
      ctx.translate(0, (rider === 'hog' ? -0.30 : -0.42) * sz - (b.pop || 0) * sz); if (ch.rot) ctx.rotate(ch.rot); ctx.scale(sz, sz);
      var p = ch.p || {}; p.px = sz * cam.z * k; (rider === 'hog' ? C.hog : rider === 'billy' ? C.kitten : C.puppy)(ctx, p);
      ctx.restore();
    }
    /* the front of the pail: staves and two iron hoops */
    ctx.fillStyle = sh([126, 90, 54]); poly([-48, 0, 48, 0, 39, 62, -39, 62]); ctx.fill();
    ctx.strokeStyle = sh([84, 58, 36]); ctx.lineWidth = 1.6; ctx.beginPath();
    for (s = -3; s <= 3; s++) { ctx.moveTo(s * 13.2, 4); ctx.lineTo(s * 10.8, 62); }
    ctx.stroke();
    ctx.fillStyle = sh([74, 78, 90]); poly([-46.6, 10, 46.6, 10, 45.5, 18, -45.5, 18]); ctx.fill(); poly([-41.6, 44, 41.6, 44, 40.5, 52, -40.5, 52]); ctx.fill();
    ctx.strokeStyle = sh([160, 120, 76]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-48, 0); ctx.quadraticCurveTo(0, 12, 48, 0); ctx.stroke();
    if (ch && !(b.pop > 0.25)) for (s = -1; s <= 1; s += 2) { ctx.fillStyle = sh(PAW[rider]); ctx.beginPath(); ctx.ellipse(s * (rider === 'hog' ? 12 : 21), 5, rider === 'hog' ? 5.5 : 8, rider === 'hog' ? 4.5 : 6.5, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function rock(V) {
    var x = R.rock.x, y = R.rock.top;
    ctx.fillStyle = grad(0, y, 0, y + 90, sh([150, 154, 170]), sh([46, 48, 58]));
    ctx.beginPath(); ctx.moveTo(x - 58, y + 100); ctx.bezierCurveTo(x - 64, y + 30, x - 44, y + 2, x - 14, y); ctx.bezierCurveTo(x + 18, y - 3, x + 50, y + 8, x + 58, y + 44); ctx.lineTo(x + 62, y + 100); ctx.closePath(); ctx.fill();
    /* the flat top catches the light, so the rock reads as a rock at night */
    ctx.fillStyle = sh([186, 190, 206], 0.55); ctx.beginPath(); ctx.moveTo(x - 46, y + 12); ctx.quadraticCurveTo(x - 12, y - 1, x + 40, y + 9); ctx.quadraticCurveTo(x + 8, y + 16, x - 46, y + 12); ctx.fill();
    ctx.strokeStyle = sh([28, 30, 38], 0.6); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 30, y + 22); ctx.lineTo(x - 22, y + 44); ctx.lineTo(x - 30, y + 62); ctx.moveTo(x + 26, y + 20); ctx.lineTo(x + 34, y + 48); ctx.stroke();
  }
  function riverChar(V, who) {
    var a = V.chars && V.chars[who]; if (!a || a.show === false || V.rider === who) return;
    animal(who, a);
  }
  function drawRiver(V) {
    var ch = V.chars || {}, i;
    weatherBack(V);
    world();
    riverBack(V);
    if (V.wall > 0.001) {
      /* the storm, coming across the water after them */
      var fx = lerp(-520, 560, V.wall), pts = [];
      for (i = 0; i < 9; i++) pts.push([fx + 60 * Math.sin(i * 1.3), -80 + i * 78]);
      stormWall(pts, 120, V.st, [-2000, -400, fx, -400, fx, 620, -2000, 620]);
    }
    water(V, 0);
    tree(V);
    banks(V);
    bridgeStumps();
    post(R.pf, V.st); post(R.pn, V.st);
    water(V, 1);
    rope(V);
    rock(V);
    bucket(V);
    winch(V);
    if (ch.hog && ch.hog.at === 'rock') riverChar(V, 'hog');
    water(V, 2);
    /* spray where the flood hits the rock */
    var wy = waterY(V);
    ctx.fillStyle = sh([214, 208, 196], 0.5);
    for (i = 0; i < 7; i++) { var ph = (V.st * 1.7 + i * 0.37) % 1; ctx.beginPath(); ctx.arc(R.rock.x - 58 + 116 * h1(i + 2), wy + 2 - 26 * ph * (1 - ph) * 4 * (0.4 + 0.6 * h1(i)), 2.2 * (1 - ph) + 0.6, 0, TAU); ctx.fill(); }
    var order = ['billy', 'bobby', 'hog'];
    for (i = 0; i < 3; i++) if (!(order[i] === 'hog' && ch.hog && ch.hog.at === 'rock')) riverChar(V, order[i]);
    blink(V.blink, V.t);
    grassOn(-360, R.nearEdge - 10, R.bank + 16, R.bank + 6, V.st + 1, 2); grassOn(R.farEdge + 10, 1720, R.bank + 16, R.bank + 6, V.st + 4, 2);
    ctx.restore();
    weatherFront(V);
    K.finish(V);
  }

  /* ---------- the lane ---------- */
  /* x runs along the lane from the river (0) to the garden gate (2100). The lane climbs to the right.
     Five stretches of 420. A lantern post stands at the start of each stretch. */
  var L = { len: 2100, seg: 420, n: 5, logAt: 0.55, bank: -150, trees: [2, 3, 4], gate: 2190,
    size: { billy: 28, bobby: 28, hog: 21, ball: 16 }, off: { billy: 44, bobby: 0, hog: -40 }, dy: { billy: 0, bobby: -5, hog: 5 } };
  function laneY(x) { x = clamp(x, L.bank, L.len); return 548 - 0.085 * x + 4 * Math.sin(x / 130); }
  function logX(i) { return (L.trees[i] + L.logAt) * L.seg; }
  function postTop(x) { return laneY(x) - 172; }
  /* the camera that puts a place along the lane at a spot on the screen (in the 1366 by 768 design) */
  function laneCam(pack, sx, sy, z) { z = z || 1; return { x: pack - (sx - 683) / z, y: laneY(pack) - (sy - 384) / z, z: z }; }
  function al(v) { return Math.floor(v / 30) * 30; }
  /* a band of ground that follows the lane, between two offsets from its centre line */
  function band(xa, xb, o0, o1) {
    var x; ctx.beginPath(); ctx.moveTo(xa, laneY(xa) + o0);
    for (x = al(xa) + 30; x < xb; x += 30) ctx.lineTo(x, laneY(x) + o0);
    ctx.lineTo(xb, laneY(xb) + o0); ctx.lineTo(xb, o1 == null ? 1e4 : laneY(xb) + o1);
    if (o1 != null) for (x = al(xb); x > xa; x -= 30) ctx.lineTo(x, laneY(x) + o1);
    ctx.lineTo(xa, o1 == null ? 1e4 : laneY(xa) + o1); ctx.closePath();
  }
  /* a tapered trunk from its foot to its top */
  function trunk(xa, ya, wa, xb, yb, wb, c) {
    var dx = xb - xa, dy = yb - ya, len = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / len, ny = dx / len;
    ctx.fillStyle = sh(c); poly([xa + nx * wa / 2, ya + ny * wa / 2, xb + nx * wb / 2, yb + ny * wb / 2, xb - nx * wb / 2, yb - ny * wb / 2, xa - nx * wa / 2, ya - ny * wa / 2]); ctx.fill();
    ctx.fillStyle = sh([c[0] * 0.55, c[1] * 0.55, c[2] * 0.55], 0.9); poly([xa + nx * wa / 2, ya + ny * wa / 2, xb + nx * wb / 2, yb + ny * wb / 2, xb + nx * wb * 0.16, yb + ny * wb * 0.16, xa + nx * wa * 0.16, ya + ny * wa * 0.16]); ctx.fill();
  }
  /* a storm-blown crown of leaves */
  function crown(x, y, r, st, seed, near, ca, cb) {
    var w = (Sc.wind(st) + Sc.gust(st)) * r * 0.09, i, a;
    ctx.fillStyle = sh(ca || (near ? [17, 36, 29] : [12, 25, 24]));
    for (i = 0; i < 6; i++) { a = i / 6 * TAU + seed; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.52 + w * (1 + 0.4 * Math.sin(st * 2.3 + i + seed)), y + Math.sin(a) * r * 0.36, r * (0.56 + 0.2 * h1(seed * 7 + i)), 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.arc(x + w, y, r * 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = sh(cb || (near ? [30, 60, 42] : [19, 38, 32]), 0.85);
    for (i = 0; i < 4; i++) { a = 3.3 + i * 0.62 + seed * 0.3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.5 + w * 1.2, y + Math.sin(a) * r * 0.34 - r * 0.1, r * (0.26 + 0.1 * h1(seed * 3 + i)), 0, TAU); ctx.fill(); }
  }
  var hedgeTrees = (function () {
    var out = [], n, x, j, ok;
    for (n = -4; n < 18; n++) {
      x = n * 166 + 20 + 96 * h1(n + 31); ok = x < L.gate - 70 || x > L.gate + 400;
      for (j = 0; j < 3; j++) if (Math.abs(x - logX(j)) < 96) ok = false;
      if (ok) out.push({ x: x, h: 150 + 100 * h1(n + 77), r: 50 + 20 * h1(n + 5), s: n + 0.37 });
    }
    return out;
  })();
  function lantern(V, x, lit) {
    var by = laneY(x) - 22, top = postTop(x), sw = Math.sin(V.t * 2.6 + x) * 0.16 * Math.min(1.2, Sc.wind(V.st) + Sc.gust(V.st));
    wood(x, top, 9, by - top + 4, [44, 40, 42]);
    ctx.fillStyle = sh([44, 40, 42]); ctx.fillRect(x - 8, top - 3, 16, 5);
    ctx.strokeStyle = sh([44, 40, 42]); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, top + 22); ctx.lineTo(x + 30, top + 22); ctx.stroke();
    ctx.save(); ctx.translate(x + 30, top + 24); ctx.rotate(sw);
    ctx.strokeStyle = sh([30, 28, 30]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 9); ctx.stroke();
    ctx.fillStyle = sh([30, 28, 30]); poly([-10, 13, 0, 7, 10, 13]); ctx.fill();
    ctx.fillStyle = lit > 0.02 ? 'rgba(255,214,130,' + (0.25 + 0.75 * lit) + ')' : sh([56, 60, 70]); ctx.fillRect(-6.5, 13, 13, 17);
    ctx.fillStyle = sh([30, 28, 30]); ctx.fillRect(-8, 30, 16, 3); ctx.fillRect(-1, 13, 2, 17);
    ctx.restore();
    if (lit > 0.02) glow(x + 30, top + 46, 130, '255,190,100', 0.34 * lit * (0.9 + 0.1 * Math.sin(V.t * 7 + x)));
  }
  /* one of the three trees the lightning brings down. f: 0 standing, 1 lying across the lane. */
  function stormTree(V, i, part) {
    var f = (V.logs && V.logs[i]) || 0, bx = logX(i), ly = laneY(bx), by = ly - 22, c = [50, 38, 30], st = V.st;
    if (f <= 0) {
      if (part !== 'back') return;
      var lean = (Sc.wind(st) + Sc.gust(st)) * 8;
      trunk(bx, by + 4, 32, bx + lean, by - 300, 15, c); crown(bx + lean, by - 316, 92, st, i + 1.3, true);
      return;
    }
    /* as it comes down it comes towards her, out of the dark and into the lantern light: the bark and the leaves brighten */
    var e = f * f, d = smooth((f - 0.55) / 0.45), g = smooth((f - 0.9) / 0.1);
    var fx = lerp(bx, bx - 6, d), fy = lerp(by - 34, by + 6, d), tx = lerp(bx, bx + 78, e), ty = lerp(by - 300, ly + 92, e);
    var bark = [lerp(50, 132, e), lerp(38, 98, e), lerp(30, 66, e)], ca = [lerp(17, 27, e), lerp(36, 58, e), lerp(29, 41, e)], cb = [lerp(30, 50, e), lerp(60, 96, e), lerp(42, 62, e)];
    if (part === 'back') {
      /* the shadow it throws on the lane, the stump, and the trunk */
      if (f > 0.9) { ctx.fillStyle = 'rgba(0,0,0,' + 0.34 * g + ')'; poly([fx + 22, fy, tx + 52, ty, tx + 24, ty, fx + 4, fy]); ctx.fill(); }
      trunk(bx - 22, by + 4, 34, bx - 22, by - 30, 30, c);
      ctx.fillStyle = sh([168, 134, 88]); poly([bx - 37, by - 30, bx - 31, by - 46, bx - 26, by - 33, bx - 20, by - 52, bx - 15, by - 34, bx - 10, by - 42, bx - 7, by - 30]); ctx.fill();
      trunk(fx, fy, lerp(30, 38, e), tx, ty, lerp(15, 58, e), bark);
      if (e > 0.3) {
        /* wet bark catching the lantern light, and the rings of the bark, so it reads as a thick log lying across the lane */
        var dx = tx - fx, dy = ty - fy, len = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / len, ny = dx / len, wa = lerp(30, 38, e), wb = lerp(15, 58, e), al = smooth((e - 0.3) / 0.7);
        ctx.fillStyle = sh([176, 136, 92], 0.7 * al); poly([fx - nx * wa / 2, fy - ny * wa / 2, tx - nx * wb / 2, ty - ny * wb / 2, tx - nx * wb * 0.3, ty - ny * wb * 0.3, fx - nx * wa * 0.3, fy - ny * wa * 0.3]); ctx.fill();
        ctx.strokeStyle = 'rgba(20,14,10,' + 0.4 * al + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        [0.2, 0.42, 0.64].forEach(function (q) { var w = lerp(wa, wb, q) * 0.46, x0 = lerp(fx, tx, q), y0 = lerp(fy, ty, q); ctx.beginPath(); ctx.moveTo(x0 - nx * w, y0 - ny * w); ctx.quadraticCurveTo(x0 + dx / len * 7, y0 + dy / len * 7, x0 + nx * w, y0 + ny * w); ctx.stroke(); });
      }
      if (g > 0) {
        /* three snapped branches stand up from it: it is plainly too high to run over */
        [[0.1, 14, 54, 10], [0.3, -12, 62, 9], [0.5, 16, 48, 9]].forEach(function (b, n) {
          var x0 = lerp(fx, tx, b[0]), y0 = lerp(fy, ty, b[0]);
          ctx.strokeStyle = sh([126, 94, 64]); ctx.lineCap = 'round'; ctx.lineWidth = b[3]; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + b[1] * g, y0 - b[2] * g); ctx.stroke();
          crown(x0 + b[1] * g * 1.15, y0 - b[2] * g - 5, 21 * g, st, i + 4.1 + n * 1.7, true, ca, cb);
        });
      }
    } else crown(tx + 14 * e, ty - 16 + 62 * e, 92 * lerp(1, 0.9, e), st, i + 1.3, true, ca, cb);
  }
  function house(V) {
    var g = laneY(L.len) - 22, x0 = L.gate + 80, x1 = L.gate + 330, i;
    ctx.fillStyle = sh([40, 36, 42]); ctx.fillRect(x1 - 66, g - 262, 28, 70);
    ctx.fillStyle = sh([74, 68, 72]); ctx.fillRect(x0, g - 172, x1 - x0, 176);
    ctx.fillStyle = sh([48, 44, 50], 0.85); ctx.fillRect(x1 - 60, g - 172, 60, 176);
    ctx.strokeStyle = sh([50, 46, 52], 0.7); ctx.lineWidth = 1.5; ctx.beginPath();
    for (i = 0; i < 9; i++) { var sx = x0 + 14 + 240 * h1(i + 61), sy = g - 20 - 140 * h1(i + 87); ctx.moveTo(sx, sy); ctx.lineTo(sx + 20, sy); ctx.moveTo(sx + 10, sy); ctx.lineTo(sx + 10, sy + 9); }
    ctx.stroke();
    ctx.fillStyle = sh([36, 32, 40]); poly([x0 - 24, g - 164, (x0 + x1) / 2, g - 276, x1 + 24, g - 164, x1 + 24, g - 154, x0 - 24, g - 154]); ctx.fill();
    /* the door, shut, with a small lit pane */
    ctx.fillStyle = sh([36, 30, 30]); K.box(x0 + 38, g - 126, 76, 130, 5); ctx.fill();
    ctx.fillStyle = sh([98, 58, 36]); K.box(x0 + 44, g - 120, 64, 124, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,206,120,0.92)'; ctx.fillRect(x0 + 62, g - 106, 28, 22);
    ctx.fillStyle = sh([200, 170, 90]); ctx.beginPath(); ctx.arc(x0 + 98, g - 56, 3.4, 0, TAU); ctx.fill();
    ctx.fillStyle = sh([58, 56, 62]); ctx.fillRect(x0 + 30, g, 92, 7);
    /* the lit window */
    ctx.fillStyle = sh([36, 30, 30]); ctx.fillRect(x0 + 150, g - 124, 68, 62);
    ctx.fillStyle = 'rgb(255,206,120)'; ctx.fillRect(x0 + 155, g - 119, 58, 52);
    ctx.strokeStyle = 'rgb(40,24,8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 184, g - 119); ctx.lineTo(x0 + 184, g - 67); ctx.moveTo(x0 + 155, g - 93); ctx.lineTo(x0 + 213, g - 93); ctx.stroke();
    glow(x0 + 184, g - 93, 170, '255,190,100', 0.4 * (0.93 + 0.07 * Math.sin(V.t * 5)));
    glow(x0 + 76, g - 95, 70, '255,190,100', 0.3);
  }
  function gatePost(x, y, h) {
    ctx.fillStyle = sh([70, 72, 80]); ctx.fillRect(x - 12, y - h, 24, h + 3);
    ctx.fillStyle = sh([44, 46, 54], 0.9); ctx.fillRect(x + 4, y - h, 8, h + 3);
    ctx.fillStyle = sh([88, 90, 98]); ctx.fillRect(x - 15, y - h - 7, 30, 8);
  }
  function star(x, y, r, a) {
    ctx.beginPath(); for (var j = 0; j < 10; j++) { var rr = j % 2 ? r * 0.45 : r, an = a + j * TAU / 10; if (j) ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); else ctx.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    ctx.closePath(); ctx.fill();
  }
  function laneGrass(xa, xb, o0, o1, st, pass) {
    var w = Sc.wind(st) + Sc.gust(st), P = 1380, n, i;
    ctx.lineCap = 'round';
    ctx.strokeStyle = sh(pass === 0 ? [26, 50, 32] : pass === 1 ? [38, 66, 40] : [54, 88, 50]); ctx.lineWidth = 1.5 + pass * 0.5; ctx.beginPath();
    for (n = Math.floor(xa / P); n <= Math.floor(xb / P); n++) for (i = pass; i < blades.length; i += 3) {
      var b = blades[i], x = (n + b.x) * P; if (x < xa || x > xb || x < L.bank + 4) continue;
      var y = laneY(x) + lerp(o0, o1, b.d), bh = b.h * (0.55 + 0.6 * b.d), lean = (0.3 + 0.3 * Math.sin(st * 3 + b.ph)) * w * bh;
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.3, y - bh * 0.6, x + lean, y - bh);
    }
    ctx.stroke();
  }
  function drawLane(V) {
    var ch = V.chars || {}, st = V.st, zz = cam.z, i, x, n;
    var x0 = cam.x - VW / 2 / zz - 80, x1 = cam.x + VW / 2 / zz + 80, yb = cam.y + VH / 2 / zz + 60, ga = Math.max(x0, L.bank);
    var lamps = V.lamps == null ? 5 : V.lamps, gy = laneY(L.len);
    weatherBack(V);
    ctx.save(); if (V.shake) ctx.translate(Math.sin(V.t * 71) * V.shake * k, Math.cos(V.t * 57) * V.shake * k);
    world();
    /* far hills: they slide by slowly */
    ctx.save(); ctx.translate((cam.x - 683) * 0.74, cam.y - 326);
    ctx.fillStyle = sh([12, 19, 34]); ctx.beginPath(); ctx.moveTo(-1400, 1400);
    for (i = -1400; i <= 2700; i += 40) ctx.lineTo(i, 246 - 44 * Math.sin(i / 310 + 0.6) - 18 * Math.sin(i / 97 + 2));
    ctx.lineTo(2700, 1400); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate((cam.x - 683) * 0.5, cam.y - 326);
    ctx.fillStyle = sh([10, 16, 28]); ctx.beginPath(); ctx.moveTo(-1400, 1400);
    for (i = -1400; i <= 2700; i += 40) ctx.lineTo(i, 312 - 26 * Math.sin(i / 190 + 2.2) - 10 * Math.sin(i / 61));
    ctx.lineTo(2700, 1400); ctx.closePath(); ctx.fill(); ctx.restore();
    /* the field behind the wall */
    ctx.fillStyle = sh([13, 23, 25]); ctx.beginPath(); ctx.moveTo(x0, 1e4);
    for (x = al(x0); x <= x1 + 30; x += 30) ctx.lineTo(x, laneY(x) - 98 - 24 * Math.sin(x / 260 + 1) - 9 * Math.sin(x / 83));
    ctx.lineTo(x1 + 30, 1e4); ctx.closePath(); ctx.fill();
    /* the flood they crossed, at the foot of the lane */
    if (x0 < L.bank) {
      var wy = laneY(L.bank) + 36;
      ctx.beginPath(); ctx.moveTo(x0, 1e4);
      for (x = al(x0); x <= L.bank + 30; x += 12) ctx.lineTo(x, wy + 4.5 * Math.sin(x * 0.045 + st * 2.9) + 2.7 * Math.sin(x * 0.11 - st * 4));
      ctx.lineTo(L.bank + 30, 1e4); ctx.closePath(); ctx.fillStyle = grad(0, wy, 0, wy + 150, sh([92, 74, 58]), sh([30, 24, 22])); ctx.fill();
      ctx.fillStyle = grad(0, wy - 60, 0, wy + 120, sh([62, 46, 34]), sh([24, 18, 15]));
      poly([L.bank + 60, laneY(L.bank) - 24, L.bank, laneY(L.bank) - 24, L.bank - 9, wy - 8, L.bank - 4, wy + 50, L.bank - 24, 1e4, L.bank + 60, 1e4]); ctx.fill();
    }
    /* trees behind the wall */
    for (i = 0; i < hedgeTrees.length; i++) {
      var t = hedgeTrees[i]; if (t.x < x0 - 120 || t.x > x1 + 120 || t.x < L.bank + 30) continue;
      var tb = laneY(t.x) - 40, tl = (Sc.wind(st) + Sc.gust(st)) * 5;
      trunk(t.x, tb, 17, t.x + tl, tb - t.h, 9, [34, 28, 26]); crown(t.x + tl, tb - t.h - 8, t.r, st, t.s, false);
    }
    /* the back verge and the stone wall */
    ctx.fillStyle = sh([20, 37, 28]); band(ga, x1, -56, null); ctx.fill();
    ctx.fillStyle = sh([36, 39, 48]); band(ga, x1, -52, -30); ctx.fill();
    for (n = Math.floor(ga / 26); n * 26 < x1; n++) {
      x = n * 26; if (x < L.bank + 6 || (x > L.gate - 6 && x < L.gate + 78)) continue;
      var sy2 = laneY(x + 11) - 32, sh2 = 15 + 6 * h1(n + 0.5);
      ctx.fillStyle = sh(h1(n * 1.7) > 0.5 ? [60, 64, 74] : [50, 54, 64]); K.box(x + 1, sy2 - sh2, 23, sh2, 5); ctx.fill();
    }
    /* the lane: packed earth, two ruts, puddles, and the light each lantern throws on it */
    ctx.fillStyle = sh([58, 51, 49]); band(ga, x1, -20, 24); ctx.fill();
    ctx.fillStyle = sh([72, 62, 55]); band(ga, x1, -9, 13); ctx.fill();
    ctx.strokeStyle = sh([40, 35, 34], 0.7); ctx.lineWidth = 2.5; ctx.beginPath();
    for (i = 0; i < 2; i++) { ctx.moveTo(ga, laneY(ga) + (i ? 15 : -11)); for (x = al(ga) + 30; x <= x1; x += 30) ctx.lineTo(x, laneY(x) + (i ? 15 : -11)); }
    ctx.stroke();
    for (n = Math.floor(ga / 150); n * 150 < x1; n++) {
      x = n * 150 + 100 * h1(n + 9); if (x < ga + 30) continue;
      ctx.fillStyle = sh([70, 84, 112], 0.55); ctx.beginPath(); ctx.ellipse(x, laneY(x) + 3 + 14 * (h1(n + 3) - 0.5), 22 + 18 * h1(n + 1), 3.5 + 2.5 * h1(n + 2), -0.085, 0, TAU); ctx.fill();
    }
    for (i = 0; i < L.n; i++) {
      var li = clamp(lamps - i, 0, 1); if (li < 0.02) continue;
      ctx.save(); ctx.translate(i * L.seg + 30, laneY(i * L.seg + 30) + 2); ctx.scale(1, 0.24); glow(0, 0, 150, '255,190,100', 0.26 * li); ctx.restore();
    }
    /* the front verge */
    ctx.fillStyle = grad(0, cam.y + 60, 0, cam.y + 420, sh([25, 44, 30]), sh([11, 20, 17])); band(ga, x1, 24, null); ctx.fill();
    laneGrass(ga, x1, -30, -21, st, 0); laneGrass(ga, x1, 28, 64, st + 2, 1);
    /* the winch post on this bank, where the bucket set them down */
    if (x0 < L.bank + 140) {
      var px = L.bank + 62, pt = laneY(px) - 200;
      wood(px, pt, 18, 180, [86, 64, 44]); ctx.fillStyle = sh([62, 46, 32]); ctx.fillRect(px - 12, pt - 4, 24, 8);
      ctx.fillStyle = sh([70, 74, 84]); ctx.beginPath(); ctx.arc(px, pt + 12, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = sh([150, 130, 96]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, pt + 12); ctx.quadraticCurveTo(px - 220, pt + 84, px - 460, pt + 60); ctx.stroke();
    }
    /* the house at the top of the lane, and its garden gate */
    if (x1 > L.gate - 60) {
      house(V);
      gatePost(L.gate, gy - 22, 78);
      ctx.strokeStyle = sh([96, 70, 46]); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
      for (i = 0; i < 3; i++) { ctx.moveTo(L.gate + 12, gy - 40 - i * 20); ctx.lineTo(L.gate + 72, gy - 44 - i * 20); }
      ctx.moveTo(L.gate + 70, gy - 26); ctx.lineTo(L.gate + 70, gy - 92); ctx.moveTo(L.gate + 14, gy - 38); ctx.lineTo(L.gate + 70, gy - 86); ctx.stroke();
    }
    for (i = 0; i < L.n; i++) if (i * L.seg > x0 - 60 && i * L.seg < x1 + 60) lantern(V, i * L.seg, clamp(lamps - i, 0, 1));
    for (i = 0; i < 3; i++) stormTree(V, i, 'back');
    /* the cast */
    var order = ['bobby', 'billy', 'hog'];
    for (i = 0; i < 3; i++) animal(order[i], ch[order[i]]);
    for (i = 0; i < 3; i++) {
      var a = ch[order[i]]; if (!a || !a.daze || a.show === false) continue;
      /* seeing stars */
      var hy = a.y - (FEET[order[i]] + (order[i] === 'hog' ? 1.7 : 2.25)) * a.s;
      ctx.fillStyle = 'rgba(255,226,120,' + Math.min(1, a.daze) + ')';
      for (n = 0; n < 3; n++) { var an = V.t * 4.2 + n * TAU / 3 + i; star(a.x + Math.cos(an) * a.s * 1.25, hy + Math.sin(an) * a.s * 0.34, 5 + a.s * 0.09, an); }
    }
    blink(V.blink, V.t);
    if (x1 > L.gate - 60) gatePost(L.gate, gy + 27, 86);
    for (i = 0; i < 3; i++) stormTree(V, i, 'front');
    laneGrass(ga, x1, 44, 120, st + 1, 2);
    /* the bolt that brings a tree down, the dust where it lands, and the knock when they hit it */
    if (V.strike && V.strike.u < 1) {
      var s = V.strike, top = cam.y - VH / 2 / zz - 40, seg = 9;
      ctx.save(); ctx.globalAlpha = 1 - s.u * s.u; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (n = 0; n < 2; n++) {
        ctx.strokeStyle = n ? 'rgb(255,255,255)' : 'rgba(170,190,255,0.5)'; ctx.lineWidth = n ? 4 : 14; ctx.beginPath(); ctx.moveTo(s.x - 150, top);
        for (i = 1; i <= seg; i++) ctx.lineTo(lerp(s.x - 150, s.x, i / seg) + (i < seg ? (h1(i * 3.1 + s.x) - 0.5) * 90 : 0), lerp(top, s.y, i / seg));
        ctx.stroke();
      }
      ctx.restore(); glow(s.x, s.y, 240, '200,214,255', 0.7 * (1 - s.u));
    }
    if (V.dust) for (i = 0; i < V.dust.length; i++) {
      var d = V.dust[i]; if (d.u >= 1) continue;
      ctx.fillStyle = sh([150, 140, 128], 0.5 * (1 - d.u));
      for (n = 0; n < 7; n++) { ctx.beginPath(); ctx.arc(d.x + (n - 3) * 34 * (0.3 + d.u), d.y - 40 * d.u * h1(n + 2) - 6, 16 + 40 * d.u * (0.6 + 0.4 * h1(n)), 0, TAU); ctx.fill(); }
    }
    if (V.bonk && V.bonk.u < 1) {
      var bk = V.bonk; ctx.fillStyle = 'rgba(255,236,150,' + (1 - bk.u * bk.u) + ')';
      for (n = 0; n < 7; n++) { var ba = -2.6 + n * 0.52; star(bk.x + Math.cos(ba) * (18 + 70 * bk.u), bk.y + Math.sin(ba) * (18 + 70 * bk.u), 11 - 5 * bk.u, ba + bk.u * 3); }
      glow(bk.x, bk.y, 90, '255,236,170', 0.5 * (1 - bk.u));
    }
    /* the storm behind them */
    if (V.wallX != null) {
      var pts = [], fx = V.wallX;
      for (i = 0; i < 20; i++) pts.push([fx + 60 * Math.sin(i * 1.3), -420 + i * 78]);
      stormWall(pts, 120, st, [fx - 9000, -2000, fx, -2000, fx, 3000, fx - 9000, 3000]);
    }
    ctx.restore(); ctx.restore();
    weatherFront(V);
    K.finish(V);
  }

  /* ---------- the room: chapter 4 and the fire ---------- */
  /* Seen from inside the house. With the camera at D.cam, one unit is one pixel at 1366 by 768.
     The hearth sits low on the left (the plan panel covers the wall above it), then the window, the
     doorway and the door box. The door is hinged on the right and swings into the room. */
  var D = { floor: 560, cam: { x: 683, y: 384, z: 1 }, door: { x0: 610, x1: 830, top: 250 }, win: { x0: 450, y0: 252, x1: 576, y1: 378 },
    box: { x: 852, y: 300, w: 112, h: 86 }, hearth: { x0: 150, x1: 390, top: 440, ox0: 192, ox1: 348, oy: 468 },
    out: { billy: 784, bobby: 718, hog: 655 }, rug: { billy: [452, 634], bobby: [522, 640], hog: [586, 636] },
    size: { billy: 25, bobby: 25, hog: 19 }, perch: [908, 300], sill: [548, 380], hz: 468 };
  var ORDER = ['billy', 'bobby', 'hog'];
  function roomLight(V) {
    var lit = V.fireLit == null ? 1 : V.fireLit, fl = lit * (0.95 + 0.035 * Math.sin(V.t * 9.1) + 0.015 * Math.sin(V.t * 23.3));
    return [lerp(0.27, 0.90, fl), lerp(0.31, 0.74, fl), lerp(0.44, 0.56, fl)];
  }
  function dazeStars(V, who, a, i) {
    if (!(a.daze > 0.01)) return;
    var hy = a.y - (FEET[who] + (who === 'hog' ? 1.7 : 2.25)) * a.s, n;
    ctx.fillStyle = 'rgba(255,226,120,' + Math.min(1, a.daze) + ')';
    for (n = 0; n < 3; n++) { var an = V.t * 4.2 + n * TAU / 3 + i; star(a.x + Math.cos(an) * a.s * 1.25, hy + Math.sin(an) * a.s * 0.34, 5 + a.s * 0.09, an); }
  }
  /* what is outside, seen through one opening: the night, the garden path, the storm, and whoever is still out there */
  function outside(V, x0, y0, x1, y1, ch) {
    var st = V.st, storm = clamp(V.storm || 0, 0, 1), fl = V.flash || 0, hz = D.hz, i, a;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    light.night = NIGHT; light.flash = fl;
    ctx.fillStyle = grad(0, 230, 0, hz, 'rgb(' + (7 + 70 * fl | 0) + ',' + (11 + 80 * fl | 0) + ',' + (24 + 110 * fl | 0) + ')', 'rgb(' + (22 + 70 * fl | 0) + ',' + (34 + 80 * fl | 0) + ',' + (58 + 100 * fl | 0) + ')');
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = sh([34, 50, 40]); ctx.fillRect(x0, hz, x1 - x0, D.floor - hz + 4);
    ctx.fillStyle = sh([104, 100, 108]); poly([706, hz, 734, hz, 806, D.floor, 634, D.floor]); ctx.fill();
    ctx.fillStyle = sh([18, 28, 24]);
    for (i = 0; i < 14; i++) { var hx = 420 + i * 34; if (hx > 690 && hx < 750) continue; ctx.beginPath(); ctx.arc(hx + Math.sin(st * 1.3 + i) * 2, hz - 2, 15 + 7 * h1(i + 11), 0, TAU); ctx.fill(); }
    ctx.fillStyle = sh([70, 72, 80]); ctx.fillRect(694, hz - 20, 7, 22); ctx.fillRect(739, hz - 20, 7, 22);
    /* the storm wall comes up the path and climbs the sky */
    var top = lerp(446, 120, storm), base = lerp(hz + 2, D.floor + 30, storm * storm), r = lerp(24, 64, storm), pts = [];
    for (i = 0; i < 11; i++) pts.push([408 + i * 46, top + 12 * Math.sin(i * 1.9)]);
    for (i = 0; i < 6; i++) pts.push([600 + i * 48, base - r * 0.3]);
    stormWall(pts, r, st, [380, top, 880, top, 880, base, 380, base]);
    ctx.strokeStyle = 'rgba(190,214,240,' + (0.30 + 0.3 * fl) + ')'; ctx.lineWidth = 1.2; ctx.beginPath();
    var w = x1 - x0 + 60, hh = y1 - y0 + 40;
    for (i = 0; i < 30; i++) {
      var ry = y0 - 20 + ((h1(i + 31) * hh + st * 620 * (0.7 + 0.6 * h1(i + 3))) % hh), rx = x0 - 30 + ((h1(i + 5) * w + st * 150) % w);
      ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry - 17);
    }
    ctx.stroke();
    if (ch) for (i = 0; i < 3; i++) { a = ch[ORDER[i]]; if (a && !a.in) { animal(ORDER[i], a); dazeStars(V, ORDER[i], a, i); } }
    /* the storm arrives: everything outside goes black, with lightning in it */
    if (storm > 0.8) {
      var dk = smooth((storm - 0.8) / 0.2);
      ctx.fillStyle = 'rgba(2,3,8,' + dk + ')'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      if (!stormWall.calm) { var beat = Math.floor(st * 4.3), on = h1(beat * 1.7 + x0) > 0.5 ? 1 - (st * 4.3 - beat) : 0; if (on > 0.02) glow(lerp(x0, x1, h1(beat + 2)), lerp(y0, y1, 0.2 + 0.5 * h1(beat + 9)), 150, '150,170,255', 0.5 * on * dk); }
    }
    ctx.restore();
  }
  function hearth(V, lit) {
    var h = D.hearth, f = D.floor, t = V.t, i, cx = (h.ox0 + h.ox1) / 2, base = f - 9;
    /* the chimney breast, the stone surround and the mantel */
    ctx.fillStyle = sh([150, 132, 114]); ctx.fillRect(h.x0 + 14, 150, h.x1 - h.x0 - 28, h.top - 150);
    ctx.fillStyle = sh([132, 124, 118]); ctx.fillRect(h.x0, h.top, h.x1 - h.x0, f - h.top);
    ctx.strokeStyle = sh([84, 78, 76], 0.9); ctx.lineWidth = 1.6; ctx.beginPath();
    for (i = 0; i < 6; i++) { var my = h.top + 18 + i * 19; ctx.moveTo(h.x0, my); ctx.lineTo(h.x1, my); }
    for (i = 0; i < 42; i++) { var row = Math.floor(i / 7), vx = h.x0 + 20 + (i % 7) * 36 + (row % 2) * 18; ctx.moveTo(vx, h.top + 18 + (row - 1) * 19); ctx.lineTo(vx, h.top + 18 + row * 19); }
    ctx.stroke();
    ctx.fillStyle = sh([104, 98, 96]); poly([h.x0 - 22, f, h.x1 + 22, f, h.x1 + 44, f + 24, h.x0 - 44, f + 24]); ctx.fill();
    ctx.fillStyle = sh([98, 66, 42]); ctx.fillRect(h.x0 - 16, h.top - 8, h.x1 - h.x0 + 32, 15);
    ctx.fillStyle = sh([66, 44, 30]); ctx.fillRect(h.x0 - 16, h.top + 5, h.x1 - h.x0 + 32, 3);
    /* a candle and a small picture on the wall above */
    ctx.fillStyle = sh([230, 220, 196]); ctx.fillRect(176, h.top - 26, 7, 18);
    if (lit > 0.2) { glow(179.5, h.top - 32, 22, '255,200,110', 0.5 * lit); ctx.fillStyle = 'rgba(255,226,150,' + lit + ')'; ctx.beginPath(); ctx.ellipse(179.5 + Math.sin(t * 8) * 0.6, h.top - 31, 2.4, 5, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = sh([84, 58, 38]); ctx.fillRect(226, 316, 92, 80);
    ctx.fillStyle = sh([52, 74, 110]); ctx.fillRect(233, 323, 78, 66);
    ctx.fillStyle = sh([240, 236, 210]); ctx.beginPath(); ctx.arc(290, 342, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = sh([60, 96, 70]); ctx.beginPath(); ctx.moveTo(233, 389); ctx.quadraticCurveTo(262, 352, 311, 376); ctx.lineTo(311, 389); ctx.closePath(); ctx.fill();
    /* the opening */
    ctx.beginPath(); ctx.moveTo(h.ox0, f); ctx.lineTo(h.ox0, h.oy + 24); ctx.quadraticCurveTo(cx, h.oy - 16, h.ox1, h.oy + 24); ctx.lineTo(h.ox1, f); ctx.closePath();
    ctx.fillStyle = 'rgb(' + Math.round(10 + 34 * lit) + ',' + Math.round(7 + 12 * lit) + ',7)'; ctx.fill();
    ctx.strokeStyle = sh([70, 64, 62]); ctx.lineWidth = 5; ctx.stroke();
    /* logs */
    ctx.fillStyle = 'rgb(' + Math.round(34 + 40 * lit) + ',' + Math.round(22 + 14 * lit) + ',16)';
    ctx.save(); ctx.translate(cx - 8, base - 2); ctx.rotate(-0.12); K.box(-52, -9, 104, 15, 7); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(cx + 10, base - 9); ctx.rotate(0.2); K.box(-44, -8, 88, 13, 6); ctx.fill(); ctx.restore();
    glow(cx, base - 6, 46, '255,70,24', 0.14 + 0.3 * lit);
    if (lit > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var pass = 0; pass < 2; pass++) for (i = 0; i < 7; i++) {
        var fx = cx - 51 + i * 17, ht = (40 + 34 * h1(i + 2)) * lit * (0.72 + 0.28 * Math.sin(t * (7 + 3 * h1(i)) + i * 2.1)) * (pass ? 0.58 : 1), wd = (13 + 5 * h1(i + 5)) * (pass ? 0.55 : 1), sw = Math.sin(t * 5 + i) * 5;
        ctx.fillStyle = pass ? 'rgba(255,224,130,0.62)' : 'rgba(255,' + (96 + 44 * h1(i) | 0) + ',26,0.50)';
        ctx.beginPath(); ctx.moveTo(fx - wd, base - 6); ctx.quadraticCurveTo(fx - wd * 0.9, base - 6 - ht * 0.5, fx + sw, base - 6 - ht); ctx.quadraticCurveTo(fx + wd * 0.9, base - 6 - ht * 0.5, fx + wd, base - 6); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,200,110,' + 0.9 * lit + ')';
      for (i = 0; i < 6; i++) { var sp = (t * (0.5 + 0.4 * h1(i + 20)) + h1(i + 30)) % 1; ctx.beginPath(); ctx.arc(cx - 40 + 80 * h1(i + 41) + Math.sin(t * 3 + i) * 5, base - 20 - 62 * sp, 1.5 * (1 - sp) + 0.3, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    if (lit < 0.4) {
      /* the fire is out: a thread of smoke */
      for (i = 0; i < 5; i++) { var sm = (t * 0.32 + i * 0.2) % 1; ctx.fillStyle = 'rgba(150,152,164,' + 0.26 * (0.4 - lit) / 0.4 * (1 - sm) + ')'; ctx.beginPath(); ctx.arc(cx + Math.sin(sm * 5 + i) * 10, base - 14 - 70 * sm, 7 + 12 * sm, 0, TAU); ctx.fill(); }
    }
    /* a basket of logs */
    ctx.fillStyle = sh([122, 90, 56]); poly([62, 522, 128, 522, 120, f, 70, f]); ctx.fill();
    ctx.fillStyle = sh([96, 64, 42]); for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(76 + i * 19, 518 - (i % 2) * 5, 10, 0, TAU); ctx.fill(); }
    ctx.fillStyle = sh([150, 112, 76]); for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(76 + i * 19, 518 - (i % 2) * 5, 5.5, 0, TAU); ctx.fill(); }
  }
  function roomWindow() {
    var w = D.win, mx = (w.x0 + w.x1) / 2, my = (w.y0 + w.y1) / 2;
    ctx.fillStyle = 'rgba(160,190,230,0.07)'; ctx.fillRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; poly([w.x0 + 14, w.y1, w.x0 + 62, w.y0, w.x0 + 84, w.y0, w.x0 + 36, w.y1]); ctx.fill();
    ctx.strokeStyle = sh([104, 70, 46]); ctx.lineWidth = 9; ctx.strokeRect(w.x0 - 3, w.y0 - 3, w.x1 - w.x0 + 6, w.y1 - w.y0 + 6);
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(mx, w.y0); ctx.lineTo(mx, w.y1); ctx.moveTo(w.x0, my); ctx.lineTo(w.x1, my); ctx.stroke();
    ctx.fillStyle = sh([122, 84, 54]); ctx.fillRect(w.x0 - 18, w.y1 + 3, w.x1 - w.x0 + 36, 10);
    ctx.fillStyle = sh([78, 52, 34]); ctx.fillRect(w.x0 - 18, w.y1 + 12, w.x1 - w.x0 + 36, 3);
    /* curtains on a rail */
    ctx.fillStyle = sh([156, 60, 54]);
    ctx.beginPath(); ctx.moveTo(w.x0 - 26, w.y0 - 16); ctx.lineTo(w.x0 + 18, w.y0 - 16); ctx.quadraticCurveTo(w.x0 + 8, my, w.x0 - 6, w.y1 + 2); ctx.lineTo(w.x0 - 28, w.y1 + 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w.x1 + 26, w.y0 - 16); ctx.lineTo(w.x1 - 18, w.y0 - 16); ctx.quadraticCurveTo(w.x1 - 8, my, w.x1 + 6, w.y1 + 2); ctx.lineTo(w.x1 + 28, w.y1 + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = sh([112, 40, 38], 0.8); ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(w.x0 - 14, w.y0 - 14); ctx.quadraticCurveTo(w.x0 - 12, my, w.x0 - 18, w.y1); ctx.moveTo(w.x0 + 2, w.y0 - 14); ctx.quadraticCurveTo(w.x0 - 2, my, w.x0 - 10, w.y1);
    ctx.moveTo(w.x1 + 14, w.y0 - 14); ctx.quadraticCurveTo(w.x1 + 12, my, w.x1 + 18, w.y1); ctx.moveTo(w.x1 - 2, w.y0 - 14); ctx.quadraticCurveTo(w.x1 + 2, my, w.x1 + 10, w.y1); ctx.stroke();
    ctx.fillStyle = sh([64, 44, 32]); ctx.fillRect(w.x0 - 34, w.y0 - 21, w.x1 - w.x0 + 68, 5);
  }
  /* the door leaf: wood round one big pane, so the faces outside show through it */
  function doorLeaf(V) {
    var d = D.door, w = d.x1 - d.x0, a = clamp(V.door || 0, 0, 1) * 1.4 + Math.abs(Math.sin(V.t * 64)) * 0.035 * (V.doorShake || 0);
    var xe = d.x1 - w * Math.cos(a), te = d.top - w * Math.sin(a) * 0.10, be = D.floor + w * Math.sin(a) * 0.30;
    function P(u, v) { return [lerp(d.x1, xe, u), lerp(lerp(d.top, te, u), lerp(D.floor, be, u), v)]; }
    function quad(u0, v0, u1, v1) { var p = P(u0, v0), q = P(u1, v0), r = P(u1, v1), s = P(u0, v1); poly([p[0], p[1], q[0], q[1], r[0], r[1], s[0], s[1]]); }
    quad(0.09, 0.05, 0.91, 0.91); ctx.fillStyle = 'rgba(150,184,230,0.09)'; ctx.fill();
    var p0 = P(0.30, 0.91), p1 = P(0.56, 0.05), p2 = P(0.68, 0.05), p3 = P(0.42, 0.91);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; poly([p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]]); ctx.fill();
    ctx.fillStyle = sh([122, 78, 48]); quad(0, 0, 0.09, 1); ctx.fill(); quad(0.91, 0, 1, 1); ctx.fill(); quad(0, 0, 1, 0.05); ctx.fill(); quad(0, 0.91, 1, 1); ctx.fill();
    quad(0.09, 0.455, 0.91, 0.475); ctx.fill();
    ctx.fillStyle = sh([84, 52, 32], 0.9); quad(0.09, 0.91, 0.91, 0.925); ctx.fill(); quad(0.905, 0.05, 0.925, 0.91); ctx.fill();
    var hd = P(0.955, 0.57); ctx.fillStyle = sh([214, 180, 96]); ctx.beginPath(); ctx.arc(hd[0], hd[1], 5, 0, TAU); ctx.fill();
  }
  function doorBox(V) {
    var b = D.box, o = V.box || {}, on = o.on || 0, x = b.x, y = b.y;
    ctx.strokeStyle = sh([40, 42, 52]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + 44); ctx.lineTo(D.door.x1 + 12, y + 44); ctx.stroke();
    ctx.fillStyle = sh([54, 60, 76]); K.box(x, y, b.w, b.h, 9); ctx.fill();
    ctx.strokeStyle = sh([112, 122, 146]); ctx.lineWidth = 2.5; K.box(x, y, b.w, b.h, 9); ctx.stroke();
    ctx.fillStyle = 'rgb(' + Math.round(4 + 6 * on) + ',' + Math.round(8 + 10 * on) + ',' + Math.round(8 + 6 * on) + ')'; K.box(x + 9, y + 9, b.w - 18, 54, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,122,' + (0.25 + 0.6 * on) + ')'; ctx.lineWidth = 2; K.box(x + 9, y + 9, b.w - 18, 54, 5); ctx.stroke();
    if (on > 0.3) glow(x + b.w / 2, y + 36, 100, '255,200,110', 0.12 * on);
    if (o.word) {
      ctx.font = '700 22px ui-monospace, "SF Mono", Menlo, Consolas, monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillStyle = o.bad ? 'rgb(255,154,143)' : o.hot ? 'rgb(157,255,180)' : 'rgba(238,242,252,0.86)';
      if (o.hot || o.bad) { ctx.shadowColor = o.bad ? 'rgba(255,120,110,0.9)' : 'rgba(120,255,150,0.9)'; ctx.shadowBlur = 10; }
      ctx.fillText(o.word, x + b.w / 2, y + 37, b.w - 30); ctx.shadowBlur = 0; ctx.textAlign = 'left';
    } else if (on > 0.3 && Math.sin(V.t * 5) > 0) { ctx.fillStyle = 'rgba(255,210,122,0.9)'; ctx.fillRect(x + 18, y + 27, 9, 17); }
    ctx.fillStyle = o.run ? 'rgb(157,255,180)' : sh([70, 78, 96]); ctx.beginPath(); ctx.arc(x + b.w - 16, y + b.h - 12, 4.5, 0, TAU); ctx.fill();
    if (o.run) glow(x + b.w - 16, y + b.h - 12, 22, '120,255,150', 0.5);
  }
  function drawRoom(V) {
    var ch = V.chars || {}, f = D.floor, d = D.door, wn = D.win, i, n, lit = V.fireLit == null ? 1 : V.fireLit, fl = V.flash || 0, warm = roomLight(V), a;
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
    world();
    outside(V, wn.x0, wn.y0, wn.x1, wn.y1, null);
    outside(V, d.x0, d.top, d.x1, f, ch);
    light.night = warm; light.flash = fl * 0.3;
    /* the back wall, with the two openings cut out of it */
    ctx.save(); ctx.beginPath(); ctx.rect(-900, -600, 3200, f + 600); ctx.rect(wn.x0, wn.y0, wn.x1 - wn.x0, wn.y1 - wn.y0); ctx.rect(d.x0, d.top, d.x1 - d.x0, f - d.top); ctx.clip('evenodd');
    ctx.fillStyle = sh([176, 152, 126]); ctx.fillRect(-900, -600, 3200, f + 600);
    ctx.fillStyle = sh([164, 140, 114], 0.6); for (i = -8; i < 40; i++) ctx.fillRect(i * 56, 150, 28, 320);
    ctx.fillStyle = sh([70, 54, 44]); ctx.fillRect(-900, -600, 3200, 734);
    ctx.fillStyle = sh([58, 40, 30]); ctx.fillRect(-900, 132, 3200, 20);
    ctx.fillStyle = sh([120, 84, 58]); ctx.fillRect(-900, 474, 3200, f - 474);
    ctx.strokeStyle = sh([84, 56, 38], 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); for (i = -20; i < 60; i++) { ctx.moveTo(i * 38 + 6, 482); ctx.lineTo(i * 38 + 6, f - 12); } ctx.stroke();
    ctx.fillStyle = sh([92, 62, 42]); ctx.fillRect(-900, 468, 3200, 9); ctx.fillRect(-900, f - 12, 3200, 12);
    ctx.fillStyle = grad(360, 0, 1400, 0, 'rgba(4,3,10,0)', 'rgba(4,3,10,0.42)'); ctx.fillRect(360, -600, 2000, f + 600);
    ctx.fillStyle = grad(0, 130, 0, 330, 'rgba(4,3,10,0.30)', 'rgba(4,3,10,0)'); ctx.fillRect(-900, 130, 3200, 200);
    ctx.restore();
    /* the floor: boards, the rug by the fire, the mat at the door */
    ctx.fillStyle = sh([128, 92, 62]); ctx.fillRect(-900, f, 3200, 700);
    ctx.strokeStyle = sh([86, 58, 38], 0.8); ctx.lineWidth = 1.6; ctx.beginPath();
    for (i = -14; i < 30; i++) { var bx = 683 + (i - 8) * 92; ctx.moveTo(bx, f); ctx.lineTo(683 + (bx - 683) * 2.1, f + 420); }
    ctx.stroke();
    ctx.fillStyle = grad(0, f, 0, f + 240, 'rgba(4,3,10,0)', 'rgba(4,3,10,0.40)'); ctx.fillRect(-900, f, 3200, 700);
    ctx.fillStyle = sh([150, 54, 48]); ctx.beginPath(); ctx.ellipse(470, 646, 232, 44, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = sh([226, 196, 150], 0.9); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(470, 646, 214, 36, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = sh([96, 76, 58]); poly([642, f + 5, 798, f + 5, 812, f + 26, 628, f + 26]); ctx.fill();
    /* the hearth, and the light it throws */
    hearth(V, lit);
    glow(270, f - 30, 380, '255,150,60', 0.26 * lit * (0.92 + 0.08 * Math.sin(V.t * 9.1)));
    roomWindow();
    /* a dresser on the right wall */
    ctx.fillStyle = sh([104, 70, 46]); ctx.fillRect(1052, 372, 216, f - 372); ctx.fillRect(1062, 236, 196, 136);
    ctx.fillStyle = sh([70, 46, 32]); ctx.fillRect(1070, 244, 180, 58); ctx.fillRect(1070, 308, 180, 58);
    ctx.fillStyle = sh([124, 86, 56]); ctx.fillRect(1046, 366, 228, 9);
    ctx.fillStyle = sh([222, 214, 198]); for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(1096 + i * 43, 276, 19, 0, TAU); ctx.fill(); }
    ctx.fillStyle = sh([120, 150, 170]); for (i = 0; i < 3; i++) K.box(1090 + i * 56, 326, 26, 40, 5), ctx.fill();
    ctx.strokeStyle = sh([70, 46, 32]); ctx.lineWidth = 2; ctx.strokeRect(1064, 388, 92, f - 400); ctx.strokeRect(1164, 388, 92, f - 400);
    /* the door frame, the step, the door and its box */
    ctx.fillStyle = sh([98, 66, 44]); ctx.fillRect(d.x0 - 13, d.top - 13, 13, f - d.top + 13); ctx.fillRect(d.x1, d.top - 13, 13, f - d.top + 13); ctx.fillRect(d.x0 - 13, d.top - 13, d.x1 - d.x0 + 26, 13);
    ctx.fillStyle = sh([112, 108, 110]); ctx.fillRect(d.x0, f - 3, d.x1 - d.x0, 6);
    doorLeaf(V);
    doorBox(V);
    blink(V.blink, V.t);
    /* everyone who is inside, nearest last */
    var inside = []; for (i = 0; i < 3; i++) { a = ch[ORDER[i]]; if (a && a.in && a.show !== false) inside.push([ORDER[i], a, i]); }
    inside.sort(function (p, q) { return p[1].y - q[1].y; });
    for (i = 0; i < inside.length; i++) { animal(inside[i][0], inside[i][1]); dazeStars(V, inside[i][0], inside[i][1], inside[i][2]); }
    if (V.blanket > 0.01) {
      /* one blanket over the three of them */
      var b = V.blanketAt || [520, 644, 250], bx0 = b[0] - b[2] / 2, bx1 = b[0] + b[2] / 2, by = b[1];
      ctx.save(); ctx.globalAlpha = clamp(V.blanket, 0, 1);
      ctx.beginPath(); ctx.moveTo(bx0 - 14, by + 12);
      ctx.quadraticCurveTo(bx0 - 6, by - 58, bx0 + 36, by - 66);
      for (i = 1; i <= 3; i++) ctx.quadraticCurveTo(lerp(bx0, bx1, (i - 0.5) / 3.3) + 18, by - 84 + (i === 3 ? 22 : 0), lerp(bx0, bx1, i / 3.3) + 26, by - 62 + (i === 3 ? 16 : 0));
      ctx.quadraticCurveTo(bx1 + 10, by - 30, bx1 + 16, by + 12); ctx.closePath();
      ctx.fillStyle = sh([70, 110, 150]); ctx.fill(); ctx.save(); ctx.clip();
      ctx.strokeStyle = sh([226, 214, 186]); ctx.lineWidth = 5; ctx.beginPath();
      for (i = 0; i < 4; i++) { ctx.moveTo(bx0 - 20, by - 62 + i * 21); ctx.quadraticCurveTo(b[0], by - 78 + i * 21, bx1 + 20, by - 54 + i * 21); }
      ctx.stroke(); ctx.restore(); ctx.restore();
    }
    if (V.gust > 0.01) {
      /* the storm is in the room: wind and rain blow in through the doorway */
      var g = clamp(V.gust, 0, 1), mx = (d.x0 + d.x1) / 2;
      ctx.strokeStyle = 'rgba(206,226,244,' + 0.55 * g + ')'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath();
      for (i = 0; i < 64; i++) {
        var ph = (V.t * (1.5 + 1.2 * h1(i)) + h1(i + 40)) % 1, an = lerp(-0.25, Math.PI + 0.25, h1(i + 3)), rr = 30 + ph * 760 * g, sx = mx + (h1(i + 70) - 0.5) * 150, sy = 420 + (h1(i + 80) - 0.5) * 220;
        ctx.moveTo(sx + Math.cos(an) * rr, sy + Math.sin(an) * rr * 0.62); ctx.lineTo(sx + Math.cos(an) * (rr + 34), sy + Math.sin(an) * (rr + 34) * 0.62);
      }
      ctx.stroke();
      ctx.fillStyle = sh([96, 110, 60], 0.9 * g);
      for (i = 0; i < 9; i++) { var lp = (V.t * (0.8 + 0.5 * h1(i + 9)) + h1(i + 50)) % 1, la = lerp(0.1, Math.PI - 0.1, h1(i + 13)); ctx.save(); ctx.translate(mx + Math.cos(la) * lp * 620 * g, 440 + Math.sin(la) * lp * 300 * g); ctx.rotate(V.t * 7 + i); ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.4, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = 'rgba(8,12,28,' + 0.34 * g + ')'; ctx.fillRect(-900, -600, 3200, 2000);
    }
    if (V.bonk && V.bonk.u < 1) {
      var bk = V.bonk; ctx.fillStyle = 'rgba(255,236,150,' + (1 - bk.u * bk.u) + ')';
      for (n = 0; n < 7; n++) { var ba = -2.6 + n * 0.52; star(bk.x + Math.cos(ba) * (16 + 60 * bk.u), bk.y + Math.sin(ba) * (16 + 60 * bk.u), 10 - 4.5 * bk.u, ba + bk.u * 3); }
      glow(bk.x, bk.y, 80, '255,236,170', 0.5 * (1 - bk.u));
    }
    ctx.restore();
    K.finish(V);
  }

  var api = {
    R: R, CAM0: CAM0, screen: screen, owlAt: function () { return [Sc.W * 0.34, Sc.H * 0.44, 37 * Sc.k]; }, bucketAt: bucketAt, waterY: waterY, ropeY: ropeY,
    L: L, laneY: laneY, logX: logX, postTop: postTop, laneCam: laneCam, D: D,
    draw: function (V) {
      begin(V);
      stormWall.calm = !!V.calm;
      if (V.scene === 'river') drawRiver(V);
      else if (V.scene === 'lane') drawLane(V);
      else if (V.scene === 'door') drawRoom(V);
      else {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (V.owl && (V.owl.open > 0.01 || V.owl.body > 0.01)) {
          var o = V.owl, s = 37 * k, ox = W * 0.34, oy = H * 0.44, keep = light.night;
          glow(ox, oy, s * 5, '255,170,40', 0.16 * (o.open || 0));
          light.night = [0.80, 0.80, 0.86]; light.flash = 0;
          ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
          C.owl(ctx, { t: V.t, open: o.open, turn: o.turn || 0, body: o.body || 0, look: o.look || [0, 0], pupil: o.pupil });
          ctx.restore(); light.night = keep;
        }
        K.finish(V);
      }
    }
  };
  window.HourScene = api;
})();
