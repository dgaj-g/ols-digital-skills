/* ============================================================
   Follow in the Footsteps of Mendeleev
   ------------------------------------------------------------
   A 4-act guided journey. All drag/drop uses Pointer Events
   so the same code path handles mouse, touch and pen.
   Self-contained, no build step, works from file:// .
   ============================================================ */

/* ============================================================
   1. ELEMENT DATA — from Teresa's amended element_cards.pptx
   ============================================================ */

const ELEMENTS = [
  { name:"Lithium",    symbol:"Li", slug:"lithium",    weight:7,
    appearance:"silver white metallic solid",
    melting:"180.5 °C", boiling:"1330 °C",
    reaction_water:"floats, reacts moderately vigorously, disappears leaving a colourless alkaline solution with the evolution of hydrogen gas",
    reaction_air:"reacts exothermically with the moisture and oxygen in the air and is stored under oil",
    other_reactions:"compounds produce a rose-red flame when burned",
    images:["lithium-1.jpg","lithium-2.png"],
    bin1:"reactive-flame", family:"alkali" },

  { name:"Beryllium",  symbol:"Be", slug:"beryllium",  weight:9,
    appearance:"silver grey metallic solid",
    melting:"1287 °C", boiling:"2970 °C",
    reaction_water:"no reaction",
    reaction_air:"slowly tarnishes in air but burns brightly when heated to 1000 °C",
    other_reactions:"compounds do not impart a colour to a Bunsen flame",
    images:["beryllium-1.png"],
    bin1:"no-reaction", family:null },

  { name:"Boron",      symbol:"B",  slug:"boron",      weight:11,
    appearance:"black-brown solid",
    melting:"2076 °C", boiling:"3927 °C",
    reaction_water:"none",
    reaction_air:"none at room temperature, but will burn at very high temperatures",
    other_reactions:"hardly reactive; will react very slowly with very concentrated strong acids",
    images:["boron-1.jpg"],
    bin1:"no-reaction", family:null },

  { name:"Carbon",     symbol:"C",  slug:"carbon",     weight:12,
    appearance:"diamond — colourless solid that reflects light when cut; graphite — slippery grey solid",
    melting:"3800 °C (diamond), 3600 °C (graphite)",
    boiling:"graphite sublimes; diamond turns to graphite when heated strongly",
    reaction_water:"none",
    reaction_air:"none at room temperature, but will burn at very high temperatures, releasing a large amount of heat",
    other_reactions:"",
    images:["carbon-1.jpg","carbon-2.jpg"],
    bin1:"no-reaction", family:null },

  { name:"Nitrogen",   symbol:"N",  slug:"nitrogen",   weight:14,
    appearance:"a colourless, odourless gas",
    melting:"−210 °C", boiling:"−196 °C",
    reaction_water:"none",
    reaction_air:"none",
    other_reactions:"extremely unreactive",
    images:["nitrogen-1.jpg"],
    bin1:"no-reaction", family:null },

  { name:"Oxygen",     symbol:"O",  slug:"oxygen",     weight:16,
    appearance:"a colourless, odourless gas",
    melting:"−219 °C", boiling:"−183 °C",
    reaction_water:"dissolves in water but does not react with water",
    reaction_air:"none — oxygen is part of air",
    other_reactions:"extremely reactive; supports combustion — all substances require oxygen to burn",
    images:["oxygen-1.gif"],
    bin1:"other", family:null },

  { name:"Fluorine",   symbol:"F",  slug:"fluorine",   weight:19,
    appearance:"a pale yellow, corrosive gas",
    melting:"−220 °C", boiling:"−188 °C",
    reaction_water:"water burns in fluorine with a bright flame",
    reaction_air:"no reaction",
    other_reactions:"a pale yellow, corrosive gas which reacts with practically everything. Finely divided metals, glass, ceramics, carbon, and even water burn in fluorine with a bright flame.",
    images:["fluorine-1.jpg"],
    bin1:"other", family:null },

  { name:"Sodium",     symbol:"Na", slug:"sodium",     weight:23,
    appearance:"silver white metallic solid",
    melting:"97.8 °C", boiling:"883 °C",
    reaction_water:"floats, reacts vigorously, melts into a ball, disappears leaving a colourless alkaline solution with the evolution of hydrogen gas",
    reaction_air:"reacts exothermically with the moisture and oxygen in the air and is stored under oil",
    other_reactions:"compounds produce a yellow flame when burned",
    images:["sodium-1.jpg","sodium-2.jpg"],
    bin1:"reactive-flame", family:"alkali" },

  { name:"Magnesium",  symbol:"Mg", slug:"magnesium",  weight:24,
    appearance:"grey metallic solid",
    melting:"650 °C", boiling:"1090 °C",
    reaction_water:"sinks; magnesium ribbon floats; reaction takes years but will react with steam to form magnesium oxide and evolve hydrogen",
    reaction_air:"reaction in air is extremely slow at room temperature, but burns with a very bright white light when ignited",
    other_reactions:"compounds do not impart a colour to a flame, but the metal burns with an extremely bright white light",
    images:["magnesium-1.jpg","magnesium-2.jpg"],
    bin1:"other", family:null },

  { name:"Aluminium",  symbol:"Al", slug:"aluminium",  weight:27,
    appearance:"silvery grey metal",
    melting:"660 °C", boiling:"2470 °C",
    reaction_water:"no reaction",
    reaction_air:"corrosion-resistant, but powder burns extremely brightly in a flame",
    other_reactions:"reacts with iodine when drops of water are added: clouds of purple iodine vapour are released as heat is generated; the mixture then bursts into flame, producing a white smoke together with the iodine vapour, and leaving a glowing white residue of aluminium iodide",
    images:["aluminium-1.jpg","aluminium-2.jpg"],
    bin1:"no-reaction", family:null },

  { name:"Silicon",    symbol:"Si", slug:"silicon",    weight:28,
    appearance:"crystalline, reflective with bluish-tinged faces",
    melting:"1414 °C", boiling:"3265 °C",
    reaction_water:"no reaction",
    reaction_air:"no reaction",
    other_reactions:"no reaction with acids, but will react with strong bases",
    images:["silicon-1.jpg"],
    bin1:"no-reaction", family:null },

  { name:"Phosphorous",symbol:"P",  slug:"phosphorous",weight:31,
    appearance:"several different solid crystal forms; white phosphorous and red phosphorous are most common",
    melting:"227 °C", boiling:"442 °C",
    reaction_water:"can be stored in water to prevent it from reacting with oxygen in the air; completely unreactive with water",
    reaction_air:"white phosphorous glows in the dark when exposed to oxygen, with a very faint tinge of green and blue",
    other_reactions:"highly flammable and pyrophoric (self-igniting) on contact with air, and very toxic",
    images:["phosphorous-1.jpg","phosphorous-2.png"],
    bin1:"no-reaction", family:null },

  { name:"Sulfur",     symbol:"S",  slug:"sulfur",     weight:32,
    appearance:"a yellow solid with a pungent smell",
    melting:"114 °C", boiling:"444 °C",
    reaction_water:"powder floats on water",
    reaction_air:"sulfur melts to a blood-red liquid and burns with a blue flame, best viewed in the dark; the combustion product is a very pungent acidic gas",
    other_reactions:"reacts with iron — once started, the reaction continues, glowing red hot",
    images:["sulfur-1.jpg","sulfur-2.png","sulfur-3.jpg"],
    bin1:"no-reaction", family:null },

  { name:"Chlorine",   symbol:"Cl", slug:"chlorine",   weight:35.5,
    appearance:"a pale green, corrosive gas with a distinctive choking odour (similar to bleach)",
    melting:"−101 °C", boiling:"−34 °C",
    reaction_water:"dissolves in water, forming an acidic solution",
    reaction_air:"none — heavier than air",
    other_reactions:"a pale green, corrosive gas which reacts with practically everything",
    images:["chlorine-1.jpg"],
    bin1:["no-reaction","other"], family:null },

  { name:"Potassium",  symbol:"K",  slug:"potassium",  weight:39,
    appearance:"silver white metallic solid",
    melting:"63.5 °C", boiling:"759 °C",
    reaction_water:"floats, reacts violently, bursts into a lilac flame, disappears leaving a colourless alkaline solution with the evolution of hydrogen gas",
    reaction_air:"reacts exothermically with the moisture and oxygen in the air and is stored under oil",
    other_reactions:"compounds produce a lilac flame when burned",
    images:["potassium-1.jpg","potassium-2.jpg"],
    bin1:"reactive-flame", family:"alkali" },

  { name:"Calcium",    symbol:"Ca", slug:"calcium",    weight:40,
    appearance:"silver-grey, sometimes yellow, metallic solid",
    melting:"842 °C", boiling:"1484 °C",
    reaction_water:"sinks; reacts vigorously; leaves an alkaline solution and a white precipitate with the evolution of hydrogen gas",
    reaction_air:"reaction with oxygen or air is extremely slow at room temperature",
    other_reactions:"compounds burn with a brick-red flame",
    images:["calcium-1.jpg","calcium-2.jpg"],
    bin1:"reactive-flame", family:"alkearth" },

  { name:"Bromine",    symbol:"Br", slug:"bromine",    weight:80,
    appearance:"red-brown liquid surrounded by a red-brown vapour",
    melting:"−7.2 °C", boiling:"58.8 °C",
    reaction_water:"dissolves in water, leaving a yellow-orange acidic solution known as bromine water",
    reaction_air:"none",
    other_reactions:"reacts with metals in the presence of water",
    images:["bromine-1.jpg"],
    bin1:["no-reaction","other"], family:null },

  { name:"Rubidium",   symbol:"Rb", slug:"rubidium",   weight:85,
    appearance:"silver white metallic solid",
    melting:"39 °C", boiling:"688 °C",
    reaction_water:"floats; reacts violently, sometimes explosively; bursts into a lilac flame, disappears leaving a colourless alkaline solution with the evolution of hydrogen gas",
    reaction_air:"reacts exothermically with the moisture and oxygen in the air and is stored under oil",
    other_reactions:"compounds produce a lilac flame when burned",
    images:["rubidium-1.jpg","rubidium-2.jpg"],
    bin1:"reactive-flame", family:"alkali" },

  { name:"Strontium",  symbol:"Sr", slug:"strontium",  weight:88,
    appearance:"silver-grey, sometimes yellow, metallic solid",
    melting:"777 °C", boiling:"1377 °C",
    reaction_water:"sinks; reacts extremely violently; leaves an alkaline solution and a white precipitate with the evolution of hydrogen gas",
    reaction_air:"reaction with oxygen or air occurs at room temperature, and therefore strontium is stored under oil",
    other_reactions:"compounds burn with an orange-red flame",
    images:["strontium-1.jpg","strontium-2.jpg"],
    bin1:"reactive-flame", family:"alkearth" },

  { name:"Iodine",     symbol:"I",  slug:"iodine",     weight:127,
    appearance:"lustrous metallic grey-black solid which sublimes to a purple vapour",
    melting:"114 °C", boiling:"184 °C",
    reaction_water:"reacts to form a weakly acidic solution",
    reaction_air:"none",
    other_reactions:"reacts with metals in the presence of water",
    images:["iodine-1.jpg","iodine-2.jpg"],
    bin1:"no-reaction", family:null },

  { name:"Caesium",    symbol:"Cs", slug:"caesium",    weight:133,
    appearance:"silver-gold metallic solid",
    melting:"28.5 °C", boiling:"671 °C",
    reaction_water:"reacts explosively even with ice at low temperatures; disappears leaving a colourless alkaline solution with the evolution of hydrogen gas",
    reaction_air:"reacts exothermically with the moisture and oxygen in the air and is stored under oil",
    other_reactions:"",
    images:["caesium-1.jpg","caesium-2.jpg"],
    bin1:"reactive-flame", family:"alkali" },

  { name:"Barium",     symbol:"Ba", slug:"barium",     weight:137,
    appearance:"silver-grey metallic solid",
    melting:"727 °C", boiling:"1845 °C",
    reaction_water:"sinks; reacts extremely violently; leaves an alkaline solution and a white precipitate with the evolution of hydrogen gas",
    reaction_air:"reaction with oxygen or air occurs at room temperature, and therefore barium is stored under oil",
    other_reactions:"compounds burn with an apple-green flame",
    images:["barium-1.jpg","barium-2.jpg"],
    bin1:"reactive-flame", family:"alkearth" },
];

