/* ============================================================
   Effects of Exercise — Sports Science revision quiz
   ------------------------------------------------------------
   Multi-mode revision: click (multiple choice), drag (sort +
   match via Pointer Events), type (key word), listen (Web
   Speech API reads the clue aloud).
   Self-contained: no build step, no external deps, file:// safe.
   Content sourced from "Effects of Exercise" (I. McAteer),
   CCEA A2.2 — The Application of Science to Sports Performance.
   ============================================================ */

// ----- 1. Question bank -----
// Every fact traces to the source presentation.
// type: 'mc' | 'type' | 'sort' | 'match' | 'listen-mc' | 'listen-type'

const QUESTIONS = [
  {
    system: "general", type: "mc",
    prompt: "Which of these is a benefit of regular exercise on the respiratory system?",
    options: ["Improved lung capacity", "Lower blood cholesterol", "Increased bone density", "A stronger heart muscle"],
    answer: 0,
    explain: "Exercise strengthens the muscles used in breathing, increasing lung capacity so it is easier to take in oxygen. The other three are benefits — but to the cardiovascular and skeletal systems."
  },
  {
    system: "general", type: "type",
    prompt: "Exercise releases mood-boosting chemicals that can reduce stress, anxiety and depression. What are they?",
    accept: ["endorphins", "endorphin"],
    display: "Endorphins",
    explain: "Endorphins are released during exercise and lift mood, which is why regular activity supports good mental health."
  },
  {
    system: "cardiovascular", type: "mc",
    prompt: "What is the name for the narrowing of blood vessels?",
    options: ["Vasoconstriction", "Vasodilation", "Angiogenesis", "Bradycardia"],
    answer: 0,
    explain: "Vasoconstriction is the narrowing of blood vessels. It happens quickly in response to cold or stress, reducing blood flow to the periphery and directing it to vital organs."
  },
  {
    system: "cardiovascular", type: "sort",
    prompt: "Sort each cardiovascular change — is it a short-term response, or a long-term adaptation?",
    buckets: ["Short-term response", "Long-term adaptation"],
    items: [
      { text: "Heart rate rises rapidly as adrenaline is released", bucket: 0 },
      { text: "Blood flow is redirected to the working muscles", bucket: 0 },
      { text: "Stroke volume rises during the session", bucket: 0 },
      { text: "Cardiac hypertrophy — the heart muscle enlarges", bucket: 1 },
      { text: "New capillaries form around muscles (angiogenesis)", bucket: 1 },
      { text: "A lower resting heart rate (bradycardia)", bucket: 1 }
    ],
    explain: "Short-term responses happen instantly and reverse after exercise — heart rate, blood redistribution and stroke volume. Long-term adaptations build over weeks: a larger heart, more capillaries and a lower resting heart rate."
  },
  {
    system: "cardiovascular", type: "type",
    prompt: "The widening of blood vessels — increasing blood flow to the muscles and skin during exercise — is called what?",
    accept: ["vasodilation", "vasodilatation"],
    display: "Vasodilation",
    explain: "Vasodilation widens the blood vessels, raising blood flow to muscles and skin to deliver oxygen and release heat. Over time it improves cardiovascular health."
  },
  {
    system: "cardiovascular", type: "listen-mc",
    prompt: "Listen to the clue, then choose the correct term.",
    clue: "A lower than normal resting heart rate. It is a long-term adaptation and a sign of an efficient, well-trained heart.",
    options: ["Bradycardia", "Vasodilation", "Hypertrophy", "Tidal volume"],
    answer: 0,
    explain: "Bradycardia is a lower resting heart rate. Training makes the heart more efficient, so it needs fewer beats to pump the same volume of blood."
  },
  {
    system: "cardiovascular", type: "mc",
    prompt: "What does 'cardiac output' measure?",
    options: ["The total volume of blood pumped per minute", "The volume of blood pumped per beat", "The number of red blood cells in the blood", "The pressure of blood on the artery walls"],
    answer: 0,
    explain: "Cardiac output is the total blood pumped per minute. (Blood pumped per beat is stroke volume.) During exercise it rises through increases in both heart rate and stroke volume."
  },
  {
    system: "respiratory", type: "mc",
    prompt: "Which of these is a LONG-TERM adaptation of the respiratory system to training?",
    options: ["Hypertrophy of the diaphragm and intercostal muscles", "Increased breathing rate", "Increased tidal volume", "Faster removal of carbon dioxide"],
    answer: 0,
    explain: "Long term, the breathing muscles (diaphragm and intercostals) grow larger and stronger. The other three are short-term responses within a single session."
  },
  {
    system: "respiratory", type: "type",
    prompt: "The volume of air breathed in and out with each breath — which increases during exercise — is called what? (Two words.)",
    accept: ["tidal volume", "tidal"],
    display: "Tidal volume",
    explain: "Tidal volume is the air moved per breath. It increases during exercise so more oxygen is taken in with each breath."
  },
  {
    system: "respiratory", type: "listen-type",
    prompt: "Listen to the clue, then type the term.",
    clue: "These receptors in the brain and blood vessels monitor oxygen and carbon dioxide levels, and regulate your breathing.",
    accept: ["chemoreceptors", "chemoreceptor"],
    display: "Chemoreceptors",
    explain: "Chemoreceptors detect rising carbon dioxide (and falling oxygen) and trigger faster, deeper breathing."
  },
  {
    system: "respiratory", type: "sort",
    prompt: "Sort each respiratory change — short-term response, or long-term adaptation?",
    buckets: ["Short-term response", "Long-term adaptation"],
    items: [
      { text: "Increased breathing rate and depth", bucket: 0 },
      { text: "Increased tidal volume", bucket: 0 },
      { text: "Hypertrophy of the diaphragm and intercostals", bucket: 1 },
      { text: "Better blood supply to the breathing muscles", bucket: 1 }
    ],
    explain: "During exercise you breathe faster and deeper (short term). Over weeks of training, the breathing muscles grow and gain a richer blood supply (long term)."
  },
  {
    system: "skeletal", type: "mc",
    prompt: "Synovial fluid is produced faster during exercise. What is its job?",
    options: ["It lubricates the joints", "It strengthens the bones", "It carries oxygen to the muscles", "It stores calcium"],
    answer: 0,
    explain: "Synovial fluid lubricates the joints. More of it during exercise allows smoother movement and a greater range of motion."
  },
  {
    system: "skeletal", type: "sort",
    prompt: "Sort each skeletal change — short-term response, or long-term adaptation?",
    buckets: ["Short-term response", "Long-term adaptation"],
    items: [
      { text: "More synovial fluid lubricating the joints", bucket: 0 },
      { text: "Greater joint flexibility as tissues warm up", bucket: 0 },
      { text: "Increased bone density from calcium deposition", bucket: 1 },
      { text: "Stronger, thicker tendons and ligaments", bucket: 1 }
    ],
    explain: "Short term, joints become more mobile and flexible as fluid and warmth increase. Long term, bones grow denser and tendons and ligaments grow stronger."
  },
  {
    system: "skeletal", type: "type",
    prompt: "Bone cells that build new, denser bone during remodelling — increasing bone strength — are called what?",
    accept: ["osteoblasts", "osteoblast"],
    display: "Osteoblasts",
    explain: "Osteoblasts build new, denser bone. Weight-bearing exercise stresses the bone, triggering remodelling and increasing bone strength."
  },
  {
    system: "muscular", type: "mc",
    prompt: "Short, intense exercise produces ATP mainly through which process?",
    options: ["Anaerobic glycolysis", "Aerobic respiration", "Angiogenesis", "Bone remodelling"],
    answer: 0,
    explain: "Short bursts of intense activity rely on anaerobic glycolysis to make ATP quickly. It is fast, but produces lactate and leads to fatigue."
  },
  {
    system: "muscular", type: "match",
    prompt: "Drag each muscle fibre type onto its description.",
    pairs: [
      { desc: "Slow to fatigue, but produces less force", label: "Type I" },
      { desc: "Intermediate fibre, used for moderate-intensity activity", label: "Type IIa" },
      { desc: "Generates the most force, but fatigues quickly", label: "Type IIb" }
    ],
    explain: "Type I (slow-twitch) resist fatigue but are weaker. Type IIb (fast-twitch) are the most powerful but tire fastest. Type IIa sit in between."
  },
  {
    system: "muscular", type: "type",
    prompt: "Glycolysis produces a substance that builds up in the muscle, causing fatigue and a temporary drop in pH. What is it?",
    accept: ["lactate", "lactic acid", "lactic"],
    display: "Lactate",
    explain: "Lactate (lactic acid) accumulates during anaerobic exercise, lowering pH and contributing to muscle fatigue."
  },
  {
    system: "muscular", type: "listen-type",
    prompt: "Listen to the clue, then type the term. (Two words.)",
    clue: "The body's extra need for oxygen after intense exercise — used to restore energy stores and clear the lactate that has built up.",
    accept: ["oxygen debt", "oxygen deficit", "epoc"],
    display: "Oxygen debt",
    explain: "Oxygen debt is the extra oxygen the body needs after exercise to recover — restoring energy stores and clearing lactate."
  },
  {
    system: "muscular", type: "mc",
    prompt: "Long-term resistance training increases the size of muscle fibres. What is this called?",
    options: ["Hypertrophy", "Atrophy", "Angiogenesis", "Glycolysis"],
    answer: 0,
    explain: "Hypertrophy is the increase in muscle fibre size from greater protein synthesis and new myofibrils, making muscles larger and stronger."
  }
];

