/* TWO LIGHTS · sound (spec §7). Browser-made, nothing to download. Every sound has a drawn twin on screen, so
   headphones are optional. Pause holds them all: the audio context is suspended while the story is paused.
   window.TwoSound.play(name) · .hold(on) · .unlock() (first click) */
(function () {
  'use strict';
  var ac = null, master = null, held = false;
  function ctx() {
    if (ac) return ac;
    var A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    ac = new A(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    return ac;
  }
  function tone(f0, f1, t0, dur, type, vol) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.linearRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + Math.min(0.08, dur / 4));
    g.gain.setValueAtTime(vol || 0.3, t0 + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, vol, hp) {
    var n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 90));
    var s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = hp || 1800; f.Q.value = 0.8;
    s.buffer = buf; g.gain.setValueAtTime(vol || 0.25, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0);
  }
  var SOUNDS = {
    horn: function (t) { tone(110, 110, t, 0.7, 'sawtooth', 0.22); tone(82, 82, t + 0.7, 0.7, 'sawtooth', 0.22); },
    crackle: function (t) { noise(t, 0.3, 0.3, 2200); },
    lamp: function (t) { tone(180, 520, t, 0.8, 'triangle', 0.18); },
    red: function (t) { tone(90, 55, t, 0.35, 'sine', 0.4); noise(t, 0.12, 0.15, 300); },
    coin: function (t) { tone(988, 988, t, 0.1, 'square', 0.12); tone(1319, 1319, t + 0.1, 0.35, 'square', 0.12); },
    rewind: function (t) { tone(900, 200, t, 1.2, 'sawtooth', 0.1); noise(t, 1.2, 0.08, 3000); },
    cheer: function (t) { [0, 0.18, 0.36].forEach(function (d, i) { tone(1200 + i * 180, 1700 + i * 180, t + d, 0.14, 'sine', 0.2); }); },
    ceremony: function (t) { noise(t, 0.3, 0.3, 2200); tone(110, 110, t + 0.45, 0.7, 'sawtooth', 0.2); tone(82, 82, t + 1.15, 0.7, 'sawtooth', 0.2); }
  };
  window.TwoSound = {
    unlock: function () { var a = ctx(); if (a && a.state === 'suspended' && !held) a.resume(); },
    play: function (name) {
      var a = ctx(); if (!a || held || !SOUNDS[name]) return false;
      if (a.state !== 'running') {
        /* not started yet (no click on this page so far): a suspended clock stands still, so sounds queued now would all
           go off together on her first click. Play it when the sound starts, only if that is straight away */
        var asked = Date.now(), p = a.resume();
        if (p && p.then) { p.then(function () { if (!held && Date.now() - asked < 600) try { SOUNDS[name](a.currentTime + 0.02); } catch (e) {} }, function () {}); return true; }
      }
      try { SOUNDS[name](a.currentTime + 0.02); } catch (e) { return false; }
      return true;
    },
    hold: function (on) { held = !!on; var a = ctx(); if (!a) return; if (held) a.suspend(); else a.resume(); },
    held: function () { return held; }
  };
})();
