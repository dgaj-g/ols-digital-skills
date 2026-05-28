/* ============================================================
   Aidiachtaí — match the Irish adjective to the picture
   ------------------------------------------------------------
   Drag a word card onto the matching picture (mouse + touch via
   Pointer Events), or tap/keyboard-select a word then tap a
   picture. Self-contained: no build step, works from file://.
   The word set is chosen by <body data-set="j1|s1">.
   Emoji art: OpenMoji (openmoji.org), CC BY-SA 4.0.
   ============================================================ */

// ----- 1. Adjective data (slug → Irish + English) -----

const ADJ = {
  mor:          { ga: "mór",         en: "big" },
  beag:         { ga: "beag",        en: "small" },
  ard:          { ga: "ard",         en: "tall" },
  sean:         { ga: "sean",        en: "old" },
  og:           { ga: "óg",          en: "young" },
  laidir:       { ga: "láidir",      en: "strong" },
  ramhar:       { ga: "ramhar",      en: "fat" },
  tanai:        { ga: "tanaí",       en: "thin" },
  spoirtiuil:   { ga: "spóirtiúil",  en: "sporty" },
  ceolmhar:     { ga: "ceolmhar",    en: "musical" },
  cliste:       { ga: "cliste",      en: "clever" },
  cainteach:    { ga: "cainteach",   en: "talkative" },
  cairdiuil:    { ga: "cairdiúil",   en: "friendly" },
  cinealta:     { ga: "cineálta",    en: "kind" },
  deas:         { ga: "deas",        en: "nice" },
  greannmhar:   { ga: "greannmhar",  en: "funny" },
  diograiseach: { ga: "díograiseach", en: "enthusiastic" },
  doighiuil:    { ga: "dóighiúil",   en: "good-looking" },
  ciuin:        { ga: "ciúin",       en: "quiet" },
  faiteach:     { ga: "faiteach",    en: "shy" },
  falsa:        { ga: "falsa",       en: "lazy" },
  duthrachtach: { ga: "dúthrachtach", en: "hard-working" },
  amaideach:    { ga: "amaideach",   en: "silly" },
  lag:          { ga: "lag",         en: "weak" },
  gealghaireach:{ ga: "gealgháireach", en: "cheerful" },
  feargach:     { ga: "feargach",    en: "angry" },
  cantalach:    { ga: "cantalach",   en: "grumpy" },
  neirbhiseach: { ga: "neirbhíseach", en: "nervous" },
  dairire:      { ga: "dáiríre",     en: "serious" },
  muinineach:   { ga: "muiníneach",  en: "confident" },
  macanta:      { ga: "macánta",     en: "honest" },
  dilis:        { ga: "dílis",       en: "loyal" },
  fial:         { ga: "fial",        en: "generous" },
  santach:      { ga: "santach",     en: "greedy" },
  foighneach:   { ga: "foighneach",  en: "patient" },
  ceanndana:    { ga: "ceanndána",   en: "stubborn" },
  ciallmhar:    { ga: "ciallmhar",   en: "sensible" },
  briomhar:     { ga: "bríomhar",    en: "lively" },
  neamhspleach: { ga: "neamhspleách", en: "independent" },
  dearmadach:   { ga: "dearmadach",  en: "forgetful" },
  aclai:        { ga: "aclaí",       en: "fit" },
  argointeach:  { ga: "argóinteach", en: "argumentative" },
  lach:         { ga: "lách",        en: "gentle" },
  tuisceanach:  { ga: "tuisceanach", en: "understanding" },
  mishlachtmhar:{ ga: "míshlachtmhar", en: "untidy" },
  millte:       { ga: "millte",      en: "spoiled" },
};

// ----- 2. Rounds (curated so the 6 pictures in each are clearly distinct) -----

const ROUNDS_J1 = [
  ["mor", "beag", "ard", "sean", "og", "laidir"],
  ["ramhar", "tanai", "spoirtiuil", "ceolmhar", "cliste", "cainteach"],
  ["cairdiuil", "cinealta", "deas", "greannmhar", "diograiseach", "doighiuil"],
  ["ciuin", "faiteach", "falsa", "duthrachtach", "amaideach", "lag"],
];

const ROUNDS_S1 = ROUNDS_J1.concat([
  ["gealghaireach", "feargach", "cantalach", "neirbhiseach", "dairire", "muinineach"],
  ["macanta", "dilis", "fial", "santach", "foighneach", "ceanndana"],
  ["ciallmhar", "briomhar", "neamhspleach", "dearmadach", "aclai", "argointeach"],
  ["lach", "tuisceanach", "mishlachtmhar", "millte"],
]);

const ROUNDS = document.body.dataset.set === "s1" ? ROUNDS_S1 : ROUNDS_J1;

// ----- 3. State -----

const state = {
  rounds: ROUNDS,
  roundIndex: 0,
  matchedThisRound: 0,
  matchedTotal: 0,
  selectedWord: null,
  dragging: null,
  pointer: { id: null, startX: 0, startY: 0, moved: false, startTime: 0 },
  audioCtx: null,
};