const SYSTEM_LABEL = {
  general: "General", cardiovascular: "Cardiovascular",
  respiratory: "Respiratory", skeletal: "Skeletal", muscular: "Muscular"
};
const MODE_LABEL = {
  mc: "Click", type: "Type", sort: "Drag", match: "Drag",
  "listen-mc": "Listen", "listen-type": "Listen"
};
const MODE_CLASS = {
  mc: "mode-click", type: "mode-type", sort: "mode-drag", match: "mode-drag",
  "listen-mc": "mode-listen", "listen-type": "mode-listen"
};

// ----- 2. State -----

const state = {
  idx: 0,
  score: 0,
  answeredCount: 0,
  answered: false,
  locked: false,
  missed: [],
  pointer: { id: null, startX: 0, startY: 0, moved: false, startTime: 0 },
  dragging: null
};

// ----- 3. DOM refs -----

const $ = (id) => document.getElementById(id);
const startScreen = $("start-screen");
const questionScreen = $("question-screen");
const resultsScreen = $("results-screen");
const scoreEl = $("score");
const totalEl = $("total");
const progressFill = $("progress-fill");
const systemChip = $("system-chip");
const modeChip = $("mode-chip");
const qCounter = $("q-counter");
const qPrompt = $("q-prompt");
const listenBar = $("listen-bar");
const listenBtn = $("listen-btn");
const textToggle = $("text-toggle");
const listenText = $("listen-text");
const answerArea = $("answer-area");
const feedback = $("feedback");
const feedbackHead = $("feedback-head");
const feedbackExplain = $("feedback-explain");
const checkBtn = $("check-btn");
const nextBtn = $("next-btn");

