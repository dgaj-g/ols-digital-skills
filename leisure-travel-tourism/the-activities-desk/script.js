/* ============================================================
   The Activities Desk — Classifying Leisure Activities (CCEA LTT)
   ------------------------------------------------------------
   You are the activities coordinator at a tourist-information desk.
   Read each CLEAR activity card, set three tags (Energy / Location /
   Environment) and FILE IT — correct cards build the resort brochure;
   wrong ones go to the corrections pile until you fix them.
   The scene is ALWAYS fully legible; the reward is the brochure
   filling up, never un-hiding the picture.
   Pure HTML/CSS/JS. Tap/click/keyboard — no drag in the main loop.
   ============================================================ */

'use strict';

/* ---------- 1. Scene data (16 scenes, three tags each) ----------
   energy: 'active'|'passive'  location: 'home'|'away'  environment: 'indoor'|'outdoor'|'water'
   `caption` = the place/context shown on the card. It names WHERE/what
   without ever using a classification word (active/passive/home/away/
   indoor/outdoor/water) — so reading the place is required, not given.
   `alt` describes only what is visible (place + activity), never a tag.
*/
const SCENES = [
  // ---- Flip pair A: reading ----
  { id: 'reading-bed', mode: 'photo', img: 'reading-bedroom.jpg', flip: 'reading',
    activity: 'Reading a book',
    caption: 'Curled up on your own bed with a lamp on and music playing.',
    alt: 'A girl lying on a bed in a cosy bedroom, reading a book by a lamp.',
    energy: 'passive', location: 'home', environment: 'indoor',
    why: 'Reading is a <b>passive</b> activity — you take it in rather than take part. She is on her own bed, so it is <b>home‑based</b>, and a bedroom is under a roof, so <b>indoor</b>.',
    hints: { energy: 'Reading means taking it in, not taking part.', location: 'Her own bed and bedroom — this is inside her own home.', environment: 'Four walls and a ceiling — she is under a roof.' } },
  { id: 'reading-pool', mode: 'text', img: null, flip: 'reading',
    activity: 'Reading a book',
    caption: 'On a sun‑lounger beside the hotel pool while you are on holiday.',
    alt: '',
    energy: 'passive', location: 'away', environment: 'outdoor',
    why: 'Same activity, different place. Reading is still <b>passive</b>, but a hotel pool on holiday is <b>away from home</b>, and the loungers sit out under open sky, so <b>outdoor</b>. (She is beside the pool, not in it.)',
    hints: { energy: 'It is the same reading — relaxing with a book.', location: 'A hotel pool on holiday is well away from her own home.', environment: 'Open sky and loungers in the sun — she is outside, and not in the water.' } },

  // ---- Flip pair B: watching the football ----
  { id: 'tv-sport', mode: 'text', img: null, flip: 'watch-football',
    activity: 'Watching the football',
    caption: 'Feet up on the sofa, watching the match on the telly.',
    alt: '',
    energy: 'passive', location: 'home', environment: 'indoor',
    why: 'Watching the match is <b>passive</b> — she is a spectator, not a player. It is her own living room, so <b>home‑based</b> and <b>indoor</b>.',
    hints: { energy: 'She is watching the match, not playing in it.', location: 'On her own sofa in the living room.', environment: 'Indoors under a roof.' } },
  { id: 'stadium', mode: 'photo', img: 'stadium-crowd.jpg', flip: 'watch-football',
    activity: 'Watching the football',
    caption: 'In the crowd at a packed stadium, watching the match live.',
    alt: 'A huge crowd fills the open stands of a football stadium, many holding coloured cards forming a mosaic, with sky and hills beyond.',
    energy: 'passive', location: 'away', environment: 'outdoor',
    why: 'Same activity, different place. Watching is still <b>passive</b>, but a stadium is <b>away from home</b>, and the open stands are out in the air, so <b>outdoor</b>.',
    hints: { energy: 'She is a spectator watching the match, just like on the sofa.', location: 'A stadium is away from her own home.', environment: 'Open‑air stands under the sky.' } },

  // ---- Flip pair C: cycling (the CCEA factfile signature pair) ----
  { id: 'cycling-club', mode: 'photo', img: 'cycling-club.jpg', flip: 'cycling',
    activity: 'Cycling with the club',
    caption: 'Out on the country roads with the local cycling club.',
    alt: 'A group of cyclists in helmets and kit riding road bikes together along a road.',
    energy: 'active', location: 'away', environment: 'outdoor',
    why: 'Cycling with the club means pedalling and taking part, so <b>active</b>. You are out on the roads, so <b>away from home</b> and <b>outdoor</b>.',
    hints: { energy: 'You are pedalling and keeping up with the group.', location: 'Out on the roads with the club, well away from home.', environment: 'Out on the open road in the air.' } },
  { id: 'cycling-tv', mode: 'text', img: null, flip: 'cycling',
    activity: 'Watching the cycling',
    caption: 'Watching the big cycling race on the telly in the living room.',
    alt: '',
    energy: 'passive', location: 'home', environment: 'indoor',
    why: 'Same sport, but you are only watching it. Watching is <b>passive</b>, you are in your own living room, so <b>home‑based</b> and <b>indoor</b>. The place changes everything.',
    hints: { energy: 'You are watching the race on screen, not riding in it.', location: 'In your own living room.', environment: 'Indoors on the sofa.' } },

  // ---- Water-based teaching scenes (water beats indoor/outdoor) ----
  { id: 'indoor-pool', mode: 'photo', img: 'indoor-pool.jpg',
    activity: 'Swimming lengths',
    caption: 'Doing lengths at the local leisure‑centre pool.',
    alt: 'A large public swimming pool inside a leisure centre, with swimmers in the water.',
    energy: 'active', location: 'away', environment: 'water',
    why: 'Swimming means taking part, so <b>active</b>; the leisure centre is <b>away from home</b>. The pool is indoors, but anything done in water is classed as <b>water‑based</b> — water beats indoor or outdoor.',
    hints: { energy: 'Swimming lengths is hard work — she is taking part.', location: 'The leisure centre is away from her own home.', environment: 'She is in the water — on or in water is always water‑based, even an indoor pool.' } },
  { id: 'hot-tub', mode: 'photo', img: 'hot-tub.jpg',
    activity: 'Relaxing in the hot tub',
    caption: 'Unwinding in the hot tub out in the back garden.',
    alt: 'A round wood-fired hot tub on a brick patio in a back garden, with a fence and hills behind.',
    energy: 'passive', location: 'home', environment: 'water',
    why: 'You are relaxing, not doing anything energetic, so <b>passive</b>; it is your own garden, so <b>home‑based</b>; and because you are sitting in the water it is <b>water‑based</b> — water beats indoor or outdoor again.',
    hints: { energy: 'You are unwinding, not exercising.', location: 'Your own back garden.', environment: 'You are sitting in the water, so water‑based (not outdoor, even though the garden is outside).' } },

  // ---- The rest, spreading every tag ----
  { id: 'football-pitch', mode: 'photo', img: 'football-pitch.jpg',
    activity: 'Playing 11‑a‑side football',
    caption: 'An 11‑a‑side match on the grass pitch at the local club.',
    alt: 'Players in kit during a football match on a large grass pitch.',
    energy: 'active', location: 'away', environment: 'outdoor',
    why: 'Playing means taking part, so <b>active</b>. A club pitch is <b>away from home</b>, out on the grass, so <b>outdoor</b>.',
    hints: { energy: 'She is running and kicking — taking part.', location: 'A club pitch is away from her own home.', environment: 'A grass pitch under open sky.' } },
  { id: 'sailing', mode: 'photo', img: 'sailing-dinghy.jpg',
    activity: 'Sailing a dinghy',
    caption: 'Sailing a dinghy out on Carlingford Lough.',
    alt: 'A small sailing dinghy with a white sail out on open water.',
    energy: 'active', location: 'away', environment: 'water',
    why: 'Working the sail and steering is taking part, so <b>active</b>; out on the lough is <b>away from home</b>; and it happens on the water, so <b>water‑based</b>.',
    hints: { energy: 'Working the sail and steering the boat is taking part.', location: 'Out on the lough, well away from home.', environment: 'On the water.' } },
  { id: 'surfing', mode: 'photo', img: 'surfing.jpg',
    activity: 'Surfing',
    caption: 'Catching waves in the sea at the beach.',
    alt: 'A surfer in a wetsuit riding a wave in the sea.',
    energy: 'active', location: 'away', environment: 'water',
    why: 'Surfing takes real effort, so <b>active</b>; the beach is <b>away from home</b>; and you ride the waves, so <b>water‑based</b>.',
    hints: { energy: 'Paddling out and riding waves is hard work.', location: 'The beach is away from home.', environment: 'Out on the waves.' } },
  { id: 'dance', mode: 'photo', img: 'dance-class.jpg',
    activity: 'A dance &amp; fitness class',
    caption: 'A dance and fitness class at a studio in town.',
    alt: 'People in a bright fitness studio taking a step-aerobics class with small dumbbells, exercise balls on a rack behind.',
    energy: 'active', location: 'away', environment: 'indoor',
    why: 'Dancing means taking part, so <b>active</b>; a studio in town is <b>away from home</b>; and it is inside, so <b>indoor</b>.',
    hints: { energy: 'She is dancing and moving non‑stop.', location: 'A studio in town is away from home.', environment: 'Inside a studio under a roof.' } },
  { id: 'gardening', mode: 'photo', img: 'gardening.jpg',
    activity: 'Gardening',
    caption: 'Planting and digging in your own back garden.',
    alt: 'A person using a hoe to dig over a garden bed in a back garden, with a house and greenery behind.',
    energy: 'active', location: 'home', environment: 'outdoor',
    why: 'Gardening keeps you busy and on your feet, so <b>active</b>. It is your own garden, so <b>home‑based</b>, but out in the open, so <b>outdoor</b> — you can be active without leaving home.',
    hints: { energy: 'Digging and planting is physical work.', location: 'It is your own back garden.', environment: 'Outside in the garden under the sky.' } },
  { id: 'dog-walk', mode: 'photo', img: 'dog-walk-park.jpg',
    activity: 'Walking the dog',
    caption: 'Taking the dog round the local park.',
    alt: 'A person walking a dog along a path in a green park.',
    energy: 'active', location: 'away', environment: 'outdoor',
    why: 'Walking keeps you moving, so <b>active</b>; the park is <b>away from home</b> and out in the open, so <b>outdoor</b>.',
    hints: { energy: 'Walking the dog keeps you on the move.', location: 'The local park is away from home.', environment: 'Out in the park under the sky.' } },
  { id: 'computer-games', mode: 'photo', img: 'computer-games.jpg',
    activity: 'Playing computer games',
    caption: 'On the family sofa with a games controller and snacks.',
    alt: 'People relaxing on a sofa in a living room, one holding a games controller, with snacks on the table.',
    energy: 'passive', location: 'home', environment: 'indoor',
    why: 'The game reacts to you, but you are sitting at a screen rather than being physically active, so it counts as <b>passive</b>; you are at home, so <b>home‑based</b> and <b>indoor</b>.',
    hints: { energy: 'You are sitting at a screen rather than being physically active.', location: 'On the family sofa at home.', environment: 'Indoors in the living room.' } },
  { id: 'home-workout', mode: 'text', img: null,
    activity: 'Doing a workout',
    caption: 'Following an exercise video out in the garage.',
    alt: '',
    energy: 'active', location: 'home', environment: 'indoor',
    why: 'A workout gets your heart going, so <b>active</b>; you are at home, so <b>home‑based</b>; and the garage is under a roof, so <b>indoor</b>. You do not have to leave home to be active.',
    hints: { energy: 'You are exercising and working up a sweat.', location: 'In your own garage at home.', environment: 'Inside the garage.' } }
];

