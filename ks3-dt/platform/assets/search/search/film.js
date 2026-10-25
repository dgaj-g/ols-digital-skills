/* The Search, art test: the opening film. The phone buzzes, Nuala's message and photo, the Workshop drone
   wakes, the hill at dusk, the lamb. One clock drives the picture, the words and the sound.
   Every sound has a drawn twin. Then the close-ups, for the look at the faces. */
(function () {
  'use strict';
  var Sc = window.SearchScene, C = window.SearchChars, Snd = window.SearchSound, ctx = Sc.ctx, W = Sc.W, H = Sc.H, TAU = C.TAU;
  var clamp = C.clamp, lerp = C.lerp, smooth = C.smooth;
  var q = new URLSearchParams(location.search);
  function num(k, d) { var v = parseFloat(q.get(k)); return isNaN(v) ? d : v; }
  var OPT = { auto: q.has('auto'), mute: q.has('mute'), freeze: q.has('freeze'), t0: num('t', 0), sheet: q.get('sheet'), mood: q.get('mood') };
  function hump(t, t0, d) { var u = (t - t0) / d; return u <= 0 || u >= 1 ? 0 : Math.pow(Math.sin(u * Math.PI), 1.5); }
  function win(t, a, b, f) { return clamp((t - a) / f, 0, 1) * clamp((b - t) / f, 0, 1); }
  function mix(a, b, t) { return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) }; }
  function track(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) if (t < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], smooth((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
    return keys[keys.length - 1][1];
  }
  function blinkAt(t, period, phase) { var u = (t + phase) % period; return u < 0.16 ? Math.sin(u / 0.16 * Math.PI) : 0; }
  function seek(list, t) { var i = 0; while (i < list.length && list[i][0] < t) i++; return i; }

  /* ---------- the times ---------- */
  var T_WORK = 7.0, T_HILL = 18.0, T_CLOSE = 23.6, T_END = 36.4;
  /* the words on the picture. Each stays at least 1.2 s and 0.35 s a word. */
  var CAPS = [
    [7.4, 11.6, 'The Workshop’s drone has been asleep all winter.'],
    [18.6, 23.7, 'Dusk on the hill. Nuala’s torch is down by the gate.'],
    [26.2, 32.0, 'The lamb is under the far wall. Snow is landing on her nose.'],
    [32.3, 36.3, 'She cannot see Nuala. Nuala cannot see her.']
  ];
  var SAYS = [[11.6, 13.8, 'Who’s lost?'], [14.0, 17.6, 'I’ll fly. You tell me where.']];
  var SHOTS = [0, T_WORK, T_HILL, T_CLOSE];
  var CAM = [[T_HILL, { x: 800, y: 450, z: 1 }], [T_CLOSE, { x: 800, y: 450, z: 1 }], [T_CLOSE + 2.2, { x: 600, y: 700, z: 2.1 }], [T_END, { x: 600, y: 700, z: 2.1 }]];
  var LAMB = { x: 600, y: 650, s: 38 }, NEAR = { x: 600, y: 712 };
  var BLEATS = [[27.0, 0.45], [30.2, 0.8]];
  var PRINTS = [];
  (function () { for (var i = 0; i < 26; i++) { var u = i / 25; PRINTS.push({ x: lerp(790, 600, u) + Math.sin(u * 7) * 40, y: lerp(612, 690, u * u), r: 0.3 + 0.3 * Math.sin(i), a: 0.25 + 0.35 * u }); } })();

  var P = { phase: 'call', ft: 0, playing: false, evi: 0, last: 0, who: 'beep', mood: 'happy', wipe: 0 };
  var el = {}, soundOff = false;

  /* ---------- the sounds that happen at fixed moments, each with its drawn twin in draw() ---------- */
  var EV = [
    [0.25, function () { Snd.buzz(); }],
    [T_WORK, function () { Snd.bedLevel(0.12, 1.0); Snd.setWind(0.2); }],
    [9.0, function () { Snd.chirp('wake'); }],
    [10.0, function () { Snd.hum(1.8); }],
    [12.6, function () { Snd.rotor(1, 1.1); }],
    [14.0, function () { Snd.chirp('happy'); }],
    [T_HILL - 0.2, function () { Snd.bedLevel(0.7, 1.4); Snd.setWind(0.55); Snd.rotor(0.3, 0.8); }],
    [BLEATS[0][0], function () { Snd.bleat(true, 0.9); }],
    [BLEATS[1][0], function () { Snd.bleat(false, 1); }]
  ];

  function soundState() { return OPT.mute ? 'muted' : Snd.state(); }
  function setSound(on) { soundOff = !on; Snd.setMuted(soundOff); var tx = soundOff ? 'Sound is off' : 'Sound is on'; if (el.snd) el.snd.textContent = tx; if (el.tSound) el.tSound.textContent = tx; }
  function show(e, on) { if (!e) return; e.style.visibility = on ? 'visible' : 'hidden'; e.style.opacity = on ? 1 : 0; }

  function go(phase, who) {
    P.phase = phase;
    el.call.classList.toggle('on', phase === 'call');
    el.end.classList.toggle('on', phase === 'end');
    el.sheet.classList.toggle('on', phase === 'sheet');
    show(el.nav, phase === 'film' || phase === 'sheet'); show(el.snd, phase !== 'call');
    P.playing = phase === 'film';
    if (phase === 'sheet') { P.who = who || P.who; renderMoods(); }
    if (phase !== 'film') { show(el.cap, false); show(el.speech, false); el.msg.classList.remove('on'); if (el.scrim) el.scrim.classList.remove('on'); }
  }
  function seekTo(t) {
    P.ft = t; P.evi = seek(EV, t); P.wipe = 0;
    /* the beds follow the shot when we jump */
    if (t >= T_HILL) { Snd.bedLevel(0.7, 0.3); Snd.setWind(0.55); Snd.rotor(0.3, 0.3); }
    else if (t >= 12.6) { Snd.bedLevel(0.12, 0.3); Snd.rotor(1, 0.3); }
    else { Snd.bedLevel(t >= T_WORK ? 0.12 : 0, 0.3); Snd.rotor(0, 0.3); }
  }
  function startFilm(t) { seekTo(t || 0); go('film'); }

  /* ---------- the moods on the close-up sheet ---------- */
  var MOODS = {
    beep: [['happy', 'Happy'], ['think', 'Thinking'], ['sad', 'Sad'], ['asleep', 'Asleep']],
    lamb: [['scared', 'Scared'], ['safe', 'Safe'], ['bleat', 'Bleating']],
    nuala: [['torch', 'With the torch'], ['walk', 'Walking']]
  };
  function renderMoods() {
    var list = MOODS[P.who], ok = false, i;
    for (i = 0; i < list.length; i++) if (list[i][0] === P.mood) ok = true;
    if (!ok) P.mood = list[0][0];
    el.moods.innerHTML = '';
    list.forEach(function (m) { var b = document.createElement('button'); b.type = 'button'; b.className = 'tog' + (m[0] === P.mood ? ' on' : ''); b.textContent = m[1]; b.addEventListener('click', function () { P.mood = m[0]; renderMoods(); if (m[0] === 'bleat') { P.bleatAt = performance.now() / 1000; Snd.bleat(false, 1); } if (P.who === 'beep') Snd.chirp(m[0] === 'sad' ? 'sad' : m[0] === 'think' ? 'think' : m[0] === 'asleep' ? 'sad' : 'happy'); }); el.moods.appendChild(b); });
    el.sheetName.textContent = P.who === 'beep' ? 'BEEP, the Workshop’s drone' : P.who === 'lamb' ? 'The lamb' : 'Nuala, by distance';
  }

  /* ---------- drawing ---------- */
  function beepParams(t, wall) {
    /* on the pad asleep, then waking: eye, ring, antenna, rotors, lift, the look at us */
    var open = smooth((t - 9.0) / 1.4) * (1 - 0.8 * hump(t, 9.7, 0.5)), gl = smooth((t - 10.0) / 0.8), ant = smooth((t - 10.2) / 0.9), rot = smooth((t - 12.6) / 1.0);
    var lift = smooth((t - 13.2) / 1.3), toUs = smooth((t - 13.8) / 0.6), look = t < 13.8 ? [0.6 * Math.sin(t * 1.3), -0.2 + 0.3 * Math.cos(t * 0.9)] : [0, 0.1];
    return { t: wall, open: open, blink: open > 0.9 ? blinkAt(wall, 3.4, 0.7) : 0, look: look, mood: lerp(0.15, 0.85, toUs), glow: gl, rotor: rot, antenna: ant, cheeks: toUs, hover: lift, tilt: -0.10 * toUs + 0.03 * Math.sin(wall * 1.7) * lift, torch: 0, think: 0, lift: lift };
  }
  function drawMessageBackdrop(t, wall) {
    Sc.workshop({ t: wall, lamp: 0.10, awake: 0, draw: function (c) { drawBeepOnPad(c, { t: wall, open: 0, glow: 0, rotor: 0, antenna: 0, cheeks: 0, hover: 0, mood: 0 }, 0); } });
  }
  function drawBeepOnPad(c, p, lift) {
    c.save(); c.translate(800, lerp(420, 285, lift)); c.scale(108, 108);
    if (lift > 0.02) { c.fillStyle = 'rgba(0,0,0,' + 0.18 * lift + ')'; c.beginPath(); c.ellipse(0, 1.3 + 1.3 * lift, 1.1 - 0.3 * lift, 0.25 - 0.08 * lift, 0, 0, TAU); c.fill(); }
    C.beep(c, p); c.restore();
  }
  function draw(t, wall) {
    Sc.begin();
    if (P.phase === 'sheet') { drawSheet(wall); return; }
    if (t < T_WORK) { drawMessageBackdrop(t, wall); }
    else if (t < T_HILL) {
      var bp = beepParams(t, wall), lamp = smooth((t - T_WORK) / 0.9);
      Sc.workshop({ t: wall, lamp: lamp, awake: t >= 9.0 ? 1 : 0, draw: function (c) { drawBeepOnPad(c, bp, bp.lift); } });
    } else {
      var cam = track(CAM, t), dusk = lerp(0.38, 0.62, clamp((t - T_HILL) / (T_END - T_HILL), 0, 1)), wind = 0.45 + 0.3 * Math.sin(wall * 0.7) + 0.2 * Math.sin(wall * 1.9 + 2);
      var near = t >= T_CLOSE - 0.5 ? NEAR : null, close = smooth((t - T_CLOSE) / 2.2);
      var bl = 0, breath = 0, i;
      for (i = 0; i < BLEATS.length; i++) { var b0 = BLEATS[i][0], d = BLEATS[i][1]; bl = Math.max(bl, hump(t, b0, d)); var u = (t - b0 - d * 0.3) / 1.6; if (u > 0 && u < 1) breath = u; }
      Sc.hill({ t: wall, dusk: dusk, wind: wind, cam: cam, prints: PRINTS, near: near,
        nuala: { x: 790 + 6 * Math.sin(wall * 0.5), y: 598, s: 20, ang: -0.25 + 0.4 * Math.sin(wall * 0.8), walk: 0.4 },
        draw: function (c) {
          if (!near) return;
          /* the drone's torch finds her as the shot settles */
          if (close > 0) { var g = c.createRadialGradient(LAMB.x + 10, LAMB.y + 40, 0, LAMB.x + 10, LAMB.y + 40, 230); g.addColorStop(0, 'rgba(255,236,190,' + 0.30 * close + ')'); g.addColorStop(1, 'rgba(255,236,190,0)'); c.fillStyle = g; c.beginPath(); c.arc(LAMB.x + 10, LAMB.y + 40, 230, 0, TAU); c.fill(); }
          c.fillStyle = 'rgba(10,14,30,0.30)'; c.beginPath(); c.ellipse(LAMB.x + 6, LAMB.y + LAMB.s * 2.30, LAMB.s * 1.45, LAMB.s * 0.30, 0, 0, TAU); c.fill();
          c.save(); c.translate(LAMB.x, LAMB.y); c.scale(LAMB.s, LAMB.s);
          C.light.k += 0.18 * close; 
          C.lamb(c, { t: wall, fear: 0.85, safe: 0, cold: 0.8, look: [0.1, -0.45], blink: blinkAt(wall, 4.1, 1.9), bleat: bl, breath: breath, tilt: -0.18, wet: 0.7, huddle: 1 });
          c.restore();
          /* the drawn twin of the bleat: her word, in her own hand */
          for (var k = 0; k < BLEATS.length; k++) { var u2 = (wall - 0 + t - wall - BLEATS[k][0]) / 1.5; if (u2 > 0 && u2 < 1) { c.save(); c.globalAlpha = 1 - u2; c.font = '700 ' + (34 + 10 * u2) + 'px Caveat'; c.fillStyle = 'rgba(255,255,255,0.95)'; c.translate(LAMB.x + 22, LAMB.y + 36 - 40 * u2); c.rotate(-0.12); c.fillText(k ? 'baaaa' : 'baa', 0, 0); c.restore(); } }
        } });
      /* a wipe of white between the Workshop and the hill */
    }
    var wipe = hump(t, T_HILL - 0.35, 0.8);
    if (wipe > 0) { var e = Sc.edges(); ctx.fillStyle = 'rgba(240,244,255,' + wipe + ')'; ctx.fillRect(e.l, e.t, e.r - e.l, e.b - e.t); }
    /* the twin of the buzz: the whole picture shivers twice */
    var bz = hump(t, 0.25, 0.4) + hump(t, 0.8, 0.4);
    Sc.canvas.style.transform = bz > 0 ? 'translate(' + (Math.sin(wall * 90) * 4 * bz) + 'px,' + (Math.cos(wall * 70) * 2 * bz) + 'px)' : '';
  }
  function drawSheet(wall) {
    var e = Sc.edges(), g = ctx.createRadialGradient(800, 380, 100, 800, 450, 900); g.addColorStop(0, '#2a3144'); g.addColorStop(1, '#0d1018');
    ctx.fillStyle = g; ctx.fillRect(e.l, e.t, e.r - e.l, e.b - e.t);
    C.light.k = 1; C.light.cool = 0.05; C.light.warm = 0.1;
    ctx.save(); ctx.translate(800, 440);
    if (P.who === 'beep') {
      var m = P.mood, p = { t: wall, look: [0.15 * Math.sin(wall * 0.8), 0.1], blink: blinkAt(wall, 3.6, 0.4), mood: m === 'sad' ? -0.9 : m === 'think' ? 0 : m === 'asleep' ? 0 : 0.85, glow: m === 'asleep' ? 0 : 1, rotor: m === 'asleep' ? 0 : m === 'sad' ? 0.5 : 1, antenna: m === 'sad' || m === 'asleep' ? 0 : 1, cheeks: m === 'happy' ? 1 : 0.3, open: m === 'asleep' ? 0 : 1, think: m === 'think' ? 1 : 0, hover: m === 'asleep' ? 0 : 1 };
      if (m === 'think') p.look = [0.7, -0.5];
      ctx.scale(210, 210); C.beep(ctx, p);
    } else if (P.who === 'lamb') {
      var mm = P.mood, bl = 0, br = 0;
      if (mm === 'bleat' && P.bleatAt) { var u = wall - P.bleatAt; bl = hump(u, 0, 0.8); var v = (u - 0.25) / 1.6; if (v > 0 && v < 1) br = v; }
      ctx.translate(0, -60); ctx.scale(120, 120);
      C.lamb(ctx, { t: wall, fear: mm === 'safe' ? 0 : 0.85, safe: mm === 'safe' ? 1 : 0, cold: mm === 'safe' ? 0.2 : 0.8, look: mm === 'safe' ? [0.05, -0.05] : [0.1, -0.4], blink: blinkAt(wall, 4.2, 1.1), bleat: bl, breath: br, tilt: mm === 'safe' ? 0.08 : -0.16, wet: mm === 'safe' ? 0 : 0.7, huddle: mm === 'safe' ? 0 : 0.6 });
    } else {
      ctx.translate(0, -40); ctx.scale(150, 150); C.nuala(ctx, { t: wall, torch: -0.2 + 0.3 * Math.sin(wall * 0.8), phone: 1, walk: P.mood === 'walk' ? 1 : 0 });
    }
    ctx.restore();
  }

  /* ---------- the words over the picture ---------- */
  function words(t) {
    var i, on = false;
    for (i = 0; i < CAPS.length; i++) if (t >= CAPS[i][0] && t < CAPS[i][1]) { el.cap.textContent = CAPS[i][2]; on = true; }
    show(el.cap, on); on = false;
    for (i = 0; i < SAYS.length; i++) if (t >= SAYS[i][0] && t < SAYS[i][1]) { el.say.textContent = SAYS[i][2]; on = true; }
    show(el.speech, on);
    if (on) { var s = Sc.scaleOf(), lift = smooth((t - 13.2) / 1.3); el.speech.style.left = (s.ox + (800 + 215) * s.k) + 'px'; el.speech.style.top = (s.oy + (lerp(420, 285, lift) + 25) * s.k) + 'px'; }
    var m = t < T_WORK;
    el.msg.classList.toggle('on', m); el.msg.classList.toggle('in', t >= 0.5); el.msg.classList.toggle('photo', t >= 2.3); el.msg.classList.toggle('note', t >= 3.6); el.msg.classList.toggle('out', t >= T_WORK - 0.7);
    if (el.scrim) el.scrim.classList.toggle('on', m && t >= 0.5 && t < T_WORK - 0.7);
  }

  /* ---------- the clock ---------- */
  var wall0 = performance.now() / 1000, photoDone = false;
  function frame(now) {
    var wall = now / 1000 - wall0, dt = Math.min(0.05, wall - P.last); P.last = wall;
    if (P.playing && !OPT.freeze) {
      P.ft += dt;
      while (P.evi < EV.length && EV[P.evi][0] <= P.ft) { EV[P.evi][1](); P.evi++; }
      if (P.ft >= T_END) { P.playing = false; go('end'); }
    }
    if (P.phase === 'film' || P.phase === 'end') { draw(P.ft, wall); if (P.phase === 'film') words(P.ft); }
    else if (P.phase === 'sheet') draw(0, wall);
    else if (P.phase !== 'off') { Sc.begin(); } /* 'off' = the hour page owns the canvas; the film must not clear it (hour/ui.js frame loop) */
    if (!photoDone && el.pc) { var pc = el.pc.getContext('2d'); pc.setTransform(2, 0, 0, 2, 0, 0); Sc.photo(pc, 360, 270, wall); if (wall > 0.5) photoDone = true; }
    requestAnimationFrame(frame);
  }

  function init() {
    ['call', 'read', 'tSound', 'snd', 'cap', 'speech', 'say', 'msg', 'scrim', 'pc', 'nav', 'back', 'next', 'end', 'endmsg', 'again', 'bBeep', 'bLamb', 'bNuala', 'sheet', 'moods', 'sheetName', 'sheetBack'].forEach(function (id) { el[id] = document.getElementById(id); });
    Sc.size(); window.addEventListener('resize', Sc.size);
    if (document.fonts && document.fonts.load) { document.fonts.load('700 40px Caveat'); document.fonts.load('500 20px "Space Grotesk"'); }
    if (OPT.mute) { Snd.disable(); }
    el.read.addEventListener('click', function () { Snd.start(); setSound(!soundOff); startFilm(0); });
    el.tSound.addEventListener('click', function () { setSound(soundOff); });
    el.snd.addEventListener('click', function () { setSound(soundOff); });
    el.back.addEventListener('click', function () { if (P.phase === 'sheet') { go('end'); return; } var i = seek(SHOTS, P.ft - 0.5) - 1; startFilm(SHOTS[Math.max(0, i)]); });
    el.next.addEventListener('click', function () { if (P.phase === 'sheet') { go('end'); return; } var i = seek(SHOTS, P.ft + 0.01); if (i >= SHOTS.length) { P.ft = T_END; go('end'); } else startFilm(SHOTS[i]); });
    el.again.addEventListener('click', function () { startFilm(0); });
    el.bBeep.addEventListener('click', function () { go('sheet', 'beep'); });
    el.bLamb.addEventListener('click', function () { go('sheet', 'lamb'); });
    el.bNuala.addEventListener('click', function () { go('sheet', 'nuala'); });
    el.sheetBack.addEventListener('click', function () { go('end'); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'ArrowRight') el.next.click(); else if (ev.key === 'ArrowLeft') el.back.click(); else if (ev.key === ' ' && P.phase === 'film') { P.playing = !P.playing; ev.preventDefault(); } });
    if (OPT.sheet) { if (OPT.mood) P.mood = OPT.mood; go('sheet', OPT.sheet); }
    else if (OPT.auto) { startFilm(OPT.t0); }
    else go('call');
    P.last = performance.now() / 1000 - wall0;
    requestAnimationFrame(frame);
  }
  /* the stage transform, for placing words beside a drawn thing */
  Sc.scaleOf = function () { var e = Sc.edges(); var k = window.innerWidth / (e.r - e.l); return { k: k, ox: -e.l * k, oy: -e.t * k }; };
  window.SearchFilm = { P: P, OPT: OPT, seekTo: seekTo, startFilm: startFilm, go: go, soundState: soundState, T: { work: T_WORK, hill: T_HILL, close: T_CLOSE, end: T_END } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
