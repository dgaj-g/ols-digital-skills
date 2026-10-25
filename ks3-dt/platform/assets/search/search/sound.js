/* The Search, art test: every sound is made in the browser (Web Audio). No sound files.
   Nothing plays until start() is called from a button press. Every sound has a drawn twin in film.js,
   so the piece works with the sound off. */
(function () {
  'use strict';
  var ac = null, master, bed, fx, nbuf, windG, windF, hushG, rotorO, rotorG, rotorF, rotorN, muted = false, dead = false, paused = false, meter = null, meterBuf = null;
  function now() { return ac.currentTime; }
  function noiseBuf() {
    var n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = w * 0.55 + last * 6; }
    return b;
  }
  function noise(loop) { var s = ac.createBufferSource(); s.buffer = nbuf; s.loop = !!loop; return s; }
  function filt(type, f, q) { var x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q != null) x.Q.value = q; return x; }
  function gain(v) { var g = ac.createGain(); g.gain.value = v; return g; }
  function osc(type, f) { var o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; }
  function chain() { for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); return arguments[arguments.length - 1]; }
  function env(g, t, pts) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(pts[0][1], t + pts[0][0]); for (var i = 1; i < pts.length; i++) g.gain.linearRampToValueAtTime(pts[i][1], t + pts[i][0]); }
  function ok() { return ac && !dead; }
  var api = {};
  api.pause = function () { paused = true; if (ok() && ac.state === 'running') ac.suspend(); };
  api.unpause = function () { paused = false; if (ok() && ac.state === 'suspended') ac.resume(); };
  api.start = function () {
    if (ac || dead) { if (ac && ac.state === 'suspended' && !paused) ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = gain(muted ? 0 : 0.9); var lim = ac.createDynamicsCompressor(); lim.threshold.value = -9; lim.knee.value = 6; lim.ratio.value = 14; lim.attack.value = 0.003; lim.release.value = 0.2; master.connect(lim); lim.connect(ac.destination);
      meter = ac.createAnalyser(); meter.fftSize = 2048; lim.connect(meter); meterBuf = new Float32Array(2048);
      bed = gain(0); bed.connect(master); fx = gain(1); fx.connect(master);
      nbuf = noiseBuf();
      /* the wind: a band of noise whose pitch and loudness follow the gusts */
      windF = filt('bandpass', 380, 1.3); windG = gain(0.18); var w1 = noise(true); chain(w1, windF, windG, bed); w1.start(0, 1.1);
      /* the snow hush: the lowest, softest noise, like a field with everything muffled */
      hushG = gain(0.35); var w2 = noise(true); chain(w2, filt('lowpass', 140), hushG, bed); w2.start(0, 0.4);
      /* the rotors: a hum and a whisper of air, pitched by rotor speed, silent until the drone wakes */
      rotorG = gain(0); rotorG.connect(fx);
      rotorO = osc('sawtooth', 70); rotorF = filt('lowpass', 420, 2); chain(rotorO, rotorF, gain(0.07), rotorG); rotorO.start();
      var o2 = osc('triangle', 141); chain(o2, gain(0.05), rotorG); o2.start();
      rotorN = noise(true); chain(rotorN, filt('bandpass', 1800, 0.8), gain(0.12), rotorG); rotorN.start(0, 0.9);
    } catch (e) { dead = true; ac = null; api.failed = String(e); }
  };
  api.disable = function () { dead = true; };
  api.state = function () { return dead ? 'off' : ac ? ac.state : 'not started'; };
  api.level = function () { if (!ok() || !meter) return 0; meter.getFloatTimeDomainData(meterBuf); for (var i = 0, a = 0; i < meterBuf.length; i++) a += meterBuf[i] * meterBuf[i]; return Math.sqrt(a / meterBuf.length); };
  api.setMuted = function (m) { muted = m; if (ok()) master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05); };
  api.isMuted = function () { return muted; };
  /* the weather bed, 0 to 1 over secs; and the wind's strength */
  api.bedLevel = function (v, secs) { if (ok()) bed.gain.setTargetAtTime(v, now(), Math.max(0.01, (secs || 0.5) / 3)); };
  api.setWind = function (w) { if (!ok()) return; windF.frequency.setTargetAtTime(260 + 480 * w, now(), 0.25); windG.gain.setTargetAtTime(0.06 + 0.34 * w, now(), 0.25); };
  /* the rotors: 0 off, 1 full hover. the pitch climbs as they spin up */
  api.rotor = function (v, secs) { if (!ok()) return; var s = Math.max(0.05, (secs || 0.6)); rotorG.gain.setTargetAtTime(0.9 * v, now(), s / 3); rotorO.frequency.setTargetAtTime(40 + 70 * v, now(), s / 3); rotorF.frequency.setTargetAtTime(200 + 500 * v, now(), s / 3); };
  /* the phone: a buzz, twice, like a phone on a table */
  api.buzz = function () {
    if (!ok()) return; var t = now();
    for (var k = 0; k < 2; k++) { var o = osc('square', 150), g = gain(0), d = t + k * 0.55; chain(o, filt('lowpass', 500), g, fx); o.start(d); env(g, d, [[0, 0], [0.02, 0.18], [0.30, 0.18], [0.36, 0]]); o.stop(d + 0.4);
      var o2 = osc('sine', 30), g2 = gain(0); chain(o2, g2, fx); o2.start(d); env(g2, d, [[0, 0], [0.02, 0.5], [0.30, 0.5], [0.36, 0]]); o2.stop(d + 0.4); }
  };
  /* the drone's voice: a chirp (two quick notes up), a hum when it wakes, a sad note down */
  api.chirp = function (kind) {
    if (!ok()) return; var t = now(), notes = kind === 'sad' ? [[660, 0], [440, 0.16]] : kind === 'think' ? [[520, 0], [520, 0.14], [520, 0.28]] : kind === 'wake' ? [[330, 0], [495, 0.22], [660, 0.44]] : [[880, 0], [1320, 0.09]];
    for (var i = 0; i < notes.length; i++) { var o = osc('sine', notes[i][0]), g = gain(0), d = t + notes[i][1]; chain(o, g, fx); o.start(d); env(g, d, [[0, 0], [0.015, 0.22], [0.08, 0.16], [0.14, 0]]); o.stop(d + 0.16);
      var o2 = osc('triangle', notes[i][0] * 2), g2 = gain(0); chain(o2, g2, fx); o2.start(d); env(g2, d, [[0, 0], [0.015, 0.05], [0.10, 0]]); o2.stop(d + 0.12); }
  };
  api.hum = function (d) {
    if (!ok()) return; var t = now(), fs = [220, 277, 330], i; d = d || 1.6;
    for (i = 0; i < fs.length; i++) { var o = osc('sine', fs[i]), g = gain(0); chain(o, g, fx); o.start(t); env(g, t, [[0, 0], [0.4, 0.06], [d * 0.6, 0.06], [d, 0]]); o.stop(t + d + 0.05); }
  };
  /* the lamb: a two-note bleat with a shake in it. cut = a short, scared one */
  api.bleat = function (cut, vol) {
    if (!ok()) return; var t = now(), d = cut ? 0.42 : 0.75, v = vol == null ? 1 : vol;
    var o = osc('sawtooth', 420), f1 = filt('bandpass', 700, 3), f2 = filt('bandpass', 1500, 4), g = gain(0), lfo = osc('sine', 24), lg = gain(90), mix = gain(1);
    chain(lfo, lg, o.frequency); o.connect(f1); o.connect(f2); f1.connect(mix); f2.connect(mix); chain(mix, g, fx);
    o.frequency.setValueAtTime(400, t); o.frequency.linearRampToValueAtTime(470, t + d * 0.35); o.frequency.linearRampToValueAtTime(380, t + d);
    env(g, t, [[0, 0], [0.04, 0.26 * v], [d * 0.5, 0.22 * v], [d, 0]]); o.start(t); lfo.start(t); o.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
  };
  /* a heartbeat, for later chapters: two thumps */
  api.beat = function (level) {
    if (!ok()) return; var t = now();
    for (var k = 0; k < 2; k++) { var o = osc('sine', 55), g = gain(0), d = t + k * 0.22; chain(o, g, fx); o.start(d); o.frequency.setValueAtTime(70, d); o.frequency.exponentialRampToValueAtTime(40, d + 0.12); env(g, d, [[0, 0], [0.01, 0.6 * level], [0.16, 0]]); o.stop(d + 0.2); }
  };
  /* the rewind: a rush of noise and a rising whine, for the moment time runs back */
  api.rewind = function (d) {
    if (!ok()) return; var t = now(); d = d || 2.5;
    var n = noise(false), f = filt('bandpass', 400, 1.5), g = gain(0); chain(n, f, g, fx); n.start(t); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3200, t + d); env(g, t, [[0, 0], [0.2, 0.3], [d * 0.8, 0.3], [d, 0]]); n.stop(t + d + 0.05);
    var o = osc('sine', 200), g2 = gain(0); chain(o, g2, fx); o.start(t); o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(1600, t + d); env(g2, t, [[0, 0], [0.3, 0.08], [d, 0]]); o.stop(t + d + 0.05);
  };
  window.SearchSound = api;
})();