/* ---------- 2. Bonus statement chips (8 — two per quadrant) ---------- */
const BONUS_CHIPS = [
  { text: 'It usually costs little or nothing.', side: 'home', type: 'pro', why: 'No entry fees and no travel — staying in is one of the cheapest ways to spend your free time.' },
  { text: 'You can do it any time, whatever the weather.', side: 'home', type: 'pro', why: 'You are not tied to opening hours or stopped by the rain when you are at home.' },
  { text: 'It can be less sociable — you might see fewer people.', side: 'home', type: 'con', why: 'Staying in on your own can mean less time with friends and fewer new faces.' },
  { text: 'You are limited to the facilities you have at home.', side: 'home', type: 'con', why: 'No pool, pitch, climbing wall or big screen unless you happen to own one.' },
  { text: 'You can use specialist facilities like pools, pitches and gyms.', side: 'away', type: 'pro', why: 'Going out gives you equipment, space and venues you could never have at home.' },
  { text: 'It is often more sociable — you meet and see other people.', side: 'away', type: 'pro', why: 'Going out puts you among friends, teammates and crowds.' },
  { text: 'It usually costs more once you add travel and entry.', side: 'away', type: 'con', why: 'Tickets, fuel, fares and food all add up when you go out.' },
  { text: 'It takes time to travel there and back.', side: 'away', type: 'con', why: 'Getting there and home again eats into the time you actually get to enjoy it.' }
];

