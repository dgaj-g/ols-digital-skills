/* ============================================================
   Intro to Islam — Year 10 RE mid-lesson progress check
   ------------------------------------------------------------
   Three tasks on one page:
     1. Drag definitions onto the matching key term
     2. Click the image of the Kaaba (from 3 choices) + textarea
     3. Drag-and-drop timeline of Muhammad's life + textarea
   Works on mouse + touch via Pointer Events.
   ============================================================ */

// ---------- Data ----------

const DEFINITIONS = [
  { id: "allah",  term: "Allah",  text: "Arabic name for God" },
  { id: "islam",  term: "Islam",  text: "Submission to God" },
  { id: "arabic", term: "Arabic", text: "Language of the Qur’an" }
];

const IMAGES = [
  { id: "kaaba",  src: "elements/kaaba.jpg",            alt: "A large black cube draped in cloth with gold embroidery, surrounded by pilgrims",                  isAnswer: true,  caption: "Photo A" },
  { id: "dome",   src: "elements/dome-of-the-rock.jpg", alt: "A gold-domed octagonal building decorated with blue tile mosaics, set on a stone plaza in Jerusalem", isAnswer: false, caption: "Photo B" },
  { id: "hindu",  src: "elements/hindu-temple.jpg",     alt: "A colourful South Indian temple with tiered carved towers (gopurams) beside a temple tank",          isAnswer: false, caption: "Photo C" }
];

const TIMELINE_EVENTS = [
  { order: 1, text: "Birth in Mecca" },
  { order: 2, text: "First revelation from the angel Gabriel" },
  { order: 3, text: "Muhammad flees to Medina" },
  { order: 4, text: "Conquest of Mecca" },
  { order: 5, text: "Death of Muhammad" }
];

// ---------- State ----------

const state = {
  task1Placed: 0,
  task2Done: false,
  task3Placed: 0,
  task3Complete: false,
  pointer: { id: null, startX: 0, startY: 0, kind: null, dragged: null, originParent: null, originNextSibling: null, moved: false, startTime: 0 },
  audioCtx: null
};

// ---------- Utilities ----------

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ensure a shuffled copy is actually different from the original order
function shuffleEnsuringChange(arr, keyFn = (x) => x) {
  if (arr.length <= 1) return arr.slice();
  let attempts = 0;
  while (attempts < 30) {
    const candidate = shuffle(arr);
    const same = candidate.every((v, i) => keyFn(v) === keyFn(arr[i]));
    if (!same) return candidate;
    attempts++;
  }
  // Fallback: swap first two
  const fallback = arr.slice();
  [fallback[0], fallback[1]] = [fallback[1], fallback[0]];
  return fallback;
}

function el(tag, opts = {}) {
  const e = document.createElement(tag);
  if (opts.className) e.className = opts.className;
  if (opts.text) e.textContent = opts.text;
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) e.setAttribute(k, v);
  return e;
}

// ---------- Audio (tiny Web Audio cues) ----------

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

function playCorrectChime() {
  playTone(660, 0.10, 'sine', 0.10);
  setTimeout(() => playTone(990, 0.12, 'sine', 0.10), 70);
}

function playWrongBuzz() {
  playTone(180, 0.10, 'square', 0.06);
}

function playCelebration() {
  [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.45, 'sine', 0.10), i * 120);
  });
}

// ============================================================
//   Shared Pointer drag engine
// ============================================================

const TAP_THRESHOLD_PX = 6;

function attachDragHandlers(card, opts) {
  // opts: { kind: 'def' | 'event' }
  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerCancel);
  card.dataset.kind = opts.kind;
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const card = e.currentTarget;
  if (card.classList.contains('placed') || card.classList.contains('correct')) return;
  try { card.setPointerCapture(e.pointerId); } catch (_) {}
  state.pointer.id = e.pointerId;
  state.pointer.startX = e.clientX;
  state.pointer.startY = e.clientY;
  state.pointer.dragged = card;
  state.pointer.kind = card.dataset.kind;
  state.pointer.originParent = card.parentElement;
  state.pointer.originNextSibling = card.nextSibling;
  state.pointer.moved = false;
  state.pointer.startTime = Date.now();
}

