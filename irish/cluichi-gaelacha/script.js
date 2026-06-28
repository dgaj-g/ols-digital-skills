/* ============================================================
   Cluichí Gaelacha (the five Gaelic games) — engine
   Foghlaim (flip-card Learn) · Cluiche Cuimhne (memory pairs) ·
   Triail Éisteachta (listening quiz). Native-Irish audio core.
   ============================================================ */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOTAL = GAMES.length;

  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const bySlug = (s) => GAMES.find((v) => v.slug === s);

  /* ---------- Native-audio playback ---------- */
  const audioEl = new Audio(); audioEl.preload = 'auto';
  let playingEl = null, audioWarned = false;
  function audioNotice() {
    if (audioWarned) return; audioWarned = true;
    const b = el('div', 'audio-banner'); b.id = 'audio-banner'; b.setAttribute('role', 'alert');
    b.innerHTML = 'Ní féidir an fhuaim a sheinm ar an ngléas seo &mdash; bain triail as Chrome nó Edge. &middot; Audio will not play on this device — try Chrome or Edge.';
    document.body.appendChild(b);
  }
  function clearPlaying() { if (playingEl) { playingEl.classList.remove('playing'); playingEl = null; } }
  function playWord(slug, srcEl) {
    const v = bySlug(slug); if (!v) return;
    resumeCtx();
    try { audioEl.pause(); audioEl.currentTime = 0; } catch (_) {}
    clearPlaying();
    audioEl.src = v.audio;
    if (srcEl) { playingEl = srcEl; srcEl.classList.add('playing'); }
    const mine = srcEl;
    const p = audioEl.play();
    // Only clear if THIS call's button is still the active one — a later play() may
    // have taken over, and its pending rejection must not strip the new button's pulse.
    if (p && p.catch) p.catch(() => { if (playingEl === mine) clearPlaying(); });
  }
  audioEl.addEventListener('ended', clearPlaying);
  audioEl.addEventListener('error', () => { clearPlaying(); audioNotice(); });

  /* ---------- Web-Audio chimes ---------- */
  let actx = null;
  function getCtx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } } return actx; }
  function resumeCtx() { const c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
  function tone(freq, dur, type, vol) {
    const c = getCtx(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(vol || 0.1, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (dur || 0.1));
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + (dur || 0.1) + 0.02);
  }
  function chimeRight() { tone(660, 0.10, 'sine', 0.12); setTimeout(() => tone(990, 0.12, 'sine', 0.10), 80); }
  function chimeWrong() { tone(220, 0.16, 'triangle', 0.09); }
  function chord() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => tone(f, 0.5, 'sine', 0.12), i * 110)); }

  /* ---------- Confetti ---------- */
  function burstConfetti() {
    if (REDUCED) return;
    let cv = $('confetti-canvas');
    if (!cv) { cv = el('canvas'); cv.id = 'confetti-canvas'; document.body.appendChild(cv); }
    const ctx = cv.getContext('2d'); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#E4B824', '#1B6B3A', '#FFFFFF', '#2E9A57', '#F5D45E'];
    const parts = [];
    for (let i = 0; i < 160; i++) parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, w: 6 + Math.random() * 7, h: 9 + Math.random() * 9, c: colors[i % colors.length], vy: 2.4 + Math.random() * 3.6, vx: -1.6 + Math.random() * 3.2, rot: Math.random() * 6.28, vr: -0.22 + Math.random() * 0.44 });
    let t0 = null;
    function frame(ts) { if (!t0) t0 = ts; ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => { p.x += p.vx; p.y += p.vy; p.rot += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (ts - t0 < 2800) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Mode switching (tablist: roving tabindex + arrows) ---------- */
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.mode-tab'));
  const panels = { learn: $('panel-learn'), memory: $('panel-memory'), quiz: $('panel-quiz') };
  let memoryBuilt = false;
  function showMode(m) {
    tabs.forEach((t) => { const on = t.dataset.mode === m; t.classList.toggle('active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    Object.keys(panels).forEach((k) => { panels[k].hidden = k !== m; });
    try { audioEl.pause(); } catch (_) {} clearPlaying();
    if (quiz._autoplay) { clearTimeout(quiz._autoplay); quiz._autoplay = null; }
    if (m === 'memory' && !memoryBuilt) buildMemory();
  }
  tabs.forEach((t) => {
    t.addEventListener('click', () => showMode(t.dataset.mode));
    t.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(t); let n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1; else return;
      e.preventDefault(); showMode(tabs[n].dataset.mode); tabs[n].focus();
    });
  });

  /* ============ FOGHLAIM — flip cards ============ */
  function buildLearn() {
    const grid = $('learn-grid');
    GAMES.forEach((v) => {
      const card = el('div', 'flip-card'); card.tabIndex = 0; card.setAttribute('role', 'button'); card.dataset.slug = v.slug;
      card.setAttribute('aria-label', v.irish + ' — ' + v.english + '. Tap to flip; sound button to listen.');
      const inner = el('div', 'flip-inner');

      const front = el('div', 'flip-face flip-front');
      const photo = el('div', 'fc-photo'); const img = el('img'); img.src = v.img; img.alt = ''; img.loading = 'lazy'; photo.appendChild(img);
      const band = el('div', 'fc-band');
      band.appendChild(el('span', 'fc-irish', v.irish));
      band.appendChild(el('span', 'fc-en-hint', 'Tapáil / flip'));
      const sp1 = el('button', 'fc-speaker'); sp1.type = 'button'; sp1.setAttribute('aria-label', 'Éist le ' + v.irish); sp1.innerHTML = '&#9658;'; band.appendChild(sp1);
      front.appendChild(photo); front.appendChild(band);

      const back = el('div', 'flip-face flip-back');
      back.appendChild(el('span', 'fb-en', v.english));
      back.appendChild(el('span', 'fb-pron', v.pron));
      back.appendChild(el('p', 'fb-desc', v.descriptor));
      const sp2 = el('button', 'fb-speaker'); sp2.type = 'button'; sp2.setAttribute('aria-label', 'Éist le ' + v.irish); sp2.innerHTML = '&#9658;'; back.appendChild(sp2);

      inner.appendChild(front); inner.appendChild(back); card.appendChild(inner);
      function flip() { card.classList.toggle('flipped'); }
      card.addEventListener('click', (e) => { if (e.target.closest('.fc-speaker, .fb-speaker')) return; flip(); });
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
      sp1.addEventListener('click', (e) => { e.stopPropagation(); playWord(v.slug, sp1); });
      sp2.addEventListener('click', (e) => { e.stopPropagation(); playWord(v.slug, sp2); });
      grid.appendChild(card);
    });
  }

  /* ============ CLUICHE CUIMHNE — memory pairs ============ */
  const mem = { flipped: [], matches: 0, moves: 0, lock: false };
  let memLive = null;
  function buildMemory() {
    memoryBuilt = true;
    mem.flipped = []; mem.matches = 0; mem.moves = 0; mem.lock = false;
    $('mem-matches').textContent = '0'; $('mem-moves').textContent = '0'; $('memory-win').hidden = true;
    if (!memLive) { memLive = el('div', 'sr-only'); memLive.setAttribute('aria-live', 'polite'); $('panel-memory').appendChild(memLive); }
    const grid = $('memory-grid'); grid.innerHTML = '';
    let deck = [];
    GAMES.forEach((v) => { deck.push({ slug: v.slug, kind: 'word', v: v }); deck.push({ slug: v.slug, kind: 'photo', v: v }); });
    deck = shuffle(deck);
    deck.forEach((c, i) => {
      const card = el('div', 'mem-card'); card.tabIndex = 0; card.setAttribute('role', 'button'); card.dataset.slug = c.slug; card.dataset.kind = c.kind; card.dataset.idx = (i + 1);
      card.setAttribute('aria-label', 'Cárta ' + (i + 1) + ' — iompaigh / flip card ' + (i + 1));
      const inner = el('div', 'mem-inner');
      const back = el('div', 'mem-face mem-back'); back.appendChild(el('span', 'knot-emblem'));
      const front = el('div', 'mem-face mem-front ' + (c.kind === 'word' ? 'is-word' : 'is-photo'));
      front.setAttribute('aria-hidden', 'true'); // never expose the answer until flipped
      if (c.kind === 'word') { front.appendChild(el('span', 'mw', c.v.irish)); }
      else { const img = el('img'); img.src = c.v.img; img.alt = ''; front.appendChild(img); }
      inner.appendChild(back); inner.appendChild(front); card.appendChild(inner);
      card.addEventListener('click', () => flipMem(card, c));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipMem(card, c); } });
      grid.appendChild(card);
    });
  }
  function memReveal(card, c) {
    card.querySelector('.mem-front').removeAttribute('aria-hidden');
    card.setAttribute('aria-label', c.kind === 'word' ? c.v.irish + ' (focal/word)' : c.v.english + ' (pictiúr/picture)');
  }
  function memHide(card) {
    card.querySelector('.mem-front').setAttribute('aria-hidden', 'true');
    card.setAttribute('aria-label', 'Cárta ' + card.dataset.idx + ' — iompaigh / flip card ' + card.dataset.idx);
  }
  function memMatched(card, c) {
    card.classList.add('matched');
    card.tabIndex = -1; card.removeAttribute('role'); card.setAttribute('aria-disabled', 'true');
    card.setAttribute('aria-label', c.v.irish + ' — meaitseáilte / matched');
  }
  function flipMem(card, c) {
    if (mem.lock || card.classList.contains('matched') || card.classList.contains('flipped')) return;
    card.classList.add('flipped');
    memReveal(card, c);
    if (memLive) memLive.textContent = (c.kind === 'word' ? c.v.irish + ' (focal/word)' : c.v.english + ' (pictiúr/picture)');
    tone(520, 0.05, 'sine', 0.05);
    mem.flipped.push({ card: card, c: c });
    if (mem.flipped.length === 2) {
      mem.moves++; $('mem-moves').textContent = mem.moves;
      const A = mem.flipped[0], B = mem.flipped[1];
      if (A.card.dataset.slug === B.card.dataset.slug && A.card.dataset.kind !== B.card.dataset.kind) {
        mem.lock = true;
        setTimeout(() => {
          memMatched(A.card, A.c); memMatched(B.card, B.c);
          mem.flipped = []; mem.lock = false; mem.matches++; $('mem-matches').textContent = mem.matches;
          chimeRight(); playWord(A.card.dataset.slug, null);
          if (memLive) memLive.textContent = A.c.v.irish + ' — Péire! Match. ' + mem.matches + ' as ' + TOTAL + '.';
          if (mem.matches === TOTAL) winMemory();
        }, 340);
      } else {
        mem.lock = true; chimeWrong();
        A.card.classList.add('mismatch'); B.card.classList.add('mismatch');
        setTimeout(() => {
          A.card.classList.remove('flipped', 'mismatch'); B.card.classList.remove('flipped', 'mismatch');
          memHide(A.card); memHide(B.card);
          mem.flipped = []; mem.lock = false;
          if (memLive) memLive.textContent = 'Ní péire. Not a match.';
        }, 860);
      }
    }
  }
  function winMemory() {
    setTimeout(() => {
      $('win-msg').textContent = 'Fuair tú gach péire i ' + mem.moves + ' iarracht. · You matched all five in ' + mem.moves + ' tries.';
      $('memory-win').hidden = false; chord(); burstConfetti();
    }, 480);
  }
  $('mem-new').addEventListener('click', buildMemory);
  $('mem-again').addEventListener('click', buildMemory);

  /* ============ TRIAIL ÉISTEACHTA — listening quiz ============ */
  const quizStart = $('quiz-start'), quizPlay = $('quiz-play'), quizEnd = $('quiz-end');
  const quizOptions = $('quiz-options'), quizFeedback = $('quiz-feedback'), quizFbWord = $('quiz-fb-word');
  const quizScore = $('quiz-score'), quizProgress = $('quiz-progress'), quizProgressBar = $('quiz-progress-bar');
  const quizPlayBtn = $('quiz-play-btn'), quizReplay = $('quiz-replay'), quizNext = $('quiz-next');
  const quizShowWordBtn = $('quiz-show-word'), quizWordText = $('quiz-word-text');
  const quiz = { order: [], idx: 0, score: 0, answered: false, missed: [], current: null, showWord: false };

  function setProgress(done) {
    quizProgress.style.width = (done / TOTAL * 100) + '%';
    quizProgressBar.setAttribute('aria-valuenow', String(done));
    const q = Math.min(done + (quiz.answered ? 0 : 1), TOTAL);
    quizProgressBar.setAttribute('aria-valuetext', 'Ceist ' + q + ' de ' + TOTAL + ' · question ' + q + ' of ' + TOTAL);
  }
  function startQuiz() {
    quiz.order = shuffle(GAMES.map((_, i) => i)); quiz.idx = 0; quiz.score = 0; quiz.missed = [];
    quizScore.textContent = '0'; quizStart.hidden = true; quizEnd.hidden = true; quizPlay.hidden = false; renderQuestion();
  }
  function syncWordText() { if (!quiz.current) return; quizWordText.textContent = quiz.current.irish; quizWordText.hidden = !quiz.showWord; }
  function renderQuestion() {
    quiz.answered = false; const v = GAMES[quiz.order[quiz.idx]]; quiz.current = v;
    setProgress(quiz.idx); quizFeedback.hidden = true; quizOptions.innerHTML = ''; syncWordText();
    // The orb keeps its generic, answer-free accessible name (set in index.html). The
    // spoken audio is the ONLY per-question signal; the Irish word is revealed only via
    // the explicit "Taispeáin an focal / Show the word" toggle or post-answer feedback —
    // never write the answer into a per-question accessible name/title/alt.
    const decoys = shuffle(GAMES.filter((x) => x.slug !== v.slug)).slice(0, 3);
    shuffle([v].concat(decoys)).forEach((o) => {
      const b = el('button', 'quiz-opt'); b.type = 'button'; b.dataset.slug = o.slug;
      const img = el('img'); img.src = o.img; img.alt = o.english; img.loading = 'lazy';
      b.appendChild(img); b.appendChild(el('span', 'badge'));
      b.addEventListener('click', () => chooseOption(b, o, v)); quizOptions.appendChild(b);
    });
    if (quiz._autoplay) clearTimeout(quiz._autoplay);
    // Guard against the user tabbing away before this fires (audio must not play off-panel).
    quiz._autoplay = setTimeout(function () { if (!panels.quiz.hidden && quiz.current === v) playWord(v.slug, quizPlayBtn); }, REDUCED ? 150 : 380);
  }
  function chooseOption(btn, o, v) {
    if (quiz.answered) return; quiz.answered = true; const correct = o.slug === v.slug;
    Array.prototype.slice.call(quizOptions.children).forEach((b) => {
      b.disabled = true; const badge = b.querySelector('.badge');
      if (b.dataset.slug === v.slug) { b.classList.add('correct'); badge.innerHTML = '&#10003;'; b.appendChild(el('span', 'sr-only', 'Freagra ceart / correct answer')); }
      else if (b === btn) { b.classList.add('wrong'); badge.innerHTML = '&#10007;'; b.appendChild(el('span', 'sr-only', 'Do rogha, mícheart / your choice, wrong')); }
      else b.classList.add('dim');
    });
    if (correct) { quiz.score++; quizScore.textContent = quiz.score; chimeRight(); } else { quiz.missed.push(v); chimeWrong(); }
    quizFbWord.innerHTML = (correct ? 'Ceart! &middot; Correct &mdash; ' : 'Mícheart &middot; Not quite &mdash; ') + '<b>' + v.irish + '</b> = ' + v.english;
    quizFbWord.className = 'fb-word ' + (correct ? 'good' : 'bad'); quizFeedback.hidden = false; setProgress(quiz.idx + 1);
    quizNext.textContent = (quiz.idx + 1 >= TOTAL) ? 'Torthaí · See results ›' : 'Ar aghaidh · Next ›'; quizNext.focus();
  }
  function endQuiz() {
    quizPlay.hidden = true; quizEnd.hidden = false; const score = quiz.score, pct = score / TOTAL; let title, msg;
    if (pct === 1) { title = 'Ar fheabhas! · Perfect!'; msg = 'Every Gaelic game, spot on. Your listening is excellent.'; }
    else if (pct >= 0.8) { title = 'Sárobair · Excellent'; msg = 'A really strong result. A quick look below and you will have them all.'; }
    else if (pct >= 0.6) { title = 'Maith thú · Good work'; msg = 'A solid base. The games below are the ones worth another listen.'; }
    else if (pct >= 0.4) { title = 'Ag dul i bhfeabhas · Getting there'; msg = 'Keep going — listen again to the games below, then try once more.'; }
    else { title = 'Triail arís · Try again'; msg = 'Listen again to the games below, then play once more to build your ear.'; }
    $('quiz-end-title').textContent = title; $('quiz-end-num').textContent = score; $('quiz-end-msg').textContent = msg;
    const review = $('quiz-review'), list = $('quiz-review-list'); list.innerHTML = '';
    if (quiz.missed.length === 0) { review.hidden = true; } else {
      review.hidden = false;
      quiz.missed.forEach((v) => {
        const li = el('li'); const img = el('img'); img.src = v.img; img.alt = '';
        const words = el('div', 'rv-words'); words.appendChild(el('span', 'rv-ga', v.irish)); words.appendChild(el('span', 'rv-en', ' — ' + v.english));
        const play = el('button', 'rv-play'); play.type = 'button'; play.setAttribute('aria-label', 'Éist le ' + v.irish); play.innerHTML = '&#9658;';
        play.addEventListener('click', () => playWord(v.slug, play));
        li.appendChild(img); li.appendChild(words); li.appendChild(play); list.appendChild(li);
      });
    }
    if (pct === 1) { chord(); burstConfetti(); }
  }
  $('quiz-begin').addEventListener('click', startQuiz);
  $('quiz-again').addEventListener('click', startQuiz);
  quizPlayBtn.addEventListener('click', () => { if (quiz.current) playWord(quiz.current.slug, quizPlayBtn); });
  quizReplay.addEventListener('click', () => { if (quiz.current) playWord(quiz.current.slug, quizPlayBtn); });
  quizShowWordBtn.addEventListener('click', () => { quiz.showWord = !quiz.showWord; quizShowWordBtn.setAttribute('aria-pressed', quiz.showWord ? 'true' : 'false'); syncWordText(); });
  quizNext.addEventListener('click', () => { quiz.idx++; if (quiz.idx >= TOTAL) endQuiz(); else renderQuestion(); });

  /* ---------- Credits ---------- */
  function buildCredits() {
    const wrap = $('credits-list'), btn = $('credits-toggle');
    let html = '<p>Photographs via Wikimedia Commons (cropped for the activity):</p><ul>';
    CREDITS.forEach((c) => { html += '<li>' + c.what + ' — ' + c.who + ' (' + c.lic + '). <a href="' + c.url + '" target="_blank" rel="noopener">source</a></li>'; });
    html += '</ul><p>Audio: native-Irish recordings by the Irish Department, OLS.</p>';
    wrap.innerHTML = html;
    btn.addEventListener('click', () => { const open = wrap.hidden; wrap.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  }

  /* ---------- Init ---------- */
  $('quiz-q-total').textContent = TOTAL; $('quiz-end-total').textContent = TOTAL; quizProgressBar.setAttribute('aria-valuemax', String(TOTAL));
  if (!audioEl.canPlayType('audio/mp4; codecs="mp4a.40.2"') && !audioEl.canPlayType('audio/aac') && !audioEl.canPlayType('audio/mp4')) audioNotice();
  buildLearn(); buildCredits(); showMode('learn');
})();