const BY_SYMBOL = Object.fromEntries(ELEMENTS.map(e => [e.symbol, e]));

/* ============================================================
   2. NARRATOR — Young Bunsens speech bubble
   ============================================================ */

const NARRATOR_LINES = {
  intro:     { img:"anim_03_both_wink.webp",      text:"Hello! We're the Young Bunsens. We'll guide you through Mendeleev's discovery, one step at a time." },
  begin:     { img:"anim_11_rocket_takeoff.webp", text:"Off we go! Mendeleev had to find a hidden pattern. Let's see what he saw." },
  act1_open: { img:"anim_09_lightbulb_idea.webp", text:"Each card holds the facts Mendeleev had. Tap one to read it. Then drag it into the bin you think fits best." },
  act1_correct:  { img:"anim_04_thumbs_up_smile.webp", text:"Good thinking! That one's in the right place." },
  act1_correct2: { img:"anim_07_success_check.webp",   text:"Spot on. Keep going." },
  act1_wrong:    { img:"anim_05_thumbs_down_sad.webp", text:"Hmm, take another look at how it reacts with water — that's the clue." },
  act1_almost:   { img:"anim_09_lightbulb_idea.webp",  text:"You only need the first bin to be right to move on — Mendeleev started by spotting the most reactive ones too." },
  act1_done:     { img:"anim_06_confetti_celebration.webp", text:"Eight reactive elements, all together. That's exactly the group Mendeleev studied next." },

  act2_open: { img:"anim_14_magnifier_scan.webp", text:"Look closer at how each one reacts with water. Some leave a clear alkaline solution. Others leave a cloudy white one. Two families hide in here." },
  act2_correct:  { img:"anim_07_success_check.webp",    text:"Yes — same kind of reaction, same family." },
  act2_first_in: { img:"anim_09_lightbulb_idea.webp",   text:"Nice choice. From now on, that box is this family. Group the others with similar reactions." },
  act2_done:     { img:"anim_06_confetti_celebration.webp", text:"You and Mendeleev have found patterns between the elements — families of elements with similar chemical reactions!" },

  act2b_open: { img:"anim_12_goggles_shine.webp",     text:"Now match the observations to the family they belong to. Some fit both — tap both columns when they do." },
  act2b_correct: { img:"anim_07_success_check.webp",  text:"Yes — that observation fits this family." },
  act2b_wrong:   { img:"anim_05_thumbs_down_sad.webp", text:"That observation doesn't really fit this family. Check the cards again." },
  act2b_done: { img:"anim_15_level_up_stars.webp",    text:"Brilliant — you've mapped what makes each family unique. Onwards to step 3." },

  act3_open: { img:"anim_10_typing_laptop.webp", text:"Mendeleev followed John Newlands and lined the elements up by atomic weight — lightest to heaviest. Seven per row." },
  act3_correct:  { img:"anim_07_success_check.webp", text:"In the right spot — keep going." },
  act3_wrong:    { img:"anim_05_thumbs_down_sad.webp", text:"Not that slot — check the atomic weight in the top-right of each card." },
  act3_done:     { img:"anim_06_confetti_celebration.webp", text:"All 22 elements placed by weight. Now read each column from top to bottom — do they share chemistry?" },

  act4_open: { img:"anim_14_magnifier_scan.webp", text:"Read each column top to bottom. Tap the highlighted card. Does it share chemistry with the ones above it?" },
  act4_yes:  { img:"anim_07_success_check.webp",   text:"Yes — that element fits the column. Locked in." },
  act4_no:   { img:"anim_09_lightbulb_idea.webp",  text:"Spot on. It doesn't fit here. Push it right until it lands with elements that share its chemistry." },
  act4_push: { img:"anim_15_level_up_stars.webp",  text:"Watch — when one element moves, all the heavier ones move with it. Just like Mendeleev did." },
  act4_done: { img:"anim_08_dance_bounce.webp",    text:"Bravo! You've travelled with Mendeleev and found the pattern — the beginning of the Periodic Table." },
};

