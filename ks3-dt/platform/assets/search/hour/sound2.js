/* the hour's extra sounds (heartbeat, rewind, battery, bark, barn door, chord, click). Own AudioContext; starts on a press. */
(function () {
  'use strict'; var ac = null, master, muted = false, api = {};
  function now() { return ac.currentTime; }
  function start() { if (ac) return; try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination); } catch (e) { ac = null; } }
  function tone(f, t0, d, type, vol, slide) { if (!ac) return; var o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + 0.05); }
  api.start = function () { start(); if (ac && ac.state === 'suspended') ac.resume(); };
  api.setMuted = function (m) { muted = m; if (ac) master.gain.setTargetAtTime(m ? 0 : 0.8, now(), 0.05); };
  api.pause = function () { if (ac && ac.state === 'running') ac.suspend(); }; api.unpause = function () { if (ac && ac.state === 'suspended') ac.resume(); };
  api.heartbeat = function () { if (!ac) return; var t = now(); tone(55, t, 0.12, 'sine', 0.5, 40); tone(50, t + 0.18, 0.14, 'sine', 0.35, 36); };
  api.click = function () { if (!ac) return; tone(1400, now(), 0.04, 'square', 0.08, 900); };
  api.rewind = function (d) { if (!ac) return; var t = now(); tone(900, t, d || 1.2, 'triangle', 0.12, 180); };
  api.battery = function (level) { if (!ac) return; tone(420 - 200 * (1 - level), now(), 0.1, 'square', 0.1); };
  api.bark = function () { if (!ac) return; var t = now(); tone(320, t, 0.09, 'sawtooth', 0.25, 180); tone(260, t + 0.05, 0.08, 'sawtooth', 0.18, 140); };
  api.door = function () { if (!ac) return; var t = now(); tone(90, t, 0.9, 'sawtooth', 0.12, 60); tone(180, t + 0.7, 0.2, 'triangle', 0.1); };
  api.chord = function () { if (!ac) return; var t = now(); [262, 330, 392, 523].forEach(function (f, i) { tone(f, t + i * 0.06, 2.2, 'sine', 0.16); }); };
  api.count = function (i) { if (!ac) return; tone(520 + 60 * i, now(), 0.16, 'triangle', 0.22); };
  window.SearchSound2 = api;
})();
