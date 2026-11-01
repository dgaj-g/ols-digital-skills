/* J2 L5 THE SEARCH, Version 2. The hour (spec V2 §6–§12): the opening film, chapter 1 THE TRACKS, chapter 2 THE WALLS,
   chapter 3 THE GROWING SQUARE, chapter 4 THE WAY HOME and the close. Every step saves her place (v 2).
   ?at=film|t1..t8|w1..w5|g1..g5|h1..h5|close jumps (the walker); ?name=Aoife gives Nuala the name; ?fast=1 shortens every wait; ?mins=47 starts the hour clock late. */
(function () {
  'use strict';
  var S = window.SearchStrings, Sc = window.SearchScene, Snd = window.SearchSound, S2 = window.Snd2, P = window.Pics, Py = window.Py, Box = window.Box, $ = U.$;
  var NAME = U.esc((U.Q.get('name') || '').trim()), panel = $('#panel'), lerp = U.lerp, smooth = U.smooth, JUMP = false;

  /* ================= the picture's state ================= */
  var V = { mode: 'black', snow: 0, frozen: false, buzz: 0, ft: 0, ftMax: 0, hill: 0, big: null, rise: 0, riseZ: 1, riseY: 480, msg: false };
  var LEVEL = [null, { cold: 0.55, shiver: 0.2 }, { cold: 0.72, shiver: 0.4 }, { cold: 0.85, shiver: 0.6 }, { cold: 0.85, shiver: 0.6 }];
  var L = { cold: 0.55, shiver: 0.2, bleat: 0, baa: 0 };
  function freshTrail() {
    var t = { lit: [], fill: [], flare: [], beep: { s: 0, torch: 0, mood: 0.6 }, nuala: 1, cam: { x: 500, y: 480, z: 1 }, camGoal: null, follow: false, drive: false,
      snowMul: 0.7, wind: 0.55, dark: 0, wool: 0, labelPrints: 0, litLabel: null, count: false, black: 0, ring: 0 };
    for (var j = 0; j <= 20; j++) { t.lit[j] = false; t.fill[j] = 0; t.flare[j] = 0; }
    return t;
  }
  var T = freshTrail(), DUST = 0.25;
  var F = P.FIELDS, WALLS = [4, 6, 3], ANG = [90, 60, 120], FOUND = [2, 3, -1];
  var PASS = ['4 rounds lit 4 walls. The drift by the top wall has no lamb in it.', '6 rounds lit 6 walls. The sheepfold has no lamb in it.', '3 rounds lit 3 walls. The field has no lamb in it.'];
  var M = { fields: [{}, {}, {}], done: [], ribbons: [], beep: { x: F[0].pts[0][0], y: F[0].pts[0][1], h: 0, torch: 1 }, labels: 0, count: null, bleat: 0, dark: 0, black: 0, ring: 0 };
  var LONG = [], LONGWON = false, LOOP = null, FIRSTFOR = [null, null, null], OFF1 = null;

  /* ================= drawing, every frame ================= */
  var msgCv = $('#msg .pic'), msgCx = msgCv.getContext('2d');
  U.scene = function (t, dt) {
    var c = Sc.ctx, e;
    if (!V.frozen) V.snow += dt;
    T.t = M.t = t; T.snowT = M.snowT = V.snow;
    if (V.mode === 'phone') P.phone(c, t, V.buzz);
    else if (V.mode === 'night') P.night(c, t);
    else if (V.mode === 'workshop') { V.ft = Math.min(V.ft + dt, V.ftMax); P.workshop(t, V.ft); }
    else if (V.mode === 'hill') P.hillShot(t, V.hill);
    else if (V.mode === 'trail') drawTrail(c, dt);
    else if (V.mode === 'rise') drawRise(c, dt);
    else if (V.mode === 'map') P.map(c, M);
    else if (V.mode === 'plan') { V.plan.t = t; V.plan.snowT = V.snow; P.plan(c, V.plan); }
    else if (V.mode === 'barn') P.barn(c, t, V.barnSt);
    else { e = Sc.edges(); c.fillStyle = '#000'; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t); }
    if (V.big) { L.t = t; P.lamb(c, V.big.x, V.big.y, V.big.w, V.big.h, L); }
    if (V.msg) drawMsg(t);
  };
  /* the unlit prints fill from print 20 down as the clock drains (spec 5.5, 7.3): worked out from the time left, not from frames */
  function fillAt(j, f) { return 1 - Math.pow(1 - f, 1 + 3 * (j - 1) / 19); }
  function drawTrail(c, dt) {
    var k = Math.min(1, dt * 2.5), g, p, j;
    if (T.drive && U.clock.on) {
      var f = U.clock.frac();
      for (j = 1; j <= 20; j++) if (!T.lit[j]) T.fill[j] = Math.max(T.fill[j], fillAt(j, f));
      T.dark = 0.45 * f; T.snowMul = 0.7 + 1.4 * f;
    }
    if (T.follow) { p = P.tpos(T.beep.s); g = { x: p.x, y: p.y - 60, z: 1.6 }; } else g = T.camGoal || { x: 500, y: 480, z: 1 };
    T.cam.x = lerp(T.cam.x, g.x, k); T.cam.y = lerp(T.cam.y, g.y, k); T.cam.z = lerp(T.cam.z, g.z, k);
    P.trail(c, T);
  }
  /* the camera rises (2 s): the trail falls away into a white of snow, and the map comes up out of it */
  function drawRise(c) {
    var k = V.rise, e = Sc.edges(), a;
    if (k < 0.5) { var u = smooth(k * 2); T.cam.z = lerp(V.riseZ, 0.55, u); T.cam.y = lerp(V.riseY, 300, u); P.trail(c, T); }
    else P.map(c, M);
    a = 0.92 * (k < 0.5 ? smooth(k * 2) : 1 - smooth((k - 0.5) * 2));
    c.fillStyle = 'rgba(214,220,240,' + a + ')'; c.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
  }
  function drawMsg(t) {
    var d = Math.min(2, window.devicePixelRatio || 1) * U.scale, W = Math.round(360 * d), H = Math.round(240 * d);
    if (msgCv.width !== W || msgCv.height !== H) { msgCv.width = W; msgCv.height = H; }
    msgCx.setTransform(d, 0, 0, d, 0, 0); Sc.photo(msgCx, 360, 240, t);
  }

  /* ================= sound starts on her first press ================= */
  var soundOn = false;
  function startSound() { if (soundOn) return; soundOn = true; Snd.start(); S2.start(); Snd.bedLevel(0.6, 2); Snd.setWind(0.55); }
  document.addEventListener('pointerdown', startSound, true); document.addEventListener('keydown', startSound, true);

  /* ================= small helpers ================= */
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  /* screens a pupil may read again: Back goes one screen back (spec 5.1) */
  async function pages(fns) { var i = 0; while (i < fns.length) { var r = await fns[i](i > 0); i = r === 'back' ? Math.max(0, i - 1) : i + 1; } }
  function meaning(rows) { return '<div class="meaning">' + rows.map(function (r) { return '<div class="code">' + U.code(r[0]) + '</div><div class="what">' + r[1] + '</div>'; }).join('') + '</div>'; }
  function bracket(lines, label) { return '<div class="bracket"><div class="lines">' + lines.map(function (l) { return '<div class="ln">' + U.code(l) + '</div>'; }).join('') + '</div><div class="br"></div><div class="bl">' + label + '</div></div>'; }
  function hideBtns() { $('.btns', panel).classList.add('hide'); }

  /* a task screen: the card, the box, Run, the line under the box (spec 5.3) */
  function task(o) {
    var scr = U.screen({ step: o.step, h: o.h, sub: o.sub, html: U.card(o.card, { label: o.label, sign: o.sign }) + (o.pre || '') + '<div class="slot"></div>', hold: true });
    var tk = { scr: scr, card: o.card, tries: o.tries || 0, help: o.help, waiting: null };
    tk.box = Box.make($('.slot', panel), { rows: o.rows || 3, readyAt: o.readyAt === undefined ? o.card.length : o.readyAt, onFirstKey: o.onFirstKey,
      onRun: function (lines) { [].forEach.call(tk.cardEl.querySelectorAll('.ln.ring'), function (l) { l.classList.remove('ring'); }); if (tk.waiting) { var w = tk.waiting; tk.waiting = null; w(lines); } else if (o.onRun) o.onRun(lines); else { tk.queued = lines; if (U.tourEnd) U.tourEnd(); } } });
    tk.cardEl = $('.card', panel);
    /* a Run clicked before the hour asks for one (during the tour) is kept, never lost */
    tk.next = function () { return new Promise(function (res) { if (tk.queued) { var q = tk.queued; tk.queued = null; res(q); } else tk.waiting = res; }); };
    if (tk.help && tk.tries >= 1) showHelp(tk);
    return tk;
  }
  function showHelp(tk) { var h = $('.sign.help', tk.cardEl); h.textContent = tk.help; h.classList.remove('hide'); }
  /* a wrong try: the line under the box names the fix; help after one, the card's differing lines ringed after two (spec 5.9) */
  function missed(tk, lines, msg, line) {
    S2.wrong(); tk.tries++;
    if (line != null) tk.box.mark(line);
    tk.box.under(msg, 'warn');
    if (tk.help && tk.tries >= 1) showHelp(tk);
    if (tk.tries >= 2 && !tk.noRing) ringDiff(tk, lines);
  }
  function ringDiff(tk, lines) {
    var her = Py.clean(lines);
    tk.card.forEach(function (c, i) {
      var re = new RegExp('^' + c.replace(/[.*+()[\]{}^$|\\]/g, '\\$&').replace('?', '\\d+') + '$');
      $('.ln[data-i="' + i + '"]', tk.cardEl).classList.toggle('ring', !re.test(her[i] || ''));
    });
  }
  async function runIt(box, trace, step, o) { var r = await box.run(trace, step, o); box.endRun(); box.lock(false); return r; }
  /* the short quiz on a summary screen: Next opens after the right answer */
  function quiz(o) {
    var scr = U.screen({ step: o.step, h: o.h, back: o.back, hold: true,
      html: (o.pre || '') + '<div class="opts">' + o.opts.map(function (op, i) { return '<button class="opt" data-i="' + i + '">' + U.code(op[0]) + '</button>'; }).join('') + '</div><p class="fb"></p>' });
    var fb = $('.fb', panel), solved = false;
    [].forEach.call(panel.querySelectorAll('.opt'), function (b) {
      b.onclick = function () {
        if (solved) return; var op = o.opts[+b.dataset.i];
        b.classList.add(op[2] ? 'right' : 'wrong'); fb.textContent = op[1];
        if (op[2]) { solved = true; b.blur(); /* so Enter now goes to Next */ S2.flare(); scr.showNext(U.nextDelay(U.words(op[1]))); } else S2.wrong();
      };
    });
    return scr.done;
  }

  /* ================= chapter 1: BEEP on the trail ================= */
  function ch(n) { U.strip(n, n === 1 ? [0] : [0, 1]); L.cold = LEVEL[n].cold; L.shiver = LEVEL[n].shiver; U.lamb(L); }
  function trailMode() { V.mode = 'trail'; Snd.rotor(0.3, 1); }
  function dust(a) { for (var j = 1; j <= 20; j++) if (!T.lit[j]) T.fill[j] = a; }
  function litTrail() { T = freshTrail(); for (var j = 1; j <= 20; j++) T.lit[j] = true; T.wool = 1; T.beep.s = 200; T.beep.torch = 1; }
  function litCount() { var n = 0; for (var j = 1; j <= 20; j++) if (T.lit[j]) n++; return n; }
  function showLit() { T.litLabel = T.count ? 'prints lit: ' + litCount() + ' of 20' : null; }
  function lightPrint(j) { T.lit[j] = true; T.fill[j] = 0; S2.flare(); U.tween(0.9, function (k) { T.flare[j] = 1 - k; }); showLit(); }
  function printHere() { var j = Math.round(T.beep.s / 10); return Math.abs(T.beep.s - 10 * j) < 0.01 && j >= 1 && j <= 20 ? j : 0; }
  /* forward(m): BEEP flies m metres up the trail; past the top wall it bumps the stones */
  function flyBy(m, dur) {
    var s0 = T.beep.s, want = s0 + m, s1 = Math.min(want, 205);
    var go = U.tween(dur, function (k) { T.beep.s = lerp(s0, s1, smooth(k)); });
    if (want <= 205) return go;
    return go.then(function () { S2.thud(); T.beep.mood = 0.3; return U.tween(0.35, function (k) { T.beep.jolt = Math.sin(k * Math.PI); }); }).then(function () { T.beep.jolt = 0; });
  }
  /* look(): the torch comes on; a print under BEEP that snow has not filled flares and stays lit */
  function look(dur) {
    var j = printHere();
    if (j && !T.lit[j] && T.fill[j] < 0.999) lightPrint(j);
    return U.tween(Math.max(0.2, dur), function (k) { T.beep.torch = k < 0.5 ? 1 : 1 - (k - 0.5) * 2; });
  }
  /* one step of a run in the box: a round clears the next print of snow (the rotors) and sounds its note */
  function trailStep(s, dur) {
    if (s.op === 'round') {
      S2.round(s.round, s.of);
      var j = Math.floor(T.beep.s / 10 + 1e-6) + 1, f0 = T.fill[j];
      if (j <= 20 && f0 > 0 && !T.lit[j]) U.tween(dur * 0.9, function (k) { T.fill[j] = f0 * (1 - k); });
      return null;
    }
    if (s.op === 'forward') return flyBy(s.v, dur * 0.85);
    if (s.op === 'look') return look(dur * 0.8);
  }
  function toGate(a) {
    var s0 = T.beep.s;
    return U.tween(1.0, function (k) { T.beep.s = lerp(s0, 0, smooth(k)); }).then(function () {
      for (var j = 1; j <= 20; j++) T.lit[j] = false; dust(a == null ? DUST : a); T.beep.mood = 0.6; showLit();
    });
  }

  /* ---------- §6 the bang: the opening film, every caption held until Next ---------- */
  async function film() {
    U.strip(1, [0]); U.lamb(null); U.panelOff();
    V.mode = 'phone'; V.buzz = 1;
    var rb = $('#readit'); rb.classList.remove('hide');
    await new Promise(function (res) { rb.onclick = res; });
    rb.classList.add('hide'); startSound(); Snd.buzz();
    await U.wait(0.6); V.buzz = 0;
    /* 2: her message, read on the card itself; the bar holds only Next */
    V.mode = 'night'; V.msg = true; $('#msg').classList.remove('hide');
    await U.film(null, { delay: U.nextDelay(16) });
    V.msg = false; $('#msg').classList.add('hide');
    /* 3 to 5: the Workshop, BEEP asleep, waking, lifting */
    V.mode = 'workshop'; V.ft = 0; V.ftMax = 8;
    var heard = {};
    U.every(function () {
      if (V.ft >= 9 && !heard.hum) { heard.hum = 1; Snd.hum(1.6); }
      if (V.ft >= 10.4 && !heard.wake) { heard.wake = 1; Snd.chirp('wake'); }
      if (V.ft >= 12.6 && !heard.rotor) { heard.rotor = 1; Snd.rotor(0.6, 1); }
      return V.mode === 'workshop';
    });
    await U.film("The Workshop's drone has been asleep all winter.");
    V.ft = Math.max(V.ft, 8.5); V.ftMax = 12.8;
    await U.film(null, { delay: 2 });
    V.ft = Math.max(V.ft, 12.8); V.ftMax = 16;
    await U.film("<b>BEEP:</b> I'll fly. You tell me where.");
    /* 6: dusk on the hill */
    V.mode = 'hill'; V.hill = 0; U.tween(6, function (k) { V.hill = k; }); Snd.setWind(0.6); Snd.rotor(0, 1);
    await U.film("It is getting dark on the hill. Nuala is down by the gate with her torch.");
    /* 7: the lamb, close; on Next she shrinks into her window, where she stays */
    T = freshTrail(); V.mode = 'trail';
    var e = Sc.edges(), full = { x: e.l, y: e.t, w: e.r - e.l, h: e.b - e.t }, win = { x: 773, y: 119, w: 214, h: 164 };
    L.cold = LEVEL[1].cold; L.shiver = LEVEL[1].shiver; V.big = { x: full.x, y: full.y, w: full.w, h: full.h };
    U.wait(0.8).then(function () { Snd.bleat(false, 0.8); U.tween(1.2, function (k) { L.bleat = Math.sin(k * Math.PI); }); });
    await U.film('Somewhere up the hill, the lamb is alone. Snow is landing on her nose.');
    await U.tween(0.9, function (k) { var u = smooth(k); ['x', 'y', 'w', 'h'].forEach(function (p) { V.big[p] = lerp(full[p], win[p], u); }); });
    V.big = null; U.lamb(L); Snd.rotor(0.3, 1); Snd.setWind(0.55);
  }

  /* ---------- 7.1 why ---------- */
  async function t1() {
    ch(1); trailMode(); T = freshTrail();
    await U.talk('NUALA', (NAME ? NAME + ', you' : 'You') + " fly BEEP. I'll follow its light up the hill.");
    U.tween(0.6, function (k) { T.labelPrints = k; });
    await U.talk('NUALA', 'Those are her hoof-prints, going up the hill.');
    U.tween(4, function (k) { dust(DUST * k); });
    await U.talk('BEEP', 'Snow is filling them. Soon her trail will be gone.', { mood: 0.35, chirp: 'sad' });
    U.tween(0.5, function (k) { T.labelPrints = 1 - k; });
  }

  /* ---------- 7.2 the first print ---------- */
  async function t2() {
    ch(1); trailMode(); if (JUMP) { T = freshTrail(); dust(DUST); }
    await pages([
      function () { return U.screen({ step: 'THE TRACKS · STEP 1 OF 6', h: 'Light up her trail before the snow fills it.', html: '<p>BEEP flies to each hoof-print and shines its torch on it. A lit print stays lit, so Nuala can follow the trail.</p>' }).done; },
      function (b) { return U.screen({ step: 'THE TRACKS · STEP 2 OF 6', h: 'Two instructions for BEEP.', back: b,
        html: meaning([['forward(10)', 'This makes BEEP fly forward 10 metres, to the next hoof-print.'], ['look()', "This switches on BEEP's torch. The print under BEEP lights up."]]) +
          '<p>These are Python instructions. BEEP follows them in order, top to bottom.</p>' }).done; }
    ]);
    var card = ['forward(10)', 'look()'];
    var tk = task({ step: 'THE TRACKS · STEP 2 OF 6', h: 'Type these 2 lines, then click Run.', card: card, rows: 3 });
    tk.box.ta.addEventListener('input', function () { if (U.tourEnd) U.tourEnd(); }, { once: true }); /* she has started: the tour gets out of her way */
    await U.tour([{ el: tk.cardEl, text: 'This card shows the lines to type.' }, { el: $('.boxwrap', panel), text: 'Type them in this box. Enter starts a new line.' }, { el: tk.box.runB, text: 'Click Run to send your lines to BEEP.' }]);
    tk.box.focus();
    for (;;) {
      var lines = await tk.next(), r = Py.read(lines, { known: ['forward', 'look'], loops: false, card: card });
      if (!r.ok) { missed(tk, lines, r.msg, r.line); continue; }
      tk.box.under('');
      await runIt(tk.box, Py.trace(r.prog), trailStep);
      var p = r.prog, ops = p.map(function (s) { return s.op + (s.v != null ? s.v : ''); }).join(' ');
      if (ops === 'forward10 look') break;
      var fw = p.filter(function (s) { return s.op === 'forward' && s.v !== 10; })[0], msg;
      if (p[0].op === 'look') msg = 'The torch came on before BEEP reached the print. Put forward(10) first. Then put look() under it.';
      else if (fw) msg = 'forward(' + fw.v + ') flew BEEP ' + fw.v + ' metres. BEEP ' + (fw.v > 10 ? 'went past' : 'did not reach') + ' print 1. The prints are 10 metres apart.';
      else if (!p.some(function (s) { return s.op === 'look'; })) msg = 'BEEP reached print 1, but the torch was off. Add look() on the next line.';
      else msg = 'Your lines did not match the card. Type the 2 lines on the card.';
      missed(tk, lines, msg + '\nBEEP flew back to the gate. Your lines are kept.');
      tk.box.lock(true); await U.wait(1.2); await toGate(); tk.box.lock(false); tk.box.focus();
    }
    tk.box.under('BEEP flew to print 1 and lit it. There are 19 prints still to light.', 'good'); tk.box.hideRun(); tk.box.lock(true);
    tk.scr.showNext(U.nextDelay(12)); await tk.scr.done;
  }

  /* ---------- 7.3 the long way: the timed beat ---------- */
  function sentHTML() {
    return '<div class="h">Sent to BEEP: ' + plural(LONG.length, 'line') + '</div><div class="list">' + LONG.map(function (l, i) { return '<div class="sl" data-i="' + i + '">' + U.code(l) + '</div>'; }).join('') + '</div>';
  }
  async function t3() {
    ch(1); trailMode(); T = freshTrail(); dust(DUST);
    T.lit[1] = true; T.fill[1] = 0; T.beep.s = 10; T.count = true; T.drive = true; showLit(); LONG = [];
    var card = ['forward(10)', 'look()'], q = [], busy = false, over = false, prev = 'look', cur = -1, done;
    var tk = task({ step: 'THE TRACKS · STEP 3 OF 6', h: 'Now light all 20 prints. Use the same 2 lines for each print.', sub: 'Type as many lines as you like, then click Run. Run as often as you like.',
      card: card, label: '2 lines for each print', rows: 3, readyAt: 0, pre: '<div class="sent hide"></div>', onFirstKey: function () { U.clock.start(); }, onRun: send });
    hideBtns();
    var sentEl = $('.sent', panel);
    U.clock.show('The snow fills the trail in', 55);
    tk.box.focus();
    var end = new Promise(function (res) { done = res; });
    U.clock.onEnd = function () { if (over) return; over = true; q.length = 0; tk.box.lock(true); done('fail'); };
    function send(lines) {
      if (over) return;
      var r = Py.read(lines, { known: ['forward', 'look'], loops: false, card: card });
      if (!r.ok) { tk.box.mark(r.line); tk.box.under(r.msg, 'warn'); S2.wrong(); return; }
      tk.box.under('');
      var at = {}, n = LONG.length;
      lines.forEach(function (l, i) { if (l.trim()) { at[i] = n++; LONG.push(l.replace(/\s+$/, '')); } });
      r.prog.forEach(function (st) { q.push({ op: st.op, v: st.v, i: at[st.line] }); });
      sentEl.innerHTML = sentHTML(); sentEl.classList.remove('hide'); lightSent(cur);
      var list = $('.list', sentEl); if (cur < 0) list.scrollTop = list.scrollHeight;
      tk.box.clear(); tk.box.focus();
      if (!busy) fly();
    }
    function lightSent(i) {
      var list = $('.list', sentEl); if (!list) return;
      [].forEach.call(list.querySelectorAll('.sl'), function (d) { d.classList.toggle('lit', +d.dataset.i === i); });
      var d = list.querySelector('.sl[data-i="' + i + '"]'); if (d) list.scrollTop = d.offsetTop - list.offsetTop - 25;
    }
    /* BEEP carries on from where it is, line by line, while she types the next ones */
    async function fly() {
      busy = true;
      while (q.length && !over) {
        var s = q.shift(); cur = s.i; lightSent(cur);
        await Promise.all([U.wait(0.45), longStep(s)]);
        if (!over && litCount() === 20) { over = true; U.clock.stop(); done('win'); }
      }
      cur = -1; lightSent(-1); busy = false;
    }
    function longStep(s) {
      if (s.op === 'forward') {
        var j = printHere(), m = null;
        if (prev === 'forward' && j && !T.lit[j]) m = 'BEEP passed print ' + j + ' with its torch off. Add look() after each forward(10).';
        if (s.v !== 10) m = 'forward(' + s.v + ') flew BEEP ' + s.v + ' metres. BEEP ' + (s.v > 10 ? 'went past' : 'did not reach') + ' the next print. The prints are 10 metres apart.';
        prev = 'forward'; if (m) tk.box.under(m, 'warn');
        return flyBy(s.v, 0.38);
      }
      var k = printHere(); prev = 'look';
      if (!k || T.lit[k]) tk.box.under('The torch came on before BEEP reached the next print. Put forward(10) first. Then put look() under it.', 'warn');
      else if (T.fill[k] >= 0.999) tk.box.under('Snow had filled print ' + k + ' before BEEP got there.', 'warn');
      return look(0.3);
    }
    var res = await end; tk.box.lock(true);
    return res;
  }

  /* ---------- 7.4 the fail and the wind-back ---------- */
  function sentPanel() { U.screen({ step: 'THE TRACKS · STEP 3 OF 6', html: '<div class="sent faded">' + sentHTML() + '</div>', hold: true }); hideBtns(); }
  async function t4(res) {
    ch(1); trailMode();
    if (!res) { /* jumped here: a pupil part-way up the trail */
      T = freshTrail(); dust(DUST); T.count = true; for (var j = 1; j <= 8; j++) { T.lit[j] = true; T.fill[j] = 0; } T.beep.s = 80; showLit();
      if (!LONG.length) for (j = 0; j < 8; j++) LONG.push('forward(10)', 'look()');
    }
    if (res === 'win') {
      LONGWON = true;
      var scr = U.screen({ step: 'THE TRACKS · STEP 3 OF 6', h: 'You typed all ' + LONG.length + ' lines in time. The trail is lit.', html: '<p>Most people cannot type that fast. Click Watch to see what happens when someone is too slow.</p>', next: 'Watch' });
      U.clock.hide(); await scr.done;
      for (j = 11; j <= 20; j++) { T.lit[j] = false; T.fill[j] = 0.3; } T.beep.s = 100; showLit();
    }
    if (res !== 'fail') {
      sentPanel(); var f0 = T.fill.slice(), d0 = T.dark, m0 = T.snowMul;
      await U.tween(2.4, function (k) { for (var i = 1; i <= 20; i++) if (!T.lit[i]) T.fill[i] = lerp(f0[i], 1, k); T.dark = lerp(d0, 0.45, k); T.snowMul = lerp(m0, 2.1, k); });
    }
    await trailFail();
  }
  async function trailFail() {
    var b = T.beep;
    U.clock.stop(); T.drive = false; sentPanel();
    b.torch = 1; b.mood = 0.25;
    await U.tween(1.8, function (k) { b.sweep = Math.sin(k * Math.PI * 2) * 0.9; });
    b.sweep = 0;
    await U.tween(1.0, function (k) { b.flicker = k; });
    b.torch = 0; b.flicker = 0; b.mood = 0.1; Snd.setWind(1); Snd.rotor(0, 0.5);
    U.tween(0.8, function (k) { L.cold = lerp(LEVEL[1].cold, 0.92, k); L.shiver = lerp(LEVEL[1].shiver, 0.9, k); });
    await U.tween(0.8, function (k) { T.black = k; });
    U.clock.hide();
    await U.wait(2);
    U.tween(0.8, function (k) { T.ring = k; });
    await U.talk('BEEP', "The snow covered her trail. I can't see the prints.", { mood: 0.1, chirp: 'sad' });
    await U.talk('BEEP', "Wait. I can go back to before the snow covered the lamb's trail.", { mood: 0.5, chirp: 'think' });
    sentPanel(); Snd.rewind(2.5); Snd.setWind(0.55);
    var s0 = b.s, f0 = T.fill.slice(), d0 = T.dark, m0 = T.snowMul, c0 = L.cold, v0 = L.shiver, gone = false;
    U.tween(0.7, function (k) { T.black = 1 - k; T.ring = 1 - k; });
    await U.tween(2.5, function (k) {
      var e = smooth(k); b.s = lerp(s0, 0, e); T.dark = lerp(d0, 0, e); T.snowMul = lerp(m0, 0.7, e); L.cold = lerp(c0, LEVEL[1].cold, e); L.shiver = lerp(v0, LEVEL[1].shiver, e);
      for (var j = 1; j <= 20; j++) T.fill[j] = lerp(f0[j], DUST, e);
      if (k > 0.5 && !gone) { gone = true; for (j = 1; j <= 20; j++) T.lit[j] = false; T.count = false; showLit(); }
    });
    b.mood = 0.6; Snd.rotor(0.3, 1);
    await U.talk('BEEP', 'Typing 2 lines for every print is too slow. The snow wins.', { mood: 0.4 });
    await U.talk('NUALA', 'There has to be a quicker way.');
  }

  /* ---------- 7.5 the idea, before she types it (the snow hangs) ---------- */
  async function t5() {
    ch(1); trailMode(); if (JUMP) { T = freshTrail(); dust(DUST); }
    var clap = '<img src="img/clap.svg" alt="">';
    await pages([
      function () { V.frozen = true; return U.talk('BEEP', 'I will show you a quicker way. The snow will not cover the trail while I show you.'); },
      function (b) { return U.screen({ step: 'THE TRACKS · STEP 4 OF 6', h: 'A loop does the same job many times.', back: b,
        html: '<p>You write the job once. Then you say how many times to do it.</p><p>It is like saying "clap 3 times" instead of "clap, clap, clap".</p>' +
          '<div class="claps"><div class="row">' + clap + clap + clap + '<span class="or">clap, clap, clap</span></div><div class="row">' + clap + '<span>× 3</span><span class="or">clap 3 times</span></div></div>' }).done; },
      function (b) { return U.screen({ step: 'THE TRACKS · STEP 4 OF 6', h: 'Here the job is 2 lines. BEEP must do it 20 times.', back: b,
        html: bracket(['forward(10)', 'look()'], 'the job<br><span class="x">× 20, once for each print</span>') + '<p>The long way is what you did before. You typed the job again for every print.</p>' }).done; },
      function (b) { return U.screen({ step: 'THE TRACKS · STEP 4 OF 6', h: 'This is a loop in Python. It is called a <b class="py">for</b> loop.', back: b,
        html: '<div class="loopfig"><div class="forln">' + U.code('for i in range(20):').replace('</span> i ', '</span> <span class="pin">i<span class="tag t1">counts each time<br>the job is done</span></span> ').replace(/:$/, '<span class="pin">:<span class="tag t2">the job comes next</span></span>') + '</div>' +
          '<div class="lab1">This line starts a loop that does the job 20 times.</div></div>' + bracket(['    forward(10)', '    look()'], 'The job: BEEP does these 2 lines each time round.') +
          '<p>The 4 dots are 4 spaces. The box puts them in for you.</p>' }).done; }
    ]);
  }

  /* ---------- 7.6 her loop, and 7.7 the run ---------- */
  function judge76(p) {
    var lp = p.filter(function (s) { return s.type === 'for'; })[0];
    if (lp && p.length === 1 && lp.body.length === 2 && lp.body[0].op === 'forward' && lp.body[0].v === 10 && lp.body[1].op === 'look') {
      if (lp.n === 20) return null;
      return 'range(' + lp.n + ') did the job ' + plural(lp.n, 'time') + '. There are ' + (lp.n < 20 ? '' : 'only ') + '20 prints.';
    }
    if (lp && p.length === 2 && lp.body.length === 1 && lp.body[0].op === 'forward' && p[1].op === 'look') return 'look() had no spaces in front of it, so it was not part of the job. It ran once, at the end.';
    if (!lp && litCount() === 20) return 'Your lines lit the prints, but not with a loop. Type the 3 lines on the card.';
    return 'Your lines ran, but they did not light all 20 prints. Check them against the card.';
  }
  async function t6(auto) {
    ch(1); trailMode(); V.frozen = true; T = freshTrail(); dust(0.35); T.count = true; showLit();
    var card = ['for i in range(20):', '    forward(10)', '    look()'], lines, r;
    var tk = task({ step: 'THE TRACKS · STEP 5 OF 6', h: 'Type these 3 lines, then click Run.', card: card, rows: 4 });
    if (auto) tk.box.set(card.join('\n'));
    tk.box.focus();
    for (;;) {
      if (auto) { auto = false; await U.wait(0.8); lines = tk.box.lines(); } else lines = await tk.next();
      r = Py.read(lines, { known: ['forward', 'look'], loops: true, card: card });
      if (!r.ok) { missed(tk, lines, r.msg, r.line); continue; }
      tk.box.under(''); V.frozen = false; T.follow = true; Snd.rotor(0.7, 0.5);
      await runIt(tk.box, Py.trace(r.prog), trailStep);
      var msg = judge76(r.prog);
      if (!msg) break;
      missed(tk, lines, msg + '\nBEEP flew back to the gate. Your lines are kept.');
      tk.box.lock(true); await U.wait(1.2); T.follow = false; Snd.rotor(0.3, 1); await toGate(0.35); V.frozen = true; tk.box.lock(false); tk.box.focus();
    }
    LOOP = Py.clean(lines);
    /* 7.7: at print 20 the trail meets the wall; the torch finds wool in the stones */
    var top = P.tpos(205); T.follow = false; T.camGoal = { x: top.x, y: top.y + 30, z: 1.9 }; Snd.rotor(0.3, 1);
    tk.box.under('range(20) did the job 20 times. All 20 prints are lit.', 'good'); tk.box.hideRun(); tk.box.lock(true);
    T.beep.torch = 1; await U.wait(0.6);
    S2.chord(); U.tween(1.4, function (k) { T.wool = k; });
    tk.scr.showNext(U.nextDelay(11)); await tk.scr.done;
    await U.talk('BEEP', 'Wool is caught on the wall! The lamb went over the wall, into the fields.');
    await U.talk('NUALA', 'You flew well. Hurry, before the snow hides her again.');
  }

  /* ---------- 7.8 what you did ---------- */
  async function t8() {
    ch(1); trailMode(); if (JUMP) litTrail(); T.camGoal = null; T.count = false; showLit();
    if (!LOOP) LOOP = ['for i in range(20):', '    forward(10)', '    look()'];
    var long = LONG.length ? LONG : (function () { var a = []; for (var i = 0; i < 20; i++) a.push('forward(10)', 'look()'); return a; })(); /* she sent none: the 40 lines the long way needs */
    var mine = '<div class="mine"><span class="cap">Your loop: 3 lines</span>' + LOOP.map(U.code).join('\n') + '</div>';
    await pages([
      function () { return U.screen({ step: 'THE TRACKS · STEP 6 OF 6', h: 'Here is what you just did.',
        html: '<div class="cmp"><div class="long"><span class="cap">The long way: ' + long.length + ' lines</span>' + long.map(function (l) { return '<div>' + U.esc(l) + '</div>'; }).join('') + '</div>' + mine + '</div>' +
          '<p>' + (LONGWON ? 'The long way needed 40 lines. You typed them all in time, but most people cannot.' : 'The long way needs 40 lines to light all 20 prints. The snow covered the trail before you had typed all 40.') + '</p><p>Your loop did the same job in 3 lines.</p><p>range(20) said how many times, so BEEP did the job 20 times.</p>' }).done; },
      function (b) { return quiz({ step: 'THE TRACKS · STEP 6 OF 6', h: 'Another trail has 12 prints. Which first line lights them all?', back: b, pre: '<div class="cmp">' + mine + '</div>',
        opts: shuffle([['for i in range(12):', 'Yes. range(12) does the job 12 times.', true], ['for i in range(20):', 'That does the job 20 times. This trail has 12 prints.'], ['forward(12)', 'That flies 12 metres, once. A loop needs for and range.']]) }); }
    ]);
  }

  /* ================= chapter 2: the map, the walls ================= */
  function mapMode() { V.mode = 'map'; V.frozen = false; Snd.rotor(0.3, 1); if (JUMP) M.labels = 1; }
  function focusField(fi) { M.fields.forEach(function (f, i) { f.on = i === fi; f.dim = fi >= 0 && i > fi; }); }
  function placeBeep(fi) { var p = F[fi].pts[0]; M.beep.x = p[0]; M.beep.y = p[1]; M.beep.h = 0; }
  function litFields(k) {
    for (var f = 0; f < k; f++) if (!M.done[f]) {
      M.done[f] = true; var pts = F[f].pts;
      pts.forEach(function (a, i) { var b = pts[(i + 1) % pts.length]; M.ribbons.push({ x0: a[0], y0: a[1], x1: b[0], y1: b[1], u: 1, wall: true }); });
      if (!FIRSTFOR[f]) FIRSTFOR[f] = 'for i in range(' + WALLS[f] + '):';
    }
  }
  function normH(h) { var t = Math.PI * 2; return ((h % t) + t * 1.5) % t - Math.PI; }
  function flyToCorner(fi) {
    var b = M.beep, x0 = b.x, y0 = b.y, h0 = normH(b.h), p = F[fi].pts[0];
    Snd.rotor(0.6, 0.4);
    return U.tween(1.4, function (k) { var e = smooth(k); b.x = lerp(x0, p[0], e); b.y = lerp(y0, p[1], e); b.h = lerp(h0, 0, e); }).then(function () { Snd.rotor(0.3, 1); });
  }
  function near(p, x, y) { return Math.abs(p[0] - x) < 12 && Math.abs(p[1] - y) < 12; }
  function wallAt(fi, x0, y0, x1, y1) {
    var pts = F[fi].pts, n = pts.length;
    for (var i = 0; i < n; i++) { var a = pts[i], b = pts[(i + 1) % n]; if ((near(a, x0, y0) && near(b, x1, y1)) || (near(b, x0, y0) && near(a, x1, y1))) return i; }
    return -1;
  }
  /* one step of a run on the map: forward(m) lays a ribbon of light m * 1.8 px long (a wall is 100 m); left and right turn BEEP on the spot */
  function mapStep(s, dur, st) {
    var b = M.beep;
    if (s.op === 'round') { S2.round(s.round, s.of); return null; }
    if (s.op === 'forward') {
      var x0 = b.x, y0 = b.y, len = s.v * 1.8, x1 = x0 + Math.cos(b.h) * len, y1 = y0 - Math.sin(b.h) * len, wi = wallAt(st.fi, x0, y0, x1, y1);
      var rb = { x0: x0, y0: y0, x1: x1, y1: y1, u: 0, wall: wi > -1 }; M.ribbons.push(rb);
      return U.tween(dur * 0.85, function (k) { rb.u = k; b.x = lerp(x0, x1, k); b.y = lerp(y0, y1, k); }).then(function () {
        if (wi < 0) return;
        if (!st.lit[wi]) { st.lit[wi] = true; st.litN++; S2.flare(); }
        M.count = 'walls lit: ' + st.litN; /* no total: counting the walls is her job */
      });
    }
    var h0 = b.h, h1 = h0 + (s.op === 'left' ? 1 : -1) * s.v * Math.PI / 180;
    return U.tween(dur * 0.7, function (k) { b.h = lerp(h0, h1, smooth(k)); });
  }
  async function mapRun(tk, prog, fi) {
    var st = { fi: fi, lit: [], litN: 0, rib: M.ribbons.length };
    placeBeep(fi); Snd.rotor(0.6, 0.5);
    await runIt(tk.box, Py.trace(prog), function (s, dur) { return mapStep(s, dur, st); });
    Snd.rotor(0.3, 1);
    return st;
  }
  function mapReset(fi, st) {
    var rbs = M.ribbons.slice(st.rib), b = M.beep, x0 = b.x, y0 = b.y, h0 = normH(b.h), p = F[fi].pts[0];
    M.count = 'walls lit: 0';
    return U.tween(1.0, function (k) {
      var e = smooth(k); rbs.forEach(function (r) { r.u = 1 - Math.min(1, k * 2); });
      b.x = lerp(x0, p[0], e); b.y = lerp(y0, p[1], e); b.h = lerp(h0, 0, e);
    }).then(function () { M.ribbons.splice(st.rib); });
  }
  var FALLBACK = 'Your lines ran, but they did not light every wall. Check them against the card.';
  function judgeMap(p, st, fi) {
    var W = WALLS[fi], A = ANG[fi], all = [], lp = null;
    p.forEach(function (s) { if (s.type === 'for') { lp = lp || s; all = all.concat(s.body); } else all.push(s); });
    var rt = all.filter(function (s) { return s.op === 'right'; })[0];
    if (rt) return { msg: 'right(' + rt.v + ') turned BEEP away from the field. Turn left, as the card shows.' };
    if (!lp) return { msg: FALLBACK };
    var body = lp.body, bt = body.filter(function (s) { return s.op === 'left'; })[0], fw = body.filter(function (s) { return s.op === 'forward'; })[0];
    var top = p.filter(function (s) { return s.type === 'cmd' && s.op === 'left'; })[0];
    if (!bt && top) return { msg: 'left(' + top.v + ') had no spaces in front of it, so it was not part of the job. It ran once, at the end.' };
    if (!bt) return { msg: 'With no turn, BEEP flew straight on. Add left(' + A + ').' };
    if (!fw || fw.v !== 100) return { msg: 'Each wall is 100 metres long. Use forward(100).' };
    if (bt.v !== A) return { msg: 'left(' + bt.v + ') is not the turn at these corners. Use left(' + A + '), as the card shows.' };
    if (p.length !== 1 || body.length !== 2 || body[0].op !== 'forward') return { msg: FALLBACK };
    var n = lp.n, off = { n: n, w: W };
    if (n === W && st.litN === W) return { pass: true };
    if (n < W) return { off: off, msg: plural(n, 'round') + ' lit ' + plural(n, 'wall') + '. ' + (fi ? 'Count the ' + (fi === 1 ? "fold's" : "field's") + ' walls again.' : n === W - 1 ? 'One wall is still dark. Count again.' : 'This field has more walls than that.') };
    var x = n - W;
    return { off: off, msg: plural(n, 'round') + ', but only ' + W + ' walls. BEEP flew ' + (x === 1 ? 'the first wall twice.' : x < W ? 'the first ' + x + ' walls twice.' : 'round the field more than once.') };
  }
  /* one field's task; o.clock = [words, seconds] makes it the timed beat. Gives back {pass, tk} or {fail, text, tries} */
  async function fieldTask(o) {
    var fi = o.fi, W = WALLS[fi], card = ['for i in range(?):', '    forward(100)', '    left(' + ANG[fi] + ')'], failed, drive = null, lines, r;
    var failP = new Promise(function (res) { failed = res; });
    focusField(fi); placeBeep(fi); M.count = 'walls lit: 0';
    var tk = task({ step: o.step, h: o.h, sub: o.sub, card: card, sign: o.sign, help: o.help, tries: o.tries, rows: 3, onFirstKey: o.clock ? function () { U.clock.start(); } : null });
    if (o.keep) tk.box.set(o.keep);
    if (o.clock) {
      U.clock.show(o.clock[0], o.clock[1]); U.clock.onEnd = function () { failed('fail'); };
      drive = { on: true }; U.every(function () { if (!drive.on) return false; M.fields[fi].cover = Math.max(M.fields[fi].cover || 0, U.clock.frac()); });
    }
    tk.box.focus();
    for (;;) {
      lines = await Promise.race([tk.next(), failP]);
      if (lines === 'fail') { drive.on = false; tk.box.lock(true); return { fail: true, text: tk.box.lines().join('\n'), tries: tk.tries }; }
      r = Py.read(lines, { known: ['forward', 'left', 'right'], loops: true, card: card });
      if (!r.ok) { missed(tk, lines, r.msg, r.line); continue; }
      tk.box.under(''); if (o.clock) U.clock.stop();
      var st = await mapRun(tk, r.prog, fi), j = judgeMap(r.prog, st, fi);
      if (j.pass) break;
      if (j.off && !OFF1) OFF1 = j.off;
      missed(tk, lines, j.msg + '\nBEEP flew back to the corner. Your lines are kept.');
      tk.box.lock(true); await U.wait(1.2); await mapReset(fi, st); tk.box.lock(false); tk.box.focus();
      if (o.clock) U.clock.start();
    }
    if (drive) drive.on = false; U.clock.hide();
    FIRSTFOR[fi] = Py.clean(lines)[0]; M.done[fi] = true; M.fields[fi].on = false;
    tk.box.under(PASS[fi], 'good'); tk.box.hideRun(); tk.box.lock(true);
    if (FOUND[fi] > -1) { M.fields[fi].found = FOUND[fi]; U.tween(1.2, function (k) { M.fields[fi].foundA = 0.5 + 0.5 * Math.sin(k * Math.PI); }); }
    return { pass: true, tk: tk };
  }
  /* the fold's fail, honest, then the wind-back (spec 8.3, 5.8) */
  async function mapFail(fi) {
    var fs = M.fields[fi], b = M.beep, c0 = fs.cover || 0, p = F[fi].pts[0];
    U.clock.stop();
    await U.tween(1.0, function (k) { fs.cover = lerp(c0, 1, k); });
    await U.tween(1.0, function (k) { b.torch = k < 0.85 ? (Math.floor(k * 14) % 2 ? 0.2 : 1) : 0; });
    b.torch = 0; Snd.setWind(1); Snd.rotor(0, 0.5);
    U.tween(0.8, function (k) { L.cold = lerp(LEVEL[2].cold, 0.95, k); L.shiver = lerp(LEVEL[2].shiver, 0.95, k); });
    await U.tween(0.8, function (k) { M.black = k; });
    U.clock.hide();
    await U.wait(2);
    U.tween(0.8, function (k) { M.ring = k; });
    await U.talk('BEEP', 'The drifts covered the walls. Wait. I can go back to before the drifts came.', { mood: 0.2, chirp: 'sad' });
    U.panelOff(); Snd.rewind(2.5); Snd.setWind(0.55);
    var x0 = b.x, y0 = b.y, h0 = normH(b.h);
    U.tween(0.7, function (k) { M.black = 1 - k; M.ring = 1 - k; });
    await U.tween(2.5, function (k) {
      var e = smooth(k); fs.cover = lerp(1, 0, e); L.cold = lerp(0.95, LEVEL[2].cold, e); L.shiver = lerp(0.95, LEVEL[2].shiver, e);
      b.x = lerp(x0, p[0], e); b.y = lerp(y0, p[1], e); b.h = lerp(h0, 0, e);
    });
    b.torch = 1; Snd.rotor(0.3, 1);
    await U.screen({ step: 'THE WALLS · STEP 3 OF 5', h: 'The story winds back. Your lines are kept.', next: 'Try again' }).done;
  }

  /* ---------- 8.1 why: two real photos, then talk, then the camera rises ---------- */
  function photo(src, credit) { var ph = $('#photo'); $('img', ph).src = src; $('.credit', ph).textContent = credit; ph.classList.remove('hide'); }
  async function w1() {
    ch(2); U.lamb(null); V.mode = 'night'; Snd.rotor(0, 1);
    photo('img/b.jpg', '"Drystone walls near Bryansford" © Albert Bridge, CC BY-SA 2.0, via Wikimedia Commons');
    await U.screen({ step: 'THE WALLS · STEP 1 OF 5', html: '<p class="big">On hills like these, the fields have stone walls round them.</p>' }).done;
    photo('img/c.jpg', '"Sheltering sheep" © Helen Wilkinson, CC BY-SA 2.0, via Wikimedia Commons');
    await U.screen({ step: 'THE WALLS · STEP 1 OF 5', html: '<p class="big">In a snowstorm, sheep shelter against stone walls.</p><p class="big">The wind piles snow against the walls too. That pile is called a drift.</p><p class="big">In March 2013, drifts buried thousands of sheep in Northern Ireland.</p>' }).done;
    $('#photo').classList.add('hide');
    litTrail(); var top = P.tpos(205); T.camGoal = { x: top.x, y: top.y + 30, z: 1.9 }; T.cam = { x: top.x, y: top.y + 30, z: 1.9 };
    trailMode(); U.lamb(L);
    await U.talk('NUALA', 'The lamb will be sheltering against a wall somewhere. Check every wall.');
    await U.talk('BEEP', "I'll fly up high and look down, like a map.");
    U.panelOff();
    V.riseZ = T.cam.z; V.riseY = T.cam.y; V.rise = 0; V.mode = 'rise'; Snd.rotor(0.7, 0.5);
    await U.tween(2, function (k) { V.rise = k; });
    V.mode = 'map'; Snd.rotor(0.3, 1); focusField(-1);
    await U.tween(0.8, function (k) { M.labels = k; });
  }

  /* ---------- 8.2 the square field ---------- */
  var TURNFIG = '<div class="turnfig"><svg width="112" height="104" viewBox="0 0 112 104"><path d="M10 92 H100 V10" fill="none" stroke="#8d93ad" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M52 76 Q84 76 84 46" fill="none" stroke="#e9c46a" stroke-width="4"/><path d="M77 54 L84 42 L91 54" fill="none" stroke="#e9c46a" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle cx="42" cy="76" r="9" fill="#ece8dc" stroke="#e9c46a" stroke-width="3"/></svg><span>90 is a square corner</span></div>';
  async function w2() {
    ch(2); mapMode(); focusField(-1);
    await pages([
      function () { return U.screen({ step: 'THE WALLS · STEP 1 OF 5', h: 'Light every wall of each field.', html: '<p>BEEP flies along each wall with its torch on. The whole wall lights up. If the lamb is by a wall, the light finds her.</p>' }).done; },
      function (b) { focusField(-1); return U.screen({ step: 'THE WALLS · STEP 2 OF 5', h: 'One new instruction: left(90).', back: b,
        html: meaning([['forward(100)', 'This makes BEEP fly 100 metres along a wall. You do not need look() here. BEEP\'s torch is already on, so the wall lights up.'], ['left(90)', 'This turns BEEP left, a quarter turn, to face along the next wall.' + TURNFIG]]) }).done; }
    ]);
    var res = await fieldTask({ fi: 0, step: 'THE WALLS · STEP 2 OF 5', h: 'Count the walls round this field. Put that number where the ? is.', sub: 'Then type the 3 lines and click Run.', help: 'Count each straight wall, all the way round.' });
    res.tk.scr.showNext(U.nextDelay(14)); await res.tk.scr.done;
    await U.talk('BEEP', "She's not in this field.", { mood: 0.4 });
  }

  /* ---------- 8.3 the sheepfold: the timed beat ---------- */
  async function w3() {
    ch(2); mapMode(); litFields(1); focusField(1);
    await U.talk('BEEP', 'The old sheepfold is next. A sheepfold is a stone pen for sheep. The drifts there are growing fast.');
    U.panelOff(); await flyToCorner(1);
    var keep = '', tries = 0, res;
    for (;;) {
      res = await fieldTask({ fi: 1, step: 'THE WALLS · STEP 3 OF 5', h: 'Count the walls of the fold, put in the number, then click Run.', sub: 'A sheepfold is a stone pen for sheep.',
        sign: 'At each corner, turn left(60).', help: 'Count the walls one by one, going round.', clock: ['The drifts bury the fold in', 45], keep: keep, tries: tries });
      if (res.pass) break;
      keep = res.text; tries = res.tries; await mapFail(1);
    }
    res.tk.scr.showNext(U.nextDelay(8)); await res.tk.scr.done;
  }

  /* ---------- 8.4 the three-cornered field, then the bleat ---------- */
  async function w4() {
    ch(2); mapMode(); litFields(2); focusField(2);
    U.panelOff(); await flyToCorner(2);
    var res = await fieldTask({ fi: 2, step: 'THE WALLS · STEP 4 OF 5', h: 'The last field. Count the walls, put in the number, then click Run.', sign: 'At each corner, turn left(120).', help: 'Count the walls one by one, going round.' });
    await U.wait(1.6);
    Snd.bleat(false, 1);
    U.tween(1.8, function (k) { L.bleat = Math.sin(k * Math.PI); L.baa = k < 1 ? k : 0; }).then(function () { L.bleat = 0; L.baa = 0; });
    await U.tween(0.8, function (k) { M.bleat = k; });
    res.tk.scr.showNext(U.nextDelay(8)); await res.tk.scr.done;
    await U.talk('BEEP', 'That bleat came from the open hill, above the fields!', { mood: 0.9 });
    await U.talk('NUALA', "She's alive! Go, BEEP. Go!");
  }

  /* ---------- 8.5 what you did ---------- */
  async function w5() {
    ch(2); mapMode(); litFields(3); focusField(-1); M.bleat = 1; M.count = null;
    var names = ['the square field', 'the sheepfold', 'the three-cornered field'];
    var ff = FIRSTFOR.map(function (l, i) { return U.code(l || 'for i in range(' + WALLS[i] + '):').replace('<span class="num">', '<span class="num ringn">') + '   <span class="fl">' + names[i] + '</span>'; });
    var off = OFF1 || { n: 3, w: 4 }, d = off.n - off.w;
    /* her own off-by-one run if she had one; if she never did, the square field as a "what if", never told as hers */
    var offLine = OFF1 ? '<span class="code">' + U.code('range(' + off.n + ')') + '</span> for ' + off.w + ' walls: ' +
      (d < 0 ? (d === -1 ? 'one wall stayed dark.' : plural(-d, 'wall') + ' stayed dark.') : d === 1 ? 'BEEP flew the first wall twice.' : 'BEEP flew some walls twice.')
      : 'If the square field had <span class="code">' + U.code('range(3)') + '</span>, one of its 4 walls would stay dark.';
    await pages([
      function () { return U.screen({ step: 'THE WALLS · STEP 5 OF 5', h: 'Here is what you just did.', html: '<div class="cmp"><div class="mine">' + ff.join('\n') + '</div></div>' +
        '<p>You counted the walls: 4, 6 and 3.</p><p>The number in range( ) told BEEP how many times to do the job.</p><p>Each time round, BEEP lit one wall and turned.</p>' }).done; },
      function (b) { return quiz({ step: 'THE WALLS · STEP 5 OF 5', h: 'A count that is one too few or one too many has a name: off by one.', back: b,
        pre: '<p>' + offLine + '</p><p>A field has 5 walls. Which first line lights them all?</p>',
        opts: shuffle([['for i in range(5):', 'Yes. 5 walls need 5 rounds.', true], ['for i in range(4):', 'One too few. One wall stays dark: off by one.'], ['for i in range(6):', 'One too many. BEEP flies the first wall twice: off by one.']]) }); }
    ]);
  }

  /* ================= chapter 3: THE GROWING SQUARE (spec V2 §9). The open hill from above: 4 px a metre, the bleat's spot at (540, 470) ================= */
  var HX = 540, HY = 470, PXM = 4, LAMB = [40, 40];
  function freshHill() { return { kind: 'hill', ribbons: [], beep: { x: HX, y: HY, h: 0, torch: 1 }, lamb: { x: HX + PXM * LAMB[0], y: HY - PXM * LAMB[1], a: 1, found: 0 }, ring0: 0, count: null, baa: 0, fade: 0, dark: 0, black: 0, ring: 0, say: null }; }
  var H3 = freshHill(), H3MINE = null;
  function planMode(st) { V.plan = st; V.mode = 'plan'; V.frozen = false; Snd.rotor(0.3, 1); }
  function sayStep(box, s, dur) {
    if (s.op === 'round') { S2.round(s.round, s.of); H3.say = null; return null; }
    if (s.op === 'say') { box.chip(s.line, 'i is ' + s.i); H3.say = String(s.v); Snd.chirp(); return U.wait(Math.min(0.5, dur)); }
    return null;
  }
  /* distance in metres from her to a flown arm */
  function segDist(ax, ay, bx, by, px, py) { var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, u = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return Math.hypot(ax + u * dx - px, ay + u * dy - py); }
  function hillStep(box, s, dur, st) {
    if (s.op === 'round') { S2.round(s.round, s.of); H3.count = 'round ' + s.round; return null; }
    if (s.op === 'forward') {
      if (s.src) box.chip(s.line, 'i is ' + s.i + ' → forward(' + s.v + ')');
      var x1 = st.x + Math.cos(st.h) * s.v, y1 = st.y + Math.sin(st.h) * s.v, b = H3.beep;
      var rb = { x0: HX + PXM * st.x, y0: HY - PXM * st.y, x1: HX + PXM * x1, y1: HY - PXM * y1, u: 0 }; H3.ribbons.push(rb);
      var hit = !st.found && segDist(st.x, st.y, x1, y1, LAMB[0], LAMB[1]) <= 12;
      st.x = x1; st.y = y1; if (hit) st.found = s.round;
      return U.tween(dur * 0.85, function (k) { rb.u = k; b.x = lerp(rb.x0, rb.x1, k); b.y = lerp(rb.y0, rb.y1, k); }).then(function () {
        if (hit) { S2.flare(); U.tween(0.8, function (k) { H3.lamb.found = k; }); }
      });
    }
    if (s.op === 'left' || s.op === 'right') {
      var h0 = H3.beep.h, d = (s.op === 'left' ? 1 : -1) * s.v * Math.PI / 180; st.h += d;
      return U.tween(dur * 0.6, function (k) { H3.beep.h = lerp(h0, h0 + d, smooth(k)); });
    }
    return null;
  }
  function hillReset(st) {
    var rbs = H3.ribbons.slice(), b = H3.beep, x0 = b.x, y0 = b.y, h0 = normH(b.h);
    H3.count = null; H3.lamb.found = 0;
    return U.tween(1.0, function (k) { var e = smooth(k); rbs.forEach(function (r) { r.u = 1 - e; }); b.x = lerp(x0, HX, e); b.y = lerp(y0, HY, e); b.h = lerp(h0, 0, e); }).then(function () { H3.ribbons = []; });
  }
  /* the arms of the right square, drawn with their metres (9.1's fact card picture, 9.3's idea screen, 9.5's summary) */
  function drawSquare(n, labels, dur) {
    H3.ribbons = []; var x = 0, y = 0, h = 0, rbs = [];
    for (var r = 0; r < n; r++) {
      var m = r * 10, x1 = x + Math.cos(h) * m, y1 = y + Math.sin(h) * m;
      if (m) rbs.push({ x0: HX + PXM * x, y0: HY - PXM * y, x1: HX + PXM * x1, y1: HY - PXM * y1, u: dur ? 0 : 1, label: labels ? m + ' m' : null, lx: -Math.sin(h) * 26, ly: -Math.cos(h) * 26 });
      x = x1; y = y1; h += Math.PI / 2;
    }
    H3.ribbons = rbs;
    if (!dur) return Promise.resolve();
    var p = Promise.resolve(); rbs.forEach(function (rb) { p = p.then(function () { return U.tween(dur, function (k) { rb.u = k; }); }); });
    return p;
  }
  var H3FALL = 'Your lines ran, but the light did not find her. Check them against the card.';
  function judge3(p, st) {
    var all = [], lp = null;
    p.forEach(function (s) { if (s.type === 'for') { lp = lp || s; all = all.concat(s.body); } else all.push(s); });
    var body = lp ? lp.body : [], fw = body.filter(function (s) { return s.op === 'forward'; })[0], tn = body.filter(function (s) { return s.op === 'left' || s.op === 'right'; })[0];
    var top = p.filter(function (s) { return s.type === 'cmd' && (s.op === 'left' || s.op === 'right'); })[0];
    if (st.found) {
      if (tn && tn.op === 'right') return { pass: true, msg: 'right(' + tn.v + ') grew the square the other way. Found her.' };
      if (lp && lp.n > st.found) return { pass: true, msg: 'Round ' + st.found + ' found her. The other ' + plural(lp.n - st.found, 'round') + ' flew on past.' };
      if (fw && fw.v && fw.v.src === '10 * i') return { pass: true, msg: '10 * i is the same as i * 10. Found her.' };
      return { pass: true };
    }
    if (!lp) return { msg: H3FALL };
    if (!tn && top) return { msg: top.op + '(' + top.v + ') had no spaces in front of it, so it was not part of the job. It ran once, at the end.' };
    if (!tn) return { msg: 'With no turn, BEEP flew in a line. Add left(90).' };
    if (!fw) return { msg: H3FALL };
    if (typeof fw.v !== 'object') return { msg: 'forward(' + fw.v + ') is ' + fw.v + ' metres every round. The square never grows. Use i.' };
    if (fw.v.k === 1) return { msg: 'forward(i) grows only 1 metre a round. Use i * 10.' };
    if (fw.v.k !== 10) return { msg: 'forward(' + fw.v.src + ') grows ' + fw.v.k + ' metres a round. Use i * 10.' };
    if (tn.v !== 90) return { msg: tn.op + '(' + tn.v + ') is not a square corner. Use left(90).' };
    if (lp.n < 10) return { msg: plural(lp.n, 'round') + ' reached ' + (lp.n - 1) * 10 + ' metres. She is further out. Use range(10).' };
    return { msg: H3FALL };
  }
  function ch3(n) { U.strip(3, [0, 1, 2]); L.cold = LEVEL[3].cold; L.shiver = LEVEL[3].shiver; L.bleat = 0; L.baa = 0; U.lamb(L); worry(1); }
  var STEP3 = function (k) { return 'THE GROWING SQUARE · STEP ' + k + ' OF 5'; };

  /* ---------- 9.1 why ---------- */
  async function g1() {
    ch3(); H3 = freshHill(); planMode(H3); H3.baa = null;
    await U.talk('NUALA', "It's too dark up here. She could be anywhere on the open hill.");
    U.tween(0.8, function (k) { H3.ring0 = k; });
    await U.talk('BEEP', "Her bleat came from about here. I'll start where the sound was.");
    drawSquare(8, false, 0.5);
    await U.screen({ step: STEP3(1), h: 'How rescue teams search.', html: "<p>When they don't know where someone is, rescue teams fly a square.</p><p>Then a bigger square round it, then bigger again.</p><p>It is called an expanding square search.</p>" }).done;
    await U.talk('BEEP', "To make my square bigger each round, I need to know which round I'm on.");
    H3.ribbons = [];
    await U.screen({ step: STEP3(1), h: 'Fly a square that grows, until the light finds her.', html: "<p>First, meet BEEP's counter.</p>" }).done;
  }
  /* ---------- 9.2 BEEP counts aloud ---------- */
  async function g2() {
    ch3(); if (!V.plan) { H3 = freshHill(); planMode(H3); } H3.ring0 = 1; H3.ribbons = [];
    await U.screen({ step: STEP3(2), h: 'Every loop counts its rounds in i.', html: '<p>i is a name for a number. The loop changes the number every round.</p><p>Python starts counting at 0. Round 1: i is 0. Round 2: i is 1.</p>' +
      meaning([['say(i)', 'Makes BEEP say the number in i, out loud.']]) }).done;
    var card = ['for i in range(3):', '    say(i)'], said = false;
    var tk = task({ step: STEP3(2), h: 'Type these 2 lines, then click Run. Listen to BEEP count.', card: card, rows: 3 });
    tk.box.focus();
    var done = tk.scr.done.then(function () { return 'next'; });
    for (;;) {
      var lines = await Promise.race([tk.next(), done]);
      if (lines === 'next') break;
      var r = Py.read(lines, { known: ['say'], loops: true, i: true, card: card });
      if (!r.ok) { missed(tk, lines, r.msg, r.line); continue; }
      tk.box.under('');
      await runIt(tk.box, Py.trace(r.prog), function (s, d) { return sayStep(tk.box, s, d); });
      H3.say = null;
      var lp = r.prog[0], sy = lp && lp.type === 'for' && lp.body.length === 1 ? lp.body[0] : null;
      if (sy && sy.op === 'say' && sy.v && sy.v.k === 1 && r.prog.length === 1) {
        var n = lp.n, list = []; for (var j = 0; j < Math.min(n, 8); j++) list.push(j); if (n > 8) list.push('…', n - 1);
        if (!said && n === 3) tk.box.under('BEEP said 0, 1, 2. Three rounds, counted from 0.\nChange the 3 to 5. Click Run again.', 'good');
        else tk.box.under('range(' + n + ') gave ' + plural(n, 'round') + ': ' + list.join(', ') + '. It stops before ' + n + '.', 'good');
        if (!said) { said = true; S2.flare(); tk.scr.showNext(U.nextDelay(10)); }
        tk.box.focus(); continue;
      }
      if (sy && sy.op === 'say' && typeof sy.v === 'number') { missed(tk, lines, 'say(' + sy.v + ') says ' + sy.v + ' every round. Type say(i), to hear the counter.'); continue; }
      missed(tk, lines, 'Your lines ran, but BEEP did not count. Check them against the card.');
    }
  }
  /* ---------- 9.3 the growing square: the timed beat ---------- */
  async function hillFail() {
    var b = H3.beep; U.clock.stop();
    await U.tween(1.0, function (k) { H3.fade = lerp(H3.fade, 1, k); L.bleat = 0; });
    U.tween(0.8, function (k) { L.cold = lerp(LEVEL[3].cold, 0.97, k); L.shiver = lerp(LEVEL[3].shiver, 0.1, k); });
    await U.tween(1.8, function (k) { b.h = normH(b.h) + Math.sin(k * Math.PI * 2) * 0.03; });
    await U.tween(1.0, function (k) { b.torch = k < 0.85 ? (Math.floor(k * 14) % 2 ? 0.2 : 1) : 0; });
    b.torch = 0; Snd.setWind(1); Snd.rotor(0, 0.5);
    await U.tween(0.8, function (k) { H3.black = k; });
    U.clock.hide(); await U.wait(2);
    U.tween(0.8, function (k) { H3.ring = k; });
    await U.talk('BEEP', "I can't hear her any more. Wait. I can go back to before she went quiet.", { mood: 0.2, chirp: 'sad' });
    U.panelOff(); Snd.rewind(2.5); Snd.setWind(0.55); Snd.bleat(false, 0.7);
    U.tween(0.7, function (k) { H3.black = 1 - k; H3.ring = 1 - k; });
    var rbs = H3.ribbons.slice(), x0 = b.x, y0 = b.y, h0 = normH(b.h);
    await U.tween(2.5, function (k) {
      var e = smooth(k); H3.fade = 1 - e; L.cold = lerp(0.97, LEVEL[3].cold, e); L.shiver = lerp(0.1, LEVEL[3].shiver, e);
      rbs.forEach(function (r) { r.u = 1 - e; }); b.x = lerp(x0, HX, e); b.y = lerp(y0, HY, e); b.h = lerp(h0, 0, e);
    });
    H3.ribbons = []; b.torch = 1; Snd.rotor(0.3, 1); H3.count = null;
    await U.screen({ step: STEP3(3), h: S.common.windBack, next: S.btn.tryAgain }).done;
  }
  async function g3() {
    ch3(); if (!V.plan) { H3 = freshHill(); planMode(H3); } H3.ring0 = 1; H3.ribbons = []; H3.baa = null;
    await U.screen({ step: STEP3(3), h: 'In Python, * means times.', html: '<p>i * 10 means i times 10.</p><table class="rt"><tr><th>round</th><th>i</th><th>' + U.code('i * 10') + '</th></tr>' +
      [[1, 0], [2, 1], [3, 2], ['…', '…'], [10, 9]].map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + (r[1] === '…' ? '…' : r[1] * 10) + '</td></tr>'; }).join('') + '</table>' +
      '<p>So forward(i * 10) flies a little further every round.</p>' }).done;
    drawSquare(6, true, 0.9);
    await U.screen({ step: STEP3(3), h: 'One more turn each round makes a square that grows.', html: '<p>Fly, turn left, fly further, turn left. The square spreads out.</p>' }).done;
    H3.ribbons = [];
    await U.talk('BEEP', 'Her bleat is getting weaker. Quick.', { mood: 0.4 });
    var card = ['for i in range(10):', '    forward(i * 10)', '    left(90)'], keep = '', tries = 0, res;
    for (;;) {
      res = await squareTask(card, keep, tries);
      if (res.pass) break;
      keep = res.text; tries = res.tries; await hillFail();
    }
    H3MINE = res.lines;
    res.tk.scr.showNext(U.nextDelay(6)); await res.tk.scr.done;
  }
  async function squareTask(card, keep, tries) {
    var failed, failP = new Promise(function (r) { failed = r; }), drive = { on: true }, last = 0, lines, r;
    var tk = task({ step: STEP3(3), h: 'Type these 3 lines, then click Run.', card: card, help: 'Round 1: 0 metres. Round 2: 10. Round 3: 20.', tries: tries, rows: 3, onFirstKey: function () { U.clock.start(); } });
    if (keep) tk.box.set(keep);
    H3.fade = 0; H3.baa = 0;
    U.clock.show('Her bleat fades in', 45); U.clock.onEnd = function () { failed('fail'); };
    U.every(function () {
      if (!drive.on) return false;
      if (!U.clock.on) return;
      H3.fade = U.clock.frac(); var now = performance.now();
      if (now - last > 4200) { last = now; var v = 1 - H3.fade; Snd.bleat(false, 0.2 + 0.7 * v); U.tween(1.2, function (k) { L.bleat = v * Math.sin(k * Math.PI); }); }
    });
    tk.box.focus();
    for (;;) {
      lines = await Promise.race([tk.next(), failP]);
      if (lines === 'fail') { drive.on = false; tk.box.lock(true); return { fail: true, text: tk.box.lines().join('\n'), tries: tk.tries }; }
      r = Py.read(lines, { known: ['forward', 'left', 'right'], loops: true, i: true, card: card });
      if (!r.ok) { missed(tk, lines, r.msg, r.line); continue; }
      tk.box.under(''); U.clock.stop();
      var st = { x: 0, y: 0, h: 0, found: 0 }; H3.ribbons = []; Snd.rotor(0.6, 0.5);
      await runIt(tk.box, Py.trace(r.prog), function (s, d) { return hillStep(tk.box, s, d, st); });
      Snd.rotor(0.3, 1);
      var j = judge3(r.prog, st);
      if (j.pass) { drive.on = false; U.clock.hide(); tk.box.under(j.msg || 'Found her.', 'good'); tk.box.hideRun(); tk.box.lock(true); return { pass: true, tk: tk, lines: Py.clean(lines), found: st.found }; }
      missed(tk, lines, j.msg + '\nBEEP flew back to the middle. Your lines are kept.');
      tk.box.lock(true); await U.wait(1.2); await hillReset(st); tk.box.lock(false); tk.box.focus();
      U.clock.start();
    }
  }
  /* ---------- 9.4 found her ---------- */
  async function g4() {
    ch3(); if (!V.plan) { H3 = freshHill(); planMode(H3); drawSquare(11, false, 0); }
    H3.lamb.found = 1; H3.fade = 0; H3.baa = null; U.clock.hide();
    Snd.bleat(false, 1); U.tween(1.8, function (k) { L.bleat = Math.sin(k * Math.PI); L.baa = k < 1 ? k : 0; });
    await U.wait(1.8); L.bleat = 0; L.baa = 0; U.lamb(null);
    await U.talk('BEEP', 'Found her! Round 10, 90 metres out.', { mood: 0.9 });
    await U.talk('NUALA', "There you are! You're frozen. Into my coat, little one.");
    await U.talk('NUALA', 'Now we need the barn, fast.');
  }
  /* ---------- 9.5 what you did ---------- */
  async function g5() {
    ch3(); U.lamb(null); if (!V.plan) { H3 = freshHill(); planMode(H3); } H3.ring0 = 0; H3.lamb.found = 1; H3.baa = null; H3.count = null; H3.beep = null;
    drawSquare(11, true, 0);
    await pages([
      function () { return U.screen({ step: STEP3(5), h: 'Here is what you just did.', html: '<p>i counted the rounds: 0, 1, 2, up to 9.</p><p>forward(i * 10) used i, so every arm was longer.</p><p>That is how the square grew until it found her.</p>' }).done; },
      function (b) { return quiz({ step: STEP3(5), h: 'BEEP runs for i in range(4): with say(i). What does BEEP say?', back: b,
        opts: shuffle([['0 1 2 3', 'Yes. 4 rounds, counted from 0.', true], ['1 2 3 4', 'The counter starts at 0, not 1.'], ['0 1 2 3 4', 'range(4) gives 4 rounds, so it stops after 3.']]) }); }
    ]);
    H3.beep = { x: HX, y: HY, h: 0, torch: 1 };
  }

  /* ================= chapter 4: THE WAY HOME (spec V2 §10). Lane, yard, barn, seen from above ================= */
  var LN = P.LANE, H4;
  function freshHome() { return { kind: 'home', ribbons: [], beep: { x: LN.x0, y: LN.y, h: 0, torch: 1 }, gates: [0, 0, 0, 0, 0, 0], walls: [0, 0, 0, 0], door: 0, nuala: { x: LN.x0 - 20, y: LN.y + 46 }, count: null, dark: 0, black: 0, ring: 0, ringDim: false }; }
  H4 = freshHome();
  var BUGS = [];
  function ch4() { U.strip(4, [0, 1, 2, 3]); U.lamb(null); worry(1); }
  var STEP4 = function (k) { return 'THE WAY HOME · STEP ' + k + ' OF 5'; };
  function homeSet(where) {
    var b = H4.beep;
    if (where === 'lane') { b.x = LN.x0; b.y = LN.y; b.h = 0; }
    if (where === 'yard') { b.x = LN.yard[0][0]; b.y = LN.yard[0][1]; b.h = 0; }
    if (where === 'barn') { b.x = LN.gate[0]; b.y = LN.gate[1]; b.h = Math.PI / 2; }
    b.torch = 1;
  }
  function walkNuala(x, y, dur) { var n = H4.nuala, x0 = n.x, y0 = n.y; return U.tween(dur || 1.6, function (k) { var e = smooth(k); n.x = lerp(x0, x, e); n.y = lerp(y0, y, e); }); }
  function nearPt(a, x, y, d) { return Math.abs(a[0] - x) < (d || 12) && Math.abs(a[1] - y) < (d || 12); }
  /* one step on the way home. scale: px a metre (lane and yard 1.3, barn 5) */
  function homeStep(s, dur, st) {
    var b = H4.beep;
    if (s.op === 'round') { S2.round(s.round, s.of); return st.stop ? 'stop' : null; }
    if (s.op === 'forward') {
      var x0 = b.x, y0 = b.y, len = s.v * st.scale, x1 = x0 + Math.cos(b.h) * len, y1 = y0 - Math.sin(b.h) * len, rb = { x0: x0, y0: y0, x1: x1, y1: y1, u: 0 };
      H4.ribbons.push(rb);
      return U.tween(dur * 0.85, function (k) { rb.u = k; b.x = lerp(x0, x1, k); b.y = lerp(y0, y1, k); }).then(function () {
        if (st.where === 'yard') { for (var i = 0; i < 4; i++) { var a = LN.yard[i], c = LN.yard[(i + 1) % 4]; if (!H4.walls[i] && ((nearPt(a, x0, y0) && nearPt(c, x1, y1)) || (nearPt(c, x0, y0) && nearPt(a, x1, y1)))) { H4.walls[i] = 1; st.lit++; S2.flare(); } } }
        if (st.where === 'barn' && !st.atDoor && Math.abs(b.y - LN.door[1]) < 6 && Math.abs(b.x - LN.door[0]) < 10) st.atDoor = true;
        if (st.where === 'barn' && b.y < LN.door[1] - 6) st.past = true;
        return st.stop ? 'stop' : null;
      });
    }
    if (s.op === 'left' || s.op === 'right') { var h0 = b.h, d = (s.op === 'left' ? 1 : -1) * s.v * Math.PI / 180; return U.tween(dur * 0.6, function (k) { b.h = lerp(h0, h0 + d, smooth(k)); }); }
    if (s.op === 'look') {
      if (st.where === 'lane') LN.gates.forEach(function (gx, k) { if (!H4.gates[k] && Math.abs(b.x - gx) < 10 && Math.abs(b.y - LN.y) < 10) { H4.gates[k] = 1; st.lit++; S2.flare(); } });
      return U.tween(Math.max(0.2, dur * 0.5), function (k) { b.torch = 1 + 0.6 * Math.sin(k * Math.PI); }).then(function () { b.torch = 1; return st.stop ? 'stop' : null; });
    }
    return null;
  }
  function homeReset(where) {
    var rbs = H4.ribbons.slice();
    if (where === 'lane') H4.gates = [0, 0, 0, 0, 0, 0];
    if (where === 'yard') H4.walls = [0, 0, 0, 0];
    return U.tween(0.9, function (k) { rbs.forEach(function (r) { r.u = 1 - k; }); }).then(function () { H4.ribbons = []; homeSet(where); });
  }
  async function homeRun(box, prog, where, o) {
    var st = { where: where, scale: where === 'barn' ? 5 : 1.3, lit: 0 };
    H4.ribbons = []; homeSet(where); Snd.rotor(0.6, 0.5);
    if (o && o.stopper) o.stopper(st);
    var r = await runIt(box, Py.trace(prog, { cap: 14 }), function (s, d) { return homeStep(s, d, st); }, o && o.run);
    Snd.rotor(0.3, 1); st.stopped = r === 'stop';
    return st;
  }
  /* the guess: Dad's flight already typed in the box; three guesses, each "Click Run to see."; Run shows the truth */
  async function guessScreen(o) {
    var scr = U.screen({ step: o.step, h: "Read Dad's flight. What will it do?", hold: true,
      html: '<p>' + o.above + '</p><div class="slot"></div>' + (o.note ? '<p class="newword">' + o.note + '</p>' : '') + '<div class="opts">' + o.guesses.map(function (g, i) { return '<button class="opt" data-i="' + i + '">' + U.esc(g) + '</button>'; }).join('') + '</div><p class="fb"></p>' });
    var ran = false, seen = null, box = Box.make($('.slot', panel), { rows: 3, readyAt: 0, onRun: function () { if (!ran) { ran = true; go(); } } });
    box.set(o.lines.join('\n')); box.ta.readOnly = true; box.runB.disabled = true; box.runB.style.opacity = 0.4;
    var fb = $('.fb', panel);
    [].forEach.call(panel.querySelectorAll('.opt'), function (b) { b.onclick = function () { [].forEach.call(panel.querySelectorAll('.opt'), function (x) { x.classList.remove('picked'); }); b.classList.add('picked'); fb.textContent = 'Click Run to see.'; if (!ran) { box.runB.disabled = false; box.runB.style.opacity = 1; } }; });
    async function go() {
      [].forEach.call(panel.querySelectorAll('.opt'), function (x) { x.disabled = true; });
      var r = Py.read(o.lines, o.read), st = await homeRun(box, r.prog, o.where, o.runOpts);
      box.ta.readOnly = true; box.hideRun(); box.under(o.after(st), 'warn'); seen = st;
      scr.showNext(U.nextDelay(8));
    }
    await scr.done;
    if (o.then) await o.then(seen);
  }
  /* the fix: the flight in the box, her edit, Run until it is right. o.judge(prog, st) gives {pass, msg} */
  async function fixTask(o) {
    var tk = task({ step: o.step, h: o.h, card: o.lines, label: "Dad's flight", help: o.help, tries: o.tries || 0, rows: 3, onFirstKey: o.onFirstKey });
    tk.noRing = true; tk.box.set(o.keep || o.lines.join('\n'));
    if (o.lockRest) { var rest = o.lines.slice(1).join('\n'); tk.box.ta.addEventListener('input', function () { var ls = tk.box.ta.value.split('\n'); if (ls.slice(1).join('\n') !== rest) { var p = tk.box.ta.selectionStart; tk.box.ta.value = ls[0] + '\n' + rest; tk.box.ta.selectionStart = tk.box.ta.selectionEnd = Math.min(p, ls[0].length); tk.box.ta.dispatchEvent(new Event('scroll')); } }); }
    tk.box.focus();
    for (;;) {
      var lines = await (o.race ? Promise.race([tk.next(), o.race]) : tk.next());
      if (lines === 'fail') { tk.box.lock(true); return { fail: true, text: tk.box.lines().join('\n'), tries: tk.tries }; }
      var r = Py.read(lines, o.read);
      if (!r.ok) { missed(tk, lines, r.msg, r.line); continue; }
      tk.box.under(''); if (o.onRun) o.onRun();
      var st = await homeRun(tk.box, r.prog, o.where, o.runOpts);
      if (st.dead) { tk.box.lock(true); return { fail: true, text: tk.box.lines().join('\n'), tries: tk.tries }; }
      var j = o.judge(r.prog, st);
      if (j.pass) { tk.box.under(j.msg, 'good'); tk.box.hideRun(); tk.box.lock(true); if (o.won) await o.won(st); tk.scr.showNext(U.nextDelay(8)); await tk.scr.done; return { pass: true }; }
      missed(tk, lines, j.msg + '\nBEEP flew back. Your lines are kept.');
      tk.box.lock(true); await U.wait(1.4); await homeReset(o.where); tk.box.lock(false); tk.box.focus();
    }
  }
  function bugQuiz(step, opts) { return quiz({ step: step, h: 'Name the bug.', opts: shuffle(opts) }); }
  function loopOf(p) { return p.filter(function (s) { return s.type === 'for'; })[0]; }
  function bodyOp(lp, op) { return lp ? lp.body.filter(function (s) { return s.op === op; })[0] : null; }
  var READ_HOME = { known: ['forward', 'left', 'right', 'look'], loops: true };

  /* ---------- 10.1 why, and the idea of a bug ---------- */
  async function h1() {
    ch4(); H4 = freshHome(); planMode(H4);
    await U.talk('NUALA', "Dad wrote flights for BEEP last spring. They're still on its screen.");
    await U.talk('BEEP', 'They light the way home. But each one has a mistake in it.');
    await U.screen({ step: STEP4(1), h: 'A mistake in a program is called a bug.', html: '<p>A bug makes the program do the wrong thing.</p><p>Read a program before you run it. Then you can find the bug.</p>' }).done;
    await U.screen({ step: STEP4(1), h: "Fix Dad's 3 flights to get her to the barn.", html: '<p>For each one: guess what it does, run it, fix it, then name the bug.</p>' }).done;
  }
  /* ---------- 10.2 the lane, six gates ---------- */
  async function h2() {
    ch4(); if (!V.plan || V.plan.kind !== 'home') { H4 = freshHome(); planMode(H4); } homeSet('lane'); H4.gates = [0, 0, 0, 0, 0, 0]; H4.ribbons = []; H4.nuala = { x: LN.x0 - 20, y: LN.y + 46 };
    var dad = ['for i in range(5):', '    forward(100)', '    look()'];
    await guessScreen({ step: STEP4(2), above: 'The lane has 6 gates. BEEP lights each one.', lines: dad, read: READ_HOME, where: 'lane',
      guesses: shuffle(['Lights all 6 gates', 'Lights 5 gates. One stays dark.', 'Never stops']),
      after: function () { return 'range(5) lit 5 gates. The lane has 6.'; },
      then: async function () { await walkNuala(LN.gates[5] - 40, LN.y + 46, 2.2); await U.talk('NUALA', "I can't see the last gate."); } });
    homeReset('lane'); H4.nuala = { x: LN.x0 - 20, y: LN.y + 46 };
    await fixTask({ step: STEP4(2), h: 'Change one number to light all 6 gates, then click Run.', lines: dad, read: READ_HOME, where: 'lane',
      judge: function (p, st) {
        var lp = loopOf(p), fw = bodyOp(lp, 'forward'), lk = bodyOp(lp, 'look');
        if (!lp || !fw) return { msg: 'Your lines ran, but the gates are not all lit. Check them against the card.' };
        if (!lk) return { msg: 'Keep look() in the job, so BEEP lights each gate.' };
        if (fw.v !== 100) return { msg: 'The gates are 100 metres apart. Keep forward(100).' };
        if (lp.n === 6) return { pass: true, msg: 'range(6) lit all 6 gates.' };
        if (lp.n === 7) return { msg: 'range(7) is one too many. BEEP flew on past the last gate.' };
        if (lp.n > 6) return { msg: 'range(' + lp.n + ') is too many. BEEP flew on past the last gate.' };
        return { msg: 'range(' + lp.n + ') lit ' + plural(lp.n, 'gate') + '. The lane has 6.' };
      },
      won: async function () { await walkNuala(LN.gates[5] + 40, LN.y + 46, 2.4); Snd.chirp(); await walkNuala(LN.yard[0][0], LN.yard[0][1] + 30, 1.2); } });
    BUGS[0] = 1;
    await bugQuiz(STEP4(2), [['Off by one', 'Yes. 5 rounds for 6 gates.', true], ['Wrong turn', 'There is no turn in this flight.'], ['Never stops', 'It stopped after 5 rounds. The count was wrong.']]);
  }
  /* ---------- 10.3 the yard, four walls ---------- */
  async function h3() {
    ch4(); if (!V.plan || V.plan.kind !== 'home') { H4 = freshHome(); planMode(H4); H4.gates = [1, 1, 1, 1, 1, 1]; }
    H4.ribbons = []; H4.walls = [0, 0, 0, 0]; homeSet('yard'); H4.nuala = { x: LN.yard[0][0], y: LN.yard[0][1] + 30 };
    var dad = ['for i in range(4):', '    forward(100)', '    left(80)'];
    await guessScreen({ step: STEP4(3), above: 'The yard has 4 walls. BEEP lights each one, turning at each corner.', lines: dad, read: READ_HOME, where: 'yard',
      guesses: shuffle(['Lights all 4 walls', 'Drifts off the walls', 'Never stops']),
      after: function () { return 'left(80) is not a square corner. The light missed the walls.'; } });
    homeReset('yard');
    await fixTask({ step: STEP4(3), h: 'Change one number to fix the turn, then click Run.', lines: dad, read: READ_HOME, where: 'yard',
      judge: function (p) {
        var lp = loopOf(p), fw = bodyOp(lp, 'forward'), lt = bodyOp(lp, 'left'), rt = bodyOp(lp, 'right');
        if (!lp || !fw) return { msg: 'Your lines ran, but the walls are not all lit. Check them against the card.' };
        if (rt) return { msg: 'right(' + rt.v + ') turned BEEP away from the yard. Use left, as Dad wrote.' };
        if (fw.v !== 100) return { msg: 'Each wall is 100 metres. Keep forward(100).' };
        if (!lt) return { msg: 'Keep a left turn in the job, so BEEP turns at each corner.' };
        if (lt.v === 90 && lp.n === 4) return { pass: true, msg: 'left(90) is a square corner. All 4 walls are lit.' };
        if (lt.v === 90) return { msg: '4 walls need 4 rounds. Keep range(4).' };
        if (lp.n !== 4) return { msg: '4 walls need 4 rounds. The turn is what is wrong.' };
        if (lt.v === 100) return { msg: 'left(100) turns too far. A square corner is 90.' };
        return { msg: 'left(' + lt.v + ') is not a square corner. A square corner is 90.' };
      },
      won: function () { return walkNuala(LN.gate[0], LN.gate[1] + 20, 1.8); } });
    BUGS[1] = 1;
    await bugQuiz(STEP4(3), [['Wrong turn', 'Yes. 80 is not a square corner. 90 is.', true], ['Off by one', '4 walls, 4 rounds. The count was right.'], ['Never stops', 'It stopped after 4 rounds. The turn was wrong.']]);
  }
  /* ---------- 10.4 the barn: the timed beat. The battery clock starts at her first Run ---------- */
  async function barnFail() {
    var b = H4.beep, rbs = H4.ribbons.slice();
    U.clock.stop();
    for (var i = rbs.length - 1; i >= 0; i--) { (function (r) { U.tween(0.25, function (k) { r.u = 1 - k; }); })(rbs[i]); await U.wait(0.12); }
    await U.tween(0.8, function (k) { b.torch = 1 - k; });
    Snd.setWind(1); Snd.rotor(0, 0.5);
    await U.tween(0.8, function (k) { H4.black = k; });
    U.clock.hide(); await U.wait(2);
    H4.ringDim = true; U.tween(0.8, function (k) { H4.ring = k; });
    await U.talk('BEEP', 'My battery died. Wait. I can go back to before my battery died.', { mood: 0.2, chirp: 'sad' });
    U.panelOff(); Snd.rewind(2.5); Snd.setWind(0.55);
    U.tween(0.7, function (k) { H4.black = 1 - k; H4.ring = 1 - k; });
    var x0 = b.x, y0 = b.y;
    await U.tween(2.5, function (k) { var e = smooth(k); b.x = lerp(x0, LN.gate[0], e); b.y = lerp(y0, LN.gate[1], e); b.torch = e; });
    H4.ribbons = []; H4.ringDim = false; homeSet('barn'); Snd.rotor(0.3, 1);
    await U.screen({ step: STEP4(4), h: S.common.windBack, next: S.btn.tryAgain }).done;
  }
  async function h4() {
    ch4(); if (!V.plan || V.plan.kind !== 'home') { H4 = freshHome(); planMode(H4); H4.gates = [1, 1, 1, 1, 1, 1]; H4.walls = [1, 1, 1, 1]; }
    H4.ribbons = []; H4.door = 0; homeSet('barn'); H4.nuala = { x: LN.gate[0], y: LN.gate[1] + 20 };
    await U.talk('BEEP', 'My battery is nearly empty. One flight left.', { mood: 0.4 });
    var dad = ['while True:', '    forward(10)', '    look()'], failed, failP, clockOn = false, live = null;
    function arm() { failP = new Promise(function (r) { failed = r; }); clockOn = false; U.clock.show("BEEP's battery runs out in", 40); U.clock.onEnd = function () { if (live) live.stop = live.dead = true; failed('fail'); }; }
    function startClock() { if (!clockOn) { clockOn = true; U.clock.start(); } }
    arm();
    var runOpts = { stopper: function (st) { live = st; }, run: { pillText: function (s) { return s.endless ? 'round ' + s.round + ', no end' : 'round ' + s.round + ' of ' + s.of; } } };
    await guessScreen({ step: STEP4(4), above: 'The barn door is 60 metres away.', note: 'New: while True: is another loop. It has no count.', lines: dad,
      read: { known: ['forward', 'look'], loops: true, whileOk: true }, where: 'barn',
      guesses: shuffle(['Stops at the barn', 'Never stops', 'Stops short of the barn']),
      runOpts: { stopper: function (st) { live = st; startClock(); var sb = document.createElement('button'); sb.className = 'btn stopit'; sb.textContent = S.btn.stop; sb.onclick = function () { st.stop = true; sb.remove(); }; $('.btns', panel).appendChild(sb); st.btn = sb; $('.btns', panel).classList.remove('hide'); }, run: runOpts.run },
      after: function (st) { if (st.btn) st.btn.remove(); return 'while True has no count, so it never stops.'; } });
    homeReset('barn');
    var keep = '', tries = 0, res;
    for (;;) {
      res = await fixTask({ step: STEP4(4), h: 'Change the first line to a for loop that stops at the barn, then click Run.', lines: dad, keep: keep, tries: tries, lockRest: true,
        help: 'The barn is 60 metres. Each step is 10 metres.', read: { known: ['forward', 'look'], loops: true, whileNo: true, card: dad }, where: 'barn', race: failP,
        onRun: startClock, runOpts: { stopper: function (st) { live = st; if (U.clock.on && U.clock.left <= 0) st.stop = st.dead = true; } },
        judge: function (p) {
          var lp = loopOf(p);
          if (!lp) return { msg: 'Your lines ran, but BEEP did not reach the barn. Check the first line.' };
          if (lp.n === 6) return { pass: true, msg: 'range(6) lit 6 steps to the barn door.' };
          if (lp.n === 60) return { msg: 'range(60) flies 60 steps of 10 metres. The barn is 6 steps away.' };
          if (lp.n < 6) return { msg: 'range(' + lp.n + ') stops short of the barn. The barn is 6 steps away.' };
          return { msg: 'range(' + lp.n + ') flies past the barn. The barn is 6 steps away.' };
        },
        won: async function () { U.clock.stop(); U.clock.hide(); S2.chord(); await U.tween(1.2, function (k) { H4.door = k; }); await walkNuala(LN.door[0], LN.door[1] + 30, 1.8); } });
      if (res.pass) break;
      keep = res.text; tries = res.tries; await barnFail(); arm();
    }
    BUGS[2] = 1;
    await bugQuiz(STEP4(4), [['Never stops', 'Yes. while True has no count, so no end.', true], ['Off by one', 'There was no count to be off by.'], ['Wrong turn', 'There is no turn in this flight.']]);
  }
  /* ---------- 10.5 what you did ---------- */
  async function h5() {
    ch4(); if (!V.plan || V.plan.kind !== 'home') { H4 = freshHome(); planMode(H4); } H4.gates = [1, 1, 1, 1, 1, 1]; H4.walls = [1, 1, 1, 1]; H4.door = 1;
    function fl(lines, ring) { return '<div class="mine">' + lines.map(function (l, i) { var h = U.code(l); return i === ring[0] ? h.replace(ring[1], '<span class="ringn">' + ring[1] + '</span>') : h; }).join('\n') + '</div>'; }
    await pages([
      function () { return U.screen({ step: STEP4(5), h: 'Here is what you just did.', html: '<div class="cmp three">' + fl(['for i in range(5):', '    forward(100)', '    look()'], [0, '5']) + fl(['for i in range(4):', '    forward(100)', '    left(80)'], [2, '80']) + fl(['while True:', '    forward(10)', '    look()'], [0, 'while True']) + '</div>' +
        '<p>You found 3 bugs and fixed each one.</p><p>Off by one: range(5) for 6 gates.</p><p>Wrong turn: left(80) for a square.</p><p>Never stops: while True, with no count.</p>' }).done; },
      function (b) { return quiz({ step: STEP4(5), h: 'This flight should light 10 gates: for i in range(9): What is the bug?', back: b,
        opts: shuffle([['Off by one', 'Yes. 9 rounds for 10 gates.', true], ['Wrong turn', 'There is no turn in this flight.'], ['Never stops', 'range(9) stops after 9 rounds.']]) }); }
    ]);
  }

  /* ================= the close (spec V2 §11): the barn film, her name for the lamb, the badges, the recap ================= */
  var LAMBNAME = '', GOT = [], EARLY = false, BADGE = { 1: 'b13', 3: 'b14', 4: 'b15' }, BADGE_IDS = ['b13', 'b14', 'b15'];
  function worry(w) { window.SearchChars = window.SearchChars || {}; window.SearchChars.worry = w; }
  async function barnFilm() {
    U.strip(5, [0, 1, 2, 3, 4]); U.lamb(null); U.clock.hide(); worry(0);
    var bs = { u: 0 }; V.barnSt = bs; V.mode = 'barn'; Snd.rotor(0.15, 2); Snd.setWind(0.2);
    U.tween(6, function (k) { bs.u = k; }); U.wait(2.5).then(function () { S2.chord(); });
    for (var i = 0; i < S.close.barn.length; i++) await U.film(S.close.barn[i], { next: S.btn.next });
  }
  async function nameHer() {
    if (LAMBNAME) return;
    await U.talk('NUALA', S.close.nameTalk);
    var scr = U.screen({ step: S.close.kicker, h: S.close.nameH, hold: true, html: '<input class="namebox" maxlength="18" autocomplete="off" spellcheck="false"><p class="fb"></p>', next: S.btn.nameHer });
    var inp = $('.namebox', panel), fb = $('.fb', panel); inp.focus(); scr.showNext(0);
    var nb = $('.btns .next', panel), ok = false;
    await new Promise(function (res) {
      function tryIt(ev) { if (ev) { ev.stopImmediatePropagation(); ev.preventDefault(); } var v = inp.value.trim(); if (!v) { fb.textContent = S.close.nameEmpty; inp.focus(); return; } LAMBNAME = v.slice(0, 18); S2.chord(); res(); }
      nb.addEventListener('click', tryIt, true);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryIt(e); });
    });
    save('close');
  }
  async function badgesAndRecap() {
    var got = S.close.badges.filter(function (b, i) { return GOT.indexOf(BADGE_IDS[i]) !== -1; });
    if (got.length) await U.screen({ step: S.close.kicker, h: got.length > 1 ? S.close.badgesKicker : S.close.badgeKicker, html: '<div class="badges">' + got.map(function (b) { return '<div class="badge"><b>' + U.esc(b[0]) + '</b><span>' + U.esc(b[1]) + '</span></div>'; }).join('') + '</div>' }).done;
    /* the four small drawn moments (§11.3): the lit trail, the three walled fields, the growing square, the barn door */
    var pics = [
      '<svg viewBox="0 0 34 34"><path d="M3 27 H31" stroke="#8fa0c8" stroke-width="5" stroke-linecap="round"/><g fill="#ffd27a"><circle cx="8" cy="27" r="2.6"/><circle cx="17" cy="27" r="2.6"/><circle cx="26" cy="27" r="2.6"/></g><path d="M8 10 v8 M17 10 v8 M26 10 v8" stroke="#a77a45" stroke-width="2.4"/></svg>',
      '<svg viewBox="0 0 34 34" fill="none" stroke="#e8ecf4" stroke-width="2.4"><rect x="2.5" y="12" width="8.5" height="8.5"/><rect x="12.75" y="12" width="8.5" height="8.5"/><rect x="23" y="12" width="8.5" height="8.5"/></svg>',
      '<svg viewBox="0 0 34 34" fill="none" stroke="#ffd27a" stroke-width="2.2"><path d="M17 17 h3 v-3 h-6 v6 h9 v-9 h-12 v12 h15 v-15 h-18 v18"/></svg>',
      '<svg viewBox="0 0 34 34"><rect x="5" y="6" width="24" height="24" fill="#6b3a2a"/><path d="M3 8 L17 2 L31 8" stroke="#e8ecf4" stroke-width="2.4" fill="none"/><rect x="13" y="18" width="8" height="12" fill="#ffd27a"/></svg>'];
    await U.screen({ step: S.close.kicker, h: S.close.recapH, html: '<div class="recap">' + S.close.recap.map(function (l, i) { return '<div class="rc"><span class="rcpic">' + pics[i] + '</span><p>' + U.code(l).replace(/<\/?span[^>]*>/g, '') + '</p></div>'; }).join('') + '</div>' }).done;
  }
  async function close() {
    await barnFilm();
    await nameHer();
    U.panelOff(); V.mode = 'plan'; V.plan = H4; H4.door = 1;
    await badgesAndRecap();
    save('done');
    SearchBridge.done('end');
    hideBtns();
  }
  /* she clicked Home between chapters (past minute 48): the lamb is not home yet, so badges and recap only. Her place stays at the next chapter */
  async function homeEarly(next) {
    U.strip(5, [0, 1, 2, 3, 4].slice(0, CH_OF[next])); U.clock.hide(); EARLY = true;
    await badgesAndRecap();
    SearchBridge.done('early');
    hideBtns();
  }
  async function between(k) {
    if (!U.minutes || U.minutes() < 48) return 'carry';
    var r = 'carry';
    await new Promise(function (res) {
      var scr = U.screen({ step: S.strip[k + 1].toUpperCase(), h: S.common.runningOut, next: S.btn.carryOn, back: S.btn.home });
      scr.done.then(function (v) { r = v === 'back' ? 'home' : 'carry'; res(); });
    });
    return r;
  }

  /* ================= the order: every step saves her place (v 2), Welcome back returns her to the start of the step ================= */
  var STEPS = [['film', film], ['t1', t1], ['t2', t2], ['t3', function () { return t3().then(t4); }], ['t4', function () { return t4(null); }], ['t5', t5],
    ['t6', function () { return t6(false); }], ['t7', function () { return t6(true); }], ['t8', t8], ['w1', w1], ['w2', w2], ['w3', w3], ['w4', w4], ['w5', w5],
    ['g1', g1], ['g2', g2], ['g3', g3], ['g4', g4], ['g5', g5], ['h1', h1], ['h2', h2], ['h3', h3], ['h4', h4], ['h5', h5], ['close', close]];
  /* the step line each step opens on (the step line on talk screens before its first card) */
  var TR = function (k) { return 'THE TRACKS · STEP ' + k + ' OF 6'; }, WA = function (k) { return 'THE WALLS · STEP ' + k + ' OF 5'; };
  var STEPLINE = { t1: TR(1), t2: TR(1), t3: TR(3), t4: TR(3), t5: TR(4), t6: TR(5), t7: TR(5), t8: TR(6), w1: WA(1), w2: WA(1), w3: WA(3), w4: WA(4), w5: WA(5),
    g1: STEP3(1), g2: STEP3(2), g3: STEP3(3), g4: STEP3(4), g5: STEP3(5), h1: STEP4(1), h2: STEP4(2), h3: STEP4(3), h4: STEP4(4), h5: STEP4(5) };
  var ONLY_JUMP = { t4: 1, t7: 1 }, PARENT = { t4: 't3', t7: 't6' };
  var CH_OF = { film: 0, close: 5 }; STEPS.forEach(function (s) { var c = { t: 1, w: 2, g: 3, h: 4 }[s[0][0]]; if (c) CH_OF[s[0]] = c; });
  var FIRST_OF = { 0: 'film', 1: 't1', 2: 'w1', 3: 'g1', 4: 'h1', 5: 'close' }, LAST_OF = { t8: 1, w5: 2, g5: 3, h5: 4 };
  var AT = 'film';
  function save(at) { SearchBridge.save({ v: 2, chapter: at === 'done' ? 5 : CH_OF[at] || 0, step: at === 'done' ? 'close' : at, finished: at === 'done' || undefined, lambName: LAMBNAME, got: GOT.slice() }); }
  window.__hour = { get at() { return AT; } };
  var warned = false;
  U.every(function () { if (!warned && U.minutes && U.minutes() >= 48) { warned = true; if (U.note) U.note(S.common.runningOut); } });
  async function go(at) {
    var i0 = Math.max(0, STEPS.map(function (s) { return s[0]; }).indexOf(at)), i;
    try {
      for (i = i0; i < STEPS.length; i++) {
        var id = STEPS[i][0];
        if (i > i0 && ONLY_JUMP[id]) continue;
        JUMP = i === i0 && i0 > 0; AT = id;
        U.stepNow = STEPLINE[id] || null;
        worry(id === 'close' ? 0 : 1);
        if (!ONLY_JUMP[id] && id !== 'film') save(id);
        await STEPS[i][1]();
        var c = LAST_OF[id];
        if (c) {
          var b = BADGE[c]; if (b && GOT.indexOf(b) === -1) { GOT.push(b); save(STEPS[i + 1][0]); SearchBridge.badge(b); }
          if (c <= 3 && (await between(c)) === 'home') { save(STEPS[i + 1][0]); return homeEarly(STEPS[i + 1][0]); }
        }
      }
    } catch (e) { console.error('hour flow error', e); window.__hourError = String(e && e.stack || e); }
  }
  /* where she starts: ?at= (the walker), her saved step (v 2), a V74 place (its chapter's first step), or the film */
  function startAt() {
    var q = U.Q.get('at'); if (q) return q;
    var pl = SearchBridge.place || {};
    LAMBNAME = pl.lambName || ''; GOT = (pl.got || []).slice();
    if (pl.v === 2 && pl.step) return PARENT[pl.step] || pl.step;
    var c = +pl.chapter || 0; return FIRST_OF[Math.min(5, Math.max(0, c))] || 'film';
  }
  function welcome(at) {
    var pl = SearchBridge.place || {}, c = CH_OF[at] || 0;
    if (at === 'film' || U.Q.get('at')) return Promise.resolve(at);
    return new Promise(function (res) {
      var line = (LAMBNAME && c === 5 ? S.common.welcome : S.common.welcomeNoLamb).replace('{name}', U.esc(pl.name || '')).replace('{chapter}', S.strip[c]).replace('{lamb}', U.esc(LAMBNAME)).replace('Welcome back, .', 'Welcome back.');
      var scr = U.screen({ step: S.strip[c].toUpperCase(), h: line, next: S.btn.carryOn, back: S.btn.startAgain });
      scr.done.then(function (v) { if (v === 'back') { LAMBNAME = ''; GOT = []; res('film'); } else res(at); });
    });
  }
  U.start();
  var place = SearchBridge.place || {};
  if (place.stage === 'free') { if (document.readyState === 'complete') window.FreeFlight(); else window.addEventListener('load', function () { window.FreeFlight(); }); }
  else { var at0 = startAt(); welcome(at0).then(go); }
})();
