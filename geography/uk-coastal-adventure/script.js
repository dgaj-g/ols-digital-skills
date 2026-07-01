/* =========================================================================
   UK Coastal Adventure — engine
   OLS Digital Skills. Pointer Events drag model throughout (mouse+touch+pen).
   Drag engine, autoscroll and selection lock reused from the Costa Rica build.
   ========================================================================= */
(function () {
  'use strict';

  /* =====================  Utilities  ===================== */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; }
  const MAP = window.UK_MAP || { width: 644, height: 820, paths: [], markers: {} };

  /* =====================  Audio (Web Audio, lazy)  ===================== */
  let audioCtx = null;
  function ctx() { if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; } } return audioCtx; }
  function tone(freq, type, dur, delay, vol) {
    const c = ctx(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const sfx = {
    snap() { tone(660, 'sine', 0.1); tone(990, 'sine', 0.1, 0.07); },
    err() { tone(200, 'square', 0.07, 0, 0.06); },
    good() { tone(880, 'sine', 0.12); tone(1320, 'sine', 0.16, 0.09, 0.11); },
    stamp() { tone(150, 'sine', 0.18, 0, 0.25); tone(90, 'sine', 0.22, 0.02, 0.2); },
    chord() { [523.25, 659.25, 783.99].forEach((f, i) => tone(f, 'sine', 0.55, i * 0.11, 0.13)); },
    arrive() { [440, 554, 659, 880].forEach((f, i) => tone(f, 'sine', 0.3, i * 0.09, 0.12)); }
  };

  /* =====================  State + persistence  ===================== */
  const SAVE_KEY = 'ols-uk-coasts-v1';
  let state = freshState();
  function freshState() { return { completed: [], scores: {}, logs: {}, seenVoyage: false, points: 0 }; }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
  function load() { try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.completed)) state = Object.assign(freshState(), s); } } catch (e) {} }
  function resetAll() { state = freshState(); try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  const STOPS = DATA.stops;
  const stopById = id => STOPS.find(s => s.id === id);

  /* =====================  Score handling  ===================== */
  function recordScore(id, earned, possible) {
    state.scores[id] = { earned, possible };
    state.points = Object.values(state.scores).reduce((t, s) => t + s.earned, 0);
    save(); updateScoreBadge();
  }
  function updateScoreBadge() { const b = $('#stop-score'); if (b) b.textContent = state.points + ' pts'; }

  /* =====================  Passport (stamps + logs)  ===================== */
  function saveLog(id, text) { state.logs[id] = text; save(); }
  function popFab() { const fab = $('#passport-fab'); fab.classList.remove('pop'); void fab.offsetWidth; fab.classList.add('pop'); }
  function renderPassport() {
    const body = $('#passport-body'); body.innerHTML = '';
    const visited = STOPS.filter(s => state.completed.includes(s.id));
    if (!visited.length) { body.appendChild(el('p', 'pp-empty', 'No stamps yet — complete a stop on the map and your findings appear here.')); }
    visited.forEach(s => {
      const entry = el('div', 'pp-entry proc-' + s.process);
      const logTxt = (state.logs[s.id] || '').trim();
      entry.innerHTML =
        '<div class="pp-stamp" aria-hidden="true">' + s.icon + '</div>' +
        '<h4>' + s.num + '. ' + s.name + '</h4>' +
        '<p class="pp-region">' + s.region + ' · ' + s.landform + ' · ' + s.process + '</p>' +
        '<p class="pp-fact">' + s.fact.icon + ' ' + s.fact.text + '</p>' +
        '<div class="pp-log">' + (logTxt ? '<strong>My note:</strong> ' + escapeHtml(logTxt) : '<em>No note written for this stop.</em>') + '</div>';
      body.appendChild(entry);
    });
    const extLog = (state.logs['extension'] || '').trim();
    if (extLog) {
      const e = el('div', 'pp-entry proc-Erosion');
      e.innerHTML = '<div class="pp-stamp" aria-hidden="true">⭐</div><h4>Extension — my own stop</h4>' +
        '<div class="pp-log"><strong>My research:</strong> ' + escapeHtml(extLog) + '</div>';
      body.appendChild(e);
    }
    $('#passport-count').textContent = state.completed.length;
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function setupPassport() {
    const fab = $('#passport-fab'), drawer = $('#passport-drawer'), scrim = $('#passport-scrim');
    function open() { renderPassport(); drawer.hidden = false; scrim.hidden = false; }
    function close() { drawer.hidden = true; scrim.hidden = true; }
    fab.addEventListener('click', open);
    scrim.addEventListener('click', close);
    $('#btn-close-passport').addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    $('#btn-open-passport-end').addEventListener('click', open);
    $('#btn-print-drawer').addEventListener('click', printPassport);
    $('#btn-print').addEventListener('click', printPassport);
  }
  function printPassport() {
    const root = $('#print-root'); root.innerHTML = '';
    const page = el('div', 'pr-page');
    page.appendChild(el('div', 'pr-head', '<h1>My Coastal Explorer Passport</h1><p>A Journey Around the UK Coastline · OLS Digital Skills</p>'));
    const visited = STOPS.filter(s => state.completed.includes(s.id));
    if (!visited.length) page.appendChild(el('p', '', 'No stops completed yet.'));
    visited.forEach(s => {
      const logTxt = (state.logs[s.id] || '').trim();
      const e = el('div', 'pr-entry');
      e.innerHTML = '<h3>' + s.icon + ' ' + s.num + '. ' + s.name + '</h3>' +
        '<p class="pr-meta">' + s.region + ' &middot; ' + s.landform + ' &middot; formed by ' + s.process + '</p>' +
        '<p class="pr-fact">' + s.fact.text + '</p>' +
        '<p class="pr-log"><strong>My note:</strong> ' + (logTxt ? escapeHtml(logTxt) : '________________________________________') + '</p>';
      page.appendChild(e);
    });
    const extLog = (state.logs['extension'] || '').trim();
    if (extLog) {
      const e = el('div', 'pr-entry');
      e.innerHTML = '<h3>⭐ Extension — my own stop</h3><p class="pr-log">' + escapeHtml(extLog) + '</p>';
      page.appendChild(e);
    }
    root.appendChild(page);
    root.classList.add('printing');
    setTimeout(() => { window.print(); setTimeout(() => root.classList.remove('printing'), 400); }, 60);
  }

  /* =====================  Screen router  ===================== */
  const SCREENS = ['briefing', 'voyage', 'map', 'stop', 'results'];
  function show(name) {
    SCREENS.forEach(s => { const sc = $('#screen-' + s); if (sc) sc.hidden = (s !== name); });
    $('#passport-fab').hidden = (name === 'briefing' || name === 'voyage');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* =====================  Selection lock during drags  ===================== */
  document.addEventListener('selectstart', e => { if (document.body.classList.contains('dragging-active')) e.preventDefault(); });

  /* =====================  Edge auto-scroll during drags  ===================== */
  const autoScroll = {
    vel: 0, raf: null,
    start() { if (this.raf) return; const loop = () => { if (this.vel) window.scrollBy({ top: this.vel, behavior: 'instant' }); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); },
    update(y) { const m = 90; this.vel = y < m ? -Math.ceil((m - y) / 5) : y > window.innerHeight - m ? Math.ceil((y - (window.innerHeight - m)) / 5) : 0; },
    stop() { this.vel = 0; if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; }
  };

  /* =====================  Generic drag engine (Pointer Events)  ===================== */
  let keyboardPick = null;
  function enableDrag(chip, opts) {
    chip.style.touchAction = 'none';
    chip.setAttribute('tabindex', '0');
    const ptr = { id: null, startX: 0, startY: 0, moved: false };
    function zonesUnder(x, y) {
      const stack = document.elementsFromPoint(x, y);
      for (const e of stack) { if (e === chip || chip.contains(e)) continue; const z = e.closest ? e.closest(opts.zoneSelector) : null; if (z) return z; }
      return null;
    }
    function clearHover() { $$(opts.zoneSelector).forEach(z => z.classList.remove('drop-hover')); }
    function liftOut(e) {
      const r = chip.getBoundingClientRect();
      chip.style.position = 'fixed'; chip.style.left = r.left + 'px'; chip.style.top = r.top + 'px';
      chip.style.width = r.width + 'px'; chip.style.margin = '0'; chip.style.zIndex = '1000';
      ptr.startX = e.clientX; ptr.startY = e.clientY;
      chip.classList.add('dragging'); document.body.classList.add('dragging-active'); autoScroll.start();
    }
    function unstyle() { chip.classList.remove('dragging'); chip.style.position = ''; chip.style.left = ''; chip.style.top = ''; chip.style.width = ''; chip.style.margin = ''; chip.style.zIndex = ''; chip.style.transform = ''; }
    function onMove(e) {
      if (ptr.id !== e.pointerId) return;
      if (!ptr.moved) { if (Math.hypot(e.clientX - ptr.startX, e.clientY - ptr.startY) < 6) return; ptr.moved = true; liftOut(e); return; }
      chip.style.transform = 'translate(' + (e.clientX - ptr.startX) + 'px,' + (e.clientY - ptr.startY) + 'px) scale(1.05)';
      autoScroll.update(e.clientY); clearHover();
      const z = zonesUnder(e.clientX, e.clientY);
      if (z && (!opts.accepts || opts.accepts(z, chip))) z.classList.add('drop-hover');
    }
    function onUp(e) {
      if (ptr.id !== e.pointerId) return; ptr.id = null;
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onUp);
      autoScroll.stop(); clearHover(); document.body.classList.remove('dragging-active');
      if (!ptr.moved) return;
      const z = (e.type === 'pointercancel') ? null : zonesUnder(e.clientX, e.clientY);
      unstyle();
      if (z && (!opts.accepts || opts.accepts(z, chip))) { opts.onDrop(chip, z); sfx.snap(); }
      else if (e.type !== 'pointercancel') { sfx.err(); }
      chip.classList.add('snap-in'); setTimeout(() => chip.classList.remove('snap-in'), 360);
      if (opts.onMoved) opts.onMoved();
    }
    chip.addEventListener('pointerdown', e => {
      if (chip.classList.contains('locked') || ptr.id !== null) return;
      e.preventDefault(); ptr.id = e.pointerId; ptr.moved = false; ptr.startX = e.clientX; ptr.startY = e.clientY;
      document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onUp);
    });
    // Keyboard fallback. stopPropagation so the pick keypress does not also
    // reach the document-level drop handler (the chip sits inside the tray,
    // which is itself a drop zone — without this it would self-drop and clear
    // the pick, making keyboard-to-slot impossible).
    chip.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); e.stopPropagation();
      if (chip.classList.contains('locked')) return;
      if (keyboardPick && keyboardPick.chip === chip) { chip.style.outline = ''; keyboardPick = null; return; }
      keyboardPick = { chip, opts }; $$('.chip').forEach(c => { c.style.outline = ''; });
      chip.style.outline = '3px solid var(--ols-gold)'; $$(opts.zoneSelector).forEach(z => z.setAttribute('tabindex', '0'));
    });
  }
  document.addEventListener('keydown', e => {
    if ((e.key !== 'Enter' && e.key !== ' ') || !keyboardPick) return;
    if (!keyboardPick.chip.isConnected) { keyboardPick = null; return; } // stale pick from a torn-down stop
    const z = e.target.closest && e.target.closest(keyboardPick.opts.zoneSelector);
    if (!z || !z.isConnected) return; e.preventDefault();
    const { chip, opts } = keyboardPick;
    if (!opts.accepts || opts.accepts(z, chip)) { chip.style.outline = ''; opts.onDrop(chip, z); sfx.snap(); if (opts.onMoved) opts.onMoved(); keyboardPick = null; }
  });

  /* =====================  Check-button helper  ===================== */
  function configureCheck(visible, enabled, label) { const b = $('#btn-check'); b.hidden = !visible; b.disabled = !enabled; if (label) b.textContent = label; }
  let checkHandler = null;
  function onCheck(fn) { checkHandler = fn; }

  /* =====================  Reusable MCQ  ===================== */
  function renderMCQ(container, mcq, onAnswered) {
    const box = el('div', 'mcq');
    box.appendChild(el('p', 'quiz-q', '<strong>' + mcq.q + '</strong>'));
    const opts = el('div', 'quiz-options'); box.appendChild(opts);
    const shuffled = shuffle(mcq.options);
    shuffled.forEach(o => {
      const b = el('button', 'quiz-option', o.text);
      b.addEventListener('click', () => {
        $$('.quiz-option', opts).forEach(x => { x.disabled = true; });
        if (o.correct) { b.classList.add('right'); sfx.good(); }
        else { b.classList.add('wrong-pick'); sfx.err(); $$('.quiz-option', opts).forEach(x => { if (mcq.options.find(oo => oo.text === x.textContent && oo.correct)) x.classList.add('right'); }); }
        box.appendChild(el('div', 'feedback-note', mcq.feedback));
        onAnswered(!!o.correct);
      });
      opts.appendChild(b);
    });
    container.appendChild(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return box;
  }

  /* =====================  Stop chrome  ===================== */
  let currentStop = null;
  function heroBlock(s) {
    const wrap = el('div', 'stop-hero');
    wrap.innerHTML = '<img src="' + s.hero.img + '" alt="' + s.hero.alt + '" />' +
      '<div class="stop-hero-tag">' +
        '<span class="htag">📍 ' + s.region + '</span>' +
        '<span class="htag proc-' + s.process.toLowerCase() + '">' + s.landform + '</span>' +
      '</div>';
    return wrap;
  }
  function logPanel(s) {
    const p = el('div', 'log-panel');
    p.innerHTML = '<h3>📝 Explorer’s Log</h3><p class="log-prompt">' + s.log.prompt + '</p>';
    const ta = el('textarea'); ta.placeholder = s.log.placeholder; ta.value = state.logs[s.id] || '';
    ta.setAttribute('aria-label', 'Your log entry for ' + s.name);
    const saved = el('p', 'log-saved', '');
    let t = null;
    ta.addEventListener('input', () => { saveLog(s.id, ta.value); saved.textContent = 'Saved ✓'; clearTimeout(t); t = setTimeout(() => { saved.textContent = ''; }, 1200); });
    p.appendChild(ta); p.appendChild(saved);
    return p;
  }
  function openStop(id) {
    const s = stopById(id); currentStop = s;
    $('#stop-kicker').textContent = 'Stop ' + s.num + ' of 6 · ' + s.process;
    $('#stop-title').textContent = s.icon + ' ' + s.name;
    if (keyboardPick) { keyboardPick.chip.style.outline = ''; keyboardPick = null; } // drop any in-flight keyboard pick from a previous stop
    const body = $('#stop-body'); body.innerHTML = '';
    $('#btn-stop-next').hidden = true; configureCheck(false, false); checkHandler = null;
    updateScoreBadge(); show('stop');
    body.appendChild(heroBlock(s));
    body.appendChild(el('p', 'stop-summary', s.summary));
    body.appendChild(el('div', 'fact-card', '<span class="fact-ico">' + s.fact.icon + '</span><span class="fact-text">' + s.fact.text + '</span>'));
    BUILDERS[id](s, body);
  }
  function enableStampButton(s, doneText) {
    const btn = $('#btn-stop-next');
    btn.hidden = false; btn.textContent = 'Stamp my passport ' + s.icon;
    btn.onclick = () => stopComplete(s.id, doneText);
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function stopComplete(id, text) {
    const s = stopById(id);
    if (!state.completed.includes(id)) state.completed.push(id);
    save(); sfx.stamp(); popFab(); renderPassport();
    $('#stamp-anim').textContent = s.icon;
    $('#stop-done-title').textContent = 'Passport stamped — ' + s.name;
    $('#stop-done-text').textContent = text;
    $('#stop-done').hidden = false;
  }

  /* =====================  UK map builder  ===================== */
  // Display positions (nudged from true coasts so clustered pins don't overlap;
  // a thin leader line joins each pin to its true coastal dot).
  const DISPLAY = {
    'old-harry':      [566, 772],
    'durdle-door':    [438, 812],
    'chesil':         [300, 792],
    'holderness':     [624, 452],
    'management':     [648, 548],
    'giants-causeway':[110, 322]
  };
  const ORDER = ['old-harry', 'durdle-door', 'chesil', 'holderness', 'management', 'giants-causeway'];
  const CENTER = [322, 410];

  function routeD() {
    // dotted voyage line through display positions, bowing outward into the sea
    const pts = ORDER.map(k => DISPLAY[k]);
    let d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      let nx = mx - CENTER[0], ny = my - CENTER[1];
      const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
      let bow = 70;
      // the long NI crossing bows strongly south (through the Irish Sea) instead of over land
      if (ORDER[i] === 'giants-causeway') { nx = -0.25; ny = 1; bow = 150; }
      const cx = mx + nx * bow, cy = my + ny * bow;
      d += ' Q' + cx.toFixed(0) + ',' + cy.toFixed(0) + ' ' + b[0] + ',' + b[1];
    }
    return d;
  }

  let mapUid = 0;
  function buildMapSVG(interactive) {
    const vb = '-96 -26 836 884';
    const uid = 'landGrad' + (++mapUid);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', vb);
    svg.setAttribute('role', 'img');
    let inner =
      '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#2f5a8c"/><stop offset="1" stop-color="#1a3a6b"/></linearGradient></defs>';
    // land
    MAP.paths.forEach(p => { inner += '<path class="uk-land" fill="url(#' + uid + ')" d="' + p.path + '"/>'; });
    // sea labels
    inner += '<text class="uk-region-label" x="150" y="640" opacity="0.55">IRISH</text>' +
             '<text class="uk-region-label" x="150" y="662" opacity="0.55">SEA</text>' +
             '<text class="uk-region-label" x="640" y="360">NORTH</text>' +
             '<text class="uk-region-label" x="656" y="382">SEA</text>' +
             '<text class="uk-region-label" x="330" y="838">ENGLISH CHANNEL</text>';
    // route
    inner += '<path id="uk-route" class="uk-route" d="' + routeD() + '"/>';
    svg.innerHTML = inner;

    // leaders + stop markers (added as nodes so we can wire events)
    ORDER.forEach((k, i) => {
      const dp = DISPLAY[k], tp = MAP.markers[k] || dp;
      // leader from pin to true coastal dot
      if (Math.hypot(dp[0] - tp[0], dp[1] - tp[1]) > 8) {
        const leader = document.createElementNS(SVG_NS, 'path');
        leader.setAttribute('class', 'uk-stop-leader');
        leader.setAttribute('d', 'M' + dp[0] + ',' + dp[1] + ' L' + tp[0] + ',' + tp[1]);
        leader.setAttribute('stroke', '#6f8199'); leader.setAttribute('stroke-width', '1.2');
        leader.setAttribute('stroke-dasharray', '2 3'); leader.setAttribute('fill', 'none'); leader.setAttribute('opacity', '.75');
        svg.appendChild(leader);
        const tdot = document.createElementNS(SVG_NS, 'circle');
        tdot.setAttribute('cx', tp[0]); tdot.setAttribute('cy', tp[1]); tdot.setAttribute('r', '3.5');
        tdot.setAttribute('fill', '#0e2a4c'); svg.appendChild(tdot);
      }
      const s = stopById(k);
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'uk-stop'); g.dataset.stop = k;
      g.innerHTML =
        '<circle class="stop-ring" cx="' + dp[0] + '" cy="' + dp[1] + '" r="15"/>' +
        '<circle class="stop-dot" cx="' + dp[0] + '" cy="' + dp[1] + '" r="16"/>' +
        '<text class="stop-num" x="' + dp[0] + '" y="' + (dp[1] + 5) + '">' + s.num + '</text>';
      svg.appendChild(g);
    });
    return svg;
  }

  function markMapStates(svg) {
    let activeIdx = ORDER.findIndex(k => !state.completed.includes(k));
    ORDER.forEach((k, i) => {
      const g = svg.querySelector('.uk-stop[data-stop="' + k + '"]'); if (!g) return;
      const done = state.completed.includes(k);
      const isActive = i === activeIdx;
      g.setAttribute('class', 'uk-stop ' + (done ? 'done' : isActive ? 'active' : 'locked'));
      const s = stopById(k);
      g.setAttribute('aria-label', 'Stop ' + s.num + ': ' + s.name + (done ? ' (complete)' : isActive ? ' (next)' : ' (locked)'));
      if (done) g.querySelector('.stop-num').textContent = '✓';
      else g.querySelector('.stop-num').textContent = s.num;
      if (done || isActive) {
        g.setAttribute('tabindex', '0');
        g.onclick = () => openStop(k);
        g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStop(k); } };
      } else { g.removeAttribute('tabindex'); g.onclick = null; }
    });
    return activeIdx;
  }

  /* =====================  Voyage animation  ===================== */
  let voyageRAF = null, voyageDone = false;
  function runVoyage() {
    voyageDone = false; show('voyage');
    const wrap = $('#voyage-map'); wrap.innerHTML = '';
    const svg = buildMapSVG(false);
    // hide all stop groups initially; boat reveals them
    $$('.uk-stop', svg).forEach(g => { g.style.opacity = '0'; });
    // boat
    const boat = document.createElementNS(SVG_NS, 'text');
    boat.setAttribute('class', 'uk-boat'); boat.setAttribute('text-anchor', 'middle'); boat.textContent = '⛵';
    svg.appendChild(boat);
    wrap.appendChild(svg);

    const route = svg.querySelector('#uk-route');
    const L = route.getTotalLength();
    const caption = $('#voyage-caption');
    const captions = ['Casting off from Dorset…', 'Along the Jurassic Coast…', 'North to Yorkshire…', 'Across to Northern Ireland…'];
    // fraction of route length at each stop (approx by cumulative segment share)
    const stopFrac = ORDER.map((k, i) => i / (ORDER.length - 1));
    let revealed = new Set();
    const DUR = 5200; let t0 = performance.now();
    caption.textContent = captions[0];

    function frame(now) {
      if (voyageDone) return;
      const t = Math.min(1, (now - t0) / DUR);
      const p = route.getPointAtLength(L * t);
      boat.setAttribute('x', p.x); boat.setAttribute('y', p.y - 4);
      caption.textContent = captions[Math.min(captions.length - 1, Math.floor(t * captions.length))];
      ORDER.forEach((k, i) => {
        if (!revealed.has(k) && t >= stopFrac[i] - 0.02) {
          revealed.add(k);
          const g = svg.querySelector('.uk-stop[data-stop="' + k + '"]');
          if (g) { g.style.transition = 'opacity .4s'; g.style.opacity = '1'; }
          sfx.arrive();
        }
      });
      if (t >= 1) { endVoyage(); return; }
      voyageRAF = requestAnimationFrame(frame);
    }
    voyageRAF = requestAnimationFrame(frame);
  }
  function endVoyage() {
    if (voyageDone) return; voyageDone = true;
    if (voyageRAF) cancelAnimationFrame(voyageRAF);
    state.seenVoyage = true; save();
    setTimeout(() => { $('#voyage-map').innerHTML = ''; renderHub(); show('map'); }, 300);
  }

  /* =====================  Hub (map + itinerary)  ===================== */
  function renderHub() {
    const mapWrap = $('#hub-map'); mapWrap.innerHTML = '';
    const svg = buildMapSVG(true);
    mapWrap.appendChild(svg);
    const activeIdx = markMapStates(svg);

    const list = $('#itinerary-list'); list.innerHTML = '';
    ORDER.forEach((k, i) => {
      const s = stopById(k);
      const done = state.completed.includes(k);
      const isActive = i === activeIdx;
      const li = el('li', 'itin-item ' + (done ? 'done' : isActive ? 'active' : 'locked'));
      li.innerHTML = '<span class="itin-num">' + (done ? '✓' : s.num) + '</span>' +
        '<span><span class="itin-name">' + s.name + '</span><br><span class="itin-region">' + s.region + '</span></span>' +
        '<span class="itin-tick">' + (done ? '✓' : isActive ? '➜' : '🔒') + '</span>';
      if (done || isActive) {
        li.setAttribute('role', 'button'); li.setAttribute('tabindex', '0');
        li.addEventListener('click', () => openStop(k));
        li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openStop(k); } });
      }
      list.appendChild(li);
    });

    // All stops complete: offer results via a button rather than auto-yanking
    // the user off the map (they may have come back to revisit a stop).
    const existing = $('#btn-hub-results'); if (existing) existing.remove();
    if (activeIdx === -1) {
      const done = el('button', 'primary-btn', '🏆 See my final passport');
      done.id = 'btn-hub-results'; done.style.cssText = 'width:100%;margin-bottom:8px;';
      done.addEventListener('click', showResults);
      $('#btn-restart').insertAdjacentElement('beforebegin', done);
    }
  }

  /* =====================  Sub-task helpers  ===================== */
  // a titled task panel
  function taskPanel(tag, title, sub) {
    const p = el('div', 'panel');
    p.innerHTML = '<span class="task-tag">' + tag + '</span><h3>' + title + '</h3>' + (sub ? '<p class="panel-sub">' + sub + '</p>' : '');
    return p;
  }

  /* =====================  STOP 1 — Old Harry Rocks  ===================== */
  function buildOldHarry(s, body) {
    let earned = 0; const possible = 40 + s.sequence.length * 10;
    // Part A — process match
    const pa = taskPanel('Part 1', 'The sea’s toolkit', s.processIntro);
    const grid = el('div', 'match-grid');
    const procs = s.processes;
    procs.forEach(p => {
      const row = el('div', 'match-row');
      row.appendChild(el('div', 'match-def', p.def));
      const slot = el('div', 'match-slot dropzone'); slot.dataset.answer = p.id; slot.setAttribute('aria-label', 'Drop the matching process');
      row.appendChild(slot); grid.appendChild(row);
    });
    pa.appendChild(grid);
    const trayA = el('div', 'tray'); trayA.appendChild(el('p', 'tray-label', 'Erosion processes'));
    pa.appendChild(trayA); body.appendChild(pa);

    const firstA = {};
    shuffle(procs).forEach(p => {
      const chip = el('div', 'chip', p.term); chip.dataset.id = p.id;
      trayA.appendChild(chip);
      enableDrag(chip, {
        zoneSelector: '#stop-body .match-slot, #stop-body .tray',
        onDrop(ch, z) { if (z.classList.contains('match-slot')) { const occ = z.querySelector('.chip'); if (occ) trayA.appendChild(occ); } z.appendChild(ch); },
        onMoved: refreshA
      });
    });
    function allFilledA() { return $$('.match-slot', pa).every(z => z.querySelector('.chip')); }
    let checkedA = false, doneA = false;
    function refreshA() { if (!doneA) configureCheck(true, allFilledA(), checkedA ? 'Check again' : 'Check the matches'); }
    refreshA();
    onCheck(() => {
      if (doneA) return; let allRight = true;
      $$('.match-slot', pa).forEach(slot => {
        const chip = slot.querySelector('.chip'); if (!chip || chip.classList.contains('locked')) return;
        const right = chip.dataset.id === slot.dataset.answer;
        if (right) { chip.classList.add('locked'); if (!(chip.dataset.id in firstA)) firstA[chip.dataset.id] = !checkedA; }
        else { allRight = false; chip.classList.add('wrong'); setTimeout(() => chip.classList.remove('wrong'), 450); if (!(chip.dataset.id in firstA)) firstA[chip.dataset.id] = false; }
      });
      checkedA = true;
      if (allRight) {
        doneA = true; sfx.chord(); configureCheck(false, false);
        earned += Object.values(firstA).reduce((t, v) => t + (v ? 10 : 5), 0);
        pa.appendChild(el('div', 'feedback-note', 'That’s the sea’s toolkit. Hydraulic action and abrasion do most of the work carving Old Harry Rocks.'));
        setTimeout(partB, 500);
      } else { sfx.err(); refreshA(); }
    });

    // Part B — sequence order
    function partB() {
      const pb = taskPanel('Part 2', 'Build the sequence', s.seqIntro);
      const track = el('div', 'seq-track');
      s.sequence.forEach((st, i) => {
        if (i) track.appendChild(el('div', 'seq-arrow', '➜'));
        const slot = el('div', 'seq-slot dropzone'); slot.dataset.pos = i;
        slot.appendChild(el('span', 'seq-slot-n', (i + 1) + ''));
        track.appendChild(slot);
      });
      pb.appendChild(track);
      const trayB = el('div', 'tray'); trayB.appendChild(el('p', 'tray-label', 'Stages — drag into order'));
      pb.appendChild(trayB); body.appendChild(pb);

      const firstB = {};
      const EMOJI = { s1: '🪨', s2: '🕳️', s3: '🌉', s4: '🗿', s5: '🪨' };
      shuffle(s.sequence).forEach(st => {
        const chip = el('div', 'chip seq-chip', '<span class="seq-emoji">' + (EMOJI[st.id] || '•') + '</span>' + st.label);
        chip.dataset.id = st.id;
        trayB.appendChild(chip);
        enableDrag(chip, {
          zoneSelector: '#stop-body .seq-slot, #stop-body .tray',
          onDrop(ch, z) { if (z.classList.contains('seq-slot')) { const occ = z.querySelector('.chip'); if (occ) trayB.appendChild(occ); } z.appendChild(ch); },
          onMoved: refreshB
        });
      });
      function allFilledB() { return $$('.seq-slot', pb).every(z => z.querySelector('.chip')); }
      let checkedB = false;
      function refreshB() { configureCheck(true, allFilledB(), checkedB ? 'Check again' : 'Check the order'); }
      refreshB();
      onCheck(() => {
        let allRight = true;
        $$('.seq-slot', pb).forEach(slot => {
          const chip = slot.querySelector('.chip'); if (!chip || chip.classList.contains('locked')) return;
          const st = s.sequence.find(x => x.id === chip.dataset.id);
          const right = s.sequence.indexOf(st) === +slot.dataset.pos;
          if (right) {
            chip.classList.add('locked'); if (!(chip.dataset.id in firstB)) firstB[chip.dataset.id] = !checkedB;
            if (!chip.querySelector('.seq-note')) chip.appendChild(el('div', 'seq-note', st.note));
          } else { allRight = false; chip.classList.add('wrong'); setTimeout(() => chip.classList.remove('wrong'), 450); if (!(chip.dataset.id in firstB)) firstB[chip.dataset.id] = false; }
        });
        checkedB = true;
        if (allRight) {
          sfx.chord(); configureCheck(false, false);
          earned += Object.values(firstB).reduce((t, v) => t + (v ? 10 : 5), 0);
          recordScore(s.id, earned, possible);
          body.appendChild(logPanel(s));
          enableStampButton(s, 'You can now explain how a chalk headland becomes a stack — crack, cave, arch, stack, stump. That sequence is worth marks in every coasts test.');
        } else { sfx.err(); refreshB(); }
      });
    }
  }

  /* =====================  STOP 2 — Durdle Door (erosion/deposition tagging)  ===================== */
  function buildDurdle(s, body) {
    let earned = 0; const possible = s.hotspots.length * 10 + 10;
    const pa = taskPanel('Part 1', 'Erosion or deposition?', s.labelIntro);
    const stage = el('div', 'hotspot-stage');
    stage.innerHTML = '<img src="' + s.hero.img + '" alt="' + s.hero.alt + '" />';
    s.hotspots.forEach(h => {
      const spot = el('div', 'hotspot dropzone'); spot.dataset.id = h.id; spot.dataset.process = h.process;
      spot.style.left = h.x + '%'; spot.style.top = h.y + '%';
      spot.innerHTML = '<span class="hs-feature">' + h.feature + '</span><span class="hs-slot" aria-hidden="true">?</span>';
      spot.setAttribute('aria-label', h.feature + ' — drop the process that made it');
      stage.appendChild(spot);
    });
    pa.appendChild(stage);
    const trayA = el('div', 'tray'); trayA.appendChild(el('p', 'tray-label', 'Processes — drag one onto each feature'));
    pa.appendChild(trayA); body.appendChild(pa);

    // Two Erosion + two Deposition tags (identical within a process — interchangeable).
    const tags = [
      { process: 'erosion', label: 'Erosion' }, { process: 'erosion', label: 'Erosion' },
      { process: 'deposition', label: 'Deposition' }, { process: 'deposition', label: 'Deposition' }
    ];
    const firstA = {}; let checkedA = false, doneA = false;
    shuffle(tags).forEach(t => {
      const chip = el('div', 'chip process-chip proc-' + t.process, t.label); chip.dataset.process = t.process;
      trayA.appendChild(chip);
      enableDrag(chip, {
        zoneSelector: '#stop-body .hotspot, #stop-body .tray',
        onDrop(ch, z) {
          const from = ch.parentElement;
          if (z.classList.contains('hotspot')) {
            const occ = z.querySelector('.chip'); if (occ) trayA.appendChild(occ);
            z.classList.add('filled');
          }
          z.appendChild(ch);
          // if the chip vacated a hotspot, reset that hotspot's placeholder
          if (from && from !== z && from.classList.contains('hotspot') && !from.querySelector('.chip')) from.classList.remove('filled');
        },
        onMoved: refreshA
      });
    });
    function allFilledA() { return $$('.hotspot', pa).every(z => z.querySelector('.chip')); }
    function refreshA() { if (!doneA) configureCheck(true, allFilledA(), checkedA ? 'Check again' : 'Check my answers'); }
    refreshA();
    onCheck(() => {
      if (doneA) return; let allRight = true;
      $$('.hotspot', pa).forEach(spot => {
        const chip = spot.querySelector('.chip'); if (!chip || chip.classList.contains('locked')) return;
        const right = chip.dataset.process === spot.dataset.process;
        if (right) { spot.classList.add('correct'); chip.classList.add('locked'); if (!(spot.dataset.id in firstA)) firstA[spot.dataset.id] = !checkedA; }
        else { allRight = false; spot.classList.add('bad'); chip.classList.add('wrong'); setTimeout(() => { chip.classList.remove('wrong'); spot.classList.remove('bad'); }, 500); if (!(spot.dataset.id in firstA)) firstA[spot.dataset.id] = false; }
      });
      checkedA = true;
      if (allRight) {
        doneA = true; sfx.chord(); configureCheck(false, false);
        earned += Object.values(firstA).reduce((t, v) => t + (v ? 10 : 5), 0);
        const notes = s.hotspots.map(h => '<strong>' + h.feature + ':</strong> ' + h.note).join('<br>');
        pa.appendChild(el('div', 'feedback-note', 'Durdle Door shows both forces at once — <strong>erosion</strong> carving the exposed headland, <strong>deposition</strong> building the sheltered beach.<br>' + notes));
        setTimeout(partB, 500);
      } else { sfx.err(); refreshA(); }
    });

    function partB() {
      const pb = taskPanel('Part 2', 'Predict its future', '');
      body.appendChild(pb);
      renderMCQ(pb, { q: s.predict.q, options: s.predict.options, feedback: s.predict.feedback }, correct => {
        earned += correct ? 10 : 0; recordScore(s.id, earned, possible);
        body.appendChild(logPanel(s));
        enableStampButton(s, 'An arch is only a stage. Durdle Door will one day lose its roof and become a stack — the same story as Old Harry Rocks, caught earlier.');
      });
    }
  }

  /* =====================  STOP 3 — Chesil Beach (longshore drift sim)  ===================== */
  function buildChesil(s, body) {
    let earned = 0; const possible = 30;
    const pa = taskPanel('Part 1', 'Run the waves', s.driftIntro);
    // simulation SVG
    const simWrap = el('div', 'drift-sim');
    simWrap.innerHTML =
      '<svg viewBox="0 0 600 260" xmlns="' + SVG_NS + '" aria-label="Longshore drift simulation showing a pebble moving along a beach">' +
      '<defs><linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b6ea3"/><stop offset="1" stop-color="#5aa0cf"/></linearGradient>' +
      '<linearGradient id="sandG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0e0b6"/><stop offset="1" stop-color="#e2cd93"/></linearGradient></defs>' +
      '<rect x="0" y="0" width="600" height="150" fill="url(#seaG)"/>' +
      '<rect x="0" y="120" width="600" height="140" fill="url(#sandG)"/>' +
      '<path d="M0,150 Q150,120 300,150 T600,150 L600,120 L0,120 Z" fill="#cfe0ee" opacity="0.6"/>' +
      '<g id="wave-front" opacity="0"><path d="M-40,150 Q150,118 340,150" stroke="#eaf5ff" stroke-width="5" fill="none" opacity="0.9"/></g>' +
      '<line x1="20" y1="150" x2="580" y2="150" stroke="#fff" stroke-dasharray="4 6" stroke-width="1.5" opacity="0.5"/>' +
      '<text x="12" y="30" fill="#eaf5ff" font-size="13" font-weight="700">SEA</text>' +
      '<text x="12" y="245" fill="#8a6f34" font-size="13" font-weight="700">BEACH</text>' +
      '<text x="470" y="30" fill="#eaf5ff" font-size="12">prevailing wind →</text>' +
      '<g id="pebble"><circle cx="70" cy="200" r="9" fill="#6b5636" stroke="#3f3016" stroke-width="2"/></g>' +
      '<g id="arrow-swash" opacity="0"><line x1="0" y1="0" x2="0" y2="0" stroke="#e4b824" stroke-width="4" marker-end="url(#ah)"/></g>' +
      '<g id="arrow-back" opacity="0"><line x1="0" y1="0" x2="0" y2="0" stroke="#c0603a" stroke-width="4" marker-end="url(#ah2)"/></g>' +
      '<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#e4b824"/></marker>' +
      '<marker id="ah2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#c0603a"/></marker></defs>' +
      '</svg>';
    pa.appendChild(simWrap);

    // controls
    const controls = el('div', 'drift-controls');
    const state2 = { swash: null, back: null };
    function ctrlBlock(cfg, key) {
      const c = el('div', 'drift-ctrl');
      c.innerHTML = '<h4>' + cfg.label + '</h4><p class="ctrl-hint">' + cfg.hint + '</p>';
      const box = el('div', 'opt-btns');
      shuffle(cfg.options).forEach(o => {
        const b = el('button', 'opt-btn', o.text); b.dataset.id = o.id; b.dataset.correct = o.correct ? '1' : '';
        b.addEventListener('click', () => {
          $$('.opt-btn', box).forEach(x => x.classList.remove('sel')); b.classList.add('sel');
          state2[key] = { id: o.id, correct: !!o.correct }; sfx.snap();
          runBtn.disabled = !(state2.swash && state2.back);
        });
        box.appendChild(b);
      });
      c.appendChild(box); return c;
    }
    controls.appendChild(ctrlBlock(s.driftControls.swash, 'swash'));
    controls.appendChild(ctrlBlock(s.driftControls.backwash, 'back'));
    pa.appendChild(controls);
    const runRow = el('div', 'drift-run-row');
    const runBtn = el('button', 'primary-btn', '🌊 Run the waves'); runBtn.disabled = true;
    runRow.appendChild(runBtn); pa.appendChild(runRow);
    const verdict = el('p', 'sim-verdict', ''); pa.appendChild(verdict);
    body.appendChild(pa);

    const svg = simWrap.querySelector('svg');
    const peb = svg.querySelector('#pebble');
    const waveFront = svg.querySelector('#wave-front');
    let animating = false, solved = false;

    function setPeb(x, y) { peb.setAttribute('transform', 'translate(' + (x - 70) + ',' + (y - 200) + ')'); }

    runBtn.addEventListener('click', () => {
      if (animating) return;
      const swashRight = state2.swash.correct, backRight = state2.back.correct;
      animating = true; runBtn.disabled = true; verdict.textContent = ''; verdict.className = 'sim-verdict';
      // vectors
      const swashVec = swashRight ? [34, -22] : [0, -26];
      const backVec = backRight ? [0, 24] : [-34, 20];
      let base = [70, 210]; setPeb(base[0], base[1]);
      let cycle = 0; const cycles = 6;
      function doCycle() {
        if (cycle >= cycles) { finishSim(swashRight && backRight, base[0]); return; }
        // swash up
        animateVec(base, [base[0] + swashVec[0], base[1] + swashVec[1]], 420, true, up => {
          const mid = up;
          // backwash down
          animateVec(mid, [mid[0] + backVec[0], mid[1] + backVec[1]], 420, false, down => {
            base = [down[0], Math.min(212, Math.max(196, down[1]))]; // keep on beach band
            base[1] = 205; cycle++; doCycle();
          });
        });
      }
      doCycle();
    });

    function animateVec(from, to, dur, swash, done) {
      const t0 = performance.now();
      waveFront.setAttribute('opacity', swash ? '0.9' : '0');
      function fr(now) {
        const t = Math.min(1, (now - t0) / dur); const e = swash ? t : 1 - (1 - t) * (1 - t);
        const x = from[0] + (to[0] - from[0]) * e, y = from[1] + (to[1] - from[1]) * e;
        setPeb(x, y);
        if (swash) { const wy = 150 - (150 - 120) * t; waveFront.setAttribute('transform', 'translate(0,' + (y - 150) + ')'); waveFront.setAttribute('opacity', (0.9 * (1 - t) + 0.2).toFixed(2)); }
        if (t < 1) requestAnimationFrame(fr); else { if (swash) waveFront.setAttribute('opacity', '0'); done([x, y]); }
      }
      requestAnimationFrame(fr);
    }

    function finishSim(correct, endX) {
      animating = false;
      const drifted = endX - 70;
      if (correct && drifted > 80) {
        verdict.textContent = '✓ The pebble travelled ' + Math.round(drifted / 3) + ' “steps” along the beach — that is longshore drift!';
        verdict.className = 'sim-verdict ok';
        // mark option buttons
        $$('.opt-btn', pa).forEach(b => { if (b.dataset.correct) b.classList.add('good'); });
        if (!solved) {
          solved = true; sfx.chord(); earned += 20;
          pa.appendChild(el('div', 'feedback-note', s.driftExplain));
          setTimeout(partB, 400);
        }
      } else {
        verdict.textContent = '✗ The pebble just went up and down and ended where it started — no drift. Try the arrows again.';
        verdict.className = 'sim-verdict no'; sfx.err();
        // reset for retry
        setPeb(70, 205); $$('.opt-btn', pa).forEach(b => b.classList.remove('good', 'bad'));
        runBtn.disabled = !(state2.swash && state2.back);
      }
    }

    let partBdone = false;
    function partB() {
      if (partBdone) return; partBdone = true;
      const pb = taskPanel('Part 2', 'Graded pebbles', 'Longshore drift sorts the shingle by size along the beach.');
      const fig = el('figure', 'stop-fig');
      fig.innerHTML = '<img src="assets/chesil-pebbles.jpg" alt="A close-up of large pebbles on Chesil Beach" loading="lazy" />' +
        '<figcaption>Pebbles photographed at one end of Chesil Beach — but which end?</figcaption>';
      pb.appendChild(fig);
      body.appendChild(pb);
      renderMCQ(pb, { q: s.grading.q, options: s.grading.options, feedback: s.grading.feedback }, correct => {
        earned += correct ? 10 : 0; recordScore(s.id, earned, possible);
        body.appendChild(logPanel(s));
        enableStampButton(s, 'You’ve seen longshore drift build a whole beach — and sort its pebbles by size. Chesil Beach is a barrier beach and a tombolo, made entirely by deposition.');
      });
    }
  }

  /* =====================  STOP 4 — Holderness (cliff retreat sim)  ===================== */
  function buildHolderness(s, body) {
    let earned = 0; const possible = 20;
    const pa = taskPanel('Part 1', 'Watch the coast retreat', s.retreatIntro);
    const simWrap = el('div', 'retreat-sim');
    // cross-section
    const START_FACE = 210, PX_PER_M = 3.2;
    const houses = [ { x: 300, label: 'road' }, { x: 372, label: 'house' }, { x: 452, label: 'house' }, { x: 540, label: 'farm' } ];
    simWrap.innerHTML =
      '<svg viewBox="0 0 600 300" xmlns="' + SVG_NS + '" aria-label="Cross-section of the Holderness cliff retreating as years pass">' +
      '<defs><linearGradient id="seaH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b74a4"/><stop offset="1" stop-color="#5f9ec6"/></linearGradient></defs>' +
      '<rect x="0" y="0" width="600" height="300" fill="#cfe6f5"/>' +
      '<rect x="0" y="150" width="600" height="150" fill="url(#seaH)"/>' +
      '<g id="land"></g>' +
      '<g id="props"></g>' +
      '<text x="14" y="26" font-size="13" font-weight="700" fill="#3a6d99">NORTH SEA</text>' +
      '</svg>';
    pa.appendChild(simWrap);
    const controls = el('div', 'retreat-controls');
    controls.innerHTML = '<label for="yrs">Years:</label>';
    const slider = el('input'); slider.type = 'range'; slider.min = '0'; slider.max = String(s.retreatYears); slider.value = '0'; slider.id = 'yrs';
    const readout = el('span', 'retreat-readout', '0 years · 0 m lost');
    controls.appendChild(slider); controls.appendChild(readout);
    pa.appendChild(controls);
    body.appendChild(pa);

    const svg = simWrap.querySelector('svg');
    const landG = svg.querySelector('#land');
    const propsG = svg.querySelector('#props');
    let moved = false;
    function draw(years) {
      const metres = years * s.retreatRate;
      const faceX = START_FACE + metres * PX_PER_M;
      // land: cliff block from faceX to 600, clifftop at y=110, slope to beach
      landG.innerHTML =
        '<path d="M' + faceX + ',110 L600,110 L600,300 L' + faceX + ',300 ' +
        'C' + (faceX - 6) + ',210 ' + (faceX + 10) + ',170 ' + faceX + ',150 Z" fill="#8a6a3f"/>' +
        '<rect x="' + faceX + '" y="106" width="' + Math.max(0, 600 - faceX) + '" height="10" fill="#6f9a4e"/>';
      // props (road/houses) fall in when the face passes them
      propsG.innerHTML = '';
      houses.forEach(h => {
        const gone = faceX >= h.x;
        const icon = h.label === 'road' ? '🛣️' : h.label === 'farm' ? '🚜' : '🏠';
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('font-size', '22'); t.setAttribute('text-anchor', 'middle');
        if (gone) { t.setAttribute('x', h.x - 30); t.setAttribute('y', 220); t.setAttribute('transform', 'rotate(35 ' + (h.x - 30) + ' 220)'); t.setAttribute('opacity', '0.85'); }
        else { t.setAttribute('x', h.x); t.setAttribute('y', 100); }
        t.textContent = icon; propsG.appendChild(t);
      });
      readout.textContent = years + ' years · ' + metres.toFixed(1) + ' m of coast lost';
    }
    draw(0);
    slider.addEventListener('input', () => { draw(+slider.value); if (!moved && +slider.value >= s.retreatYears * 0.6) { moved = true; sfx.err(); setTimeout(partB, 300); } });

    let partBshown = false;
    function partB() {
      if (partBshown) return; partBshown = true;
      const pb = taskPanel('Part 2', 'Why so fast?', 'You have seen the damage — now explain it.');
      body.appendChild(pb);
      renderMCQ(pb, s.whyErodes, correct => {
        earned += correct ? 10 : 0;
        // small second reasoning point folded into feedback; award a base 10 for engaging
        earned += 10; recordScore(s.id, earned, possible);
        body.appendChild(logPanel(s));
        enableStampButton(s, 'Soft boulder clay + powerful North Sea waves = Europe’s fastest-eroding coast. Remember: it is the weak ROCK, not stronger waves, that makes Holderness retreat so fast.');
      });
    }
  }

  /* =====================  STOP 5 — Coastal Management  ===================== */
  function buildManagement(s, body) {
    let earned = 0; const possible = s.methods.length * 10;
    const pa = taskPanel('Part 1', 'Hard or soft?', 'Every defence is either hard engineering (build a structure) or soft engineering (work with nature). Sort all five, then check.');
    const cols = el('div', 'type-cols');
    [['hard', 'Hard engineering 🧱'], ['soft', 'Soft engineering 🌱']].forEach(([id, label]) => {
      const c = el('div', 'type-col ' + id);
      c.innerHTML = '<h4>' + label + '</h4>';
      const zone = el('div', 'type-zone dropzone'); zone.dataset.type = id; zone.setAttribute('aria-label', label + ' drop zone');
      c.appendChild(zone); cols.appendChild(c);
    });
    pa.appendChild(cols);
    const tray = el('div', 'tray'); tray.appendChild(el('p', 'tray-label', 'Coastal defences — drag into the right column'));
    pa.appendChild(tray); body.appendChild(pa);

    const firstT = {};
    shuffle(s.methods).forEach(m => {
      const chip = el('div', 'chip', '<strong>' + m.name + '</strong> — ' + m.how); chip.dataset.id = m.id; chip.dataset.type = m.type;
      chip.style.maxWidth = '340px';
      tray.appendChild(chip);
      enableDrag(chip, {
        zoneSelector: '#stop-body .type-zone, #stop-body .tray',
        onDrop(ch, z) { z.appendChild(ch); }, onMoved: refresh
      });
    });
    function allPlaced() { return !tray.querySelector('.chip'); }
    let checked = false, doneA = false;
    function refresh() { if (!doneA) configureCheck(true, allPlaced(), checked ? 'Check again' : 'Check my sorting'); }
    refresh();
    onCheck(() => {
      if (doneA) return; let allRight = true;
      $$('.type-zone .chip', pa).forEach(chip => {
        if (chip.classList.contains('locked')) return;
        const zone = chip.closest('.type-zone');
        const right = chip.dataset.type === zone.dataset.type;
        if (right) { chip.classList.add('locked'); if (!(chip.dataset.id in firstT)) firstT[chip.dataset.id] = !checked; }
        else { allRight = false; chip.classList.add('wrong'); setTimeout(() => chip.classList.remove('wrong'), 450); if (!(chip.dataset.id in firstT)) firstT[chip.dataset.id] = false; }
      });
      checked = true;
      if (allRight) {
        doneA = true; sfx.chord(); configureCheck(false, false);
        earned += Object.values(firstT).reduce((t, v) => t + (v ? 10 : 5), 0);
        recordScore(s.id, earned, possible);
        setTimeout(partB, 500);
      } else { sfx.err(); refresh(); }
    });

    function partB() {
      const pb = taskPanel('Part 2', 'You are the council', s.decision.q);
      const cards = el('div', 'decision-cards'); pb.appendChild(cards); body.appendChild(pb);
      shuffle(s.decision.options).forEach(o => {
        const card = el('button', 'decision-card', o.text);
        card.addEventListener('click', () => {
          $$('.decision-card', cards).forEach(x => { x.disabled = true; });
          card.classList.add('chosen'); sfx.stamp();
          pb.appendChild(el('div', 'feedback-note', '<strong>The trade-off:</strong> ' + o.verdict));
          body.appendChild(logPanel(s));
          enableStampButton(s, 'There is no perfect answer in coastal management — every choice has a cost. The best answers weigh protecting people against the price and the knock-on effects further along the coast.');
        });
        cards.appendChild(card);
      });
      pb.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* =====================  STOP 6 — Giant's Causeway  ===================== */
  function buildGiants(s, body) {
    let earned = 0; const possible = s.formation.length * 10 + s.sortCards.length * 10;
    // extra close-up image
    if (s.heroClose) {
      const cw = el('div', 'stop-hero'); cw.style.marginTop = '-6px';
      cw.innerHTML = '<img src="' + s.heroClose.img + '" alt="' + s.heroClose.alt + '" style="height:clamp(150px,26vw,240px)" />';
      body.insertBefore(cw, body.querySelector('.stop-summary').nextSibling);
    }
    // Part A — formation order
    const pa = taskPanel('Part 1', 'How were the columns made?', s.formIntro);
    const track = el('div', 'seq-track');
    s.formation.forEach((f, i) => { if (i) track.appendChild(el('div', 'seq-arrow', '➜')); const slot = el('div', 'seq-slot dropzone'); slot.dataset.pos = i; slot.appendChild(el('span', 'seq-slot-n', (i + 1) + '')); track.appendChild(slot); });
    pa.appendChild(track);
    const trayA = el('div', 'tray'); trayA.appendChild(el('p', 'tray-label', 'Steps — drag into order')); pa.appendChild(trayA); body.appendChild(pa);
    const EMOJI = { f1: '🌋', f2: '❄️', f3: '⬡', f4: '🌊' };
    const firstA = {};
    shuffle(s.formation).forEach(f => {
      const chip = el('div', 'chip seq-chip', '<span class="seq-emoji">' + (EMOJI[f.id] || '•') + '</span>' + f.label); chip.dataset.id = f.id;
      trayA.appendChild(chip);
      enableDrag(chip, { zoneSelector: '#stop-body .seq-slot, #stop-body .tray', onDrop(ch, z) { if (z.classList.contains('seq-slot')) { const occ = z.querySelector('.chip'); if (occ) trayA.appendChild(occ); } z.appendChild(ch); }, onMoved: refreshA });
    });
    function allFilledA() { return $$('.seq-slot', pa).every(z => z.querySelector('.chip')); }
    let checkedA = false, doneA = false;
    function refreshA() { if (!doneA) configureCheck(true, allFilledA(), checkedA ? 'Check again' : 'Check the order'); }
    refreshA();
    onCheck(() => {
      if (doneA) return; let allRight = true;
      $$('.seq-slot', pa).forEach(slot => {
        const chip = slot.querySelector('.chip'); if (!chip || chip.classList.contains('locked')) return;
        const f = s.formation.find(x => x.id === chip.dataset.id);
        const right = s.formation.indexOf(f) === +slot.dataset.pos;
        if (right) { chip.classList.add('locked'); if (!(chip.dataset.id in firstA)) firstA[chip.dataset.id] = !checkedA; if (!chip.querySelector('.seq-note')) chip.appendChild(el('div', 'seq-note', f.note)); }
        else { allRight = false; chip.classList.add('wrong'); setTimeout(() => chip.classList.remove('wrong'), 450); if (!(chip.dataset.id in firstA)) firstA[chip.dataset.id] = false; }
      });
      checkedA = true;
      if (allRight) { doneA = true; sfx.chord(); configureCheck(false, false); earned += Object.values(firstA).reduce((t, v) => t + (v ? 10 : 5), 0); setTimeout(partB, 500); }
      else { sfx.err(); refreshA(); }
    });

    // Part B — final sorting recap (odd one out)
    function partB() {
      const pb = taskPanel('Part 2', 'The Explorer’s Final Sorting', s.sortIntro);
      const cols = el('div', 'sort-cols');
      s.sortBins.forEach(bin => {
        const c = el('div', 'sort-col'); c.dataset.bin = bin.id;
        c.innerHTML = '<h4>' + bin.label + '</h4>';
        const zone = el('div', 'sort-zone dropzone'); zone.dataset.bin = bin.id; zone.setAttribute('aria-label', bin.label + ' zone');
        c.appendChild(zone); cols.appendChild(c);
      });
      pb.appendChild(cols);
      const tray = el('div', 'tray'); tray.appendChild(el('p', 'tray-label', 'Every landform from your journey')); pb.appendChild(tray); body.appendChild(pb);
      const firstB = {};
      shuffle(s.sortCards).forEach(c => {
        const chip = el('div', 'chip', c.text); chip.dataset.id = c.id; chip.dataset.target = c.target;
        tray.appendChild(chip);
        enableDrag(chip, { zoneSelector: '#stop-body .sort-zone, #stop-body .tray', onDrop(ch, z) { z.appendChild(ch); }, onMoved: refreshB });
      });
      function allPlaced() { return !tray.querySelector('.chip'); }
      let checkedB = false;
      function refreshB() { configureCheck(true, allPlaced(), checkedB ? 'Check again' : 'Sort them all'); }
      refreshB();
      onCheck(() => {
        let allRight = true;
        $$('.sort-zone .chip', pb).forEach(chip => {
          if (chip.classList.contains('locked')) return;
          const zone = chip.closest('.sort-zone');
          const right = chip.dataset.target === zone.dataset.bin;
          if (right) { chip.classList.add('locked'); if (!(chip.dataset.id in firstB)) firstB[chip.dataset.id] = !checkedB; }
          else { allRight = false; chip.classList.add('wrong'); setTimeout(() => chip.classList.remove('wrong'), 450); if (!(chip.dataset.id in firstB)) firstB[chip.dataset.id] = false; }
        });
        checkedB = true;
        if (allRight) {
          sfx.chord(); configureCheck(false, false);
          earned += Object.values(firstB).reduce((t, v) => t + (v ? 10 : 5), 0);
          recordScore(s.id, earned, possible);
          pb.appendChild(el('div', 'feedback-note', 'The Giant’s Causeway is the odd one out: it is <strong>volcanic</strong>, not made by the sea at all. Recognising a landform that does NOT fit the erosion/deposition pattern is a real geographer’s skill.'));
          body.appendChild(logPanel(s));
          enableStampButton(s, 'Journey complete! You have sorted every landform by the process that made it — and spotted the one the sea did not build. Fáilte to the finish line.');
        } else { sfx.err(); refreshB(); }
      });
    }
  }

  const BUILDERS = {
    'old-harry': buildOldHarry, 'durdle-door': buildDurdle, 'chesil': buildChesil,
    'holderness': buildHolderness, 'management': buildManagement, 'giants-causeway': buildGiants
  };

  /* =====================  Results + celebration  ===================== */
  function celebrate() {
    sfx.chord();
    const conf = el('div', 'sea-confetti');
    const glyphs = ['🌊', '⚓', '🧭', '🐚', '⛵', '🗺️'];
    for (let i = 0; i < 34; i++) {
      const b = el('span', 'bit', glyphs[i % glyphs.length]);
      b.style.left = (Math.random() * 100) + 'vw';
      b.style.setProperty('--d', (3 + Math.random() * 3) + 's');
      b.style.setProperty('--dl', (Math.random() * 1.4) + 's');
      conf.appendChild(b);
    }
    document.body.appendChild(conf);
    setTimeout(() => conf.remove(), 7000);
  }
  function showResults() {
    const scored = Object.values(state.scores).filter(s => s.possible > 0);
    const earned = scored.reduce((t, s) => t + s.earned, 0);
    const possible = scored.reduce((t, s) => t + s.possible, 0);
    const pct = possible ? Math.round((earned / possible) * 100) : 0;
    let rank = DATA.ranks[0]; DATA.ranks.forEach(r => { if (pct >= r.min) rank = r; });
    $('#results-rank').textContent = rank.icon + ' ' + rank.name;
    $('#results-scoreline').textContent = 'Your voyage: ' + pct + '% · ' + earned + ' of ' + possible + ' points · all 6 stops stamped';
    const bd = $('#results-breakdown'); bd.innerHTML = '';
    STOPS.forEach(s => {
      const sc = state.scores[s.id]; if (!sc || !sc.possible) return;
      const p = Math.round((sc.earned / sc.possible) * 100);
      bd.appendChild(el('div', 'rb-row', '<span class="rb-name">' + s.icon + ' ' + s.name + '</span>' +
        '<span class="rb-bar-track"><span class="rb-bar" data-w="' + p + '"></span></span><span class="rb-pct">' + p + '%</span>'));
    });
    // Extension task for fast-finishers (Laura's "add your own stop")
    if (DATA.extension && !$('#results-extension')) {
      const ext = el('div', 'log-panel'); ext.id = 'results-extension'; ext.style.textAlign = 'left';
      ext.innerHTML = '<h3>' + DATA.extension.title + '</h3><p class="log-prompt">' + DATA.extension.text + '</p>';
      const ta = el('textarea'); ta.placeholder = 'My extra UK coastal stop…'; ta.value = state.logs['extension'] || '';
      ta.setAttribute('aria-label', 'Extension task — add your own stop');
      const saved = el('p', 'log-saved', ''); let t = null;
      ta.addEventListener('input', () => { saveLog('extension', ta.value); saved.textContent = 'Saved ✓'; clearTimeout(t); t = setTimeout(() => { saved.textContent = ''; }, 1200); });
      ext.appendChild(ta); ext.appendChild(saved);
      const actions = $('.results-actions'); actions.parentNode.insertBefore(ext, actions);
    }
    show('results'); celebrate();
    setTimeout(() => { $$('.rb-bar', bd).forEach(b => { b.style.width = b.dataset.w + '%'; }); }, 350);
  }

  /* =====================  Briefing  ===================== */
  function renderBriefing() {
    $('#briefing-mission').textContent = DATA.briefing.mission;
    const fr = $('#forces-row'); fr.innerHTML = '';
    DATA.briefing.forces.forEach(f => fr.appendChild(el('div', 'force-card', '<div class="force-ico">' + f.icon + '</div><h4>' + f.name + '</h4><p>' + f.text + '</p>')));
    const pp = $('#primer-processes'); pp.innerHTML = '';
    DATA.briefing.processes.forEach(p => pp.appendChild(el('div', 'primer-proc', '<strong>' + p.term + ':</strong> ' + p.def)));
    const hasProgress = state.completed.length > 0;
    $('#btn-resume').hidden = !hasProgress;
    $('#btn-begin').textContent = hasProgress ? 'Start a fresh voyage ↺' : 'Set sail ⛵';
  }

  /* =====================  Init  ===================== */
  function init() {
    load(); renderBriefing(); renderPassport(); setupPassport(); updateScoreBadge();
    $('#btn-begin').addEventListener('click', () => { if (state.completed.length > 0) resetAll(); runVoyage(); });
    $('#btn-resume').addEventListener('click', () => { renderHub(); show('map'); });
    $('#btn-skip-voyage').addEventListener('click', endVoyage);
    $('#screen-voyage').addEventListener('click', e => { if (e.target.id !== 'btn-skip-voyage') endVoyage(); });
    $('#btn-back-map').addEventListener('click', () => { renderHub(); show('map'); });
    $('#btn-check').addEventListener('click', () => { if (checkHandler) checkHandler(); });
    $('#btn-done-continue').addEventListener('click', () => {
      $('#stop-done').hidden = true;
      if (state.completed.length === STOPS.length) showResults();
      else { renderHub(); show('map'); }
    });
    let restartArmed = false;
    $('#btn-restart').addEventListener('click', e => {
      const b = e.currentTarget;
      if (!restartArmed) { restartArmed = true; b.textContent = 'Tap again to confirm ↺'; setTimeout(() => { restartArmed = false; b.textContent = '↺ Restart voyage'; }, 2600); }
      else { resetAll(); restartArmed = false; renderBriefing(); show('briefing'); }
    });
    $('#btn-play-again').addEventListener('click', () => { resetAll(); renderBriefing(); show('briefing'); });
    show('briefing');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