const REFLECT_MODEL =
  'There is no single right answer — a strong response weighs both sides. For example: ' +
  '“I would rather spend my leisure time <b>away from home</b>, because it is far more sociable and ' +
  'I can use facilities like a swimming pool or a gym that I do not have at home. It does cost more and ' +
  'takes time to travel, but I think the wider choice of activities and seeing my friends is worth it.” ' +
  'A home‑based answer is just as valid if it is backed up: cheaper, more convenient and possible in any weather.';

/* Tag display + the colour code per axis (used on stamps + brochure thumbnails) */
const TAG_LABEL = { active: 'Active', passive: 'Passive', home: 'Home‑based', away: 'Away from home', indoor: 'Indoor', outdoor: 'Outdoor', water: 'Water‑based' };

/* ---------- 3. State ---------- */
const state = {
  deck: [], i: 0, filed: 0, firstTry: 0, score: 0, corrections: 0,
  picked: { energy: null, location: null, environment: null },
  attempts: 0, solved: false,
  audioCtx: null, reduceMotion: false, lbOpener: null,
  bDeck: [], bi: 0, bPicked: { side: null, type: null }, bAttempts: 0, bSolved: false
};

/* ---------- 4. DOM ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const screens = {
  title: $('#screen-title'), game: $('#screen-game'), bonus: $('#screen-bonus'), results: $('#screen-results')
};

/* ---------- 5. Utilities ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
  return a;
}
function showScreen(name) {
  Object.values(screens).forEach(s => { s.hidden = true; s.classList.remove('is-active'); });
  screens[name].hidden = false;
  requestAnimationFrame(() => {
    screens[name].classList.add('is-active');
    const h = screens[name].querySelector('h1, h2');
    if (h) { try { h.focus({ preventScroll: true }); } catch (_) {} }
  });
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------- 6. Audio (Web Audio synth — no files) ---------- */
function getAudio() { if (!state.audioCtx) { try { state.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } } return state.audioCtx; }
function tone(freq, dur = 0.1, type = 'sine', vol = 0.1, when = 0) {
  const ctx = getAudio(); if (!ctx) return;
  const t0 = ctx.currentTime + when, osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(ctx.destination); osc.start(t0); osc.stop(t0 + dur + 0.02);
}
const sfx = {
  tick()  { tone(2100, 0.012, 'square', 0.05); tone(1500, 0.02, 'square', 0.035, 0.012); },   // tag set
  stamp() { tone(220, 0.05, 'square', 0.10); tone(140, 0.09, 'sine', 0.07, 0.02); },            // ink stamp thunk
  file()  { [523.25, 659.25, 783.99].forEach((f, k) => tone(f, 0.28, 'sine', 0.10, k * 0.06)); }, // card files in
  reject(){ tone(150, 0.16, 'sawtooth', 0.08); tone(120, 0.18, 'sawtooth', 0.06, 0.04); },        // bounce to corrections
  soft()  { tone(587.33, 0.18, 'sine', 0.09); tone(880, 0.22, 'sine', 0.08, 0.06); },
  badge() { [659.25, 783.99, 987.77, 1318.5].forEach((f, k) => tone(f, 0.4, 'triangle', 0.11, k * 0.1)); }
};

