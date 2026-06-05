/* ============================================================
   Enzymes & Digestion — CCEA GCSE Biology Unit 1, 1.4
   Redesign v2. Pointer Events throughout (mouse + touch + pen).
   Self-contained, no build step, works from file://.
   ============================================================ */

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SVGNS = 'http://www.w3.org/2000/svg';

// ---------- audio ----------
let audioCtx = null;
function getAudio() { if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } } return audioCtx; }
function tone(freq, dur = 0.1, type = 'sine', vol = 0.1) {
  const ctx = getAudio(); if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur + 0.02);
}
const success = () => [659.25, 783.99].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.12), i * 70));
const reject = () => tone(196, 0.1, 'square', 0.07);
const chord = () => [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => tone(f, 0.5, 'sine', 0.12), i * 110));
const tick = () => tone(880, 0.05, 'sine', 0.05);

// ============================================================
// TABS
// ============================================================
const tabs = $$('.tab');
const panels = $$('.panel');
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => { const on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
  panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === t.dataset.tab));
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (t.dataset.tab === 'factors') { simResize(); startField(); } else { stopField(); }
}));

// ============================================================
// SECTION 1 — How enzymes work
// ============================================================
const HOW_INFO = {
  _default: { kicker: 'Lock and key', title: 'An enzyme is a biological catalyst', body: 'Every enzyme is a <strong>protein</strong>. It speeds up a reaction and is <strong>not used up</strong>, so it can work again and again. Use the buttons above to explore the parts, watch a reaction step by step, or see what an inhibitor does.' },
  substrate: { kicker: 'The reactant', title: 'Substrate', body: 'The molecule the enzyme works on — here, a food molecule. Its shape is <strong>complementary</strong> to the active site, so it fits like a key in a lock.', part: 'substrate' },
  active: { kicker: 'The key spot', title: 'Active site', body: 'A specially shaped pocket on the enzyme. Only a substrate with the matching shape fits, which is why each enzyme is <strong>specific</strong> to one substrate.', part: 'enzymeBody' },
  enzyme: { kicker: 'Biological catalyst', title: 'Enzyme', body: 'A <strong>protein</strong> that speeds up the reaction. It is <strong>not used up</strong>, so the same enzyme can be used again and again.', part: 'enzymeBody' },
  product: { kicker: 'What is made', title: 'Products', body: 'The smaller molecules made when the substrate is broken down. Some enzymes work in reverse, joining small molecules into larger ones.', part: 'substrate' }
};
const HOW_STEPS = [
  { kicker: 'Step 1 of 4', title: 'Collision', body: 'The enzyme and substrate move about and bump into each other.' },
  { kicker: 'Step 2 of 4', title: 'A perfect fit', body: 'The substrate fits into the active site. The shapes are <strong>complementary</strong> — like a key in a lock.' },
  { kicker: 'Step 3 of 4', title: 'Broken down', body: 'The enzyme splits the substrate into smaller <strong>products</strong>.' },
  { kicker: 'Step 4 of 4', title: 'Released', body: 'The products are released. The enzyme is <strong>unchanged</strong>, so it is ready to work again.' }
];
const howSvg = $('#how-svg');
const howKicker = $('#how-kicker'), howTitle = $('#how-title'), howBody = $('#how-body');
const substrate = $('#substrate'), productA = $('#productA'), productB = $('#productB'),
      inhibitor = $('#inhibitor'), enzymeBody = $('#enzymeBody'), rateBadge = $('#rate-badge'), rateFill = $('#rate-fill');
const stepper = $('#stepper'), stepDots = $('#step-dots'), stepPrev = $('#step-prev'), stepNext = $('#step-next');
let howView = 'explore', howStep = 0, rateTimers = [];
function clearRateTimers() { rateTimers.forEach(clearTimeout); rateTimers = []; }

function setInfo(el, info) {
  $('.info-kicker', el).textContent = info.kicker;
  el.querySelector('h2').textContent = info.title;
  el.querySelector('p').innerHTML = info.body;
}
function flashPart(id) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.remove('part-flash'); void el.offsetWidth; el.classList.add('part-flash');
}
function setPiece(el, t) { el.style.transform = t; }
// NB: SVGElement does not reflect the .hidden IDL property to the content
// attribute, so toggle the attribute directly (matched by [hidden] in CSS).
function hide(el, h) { if (h) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); }

function resetHowPieces() {
  setPiece(substrate, ''); hide(substrate, false);
  setPiece(productA, ''); hide(productA, true);
  setPiece(productB, ''); hide(productB, true);
  setPiece(inhibitor, ''); hide(inhibitor, true);
  enzymeBody.classList.remove('catalysing');
  hide(rateBadge, true);
}

// Explore: clickable labels
$$('.lbl', howSvg).forEach(l => {
  const act = () => {
    const info = HOW_INFO[l.dataset.key]; if (!info) return;
    setInfo($('#how-info'), info);
    $$('.lbl', howSvg).forEach(x => x.classList.toggle('is-selected', x === l));
    if (info.part) flashPart(info.part);
    tick();
    maybeNarrate($('#how-info'));
  };
  l.addEventListener('click', act);
  l.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
});