// ----- 4. DOM refs -----

const board = document.getElementById("board");
const tray = document.getElementById("tray");
const roundNowEl = document.getElementById("round-now");
const roundTotalEl = document.getElementById("round-total");
const matchedCountEl = document.getElementById("matched-count");
const matchedTotalEl = document.getElementById("matched-total");
const resetBtn = document.getElementById("reset-btn");
const roundDone = document.getElementById("round-done");
const roundDoneMsg = document.getElementById("round-done-msg");
const nextRoundBtn = document.getElementById("next-round-btn");
const celebrate = document.getElementById("celebrate");
const celebrateTitle = document.getElementById("celebrate-title");
const celebrateText = document.getElementById("celebrate-text");
const celebrateReplay = document.getElementById("celebrate-replay");

// ----- 5. Helpers -----

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function totalWords() {
  return state.rounds.reduce((n, r) => n + r.length, 0);
}

// ----- 6. Build a round -----

function buildRound() {
  clearSelection();
  state.matchedThisRound = 0;
  const slugs = state.rounds[state.roundIndex];

  board.innerHTML = "";
  for (const slug of slugs) board.appendChild(makePicture(slug));

  tray.innerHTML = "";
  for (const slug of shuffle(slugs)) tray.appendChild(makeWord(slug));

  roundNowEl.textContent = state.roundIndex + 1;
  roundTotalEl.textContent = state.rounds.length;
  updateScore();
}

function makePicture(slug) {
  const a = ADJ[slug];
  const pic = document.createElement("div");
  pic.className = "pic";
  pic.dataset.slug = slug;
  pic.setAttribute("role", "button");
  pic.setAttribute("tabindex", "0");
  pic.setAttribute("aria-label", `Pictúir: ${a.en}. Cuir an aidiacht cheart anseo.`);
  pic.innerHTML = `
    <div class="pic-img"><img src="assets/img/${slug}.svg" alt="" draggable="false" /></div>
    <div class="pic-tag" aria-hidden="true"></div>
    <div class="pic-en" aria-hidden="true"></div>
  `;
  pic.addEventListener("pointerup", onPicTap);
  pic.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (state.selectedWord) attemptMatch(state.selectedWord, pic);
    }
  });
  return pic;
}

function makeWord(slug) {
  const a = ADJ[slug];
  const w = document.createElement("div");
  w.className = "word";
  w.dataset.slug = slug;
  w.setAttribute("role", "button");
  w.setAttribute("tabindex", "0");
  w.setAttribute("aria-label", `Aidiacht: ${a.ga}. Tarraing go dtí an pictiúr ceart, nó roghnaigh é.`);
  w.textContent = a.ga;
  attachPointerHandlers(w);
  w.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSelect(w);
    }
  });
  return w;
}

// ----- 7. Pointer drag (mouse + touch + pen) -----

const TAP_PX = 6;

function attachPointerHandlers(word) {
  word.addEventListener("pointerdown", onPointerDown);
  word.addEventListener("pointermove", onPointerMove);
  word.addEventListener("pointerup", onPointerUp);
  word.addEventListener("pointercancel", onPointerCancel);
}

function onPointerDown(e) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const word = e.currentTarget;
  if (word.classList.contains("locked")) return;
  try { word.setPointerCapture(e.pointerId); } catch (_) {}
  state.pointer.id = e.pointerId;
  state.pointer.startX = e.clientX;
  state.pointer.startY = e.clientY;
  state.pointer.moved = false;
  state.pointer.startTime = Date.now();
  state.dragging = word;
  document.body.classList.add("dragging-active");
}

function onPointerMove(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const word = state.dragging;
  const dx = e.clientX - state.pointer.startX;
  const dy = e.clientY - state.pointer.startY;
  if (!state.pointer.moved && Math.hypot(dx, dy) > TAP_PX) {
    state.pointer.moved = true;
    word.classList.add("dragging");
  }
  if (state.pointer.moved) {
    word.style.transform = `translate(${dx}px, ${dy}px) scale(1.06) rotate(-1deg)`;
    highlightPicUnder(e.clientX, e.clientY, word);
  }
}

function onPointerUp(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  const word = state.dragging;
  const wasDrag = state.pointer.moved;
  clearPicHighlights();

  if (!wasDrag) {
    toggleSelect(word);
    resetWord(word);
  } else {
    const pic = picUnderPoint(e.clientX, e.clientY);
    if (pic) attemptMatch(word, pic);
    else bounceBack(word);
  }

  state.dragging = null;
  state.pointer.id = null;
  state.pointer.moved = false;
  document.body.classList.remove("dragging-active");
  try { word.releasePointerCapture(e.pointerId); } catch (_) {}
}

function onPointerCancel(e) {
  if (e.pointerId !== state.pointer.id || !state.dragging) return;
  bounceBack(state.dragging);
  clearPicHighlights();
  state.dragging = null;
  state.pointer.id = null;
  state.pointer.moved = false;
  document.body.classList.remove("dragging-active");
}