totalEl.textContent = QUESTIONS.length;
$("results-total").textContent = QUESTIONS.length;

// ----- 4. Flow -----

$("start-btn").addEventListener("click", startQuiz);
$("again-btn").addEventListener("click", () => { resetQuiz(); startQuiz(); });
$("restart-btn").addEventListener("click", () => { resetQuiz(); startQuiz(); });
nextBtn.addEventListener("click", goNext);

function resetQuiz() {
  state.idx = 0; state.score = 0; state.answeredCount = 0;
  state.answered = false; state.locked = false; state.missed = [];
  scoreEl.textContent = "0";
  progressFill.style.width = "0";
}

function startQuiz() {
  startScreen.hidden = true;
  resultsScreen.hidden = true;
  questionScreen.hidden = false;
  showQuestion();
}

function goNext() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  state.idx += 1;
  if (state.idx >= QUESTIONS.length) {
    showResults();
  } else {
    showQuestion();
  }
}

function showQuestion() {
  const q = QUESTIONS[state.idx];
  state.answered = false;
  state.locked = false;
  state.dragging = null;

  systemChip.textContent = SYSTEM_LABEL[q.system];
  systemChip.dataset.system = q.system;
  modeChip.textContent = MODE_LABEL[q.type];
  modeChip.className = "mode-chip " + MODE_CLASS[q.type];
  qCounter.textContent = `Question ${state.idx + 1} of ${QUESTIONS.length}`;
  qPrompt.textContent = q.prompt;

  feedback.hidden = true;
  feedback.className = "feedback";
  nextBtn.hidden = true;
  checkBtn.hidden = true;
  answerArea.innerHTML = "";

  // Listen bar
  const isListen = q.type === "listen-mc" || q.type === "listen-type";
  listenBar.hidden = !isListen;
  if (isListen) {
    listenText.textContent = q.clue;
    listenText.hidden = true;
    textToggle.setAttribute("aria-expanded", "false");
    textToggle.textContent = "Show text";
    listenBtn.classList.remove("playing");
  }

  // Render answer UI
  if (q.type === "mc" || q.type === "listen-mc") renderMC(q);
  else if (q.type === "type" || q.type === "listen-type") renderType(q);
  else if (q.type === "sort") renderSort(q);
  else if (q.type === "match") renderMatch(q);
}

