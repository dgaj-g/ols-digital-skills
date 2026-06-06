/* ============================================================
   The Immunity Gallery — CCEA GCSE Biology Unit 2, 2.6
   Health, disease, defence mechanisms and treatments.
   Pointer Events throughout (mouse + touch + pen).
   Self-contained, no build step, works from file://.
   ============================================================ */

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (n, a) => { const e = document.createElementNS(SVGNS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- audio (Web Audio synth, no files) ----------
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
const sFx = {
  ok: () => [659.25, 783.99].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.12), i * 70)),
  no: () => tone(196, 0.12, 'square', 0.06),
  tick: () => tone(880, 0.05, 'sine', 0.05),
  click: () => tone(523.25, 0.07, 'sine', 0.08),
  chord: () => [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => tone(f, 0.5, 'sine', 0.12), i * 110)),
  low: () => tone(150, 0.18, 'sawtooth', 0.05)
};

// ============================================================
// FLOOR-PLAN NAVIGATION
// ============================================================
const tabs = $$('.exhibit-tab');
const panels = $$('.panel');
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => { const on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
  panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === t.dataset.tab));
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
}));

// ============================================================
// GENERIC PLACE-ALL-THEN-CHECK DRAG ENGINE
// One Pointer-Events code path for mouse + touch + pen.
// Tokens move between a tray and drop-zones; nothing is graded
// until a Check button is pressed.
// ============================================================
const TAP = 6;
let drag = { tk: null, id: null, x0: 0, y0: 0, moved: false, origin: null, zones: null, onChange: null };
let kbSel = null;

function zoneUnder(x, y, tk, zones) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (el === tk || tk.contains(el)) continue;
    for (const z of zones) {
      const hit = el.closest(z.sel);
      if (hit) return { el: hit, cap: z.cap };
    }
  }
  return null;
}
function clearZoneHi() { $$('.drop-hover').forEach(e => e.classList.remove('drop-hover')); }
function tokensIn(el, except) { return Array.from(el.children).filter(c => c.classList.contains('token') && c !== except); }

function placeToken(tk, zone, origin) {
  const existing = tokensIn(zone.el, tk);
  if (existing.length >= zone.cap) {
    if (zone.cap === 1 && origin && origin !== zone.el) {
      origin.appendChild(existing[0]); existing[0].style.transform = '';
    } else { return false; }
  }
  zone.el.appendChild(tk); tk.style.transform = '';
  return true;
}

function setupDrag(tk, zones, onChange) {
  tk.addEventListener('pointerdown', e => {
    if (tk.dataset.locked === '1') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { tk.setPointerCapture(e.pointerId); } catch (_) {}
    drag = { tk, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, origin: tk.parentElement, zones, onChange };
  });
  tk.addEventListener('pointermove', e => {
    if (e.pointerId !== drag.id || drag.tk !== tk) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) > TAP) {
      drag.moved = true; tk.classList.add('dragging'); document.body.classList.add('dragging-active');
    }
    if (drag.moved) {
      tk.style.transform = `translate(${dx}px,${dy}px) scale(1.05) rotate(-1.5deg)`;
      clearZoneHi();
      const z = zoneUnder(e.clientX, e.clientY, tk, zones);
      if (z) z.el.classList.add('drop-hover');
    }
  });
  const end = e => {
    if (e.pointerId !== drag.id || drag.tk !== tk) return;
    const wasDrag = drag.moved; clearZoneHi(); document.body.classList.remove('dragging-active');
    tk.classList.remove('dragging');
    if (wasDrag) {
      const z = zoneUnder(e.clientX, e.clientY, tk, zones);
      if (z && placeToken(tk, z, drag.origin)) { sFx.click(); }
      else { tk.style.transform = ''; bounce(tk); }
      if (drag.onChange) drag.onChange();
    }
    try { tk.releasePointerCapture(e.pointerId); } catch (_) {}
    drag.tk = null; drag.id = null; drag.moved = false;
  };
  tk.addEventListener('pointerup', end);
  tk.addEventListener('pointercancel', e => {
    if (e.pointerId !== drag.id || drag.tk !== tk) return;
    clearZoneHi(); document.body.classList.remove('dragging-active');
    tk.classList.remove('dragging'); tk.style.transform = '';
    drag.tk = null; drag.id = null; drag.moved = false;
  });
  // keyboard pick-up. stopPropagation so the keypress doesn't bubble to the
  // token's own container (the tray/slot is also a keyboard drop-zone, which
  // would otherwise immediately "drop" and deselect it).
  tk.addEventListener('keydown', e => {
    if (tk.dataset.locked === '1') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation();
      if (kbSel === tk) { kbClear(); return; }
      kbClear(); kbSel = tk; tk.classList.add('selected');
    }
  });
}
function kbClear() { if (kbSel) kbSel.classList.remove('selected'); kbSel = null; }
function enableZoneKb(zoneEl, cap, onChange) {
  if (zoneEl.dataset.kb === '1') return; zoneEl.dataset.kb = '1';
  if (!zoneEl.hasAttribute('tabindex')) zoneEl.tabIndex = 0;
  const drop = () => {
    if (!kbSel) return;
    const tk = kbSel; kbClear();
    if (placeToken(tk, { el: zoneEl, cap }, tk.parentElement)) { sFx.click(); if (onChange) onChange(); }
  };
  zoneEl.addEventListener('click', e => { if (kbSel && !e.target.closest('.token')) drop(); });
  zoneEl.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && kbSel && !e.target.closest('.token')) { e.preventDefault(); drop(); } });
}
function bounce(tk) { tk.classList.add('bounce'); setTimeout(() => tk.classList.remove('bounce'), 320); sFx.no(); }

function makeToken(label, data) {
  const tk = document.createElement('div');
  tk.className = 'token'; tk.tabIndex = 0; tk.setAttribute('role', 'button');
  for (const k in data) tk.dataset[k] = data[k];
  tk.innerHTML = label;
  tk.setAttribute('aria-label', (tk.textContent || '').trim() + '. Press Enter to pick up, then choose where to place it.');
  return tk;
}

// ============================================================
// NARRATION — optional read-aloud of an info card
// ============================================================
const ttsOk = 'speechSynthesis' in window;
let bestVoice = null;
function pickVoice() {
  if (!ttsOk) return;
  const voices = window.speechSynthesis.getVoices(); if (!voices || !voices.length) return;
  const score = v => { const n = (v.name || '').toLowerCase(), l = (v.lang || '').toLowerCase(); let s = 0;
    if (l.startsWith('en-gb')) s += 6; else if (l.startsWith('en')) s += 2;
    if (/natural|neural|enhanced|premium/.test(n)) s += 6; if (/\bsiri\b/.test(n)) s += 5;
    if (/google/.test(n)) s += 4; if (/(daniel|sonia|libby|aria|serena|kate|stephanie|fiona|moira|emily)/.test(n)) s += 3;
    if (v.localService === false) s += 1; if (/compact|eloquence|novelty|whisper|bells|organ|zarvox/.test(n)) s -= 6; return s; };
  let best = null, bs = 0; voices.forEach(v => { const s = score(v); if (s > bs && /^en/i.test(v.lang || '')) { bs = s; best = v; } });
  if (best) bestVoice = best;
}
let narrateOn = false;
function readCard(card) {
  if (!ttsOk || !card) return;
  const t = (card.querySelector('h3') || {}).textContent || '';
  const b = (card.querySelector('p') || {}).textContent || '';
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance((t + '. ' + b).trim());
  if (bestVoice) { u.voice = bestVoice; u.lang = bestVoice.lang; } else u.lang = 'en-GB';
  u.rate = 0.98;
  u.onstart = () => $$('.narrate-btn').forEach(x => x.classList.add('speaking'));
  u.onend = u.onerror = () => $$('.narrate-btn').forEach(x => x.classList.remove('speaking'));
  window.speechSynthesis.speak(u);
}
function maybeNarrate(card) { if (narrateOn) readCard(card); }
if (!ttsOk) { $$('.narrate-btn').forEach(x => x.setAttribute('hidden', '')); }
else {
  pickVoice(); if ('onvoiceschanged' in window.speechSynthesis) window.speechSynthesis.onvoiceschanged = pickVoice;
  $$('.narrate-btn').forEach(btn => btn.addEventListener('click', () => {
    narrateOn = !narrateOn;
    $$('.narrate-btn').forEach(x => { x.setAttribute('aria-pressed', narrateOn ? 'true' : 'false'); x.classList.toggle('is-on', narrateOn); });
    if (narrateOn) readCard(btn.closest('.info-card')); else { window.speechSynthesis.cancel(); $$('.narrate-btn').forEach(x => x.classList.remove('speaking')); }
  }));
}
function setInfo(card, info) {
  $('.info-kicker', card).textContent = info.kicker;
  card.querySelector('h3').textContent = info.title;
  card.querySelector('p').innerHTML = info.body;
  maybeNarrate(card);
}

