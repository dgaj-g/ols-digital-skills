/* ============================================================
   The Appeals Desk — Classifying Leisure Activities (CCEA LTT)
   ------------------------------------------------------------
   A junior clerk has already stamped each activity with three tags,
   deliberately taking the tempting "noun default". The pupil is the
   adjudicator: UPHOLD or OVERRULE each tag, name the DECIDING FACTOR,
   and rule on the case. Getting the tags AND the reason right closes it.

   CCEA marking honoured throughout:
   - Energy = participation vs spectating (NOT effort). Playing a game =
     ACTIVE; reading / watching / spectating = PASSIVE.
   - Water-based OVERRIDES indoor/outdoor. Being *beside* water ≠ in it.
   - The PLACE drives the classification (flip pairs).

   Difficulty by design:
   - The clerk is wrong on a VARYING number of axes (0, 1 or 2), so the
     pupil must check all three dials and read the scene — no "flip one
     dial" shortcut, no "always overrule".
   - The deciding-factor chips name the RULE/misconception, not the tag
     value, so choosing a chip does not back-solve the dials.
   ============================================================ */

/* ---------- 1. Case data (16 cases) ----------
   energy: 'active'|'passive'   location: 'home'|'away'   environment: 'indoor'|'outdoor'|'water'
   `clerk`   = the junior clerk's ruling (the tempting guess; wrong on 0–2 axes).
   `crux`    = the axis whose subtle rule the deciding-factor question tests.
   `factors` = the reason chips; exactly one has correct:true. They name the
               principle at stake, not the answer value.
   `caption` names WHERE/what without ever using a classification word.
--------------------------------------------------------------- */
const SCENES = [
  // ---- Energy: participation vs spectating (incl. the video-game fix) ----
  { id: 'video-games', mode: 'photo', img: 'computer-games.jpg',
    activity: 'Playing video games',
    caption: 'On the family sofa at home with a games controller and snacks.',
    alt: 'People relaxing on a sofa in a living room, one holding a games controller, with snacks on the table.',
    energy: 'active', location: 'home', environment: 'indoor',
    clerk: { energy: 'passive', location: 'home', environment: 'indoor' },
    crux: 'energy',
    factors: [
      { t: 'He is playing the game himself — taking part, not just watching.', correct: true },
      { t: 'Sitting still on a sofa is the deciding factor — no movement means passive.' },
      { t: 'A game plays on a screen, and looking at a screen is like watching TV.' } ],
    why: 'CCEA counts <b>playing</b> a game as <b>active</b> — active means <em>taking part</em>, not how much you move. He is at home, so <b>home‑based</b>, in the living room, so <b>indoor</b>.',
    hints: { energy: 'Active or passive is about taking part vs watching. He is playing — taking part — so active.', location: 'The family sofa — his own home.', environment: 'Under a roof in the living room.' } },

  { id: 'reading-bedroom', mode: 'photo', img: 'reading-bedroom.jpg',
    activity: 'Reading a book', flip: 'reading',
    caption: 'Curled up on her own bed at home with a lamp on.',
    alt: 'A girl lying on a bed in a cosy bedroom, reading a book by a lamp.',
    energy: 'passive', location: 'home', environment: 'indoor',
    clerk: { energy: 'passive', location: 'home', environment: 'indoor' },
    crux: 'energy',
    factors: [
      { t: 'She is taking the story in, not taking part in an activity.', correct: true },
      { t: 'Reading makes your brain work hard, and hard work is the deciding factor.' },
      { t: 'She is holding the book and turning the pages, so she is taking part.' } ],
    why: 'The clerk got this one right. Reading is <b>passive</b> — you take it in rather than take part. Her own bedroom makes it <b>home‑based</b> and <b>indoor</b>.',
    hints: { energy: 'Taking it in, not taking part — reading is passive.', location: 'Her own bed at home.', environment: 'Indoors under a roof.' } },

  // Two-axis: clerk wrong on location AND environment
  { id: 'reading-poolside', mode: 'slip', img: null,
    activity: 'Reading a book', flip: 'reading',
    caption: 'On a sun‑lounger beside the hotel pool, on holiday abroad.',
    energy: 'passive', location: 'away', environment: 'outdoor',
    clerk: { energy: 'passive', location: 'home', environment: 'water' },
    crux: 'environment',
    factors: [
      { t: 'She is beside the pool on a lounger — not in the water.', correct: true },
      { t: 'There is a pool right beside her, and water nearby is the deciding factor.' },
      { t: 'A hotel is a building, so being there is what makes it indoor.' } ],
    why: 'Same activity, different place. Reading stays <b>passive</b>, but a hotel on holiday is <b>away from home</b>, and she is on a lounger under open sky — <em>beside</em> the pool, not in it — so <b>outdoor</b>, not water‑based.',
    hints: { energy: 'It is the same reading — taking it in, so passive.', location: 'A hotel pool on holiday is well away from her own home.', environment: 'She is on a lounger beside the water, not in it — open sky means outdoor.' } },

  { id: 'football-sofa', mode: 'slip', img: null,
    activity: 'Watching football', flip: 'watch-football',
    caption: 'Feet up on the sofa at home, watching the match on the telly.',
    energy: 'passive', location: 'home', environment: 'indoor',
    clerk: { energy: 'passive', location: 'home', environment: 'indoor' },
    crux: 'energy',
    factors: [
      { t: 'She is watching the match, not playing in it.', correct: true },
      { t: 'Football is a sport, and anything to do with a sport is the deciding factor for active.' },
      { t: 'She is cheering and shouting, so she is joining in.' } ],
    why: 'Right first time by the clerk. Watching the match is <b>passive</b> — she is a spectator, not a player. Her own living room makes it <b>home‑based</b> and <b>indoor</b>.',
    hints: { energy: 'She is watching the match, not playing — passive.', location: 'On her own sofa at home.', environment: 'Indoors under a roof.' } },

  // Two-axis: clerk wrong on energy AND environment
  { id: 'stadium', mode: 'photo', img: 'stadium-crowd.jpg',
    activity: 'Watching football', flip: 'watch-football',
    caption: 'In the crowd at a packed open‑air stadium, watching the match live.',
    alt: 'A huge crowd fills the open stands of a football stadium with a coloured-card mosaic, sky and hills beyond.',
    energy: 'passive', location: 'away', environment: 'outdoor',
    clerk: { energy: 'active', location: 'away', environment: 'indoor' },
    crux: 'energy',
    factors: [
      { t: 'She is a spectator watching the match, not one of the players.', correct: true },
      { t: 'The stadium is loud and exciting, and the buzz is the deciding factor for active.' },
      { t: 'Standing in a huge crowd for hours is tiring, and tiring means active.' } ],
    why: 'A packed stadium <em>feels</em> active, but she is still a <b>spectator</b> — watching, not playing — so it is <b>passive</b>, just like on the sofa. A stadium is <b>away from home</b>, and the open stands are out under the sky, so <b>outdoor</b>.',
    hints: { energy: 'Watching, not playing — she is a spectator, so passive, however loud the crowd.', location: 'A stadium is away from her own home.', environment: 'The stands are open to the sky — outdoor, not indoor.' } },

  // ---- The factfile's signature flip pair: doing vs watching a sport ----
  { id: 'cycling-club', mode: 'photo', img: 'cycling-club.jpg',
    activity: 'Cycling with a club', flip: 'cycling',
    caption: 'Out on the country roads with the local cycling club.',
    alt: 'A group of cyclists in helmets and kit riding road bikes together along a road.',
    energy: 'active', location: 'away', environment: 'outdoor',
    clerk: { energy: 'active', location: 'away', environment: 'outdoor' },
    crux: 'energy',
    factors: [
      { t: 'He is pedalling and keeping up with the group himself.', correct: true },
      { t: 'He is sitting on a bike seat, and sitting is the deciding factor for passive.' },
      { t: 'Cycling clubs are really about meeting up to chat, so it is passive.' } ],
    why: 'The clerk nailed it. Cycling with the club means pedalling and <b>taking part</b>, so <b>active</b>; out on the roads makes it <b>away from home</b> and <b>outdoor</b>.',
    hints: { energy: 'Pedalling and keeping up — taking part, so active.', location: 'Out on the roads with the club, away from home.', environment: 'Out on the open road in the air.' } },

  { id: 'cycling-tv', mode: 'slip', img: null,
    activity: 'Watching a cycle race', flip: 'cycling',
    caption: 'Watching the big cycling race on the telly in your own living room.',
    energy: 'passive', location: 'home', environment: 'indoor',
    clerk: { energy: 'active', location: 'home', environment: 'indoor' },
    crux: 'energy',
    factors: [
      { t: 'You are watching the race on screen, not riding in it.', correct: true },
      { t: 'The word “cycling” means a sport, and a sport is the deciding factor for active.' },
      { t: 'You are gripping the sofa in excitement, so you are taking part.' } ],
    why: 'The word “cycling” tempts you to stamp <b>active</b>, but you are only <b>watching</b> the race — that is <b>passive</b>. You are in your own living room, so <b>home‑based</b> and <b>indoor</b>. The place changes everything.',
    hints: { energy: 'You are watching on screen, not riding — watching is passive.', location: 'In your own living room.', environment: 'Indoors on the sofa.' } },

  // ---- Water-based overrides indoor AND outdoor ----
  // Two-axis: clerk wrong on energy AND environment
  { id: 'indoor-pool', mode: 'photo', img: 'indoor-pool.jpg',
    activity: 'Swimming lengths',
    caption: 'Doing lengths at the local leisure‑centre pool.',
    alt: 'A large public swimming pool inside a leisure centre, with swimmers in the water.',
    energy: 'active', location: 'away', environment: 'water',
    clerk: { energy: 'passive', location: 'away', environment: 'indoor' },
    crux: 'environment',
    factors: [
      { t: 'She is in the water — and being in water beats being under a roof.', correct: true },
      { t: 'The pool sits inside a building, and the building is the deciding factor for indoor.' },
      { t: 'A leisure centre is just a normal building, so it must be indoor.' } ],
    why: 'Swimming means <b>taking part</b>, so <b>active</b>; the leisure centre is <b>away from home</b>. The pool is under a roof, but anything done <em>in</em> water is <b>water‑based</b> — water beats indoor <em>and</em> outdoor.',
    hints: { energy: 'Swimming lengths is taking part — active, not passive.', location: 'The leisure centre is away from her own home.', environment: 'She is in the water — in or on water is always water‑based, even an indoor pool.' } },

  { id: 'hot-tub', mode: 'photo', img: 'hot-tub.jpg',
    activity: 'Relaxing in a hot tub',
    caption: 'Unwinding in the hot tub out in your own back garden.',
    alt: 'A round wood-fired hot tub on a brick patio in a back garden, with a fence and hills behind.',
    energy: 'passive', location: 'home', environment: 'water',
    clerk: { energy: 'passive', location: 'home', environment: 'outdoor' },
    crux: 'environment',
    factors: [
      { t: 'He is sitting in the water — and water beats wherever the tub happens to sit.', correct: true },
      { t: 'The garden is outside, and being outside is the deciding factor for outdoor.' },
      { t: 'A hot tub is just a relaxing soak in the garden, so outdoor.' } ],
    why: 'Relaxing, not taking part in anything energetic, so <b>passive</b>; his own garden makes it <b>home‑based</b>; and because he is <em>in</em> the water it is <b>water‑based</b> — water beats outdoor, just as it beats indoor.',
    hints: { energy: 'He is unwinding, not taking part in an activity — passive.', location: 'His own back garden.', environment: 'He is sitting in the water, so water‑based (not outdoor, even though the garden is outside).' } },

  { id: 'sailing', mode: 'photo', img: 'sailing-dinghy.jpg',
    activity: 'Sailing a dinghy',
    caption: 'Sailing a dinghy out on Carlingford Lough.',
    alt: 'Small sailing dinghies with colourful sails out on open water, with green hills behind.',
    energy: 'active', location: 'away', environment: 'water',
    clerk: { energy: 'active', location: 'away', environment: 'water' },
    crux: 'environment',
    factors: [
      { t: 'She is out on the water working the sail herself.', correct: true },
      { t: 'The boat holds her up out of the water, and that is the deciding factor for outdoor.' },
      { t: 'There is open sky above the boat, so it must be outdoor.' } ],
    why: 'The clerk is correct. Working the sail is <b>taking part</b>, so <b>active</b>; out on the lough is <b>away from home</b>; and it happens on the water, so <b>water‑based</b>.',
    hints: { energy: 'Working the sail and steering is taking part — active.', location: 'Out on the lough, away from home.', environment: 'Out on the water, so water‑based.' } },

  { id: 'surfing', mode: 'photo', img: 'surfing.jpg',
    activity: 'Surfing',
    caption: 'Catching waves in the sea at the beach.',
    alt: 'A surfer in a wetsuit riding inside a large breaking wave in the sea.',
    energy: 'active', location: 'away', environment: 'water',
    clerk: { energy: 'active', location: 'away', environment: 'water' },
    crux: 'environment',
    factors: [
      { t: 'He is riding the waves out in the sea itself.', correct: true },
      { t: 'The beach is an outdoor place, and the beach is the deciding factor for outdoor.' },
      { t: 'He is out in the fresh air, so it must be outdoor.' } ],
    why: 'The clerk is right. Riding the waves yourself is <b>taking part</b>, so <b>active</b>; the beach is <b>away from home</b>; and he is <em>in</em> the sea, so <b>water‑based</b> — not outdoor, even at the beach.',
    hints: { energy: 'Riding the waves yourself is taking part — active.', location: 'The beach is away from home.', environment: 'Out on the waves in the sea, so water‑based.' } },

  // ---- Location: the place, not the routine; active without leaving home ----
  // Two-axis: clerk wrong on energy AND location
  { id: 'dance-class', mode: 'photo', img: 'dance-class.jpg',
    activity: 'A dance‑fitness class',
    caption: 'A dance and fitness class at a studio in town.',
    alt: 'People in a bright fitness studio taking a step-aerobics class with small dumbbells.',
    energy: 'active', location: 'away', environment: 'indoor',
    clerk: { energy: 'passive', location: 'home', environment: 'indoor' },
    crux: 'location',
    factors: [
      { t: 'It happens at a studio in town — away from her own home.', correct: true },
      { t: 'A fitness class is the kind of thing you could do at home, and the type is the deciding factor.' },
      { t: 'It is indoors like a house, so that makes it home‑based.' } ],
    why: 'Dancing means <b>taking part</b>, so <b>active</b>; the studio in town is <b>away from home</b>; and it is inside, so <b>indoor</b>. Where it happens — not the kind of activity it is — decides home vs away.',
    hints: { energy: 'She is dancing and taking part — active, not passive.', location: 'A studio in town is away from her own home.', environment: 'Inside a studio under a roof.' } },

  { id: 'gardening', mode: 'photo', img: 'gardening.jpg',
    activity: 'Gardening',
    caption: 'Digging and planting in your own back garden.',
    alt: 'A person using a hoe to dig over a garden bed in a back garden, with a house behind.',
    energy: 'active', location: 'home', environment: 'outdoor',
    clerk: { energy: 'passive', location: 'home', environment: 'outdoor' },
    crux: 'energy',
    factors: [
      { t: 'She is digging and planting the beds herself — taking part.', correct: true },
      { t: 'Pottering in the garden is slow and gentle, and being gentle is the deciding factor for passive.' },
      { t: 'She is at home taking it easy, so it must be passive.' } ],
    why: 'Digging and planting is doing it yourself — <b>taking part</b> — so <b>active</b> (you can be active without leaving home). Your own garden makes it <b>home‑based</b>, and out in the open, so <b>outdoor</b>. (CCEA marks weeding a garden as active.)',
    hints: { energy: 'She is digging and planting herself — taking part — so active.', location: 'It is your own back garden.', environment: 'Out in the garden under the sky.' } },

  // Two-axis: clerk wrong on location AND environment
  { id: 'dog-walk', mode: 'photo', img: 'dog-walk-park.jpg',
    activity: 'Walking the dog',
    caption: 'Taking the dog round the local park.',
    alt: 'A person walking a dog across grassy parkland with trees and wildflowers.',
    energy: 'active', location: 'away', environment: 'outdoor',
    clerk: { energy: 'active', location: 'home', environment: 'indoor' },
    crux: 'location',
    factors: [
      { t: 'The walk happens in the local park — away from your own home.', correct: true },
      { t: 'Walking the dog is an everyday routine, and a routine is the deciding factor for home‑based.' },
      { t: 'It is your own dog, so that makes it count as home‑based.' } ],
    why: 'Walking keeps you moving, so <b>active</b>; the local park is <b>away from home</b> — location is about <em>where</em> you are, not whether it is a daily routine — and out in the open, so <b>outdoor</b>.',
    hints: { energy: 'Walking the dog keeps you on the move — active.', location: 'The local park is away from your own home.', environment: 'Out in the park under the sky — outdoor, not indoor.' } },

  { id: 'home-workout', mode: 'slip', img: null,
    activity: 'A home workout',
    caption: 'Following an exercise video out in your own garage.',
    energy: 'active', location: 'home', environment: 'indoor',
    clerk: { energy: 'active', location: 'away', environment: 'indoor' },
    crux: 'location',
    factors: [
      { t: 'It happens in your own garage — that makes it home‑based.', correct: true },
      { t: 'Working out is a gym kind of thing, and the type of activity is the deciding factor for away.' },
      { t: 'Exercise needs kit and space, so it must be away from home.' } ],
    why: 'A workout means <b>taking part</b> yourself, so <b>active</b>; your own garage makes it <b>home‑based</b>; and the garage is under a roof, so <b>indoor</b>. You do not have to leave home to be active.',
    hints: { energy: 'You are doing the exercise yourself — taking part — so active.', location: 'In your own garage at home.', environment: 'Inside the garage.' } },

  { id: 'eating-out', mode: 'slip', img: null,
    activity: 'Eating out',
    caption: 'Out for a meal with friends at a restaurant in town.',
    energy: 'passive', location: 'away', environment: 'indoor',
    clerk: { energy: 'active', location: 'away', environment: 'indoor' },
    crux: 'energy',
    factors: [
      { t: 'You are being served and relaxing, not taking part in an activity.', correct: true },
      { t: 'You are out and about doing something, and being out is the deciding factor for active.' },
      { t: 'Eating and chatting still uses energy, so it must be active.' } ],
    why: 'Going out for a meal is <b>passive</b> — you are relaxing and socialising, not taking part in a physical activity; a restaurant in town is <b>away from home</b> and <b>indoor</b>. (CCEA lists eating out as a classic <em>away‑from‑home</em> leisure activity.)',
    hints: { energy: 'You are being served and relaxing, not taking part — passive.', location: 'A restaurant in town is away from home.', environment: 'Inside the restaurant under a roof.' } }
];

