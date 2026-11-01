/* PROTOTYPE. The screen machinery of Version 2 (spec §4, §5.1, §5.2, §5.5, §12): the frame loop and the game clock,
   the panel and Next, talk screens, film captions, the big clock, the strip, Pause, the spotlight tour.
   Everything waits in game time, so Pause stops it all. ?fast=1 shortens every wait (for screenshots); ?at=id jumps. */
(function () {
  'use strict';
  var Sc = window.SearchScene, C = window.SearchChars, Snd = window.SearchSound, S2 = window.Snd2;
  var Q = new URLSearchParams(location.search);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var U = { $: $, Q: Q, fast: Q.get('fast') === '1', speed: +Q.get('speed') || 1, t: 0, paused: false, scale: 1, ox: 0, oy: 0, scene: null, lambSt: null, speak: null };
  var stage = $('#stage'), panel = $('#panel'), film = $('#film'), waits = [], tweens = [], faces = [], last = performance.now();
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, u) { return a + (b - a) * u; };
  U.smooth = function (u) { u = U.clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  U.esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  /* ---------- fitting the 1600 by 900 stage into the window ---------- */
  U.fit = function () {
    Sc.size(); var cw = window.innerWidth, ch = window.innerHeight, s = Math.min(cw / 1600, ch / 900);
    U.scale = s; U.ox = (cw - 1600 * s) / 2; U.oy = (ch - 900 * s) / 2;
    stage.style.transform = 'translate(' + U.ox + 'px,' + U.oy + 'px) scale(' + s + ')';
  };
  /* an element's box in stage units */
  U.rect = function (el) { var r = el.getBoundingClientRect(); return { x: (r.left - U.ox) / U.scale, y: (r.top - U.oy) / U.scale, w: r.width / U.scale, h: r.height / U.scale }; };

  /* ---------- game time: waits and tweens that stop when paused ---------- */
  U.wait = function (sec) { sec = U.fast ? Math.min(sec, 0.05) : sec; return new Promise(function (res) { waits.push({ at: U.t + sec, res: res }); }); };
  U.tween = function (dur, fn) { dur = U.fast ? Math.min(dur, 0.05) : dur; return new Promise(function (res) { tweens.push({ t0: U.t, dur: Math.max(0.001, dur), fn: fn, res: res }); fn(0); }); };
  U.every = function (fn) { tweens.push({ t0: U.t, dur: Infinity, fn: fn }); };
  function tick(dt) {
    var i, w, k;
    for (i = waits.length - 1; i >= 0; i--) if (U.t >= waits[i].at) { w = waits.splice(i, 1)[0]; w.res(); }
    for (i = tweens.length - 1; i >= 0; i--) {
      w = tweens[i]; if (w.dur === Infinity) { if (w.fn(U.t, dt) === false) tweens.splice(i, 1); continue; }
      k = U.clamp((U.t - w.t0) / w.dur, 0, 1); w.fn(k); if (k >= 1) { tweens.splice(i, 1); w.res(); }
    }
    clockTick(dt);
  }
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000) * U.speed; last = now;
    if (!U.paused) { U.t += dt; tick(dt); }
    Sc.begin(); if (U.scene) U.scene(U.t, U.paused ? 0 : dt);
    drawLamb(); drawFaces();
    requestAnimationFrame(frame);
  }

  /* ---------- the lamb's window (spec 5.6): drawn every frame from U.lambSt ---------- */
  var lw = $('#lambwin'), lc = $('#lambwin canvas'), lcx = lc.getContext('2d');
  U.lamb = function (st) { U.lambSt = st; lw.classList.toggle('hide', !st); $('#lambcap').classList.toggle('hide', !st || !!st.noCap); };
  function sizeCanvas(cv, w, h) { var d = Math.min(2, window.devicePixelRatio || 1) * U.scale, W = Math.round(w * d), H = Math.round(h * d); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } return d; }
  function drawLamb() {
    if (!U.lambSt) return; var d = sizeCanvas(lc, 214, 164);
    lcx.setTransform(d, 0, 0, d, 0, 0); U.lambSt.t = U.t; window.Pics.lamb(lcx, 0, 0, 214, 164, U.lambSt);
  }

  /* ---------- faces in the talk circle (spec 5.2): drawn live, blinking ---------- */
  function blink(t, seed) { var p = (t + seed * 3.1) % 4.3; return p < 0.13 ? Math.sin(p / 0.13 * Math.PI) : 0; }
  function drawFaces() {
    for (var i = faces.length - 1; i >= 0; i--) {
      var f = faces[i]; if (!document.body.contains(f.cv)) { faces.splice(i, 1); continue; }
      var d = sizeCanvas(f.cv, 140, 140), x = f.cx; x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, 140, 140);
      var t = U.t, talking = U.speak && U.t - U.speak.t0 < 2.2 ? 1 : 0;
      x.save(); x.beginPath(); x.arc(70, 70, 70, 0, Math.PI * 2); x.clip();
      if (f.who === 'BEEP') {
        x.translate(70, 78); x.scale(50, 50);
        C.beep(x, { t: t, open: 1, blink: blink(t, 1), look: [0.08 * Math.sin(t * 0.7), 0.05], mood: f.mood == null ? 0.6 : f.mood, glow: 0.8 + 0.2 * talking * Math.abs(Math.sin(t * 9)), rotor: 0.6, antenna: 1, cheeks: f.mood == null ? 0.6 : f.mood, hover: 1, tilt: 0.04 * Math.sin(t * 0.9), torch: 0 });
      } else {
        x.translate(70, 152); x.scale(150, 150); x.translate(0, -0.35);
        C.nuala(x, { t: t, torch: 0.9, phone: 0, walk: 0, look: [0.15, 0.05], blink: blink(t, 2), worry: 1 });
      }
      x.restore();
    }
  }

  /* ---------- the panel and Next (spec 5.1) ---------- */
  U.words = function (s) { var m = String(s).replace(/<[^>]*>/g, ' ').match(/[A-Za-z0-9?·()]+/g); return m ? m.length : 0; };
  U.nextDelay = function (words) { return U.fast ? 0.05 : U.clamp(1 + 0.25 * words, 1.5, 6); };
  /* one code line as the card shows it: a gold dot for each leading space, Python words gold, numbers blue */
  U.code = function (line) {
    var lead = line.length - line.replace(/^ +/, '').length, rest = U.esc(line.slice(lead));
    rest = rest.replace(/\b(for|in|range|while|True)\b|(\d+)/g, function (m, kw, n) { return kw ? '<span class="kw">' + kw + '</span>' : '<span class="num">' + n + '</span>'; });
    return '<span class="dot">' + new Array(lead + 1).join('·') + '</span>' + rest;
  };
  U.card = function (lines, o) {
    o = o || {};
    return '<div class="card">' + (o.label ? '<div class="lab">' + o.label + '</div>' : '') +
      lines.map(function (l, i) { return '<div class="ln" data-i="' + i + '">' + U.code(l) + '</div>'; }).join('') +
      (o.sign ? '<div class="sign">' + o.sign + '</div>' : '') + '<div class="sign help hide"></div></div>';
  };
  /* show a screen in the panel. o: {step, h, sub, html, back, next ('Next' or another label), hold (Next waits for showNext)}.
     Returns {el, done (a promise of 'next' or 'back'), showNext(delay)} */
  U.screen = function (o) {
    o = o || {};
    var html = (o.step ? '<div class="stepl">' + o.step + '</div>' : '') + (o.h ? '<h2>' + o.h + '</h2>' : '') + (o.sub ? '<p class="sub">' + o.sub + '</p>' : '') + (o.html || '') +
      '<div class="grow"></div><div class="btns"><span>' + (o.back ? '<button class="btn back">Back</button>' : '') + '</span><button class="btn pri next">' + (o.next || 'Next') + '</button></div>';
    panel.innerHTML = html; panel.classList.remove('hide');
    var nx = $('.next', panel), bk = $('.back', panel), res, scr = { el: panel };
    scr.done = new Promise(function (r) { res = r; });
    nx.onclick = function () { if (!nx.classList.contains('on')) return; nx.classList.remove('on'); res('next'); };
    if (bk) bk.onclick = function () { res('back'); };
    scr.showNext = function (delay) {
      if (delay == null) delay = U.nextDelay(U.words(panel.textContent) - 1 - (bk ? 1 : 0));
      return U.wait(delay).then(function () { if (panel.contains(nx)) { nx.classList.add('on'); S2.tick(); } });
    };
    scr.hideNext = function () { nx.classList.remove('on'); };
    if (!o.hold) scr.showNext();
    return scr;
  };
  /* a talk screen (spec 5.2). who: 'BEEP' or 'NUALA' */
  U.talk = function (who, line, o) {
    o = o || {};
    var scr = U.screen({ step: o.step, html: '<div class="talk"><canvas></canvas><div class="who">' + who + '</div></div><div class="talkline">' + line + '</div>', back: o.back, next: o.next });
    var cv = $('.talk canvas', panel); faces.push({ cv: cv, cx: cv.getContext('2d'), who: who, mood: o.mood });
    U.speak = { who: who, t0: U.t }; if (who === 'BEEP') Snd.chirp(o.chirp || 'hi');
    return scr.done;
  };
  U.panelOff = function () { panel.classList.add('hide'); panel.innerHTML = ''; };

  /* ---------- film captions: each holds until Next (spec 6) ---------- */
  U.film = function (cap, o) {
    o = o || {};
    film.innerHTML = '<div class="bar' + (cap ? '' : ' solo') + '">' + (cap ? '<div class="cap">' + cap + '</div>' : '') + '<button class="btn pri next">' + (o.next || 'Next') + '</button></div>';
    film.classList.remove('hide');
    var nx = $('.next', film);
    U.wait(o.delay != null ? (U.fast ? 0.05 : o.delay) : U.nextDelay(U.words(cap || ''))).then(function () { nx.classList.add('on'); S2.tick(); });
    return new Promise(function (res) { nx.onclick = function () { if (!nx.classList.contains('on')) return; film.classList.add('hide'); film.innerHTML = ''; res(); }; });
  };

  /* ---------- the big clock (spec 5.5) ---------- */
  var ck = $('#clock'), ckW = $('#clock .words'), ckD = $('#clock .digits'), ckF = $('#clock .fill'), beatAt = 0;
  var clock = U.clock = { on: false, run: false, left: 0, total: 1, words: '', onEnd: null };
  function digits(s) { s = Math.max(0, Math.ceil(s - 1e-6)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function clockDraw() {
    ckD.textContent = digits(clock.left); ckF.style.width = (100 * clock.left / clock.total) + '%';
    ckW.textContent = clock.run || clock.left < clock.total ? clock.words : 'The clock starts when you type.';
    ck.classList.toggle('wait', !clock.run && clock.left >= clock.total);
    ck.classList.toggle('orange', clock.left <= 20 && clock.left > 10); ck.classList.toggle('red', clock.left <= 10);
  }
  clock.show = function (words, secs) { clock.on = true; clock.run = false; clock.words = words; clock.left = clock.total = secs; ck.classList.remove('hide'); clockDraw(); };
  clock.start = function () { if (clock.on && !clock.run && clock.left > 0) { clock.run = true; beatAt = 0; clockDraw(); } };
  clock.stop = function () { clock.run = false; clockDraw(); };
  clock.hide = function () { clock.on = clock.run = false; ck.classList.add('hide'); };
  clock.frac = function () { return clock.on ? 1 - clock.left / clock.total : 0; };   /* 0 at the start, 1 when time is up */
  function clockTick(dt) {
    if (!clock.run) return;
    clock.left = Math.max(0, clock.left - dt * (U.fast ? 1 : 1));
    if (clock.left <= 10 && clock.left > 0 && U.t >= beatAt) { beatAt = U.t + 1.0; Snd.beat(0.7); ck.classList.add('beat'); setTimeout(function () { ck.classList.remove('beat'); }, 260); }
    clockDraw();
    if (clock.left <= 0) { clock.run = false; if (clock.onEnd) { var f = clock.onEnd; clock.onEnd = null; f(); } }
  }

  /* ---------- the strip and Pause (spec 4, 12) ---------- */
  var STRIP = window.SearchStrings.strip;
  U.strip = function (cur, done) {
    var s = $('#strip'); done = done || [];
    s.innerHTML = '<button class="pause">Pause</button>' + STRIP.map(function (n, i) { return (i ? '<span class="sep">·</span>' : '') + '<span class="ch' + (i === cur ? ' on' : '') + (done.indexOf(i) > -1 ? ' done' : '') + '">' + n + '</span>'; }).join('');
    s.classList.remove('hide'); $('.pause', s).onclick = U.pause;
  };
  U.pause = function () { if (U.paused) return; U.paused = true; Snd.pause(); S2.pause(); $('#pausescrim').classList.remove('hide'); $('#pausescrim .btn').focus(); };
  $('#pausescrim .btn').onclick = function () { U.paused = false; Snd.unpause(); S2.unpause(); $('#pausescrim').classList.add('hide'); };

  /* ---------- the spotlight tour (spec 7.2): three stops, Next on each ---------- */
  U.tour = function (stops) {
    var spot = $('#tour'), tip = $('#tourtip'), i = 0;
    return new Promise(function (res) {
      U.tourEnd = function () { i = stops.length; show(); };
      function show() {
        if (i >= stops.length) { spot.classList.add('hide'); tip.classList.add('hide'); U.tourEnd = null; res(); return; }
        var r = U.rect(stops[i].el), pad = 10;
        spot.style.cssText = 'left:' + (r.x - pad) + 'px;top:' + (r.y - pad) + 'px;width:' + (r.w + 2 * pad) + 'px;height:' + (r.h + 2 * pad) + 'px';
        tip.innerHTML = '<div>' + stops[i].text + '</div><div class="btns"><button class="btn pri next">Next</button></div>';
        tip.style.left = Math.max(20, r.x - 360 - 34) + 'px'; tip.style.top = Math.min(900 - 200, Math.max(20, r.y)) + 'px';
        spot.classList.remove('hide'); tip.classList.remove('hide');
        var nx = $('.next', tip); U.wait(U.nextDelay(U.words(stops[i].text))).then(function () { nx.classList.add('on'); S2.tick(); });
        nx.onclick = function () { if (!nx.classList.contains('on')) return; i++; show(); };
      }
      show();
    });
  };

  /* ---------- keys: Enter or Space presses Next when it shows and the box is not in use (spec 5.1) ---------- */
  /* typing on after the box closes (the clock ran out, or the lines were done) never presses Next:
     her keys are swallowed until 1.2 s after her last letter, so the screens after it are read, not skipped */
  var typedAt = 0;
  document.addEventListener('keydown', function (e) {
    var a = document.activeElement, now = Date.now(), letter = (e.key.length === 1 && e.key !== ' ') || e.key === 'Backspace' || e.key === 'Tab';
    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) { typedAt = now; return; }
    if (now - typedAt < 1200) { if (letter) typedAt = now; if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); return; }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (U.paused) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#pausescrim .btn').click(); } return; }
    var b = $('#tourtip:not(.hide) .next.on') || $('#film:not(.hide) .next.on') || $('#readit:not(.hide)') || $('#panel:not(.hide) .next.on');
    var live = a && a.tagName === 'BUTTON' && a !== b && !a.disabled && a.offsetParent && !a.classList.contains('right'); /* a spent or hidden button never swallows Enter */
    if (b && !live) { e.preventDefault(); b.click(); }
  });

  /* ---------- Pause on Escape and when she leaves the tab (spec V2 §12); the 48-minute note (§12.3) ---------- */
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !U.paused) { e.preventDefault(); U.pause(); } });
  document.addEventListener('visibilitychange', function () { if (document.hidden && !U.paused) U.pause(); });
  var T0 = Date.now(), MINS = +Q.get('mins') || 0;
  U.minutes = function () { return (Date.now() - T0) / 60000 + MINS; };
  U.note = function (text) { var n = $('#note'); if (!n) { n = document.createElement('div'); n.id = 'note'; document.body.appendChild(n); } n.textContent = text; n.classList.remove('hide'); };

  U.start = function () { U.fit(); window.addEventListener('resize', U.fit); requestAnimationFrame(frame); };
  window.U = U;
})();
