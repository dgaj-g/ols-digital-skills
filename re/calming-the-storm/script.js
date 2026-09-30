/* ============================================================
   Calming the Storm — the game
   ------------------------------------------------------------
   Wires the page together. It holds no words of its own (they
   are all in content.js) and makes no judgement of its own
   (every decision about the order is made in judge.js).

   The page never says which part belongs where: a card carries
   a random token, never its place in the story, and the story
   is only written out in order after the game has been won.
   ============================================================ */
(function () {
  'use strict';

  var C = window.STORM_CONTENT, S = C.STRINGS, PARTS = C.PARTS;
  var J = window.StormJudge, Scene = window.StormScene, Sound = window.StormSound;
  var KEY = 'ols-re-calming-the-storm-v1';
  var N = J.PARTS;
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fill(str, map) {
    return str.replace(/\{(\w+)\}/g, function (m, k) { return map && map[k] !== undefined ? map[k] : m; });
  }

  var el = {
    body: document.body, title: $('title'), play: $('play'), finale: $('finale'), result: $('result'),
    tLead: $('t-lead'), tNote: $('t-note'), begin: $('btn-begin'), fresh: $('btn-fresh'), harderT: $('btn-harder-t'), tAbout: $('t-harder-about'),
    swSoundT: $('sw-sound-t'), swFlashT: $('sw-flash-t'), swSound: $('sw-sound'), swFlash: $('sw-flash'), restart: $('btn-restart'),
    lamps: $('lamps'), lampcap: $('lampcap'), status: $('status'), keyhelp: $('keyhelp'),
    list: $('list'), checks: $('checks'), check: $('btn-check'),
    confirm: $('confirm'), confirmQ: $('confirm-q'), confirmNo: $('btn-confirm-no'), confirmYes: $('btn-confirm-yes'), confirmFirst: $('btn-confirm-first'),
    quote: $('quote'), skip: $('btn-skip'),
    rH: $('r-h'), rLine: $('r-line'), rBest: $('r-best'), read: $('btn-read'), again: $('btn-again'), other: $('btn-other'), rAbout: $('r-harder-about'),
    story: $('story'), storyH: $('story-h'), storyBody: $('story-body'), close: $('btn-close'),
    announce: $('announce')
  };
  var SCREENS = ['title', 'play', 'finale', 'result'];

  /* ---------- what is kept on this device ---------- */
  function blank() { return { v: 1, sound: true, flashes: true, best: { first: null, harder: null }, doneFirst: false, game: null }; }
  function validGame(g) {
    if (!g || (g.mode !== 'first' && g.mode !== 'harder')) return false;
    if (!J.isOrder(g.order)) return false;
    if (!Array.isArray(g.locked) || g.locked.length !== N) return false;
    for (var p = 0; p < N; p++) if (g.locked[p] && g.order[p] !== p) return false;
    if (typeof g.checks !== 'number' || g.checks < 0 || g.checks !== Math.floor(g.checks)) return false;
    if (g.lastChecked !== null && !J.isOrder(g.lastChecked)) return false;
    if (J.check(g.order).complete) return false;
    return true;
  }
  function load() {
    var d = blank();
    try {
      var raw = JSON.parse(window.localStorage.getItem(KEY) || 'null');
      if (raw && raw.v === 1) {
        d.sound = raw.sound !== false;
        d.flashes = raw.flashes !== false;
        d.doneFirst = raw.doneFirst === true;
        if (raw.best) { d.best.first = J.betterResult(null, raw.best.first); d.best.harder = J.betterResult(null, raw.best.harder); }
        if (validGame(raw.game)) {
          d.game = { mode: raw.game.mode, order: raw.game.order.slice(), locked: raw.game.locked.map(Boolean), checks: raw.game.checks,
            lastChecked: raw.game.lastChecked ? raw.game.lastChecked.slice() : null, lastCount: typeof raw.game.lastCount === 'number' ? raw.game.lastCount : null };
        }
      }
    } catch (e) { /* a private window, or storage switched off: play without keeping anything */ }
    return d;
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* as above */ } }

  var store = load();
  var game = null;          /* the game being played: store.game while it lasts */
  var done = null;          /* { mode, checks } of the game just finished */
  var cards = [];           /* one per part, index = the part; never written to the page */
  var measurer = null, statusMeasure = null;
  var pitch = 60;
  var drag = null, busy = false, screen = 'title';
  var finTimers = [], playTimers = [];

  function later(list, ms, fn) { var t = window.setTimeout(fn, ms); list.push(t); return t; }
  function clearTimers(list) { while (list.length) window.clearTimeout(list.pop()); }

  /* ---------- small helpers for the page ---------- */
  function say(text) {
    el.announce.textContent = '';
    window.setTimeout(function () { el.announce.textContent = text; }, 40);
  }
  function setStatus(text, beat) {
    el.status.textContent = text;
    el.status.classList.remove('beat');
    if (beat) { void el.status.offsetWidth; el.status.classList.add('beat'); }
  }
  function lockedCount() { var n = 0; for (var p = 0; p < N; p++) if (game.locked[p]) n++; return n; }
  function shownCount() { return game.mode === 'first' ? lockedCount() : (game.lastCount || 0); }
  function paintLamps(n) {
    var kids = el.lamps.children;
    for (var i = 0; i < kids.length; i++) kids[i].classList.toggle('on', i < n);
  }
  function paintMeter() {
    el.checks.textContent = fill(S.checks, { n: game.checks });
    paintLamps(shownCount());
    el.lampcap.textContent = game.checks === 0 ? S.lampStart : fill(S.lampCaption, { n: game.lastCount || 0 });
  }
  function statusForLastCheck() {
    var n = game.lastCount || 0;
    if (game.checks === 0) return game.mode === 'first' ? S.instruct : S.instructHarder;
    if (game.mode === 'first') return n === 0 ? S.firstNone : n === 1 ? S.firstOne : fill(S.firstSome, { n: n });
    return n === 0 ? S.harderNone : n === 1 ? S.harderOne : fill(S.harderSome, { n: n });
  }
  function paintSwitches() {
    var s = store.sound ? S.soundOn : S.soundOff, f = store.flashes ? S.flashesOn : S.flashesOff;
    el.swSoundT.textContent = s; el.swSoundT.setAttribute('aria-pressed', String(store.sound));
    el.swFlashT.textContent = f; el.swFlashT.setAttribute('aria-pressed', String(store.flashes));
    el.swSound.querySelector('.tool-text').textContent = s; el.swSound.setAttribute('aria-pressed', String(store.sound));
    el.swFlash.querySelector('.tool-text').textContent = f; el.swFlash.setAttribute('aria-pressed', String(store.flashes));
  }

  /* ---------- screens ---------- */
  function restage(now) {
    var rect;
    if (screen === 'finale') rect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, moon: 0.085 };
    else {
      var win = el[screen].querySelector('[data-stage]');
      var r = win.getBoundingClientRect();
      rect = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    if (rect.width > 0 && rect.height > 0) Scene.setStage(rect, !!now);
  }
  function show(name, now) {
    screen = name;
    for (var i = 0; i < SCREENS.length; i++) {
      el[SCREENS[i]].hidden = SCREENS[i] !== name;
      el[SCREENS[i]].classList.remove('fading');
    }
    el.body.setAttribute('data-screen', name);
    restage(now);
  }

  /* ---------- the opening screen ---------- */
  function bestLines() {
    var lines = [];
    if (store.best.first) lines.push(fill(S.bestFirst, { n: store.best.first }));
    if (store.best.harder) lines.push(fill(S.bestHarder, { n: store.best.harder }));
    return lines;
  }
  function paintTitle() {
    var g = store.game;
    el.tLead.textContent = S.intro;
    el.begin.textContent = g ? S.carryOn : S.begin;
    el.fresh.textContent = S.startAgain;
    el.fresh.hidden = !g;
    var lines = g ? [S.inProgress] : bestLines();
    el.tNote.textContent = '';
    for (var i = 0; i < lines.length; i++) {
      if (i) el.tNote.appendChild(document.createElement('br'));
      el.tNote.appendChild(document.createTextNode(lines[i]));
    }
    el.tNote.hidden = lines.length === 0;
    var inHarder = !!g && g.mode === 'harder';
    el.harderT.hidden = !store.doneFirst;
    el.harderT.textContent = inHarder ? S.backToFirst : S.harder;
    el.tAbout.textContent = S.harderAbout;
    el.tAbout.hidden = !store.doneFirst || inHarder;
  }

  /* ---------- the seven cards ---------- */
  var TICK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.6l3.2 3.2L13 4.6"/></svg>';
  var CROSS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  function token() { return Math.random().toString(36).slice(2, 10); }
  function posOf(part) { return game.order.indexOf(part); }
  function setPos(card, p) { card.el.style.transform = 'translate3d(0,' + (p * pitch) + 'px,0)'; }
  function layout(order, skip) {
    for (var p = 0; p < N; p++) { var c = cards[order[p]]; if (c !== skip) setPos(c, p); }
  }
  function paintCard(card, p) {
    var locked = !!game.locked[p];
    card.el.classList.toggle('is-locked', locked);
    card.el.classList.toggle('is-wrong', !locked && card.wrong);
    card.mark.innerHTML = locked ? TICK : (card.wrong ? CROSS : '');
    var label = fill(S.cardLabel, { p: p + 1, text: PARTS[card.part] });
    if (locked) label += ' ' + S.cardLocked; else if (card.wrong) label += ' ' + S.cardWrong;
    card.el.setAttribute('aria-label', label);
  }
  function paintCards() { for (var p = 0; p < N; p++) paintCard(cards[game.order[p]], p); }
  function syncDom() {
    if (drag) return;
    var focused = document.activeElement, moved = false;
    for (var p = 0; p < N; p++) {
      var want = cards[game.order[p]].el;
      if (el.list.children[p] !== want) { el.list.insertBefore(want, el.list.children[p] || measurer); moved = true; }
    }
    if (moved && focused && focused !== document.activeElement && el.list.contains(focused)) {
      try { focused.focus({ preventScroll: true }); } catch (e) { focused.focus(); }
    }
  }
  function once(node, cls) {
    node.classList.remove('deal', 'shake', 'pop', 'beat');
    void node.offsetWidth;
    node.classList.add(cls);
  }
  function buildCards(deal) {
    var i;
    for (i = 0; i < cards.length; i++) if (cards[i].el.parentNode) cards[i].el.parentNode.removeChild(cards[i].el);
    cards = [];
    el.list.classList.add('no-anim');
    for (var part = 0; part < N; part++) cards.push(makeCard(part));
    for (var p = 0; p < N; p++) {
      var c = cards[game.order[p]];
      c.face.style.setProperty('--i', p);
      if (deal && !reduced) c.face.classList.add('deal');
      el.list.insertBefore(c.el, measurer);
    }
  }
  function makeCard(part) {
    var li = document.createElement('li');
    li.className = 'card'; li.tabIndex = 0; li.setAttribute('data-k', token());
    var face = document.createElement('div'); face.className = 'card-face';
    var grip = document.createElement('span'); grip.className = 'grip'; grip.setAttribute('aria-hidden', 'true');
    var text = document.createElement('span'); text.className = 'card-text'; text.textContent = PARTS[part];
    var mark = document.createElement('span'); mark.className = 'mark'; mark.setAttribute('aria-hidden', 'true');
    face.appendChild(grip); face.appendChild(text); face.appendChild(mark); li.appendChild(face);
    var card = { el: li, face: face, mark: mark, part: part, wrong: false };
    li.addEventListener('pointerdown', function (e) { onDown(e, card); });
    li.addEventListener('keydown', function (e) { onKey(e, card); });
    li.addEventListener('dragstart', function (e) { e.preventDefault(); });
    face.addEventListener('animationend', function () { face.classList.remove('deal', 'shake', 'pop', 'beat'); });
    return card;
  }

  /* ---------- fitting the game to the screen (no scrolling while you play) ---------- */
  function ensureMeasurers() {
    if (!measurer) {
      measurer = document.createElement('li');
      measurer.className = 'card measuring'; measurer.setAttribute('aria-hidden', 'true');
      measurer.innerHTML = '<div class="card-face"><span class="grip"></span><span class="card-text"></span><span class="mark"></span></div>';
      el.list.appendChild(measurer);
    }
    if (!statusMeasure) {
      statusMeasure = document.createElement('p');
      statusMeasure.className = 'status measure'; statusMeasure.setAttribute('aria-hidden', 'true');
      el.status.parentNode.appendChild(statusMeasure);
    }
  }
  function tallest(fs) {
    var text = measurer.querySelector('.card-text'), face = measurer.firstChild, h = 0;
    face.style.fontSize = fs + 'px';
    for (var i = 0; i < N; i++) { text.textContent = PARTS[i]; h = Math.max(h, face.offsetHeight); }
    text.textContent = '';
    return h;
  }
  function fit() {
    if (screen !== 'play' || !game) return;
    ensureMeasurers();
    var W = window.innerWidth, H = window.innerHeight;
    var wide = window.getComputedStyle(el.play).getPropertyValue('--wide').trim() === '1';
    el.play.classList.remove('play-scroll');

    /* keep room for the longest line the status can ever show, so nothing jumps */
    var lines = game.mode === 'first'
      ? [S.instruct, S.notMoved, S.firstNone, S.firstOne, fill(S.firstSome, { n: 6 })]
      : [S.instructHarder, S.notMoved, S.harderNone, S.harderOne, fill(S.harderSome, { n: 6 })];
    el.status.style.minHeight = '';
    var cs = window.getComputedStyle(el.status.parentNode);
    statusMeasure.style.left = cs.paddingLeft; statusMeasure.style.width = el.status.clientWidth + 'px';
    var sh = 0;
    for (var i = 0; i < lines.length; i++) { statusMeasure.textContent = lines[i]; sh = Math.max(sh, statusMeasure.offsetHeight); }
    statusMeasure.textContent = '';
    el.status.style.minHeight = sh + 'px';

    var gap = wide ? (H >= 900 ? 12 : H >= 700 ? 9 : 6) : (W >= 600 ? 8 : 5);
    var avail, main = el.list.parentNode, bar = el.check.parentNode;
    if (wide) {
      var ms = window.getComputedStyle(main);
      avail = main.clientHeight - parseFloat(ms.paddingTop) - parseFloat(ms.paddingBottom) - bar.offsetHeight;
    } else {
      var win = el.play.querySelector('[data-stage]');
      var stripMin = parseFloat(window.getComputedStyle(win).minHeight) || 46;
      avail = H - stripMin - el.status.parentNode.offsetHeight - bar.offsetHeight;
    }
    var rowAvail = Math.floor((avail - (N - 1) * gap) / N);
    var rowMax = wide ? 136 : (W >= 600 ? 118 : 104);
    var cap = Math.min(rowAvail, rowMax);
    var fsMax = wide ? (W >= 1600 ? 27 : W >= 1200 ? 21 : 18) : (W >= 600 ? 19 : 15.5), fsMin = 11.5;
    var lo = 0, hi = Math.round((fsMax - fsMin) * 2), best = -1;
    while (lo <= hi) {           /* the largest type whose longest part still fits its row */
      var mid = (lo + hi) >> 1;
      if (tallest(fsMin + mid / 2) <= cap) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    var fs = fsMin + Math.max(0, best) / 2, need = tallest(fs), row;
    if (best < 0) { row = need; el.play.classList.add('play-scroll'); }   /* a very small screen: the page scrolls instead */
    else row = Math.min(cap, need + (wide ? 16 : W >= 600 ? 12 : 4));
    pitch = row + gap;
    el.list.style.setProperty('--row', row + 'px');
    el.list.style.setProperty('--fs', fs + 'px');
    el.list.style.height = (N * row + (N - 1) * gap) + 'px';
    el.list.classList.add('no-anim');
    layout(game.order);
    void el.list.offsetWidth;
    el.list.classList.remove('no-anim');
    restage();
  }

  /* ---------- moving a part ---------- */
  function afterMove() {
    for (var i = 0; i < N; i++) cards[i].wrong = false;
    paintCards();
    save();
  }
  function stopBeat() { for (var i = 0; i < cards.length; i++) cards[i].face.classList.remove('beat'); }
  function onDown(e, card) {
    if (drag || busy || !game || !el.confirm.hidden) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.isPrimary === false) return;
    var p = posOf(card.part);
    if (game.locked[p]) return;
    drag = { card: card, id: e.pointerId, from: p, to: p, x0: e.clientX, y0: e.clientY, start: game.order.slice(), prov: game.order.slice(), live: false, slop: e.pointerType === 'mouse' ? 5 : 3 };
    try { card.el.setPointerCapture(e.pointerId); } catch (err) { /* older browsers: the document listeners still follow the pointer */ }
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.live) {
      if (Math.abs(dx) + Math.abs(dy) < drag.slop) return;
      drag.live = true;
      stopBeat();
      drag.card.el.classList.add('dragging');
      el.body.classList.add('dragging-active');
      Sound.pick();
    }
    if (e.cancelable) e.preventDefault();
    var y = clamp(drag.from * pitch + dy, -0.45 * pitch, (N - 1 + 0.45) * pitch);
    var x = clamp(dx * 0.25, -22, 22);
    drag.card.el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    var to = J.nearestFree(game.locked, Math.round(y / pitch));
    if (to >= 0 && to !== drag.to) {
      drag.to = to;
      drag.prov = J.move(drag.start, game.locked, drag.from, to);
      layout(drag.prov, drag.card);
    }
  }
  function endDrag(commit) {
    var d = drag;
    if (!d) return;
    drag = null;
    try { d.card.el.releasePointerCapture(d.id); } catch (err) { /* already released */ }
    if (!d.live) return;
    d.card.el.classList.remove('dragging');
    el.body.classList.remove('dragging-active');
    if (commit && !J.sameOrder(d.prov, d.start)) { game.order = d.prov; afterMove(); }
    Sound.drop();
    layout(game.order);
    window.setTimeout(syncDom, 230);
  }
  function onUp(e) { if (drag && e.pointerId === drag.id) endDrag(true); }
  function onCancel(e) { if (drag && e.pointerId === drag.id) endDrag(false); }
  function onKey(e, card) {
    if (busy || drag || !game || !el.confirm.hidden) return;
    var dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    var p = posOf(card.part);
    if (game.locked[p]) { say(S.cannotMove); return; }
    var to = J.stepFree(game.locked, p, dir);
    if (to < 0) return;
    stopBeat();
    game.order = J.move(game.order, game.locked, p, to);
    afterMove();
    layout(game.order);
    syncDom();
    try { card.el.focus({ preventScroll: true }); } catch (err) { card.el.focus(); }
    Sound.drop();
    say(fill(S.movedTo, { p: to + 1 }));
  }

  /* ---------- Check my order ---------- */
  function setStorm(n, seconds) {
    var v = J.stormFor(n);
    Scene.setStorm(v, seconds); Sound.setStorm(v, seconds);
  }
  function thunderclap() { Scene.strike(false); Scene.gust(); Sound.wrong(); }
  function onCheck() {
    if (busy || drag || !game) return;
    if (game.lastChecked && J.sameOrder(game.lastChecked, game.order)) { setStatus(S.notMoved, true); return; }
    stopBeat();
    var res = J.check(game.order), before = game.lastCount, p, i;
    game.checks++;
    game.lastChecked = game.order.slice();
    game.lastCount = res.count;
    el.checks.textContent = fill(S.checks, { n: game.checks });
    if (res.complete) { startFinale(); return; }

    if (game.mode === 'first') {
      var had = lockedCount(), fresh = [];
      for (p = 0; p < N; p++) {
        var c = cards[game.order[p]];
        if (res.right[p]) { c.wrong = false; if (!game.locked[p]) { game.locked[p] = true; fresh.push(c); } }
        else c.wrong = true;
      }
      paintCards();
      for (p = 0; p < N; p++) if (!res.right[p]) once(cards[game.order[p]].face, 'shake');
      for (i = 0; i < fresh.length; i++) {
        (function (card, k) {
          later(playTimers, 120 + k * 150, function () { once(card.face, 'pop'); });
          Sound.chime(had + k, 0.12 + k * 0.15);
        })(fresh[i], i);
      }
      if (fresh.length === 0) thunderclap();
    } else {
      if (res.count > (before || 0)) Sound.chime(Math.max(0, res.count - 1), 0.05);
      else thunderclap();
    }
    paintMeter();
    setStatus(statusForLastCheck(), true);
    setStorm(shownCount(), 1.8);
    save();
  }

  /* ---------- starting, carrying on, starting again ---------- */
  function enterPlay(mode, fresh) {
    clearTimers(playTimers); clearTimers(finTimers);
    Sound.start(); Sound.stopCalm();
    if (fresh || !store.game) {
      store.game = { mode: mode, order: J.shuffle(), locked: [false, false, false, false, false, false, false], checks: 0, lastChecked: null, lastCount: null };
    }
    game = store.game; done = null; busy = false; drag = null;
    save();
    el.confirm.hidden = true;
    el.story.hidden = true; document.body.removeAttribute('data-sheet'); el.storyBody.textContent = '';
    el.quote.className = 'quote'; el.quote.textContent = '';
    ensureMeasurers();
    show('play');
    buildCards(true);
    paintCards();
    paintMeter();
    setStatus(statusForLastCheck(), false);
    el.confirmFirst.hidden = game.mode !== 'harder';
    fit();
    Scene.setMood('storm', 2.6);
    setStorm(shownCount(), 2.6);
    Scene.setAuto(true);
    later(playTimers, 1500, function () { Scene.strike(false); });
    if (game.checks === 0 && !reduced) {
      later(playTimers, 1500, function () {       /* the one nudge: the top part dips, once, to show it moves */
        if (!drag && game && game.checks === 0) once(cards[game.order[0]].face, 'beat');
      });
    }
    try { cards[game.order[0]].el.focus({ preventScroll: true }); } catch (e) { /* no focus is no harm */ }
  }

  /* ---------- the calm ---------- */
  function startFinale() {
    busy = true;
    clearTimers(playTimers);
    done = { mode: game.mode, checks: game.checks };
    store.best[done.mode] = J.betterResult(store.best[done.mode], done.checks);
    if (done.mode === 'first') store.doneFirst = true;
    store.game = null;
    save();
    setStatus(S.resultHead, false);
    el.lampcap.textContent = fill(S.lampCaption, { n: N });      /* the caption must agree with the lamps as they light */
    var order = game.order.slice();
    for (var p = 0; p < N; p++) {
      (function (pos) {
        later(finTimers, pos * 130, function () {
          var c = cards[order[pos]];
          game.locked[pos] = true; c.wrong = false;
          paintCard(c, pos); once(c.face, 'pop'); paintLamps(pos + 1);
        });
        Sound.chime(pos, pos * 0.13);
      })(p);
    }
    var t = N * 130 + 700;
    later(finTimers, t, function () { el.play.classList.add('fading'); });
    later(finTimers, t + 480, function () {
      show('finale');
      el.quote.className = 'quote'; el.quote.textContent = '';
      Scene.setAuto(false);
      Scene.strike(true);
      try { el.skip.focus({ preventScroll: true }); } catch (e) { /* fine */ }
    });
    later(finTimers, t + 1180, function () { el.quote.textContent = S.quote1; el.quote.className = 'quote q1 on'; });
    later(finTimers, t + 2000, function () { stillTheStorm(3.6, 4.6); });
    later(finTimers, t + 4400, function () { el.quote.classList.remove('on'); });
    later(finTimers, t + 5200, function () { el.quote.textContent = S.quote2; el.quote.className = 'quote q2 on'; Sound.calm(); });
    later(finTimers, t + 10800, function () { el.quote.classList.remove('on'); });
    later(finTimers, t + 11600, showResult);
  }
  function stillTheStorm(a, b) {
    Sound.hush(a); Scene.setStorm(0, a); Scene.setMood('calm', b); Scene.setAuto(false);
  }
  function skipFinale() {
    clearTimers(finTimers);
    stillTheStorm(1.0, 1.4);
    Sound.calm();
    showResult();
  }
  function showResult() {
    clearTimers(finTimers);
    busy = false; game = null;
    var harder = done.mode === 'harder', firstGo = done.checks === 1;
    el.rH.textContent = S.resultHead;
    el.rLine.textContent = harder
      ? (firstGo ? S.resultHarderFirst : fill(S.resultHarderMany, { n: done.checks }))
      : (firstGo ? S.resultFirst : fill(S.resultMany, { n: done.checks }));
    el.rBest.textContent = fill(harder ? S.bestHarder : S.bestFirst, { n: store.best[done.mode] });
    el.read.textContent = S.readStory;
    el.again.textContent = S.playAgain;
    el.other.textContent = harder ? S.backToFirst : S.harder;
    el.rAbout.textContent = S.harderAbout;
    el.rAbout.hidden = harder;
    show('result');
    try { el.rH.focus({ preventScroll: true }); } catch (e) { el.rH.focus(); }
  }

  /* ---------- the story in order (only after it has been put in order) ---------- */
  function openStory() {
    el.storyH.textContent = S.fullTitle;
    el.storyBody.textContent = '';
    for (var i = 0; i < N; i++) { var p = document.createElement('p'); p.textContent = PARTS[i]; el.storyBody.appendChild(p); }
    el.close.textContent = S.close;
    el.story.hidden = false;
    document.body.setAttribute('data-sheet', 'open');     /* the footer steps aside while the story is open */
    el.storyBody.scrollTop = 0;
    storyMore();
    el.close.focus();
  }
  /* is there more of the story below the edge of the sheet? */
  function storyMore() { var b = el.storyBody; b.classList.toggle('more', b.scrollHeight - b.scrollTop - b.clientHeight > 6); }
  function closeStory() { el.story.hidden = true; document.body.removeAttribute('data-sheet'); el.storyBody.textContent = ''; el.read.focus(); }

  /* ---------- start again? ---------- */
  function openConfirm() {
    if (busy || drag || !game) return;
    el.confirm.hidden = false;
    el.confirmNo.focus();
  }
  function closeConfirm() { el.confirm.hidden = true; el.restart.focus(); }
  function trap(box, e) {
    if (e.key !== 'Tab') return;
    var f = box.querySelectorAll('button:not([hidden])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- wiring ---------- */
  function toggleSound() { store.sound = !store.sound; Sound.setMuted(!store.sound); paintSwitches(); save(); }
  function toggleFlashes() { store.flashes = !store.flashes; Scene.setFlashes(store.flashes); paintSwitches(); save(); }

  function init() {
    var i, nodes = document.querySelectorAll('[data-s]');
    for (i = 0; i < nodes.length; i++) nodes[i].textContent = S[nodes[i].getAttribute('data-s')];
    el.list.setAttribute('aria-label', S.listLabel);
    el.check.textContent = S.check;
    el.keyhelp.textContent = S.keyboardHelp;
    el.restart.querySelector('.tool-text').textContent = S.startAgain;
    el.confirmQ.textContent = S.confirmAsk; el.confirmNo.textContent = S.confirmNo; el.confirmYes.textContent = S.confirmYes; el.confirmFirst.textContent = S.backToFirst;
    el.skip.textContent = S.skip;
    for (i = 0; i < N; i++) { var lamp = document.createElement('span'); lamp.className = 'lamp'; el.lamps.appendChild(lamp); }
    if (reduced) { el.swFlashT.hidden = true; el.swFlash.hidden = true; }

    Scene.init($('scene'), { reduced: reduced });
    Scene.setFlashes(store.flashes);
    Scene.onStrike = function (big) { Sound.thunder(big); };
    Scene.setMood('dusk', 0.01);
    Scene.setStorm(0.12, 0.01);
    Sound.setMuted(!store.sound);
    paintSwitches();
    paintTitle();
    show('title', true);
    Scene.start();

    el.begin.addEventListener('click', function () { enterPlay(store.game ? store.game.mode : 'first', false); });
    el.fresh.addEventListener('click', function () { enterPlay(store.game ? store.game.mode : 'first', true); });
    el.harderT.addEventListener('click', function () { enterPlay(store.game && store.game.mode === 'harder' ? 'first' : 'harder', true); });
    el.swSoundT.addEventListener('click', toggleSound); el.swSound.addEventListener('click', toggleSound);
    el.swFlashT.addEventListener('click', toggleFlashes); el.swFlash.addEventListener('click', toggleFlashes);
    el.check.addEventListener('click', onCheck);
    el.restart.addEventListener('click', openConfirm);
    el.confirmNo.addEventListener('click', closeConfirm);
    el.confirmYes.addEventListener('click', function () { enterPlay(game.mode, true); });
    el.confirmFirst.addEventListener('click', function () { enterPlay('first', true); });
    el.confirm.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeConfirm(); else trap(el.confirm, e); });
    el.skip.addEventListener('click', skipFinale);
    el.read.addEventListener('click', openStory);
    el.close.addEventListener('click', closeStory);
    el.story.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeStory(); else trap(el.story, e); });
    el.again.addEventListener('click', function () { enterPlay(done.mode, true); });
    el.other.addEventListener('click', function () { enterPlay(done.mode === 'harder' ? 'first' : 'harder', true); });

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', function () { endDrag(false); });
    document.addEventListener('selectstart', function (e) { if (drag) e.preventDefault(); });
    el.list.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var rz = 0;
    function resized() { window.clearTimeout(rz); rz = window.setTimeout(function () { endDrag(false); if (screen === 'play') fit(); else restage(); }, 120); }
    window.addEventListener('resize', resized);
    window.addEventListener('resize', function () { if (!el.story.hidden) storyMore(); });
    el.storyBody.addEventListener('scroll', storyMore, { passive: true });
    window.addEventListener('orientationchange', resized);
    el.title.addEventListener('scroll', function () { if (screen === 'title') restage(true); }, { passive: true });
    el.result.addEventListener('scroll', function () { if (screen === 'result') restage(true); }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (screen === 'play') fit(); else restage(true); });
  }

  init();
})();