/* ---------- 2. Bonus (client briefing: home vs away) ---------- */
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
  'takes time to travel, but I think the wider choice of activities is worth it.” ' +
  'A home‑based answer is just as valid if it is backed up: cheaper, more convenient and possible in any weather.';

const TAG_LABEL = { active: 'Active', passive: 'Passive', home: 'Home‑based', away: 'Away from home', indoor: 'Indoor', outdoor: 'Outdoor', water: 'Water‑based' };
const AXIS_LABEL = { energy: 'Energy', location: 'Location', environment: 'Environment' };

/* ---------- 3. State ---------- */
const state = {
  deck: [], i: 0, filed: 0, firstTry: 0, score: 0, corrections: 0, upheld: 0, overruled: 0,
  picked: { energy: null, location: null, environment: null }, clerk: {},
  pickedFactor: null, correctFactorIdx: null,
  attempts: 0, solved: false, stampTimer: null,
  audioCtx: null, lbOpener: null,
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
  tick()  { tone(2100, 0.012, 'square', 0.05); tone(1500, 0.02, 'square', 0.035, 0.012); },     // tag set
  stamp() { tone(220, 0.05, 'square', 0.10); tone(140, 0.09, 'sine', 0.07, 0.02); },              // gavel / stamp thunk
  file()  { [523.25, 659.25, 783.99].forEach((f, k) => tone(f, 0.28, 'sine', 0.10, k * 0.06)); }, // case closes
  reject(){ tone(150, 0.16, 'sawtooth', 0.08); tone(120, 0.18, 'sawtooth', 0.06, 0.04); },         // sent back
  soft()  { tone(587.33, 0.18, 'sine', 0.09); tone(880, 0.22, 'sine', 0.08, 0.06); },
  badge() { [659.25, 783.99, 987.77, 1318.5].forEach((f, k) => tone(f, 0.4, 'triangle', 0.11, k * 0.1)); }
};

