/* ============================================================
   Calming the Storm — the scene
   ------------------------------------------------------------
   One full-screen canvas behind the page: sky, clouds, far
   hills, the sea in six layers, the boat, the other boats,
   rain, lightning, and the light on the water.

   Everything is driven by two things the game sets:
     storm  0 (flat calm) … 1 (the full squall)
     mood   'dusk' (the opening), 'storm', 'calm' (moonlit night)

   No library. Canvas 2D only. Pauses when the tab is hidden.
   Lightning: at most two flashes per strike and never more
   than one strike in four seconds (WCAG 2.3.1), and none at all
   when flashes are switched off.
   ============================================================ */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function rgb(c, a) {
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')';
  }
  function mix3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function add3(a, b, k) { return [Math.min(255, a[0] + b[0] * k), Math.min(255, a[1] + b[1] * k), Math.min(255, a[2] + b[2] * k)]; }

  /* ---------- the three moods ---------- */
  var PAL = {
    dusk: {
      top: [22, 24, 74], mid: [118, 60, 112], low: [246, 150, 92], glow: [255, 204, 120],
      seaFar: [128, 76, 104], seaNear: [24, 26, 70], foam: [255, 222, 190],
      hill: [60, 36, 80], hull: [34, 18, 30], sail: [232, 176, 124], mist: [250, 170, 120]
    },
    storm: {
      top: [4, 9, 14], mid: [16, 38, 46], low: [66, 108, 108], glow: [196, 226, 238],
      seaFar: [52, 96, 100], seaNear: [6, 30, 38], foam: [230, 246, 242],
      hill: [9, 20, 24], hull: [8, 11, 12], sail: [84, 96, 96], mist: [120, 160, 165]
    },
    calm: {
      top: [3, 7, 30], mid: [10, 24, 68], low: [44, 74, 136], glow: [255, 238, 188],
      seaFar: [34, 62, 120], seaNear: [4, 9, 36], foam: [222, 232, 255],
      hill: [7, 14, 42], hull: [8, 12, 32], sail: [160, 174, 210], mist: [90, 120, 190]
    }
  };
  var KEYS = ['top', 'mid', 'low', 'glow', 'seaFar', 'seaNear', 'foam', 'hill', 'hull', 'sail', 'mist'];

  /* ---------- state ---------- */
  var cv, ctx, W = 0, H = 0, ratio = 1, quality = 1;
  var running = false, raf = 0, last = 0, T = 0;
  var reduced = false, flashesOn = true, autoStrikes = false;
  var storm = { v: 0.12, from: 0.12, to: 0.12, t: 1, dur: 1 };
  var gust = 0;
  var mood = { dusk: 1, storm: 0, calm: 0 };
  var moodFrom = { dusk: 1, storm: 0, calm: 0 }, moodTo = { dusk: 1, storm: 0, calm: 0 }, moodT = 1, moodDur = 1;
  var P = {};                       /* the mixed palette for this frame */
  var stage = null, stageTo = null; /* {hz, by, cx, L, lx, ly, top} */
  var layers = [];
  var BOAT_LAYER = 2;
  var stars = [], glints = [], drops = [], spray = [], hillPts = [], shoreLights = [];
  var tex = {};                     /* cloud textures */
  var bolt = null, flash = 0, nextStrike = 0, lastStrike = -10, shake = 0, shown = 0;
  var boat = { y: 0, tilt: 0, init: false };
  var vignette = null;
  var hs = new Float32Array(720);   /* this frame's wave heights for one layer */
  var fps = { acc: 0, n: 0, slow: 0 };
  var api = {};

  /* ---------- cloud textures (made once) ---------- */
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
  function makeCloud(d, w, h, dark, light, lo, hi) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'), img = g.createImageData(w, h), px = img.data;
    for (var k = 0; k < w * h; k++) {
      var n = d[k];
      var a = smooth((n - lo) / (hi - lo));
      var core = smooth((n - lo) / 0.30);
      /* lit from above: look at the density a little higher up */
      var up = k - w * 6 >= 0 ? d[k - w * 6] : n;
      var rim = clamp((n - up) * 7 + 0.35, 0, 1);
      var t = clamp(core * 0.85 - rim * 0.45 + 0.2, 0, 1);
      px[k * 4] = lerp(light[0], dark[0], t);
      px[k * 4 + 1] = lerp(light[1], dark[1], t);
      px[k * 4 + 2] = lerp(light[2], dark[2], t);
      px[k * 4 + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function buildTextures() {
    var w = 512, h = 256;
    var d1 = makeDensity(11, w, h), d2 = makeDensity(47, w, h);
    tex.stormA = makeCloud(d1, w, h, [6, 12, 16], [58, 84, 90], 0.30, 0.52);
    tex.stormB = makeCloud(d2, w, h, [3, 8, 11], [40, 62, 68], 0.27, 0.50);
    tex.flashA = makeCloud(d1, w, h, [70, 96, 120], [232, 244, 255], 0.30, 0.52);
    tex.dusk = makeCloud(d2, w, h, [70, 36, 86], [255, 170, 120], 0.40, 0.62);
    tex.calm = makeCloud(d1, w, h, [14, 26, 66], [120, 146, 210], 0.44, 0.66);
  }

  /* ---------- fixed things (made once, from fixed seeds) ---------- */
  function buildFixed() {
    var r = rng(2026), i;
    for (i = 0; i < 170; i++) stars.push({ u: r(), v: Math.pow(r(), 1.4), s: 0.5 + r() * 1.3, p: r() * TAU, f: 0.6 + r() * 2.2, b: 0.45 + r() * 0.55 });
    for (i = 0; i < 80; i++) glints.push({ u: r() * 2 - 1, v: r(), p: r() * TAU, f: 1.2 + r() * 3.2, w: 0.5 + r() });
    for (i = 0; i <= 64; i++) {
      var u = i / 64;
      hillPts.push(0.46 + 0.30 * Math.sin(u * 5.1 + 1.3) + 0.17 * Math.sin(u * 11.7 + 0.4) + 0.07 * Math.sin(u * 23.3 + 2.2));
    }
    for (i = 0; i < 9; i++) shoreLights.push({ u: 0.04 + r() * 0.92, p: r() * TAU, s: 0.6 + r() * 0.7 });
    var amp = [0.016, 0.040, 0.165, 0.200, 0.270, 0.340];
    var wl = [1.0, 1.45, 2.25, 2.0, 2.6, 3.3];
    var sp = [0.050, 0.075, 0.230, 0.270, 0.300, 0.330];
    for (i = 0; i < 6; i++) layers.push({ amp: amp[i], wl: wl[i], sp: sp[i], ph: r() * 3, p2: r() * TAU, p3: r() * TAU, off: r() * TAU, y: 0 });
  }

  /* ---------- size ---------- */
  function resize() {
    if (!cv) return;
    var w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    W = w; H = h;
    var dpr = window.devicePixelRatio || 1;
    ratio = Math.min(dpr, 2, Math.sqrt(1500000 / (W * H))) * quality;
    ratio = Math.max(0.5, ratio);
    cv.width = Math.round(W * ratio); cv.height = Math.round(H * ratio);
    vignette = null;
    var want = Math.round(clamp(W * H / 4200, 90, 380) * quality);
    drops.length = 0;
    var r = rng(7);
    for (var i = 0; i < want; i++) drops.push({ x: r() * (W + 200) - 200, y: r() * H, len: 12 + r() * 20, v: 0.8 + r() * 0.6, near: r() < 0.45 });
    if (!running) frame(performance.now());
  }

  /* ---------- the stage: where the boat sits ---------- */
  function computeStage(rect) {
    var w = rect.width, h = rect.height;
    var L = clamp(Math.min(w * 0.30, h * 0.52), 40, Math.max(200, Math.min(340, W * 0.19)));
    return {
      top: rect.top,
      hz: rect.top + h * 0.60,
      by: rect.top + h * 0.80,
      cx: rect.left + w * 0.50,
      L: L,
      lx: rect.left + w * (w > h * 1.6 ? 0.80 : 0.78),
      ly: rect.top + h * (rect.moon || 0.20)      /* the calm puts the moon higher, clear of the words */
    };
  }
  api.setStage = function (rect, now) {
    stageTo = computeStage(rect);
    if (!stage || now) { stage = {}; for (var k in stageTo) stage[k] = stageTo[k]; boat.init = false; }
    if (!running) frame(performance.now());
  };

  /* ---------- controls ---------- */
  api.setStorm = function (v, seconds) {
    storm.from = storm.v; storm.to = clamp(v, 0, 1); storm.t = 0; storm.dur = Math.max(0.01, seconds === undefined ? 1.4 : seconds);
  };
  api.setMood = function (name, seconds) {
    moodFrom = { dusk: mood.dusk, storm: mood.storm, calm: mood.calm };
    moodTo = { dusk: 0, storm: 0, calm: 0 }; moodTo[name] = 1;
    moodT = 0; moodDur = Math.max(0.01, seconds === undefined ? 2 : seconds);
  };
  api.gust = function () { gust = Math.min(0.22, gust + 0.18); };
  api.setFlashes = function (on) { flashesOn = !!on; if (!on) { bolt = null; flash = 0; } };
  api.setAuto = function (on) { autoStrikes = !!on; nextStrike = T + 5 + Math.random() * 5; };
  api.onStrike = null;

  /* Returns true when a flash was shown. The thunder is the caller's job. */
  api.strike = function (big) {
    if (!stage) return false;
    lastStrike = T;
    nextStrike = T + 7 + Math.random() * 9;
    if (typeof api.onStrike === 'function') api.onStrike(!!big);
    if (!flashesOn || reduced) return false;
    var s = stage, side = Math.random() < 0.5 ? -1 : 1;
    var x0 = clamp(s.cx + side * (0.9 + Math.random() * 1.6) * s.L, W * 0.04, W * 0.96);
    var x1 = x0 + (Math.random() - 0.5) * s.L * 0.9;
    var y0 = Math.min(-10, s.top - 10), y1 = s.hz - Math.random() * 0.05 * (s.hz - s.top);
    bolt = { lines: [], born: T, big: !!big };
    grow(bolt.lines, x0, y0, x1, y1, (y1 - y0) * 0.16, 1, 0);
    flash = 1;
    shake = big ? 1 : 0.6;
    shown++;
    return true;
  };
  function grow(out, x0, y0, x1, y1, disp, width, depth) {
    var pts = [[x0, y0], [x1, y1]];
    for (var it = 0; it < 6; it++) {
      var nx = [pts[0]];
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i];
        var mx = (a[0] + b[0]) / 2 + (Math.random() - 0.5) * disp;
        var my = (a[1] + b[1]) / 2 + (Math.random() - 0.5) * disp * 0.35;
        nx.push([mx, my], b);
        if (depth < 2 && it >= 1 && it <= 3 && Math.random() < 0.13) {
          var len = (y1 - y0) * (0.18 + Math.random() * 0.22);
          var ang = (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.5);
          grow(out, mx, my, mx + Math.sin(ang) * len, my + Math.cos(ang) * len, len * 0.22, width * 0.5, depth + 1);
        }
      }
      pts = nx; disp *= 0.52;
    }
    out.push({ pts: pts, w: width });
  }
  /* the brightness of a strike over time: one flash, one re-strike, then dark */
  function flashAt(age) {
    if (age < 0) return 0;
    if (age < 0.04) return age / 0.04;
    if (age < 0.14) return lerp(1, 0.12, (age - 0.04) / 0.10);
    if (age < 0.19) return lerp(0.12, 0.72, (age - 0.14) / 0.05);
    if (age < 0.55) return 0.72 * Math.pow(1 - (age - 0.19) / 0.36, 2);
    return 0;
  }

  /* ---------- waves ---------- */
  function waveH(Ly, x, L, k) {
    var th = (x / (Ly.wl * L) - Ly.ph) * TAU + Ly.off;
    var b = Math.sin(th * 2.3 + Ly.p2), c = Math.sin(th * 4.7 - Ly.p3);
    var sines = 0.62 * Math.sin(th) + 0.28 * b + 0.10 * c;
    if (k <= 0.001) return sines;
    var cusp = 1 - 2 * Math.abs(Math.sin(th * 0.5));
    return lerp(sines, 0.74 * cusp + 0.19 * b + 0.07 * c, k);
  }

  /* ---------- the boat ---------- */
  function drawBoat(x, y, L, tilt, e, alpha, main) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt);
    ctx.globalAlpha = alpha;
    var hull = add3(P.hull, P.glow, flash * 0.10);
    var mx = 0.05 * L;
    /* stays */
    if (main) {
      ctx.strokeStyle = rgb(add3(P.hull, P.glow, 0.10), 0.75); ctx.lineWidth = Math.max(0.6, L * 0.005);
      ctx.beginPath();
      ctx.moveTo(mx, -0.84 * L); ctx.lineTo(0.515 * L, -0.30 * L);
      ctx.moveTo(mx, -0.84 * L); ctx.lineTo(-0.50 * L, -0.27 * L);
      ctx.stroke();
    }
    /* sail */
    var belly = (0.04 + 0.11 * e) * L + Math.sin(T * 8.3) * 0.010 * L * e;
    var yT = -0.76 * L, yB = -0.23 * L, yM = (yT + yB) / 2;
    var sailTop = add3(P.sail, P.glow, 0.10 + flash * 0.5), sailLow = mix3(P.sail, P.hull, 0.45);
    var sg = ctx.createLinearGradient(mx - 0.25 * L, yT, mx + 0.30 * L, yB);
    sg.addColorStop(0, rgb(sailTop)); sg.addColorStop(1, rgb(sailLow));
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(mx - 0.25 * L, yT);
    ctx.lineTo(mx + 0.25 * L, yT);
    ctx.quadraticCurveTo(mx + 0.25 * L + belly * 1.5, yM, mx + 0.23 * L + belly * 0.35, yB);
    ctx.quadraticCurveTo(mx + belly * 0.6, yB - 0.035 * L, mx - 0.23 * L + belly * 0.35, yB);
    ctx.quadraticCurveTo(mx - 0.25 * L + belly * 0.9, yM, mx - 0.25 * L, yT);
    ctx.fill();
    if (main) {
      /* seams */
      ctx.strokeStyle = rgb(P.hull, 0.22); ctx.lineWidth = Math.max(0.5, L * 0.004);
      ctx.beginPath();
      for (var q = -1; q <= 1; q++) {
        var sx = mx + q * 0.125 * L;
        ctx.moveTo(sx, yT); ctx.quadraticCurveTo(sx + belly * 1.15, yM, sx + belly * 0.35, yB - 0.015 * L);
      }
      ctx.stroke();
    }
    /* mast and yard */
    ctx.fillStyle = rgb(hull);
    ctx.fillRect(mx - 0.009 * L, -0.86 * L, 0.018 * L, 0.80 * L);
    ctx.fillRect(mx - 0.27 * L, yT - 0.012 * L, 0.54 * L, 0.020 * L);
    /* hull */
    ctx.beginPath();
    ctx.moveTo(-0.505 * L, -0.27 * L);
    ctx.quadraticCurveTo(-0.53 * L, -0.04 * L, -0.38 * L, 0.055 * L);
    ctx.lineTo(0.33 * L, 0.055 * L);
    ctx.quadraticCurveTo(0.51 * L, 0.02 * L, 0.525 * L, -0.31 * L);
    ctx.quadraticCurveTo(0.49 * L, -0.19 * L, 0.43 * L, -0.155 * L);
    ctx.quadraticCurveTo(0.0, -0.065 * L, -0.43 * L, -0.145 * L);
    ctx.quadraticCurveTo(-0.475 * L, -0.17 * L, -0.505 * L, -0.27 * L);
    ctx.closePath();
    var hg = ctx.createLinearGradient(0, -0.2 * L, 0, 0.06 * L);
    hg.addColorStop(0, rgb(add3(hull, P.glow, 0.10))); hg.addColorStop(1, rgb(hull));
    ctx.fillStyle = hg; ctx.fill();
    if (main) {
      /* the light catching the top edge, and two plank lines */
      ctx.strokeStyle = rgb(P.glow, 0.30 + flash * 0.5); ctx.lineWidth = Math.max(0.7, L * 0.006);
      ctx.beginPath();
      ctx.moveTo(0.43 * L, -0.155 * L); ctx.quadraticCurveTo(0.0, -0.065 * L, -0.43 * L, -0.145 * L);
      ctx.stroke();
      ctx.strokeStyle = rgb(P.glow, 0.10); ctx.lineWidth = Math.max(0.5, L * 0.004);
      ctx.beginPath();
      ctx.moveTo(0.45 * L, -0.085 * L); ctx.quadraticCurveTo(0.0, -0.005 * L, -0.45 * L, -0.075 * L);
      ctx.moveTo(0.42 * L, -0.025 * L); ctx.quadraticCurveTo(0.0, 0.04 * L, -0.42 * L, -0.015 * L);
      ctx.stroke();
    }
    /* the lantern at the stern */
    var lxp = -0.505 * L, lyp = -0.31 * L;
    var fl = 0.82 + 0.18 * Math.sin(T * 11 + x) * Math.sin(T * 5.3);
    ctx.globalCompositeOperation = 'lighter';
    var gr = ctx.createRadialGradient(lxp, lyp, 0, lxp, lyp, L * (main ? 0.30 : 0.55));
    gr.addColorStop(0, 'rgba(255,200,110,' + (0.55 * fl) + ')');
    gr.addColorStop(0.25, 'rgba(255,170,80,' + (0.20 * fl) + ')');
    gr.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(lxp, lyp, L * (main ? 0.30 : 0.55), 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,236,190,' + fl + ')';
    ctx.beginPath(); ctx.arc(lxp, lyp, Math.max(1, L * 0.014), 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- one frame ---------- */
  function frame(now) {
    if (!ctx || !stage || !W) return;
    var dt = clamp((now - last) / 1000, 0, 0.05); last = now;
    if (!running) dt = 0;
    T += dt;
    var i, k;

    /* ease the storm, the mood and the stage */
    if (storm.t < 1) { storm.t = Math.min(1, storm.t + dt / storm.dur); storm.v = lerp(storm.from, storm.to, smooth(storm.t)); }
    if (moodT < 1) {
      moodT = Math.min(1, moodT + dt / moodDur);
      var mt = smooth(moodT);
      mood.dusk = lerp(moodFrom.dusk, moodTo.dusk, mt); mood.storm = lerp(moodFrom.storm, moodTo.storm, mt); mood.calm = lerp(moodFrom.calm, moodTo.calm, mt);
    }
    gust = Math.max(0, gust - dt * 0.11);
    var e = clamp(storm.v + gust, 0, 1.15);
    if (reduced) e *= 0.45;
    var follow = 1 - Math.exp(-dt * 3.2);
    for (k in stageTo) stage[k] += (stageTo[k] - stage[k]) * follow;
    for (i = 0; i < KEYS.length; i++) {
      var a = PAL.dusk[KEYS[i]], b = PAL.storm[KEYS[i]], c = PAL.calm[KEYS[i]];
      P[KEYS[i]] = [a[0] * mood.dusk + b[0] * mood.storm + c[0] * mood.calm, a[1] * mood.dusk + b[1] * mood.storm + c[1] * mood.calm, a[2] * mood.dusk + b[2] * mood.storm + c[2] * mood.calm];
    }
    var S = stage, L = S.L, hz = S.hz;

    /* lightning on its own clock */
    if (autoStrikes && running && e > 0.3 && mood.storm > 0.6 && T > nextStrike && T - lastStrike > 4) api.strike(false);
    flash = bolt ? flashAt(T - bolt.born) : 0;
    if (bolt && T - bolt.born > 0.6) bolt = null;
    shake = Math.max(0, shake - dt * 2.2);

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    /* sky */
    var sky = ctx.createLinearGradient(0, Math.min(0, S.top), 0, hz);
    sky.addColorStop(0, rgb(add3(P.top, P.glow, flash * 0.16)));
    sky.addColorStop(0.58, rgb(add3(P.mid, P.glow, flash * 0.22)));
    sky.addColorStop(1, rgb(add3(P.low, P.glow, flash * 0.26)));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz + 2);
    ctx.fillStyle = rgb(P.seaFar); ctx.fillRect(0, hz, W, H - hz);

    if (shake > 0.01 && !reduced) ctx.translate((Math.random() - 0.5) * 5 * shake, (Math.random() - 0.5) * 4 * shake);

    /* stars */
    var starA = (mood.calm + mood.dusk * 0.30) * (1 - 0.9 * mood.storm);
    if (starA > 0.02) {
      ctx.fillStyle = '#fff';
      for (i = 0; i < stars.length; i++) {
        var st = stars[i];
        var tw = 0.62 + 0.38 * Math.sin(T * st.f + st.p);
        var fade = mood.dusk > 0.5 ? (1 - st.v) : 1;
        ctx.globalAlpha = clamp(starA * st.b * tw * fade * (1 - st.v * 0.35), 0, 1);
        var sz = st.s * (W > 1200 ? 1.5 : 1.1);
        ctx.fillRect(st.u * W, st.v * (hz - 6), sz, sz);
      }
      ctx.globalAlpha = 1;
    }

    /* the sun going down (dusk) and the moon (calm) */
    ctx.globalCompositeOperation = 'lighter';
    if (mood.dusk > 0.02) {
      var sy = hz - 0.015 * L, sr = Math.max(L * 1.9, W * 0.28);
      var sg = ctx.createRadialGradient(S.lx, sy, 0, S.lx, sy, sr);
      sg.addColorStop(0, 'rgba(255,214,140,' + 0.70 * mood.dusk + ')');
      sg.addColorStop(0.18, 'rgba(255,150,90,' + 0.34 * mood.dusk + ')');
      sg.addColorStop(1, 'rgba(255,120,80,0)');
      ctx.fillStyle = sg; ctx.fillRect(S.lx - sr, sy - sr, sr * 2, sr * 2);
    }
    if (mood.calm > 0.02) {
      var mr = Math.max(L * 1.5, W * 0.2);
      var mg = ctx.createRadialGradient(S.lx, S.ly, 0, S.lx, S.ly, mr);
      mg.addColorStop(0, 'rgba(255,240,200,' + 0.42 * mood.calm + ')');
      mg.addColorStop(0.16, 'rgba(190,205,255,' + 0.16 * mood.calm + ')');
      mg.addColorStop(1, 'rgba(120,150,255,0)');
      ctx.fillStyle = mg; ctx.fillRect(S.lx - mr, S.ly - mr, mr * 2, mr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (mood.dusk > 0.02) {
      ctx.fillStyle = 'rgba(255,232,176,' + mood.dusk + ')';
      ctx.beginPath(); ctx.arc(S.lx, hz - 0.015 * L, Math.max(7, L * 0.14), 0, TAU); ctx.fill();
    }
    if (mood.calm > 0.02) {
      var rad = Math.max(6, L * 0.10);
      var md = ctx.createRadialGradient(S.lx - rad * 0.3, S.ly - rad * 0.3, rad * 0.1, S.lx, S.ly, rad);
      md.addColorStop(0, 'rgba(255,252,236,' + mood.calm + ')');
      md.addColorStop(1, 'rgba(250,232,180,' + mood.calm + ')');
      ctx.fillStyle = md;
      ctx.beginPath(); ctx.arc(S.lx, S.ly, rad, 0, TAU); ctx.fill();
    }

    /* clouds */
    var skyH = hz - Math.min(0, S.top);
    function band(img, alpha, scale, speed, yFrac, hFrac, comp) {
      if (alpha < 0.01 || !img) return;
      var bh = Math.max(60, skyH * hFrac), bw = bh * 2 * scale;
      var ox = ((T * speed * L) % bw + bw) % bw;
      ctx.globalAlpha = clamp(alpha, 0, 1);
      if (comp) ctx.globalCompositeOperation = comp;
      for (var x = -ox; x < W; x += bw) ctx.drawImage(img, x, Math.min(0, S.top) + skyH * yFrac, bw + 1, bh);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    band(tex.dusk, mood.dusk * 0.80, 1.5, 0.010, -0.06, 0.74);
    band(tex.calm, mood.calm * 0.34, 1.9, 0.006, 0.30, 0.62);
    var cover = mood.storm * (0.72 + 0.28 * clamp(e, 0, 1));
    band(tex.stormB, cover, 1.7, 0.035 + 0.05 * e, -0.20, 1.02);
    band(tex.stormA, cover * 0.96, 1.25, 0.07 + 0.10 * e, 0.06, 1.04);
    if (flash > 0.01) band(tex.flashA, flash * 0.85 * mood.storm, 1.25, 0.07 + 0.10 * e, 0.06, 1.04, 'lighter');

    /* the bolt */
    if (bolt && flash > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      var passes = [[11, 0.07], [5, 0.18], [1.7, 0.95]];
      for (var pi = 0; pi < 3; pi++) {
        for (i = 0; i < bolt.lines.length; i++) {
          var ln = bolt.lines[i];
          ctx.strokeStyle = 'rgba(214,232,255,' + passes[pi][1] * flash + ')';
          ctx.lineWidth = passes[pi][0] * ln.w * (bolt.big ? 1.25 : 1) * (W > 1200 ? 1.3 : 1);
          ctx.beginPath(); ctx.moveTo(ln.pts[0][0], ln.pts[0][1]);
          for (var pj = 1; pj < ln.pts.length; pj++) ctx.lineTo(ln.pts[pj][0], ln.pts[pj][1]);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    /* the far shore */
    var hillH = Math.max(7, L * 0.20);
    for (var hr = 0; hr < 2; hr++) {
      ctx.fillStyle = rgb(mix3(P.hill, P.low, hr ? 0.06 : 0.36));
      ctx.beginPath(); ctx.moveTo(0, hz + 2);
      for (i = 0; i <= 64; i++) {
        var hv = hillPts[hr ? i : (i * 3 + 20) % 65];
        ctx.lineTo(i / 64 * W, hz + 1 - hillH * (hr ? 0.62 : 1) * clamp(hv, 0.08, 1.2));
      }
      ctx.lineTo(W, hz + 2); ctx.closePath(); ctx.fill();
    }
    var lightA = clamp(mood.dusk * 0.9 + mood.calm * 0.95 + mood.storm * 0.25, 0, 1);
    for (i = 0; i < shoreLights.length; i++) {
      var sl = shoreLights[i];
      ctx.fillStyle = 'rgba(255,206,130,' + lightA * (0.55 + 0.45 * Math.sin(T * 2.1 * sl.s + sl.p)) + ')';
      var ls = Math.max(1, L * 0.008) * sl.s;
      ctx.fillRect(sl.u * W, hz - 1 - ls, ls, ls);
    }

    /* haze where the rain meets the sea */
    if (mood.storm > 0.02) {
      var mh = Math.max(16, L * 0.42);
      var hzg = ctx.createLinearGradient(0, hz - mh, 0, hz + mh * 0.8);
      hzg.addColorStop(0, rgb(P.mist, 0)); hzg.addColorStop(0.55, rgb(add3(P.mist, P.glow, flash * 0.3), 0.34 * mood.storm * clamp(e, 0, 1))); hzg.addColorStop(1, rgb(P.mist, 0));
      ctx.fillStyle = hzg; ctx.fillRect(0, hz - mh, W, mh * 1.8);
    }

    /* the sea, far to near, with the boats set into it */
    var k2 = smooth((e - 0.18) / 0.6);
    var ampK = 0.045 + 0.955 * Math.pow(clamp(e, 0, 1.15), 1.15);
    var spK = 0.22 + 0.78 * clamp(e, 0, 1.1);
    layers[0].y = hz + (S.by - hz) * 0.10;
    layers[1].y = hz + (S.by - hz) * 0.48;
    layers[2].y = S.by;
    var front = Math.max(0, H - S.by - 0.22 * L);
    layers[3].y = S.by + 0.22 * L;
    layers[4].y = S.by + 0.22 * L + front * 0.34;
    layers[5].y = S.by + 0.22 * L + front * 0.70;
    var step = W > 1400 ? 9 : 7;
    for (i = 0; i < layers.length; i++) {
      var Ly = layers[i], d = i / 5;
      Ly.ph += dt * Ly.sp * spK; Ly.p2 += dt * 0.7 * spK; Ly.p3 += dt * 1.3 * spK;
      var A = Ly.amp * L * ampK;

      if (i === 1) drawFar(S.cx - 1.5 * L, 1, 0.19, e, ampK, k2);
      if (i === 0) drawFar(S.cx + 1.25 * L, 0, 0.13, e, ampK, k2);

      var y0 = Ly.y + Math.sin(T * (0.5 + 0.13 * i) + i * 1.7) * A * 0.18;   /* the whole swell rises and falls */
      var n = 0, j, x, yy;
      for (x = -10; x <= W + 10 && n < hs.length; x += step) hs[n++] = waveH(Ly, x, L, k2);
      /* each wave is lit along its crest and dark in its trough, so it reads as a body of water */
      var lift = 0.05 + 0.16 * clamp(e, 0, 1) * mood.storm + flash * 0.22 * (1 - d * 0.5);
      var topC = add3(mix3(P.seaFar, P.seaNear, Math.pow(d, 1.1) * 0.8), P.glow, lift);
      var botC = mix3(P.seaFar, P.seaNear, Math.min(1, d * 0.5 + 0.62));
      var deep = mix3(botC, [0, 0, 0], 0.30 * mood.storm);
      var gy = ctx.createLinearGradient(0, y0 - A, 0, y0 + A * 0.9 + 10);
      gy.addColorStop(0, rgb(topC)); gy.addColorStop(0.55, rgb(botC)); gy.addColorStop(1, rgb(deep));
      ctx.fillStyle = gy;
      ctx.beginPath(); ctx.moveTo(-10, H + 10);
      for (j = 0; j < n; j++) ctx.lineTo(-10 + j * step, y0 - A * hs[j]);
      ctx.lineTo(W + 10, H + 10); ctx.closePath(); ctx.fill();
      /* white water on the crests: thickest at the peak, streaming back behind it */
      var capA = clamp((e - 0.22) * 1.5, 0, 1) * (0.26 + 0.44 * d) + flash * 0.18;
      if (i >= 1 && capA > 0.02) {
        ctx.fillStyle = rgb(add3(P.foam, P.glow, flash * 0.4), clamp(capA, 0, 0.85));
        ctx.beginPath();
        for (j = 0; j < n; j++) { yy = y0 - A * hs[j]; if (j) ctx.lineTo(-10 + j * step, yy); else ctx.moveTo(-10, yy); }
        for (j = n - 1; j >= 0; j--) {
          var th = A * 0.42 * Math.max(0, hs[j] - 0.18);
          ctx.lineTo(-10 + j * step - th * 0.8, y0 - A * hs[j] + th);
        }
        ctx.closePath(); ctx.fill();
      }
      /* the thin bright line of the crest */
      ctx.strokeStyle = rgb(add3(P.foam, P.glow, flash * 0.4), clamp(0.08 + (0.03 + 0.09 * d) * e + flash * 0.25, 0, 0.9));
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (j = 0; j < n; j++) { yy = y0 - A * hs[j]; if (j) ctx.lineTo(-10 + j * step, yy); else ctx.moveTo(-10, yy); }
      ctx.stroke();

      if (i === BOAT_LAYER) {
        /* the boat rides this wave */
        var h0 = waveH(Ly, S.cx, L, k2), hA = waveH(Ly, S.cx - L * 0.22, L, k2), hB = waveH(Ly, S.cx + L * 0.22, L, k2);
        var ty = y0 - A * h0 * 0.86 + L * 0.012;
        var tt = Math.atan2(-(hB - hA) * A, L * 0.44) * 0.92 + Math.sin(T * 1.7) * 0.035 * e;
        if (!boat.init) { boat.y = ty; boat.tilt = tt; boat.init = true; }
        var fb = 1 - Math.exp(-dt * 9);
        boat.y += (ty - boat.y) * fb; boat.tilt += (tt - boat.tilt) * fb;
        if (dt === 0) { boat.y = ty; boat.tilt = tt; }
        drawBoat(S.cx, boat.y, L, boat.tilt, clamp(e, 0, 1), 1, true);
        /* spray thrown up at the bow */
        if (running && e > 0.4 && spray.length < 130 && Math.random() < e * 0.55) {
          var bx = S.cx + Math.cos(boat.tilt) * L * 0.46, byy = boat.y + Math.sin(boat.tilt) * L * 0.46;
          spray.push({ x: bx + (Math.random() - 0.5) * L * 0.1, y: byy, vx: (0.1 + Math.random() * 0.5) * L, vy: -(0.5 + Math.random() * 0.9) * L * e, life: 1, s: 0.8 + Math.random() * 1.6 });
        }
      }
      if (i >= 2 && running && e > 0.45 && spray.length < 130 && Math.random() < 0.7 * e) {
        /* a wave breaking: spray torn off a crest by the wind */
        var rx = Math.random() * W, rh = waveH(Ly, rx, L, k2);
        if (rh > 0.5) spray.push({ x: rx, y: y0 - A * rh, vx: (0.5 + Math.random()) * L * 0.9, vy: -(0.1 + Math.random() * 0.4) * L, life: 1, s: 1 + Math.random() * 2 });
      }
    }

    /* spray */
    if (spray.length) {
      ctx.strokeStyle = rgb(add3(P.foam, P.glow, flash * 0.4));
      ctx.lineCap = 'round';
      for (i = spray.length - 1; i >= 0; i--) {
        var sp = spray[i];
        sp.life -= dt * 1.5; sp.vy += dt * L * 2.4; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
        if (sp.life <= 0) { spray.splice(i, 1); continue; }
        ctx.globalAlpha = sp.life * 0.75;
        ctx.lineWidth = sp.s * Math.max(1, L / 130);
        ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx * 0.035, sp.y - sp.vy * 0.035); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    /* light on the water: the sunset path and the moon path */
    var pathA = mood.calm * (1 - clamp(e * 1.6, 0, 1)) * 0.95 + mood.dusk * 0.60;
    if (pathA > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      var seaH = H - hz, unit = Math.max(1, L / 170);
      for (i = 0; i < glints.length; i++) {
        var g = glints[i];
        var v = Math.pow(g.v, 1.5);
        var gy2 = hz + 3 + v * seaH;
        var gx = S.lx + g.u * (0.05 + 0.85 * v) * L * 1.2 + Math.sin(T * 0.6 + g.p) * 3 * unit;
        var tw2 = Math.max(0, Math.sin(T * g.f * (mood.calm > 0.5 ? 0.55 : 1) + g.p));
        var gw = (5 + 34 * v) * g.w * unit;
        if (Math.abs(gx - S.cx) < L * 0.62 && Math.abs(gy2 - S.by) < L * 0.2) continue;
        ctx.fillStyle = rgb(P.glow, pathA * (0.10 + 0.55 * tw2) * (1 - v * 0.45));
        ctx.fillRect(gx - gw / 2, gy2, gw, Math.max(1, (0.8 + 1.6 * v) * unit));
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    /* rain */
    var rainK = smooth((e - 0.10) / 0.55) * mood.storm;
    if (rainK > 0.02 && drops.length) {
      var count = Math.round(drops.length * rainK), slant = 0.22 + 0.30 * clamp(e, 0, 1.1), fall = (H * 1.25 + 300);
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? 'rgba(206,230,238,' + (0.30 + flash * 0.3) + ')' : 'rgba(170,205,215,' + (0.15 + flash * 0.2) + ')';
        ctx.lineWidth = pass ? 1.25 : 0.9;
        ctx.beginPath();
        for (i = 0; i < count; i++) {
          var dr = drops[i];
          if (dr.near !== !!pass) continue;
          var len = dr.len * (pass ? 1.25 : 0.8);
          ctx.moveTo(dr.x, dr.y); ctx.lineTo(dr.x - len * slant, dr.y - len);
        }
        ctx.stroke();
      }
      for (i = 0; i < drops.length; i++) {
        var d2 = drops[i];
        d2.y += fall * d2.v * dt; d2.x += fall * d2.v * dt * slant;
        if (d2.y > H + 30) { d2.y = -30 - Math.random() * 60; d2.x = Math.random() * (W + 260) - 260; }
      }
    }

    /* the whole sky lights for an instant */
    if (flash > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(170,200,240,' + flash * 0.20 + ')';
      ctx.fillRect(-10, -10, W + 20, H + 20);
      ctx.globalCompositeOperation = 'source-over';
    }

    /* dark corners */
    if (!vignette) {
      var m = Math.max(W, H);
      vignette = ctx.createRadialGradient(W / 2, H * 0.46, m * 0.30, W / 2, H * 0.46, m * 0.82);
      vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,0.46)');
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);

    /* keep the frame rate honest on slow machines */
    if (running && dt > 0) {
      fps.acc += dt; fps.n++;
      if (fps.n >= 90) {
        var avg = fps.acc / fps.n; fps.acc = 0; fps.n = 0;
        api.fps = Math.round(1 / avg);
        if (avg > 1 / 34 && quality > 0.5) { fps.slow++; if (fps.slow >= 2) { quality = Math.max(0.5, quality * 0.8); fps.slow = 0; resize(); } }
        else fps.slow = 0;
      }
    }
  }

  function drawFar(x, li, scale, e, ampK, k2) {
    var Ly = layers[li], S = stage, L = S.L;
    x = clamp(x, L * 0.3, W - L * 0.3);
    var A = Ly.amp * L * ampK;
    var y = Ly.y - A * waveH(Ly, x, L, k2) + L * scale * 0.03;
    var slope = (waveH(Ly, x + 6, L, k2) - waveH(Ly, x - 6, L, k2)) * A / 12;
    drawBoat(x, y, L * scale, Math.atan(-slope) * 0.6 + Math.sin(T * 1.3 + li) * 0.05 * e, clamp(e, 0, 1), 0.92, false);
  }

  function loop(now) {
    if (!running) return;
    frame(now);
    raf = requestAnimationFrame(loop);
  }
  api.start = function () {
    if (running || !ctx) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(loop);
  };
  api.stop = function () { running = false; cancelAnimationFrame(raf); };
  api.resize = resize;
  api.state = function () { return { storm: storm.v, target: storm.to, mood: { dusk: mood.dusk, storm: mood.storm, calm: mood.calm }, flashes: flashesOn, reduced: reduced, quality: quality, ratio: ratio, fps: api.fps || 0, lastStrike: lastStrike, flashesShown: shown, moon: stage ? [stage.lx, stage.ly, Math.max(6, stage.L * 0.10)] : null, time: T }; };

  api.init = function (canvas, opts) {
    cv = canvas; ctx = cv.getContext('2d', { alpha: false });
    reduced = !!(opts && opts.reduced);
    buildFixed(); buildTextures();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) api.stop(); else api.start();
    });
  };

  window.StormScene = api;
})();