const narratorImg  = document.getElementById('narrator-img');
const narratorText = document.getElementById('narrator-text');

function narrate(key) {
  const line = NARRATOR_LINES[key];
  if (!line) return;
  narratorImg.classList.add('swap-out');
  setTimeout(() => {
    narratorImg.src = `assets/characters/${line.img}`;
    narratorText.textContent = line.text;
    narratorImg.classList.remove('swap-out');
  }, 180);
}

/* ============================================================
   3. STATE
   ============================================================ */

const state = {
  currentAct: 'intro',
  pointer: { id:null, startX:0, startY:0, lastX:0, lastY:0, startTime:0, moved:false },
  dragging: null,            // currently dragged card or obs-item
  // Act 1
  act1Placed: new Map(),     // symbol -> binId
  // Act 2
  act2Bins: { famA: { family:null, symbols:[] }, famB: { family:null, symbols:[] } },
  // Act 2b
  obsSelected: null,         // current observation id being placed
  obsPlaced: new Set(),      // "obsId|fam" strings
  // Act 3
  act3Placed: new Map(),     // cellIdx -> symbol
  // Act 4
  act4: {
    layout: [],              // 5x7 grid: array of {symbol, locked} or null
    askIdx: 0,
    askOrder: [],
    pushing: false,
  },
  audio: null,
};

const stage = document.getElementById('stage');
const stepPills = document.querySelectorAll('#step-pills li');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const celebrate = document.getElementById('celebrate');
const celebrateChar = document.getElementById('celebrate-char');
const celebrateTitle = document.getElementById('celebrate-title');
const celebrateBody = document.getElementById('celebrate-body');
const celebrateCta = document.getElementById('celebrate-cta');
const celebrateClose = document.getElementById('celebrate-close');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');
const resetBtn = document.getElementById('reset-btn');

/* ============================================================
   4. ACT TRANSITION + PROGRESS PILLS
   ============================================================ */

function showAct(actKey) {
  state.currentAct = actKey;
  document.querySelectorAll('.act').forEach(el => {
    el.hidden = el.dataset.act !== actKey;
  });
  // Pills
  const order = ['intro','1','2','2b','3','4'];
  const idx = order.indexOf(actKey);
  stepPills.forEach(li => {
    const step = li.dataset.step;
    li.classList.remove('active','done');
    // map: pill steps 1,2,3,4 correspond to acts 1, 2/2b, 3, 4
    const pillIdx = step === '1' ? 1 : step === '2' ? 2 : step === '3' ? 4 : 5;
    if (idx === pillIdx || (step === '2' && actKey === '2b')) li.classList.add('active');
    else if (idx > pillIdx) li.classList.add('done');
  });
  // Smooth scroll to top of stage
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   5. SHARED CARD CREATION
   ============================================================ */

function makeCard(el, opts = {}) {
  const c = document.createElement('div');
  c.className = 'card';
  c.dataset.symbol = el.symbol;
  c.dataset.slug = el.slug;
  if (opts.family) c.classList.add(`fam-${opts.family}`);
  c.setAttribute('role', 'button');
  c.setAttribute('tabindex', '0');
  c.setAttribute('aria-label', `${el.name}, symbol ${el.symbol}, atomic weight ${el.weight}. Drag onto a target or tap to read details.`);
  c.innerHTML = `
    <span class="weight">${el.weight}</span>
    <span class="symbol">${el.symbol}</span>
    <span class="name">${el.name}</span>
  `;
  c.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(el.slug); }
  });
  return c;
}

/* ============================================================
   6. POINTER DRAG INFRASTRUCTURE (shared by all acts)
   ============================================================ */

const TAP_PX = 6;
const TAP_MS = 320;

function attachDrag(node, handlers) {
  // handlers: { onTap, onDrop(node, dropTarget, pointerEvent), getDropTarget(x,y), onMoveHover(x,y,node) }
  node.__dragHandlers = handlers;
  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointermove', onPointerMove);
  node.addEventListener('pointerup', onPointerUp);
  node.addEventListener('pointercancel', onPointerCancel);
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const node = e.currentTarget;
  try { node.setPointerCapture(e.pointerId); } catch (_) {}
  state.pointer.id = e.pointerId;
  state.pointer.startX = e.clientX;
  state.pointer.startY = e.clientY;
  state.pointer.lastX = e.clientX;
  state.pointer.lastY = e.clientY;
  state.pointer.startTime = Date.now();
  state.pointer.moved = false;
  state.dragging = node;
}

function onPointerMove(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const node = state.dragging;
  const dx = e.clientX - state.pointer.startX;
  const dy = e.clientY - state.pointer.startY;
  state.pointer.lastX = e.clientX;
  state.pointer.lastY = e.clientY;

  if (!state.pointer.moved && Math.hypot(dx, dy) > TAP_PX) {
    state.pointer.moved = true;
    node.classList.add('dragging');
    // If it was sitting in a container that isn't a flex tray, lift it out
    if (node.parentElement && node.parentElement.classList.contains('placed-host')) {
      const r = node.getBoundingClientRect();
      node.style.position = 'fixed';
      node.style.left = r.left + 'px';
      node.style.top = r.top + 'px';
      node.style.margin = '0';
      document.body.appendChild(node);
      state.pointer.startX = e.clientX;
      state.pointer.startY = e.clientY;
    }
  }
  if (state.pointer.moved) {
    node.style.transform = `translate(${dx}px, ${dy}px) scale(1.08) rotate(-1.5deg)`;
    if (node.__dragHandlers.onMoveHover) {
      node.__dragHandlers.onMoveHover(e.clientX, e.clientY, node);
    }
  }
}

