/* ============================================================
   Caitheamh Aimsire (Pastimes) — engine
   Three modes: Foghlaim (Learn) · Meaitseáil (Match) · Triail
   Éisteachta (Listening quiz). Native-Irish audio at the core.
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOTAL = VOCAB.length;

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const bySlug = (s) => VOCAB.find((v) => v.slug === s);

  /* ---------- Native-audio playback ---------- */
  const audioEl = new Audio();
  audioEl.preload = 'auto';
  let playingEl = null;
  let audioWarned = false;
  function audioNotice() {
    if (audioWarned) return;
    audioWarned = true;
    const b = el('div', 'audio-banner');
    b.id = 'audio-banner';
    b.setAttribute('role', 'alert');
    b.innerHTML = 'Ní féidir an fhuaim a sheinm ar an ngléas seo &mdash; bain triail as Chrome nó Edge. &middot; Audio will not play on this device — try Chrome or Edge.';
    document.body.appendChild(b);
  }
  function clearPlaying() {
    if (playingEl) { playingEl.classList.remove('playing'); playingEl = null; }
  }
  function playWord(slug, srcEl) {
    const v = slug === HEADWORD.slug ? HEADWORD : bySlug(slug);
    if (!v) return;
    resumeCtx();
    try { audioEl.pause(); audioEl.currentTime = 0; } catch (_) {}
    clearPlaying();
    audioEl.src = v.audio;
    if (srcEl) { playingEl = srcEl; srcEl.classList.add('playing'); }
    const p = audioEl.play();
    // A rejected play() is usually an autoplay-policy block (harmless — the user can
    // tap the orb); only a real media 'error' event below signals an unplayable codec.
    if (p && p.catch) p.catch(() => clearPlaying());
  }
  audioEl.addEventListener('ended', clearPlaying);
  audioEl.addEventListener('error', () => { clearPlaying(); audioNotice(); });

  /* ---------- Web-Audio chimes (feedback, distinct from speech) ---------- */
  let actx = null;
  function getCtx() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } }
    return actx;
  }
  function resumeCtx() { const c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
  function tone(freq, dur, type, vol) {
    const c = getCtx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vol || 0.1, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (dur || 0.1));
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + (dur || 0.1) + 0.02);
  }
  function chimeRight() { tone(660, 0.10, 'sine', 0.12); setTimeout(() => tone(990, 0.12, 'sine', 0.10), 80); }
  function chimeWrong() { tone(220, 0.16, 'triangle', 0.09); }
  function chord() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => tone(f, 0.5, 'sine', 0.12), i * 110)); }

  /* ---------- Confetti ---------- */
  function burstConfetti() {
    if (REDUCED) return;
    let cv = $('confetti-canvas');
    if (!cv) { cv = el('canvas'); cv.id = 'confetti-canvas'; document.body.appendChild(cv); }
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#E4B824', '#1C6B47', '#FFFFFF', '#2E9466', '#F5D45E'];
    const parts = [];
    for (let i = 0; i < 150; i++) {
      parts.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.5,
        w: 6 + Math.random() * 7, h: 9 + Math.random() * 9,
        c: colors[i % colors.length], vy: 2.4 + Math.random() * 3.6,
        vx: -1.6 + Math.random() * 3.2, rot: Math.random() * 6.28, vr: -0.22 + Math.random() * 0.44
      });
    }
    let t0 = null;
    function frame(ts) {
      if (!t0) t0 = ts;
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (ts - t0 < 2700) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Mode switching (ARIA tablist with roving tabindex + arrow keys) ---------- */
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.mode-tab'));
  const panels = { learn: $('panel-learn'), match: $('panel-match'), quiz: $('panel-quiz') };
  let matchBuilt = false;
  function showMode(m) {
    tabs.forEach((t) => {
      const on = t.dataset.mode === m;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    Object.keys(panels).forEach((k) => { panels[k].hidden = k !== m; });
    try { audioEl.pause(); } catch (_) {}
    clearPlaying();
    if (m === 'match' && !matchBuilt) buildMatch();
  }
  tabs.forEach((t) => {
    t.addEventListener('click', () => showMode(t.dataset.mode));
    t.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(t);
      let n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      else return;
      e.preventDefault();
      showMode(tabs[n].dataset.mode);
      tabs[n].focus();
    });
  });

  /* ============ FOGHLAIM (Learn) ============ */
  function buildLearn() {
    const grid = $('learn-grid');
    VOCAB.forEach((v) => {
      const card = el('button', 'vocab-card');
      card.type = 'button';
      card.dataset.slug = v.slug;
      card.setAttribute('aria-label', v.irish + ', ' + v.english + '. Tap to listen.');

      const photo = el('div', 'vc-photo');
      const img = el('img'); img.src = v.img; img.alt = ''; img.loading = 'lazy';
      photo.appendChild(img);

      const body = el('div', 'vc-body');
      body.appendChild(el('span', 'vc-irish', v.irish));
      body.appendChild(el('span', 'vc-english', v.english));
      body.appendChild(el('span', 'vc-pron', v.pron));

      const sp = el('span', 'vc-speaker'); sp.setAttribute('aria-hidden', 'true'); sp.innerHTML = '&#9658;';
      photo.appendChild(sp);

      card.appendChild(photo); card.appendChild(body);
      card.addEventListener('click', () => playWord(v.slug, card));
      grid.appendChild(card);
    });
  }

  /* ============ MEAITSEÁIL (Match) — real Pointer-Events drag ============ */
  const matchBoard = $('match-board');
  const matchTray = $('match-tray');
  const matchPlaced = $('match-placed');
  const matchCheck = $('match-check');
  const matchReset = $('match-reset');
  const matchResult = $('match-result');
  const matchLive = $('match-live');
  let zones = [];
  let kbPick = null;
  function announce(msg) { if (matchLive) matchLive.textContent = msg; }

  const autoScroll = {
    vel: 0, raf: null,
    start() { if (this.raf) return; const loop = () => { if (this.vel) window.scrollBy({ top: this.vel, behavior: 'instant' }); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); },
    update(y) { const m = 90; this.vel = y < m ? -Math.ceil((m - y) / 5) : y > window.innerHeight - m ? Math.ceil((y - (window.innerHeight - m)) / 5) : 0; },
    stop() { this.vel = 0; if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; }
  };

  function zoneUnder(x, y, chip) {
    const stack = document.elementsFromPoint(x, y);
    for (const e of stack) {
      if (e === chip || chip.contains(e)) continue;
      const z = e.closest ? e.closest('.ps-drop') : null;
      if (z) return z;
    }
    return null;
  }
  function clearHover() { zones.forEach((z) => z.classList.remove('drop-hover')); }

  function returnChipToTray(chip) { matchTray.appendChild(chip); }
  function placeChipInZone(chip, zone) {
    const occ = zone.querySelector('.word-chip');
    if (occ && occ !== chip) returnChipToTray(occ);
    zone.appendChild(chip);
  }
  function unstyleChip(chip) {
    chip.classList.remove('dragging');
    chip.style.position = ''; chip.style.left = ''; chip.style.top = '';
    chip.style.width = ''; chip.style.margin = ''; chip.style.zIndex = ''; chip.style.transform = '';
  }

  function enableChipDrag(chip) {
    chip.style.touchAction = 'none';
    const ptr = { id: null, sx: 0, sy: 0, moved: false };

    function teardown() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      autoScroll.stop();
      clearHover();
      document.body.classList.remove('dragging-active');
    }
    function onMove(e) {
      if (ptr.id !== e.pointerId) return;
      if (!ptr.moved) {
        if (Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) < 6) return;
        ptr.moved = true;
        const r = chip.getBoundingClientRect();
        chip.style.position = 'fixed';
        chip.style.left = r.left + 'px'; chip.style.top = r.top + 'px';
        chip.style.width = r.width + 'px'; chip.style.margin = '0'; chip.style.zIndex = '1000';
        chip.classList.add('dragging');
        document.body.classList.add('dragging-active');
        // Capture guarantees pointerup/cancel are delivered even if the gesture
        // leaves the element or an OS gesture interrupts it.
        try { chip.setPointerCapture(e.pointerId); } catch (_) {}
        autoScroll.start();
        ptr.sx = e.clientX; ptr.sy = e.clientY;
        return;
      }
      chip.style.transform = 'translate(' + (e.clientX - ptr.sx) + 'px,' + (e.clientY - ptr.sy) + 'px) scale(1.05) rotate(-1.5deg)';
      autoScroll.update(e.clientY);
      clearHover();
      const z = zoneUnder(e.clientX, e.clientY, chip);
      if (z) z.classList.add('drop-hover');
    }
    function onUp(e) {
      if (ptr.id !== e.pointerId) return;
      ptr.id = null;
      teardown();
      if (!ptr.moved) { unstyleChip(chip); playWord(chip.dataset.slug, chip); return; }
      ptr.moved = false;
      const z = (e.type === 'pointercancel') ? null : zoneUnder(e.clientX, e.clientY, chip);
      unstyleChip(chip);
      if (z) placeChipInZone(chip, z); else returnChipToTray(chip);
      chip.classList.add('snap-in');
      setTimeout(() => chip.classList.remove('snap-in'), 360);
      updateMatchState();
    }
    chip.addEventListener('pointerdown', (e) => {
      if (chip.classList.contains('locked') || ptr.id !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ptr.id = e.pointerId; ptr.moved = false; ptr.sx = e.clientX; ptr.sy = e.clientY;
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
    // Safety net: if capture is lost without a pointerup/cancel (OS gesture steal),
    // run cleanup so the chip never gets stranded undraggable. After a normal onUp
    // ptr.id is already null, so this is a no-op then.
    chip.addEventListener('lostpointercapture', (e) => {
      if (ptr.id !== e.pointerId) return;
      const wasMoved = ptr.moved;
      ptr.id = null; ptr.moved = false;
      teardown();
      if (wasMoved) { unstyleChip(chip); returnChipToTray(chip); updateMatchState(); }
    });

    // Keyboard fallback: Enter/Space picks up / drops the chip.
    chip.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (chip.classList.contains('locked')) return;
      if (kbPick && kbPick === chip) { clearKbPick(); announce('Cuireadh ar ais é · put down'); return; }
      clearKbPick();
      kbPick = chip; chip.classList.add('kb-pick'); chip.setAttribute('aria-pressed', 'true');
      zones.forEach((z) => { z.setAttribute('tabindex', '0'); });
      matchTray.setAttribute('tabindex', '0');
      announce('Roghnaíodh ' + bySlug(chip.dataset.slug).irish + '. Roghnaigh pictiúr nó an banc focal. · Picked up ' + bySlug(chip.dataset.slug).irish + ' — choose a picture or the word bank.');
    });
  }
  function clearKbPick() {
    if (kbPick) { kbPick.classList.remove('kb-pick'); kbPick.setAttribute('aria-pressed', 'false'); }
    kbPick = null;
    zones.forEach((z) => z.removeAttribute('tabindex'));
    matchTray.removeAttribute('tabindex');
  }

  function updateMatchState() {
    let placed = 0;
    zones.forEach((z) => {
      const c = z.querySelector('.word-chip');
      if (c) {
        z.classList.add('filled');
        // A freshly-moved (unlocked) chip clears any stale red/green from a prior Check.
        if (!c.classList.contains('locked')) {
          z.classList.remove('wrong', 'correct');
          const rev = z.querySelector('.ps-reveal'); if (rev) rev.textContent = '';
        }
        placed++;
      } else {
        z.classList.remove('filled', 'wrong', 'correct');
        const rev = z.querySelector('.ps-reveal'); if (rev) rev.textContent = '';
      }
    });
    matchPlaced.textContent = placed;
    matchCheck.disabled = placed !== TOTAL;
    if (!matchResult.classList.contains('good')) matchResult.hidden = true;
  }

  function checkMatch() {
    let locked = 0, newCorrect = 0, anyWrong = false;
    zones.forEach((z) => {
      const c = z.querySelector('.word-chip');
      if (!c) return;
      if (c.classList.contains('locked')) { locked++; return; }
      z.classList.remove('wrong');
      if (c.dataset.slug === z.dataset.slug) {
        z.classList.add('correct'); c.classList.add('locked');
        const rev = z.querySelector('.ps-reveal'); if (rev) rev.textContent = bySlug(c.dataset.slug).english;
        locked++; newCorrect++;
      } else {
        z.classList.add('wrong'); c.classList.add('shake');
        setTimeout(() => c.classList.remove('shake'), 360);
        anyWrong = true;
      }
    });
    matchResult.hidden = false;
    if (locked === TOTAL) {
      matchResult.textContent = 'Sármhaith! Gach ceann ceart — brilliant, all ' + TOTAL + ' matched!';
      matchResult.className = 'match-result good';
      matchCheck.disabled = true;
      chord(); burstConfetti();
    } else {
      matchResult.textContent = locked + ' / ' + TOTAL + ' ceart — move the red words and check again.';
      matchResult.className = 'match-result part';
      if (newCorrect > 0) chimeRight(); else if (anyWrong) chimeWrong();
    }
  }

  function buildMatch() {
    matchBuilt = true;
    clearKbPick();
    matchBoard.innerHTML = ''; matchTray.innerHTML = '';
    matchResult.hidden = true; matchResult.className = 'match-result';

    shuffle(VOCAB).forEach((v, i) => {
      const slot = el('div', 'photo-slot');
      const ph = el('div', 'ps-photo');
      const img = el('img'); img.src = v.img; img.alt = ''; img.loading = 'lazy';
      ph.appendChild(img);
      const drop = el('div', 'ps-drop'); drop.dataset.slug = v.slug;
      // Names the slot by the picture it shows (the accessible equivalent of seeing
      // the photo). Matching still needs the Irish vocabulary, so this is not a giveaway.
      drop.setAttribute('aria-label', v.english + ' — sliotán pictiúir / picture slot');
      drop.appendChild(el('span', 'ps-placeholder', '?'));
      drop.appendChild(el('span', 'ps-reveal'));
      slot.appendChild(ph); slot.appendChild(drop);
      matchBoard.appendChild(slot);
    });
    zones = Array.prototype.slice.call(matchBoard.querySelectorAll('.ps-drop'));

    function dropHere(z) {
      if (!kbPick) return;
      const c = kbPick;
      placeChipInZone(c, z);
      announce('Cuireadh ' + bySlug(c.dataset.slug).irish + ' · placed');
      clearKbPick(); updateMatchState(); c.focus();
    }
    zones.forEach((z) => {
      z.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && kbPick) { e.preventDefault(); dropHere(z); }
      });
    });
    matchTray.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && kbPick) {
        e.preventDefault();
        const c = kbPick;
        returnChipToTray(c);
        announce('Cuireadh ' + bySlug(c.dataset.slug).irish + ' ar ais sa bhanc · returned to the word bank');
        clearKbPick(); updateMatchState(); c.focus();
      }
    });

    shuffle(VOCAB).forEach((v) => {
      const chip = el('button', 'word-chip');
      chip.type = 'button'; chip.dataset.slug = v.slug; chip.setAttribute('tabindex', '0');
      chip.setAttribute('aria-pressed', 'false');
      chip.setAttribute('aria-label', v.irish + ' — drag to its picture, or press Enter to pick it up');
      chip.appendChild(el('span', 'wc-irish', v.irish));
      const sp = el('span', 'wc-speaker'); sp.setAttribute('aria-hidden', 'true'); sp.innerHTML = '&#9658;';
      chip.appendChild(sp);
      enableChipDrag(chip);
      matchTray.appendChild(chip);
    });
    updateMatchState();
  }

  matchCheck.addEventListener('click', checkMatch);
  matchReset.addEventListener('click', () => { matchBuilt = false; buildMatch(); });

  /* ============ TRIAIL ÉISTEACHTA (Listening quiz) ============ */
  const quizStart = $('quiz-start'), quizPlay = $('quiz-play'), quizEnd = $('quiz-end');
  const quizOptions = $('quiz-options'), quizFeedback = $('quiz-feedback'), quizFbWord = $('quiz-fb-word');
  const quizScore = $('quiz-score'), quizProgress = $('quiz-progress'), quizProgressBar = $('quiz-progress-bar');
  const quizPlayBtn = $('quiz-play-btn'), quizReplay = $('quiz-replay'), quizNext = $('quiz-next');
  const quizShowWordBtn = $('quiz-show-word'), quizWordText = $('quiz-word-text');
  const quiz = { order: [], idx: 0, score: 0, answered: false, missed: [], current: null, showWord: false };

  function setProgress(done) {
    quizProgress.style.width = (done / TOTAL * 100) + '%';
    quizProgressBar.setAttribute('aria-valuenow', String(done));
    quizProgressBar.setAttribute('aria-valuetext', 'Ceist ' + Math.min(done + (quiz.answered ? 0 : 1), TOTAL) + ' de ' + TOTAL + ' · question ' + Math.min(done + (quiz.answered ? 0 : 1), TOTAL) + ' of ' + TOTAL);
  }

  function startQuiz() {
    quiz.order = shuffle(VOCAB.map((_, i) => i));
    quiz.idx = 0; quiz.score = 0; quiz.missed = [];
    quizScore.textContent = '0';
    quizStart.hidden = true; quizEnd.hidden = true; quizPlay.hidden = false;
    renderQuestion();
  }

  function syncWordText() {
    if (!quiz.current) return;
    quizWordText.textContent = quiz.current.irish;
    quizWordText.hidden = !quiz.showWord;
  }

  function renderQuestion() {
    quiz.answered = false;
    const v = VOCAB[quiz.order[quiz.idx]];
    quiz.current = v;
    setProgress(quiz.idx);
    quizFeedback.hidden = true;
    quizOptions.innerHTML = '';
    syncWordText();
    // Blind/keyboard users get the prompt word as the orb's accessible name; this is
    // the spoken word as text, so it is the equivalent of hearing it, never the answer.
    quizPlayBtn.setAttribute('aria-label', 'Seinn an focal: ' + v.irish + ' · play the word');

    const decoys = shuffle(VOCAB.filter((x) => x.slug !== v.slug)).slice(0, 3);
    shuffle([v].concat(decoys)).forEach((o) => {
      const b = el('button', 'quiz-opt'); b.type = 'button'; b.dataset.slug = o.slug;
      // Meaningful alt describes the photo (the accessible equivalent of seeing it).
      // It is NOT the answer: a pupil must still map the spoken Irish to a meaning.
      const img = el('img'); img.src = o.img; img.alt = o.english; img.loading = 'lazy';
      b.appendChild(img); b.appendChild(el('span', 'badge'));
      b.addEventListener('click', () => chooseOption(b, o, v));
      quizOptions.appendChild(b);
    });
    setTimeout(() => playWord(v.slug, quizPlayBtn), REDUCED ? 150 : 380);
  }

  function chooseOption(btn, o, v) {
    if (quiz.answered) return;
    quiz.answered = true;
    const correct = o.slug === v.slug;
    Array.prototype.slice.call(quizOptions.children).forEach((b) => {
      b.disabled = true;
      const badge = b.querySelector('.badge');
      if (b.dataset.slug === v.slug) { b.classList.add('correct'); badge.innerHTML = '&#10003;'; }
      else if (b === btn) { b.classList.add('wrong'); badge.innerHTML = '&#10007;'; }
      else b.classList.add('dim');
    });
    if (correct) { quiz.score++; quizScore.textContent = quiz.score; chimeRight(); }
    else { quiz.missed.push(v); chimeWrong(); }
    quizFbWord.innerHTML = (correct ? 'Ceart! &middot; Correct &mdash; ' : 'Mícheart &middot; Not quite &mdash; ') + '<b>' + v.irish + '</b> = ' + v.english;
    quizFbWord.className = 'fb-word ' + (correct ? 'good' : 'bad');
    quizFeedback.hidden = false;
    setProgress(quiz.idx + 1);
    quizNext.textContent = (quiz.idx + 1 >= TOTAL) ? 'Torthaí · See results ›' : 'Ar aghaidh · Next ›';
    quizNext.focus();
  }

  function endQuiz() {
    quizPlay.hidden = true; quizEnd.hidden = false;
    const score = quiz.score, pct = score / TOTAL;
    let title, msg;
    if (pct === 1) { title = 'Ar fheabhas! · Perfect!'; msg = 'Every word, spot on. Your listening is excellent.'; }
    else if (pct >= 0.8) { title = 'Sárobair · Excellent'; msg = 'A really strong result. A quick look below and you will have them all.'; }
    else if (pct >= 0.6) { title = 'Maith thú · Good work'; msg = 'A solid base. The words below are the ones worth another listen.'; }
    else if (pct >= 0.4) { title = 'Ag dul i bhfeabhas · Getting there'; msg = 'Keep going — listen again to the words below, then try once more.'; }
    else { title = 'Triail arís · Try again'; msg = 'Listen again to the words below, then play once more to build your ear.'; }
    $('quiz-end-title').textContent = title;
    $('quiz-end-num').textContent = score;
    $('quiz-end-msg').textContent = msg;

    const review = $('quiz-review'), list = $('quiz-review-list');
    list.innerHTML = '';
    if (quiz.missed.length === 0) { review.hidden = true; }
    else {
      review.hidden = false;
      quiz.missed.forEach((v) => {
        const li = el('li');
        const img = el('img'); img.src = v.img; img.alt = '';
        const words = el('div', 'rv-words');
        words.appendChild(el('span', 'rv-ga', v.irish));
        words.appendChild(el('span', 'rv-en', ' — ' + v.english));
        const play = el('button', 'rv-play'); play.type = 'button';
        play.setAttribute('aria-label', 'Éist le ' + v.irish); play.innerHTML = '&#9658;';
        play.addEventListener('click', () => playWord(v.slug, play));
        li.appendChild(img); li.appendChild(words); li.appendChild(play);
        list.appendChild(li);
      });
    }
    if (pct === 1) { chord(); burstConfetti(); }
  }

  $('quiz-begin').addEventListener('click', startQuiz);
  $('quiz-again').addEventListener('click', startQuiz);
  quizPlayBtn.addEventListener('click', () => { if (quiz.current) playWord(quiz.current.slug, quizPlayBtn); });
  quizReplay.addEventListener('click', () => { if (quiz.current) playWord(quiz.current.slug, quizPlayBtn); });
  quizShowWordBtn.addEventListener('click', () => {
    quiz.showWord = !quiz.showWord;
    quizShowWordBtn.setAttribute('aria-pressed', quiz.showWord ? 'true' : 'false');
    syncWordText();
  });
  quizNext.addEventListener('click', () => {
    quiz.idx++;
    if (quiz.idx >= TOTAL) endQuiz(); else renderQuestion();
  });

  /* ---------- Image credits ---------- */
  function buildCredits() {
    const wrap = $('credits-list'), btn = $('credits-toggle');
    let html = '<p>Photographs via Wikimedia Commons (cropped for the activity):</p><ul>';
    CREDITS.forEach((c) => {
      html += '<li>' + c.what + ' — ' + c.who + ' (' + c.lic + '). ' +
        '<a href="' + c.url + '" target="_blank" rel="noopener">source</a></li>';
    });
    html += '</ul><p>Audio: native-Irish recordings by the Irish Department, OLS.</p>';
    wrap.innerHTML = html;
    btn.addEventListener('click', () => {
      const open = wrap.hidden;
      wrap.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- Init ---------- */
  // Data-driven denominators (track VOCAB.length if the word list is edited).
  $('match-total').textContent = TOTAL;
  $('quiz-q-total').textContent = TOTAL;
  $('quiz-end-total').textContent = TOTAL;
  quizProgressBar.setAttribute('aria-valuemax', String(TOTAL));

  // Up-front check: if the device cannot decode AAC/.m4a at all, tell the pupil.
  if (!audioEl.canPlayType('audio/mp4; codecs="mp4a.40.2"') && !audioEl.canPlayType('audio/aac') && !audioEl.canPlayType('audio/mp4')) {
    audioNotice();
  }

  $('title-audio').addEventListener('click', () => playWord(HEADWORD.slug, $('title-audio')));
  buildLearn();
  buildCredits();
  showMode('learn');
})();
