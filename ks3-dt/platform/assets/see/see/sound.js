/* Browser-made sounds, no files (DFM 299/300): bell when the hatch opens, tick for the clock, ding for right, thud for a wrong room, buzz for a message, fanfare at the badges.
   Every sound has a drawn twin on screen (the bell line, the clock number, the ok/wrong line), so sound off loses nothing. */
(function (g) {
  var ctx = null, on = true; function ac() { if (!ctx) { try { ctx = new (g.AudioContext || g.webkitAudioContext)(); } catch (e) { ctx = null; } } return ctx; }
  function tone(f, t, type, gain, when) { if (!on) return; var c = ac(); if (!c) return; var o = c.createOscillator(), v = c.createGain(); o.type = type || 'sine'; o.frequency.value = f; v.gain.value = gain || 0.08; o.connect(v); v.connect(c.destination); var s = c.currentTime + (when || 0); o.start(s); v.gain.setValueAtTime(gain || 0.08, s); v.gain.exponentialRampToValueAtTime(0.0001, s + t); o.stop(s + t + 0.02); }
  g.Sound = {
    toggle: function () { on = !on; return on; }, isOn: function () { return on; },
    bell: function () { tone(1760, 0.6, 'sine', 0.05); tone(2637, 0.5, 'sine', 0.03, 0.02); tone(1760, 0.6, 'sine', 0.04, 0.45); },
    buzz: function () { tone(90, 0.18, 'square', 0.05); tone(90, 0.18, 'square', 0.05, 0.25); },
    ding: function () { tone(660, 0.25, 'sine', 0.07); tone(990, 0.35, 'sine', 0.05, 0.08); },
    thud: function () { tone(140, 0.22, 'triangle', 0.09); tone(90, 0.3, 'triangle', 0.06, 0.05); },
    tick: function () { tone(1200, 0.03, 'square', 0.02); },
    flip: function () { tone(520, 0.05, 'triangle', 0.03); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.3, 'sine', 0.06, i * 0.12); }); }
  };
})(window);
