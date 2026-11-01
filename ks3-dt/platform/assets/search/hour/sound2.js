/* PROTOTYPE. The new sounds Version 2 adds (spec 7.7, 5.5): a note each time round, one step higher each time;
   the warm chord at the wool; a soft flare tick; the "baaa" uses SearchSound.bleat. Own AudioContext, started from a button press. */
(function () {
  'use strict';
  var ac = null, out = null, muted = false;
  var S = {};
  S.start = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = 0.5; out.connect(ac.destination); } catch (e) { ac = null; }
  };
  S.pause = function () { if (ac && ac.state === 'running') ac.suspend(); };
  S.unpause = function () { if (ac && ac.state === 'suspended') ac.resume(); };
  function tone(f, at, dur, vol, type) {
    if (!ac || muted) return;
    var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (at || 0);
    o.type = type || 'sine'; o.frequency.value = f; o.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  }
  /* a pentatonic ladder from D4: round k of n climbs to the top by the last round */
  var LADDER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];
  S.round = function (k, n) {
    var step = Math.round((k - 1) / Math.max(1, n - 1) * (LADDER.length - 1)), f = 293.66 * Math.pow(2, LADDER[step] / 12);
    tone(f, 0, 0.5, 0.22, 'triangle'); tone(f * 2, 0, 0.3, 0.05, 'sine');
  };
  S.flare = function () { tone(1760, 0, 0.18, 0.06, 'sine'); tone(2637, 0.03, 0.14, 0.03, 'sine'); };
  S.chord = function () { [293.66, 369.99, 440, 587.33].forEach(function (f, i) { tone(f, i * 0.06, 2.6, 0.12, 'triangle'); }); };
  S.wrong = function () { tone(196, 0, 0.35, 0.12, 'triangle'); tone(185, 0.12, 0.4, 0.1, 'triangle'); };
  /* the soft tick when Next appears (spec 13) */
  S.tick = function () { tone(1400, 0, 0.06, 0.035, 'sine'); };
  S.thud = function () { tone(90, 0, 0.25, 0.3, 'sine'); };
  S.setMuted = function (m) { muted = m; };
  window.Snd2 = S;
})();
