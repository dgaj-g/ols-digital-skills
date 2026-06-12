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

  var COMMENTS = {
    perfect: ['Good — equals signs lined up.', 'A fair copy. Lovely clear working.', 'Every line earns its mark.'],
    partial: ['Look again at the boxed line.', 'So close — one line lets it down.', 'The method is there — mind that step.'],
    amber: ['Right answer — now show me the working.', 'Correct, but a marker needs to see the method.'],
    fail: ['We’ll look at this one together in class.', 'Watch the worked example again, then retry the idea in class.']
  };
  function commentFor(qid, bucket) {
    var bank = COMMENTS[bucket] || [];
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
    compose.setAttribute('aria-label', opts.label || 'Write the next line of working');
    var content = el('span', 'compose-text');
    var caret = el('span', 'caret');
    var ph = el('span', 'ph', opts.placeholder || 'write the new line here');
    compose.appendChild(content); compose.appendChild(caret); compose.appendChild(ph);
    host.appendChild(compose);

    var KEYS = opts.numericOnly
      ? ['7', '8', '9', '+', '−', '(', ')', '⌫',
         '4', '5', '6', '×', '÷', '0', '.', '/',
         '1', '2', '3', '↶', '', '', '', '✓ Done']
      : ['7', '8', '9', '+', '−', '(', ')', '⌫',
         '4', '5', '6', '×', '÷', 'x', 'x²', '/',
         '1', '2', '3', '0', '.', '=', '↶', '✓ Done'];
    var pad = el('div', 'keypad');
    KEYS.forEach(function (k) {
      if (k === '') { pad.appendChild(el('span', '')); return; }
      var b = el('button', 'key' + (k === '✓ Done' ? ' key-go key-wide' : '') + (k === '⌫' ? ' key-del' : ''));
      b.type = 'button';
      b.textContent = k;
      b.addEventListener('click', function () { press(k); });
      pad.appendChild(b);
    });
    host.appendChild(pad);

    function render() {
      content.textContent = buf;
      ph.style.display = buf ? 'none' : '';
    }
    function press(k) {
      if (k === '⌫') buf = buf.slice(0, -1);
      else if (k === '↶') buf = '';
      else if (k === '✓ Done') { if (opts.onCommit) opts.onCommit(buf.trim()); return; }
      else if (k === 'x²') buf += 'x²';
      else buf += k;
      render();
    }
    compose.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (opts.onCommit) opts.onCommit(buf.trim()); return; }
      if (e.key === 'Backspace') { e.preventDefault(); buf = buf.slice(0, -1); render(); return; }
      if (e.key.length === 1 && /[0-9x+\-*/().=\s]/.test(e.key)) {
        e.preventDefault();
        var k = e.key === '-' ? '−' : e.key === '*' ? '×' : e.key === '/' ? '/' : e.key;
        if (opts.numericOnly && (k === 'x' || k === '=')) return;
        buf += k;
        render();
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
      feedback.appendChild(el('span', 'mk-tally', ' ' + (right ? '1/1' : '0/1')));
      if (rec.lock) {
        feedback.appendChild(el('p', 'mk-comment', right ? commentFor(q.id, 'perfect') : commentFor(q.id, 'fail')));
        if (!right) feedback.appendChild(el('p', 'ui-msg', 'You answered “' + esc(last.pick) + '” — your teacher can see this and will pick it up in class.'));
        checkRow.hidden = true;
        cards.querySelectorAll('.reason-card').forEach(function (x) { x.disabled = true; });
        margin.innerHTML = 'Q' + hooks.number + '<div class="mk-tally" style="font-size:18px">' + (right ? '1' : '0') + '/1</div>';
      } else if (!instant) {
        feedback.appendChild(el('p', 'ui-msg', 'Not that one — look again at its size against 90° and 180°. One more attempt.'));
        pick = null;
        checkBtn.disabled = true;
        cards.querySelectorAll('.reason-card').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      }
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

  /* ═════════ mount ═════════════════════════════════════════════════ */
  function mount(host, q, savedRec, hooks) {
    if (q.kind === 'classify') return mountClassify(host, q, savedRec, hooks);
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
      var ask = el('p', 'ui-msg', 'What are you doing to both sides?');
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
              label: 'How much?', placeholder: 'how much? e.g. 15 or 3x',
              onCommit: function () {}
            });
            opc.root.classList.add('compose-mini');
            pendingOp.reader = opc;
          } else {
            pendingOp = { kind: c.id };
          }
        });
        strip.appendChild(b);
      });
      ui.appendChild(strip);
      ui.appendChild(operandHost);
      ui.appendChild(el('p', 'ui-msg', 'Then write the new line:'));
      var compHost = el('div', '');
      ui.appendChild(compHost);
      composer = makeComposer(compHost, {
        placeholder: 'write the new line of working',
        onCommit: commitAlgebraLine
      });
      var undo = el('button', 'btn-pencil', '↶ remove last line');
      undo.type = 'button';
      undo.style.marginTop = '8px';
      undo.addEventListener('click', function () {
        cur.L.pop();
        redrawCurrent();
        save();
      });
      ui.appendChild(undo);
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
      save();
    }

    /* ── ANGLES composer (tap angle → value → reason) ────────────── */
    var stepTarget = null, stepComposer = null, chosenReason = null;

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
      var undo = el('button', 'btn-pencil', '↶ remove last step');
      undo.type = 'button';
      undo.addEventListener('click', function () {
        var last = cur.steps.pop();
        if (last) { delete established[last.ang]; dgm.setText(last.ang, q.diagram.angles[last.ang].label || ''); }
        redrawCurrent();
        save();
      });
      ui.appendChild(undo);
    }

    function openStep(nm, stepHost) {
      stepTarget = nm;
      chosenReason = null;
      stepHost.hidden = false;
      stepHost.innerHTML = '';
      dgm.pulse(nm, true);
      var row = el('div', 'sc-row');
      row.innerHTML = '<span class="sc-eq">∠' + esc(nm) + ' =</span>';
      var compHost = el('span', '');
      row.appendChild(compHost);
      row.innerHTML += '<span class="sc-eq">°</span>';
      stepHost.appendChild(row);
      stepComposer = makeComposer(stepHost, {
        numericOnly: true,
        label: 'Size of angle ' + nm,
        placeholder: 'the size — or type the calculation, e.g. 180−38',
        onCommit: function () { /* committed via the step button below */ }
      });

      // reason picker — grouped, randomised within groups, FULL bank always
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
            cards.parentNode.querySelectorAll('.reason-card').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', 'true');
            chosenReason = r.id;
          });
          cards.appendChild(b);
        });
        reasons.appendChild(cards);
      });
      stepHost.appendChild(reasons);

      var doRow = el('div', 'check-row');
      var add = el('button', 'btn-stamp', 'Write the step in my jotter');
      add.type = 'button';
      add.addEventListener('click', function () {
        var raw = stepComposer.value();
        if (!raw) { flashMsg('Give the size of the angle first.'); return; }
        var calcStr = raw.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
        var evald = window.GJ_MATH.evalCalc(calcStr);
        if (!evald.ok) { flashMsg('I can’t read that number or calculation — check it.'); return; }
        if (!chosenReason) { flashMsg('Choose the reason — the mark scheme wants it.'); return; }
        var val = evald.val.d === 1 ? evald.val.n : evald.val.n / evald.val.d;
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
        save();
      });
      doRow.appendChild(add);
      var cancel = el('button', 'btn-pencil', 'Cancel');
      cancel.type = 'button';
      cancel.addEventListener('click', function () { dgm.pulse(nm, false); stepHost.hidden = true; });
      doRow.appendChild(cancel);
      stepHost.appendChild(doRow);
      stepHost.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
    }

    /* ── shared render / save / check ─────────────────────────────── */
    var msgEl = el('p', 'ui-msg');
    body.insertBefore(msgEl, checkRow);
    var msgTimer = null;
    function flashMsg(t) {
      msgEl.textContent = t;
      clearTimeout(msgTimer);
      msgTimer = setTimeout(function () { msgEl.textContent = ''; }, 5000);
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
        var tally = el('div', 'mk-tally', 'M ' + mk[0] + '/' + mkMax[0] + ' · A ' + mk[1] + '/' + mkMax[1]);
        feedback.appendChild(tally);
        var done = verdict.res === 'OK';
        var amber = verdict.res === 'AMBER';
        var secondGone = rec.att.length >= 2;

        if (amber) feedback.appendChild(el('p', 'amber-note', 'Right answer — but no working shown, so the method marks stay on the table.'));

        var bucket = done ? 'perfect' : amber ? 'amber' : secondGone ? 'fail' : 'partial';
        if (done && mk[0] === mkMax[0]) bucket = 'perfect';
        feedback.appendChild(el('p', 'mk-comment', commentFor(q.id, bucket)));

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
          margin.innerHTML = 'Q' + hooks.number + '<div class="mk-tally" style="font-size:18px">' + (mk[0] + mk[1]) + '/' + (mkMax[0] + mkMax[1]) + '</div>';
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
        margin.innerHTML = 'Q' + hooks.number + '<div class="mk-tally" style="font-size:18px">' + (verdict.mk[0] + verdict.mk[1]) + '/' + (mkMax2[0] + mkMax2[1]) + '</div>';
        feedback.appendChild(el('div', 'mk-tally', 'M ' + verdict.mk[0] + '/' + mkMax2[0] + ' · A ' + verdict.mk[1] + '/' + mkMax2[1]));
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