/* ============================================================
   7. THE DESK (main game)
   ============================================================ */
function startGame() {
  state.deck = shuffle(SCENES);
  state.i = 0; state.filed = 0; state.firstTry = 0; state.score = 0; state.corrections = 0;
  $('#bro-home').innerHTML = ''; $('#bro-away').innerHTML = '';
  updateCounters();
  showScreen('game');
  loadCard();
}

function loadCard() {
  const sc = state.deck[state.i];
  state.picked = { energy: null, location: null, environment: null };
  state.attempts = 0; state.solved = false;

  $('#hud-progress').textContent = `Enquiry ${state.i + 1} of ${state.deck.length}`;

  // Build the card (always fully legible)
  const card = $('#card');
  card.className = 'card ' + (sc.mode === 'photo' && sc.img ? 'is-photo' : 'is-slip');
  const inspect = (sc.mode === 'photo' && sc.img)
    ? `<button class="card-inspect" id="card-inspect" type="button">🔍 Look closer</button>` : '';
  if (sc.mode === 'photo' && sc.img) {
    card.innerHTML =
      `<div class="card-photo-wrap">
         <img class="card-photo" src="assets/${escapeHTML(sc.img)}" alt="${escapeHTML(sc.alt || sc.activity)}" draggable="false" />
         ${inspect}
       </div>
       <div class="card-body">
         <p class="card-activity">${sc.activity}</p>
         <p class="card-caption">${escapeHTML(sc.caption)}</p>
       </div>`;
    const img = card.querySelector('.card-photo');
    img.addEventListener('error', () => { card.className = 'card is-slip'; renderSlip(card, sc); });
    const ib = card.querySelector('#card-inspect');
    if (ib) ib.addEventListener('click', openLightbox);
  } else {
    renderSlip(card, sc);
  }

  // reset tags + file button
  resetDials('#screen-game');
  $$('#screen-game .seg').forEach(s => s.disabled = false);
  $('#file-btn').disabled = true; $('#file-btn').hidden = false;
  $('#next-btn').hidden = true;
  const fb = $('#desk-feedback'); fb.className = 'desk-feedback'; fb.innerHTML = '';
  const stamp = $('#stamp'); stamp.hidden = true; stamp.className = 'stamp';
}