function setHowView(view) {
  howView = view;
  clearRateTimers();
  $$('#panel-how .seg-btn').forEach(b => { const on = b.dataset.view === view; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  howSvg.classList.toggle('watching', view !== 'explore');
  $$('.lbl', howSvg).forEach(l => { l.style.opacity = view === 'explore' ? '' : '0'; l.style.pointerEvents = view === 'explore' ? '' : 'none'; l.classList.remove('is-selected'); });
  hide(stepper, view !== 'watch');
  resetHowPieces();
  if (view === 'explore') {
    setInfo($('#how-info'), HOW_INFO._default);
  } else if (view === 'watch') {
    howStep = 0; applyHowStep(0);
  } else if (view === 'inhibitor') {
    showInhibitor();
  }
}
function applyHowStep(n) {
  howStep = clamp(n, 0, 3);
  // absolute states (tuned against the 640x470 viewBox)
  resetHowPieces();
  if (howStep === 0) {
    setPiece(substrate, 'translate(0px,0px)');
  } else if (howStep === 1) {
    setPiece(substrate, 'translate(0px,150px)');
  } else if (howStep === 2) {
    hide(substrate, true);
    hide(productA, false); hide(productB, false);
    setPiece(productA, 'translate(55px,128px)');
    setPiece(productB, 'translate(-55px,128px)');
    enzymeBody.classList.add('catalysing');
  } else if (howStep === 3) {
    hide(substrate, true);
    hide(productA, false); hide(productB, false);
    setPiece(productA, 'translate(-14px,86px)');
    setPiece(productB, 'translate(14px,86px)');
    enzymeBody.classList.add('catalysing');
  }
  setInfo($('#how-info'), HOW_STEPS[howStep]);
  $$('span', stepDots).forEach((d, i) => d.classList.toggle('on', i === howStep));
  stepPrev.disabled = howStep === 0;
  stepNext.disabled = howStep === 3;
  if (howStep === 2) success(); else tick();
}
function showInhibitor() {
  setPiece(inhibitor, 'translate(0px,0px)'); hide(inhibitor, false); inhibitor.style.opacity = '1';
  setPiece(substrate, 'translate(-150px,56px) rotate(-14deg)');
  const rateWord = document.getElementById('rate-word');
  hide(rateBadge, false);
  // reset the meter to the full "before" state, hold it so the pupil sees it,
  // then run a slow drop animation (CSS keyframe) and flip the label once fallen
  clearRateTimers(); // cancel any pending drop from a previous toggle
  rateFill.classList.remove('dropping');
  rateFill.style.transform = 'scaleX(1)'; rateFill.setAttribute('fill', '#3FA34D'); rateWord.textContent = 'Normal';
  void rateFill.getBoundingClientRect();
  rateTimers.push(setTimeout(() => { rateFill.style.transform = ''; rateFill.classList.add('dropping'); }, 850));
  rateTimers.push(setTimeout(() => { rateWord.textContent = 'Low'; }, 850 + 1700));
  setInfo($('#how-info'), { kicker: 'Inhibitor', title: 'The active site is blocked', body: 'An inhibitor fits into the active site but is <strong>not broken down</strong>. While it sits there the substrate cannot get in, so the <strong>rate of reaction falls</strong> — watch the meter on the left drop.' });
  tone(150, 0.2, 'sawtooth', 0.05);
}
// build step dots
for (let i = 0; i < 4; i++) stepDots.appendChild(document.createElement('span'));
$$('#panel-how .seg-btn').forEach(b => b.addEventListener('click', () => setHowView(b.dataset.view)));
stepPrev.addEventListener('click', () => applyHowStep(howStep - 1));
stepNext.addEventListener('click', () => applyHowStep(howStep + 1));

// ============================================================
// SECTION 2 — Match the enzyme (drag & drop, knowledge-based)
// ============================================================
const BREAKDOWN = [
  { id: 'carb', key: 'carb', enzyme: 'Carbohydrase', alias: '(amylase)', acts: 'acts on starch',
    substrate: { label: 'Starch', sub: 'a carbohydrate' }, products: ['Glucose', 'Glucose', 'Glucose'],
    eq: 'Carbohydrase → starch into glucose' },
  { id: 'prot', key: 'prot', enzyme: 'Protease', alias: '', acts: 'acts on protein',
    substrate: { label: 'Protein', sub: '' }, products: ['Amino acid', 'Amino acid', 'Amino acid'],
    eq: 'Protease → protein into amino acids' },
  { id: 'lip', key: 'lip', enzyme: 'Lipase', alias: '', acts: 'acts on fat',
    substrate: { label: 'Fat (lipid)', sub: '' }, products: ['Glycerol', 'Fatty acid', 'Fatty acid'],
    eq: 'Lipase → fat into glycerol + fatty acids' }
];
const BUILDUP = [
  { id: 'carb', key: 'carb', large: 'Starch', hint: 'a carbohydrate', parts: ['Glucose', 'Glucose', 'Glucose'], note: 'Glucose molecules join to build starch.' },
  { id: 'prot', key: 'prot', large: 'Protein', hint: '', parts: ['Amino acid', 'Amino acid', 'Amino acid'], note: 'Amino acids join to build a protein.' },
  { id: 'lip', key: 'lip', large: 'Fat (lipid)', hint: '', parts: ['Glycerol', 'Fatty acid', 'Fatty acid'], note: 'Glycerol and fatty acids join to build a fat.' }
];
const ENZYME_OF = { carb: 'carbohydrase', prot: 'protease', lip: 'lipase' };

const stationsEl = $('#stations'), trayEl = $('#match-tray');
const matchDone = $('#match-done'), matchTotal = $('#match-total');
const matchPrompt = $('#match-prompt'), trayTitle = $('#tray-title'), trayHint = $('#tray-hint');
let mode = 'breakdown', doneCount = 0, selectedToken = null;

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function buildMatch() {
  stationsEl.innerHTML = ''; trayEl.innerHTML = '';
  doneCount = 0; selectedToken = null; matchDone.textContent = '0';
  trayHint.className = 'tray-hint'; trayHint.textContent = '';
  if (mode === 'breakdown') {
    matchTotal.textContent = String(BREAKDOWN.length);
    matchPrompt.innerHTML = 'Each enzyme is <strong>specific</strong> — it only works on one kind of food. Drag each substrate onto the enzyme that breaks it down. Tip: an enzyme is usually named after the food it digests.';
    trayTitle.textContent = 'Substrates';
    BREAKDOWN.forEach(addBreakdownStation);
    shuffle(BREAKDOWN).forEach(r => trayEl.appendChild(makeToken(r.substrate.label, r.substrate.sub, r.key)));
  } else {
    matchTotal.textContent = String(BUILDUP.length);
    matchPrompt.innerHTML = 'Enzymes can also <strong>build up</strong> small molecules into larger ones. Drag each small molecule onto the large molecule it helps to build. You need to know what each one is made from.';
    trayTitle.textContent = 'Small molecules';
    BUILDUP.forEach(addBuildupStation);
    const toks = [];
    BUILDUP.forEach(t => t.parts.forEach(p => toks.push({ label: p, key: t.key })));
    shuffle(toks).forEach(t => trayEl.appendChild(makeToken(t.label, '', t.key)));
  }
}
function addBreakdownStation(r) {
  const st = document.createElement('div');
  st.className = 'station'; st.dataset.key = r.key; st.dataset.id = r.id;
  st.dataset.capacity = '1'; st.dataset.filled = '0'; st.dataset.done = 'false';
  st.tabIndex = 0; st.setAttribute('role', 'button');
  st.setAttribute('aria-label', `${r.enzyme} ${r.alias}. Drop the substrate it breaks down here.`);
  st.innerHTML = `
    <div class="enzyme-shape">
      <span class="es-notch" aria-hidden="true"></span>
      <span class="enzyme-name">${esc(r.enzyme)}</span>
      ${r.alias ? `<span class="enzyme-alias">${esc(r.alias)}</span>` : ''}
    </div>
    <div class="station-slot" data-slot></div>
    <div class="station-products" data-products hidden></div>
    <p class="station-eq" data-eq hidden>${esc(r.eq)}</p>`;
  stationsEl.appendChild(st);
}
function addBuildupStation(t) {
  const st = document.createElement('div');
  st.className = 'station build-station'; st.dataset.key = t.key; st.dataset.id = t.id;
  st.dataset.capacity = String(t.parts.length); st.dataset.filled = '0'; st.dataset.done = 'false';
  st.tabIndex = 0; st.setAttribute('role', 'button');
  st.setAttribute('aria-label', `Build ${t.large}. Drop the correct small molecules here.`);
  const slots = t.parts.map(() => '<span class="build-slot" data-buildslot></span>').join('');
  st.innerHTML = `
    <div class="build-target">
      <span class="build-name">${esc(t.large)}</span>
      ${t.hint ? `<span class="build-hint">${esc(t.hint)}</span>` : ''}
      <div class="build-slots" data-slot>${slots}</div>
    </div>
    <p class="station-eq" data-eq hidden>${esc(t.note)}</p>`;
  stationsEl.appendChild(st);
}
function makeToken(label, sub, key) {
  const tk = document.createElement('div');
  tk.className = 'token'; tk.dataset.key = key; tk.dataset.label = label;
  tk.tabIndex = 0; tk.setAttribute('role', 'button');
  tk.setAttribute('aria-label', `${label}${sub ? ', ' + sub : ''}. Drag onto its target, or press Enter to pick it up.`);
  tk.innerHTML = `<span class="token-label">${esc(label)}</span>${sub ? `<span class="token-sub">${esc(sub)}</span>` : ''}`;
  attachToken(tk);
  return tk;
}

// drag engine
const TAP = 6;
const drag = { tk: null, id: null, x0: 0, y0: 0, moved: false };
function attachToken(tk) {
  tk.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (tk.classList.contains('used')) return;
    try { tk.setPointerCapture(e.pointerId); } catch (_) {}
    drag.tk = tk; drag.id = e.pointerId; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.moved = false;
  });
  tk.addEventListener('pointermove', e => {
    if (e.pointerId !== drag.id || !drag.tk) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) > TAP) { drag.moved = true; tk.classList.add('dragging'); document.body.classList.add('dragging-active'); }
    if (drag.moved) { tk.style.transform = `translate(${dx}px,${dy}px) scale(1.07) rotate(-1.5deg)`; highlightUnder(e.clientX, e.clientY, tk); }
  });
  tk.addEventListener('pointerup', e => {
    if (e.pointerId !== drag.id || !drag.tk) return;
    const wasDrag = drag.moved; clearHi(); document.body.classList.remove('dragging-active');
    if (wasDrag) attemptDrop(tk, stationUnder(e.clientX, e.clientY));
    try { tk.releasePointerCapture(e.pointerId); } catch (_) {}
    drag.tk = null; drag.id = null; drag.moved = false;
  });
  tk.addEventListener('pointercancel', e => {
    if (e.pointerId !== drag.id || !drag.tk) return;
    bounce(tk); clearHi(); document.body.classList.remove('dragging-active');
    drag.tk = null; drag.id = null; drag.moved = false;
  });
  tk.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kbSelect(tk); } });
}
function stationUnder(x, y) { for (const el of document.elementsFromPoint(x, y)) { const s = el.closest && el.closest('.station'); if (s) return s; } return null; }
function room(st) { return Number(st.dataset.filled) < Number(st.dataset.capacity); }
function highlightUnder(x, y, tk) {
  clearHi(); const st = stationUnder(x, y); if (!st || st.dataset.done === 'true') return;
  st.classList.add(st.dataset.key === tk.dataset.key && room(st) ? 'drop-ok' : 'drop-no');
}
function clearHi() { $$('.station.drop-ok,.station.drop-no').forEach(s => s.classList.remove('drop-ok', 'drop-no')); }
function resetTk(tk) { tk.classList.remove('dragging'); tk.style.transform = ''; }
function bounce(tk) { resetTk(tk); tk.classList.add('bounce'); setTimeout(() => tk.classList.remove('bounce'), 320); reject(); }
function status(msg, ok) { trayHint.textContent = msg; trayHint.className = 'tray-hint ' + (ok ? 'flash-ok' : 'flash-no'); }

