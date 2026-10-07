/* The Rescue, the whole hour: the core. It takes over when chapter 1 (frozen, K55) reaches its
   safe ending, and runs the later chapters on chapter 1's canvas. Chapter 1's files are not edited.
   This file holds: the step engine, the saved place, the lightning, the caption, Blink's bubble,
   the typing card, her function panel, the closing screens, the strip of four chapters.
   The story itself is in hour-river.js, hour-lane.js and hour-door.js.
   Every on-screen string comes from J3_L4_RESCUE_SPEC.md. */
(function () {
  'use strict';
  var Sc = window.RescueScene, Snd = window.RescueSound, HS = window.HourScene, Au = window.HourSound;
  /* the test options come only through the bridge, and only on the gates' copy of the page (hour-bridge.js) */
  var B = window.RescueBridge, q = B.q;
  function $(id) { return document.getElementById(id); }
  function num(k, d) { var v = parseFloat(q.get(k)); return isNaN(v) ? d : v; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  /* code inside a sentence is set in the code face */
  function rich(t) { return esc(t).replace(/def \w+\([^)]*\):|\b\w+\((?:"[^"]*"|\w*)\)|\bdef\b|\bfor \w+ in \w+:/g, '<code>$&</code>'); }
  function words(t) { return String(t).trim().split(/\s+/).length; }
  /* how long a line stays up: his rule, at least 1.2 s and 0.35 s for each word */
  function dur(t) { return 1.5 + 0.35 * words(t); }

  var OPT = { jump: q.get('h'), freeze: q.has('hfreeze'), ht: num('ht', -1), name: q.get('hname'), min: num('hmin', 0),
    mute: q.has('mute'), noflash: q.has('noflash'), speed: num('hspeed', 1), fresh: q.has('hfresh'), nobadge: q.has('nobadge') };
  if (OPT.freeze) document.body.classList.add('h-still'); /* a frozen picture never catches a card half way in */
  var el = {}, want = {}, body = document.body;
  var H = window.Hour = { steps: {}, order: [], id: null, cur: null, t: 0, rt: 0, st: 60, on: false, OPT: OPT, el: el, calm: false,
    V: { scene: 'black', st: 60, t: 0, flash: 0, boltIdx: -1, dark: 0, chars: {} }, input: null, seq: null,
    clamp: clamp, lerp: lerp, smooth: smooth, esc: esc, rich: rich, words: words, dur: dur };

  /* ---------- her saved place: the platform keeps it in her lesson draft, through the bridge ---------- */
  var save = H.save = { step: null, name: '', fails: {}, t0: Date.now(), data: {} };
  var old = B.saved; if (old) { for (var kk in old) save[kk] = old[kk]; }
  /* her lesson clock: kept across a reload in the same lesson; a place saved more than 90 minutes ago is another lesson, so it starts again */
  if (!(save.t0 > Date.now() - 90 * 60000)) save.t0 = Date.now();
  if (OPT.name) save.name = OPT.name;
  function store() { B.store(save); }
  H.store = store;
  H.forget = function () { B.forget(); };
  H.name = function () { return save.name || 'Spike'; };

  /* ---------- steps ---------- */
  H.def = function (id, step) { step.id = id; H.steps[id] = step; H.order.push(id); };
  H.go = function (id, arg) {
    var s = H.steps[id]; if (!s) { console.error('no step', id); return; }
    if (H.cur && H.cur.exit) H.cur.exit();
    want = {}; H.input = null; H.seq = null; H.onFrame = null; H.onRun = null; firstKey = null;
    H.cur = s; H.id = id; H.t = 0; H.arg = arg || {};
    if (s.save) { save.step = id; store(); }
    cls(el.hfn, 'big', false);
    s.enter(H.arg);
    if (!want.card) H.card(null); if (!want.fn) H.fn(null); if (!want.say) H.say(null); if (!want.cap) H.cap(null);
    if (!want.pages) pagesOff(); if (!want.prints) H.prints(null); if (!want.lane) H.lane(null);
    strip(s.ch == null ? 0 : s.ch);
    if (OPT.freeze && OPT.ht >= 0) H.t = OPT.ht;
  };
  /* a run of timed pieces: [{ d: seconds, gap: seconds before, s: start, f: fn(u 0..1), e: end }] */
  H.run = function (segs, done) {
    var t = 0; segs.forEach(function (g) { g.t0 = t + (g.gap || 0); t = g.t0 + (g.d || 0); g.on = g.off = false; });
    H.seq = { segs: segs, base: H.t, len: t, done: done, fin: false };
  };
  function runSeq() {
    var Q = H.seq; if (!Q) return; var t = H.t - Q.base, i, g, u;
    for (i = 0; i < Q.segs.length; i++) {
      g = Q.segs[i]; if (t < g.t0 || g.off) continue;
      if (!g.on) { g.on = true; if (g.s) g.s(); if (H.seq !== Q) return; }
      u = g.d > 0 ? clamp((t - g.t0) / g.d, 0, 1) : 1;
      if (g.f) g.f(u);
      if (u >= 1) { g.off = true; if (g.e) g.e(); if (H.seq !== Q) return; }
    }
    if (t >= Q.len && !Q.fin) { Q.fin = true; if (Q.done) Q.done(); }
  }
  /* a film: [{ cap | say: text, d, cam: {x,y,z}, camD, s, f, e }]. The camera eases to each beat's place. */
  H.film = function (beats, done) {
    var segs = [], from = { x: H.V.cam.x, y: H.V.cam.y, z: H.V.cam.z };
    beats.forEach(function (b) {
      var text = b.cap || b.say || '', d = Math.max(b.d || 0, text ? dur(text) : 0), a = from, to = b.cam || from, cd = b.camD || Math.min(d, 2.2);
      segs.push({ d: d, gap: b.gap == null ? 0.45 : b.gap,
        s: function () { if (b.cap) H.cap(b.cap); else H.cap(null); if (b.say) H.say(b.say); else H.say(null); if (b.s) b.s(); },
        f: function (u) { var c = smooth(clamp(u * d / cd, 0, 1)); H.V.cam = { x: lerp(a.x, to.x, c), y: lerp(a.y, to.y, c), z: lerp(a.z, to.z, c) }; if (b.f) b.f(u, u * d); },
        e: function () { H.cap(null); H.say(null); if (b.e) b.e(); } });
      from = to;
    });
    H.run(segs, done);
  };

  /* ---------- small DOM helpers ---------- */
  function cls(e, c, on) { if (e) e.classList.toggle(c, !!on); }
  H.cls = cls;
  H.cap = function (text) { want.cap = !!text; if (text) el.hcap.textContent = text; cls(el.hcap, 'on', !!text); };
  /* Blink speaks. at: 'blink' (her head in the scene) or 'owl' (her large head on the black screen) */
  H.say = function (text, at) { want.say = !!text; if (text) { el.hsayt.innerHTML = rich(text); sayAt = at || 'blink'; placeSay(); } cls(el.hsay, 'on', !!text); };
  var sayAt = 'blink';
  function placeSay() {
    var p, b = H.V.blink, rem = Sc.k * 16, w = el.hsay.offsetWidth || 25 * rem;
    if (sayAt === 'owl') { p = HS.owlAt(); p = [p[0] + p[2] * 1.5, p[1] - p[2] * 0.2]; }
    else if (b) { var s = b.s || 23; p = HS.screen(H.V.cam, b.x + s * 1.25, b.y - 2.6 * s); }
    else p = [Sc.W * 0.3, Sc.H * 0.3];
    var cardLeft = body.classList.contains('h-card') ? Sc.W - 24.4 * rem : Sc.W - rem, left = p[0] + 1.1 * rem, flip = left + w > cardLeft;
    if (flip) left = p[0] - (sayAt === 'owl' ? 3 : 2.5) * 23 * Sc.k - w - 1.1 * rem;
    cls(el.hsay, 'flip', flip);
    el.hsay.style.left = Math.max(0.5 * rem, left).toFixed(1) + 'px';
    el.hsay.style.top = Math.max(0.5 * rem, p[1] - 2.95 * rem).toFixed(1) + 'px';
  }
  H.strip = strip;
  function strip(n) {
    cls(el.hstrip, 'on', n > 0);
    for (var i = 0; i < 4; i++) { var s = el.hstrip.children[i]; s.className = i + 1 < n ? 'done' : i + 1 === n ? 'now' : ''; }
  }

  /* ---------- the card ---------- */
  /* o = { k, h, lines: [text], now: index, sub, help: [text], run: label, short } */
  H.card = function (o) {
    want.card = !!o; cls(el.hcard, 'on', !!o); cls(body, 'h-card', !!o);
    if (!o) { H.gauge(null); return; }
    el.hk.textContent = o.k || ''; el.hh.innerHTML = rich(o.h || '');
    el.hlines.innerHTML = '';
    (o.lines || []).forEach(function (t, i) { var li = document.createElement('li'); li.textContent = t; li.className = i < o.now ? 'done' : i === o.now ? 'now' : ''; el.hlines.appendChild(li); });
    el.hsub.innerHTML = o.sub ? rich(o.sub) : '';
    H.help(o.help || []);
    cls(el.hfb, 'short', !!o.short);
    cls(el.hrun, 'on', !!o.run); if (o.run) el.hrun.textContent = o.run; el.hrun.disabled = !!o.runOff;
    if (!o.keepFb) H.fb('', '');
    if (!o.gauge) H.gauge(null);
    el.hprompt.style.display = o.noBox ? 'none' : '';
  };
  H.help = function (list) { el.hhelp.innerHTML = list.map(function (t) { return '<span>' + rich(t) + '</span>'; }).join('<br>'); };
  H.fb = function (msg, kind) { el.hfb.innerHTML = rich(msg || ''); el.hfb.className = 'fb' + (kind ? ' ' + kind : '') + (el.hfb.classList.contains('short') ? ' short' : ''); };
  function jolt(msg) { Snd.move('wrong'); H.fb(msg, 'bad'); el.hcard.classList.remove('jolt'); void el.hcard.offsetWidth; el.hcard.classList.add('jolt'); }
  H.jolt = jolt;
  /* a whole outlined gauge with its label (DFM 298). frac is what is LEFT, 1 to 0. */
  H.gauge = function (o) {
    cls(el.hgauge, 'on', !!o); if (!o) return;
    el.hgl.textContent = o.label; el.hgb.style.width = (clamp(o.frac, 0, 1) * 100).toFixed(1) + '%'; cls(el.hgb.parentNode, 'low', o.frac < 0.34);
  };
  /* the Run button lights when her code is ready. Enter on an empty line presses it. */
  H.runReady = function (on) { el.hrun.disabled = !on; };
  function runKey() { return !!(H.onRun && el.hrun.classList.contains('on') && !el.hrun.disabled && !PG); }
  /* the words her code prints, one at a time. words = [{ w, c: 'hot' | 'done' | 'bad' }] */
  H.prints = function (words) {
    want.prints = !!words; cls(el.hprints, 'on', !!words); cls(body, 'h-prints', !!words); cls(el.hlane, 'up', !!words);
    if (!words) return;
    el.hprints.innerHTML = '<div class="k">WHAT YOUR CODE PRINTS</div><div class="row">' + words.map(function (x) { return '<span class="' + (x.c || '') + '">' + esc(x.w) + '</span>'; }).join('') + '</div>';
  };
  /* the lane strip: the river, 5 stretches and home, with the storm coming up it from the river.
     o = { label, front, gang, logs, lit, plan: stretches her plan covers, low }. front and gang are 0 to 1 along the lane. */
  var laneEl = null;
  H.lane = function (o) {
    want.lane = !!o; cls(el.hlane, 'on', !!o); cls(body, 'h-lane', !!o); if (!o) return;
    var i, h;
    if (!laneEl) {
      h = '<p class="tl"></p><div class="trk"><i class="riv"></i><div class="ln">';
      for (i = 0; i < 5; i++) h += '<i class="st" style="left:' + (i * 20) + '%"></i>';
      for (i = 2; i < 5; i++) h += '<i class="lg" style="left:' + ((i + 0.55) * 20) + '%"></i>';
      h += '<i class="sto"></i><i class="gg"></i></div><i class="hm"></i></div><div class="ends"><span>The river</span><span>Home</span></div>';
      el.hlane.innerHTML = h;
      laneEl = { tl: el.hlane.querySelector('.tl'), sto: el.hlane.querySelector('.sto'), gg: el.hlane.querySelector('.gg'), st: el.hlane.querySelectorAll('.st') };
    }
    var f = clamp(o.front || 0, 0, 1), g = clamp(o.gang || 0, 0, 1), label = o.label || 'The lane home';
    if (laneEl.tl.textContent !== label) laneEl.tl.textContent = label;
    laneEl.sto.style.width = 'calc(' + (f > 0 ? 2.2 : 1.2) + 'rem + ' + (f * 100).toFixed(2) + '%)';
    laneEl.gg.style.left = (g * 100).toFixed(2) + '%';
    cls(el.hlane, 'logs', !!o.logs); cls(el.hlane, 'lit', !!o.lit); cls(el.hlane, 'low', !!o.low);
    for (i = 0; i < 5; i++) cls(laneEl.st[i], 'pl', i < (o.plan || 0));
  };
  /* she types. o = { judge(text) -> { ok, msg }, pre, good(res, text), bad(res, text, tries), key() on her first key, empty: true to judge an empty line } */
  var firstKey = null;
  H.ask = function (o) {
    H.input = o; o.tries = 0; firstKey = o.key || null;
    el.hpr.textContent = o.pre ? '...' : '>>>';
    cls(el.hprompt, 'wait', false); el.hinp.disabled = false; el.hinp.value = o.pre || '';
    if (!OPT.freeze) el.hinp.focus({ preventScroll: true });
  };
  H.wait = function () { H.input = null; cls(el.hprompt, 'wait', true); el.hinp.value = ''; el.hinp.disabled = true; };
  function submit(text) {
    var o = H.input; if (!o) return;
    var t = window.HourJudge.norm(text);
    if (!t && !o.empty) return;
    var res = o.judge(text);
    if (!res.ok) { o.tries++; jolt(res.msg); el.hinp.value = o.pre || ''; if (o.bad) o.bad(res, text, o.tries); return; }
    Snd.move('check'); H.fb(res.msg || '', 'good'); H.input = null; el.hinp.value = '';
    o.good(res, text);
  }
  H.submit = submit;

  /* ---------- her function, kept in view ---------- */
  H.fn = function (html, note, k) { want.fn = !!html; cls(el.hfn, 'on', !!html); if (html) { el.hfnl.innerHTML = html; el.hfnnote.textContent = note || ''; el.hfnk.textContent = k || 'YOUR FUNCTION'; } };
  /* a word travels from one place on the screen to another */
  H.fly = function (text, from, to, secs, done) {
    var a = from.getBoundingClientRect ? from.getBoundingClientRect() : from, b = to.getBoundingClientRect ? to.getBoundingClientRect() : to, f = el.hfly;
    f.textContent = text; f.style.opacity = 1;
    var x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2, w = f.offsetWidth, h = f.offsetHeight, t0 = H.rt;
    H.onFrame = function () {
      var u = clamp((H.rt - t0) / secs, 0, 1), c = smooth(u);
      f.style.transform = 'translate(' + (lerp(x0, x1, c) - w / 2).toFixed(1) + 'px,' + (lerp(y0, y1, c) - h / 2 - Math.sin(u * Math.PI) * 60 * Sc.k).toFixed(1) + 'px)';
      if (u >= 1) { H.onFrame = null; f.style.opacity = 0; if (done) done(); }
    };
    H.onFrame();
  };

  /* ---------- closing screens: Back and Next, a question opens Next only when answered right ---------- */
  var PG = null;
  /* pages = [{ html, after(el), q: { opts: [{ t, code, right, fb }] } }] */
  H.pages = function (pages, done, at) {
    want.pages = true; PG = { pages: pages, i: at || 0, done: done, ok: {} };
    cls(el.hnav, 'on', true); showPage();
  };
  function pagesOff() { PG = null; cls(el.hover, 'on', false); cls(el.hnav, 'on', false); cls(el.hnav, 'bare', false); }
  /* a bare page (his look, 6 Oct): no dark screen. The scene and the panel stay in view, Blink says p.say, p.s() starts the page,
     p.f(t) runs it every frame with t in story seconds since the page opened, and Next stays off until p.d seconds have passed. */
  function showPage() {
    var p = PG.pages[PG.i]; PG.t0 = H.t; PG.open = false;
    cls(el.hover, 'on', !p.bare); cls(el.hnav, 'bare', !!p.bare);
    if (p.bare) { el.hp.innerHTML = ''; H.onFrame = null; el.hfly.style.opacity = 0; H.prints(null); H.say(p.say || null); if (p.s) p.s(); }
    else el.hp.innerHTML = p.html;
    if (p.q) {
      var box = el.hp.querySelector('.opts'), fbEl = el.hp.querySelector('.qfb'), opts = p.q.opts.slice(), i, j, x;
      if (!p.q.order) { p.q.order = opts.map(function (o, n) { return n; }); if (!OPT.freeze) for (i = opts.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); x = p.q.order[i]; p.q.order[i] = p.q.order[j]; p.q.order[j] = x; } }
      p.q.order.forEach(function (n) {
        var o = p.q.opts[n], b = document.createElement('button'); b.type = 'button'; b.className = 'hopt' + (o.code ? ' code' : ''); b.textContent = o.t;
        b.addEventListener('click', function () {
          fbEl.innerHTML = rich(o.fb); fbEl.className = 'qfb ' + (o.right ? 'good' : 'bad'); cls(b, o.right ? 'right' : 'wrong', true);
          Snd.move(o.right ? 'check' : 'wrong'); if (o.right) { PG.ok[PG.i] = true; navState(); }
        });
        box.appendChild(b);
      });
      if (PG.ok[PG.i]) { var r = p.q.opts.filter(function (o) { return o.right; })[0]; fbEl.innerHTML = rich(r.fb); fbEl.className = 'qfb good'; }
    }
    if (p.after) p.after(el.hp);
    navState();
  }
  function navState() { var p = PG.pages[PG.i]; el.hback.disabled = PG.i === 0 || !!p.noBack; el.hnext.disabled = (!!p.q && !PG.ok[PG.i]) || !!(p.lock && p.lock()) || (p.d != null && H.t - PG.t0 < p.d); el.hnext.textContent = p.next || 'Next'; }
  function pageTick() { var p = PG.pages[PG.i], t = H.t - PG.t0; if (p.f) p.f(t); if (p.d != null && !PG.open && t >= p.d) { PG.open = true; navState(); } }
  function pageNext() { if (!PG || el.hnext.disabled) return; Snd.move('mark'); if (PG.i < PG.pages.length - 1) { PG.i++; showPage(); } else { var d = PG.done; d(); } }
  function pageBack() { if (!PG || PG.i === 0) return; Snd.move('mark'); PG.i--; showPage(); }
  H.pageAt = function () { return PG ? PG.i : -1; };
  /* a page with its own tap handling (Blink's last 5 questions) holds Next with lock() and asks for a fresh look */
  H.navState = function () { if (PG) navState(); };

  /* ---------- lightning, on the hour's own storm clock ---------- */
  var lastStrike = -1, forced = -9, lastWind = 0;
  H.flashNow = function (big) { forced = H.st; if (!OPT.mute) Snd.thunder(!!big, big ? 0 : 0.3); };
  function lightning() {
    var V = H.V, sk = Sc.strike(H.st), take = !H.calm || sk.idx % 3 === 0, f = OPT.noflash ? Sc.softFlashAt : Sc.flashAt;
    if (H.quiet) take = false;
    V.flash = take ? f(sk.age) : 0; V.boltIdx = take ? sk.idx : -1;
    if (sk.idx !== lastStrike) { lastStrike = sk.idx; if (take && sk.age < 0.5 && H.rt > 0.5) Snd.thunder(false, 0.35); }
    var fa = H.st - forced; if (fa >= 0 && fa < 1.2) { V.flash = Math.max(V.flash, f(fa)); if (V.boltIdx < 0) V.boltIdx = 2; }
    if (H.rt - lastWind > 0.2) { lastWind = H.rt; Snd.setWind(clamp(Sc.wind(H.st) * 0.55 + Sc.gust(H.st) * 0.5, 0, 1) * (H.windAmt == null ? 1 : H.windAmt)); }
  }

  /* ---------- taking over from chapter 1 ---------- */
  var F = null, sounding = false, bed = { storm: 0.3, river: 0, indoors: 0, fire: 0 }, c1draw = null, c1fade = -1;
  /* the beds under a scene: storm (chapter 1's rain and wind), river, the storm heard indoors, the fire. 0 to 1. */
  H.beds = function (o, secs) {
    for (var n in o) bed[n] = o[n];
    if (!sounding) return;
    Snd.stormLevel(bed.storm, secs || 1.5); Snd.fxLevel(1, 0.3);
    if (bed.river > 0) Au.river(bed.river, secs || 1.2); else Au.riverOff(secs || 1.2);
    Au.indoors(bed.indoors, secs || 1); Au.fire(bed.fire, secs || 1.5);
  };
  function soundOn() {
    if (!H.on || sounding || OPT.mute || OPT.freeze || H.paused) return; sounding = true;
    Snd.start(); Au.start(); H.beds({}, 0.8);
  }
  /* chapter 1 has reached its safe ending: its picture fades to black, then the hour begins */
  function leaveC1() {
    c1fade = 0; c1draw = Sc.draw; cls(body, 'h-on', true); cls(body, 'h-win', false);
    Sc.draw = function (S) { S.dark = Math.max(S.dark || 0, smooth(c1fade / 0.9)); c1draw.call(Sc, S); };
  }
  function takeover(fromC1) {
    if (H.on) return; H.on = true;
    F.OPT.freeze = true; Sc.draw = function () {};
    cls(body, 'h-on', true); cls(body, 'h-win', false);
    H.st = F.P.st > 1 ? F.P.st : 60;
    if (fromC1) soundOn();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  H.takeover = takeover;

  /* ---------- pause (his look, 6 Oct): the clock, the story, the sound and the keys all stop. Chapter 1 included. ---------- */
  H.paused = false;
  var pausedAt = 0, c1freeze = null;
  H.pause = function () {
    if (H.paused) return;
    H.paused = true; pausedAt = Date.now();
    if (F && !H.on) { c1freeze = F.OPT.freeze; F.OPT.freeze = true; }
    Snd.pause(); Au.pause();
    cls(el.hpaused, 'on', true); cls(body, 'h-paused', true);
    el.hpgo.focus({ preventScroll: true });
  };
  H.unpause = function () {
    if (!H.paused) return;
    H.paused = false;
    if (F && !H.on && c1freeze != null) { F.OPT.freeze = c1freeze; c1freeze = null; }
    /* her lesson clock does not count the paused minutes */
    save.t0 += Date.now() - pausedAt; if (H.on) store();
    Snd.unpause(); Au.unpause();
    cls(el.hpaused, 'on', false); cls(body, 'h-paused', false);
    if (H.on && H.input && !PG) el.hinp.focus({ preventScroll: true });
  };

  /* ---------- a badge earned (his look, 6 Oct): the platform's own badge pop, drawn here. Once earned, always hers. ---------- */
  H.badge = function (o, done) {
    var had = save.data.badges || (save.data.badges = {});
    if (had[o.id] || OPT.nobadge) { done(); return; }
    had[o.id] = true; store(); B.badge(o);
    el.hbname.textContent = o.name; el.hbxp.textContent = '+' + o.xp + ' XP';
    if (H.icon) H.icon(el.hbicon, o.kind);
    cls(el.hbadge, 'on', true); Snd.move('safe');
    el.hbgo.onclick = function () { el.hbgo.onclick = null; cls(el.hbadge, 'on', false); done(); };
    el.hbgo.focus({ preventScroll: true });
  };

  /* ---------- the loop ---------- */
  var last = 0, ready = 0, muted = null, TITLE = document.title;
  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, Math.max(0, (ts - last) / 1000)); last = ts;
    if (!F) { F = window.__film; if (!F) return; boot(); }
    if (H.paused) dt = 0;
    if (!H.on) {
      var P = F.P;
      /* chapter 1: the pause pill shows when its sound pill shows. A frozen chapter 1 writes 'ready' into the tab: nobody sees that */
      el.hpause.style.opacity = el.snd.style.opacity; el.hpause.style.visibility = el.snd.style.visibility;
      if (H.paused && document.title !== TITLE) document.title = TITLE;
      if (c1fade >= 0) { c1fade += dt; if (c1fade >= 1.1) { takeover(true); H.go('filmA'); } return; }
      cls(body, 'h-win', P.phase === 'end' && P.endOf === 'win');
      if (P.phase === 'end' && P.endOf === 'safe') leaveC1();
      return;
    }
    if (!OPT.freeze) { H.t += dt * OPT.speed; H.rt += dt; H.st += dt * (H.stRate == null ? 1 : H.stRate); }
    var V = H.V; V.st = H.st; V.t = H.rt;
    lightning();
    if (H.cur && H.cur.tick) H.cur.tick(H.t, OPT.freeze ? 0 : dt * OPT.speed);
    runSeq();
    if (PG) pageTick();
    if (H.onFrame) H.onFrame();
    for (var kx in V.chars) if (V.chars[kx] && V.chars[kx].p) V.chars[kx].p.t = H.rt;
    if (want.say) placeSay();
    HS.draw(V);
    var m = Snd.isMuted(); if (m !== muted) { muted = m; Au.setMuted(m); }
    Au.tick();
    if (H.input && !OPT.freeze && !PG && !H.paused && document.activeElement !== el.hinp && !el.hwelcome.classList.contains('on')) el.hinp.focus({ preventScroll: true });
    if (!H.paused) lastMinutes();
    /* chapter 1 writes 'ready' into the tab when it is frozen: the pupil never sees that */
    if (document.title !== TITLE) document.title = TITLE;
    if (OPT.freeze && ++ready === 8) window.__hready = true;
  }

  /* ---------- the last minutes of her lesson (spec section 11) ---------- */
  function lastMinutes() {
    var mins = (Date.now() - save.t0) / 60000 + OPT.min, s = H.cur;
    cls(el.hlast, 'on', mins >= 48 && s && s.ch >= 2 && s.ch <= 4 && !PG && !save.data.quizDone);
  }

  /* ---------- start-up ---------- */
  var CH = { 2: 'chapter 2, the river', 3: 'chapter 3, the lane', 4: 'chapter 4, the door', 5: 'the end of the story' };
  function boot() {
    ['hstrip', 'hcap', 'hsay', 'hsayt', 'hfn', 'hfnk', 'hfnl', 'hfnnote', 'hcard', 'hk', 'hh', 'hlines', 'hsub', 'hprompt', 'hpr', 'hinp', 'hfb', 'hhelp', 'hgauge', 'hgl', 'hgb', 'hrun',
      'hover', 'hp', 'hnav', 'hback', 'hnext', 'hprints', 'hlane', 'hwelcome', 'hwmsg', 'hwgo', 'hlast', 'hfly',
      'hpause', 'hpaused', 'hpgo', 'hbadge', 'hbicon', 'hbname', 'hbxp', 'hbgo'].forEach(function (id) { el[id] = $(id); });
    el.snd = $('snd');
    /* paused: no key reaches the story or the typing box. Tab still moves between the buttons; Enter and space press Carry on. */
    window.addEventListener('keydown', function (e) {
      if (!H.paused) return;
      if (e.key === 'Tab' || ((e.key === 'Enter' || e.key === ' ') && e.target === el.hpgo)) return;
      e.stopImmediatePropagation(); e.preventDefault();
    }, true);
    el.hpause.addEventListener('click', function () { H.pause(); });
    el.hpgo.addEventListener('click', function () { H.unpause(); });
    el.hinp.addEventListener('keydown', function (e) {
      if (!H.input) { if (e.key === 'Enter' || e.key.length === 1) e.preventDefault(); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!H.input.empty && !window.HourJudge.norm(el.hinp.value) && runKey()) { H.onRun(); return; }
        submit(el.hinp.value); if (H.input) el.hinp.value = H.input.pre || '';
      }
      else if (e.key.length === 1) { Snd.move('key'); if (firstKey) { var fk = firstKey; firstKey = null; fk(); } }
    });
    /* no paste, no drop, no suggested text: the line is typed (DFM 297) */
    el.hinp.addEventListener('paste', function (e) { e.preventDefault(); });
    el.hinp.addEventListener('drop', function (e) { e.preventDefault(); });
    el.hinp.addEventListener('dragover', function (e) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'; });
    el.hinp.addEventListener('beforeinput', function (e) { if (/^insertFrom|^insertReplacementText$/.test(e.inputType || '')) e.preventDefault(); });
    el.hnext.addEventListener('click', pageNext); el.hback.addEventListener('click', pageBack);
    el.hrun.addEventListener('click', function () { if (H.onRun && !el.hrun.disabled) H.onRun(); });
    /* in the CAPTURE phase: hour-keys.js stops every key at the document, so a bubble listener here would never hear it */
    window.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !H.paused && e.target !== el.hinp && e.target !== el.hrun && runKey()) { e.preventDefault(); H.onRun(); } }, true);
    /* the 5 questions are the platform's own step after the story: her place is kept, so the story waits for her */
    el.hlast.addEventListener('click', function () { store(); B.done('quiz'); });
    window.addEventListener('pointerdown', soundOn, true); window.addEventListener('keydown', soundOn, true);
    if (OPT.jump && H.steps[OPT.jump]) { takeover(); H.go(OPT.jump); }
    else if (save.step && H.steps[save.step]) {
      takeover(); H.V.scene = 'black';
      el.hwmsg.textContent = 'Welcome back. You are at ' + (CH[H.steps[save.step].ch] || 'the story') + '.';
      cls(el.hwelcome, 'on', true);
      el.hwgo.addEventListener('click', function () { cls(el.hwelcome, 'on', false); soundOn(); H.go(save.step); });
    }
  }
  requestAnimationFrame(function (ts) { last = ts; frame(ts); });
})();
