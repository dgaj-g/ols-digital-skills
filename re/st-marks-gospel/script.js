/* ============================================================
   St Mark's Gospel — A Journey (CCEA GCSE RS, Unit 5)
   ------------------------------------------------------------
   A stained-glass journey through the five themes of Mark's
   Gospel. Five stations, five mechanics, one cathedral that
   lights up window by window:
     1. Identity of Jesus   — drag events onto the title windows
     2. Miracle Worker      — flashcards (flip + self-test)
     3. Teaching / Kingdom  — memory pairs (parable <-> meaning)
     4. Death & Resurrection— order the Passion (road to the cross)
     5. Discipleship        — quiz (multiple choice + true/false)

   Pure HTML/CSS/JS, file:// safe, Pointer Events for all input.
   Content traced to the CCEA spec + the teacher's set-text
   booklets. Scripture quoted from the uploaded set texts (NIV).
   ============================================================ */

(function () {
"use strict";

/* ============================================================
   1. CONTENT — the five themes
   ============================================================ */

const THEMES = [
  /* -------- THEME 1 — THE IDENTITY OF JESUS (drag) -------- */
  {
    id: "identity",
    num: 1,
    name: "The Identity of Jesus",
    motif: "chi-rho",
    short: "Who do you say I am?",
    game: "titles",
    task: "Drag each event onto the title of Jesus you think it reveals — you can move them around freely. When all eight are placed, press Check. Tap a window’s “i” to learn what a title means.",
    titles: [
      { id: "messiah",  name: "Messiah / Christ", meaning: "‘The Anointed One’ — the promised deliverer the Jewish people had waited for. Not the warrior king many expected, but one who would suffer and serve." },
      { id: "david",    name: "Son of David",     meaning: "A royal, Messianic title. The Messiah was expected to come from the line of King David." },
      { id: "god",      name: "Son of God",       meaning: "Jesus’ divine nature — that he is truly God’s own Son, sharing in God’s authority." },
      { id: "man",      name: "Son of Man",       meaning: "Jesus’ own favourite title for himself — both fully human and divine (from Daniel’s prophecy). It points to his suffering, his authority, and his return in glory." },
      { id: "saviour",  name: "Saviour",          meaning: "From the name ‘Jesus’, meaning ‘God saves’. He rescues people from sin, from danger, and from every kind of need." }
    ],
    events: [
      { id: "peter",    title: "messiah", ref: "Mark 8:27–33", label: "Peter at Caesarea Philippi: “You are the Messiah.”", note: "Peter finally names Jesus as the promised Messiah — though he does not yet grasp that this Messiah must suffer and die." },
      { id: "entry",    title: "messiah", ref: "Mark 11:1–11", label: "Riding into Jerusalem on a colt as the crowds cry “Hosanna!”", note: "The Messianic entry — yet a humble, peaceful king on a colt, fulfilling Zechariah, not the warrior the crowd hoped for." },
      { id: "bart",     title: "david",   ref: "Mark 10:46–52", label: "Blind Bartimaeus shouts “Jesus, Son of David, have mercy!”", note: "A blind beggar sees Jesus’ true identity as the Son of David — when even the disciples were slow to understand." },
      { id: "baptism",  title: "god",     ref: "Mark 1:9–11",  label: "At the Jordan a voice from heaven: “You are my Son, whom I love.”", note: "God’s own voice declares Jesus his Son as the heavens tear open and the Spirit descends like a dove." },
      { id: "transfig", title: "god",     ref: "Mark 9:2–13",  label: "On the mountain Jesus shines white; a voice from the cloud.", note: "The Transfiguration reveals Jesus’ divine glory; Moses and Elijah appear and God confirms: “This is my Son.”" },
      { id: "james",    title: "man",     ref: "Mark 10:35–45",label: "“The Son of Man came not to be served but to serve…”", note: "Answering James and John, Jesus uses his favourite title to teach that true greatness is humble service." },
      { id: "storm",    title: "saviour", ref: "Mark 4:35–41", label: "Jesus stills the wind and waves: “Quiet! Be still!”", note: "Only God commands the sea. Jesus saves the terrified disciples — Saviour and divine." },
      { id: "feeding",  title: "saviour", ref: "Mark 6:30–44", label: "Five loaves and two fish feed five thousand people.", note: "Like God giving manna in the desert, the Saviour provides for body and soul — twelve baskets left over." }
    ],
    scripture: [
      { ref: "Mark 8:29–31", text: `“But what about you?” he asked. “Who do you say I am?” Peter answered, “You are the Messiah.” Jesus warned them not to tell anyone about him. He then began to teach them that the Son of Man must suffer many things and be rejected… and that he must be killed and after three days rise again.` },
      { ref: "Mark 1:10–11", text: `Just as Jesus was coming up out of the water, he saw heaven being torn open and the Spirit descending on him like a dove. And a voice came from heaven: “You are my Son, whom I love; with you I am well pleased.”` },
      { ref: "Mark 4:39–41", text: `He got up, rebuked the wind and said to the waves, “Quiet! Be still!” Then the wind died down and it was completely calm… They were terrified and asked each other, “Who is this? Even the wind and the waves obey him!”` }
    ]
  },

  /* -------- THEME 2 — JESUS THE MIRACLE WORKER (flashcards) -------- */
  {
    id: "miracles",
    num: 2,
    name: "Jesus the Miracle Worker",
    motif: "sign",
    short: "Signs of faith",
    game: "flashcards",
    task: "Read each card and think of your answer, then tap to flip it. Mark the ones you know — clear the whole deck to light the window.",
    cards: [
      { ref: "Mark 1:21–28", tag: "Exorcism",       front: "In the synagogue at Capernaum, Jesus orders an evil spirit out of a man. What does this reveal?", back: "Jesus teaches and acts ‘with authority’ — even evil spirits know him and obey. A sign of his God-given power over evil." },
      { ref: "Mark 1:40–45", tag: "Healing",         front: "Jesus touches a man with a dreaded skin disease and makes him clean. Why is the touch so striking?", back: "Lepers were outcasts; touching one made you ‘unclean’. Jesus shows compassion matters more than the rules — he reaches the marginalised." },
      { ref: "Mark 2:1–12",  tag: "Healing",         front: "Jesus tells the paralysed man, “Your sins are forgiven.” Why did this cause outrage?", back: "Only God can forgive sins — the leaders cried blasphemy. Jesus then heals him to prove the Son of Man has authority to forgive. His four friends’ faith brought him there." },
      { ref: "Mark 3:1–6",   tag: "Healing",         front: "Jesus heals a man’s withered hand on the Sabbath. Why was this controversial?", back: "Healing was only allowed if life was in danger. Jesus teaches human need comes before religious law — and the Pharisees begin plotting to kill him." },
      { ref: "Mark 5:21–43", tag: "Raising to life", front: "“Talitha, koum!” Jesus raises Jairus’ dead twelve-year-old daughter. What does this teach?", back: "The only raising-to-life in Mark. Jesus has power over death itself — pointing forward to the resurrection and the hope of life after death." },
      { ref: "Mark 5:25–34", tag: "Healing",         front: "A woman bleeding for twelve years touches Jesus’ cloak and is healed. What heals her?", back: "“Daughter, your faith has healed you.” Her faith brings healing of body and mind — and Jesus felt the power go out of him." },
      { ref: "Mark 7:24–30", tag: "Exorcism",        front: "Jesus frees a Gentile (Syro-Phoenician) woman’s daughter from a demon, at a distance. Why does this matter?", back: "She was a Gentile, yet her faith wins her daughter’s healing — a sign that God’s Kingdom is universal, open to all, not only the Jews." },
      { ref: "Mark 9:14–29", tag: "Exorcism",        front: "“I do believe; help my unbelief!” the father cries. What does this healing emphasise?", back: "Faith and prayer. Jesus says, “Everything is possible for one who believes,” and tells the disciples this kind comes out only by prayer." },
      { ref: "The four kinds", tag: "Definition",    front: "What four kinds of miracle does Jesus perform in Mark?", back: "Healing (curing illness), Nature (e.g. calming the storm), Exorcism (driving out evil spirits) and Raising to life (Jairus’ daughter)." },
      { ref: "Why they matter", tag: "Significance", front: "Pull it together — what do Jesus’ miracles teach us about him?", back: "His compassion for the suffering, and his divine authority over evil, sickness, nature and death. They are signs of God’s Kingdom, where there is no more pain." }
    ],
    scripture: [
      { ref: "Mark 1:41–42", text: `Jesus was indignant. He reached out his hand and touched the man. “I am willing,” he said. “Be clean!” Immediately the leprosy left him and he was cleansed.` },
      { ref: "Mark 2:10–12", text: `“But I want you to know that the Son of Man has authority on earth to forgive sins.” So he said to the man, “I tell you, get up, take your mat and go home.” He got up… and walked out in full view of them all. This amazed everyone and they praised God.` },
      { ref: "Mark 5:41–42", text: `He took her by the hand and said to her, “Talitha koum!” (which means “Little girl, I say to you, get up!”). Immediately the girl stood up and began to walk around (she was twelve years old).` }
    ]
  },

  /* -------- THEME 3 — THE TEACHING OF JESUS (memory pairs) -------- */
  {
    id: "kingdom",
    num: 3,
    name: "The Teaching of Jesus",
    motif: "seed",
    short: "The Kingdom of God",
    game: "memory",
    task: "Find each matching pair — a parable or teaching, and what it means. The Kingdom of God is both here now and still to come.",
    pairs: [
      { a: "The Parable of the Sower",         b: "The different ways people respond to God’s word — some never hear it, some fall away, some are choked by wealth, some bear fruit." },
      { a: "The Parable of the Mustard Seed",  b: "From the tiniest beginning the Kingdom grows huge — and all, even outsiders, find shelter in it." },
      { a: "The Rich Man",                     b: "Wealth can be a barrier to the Kingdom — “easier for a camel to go through the eye of a needle.”" },
      { a: "Jesus and the Children",           b: "You must receive the Kingdom of God like a little child — trusting, humble and dependent on God." },
      { a: "The Greatest Commandment",         b: "Love God with all you are, and love your neighbour as yourself." },
      { a: "Jesus and the Sabbath",            b: "“The Sabbath was made for man” — human need comes before rigid religious rules." }
    ],
    scripture: [
      { ref: "Mark 4:30–32", text: `“What shall we say the kingdom of God is like? It is like a mustard seed, which is the smallest of all seeds on earth. Yet when planted, it grows and becomes the largest of all garden plants, with big branches that the birds can perch in its shade.”` },
      { ref: "Mark 10:14–15", text: `“Let the little children come to me, and do not hinder them, for the kingdom of God belongs to such as these. Truly I tell you, anyone who will not receive the kingdom of God like a little child will never enter it.”` },
      { ref: "Mark 12:30–31", text: `“Love the Lord your God with all your heart and with all your soul and with all your mind and with all your strength.’ The second is this: ‘Love your neighbour as yourself.’ There is no commandment greater than these.”` },
      { ref: "Mark 2:27–28", text: `Then he said to them, “The Sabbath was made for man, not man for the Sabbath. So the Son of Man is Lord even of the Sabbath.”` }
    ]
  },

  /* -------- THEME 4 — DEATH & RESURRECTION (sequence) -------- */
  {
    id: "passion",
    num: 4,
    name: "Death & Resurrection",
    motif: "cross",
    short: "The road to the cross",
    game: "sequence",
    task: "Place the events of Jesus’ last days in the order Mark tells them — from the Temple to the empty tomb. Then press Check.",
    sequence: [
      { order: 1, ref: "Mark 11:15–19", label: "Jesus clears the Temple", note: "He drives out the traders and money-changers: “My house shall be a house of prayer for all nations.”" },
      { order: 2, ref: "Mark 14:10–11", label: "Judas agrees to betray Jesus", note: "Judas goes to the chief priests and agrees to hand Jesus over for money." },
      { order: 3, ref: "Mark 14:12–26", label: "The Last Supper", note: "At the Passover meal Jesus shares bread and wine: “This is my body… my blood of the covenant.”" },
      { order: 4, ref: "Mark 14:32–50", label: "Gethsemane — prayer and arrest", note: "Jesus prays “take this cup from me”; Judas betrays him with a kiss and he is arrested." },
      { order: 5, ref: "Mark 14:53–65", label: "Trial before the Sanhedrin", note: "The Jewish council condemns Jesus for blasphemy when he says “I am” the Messiah." },
      { order: 6, ref: "Mark 14:66–72", label: "Peter denies Jesus", note: "Three times Peter says he never knew Jesus; the cock crows twice and he breaks down and weeps." },
      { order: 7, ref: "Mark 15:1–15",  label: "Trial before Pilate", note: "Pilate gives in to the crowd, frees Barabbas, and hands Jesus over to be crucified." },
      { order: 8, ref: "Mark 15:21–47", label: "Crucifixion, death and burial", note: "Jesus is crucified at Golgotha; the temple curtain tears in two; Joseph lays his body in a rock tomb." },
      { order: 9, ref: "Mark 16:1–8",   label: "The empty tomb", note: "The women find the stone rolled away. “He is not here — he has risen!”" }
    ],
    scripture: [
      { ref: "Mark 14:22–24", text: `While they were eating, Jesus took bread, gave thanks and broke it… “Take it; this is my body.” Then he took a cup… “This is my blood of the covenant, which is poured out for many,” he said.` },
      { ref: "Mark 14:36", text: `“Abba, Father,” he said, “everything is possible for you. Take this cup from me. Yet not what I will, but what you will.”` },
      { ref: "Mark 15:37–39", text: `With a loud cry, Jesus breathed his last. The curtain of the temple was torn in two from top to bottom. And when the centurion… saw how he died, he said, “Surely this man was the Son of God!”` },
      { ref: "Mark 16:6", text: `“Don’t be alarmed,” he said. “You are looking for Jesus the Nazarene, who was crucified. He has risen! He is not here. See the place where they laid him.”` }
    ]
  },

  /* -------- THEME 5 — DISCIPLESHIP (quiz) -------- */
  {
    id: "discipleship",
    num: 5,
    name: "Christian Discipleship",
    motif: "anchor",
    short: "The cost of following",
    game: "quiz",
    task: "Answer each question about what it means to follow Jesus. Read the feedback — it is there to teach, not just to mark.",
    questions: [
      { type: "mc", prompt: "What does the word ‘disciple’ mean?", options: ["A follower", "A priest", "A teacher of the Law", "A miracle"], answer: 0, explain: "‘Disciple’ comes from the Latin for ‘follower’. Jesus’ disciples are also called Christians." },
      { type: "mc", prompt: "By the Sea of Galilee Jesus called Simon Peter and Andrew with which words?", options: ["“Come, follow me, and I will send you out to fish for people.”", "“Sell all that you have.”", "“Take up your cross.”", "“Let the little children come to me.”"], answer: 0, explain: "He called the fishermen to ‘catch people’ for God’s Kingdom — and at once they left their nets and followed him." },
      { type: "mc", prompt: "Which hated tax collector did Jesus call to follow him?", options: ["Levi (Matthew)", "Zacchaeus", "Judas", "Bartimaeus"], answer: 0, explain: "Levi, son of Alphaeus — also called Matthew. Jesus said, “I have not come to call the respectable, but the outcasts.”" },
      { type: "mc", prompt: "Jesus chose an inner group of disciples to be with him, to preach and to drive out demons. How many were there?", options: ["Twelve", "Three", "Seven", "Seventy"], answer: 0, explain: "He chose twelve — mirroring the twelve tribes of Israel — who became known as ‘the Twelve’." },
      { type: "tf", prompt: "Jesus sent the Twelve out on mission two by two, telling them to pack plenty of supplies.", answer: false, explain: "He sent them in pairs, but told them to take almost nothing — no bread, no bag, no money — and to rely on God and the kindness of others." },
      { type: "mc", prompt: "Jesus said the cost of being a disciple was to…", options: ["“Deny yourself, take up your cross and follow me.”", "Become wealthy and powerful", "Live alone in the desert", "Build a new temple"], answer: 0, explain: "Discipleship means putting others first, accepting hardship (‘your cross’), and following Jesus — even at great cost." },
      { type: "mc", prompt: "The poor widow put two small copper coins in the Temple treasury. Why did Jesus praise her?", options: ["She gave everything she had to live on", "She gave the largest amount of money", "She gave gold", "She gave in secret"], answer: 0, explain: "The rich gave from their spare wealth; she gave all she had — a total sacrifice, trusting God to provide." },
      { type: "mc", prompt: "“Give back to Caesar what is Caesar’s, and to God what is God’s.” What was Jesus teaching?", options: ["Christians have duties to both the state and to God", "Christians should never pay taxes", "Money is evil", "Obey only the Emperor"], answer: 0, explain: "A clever answer to a trap. Christians can be loyal citizens and faithful to God — though obeying God comes first." },
      { type: "mc", prompt: "After Peter denied Jesus three times, what became of him?", options: ["He was forgiven and became a great leader of the Church", "He was never heard of again", "He betrayed Jesus like Judas", "He denied Jesus a fourth time"], answer: 0, explain: "Peter wept bitterly, but was forgiven — the angel even names him at the empty tomb. He led the early Church. Christians can fail, repent and be restored." }
    ],
    scripture: [
      { ref: "Mark 1:17–18", text: `“Come, follow me,” Jesus said, “and I will send you out to fish for people.” At once they left their nets and followed him.` },
      { ref: "Mark 8:34–35", text: `“Whoever wants to be my disciple must deny themselves and take up their cross and follow me. For whoever wants to save their life will lose it, but whoever loses their life for me and for the gospel will save it.”` },
      { ref: "Mark 12:43–44", text: `“Truly I tell you, this poor widow has put more into the treasury than all the others. They all gave out of their wealth; but she… put in everything — all she had to live on.”` }
    ]
  }
];

const THEME_BY_ID = {};
THEMES.forEach((t) => { THEME_BY_ID[t.id] = t; });

/* ============================================================
   2. STATE + DOM
   ============================================================ */

const state = {
  lit: {},            // themeId -> stars (1..3)
  finaleSeen: false,
  soundOn: true,
  activeTheme: null,
  pointer: { id: null, startX: 0, startY: 0, moved: false, chip: null },
  resolveDrop: null,  // active game's drop resolver
  highlight: null     // active game's drag highlight
};

const $ = (id) => document.getElementById(id);
const mapScreen = $("map-screen");
const stationScreen = $("station-screen");
const lancetsEl = $("lancets");
const roseBtn = $("rose");
const roseCaption = $("rose-caption");
const litCountEl = $("lit-count");
const stationBody = $("station-body");
const stationTitle = $("station-title");
const stationEyebrow = $("station-eyebrow");
const stationTask = $("station-task");
const stationProgress = $("station-progress");
const replayBtn = $("replay-btn");
const soundBtn = $("sound-btn");

/* ============================================================
   3. AUDIO — Web Audio synth (no files)
   ============================================================ */

let audioCtx = null;
function getAudio() {
  if (!state.soundOn) return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (_) { return null; }
  }
  return audioCtx;
}
function tone(freq, dur, type, vol, when) {
  const ctx = getAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + (when || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}
const sfx = {
  correct() { tone(660, 0.18, "sine", 0.16, 0); tone(990, 0.22, "sine", 0.12, 0.06); },
  place()   { tone(523, 0.12, "sine", 0.12, 0); },
  wrong()   { tone(196, 0.18, "triangle", 0.10, 0); },
  flip()    { tone(420, 0.07, "sine", 0.07, 0); },
  star()    { [523, 659, 784].forEach((f, i) => tone(f, 0.16, "sine", 0.12, i * 0.07)); },
  finale()  { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.6, "sine", 0.13, i * 0.14)); tone(392, 0.9, "sine", 0.08, 0); }
};