// ----- 5. Multiple choice (click) -----

function renderMC(q) {
  const wrap = document.createElement("div");
  wrap.className = "options";
  wrap.setAttribute("role", "list");
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.textContent = opt;
    btn.setAttribute("role", "listitem");
    btn.addEventListener("click", () => {
      if (state.answered) return;
      gradeMC(q, i, wrap);
    });
    wrap.appendChild(btn);
  });
  answerArea.appendChild(wrap);
}

function gradeMC(q, chosen, wrap) {
  const correct = chosen === q.answer;
  const buttons = wrap.querySelectorAll(".option");
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) { b.classList.add("correct"); b.innerHTML = b.textContent + ' <span class="tick">&#10003;</span>'; }
    else if (i === chosen) { b.classList.add("wrong"); b.innerHTML = b.textContent + ' <span class="tick">&#10007;</span>'; }
  });
  finishQuestion(q, correct, q.options[q.answer]);
}

// ----- 6. Type answer -----

function renderType(q) {
  const row = document.createElement("div");
  row.className = "type-row";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "type-input";
  input.setAttribute("autocomplete", "off");
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("aria-label", "Type your answer");
  input.placeholder = "Type your answer…";
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); if (!state.answered) gradeType(q, input); }
  });
  row.appendChild(input);
  answerArea.appendChild(row);

  checkBtn.hidden = false;
  checkBtn.disabled = false;
  checkBtn.textContent = "Check";
  checkBtn.onclick = () => { if (!state.answered) gradeType(q, input); };
  setTimeout(() => input.focus(), 50);
}