/* ============================================================
   7. THE APPEALS DESK (main game)
   ============================================================ */
function startGame() {
  state.deck = shuffle(SCENES);
  state.i = 0; state.filed = 0; state.firstTry = 0; state.score = 0; state.corrections = 0;
  state.upheld = 0; state.overruled = 0;
  $('#bro-log').innerHTML = ''; $('#bro-empty').hidden = false;
  updateCounters();
  showScreen('game');
  loadCard();
}

function loadCard() {
  if (state.stampTimer) { clearTimeout(state.stampTimer); state.stampTimer = null; }
  const sc = state.deck[state.i];
  state.clerk = { ...sc.clerk };
  state.picked = { ...sc.clerk };   // start pre-filled with the clerk's ruling
  state.pickedFactor = null;
  state.attempts = 0; state.solved = false;

  $('#hud-progress').textContent = `Case ${state.i + 1} of ${state.deck.length}`;

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

  // Pre-fill the dials with the clerk's ruling and mark them
  resetDials('#screen-game');
  $$('#screen-game .seg').forEach(s => { s.disabled = false; });
  ['energy', 'location', 'environment'].forEach(axis => {
    const val = sc.clerk[axis];
    const seg = $(`#screen-game .seg[data-axis="${axis}"][data-val="${val}"]`);
    if (seg) { seg.classList.add('selected', 'clerk-pick'); seg.setAttribute('aria-checked', 'true'); seg.setAttribute('tabindex', '0'); }
    $$(`#screen-game .seg[data-axis="${axis}"]`).forEach(s => { if (s !== seg) s.setAttribute('tabindex', '-1'); });
    const said = $(`#clerk-said-${axis}`); if (said) said.textContent = 'clerk: ' + TAG_LABEL[val];
    $(`#screen-game .dial[data-axis="${axis}"]`).classList.remove('is-overruled', 'needs-attention');
  });

  // Render the deciding-factor chips in a shuffled order; the correct one's
  // DISPLAYED index is held in state only (never written to the DOM).
  const fl = $('#factor-list'); fl.innerHTML = '';
  const shown = shuffle(sc.factors);
  state.correctFactorIdx = shown.findIndex(f => f.correct);
  shown.forEach((f, d) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'factor'; b.dataset.idx = String(d);
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.setAttribute('tabindex', d === 0 ? '0' : '-1');
    b.innerHTML = `<span class="factor-dot" aria-hidden="true"></span><span>${escapeHTML(f.t)}</span>`;
    fl.appendChild(b);
  });
  $('#factors').classList.remove('needs-attention');

  // reset commit + feedback + stamp
  $('#file-btn').disabled = true; $('#file-btn').hidden = false;
  $('#next-btn').hidden = true;
  const fb = $('#desk-feedback'); fb.className = 'desk-feedback'; fb.innerHTML = '';
  const stamp = $('#stamp'); stamp.hidden = true; stamp.className = 'stamp';
}