function renderSlip(card, sc) {
  card.innerHTML =
    `<div class="slip">
       <div class="slip-head"><span class="slip-clip" aria-hidden="true"></span><span class="slip-tag">Guest enquiry</span></div>
       <p class="card-activity">${sc.activity}</p>
       <p class="card-caption big">${escapeHTML(sc.caption)}</p>
     </div>`;
}

/* ----- Tag controls (shared with bonus) ----- */
function resetDials(scope) {
  $$(`${scope} .seg`).forEach(b => { b.classList.remove('selected', 'axis-correct', 'axis-wrong'); b.setAttribute('aria-checked', 'false'); });
  $$(`${scope} .dial`).forEach(d => d.classList.remove('needs-attention'));
  $$(`${scope} .dial-track`).forEach(track => { $$('.seg', track).forEach((s, k) => s.setAttribute('tabindex', k === 0 ? '0' : '-1')); });
}
function selectSeg(btn, store, onChange) {
  const axis = btn.dataset.axis, val = btn.dataset.val;
  $$(`.seg[data-axis="${axis}"]`, btn.closest('.dials')).forEach(s => {
    s.classList.remove('selected', 'axis-correct', 'axis-wrong'); s.setAttribute('aria-checked', 'false'); s.setAttribute('tabindex', '-1');
  });
  btn.classList.add('selected'); btn.setAttribute('aria-checked', 'true'); btn.setAttribute('tabindex', '0');
  btn.closest('.dial').classList.remove('needs-attention');
  store[axis] = val; sfx.tick(); onChange();
}
function dialKeydown(e, store, onChange) {
  const seg = e.target.closest('.seg'); if (!seg) return;
  if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const group = Array.from(seg.closest('.dial-track').querySelectorAll('.seg'));
  const idx = group.indexOf(seg), fwd = (e.key === 'ArrowRight' || e.key === 'ArrowDown');
  const next = group[(idx + (fwd ? 1 : group.length - 1)) % group.length];
  next.focus(); selectSeg(next, store, onChange);
}
function gameDialsChanged() {
  const n = ['energy', 'location', 'environment'].filter(a => state.picked[a]).length;
  $('#file-btn').disabled = (n < 3) || state.solved;
}

/* ----- File it (commit) ----- */
function fileCard() {
  if (state.solved) return;
  const sc = state.deck[state.i], p = state.picked;
  if (!p.energy || !p.location || !p.environment) return;
  const correct = (p.energy === sc.energy && p.location === sc.location && p.environment === sc.environment);
  state.attempts++;

  if (correct) {
    state.solved = true;
    const firstTry = (state.attempts === 1);
    if (firstTry) { state.firstTry++; state.score += 100; } else { state.score += 40; }
    state.filed++;
    updateCounters();

    $$('#screen-game .seg.selected').forEach(s => s.classList.add('axis-correct'));
    $$('#screen-game .seg').forEach(s => s.disabled = true);
    showStamp(true);
    sfx.stamp(); setTimeout(() => sfx.file(), 160);
    fileIntoBrochure(sc, firstTry);

    const fb = $('#desk-feedback');
    fb.className = 'desk-feedback ok';
    fb.innerHTML = `<span class="fb-icon">✓</span> <span><b>Filed into the brochure.</b> ${sc.why}</span>`;
    $('#file-btn').hidden = true;
    $('#next-btn').hidden = false;
    $('#next-btn').textContent = (state.i < state.deck.length - 1) ? 'Next enquiry →' : 'Finish & print the brochure →';
    $('#next-btn').focus();
  } else {
    if (state.attempts === 1) { state.corrections++; updateCounters(); }
    showStamp(false);
    sfx.reject();
    const card = $('#card'); card.classList.remove('bounce'); void card.offsetWidth; card.classList.add('bounce');

    // Per-axis correction: lock the right tags, flag the wrong one(s)
    const wrong = [];
    ['energy', 'location', 'environment'].forEach(axis => {
      const segSel = $(`#screen-game .seg[data-axis="${axis}"].selected`);
      const dial = $(`#screen-game .dial[data-axis="${axis}"]`);
      if (p[axis] === sc[axis]) {
        if (segSel) segSel.classList.add('axis-correct'); dial.classList.remove('needs-attention');
        $$(`#screen-game .seg[data-axis="${axis}"]`).forEach(s => s.disabled = true);   // lock correct tags so they can't be un-picked
      } else { if (segSel) segSel.classList.add('axis-wrong'); dial.classList.add('needs-attention'); wrong.push(axis); }
    });
    const labels = { energy: 'Energy', location: 'Location', environment: 'Environment' };
    const fb = $('#desk-feedback');
    if (state.attempts === 1) {
      // name the axis to reconsider, but not the answer
      const list = wrong.map(a => `<b>${labels[a]}</b>`).join(' and ');
      fb.className = 'desk-feedback warn';
      fb.innerHTML = `<span class="fb-icon">↩</span> <span>Back to the corrections pile. The green tags are right — look again at the ${list} tag: read <b>where</b> this is happening.</span>`;
    } else {
      // give the place clue for each wrong axis
      const hintHtml = wrong.map(a => `<li><b>${labels[a]}:</b> ${sc.hints[a]}</li>`).join('');
      fb.className = 'desk-feedback hint';
      fb.innerHTML = `<span class="fb-icon">🔎</span><div><p>Still in corrections — here is what to look at:</p><ul class="hint-list">${hintHtml}</ul></div>`;
    }
  }
}

