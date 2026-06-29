/* ===========================================================================
   Clár Ama Beo — build the school timetable by ear
   The pupil hears Róisín announce a subject (audio = the only prompt), finds its
   colourful picture in the bank, and places it in that lesson. A NEW verb for the
   Irish set: ORGANISE into a timetable you build, with a "go live" batch commit.
   =========================================================================== */
(function () {
  'use strict';

  var BY_SLUG = {};
  SUBJECTS.forEach(function (s) { BY_SLUG[s.slug] = s; });
  var PTEACH = PERIODS.filter(function (p) { return p.key; }).map(function (p) { return p.key; }); // p1..p6
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- audio ---------- */
  var actx = null;
  function getCtx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } return actx; }
  function resumeCtx() { var c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(function () {}); }
  function tone(f, d, t, v) { var c = getCtx(); if (!c) return; var o = c.createOscillator(), g = c.createGain(); o.type = t || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(v || 0.1, c.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (d || 0.1)); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + (d || 0.1) + 0.02); }
  function chimeRight() { tone(660, 0.10, 'sine', 0.13); setTimeout(function () { tone(990, 0.14, 'sine', 0.12); }, 80); }
  function chimeWrong() { tone(196, 0.20, 'triangle', 0.10); }
  function fanfare() { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { setTimeout(function () { tone(f, 0.5, 'sine', 0.12); }, i * 120); }); }

  var audioEl = new Audio(); audioEl.preload = 'auto';
  var curBtn = null;
  function playAnnouncement(slug, btn) {
    resumeCtx();
    if (curBtn) curBtn.classList.remove('playing');
    curBtn = btn || null; if (curBtn) curBtn.classList.add('playing');
    try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) {}
    audioEl.src = AUDIO_DIR + slug + '.m4a';
    var p = audioEl.play(); if (p && p.catch) p.catch(function () { if (curBtn) curBtn.classList.remove('playing'); });
  }
  audioEl.addEventListener('ended', function () { if (curBtn) curBtn.classList.remove('playing'); });
  audioEl.addEventListener('error', function () { if (curBtn) curBtn.classList.remove('playing'); });

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function div(cls) { var d = document.createElement('div'); if (cls) d.className = cls; return d; }
  function imgFor(s) { var i = document.createElement('img'); i.src = s.asset; i.alt = ''; i.draggable = false; return i; }

  /* ---------- DOM ---------- */
  var scrStart = $('start'), scrGame = $('game'), scrEnd = $('end');
  var tt = $('tt'), bank = $('bank'), weekstrip = $('weekstrip');
  var elLives = $('lives'), elScore = $('score'), elHudDay = $('hud-day'), elInstruction = $('instruction');
  var btnGoLive = $('btn-golive'), toast = $('toast'), srStatus = $('sr-status');
  function show(s) { [scrStart, scrGame, scrEnd].forEach(function (x) { x.hidden = (x !== s); }); }

  /* ---------- state ---------- */
  var S = null;
  function newGame() { return { day: 0, lives: 3, score: 0, missed: {}, cells: {}, locked: {}, selected: null }; }
  function resetDay() { S.cells = {}; S.locked = {}; PTEACH.forEach(function (pk) { S.cells[pk] = null; S.locked[pk] = false; }); S.selected = null; S.dirtySinceCheck = true; }

  /* ---------- week strip ---------- */
  function buildWeekStrip() {
    weekstrip.innerHTML = '';
    DAYS.forEach(function (name, di) {
      var c = div('ca-daychip' + (di < S.day ? ' done' : di === S.day ? ' active' : ''));
      c.textContent = name;
      weekstrip.appendChild(c);
    });
  }

  /* ---------- cell rendering ---------- */
  function cellEl(di, pk) { return tt.querySelector('.ca-cell[data-day="' + di + '"][data-pk="' + pk + '"]'); }

  function renderPlaced(cell, subject, answerSlug) {
    /* a tile has been dropped/placed (not yet graded): show the picture + a small replay */
    cell.innerHTML = '';
    cell.appendChild(imgWrap(subject));
    var rp = document.createElement('button'); rp.className = 'ca-cell-replay'; rp.type = 'button'; rp.textContent = '▶';
    rp.setAttribute('aria-label', UI.playAnnouncement);
    rp.addEventListener('click', function (e) { e.stopPropagation(); playAnnouncement(answerSlug, rp); });
    cell.appendChild(rp);
  }
  function imgWrap(subject) { var im = imgFor(subject); im.className = 'ca-cell-img' + (subject.kind === 'flag' ? ' is-flag' : ''); return im; }

  function renderEmpty(cell, answerSlug) {
    cell.innerHTML = '';
    var pb = document.createElement('button'); pb.className = 'ca-cell-play'; pb.type = 'button'; pb.textContent = '▶';
    pb.setAttribute('aria-label', UI.playAnnouncement);
    pb.addEventListener('click', function (e) { e.stopPropagation(); playAnnouncement(answerSlug, pb); });
    cell.appendChild(pb);
  }

  function lockCell(cell, subject) {
    cell.classList.remove('wrong', 'droppable'); cell.classList.add('correct');
    cell.removeAttribute('tabindex'); cell.removeAttribute('role'); cell.removeAttribute('aria-label'); /* a locked cell is no longer an interactive target */
    cell.style.setProperty('--cell-dept', DEPT_COLOURS[subject.dept] || 'var(--ca-ok)');
    cell.innerHTML = '';
    cell.appendChild(imgWrap(subject));
    var nm = div('ca-cell-name'); nm.textContent = subject.irish; cell.appendChild(nm);
  }

  /* ---------- build the timetable (week of columns; phone shows active day only) ---------- */
  function buildTimetable() {
    tt.innerHTML = '';
    var lc = div('ca-labelcol');
    lc.appendChild(div('ca-colhead'));
    PERIODS.forEach(function (p) {
      var l = div('ca-lbl ca-row' + (p.type ? ' rsm' : ''));
      l.textContent = p.label; lc.appendChild(l);
    });
    tt.appendChild(lc);

    DAYS.forEach(function (dayName, di) {
      var col = div('ca-daycol'); col.dataset.day = di;
      var state = di < S.day ? 'done' : di === S.day ? 'active' : 'future';
      col.classList.add(state === 'active' ? 'is-active' : 'is-inactive');
      var head = div('ca-colhead'); head.textContent = dayName; col.appendChild(head);

      var ans = TIMETABLE[di], ti = 0;
      PERIODS.forEach(function (p) {
        if (p.type) { var sp = div('ca-spacer ca-row rsm'); sp.textContent = p.type === 'break' ? '☕' : '🍎'; col.appendChild(sp); return; }
        var pk = p.key, idx = ti; ti++;
        var cell = div('ca-cell ca-row'); cell.dataset.day = di; cell.dataset.pk = pk;
        if (state === 'active') {
          cell.classList.add('droppable');
          if (S.locked[pk]) { lockCell(cell, BY_SLUG[S.cells[pk]]); }
          else if (S.cells[pk]) { renderPlaced(cell, BY_SLUG[S.cells[pk]], ans[idx]); }
          else { renderEmpty(cell, ans[idx]); }
          if (!S.locked[pk]) {                    /* keyboard path: focus a cell + Enter to drop the selected tile */
            cell.setAttribute('tabindex', '0');
            cell.setAttribute('role', 'button');
            cell.setAttribute('aria-label', p.label + ' — cuir ábhar anseo');
            cell.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick(cell); } });
          }
          cell.addEventListener('click', function () { onCellClick(cell); });
        } else if (state === 'done') {
          lockCell(cell, BY_SLUG[ans[idx]]);
        }
        col.appendChild(cell);
      });
      tt.appendChild(col);
    });
  }

  /* ---------- bank (palette) ---------- */
  function buildBank() {
    bank.innerHTML = '';
    SUBJECTS.forEach(function (s) {
      var t = div('ca-tile' + (s.kind === 'flag' ? ' is-flag' : ''));
      t.dataset.slug = s.slug;
      t.setAttribute('role', 'button');
      t.setAttribute('tabindex', '0');
      t.setAttribute('aria-pressed', 'false');
      /* accessible name = the picture's MEANING (English), never the Irish word — so a
         screen-reader/inspecting pupil still has to know the heard Irish to choose,
         exactly like a sighted pupil reading the icon (no Irish-audio->Irish-text match). */
      t.setAttribute('aria-label', s.english);
      t.appendChild(imgFor(s));
      attachTileDrag(t, s);
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTile(s.slug); } });
      bank.appendChild(t);
    });
  }
  function selectTile(slug) {
    S.selected = (S.selected === slug) ? null : slug;
    Array.prototype.forEach.call(bank.children, function (t) {
      var on = t.dataset.slug === S.selected;
      t.classList.toggle('lifted', S.selected != null && !on);
      t.classList.toggle('sel', on);
      t.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    instruction();
  }

  /* ---------- placing ---------- */
  function activeAnswer(pk) { var i = PTEACH.indexOf(pk); return TIMETABLE[S.day][i]; }
  function onCellClick(cell) {
    var pk = cell.dataset.pk;
    if (S.locked[pk]) return;
    if (S.selected) { place(pk, S.selected); clearSelection(); }
  }
  function clearSelection() {
    S.selected = null;
    Array.prototype.forEach.call(bank.children, function (t) { t.classList.remove('lifted', 'sel'); t.setAttribute('aria-pressed', 'false'); });
  }
  function place(pk, slug) {
    if (S.locked[pk]) return;
    if (S.cells[pk] !== slug) S.dirtySinceCheck = true;   /* a real change re-enables "go live" */
    S.cells[pk] = slug;
    var cell = cellEl(S.day, pk);
    cell.classList.remove('wrong');
    renderPlaced(cell, BY_SLUG[slug], activeAnswer(pk));
    updateGoLive(); instruction();
  }

  function updateGoLive() {
    var full = PTEACH.every(function (pk) { return S.cells[pk]; });
    btnGoLive.disabled = !(full && S.dirtySinceCheck);   /* must change something since the last check (no instant life-drain) */
  }
  function instruction() {
    var filled = PTEACH.filter(function (pk) { return S.cells[pk]; }).length;
    if (filled < PTEACH.length) {
      elInstruction.innerHTML = 'Éist le gach rang &amp; cuir an t-ábhar ceart ann. <b>' + filled + '/' + PTEACH.length + '</b> líonta. <span style="opacity:.8">&middot; tap a lesson to hear it, then place the picture</span>';
    } else {
      elInstruction.innerHTML = 'Tá an lá líonta — brúigh <b>' + UI.makeLive + '</b>';
    }
  }

  /* ---------- go live (grade the day) ---------- */
  function goLive() {
    if (btnGoLive.disabled) return;
    var ans = TIMETABLE[S.day], anyWrong = false;
    PTEACH.forEach(function (pk, i) {
      if (S.locked[pk]) return;
      var cell = cellEl(S.day, pk);
      if (S.cells[pk] === ans[i]) {
        S.locked[pk] = true; S.score += 10;
        lockCell(cell, BY_SLUG[ans[i]]); cell.classList.add('justlit');
      } else {
        anyWrong = true; cell.classList.remove('correct'); cell.classList.add('wrong');
        S.missed[ans[i]] = true;
        void cell.offsetWidth; // restart shake
      }
    });
    S.dirtySinceCheck = false;   /* nothing changed yet since this check -> "go live" stays disabled until a wrong cell is re-placed */
    renderHud();
    if (anyWrong) {
      S.lives--; renderHud(); chimeWrong();
      showToast(UI.wrong + ' — féach ar na cinn dhearga', 'bad');
      if (srStatus) srStatus.textContent = UI.wrong + '. Bain triail eile as na cinn dhearga.';
      if (S.lives <= 0) { setTimeout(function () { endGame(false); }, 900); return; }
      updateGoLive();
    } else {
      chimeRight();
      showToast(UI.wellDone + ' Lá críochnaithe!', 'good');
      if (srStatus) srStatus.textContent = UI.wellDone + ' ' + DAYS[S.day] + ' críochnaithe.';
      btnGoLive.disabled = true;
      setTimeout(advanceDay, 1300);
    }
  }
  function advanceDay() {
    hideToast();
    S.day++;
    if (S.day > 4) { endGame(true); return; }
    resetDay(); buildWeekStrip(); buildTimetable(); renderHud(); updateGoLive(); instruction();
    autoPlayFirst();
  }

  /* ---------- HUD ---------- */
  function renderHud() {
    var h = ''; for (var i = 0; i < 3; i++) h += '<span class="' + (i < S.lives ? '' : 'heart-lost') + '">❤️</span>';
    elLives.innerHTML = h;
    elScore.textContent = S.score;
    elHudDay.innerHTML = UI.day + ' ' + (S.day + 1) + '/5 &middot; ' + DAYS[S.day];
  }

  /* ---------- toast ---------- */
  var toastT = null;
  function showToast(txt, cls) { toast.textContent = txt; toast.className = 'ca-toast ' + (cls || ''); toast.hidden = false; clearTimeout(toastT); toastT = setTimeout(hideToast, 2400); }
  function hideToast() { toast.hidden = true; }

  function autoPlayFirst() {
    var first = cellEl(S.day, 'p1'); if (!first) return;
    var pb = first.querySelector('.ca-cell-play');
    setTimeout(function () { playAnnouncement(TIMETABLE[S.day][0], pb); }, 320);
  }

  /* ---------- end ---------- */
  function endGame(completed) {
    show(scrEnd);
    var stars = completed ? S.lives : 0;
    $('end-stars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
    var title = !completed ? 'Tá na croíthe imithe — bain triail eile as!'
      : stars === 3 ? 'Foirfe! Máistir an chláir ama!'
      : stars === 2 ? 'Ar fheabhas! Clár ama iomlán!'
      : 'Maith thú! Clár ama iomlán!';
    $('end-title').textContent = title;
    $('end-score').textContent = S.score;
    var recap = $('end-recap');
    var missed = Object.keys(S.missed);
    if (!missed.length) {
      recap.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted);margin:0">Gan botún ar bith. Sárobair!</p>';
    } else {
      recap.innerHTML = '<p style="grid-column:1/-1;margin:0 0 4px;font-weight:700;color:var(--ols-blue)">Foghlaim na hábhair seo:</p>';
      missed.forEach(function (slug) {
        var s = BY_SLUG[slug]; var item = div('ca-recap-item');
        var em = div('ca-recap-emblem'); em.appendChild(imgFor(s)); item.appendChild(em);
        var tx = div('ca-recap-text'); tx.innerHTML = '<b>' + s.irish + '</b><span>' + s.english + '</span>'; item.appendChild(tx);
        var pl = document.createElement('button'); pl.className = 'ca-recap-play'; pl.type = 'button'; pl.textContent = '▶';
        pl.setAttribute('aria-label', 'Seinn ' + s.english); pl.addEventListener('click', function () { playAnnouncement(slug, pl); });
        item.appendChild(pl); recap.appendChild(item);
      });
    }
    if (completed && !REDUCED) confetti();
    if (completed) fanfare();
  }

  /* ===========================================================================
     Drag engine — clone the bank tile, track via document-level listeners.
     All the playbook drag-feel rules: no transition/animation on the moving clone,
     translate3d synchronous per move, persistent rAF loop for hit-test + auto-scroll,
     whole-cell drop, page-wide text-selection lock.
     =========================================================================== */
  function cellUnder(x, y) {
    var els = document.elementsFromPoint(x, y) || [];
    for (var i = 0; i < els.length; i++) {
      var c = els[i].closest && els[i].closest('.ca-cell.droppable');
      if (c && !c.classList.contains('correct')) return c;
    }
    return null;
  }
  var armedCell = null, dragActive = false;
  function armCell(c) { if (armedCell && armedCell !== c) armedCell.classList.remove('armed'); if (c) c.classList.add('armed'); armedCell = c; }

  function attachTileDrag(tile, subject) {
    var st = { id: null, sx: 0, sy: 0, moved: false, lastX: 0, lastY: 0, raf: 0, armed: null, clone: null };
    tile.addEventListener('pointerdown', function (e) {
      if (st.id !== null || dragActive) return;     /* ignore a second concurrent drag */
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      st.id = e.pointerId; st.moved = false; st.sx = e.clientX; st.sy = e.clientY;
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
    function onMove(e) {
      if (st.id !== e.pointerId) return;
      if (!st.moved) {
        if (Math.hypot(e.clientX - st.sx, e.clientY - st.sy) < (e.pointerType === 'touch' ? 10 : 6)) return;
        st.moved = true;
        var r = tile.getBoundingClientRect();
        var c = tile.cloneNode(true); c.classList.add('dragging');
        c.style.left = r.left + 'px'; c.style.top = r.top + 'px'; c.style.width = r.width + 'px'; c.style.height = r.height + 'px'; c.style.margin = '0';
        document.body.appendChild(c);          /* position:fixed clone; document listeners track it, so re-parenting is safe (no capture relied on) */
        st.clone = c; tile.classList.add('lifted'); dragActive = true;
        document.body.classList.add('dragging-active');
        st.sx = e.clientX; st.sy = e.clientY;
        st.raf = requestAnimationFrame(loop);
      }
      st.lastX = e.clientX; st.lastY = e.clientY;
      var dx = e.clientX - st.sx, dy = e.clientY - st.sy;
      st.clone.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0) scale(1.06) rotate(' + Math.max(-6, Math.min(6, dx / 24)) + 'deg)';
    }
    function loop() {
      var z = cellUnder(st.lastX, st.lastY);
      if (z !== st.armed) { armCell(z); st.armed = z; }
      autoEdgeScroll(st.lastY);
      st.raf = requestAnimationFrame(loop);
    }
    function onUp(e) {
      if (st.id !== e.pointerId) return;
      st.id = null; dragActive = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
      document.body.classList.remove('dragging-active');
      tile.classList.remove('lifted');
      if (!st.moved) { selectTile(subject.slug); return; }   /* a tap = select (tap-to-place fallback) */
      var z = (e.type === 'pointercancel') ? null : cellUnder(st.lastX, st.lastY);
      armCell(null); st.armed = null;
      if (st.clone) { st.clone.remove(); st.clone = null; }
      if (z) { place(z.dataset.pk, subject.slug); clearSelection(); }
    }
  }

  function autoEdgeScroll(y) {
    var m = 80, h = window.innerHeight;
    if (y > h - m) window.scrollBy({ top: Math.min(16, y - (h - m)), behavior: 'instant' in window ? 'instant' : 'auto' });
    else if (y < m) window.scrollBy({ top: -Math.min(16, m - y), behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  /* ---------- confetti ---------- */
  function confetti() {
    var c = document.createElement('canvas'); c.id = 'ca-confetti'; document.body.appendChild(c);
    var ctx = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight;
    var cols = ['#E4B824', '#1A3A6B', '#1F9D55', '#E07A1F', '#6CADDF', '#ffffff'], P = [];
    for (var i = 0; i < 140; i++) P.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.4, r: 4 + Math.random() * 6, c: cols[i % cols.length], vy: 2 + Math.random() * 4, vx: -2 + Math.random() * 4, a: Math.random() * 6, va: -0.2 + Math.random() * 0.4 });
    var t0 = performance.now();
    (function loop(t) { ctx.clearRect(0, 0, W, H); P.forEach(function (p) { p.y += p.vy; p.x += p.vx; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); ctx.restore(); }); if (t - t0 < 2600) requestAnimationFrame(loop); else c.remove(); })(t0);
  }

  /* ---------- wiring ---------- */
  function startGame() {
    resumeCtx();
    S = newGame(); resetDay();
    show(scrGame);
    buildWeekStrip(); buildTimetable(); buildBank(); renderHud(); updateGoLive(); instruction();
    autoPlayFirst();
  }
  $('btn-start').addEventListener('click', startGame);
  $('btn-again').addEventListener('click', startGame);
  $('btn-home').addEventListener('click', function () { show(scrStart); });
  btnGoLive.addEventListener('click', goLive);

})();
