/* ============================================================
   Calming the Storm — the sound
   ------------------------------------------------------------
   Every sound is made here by the browser (Web Audio): wind,
   rain, sea, thunder, the chime when a part locks, the soft
   thud when nothing new is right, and the still chord of the
   calm. No audio files.

   A browser only allows sound after a press, so nothing plays
   until start() is called from the Begin button.
   ============================================================ */
(function () {
  'use strict';

  var AC = window.AudioContext || window.webkitAudioContext;
  var ac = null, master = null, bed = null, noiseBuf = null;
  var wind = null, whistle = null, rain = null, sea = null, pad = null;
  var muted = false, level = 0, started = false;
  var NOTES = [293.66, 329.63, 369.99, 440.00, 493.88, 587.33, 659.25]; /* D E F# A B D E */
  var api = {};

  function noise(seconds) {
    var n = Math.floor(ac.sampleRate * seconds), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function loopNoise() {
    var s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    s.loopStart = Math.random() * 1.5; s.start(0, Math.random() * 2);
    return s;
  }
  function filt(type, f, q) { var b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; }
  function gain(v) { var g = ac.createGain(); g.gain.value = v; return g; }
  function lfo(freq, depth, target) {
    var o = ac.createOscillator(), g = gain(depth);
    o.frequency.value = freq; o.connect(g); g.connect(target); o.start();
    return o;
  }

  api.available = !!AC;

  api.start = function () {
    if (!AC) return;
    if (!ac) {
      try { ac = new AC(); } catch (e) { ac = null; return; }
      master = gain(muted ? 0 : 1);
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 5;
      master.connect(comp); comp.connect(ac.destination);
      bed = gain(1); bed.connect(master);
      noiseBuf = noise(3);

      /* wind: a band of noise that swells and falls */
      var wf = filt('bandpass', 420, 0.9); wind = gain(0);
      loopNoise().connect(wf); wf.connect(wind); wind.connect(bed);
      lfo(0.13, 170, wf.frequency); lfo(0.31, 90, wf.frequency);
      /* the whistle in the rigging */
      var hf = filt('bandpass', 1350, 16); whistle = gain(0);
      loopNoise().connect(hf); hf.connect(whistle); whistle.connect(bed);
      lfo(0.09, 320, hf.frequency); lfo(0.23, 140, hf.frequency);
      /* rain */
      var rh = filt('highpass', 2600), rl = filt('lowpass', 9500); rain = gain(0);
      loopNoise().connect(rh); rh.connect(rl); rl.connect(rain); rain.connect(bed);
      /* the sea: a slow low swell */
      var sf = filt('lowpass', 360), sw = gain(0.6); sea = gain(0);
      loopNoise().connect(sf); sf.connect(sw); sw.connect(sea); sea.connect(bed);
      lfo(0.16, 0.35, sw.gain);
      apply(0.05);
    }
    if (ac.state === 'suspended') ac.resume();
    started = true;
  };

  function apply(seconds) {
    if (!ac) return;
    var t = ac.currentTime, tc = Math.max(0.02, seconds / 3), s = level;
    wind.gain.setTargetAtTime(0.02 + 0.30 * s * s, t, tc);
    whistle.gain.setTargetAtTime(0.10 * Math.max(0, s - 0.35), t, tc);
    rain.gain.setTargetAtTime(0.11 * Math.max(0, s - 0.12), t, tc);
    sea.gain.setTargetAtTime(0.10 + 0.34 * s, t, tc);
  }
  /* 0 = the calm, 1 = the full squall */
  api.setStorm = function (v, seconds) { level = Math.max(0, Math.min(1, v)); apply(seconds === undefined ? 1.4 : seconds); };

  api.setMuted = function (m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.04);
  };
  api.isMuted = function () { return muted; };

  api.thunder = function (big) {
    if (!ac) return;
    var t = ac.currentTime + (big ? 0.12 : 0.30 + Math.random() * 0.5);
    var src = ac.createBufferSource(); src.buffer = noiseBuf;
    var lp = filt('lowpass', big ? 1700 : 900), g = gain(0), len = big ? 4.6 : 3.4;
    lp.frequency.setValueAtTime(big ? 1700 : 900, t);
    lp.frequency.exponentialRampToValueAtTime(70, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(big ? 1.0 : 0.6, t + 0.03);
    g.gain.exponentialRampToValueAtTime(big ? 0.30 : 0.2, t + 0.45);
    g.gain.setValueAtTime(big ? 0.30 : 0.2, t + 0.55);
    g.gain.exponentialRampToValueAtTime(big ? 0.42 : 0.26, t + 0.9);   /* the roll */
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(t, Math.random()); src.stop(t + len + 0.1);
    var o = ac.createOscillator(), og = gain(0);
    o.type = 'sine'; o.frequency.setValueAtTime(58, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.6);
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(big ? 0.7 : 0.4, t + 0.04);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(og); og.connect(master); o.start(t); o.stop(t + 1.9);
  };

  function bell(freq, when, vol) {
    var parts = [[1, 1], [2.01, 0.38], [3.02, 0.16], [4.2, 0.07]];
    for (var i = 0; i < parts.length; i++) {
      var o = ac.createOscillator(), g = gain(0);
      o.type = 'sine'; o.frequency.value = freq * parts[i][0];
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vol * parts[i][1], when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 1.5 / (1 + i * 0.5));
      o.connect(g); g.connect(master); o.start(when); o.stop(when + 1.7);
    }
  }
  /* the chime for the n-th part to come right (0 to 6): it climbs */
  api.chime = function (n, delay) {
    if (!ac) return;
    bell(NOTES[Math.max(0, Math.min(6, n))], ac.currentTime + (delay || 0), 0.26);
  };
  api.wrong = function () {
    if (!ac) return;
    var t = ac.currentTime, o = ac.createOscillator(), g = gain(0);
    o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(62, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.36);
  };
  function knock(freq, vol) {
    if (!ac) return;
    var t = ac.currentTime, o = ac.createOscillator(), g = gain(0);
    o.type = 'triangle'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.07);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.12);
  }
  api.pick = function () { knock(520, 0.16); };
  api.drop = function () { knock(300, 0.22); };

  /* “Quiet! Be still!”: the wind and rain stop; the sea settles after them */
  api.hush = function (seconds) {
    if (!ac) return;
    level = 0;
    var t = ac.currentTime, s = seconds || 3.5;
    wind.gain.setTargetAtTime(0.012, t, s / 5);
    whistle.gain.setTargetAtTime(0, t, s / 8);
    rain.gain.setTargetAtTime(0, t, s / 5);
    sea.gain.setTargetAtTime(0.07, t, s / 2.5);
  };
  /* the calm: one long, quiet chord */
  api.calm = function () {
    if (!ac) return;
    api.stopCalm();
    var t = ac.currentTime, out = gain(0), lp = filt('lowpass', 1400);
    var fr = [146.83, 220.00, 293.66, 369.99, 440.00, 659.25], oscs = [];
    for (var i = 0; i < fr.length; i++) {
      for (var d = -1; d <= 1; d += 2) {
        var o = ac.createOscillator(), g = gain(i < 2 ? 0.16 : 0.09);
        o.type = i < 3 ? 'triangle' : 'sine'; o.frequency.value = fr[i]; o.detune.value = d * 5;
        o.connect(g); g.connect(lp); o.start(t); oscs.push(o);
      }
    }
    lp.connect(out); out.connect(master);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.22, t + 3.2);
    out.gain.setValueAtTime(0.22, t + 9);
    out.gain.exponentialRampToValueAtTime(0.05, t + 16);
    pad = { out: out, oscs: oscs };
  };
  api.stopCalm = function () {
    if (!ac || !pad) return;
    var p = pad, t = ac.currentTime; pad = null;
    p.out.gain.cancelScheduledValues(t);
    p.out.gain.setTargetAtTime(0.0001, t, 0.4);
    for (var i = 0; i < p.oscs.length; i++) p.oscs[i].stop(t + 2.5);
  };

  document.addEventListener('visibilitychange', function () {
    if (!ac || !started) return;
    if (document.hidden) ac.suspend(); else ac.resume();
  });

  window.StormSound = api;
})();