function onPointerMove(e) {
  if (e.pointerId !== state.pointer.id || !state.pointer.dragged) return;
  const card = state.pointer.dragged;
  const dx = e.clientX - state.pointer.startX;
  const dy = e.clientY - state.pointer.startY;

  if (!state.pointer.moved && Math.hypot(dx, dy) > TAP_THRESHOLD_PX) {
    state.pointer.moved = true;
    // Lift to fixed-position on the body for unconstrained dragging
    const r = card.getBoundingClientRect();
    card.classList.add('dragging');
    card.style.width = r.width + 'px';
    card.style.height = r.height + 'px';
    card.style.position = 'fixed';
    card.style.left = r.left + 'px';
    card.style.top = r.top + 'px';
    card.style.margin = '0';
    document.body.appendChild(card);
    state.pointer.startX = e.clientX;
    state.pointer.startY = e.clientY;
  }

  if (state.pointer.moved) {
    card.style.transform = `translate(${e.clientX - state.pointer.startX}px, ${e.clientY - state.pointer.startY}px) scale(1.04) rotate(-1deg)`;
    highlightDropTarget(e.clientX, e.clientY, state.pointer.kind, card);
  }
}

function onPointerUp(e) {
  if (e.pointerId !== state.pointer.id || !state.pointer.dragged) return;
  const card = state.pointer.dragged;
  const wasDrag = state.pointer.moved;

  clearHighlights();

  if (!wasDrag) {
    // simple tap with no drag — no action other than reset (slot was never left)
    resetInline(card);
  } else {
    const target = dropTargetUnder(e.clientX, e.clientY, state.pointer.kind);
    handleDrop(card, target, state.pointer.kind);
  }

  try { card.releasePointerCapture(e.pointerId); } catch (_) {}
  state.pointer.id = null;
  state.pointer.dragged = null;
  state.pointer.kind = null;
  state.pointer.moved = false;
}

function onPointerCancel(e) {
  if (e.pointerId !== state.pointer.id || !state.pointer.dragged) return;
  const card = state.pointer.dragged;
  returnToOrigin(card);
  clearHighlights();
  state.pointer.id = null;
  state.pointer.dragged = null;
  state.pointer.kind = null;
  state.pointer.moved = false;
}

function resetInline(card) {
  card.classList.remove('dragging');
  card.style.transform = '';
  card.style.position = '';
  card.style.left = '';
  card.style.top = '';
  card.style.margin = '';
  card.style.width = '';
  card.style.height = '';
}

function returnToOrigin(card) {
  resetInline(card);
  const { originParent, originNextSibling } = state.pointer;
  if (originParent) {
    if (originNextSibling && originNextSibling.parentElement === originParent) {
      originParent.insertBefore(card, originNextSibling);
    } else {
      originParent.appendChild(card);
    }
  }
  card.classList.add('bounce-back');
  setTimeout(() => card.classList.remove('bounce-back'), 340);
}

// ---- Drop target lookup ----

function dropTargetUnder(x, y, kind) {
  const els = document.elementsFromPoint(x, y);
  if (kind === 'def') {
    for (const e of els) {
      if (e.classList && e.classList.contains('term-slot')) return e;
      if (e.id === 'def-tray') return e;
    }
  } else if (kind === 'event') {
    for (const e of els) {
      if (e.classList && e.classList.contains('timeline-slot')) return e;
    }
  }
  return null;
}

function highlightDropTarget(x, y, kind, card) {
  clearHighlights();
  const target = dropTargetUnder(x, y, kind);
  if (!target) return;
  if (kind === 'def' && target.classList.contains('term-slot')) {
    if (!target.classList.contains('filled')) target.classList.add('drop-hover');
  }
  if (kind === 'event' && target.classList.contains('timeline-slot')) {
    target.classList.add('drop-hover');
  }
}

function clearHighlights() {
  document.querySelectorAll('.drop-hover').forEach(e => e.classList.remove('drop-hover'));
}

// ---- Drop handling per task ----

function handleDrop(card, target, kind) {
  if (kind === 'def') return handleDefDrop(card, target);
  if (kind === 'event') return handleEventDrop(card, target);
}

// ============================================================
//   TASK 1 — Matching definitions
// ============================================================