function renderSlip(card, sc) {
  card.innerHTML =
    `<div class="slip">
       <div class="slip-head"><span class="slip-clip" aria-hidden="true"></span><span class="slip-tag">Case file</span></div>
       <p class="card-activity">${sc.activity}</p>
       <p class="card-caption big">${escapeHTML(sc.caption)}</p>
     </div>`;
}

/* ----- Tag controls (dials — shared with bonus) ----- */
function resetDials(scope) {
  $$(`${scope} .seg`).forEach(b => { b.classList.remove('selected', 'clerk-pick', 'axis-correct', 'axis-wrong'); b.setAttribute('aria-checked', 'false'); });
  $$(`${scope} .dial`).forEach(d => d.classList.remove('needs-attention', 'is-overruled'));
  $$(`${scope} .dial-track`).forEach(track => { $$('.seg', track).forEach((s, k) => s.setAttribute('tabindex', k === 0 ? '0' : '-1')); });
}
function selectSeg(btn, store, onChange) {
  const axis = btn.dataset.axis;
  $$(`.seg[data-axis="${axis}"]`, btn.closest('.dials')).forEach(s => {
    s.classList.remove('selected', 'axis-correct', 'axis-wrong'); s.setAttribute('aria-checked', 'false'); s.setAttribute('tabindex', '-1');
  });
  btn.classList.add('selected'); btn.setAttribute('aria-checked', 'true'); btn.setAttribute('tabindex', '0');
  btn.closest('.dial').classList.remove('needs-attention');
  store[axis] = btn.dataset.val; sfx.tick(); onChange();
}
function dialKeydown(e, store, onChange) {
  const seg = e.target.closest('.seg'); if (!seg) return;
  if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const group = Array.from(seg.closest('.dial-track').querySelectorAll('.seg')).filter(s => !s.disabled);
  if (!group.length) return;
  const idx = group.indexOf(seg), fwd = (e.key === 'ArrowRight' || e.key === 'ArrowDown');
  const base = idx === -1 ? 0 : idx;
  const next = group[(base + (fwd ? 1 : group.length - 1)) % group.length];
  next.focus(); selectSeg(next, store, onChange);
}
function gameDialsChanged() {
  // reflect uphold vs overrule on each dial
  ['energy', 'location', 'environment'].forEach(axis => {
    const dial = $(`#screen-game .dial[data-axis="${axis}"]`);
    dial.classList.toggle('is-overruled', state.picked[axis] !== state.clerk[axis]);
  });
  const allTags = state.picked.energy && state.picked.location && state.picked.environment;
  $('#file-btn').disabled = !(allTags && state.pickedFactor !== null) || state.solved;
}

