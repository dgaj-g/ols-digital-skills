/* ============================================================
   Focus the Scene — Classifying Leisure Activities (CCEA LTT)
   ------------------------------------------------------------
   Read the PLACE, set three dials (Energy / Location / Environment),
   and bring the scene into focus. The same activity classifies
   differently depending on where it happens — so a name-matcher
   who ignores the place loses a life.
   Pure HTML/CSS/JS. No drag — tap/click/keyboard dials + commit.
   ============================================================ */

'use strict';

/* ---------- 1. Scene data (16 scenes, three tags each) ----------
   energy:      'active' | 'passive'
   location:    'home'   | 'away'
   environment: 'indoor' | 'outdoor' | 'water'
   `place` = prose shown for text scenes and as the fallback if a
   photo fails to load. `alt` describes only what is VISIBLE (the
   place + activity) and NEVER names a classification — so it helps
   a screen-reader pupil read the scene without handing them the
   answer. Flip pairs (same activity, different place) are marked.
*/
const SCENES = [
  // ---- Flip pair A: reading ----
  { id: 'reading-bed', mode: 'photo', img: 'reading-bedroom.jpg',
    activity: 'Reading a book',
    place: 'Curled up on your bed at home with a lamp on and your music playing softly.',
    alt: 'A girl lying on a bed in a cosy bedroom, reading a book by a lamp.',
    energy: 'passive', location: 'home', environment: 'indoor',
    why: 'Reading is a <b>passive</b> activity — you take it in rather than take part. She is on her own bed, so it is <b>home‑based</b>, and a bedroom is under a roof, so <b>indoor</b>.',
    hints: {
      energy: 'Reading means taking it in, not taking part — that is the calm end of the Energy dial.',
      location: 'A bedroom with her own bed and lamp — this is happening inside her own home.',
      environment: 'Four walls and a ceiling around her — she is under a roof, not outside or in water.'
    } },
  { id: 'reading-pool', mode: 'text', img: null, flip: 'reading',
    activity: 'Reading a book',
    place: 'On a sun‑lounger beside the hotel pool while you are away on holiday.',
    alt: 'A person reading a book on a sun-lounger beside a swimming pool, with open blue sky behind.',
    energy: 'passive', location: 'away', environment: 'outdoor',
    why: 'Same activity, different place. Reading is still <b>passive</b>, but a hotel pool on holiday is <b>away from home</b>, and the loungers sit out under open sky, so this one is <b>outdoor</b>. (She is beside the pool, not in it.)',
    hints: {
      energy: 'It is the same reading as before — relaxing with a book, not taking part.',
      location: 'A hotel pool on holiday is a long way from her own home.',
      environment: 'Open sky overhead and loungers in the sun — she is outside. The pool is just scenery; she is not in the water.'
    } },

  // ---- Flip pair B: watching the football ----
  { id: 'tv-sport', mode: 'text', img: null, flip: 'watch-football',
    activity: 'Watching the football',
    place: 'Feet up on the sofa, watching the match on the TV in the living room.',
    alt: 'A person sitting on a sofa in a living room, watching football on a television.',
    energy: 'passive', location: 'home', environment: 'indoor',
    why: 'Watching the match is <b>passive</b> — she is a spectator, not a player. It is her own living room, so <b>home‑based</b> and <b>indoor</b>.',
    hints: {
      energy: 'She is watching the match, not playing in it — passive.',
      location: 'On her own sofa in the living room — this is at home.',
      environment: 'Indoors under a roof — indoor.'
    } },
  { id: 'stadium', mode: 'text', img: null, flip: 'watch-football',
    activity: 'Watching the football',
    place: 'In the crowd at a packed stadium, watching the match live.',
    alt: 'A large crowd of supporters in the open stands of a football stadium watching a match.',
    energy: 'passive', location: 'away', environment: 'outdoor',
    why: 'Same activity, different place. Watching is still <b>passive</b>, but a stadium is <b>away from home</b>, and the open stands are out in the air, so <b>outdoor</b>.',
    hints: {
      energy: 'She is a spectator watching the match — passive, exactly like on the sofa.',
      location: 'A stadium is away from her own home.',
      environment: 'Open‑air stands under the sky — outdoor.'
    } },

  // ---- Flip pair C: cycling (the CCEA factfile signature pair) ----
  { id: 'cycling-club', mode: 'text', img: null, flip: 'cycling',
    activity: 'Cycling with the club',
    place: 'You head out on your bike with the local cycling club, along the country roads.',
    alt: '',
    energy: 'active', location: 'away', environment: 'outdoor',
    why: 'Cycling with the club means pedalling and taking part, so <b>active</b>. You are out on the roads, so <b>away from home</b> and <b>outdoor</b>.',
    hints: {
      energy: 'You are pedalling and keeping up with the group — taking part, so active.',
      location: 'Out on the country roads with the club, well away from home.',
      environment: 'Out on the open road in the air — outdoor.'
    } },
  { id: 'cycling-tv', mode: 'text', img: null, flip: 'cycling',
    activity: 'Watching the cycling',
    place: 'You settle in to watch the big cycling race on the TV in the living room.',
    alt: '',
    energy: 'passive', location: 'home', environment: 'indoor',
    why: 'Same sport, but you are only watching it. Watching is <b>passive</b>, you are in your own living room, so <b>home‑based</b> and <b>indoor</b>. The place changes everything.',
    hints: {
      energy: 'You are watching the race on screen, not riding in it — passive.',
      location: 'In your own living room — home‑based.',
      environment: 'Indoors on the sofa — indoor.'
    } },

  // ---- Water-based teaching scenes (water beats indoor/outdoor) ----
  { id: 'indoor-pool', mode: 'photo', img: 'indoor-pool.jpg',
    activity: 'Swimming lengths',
    place: 'Doing lengths at the local leisure‑centre pool.',
    alt: 'A swimmer doing lengths in a large public swimming pool inside a leisure centre.',
    energy: 'active', location: 'away', environment: 'water',
    why: 'Swimming means taking part, so <b>active</b>; the leisure centre is <b>away from home</b>. The pool is indoors, but anything done in water is classed as <b>water‑based</b> — water beats indoor or outdoor.',
    hints: {
      energy: 'Swimming lengths is hard work — she is taking part, so active.',
      location: 'The leisure centre is away from her own home.',
      environment: 'She is in the water. In LTT, on or in water is always water‑based — even an indoor pool.'
    } },
  { id: 'hot-tub', mode: 'text', img: null,
    activity: 'Relaxing in the hot tub',
    place: 'You unwind in the hot tub out in the back garden.',
    alt: '',
    energy: 'passive', location: 'home', environment: 'water',
    why: 'You are relaxing, not doing anything energetic, so <b>passive</b>; it is your own garden, so <b>home‑based</b>; and because you are sitting in the water it is <b>water‑based</b> — water beats indoor or outdoor again.',
    hints: {
      energy: 'You are unwinding, not exercising — passive.',
      location: 'Your own back garden — home‑based.',
      environment: 'You are in the water, so water‑based (not outdoor, even though the garden is outside).'
    } },

  // ---- The rest, spreading every tag ----
  { id: 'football-pitch', mode: 'photo', img: 'football-pitch.jpg',
    activity: 'Playing 11‑a‑side football',
    place: 'A full 11‑a‑side match on the grass pitch at the local club.',
    alt: 'Players in kit during a football match on a large grass pitch.',
    energy: 'active', location: 'away', environment: 'outdoor',
    why: 'Playing means taking part, so <b>active</b>. A club pitch is <b>away from home</b>, out on the grass, so <b>outdoor</b>.',
    hints: {
      energy: 'She is running and kicking — taking part, so active.',
      location: 'A club pitch is away from her own home.',
      environment: 'A grass pitch under open sky — outdoor.'
    } },
  { id: 'sailing', mode: 'photo', img: 'sailing-dinghy.jpg',
    activity: 'Sailing a dinghy',
    place: 'Sailing a small dinghy out on Carlingford Lough.',
    alt: 'A small sailing dinghy with a white sail out on open water.',
    energy: 'active', location: 'away', environment: 'water',
    why: 'Working the sail and steering is taking part, so <b>active</b>; out on the lough is <b>away from home</b>; and it happens on the water, so <b>water‑based</b>.',
    hints: {
      energy: 'Working the sail and steering the boat is taking part — active.',
      location: 'Out on the lough, well away from home.',
      environment: 'On the water — water‑based.'
    } },
  { id: 'surfing', mode: 'photo', img: 'surfing.jpg',
    activity: 'Surfing',
    place: 'Catching waves in the sea at the beach.',
    alt: 'A surfer in a wetsuit riding a wave in the sea.',
    energy: 'active', location: 'away', environment: 'water',
    why: 'Surfing takes real effort, so <b>active</b>; the beach is <b>away from home</b>; and you ride the waves, so <b>water‑based</b>.',
    hints: {
      energy: 'Paddling out and riding waves is hard work — active.',
      location: 'The beach is away from home.',
      environment: 'Out on the waves — water‑based.'
    } },
  { id: 'dance', mode: 'text', img: null,
    activity: 'A dance &amp; fitness class',
    place: 'A group dance and fitness class in a studio in town.',
    alt: 'A group of people in an exercise class following an instructor in a fitness studio.',
    energy: 'active', location: 'away', environment: 'indoor',
    why: 'Dancing means taking part, so <b>active</b>; a studio in town is <b>away from home</b>; and it is inside, so <b>indoor</b>.',
    hints: {
      energy: 'She is dancing and moving non‑stop — active.',
      location: 'A studio in town is away from home.',
      environment: 'Inside a studio under a roof — indoor.'
    } },
  { id: 'gardening', mode: 'text', img: null,
    activity: 'Gardening',
    place: 'Planting and digging in the back garden at home.',
    alt: 'A person kneeling in a back garden, planting flowers in a flower bed.',
    energy: 'active', location: 'home', environment: 'outdoor',
    why: 'Gardening keeps you busy and on your feet, so <b>active</b>. It is your own garden, so <b>home‑based</b>, but out in the open, so <b>outdoor</b> — you can be active without leaving home.',
    hints: {
      energy: 'Digging and planting is physical work — active.',
      location: 'It is her own back garden — home‑based.',
      environment: 'Outside in the garden under the sky — outdoor.'
    } },
  { id: 'dog-walk', mode: 'photo', img: 'dog-walk-park.jpg',
    activity: 'Walking the dog',
    place: 'Taking the dog for a walk around the local park.',
    alt: 'A person walking a dog along a path in a green park.',
    energy: 'active', location: 'away', environment: 'outdoor',
    why: 'Walking keeps you moving, so <b>active</b>; the park is <b>away from home</b> and out in the open, so <b>outdoor</b>.',
    hints: {
      energy: 'Walking the dog keeps you on the move — active.',
      location: 'The local park is away from home.',
      environment: 'Out in the park under the sky — outdoor.'
    } },
  { id: 'computer-games', mode: 'text', img: null,
    activity: 'Playing computer games',
    place: 'After school you play computer games in your bedroom for a while.',
    alt: '',
    energy: 'passive', location: 'home', environment: 'indoor',
    why: 'The game reacts to you, but you are sitting at a screen rather than being physically active, so it counts as <b>passive</b>; you are in your own room, so <b>home‑based</b> and <b>indoor</b>.',
    hints: {
      energy: 'You are sitting at a screen rather than being physically active — passive.',
      location: 'In your own bedroom — home‑based.',
      environment: 'Indoors in your room — indoor.'
    } },
  { id: 'home-workout', mode: 'text', img: null,
    activity: 'A home workout',
    place: 'You follow an exercise video and work out in the garage at home.',
    alt: '',
    energy: 'active', location: 'home', environment: 'indoor',
    why: 'A workout gets your heart going, so <b>active</b>; you are at home, so <b>home‑based</b>; and the garage is under a roof, so <b>indoor</b>. You do not have to leave home to be active.',
    hints: {
      energy: 'You are exercising and working up a sweat — active.',
      location: 'In your own garage at home — home‑based.',
      environment: 'Inside the garage — indoor.'
    } }
];

