/* ============================================================
   Irish Traditional Instruments — drag-drop family sort
   ------------------------------------------------------------
   Works on mouse + touch via Pointer Events.
   Self-contained: no build step, no external deps.
   Source: CCEA GCSE Music — Musical Traditions in Ireland fact file.
   ============================================================ */

// ----- 1. Instrument data (inlined so file:// works) -----

const ICONS = {
  fiddle: `<svg viewBox="0 0 64 96"><path d="M32 6 C28 14 28 22 32 26 C36 22 36 14 32 6 Z" /><path d="M22 28 C18 36 18 56 26 70 C30 78 34 82 32 88 C30 82 34 78 38 70 C46 56 46 36 42 28 C40 24 36 22 32 22 C28 22 24 24 22 28 Z" /><path d="M30 30 L30 62" /><path d="M32 28 L32 62" /><path d="M34 30 L34 62" /><circle cx="32" cy="68" r="2.4" /><path d="M14 4 L52 22" stroke-width="1.4" /></svg>`,
  harp: `<svg viewBox="0 0 64 96"><path d="M14 84 L14 16 Q14 8 22 8 L52 8" /><path d="M22 84 Q22 50 52 8" /><path d="M22 16 L22 84 L52 84 L52 8" /><path d="M28 14 L28 80" stroke-width="1" /><path d="M34 14 L34 78" stroke-width="1" /><path d="M40 12 L40 74" stroke-width="1" /><path d="M46 10 L46 70" stroke-width="1" /></svg>`,
  bodhran: `<svg viewBox="0 0 64 96"><circle cx="32" cy="50" r="26" /><circle cx="32" cy="50" r="20" stroke-width="1.2" /><path d="M32 24 L32 76" stroke-width="1" /><path d="M6 50 L58 50" stroke-width="1" /><path d="M48 18 L60 6" stroke-width="2.4" /><circle cx="60" cy="6" r="2.4" fill="currentColor" stroke="none"/></svg>`,
  tinwhistle: `<svg viewBox="0 0 64 96"><rect x="28" y="6" width="8" height="84" rx="2" /><path d="M22 12 L28 12 L28 18 L22 18 Z" /><circle cx="32" cy="38" r="2" fill="currentColor" stroke="none"/><circle cx="32" cy="48" r="2" fill="currentColor" stroke="none"/><circle cx="32" cy="58" r="2" fill="currentColor" stroke="none"/><circle cx="32" cy="68" r="2" fill="currentColor" stroke="none"/><circle cx="32" cy="78" r="2" fill="currentColor" stroke="none"/></svg>`,
  uilleann: `<svg viewBox="0 0 64 96"><ellipse cx="28" cy="56" rx="20" ry="14" /><path d="M40 46 L56 24" /><path d="M44 50 L60 32" /><path d="M48 52 L62 40" /><rect x="24" y="68" width="6" height="22" rx="1" /><circle cx="27" cy="76" r="1" fill="currentColor" stroke="none"/><circle cx="27" cy="82" r="1" fill="currentColor" stroke="none"/><path d="M10 50 L4 38" /><circle cx="4" cy="38" r="2" /></svg>`,
  accordion: `<svg viewBox="0 0 64 96"><rect x="6" y="20" width="14" height="56" rx="2" /><rect x="44" y="20" width="14" height="56" rx="2" /><path d="M20 26 L44 26" /><path d="M20 32 L44 32" /><path d="M20 38 L44 38" /><path d="M20 44 L44 44" /><path d="M20 50 L44 50" /><path d="M20 56 L44 56" /><path d="M20 62 L44 62" /><path d="M20 68 L44 68" /><path d="M20 74 L44 74" /><circle cx="13" cy="30" r="1.6" fill="currentColor" stroke="none"/><circle cx="13" cy="40" r="1.6" fill="currentColor" stroke="none"/><circle cx="13" cy="50" r="1.6" fill="currentColor" stroke="none"/><rect x="48" y="28" width="6" height="40" rx="1" stroke-width="1"/></svg>`
};

