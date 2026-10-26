/* Browser-made sounds (no files): buzz for a message, ring for the call, ding for right, thud for a wrong try, tick for the timer. */
(function (g) {
  var ctx = null; function ac() { if (!ctx) { try { ctx = new (g.AudioContext || g.webkitAudioContext)(); } catch (e) { ctx = null; } } return ctx; }
  function tone(f, t, type, gain, when) { var c = ac(); if (!c) return; var o = c.createOscillator(), v = c.createGain(); o.type = type || 'sine'; o.frequency.value = f; v.gain.value = gain || 0.08; o.connect(v); v.connect(c.destination); var s = c.currentTime + (when || 0); o.start(s); v.gain.setValueAtTime(gain || 0.08, s); v.gain.exponentialRampToValueAtTime(0.0001, s + t); o.stop(s + t + 0.02); }
  g.Sound = {
    buzz: function () { tone(90, 0.18, 'square', 0.05); tone(90, 0.18, 'square', 0.05, 0.25); },
    ring: function () { for (var i = 0; i < 3; i++) { tone(880, 0.12, 'sine', 0.06, i * 0.18); tone(1100, 0.12, 'sine', 0.06, i * 0.18 + 0.06); } },
    ding: function () { tone(660, 0.25, 'sine', 0.07); tone(990, 0.35, 'sine', 0.05, 0.08); },
    thud: function () { tone(140, 0.22, 'triangle', 0.09); },
    tick: function () { tone(1200, 0.03, 'square', 0.02); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.3, 'sine', 0.06, i * 0.12); }); }
  };
})(window);