const defTray = document.getElementById('def-tray');
const matchBoard = document.getElementById('match-board');
const task1Status = document.getElementById('task1-status');

function buildTask1() {
  defTray.innerHTML = '';
  // Reset slots
  matchBoard.querySelectorAll('.term-slot').forEach(s => {
    s.classList.remove('filled', 'drop-hover', 'drop-wrong-flash');
    s.innerHTML = '';
  });

  // Shuffle definition cards so the order isn't trivially matching the terms
  const order = shuffleEnsuringChange(DEFINITIONS, d => d.id);
  for (const d of order) {
    const card = el('div', { className: 'def-card', attrs: { 'data-def': d.id, 'role': 'button', 'tabindex': '0', 'aria-label': `Definition: ${d.text}. Drag onto the matching key term.` }, text: d.text });
    attachDragHandlers(card, { kind: 'def' });
    defTray.appendChild(card);
  }

  state.task1Placed = 0;
  updateTask1Status();
}

function updateTask1Status() {
  task1Status.textContent = `${state.task1Placed} / 3`;
  if (state.task1Placed === 3) task1Status.classList.add('done');
  else task1Status.classList.remove('done');
}

function handleDefDrop(card, target) {
  // If dropped back on the tray (or no valid target), return to origin
  if (!target || target.id === 'def-tray') {
    returnToOrigin(card);
    return;
  }
  // target is a .term-slot
  const wantedTerm = target.dataset.term;
  const cardTerm = card.dataset.def;
  if (target.classList.contains('filled')) {
    returnToOrigin(card);
    playWrongBuzz();
    return;
  }
  if (wantedTerm !== cardTerm) {
    // Wrong slot — flash red, bounce back
    target.classList.add('drop-wrong-flash');
    setTimeout(() => target.classList.remove('drop-wrong-flash'), 480);
    returnToOrigin(card);
    playWrongBuzz();
    return;
  }
  // Correct — snap into the slot
  resetInline(card);
  target.innerHTML = '';
  target.classList.add('filled');
  target.appendChild(card);
  card.classList.add('placed', 'snap-in');
  card.setAttribute('aria-disabled', 'true');
  setTimeout(() => card.classList.remove('snap-in'), 360);
  state.task1Placed += 1;
  updateTask1Status();
  playCorrectChime();
  if (state.task1Placed === 3) {
    setTimeout(playCelebration, 250);
  }
}

// ============================================================
//   TASK 2 — Click the Kaaba
// ============================================================

const imageRow = document.getElementById('image-row');
const task2Status = document.getElementById('task2-status');

function buildTask2() {
  imageRow.innerHTML = '';
  state.task2Done = false;
  task2Status.classList.remove('done');
  task2Status.textContent = 'Not yet';

  const order = shuffle(IMAGES);
  for (const img of order) {
    const wrapper = el('div', { className: 'image-choice', attrs: { 'data-id': img.id, 'role': 'radio', 'tabindex': '0', 'aria-checked': 'false', 'aria-label': `${img.caption}. ${img.alt}. Select if you think this is the Kaaba.` } });
    const imgEl = el('img', { attrs: { src: img.src, alt: img.alt, loading: 'lazy' } });
    const tick = el('div', { className: 'tick', text: 'Tap to select' });
    wrapper.appendChild(imgEl);
    wrapper.appendChild(tick);
    wrapper.addEventListener('click', () => handleImageChoice(wrapper, img));
    wrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleImageChoice(wrapper, img);
      }
    });
    imageRow.appendChild(wrapper);
  }
}

function handleImageChoice(wrapper, img) {
  if (state.task2Done) return;
  const tick = wrapper.querySelector('.tick');
  if (img.isAnswer) {
    wrapper.classList.add('chosen-correct');
    wrapper.setAttribute('aria-checked', 'true');
    tick.textContent = 'Correct — this is the Kaaba';
    state.task2Done = true;
    task2Status.textContent = 'Correct';
    task2Status.classList.add('done');
    imageRow.querySelectorAll('.image-choice').forEach(c => {
      if (c !== wrapper) c.classList.add('locked');
      c.setAttribute('tabindex', '-1');
    });
    playCorrectChime();
  } else {
    wrapper.classList.add('chosen-wrong');
    tick.textContent = 'Not quite — try again';
    playWrongBuzz();
    // Let the pupil try another after the shake animation; clear after 1.2s
    setTimeout(() => {
      wrapper.classList.remove('chosen-wrong');
      tick.textContent = 'Tap to select';
    }, 1200);
  }
}