/* ----- Deciding-factor chips (a single-select radiogroup) ----- */
function selectFactor(btn) {
  if (state.solved) return;
  $$('#factor-list .factor').forEach(f => { f.classList.remove('selected', 'factor-correct', 'axis-wrong'); f.setAttribute('aria-checked', 'false'); f.setAttribute('tabindex', '-1'); });
  btn.classList.add('selected'); btn.setAttribute('aria-checked', 'true'); btn.setAttribute('tabindex', '0');
  state.pickedFactor = Number(btn.dataset.idx);
  $('#factors').classList.remove('needs-attention');
  sfx.tick(); gameDialsChanged();
}
function factorKeydown(e) {
  const f = e.target.closest('.factor'); if (!f || f.disabled) return;
  if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const group = $$('#factor-list .factor').filter(x => !x.disabled);
  if (!group.length) return;
  const idx = group.indexOf(f), fwd = (e.key === 'ArrowRight' || e.key === 'ArrowDown');
  const base = idx === -1 ? 0 : idx;
  const next = group[(base + (fwd ? 1 : group.length - 1)) % group.length];
  next.focus(); selectFactor(next);
}

/* ----- Rule on the case (commit) ----- */
function fileCard() {
  if (state.solved) return;
  const sc = state.deck[state.i], p = state.picked;
  if (!p.energy || !p.location || !p.environment || state.pickedFactor === null) return;
  const tagsRight = (p.energy === sc.energy && p.location === sc.location && p.environment === sc.environment);
  const factorRight = (state.pickedFactor === state.correctFactorIdx);
  const correct = tagsRight && factorRight;
  state.attempts++;

  if (correct) {
    state.solved = true;
    const firstTry = (state.attempts === 1);
    if (firstTry) { state.firstTry++; state.score += 100; } else { state.score += 40; }
    state.filed++;
    const clerkWasRight = (sc.clerk.energy === sc.energy && sc.clerk.location === sc.location && sc.clerk.environment === sc.environment);
    if (clerkWasRight) state.upheld++; else state.overruled++;
    updateCounters();

    $$('#screen-game .seg.selected').forEach(s => s.classList.add('axis-correct'));
    $$('#screen-game .seg').forEach(s => s.disabled = true);
    $$('#factor-list .factor').forEach(f => { f.disabled = true; if (Number(f.dataset.idx) === state.pickedFactor) f.classList.add('factor-correct'); });
    showStamp(true, clerkWasRight);
    sfx.stamp(); state.stampTimer = setTimeout(() => sfx.file(), 160);
    logCase(sc, firstTry, clerkWasRight);

    const verdict = clerkWasRight
      ? 'You <b>upheld</b> the clerk — the ruling stands.'
      : 'You <b>overruled</b> the clerk and put it right.';
    const fb = $('#desk-feedback');
    fb.className = 'desk-feedback ok';
    fb.innerHTML = `<span class="fb-icon">✓</span> <span><b>Case closed.</b> ${verdict} ${sc.why}</span>`;
    $('#file-btn').hidden = true;
    $('#next-btn').hidden = false;
    $('#next-btn').textContent = (state.i < state.deck.length - 1) ? 'Next case →' : 'Finish & close the file →';
    $('#next-btn').focus();
  } else {
    if (state.attempts === 1) { state.corrections++; updateCounters(); }
    showStamp(false);
    sfx.reject();
    const card = $('#card'); card.classList.remove('bounce'); void card.offsetWidth; card.classList.add('bounce');
    const fb = $('#desk-feedback');

    if (state.attempts === 1) {
      // First miss: no reveal of which axis — force a genuine re-read.
      fb.className = 'desk-feedback warn';
      if (tagsRight && !factorRight) {
        $('#factors').classList.add('needs-attention');
        fb.innerHTML = `<span class="fb-icon">↩</span> <span>The three tags hold up — but that is not the <b>deciding factor</b>. Which rule really settles this case?</span>`;
      } else {
        fb.innerHTML = `<span class="fb-icon">↩</span> <span>The supervisor sends the case back for review. Read it again — check <b>every tag</b>, and your <b>deciding factor</b>. Remember the place can change the answer.</span>`;
      }
    } else {
      // Second miss onward: name what is disputed (not the answer); lock what is right.
      const wrong = [];
      ['energy', 'location', 'environment'].forEach(axis => {
        const segSel = $(`#screen-game .seg[data-axis="${axis}"].selected`);
        const dial = $(`#screen-game .dial[data-axis="${axis}"]`);
        if (p[axis] === sc[axis]) {
          if (segSel) segSel.classList.add('axis-correct');
          dial.classList.remove('needs-attention');
          $$(`#screen-game .seg[data-axis="${axis}"]`).forEach(s => s.disabled = true);   // lock correct tags
        } else { if (segSel) segSel.classList.add('axis-wrong'); dial.classList.add('needs-attention'); wrong.push(axis); }
      });
      const tips = wrong.map(a => `<li><b>${AXIS_LABEL[a]}:</b> ${sc.hints[a]}</li>`);
      if (!factorRight) {
        const chosen = $(`#factor-list .factor[data-idx="${state.pickedFactor}"]`);
        if (chosen) chosen.classList.add('axis-wrong');
        $('#factors').classList.add('needs-attention');
        tips.push('<li><b>Deciding factor:</b> that reason does not hold — pick the rule that truly settles it.</li>');
      } else {
        $$('#factor-list .factor').forEach(f => { if (Number(f.dataset.idx) === state.pickedFactor) f.classList.add('factor-correct'); });
      }
      fb.className = 'desk-feedback hint';
      fb.innerHTML = `<span class="fb-icon">🔎</span><div><p>Still under review — here is what to look at:</p><ul class="hint-list">${tips.join('')}</ul></div>`;
    }
    gameDialsChanged();
  }
}