function normalise(s) {
  return String(s).toLowerCase().trim()
    .replace(/[.,!?;:'"()\-]/g, " ")
    .replace(/\s+/g, " ");
}

function gradeType(q, input) {
  const given = normalise(input.value);
  if (!given) { input.focus(); return; }
  const correct = q.accept.some((a) => normalise(a) === given);
  input.disabled = true;
  input.classList.add(correct ? "correct" : "wrong");
  checkBtn.hidden = true;
  finishQuestion(q, correct, q.display);
}

// ----- 7. Drag: sort into buckets -----

function renderSort(q) {
  const hint = document.createElement("p");
  hint.className = "drag-hint";
  hint.textContent = "Drag each card into the correct column.";
  answerArea.appendChild(hint);

  const tray = document.createElement("div");
  tray.className = "tray";
  tray.dataset.role = "tray";

  q.items.forEach((item, i) => {
    const chip = makeChip(item.text, { idx: i, correctBucket: item.bucket });
    tray.appendChild(chip);
  });
  answerArea.appendChild(tray);

  const buckets = document.createElement("div");
  buckets.className = "buckets";
  q.buckets.forEach((label, bi) => {
    const b = document.createElement("div");
    b.className = "bucket";
    b.dataset.bucket = bi;
    b.setAttribute("aria-label", label);
    const lab = document.createElement("div");
    lab.className = "bucket-label";
    lab.textContent = label;
    const items = document.createElement("div");
    items.className = "bucket-items";
    b.appendChild(lab);
    b.appendChild(items);
    buckets.appendChild(b);
  });
  answerArea.appendChild(buckets);

  checkBtn.hidden = false;
  checkBtn.disabled = true;
  checkBtn.textContent = "Check";
  checkBtn.onclick = () => { if (!state.answered) gradeSort(q, tray); };
  state.checkReady = () => tray.querySelectorAll(".chip").length === 0;
}

function gradeSort(q, tray) {
  state.locked = true;
  let allCorrect = true;
  document.querySelectorAll(".bucket").forEach((b) => {
    const bi = Number(b.dataset.bucket);
    b.querySelectorAll(".chip").forEach((chip) => {
      const ok = Number(chip.dataset.correctBucket) === bi;
      chip.classList.add(ok ? "locked-correct" : "mark-wrong");
      if (!ok) allCorrect = false;
    });
  });
  checkBtn.hidden = true;
  finishQuestion(q, allCorrect, reviewForSort(q));
}

function reviewForSort(q) {
  const short = q.items.filter((it) => it.bucket === 0).map((it) => it.text);
  const long = q.items.filter((it) => it.bucket === 1).map((it) => it.text);
  return `${q.buckets[0]} — ${short.join("; ")}. ${q.buckets[1]} — ${long.join("; ")}.`;
}

// ----- 8. Drag: match labels to descriptions -----

function renderMatch(q) {
  const hint = document.createElement("p");
  hint.className = "drag-hint";
  hint.textContent = "Drag each card into the matching row.";
  answerArea.appendChild(hint);

  const tray = document.createElement("div");
  tray.className = "tray";
  tray.dataset.role = "tray";
  shuffle(q.pairs.map((p, i) => i)).forEach((i) => {
    const chip = makeChip(q.pairs[i].label, { idx: i, correctLabel: q.pairs[i].label });
    tray.appendChild(chip);
  });
  answerArea.appendChild(tray);

  const grid = document.createElement("div");
  grid.className = "match-grid";
  q.pairs.forEach((p) => {
    const row = document.createElement("div");
    row.className = "match-row";
    const desc = document.createElement("div");
    desc.className = "match-desc";
    desc.textContent = p.desc;
    const slot = document.createElement("div");
    slot.className = "match-slot";
    slot.dataset.answer = p.label;
    slot.setAttribute("aria-label", "Drop a card for: " + p.desc);
    row.appendChild(desc);
    row.appendChild(slot);
    grid.appendChild(row);
  });
  answerArea.appendChild(grid);

  checkBtn.hidden = false;
  checkBtn.disabled = true;
  checkBtn.textContent = "Check";
  checkBtn.onclick = () => { if (!state.answered) gradeMatch(q, tray); };
  state.checkReady = () => {
    const slots = [...document.querySelectorAll(".match-slot")];
    return slots.every((s) => s.querySelector(".chip"));
  };
}

function gradeMatch(q, tray) {
  state.locked = true;
  let allCorrect = true;
  document.querySelectorAll(".match-slot").forEach((slot) => {
    const chip = slot.querySelector(".chip");
    if (!chip) { allCorrect = false; return; }
    const ok = chip.dataset.correctLabel === slot.dataset.answer;
    chip.classList.add(ok ? "locked-correct" : "mark-wrong");
    if (!ok) allCorrect = false;
  });
  checkBtn.hidden = true;
  finishQuestion(q, allCorrect, q.pairs.map((p) => `${p.label} = ${p.desc}`).join("; "));
}

// ----- 9. Chip factory + Pointer Events drag -----

function makeChip(text, data) {
  const chip = document.createElement("div");
  chip.className = "chip";
  chip.textContent = text;
  chip.dataset.idx = data.idx;
  if (data.correctBucket !== undefined) chip.dataset.correctBucket = data.correctBucket;
  if (data.correctLabel !== undefined) chip.dataset.correctLabel = data.correctLabel;
  chip.setAttribute("role", "button");
  chip.setAttribute("aria-label", text + " — drag to place");
  chip.addEventListener("pointerdown", onPointerDown);
  chip.addEventListener("pointermove", onPointerMove);
  chip.addEventListener("pointerup", onPointerUp);
  chip.addEventListener("pointercancel", onPointerCancel);
  return chip;
}

const TAP_PX = 6;

function onPointerDown(e) {
  if (state.locked) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const chip = e.currentTarget;
  if (chip.classList.contains("locked-correct")) return;
  try { chip.setPointerCapture(e.pointerId); } catch (_) {}
  document.body.classList.add("dragging-active");
  state.pointer.id = e.pointerId;
  state.pointer.startX = e.clientX;
  state.pointer.startY = e.clientY;
  state.pointer.moved = false;
  state.dragging = chip;
  chip.__origin = chip.parentElement;
}

function onPointerMove(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const chip = state.dragging;
  const dx = e.clientX - state.pointer.startX;
  const dy = e.clientY - state.pointer.startY;

  if (!state.pointer.moved && Math.hypot(dx, dy) > TAP_PX) {
    state.pointer.moved = true;
    chip.classList.add("dragging");
    // Lift the chip out of the layout flow WITHOUT re-parenting it.
    // Re-parenting a pointer-captured element mid-drag drops the capture in
    // Safari/WebKit, which freezes the drag; position:fixed alone escapes
    // the flow and stays viewport-positioned regardless of its parent.
    const r = chip.getBoundingClientRect();
    chip.style.position = "fixed";
    chip.style.left = r.left + "px";
    chip.style.top = r.top + "px";
    chip.style.width = r.width + "px";
    chip.style.margin = "0";
  }
  if (state.pointer.moved) {
    chip.style.transform = `translate(${dx}px, ${dy}px) scale(1.06) rotate(-1.5deg)`;
    highlightTarget(e.clientX, e.clientY);
  }
}

function onPointerUp(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const chip = state.dragging;
  const wasDrag = state.pointer.moved;
  clearHighlights();

  if (wasDrag) {
    const target = dropContainerUnder(e.clientX, e.clientY);
    placeChip(chip, target);
  }
  resetChipStyle(chip);
  state.dragging = null;
  state.pointer.id = null;
  state.pointer.moved = false;
  document.body.classList.remove("dragging-active");
  try { chip.releasePointerCapture(e.pointerId); } catch (_) {}
  refreshCheckState();
}

function onPointerCancel(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const chip = state.dragging;
  clearHighlights();
  resetChipStyle(chip);
  state.dragging = null;
  state.pointer.id = null;
  state.pointer.moved = false;
  document.body.classList.remove("dragging-active");
  refreshCheckState();
}

// Belt-and-braces: cancel any text-selection the browser starts mid-drag.
document.addEventListener("selectstart", (e) => {
  if (document.body.classList.contains("dragging-active")) e.preventDefault();
});

function resetChipStyle(chip) {
  chip.classList.remove("dragging");
  chip.style.transform = "";
  if (chip.style.position === "fixed") {
    chip.style.position = "";
    chip.style.left = "";
    chip.style.top = "";
    chip.style.width = "";
    chip.style.margin = "";
  }
}

function dropContainerUnder(x, y) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (!el.classList) continue;
    if (el.classList.contains("bucket-items")) return el;
    if (el.classList.contains("bucket")) return el.querySelector(".bucket-items");
    if (el.classList.contains("match-slot")) return el;
    if (el.classList.contains("tray")) return el;
    if (el.classList.contains("chip") && el !== state.dragging) {
      // dropped onto another chip — resolve to its container
      const host = el.parentElement;
      if (host && (host.classList.contains("bucket-items") || host.classList.contains("tray"))) return host;
      if (host && host.classList.contains("match-slot")) return host;
    }
  }
  return null;
}