function attemptDrop(tk, st) {
  if (st && st.dataset.done !== 'true' && st.dataset.key === tk.dataset.key && room(st)) accept(tk, st);
  else if (st) rejectAt(tk, st);
  else bounce(tk);
}
function rejectAt(tk, st) {
  bounce(tk); st.classList.add('shake'); setTimeout(() => st.classList.remove('shake'), 340);
  if (mode === 'breakdown') {
    const r = BREAKDOWN.find(x => x.id === st.dataset.id);
    status(`Not quite — ${tk.dataset.label.toLowerCase()} is not broken down by ${r.enzyme.toLowerCase()}. Which enzyme digests ${tk.dataset.label.toLowerCase()}?`, false);
  } else {
    const t = BUILDUP.find(x => x.id === st.dataset.id);
    status(`${tk.dataset.label} is not part of ${t.large.toLowerCase()}. What is ${t.large.toLowerCase()} built from?`, false);
  }
}
function accept(tk, st) {
  resetTk(tk); tk.classList.add('used'); tk.tabIndex = -1; tk.setAttribute('aria-disabled', 'true');
  st.dataset.filled = String(Number(st.dataset.filled) + 1); success();
  if (mode === 'breakdown') {
    $('[data-slot]', st).appendChild(tk); tk.classList.add('fitted'); st.classList.add('reacting');
    setTimeout(() => finishBreakdown(st, tk), 600);
  } else {
    const slot = $('.build-slot:not(.filled)', st);
    if (slot) { slot.classList.add('filled'); slot.textContent = tk.dataset.label; }
    tk.remove();
    if (Number(st.dataset.filled) >= Number(st.dataset.capacity)) finishBuildup(st);
  }
}
function finishBreakdown(st, tk) {
  const r = BREAKDOWN.find(x => x.id === st.dataset.id);
  tk.style.display = 'none';
  const pw = $('[data-products]', st); pw.hidden = false;
  pw.innerHTML = r.products.map(p => `<span class="product-chip">${esc(p)}</span>`).join('');
  $('[data-eq]', st).hidden = false;
  st.classList.remove('reacting'); st.classList.add('done'); st.dataset.done = 'true';
  st.setAttribute('aria-label', r.eq);
  markDone();
}
function finishBuildup(st) {
  $('[data-eq]', st).hidden = false; st.classList.add('done'); st.dataset.done = 'true';
  $('.build-target', st).classList.add('formed');
  markDone();
}
function markDone() {
  doneCount++; matchDone.textContent = String(doneCount);
  status(mode === 'breakdown' ? 'Correct — broken down into small, soluble products.' : 'Correct — built up into a large molecule.', true);
  const total = mode === 'breakdown' ? BREAKDOWN.length : BUILDUP.length;
  if (doneCount >= total) setTimeout(celebrateMatch, 500);
}
function celebrateMatch() {
  if (mode === 'breakdown') {
    $('#celebrate-title').textContent = 'All broken down!';
    $('#celebrate-body').innerHTML = 'Every enzyme matched its substrate. These large, insoluble molecules are now small and <strong>soluble</strong>, ready to be absorbed into the blood. Remember: each enzyme is specific — only its complementary substrate fits the active site.';
  } else {
    $('#celebrate-title').textContent = 'All built up!';
    $('#celebrate-body').innerHTML = 'You joined small molecules into larger ones. Digestion <strong>breaks molecules down</strong>; elsewhere in the body, enzymes <strong>build them up</strong> — the reverse reaction.';
  }
  $('#celebrate').hidden = false; chord();
}
// keyboard pick/drop
function kbSelect(tk) {
  if (tk.classList.contains('used')) return;
  if (selectedToken === tk) { kbClear(); return; }
  kbClear(); selectedToken = tk; tk.classList.add('selected');
  status(`${tk.dataset.label} picked up. Choose a target and press Enter.`, true);
}
function kbClear() { if (selectedToken) selectedToken.classList.remove('selected'); selectedToken = null; }
stationsEl.addEventListener('keydown', e => {
  const st = e.target.closest && e.target.closest('.station');
  if (st && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (!selectedToken) { status('Pick up a molecule first (press Enter on one).', false); return; } const tk = selectedToken; kbClear(); attemptDrop(tk, st); }
});
$$('#panel-match .seg-btn').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.mode === mode) return;
  mode = b.dataset.mode;
  $$('#panel-match .seg-btn').forEach(x => { const on = x.dataset.mode === mode; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
  $('#celebrate').hidden = true; buildMatch();
}));
$('#match-reset').addEventListener('click', () => { $('#celebrate').hidden = true; buildMatch(); });
$('#celebrate-close').addEventListener('click', () => { $('#celebrate').hidden = true; });

