/* ===========================================================================
   Ceart nó Mícheart?  —  a judgement / verification game
   Pupil sees an Irish place-name + a "proof" (a flag, county colours, or an
   English name) and decides: do they name the SAME place?  Ceart / Mícheart.
   One verb the rest of the Irish set doesn't use: "do these agree?" not "find the match".
   =========================================================================== */
(function () {
  'use strict';

  /* ---------- tag the data with a type, build an id lookup ---------- */
  COUNTRIES.forEach(function (p) { p.type = 'country'; });
  COUNTIES.forEach(function (p) { p.type = 'county'; });
  var BY_ID = {};
  COUNTRIES.concat(COUNTIES).forEach(function (p) { BY_ID[p.slug] = p; });

  /* dev guard: catch any future county whose colour-pair twins another county but was
     left in a different cluster (would make an unfair/ambiguous "wrong" card). */
  (function () {
    var seen = {};
    COUNTIES.forEach(function (c) {
      var k = [c.c1.toLowerCase(), c.c2.toLowerCase()].sort().join('|');
      if (seen[k] && seen[k] !== c.cluster) console.warn('[ceart] colour-twin counties in different clusters:', k, seen[k], c.cluster);
      seen[k] = c.cluster;
    });
  })();

  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var autoPlayTimer = null;   /* handle for the per-card auto-play, cleared when the card changes */

  /* ---------- audio: Web-Audio chimes + Róisín's recordings ---------- */
  var actx = null;
  function getCtx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } return actx; }
  function resumeCtx() { var c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(function () {}); }
  function tone(freq, dur, type, vol) {
    var c = getCtx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vol || 0.1, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (dur || 0.1));
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + (dur || 0.1) + 0.02);
  }
  function chimeRight() { tone(660, 0.10, 'sine', 0.13); setTimeout(function () { tone(990, 0.14, 'sine', 0.12); }, 80); }
  function chimeWrong() { tone(196, 0.20, 'triangle', 0.10); }
  function fanfare() { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { setTimeout(function () { tone(f, 0.5, 'sine', 0.12); }, i * 120); }); }

  var audioEl = new Audio(); audioEl.preload = 'auto';
  var curSpeaker = null;
  function setPlaying(on) { if (curSpeaker) curSpeaker.classList.toggle('playing', !!on); }
  function playName(slug, speakerEl) {
    resumeCtx();
    curSpeaker = speakerEl || curSpeaker;
    try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) {}
    audioEl.src = AUDIO_DIR + slug + '.m4a';
    setPlaying(true);
    var p = audioEl.play();
    if (p && p.catch) p.catch(function () { setPlaying(false); });
  }
  audioEl.addEventListener('ended', function () { setPlaying(false); });
  audioEl.addEventListener('error', function () { setPlaying(false); });

  /* ---------- helpers ---------- */
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function choice(a) { return a[Math.floor(Math.random() * a.length)]; }
  function balancedBools(n) { var arr = []; var t = Math.round(n / 2); for (var i = 0; i < n; i++) arr.push(i < t); return shuffle(arr); }

  /* ---------- emblem markup ---------- */
  function flagImg(place, alt) {
    return '<img src="' + FLAG_DIR + place.flag + '" alt="' + (alt || '') + '" draggable="false" />';
  }
  function coloursDiv(place) {
    /* 'v' = vertical halves (90deg → c1 hoist/left, c2 fly/right); 'h' = horizontal (c1 top, c2 bottom) */
    var angle = place.orient === 'h' ? '180deg' : '90deg';
    return '<div class="cm-emblem-colours" style="background:linear-gradient(' +
      angle + ',' + place.c1 + ' 0 50%,' + place.c2 + ' 50% 100%)"></div>';
  }
  /* the native emblem of a place (used on the wall + recap, which are post-answer so it is
     safe to name them; the LIVE card proof stays unlabelled so it can't leak the verdict) */
  function nativeEmblem(place) {
    return place.type === 'country' ? flagImg(place, 'Bratach ' + place.english) : coloursDiv(place);
  }

  /* ---------- distractor (for "wrong" cards) ---------- */
  function pickDistractor(subject, proofType) {
    var pool;
    if (proofType === 'flag') {
      pool = (subject.confuse || []).map(function (id) { return BY_ID[id]; })
        .filter(function (p) { return p && p !== subject && p.type === 'country'; });
      if (!pool.length) pool = COUNTRIES.filter(function (p) { return p !== subject; });
    } else if (proofType === 'colours') {
      pool = COUNTIES.filter(function (p) { return p !== subject && p.cluster !== subject.cluster; });
    } else { /* english */
      var same = subject.type === 'country' ? COUNTRIES : COUNTIES;
      pool = same.filter(function (p) { return p !== subject; });
    }
    return choice(pool);
  }

  function makeCard(subject, proofType, isMatch) {
    return { subject: subject, proofType: proofType, isMatch: isMatch,
      proofPlace: isMatch ? subject : pickDistractor(subject, proofType) };
  }

  /* ---------- deck builders ---------- */
  function buildDeck(kind) {
    var specs = []; /* [subject, proofType] */
    if (kind === 'tiortha') {
      COUNTRIES.forEach(function (c) { specs.push([c, 'flag']); });
    } else if (kind === 'contaetha') {
      COUNTIES.forEach(function (c) { specs.push([c, 'colours']); });
    } else { /* measctha */
      shuffle(COUNTRIES.slice()).slice(0, 6).forEach(function (c) { specs.push([c, 'flag']); });
      shuffle(COUNTIES.slice()).slice(0, 6).forEach(function (c) { specs.push([c, 'colours']); });
      shuffle(COUNTRIES.concat(COUNTIES)).slice(0, 6).forEach(function (c) { specs.push([c, 'english']); });
    }
    var bools = balancedBools(specs.length);
    var deck = specs.map(function (s, i) { return makeCard(s[0], s[1], bools[i]); });
    return shuffle(deck);
  }

  /* ---------- state ---------- */
  var S = null;
  function newState(kind) {
    return { kind: kind, deck: buildDeck(kind), i: 0, score: 0, lives: 3,
      streak: 0, maxStreak: 0, missed: [], correct: 0, locked: false };
  }

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var scrStart = $('start'), scrGame = $('game'), scrEnd = $('end');
  var stage = $('stage'), wall = $('wall');
  var zoneCeart = $('zone-ceart'), zoneMi = $('zone-mi');
  var elLives = $('lives'), elStreak = $('streak'), elStreakN = $('streak-n'),
      elScore = $('score'), elProgNow = $('prog-now'), elProgTot = $('prog-tot');
  var toast = $('toast');
  var srStatus = $('sr-status');   /* assertive live region: announces the full verdict to screen readers */

  function show(screen) {
    [scrStart, scrGame, scrEnd].forEach(function (s) { s.hidden = (s !== screen); });
  }

  /* ---------- wall ---------- */
  function uniqueSubjects(deck) {
    var seen = {}, out = [];
    deck.forEach(function (c) { if (!seen[c.subject.slug]) { seen[c.subject.slug] = 1; out.push(c.subject); } });
    /* countries first, then counties, for a tidy wall */
    return out.sort(function (a, b) { return (a.type === b.type) ? 0 : (a.type === 'country' ? -1 : 1); });
  }
  function buildWall() {
    wall.innerHTML = '';
    uniqueSubjects(S.deck).forEach(function (p) {
      var slot = document.createElement('div');
      slot.className = 'cm-slot';
      slot.dataset.slug = p.slug;
      slot.title = p.irish + ' — ' + p.english;
      slot.innerHTML = '<div class="cm-slot-fill">' + nativeEmblem(p) + '</div>';
      wall.appendChild(slot);
    });
  }
  function litSlot(slug) {
    var slot = wall.querySelector('.cm-slot[data-slug="' + slug + '"]');
    if (slot && !slot.classList.contains('lit')) { slot.classList.add('lit', 'justlit'); }
  }

  /* ---------- HUD ---------- */
  function renderHud() {
    var h = '';
    for (var i = 0; i < 3; i++) h += '<span class="' + (i < S.lives ? '' : 'heart-lost') + '">❤️</span>';
    elLives.innerHTML = h;
    elStreakN.textContent = S.streak;
    elStreak.classList.toggle('hot', S.streak >= 3);
    elScore.textContent = S.score;
    elProgNow.textContent = Math.min(S.i + 1, S.deck.length);
    elProgTot.textContent = S.deck.length;
  }

  /* ---------- card render ---------- */
  var KIND_LABEL = { flag: 'Tír &middot; bratach', colours: 'Contae &middot; dathanna', english: 'Gaeilge &rarr; Béarla' };
  function proofMarkup(card) {
    if (card.proofType === 'flag') return '<div class="cm-emblem is-flag">' + flagImg(card.proofPlace) + '</div>';
    if (card.proofType === 'colours') return '<div class="cm-emblem">' + coloursDiv(card.proofPlace) + '</div>';
    return '<div class="cm-emblem cm-emblem-eng"><span class="cm-eng-tag">Béarla</span>' +
           '<span class="cm-eng-word">' + card.proofPlace.english + '</span></div>';
  }

  function renderCard() {
    var card = S.deck[S.i];
    S.locked = false;
    clearTimeout(autoPlayTimer);
    stage.innerHTML = '';
    stage.style.minHeight = '';
    var el = document.createElement('div');
    el.className = 'cm-card';
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Cárta: ' + card.subject.irish + '. An bhfuil an cárta seo ceart?');
    el.innerHTML =
      '<div class="cm-card-kind">' + KIND_LABEL[card.proofType] + '</div>' +
      proofMarkup(card) +
      '<div class="cm-card-name">' +
        '<span class="cm-name-text">' + card.subject.irish + '</span>' +
        '<button class="cm-speaker" type="button" aria-label="Seinn an t-ainm">🔊</button>' +
      '</div>';
    stage.appendChild(el);

    var spk = el.querySelector('.cm-speaker');
    spk.addEventListener('click', function (e) { e.stopPropagation(); playName(card.subject.slug, spk); });
    attachDrag(el, card);
    renderHud();
    /* auto-play the spoken name (best effort; unlocked by the deck-button tap) */
    autoPlayTimer = setTimeout(function () { playName(card.subject.slug, spk); }, 280);
  }

  /* ---------- commit a verdict ---------- */
  function commit(verdict) {
    if (!S || S.locked || scrGame.hidden) return;
    S.locked = true;                       /* set first: no DOM work between check and set, so no double-commit */
    clearTimeout(autoPlayTimer);
    var card = S.deck[S.i];
    var saidCeart = verdict === 'ceart';
    var right = (saidCeart === card.isMatch);

    var el = stage.querySelector('.cm-card');
    var subj = card.subject, proof = card.proofPlace;
    var verdictHtml, vClass, toastTxt, toastClass;

    if (right) {
      S.correct++; S.streak++; S.maxStreak = Math.max(S.maxStreak, S.streak);
      S.score += 10 + Math.min(S.streak - 1, 5) * 2;
      chimeRight();
      if (el) el.classList.add('result-ceart');
      litSlot(subj.slug);
      vClass = 'good';
      if (card.isMatch) {
        verdictHtml = 'Ceart! <strong>' + subj.irish + '</strong> &mdash; ' + subj.english + '.';
      } else {
        verdictHtml = 'Ceart! Lipéad mícheart &mdash; sin <strong>' + proof.irish + '</strong> (' + proof.english + ').';
      }
      toastTxt = choice(['Maith thú!', 'Ar fheabhas!', 'Go díreach!', 'Hurá!']);
      toastClass = 'good';
    } else {
      S.streak = 0; S.lives--;
      chimeWrong();
      if (el) { el.classList.add('result-mi', 'shake'); }
      S.missed.push(subj);
      vClass = 'bad';
      if (card.isMatch) {
        verdictHtml = 'Ó! Bhí siad ag teacht le chéile: <strong>' + subj.irish + '</strong> = ' + subj.english + '.';
      } else {
        verdictHtml = 'Ní raibh. Sin <strong>' + proof.irish + '</strong> (' + proof.english + ') &mdash; bhí an lipéad mícheart.';
      }
      toastTxt = 'Mícheart';
      toastClass = 'bad';
    }

    if (el) {
      var v = document.createElement('div');
      v.className = 'cm-card-verdict ' + vClass;
      v.innerHTML = verdictHtml;
      el.appendChild(v);
    }
    showToast(toastTxt, toastClass);
    if (srStatus) { var tmp = document.createElement('div'); tmp.innerHTML = verdictHtml; srStatus.textContent = toastTxt + '. ' + tmp.textContent; }
    renderHud();

    var delay = right ? 1050 : 1900;
    setTimeout(next, delay);
  }

  function next() {
    hideToast();
    S.i++;
    if (S.lives <= 0 || S.i >= S.deck.length) { endGame(); return; }
    renderCard();
  }

  /* ---------- toast ---------- */
  var toastT = null;
  function showToast(txt, cls) {
    toast.textContent = txt;
    toast.className = 'cm-toast ' + (cls || '');
    toast.hidden = false;
  }
  function hideToast() { toast.hidden = true; }

  /* ---------- end ---------- */
  function endGame() {
    show(scrEnd);
    var total = S.deck.length;
    var pct = S.correct / total;
    var completed = S.lives > 0;
    var stars = completed ? (pct >= 0.95 ? 3 : pct >= 0.7 ? 2 : 1) : (pct >= 0.6 ? 1 : 0);
    $('end-stars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
    var title;
    if (!completed) title = 'Tá na croíthe imithe — bain triail eile as!';
    else if (S.missed.length === 0) title = 'Foirfe! Gaiscíoch an taispeántais!';
    else if (stars === 3) title = 'Ar fheabhas ar fad!';
    else if (stars === 2) title = 'Maith thú!';
    else title = 'Dul chun cinn maith — lean ort!';
    $('end-title').textContent = title;
    $('end-score').textContent = S.score;
    $('end-streak').textContent = S.maxStreak;

    var recap = $('end-recap');
    if (S.missed.length === 0) {
      recap.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted);margin:0">Níor chaill tú ceann ar bith. Sárobair!</p>';
    } else {
      var seen = {};
      recap.innerHTML = '<p style="grid-column:1/-1;margin:0 0 4px;font-weight:700;color:var(--ols-blue)">Foghlaim na cinn seo:</p>';
      S.missed.forEach(function (p) {
        if (seen[p.slug]) return; seen[p.slug] = 1;
        var item = document.createElement('div');
        item.className = 'cm-recap-item';
        item.innerHTML =
          '<span class="cm-recap-emblem">' + nativeEmblem(p) + '</span>' +
          '<span class="cm-recap-text"><b>' + p.irish + '</b><span>' + p.english + '</span></span>' +
          '<button class="cm-recap-play" type="button" aria-label="Seinn ' + p.english + '">🔊</button>';
        item.querySelector('.cm-recap-play').addEventListener('click', function () { playName(p.slug); });
        recap.appendChild(item);
      });
    }
    if (completed && stars >= 2) { fanfare(); if (!REDUCED) confetti(); }
  }

  /* ===========================================================================
     Drag engine  (Pointer Events — mouse / touch / pen, one code path)
     Card lifts to position:fixed and tracks the pointer 1:1; release over a
     verdict zone commits.  Document-level move/up so the stream is never lost.
     =========================================================================== */
  function zoneUnder(x, y) {
    var els = document.elementsFromPoint(x, y) || [];
    for (var i = 0; i < els.length; i++) {
      var z = els[i].closest && els[i].closest('.cm-zone');
      if (z) return z;
    }
    return null;
  }
  function armZone(z) {
    zoneCeart.classList.toggle('armed', z === zoneCeart);
    zoneMi.classList.toggle('armed', z === zoneMi);
  }
  /* return a lifted card to its in-flow position (clears all drag styling) */
  function unlift(card) {
    card.classList.remove('dragging');
    card.style.position = ''; card.style.left = ''; card.style.top = '';
    card.style.width = ''; card.style.margin = ''; card.style.zIndex = '';
    card.style.transform = ''; card.style.pointerEvents = '';
    stage.style.minHeight = '';
  }

  function attachDrag(card, model) {
    var st = { id: null, sx: 0, sy: 0, moved: false, lastX: 0, lastY: 0, raf: 0 };

    card.addEventListener('pointerdown', function (e) {
      if (S.locked || st.id !== null) return;
      if (e.target.closest('.cm-speaker')) return;          /* let the speaker button work */
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
        stage.style.minHeight = stage.getBoundingClientRect().height + 'px';  /* freeze flow so the zones below don't shift up mid-drag (mobile) */
        var r = card.getBoundingClientRect();
        card.style.position = 'fixed';
        card.style.left = r.left + 'px'; card.style.top = r.top + 'px';
        card.style.width = r.width + 'px'; card.style.margin = '0';
        card.style.zIndex = '1000'; card.style.pointerEvents = 'none';
        card.classList.add('dragging');
        document.body.classList.add('dragging-active');
        /* gesture is tracked via document-level listeners (below), which never lose the
           event stream — no setPointerCapture needed (and capture + pointer-events:none
           can fire a spurious lostpointercapture that would strand the card). */
        st.sx = e.clientX; st.sy = e.clientY;
      }
      st.lastX = e.clientX; st.lastY = e.clientY;
      card.style.transform = 'translate3d(' + (e.clientX - st.sx) + 'px,' + (e.clientY - st.sy) + 'px,0) rotate(' +
        Math.max(-7, Math.min(7, (e.clientX - st.sx) / 22)) + 'deg)';
      if (!st.raf) st.raf = requestAnimationFrame(frame);
    }
    function frame() {
      st.raf = 0;
      armZone(zoneUnder(st.lastX, st.lastY));
      autoEdgeScroll(st.lastY);
    }

    function onUp(e) {
      if (st.id !== e.pointerId) return;
      st.id = null;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
      document.body.classList.remove('dragging-active');
      if (!st.moved) {                      /* a tap — replay the name */
        playName(model.subject.slug, card.querySelector('.cm-speaker'));
        return;
      }
      var z = (e.type === 'pointercancel') ? null : zoneUnder(st.lastX, st.lastY);
      armZone(null);
      unlift(card);                          /* settle the card back to centre first, then judge */
      if (z === zoneCeart) { commit('ceart'); return; }
      if (z === zoneMi) { commit('mi'); return; }
      /* released over nothing → already settled back to centre */
      card.classList.add('snap-back');
      setTimeout(function () { card.classList.remove('snap-back'); }, 300);
    }
  }

  /* gentle edge auto-scroll so off-screen zones stay reachable mid-drag on phones */
  function autoEdgeScroll(y) {
    var m = 80, h = window.innerHeight;
    if (y > h - m) window.scrollBy({ top: Math.min(18, (y - (h - m))), behavior: 'instant' in window ? 'instant' : 'auto' });
    else if (y < m) window.scrollBy({ top: -Math.min(18, (m - y)), behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  /* ---------- confetti (lightweight canvas) ---------- */
  function confetti() {
    var c = document.createElement('canvas'); c.id = 'cm-confetti';
    document.body.appendChild(c);
    var ctx = c.getContext('2d'), W, H;
    function size() { W = c.width = innerWidth; H = c.height = innerHeight; }
    size();
    var cols = ['#E4B824', '#1A3A6B', '#1F9D55', '#E07A1F', '#6CADDF', '#ffffff'];
    var P = [];
    for (var i = 0; i < 140; i++) P.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.4,
      r: 4 + Math.random() * 6, c: choice(cols), vy: 2 + Math.random() * 4, vx: -2 + Math.random() * 4,
      a: Math.random() * Math.PI, va: -0.2 + Math.random() * 0.4 });
    var t0 = performance.now();
    (function loop(t) {
      ctx.clearRect(0, 0, W, H);
      P.forEach(function (p) {
        p.y += p.vy; p.x += p.vx; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6); ctx.restore();
      });
      if (t - t0 < 2600) requestAnimationFrame(loop);
      else c.remove();
    })(t0);
  }

  /* ---------- wiring ---------- */
  function startGame(kind) {
    resumeCtx();
    S = newState(kind);
    buildWall();
    show(scrGame);
    renderCard();
  }

  Array.prototype.forEach.call(document.querySelectorAll('.cm-deck-btn'), function (b) {
    b.addEventListener('click', function () { startGame(b.dataset.deck); });
  });
  zoneCeart.addEventListener('click', function () { commit('ceart'); });
  zoneMi.addEventListener('click', function () { commit('mi'); });
  $('btn-home').addEventListener('click', function () { show(scrStart); });
  $('btn-again').addEventListener('click', function () { startGame(S.kind); });
  $('btn-menu').addEventListener('click', function () { show(scrStart); });

  document.addEventListener('keydown', function (e) {
    if (scrGame.hidden) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); commit('ceart'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); commit('mi'); }
  });

})();
