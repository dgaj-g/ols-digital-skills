/* script.js — My Amazing World: game flow. Front door → Leg briefing → play (globe, flat map or sorting board) → stamp + Expedition → next leg → certificate.
   Passport any time. Judging: judge.js. Strings: strings.js. Facts: data.js. Globe + flat map: engine.js.
   Every leg is a list of tasks built by RUN.<leg>(); one runner plays them all. */
(function () {
  'use strict';
  var S = window.MAW_STRINGS, D = window.MAW_DATA, J = window.MAW_JUDGE;
  var KEY = 'maw-v1';
  function $(id) { return document.getElementById(id); }
  var state, W = {}, globe, map, prevScreen = 's-door';
  var run = null;       // the leg being played: { leg, tasks, i, points, t0, elapsed, timer }
  var task = null;      // the task on screen
  var PAINT = '#8FC79A', LAND = '#EFE6CC', EDGE = '#8C7B52', CONTEXT = '#D9D2BD', WATER = '#2F6FB8';

  /* ---------- state ---------- */
  function fresh() { return { v: 1, name: '', legs: {}, stamps: [], current: null, list: false }; }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: play on without saving */ } }
  function legById(id) { for (var i = 0; i < D.legs.length; i++) if (D.legs[i].id === id) return D.legs[i]; return null; }
  function nextLeg(afterId) { var L = legById(afterId); return D.legs[L.n] || null; }
  function stamped(id) { return state.stamps.indexOf(id) >= 0; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function mmss(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function banked() { var p = 0; state.stamps.forEach(function (id) { p += state.legs[id].points; }); return p; }
  function total() { return banked() + (run && !run.done ? run.points : 0); }
  function maxSoFar() { var m = 0; D.legs.forEach(function (l) { if (stamped(l.id)) m += l.max; }); return m; }
  function legPoints() { return D.legs.map(function (l) { return stamped(l.id) ? state.legs[l.id].points : null; }); }
  function token() { return J.scoreToken(state.name, legPoints()); }
  function byName(list, n) { for (var i = 0; i < list.length; i++) if ((list[i].properties ? list[i].properties.name : list[i].name) === n) return list[i]; return null; }
  function others(pool, not, n) { return shuffle(pool.filter(function (x) { return not.indexOf(x) < 0; })).slice(0, n); }

  /* ---------- screens ---------- */
  function show(id) {
    var from = document.querySelector('.screen:not([hidden])');
    if (from && from.id !== id) prevScreen = from.id;
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].hidden = all[i].id !== id;
    window.scrollTo(0, 0);
  }
  function setFeedback(el, text, tone) { el.textContent = text || ''; el.className = 'feedback' + (text && tone ? ' ' + tone : ''); }
  function fb(text, tone) { setFeedback($(task && task.screen === 's-sort' ? 'sort-feedback' : 'feedback'), text, tone); }

  function renderHeader() {
    var L = legById(state.current) || D.legs[0];
    $('badge-leg').textContent = S.header.leg(L.n, D.legs.length);
    $('badge-points').textContent = S.header.points(total());
    var strip = $('leg-strip'); strip.innerHTML = '';
    D.legs.forEach(function (l) {
      var el = document.createElement('span');
      el.className = 'leg-chip' + (stamped(l.id) ? ' done' : '') + (state.current === l.id ? ' now' : '');
      el.textContent = l.n + ' ' + l.title;
      if (state.current === l.id) el.setAttribute('aria-current', 'step');
      strip.appendChild(el);
    });
  }

  function fillStatic() {
    $('act-sub').textContent = S.header.sub; $('leg-strip').setAttribute('aria-label', S.aria.legs);
    $('door-kicker').textContent = S.passport.title; $('door-title').textContent = S.title; $('door-lead').textContent = S.door.lead;
    $('name-label').textContent = S.door.nameLabel; $('name').placeholder = S.door.namePlaceholder; $('name-help').textContent = S.door.nameHelp;
    $('door-start').textContent = S.door.start; $('door-carry').textContent = S.door.carryOn; $('door-restart').textContent = S.door.restart;
    $('restart-warn').textContent = S.door.restartWarn; $('restart-yes').textContent = S.door.restartYes; $('restart-no').textContent = S.door.restartNo;
    $('btn-passport').textContent = S.header.passport; $('pp-kicker').textContent = S.title; $('pp-title').textContent = S.passport.title; $('pp-back').textContent = S.buttons.back;
    $('exp-kicker').textContent = S.expedition.title; $('exp-opens').textContent = S.expedition.opens; $('exp-then').textContent = S.expedition.then; $('exp-lock').textContent = S.buttons.answer;
    $('pp-token-label').textContent = S.passport.tokenLabel; $('pp-copy').textContent = S.buttons.copySoFar; $('pp-token-help').textContent = S.passport.tokenHelp; $('pp-token-select').textContent = S.passport.tokenSelect;
    $('tool-spin').textContent = S.buttons.spin; $('tool-ruler').textContent = S.buttons.ruler; $('clue-next').textContent = S.buttons.clue;
    $('fin-kicker').textContent = S.finish.kicker; $('fin-title').textContent = S.finish.title; $('fin-awarded').textContent = S.finish.awarded;
    $('fin-copy').textContent = S.buttons.copy; $('fin-copy-help').textContent = S.passport.tokenHelp; $('fin-copy-select').textContent = S.passport.tokenSelect;
    $('fin-print').textContent = S.buttons.print; $('fin-passport').textContent = S.buttons.passport; $('fin-again').textContent = S.buttons.again;
    $('fin-warn').textContent = S.finish.again; $('fin-yes').textContent = S.door.restartYes; $('fin-no').textContent = S.door.restartNo;
    $('globe').setAttribute('aria-label', S.aria.globe); $('map').setAttribute('aria-label', S.aria.map); $('tray').setAttribute('aria-label', S.aria.tray);
    $('sort-tray').setAttribute('aria-label', S.tasks.types.tray);
  }

  /* ---------- front door ---------- */
  function door() {
    var has = !!state.name;
    $('door-form').hidden = has; $('door-back').hidden = !has; $('restart-confirm').hidden = true;
    if (has) { $('door-back-name').textContent = S.door.welcomeBack(state.name); $('door-back-stamps').textContent = S.door.stampCount(state.stamps.length); }
    show('s-door');
    if (!has) $('name').focus();
  }
  function carryOn() {
    var id = state.current && !stamped(state.current) ? state.current : null;
    if (!id) for (var i = 0; i < D.legs.length; i++) if (!stamped(D.legs[i].id)) { id = D.legs[i].id; break; }
    if (!id) { finish(); return; }
    startLeg(id);
  }
  function restart() { stopClock(); run = null; task = null; state = fresh(); save(); renderHeader(); door(); }

  /* ---------- leg: briefing → tasks → stamp ---------- */
  function startLeg(id) { stopClock(); run = null; state.current = id; save(); renderHeader(); briefing(id); }
  function briefing(id) {
    var L = legById(id);
    $('brief-kicker').textContent = S.title; $('brief-title').textContent = S.legTitle(L); $('brief-text').textContent = S.brief[id];
    $('brief-go').textContent = id === 'types' ? S.buttons.readySort : (id === 'oceans' || id === 'final') ? S.buttons.ready : S.buttons.readyMap;
    $('brief-go').onclick = function () { beginLeg(id); };
    show('s-brief');
  }
  function beginLeg(id) {
    run = { leg: legById(id), tasks: legTasks(id), i: 0, points: 0, elapsed: 0, t0: 0, timer: null, done: false };
    startClock(); nextTask();
  }
  function startClock() { run.t0 = performance.now(); tick(); run.timer = setInterval(tick, 250); }
  function stopClock() { if (run && run.timer) { clearInterval(run.timer); run.timer = null; run.elapsed += performance.now() - run.t0; } }
  function tick() { var t = S.oceans.clock(mmss(run.elapsed + (performance.now() - run.t0))); $('clock').textContent = t; $('sort-clock').textContent = t; }
  function award(p) { run.points += p; renderHeader(); }

  function nextTask() {
    if (run.i >= run.tasks.length) { finishLeg(); return; }
    task = run.tasks[run.i];
    task.attempts = 0; task.revealed = false; task.locked = false;
    var sort = task.type === 'sort' || task.type === 'photo';
    task.screen = sort ? 's-sort' : 's-play';
    show(task.screen);
    $('fact').hidden = true; $('sort-fact').hidden = true;
    $('task-go').hidden = true; $('task-go').disabled = false; $('clue-next').hidden = true; $('clues').hidden = true; $('tools').hidden = true;
    $('choices').hidden = true; $('tray').hidden = true; $('tiles').innerHTML = ''; $('list').innerHTML = '';
    fb(null);
    if (sort) { SETUP[task.type](task); return; }
    $('play-count').textContent = S.play.part(task.part, task.n, task.of);
    $('task').textContent = task.text; $('task-sub').textContent = task.sub || '';
    var onGlobe = task.type === 'ocean' || task.type === 'mystery' || task.type === 'ruler';
    $('globe').hidden = !onGlobe; $('map').hidden = onGlobe;
    if (onGlobe) { globe.resize(); globe.highlight = null; globe.marker = null; globe.pins = []; globe.ruler = null; globe.setMode('spin'); globe.render(); }
    else useScene(task.scene);
    SETUP[task.type](task);
    listSetup();
  }
  function useScene(key) {
    var sc = SCENES[key]();
    if (!map.scene || map.scene.key !== key) map.setScene(sc); else map.resize();
    map.scene.hills = task.hills || []; map.scene.dots = task.dots || [];
    map.highlight = null; map.marker = null; map.pins = []; map.render();
  }
  /* The task is over: fact card, then the next task. */
  function resolved(kicker, text) {
    task.locked = true;
    var last = run.i === run.tasks.length - 1;
    if (task.screen === 's-sort') {
      $('sort-fact-text').textContent = text || ''; $('sort-fact-text').hidden = !text;
      $('sort-next').textContent = last ? S.buttons.finish : S.buttons.nextTask; $('sort-fact').hidden = false; $('sort-check').hidden = true; $('sort-next').focus();
      return;
    }
    $('fact-kicker').textContent = kicker || ''; $('fact-text').textContent = text || ''; $('fact-text').hidden = !text;
    $('fact-next').textContent = last ? S.buttons.finish : task.type === 'ocean' ? S.buttons.next : S.buttons.nextTask;
    $('task-go').hidden = true; $('clue-next').hidden = true; $('list').querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    $('fact').hidden = false; $('fact-next').focus({ preventScroll: true });
  }
  function afterFact() { run.i++; nextTask(); }
  function finishLeg() {
    stopClock(); run.done = true;
    var L = run.leg;
    state.legs[L.id] = { points: run.points, time: Math.round(run.elapsed), max: L.max };
    if (!stamped(L.id)) state.stamps.push(L.id);
    save(); renderHeader();
    legDone(L, run.points, run.elapsed);
  }

  /* ---------- tap outcomes shared by map taps and the list ---------- */
  var TAP_POINTS = [0, 2, 1, 0], OCEAN_POINTS = [0, 3, 2, 1];
  function tapPoints(t) { return t.revealed ? 0 : ((t.type === 'ocean' ? OCEAN_POINTS : TAP_POINTS)[t.attempts] || 0); }
  function missed(t, msg) {
    if (t.attempts >= 3 && !t.revealed) { t.revealed = true; REVEAL[t.type](t); fb(S.play.reveal(t.target), 'info'); markListAnswer(t); return; }
    fb(msg, t.revealed ? 'info' : 'bad');
  }
  function hitRight(t, points, kicker, text) {
    award(points);
    fb(t.type === 'ocean' ? S.oceans.right(t.target, points) : S.play.right(points), points ? 'good' : 'info');
    if (t.onRight) t.onRight();
    resolved(kicker || t.target, text);
  }

  /* ---------- task set-up by type ---------- */
  var SETUP = {
    ocean: function () {},
    region: function () {},
    feature: function () {},
    sea: function () {},
    pin: function () {},
    choice: function (t) {
      var box = $('choices'); box.innerHTML = ''; box.hidden = false; t.chosen = null;
      shuffle(t.options.slice()).forEach(function (opt) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'option'; b.textContent = opt; b.setAttribute('aria-pressed', 'false');
        b.onclick = function () { if (t.locked) return; t.chosen = opt; box.querySelectorAll('.option').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); $('task-go').disabled = false; };
        box.appendChild(b);
      });
      $('task-go').textContent = S.buttons.answer; $('task-go').hidden = false; $('task-go').disabled = true;
      $('task-go').onclick = function () {
        if (!t.chosen || t.locked) return;
        var r = J.judgeChoice(t.answer, t.chosen, 2);
        box.querySelectorAll('.option').forEach(function (x) { x.disabled = true; if (x.textContent === t.answer) x.classList.add('right'); else if (x.textContent === t.chosen && !r.correct) x.classList.add('wrong'); });
        award(r.points); fb(r.correct ? S.play.choiceRight(r.points) : S.play.choiceWrong(t.answer), r.correct ? 'good' : 'bad');
        resolved(t.answer, t.fact);
      };
    },
    mystery: function (t) {
      t.clues = 1; $('clues').hidden = false; drawClues(t);
      $('clue-next').hidden = false; $('clue-next').disabled = false;
      $('clue-next').onclick = function () { if (t.locked || t.clues >= 3) return; t.clues++; drawClues(t); if (t.clues >= 3) $('clue-next').disabled = true; if (t.list) listSetup(); };
    },
    ruler: function (t) {
      $('tools').hidden = false; toolMode('ruler'); $('ruler-read').textContent = S.tasks.rulerNone;
      $('task-go').textContent = S.buttons.lockRuler; $('task-go').hidden = false; $('task-go').disabled = true; t.km = null;
      $('task-go').onclick = function () {
        if (t.locked || t.km == null) return;
        var r = J.judgeRuler(D.ruler.km, t.km); award(r.points);
        globe.setMode('spin');
        fb(S.tasks.rulerResult(t.km, D.ruler.km, r.points), r.points ? 'good' : 'bad');
        resolved(S.tasks.rulerOption(D.ruler.km), null);
      };
    },
    drag: function (t) { dragSetup(t); },
    sort: function (t) { sortSetup(t); },
    photo: function (t) { photoSetup(t); }
  };
  var REVEAL = {
    ocean: function (t) { globe.highlight = t.feature; globe.setZoom(t.o.zoom || 1); globe.flyTo(t.o.view, 900); },
    region: function (t) { var f = t.features.filter(t.isTarget); map.highlight = f.length === 1 ? f[0] : { type: 'Feature', geometry: { type: 'GeometryCollection', geometries: f.map(function (x) { return x.geometry; }) } }; map.show(d3.geoCentroid(map.highlight)); map.render(); },
    feature: function (t) {
      var c = byName(t.candidates, t.target);
      if (c.feature) { map.highlight = c.feature; map.show(d3.geoCentroid(c.feature)); }
      else { (map.scene.hills.concat(map.scene.dots)).forEach(function (x) { if (x.name === t.target) x.gold = true; }); map.show(c.at); }
      map.render();
    },
    sea: function (t) { map.marker = { lonlat: t.at, text: t.target, tone: 'info' }; map.render(); }
  };
  function drawClues(t) {
    var ol = $('clues'); ol.innerHTML = '';
    for (var i = 0; i < t.clues; i++) { var li = document.createElement('li'); li.textContent = t.m.clues[i]; ol.appendChild(li); }
    $('task-sub').textContent = S.tasks.clueLabel(t.clues) + '. ' + S.tasks.clueCost;
  }
  function toolMode(m) {
    globe.setMode(m); $('tool-spin').setAttribute('aria-pressed', String(m === 'spin')); $('tool-ruler').setAttribute('aria-pressed', String(m === 'ruler'));
  }

  /* ---------- map taps ---------- */
  function onGlobeTap(ll) {
    var t = task; if (!t || t.locked || $('s-play').hidden) return;
    if (t.type === 'ocean') {
      t.attempts++;
      var r = J.judgeOceanTap(W, t.target, ll, t.revealed ? 99 : t.attempts);
      globe.marker = { lonlat: ll, text: r.hit.name || '', tone: r.correct ? 'good' : 'bad' };
      if (r.correct) { t.onRight = function () { globe.highlight = r.feature; globe.render(); }; hitRight(t, r.points, t.target, t.o.fact); return; }
      globe.render(); t.feature = r.feature;
      var h = r.hit, msg;
      if (h.kind === 'land') msg = S.oceans.wrongLand(h.name);
      else if (h.name === 'Caspian Sea') msg = S.oceans.wrongLake;
      else if (h.kind === 'sea') msg = S.oceans.wrongSea(h.name);
      else msg = S.oceans.wrongOcean(h.name);
      if (t.attempts === 2) msg += S.oceans.hint(t.o.hint);
      if (t.revealed) msg = S.oceans.revealMiss(msg, t.target);
      if (r.reveal && !t.revealed) { t.feature = J.oceanFeature ? J.oceanFeature(W, t.target) : r.feature; }
      missed(t, msg);
      return;
    }
    if (t.type === 'mystery') {
      var m = J.judgeMystery(t.m.at, ll, t.clues);
      globe.pins = [{ lonlat: ll, label: S.play.yourPin, color: '#1A3A6B' }, { lonlat: t.m.at, label: t.m.name }];
      globe.flyTo(t.m.at, 900);
      award(m.points); fb(S.tasks.mysteryResult(t.m.name, m.km, m.points), m.points ? 'good' : 'bad');
      resolved(t.m.name, null);
    }
  }
  function onMapTap(ll) {
    var t = task; if (!t || t.locked) return;
    if (t.type === 'drag') { dragTapMap(t, ll); return; }
    if (t.type === 'pin') {
      var r = J.judgePin(t.at, ll, t.bands);
      map.pins = [{ lonlat: ll, label: S.play.yourPin, color: '#1A3A6B' }, { lonlat: t.at, label: t.target }]; map.render();
      award(r.points); fb(S.play.pinResult(r.km, r.points) + ' ' + S.play.pinTrue, r.points ? 'good' : 'bad');
      resolved(t.target, t.fact);
      return;
    }
    t.attempts++;
    if (t.type === 'region') {
      var g = J.judgeRegionTap(t.features, t.isTarget, ll, t.attempts);
      if (g.correct) { t.onRight = function () { map.highlight = null; map.painted.push({ feature: g.hit, fill: PAINT }); map.render(); }; hitRight(t, tapPoints(t), t.kicker || t.target, t.fact); return; }
      map.marker = { lonlat: ll, text: g.hit ? g.hit.properties.name : '', tone: 'bad' }; map.render();
      missed(t, S.play.wrongRegion(g.hit && g.hit.properties.name)); return;
    }
    if (t.type === 'feature') {
      var f = J.judgeFeatureTap(t.candidates, t.target, ll, t.attempts);
      map.marker = { lonlat: ll, text: f.hit ? f.hit.name : '', tone: f.correct ? 'good' : 'bad' };
      if (f.correct) { t.onRight = function () { if (f.hit.feature) map.highlight = f.hit.feature; map.render(); }; hitRight(t, tapPoints(t), t.kicker || t.target, t.fact); return; }
      map.render(); missed(t, S.play.wrongFeature(f.hit && f.hit.name)); return;
    }
    if (t.type === 'sea') {
      var s = J.seaAt(t.land, ll);
      if (s.kind === 'sea' && s.name === t.target) { map.marker = { lonlat: ll, text: s.name, tone: 'good' }; hitRight(t, tapPoints(t), t.target, t.fact); map.render(); return; }
      map.marker = { lonlat: ll, text: s.kind === 'land' ? '' : s.name, tone: 'bad' }; map.render();
      missed(t, S.play.wrongSea(s.kind === 'land' ? 'land' : s.name));
    }
  }

  /* ---------- "Choose from a list instead" (under every map) ---------- */
  function listSetup() {
    var t = task, box = $('list'), tog = $('list-toggle');
    var can = t.type !== 'choice';
    tog.hidden = !can; box.innerHTML = '';
    if (!can) { box.hidden = true; return; }
    t.list = !!state.list;
    tog.textContent = t.list ? S.buttons.listClose : S.buttons.listOpen; tog.setAttribute('aria-expanded', String(t.list));
    box.hidden = !t.list;
    if (t.type === 'drag') { dragLetters(t); }
    if (!t.list) return;
    var lead = document.createElement('p'); lead.className = 'help';
    lead.textContent = t.type === 'drag' ? S.play.listDrag : t.type === 'ruler' ? S.play.listRuler : S.play.listLead; box.appendChild(lead);
    if (t.type === 'drag') {
      t.letters.forEach(function (L) { var b = document.createElement('button'); b.type = 'button'; b.className = 'option letter'; b.textContent = L.letter; b.onclick = function () { dragToRegion(t, L.region); }; box.appendChild(b); });
      return;
    }
    if (!t.listOpts) t.listOpts = t.type === 'ruler' ? shuffle([5420, 2700, 8100, 11600]) : shuffle([t.target].concat(t.pool ? others(t.pool, [t.target], 3) : []));
    t.listOpts.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'option';
      b.textContent = t.type === 'ruler' ? S.tasks.rulerOption(o) : o;
      b.onclick = function () { listPick(t, o, b); }; if (t.locked) b.disabled = true;
      box.appendChild(b);
    });
  }
  function listPick(t, o, b) {
    if (t.locked) return;
    var right = o === (t.type === 'ruler' ? 5420 : t.target);
    if (t.type === 'pin' || t.type === 'mystery' || t.type === 'ruler') {
      var pts = !right ? 0 : t.type === 'pin' ? t.bands[0][1] : t.type === 'mystery' ? Math.max(0, 5 - (t.clues - 1)) : 3;
      award(pts); b.classList.add(right ? 'right' : 'wrong');
      fb(right ? S.play.choiceRight(pts) : S.play.choiceWrong(t.type === 'ruler' ? S.tasks.rulerOption(5420) : t.target), right ? 'good' : 'bad');
      if (t.type === 'pin') { map.pins = [{ lonlat: t.at, label: t.target }]; map.render(); }
      if (t.type === 'mystery') { globe.pins = [{ lonlat: t.m.at, label: t.m.name }]; globe.flyTo(t.m.at, 900); }
      resolved(t.type === 'ruler' ? S.tasks.rulerOption(5420) : t.target, t.fact || null);
      return;
    }
    t.attempts++;
    if (right) {
      b.classList.add('right');
      if (t.type === 'region') { var f = t.features.filter(t.isTarget); t.onRight = function () { f.forEach(function (x) { map.painted.push({ feature: x, fill: PAINT }); }); map.render(); }; }
      if (t.type === 'ocean') t.onRight = function () { globe.highlight = J.oceanFeature(W, t.target); globe.flyTo(t.o.view, 900); };
      if (t.type === 'feature' || t.type === 'sea') t.onRight = function () { REVEAL[t.type](t); };
      hitRight(t, tapPoints(t), t.kicker || t.target, t.type === 'ocean' ? t.o.fact : t.fact);
      return;
    }
    b.disabled = true; b.classList.add('wrong');
    missed(t, t.type === 'ocean' ? S.play.wrongRegion(o) : t.type === 'sea' ? S.play.wrongSea(o) : S.play.wrongRegion(o));
  }
  function markListAnswer(t) { $('list').querySelectorAll('button').forEach(function (b) { if (b.textContent === t.target) b.classList.add('reveal'); }); }

  /* ---------- drag tiles: place all, then check (Leg 2 continents, Leg 5 provinces) ---------- */
  function dragSetup(t) {
    t.placed = {}; t.done = {}; t.round = 1; t.sel = null;
    var tray = $('tray'); tray.hidden = false; tray.innerHTML = '';
    t.el = {};
    shuffle(t.tiles.slice()).forEach(function (name) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tile'; b.textContent = name; b.setAttribute('aria-pressed', 'false');
      t.el[name] = b; tileDrag(t, b, name); tray.appendChild(b);
    });
    t.letters = shuffle(Object.keys(t.anchors)).map(function (r, i) { return { region: r, letter: String.fromCharCode(65 + i) }; });
    $('task-go').textContent = S.buttons.check; $('task-go').onclick = function () { dragCheck(t); };
    dragStatus(t);
  }
  function dragStatus(t) {
    var left = t.tiles.filter(function (n) { return !t.done[n] && !t.placed[n]; }).length;
    $('task-go').hidden = left > 0; $('task-go').textContent = t.round === 1 ? S.buttons.check : S.buttons.checkAgain;
    $('task-sub').textContent = left > 0 ? S.play.sub.drag + ' ' + S.play.placeAll(left) : S.play.sub.drag;
    layoutTiles(t);
  }
  function tileDrag(t, b, name) {
    var st = null;
    b.addEventListener('pointerdown', function (e) {
      if (t.done[name] || t.locked) return;
      st = { x: e.clientX, y: e.clientY, moved: false }; b.setPointerCapture(e.pointerId);
    });
    b.addEventListener('pointermove', function (e) {
      if (!st) return;
      if (!st.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 6) { st.moved = true; b.classList.add('dragging'); document.body.appendChild(b); }
      if (st.moved) { b.style.left = (e.clientX - b.offsetWidth / 2) + 'px'; b.style.top = (e.clientY - b.offsetHeight / 2) + 'px'; }
    });
    function end(e) {
      if (!st) return; var moved = st.moved; st = null;
      if (!moved) { selectTile(t, name); return; }
      b.classList.remove('dragging'); b.style.left = b.style.top = '';
      var r = $('map').getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        var ll = map.invert([e.clientX - r.left, e.clientY - r.top]), reg = ll && t.regionOf(ll);
        if (reg && t.anchors[reg]) { place(t, name, reg); return; }
      }
      delete t.placed[name]; dragStatus(t);
    }
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
  }
  function selectTile(t, name) {
    t.sel = t.sel === name ? null : name;
    Object.keys(t.el).forEach(function (n) { t.el[n].setAttribute('aria-pressed', String(n === t.sel)); });
  }
  function dragTapMap(t, ll) { if (!t.sel) return; var reg = t.regionOf(ll); if (reg && t.anchors[reg]) place(t, t.sel, reg); }
  function dragToRegion(t, reg) { if (t.sel && !t.locked) place(t, t.sel, reg); }
  function place(t, name, reg) {
    var taken = false;
    Object.keys(t.placed).forEach(function (n) { if (t.placed[n] === reg && n !== name) { if (t.done[n]) taken = true; else delete t.placed[n]; } });
    if (!taken) t.placed[name] = reg;
    t.sel = null; Object.keys(t.el).forEach(function (n) { t.el[n].setAttribute('aria-pressed', 'false'); });
    dragStatus(t);
  }
  function layoutTiles(t) {
    if (!t || t.type !== 'drag' || !t.el) return;
    var over = $('tiles'), tray = $('tray'), cv = $('map');
    over.style.left = cv.offsetLeft + 'px'; over.style.top = cv.offsetTop + 'px'; over.style.width = cv.style.width; over.style.height = cv.style.height;
    t.tiles.forEach(function (n) {
      var b = t.el[n], reg = t.placed[n];
      if (b.classList.contains('dragging')) return;
      if (reg) { var q = map.toScreen(t.anchors[reg]); if (b.parentNode !== over) over.appendChild(b); b.style.left = q[0] + 'px'; b.style.top = q[1] + 'px'; b.classList.add('placed'); }
      else { if (b.parentNode !== tray) tray.appendChild(b); b.style.left = b.style.top = ''; b.classList.remove('placed'); }
    });
    over.querySelectorAll('.letter-mark').forEach(function (x) { x.remove(); });
    if (t.list) t.letters.forEach(function (L) {
      if (Object.keys(t.placed).some(function (n) { return t.placed[n] === L.region; })) return;
      var q = map.toScreen(t.anchors[L.region]), m = document.createElement('span'); m.className = 'letter-mark'; m.textContent = L.letter; m.style.left = q[0] + 'px'; m.style.top = q[1] + 'px'; over.appendChild(m);
    });
    tray.hidden = !t.tiles.some(function (n) { return !t.placed[n]; });
  }
  function dragLetters(t) { layoutTiles(t); }
  function dragCheck(t) {
    if (t.locked) return;
    var open = {}; Object.keys(t.placed).forEach(function (n) { if (!t.done[n]) open[n] = t.placed[n]; });
    var r = J.judgePlacement(open, t.round, 2);
    award(r.points);
    r.right.forEach(function (n) { t.done[n] = true; t.el[n].classList.add('right'); t.el[n].disabled = true; });
    if (!r.wrong.length) { fb(S.tasks.continentsDone(run.points), 'good'); dragEnd(t); return; }
    var lines = r.wrong.map(function (n) { return S.tasks.tileWrong(n, t.placed[n]); }).join(' ');
    if (t.round === 1) {
      r.wrong.forEach(function (n) { delete t.placed[n]; });
      t.round = 2; fb(lines + ' ' + S.tasks.tilesBack, 'bad'); dragStatus(t); return;
    }
    r.wrong.forEach(function (n) { t.placed[n] = n; t.done[n] = true; t.el[n].classList.add('shown'); t.el[n].disabled = true; });
    fb(lines + ' ' + S.tasks.tilesShown, 'info'); dragEnd(t);
  }
  function dragEnd(t) { $('task-go').hidden = true; layoutTiles(t); resolved(t.kicker, t.fact); }

  /* ---------- Leg 6: sorting board ---------- */
  function sortSetup(t) {
    $('sort-count').textContent = S.play.part(t.part, 1, 1); $('sort-task').textContent = t.text; $('sort-sub').textContent = S.tasks.types.sub;
    $('sort-board').hidden = false; $('photo-board').hidden = true; $('sort-check').hidden = true;
    t.placed = {}; t.done = {}; t.round = 1; t.sel = null; t.el = {};
    var zones = $('zones'); zones.innerHTML = '';
    D.types.zones.forEach(function (z) {
      var d = document.createElement('div'); d.className = 'zone'; d.dataset.zone = z;
      var h = document.createElement('button'); h.type = 'button'; h.className = 'zone-head'; h.textContent = S.tasks.types.zones[z];
      h.onclick = function () { if (t.sel) sortPlace(t, t.sel, z); };
      var c = document.createElement('div'); c.className = 'zone-chips';
      d.appendChild(h); d.appendChild(c); zones.appendChild(d);
    });
    shuffle(D.types.words.map(function (w) { return w.word; })).forEach(function (w) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tile chip'; b.textContent = w; b.setAttribute('aria-pressed', 'false');
      t.el[w] = b; chipDrag(t, b, w);
    });
    $('sort-tray').onclick = function (e) { if (e.target === $('sort-tray') && t.sel) { delete t.placed[t.sel]; t.sel = null; sortLayout(t); } };
    $('sort-check').textContent = S.buttons.check; $('sort-check').onclick = function () { sortCheck(t); };
    sortLayout(t);
  }
  function chipDrag(t, b, w) {
    var st = null;
    b.addEventListener('pointerdown', function (e) { if (t.done[w] || t.locked) return; st = { x: e.clientX, y: e.clientY, moved: false }; b.setPointerCapture(e.pointerId); });
    b.addEventListener('pointermove', function (e) {
      if (!st) return;
      if (!st.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 6) { st.moved = true; b.classList.add('dragging'); document.body.appendChild(b); }
      if (st.moved) { b.style.left = (e.clientX - b.offsetWidth / 2) + 'px'; b.style.top = (e.clientY - b.offsetHeight / 2) + 'px'; }
    });
    function end(e) {
      if (!st) return; var moved = st.moved; st = null;
      if (!moved) { t.sel = t.sel === w ? null : w; sortLayout(t); return; }
      b.classList.remove('dragging'); b.style.left = b.style.top = ''; b.style.visibility = 'hidden';
      var under = document.elementFromPoint(e.clientX, e.clientY); b.style.visibility = '';
      var z = under && under.closest && under.closest('.zone');
      if (z) sortPlace(t, w, z.dataset.zone); else { delete t.placed[w]; sortLayout(t); }
    }
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
  }
  function sortPlace(t, w, z) { t.placed[w] = z; t.sel = null; sortLayout(t); }
  function sortLayout(t) {
    var tray = $('sort-tray'), left = 0;
    Object.keys(t.el).forEach(function (w) {
      var b = t.el[w], z = t.placed[w];
      b.setAttribute('aria-pressed', String(t.sel === w));
      var home = z ? document.querySelector('.zone[data-zone="' + z + '"] .zone-chips') : tray;
      if (b.parentNode !== home) home.appendChild(b);
      if (!z) left++;
    });
    $('sort-sub').textContent = left ? S.tasks.types.sub + ' ' + S.tasks.types.placeAll(left) : S.tasks.types.sub;
    $('sort-check').hidden = left > 0 || t.locked; $('sort-check').textContent = t.round === 1 ? S.buttons.check : S.buttons.checkAgain;
    tray.hidden = left === 0;
  }
  function sortCheck(t) {
    var open = {}; Object.keys(t.placed).forEach(function (w) { if (!t.done[w]) open[w] = t.placed[w]; });
    var r = J.judgeSort(D.types.words, open);
    award(r.points);
    r.right.forEach(function (w) { t.done[w] = true; t.el[w].classList.add('right'); t.el[w].disabled = true; });
    if (!r.wrong.length) { fb(S.tasks.types.done(run.points), 'good'); t.locked = true; sortLayout(t); resolved(null, null); return; }
    if (t.round === 1) { r.wrong.forEach(function (w) { delete t.placed[w]; }); t.round = 2; fb(S.tasks.types.back, 'bad'); sortLayout(t); return; }
    r.wrong.forEach(function (w) { var word = D.types.words.filter(function (x) { return x.word === w; })[0]; t.placed[w] = word.zone; t.done[w] = true; t.el[w].classList.add('shown'); t.el[w].disabled = true; });
    t.locked = true; fb(S.tasks.types.shown, 'info'); sortLayout(t); resolved(null, null);
  }
  /* ---------- Leg 6: photographs from space ---------- */
  function photoSetup(t) {
    $('sort-board').hidden = true; $('photo-board').hidden = false; $('sort-check').hidden = true;
    $('sort-count').textContent = S.tasks.types.photoTask(t.n, t.of); $('sort-task').textContent = S.tasks.types.photoAsk[t.p.id]; $('sort-sub').textContent = S.tasks.types.photoSub;
    var img = $('photo'); img.src = t.p.src; img.alt = S.tasks.types.photoAlt[t.p.id];
    $('photo-credit').textContent = S.tasks.types.credit(t.p.credit);
    var svg = $('photo-hot'); svg.setAttribute('viewBox', '0 0 ' + t.p.w + ' ' + t.p.h); svg.innerHTML = '';
    img.onclick = function (e) {
      if (t.locked) return;
      var r = img.getBoundingClientRect(), pt = [(e.clientX - r.left) / r.width * t.p.w, (e.clientY - r.top) / r.height * t.p.h];
      var j = J.judgeHotspot(t.p.hot, pt); award(j.points);
      svg.innerHTML = '<polygon points="' + t.p.hot.map(function (q) { return q.join(','); }).join(' ') + '" class="hot"/><circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="' + (t.p.w / 60) + '" class="tap ' + (j.correct ? 'good' : 'bad') + '"/>';
      fb(j.correct ? S.tasks.types.photoRight : S.tasks.types.photoWrong, j.correct ? 'good' : 'bad');
      resolved(null, S.tasks.types.photoFact[t.p.id]);
    };
  }

  /* ---------- scenes (flat maps) ---------- */
  function box(w, s, e, n) { return { type: 'MultiPoint', coordinates: [[w, s], [e, s], [w, n], [e, n]] }; }
  var SCENES = {
    world: function () { return { key: 'world', projection: d3.geoEqualEarth(), fit: { type: 'Sphere' }, sphere: true, aspect: 0.49, fixed: true, fills: [{ features: W.continents, fill: LAND, stroke: EDGE, lw: 0.7 }] }; },
    europe: function () { return { key: 'europe', projection: d3.geoConicConformal().rotate([-15, 0]).parallels([40, 65]), fit: box(-11, 35, 41, 71), aspect: 0.9, zoomMax: 3.5, fills: [{ features: W.europe, fill: LAND, stroke: EDGE, lw: 0.7 }] }; },
    ni: function () {
      var ni = W.irl.counties.filter(function (f) { return f.properties.country === 'Northern Ireland'; }), roi = W.irl.counties.filter(function (f) { return f.properties.country !== 'Northern Ireland'; });
      return { key: 'ni', projection: d3.geoConicConformal().rotate([6.7, 0]).parallels([54, 55.5]), fit: box(-8.3, 53.95, -5.3, 55.45), aspect: 0.78, zoomMax: 3,
        fills: [{ features: roi, fill: CONTEXT, stroke: '#B8AE93', lw: 0.6 }, { features: ni, fill: LAND, stroke: EDGE, lw: 1 }, { features: W.irl.loughs, fill: WATER, stroke: '#1F4F8F', lw: 0.6 }],
        lines: [{ features: W.irl.rivers, stroke: WATER, lw: 2.4 }] };
    },
    ireland: function () { return irlScene('ireland', false); },
    irelandFixed: function () { return irlScene('irelandFixed', true); }
  };
  function irlScene(key, fixed) {
    return { key: key, projection: d3.geoConicConformal().rotate([8, 0]).parallels([52, 55]), fit: { type: 'FeatureCollection', features: W.irl.counties }, aspect: 1.22, zoomMax: 3, fixed: fixed,
      fills: [{ features: W.irl.counties, fill: LAND, stroke: EDGE, lw: 0.7 }, { features: W.irl.countries, fill: 'rgba(0,0,0,0)', stroke: '#5A4A2A', lw: 1.8 }, { features: W.irl.loughs, fill: WATER, stroke: '#1F4F8F', lw: 0.6 }],
      lines: [{ features: W.irl.rivers, stroke: WATER, lw: 2 }] };
  }

  /* ---------- the seven legs ---------- */
  function number(list, part) { list.forEach(function (t, i) { t.part = part; t.n = i + 1; t.of = list.length; }); return list; }
  var RUN = {
    oceans: function () {
      return number(shuffle(D.oceans.slice()).map(function (o) { return { type: 'ocean', target: o.name, o: o, text: S.oceans.task(o.name), sub: S.oceans.sub, pool: D.oceans.map(function (x) { return x.name; }) }; }), S.oceans.label);
    },
    continents: function () {
      var anchors = {}; D.continents.forEach(function (c) { anchors[c.name] = c.anchor; });
      return number([{ type: 'drag', scene: 'world', tiles: D.continents.map(function (c) { return c.name; }), anchors: anchors, text: S.tasks.continents, kicker: S.tasks.continentsKicker, fact: D.continentFacts,
        regionOf: function (ll) { var c = J.continentAt(W, ll); return c ? c.name : null; } }], S.tasks.continentsKicker);
    },
    europe: function () {
      var names = D.europe.countries.map(function (c) { return c.name; });
      var a = number(shuffle(D.europe.countries.slice()).map(function (c) {
        return { type: 'region', scene: 'europe', target: c.name, text: S.tasks.country(c.name), sub: S.play.sub.tap, features: W.europe, isTarget: function (f) { return f.properties.name === c.name; }, fact: c.fact, pool: names };
      }), S.tasks.partCountries);
      var caps = D.europe.capitals.map(function (c) { return c.name; });
      var b = number(shuffle(D.europe.capitals.slice()).map(function (c) {
        return { type: 'pin', scene: 'europe', target: c.name, at: c.at, bands: J.CAPITAL_BANDS, text: S.tasks.capital(c.name, c.country), sub: S.play.sub.pin, pool: caps };
      }), S.tasks.partCapitals);
      return a.concat(b);
    },
    ni: function () {
      var N = D.ni, C = W.irl.counties;
      var counties = number(shuffle(D.ni.counties.slice()).map(function (n) {
        return { type: 'region', scene: 'ni', target: n, kicker: n, text: S.tasks.county(n), sub: S.play.sub.tap, features: C, isTarget: function (f) { return f.properties.name === n; }, pool: D.ni.counties };
      }), S.tasks.partCounties);
      var hills = N.hills.map(function (h) { return { name: h.name, at: h.at }; });
      var dots = N.settlements.concat(N.decoys).map(function (d) { return { name: d.name, at: d.at }; });
      var water = N.rivers.map(function (n) { return { name: n, feature: byName(W.irl.rivers, n), r: 6 }; }).concat(N.loughs.map(function (n) { return { name: n, feature: byName(W.irl.loughs, n), r: 3 }; }));
      var physical = water.concat(N.hills.map(function (h) { return { name: h.name, at: h.at, r: h.r }; }));
      var towns = N.settlements.concat(N.decoys).map(function (d) { return { name: d.name, at: d.at, r: 8 }; });
      var isTown = {}; N.settlements.forEach(function (s) { isTown[s.name] = 1; });
      var featNames = physical.map(function (c) { return c.name; });
      var feats = number(D.ni.features.map(function (n) {
        var town = !!isTown[n];
        return { type: 'feature', scene: 'ni', target: n, text: S.tasks.feature(n), sub: S.play.sub.tap, candidates: town ? towns : physical, hills: hills, dots: town ? dots.map(function (d) { return Object.assign({}, d); }) : [], pool: town ? N.settlements.map(function (s) { return s.name; }) : featNames };
      }), S.tasks.partFeatures);
      var qs = number(D.ni.questions.map(function (q) {
        var t = { text: S.tasks.q[q.id], sub: S.play.sub.tap, fact: q.fact, scene: 'ni', hills: hills };
        if (q.kind === 'choice') return Object.assign(t, { type: 'choice', options: q.options, answer: q.answer, sub: S.play.sub.choice });
        if (q.kind === 'region') return Object.assign(t, { type: 'region', target: q.target, kicker: q.target, features: C, isTarget: function (f) { return f.properties.name === q.target; }, pool: N.counties });
        if (q.kind === 'sea') return Object.assign(t, { type: 'sea', target: q.target, land: C, at: [-8.6, 55.35], pool: ['Atlantic Ocean', 'Irish Sea', 'North Sea', 'Pacific Ocean'] });
        var basalt = q.target === N.causeway.name;
        var cands = basalt ? towns.concat([{ name: N.causeway.name, at: N.causeway.at, r: 8 }]) : physical;
        return Object.assign(t, { type: 'feature', target: q.target, candidates: cands, dots: basalt ? dots.concat([{ name: N.causeway.name, at: N.causeway.at }]) : [], pool: basalt ? N.settlements.map(function (s) { return s.name; }) : featNames });
      }), S.tasks.partQuestions);
      return counties.concat(feats, qs);
    },
    ireland: function () {
      var I = D.ireland, C = W.irl.counties, X = I.facts, T = S.tasks.ireland;
      var hills = I.hills.map(function (h) { return { name: h.name, at: h.at }; });
      var cityDots = I.cities.concat(I.decoys).map(function (d) { return { name: d.name, at: d.at }; });
      var cityC = I.cities.concat(I.decoys).map(function (d) { return { name: d.name, at: d.at, r: 8 }; });
      var cityNames = I.cities.concat(I.decoys).map(function (d) { return d.name; });
      var countyNames = C.map(function (f) { return f.properties.name; });
      var countryNames = ['Northern Ireland', 'Republic of Ireland', 'Scotland', 'Wales'];
      var anchors = {}; I.provinces.forEach(function (p) { anchors[p.name] = p.anchor; });
      function region(target, text, isT, fact, pool, feats) { return { type: 'region', scene: 'ireland', target: target, kicker: target, text: text, sub: S.play.sub.tap, features: feats || C, isTarget: isT, fact: fact, pool: pool || countyNames }; }
      function inProv(p) { return function (f) { return f.properties.province === p; }; }
      var list = [
        region('Northern Ireland', T.north, function (f) { return f.properties.name === 'Northern Ireland'; }, X.north, countryNames, W.irl.countries),
        region('Republic of Ireland', T.south, function (f) { return f.properties.name === 'Republic of Ireland'; }, X.south, countryNames, W.irl.countries)
      ];
      D.ireland.capitals.forEach(function (c) { list.push({ type: 'pin', scene: 'ireland', target: c.name, at: c.at, bands: J.IRELAND_BANDS, text: T.pin(c.name, c.of), sub: S.play.sub.pin, pool: cityNames.concat(I.capitals.map(function (x) { return x.name; })) }); });
      list.push({ type: 'drag', scene: 'irelandFixed', tiles: D.ireland.provinces.map(function (p) { return p.name; }), anchors: anchors, text: T.provinces, kicker: T.provinces, regionOf: function (ll) { var f = J.regionAt(W.irl.provinces, ll); return f ? f.properties.name : null; } });
      var carr = I.hills[0];
      list.push({ type: 'feature', scene: 'ireland', target: carr.name, text: T.carrauntoohil, sub: S.play.sub.tap, hills: hills, candidates: D.ireland.hills.map(function (h) { return { name: h.name, at: h.at, r: h.r }; }), fact: X.carrauntoohil, pool: I.hills.map(function (h) { return h.name; }) });
      list.push(region(carr.county, T.kerry, function (f) { return f.properties.name === carr.county; }, null));
      list.push({ type: 'feature', scene: 'ireland', target: 'River Shannon', text: T.shannon, sub: S.play.sub.tap, candidates: D.ireland.rivers.map(function (n) { return { name: n, feature: byName(W.irl.rivers, n), r: 8 }; }), fact: X.shannon, pool: I.rivers });
      shuffle(D.ireland.cities.slice()).forEach(function (c) { list.push({ type: 'feature', scene: 'ireland', target: c.name, text: T.city(c.name), sub: S.play.sub.tap, candidates: cityC, dots: cityDots.map(function (d) { return Object.assign({}, d); }), pool: cityNames }); });
      var munster = C.filter(inProv('Munster')).map(function (f) { return f.properties.name; }), connacht = C.filter(inProv('Connacht')).map(function (f) { return f.properties.name; });
      var mu = region('Munster', T.munster, inProv('Munster'), null); mu.target = munster[Math.floor(Math.random() * munster.length)]; mu.kicker = 'Munster'; mu.pool = countyNames.filter(function (n) { return munster.indexOf(n) < 0; }).concat([mu.target]);
      var co = region('Connacht', T.connacht, inProv('Connacht'), null); co.target = connacht[Math.floor(Math.random() * connacht.length)]; co.kicker = 'Connacht'; co.pool = countyNames.filter(function (n) { return connacht.indexOf(n) < 0; }).concat([co.target]);
      list.push(mu, co);
      list.push({ type: 'choice', scene: 'ireland', text: T.counties, sub: S.play.sub.choice, options: I.countQuestion.options, answer: I.countQuestion.answer, fact: X.counties });
      list.push(region('Antrim', T.causeway, function (f) { return f.properties.name === 'Antrim'; }, X.causeway));
      return number(list, T.part);
    },
    types: function () {
      var ph = D.types.photos.map(function (p, i) { return { type: 'photo', p: p, n: i + 1, of: D.types.photos.length }; });
      return [{ type: 'sort', text: S.tasks.types.task, part: S.tasks.types.tray, n: 1, of: 1 }].concat(ph);
    },
    final: function () {
      var names = D.mysteries.map(function (m) { return m.name; });
      var ms = number(shuffle(D.mysteries.slice()).map(function (m, i) { return { type: 'mystery', m: m, target: m.name, text: S.tasks.mystery(i + 1), sub: S.play.sub.globePin, pool: names }; }), S.tasks.partMystery);
      var ruler = { type: 'ruler', text: S.tasks.rulerTask, sub: S.play.sub.ruler + ' ' + S.tasks.rulerHint, part: S.tasks.rulerPart, n: 1, of: 1 };
      return ms.concat([ruler]);
    }
  };

  function legTasks(id) {
    switch (id) {
      case 'oceans': return RUN.oceans();
      case 'continents': return RUN.continents();
      case 'europe': return RUN.europe();
      case 'ni': return RUN.ni();
      case 'ireland': return RUN.ireland();
      case 'types': return RUN.types();
      case 'final': return RUN.final();
    }
  }

  /* ---------- leg done: stamp + expedition ---------- */
  function legDone(L, points, elapsedMs) {
    $('done-title').textContent = S.legDone.title(L);
    var st = $('done-stamp'); st.innerHTML = ''; st.textContent = S.legDone.stamp(L);
    var small = document.createElement('small'); small.textContent = mmss(elapsedMs); st.appendChild(small);
    st.classList.remove('stamp-in'); void st.offsetWidth; st.classList.add('stamp-in');
    $('done-time').textContent = S.legDone.time(mmss(elapsedMs));
    var exp = D.expeditions[L.id], next = nextLeg(L.id);
    $('done-next').textContent = next ? S.buttons.nextLeg(next) : S.buttons.certificate;
    $('done-next').onclick = function () { if (next) startLeg(next.id); else finish(); };
    $('expedition').hidden = false; $('done-next').hidden = true;
    $('done-points').textContent = S.legDone.points(points, L.max - exp.points);
    $('exp-text').textContent = exp.text; $('exp-link').textContent = S.expedition.open; $('exp-link').href = exp.url; $('exp-q').textContent = exp.question;
    var box = $('exp-options'); box.innerHTML = ''; var chosen = null;
    shuffle(exp.options.slice()).forEach(function (opt) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'option'; b.textContent = opt; b.setAttribute('aria-pressed', 'false');
      b.onclick = function () { chosen = opt; box.querySelectorAll('.option').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); $('exp-lock').disabled = false; };
      box.appendChild(b);
    });
    setFeedback($('exp-feedback'), null); $('exp-lock').disabled = true; $('exp-lock').hidden = false;
    $('exp-lock').onclick = function () {
      if (!chosen) return;
      var r = J.judgeChoice(exp.answer, chosen, exp.points);
      box.querySelectorAll('.option').forEach(function (x) { x.disabled = true; if (x.textContent === exp.answer) x.classList.add('right'); else if (x.textContent === chosen && !r.correct) x.classList.add('wrong'); });
      if (state.legs[L.id]) { state.legs[L.id].points += r.points; state.legs[L.id].expedition = true; save(); renderHeader(); }
      setFeedback($('exp-feedback'), r.correct ? S.expedition.right(r.points) : S.expedition.wrong(exp.answer, exp.why), r.correct ? 'good' : 'bad');
      $('done-points').textContent = S.legDone.points(state.legs[L.id] ? state.legs[L.id].points : points + r.points, L.max);
      $('exp-lock').hidden = true; $('done-next').hidden = false; $('done-next').focus();
    };
    show('s-done');
  }

  /* ---------- passport + score token ---------- */
  function stampSlots(box) {
    box.innerHTML = '';
    D.legs.forEach(function (l) {
      var s = document.createElement('div'); s.className = 'slot' + (stamped(l.id) ? ' done' : state.current === l.id ? ' now' : '');
      if (stamped(l.id)) { s.textContent = l.stamp; var sm = document.createElement('small'); sm.textContent = S.header.points(state.legs[l.id].points) + ' · ' + mmss(state.legs[l.id].time); s.appendChild(sm); }
      else { s.textContent = l.n + ' ' + l.title; var sm2 = document.createElement('small'); sm2.textContent = state.current === l.id ? S.passport.now : S.passport.empty; s.appendChild(sm2); }
      box.appendChild(s);
    });
  }
  function passport() {
    if (run && run.timer) stopClock();
    $('pp-explorer').textContent = S.passport.explorer(state.name || '—');
    $('pp-points').textContent = S.passport.points(banked());
    $('pp-rank').textContent = S.passport.rank(J.rank(banked(), maxSoFar(), D.ranks).name);
    stampSlots($('pp-stamps'));
    $('pp-token').textContent = token(); $('pp-copy').textContent = state.stamps.length === D.legs.length ? S.buttons.copy : S.buttons.copySoFar;
    show('s-passport');
  }
  function backFromPassport() {
    var to = prevScreen === 's-passport' ? 's-door' : prevScreen;
    if ((to === 's-play' || to === 's-sort') && run && !run.done && !run.timer) { show(to); startClock(); if (to === 's-play') { if (!$('map').hidden) { map.resize(); layoutTiles(task); } else globe.resize(); } return; }
    if (to === 's-door') { door(); return; }
    if (to === 's-finish') { finish(); return; }
    show(to);
  }
  function copyToken(btn, label) {
    var t = token(), done = function () { btn.textContent = S.buttons.copied; setTimeout(function () { btn.textContent = label; }, 2000); };
    var fail = function () { btn.textContent = label; var h = btn.parentNode.querySelector('.help'); if (h) h.textContent = S.passport.copyFailed; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fail); else fail();
  }

  /* ---------- finish: certificate ---------- */
  function finish() {
    stopClock(); state.current = null; save(); renderHeader();
    var p = banked(), max = D.legs.reduce(function (a, l) { return a + l.max; }, 0);
    $('fin-name').textContent = state.name || '—';
    $('fin-line').textContent = S.finish.line(J.rank(p, max, D.ranks).name);
    $('fin-points').textContent = S.finish.points(p, max);
    stampSlots($('fin-stamps'));
    $('fin-date').textContent = S.finish.date(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
    $('fin-token').textContent = token(); $('fin-confirm').hidden = true;
    show('s-finish');
  }

  /* ---------- wiring ---------- */
  function wire() {
    $('door-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('name').value.trim();
      if (!n) { $('name-error').textContent = S.door.needName; $('name').focus(); return; }
      $('name-error').textContent = ''; state.name = n; save(); startLeg('oceans');
    });
    $('door-carry').onclick = carryOn;
    $('door-restart').onclick = function () { $('restart-confirm').hidden = false; $('restart-yes').focus(); };
    $('restart-no').onclick = function () { $('restart-confirm').hidden = true; };
    $('restart-yes').onclick = restart;
    $('btn-passport').onclick = passport;
    $('pp-back').onclick = backFromPassport;
    $('pp-copy').onclick = function () { copyToken($('pp-copy'), $('pp-copy').textContent); };
    $('fin-copy').onclick = function () { copyToken($('fin-copy'), S.buttons.copy); };
    $('fin-print').onclick = function () { window.print(); };
    $('fin-passport').onclick = passport;
    $('fin-again').onclick = function () { $('fin-confirm').hidden = false; $('fin-yes').focus(); };
    $('fin-no').onclick = function () { $('fin-confirm').hidden = true; };
    $('fin-yes').onclick = restart;
    $('fact-next').onclick = afterFact;
    $('sort-next').onclick = afterFact;
    $('tool-spin').onclick = function () { toolMode('spin'); };
    $('tool-ruler').onclick = function () { toolMode('ruler'); };
    $('list-toggle').onclick = function () { state.list = !state.list; save(); listSetup(); if (task && task.type === 'drag') layoutTiles(task); };
  }

  function init() {
    var ch = document.createElement('div'); ch.id = 'choices'; ch.className = 'options'; ch.hidden = true;
    var fbEl = $('feedback'); fbEl.parentNode.insertBefore(ch, fbEl);
    fillStatic(); wire();
    state = load() || fresh();
    if (!state.legs) state.legs = {};
    renderHeader();
    function get(f) { return fetch(f).then(function (r) { return r.json(); }); }
    Promise.all([get('data/world.topo.json'), get('data/europe.topo.json'), get('data/ireland.topo.json')]).then(function (t) {
      var w = t[0], e = t[1], i = t[2];
      W.land = topojson.feature(w, w.objects.land).features;
      W.continents = topojson.feature(w, w.objects.continents).features;
      W.oceans = topojson.feature(w, w.objects.oceans).features;
      W.europe = topojson.feature(e, e.objects.europe).features;
      W.irl = {};
      ['counties', 'provinces', 'countries', 'loughs', 'rivers'].forEach(function (k) { W.irl[k] = topojson.feature(i, i.objects[k]).features; });
      globe = new window.MAW_Globe($('globe'), W, { onTap: onGlobeTap, onRuler: function (r, end) {
        if (!task || task.type !== 'ruler' || task.locked || !r.b) return;
        task.km = Math.round(J.km(r.a, r.b)); $('ruler-read').textContent = S.tasks.rulerLive(task.km); $('task-go').disabled = false;
      } });
      map = new window.MAW_FlatMap($('map'), { onTap: onMapTap, onView: function () { if (task && task.type === 'drag') layoutTiles(task); } });
      if (/[?&]test=1/.test(location.search)) window.MAW_TEST = { show: testShow };
      door();
    });
  }
  /* Test hook for tests/pixels.test.js only (?test=1): jump straight to any screen. */
  function testShow(s) {
    var parts = s.split(':'), what = parts[0], id = parts[1];
    if (!state.name) { state.name = 'Aoife'; save(); }
    stopClock(); run = null; task = null;
    if (what === 'door') door();
    else if (what === 'brief') { state.current = id; briefing(id); }
    else if (what === 'play') { state.current = id; renderHeader(); beginLeg(id); }
    else if (what === 'done') { state.legs[id] = state.legs[id] || { points: 10, time: 60000, max: legById(id).max }; legDone(legById(id), 10, 60000); }
    else if (what === 'passport') passport();
    else if (what === 'finish') finish();
  }
  init();
})();
