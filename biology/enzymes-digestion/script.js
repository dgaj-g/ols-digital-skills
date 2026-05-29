/* ============================================================
   Enzymes & Digestion — CCEA GCSE Biology Unit 1, 1.4
   ------------------------------------------------------------
   Three sections in one activity:
     1. How enzymes work — interactive lock-and-key diagram
     2. Build a reaction — drag & drop (break down + build up)
     3. The villus       — interactive labelled diagram
   Input: Pointer Events (mouse + touch + pen), one code path.
   Self-contained: no build step, no external deps. Works file://.
   ============================================================ */

// ----- Web Audio (synth feedback, no files) -----
let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; }
  }
  return audioCtx;
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
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + dur + 0.02);
}
function playSuccess() {
  [659.25, 783.99].forEach((f, i) => setTimeout(() => playTone(f, 0.18, 'sine', 0.12), i * 70));
}
function playReject() { playTone(196, 0.10, 'square', 0.07); }
function playChord() {
  [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => playTone(f, 0.55, 'sine', 0.12), i * 110));
}
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============================================================
// TABS
// ============================================================
const tabs = Array.from(document.querySelectorAll('.tab'));
const panels = Array.from(document.querySelectorAll('.panel'));
tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});
function switchTab(name) {
  tabs.forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === name));
}

// ============================================================
// SECTION 1 — How enzymes work (lock-and-key diagram)
// ============================================================
const ENZYME_INFO = {
  substrate: {
    title: 'Substrate',
    body: 'The molecule the enzyme acts on. Its shape is <strong>complementary</strong> to the active site, so it fits snugly &mdash; like a key in a lock.',
    tag: 'The reactant'
  },
  active: {
    title: 'Active site',
    body: 'A specially shaped region of the enzyme. Only a substrate with the matching (complementary) shape fits, which is why each enzyme is <strong>specific</strong> to one substrate.',
    tag: 'Where the reaction happens'
  },
  enzyme: {
    title: 'Enzyme',
    body: 'A <strong>protein</strong> that works as a <strong>biological catalyst</strong>. It speeds up the reaction and is <strong>not used up</strong>, so it can be used again and again.',
    tag: 'Biological catalyst (a protein)'
  },
  product: {
    title: 'Products',
    body: 'The new, smaller molecules formed when the substrate is broken down. Some enzymes do the reverse &mdash; joining small molecules into larger ones.',
    tag: 'What is formed'
  }
};

const enzSvg = document.getElementById('enz-svg');
const enzInfoTitle = document.getElementById('enz-info-title');
const enzInfoBody = document.getElementById('enz-info-body');
const enzInfoTag = document.getElementById('enz-info-tag');
const enzCaption = document.getElementById('enz-caption');
const enzSub = document.getElementById('enz-sub');
const enzProdL = document.getElementById('enz-prodL');
const enzProdR = document.getElementById('enz-prodR');
const enzInh = document.getElementById('enz-inh');
const enzBody = document.getElementById('enz-body');
const enzRunBtn = document.getElementById('enz-run');
const enzInhBtn = document.getElementById('enz-inhibitor');

function showEnzInfo(key, hotspotEl) {
  const info = ENZYME_INFO[key];
  if (!info) return;
  enzInfoTitle.textContent = info.title;
  enzInfoBody.innerHTML = info.body;
  enzInfoTag.textContent = info.tag;
  enzSvg.querySelectorAll('.hotspot').forEach(h => h.classList.remove('is-selected'));
  if (hotspotEl) hotspotEl.classList.add('is-selected');
  playTone(880, 0.06, 'sine', 0.06);
}

// Wire hotspots (Section 1 + Section 3 share this helper)
function wireHotspots(svg, handler) {
  svg.querySelectorAll('.hotspot').forEach(h => {
    h.addEventListener('click', () => handler(h.dataset.key, h));
    h.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(h.dataset.key, h); }
    });
  });
}
wireHotspots(enzSvg, showEnzInfo);

// Run-the-reaction animation
let enzBusy = false;
function setEnzPiece(el, { x = 0, y = 0, hidden, scale = 1 } = {}) {
  if (hidden !== undefined) el.hidden = hidden;
  el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}