/* ============================================================
   4. THE CATHEDRAL (map / hub)
   ============================================================ */

function buildMap() {
  lancetsEl.innerHTML = "";
  THEMES.forEach((t) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "lancet";
    item.dataset.theme = t.id;
    item.setAttribute("role", "listitem");
    item.setAttribute("aria-label", `Theme ${t.num}: ${t.name}. ${state.lit[t.id] ? "Complete." : "Not yet complete."}`);
    item.innerHTML = `
      <span class="lancet-glass" aria-hidden="true">
        <span class="lancet-motif motif-${t.motif}"></span>
      </span>
      <span class="lancet-num">Theme ${t.num}</span>
      <span class="lancet-name">${t.name}</span>
      <span class="lancet-stars" aria-hidden="true">${starRow(state.lit[t.id] || 0)}</span>
    `;
    item.addEventListener("click", () => openStation(t.id));
    lancetsEl.appendChild(item);
  });
  refreshMap();
}

function starRow(n) {
  let s = "";
  for (let i = 1; i <= 3; i++) s += `<span class="star ${i <= n ? "on" : ""}">★</span>`;
  return s;
}

function refreshMap() {
  const litCount = Object.keys(state.lit).length;
  litCountEl.textContent = litCount;
  THEMES.forEach((t) => {
    const el = lancetsEl.querySelector(`.lancet[data-theme="${t.id}"]`);
    if (!el) return;
    const lit = !!state.lit[t.id];
    el.classList.toggle("lit", lit);
    el.querySelector(".lancet-stars").innerHTML = starRow(state.lit[t.id] || 0);
  });
  const allLit = litCount === THEMES.length;
  roseBtn.classList.toggle("lit", allLit);
  roseBtn.disabled = !allLit;
  roseCaption.textContent = allLit ? "The great rose is complete — tap it" : `${litCount} / 5 windows lit`;
}