document.addEventListener("selectstart", (e) => {
  if (document.body.classList.contains("dragging-active")) e.preventDefault();
});

function picUnderPoint(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el.classList && el.classList.contains("pic")) return el;
  }
  return null;
}

function highlightPicUnder(x, y, word) {
  clearPicHighlights();
  const pic = picUnderPoint(x, y);
  if (!pic || pic.classList.contains("matched")) return;
  pic.classList.add(pic.dataset.slug === word.dataset.slug ? "drop-hover" : "drop-near");
}

function clearPicHighlights() {
  document.querySelectorAll(".pic.drop-hover, .pic.drop-near").forEach((p) =>
    p.classList.remove("drop-hover", "drop-near")
  );
}

function resetWord(word) {
  word.classList.remove("dragging");
  word.style.transform = "";
}

function bounceBack(word) {
  resetWord(word);
  word.classList.add("bounce-back");
  setTimeout(() => word.classList.remove("bounce-back"), 320);
}

// ----- 8. Tap-to-select fallback -----

function toggleSelect(word) {
  if (word.classList.contains("locked")) return;
  if (state.selectedWord === word) { clearSelection(); return; }
  clearSelection();
  state.selectedWord = word;
  word.classList.add("selected");
  board.classList.add("awaiting-drop");
}

function clearSelection() {
  if (state.selectedWord) state.selectedWord.classList.remove("selected");
  state.selectedWord = null;
  board.classList.remove("awaiting-drop");
}

function onPicTap(e) {
  if (state.dragging) return;
  if (state.selectedWord) attemptMatch(state.selectedWord, e.currentTarget);
}

// ----- 9. Match logic -----

function attemptMatch(word, pic) {
  if (pic.classList.contains("matched") || word.classList.contains("locked")) {
    resetWord(word);
    return;
  }
  if (pic.dataset.slug === word.dataset.slug) {
    lockMatch(word, pic);
  } else {
    bounceBack(word);
    pic.classList.add("shake");
    setTimeout(() => pic.classList.remove("shake"), 360);
    playTone(196, 0.07, "square", 0.07);
  }
}

function lockMatch(word, pic) {
  const a = ADJ[pic.dataset.slug];
  clearSelection();
  resetWord(word);

  word.classList.add("locked");
  word.setAttribute("aria-hidden", "true");
  word.tabIndex = -1;
  setTimeout(() => { if (word.parentNode) word.parentNode.removeChild(word); }, 260);

  pic.classList.add("matched");
  pic.querySelector(".pic-tag").textContent = a.ga;
  pic.querySelector(".pic-en").textContent = a.en;
  pic.setAttribute("aria-label", `${a.ga} — ${a.en}. Ceart!`);
  pic.tabIndex = -1;

  playTone(660, 0.10, "sine", 0.12);
  setTimeout(() => playTone(990, 0.10, "sine", 0.10), 70);

  state.matchedThisRound += 1;
  state.matchedTotal += 1;
  updateScore();

  if (state.matchedThisRound === state.rounds[state.roundIndex].length) {
    setTimeout(finishRound, 480);
  }
}

function updateScore() {
  matchedCountEl.textContent = state.matchedTotal;
  matchedTotalEl.textContent = totalWords();
}

// ----- 10. Round + activity completion -----

function finishRound() {
  const isLast = state.roundIndex >= state.rounds.length - 1;
  if (isLast) {
    triggerCelebration();
  } else {
    roundDoneMsg.textContent = `Babhta ${state.roundIndex + 1} críochnaithe — maith thú!`;
    roundDone.hidden = false;
    playChord([523.25, 659.25, 783.99]);
    nextRoundBtn.focus();
  }
}

nextRoundBtn.addEventListener("click", () => {
  roundDone.hidden = true;
  state.roundIndex += 1;
  buildRound();
});

function triggerCelebration() {
  celebrateTitle.textContent = "Maith thú!";
  celebrateText.textContent = `Tá gach aidiacht (${totalWords()}) meaitseáilte agat leis an bpictiúr ceart.`;
  celebrate.hidden = false;
  playChord([523.25, 659.25, 783.99, 1046.5]);
}

celebrateReplay.addEventListener("click", () => {
  celebrate.hidden = true;
  start();
});

// ----- 11. Reset / init -----

function start() {
  state.roundIndex = 0;
  state.matchedTotal = 0;
  roundDone.hidden = true;
  celebrate.hidden = true;
  buildRound();
}

resetBtn.addEventListener("click", start);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { clearSelection(); celebrate.hidden = true; }
});

// ----- 12. Sound (Web Audio, no files) -----

function getAudio() {
  if (!state.audioCtx) {
    try { state.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (_) { return null; }
  }
  return state.audioCtx;
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

function playChord(freqs) {
  freqs.forEach((f, i) => setTimeout(() => playTone(f, 0.5, "sine", 0.12), i * 100));
}

// ----- 13. Init -----

start();