function resetEnzScene() {
  setEnzPiece(enzSub, { x: 0, y: 0, hidden: false });
  setEnzPiece(enzProdL, { x: 0, y: 0, hidden: true });
  setEnzPiece(enzProdR, { x: 0, y: 0, hidden: true });
  enzBody.classList.remove('catalysing');
}
function runReaction() {
  if (enzBusy) return;
  if (enzInhBtn.getAttribute('aria-pressed') === 'true') toggleInhibitor(false);
  enzBusy = true;
  enzRunBtn.disabled = true;
  resetEnzScene();
  enzCaption.textContent = 'The substrate collides with the enzyme…';
  // Phase 1 — substrate drops into the active site
  setTimeout(() => {
    setEnzPiece(enzSub, { x: 0, y: 130 });
    enzCaption.textContent = 'It fits the active site exactly — a complementary shape, like a key in a lock.';
  }, 250);
  // Phase 2 — split into products
  setTimeout(() => {
    enzSub.hidden = true;
    enzBody.classList.add('catalysing');
    setEnzPiece(enzProdL, { x: 35, y: 150, hidden: false });
    setEnzPiece(enzProdR, { x: -35, y: 150, hidden: false });
    enzCaption.textContent = 'The enzyme breaks the substrate into smaller products.';
    playSuccess();
  }, 1150);
  // Phase 3 — release products
  setTimeout(() => {
    setEnzPiece(enzProdL, { x: -120, y: 60 });
    setEnzPiece(enzProdR, { x: 120, y: 60 });
    enzCaption.textContent = 'The products are released. The enzyme is unchanged, so it can be used again.';
  }, 1900);
  // Phase 4 — reset
  setTimeout(() => {
    resetEnzScene();
    enzBody.classList.remove('catalysing');
    enzCaption.textContent = 'Tap a marked point to learn about each part, or run the reaction again.';
    enzRunBtn.disabled = false;
    enzBusy = false;
  }, 3600);
}
enzRunBtn.addEventListener('click', runReaction);

function toggleInhibitor(force) {
  const willShow = force !== undefined ? force : enzInhBtn.getAttribute('aria-pressed') !== 'true';
  enzInhBtn.setAttribute('aria-pressed', willShow ? 'true' : 'false');
  enzInhBtn.textContent = willShow ? 'Remove inhibitor' : 'Add an inhibitor';
  if (willShow) {
    if (enzBusy) return;
    resetEnzScene();
    setEnzPiece(enzInh, { x: 0, y: 80, hidden: false });
    enzInh.classList.add('inh-in');
    // nudge substrate aside (blocked)
    setEnzPiece(enzSub, { x: -70, y: -20 });
    enzCaption.textContent = 'An inhibitor fits the active site but is not broken down. It blocks the substrate, so the rate of reaction is reduced (inhibited).';
    enzRunBtn.disabled = true;
    playTone(150, 0.18, 'sawtooth', 0.05);
  } else {
    enzInh.hidden = true;
    enzInh.classList.remove('inh-in');
    setEnzPiece(enzSub, { x: 0, y: 0 });
    enzCaption.textContent = 'Tap a marked point to learn about each part, or run the reaction to watch the enzyme work.';
    enzRunBtn.disabled = false;
  }
}
enzInhBtn.addEventListener('click', () => toggleInhibitor());

// ============================================================
// SECTION 2 — Build a reaction (drag & drop)
// ============================================================

// Breakdown reactions (CCEA Table 4.1; "carbohydrase (amylase)" per 1.4.1)
const BREAKDOWN = [
  { id: 'carb', enzyme: 'Carbohydrase', enzymeSub: '(amylase)', key: 'carb',
    substrate: { label: 'Starch', note: 'large carbohydrate' },
    products: ['Glucose', 'Glucose', 'Glucose'],
    productNote: 'simple sugar (glucose)',
    equation: 'Carbohydrase breaks down starch into glucose.' },
  { id: 'prot', enzyme: 'Protease', enzymeSub: '', key: 'prot',
    substrate: { label: 'Protein', note: 'large molecule' },
    products: ['Amino acid', 'Amino acid', 'Amino acid'],
    productNote: 'amino acids',
    equation: 'Protease breaks down protein into amino acids.' },
  { id: 'lip', enzyme: 'Lipase', enzymeSub: '', key: 'lip',
    substrate: { label: 'Fat (lipid)', note: 'large molecule' },
    products: ['Glycerol', 'Fatty acid', 'Fatty acid'],
    productNote: 'glycerol and fatty acids',
    equation: 'Lipase breaks down fat into glycerol and fatty acids.' }
];

