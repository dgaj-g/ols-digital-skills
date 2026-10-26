/* J2 L5 THE SEARCH — the hour's pictures, drawn from above on the frozen canvas with the frozen helpers. Stage 1600×900; the picture lives in x 0..1000. */
(function () {
  'use strict';
  var Sc = window.SearchScene, C = window.SearchChars, K = window.SearchCast, U = window.SearchUI, ctx = Sc.ctx, sh = C.sh, rr = C.rr, glow = C.glow, TAU = C.TAU, clamp = C.clamp, lerp = C.lerp;
  var P = {};
  function h1(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
  /* ---------- the ground seen from above: dusk snow, cold blue, a moon glow top right ---------- */
  P.ground = function (t, dark) { var e = Sc.edges(); dark = dark || 0; C.light.k = lerp(0.72, 0.22, dark); C.light.cool = lerp(0.8, 0.98, dark); C.light.warm = 0;
    var g = ctx.createLinearGradient(0, e.t, 0, e.b); g.addColorStop(0, sh([168, 184, 222])); g.addColorStop(1, sh([196, 206, 236])); ctx.fillStyle = g; ctx.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
    for (var i = 0; i < 70; i++) { var x = e.l + h1(i) * (e.r - e.l), y = e.t + h1(i + 90) * (e.b - e.t); ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + 0.08 * h1(i + 7)) + ')'; ell(x, y, 40 + 90 * h1(i + 3), 8 + 14 * h1(i + 5)); }
    ctx.fillStyle = 'rgba(8,10,30,' + (0.55 * dark).toFixed(3) + ')'; ctx.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
    glow(ctx, 940, 60, 260, 'rgba(230,236,255,A)', 0.22 * (1 - 0.5 * dark)); };
  P.snowfall = function (t, amt) { if (U.lighter >= 2) return; var n = Math.round((U.lighter ? 40 : 90) * (amt == null ? 1 : amt)), e = Sc.edges();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; for (var i = 0; i < n; i++) { var sp = 18 + 30 * h1(i + 1), x = e.l + ((h1(i) * 2000 + Math.sin(t * 0.7 + i) * 30) % (e.r - e.l)), y = e.t + ((h1(i + 50) * 1200 + t * sp) % (e.b - e.t)); ell(x, y, 1.3 + 1.6 * h1(i + 9), 1.3 + 1.6 * h1(i + 9)); } };
  P.vignette = function () { var e = Sc.edges(); var g = ctx.createRadialGradient(500, 450, 300, 500, 450, 900); g.addColorStop(0, 'rgba(6,8,24,0)'); g.addColorStop(1, 'rgba(6,8,24,0.55)'); ctx.fillStyle = g; ctx.fillRect(e.l, e.t, e.r - e.l, e.b - e.t); };
  /* a drystone wall from above: a dark band with stones */
  P.wallPath = function (pts, closed) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = sh([44, 44, 60]); ctx.lineWidth = 14; ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); if (closed) ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = sh([84, 86, 104]); ctx.lineWidth = 7; ctx.setLineDash([9, 6]); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1] - 7) : ctx.moveTo(p[0], p[1] - 7); }); if (closed) ctx.closePath(); ctx.stroke(); };
  P.gate = function (x, y, open) { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = sh([120, 92, 60]); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.rotate(open ? -0.9 : 0); ctx.beginPath(); for (var i = 0; i < 4; i++) { ctx.moveTo(-26, -8 + i * 5.5); ctx.lineTo(26, -8 + i * 5.5); } ctx.moveTo(-26, -10); ctx.lineTo(-26, 10); ctx.moveTo(26, -10); ctx.lineTo(26, 10); ctx.stroke(); ctx.restore(); };
  /* ---------- the characters from above, small ---------- */
  P.beep = function (x, y, s, p) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); glow(ctx, 0, 0.2, 2.2, 'rgba(255,214,150,A)', 0.35 * (p.glow == null ? 1 : p.glow)); C.beep(ctx, p); ctx.restore(); };
  P.torch = function (x, y, r, a) { glow(ctx, x, y, r, 'rgba(255,226,160,A)', a == null ? 0.55 : a); };
  P.lamb = function (x, y, s, p) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = 'rgba(20,26,56,0.3)'; ell(0.1, 2.45, 0.9, 0.16); C.lamb(ctx, p); ctx.restore(); };
  /* ---------- the ribbon of light: a list of segments, lit up to a length ---------- */
  P.turtle = function (x, y, headDeg, acts, m) { /* m = px per metre. returns {segs:[{x1,y1,x2,y2,i,len}], pose} */ var segs = [], hd = headDeg; acts.forEach(function (a) { if (a.op === 'forward') { var r = hd * Math.PI / 180, nx = x + Math.cos(r) * a.v * m, ny = y - Math.sin(r) * a.v * m; segs.push({ x1: x, y1: y, x2: nx, y2: ny, i: a.i, len: Math.abs(a.v) * m }); x = nx; y = ny; } else if (a.op === 'left') hd += a.v; else if (a.op === 'right') hd -= a.v; }); return { segs: segs, x: x, y: y, hd: hd }; };
  P.ribbon = function (tr, upto, colour) { /* draw segments up to a total length upto (px) */ var left = upto, lastX = null, lastY = null; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var pass = 0; pass < 2; pass++) { ctx.strokeStyle = pass ? (colour || 'rgba(255,236,190,0.95)') : 'rgba(255,200,120,0.28)'; ctx.lineWidth = pass ? 5 : 22; left = upto; ctx.beginPath();
      for (var i = 0; i < tr.segs.length && left > 0; i++) { var s = tr.segs[i], f = Math.min(1, left / Math.max(1, s.len)); ctx.moveTo(s.x1, s.y1); lastX = s.x1 + (s.x2 - s.x1) * f; lastY = s.y1 + (s.y2 - s.y1) * f; ctx.lineTo(lastX, lastY); left -= s.len; } ctx.stroke(); }
    return lastX == null ? null : { x: lastX, y: lastY }; };
  P.ribbonLen = function (tr) { return tr.segs.reduce(function (a, s) { return a + s.len; }, 0); };
  /* ---------- CHAPTER 1: the hill from above. 20 prints curving from the gate up to the far wall ---------- */
  P.prints = []; (function () { for (var i = 0; i < 20; i++) { var u = i / 19; P.prints.push({ x: 500 + Math.sin(u * 3.1) * 150 - u * 60 + Math.sin(i * 1.7) * 6, y: lerp(790, 170, u) }); } })();
  P.hillAbove = function (t, o) { /* o: lit[], fill[] (0..1 snow in each print), beep{x,y,mood,glow}, torch, dark */
    P.ground(t, o.dark || 0); P.wallPath([[-200, 850], [320, 846], [430, 842], [570, 842], [690, 846], [1200, 850]]); P.gate(500, 843, true);
    P.wallPath([[-200, 128], [300, 124], [620, 118], [1200, 126]]);
    for (var i = 0; i < 20; i++) { var p = P.prints[i], f = o.fill ? o.fill[i] || 0 : 0, lit = o.lit && o.lit[i];
      ctx.fillStyle = 'rgba(96,104,150,' + (0.55 * (1 - f)).toFixed(3) + ')'; ell(p.x - 7, p.y, 8, 11); ell(p.x + 7, p.y - 2, 8, 11); if (f > 0) { ctx.fillStyle = 'rgba(214,222,246,' + (0.8 * f).toFixed(3) + ')'; ell(p.x - 7, p.y + 2 * (1 - f), 8, 11 * (1 - f * 0.4)); ell(p.x + 7, p.y - 2 + 2 * (1 - f), 8, 11 * (1 - f * 0.4)); }
      if (lit) { glow(ctx, p.x, p.y, 44, 'rgba(255,226,160,A)', 0.55); ctx.fillStyle = 'rgba(255,240,200,0.9)'; ell(p.x - 7, p.y, 8, 11); ell(p.x + 7, p.y - 2, 8, 11); } }
    if (o.beep) { if (o.torch) P.torch(o.beep.x, o.beep.y + 30, 90, 0.5); P.beep(o.beep.x, o.beep.y, 22, { t: t, mood: o.beep.mood == null ? 0.6 : o.beep.mood, glow: o.beep.glow, look: o.beep.look || [0, 0.2], torch: o.torch ? 1 : 0, think: o.beep.think || 0 }); }
    P.snowfall(t, o.snow == null ? 1 : o.snow); P.vignette(); };
  /* ---------- CHAPTER 2: a walled field from above (n walls, 100 m = m px) ---------- */
  P.fieldPts = function (n, m, cx, cy) { var pts = [], side = 100 * m, R = side / (2 * Math.sin(Math.PI / n)); for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + (i + 0.5) * TAU / n + (n === 4 ? Math.PI / 4 : n === 3 ? Math.PI / 3 * 0.5 : 0); pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); } return pts; };
  P.field = function (t, o) { /* o: n, dark, tr (turtle), upto, lamb, beepAt{x,y,hd}, start */ P.ground(t, o.dark || 0); var pts = o.pts;
    ctx.fillStyle = 'rgba(190,200,232,0.35)'; ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill(); P.wallPath(pts, true); P.gate(o.start.x, o.start.y, true);
    var end = o.tr ? P.ribbon(o.tr, o.upto) : null; if (o.lamb) P.lamb(o.lamb.x, o.lamb.y, 16, { t: t, fear: 0.6, cold: 0.6, look: [0, -0.2] });
    var bx = end ? end.x : o.start.x, by = end ? end.y : o.start.y; P.torch(bx, by, 70, 0.5); P.beep(bx, by, 20, { t: t, mood: 0.6, look: [0, 0.2], torch: 1 });
    P.snowfall(t, 0.7); P.vignette(); };
  /* ---------- CHAPTER 3: the open field, BEEP at the centre, the lamb out in the dark ---------- */
  P.open = function (t, o) { P.ground(t, o.dark || 0); ctx.fillStyle = 'rgba(190,200,232,0.25)'; ell(500, 470, 440, 380);
    if (o.tr) { var end = P.ribbon(o.tr, o.upto); } var bx = end ? end.x : 500, by = end ? end.y : 470;
    if (o.lamb) { var near = Math.hypot(bx - o.lamb.x, by - o.lamb.y) < 40 || o.found; ctx.globalAlpha = o.found ? 1 : 0.55; P.lamb(o.lamb.x, o.lamb.y, 16, { t: t, fear: o.found ? 0.1 : 0.7, safe: o.found ? 1 : 0, cold: 0.6, bleat: o.bleat || 0, look: [0, -0.2] }); ctx.globalAlpha = 1; if (o.found) P.torch(o.lamb.x, o.lamb.y, 90, 0.7); }
    P.torch(bx, by, 80, 0.5); P.beep(bx, by, 20, { t: t, mood: o.found ? 1 : 0.5, look: [0, 0.2], torch: 1 }); P.snowfall(t, 0.6); P.vignette(); };
  /* ---------- CHAPTER 4: the lane with six gates, the yard, the barn at the top ---------- */
  P.lane = function (t, o) { P.ground(t, o.dark || 0); /* lane runs up x=500 from y 820 to the yard at y 330; yard square 330..150; barn above */
    P.wallPath([[440, 860], [440, 330]]); P.wallPath([[560, 860], [560, 330]]); for (var i = 0; i < 6; i++) { var gy = 800 - i * 78; ctx.fillStyle = o.gates && o.gates[i] ? 'rgba(255,240,200,0.9)' : sh([120, 92, 60]); ctx.fillRect(448, gy - 3, 104, 6); if (o.gates && o.gates[i]) glow(ctx, 500, gy, 50, 'rgba(255,226,160,A)', 0.5); }
    var yard = [[380, 330], [620, 330], [620, 150], [380, 150]]; ctx.fillStyle = 'rgba(190,200,232,0.3)'; ctx.fillRect(380, 150, 240, 180); P.wallPath(yard, true);
    ctx.save(); ctx.translate(500, 60); ctx.fillStyle = sh([120, 60, 50]); rr(ctx, -120, -50, 240, 100, 8); ctx.fill(); ctx.fillStyle = sh([80, 40, 34]); ctx.beginPath(); ctx.moveTo(-130, -50); ctx.lineTo(0, -120); ctx.lineTo(130, -50); ctx.closePath(); ctx.fill();
    ctx.fillStyle = o.door ? 'rgba(255,214,140,0.95)' : sh([50, 30, 26]); rr(ctx, -30, 10, 60, 40, 4); ctx.fill(); if (o.door) glow(ctx, 0, 40, 120, 'rgba(255,214,150,A)', 0.6); ctx.restore();
    if (o.tr) { var end = P.ribbon(o.tr, o.upto); } var bx = end ? end.x : o.start.x, by = end ? end.y : o.start.y;
    if (o.lamb) P.lamb(o.lamb.x, o.lamb.y, 15, { t: t, fear: 0.15, safe: 0.8, cold: 0.4, look: [0, -0.2] });
    if (o.bran) { ctx.save(); ctx.translate(o.bran.x, o.bran.y); ctx.scale(15, 15); K.bran(ctx, { t: t, bark: o.bark || 0, look: [0, -0.3] }); ctx.restore(); }
    if (o.nuala) { ctx.save(); ctx.translate(o.nuala.x, o.nuala.y); ctx.scale(16, 16); glow(ctx, 1.9, 0.7, 2.5, 'rgba(255,226,160,A)', 0.3); C.nuala(ctx, { t: t, torch: -1.3, phone: 1, walk: o.nuala.walk || 0 }); ctx.restore(); }
    P.torch(bx, by, 70, 0.5); P.beep(bx, by, 20, { t: t, mood: o.mood == null ? 0.5 : o.mood, look: [0, 0.2], torch: 1, glow: o.glow }); if (o.ring != null) { ctx.strokeStyle = o.ring < 0.25 ? 'rgba(255,80,60,0.9)' : 'rgba(140,255,160,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bx, by, 34, -Math.PI / 2, -Math.PI / 2 + TAU * o.ring); ctx.stroke(); }
    P.snowfall(t, 0.5); P.vignette(); };
  /* ---------- THE BARN: inside, lamplight, straw, the ewe, the lamb, BEEP on the bale, Nuala in the door with Bran ---------- */
  P.barn = function (t, o) { var e = Sc.edges(); C.light.k = 0.9; C.light.cool = 0.1; C.light.warm = 0.8;
    var g = ctx.createLinearGradient(0, e.t, 0, e.b); g.addColorStop(0, '#2a1a12'); g.addColorStop(1, '#4a2e1c'); ctx.fillStyle = g; ctx.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
    for (var i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(0,0,0,' + (0.08 + 0.1 * h1(i)) + ')'; ctx.fillRect(e.l + i * 120, e.t, 60, e.b - e.t); }
    ctx.fillStyle = '#6b4a24'; ctx.fillRect(e.l, 640, e.r - e.l, e.b - 640); for (i = 0; i < 160; i++) { ctx.strokeStyle = 'rgba(232,190,90,' + (0.3 + 0.5 * h1(i + 2)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); var sx = e.l + h1(i) * (e.r - e.l), sy = 650 + h1(i + 40) * 240; ctx.moveTo(sx, sy); ctx.lineTo(sx + 30 - 60 * h1(i + 8), sy - 6 + 12 * h1(i + 9)); ctx.stroke(); }
    glow(ctx, 520, 160, 420, 'rgba(255,196,110,A)', 0.5 * (o.warm == null ? 1 : o.warm)); ctx.fillStyle = '#1a1008'; rr(ctx, 490, 60, 60, 40, 6); ctx.fill(); ctx.fillStyle = '#ffd98a'; ell(520, 120, 34, 16);
    ctx.save(); ctx.translate(1180, 420); ctx.fillStyle = '#120a06'; ctx.fillRect(-150, -300, 300, 420); ctx.fillStyle = 'rgba(140,170,230,0.6)'; ctx.fillRect(-120, -280, 240, 380); ctx.restore(); /* the open door: the dusk outside */
    ctx.fillStyle = '#c9a052'; rr(ctx, 250, 540, 220, 110, 14); ctx.fill(); ctx.fillStyle = '#a77e38'; rr(ctx, 250, 540, 220, 20, 8); ctx.fill(); /* the bale */
    ctx.save(); ctx.translate(360, 455); ctx.scale(44, 44); C.beep(ctx, { t: t, mood: 1, rotor: o.rotor == null ? 0.2 : o.rotor, hover: 0, look: [0.2, 0.1], blink: o.blink || 0 }); ctx.restore();
    ctx.save(); ctx.translate(700, 560); ctx.scale(42, 42); K.ewe(ctx, { t: t, look: [-0.2, 0.1] }); ctx.restore();
    if (o.lamb) { ctx.save(); ctx.translate(o.lamb.x, o.lamb.y); ctx.scale(44, 44); C.lamb(ctx, { t: t, fear: 0, safe: 1, cold: 0.1, look: [0.3, 0], blink: o.blink || 0, breath: 1 }); ctx.restore(); }
    if (o.nuala) { ctx.save(); ctx.translate(o.nuala.x, o.nuala.y); ctx.scale(o.nuala.s, o.nuala.s); glow(ctx, 0, 0.5, 2.8, 'rgba(255,214,150,A)', 0.25); C.nuala(ctx, { t: t, torch: -0.6, phone: 1, walk: 0, blink: o.blink || 0, look: [-0.3, 0.1] }); ctx.restore();
      ctx.save(); ctx.translate(o.nuala.x + 1.3 * o.nuala.s, o.nuala.y + 1.2 * o.nuala.s); ctx.scale(o.nuala.s * 0.45, o.nuala.s * 0.45); K.bran(ctx, { t: t, lie: o.lie || 0, look: [-0.4, 0] }); ctx.restore(); }
    if (o.name) { ctx.save(); ctx.translate(1180, 300); ctx.rotate(-0.06); ctx.font = '700 64px Caveat'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,236,200,0.95)'; ctx.fillText(o.name, 0, 0); ctx.restore(); } };
  window.SearchPics = P;
})();