function showStamp(ok) {
  const stamp = $('#stamp');
  stamp.hidden = false;
  stamp.className = 'stamp ' + (ok ? 'ok' : 'no');
  stamp.textContent = ok ? 'FILED' : 'CHECK';
  if (!ok) setTimeout(() => { if (!state.solved) stamp.hidden = true; }, 900);
}

function nextCard() {
  state.i++;
  if (state.i < state.deck.length) loadCard();
  else startBonus();
}

/* ----- Brochure (the reward) ----- */
function fileIntoBrochure(sc, firstTry) {
  const list = $(sc.location === 'home' ? '#bro-home' : '#bro-away');
  const li = document.createElement('li');
  li.className = 'bro-card just-in' + (firstTry ? ' clean' : '');
  const thumb = (sc.mode === 'photo' && sc.img)
    ? `<span class="bro-thumb" style="background-image:url('assets/${escapeHTML(sc.img)}')"></span>`
    : `<span class="bro-thumb slip" aria-hidden="true">✎</span>`;
  li.innerHTML = `${thumb}<span class="bro-meta"><span class="bro-name">${sc.activity}</span>` +
    `<span class="bro-tags"><i class="pip e">${TAG_LABEL[sc.energy]}</i><i class="pip v">${TAG_LABEL[sc.environment]}</i></span></span>`;
  list.appendChild(li);
  setTimeout(() => li.classList.remove('just-in'), 650);
}

function updateCounters() {
  $('#filed-count').textContent = state.filed;
  $('#hud-score').textContent = state.score;
  const c = $('#corrections-count');
  c.textContent = state.corrections;
  $('#hud-corrections').classList.toggle('has', state.corrections > 0);
}

/* ============================================================
   8. BONUS — the client briefing
   ============================================================ */