/* ---------- 2. Bonus statement chips (8 — two per quadrant) ----------
   side: 'home' | 'away'   type: 'pro' | 'con'
*/
const BONUS_CHIPS = [
  { text: 'It usually costs little or nothing.', side: 'home', type: 'pro',
    why: 'No entry fees and no travel — staying in is one of the cheapest ways to spend your free time.' },
  { text: 'You can do it any time, whatever the weather.', side: 'home', type: 'pro',
    why: 'You are not tied to opening hours or stopped by the rain when you are at home.' },
  { text: 'It can be less sociable — you might see fewer people.', side: 'home', type: 'con',
    why: 'Staying in on your own can mean less time with friends and fewer new faces.' },
  { text: 'You are limited to the facilities you have at home.', side: 'home', type: 'con',
    why: 'No pool, pitch, climbing wall or big screen unless you happen to own one.' },
  { text: 'You can use specialist facilities like pools, pitches and gyms.', side: 'away', type: 'pro',
    why: 'Going out gives you equipment, space and venues you could never have at home.' },
  { text: 'It is often more sociable — you meet and see other people.', side: 'away', type: 'pro',
    why: 'Going out puts you among friends, teammates and crowds.' },
  { text: 'It usually costs more once you add travel and entry.', side: 'away', type: 'con',
    why: 'Tickets, fuel, fares and food all add up when you go out.' },
  { text: 'It takes time to travel there and back.', side: 'away', type: 'con',
    why: 'Getting there and home again eats into the time you actually get to enjoy it.' }
];