function onPointerUp(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const node = state.dragging;
  const wasDrag = state.pointer.moved;
  const elapsed = Date.now() - state.pointer.startTime;
  clearAllHover();

  if (!wasDrag && elapsed < TAP_MS * 2) {
    resetNode(node);
    if (node.__dragHandlers.onTap) node.__dragHandlers.onTap(node);
  } else {
    const target = node.__dragHandlers.getDropTarget(e.clientX, e.clientY);
    node.__dragHandlers.onDrop(node, target, e);
  }
  state.dragging = null;
  state.pointer.id = null;
  state.pointer.moved = false;
  try { node.releasePointerCapture(e.pointerId); } catch (_) {}
}

function onPointerCancel(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const node = state.dragging;
  bounceCard(node);
  clearAllHover();
  state.dragging = null;
  state.pointer.id = null;
  state.pointer.moved = false;
}

function resetNode(node) {
  node.classList.remove('dragging');
  node.style.transform = '';
  if (node.style.position === 'fixed') {
    node.style.position = '';
    node.style.left = '';
    node.style.top = '';
    node.style.margin = '';
  }
}

function bounceCard(node) {
  resetNode(node);
  node.classList.add('bounce-back');
  setTimeout(() => node.classList.remove('bounce-back'), 320);
}

function clearAllHover() {
  document.querySelectorAll('.drop-hover, .drop-reject').forEach(el => {
    el.classList.remove('drop-hover','drop-reject');
  });
}

function topElementUnder(x, y, matcher) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (matcher(el)) return el;
  }
  return null;
}

/* ============================================================
   7. INFO MODAL
   ============================================================ */

function openModal(slug) {
  const el = ELEMENTS.find(e => e.slug === slug);
  if (!el) return;
  const row = (label, value, klass='') =>
    value && value.toString().trim()
      ? `<tr class="${klass}"><th>${label}</th><td>${escapeHTML(value)}</td></tr>`
      : '';
  const photos = (el.images || []).map(src =>
    `<img src="elements/${src}" alt="${el.name}" loading="lazy" />`
  ).join('');
  modalBody.innerHTML = `
    <div class="modal-head">
      <div class="modal-symbol">
        <span class="w">${el.weight}</span>
        <span class="sym">${escapeHTML(el.symbol)}</span>
      </div>
      <div>
        <h2 class="modal-name" id="modal-name">${escapeHTML(el.name)}</h2>
        <p class="modal-sub">Relative atomic weight ${el.weight}</p>
      </div>
    </div>
    ${photos ? `<div class="modal-photos">${photos}</div>` : ''}
    <table class="modal-props">
      ${row('Appearance', el.appearance)}
      ${row('Melting point', el.melting)}
      ${row('Boiling point', el.boiling)}
      ${row('Reaction with water', el.reaction_water, 'water-row')}
      ${row('Reaction with air', el.reaction_air)}
      ${row('Other reactions', el.other_reactions)}
    </table>
  `;
  modal.hidden = false;
}

function closeModal() { modal.hidden = true; }

modal.addEventListener('click', (e) => {
  if (e.target.dataset.close !== undefined) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    celebrate.hidden = true;
  }
});

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============================================================
   8. TOAST (gentle wrong-answer feedback)
   ============================================================ */

let toastTimer = null;
function showToast(text) {
  toastText.textContent = text;
  toast.hidden = false;
  toast.classList.remove('dismiss');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('dismiss');
    setTimeout(() => { toast.hidden = true; toast.classList.remove('dismiss'); }, 250);
  }, 3600);
}

/* ============================================================
   9. CELEBRATION (between-act overlay)
   ============================================================ */

function showCelebrate({ char, title, body, cta, onContinue }) {
  celebrateChar.src = `assets/characters/${char}`;
  celebrateTitle.textContent = title;
  celebrateBody.textContent = body;
  celebrateCta.textContent = cta;
  celebrate.hidden = false;
  celebrateClose.onclick = () => {
    celebrate.hidden = true;
    onContinue && onContinue();
  };
  playChord();
}

/* ============================================================
   10. SOUND (Web Audio synth — no files)
   ============================================================ */

function getAudio() {
  if (!state.audio) {
    try { state.audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; }
  }
  return state.audio;
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
function playGood() {
  playTone(660, 0.10, 'sine', 0.12);
  setTimeout(() => playTone(990, 0.10, 'sine', 0.10), 70);
}
function playBad() { playTone(220, 0.08, 'square', 0.08); }
function playChord() {
  [523.25, 659.25, 783.99].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.55, 'sine', 0.12), i * 110);
  });
}

/* ============================================================
   11. INTRO + BEGIN BUTTON
   ============================================================ */

document.querySelectorAll('[data-action="begin"]').forEach(btn => {
  btn.addEventListener('click', () => {
    narrate('begin');
    setTimeout(() => {
      showAct('1');
      buildAct1();
      setTimeout(() => narrate('act1_open'), 400);
    }, 250);
  });
});

/* ============================================================
   12. ACT 1 — Sort by reaction with water
   ============================================================ */

const act1Tray = document.getElementById('act1-tray');
const act1Bins = document.getElementById('act1-bins');
const act1Continue = document.getElementById('act1-continue');

function buildAct1() {
  state.act1Placed.clear();
  act1Tray.innerHTML = '';
  act1Bins.querySelectorAll('.bin-slots').forEach(s => s.innerHTML = '');
  act1Bins.querySelectorAll('[data-count]').forEach(c => c.textContent = '0');
  act1Continue.disabled = true;

  const shuffled = shuffle(ELEMENTS);
  for (const el of shuffled) {
    const card = makeCard(el);
    attachDrag(card, {
      onTap: () => openModal(el.slug),
      onMoveHover: (x, y) => highlightAct1Bin(x, y),
      getDropTarget: (x, y) => topElementUnder(x, y, n => n.classList && n.classList.contains('bin')),
      onDrop: (node, bin) => handleAct1Drop(node, bin),
    });
    act1Tray.appendChild(card);
  }
}

function highlightAct1Bin(x, y) {
  clearAllHover();
  const bin = topElementUnder(x, y, n => n.classList && n.classList.contains('bin'));
  if (!bin) return;
  const sym = state.dragging.dataset.symbol;
  const el = BY_SYMBOL[sym];
  if (binAccepts(el, bin.dataset.bin)) bin.classList.add('drop-hover');
  else bin.classList.add('drop-reject');
}

function binAccepts(el, binId) {
  if (Array.isArray(el.bin1)) return el.bin1.includes(binId);
  return el.bin1 === binId;
}

function handleAct1Drop(node, bin) {
  const sym = node.dataset.symbol;
  const el = BY_SYMBOL[sym];

  if (!bin) { bounceCard(node); return; }

  if (binAccepts(el, bin.dataset.bin)) {
    // Correct
    resetNode(node);
    const slots = bin.querySelector('.bin-slots');
    slots.classList.add('placed-host');
    slots.appendChild(node);
    node.classList.add('placed','snap-in');
    setTimeout(() => node.classList.remove('snap-in'), 360);
    state.act1Placed.set(sym, bin.dataset.bin);
    updateAct1Counts();
    playGood();
    // Random varied feedback
    narrate(Math.random() < 0.55 ? 'act1_correct' : 'act1_correct2');
    checkAct1Progress();
  } else {
    bounceCard(node);
    playBad();
    narrate('act1_wrong');
    showToast(`${el.name} doesn't belong in "${bin.querySelector('h3').textContent}" — check its reaction with water.`);
  }
}