// ============================================================
// SECTION 3 — What affects enzymes (simulator)
// ============================================================
const FACTORS = {
  temp: {
    min: 0, max: 60, step: 1, start: 37, optimum: 40, unit: '°C', name: 'Temperature', ticks: [0, 20, 40, 60],
    activity: t => 100 * Math.exp(-(((t - 40) / (t <= 40 ? 25 : 12)) ** 2)),
    denature: t => clamp((t - 44) / 16, 0, 1),
    zone: t => t < 22 ? 'cold' : (t <= 44 ? (Math.abs(t - 40) <= 3 ? 'optimum' : 'warm') : 'denatured')
  },
  ph: {
    min: 0, max: 14, step: 0.5, start: 7, optimum: 7, unit: '', name: 'pH', ticks: [0, 7, 14],
    activity: p => 100 * Math.exp(-(((p - 7) / 2.1) ** 2)),
    denature: p => clamp((Math.abs(p - 7) - 2.5) / 4.5, 0, 1),
    zone: p => Math.abs(p - 7) <= 1 ? 'optimum' : (Math.abs(p - 7) <= 2.5 ? 'warm' : 'denatured')
  }
};
const STATE_TEXT = {
  temp: {
    cold: ['Low temperature', 'Little kinetic energy — the enzyme and substrate move slowly, so there are few collisions and a low rate of reaction.'],
    warm: ['Warming up', 'More kinetic energy means more frequent collisions between enzyme and substrate, so the rate increases.'],
    optimum: ['Optimum temperature', 'At about 40°C the rate of reaction is at its maximum. The substrate fits the active site perfectly.'],
    denatured: ['Denatured', 'Above the optimum the heat changes the shape of the active site. This is denaturation — it is irreversible, and the substrate no longer fits.']
  },
  ph: {
    optimum: ['Optimum pH', 'At about pH 7 the rate of reaction is at its maximum. The substrate fits the active site perfectly.'],
    warm: ['Away from optimum', 'Moving away from the optimum pH lowers the rate of reaction.'],
    denatured: ['Denatured', 'An extreme pH changes the shape of the active site. This is denaturation — it is irreversible, and the substrate no longer fits.']
  }
};
const simSvg = $('#sim-svg'), simEnzSvg = $('#sim-enz-svg'),
      simSlider = $('#sim-slider'), simScale = $('#sim-scale'),
      simValue = $('#sim-value'), simUnit = $('#sim-unit'), simRate = $('#sim-rate'),
      simState = $('#sim-state'), simExplain = $('#sim-explain'),
      complexCount = $('#complex-count'), ccDot = $('.cc-dot');
let factor = 'temp';
const PLOT = { x0: 56, x1: 494, y0: 44, yb: 272 };
const xPlot = (f, v) => PLOT.x0 + (v - f.min) / (f.max - f.min) * (PLOT.x1 - PLOT.x0);
const yPlot = a => PLOT.yb - (a / 100) * (PLOT.yb - PLOT.y0);

