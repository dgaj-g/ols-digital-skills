/* The Rescue, the whole hour: chapter 4, the door, and the end of the story.
   Every string is from J3_L4_RESCUE_SPEC.md sections 9 and 10. Every wrong-line message comes from
   hour-judge.js. Nobody shows her these lines: she writes the function rescue, then the code that
   uses it. What her code does: the door box reads each word it prints. open and shut move the door.
   Any other word is a name the door asks for. The run is judged exactly as written. */
/* menu: d_open|Door: the film */
/* menu: d_def|Door: write the def line */
/* menu: d_body|Door: write the lines inside */
/* menu: d_remind|Door: lists and loops from Lesson 3 */
/* menu: d_loop|Door: write the loop */
/* menu: d_run|Door: the code runs (12 seconds) */
/* menu: d_fail|Door: the storm gets in */
/* menu: d_close|Door: closing screens */
/* menu: fire|The end: the fire */
/* menu: recap|The end: your 4 functions */
(function () {
  'use strict';
  var H = window.Hour, HS = window.HourScene, D = HS.D, J = window.HourJudge, Snd = window.RescueSound, Au = window.HourSound, C = window.RescueChars;
  var V = H.V, clamp = H.clamp, lerp = H.lerp, smooth = H.smooth, esc = H.esc, el = H.el, save = H.save;
  var CLOCK = J.T.clock, RUSH = 1.5, WHO = ['billy', 'bobby', 'hog'];
  /* the storm seen through the glass: held while she writes, at the gate when her code ends at its slowest, at the door at 1 */
  var STORM_HELD = 0.3, STORM_CODE = 0.8;
  var HEAD_DEF = 'Write the {def} line. Give the function the name {rescue}. Give its gap the name {who}.';
  var HEAD_BODY = 'Write 3 print lines inside your function.';
  var SUB_BOX = 'Line 1 prints the word {open}. Line 2 prints the name in the gap called {who}. Line 3 prints the word {shut}.';
  var SUB_AGAIN = 'The faded lines are the lines you typed last time. Type them again and mend any wrong one.';
  var HEAD_LOOP = 'Now use your function. Write a loop that calls {rescue} for every name in {gang}.';
  var SUB_LOOP = 'Try hard yourself first. If you stay stuck, help appears under the box bit by bit.';
  var KEPT_LOOP = 'Your loop is still here. Run your code again.', KEPT_CALLS = 'Your calls are still here. Run your code again.';
  var ORDER = 'Print the word {open} first. Print {who} next, with no speech marks. Print the word {shut} last.';
  var HINT_BODY = 'Start with the door. Which word opens it?';
  var LINE_RUN = 'I cannot hold the storm while your code runs.', RETRY = 'Your code is still here. Mend it and run it again.';
  var CLOCK_LABEL = 'Time left before the storm reaches the house';

  /* ---------- small helpers ---------- */
  /* a line of words with code in it: {open} is shown as code, and {who} is the name she gave the gap */
  function tpl(text, gap) { return esc(text).replace(/\{(\w+)\}/g, function (m, w) { return '<code>' + esc(w === 'who' ? gap || 'who' : w) + '</code>'; }); }
  function data() { var d = save.data.door; if (!d) d = save.data.door = { gap: null, body: [], loop: null }; if (!d.body) d.body = []; return d; }
  function gang() { return ['Billy', 'Bobby', H.name()]; }
  function whoOf(name) { var g = gang(), i; for (i = 0; i < 3; i++) if (g[i] === name) return WHO[i]; return null; }
  function ready(st) { return !!st && ((st.mode === 'loop' && st.n >= 2) || (st.mode === 'direct' && st.calls.length > 0)); }
  function callsOf(st) { return st && st.mode === 'direct' ? st.calls : gang(); }
  function times(n) { return n + (n === 1 ? ' time' : ' times'); }
  function winLine(st) { var n = callsOf(st).length; return st.mode === 'loop' ? 'Your loop called rescue ' + times(n) + '.' : 'Your ' + n + (n === 1 ? ' call' : ' calls') + ' ran rescue ' + times(n) + '.'; }
  function after(text, then) { H.run([{ d: 1.2 + 0.35 * H.words(text) }], then); }
  /* a program for a picture of one step, or for a step opened from the prototype's menu */
  function proto(kind) {
    var dd = data(), gap = dd.gap || 'who', O = { k: 'open', w: 'open' }, S = { k: 'shut', w: 'shut' }, G = { k: 'gap', w: gap };
    var loop = { mode: 'loop', v: 'who', n: 2, calls: [] }, nm = H.name();
    dd.gap = gap; dd.body = [O, G, S]; dd.loop = loop;
    if (kind === 'noshut') dd.body = [O, G];
    if (kind === 'noopen') dd.body = [G, S];
    if (kind === 'name') dd.body = [O, { k: 'word', w: 'Billy' }, S];
    if (kind === 'direct') dd.loop = { mode: 'direct', v: null, n: 3, calls: ['Billy', 'Bobby', nm] };
    if (kind === 'direct2') dd.loop = { mode: 'direct', v: null, n: 2, calls: ['Billy', 'Bobby'] };
    if (kind === 'typo') dd.loop = { mode: 'direct', v: null, n: 3, calls: ['Billy', 'Bobby', nm.slice(0, -1)] };
  }
  function mk(text) { return H.rich(text).replace(/\{(\w+)\}/g, '<code>$1</code>'); }
  function picked() { var m = /^\w+$/.exec(window.RescueBridge.q.get('dprog') || ''); return m ? m[0] : null; }

  /* ---------- the cast ---------- */
  var said = [];
  function pose(who, m) {
    var p = who === 'hog' ? { wind: 0 } : { grip: 0, down: 1, wind: 0, name: who === 'billy' ? 'BILLY' : 'BOBBY' };
    p.fear = 1; p.tears = 1; p.joy = 0; p.look = [0.1, -0.1]; p.wind = 0.5;
    if (m === 'in') { p.fear = 0.6; p.tears = 0.3; p.look = [0.9, -0.1]; p.wind = 0; }
    if (m === 'going') { p.fear = 0.5; p.tears = 0.2; p.look = [-0.8, 0.1]; p.wind = 0.2; }
    if (m === 'dazed') { p.fear = 0.7; p.tears = 0.4; p.look = [0, 0.4]; }
    if (m === 'startled') { p.fear = 1; p.tears = 0.2; p.look = [0.9, -0.2]; p.wind = 0; }
    if (m === 'happy') { p.fear = 0; p.tears = 0; p.joy = 1; p.look = [0.3, -0.1]; p.wind = 0; }
    return p;
  }
  /* a frightened animal standing still shakes */
  var SHIVER = { out: 1, in: 0.4, dazed: 0.3, startled: 0.8 };
  function set(w, m) { var a = V.chars[w], keep = a.p.t; a.p = pose(w, m); a.p.t = keep; a.shiver = SHIVER[m] || 0; a.daze = m === 'dazed' ? 1 : 0; a.mood = m; }
  function all(m) { WHO.forEach(function (w) { set(w, m); }); }

  /* ---------- the room as it stands at the start of a step ----------
     o = { held, open, storm, fire, box, all: everyone is inside, inside: [who], inMood, moods: { who: mood } } */
  function world(o) {
    o = o || {};
    var ins = o.all ? WHO : o.inside || [];
    V.scene = 'door'; V.cam = { x: D.cam.x, y: D.cam.y, z: D.cam.z };
    V.dark = 0; V.white = 0; V.heart = 0; V.owl = null; V.hold = o.held ? 1 : 0;
    if (!o.all || o.storm === 1) Au.music(0, 1);
    V.door = o.open ? 1 : 0; V.doorShake = 0; V.gust = 0; V.blanket = 0; V.blanketAt = null; V.bonk = null;
    V.box = { on: o.box == null ? 1 : o.box, word: '', hot: false, bad: false, run: false };
    V.fireLit = o.fire == null ? 1 : o.fire; V.storm = o.storm == null ? STORM_HELD : o.storm;
    V.chars = {};
    WHO.forEach(function (w) {
      var isIn = ins.indexOf(w) >= 0, at = isIn ? D.rug[w] : [D.out[w], D.floor];
      V.chars[w] = { x: at[0], y: at[1], s: D.size[w], rot: 0, in: isIn, p: {} };
      set(w, (o.moods && o.moods[w]) || (isIn ? o.inMood || 'in' : 'out'));
    });
    V.blink = { x: D.perch[0], y: D.perch[1], s: 23, look: [-0.6, 0.3], fly: 0 };
    H.calm = true; H.quiet = !!o.held; H.stRate = o.held ? 0 : 1; H.windAmt = o.held ? 0.15 : 0.5;
    H.beds({ storm: 0, river: 0, indoors: o.held ? 0.12 : 0.5, fire: 0.8 * V.fireLit }, 1.2);
    said = [];
  }
  /* Blink lets the storm go: it runs again */
  function release() { H.stRate = 1; H.quiet = false; H.windAmt = 0.5; H.beds({ indoors: 0.5 }, 1); }

  /* ---------- her code on the panel ----------
     o = { defHot, chip: the name in the gap now, line: the body line running, call: the call running } */
  function useRows(st) {
    if (!st) return [];
    if (st.mode === 'loop') return ['for ' + st.v + ' in gang:'].concat(st.n >= 2 ? ['    rescue(' + st.v + ')'] : []);
    return st.calls.map(function (c) { return 'rescue("' + c + '")'; });
  }
  function codeHtml(o) {
    o = o || {};
    var dd = data(), old = dd.old || [], rows = [], calls = [], st = dd.loop, cur = useRows(st), prev = useRows(dd.oldLoop), i;
    rows.push('<span class="' + (o.gangHot ? 'hot' : '') + '">gang = [' + gang().map(function (g) { return '"' + esc(g) + '"'; }).join(', ') + ']</span>');
    if (dd.gap) rows.push('<span class="' + (o.defHot ? 'hot' : '') + '">def rescue(' + esc(dd.gap) + '):</span>' + (o.chip != null ? '<span class="chip">' + esc(dd.gap) + ' = "' + esc(o.chip) + '"</span>' : ''));
    dd.body.forEach(function (ln, n) { rows.push('<span class="' + (o.line === n ? 'now' : '') + '">    ' + esc(J.pyLine(ln)) + '</span>'); });
    for (i = dd.body.length; i < old.length; i++) rows.push('<span class="dim">    ' + esc(J.pyLine(old[i])) + '</span>');
    cur.forEach(function (t, n) {
      var c = o.call == null ? '' : st.mode === 'loop' ? 'hot' : o.call === n ? 'hot' : o.call > n ? 'tick' : '';
      calls.push('<span class="' + c + '">' + esc(t) + '</span>');
    });
    for (i = cur.length; i < prev.length; i++) calls.push('<span class="dim">' + esc(prev[i]) + '</span>');
    return '<span class="dcode">' + rows.join('\n') + (calls.length ? '<span class="callrow">' + calls.join('\n') + '</span>' : '') + '</span>';
  }
  function panel(o, note) { H.fn(codeHtml(o), note || '', 'YOUR CODE'); }
  function head(text, gap) { el.hh.innerHTML = tpl(text, gap); }
  function helpHtml(text, gap) { el.hhelp.innerHTML = '<span>' + tpl(text, gap) + '</span>'; }
  /* HELP, A LITTLE AT A TIME (his look, 6 Oct 2026): she tries hard first. A rung of help comes after a wait with no accepted
     line (IDLE story seconds since the step began or her last accepted line) or after wrong tries (o.wrongs, else WRONGS).
     Each rung is written in the help box under her typing box. A rung that comes by waiting knocks once and the box beats once.
     Blink says none of them: the words law leaves no room beside the heading, the sub line and a wrong line's feedback.
     Rungs do not go back down while she is stuck on the same line; an accepted line clears the box and the clock starts again.
     o = { level, wrongs, idle, stuck(), text(n) → '' | 'line' | { html } | { list } } */
  var IDLE = [30, 60, 90], WRONGS = [1, 3, 5];
  function ladder(step, o) {
    var W = o.wrongs || WRONGS, I = o.idle || IDLE, lad = { n: o.level || 0, floor: o.level || 0, wrong: 0, t: 0, t0: 0, shown: null };
    function rung() {
      var r = lad.n ? o.text(Math.min(lad.n, 3)) : '';
      if (!r) return { key: '' };
      if (typeof r === 'string') return { key: r, list: [r] };
      return { key: r.html || r.list.join('|'), html: r.html, list: r.list };
    }
    function update(byWait) {
      var r = rung();
      if (r.key === lad.shown) return;
      lad.shown = r.key;
      if (r.html) el.hhelp.innerHTML = '<span>' + r.html + '</span>'; else H.help(r.list || []);
      if (byWait && r.key) { Snd.move('knock'); H.cls(el.hhelp, 'beat', false); void el.hhelp.offsetWidth; H.cls(el.hhelp, 'beat', true); }
    }
    function raise(n, byWait) { if (n > lad.n) { lad.n = n; update(byWait); } }
    lad.bad = function () { lad.wrong++; raise(lad.wrong >= W[2] ? 3 : lad.wrong >= W[1] ? 2 : lad.wrong >= W[0] ? 1 : 0, false); };
    lad.ok = function () { lad.n = lad.floor; lad.wrong = 0; lad.t0 = lad.t; update(false); };
    step.tick = function (t) {
      lad.t = t;
      var idle = t - lad.t0;
      if (o.stuck()) raise(idle >= I[2] ? 3 : idle >= I[1] ? 2 : idle >= I[0] ? 1 : 0, true);
    };
    update(false);
    return lad;
  }

  /* ---------- 9.1: they reach the door ---------- */
  H.def('d_open', { ch: 4, save: true, enter: function () {
    save.data.door = { gap: null, body: [], loop: null }; H.store();
    world({ box: 0 });
    V.cam = { x: 720, y: 404, z: 1.5 };
    H.film([
      { cap: 'They reach the house. The door is shut.', cam: D.cam, camD: 3.2, d: 4, s: function () { Snd.move('knock'); } },
      { say: 'The door has a box beside it. The box takes typed instructions, like the winch did.', s: function () { Au.land(); }, f: function (u, t) { V.box.on = smooth(t / 0.8); } },
      { say: 'You will write the function for the door yourself. I will not show you the lines.', s: function () { V.box.on = 1; panel({}, 'The list called gang is already written for you.'); } },
      { say: 'I will hold the storm while you write.', s: function () { H.stRate = 0; H.quiet = true; H.windAmt = 0.15; H.beds({ indoors: 0.12 }, 1); },
        f: function (u, t) { V.hold = smooth(t / 1.2); } }
    ], function () { H.go('d_def'); });
  } });

  /* ---------- 9.2: step A, the def line ---------- */
  H.def('d_def', { ch: 4, save: true, enter: function () {
    var dd = save.data.door = { gap: null, body: [], loop: null }, lad = null;
    H.store();
    world({ held: true });
    panel({}, 'The list called gang is already written for you.');
    H.card({ k: 'THE DOOR' }); head(HEAD_DEF);
    lad = ladder(this, { wrongs: [2, 4, Infinity], stuck: function () { return true; }, text: function (n) { return n === 1 ? 'The pattern is def name(gap):' : 'Type def rescue(who):'; } });
    H.ask({ judge: J.doorDef,
      bad: function () { lad.bad(); },
      good: function (res) {
        dd.gap = res.gap; H.store(); H.wait(); panel({ defHot: true }); Au.land();
        after(res.msg, function () { H.go('d_body'); });
      } });
  }, exit: function () { this.tick = null; } });

  /* ---------- 9.3: step B, the lines inside ---------- */
  H.def('d_body', { ch: 4, save: true, enter: function () {
    var dd = data(), fails = save.fails.door || 0, lad = null;
    if (!dd.gap) dd.gap = 'who';
    var again = !!(dd.old && dd.old.length), gap = dd.gap, exact = again && fails >= 3, helpOn = again && fails >= 2 && !exact;
    var EXACT = ['    print("open")', '    print(' + gap + ')', '    print("shut")'];
    var PATTERN = 'The pattern is print("a word") or print(' + gap + ').';
    function mark() { [].forEach.call(el.hlines.children, function (li, i) { li.className = i < dd.body.length ? 'done' : i === dd.body.length ? 'now' : ''; }); }
    /* her function is finished: the reminder of lists and loops comes once, before her first loop */
    function finish() { H.onRun = null; dd.old = null; H.store(); H.go(save.data.reminded ? 'd_loop' : 'd_remind'); }
    /* the words under the heading: a retry shows the retry line alone. When the order help is showing, the help
       stands alone (the words gate: prose and feedback together stay under 60). The button says how to finish. */
    function sub() {
      el.hsub.innerHTML = again ? (helpOn ? '' : esc(SUB_AGAIN)) : (lad && lad.n >= 3 ? '' : tpl(SUB_BOX));
    }
    function ask() {
      H.ask({ pre: '    ', empty: true, judge: function (t) { return J.doorBody(dd.body.length, t, gap); },
        bad: function () { if (lad) lad.bad(); },
        good: function (res) {
          if (res.finish) return finish();
          dd.body.push(res.line); H.store(); panel(); H.runReady(true); Au.land(); mark(); if (lad) lad.ok(); sub(); ask();
        } });
    }
    world({ held: true });
    panel();
    H.card({ k: 'THE DOOR', run: 'My function is finished', runOff: !dd.body.length, lines: exact ? EXACT : null, now: dd.body.length });
    head(HEAD_BODY, gap);
    sub();
    if (again) { H.fb(dd.failLine || '', 'bad'); if (helpOn) helpHtml(ORDER, gap); }
    H.onRun = finish;
    ask();
    /* help a rung at a time: the first rung by waiting only, the pattern after 2 wrong tries or a longer wait, the order last (the sub line goes, for the words law) */
    if (!again) lad = ladder(this, { wrongs: [Infinity, 2, Infinity], stuck: function () { return dd.body.length < 3; },
      text: function (n) { if (n === 3) sub(); return n === 1 ? (dd.body.length ? '' : HINT_BODY) : n === 2 ? PATTERN : { html: tpl(ORDER, gap) }; } });
  }, exit: function () { this.tick = null; } });

  /* ---------- a reminder of lists and loops from Lesson 3 (his look, 6 Oct 2026): three short pages, once per pupil ---------- */
  var L3 = '<span class="dcode">playlist = ["Opening Night", "Curtain Up", "Last Bus Home"]\nfor song in playlist:\n<span class="hot">    print(song)</span></span>';
  var REM_1 = 'gang is a list. It holds three names in a row: Billy, Bobby and {name}. A list is like a rack of numbered boxes, one name in each.';
  var REM_2 = 'In Lesson 3 you wrote a loop like this. The line underneath runs once for each song. The four spaces push it inside the loop.';
  var REM_3 = 'Now write a loop through gang the same way. Each name goes into the gap of rescue, one at a time. Try hard yourself first. If you stay stuck, help appears under the box bit by bit.';
  var REM_NEXT = 'Write my loop';
  H.def('d_remind', { ch: 4, save: true, enter: function () {
    var dd = data();
    if (!dd.gap || !dd.body.length) { proto('ok'); dd.loop = null; }
    world({ held: true });
    H.pages([
      { bare: true, d: 2.5, say: REM_1.replace('{name}', H.name()), s: function () { panel({ gangHot: true }); } },
      { bare: true, d: 2.5, say: REM_2, s: function () { H.fn(L3, '', 'FROM LESSON 3'); } },
      { bare: true, d: 3, say: REM_3, next: REM_NEXT, s: function () { panel({ gangHot: true, defHot: true }); } }
    ], function () { save.data.reminded = true; H.store(); H.go('d_loop'); });
  } });

  /* ---------- 9.4: step C, the code that uses her function ---------- */
  H.def('d_loop', { ch: 4, save: true, enter: function () {
    var dd = data();
    if (!dd.gap || !dd.body.length) { proto('ok'); dd.loop = null; }
    var g = gang(), st = dd.loop, again = !!dd.oldLoop, fails = save.fails.door || 0, lad = null;
    function run() { H.onRun = null; dd.oldLoop = null; dd.kept = false; H.store(); H.go('d_run'); }
    world({ held: true });
    panel();
    if (dd.kept && ready(st)) {
      /* her function was mended: the code that uses it was kept */
      H.card({ k: 'THE DOOR', h: st.mode === 'loop' ? KEPT_LOOP : KEPT_CALLS, noBox: true, run: 'Run my code' });
      H.onRun = run; return;
    }
    /* the rungs of help: Lesson 3's loop as a reminder, then the pattern, then the lines. Inside her loop, the call. A direct call needs none. */
    function rung(n) {
      var inLoop = st && st.mode === 'loop';
      if (st && st.mode === 'direct') return '';
      if (inLoop) return n === 1 ? 'Now call rescue inside the loop. Put the word after for in the brackets of rescue.' : 'Type rescue(' + st.v + ')';
      if (n === 1) return 'In Lesson 3 your loop was for song in playlist: with print(song) underneath.';
      if (n === 2) return 'The pattern is for name in gang:';
      return { list: ['Type for who in gang:', 'Type rescue(who)'] };
    }
    function ask() {
      H.ask({ pre: st && st.mode === 'loop' ? '    ' : '', judge: function (t) { return J.doorLoop(st, t, g); },
        bad: function () { if (lad) lad.bad(); },
        good: function (res) {
          st = res.st; dd.loop = st; H.store(); panel(); Au.land();
          if (res.ready) H.runReady(true);
          if (lad) lad.ok();
          if (st.mode === 'loop' && st.n >= 2) H.wait(); else ask();
        } });
    }
    /* lines she typed before a reload, or before Blink's questions, are still hers. A retry after fails starts higher up the ladder. */
    var level = again ? (fails >= 3 ? 3 : fails >= 2 ? 2 : 0) : 0;
    H.card({ k: 'THE DOOR', sub: again ? SUB_AGAIN : SUB_LOOP, run: 'Run my code', runOff: !ready(st) });
    head(HEAD_LOOP);
    if (again) H.fb(dd.failLine || '', 'bad');
    H.onRun = run;
    lad = ladder(this, { level: level, stuck: function () { return !ready(st); }, text: rung });
    if (st && st.mode === 'loop' && st.n >= 2) H.wait(); else ask();
  }, exit: function () { this.tick = null; } });

  /* ---------- 9.5: her code runs. The storm is not held. ---------- */
  /* one animal goes in: over the step, then across the floor to the rug */
  var pawAt = {};
  function goIn(w, u) {
    var a = V.chars[w], thr = clamp(D.out[w], 644, 770), rug = D.rug[w], hog = w === 'hog', c, ph, n;
    if (u < 0.28) { c = u / 0.28; a.in = false; a.x = lerp(D.out[w], thr, c); a.y = D.floor - 7 * Math.abs(Math.sin(Math.PI * c)); return; }
    c = (u - 0.28) / 0.72; ph = c * 3; n = Math.floor(ph);
    a.in = true; a.x = lerp(thr, rug[0], smooth(c)); a.y = lerp(D.floor + 8, rug[1], c) - (c < 1 ? (hog ? 8 : 14) * Math.abs(Math.sin(Math.PI * ph)) : 0);
    if (c < 1 && pawAt[w] !== n) { pawAt[w] = n; Au.paw(hog ? 0.5 : 0.9); }
  }
  /* one animal runs at the shut door */
  function bonk(w, u, st) {
    var a = V.chars[w], c;
    if (u < 0.45) { c = u / 0.45; a.s = D.size[w] * (1 + 0.14 * c); a.y = D.floor + 5 * c; return; }
    c = (u - 0.45) / 0.55;
    if (!st.hit) { st.hit = true; Au.bonk(1); set(w, 'dazed'); }
    a.s = D.size[w] * (1 + 0.14 * (1 - smooth(c * 2))); a.y = D.floor + 5 * (1 - smooth(c * 2));
    V.bonk = { x: a.x, y: D.floor - 2.4 * D.size[w], u: c }; V.doorShake = 1 - c;
  }
  H.def('d_run', { ch: 4, enter: function () {
    var dd = data(), pick = picked();
    if (pick || !dd.gap || !dd.body.length || !ready(dd.loop)) proto(pick || 'ok');
    var g = gang(), calls = callsOf(dd.loop), sim = J.simDoor(dd.body, calls, g), ev = sim.events, win = winLine(dd.loop) + ' Everyone is home.';
    var first = !(save.fails.door > 0), lead = first ? H.dur(LINE_RUN) : 0.7, open = false, over = false, thudAt = -1;
    world({ held: true });
    panel();
    pawAt = {};
    var segs = [{ d: lead, s: function () { if (first) H.say(LINE_RUN); }, f: function (u) { V.hold = 1 - smooth((u * lead - (lead - 0.7)) / 0.7); },
      e: function () {
        H.say(null); release(); V.hold = 0; V.box.run = true;
        H.card({ k: 'THE DOOR', h: 'Your code is running.', noBox: true, gauge: true }); H.gauge({ label: CLOCK_LABEL, frac: 1 });
      } }];
    ev.forEach(function (e) {
      var was = open, w = e.who ? whoOf(e.who) : null, st = {}, badWord = e.what === 'nobody' || e.what === 'bonk';
      if (e.what === 'open') open = true; else if (e.what === 'shut') open = false;
      segs.push({ d: e.dur,
        s: function () {
          if (said.length && said[said.length - 1].c === 'hot') said[said.length - 1].c = 'done';
          said.push({ w: e.word, c: badWord ? 'bad' : 'hot' }); H.prints(said);
          V.box.word = e.word; V.box.hot = !badWord; V.box.bad = badWord;
          panel({ line: e.line, call: e.call, chip: calls[e.call] });
          Au.click(0.7);
          if (e.what === 'open' && !was) { Au.latch(); Au.creak(); }
          if (e.what === 'enter') { set(w, 'going'); pawAt[w] = -1; }
        },
        f: function (u) {
          if (e.what === 'open' && !was) V.door = smooth(u);
          else if (e.what === 'shut' && was) V.door = 1 - smooth(u);
          else if (e.what === 'enter') goIn(w, u);
          else if (e.what === 'bonk') bonk(w, u, st);
          else if (e.what === 'already') V.chars[w].p.hop = Math.sin(Math.PI * u);
        },
        e: function () {
          if (e.what === 'shut' && was) { Au.thud(0.5); Au.latch(); }
          if (e.what === 'enter') set(w, 'in');
          if (e.what === 'bonk') { V.bonk = null; V.doorShake = 0; }
          if (e.what === 'already') V.chars[w].p.hop = 0;
        } });
    });
    /* her code has ended: the storm comes the last of the way, the same every time */
    segs.push({ d: RUSH, s: function () {
      if (said.length && said[said.length - 1].c === 'hot') said[said.length - 1].c = 'done';
      H.prints(said); V.box.word = ''; V.box.hot = false; V.box.bad = false; V.box.run = false;
      panel(); el.hh.textContent = 'Your code has finished.';
      WHO.forEach(function (w) { if (V.chars[w].in) set(w, 'startled'); });
    } });
    if (sim.safe) {
      segs.push({ d: 1.7, s: function () { over = true; H.gauge(null); Au.slam(); H.flashNow(true); H.beds({ indoors: 1 }, 0.3); V.storm = 1; },
        f: function (u) { V.doorShake = 1 - u; V.fireLit = 1 - 0.4 * Math.sin(Math.PI * clamp(u * 1.5, 0, 1)); } });
      segs.push({ d: H.dur(win) + 0.9, s: function () {
        V.doorShake = 0; V.fireLit = 1; all('happy'); H.beds({ indoors: 0.5 }, 1.5);
        Snd.happy('kit'); Snd.happy('pup'); Au.happySqueak(1); H.fb(win, 'good');
      }, f: function (u) { WHO.forEach(function (w, i) { V.chars[w].p.hop = Math.max(0, Math.sin((u * 5 - i * 0.25) * Math.PI)) * (u < 0.6 ? 1 : 0); }); } });
    }
    H.run(segs, function () {
      over = true;
      if (!sim.safe) return H.go('d_fail', { sim: sim });
      dd.old = null; dd.oldLoop = null; dd.site = null; dd.failLine = null; H.store(); H.go('d_close');
    });
    this.tick = function (t) {
      if (over) return;
      var tc = t - lead, end = sim.time, used = 0, s = STORM_HELD, r, n;
      if (tc > 0 && tc < end) { used = tc / CLOCK; s = lerp(STORM_HELD, STORM_CODE, used); }
      else if (tc >= end) { r = clamp((tc - end) / RUSH, 0, 1); used = lerp(end / CLOCK, 1, r); s = lerp(lerp(STORM_HELD, STORM_CODE, end / CLOCK), 1, smooth(r)); }
      V.storm = s;
      if (tc > 0) H.gauge({ label: CLOCK_LABEL, frac: 1 - used });
      /* the storm can be heard coming */
      n = Math.floor(tc / 2.4); if (tc > 0 && n !== thudAt) { thudAt = n; if (n > 0) Au.thud(0.25 + 0.5 * used); }
    };
  }, exit: function () { this.tick = null; } });

  /* the storm gets in, or someone is left outside. Black, Blink's turned head, the one line that says why, the rewind. */
  H.def('d_fail', { ch: 4, enter: function (arg) {
    var dd = data(), pick = picked();
    if (!arg.sim) { proto(pick && pick !== 'ok' ? pick : 'noshut'); }
    var g = gang(), sim = arg.sim || J.simDoor(dd.body, callsOf(dd.loop), g), open = sim.open;
    save.fails.door = (save.fails.door || 0) + 1; dd.site = J.doorSite(dd.body, g); dd.failLine = sim.fail; H.store();
    world({ open: open, storm: 1, inside: sim.inside.map(whoOf), inMood: 'startled' });
    panel(); H.card({ k: 'THE DOOR', h: 'Your code has finished.', noBox: true });
    var owl = { open: 0, turn: 0, body: 0, look: [0, 0] };
    H.run([
      { d: 1.8, s: function () { H.flashNow(true); if (open) { Au.whoosh(1.5); H.beds({ storm: 0.7, indoors: 0.9 }, 0.3); } else { Au.slam(); H.beds({ indoors: 0.9 }, 0.3); } },
        f: function (u) {
          if (open) V.gust = smooth(u / 0.45); else V.doorShake = 1 - u;
          V.fireLit = 1 - (open ? 1 : 0.7) * smooth(u / 0.6); V.dark = smooth((u - 0.5) / 0.5);
        } },
      { d: 0.5, s: function () { H.card(null); H.fn(null); H.prints(null); V.scene = 'black'; V.dark = 0; V.owl = owl; H.quiet = true; H.beds({ storm: 0, indoors: 0, fire: 0 }, 0.4); } },
      { d: 0.7, f: function (u) { owl.open = smooth(u); owl.body = smooth(u); } },
      { d: 1.1, gap: 0.5, s: function () { Snd.hoot(); }, f: function (u) { owl.turn = smooth(u); } },
      { d: H.dur(sim.fail), gap: 0.2, s: function () { H.cap(sim.fail); }, e: function () { H.cap(null); } },
      { d: 1.5, gap: 0.3, s: function () { Snd.rewind(1.5); }, f: function (u) { V.white = 0.5 * Math.sin(Math.PI * u); } }
    ], function () { H.go('d_retry'); });
  } });

  /* back at the door with her code kept. The fault is in her function (step B) or in the code that uses it (step C). */
  H.def('d_retry', { ch: 4, save: true, enter: function () {
    var dd = data(), fails = save.fails.door || 0, inBody = dd.site !== 'loop', beats = [{ say: RETRY }];
    if (!dd.gap || !dd.body.length) { proto('noshut'); dd.site = 'body'; dd.failLine = 'Everyone was inside, but the door was still open.'; inBody = true; }
    world({ held: true });
    panel();
    if (inBody && fails >= 2) beats.push({ say: 'Try this order. Print the word open first. Print ' + dd.gap + ' next, with no speech marks. Print the word shut last.' });
    H.film(beats, function () {
      if (inBody) { dd.old = dd.body.slice(); dd.body = []; dd.kept = true; H.store(); H.go('d_body'); }
      else { dd.oldLoop = dd.loop; dd.loop = null; H.store(); H.go('d_loop'); }
    });
  } });

  /* ---------- 9.6: two closing screens ---------- */
  function face(cv, who) {
    var px = 208, c = cv.getContext('2d'), keep = C.light.night, kf = C.light.flash, hog = who === 'hog', s = hog ? 47 : 61;
    cv.width = cv.height = px; C.light.night = [0.86, 0.86, 0.9]; C.light.flash = 0;
    c.save(); c.translate(px / 2, hog ? px * 0.42 : px * 0.47); c.scale(s, s);
    var p = hog ? { t: 1.3, fear: 0, joy: 1, tears: 0, look: [0, 0], px: s } : { t: 1.3, fear: 0, joy: 1, tears: 0, grip: 0, down: 1, wind: 0, name: who === 'billy' ? 'BILLY' : 'BOBBY', look: [0, 0], px: s };
    (hog ? C.hog : who === 'billy' ? C.kitten : C.puppy)(c, p); c.restore(); C.light.night = keep; C.light.flash = kf;
  }
  function fnText(dd) { return 'def rescue(<u>' + esc(dd.gap) + '</u>):\n' + dd.body.map(function (ln) { return '    ' + (ln.k === 'gap' ? 'print(<u>' + esc(ln.w) + '</u>)' : esc(J.pyLine(ln))); }).join('\n'); }
  H.def('d_close', { ch: 4, save: true, enter: function () {
    var dd = data();
    if (!dd.gap || !dd.body.length || !ready(dd.loop)) proto(picked() || 'ok');
    var st = dd.loop, loop = st.mode === 'loop', nm = esc(H.name()), n = callsOf(st).length, v = loop ? esc(st.v) : 'who';
    var use = loop ? 'for ' + v + ' in gang:\n    rescue(<b>' + v + '</b>)' : st.calls.map(function (c) { return 'rescue(<b>"' + esc(c) + '"</b>)'; }).join('\n');
    var gangLine = 'gang = ["Billy", "Bobby", "' + nm + '"]';
    world({ all: true, inMood: 'happy', storm: 1 });
    H.badge({ id: 'b12', name: 'Door Keeper', xp: 15, kind: 'door' }, function () { H.pages([
      { html: '<h2>You can write your own function, and other code can use it.</h2><div class="cols">' +
          '<div><div class="k">' + (loop ? 'YOUR LOOP' : 'YOUR CALLS') + '</div><div class="hstack hcode">' + use + '</div></div><div class="arrow"></div>' +
          '<div><div class="k">YOUR FUNCTION</div><div class="hstack mine hcode">' + fnText(dd) + '</div></div><div class="arrow"></div>' +
          '<div class="faces three"><figure><canvas id="f1"></canvas><figcaption>Billy</figcaption></figure><figure><canvas id="f2"></canvas><figcaption>Bobby</figcaption></figure>' +
          '<figure><canvas id="f3"></canvas><figcaption>' + nm + '</figcaption></figure></div></div>' +
          '<div class="lines"><p>Nobody showed you these lines. You wrote the function <code class="hcode">rescue</code> yourself.</p><p>' +
          (loop ? 'Your loop called <code class="hcode">rescue</code> ' + times(n) + '.' : n === 1 ? 'Your 1 call ran <code class="hcode">rescue</code> 1 time.' : 'A loop could make your ' + n + ' calls for you.') + '</p></div>',
        after: function (p) { face(p.querySelector('#f1'), 'billy'); face(p.querySelector('#f2'), 'bobby'); face(p.querySelector('#f3'), 'hog'); } },
      { html: '<div class="cols"><div class="hstack mine hcode">' + gangLine + '\nfor ' + v + ' in gang:\n    rescue(' + v + ')</div></div>' +
          '<p class="seen" style="margin-top:1.4rem">' + (loop ? 'You saw this: the loop called <code class="hcode">rescue</code> once for each name in <code class="hcode">gang</code>.' : 'A loop over <code class="hcode">gang</code> calls <code class="hcode">rescue</code> once for each name.') + '</p>' +
          '<p class="q">The gang grows to 10 animals. How many times does the loop call <code class="hcode">rescue</code>?</p>' +
          '<div class="opts"></div><p class="qfb"></p>',
        q: { opts: [
          { t: '10 times', right: true, fb: 'Yes. The loop calls rescue once for every name in the list.' },
          { t: '3 times', fb: 'There were 3 names in gang tonight. The loop calls rescue once for every name.' },
          { t: '1 time', fb: 'rescue is written once. The loop calls it once for every name.' }] } }
    ], function () { H.go('fire'); }); });
  } });

  /* ---------- 10.1: the fire ---------- */
  /* one blanket over the three, up to their chins so the smiles show. The hedgehog sits up on a fold of it. */
  function tuck() { V.blanket = 1; V.blanketAt = [520, 660, 250]; V.chars.hog.x = 592; V.chars.hog.y = 622; }
  H.def('fire', { ch: 5, save: true, enter: function () {
    world({ all: true, inMood: 'happy', storm: 1, box: 0.35 });
    tuck();
    var B = V.blink, nm = H.name(), rattle = -1, HEARTH = { x: 440, y: 520, z: 1.55 }, SILL = { x: 520, y: 470, z: 1.4 };
    V.cam = { x: HEARTH.x, y: HEARTH.y, z: HEARTH.z };
    function looks(x, y) { WHO.forEach(function (w) { V.chars[w].p.look = [x, y]; }); }
    function shut(w, c) { var p = V.chars[w].p; p.blink = c; p.joy = 1 - 0.55 * c; if (w === 'hog') p.sleep = c; p.look = [0.1, 0.3]; }
    H.film([
      { cap: 'Billy, Bobby and ' + nm + ' are home. They are safe and dry.', cam: HEARTH, d: 5.1 },
      { cap: 'The storm is loud outside the door you shut.', cam: { x: 700, y: 400, z: 1.25 }, camD: 1.6, d: 4.4,
        s: function () { H.flashNow(true); all('in'); looks(0.9, -0.2); H.beds({ indoors: 0.9 }, 0.4); },
        f: function (u, t) {
          var n = Math.floor(t / 1.25), c = t / 1.25 - n;
          if (n !== rattle) { rattle = n; Au.slam(); }
          V.doorShake = Math.max(0, 1 - c * 2.4);
        } },
      { cap: 'It cannot get in.', cam: SILL, camD: 2.4, d: 3.4,
        s: function () { V.doorShake = 0; all('happy'); H.beds({ indoors: 0.5 }, 1.5); B.look = [-0.6, 0.4]; },
        f: function (u, t) {
          var c = smooth((t - 0.4) / 2.2);
          B.x = lerp(D.perch[0], D.sill[0], c); B.y = lerp(D.perch[1], D.sill[1], c) - Math.sin(Math.PI * c) * 46; B.fly = clamp(Math.min(c, 1 - c) * 6, 0, 1);
        } },
      { say: 'You wrote 4 functions tonight. Each one saved them.', s: function () { B.x = D.sill[0]; B.y = D.sill[1]; B.fly = 0; B.wink = 1; B.look = [-0.5, 0.5]; } },
      /* nothing is said: the three fall asleep one at a time, Blink shuts her eye, the storm becomes rain */
      /* his look, 6 Oct 2026: the cosy music comes in as they sleep, and the room fades to black under it */
      { d: 10.5, gap: 0.6, s: function () { H.quiet = true; H.beds({ indoors: 0.1, fire: 0.6 }, 5); Au.music(1, 4); },
        f: function (u, t) {
          shut('billy', smooth((t - 0.8) / 1.3)); shut('bobby', smooth((t - 2.0) / 1.3)); shut('hog', smooth((t - 3.2) / 1.3));
          B.open = 1 - smooth((t - 4.6) / 1.2); V.storm = lerp(1, 0.45, smooth(t / 6.5));
          V.dark = smooth((t - 7.5) / 3);
        } }
    ], function () { H.go('recap'); });
  } });
  /* the room at the very end: all asleep, the fire lit, rain at the window */
  function asleep() {
    world({ all: true, inMood: 'happy', storm: 0.45, box: 0.35, held: false });
    tuck(); H.quiet = true; H.beds({ indoors: 0.15, fire: 1 }, 1);
    WHO.forEach(function (w) { var p = V.chars[w].p; p.blink = 1; p.joy = 0.45; p.look = [0.1, 0.3]; if (w === 'hog') p.sleep = 1; });
    V.blink.x = D.sill[0]; V.blink.y = D.sill[1]; V.blink.open = 0; V.blink.wink = 1;
    V.cam = { x: 520, y: 470, z: 1.4 };
  }
  /* after the fade: black, the music on, the fire low (his look, 6 Oct 2026) */
  function ended() { asleep(); V.dark = 1; H.beds({ storm: 0.2, indoors: 0.08, fire: 0.3 }, 1); Au.music(1, 2); }
  H.icon = icon;

  /* ---------- 10.2: her 4 functions ---------- */
  function icon(cv, kind) {
    var px = 128, c = cv.getContext('2d'), i;
    cv.width = cv.height = px; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#ffd27a'; c.fillStyle = '#ffd27a'; c.lineWidth = 7;
    c.beginPath();
    if (kind === 'rung') {
      c.moveTo(42, 14); c.lineTo(36, 114); c.moveTo(86, 14); c.lineTo(92, 114);
      for (i = 0; i < 4; i++) { c.moveTo(41 - i * 1.4, 30 + i * 23); c.lineTo(87 + i * 1.4, 30 + i * 23); }
      c.stroke();
    } else if (kind === 'cross') {
      c.moveTo(8, 26); c.quadraticCurveTo(64, 40, 120, 26); c.moveTo(64, 33); c.lineTo(64, 58); c.stroke();
      c.beginPath(); c.moveTo(36, 60); c.lineTo(92, 60); c.lineTo(84, 108); c.lineTo(44, 108); c.closePath(); c.stroke();
      c.beginPath(); c.arc(64, 60, 28, Math.PI, 0); c.lineWidth = 4; c.stroke();
    } else if (kind === 'dash') {
      c.moveTo(64, 56); c.lineTo(64, 116); c.moveTo(46, 116); c.lineTo(82, 116); c.stroke();
      c.beginPath(); c.rect(46, 20, 36, 36); c.stroke(); c.beginPath(); c.moveTo(40, 20); c.lineTo(64, 6); c.lineTo(88, 20); c.stroke();
      c.beginPath(); c.arc(64, 39, 8, 0, Math.PI * 2); c.fill();
    } else {
      c.rect(34, 14, 60, 100); c.stroke();
      c.beginPath(); c.globalAlpha = 0.35; c.fillRect(44, 24, 40, 42); c.globalAlpha = 1;
      c.beginPath(); c.arc(82, 72, 4.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(20, 116); c.lineTo(108, 116); c.stroke();
    }
  }
  H.def('recap', { ch: 5, save: true, enter: function () {
    var gap = esc(data().gap || 'who');
    ended();
    var ROWS = [['rung', 'rung()', 'A function saves writing the same lines again.'], ['cross', 'cross(who)', 'One function does the same job for different names.'],
      ['dash', 'dash()', 'Change a function once. Every call uses the change.'], ['rescue', 'rescue(' + gap + ')', 'You can write your own function.']];
    H.pages([{ html: '<h2>Your 4 functions brought them home.</h2><div class="rec">' + ROWS.map(function (r) {
      return '<div class="recrow"><canvas data-i="' + r[0] + '"></canvas><code class="hcode">' + r[1] + '</code><span>' + r[2] + '</span></div>'; }).join('') + '</div>',
      after: function (p) { [].forEach.call(p.querySelectorAll('canvas'), function (cv) { icon(cv, cv.getAttribute('data-i')); }); } }],
    function () { save.data.ended = true; H.store(); window.RescueBridge.done('end'); });
  } });

  /* 10.3 and 10.4, Blink's 5 questions and How did it go?, are the platform's own exit check and self-evaluation,
     which come after the story in the lesson (spec section 10). The story ends on the recap. */
})();
