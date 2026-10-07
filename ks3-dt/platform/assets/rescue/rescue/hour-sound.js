/* The Rescue, the later chapters: the new sounds (spec section 12). Every sound is made by the
   browser. No sound file is loaded. Chapter 1's storm, thunder and voices stay in sound.js and are
   used as they are. This file adds: the river, the winch, the tip, the hedgehog, paws, the tree
   crash, the bonk, the door, the storm heard from indoors, and the fire.
   The lesson works with the sound off: nothing in the story waits for a sound. */
(function () {
  'use strict';
  var ac = null, master, nbuf, dead = false, muted = false, paused = false;
  var riverG, riverF, inG, fireG, fireOn = false, fireAt = 0;
  var api = window.HourSound = {};
  function now() { return ac.currentTime; }
  function ok() { return ac && !dead; }
  function gain(v) { var g = ac.createGain(); g.gain.value = v; return g; }
  function filt(type, f, q) { var b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; }
  function noise(loop) { var s = ac.createBufferSource(); s.buffer = nbuf; s.loop = !!loop; return s; }
  function chain() { for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); return arguments[arguments.length - 1]; }
  /* one short shaped burst of noise */
  function burst(t, dur, type, f, q, vol, f2) {
    var s = noise(false), fl = filt(type, f, q), g = gain(0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    chain(s, fl, g, master); s.start(t, Math.random() * 1.5, dur + 0.05);
  }
  /* one short note that can slide */
  function tone(t, dur, type, f0, f1, vol, att) {
    var o = ac.createOscillator(), g = gain(0); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (att || 0.008)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    chain(o, g, master); o.start(t); o.stop(t + dur + 0.05); return o;
  }

  /* the pause pill: the whole context is held, so every sound carries on from where it stopped */
  api.pause = function () { paused = true; if (ac && !dead && ac.state === 'running') ac.suspend(); };
  api.unpause = function () { paused = false; if (ac && !dead && ac.state === 'suspended') ac.resume(); };
  api.start = function () {
    if (ac || dead) { if (ac && ac.state === 'suspended' && !paused) ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = gain(muted ? 0 : 0.85); master.connect(ac.destination);
      nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      /* the river: a low rush that rises with the water */
      riverG = gain(0); riverF = filt('lowpass', 420, 0.5);
      var r1 = noise(true), r2 = noise(true);
      chain(r1, riverF, riverG, master); chain(r2, filt('bandpass', 1100, 0.7), gain(0.22), riverG);
      r1.start(0, 0.2); r2.start(0, 0.9);
      /* the storm heard from indoors: a low muffled bed */
      inG = gain(0); var i1 = noise(true); chain(i1, filt('lowpass', 190, 0.4), inG, master); i1.start(0, 0.5);
      /* the fire: a soft low roar, with crackles added by tick() */
      fireG = gain(0); var f1 = noise(true); chain(f1, filt('lowpass', 260, 0.3), fireG, master); f1.start(0, 1.3);
    } catch (e) { dead = true; ac = null; api.failed = String(e); }
  };
  api.state = function () { return dead ? 'off' : ac ? ac.state : 'not started'; };
  api.setMuted = function (m) { if (m === muted) return; muted = m; if (ok()) master.gain.setTargetAtTime(m ? 0 : 0.85, now(), 0.05); };

  /* beds: level 0 to 1 */
  api.river = function (v, secs) { if (!ok()) return; riverG.gain.setTargetAtTime(0.05 + 0.3 * v * v + (v > 0 ? 0.06 : -0.05), now(), (secs || 0.8) / 3); riverF.frequency.setTargetAtTime(380 + 520 * v, now(), 0.5); };
  api.riverOff = function (secs) { if (ok()) riverG.gain.setTargetAtTime(0, now(), (secs || 0.6) / 3); };
  api.indoors = function (v, secs) { if (ok()) inG.gain.setTargetAtTime(0.5 * v, now(), (secs || 0.6) / 3); };
  api.fire = function (v, secs) { fireOn = v > 0; if (ok()) fireG.gain.setTargetAtTime(0.16 * v, now(), (secs || 1) / 3); };
  /* called every frame by hour.js: the fire's crackles */
  api.tick = function () {
    if (!ok()) return;
    var t = now();
    if (fireOn && t >= fireAt) { fireAt = t + 0.05 + Math.random() * 0.32; burst(t, 0.012 + Math.random() * 0.03, 'bandpass', 1400 + Math.random() * 3200, 2.5, 0.05 + Math.random() * 0.14); }
    if (musOn) while (musAt < t + 0.35) { musicStep(musAt, musN++); musAt += BEAT; }
  };

  /* ---------- the cosy music at the end (his look, 6 Oct): a slow plucked arpeggio over four warm chords, a soft pad under it,
     and now and then one high note. Browser-made like every other sound here. Judged by his ear at the look (DFM 300). ---------- */
  var musG = null, musLP = null, musOn = false, musAt = 0, musN = 0, BEAT = 0.4545;
  var CHORDS = [[196, 246.94, 293.66, 369.99], [164.81, 196, 246.94, 293.66], [130.81, 164.81, 196, 246.94], [146.83, 185, 220, 261.63]];
  var ARP = [0, 1, 2, 3, 4, 3, 2, 1];
  function musicNote(t, f, dur, vol, type, att, rel) {
    var o = ac.createOscillator(), g = gain(0.0001); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0006, t + dur + rel);
    chain(o, g, musLP); o.start(t); o.stop(t + dur + rel + 0.05);
  }
  function musicStep(t, n) {
    var ch = CHORDS[Math.floor(n / 16) % 4], k = ARP[n % 8], f = k === 4 ? ch[0] * 2 : ch[k];
    musicNote(t, f, 0.05, 0.07 + (k === 0 ? 0.025 : 0) + Math.random() * 0.012, 'triangle', 0.006, 1.1);
    if (n % 16 === 0) { musicNote(t, ch[0], 16 * BEAT - 0.3, 0.03, 'sine', 1.2, 1.4); musicNote(t, ch[2] * 1.003, 16 * BEAT - 0.3, 0.022, 'sine', 1.4, 1.4); }
    if (n % 16 === 6 || n % 32 === 20) musicNote(t, ch[n % 32 === 20 ? 1 : 2] * 2, 0.3, 0.035, 'sine', 0.04, 1.6);
  }
  api.music = function (v, secs) {
    if (!ok()) return;
    if (!musG) { musG = gain(0.0001); musLP = filt('lowpass', 1700, 0.5); musLP.connect(musG); musG.connect(master); }
    var was = musOn; musOn = v > 0;
    musG.gain.cancelScheduledValues(now()); musG.gain.setTargetAtTime(Math.max(0.0001, v), now(), (secs || 2) / 3);
    if (musOn && !was) { musAt = now() + 0.1; musN = 0; }
  };
  api.musicOn = function () { return musOn; };

  /* the winch: one click of the ratchet; the tip: a thud */
  api.click = function (vol) { if (!ok()) return; var t = now(); burst(t, 0.028, 'bandpass', 2300, 5, 0.3 * (vol || 1)); tone(t, 0.03, 'square', 190, 150, 0.05 * (vol || 1), 0.002); };
  api.thud = function (vol) { if (!ok()) return; var t = now(); tone(t, 0.2, 'sine', 105, 46, 0.55 * (vol || 1), 0.004); burst(t, 0.12, 'lowpass', 420, 0.6, 0.3 * (vol || 1)); };
  api.splash = function (vol) { if (!ok()) return; var t = now(); burst(t, 0.5, 'bandpass', 900, 0.8, 0.35 * (vol || 1), 2600); };
  /* the hedgehog: a small squeak; and the happy one, two rising chirps */
  api.squeak = function (vol) {
    if (!ok()) return; var t = now(), v = 0.16 * (vol || 1);
    var o = tone(t, 0.2, 'triangle', 1750, 2500, v, 0.012); o.frequency.exponentialRampToValueAtTime(2050, t + 0.2);
    tone(t + 0.26, 0.15, 'triangle', 2100, 1700, v * 0.7, 0.012);
  };
  api.happySqueak = function (vol) { if (!ok()) return; var t = now(), v = 0.15 * (vol || 1); tone(t, 0.11, 'triangle', 1800, 2500, v, 0.01); tone(t + 0.15, 0.13, 'triangle', 2100, 3000, v, 0.01); };
  /* paws on the lane: one soft step */
  api.paw = function (vol) { if (!ok()) return; burst(now(), 0.05, 'lowpass', 700 + Math.random() * 300, 0.7, 0.2 * (vol || 1)); };
  /* Blink calls a move: one short hoot for each word her code prints. A jump is called higher. */
  api.call = function (high) { if (!ok()) return; var t = now(); tone(t, 0.2, 'sine', high ? 540 : 404, high ? 610 : 384, 0.24, 0.03); };
  /* the jump: a short rising whoosh; the landing is a paw */
  api.whoosh = function (vol) { if (!ok()) return; burst(now(), 0.32, 'bandpass', 500, 1.2, 0.22 * (vol || 1), 1800); };
  /* the tree comes down across the lane */
  api.crash = function () {
    if (!ok()) return; var t = now();
    burst(t, 0.09, 'highpass', 1800, 0.7, 0.6); burst(t + 0.07, 0.5, 'bandpass', 700, 0.8, 0.45, 220);
    burst(t + 0.5, 1.1, 'lowpass', 500, 0.5, 0.75, 90); tone(t + 0.5, 0.5, 'sine', 80, 34, 0.7, 0.005);
  };
  /* the bonk: a wooden knock */
  api.bonk = function (vol) { if (!ok()) return; var t = now(), v = vol || 1; tone(t, 0.1, 'sine', 430, 300, 0.4 * v, 0.002); tone(t, 0.07, 'triangle', 660, 520, 0.2 * v, 0.002); burst(t, 0.02, 'bandpass', 1500, 2, 0.25 * v); };
  /* the door: the latch (two small clicks), the swing, and the slam */
  api.latch = function () { if (!ok()) return; var t = now(); burst(t, 0.02, 'bandpass', 3100, 6, 0.3); burst(t + 0.07, 0.03, 'bandpass', 2400, 6, 0.26); };
  api.creak = function () { if (!ok()) return; var t = now(); var o = tone(t, 0.42, 'sawtooth', 210, 330, 0.035, 0.05); o.frequency.linearRampToValueAtTime(260, t + 0.42); };
  api.slam = function () { if (!ok()) return; var t = now(); tone(t, 0.28, 'sine', 120, 42, 0.75, 0.003); burst(t, 0.16, 'lowpass', 900, 0.6, 0.5); burst(t + 0.02, 0.03, 'bandpass', 2600, 4, 0.2); };
  /* a soft note when a word lands in the gap, and when a step is right */
  api.land = function () { if (!ok()) return; var t = now(); tone(t, 0.16, 'sine', 660, 0, 0.12, 0.006); tone(t + 0.09, 0.22, 'sine', 990, 0, 0.1, 0.006); };
})();