roseBtn.addEventListener("click", () => {
  if (Object.keys(state.lit).length === THEMES.length) showFinale();
});

/* ============================================================
   5. STATION shell + navigation
   ============================================================ */

function openStation(themeId) {
  const t = THEME_BY_ID[themeId];
  state.activeTheme = t;
  stationEyebrow.textContent = `Theme ${t.num} · ${t.short}`;
  stationTitle.textContent = t.name;
  stationTask.textContent = t.task;
  stationProgress.textContent = "";
  stationScreen.dataset.theme = t.id;
  stationBody.className = "station-body game-" + t.game;
  stationBody.innerHTML = "";
  replayBtn.hidden = true;

  mapScreen.hidden = true;
  stationScreen.hidden = false;
  window.scrollTo(0, 0);

  if (t.game === "titles") renderTitles(t);
  else if (t.game === "flashcards") renderFlashcards(t);
  else if (t.game === "memory") renderMemory(t);
  else if (t.game === "sequence") renderSequence(t);
  else if (t.game === "quiz") renderQuiz(t);
}

function goToMap() {
  stationScreen.hidden = true;
  mapScreen.hidden = false;
  state.activeTheme = null;
  state.resolveDrop = null;
  state.highlight = null;
  window.scrollTo(0, 0);
}