function placeChip(chip, target) {
  if (!target) {
    if (chip.__origin && chip.parentElement !== chip.__origin) chip.__origin.appendChild(chip);
    bounce(chip);
    return;
  }

  // Match slots hold one chip — evict any existing occupant back to the tray.
  if (target.classList.contains("match-slot")) {
    const occupant = target.querySelector(".chip");
    const tray = answerArea.querySelector(".tray");
    if (occupant && occupant !== chip) tray.appendChild(occupant);
    target.appendChild(chip);
    target.classList.add("filled");
  } else {
    target.appendChild(chip);
  }
  // Tidy "filled" state on any slot the chip left behind.
  document.querySelectorAll(".match-slot").forEach((s) => {
    s.classList.toggle("filled", !!s.querySelector(".chip"));
  });
  chip.classList.add("snap-in");
  setTimeout(() => chip.classList.remove("snap-in"), 340);
  if (target.classList.contains("bucket-items") || target.classList.contains("match-slot")) {
    playTone(620, 0.07, "sine", 0.10);
  }
}

function bounce(chip) {
  chip.classList.add("bounce-back");
  setTimeout(() => chip.classList.remove("bounce-back"), 320);
}

function highlightTarget(x, y) {
  clearHighlights();
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (!el.classList) continue;
    if (el.classList.contains("bucket") || el.closest && el.closest(".bucket")) {
      (el.closest(".bucket")).classList.add("drop-hover"); return;
    }
    if (el.classList.contains("match-slot")) { el.classList.add("drop-hover"); return; }
  }
}