function updateAct1Counts() {
  const counts = { 'reactive-flame':0, 'no-reaction':0, 'other':0 };
  for (const binId of state.act1Placed.values()) counts[binId] = (counts[binId]||0) + 1;
  for (const [binId, n] of Object.entries(counts)) {
    const c = act1Bins.querySelector(`[data-count="${binId}"]`);
    if (c) c.textContent = n;
  }
}

function checkAct1Progress() {
  const reactiveSet = new Set(['K','Ca','Li','Na','Cs','Rb','Sr','Ba']);
  const placedReactive = [...state.act1Placed.entries()]
    .filter(([sym, bin]) => bin === 'reactive-flame')
    .map(([sym]) => sym);
  const allReactivePresent = [...reactiveSet].every(s => placedReactive.includes(s));
  const onlyReactiveInBin = placedReactive.every(s => reactiveSet.has(s));
  if (allReactivePresent && onlyReactiveInBin) {
    act1Continue.disabled = false;
    if (state.act1Placed.size === 8) {
      narrate('act1_almost');
    }
  }
  // Full completion narrate
  if (state.act1Placed.size === ELEMENTS.length) {
    narrate('act1_done');
  }
}

act1Continue.addEventListener('click', () => {
  showCelebrate({
    char: 'anim_15_level_up_stars.webp',
    title: 'Step 1 complete!',
    body: "You've spotted the most reactive elements. Mendeleev's next move was to study just that group, more closely.",
    cta: 'On to step 2',
    onContinue: () => {
      showAct('2');
      buildAct2();
      setTimeout(() => narrate('act2_open'), 400);
    }
  });
});

/* ============================================================
   13. ACT 2 — Split reactive group into 2 families
   ============================================================ */

const act2Tray = document.getElementById('act2-tray');
const act2Bins = document.getElementById('act2-bins');
const act2ToObs = document.getElementById('act2-to-obs');

const REACTIVE_SYMBOLS = ['K','Ca','Li','Na','Cs','Rb','Sr','Ba'];

function buildAct2() {
  state.act2Bins = { famA:{family:null, symbols:[]}, famB:{family:null, symbols:[]} };
  act2Tray.innerHTML = '';
  act2Bins.querySelectorAll('.family-slots').forEach(s => s.innerHTML = '');
  act2Bins.querySelectorAll('.family-bin').forEach(b => {
    b.classList.remove('fam-alkali','fam-alkearth');
  });
  act2ToObs.disabled = true;

  const shuffled = shuffle(REACTIVE_SYMBOLS.map(s => BY_SYMBOL[s]));
  for (const el of shuffled) {
    const card = makeCard(el);
    attachDrag(card, {
      onTap: () => openModal(el.slug),
      onMoveHover: (x, y) => highlightAct2Bin(x, y),
      getDropTarget: (x, y) => topElementUnder(x, y, n => n.classList && n.classList.contains('family-bin')),
      onDrop: (node, bin) => handleAct2Drop(node, bin),
    });
    act2Tray.appendChild(card);
  }
}

function highlightAct2Bin(x, y) {
  clearAllHover();
  const bin = topElementUnder(x, y, n => n.classList && n.classList.contains('family-bin'));
  if (!bin) return;
  const sym = state.dragging.dataset.symbol;
  const el = BY_SYMBOL[sym];
  const bs = state.act2Bins[bin.dataset.family === 'A' ? 'famA' : 'famB'];
  // If bin empty, anything goes. If bin has a family, only matching family.
  if (!bs.family || bs.family === el.family) bin.classList.add('drop-hover');
  else bin.classList.add('drop-reject');
}

function handleAct2Drop(node, bin) {
  if (!bin) { bounceCard(node); return; }
  const sym = node.dataset.symbol;
  const el = BY_SYMBOL[sym];
  const slotKey = bin.dataset.family === 'A' ? 'famA' : 'famB';
  const bs = state.act2Bins[slotKey];

  if (bs.family && bs.family !== el.family) {
    // Wrong family — bounce + specific Teresa-verbatim prompt
    bounceCard(node);
    playBad();
    const otherFamily = bs.family;
    let msg;
    if (otherFamily === 'alkali') {
      // The current bin holds alkali metals (K, Rb, Li, Na, Cs).
      // The dropped element is alkearth (Ca, Ba, Sr).
      msg = `${el.name} (${el.symbol}) does not have similar reactions to this group, as it does not form a colourless alkaline solution.`;
    } else {
      msg = `${el.name} (${el.symbol}) does not have similar reactions to this group, as it forms a colourless alkaline solution.`;
    }
    narrate('act2b_wrong');
    showToast(msg);
    return;
  }

  // Accept
  resetNode(node);
  const wasEmpty = !bs.family;
  bs.family = el.family;
  bs.symbols.push(sym);
  node.classList.add(`fam-${el.family === 'alkali' ? 'A' : 'B'}`);

  const slots = bin.querySelector('.family-slots');
  slots.classList.add('placed-host');
  slots.appendChild(node);
  node.classList.add('placed','snap-in');
  setTimeout(() => node.classList.remove('snap-in'), 360);
  // Colour-code the bin once it has a family
  bin.classList.toggle('fam-alkali', bs.family === 'alkali');
  bin.classList.toggle('fam-alkearth', bs.family === 'alkearth');
  playGood();
  if (wasEmpty) narrate('act2_first_in');
  else          narrate('act2_correct');

  const totalPlaced = state.act2Bins.famA.symbols.length + state.act2Bins.famB.symbols.length;
  if (totalPlaced === REACTIVE_SYMBOLS.length) {
    act2ToObs.disabled = false;
    narrate('act2_done');
  }
}

act2ToObs.addEventListener('click', () => {
  showCelebrate({
    char: 'anim_06_confetti_celebration.webp',
    title: 'Two families revealed!',
    body: "Well done — you and Mendeleev have found families of elements with similar chemical reactions. Now let's see exactly what makes each family unique.",
    cta: 'Study the observations',
    onContinue: () => {
      showAct('2b');
      buildAct2b();
      setTimeout(() => narrate('act2b_open'), 400);
    }
  });
});

/* ============================================================
   14. ACT 2B — Observation sorting
   ============================================================ */

const OBSERVATIONS = [
  { id:'fizz',     text:'Fizzing',                          tags:['A','B'] },
  { id:'metalgone',text:'Metal disappears',                 tags:['A','B'] },
  { id:'alkaline', text:'Leaves an alkaline solution',      tags:['A','B'] },
  { id:'floats',   text:'Floats',                           tags:['A']     },
  { id:'sinks',    text:'Sinks',                            tags:['B']     },
  { id:'clear',    text:'Leaves a colourless solution',     tags:['A']     },
  { id:'cloudy',   text:'Leaves a cloudy white solution',   tags:['B']     },
];