$("back-btn").addEventListener("click", goToMap);
replayBtn.addEventListener("click", () => { if (state.activeTheme) openStation(state.activeTheme.id); });

function setProgress(txt) { stationProgress.textContent = txt; }

/* Award completion: light the window, maybe trigger finale */
function completeStation(themeId, stars) {
  const first = !state.lit[themeId];
  state.lit[themeId] = Math.max(state.lit[themeId] || 0, stars);
  refreshMap();
  return first;
}

/* ============================================================
   6. SHARED DRAG (Pointer Events) — used by titles + sequence
   ------------------------------------------------------------
   Generic lift/move/drop. Each game sets state.resolveDrop and
   state.highlight when it renders. Chips carry their own data.
   ============================================================ */

const TAP_PX = 6;

function makeChip(text, data, extraClass) {
  const chip = document.createElement("div");
  chip.className = "chip" + (extraClass ? " " + extraClass : "");
  chip.textContent = text;
  Object.keys(data || {}).forEach((k) => { chip.dataset[k] = data[k]; });
  chip.setAttribute("role", "button");
  chip.setAttribute("tabindex", "0");
  chip.setAttribute("aria-label", text + " — drag to place");
  chip.addEventListener("pointerdown", dragDown);
  chip.addEventListener("pointermove", dragMove);
  chip.addEventListener("pointerup", dragUp);
  chip.addEventListener("pointercancel", dragCancel);
  return chip;
}

function dragDown(e) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const chip = e.currentTarget;
  if (chip.classList.contains("locked")) return;
  try { chip.setPointerCapture(e.pointerId); } catch (_) {}
  document.body.classList.add("dragging-active");
  state.pointer.id = e.pointerId;
  state.pointer.startX = e.clientX;
  state.pointer.startY = e.clientY;
  state.pointer.moved = false;
  state.pointer.chip = chip;
  chip.__origin = chip.parentElement;
}

function dragMove(e) {
  if (e.pointerId !== state.pointer.id || !state.pointer.chip) return;
  const chip = state.pointer.chip;
  const dx = e.clientX - state.pointer.startX;
  const dy = e.clientY - state.pointer.startY;
  if (!state.pointer.moved && Math.hypot(dx, dy) > TAP_PX) {
    state.pointer.moved = true;
    chip.classList.add("dragging");
    const r = chip.getBoundingClientRect();
    chip.style.position = "fixed";
    chip.style.left = r.left + "px";
    chip.style.top = r.top + "px";
    chip.style.width = r.width + "px";
    chip.style.margin = "0";
  }
  if (state.pointer.moved) {
    chip.style.transform = `translate(${dx}px, ${dy}px) scale(1.05) rotate(-1.5deg)`;
    if (state.highlight) state.highlight(e.clientX, e.clientY);
  }
}