// Build-up reactions (the reverse: enzymes join small molecules into larger ones)
const BUILDUP = [
  { id: 'carb', large: 'Starch', key: 'carb',
    parts: [{ label: 'Glucose' }, { label: 'Glucose' }, { label: 'Glucose' }],
    note: 'Many glucose molecules are joined to build up starch.' },
  { id: 'prot', large: 'Protein', key: 'prot',
    parts: [{ label: 'Amino acid' }, { label: 'Amino acid' }, { label: 'Amino acid' }],
    note: 'Amino acids are joined to build up a protein.' },
  { id: 'lip', large: 'Fat (lipid)', key: 'lip',
    parts: [{ label: 'Glycerol' }, { label: 'Fatty acid' }, { label: 'Fatty acid' }],
    note: 'Glycerol and fatty acids are joined to build up a fat.' }
];

const KEY_COLORS = { carb: '#3FA34D', prot: '#E08A2D', lip: '#C0577A' };

const stationsEl = document.getElementById('stations');
const trayEl = document.getElementById('react-tray');
const trayTitle = document.getElementById('tray-title');
const trayHint = document.getElementById('tray-hint');
const modeExplain = document.getElementById('mode-explain');
const reactDone = document.getElementById('react-done');
const reactTotal = document.getElementById('react-total');
const reactReset = document.getElementById('react-reset');
const modeBtns = Array.from(document.querySelectorAll('.mode-btn'));
const celebrate = document.getElementById('celebrate');
const celebrateTitle = document.getElementById('celebrate-title');
const celebrateBody = document.getElementById('celebrate-body');
const celebrateClose = document.getElementById('celebrate-close');

let mode = 'breakdown';
let doneCount = 0;
let selectedToken = null; // keyboard pick/drop

function buildReaction() {
  stationsEl.innerHTML = '';
  trayEl.innerHTML = '';
  doneCount = 0;
  selectedToken = null;
  reactDone.textContent = '0';

  if (mode === 'breakdown') {
    reactTotal.textContent = String(BREAKDOWN.length);
    trayTitle.textContent = 'Substrates';
    trayHint.innerHTML = 'Each enzyme only fits one substrate &mdash; that is enzyme <strong>specificity</strong>.';
    modeExplain.innerHTML = 'In digestion, enzymes <strong>break down</strong> large, insoluble molecules into small, soluble ones. Drag each substrate onto the enzyme whose active site it fits.';
    BREAKDOWN.forEach(buildBreakdownStation);
    shuffle(BREAKDOWN.map(r => r)).forEach(r => {
      trayEl.appendChild(makeToken({
        label: r.substrate.label, sub: r.substrate.note, key: r.key, kind: 'substrate'
      }));
    });
  } else {
    reactTotal.textContent = String(BUILDUP.length);
    trayTitle.textContent = 'Small molecules';
    trayHint.innerHTML = 'Drag the small molecules onto the large molecule they build up.';
    modeExplain.innerHTML = 'Enzymes can also <strong>build up</strong> small molecules into larger ones (for example when the body makes starch, proteins and fats). Fill each large molecule with the right small molecules.';
    BUILDUP.forEach(buildBuildupStation);
    const tokens = [];
    BUILDUP.forEach(t => t.parts.forEach(p => tokens.push({ label: p.label, key: t.key, kind: 'part' })));
    shuffle(tokens).forEach(t => trayEl.appendChild(makeToken(t)));
  }
}

function buildBreakdownStation(r) {
  const st = document.createElement('div');
  st.className = 'station';
  st.dataset.key = r.key;
  st.dataset.id = r.id;
  st.dataset.capacity = '1';
  st.dataset.filled = '0';
  st.dataset.done = 'false';
  st.setAttribute('tabindex', '0');
  st.setAttribute('role', 'button');
  st.setAttribute('aria-label', `${r.enzyme} ${r.enzymeSub} — drop its matching substrate here`);
  st.style.setProperty('--key-color', KEY_COLORS[r.key]);
  st.innerHTML = `
    <div class="enzyme-shape">
      <span class="enzyme-name">${escapeHTML(r.enzyme)}</span>
      ${r.enzymeSub ? `<span class="enzyme-alias">${escapeHTML(r.enzymeSub)}</span>` : ''}
      <span class="active-site" aria-hidden="true"></span>
    </div>
    <div class="station-slot" data-slot></div>
    <div class="station-products" data-products hidden></div>
    <p class="station-eq" data-eq hidden>${escapeHTML(r.equation)}</p>
  `;
  stationsEl.appendChild(st);
}

