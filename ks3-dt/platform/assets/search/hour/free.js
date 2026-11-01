/* J2 L5 THE SEARCH, Version 2: the free flight (spec V2 §11.4). Six minutes on the open hill, nothing marked: three examples
   to start from, or her own loop. BEEP draws it in light. Py reads it, the same reader as the hour.
   window.SearchFree.last = { done, src, steps } after each Run (the walker reads it). */
(function () {
  'use strict';
  var S = window.SearchStrings, Snd = window.SearchSound, S2 = window.Snd2, P = window.Pics, Py = window.Py, Box = window.Box, $ = U.$;
  var F = window.SearchFree = { last: null }, panel = $('#panel'), PXM = 2.2, CX = 540, CY = 470;
  window.FreeFlight = async function () {
    var st = { kind: 'hill', ribbons: [], beep: { x: CX, y: CY, h: 0, torch: 1 }, lamb: null, ring0: 0, count: null, baa: null, fade: 0, dark: 0, black: 0, ring: 0, say: null }, over = false, run = 0;
    var oldScene = U.scene; U.scene = function (t, dt) { st.t = t; st.snowT = t; P.plan(Sc().ctx, st); };
    function Sc() { return window.SearchScene; }
    U.strip(5, [0, 1, 2, 3, 4]);
    var scr = U.screen({ step: S.close.kicker, h: S.close.freeH, hold: true, next: S.btn.finish,
      html: '<div class="opts">' + S.close.freeStarters.map(function (s, i) { return '<button class="opt" data-i="' + i + '">' + U.esc(s[0]) + '</button>'; }).join('') + '</div><div class="slot"></div>' });
    var box = Box.make($('.slot', panel), { rows: 4, readyAt: 0, onRun: function (lines) { fly(lines); } });
    [].forEach.call(panel.querySelectorAll('.opt'), function (b) { b.onclick = function () { box.set(S.close.freeStarters[+b.dataset.i][1].join('\n')); box.under(''); box.focus(); }; });
    U.clock.show('Free flight ends in', 360); U.clock.onEnd = function () { over = true; }; U.clock.start();
    scr.showNext(0);
    /* Run sits beside Finish on one row, so the panel fits a 768-high screen */
    var runB = $('.slot .run', panel), left = $('.btns > span', panel); if (runB && left) { left.appendChild(runB); runB.classList.remove('hide'); }
    async function fly(lines) {
      if (over) return;
      var r = Py.read(lines, { known: ['forward', 'left', 'right', 'look'], loops: true, i: true });
      F.last = { done: false, src: lines.join('\n'), steps: 0 };
      if (!r.ok || !r.prog.some(function (s) { return s.type === 'for'; })) { box.under(S.close.freeNotRun, 'bad'); F.last.done = true; return; }
      box.under(''); var me = ++run, tr = Py.trace(r.prog, { cap: 40 }).slice(0, 400), b = st.beep;
      st.ribbons = []; b.x = CX; b.y = CY; b.h = 0; Snd.rotor(0.6, 0.4);
      await box.run(tr, function (s, dur) {
        if (me !== run || over) return 'stop';
        F.last.steps++;
        if (s.op === 'forward') { var x0 = b.x, y0 = b.y, x1 = x0 + Math.cos(b.h) * s.v * PXM, y1 = y0 - Math.sin(b.h) * s.v * PXM, rb = { x0: x0, y0: y0, x1: x1, y1: y1, u: 0 }; st.ribbons.push(rb);
          return U.tween(dur * 0.85, function (k) { rb.u = k; b.x = U.lerp(x0, x1, k); b.y = U.lerp(y0, y1, k); }); }
        if (s.op === 'left' || s.op === 'right') { var h0 = b.h, d = (s.op === 'left' ? 1 : -1) * s.v * Math.PI / 180; return U.tween(dur * 0.6, function (k) { b.h = U.lerp(h0, h0 + d, k); }); }
        return null;
      }, { pace: 0.5 });
      box.endRun(); box.lock(false); Snd.rotor(0.3, 0.6); F.last.done = true;
    }
    await Promise.race([scr.done, new Promise(function (res) { U.every(function () { if (over) { res(); return false; } }); })]);
    over = true; U.clock.hide();
    U.scene = oldScene;
    U.strip(5, [0, 1, 2, 3, 4, 5]);
    U.screen({ step: S.close.kicker, h: S.close.finished, hold: true });
    $('.btns', panel).classList.add('hide');
    await U.wait(2.5);
    window.SearchBridge.done('end');
  };
})();