function clearHighlights() {
  document.querySelectorAll(".drop-hover").forEach((el) => el.classList.remove("drop-hover"));
}

function refreshCheckState() {
  if (state.answered) return;
  if (typeof state.checkReady === "function") {
    checkBtn.disabled = !state.checkReady();
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----- 10. Finish a question (shared) -----

function finishQuestion(q, correct, correctDisplay) {
  state.answered = true;
  state.locked = true;
  state.answeredCount += 1;
  if (correct) {
    state.score += 1;
    scoreEl.textContent = state.score;
    playSuccess();
  } else {
    state.missed.push({
      prompt: q.clue ? q.clue : q.prompt,
      answer: correctDisplay
    });
    playFail();
  }
  feedback.hidden = false;
  feedback.className = "feedback " + (correct ? "good" : "bad");
  feedbackHead.textContent = correct ? "Correct" : "Not quite";
  feedbackExplain.textContent = q.explain;
  progressFill.style.width = (state.answeredCount / QUESTIONS.length) * 100 + "%";
  nextBtn.hidden = false;
  nextBtn.textContent = state.idx + 1 >= QUESTIONS.length ? "See results ›" : "Next ›";
  nextBtn.focus();
}

// ----- 11. Results -----

function showResults() {
  questionScreen.hidden = true;
  resultsScreen.hidden = false;
  progressFill.style.width = "100%";
  const total = QUESTIONS.length;
  const score = state.score;
  $("results-num").textContent = score;
  const pct = score / total;

  let title, msg;
  if (pct === 1) { title = "Perfect score!"; msg = "Every system, every response — spot on. You really know this topic."; }
  else if (pct >= 0.8) { title = "Excellent revision"; msg = "A strong result. Glance over the items below to lock in full marks."; }
  else if (pct >= 0.6) { title = "Good work"; msg = "A solid base. The points below are the ones worth another look."; }
  else if (pct >= 0.4) { title = "Getting there"; msg = "Keep going — revisit the cards below, then run the quiz again."; }
  else { title = "Worth another go"; msg = "Read back over the topics below, then try the quiz again to build confidence."; }
  $("results-title").textContent = title;
  $("results-msg").textContent = msg;

  const review = $("review");
  const list = $("review-list");
  list.innerHTML = "";
  if (state.missed.length === 0) {
    review.hidden = true;
  } else {
    review.hidden = false;
    state.missed.forEach((m) => {
      const li = document.createElement("li");
      const q = document.createElement("span");
      q.className = "review-q";
      q.textContent = m.prompt;
      const a = document.createElement("span");
      a.className = "review-a";
      a.innerHTML = "Answer: <strong></strong>";
      a.querySelector("strong").textContent = m.answer;
      li.appendChild(q);
      li.appendChild(a);
      list.appendChild(li);
    });
  }
}

// ----- 12. Listen (Web Speech API) -----

listenBtn.addEventListener("click", () => {
  const q = QUESTIONS[state.idx];
  if (!q || !q.clue) return;
  speak(q.clue);
});

textToggle.addEventListener("click", () => {
  const showing = !listenText.hidden;
  listenText.hidden = showing;
  textToggle.setAttribute("aria-expanded", String(!showing));
  textToggle.textContent = showing ? "Show text" : "Hide text";
});

function speak(text) {
  if (!("speechSynthesis" in window)) {
    // No speech support — reveal the text so the question is still answerable.
    listenText.hidden = false;
    textToggle.setAttribute("aria-expanded", "true");
    textToggle.textContent = "Hide text";
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1;
  u.lang = "en-GB";
  u.onstart = () => listenBtn.classList.add("playing");
  u.onend = () => listenBtn.classList.remove("playing");
  u.onerror = () => listenBtn.classList.remove("playing");
  window.speechSynthesis.speak(u);
}

// ----- 13. Sound (Web Audio synth, no files) -----

let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; }
  }
  return audioCtx;
}
function playTone(freq, dur = 0.1, type = "sine", volume = 0.1) {
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
function playSuccess() {
  playTone(660, 0.10, "sine", 0.12);
  setTimeout(() => playTone(990, 0.12, "sine", 0.10), 80);
}
function playFail() {
  playTone(220, 0.16, "triangle", 0.09);
}