function buildBuildupStation(t) {
  const st = document.createElement('div');
  st.className = 'station build-station';
  st.dataset.key = t.key;
  st.dataset.id = t.id;
  st.dataset.capacity = String(t.parts.length);
  st.dataset.filled = '0';
  st.dataset.done = 'false';
  st.setAttribute('tabindex', '0');
  st.setAttribute('role', 'button');
  st.setAttribute('aria-label', `Build ${t.large} — drop the correct small molecules here`);
  st.style.setProperty('--key-color', KEY_COLORS[t.key]);
  const slots = t.parts.map(() => '<span class="build-slot" data-buildslot></span>').join('');
  st.innerHTML = `
    <div class="build-target">
      <span class="build-name">${escapeHTML(t.large)}</span>
      <div class="build-slots" data-slot>${slots}</div>
    </div>
    <p class="station-eq" data-eq hidden>${escapeHTML(t.note)}</p>
  `;
  stationsEl.appendChild(st);
}

function makeToken({ label, sub, key, kind }) {
  const tk = document.createElement('div');
  tk.className = 'token';
  tk.dataset.key = key;
  tk.dataset.kind = kind;
  tk.dataset.label = label;
  tk.setAttribute('tabindex', '0');
  tk.setAttribute('role', 'button');
  tk.setAttribute('aria-label', `${label}${sub ? ', ' + sub : ''}. Drag onto its matching target, or press Enter to pick it up.`);
  tk.style.setProperty('--key-color', KEY_COLORS[key]);
  tk.innerHTML = `<span class="token-label">${escapeHTML(label)}</span>${sub ? `<span class="token-sub">${escapeHTML(sub)}</span>` : ''}`;
  attachTokenPointer(tk);
  tk.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); keyboardSelectToken(tk); }
  });
  return tk;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Pointer drag engine (mouse + touch + pen) ----
const TAP_PX = 6;
const drag = { token: null, id: null, startX: 0, startY: 0, moved: false };

function attachTokenPointer(tk) {
  tk.addEventListener('pointerdown', onTokenDown);
  tk.addEventListener('pointermove', onTokenMove);
  tk.addEventListener('pointerup', onTokenUp);
  tk.addEventListener('pointercancel', onTokenCancel);
}
function onTokenDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const tk = e.currentTarget;
  if (tk.classList.contains('used')) return;
  try { tk.setPointerCapture(e.pointerId); } catch (_) {}
  drag.token = tk; drag.id = e.pointerId;
  drag.startX = e.clientX; drag.startY = e.clientY; drag.moved = false;
}
function onTokenMove(e) {
  if (e.pointerId !== drag.id || !drag.token) return;
  const tk = drag.token;
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;
  if (!drag.moved && Math.hypot(dx, dy) > TAP_PX) {
    drag.moved = true;
    tk.classList.add('dragging');
    document.body.classList.add('dragging-active');
  }
  if (drag.moved) {
    tk.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
    highlightStationUnder(e.clientX, e.clientY, tk);
  }
}
function onTokenUp(e) {
  if (e.pointerId !== drag.id || !drag.token) return;
  const tk = drag.token;
  const wasDrag = drag.moved;
  clearStationHighlights();
  document.body.classList.remove('dragging-active');
  if (wasDrag) {
    const st = stationUnderPoint(e.clientX, e.clientY);
    attemptDrop(tk, st);
  }
  try { tk.releasePointerCapture(e.pointerId); } catch (_) {}
  drag.token = null; drag.id = null; drag.moved = false;
}
function onTokenCancel(e) {
  if (e.pointerId !== drag.id || !drag.token) return;
  bounceToken(drag.token);
  clearStationHighlights();
  document.body.classList.remove('dragging-active');
  drag.token = null; drag.id = null; drag.moved = false;
}
function stationUnderPoint(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    const st = el.closest && el.closest('.station');
    if (st) return st;
  }
  return null;
}
function highlightStationUnder(x, y, tk) {
  clearStationHighlights();
  const st = stationUnderPoint(x, y);
  if (!st || st.dataset.done === 'true') return;
  if (st.dataset.key === tk.dataset.key && stationHasRoom(st)) st.classList.add('drop-ok');
  else st.classList.add('drop-no');
}
function clearStationHighlights() {
  document.querySelectorAll('.station.drop-ok, .station.drop-no').forEach(s => s.classList.remove('drop-ok', 'drop-no'));
}
function stationHasRoom(st) {
  return Number(st.dataset.filled) < Number(st.dataset.capacity);
}