function startBonus() {
  const home = SCENES.filter(s => s.location === 'home').length;
  const away = SCENES.filter(s => s.location === 'away').length;
  const tail = away > home ? 'so most were <b>away from home</b>' : home > away ? 'so most were <b>home‑based</b>' : 'so they were <b>evenly split</b>';
  $('#bonus-runline').innerHTML =
    `Across the ${SCENES.length} activities you filed, <b>${home}</b> were home‑based and <b>${away}</b> were away from home — ${tail}. As you weigh up the two, think about <em>why</em> that might be.`;
  state.bDeck = shuffle(BONUS_CHIPS); state.bi = 0;
  ['bb-home-pro', 'bb-home-con', 'bb-away-pro', 'bb-away-con'].forEach(id => { $('#' + id).innerHTML = ''; });
  showScreen('bonus');
  loadChip();
}
function loadChip() {
  const c = state.bDeck[state.bi];
  state.bPicked = { side: null, type: null }; state.bAttempts = 0; state.bSolved = false;
  $('#chip-counter').textContent = `Point ${state.bi + 1} of ${state.bDeck.length}`;
  $('#bonus-chip').textContent = c.text; $('#bonus-chip').classList.remove('developed');
  $('#bonus-feedback').className = 'desk-feedback'; $('#bonus-feedback').innerHTML = '';
  resetDials('#screen-bonus'); $$('#screen-bonus .seg').forEach(s => s.disabled = false);
  $('#develop-btn').disabled = true; $('#develop-btn').hidden = false; $('#bonus-next-btn').hidden = true;
}
function bonusDialsChanged() { $('#develop-btn').disabled = !(state.bPicked.side && state.bPicked.type) || state.bSolved; }
function developChip() {
  if (state.bSolved) return;
  const c = state.bDeck[state.bi], p = state.bPicked;
  if (!p.side || !p.type) return;
  const correct = (p.side === c.side && p.type === c.type); state.bAttempts++;
  if (correct) {
    state.bSolved = true; state.score += (state.bAttempts === 1) ? 30 : 15; updateCounters();
    sfx.soft();
    $('#bonus-chip').classList.add('developed');
    $$('#screen-bonus .seg.selected').forEach(s => s.classList.add('axis-correct'));
    $$('#screen-bonus .seg').forEach(s => s.disabled = true);
    const li = document.createElement('li'); li.className = 'bb-item just-in';
    li.innerHTML = `<span class="bb-item-text">${escapeHTML(c.text)}</span><span class="bb-item-why">${escapeHTML(c.why)}</span>`;
    $(`#bb-${c.side}-${c.type}`).appendChild(li); setTimeout(() => li.classList.remove('just-in'), 600);
    const fb = $('#bonus-feedback'); fb.className = 'desk-feedback ok';
    const sideLabel = c.side === 'home' ? 'at home' : 'away from home', typeLabel = c.type === 'pro' ? 'strength' : 'drawback';
    fb.innerHTML = `<span class="fb-icon">✓</span> <span>A <b>${typeLabel}</b> of leisure <b>${sideLabel}</b>. ${escapeHTML(c.why)}</span>`;
    $('#develop-btn').hidden = true; $('#bonus-next-btn').hidden = false;
    $('#bonus-next-btn').textContent = (state.bi < state.bDeck.length - 1) ? 'Next →' : 'See my results →';
    $('#bonus-next-btn').focus();
  } else {
    sfx.reject();
    const chip = $('#bonus-chip'); chip.classList.remove('bounce'); void chip.offsetWidth; chip.classList.add('bounce');
    const fb = $('#bonus-feedback');
    if (state.bAttempts === 1) {
      fb.className = 'desk-feedback warn';
      fb.innerHTML = `<span class="fb-icon">↩</span> <span>Not quite. Is this really about <b>${state.bPicked.side === 'home' ? 'being at home' : 'going out'}</b>? Re‑read it and try again.</span>`;
    } else {
      const sideOff = state.bPicked.side !== c.side, typeOff = state.bPicked.type !== c.type;
      $$('#screen-bonus .seg.selected').forEach(s => {
        const off = (s.dataset.axis === 'side' && sideOff) || (s.dataset.axis === 'type' && typeOff);
        s.classList.add(off ? 'axis-wrong' : 'axis-correct');
        if (off) s.closest('.dial').classList.add('needs-attention');
        else $$(`#screen-bonus .seg[data-axis="${s.dataset.axis}"]`).forEach(x => x.disabled = true);  // lock the correct tag
      });
      const tips = [];
      if (sideOff) tips.push('think about which side — <b>at home</b> or <b>away from home</b> — this describes');
      if (typeOff) tips.push('decide whether it is a good thing (<b>strength</b>) or a bad thing (<b>drawback</b>)');
      fb.className = 'desk-feedback hint';
      fb.innerHTML = `<span class="fb-icon">🔎</span> <span>Closer — now ${tips.join(', and ')}.</span>`;
    }
  }
}
function nextChip() { state.bi++; if (state.bi < state.bDeck.length) loadChip(); else showResults(); }

/* ============================================================
   9. RESULTS — the printed brochure + the flip-pair board
   ============================================================ */
function showResults() {
  $('#reflect-model').hidden = true; $('#reflect-model').innerHTML = ''; $('#reflect-reveal').hidden = false; $('#reflect-box').value = '';
  $('#res-filed').textContent = state.filed;
  $('#res-firsttry').textContent = state.firstTry + ' / ' + SCENES.length;
  $('#res-score').textContent = state.score;
  const stars = state.firstTry >= 16 ? 5 : state.firstTry >= 14 ? 4 : state.firstTry >= 11 ? 3 : state.firstTry >= 7 ? 2 : 1;
  $('#res-stars').textContent = '★★★★★'.slice(0, stars) + '☆☆☆☆☆'.slice(0, 5 - stars);
  const clean = (state.firstTry === SCENES.length);
  $('#res-badge').hidden = !clean;
  $('#res-emoji').textContent = clean ? '🏆' : '📘';
  buildStringBoard();
  if (clean) sfx.badge(); else sfx.soft();
  showScreen('results');
}

function buildStringBoard() {
  const groups = {};
  SCENES.forEach(s => { if (s.flip) (groups[s.flip] = groups[s.flip] || []).push(s); });
  const wrap = $('#string-board'); wrap.innerHTML = '';
  Object.values(groups).forEach(pair => {
    if (pair.length < 2) return;
    const row = document.createElement('div'); row.className = 'sb-row';
    const linkLabel = (pair[0].activity === pair[1].activity) ? 'same activity' : 'watch vs do';
    row.innerHTML = pair.map((s, idx) =>
      `<div class="sb-card">
         <p class="sb-act">${s.activity}</p>
         <p class="sb-cap">${escapeHTML(s.caption)}</p>
         <p class="sb-tags">${TAG_LABEL[s.energy]} · ${TAG_LABEL[s.location]} · ${TAG_LABEL[s.environment]}</p>
       </div>${idx === 0 ? `<div class="sb-link" aria-hidden="true"><span>${linkLabel}</span></div>` : ''}`).join('');
    wrap.appendChild(row);
  });
}

