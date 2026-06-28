/* ============================================================
   Bóthar na Mothúchán — The Feelings Road
   Mothúcháin · J2 Irish · OLS Digital Skills

   Walk a road; at each stop read the friend's feeling (OpenMoji
   face + disambiguating prop), hear the teacher's word, and commit
   the right "Tá ___ orm". Decoys are the confusable neighbours, so
   the prop must be read. 3 hearts, checkpoints every 5 stops.
   ============================================================ */
(function () {
  'use strict';

  const byId = (id) => document.getElementById(id);
  function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const bySlug = (s) => FEELINGS.find((f) => f.slug === s);

  /* ---------- audio ---------- */
  const audioEl = new Audio(); audioEl.preload = 'auto';
  let audioWarned = false;
  function audioNotice() {
    if (audioWarned) return; audioWarned = true;
    const b = el('div', 'audio-banner'); b.setAttribute('role', 'alert');
    b.innerHTML = 'Ní féidir an fhuaim a sheinm ar an ghléas seo &mdash; bain triail as Chrome nó Edge. &middot; Audio will not play on this device — try Chrome or Edge.';
    document.body.appendChild(b);
  }
  function playFile(src) { resumeCtx(); try { audioEl.pause(); audioEl.currentTime = 0; } catch (_) {} audioEl.src = src; const p = audioEl.play(); if (p && p.catch) p.catch(() => {}); }
  function playWord(slug) {
    speechPulse();
    playFile(AUDIO_DIR + slug + '.m4a');
  }
  audioEl.addEventListener('error', audioNotice);

  /* ---------- chimes ---------- */
  let actx = null;
  function getCtx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } } return actx; }
  function resumeCtx() { const c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
  function tone(f, d, t, v) { const c = getCtx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = t || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(v || 0.1, c.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (d || 0.1)); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + (d || 0.1) + 0.02); }
  function chimeRight() { tone(660, 0.1, 'sine', 0.13); setTimeout(() => tone(990, 0.13, 'sine', 0.11), 80); }
  function chimeWrong() { tone(196, 0.18, 'triangle', 0.1); }
  function chimeHeart() { tone(140, 0.22, 'sawtooth', 0.07); }
  function fanfare() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => tone(f, 0.5, 'sine', 0.12), i * 120)); }

  /* ---------- refs ---------- */
  const startPanel = byId('start-panel'), play = byId('play'), endPanel = byId('end-panel');
  const sceneEl = byId('scene'), sceneryEl = byId('scenery');
  const heartsEl = byId('hearts'), stopNumEl = byId('stop-num'), scoreEl = byId('score'), scoreNEl = byId('score-n');
  const charCard = byId('char-card'), charArt = byId('char-art'), charCap = byId('char-cap');
  const chipsEl = byId('chips'), commitBtn = byId('commit-btn'), hintBtn = byId('hint-btn'), hintCost = byId('hint-cost');
  const feedbackEl = byId('feedback'), speechEl = byId('speech');

  const N = FEELINGS.length, MAX_PTS = N * 2;
  const state = { order: [], idx: 0, hearts: START_HEARTS, streak: 0, selected: null, locked: false, checkpoint: 0, stopPoints: {}, hintUsed: false, attempt: 0 };
  let gameGen = 0, confettiRAF = null;

  /* ---------- scene helpers ---------- */
  function speechPulse() { speechEl.classList.remove('pulse'); void speechEl.offsetWidth; speechEl.classList.add('pulse'); }
  function buildScenery() {
    sceneryEl.innerHTML = '';
    for (let i = 0; i < N + 3; i++) { const im = el('img'); im.src = IMG + SCENERY[i % SCENERY.length] + '.png'; im.alt = ''; sceneryEl.appendChild(im); }
  }
  function setSky(idx) { sceneEl.style.setProperty('--p', (idx / (N - 1)).toFixed(3)); }
  function setScroll(idx) { sceneryEl.style.setProperty('--scroll', String(idx * 132)); }
  function renderHearts() {
    heartsEl.innerHTML = '';
    for (let i = 0; i < START_HEARTS; i++) { const im = el('img'); im.src = IMG + 'scene-heart.png'; im.alt = i === 0 ? 'croíthe' : ''; if (i >= state.hearts) im.className = 'lost'; heartsEl.appendChild(im); }
  }
  function setScore() {
    var total = Object.keys(state.stopPoints).reduce(function (a, k) { return a + state.stopPoints[k]; }, 0);
    scoreNEl.textContent = String(total);
    return total;
  }

  /* ---------- feedback ---------- */
  function feedback(msg, en, kind) { feedbackEl.className = 'feedback' + (kind ? ' ' + kind : ''); feedbackEl.innerHTML = msg + (en ? '<span class="fb-en">' + en + '</span>' : ''); }
  function clearFeedback() { feedbackEl.className = 'feedback'; feedbackEl.innerHTML = ''; }

  /* ---------- card art ---------- */
  function renderArt(f, resolved) {
    charArt.innerHTML = '';
    const face = el('img', 'face' + (resolved ? '' : ''));
    face.src = IMG + (resolved ? RESOLVED_FACE : f.face); face.alt = '';
    charArt.appendChild(face);
    if (!resolved) (f.props || []).forEach((p) => { const im = el('img', 'prop ' + (p.cls || 'p-side')); im.src = IMG + p.n + '.png'; im.alt = ''; charArt.appendChild(im); });
    return face;
  }

  /* ---------- flow ---------- */
  function startGame() {
    resumeCtx();
    gameGen++;
    if (confettiRAF) { cancelAnimationFrame(confettiRAF); confettiRAF = null; }
    state.order = shuffle(FEELINGS);
    state.idx = 0; state.hearts = START_HEARTS; state.streak = 0; state.checkpoint = 0; state.stopPoints = {}; state.hintUsed = false;
    startPanel.hidden = true; endPanel.hidden = true; play.hidden = false;
    buildScenery();
    renderHearts(); setScore();
    renderStop();
  }

  function renderStop() {
    state.locked = false; state.selected = null; state.attempt = 0;
    clearFeedback();
    const f = state.order[state.idx];
    charCard.style.setProperty('--tint', f.tint);
    renderArt(f, false);
    charCap.textContent = f.cap.ga + ' · ' + f.cap.en;
    stopNumEl.textContent = String(state.idx + 1);
    setSky(state.idx); setScroll(state.idx);
    renderHearts(); setScore();
    // walk-in animation
    charCard.classList.remove('leave'); charCard.classList.add('enter');
    byId('walker').classList.remove('stride'); void byId('walker').offsetWidth; byId('walker').classList.add('stride');

    // chips: target + its 4 confusable decoys
    const pool = [f.slug].concat(f.decoys.filter((s) => s !== f.slug));
    // pad to 5 with random others if a decoy list is short
    FEELINGS.forEach((x) => { if (pool.length < 5 && pool.indexOf(x.slug) < 0) pool.push(x.slug); });
    const chipSlugs = shuffle(pool.slice(0, 5));
    chipsEl.innerHTML = '';
    chipSlugs.forEach((slug) => {
      const v = bySlug(slug);
      const b = el('button', 'chip'); b.type = 'button'; b.dataset.slug = slug;
      b.innerHTML = FRAME_GA.replace('@', '<strong>' + v.ga + '</strong>');
      b.setAttribute('aria-label', 'Tá ' + v.ga + ' orm — ' + v.en);
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => selectChip(b));
      chipsEl.appendChild(b);
    });
    commitBtn.disabled = true;
    // reset the hint for this stop — the word does NOT auto-play any more; it is an
    // opt-in hint (costs a point) and is replayed free on a correct answer.
    state.hintUsed = false;
    hintBtn.classList.remove('used', 'playing'); hintBtn.disabled = false; hintCost.textContent = '−1';
    const gen = gameGen;
    setTimeout(() => { if (gen === gameGen) { var c = chipsEl.querySelector('.chip'); if (c) c.focus(); } }, 360);
  }

  function selectChip(btn) {
    if (state.locked) return;
    if (btn.disabled) return;
    chipsEl.querySelectorAll('.chip').forEach((c) => { c.classList.remove('sel'); c.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('sel'); btn.setAttribute('aria-pressed', 'true');
    state.selected = btn.dataset.slug;
    commitBtn.disabled = false;
  }

  function commit() {
    if (state.locked || !state.selected) return;
    const f = state.order[state.idx];
    const chosen = state.selected;
    const btn = chipsEl.querySelector('.chip[data-slug="' + chosen + '"]');
    state.attempt++;
    if (chosen === f.slug) {
      state.locked = true;
      if (btn) btn.classList.add('correct');
      chipsEl.querySelectorAll('.chip').forEach((c) => c.disabled = true);
      commitBtn.disabled = true;
      chimeRight();
      // transform: resolved face + props fly off + confetti in tint
      charArt.querySelectorAll('.prop').forEach((p) => p.classList.add('gone'));
      const face = charArt.querySelector('.face'); if (face) { face.src = IMG + RESOLVED_FACE; face.classList.add('swap'); }
      confetti(f.tint);
      hintBtn.disabled = true;
      var awarded = state.hintUsed ? 1 : 2;          // 2 pts solved from the picture, 1 if the hint was used
      state.stopPoints[f.slug] = awarded;
      var clean = !state.hintUsed && state.attempt === 1;
      state.streak = clean ? state.streak + 1 : 0;
      setScore();
      const gen = gameGen;
      setTimeout(() => { if (gen === gameGen) playWord(f.slug); }, 280); // reinforce: the word ALWAYS plays on a correct answer
      var streakTxt = state.streak >= 3 ? ' 🔥' + state.streak : '';
      feedback('✅ Tá an ceart agat! ' + f.ga + ' (+' + awarded + ')' + streakTxt,
        awarded === 2 ? 'Yes — that’s "' + f.en + '". Two points!' : 'Yes — that’s "' + f.en + '". One point — you used a hint. Walk on!', 'good');
      advance();
    } else {
      // wrong: lose a heart, stay on the stop, must re-listen
      if (btn) { btn.classList.add('wrong'); btn.disabled = true; }
      chimeWrong();
      state.hearts--; state.streak = 0; renderHearts();
      setTimeout(chimeHeart, 120);
      state.selected = null; commitBtn.disabled = true;
      if (state.hearts <= 0) { toCheckpoint(); return; }
      feedback('❌ Ní hé sin é — éist arís! 🔊', 'Not that one — read the picture and try again. ' + state.hearts + ' hearts left.', 'bad');
    }
  }

  function advance() {
    const gen = gameGen;
    charCard.classList.add('leave');
    setTimeout(() => {
      if (gen !== gameGen) return;
      state.idx++;
      if (state.idx % CHECKPOINT_EVERY === 0 && state.idx < N) state.checkpoint = state.idx;
      if (state.idx >= N) { endGame(); return; }
      renderStop();
    }, 1500);
  }

  function toCheckpoint() {
    state.locked = true;
    feedback('💔 Tá na croíthe caillte agat — ar ais go dtí an seicphointe.', 'Out of hearts — back to the last checkpoint. Listen carefully!', 'bad');
    const gen = gameGen;
    setTimeout(() => {
      if (gen !== gameGen) return;
      // clear points for the stops being replayed, so the score can't inflate
      state.order.slice(state.checkpoint).forEach((f) => { delete state.stopPoints[f.slug]; });
      state.idx = state.checkpoint; state.hearts = START_HEARTS; state.streak = 0;
      setScore();
      renderStop();
    }, 1700);
  }

  /* ---------- end ---------- */
  function endGame() {
    play.hidden = true; endPanel.hidden = false;
    const total = setScore();
    const noHint = Object.keys(state.stopPoints).filter((k) => state.stopPoints[k] === 2).length;
    byId('cert-score').textContent = total + ' / ' + MAX_PTS + ' pointe · points';
    const pct = total / MAX_PTS, stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
    byId('cert-stars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
    byId('end-h').textContent = stars === 3 ? 'Sármhaith! 🌟' : 'Maith thú!';
    byId('cert-sub').textContent = 'Gan leid ar bith ar ' + noHint + ' as ' + N + ' · solved ' + noHint + ' of ' + N + ' with no hint.';
    // review board: all 15 feelings, tap to replay the teacher
    const list = byId('review-list'); list.innerHTML = '';
    FEELINGS.slice().sort((a, b) => a.en.localeCompare(b.en)).forEach((f) => {
      const it = el('button', 'rev-item'); it.type = 'button';
      it.setAttribute('aria-label', 'Éist le ' + f.ga + ' · listen to ' + f.en);
      it.innerHTML = '<img src="' + IMG + f.face + '" alt=""><span class="rev-ga">' + f.ga + '</span><span class="rev-en">' + f.en + '</span>';
      it.addEventListener('click', () => playFile(AUDIO_DIR + f.slug + '.m4a'));
      list.appendChild(it);
    });
    if (stars >= 2) { fanfare(); confetti('#E4B824'); }
    byId('end-h').focus();
  }

  /* ---------- confetti ---------- */
  function confetti(colour) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    if (confettiRAF) { cancelAnimationFrame(confettiRAF); confettiRAF = null; }
    let cv = byId('confetti'); if (!cv) { cv = el('canvas'); cv.id = 'confetti'; document.body.appendChild(cv); }
    const ctx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
    const cols = [colour || '#E4B824', '#1A3A6B', '#2FA060', '#F08A7E', '#57C7B4', '#6B79E0'];
    const ps = []; for (let i = 0; i < 130; i++) ps.push({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.4, r: 4 + Math.random() * 6, c: cols[i % cols.length], vy: 2 + Math.random() * 3.5, vx: -1.5 + Math.random() * 3, a: Math.random() * 6.28, va: -0.2 + Math.random() * 0.4 });
    let frames = 0;
    (function loop() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => { p.y += p.vy; p.x += p.vx; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6); ctx.restore(); });
      frames++;
      if (frames < 220) confettiRAF = requestAnimationFrame(loop); else { ctx.clearRect(0, 0, cv.width, cv.height); confettiRAF = null; }
    })();
  }

  /* ---------- events ---------- */
  byId('start-btn').addEventListener('click', startGame);
  byId('again-btn').addEventListener('click', startGame);
  commitBtn.addEventListener('click', commit);
  hintBtn.addEventListener('click', () => {
    const f = state.order[state.idx];
    if (!f || state.locked) return;
    if (!state.hintUsed) { state.hintUsed = true; hintBtn.classList.add('used'); hintCost.textContent = '✓'; } // first use spends the point; later taps replay free
    playWord(f.slug);
    hintBtn.classList.add('playing'); setTimeout(() => hintBtn.classList.remove('playing'), 700);
  });
  window.addEventListener('resize', () => { const cv = byId('confetti'); if (cv) { cv.width = innerWidth; cv.height = innerHeight; } });

  // codec probe at load (audio-led activity)
  if (!audioEl.canPlayType('audio/mp4; codecs="mp4a.40.2"') && !audioEl.canPlayType('audio/aac') && !audioEl.canPlayType('audio/mp4')) audioNotice();
})();