function svgEl(name, attrs) { const e = document.createElementNS(SVGNS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
function drawGraph() {
  const f = FACTORS[factor];
  simSvg.innerHTML = '';
  // axes
  simSvg.appendChild(svgEl('line', { x1: PLOT.x0, y1: PLOT.yb, x2: PLOT.x1, y2: PLOT.yb, stroke: '#9AA7B8', 'stroke-width': 1.5 }));
  simSvg.appendChild(svgEl('line', { x1: PLOT.x0, y1: PLOT.y0, x2: PLOT.x0, y2: PLOT.yb, stroke: '#9AA7B8', 'stroke-width': 1.5 }));
  // y axis label
  const yl = svgEl('text', { x: 14, y: 160, fill: '#595959', 'font-size': 12, 'font-weight': 600, transform: 'rotate(-90 14 160)', 'text-anchor': 'middle' });
  yl.textContent = 'Enzyme activity'; simSvg.appendChild(yl);
  const xl = svgEl('text', { x: (PLOT.x0 + PLOT.x1) / 2, y: 308, fill: '#595959', 'font-size': 12, 'font-weight': 600, 'text-anchor': 'middle' });
  xl.textContent = f.name + (f.unit ? ' (' + f.unit + ')' : ''); simSvg.appendChild(xl);
  // x ticks
  f.ticks.forEach(tk => {
    const x = xPlot(f, tk);
    simSvg.appendChild(svgEl('line', { x1: x, y1: PLOT.yb, x2: x, y2: PLOT.yb + 5, stroke: '#9AA7B8', 'stroke-width': 1.5 }));
    const t = svgEl('text', { x, y: PLOT.yb + 19, fill: '#595959', 'font-size': 11, 'text-anchor': 'middle' });
    t.textContent = tk; simSvg.appendChild(t);
  });
  // curve
  let d = '';
  for (let i = 0; i <= 120; i++) {
    const v = f.min + (f.max - f.min) * i / 120;
    const x = xPlot(f, v), y = yPlot(f.activity(v));
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  // area under curve
  const area = svgEl('path', { d: d + `L${xPlot(f, f.max)} ${PLOT.yb} L${PLOT.x0} ${PLOT.yb} Z`, fill: 'rgba(228,184,36,0.12)' });
  simSvg.appendChild(area);
  simSvg.appendChild(svgEl('path', { d, fill: 'none', stroke: '#E4B824', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
  // optimum marker
  const ox = xPlot(f, f.optimum);
  simSvg.appendChild(svgEl('line', { x1: ox, y1: yPlot(100), x2: ox, y2: PLOT.yb, stroke: '#9AA7B8', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
  const ot = svgEl('text', { x: ox, y: 36, fill: '#595959', 'font-size': 11, 'font-weight': 600, 'text-anchor': 'middle' });
  ot.textContent = 'optimum'; simSvg.appendChild(ot);
  // guide + marker (updated live)
  simSvg.appendChild(svgEl('line', { id: 'sim-guide', x1: 0, y1: 0, x2: 0, y2: PLOT.yb, stroke: '#1A3A6B', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.4 }));
  const m = svgEl('circle', { id: 'sim-marker', r: 8, fill: '#1A3A6B', stroke: '#fff', 'stroke-width': 2.5 });
  simSvg.appendChild(m);
}
function buildEnzymePath(d) {
  // d = denature factor 0..1. The active site distorts strongly: a clean
  // concave cradle (fits the substrate) collapses into a lumpy convex top
  // (the substrate can no longer fit).
  const lipY = 150, bottom = 262;
  const leftLip = 130 - 20 * d, dipCx = 160 - 12 * d,
        dipY = 170 - 50 * d,            // concave 170 -> convex bump 120
        rightLip = 190 - 42 * d, rightLipY = lipY + 30 * d; // right lip sags
  return `M70 ${bottom - 12} L70 ${lipY + 16} Q70 ${lipY} 102 ${lipY} L${leftLip} ${lipY}`
    + ` Q${leftLip + 6} ${dipY} ${dipCx} ${dipY} Q${rightLip - 6} ${dipY} ${rightLip} ${rightLipY}`
    + ` L218 ${lipY} Q250 ${lipY} 250 ${lipY + 16} L250 ${bottom - 12}`
    + ` Q250 ${bottom} 232 ${bottom} L88 ${bottom} Q70 ${bottom} 70 ${bottom - 12} Z`;
}
function rgbLerp(a, b, t) { return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`; }
// ---- Reaction field: enzymes + substrates with kinetic energy, forming
//      enzyme-substrate complexes more often as temperature rises to optimum ----
const FIELD_ENZ = [{ cx: 78, cy: 92 }, { cx: 238, cy: 80 }, { cx: 160, cy: 176 }];
const ENZ_SCALE = 0.42;
let fieldEnz = [], fieldDots = [], complexes = 0, fieldLoop = null;
function enzTransform(cx, cy) { return `translate(${(cx - 160 * ENZ_SCALE).toFixed(1)} ${(cy - 206 * ENZ_SCALE).toFixed(1)}) scale(${ENZ_SCALE})`; }
function bayXY(cx, cy) { return [cx, cy - 48 * ENZ_SCALE]; }
function buildField() {
  simEnzSvg.innerHTML = '';
  fieldEnz = []; fieldDots = [];
  // drifting substrate dots — their speed shows kinetic energy
  const dotPos = [[44, 48], [120, 36], [206, 50], [284, 118], [56, 150], [274, 188], [150, 118], [206, 156]];
  dotPos.forEach((p, i) => {
    const d = svgEl('circle', { r: 6, cx: p[0], cy: p[1], fill: '#F0A04B', stroke: '#C9762B', 'stroke-width': 1.5 });
    d.classList.add('sim-sub-dot', 'wander');
    d.style.setProperty('--wx', ((i % 2 ? 1 : -1) * (10 + (i * 7) % 16)) + 'px');
    d.style.setProperty('--wy', (-(8 + (i * 5) % 14)) + 'px');
    d.style.animationDelay = (-(i * 0.3)).toFixed(1) + 's';
    simEnzSvg.appendChild(d); fieldDots.push(d);
  });
  // enzymes (drawn on top so a docked substrate shows in the active site)
  FIELD_ENZ.forEach(pos => {
    const g = svgEl('g', { transform: enzTransform(pos.cx, pos.cy) });
    const body = svgEl('path', { class: 'sim-enz-shape', d: buildEnzymePath(0), fill: '#2C5C8A', stroke: '#1A3A6B', 'stroke-width': 2 });
    g.appendChild(body); simEnzSvg.appendChild(g);
    const [bx, by] = bayXY(pos.cx, pos.cy);
    const glow = svgEl('circle', { class: 'sim-glow', cx: bx, cy: by, r: 15, fill: '#E4B824' });
    const dock = svgEl('circle', { class: 'sim-dock', cx: bx, cy: by, r: 7, fill: '#F0A04B', stroke: '#C9762B', 'stroke-width': 1.5 });
    simEnzSvg.appendChild(glow); simEnzSvg.appendChild(dock);
    fieldEnz.push({ body, dock, glow, busy: false });
  });
  complexes = 0; if (complexCount) complexCount.textContent = '0';
}
function fieldTick() {
  const f = FACTORS[factor], v = parseFloat(simSlider.value);
  const a = f.activity(v), den = f.denature(v);
  const p = den > 0.5 ? 0 : (a / 100) * 0.55;   // complexes form more often at higher activity
  fieldEnz.forEach(e => {
    if (e.busy || Math.random() >= p) return;
    e.busy = true;
    e.dock.classList.add('on');
    e.glow.classList.remove('on'); void e.glow.getBoundingClientRect(); e.glow.classList.add('on');
    setTimeout(() => {
      e.dock.classList.remove('on'); e.busy = false;
      complexes++; if (complexCount) complexCount.textContent = String(complexes);
      if (ccDot) { ccDot.classList.remove('flash'); void ccDot.offsetWidth; ccDot.classList.add('flash'); }
    }, 620);
  });
}
function startField() { if (fieldLoop) clearInterval(fieldLoop); fieldLoop = setInterval(fieldTick, 320); }
function stopField() { if (fieldLoop) { clearInterval(fieldLoop); fieldLoop = null; } }
function setFactor(name) {
  factor = name;
  $$('#panel-factors .seg-btn').forEach(b => { const on = b.dataset.factor === name; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  const f = FACTORS[factor];
  simSlider.min = f.min; simSlider.max = f.max; simSlider.step = f.step; simSlider.value = f.start;
  simSlider.setAttribute('aria-label', f.name + (f.unit ? ' in ' + f.unit : ''));
  simUnit.textContent = f.unit;
  simScale.innerHTML = f.ticks.map(t => `<span>${t}${f.unit}</span>`).join('');
  drawGraph(); buildField(); updateSim();
}
function updateSim() {
  const f = FACTORS[factor];
  const v = parseFloat(simSlider.value);
  const a = f.activity(v), den = f.denature(v), zone = f.zone(v);
  simValue.textContent = factor === 'ph' ? v.toFixed(1) : Math.round(v);
  // rate words
  let word = a > 85 ? 'Very fast' : a > 50 ? 'Fast' : a > 20 ? 'Slow' : 'Very slow';
  if (den > 0.85) word = 'Stopped';
  simRate.textContent = `${word} (${Math.round(a)}%)`;
  simRate.style.color = den > 0.5 ? '#B23644' : (a > 60 ? '#4A9E54' : '#2A6FB0');
  // marker
  const mk = $('#sim-marker', simSvg), gd = $('#sim-guide', simSvg);
  if (mk) { const x = xPlot(f, v), y = yPlot(a); mk.setAttribute('cx', x); mk.setAttribute('cy', y); gd.setAttribute('x1', x); gd.setAttribute('x2', x); gd.setAttribute('y1', y); }
  // reaction field: every enzyme's active site morphs as it denatures
  const denFill = rgbLerp([44, 92, 138], [150, 72, 92], clamp((den - 0.15) / 0.6, 0, 1));
  const dpath = buildEnzymePath(den);
  fieldEnz.forEach(e => { e.body.setAttribute('d', dpath); e.body.setAttribute('fill', denFill); });
  // kinetic energy: substrates drift faster as temperature rises (constant for pH)
  const ke = factor === 'temp' ? clamp(2.6 - (v / 60) * 2.2, 0.4, 2.6) : 1.3;
  fieldDots.forEach(d => d.style.setProperty('--dur', ke.toFixed(2) + 's'));
  // state
  const stxt = STATE_TEXT[factor][zone] || STATE_TEXT[factor].warm;
  simState.textContent = stxt[0];
  simState.className = 'sim-state ' + (zone === 'cold' ? 'cold' : zone === 'optimum' ? 'optimum' : zone === 'denatured' ? 'denatured' : '');
  simExplain.innerHTML = `<strong>${esc(stxt[0])}.</strong> ${esc(stxt[1])}`;
}
// slider + graph drag
simSlider.addEventListener('input', () => { updateSim(); tick(); });
function graphToValue(clientX) {
  const f = FACTORS[factor], r = simSvg.getBoundingClientRect();
  const x = (clientX - r.left) / r.width * 520;
  let v = f.min + (clamp(x, PLOT.x0, PLOT.x1) - PLOT.x0) / (PLOT.x1 - PLOT.x0) * (f.max - f.min);
  v = Math.round(v / f.step) * f.step;
  return clamp(v, f.min, f.max);
}
let simDragging = false;
simSvg.addEventListener('pointerdown', e => {
  e.preventDefault();                                   // stop the browser starting a selection
  simDragging = true;
  document.body.classList.add('dragging-active');        // page-wide selection lock (mandatory on every drag)
  try { simSvg.setPointerCapture(e.pointerId); } catch (_) {}
  simSlider.value = graphToValue(e.clientX); updateSim();
});
simSvg.addEventListener('pointermove', e => { if (!simDragging) return; simSlider.value = graphToValue(e.clientX); updateSim(); });
function endSimDrag(e) { if (!simDragging) return; simDragging = false; document.body.classList.remove('dragging-active'); try { if (e) simSvg.releasePointerCapture(e.pointerId); } catch (_) {} }
simSvg.addEventListener('pointerup', endSimDrag);
simSvg.addEventListener('pointercancel', endSimDrag);
$$('#panel-factors .seg-btn').forEach(b => b.addEventListener('click', () => setFactor(b.dataset.factor)));
function simResize() { /* drawGraph relies on viewBox, nothing to recompute, but redraw to be safe */ drawGraph(); updateSim(); }

// ============================================================
// SECTION 4 — Into the blood (villus)
// ============================================================
const VILLUS_INFO = {
  shape: { kicker: 'Large surface area', title: 'Finger-like shape', body: 'Each villus is a tiny finger-like outgrowth. Millions of them give the ileum a very large <strong>surface area</strong>, so more digested food can be absorbed.', part: 'v-body' },
  epithelium: { kicker: 'Short diffusion distance', title: 'Surface epithelium', body: 'A <strong>single layer</strong> of surface cells covers the villus. This thin, permeable membrane reduces the distance molecules must diffuse to reach the blood.', part: 'v-epi' },
  capillary: { kicker: 'Good blood supply', title: 'Capillary network', body: 'A network of capillaries absorbs <strong>glucose</strong> (from starch) and <strong>amino acids</strong> (from protein). A good blood supply carries them away, keeping a steep concentration gradient.', part: 'v-cap' },
  lacteal: { kicker: 'Absorbs fats', title: 'Lacteal', body: 'The central lacteal absorbs the products of fat digestion — <strong>glycerol and fatty acids</strong> — and returns them to the blood later.', part: 'v-lac' },
  lumen: { kicker: 'Where digested food is', title: 'Lumen of the gut', body: 'The space inside the ileum where digested food passes. Small, soluble molecules are absorbed from here, across the villus surface, into the blood and lacteal.', part: null }
};
const villusSvg = $('#villus-svg');
$$('.lbl', villusSvg).forEach(l => {
  const act = () => {
    const info = VILLUS_INFO[l.dataset.key]; if (!info) return;
    setInfo($('#v-info'), info);
    $$('.lbl', villusSvg).forEach(x => x.classList.toggle('is-selected', x === l));
    if (info.part) flashPart(info.part);
    tick();
    maybeNarrate($('#v-info'));
  };
  l.addEventListener('click', act);
  l.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
});
const vParticles = $('#v-particles');
let vview = 'explore';
function setVillusView(view) {
  vview = view;
  $$('#panel-villus .seg-btn').forEach(b => { const on = b.dataset.vview === view; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  $$('.lbl', villusSvg).forEach(l => { l.style.opacity = view === 'explore' ? '' : '0.25'; l.style.pointerEvents = view === 'explore' ? '' : 'none'; });
  vParticles.innerHTML = '';
  if (view === 'absorb') {
    // Vessels: left capillary limb x=300, central lacteal x=320, right capillary limb x=340.
    // RED (glucose / amino acids) is absorbed at the NEAREST capillary wall — it never
    // crosses the lacteal. So dots enter from both sides: left-entering reds stop at the
    // left limb (x300), right-entering reds at the right limb (x340).
    // YELLOW (glycerol / fatty acids) is NOT taken by the capillaries — fats pass through
    // to the central lacteal (x320), entering from either side.
    const defs = [
      { sx: 188, sy: 226, tx: 300, ty: 228, cap: true },   // left lumen -> left capillary
      { sx: 184, sy: 374, tx: 300, ty: 372, cap: true },   // left lumen -> left capillary
      { sx: 452, sy: 284, tx: 340, ty: 286, cap: true },   // right lumen -> right capillary
      { sx: 456, sy: 412, tx: 340, ty: 410, cap: true },   // right lumen -> right capillary
      { sx: 196, sy: 304, tx: 320, ty: 304, cap: false },  // left lumen -> lacteal
      { sx: 450, sy: 206, tx: 320, ty: 208, cap: false }   // right lumen -> lacteal
    ];
    defs.forEach((p, i) => {
      const c = svgEl('circle', { r: 6.5, cx: p.sx, cy: p.sy, fill: p.cap ? '#D7263D' : '#E4B824', opacity: 0.9 });
      c.classList.add('absorb');
      c.style.setProperty('--mx', (p.tx - p.sx) + 'px');
      c.style.setProperty('--my', (p.ty - p.sy) + 'px');
      c.style.animationDelay = (i * 0.55) + 's';
      vParticles.appendChild(c);
    });
    // legend (lower-left lumen)
    const legend = svgEl('g', {});
    legend.innerHTML = '<circle cx="40" cy="406" r="6.5" fill="#D7263D"/><text class="v-legend-text" x="54" y="411">→ capillaries</text>'
      + '<circle cx="40" cy="430" r="6.5" fill="#E4B824"/><text class="v-legend-text" x="54" y="435">→ lacteal</text>';
    vParticles.appendChild(legend);
    setInfo($('#v-info'), { kicker: 'Absorption', title: 'Digested food enters the blood', body: 'Glucose and amino acids (red) pass into the <strong>capillaries</strong>; glycerol and fatty acids (yellow) pass into the <strong>lacteal</strong>. The thin epithelium and rich blood supply make this fast and efficient.' });
  } else {
    setInfo($('#v-info'), { kicker: 'The small intestine', title: 'The ileum is built to absorb', body: 'The ileum (small intestine) is about <strong>3 metres</strong> long and folded, with millions of tiny <strong>villi</strong> on its lining. Together they make a huge surface area for absorbing digested food. Tap any label to see how the villus is adapted.' });
  }
}
$$('#panel-villus .seg-btn').forEach(b => b.addEventListener('click', () => setVillusView(b.dataset.vview)));

// ============================================================
// NARRATION — optional text-to-speech of the info box (speaker icon)
// ============================================================
const ttsOk = 'speechSynthesis' in window;
let narrateOn = false;
const narrateBtns = $$('.narrate-btn');

// Pick the most natural English voice the device offers, instead of the basic
// default the browser would otherwise grab. If nothing better is installed it
// stays null and we fall back to the default — so this can only improve, never
// break, the narration. Quality voices vary by browser/OS (Edge "Natural",
// Apple "Enhanced/Siri", Google), so we score by name and prefer en-GB.
let bestVoice = null;
function pickBestVoice() {
  if (!ttsOk) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return; // not loaded yet — voiceschanged will retry
  const score = v => {
    const n = (v.name || '').toLowerCase(), lang = (v.lang || '').toLowerCase();
    let s = 0;
    if (lang.startsWith('en-gb')) s += 6; else if (lang.startsWith('en')) s += 2;
    if (/natural|neural|enhanced|premium/.test(n)) s += 6;
    if (/\bsiri\b/.test(n)) s += 5;
    if (/google/.test(n)) s += 4;
    if (/(daniel|sonia|libby|aria|serena|kate|stephanie|ryan|arthur|fiona|moira|emily)/.test(n)) s += 3;
    if (v.localService === false) s += 1;
    if (/compact|eloquence|novelty|whisper|bells|organ|cello|news|zarvox|trinoids/.test(n)) s -= 6;
    return s;
  };
  let best = null, bestScore = 0; // require a positive score and an English voice
  voices.forEach(v => { const s = score(v); if (s > bestScore && /^en/i.test(v.lang || '')) { bestScore = s; best = v; } });
  if (best) bestVoice = best;
}

function readAloud(card) {
  if (!ttsOk || !card) return;
  const t = card.querySelector('h2').textContent.trim();
  const b = card.querySelector('p').textContent.trim();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t + '. ' + b);
  if (bestVoice) { u.voice = bestVoice; u.lang = bestVoice.lang; } else { u.lang = 'en-GB'; }
  u.rate = 0.98; u.pitch = 1;
  u.onstart = () => narrateBtns.forEach(x => x.classList.add('speaking'));
  u.onend = u.onerror = () => narrateBtns.forEach(x => x.classList.remove('speaking'));
  window.speechSynthesis.speak(u);
}
function maybeNarrate(card) { if (narrateOn) readAloud(card); }
function setNarrate(on, card) {
  narrateOn = on;
  narrateBtns.forEach(x => { x.setAttribute('aria-pressed', on ? 'true' : 'false'); x.classList.toggle('is-on', on); });
  if (on) readAloud(card);
  else { if (ttsOk) window.speechSynthesis.cancel(); narrateBtns.forEach(x => x.classList.remove('speaking')); }
}
if (!ttsOk) { narrateBtns.forEach(x => x.setAttribute('hidden', '')); }
else {
  pickBestVoice(); // voices may load async; retry when the browser reports them
  if ('onvoiceschanged' in window.speechSynthesis) window.speechSynthesis.onvoiceschanged = pickBestVoice;
  narrateBtns.forEach(btn => btn.addEventListener('click', () => setNarrate(!narrateOn, btn.closest('.info-card'))));
}

// ---------- global ----------
document.addEventListener('selectstart', e => { if (document.body.classList.contains('dragging-active')) e.preventDefault(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('#celebrate').hidden = true; kbClear(); } });

// ============================================================
// SECTION 5 — Quiz (multiple choice, from the CCEA 1.4 materials)
// ============================================================
// Authored with the correct answer first (a: 0); options AND questions are
// shuffled at render (rule 6). Distractors are plausible so the question needs
// knowledge, not elimination, and no stem gives away its own answer (rule 5).
const QUIZ = [
  { q: 'What type of molecule is every enzyme?', opts: ['A protein', 'A carbohydrate', 'A lipid (fat)', 'A simple sugar'], a: 0, ex: 'All enzymes are proteins. They act as biological catalysts.' },
  { q: 'What does an enzyme do in a reaction?', opts: ['Speeds it up without being used up', 'Slows it down', 'Provides the energy for it', 'Is used up as it works'], a: 0, ex: 'Enzymes are biological catalysts — they speed reactions up and are not used up, so they work again and again.' },
  { q: 'Which enzyme breaks down starch?', opts: ['Carbohydrase (amylase)', 'Protease', 'Lipase', 'Catalase'], a: 0, ex: 'Carbohydrase (amylase) breaks starch down into glucose.' },
  { q: 'Protease digests protein into…', opts: ['Amino acids', 'Glucose', 'Glycerol and fatty acids', 'Simple sugars'], a: 0, ex: 'Protease digests protein into amino acids. The other options are products made by different enzymes.' },
  { q: 'Lipase digests fat (lipid) into…', opts: ['Glycerol and fatty acids', 'Glucose', 'Amino acids', 'Simple sugars'], a: 0, ex: 'Lipase digests fats into glycerol and fatty acids.' },
  { q: 'Why can each enzyme only work on one particular substrate?', opts: ['Its substrate is complementary in shape to the active site', 'The substrate is the same size as the whole enzyme', 'The enzyme is made of the same material as the substrate', 'The substrate is always smaller than the active site'], a: 0, ex: 'Only a substrate whose shape is complementary to the active site fits — the lock-and-key model gives enzymes their specificity.' },
  { q: 'What happens to an enzyme heated well above its optimum temperature?', opts: ['Its active site changes shape and it denatures', 'It works faster and faster', 'It turns into its substrate', 'It is completely unaffected'], a: 0, ex: 'Heat changes the shape of the active site. This is denaturation — it is irreversible, so the substrate no longer fits.' },
  { q: 'How does an inhibitor reduce the activity of an enzyme?', opts: ['It blocks the active site so the substrate cannot enter', 'It raises the temperature of the enzyme', 'It breaks the enzyme into products', 'It makes the substrate fit better'], a: 0, ex: 'An inhibitor fits the active site but is not broken down, so the substrate cannot get in and the rate falls.' },
  { q: 'Why must food be digested before it can be absorbed?', opts: ['So large molecules become small and soluble enough to enter the blood', 'To release all the energy from the food', 'To kill any bacteria in the food', 'To store the food in the liver'], a: 0, ex: 'Digestion breaks large, insoluble molecules into small, soluble ones that can be absorbed into the bloodstream.' },
  { q: 'Which adaptation gives the ileum a large surface area for absorption?', opts: ['Millions of tiny finger-like villi', 'A thick muscular wall', 'A smooth inner lining', 'A coating of fat'], a: 0, ex: 'Its length, folds and millions of villi give a very large surface area for absorbing digested food.' },
  { q: 'The lacteal in a villus absorbs the breakdown products of which food?', opts: ['Fats (glycerol and fatty acids)', 'Starch (glucose)', 'Protein (amino acids)', 'Vitamins only'], a: 0, ex: 'The lacteal absorbs glycerol and fatty acids — the products of fat digestion.' },
  { q: 'How does the single layer of surface cells on a villus help absorption?', opts: ['It gives a short distance for molecules to diffuse', 'It increases the surface area', 'It provides a good blood supply', 'It makes digestive enzymes'], a: 0, ex: 'A single, thin layer of cells means molecules diffuse only a short distance into the blood. Surface area and blood supply are separate adaptations.' }
];
const QUIZ_N = 10;
let quizQs = [], quizIdx = 0, quizScore = 0, quizAnswered = false;
const qProgress = $('#quiz-progress'), qScore = $('#quiz-score'), qBar = $('#quiz-bar-fill'),
      qBody = $('#quiz-body'), qQuestion = $('#quiz-question'), qOptions = $('#quiz-options'),
      qFeedback = $('#quiz-feedback'), qNext = $('#quiz-next'),
      qResult = $('#quiz-result'), qResultTitle = $('#quiz-result-title'), qResultBody = $('#quiz-result-body'), qRetry = $('#quiz-retry');

function buildQuiz() {
  quizQs = shuffle(QUIZ).slice(0, Math.min(QUIZ_N, QUIZ.length));
  quizIdx = 0; quizScore = 0; quizAnswered = false;
  qScore.textContent = '0';
  qResult.hidden = true; qBody.hidden = false;
  renderQuestion();
}
function renderQuestion() {
  quizAnswered = false;
  const item = quizQs[quizIdx];
  qProgress.textContent = `Question ${quizIdx + 1} of ${quizQs.length}`;
  qBar.style.width = (quizIdx / quizQs.length * 100) + '%';
  qQuestion.textContent = item.q;
  qFeedback.hidden = true; qFeedback.className = 'quiz-feedback';
  qNext.hidden = true;
  qNext.textContent = quizIdx === quizQs.length - 1 ? 'See your score' : 'Next question';
  qOptions.innerHTML = '';
  const correctText = item.opts[item.a];
  shuffle(item.opts).forEach(optText => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'quiz-option';
    btn.innerHTML = `<span>${esc(optText)}</span><span class="opt-mark" aria-hidden="true"></span>`;
    btn.addEventListener('click', () => quizAnswer(btn, optText === correctText, correctText, item.ex));
    qOptions.appendChild(btn);
  });
}
function quizAnswer(btn, isCorrect, correctText, ex) {
  if (quizAnswered) return;
  quizAnswered = true;
  $$('.quiz-option', qOptions).forEach(o => {
    o.disabled = true;
    const txt = o.querySelector('span').textContent;
    if (txt === correctText) { o.classList.add('correct'); o.querySelector('.opt-mark').textContent = '✓'; }
    else if (o === btn) { o.classList.add('wrong'); o.querySelector('.opt-mark').textContent = '✗'; }
    else o.classList.add('muted');
  });
  if (isCorrect) { quizScore++; qScore.textContent = String(quizScore); success(); qFeedback.classList.add('ok'); qFeedback.innerHTML = `<strong>Correct.</strong> ${esc(ex)}`; }
  else { reject(); qFeedback.classList.add('no'); qFeedback.innerHTML = `<strong>Not quite.</strong> ${esc(ex)}`; }
  qFeedback.hidden = false;
  qBar.style.width = ((quizIdx + 1) / quizQs.length * 100) + '%';
  qNext.hidden = false; qNext.focus();
}
function quizNext() {
  if (quizIdx < quizQs.length - 1) { quizIdx++; renderQuestion(); }
  else showQuizResult();
}
function showQuizResult() {
  qBody.hidden = true; qResult.hidden = false;
  const n = quizQs.length, pct = Math.round(quizScore / n * 100);
  let msg;
  if (pct >= 80) msg = 'Excellent — you really know your enzymes and digestion.';
  else if (pct >= 50) msg = 'Good effort. Look back over the parts you missed, then try again.';
  else msg = 'Keep going — revisit the earlier sections and give the quiz another go.';
  qResultTitle.textContent = `You scored ${quizScore} out of ${n}`;
  qResultBody.textContent = msg;
  if (pct >= 80) chord();
}
qNext.addEventListener('click', quizNext);
qRetry.addEventListener('click', buildQuiz);

// ---------- init ----------
setHowView('explore');
buildMatch();
setFactor('temp');
setVillusView('explore');
buildQuiz();