const INSTRUMENTS = [
  {
    slug: "fiddle",
    name: "Fiddle",
    family: "strings",
    summary: "A four-stringed bowed instrument — identical in construction to the violin.",
    description: "Are the fiddle and the violin the same instrument? Yes — but it is the style of music that tells us which label to use. If the musician is playing folk, they call the instrument a fiddle (e.g. American Bluegrass fiddling). If they are playing Classical music, the musician calls it a violin.",
    role: "Plays the melody.",
    players: "Zoe Conway, Frankie Gavin, Tommy Peoples, Brid Harper, Aly Bain, Tara Breen, Donal O'Connor, Emma Smith, Diane McCullough, Keith Lyttle."
  },
  {
    slug: "harp",
    name: "Harp",
    family: "strings",
    summary: "A large, triangular frame of plucked strings — Ireland's national emblem.",
    description: "The harp can play both melody and chords. It often plays a syncopated accompaniment pattern.",
    role: "Plays melody and chords.",
    players: "Derek Bell, Laoise Kelly, Kavan Donohoe, Sandra Kirk, Allie Robertson."
  },
  {
    slug: "bodhran",
    name: "Bodhrán",
    family: "percussion",
    summary: "A circular frame drum struck with a wooden beater called a tipper.",
    description: "The bodhrán is played using a wooden stick called a tipper. The player uses both hands; the in-side hand is pressed against the skin of the drum to alter the tension, and the outside hand creates the rhythm using the tipper. Both these actions change both the timbre and the pitch of the sound.",
    role: "Provides the rhythmic accompaniment.",
    players: "Kevin Conneff, Mel Mercier, Eamon Murray, John Joe Kelly."
  },
  {
    slug: "tinwhistle",
    name: "Tin Whistle",
    family: "wind",
    summary: "A small, high-pitched metal flute with a fipple mouthpiece and six finger holes.",
    description: "Sounds shrill and is high pitched. It has the same finger pattern as the flute and is used for playing melody.",
    role: "Plays the melody.",
    players: "Mary Bergin, Geraldine Cotter, Paddy Moloney."
  },
  {
    slug: "uilleann",
    name: "Uilleann Pipes",
    family: "wind",
    summary: "Bellows-blown Irish bagpipes (the name means \"elbow pipes\"), played sitting down.",
    description: "The uilleann pipes are played in a sitting position. They are considered to be the most difficult of all traditional instruments to play and are noted for their mellowness and sweetness of tone. They play both melody and chords. Listen for when the uilleann piper sets the chanter down on his knee to close off the sound — this is part of the distinctive timbre of the instrument.",
    role: "Plays melody and chords.",
    players: "Willie Clancy, Cillian Vallely, Becky Taylor, Deb Quigley, John McSherry."
  },
  {
    slug: "accordion",
    name: "Accordion",
    family: "freereed",
    summary: "A bellows-powered instrument with buttons or piano keys, sounding metal reeds.",
    description: "The accordion can be played using buttons or piano keys. It is a loud instrument and can play both melody and chords.",
    role: "Plays melody and chords.",
    players: "Sharon Shannon, Joe Burke, Phil Cunningham, The Grousebeaters."
  }
];

const FAMILY_INFO = {
  strings: {
    name: "Strings",
    blurb: "Sound made by vibrating strings.",
    members: "Fiddle, Harp"
  },
  percussion: {
    name: "Percussion",
    blurb: "Sound made by striking a surface.",
    members: "Bodhrán"
  },
  wind: {
    name: "Wind",
    blurb: "Sound made by blowing air through a tube.",
    members: "Tin Whistle, Uilleann Pipes"
  },
  freereed: {
    name: "Free reed",
    blurb: "Sound made by air vibrating a free metal reed.",
    members: "Accordion"
  }
};

const FAMILY_LABEL = {
  strings: "Strings",
  percussion: "Percussion",
  wind: "Wind",
  freereed: "Free reed"
};

const TOTAL = INSTRUMENTS.length;

// ----- 2. State -----

const state = {
  placed: 0,
  dragging: null,
  pointer: { id: null, startX: 0, startY: 0, lastX: 0, lastY: 0, startTime: 0, moved: false },
  audioCtx: null
};

// ----- 3. DOM refs -----

const zonesEl = document.getElementById('zones');
const tray = document.getElementById('tray');
const placedCountEl = document.getElementById('placed-count');
const resetBtn = document.getElementById('reset-btn');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const celebrate = document.getElementById('celebrate');
const celebrateGroups = document.getElementById('celebrate-groups');
const celebrateClose = document.getElementById('celebrate-close');

