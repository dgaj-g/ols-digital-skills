/* ============================================================
   Dochtúir na bhFuaimeanna — The Sound Doctor
   Na Baill Beatha · J2 Irish · OLS Digital Skills

   Listen to the teacher's recorded word, tap the matching body
   part to heal it. The spoken word is the ONLY signal — nothing
   is shown until AFTER the pupil commits (assessment integrity).
   ============================================================ */
(function () {
  'use strict';

  /* ---------- tiny helpers ---------- */
  const byId = (id) => document.getElementById(id);
  function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const bySlug = (s) => PARTS.find((p) => p.slug === s);

  /* ---------- audio: teacher recordings (single reused element) ---------- */
  const audioEl = new Audio();
  audioEl.preload = 'auto';
  let audioWarned = false;
  function audioNotice() {
    if (audioWarned) return; audioWarned = true;
    const b = el('div', 'audio-banner'); b.id = 'audio-banner'; b.setAttribute('role', 'alert');
    b.innerHTML = 'Ní féidir an fhuaim a sheinm ar an ngléas seo &mdash; bain triail as Chrome nó Edge. &middot; Audio will not play on this device — try Chrome or Edge.';
    document.body.appendChild(b);
  }
  function playFile(src) {
    resumeCtx();
    try { audioEl.pause(); audioEl.currentTime = 0; } catch (_) {}
    audioEl.src = src;
    const p = audioEl.play();
    if (p && p.catch) p.catch(() => {});
  }
  function playWord(slug) {
    setSpeaking(true);
    playFile(AUDIO_DIR + slug + '.m4a');
  }
  audioEl.addEventListener('ended', () => setSpeaking(false));
  audioEl.addEventListener('error', () => { setSpeaking(false); audioNotice(); });

  /* ---------- Web Audio synth chimes (distinct from speech) ---------- */
  let actx = null;
  function getCtx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } } return actx; }
  function resumeCtx() { const c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
  function tone(freq, dur, type, vol) {
    const c = getCtx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vol || 0.1, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (dur || 0.1));
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + (dur || 0.1) + 0.02);
  }
  function chimeRight() { tone(660, 0.10, 'sine', 0.13); setTimeout(() => tone(990, 0.13, 'sine', 0.11), 80); }
  function chimeWrong() { tone(196, 0.18, 'triangle', 0.10); }
  function chimeOuch() { tone(320, 0.10, 'sawtooth', 0.06); setTimeout(() => tone(240, 0.14, 'triangle', 0.07), 70); }
  function fanfare() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => tone(f, 0.5, 'sine', 0.12), i * 120)); }

  /* ---------- DOM refs ---------- */
  const svg = byId('patient');
  const frontG = byId('figure-front');
  const backG = byId('figure-back');
  const startPanel = byId('start-panel');
  const playArea = byId('play');
  const endPanel = byId('end-panel');
  const promptBubble = byId('prompt-bubble');
  const promptOuch = byId('prompt-ouch');
  const wardNEl = byId('ward-n');
  const wardSubEl = byId('ward-sub');
  const dotsEl = byId('ward-dots');
  const curesEl = byId('cures');
  const feedbackEl = byId('feedback');
  const replayBtn = byId('replay-btn');
  const flipBtn = byId('flip-btn');
  const helpBtn = byId('help-btn');
  const scaffoldEl = byId('scaffold');
  const revealTag = byId('reveal-tag');
  const wordFlash = byId('word-flash');

  const OUCH = ['Aú…!', 'Úch…!', 'Ó!', 'Á…!', 'Ó, mo bhrón!'];
  const TOTAL = PARTS.length;

  let dotMap = {};       // slug -> dot element (no answer-leaking data-slug in the DOM)
  let flashTimer = null;
  let confettiRAF = null;
  let gameGen = 0;       // bumped on every (re)start so stale timers bail

  /* ---------- state ---------- */
  const state = {
    wardIdx: 0,
    queue: [],        // remaining parts in current ward (this pass)
    current: null,    // current target part
    attempts: 0,
    cures: 0,
    shownSide: 'front',
    results: {},      // slug -> 'cured' | 'missed'
    locked: false,    // ignore taps during transitions
    helpOn: false,
  };

  /* ---------- camera (viewBox tween) ---------- */
  let camRAF = null;
  function curViewBox() { return svg.getAttribute('viewBox').split(/\s+/).map(Number); }
  function setViewBox(x, y, w, h) { svg.setAttribute('viewBox', x + ' ' + y + ' ' + w + ' ' + h); }
  function tweenTo(z, dur) {
    if (camRAF) cancelAnimationFrame(camRAF);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [x0, y0, w0, h0] = curViewBox();
    const t = { x: z.x, y: z.y, w: z.w, h: z.h };
    if (reduce || !dur) { setViewBox(t.x, t.y, t.w, t.h); return; }
    const start = performance.now();
    function frame(now) {
      let k = Math.min(1, (now - start) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
      setViewBox(x0 + (t.x - x0) * e, y0 + (t.y - y0) * e, w0 + (t.w - w0) * e, h0 + (t.h - h0) * e);
      if (k < 1) camRAF = requestAnimationFrame(frame);
    }
    camRAF = requestAnimationFrame(frame);
  }
  function zoneForCurrent() {
    return state.shownSide === 'back' ? BACK_ZONE : WARDS[state.wardIdx].zone;
  }

  /* ---------- prompt bubble ---------- */
  let speakTimer = null;
  function setSpeaking(on) {
    if (on) {
      promptBubble.classList.add('speaking');
      promptOuch.textContent = OUCH[Math.floor(Math.random() * OUCH.length)];
      clearTimeout(speakTimer);
      speakTimer = setTimeout(() => promptBubble.classList.remove('speaking'), 1600);
    } else {
      promptBubble.classList.remove('speaking');
    }
  }

  /* ---------- feedback ---------- */
  function feedback(msg, en, kind) {
    feedbackEl.className = 'feedback' + (kind ? ' ' + kind : '');
    feedbackEl.innerHTML = msg + (en ? '<span class="fb-en">' + en + '</span>' : '');
  }
  function clearFeedback() { feedbackEl.className = 'feedback'; feedbackEl.innerHTML = ''; }

  const GENERIC_LABEL = 'ball den chorp · a body part';
  function setCures(n) {
    state.cures = n; curesEl.textContent = String(n);
    curesEl.setAttribute('aria-label', n + ' ball leigheasta · ' + n + ' healed');
  }
  function resetPartLabel(g) { g.setAttribute('aria-label', GENERIC_LABEL); }
  function labelPart(slug, kind) { // 'cured' | 'missed' — only ever AFTER the pupil commits
    const g = groupsFor(slug), p = bySlug(slug); if (!g || !p) return;
    g.setAttribute('aria-label', p.ga + ' · ' + p.en + ' — ' + (kind === 'cured' ? 'leigheasta · healed' : 'ar iarraidh · missed'));
  }

  /* ---------- fun centre flash of the Irish word on a correct heal ---------- */
  function flashWord(part) {
    wordFlash.innerHTML = '<span class="wf-spark s1" aria-hidden="true">✨</span>'
      + '<span class="wf-spark s2" aria-hidden="true">⭐</span>'
      + '<span class="wf-spark s3" aria-hidden="true">✨</span>'
      + '<span class="wf-ga">' + part.ga + '</span>'
      + '<span class="wf-en">' + part.en + '</span>';
    wordFlash.hidden = false;
    wordFlash.classList.remove('show', 'show-static');
    void wordFlash.offsetWidth; // restart animation
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    wordFlash.classList.add(reduce ? 'show-static' : 'show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { wordFlash.hidden = true; wordFlash.classList.remove('show', 'show-static'); }, reduce ? 1200 : 1380);
  }

  /* ---------- scaffold (opt-in show-the-word) ---------- */
  function refreshScaffold() {
    if (state.helpOn && state.current) {
      scaffoldEl.hidden = false;
      scaffoldEl.textContent = state.current.ga;
    } else {
      scaffoldEl.hidden = true; scaffoldEl.textContent = '';
    }
  }

  /* ---------- figure side ---------- */
  function showSide(side) {
    state.shownSide = side;
    // NB: the `hidden` IDL property does not reliably hide SVG <g>; use display.
    frontG.removeAttribute('hidden'); backG.removeAttribute('hidden');
    frontG.style.display = side === 'front' ? '' : 'none';
    backG.style.display = side === 'back' ? '' : 'none';
    flipBtn.setAttribute('aria-label', side === 'front'
      ? 'Cas an t-othar thart chun an droim a fheiceáil · turn the patient over to see the back'
      : 'Cas ar ais · turn back to the front');
  }
  function flip() {
    showSide(state.shownSide === 'front' ? 'back' : 'front');
    flipBtn.classList.remove('nudge');
    tweenTo(zoneForCurrent(), 500);
    // re-nudge if still on the wrong side for the current target
    maybeNudgeFlip();
  }
  function maybeNudgeFlip() {
    if (state.current && state.current.side !== state.shownSide) flipBtn.classList.add('nudge');
    else flipBtn.classList.remove('nudge');
  }

  /* ---------- group lookup + sparkle ---------- */
  function groupsFor(slug) {
    const root = state.shownSide === 'back' ? backG : frontG;
    return root.querySelector('.part[data-slug="' + slug + '"]');
  }
  function sparkleOn(groupEl) {
    if (!groupEl) return;
    try {
      const bb = groupEl.getBBox();
      const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      const r = Math.max(bb.width, bb.height) / 2 + 6;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
      c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#F5D45E'); c.setAttribute('stroke-width', '5');
      c.setAttribute('class', 'spark');
      groupEl.parentNode.appendChild(c);
      setTimeout(() => c.remove(), 750);
    } catch (_) {}
  }

  /* ---------- dots (slug kept in JS only — never in the DOM, so the target
       cannot be read from a data attribute before the pupil commits) ---------- */
  function buildDots() {
    dotsEl.innerHTML = ''; dotMap = {};
    PARTS.filter((p) => p.ward === WARDS[state.wardIdx].n).forEach((p) => {
      const d = el('span', 'dot'); dotMap[p.slug] = d; dotsEl.appendChild(d);
    });
  }
  function markDot(slug, cls) {
    const d = dotMap[slug];
    if (d) { d.classList.remove('current'); d.classList.add(cls); }
  }
  function setCurrentDot(slug) {
    Object.values(dotMap).forEach((d) => d.classList.remove('current'));
    const d = dotMap[slug];
    if (d && !d.classList.contains('done') && !d.classList.contains('miss')) d.classList.add('current');
  }

  /* ---------- flow ---------- */
  function startGame() {
    resumeCtx();
    gameGen++;
    if (camRAF) { cancelAnimationFrame(camRAF); camRAF = null; }
    if (confettiRAF) { cancelAnimationFrame(confettiRAF); confettiRAF = null; }
    state.wardIdx = 0; state.results = {};
    state.current = null; state.locked = true; // no taps until the first round opens
    setCures(0);
    startPanel.hidden = true; endPanel.hidden = true; playArea.hidden = false;
    // reset healed styling + per-part labels
    document.querySelectorAll('.part.healed').forEach((g) => { g.classList.remove('healed'); resetPartLabel(g); });
    revealTag.hidden = true; wordFlash.hidden = true; clearTimeout(flashTimer);
    showSide('front');
    setViewBox(OVERVIEW_ZONE.x, OVERVIEW_ZONE.y, OVERVIEW_ZONE.w, OVERVIEW_ZONE.h);
    const gen = gameGen;
    setTimeout(() => { if (gen === gameGen) { beginWard(0); replayBtn.focus(); } }, 350);
  }

  function beginWard(idx) {
    state.wardIdx = idx;
    const ward = WARDS[idx];
    wardNEl.textContent = ward.ga;
    wardSubEl.textContent = ward.en + ' · ' + ward.sub;
    buildDots();
    // flip control only in wards that contain a back part
    const hasBack = PARTS.some((p) => p.ward === ward.n && p.side === 'back');
    flipBtn.hidden = !hasBack;
    showSide('front');
    state.queue = shuffle(PARTS.filter((p) => p.ward === ward.n));
    tweenTo(ward.zone, 650);
    feedback('🏥 ' + ward.ga + ' — ' + ward.en, ward.sub.split(' · ')[1] || '', 'good');
    const gen = gameGen;
    setTimeout(() => { if (gen === gameGen) nextRound(); }, 900);
  }

  function nextRound() {
    if (!state.queue.length) { return endWard(); }
    state.current = state.queue[0];
    state.attempts = 0;
    state.locked = false;
    clearFeedback();
    revealTag.hidden = true;
    setCurrentDot(state.current.slug);
    // always begin a round on the front; back parts are reached by a deliberate
    // "Cas thart" (so flipping never silently telegraphs that a part is on the back).
    if (state.shownSide !== 'front') showSide('front');
    tweenTo(zoneForCurrent(), 450);
    maybeNudgeFlip();
    refreshScaffold();
    setTimeout(() => playWord(state.current.slug), 220);
  }

  function onPick(slug, groupEl) {
    if (state.locked || !state.current) return;
    const target = state.current;

    // tapped an already-resolved region (cured or missed): ignore softly
    if (state.results[slug] === 'cured' || state.results[slug] === 'missed') return;

    // wrong SIDE for a back/front part → ask to flip (no strike)
    if (target.side !== state.shownSide) {
      chimeOuch();
      feedback('🔄 Cas an t-othar thart!', 'Turn the patient over to find this one.', 'bad');
      flipBtn.classList.add('nudge');
      return;
    }

    if (slug === target.slug) { healCurrent(groupEl); return; }

    // wrong tap (correct side)
    state.attempts++;
    if (groupEl) { groupEl.classList.add('wrong-tap'); setTimeout(() => groupEl.classList.remove('wrong-tap'), 420); }
    chimeWrong();
    if (state.attempts >= 2) { missCurrent(); return; }
    // Do NOT name the tapped part — that would let a pupil harvest the answers by
    // mis-tapping. Just redirect them to listen again (auto-replay is suppressed:
    // they must press the stethoscope themselves).
    feedback('❌ Ní hé sin é — éist arís! 🩺', 'Not that one — tap the stethoscope to hear it again, then try once more.', 'bad');
    replayBtn.classList.add('playing'); setTimeout(() => replayBtn.classList.remove('playing'), 800);
  }

  function healCurrent(groupEl) {
    const part = state.current; state.locked = true;
    const g = groupEl || groupsFor(part.slug);
    if (g) { g.classList.add('healed', 'just-healed'); setTimeout(() => g.classList.remove('just-healed'), 600); }
    sparkleOn(g);
    chimeRight();
    state.results[part.slug] = 'cured';
    setCures(state.cures + 1);
    labelPart(part.slug, 'cured');
    markDot(part.slug, 'done');
    flashWord(part);                                   // fun centre reveal (form↔meaning link)
    const gen = gameGen;
    setTimeout(() => { if (gen === gameGen) playFile(AUDIO_DIR + part.slug + '.m4a'); }, 280); // reinforce
    feedback('✅ Go hiontach! ' + part.ga + ' · ' + part.en, 'Healed! Well done, doctor.', 'good');
    advance(1550);
  }

  function missCurrent() {
    const part = state.current; state.locked = true;
    state.results[part.slug] = 'missed';
    markDot(part.slug, 'miss');
    const g = groupsFor(part.slug);
    if (g) { g.classList.add('healed'); sparkleOn(g); } // reveal where it was, as teaching
    labelPart(part.slug, 'missed');
    showReveal(part, false);
    playFile(AUDIO_DIR + part.slug + '.m4a');
    feedback('🩹 ' + part.ga + ' a bhí ann!', 'This was the ' + part.en + '. You will see it again at the end.', 'bad');
    advance(1800);
  }

  function showReveal(part, ok) {
    revealTag.hidden = false;
    revealTag.innerHTML = '<span class="rt-ga">' + part.ga + '</span><span class="rt-en">' + part.en + '</span>';
    revealTag.style.borderColor = '';
  }

  function advance(delay) {
    const gen = gameGen;
    setTimeout(() => {
      if (gen !== gameGen) return; // a restart happened mid-delay — bail
      state.queue.shift();
      revealTag.hidden = true;
      nextRound();
    }, delay);
  }

  function endWard() {
    if (state.wardIdx < WARDS.length - 1) {
      feedback('🎉 Bardán críochnaithe!', 'Ward complete — on to the next!', 'good');
      const gen = gameGen;
      setTimeout(() => { if (gen === gameGen) beginWard(state.wardIdx + 1); }, 1100);
    } else {
      endGame();
    }
  }

  /* ---------- end / certificate ---------- */
  function endGame() {
    playArea.hidden = true; endPanel.hidden = false;
    showSide('front');
    const cured = Object.values(state.results).filter((r) => r === 'cured').length;
    byId('cert-score').textContent = cured + ' / ' + TOTAL + ' ball leigheasta · body parts healed';
    const pct = cured / TOTAL;
    const stars = pct >= 0.95 ? 3 : pct >= 0.75 ? 2 : pct >= 0.4 ? 1 : 0;
    byId('cert-stars').textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
    const title = byId('end-h'), sub = byId('cert-sub');
    if (cured === TOTAL) { title.textContent = 'Dochtúir na Bliana! 🏆'; sub.textContent = 'Foirfe! Leigheas tú gach ball den chorp. · Perfect — you healed every single part!'; }
    else if (pct >= 0.75) { title.textContent = 'Maith thú, a dhochtúir!'; sub.textContent = 'Beagnach ann — cleachtaigh na cinn thíos. · So close — practise the ones below.'; }
    else { title.textContent = 'Dul chun cinn maith!'; sub.textContent = 'Éist arís leis na focail thíos agus bain triail eile as. · Listen again to these and try once more.'; }

    const missed = PARTS.filter((p) => state.results[p.slug] === 'missed');
    const review = byId('review'), list = byId('review-list');
    if (missed.length) {
      review.hidden = false; list.innerHTML = '';
      missed.forEach((p) => {
        const item = el('div', 'rev-item');
        const btn = el('button'); btn.type = 'button'; btn.innerHTML = '<span aria-hidden="true">▶</span>';
        btn.setAttribute('aria-label', 'Éist le ' + p.ga + ' · listen to ' + p.en);
        btn.addEventListener('click', () => playFile(AUDIO_DIR + p.slug + '.m4a'));
        const txt = el('span'); txt.innerHTML = '<span class="rev-ga">' + p.ga + '</span> <span class="rev-en">· ' + p.en + '</span>';
        item.appendChild(btn); item.appendChild(txt); list.appendChild(item);
      });
    } else { review.hidden = true; }

    if (stars >= 2) { fanfare(); confetti(); }
    byId('end-h').focus(); // move focus into the revealed panel
  }

  /* ---------- confetti ---------- */
  function confetti() {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    if (confettiRAF) { cancelAnimationFrame(confettiRAF); confettiRAF = null; }
    let cv = byId('confetti');
    if (!cv) { cv = el('canvas'); cv.id = 'confetti'; document.body.appendChild(cv); }
    const ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#E4B824', '#1A3A6B', '#2FA060', '#F08A7E', '#57C7B4', '#6B79E0'];
    const N = 140, ps = [];
    for (let i = 0; i < N; i++) ps.push({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.4, r: 4 + Math.random() * 6, c: cols[i % cols.length], vy: 2 + Math.random() * 3.5, vx: -1.5 + Math.random() * 3, a: Math.random() * Math.PI, va: -0.2 + Math.random() * 0.4 });
    let frames = 0;
    (function loop() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => { p.y += p.vy; p.x += p.vx; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6); ctx.restore(); });
      frames++;
      if (frames < 230) { confettiRAF = requestAnimationFrame(loop); }
      else { ctx.clearRect(0, 0, cv.width, cv.height); confettiRAF = null; }
    })();
  }

  /* ---------- events ---------- */
  function pickFromEvent(e) {
    const g = e.target.closest && e.target.closest('.part');
    if (!g) return;
    onPick(g.dataset.slug, g);
  }
  svg.addEventListener('click', pickFromEvent);
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      const g = e.target.closest && e.target.closest('.part');
      if (g) { e.preventDefault(); onPick(g.dataset.slug, g); }
    }
  });

  byId('start-btn').addEventListener('click', startGame);
  byId('again-btn').addEventListener('click', startGame);
  replayBtn.addEventListener('click', () => {
    if (state.current) { playWord(state.current.slug); replayBtn.classList.add('playing'); setTimeout(() => replayBtn.classList.remove('playing'), 700); }
  });
  flipBtn.addEventListener('click', flip);
  helpBtn.addEventListener('click', () => {
    state.helpOn = !state.helpOn;
    helpBtn.setAttribute('aria-pressed', state.helpOn ? 'true' : 'false');
    refreshScaffold();
  });

  // keep confetti canvas sized
  window.addEventListener('resize', () => { const cv = byId('confetti'); if (cv) { cv.width = innerWidth; cv.height = innerHeight; } });

  // Codec probe at load (this is an audio-only activity) so the bilingual
  // "audio won't play on this device" banner shows before the pupil taps Start.
  if (!audioEl.canPlayType('audio/mp4; codecs="mp4a.40.2"') && !audioEl.canPlayType('audio/aac') && !audioEl.canPlayType('audio/mp4')) audioNotice();
})();