/* ============================================================
   10. Look-closer lightbox (optional study — never required)
   ============================================================ */
function openLightbox() {
  const sc = state.deck[state.i];
  if (sc.mode !== 'photo' || !sc.img) return;
  state.lbOpener = document.activeElement;
  $('#lb-inner').innerHTML =
    `<figure class="lb-figure">
       <img class="lb-photo" src="assets/${escapeHTML(sc.img)}" alt="${escapeHTML(sc.alt || sc.activity)}" draggable="false" />
       <figcaption id="lb-cap">${escapeHTML(sc.caption)}</figcaption>
     </figure>`;
  $('#lightbox').hidden = false;
  $('#lb-close').focus();
}
function closeLightbox() {
  if ($('#lightbox').hidden) return;
  $('#lightbox').hidden = true; $('#lb-inner').innerHTML = '';
  if (state.lbOpener) { try { state.lbOpener.focus(); } catch (_) {} state.lbOpener = null; }
}

/* ============================================================
   11. Credits (from the photo manifest)
   ============================================================ */
function loadCredits() {
  fetch('assets/photo-manifest.json').then(r => r.ok ? r.json() : Promise.reject()).then(list => {
    const rows = (Array.isArray(list) ? list : []).filter(e => e && e.credit && e.status === 'ok')
      .map(e => { const sc = SCENES.find(s => s.img === e.file); const subj = sc ? sc.activity.replace(/&amp;/g, '&') : (e.id || 'Photograph');
        return `<li>${escapeHTML(subj)} — ${escapeHTML(e.credit.author || 'Unknown')} (${escapeHTML(e.credit.licence || '')})</li>`; });
    $('#credits-list').innerHTML = rows.length
      ? `<p>Photographs via Wikimedia Commons, used under their stated licences:</p><ul>${rows.join('')}</ul>`
      : `<p>Photographs are from Wikimedia Commons, used under their stated licences. The typed enquiry cards use no photographs.</p>`;
  }).catch(() => {
    $('#credits-list').innerHTML = `<p>Photographs are from Wikimedia Commons, used under their stated licences (CC0 / public domain / CC BY / CC BY‑SA). See assets/CREDITS.md for full provenance.</p>`;
  });
}

/* ============================================================
   12. Wiring
   ============================================================ */
function applyReduceMotion(on) { state.reduceMotion = on; document.body.classList.toggle('reduce-motion', on); }
function init() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) { applyReduceMotion(true); $('#motion-toggle-input').checked = true; }
  $('#motion-toggle-input').addEventListener('change', e => applyReduceMotion(e.target.checked));

  $('#start-btn').addEventListener('click', startGame);
  $('#playagain-btn').addEventListener('click', startGame);

  $('#dials').addEventListener('click', e => { const seg = e.target.closest('.seg'); if (!seg || seg.disabled) return; selectSeg(seg, state.picked, gameDialsChanged); });
  $('#dials').addEventListener('keydown', e => dialKeydown(e, state.picked, gameDialsChanged));
  $('#file-btn').addEventListener('click', fileCard);
  $('#next-btn').addEventListener('click', nextCard);

  $('.bonus-dials').addEventListener('click', e => { const seg = e.target.closest('.seg'); if (!seg || seg.disabled) return; selectSeg(seg, state.bPicked, bonusDialsChanged); });
  $('.bonus-dials').addEventListener('keydown', e => dialKeydown(e, state.bPicked, bonusDialsChanged));
  $('#develop-btn').addEventListener('click', developChip);
  $('#bonus-next-btn').addEventListener('click', nextChip);

  $('#lb-close').addEventListener('click', closeLightbox);
  $('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });
  $('#lightbox').addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); $('#lb-close').focus(); } });  // focus trap
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  $('#reflect-reveal').addEventListener('click', () => { const m = $('#reflect-model'); m.hidden = false; m.innerHTML = REFLECT_MODEL; $('#reflect-reveal').hidden = true; });
  $('#credits-toggle').addEventListener('click', () => { const l = $('#credits-list'); l.hidden = !l.hidden; $('#credits-toggle').setAttribute('aria-expanded', String(!l.hidden)); });
  loadCredits();
}
document.addEventListener('DOMContentLoaded', init);
