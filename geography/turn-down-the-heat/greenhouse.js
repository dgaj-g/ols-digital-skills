/* The greenhouse machine: a 2D canvas particle model. Yellow dots = sunlight in; red dots = heat out;
   greenhouse gas molecules catch some heat and send it back down. A thermometer follows the setting.
   Schematic diagram (allowed): no pictures are hand-drawn here. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COUNT = [0, 6, 14, 26], CATCH = [0, 0.38, 0.5, 0.64];

  function mount(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d'), W = 0, H = 0, D = 1, alive = true, raf = null, frame = 0;
    var level = opts.level || 0, temps = opts.temps || [-18, 14, 15.1, 17];
    var shown = temps[level], parts = [], mols = [], seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

    function layout() {
      var r = canvas.getBoundingClientRect();
      D = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(280, r.width); H = Math.max(200, r.height);
      canvas.width = Math.round(W * D); canvas.height = Math.round(H * D);
      ctx.setTransform(D, 0, 0, D, 0, 0);
      seed = 11; mols = [];
      for (var i = 0; i < 26; i++) mols.push({ x: 0.08 * W + rnd() * 0.74 * W, y: H * (0.33 + rnd() * 0.18), kind: rnd() < 0.75 ? 'co2' : 'ch4', a: rnd() * 6.28, flash: 0 });
    }
    function sunXY() { return { x: W * 0.11, y: H * 0.11 }; }
    function groundY(x) { return H * 0.82 + Math.sin(x / W * 6.28 * 1.5) * H * 0.012; }

    function spawn() {
      var s = sunXY(), tx = W * (0.22 + rnd() * 0.55), ty = groundY(tx), d = Math.hypot(tx - s.x, ty - s.y), sp = Math.max(2.2, H / 140);
      parts.push({ x: s.x, y: s.y, vx: (tx - s.x) / d * sp, vy: (ty - s.y) / d * sp, kind: 'sun', crossed: false });
    }
    function emitHeat(p) {
      var ang = (-90 + (rnd() * 60 - 30)) * Math.PI / 180, sp = Math.max(1.7, H / 190);
      p.kind = 'heat'; p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp; p.crossed = false; p.y = groundY(p.x) - 2;
    }

    function step() {
      var n = COUNT[level], rate = reduce ? 26 : 9;
      if (frame % rate === 0) spawn();
      var band = H * 0.42;
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.kind === 'sun' && p.y >= groundY(p.x)) emitHeat(p);
        else if (p.kind === 'heat') {
          if (p.vy < 0 && !p.crossed && p.y <= band) {
            p.crossed = true;
            if (n && rnd() < CATCH[level]) {
              var best = null, bd = 1e9;
              for (var m = 0; m < n; m++) { var dd = Math.abs(mols[m].x - p.x); if (dd < bd) { bd = dd; best = mols[m]; } }
              if (best) best.flash = 1;
              var ang = (90 + (rnd() * 60 - 30)) * Math.PI / 180, sp = Math.hypot(p.vx, p.vy);
              p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp; p.kind = 'back';
            }
          }
        }
        if (p.kind === 'back' && p.y >= groundY(p.x)) emitHeat(p);
        if (p.y < -10 || p.x < -10 || p.x > W + 10) parts.splice(i, 1);
      }
      if (parts.length > 260) parts.splice(0, parts.length - 260);
      shown += (temps[level] - shown) * 0.04;
      frame++;
    }

    function ball(x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = c; ctx.fill(); }

    function render() {
      ctx.clearRect(0, 0, W, H);
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#06122A'); sky.addColorStop(0.3, '#0D1F45'); sky.addColorStop(0.62, '#2a5b9a'); sky.addColorStop(0.82, '#7fb3e0');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // greenhouse gas layer
      var n = COUNT[level];
      ctx.fillStyle = 'rgba(158,202,225,' + (0.05 + 0.05 * level) + ')';
      ctx.fillRect(0, H * 0.31, W, H * 0.22);
      // sun
      var s = sunXY(), R = Math.min(W, H) * 0.075;
      var glow = ctx.createRadialGradient(s.x, s.y, R * 0.3, s.x, s.y, R * 2.4);
      glow.addColorStop(0, 'rgba(255,214,90,0.9)'); glow.addColorStop(1, 'rgba(228,184,36,0)');
      ctx.fillStyle = glow; ctx.fillRect(s.x - R * 2.5, s.y - R * 2.5, R * 5, R * 5);
      ball(s.x, s.y, R, '#FFD45A');
      // ground
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x <= W; x += 8) ctx.lineTo(x, groundY(x));
      ctx.lineTo(W, H); ctx.closePath();
      var warm = Math.max(0, Math.min(1, (shown + 18) / 36));
      var gg = ctx.createLinearGradient(0, H * 0.8, 0, H);
      gg.addColorStop(0, 'rgb(' + Math.round(70 + 120 * warm) + ',' + Math.round(140 - 40 * warm) + ',' + Math.round(80 - 30 * warm) + ')');
      gg.addColorStop(1, '#2b4a2a');
      ctx.fillStyle = gg; ctx.fill();
      if (level === 0) { ctx.fillStyle = 'rgba(235,245,255,0.75)'; ctx.fill(); }
      // molecules
      for (var m = 0; m < n; m++) {
        var o = mols[m], f = o.flash; o.flash *= 0.9;
        var k = Math.min(W, H) / 100;
        if (f > 0.05) ball(o.x, o.y, k * 4.2, 'rgba(251,106,74,' + (0.55 * f) + ')');
        if (o.kind === 'co2') {
          var dx = Math.cos(o.a) * k * 1.9, dy = Math.sin(o.a) * k * 1.9;
          ball(o.x - dx, o.y - dy, k * 1.2, '#E04A3A'); ball(o.x + dx, o.y + dy, k * 1.2, '#E04A3A'); ball(o.x, o.y, k * 1.3, '#1B2433');
        } else {
          ball(o.x, o.y, k * 1.2, '#1B2433');
          for (var q = 0; q < 4; q++) ball(o.x + Math.cos(o.a + q * 1.57) * k * 1.6, o.y + Math.sin(o.a + q * 1.57) * k * 1.6, k * 0.75, '#F2F2F2');
        }
      }
      // particles
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        ball(p.x, p.y, Math.max(2.4, Math.min(W, H) / 140), p.kind === 'sun' ? '#FFE27A' : '#FF5A3C');
      }
      thermometer();
      if (opts.numbers) numbers();
    }

    function thermometer() {
      var x = W - Math.max(46, W * 0.06), top = H * 0.12, bot = H * 0.78, w = Math.max(14, W * 0.018);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      roundRect(x - w / 2 - 4, top - 4, w + 8, bot - top + 8, w);
      ctx.fill();
      var f = Math.max(0, Math.min(1, (shown + 25) / 50)), y = bot - (bot - top) * f;
      ctx.fillStyle = window.TDTH_STRIPES ? TDTH_STRIPES.colour((shown - 13.6) / 1.4 + 0.2) : '#CB181D';
      roundRect(x - w / 2, y, w, bot - y, w / 2); ctx.fill();
      ball(x, bot + w * 0.7, w * 1.05, ctx.fillStyle);
      var label = (shown < 0 ? '−' : '') + Math.abs(Math.round(shown * 10) / 10).toFixed(level === 0 ? 0 : 1) + ' °C';
      ctx.font = '700 ' + Math.max(15, Math.round(W / 40)) + 'px "Atkinson Hyperlegible", system-ui, sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.fillText(label, x - w - 10, Math.max(top + 10, y));
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

    function numbers() {
      var spots = [[W * 0.36, H * 0.70], [W * 0.62, H * 0.64], [W * 0.66, H * 0.10], [W * 0.18, H * 0.42], [W - Math.max(46, W * 0.06), H * 0.06]];
      var r = Math.max(13, Math.min(W, H) / 26);
      ctx.font = '700 ' + Math.round(r * 1.25) + 'px "Anton", Impact, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      spots.forEach(function (s, i) {
        ball(s[0], s[1], r + 2, '#1B2433'); ball(s[0], s[1], r, '#E4B824');
        ctx.fillStyle = '#1B2433'; ctx.fillText(String(i + 1), s[0], s[1] + 1);
      });
    }

    function loop() { if (!alive) return; raf = requestAnimationFrame(loop); step(); render(); }
    layout();
    for (var w = 0; w < 260; w++) step();
    loop();
    var ro = window.ResizeObserver ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(canvas);

    return {
      setLevel: function (i) { level = i; },
      dispose: function () { alive = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); }
    };
  }
  window.TDTH_GREENHOUSE = { mount: mount };
})();