const obsList = document.getElementById('obs-list');
const obsAEls = document.getElementById('obs-A-els');
const obsBEls = document.getElementById('obs-B-els');
const obsATitle = document.getElementById('obs-A-title');
const obsBTitle = document.getElementById('obs-B-title');
const act2bContinue = document.getElementById('act2b-continue');

function buildAct2b() {
  // Map each act2 bin's family → visible column.
  // Column A always shows famA's family, column B always famB's family,
  // so the pupil sees their own grouping carried over.
  const famA = state.act2Bins.famA;
  const famB = state.act2Bins.famB;

  // Family label
  const labelFor = f => f === 'alkali' ? 'Alkali metals' : f === 'alkearth' ? 'Alkaline earth metals' : 'Family';
  obsATitle.textContent = labelFor(famA.family);
  obsBTitle.textContent = labelFor(famB.family);

  // Element chips
  obsAEls.innerHTML = famA.symbols.map(s => `<span class="obs-element-chip">${s}<span class="vis">${BY_SYMBOL[s].name}</span></span>`).join('');
  obsBEls.innerHTML = famB.symbols.map(s => `<span class="obs-element-chip">${s}<span class="vis">${BY_SYMBOL[s].name}</span></span>`).join('');

  // Reset state
  state.obsPlaced = new Set();
  document.querySelectorAll('.obs-drops').forEach(u => u.innerHTML = '');
  act2bContinue.disabled = true;

  // Build observation pool (shuffled)
  obsList.innerHTML = '';
  for (const o of shuffle(OBSERVATIONS)) {
    const li = document.createElement('li');
    li.className = 'obs-item';
    li.dataset.id = o.id;
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    const tagText = o.tags.length === 2 ? '<span class="obs-tag">fits both</span>' : '';
    li.innerHTML = `${escapeHTML(o.text)}${tagText}`;
    attachDrag(li, {
      onTap: () => {/* no detail to show */},
      onMoveHover: (x, y) => highlightObsDrop(x, y, o),
      getDropTarget: (x, y) => topElementUnder(x, y, n => n.classList && n.classList.contains('obs-drops')),
      onDrop: (node, drop) => handleObsDrop(node, drop, o),
    });
    obsList.appendChild(li);
  }
}

function highlightObsDrop(x, y, obs) {
  clearAllHover();
  const drop = topElementUnder(x, y, n => n.classList && n.classList.contains('obs-drops'));
  if (!drop) return;
  drop.classList.add('drop-hover');
}

function handleObsDrop(node, drop, obs) {
  if (!drop) { bounceObs(node); return; }
  const fam = drop.dataset.drops;
  // Map: column 'A' actually represents state.act2Bins.famA.family
  // Family mapping
  const colFamily = fam === 'A' ? state.act2Bins.famA.family : state.act2Bins.famB.family;
  // Observation tags are alkali/alkearth-keyed:
  const obsAcceptsAlkali = obs.tags.includes('A');   // A in pool data means alkali
  const obsAcceptsAlkearth = obs.tags.includes('B');

  // Wait — in the OBSERVATIONS list, tags ['A','B'] mean "fits both families".
  // Let me clarify: tag 'A' = alkali, tag 'B' = alkearth.
  const allowedByObs =
    (colFamily === 'alkali'   && obsAcceptsAlkali) ||
    (colFamily === 'alkearth' && obsAcceptsAlkearth);

  if (!allowedByObs) {
    bounceObs(node);
    playBad();
    narrate('act2b_wrong');
    const famName = colFamily === 'alkali' ? 'the alkali family' : 'the alkaline earth family';
    showToast(`"${obs.text}" doesn't fit ${famName} — check what their reactions with water leave behind.`);
    return;
  }
  // Already placed in this column?
  const key = `${obs.id}|${fam}`;
  if (state.obsPlaced.has(key)) {
    bounceObs(node);
    return;
  }

  // Accept — make a static "placed chip" for the drop column, and keep
  // the original in the pool only if it's a "fits both" observation that
  // hasn't been placed in the OTHER column yet.
  const fitsBoth = obs.tags.length === 2;
  const placedChip = document.createElement('li');
  placedChip.className = 'obs-item placed';
  placedChip.innerHTML = `${escapeHTML(obs.text)}<span class="obs-tag">placed</span>`;
  drop.appendChild(placedChip);
  state.obsPlaced.add(key);
  playGood();
  narrate('act2b_correct');
  resetNode(node);

  if (fitsBoth) {
    const otherKey = `${obs.id}|${fam === 'A' ? 'B' : 'A'}`;
    if (state.obsPlaced.has(otherKey)) {
      node.remove();
    } else {
      const tag = node.querySelector('.obs-tag');
      if (tag) tag.textContent = 'now place in the other column too';
      node.classList.add('half-placed');
    }
  } else {
    node.remove();
  }
  checkObsComplete();
}

function bounceObs(node) {
  resetNode(node);
  node.classList.add('bounce-back');
  setTimeout(() => node.classList.remove('bounce-back'), 320);
}

function checkObsComplete() {
  // Need each observation to be placed in all its tagged columns
  // tag 'A' = alkali; tag 'B' = alkearth
  // Column 'A' (in DOM) represents whatever family act2Bins.famA holds.
  // So an observation with tag 'A' (alkali) needs to be placed in whichever DOM column corresponds to alkali.
  const requiredKeys = [];
  for (const o of OBSERVATIONS) {
    for (const t of o.tags) {
      // map family-tag to DOM column
      const dom = (t === 'A'
        ? (state.act2Bins.famA.family === 'alkali' ? 'A' : 'B')
        : (state.act2Bins.famA.family === 'alkearth' ? 'A' : 'B'));
      requiredKeys.push(`${o.id}|${dom}`);
    }
  }
  const done = requiredKeys.every(k => state.obsPlaced.has(k));
  if (done) {
    act2bContinue.disabled = false;
    narrate('act2b_done');
  }
}

act2bContinue.addEventListener('click', () => {
  showCelebrate({
    char: 'anim_15_level_up_stars.webp',
    title: 'Observations mapped!',
    body: "You've shown what makes each family unique. Mendeleev was now ready for the big step — line up every element by weight, and look for the pattern across the whole set.",
    cta: 'On to step 3',
    onContinue: () => {
      showAct('3');
      buildAct3();
      setTimeout(() => narrate('act3_open'), 400);
    }
  });
});

/* ============================================================
   15. ACT 3 — Arrange by atomic weight
   ============================================================
   Final grid (4 rows × 7 cols, last row only has 1 cell):
     Row 1: Li Be B  C  N  O  F
     Row 2: Na Mg Al Si P  S  Cl
     Row 3: K  Ca Br Rb Sr I  Cs
     Row 4: Ba
   ============================================================ */

const WEIGHT_ORDER = [
  'Li','Be','B','C','N','O','F',
  'Na','Mg','Al','Si','P','S','Cl',
  'K','Ca','Br','Rb','Sr','I','Cs',
  'Ba'
];

const act3Grid = document.getElementById('weight-grid');
const act3Tray = document.getElementById('act3-tray');
const act3Continue = document.getElementById('act3-continue');

