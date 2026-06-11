/* =========================================================================
   Costa Rica: A Sustainable Tourism Success Story?
   OLS Digital Skills — engine
   Pointer Events drag model throughout (mouse + touch + pen, one code path).
   ========================================================================= */
(function () {
  'use strict';

  /* =====================  Utilities  ===================== */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function shuffle(arr) {
    // Fisher–Yates
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* =====================  Audio (Web Audio, lazy)  ===================== */
  let audioCtx = null;
  function ctx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
    return audioCtx;
  }
  function tone(freq, type, dur, delay, vol) {
    const c = ctx(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const sfx = {
    snap() { tone(660, 'sine', 0.1); tone(990, 'sine', 0.1, 0.07); },
    err() { tone(200, 'square', 0.07, 0, 0.07); },
    find() { tone(880, 'sine', 0.12); tone(1320, 'sine', 0.16, 0.09, 0.12); },
    stamp() { tone(140, 'sine', 0.16, 0, 0.25); },
    chord() { [523.25, 659.25, 783.99].forEach((f, i) => tone(f, 'sine', 0.55, i * 0.11, 0.14)); },
    station() { [440, 554, 659, 880].forEach((f, i) => tone(f, 'sine', 0.3, i * 0.09, 0.13)); }
  };

  /* =====================  State + persistence  ===================== */
  const SAVE_KEY = 'ols-costarica-eco-v1';
  const STATIONS = [
    { id: 'gate', num: 1, icon: '🎟️', name: 'The Reserve Gate', kicker: 'Station 1 · Definitions', map: 'Reserve Gate' },
    { id: 'canopy', num: 2, icon: '🌉', name: 'The Canopy Walk', kicker: 'Station 2 · Fieldwork', map: 'Canopy Walk' },
    { id: 'benefits', num: 3, icon: '🌱', name: 'The Evidence Trail', kicker: 'Station 3 · Benefits', map: 'Evidence Trail' },
    { id: 'shadow', num: 4, icon: '🧵', name: 'The Shadow Files', kicker: 'Station 4 · Negative impacts', map: 'Shadow Files' },
    { id: 'however', num: 5, icon: '⚖️', name: 'The “However” Workshop', kicker: 'Station 5 · Evaluation skill', map: 'However Workshop' },
    { id: 'examiner', num: 6, icon: '🖋️', name: 'The Examiner’s Desk', kicker: 'Station 6 · Exam technique', map: 'Examiner’s Desk' },
    { id: 'verdict', num: 7, icon: '🦚', name: 'The Verdict', kicker: 'Station 7 · Final judgement', map: 'The Verdict' }
  ];

  let state = freshState();
  function freshState() {
    return { completed: [], scores: {}, notebook: [], seenFlight: false, points: 0 };
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.completed)) { state = Object.assign(freshState(), s); }
      }
    } catch (e) { /* ignore */ }
  }
  function resetAll() {
    state = freshState();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  /* =====================  Score handling  ===================== */
  // Each gradable item: 10 pts if right on first check, 5 if corrected later.
  function recordScore(stationId, earned, possible) {
    state.scores[stationId] = { earned, possible };
    state.points = Object.values(state.scores).reduce((t, s) => t + s.earned, 0);
    save();
    updateScoreBadge();
  }
  function updateScoreBadge() {
    $('#station-score').textContent = state.points + ' pts';
  }

  /* =====================  Notebook  ===================== */
  const NB_SECTIONS = ['Definition', 'Background', 'Benefits', 'Negative impacts', 'Evaluation toolkit'];
  function addNote(id, section, text) {
    if (state.notebook.some(n => n.id === id)) return;
    state.notebook.push({ id, section, text });
    save();
    const count = $('#notebook-count');
    count.textContent = state.notebook.length;
    const fab = $('#notebook-fab');
    fab.classList.remove('pop'); void fab.offsetWidth; fab.classList.add('pop');
    renderNotebook();
  }
  function renderNotebook() {
    const body = $('#notebook-body');
    body.innerHTML = '';
    let any = false;
    NB_SECTIONS.forEach(sec => {
      const entries = state.notebook.filter(n => n.section === sec);
      if (!entries.length) return;
      any = true;
      const wrap = el('div', 'nb-section');
      wrap.appendChild(el('h4', '', sec));
      entries.forEach(n => wrap.appendChild(el('div', 'nb-entry', n.text)));
      body.appendChild(wrap);
    });
    if (!any) body.appendChild(el('p', 'nb-empty', 'Nothing recorded yet — complete stations on the trail and your evidence will appear here.'));
    $('#notebook-count').textContent = state.notebook.length;
  }
  function setupNotebook() {
    const fab = $('#notebook-fab'), drawer = $('#notebook-drawer'), scrim = $('#notebook-scrim');
    function open() { renderNotebook(); drawer.hidden = false; scrim.hidden = false; }
    function close() { drawer.hidden = true; scrim.hidden = true; }
    fab.addEventListener('click', open);
    scrim.addEventListener('click', close);
    $('#btn-close-notebook').addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    $('#btn-open-notebook-end').addEventListener('click', open);
  }

  /* =====================  Screen router  ===================== */
  const SCREENS = ['briefing', 'flight', 'map', 'station', 'results'];
  function show(name) {
    SCREENS.forEach(s => { $('#screen-' + s).hidden = (s !== name); });
    $('#notebook-fab').hidden = (name === 'briefing' || name === 'flight');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* =====================  Selection lock during drags  ===================== */
  document.addEventListener('selectstart', e => {
    if (document.body.classList.contains('dragging-active')) e.preventDefault();
  });

  /* =====================  Edge auto-scroll during drags  ===================== */
  // With touch-action:none a pupil can't scroll mid-drag, so holding a chip
  // near the top/bottom edge scrolls the page to reveal off-screen targets.
  const autoScroll = {
    vel: 0, raf: null,
    start() {
      if (this.raf) return;
      const loop = () => { if (this.vel) window.scrollBy(0, this.vel); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
    },
    update(y) {
      const m = 90;
      this.vel = y < m ? -Math.ceil((m - y) / 5)
        : y > window.innerHeight - m ? Math.ceil((y - (window.innerHeight - m)) / 5)
        : 0;
    },
    stop() { this.vel = 0; if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; }
  };

  /* =====================  Generic drag engine  ===================== */
  /*
    enableDrag(chip, opts):
      opts.zoneSelector  — CSS selector for valid dropzones
      opts.accepts(zone, chip) — optional gate; return false to reject
      opts.onDrop(chip, zone)  — REQUIRED. place chip into zone (DOM move is caller's job)
      opts.onReturn(chip)      — chip returned to its origin (default: re-insert)
      opts.onMoved()           — called after any successful drop/return (to refresh Check state)
    Real-time dragging: the chip follows the pointer, frame by frame.
  */
  let keyboardPick = null; // { chip, opts } for keyboard fallback
  function enableDrag(chip, opts) {
    chip.style.touchAction = 'none';
    chip.setAttribute('tabindex', '0');
    const ptr = { id: null, startX: 0, startY: 0, moved: false, t0: 0, origin: null, originNext: null, w: 0 };

    function zonesUnder(x, y) {
      const stack = document.elementsFromPoint(x, y);
      for (const elx of stack) {
        if (elx === chip || chip.contains(elx)) continue;
        const z = elx.closest ? elx.closest(opts.zoneSelector) : null;
        if (z) return z;
      }
      return null;
    }
    function clearHover() {
      $$(opts.zoneSelector).forEach(z => z.classList.remove('drop-hover'));
    }
    function liftOut(e) {
      const r = chip.getBoundingClientRect();
      ptr.origin = chip.parentNode;
      ptr.originNext = chip.nextSibling;
      ptr.w = r.width;
      chip.style.position = 'fixed';
      chip.style.left = r.left + 'px';
      chip.style.top = r.top + 'px';
      chip.style.width = r.width + 'px';
      chip.style.margin = '0';
      chip.style.zIndex = '1000';
      document.body.appendChild(chip);
      ptr.startX = e.clientX; ptr.startY = e.clientY;
      chip.classList.add('dragging');
      document.body.classList.add('dragging-active');
      autoScroll.start();
    }
    function unstyle() {
      chip.classList.remove('dragging');
      chip.style.position = '';
      chip.style.left = ''; chip.style.top = '';
      chip.style.width = ''; chip.style.margin = '';
      chip.style.zIndex = ''; chip.style.transform = '';
      document.body.classList.remove('dragging-active');
    }
    function putBack() {
      unstyle();
      if (ptr.origin) {
        if (ptr.originNext && ptr.originNext.parentNode === ptr.origin) ptr.origin.insertBefore(chip, ptr.originNext);
        else ptr.origin.appendChild(chip);
      }
      chip.classList.add('snap-in');
      setTimeout(() => chip.classList.remove('snap-in'), 380);
    }

    chip.addEventListener('pointerdown', e => {
      if (chip.classList.contains('locked')) return;
      e.preventDefault();
      ptr.id = e.pointerId; ptr.moved = false; ptr.t0 = performance.now();
      ptr.startX = e.clientX; ptr.startY = e.clientY;
      try { chip.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    });
    chip.addEventListener('pointermove', e => {
      if (ptr.id !== e.pointerId) return;
      const dx = e.clientX - ptr.startX, dy = e.clientY - ptr.startY;
      if (!ptr.moved) {
        if (Math.hypot(dx, dy) < 6) return;
        ptr.moved = true;
        liftOut(e);
        return;
      }
      chip.style.transform = 'translate(' + (e.clientX - ptr.startX) + 'px,' + (e.clientY - ptr.startY) + 'px) scale(1.05) rotate(-1.2deg)';
      autoScroll.update(e.clientY);
      clearHover();
      const z = zonesUnder(e.clientX, e.clientY);
      if (z && (!opts.accepts || opts.accepts(z, chip))) z.classList.add('drop-hover');
    });
    function finish(e) {
      if (ptr.id !== e.pointerId) return;
      try { chip.releasePointerCapture(e.pointerId); } catch (err) { /* ok */ }
      ptr.id = null;
      autoScroll.stop();
      clearHover();
      if (!ptr.moved) return; // tap — no drag happened
      const z = (e.type === 'pointercancel') ? null : zonesUnder(e.clientX, e.clientY);
      if (z && (!opts.accepts || opts.accepts(z, chip))) {
        unstyle();
        opts.onDrop(chip, z);
        chip.classList.add('snap-in');
        setTimeout(() => chip.classList.remove('snap-in'), 380);
        sfx.snap();
      } else {
        putBack();
        if (e.type !== 'pointercancel') sfx.err();
      }
      if (opts.onMoved) opts.onMoved();
    }
    chip.addEventListener('pointerup', finish);
    chip.addEventListener('pointercancel', finish);

    // Keyboard fallback (supplementary to the pointer drag, for accessibility)
    chip.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (chip.classList.contains('locked')) return;
      if (keyboardPick && keyboardPick.chip === chip) {
        chip.style.outline = ''; keyboardPick = null; return;
      }
      keyboardPick = { chip, opts };
      $$('.chip').forEach(c => { c.style.outline = ''; });
      chip.style.outline = '3px solid var(--ols-gold)';
      $$(opts.zoneSelector).forEach(z => z.setAttribute('tabindex', '0'));
    });
  }
  // Zones receive keyboard-picked chips
  document.addEventListener('keydown', e => {
    if ((e.key !== 'Enter' && e.key !== ' ') || !keyboardPick) return;
    const z = e.target.closest && e.target.closest(keyboardPick.opts.zoneSelector);
    if (!z) return;
    e.preventDefault();
    const { chip, opts } = keyboardPick;
    if (!opts.accepts || opts.accepts(z, chip)) {
      chip.style.outline = '';
      opts.onDrop(chip, z);
      sfx.snap();
      if (opts.onMoved) opts.onMoved();
      keyboardPick = null;
    }
  });

  /* =====================  Check-button helper  ===================== */
  const btnCheck = () => $('#btn-check');
  function configureCheck(visible, enabled, label) {
    const b = btnCheck();
    b.hidden = !visible;
    b.disabled = !enabled;
    if (label) b.textContent = label;
  }
  let checkHandler = null;
  function onCheck(fn) { checkHandler = fn; }

  /* =====================  Station chrome  ===================== */
  let currentStation = null;
  function openStation(id) {
    const st = STATIONS.find(s => s.id === id);
    currentStation = st;
    $('#station-kicker').textContent = st.kicker;
    $('#station-title').textContent = st.icon + ' ' + st.name;
    $('#station-body').innerHTML = '';
    $('#btn-station-next').hidden = true;
    configureCheck(false, false);
    updateScoreBadge();
    show('station');
    BUILDERS[id]();
  }
  function stationComplete(id, text) {
    if (!state.completed.includes(id)) state.completed.push(id);
    save();
    sfx.station();
    $('#station-done-title').textContent = STATIONS.find(s => s.id === id).name + ' — complete';
    $('#station-done-text').textContent = text;
    $('#station-done').hidden = false;
  }

  /* =====================  Country map + flight  ===================== */
  function buildCountryMap() {
    const wrap = $('#country-map');
    wrap.innerHTML =
      '<svg viewBox="0 0 900 560" xmlns="' + SVG_NS + '" aria-hidden="true">' +
      '<rect class="cr-sea" x="0" y="0" width="900" height="560"/>' +
      // Neighbours
      '<path class="cr-neighbour" d="M0,0 L900,0 L900,60 L620,95 L560,118 L480,128 L390,140 L260,155 L150,185 L60,170 L0,140 Z"/>' +
      '<path class="cr-neighbour" d="M690,330 L740,330 C790,345 850,380 900,400 L900,560 L640,560 L600,470 L600,380 L620,350 L655,365 Z"/>' +
      // Lake Nicaragua hint
      '<ellipse class="cr-sea" cx="330" cy="105" rx="70" ry="26" transform="rotate(-12 330 105)"/>' +
      // Costa Rica
      '<path class="cr-land" d="M150,185 L200,170 C260,152 330,148 390,140 L480,128 L560,118 C600,160 640,220 668,280 L690,330 L655,365 L620,350 L600,380 C575,420 545,445 520,430 C505,420 515,400 530,395 L480,370 C440,345 410,330 380,318 L350,310 C345,330 330,345 310,340 C280,330 255,300 235,275 C215,250 195,215 175,200 Z"/>' +
      // Cordillera ridges
      '<ellipse class="cr-ridge" cx="295" cy="225" rx="58" ry="18" transform="rotate(28 295 225)"/>' +
      '<ellipse class="cr-ridge" cx="385" cy="262" rx="62" ry="19" transform="rotate(28 385 262)"/>' +
      '<ellipse class="cr-ridge" cx="487" cy="305" rx="66" ry="20" transform="rotate(28 487 305)"/>' +
      // Cloud band over Monteverde
      '<g class="cr-cloudband"><ellipse cx="318" cy="238" rx="46" ry="13"/><ellipse cx="346" cy="228" rx="30" ry="10"/></g>' +
      // Labels
      '<text class="cr-label" x="290" y="62" font-size="20" letter-spacing="3">NICARAGUA</text>' +
      '<text class="cr-label" x="745" y="455" font-size="20" letter-spacing="3">PANAMA</text>' +
      '<text class="cr-sea-label" x="630" y="120" font-size="17">Caribbean Sea</text>' +
      '<text class="cr-sea-label" x="160" y="490" font-size="17">Pacific Ocean</text>' +
      '<text class="cr-label" x="195" y="330" font-size="11" opacity="0.75">Nicoya Peninsula</text>' +
      '<text class="cr-label" x="505" y="468" font-size="11" opacity="0.75">Osa Peninsula</text>' +
      // Cities
      '<g id="cm-sanjose" opacity="0"><circle class="cr-city" cx="430" cy="300" r="6"/><circle class="cr-marker-pulse" cx="430" cy="300" r="8" fill="none" stroke="#1A3A6B" stroke-width="2"/><text class="cr-label" x="442" y="306" font-size="15">San José ★</text></g>' +
      '<g id="cm-monteverde" opacity="0"><circle cx="318" cy="243" r="6" fill="#C0392B"/><circle class="cr-marker-pulse" cx="318" cy="243" r="8" fill="none" stroke="#C0392B" stroke-width="2"/><text class="cr-label" x="206" y="226" font-size="15" font-weight="800">Monteverde ☁</text></g>' +
      // Paths
      '<path id="cm-flight" class="cr-flightpath" d="M888,140 C780,170 650,215 520,258 C475,272 446,286 432,297" opacity="0"/>' +
      '<path id="cm-road" class="cr-roadpath" d="M430,300 C405,292 380,275 355,262 C340,255 328,250 320,245" opacity="0"/>' +
      // Drawn plane (not an emoji — emoji orientation varies by platform); points along +x, rotated to the flight path tangent each frame
      '<g id="cm-plane" opacity="0"><path d="M17,0 L9,-2.4 L-1,-2.4 L-9,-10 L-12.5,-10 L-7.5,-2.4 L-13,-2.4 L-16,-6 L-18.5,-6 L-16.5,0 L-18.5,6 L-16,6 L-13,2.4 L-7.5,2.4 L-12.5,10 L-9,10 L-1,2.4 L9,2.4 Z" fill="#1A3A6B" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round"/></g>' +
      '<text id="cm-bus" class="cr-bus" opacity="0">🚌</text>' +
      '<text class="cr-label" x="12" y="548" font-size="11" opacity="0.6">Stylised map — not to scale</text>' +
      '</svg>';
  }

  let flightTimer = null, flightDone = false;
  function runFlight() {
    buildCountryMap();
    flightDone = false;
    show('flight');
    const caption = $('#flight-caption');
    const plane = $('#cm-plane'), bus = $('#cm-bus');
    const fp = $('#cm-flight'), road = $('#cm-road');
    const sj = $('#cm-sanjose'), mv = $('#cm-monteverde');
    const fpLen = fp.getTotalLength(), roadLen = road.getTotalLength();

    function moveAlong(path, len, node, t) {
      const p = path.getPointAtLength(len * t);
      node.setAttribute('x', p.x - 14);
      node.setAttribute('y', p.y + 9);
    }
    function movePlane(t) {
      // position on the path + rotate to face the direction of travel
      const at = fpLen * t;
      const ahead = Math.min(fpLen, at + 2);
      const behind = Math.max(0, ahead - 4);
      const p = fp.getPointAtLength(at);
      const a = fp.getPointAtLength(behind), b = fp.getPointAtLength(ahead);
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      plane.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ') rotate(' + ang + ')');
    }
    const phases = [
      { dur: 2600, init() { caption.textContent = 'Crossing the Caribbean…'; fp.style.opacity = 1; plane.style.opacity = 1; movePlane(0); },
        step(t) { movePlane(t); } },
      { dur: 1300, init() { caption.textContent = 'Touchdown — Juan Santamaría International, San José'; sj.style.opacity = 1; plane.style.opacity = 0; sfx.snap(); }, step() {} },
      { dur: 2400, init() { caption.textContent = 'Winding up into the Cordillera de Tilarán…'; road.style.opacity = 1; bus.style.opacity = 1; },
        step(t) { moveAlong(road, roadLen, bus, t); } },
      { dur: 1500, init() { caption.textContent = 'Welcome to Monteverde — the cloud forest reserve'; mv.style.opacity = 1; bus.style.opacity = 0; sfx.find(); }, step() {} }
    ];
    let pi = 0, t0 = performance.now();
    phases[0].init();
    function frame(now) {
      if (flightDone) return;
      const ph = phases[pi];
      const t = Math.min(1, (now - t0) / ph.dur);
      ph.step(t);
      if (t >= 1) {
        pi++;
        if (pi >= phases.length) { endFlight(); return; }
        t0 = now; phases[pi].init();
      }
      flightTimer = requestAnimationFrame(frame);
    }
    flightTimer = requestAnimationFrame(frame);
  }
  function endFlight() {
    if (flightDone) return;
    flightDone = true;
    if (flightTimer) cancelAnimationFrame(flightTimer);
    state.seenFlight = true; save();
    setTimeout(() => { renderTrailMap(); show('map'); }, 350);
  }

  /* =====================  Trail map (hub)  ===================== */
  const TRAIL_D = 'M 90,440 C 180,420 220,360 300,370 C 380,380 420,440 500,430 C 580,420 600,340 560,290 C 520,240 420,260 380,210 C 340,160 420,110 520,120 C 620,130 700,180 780,150 C 830,132 870,112 888,96';
  const STATION_FRACS = [0.07, 0.21, 0.35, 0.49, 0.63, 0.77, 0.92];

  function renderTrailMap() {
    const wrap = $('#trail-map');
    wrap.innerHTML = '';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 980 520');
    // parchment + scenery
    svg.innerHTML =
      '<rect class="tm-parchment" x="6" y="6" width="968" height="508" rx="18"/>' +
      '<path class="tm-hill-far" d="M40,160 Q160,90 280,150 Q380,195 470,150 Q420,230 300,225 Q150,222 40,250 Z"/>' +
      '<path class="tm-hill" d="M620,420 Q720,350 830,400 Q920,438 940,480 L620,480 Z"/>' +
      '<text class="tm-tree" x="120" y="300">🌳</text><text class="tm-tree" x="640" y="90">🌳</text>' +
      '<text class="tm-tree" x="850" y="300">🌴</text><text class="tm-tree" x="240" y="470">🌳</text>' +
      '<text class="tm-tree" x="700" y="330">🌿</text><text class="tm-tree" x="450" y="80">🌳</text>' +
      '<ellipse class="tm-mist" cx="300" cy="180" rx="80" ry="16"/>' +
      '<ellipse class="tm-mist" cx="700" cy="240" rx="90" ry="18"/>' +
      '<text x="30" y="46" font-size="17" font-weight="800" fill="#7A6A45">MONTEVERDE · THE AUDIT TRAIL</text>' +
      '<text x="894" y="70" font-size="26">🏆</text>' +
      '<path class="tm-path-base" d="' + TRAIL_D + '"/>' +
      '<path class="tm-path-walked" id="tm-walked" d="' + TRAIL_D + '"/>';
    wrap.appendChild(svg);

    const base = svg.querySelector('.tm-path-base');
    const walked = $('#tm-walked');
    const L = base.getTotalLength();

    // progress = fraction of furthest completed station (smooth path fill)
    let frac = 0;
    STATIONS.forEach((s, i) => { if (state.completed.includes(s.id)) frac = STATION_FRACS[i]; });
    if (state.completed.length === STATIONS.length) frac = 1;
    walked.setAttribute('stroke-dasharray', L);
    walked.setAttribute('stroke-dashoffset', L);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      walked.setAttribute('stroke-dashoffset', L * (1 - frac));
    }));

    // First locked station = active
    let activeIdx = STATIONS.findIndex(s => !state.completed.includes(s.id));
    if (activeIdx === -1) activeIdx = STATIONS.length; // all done

    STATIONS.forEach((s, i) => {
      const p = base.getPointAtLength(L * STATION_FRACS[i]);
      const g = document.createElementNS(SVG_NS, 'g');
      const done = state.completed.includes(s.id);
      const isActive = i === activeIdx;
      g.setAttribute('class', 'tm-station ' + (done ? 'done' : isActive ? 'active' : 'locked'));
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', 'Station ' + s.num + ': ' + s.map + (done ? ' (complete)' : isActive ? '' : ' (locked)'));
      const above = (i % 2 === 0);
      g.innerHTML =
        '<circle cx="' + p.x + '" cy="' + p.y + '" r="52" fill="transparent"/>' +
        (isActive ? '<circle class="tm-ring" cx="' + p.x + '" cy="' + p.y + '" r="26" fill="none" stroke="#E4B824" stroke-width="3"/>' : '') +
        '<circle class="tm-station-disc" cx="' + p.x + '" cy="' + p.y + '" r="24"/>' +
        (done
          ? '<text class="tm-check" x="' + p.x + '" y="' + (p.y + 5.5) + '" text-anchor="middle" fill="#fff" font-weight="900">✔</text>'
          : '<text class="tm-icon" x="' + p.x + '" y="' + (p.y + 7.5) + '" text-anchor="middle">' + s.icon + '</text>') +
        '<text class="tm-station-num" x="' + p.x + '" y="' + (p.y + (above ? -40 : 48)) + '" text-anchor="middle">STATION ' + s.num + '</text>' +
        '<text class="tm-station-label" x="' + p.x + '" y="' + (p.y + (above ? -54 : 64)) + '" text-anchor="middle">' + s.map + '</text>';
      if (isActive) {
        g.addEventListener('click', () => openStation(s.id));
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStation(s.id); } });
        g.setAttribute('tabindex', '0');
      } else if (done) {
        g.addEventListener('click', () => openStation(s.id)); // revisit allowed
        g.setAttribute('tabindex', '0');
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStation(s.id); } });
      }
      svg.appendChild(g);
    });

    if (activeIdx >= STATIONS.length) {
      // everything complete → flourish at the trophy
      setTimeout(showResults, 900);
    }
  }

  /* =====================  Station 1 — Reserve Gate  ===================== */
  function buildGate() {
    $('#station-intro').textContent = 'Every audit starts with precise terminology. Build the exact definition of ecotourism, then answer the warden’s three entry questions to receive your reserve permit.';
    const body = $('#station-body');
    const wrap = el('div', 'gate-wrap');
    body.appendChild(wrap);

    // --- Part A: definition assembly ---
    const panelA = el('div', 'gate-panel');
    panelA.innerHTML = '<h3>① Build the definition</h3><p class="panel-sub">Drag the correct word or phrase into each gap. Watch out — half the chips don’t belong in the definition at all.</p>';
    const line = el('div', 'definition-line');
    DATA.gate.definitionParts.forEach(part => {
      if (part.before) line.appendChild(document.createTextNode(part.before));
      if (part.slot) {
        const slot = el('span', 'def-slot dropzone');
        slot.dataset.slot = part.slot;
        slot.setAttribute('aria-label', 'Definition gap');
        line.appendChild(slot);
      }
    });
    panelA.appendChild(line);
    const tray = el('div', 'tray');
    tray.appendChild(el('p', 'tray-label', 'Word bank'));
    panelA.appendChild(tray);
    wrap.appendChild(panelA);

    const firstTry = {}; let checked = false;
    const chips = shuffle(DATA.gate.definitionChips);
    chips.forEach(c => {
      const chip = el('div', 'chip', c.text);
      chip.dataset.id = c.id; chip.dataset.target = c.target || '';
      chip.setAttribute('aria-label', 'Word chip: ' + c.text);
      tray.appendChild(chip);
      enableDrag(chip, {
        zoneSelector: '#screen-station .def-slot, #screen-station .tray',
        onDrop(ch, zone) {
          if (zone.classList.contains('def-slot')) {
            const occupant = zone.querySelector('.chip');
            if (occupant) tray.appendChild(occupant); // swap out
            zone.appendChild(ch);
          } else {
            zone.appendChild(ch);
          }
        },
        onMoved: refreshGateCheck
      });
    });

    function allSlotsFilled() {
      return $$('.def-slot', panelA).every(s => s.querySelector('.chip'));
    }
    function refreshGateCheck() {
      configureCheck(true, allSlotsFilled(), checked ? 'Check again' : 'Check the definition');
    }
    refreshGateCheck();

    let defDone = false;
    onCheck(() => {
      if (defDone) return;
      let allRight = true;
      $$('.def-slot', panelA).forEach(slot => {
        const chip = slot.querySelector('.chip');
        if (!chip || chip.classList.contains('locked')) return;
        const right = chip.dataset.target === slot.dataset.slot;
        if (right) {
          chip.classList.add('locked');
          if (!checked && !(chip.dataset.id in firstTry)) firstTry[chip.dataset.id] = true;
        } else {
          allRight = false;
          chip.classList.add('wrong');
          setTimeout(() => chip.classList.remove('wrong'), 450);
          if (!(chip.dataset.id in firstTry)) firstTry[chip.dataset.id] = false;
        }
      });
      checked = true;
      if (allRight) {
        defDone = true;
        sfx.chord();
        const note = el('div', 'feedback-note', DATA.gate.definitionFeedback);
        panelA.appendChild(note);
        addNote('def', 'Definition', '<strong>Ecotourism:</strong> responsible travel to natural areas that conserves the environment and improves the well-being of local people.');
        configureCheck(false, false);
        setTimeout(showQuiz, 700);
      } else {
        sfx.err();
        refreshGateCheck();
      }
    });

    // --- Part B: warden's questions ---
    function showQuiz() {
      const panelB = el('div', 'gate-panel');
      panelB.innerHTML = '<h3>② The warden’s questions</h3><p class="panel-sub">One attempt per question — choose carefully.</p>';
      wrap.appendChild(panelB);
      const qWrap = el('div'); panelB.appendChild(qWrap);
      let qi = 0; const quizScores = [];
      function renderQ() {
        qWrap.innerHTML = '';
        const q = DATA.gate.quiz[qi];
        qWrap.appendChild(el('p', 'quiz-progress', 'Question ' + (qi + 1) + ' of ' + DATA.gate.quiz.length));
        qWrap.appendChild(el('p', 'quiz-q', q.q));
        const optsBox = el('div', 'quiz-options'); qWrap.appendChild(optsBox);
        shuffle(q.options).forEach(o => {
          const b = el('button', 'quiz-option', o.text);
          b.addEventListener('click', () => {
            $$('.quiz-option', optsBox).forEach(x => { x.disabled = true; });
            if (o.correct) { b.classList.add('right'); sfx.snap(); quizScores.push(10); }
            else {
              b.classList.add('wrong-pick'); sfx.err(); quizScores.push(0);
              $$('.quiz-option', optsBox).forEach(x => { if (DATA.gate.quiz[qi].options.find(oo => oo.text === x.textContent && oo.correct)) x.classList.add('right'); });
            }
            qWrap.appendChild(el('div', 'feedback-note', q.feedback));
            addNote('gatefact' + qi, 'Background', q.feedback);
            const next = el('button', 'primary-btn', qi < DATA.gate.quiz.length - 1 ? 'Next question →' : 'Collect my permit ✔');
            next.style.marginTop = '12px';
            next.addEventListener('click', () => {
              qi++;
              if (qi < DATA.gate.quiz.length) renderQ();
              else finishGate();
            });
            qWrap.appendChild(next);
          });
          optsBox.appendChild(b);
        });
        panelB.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      function finishGate() {
        const defPts = Object.values(firstTry).filter(Boolean).length * 10 +
                       Object.values(firstTry).filter(v => !v).length * 5;
        const earned = defPts + quizScores.reduce((a, b) => a + b, 0);
        recordScore('gate', earned, 80);
        stationComplete('gate', 'Permit granted. You can now define ecotourism word-for-word — the spec’s first learning outcome — and you know the reserve’s headline numbers.');
      }
      renderQ();
    }
  }

  /* =====================  Station 2 — Canopy Walk  ===================== */
  function buildCanopy() {
    $('#station-intro').textContent = 'Walk the suspension bridge and survey the reserve. Eight features of Monteverde’s ecotourism model are hidden in the scene — find them all to fill your field notebook.';
    const body = $('#station-body');
    const wrap = el('div', 'canopy-wrap'); body.appendChild(wrap);

    const checklist = el('div', 'canopy-checklist');
    DATA.canopy.forEach(c => {
      const s = el('span', 'spot-item', '<span aria-hidden="true">' + c.icon + '</span> ' + c.name);
      s.id = 'spot-' + c.id;
      checklist.appendChild(s);
    });
    wrap.appendChild(checklist);

    const scene = el('div', 'canopy-scene');
    scene.innerHTML = buildCanopySceneSVG();
    wrap.appendChild(scene);
    wrap.appendChild(el('p', 'scene-hint', 'Tip: look closely — some features hide in the mist. Tap anything you spot.'));
    const noteBox = el('div'); wrap.appendChild(noteBox);

    let found = 0;
    DATA.canopy.forEach(c => {
      const g = scene.querySelector('#hs-' + c.id);
      if (!g) return;
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', 'Scene feature');
      function findIt() {
        if (g.classList.contains('found')) return;
        g.classList.add('found');
        const hit = g.querySelector('.hit');
        const ring = document.createElementNS(SVG_NS, 'circle');
        ring.setAttribute('class', 'found-ring');
        ring.setAttribute('cx', hit.getAttribute('cx'));
        ring.setAttribute('cy', hit.getAttribute('cy'));
        ring.setAttribute('r', 28);
        g.appendChild(ring);
        sfx.find();
        $('#spot-' + c.id).classList.add('found');
        noteBox.innerHTML = '';
        noteBox.appendChild(el('div', 'canopy-note', '<strong>' + c.icon + ' ' + c.name + ':</strong> ' + c.note));
        addNote('canopy-' + c.id, 'Background', '<strong>' + c.name + ':</strong> ' + c.note);
        found++;
        if (found === DATA.canopy.length) {
          recordScore('canopy', 0, 0); // exploratory station, not scored
          setTimeout(() => stationComplete('canopy', 'Survey complete — all eight features logged. You now hold the background knowledge every Monteverde essay opens with.'), 900);
        }
      }
      g.addEventListener('click', findIt);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); findIt(); } });
    });
  }

  function buildCanopySceneSVG() {
    function tree(x, y, s, hue) {
      return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
        '<rect x="-7" y="0" width="14" height="55" rx="5" fill="#5C4327"/>' +
        '<ellipse cx="0" cy="-26" rx="52" ry="40" fill="' + hue + '"/>' +
        '<ellipse cx="-30" cy="-6" rx="34" ry="26" fill="' + hue + '" opacity="0.9"/>' +
        '<ellipse cx="30" cy="-4" rx="32" ry="25" fill="' + hue + '" opacity="0.85"/></g>';
    }
    return '<svg viewBox="0 0 1000 600" xmlns="' + SVG_NS + '" role="img" aria-label="Illustrated Monteverde cloud forest scene with hidden features to find">' +
      '<defs>' +
      '<linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#BFE0D8"/><stop offset="0.5" stop-color="#8FBFA8"/><stop offset="1" stop-color="#3D7A57"/></linearGradient>' +
      '<linearGradient id="cs-ground" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#2E6B45"/><stop offset="1" stop-color="#16402B"/></linearGradient>' +
      '</defs>' +
      '<rect width="1000" height="600" fill="url(#cs-sky)"/>' +
      // far hills + Santa Elena (hotspot: town)
      '<path d="M0,250 Q120,150 260,225 Q400,290 520,235 Q420,330 240,320 Q90,312 0,340 Z" fill="#6FA288" opacity="0.65"/>' +
      '<path d="M520,260 Q660,180 820,250 Q930,295 1000,270 L1000,360 Q800,380 600,355 Z" fill="#5E947A" opacity="0.55"/>' +
      '<g id="hs-town" class="hotspot"><g class="hotspot-art">' +
      '<rect x="96" y="196" width="14" height="11" fill="#E8E2D2"/><polygon points="96,196 103,189 110,196" fill="#B5483A"/>' +
      '<rect x="114" y="198" width="12" height="9" fill="#DCD4C0"/><polygon points="114,198 120,192 126,198" fill="#A8503E"/>' +
      '<rect x="84" y="199" width="9" height="8" fill="#D8D0BE"/>' +
      '<rect x="104" y="180" width="4" height="10" fill="#E8E2D2"/><polygon points="100,182 106,172 112,182" fill="#B5483A"/>' +
      '</g><circle class="hit" cx="106" cy="194" r="36"/></g>' +
      // mist band
      '<ellipse cx="300" cy="270" rx="190" ry="22" fill="rgba(235,245,238,0.55)" style="filter:blur(6px)"/>' +
      '<ellipse cx="760" cy="300" rx="170" ry="20" fill="rgba(235,245,238,0.5)" style="filter:blur(6px)"/>' +
      // mid trees
      tree(70, 380, 1.1, '#2F7B4E') + tree(195, 360, 0.9, '#3A8A5C') +
      tree(905, 370, 1.2, '#2F7B4E') + tree(800, 385, 0.85, '#3A8A5C') +
      tree(625, 372, 0.95, '#357F52') +
      // suspension bridge between two big trees (hotspot: bridge)
      tree(330, 350, 1.25, '#2A7148') + tree(560, 345, 1.2, '#2F7B4E') +
      '<g id="hs-bridge" class="hotspot"><g class="hotspot-art">' +
      '<path d="M340,310 Q450,345 555,305" stroke="#C9A86A" stroke-width="5" fill="none"/>' +
      '<path d="M340,290 Q450,322 555,285" stroke="#A8854C" stroke-width="3" fill="none"/>' +
      Array.from({ length: 9 }, (_, i) => { const x = 352 + i * 23; const y1 = 292 + Math.sin((i / 8) * Math.PI) * 30; return '<line x1="' + x + '" y1="' + (y1 - 1) + '" x2="' + x + '" y2="' + (y1 + 17) + '" stroke="#A8854C" stroke-width="2.5"/>'; }).join('') +
      '<circle cx="430" cy="332" r="5" fill="#E4B824"/><rect x="426" y="335" width="8" height="12" rx="3" fill="#C0392B"/>' +
      '</g><circle class="hit" cx="448" cy="315" r="55"/></g>' +
      // quetzal in right tree (hotspot)
      '<g id="hs-quetzal" class="hotspot"><g class="hotspot-art">' +
      '<ellipse cx="582" cy="300" rx="9" ry="11" fill="#13A06B"/>' +
      '<circle cx="582" cy="288" r="6" fill="#0E8A5C"/>' +
      '<ellipse cx="582" cy="305" rx="5" ry="7" fill="#D53A2F"/>' +
      '<path d="M580,310 Q576,345 581,368 M584,310 Q589,348 585,370" stroke="#0E8A5C" stroke-width="2.5" fill="none"/>' +
      '<circle cx="584" cy="287" r="1.4" fill="#08291C"/><polygon points="588,288 594,290 588,292" fill="#E4B824"/>' +
      '</g><circle class="hit" cx="583" cy="315" r="34"/></g>' +
      // ground
      '<path d="M0,420 Q250,395 500,415 Q750,435 1000,405 L1000,600 L0,600 Z" fill="url(#cs-ground)"/>' +
      // trail
      '<path d="M80,600 Q240,520 430,500 Q640,480 900,520 L940,600 Z" fill="#7A5C36" opacity="0.55"/>' +
      // orchids on trunk (hotspot)
      '<g id="hs-orchid" class="hotspot"><g class="hotspot-art">' +
      '<rect x="172" y="395" width="16" height="90" rx="7" fill="#54391F"/>' +
      '<circle cx="180" cy="412" r="6" fill="#E86CA8"/><circle cx="174" cy="408" r="4" fill="#F2A0C6"/><circle cx="186" cy="407" r="4" fill="#F2A0C6"/>' +
      '<circle cx="180" cy="436" r="6" fill="#D14F92"/><circle cx="174" cy="432" r="4" fill="#E86CA8"/><circle cx="186" cy="431" r="4" fill="#E86CA8"/>' +
      '<circle cx="180" cy="404" r="2.5" fill="#FFE89A"/><circle cx="180" cy="428" r="2.5" fill="#FFE89A"/>' +
      '</g><circle class="hit" cx="180" cy="425" r="36"/></g>' +
      // eco-lodge right (hotspot)
      '<g id="hs-lodge" class="hotspot"><g class="hotspot-art">' +
      '<rect x="812" y="442" width="92" height="52" rx="4" fill="#7A5C36"/>' +
      '<polygon points="804,444 858,408 912,444" fill="#4E6E3C"/>' +
      '<rect x="826" y="458" width="18" height="16" fill="#FFE9B0"/><rect x="868" y="458" width="18" height="16" fill="#FFE9B0"/>' +
      '<rect x="850" y="468" width="13" height="26" fill="#54391F"/>' +
      '<text x="817" y="438" font-size="13">🌿</text>' +
      '</g><circle class="hit" cx="858" cy="455" r="48"/></g>' +
      // guide + tourists on trail (hotspot)
      '<g id="hs-guide" class="hotspot"><g class="hotspot-art">' +
      '<circle cx="330" cy="497" r="7" fill="#C68B59"/><rect x="324" y="504" width="12" height="20" rx="4" fill="#2E5E3A"/>' +
      '<path d="M322,494 Q330,486 338,494" stroke="#8A6A3A" stroke-width="5" fill="none"/>' +
      '<circle cx="356" cy="501" r="6" fill="#E0B084"/><rect x="351" y="507" width="10" height="17" rx="4" fill="#5A7FA8"/>' +
      '<circle cx="376" cy="503" r="6" fill="#B97F52"/><rect x="371" y="509" width="10" height="16" rx="4" fill="#A85E78"/>' +
      '<line x1="338" y1="508" x2="344" y2="520" stroke="#2E5E3A" stroke-width="3"/>' +
      '</g><circle class="hit" cx="352" cy="508" r="40"/></g>' +
      // trail sign (hotspot)
      '<g id="hs-sign" class="hotspot"><g class="hotspot-art">' +
      '<rect x="556" y="468" width="7" height="44" fill="#54391F"/>' +
      '<rect x="534" y="452" width="52" height="20" rx="3" fill="#C9A86A" stroke="#54391F" stroke-width="1.5"/>' +
      '<text x="540" y="466" font-size="10" font-weight="800" fill="#3A2A12">SENDERO</text>' +
      '<rect x="540" y="475" width="44" height="13" rx="3" fill="#B8915A" stroke="#54391F" stroke-width="1"/>' +
      '<text x="545" y="485" font-size="8.5" font-weight="700" fill="#3A2A12">6 trails·13km</text>' +
      '</g><circle class="hit" cx="560" cy="478" r="36"/></g>' +
      // research station (hotspot)
      '<g id="hs-research" class="hotspot"><g class="hotspot-art">' +
      '<rect x="700" y="520" width="64" height="38" rx="4" fill="#DDE6DD"/>' +
      '<polygon points="694,522 732,500 770,522" fill="#7A8C7A"/>' +
      '<rect x="712" y="532" width="14" height="12" fill="#9FC2D6"/><rect x="738" y="532" width="14" height="12" fill="#9FC2D6"/>' +
      '<line x1="732" y1="500" x2="732" y2="482" stroke="#5A5A5A" stroke-width="2.5"/>' +
      '<circle cx="732" cy="480" r="3.5" fill="#C0392B"/>' +
      '<text x="704" y="554" font-size="8" font-weight="800" fill="#3A4A42">TROPICAL SCIENCE CTR</text>' +
      '</g><circle class="hit" cx="732" cy="528" r="44"/></g>' +
      // foreground foliage
      '<path d="M0,600 Q60,520 130,560 Q80,580 90,600 Z" fill="#1F5638"/>' +
      '<path d="M1000,600 Q930,530 870,565 Q920,585 905,600 Z" fill="#1F5638"/>' +
      '<ellipse cx="500" cy="560" rx="40" ry="9" fill="rgba(235,245,238,0.35)" style="filter:blur(5px)"/>' +
      '</svg>';
  }

  /* =====================  Station 3 — Benefits classify  ===================== */
  function buildBenefits() {
    $('#station-intro').textContent = 'Nine pieces of evidence from the reserve. Sort each one into the correct strand — social, economic or environmental — exactly as the spec groups the benefits. Place all nine, then press Check. You can move cards freely until then.';
    const body = $('#station-body');
    const wrap = el('div', 'classify-wrap'); body.appendChild(wrap);

    const cols = el('div', 'classify-cols');
    DATA.benefits.categories.forEach(cat => {
      const col = el('div', 'classify-col');
      col.appendChild(el('div', 'classify-col-head', cat.label));
      const zone = el('div', 'dropzone benefit-zone');
      zone.dataset.cat = cat.id;
      zone.setAttribute('aria-label', cat.label + ' drop zone');
      col.appendChild(zone);
      cols.appendChild(col);
    });
    wrap.appendChild(cols);

    const tray = el('div', 'tray');
    tray.appendChild(el('p', 'tray-label', 'Evidence collected on the trail'));
    wrap.appendChild(tray);

    const firstTry = {}; let checked = false;
    shuffle(DATA.benefits.cards).forEach(c => {
      const chip = el('div', 'chip', c.text);
      chip.dataset.id = c.id; chip.dataset.target = c.target;
      tray.appendChild(chip);
      enableDrag(chip, {
        zoneSelector: '#screen-station .benefit-zone, #screen-station .tray',
        onDrop(ch, zone) { zone.appendChild(ch); },
        onMoved: refresh
      });
    });

    function allPlaced() { return !tray.querySelector('.chip'); }
    function refresh() { configureCheck(true, allPlaced(), checked ? 'Check again' : 'Check my sorting'); }
    refresh();

    onCheck(() => {
      let allRight = true;
      $$('.benefit-zone .chip', wrap).forEach(chip => {
        if (chip.classList.contains('locked')) return;
        const zone = chip.closest('.benefit-zone');
        const right = chip.dataset.target === zone.dataset.cat;
        const card = DATA.benefits.cards.find(c => c.id === chip.dataset.id);
        if (right) {
          chip.classList.add('locked');
          if (!(chip.dataset.id in firstTry)) firstTry[chip.dataset.id] = !checked;
          chip.appendChild(el('div', 'feedback-note', card.why));
          addNote('ben-' + chip.dataset.id, 'Benefits',
            '<strong>[' + zone.dataset.cat.charAt(0).toUpperCase() + zone.dataset.cat.slice(1) + ']</strong> ' + card.text);
        } else {
          allRight = false;
          chip.classList.add('wrong');
          setTimeout(() => chip.classList.remove('wrong'), 450);
          if (!(chip.dataset.id in firstTry)) firstTry[chip.dataset.id] = false;
        }
      });
      checked = true;
      if (allRight) {
        sfx.chord();
        const earned = Object.values(firstTry).reduce((t, v) => t + (v ? 10 : 5), 0);
        recordScore('benefits', earned, 90);
        configureCheck(false, false);
        setTimeout(() => stationComplete('benefits', 'All nine benefits filed under the correct strand. In the exam, organising your answer social → economic → environmental is exactly what the mark scheme rewards.'), 800);
      } else { sfx.err(); refresh(); }
    });
  }

  /* =====================  Station 4 — Shadow Files (cork board)  ===================== */
  function buildShadow() {
    $('#station-intro').textContent = 'Night falls on the audit. Ten pieces of evidence point to the negative side of ecotourism. Drag the red thread from each evidence card to the concept it proves — the five named concepts come straight from the CCEA spec. Connect all ten, then press Check.';
    const body = $('#station-body');
    const wrap = el('div', 'board-wrap'); body.appendChild(wrap);
    const board = el('div', 'corkboard'); wrap.appendChild(board);

    const pinsRow = el('div', 'board-pins'); board.appendChild(pinsRow);
    DATA.shadow.pins.forEach((p, i) => {
      const pin = el('div', 'board-pin');
      pin.dataset.pin = p.id;
      pin.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * (0.6 + i * 0.2)) + 'deg');
      pin.innerHTML = '<span class="pin-dot" aria-hidden="true"></span>' + p.label + '<span class="pin-strand">' + p.strand + '</span>';
      pin.setAttribute('aria-label', 'Concept pin: ' + p.label);
      pinsRow.appendChild(pin);
    });

    const cardsGrid = el('div', 'board-cards'); board.appendChild(cardsGrid);
    const links = {}; // cardId -> pinId
    const firstTry = {}; let checked = false;
    const status = el('p', 'board-status', 'Threads connected: 0 of ' + DATA.shadow.cards.length);
    wrap.appendChild(status);

    // yarn overlay
    const yarn = document.createElementNS(SVG_NS, 'svg');
    yarn.setAttribute('class', 'yarn-svg');
    board.appendChild(yarn);
    let tempPath = null;

    function boardPoint(clientX, clientY) {
      const r = board.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    }
    function anchorPoint(node) {
      const r = node.getBoundingClientRect();
      return boardPoint(r.left + r.width / 2, r.top + r.height / 2);
    }
    function yarnD(a, b) {
      const mx = (a.x + b.x) / 2, my = Math.max(a.y, b.y) + 26; // sag
      return 'M' + a.x + ',' + a.y + ' Q' + mx + ',' + my + ' ' + b.x + ',' + b.y;
    }
    function redraw(grades) {
      yarn.setAttribute('width', board.offsetWidth);
      yarn.setAttribute('height', board.offsetHeight);
      yarn.innerHTML = '';
      Object.entries(links).forEach(([cardId, pinId]) => {
        const card = cardsGrid.querySelector('[data-card="' + cardId + '"]');
        const pin = pinsRow.querySelector('[data-pin="' + pinId + '"] .pin-dot');
        if (!card || !pin) return;
        const a = anchorPoint(card.querySelector('.thread-anchor'));
        const b = anchorPoint(pin);
        const path = document.createElementNS(SVG_NS, 'path');
        let cls = 'yarn-line';
        if (grades && cardId in grades) cls += grades[cardId] ? ' right' : ' wrong';
        if (card.classList.contains('thread-right')) cls = 'yarn-line right';
        path.setAttribute('class', cls);
        path.setAttribute('d', yarnD(a, b));
        yarn.appendChild(path);
      });
      if (tempPath) yarn.appendChild(tempPath);
    }
    window.addEventListener('resize', () => redraw());

    shuffle(DATA.shadow.cards).forEach((c, i) => {
      const card = el('div', 'evidence-card');
      card.dataset.card = c.id; card.dataset.target = c.target;
      card.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * (0.4 + (i % 3) * 0.35)) + 'deg');
      card.innerHTML = c.text + '<span class="thread-anchor" aria-label="Drag this thread to a concept pin" tabindex="0" role="button"></span>';
      cardsGrid.appendChild(card);

      const anchor = card.querySelector('.thread-anchor');
      let dragId = null;
      anchor.addEventListener('pointerdown', e => {
        if (card.classList.contains('thread-right')) return;
        e.preventDefault(); e.stopPropagation();
        dragId = e.pointerId;
        try { anchor.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
        document.body.classList.add('dragging-active');
        autoScroll.start();
        tempPath = document.createElementNS(SVG_NS, 'path');
        tempPath.setAttribute('class', 'yarn-line');
        redraw();
      });
      anchor.addEventListener('pointermove', e => {
        if (dragId !== e.pointerId || !tempPath) return;
        const a = anchorPoint(anchor);
        const b = boardPoint(e.clientX, e.clientY);
        tempPath.setAttribute('d', yarnD(a, b));
        autoScroll.update(e.clientY);
        $$('.board-pin', pinsRow).forEach(p => p.classList.remove('drop-hover'));
        const stack = document.elementsFromPoint(e.clientX, e.clientY);
        for (const elx of stack) { const p = elx.closest && elx.closest('.board-pin'); if (p) { p.classList.add('drop-hover'); break; } }
      });
      function endThread(e) {
        if (dragId !== e.pointerId) return;
        try { anchor.releasePointerCapture(e.pointerId); } catch (err) { /* ok */ }
        dragId = null;
        autoScroll.stop();
        document.body.classList.remove('dragging-active');
        $$('.board-pin', pinsRow).forEach(p => p.classList.remove('drop-hover'));
        tempPath = null;
        let hitPin = null;
        if (e.type !== 'pointercancel') {
          const stack = document.elementsFromPoint(e.clientX, e.clientY);
          for (const elx of stack) { const p = elx.closest && elx.closest('.board-pin'); if (p) { hitPin = p; break; } }
        }
        if (hitPin) {
          links[c.id] = hitPin.dataset.pin;
          card.classList.add('linked');
          card.classList.remove('thread-wrong');
          sfx.snap();
        }
        redraw();
        const n = Object.keys(links).length;
        status.textContent = 'Threads connected: ' + n + ' of ' + DATA.shadow.cards.length;
        configureCheck(true, n === DATA.shadow.cards.length, checked ? 'Check again' : 'Check the board');
      }
      anchor.addEventListener('pointerup', endThread);
      anchor.addEventListener('pointercancel', endThread);
    });

    configureCheck(true, false, 'Check the board');
    onCheck(() => {
      let allRight = true;
      const grades = {};
      DATA.shadow.cards.forEach(c => {
        const card = cardsGrid.querySelector('[data-card="' + c.id + '"]');
        if (card.classList.contains('thread-right')) { grades[c.id] = true; return; }
        const right = links[c.id] === c.target;
        grades[c.id] = right;
        if (right) {
          card.classList.add('thread-right');
          if (!(c.id in firstTry)) firstTry[c.id] = !checked;
          const pin = DATA.shadow.pins.find(p => p.id === c.target);
          addNote('shadow-' + c.id, 'Negative impacts', '<strong>[' + pin.label + ']</strong> ' + c.text + ' — ' + c.why);
        } else {
          allRight = false;
          card.classList.add('thread-wrong');
          setTimeout(() => card.classList.remove('thread-wrong'), 600);
          if (!(c.id in firstTry)) firstTry[c.id] = false;
          delete links[c.id]; // cut the wrong thread so it can be re-tied
          card.classList.remove('linked');
        }
      });
      checked = true;
      redraw(grades);
      const n = Object.keys(links).length;
      status.textContent = allRight ? 'Case closed — every thread holds.' : 'Wrong threads have been cut — re-tie them. Connected: ' + n + ' of ' + DATA.shadow.cards.length;
      if (allRight) {
        sfx.chord();
        const earned = Object.values(firstTry).reduce((t, v) => t + (v ? 10 : 5), 0);
        recordScore('shadow', earned, 100);
        configureCheck(false, false);
        setTimeout(() => stationComplete('shadow', 'The board is solved. Displacement, threats to indigenous cultures, leakage, greenwashing, damage to fragile environments — you can now pin real Monteverde evidence to every concept the spec names.'), 900);
      } else {
        sfx.err();
        configureCheck(true, n === DATA.shadow.cards.length, 'Check again');
      }
    });
  }

  /* =====================  Station 5 — However workshop  ===================== */
  function buildHowever() {
    $('#station-intro').textContent = 'Describing impacts gets you to Level 2. Evaluating them gets you to Level 3. Pair every claim with the “however…” that genuinely challenges it. Two of the cards are true facts — but they counter nothing, so leave them in the tray.';
    const body = $('#station-body');
    const wrap = el('div', 'however-wrap'); body.appendChild(wrap);

    const advisor = el('div', 'advisor-box');
    advisor.innerHTML = '<span class="advisor-icon" aria-hidden="true">🖋️</span><div><strong>From the CCEA Geography advisor:</strong> ' + DATA.however.advisor + '</div>';
    wrap.appendChild(advisor);

    const grid = el('div', 'claims-grid'); wrap.appendChild(grid);
    shuffle(DATA.however.claims).forEach(cl => {
      const row = el('div', 'claim-row');
      row.appendChild(el('p', 'claim-text', cl.text));
      const zone = el('div', 'dropzone counter-zone');
      zone.dataset.claim = cl.id;
      zone.setAttribute('aria-label', 'Drop a counterpoint here');
      row.appendChild(zone);
      grid.appendChild(row);
    });

    const tray = el('div', 'tray');
    tray.appendChild(el('p', 'tray-label', 'Counterpoint cards — two of these counter nothing'));
    wrap.appendChild(tray);

    const firstTry = {}; let checked = false;
    shuffle(DATA.however.counters).forEach(k => {
      const chip = el('div', 'chip counter-chip', k.text);
      chip.dataset.id = k.id;
      tray.appendChild(chip);
      enableDrag(chip, {
        zoneSelector: '#screen-station .counter-zone, #screen-station .tray',
        onDrop(ch, zone) {
          if (zone.classList.contains('counter-zone')) {
            const occupant = zone.querySelector('.chip');
            if (occupant) tray.appendChild(occupant);
          }
          zone.appendChild(ch);
        },
        onMoved: refresh
      });
    });

    function allFilled() { return $$('.counter-zone', grid).every(z => z.querySelector('.chip')); }
    function refresh() { configureCheck(true, allFilled(), checked ? 'Check again' : 'Check my pairings'); }
    refresh();

    onCheck(() => {
      let allRight = true;
      $$('.counter-zone', grid).forEach(zone => {
        const chip = zone.querySelector('.chip');
        if (!chip || chip.classList.contains('locked')) return;
        const claim = DATA.however.claims.find(c => c.id === zone.dataset.claim);
        const right = chip.dataset.id === claim.counterId;
        if (right) {
          chip.classList.add('locked');
          if (!(claim.id in firstTry)) firstTry[claim.id] = !checked;
          addNote('how-' + claim.id, 'Evaluation toolkit', '<strong>Claim:</strong> ' + claim.text + '<br><strong>' +
            DATA.however.counters.find(k => k.id === claim.counterId).text + '</strong>');
        } else {
          allRight = false;
          chip.classList.add('wrong');
          setTimeout(() => chip.classList.remove('wrong'), 450);
          if (!(claim.id in firstTry)) firstTry[claim.id] = false;
        }
      });
      checked = true;
      if (allRight) {
        sfx.chord();
        wrap.appendChild(el('div', 'feedback-note', DATA.however.decoyNote));
        const earned = Object.values(firstTry).reduce((t, v) => t + (v ? 10 : 5), 0);
        recordScore('however', earned, 60);
        configureCheck(false, false);
        setTimeout(() => stationComplete('however', 'Six perfect counterpoints. Use exactly this rhythm in your essays — point, evidence, “however…” — and the judgement marks follow.'), 900);
      } else { sfx.err(); refresh(); }
    });
  }

  /* =====================  Station 6 — Examiner's desk  ===================== */
  function buildExaminer() {
    $('#station-intro').textContent = 'Real answers, real examiner verdicts — adapted from CCEA exemplification material. Read each response, award the level you believe it earned, then diagnose why. One attempt at each decision.';
    const body = $('#station-body');
    const wrap = el('div', 'exam-wrap'); body.appendChild(wrap);

    let ri = 0; let earned = 0; const possible = 50;
    function renderRound() {
      wrap.innerHTML = '';
      const r = DATA.examiner.rounds[ri];
      wrap.appendChild(el('p', 'exam-round-tag', 'Script ' + (ri + 1) + ' of ' + DATA.examiner.rounds.length));
      const paper = el('div', 'exam-paper');
      paper.appendChild(el('p', 'exam-q', r.question));
      paper.appendChild(el('p', 'exam-answer', r.answer));
      wrap.appendChild(paper);

      if (r.pickThree) { renderPickThree(r); return; }

      const stampBox = el('div');
      stampBox.appendChild(el('h4', '', 'Award the level:')).style.cssText = 'text-align:center;color:var(--ols-blue);';
      const stamps = el('div', 'level-stamps'); stampBox.appendChild(stamps);
      wrap.appendChild(stampBox);
      r.levels.forEach((lv, i) => {
        const b = el('button', 'level-stamp', 'LEVEL ' + lv.level + '<small>' + lv.marks + ' marks</small>');
        b.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * 1.6) + 'deg');
        b.addEventListener('click', () => {
          $$('.level-stamp', stamps).forEach(x => { x.disabled = true; });
          const right = lv.level === r.correctLevel;
          if (right) { b.classList.add('picked-right'); sfx.stamp(); earned += 10; }
          else {
            b.classList.add('picked-wrong'); sfx.err();
            $$('.level-stamp', stamps).forEach((x, xi) => { if (r.levels[xi].level === r.correctLevel) x.classList.add('picked-right'); });
          }
          const v = el('div', 'exam-verdict', '<span class="verdict-award">Examiner’s award: ' + r.awarded + '.</span>');
          wrap.appendChild(v);
          setTimeout(() => renderWhy(r), 600);
        });
        stamps.appendChild(b);
      });
    }
    function renderWhy(r) {
      const why = el('div', 'exam-why gate-panel');
      why.appendChild(el('h4', '', 'Why did the examiner award that? Choose the comment that matches the real one:'));
      const pg = el('div', 'pick-grid'); why.appendChild(pg);
      shuffle(r.whyOptions).forEach(o => {
        const b = el('button', 'quiz-option', o.text);
        b.addEventListener('click', () => {
          $$('.quiz-option', pg).forEach(x => { x.disabled = true; });
          if (o.correct) { b.classList.add('right'); sfx.snap(); earned += 10; }
          else {
            b.classList.add('wrong-pick'); sfx.err();
            $$('.quiz-option', pg).forEach(x => { if (r.whyOptions.find(oo => oo.text === x.textContent && oo.correct)) x.classList.add('right'); });
          }
          why.appendChild(el('div', 'feedback-note', '<strong>Marker’s lesson:</strong> ' + r.lesson));
          addNote('exam-' + ri, 'Evaluation toolkit', '<strong>Examiner’s lesson:</strong> ' + r.lesson);
          const next = el('button', 'primary-btn', ri < DATA.examiner.rounds.length - 1 ? 'Next script →' : 'File my marking report ✔');
          next.style.marginTop = '12px';
          next.addEventListener('click', () => {
            ri++;
            if (ri < DATA.examiner.rounds.length) renderRound();
            else {
              recordScore('examiner', earned, possible);
              stationComplete('examiner', 'You have seen Monteverde through the examiner’s eyes: depth on both halves of a question, use the resource early, and always finish with a judgement.');
            }
          });
          why.appendChild(next);
        });
        pg.appendChild(b);
      });
      wrap.appendChild(why);
      why.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function renderPickThree(r) {
      const why = el('div', 'exam-why gate-panel');
      why.appendChild(el('h4', '', 'Pick the THREE features that make this top-level evaluation:'));
      const pg = el('div', 'pick-grid'); why.appendChild(pg);
      const picked = new Set();
      const submit = el('button', 'primary-btn', 'Confirm my three');
      submit.disabled = true; submit.style.marginTop = '12px';
      shuffle(r.pickThree).forEach((o, i) => {
        const b = el('button', 'quiz-option', o.text);
        b.dataset.correct = o.correct ? '1' : '';
        b.addEventListener('click', () => {
          if (picked.has(b)) { picked.delete(b); b.style.borderColor = ''; b.style.background = ''; }
          else if (picked.size < 3) { picked.add(b); b.style.borderColor = 'var(--ols-blue)'; b.style.background = '#F0F4FB'; }
          submit.disabled = picked.size !== 3;
        });
        pg.appendChild(b);
      });
      submit.addEventListener('click', () => {
        $$('.quiz-option', pg).forEach(x => { x.disabled = true; });
        let rightCount = 0;
        picked.forEach(b => { if (b.dataset.correct) { b.classList.add('right'); rightCount++; } else b.classList.add('wrong-pick'); });
        $$('.quiz-option', pg).forEach(x => { if (x.dataset.correct && !picked.has(x)) x.classList.add('right'); });
        earned += (rightCount === 3 ? 10 : rightCount >= 2 ? 5 : 0);
        if (rightCount === 3) sfx.chord(); else sfx.err();
        why.appendChild(el('div', 'feedback-note', '<strong>Marker’s lesson:</strong> ' + r.lesson));
        addNote('exam-' + ri, 'Evaluation toolkit', '<strong>Examiner’s lesson:</strong> ' + r.lesson);
        const next = el('button', 'primary-btn', 'File my marking report ✔');
        next.style.marginTop = '12px';
        next.addEventListener('click', () => {
          recordScore('examiner', earned, possible);
          stationComplete('examiner', 'You have seen Monteverde through the examiner’s eyes: depth on both halves of a question, use the resource early, and always finish with a judgement.');
        });
        why.appendChild(next);
        submit.remove();
      });
      why.appendChild(submit);
      wrap.appendChild(why);
    }
    renderRound();
  }

  /* =====================  Station 7 — The Verdict  ===================== */
  function buildVerdict() {
    $('#station-intro').textContent = 'The audit is complete — now weigh it. Place each piece of evidence on the side of the scales it really belongs to. Then deliver your verdict: any judgement is defensible, as long as you can justify it.';
    const body = $('#station-body');
    const wrap = el('div', 'verdict-wrap'); body.appendChild(wrap);

    // Scales SVG
    const scalesZone = el('div', 'scales-zone');
    const sw = el('div', 'scales-svg-wrap');
    sw.innerHTML =
      '<svg viewBox="0 0 620 300" xmlns="' + SVG_NS + '" aria-hidden="true">' +
      '<defs><linearGradient id="vs-brass" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#F5D45E"/><stop offset="1" stop-color="#C49A1E"/></linearGradient></defs>' +
      '<rect x="270" y="270" width="80" height="14" rx="6" fill="url(#vs-brass)"/>' +
      '<rect x="303" y="100" width="14" height="175" rx="6" fill="url(#vs-brass)"/>' +
      '<circle cx="310" cy="96" r="11" fill="url(#vs-brass)" stroke="#9A7A12" stroke-width="2"/>' +
      '<g id="vs-beam" class="scale-beam-group">' +
      '<rect x="80" y="90" width="460" height="11" rx="5" fill="url(#vs-brass)"/>' +
      '<g id="vs-panL" class="scale-pan-group">' +
      '<line x1="95" y1="100" x2="70" y2="170" stroke="#9A7A12" stroke-width="2.5"/>' +
      '<line x1="95" y1="100" x2="120" y2="170" stroke="#9A7A12" stroke-width="2.5"/>' +
      '<path d="M55,170 Q95,205 135,170 Z" fill="url(#vs-brass)" stroke="#9A7A12" stroke-width="2"/>' +
      '<text id="vs-countL" x="95" y="193" text-anchor="middle" font-size="15" font-weight="900" fill="#5C470E">0</text>' +
      '<text x="95" y="232" text-anchor="middle" font-size="13" font-weight="800" fill="#2E7D4F">BENEFITS</text></g>' +
      '<g id="vs-panR" class="scale-pan-group">' +
      '<line x1="525" y1="100" x2="500" y2="170" stroke="#9A7A12" stroke-width="2.5"/>' +
      '<line x1="525" y1="100" x2="550" y2="170" stroke="#9A7A12" stroke-width="2.5"/>' +
      '<path d="M485,170 Q525,205 565,170 Z" fill="url(#vs-brass)" stroke="#9A7A12" stroke-width="2"/>' +
      '<text id="vs-countR" x="525" y="193" text-anchor="middle" font-size="15" font-weight="900" fill="#5C470E">0</text>' +
      '<text x="525" y="232" text-anchor="middle" font-size="13" font-weight="800" fill="#C0392B">NEGATIVES</text></g>' +
      '</g></svg>';
    scalesZone.appendChild(sw);
    wrap.appendChild(scalesZone);

    const pans = el('div', 'pans-row');
    const posZone = el('div', 'dropzone pan-zone'); posZone.dataset.side = 'pos';
    posZone.innerHTML = '<div class="pan-zone-head pos">⊕ Benefits pan</div>';
    const negZone = el('div', 'dropzone pan-zone'); negZone.dataset.side = 'neg';
    negZone.innerHTML = '<div class="pan-zone-head neg">⊖ Negatives pan</div>';
    pans.appendChild(posZone); pans.appendChild(negZone);
    wrap.appendChild(pans);

    const tray = el('div', 'tray');
    tray.appendChild(el('p', 'tray-label', 'Final evidence — weigh every piece'));
    wrap.appendChild(tray);

    function tip() {
      const pos = posZone.querySelectorAll('.chip').length;
      const neg = negZone.querySelectorAll('.chip').length;
      $('#vs-countL').textContent = pos;
      $('#vs-countR').textContent = neg;
      const angle = Math.max(-12, Math.min(12, (neg - pos) * 3));
      $('#vs-beam').style.transform = 'rotate(' + angle + 'deg)';
      // counter-rotate pans about their hanging points so they stay level
      $('#vs-panL').style.transformOrigin = '95px 100px';
      $('#vs-panR').style.transformOrigin = '525px 100px';
      $('#vs-panL').style.transform = 'rotate(' + (-angle) + 'deg)';
      $('#vs-panR').style.transform = 'rotate(' + (-angle) + 'deg)';
    }

    const firstTry = {}; let checked = false;
    shuffle(DATA.verdict.chips).forEach(c => {
      const chip = el('div', 'chip verdict-chip', c.text);
      chip.dataset.id = c.id; chip.dataset.side = c.side;
      tray.appendChild(chip);
      enableDrag(chip, {
        zoneSelector: '#screen-station .pan-zone, #screen-station .tray',
        onDrop(ch, zone) { zone.appendChild(ch); tip(); },
        onMoved: refresh
      });
    });
    function refresh() {
      tip();
      configureCheck(true, !tray.querySelector('.chip'), checked ? 'Check again' : 'Weigh the evidence');
    }
    refresh();

    onCheck(() => {
      let allRight = true;
      $$('.pan-zone .chip', pans).forEach(chip => {
        if (chip.classList.contains('locked')) return;
        const zone = chip.closest('.pan-zone');
        const right = chip.dataset.side === zone.dataset.side;
        if (right) {
          chip.classList.add('locked');
          if (!(chip.dataset.id in firstTry)) firstTry[chip.dataset.id] = !checked;
        } else {
          allRight = false;
          chip.classList.add('wrong');
          setTimeout(() => chip.classList.remove('wrong'), 450);
          if (!(chip.dataset.id in firstTry)) firstTry[chip.dataset.id] = false;
        }
      });
      checked = true;
      if (allRight) {
        sfx.chord();
        const earned = Object.values(firstTry).reduce((t, v) => t + (v ? 10 : 5), 0);
        recordScore('verdict', earned, 80);
        configureCheck(false, false);
        setTimeout(showVerdictChoice, 700);
      } else { sfx.err(); refresh(); }
    });

    function showVerdictChoice() {
      const panel = el('div', 'gate-panel');
      panel.innerHTML = '<h3>Deliver your verdict</h3><p class="panel-sub">The 2024 exam asked: are the positive impacts greater than the negative? There is no single right answer — examiners reward a clear, justified judgement.</p>';
      const cards = el('div', 'verdict-cards'); panel.appendChild(cards);
      DATA.verdict.verdicts.forEach(v => {
        const card = el('button', 'verdict-card');
        card.innerHTML = '<h4>' + v.label + '</h4><p>' + v.text + '</p>';
        card.addEventListener('click', () => {
          $$('.verdict-card', cards).forEach(x => { x.classList.remove('chosen'); x.disabled = true; });
          card.classList.add('chosen');
          sfx.stamp();
          const reveal = el('div', 'conclusion-reveal');
          reveal.innerHTML =
            '<h4>Your examiner’s view of that verdict</h4>' +
            '<div class="feedback-note">' + v.feedback + '</div>' +
            '<h4 style="margin-top:14px">The model concluding statement</h4>' +
            '<blockquote>' + DATA.verdict.conclusion + '</blockquote>' +
            '<div class="feedback-note">' + DATA.verdict.advisorReminder + '</div>';
          wrap.appendChild(reveal);
          addNote('verdict-conc', 'Evaluation toolkit', '<strong>Model conclusion:</strong> ' + DATA.verdict.conclusion);
          const fin = el('button', 'primary-btn big-btn', 'Stamp the final report 🏆');
          fin.style.cssText = 'margin:16px auto 0;display:block;';
          fin.addEventListener('click', () => {
            stationComplete('verdict', 'Audit complete. You weighed the evidence, made a judgement and justified it — the exact skill the 18-mark evaluation questions demand.');
          });
          wrap.appendChild(fin);
          reveal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        cards.appendChild(card);
      });
      wrap.appendChild(panel);
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const BUILDERS = {
    gate: buildGate, canopy: buildCanopy, benefits: buildBenefits,
    shadow: buildShadow, however: buildHowever, examiner: buildExaminer, verdict: buildVerdict
  };

  /* =====================  Results + celebration  ===================== */
  function celebrate() {
    sfx.chord();
    const conf = el('div', 'leaf-confetti');
    const glyphs = ['🍃', '🌿', '🍂', '🦋', '🌸'];
    for (let i = 0; i < 36; i++) {
      const leaf = el('span', 'leaf', glyphs[i % glyphs.length]);
      leaf.style.left = (Math.random() * 100) + 'vw';
      leaf.style.setProperty('--lf-dur', (3 + Math.random() * 3) + 's');
      leaf.style.setProperty('--lf-delay', (Math.random() * 1.4) + 's');
      conf.appendChild(leaf);
    }
    document.body.appendChild(conf);
    const q = el('div', 'quetzal-flyby', '🦚');
    document.body.appendChild(q);
    setTimeout(() => { conf.remove(); q.remove(); }, 7500);
  }

  function showResults() {
    const scored = Object.values(state.scores).filter(s => s.possible > 0);
    const earned = scored.reduce((t, s) => t + s.earned, 0);
    const possible = scored.reduce((t, s) => t + s.possible, 0);
    const pct = possible ? Math.round((earned / possible) * 100) : 0;
    let rank = DATA.ranks[0];
    DATA.ranks.forEach(r => { if (pct >= r.min) rank = r; });
    $('#results-rank').textContent = rank.icon + ' ' + rank.name;
    $('#results-scoreline').textContent = 'Audit accuracy: ' + pct + '% · ' + earned + ' of ' + possible + ' points';

    const bd = $('#results-breakdown');
    bd.innerHTML = '';
    STATIONS.forEach(s => {
      const sc = state.scores[s.id];
      if (!sc || !sc.possible) return;
      const p = Math.round((sc.earned / sc.possible) * 100);
      const row = el('div', 'rb-row');
      row.innerHTML = '<span class="rb-name">' + s.icon + ' ' + s.map + '</span>' +
        '<span class="rb-bar-track"><span class="rb-bar" data-w="' + p + '"></span></span>' +
        '<span class="rb-pct">' + p + '%</span>';
      bd.appendChild(row);
    });

    const papers = $('#results-papers-list');
    papers.innerHTML = '';
    DATA.pastPapers.forEach(p => {
      papers.appendChild(el('div', 'paper-row', '<span class="paper-year">' + p.year + '</span><span>' + p.focus + '</span>'));
    });

    show('results');
    celebrate();
    setTimeout(() => { $$('.rb-bar', bd).forEach(b => { b.style.width = b.dataset.w + '%'; }); }, 350);
  }

  /* =====================  Briefing  ===================== */
  function renderBriefing() {
    $('#briefing-mission').textContent = DATA.briefing.mission;
    const d = $('#briefing-dossier');
    d.innerHTML = '';
    DATA.briefing.dossier.forEach((item, i) => {
      const n = el('div', 'dossier-item',
        '<span class="dossier-icon" aria-hidden="true">' + item.icon + '</span>' +
        '<span><p class="dossier-label">' + item.label + '</p><p class="dossier-value">' + item.value + '</p></span>');
      n.style.setProperty('--d', (0.15 + i * 0.12) + 's');
      d.appendChild(n);
    });
    // fireflies
    const ff = $('.fireflies');
    ff.innerHTML = '';
    for (let i = 0; i < 14; i++) {
      const f = el('span', 'firefly');
      f.style.left = (5 + Math.random() * 90) + '%';
      f.style.top = (5 + Math.random() * 88) + '%';
      f.style.setProperty('--ff-dur', (7 + Math.random() * 7) + 's');
      f.style.setProperty('--ff-delay', (Math.random() * 4) + 's');
      ff.appendChild(f);
    }
    const hasProgress = state.completed.length > 0;
    $('#btn-resume').hidden = !hasProgress;
    $('#btn-begin').textContent = hasProgress ? 'Start a fresh audit ↺' : 'Fly to Costa Rica ✈';
  }

  /* =====================  Init / wiring  ===================== */
  function init() {
    load();
    renderBriefing();
    renderNotebook();
    setupNotebook();
    updateScoreBadge();

    $('#btn-begin').addEventListener('click', () => {
      if (state.completed.length > 0) resetAll();
      runFlight();
    });
    $('#btn-resume').addEventListener('click', () => { renderTrailMap(); show('map'); });
    $('#btn-skip-flight').addEventListener('click', endFlight);
    $('#screen-flight').addEventListener('click', endFlight); // tap anywhere to skip

    $('#btn-back-map').addEventListener('click', () => { renderTrailMap(); show('map'); });
    $('#btn-check').addEventListener('click', () => { if (checkHandler) checkHandler(); });
    $('#btn-done-continue').addEventListener('click', () => {
      $('#station-done').hidden = true;
      if (state.completed.length === STATIONS.length) showResults();
      else { renderTrailMap(); show('map'); }
    });

    let restartArmed = false;
    $('#btn-restart').addEventListener('click', e => {
      const b = e.currentTarget;
      if (!restartArmed) { restartArmed = true; b.textContent = 'Tap again to confirm ↺'; setTimeout(() => { restartArmed = false; b.textContent = '↺ Restart expedition'; }, 2600); }
      else { resetAll(); restartArmed = false; b.textContent = '↺ Restart expedition'; renderBriefing(); show('briefing'); }
    });
    $('#btn-play-again').addEventListener('click', () => { resetAll(); renderBriefing(); show('briefing'); });

    show('briefing');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
