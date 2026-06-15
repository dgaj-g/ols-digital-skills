/* ============================================================================
   Isotope Lab — Mode B: Isotope Snap
   Two cards (a "Drawing" Bohr model and/or a "Coding" nuclide notation).
   The pupil presses SNAP only when they are an isotope pair: same element
   (same protons / atomic number) but a DIFFERENT mass number.
   Real fail state, speed-based scoring, Web-Audio feedback.
   ============================================================================ */
(function (global) {
  'use strict';
  var Lab = global.Lab, D = global.ISO_DATA;

  var TOTAL = 10, ROUND_MS = 9000;
  var round = 0, score = 0, streak = 0, bestStreak = 0;
  var current = null, tStart = 0, tRaf = null, resolved = false;

  /* ---------- card art ---------- */
  function codingHTML(z, mass) {
    var sym = D.ELEMENTS[z].sym;
    return '<span class="card-type-tag">Code</span>' +
      '<span class="nuclide"><span class="nuc-numbers">' +
      '<span class="nuc-mass">' + mass + '</span>' +
      '<span class="nuc-z">' + z + '</span></span>' +
      '<span class="nuc-sym">' + sym + '</span></span>';
  }

  function bohrSVG(z, mass) {
    var p = z, n = mass - z, total = p + n;
    var cx = 100, cy = 100, nucR = 27;
    var dotR = Lab.clamp(nucR * 0.95 / Math.sqrt(Math.max(1, total)), 2.6, 6);
    // pack nucleons (sunflower disk)
    var types = Lab.shuffle(fill(p, n)), nuc = '';
    for (var i = 0; i < total; i++) {
      var rr = (total === 1) ? 0 : nucR * 0.82 * Math.sqrt(i / total);
      var th = i * 2.399963;
      var x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
      var col = types[i] === 'p' ? '#E8553B' : '#6B7A90';
      nuc += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + dotR.toFixed(1) + '" fill="' + col + '" stroke="#fff" stroke-width="0.7"/>';
    }
    // electron shells
    var shells = D.electronShells(z), rings = '', elec = '';
    var radii = [46, 68, 88, 96];
    shells.forEach(function (k, idx) {
      var R = radii[idx];
      rings += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="#9bdcff" stroke-width="1.4" opacity="0.7"/>';
      for (var j = 0; j < k; j++) {
        var ang = -Math.PI / 2 + (j / k) * Math.PI * 2;
        var ex = cx + Math.cos(ang) * R, ey = cy + Math.sin(ang) * R;
        elec += '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="4.4" fill="#38B6FF" stroke="#fff" stroke-width="0.8"/>';
      }
    });
    var svg = '<svg class="bohr" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Atom diagram">' +
      rings +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + nucR + '" fill="rgba(232,85,59,0.06)" stroke="#cdd7e6" stroke-width="1" stroke-dasharray="3 3"/>' +
      nuc + elec + '</svg>';
    return '<span class="card-type-tag">Drawing</span>' + svg;
  }
  function fill(p, n) { var a = []; var i; for (i = 0; i < p; i++) a.push('p'); for (i = 0; i < n; i++) a.push('n'); return a; }

  function renderCard(elId, card) {
    var el = Lab.$('#' + elId);
    el.classList.remove('correct', 'wrong', 'flip-in');
    void el.offsetWidth;
    el.innerHTML = card.type === 'code' ? codingHTML(card.z, card.mass) : bohrSVG(card.z, card.mass);
    el.classList.add('flip-in');
  }

  /* ---------- round generation ---------- */
  function elementsWithIsotopes() { return D.SNAP_BANK.filter(function (g) { return g.masses.length >= 2; }); }
  function randType() { return Math.random() < 0.5 ? 'draw' : 'code'; }

  function makeRound() {
    var isPair = Math.random() < 0.5;
    var a, b;
    if (isPair) {
      var g = pick(elementsWithIsotopes());
      var masses = Lab.shuffle(g.masses).slice(0, 2);
      a = { z: g.z, mass: masses[0], type: randType() };
      b = { z: g.z, mass: masses[1], type: randType() };
    } else {
      if (Math.random() < 0.4) {
        // same element, SAME mass (identical isotope shown two ways) -> NOT a pair (mass not different)
        var g2 = pick(D.SNAP_BANK);
        var m = pick(g2.masses);
        a = { z: g2.z, mass: m, type: 'draw' };
        b = { z: g2.z, mass: m, type: 'code' };
      } else {
        // different elements -> NOT a pair
        var all = D.SNAP_ISOTOPES, x = pick(all), y;
        do { y = pick(all); } while (y.z === x.z);
        a = { z: x.z, mass: x.mass, type: randType() };
        b = { z: y.z, mass: y.mass, type: randType() };
      }
    }
    // avoid two identical-looking code cards being literally the same node order
    return { a: a, b: b, isPair: isPair };
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------- timer ---------- */
  function startTimer() {
    tStart = Date.now(); resolved = false;
    var fill = Lab.$('#snap-timer-fill');
    function tick() {
      if (resolved) return;
      var elapsed = Date.now() - tStart, frac = Lab.clamp(1 - elapsed / ROUND_MS, 0, 1);
      fill.style.width = (frac * 100) + '%';
      fill.classList.toggle('low', frac < 0.34);
      if (elapsed >= ROUND_MS) { resolve('timeout'); return; }
      tRaf = requestAnimationFrame(tick);
    }
    tick();
  }
  function stopTimer() { resolved = true; if (tRaf) cancelAnimationFrame(tRaf); tRaf = null; }

  /* ---------- flow ---------- */
  function nextRound() {
    round++;
    Lab.$('#snap-round').textContent = round;
    current = makeRound();
    renderCard('snap-card-a', current.a);
    renderCard('snap-card-b', current.b);
    Lab.$('#snap-feedback').hidden = true;
    setButtons(true);
    startTimer();
  }

  function setButtons(on) { Lab.$('#snap-yes').disabled = !on; Lab.$('#snap-no').disabled = !on; }

  function resolve(decision) {
    if (resolved && decision !== 'timeout') return;
    stopTimer(); setButtons(false);
    var correct = (decision === 'snap' && current.isPair) || (decision === 'no' && !current.isPair);
    var remain = Lab.clamp(1 - (Date.now() - tStart) / ROUND_MS, 0, 1);

    var cardA = Lab.$('#snap-card-a'), cardB = Lab.$('#snap-card-b');
    cardA.classList.add(correct ? 'correct' : 'wrong');
    cardB.classList.add(correct ? 'correct' : 'wrong');

    var fb = Lab.$('#snap-feedback'); fb.hidden = false;
    var why = explain(current);
    if (correct) {
      var pts = 10 + Math.round(remain * 10);
      score += pts; streak++; bestStreak = Math.max(bestStreak, streak);
      fb.className = 'snap-feedback good';
      fb.innerHTML = '<b>+' + pts + '</b> &nbsp;' + why;
      Lab.sound.snapYes(); Lab.narrate('snap_yes');
    } else {
      streak = 0;
      fb.className = 'snap-feedback bad';
      fb.innerHTML = (decision === 'timeout' ? '<b>Time!</b> ' : '<b>Not quite.</b> ') + why;
      Lab.sound.snapNo(); Lab.narrate('snap_no');
    }
    Lab.$('#snap-streak').textContent = streak;

    setTimeout(function () {
      if (round >= TOTAL) finish();
      else nextRound();
    }, 2100);
  }

  function explain(r) {
    var a = r.a, b = r.b;
    var sa = D.ELEMENTS[a.z].name, sb = D.ELEMENTS[b.z].name;
    var line = 'Card 1: ' + sa + ' (' + a.z + ' protons), mass ' + a.mass + '. Card 2: ' + sb + ' (' + b.z + ' protons), mass ' + b.mass + '. ';
    if (r.isPair) line += 'Same element, different mass &rarr; <b>isotopes</b>.';
    else if (a.z === b.z) line += 'Same element but the <b>same</b> mass &rarr; the same atom, <b>not</b> a pair of isotopes.';
    else line += 'Different elements &rarr; <b>not</b> isotopes.';
    return line;
  }

  function finish() {
    Lab.state.progress.snap.plays = (Lab.state.progress.snap.plays || 0) + 1;
    Lab.state.progress.snap.bestStreak = Math.max(Lab.state.progress.snap.bestStreak || 0, bestStreak);
    Lab.state.progress.snap.bestScore = Math.max(Lab.state.progress.snap.bestScore || 0, score);
    Lab.addXp(score); Lab.updateHubProgress(); Lab.narrate('snap_done');
    Lab.celebrate({
      char: bestStreak >= 6 ? 'anim_15_level_up_stars.webp' : 'anim_06_confetti_celebration.webp',
      title: bestStreak >= 8 ? 'Snap master!' : 'Round complete!',
      body: 'You scored ' + score + ' points this round.',
      stats: [{ value: score, label: 'Score' }, { value: bestStreak, label: 'Best streak' }],
      cta: 'Back to hub',
      onContinue: function () { Lab.goHub(); }
    });
  }

  /* ---------- public ---------- */
  Lab.Snap = {
    enter: function () {
      Lab.showScreen('snap');
      Lab.$('#snap-intro').hidden = false;
      Lab.$('#snap-play').hidden = true;
      Lab.$('#snap-total').textContent = TOTAL;
      Lab.$('#snap-total2').textContent = TOTAL;
      Lab.narrate('snap_open');
    },
    leave: function () { stopTimer(); }
  };

  Lab.Snap.bind = function () {
    Lab.$('#snap-begin').addEventListener('click', function () {
      round = 0; score = 0; streak = 0; bestStreak = 0;
      Lab.$('#snap-streak').textContent = '0';
      Lab.$('#snap-intro').hidden = true;
      Lab.$('#snap-play').hidden = false;
      Lab.sound.unlock();
      nextRound();
    });
    Lab.$('#snap-yes').addEventListener('click', function () { resolve('snap'); });
    Lab.$('#snap-no').addEventListener('click', function () { resolve('no'); });
  };

})(typeof window !== 'undefined' ? window : this);