function attemptDrop(tk, st) {
  if (st && st.dataset.done !== 'true' && st.dataset.key === tk.dataset.key && stationHasRoom(st)) {
    acceptToken(tk, st);
  } else {
    if (st) reject(tk, st);
    else bounceToken(tk);
  }
}

function resetTokenStyle(tk) {
  tk.classList.remove('dragging');
  tk.style.transform = '';
}
function bounceToken(tk) {
  resetTokenStyle(tk);
  tk.classList.add('bounce');
  setTimeout(() => tk.classList.remove('bounce'), 320);
  playReject();
}
function reject(tk, st) {
  bounceToken(tk);
  st.classList.add('shake');
  setTimeout(() => st.classList.remove('shake'), 320);
  if (mode === 'breakdown') {
    setStatus(`Enzymes are specific — ${tk.dataset.label} does not fit that active site.`);
  } else {
    setStatus(`${tk.dataset.label} is not part of that molecule.`);
  }
}

function setStatus(msg) {
  trayHint.textContent = msg;
  trayHint.classList.add('status-flash');
  setTimeout(() => trayHint.classList.remove('status-flash'), 600);
}

function acceptToken(tk, st) {
  resetTokenStyle(tk);
  tk.classList.add('used');
  tk.setAttribute('tabindex', '-1');
  st.dataset.filled = String(Number(st.dataset.filled) + 1);
  playSuccess();

  if (mode === 'breakdown') {
    const slot = st.querySelector('[data-slot]');
    slot.appendChild(tk);
    tk.classList.add('fitted');
    st.classList.add('reacting');
    setTimeout(() => completeBreakdown(st, tk), 600);
  } else {
    // fill the next empty build slot
    const emptySlot = st.querySelector('.build-slot:not(.filled)');
    if (emptySlot) {
      emptySlot.classList.add('filled');
      emptySlot.textContent = tk.dataset.label;
      emptySlot.style.setProperty('--key-color', KEY_COLORS[st.dataset.key]);
    }
    tk.remove();
    if (Number(st.dataset.filled) >= Number(st.dataset.capacity)) {
      completeBuildup(st);
    }
  }
}

function completeBreakdown(st, tk) {
  const r = BREAKDOWN.find(x => x.id === st.dataset.id);
  tk.style.display = 'none';
  const prodWrap = st.querySelector('[data-products]');
  prodWrap.hidden = false;
  prodWrap.innerHTML = r.products.map(p =>
    `<span class="product-chip" style="--key-color:${KEY_COLORS[r.key]}">${escapeHTML(p)}</span>`
  ).join('');
  st.querySelector('[data-eq]').hidden = false;
  st.classList.remove('reacting');
  st.classList.add('done');
  st.dataset.done = 'true';
  st.setAttribute('aria-label', r.equation);
  markDone();
}

function completeBuildup(st) {
  const t = BUILDUP.find(x => x.id === st.dataset.id);
  st.querySelector('[data-eq]').hidden = false;
  st.classList.add('done');
  st.dataset.done = 'true';
  const target = st.querySelector('.build-target');
  target.classList.add('formed');
  st.setAttribute('aria-label', `${t.large} built. ${t.note}`);
  markDone();
}

function markDone() {
  doneCount += 1;
  reactDone.textContent = String(doneCount);
  setStatus(mode === 'breakdown' ? 'Reaction complete!' : 'Molecule built!');
  const total = mode === 'breakdown' ? BREAKDOWN.length : BUILDUP.length;
  if (doneCount >= total) setTimeout(showCelebrate, 550);
}

function showCelebrate() {
  if (mode === 'breakdown') {
    celebrateTitle.textContent = 'All broken down!';
    celebrateBody.innerHTML = 'You matched every enzyme to its substrate and broke each one into small, soluble products. These small molecules can now be <strong>absorbed into the bloodstream</strong>. Each enzyme is specific — only its complementary substrate fits the active site.';
  } else {
    celebrateTitle.textContent = 'All built up!';
    celebrateBody.innerHTML = 'You joined small molecules into larger ones. Enzymes do not only break molecules down in digestion — they also <strong>build small molecules up</strong> into larger ones elsewhere in the body.';
  }
  celebrate.hidden = false;
  playChord();
}
celebrateClose.addEventListener('click', () => { celebrate.hidden = true; });