// ============================================================
// EXHIBIT I — Antibodies & the immune response
// ============================================================
const abInfoCard = $('#ab-info');
const AB_LABELS = {
  antigen: { kicker: 'Foreign marker', title: 'Antigen', body: 'A <strong>foreign chemical</strong> on the surface of a microorganism. The body recognises it as <strong>non-self</strong>, which triggers the immune response.' },
  lymphocyte: { kicker: 'White blood cell', title: 'Lymphocyte', body: 'A white blood cell that recognises a specific antigen and produces <strong>antibodies</strong> against it. Each lymphocyte makes only <strong>one kind</strong> of antibody.' },
  antibody: { kicker: 'Made by lymphocytes', title: 'Antibody', body: 'A protein with a shape that is <strong>complementary</strong> to one antigen &mdash; like a key in a lock. It binds the antigen, clumps the microbes together and helps phagocytes destroy them.' }
};
const AB_STEPS = [
  { kicker: 'Step 1 of 6', title: 'A microorganism enters', body: 'An invading microorganism enters the body. It carries <strong>antigens</strong> &mdash; foreign chemicals &mdash; on its surface.' },
  { kicker: 'Step 2 of 6', title: 'Recognised as foreign', body: 'A particular <strong>lymphocyte</strong> recognises a specific antigen as <strong>foreign / non-self</strong>.' },
  { kicker: 'Step 3 of 6', title: 'Antibodies produced', body: 'The lymphocyte produces only <strong>one kind of antibody</strong> to attack that antigen.' },
  { kicker: 'Step 4 of 6', title: 'A complementary fit', body: 'The antibodies have a <strong>specific shape</strong> that is <strong>complementary</strong> to the antigen &mdash; they lock on like a key in a lock.' },
  { kicker: 'Step 5 of 6', title: 'Clumping (agglutination)', body: 'The antibodies make the microorganisms <strong>clump together</strong> (agglutinate). This <strong>reduces the spread</strong> of the microbe.' },
  { kicker: 'Step 6 of 6', title: 'Destroyed by phagocytes', body: 'The clumps are easily destroyed by <strong>phagocytes</strong> in a process called <strong>phagocytosis</strong>. Symptoms are reduced.' }
];
const abSvg = $('#ab-svg'), abFlock = $('#ab-flock'), abPhago = $('#ab-phago'), abLympho = $('#ab-lympho'), abBact = $('#ab-bact');
const abStepper = $('#ab-stepper'), abDots = $('#ab-dots'), abPlay = $('#ab-play');
let abStep = -1;

// antigens on the watch bacterium
(function buildWatchAntigens() {
  const g = $('#ab-antigens'); const xs = [445, 495, 545];
  xs.forEach(x => { const p = svgEl('polygon', { points: `${x - 11},250 ${x + 11},250 ${x},230` }); g.appendChild(p); });
})();
for (let i = 0; i < 6; i++) abDots.appendChild(document.createElement('span'));

function antibodyY(x, y, scale = 1, rot = 0) {
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', '#sym-antibody');
  u.setAttribute('x', x - 12 * scale); u.setAttribute('y', y - 12 * scale);
  u.setAttribute('width', 24 * scale); u.setAttribute('height', 26 * scale);
  u.setAttribute('transform', `rotate(${rot} ${x} ${y})`);
  u.setAttribute('stroke', '#E4B824');
  return u;
}
function clearFlock() { abFlock.innerHTML = ''; }
function resetWatch() {
  clearFlock();
  abLympho.style.transform = ''; abLympho.style.opacity = '';
  abBact.style.transform = ''; abBact.style.opacity = '';
  abPhago.setAttribute('hidden', '');
  $$('.lbl', abSvg).forEach(l => l.classList.remove('is-selected'));
}
function applyAbStep(n) {
  abStep = clamp(n, 0, 5);
  resetWatch();
  $$('span', abDots).forEach((d, i) => d.classList.toggle('on', i === abStep));
  $('#ab-prev').disabled = abStep === 0; $('#ab-next').disabled = abStep === 5;
  // bacterium drifts in from the right on step 0
  if (abStep === 0) abBact.style.transform = 'translateX(40px)';
  // step 2+: antibodies budding around the lymphocyte
  if (abStep >= 2) {
    [[110, 250], [90, 300], [110, 350], [200, 280], [205, 330]].forEach((p, i) =>
      abFlock.appendChild(antibodyY(p[0], p[1], 1, -20 + i * 12)));
  }
  // step 3+: antibodies docked on antigens
  if (abStep >= 3) {
    [445, 495, 545].forEach(x => abFlock.appendChild(antibodyY(x, 232, 0.9, 180)));
  }
  // step 4 (clump): pull bacterium + show partner microbes clumping
  if (abStep >= 4) {
    abBact.style.transform = 'translate(-70px,10px) scale(0.92)';
    const extra = svgEl('g', { transform: 'translate(360 300)' });
    extra.appendChild(svgEl('rect', { x: 0, y: 0, width: 120, height: 68, rx: 34, fill: '#9B8BE0', stroke: '#5B43B8', 'stroke-width': 2.5 }));
    abFlock.appendChild(extra);
    abFlock.appendChild(antibodyY(420, 300, 0.8, 90));
  }
  // step 5: phagocyte sweeps over the clump
  if (abStep >= 5) { abPhago.removeAttribute('hidden'); abPhago.style.transform = 'translate(-150px,150px)'; }
  setInfo(abInfoCard, AB_STEPS[abStep]);
  abStep === 5 ? sFx.ok() : sFx.tick();
}
// explore labels
$$('.lbl', abSvg).forEach(l => {
  const act = () => {
    const info = AB_LABELS[l.dataset.key]; if (!info) return;
    setInfo(abInfoCard, info);
    $$('.lbl', abSvg).forEach(x => x.classList.toggle('is-selected', x === l));
    sFx.tick();
  };
  l.addEventListener('click', act);
  l.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
});
abPlay.addEventListener('click', () => { abStepper.removeAttribute('hidden'); applyAbStep(0); });
$('#ab-prev').addEventListener('click', () => applyAbStep(abStep - 1));
$('#ab-next').addEventListener('click', () => applyAbStep(abStep + 1));