function buildAct3() {
  state.act3Placed = new Map();
  act3Grid.innerHTML = '';
  act3Tray.innerHTML = '';
  act3Continue.disabled = true;

  // Build 28-cell grid (4×7)
  for (let i = 0; i < 28; i++) {
    const cell = document.createElement('div');
    cell.className = 'weight-cell';
    cell.dataset.idx = i;
    const sym = WEIGHT_ORDER[i];
    if (sym) {
      cell.dataset.symbol = sym;
      cell.innerHTML = `<span class="order-num">${i + 1}</span>`;
    } else {
      cell.classList.add('empty');
    }
    act3Grid.appendChild(cell);
  }

  // Tray: shuffled cards
  for (const el of shuffle(ELEMENTS)) {
    const card = makeCard(el);
    attachDrag(card, {
      onTap: () => openModal(el.slug),
      onMoveHover: (x, y) => highlightAct3Cell(x, y),
      getDropTarget: (x, y) => topElementUnder(x, y, n => n.classList && n.classList.contains('weight-cell')),
      onDrop: (node, cell) => handleAct3Drop(node, cell),
    });
    act3Tray.appendChild(card);
  }
}

function highlightAct3Cell(x, y) {
  clearAllHover();
  const cell = topElementUnder(x, y, n => n.classList && n.classList.contains('weight-cell'));
  if (!cell) return;
  if (cell.classList.contains('empty') || cell.classList.contains('filled')) {
    cell.classList.add('drop-reject');
  } else if (cell.dataset.symbol === state.dragging.dataset.symbol) {
    cell.classList.add('drop-hover');
  } else {
    cell.classList.add('drop-reject');
  }
}

function handleAct3Drop(node, cell) {
  if (!cell) { bounceCard(node); return; }
  const sym = node.dataset.symbol;
  if (cell.classList.contains('empty') || cell.classList.contains('filled') || cell.dataset.symbol !== sym) {
    bounceCard(node);
    playBad();
    narrate('act3_wrong');
    return;
  }
  resetNode(node);
  cell.classList.add('filled','placed-host');
  cell.appendChild(node);
  node.classList.add('placed','snap-in');
  setTimeout(() => node.classList.remove('snap-in'), 360);
  state.act3Placed.set(parseInt(cell.dataset.idx, 10), sym);
  playGood();
  narrate('act3_correct');

  if (state.act3Placed.size === WEIGHT_ORDER.length) {
    act3Continue.disabled = false;
    narrate('act3_done');
  }
}

act3Continue.addEventListener('click', () => {
  showCelebrate({
    char: 'anim_06_confetti_celebration.webp',
    title: 'All 22 placed by weight!',
    body: "Now read each column from top to bottom — do those elements share chemistry? Mendeleev spotted that some columns didn't fit. He fixed it by leaving gaps. Let's do the same.",
    cta: 'Spot the pattern',
    onContinue: () => {
      showAct('4');
      buildAct4();
      setTimeout(() => narrate('act4_open'), 400);
    }
  });
});

/* ============================================================
   16. ACT 4 — Identify mismatches & push right
   ============================================================
   We start with the same strict-by-weight grid in 5 rows × 7 cols
   (extra row to accommodate the eventual shift), then walk
   through the row-3+ cards in a guided sequence.

   Initial grid (cells filled with symbol, period = row, group = col):
     Row 1: Li Be B  C  N  O  F
     Row 2: Na Mg Al Si P  S  Cl
     Row 3: K  Ca Br Rb Sr I  Cs
     Row 4: Ba .  .  .  .  .  .
     Row 5: .  .  .  .  .  .  .

   Walkthrough (in askOrder):
     K → yes
     Ca → yes
     Br → NO → push right (4 cells); shifts Rb,Sr,I,Cs,Ba down/right with it
       After push:
         Row 3: K  Ca .  .  .  .  Br
         Row 4: Rb Sr I  Cs Ba .  .
     Rb → yes
     Sr → yes
     I → NO → push right (4 cells); shifts Cs, Ba
       After push:
         Row 4: Rb Sr .  .  .  .  I
         Row 5: Cs Ba .  .  .  .  .
     Cs → yes
     Ba → yes
   ============================================================ */

const act4Grid = document.getElementById('pattern-grid');
const verdictPanel = document.getElementById('verdict-panel');
const verdictPrompt = document.getElementById('verdict-prompt');
const pushPanel = document.getElementById('push-panel');
const pushPrompt = document.getElementById('push-prompt');
const pushBtn = document.getElementById('push-btn');
const act4Finish = document.getElementById('act4-finish');

const COLS = 7;
const ROWS = 5;

const ASK_ORDER = ['K','Ca','Br','Rb','Sr','I','Cs','Ba'];
// Correct answers + (for 'no' answers) how many cells to push right
const ASK_VERDICTS = {
  K: 'yes', Ca: 'yes', Br: 'no',
  Rb: 'yes', Sr: 'yes', I: 'no',
  Cs: 'yes', Ba: 'yes'
};

function buildAct4() {
  // Start from the strict-by-weight layout
  state.act4.layout = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  // Fill rows 1-3 with WEIGHT_ORDER[0..20]
  for (let i = 0; i < 21; i++) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    state.act4.layout[r][c] = { symbol: WEIGHT_ORDER[i], verdict: null, locked: false };
  }
  // Ba is element 22 (index 21) → row 4 (index 3), col 1 (index 0)
  state.act4.layout[3][0] = { symbol: 'Ba', verdict: null, locked: false };

  // Mark rows 1 & 2 (Li..Cl) as already locked — Mendeleev's reasoning starts at row 3.
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < COLS; c++) {
      if (state.act4.layout[r][c]) state.act4.layout[r][c].locked = true;
    }
  }

  state.act4.askIdx = 0;
  state.act4.askOrder = ASK_ORDER.slice();
  state.act4.pushing = false;

  act4Finish.hidden = true;
  pushPanel.hidden = true;

  renderAct4Grid();
  setTimeout(() => askNextAct4Card(), 600);
}

function renderAct4Grid() {
  act4Grid.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'pattern-cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      const slot = state.act4.layout[r][c];
      if (slot) {
        const el = BY_SYMBOL[slot.symbol];
        const card = makeCard(el);
        card.classList.add('placed');
        if (slot.locked) card.classList.add('verdict-yes');
        if (slot.verdict === 'yes') card.classList.add('verdict-yes');
        if (slot.verdict === 'no') card.classList.add('verdict-no');
        // Make tappable for info
        card.addEventListener('click', () => openModal(el.slug));
        cell.appendChild(card);
        cell.classList.add('filled');
        if (slot.locked || slot.verdict === 'yes') cell.classList.add('verified');
      } else {
        // Empty row 3+ cell — keep as a "gap"
      }
      act4Grid.appendChild(cell);
    }
  }
}

function findCardBySymbol(sym) {
  return act4Grid.querySelector(`.card[data-symbol="${sym}"]`);
}