function showStamp(ok, clerkWasRight) {
  if (state.stampTimer) { clearTimeout(state.stampTimer); state.stampTimer = null; }
  const stamp = $('#stamp');
  stamp.hidden = false;
  stamp.className = 'stamp ' + (ok ? 'ok' : 'no');
  stamp.textContent = ok ? (clerkWasRight ? 'UPHELD' : 'OVERRULED') : 'REVIEW';
  if (!ok) state.stampTimer = setTimeout(() => { if (!state.solved) stamp.hidden = true; }, 950);
}

function nextCard() {
  state.i++;
  if (state.i < state.deck.length) loadCard();
  else startBonus();
}

/* ----- Case log (the reward) ----- */
function logCase(sc, firstTry, clerkWasRight) {
  $('#bro-empty').hidden = true;
  const li = document.createElement('li');
  li.className = 'log-card just-in' + (firstTry ? ' clean' : '');
  const thumb = (sc.mode === 'photo' && sc.img)
    ? `<span class="bro-thumb" style="background-image:url('assets/${escapeHTML(sc.img)}')"></span>`
    : `<span class="bro-thumb slip" aria-hidden="true">§</span>`;
  const verdict = clerkWasRight
    ? `<span class="log-verdict upheld">✓ upheld</span>`
    : `<span class="log-verdict overruled">⚖ overruled</span>`;
  li.innerHTML =
    `${thumb}<span class="log-meta">
       <span class="log-name">${sc.activity} ${verdict}</span>
       <span class="bro-tags"><i class="pip e">${TAG_LABEL[sc.energy]}</i><i class="pip l">${TAG_LABEL[sc.location]}</i><i class="pip v">${TAG_LABEL[sc.environment]}</i></span>
     </span>`;
  $('#bro-log').appendChild(li);
  setTimeout(() => li.classList.remove('just-in'), 650);
}