function dragUp(e) {
  if (e.pointerId !== state.pointer.id || !state.pointer.chip) return;
  const chip = state.pointer.chip;
  const wasDrag = state.pointer.moved;
  clearDropHighlights();
  if (wasDrag && state.resolveDrop) {
    state.resolveDrop(chip, e.clientX, e.clientY);
  }
  resetChipStyle(chip);
  endDrag(e, chip);
}

function dragCancel(e) {
  if (e.pointerId !== state.pointer.id || !state.pointer.chip) return;
  const chip = state.pointer.chip;
  clearDropHighlights();
  resetChipStyle(chip);
  endDrag(e, chip);
}

function endDrag(e, chip) {
  state.pointer.chip = null;
  state.pointer.id = null;
  state.pointer.moved = false;
  document.body.classList.remove("dragging-active");
  try { chip.releasePointerCapture(e.pointerId); } catch (_) {}
}

function resetChipStyle(chip) {
  chip.classList.remove("dragging");
  chip.style.transform = "";
  if (chip.style.position === "fixed") {
    chip.style.position = ""; chip.style.left = ""; chip.style.top = "";
    chip.style.width = ""; chip.style.margin = "";
  }
}

function elementsUnder(x, y, className) {
  const els = document.elementsFromPoint(x, y);
  const dragging = state.pointer.chip;   // ignore the chip being dragged, else closest()
  for (const el of els) {                 // resolves to its *current* container, not the target
    if (dragging && (el === dragging || dragging.contains(el))) continue;
    if (el.classList && el.classList.contains(className)) return el;
    if (el.closest) { const c = el.closest("." + className); if (c) return c; }
  }
  return null;
}

function clearDropHighlights() {
  document.querySelectorAll(".drop-hover").forEach((el) => el.classList.remove("drop-hover"));
}

function bounce(chip) {
  chip.classList.add("bounce-back");
  setTimeout(() => chip.classList.remove("bounce-back"), 320);
}
function snapIn(chip) {
  chip.classList.add("snap-in");
  setTimeout(() => chip.classList.remove("snap-in"), 340);
}

document.addEventListener("selectstart", (e) => {
  if (document.body.classList.contains("dragging-active")) e.preventDefault();
});

/* ============================================================
   7. GAME 1 — IDENTITY (drag events onto title windows)
   ============================================================ */

function renderTitles(t) {
  const total = t.events.length;
  const checks = { n: 0 };

  const wrap = document.createElement("div");
  wrap.className = "titles-stage";

  // Title windows (drop targets)
  const board = document.createElement("div");
  board.className = "title-board";
  t.titles.forEach((ti) => {
    const win = document.createElement("div");
    win.className = "title-window drop-zone";
    win.dataset.title = ti.id;
    win.innerHTML = `
      <button class="title-info" type="button" aria-label="What does ${ti.name} mean?" data-title="${ti.id}">i</button>
      <span class="title-name">${ti.name}</span>
      <span class="title-drop-hint">drop here</span>
      <div class="title-holders"></div>`;
    win.querySelector(".title-info").addEventListener("click", (e) => {
      e.stopPropagation();
      openInfo(`<h3 id="info-heading">${ti.name}</h3><p>${ti.meaning}</p>`);
    });
    board.appendChild(win);
  });

  // Tray of event chips (shuffled)
  const tray = document.createElement("div");
  tray.className = "event-tray drop-zone";
  tray.dataset.tray = "1";
  shuffle(t.events).forEach((ev) => {
    const chip = makeChip(ev.label, { title: ev.title, ev: ev.id, ref: ev.ref }, "event-chip");
    tray.appendChild(chip);
  });
  const trayWrap = document.createElement("div");
  trayWrap.className = "event-tray-wrap";
  trayWrap.innerHTML = `<p class="tray-caption">The events — drag each to the title it reveals</p>`;
  trayWrap.appendChild(tray);

  // Check bar
  const checkBar = document.createElement("div");
  checkBar.className = "titles-checkbar";
  const checkBtn = document.createElement("button");
  checkBtn.type = "button"; checkBtn.className = "primary-btn"; checkBtn.textContent = "Check answers";
  checkBtn.disabled = true;
  checkBar.appendChild(checkBtn);

  wrap.appendChild(board);
  wrap.appendChild(trayWrap);
  wrap.appendChild(checkBar);
  stationBody.appendChild(wrap);

  function placedCount() { return board.querySelectorAll(".title-holders .chip").length; }
  function refresh() {
    const n = placedCount();
    setProgress(`${n} / ${total} placed`);
    checkBtn.disabled = n !== total;
    board.querySelectorAll(".title-window").forEach((w) =>
      w.classList.toggle("has-item", !!w.querySelector(".title-holders .chip")));
  }
  refresh();

  // Drag wiring — free placement, NO instant grading (you can be wrong)
  state.highlight = (x, y) => {
    clearDropHighlights();
    const win = elementsUnder(x, y, "title-window");
    if (win) win.classList.add("drop-hover");
    else { const tr = elementsUnder(x, y, "event-tray"); if (tr) tr.classList.add("drop-hover"); }
  };
  state.resolveDrop = (chip, x, y) => {
    chip.classList.remove("bad");                  // moving clears a previous wrong mark
    const win = elementsUnder(x, y, "title-window");
    if (win) { win.querySelector(".title-holders").appendChild(chip); snapIn(chip); sfx.place(); }
    else {
      const tr = elementsUnder(x, y, "event-tray");
      if (tr) { tray.appendChild(chip); sfx.place(); }
      else { (chip.__origin || tray).appendChild(chip); bounce(chip); }
    }
    refresh();
  };

  // Check — grade everything; lock the correct, let the wrong be moved and re-checked
  checkBtn.addEventListener("click", () => {
    checks.n++;
    let correct = 0;
    board.querySelectorAll(".title-window").forEach((w) => {
      w.querySelectorAll(".title-holders .chip").forEach((chip) => {
        if (chip.classList.contains("locked")) { correct++; return; }
        if (chip.dataset.title === w.dataset.title) {
          chip.classList.remove("bad");
          chip.classList.add("ok", "locked", "placed");
          chip.setAttribute("aria-disabled", "true");
          const ev = t.events.find((e) => e.id === chip.dataset.ev);
          if (ev && !(chip.nextElementSibling && chip.nextElementSibling.classList.contains("id-note"))) {
            const note = document.createElement("div");
            note.className = "id-note";
            note.innerHTML = `<strong>${ev.ref}</strong> ${ev.note}`;
            chip.insertAdjacentElement("afterend", note);
          }
          correct++;
        } else {
          chip.classList.add("bad");
          w.classList.add("shake");
          setTimeout(() => w.classList.remove("shake"), 360);
        }
      });
    });
    if (correct === total) {
      sfx.correct();
      board.querySelectorAll(".title-window").forEach((w) => w.classList.add("alllit"));
      const stars = checks.n === 1 ? 3 : checks.n === 2 ? 2 : 1;
      const first = completeStation(t.id, stars);
      setTimeout(() => showStationComplete(t, stars, first,
        checks.n === 1 ? "Every event matched first time — you really know the titles of Jesus."
                       : "All the events are now matched to the right title of Jesus."), 650);
    } else {
      sfx.wrong();
      setProgress(`${correct} / ${total} correct — move the ones marked red, then check again`);
    }
  });
}