const REFLECT_MODEL =
  'There is no single right answer — a strong response weighs both sides. For example: ' +
  '“I would rather spend my leisure time <b>away from home</b>, because it is far more sociable and ' +
  'I can use facilities like a swimming pool or a gym that I do not have at home. It does cost more and ' +
  'takes time to travel, but I think the wider choice of activities and seeing my friends is worth it.” ' +
  'A home‑based answer is just as valid if it is backed up: cheaper, more convenient and possible in any weather.';

/* ---------- 3. State ---------- */
const state = {
  deck: [],
  i: 0,
  cleared: 0,
  lives: 3,
  score: 0,
  streak: 0,
  picked: { energy: null, location: null, environment: null },
  sceneAttempts: 0,
  solved: false,
  audioCtx: null,
  reduceMotion: false,
  // bonus
  bDeck: [],
  bi: 0,
  bPicked: { side: null, type: null },
  bAttempts: 0,
  bSolved: false
};

/* ---------- 4. DOM ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const screens = {
  title: $('#screen-title'), game: $('#screen-game'), gameover: $('#screen-gameover'),
  bonus: $('#screen-bonus'), results: $('#screen-results')
};

/* ---------- 5. Utilities ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

function showScreen(name) {
  Object.values(screens).forEach(s => { s.hidden = true; s.classList.remove('is-active'); });
  screens[name].hidden = false;
  // next frame so the CSS transition runs; move focus to the screen's heading for AT users
  requestAnimationFrame(() => {
    screens[name].classList.add('is-active');
    const h = screens[name].querySelector('h1, h2');
    if (h) { try { h.focus({ preventScroll: true }); } catch (_) {} }
  });
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

/* ---------- 6. Audio (Web Audio synth — no files) ---------- */
function getAudio() {
  if (!state.audioCtx) {
    try { state.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (_) { return null; }
  }
  return state.audioCtx;
}
function tone(freq, dur = 0.1, type = 'sine', vol = 0.1, when = 0) {
  const ctx = getAudio(); if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}
const sfx = {
  tick()    { tone(2200, 0.012, 'square', 0.05); tone(1600, 0.02, 'square', 0.035, 0.012); },   // dial click
  shutter() { tone(1400, 0.015, 'square', 0.09); tone(700, 0.05, 'square', 0.05, 0.02); },        // camera shutter
  focus()   { [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone(f, 0.5, 'sine', 0.12, k * 0.08)); },
  judder()  { const c = getAudio(); if (!c) return; tone(150, 0.16, 'sawtooth', 0.08); tone(120, 0.18, 'sawtooth', 0.06, 0.04); },
  soft()    { tone(587.33, 0.18, 'sine', 0.09); tone(880, 0.22, 'sine', 0.08, 0.06); },
  badge()   { [659.25, 783.99, 987.77, 1318.5].forEach((f, k) => tone(f, 0.4, 'triangle', 0.11, k * 0.1)); }
};

/* ============================================================
   7. MAIN GAME
   ============================================================ */

function startGame() {
  state.deck = shuffle(SCENES);
  state.i = 0; state.cleared = 0; state.lives = 3; state.score = 0; state.streak = 0;
  renderRoll(); updateScore();
  showScreen('game');
  loadScene();
}

function loadScene() {
  const sc = state.deck[state.i];
  state.picked = { energy: null, location: null, environment: null };
  state.sceneAttempts = 0;
  state.solved = false;

  $('#hud-progress').textContent = `Scene ${state.i + 1} of ${state.deck.length}`;
  $('#scene-activity').innerHTML = sc.activity;
  $('#scene-feedback').className = 'scene-feedback';
  $('#scene-feedback').innerHTML = '';

  // Build the viewfinder media
  const media = $('#vf-media');
  media.className = 'vf-media set-0';
  media.innerHTML = '';
  const inspectBtn = $('#vf-inspect');

  if (sc.mode === 'photo' && sc.img) {
    media.classList.add('is-photo');
    const img = document.createElement('img');
    img.className = 'vf-photo';
    img.src = 'assets/' + sc.img;
    img.alt = sc.alt || sc.activity;
    img.draggable = false;
    // Graceful fallback: if the photo is missing, become a text scene
    img.addEventListener('error', () => toTextCard(media, sc));
    media.appendChild(img);
    inspectBtn.hidden = false;
  } else {
    toTextCard(media, sc);
    inspectBtn.hidden = true;
  }

  $('#vf-status').textContent = 'OUT OF FOCUS';

  // Reset dials (and re-enable them — the previous scene's correct commit disabled them)
  resetDials('#screen-game');
  $$('#screen-game .seg').forEach(s => s.disabled = false);
  $('#focus-btn').disabled = true;
  $('#focus-btn').hidden = false;
  $('#next-btn').hidden = true;
}

function toTextCard(media, sc) {
  media.classList.remove('is-photo');
  media.classList.add('is-text');
  $('#vf-inspect').hidden = true;
  media.innerHTML =
    `<div class="vf-card">
       <div class="vf-card-tag">Scene</div>
       <p class="vf-card-activity">${sc.activity}</p>
       <p class="vf-card-place">${sc.place}</p>
     </div>`;
}

/* ----- Dials (shared by game + bonus) ----- */
function resetDials(scope) {
  $$(`${scope} .seg`).forEach(b => {
    b.classList.remove('selected', 'axis-correct', 'axis-wrong');
    b.setAttribute('aria-checked', 'false');
  });
  $$(`${scope} .dial`).forEach(d => d.classList.remove('needs-attention'));
  // Roving tabindex: one tab stop per dial group (first segment), arrows move within
  $$(`${scope} .dial-track`).forEach(track => {
    $$('.seg', track).forEach((s, k) => s.setAttribute('tabindex', k === 0 ? '0' : '-1'));
  });
}

function selectSeg(btn, store, onChange) {
  const axis = btn.dataset.axis, val = btn.dataset.val;
  // clear siblings on the same axis
  $$(`.seg[data-axis="${axis}"]`, btn.closest('.dials')).forEach(s => {
    s.classList.remove('selected', 'axis-correct', 'axis-wrong');
    s.setAttribute('aria-checked', 'false');
    s.setAttribute('tabindex', '-1');
  });
  btn.classList.add('selected');
  btn.setAttribute('aria-checked', 'true');
  btn.setAttribute('tabindex', '0');
  btn.closest('.dial').classList.remove('needs-attention');
  store[axis] = val;
  sfx.tick();
  onChange();
}

// Keyboard: arrow keys move + select within a radiogroup
function dialKeydown(e, store, onChange) {
  const seg = e.target.closest('.seg');
  if (!seg) return;
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
  if (!keys.includes(e.key)) return;
  e.preventDefault();
  const group = Array.from(seg.closest('.dial-track').querySelectorAll('.seg'));
  const idx = group.indexOf(seg);
  const fwd = (e.key === 'ArrowRight' || e.key === 'ArrowDown');
  const next = group[(idx + (fwd ? 1 : group.length - 1)) % group.length];
  next.focus();
  selectSeg(next, store, onChange);
}

function gameDialsChanged() {
  // blur reflects ONLY how many dials are set (never how many are right)
  const n = ['energy', 'location', 'environment'].filter(a => state.picked[a]).length;
  const media = $('#vf-media');
  media.classList.remove('set-0', 'set-1', 'set-2', 'set-3');
  media.classList.add('set-' + n);
  $('#focus-btn').disabled = (n < 3) || state.solved;
}

/* ----- Commit (Bring into focus) ----- */
function commitFocus() {
  if (state.solved) return;
  const sc = state.deck[state.i];
  const p = state.picked;
  if (!p.energy || !p.location || !p.environment) return;

  const correct = (p.energy === sc.energy && p.location === sc.location && p.environment === sc.environment);
  state.sceneAttempts++;

  if (correct) {
    state.solved = true;
    const firstTry = (state.sceneAttempts === 1);
    if (firstTry) {
      state.streak++;
      const bonus = state.streak >= 2 ? state.streak * 10 : 0;
      state.score += 100 + bonus;
    } else {
      state.streak = 0;
      state.score += 40;
    }
    state.cleared++;
    updateScore(); renderStreak();

    // FOCUS SNAP
    const media = $('#vf-media');
    media.classList.remove('set-0', 'set-1', 'set-2', 'set-3');
    media.classList.add('focused');
    $('#vf-status').textContent = 'IN FOCUS';
    $$('#screen-game .seg.selected').forEach(s => s.classList.add('axis-correct'));
    $$('#screen-game .seg').forEach(s => s.disabled = true);
    $('#focus-btn').hidden = true;
    sfx.shutter(); setTimeout(() => sfx.focus(), 90);

    const fb = $('#scene-feedback');
    fb.className = 'scene-feedback ok';
    fb.innerHTML = `<span class="fb-icon">✓</span> <span>${sc.why}</span>`;
    $('#next-btn').hidden = false;
    $('#next-btn').textContent = (state.i < state.deck.length - 1) ? 'Next scene →' : 'Finish the roll →';
    $('#next-btn').focus();
  } else {
    // WRONG — lose a shot, judder, scaffold on the 2nd+ attempt
    state.lives--; state.streak = 0; renderStreak(); renderRoll();
    sfx.judder();
    const vf = $('#viewfinder');
    vf.classList.remove('shake'); void vf.offsetWidth; vf.classList.add('shake');

    if (state.lives <= 0) {
      // Lock all controls immediately so a click inside the 650ms can't continue past game over
      $('#focus-btn').disabled = true;
      $$('#screen-game .seg').forEach(s => s.disabled = true);
      setTimeout(gameOver, 650);
      return;
    }

    const fb = $('#scene-feedback');
    if (state.sceneAttempts === 1) {
      // First miss: no per-axis leak — just push them back to the place
      fb.className = 'scene-feedback warn';
      fb.innerHTML = `<span class="fb-icon">⌖</span> <span>Still out of focus. Look again at <b>where</b> this is happening, then adjust your dials.</span>`;
    } else {
      // Retry scaffold: tick the correct dials, flag + hint the wrong one(s)
      const wrong = [];
      ['energy', 'location', 'environment'].forEach(axis => {
        const segSel = $(`#screen-game .seg[data-axis="${axis}"].selected`);
        const dial = $(`#screen-game .dial[data-axis="${axis}"]`);
        if (p[axis] === sc[axis]) {
          if (segSel) segSel.classList.add('axis-correct');
          dial.classList.remove('needs-attention');
        } else {
          if (segSel) segSel.classList.add('axis-wrong');
          dial.classList.add('needs-attention');
          wrong.push(axis);
        }
      });
      const labels = { energy: 'Energy', location: 'Location', environment: 'Environment' };
      const hintHtml = wrong.map(a => `<li><b>${labels[a]}:</b> ${sc.hints[a]}</li>`).join('');
      fb.className = 'scene-feedback hint';
      fb.innerHTML = `<span class="fb-icon">🔎</span><div><p>The ticked dials are right. Look again here:</p><ul class="hint-list">${hintHtml}</ul></div>`;
    }
  }
}

function nextScene() {
  state.i++;
  if (state.i < state.deck.length) {
    loadScene();
  } else {
    startBonus();
  }
}

function gameOver() {
  $('#go-cleared').textContent = state.cleared;
  $('#go-score').textContent = state.score;
  showScreen('gameover');
}

/* ----- HUD ----- */
function renderRoll() {
  const roll = $('#hud-roll');
  roll.innerHTML = '';
  for (let k = 0; k < 3; k++) {
    const dot = document.createElement('span');
    dot.className = 'roll-dot' + (k < state.lives ? ' live' : ' spent');
    dot.textContent = k < state.lives ? '●' : '○';
    roll.appendChild(dot);
  }
  roll.setAttribute('aria-label', `${state.lives} spare ${state.lives === 1 ? 'shot' : 'shots'} remaining`);
}
function updateScore() { $('#hud-score').textContent = state.score; }
function renderStreak() {
  const s = $('#hud-streak');
  if (state.streak >= 2) { s.hidden = false; $('#hud-streak-n').textContent = state.streak; }
  else s.hidden = true;
}

/* ============================================================
   8. BONUS ROUND
   ============================================================ */
function startBonus() {
  const home = SCENES.filter(s => s.location === 'home').length;
  const away = SCENES.filter(s => s.location === 'away').length;
  const tail = away > home ? 'so most were <b>away from home</b>'
    : home > away ? 'so most were <b>home‑based</b>'
    : 'so they were <b>evenly split</b>';
  $('#bonus-runline').innerHTML =
    `On the ${SCENES.length} scenes you just classified, <b>${home}</b> were home‑based and <b>${away}</b> were away from home — ${tail}. As you weigh up the two, think about <em>why</em> that might be.`;

  state.bDeck = shuffle(BONUS_CHIPS);
  state.bi = 0;
  // clear board
  ['bb-home-pro', 'bb-home-con', 'bb-away-pro', 'bb-away-con'].forEach(id => { $('#' + id).innerHTML = ''; });
  showScreen('bonus');
  loadChip();
}

function loadChip() {
  const c = state.bDeck[state.bi];
  state.bPicked = { side: null, type: null };
  state.bAttempts = 0;
  state.bSolved = false;
  $('#chip-counter').textContent = `Statement ${state.bi + 1} of ${state.bDeck.length}`;
  $('#bonus-chip').textContent = c.text;
  $('#bonus-chip').classList.remove('developed');
  $('#bonus-feedback').className = 'scene-feedback';
  $('#bonus-feedback').innerHTML = '';
  resetDials('#screen-bonus');
  $$('#screen-bonus .seg').forEach(s => s.disabled = false);
  $('#develop-btn').disabled = true;
  $('#develop-btn').hidden = false;
  $('#bonus-next-btn').hidden = true;
}

function bonusDialsChanged() {
  const ready = state.bPicked.side && state.bPicked.type;
  $('#develop-btn').disabled = !ready || state.bSolved;
}

function developChip() {
  if (state.bSolved) return;
  const c = state.bDeck[state.bi];
  const p = state.bPicked;
  if (!p.side || !p.type) return;
  const correct = (p.side === c.side && p.type === c.type);
  state.bAttempts++;

  if (correct) {
    state.bSolved = true;
    if (state.bAttempts === 1) state.score += 30; else state.score += 15;
    updateScore();
    sfx.soft();
    $('#bonus-chip').classList.add('developed');
    $$('#screen-bonus .seg.selected').forEach(s => s.classList.add('axis-correct'));
    $$('#screen-bonus .seg').forEach(s => s.disabled = true);
    // file it onto the board
    const listId = `bb-${c.side}-${c.type}`;
    const li = document.createElement('li');
    li.className = 'bb-item just-in';
    li.innerHTML = `<span class="bb-item-text">${c.text}</span><span class="bb-item-why">${c.why}</span>`;
    $('#' + listId).appendChild(li);
    setTimeout(() => li.classList.remove('just-in'), 600);

    const fb = $('#bonus-feedback');
    fb.className = 'scene-feedback ok';
    const sideLabel = c.side === 'home' ? 'at home' : 'away from home';
    const typeLabel = c.type === 'pro' ? 'strength' : 'drawback';
    fb.innerHTML = `<span class="fb-icon">✓</span> <span>A <b>${typeLabel}</b> of leisure <b>${sideLabel}</b>. ${c.why}</span>`;
    $('#develop-btn').hidden = true;
    $('#bonus-next-btn').hidden = false;
    $('#bonus-next-btn').textContent = (state.bi < state.bDeck.length - 1) ? 'Next →' : 'See my results →';
    $('#bonus-next-btn').focus();
  } else {
    sfx.judder();
    const chip = $('#bonus-chip');
    chip.classList.remove('shake'); void chip.offsetWidth; chip.classList.add('shake');
    const fb = $('#bonus-feedback');
    if (state.bAttempts === 1) {
      fb.className = 'scene-feedback warn';
      fb.innerHTML = `<span class="fb-icon">⌖</span> <span>Not quite. Is this statement really about <b>${state.bPicked.side === 'home' ? 'being at home' : 'going out'}</b>? Re‑read it and try the dials again.</span>`;
    } else {
      // gentle reveal of which dial is off (bonus never ends the run)
      const sideOff = state.bPicked.side !== c.side;
      const typeOff = state.bPicked.type !== c.type;
      $$('#screen-bonus .seg.selected').forEach(s => {
        const axis = s.dataset.axis;
        const off = (axis === 'side' && sideOff) || (axis === 'type' && typeOff);
        s.classList.add(off ? 'axis-wrong' : 'axis-correct');
        if (off) s.closest('.dial').classList.add('needs-attention');
      });
      const tips = [];
      if (sideOff) tips.push('think about which side — <b>at home</b> or <b>away from home</b> — this is really describing');
      if (typeOff) tips.push('decide whether it is a good thing (<b>strength</b>) or a bad thing (<b>drawback</b>)');
      fb.className = 'scene-feedback hint';
      fb.innerHTML = `<span class="fb-icon">🔎</span> <span>Closer — now ${tips.join(', and ')}.</span>`;
    }
  }
}

function nextChip() {
  state.bi++;
  if (state.bi < state.bDeck.length) loadChip();
  else showResults();
}

/* ============================================================
   9. RESULTS
   ============================================================ */
function showResults() {
  // Reset the reflection so a fresh run starts blank (not showing last run's revealed model answer)
  $('#reflect-model').hidden = true;
  $('#reflect-model').innerHTML = '';
  $('#reflect-reveal').hidden = false;
  $('#reflect-box').value = '';
  $('#res-cleared').textContent = state.cleared;
  $('#res-score').textContent = state.score;
  $('#res-shots').textContent = state.lives;
  const sharp = (state.lives === 3 && state.cleared === SCENES.length);
  const badge = $('#res-badge');
  badge.hidden = !sharp;
  $('#res-emoji').textContent = sharp ? '🏆' : '📸';
  if (sharp) sfx.badge(); else sfx.soft();
  showScreen('results');
}

/* ============================================================
   10. Look-closer lightbox
   ============================================================ */
function openLightbox() {
  const sc = state.deck[state.i];
  if (sc.mode !== 'photo' || !sc.img) return;
  state.lbOpener = document.activeElement;
  const inner = $('#lb-inner');
  const setClass = $('#vf-media').className.match(/set-\d|focused/g) || ['set-3'];
  inner.innerHTML =
    `<figure class="lb-figure vf-media is-photo ${setClass.join(' ')}">
       <img class="vf-photo" src="assets/${sc.img}" alt="${sc.alt || sc.activity}" draggable="false" />
       <figcaption>Study where this is happening — then set your dials.</figcaption>
     </figure>`;
  $('#lightbox').hidden = false;
}
function closeLightbox() {
  if ($('#lightbox').hidden) return;
  $('#lightbox').hidden = true;
  $('#lb-inner').innerHTML = '';
  if (state.lbOpener) { try { state.lbOpener.focus(); } catch (_) {} state.lbOpener = null; }
}

/* ============================================================
   11. Image credits (loaded from the photo manifest)
   ============================================================ */
function loadCredits() {
  fetch('assets/photo-manifest.json')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(list => {
      const rows = (Array.isArray(list) ? list : [])
        .filter(e => e && e.credit && e.status === 'ok')
        .map(e => `<li>${escapeHTML(altSubject(e))} — ${escapeHTML(e.credit.author || 'Unknown')} (${escapeHTML(e.credit.licence || '')})</li>`);
      const wrap = $('#credits-list');
      if (rows.length) {
        wrap.innerHTML = `<p>Photographs via Wikimedia Commons, used under their stated licences:</p><ul>${rows.join('')}</ul>`;
      } else {
        wrap.innerHTML = `<p>Photographs are from Wikimedia Commons, used under their stated licences. Text scenes use no photographs.</p>`;
      }
    })
    .catch(() => {
      $('#credits-list').innerHTML = `<p>Photographs are from Wikimedia Commons, used under their stated licences (CC0 / public domain / CC BY / CC BY‑SA). See assets/CREDITS.md for full provenance.</p>`;
    });
}
function altSubject(e) {
  const sc = SCENES.find(s => s.img === e.file);
  return sc ? sc.activity.replace(/&amp;/g, '&') : (e.id || 'Photograph');
}
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ============================================================
   12. Wiring
   ============================================================ */
function applyReduceMotion(on) {
  state.reduceMotion = on;
  document.body.classList.toggle('reduce-motion', on);
}

function init() {
  // honour the OS setting by default
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) { applyReduceMotion(true); $('#motion-toggle-input').checked = true; }
  $('#motion-toggle-input').addEventListener('change', e => applyReduceMotion(e.target.checked));

  $('#start-btn').addEventListener('click', startGame);
  $('#retry-btn').addEventListener('click', startGame);
  $('#playagain-btn').addEventListener('click', startGame);

  // Game dials
  $('#dials').addEventListener('click', e => {
    const seg = e.target.closest('.seg'); if (!seg || seg.disabled) return;
    selectSeg(seg, state.picked, gameDialsChanged);
  });
  $('#dials').addEventListener('keydown', e => dialKeydown(e, state.picked, gameDialsChanged));
  $('#focus-btn').addEventListener('click', commitFocus);
  $('#next-btn').addEventListener('click', nextScene);

  // Bonus dials
  $('.bonus-dials').addEventListener('click', e => {
    const seg = e.target.closest('.seg'); if (!seg || seg.disabled) return;
    selectSeg(seg, state.bPicked, bonusDialsChanged);
  });
  $('.bonus-dials').addEventListener('keydown', e => dialKeydown(e, state.bPicked, bonusDialsChanged));
  $('#develop-btn').addEventListener('click', developChip);
  $('#bonus-next-btn').addEventListener('click', nextChip);

  // Lightbox
  $('#vf-inspect').addEventListener('click', openLightbox);
  $('#lb-close').addEventListener('click', closeLightbox);
  $('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });

  // Reflection model answer
  $('#reflect-reveal').addEventListener('click', () => {
    const m = $('#reflect-model');
    m.hidden = false;
    m.innerHTML = REFLECT_MODEL;
    $('#reflect-reveal').hidden = true;
  });

  // Credits
  $('#credits-toggle').addEventListener('click', () => {
    const l = $('#credits-list'); l.hidden = !l.hidden;
  });
  loadCredits();

  // Global Escape closes lightbox
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
}

document.addEventListener('DOMContentLoaded', init);
