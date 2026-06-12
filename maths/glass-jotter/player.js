/* The Glass Jotter — method-movie engine + shared diagram renderer.
   A movie is data (see INTERFACES.md): steps of {say, do:[ops]}.
   Forward play animates ops (pen-speed stroke draws, writing reveals,
   counting values, stamps, balance tips). Jumping back/around rebuilds
   the stage instantly from the op history — the model is the script. */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var PEN_SPEED = 0.45; // px per ms
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  function drawStroke(path, instant) {
    var len = 0;
    try { len = path.getTotalLength(); } catch (e) { len = 60; }
    if (instant || REDUCED) return Promise.resolve();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.getBoundingClientRect(); // flush
    var dur = Math.min(1200, len / PEN_SPEED);
    path.style.transition = 'stroke-dashoffset ' + dur + 'ms linear';
    path.style.strokeDashoffset = '0';
    return new Promise(function (res) { setTimeout(res, dur + 30); });
  }

  /* ═══ shared diagram renderer ═════════════════════════════════════
     Returns a handle with everything jotter.js and staff.js need. */
  function renderDiagram(host, diagram, opts) {
    opts = opts || {};
    var SC = 10; // abstract unit → px
    var W = diagram.w * SC, H = diagram.h * SC;
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    svg.style.maxWidth = Math.min(640, W) + 'px';
    host.appendChild(svg);
    var gSegs = sv('g', {}), gArcs = sv('g', {}), gText = sv('g', {});
    svg.appendChild(gSegs); svg.appendChild(gArcs); svg.appendChild(gText);

    function P(name) { var p = diagram.pts[name]; return { x: p[0] * SC, y: p[1] * SC }; }
    function angDef(name) { return diagram.angles[name]; }
    function rayAngle(at, toward) {
      var a = P(at), b = P(toward);
      return Math.atan2(b.y - a.y, b.x - a.x);
    }

    var segEls = {}, arcEls = {}, valEls = {}, sqEls = {};

    function makeSeg(s, visible) {
      var a = P(s.from), b = P(s.to);
      var g = sv('g', {});
      var line = sv('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#14213A', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
      if (s.dash) line.setAttribute('stroke-dasharray', '7 6');
      g.appendChild(line);
      if (s.par) { // parallel arrowheads at the midpoint
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var th = Math.atan2(b.y - a.y, b.x - a.x);
        for (var i = 0; i < s.par; i++) {
          var off = (i - (s.par - 1) / 2) * 10;
          var cx = mx + Math.cos(th) * off, cy = my + Math.sin(th) * off;
          var w = 9;
          var p1 = (cx - Math.cos(th - 0.5) * w) + ',' + (cy - Math.sin(th - 0.5) * w);
          var p2 = cx + ',' + cy;
          var p3 = (cx - Math.cos(th + 0.5) * w) + ',' + (cy - Math.sin(th + 0.5) * w);
          g.appendChild(sv('polyline', { points: p1 + ' ' + p2 + ' ' + p3, fill: 'none', stroke: '#14213A', 'stroke-width': 2 }));
        }
      }
      // endpoint letters
      [s.from, s.to].forEach(function (nm) {
        if (diagram.labelled === false) return;
        if (nm.charAt(0) === '_') return; // underscore points are cosmetic, unlabelled
        if (gText.querySelector('[data-pt="' + nm + '"]')) return;
        var pt = P(nm);
        var others = Object.keys(diagram.pts).map(function (k) { return P(k); });
        var cx = others.reduce(function (s2, o) { return s2 + o.x; }, 0) / others.length;
        var cy = others.reduce(function (s2, o) { return s2 + o.y; }, 0) / others.length;
        var dx = pt.x - cx, dy = pt.y - cy, dl = Math.hypot(dx, dy) || 1;
        var t = sv('text', {
          x: pt.x + (dx / dl) * 16, y: pt.y + (dy / dl) * 16 + 5,
          'text-anchor': 'middle', 'data-pt': nm
        });
        t.textContent = nm.replace(/\d+$/, '');
        t.style.cssText = 'font-family:var(--f-maths);font-size:17px;font-style:italic;fill:#14213A';
        gText.appendChild(t);
      });
      g.style.opacity = visible ? 1 : 0;
      gSegs.appendChild(g);
      segEls[s.id || (s.from + s.to)] = g;
      return g;
    }

    function arcPath(name, rOff) {
      var d = angDef(name);
      var v = P(d.at);
      var a1 = rayAngle(d.at, d.from), a2 = rayAngle(d.at, d.to);
      var sweep = a2 - a1;
      while (sweep < 0) sweep += Math.PI * 2;
      if (!d.reflex && sweep > Math.PI) { var tmp = a1; a1 = a2; a2 = tmp; sweep = Math.PI * 2 - sweep; }
      if (d.reflex && sweep < Math.PI) { var t2 = a1; a1 = a2; a2 = t2; sweep = Math.PI * 2 - sweep; }
      var r = 22 + (rOff || 0) * 9;
      var x1 = v.x + Math.cos(a1) * r, y1 = v.y + Math.sin(a1) * r;
      var x2 = v.x + Math.cos(a2) * r, y2 = v.y + Math.sin(a2) * r;
      var large = sweep > Math.PI ? 1 : 0;
      return {
        d: 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1),
        mid: { x: v.x + Math.cos(a1 + sweep / 2) * (r + 15), y: v.y + Math.sin(a1 + sweep / 2) * (r + 15) },
        vertex: v, a1: a1, sweep: sweep, r: r
      };
    }

    var arcCount = {};
    function makeArc(name, visible, colour) {
      var d = angDef(name);
      var v = P(d.at);
      arcCount[d.at] = (arcCount[d.at] || 0);
      var info = arcPath(name, arcCount[d.at]++);
      var g = sv('g', { 'data-ang': name });
      if (d.value === 90 && d.given && !d.reflex) { // right-angle square: GIVEN angles only — drawing it on an unknown would leak the answer
        var a1 = rayAngle(d.at, d.from), s = 13;
        var x1 = v.x + Math.cos(a1) * s, y1 = v.y + Math.sin(a1) * s;
        var a2 = rayAngle(d.at, d.to);
        var x2 = v.x + Math.cos(a2) * s, y2 = v.y + Math.sin(a2) * s;
        var x3 = x1 + Math.cos(a2) * s, y3 = y1 + Math.sin(a2) * s;
        var p = sv('path', { d: 'M ' + x1 + ' ' + y1 + ' L ' + x3 + ' ' + y3 + ' L ' + x2 + ' ' + y2, fill: 'none', stroke: colour || '#1A3A6B', 'stroke-width': 2 });
        g.appendChild(p);
        sqEls[name] = p;
      } else {
        var p2 = sv('path', { d: info.d, fill: 'none', stroke: colour || '#1A3A6B', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
        g.appendChild(p2);
      }
      // value or letter label
      var lbl = sv('text', { x: info.mid.x, y: info.mid.y + 5, 'text-anchor': 'middle', 'data-anglabel': name });
      lbl.style.cssText = 'font-family:var(--f-maths);font-size:16px;fill:#14213A';
      if (d.given) lbl.textContent = d.value + '°';
      else if (d.label) { lbl.textContent = d.label; lbl.style.fontStyle = 'italic'; }
      else lbl.textContent = '';
      g.appendChild(lbl);
      g.classList.add('ang-arc');
      g.style.opacity = visible ? 1 : 0;
      gArcs.appendChild(g);
      arcEls[name] = g; valEls[name] = lbl;
      return g;
    }

    (diagram.segs || []).forEach(function (s) { makeSeg(s, !opts.deferred); });
    Object.keys(diagram.angles || {}).forEach(function (nm) { makeArc(nm, !opts.deferred); });

    var handle = {
      svg: svg,
      segEl: function (id) { return segEls[id]; },
      arcEl: function (nm) { return arcEls[nm]; },
      reveal: function (kind, key, instant) {
        var g = kind === 'seg' ? segEls[key] : arcEls[key];
        if (!g) return Promise.resolve();
        g.style.opacity = 1;
        var strokes = g.querySelectorAll('path, line, polyline');
        var pr = Promise.resolve();
        strokes.forEach(function (s2) { pr = pr.then(function () { return drawStroke(s2, instant); }); });
        return pr;
      },
      showValue: function (nm, value, opts2) {
        opts2 = opts2 || {};
        var lbl = valEls[nm];
        if (!lbl) return Promise.resolve();
        var d = angDef(nm);
        var target = (value != null) ? value : d.value;
        lbl.style.fill = opts2.colour || '#1A3A6B';
        if (opts2.italic) lbl.style.fontStyle = 'italic';
        if (REDUCED || opts2.instant) { lbl.textContent = target + '°'; return Promise.resolve(); }
        var t0 = null, dur = opts2.dur || 600;
        return new Promise(function (res) {
          function tick(ts) {
            if (!t0) t0 = ts;
            var f = Math.min(1, (ts - t0) / dur);
            lbl.textContent = Math.round(target * f) + '°';
            if (f < 1) requestAnimationFrame(tick); else res();
          }
          requestAnimationFrame(tick);
        });
      },
      setText: function (nm, text) { if (valEls[nm]) valEls[nm].textContent = text; },
      pulse: function (nm, on) { if (arcEls[nm]) arcEls[nm].classList.toggle('pulse', on !== false); },
      overlay: function (ptNames, colour, instant) { // Z / F / U shape tracing
        var pts = ptNames.map(function (n) { var p = P(n); return p.x + ',' + p.y; }).join(' ');
        var pl = sv('polyline', { points: pts, fill: 'none', stroke: colour || '#E4B824', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.55 });
        svg.appendChild(pl);
        return drawStroke(pl, instant).then(function () { return pl; });
      },
      clearOverlays: function () {
        svg.querySelectorAll('polyline[opacity="0.55"]').forEach(function (n) { n.remove(); });
      }
    };
    return handle;
  }

  /* ═══ the movie player ════════════════════════════════════════════ */
  function mount(host, movie, opts) {
    opts = opts || {};
    host.innerHTML = '';
    var root = el('div', 'movie');
    root.innerHTML =
      '<div class="movie-head"><span class="movie-head-badge">Worked example</span>' +
      '<span class="movie-head-title"></span></div>' +
      '<div class="movie-stage"></div>' +
      '<div class="movie-caption"><span class="cap-num">1</span><span class="cap-text"></span></div>' +
      '<div class="movie-controls">' +
      '<button class="btn-pencil mc-back" aria-label="Previous step">◀</button>' +
      '<button class="btn-stamp mc-play" aria-label="Play">▶ Play</button>' +
      '<button class="btn-pencil mc-fwd" aria-label="Next step">▶</button>' +
      '<div class="movie-dots"></div></div>';
    host.appendChild(root);
    root.querySelector('.movie-head-title').textContent = movie.title || '';

    var stage = root.querySelector('.movie-stage');
    var capText = root.querySelector('.cap-text');
    var capNum = root.querySelector('.cap-num');
    var dots = root.querySelector('.movie-dots');
    movie.steps.forEach(function (_, i) {
      var d = el('span', 'movie-dot');
      d.addEventListener('click', function () { stopAuto(); goto(i, true); });
      dots.appendChild(d);
    });

    var stepIdx = -1, playing = false, autoTimer = null, busy = false;
    var dgm = null, paperLines = [], balanceEl = null;

    function resetStage() {
      stage.innerHTML = '';
      paperLines = []; balanceEl = null; dgm = null;
      if (movie.mode === 'diagram' && movie.diagram) {
        var dwrap = el('div', 'jq-diagram');
        stage.appendChild(dwrap);
        dgm = renderDiagram(dwrap, movie.diagram, { deferred: !!movie.deferred });
      }
    }

    function paperWrite(op, instant) {
      var line = el('div', 'movie-line');
      var eq = el('span', 'ml-eq', op.write.text);
      line.appendChild(eq);
      if (op.write.margin) line.appendChild(el('span', 'ml-margin', op.write.margin));
      stage.appendChild(line);
      paperLines.push(line);
      if (instant || REDUCED) return Promise.resolve();
      eq.style.clipPath = 'inset(0 100% 0 0)';
      eq.getBoundingClientRect();
      var dur = Math.min(560, 220 + op.write.text.length * 14);
      eq.style.transition = 'clip-path ' + dur + 'ms linear';
      eq.style.clipPath = 'inset(0 0 0 0)';
      return new Promise(function (r) { setTimeout(r, dur + 40); });
    }

    function paperTick(op, instant) {
      var line = paperLines[op.tick.line];
      if (!line) return Promise.resolve();
      var s = sv('svg', { viewBox: '0 0 30 24', class: 'mark-tick' });
      s.style.cssText = 'width:26px;height:21px;margin-left:10px;vertical-align:-3px;overflow:visible';
      var p = sv('path', { d: 'M4 13 L11 20 L26 4' });
      s.appendChild(p);
      line.appendChild(s);
      return drawStroke(p, instant);
    }

    function paperBox(op, instant) {
      var line = paperLines[op.box.line];
      if (!line) return Promise.resolve();
      var eq = line.querySelector('.ml-eq');
      var w = eq.offsetWidth + 22, h = eq.offsetHeight + 8;
      var hold = el('span', 'answer-boxed');
      eq.parentNode.insertBefore(hold, eq);
      hold.appendChild(eq);
      var s = sv('svg', { class: 'box-draw', viewBox: '0 0 ' + w + ' ' + h });
      var p = sv('path', { d: 'M2 2 H ' + (w - 2) + ' V ' + (h - 2) + ' H 2 Z' });
      s.appendChild(p);
      hold.appendChild(s);
      return drawStroke(p, instant);
    }

    function paperGrid(op, instant) {
      var g = op.grid;
      var t = el('table', 'movie-grid');
      var r1 = '<tr><th>×</th>' + g.b.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr>';
      var r2 = '<tr><th>' + g.a + '</th>' + g.vals.map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr>';
      t.innerHTML = r1 + r2;
      stage.appendChild(t);
      if (instant || REDUCED) { t.querySelectorAll('td').forEach(function (td) { td.style.opacity = 1; }); return Promise.resolve(); }
      var cells = t.querySelectorAll('td');
      cells.forEach(function (td) { td.style.opacity = 0; td.style.transition = 'opacity 300ms'; });
      var pr = Promise.resolve();
      cells.forEach(function (td) {
        pr = pr.then(function () { td.style.opacity = 1; return new Promise(function (r) { setTimeout(r, 340); }); });
      });
      return pr;
    }

    function paperBalance(op, instant) {
      if (!balanceEl) {
        balanceEl = el('div', 'movie-balance');
        balanceEl.innerHTML = '<svg viewBox="0 0 300 96">' +
          '<line x1="150" y1="26" x2="150" y2="82" stroke="#5B6470" stroke-width="3"/>' +
          '<path d="M120 82 h60" stroke="#5B6470" stroke-width="3"/>' +
          '<g class="beam" style="transform-origin:150px 26px;transition:transform 700ms var(--ease-needle)">' +
          '<line x1="40" y1="26" x2="260" y2="26" stroke="#7A3B5E" stroke-width="3"/>' +
          '<path d="M40 26 l-13 22 h26 Z" fill="none" stroke="#7A3B5E" stroke-width="2"/>' +
          '<path d="M260 26 l-13 22 h26 Z" fill="none" stroke="#7A3B5E" stroke-width="2"/>' +
          '<text class="bl" x="40" y="64" text-anchor="middle" style="font-family:var(--f-maths);font-size:15px"></text>' +
          '<text class="br" x="260" y="64" text-anchor="middle" style="font-family:var(--f-maths);font-size:15px"></text>' +
          '</g><circle cx="150" cy="26" r="3.4" fill="#7A3B5E"/></svg>';
        stage.insertBefore(balanceEl, stage.firstChild);
      }
      var b = op.balance;
      if (b.l != null) balanceEl.querySelector('.bl').textContent = b.l;
      if (b.r != null) balanceEl.querySelector('.br').textContent = b.r;
      var beam = balanceEl.querySelector('.beam');
      var tips = Array.isArray(b.tip) ? b.tip : [b.tip || 0];
      if (instant || REDUCED) { beam.style.transform = 'rotate(' + tips[tips.length - 1] + 'deg)'; return Promise.resolve(); }
      var pr = Promise.resolve();
      tips.forEach(function (t) {
        pr = pr.then(function () {
          beam.style.transform = 'rotate(' + t + 'deg)';
          return new Promise(function (r) { setTimeout(r, 720); });
        });
      });
      return pr;
    }

    function doStamp(op, instant) {
      var text = op.stamp.text;
      if (!text && op.stamp.reason && window.GJ_CONTENT) {
        var packs = window.GJ_CONTENT;
        Object.keys(packs).some(function (k) {
          var bank = packs[k].reasonBank || [];
          var hit = bank.filter(function (r) { return r.id === op.stamp.reason; })[0];
          if (hit) { text = hit.text; return true; }
          return false;
        });
      }
      var st = el('div', 'theorem-stamp' + (instant || REDUCED ? '' : ' stamp-in'), text || '');
      var holder = el('div', '');
      holder.style.cssText = 'text-align:center;margin:8px 0';
      holder.appendChild(st);
      stage.appendChild(holder);
      return new Promise(function (r) { setTimeout(r, instant ? 0 : 240); });
    }

    function doNote(op, instant) {
      var n = el('div', op.note.red ? 'mk-comment' : 'ui-msg', op.note.text);
      stage.appendChild(n);
      if (instant || REDUCED) return Promise.resolve();
      n.style.opacity = 0; n.getBoundingClientRect();
      n.style.transition = 'opacity 320ms'; n.style.opacity = 1;
      return new Promise(function (r) { setTimeout(r, 340); });
    }

    function applyOp(op, instant) {
      if (op.write) return paperWrite(op, instant);
      if (op.tick) return paperTick(op, instant);
      if (op.box) return paperBox(op, instant);
      if (op.grid) return paperGrid(op, instant);
      if (op.balance) return paperBalance(op, instant);
      if (op.stamp) return doStamp(op, instant);
      if (op.note) return doNote(op, instant);
      if (op.clear) { resetStage(); return Promise.resolve(); }
      if (op.sub) { // substitution swap rendered as a fresh line with glow
        return paperWrite({ write: { text: op.sub.to, margin: op.sub.margin || '' } }, instant).then(function () {
          var last = paperLines[paperLines.length - 1];
          if (last && op.sub.glow && !instant && !REDUCED) {
            last.querySelector('.ml-eq').classList.add('glow-sweep');
            setTimeout(function () { last.querySelector('.ml-eq').classList.remove('glow-sweep'); }, 900);
          }
        });
      }
      if (!dgm) return Promise.resolve();
      if (op.seg) return dgm.reveal('seg', op.seg.id, instant);
      if (op.arc) return dgm.reveal('arc', op.arc.ang, instant);
      if (op.value) return dgm.showValue(op.value.ang, op.value.to, { instant: instant, colour: op.value.colour });
      if (op.label) { dgm.setText(op.label.ang, op.label.text); return Promise.resolve(); }
      if (op.pulse) { dgm.pulse(op.pulse.ang, op.pulse.on); return Promise.resolve(); }
      if (op.zshape) {
        var pts = op.zshape.pts;
        if (pts) return dgm.overlay(pts, op.zshape.colour, instant);
        (op.zshape.angs || []).forEach(function (a) { dgm.pulse(a, true); });
        return Promise.resolve();
      }
      return Promise.resolve();
    }

    function renderDots() {
      dots.querySelectorAll('.movie-dot').forEach(function (d, i) {
        d.classList.toggle('seen', i < stepIdx);
        d.classList.toggle('now', i === stepIdx);
      });
    }

    function showCaption(i) {
      capNum.textContent = i + 1;
      capText.textContent = movie.steps[i].say || '';
    }

    function goto(i, instant) {
      if (busy) return Promise.resolve();
      i = Math.max(0, Math.min(movie.steps.length - 1, i));
      busy = true;
      resetStage();
      var pr = Promise.resolve();
      for (var k = 0; k < i; k++) {
        (function (kk) {
          pr = pr.then(function () {
            var pr2 = Promise.resolve();
            movie.steps[kk].do.forEach(function (op) { pr2 = pr2.then(function () { return applyOp(op, true); }); });
            return pr2;
          });
        })(k);
      }
      return pr.then(function () {
        stepIdx = i;
        showCaption(i);
        renderDots();
        var pr3 = Promise.resolve();
        movie.steps[i].do.forEach(function (op) { pr3 = pr3.then(function () { return applyOp(op, !!instant); }); });
        return pr3;
      }).then(function () { busy = false; scheduleAuto(); }, function () { busy = false; });
    }

    function advance() {
      if (stepIdx + 1 >= movie.steps.length) { setPlaying(false); return; }
      if (busy) return;
      busy = true;
      stepIdx++;
      showCaption(stepIdx);
      renderDots();
      var pr = Promise.resolve();
      movie.steps[stepIdx].do.forEach(function (op) { pr = pr.then(function () { return applyOp(op, false); }); });
      pr.then(function () { busy = false; scheduleAuto(); }, function () { busy = false; });
    }

    function readTime(i) {
      var words = (movie.steps[i].say || '').split(/\s+/).length;
      return Math.max(1600, words * 330);
    }
    function scheduleAuto() {
      if (!playing) return;
      clearTimeout(autoTimer);
      if (stepIdx + 1 >= movie.steps.length) { setPlaying(false); return; }
      autoTimer = setTimeout(advance, readTime(stepIdx));
    }
    function stopAuto() { setPlaying(false); }
    function setPlaying(on) {
      playing = on;
      clearTimeout(autoTimer);
      root.querySelector('.mc-play').innerHTML = on ? '❚❚ Pause' : (stepIdx + 1 >= movie.steps.length ? '↺ Replay' : '▶ Play');
      if (on) scheduleAuto();
    }

    root.querySelector('.mc-play').addEventListener('click', function () {
      if (playing) { setPlaying(false); return; }
      if (stepIdx + 1 >= movie.steps.length) { goto(0); setPlaying(true); return; }
      setPlaying(true);
      if (stepIdx === -1) advance(); else scheduleAuto();
    });
    root.querySelector('.mc-fwd').addEventListener('click', function () { stopAuto(); advance(); });
    root.querySelector('.mc-back').addEventListener('click', function () { stopAuto(); goto(Math.max(0, stepIdx - 1), true); });

    goto(0, true);

    return {
      play: function () { setPlaying(true); },
      pause: function () { setPlaying(false); },
      step: function (d) { stopAuto(); d > 0 ? advance() : goto(stepIdx - 1, true); },
      goto: goto,
      destroy: function () { clearTimeout(autoTimer); host.innerHTML = ''; }
    };
  }

  window.GJ_PLAYER = { mount: mount, renderDiagram: renderDiagram };
})();
