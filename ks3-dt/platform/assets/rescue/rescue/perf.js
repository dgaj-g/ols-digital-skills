/* The Rescue: the slow-computer watchdog (spec section 13).
   It measures the middle frame time over about 90 frames. Over 22 ms it lowers the canvas detail
   one step: full, three quarters, six tenths. It never raises it again. The story clock runs on
   real time, so a slow computer shows fewer frames, never a slower story. It touches no chapter 1
   code: it only sets RescueScene.maxDpr and asks the scene to resize. */
(function () {
  'use strict';
  var STEPS = [1, 0.75, 0.6], step = 0, buf = [], last = 0, quiet = 0;
  var api = window.RescuePerf = { step: 0, median: 0, limit: 22, off: /[?&]noperf\b/.test(location.search) };
  function base() { return Math.min(window.devicePixelRatio || 1, 2); }
  function apply() {
    var Sc = window.RescueScene; if (!Sc) return;
    Sc.maxDpr = base() * STEPS[step]; Sc.resize(); api.step = step;
  }
  function tick(ts) {
    requestAnimationFrame(tick);
    var dt = ts - last; last = ts;
    if (api.off || document.hidden || dt <= 0 || dt > 250) { buf.length = 0; return; }
    if (quiet > 0) { quiet--; return; }
    buf.push(dt);
    if (buf.length < 90) return;
    var s = buf.slice().sort(function (a, b) { return a - b; }); buf.length = 0;
    api.median = s[45];
    if (api.median > api.limit && step < STEPS.length - 1) { step++; apply(); quiet = 30; }
  }
  /* for the gate: force a step and read it back */
  api.force = function (n) { step = Math.max(0, Math.min(STEPS.length - 1, n)); apply(); };
  requestAnimationFrame(function (ts) { last = ts; requestAnimationFrame(tick); });
})();