// ============================================================
//   TASK 3 — Timeline (drag to reorder)
// ============================================================

const timelineEl = document.getElementById('timeline');
const task3Status = document.getElementById('task3-status');
const checkBtn = document.getElementById('check-timeline');

function buildTask3() {
  timelineEl.innerHTML = '';
  state.task3Placed = 0;
  state.task3Complete = false;
  task3Status.classList.remove('done');
  task3Status.textContent = '0 / 5 in place';
  checkBtn.disabled = false;
  checkBtn.classList.remove('complete');
  checkBtn.textContent = 'Check my order';

  // Jumble the events (must not be in correct order)
  const order = shuffleEnsuringChange(TIMELINE_EVENTS, e => e.order);
  for (let i = 0; i < order.length; i++) {
    const slot = el('li', { className: 'timeline-slot', attrs: { 'data-slot-index': String(i) } });
    const card = el('div', { className: 'event-card', attrs: { 'data-order': String(order[i].order), 'role': 'listitem', 'tabindex': '0', 'aria-label': `Timeline event: ${order[i].text}` }, text: order[i].text });
    attachDragHandlers(card, { kind: 'event' });
    slot.appendChild(card);
    timelineEl.appendChild(slot);
  }
}

function handleEventDrop(card, target) {
  // Drop must be onto a .timeline-slot
  if (!target || !target.classList.contains('timeline-slot')) {
    returnToOrigin(card);
    return;
  }

  // Find current occupant of the target slot
  const existing = target.querySelector('.event-card');
  const originSlot = state.pointer.originParent && state.pointer.originParent.classList && state.pointer.originParent.classList.contains('timeline-slot')
    ? state.pointer.originParent
    : null;

  if (existing && existing !== card) {
    // Swap: place existing back into the origin slot
    if (originSlot) {
      originSlot.appendChild(existing);
    } else {
      // origin wasn't a slot — should not happen, but fall back
      target.parentElement.insertBefore(existing, target);
    }
  }

  resetInline(card);
  target.appendChild(card);
  card.classList.add('snap-in');
  setTimeout(() => card.classList.remove('snap-in'), 360);

  updateTask3Progress();
}

function updateTask3Progress() {
  // Count how many slots have the card whose data-order matches its slot index+1
  const slots = timelineEl.querySelectorAll('.timeline-slot');
  let correct = 0;
  slots.forEach((slot, i) => {
    const card = slot.querySelector('.event-card');
    if (card && Number(card.dataset.order) === i + 1) correct += 1;
  });
  state.task3Placed = correct;
  task3Status.textContent = `${correct} / 5 in place`;
  if (correct === 5) {
    task3Status.classList.add('done');
  } else {
    task3Status.classList.remove('done');
  }
}

checkBtn.addEventListener('click', () => {
  const slots = timelineEl.querySelectorAll('.timeline-slot');
  let correct = 0;
  slots.forEach((slot, i) => {
    const card = slot.querySelector('.event-card');
    if (!card) return;
    card.classList.remove('correct', 'wrong-flash');
    if (Number(card.dataset.order) === i + 1) {
      card.classList.add('correct');
      correct += 1;
    } else {
      card.classList.add('wrong-flash');
      setTimeout(() => card.classList.remove('wrong-flash'), 500);
    }
  });
  if (correct === 5) {
    checkBtn.textContent = 'Perfect order!';
    checkBtn.classList.add('complete');
    state.task3Complete = true;
    playCelebration();
  } else {
    playWrongBuzz();
  }
});

// ============================================================
//   Reset all
// ============================================================

document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('kaaba-answer').value = '';
  document.getElementById('event-answer').value = '';
  buildTask1();
  buildTask2();
  buildTask3();
});

// ============================================================
//   Init
// ============================================================

buildTask1();
buildTask2();
buildTask3();