function updateCounters() {
  $('#filed-count').textContent = state.filed;
  $('#hud-score').textContent = state.score;
  $('#bsl-upheld').textContent = state.upheld;
  $('#bsl-overruled').textContent = state.overruled;
  const c = $('#corrections-count');
  c.textContent = state.corrections;
  $('#hud-corrections').classList.toggle('has', state.corrections > 0);
}

/* ============================================================
   8. BONUS — the client briefing (home vs away)
   ============================================================ */
function startBonus() {
  const home = SCENES.filter(s => s.location === 'home').length;
  const away = SCENES.filter(s => s.location === 'away').length;
  const tail = away > home ? 'so most were <b>away from home</b>' : home > away ? 'so most were <b>home‑based</b>' : 'so they were <b>evenly split</b>';
  $('#bonus-runline').innerHTML =
    `Across the ${SCENES.length} cases you ruled on, <b>${home}</b> were home‑based and <b>${away}</b> were away from home — ${tail}. As you weigh up the two, think about <em>why</em> that might be.`;
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
        else $$(`#screen-bonus .seg[data-axis="${s.dataset.axis}"]`).forEach(x => x.disabled = true);
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
   9. RESULTS — the record + the flip-pair board
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
  $('#res-emoji').textContent = clean ? '🏆' : '⚖️';
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
    const linkLabel = (pair[0].activity === pair[1].activity) ? 'same activity' : 'do vs watch';
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
      : `<p>Photographs are from Wikimedia Commons, used under their stated licences. The typed case files use no photographs.</p>`;
  }).catch(() => {
    $('#credits-list').innerHTML = `<p>Photographs are from Wikimedia Commons, used under their stated licences (CC0 / public domain / CC BY / CC BY‑SA). See assets/CREDITS.md for full provenance.</p>`;
  });
}