function askNextAct4Card() {
  if (state.act4.askIdx >= state.act4.askOrder.length) {
    finishAct4();
    return;
  }
  const sym = state.act4.askOrder[state.act4.askIdx];
  const card = findCardBySymbol(sym);
  if (!card) {
    // Shouldn't happen, but skip safely
    state.act4.askIdx++;
    return askNextAct4Card();
  }
  // Highlight asking card
  document.querySelectorAll('.card.asking').forEach(c => c.classList.remove('asking'));
  card.classList.add('asking');

  // Find which column the card is in for the prompt
  const cell = card.parentElement;
  const r = parseInt(cell.dataset.r, 10);
  const c = parseInt(cell.dataset.c, 10);
  const colElements = [];
  for (let rr = 0; rr < r; rr++) {
    if (state.act4.layout[rr][c]) colElements.push(state.act4.layout[rr][c].symbol);
  }

  const el = BY_SYMBOL[sym];
  let prompt;
  if (colElements.length === 0) {
    prompt = `${el.name} (${el.symbol}) is starting a new column. Does that fit with how it reacts? Tap Yes to keep it, No to push it right.`;
  } else {
    prompt = `Look at ${el.name} (${el.symbol}). Above it in this column: ${colElements.join(', ')}. Does ${el.symbol} share similar chemistry with them?`;
  }
  verdictPrompt.textContent = prompt;
  verdictPanel.hidden = false;
  pushPanel.hidden = true;
  // Smooth scroll the verdict panel into view
  verdictPanel.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

document.querySelectorAll('.verdict-btn').forEach(btn => {
  btn.addEventListener('click', () => handleVerdict(btn.dataset.verdict));
});

function handleVerdict(verdict) {
  const sym = state.act4.askOrder[state.act4.askIdx];
  const correct = ASK_VERDICTS[sym];
  const card = findCardBySymbol(sym);
  const cell = card.parentElement;
  const r = parseInt(cell.dataset.r, 10);
  const c = parseInt(cell.dataset.c, 10);

  if (verdict === correct) {
    if (correct === 'yes') {
      state.act4.layout[r][c].verdict = 'yes';
      card.classList.remove('asking');
      card.classList.add('verdict-yes');
      cell.classList.add('verified');
      playGood();
      narrate('act4_yes');
      verdictPanel.hidden = true;
      state.act4.askIdx++;
      setTimeout(askNextAct4Card, 700);
    } else {
      // Correct identification of misfit → trigger push
      card.classList.remove('asking');
      card.classList.add('verdict-no');
      playGood();
      narrate('act4_no');
      verdictPanel.hidden = true;
      offerPush(sym);
    }
  } else {
    // Wrong verdict
    playBad();
    if (correct === 'yes') {
      showToast(`${BY_SYMBOL[sym].name} actually does fit — its reactions are very similar to the elements above it.`);
    } else {
      showToast(`Take another look at ${BY_SYMBOL[sym].name}'s reactions. Does it really match the column above?`);
    }
  }
}

function offerPush(sym) {
  const el = BY_SYMBOL[sym];
  pushPrompt.textContent = `${el.name} (${el.symbol}) is in the wrong column. Push it right until it sits with elements that share its chemistry — every heavier element will slide with it.`;
  pushPanel.hidden = false;
  pushPanel.scrollIntoView({ behavior:'smooth', block:'nearest' });
  pushBtn.onclick = () => doPushRight(sym);
}

function doPushRight(sym) {
  if (state.act4.pushing) return;
  state.act4.pushing = true;
  pushPanel.hidden = true;
  narrate('act4_push');

  // Find linear index of sym in current layout (row-major)
  let linearIdx = -1;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (state.act4.layout[r][c] && state.act4.layout[r][c].symbol === sym) {
        linearIdx = r * COLS + c;
        break;
      }
    }
    if (linearIdx !== -1) break;
  }

  // Halogens (Br, I, Cl, F) belong in column 7 (index 6).
  // The shift distance is however many cells we need to move sym so it
  // lands in column 6 within its current row.
  const HALOGEN_COL = COLS - 1;
  const currentCol = linearIdx % COLS;
  const shift = HALOGEN_COL - currentCol;

  // Take all slots from linearIdx onward (row-major), clearing them.
  const slotsAfter = [];
  for (let i = linearIdx; i < ROWS * COLS; i++) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const slot = state.act4.layout[r][c];
    if (slot) slotsAfter.push(slot);
    state.act4.layout[r][c] = null;
  }
  // Re-place starting at linearIdx + shift (leaves `shift` empty cells before sym → gaps)
  let cursor = linearIdx + shift;
  for (const slot of slotsAfter) {
    if (cursor >= ROWS * COLS) break;
    const r = Math.floor(cursor / COLS);
    const c = cursor % COLS;
    state.act4.layout[r][c] = slot;
    cursor++;
  }

  // Animate: re-render after a tiny delay with a slide animation
  // Add 'shifting' class to all the moved cards briefly
  const movedSyms = slotsAfter.map(s => s.symbol);
  movedSyms.forEach(s => {
    const card = findCardBySymbol(s);
    if (card) card.classList.add('shifting');
  });
  setTimeout(() => {
    renderAct4Grid();
    // Mark the pushed-right card as resolved & verified now (it's in the right column)
    const pushedSlot = findLayoutSlot(sym);
    if (pushedSlot) {
      pushedSlot.slot.verdict = 'yes';
      const card = findCardBySymbol(sym);
      if (card) {
        card.classList.remove('verdict-no');
        card.classList.add('verdict-yes');
        card.parentElement.classList.add('verified');
      }
    }
    state.act4.pushing = false;
    state.act4.askIdx++;
    setTimeout(askNextAct4Card, 800);
  }, 550);
}

function findLayoutSlot(sym) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (state.act4.layout[r][c] && state.act4.layout[r][c].symbol === sym) {
        return { slot: state.act4.layout[r][c], r, c };
      }
    }
  }
  return null;
}

function finishAct4() {
  // All cards locked — show finale
  document.querySelectorAll('.card.asking').forEach(c => c.classList.remove('asking'));
  document.querySelectorAll('.pattern-cell .card.placed').forEach(c => {
    c.classList.remove('verdict-no');
    c.classList.add('verdict-yes');
    c.parentElement.classList.add('verified');
  });
  verdictPanel.hidden = true;
  pushPanel.hidden = true;
  act4Finish.hidden = false;
  narrate('act4_done');
  setTimeout(() => {
    showCelebrate({
      char: 'anim_08_dance_bounce.webp',
      title: 'Bravo!',
      body: "You've travelled with Mendeleev and found a pattern connecting the elements — the beginning of the Periodic Table. The gaps you left? Mendeleev predicted exactly what would one day fill them.",
      cta: 'See the final table',
      onContinue: () => {
        act4Finish.scrollIntoView({ behavior:'smooth', block:'center' });
      }
    });
  }, 900);
}

act4Finish.addEventListener('click', () => {
  // Replay celebration
  showCelebrate({
    char: 'anim_06_confetti_celebration.webp',
    title: "Mendeleev's pattern, in your hands.",
    body: "Every column shares chemistry. Every gap is a prediction. That's the Periodic Table — and you've just walked its first steps.",
    cta: 'Lovely. Close.',
    onContinue: () => {}
  });
});

/* ============================================================
   17. RESET + INIT
   ============================================================ */

resetBtn.addEventListener('click', () => {
  if (!confirm('Start the whole journey over?')) return;
  hardReset();
});

function hardReset() {
  state.act1Placed.clear();
  state.act2Bins = { famA:{family:null, symbols:[]}, famB:{family:null, symbols:[]} };
  state.obsPlaced = new Set();
  state.act3Placed = new Map();
  state.act4 = { layout:[], askIdx:0, askOrder:[], pushing:false };
  showAct('intro');
  narrate('intro');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Init
showAct('intro');
narrate('intro');
