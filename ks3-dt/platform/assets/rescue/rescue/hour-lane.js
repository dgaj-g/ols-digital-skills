/* The Rescue, the whole hour: chapter 3, the lane.
   Every string is from J3_L4_RESCUE_SPEC.md sections 7 and 8. Every wrong-line message comes from
   hour-judge.js. What her code does: each word it prints is a move Blink calls. run takes the three
   up the lane. jump takes them over a fallen tree. run cannot get past a fallen tree. */
/* menu: filmB|Lane: the film */
/* menu: l_mode|Lane: Blink explains */
/* menu: l_make|Lane: make dash */
/* menu: l_plan|Lane: write the plan */
/* menu: l_run1|Lane: the plan runs, 3 trees fall */
/* menu: l_lesson|Lane: Blink's lesson */
/* menu: l_mend|Lane: add 1 line (40 seconds) */
/* menu: l_run2|Lane: the mended plan runs */
/* menu: l_fail|Lane: the storm catches them */
/* menu: l_close|Lane: closing screens */
(function () {
  'use strict';
  var H = window.Hour, HS = window.HourScene, L = HS.L, R = HS.R, J = window.HourJudge, Snd = window.RescueSound, Au = window.HourSound;
  var V = H.V, clamp = H.clamp, lerp = H.lerp, smooth = H.smooth, el = H.el, save = H.save;
  var laneY = HS.laneY, logX = HS.logX, laneCam = HS.laneCam;
  var CLOCK = 40, START = 70, SEG = L.seg, BONK = 970, BACK = 916, WHO = ['billy', 'bobby', 'hog'];
  /* the storm wall, in lane units: held at the river while she writes, at the foot of the lane after her first run,
     and it catches them at CATCH. The mend clock moves it from HELD to CATCH in CLOCK seconds, and it never changes. */
  var WALL_RIVER = -420, WALL_HELD = 0, WALL_CATCH = 700, WALL_SPEED = (WALL_CATCH - WALL_HELD) / CLOCK;
  var MAKE = ['def dash():', '    print("run")', '    print("run")'];
  var HEAD_MAKE = 'Make a function called dash. Put 2 lines inside it. Both lines print the word run.';
  var HEAD_PLAN = 'Type dash() 5 times. Then press Run the plan. The lane has 5 stretches.';
  var HEAD_MEND = 'Add 1 line inside dash. The line prints the word jump. Then press Run the plan.';
  var HEAD_RUN = 'Your plan is running.', HEAD_STOP = 'Your plan has stopped.', HEAD_DONE = 'Your plan has finished.';
  var CLOCK_LABEL = 'Time left before the storm catches them', WIN = 'You added 1 line. All 3 dashes ahead jumped.';
  var WIDE = { x: 1185, y: 277, z: 0.51 };
  function camAt(x) { return laneCam(x, 493, 470, 1); }
  function mix(a, b, c) { return { x: lerp(a.x, b.x, c), y: lerp(a.y, b.y, c), z: lerp(a.z, b.z, c) }; }

  /* ---------- the cast ---------- */
  var pack = START, feel = 'ready', said = [], steps = {}, bar = null, ahead = 250, up = 150;
  function pose(who, m) {
    var p = who === 'hog' ? { wind: 0.5 } : { grip: 0, down: 1, wind: 0.6, name: who === 'billy' ? 'BILLY' : 'BOBBY' };
    p.fear = 0.5; p.tears = 0.2; p.joy = 0; p.look = [0.7, -0.2];
    if (m === 'run') { p.fear = 0.55; p.tears = 0; p.look = [0.9, 0]; }
    if (m === 'ahead') { p.fear = 1; p.tears = 0.6; p.look = [0.9, -0.2]; }
    if (m === 'afraid') { p.fear = 1; p.tears = 1; p.look = [-0.9, 0]; }
    if (m === 'worried') { p.fear = 0.8; p.tears = 0.6; p.look = [0.8, -0.1]; }
    if (m === 'dazed') { p.fear = 0.7; p.tears = 0.4; p.look = [0, 0.4]; }
    if (m === 'happy') { p.fear = 0; p.tears = 0; p.joy = 1; p.look = [0.3, -0.1]; }
    return p;
  }
  /* a frightened animal standing still shakes */
  var SHIVER = { afraid: 1, ahead: 0.8, worried: 0.5, dazed: 0.3 };
  function mood(m) {
    feel = m;
    WHO.forEach(function (w) { var a = V.chars[w], keep = a.p.t; a.p = pose(w, m); a.p.t = keep; a.shiver = SHIVER[m] || 0; a.daze = m === 'dazed' ? 1 : 0; });
  }
  /* the three stand on the lane with the puppy at x */
  function stand(x) {
    pack = x;
    WHO.forEach(function (w) { var a = V.chars[w], ax = x + L.off[w]; a.x = ax; a.y = laneY(ax) + L.dy[w]; a.rot = 0; a.s = L.size[w]; a.ball = false; a.p.ball = 0; });
  }
  /* they hop along: d is how far this word has taken them, u is how far through the word they are */
  function hop(x, d, u) {
    var env = clamp(Math.min(u, 1 - u) * 7, 0, 1);
    pack = x;
    WHO.forEach(function (w, i) {
      var a = V.chars[w], ax = x + L.off[w], hog = w === 'hog', ph = d / (hog ? 40 : 70) + i * 0.3, n = Math.floor(ph);
      a.x = ax; a.y = laneY(ax) + L.dy[w] - (hog ? 8 : 14) * Math.abs(Math.sin(Math.PI * ph)) * env; a.rot = 0.08 * env;
      if (steps[w] != null && n !== steps[w]) Au.paw(hog ? 0.5 : 0.9);
      steps[w] = n;
    });
  }
  function follow() { V.cam = camAt(pack); }

  /* ---------- Blink ---------- */
  function perchAt(x) { return x === 'gate' ? { x: L.gate, y: laneY(L.len) - 107 } : { x: x, y: HS.postTop(x) - 3 }; }
  function airAt(x) { return { x: x + ahead, y: laneY(x + ahead) - up, air: true }; }
  function glide(a, b, u) {
    var c = smooth(u), B = V.blink;
    B.x = lerp(a.x, b.x, c); B.y = lerp(a.y, b.y, c) - Math.sin(Math.PI * c) * 36;
    B.fly = clamp((a.air ? 1 : c * 5) * (b.air ? 1 : (1 - c) * 5), 0, 1);
  }
  function hover() { var q = airAt(pack), B = V.blink; B.x = q.x; B.y = q.y + 7 * Math.sin(H.rt * 3); B.fly = 1; B.look = [-0.5, 0.5]; }

  /* ---------- the lane as it stands at the start of a step ----------
     o = { pack, mood, held, wild, logs, wall, perch: a lantern post's x or 'gate' } */
  function world(o) {
    o = o || {};
    var x = o.pack == null ? START : o.pack, px = o.perch == null ? (Math.floor(x / SEG) + 1) * SEG : o.perch, at = perchAt(px);
    V.scene = 'lane'; V.dark = 0; V.white = 0; V.heart = 0; V.owl = null; V.hold = o.held ? 1 : 0; Au.music(0, 1);
    V.logs = o.logs ? [1, 1, 1] : [0, 0, 0]; V.lamps = 5; V.wallX = o.wall == null ? WALL_RIVER : o.wall;
    V.strike = null; V.dust = []; V.bonk = null; V.shake = 0;
    V.chars = {};
    WHO.forEach(function (w) { V.chars[w] = { x: 0, y: 0, s: L.size[w], rot: 0, p: {} }; });
    stand(x); mood(o.mood || 'ready');
    V.cam = camAt(x);
    V.blink = { x: at.x, y: at.y, s: 23, look: at.x > x ? [-0.6, 0.4] : [0.6, 0.4], fly: 0 };
    H.calm = !o.wild; H.quiet = !!o.held; H.stRate = o.held ? 0 : 1; H.windAmt = o.held ? 0.25 : 1;
    H.beds({ storm: o.held ? 0.07 : 0.32, river: 0, indoors: 0, fire: 0 }, 1.2);
    said = []; steps = {}; bar = null; ahead = 250; up = 150;
  }
  /* Blink lets the storm go: it runs again */
  function release() { H.stRate = 1; H.quiet = false; H.windAmt = 1; H.beds({ storm: 0.32 }, 1); }

  /* the lane strip: the storm front and the three, kept in step with the picture */
  function showBar(o) {
    if (o) bar = o; if (!bar) return;
    H.lane({ label: bar.label, front: (V.wallX + 150) / L.len, gang: pack / L.len, logs: V.logs[2] > 0.5, lit: bar.lit, plan: bar.plan, low: bar.low });
  }

  /* ---------- her plan on the panel ----------
     o = { n: lines of dash shown, gap: the gap between the runs, jump: the new line, calls: dash() rows, lc: { line: class }, cc: { row: class } } */
  function planHtml(o) {
    o = o || {};
    var n = o.n == null ? 3 : o.n, lc = o.lc || {}, cc = o.cc || {}, rows = [], calls = [], i;
    for (i = 0; i < n; i++) {
      if (i === 2 && o.gap) rows.push('    <span class="gap wide" id="lgap">&nbsp;</span>');
      if (i === 2 && o.jump) rows.push('<span class="' + (lc.j || '') + '">    print("jump")</span>');
      rows.push('<span class="' + (lc[i] || '') + '">' + MAKE[i] + '</span>');
    }
    for (i = 0; i < (o.calls || 0); i++) calls.push('<span class="' + (cc[i] || '') + '">dash()</span>');
    return rows.join('\n') + (calls.length ? '<span class="callrow">' + calls.join('\n') + '</span>' : '');
  }
  function plan(o) { H.fn(planHtml(o), '', 'YOUR PLAN'); }
  /* Blink calls one word that her code printed */
  function word(w) {
    if (said.length) said[said.length - 1].c = 'done';
    said.push({ w: w, c: 'hot' }); H.prints(said); Au.call(w === 'jump');
  }
  function after(text, then) { H.run([{ d: 1.2 + 0.35 * H.words(text) }], then); }

  /* one printed run: the three go from x0 to x1 */
  function runSeg(x0, x1, d, start) {
    return { d: d, gap: 0.14, s: function () { steps = {}; start(); },
      f: function (u) { hop(lerp(x0, x1, u), (x1 - x0) * u, u); follow(); hover(); } };
  }
  /* one printed jump: each of the three leaves the ground as it reaches the tree. The hedgehog goes over as a ball. */
  function jumpSeg(x0, x1, d, start) {
    var went = {};
    return { d: d, gap: 0.14, s: function () { went = {}; start(); },
      f: function (u) {
        pack = lerp(x0, x1, u);
        WHO.forEach(function (w) {
          var a = V.chars[w], ax = pack + L.off[w], hog = w === 'hog', c = (0.25 * SEG - L.off[w]) / (x1 - x0);
          var v = clamp((u - c + 0.26) / 0.52, 0, 1), air = v > 0 && v < 1;
          a.x = ax; a.y = laneY(ax) + L.dy[w] - Math.sin(Math.PI * v) * (hog ? 80 : 96); a.rot = air && !hog ? -0.2 * Math.cos(Math.PI * v) : 0;
          if (hog) { a.ball = air; a.p.ball = air ? 1 : 0; a.s = air ? L.size.ball : L.size.hog; a.p.roll = v * Math.PI * 3; }
          if (air && !went[w]) { went[w] = 1; Au.whoosh(hog ? 0.6 : 1); }
          if (v >= 1 && went[w] === 1) { went[w] = 2; Au.paw(1); }
        });
        follow(); hover();
      } };
  }

  /* ---------- the film of the lane (section 7) ---------- */
  H.def('filmB', { ch: 3, save: true, enter: function () {
    H.riverWorld({ billy: 'far', bobby: 'far', hog: 'far', wild: true });
    var bx = R.pf.x, by = R.pf.top - 2, lamp = 0, B = V.blink;
    B.x = bx; B.y = by; B.look = [0.6, 0.4];
    function fear() { ['billy', 'bobby', 'hog'].forEach(function (w) { var p = V.chars[w].p; p.fear = 1; p.joy = 0; p.tears = 1; p.hop = 0; p.look = [-0.9, 0]; V.chars[w].shiver = 1; }); }
    H.film([
      { cap: 'Billy, Bobby and ' + H.name() + ' are over the river.', cam: { x: 790, y: 380, z: 1.22 }, camD: 3 },
      { cap: 'The storm is coming across the water after them.', cam: HS.CAM0, camD: 1.3,
        s: function () { fear(); H.flashNow(true); H.beds({ storm: 0.5 }, 1); B.look = [-0.9, 0.1]; },
        f: function (u, t) {
          V.wall = 0.62 * smooth(t / 3.2);
          var g = smooth((t - 3.3) / 1.1); B.x = lerp(bx, bx + 520, g); B.y = lerp(by, by - 300, g); B.fly = clamp(g * 6, 0, 1);
          V.dark = smooth((u - 0.9) / 0.1);
        } },
      { cap: 'The lane home climbs the hill in 5 stretches.', gap: 0,
        s: function () { world({ wall: -620, wild: true }); V.dark = 1; V.lamps = 0; V.cam = WIDE; hover(); showBar({ plan: 0 }); },
        f: function (u, t) {
          V.cam = WIDE; V.dark = 1 - smooth(t / 0.6); hover();
          V.lamps = clamp((t - 0.9) / 0.6, 0, 5); V.wallX = lerp(-620, WALL_RIVER, u);
          var n = Math.floor(V.lamps + 0.001); if (n > lamp) { lamp = n; Au.click(0.6); }
          bar.plan = n; showBar();
        }, e: function () { V.lamps = 5; bar.plan = 0; showBar(); } },
      { d: 1.6, gap: 0.3, f: function (u) { V.cam = mix(WIDE, camAt(START), smooth(u)); glide(airAt(START), perchAt(SEG), u); B.look = [-0.6, 0.4]; showBar(); } },
      { say: 'I will tell you what the lane needs. You write the code.', s: function () { V.cam = camAt(START); Au.land(); }, f: function () { V.cam = camAt(START); } }
    ], function () { H.go('l_mode'); });
  } });

  /* ---------- 8.1: the plan comes first; Blink holds the storm ---------- */
  H.def('l_mode', { ch: 3, save: true, enter: function () {
    world({ wild: true }); showBar({ plan: 0 });
    H.film([
      { say: 'This time, type all your lines first. Those lines are your plan.' },
      { say: 'I will hold the storm while you write.', s: function () { H.stRate = 0; H.quiet = true; H.windAmt = 0.25; H.beds({ storm: 0.07 }, 1.2); Au.land(); },
        f: function (u, t) { V.hold = smooth(t / 1.0); } }
    ], function () { H.go('l_make'); });
  } });

  /* ---------- 8.2: she makes dash with no lines to copy ---------- */
  H.def('l_make', { ch: 3, save: true, enter: function () {
    world({ held: true }); showBar({ plan: 0 });
    var n = clamp(save.data.dash || 0, 0, 2), exact = false;
    function show(keep) {
      H.card({ k: 'THE LANE', h: HEAD_MAKE, lines: exact ? MAKE : [], now: n, keepFb: keep });
      if (n > 0) plan({ n: n });
      H.ask({ pre: n ? '    ' : '', judge: function (t) { return J.dashMake(n, t); },
        bad: function (res, text, tries) { if (tries === 2 && !exact) { var o = H.input, v = el.hinp.value; exact = true; show(true); H.input.tries = o.tries; el.hinp.value = v; } },
        good: function (res) {
          n++; save.data.dash = n; H.store();
          if (n < 3) show(true); else { plan(); H.wait(); after(res.msg, function () { H.go('l_plan'); }); }
        } });
    }
    show(false);
  } });

  /* ---------- 8.3: the whole plan, then Run ---------- */
  H.def('l_plan', { ch: 3, save: true, enter: function () {
    world({ held: true });
    var n = clamp(save.data.plan || 0, 0, 5);
    function count() { return n + ' of 5 dashes ' + (n === 1 ? 'is' : 'are') + ' in your plan.'; }
    H.card({ k: 'THE LANE', h: HEAD_PLAN, sub: count(), run: 'Run the plan', runOff: n < 5 });
    plan({ calls: n }); showBar({ plan: n });
    H.onRun = function () { H.onRun = null; H.go('l_run1'); };
    function ask() {
      H.ask({ judge: function (t) { return J.plan(n, t); }, good: function () {
        n++; save.data.plan = n; H.store();
        el.hsub.textContent = count(); plan({ calls: n }); showBar({ plan: n }); Au.land();
        if (n >= 5) H.runReady(true);
        ask();
      } });
    }
    ask();
  } });

  /* ---------- 8.4: the plan runs. Lightning drops 3 trees. The third dash stops at the first one. ---------- */
  var T_FALL = [1.0, 1.9, 2.8], FAR = laneCam(840, 300, 440, 0.58);
  H.def('l_run1', { ch: 3, enter: function () {
    world({ held: true });
    H.card({ k: 'THE LANE', h: HEAD_RUN, noBox: true }); H.wait();
    var cc = {}, lc = {}, fell = {}, i, segs = [], xs = [START, 210, 420, 630, 840];
    function panel() { plan({ calls: 5, cc: cc, lc: lc }); }
    function say(w, row, line) { cc = {}; for (var j = 0; j < row; j++) cc[j] = 'tick'; cc[row] = 'now'; lc = {}; lc[line] = 'hot'; panel(); word(w); }
    function trees(t) {
      var sh = 0; V.dust = []; V.strike = null;
      for (var j = 0; j < 3; j++) {
        var a = t - T_FALL[j], x = logX(j); if (a < 0) continue;
        V.logs[j] = clamp(a / 0.62, 0, 1);
        if (a < 0.45) V.strike = { x: x + 4, y: laneY(x) - 322, u: a / 0.45 };
        if (a >= 0.62 && a < 1.52) V.dust.push({ x: x + 20, y: laneY(x) + 40, u: (a - 0.62) / 0.9 });
        if (a >= 0.62 && a < 1.0) sh = Math.max(sh, 7 * (1 - (a - 0.62) / 0.38));
        if (!fell[j]) { fell[j] = 1; H.flashNow(j === 0); Au.crash(); }
      }
      V.shake = sh;
    }
    panel(); showBar({ plan: 5 }); H.prints(said);
    this.tick = function (t) { V.wallX = lerp(WALL_RIVER, WALL_HELD, clamp(t / 12, 0, 1)); showBar(); };
    segs.push({ d: 0.9, s: release, f: function (u) { V.hold = 1 - smooth(u); glide(perchAt(SEG), airAt(START), u); } });
    for (i = 0; i < 4; i++) (function (i) { segs.push(runSeg(xs[i], xs[i + 1], 1.0, function () { if (i === 0) mood('run'); say('run', i >> 1, 1 + (i & 1)); })); })(i);
    segs.push({ d: 4.4, gap: 0.25,
      s: function () { cc = { 0: 'tick', 1: 'tick' }; lc = {}; panel(); H.cap('Lightning drops 3 trees across the lane ahead.'); mood('ahead'); },
      f: function (u) {
        var t = u * 4.4, c = smooth(t / 1.0);
        V.cam = mix(camAt(840), FAR, c); ahead = lerp(250, 110, c); up = lerp(150, 195, c); hover(); trees(t);
      }, e: function () { H.cap(null); V.shake = 0; V.strike = null; V.dust = []; } });
    segs.push({ d: 0.9, f: function (u) { V.cam = mix(FAR, camAt(840), smooth(u)); hover(); } });
    segs.push(runSeg(840, 945, 0.7, function () { mood('run'); say('run', 2, 1); }));
    segs.push({ d: 0.25, gap: 0.14, s: function () { steps = {}; say('run', 2, 2); },
      f: function (u) { hop(lerp(945, BONK, u), 25 * u, 0.5); follow(); hover(); },
      e: function () {
        Au.bonk(1); said[said.length - 1].c = 'bad'; H.prints(said);
        cc = { 0: 'tick', 1: 'tick', 2: 'stop' }; lc = {}; panel(); mood('dazed');
      } });
    /* they bounce back off the trunk */
    segs.push({ d: 0.5, f: function (u) {
      stand(lerp(BONK, BACK, smooth(u)));
      WHO.forEach(function (w) { V.chars[w].y -= 18 * Math.sin(Math.PI * u); V.chars[w].rot = -0.14 * Math.sin(Math.PI * u); });
      V.bonk = { x: logX(0) - 24, y: laneY(BONK) - 70, u: u * 0.8 }; V.shake = 5 * (1 - u); follow(); hover();
    }, e: function () { stand(BACK); V.shake = 0; } });
    segs.push({ d: 5.6, gap: 0.2,
      s: function () { H.cap('Your plan only prints the word run. Printing the word run does not get the animals past a fallen tree.'); H.card({ k: 'THE LANE', h: HEAD_STOP, noBox: true }); H.wait(); H.fb('The plan stopped at the first fallen tree.', 'bad'); },
      f: function (u) {
        var t = u * 5.6; V.bonk = t < 0.12 ? { x: logX(0) - 24, y: laneY(BONK) - 70, u: 0.8 + t / 0.6 } : null;
        glide(airAt(BACK), perchAt(840), clamp(t / 1.1, 0, 1)); if (t >= 1.1) { V.blink.fly = 0; V.blink.look = [0.6, 0.4]; }
      }, e: function () { H.cap(null); } });
    H.run(segs, function () { H.go('l_lesson'); });
  }, exit: function () { this.tick = null; } });

  /* ---------- 8.5: Blink's lesson. She holds the storm. The long way stands beside her function. ---------- */
  var LES = laneCam(BACK, 330, 545, 0.8);
  function duo() {
    var pair = 'print("run")<span class="miss"></span>print("run")';
    return '<div class="duo"><div class="pane" id="pl"><div class="k kk">THE LONG WAY</div>' + [pair, pair, pair].join('\n') + '</div>' +
      '<div class="pane" id="pf"><div class="k">WITH YOUR FUNCTION</div>' + planHtml({ gap: true, calls: 3 }) + '</div></div>';
  }
  H.def('l_lesson', { ch: 3, save: true, enter: function () {
    world({ held: true, pack: BACK, logs: true, wall: WALL_HELD, mood: 'worried', perch: 840 });
    V.hold = 0; showBar({ plan: 5 });
    function pane(id) { var p = document.getElementById(id); if (p) p.classList.add('lit'); }
    H.film([
      { say: 'I am holding the storm. It will not hold for long.', cam: LES, camD: 1.4, s: function () { Au.land(); }, f: function (u, t) { V.hold = smooth(t / 0.9); } },
      { say: '3 trees block the 3 dashes still to run.', s: function () { showBar({ plan: 5, lit: true }); Snd.move('knock'); } },
      { say: 'To get past a tree, each dash needs a jump line. Without a function, you would add that line in 3 places.',
        s: function () { H.fn(duo()); H.cls(el.hfn, 'big', true); el.hfnk.textContent = ''; pane('pl'); } },
      { say: 'With your function dash, you add that line in 1 place, inside dash.', s: function () { pane('pf'); Au.land(); } },
      { say: 'Add 1 line between the 2 run lines. The line prints the word jump.', s: function () { var g = document.getElementById('lgap'); if (g) g.classList.add('pulse'); } }
    ], function () { H.go('l_mend'); });
  } });

  /* ---------- 8.6: one line mends all three. The clock starts on her first key and stops when she presses Run. ---------- */
  var MEND = { gap: true, calls: 5, cc: { 0: 'tick', 1: 'tick', 2: 'stop' } };
  H.def('l_mend', { ch: 3, save: true, enter: function (arg) {
    world({ held: true, pack: BACK, logs: true, wall: WALL_HELD, mood: 'worried', perch: 840 });
    var again = arg.again || (save.fails.lane || 0) > 0, t0 = -1, over = false, helped = 0, EXACT = 'Type print("jump")';
    function help(n) { if (n > helped) { helped = n; H.help([n === 1 ? 'The new line prints the word jump.' : EXACT]); } }
    H.card({ k: 'THE LANE', h: HEAD_MEND, sub: 'The clock starts when you type.', run: 'Run the plan', runOff: true, help: again ? [EXACT] : [] });
    if (again) helped = 2;
    plan(MEND); showBar({ label: CLOCK_LABEL, plan: 5, lit: true });
    if (H.OPT.freeze && H.OPT.ht > 0) t0 = 0;
    H.onRun = function () { H.onRun = null; over = true; H.go('l_run2', { wall: V.wallX }); };
    H.ask({ pre: '    ', judge: J.mend, key: function () { t0 = H.t; release(); el.hsub.textContent = 'The storm is coming down the lane.'; },
      bad: function (res, text, tries) { help(tries >= 2 ? 2 : 1); },
      good: function () {
        H.wait(); plan({ jump: true, calls: 5, cc: MEND.cc, lc: { j: 'hot' } }); Au.land(); H.runReady(true);
      } });
    this.tick = function (t) {
      if (over) return;
      var used = t0 < 0 ? 0 : (t - t0) / CLOCK;
      V.wallX = lerp(WALL_HELD, WALL_CATCH, clamp(used, 0, 1));
      if (t0 >= 0) V.hold = 1 - smooth((t - t0) / 0.8);
      if (used > 0.5 && feel !== 'afraid') mood('afraid');
      bar.low = used > 0.66; showBar();
      if (used >= 1) { over = true; H.go('l_fail'); }
    };
  }, exit: function () { this.tick = null; } });

  /* the mended plan runs: each of the 3 dashes ahead is run, jump, run */
  H.def('l_run2', { ch: 3, enter: function (arg) {
    world({ pack: BACK, logs: true, wall: arg.wall == null ? 300 : arg.wall, mood: 'run', wild: true, perch: 840 });
    H.card({ k: 'THE LANE', h: HEAD_RUN, noBox: true }); H.wait();
    var cc = { 0: 'tick', 1: 'tick' }, lc = {}, w0 = V.wallX, segs = [], gate = perchAt('gate');
    function panel() { plan({ jump: true, calls: 5, cc: cc, lc: lc }); }
    function say(w, row, line) { cc = {}; for (var j = 0; j < row; j++) cc[j] = 'tick'; cc[row] = 'now'; lc = {}; lc[line] = 'hot'; panel(); word(w); }
    panel(); showBar({ plan: 5, lit: true }); H.prints(said);
    this.tick = function (t) { V.wallX = w0 + WALL_SPEED * t; showBar(); };
    segs.push({ d: 0.8, f: function (u) { glide(perchAt(840), airAt(BACK), u); } });
    [2, 3, 4].forEach(function (row) {
      var base = row * SEG, a = row === 2 ? BACK : base, b = base + 0.30 * SEG, c = base + 0.77 * SEG;
      segs.push(runSeg(a, b, row === 2 ? 0.6 : 0.8, function () { say('run', row, 1); }));
      segs.push(jumpSeg(b, c, 1.2, function () { say('jump', row, 'j'); }));
      segs.push(runSeg(c, base + SEG, 0.6, function () { say('run', row, 2); }));
    });
    segs.push({ d: 1.1, gap: 0.14,
      s: function () {
        cc = { 0: 'tick', 1: 'tick', 2: 'tick', 3: 'tick', 4: 'tick' }; lc = {}; panel(); said[said.length - 1].c = 'done'; H.prints(said);
        stand(L.len); mood('happy'); WHO.forEach(function (w) { V.chars[w].p.hop = 0.7; });
        Snd.happy('kit'); Snd.happy('pup'); Au.happySqueak(1);
      },
      f: function (u) { glide(airAt(L.len), gate, u); V.blink.look = [-0.6, 0.4]; } });
    segs.push({ d: 1.2 + 0.35 * H.words(WIN), s: function () { V.blink.fly = 0; H.card({ k: 'THE LANE', h: HEAD_DONE, noBox: true }); H.wait(); H.fb(WIN, 'good'); Au.land(); } });
    H.run(segs, function () { H.go('l_close'); });
  }, exit: function () { this.tick = null; } });

  /* she ran out of time: the storm closes over the lane, black, Blink's turned head; then the storm rewinds */
  H.def('l_fail', { ch: 3, enter: function () {
    save.fails.lane = (save.fails.lane || 0) + 1; H.store();
    world({ pack: BACK, logs: true, wall: WALL_CATCH, mood: 'afraid', wild: true, perch: 840 });
    plan(MEND); H.card({ k: 'THE LANE', h: HEAD_MEND, noBox: true }); showBar({ label: CLOCK_LABEL, plan: 5, lit: true, low: true });
    var owl = { open: 0, turn: 0, body: 0, look: [0, 0] };
    H.run([
      { d: 0.9, s: function () { H.flashNow(true); H.beds({ storm: 0.6 }, 0.4); }, f: function (u) { V.wallX = lerp(WALL_CATCH, 1900, smooth(u)); V.dark = smooth((u - 0.45) / 0.5); showBar(); } },
      { d: 0.5, s: function () { H.card(null); H.fn(null); H.lane(null); bar = null; V.scene = 'black'; V.dark = 0; V.owl = owl; V.wallX = null; H.quiet = true; H.beds({ storm: 0, river: 0 }, 0.4); } },
      { d: 0.7, f: function (u) { owl.open = smooth(u); owl.body = smooth(u); } },
      { d: 1.1, gap: 0.5, s: function () { Snd.hoot(); }, f: function (u) { owl.turn = smooth(u); } },
      { d: 1.5, gap: 0.6, s: function () { Snd.rewind(1.5); }, f: function (u) { V.white = 0.5 * Math.sin(Math.PI * u); } }
    ], function () { H.go('l_retry'); });
  } });
  H.def('l_retry', { ch: 3, enter: function () {
    world({ held: true, pack: BACK, logs: true, wall: WALL_HELD, mood: 'worried', perch: 840 });
    plan(MEND); showBar({ plan: 5, lit: true });
    H.film([{ say: 'Your plan is still here. Try again!' }], function () { H.go('l_mend', { again: true }); });
  } });

  /* ---------- 8.7: two closing screens ---------- */
  function still() { H.onFrame = null; el.hfly.style.opacity = 0; }
  H.def('l_close', { ch: 3, save: true, enter: function () {
    world({ pack: L.len, logs: true, wall: 900, mood: 'happy', perch: 'gate' });
    var pair = 'print("run")<span class="miss"></span>print("run")', tick = '<span class="tick">dash()</span>';
    var FN = 'def dash():\n    print("run")\n    <span class="new">print("jump")</span>\n    print("run")';
    H.badge({ id: 'b11', name: 'Lane Runner', xp: 12, kind: 'dash' }, function () { H.pages([
      { html: '<h2>You changed dash once. Every call to dash then used the change.</h2><div class="cols" style="align-items:flex-start">' +
          '<div class="pair"><div class="k">THE LONG WAY</div><div class="hstack hcode">' + [pair, pair, pair].join('\n') + '</div><p class="under">Without a function, you would add the new line in 3 places.</p></div>' +
          '<div class="pair"><div class="k">WITH YOUR FUNCTION</div><div class="hstack mine hcode">' + FN + '<span class="sep">' + [tick, tick, tick].join('\n') + '</span></div>' +
          '<p class="under">You added 1 line. All 3 dashes ahead jumped.</p></div></div>', after: still },
      { html: '<div class="cols"><div class="hstack mine hcode">' + FN + '</div></div>' +
          '<p class="seen" style="margin-top:1.4rem">You saw this: 1 new line inside dash changed 3 dashes.</p>' +
          '<p class="q">Imagine your plan has 20 lines that say <code class="hcode">dash()</code>. Every dash must also print the word swim. How many lines do you add?</p>' +
          '<div class="opts"></div><p class="qfb"></p>', after: still,
        q: { opts: [
          { t: '1 line', right: true, fb: 'Yes. Add it once inside dash. All 20 dashes will swim.' },
          { t: '20 lines', fb: '20 lines is the long way. You would add 1 line at every call. Add the line once, inside dash.' },
          { t: '3 lines', fb: '3 was the number of trees. The new line goes inside dash once.' }] } }
    ], function () { if (H.steps.d_open) H.go('d_open'); }); });
  } });
})();