/* ============================================================
   12. Wiring
   ============================================================ */
function init() {
  $('#start-btn').addEventListener('click', startGame);
  $('#playagain-btn').addEventListener('click', startGame);

  $('#dials').addEventListener('click', e => { const seg = e.target.closest('.seg'); if (!seg || seg.disabled) return; selectSeg(seg, state.picked, gameDialsChanged); });
  $('#dials').addEventListener('keydown', e => dialKeydown(e, state.picked, gameDialsChanged));
  $('#factor-list').addEventListener('click', e => { const f = e.target.closest('.factor'); if (!f || f.disabled) return; selectFactor(f); });
  $('#factor-list').addEventListener('keydown', factorKeydown);
  $('#file-btn').addEventListener('click', fileCard);
  $('#next-btn').addEventListener('click', nextCard);

  $('.bonus-dials').addEventListener('click', e => { const seg = e.target.closest('.seg'); if (!seg || seg.disabled) return; selectSeg(seg, state.bPicked, bonusDialsChanged); });
  $('.bonus-dials').addEventListener('keydown', e => dialKeydown(e, state.bPicked, bonusDialsChanged));
  $('#develop-btn').addEventListener('click', developChip);
  $('#bonus-next-btn').addEventListener('click', nextChip);

  $('#lb-close').addEventListener('click', closeLightbox);
  $('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });
  $('#lightbox').addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); $('#lb-close').focus(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  $('#reflect-reveal').addEventListener('click', () => { const m = $('#reflect-model'); m.hidden = false; m.innerHTML = REFLECT_MODEL; $('#reflect-reveal').hidden = true; });
  $('#credits-toggle').addEventListener('click', () => { const l = $('#credits-list'); l.hidden = !l.hidden; $('#credits-toggle').setAttribute('aria-expanded', String(!l.hidden)); });
  loadCredits();
}
document.addEventListener('DOMContentLoaded', init);
