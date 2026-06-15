/* ============================================================================
   Isotope Lab — Mode C: Mass Spectrometer
   3 questions/play, data shown 3 ways (count bar chart, % bar chart, table).
   The pupil DRAGS number + operator tiles into the Ar formula, presses =,
   sees the denominator resolve to the total abundance (not always 100), then
   identifies the element by symbol. Honours the brief's commutativity rule.
   ============================================================================ */
(function (global) {
  'use strict';
  var Lab = global.Lab, D = global.ISO_DATA;

  var QPLAY = 3;
  var qi = 0, questions = [], q = null, correctThisPlay = 0;
  var slots = { numPair: [], numMult: [], denNum: [], denPlus: [] };
  var tiles = [];

  /* ---------- question setup ---------- */
  function buildQuestions() {
    var keys = Lab.shuffle(Object.keys(D.MASS_SPEC)).slice(0, QPLAY);
    var views = ['barCount', 'barPct', 'table'];
    questions = keys.map(function (sym, i) {
      var rec = D.MASS_SPEC[sym];
      var view = views[i];
      var flavour = (view === 'barPct') ? 'pct' : (view === 'barCount' ? 'count' : (i % 2 ? 'pct' : 'count'));
      var isos = rec.isotopes.map(function (it) {
        return { mass: it.mass, ab: it.ab, val: flavour === 'count' ? it.ab * 2 : it.ab };
      });
      var denom = isos.reduce(function (s, it) { return s + it.val; }, 0);
      var ar = D.relativeAtomicMass(rec);
      return { sym: sym, z: rec.z, isotopes: isos, flavour: flavour, denom: denom, view: view, ar: ar };
    });
  }

  /* ---------- data views ---------- */
  function renderData() {
    var host = Lab.$('#ms-data');
    if (q.view === 'table') host.innerHTML = tableView();
    else host.innerHTML = chartView();
  }
  function tableView() {
    var head = q.flavour === 'count' ? 'Abundance (count in sample)' : '% Abundance';
    var rows = q.isotopes.map(function (it) {
      return '<tr><td>' + it.mass + '</td><td>' + fmt(it.val) + (q.flavour === 'pct' ? '%' : '') + '</td></tr>';
    }).join('');
    return '<p class="ms-data-title">The mass spectrometer results &mdash; table</p>' +
      '<table class="ms-table"><thead><tr><th>Mass number</th><th>' + head + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function chartView() {
    var title = q.flavour === 'count' ? 'Relative abundance (count in a sample)' : 'Percentage abundance';
    var W = 520, H = 300, padL = 48, padB = 46, padT = 18, padR = 14;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var maxV = Math.max.apply(null, q.isotopes.map(function (i) { return i.val; }));
    var niceMax = niceCeil(maxV);
    var n = q.isotopes.length, slotW = plotW / n, bw = Math.min(64, slotW * 0.5);
    var bars = '', ticks = '';
    q.isotopes.forEach(function (it, idx) {
      var x = padL + slotW * idx + (slotW - bw) / 2;
      var h = (it.val / niceMax) * plotH;
      var y = padT + plotH - h;
      bars += '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" fill="#2A4F8F"/>';
      bars += '<text class="ms-chart-value" x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle">' + fmt(it.val) + (q.flavour === 'pct' ? '%' : '') + '</text>';
      bars += '<text class="ms-chart-label" x="' + (x + bw / 2).toFixed(1) + '" y="' + (padT + plotH + 22) + '" text-anchor="middle">' + it.mass + '</text>';
    });
    for (var g = 0; g <= 4; g++) {
      var gv = niceMax * g / 4, gy = padT + plotH - (g / 4) * plotH;
      ticks += '<line class="ms-chart-axis" x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" opacity="0.25"/>';
      ticks += '<text class="ms-chart-tick" x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end">' + fmt(gv) + '</text>';
    }
    return '<p class="ms-data-title">The mass spectrometer results &mdash; ' + title + '</p>' +
      '<svg class="ms-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bar chart of abundance against mass number">' +
      ticks +
      '<line class="ms-chart-axis" x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + plotH) + '"/>' +
      '<line class="ms-chart-axis" x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (W - padR) + '" y2="' + (padT + plotH) + '"/>' +
      bars +
      '<text class="ms-chart-label" x="' + (padL + plotW / 2) + '" y="' + (H - 6) + '" text-anchor="middle">Mass number</text>' +
      '</svg>';
  }
  function niceCeil(v) { var p = Math.pow(10, Math.floor(Math.log10(v))); var f = v / p; var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10; return nf * p; }
  function fmt(v) { return (Math.round(v * 100) / 100).toString(); }

  /* ---------- formula builder ---------- */
  function renderFormula() {
    slots = { numPair: [], numMult: [], denNum: [], denPlus: [] };
    var k = q.isotopes.length;
    var f = Lab.$('#ms-formula'); f.innerHTML = '';

    var wrap = document.createElement('div'); wrap.className = 'ms-frac';
    var top = document.createElement('div'); top.className = 'ms-frac-top';
    for (var i = 0; i < k; i++) {
      if (i > 0) top.appendChild(txt('+'));
      top.appendChild(bracket('('));
      var n0 = slot('num'); top.appendChild(n0);
      var op = slot('op'); op.dataset.expect = '×'; top.appendChild(op);
      var n1 = slot('num'); top.appendChild(n1);
      top.appendChild(bracket(')'));
      slots.numPair.push([n0, n1]); slots.numMult.push(op);
    }
    var line = document.createElement('div'); line.className = 'ms-frac-line';
    var bot = document.createElement('div'); bot.className = 'ms-frac-bottom';
    bot.appendChild(bracket('('));
    for (var j = 0; j < k; j++) {
      if (j > 0) { var pop = slot('op'); pop.dataset.expect = '+'; bot.appendChild(pop); slots.denPlus.push(pop); }
      var dn = slot('num'); bot.appendChild(dn); slots.denNum.push(dn);
    }
    bot.appendChild(bracket(')'));
    wrap.appendChild(top); wrap.appendChild(line); wrap.appendChild(bot);

    f.appendChild(label('A', true)); f.appendChild(eq()); f.appendChild(wrap);
    buildTray();
    Lab.$('#ms-result').hidden = true;
    Lab.$('#ms-equals').disabled = true;
  }
  function txt(t) { var s = document.createElement('span'); s.className = 'ms-ar-eq'; s.textContent = t; return s; }
  function bracket(b) { var s = document.createElement('span'); s.className = 'ms-slot bracket'; s.textContent = b; return s; }
  function eq() { var s = document.createElement('span'); s.className = 'ms-ar-eq'; s.textContent = '='; return s; }
  function label() { var s = document.createElement('span'); s.className = 'ms-ar-label'; s.innerHTML = 'A<sub style="font-size:.6em">r</sub>'; return s; }
  function slot(kind) {
    var s = document.createElement('span');
    s.className = 'ms-slot' + (kind === 'op' ? ' op' : '');
    s.dataset.kind = kind; s.dataset.role = 'slot'; s.tile = null;
    return s;
  }

  function buildTray() {
    var tray = Lab.$('#ms-tray'); tray.innerHTML = ''; tiles = [];
    var defs = [];
    q.isotopes.forEach(function (it) {
      defs.push({ kind: 'num', value: it.mass });
      defs.push({ kind: 'num', value: it.val });
      defs.push({ kind: 'num', value: it.val }); // abundance needed twice (numerator + denominator)
    });
    var k = q.isotopes.length;
    for (var i = 0; i < k; i++) defs.push({ kind: 'op', value: '×' });
    for (var j = 0; j < k - 1; j++) defs.push({ kind: 'op', value: '+' });
    Lab.shuffle(defs).forEach(function (d) {
      var t = document.createElement('span');
      t.className = 'ms-tile' + (d.kind === 'op' ? ' op' : '');
      t.dataset.kind = d.kind; t.dataset.value = d.value;
      t.textContent = d.value; t._slot = null;
      tray.appendChild(t); tiles.push(t);
      Lab.makeDraggable(t, {
        getDropTarget: function (x, y, node) { return dropTargetFor(x, y, node); },
        onDrop: function (node, target) { onTileDrop(node, target); }
      });
    });
  }

  function dropTargetFor(x, y, node) {
    var els = document.elementsFromPoint(x, y);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.classList && el.classList.contains('ms-slot') && !el.classList.contains('bracket') && el.dataset.kind === node.dataset.kind) return el;
      if (el.id === 'ms-tray') return el;
    }
    return null;
  }
  function onTileDrop(node, target) {
    if (!target || target.id === 'ms-tray') { returnToTray(node); return; }
    if (target.dataset.kind !== node.dataset.kind) { returnToTray(node); return; }
    placeTile(node, target);
  }
  function placeTile(tile, slotEl) {
    if (slotEl.tile && slotEl.tile !== tile) returnToTray(slotEl.tile);
    if (tile._slot) { tile._slot.tile = null; tile._slot.classList.remove('filled', 'correct', 'wrong'); }
    slotEl.tile = tile; tile._slot = slotEl;
    slotEl.appendChild(tile); slotEl.classList.add('filled'); slotEl.classList.remove('correct', 'wrong');
    Lab.sound.pop();
    updateEquals();
  }
  function returnToTray(tile) {
    if (tile._slot) { tile._slot.tile = null; tile._slot.classList.remove('filled', 'correct', 'wrong'); tile._slot = null; }
    Lab.$('#ms-tray').appendChild(tile);
    updateEquals();
  }
  function allSlots() { return slots.numPair.reduce(function (a, p) { return a.concat(p); }, []).concat(slots.numMult, slots.denNum, slots.denPlus); }
  function updateEquals() {
    var filled = allSlots().every(function (s) { return !!s.tile; });
    Lab.$('#ms-equals').disabled = !filled;
  }
  function clearTiles() { tiles.forEach(function (t) { returnToTray(t); }); allSlots().forEach(function (s) { s.classList.remove('correct', 'wrong'); }); }

  /* ---------- grading ---------- */
  function grade() {
    var okOps = slots.numMult.every(function (s) { return s.tile && s.tile.dataset.value === '×'; }) &&
                slots.denPlus.every(function (s) { return s.tile && s.tile.dataset.value === '+'; });
    // numerator pairs as sorted multiset
    var gotPairs = slots.numPair.map(function (p) { return [num(p[0]), num(p[1])].sort(function (a, b) { return a - b; }); });
    var wantPairs = q.isotopes.map(function (it) { return [it.mass, it.val].sort(function (a, b) { return a - b; }); });
    var pairsOk = multisetPairsEqual(gotPairs, wantPairs);
    var gotDen = slots.denNum.map(num).sort(function (a, b) { return a - b; });
    var wantDen = q.isotopes.map(function (it) { return it.val; }).sort(function (a, b) { return a - b; });
    var denOk = arrEqual(gotDen, wantDen);

    // colour feedback per bracket / denominator
    slots.numPair.forEach(function (p, idx) {
      var pair = [num(p[0]), num(p[1])].sort(function (a, b) { return a - b; });
      var matched = wantPairs.some(function (w) { return w[0] === pair[0] && w[1] === pair[1]; }) && slots.numMult[idx].tile.dataset.value === '×';
      mark(p[0], matched); mark(p[1], matched); mark(slots.numMult[idx], slots.numMult[idx].tile.dataset.value === '×');
    });
    slots.denNum.forEach(function (s) { mark(s, denOk); });
    slots.denPlus.forEach(function (s) { mark(s, s.tile.dataset.value === '+'); });

    if (okOps && pairsOk && denOk) reveal();
    else { Lab.sound.wrong(); Lab.narrate('mass_miss'); Lab.toast('Not quite — check the red boxes. Each bracket is mass × abundance, and the bottom is every abundance added up.'); }
  }
  function num(s) { return parseFloat(s.tile.dataset.value); }
  function mark(s, ok) { s.classList.remove('correct', 'wrong'); s.classList.add(ok ? 'correct' : 'wrong'); }
  function arrEqual(a, b) { return a.length === b.length && a.every(function (v, i) { return v === b[i]; }); }
  function multisetPairsEqual(got, want) {
    if (got.length !== want.length) return false;
    var used = want.map(function () { return false; });
    return got.every(function (g) {
      for (var i = 0; i < want.length; i++) { if (!used[i] && want[i][0] === g[0] && want[i][1] === g[1]) { used[i] = true; return true; } }
      return false;
    });
  }

  function reveal() {
    Lab.sound.correct();
    var sumTerms = q.isotopes.map(function (it) { return it.mass + '×' + fmt(it.val); }).join(' + ');
    var denStr = q.isotopes.map(function (it) { return fmt(it.val); }).join(' + ');
    var res = Lab.$('#ms-result'); res.hidden = false; res.className = 'ms-result good';
    res.innerHTML = 'Well placed! The bottom of the fraction is the <b>total abundance</b>: ' +
      denStr + ' = <b>' + fmt(q.denom) + '</b>' + (q.flavour === 'count' ? ' (a count in a sample &mdash; not 100)' : ' (these are percentages, so they total 100)') + '.' +
      '<span class="ar-big">A<sub>r</sub> = ' + fmt(q.ar.rounded) + '</span>';
    Lab.$('#ms-equals').disabled = true;
    Lab.$('#ms-identify').hidden = false;
    Lab.$('#ms-symbol').value = ''; Lab.$('#ms-symbol').focus();
    Lab.$('#ms-identify-feedback').hidden = true;
    Lab.$('#ms-next').hidden = true;
    Lab.narrate('mass_open', 'Great — now use that relative atomic mass to identify the element.');
  }

  function identify() {
    var raw = (Lab.$('#ms-symbol').value || '').trim();
    var fb = Lab.$('#ms-identify-feedback'); fb.hidden = false;
    if (!raw) { fb.className = 'ms-identify-feedback bad'; fb.textContent = 'Type the element symbol first.'; return; }
    var properSym = D.ELEMENTS[q.z].sym;
    if (raw === properSym) {
      fb.className = 'ms-identify-feedback good';
      fb.innerHTML = 'Correct! A<sub>r</sub> &asymp; ' + fmt(q.ar.rounded) + ' is <b>' + D.ELEMENTS[q.z].name + ' (' + properSym + ')</b>.';
      Lab.sound.correct(); Lab.narrate('mass_win');
      Lab.$('#ms-identify-go').disabled = true;
      Lab.$('#ms-next').hidden = false;
      correctThisPlay++;
      Lab.state.progress.massspec.correct = (Lab.state.progress.massspec.correct || 0) + 1;
      Lab.addXp(30);
    } else if (raw.toLowerCase() === properSym.toLowerCase()) {
      fb.className = 'ms-identify-feedback bad';
      fb.innerHTML = 'Right element, but check the capital letters &mdash; it should be written <b>' + properSym + '</b>.';
      Lab.sound.wrong();
    } else {
      fb.className = 'ms-identify-feedback bad';
      fb.textContent = 'Not this one. Compare your A_r of ' + fmt(q.ar.rounded) + ' with the periodic table and try again.';
      Lab.sound.wrong(); Lab.narrate('mass_miss');
    }
  }

  /* ---------- flow ---------- */
  function loadQuestion() {
    q = questions[qi];
    Lab.$('#ms-qnum').textContent = (qi + 1);
    Lab.$('#ms-identify').hidden = true;
    Lab.$('#ms-identify-go').disabled = false;
    renderData();
    renderFormula();
    Lab.narrate('mass_open');
  }
  function nextQuestion() {
    qi++;
    if (qi >= QPLAY) return finish();
    loadQuestion();
  }
  function finish() {
    Lab.state.progress.massspec.done = (Lab.state.progress.massspec.done || 0) + QPLAY;
    Lab.updateHubProgress();
    Lab.celebrate({
      char: correctThisPlay === QPLAY ? 'anim_15_level_up_stars.webp' : 'anim_06_confetti_celebration.webp',
      title: correctThisPlay === QPLAY ? 'Spectrometer mastered!' : 'Nice work!',
      body: 'You identified ' + correctThisPlay + ' of ' + QPLAY + ' elements.',
      stats: [{ value: correctThisPlay + '/' + QPLAY, label: 'Identified' }, { value: correctThisPlay * 30, label: 'XP earned' }],
      cta: 'Back to hub',
      onContinue: function () { Lab.goHub(); }
    });
  }

  /* ---------- public ---------- */
  Lab.MassSpec = {
    enter: function () {
      Lab.showScreen('massspec');
      Lab.$('#ms-intro').hidden = false;
      Lab.$('#ms-play').hidden = true;
      Lab.narrate('mass_open');
    },
    leave: function () {}
  };
  Lab.MassSpec.bind = function () {
    Lab.$('#ms-begin').addEventListener('click', function () {
      qi = 0; correctThisPlay = 0; buildQuestions();
      Lab.$('#ms-intro').hidden = true; Lab.$('#ms-play').hidden = false;
      Lab.sound.unlock(); loadQuestion();
    });
    Lab.$('#ms-equals').addEventListener('click', grade);
    Lab.$('#ms-clear').addEventListener('click', clearTiles);
    Lab.$('#ms-identify-go').addEventListener('click', identify);
    Lab.$('#ms-symbol').addEventListener('keydown', function (e) { if (e.key === 'Enter') identify(); });
    Lab.$('#ms-next').addEventListener('click', nextQuestion);
  };

})(typeof window !== 'undefined' ? window : this);