// ----- 4. Build tray -----

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTray() {
  tray.innerHTML = '';
  tray.classList.remove('empty');
  const order = shuffle(INSTRUMENTS);
  for (const ins of order) {
    tray.appendChild(makeCard(ins));
  }
}

function clearZones() {
  zonesEl.querySelectorAll('.zone-slots').forEach(s => s.innerHTML = '');
}

function makeCard(ins) {
  const c = document.createElement('div');
  c.className = 'card';
  c.dataset.slug = ins.slug;
  c.dataset.family = ins.family;
  c.setAttribute('role', 'button');
  c.setAttribute('tabindex', '0');
  c.setAttribute('aria-label', `${ins.name}. Drag onto its instrument family, or tap to read the fact file.`);
  c.innerHTML = `
    <span class="card-info-dot" aria-hidden="true">i</span>
    <span class="card-icon">${ICONS[ins.slug]}</span>
    <span class="card-name">${ins.name}</span>
  `;
  attachPointerHandlers(c);
  return c;
}

// ----- 5. Pointer drag/drop (mouse + touch + pen) -----

const TAP_THRESHOLD_PX = 6;
const TAP_THRESHOLD_MS = 300;

function attachPointerHandlers(card) {
  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerCancel);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(card.dataset.slug);
    }
  });
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const card = e.currentTarget;
  try { card.setPointerCapture(e.pointerId); } catch (_) {}
  state.pointer.id = e.pointerId;
  state.pointer.startX = e.clientX;
  state.pointer.startY = e.clientY;
  state.pointer.lastX = e.clientX;
  state.pointer.lastY = e.clientY;
  state.pointer.startTime = Date.now();
  state.pointer.moved = false;
  state.dragging = card;
}

function onPointerMove(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const card = state.dragging;
  const dx = e.clientX - state.pointer.startX;
  const dy = e.clientY - state.pointer.startY;
  state.pointer.lastX = e.clientX;
  state.pointer.lastY = e.clientY;

  if (!state.pointer.moved && Math.hypot(dx, dy) > TAP_THRESHOLD_PX) {
    state.pointer.moved = true;
    card.classList.add('dragging');
    // If the card was already placed in a zone, lift it out so it can be redropped
    if (card.classList.contains('placed')) {
      const r = card.getBoundingClientRect();
      card.style.position = 'fixed';
      card.style.left = r.left + 'px';
      card.style.top = r.top + 'px';
      card.style.margin = '0';
      document.body.appendChild(card);
      state.pointer.startX = e.clientX;
      state.pointer.startY = e.clientY;
      card.classList.remove('placed');
      state.placed = Math.max(0, state.placed - 1);
      updateCount();
      maybeMarkTrayEmpty();
    }
  }
  if (state.pointer.moved) {
    card.style.transform = `translate(${dx}px, ${dy}px) scale(1.06) rotate(-1.5deg)`;
    highlightZoneUnder(e.clientX, e.clientY, card);
  }
}

function onPointerUp(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const card = state.dragging;
  const wasDrag = state.pointer.moved;
  const elapsed = Date.now() - state.pointer.startTime;

  clearZoneHighlights();

  if (!wasDrag && elapsed < TAP_THRESHOLD_MS * 2) {
    resetCard(card);
    openModal(card.dataset.slug);
  } else {
    const zone = zoneUnderPoint(e.clientX, e.clientY);
    if (zone && zone.dataset.family === card.dataset.family) {
      placeCardIntoZone(card, zone);
    } else {
      bounceBack(card);
    }
  }

  state.dragging = null;
  state.pointer.id = null;
  state.pointer.moved = false;
  try { card.releasePointerCapture(e.pointerId); } catch (_) {}
}

function onPointerCancel(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const card = state.dragging;
  bounceBack(card);
  clearZoneHighlights();
  state.dragging = null;
  state.pointer.id = null;
  state.pointer.moved = false;
}

function zoneUnderPoint(x, y) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (el.classList && el.classList.contains('zone')) return el;
    if (el.closest) {
      const z = el.closest('.zone');
      if (z) return z;
    }
  }
  return null;
}

function highlightZoneUnder(x, y, card) {
  clearZoneHighlights();
  const zone = zoneUnderPoint(x, y);
  if (!zone) return;
  if (zone.dataset.family === card.dataset.family) {
    zone.classList.add('drop-hover');
  } else {
    zone.classList.add('drop-reject');
  }
}

