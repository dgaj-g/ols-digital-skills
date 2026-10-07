/* The Rescue, the whole hour: the film of the ground and chapter 2, the river.
   Every string is from J3_L4_RESCUE_SPEC.md sections 5 and 6. Every wrong-line message comes from
   hour-judge.js. What the winch does: a name calls that animal to the bucket; pull hauls the bucket
   across; tip sets the passenger down on the far bank; then the bucket comes back. */
(function () {
  'use strict';
  var H = window.Hour, HS = window.HourScene, R = HS.R, J = window.HourJudge, Snd = window.RescueSound, Au = window.HourSound, C = window.RescueChars;
  var V = H.V, clamp = H.clamp, lerp = H.lerp, smooth = H.smooth, esc = H.esc, el = H.el, save = H.save;
  var GROUND = R.bank + 4, POP = { billy: 2.68, bobby: 2.68, hog: 1.65 }, U_ROCK = 0.66, HOG_X = R.rock.x - 14, HOG_Y = R.rock.top + 2;
  var CLOCK = 35, W_START = 0.12, W_END = 0.64;
  var MAKE = ['def cross():', '    print("Billy")', '    print("pull")', '    print("tip")'];

  /* ---------- the cast ---------- */
  function pose(who, mood) {
    var p = { grip: 0, down: 1, wind: 0.6, name: who === 'billy' ? 'BILLY' : 'BOBBY', fear: 1, tears: 1, joy: 0, look: [0.5, 0] };
    if (mood === 'waits') { p.fear = 0.5; p.tears = 0.3; p.look = [-0.8, 0.02]; }
    if (mood === 'worried') { p.fear = 0.8; p.tears = 0.6; p.look = [-0.9, 0.3]; }
    if (mood === 'calm') { p.fear = 0.2; p.tears = 0; p.joy = 0.45; p.look = [-0.3, 0]; }
    if (mood === 'happy') { p.fear = 0; p.tears = 0; p.joy = 1; p.look = [-0.3, 0]; }
    return p;
  }
  /* a frightened animal standing still shakes */
  var SHIVER = { afraid: 1, worried: 0.5 };
  function put(who, side, m) {
    var x = side === 'far' ? R.far[who] : R.near[who];
    V.chars[who] = { x: x, y: GROUND, s: R.size[who], rot: 0, shiver: SHIVER[m] || 0, p: pose(who, m) };
  }
  function mood(who, m) { var c = V.chars[who], keep = c.p.t; c.p = pose(who, m); c.p.t = keep; c.shiver = SHIVER[m] || 0; }
  /* the hedgehog on its rock: awake 0 is the sleeping ball, 1 is awake and afraid */
  function hogOnRock(awake) {
    var s = lerp(R.size.ball, R.size.hog, awake), h = V.chars.hog || (V.chars.hog = { p: {} });
    h.at = 'rock'; h.x = lerp(R.rock.x + 6, HOG_X, awake); h.s = s; h.rot = 0; h.y = HOG_Y + 1.95 * s * 0.48 * (1 - smooth(awake * 2));
    h.p.ball = awake < 0.5 ? 1 : 0; h.p.roll = 0.3 * (1 - awake); h.p.fear = 1; h.p.tears = awake; h.p.joy = 0; h.p.look = [0.3, -0.25]; h.p.wind = 0.5;
  }
  function hogFar() { V.chars.hog = { x: R.far.hog, y: GROUND, s: R.size.hog, rot: 0, p: { fear: 0, joy: 1, tears: 0, look: [0.2, -0.1], hop: 0.6 } }; }

  /* the river as it stands at the start of a step: o = { billy, bobby: 'near' | 'far', hog: 'ball' | 'rock' | 'far', water, winch, held } */
  function world(o) {
    var all = o.billy === 'far' && o.bobby === 'far', m = o.hog === 'far' ? 'happy' : all && o.hog === 'rock' ? 'worried' : all ? 'calm' : null;
    V.scene = 'river'; V.dark = 0; V.white = 0; V.hold = o.held ? 1 : 0; V.heart = 0; V.owl = null; V.wall = 0; V.homeLit = 1; V.calm = false; Au.music(0, 1);
    V.cam = { x: HS.CAM0.x, y: HS.CAM0.y, z: 1 };
    V.water = o.water || 0;
    V.bucket = { u: 0, dip: 0, tilt: 0, sw: 0, load: 0, pop: 0 }; V.rider = null;
    V.winch = { on: o.winch == null ? 1 : o.winch, lines: [], spin: 0, run: false };
    V.chars = {};
    put('billy', o.billy, m || (o.billy === 'near' ? 'afraid' : 'waits'));
    put('bobby', o.bobby, m || 'afraid');
    if (o.hog === 'far') hogFar(); else hogOnRock(o.hog === 'rock' ? 1 : 0);
    V.blink = { x: R.pn.x, y: R.pn.top - 2, s: 23, look: [0.5, 0.3], fly: 0 };
    H.calm = !o.wild; H.quiet = !!o.held; H.stRate = o.held ? 0 : 1; H.windAmt = o.held ? 0.25 : 1;
    H.beds({ storm: o.held ? 0.07 : 0.3, river: o.held ? 0.12 : 0.4 + 0.5 * V.water, indoors: 0, fire: 0 }, 1.2);
  }

  /* the lane's opening film starts on this bank */
  H.riverWorld = world;

  /* ---------- her function on the panel ---------- */
  var GAP = '<span class="gap">&nbsp;</span>', WHO = '<span class="gap named">who</span>';
  function full(name) { return '<span class="gap full">"' + esc(name) + '"</span>'; }
  /* o = { n: lines shown, def: what is in the def brackets, arg: what is in the first print's brackets, cls: { line: class }, call: html } */
  function fnHtml(o) {
    o = o || {};
    var n = o.n == null ? 4 : o.n, c = o.cls || {}, L = [];
    var rows = ['def cross(' + (o.def || '') + '):', '    print(' + (o.arg == null ? '"Billy"' : o.arg) + ')', '    print("pull")', '    print("tip")'];
    for (var i = 0; i < n; i++) L.push('<span class="' + (c[i] || '') + '">' + rows[i] + '</span>');
    return L.join('\n') + (o.call ? '<span class="callrow">' + o.call + '</span>' : '');
  }
  function fnNew(o) { o = o || {}; o.def = o.def || WHO; o.arg = o.arg || WHO; return fnHtml(o); }

  /* ---------- the winch runs ---------- */
  function screenLines(list, hot) { V.winch.lines = list.map(function (t, i) { return { text: t, hot: i === hot }; }); }
  function arc(ch, x0, y0, x1, y1, u, high, r0, r1) { var c = smooth(u); ch.x = lerp(x0, x1, c); ch.y = lerp(y0, y1, c) - Math.sin(Math.PI * u) * high; ch.rot = lerp(r0 || 0, r1 || 0, c); }
  /* o = { who: 'billy' | 'bobby' | 'hog' | null when the name called is already across, label: the name on the winch's screen } */
  function crossing(o, done) {
    var who = o.who, ch = who && V.chars[who], B = V.bucket, W = V.winch, u0 = who === 'hog' ? U_ROCK : 0, sx, sy, clicks = -1, sb = 0, segs = [], at;
    function crank(u, d, dir) { var n = Math.floor(u * d / 0.11); W.spin = sb + dir * u * d * 5.2; if (n !== clicks) { clicks = n; Au.click(0.8); } }
    function wind() { sb = W.spin || 0; clicks = -1; }
    function ride() { ch.p.fear = 0.85; ch.p.tears = 0.6; ch.p.look = [0.2, 0.7]; ch.p.joy = 0; }
    segs.push({ d: 0.5, s: function () { W.run = true; screenLines([o.label], 0); Au.land(); if (who) { sx = ch.x; sy = ch.y; ch.shiver = 0; ch.p.look = who === 'hog' ? [0.6, -0.5] : [0.9, -0.1]; } } });
    if (who === 'hog') {
      /* the bucket runs out to the rock and dips; the hedgehog climbs in */
      segs.push({ d: 1.3, s: wind, f: function (u) { B.u = lerp(0, U_ROCK, smooth(u)); crank(u, 1.3, 1); } });
      segs.push({ d: 0.45, f: function (u) { B.dip = smooth(u); } });
      segs.push({ d: 0.6, f: function (u) { at = HS.bucketAt(B); arc(ch, sx, sy, at.x, at.y, u, 34); }, e: function () { V.rider = who; ch.at = null; B.pop = POP.hog; Au.paw(1); } });
      segs.push({ d: 0.3, f: function (u) { B.pop = POP.hog * (1 - smooth(u)); B.load = smooth(u); }, e: ride });
      segs.push({ d: 0.45, f: function (u) { B.dip = 1 - smooth(u); } });
    } else if (who) {
      /* the animal called hops to the bucket and settles into it */
      segs.push({ d: 0.8, f: function (u) { at = HS.bucketAt(B); arc(ch, sx, sy, at.x, at.y, u, 70); }, e: function () { V.rider = who; B.pop = POP[who]; Au.paw(1); } });
      segs.push({ d: 0.35, f: function (u) { B.pop = POP[who] * (1 - smooth(u)); B.load = smooth(u); }, e: ride });
    } else {
      /* nobody on this bank has that name: Billy hears it on the far bank, Bobby looks at the bucket and then at us */
      segs.push({ d: 1.5, s: function () { V.chars.billy.p.hop = 0.8; V.chars.billy.p.look = [-0.9, -0.1]; },
        f: function (u) { V.chars.bobby.p.look = u < 0.55 ? [0.9, -0.05] : [0, 0.12]; }, e: function () { V.chars.billy.p.hop = 0; } });
    }
    segs.push({ d: 2.2, gap: 0.25, s: function () { screenLines([o.label, 'pull'], 1); wind(); },
      f: function (u) { B.u = lerp(u0, 1, smooth(u)); B.sw = Math.sin(u * 2.2 * 5) * 0.05 * Math.sin(Math.PI * u); crank(u, 2.2, 1); }, e: function () { B.sw = 0; } });
    segs.push({ d: 0.45, gap: 0.2, s: function () { screenLines([o.label, 'pull', 'tip'], 2); Au.creak(); },
      f: function (u) { B.tilt = 0.55 * smooth(u); if (who) B.pop = POP[who] * smooth(u); } });
    if (who) {
      segs.push({ d: 0.7, s: function () { at = HS.bucketAt(B); V.rider = null; B.pop = 0; B.load = 0; },
        f: function (u) { arc(ch, at.x, at.y, R.far[who], GROUND, u, 56, 0.55, 0); B.tilt = 0.55 * (1 - smooth(u * 1.4)); },
        e: function () { ch.rot = 0; Au.thud(who === 'hog' ? 0.5 : 0.9); if (o.landed) o.landed(); } });
    } else {
      /* the bucket tips out nothing; Billy peers into it */
      segs.push({ d: 1.3, s: function () { V.chars.billy.p.look = [-1, 0.25]; V.chars.billy.p.hop = 0.5; },
        f: function (u) { B.tilt = 0.55 * (1 - smooth((u - 0.6) / 0.4)); }, e: function () { V.chars.billy.p.hop = 0; V.chars.billy.p.look = [-0.6, 0.05]; } });
    }
    segs.push({ d: 1.4, gap: 0.3, s: wind, f: function (u) { B.tilt = 0; B.u = 1 - smooth(u); crank(u, 1.4, -1); },
      e: function () { W.run = false; screenLines(V.winch.lines.map(function (l) { return l.text; }), -1); } });
    H.run(segs, done);
  }
  /* a line of Blink's, then her turn: the box waits for the least time the line needs */
  function blinkThen(text, then) { H.say(text); H.wait(); H.run([{ d: Math.max(1.6, H.dur(text) - 0.8) }], then); }
  /* a line under the card stays up long enough to read, then the story moves on */
  function after(text, then) { H.run([{ d: 1.2 + 0.35 * H.words(text) }], then); }
  /* the name travels from her typed line into the gap on the panel */
  function intoGap(name, then) {
    /* two stages, as Blink showed it: into the def gap first, then on into the print gap */
    var g = el.hfnl.querySelector('.gap');
    H.fly('"' + name + '"', el.hinp, g, 0.9, function () {
      H.fn(fnNew({ def: full(name) })); Snd.move('key');
      var g2 = el.hfnl.querySelectorAll('.gap');
      H.fly('"' + name + '"', g2[0], g2[1], 0.6, function () { H.fn(fnNew({ def: full(name), arg: full(name) })); Au.land(); then(); });
    });
  }

  /* ---------- the film of the ground (section 5) ---------- */
  H.def('filmA', { ch: 0, enter: function () {
    world({ billy: 'near', bobby: 'near', winch: 0, wild: true });
    V.blink.show = false; V.dark = 1;
    V.cam = { x: 165, y: 430, z: 1.7 };
    var bx = R.pn.x, by = R.pn.top - 2;
    H.film([
      { d: 1.2, gap: 0, cam: { x: 165, y: 430, z: 1.7 }, f: function (u) { V.dark = 1 - smooth(u); } },
      { cap: 'Billy and Bobby are down from the tree.', cam: { x: 172, y: 432, z: 1.78 }, camD: 5 },
      { cap: 'They are not home yet.', cam: { x: 190, y: 430, z: 1.7 }, s: function () { V.chars.billy.p.look = V.chars.bobby.p.look = [0.9, -0.12]; } },
      { cap: 'The storm has washed the bridge away.', cam: { x: 548, y: 492, z: 1.3 }, camD: 1.6, s: function () { H.flashNow(true); } },
      { cap: 'Home is the lit window across the river.', cam: { x: 846, y: 330, z: 1.55 }, camD: 2.2 },
      { say: 'This winch pulls a bucket across the river.', cam: { x: 470, y: 372, z: 1.32 }, camD: 1.8,
        s: function () { V.blink.show = true; V.blink.fly = 1; V.blink.x = bx + 330; V.blink.y = by - 330; Au.whoosh(0.5); },
        f: function (u, t) { var c = smooth(t / 1.5); V.blink.x = lerp(bx + 330, bx, c); V.blink.y = lerp(by - 330, by, c) - Math.sin(Math.PI * c) * 40; V.blink.fly = 1 - smooth((t - 1.3) / 0.4); V.blink.look = [-0.2, 0.5]; } },
      { say: 'It takes typed instructions, like the ladder did.', cam: HS.CAM0, camD: 2.4,
        s: function () { H.strip(2); Au.land(); V.blink.look = [0.5, 0.3]; }, f: function (u, t) { V.winch.on = smooth(t / 0.8); } }
    ], function () { H.go('r_make'); });
  } });

  /* ---------- 6.1: she makes cross, and uses it ---------- */
  H.def('r_make', { ch: 2, save: true, enter: function () {
    world({ billy: 'near', bobby: 'near' });
    var n = Math.min(3, save.data.make || 0);
    function show(keep) {
      H.card({ k: 'THE RIVER', h: 'Type these 4 lines to make a function called cross.', lines: MAKE, now: n, keepFb: keep });
      if (n > 0) H.fn(fnHtml({ n: n }));
      H.ask({ pre: n ? '    ' : '', judge: function (t) { return J.make(n, t); }, good: function () { n++; save.data.make = n; H.store(); if (n < 4) show(true); else { H.fn(fnHtml()); H.wait(); after('tip will set Billy down on the far bank.', function () { H.go('r_call1'); }); } } });
    }
    show(false);
  } });

  H.def('r_call1', { ch: 2, save: true, enter: function () {
    world({ billy: 'near', bobby: 'near' });
    H.fn(fnHtml());
    H.card({ k: 'THE RIVER', h: 'Type cross() to carry Billy over the river.' });
    blinkThen('Nothing moved. A function waits until you use its name.', function () {
      H.ask({ judge: J.call1, good: function (res) {
        H.fb('', ''); H.wait(); H.say(null);
        crossing({ who: 'billy', label: 'Billy', landed: function () { mood('billy', 'waits'); } }, function () {
          H.fb(res.msg, 'good'); after(res.msg, function () { H.go('r_bobby'); });
        });
      } });
    });
  } });

  /* ---------- 6.2: Bobby next, and the function that only knows one name ---------- */
  H.def('r_bobby', { ch: 2, save: true, enter: function () {
    world({ billy: 'far', bobby: 'near' });
    H.fn(fnHtml());
    H.card({ k: 'THE RIVER', h: 'Use your function to carry Bobby over the river.' });
    blinkThen('Now it is Bobby\'s turn. Use your function again.', function () {
      H.ask({ judge: J.bobby, good: function (res) {
        H.say(null); H.wait();
        if (res.kind === 'ahead') { after(res.msg, function () { H.go('r_lesson'); }); return; }
        H.fb('', '');
        crossing({ who: null, label: 'Billy' }, function () { H.fb(res.msg, 'good'); after(res.msg, function () { H.go('r_lesson'); }); });
      } });
    });
  } });

  /* ---------- 6.3: Blink's lesson. She holds the storm still. Her four lines are the picture. ---------- */
  /* ---------- Blink explains the gap (his look, 6 Oct 2026): six short pages at her own pace. Nothing goes dark: the river, the panel
     and Blink stay in view. Next opens when each page's picture has finished; Back is always there. ---------- */
  var SAY_1 = 'Look inside cross. The name Billy is written inside it. So cross can only ever carry Billy.';
  var SAY_2 = 'Bobby needs the same pull and the same tip. Only the name is different. A second function would take too long. The river is rising.';
  var SAY_3 = 'So we take the name out of cross. We leave a gap where Billy was.';
  var SAY_4 = 'The gap needs a name. I call the gap who. So who is written where Billy was. An animal\'s name will come in through the brackets of the def line. So who goes in those brackets too.';
  var SAY_5 = 'Now watch. cross("Bobby") sends the name Bobby in through the brackets. Every who becomes Bobby. So the winch prints Bobby, pull, tip.';
  var SAY_6 = 'The same function carries Billy too. cross("Billy") sends Billy in. One function can carry any name.';
  var NEXT_6 = 'Now make the gap';
  /* a worked call on the panel: the name flies from the call into the def gap, on into the print gap, then the three prints appear */
  function demoPage(name, say, d, next) {
    var st = {};
    return { bare: true, say: say, d: d, next: next,
      s: function () { st = { at: 0, n: 0 }; H.fn(fnNew({ call: 'cross(<b class="hot">"' + name + '"</b>)' })); },
      f: function (t) {
        if (st.at === 0 && t > 1.0) {
          st.at = 1;
          var gs = el.hfnl.querySelectorAll('.gap');
          H.fly('"' + name + '"', el.hfnl.querySelector('.callrow .hot'), gs[0], 0.9, function () {
            H.fn(fnNew({ def: full(name), call: 'cross("' + name + '")' })); Snd.move('key');
            var g2 = el.hfnl.querySelectorAll('.gap');
            H.fly('"' + name + '"', g2[0], g2[1], 0.6, function () {
              H.fn(fnNew({ def: full(name), arg: full(name), call: 'cross("' + name + '")' })); Au.land(); st.at = 2;
            });
          });
        }
        if (st.at === 2) { st.at = 3; st.t0 = t; }
        if (st.at === 3) {
          var n = Math.min(3, 1 + Math.floor((t - st.t0) / 0.55));
          if (n !== st.n) {
            st.n = n;
            H.prints([{ w: name }, { w: 'pull' }, { w: 'tip' }].slice(0, n).map(function (x, i) { return { w: x.w, c: i === n - 1 ? 'hot' : 'done' }; }));
            Snd.move('key');
          }
        }
      } };
  }
  H.def('r_lesson', { ch: 2, save: true, enter: function () {
    world({ billy: 'far', bobby: 'near', held: true });
    V.blink.look = [0.9, 0.1];
    H.fn(fnHtml()); H.cls(el.hfn, 'big', true);
    var RING = '<span class="ring">"Billy"</span>';
    H.pages([
      { bare: true, d: 2.5, say: SAY_1, s: function () { H.fn(fnHtml({ arg: RING })); } },
      { bare: true, d: 3, say: SAY_2, s: function () { H.fn(fnHtml({ arg: '<span class="ring pulse">"Billy"</span>' })); Snd.move('knock'); } },
      { bare: true, d: 2.5, say: SAY_3, s: function () { H.fn(fnHtml({ arg: '<span class="gap"><span class="lift">"Billy"</span></span>' })); },
        f: function (t) { var w = el.hfnl.querySelector('.lift'); if (w && t > 0.5) w.classList.add('up'); } },
      { bare: true, d: 3.5, say: SAY_4, s: function () { this.k = ''; H.fn(fnHtml({ arg: GAP })); },
        f: function (t) {
          var a = 'who'.slice(0, Math.floor(clamp((t - 0.7) / 0.9, 0, 1) * 3)), d = 'who'.slice(0, Math.floor(clamp((t - 2.0) / 0.9, 0, 1) * 3)), key = a + '|' + d;
          if (key !== this.k) { this.k = key; H.fn(fnHtml({ arg: a ? '<span class="gap named">' + a + '</span>' : GAP, def: d ? '<span class="gap named">' + d + '</span>' : (t > 1.7 ? GAP : '') })); if (a || d) Snd.move('key'); }
        } },
      demoPage('Bobby', SAY_5, 5.5, null),
      demoPage('Billy', SAY_6, 4.5, NEXT_6)
    ], function () { H.go('r_gap'); });
  } });

  /* ---------- 6.4: she makes the gap herself ---------- */
  H.def('r_gap', { ch: 2, save: true, enter: function () {
    world({ billy: 'far', bobby: 'near', held: true });
    var n = 0, HEAD = ['Type the def line again with who in its brackets.', 'Type the first print line again with who in its brackets.'], EXACT = ['def cross(who):', '    print(who)'];
    function panel() { H.fn(n === 0 ? fnHtml({ cls: { 0: 'now' } }) : n === 1 ? fnHtml({ def: WHO, cls: { 0: 'hot', 1: 'now' } }) : fnNew({ cls: { 0: 'hot', 1: 'hot' } }), 'pull and tip stay the same.'); }
    function show(keep, exact) {
      H.card({ k: 'THE RIVER', h: HEAD[n], lines: exact ? [EXACT[n]] : [], now: 0, keepFb: keep });
      panel();
      H.ask({ pre: n ? '    ' : '', judge: function (t) { return J.gap(n, t); },
        bad: function (res, text, tries) { if (tries === 2) { var o = H.input, v = el.hinp.value; show(true, true); H.input.tries = o.tries; el.hinp.value = v; } },
        good: function () { n++; if (n < 2) show(true); else { panel(); H.wait(); after('The winch will ask for whatever name is in the gap.', function () { H.go('r_call2'); }); } } });
    }
    show(false);
  } });

  /* ---------- 6.5: she fills the gap with Bobby's name ---------- */
  H.def('r_call2', { ch: 2, save: true, enter: function () {
    world({ billy: 'far', bobby: 'near' });
    H.fn(fnNew());
    H.card({ k: 'THE RIVER', h: 'Type cross("Bobby") to carry Bobby over the river.' });
    blinkThen('Now fill the gap with Bobby\'s name.', function () {
      H.ask({ judge: J.call2, good: function (res) {
        H.fb('', ''); H.say(null); H.wait(); el.hinp.value = 'cross("' + res.shown + '")';
        intoGap(res.shown, function () {
          crossing({ who: 'bobby', label: res.shown, landed: function () { mood('bobby', 'calm'); mood('billy', 'calm'); } }, function () {
            H.fn(fnNew()); H.fb(res.msg, 'good'); after(res.msg, function () { H.go('r_hogfilm'); });
          });
        });
      } });
    });
  } });

  /* ---------- 6.6: the hedgehog on the rock ---------- */
  H.def('r_hogfilm', { ch: 2, save: true, enter: function () {
    world({ billy: 'far', bobby: 'far', hog: 'ball', wild: true });
    H.film([
      { d: 0.8, gap: 0.2, s: function () { Au.squeak(1); } },
      { cap: 'A squeak comes from a rock in the river.', cam: { x: R.rock.x + 30, y: 500, z: 1.75 }, camD: 1.6,
        s: function () { mood('billy', 'worried'); mood('bobby', 'worried'); },
        f: function (u, t) { hogOnRock(smooth((t - 1.9) / 0.8)); }, e: function () { Au.squeak(0.9); } },
      { cap: 'A baby hedgehog is trapped. The river is rising.', cam: { x: R.rock.x + 30, y: 506, z: 1.75 },
        f: function (u) { V.water = W_START * smooth(u * 1.4); H.beds({ river: 0.4 + 0.5 * V.water }); } },
      { say: 'The winch can reach the rock. It needs a name to ask for.', cam: HS.CAM0, camD: 1.8, s: function () { H.fn(fnNew()); } }
    ], function () { H.go('r_hog'); });
  } });

  H.def('r_hog', { ch: 2, save: true, enter: function (arg) {
    world({ billy: 'far', bobby: 'far', hog: 'rock', water: W_START, wild: true });
    H.fn(fnNew());
    var again = arg.again || (save.fails.river || 0) > 0, t0 = -1, over = false, helped = 0, PAT = 'You typed cross("Bobby") before. Put a new name in the speech marks.';
    function help(n) { if (n > helped) { helped = n; H.help(n === 1 ? [PAT] : ['Type cross("Spike") or use a name of your own.']); } }
    H.card({ k: 'THE RIVER', h: 'Choose a name for the hedgehog. Use cross to carry it over.', sub: 'The clock starts when you type.', gauge: true, help: again ? [PAT] : [] });
    if (again) helped = 1;
    if (H.OPT.freeze && H.OPT.ht > 0) t0 = 0;
    this.sq = 0;
    H.gauge({ label: 'Time left before the river covers the rock', frac: 1 });
    H.ask({ judge: J.hog, key: function () { t0 = H.t; el.hsub.textContent = 'The river is rising.'; },
      bad: function (res, text, tries) { help(tries >= 2 ? 2 : 1); },
      good: function (res) {
        over = true; save.name = res.name; H.store();
        H.fb('', ''); H.wait(); el.hinp.value = 'cross("' + res.name + '")';
        intoGap(res.name, function () {
          crossing({ who: 'hog', label: res.name, landed: function () {
            hogFar(); mood('billy', 'happy'); mood('bobby', 'happy'); V.chars.billy.p.hop = V.chars.bobby.p.hop = 0.7; Au.happySqueak(1); Snd.happy('kit'); Snd.happy('pup');
          } }, function () { H.fn(fnNew()); H.fb(res.msg, 'good'); after(res.msg, function () { H.go('r_close'); }); });
        });
      } });
    this.tick = function (t) {
      if (over) return;
      var used = t0 < 0 ? 0 : (t - t0) / CLOCK;
      V.water = lerp(W_START, W_END, clamp(used, 0, 1));
      H.gauge({ label: 'Time left before the river covers the rock', frac: 1 - used });
      if (t0 >= 0 && t - t0 > 12) help(1);
      if (t0 >= 0 && Math.floor((t - t0) / 5) !== this.sq) { this.sq = Math.floor((t - t0) / 5); if (this.sq > 0) Au.squeak(0.6); H.beds({ river: 0.4 + 0.5 * V.water }, 2); }
      if (used >= 1) { over = true; H.go('r_fail'); }
    };
  }, exit: function () { this.tick = null; } });

  /* she ran out of time: the water closes over the rock, one squeak, black, Blink's turned head; then the storm rewinds */
  H.def('r_fail', { ch: 2, enter: function () {
    save.fails.river = (save.fails.river || 0) + 1; H.store();
    world({ billy: 'far', bobby: 'far', hog: 'rock', water: W_END, wild: true });
    H.fn(fnNew()); H.card({ k: 'THE RIVER', h: 'Choose a name for the hedgehog. Use cross to carry it over.', noBox: true });
    H.gauge({ label: 'Time left before the river covers the rock', frac: 0 });
    var owl = { open: 0, turn: 0, body: 0, look: [0, 0] };
    H.run([
      { d: 0.9, s: function () { Au.squeak(1); H.beds({ river: 1 }, 0.5); }, f: function (u) { V.water = lerp(W_END, 1.12, smooth(u)); V.dark = smooth((u - 0.45) / 0.5); } },
      { d: 0.5, s: function () { H.card(null); H.fn(null); V.scene = 'black'; V.dark = 0; V.owl = owl; H.quiet = true; H.beds({ storm: 0, river: 0 }, 0.4); } },
      { d: 0.7, f: function (u) { owl.open = smooth(u); owl.body = smooth(u); } },
      { d: 1.1, gap: 0.5, s: function () { Snd.hoot(); }, f: function (u) { owl.turn = smooth(u); } },
      { d: 1.5, gap: 0.6, s: function () { Snd.rewind(1.5); }, f: function (u) { V.white = 0.5 * Math.sin(Math.PI * u); } }
    ], function () { H.go('r_retry'); });
  } });
  H.def('r_retry', { ch: 2, enter: function () {
    world({ billy: 'far', bobby: 'far', hog: 'rock', water: W_START, wild: true });
    H.fn(fnNew());
    H.film([{ say: 'Your function is still here. Try again!', cam: HS.CAM0 }], function () { H.go('r_hog', { again: true }); });
  } });

  /* ---------- 6.7: three closing screens ---------- */
  function face(cv, who) {
    var px = 272, c = cv.getContext('2d'), keep = C.light.night, kf = C.light.flash, s = who === 'hog' ? 62 : 80;
    cv.width = cv.height = px; C.light.night = [0.86, 0.86, 0.9]; C.light.flash = 0;
    c.save(); c.translate(px / 2, who === 'hog' ? px * 0.42 : px * 0.47); c.scale(s, s);
    var p = who === 'hog' ? { t: 1.3, fear: 0, joy: 1, tears: 0, look: [0, 0], px: s } : { t: 1.3, fear: 0, joy: 1, tears: 0, grip: 0, down: 1, wind: 0, name: 'BOBBY', look: [0, 0], px: s };
    (who === 'hog' ? C.hog : C.puppy)(c, p); c.restore(); C.light.night = keep; C.light.flash = kf;
  }
  function still() { H.onFrame = null; el.hfly.style.opacity = 0; }
  var FN_NEW = 'def cross(<u>who</u>):\n    print(<u>who</u>)\n    print("pull")\n    print("tip")';
  H.def('r_close', { ch: 2, save: true, enter: function () {
    world({ billy: 'far', bobby: 'far', hog: 'far' });
    var nm = esc(H.name()), fox = /^rusty$/i.test(H.name()) ? 'Amber' : 'Rusty';
    /* the chapter's badge (the platform gives it; the prototype mirrors the pop), then the closing screens */
    H.badge({ id: 'b10', name: 'Winch Hand', xp: 12, kind: 'cross' }, function () { H.pages([
      { html: '<h2>One function can do the same job for different names.</h2><div class="cols">' +
          '<div><div class="k">YOUR CALLS</div><div class="hstack hcode">cross(<b id="c1">"Bobby"</b>)\ncross(<b id="c2">"' + nm + '"</b>)</div></div><div class="arrow"></div>' +
          '<div><div class="k">YOUR FUNCTION</div><div class="hstack mine hcode">def cross(<u id="g1">who</u>):\n    print(<u>who</u>)\n    print("pull")\n    print("tip")</div></div><div class="arrow"></div>' +
          '<div class="faces"><figure><canvas id="f1"></canvas><figcaption>Bobby</figcaption></figure><figure><canvas id="f2"></canvas><figcaption>' + nm + '</figcaption></figure></div></div>' +
          '<div class="lines"><p>The same function carried Bobby and ' + nm + '. Only the name changed.</p><p>' + nm + ' needed only 1 new line.</p></div>',
        after: function (p) {
          face(p.querySelector('#f1'), 'bobby'); face(p.querySelector('#f2'), 'hog');
          /* each name travels into the gap, once */
          var t0 = H.rt, stage = 0;
          function wait() {
            var g = document.getElementById('g1'); if (!g) { H.onFrame = null; return; }
            if (stage === 0 && H.rt - t0 > 0.9) { stage = 1; H.fly('"Bobby"', document.getElementById('c1'), g, 0.9, function () { Au.land(); stage = 2; t0 = H.rt; H.onFrame = wait; }); }
            else if (stage === 2 && H.rt - t0 > 0.7) { stage = 3; H.fly('"' + H.name() + '"', document.getElementById('c2'), g, 0.9, function () { Au.land(); }); }
          }
          H.onFrame = wait;
        } },
      { html: '<h2>That gap is called a parameter.</h2><div class="lab">' +
          '<code>def cross(<b>who</b>):</code><span>who is a gap for a name.</span>' +
          '<code>    print(<b>who</b>)</code><span>This line uses the gap.</span>' +
          '<code>cross(<b>"' + nm + '"</b>)</code><span>The name in the brackets fills the gap.</span></div>' +
          '<p class="boxed">A parameter is a gap you fill when you call the function.</p>', after: still },
      { html: '<div class="cols"><div class="hstack mine hcode">' + FN_NEW + '</div></div>' +
          '<p class="seen" style="margin-top:1.4rem">You saw this: <code class="hcode">cross("' + nm + '")</code> made the winch ask for ' + nm + '.</p>' +
          '<p class="q">A fox arrives. You type <code class="hcode">cross("' + fox + '")</code>. Which name does the winch ask for?</p>' +
          '<div class="opts"></div><p class="qfb"></p>', after: still,
        q: { opts: [
          { t: fox, right: true, fb: 'Yes. ' + fox + ' goes into the gap, so the winch asks for ' + fox + '.' },
          { t: 'who', code: true, fb: 'who is the name of the gap. The winch asks for the name you put into it.' },
          { t: 'Billy', fb: 'Billy is not stuck inside any more. The gap takes the name you type.' }] } }
    ], function () { if (H.steps.filmB) H.go('filmB'); }); });
  } });
})();
