/* ============================================================================
   Fluency Sprints — game engine
   Match each term to its PRECISE definition by dragging a glowing wire.
   Three escalating sprints per run; distractors hide among the answers.
   ========================================================================== */
(function () {
  'use strict';

  var DATA = window.FLUENCY_DATA;

  /* ---------------------------------------------------------------- state */
  var state = {
    set: null,            // current data set
    sprintIdx: 0,         // 0..2
    terms: [],            // [{id, term, item, correctCid, pictogramId}]
    cards: [],            // [{cid, text, kind:'correct'|'distractor', termId, reason}]
    connections: new Map(), // termId -> defCid
    dragPrevDef: null,
    drag: null,           // active drag bookkeeping
    selected: null,       // termId selected for click-to-connect
    boardRect: null,
    timer: { start: 0, raf: 0, elapsed: 0, running: false },
    clockState: 'calm',
    tickTimer: 0,
    scrollRaf: 0,
    graded: false,
    runTime: 0            // cumulative across sprints in a run
  };

  /* ------------------------------------------------------------- elements */
  var $ = function (id) { return document.getElementById(id); };
  var screenHub = $('screen-hub'), screenGame = $('screen-game');
  var hubGrid = $('hub-grid'), hubCoach = $('hub-coach');
  var leftItems = $('left-items'), rightItems = $('right-items'), leftHead = $('left-head');
  var board = $('board'), wireLayer = $('wire-layer');
  var checkBtn = $('check-btn'), respondHint = $('respond-hint');
  var clockWrap = $('clock-wrap'), clockChar = $('clock-char'), timerEl = $('timer');
  var sprintPill = $('sprint-pill'), gameSetName = $('game-set-name');
  var trackRunner = $('track-runner');
  var resultsOverlay = $('results-overlay'), resBody = $('res-body'), resActions = $('res-actions');
  var resScore = $('res-score'), resTime = $('res-time'), resStars = $('res-stars'), resTitle = $('res-title');
  var liveRegion = $('live-region'), muteBtn = $('mute-btn');
  var confettiCanvas = $('confetti');

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* =====================================================================
     AUDIO ENGINE  (procedural Web Audio — no external files)
     ===================================================================== */
  var audio = {
    ctx: null, muted: false,
    init: function () {
      if (this.ctx || this.muted) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    },
    tone: function (freq, dur, type, gain, whenOff) {
      if (!this.ctx || this.muted) return;
      var t = this.ctx.currentTime + (whenOff || 0);
      var o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise: function (dur, gain) {
      if (!this.ctx || this.muted) return;
      var n = Math.floor(this.ctx.sampleRate * dur);
      var buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      var src = this.ctx.createBufferSource(); src.buffer = buf;
      var g = this.ctx.createGain(); g.gain.value = gain || 0.18;
      var f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400;
      src.connect(f); f.connect(g); g.connect(this.ctx.destination); src.start();
    },
    tick: function (vol) { this.tone(1650, 0.035, 'square', vol || 0.05); },
    connect: function () { this.tone(540, 0.08, 'triangle', 0.14); this.tone(820, 0.10, 'sine', 0.12, 0.05); },
    snip: function () { this.noise(0.09, 0.16); this.tone(300, 0.05, 'square', 0.08); },
    wrong: function () { this.tone(150, 0.28, 'sawtooth', 0.16); this.tone(120, 0.30, 'sawtooth', 0.12, 0.02); },
    correctPing: function () { this.tone(740, 0.10, 'sine', 0.12); this.tone(990, 0.12, 'sine', 0.10, 0.07); },
    alarm: function () { this.tone(880, 0.12, 'square', 0.10); this.tone(660, 0.12, 'square', 0.10, 0.14); },
    fanfare: function () {
      var n = [523, 659, 784, 1047], i;
      for (i = 0; i < n.length; i++) this.tone(n[i], 0.34, 'triangle', 0.14, i * 0.11);
      this.tone(1568, 0.5, 'sine', 0.10, 0.45);
    },
    thump: function () { this.tone(70, 0.18, 'sine', 0.18); }
  };

  /* =====================================================================
     UTILITIES
     ===================================================================== */
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function fmtTime(ms) {
    var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }
  var cidSeq = 0;
  function newCid() { return 'c' + (cidSeq++) + '-' + Math.floor(Math.random() * 1e6).toString(36); }
  function announce(msg) { liveRegion.textContent = ''; setTimeout(function () { liveRegion.textContent = msg; }, 30); }

  /* =====================================================================
     LOCAL BEST SCORES
     ===================================================================== */
  function bestKey(setId) { return 'ols-fluency-best-' + setId; }
  function getBest(setId) {
    try { return JSON.parse(localStorage.getItem(bestKey(setId))); } catch (e) { return null; }
  }
  function saveBest(setId, timeMs) {
    var b = getBest(setId);
    if (!b || timeMs < b.time) {
      try { localStorage.setItem(bestKey(setId), JSON.stringify({ time: timeMs })); } catch (e) {}
      return true;
    }
    return false;
  }

  /* =====================================================================
     HUB
     ===================================================================== */
  function renderHub() {
    hubCoach.innerHTML = clockChar.innerHTML; // reuse the clock SVG as a friendly coach
    hubGrid.innerHTML = '';
    DATA.forEach(function (set) {
      var best = getBest(set.id);
      var card = document.createElement('button');
      card.className = 'set-card'; card.type = 'button';
      card.style.setProperty('--set-accent', set.accent);
      card.innerHTML =
        '<span class="set-icon">' + set.icon + '</span>' +
        '<span class="set-title">' + set.title + '</span>' +
        '<span class="set-blurb">' + set.blurb + '</span>' +
        '<span class="set-foot">' +
          (best ? '<span class="set-best">&#9201; Best ' + fmtTime(best.time) + '</span>'
                : '<span class="set-best empty">Not run yet</span>') +
          '<span class="set-go">Sprint</span>' +
        '</span>';
      card.addEventListener('click', function () { audio.init(); startRun(set); });
      hubGrid.appendChild(card);
    });
  }

  /* =====================================================================
     RUN / SPRINT STRUCTURE
     ===================================================================== */
  function sprintCounts(n) {
    // returns [ex1, ex2, ex3] term counts — ex3 always = all
    var e3 = n, e2 = Math.max(3, n - 1), e1 = Math.max(3, n - 2);
    return [Math.min(e1, n), Math.min(e2, n), e3];
  }
  function distractorCount(sprintIdx) { return sprintIdx === 0 ? 1 : 2; }

  function startRun(set) {
    state.set = set; state.sprintIdx = 0; state.runTime = 0;
    showGame();
    loadSprint();
  }

  function loadSprint() {
    state.graded = false;
    state.connections = new Map();
    state.selected = null;
    state.dragPrevDef = null;

    var set = state.set;
    var counts = sprintCounts(set.items.length);
    var termCount = counts[state.sprintIdx];
    var nDist = distractorCount(state.sprintIdx);

    // choose terms for this sprint
    var chosenItems = shuffle(set.items).slice(0, termCount);

    // build a correct card per term (pick a random acceptable definition)
    state.terms = chosenItems.map(function (item, i) {
      return { id: 't' + i, term: item.term, item: item, pictogramId: item.pictogramId || null, correctCid: null };
    });
    var cards = [];
    var usedTexts = {};
    state.terms.forEach(function (t) {
      var def = t.item.definitions[Math.floor(Math.random() * t.item.definitions.length)];
      var cid = newCid();
      t.correctCid = cid;
      usedTexts[def.toLowerCase()] = true;
      cards.push({ cid: cid, text: def, kind: 'correct', termId: t.id, reason: null });
    });

    // pick distractors — prefer those belonging to shown terms (the precision traps)
    var pool = [];
    chosenItems.forEach(function (item) {
      (item.distractors || []).forEach(function (d) { pool.push({ d: d, fromShown: true }); });
    });
    // fall back to distractors from other items if a sprint needs more
    set.items.forEach(function (item) {
      if (chosenItems.indexOf(item) === -1) {
        (item.distractors || []).forEach(function (d) { pool.push({ d: d, fromShown: false }); });
      }
    });
    pool = shufflePreferShown(pool);

    var added = 0;
    for (var i = 0; i < pool.length && added < nDist; i++) {
      var txt = pool[i].d.text;
      if (usedTexts[txt.toLowerCase()]) continue;   // dedupe vs correct cards / earlier distractors
      usedTexts[txt.toLowerCase()] = true;
      cards.push({ cid: newCid(), text: txt, kind: 'distractor', termId: null, reason: pool[i].d.reason });
      added++;
    }

    state.cards = shuffle(cards);
    renderBoard();
    startTimer();
    updateTrack();
  }

  function shufflePreferShown(pool) {
    var shownArr = pool.filter(function (p) { return p.fromShown; });
    var otherArr = pool.filter(function (p) { return !p.fromShown; });
    return shuffle(shownArr).concat(shuffle(otherArr));
  }

  /* =====================================================================
     BOARD RENDER
     ===================================================================== */
  function renderBoard() {
    gameSetName.textContent = state.set.title;
    sprintPill.textContent = 'Sprint ' + (state.sprintIdx + 1) + ' of 3';
    leftHead.textContent = state.set.leftHeader;

    leftItems.innerHTML = ''; rightItems.innerHTML = '';
    clearWires();

    // terms (left), already in their own shuffle
    shuffle(state.terms).forEach(function (t) {
      var node = document.createElement('div');
      node.className = 'node term-node' + (t.pictogramId ? ' is-pic' : '');
      node.dataset.termId = t.id;
      node.tabIndex = 0; node.setAttribute('role', 'button');
      if (t.pictogramId) {
        node.innerHTML = '<img class="ghs" src="assets/ghs/' + t.pictogramId + '.svg" alt="" draggable="false" />';
        node.setAttribute('aria-label', t.term.charAt(0).toUpperCase() + t.term.slice(1) + ' hazard symbol — link it to a definition');
      } else {
        node.innerHTML = '<span class="term-word">' + t.term + '</span>';
        node.setAttribute('aria-label', t.term + ' — link it to a definition');
      }
      node.innerHTML += '<span class="port" aria-hidden="true"></span>';
      attachTermHandlers(node);
      leftItems.appendChild(node);
    });

    // definition cards (right) — already shuffled
    state.cards.forEach(function (c) {
      var node = document.createElement('div');
      node.className = 'node def-node';
      node.dataset.cid = c.cid;
      node.tabIndex = 0; node.setAttribute('role', 'button');
      node.setAttribute('aria-label', c.text);
      node.innerHTML = '<span class="port" aria-hidden="true"></span><span class="def-text">' + c.text + '</span>';
      attachDefHandlers(node);
      rightItems.appendChild(node);
    });

    cacheRect();
    setCheckEnabled(false);
    respondHint.textContent = 'Link every term to check your answers';
  }

  function cacheRect() { state.boardRect = board.getBoundingClientRect(); }

  /* ----- helpers to find nodes / port positions ----- */
  function termNode(id) { return leftItems.querySelector('[data-term-id="' + id + '"]'); }
  function defNode(cid) { return rightItems.querySelector('[data-cid="' + (cid && cid.replace(/"/g, '')) + '"]'); }
  function portCenter(node) {
    var p = node.querySelector('.port');
    var r = p.getBoundingClientRect();
    return { x: r.left + r.width / 2 - state.boardRect.left, y: r.top + r.height / 2 - state.boardRect.top };
  }

  /* =====================================================================
     WIRE DRAWING
     ===================================================================== */
  function wirePath(x1, y1, x2, y2) {
    var dx = (x2 - x1) * 0.45;
    return 'M' + x1 + ' ' + y1 + ' C' + (x1 + dx) + ' ' + y1 + ' ' + (x2 - dx) + ' ' + y2 + ' ' + x2 + ' ' + y2;
  }
  function makeWireGroup(cls) {
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'wire ' + (cls || ''));
    var glow = document.createElementNS(SVGNS, 'path'); glow.setAttribute('class', 'wire-glow');
    var core = document.createElementNS(SVGNS, 'path'); core.setAttribute('class', 'wire-core');
    var hit = document.createElementNS(SVGNS, 'path'); hit.setAttribute('class', 'wire-hit');
    hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', '20'); hit.setAttribute('fill', 'none');
    hit.style.pointerEvents = 'stroke';
    g.appendChild(glow); g.appendChild(core); g.appendChild(hit);
    return { g: g, glow: glow, core: core, hit: hit };
  }
  function setWireD(parts, d) { parts.glow.setAttribute('d', d); parts.core.setAttribute('d', d); parts.hit.setAttribute('d', d); }

  function clearWires() { while (wireLayer.firstChild) wireLayer.removeChild(wireLayer.firstChild); }

  function redrawWires() {
    clearWires();
    state.connections.forEach(function (defCid, termId) {
      var tn = termNode(termId), dn = defNode(defCid);
      if (!tn || !dn) return;
      var a = portCenter(tn), b = portCenter(dn);
      var cls = '';
      if (state.graded) cls = isLinkCorrect(termId, defCid) ? 'wire-correct' : 'wire-wrong';
      var parts = makeWireGroup(cls);
      setWireD(parts, wirePath(a.x, a.y, b.x, b.y));
      if (state.graded) {
        parts.hit.style.pointerEvents = 'none';   // locked board: wires aren't interactive
      } else {
        parts.hit.addEventListener('pointerdown', function (e) { e.stopPropagation(); snip(termId); });
      }
      wireLayer.appendChild(parts.g);
    });
    updateConnectedClasses();
  }

  function termById(id) { for (var i = 0; i < state.terms.length; i++) if (state.terms[i].id === id) return state.terms[i]; return null; }

  // A link is correct if the chosen card's text is ANY acceptable definition of the term.
  // (Grading by meaning, not card identity — so a card whose text is a valid definition is
  // accepted even when the teacher also authored that exact text as another term's distractor.)
  function isLinkCorrect(termId, defCid) {
    var t = termById(termId), card = cardByCid(defCid);
    return !!(t && card && t.item.definitions.indexOf(card.text) > -1);
  }

  function updateConnectedClasses() {
    leftItems.querySelectorAll('.term-node').forEach(function (n) { n.classList.remove('connected'); });
    rightItems.querySelectorAll('.def-node').forEach(function (n) { n.classList.remove('connected'); });
    state.connections.forEach(function (defCid, termId) {
      var tn = termNode(termId), dn = defNode(defCid);
      if (tn) tn.classList.add('connected');
      if (dn) dn.classList.add('connected');
    });
  }

  /* =====================================================================
     CONNECTION LOGIC
     ===================================================================== */
  function defOwner(defCid) {
    var owner = null;
    state.connections.forEach(function (c, t) { if (c === defCid) owner = t; });
    return owner;
  }
  function resolveDrop(termId, defCid) {
    var prev = state.dragPrevDef;             // term's def before this drag (already detached)
    var holder = defOwner(defCid);
    if (holder && holder !== termId) {
      state.connections.delete(holder);
      if (prev != null) state.connections.set(holder, prev); // true swap: bumped term takes our old slot
    }
    state.connections.set(termId, defCid);
    audio.connect();
    redrawWires();
    afterConnectionChange();
  }
  function snip(termId) {
    if (!state.connections.has(termId)) return;
    state.connections.delete(termId);
    audio.snip();
    redrawWires();
    afterConnectionChange();
    announce('Wire removed.');
  }
  function afterConnectionChange() {
    var all = state.connections.size === state.terms.length;
    setCheckEnabled(all);
    respondHint.textContent = all ? 'Ready! Tap the crest.'
      : (state.terms.length - state.connections.size) + ' term' +
        ((state.terms.length - state.connections.size) === 1 ? '' : 's') + ' still to link';
  }
  function setCheckEnabled(on) {
    checkBtn.disabled = !on;
    checkBtn.classList.toggle('ready', on);
  }

  /* =====================================================================
     TERM / DEF POINTER + KEYBOARD HANDLERS
     ===================================================================== */
  var DRAG_THRESHOLD = 6;

  function attachTermHandlers(node) {
    node.addEventListener('pointerdown', onTermPointerDown);
    node.addEventListener('keydown', onTermKey);
  }
  function attachDefHandlers(node) {
    node.addEventListener('pointerup', onDefTapUp);
    node.addEventListener('keydown', onDefKey);
  }

  function onTermPointerDown(e) {
    if (state.graded) return;
    if (state.drag) return;                 // ignore a second pointer while a drag is live
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var node = e.currentTarget;
    var termId = node.dataset.termId;
    state.drag = {
      termId: termId, node: node, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY, moved: false,
      live: null, lastX: e.clientX, lastY: e.clientY, raf: 0, hoverNode: null
    };
    document.body.classList.add('dragging-active');  // selection lock from the very first move
    document.addEventListener('pointermove', onDocPointerMove);
    document.addEventListener('pointerup', onDocPointerUp);
    document.addEventListener('pointercancel', onDocPointerCancel);
  }

  function beginLiveWire() {
    var d = state.drag;
    // detach this term's existing connection (kept in dragPrevDef to restore on a failed drop)
    state.dragPrevDef = state.connections.has(d.termId) ? state.connections.get(d.termId) : null;
    if (state.dragPrevDef != null) { state.connections.delete(d.termId); redrawWires(); }
    cacheRect();
    clearSelection();
    d.node.classList.add('dragging-from');
    d.live = makeWireGroup('live');
    wireLayer.appendChild(d.live.g);
    audio.init();
    startAutoScroll();
  }

  function updateDragVisual(d) {
    if (!d || !d.live) return;
    var a = portCenter(d.node);
    var fx = d.lastX - state.boardRect.left, fy = d.lastY - state.boardRect.top;
    setWireD(d.live, wirePath(a.x, a.y, fx, fy));
    hoverHitTest(d.lastX, d.lastY);
  }

  function onDocPointerMove(e) {
    var d = state.drag; if (!d || e.pointerId !== d.pointerId) return;
    d.lastX = e.clientX; d.lastY = e.clientY;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_THRESHOLD) {
      d.moved = true; beginLiveWire();
    }
    if (d.moved && !d.raf) {
      d.raf = requestAnimationFrame(function () { d.raf = 0; updateDragVisual(d); });
    }
  }

  // persistent rAF loop: scroll the page when a held drag nears the top/bottom edge,
  // so off-screen definition cards stay reachable even when the finger is held still.
  function startAutoScroll() {
    cancelAutoScroll();
    function loop() {
      var d = state.drag;
      if (!d || !d.moved) { state.scrollRaf = 0; return; }
      var margin = 78, vh = window.innerHeight, y = d.lastY, speed = 0;
      if (y < margin) speed = -Math.ceil((margin - y) / 5);
      else if (y > vh - margin) speed = Math.ceil((y - (vh - margin)) / 5);
      if (speed) {
        var before = window.scrollY;
        window.scrollBy({ top: speed, behavior: 'instant' });
        if (window.scrollY !== before) { cacheRect(); updateDragVisual(d); }
      }
      state.scrollRaf = requestAnimationFrame(loop);
    }
    state.scrollRaf = requestAnimationFrame(loop);
  }
  function cancelAutoScroll() { if (state.scrollRaf) cancelAnimationFrame(state.scrollRaf); state.scrollRaf = 0; }

  function hoverHitTest(cx, cy) {
    var d = state.drag; if (!d) return;
    var els = document.elementsFromPoint(cx, cy);
    var target = null;
    for (var i = 0; i < els.length; i++) {
      var dn = els[i].closest && els[i].closest('.def-node');
      if (dn) { target = dn; break; }
    }
    if (target !== d.hoverNode) {
      if (d.hoverNode) d.hoverNode.classList.remove('hover-target');
      d.hoverNode = target;
      if (target) target.classList.add('hover-target');
    }
  }

  function onDocPointerUp(e) {
    var d = state.drag; if (!d || e.pointerId !== d.pointerId) return;
    cleanupDocListeners();
    cancelAutoScroll();
    if (d.raf) cancelAnimationFrame(d.raf);
    d.lastX = e.clientX; d.lastY = e.clientY;   // use the true release point for the drop hit-test
    document.body.classList.remove('dragging-active');
    d.node.classList.remove('dragging-from');
    if (d.hoverNode) d.hoverNode.classList.remove('hover-target');

    if (!d.moved) {
      // a tap → click-to-connect selection
      state.drag = null;
      handleTermTap(d.termId);
      return;
    }
    // a drag → resolve drop
    if (d.live && d.live.g.parentNode) d.live.g.parentNode.removeChild(d.live.g);
    var target = null, els = document.elementsFromPoint(d.lastX, d.lastY);
    for (var i = 0; i < els.length; i++) {
      var dn = els[i].closest && els[i].closest('.def-node');
      if (dn) { target = dn; break; }
    }
    if (target) {
      resolveDrop(d.termId, target.dataset.cid);
      announce(termById(d.termId).term + ' linked.');
    } else {
      // failed drop — restore previous connection if any
      if (state.dragPrevDef != null) { state.connections.set(d.termId, state.dragPrevDef); redrawWires(); }
      else { redrawWires(); }
      afterConnectionChange();
    }
    state.dragPrevDef = null;
    state.drag = null;
  }

  function onDocPointerCancel(e) {
    var d = state.drag; if (!d || e.pointerId !== d.pointerId) return;
    cleanupDocListeners();
    cancelAutoScroll();
    if (d.raf) cancelAnimationFrame(d.raf);
    document.body.classList.remove('dragging-active');
    d.node.classList.remove('dragging-from');
    if (d.hoverNode) d.hoverNode.classList.remove('hover-target');
    if (d.live && d.live.g.parentNode) d.live.g.parentNode.removeChild(d.live.g);
    if (state.dragPrevDef != null) { state.connections.set(d.termId, state.dragPrevDef); redrawWires(); }
    state.dragPrevDef = null; state.drag = null;
    afterConnectionChange();
  }
  function cleanupDocListeners() {
    document.removeEventListener('pointermove', onDocPointerMove);
    document.removeEventListener('pointerup', onDocPointerUp);
    document.removeEventListener('pointercancel', onDocPointerCancel);
  }

  /* ----- click-to-connect (tap term, then tap def) ----- */
  function handleTermTap(termId) {
    if (state.graded) return;
    if (state.selected === termId) { clearSelection(); return; }
    clearSelection();
    state.selected = termId;
    termNode(termId).classList.add('selected');
    announce(termById(termId).term + ' selected. Now tap a definition.');
  }
  function clearSelection() {
    if (state.selected) { var n = termNode(state.selected); if (n) n.classList.remove('selected'); }
    state.selected = null;
  }
  function onDefTapUp(e) {
    // only treat as a tap-connect when a term is selected and no drag is happening
    if (state.graded || state.drag) return;
    if (!state.selected) return;
    var cid = e.currentTarget.dataset.cid;
    var termId = state.selected;
    state.dragPrevDef = state.connections.has(termId) ? state.connections.get(termId) : null;
    if (state.dragPrevDef != null) state.connections.delete(termId);
    clearSelection();
    resolveDrop(termId, cid);
    state.dragPrevDef = null;
    announce(termById(termId).term + ' linked.');
  }

  /* ----- keyboard ----- */
  function onTermKey(e) {
    if (state.graded) return;
    var termId = e.currentTarget.dataset.termId;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTermTap(termId); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); snip(termId); }
  }
  function onDefKey(e) {
    if (state.graded) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (state.selected) {
        var cid = e.currentTarget.dataset.cid, termId = state.selected;
        state.dragPrevDef = state.connections.has(termId) ? state.connections.get(termId) : null;
        if (state.dragPrevDef != null) state.connections.delete(termId);
        clearSelection();
        resolveDrop(termId, cid);
        state.dragPrevDef = null;
      } else {
        announce('Select a term first, then choose a definition.');
      }
    }
  }

  /* =====================================================================
     TIMER + CLOCK TENSION
     ===================================================================== */
  function startTimer() {
    stopTimer();
    state.timer.start = performance.now();
    state.timer.running = true;
    setClockState('calm');
    scheduleTick();
    tickTimer();
  }
  function tickTimer() {
    if (!state.timer.running) return;
    state.timer.elapsed = performance.now() - state.timer.start;
    timerEl.textContent = fmtTime(state.timer.elapsed);
    var s = state.timer.elapsed / 1000;
    var st = s < 15 ? 'calm' : s < 35 ? 'worried' : s < 60 ? 'anxious' : 'panic';
    if (st !== state.clockState) setClockState(st);
    state.timer.raf = requestAnimationFrame(tickTimer);
  }
  function stopTimer() {
    state.timer.running = false;
    if (state.timer.raf) cancelAnimationFrame(state.timer.raf);
    clearTimeout(state.tickTimer);
  }
  function setClockState(st) {
    var entering = st !== state.clockState;
    state.clockState = st;
    clockWrap.setAttribute('data-state', st);
    if (entering && st === 'panic') audio.alarm();
    scheduleTick();
  }
  function scheduleTick() {
    clearTimeout(state.tickTimer);
    if (!state.timer.running) return;
    var rates = { calm: 1000, worried: 640, anxious: 420, panic: 250 };
    var vols = { calm: 0.04, worried: 0.05, anxious: 0.06, panic: 0.075 };
    var st = state.clockState;
    state.tickTimer = setTimeout(function () {
      audio.tick(vols[st]);
      if (st === 'anxious' || st === 'panic') audio.thump();
      scheduleTick();
    }, rates[st]);
  }

  /* =====================================================================
     CHECK / GRADE
     ===================================================================== */
  function cardByCid(cid) { for (var i = 0; i < state.cards.length; i++) if (state.cards[i].cid === cid) return state.cards[i]; return null; }

  function gradeSprint() {
    if (checkBtn.disabled) return;
    state.timer.elapsed = performance.now() - state.timer.start;
    stopTimer();
    state.graded = true;
    state.runTime += state.timer.elapsed;
    setClockState('calm');

    var results = [], correct = 0;
    state.terms.forEach(function (t) {
      var chosenCid = state.connections.get(t.id);
      var card = cardByCid(chosenCid);
      var isCorrect = isLinkCorrect(t.id, chosenCid);
      if (isCorrect) correct++;
      var reason = null, chose = card ? card.text : '';
      if (!isCorrect && card) {
        if (card.kind === 'distractor') reason = card.reason;
        else reason = 'That is the definition of ' + (termById(card.termId) ? termById(card.termId).term : 'another term') + '.';
      }
      results.push({ term: t, isCorrect: isCorrect, chose: chose, reason: reason,
        correctText: isCorrect ? chose : cardByCid(t.correctCid).text });
      var tn = termNode(t.id), dn = defNode(chosenCid);
      if (tn) tn.classList.add(isCorrect ? 'correct' : 'wrong', 'locked');
      if (dn) dn.classList.add(isCorrect ? 'correct' : 'wrong');
    });

    state.graded = true;
    redrawWires();        // recolour wires green/red
    disableHitPaths();

    var allRight = correct === state.terms.length;
    if (allRight) { audio.correctPing(); setTimeout(function () { audio.fanfare(); }, 220); }
    else { audio.wrong(); }

    announce(correct + ' out of ' + state.terms.length + ' correct.' + (allRight ? ' Brilliant! Results loading.' : ' Results loading.'));

    // let the board flash, then present the results
    setTimeout(function () { showResults(results, correct, allRight); }, allRight ? 700 : 950);
  }
  function disableHitPaths() {
    wireLayer.querySelectorAll('.wire-hit').forEach(function (h) { h.style.pointerEvents = 'none'; });
  }

  /* =====================================================================
     RESULTS
     ===================================================================== */
  function showResults(results, correct, allRight) {
    var total = results.length;
    resScore.textContent = correct + '/' + total;
    resTime.textContent = fmtTime(state.timer.elapsed);

    var resCrestImg = document.getElementById('res-crest-img');
    if (resCrestImg) {
      resCrestImg.src = allRight ? 'assets/characters/thumbs_up.png' : 'assets/characters/both_wink.png';
      resCrestImg.classList.add('res-char');
    }

    // star rating: accuracy first, then speed
    var stars = 1;
    if (allRight) {
      var perTerm = state.timer.elapsed / total;
      stars = perTerm < 5000 ? 3 : perTerm < 9000 ? 2 : 1;
    } else {
      stars = correct === 0 ? 0 : 1;
    }
    resStars.textContent = '★★★☆☆☆'.slice(3 - stars, 6 - stars);
    resStars.setAttribute('aria-label', stars + ' out of 3 stars');
    resStars.removeAttribute('aria-hidden');

    resTitle.textContent = allRight ? 'Brilliant — every one precise!' : 'How did you fare?';

    resBody.innerHTML = '';
    results.forEach(function (r) {
      var fb = document.createElement('div');
      fb.className = 'fb ' + (r.isCorrect ? 'fb-correct' : 'fb-wrong');
      var html = '<span class="fb-term">' + (r.term.pictogramId
        ? hazardName(r.term) : r.term.term) + '</span> ';
      if (r.isCorrect) {
        html += '<span class="fb-tick">&#10003; precise</span>' +
          '<p class="fb-line fb-chose">' + r.correctText + '</p>';
      } else {
        html += '<p class="fb-line fb-chose">You chose: <b>' + r.chose + '</b></p>';
        if (r.reason) html += '<p class="fb-reason">' + r.reason + '</p>';
        html += '<p class="fb-line"><span class="fb-tick">&#10003; Precise answer:</span> ' + r.correctText + '</p>';
      }
      fb.innerHTML = html;
      resBody.appendChild(fb);
    });

    buildResActions(allRight);
    resultsOverlay.hidden = false;
    try { screenGame.setAttribute('inert', ''); } catch (e) {}
    setTimeout(function () { try { resTitle.focus(); } catch (e) {} }, 30);

    if (allRight) {
      clockChar.classList.add('cheer');
      jumpCrest();
      burstConfetti();
      setTimeout(function () { clockChar.classList.remove('cheer'); }, 700);
    }
  }
  function hazardName(t) {
    return t.term.charAt(0).toUpperCase() + t.term.slice(1) + ' symbol';
  }

  function buildResActions(allRight) {
    resActions.innerHTML = '';
    var isLast = state.sprintIdx === 2;
    if (!allRight) {
      addBtn('Try this sprint again', 'btn-primary', function () { closeResults(); loadSprint(); });
      addBtn('Back to hub', 'btn-ghost', function () { closeResults(); goHub(); });
      return;
    }
    if (!isLast) {
      addBtn('Next sprint →', 'btn-primary', function () { closeResults(); state.sprintIdx++; loadSprint(); });
      addBtn('Back to hub', 'btn-ghost', function () { closeResults(); goHub(); });
    } else {
      // run complete!
      var isBest = saveBest(state.set.id, state.runTime);
      var done = document.createElement('p');
      done.style.cssText = 'width:100%;text-align:center;font-weight:800;color:var(--ols-blue);margin:0 0 4px';
      done.innerHTML = 'Run complete in <b>' + fmtTime(state.runTime) + '</b>' +
        (isBest ? ' &mdash; <span style="color:var(--good)">new personal best! &#127942;</span>' : '');
      resActions.appendChild(done);
      addBtn('Run it again', 'btn-blue', function () { closeResults(); startRun(state.set); });
      addBtn('Pick another set', 'btn-primary', function () { closeResults(); goHub(); });
    }
  }
  function addBtn(label, cls, fn) {
    var b = document.createElement('button');
    b.className = 'btn ' + cls; b.type = 'button'; b.innerHTML = label;
    b.addEventListener('click', fn);
    resActions.appendChild(b);
  }
  function closeResults() {
    resultsOverlay.hidden = true;
    try { screenGame.removeAttribute('inert'); } catch (e) {}
    if (!screenGame.hidden && !checkBtn.disabled) { try { checkBtn.focus(); } catch (e) {} }
  }

  /* =====================================================================
     TRACK + SCREEN MANAGEMENT
     ===================================================================== */
  function updateTrack() {
    var flags = document.querySelectorAll('.track-flag');
    flags.forEach(function (f) {
      var i = parseInt(f.dataset.i, 10);
      f.classList.toggle('done', i < state.sprintIdx);
      f.classList.toggle('current', i === state.sprintIdx);
    });
    var pct = [4, 36.7, 69.3, 96][state.sprintIdx] || 4;
    trackRunner.style.left = pct + '%';
    trackRunner.classList.add('running');
    setTimeout(function () { trackRunner.classList.remove('running'); }, 700);
  }

  function showGame() { screenHub.hidden = true; screenGame.hidden = false; window.scrollTo(0, 0); }
  function goHub() {
    stopTimer(); setClockState('calm');
    screenGame.hidden = true; screenHub.hidden = false;
    renderHub();
    window.scrollTo(0, 0);
  }

  /* =====================================================================
     CREST JUMP + CONFETTI
     ===================================================================== */
  function jumpCrest() {
    checkBtn.classList.remove('ready');
    checkBtn.classList.add('jump');
    setTimeout(function () { checkBtn.classList.remove('jump'); }, 1200);
  }

  var confetti = { ctx: null, parts: [], raf: 0 };
  function burstConfetti() {
    var c = confettiCanvas;
    c.width = window.innerWidth; c.height = window.innerHeight;
    confetti.ctx = c.getContext('2d');
    confetti.parts = [];
    var colors = ['#E4B824', '#1A3A6B', '#2A4F8F', '#F5D45E', '#1f9d62', '#ffffff'];
    for (var i = 0; i < 140; i++) {
      confetti.parts.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 220,
        y: window.innerHeight * 0.34,
        vx: (Math.random() - 0.5) * 11,
        vy: Math.random() * -13 - 4,
        g: 0.32 + Math.random() * 0.2,
        s: 5 + Math.random() * 7,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
        col: colors[Math.floor(Math.random() * colors.length)],
        life: 0
      });
    }
    if (confetti.raf) cancelAnimationFrame(confetti.raf);
    runConfetti();
  }
  function runConfetti() {
    var ctx = confetti.ctx; if (!ctx) return;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    var alive = false;
    confetti.parts.forEach(function (p) {
      p.life++; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
      if (p.y < confettiCanvas.height + 30 && p.life < 260) alive = true;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col; ctx.globalAlpha = Math.max(0, 1 - p.life / 260);
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    });
    if (alive) confetti.raf = requestAnimationFrame(runConfetti);
    else ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  /* =====================================================================
     WIRING UP
     ===================================================================== */
  checkBtn.addEventListener('click', function () { if (!checkBtn.disabled) gradeSprint(); });
  $('to-hub').addEventListener('click', goHub);

  // tap empty board area clears a pending selection
  board.addEventListener('pointerdown', function (e) {
    if (state.drag) return;
    if (!e.target.closest('.node') && !e.target.closest('.wire-hit')) clearSelection();
  });

  muteBtn.addEventListener('click', function () {
    audio.muted = !audio.muted;
    muteBtn.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
    muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound');
    muteBtn.title = audio.muted ? 'Sound off' : 'Sound on';
    if (!audio.muted) audio.init();
  });

  var resizeRaf = 0;
  window.addEventListener('resize', function () {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () {
      if (!screenGame.hidden) { cacheRect(); redrawWires(); }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !resultsOverlay.hidden) { closeResults(); }
  });

  // belt-and-braces: cancel any text selection the browser tries to start mid-drag
  document.addEventListener('selectstart', function (e) {
    if (document.body.classList.contains('dragging-active')) e.preventDefault();
  });

  // keep the audio metronome in step with the (rAF-paused) clock when the tab is hidden
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTimeout(state.tickTimer); }
    else if (state.timer.running) { scheduleTick(); }
  });

  /* ---- go ---- */
  renderHub();

})();
