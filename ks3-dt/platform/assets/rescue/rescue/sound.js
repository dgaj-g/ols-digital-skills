/* The Rescue, art test: every sound is made in the browser (Web Audio). No sound files.
   Nothing plays until start() is called from a button press. Every sound here has a drawn
   twin in film.js, so the piece works with the sound off. */
(function () {
  'use strict';
  var ac = null, master, storm, fx, heartBus, cryBus, nbuf, rainG, windG, windF, muted = false, dead = false;
  function now() { return ac.currentTime; }
  function noiseBuf() {
    var n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = w * 0.55 + last * 6; }
    return b;
  }
  function noise(loop) { var s = ac.createBufferSource(); s.buffer = nbuf; s.loop = !!loop; return s; }
  function filt(type, f, q) { var x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q != null) x.Q.value = q; return x; }
  function gain(v) { var g = ac.createGain(); g.gain.value = v; return g; }
  function chain() { for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); return arguments[arguments.length - 1]; }
  function env(g, t, pts) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(pts[0][1], t + pts[0][0]); for (var i = 1; i < pts.length; i++) g.gain.linearRampToValueAtTime(pts[i][1], t + pts[i][0]); }
  function ok() { return ac && !dead; }

  var api = {}, meter = null, meterBuf = null, paused = false;
  /* the hour's pause pill: the whole context is held, so every sound carries on from where it stopped */
  api.pause = function () { paused = true; if (ac && !dead && ac.state === 'running') ac.suspend(); };
  api.unpause = function () { paused = false; if (ac && !dead && ac.state === 'suspended') ac.resume(); };
  api.start = function () {
    if (ac || dead) { if (ac && ac.state === 'suspended' && !paused) ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = gain(muted ? 0 : 0.9); var lim = ac.createDynamicsCompressor(); lim.threshold.value = -9; lim.knee.value = 6; lim.ratio.value = 14; lim.attack.value = 0.003; lim.release.value = 0.2; master.connect(lim); lim.connect(ac.destination);
      meter = ac.createAnalyser(); meter.fftSize = 2048; lim.connect(meter); meterBuf = new Float32Array(2048);
      storm = gain(0); storm.connect(master);
      fx = gain(1); fx.connect(master);
      heartBus = gain(1); heartBus.connect(master);
      cryBus = gain(1); cryBus.connect(master);
      nbuf = noiseBuf();
      /* rain: a hiss and a lower patter */
      rainG = gain(0.16);
      var r1 = noise(true), r2 = noise(true);
      chain(r1, filt('highpass', 2400), filt('lowpass', 9000), gain(0.55), rainG);
      chain(r2, filt('bandpass', 700, 0.6), gain(0.5), rainG);
      rainG.connect(storm); r1.start(); r2.start(0, 0.7);
      /* wind: a band of noise whose pitch and loudness follow the gusts */
      windF = filt('bandpass', 420, 1.4); windG = gain(0.2);
      var w1 = noise(true); chain(w1, windF, windG, storm); w1.start(0, 1.1);
      var w2 = noise(true); chain(w2, filt('lowpass', 160), gain(0.5), storm); w2.start(0, 0.3);
    } catch (e) { dead = true; ac = null; api.failed = String(e); }
  };
  api.disable = function () { dead = true; };
  /* for the checks: is it running, and how loud is it right now */
  api.state = function () { return dead ? 'off' : ac ? ac.state : 'not started'; };
  api.level = function () { if (!ok() || !meter) return 0; meter.getFloatTimeDomainData(meterBuf); for (var i = 0, a = 0; i < meterBuf.length; i++) a += meterBuf[i] * meterBuf[i]; return Math.sqrt(a / meterBuf.length); };
  api.setMuted = function (m) { muted = m; if (ok()) master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05); };
  api.isMuted = function () { return muted; };
  /* the storm bed: level 0 to 1, over secs */
  api.stormLevel = function (v, secs) { if (ok()) storm.gain.setTargetAtTime(v, now(), Math.max(0.01, (secs || 0.5) / 3)); };
  api.fxLevel = function (v, secs) { if (ok()) fx.gain.setTargetAtTime(v, now(), Math.max(0.01, (secs || 0.3) / 3)); };
  api.rainOnly = function (on) { if (!ok()) return; windG.gain.setTargetAtTime(on ? 0.02 : 0.2, now(), 0.3); };
  api.setWind = function (w) { if (!ok()) return; windF.frequency.setTargetAtTime(300 + 520 * w, now(), 0.25); windG.gain.setTargetAtTime(0.10 + 0.34 * w, now(), 0.25); };

  api.thunder = function (big, delay) {
    if (!ok()) return;
    var t = now() + (delay || 0), len = big ? 4.6 : 3.2, s = noise(true), lp = filt('lowpass', big ? 520 : 300), g = gain(0);
    lp.frequency.setValueAtTime(big ? 520 : 300, t); lp.frequency.exponentialRampToValueAtTime(55, t + len);
    var pts = [[0, 0], [0.03, big ? 1.5 : 0.8]], n = big ? 7 : 5;
    for (var i = 1; i <= n; i++) pts.push([len * i / (n + 1), (big ? 1.2 : 0.7) * (1 - i / (n + 1)) * (0.5 + Math.random() * 0.7)]);
    pts.push([len, 0]); env(g, t, pts);
    chain(s, lp, g, fx); s.start(t, Math.random()); s.stop(t + len + 0.1);
    if (big) {
      var c = noise(false), cg = gain(0); env(cg, t, [[0, 0], [0.008, 1.0], [0.09, 0.25], [0.30, 0]]);
      chain(c, filt('highpass', 900), cg, fx); c.start(t, Math.random()); c.stop(t + 0.35);
    }
  };
  /* the branch groaning: stick and slip */
  api.creak = function (amt) {
    if (!ok()) return;
    var t = now(), d = 0.45 + 0.35 * amt, o = ac.createOscillator(), am = ac.createOscillator(), amg = gain(0.5), g = gain(0), bp = filt('bandpass', 620, 7);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(78 + 30 * amt, t); o.frequency.linearRampToValueAtTime(128 + 40 * amt, t + d * 0.6); o.frequency.linearRampToValueAtTime(96, t + d);
    am.type = 'square'; am.frequency.setValueAtTime(17, t); am.frequency.linearRampToValueAtTime(31, t + d);
    var vca = gain(0.5); am.connect(amg); amg.connect(vca.gain);
    env(g, t, [[0, 0], [0.05, 0.16 + 0.14 * amt], [d * 0.8, 0.12], [d, 0]]);
    chain(o, bp, vca, g, fx); o.start(t); am.start(t); o.stop(t + d + 0.05); am.stop(t + d + 0.05);
  };
  /* wood tearing */
  api.tear = function (big) {
    if (!ok()) return;
    var t = now(), d = big ? 0.9 : 0.32, s = noise(false), bp = filt('bandpass', 1500, 1.2), g = gain(0);
    bp.frequency.setValueAtTime(big ? 1900 : 1500, t); bp.frequency.exponentialRampToValueAtTime(big ? 240 : 500, t + d);
    var pts = [[0, 0]], n = big ? 14 : 6;
    for (var i = 0; i < n; i++) { var u = i / n * d; pts.push([u + 0.004, (big ? 0.9 : 0.5) * (1 - i / n * 0.6) * (0.5 + Math.random() * 0.5)]); pts.push([u + d / n * 0.7, 0.04]); }
    pts.push([d, 0]); env(g, t, pts);
    chain(s, bp, g, fx); s.start(t, Math.random()); s.stop(t + d + 0.05);
    if (big) { var o = ac.createOscillator(), og = gain(0); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.5); env(og, t, [[0, 0], [0.01, 0.9], [0.5, 0]]); chain(o, og, fx); o.start(t); o.stop(t + 0.55); }
  };
  /* one heartbeat. It goes round the storm bus, so it is what is left when everything else drops away */
  function thump(t, v, f) {
    var o = ac.createOscillator(), g = gain(0); o.type = 'sine';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.16);
    env(g, t, [[0, 0], [0.012, v], [0.18, 0]]); chain(o, g, heartBus); o.start(t); o.stop(t + 0.2);
  }
  api.beat = function (level) { if (!ok()) return; var t = now(); thump(t, 0.95 * level, 62); thump(t + 0.17, 0.6 * level, 50); };
  function voice(t, d, f, type, formants, vol, vib, vibDepth, dest) {
    var o = ac.createOscillator(), g = gain(0), mix = gain(1), l = ac.createOscillator(), lg = gain(vibDepth || 0);
    o.type = type; o.frequency.setValueAtTime(f[0][1], t + f[0][0]);
    for (var i = 1; i < f.length; i++) o.frequency.linearRampToValueAtTime(f[i][1], t + f[i][0]);
    l.frequency.value = vib || 6; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d + 0.05);
    formants.forEach(function (fm) { var b = filt('bandpass', fm[0], fm[1]); o.connect(b); chain(b, gain(fm[2]), mix); });
    chain(mix, g, dest || fx); o.start(t); o.stop(t + d + 0.05);
    return g;
  }
  /* a kitten's mew: a thin voice that rises and falls. cut = stopped dead half way */
  api.mew = function (cut, vol) {
    if (!ok()) return;
    var t = now(), d = cut ? 0.19 : 0.52, v = vol == null ? 0.5 : vol;
    var g = voice(t, d, [[0, 720], [0.10, 1080], [0.26, 1010], [0.52, 640]], 'sawtooth', [[1250, 5, 1.0], [2900, 7, 0.55], [820, 3, 0.4]], v, 7, 14);
    if (cut) env(g, t, [[0, 0], [0.04, v], [0.185, v], [0.19, 0]]);
    else env(g, t, [[0, 0], [0.05, v], [0.30, v * 0.8], [d, 0]]);
  };
  /* a puppy's whimper: two short falling cries with a tremble */
  api.whimper = function (vol) {
    if (!ok()) return;
    var t = now(), v = vol == null ? 0.42 : vol;
    [0, 0.30].forEach(function (off, n) {
      var g = voice(t + off, 0.26, [[0, 980 - n * 90], [0.07, 1060 - n * 90], [0.26, 690 - n * 60]], 'triangle', [[1050, 4, 1.0], [2100, 6, 0.35]], v, 13, 34);
      env(g, t + off, [[0, 0], [0.03, v], [0.16, v * 0.7], [0.26, 0]]);
    });
  };
  /* the two of them falling: one long cry each, sliding down in pitch and fading all the way out.
     It has its own bus, so the hush that falls on everything else at the snap does not cut it. */
  api.cry = function (d) {
    if (!ok()) return;
    var t = now(); d = d || 4.5;
    cryBus.gain.cancelScheduledValues(t); cryBus.gain.setValueAtTime(1, t);
    var g1 = voice(t, d, [[0, 980], [0.22, 1120], [d * 0.45, 860], [d, 450]], 'sawtooth', [[1250, 5, 1.0], [2900, 7, 0.55], [820, 3, 0.4]], 0.5, 7, 16, cryBus);
    env(g1, t, [[0, 0], [0.08, 0.5], [0.9, 0.44], [d * 0.45, 0.26], [d * 0.75, 0.09], [d, 0]]);
    var d2 = d - 0.14, g2 = voice(t + 0.14, d2, [[0, 600], [0.26, 700], [d2 * 0.45, 500], [d2, 240]], 'triangle', [[1050, 4, 1.0], [2100, 6, 0.35]], 0.46, 11, 26, cryBus);
    env(g2, t + 0.14, [[0, 0], [0.1, 0.46], [0.9, 0.40], [d2 * 0.45, 0.24], [d2 * 0.75, 0.08], [d2, 0]]);
  };
  api.cryOff = function () { if (ok()) { var t = now(); cryBus.gain.cancelScheduledValues(t); cryBus.gain.setTargetAtTime(0, t, 0.04); } };
  /* safe: a bright mew that ends high, and two quick yips */
  api.happy = function (who) {
    if (!ok()) return;
    var t = now(), g;
    if (who !== 'pup') {
      g = voice(t, 0.36, [[0, 760], [0.12, 1020], [0.36, 1240]], 'sawtooth', [[1250, 5, 1.0], [2900, 7, 0.55], [820, 3, 0.4]], 0.42, 7, 8);
      env(g, t, [[0, 0], [0.04, 0.42], [0.24, 0.34], [0.36, 0]]);
    }
    if (who !== 'kit') [0.0, 0.2].forEach(function (off) {
      var g2 = voice(t + 0.1 + off, 0.13, [[0, 520], [0.05, 820], [0.13, 700]], 'triangle', [[1050, 4, 1.0], [2100, 6, 0.35]], 0.44, 9, 6);
      env(g2, t + 0.1 + off, [[0, 0], [0.015, 0.44], [0.08, 0.3], [0.13, 0]]);
    });
  };
  api.hoot = function () {
    if (!ok()) return;
    var t = now();
    [[0, 0.34, 392], [0.46, 0.2, 392], [0.70, 0.5, 350]].forEach(function (nn) {
      var o = ac.createOscillator(), g = gain(0); o.type = 'sine';
      o.frequency.setValueAtTime(nn[2] * 1.04, t + nn[0]); o.frequency.linearRampToValueAtTime(nn[2], t + nn[0] + 0.08);
      env(g, t + nn[0], [[0, 0], [0.05, 0.42], [nn[1] * 0.7, 0.34], [nn[1], 0]]);
      chain(o, filt('lowpass', 900), g, fx); o.start(t + nn[0]); o.stop(t + nn[0] + nn[1] + 0.05);
    });
  };
  function click(t, f, v, d, hp) {
    var s = noise(false), g = gain(0); env(g, t, [[0, 0], [0.002, v], [d, 0]]);
    chain(s, filt('bandpass', f, 3), g, fx); s.start(t, Math.random()); s.stop(t + d + 0.02);
  }
  function ping(t, f, v, d, type) {
    var o = ac.createOscillator(), g = gain(0); o.type = type || 'sine'; o.frequency.value = f;
    env(g, t, [[0, 0], [0.004, v], [d, 0]]); chain(o, g, fx); o.start(t); o.stop(t + d + 0.02);
  }
  /* the four moves of the ladder, the wrong line, a key, a counted mark */
  api.move = function (kind) {
    if (!ok()) return;
    var t = now(), i;
    if (kind === 'unlock') { click(t, 2600, 0.5, 0.05); ping(t + 0.06, 660, 0.16, 0.12); click(t + 0.07, 1800, 0.4, 0.06); }
    else if (kind === 'push') { for (i = 0; i < 6; i++) { click(t + i * 0.07, 1200 + i * 160, 0.36, 0.04); } ping(t, 150, 0.2, 0.42, 'triangle'); }
    else if (kind === 'lock') { click(t, 900, 0.6, 0.07); ping(t, 170, 0.34, 0.14); }
    else if (kind === 'check') { ping(t, 1320, 0.2, 0.5); ping(t + 0.09, 1980, 0.14, 0.6); }
    else if (kind === 'wrong') { ping(t, 124, 0.22, 0.2, 'square'); }
    else if (kind === 'key') { click(t, 3400, 0.10, 0.02); }
    else if (kind === 'mark') { ping(t, 880, 0.09, 0.09); click(t, 2400, 0.12, 0.03); }
    else if (kind === 'knock') { ping(t, 190, 0.3, 0.09, 'triangle'); click(t, 700, 0.3, 0.05); }
    else if (kind === 'ring') { ping(t, 1175, 0.16, 0.16); ping(t + 0.18, 1480, 0.16, 0.22); }
    else if (kind === 'safe') { ping(t, 784, 0.2, 0.5); ping(t + 0.16, 988, 0.2, 0.5); ping(t + 0.32, 1175, 0.22, 0.9); }
  };
  /* time running backwards: a rising rush that stops dead */
  api.rewind = function (d) {
    if (!ok()) return;
    var t = now(), s = noise(true), bp = filt('bandpass', 180, 2.2), g = gain(0), o = ac.createOscillator(), og = gain(0);
    bp.frequency.setValueAtTime(180, t); bp.frequency.exponentialRampToValueAtTime(5200, t + d);
    env(g, t, [[0, 0], [d * 0.2, 0.2], [d * 0.96, 0.85], [d, 0]]);
    chain(s, bp, g, fx); s.start(t); s.stop(t + d + 0.05);
    o.type = 'triangle'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(880, t + d);
    env(og, t, [[0, 0], [d * 0.3, 0.07], [d * 0.96, 0.2], [d, 0]]); chain(o, og, fx); o.start(t); o.stop(t + d + 0.05);
  };
  window.RescueSound = api;
})();
