/* ============================================================
   Intro to Islam — Year 10 RE mid-lesson progress check
   ------------------------------------------------------------
   Three tasks on one page:
     1. Drag definitions into slots (any slot accepts any card,
        free swap before Check) → "Check answers" reveals score
     2. Click the image of the Kaaba — ONE attempt only; wrong
        click locks red and the correct one auto-reveals green
     3. Drag-and-drop timeline → "Check my order" locks each
        card green (correct) or red (wrong)
   Overall total (X / 9) appears in the header once all three
   tasks have been checked.
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

const POINTS_TASK1 = 3;
const POINTS_TASK2 = 1;
const POINTS_TASK3 = 5;
const POINTS_TOTAL = POINTS_TASK1 + POINTS_TASK2 + POINTS_TASK3;

// ---------- State ----------

const state = {
  task1Placed: 0,        // how many def-cards currently sit in slots
  task1Checked: false,
  task1Score: 0,

  task2Done: false,
  task2Score: 0,

  task3Checked: false,
  task3Score: 0,

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

function shuffleEnsuringChange(arr, keyFn = (x) => x) {
  if (arr.length <= 1) return arr.slice();
  let attempts = 0;
  while (attempts < 30) {
    const candidate = shuffle(arr);
    const same = candidate.every((v, i) => keyFn(v) === keyFn(arr[i]));
    if (!same) return candidate;
    attempts++;
  }
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

// ---------- Audio ----------

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

function playSnapTick() {
  playTone(520, 0.05, 'sine', 0.06);
}

function playCelebration() {
  [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.45, 'sine', 0.10), i * 120);
  });
}

// ============================================================
//   Shared Pointer drag engine (used by Task 1 & Task 3)
// ============================================================

const TAP_THRESHOLD_PX = 6;

function attachDragHandlers(card, opts) {
  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerCancel);
  card.dataset.kind = opts.kind;
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const card = e.currentTarget;
  // After Check has been pressed for the relevant task, cards are locked
  if (card.dataset.kind === 'def' && state.task1Checked) return;
  if (card.dataset.kind === 'event' && state.task3Checked) return;
  // Suppress the browser's native text selection while dragging so the
  // page doesn't get highlighted blue as the cursor sweeps across it.
  e.preventDefault();
  document.body.classList.add('dragging-active');
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
    resetInline(card);
  } else {
    const target = dropTargetUnder(e.clientX, e.clientY, state.pointer.kind);
    handleDrop(card, target, state.pointer.kind);
  }

  try { card.releasePointerCapture(e.pointerId); } catch (_) {}
  document.body.classList.remove('dragging-active');
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
  document.body.classList.remove('dragging-active');
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
    target.classList.add('drop-hover');
  }
  if (kind === 'event' && target.classList.contains('timeline-slot')) {
    target.classList.add('drop-hover');
  }
}

function clearHighlights() {
  document.querySelectorAll('.drop-hover').forEach(e => e.classList.remove('drop-hover'));
}

// ---- Drop handling ----

function handleDrop(card, target, kind) {
  if (kind === 'def') return handleDefDrop(card, target);
  if (kind === 'event') return handleEventDrop(card, target);
}

// ============================================================
//   TASK 1 — Match definitions (place-then-check)
// ============================================================

const defTray = document.getElementById('def-tray');
const matchBoard = document.getElementById('match-board');
const task1Status = document.getElementById('task1-status');
const checkMatchingBtn = document.getElementById('check-matching');

function buildTask1() {
  defTray.innerHTML = '';
  matchBoard.querySelectorAll('.term-slot').forEach(s => {
    s.classList.remove('filled', 'drop-hover', 'drop-wrong-flash');
    s.innerHTML = '';
  });

  state.task1Placed = 0;
  state.task1Checked = false;
  state.task1Score = 0;
  checkMatchingBtn.hidden = true;
  checkMatchingBtn.disabled = false;
  checkMatchingBtn.textContent = 'Check answers';
  checkMatchingBtn.classList.remove('complete');

  const order = shuffleEnsuringChange(DEFINITIONS, d => d.id);
  for (const d of order) {
    const card = el('div', {
      className: 'def-card',
      attrs: { 'data-def': d.id, 'role': 'button', 'tabindex': '0', 'aria-label': `Definition: ${d.text}. Drag onto the term you think it matches.` },
      text: d.text
    });
    attachDragHandlers(card, { kind: 'def' });
    defTray.appendChild(card);
  }

  updateTask1Status();
}

function updateTask1Status() {
  if (state.task1Checked) {
    task1Status.textContent = `${state.task1Score} / ${POINTS_TASK1} correct`;
    task1Status.classList.toggle('done', state.task1Score === POINTS_TASK1);
    task1Status.classList.toggle('partial', state.task1Score > 0 && state.task1Score < POINTS_TASK1);
    task1Status.classList.toggle('zero', state.task1Score === 0);
  } else {
    task1Status.textContent = `${state.task1Placed} / 3 placed`;
    task1Status.classList.remove('done', 'partial', 'zero');
  }
  // Show the Check button only when all 3 cards are placed AND not yet checked
  checkMatchingBtn.hidden = !(state.task1Placed === 3 && !state.task1Checked);
}

function handleDefDrop(card, target) {
  // Dropped on the tray (or off-board) → return to origin
  if (!target || target.id === 'def-tray') {
    returnToOrigin(card);
    return;
  }
  // target is a .term-slot
  const existing = target.querySelector('.def-card');
  const originParent = state.pointer.originParent;
  const originIsSlot = originParent && originParent.classList && originParent.classList.contains('term-slot');

  if (existing && existing !== card) {
    // Swap: move the existing card to wherever the dragged one came from
    if (originIsSlot) {
      originParent.appendChild(existing);
    } else {
      defTray.appendChild(existing);
    }
  }

  resetInline(card);
  target.innerHTML = '';
  target.appendChild(card);
  target.classList.add('filled');
  card.classList.add('placed', 'snap-in');
  setTimeout(() => card.classList.remove('snap-in'), 360);

  // If the source slot is now empty, mark it un-filled
  if (originIsSlot && originParent !== target) {
    if (!originParent.querySelector('.def-card')) {
      originParent.classList.remove('filled');
    }
  }

  recomputeTask1Placed();
  playSnapTick();
}

function recomputeTask1Placed() {
  state.task1Placed = matchBoard.querySelectorAll('.term-slot .def-card').length;
  updateTask1Status();
}

checkMatchingBtn.addEventListener('click', () => {
  if (state.task1Checked) return;
  let correct = 0;
  matchBoard.querySelectorAll('.term-slot').forEach(slot => {
    const card = slot.querySelector('.def-card');
    if (!card) return;
    const isRight = card.dataset.def === slot.dataset.term;
    if (isRight) {
      card.classList.add('marked-correct');
      correct += 1;
    } else {
      card.classList.add('marked-wrong');
    }
    card.classList.remove('placed');   // strip the neutral placed look
  });
  state.task1Score = correct;
  state.task1Checked = true;
  checkMatchingBtn.hidden = true;
  if (correct === POINTS_TASK1) playCelebration();
  else playCorrectChime();
  updateTask1Status();
  updateTotalScore();
});

// ============================================================
//   TASK 2 — Click the Kaaba (single attempt)
// ============================================================

const imageRow = document.getElementById('image-row');
const task2Status = document.getElementById('task2-status');

function buildTask2() {
  imageRow.innerHTML = '';
  state.task2Done = false;
  state.task2Score = 0;
  task2Status.classList.remove('done', 'zero');
  task2Status.textContent = 'Pick one';

  const order = shuffle(IMAGES);
  for (const img of order) {
    const wrapper = el('div', {
      className: 'image-choice',
      attrs: { 'data-id': img.id, 'role': 'radio', 'tabindex': '0', 'aria-checked': 'false', 'aria-label': `${img.caption}. ${img.alt}. Select if you think this is the Kaaba.` }
    });
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
    state.task2Score = POINTS_TASK2;
    task2Status.textContent = 'Correct';
    task2Status.classList.add('done');
    playCorrectChime();
  } else {
    wrapper.classList.add('chosen-wrong-locked');
    tick.textContent = 'Incorrect';
    state.task2Score = 0;
    task2Status.textContent = 'Incorrect';
    task2Status.classList.add('zero');
    // Auto-reveal the actual Kaaba so the pupil sees the right answer
    const kaabaWrapper = imageRow.querySelector('.image-choice[data-id="kaaba"]');
    if (kaabaWrapper) {
      kaabaWrapper.classList.add('reveal-answer');
      const kt = kaabaWrapper.querySelector('.tick');
      if (kt) kt.textContent = 'This was the Kaaba';
    }
    playWrongBuzz();
  }

  state.task2Done = true;
  // Lock all choices
  imageRow.querySelectorAll('.image-choice').forEach(c => {
    if (c !== wrapper && !c.classList.contains('reveal-answer')) c.classList.add('locked');
    c.setAttribute('tabindex', '-1');
  });
  updateTotalScore();
}

// ============================================================
//   TASK 3 — Timeline (drag to reorder, then Check)
// ============================================================

const timelineEl = document.getElementById('timeline');
const task3Status = document.getElementById('task3-status');
const checkBtn = document.getElementById('check-timeline');

function buildTask3() {
  timelineEl.innerHTML = '';
  state.task3Checked = false;
  state.task3Score = 0;
  task3Status.classList.remove('done', 'partial', 'zero');
  task3Status.textContent = 'Drag to reorder';
  checkBtn.disabled = false;
  checkBtn.classList.remove('complete');
  checkBtn.textContent = 'Check my order';

  const order = shuffleEnsuringChange(TIMELINE_EVENTS, e => e.order);
  for (let i = 0; i < order.length; i++) {
    const slot = el('li', { className: 'timeline-slot', attrs: { 'data-slot-index': String(i) } });
    const card = el('div', {
      className: 'event-card',
      attrs: { 'data-order': String(order[i].order), 'role': 'listitem', 'tabindex': '0', 'aria-label': `Timeline event: ${order[i].text}` },
      text: order[i].text
    });
    attachDragHandlers(card, { kind: 'event' });
    slot.appendChild(card);
    timelineEl.appendChild(slot);
  }
}

function handleEventDrop(card, target) {
  if (!target || !target.classList.contains('timeline-slot')) {
    returnToOrigin(card);
    return;
  }

  const existing = target.querySelector('.event-card');
  const originSlot = state.pointer.originParent && state.pointer.originParent.classList && state.pointer.originParent.classList.contains('timeline-slot')
    ? state.pointer.originParent
    : null;

  if (existing && existing !== card) {
    if (originSlot) {
      originSlot.appendChild(existing);
    } else {
      target.parentElement.insertBefore(existing, target);
    }
  }

  resetInline(card);
  target.appendChild(card);
  card.classList.add('snap-in');
  setTimeout(() => card.classList.remove('snap-in'), 360);
  playSnapTick();
}

checkBtn.addEventListener('click', () => {
  if (state.task3Checked) return;
  const slots = timelineEl.querySelectorAll('.timeline-slot');
  let correct = 0;
  slots.forEach((slot, i) => {
    const card = slot.querySelector('.event-card');
    if (!card) return;
    if (Number(card.dataset.order) === i + 1) {
      card.classList.add('correct');
      correct += 1;
    } else {
      card.classList.add('marked-wrong');
    }
  });
  state.task3Score = correct;
  state.task3Checked = true;
  task3Status.textContent = `${correct} / ${POINTS_TASK3} correct`;
  task3Status.classList.toggle('done', correct === POINTS_TASK3);
  task3Status.classList.toggle('partial', correct > 0 && correct < POINTS_TASK3);
  task3Status.classList.toggle('zero', correct === 0);
  if (correct === POINTS_TASK3) {
    checkBtn.textContent = 'Perfect order!';
    checkBtn.classList.add('complete');
    playCelebration();
  } else {
    checkBtn.textContent = 'Checked';
    checkBtn.disabled = true;
    playWrongBuzz();
  }
  updateTotalScore();
});

// ============================================================
//   Overall total score
// ============================================================

const totalScoreEl = document.getElementById('total-score');

function updateTotalScore() {
  // Only show the total once all three tasks have been checked
  if (state.task1Checked && state.task2Done && state.task3Checked) {
    const total = state.task1Score + state.task2Score + state.task3Score;
    totalScoreEl.textContent = `Total: ${total} / ${POINTS_TOTAL}`;
    totalScoreEl.hidden = false;
    totalScoreEl.classList.toggle('all-correct', total === POINTS_TOTAL);
  } else {
    totalScoreEl.hidden = true;
  }
}

// ============================================================
//   Model answers reveal (Task 3) — one toggle button per event
// ============================================================

const eventAnswer = document.getElementById('event-answer');
const modelButtons = document.querySelectorAll('.model-buttons .reveal-btn');

modelButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.dataset.target);
    if (!panel) return;
    const opening = panel.hidden;
    panel.hidden = !opening;
    btn.classList.toggle('shown', opening);
    btn.setAttribute('aria-expanded', String(opening));
    if (opening) playCorrectChime();
  });
});

function resetModelAnswers() {
  document.querySelectorAll('.model-answer-group .model-answer').forEach(p => { p.hidden = true; });
  modelButtons.forEach(b => {
    b.classList.remove('shown');
    b.setAttribute('aria-expanded', 'false');
  });
}

// ============================================================
//   Reset all
// ============================================================

document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('kaaba-answer').value = '';
  eventAnswer.value = '';
  buildTask1();
  buildTask2();
  buildTask3();
  resetModelAnswers();
  updateTotalScore();
});

// ============================================================
//   Init
// ============================================================

buildTask1();
buildTask2();
buildTask3();
updateTotalScore();