/* ============================================================
   8. GAME 2 — MIRACLES (flashcards: flip + self-test)
   ============================================================ */

function renderFlashcards(t) {
  replayBtn.hidden = false;
  const deck = shuffle(t.cards.map((c, i) => ({ ...c, i })));
  let queue = deck.slice();          // cards still to clear
  let idx = 0;
  let mastered = 0;
  let reviewed = false;              // did any card need a second look
  const total = deck.length;

  const stage = document.createElement("div");
  stage.className = "flash-stage";
  stage.innerHTML = `
    <div class="flash-card" id="flash-card" tabindex="0" role="button" aria-label="Flashcard — tap to flip">
      <div class="flash-inner">
        <div class="flash-face flash-front"><span class="flash-tag"></span><p class="flash-text"></p><span class="flash-hint">tap to flip</span></div>
        <div class="flash-face flash-back"><span class="flash-ref"></span><p class="flash-text"></p></div>
      </div>
    </div>
    <div class="flash-controls" id="flash-controls">
      <button class="self-btn review" id="btn-review" type="button" hidden>↻ Review again</button>
      <button class="self-btn got" id="btn-got" type="button" hidden>✓ I knew it</button>
    </div>`;
  stationBody.appendChild(stage);

  const card = $("flash-card");
  const front = card.querySelector(".flash-front");
  const back = card.querySelector(".flash-back");
  const btnGot = $("btn-got");
  const btnReview = $("btn-review");

  function show() {
    const c = queue[idx];
    card.classList.remove("flipped");
    front.querySelector(".flash-tag").textContent = c.tag;
    front.querySelector(".flash-text").textContent = c.front;
    back.querySelector(".flash-ref").textContent = c.ref;
    back.querySelector(".flash-text").textContent = c.back;
    btnGot.hidden = true; btnReview.hidden = true;
    setProgress(`${mastered} / ${total} mastered`);
  }
  function flip() {
    card.classList.toggle("flipped");
    sfx.flip();
    if (card.classList.contains("flipped")) { btnGot.hidden = false; btnReview.hidden = false; }
  }
  card.addEventListener("click", flip);
  card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });

  btnGot.addEventListener("click", () => {
    mastered++;
    sfx.correct();
    queue.splice(idx, 1);
    if (idx >= queue.length) idx = 0;
    if (queue.length === 0) { finishFlash(); return; }
    show();
  });
  btnReview.addEventListener("click", () => {
    reviewed = true;
    // move this card to the back of the queue
    const c = queue.splice(idx, 1)[0];
    queue.push(c);
    if (idx >= queue.length) idx = 0;
    show();
  });

  function finishFlash() {
    const stars = reviewed ? 2 : 3;
    const first = completeStation(t.id, stars);
    showStationComplete(t, stars, first,
      reviewed ? "Whole deck mastered — keep practising the ones you flipped back." :
      "Every miracle card mastered on the first pass. Excellent recall.");
  }

  show();
}

/* ============================================================
   9. GAME 3 — KINGDOM (memory pairs)
   ============================================================ */

function renderMemory(t) {
  replayBtn.hidden = false;
  // Build card list: each pair -> two cards (term + meaning)
  const cards = [];
  t.pairs.forEach((p, i) => {
    cards.push({ pair: i, kind: "a", text: p.a });
    cards.push({ pair: i, kind: "b", text: p.b });
  });
  const deck = shuffle(cards);
  let flipped = [];      // currently face-up (unmatched)
  let matched = 0;
  let moves = 0;
  let busy = false;
  const totalPairs = t.pairs.length;

  setProgress(`0 / ${totalPairs} pairs`);

  const grid = document.createElement("div");
  grid.className = "memory-grid";
  grid.style.setProperty("--cards", deck.length);
  deck.forEach((c, i) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "mem-card kind-" + c.kind;
    cell.dataset.pair = c.pair;
    cell.dataset.idx = i;
    cell.setAttribute("aria-label", "Hidden card");
    cell.innerHTML = `
      <span class="mem-back" aria-hidden="true"><span class="mem-back-motif"></span></span>
      <span class="mem-front"><span class="mem-kind">${c.kind === "a" ? "Teaching" : "Meaning"}</span><span class="mem-text">${c.text}</span></span>`;
    cell.addEventListener("click", () => onFlip(cell, c));
    grid.appendChild(cell);
  });
  stationBody.appendChild(grid);

  function onFlip(cell, c) {
    if (busy || cell.classList.contains("up") || cell.classList.contains("matched")) return;
    cell.classList.add("up");
    cell.setAttribute("aria-label", c.text);
    sfx.flip();
    flipped.push({ cell, c });
    if (flipped.length === 2) {
      moves++;
      busy = true;
      const [x, y] = flipped;
      if (x.c.pair === y.c.pair) {
        setTimeout(() => {
          x.cell.classList.add("matched"); y.cell.classList.add("matched");
          x.cell.classList.remove("up"); y.cell.classList.remove("up");
          matched++;
          setProgress(`${matched} / ${totalPairs} pairs`);
          sfx.correct();
          flipped = []; busy = false;
          if (matched === totalPairs) setTimeout(() => finishMemory(), 500);
        }, 360);
      } else {
        setTimeout(() => {
          x.cell.classList.remove("up"); y.cell.classList.remove("up");
          x.cell.setAttribute("aria-label", "Hidden card"); y.cell.setAttribute("aria-label", "Hidden card");
          sfx.wrong();
          flipped = []; busy = false;
        }, 950);
      }
    }
  }

  function finishMemory() {
    // 3 stars for a near-perfect run, scaling with extra moves
    const perfect = totalPairs;
    const stars = moves <= perfect + 2 ? 3 : moves <= perfect + 6 ? 2 : 1;
    const first = completeStation(t.id, stars);
    showStationComplete(t, stars, first, `All ${totalPairs} pairs matched in ${moves} turns.`);
  }
}