function clearZoneHighlights() {
  document.querySelectorAll('.zone.drop-hover, .zone.drop-reject').forEach(z => {
    z.classList.remove('drop-hover', 'drop-reject');
  });
}

function resetCard(card) {
  card.classList.remove('dragging');
  card.style.transform = '';
  if (card.style.position === 'fixed') {
    card.style.position = '';
    card.style.left = '';
    card.style.top = '';
    card.style.margin = '';
  }
}

function bounceBack(card) {
  resetCard(card);
  // If lifted out from a zone, return to tray
  if (card.parentElement === document.body) {
    tray.appendChild(card);
    maybeMarkTrayEmpty();
  }
  card.classList.add('bounce-back');
  setTimeout(() => card.classList.remove('bounce-back'), 340);
  playTone(220, 0.07, 'square', 0.08);
}

function placeCardIntoZone(card, zone) {
  resetCard(card);
  const slots = zone.querySelector('.zone-slots');
  slots.appendChild(card);
  card.classList.add('placed', 'snap-in');
  setTimeout(() => card.classList.remove('snap-in'), 380);
  state.placed += 1;
  updateCount();
  maybeMarkTrayEmpty();
  playTone(660, 0.10, 'sine', 0.12);
  setTimeout(() => playTone(990, 0.10, 'sine', 0.10), 70);
  if (state.placed === TOTAL) {
    setTimeout(triggerCompletion, 550);
  }
}

function maybeMarkTrayEmpty() {
  if (tray.children.length === 0) {
    tray.classList.add('empty');
  } else {
    tray.classList.remove('empty');
  }
}

function updateCount() {
  placedCountEl.textContent = state.placed;
}

// ----- 6. Completion -----

function triggerCompletion() {
  buildCelebrationContent();
  celebrate.hidden = false;
  playChord();
}

function buildCelebrationContent() {
  celebrateGroups.innerHTML = '';
  for (const key of ['strings', 'percussion', 'wind', 'freereed']) {
    const info = FAMILY_INFO[key];
    const div = document.createElement('div');
    div.className = 'celebrate-group';
    div.style.background = `var(--f-${key})`;
    div.innerHTML = `<span>${info.name}</span><small>${info.members}</small>`;
    celebrateGroups.appendChild(div);
  }
}

celebrateClose.addEventListener('click', () => { celebrate.hidden = true; });

// ----- 7. Modal (full info) -----

function openModal(slug) {
  const ins = INSTRUMENTS.find(i => i.slug === slug);
  if (!ins) return;
  modalBody.innerHTML = renderModalHTML(ins);
  modal.hidden = false;
}

function closeModal() { modal.hidden = true; }

modal.addEventListener('click', (e) => {
  if (e.target.dataset.close !== undefined) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); celebrate.hidden = true; }
});

function renderModalHTML(ins) {
  const famLabel = FAMILY_LABEL[ins.family];
  return `
    <div class="modal-head">
      <div class="modal-icon">${ICONS[ins.slug]}</div>
      <div>
        <h2 class="modal-name" id="modal-name">${escapeHTML(ins.name)}</h2>
        <span class="modal-sub fam-${ins.family}">${escapeHTML(famLabel)}</span>
      </div>
    </div>
    <p>${escapeHTML(ins.summary)}</p>
    <div class="modal-section">
      <h3>How it's used</h3>
      <p>${escapeHTML(ins.description)}</p>
    </div>
    <div class="modal-section">
      <h3>Role in the music</h3>
      <p>${escapeHTML(ins.role)}</p>
    </div>
    <div class="modal-section">
      <h3>Notable players</h3>
      <p class="players">${escapeHTML(ins.players)}</p>
    </div>
  `;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ----- 8. Sound (Web Audio synth) -----

function getAudio() {
  if (!state.audioCtx) {
    try { state.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; }
  }
  return state.audioCtx;
}

function playTone(freq, dur = 0.1, type = 'sine', volume = 0.1) {
  const ctx = getAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur + 0.02);
}

function playChord() {
  [523.25, 659.25, 783.99].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.55, 'sine', 0.12), i * 110);
  });
}

// ----- 9. Reset -----

resetBtn.addEventListener('click', () => {
  state.placed = 0;
  updateCount();
  celebrate.hidden = true;
  clearZones();
  buildTray();
});

// ----- 10. Init -----

buildTray();
updateCount();