// ---- Keyboard pick / drop (accessibility; pointer drag stays primary) ----
function keyboardSelectToken(tk) {
  if (tk.classList.contains('used')) return;
  if (selectedToken === tk) { clearSelectedToken(); return; }
  clearSelectedToken();
  selectedToken = tk;
  tk.classList.add('selected');
  setStatus(`${tk.dataset.label} selected. Choose a target, then press Enter.`);
}
function clearSelectedToken() {
  if (selectedToken) selectedToken.classList.remove('selected');
  selectedToken = null;
}
function keyboardDropOnStation(st) {
  if (!selectedToken) { setStatus('Pick up a molecule first (press Enter on one).'); return; }
  const tk = selectedToken;
  clearSelectedToken();
  attemptDrop(tk, st);
}
stationsEl.addEventListener('keydown', (e) => {
  const st = e.target.closest && e.target.closest('.station');
  if (st && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); keyboardDropOnStation(st); }
});

// Mode switching
modeBtns.forEach(b => {
  b.addEventListener('click', () => {
    if (b.dataset.mode === mode) return;
    mode = b.dataset.mode;
    modeBtns.forEach(x => {
      const on = x.dataset.mode === mode;
      x.classList.toggle('is-active', on);
      x.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    celebrate.hidden = true;
    buildReaction();
  });
});
reactReset.addEventListener('click', () => { celebrate.hidden = true; buildReaction(); });

// ============================================================
// SECTION 3 — The villus (interactive diagram)
// ============================================================
const VILLUS_INFO = {
  shape: {
    title: 'Finger-like shape',
    body: 'Each villus is a tiny finger-like outgrowth. Millions of them give the ileum a very large <strong>surface area</strong>, so more digested food can be absorbed.',
    tag: 'Large surface area'
  },
  epithelium: {
    title: 'Surface epithelium',
    body: 'A <strong>single layer</strong> of surface (epithelium) cells covers the villus. This thin, permeable membrane reduces the distance molecules have to diffuse to reach the blood.',
    tag: 'Thin, permeable membrane'
  },
  capillary: {
    title: 'Capillary network',
    body: 'A network of capillaries absorbs the breakdown products of <strong>starch (glucose)</strong> and <strong>protein (amino acids)</strong>. A good blood supply carries them away, keeping a steep concentration gradient.',
    tag: 'Good blood supply'
  },
  lacteal: {
    title: 'Lacteal',
    body: 'The central lacteal absorbs the breakdown products of <strong>fats (glycerol and fatty acids)</strong> and returns them to the blood later.',
    tag: 'Absorbs fats'
  },
  lumen: {
    title: 'Lumen of the gut',
    body: 'The space inside the ileum, where digested food passes. Small, soluble molecules are absorbed from here, across the villus surface, into the blood and lacteal.',
    tag: 'Where digested food passes'
  }
};
const vilSvg = document.getElementById('villus-svg');
const vilInfoTitle = document.getElementById('vil-info-title');
const vilInfoBody = document.getElementById('vil-info-body');
const vilInfoTag = document.getElementById('vil-info-tag');
const VIL_HILITE = {
  shape: 'vil-body', epithelium: 'vil-epi', capillary: 'vil-cap', lacteal: 'vil-lac', lumen: null
};
function showVilInfo(key, hotspotEl) {
  const info = VILLUS_INFO[key];
  if (!info) return;
  vilInfoTitle.textContent = info.title;
  vilInfoBody.innerHTML = info.body;
  vilInfoTag.textContent = info.tag;
  vilSvg.querySelectorAll('.hotspot').forEach(h => h.classList.remove('is-selected'));
  vilSvg.querySelectorAll('.vil-flash').forEach(el => el.classList.remove('vil-flash'));
  if (hotspotEl) hotspotEl.classList.add('is-selected');
  const id = VIL_HILITE[key];
  if (id) { const el = document.getElementById(id); if (el) el.classList.add('vil-flash'); }
  playTone(880, 0.06, 'sine', 0.06);
}
wireHotspots(vilSvg, showVilInfo);

// Belt-and-braces: cancel text selection during a drag.
document.addEventListener('selectstart', (e) => {
  if (document.body.classList.contains('dragging-active')) e.preventDefault();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { celebrate.hidden = true; clearSelectedToken(); }
});

// ----- Init -----
buildReaction();