/* ============================================================
   10. GAME 4 — PASSION (order the events)
   ============================================================ */

function renderSequence(t) {
  replayBtn.hidden = false;
  const events = t.sequence;
  const total = events.length;

  const stage = document.createElement("div");
  stage.className = "seq-stage";

  // Shuffled tray
  const tray = document.createElement("div");
  tray.className = "seq-tray drop-zone";
  tray.dataset.tray = "1";

  // The road (numbered slots)
  const road = document.createElement("div");
  road.className = "seq-road";
  for (let i = 1; i <= total; i++) {
    const slot = document.createElement("div");
    slot.className = "seq-slot drop-zone";
    slot.dataset.slot = i;
    slot.innerHTML = `<span class="seq-num">${i}</span><div class="seq-holder"></div>`;
    road.appendChild(slot);
  }

  // Shuffled chips. The Mark reference is hidden until Check — the verse
  // numbers run in order and would otherwise give the sequence away.
  shuffle(events).forEach((ev) => {
    const chip = makeChip(ev.label, { order: ev.order, ref: ev.ref, note: ev.note }, "seq-chip");
    tray.appendChild(chip);
  });

  const trayWrap = document.createElement("div");
  trayWrap.className = "seq-tray-wrap";
  trayWrap.innerHTML = `<p class="tray-caption">Drag these onto the road in order</p>`;
  trayWrap.appendChild(tray);

  const checkBar = document.createElement("div");
  checkBar.className = "seq-checkbar";
  const checkBtn = document.createElement("button");
  checkBtn.type = "button"; checkBtn.className = "primary-btn"; checkBtn.textContent = "Check the order";
  checkBtn.disabled = true;
  checkBar.appendChild(checkBtn);

  stage.appendChild(trayWrap);
  stage.appendChild(road);
  stage.appendChild(checkBar);
  stationBody.appendChild(stage);

  const checks = { n: 0 };
  setProgress(`0 / ${total} placed`);

  function placedCount() { return road.querySelectorAll(".seq-holder .chip").length; }
  function refresh() {
    const n = placedCount();
    setProgress(`${n} / ${total} placed`);
    checkBtn.disabled = n !== total;
  }

  state.highlight = (x, y) => {
    clearDropHighlights();
    const slot = elementsUnder(x, y, "seq-slot");
    if (slot) slot.classList.add("drop-hover");
    else { const tr = elementsUnder(x, y, "seq-tray"); if (tr) tr.classList.add("drop-hover"); }
  };
  state.resolveDrop = (chip, x, y) => {
    chip.classList.remove("bad");                      // moving clears a previous wrong mark
    const slot = elementsUnder(x, y, "seq-slot");
    if (slot) {
      const holder = slot.querySelector(".seq-holder");
      const occupant = holder.querySelector(".chip");
      if (occupant && occupant.classList.contains("locked")) {   // can't displace a confirmed-correct event
        (chip.__origin || tray).appendChild(chip); bounce(chip); refresh(); return;
      }
      if (occupant && occupant !== chip) {
        // swap: send the occupant to where this chip came from (or back to the tray)
        const origin = (chip.__origin && chip.__origin.classList.contains("seq-holder")) ? chip.__origin : tray;
        occupant.classList.remove("bad");
        origin.appendChild(occupant);
      }
      holder.appendChild(chip);
      snapIn(chip); sfx.place();
    } else {
      const tr = elementsUnder(x, y, "seq-tray");
      if (tr) { tray.appendChild(chip); sfx.place(); }
      else { (chip.__origin || tray).appendChild(chip); bounce(chip); }
    }
    refresh();
  };

  checkBtn.addEventListener("click", () => {
    checks.n++;
    let correct = 0;
    road.querySelectorAll(".seq-slot").forEach((slot) => {
      const chip = slot.querySelector(".seq-holder .chip");
      if (!chip) return;
      if (chip.classList.contains("locked")) { correct++; return; }
      const ok = Number(chip.dataset.order) === Number(slot.dataset.slot);
      if (ok) {
        chip.classList.remove("bad");
        chip.classList.add("ok", "locked");
        // now that it's confirmed, reveal the reference + the teaching note
        if (!chip.querySelector(".seq-chip-ref")) {
          const r = document.createElement("span");
          r.className = "seq-chip-ref"; r.textContent = chip.dataset.ref;
          chip.insertBefore(r, chip.firstChild);
        }
        if (!slot.querySelector(".seq-note")) {
          const note = document.createElement("div");
          note.className = "seq-note"; note.textContent = chip.dataset.note;
          slot.appendChild(note);
        }
        correct++;
      } else {
        chip.classList.add("bad", "shake");
        setTimeout(() => chip.classList.remove("shake"), 360);
      }
    });
    if (correct === total) {
      sfx.correct();
      road.classList.add("complete");
      const stars = checks.n === 1 ? 3 : checks.n === 2 ? 2 : 1;
      const first = completeStation(t.id, stars);
      setTimeout(() => showStationComplete(t, stars, first,
        checks.n === 1 ? "The whole Passion narrative in order, first time. Outstanding." :
        "The road to the cross is complete and in order."), 900);
    } else {
      sfx.wrong();
      setProgress(`${correct} / ${total} in the right place — rearrange and check again`);
    }
  });
}

/* ============================================================
   11. GAME 5 — DISCIPLESHIP (quiz)
   ============================================================ */

