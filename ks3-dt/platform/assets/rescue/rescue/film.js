/* The Rescue, art test: the opening film, the long way against the clock, the fall, Blink and the rewind,
   then Blink's lesson: she writes the function, uses it, and sees what it saved.
   One clock drives the picture, the words and the sound. Every sound has a drawn twin. */
(function () {
  'use strict';
  var Sc = window.RescueScene, Snd = window.RescueSound, G = Sc.G, SHOT = Sc.SHOT;
  var q = new URLSearchParams(location.search);
  function num(k, d) { var v = parseFloat(q.get(k)); return isNaN(v) ? d : v; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function $(id) { return document.getElementById(id); }
  /* 0 outside the window, a soft hump inside it */
  function hump(t, t0, d) { var u = (t - t0) / d; return u <= 0 || u >= 1 ? 0 : Math.pow(Math.sin(u * Math.PI), 0.6); }
  function fadeWin(t, a, b, f) { return clamp((t - a) / f, 0, 1) * clamp((b - t) / f, 0, 1); }
  function mix(a, b, t) { return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) }; }
  function track(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) if (t < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], smooth((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
    return keys[keys.length - 1][1];
  }

  var OPT = { auto: q.has('auto'), autotype: q.has('auto') || q.has('autotype'), mute: q.has('mute'), noflash: q.has('noflash'), freeze: q.has('freeze'), clock: num('clock', 60), typist: num('typist', 5.5), typist2: num('typist2', 2.2), speed: num('speed', 1) };
  /* the long way is ordinary instructions: four print lines for every rung */
  var WORDS = ['unlock', 'push', 'lock', 'check'], TOTAL = 32;
  var LINES = WORDS.map(function (w) { return 'print("' + w + '")'; });
  var DEFLINE = 'def rung():', CALL = 'rung()';
  var DEF = [DEFLINE].concat(LINES.map(function (l) { return '    ' + l; }));
  var T_CARD = 52.9, T_TYPE = 53.1, CRACK0 = 0.26, T_BLACK = 4.6, T_STUMP = 7.6, T_EYES = 16.3, T_TURN = 22.5, T_BACK = 26.5, T_END = 31.8, T_DEF = 24.5;
  var STUMP = { x: 620, y: -1180, z: 0.92 }, LAST = { x: 690, y: -1164, z: 0.86 }, REVEAL = { x: 700, y: -1290, z: 1.25 }, SAFE = { x: 760, y: -1272, z: 1.45 };
  var CAMKEYS = [[12.8, SHOT.FOOT], [14.2, SHOT.FOOT], [20.4, REVEAL], [21.2, REVEAL], [22.0, SHOT.BOTH], [22.4, SHOT.BOTH], [23.6, SHOT.KIT], [26.0, SHOT.KIT], [27.2, SHOT.PUP], [31.0, SHOT.PUP], [32.4, SHOT.BOTH], [35.0, SHOT.BOTH], [37.2, SHOT.CRACK], [39.8, SHOT.CRACK]];
  var MEWS = [21.5, 24.4, 33.0], WHIMS = [21.95, 28.0, 29.9, 33.6], TEARS = [37.6, 39.4];
  /* the words on the picture. Each one stays for at least 1.2 s and 0.35 s a word. */
  var CAPS = [
    [22.4, 26.1, 'Billy the kitten is losing his grip.', ''],
    [27.0, 31.4, 'Bobby the puppy cannot stop shaking.', ''],
    [37.2, 41.4, 'The branch is splitting away from the tree.', ''],
    [47.4, 52.9, 'The ladder is 8 rungs too short to reach Billy and Bobby.', 'left']
  ];
  var SAY1 = 'There’s another way to save them!', SAY2 = 'Same storm. Same branch. Same time. One word.', SAY3 = 'Your function is still here. Try again!';
  var WIN = 'You typed all 32 lines in time. Billy and Bobby are safe.';
  /* Blink's lesson, with the storm held still. Times are on the lesson clock. */
  var TEACH = [
    [0.6, 5.2, 'I am holding the storm still. Take your time.'],
    [5.6, 9.6, 'Here are the 32 lines you needed.'],
    [9.8, 14.6, 'Each of the 8 rungs needs the same 4 lines.'],
    [14.8, 19.6, 'Write those 4 lines once and give them a name.'],
    [19.8, 24.3, 'That is a function. Its name will be rung.']
  ];
  var SAY_WAIT = 'Nothing moved. A function waits until you use its name.', SAY_USE = 'Now use it. Type rung() and watch all 4 lines run.', SAY_ONE = 'That 1 line did the work of 4 lines.';
  var CARD = {
    long: { h: 'Type these 4 lines to push the ladder up 1 rung.', list: LINES },
    def: { h: 'Type these 5 lines to make a function called rung.', list: DEF },
    call: { h: 'Type rung() to push the ladder up 1 rung.', list: [CALL] }
  };
  var Q3 = {
    '20': ['20 times', 'Yes. Each rung() climbs 1 rung. 20 short lines do the work of 80 lines.'],
    '80': ['80 times', '80 is the long way, 4 lines for every rung. rung() runs those 4 lines for you.'],
    '5': ['5 times', '5 lines made your function. You type rung() once for every rung.']
  };

  var P = { phase: 'call', rt: 0, ft: 0, st: 0, tc: 0, clockOn: false, typeAt: 0, xt: 0, wt: 0, lt: 0, lines: 0, demo: false, endOf: 'win', round: 1, gen: 0,
    evt: 0, xevt: 0, lastStrike: -1, lastGust: 0, lastWind: -9, beatAt: -9, nextBeat: 0, bpm: 0, hlevel: 0.5,
    rungs: 0, latch: 0, pushAt: -9, pushFrom: 0, pushTo: 0, checkAt: -9, moveAt: -9, tearAt: -9, tearN: 0, voiceAt: -9, voiceWho: '', nextVoice: 5, nextAuto: 0, crackWin: CRACK0, fallRungs: 0,
    typed1: null, demo1: false, defn: 0, defAt: -9, typed2: 0, hist2: [], done2: false, again: false, g2At: -9, callAt: -99, firstCallAt: -9, spare: 0,
    sign: [], signFlashAt: -9, signClearAt: -1, why: 1, whyAt: 0, order: ['80', '20', '5'], tried: {}, pick: '', first3: '', right3: false };
  var S = { cam: SHOT.TYPING };
  var el = {}, soundOff = false;

  /* ---------- the sounds that happen at fixed moments ---------- */
  var EV = [];
  MEWS.forEach(function (t) { EV.push([t, function () { Snd.mew(false); }]); });
  WHIMS.forEach(function (t) { EV.push([t, function () { Snd.whimper(); }]); });
  TEARS.forEach(function (t) { EV.push([t, function () { Snd.tear(false); }]); });
  EV.push([24.0, function () { Snd.move('knock'); }]);
  EV.push([44.0, function () { Snd.move('knock'); }]);
  for (var m = 0; m < 8; m++) EV.push([47.6 + m * 0.25, function () { Snd.move('mark'); }]);
  EV.sort(function (a, b) { return a[0] - b[0]; });
  /* the fall: one long cry from each of them, fading as they drop out of sight */
  var XEV = [
    [0.3, function () { Snd.cry(4.5); }],
    [T_BLACK, function () { Snd.fxLevel(0, 0.05); }],
    [T_STUMP, function () { Snd.fxLevel(1, 0.3); Snd.rainOnly(true); Snd.stormLevel(0.35, 2.0); }],
    [T_EYES + 0.1, function () { Snd.hoot(); }],
    [T_TURN + 0.1, function () { Snd.rewind(3.7); }],
    [26.3, function () { Snd.rainOnly(false); Snd.stormLevel(0.55, 0.6); }]
  ];
  function seek(list, t) { var i = 0; while (i < list.length && list[i][0] < t) i++; return i; }
  /* things that happen a moment later. Moving to another part cancels them. */
  var queue = [];
  function later(d, fn) { queue.push({ at: P.rt + d, gen: P.gen, fn: fn }); }
  function runQueue() {
    for (var i = 0; i < queue.length; i++) {
      var e = queue[i];
      if (e.gen !== P.gen) queue.splice(i--, 1);
      else if (P.rt >= e.at) { queue.splice(i--, 1); e.fn(); }
    }
  }

  /* ---------- moving between the parts ---------- */
  function resetRun() { P.lines = 0; P.tc = 0; P.clockOn = false; P.rungs = 0; P.latch = 0; P.pushAt = P.checkAt = P.moveAt = P.tearAt = P.voiceAt = -9; P.tearN = 0; P.nextVoice = 5; P.sign = []; P.signClearAt = -1; P.signFlashAt = -9; fb('', ''); }
  function soundState() {
    var ph = P.phase;
    if (ph === 'call') { Snd.stormLevel(0, 0.2); return; }
    Snd.fxLevel(1, 0.1);
    if (ph === 'fall') {
      if (P.xt < T_STUMP) Snd.stormLevel(0, 0.2);
      else { Snd.stormLevel(P.xt < 26.3 ? 0.35 : 0.55, 0.5); Snd.rainOnly(P.xt < 26.3); }
    } else if (ph === 'learn') { Snd.stormLevel(0.07, 1.5); Snd.rainOnly(true); }
    else if (ph === 'safe' || (ph === 'end' && P.endOf === 'safe')) { Snd.stormLevel(0.3, 2.5); Snd.rainOnly(false); }
    else if (ph === 'why') { Snd.stormLevel(0.15, 1.0); Snd.rainOnly(true); }
    else { Snd.stormLevel(0.55, 1.2); Snd.rainOnly(false); }
  }
  function go(phase, o) {
    o = o || {};
    P.phase = phase; P.gen++; P.lastStrike = -1; P.nextBeat = 0;
    if (phase !== 'fall') Snd.cryOff();
    if (phase === 'call') { resetRun(); P.round = 1; P.demo = false; P.ft = 0; }
    if (phase === 'film') { resetRun(); P.round = 1; P.demo = false; P.ft = o.ft || 0; P.st = P.ft; P.evt = seek(EV, P.ft); if (P.ft > 0.6) P.lastStrike = Sc.strike(P.st).idx; }
    if (phase === 'typing') { resetRun(); P.round = 1; P.demo = false; P.ft = 54; P.lines = o.lines || 0; P.tc = o.tc || 0; P.clockOn = P.tc > 0; P.st = 60 + P.tc; P.typeAt = P.rt; P.rungs = rungTarget(); P.latch = latchTarget(); P.nextAuto = P.rt + 1; seedSign(P.lines % 4, false); }
    if (phase === 'fall') {
      if (o.lines != null) P.lines = o.lines;
      P.round = o.round || P.round;
      if (P.round === 1) { P.demo = !!o.demo; P.typed1 = P.lines; P.demo1 = P.demo; }
      P.fallRungs = rungTarget(); P.rungs = P.fallRungs; P.xt = o.xt || 0; P.xevt = seek(XEV, P.xt); if (o.st != null) P.st = o.st; P.sign = [];
    }
    if (phase === 'win') { P.lines = TOTAL; P.rungs = 8; P.latch = 0; P.wt = o.wt || 0; P.crackWin = lerp(CRACK0, 1, P.tc / OPT.clock); P.endOf = 'win'; }
    if (phase === 'learn') {
      if (P.typed1 == null) { P.typed1 = 9; P.demo1 = true; }
      resetRun(); P.round = 1; P.lt = o.lt || 0; P.defn = o.defn || 0; P.defAt = o.wait ? P.rt - 1.5 : -9; P.nextAuto = P.rt + 1; setHers();
    }
    if (phase === 'go2') {
      resetRun(); P.round = 2; P.typed2 = 0; P.hist2 = []; P.done2 = false; P.again = !!o.again; P.defn = 5;
      P.st = 60; P.typeAt = P.g2At = P.rt; P.firstCallAt = -9; P.callAt = -99; P.nextAuto = P.rt + 1.5;
      if (o.calls) {
        P.lines = 4 * o.calls; P.typed2 = o.calls; for (var i = 0; i < o.calls; i++) P.hist2.push(CALL);
        P.rungs = o.calls; P.firstCallAt = P.rt - 30; P.g2At = P.rt - 40; seedSign(4, true);
        fb('rung() ran all 4 of its lines. Rung ' + o.calls + ' of 8 is done.', 'good');
      }
      if (o.tc) { P.tc = o.tc; P.clockOn = true; P.st = 60 + o.tc; }
    }
    if (phase === 'safe') { P.lines = TOTAL; P.rungs = 8; P.latch = 0; P.wt = o.wt || 0; P.crackWin = lerp(CRACK0, 1, clamp(P.tc / OPT.clock, 0, 1)); P.endOf = 'safe'; }
    if (phase === 'why') {
      P.why = o.n || 1; P.whyAt = P.rt;
      if (o.fresh) {
        P.tried = {}; P.pick = ''; P.first3 = ''; P.right3 = false;
        if (!OPT.freeze) P.order.sort(function () { return Math.random() - 0.5; });
        buildWhy();
      }
      renderWhy3();
    }
    if (phase === 'end') { P.endOf = o.of || P.endOf; }
    renderCard();
    if (mode()) focusInput(); else if (el.inp) el.inp.blur();
    soundState();
  }
  function answer() {
    if (OPT.mute) Snd.disable(); else { Snd.start(); Snd.setMuted(soundOff); }
    go('film', { ft: 0 });
  }
  function startFall() { go('fall', { xt: 0 }); Snd.tear(true); Snd.stormLevel(0, 0.5); Snd.fxLevel(0, 0.9); }

  /* ---------- the typing ---------- */
  /* which card she is typing into just now: the long way, the function, or the call. Nothing while a card is shut. */
  function mode() { var ph = P.phase; return ph === 'typing' ? 'long' : ph === 'go2' ? (P.done2 ? null : 'call') : ph === 'learn' && P.lt >= T_DEF && P.defn < 5 ? 'def' : null; }
  function rungTarget() { return Math.floor(P.lines / 4) + (P.lines % 4 >= 2 ? 1 : 0); }
  function latchTarget() { var s = P.lines % 4; return s === 1 || s === 2 ? 1 : 0; }
  function fb(text, kind) { if (el.fb) { el.fb.innerHTML = rich(text); el.fb.className = 'fb ' + kind; } }
  function renderCard() {
    if (!el.card) return;
    var ph = P.phase, md = ph === 'learn' ? 'def' : ph === 'go2' ? 'call' : ph === 'call' || ph === 'film' || ph === 'typing' ? 'long' : el.four.__m || 'long', i;
    if (el.four.__m !== md) {
      el.four.__m = md; el.four.innerHTML = '';
      CARD[md].list.forEach(function (s) { var li = document.createElement('li'); li.textContent = s; el.four.appendChild(li); });
      el.ch.innerHTML = rich(CARD[md].h); el.timer.className = md === 'def' ? 'off' : ''; el.hint.style.display = md === 'call' ? 'none' : '';
    }
    var step = md === 'def' ? P.defn : P.lines % 4, rung = Math.min(8, Math.floor(P.lines / 4) + 1), items = el.four.children;
    for (i = 0; i < items.length; i++) items[i].className = md === 'call' ? (P.done2 ? 'done' : 'now') : i < step ? 'done' : i === step ? 'now' : '';
    el.ck.textContent = md === 'def' ? 'A NEW FUNCTION' : 'RUNG ' + rung + ' OF 8';
    el.pr.textContent = md === 'def' && P.defn > 0 ? '...' : '>>>';
    el.cnt.textContent = md === 'def' ? 'You have typed ' + P.defn + ' of the 5 lines.'
      : md === 'long' ? 'You have typed ' + P.lines + ' of the ' + TOTAL + ' lines.'
      : P.typed2 === 0 ? ''
      : P.typed2 === P.lines ? 'You have typed ' + P.typed2 + (P.typed2 === 1 ? ' line' : ' lines') + ' so far.'
      : 'Your ' + P.typed2 + (P.typed2 === 1 ? ' line' : ' lines') + ' did the work of ' + P.lines + ' lines.';
  }
  /* the lines inside a function start four spaces in, so those spaces are typed for her */
  function prefill() { return mode() === 'def' && P.defn > 0 ? '    ' : ''; }
  function focusInput() { if (el.inp && !OPT.freeze) { el.inp.value = prefill(); el.inp.focus({ preventScroll: true }); } }
  function jolt(msg) { Snd.move('wrong'); fb(msg, 'bad'); el.card.classList.remove('jolt'); void el.card.offsetWidth; el.card.classList.add('jolt'); }

  /* reading a line the way Python would, and saying what is wrong in plain words */
  function norm(t) { return String(t).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim(); }
  function printWord(t) { var mm = /^print\s*\(\s*(["'])(\w+)\1\s*\)$/.exec(t); return mm ? mm[2] : null; }
  function printWhy(t, want) {
    var tail = ' Type print("' + want + '")';
    if (printWord(t) != null) return 'This line needs the word ' + want + '.' + tail;
    if (/^print\b/i.test(t) && !/^print\b/.test(t)) return 'Python needs print in small letters.' + tail;
    if (/^print\s*\(\s*\w+\s*\)$/.test(t)) return 'The word needs speech marks round it.' + tail;
    if (/^print\s*\(\s*(["']\w+|\w+["'])\s*\)$/.test(t)) return 'The word needs speech marks on both sides.' + tail;
    if (/^print\s*\(\s*(["'])\w+\1$/.test(t)) return 'The line needs a closing bracket at the end.' + tail;
    if (/^print\s*["'\w]/.test(t) && t.indexOf('(') < 0) return 'print needs brackets round the word.' + tail;
    return 'That line did not work. The next line to type is print("' + want + '")';
  }
  function defWhy(t) {
    var tail = ' Type ' + DEFLINE, mm;
    if (/^def\b/i.test(t) && !/^def\b/.test(t)) return 'Python needs def in small letters.' + tail;
    mm = /^def\s+([A-Za-z_]\w*)/.exec(t);
    if (mm && mm[1] !== 'rung') return (mm[1].toLowerCase() === 'rung' ? 'Python needs the name in small letters.' : 'Name the function rung this time.') + tail;
    if (/^def\s+rung\s*:?$/.test(t)) return 'The def line needs brackets after the name.' + tail;
    if (/^def\s+rung\s*\(\s*\)$/.test(t)) return 'The def line needs a colon at the end.' + tail;
    if (/^defrung/.test(t)) return 'The def line needs a space after def.' + tail;
    return 'That line did not work. The next line to type is ' + DEFLINE;
  }
  function callWhy(t, want) {
    if (t === 'rung') return 'rung on its own does nothing. Add the brackets to make it run: rung()';
    if (/^rung\s*\(\s*\)$/i.test(t)) return 'Python needs the name exactly as you wrote it: rung()';
    if (/^def\b/i.test(t)) return 'The function is already made. Type its name to use it: rung()';
    if (/^print\b/i.test(t)) return printWhy(t, want);
    if (/^rung\b/.test(t)) return 'rung needs both brackets after it to run: rung()';
    return 'That line did not work. The next line to type is rung()';
  }

  /* the lift's own screen shows each word it is given */
  function signAdd(w) { if (P.sign.length >= 4 || P.signClearAt > 0) { P.sign = []; P.signClearAt = -1; } P.sign.push({ text: w, at: P.rt }); }
  function seedSign(n, flash) { P.sign = []; for (var i = 0; i < n; i++) P.sign.push({ text: WORDS[i], at: P.rt - (flash ? 0.3 : 2) }); P.signFlashAt = flash ? P.rt - 0.12 : -9; P.signClearAt = -1; }
  /* one ordinary line reaches the lift */
  function oneLine(step) {
    var rung = Math.floor(P.lines / 4) + 1;
    P.lines++; P.moveAt = P.rt; Snd.move(WORDS[step]); signAdd(WORDS[step]);
    if (step === 1) { P.pushFrom = P.rungs; P.pushTo = rung; P.pushAt = P.rt; }
    if (step === 3) { P.checkAt = P.rt; P.signFlashAt = P.rt; P.signClearAt = P.rt + 0.9; }
    return rung;
  }
  /* the call: all four lines inside rung run, one after the other */
  function runRung() {
    var rung = Math.floor(P.lines / 4) + 1;
    P.typed2++; P.hist2.push(CALL); P.lines = rung * 4; P.callAt = P.rt; if (P.firstCallAt < 0) P.firstCallAt = P.rt;
    P.sign = []; P.signClearAt = -1;
    WORDS.forEach(function (w, i) {
      later(i * 0.12, function () { signAdd(w); Snd.move(w); P.moveAt = P.rt; if (i === 3) { P.signFlashAt = P.rt; P.signClearAt = P.rt + 0.9; } });
    });
    P.pushFrom = P.rungs; P.pushTo = rung; P.pushAt = P.rt + 0.12; P.checkAt = P.rt + 0.36;
    fb('rung() ran all 4 of its lines. Rung ' + rung + ' of 8 is done.', 'good');
  }
  function finish2() { P.done2 = true; P.clockOn = false; P.spare = Math.max(0, OPT.clock - P.tc); el.inp.blur(); later(0.8, function () { go('safe'); Snd.move('safe'); later(2.0, function () { Snd.happy(); }); }); }
  function submitDef(t) {
    var n = P.defn;
    if (n === 0 ? !/^def\s+rung\s*\(\s*\)\s*:$/.test(t) : printWord(t) !== WORDS[n - 1]) { jolt(n === 0 ? defWhy(t) : printWhy(t, WORDS[n - 1])); return; }
    P.defn++; Snd.move('mark');
    fb(n === 0 ? 'def is short for define. You are defining a function called rung.' : WORDS[n - 1] + ' is inside rung now.' + (n === 4 ? ' rung is ready.' : ''), 'good');
    renderCard();
    if (P.defn >= 5) { P.defAt = P.rt; el.inp.blur(); later(5.6, function () { go('go2'); }); }
  }
  function submit(text) {
    var md = mode(), t = norm(text);
    if (!md || t === '') return;
    if (md === 'def') { submitDef(t); return; }
    P.clockOn = true;
    var step = P.lines % 4, want = WORDS[step], rung;
    if (md === 'call' && /^rung\s*\(\s*\)$/.test(t)) { runRung(); }
    else if (printWord(t) !== want) { jolt(md === 'call' ? callWhy(t, want) : printWhy(t, want)); return; }
    else {
      rung = oneLine(step);
      if (md === 'call') { P.typed2++; P.hist2.push(LINES[step]); fb(step === 3 ? 'Rung ' + rung + ' of 8 is done. rung() would do those 4 lines for you.' : '', 'good'); }
      else fb(step === 3 && P.lines < TOTAL ? 'Rung ' + rung + ' is done. Now the same 4 lines again for rung ' + (rung + 1) + '.' : '', 'good');
    }
    renderCard();
    if (P.lines >= TOTAL) { if (md === 'call') finish2(); else { go('win', { wt: 0 }); Snd.move('safe'); } }
  }

  /* ---------- the three screens after the rescue ---------- */
  function lineEls(box, list, bright) {
    box.innerHTML = '';
    list.forEach(function (s, i) { var e = document.createElement('i'); e.textContent = s; if (i < bright) e.className = 'hers'; box.appendChild(e); });
  }
  function all32() { var a = [], i; for (i = 0; i < TOTAL; i++) a.push(LINES[i % 4]); return a; }
  function setHers() { if (!el.g32) return; var items = el.g32.querySelectorAll('i'); for (var i = 0; i < items.length; i++) items[i].className = i < P.typed1 ? 'hers' : ''; }
  function spareLine() { var n = Math.floor(P.spare); return n < 1 ? 'just in time' : 'with ' + n + (n === 1 ? ' second' : ' seconds') + ' to spare'; }
  function buildWhy() {
    var n = P.typed1 || 0, k = 5 + P.typed2, s = Math.floor(P.spare);
    lineEls(el.w1long, all32(), n);
    el.w1a.innerHTML = '8 rungs needed <b>32</b> lines. ' + (P.demo1 ? 'A slower typist wrote <b>' + n + '</b> lines.' : n === 0 ? 'You had no time for any.' : 'You had time for <b>' + n + '</b> ' + (n === 1 ? 'line.' : 'lines.'));
    lineEls(el.w1def, DEF, 99); lineEls(el.w1calls, P.hist2, 99);
    el.w1b.innerHTML = '8 rungs needed <b>' + k + '</b> lines. ' + (s < 1 ? 'You finished just in time.' : 'You had <b>' + s + '</b> ' + (s === 1 ? 'second' : 'seconds') + ' to spare.');
    /* the question shows what she needs to answer it: what her own calls did on this tree */
    var calls = P.hist2.filter(function (x) { return x === CALL; }).length;
    el.w3seen.innerHTML = rich('This tree needed 8 rungs. ' + (calls === 8 ? 'You typed rung() 8 times.' : 'Each rung() you typed climbed 1 rung.'));
    lineEls(el.w2in, LINES, 0);
    el.opts.innerHTML = '';
    P.order.forEach(function (v) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = Q3[v][0]; b.setAttribute('data-v', v);
      b.addEventListener('click', function () { pick(v); }); el.opts.appendChild(b);
    });
  }
  function renderWhy3() {
    if (!el.opts) return;
    [].forEach.call(el.opts.children, function (b) {
      var v = b.getAttribute('data-v');
      b.className = 'opt' + (v === '20' && P.right3 ? ' yes' : P.tried[v] && v !== '20' ? ' no' : '');
      b.disabled = P.right3 || !!P.tried[v];
    });
    el.w3fb.innerHTML = P.pick ? rich(Q3[P.pick][1]) : ''; el.w3fb.className = 'wfb ' + (P.pick === '20' ? 'good' : 'bad');
  }
  /* her first answer is the one that is kept. A wrong answer shows its reason and she picks again. */
  function pick(v) {
    if (P.phase !== 'why' || P.why !== 3 || P.right3 || !Q3[v]) return;
    if (!P.first3) P.first3 = v;
    P.pick = v; P.tried[v] = true;
    if (v === '20') { P.right3 = true; Snd.move('check'); } else Snd.move('wrong');
    renderWhy3();
  }
  function next() {
    if (P.phase === 'safe') go('why', { n: 1, fresh: true });
    else if (P.phase === 'why' && P.why < 3) go('why', { n: P.why + 1 });
    else if (P.phase === 'why' && P.right3) go('end', { of: 'safe' });
  }
  function back() { if (P.phase === 'why' && P.why > 1) go('why', { n: P.why - 1 }); }

  /* ---------- time ---------- */
  /* the clock, the branch and the two voices, while she types against the storm */
  function clockTick(dt) {
    if (P.clockOn) P.tc += dt;
    var f = P.tc / OPT.clock, marks = [0.22, 0.45, 0.64, 0.80, 0.92];
    if (P.tearN < marks.length && f >= marks[P.tearN]) { P.tearN++; P.tearAt = P.rt; Snd.tear(false); }
    if (P.tc >= P.nextVoice) { P.voiceAt = P.rt; P.voiceWho = P.voiceWho === 'kit' ? 'pup' : 'kit'; P.nextVoice = P.tc + 5.5; if (P.voiceWho === 'kit') Snd.mew(false, 0.4); else Snd.whimper(0.34); }
    if (P.tc >= OPT.clock) startFall();
  }
  function advance(dt) {
    P.rt += dt; runQueue();
    var ph = P.phase;
    if (ph === 'call') { if (OPT.auto && P.rt > 0.4) answer(); return; }
    if (ph === 'film') {
      P.ft += dt; P.st = P.ft;
      while (P.evt < EV.length && EV[P.evt][0] <= P.ft) { EV[P.evt][1](); P.evt++; }
      if (P.ft >= T_TYPE) { P.phase = 'typing'; P.typeAt = P.rt; P.nextAuto = P.rt + 1.2; renderCard(); focusInput(); }
    } else if (ph === 'typing') {
      P.ft += dt; P.st += dt;
      if (!P.clockOn && P.rt - P.typeAt > 6) P.clockOn = true;
      if (OPT.autotype && P.rt >= P.nextAuto) { submit(LINES[P.lines % 4]); P.nextAuto = P.rt + OPT.typist; }
      if (P.phase === 'typing') clockTick(dt);
    } else if (ph === 'go2') {
      P.st += dt;
      if (!P.done2) {
        if (!P.clockOn && P.rt - P.typeAt > 12) P.clockOn = true;
        if (OPT.autotype && P.rt >= P.nextAuto) { submit(CALL); P.nextAuto = P.rt + OPT.typist2; }
        if (!P.done2) clockTick(dt);
      }
    } else if (ph === 'learn') {
      var was = P.lt; P.lt += dt; P.st += dt * 0.05;
      if (was < T_DEF && P.lt >= T_DEF) { renderCard(); focusInput(); P.nextAuto = P.rt + 1.2; }
      if (OPT.autotype && mode() === 'def' && P.rt >= P.nextAuto) { submit(DEF[P.defn]); P.nextAuto = P.rt + OPT.typist2; }
    } else if (ph === 'fall') {
      P.xt += dt;
      P.st += dt * (P.xt < T_BLACK ? 0.22 : P.xt > 22.8 && P.xt < 26.2 ? -3 : 1);
      while (P.xevt < XEV.length && XEV[P.xevt][0] <= P.xt) { XEV[P.xevt][1](); P.xevt++; }
      if (P.round === 2) { if (P.xt >= T_BACK + 0.8) go('go2', { again: true }); }
      else if (P.xt >= T_END) go('learn');
    } else if (ph === 'win') {
      P.wt += dt; P.st += dt;
      if (P.wt > 5.5) go('end', { of: 'win' });
    } else if (ph === 'safe') {
      P.wt += dt; P.st += dt;
      if (OPT.auto && P.wt > 7.5) next();
    } else if (ph === 'why') {
      P.wt += dt; P.st += dt;
      if (OPT.auto && P.rt - P.whyAt > 2.5) { if (P.why === 3 && !P.right3) { pick(P.tried['80'] ? '20' : '80'); P.whyAt = P.rt; } else next(); }
    } else if (ph === 'end') { P.st += dt; }
    ph = P.phase;
    /* the ladder's own movement */
    if (ph === 'typing' || ph === 'go2' || ph === 'safe') {
      var tgt = rungTarget(), u = (P.rt - P.pushAt) / 0.45;
      P.rungs = u < 1 ? lerp(P.pushFrom, P.pushTo, smooth(u)) : tgt;
      P.latch += ((latchTarget() || (P.rt - P.callAt < 0.3 ? 1 : 0)) - P.latch) * Math.min(1, dt * 14);
    }
    if (P.signClearAt > 0 && P.rt >= P.signClearAt) { P.sign = []; P.signClearAt = -1; }
    /* thunder follows the lightning; the branch groans on each gust */
    var timed = ph === 'typing' || (ph === 'go2' && !P.done2);
    var storm = ph === 'film' || ph === 'typing' || ph === 'go2' || ph === 'win' || (ph === 'end' && P.endOf === 'win');
    if (storm) {
      var sk = Sc.strike(P.st);
      if (sk.idx !== P.lastStrike) { P.lastStrike = sk.idx; if (sk.age < 0.5) { var big = sk.idx === 0 || sk.idx === 2 || sk.idx === 3; Snd.thunder(big, big ? 0 : 0.35); } }
    }
    var g = Sc.gust(P.st);
    if (g > 0.5 && P.lastGust <= 0.5 && (storm && P.st > 13 && ph !== 'win')) Snd.creak(timed ? P.tc / OPT.clock : 0.2);
    P.lastGust = g;
    if (P.rt - P.lastWind > 0.2) { P.lastWind = P.rt; Snd.setWind(clamp(Sc.wind(P.st) * 0.55 + g * 0.5, 0, 1)); }
    /* the heartbeat */
    var f2 = P.tc / OPT.clock;
    P.bpm = ph === 'film' ? (P.ft >= 47 ? 66 : 0) : timed ? 66 + 70 * f2 : ph === 'fall' && P.xt < T_BLACK ? 46 : 0;
    P.hlevel = ph === 'fall' ? 1 : timed ? 0.45 + 0.5 * f2 : 0.4;
    if (P.bpm > 0) {
      if (P.nextBeat < P.rt - 2) P.nextBeat = P.rt;
      if (P.rt >= P.nextBeat) { P.beatAt = P.rt; P.nextBeat += 60 / P.bpm; Snd.beat(P.hlevel); }
    }
  }
  function heartPulse() {
    if (P.bpm <= 0) return 0;
    var a = P.rt - P.beatAt;
    return clamp(P.hlevel * (Math.max(0, 1 - a / 0.34) * 0.9 + (a > 0.17 ? Math.max(0, 1 - (a - 0.17) / 0.30) * 0.5 : 0)), 0, 1);
  }

  /* ---------- the picture, from the clocks ---------- */
  var labels;
  function lab(wx, wy, text, a, size, rot, col) { if (a > 0.01) labels.push({ wx: wx, wy: wy, text: text, a: a, size: size, rot: rot, col: col }); }
  function white(v) { return clamp(v, 0, 1) * (OPT.noflash ? 0.25 : 1); }
  function voices(t, mews, whims) {
    var i, a;
    for (i = 0; i < mews.length; i++) { a = hump(t, mews[i], 1.2); if (a > 0) { lab(G.KX + 128, -1452, 'mew!', a, 40, -0.12); S.kit.mouth = Math.max(S.kit.mouth, hump(t, mews[i], 0.55)); } }
    for (i = 0; i < whims.length; i++) { a = hump(t, whims[i], 1.3); if (a > 0) { lab(G.PX + 138, -1456, 'whimper', a, 36, 0.10); S.pup.mouth = Math.max(S.pup.mouth, hump(t, whims[i], 0.62)); } }
  }
  /* the long cry, drawn: each letter is left in the air where it was cried, smaller and fainter all the way down */
  var CRY_KIT = 'meeeeeeeew', CRY_PUP = 'awoooooooo';
  function cryLetters(xt) {
    var y = -1e9, fade = 1 - smooth((xt - 3.5) / 1.0), i, t, u, yk, a;
    for (i = 0; i < 10; i++) {
      t = 0.5 + i * 0.33; if (xt < t) break;
      u = clamp((Math.pow(t / T_BLACK, 1.5) - 0.20) / 0.80, 0, 1);
      yk = Math.max(-1452 + 1500 * u * u, y + 30); y = yk;
      a = clamp((xt - t) / 0.15, 0, 1) * fade * (1 - 0.045 * i);
      lab(G.KX - 70 * u - 104 + 7 * Math.sin(i * 2.4), yk, CRY_KIT.charAt(i), a, 46 - 2 * i, 0.16 * Math.sin(i * 1.7));
      lab(G.PX + 60 * u + 108 + 7 * Math.sin(i * 1.9), yk + 12, CRY_PUP.charAt(i), a, 46 - 2 * i, 0.16 * Math.sin(i * 2.3 + 1), '#ffe2b8');
    }
  }
  function signState() {
    var ls = [], i, e, age;
    for (i = 0; i < P.sign.length; i++) { e = P.sign[i]; age = P.rt - e.at; ls.push({ text: e.text, a: clamp(age / 0.1, 0, 1), hot: clamp(1 - age / 0.5, 0, 1) }); }
    return { on: 1, lines: ls, flash: clamp(1 - (P.rt - P.signFlashAt) / 0.6, 0, 1) };
  }
  var OWL_OUT = { open: 1, turn: 0, body: 1, look: [0.4, 0] };
  /* she types against the storm: round 1 the long way, round 2 with her function */
  function timedScene(two) {
    var f = clamp(P.tc / OPT.clock, 0, 1), st = P.st, base = two ? LAST : SHOT.TYPING, gust = Sc.gust(st), a;
    S.cam = { x: base.x, y: base.y + Math.sin(st * 0.8) * 3, z: base.z };
    S.ghost = 8; S.rungs = P.rungs; S.crack = lerp(CRACK0, 1, f); S.sign = signState();
    S.latch = { open: P.latch, check: P.rt >= P.checkAt ? clamp(1 - (P.rt - P.checkAt) / 0.8, 0, 1) : 0 };
    S.dip = 0.006 * hump(P.rt, P.tearAt, 0.5);
    if (two) { S.owl = OWL_OUT; S.hold = 1 - smooth((P.rt - P.g2At) / 1.2); }
    /* they watch the ladder when it moves, and her the rest of the time */
    a = hump(P.rt, P.moveAt, 0.9);
    S.kit.look = [0.25 * a, 0.08 + 0.8 * a]; S.pup.look = [-0.25 * a, 0.08 + 0.8 * a];
    a = hump(P.rt, P.voiceAt, 1.2);
    if (a > 0) {
      if (P.voiceWho === 'kit') { lab(G.KX + 128, -1452, 'mew!', a, 36, -0.12); S.kit.mouth = hump(P.rt, P.voiceAt, 0.55); }
      else { lab(G.PX + 138, -1456, 'whimper', a, 32, 0.10); S.pup.mouth = hump(P.rt, P.voiceAt, 0.62); }
    }
    lab(330, -1568, 'crack!', hump(P.rt, P.tearAt, 1.1), 40, -0.08, '#ffd27a');
    lab(300, -1566, 'creak', clamp((gust - 0.45) * 3, 0, 1) * 0.8 * (1 - hump(P.rt, P.tearAt, 1.1)), 28, 0.05);
    S.heart = heartPulse();
  }
  function compose() {
    var ph = P.phase, ft = P.ft, st = P.st, xt = P.xt, u;
    labels = [];
    S.mode = 'world'; S.st = st; S.cam = SHOT.TYPING; S.labels = labels;
    S.flash = 0; S.boltIdx = -1; S.rewindBolt = 0; S.shake = 0; S.white = 0; S.dark = 0; S.heart = 0; S.hold = 0;
    S.crack = CRACK0; S.fp = 0; S.dip = 0; S.rungs = 0; S.ghost = 0; S.ladderSway = 0.3; S.lampOn = 1; S.charDim = 0; S.chars = 1; S.splinter = null; S.fieldU = 0;
    S.latch = { open: 0, check: 0 }; S.owl = { open: 0, turn: 0, body: 0 }; S.sign = { on: 1, lines: [], flash: 0 };
    S.kit = { look: [0, 0.08], mouth: 0 }; S.pup = { look: [0, 0.08], mouth: 0, dx: Math.sin(st * 43) * 1.3 };
    if (ph === 'call') { S.mode = 'black'; return; }
    var storm = ph === 'film' || ph === 'typing' || ph === 'go2' || ph === 'win' || (ph === 'end' && P.endOf === 'win');
    if (storm) {
      var sk = Sc.strike(st); S.boltIdx = sk.idx;
      S.flash = OPT.noflash ? Sc.softFlashAt(sk.age) : Sc.flashAt(sk.age);
      S.shake = S.flash * 6;
    }
    var gust = Sc.gust(st);
    if (ph === 'film') {
      if (ft < 12.8) {
        S.mode = 'field'; S.fieldU = ft < 3 ? 0.02 * ft / 3 : 0.02 + 0.98 * Math.pow((ft - 3) / 9.8, 1.2);
        S.white = white(1 - ft / 0.6); return;
      }
      S.white = white(0.9 * (1 - (ft - 12.8) / 0.5));
      S.charDim = ft < 21 ? 1 : 0;
      S.crack = 0.12 + 0.08 * smooth((ft - 37.6) / 0.3) + 0.06 * smooth((ft - 39.4) / 0.3);
      S.cam = track(CAMKEYS, ft);
      if (ft >= 39.8) {
        /* a splinter drops from the split and the view follows it down. It takes four seconds to land. */
        u = clamp((ft - 39.8) / 4.2, 0, 1);
        var sy = -1488 + 1484 * Math.pow(u, 1.25), sx = 272 + 130 * u + 22 * Math.sin(u * 14);
        S.splinter = { x: sx, y: sy, rot: u * 26, s: 2.6, puff: ft >= 44.0 ? clamp((ft - 44.0) / 0.8, 0, 1) : 0 };
        if (ft > 45.2) S.splinter = null;
        var follow = { x: lerp(270, 380, smooth(u * 1.5)), y: clamp(sy + 40, -1484, -210), z: lerp(2.3, 1.0, smooth(u * 1.6)) };
        S.cam = ft < 45.0 ? follow : mix(SHOT.FOOT, SHOT.TYPING, smooth((ft - 45.0) / 2.4));
      }
      if (ft >= 47.6) S.ghost = clamp((ft - 47.6) / 0.25, 0, 8);
      /* Billy's claws slip, once */
      var sl = hump(ft, 24.0, 0.6); S.kit.slip = 9 * sl; S.kit.grip = 1 - 0.28 * sl;
      S.kit.look = S.pup.look = ft < 35.5 ? [0, 0] : [0, 0.08];
      voices(ft, MEWS, WHIMS);
      for (var i = 0; i < TEARS.length; i++) lab(330, -1568, 'crack!', hump(ft, TEARS[i], 1.1), 44, -0.08, '#ffd27a');
      if (ft > 13 && ft < 37) lab(300, -1566, 'creak', clamp((gust - 0.45) * 3, 0, 1) * 0.9, 30, 0.05);
      S.heart = heartPulse();
      return;
    }
    if (ph === 'typing') { timedScene(false); return; }
    if (ph === 'go2') { timedScene(true); return; }
    if (ph === 'learn') {
      /* Blink holds the storm still while she learns the other way */
      S.cam = LAST; S.ghost = 8; S.hold = smooth(P.lt / 1.5); S.owl = OWL_OUT;
      S.kit.look = S.pup.look = [-0.6, 0.02]; S.pup.dx *= 0.35;
      return;
    }
    if (ph === 'win' || (ph === 'end' && P.endOf === 'win')) {
      var wt = ph === 'win' ? P.wt : 9;
      S.ghost = 0; S.rungs = 8; S.crack = P.crackWin; S.latch = { open: 0, check: clamp(1 - wt / 1.2, 0, 1) };
      var dr = 62 * Math.pow(clamp((wt - 0.5) / 0.38, 0, 1), 2), gr = 1 - smooth((wt - 0.45) / 0.2), calm = smooth((wt - 0.9) / 1.2);
      var jw = smooth((wt - 1.7) / 1.0), dw = smooth((wt - 0.8) / 0.7);
      S.kit = { look: [0, 0.05], mouth: 0, slip: dr, grip: gr, fear: 1 - 0.92 * calm, tears: 1 - calm, joy: jw, down: dw };
      S.pup = { look: [0, 0.05], mouth: 0, slip: dr, grip: gr, fear: 1 - 0.92 * calm, tears: 1 - calm, joy: jw, down: dw, dx: Math.sin(st * 43) * 1.3 * (1 - calm) };
      return;
    }
    if (ph === 'safe' || ph === 'why' || (ph === 'end' && P.endOf === 'safe')) {
      /* the ladder is there: they let go, land in the basket, and the fear goes out of their faces */
      var w2 = ph === 'end' ? 9 : P.wt;
      var d2 = 62 * Math.pow(clamp((w2 - 0.5) / 0.38, 0, 1), 2), g2 = 1 - smooth((w2 - 0.45) / 0.2), c2 = smooth((w2 - 0.9) / 1.2), joy = smooth((w2 - 1.7) / 1.0);
      S.ghost = 0; S.rungs = P.rungs; S.crack = P.crackWin; S.latch = { open: 0, check: clamp(1 - w2 / 1.2, 0, 1) }; S.owl = OWL_OUT;
      S.cam = mix(LAST, SAFE, smooth((w2 - 0.4) / 1.9));
      /* paws come down off the branch as they land; one wave, a hop that settles, then they stand easy. Arms left in the air read as still hanging. */
      var dn = smooth((w2 - 0.8) / 0.7), wv = fadeWin(w2, 2.5, 5.3, 0.45), hp2 = joy * (1 - smooth((w2 - 4.6) / 2.2));
      S.kit = { look: [0, 0.05], mouth: 0, slip: d2, grip: g2, fear: 1 - 0.92 * c2, tears: 1 - c2, joy: joy, down: dn, wave: wv, hop: hp2 };
      S.pup = { look: [0, 0.05], mouth: 0, slip: d2, grip: g2, fear: 1 - 0.92 * c2, tears: 1 - c2, joy: joy, down: dn, wave: wv, hop: hp2, dx: Math.sin(st * 43) * 1.3 * (1 - c2) };
      lab(G.KX + 128, -1390, 'mew!', hump(w2, 2.0, 1.4), 40, -0.12);
      lab(G.PX + 138, -1394, 'yip! yip!', hump(w2, 2.25, 1.5), 38, 0.10);
      return;
    }
    /* the fall, the empty branch, Blink, the rewind */
    S.rungs = P.fallRungs; S.crack = 1;
    if (xt < T_BLACK) {
      S.fp = Math.max(0.001, Math.pow(xt / T_BLACK, 1.5)); S.ghost = 8;
      S.cam = mix(P.round === 2 ? LAST : SHOT.TYPING, { x: 734, y: -1140, z: 0.94 }, smooth(xt / T_BLACK));
      if (P.round === 2) S.owl = OWL_OUT;
      S.shake = Math.max(0, 1 - xt / 0.45) * 9; S.heart = heartPulse();
      lab(330, -1568, 'CRACK!', hump(xt, 0, 1.3), 56, -0.08, '#ffd27a');
      cryLetters(xt);
      return;
    }
    if (xt < T_STUMP) { S.mode = 'black'; return; }
    if (xt < T_TURN) {
      S.fp = 1; S.chars = 0; S.ladderSway = 1;
      S.dark = 1 - smooth((xt - T_STUMP) / 1.6);
      S.cam = mix(STUMP, SHOT.OWL, smooth((xt - 17.0) / 2.2));
      S.owl = { open: smooth((xt - T_EYES) / 0.6), turn: 0, body: smooth((xt - 18.0) / 1.2), look: [0, 0] };
      return;
    }
    if (xt < T_BACK) {
      /* Blink turns its head all the way round, and the storm turns with it */
      S.owl = { open: 1, body: 1, turn: Math.PI * 2 * smooth((xt - T_TURN) / 3.0), look: [0, 0] };
      S.cam = mix(SHOT.OWL, LAST, smooth((xt - 23.3) / 1.7));
      S.fp = 1 - smooth((xt - 23.6) / 2.4); S.chars = S.fp < 0.999 ? 1 : 0;
      S.rungs = P.fallRungs * (1 - smooth((xt - 23.6) / 2.2));
      S.crack = lerp(1, CRACK0, smooth((xt - 25.6) / 0.8));
      S.ghost = 8 * smooth((xt - 25.9) / 0.6);
      S.rewindBolt = xt > 23.4 && xt < 24.6 ? 1 - (xt - 23.4) / 1.2 : 0;
      S.ladderSway = 0.6; S.kit.look = S.pup.look = [0, 0];
      return;
    }
    S.rungs = 0; S.crack = CRACK0; S.ghost = 8; S.cam = LAST;
    S.owl = OWL_OUT;
    S.kit.look = S.pup.look = [0, 0];
  }

  /* ---------- the words over the picture ---------- */
  function op(e, a) { a = Math.round(clamp(a, 0, 1) * 50) / 50; if (e.__a !== a) { e.__a = a; e.style.opacity = a; e.style.visibility = a > 0 ? 'visible' : 'hidden'; } }
  /* any code inside a sentence is shown in the code lettering */
  function rich(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/def rung\(\):|print\("\w+"\)|rung\(\)|\bdef\b/g, '<code>$&</code>'); }
  function txt(e, t) { if (e.__t !== t) { e.__t = t; e.innerHTML = rich(t); } }
  function cls(e, name, on) { if (!!e['__c' + name] !== !!on) { e['__c' + name] = !!on; e.classList.toggle(name, !!on); } }
  function dom() {
    var ph = P.phase, ft = P.ft, xt = P.xt, lt = P.lt, i, k = Sc.k, md = mode();
    cls(el.call, 'on', ph === 'call');
    op(el.bang, ph === 'film' && ft < 3.5 ? (ft < 0.12 ? ft / 0.12 : ft < 3 ? 1 : 1 - (ft - 3) / 0.5) : 0);
    op(el.snd, ph === 'call' ? 0 : 0.7);
    /* captions */
    var ca = 0, ct = el.cap.__t || '', left = el.cap.__cleft, two = false;
    if (ph === 'film' || ph === 'typing') for (i = 0; i < CAPS.length; i++) { var c = CAPS[i]; if (ft >= c[0] && ft <= c[1]) { ca = fadeWin(ft, c[0], c[1], 0.35); ct = c[2]; left = c[3] === 'left'; } }
    if (ph === 'win' || (ph === 'end' && P.endOf === 'win')) { ca = ph === 'win' ? clamp((P.wt - 1.2) / 0.4, 0, 1) : 1; ct = WIN; left = true; }
    if (ph === 'safe') { ca = clamp((P.wt - 2.8) / 0.4, 0, 1); ct = 'Billy and Bobby are safe. You reached them ' + spareLine() + '.'; left = false; two = true; }
    txt(el.cap, ct); cls(el.cap, 'left', left); cls(el.cap, 'two', two); op(el.cap, ca);
    /* the two white lines, with her own numbers */
    var inLines = ph === 'fall' && xt >= T_STUMP && xt < 17.4, r = Math.floor(P.lines / 4);
    if (P.round === 2) {
      txt(el.l1, 'The ladder had to climb 8 rungs to reach Billy and Bobby.');
      txt(el.l2, r === 0 ? 'It did not have time to climb any of them.' : 'It only had time to climb ' + r + (r === 1 ? ' rung.' : ' rungs.'));
    } else {
      txt(el.l1, 'You needed ' + TOTAL + ' lines of instructions to reach Billy and Bobby.');
      txt(el.l2, (P.demo ? 'A slower typist' : 'You') + (P.lines === 0 ? ' did not have time to write any of those lines.' : ' only had time to write ' + P.lines + ' of those ' + TOTAL + ' lines.'));
    }
    op(el.l1, inLines ? fadeWin(xt, 9.0, 17.2, 0.6) : 0);
    op(el.l2, inLines ? fadeWin(xt, 11.8, 17.2, 0.6) : 0);
    /* Blink speaks */
    var sa = 0, sayT = el.say.__t || SAY1, slim = !!el.speech.__cslim;
    if (ph === 'fall') {
      if (xt >= 18.8 && xt < 22.45) { sa = fadeWin(xt, 18.8, 22.45, 0.3); sayT = P.round === 2 ? SAY3 : SAY1; slim = false; }
      if (P.round === 1 && xt >= 26.9) { sa = fadeWin(xt, 26.9, T_END, 0.3); sayT = SAY2; slim = false; }
    } else if (ph === 'learn') {
      for (i = 0; i < TEACH.length; i++) if (lt >= TEACH[i][0] && lt <= TEACH[i][1]) { sa = fadeWin(lt, TEACH[i][0], TEACH[i][1], 0.3); sayT = TEACH[i][2]; slim = false; }
      if (P.defn >= 5) { sa = fadeWin(P.rt, P.defAt + 0.3, P.defAt + 5.6, 0.3); sayT = SAY_WAIT; slim = true; }
    } else if (ph === 'go2' && !P.again) {
      var t0 = P.firstCallAt < 0 ? 1e9 : Math.max(P.firstCallAt + 0.7, P.g2At + 5.5);
      if (P.rt < t0) { sa = fadeWin(P.rt, P.g2At + 0.4, t0, 0.3); sayT = SAY_USE; slim = true; }
      else if (P.rt < t0 + 4.9) { sa = fadeWin(P.rt, t0 + 0.2, t0 + 4.9, 0.3); sayT = SAY_ONE; slim = true; }
    }
    txt(el.say, sayT); cls(el.speech, 'slim', slim); op(el.speech, sa);
    if (sa > 0) {
      var o = Sc.toScreen(S.cam, G.HOL.x, G.HOL.y), z = S.cam.z;
      el.speech.style.left = Math.round(o[0] + (30 + 46 * z) * k) + 'px';
      el.speech.style.top = Math.round(o[1] - (36 + 22 * z) * k) + 'px';
    }
    /* the lesson's two pictures: the 32 lines, then the function she is making */
    cls(el.p32, 'on', ph === 'learn' && lt >= 5.6 && lt < 14.8);
    for (i = 0; i < 8; i++) {
      cls(el.g4[i], 'in', ph === 'learn' && lt >= 5.8 + 0.3 * i);
      cls(el.g4[i], 'same', ph === 'learn' && lt >= 10.2 + 0.35 * i);
      cls(el.g4[i], 'dim', ph === 'learn' && lt >= 13.4 && i > 0);
    }
    var made = ph === 'go2' || (ph === 'learn' && lt < T_DEF), age = P.rt - P.callAt;
    cls(el.fn, 'on', ph === 'go2' || (ph === 'learn' && lt >= 15.0));
    txt(el.fnk, ph === 'learn' && lt < T_DEF ? '' : 'YOUR FUNCTION');
    for (i = 0; i < 5; i++) {
      cls(el.fnl[i], 'lit', made || i < P.defn);
      cls(el.fnl[i], 'hot', ph === 'go2' && (i === 0 ? age >= 0 && age < 0.3 : age >= 0.12 * (i - 1) && age < 0.12 * (i - 1) + 0.4));
    }
    cls(el.fnName, 'name', ph === 'learn' && lt >= 20.2 && lt < T_DEF);
    /* the typing card */
    cls(el.card, 'on', ph === 'typing' || ph === 'go2' || (ph === 'film' && ft >= T_CARD) || (ph === 'learn' && lt >= T_DEF));
    cls(el.prompt, 'wait', !md && ph !== 'film' && ph !== 'call');
    if (ph === 'typing' || ph === 'go2') {
      var f = clamp(P.tc / OPT.clock, 0, 1);
      el.tb.style.width = ((1 - f) * 100).toFixed(1) + '%';
      cls(el.tb, 'low', f > 0.66);
    }
    if (md && !OPT.freeze && document.activeElement !== el.inp) el.inp.focus({ preventScroll: true });
    /* what it saved, what it is, and one question */
    cls(el.why, 'on', ph === 'why');
    for (i = 1; i <= 3; i++) cls(el['w' + i], 'on', ph === 'why' && P.why === i);
    cls(el.next, 'on', (ph === 'safe' && P.wt >= 4.4) || (ph === 'why' && (P.why < 3 || P.right3)));
    cls(el.back, 'on', ph === 'why' && P.why > 1);
    /* the end card */
    cls(el.end, 'on', ph === 'end');
    if (ph === 'end') {
      txt(el.endmsg, P.endOf === 'win' ? 'A slower typist runs out of time before the ladder reaches them.' : 'This is the end of the art test.');
      cls(el.slow, 'on', P.endOf === 'win'); cls(el.retype, 'on', P.endOf !== 'win'); cls(el.lesson, 'on', P.endOf !== 'win');
    }
  }

  /* ---------- the loop ---------- */
  var last = 0, frames = 0, lastKeyAt = -1e9, cardAt = -1e9;
  function frame(ts) {
    var dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)) * OPT.speed; last = ts;
    if (mode()) cardAt = performance.now();
    if (!OPT.freeze) { var n = Math.max(1, Math.ceil(OPT.speed)); for (var i = 0; i < n; i++) advance(dt / n); }
    compose(); Sc.draw(S); dom();
    if (OPT.freeze && ++frames === 6) document.title = 'ready';
    requestAnimationFrame(frame);
  }
  function resize() { Sc.resize(); document.documentElement.style.fontSize = (16 * Sc.k).toFixed(2) + 'px'; }

  function boot() {
    ['call', 'answer', 'tSound', 'tFlash', 'bang', 'cap', 'l1', 'l2', 'speech', 'say', 'card', 'ck', 'ch', 'four', 'pr', 'prompt', 'inp', 'fb', 'timer', 'tb', 'cnt', 'end', 'endmsg', 'again', 'retype', 'slow', 'lesson', 'snd',
      'hint', 'p32', 'g32', 'fn', 'fnk', 'fnl', 'why', 'w1', 'w2', 'w3', 'w1long', 'w1a', 'w1def', 'w1calls', 'w1b', 'w2in', 'opts', 'w3seen', 'w3fb', 'next', 'back'].forEach(function (id) { el[id] = $(id); });
    /* the 32 lines as 8 groups of 4, and the function as 5 lines */
    el.g4 = [];
    for (var gi = 0; gi < 8; gi++) { var gd = document.createElement('div'); gd.className = 'g4'; lineEls(gd, LINES, 0); el.g32.appendChild(gd); el.g4.push(gd); }
    var box = el.fnl; el.fnl = [];
    DEF.forEach(function (s, i) {
      var e = document.createElement('i');
      if (i === 0) e.innerHTML = 'def <b id="fnName">rung</b>():'; else e.textContent = s;
      box.appendChild(e); el.fnl.push(e);
    });
    el.fnName = $('fnName');
    if (OPT.freeze) document.body.classList.add('frozen');
    Sc.init($('c')); resize(); window.addEventListener('resize', resize);
    function soundLabel() { var t = soundOff ? 'Sound is off' : 'Sound is on'; el.tSound.textContent = t; el.snd.textContent = t; }
    function toggleSound() { soundOff = !soundOff; Snd.setMuted(soundOff); soundLabel(); }
    el.answer.addEventListener('click', answer);
    el.tSound.addEventListener('click', toggleSound); el.snd.addEventListener('click', toggleSound);
    el.tFlash.addEventListener('click', function () { OPT.noflash = !OPT.noflash; el.tFlash.textContent = OPT.noflash ? 'Lightning flashes are soft' : 'Lightning flashes are bright'; });
    if (OPT.noflash) el.tFlash.textContent = 'Lightning flashes are soft';
    el.inp.addEventListener('keydown', function (e) {
      var md = mode();
      if (!md) { if (e.key === 'Enter' || e.key.length === 1) e.preventDefault(); return; }
      if (e.key === 'Enter') { e.preventDefault(); submit(el.inp.value); el.inp.value = prefill(); }
      else if (e.key.length === 1) { if (md !== 'def') P.clockOn = true; Snd.move('key'); }
    });
    el.inp.addEventListener('paste', function (e) { e.preventDefault(); });
    el.inp.addEventListener('drop', function (e) { e.preventDefault(); });
    el.inp.addEventListener('dragover', function (e) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'; });
    el.inp.addEventListener('beforeinput', function (e) { if (/^insertFrom|^insertReplacementText$/.test(e.inputType || '')) e.preventDefault(); });
    el.next.addEventListener('click', next); el.back.addEventListener('click', back);
    el.again.addEventListener('click', function () { go('film', { ft: 0 }); });
    el.retype.addEventListener('click', function () { go('film', { ft: 45.0 }); });
    el.lesson.addEventListener('click', function () { go('learn'); });
    el.slow.addEventListener('click', function () { P.tc = OPT.clock; go('fall', { xt: 0, lines: 9, demo: true, round: 1 }); Snd.tear(true); });
    /* keys for the person judging the art test, never while she is typing */
    document.addEventListener('keydown', function (e) {
      /* her typing must never set one off: not while a card is live, not for 8 seconds after one closes, and not in the middle of a run of keys */
      var now = performance.now(), gap = now - lastKeyAt; lastKeyAt = now;
      if (mode()) cardAt = now;
      if (mode() || P.phase === 'call' || P.phase === 'go2' || (P.phase === 'learn' && P.defn >= 5) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (now - cardAt < 8000 || gap < 1200) return;
      var jumps = { '1': 0, '2': 12.6, '3': 20.6, '4': 26.0, '5': 35.0, '6': 45.0, '7': 52.6 }, d = P.round !== 1 || P.lines === 0;
      if (jumps[e.key] != null) go('film', { ft: jumps[e.key] });
      else if (e.key === '8') { P.tc = OPT.clock; go('fall', { xt: 0, lines: d ? 9 : P.lines, demo: d || P.demo, round: 1 }); Snd.tear(true); }
      else if (e.key === '9') { P.tc = OPT.clock; go('fall', { xt: 15.6, lines: d ? 9 : P.lines, demo: d || P.demo, round: 1 }); }
      else if (e.key === '0') go('learn');
      else if (e.key === 'r' || e.key === 'R') go('call');
    });
    /* frozen states, for the screenshots */
    if (q.has('phase')) {
      var ph = q.get('phase');
      if (OPT.mute || OPT.freeze) Snd.disable(); else Snd.start();
      P.rt = 100;
      if (q.has('typed')) { P.typed1 = num('typed', 9); P.demo1 = q.has('demo'); }
      if (ph === 'film') go('film', { ft: num('ft', 0) });
      else if (ph === 'typing') { go('typing', { lines: num('lines', 0), tc: num('tc', 0) }); if (q.has('fb')) fb(q.get('fb') === 'bad' ? printWhy('print(' + WORDS[P.lines % 4] + ')', WORDS[P.lines % 4]) : 'Rung ' + Math.floor(P.lines / 4) + ' is done. Now the same 4 lines again for rung ' + (Math.floor(P.lines / 4) + 1) + '.', q.get('fb') === 'bad' ? 'bad' : 'good'); if (q.has('st')) P.st = num('st', 60); }
      else if (ph === 'fall') { P.tc = OPT.clock; go('fall', { xt: num('xt', 0), lines: num('lines', 9), demo: q.has('demo'), st: num('st', 104), round: num('round', 1) }); }
      else if (ph === 'win') { P.tc = num('tc', 30); go('win', { wt: num('wt', 3) }); }
      else if (ph === 'learn') { go('learn', { lt: num('lt', 0), defn: num('defn', 0), wait: q.has('wait') }); if (q.has('fb')) fb(q.get('fb') === 'bad' ? defWhy('def rung()') : 'def makes a new function. You have named it rung.', q.get('fb') === 'bad' ? 'bad' : 'good'); }
      else if (ph === 'go2') { go('go2', { calls: num('calls', 0), tc: num('tc', 0), again: q.has('again') }); if (!q.has('calls')) P.g2At = P.rt - 2; if (q.has('one')) { P.firstCallAt = P.rt - 8; P.g2At = P.rt - 8.2; } }
      else if (ph === 'safe' || ph === 'why' || ph === 'end') {
        if (ph === 'end' && q.get('of') === 'win') { P.tc = num('tc', 30); go('win', { wt: 9 }); go('end', { of: 'win' }); }
        else {
          if (P.typed1 == null) { P.typed1 = 14; P.demo1 = false; }
          P.tc = num('tc', 38); P.spare = OPT.clock - P.tc; P.typed2 = 8; P.hist2 = []; for (var hi = 0; hi < 8; hi++) P.hist2.push(CALL);
          P.st = num('st', 90); go('safe', { wt: ph === 'safe' ? num('wt', 5) : 9 });
          if (ph === 'why') { go('why', { n: num('n', 1), fresh: true }); P.why = 3; (q.get('pick') || '').split(',').forEach(pick); P.why = num('n', 1); }
          if (ph === 'end') go('end', { of: 'safe' });
        }
      }
      if (q.has('beat')) { P.bpm = 80; P.beatAt = P.rt - num('beat', 0.05); }
    }
    soundLabel();
    window.__film = { P: P, S: S, OPT: OPT, go: go, submit: submit, pick: pick, next: next, back: back, mode: mode };
    requestAnimationFrame(function (ts) { last = ts; frame(ts); });
  }
  var fonts = document.fonts ? Promise.all([document.fonts.load('700 20px "Space Grotesk"'), document.fonts.load('700 20px "Caveat"')]) : Promise.resolve();
  fonts.then(boot, boot);
})();
