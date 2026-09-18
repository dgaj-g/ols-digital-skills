/* ============================================================
   Exodus and the Story of Moses — wiring
   Every pupil-facing string comes from content.js; marking from
   marker.js. Built to DESIGN_38_SPEC.md §2–§9.
   ============================================================ */
(function () {
  'use strict';
  var C = window.EXODUS_CONTENT;
  var M = window.EXODUS_MARKER;
  var STORE = 'exodus-paper-v1';
  var SOUND_KEY = 'exodus-sound';
  var Q = C.questions;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var app = document.getElementById('app');
  var header = document.getElementById('ex-header');
  var lampsEl = document.getElementById('lamps');
  var stagesEl = document.getElementById('stages');
  var soundBtn = document.getElementById('sound-btn');
  var soundLabel = document.getElementById('sound-label');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */
  function fmt(s, map) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return map[k] != null ? map[k] : ''; }); }
  function marksWord(n) { return n === 1 ? C.marksWord.one : fmt(C.marksWord.many, { n: n }); }
  function markChip(n) { return n > 0 ? '+' + marksWord(n) : marksWord(0); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function range(n) { var r = []; for (var i = 0; i < n; i++) r.push(i); return r; }
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function todayStr() { var d = new Date(); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function slug(s) { return (s || 'paper').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'paper'; }

  /* ---------- state ---------- */
  var state = null;
  function freshState(name, cls) {
    return {
      name: name || '', cls: cls || '', started: false, index: 0,
      marks: [0, 0, 0, 0, 0, 0],
      answers: { A: [null, null, null], B: '', C: '', D: '', E: '', F: ['', ''] },
      shuffles: makeShuffles(),
      done: [false, false, false, false, false, false],
      finished: false
    };
  }
  function makeShuffles() {
    var s = { A: { cards: shuffle(range(3)), chips: shuffle(range(3)) } };
    Q.forEach(function (q) { if (q.type === 'choice') s[q.letter] = shuffle(range(q.options.length)); });
    return s;
  }
  function save() { try { sessionStorage.setItem(STORE, JSON.stringify(state)); } catch (_) {} }
  function load() {
    try {
      var raw = sessionStorage.getItem(STORE);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.shuffles || !s.answers || !s.marks) return null;
      return s;
    } catch (_) { return null; }
  }
  function total() { return state.marks.reduce(function (a, b) { return a + b; }, 0); }

  /* ---------- sound ---------- */
  var audio = { ctx: null, on: true };
  try { audio.on = sessionStorage.getItem(SOUND_KEY) !== 'off'; } catch (_) {}
  function ctx() {
    if (!audio.ctx) { try { audio.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } }
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return audio.ctx;
  }
  function playTone(freq, dur, type, vol, when) {
    if (!audio.on) return;
    var ac = ctx(); if (!ac) return;
    var t0 = ac.currentTime + (when || 0);
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  var sfx = {
    tick: function () { playTone(880, 0.04, 'sine', 0.06); },
    correct: function () { playTone(1046.5, 0.09, 'sine', 0.09); playTone(1318.5, 0.09, 'sine', 0.09, 0.09); },
    wrong: function () { playTone(180, 0.16, 'triangle', 0.08); },
    partial: function () { playTone(783.99, 0.12, 'sine', 0.08); },
    finish: function () { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { playTone(f, 0.14, 'sine', 0.08, i * 0.11); }); },
    turn: function () {
      if (!audio.on) return;
      var ac = ctx(); if (!ac) return;
      var dur = 0.18, n = Math.floor(ac.sampleRate * dur);
      var buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      var src = ac.createBufferSource(); src.buffer = buf;
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      var t0 = ac.currentTime;
      bp.frequency.setValueAtTime(600, t0); bp.frequency.exponentialRampToValueAtTime(2400, t0 + dur);
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp); bp.connect(g); g.connect(ac.destination);
      src.start(t0); src.stop(t0 + dur + 0.02);
    }
  };
  function renderSound() {
    soundBtn.setAttribute('aria-pressed', audio.on ? 'true' : 'false');
    soundLabel.textContent = audio.on ? C.header.soundOn : C.header.soundOff;
    soundBtn.setAttribute('aria-label', audio.on ? C.header.soundOn : C.header.soundOff);
  }
  soundBtn.addEventListener('click', function () {
    audio.on = !audio.on;
    try { sessionStorage.setItem(SOUND_KEY, audio.on ? 'on' : 'off'); } catch (_) {}
    renderSound();
    if (audio.on) sfx.tick();
  });
  renderSound();

  /* ---------- header: lamps + stages ---------- */
  var LAMP_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
    '<circle class="glow" cx="20" cy="9" r="7" fill="#F5D45E"/>' +
    '<path class="flame" d="M20 3.5c1.9 2.3 3.2 4.1 3.2 6.1a3.2 3.2 0 0 1-6.4 0c0-2 1.3-3.8 3.2-6.1z"/>' +
    '<path class="bowl" d="M4 17.5h20.5c2.6 0 4.5 1.2 5.5 2.2-1.2 2.6-4.2 5.8-9 5.8H12c-4.6 0-7.4-3.2-8.4-5.6L4 17.5z"/>' +
    '<path class="bowl" d="M14 17.5V15h5v2.5" stroke-linejoin="round"/></svg>';
  var litCount = 0;
  function buildLamps() {
    lampsEl.innerHTML = '';
    for (var i = 0; i < C.totalMarks; i++) {
      var l = el('span', { class: 'lamp', html: LAMP_SVG });
      lampsEl.appendChild(l);
    }
  }
  function renderLamps(beat) {
    var n = total();
    var lamps = lampsEl.children;
    for (var i = 0; i < lamps.length; i++) {
      var lit = i < n;
      var wasLit = lamps[i].classList.contains('lit');
      lamps[i].classList.toggle('lit', lit);
      lamps[i].classList.remove('beat');
      if (beat && lit && !wasLit && !reduceMotion) {
        (function (lamp) { void lamp.offsetWidth; lamp.classList.add('beat'); setTimeout(function () { lamp.classList.remove('beat'); }, 650); })(lamps[i]);
      }
    }
    litCount = n;
    lampsEl.setAttribute('aria-label', fmt(C.header.marksSoFar, { n: n }));
  }
  function renderStages() {
    stagesEl.innerHTML = '';
    Q.forEach(function (q, i) {
      var cls = 'stage' + (state.done[i] ? ' done' : (i === state.index && !state.finished ? ' current' : ''));
      var li = el('li', { class: cls, 'aria-label': fmt(state.done[i] ? C.header.stageDone : C.header.stage, { letter: q.letter }) });
      if (i === state.index && !state.finished) li.setAttribute('aria-current', 'step');
      li.appendChild(el('span', { 'aria-hidden': 'true', text: state.done[i] ? '✓' : q.letter }));
      stagesEl.appendChild(li);
    });
  }
  buildLamps();

  /* ---------- page turning ---------- */
  var resumeNotice = null;
  function showPage(build, opts) {
    opts = opts || {};
    var old = app.querySelector('.page');
    var oldCard = app.querySelector('.resume-card');
    if (oldCard && !opts.keepResume) oldCard.remove();
    var next = build();
    function mount() {
      if (old && old.parentNode) old.remove();
      app.appendChild(next);
      if (!reduceMotion && opts.animate !== false) {
        next.classList.add('entering');
        next.addEventListener('animationend', function done() { next.classList.remove('entering'); next.removeEventListener('animationend', done); });
        setTimeout(function () { next.classList.remove('entering'); }, 300);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
      if (opts.focus) { var f = next.querySelector(opts.focus); if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); } }
    }
    if (old && !reduceMotion && opts.animate !== false) {
      old.classList.add('leaving');
      var fired = false;
      var go = function () { if (fired) return; fired = true; mount(); };
      old.addEventListener('animationend', go);
      setTimeout(go, 260);
    } else mount();
  }
  function goto(index) {
    state.index = index;
    save();
    document.body.classList.toggle('on-cover', false);
    renderStages();
    renderLamps(false);
    if (index >= Q.length) { state.finished = true; save(); renderStages(); showPage(buildResults, { focus: 'h1' }); }
    else showPage(function () { return buildQuestion(Q[index]); }, { focus: 'h2.stem' });
  }

  /* ---------- painting ---------- */
  function buildArt(q) {
    var wrap = el('div', { class: 'q-art' });
    var frame = el('div', { class: 'frame' }, [el('img', { src: q.image.src, alt: q.image.alt, style: 'object-position:' + q.image.focus })]);
    wrap.appendChild(frame);
    wrap.appendChild(el('p', { class: 'caption', text: q.image.caption }));
    return wrap;
  }

  /* ---------- cover ---------- */
  function buildCover() {
    document.body.classList.add('on-cover');
    var sheet = el('section', { class: 'sheet cover', 'aria-labelledby': 'cover-h1' });
    var nameIn = el('input', { type: 'text', id: 'name', maxlength: '40', autocomplete: 'name', placeholder: C.cover.namePlaceholder, value: state.name });
    var clsIn = el('input', { type: 'text', id: 'cls', maxlength: '12', placeholder: C.cover.classPlaceholder, value: state.cls, autocomplete: 'off' });
    var nameField = el('div', { class: 'field' }, [el('label', { for: 'name', text: C.cover.nameLabel }), nameIn, el('p', { class: 'field-error', id: 'name-error', 'aria-live': 'polite' })]);
    var clsField = el('div', { class: 'field' }, [el('label', { for: 'cls', text: C.cover.classLabel }), clsIn]);
    var beginBtn = el('button', { type: 'button', class: 'btn btn-primary', id: 'begin', text: C.cover.begin || C.buttons.begin });
    function begin() {
      var name = nameIn.value.trim();
      if (!name) {
        nameField.classList.add('error');
        document.getElementById('name-error').textContent = C.cover.nameMissing;
        if (!reduceMotion) { nameField.classList.remove('shake'); void nameField.offsetWidth; nameField.classList.add('shake'); }
        nameIn.focus();
        sfx.wrong();
        return;
      }
      state.name = name; state.cls = clsIn.value.trim(); state.started = true;
      save();
      sfx.turn();
      goto(0);
    }
    beginBtn.addEventListener('click', begin);
    nameIn.addEventListener('input', function () { nameField.classList.remove('error'); document.getElementById('name-error').textContent = ''; });
    [nameIn, clsIn].forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); begin(); } }); });
    sheet.appendChild(el('h1', { id: 'cover-h1', text: C.title }));
    sheet.appendChild(el('p', { class: 'subtitle', text: C.subtitle }));
    sheet.appendChild(el('div', { class: 'fields' }, [nameField, clsField]));
    sheet.appendChild(el('p', { class: 'instruction', text: C.cover.instruction }));
    sheet.appendChild(el('div', { class: 'actions' }, [beginBtn]));
    sheet.appendChild(el('p', { class: 'how', text: C.cover.howItWorks }));
    sheet.appendChild(el('button', { type: 'button', class: 'btn-link', text: C.buttons.credits, onclick: openCredits }));
    var band = el('div', { class: 'cover-band' }, [el('img', { src: 'images/qb-moses-basket.jpg', alt: Q[1].image.alt })]);
    var outer = el('div', { class: 'page cover-page' });
    outer.appendChild(band);
    outer.appendChild(sheet);
    return outer;
  }

  /* ---------- question frame ---------- */
  function buildQuestion(q) {
    var i = Q.indexOf(q);
    var sheet = el('section', { class: 'sheet page question q-' + q.letter.toLowerCase(), 'data-letter': q.letter });
    var grid = el('div', { class: 'q-grid' });
    grid.appendChild(el('div', { class: 'q-label-row' }, [
      el('span', { class: 'q-label', text: fmt(C.header.stage, { letter: q.letter }) }),
      el('span', { class: 'marks-pill', text: marksWord(q.marks) })
    ]));
    var stem = el('h2', { class: 'stem' });
    if (q.stemEmphasis && q.stem.indexOf(q.stemEmphasis) >= 0) {
      var parts = q.stem.split(q.stemEmphasis);
      stem.appendChild(document.createTextNode(parts[0]));
      stem.appendChild(el('span', { class: 'emph', text: q.stemEmphasis }));
      stem.appendChild(document.createTextNode(parts.slice(1).join(q.stemEmphasis)));
    } else stem.textContent = q.stem;
    grid.appendChild(stem);
    var art = buildArt(q);
    grid.appendChild(art);
    var answers = el('div', { class: 'answers' });
    var helper = el('p', { class: 'helper', text: q.helper });
    var checkBtn = el('button', { type: 'button', class: 'btn btn-primary check-btn', text: C.buttons.check, disabled: 'disabled' });
    var actions = el('div', { class: 'actions' }, [checkBtn]);
    var feedback = el('div', { class: 'feedback', 'aria-live': 'polite' });

    var comp = { A: buildMatch, B: buildChoice, C: buildWrite, D: buildChoice, E: buildChoice, F: buildShort }[q.letter];
    var api = comp(q, answers, function ready(ok) { checkBtn.disabled = !ok || state.done[i]; });

    checkBtn.addEventListener('click', function () {
      if (checkBtn.disabled || state.done[i]) return;
      var result = api.check();          /* { marks, cls: 'right'|'wrong'|'part', headline, body:[nodes] } */
      state.marks[i] = result.marks; state.done[i] = true;
      save();
      checkBtn.remove();
      var nextBtn = el('button', { type: 'button', class: 'btn btn-primary next-btn', text: i === Q.length - 1 ? C.buttons.finish : C.buttons.next });
      nextBtn.addEventListener('click', function () { if (i === Q.length - 1) sfx.finish(); else sfx.turn(); goto(i + 1); });
      actions.appendChild(nextBtn);
      renderFeedback(feedback, result);
      renderStages();
      renderLamps(true);
      if (result.cls === 'right') sfx.correct(); else if (result.cls === 'part') sfx.partial(); else sfx.wrong();
      var h = feedback.querySelector('.feedback-headline'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: false }); }
    });

    grid.appendChild(answers);
    grid.appendChild(helper);
    grid.appendChild(actions);
    grid.appendChild(feedback);
    sheet.appendChild(grid);
    return sheet;
  }
  function renderFeedback(container, r) {
    container.innerHTML = '';
    var panel = el('div', { class: 'feedback-panel ' + r.cls });
    panel.appendChild(el('div', { class: 'feedback-head' }, [
      el('p', { class: 'feedback-headline', text: r.headline }),
      el('span', { class: 'mark-chip', text: markChip(r.marks) })
    ]));
    (r.body || []).forEach(function (n) { panel.appendChild(n); });
    container.appendChild(panel);
  }
  function youWrote(q, texts) {
    var box = el('div', { class: 'you-wrote' }, [el('h3', { text: q.youWrote })]);
    texts.forEach(function (t) { box.appendChild(el('blockquote', { text: '“' + t + '”' })); });
    return box;
  }

  /* ---------- B, D, E: choice ---------- */
  function buildChoice(q, mount, ready) {
    var order = state.shuffles[q.letter];
    var group = el('div', { class: 'choices', role: 'radiogroup', 'aria-label': q.stem });
    var buttons = [];
    var selected = -1;
    function select(k, silent) {
      selected = k;
      buttons.forEach(function (b, j) { b.setAttribute('aria-checked', j === k ? 'true' : 'false'); b.tabIndex = j === k ? 0 : -1; });
      if (!silent) sfx.tick();
      ready(k >= 0);
    }
    order.forEach(function (optIdx, j) {
      var opt = q.options[optIdx];
      var b = el('button', { type: 'button', class: 'choice', role: 'radio', 'aria-checked': 'false', 'data-j': j }, [
        el('span', { class: 'dot', 'aria-hidden': 'true' }), el('span', { class: 'label', text: opt.text }), el('span', { class: 'mark', 'aria-hidden': 'true' })
      ]);
      b.tabIndex = j === 0 ? 0 : -1;
      b.addEventListener('click', function () { if (!b.disabled) select(j); });
      b.addEventListener('keyup', function (e) { if (e.key === ' ') e.preventDefault(); });
      b.addEventListener('keydown', function (e) {
        var n = buttons.length, t;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { t = (j + 1) % n; buttons[t].focus(); select(t); e.preventDefault(); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { t = (j - 1 + n) % n; buttons[t].focus(); select(t); e.preventDefault(); }
        else if (e.key === ' ') { select(j); e.preventDefault(); }
      });
      buttons.push(b);
      group.appendChild(b);
    });
    mount.appendChild(group);
    /* restore (an answered page is never re-shown; kept for safety) */
    if (state.answers[q.letter]) { var k = order.findIndex(function (o) { return q.options[o].text === state.answers[q.letter]; }); if (k >= 0) select(k, true); }
    return {
      check: function () {
        var chosen = q.options[order[selected]];
        state.answers[q.letter] = chosen.text;
        buttons.forEach(function (b, j) {
          var opt = q.options[order[j]];
          b.disabled = true;
          var mk = b.querySelector('.mark');
          if (opt.correct) { b.classList.add('is-right'); mk.textContent = '✓'; }
          else if (j === selected) { b.classList.add('is-wrong'); mk.textContent = '✗'; }
          else b.classList.add('dim');
        });
        var right = !!chosen.correct;
        return { marks: right ? q.marks : 0, cls: right ? 'right' : 'wrong', headline: right ? q.right : q.wrong, body: [] };
      }
    };
  }

  /* ---------- C: write ---------- */
  function buildWrite(q, mount, ready) {
    var ta = el('textarea', { class: 'write-box', rows: '4', maxlength: '400', placeholder: q.placeholder, 'aria-label': q.stem });
    ta.value = state.answers.C || '';
    ta.addEventListener('input', function () { ready(ta.value.trim().length > 0); });
    mount.appendChild(ta);
    ready(ta.value.trim().length > 0);
    return {
      check: function () {
        var text = ta.value.trim();
        state.answers.C = text;
        var r = M[q.marker](text);
        ta.readOnly = true;
        var headline = r.score === 2 ? q.feedback[2] : r.score === 1 ? (r.intent ? q.feedback.intentOnly : q.feedback.threatOnly) : q.feedback[0];
        var scheme = el('div', { class: 'scheme' }, [el('h3', { text: q.schemeTitle })].concat(q.scheme.map(function (s) { return el('p', { text: s }); })));
        return { marks: r.score, cls: r.score === 2 ? 'right' : r.score === 1 ? 'part' : 'wrong', headline: headline, body: [scheme, youWrote(q, [text])] };
      }
    };
  }

  /* ---------- F: short ---------- */
  function buildShort(q, mount, ready) {
    var inputs = [];
    var rows = [];
    q.parts.forEach(function (p, k) {
      var input = el('input', { type: 'text', class: 'short-input', maxlength: '60', placeholder: p.placeholder, 'aria-label': p.label + ' ' + p.stem, autocomplete: 'off' });
      input.value = (state.answers.F && state.answers.F[k]) || '';
      input.addEventListener('input', function () { ready(inputs.every(function (i) { return i.value.trim().length > 0; })); });
      var badge = el('span', { class: 'badge', 'aria-hidden': 'true' });
      var line = el('p', { class: 'short-line' });
      var part = el('div', { class: 'short-part' }, [
        el('p', { class: 'part-stem' }, [el('span', { class: 'part-label', text: p.label }), p.stem]),
        el('div', { class: 'short-row' }, [input, badge]),
        line
      ]);
      inputs.push(input); rows.push({ badge: badge, line: line });
      mount.appendChild(part);
    });
    ready(inputs.every(function (i) { return i.value.trim().length > 0; }));
    return {
      check: function () {
        var texts = inputs.map(function (i) { return i.value.trim(); });
        state.answers.F = texts;
        var sum = 0;
        var lines = el('ul', { class: 'part-lines' });
        q.parts.forEach(function (p, k) {
          var r = M[p.marker](texts[k]);
          sum += r.score;
          inputs[k].readOnly = true;
          rows[k].badge.textContent = r.score ? '✓' : '✗';
          rows[k].badge.classList.add(r.score ? 'ok' : 'no');
          rows[k].line.textContent = r.score ? p.right : p.wrong;
          rows[k].line.classList.add(r.score ? 'ok' : 'no');
          lines.appendChild(el('li', {}, [el('span', { class: r.score ? 'ok' : 'no', text: p.label + ' ' + (r.score ? '✓ ' : '✗ ') }), r.score ? p.right : p.wrong]));
        });
        return { marks: sum, cls: sum === q.marks ? 'right' : sum > 0 ? 'part' : 'wrong', headline: markChip(sum), body: [lines, youWrote(q, texts)] };
      }
    };
  }

  /* ---------- A: match (drag) ---------- */
  function buildMatch(q, mount, ready) {
    var sh = state.shuffles.A;
    var placed = (state.answers.A || [null, null, null]).slice(); /* per card position (in shuffled card order): pair index of the term, or null */
    var locked = false;
    var selectedChip = null;     /* tap/keyboard pick-up */
    var kbTarget = null;         /* -1 = tray, 0..2 = card */
    var wrap = el('div', { class: 'match' });
    var cardsBox = el('div', { class: 'cards-wrap' }, [el('p', { class: 'cards-label', text: q.cardsLabel })]);
    var cards = el('div', { class: 'cards' });
    var trayWrap = el('div', { class: 'tray-wrap' }, [el('p', { class: 'tray-label', text: q.trayLabel })]);
    var tray = el('div', { class: 'tray', 'aria-label': q.trayLabel });
    cardsBox.appendChild(cards); trayWrap.appendChild(tray);
    wrap.appendChild(cardsBox); wrap.appendChild(trayWrap);
    mount.appendChild(wrap);
    var cardEls = [];
    tray.addEventListener('click', function (e) { if (locked) return; if (selectedChip && e.target === tray) dropSelected(-1); });

    function makeChip(pairIdx) {
      var chip = el('button', { type: 'button', class: 'chip', text: q.pairs[pairIdx].term, 'data-pair': pairIdx });
      chip.addEventListener('pointerdown', onPointerDown);
      chip.addEventListener('keydown', onChipKey);
      chip.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
      chip.addEventListener('click', function (e) { if (chip._dragged) { chip._dragged = false; return; } if (locked) return; onChipTap(chip); });
      return chip;
    }
    function render() {
      cards.innerHTML = ''; tray.innerHTML = ''; cardEls = [];
      sh.cards.forEach(function (pairIdx, pos) {
        var card = el('div', { class: 'match-card', 'data-pos': pos }, [
          el('p', { class: 'definition', text: q.pairs[pairIdx].definition }),
          el('div', { class: 'slot' })
        ]);
        var slot = card.querySelector('.slot');
        if (placed[pos] != null) slot.appendChild(makeChip(placed[pos]));
        else slot.textContent = q.slotEmpty;
        card.addEventListener('click', function () { if (locked) return; if (selectedChip) { dropSelected(pos); } });
        cards.appendChild(card); cardEls.push(card);
      });
      sh.chips.forEach(function (pairIdx) { if (placed.indexOf(pairIdx) < 0) tray.appendChild(makeChip(pairIdx)); });
      ready(placed.every(function (p) { return p != null; }));
      state.answers.A = placed.slice(); save();
    }
    function place(pairIdx, target) {   /* target -1 = tray, else card pos; swaps on occupied */
      var from = placed.indexOf(pairIdx);
      if (target === -1) { if (from >= 0) placed[from] = null; }
      else {
        var occupant = placed[target];
        placed[target] = pairIdx;
        if (from >= 0 && from !== target) placed[from] = occupant != null && occupant !== pairIdx ? occupant : null;
      }
      selectedChip = null; kbTarget = null;
      render();
      sfx.tick();
    }
    function dropSelected(target) { var idx = +selectedChip.getAttribute('data-pair'); place(idx, target); }

    /* tap alternative */
    function onChipTap(chip) {
      if (selectedChip === chip) { clearSelection(); return; }
      clearSelection();
      selectedChip = chip; chip.classList.add('selected'); chip.setAttribute('aria-pressed', 'true');
      sfx.tick();
    }
    function clearSelection() {
      if (selectedChip) { selectedChip.classList.remove('selected'); selectedChip.removeAttribute('aria-pressed'); }
      selectedChip = null; kbTarget = null;
      cardEls.forEach(function (c) { c.classList.remove('kb-target'); }); tray.classList.remove('kb-target');
    }
    /* keyboard: Enter picks up, arrows choose a card (or the tray), Enter drops, Escape cancels */
    function onChipKey(e) {
      var chip = e.currentTarget;
      if (locked) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (selectedChip === chip && kbTarget != null) { place(+chip.getAttribute('data-pair'), kbTarget); return; }
        if (selectedChip !== chip) { onChipTap(chip); kbTarget = null; }
        else clearSelection();
      } else if (selectedChip === chip && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        var n = cardEls.length;
        if (kbTarget == null) kbTarget = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 0 : n - 1;
        else kbTarget = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? (kbTarget + 1 > n - 1 ? -1 : kbTarget + 1) : (kbTarget - 1 < -1 ? n - 1 : kbTarget - 1);
        cardEls.forEach(function (c, k) { c.classList.toggle('kb-target', k === kbTarget); });
        tray.classList.toggle('kb-target', kbTarget === -1);
      } else if (e.key === 'Escape') { clearSelection(); }
    }

    /* pointer drag — Pointer Events only, document-level tracking, fixed lift, rAF hit-test */
    var drag = null;
    function onPointerDown(e) {
      if (locked || drag || e.button > 0) return;
      var chip = e.currentTarget;
      if (mount.closest('.page') && mount.closest('.page').classList.contains('entering')) return; /* page turn not finished */
      e.preventDefault();
      drag = { chip: chip, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, lifted: false, raf: 0, hover: null, ph: null, corr: { x: 0, y: 0 }, loop: 0 };
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerCancel);
    }
    function lift() {
      var d = drag, chip = d.chip;
      var r = chip.getBoundingClientRect();
      d.ph = el('span', { class: 'chip-placeholder', style: 'width:' + r.width + 'px;height:' + r.height + 'px' });
      chip.parentNode.insertBefore(d.ph, chip);
      chip.classList.add('dragging');
      chip.style.position = 'fixed'; chip.style.left = r.left + 'px'; chip.style.top = r.top + 'px'; chip.style.width = r.width + 'px'; chip.style.margin = '0';
      var r2 = chip.getBoundingClientRect();   /* containing-block correction (playbook gotcha 4) */
      d.corr.x = r.left - r2.left; d.corr.y = r.top - r2.top;
      document.body.classList.add('dragging-active');
      clearSelection();
      d.lifted = true; chip._dragged = true;
      d.loop = requestAnimationFrame(autoScroll);
    }
    function applyMove() {
      var d = drag;
      d.chip.style.transform = 'translate3d(' + (d.x - d.sx + d.corr.x) + 'px,' + (d.y - d.sy + d.corr.y) + 'px,0)';
    }
    function onPointerMove(e) {
      var d = drag; if (!d || e.pointerId !== d.id) return;
      d.x = e.clientX; d.y = e.clientY;
      if (!d.lifted) { if (Math.abs(d.x - d.sx) < 6 && Math.abs(d.y - d.sy) < 6) return; lift(); }
      applyMove();
      if (!d.raf) d.raf = requestAnimationFrame(hitTest);
    }
    function targetAt(x, y) {
      var list = document.elementsFromPoint(x, y);
      for (var i = 0; i < list.length; i++) {
        var n = list[i];
        if (n === drag.chip || n === drag.ph || drag.chip.contains(n)) continue;
        var card = n.closest ? n.closest('.match-card') : null;
        if (card && cards.contains(card)) return { kind: 'card', pos: +card.getAttribute('data-pos'), node: card };
        if (n.closest && n.closest('.tray-wrap') === trayWrap) return { kind: 'tray', pos: -1, node: tray };
      }
      return null;
    }
    function hitTest() {
      var d = drag; if (!d) return; d.raf = 0;
      var t = targetAt(d.x, d.y);
      var node = t ? t.node : null;
      if (d.hover !== node) { if (d.hover) d.hover.classList.remove('hover'); if (node) node.classList.add('hover'); d.hover = node; }
    }
    function autoScroll() {
      var d = drag; if (!d) return;
      var edge = 56, vh = window.innerHeight, dy = 0;
      if (d.y < edge) dy = -Math.ceil((edge - d.y) / 4);
      else if (d.y > vh - edge) dy = Math.ceil((d.y - (vh - edge)) / 4);
      if (dy) window.scrollBy({ top: dy, left: 0, behavior: 'instant' });
      d.loop = requestAnimationFrame(autoScroll);
    }
    function endDrag() {
      var d = drag; drag = null;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
      if (d.raf) cancelAnimationFrame(d.raf);
      if (d.loop) cancelAnimationFrame(d.loop);
      if (d.hover) d.hover.classList.remove('hover');
      document.body.classList.remove('dragging-active');
      return d;
    }
    function unlift(d) {
      var chip = d.chip;
      chip.classList.remove('dragging');
      chip.style.position = ''; chip.style.left = ''; chip.style.top = ''; chip.style.width = ''; chip.style.transform = ''; chip.style.margin = '';
      if (d.ph && d.ph.parentNode) d.ph.remove();
    }
    function onPointerUp(e) {
      var d = drag; if (!d || e.pointerId !== d.id) return;
      d.x = e.clientX; d.y = e.clientY;
      var lifted = d.lifted;
      endDrag();
      if (!lifted) return;                 /* a tap: the click handler runs the tap alternative */
      var t = targetAt(d.x, d.y);
      unlift(d);
      var idx = +d.chip.getAttribute('data-pair');
      if (t) place(idx, t.pos); else render();
      setTimeout(function () { d.chip._dragged = false; }, 0);
    }
    function onPointerCancel(e) {
      var d = drag; if (!d || e.pointerId !== d.id) return;
      endDrag();
      if (d.lifted) { unlift(d); render(); }
    }
    render();
    return {
      check: function () {
        locked = true;
        var n = 0;
        cardEls.forEach(function (card, pos) {
          var want = sh.cards[pos];
          var got = placed[pos];
          var chip = card.querySelector('.chip'); if (chip) chip.disabled = true;
          var ok = got === want;
          if (ok) n++;
          card.classList.add(ok ? 'is-right' : 'is-wrong');
          card.appendChild(el('p', { class: 'verdict', text: ok ? '✓' : '✗' }));
          if (!ok) card.appendChild(el('p', { class: 'correct-term', text: fmt(q.correctTermLabel, { term: q.pairs[want].term }) }));
        });
        trayWrap.querySelectorAll('.chip').forEach(function (c) { c.disabled = true; });
        state.answers.A = placed.slice();
        return { marks: n, cls: n === q.marks ? 'right' : n > 0 ? 'part' : 'wrong', headline: q.summary[n], body: [el('p', { class: 'feedback-body', text: q.teach })] };
      }
    };
  }

  document.addEventListener('selectstart', function (e) { if (document.body.classList.contains('dragging-active')) e.preventDefault(); });

  /* ---------- results ---------- */
  function buildResults() {
    var sheet = el('section', { class: 'sheet page results', 'aria-labelledby': 'results-h1' });
    sheet.appendChild(el('h1', { id: 'results-h1', text: C.results.heading }));
    sheet.appendChild(el('div', { class: 'meta-row' }, [
      el('div', {}, [el('div', { class: 'k', text: C.results.nameLabel }), el('div', { class: 'v', text: state.name })]),
      el('div', {}, [el('div', { class: 'k', text: C.results.classLabel }), el('div', { class: 'v', text: state.cls })]),
      el('div', {}, [el('div', { class: 'k', text: C.results.dateLabel }), el('div', { class: 'v', text: todayStr() })])
    ]));
    var score = total();
    sheet.appendChild(el('p', { class: 'score-line', text: fmt(C.results.scoreLine, { score: score }) }));
    var band = score >= 10 ? 10 : score >= 8 ? 8 : score >= 5 ? 5 : 0;
    sheet.appendChild(el('p', { class: 'verdict', text: C.results.verdict[band] }));
    var table = el('table', { class: 'results-table' });
    var tbody = el('tbody');
    Q.forEach(function (q, i) {
      var m = state.marks[i];
      var sym = m === q.marks ? el('span', { class: 'ok', text: '✓ ' }) : m === 0 ? el('span', { class: 'no', text: '✗ ' }) : el('span', { class: 'part', text: '● ' });
      tbody.appendChild(el('tr', {}, [
        el('td', {}, [fmt(C.results.perQuestion, { letter: q.letter }) + ' · ', el('span', { class: 'q-topic', text: q.topic })]),
        el('td', { class: 'marks' }, [sym, fmt(C.marksOf, { got: m, max: q.marks })])
      ]));
      var texts = q.letter === 'C' ? [state.answers.C] : q.letter === 'F' ? state.answers.F : null;
      if (texts) texts.forEach(function (t, k) {
        var label = q.letter === 'F' ? q.parts[k].label + ' ' : '';
        tbody.appendChild(el('tr', { class: 'answer-row' }, [el('td', { colspan: '2' }, [label, el('span', { class: 'quoted', text: fmt(C.results.yourAnswer, { text: t }) })])]));
      });
    });
    table.appendChild(tbody);
    sheet.appendChild(table);
    sheet.appendChild(el('p', { class: 'note', text: C.results.note }));
    var saveBtn = el('button', { type: 'button', class: 'btn btn-primary', id: 'save-btn', text: C.buttons.save });
    var retryBtn = el('button', { type: 'button', class: 'btn btn-secondary', id: 'retry-btn', text: C.buttons.retry });
    var creditsBtn = el('button', { type: 'button', class: 'btn-link', text: C.buttons.credits, onclick: openCredits });
    var actions = el('div', { class: 'actions' }, [saveBtn, retryBtn, creditsBtn]);
    sheet.appendChild(actions);
    var confirmBox = null;
    retryBtn.addEventListener('click', function () {
      if (confirmBox) return;
      confirmBox = el('div', { class: 'confirm-card', role: 'group', 'aria-label': C.buttons.retry }, [
        el('p', { text: C.results.retryConfirm }),
        el('div', { class: 'actions' }, [
          el('button', { type: 'button', class: 'btn btn-primary', id: 'retry-yes', text: C.results.retryYes, onclick: function () {
            var name = state.name, cls = state.cls;
            state = freshState(name, cls); state.started = true; save();
            sfx.turn();
            goto(0);
          } }),
          el('button', { type: 'button', class: 'btn btn-secondary', id: 'retry-no', text: C.results.retryNo, onclick: function () { confirmBox.remove(); confirmBox = null; retryBtn.focus(); } })
        ])
      ]);
      sheet.appendChild(confirmBox);
      confirmBox.querySelector('#retry-yes').focus();
    });
    saveBtn.addEventListener('click', function () { savePicture(saveBtn, actions); });
    return sheet;
  }

  /* ---------- save as picture ---------- */
  function wrapText(ctx2d, text, x, y, maxW, lh) {
    var words = String(text).split(/\s+/), line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx2d.measureText(test).width > maxW && line) { ctx2d.fillText(line, x, y); line = words[i]; y += lh; }
      else line = test;
    }
    if (line) ctx2d.fillText(line, x, y);
    return y + lh;
  }
  function savePicture(btn, actions) {
    var label = btn.textContent;
    btn.textContent = C.buttons.saving; btn.disabled = true;
    var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('600 32px "Asap Condensed"'), document.fonts.load('700 64px "Asap Condensed"'), document.fonts.load('400 24px "Asap Condensed"')]).catch(function () {}) : Promise.resolve();
    fontsReady.then(function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var W = 1200, pad = 60, y = 0;
      var fam = '"Asap Condensed", "Arial Narrow", Arial, sans-serif';
      /* measure pass on a scratch canvas */
      var scratch = document.createElement('canvas').getContext('2d');
      var score = total();
      var band = score >= 10 ? 10 : score >= 8 ? 8 : score >= 5 ? 5 : 0;
      function draw(ctx2d, measureOnly) {
        var cy = pad;
        ctx2d.textBaseline = 'top';
        ctx2d.fillStyle = '#7A1F2B'; ctx2d.font = '700 52px ' + fam;
        if (!measureOnly) ctx2d.fillText(C.title, pad, cy); cy += 64;
        ctx2d.font = '400 24px ' + fam; ctx2d.fillStyle = '#6B4A50';
        if (!measureOnly) ctx2d.fillText(C.results.heading + ' · ' + C.subtitle, pad, cy); cy += 44;
        ctx2d.font = '600 28px ' + fam; ctx2d.fillStyle = '#2B1519';
        var meta = C.results.nameLabel + ': ' + state.name + (state.cls ? '    ' + C.results.classLabel + ': ' + state.cls : '') + '    ' + C.results.dateLabel + ': ' + todayStr();
        if (!measureOnly) cy = wrapText(ctx2d, meta, pad, cy, W - pad * 2, 36); else cy += 36;
        cy += 16;
        ctx2d.font = '700 84px ' + fam; ctx2d.fillStyle = '#7A1F2B';
        if (!measureOnly) ctx2d.fillText(fmt(C.results.scoreLine, { score: score }), pad, cy); cy += 96;
        ctx2d.font = '600 28px ' + fam; ctx2d.fillStyle = '#2B1519';
        if (!measureOnly) cy = wrapText(ctx2d, C.results.verdict[band], pad, cy, W - pad * 2, 36); else cy += 36;
        cy += 20;
        Q.forEach(function (q, i) {
          var m = state.marks[i];
          ctx2d.font = '600 28px ' + fam; ctx2d.fillStyle = '#2B1519';
          if (!measureOnly) {
            ctx2d.fillStyle = '#E7C6CC'; ctx2d.fillRect(pad, cy - 10, W - pad * 2, 1);
            ctx2d.fillStyle = '#2B1519';
            ctx2d.fillText(fmt(C.results.perQuestion, { letter: q.letter }) + ' · ' + q.topic, pad, cy);
            ctx2d.textAlign = 'right';
            ctx2d.fillStyle = m === q.marks ? '#1F6B3A' : m === 0 ? '#B3261E' : '#8A6A00';
            ctx2d.fillText((m === q.marks ? '✓ ' : m === 0 ? '✗ ' : '● ') + fmt(C.marksOf, { got: m, max: q.marks }), W - pad, cy);
            ctx2d.textAlign = 'left';
          }
          cy += 40;
          var texts = q.letter === 'C' ? [state.answers.C] : q.letter === 'F' ? state.answers.F : null;
          if (texts) texts.forEach(function (t, k) {
            ctx2d.font = 'italic 400 24px ' + fam; ctx2d.fillStyle = '#6B4A50';
            var label = q.letter === 'F' ? q.parts[k].label + ' ' : '';
            var s = label + fmt(C.results.yourAnswer, { text: t });
            if (!measureOnly) cy = wrapText(ctx2d, s, pad + 24, cy, W - pad * 2 - 24, 32);
            else { var words = s.split(/\s+/), line = '', n = 1; for (var w = 0; w < words.length; w++) { var tst = line ? line + ' ' + words[w] : words[w]; if (ctx2d.measureText(tst).width > W - pad * 2 - 24 && line) { n++; line = words[w]; } else line = tst; } cy += n * 32; }
            cy += 8;
          });
          cy += 8;
        });
        cy += 20;
        ctx2d.font = '400 22px ' + fam; ctx2d.fillStyle = '#6B4A50';
        if (!measureOnly) ctx2d.fillText('OLS Digital Skills', pad, cy); cy += 30;
        return cy + pad;
      }
      var H = Math.ceil(draw(scratch, true));
      var canvas = document.createElement('canvas');
      canvas.width = W * dpr; canvas.height = H * dpr;
      var g = canvas.getContext('2d');
      g.scale(dpr, dpr);
      g.fillStyle = '#FDF4F5'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#7A1F2B'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);
      g.strokeStyle = '#F5D45E'; g.lineWidth = 1; g.strokeRect(9.5, 9.5, W - 19, H - 19);
      draw(g, false);
      var done = function () { btn.textContent = label; btn.disabled = false; };
      canvas.toBlob(function (blob) {
        if (!blob) { done(); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var fname = 'Exodus-paper-' + slug(state.name) + '.png';
        if ('download' in a) {
          a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
        } else {
          window.open(url, '_blank');
          if (!actions.querySelector('.save-fallback')) actions.appendChild(el('p', { class: 'save-fallback', text: C.buttons.saveFallback }));
        }
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        window.__exodusLastPng = { size: blob.size, width: canvas.width, height: canvas.height };
        done();
      }, 'image/png');
    });
  }

  /* ---------- credits dialog ---------- */
  var dialog = document.getElementById('credits-dialog');
  var lastFocus = null;
  (function fillCredits() {
    document.getElementById('credits-heading').textContent = C.credits.heading;
    document.getElementById('credits-intro').textContent = C.credits.intro;
    var ul = document.getElementById('credits-lines');
    C.credits.lines.forEach(function (l) { ul.appendChild(el('li', { text: l })); });
    var close = document.getElementById('credits-close');
    close.textContent = C.buttons.close;
    close.addEventListener('click', closeCredits);
    dialog.addEventListener('close', function () { if (lastFocus) lastFocus.focus(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeCredits(); });
  })();
  function openCredits() {
    lastFocus = document.activeElement;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else { dialog.setAttribute('open', ''); }
    document.getElementById('credits-close').focus();
  }
  function closeCredits() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else { dialog.removeAttribute('open'); if (lastFocus) lastFocus.focus(); }
  }

  /* ---------- boot ---------- */
  function boot() {
    var saved = load();
    if (saved && saved.started) {
      state = saved;
      if (state.finished || state.index >= Q.length) { state.finished = true; state.index = Q.length; goto(Q.length); return; }
      document.body.classList.remove('on-cover');
      renderStages(); renderLamps(false);
      var card = el('div', { class: 'resume-card', role: 'status', text: fmt(C.cover.resumeNotice, { letter: Q[state.index].letter }) });
      app.appendChild(card);
      showPage(function () { return buildQuestion(Q[state.index]); }, { animate: false, keepResume: true });
      return;
    }
    state = saved || freshState();
    state.started = false;
    showPage(buildCover, { animate: false });
  }
  boot();
})();