function renderQuiz(t) {
  const qs = t.questions;
  let idx = 0, score = 0, answered = false, curCorrect = 0;
  const missed = [];

  const stage = document.createElement("div");
  stage.className = "quiz-stage";
  stage.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-top"><span class="quiz-counter" id="quiz-counter"></span></div>
      <h3 class="quiz-prompt" id="quiz-prompt"></h3>
      <div class="quiz-options" id="quiz-options"></div>
      <div class="quiz-feedback" id="quiz-feedback" hidden>
        <p class="qf-head" id="qf-head"></p>
        <p class="qf-text" id="qf-text"></p>
      </div>
      <div class="quiz-actions"><button class="primary-btn" id="quiz-next" type="button" hidden>Next ›</button></div>
    </div>`;
  stationBody.appendChild(stage);

  const counter = $("quiz-counter");
  const prompt = $("quiz-prompt");
  const optionsEl = $("quiz-options");
  const feedback = $("quiz-feedback");
  const qfHead = $("qf-head");
  const qfText = $("qf-text");
  const nextBtn = $("quiz-next");

  function show() {
    const q = qs[idx];
    answered = false;
    counter.textContent = `Question ${idx + 1} of ${qs.length}`;
    setProgress(`Score ${score} / ${qs.length}`);
    prompt.textContent = q.prompt;
    feedback.hidden = true; feedback.className = "quiz-feedback"; nextBtn.hidden = true;
    optionsEl.innerHTML = "";
    let opts;
    if (q.type === "tf") {
      opts = ["True", "False"];
      curCorrect = q.answer ? 0 : 1;
    } else {
      // randomise option order every render so the answer never clusters in one slot
      const shuffled = shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer })));
      opts = shuffled.map((o) => o.text);
      curCorrect = shuffled.findIndex((o) => o.correct);
    }
    opts.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "quiz-opt"; btn.textContent = opt;
      btn.addEventListener("click", () => grade(q, i, btn));
      optionsEl.appendChild(btn);
    });
  }

  function grade(q, chosen, btn) {
    if (answered) return;
    answered = true;
    const ci = curCorrect;
    const ok = chosen === ci;
    const btns = optionsEl.querySelectorAll(".quiz-opt");
    btns.forEach((b, i) => {
      b.disabled = true;
      if (i === ci) b.classList.add("correct");
      else if (i === chosen) b.classList.add("wrong");
    });
    if (ok) { score++; sfx.correct(); }
    else { sfx.wrong(); missed.push(q); }
    feedback.hidden = false;
    feedback.classList.add(ok ? "good" : "bad");
    qfHead.textContent = ok ? "Correct" : "Not quite";
    qfText.textContent = q.explain;
    setProgress(`Score ${score} / ${qs.length}`);
    nextBtn.hidden = false;
    nextBtn.textContent = idx + 1 >= qs.length ? "See result ›" : "Next ›";
    nextBtn.focus();
  }

  nextBtn.addEventListener("click", () => {
    idx++;
    if (idx >= qs.length) finishQuiz();
    else show();
  });

  function finishQuiz() {
    const pct = score / qs.length;
    const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
    const first = completeStation(t.id, stars);
    showStationComplete(t, stars, first, `You scored ${score} out of ${qs.length} on Christian discipleship.`);
  }

  show();
}

/* ============================================================
   12. SCRIPTURE viewer (illuminated manuscript)
   ============================================================ */

$("scripture-btn").addEventListener("click", () => {
  const t = state.activeTheme;
  if (!t) return;
  const passages = t.scripture.map((s) =>
    `<div class="ms-passage"><span class="ms-ref">${s.ref}</span><p class="ms-text">${s.text}</p></div>`
  ).join("");
  $("scripture-body").innerHTML = `
    <p class="ms-eyebrow">Set text · ${t.name}</p>
    <h3 id="scripture-heading" class="ms-title">From the Gospel of Mark</h3>
    ${passages}
    <p class="ms-foot">Scripture from the set texts for CCEA GCSE Religious Studies.</p>`;
  openModal($("scripture-modal"));
});

/* ============================================================
   13. INFO + MODALS
   ============================================================ */

function openInfo(html) { $("info-body").innerHTML = html; openModal($("info-modal")); }

function openModal(modal) {
  modal.hidden = false;
  const closer = modal.querySelector("[data-close]");
  if (closer && closer.focus) { /* leave focus to user */ }
}
function closeModal(modal) { modal.hidden = true; }

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target.dataset && e.target.dataset.close !== undefined) closeModal(modal);
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal").forEach((m) => { if (!m.hidden) closeModal(m); });
    const cel = $("celebrate");
    if (!cel.hidden && !cel.dataset.finale) closeCelebrate();
  }
});

/* ============================================================
   14. CELEBRATION (station complete + grand finale)
   ============================================================ */

const celebrate = $("celebrate");

function showStationComplete(t, stars, first, line) {
  if (stars >= 2) sfx.star();
  celebrate.dataset.theme = t.id;
  delete celebrate.dataset.finale;
  $("celebrate-icon").className = "celebrate-icon motif-" + t.motif;
  $("celebrate-title").textContent = `${t.name} — window lit!`;
  $("celebrate-text").textContent = line;
  $("celebrate-stars").innerHTML = starRow(stars);
  const allLit = Object.keys(state.lit).length === THEMES.length;
  const actions = $("celebrate-actions");
  actions.innerHTML = "";
  const cont = document.createElement("button");
  cont.type = "button"; cont.className = "primary-btn";
  cont.textContent = allLit ? "See the great rose ›" : "Back to the journey ›";
  cont.addEventListener("click", () => {
    closeCelebrate();
    goToMap();
    if (allLit && !state.finaleSeen) setTimeout(showFinale, 500);
  });
  actions.appendChild(cont);
  if (!allLit) {
    const retry = document.createElement("button");
    retry.type = "button"; retry.className = "ghost-btn dark";
    retry.textContent = "Play again";
    retry.addEventListener("click", () => { closeCelebrate(); openStation(t.id); });
    actions.appendChild(retry);
  }
  celebrate.hidden = false;
  requestAnimationFrame(() => celebrate.classList.add("show"));
}

function showFinale() {
  state.finaleSeen = true;
  sfx.finale();
  celebrate.dataset.finale = "1";
  $("celebrate-icon").className = "celebrate-icon motif-rose";
  $("celebrate-title").textContent = "The Gospel of Mark, complete";
  $("celebrate-text").innerHTML = "Every window is alight. You have journeyed through all five themes — the <strong>identity</strong> of Jesus, his <strong>miracles</strong>, his <strong>teaching</strong> of the Kingdom, his <strong>death and resurrection</strong>, and the call to <strong>discipleship</strong>. The whole story Mark tells: Jesus is the suffering Messiah, the Son of God, who came to serve, to save, and to rise.";
  $("celebrate-stars").innerHTML = "";
  const actions = $("celebrate-actions");
  actions.innerHTML = "";
  const done = document.createElement("button");
  done.type = "button"; done.className = "primary-btn";
  done.textContent = "Return to the journey";
  done.addEventListener("click", closeCelebrate);
  actions.appendChild(done);
  celebrate.hidden = false;
  requestAnimationFrame(() => celebrate.classList.add("show", "is-finale"));
}

function closeCelebrate() {
  celebrate.classList.remove("show", "is-finale");
  setTimeout(() => { celebrate.hidden = true; }, 300);
}

/* ============================================================
   15. SOUND TOGGLE + UTIL
   ============================================================ */

soundBtn.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  soundBtn.setAttribute("aria-pressed", String(state.soundOn));
  soundBtn.classList.toggle("muted", !state.soundOn);
  if (state.soundOn) sfx.place();
});

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ============================================================
   16. INIT
   ============================================================ */

buildMap();

})();
