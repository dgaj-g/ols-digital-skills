/* The Glass Jotter — the Jotter Page working pane.
   One mount() per question. Pupils commit working line by line (algebra)
   or step by step (angles), declaring the move / the reason. Nothing is
   judged until Check My Working (place-all-then-check); two attempts;
   attempt 1 stays on the page struck through. Marking is performed like
   a returned jotter: pen-speed ticks, M·A tally, boxed answer, one red
   handwritten comment. */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function sv(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pretty(s) { // display form: ascii operators → typeset
    return String(s).replace(/-/g, '−').replace(/\*/g, '×').replace(/−(\d)/g, '−$1');
  }
  function drawMark(holder, kind) { // kind: tick | tick-hollow | tick-amber | cross
    holder.innerHTML = '';
    var cls = 'mark-tick' + (kind === 'tick-hollow' ? ' hollow' : '') + (kind === 'tick-amber' ? ' amber' : '');
    if (kind === 'cross') cls = 'mark-cross';
    var s = sv('svg', { viewBox: '0 0 30 26', class: cls });
    s.style.cssText = 'width:100%;height:100%;overflow:visible';
    var paths = kind === 'cross'
      ? [sv('path', { d: 'M5 4 L25 22' }), sv('path', { d: 'M25 4 L5 22' })]
      : [sv('path', { d: 'M4 14 L11 21 L26 5' })];
    var pr = Promise.resolve();
    paths.forEach(function (p) {
      s.appendChild(p);
      pr = pr.then(function () {
        if (REDUCED) return;
        var len = p.getTotalLength();
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        p.getBoundingClientRect();
        p.style.transition = 'stroke-dashoffset ' + Math.min(400, len / 0.45) + 'ms linear';
        p.style.strokeDashoffset = 0;
        return new Promise(function (r) { setTimeout(r, Math.min(400, len / 0.45) + 30); });
      });
    });
    holder.appendChild(s);
    return pr;
  }

  // Comments are keyed by QUESTION KIND so the praise fits what the pupil actually
  // did. "working" = line-by-line questions (algebra + angle reasoning). "classify"
  // = tap-the-type. "protractor" = measure-and-read. A classify pupil clicked a
  // button — they must never be told their "working" or "lines" were lovely.
  var COMMENTS = {
    working: {
      perfect: ['Good — equals signs lined up.', 'Neat, clear working.', 'Every line earns its mark.'],
      partial: ['Look again at the boxed line.', 'So close — one line lets it down.', 'The method is there — mind that step.'],
      amber: ['Right answer — now show me the working.', 'Correct, but a marker needs to see the method.'],
      fail: ['We’ll look at this one together in class.', 'Watch the worked example again, then retry the idea in class.']
    },
    classify: {
      perfect: ['Spot on — that’s the right type.', 'Yes — you sized it up correctly.', 'Correct — good eye.'],
      fail: ['Not the right type — we’ll size it up together in class.', 'Compare it against 90° and 180° next time.']
    },
    protractor: {
      perfect: ['Measured spot on.', 'Neatly lined up — an accurate reading.', 'Bang on — careful measuring.']
    }
  };
  function commentFor(qid, bucket, kind) {
    var set = COMMENTS[kind] || COMMENTS.working;
    var bank = set[bucket] || COMMENTS.working[bucket] || [];
    if (!bank.length) return '';
    var h = 0; for (var i = 0; i < qid.length; i++) h = (h * 31 + qid.charCodeAt(i)) % 9973;
    return bank[h % bank.length];
  }

  function shuffle(arr, seedStr) {
    var a = arr.slice(), h = 2166136261;
    var s = seedStr + Date.now();
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    for (var j = a.length - 1; j > 0; j--) {
      h = (h * 1103515245 + 12345) >>> 0;
      var k = h % (j + 1);
      var t = a[j]; a[j] = a[k]; a[k] = t;
    }
    return a;
  }

  /* ── the maths keypad (div-caret composer; native keyboard never opens) ── */
  function makeComposer(host, opts) {
    opts = opts || {};
    var buf = '';
    var compose = el('div', 'compose');
    compose.setAttribute('tabindex', '0');
    compose.setAttribute('role', 'textbox');
    compose.setAttribute('aria-label', opts.label || 'Write the next step of working');
    var content = el('span', 'compose-text');
    var caret = el('span', 'caret');
    var ph = el('span', 'ph', opts.placeholder || 'write the new line here');
    compose.appendChild(content); compose.appendChild(caret); compose.appendChild(ph);
    (opts.fieldHost || host).appendChild(compose);   // fieldHost lets the input sit inline (e.g. ∠PVR = [__] °); keypad still goes to host

    var COMMIT = '';   // sentinel for the commit key, so its label can change without breaking handling
    var isNumberPad = opts.pad === 'number';
    var KEYS = isNumberPad
      // a compact number pad — an angle size or a measurement is just a number (+ minus for an optional sum)
      ? ['7', '8', '9',
         '4', '5', '6',
         '1', '2', '3',
         '−', '0', '⌫']
      : opts.numericOnly
        ? ['7', '8', '9', '+', '−', '(', ')', '⌫',
           '4', '5', '6', '×', '÷', '0', '.', '/',
           '1', '2', '3', '↶', '', '', '', COMMIT]
        : ['7', '8', '9', '+', '−', '(', ')', '⌫',
           '4', '5', '6', '×', '÷', 'x', 'x²', '/',
           '1', '2', '3', '0', '.', '=', '↶', COMMIT];
    var pad = el('div', 'keypad' + (isNumberPad ? ' keypad-num' : ''));
    KEYS.forEach(function (k) {
      if (k === '') { pad.appendChild(el('span', '')); return; }
      if (k === COMMIT) {
        var gb = el('button', 'key key-go key-wide');
        gb.type = 'button';
        gb.textContent = opts.commitLabel || '✓ Done';
        gb.addEventListener('click', function () { if (opts.onCommit) opts.onCommit(buf.trim()); });
        pad.appendChild(gb);
        return;
      }
      var b = el('button', 'key' + (k === '⌫' ? ' key-del' : ''));
      b.type = 'button';
      b.textContent = k;
      b.addEventListener('click', function () { press(k); });
      pad.appendChild(b);
    });
    host.appendChild(pad);

    // FOOLPROOF keyboard rule: the number pad is only for devices with no keyboard.
    // The on-screen buttons fire click (not keydown), so any keydown here proves a
    // real keyboard — hide the pad the instant one arrives. Touch-only users never
    // fire a keydown, so they keep the pad. No device guessing.
    function maybeHidePad() { if (isNumberPad) pad.style.display = 'none'; }

    function render() {
      content.textContent = buf;
      ph.style.display = buf ? 'none' : '';
    }
    function press(k) {
      if (k === '⌫') buf = buf.slice(0, -1);
      else if (k === '↶') buf = '';
      else if (k === 'x²') buf += 'x²';
      else buf += k;
      render();
    }
    compose.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); maybeHidePad(); if (opts.onCommit) opts.onCommit(buf.trim()); return; }
      if (e.key === 'Backspace') { e.preventDefault(); buf = buf.slice(0, -1); render(); maybeHidePad(); return; }
      if (e.key.length === 1 && /[0-9x+\-*/().=\s]/.test(e.key)) {
        e.preventDefault();
        var k = e.key === '-' ? '−' : e.key === '*' ? '×' : e.key === '/' ? '/' : e.key;
        if ((opts.numericOnly || isNumberPad) && (k === 'x' || k === '=')) return;
        if (isNumberPad && !/[0-9−\s]/.test(k)) return;   // number field: digits + minus only
        buf += k;
        render();
        maybeHidePad();
      }
    });
    render();
    return {
      value: function () { return buf.trim(); },
      clear: function () { buf = ''; render(); },
      set: function (v) { buf = v; render(); },
      focus: function () { compose.focus(); },
      root: compose
    };
  }

  /* ── classify questions (s1 "Know your angles"): judge the drawn
       angle by eye — options always the full set, shuffled, two attempts,
       nothing marked until Check. ─────────────────────────────────── */
  function mountClassify(host, q, savedRec, hooks) {
    var rec = savedRec || { att: [], lock: false, ovr: null };
    if (!rec.att) rec.att = [];
    var t0 = Date.now();
    var wrap = el('div', 'jotter-q');
    var margin = el('div', 'jq-margin', 'Q' + hooks.number);
    var body = el('div', 'jq-body');
    wrap.appendChild(margin); wrap.appendChild(body);
    host.appendChild(wrap);
    body.appendChild(el('p', 'jq-prompt', esc(q.prompt) + ' <span class="q-marks">[1 mark]</span>'));
    var dwrap = el('div', 'jq-diagram');
    body.appendChild(dwrap);
    window.GJ_PLAYER.renderDiagram(dwrap, q.diagram, {});
    var pick = null;
    var cards = el('div', 'reason-cards');
    body.appendChild(cards);
    var feedback = el('div', 'jq-feedback');
    var checkRow = el('div', 'check-row');
    var checkBtn = el('button', 'btn-stamp', 'Check my answer');
    checkBtn.type = 'button';
    checkBtn.disabled = true;
    checkRow.appendChild(checkBtn);
    body.appendChild(checkRow);
    body.appendChild(feedback);

    function renderOptions() {
      cards.innerHTML = '';
      shuffle(q.options, q.id).forEach(function (o) {
        var b = el('button', 'reason-card');
        b.type = 'button';
        b.textContent = o.charAt(0).toUpperCase() + o.slice(1);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          if (rec.lock) return;
          cards.querySelectorAll('.reason-card').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          pick = o;
          checkBtn.disabled = false;
        });
        cards.appendChild(b);
      });
    }
    function finish(last, instant) {
      var right = last.pick === q.classify;
      feedback.innerHTML = '';
      var mk = el('span', 'wl-mark');
      mk.style.cssText = 'position:static;display:inline-block;width:26px;height:22px;vertical-align:middle';
      feedback.appendChild(mk);
      drawMark(mk, right ? 'tick' : 'cross');
      feedback.appendChild(el('span', 'mk-tally ' + (right ? 'mk-correct' : 'mk-wrong'), ' ' + (right ? '1/1' : '0/1')));
      if (rec.lock) {
        feedback.appendChild(el('p', 'mk-comment ' + (right ? 'mk-correct' : 'mk-wrong'), right ? commentFor(q.id, 'perfect', 'classify') : commentFor(q.id, 'fail', 'classify')));
        if (!right) feedback.appendChild(el('p', 'ui-msg', 'You answered “' + esc(last.pick) + '” — your teacher can see this and will pick it up in class.'));
        checkRow.hidden = true;
        cards.querySelectorAll('.reason-card').forEach(function (x) { x.disabled = true; });
        margin.innerHTML = 'Q' + hooks.number + '<div class="mk-tally ' + (right ? 'mk-correct' : 'mk-wrong') + '" style="font-size:18px">' + (right ? '1' : '0') + '/1</div>';
      } else if (!instant) {
        feedback.appendChild(el('p', 'ui-msg', 'Not that one — look again at its size against 90° and 180°. One more attempt.'));
        pick = null;
        checkBtn.disabled = true;
        cards.querySelectorAll('.reason-card').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      }
      if (!instant) feedback.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
    }
    checkBtn.addEventListener('click', function () {
      if (!pick || rec.lock) return;
      var att = { pick: pick, dur: Math.round((Date.now() - t0) / 1000), res: pick === q.classify ? 'OK' : 'X@1' };
      rec.att.push(att);
      if (pick === q.classify || rec.att.length >= 2) rec.lock = true;
      finish(att);
      hooks.onSave(q.id, rec);
      checkBtn.disabled = true;
    });
    renderOptions();
    if (rec.lock && rec.att.length) finish(rec.att[rec.att.length - 1], true);
    return { qid: q.id };
  }

  /* ── protractor questions (s1 "measure the angle"): a real on-screen
       protractor the pupil drags onto the corner, rotates to line the
       zero up with one arm, then reads off and types the size. Genuine
       fail state — misplace it and you misread; the classic "read the
       other scale" slip is caught with a teaching note. ───────────── */
  function protractorMark(q, read) {
    var tol = q.tol || 3;
    if (Math.abs(read - q.value) <= tol) return { ok: true };
    if (Math.abs(read - (180 - q.value)) <= tol) return { ok: false, dx: 'WRONG_SCALE' };
    return { ok: false, dx: 'MISREAD' };
  }
  var PROT_R = 108;
  function buildProtractor() {
    var R = PROT_R, p = [], d, rad, x1, y1, x2, y2, len;
    p.push('<path d="M ' + (-R) + ' 0 A ' + R + ' ' + R + ' 0 0 1 ' + R + ' 0 Z" fill="rgba(15,107,102,0.10)" stroke="#0F6B66" stroke-width="1.6"/>');
    p.push('<path d="M ' + (-(R - 44)) + ' 0 A ' + (R - 44) + ' ' + (R - 44) + ' 0 0 1 ' + (R - 44) + ' 0" fill="none" stroke="#0F6B66" stroke-width="0.8" opacity="0.5"/>');
    p.push('<line x1="' + (-R) + '" y1="0" x2="' + R + '" y2="0" stroke="#0F6B66" stroke-width="1.4"/>');
    for (d = 0; d <= 180; d++) {
      rad = d * Math.PI / 180; len = (d % 10 === 0) ? 13 : (d % 5 === 0) ? 9 : 5;
      x1 = Math.cos(rad) * R; y1 = -Math.sin(rad) * R;
      x2 = Math.cos(rad) * (R - len); y2 = -Math.sin(rad) * (R - len);
      p.push('<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#0F6B66" stroke-width="' + (d % 10 === 0 ? 1 : 0.55) + '"/>');
    }
    for (d = 0; d <= 180; d += 10) {
      rad = d * Math.PI / 180;
      var ox = Math.cos(rad) * (R - 20), oy = -Math.sin(rad) * (R - 20) + 3;
      var ix = Math.cos(rad) * (R - 35), iy = -Math.sin(rad) * (R - 35) + 3;
      var endCls = '';
      if (d === 0 || d === 180) {
        /* the 0/180 labels fall ON the baseline; tuck them right down onto
           the baseline endpoints (smaller, via .end) so they sit clearly
           BELOW the 10/170 arc numbers and inside the rim, never clipping. */
        var s = (d === 0) ? 1 : -1;
        ox = s * (R - 12); oy = -3;
        ix = s * (R - 30); iy = -3;
        endCls = ' end';
      }
      p.push('<text data-pos="' + d + '" x="' + ox.toFixed(1) + '" y="' + oy.toFixed(1) + '" text-anchor="middle" class="prot-num' + endCls + '">' + d + '</text>');
      p.push('<text data-pos="' + d + '" x="' + ix.toFixed(1) + '" y="' + iy.toFixed(1) + '" text-anchor="middle" class="prot-num inner' + endCls + '">' + (180 - d) + '</text>');
    }
    p.push('<g class="prot-centre"><circle cx="0" cy="0" r="3.5" fill="none" stroke="#C8102E" stroke-width="1.4"/><line x1="-10" y1="0" x2="10" y2="0" stroke="#C8102E" stroke-width="1"/><line x1="0" y1="-10" x2="0" y2="7" stroke="#C8102E" stroke-width="1"/></g>');
    /* a turning knob at BOTH baseline ends, so one is always reachable even
       when an arm or the pupil's hand covers the other */
    function knob(hx) {
      return '<g class="rotate-handle" style="cursor:grab"><circle cx="' + hx + '" cy="0" r="12" fill="#0F6B66"/>' +
        '<path d="M ' + (hx - 5) + ' -4 A 6 6 0 1 1 ' + (hx - 5) + ' 4" fill="none" stroke="#fff" stroke-width="1.5"/>' +
        '<path d="M ' + (hx - 8) + ' 3 l 3 4 l 3 -3 z" fill="#fff"/></g>';
    }
    p.push(knob(R + 15));
    p.push(knob(-(R + 15)));
    return p.join('');
  }

  function mountProtractor(host, q, savedRec, hooks) {
    var rec = savedRec || { att: [], lock: false, ovr: null };
    if (!rec.att) rec.att = [];
    var t0 = Date.now();

    var wrap = el('div', 'jotter-q');
    var margin = el('div', 'jq-margin', 'Q' + hooks.number);
    var body = el('div', 'jq-body');
    wrap.appendChild(margin); wrap.appendChild(body);
    host.appendChild(wrap);
    body.appendChild(el('p', 'jq-prompt', esc(q.prompt) + ' <span class="q-marks">[1 mark]</span>'));

    var VBW = 400, VBH = 290;
    var pwrap = el('div', 'prot-wrap');
    body.appendChild(pwrap);
    var svg = sv('svg', { viewBox: '0 0 ' + VBW + ' ' + VBH, class: 'protractor-canvas' });
    svg.style.cssText = 'touch-action:none;max-width:540px;width:100%;display:block;margin:0 auto';
    pwrap.appendChild(svg);

    var V = q.vertex || [252, 212], L = q.armLen || 130;
    function ray(deg) { var r = deg * Math.PI / 180; return [V[0] + Math.cos(r) * L, V[1] - Math.sin(r) * L]; }
    var a1 = ray(q.armDeg), a2 = ray(q.armDeg + q.value);
    var gAngle = sv('g', {});
    [a1, a2].forEach(function (pt) { gAngle.appendChild(sv('line', { x1: V[0], y1: V[1], x2: pt[0], y2: pt[1], stroke: '#14213A', 'stroke-width': 2.6, 'stroke-linecap': 'round' })); });
    gAngle.appendChild(sv('circle', { cx: V[0], cy: V[1], r: 3, fill: '#14213A' }));
    svg.appendChild(gAngle);

    var prot = sv('g', { class: 'protractor-tool' });
    prot.innerHTML = buildProtractor();
    svg.appendChild(prot);
    var focus = sv('g', { class: 'prot-focus' });
    prot.appendChild(focus);

    /* Reading aid: once the centre is seated on the vertex, light the
       number(s) each arm crosses (both scales) and mark the exact crossing
       in gold — so the squished scale numbers pop into focus for reading.
       It pops BOTH scales and only when correctly seated, so it aids the
       READING without doing the scale-choice or the placement for her. */
    var armA = [q.armDeg, q.armDeg + q.value];
    var litKey = null;
    function updateReadout() {
      var seated = Math.hypot(state.cx - V[0], state.cy - V[1]) < 14;
      var crossings = [];
      if (seated) {
        armA.forEach(function (A) {
          var dd = ((A + state.rot) % 360 + 360) % 360;   // scale degree this arm points at
          if (dd >= 0 && dd <= 180) crossings.push(dd);
        });
      }
      var key = crossings.map(function (c) { return Math.round(c); }).sort().join(',');
      if (key === litKey) return;
      litKey = key;
      Array.prototype.forEach.call(prot.querySelectorAll('.prot-num.lit'), function (n) { n.classList.remove('lit'); });
      while (focus.firstChild) focus.removeChild(focus.firstChild);
      crossings.forEach(function (dd) {
        var rad = dd * Math.PI / 180, cx = Math.cos(rad), cy = -Math.sin(rad);
        focus.appendChild(sv('line', { x1: (cx * (PROT_R - 15)).toFixed(1), y1: (cy * (PROT_R - 15)).toFixed(1), x2: (cx * (PROT_R + 3)).toFixed(1), y2: (cy * (PROT_R + 3)).toFixed(1), stroke: '#E4B824', 'stroke-width': 3, 'stroke-linecap': 'round' }));
        focus.appendChild(sv('circle', { cx: (cx * PROT_R).toFixed(1), cy: (cy * PROT_R).toFixed(1), r: 3.2, fill: '#E4B824' }));
        // light BOTH tens the reading sits between (e.g. 115 -> 110 and 120),
        // so the aid never implies a single rounded value like "120" for a true 115
        var lo = Math.max(0, Math.floor(dd / 10) * 10), hi = Math.min(180, Math.ceil(dd / 10) * 10);
        [lo, hi].forEach(function (lab) {
          Array.prototype.forEach.call(prot.querySelectorAll('[data-pos="' + lab + '"]'), function (n) { n.classList.add('lit'); });
        });
      });
    }

    var state = { cx: 152, cy: 128, rot: 0 };  // starts above the angle, both knobs on-canvas
    function apply() { prot.setAttribute('transform', 'translate(' + state.cx.toFixed(1) + ',' + state.cy.toFixed(1) + ') rotate(' + state.rot.toFixed(1) + ')'); updateReadout(); }
    apply();

    function toSvg(e) { var pp = svg.createSVGPoint(); pp.x = e.clientX; pp.y = e.clientY; return pp.matrixTransform(svg.getScreenCTM().inverse()); }
    var drag = null;
    function onMove(e) {
      if (!drag) return;
      var pp = toSvg(e);
      if (drag.mode === 'move') { state.cx = drag.cx + (pp.x - drag.p.x); state.cy = drag.cy + (pp.y - drag.p.y); }
      else { var ang = Math.atan2(pp.y - state.cy, pp.x - state.cx); state.rot = drag.rot + (ang - drag.ang) * 180 / Math.PI; }
      apply();
    }
    function onUp() {
      drag = null;
      document.body.classList.remove('dragging-active');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    }
    function onDown(e, mode) {
      if (rec.lock) return;
      e.preventDefault();
      var pp = toSvg(e);
      document.body.classList.add('dragging-active');
      drag = { mode: mode, p: pp, cx: state.cx, cy: state.cy, rot: state.rot, ang: Math.atan2(pp.y - state.cy, pp.x - state.cx) };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    }
    prot.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('.rotate-handle')) return;
      onDown(e, 'move');
    });
    Array.prototype.forEach.call(prot.querySelectorAll('.rotate-handle'), function (h) {
      h.addEventListener('pointerdown', function (e) { e.stopPropagation(); onDown(e, 'rotate'); });
    });

    body.appendChild(el('p', 'ui-msg', 'Line the small red centre mark on the corner, then use a rotate knob (at either end) to turn the protractor so 0 sits along one arm, and read where the other arm crosses.'));
    var compHost = el('div', '');
    body.appendChild(compHost);
    var composer = makeComposer(compHost, { pad: 'number', label: 'Your measurement in degrees', placeholder: 'the size you measure, in degrees', onCommit: function () { runCheck(); } });

    var msgEl = el('p', 'ui-msg');
    body.appendChild(msgEl);
    var checkRow = el('div', 'check-row');
    var checkBtn = el('button', 'btn-stamp', 'Check my measurement');
    checkBtn.type = 'button';
    checkRow.appendChild(checkBtn);
    body.appendChild(checkRow);
    var feedback = el('div', 'jq-feedback');
    body.appendChild(feedback);

    function flash(t) { msgEl.textContent = t; }

    function finish(last, instant) {
      var res = protractorMark(q, last.read);
      feedback.innerHTML = '';
      var mk = el('span', 'wl-mark');
      mk.style.cssText = 'position:static;display:inline-block;width:26px;height:22px;vertical-align:middle';
      feedback.appendChild(mk);
      drawMark(mk, res.ok ? 'tick' : 'cross');
      feedback.appendChild(el('span', 'mk-tally ' + (res.ok ? 'mk-correct' : 'mk-wrong'), ' ' + (res.ok ? '1/1' : '0/1') + (res.ok ? '' : ' · you measured ' + last.read + '°')));
      if (rec.lock) {
        if (res.ok) feedback.appendChild(el('p', 'mk-comment mk-correct', commentFor(q.id, 'perfect', 'protractor')));
        else if (res.dx === 'WRONG_SCALE') feedback.appendChild(el('p', 'amber-note', 'You read the other scale — use the one that starts at 0 on the arm you lined up. The true size is ' + q.value + '°.'));
        else feedback.appendChild(el('p', 'ui-msg', 'Not quite — line the centre on the corner and 0 along an arm, then read again. The true size is ' + q.value + '°.'));
        checkRow.hidden = true;
        composer.root.setAttribute('aria-disabled', 'true');
        margin.innerHTML = 'Q' + hooks.number + '<div class="mk-tally ' + (res.ok ? 'mk-correct' : 'mk-wrong') + '" style="font-size:18px">' + (res.ok ? '1' : '0') + '/1</div>';
      } else if (!instant) {
        if (res.dx === 'WRONG_SCALE') feedback.appendChild(el('p', 'amber-note', 'Close — but check you are reading the scale that starts at 0 on your lined-up arm. One more go.'));
        else feedback.appendChild(el('p', 'ui-msg', 'Line it up carefully and read again — one more attempt.'));
        composer.clear();
      }
      if (!instant) feedback.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
    }

    function runCheck() {
      if (rec.lock) return;
      var raw = composer.value();
      var read = parseInt(raw, 10);
      if (raw === '' || isNaN(read)) { flash('Type the size you measured first.'); return; }
      if (read < 0 || read > 180) { flash('A protractor measures up to 180° — read the size again.'); return; }
      var res = protractorMark(q, read);
      var att = { read: read, dur: Math.round((Date.now() - t0) / 1000), res: res.ok ? 'OK' : 'X@1' };
      if (res.dx) att.dx = res.dx;
      rec.att.push(att);
      if (res.ok || rec.att.length >= 2) rec.lock = true;
      finish(att);
      hooks.onSave(q.id, rec);
    }
    checkBtn.addEventListener('click', runCheck);

    if (rec.lock && rec.att.length) finish(rec.att[rec.att.length - 1], true);
    else composer.focus();   // ready to type the measurement without a second tap
    return { qid: q.id };
  }

  /* ═════════ mount ═════════════════════════════════════════════════ */
  function mount(host, q, savedRec, hooks) {
    if (q.kind === 'classify') return mountClassify(host, q, savedRec, hooks);
    if (q.kind === 'protractor') return mountProtractor(host, q, savedRec, hooks);
    var actId = hooks.actId;
    var isAngles = actId === 'angles';
    var rec = savedRec || { att: [], lock: false, ovr: null };
    if (!rec.att) rec.att = [];
    var t0 = Math.floor(Date.now() / 1000);

    var wrap = el('div', 'jotter-q');
    wrap.id = 'jq-' + q.id;
    var margin = el('div', 'jq-margin', 'Q' + hooks.number);
    var body = el('div', 'jq-body');
    wrap.appendChild(margin); wrap.appendChild(body);
    host.appendChild(wrap);

    var marksTotal = q.marks[0] + q.marks[1];
    body.appendChild(el('p', 'jq-prompt',
      esc(q.prompt) + ' <span class="q-marks">[' + marksTotal + (marksTotal === 1 ? ' mark' : ' marks') + ']</span>'));

    /* current (open) attempt working state */
    var cur = { L: [], steps: [], t0: Date.now() };
    var linesEl = el('div', 'wlines');
    body.appendChild(linesEl);

    var dgm = null, established = {};
    if (isAngles && q.diagram) {
      var dwrap = el('div', 'jq-diagram');
      body.insertBefore(dwrap, linesEl);
      dgm = window.GJ_PLAYER.renderDiagram(dwrap, q.diagram, {});
    }

    var ui = el('div', 'jq-ui');
    body.appendChild(ui);
    var checkRow = el('div', 'check-row');
    var checkBtn = el('button', 'btn-stamp', 'Check my working');
    checkBtn.type = 'button';
    var attemptNote = el('span', 'attempt-note', '');
    checkRow.appendChild(checkBtn); checkRow.appendChild(attemptNote);
    body.appendChild(checkRow);
    var feedback = el('div', 'jq-feedback');
    body.appendChild(feedback);

    /* ── render committed prior attempts (struck-through) + state ── */
    function renderLine(line, opts2) {
      opts2 = opts2 || {};
      var row = el('div', 'wline' + (opts2.cls ? ' ' + opts2.cls : ''));
      var markHolder = el('span', 'wl-mark');
      row.appendChild(markHolder);
      row.appendChild(el('span', 'wl-eq', esc(pretty(line.t))));
      var note = marginNote(line.op);
      if (note) row.appendChild(el('span', 'wl-margin-note', esc(note)));
      (opts2.into || linesEl).appendChild(row);
      return { row: row, mark: markHolder };
    }
    function marginNote(op) {
      if (!op) return '';
      if (op === 'exp') return '(expand)';
      if (op === 'col') return '(collect)';
      if (op === 'rw') return '';
      if (op === 'start') return '';
      return '(' + pretty(op) + ')';
    }
    function renderStepLine(st, opts2) {
      opts2 = opts2 || {};
      var bank = (window.GJ_CONTENT.angles.reasonBank || []);
      var rsn = bank.filter(function (r) { return r.id === st.rsn; })[0];
      var calcBit = st.calc ? ' <span class="wl-margin-note">(' + esc(pretty(st.calc)) + ')</span>' : '';
      var row = el('div', 'wline' + (opts2.cls ? ' ' + opts2.cls : ''));
      row.appendChild(el('span', 'wl-mark'));
      row.innerHTML += '<span class="wl-eq">∠' + esc(st.ang) + ' = ' + esc(String(st.val)) + '°</span>' +
        calcBit + '<span class="wl-margin-note">(' + (rsn ? esc(rsn.text) : '?') + ')</span>';
      (opts2.into || linesEl).appendChild(row);
      return { row: row, mark: row.querySelector('.wl-mark') };
    }

    /* ── ALGEBRA composer (chips + keypad) ───────────────────────── */
    var pendingOp = null, composer = null;

    function buildAlgebraUI() {
      ui.innerHTML = '';
      // "both sides" only makes sense for equations; substitute/simplify/expand
      // have a single expression, so ask a neutral "next step" there instead.
      var isEquation = q.type === 'solve' || q.type === 'form';
      var ask = el('p', 'ui-msg', isEquation ? 'What are you doing to both sides?' : 'What’s your next step?');
      ui.appendChild(ask);
      var strip = el('div', 'chip-strip');
      var CHIPS = [
        { id: '+', label: '+ add' }, { id: '-', label: '− subtract' },
        { id: '*', label: '× multiply' }, { id: '/', label: '÷ divide' },
        { id: 'exp', label: 'Expand brackets' }, { id: 'col', label: 'Collect terms' },
        { id: 'rw', label: 'Just rewrite' }
      ];
      var operandHost = el('div', '');
      CHIPS.forEach(function (c) {
        var b = el('button', 'chip');
        b.type = 'button';
        b.textContent = c.label;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          strip.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          operandHost.innerHTML = '';
          if (c.id === '+' || c.id === '-' || c.id === '*' || c.id === '/') {
            pendingOp = { kind: c.id, operand: '' };
            var opc = makeComposer(operandHost, {
              label: 'How much?', placeholder: 'how much? e.g. 15 or 3x', commitLabel: 'next →',
              onCommit: function () { composer.focus(); }   // "next" on the operand jumps to the new-line field
            });
            opc.root.classList.add('compose-mini');
            pendingOp.reader = opc;
            opc.focus();                                     // focus the operand straight away
          } else {
            pendingOp = { kind: c.id };
            composer.focus();                                // no operand needed — go write the line
          }
        });
        strip.appendChild(b);
      });
      ui.appendChild(strip);
      ui.appendChild(operandHost);
      ui.appendChild(el('p', 'ui-msg', 'Write your next line of working:'));
      var compHost = el('div', '');
      ui.appendChild(compHost);
      composer = makeComposer(compHost, {
        placeholder: 'your next line, then “add line”',
        commitLabel: 'add line',
        onCommit: commitAlgebraLine
      });
      undoBtn = el('button', 'btn-pencil', '↶ remove last line');
      undoBtn.type = 'button';
      undoBtn.style.marginTop = '8px';
      undoBtn.hidden = true;   // shown by redrawCurrent once a line exists
      undoBtn.addEventListener('click', function () {
        if (cur.L.pop()) flashMsg('Removed your last line.', true);
        redrawCurrent();
        save();
      });
      ui.appendChild(undoBtn);
    }

    function commitAlgebraLine(text) {
      if (!text) return;
      if (text.length > 60) { flashMsg('That line is too long for the page — split it into two steps.'); return; }
      var parsed = window.GJ_MATH.parse(text);
      if (!parsed.ok) { flashMsg('I can’t read that line — check it and try again. (' + (parsed.err || 'unreadable') + ')'); return; }
      if (cur.L.length >= 12) { flashMsg('That’s a full page — press Check.'); return; }
      var op = 'rw';
      if (pendingOp) {
        if (pendingOp.kind === 'exp') op = 'exp';
        else if (pendingOp.kind === 'col') op = 'col';
        else if (pendingOp.kind === 'rw') op = 'rw';
        else {
          var operand = pendingOp.reader ? pendingOp.reader.value() : '';
          op = ({'+':'+','-':'−','*':'×','/':'÷'})[pendingOp.kind] + (operand || '?');
        }
      }
      cur.L.push({ op: op, t: text, s: Math.round((Date.now() - cur.t0) / 1000) });
      pendingOp = null;
      composer.clear();
      ui.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      redrawCurrent();
      confirmStepAdded();
      save();
    }

    /* ── ANGLES composer (tap angle → value → reason) ────────────── */
    var stepTarget = null, stepComposer = null, chosenReason = null;
    var undoBtn = null;   // "remove last step/line" — hidden until there's something to remove

    function unknownAngles() {
      var out = [];
      Object.keys(q.diagram.angles).forEach(function (nm) {
        var d = q.diagram.angles[nm];
        if (!d.given && !established[nm]) out.push(nm);
      });
      return out;
    }

    function buildAnglesUI() {
      ui.innerHTML = '';
      ui.appendChild(el('p', 'ui-msg', 'Tap an angle on the diagram, give its size, and choose the reason. Find your way to ' + (q.diagram.angles[q.target] && q.diagram.angles[q.target].label ? q.diagram.angles[q.target].label : '∠' + q.target) + '.'));
      var stepHost = el('div', 'step-card');
      stepHost.hidden = true;
      ui.appendChild(stepHost);

      // arcs are tappable
      Object.keys(q.diagram.angles).forEach(function (nm) {
        var g = dgm.arcEl(nm);
        if (!g) return;
        g.addEventListener('click', function () {
          var d = q.diagram.angles[nm];
          if (d.given || established[nm]) return;
          openStep(nm, stepHost);
        });
      });
      undoBtn = el('button', 'btn-pencil', '↶ remove last step');
      undoBtn.type = 'button';
      undoBtn.hidden = true;   // shown by redrawCurrent once a step exists
      undoBtn.addEventListener('click', function () {
        var last = cur.steps.pop();
        if (last) {
          delete established[last.ang];
          dgm.setText(last.ang, q.diagram.angles[last.ang].label || '');
          var lbl = dgm.svg.querySelector('[data-anglabel="' + last.ang + '"]');
          if (lbl) { lbl.style.fill = '#14213A'; lbl.style.fontStyle = q.diagram.angles[last.ang].label ? 'italic' : ''; }
          flashMsg('Removed your last step.', true);
        }
        redrawCurrent();
        save();
      });
      ui.appendChild(undoBtn);
    }

    function openStep(nm, stepHost) {
      stepTarget = nm;
      chosenReason = null;
      stepHost.hidden = false;
      stepHost.innerHTML = '';
      dgm.pulse(nm, true);

      // STEP 1 — the size, entered inline:  ∠PVR = [ __ ] °
      stepHost.appendChild(el('p', 'sc-head', 'Work out ∠' + esc(nm)));
      var row = el('div', 'sc-row');
      row.appendChild(el('span', 'sc-eq', '∠' + esc(nm) + ' ='));
      var fieldHost = el('span', 'sc-field');
      row.appendChild(fieldHost);
      row.appendChild(el('span', 'sc-eq', '°'));
      stepHost.appendChild(row);
      stepHost.appendChild(el('p', 'sc-hint', 'Type the size — a number, or a sum like 180−124.'));
      stepComposer = makeComposer(stepHost, {
        fieldHost: fieldHost,
        pad: 'number',
        label: 'Size of angle ' + nm,
        placeholder: 'the size, e.g. 65',
        onCommit: function () { tryAddStep(); }   // Enter adds the step; the "Add to my working" button is the on-screen commit
      });

      // STEP 2 — the reason (grouped, randomised within groups, FULL bank always)
      stepHost.appendChild(el('p', 'sc-sub', 'Then choose the reason — it earns its own mark:'));
      var reasons = el('div', 'reasons');
      var bank = window.GJ_CONTENT.angles.reasonBank;
      var groups = [];
      bank.forEach(function (r) { if (groups.indexOf(r.group) === -1) groups.push(r.group); });
      groups.forEach(function (gname) {
        reasons.appendChild(el('p', 'reason-group-h', esc(gname)));
        var cards = el('div', 'reason-cards');
        shuffle(bank.filter(function (r) { return r.group === gname; }), q.id + nm).forEach(function (r) {
          var b = el('button', 'reason-card');
          b.type = 'button';
          b.textContent = r.text;
          b.setAttribute('aria-pressed', 'false');
          b.addEventListener('click', function () {
            reasons.querySelectorAll('.reason-card').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', 'true');
            chosenReason = r.id;
            scMsg.textContent = '';   // clear any "now choose a reason" prompt
          });
          cards.appendChild(b);
        });
        reasons.appendChild(cards);
      });
      stepHost.appendChild(reasons);

      // inline guidance, right where the pupil is looking (not the far-off page message)
      var scMsg = el('p', 'sc-msg');
      stepHost.appendChild(scMsg);

      function tryAddStep() {
        var raw = stepComposer.value();
        if (!raw) { scMsg.textContent = 'First type the size of the angle above.'; stepComposer.focus(); return; }
        var calcStr = raw.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
        var evald = window.GJ_MATH.evalCalc(calcStr);
        if (!evald.ok) { scMsg.textContent = 'I can’t read that — type a number, or a calculation like 180−65.'; stepComposer.focus(); return; }
        var val = evald.val.d === 1 ? evald.val.n : evald.val.n / evald.val.d;
        if (val < 0 || val > 360) { scMsg.textContent = 'An angle here is between 0° and 360° — check the size.'; stepComposer.focus(); return; }
        if (!chosenReason) { scMsg.textContent = 'Now choose the reason below ↓ — it earns its own mark.'; return; }
        var step = { ang: nm, val: val, rsn: chosenReason, s: Math.round((Date.now() - cur.t0) / 1000) };
        if (/[-+*/()]/.test(calcStr)) step.calc = raw;
        cur.steps.push(step);
        established[nm] = true;
        dgm.pulse(nm, false);
        dgm.setText(nm, val + '°');
        var lbl = dgm.svg.querySelector('[data-anglabel="' + nm + '"]');
        if (lbl) { lbl.style.fill = '#5B6470'; lbl.style.fontStyle = 'italic'; }
        stepHost.hidden = true;
        redrawCurrent();
        confirmStepAdded();
        save();
      }

      var doRow = el('div', 'check-row');
      var add = el('button', 'btn-stamp', 'Add to my working');
      add.type = 'button';
      add.addEventListener('click', tryAddStep);
      doRow.appendChild(add);
      var cancel = el('button', 'btn-pencil', 'Cancel');
      cancel.type = 'button';
      cancel.addEventListener('click', function () { dgm.pulse(nm, false); stepHost.hidden = true; });
      doRow.appendChild(cancel);
      stepHost.appendChild(doRow);
      stepComposer.focus();   // auto-focus the size field — no second tap needed
    }

    /* ── shared render / save / check ─────────────────────────────── */
    var msgEl = el('p', 'ui-msg');
    body.insertBefore(msgEl, checkRow);
    var msgTimer = null;
    function flashMsg(t, ok) {
      msgEl.textContent = t;
      msgEl.className = 'ui-msg' + (ok ? ' flash-ok' : '');
      clearTimeout(msgTimer);
      msgTimer = setTimeout(function () { msgEl.textContent = ''; msgEl.className = 'ui-msg'; }, ok ? 2600 : 5000);
    }
    // confirm a freshly written step: a quick positive flash + a brief highlight
    // on the new line, so the pupil sees it landed in the jotter.
    function confirmStepAdded() {
      flashMsg('✓ Added to your jotter.', true);
      var last = linesEl.lastElementChild;
      if (last) { last.classList.add('just-added'); setTimeout(function () { last.classList.remove('just-added'); }, 1300); }
    }

    function redrawCurrent() {
      linesEl.innerHTML = '';
      // prior attempts, struck through
      rec.att.forEach(function (att) {
        (att.L || []).forEach(function (l) { renderLine(l, { cls: 'struck' }); });
        (att.steps || []).forEach(function (s) { renderStepLine(s, { cls: 'struck' }); });
      });
      if (!isAngles && q.start && !rec.lock) renderLine({ op: 'start', t: q.start }, { cls: 'pencil' });
      cur.L.forEach(function (l) { renderLine(l, {}); });
      cur.steps.forEach(function (s) { renderStepLine(s, {}); });
      var ready = isAngles ? !!established[q.target] : cur.L.length > 0;
      checkBtn.disabled = !ready || rec.lock;
      if (undoBtn) undoBtn.hidden = rec.lock || (isAngles ? cur.steps.length === 0 : cur.L.length === 0);
      attemptNote.textContent = rec.att.length === 1 ? 'Second attempt — your first try stays on the page.' : '';
    }

    function save() {
      var attRec = { L: cur.L, dur: Math.round((Date.now() - cur.t0) / 1000) };
      if (isAngles) { attRec = { steps: cur.steps, dur: attRec.dur }; }
      var attts = rec.att.slice();
      // the open attempt is represented live so the teacher's Wall shows "working now"
      var live = { att: attts.concat(cur.L.length || cur.steps.length ? [attRec] : []), lock: rec.lock, ovr: rec.ovr || null };
      if (rec.fin) live.fin = rec.fin;
      hooks.onSave(q.id, rec.lock ? rec : live);
    }

    function runCheck() {
      if (checkBtn.disabled) return;
      checkBtn.disabled = true;
      var attempt = isAngles
        ? { steps: cur.steps, dur: Math.round((Date.now() - cur.t0) / 1000) }
        : { L: cur.L, fin: cur.L.length ? cur.L[cur.L.length - 1].t : '', dur: Math.round((Date.now() - cur.t0) / 1000) };
      var verdict;
      try {
        verdict = isAngles ? window.GJ_ANGLES.checkSteps(q, cur.steps) : window.GJ_MATH.checkQuestion(q, attempt);
      } catch (e) {
        flashMsg('Something went wrong marking this — your working is saved for your teacher.');
        checkBtn.disabled = false;
        return;
      }
      attempt.res = verdict.res;
      rec.att.push(attempt);

      // keep the pupil's eye on their working as the marks ink down the margin —
      // and out of the way of the keypad that's about to collapse below (no jump).
      linesEl.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' });

      var rows = linesEl.querySelectorAll('.wline:not(.struck):not(.pencil)');
      var per = verdict.perLine || verdict.perStep || [];
      var seq = Promise.resolve();
      per.forEach(function (v, i) {
        var row = rows[i];
        if (!row) return;
        seq = seq.then(function () {
          var kind = v.ok === 1 ? 'tick' : v.ok === 2 ? 'tick-hollow' : 'cross';
          if (verdict.res === 'AMBER' && v.ok === 1) kind = 'tick-amber';
          if (v.ok === 0) { row.classList.add('err-box'); row.querySelector('.wl-eq').classList.add('wavy'); }
          if (v.ok === 2) row.classList.add('ft-grey');
          return drawMark(row.querySelector('.wl-mark'), kind).then(function () {
            return new Promise(function (r) { setTimeout(r, REDUCED ? 0 : 90); });
          });
        });
      });

      seq.then(function () {
        feedback.innerHTML = '';
        var mk = verdict.mk, mkMax = verdict.mkMax || q.marks;
        var done = verdict.res === 'OK';
        var amber = verdict.res === 'AMBER';
        var secondGone = rec.att.length >= 2;
        var mkState = done ? ' mk-correct' : amber ? ' mk-amber' : ' mk-wrong';   // colour the score by outcome, not always red
        var tally = el('div', 'mk-tally' + mkState, 'Working ' + mk[0] + '/' + mkMax[0] + ' · Answer ' + mk[1] + '/' + mkMax[1]);
        feedback.appendChild(tally);

        if (amber) feedback.appendChild(el('p', 'amber-note', 'Right answer — but with no working shown, you can’t earn the working marks.'));

        var bucket = done ? 'perfect' : amber ? 'amber' : secondGone ? 'fail' : 'partial';
        if (done && mk[0] === mkMax[0]) bucket = 'perfect';
        feedback.appendChild(el('p', 'mk-comment' + mkState, commentFor(q.id, bucket)));

        if (done && !isAngles) {
          var lastRow = rows[rows.length - 1];
          if (lastRow) {
            var eqSpan = lastRow.querySelector('.wl-eq');
            var hold = el('span', 'answer-boxed');
            eqSpan.parentNode.insertBefore(hold, eqSpan);
            hold.appendChild(eqSpan);
            var w = hold.offsetWidth + 20, h = hold.offsetHeight + 6;
            var s = sv('svg', { class: 'box-draw', viewBox: '0 0 ' + w + ' ' + h });
            var p = sv('path', { d: 'M2 2 H ' + (w - 2) + ' V ' + (h - 2) + ' H 2 Z' });
            s.appendChild(p);
            hold.appendChild(s);
            if (!REDUCED) {
              var len = p.getTotalLength();
              p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
              p.getBoundingClientRect();
              p.style.transition = 'stroke-dashoffset 500ms linear';
              p.style.strokeDashoffset = 0;
            }
          }
        }

        if (done || amber || secondGone) {
          rec.lock = true;
          rec.fin = attempt.fin || null;
          rec.mk = mk;
          ui.innerHTML = '';
          checkRow.hidden = true;
          margin.innerHTML = 'Q' + hooks.number + '<div class="mk-tally' + mkState + '" style="font-size:18px">' + (mk[0] + mk[1]) + '/' + (mkMax[0] + mkMax[1]) + '</div>';
        } else {
          // one more attempt: keep attempt 1 on the page, struck through
          feedback.appendChild(el('p', 'ui-msg', 'The line in the red box is where it went wrong — nothing is given away. One more attempt.'));
          cur = { L: [], steps: [], t0: Date.now() };
          established = {};
          if (isAngles) {
            Object.keys(q.diagram.angles).forEach(function (nm) {
              var d = q.diagram.angles[nm];
              if (!d.given) { dgm.setText(nm, d.label || ''); var lb = dgm.svg.querySelector('[data-anglabel="' + nm + '"]'); if (lb) { lb.style.fill = '#14213A'; lb.style.fontStyle = d.label ? 'italic' : ''; } }
            });
          }
          setTimeout(function () { redrawCurrent(); checkBtn.disabled = true; }, REDUCED ? 0 : 600);
        }
        feedback.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });   // land on the marks + tally, never below the fold
        save();
      });
    }

    checkBtn.addEventListener('click', runCheck);

    /* ── restore saved state ──────────────────────────────────────── */
    if (rec.lock) {
      // render final attempt with its marks, locked
      var finalAtt = rec.att[rec.att.length - 1];
      rec.att.slice(0, -1).forEach(function (att) {
        (att.L || []).forEach(function (l) { renderLine(l, { cls: 'struck' }); });
        (att.steps || []).forEach(function (s) { renderStepLine(s, { cls: 'struck' }); });
      });
      var verdict = null;
      try {
        verdict = isAngles ? window.GJ_ANGLES.checkSteps(q, finalAtt.steps || []) : window.GJ_MATH.checkQuestion(q, finalAtt);
      } catch (e) {}
      var per = (verdict && (verdict.perLine || verdict.perStep)) || [];
      (finalAtt.L || []).forEach(function (l, i) {
        var r = renderLine(l, {});
        var v = per[i];
        if (v) drawMark(r.mark, v.ok === 1 ? (verdict.res === 'AMBER' ? 'tick-amber' : 'tick') : v.ok === 2 ? 'tick-hollow' : 'cross');
        if (v && v.ok === 0) { r.row.classList.add('err-box'); }
      });
      (finalAtt.steps || []).forEach(function (s, i) {
        var r = renderStepLine(s, {});
        var v = per[i];
        if (v) drawMark(r.mark, (v.val === 1 && v.rsn === 1) ? 'tick' : (v.val === 2 ? 'tick-hollow' : (v.val === 1 || v.rsn === 1) ? 'tick-amber' : 'cross'));
        if (s.ang && q.diagram.angles[s.ang]) { dgm.setText(s.ang, s.val + '°'); }
      });
      if (verdict) {
        var mkMax2 = verdict.mkMax || q.marks;
        var mkState2 = verdict.res === 'OK' ? ' mk-correct' : verdict.res === 'AMBER' ? ' mk-amber' : ' mk-wrong';
        margin.innerHTML = 'Q' + hooks.number + '<div class="mk-tally' + mkState2 + '" style="font-size:18px">' + (verdict.mk[0] + verdict.mk[1]) + '/' + (mkMax2[0] + mkMax2[1]) + '</div>';
        feedback.appendChild(el('div', 'mk-tally' + mkState2, 'Working ' + verdict.mk[0] + '/' + mkMax2[0] + ' · Answer ' + verdict.mk[1] + '/' + mkMax2[1]));
      }
      checkRow.hidden = true;
    } else {
      // resume an open attempt if one was mid-flight
      if (rec.att.length && !rec.att[rec.att.length - 1].res) {
        var open = rec.att.pop();
        cur.L = open.L || [];
        cur.steps = open.steps || [];
        cur.steps.forEach(function (s) {
          established[s.ang] = true;
          if (dgm) { dgm.setText(s.ang, s.val + '°'); }
        });
      }
      if (isAngles) buildAnglesUI(); else buildAlgebraUI();
      redrawCurrent();
    }

    return { qid: q.id };
  }

  window.GJ_JOTTER = { mount: mount };
})();