// ----- Exhibit I view toggle -----
$$('#panel-antibodies [data-view1]').forEach(b => b.addEventListener('click', () => {
  const v = b.dataset.view1;
  $$('#panel-antibodies [data-view1]').forEach(x => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
  $('#ab-watch').toggleAttribute('hidden', v !== 'watch');
  $('#ab-match').toggleAttribute('hidden', v !== 'match');
}));

// ----- Antibody shape match (assessed) -----
function shapeMarkup(kind) {
  const m = {
    triangle: '<polygon points="35,8 62,56 8,56"/>',
    circle: '<circle cx="35" cy="35" r="26"/>',
    square: '<rect x="11" y="11" width="48" height="48" rx="6"/>',
    pentagon: '<polygon points="35,7 61,27 51,59 19,59 9,27"/>',
    cross: '<polygon points="26,8 44,8 44,26 62,26 62,44 44,44 44,62 26,62 26,44 8,44 8,26 26,26"/>'
  };
  return `<svg class="tk-shape" viewBox="0 0 70 70" aria-hidden="true">${m[kind]}</svg>`;
}
const AB_ANTIGENS = [{ shape: 'triangle' }, { shape: 'circle' }, { shape: 'square' }];
const AB_ANTIBODIES = [
  { shape: 'triangle' }, { shape: 'circle' }, { shape: 'square' },
  { shape: 'pentagon' }, { shape: 'cross' }
];
const abSites = $('#ab-sites'), abTray = $('#ab-tray'), abCheck = $('#ab-check'), abHint = $('#ab-hint');
function abZones() { return [{ sel: '.antigen-slot', cap: 1 }, { sel: '#ab-tray', cap: 99 }]; }
function abAllPlaced() { return $$('.antigen-slot').every(s => tokensIn(s).length === 1); }
function abUpdate() {
  abCheck.disabled = !abAllPlaced();
}
function buildAbMatch() {
  abSites.innerHTML = ''; abTray.innerHTML = '';
  $('#ab-spread').setAttribute('hidden', ''); $('.bacterium').classList.remove('clumped');
  abHint.textContent = 'Drag each antibody onto the antigen it fits.'; abHint.className = 'tray-hint';
  shuffle(AB_ANTIGENS).forEach(a => {
    const site = document.createElement('div');
    site.className = 'antigen-site';
    site.innerHTML = `<div class="antigen-shape">${shapeMarkup(a.shape)}</div>
      <div class="antigen-slot" data-shape="${a.shape}" aria-label="Antigen with ${a.shape} shape. Drop the matching antibody here."></div>
      <span class="ag-feedback"></span>`;
    abSites.appendChild(site);
    enableZoneKb($('.antigen-slot', site), 1, abUpdate);
  });
  enableZoneKb(abTray, 99, abUpdate);
  shuffle(AB_ANTIBODIES).forEach(a => {
    const tk = makeToken(`${shapeMarkup(a.shape)}<span>Antibody</span>`, { shape: a.shape });
    tk.classList.add('ab-token');
    setupDrag(tk, abZones(), abUpdate);
    abTray.appendChild(tk);
  });
  abUpdate();
}
abCheck.addEventListener('click', () => {
  let allRight = true;
  $$('.antigen-slot').forEach(slot => {
    const tk = tokensIn(slot)[0];
    const right = tk && tk.dataset.shape === slot.dataset.shape;
    slot.classList.toggle('lock-ok', !!right); slot.classList.toggle('lock-no', !right);
    const site = slot.closest('.antigen-site');
    const fb = site ? $('.ag-feedback', site) : null;
    if (right) {
      tk.dataset.locked = '1'; tk.classList.add('locked-ok'); tk.tabIndex = -1;
      if (fb) fb.textContent = 'Complementary shape — locked on.';
    } else {
      allRight = false;
      if (tk) { tk.classList.add('mark-no'); setTimeout(() => tk.classList.remove('mark-no'), 360); }
      if (fb) fb.textContent = 'Not complementary — try another.';
    }
  });
  if (allRight) {
    sFx.chord();
    $('.bacterium').classList.add('clumped');
    const spread = $('#ab-spread'); spread.removeAttribute('hidden');
    const v = $('#ab-spread-val'); v.textContent = 'High'; v.className = 'high';
    setTimeout(() => { v.textContent = 'Low'; v.className = 'low'; }, 900);
    abHint.textContent = 'All antibodies locked on — the microbes clump and spread falls.'; abHint.className = 'tray-hint ok';
    setTimeout(() => showCelebrate('Antibodies locked on!',
      'Each antibody matched its antigen by <strong>complementary shape</strong>. The microbes <strong>clump together (agglutinate)</strong>, which reduces their spread and lets <strong>phagocytes</strong> destroy them more easily.'), 700);
    abCheck.disabled = true;
  } else {
    sFx.no(); abHint.textContent = 'Some antibodies do not fit yet. The shape must be complementary.'; abHint.className = 'tray-hint no';
  }
});
$('#ab-reset').addEventListener('click', buildAbMatch);

// ============================================================
// EXHIBIT II — Phagocytosis
// ============================================================
const phBody = $('#ph-body'), phBact = $('#ph-bact'), phVac = $('#ph-vacuole'), phVes = $('#ph-vesicles'), phProd = $('#ph-products');
const PHAGO_BLOB = 'M205 80 C150 72 112 104 108 150 C72 168 82 214 122 226 C124 272 178 298 216 286 C256 300 306 280 312 240 C346 224 340 168 300 158 C300 110 256 82 216 94 C212 88 209 84 205 80 Z';
phBody.setAttribute('d', PHAGO_BLOB);

const PHAGO_STAGES = [
  { id: 'surround', text: 'A bacterium is surrounded by the phagocyte.' },
  { id: 'engulf', text: 'The bacterium is engulfed by the phagocyte.' },
  { id: 'vacuole', text: 'The bacterium is enclosed within a food vacuole.' },
  { id: 'digest', text: 'Hydrolytic enzymes from vesicles digest the bacterium.' },
  { id: 'release', text: 'The products of digestion are released (excreted).' }
];
// shuffled card text (no numbers): matches the 5 stages above by data-order
const PHAGO_CARDS = [
  { order: 0, text: 'Bacterium surrounded by the phagocyte' },
  { order: 1, text: 'Bacterium engulfed by the phagocyte' },
  { order: 2, text: 'Enclosed within a food vacuole' },
  { order: 3, text: 'Hydrolytic enzymes digest the bacterium' },
  { order: 4, text: 'Products of digestion released / excreted' }
];
const phDots = $('#phago-dots'), phCaption = $('#phago-caption');
for (let i = 0; i < 5; i++) phDots.appendChild(document.createElement('span'));
let phStage = 0, phagoSeqTimers = [];
function clearPhagoTimers() { phagoSeqTimers.forEach(clearTimeout); phagoSeqTimers = []; }

function buildVesicles() {
  phVes.innerHTML = '';
  [[150, 235], [255, 130], [270, 235], [180, 130]].forEach(p => {
    const c = svgEl('circle', { cx: p[0], cy: p[1], r: 8, fill: '#E4B824', stroke: '#B58A12', 'stroke-width': 1.5 });
    c.classList.add('ph-vesicle'); c.style.opacity = '0'; phVes.appendChild(c);
  });
}
buildVesicles();
function applyPhagoStage(n) {
  phStage = clamp(n, 0, 4);
  $$('span', phDots).forEach((d, i) => d.classList.toggle('on', i === phStage));
  $('#phago-prev').disabled = phStage === 0; $('#phago-next').disabled = phStage === 4;
  phCaption.textContent = PHAGO_STAGES[phStage].text;
  // bacterium position/scale per stage
  const bactStates = [
    'translate(-72px,0)',                 // surrounded: at membrane
    'translate(-175px,6px)',              // engulfed: inside
    'translate(-175px,6px)',              // vacuole
    'translate(-175px,6px) scale(0.25)',  // digested (shrinking)
    'translate(-175px,6px) scale(0.25)'   // released
  ];
  phBact.style.transformOrigin = '404px 187px';
  phBact.style.transform = bactStates[phStage];
  phBact.style.opacity = phStage >= 4 ? '0' : (phStage >= 3 ? '0.4' : '1');
  phVac.style.opacity = (phStage === 2 || phStage === 3) ? '1' : '0';
  // vesicles drift to centre on digest
  const ves = $$('.ph-vesicle', phVes);
  ves.forEach(v => {
    if (phStage >= 3) {
      v.style.opacity = phStage === 3 ? '1' : '0';
      v.style.transformOrigin = 'center';
      v.style.transform = `translate(${(230 - parseFloat(v.getAttribute('cx')))}px, ${(187 - parseFloat(v.getAttribute('cy')))}px)`;
    } else { v.style.opacity = '0'; v.style.transform = ''; }
  });
  // products released
  phProd.innerHTML = '';
  if (phStage === 4) {
    for (let i = 0; i < 4; i++) {
      const c = svgEl('circle', { cx: 230, cy: 170 + i * 12, r: 5, fill: '#CFE4F5', stroke: '#2C5C8A', 'stroke-width': 1.2 });
      c.classList.add('ph-product'); phProd.appendChild(c);
      requestAnimationFrame(() => { c.style.transform = `translate(${150 + i * 10}px, ${-30 + i * 16}px)`; c.style.opacity = '0'; });
    }
  }
  phStage === 4 ? sFx.ok() : sFx.tick();
}
$('#phago-prev').addEventListener('click', () => applyPhagoStage(phStage - 1));
$('#phago-next').addEventListener('click', () => applyPhagoStage(phStage + 1));

// the assessed ordering task
const phSlots = $('#phago-slots'), phTray = $('#phago-tray'), phCheck = $('#phago-check'), phHint = $('#phago-hint');
function phZones() { return [{ sel: '.frame', cap: 1 }, { sel: '#phago-tray', cap: 99 }]; }
function phAllPlaced() { return $$('#phago-slots .frame').every(f => tokensIn(f).length === 1); }
function phUpdate() { phCheck.disabled = !phAllPlaced(); }
function buildPhagoOrder() {
  clearPhagoTimers();
  phSlots.innerHTML = ''; phTray.innerHTML = '';
  phHint.textContent = 'Drag each step into a numbered frame.'; phHint.className = 'tray-hint';
  for (let i = 0; i < 5; i++) {
    const f = document.createElement('div');
    f.className = 'frame'; f.setAttribute('aria-label', `Frame ${i + 1} of 5`);
    f.innerHTML = `<span class="frame-num">${i + 1}</span>`;
    phSlots.appendChild(f); enableZoneKb(f, 1, phUpdate);
  }
  enableZoneKb(phTray, 99, phUpdate);
  shuffle(PHAGO_CARDS).forEach(c => {
    const tk = makeToken(esc(c.text), { order: c.order });
    setupDrag(tk, phZones(), phUpdate); phTray.appendChild(tk);
  });
  phUpdate(); applyPhagoStage(0);
}
phCheck.addEventListener('click', () => {
  const frames = $$('#phago-slots .frame'); let allRight = true;
  frames.forEach((f, i) => {
    const tk = tokensIn(f)[0]; const right = tk && Number(tk.dataset.order) === i;
    f.classList.toggle('lock-ok', !!right); f.classList.toggle('lock-no', !right);
    if (right) { tk.dataset.locked = '1'; tk.classList.add('locked-ok'); tk.tabIndex = -1; }
    else { allRight = false; if (tk) { tk.classList.add('mark-no'); setTimeout(() => tk.classList.remove('mark-no'), 360); } }
  });
  if (allRight) {
    sFx.chord(); phHint.textContent = 'Correct order — running the whole process.'; phHint.className = 'tray-hint ok';
    phCheck.disabled = true; runPhagoSequence();
  } else {
    sFx.no(); phHint.textContent = 'Not the right order yet. Use the animation above to study the stages.'; phHint.className = 'tray-hint no';
  }
});
$('#phago-reset').addEventListener('click', buildPhagoOrder);
function runPhagoSequence() {
  clearPhagoTimers();
  let i = 0; applyPhagoStage(0);
  const step = () => {
    if (i < 4) { i++; applyPhagoStage(i); phagoSeqTimers.push(setTimeout(step, reduceMotion() ? 0 : 1400)); }
    else phagoSeqTimers.push(setTimeout(() => showCelebrate('Phagocytosis complete!',
      'You ordered all five stages: the phagocyte <strong>surrounds</strong> and <strong>engulfs</strong> the bacterium, encloses it in a <strong>food vacuole</strong>, <strong>digests</strong> it with hydrolytic enzymes, then releases the products.'), 600));
  };
  phagoSeqTimers.push(setTimeout(step, reduceMotion() ? 0 : 1000));
}

// ============================================================
// EXHIBIT III — Immunity, primary/secondary, vaccination
// ============================================================
const immSvg = $('#imm-svg'), immInfoCard = $('#imm-info');
const IMP = { x0: 64, x1: 524, y0: 44, yb: 320 };          // plot area
const ix = t => IMP.x0 + t * (IMP.x1 - IMP.x0);            // t: 0..1
const iy = v => IMP.yb - v * (IMP.yb - IMP.y0);            // v: 0..1 (antibody level)
const THRESH = 0.42;                                        // immunity threshold (0..1)

const PLATES = {
  active: {
    kicker: 'Active immunity', title: 'The response to infection',
    body: 'After a <strong>first infection</strong> the body makes its own antibodies. The level rises <strong>slowly</strong>, crosses the <strong>immunity threshold</strong>, then declines gently. You are often ill for a few days first.',
    curves: [{ cls: 'primary', pts: [[0, 0.05], [0.12, 0.05], [0.35, 0.22], [0.55, 0.55], [0.7, 0.72], [0.85, 0.7], [1, 0.62]] }],
    flags: [{ t: 0.12, v: 0.05, n: 1 }, { t: 0.55, v: 0.55, n: 2 }, { t: 0.78, v: 0.71, n: 3 }],
    xlabels: [{ t: 0.12, txt: 'infection' }]
  },
  passive: {
    kicker: 'Passive immunity', title: 'Ready-made antibodies',
    body: 'In <strong>passive immunity</strong>, ready-made antibodies are <strong>injected</strong>. The level rises <strong>very quickly</strong> above the threshold, then <strong>falls fast</strong> &mdash; the antibodies are used up and not replaced, so protection is <strong>short-lived</strong>.',
    curves: [{ cls: 'primary', pts: [[0, 0.02], [0.06, 0.02], [0.12, 0.78], [0.2, 0.6], [0.34, 0.28], [0.5, 0.08], [0.7, 0.02], [1, 0.02]] }],
    flags: [{ t: 0.06, v: 0.02, n: 1 }, { t: 0.12, v: 0.78, n: 2 }, { t: 0.4, v: 0.18, n: 3 }],
    xlabels: [{ t: 0.07, txt: 'injection' }]
  },
  primsec: {
    kicker: 'Memory lymphocytes', title: 'Primary vs secondary response',
    body: 'The <strong>first infection</strong> gives a slow, small <strong>primary response</strong>. <strong>Memory lymphocytes</strong> remain for years, so on a <strong>second infection</strong> by the same microbe the <strong>secondary response</strong> is far <strong>faster and larger</strong>.',
    curves: [{ cls: 'primary', pts: [[0, 0.04], [0.1, 0.04], [0.22, 0.24], [0.32, 0.44], [0.4, 0.5], [0.48, 0.4], [0.56, 0.16], [0.6, 0.07], [0.62, 0.06]] },
             { cls: 'secondary', pts: [[0.62, 0.06], [0.66, 0.5], [0.7, 0.86], [0.78, 0.92], [0.9, 0.88], [1, 0.82]] }],
    flags: [{ t: 0.4, v: 0.5, n: 1 }, { t: 0.72, v: 0.9, n: 2 }],
    xlabels: [{ t: 0.1, txt: 'first infection' }, { t: 0.63, txt: 'second infection' }],
    memory: true
  },
  vaccine: {
    kicker: 'Vaccination', title: 'Vaccine and booster',
    body: 'The <strong>initial vaccine</strong> raises antibodies, but the level is <strong>insufficient</strong> &mdash; it does not reach the threshold. A <strong>booster</strong> later produces a large, rapid rise that <strong>exceeds the threshold</strong> and lasts.',
    curves: [{ cls: 'primary', pts: [[0, 0.03], [0.08, 0.03], [0.2, 0.26], [0.3, 0.3], [0.4, 0.2], [0.5, 0.14], [0.55, 0.13]] },
             { cls: 'primary', pts: [[0.55, 0.13], [0.6, 0.5], [0.68, 0.82], [0.78, 0.86], [0.9, 0.82], [1, 0.76]] }],
    flags: [{ t: 0.25, v: 0.3, n: 1 }, { t: 0.55, v: 0.12, n: 2 }, { t: 0.72, v: 0.85, n: 3 }],
    xlabels: [{ t: 0.08, txt: 'initial vaccine' }, { t: 0.55, txt: 'booster' }],
    boosterPulse: true, memory: true
  }
};
let immPlate = 'active', immAnimTimers = [];
function clearImmTimers() { immAnimTimers.forEach(clearTimeout); immAnimTimers = []; }

function drawImmAxes(svg) {
  svg.innerHTML = '';
  // axes with arrowheads
  svg.appendChild(svgEl('line', { class: 'imm-axis', x1: IMP.x0, y1: IMP.yb, x2: IMP.x1 + 8, y2: IMP.yb }));
  svg.appendChild(svgEl('line', { class: 'imm-axis', x1: IMP.x0, y1: IMP.yb, x2: IMP.x0, y2: IMP.y0 - 8 }));
  svg.appendChild(svgEl('polygon', { points: `${IMP.x1 + 8},${IMP.yb} ${IMP.x1},${IMP.yb - 4} ${IMP.x1},${IMP.yb + 4}`, fill: 'rgba(255,255,255,0.55)' }));
  svg.appendChild(svgEl('polygon', { points: `${IMP.x0},${IMP.y0 - 8} ${IMP.x0 - 4},${IMP.y0} ${IMP.x0 + 4},${IMP.y0}`, fill: 'rgba(255,255,255,0.55)' }));
  const yl = svgEl('text', { class: 'imm-axis-label', x: 18, y: (IMP.y0 + IMP.yb) / 2, transform: `rotate(-90 18 ${(IMP.y0 + IMP.yb) / 2})`, 'text-anchor': 'middle' });
  yl.textContent = 'Level of antibody'; svg.appendChild(yl);
  const xl = svgEl('text', { class: 'imm-axis-label', x: (IMP.x0 + IMP.x1) / 2, y: 360, 'text-anchor': 'middle' });
  xl.textContent = 'Time'; svg.appendChild(xl);
  // threshold
  const thr = svgEl('line', { class: 'imm-threshold', id: 'imm-thr', x1: IMP.x0, y1: iy(THRESH), x2: IMP.x1, y2: iy(THRESH) });
  svg.appendChild(thr);
  const tl = svgEl('text', { class: 'imm-threshold-label', x: IMP.x1, y: iy(THRESH) - 6, 'text-anchor': 'end' });
  tl.textContent = 'immunity threshold'; svg.appendChild(tl);
}
function curvePath(pts) {
  // smooth-ish polyline through points (t,v)
  let d = '';
  pts.forEach((p, i) => { d += (i === 0 ? 'M' : 'L') + ix(p[0]).toFixed(1) + ' ' + iy(p[1]).toFixed(1) + ' '; });
  return d;
}
function drawImmPlate(key, animate) {
  immPlate = key; clearImmTimers();
  const P = PLATES[key];
  drawImmAxes(immSvg);
  // x-axis event labels + ticks
  (P.xlabels || []).forEach(xl => {
    immSvg.appendChild(svgEl('line', { class: 'imm-flag-line', x1: ix(xl.t), y1: IMP.yb, x2: ix(xl.t), y2: IMP.yb + 6, stroke: 'rgba(255,255,255,0.6)' }));
    const t = svgEl('text', { class: 'imm-tick-label', x: ix(xl.t), y: IMP.yb + 20, 'text-anchor': 'middle' });
    t.textContent = xl.txt; immSvg.appendChild(t);
  });
  // curves
  const paths = [];
  P.curves.forEach(c => {
    const p = svgEl('path', { class: 'imm-curve ' + c.cls, d: curvePath(c.pts) });
    immSvg.appendChild(p); paths.push(p);
  });
  // flags (numbered points)
  const flagEls = [];
  (P.flags || []).forEach(f => {
    const g = svgEl('g', { opacity: animate ? 0 : 1 });
    g.appendChild(svgEl('circle', { class: 'imm-flag-dot', cx: ix(f.t), cy: iy(f.v), r: 11 }));
    const t = svgEl('text', { class: 'imm-flag-num', x: ix(f.t), y: iy(f.v) + 4 }); t.textContent = f.n;
    g.appendChild(t); immSvg.appendChild(g); flagEls.push(g);
  });
  setInfo(immInfoCard, P);
  if (!animate || reduceMotion()) { flagEls.forEach(g => g.setAttribute('opacity', 1)); if (P.memory) addMemoryY(P, false); return; }
  // animate the curve drawing via stroke-dashoffset
  paths.forEach((p, idx) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
    immAnimTimers.push(setTimeout(() => { p.style.transition = 'stroke-dashoffset 1.5s ease'; p.style.strokeDashoffset = '0'; }, 60 + idx * 900));
  });
  flagEls.forEach((g, i) => immAnimTimers.push(setTimeout(() => { g.style.transition = 'opacity 0.4s'; g.setAttribute('opacity', 1); tone(740 + i * 80, 0.08, 'sine', 0.06); }, 700 + i * 700)));
  if (P.boosterPulse) immAnimTimers.push(setTimeout(() => { const thr = $('#imm-thr', immSvg); if (thr) { thr.classList.add('threshold-pulse'); setTimeout(() => thr.classList.remove('threshold-pulse'), 900); } sFx.low(); }, 1700));
  if (P.memory) immAnimTimers.push(setTimeout(() => addMemoryY(P, true), key === 'vaccine' ? 2300 : 1600));
}
function addMemoryY(P, animate) {
  // memory lymphocyte Y-glyphs streak in toward the big secondary/booster rise
  const tBase = P === PLATES.vaccine ? 0.62 : 0.66;
  [[0.58, 0.7], [0.6, 0.85], [0.64, 0.6]].forEach((m, i) => {
    const u = document.createElementNS(SVGNS, 'use');
    u.setAttribute('href', '#sym-antibody'); u.setAttribute('class', 'imm-memory');
    u.setAttribute('x', ix(m[0]) - 9); u.setAttribute('y', iy(m[1]) - 9);
    u.setAttribute('width', 18); u.setAttribute('height', 20);
    u.setAttribute('stroke', '#E4B824');
    if (animate && !reduceMotion()) { u.style.opacity = '0'; u.style.transform = 'translateY(30px)'; u.style.transition = 'opacity 0.5s, transform 0.6s';
      setTimeout(() => { u.style.opacity = '0.95'; u.style.transform = 'none'; }, i * 130); }
    immSvg.appendChild(u);
  });
}
$$('#imm-explore .plate-btn').forEach(b => b.addEventListener('click', () => {
  $$('#imm-explore .plate-btn').forEach(x => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
  drawImmPlate(b.dataset.plate, true);
}));
$('#imm-replay').addEventListener('click', () => drawImmPlate(immPlate, true));
$('#imm-compare-btn').addEventListener('click', () => {
  const panel = $('#imm-compare'), btn = $('#imm-compare-btn');
  const open = panel.hasAttribute('hidden');
  panel.toggleAttribute('hidden', !open); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
});

// ----- view toggle: explore vs read -----
$$('#panel-immunity [data-view3]').forEach(b => b.addEventListener('click', () => {
  const v = b.dataset.view3;
  $$('#panel-immunity [data-view3]').forEach(x => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
  $('#imm-explore').toggleAttribute('hidden', v !== 'explore');
  $('#imm-read').toggleAttribute('hidden', v !== 'read');
  if (v === 'read') buildReadGraph();
}));

// ----- Read the graph (assessed) -----
const READ_POINTS = [
  { n: 1, t: 0.25, v: 0.3, correct: 'Initial vaccine: antibody level is insufficient (below the threshold)' },
  { n: 2, t: 0.55, v: 0.12, correct: 'Booster given to raise the antibody level again' },
  { n: 3, t: 0.72, v: 0.85, correct: 'Level now exceeds the immunity threshold' },
  { n: 4, t: THRESH, v: THRESH, correct: 'Immunity threshold: the level needed for protection', onAxisRight: true }
];
const READ_DECOYS = ['Ready-made antibodies injected', 'Passive immunity: short-lived protection'];
const immReadSvg = $('#imm-read-svg'), immReadSlots = $('#imm-read-slots'), immReadTray = $('#imm-read-tray'), immReadCheck = $('#imm-read-check'), immReadHint = $('#imm-read-hint');
function readZones() { return [{ sel: '.rs-drop', cap: 1 }, { sel: '#imm-read-tray', cap: 99 }]; }
function readAllPlaced() { return $$('#imm-read-slots .rs-drop').every(s => tokensIn(s).length === 1); }
function readUpdate() { immReadCheck.disabled = !readAllPlaced(); }
function buildReadGraph() {
  // draw the vaccine curve, fully shown, with numbered flags
  drawImmAxes(immReadSvg);
  const P = PLATES.vaccine;
  (P.xlabels || []).forEach(xl => {
    immReadSvg.appendChild(svgEl('line', { class: 'imm-flag-line', x1: ix(xl.t), y1: IMP.yb, x2: ix(xl.t), y2: IMP.yb + 6, stroke: 'rgba(255,255,255,0.6)' }));
    const t = svgEl('text', { class: 'imm-tick-label', x: ix(xl.t), y: IMP.yb + 20, 'text-anchor': 'middle' }); t.textContent = xl.txt; immReadSvg.appendChild(t);
  });
  P.curves.forEach(c => immReadSvg.appendChild(svgEl('path', { class: 'imm-curve primary', d: curvePath(c.pts) })));
  READ_POINTS.forEach(f => {
    const g = svgEl('g', {});
    g.appendChild(svgEl('circle', { class: 'imm-flag-dot', cx: ix(f.t), cy: iy(f.v), r: 12 }));
    const t = svgEl('text', { class: 'imm-flag-num', x: ix(f.t), y: iy(f.v) + 4 }); t.textContent = f.n; g.appendChild(t);
    immReadSvg.appendChild(g);
  });
  // slots
  immReadSlots.innerHTML = '';
  READ_POINTS.forEach(f => {
    const s = document.createElement('div');
    s.className = 'read-slot'; s.dataset.n = f.n;
    s.innerHTML = `<span class="rs-num">${f.n}</span><div class="rs-drop" aria-label="Label for point ${f.n}"></div>`;
    immReadSlots.appendChild(s); enableZoneKb($('.rs-drop', s), 1, readUpdate);
  });
  // tokens (correct labels + decoys), shuffled
  immReadTray.innerHTML = '';
  enableZoneKb(immReadTray, 99, readUpdate);
  const labels = READ_POINTS.map(f => ({ text: f.correct, n: f.n })).concat(READ_DECOYS.map(d => ({ text: d, n: 0 })));
  shuffle(labels).forEach(l => { const tk = makeToken(esc(l.text), { n: l.n }); setupDrag(tk, readZones(), readUpdate); immReadTray.appendChild(tk); });
  immReadHint.textContent = 'Drag each label onto the matching numbered point.'; immReadHint.className = 'tray-hint';
  readUpdate();
}
immReadCheck.addEventListener('click', () => {
  let allRight = true;
  $$('#imm-read-slots .read-slot').forEach(s => {
    const tk = tokensIn($('.rs-drop', s))[0]; const right = tk && Number(tk.dataset.n) === Number(s.dataset.n);
    s.classList.toggle('lock-ok', !!right); s.classList.toggle('lock-no', !right);
    if (right) { tk.dataset.locked = '1'; tk.classList.add('locked-ok'); tk.tabIndex = -1; }
    else { allRight = false; if (tk) { tk.classList.add('mark-no'); setTimeout(() => tk.classList.remove('mark-no'), 360); } }
  });
  if (allRight) { sFx.chord(); immReadHint.textContent = 'All labels correct — you can read a vaccination graph!'; immReadHint.className = 'tray-hint ok'; immReadCheck.disabled = true; }
  else { sFx.no(); immReadHint.textContent = 'Some labels are in the wrong place. Look again at where each point sits on the curve.'; immReadHint.className = 'tray-hint no'; }
});
$('#imm-read-reset').addEventListener('click', buildReadGraph);

// ============================================================
// EXHIBIT IV — Antibiotic resistance
// ============================================================
const resSvg = $('#res-svg'), resColony = $('#res-colony'), resWash = $('#res-wash');
const resGo = $('#res-go'), resPct = $('#res-pct'), resStepLabel = $('#res-step-label'), resInfoCard = $('#res-info');
const RES_INFO = [
  { kicker: 'Natural selection', title: 'A chance mutation', body: 'Most of these bacteria are killed by antibiotics, but a few carry a <strong>chance mutation</strong> that makes them <strong>resistant</strong>. You cannot tell which by looking. Press <strong>Add the antibiotic</strong>.' },
  { kicker: 'Selection', title: 'The non-resistant die', body: 'The antibiotic <strong>kills the non-resistant</strong> bacteria. Only the <strong>resistant</strong> ones survive (now marked in gold). This is <strong>natural selection</strong>.' },
  { kicker: 'Reproduction', title: 'Survivors multiply', body: 'With less competition, the resistant survivors <strong>reproduce and pass on</strong> the resistance gene. Resistance can also spread between bacteria on <strong>plasmids</strong>.' },
  { kicker: 'A superbug', title: 'A resistant strain', body: 'Over time the <strong>whole population is resistant</strong> &mdash; a <strong>superbug</strong> such as <strong>MRSA</strong>, which resists most antibiotics and is hard to treat, especially in hospitals.' }
];
let resCells = [], resStep = 0;
const RES_TOTAL = 22, RES_RESISTANT = 3;
function cellShape() {
  // visual only; ALL bacteria look identical until the antibiotic reveal (integrity)
  const g = svgEl('g', { class: 'res-cell' });
  const e = svgEl('ellipse', { cx: 0, cy: 0, rx: 13, ry: 7, fill: '#9B8BE0', stroke: '#5B43B8', 'stroke-width': 1.6, transform: 'rotate(-20)' });
  const p = svgEl('path', { d: 'M11 4 q9 4 4 11', fill: 'none', stroke: '#5B43B8', 'stroke-width': 1.4 });
  const r = svgEl('circle', { class: 'tag-ring', cx: 0, cy: 0, r: 17 });
  g.appendChild(e); g.appendChild(p); g.appendChild(r);
  return g;
}
// Position the cell on a WRAPPER <g> (attribute transform) and animate only the
// inner cell with CSS transform, so the two transforms don't fight.
function placeCell(x, y, opts = {}) {
  const wrap = svgEl('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
  const cell = cellShape();
  if (opts.born) cell.classList.add('born');
  if (opts.tagged) cell.classList.add('tagged');
  if (opts.jitter) {
    cell.classList.add('jitter');
    cell.style.setProperty('--jx', (Math.random() * 6 - 3).toFixed(1) + 'px');
    cell.style.setProperty('--jy', (Math.random() * 6 - 3).toFixed(1) + 'px');
    cell.style.setProperty('--jdur', (2 + Math.random() * 2).toFixed(1) + 's');
  }
  wrap.appendChild(cell); resColony.appendChild(wrap);
  return cell;
}
function scatterPositions(n) {
  const pos = []; const cx = 210, cy = 150, rx = 168, ry = 116;
  for (let i = 0; i < n; i++) {
    let x, y, ok = false, tries = 0;
    while (!ok && tries < 60) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
      x = cx + Math.cos(a) * rx * r * 0.92; y = cy + Math.sin(a) * ry * r * 0.92;
      ok = pos.every(p => Math.hypot(p.x - x, p.y - y) > 30); tries++;
    }
    pos.push({ x, y });
  }
  return pos;
}
function buildColony() {
  resColony.innerHTML = ''; resCells = [];
  const idx = shuffle([...Array(RES_TOTAL).keys()]).slice(0, RES_RESISTANT);
  const resistantSet = new Set(idx);
  const pos = scatterPositions(RES_TOTAL);
  pos.forEach((p, i) => {
    const resistant = resistantSet.has(i);
    const cell = placeCell(p.x, p.y, { jitter: true });
    resCells.push({ el: cell, resistant, x: p.x, y: p.y });
  });
}
function setResStep(n) {
  resStep = n;
  resStepLabel.textContent = `Step ${n + 1} of 4`;
  setInfo(resInfoCard, RES_INFO[n]);
}
function resetRes() {
  resStep = 0; setResStep(0);
  buildColony();
  resPct.textContent = Math.round(RES_RESISTANT / RES_TOTAL * 100) + '%';
  resGo.textContent = 'Add the antibiotic'; resGo.disabled = false;
}
function pctTween(from, to, ms) {
  const t0 = performance.now();
  const tick = now => { const k = clamp((now - t0) / ms, 0, 1); resPct.textContent = Math.round(from + (to - from) * k) + '%';
    if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
resGo.addEventListener('click', () => {
  if (resStep === 0) {
    // apply antibiotic: kill non-resistant
    resGo.disabled = true; resWash.classList.add('washing'); setTimeout(() => resWash.classList.remove('washing'), 1200); sFx.low();
    resCells.forEach((c, i) => {
      c.el.classList.remove('jitter');
      if (!c.resistant) setTimeout(() => c.el.classList.add('dying'), 300 + (i % 6) * 70);
      else setTimeout(() => c.el.classList.add('tagged'), 700);
    });
    pctTween(Math.round(RES_RESISTANT / RES_TOTAL * 100), 100, 1400);
    setTimeout(() => { resPct.textContent = '100%'; setResStep(1); resGo.textContent = 'Let them multiply'; resGo.disabled = false; }, 1500);
  } else if (resStep === 1) {
    // multiply survivors
    resGo.disabled = true; sFx.tick();
    const survivors = resCells.filter(c => c.resistant);
    const pos = scatterPositions(RES_TOTAL);
    let made = 0;
    pos.forEach((p, i) => {
      if (i < survivors.length) return; // keep existing survivors
      setTimeout(() => placeCell(p.x, p.y, { born: true, tagged: true }), made * 90); made++;
    });
    setTimeout(() => { setResStep(2); resGo.textContent = 'Reveal the superbug'; resGo.disabled = false; }, made * 90 + 400);
  } else if (resStep === 2) {
    resGo.disabled = true; sFx.chord(); setResStep(3);
    // MRSA stamp
    const stamp = svgEl('g', { id: 'res-stamp', opacity: 0 });
    stamp.appendChild(svgEl('rect', { x: 120, y: 120, width: 180, height: 60, rx: 10, fill: 'none', stroke: '#e74c3c', 'stroke-width': 4 }));
    const stampText = svgEl('text', { x: 210, y: 158, 'text-anchor': 'middle', fill: '#e74c3c', 'font-family': 'Georgia, serif', 'font-weight': 700, 'font-size': 30 });
    stampText.textContent = 'MRSA'; stamp.appendChild(stampText);
    resSvg.appendChild(stamp);
    requestAnimationFrame(() => { stamp.style.transition = 'opacity 0.5s, transform 0.5s'; stamp.style.transformOrigin = '210px 150px'; stamp.style.transform = 'scale(1.05)'; stamp.setAttribute('opacity', 1); });
    setTimeout(() => showCelebrate('A superbug is born',
      'Through <strong>natural selection</strong>, the resistant survivors multiplied until the <strong>whole population is resistant</strong> &mdash; a superbug like <strong>MRSA</strong>. This is why we must not overuse antibiotics.'), 800);
    resGo.textContent = 'Done';
  }
});
$('#res-reset').addEventListener('click', resetRes);

// view toggle
$$('#panel-resistance [data-view4]').forEach(b => b.addEventListener('click', () => {
  const v = b.dataset.view4;
  $$('#panel-resistance [data-view4]').forEach(x => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
  $('#res-sim').toggleAttribute('hidden', v !== 'sim');
  $('#res-advice').toggleAttribute('hidden', v !== 'advice');
}));

// viral gate
$$('#res-gate .gate-btn').forEach(b => b.addEventListener('click', () => {
  const correct = b.dataset.gate === 'no';
  $$('#res-gate .gate-btn').forEach(x => { x.disabled = true; });
  b.classList.add(correct ? 'correct' : 'wrong');
  if (!correct) $('.gate-btn[data-gate="no"]').classList.add('correct');
  const fb = $('#res-gate-fb'); fb.removeAttribute('hidden');
  fb.className = 'gate-feedback ' + (correct ? 'ok' : 'no');
  fb.innerHTML = correct
    ? '<strong>Correct.</strong> A cold is caused by a <strong>virus</strong>, and <strong>antibiotics have no effect on viruses</strong>. Using them here would not help and would speed up resistance.'
    : '<strong>Not quite.</strong> A cold is caused by a <strong>virus</strong>. <strong>Antibiotics have no effect on viruses</strong> &mdash; they only treat bacterial infections. Overusing them speeds up resistance.';
  correct ? sFx.ok() : sFx.no();
}));

// advice sort
const ADVICE = [
  { text: 'Always finish the full course of antibiotics', bin: 'slows' },
  { text: 'Only take antibiotics a doctor has prescribed', bin: 'slows' },
  { text: 'Use good hygiene and hand sanitiser in hospitals', bin: 'slows' },
  { text: 'Isolate patients infected with a superbug', bin: 'slows' },
  { text: 'Stop taking antibiotics as soon as you feel better', bin: 'speeds' },
  { text: 'Take antibiotics for a cough or cold', bin: 'speeds' },
  { text: 'Use antibiotics widely on farm animals', bin: 'speeds' }
];
const adviceTray = $('#res-advice-tray'), adviceCheck = $('#res-advice-check'), adviceHint = $('#res-advice-hint');
function adviceZones() { return [{ sel: '.bin-drop', cap: 99 }, { sel: '#res-advice-tray', cap: 99 }]; }
function adviceAllPlaced() { return tokensIn(adviceTray).length === 0; }
function adviceUpdate() { adviceCheck.disabled = !adviceAllPlaced(); }
function buildAdvice() {
  adviceTray.innerHTML = ''; $$('#res-bins .bin-drop').forEach(d => d.innerHTML = '');
  $$('#res-bins .bin').forEach(b => b.classList.remove('lock-ok', 'lock-no'));
  $$('#res-bins .bin-drop').forEach(d => enableZoneKb(d, 99, adviceUpdate));
  enableZoneKb(adviceTray, 99, adviceUpdate);
  shuffle(ADVICE).forEach(a => { const tk = makeToken(esc(a.text), { bin: a.bin }); setupDrag(tk, adviceZones(), adviceUpdate); adviceTray.appendChild(tk); });
  adviceHint.textContent = 'Drag each one into a bin.'; adviceHint.className = 'tray-hint';
  adviceUpdate();
}
adviceCheck.addEventListener('click', () => {
  let allRight = true;
  $$('#res-bins .bin').forEach(bin => {
    tokensIn($('.bin-drop', bin)).forEach(tk => {
      const right = tk.dataset.bin === bin.dataset.bin;
      if (right) { tk.dataset.locked = '1'; tk.classList.add('locked-ok'); tk.tabIndex = -1; }
      else { allRight = false; tk.classList.add('mark-no'); setTimeout(() => tk.classList.remove('mark-no'), 360); }
    });
  });
  if (allRight) { sFx.chord(); adviceHint.textContent = 'All sorted correctly — that is how we slow resistance.'; adviceHint.className = 'tray-hint ok'; adviceCheck.disabled = true; }
  else { sFx.no(); adviceHint.textContent = 'Some are in the wrong bin. Move them and check again.'; adviceHint.className = 'tray-hint no'; }
});
$('#res-advice-reset').addEventListener('click', buildAdvice);

// ============================================================
// EXHIBIT V — Examination Room (cold assessment)
// ============================================================
const EXAM_BANK = [
  { ex: 'Antibodies', q: 'Which TWO types of white blood cell help defend the body against disease?', opts: ['Lymphocytes and phagocytes', 'Red blood cells and platelets', 'Lymphocytes and red blood cells', 'Phagocytes and platelets'], a: 0, fb: 'Lymphocytes produce antibodies; phagocytes engulf and digest microbes.' },
  { ex: 'Antibodies', q: 'What are the foreign chemicals on the surface of a microorganism called?', opts: ['Antigens', 'Antibodies', 'Enzymes', 'Memory cells'], a: 0, fb: 'Antigens are the foreign markers a lymphocyte recognises as non-self.' },
  { ex: 'Antibodies', q: 'Why does each antibody only work against one antigen?', opts: ['Its shape is complementary to that one antigen', 'It is the same size as the microbe', 'It is made of the same material as the antigen', 'It is produced by phagocytes'], a: 0, fb: 'An antibody has a specific shape complementary to one antigen — a lock-and-key fit.' },
  { ex: 'Antibodies', q: 'What do antibodies make microorganisms do, which reduces their spread?', opts: ['Clump together (agglutinate)', 'Reproduce faster', 'Produce more antigens', 'Move more quickly'], a: 0, fb: 'Antibodies cause clumping (agglutination), reducing spread and helping phagocytes destroy them.' },
  { ex: 'Phagocytosis', q: 'What is the correct order of phagocytosis?', opts: [
      'Surround → engulf → enclose in vacuole → digest with enzymes → release products',
      'Engulf → surround → digest with enzymes → enclose in vacuole → release products',
      'Digest with enzymes → engulf → surround → release products → enclose in vacuole',
      'Surround → enclose in vacuole → engulf → release products → digest with enzymes'], a: 0, fb: 'Surrounded → engulfed → enclosed in a food vacuole → digested by hydrolytic enzymes → products released.' },
  { ex: 'Phagocytosis', q: 'What digests the bacterium once it is inside the phagocyte?', opts: ['Hydrolytic enzymes from vesicles', 'Antibodies', 'Antigens', 'Memory lymphocytes'], a: 0, fb: 'Hydrolytic enzymes from vesicles inside the phagocyte digest and destroy the microbe.' },
  { ex: 'Immunity', q: 'Give a feature of PASSIVE immunity.', opts: ['It is fast-acting but short-lived', 'It is slow but long-lasting', 'The body makes its own antibodies', 'It always uses a vaccine'], a: 0, fb: 'Passive immunity injects ready-made antibodies: fast-acting but short-lived (no memory cells).' },
  { ex: 'Immunity', q: 'How does the secondary response differ from the primary response?', opts: ['It produces more antibodies, much faster', 'It is slower and smaller', 'It does not use lymphocytes', 'It only happens with passive immunity'], a: 0, fb: 'Memory lymphocytes make many antibodies very quickly on re-infection — faster and larger.' },
  { ex: 'Immunity', q: 'What is a booster vaccination?', opts: ['A follow-up vaccine that raises antibody levels back above the threshold', 'The very first dose of a vaccine', 'An injection of ready-made antibodies', 'A dose of antibiotics'], a: 0, fb: 'A booster tops up antibody and memory-lymphocyte levels so they stay above the immunity threshold.' },
  { ex: 'Immunity', q: 'A vaccine contains…', opts: ['Dead or modified pathogens that still carry antigens', 'Ready-made antibodies', 'Live, fully active pathogens', 'Antibiotics'], a: 0, fb: 'Vaccines use dead or modified pathogens that still carry antigens, so the body makes antibodies and memory cells.' },
  { ex: 'Resistance', q: 'Antibiotic resistance in bacteria is an example of…', opts: ['Natural selection', 'Passive immunity', 'Phagocytosis', 'Blood clotting'], a: 0, fb: 'Resistant bacteria survive the antibiotic and reproduce — natural selection.' },
  { ex: 'Resistance', q: 'Which of these will help SLOW the spread of antibiotic resistance?', opts: ['Always finishing the full course of antibiotics', 'Taking antibiotics for a cold', 'Stopping antibiotics as soon as you feel better', 'Using antibiotics widely on farms'], a: 0, fb: 'Finishing the course kills all the bacteria, so fewer survive to become resistant.' },
  { ex: 'Resistance', q: 'Why will antibiotics NOT treat a cold or the flu?', opts: ['Colds and flu are caused by viruses, and antibiotics have no effect on viruses', 'Colds are not really infections', 'Antibiotics only work on large microbes', 'The dose would be too small'], a: 0, fb: 'Antibiotics treat bacterial infections only — they have no effect on viruses.' },
  { ex: 'Resistance', q: 'What is a "superbug" such as MRSA?', opts: ['A bacterium resistant to most antibiotics', 'A very large virus', 'A type of white blood cell', 'A vaccine ingredient'], a: 0, fb: 'A superbug is a bacterium, like MRSA, that resists most antibiotics — a serious problem in hospitals.' }
];
const EXAM_N = 10;
let examQs = [], examIdx = 0, examScore = 0, examAnswered = false, examTally = {};
const examIntro = $('#exam-intro'), examBody = $('#exam-body'), examResult = $('#exam-result');
const examProgress = $('#exam-progress'), examScoreEl = $('#exam-score'), examBar = $('#exam-bar');
const examQWrap = $('#exam-question-wrap'), examFeedback = $('#exam-feedback'), examNext = $('#exam-next');

function startExam() {
  examQs = shuffle(EXAM_BANK).slice(0, Math.min(EXAM_N, EXAM_BANK.length));
  examIdx = 0; examScore = 0; examAnswered = false; examTally = {};
  examScoreEl.textContent = '0';
  examIntro.setAttribute('hidden', ''); examResult.setAttribute('hidden', ''); examBody.removeAttribute('hidden');
  renderExamQ();
}
function renderExamQ() {
  examAnswered = false;
  const item = examQs[examIdx];
  examProgress.textContent = `Question ${examIdx + 1} of ${examQs.length}`;
  examBar.style.width = (examIdx / examQs.length * 100) + '%';
  examFeedback.setAttribute('hidden', ''); examFeedback.className = 'quiz-feedback';
  examNext.setAttribute('hidden', ''); examNext.textContent = examIdx === examQs.length - 1 ? 'See your result' : 'Next question';
  const correctText = item.opts[item.a];
  examQWrap.innerHTML = `<p class="quiz-question">${esc(item.q)}</p><div class="quiz-options" id="exam-options"></div>`;
  const optsEl = $('#exam-options');
  shuffle(item.opts).forEach(opt => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'quiz-option';
    btn.innerHTML = `<span>${esc(opt)}</span><span class="opt-mark" aria-hidden="true"></span>`;
    btn.addEventListener('click', () => answerExam(btn, opt === correctText, correctText, item));
    optsEl.appendChild(btn);
  });
}
function answerExam(btn, isCorrect, correctText, item) {
  if (examAnswered) return; examAnswered = true;
  examTally[item.ex] = examTally[item.ex] || { right: 0, total: 0 };
  examTally[item.ex].total++;
  $$('#exam-options .quiz-option').forEach(o => {
    o.disabled = true; const txt = o.querySelector('span').textContent;
    if (txt === correctText) { o.classList.add('correct'); o.querySelector('.opt-mark').textContent = '✓'; }
    else if (o === btn) { o.classList.add('wrong'); o.querySelector('.opt-mark').textContent = '✗'; }
    else o.classList.add('muted');
  });
  if (isCorrect) { examScore++; examScoreEl.textContent = String(examScore); examTally[item.ex].right++; sFx.ok();
    examFeedback.classList.add('ok'); examFeedback.innerHTML = `<strong>Correct.</strong> ${esc(item.fb)}`; }
  else { sFx.no(); examFeedback.classList.add('no'); examFeedback.innerHTML = `<strong>Not quite.</strong> ${esc(item.fb)}`; }
  examFeedback.removeAttribute('hidden');
  examBar.style.width = ((examIdx + 1) / examQs.length * 100) + '%';
  examNext.removeAttribute('hidden'); examNext.focus();
}
examNext.addEventListener('click', () => { if (examIdx < examQs.length - 1) { examIdx++; renderExamQ(); } else showExamResult(); });
function showExamResult() {
  examBody.setAttribute('hidden', ''); examResult.removeAttribute('hidden');
  const n = examQs.length, pct = Math.round(examScore / n * 100);
  let rank;
  if (pct >= 80) rank = 'Director of Immunology';
  else if (pct >= 60) rank = 'Curator of Immunology';
  else if (pct >= 40) rank = 'Student of Immunology';
  else rank = 'Gallery Visitor';
  $('#exam-rank').textContent = rank;
  $('#exam-result-score').textContent = `You scored ${examScore} out of ${n} (${pct}%).`;
  const bd = $('#exam-breakdown'); bd.innerHTML = '';
  ['Antibodies', 'Phagocytosis', 'Immunity', 'Resistance'].forEach(ex => {
    const t = examTally[ex]; if (!t) return;
    const d = document.createElement('div'); d.className = 'bd-item';
    d.innerHTML = `<span class="bd-name">${ex}</span><span class="bd-val">${t.right}/${t.total}</span>`;
    bd.appendChild(d);
  });
  const weak = Object.keys(examTally).filter(k => examTally[k].right < examTally[k].total);
  $('#exam-revision').innerHTML = weak.length
    ? `<strong>Worth another look:</strong> ${weak.join(', ')}. Revisit those exhibits, then take the examination again to raise your rank.`
    : 'A perfect sweep across every exhibit. You have mastered the body&rsquo;s defences.';
  if (pct >= 60) sFx.chord();
}
$('#exam-start').addEventListener('click', startExam);
$('#exam-retry').addEventListener('click', startExam);

// ============================================================
// CELEBRATE overlay + global
// ============================================================
function showCelebrate(title, body) {
  $('#celebrate-title').textContent = title; $('#celebrate-body').innerHTML = body;
  $('#celebrate').removeAttribute('hidden');
}
$('#celebrate-close').addEventListener('click', () => $('#celebrate').setAttribute('hidden', ''));
document.addEventListener('selectstart', e => { if (document.body.classList.contains('dragging-active')) e.preventDefault(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('#celebrate').setAttribute('hidden', ''); kbClear(); } });

// ============================================================
// INIT
// ============================================================
buildAbMatch();
buildPhagoOrder();
applyPhagoStage(0);
drawImmPlate('active', false);
resetRes();
buildAdvice();
