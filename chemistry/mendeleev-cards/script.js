/* ============================================================
   Mendeleev's Cards — drag-drop periodic table activity
   ------------------------------------------------------------
   Works on mouse + touch via Pointer Events.
   Self-contained: no build step, no external deps.
   ============================================================ */

// ----- 1. Element data (inlined so file:// works) -----

const ELEMENTS_DATA = [
  {"name":"Lithium","symbol":"Li","slug":"lithium","atomic_weight":"7","appearance":"silver white metallic solid","discovery":"1817 Johan August Arfwedson\nisolated by William Thomas Brande 1821","melting_point":"180.5oC","boiling_point":"1330 °C","density":"0.534 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"floats, reacts moderately vigorously, disappears leaving a colourless alkaline solution with the evolution of hydrogen gas","reaction_air":"reacts exothermically with the moisture and oxygen in the air and is stored under oil","other_reactions":"compounds produce rose-red flame when burned","images":["lithium-1.jpg","lithium-2.png"]},
  {"name":"Beryllium","symbol":"Be","slug":"beryllium","atomic_weight":"9","appearance":"silver grey metallic solid","discovery":"Louis Nicolas Vauquelin (1797)\nisolated by Friedrich Wöhler & Antoine Bussy (1828)","melting_point":"1287oC","boiling_point":"2970 °C","density":"1.85 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"no reaction","reaction_air":"slowly tarnishes in air but burns brightly when heated to 1000oC","other_reactions":"compounds do not impart a colour to a Bunsen flame","images":["beryllium-1.png"]},
  {"name":"Boron","symbol":"B","slug":"boron","atomic_weight":"11","appearance":"black-brown solid","discovery":"Joseph Louis Gay-Lussac and Louis Jacques Thénard 1808\nisolated by Humphry Davy 1808","melting_point":"2076oC","boiling_point":"3927 °C","density":"2.08 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"none","reaction_air":"none at RT but will burn at very high temperatures","other_reactions":"hardly reactive at all but will react very slowly with very concentrated strong acids","images":["boron-1.jpg"]},
  {"name":"Carbon","symbol":"C","slug":"carbon","atomic_weight":"12","appearance":"diamond colourless solid reflects light when cut\ngraphite slippery grey solid","discovery":"Joseph Louis Gay-Lussac and Louis Jacques Thénard 1808\nisolated by Humphry Davy 1808","melting_point":"3800oC diamond   3600oC graphite","boiling_point":"Graphite sublimes and diamond turns to graphite when heated strongly","density":"diamond 3.5 g cm⁻³, graphite 2.6 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"none","reaction_air":"none at RT but will burn when ignited at very high temperatures with the release of a large amount of heat","other_reactions":"","images":["carbon-1.jpg","carbon-2.jpg"]},
  {"name":"Nitrogen","symbol":"N","slug":"nitrogen","atomic_weight":"14","appearance":"a colourless odourless gas","discovery":"Daniel Rutherford (1772)","melting_point":"-210oC","boiling_point":"-196oC","density":"0.00125 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"none","reaction_air":"none","other_reactions":"extremely unreactive","images":["nitrogen-1.jpg"]},
  {"name":"Oxygen","symbol":"O","slug":"oxygen","atomic_weight":"16","appearance":"a colourless odourless gas","discovery":"Daniel Rutherford (1772)","melting_point":"-219oC","boiling_point":"-183oC","density":"0.00142 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"dissolves in water but does not react with water","reaction_air":"None — oxygen is part of air","other_reactions":"extremely reactive supports combustion, meaning all substances require oxygen to burn","images":["oxygen-1.gif"]},
  {"name":"Fluorine","symbol":"F","slug":"fluorine","atomic_weight":"19","appearance":"a pale yellow, corrosive gas","discovery":"André-Marie Ampère (predicted 1810)\nisolated by Henri Moissan (1886)","melting_point":"-220oC","boiling_point":"-188 °C","density":"0.001696 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"water burns in fluorine with a bright flame","reaction_air":"no reaction","other_reactions":"a pale yellow, corrosive gas, which reacts with practically everything. Finely divided metals, glass, ceramics, carbon, and even water burn in fluorine with a bright flame.","images":["fluorine-1.jpg"]},
  {"name":"Sodium","symbol":"Na","slug":"sodium","atomic_weight":"23","appearance":"silver white metallic solid","discovery":"Humphry Davy (1807)","melting_point":"97.8oC","boiling_point":"883 °C","density":"0.968 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"floats, reacts vigorously, melts into a ball, disappears leaving a colourless alkaline solution with the evolution of hydrogen gas","reaction_air":"reacts exothermically with the moisture and oxygen in the air and is stored under oil","other_reactions":"compounds produce yellow flame when burned","images":["sodium-1.jpg","sodium-2.jpg"]},
  {"name":"Magnesium","symbol":"Mg","slug":"magnesium","atomic_weight":"24","appearance":"grey metallic solid","discovery":"Joseph Black (1755)\nisolated by Humphry Davy (1808)","melting_point":"650oC","boiling_point":"1090 °C","density":"1.738 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"sinks; magnesium ribbon floats; reaction takes years but will react with steam to form magnesium oxide and evolve hydrogen","reaction_air":"reaction in air is extremely slow at room temperature but burns with a very bright white light when ignited","other_reactions":"compounds do not impart a colour to a flame but metal burns with an extremely bright white light","images":["magnesium-1.jpg","magnesium-2.jpg"]},
  {"name":"Aluminium","symbol":"Al","slug":"aluminium","atomic_weight":"27","appearance":"silvery grey metal","discovery":"predicted by Antoine Lavoisier 1787\nisolated by Friedrich Wöhler 1827; named by Humphry Davy 1807","melting_point":"660oC","boiling_point":"2470oC","density":"2.70 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"no reaction","reaction_air":"corrosion resistant but powder burns extremely brightly in a flame","other_reactions":"","images":["aluminium-1.jpg","aluminium-2.jpg"]},
  {"name":"Silicon","symbol":"Si","slug":"silicon","atomic_weight":"28","appearance":"crystalline, reflective with bluish-tinged faces","discovery":"predicted by Antoine Lavoisier 1787\nisolated by Berzelius 1823; named by Thomas Thompson 1817","melting_point":"1414oC","boiling_point":"3265 °C","density":"2.33 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"no reaction","reaction_air":"no reaction","other_reactions":"no reaction with acids but will react with strong bases","images":["silicon-1.jpg"]},
  {"name":"Phosphorous","symbol":"P","slug":"phosphorous","atomic_weight":"31","appearance":"several different solid crystal forms; white and red phosphorous are the most common","discovery":"Hennig Brand 1669; recognised as an element by Antoine Lavoisier","melting_point":"227oC","boiling_point":"442oC","density":"1.82 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"can be stored in water to prevent it from reacting with oxygen in the air; completely unreactive with water","reaction_air":"white phosphorous glows in the dark when exposed to oxygen, with a very faint tinge of green and blue","other_reactions":"highly flammable and pyrophoric (self-igniting) on contact with air, and is very toxic","images":["phosphorous-1.jpg","phosphorous-2.png"]},
  {"name":"Sulfur","symbol":"S","slug":"sulfur","atomic_weight":"32","appearance":"a yellow solid with a pungent smell","discovery":"Chinese, before 2000BC; recognised as an element by Antoine Lavoisier","melting_point":"114oC","boiling_point":"444oC","density":"2.07 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"powder floats on water","reaction_air":"sulfur melts to a blood-red liquid and burns with a blue flame which is best viewed in the dark; the combustion product is a very pungent acidic gas","other_reactions":"reacts with iron — once started the reaction continues, glowing red hot","images":["sulfur-1.jpg","sulfur-2.png","sulfur-3.jpg"]},
  {"name":"Chlorine","symbol":"Cl","slug":"chlorine","atomic_weight":"35.5","appearance":"a pale green, corrosive gas with a distinctive choking odour (similar to bleach)","discovery":"Carl Wilhelm Scheele (1774); recognised as an element by Humphry Davy (1808)","melting_point":"-101oC","boiling_point":"-34 °C","density":"1.56 g cm⁻³ (at m.p.)","reaction_water":"dissolves in water forming an acidic solution","reaction_air":"none — heavier than air","other_reactions":"a pale green, corrosive gas which reacts with practically everything","images":["chlorine-1.jpg"]},
  {"name":"Potassium","symbol":"K","slug":"potassium","atomic_weight":"39","appearance":"silver white metallic solid","discovery":"Humphry Davy (1807)","melting_point":"63.5oC","boiling_point":"759 °C","density":"0.862 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"floats, reacts violently, bursts into a lilac flame, disappears leaving a colourless alkaline solution with the evolution of hydrogen gas","reaction_air":"reacts exothermically with the moisture and oxygen in the air and is stored under oil","other_reactions":"compounds produce a lilac flame when burned","images":["potassium-1.jpg","potassium-2.jpg"]},
  {"name":"Calcium","symbol":"Ca","slug":"calcium","atomic_weight":"40","appearance":"silver-grey, sometimes yellow, metallic solid","discovery":"Humphry Davy (1808)","melting_point":"842oC","boiling_point":"1484 °C","density":"1.55 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"sinks; reacts vigorously; leaves an alkaline solution and a white precipitate with the evolution of hydrogen gas","reaction_air":"reaction with oxygen or air is extremely slow at room temperature","other_reactions":"compounds burn with a brick-red flame","images":["calcium-1.jpg","calcium-2.jpg"]},
  {"name":"Bromine","symbol":"Br","slug":"bromine","atomic_weight":"80","appearance":"red-brown liquid surrounded by a red-brown vapour","discovery":"Antoine Jérôme Balard and Leopold Gmelin (1825)","melting_point":"-7.2oC","boiling_point":"58.8 °C","density":"3.1 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"dissolves in water leaving a yellow-orange acidic solution known as bromine water","reaction_air":"none","other_reactions":"reacts with metals in the presence of water","images":["bromine-1.jpg"]},
  {"name":"Rubidium","symbol":"Rb","slug":"rubidium","atomic_weight":"85","appearance":"silver white metallic solid","discovery":"Robert Bunsen (1861)","melting_point":"39oC","boiling_point":"688 °C","density":"1.532 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"floats; reacts violently, sometimes explosively; bursts into a lilac flame, disappears leaving a colourless alkaline solution with the evolution of hydrogen gas","reaction_air":"reacts exothermically with the moisture and oxygen in the air and is stored under oil","other_reactions":"compounds produce a lilac flame when burned","images":["rubidium-1.jpg","rubidium-2.jpg"]},
  {"name":"Strontium","symbol":"Sr","slug":"strontium","atomic_weight":"88","appearance":"silver-grey, sometimes yellow, metallic solid","discovery":"William Cruickshank (1787); isolated by Humphry Davy (1808)","melting_point":"777oC","boiling_point":"1377 °C","density":"2.64 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"sinks; reacts extremely violently; leaves an alkaline solution and a white precipitate with the evolution of hydrogen gas","reaction_air":"reaction with oxygen or air occurs at room temperature, and therefore strontium is stored under oil","other_reactions":"compounds burn with an orange-red flame","images":["strontium-1.jpg","strontium-2.jpg"]},
  {"name":"Iodine","symbol":"I","slug":"iodine","atomic_weight":"127","appearance":"lustrous metallic grey-black solid which sublimes to a purple vapour","discovery":"Bernard Courtois (1811)","melting_point":"114oC","boiling_point":"184 °C","density":"4.93 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"reacts to form a weakly acidic solution","reaction_air":"none","other_reactions":"reacts with metals in the presence of water","images":["iodine-1.jpg","iodine-2.jpg"]},
  {"name":"Caesium","symbol":"Cs","slug":"caesium","atomic_weight":"133","appearance":"silver-gold metallic solid","discovery":"Robert Bunsen (1861)","melting_point":"28.5oC","boiling_point":"671 °C","density":"1.93 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"reacts explosively even with ice at low temperatures; disappears leaving a colourless alkaline solution with the evolution of hydrogen gas","reaction_air":"reacts exothermically with the moisture and oxygen in the air and is stored under oil","other_reactions":"","images":["caesium-1.jpg","caesium-2.jpg"]},
  {"name":"Barium","symbol":"Ba","slug":"barium","atomic_weight":"137","appearance":"silver-grey metallic solid","discovery":"Carl Wilhelm Scheele (1772); isolated by Humphry Davy (1808)","melting_point":"727oC","boiling_point":"1845 °C","density":"3.51 g cm⁻³ (at 0 °C, 101.325 Kpa)","reaction_water":"sinks; reacts extremely violently; leaves an alkaline solution and a white precipitate with the evolution of hydrogen gas","reaction_air":"reaction with oxygen or air occurs at room temperature, and therefore barium is stored under oil","other_reactions":"compounds burn with an apple-green flame","images":["barium-1.jpg","barium-2.jpg"]}
];

// ----- 2. Periodic table layout (Mendeleev short form) -----
// period: 2-6, group: 1-7

const POSITIONS = {
  Li:  [2,1], Be: [2,2], B:  [2,3], C:  [2,4], N:  [2,5], O:  [2,6], F:  [2,7],
  Na:  [3,1], Mg: [3,2], Al: [3,3], Si: [3,4], P:  [3,5], S:  [3,6], Cl: [3,7],
  K:   [4,1], Ca: [4,2],                                              Br: [4,7],
  Rb:  [5,1], Sr: [5,2],                                              I:  [5,7],
  Cs:  [6,1], Ba: [6,2]
};

const PERIODS = [2,3,4,5,6];
const GROUPS  = [1,2,3,4,5,6,7];

const GROUP_INFO = {
  1: { name: "Alkali metals",      blurb: "Soft, silvery; all react with water." },
  2: { name: "Alkaline earth",     blurb: "Harder metals; react less vigorously." },
  3: { name: "Group III",          blurb: "Boron + Aluminium; form +3 ions." },
  4: { name: "Group IV",           blurb: "Carbon + Silicon; form 4 covalent bonds." },
  5: { name: "Group V",            blurb: "Nitrogen + Phosphorous; non-metals." },
  6: { name: "Group VI",           blurb: "Oxygen + Sulfur; reactive non-metals." },
  7: { name: "Halogens",           blurb: "Coloured; very reactive non-metals." },
};

// ----- 3. State -----

const state = {
  placed: 0,
  dragging: null,
  pointer: { id: null, startX: 0, startY: 0, lastX: 0, lastY: 0, startTime: 0, moved: false },
  audioCtx: null
};

// ----- 4. DOM refs -----

const grid = document.getElementById('grid');
const tray = document.getElementById('tray');
const groupLabels = document.getElementById('group-labels');
const placedCountEl = document.getElementById('placed-count');
const resetBtn = document.getElementById('reset-btn');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const celebrate = document.getElementById('celebrate');
const celebrateGroups = document.getElementById('celebrate-groups');
const celebrateClose = document.getElementById('celebrate-close');

// ----- 5. Build grid -----

function buildGrid() {
  grid.innerHTML = '';
  // Reverse-lookup: position → symbol
  const expected = {};
  for (const [sym, [p, g]] of Object.entries(POSITIONS)) {
    expected[`${p}-${g}`] = sym;
  }
  for (const p of PERIODS) {
    for (const g of GROUPS) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.period = p;
      cell.dataset.group  = g;
      const sym = expected[`${p}-${g}`];
      if (sym) {
        cell.dataset.symbol = sym;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `Drop ${sym} here`);
      } else {
        cell.classList.add('empty');
        cell.setAttribute('aria-hidden', 'true');
      }
      grid.appendChild(cell);
    }
  }
}

// ----- 6. Build tray -----

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
  const order = shuffle(ELEMENTS_DATA);
  for (const el of order) {
    tray.appendChild(makeCard(el));
  }
}

function makeCard(el) {
  const c = document.createElement('div');
  c.className = 'card';
  c.dataset.symbol = el.symbol;
  c.dataset.slug = el.slug;
  c.setAttribute('role', 'button');
  c.setAttribute('tabindex', '0');
  c.setAttribute('aria-label', `${el.name}, symbol ${el.symbol}, atomic weight ${el.atomic_weight}. Drag onto the grid or tap to see details.`);
  c.innerHTML = `
    <span class="weight">${el.atomic_weight}</span>
    <span class="symbol">${el.symbol}</span>
    <span class="name">${el.name}</span>
  `;
  attachPointerHandlers(c);
  return c;
}

// ----- 7. Pointer drag/drop (works on mouse + touch + pen) -----

const TAP_THRESHOLD_PX = 6;
const TAP_THRESHOLD_MS = 300;

function attachPointerHandlers(card) {
  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerCancel);
  // Keyboard accessibility: Enter/Space opens info modal
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(card.dataset.slug);
    }
  });
}

function onPointerDown(e) {
  // Ignore non-primary buttons on mouse
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

  // Detect drag (move past tap threshold)
  if (!state.pointer.moved && Math.hypot(dx, dy) > TAP_THRESHOLD_PX) {
    state.pointer.moved = true;
    card.classList.add('dragging');
    // If placed in a cell, lift it out so layout updates aren't fighting the drag
    if (card.classList.contains('placed')) {
      const homeCell = card.parentElement;
      card.dataset.fromCellPeriod = homeCell.dataset.period;
      card.dataset.fromCellGroup = homeCell.dataset.group;
      // Detach and place on body, fixed-positioned at original rect
      const r = card.getBoundingClientRect();
      card.style.position = 'fixed';
      card.style.left = r.left + 'px';
      card.style.top = r.top + 'px';
      card.style.margin = '0';
      document.body.appendChild(card);
      // Reset translate baseline against the new fixed position
      state.pointer.startX = e.clientX;
      state.pointer.startY = e.clientY;
      homeCell.classList.remove('filled');
      card.classList.remove('placed');
      state.placed = Math.max(0, state.placed - 1);
      updateCount();
    }
  }
  if (state.pointer.moved) {
    card.style.transform = `translate(${dx}px, ${dy}px) scale(1.08) rotate(-1.5deg)`;
    highlightCellUnder(e.clientX, e.clientY, card);
  }
}

function onPointerUp(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const card = state.dragging;
  const wasDrag = state.pointer.moved;
  const elapsed = Date.now() - state.pointer.startTime;

  clearCellHighlights();

  if (!wasDrag && elapsed < TAP_THRESHOLD_MS * 2) {
    // Treat as a tap → open info modal
    resetCard(card);
    openModal(card.dataset.slug);
  } else {
    // Check the drop target
    const cell = cellUnderPoint(e.clientX, e.clientY);
    if (cell && cell.dataset.symbol === card.dataset.symbol && !cell.classList.contains('filled')) {
      placeCardIntoCell(card, cell);
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
  clearCellHighlights();
  state.dragging = null;
  state.pointer.id = null;
  state.pointer.moved = false;
}

function cellUnderPoint(x, y) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (el.classList && el.classList.contains('cell')) return el;
  }
  return null;
}

function highlightCellUnder(x, y, card) {
  clearCellHighlights();
  const cell = cellUnderPoint(x, y);
  if (!cell) return;
  if (cell.classList.contains('empty') || cell.classList.contains('filled')) {
    cell.classList.add('drop-reject');
  } else if (cell.dataset.symbol === card.dataset.symbol) {
    cell.classList.add('drop-hover');
  } else {
    cell.classList.add('drop-reject');
  }
}

function clearCellHighlights() {
  document.querySelectorAll('.cell.drop-hover, .cell.drop-reject').forEach(c => {
    c.classList.remove('drop-hover', 'drop-reject');
  });
}

function resetCard(card) {
  // Strip any inline drag positioning
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
  // If it was lifted out from a cell during the drag, put it back into the tray
  if (card.parentElement === document.body) {
    tray.appendChild(card);
  }
  card.classList.add('bounce-back');
  setTimeout(() => card.classList.remove('bounce-back'), 320);
  playTone(220, 0.06, 'square', 0.08);
}

function placeCardIntoCell(card, cell) {
  resetCard(card);
  cell.appendChild(card);
  cell.classList.add('filled');
  card.classList.add('placed', 'snap-in');
  setTimeout(() => card.classList.remove('snap-in'), 360);
  state.placed += 1;
  updateCount();
  playTone(660, 0.10, 'sine', 0.12);
  setTimeout(() => playTone(990, 0.10, 'sine', 0.10), 70);
  if (state.placed === 22) {
    setTimeout(triggerCompletion, 500);
  }
}

function updateCount() {
  placedCountEl.textContent = state.placed;
}

// ----- 8. Completion reveal -----

function triggerCompletion() {
  grid.classList.add('revealed');
  groupLabels.classList.add('revealed');
  buildCelebrationContent();
  setTimeout(() => {
    celebrate.hidden = false;
    playChord();
  }, 600);
}

function buildCelebrationContent() {
  celebrateGroups.innerHTML = '';
  for (const g of GROUPS) {
    const info = GROUP_INFO[g];
    const div = document.createElement('div');
    div.className = 'celebrate-group';
    div.style.background = `var(--g${g})`;
    if (g === 3) div.style.color = '#222';
    div.innerHTML = `<span>${info.name}</span><small>Col ${g}</small>`;
    celebrateGroups.appendChild(div);
  }
}

celebrateClose.addEventListener('click', () => { celebrate.hidden = true; });

// ----- 9. Modal (full info) -----

function openModal(slug) {
  const el = ELEMENTS_DATA.find(e => e.slug === slug);
  if (!el) return;
  modalBody.innerHTML = renderModalHTML(el);
  modal.hidden = false;
}

function closeModal() { modal.hidden = true; }

modal.addEventListener('click', (e) => {
  if (e.target.dataset.close !== undefined) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); celebrate.hidden = true; }
});

function renderModalHTML(el) {
  const photos = (el.images || []).map(src =>
    `<img src="elements/${src}" alt="${el.name}" loading="lazy" />`
  ).join('');
  const row = (label, value) => value && value.trim()
    ? `<tr><th>${label}</th><td>${escapeHTML(value)}</td></tr>`
    : '';
  return `
    <div class="modal-head">
      <div class="modal-symbol">
        <span class="w">${escapeHTML(el.atomic_weight)}</span>
        <span class="sym">${escapeHTML(el.symbol)}</span>
      </div>
      <div>
        <h2 class="modal-name" id="modal-name">${escapeHTML(el.name)}</h2>
        <p class="modal-sub">Relative atomic weight ${escapeHTML(el.atomic_weight)}</p>
      </div>
    </div>
    ${photos ? `<div class="modal-photos">${photos}</div>` : ''}
    <table class="modal-props">
      ${row('Appearance', el.appearance)}
      ${row('Discovery', el.discovery)}
      ${row('Melting point', el.melting_point)}
      ${row('Boiling point', el.boiling_point)}
      ${row('Density', el.density)}
      ${row('Reaction with water', el.reaction_water)}
      ${row('Reaction with air', el.reaction_air)}
      ${row('Other reactions', el.other_reactions)}
    </table>
  `;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ----- 10. Sound (Web Audio synth, no files) -----

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
  // Simple major chord celebration
  [523.25, 659.25, 783.99].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.55, 'sine', 0.12), i * 110);
  });
}

// ----- 11. Reset -----

resetBtn.addEventListener('click', () => {
  state.placed = 0;
  updateCount();
  grid.classList.remove('revealed');
  groupLabels.classList.remove('revealed');
  celebrate.hidden = true;
  buildGrid();
  buildTray();
});

// ----- 12. Init -----

buildGrid();
buildTray();
updateCount();
