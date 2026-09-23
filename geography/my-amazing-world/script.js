/* script.js — My Amazing World: game flow. Front door → Leg briefing → globe play → stamp + Expedition → next leg. Passport any time.
   Judging: judge.js. Strings: strings.js. Facts: data.js. Globe: engine.js. */
(function () {
  'use strict';
  var S = window.MAW_STRINGS, D = window.MAW_DATA, J = window.MAW_JUDGE;
  var KEY = 'maw-v1';
  function $(id) { return document.getElementById(id); }
  var state, layers, globe, prevScreen = 's-door';
  var leg1 = { order: [], i: 0, attempts: 0, points: 0, t0: 0, elapsed: 0, timer: null, locked: false, revealed: false, target: null };

  /* ---------- state ---------- */
  function fresh() { return { v: 1, name: '', points: 0, legs: {}, stamps: [], current: null }; }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: play on without saving */ } }
  function legById(id) { for (var i = 0; i < D.legs.length; i++) if (D.legs[i].id === id) return D.legs[i]; return null; }
  function nextLeg(afterId) { var L = legById(afterId); return D.legs[L.n] || null; }
  function stamped(id) { return state.stamps.indexOf(id) >= 0; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function mmss(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function maxSoFar() { var m = 0; D.legs.forEach(function (l) { if (stamped(l.id)) m += l.max; }); return m; }
  function stampMask() { var m = 0; D.legs.forEach(function (l, i) { if (stamped(l.id)) m |= (1 << i); }); return m; }

  /* ---------- screens ---------- */
  function show(id) {
    var from = document.querySelector('.screen:not([hidden])');
    if (from && from.id !== id) prevScreen = from.id;
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].hidden = all[i].id !== id;
    window.scrollTo(0, 0);
    if (id === 's-play' && globe) globe.resize();
  }
  function setFeedback(el, text, tone) { el.textContent = text || ''; el.className = 'feedback' + (text && tone ? ' ' + tone : ''); }

  function renderHeader() {
    var L = legById(state.current) || D.legs[0];
    $('badge-leg').textContent = S.header.leg(L.n, D.legs.length);
    $('badge-points').textContent = S.header.points(state.points);
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
    $('door-kicker').textContent = S.passport.title; $('door-title').textContent = S.title; $('door-lead').textContent = S.door.lead;
    $('name-label').textContent = S.door.nameLabel; $('name').placeholder = S.door.namePlaceholder; $('name-help').textContent = S.door.nameHelp;
    $('door-start').textContent = S.door.start; $('door-carry').textContent = S.door.carryOn; $('door-restart').textContent = S.door.restart;
    $('restart-warn').textContent = S.door.restartWarn; $('restart-yes').textContent = S.door.restartYes; $('restart-no').textContent = S.door.restartNo;
    $('btn-passport').textContent = S.header.passport; $('pp-kicker').textContent = S.title; $('pp-title').textContent = S.passport.title; $('pp-back').textContent = S.buttons.back;
    $('fact-next').textContent = S.buttons.next; $('exp-kicker').textContent = S.expedition.title; $('exp-opens').textContent = S.expedition.opens; $('exp-then').textContent = S.expedition.then; $('exp-lock').textContent = S.buttons.answer;
    $('later-passport').textContent = S.buttons.passport; $('later-door').textContent = S.buttons.door; $('later-text').textContent = S.later.text;
    $('globe').setAttribute('aria-label', S.aria.globe);
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
    if (!id) { passport(); return; }
    startLeg(id);
  }

  /* ---------- legs ---------- */
  function startLeg(id) {
    state.current = id; save(); renderHeader();
    if (id === 'oceans') briefing(id); else later(id);
  }
  function briefing(id) {
    var L = legById(id);
    $('brief-kicker').textContent = S.title; $('brief-title').textContent = S.legTitle(L); $('brief-text').textContent = S.brief[id];
    $('brief-go').textContent = S.buttons.ready;
    $('brief-go').onclick = function () { if (id === 'oceans') beginOceans(); };
    show('s-brief');
  }
  function later(id) {
    var L = legById(id);
    $('later-title').textContent = S.later.title(L);
    show('s-later');
  }

  /* ---------- Leg 1: Ocean Sprint ---------- */
  function beginOceans() {
    leg1.order = shuffle(D.oceans.slice()); leg1.i = 0; leg1.points = 0; leg1.elapsed = 0; leg1.locked = false;
    show('s-play'); globe.reset(); globe.highlight = null; globe.marker = null;
    nextOcean(); startClock();
  }
  function nextOcean() {
    leg1.attempts = 0; leg1.revealed = false; leg1.locked = false;
    leg1.target = leg1.order[leg1.i];
    $('task').textContent = S.oceans.task(leg1.target.name); $('task-sub').textContent = S.oceans.sub;
    $('play-count').textContent = S.oceans.count(leg1.i + 1, leg1.order.length);
    setFeedback($('feedback'), null); $('fact').hidden = true;
    globe.highlight = null; globe.marker = null; globe.render();
  }
  function startClock() { leg1.t0 = performance.now(); tick(); leg1.timer = setInterval(tick, 250); }
  function pauseClock() { if (leg1.timer) { clearInterval(leg1.timer); leg1.timer = null; leg1.elapsed += performance.now() - leg1.t0; } }
  function tick() { $('clock').textContent = S.oceans.clock(mmss(leg1.elapsed + (performance.now() - leg1.t0))); }

  function onTap(ll) {
    if (state.current !== 'oceans' || leg1.locked || !leg1.target) return;
    var o = leg1.target;
    leg1.attempts++;
    var r = J.judgeOceanTap(layers, o.name, ll, leg1.revealed ? 99 : leg1.attempts);
    globe.marker = { lonlat: ll, text: r.hit.name || '', tone: r.correct ? 'good' : 'bad' };
    if (r.correct) {
      leg1.locked = true; leg1.points += r.points; state.points += r.points; save(); renderHeader();
      globe.highlight = r.feature; globe.render();
      var line = S.oceans.right(o.name, r.points);
      setFeedback($('feedback'), line, r.points ? 'good' : 'info');
      $('fact-kicker').textContent = o.name; $('fact-text').textContent = o.fact; $('fact').hidden = false; $('fact-next').focus();
      return;
    }
    globe.render();
    var h = r.hit, msg;
    if (h.kind === 'land') msg = S.oceans.wrongLand(h.name);
    else if (h.name === 'Caspian Sea') msg = S.oceans.wrongLake;
    else if (h.kind === 'sea') msg = S.oceans.wrongSea(h.name);
    else msg = S.oceans.wrongOcean(h.name);
    if (leg1.attempts === 2) msg += S.oceans.hint(o.hint);
    if (r.reveal && !leg1.revealed) {
      leg1.revealed = true; globe.highlight = r.feature; globe.setZoom(o.zoom || 1); globe.flyTo(o.view, 900);
      setFeedback($('feedback'), S.oceans.reveal(o.name), 'info');
      return;
    }
    setFeedback($('feedback'), leg1.revealed ? S.oceans.revealMiss(msg, o.name) : msg, leg1.revealed ? 'info' : 'bad');
  }

  function afterFact() {
    leg1.i++;
    if (leg1.i < leg1.order.length) { nextOcean(); return; }
    finishOceans();
  }
  function finishOceans() {
    pauseClock();
    var L = legById('oceans');
    state.legs.oceans = { points: leg1.points, time: Math.round(leg1.elapsed), max: L.max };
    if (!stamped('oceans')) state.stamps.push('oceans');
    save(); renderHeader();
    legDone(L, leg1.points, leg1.elapsed);
  }

  /* ---------- leg done: stamp + expedition ---------- */
  function legDone(L, points, elapsedMs) {
    $('done-title').textContent = S.legDone.title(L);
    var st = $('done-stamp'); st.innerHTML = ''; st.textContent = S.legDone.stamp(L);
    var small = document.createElement('small'); small.textContent = mmss(elapsedMs); st.appendChild(small);
    st.classList.remove('stamp-in'); void st.offsetWidth; st.classList.add('stamp-in');
    $('done-time').textContent = S.legDone.time(mmss(elapsedMs));
    var exp = D.expeditions[L.id], next = nextLeg(L.id);
    $('done-next').textContent = next ? S.buttons.nextLeg(next) : S.buttons.passport;
    $('done-next').onclick = function () { if (next) startLeg(next.id); else passport(); };
    if (!exp) { $('expedition').hidden = true; $('done-next').hidden = false; $('done-points').textContent = S.legDone.points(points, L.max); show('s-done'); return; }
    $('expedition').hidden = false; $('done-next').hidden = true;
    $('done-points').textContent = S.legDone.points(points, L.max - exp.points);
    $('exp-text').textContent = exp.text; $('exp-link').textContent = S.expedition.open; $('exp-link').href = exp.url; $('exp-q').textContent = exp.question;
    var box = $('exp-options'); box.innerHTML = ''; var chosen = null;
    shuffle(exp.options.slice()).forEach(function (opt) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'option'; b.textContent = opt; b.setAttribute('aria-pressed', 'false');
      b.onclick = function () { chosen = opt; var all = box.querySelectorAll('.option'); for (var i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', String(all[i] === b)); $('exp-lock').disabled = false; };
      box.appendChild(b);
    });
    setFeedback($('exp-feedback'), null); $('exp-lock').disabled = true; $('exp-lock').hidden = false;
    $('exp-lock').onclick = function () {
      if (!chosen) return;
      var r = J.judgeChoice(exp.answer, chosen, exp.points);
      var all = box.querySelectorAll('.option');
      for (var i = 0; i < all.length; i++) { all[i].disabled = true; if (all[i].textContent === exp.answer) all[i].classList.add('right'); else if (all[i].textContent === chosen && !r.correct) all[i].classList.add('wrong'); }
      state.points += r.points; state.legs[L.id].points += r.points; save(); renderHeader();
      setFeedback($('exp-feedback'), r.correct ? S.expedition.right(r.points) : S.expedition.wrong(exp.answer, exp.why), r.correct ? 'good' : 'bad');
      $('done-points').textContent = S.legDone.points(state.legs[L.id].points, L.max);
      $('exp-lock').hidden = true; $('done-next').hidden = false; $('done-next').focus();
    };
    show('s-done');
  }

  /* ---------- passport ---------- */
  function passport() {
    $('pp-explorer').textContent = S.passport.explorer(state.name || '—');
    $('pp-points').textContent = S.passport.points(state.points);
    $('pp-rank').textContent = S.passport.rank(J.rank(state.points, maxSoFar(), D.ranks).name);
    var box = $('pp-stamps'); box.innerHTML = '';
    D.legs.forEach(function (l) {
      var s = document.createElement('div'); s.className = 'slot' + (stamped(l.id) ? ' done' : state.current === l.id ? ' now' : '');
      if (stamped(l.id)) { s.textContent = l.stamp; var sm = document.createElement('small'); sm.textContent = state.legs[l.id].points + ' pts · ' + mmss(state.legs[l.id].time); s.appendChild(sm); }
      else { s.textContent = l.n + ' ' + l.title; var sm2 = document.createElement('small'); sm2.textContent = state.current === l.id ? S.passport.now : S.passport.empty; s.appendChild(sm2); }
      box.appendChild(s);
    });
    $('pp-token').textContent = state.stamps.length === D.legs.length ? S.passport.token(J.scoreToken(state.name, state.points, stampMask())) : S.passport.tokenLater;
    if (leg1.timer) pauseClock();
    show('s-passport');
  }
  function backFromPassport() {
    var to = prevScreen === 's-passport' ? 's-door' : prevScreen;
    if (to === 's-play' && state.current === 'oceans' && leg1.target && !leg1.timer) { show('s-play'); leg1.t0 = performance.now(); leg1.timer = setInterval(tick, 250); return; }
    if (to === 's-door') { door(); return; }
    show(to);
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
    $('restart-yes').onclick = function () { state = fresh(); save(); leg1.target = null; pauseClock(); renderHeader(); door(); };
    $('btn-passport').onclick = passport;
    $('pp-back').onclick = backFromPassport;
    $('fact-next').onclick = afterFact;
    $('later-passport').onclick = passport;
    $('later-door').onclick = door;
  }

  function init() {
    fillStatic(); wire();
    state = load() || fresh();
    renderHeader();
    fetch('data/world.topo.json').then(function (r) { return r.json(); }).then(function (topo) {
      layers = {
        land: topojson.feature(topo, topo.objects.land).features,
        continents: topojson.feature(topo, topo.objects.continents).features,
        oceans: topojson.feature(topo, topo.objects.oceans).features
      };
      globe = new window.MAW_Globe($('globe'), layers, { onTap: onTap });
      door();
    });
  }
  init();
})();
