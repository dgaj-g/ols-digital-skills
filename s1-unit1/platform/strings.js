/* strings.js — every pupil and staff string on the page. S is the prototype's S verbatim (SPEC §3); X holds the guard,
 * system and staff lines (SPEC §3.1, §3.8, §3.9 / ARCH). G3 (gates/g3-strings.js) proves both word for word. */
var S1S = {
  S: { // every pupil string, verbatim from the prototype (SPEC §3); G3 checks it
    app: "OLS Unit 1 Revision", hello: "Hello, ", staff: "Staff", home: "Unit 1 revision", later: "Comes later", open: "Open",
    liveMeta: "4 stages · 82 questions · 126 marks", back: "Back to my topics",
    topicLine: "Answer every question in each stage. You see the mark scheme straight after each answer.",
    earlier: "Earlier rounds", lookback: "Look back", start: "Start", carry: "Carry on", openedBy: " · opened by your teacher",
    notStarted: "Not started", inProg: "In progress · {a} of {b} done", done: "Done · {m} of {x} marks",
    stagebar: "Stage {s} of 4 · {name} · Question {i} of {n}",
    pick1: "Pick one.", pick2: "Pick two.", pick3: "Pick three.", only2: "You can only pick two.", only3: "You can only pick three.",
    writeFirst: "Write your answer in your own words first.", writeNote: "This writing is not marked. The marked parts come next.", writeDone: "I've written my answer", writeKept: "Your writing is kept. Now answer the marked parts below.", wroteHint: "Compare it with the mark scheme above.", writePh: "Type your answer here.", skipWrite: "I'd rather skip the writing",
    typeIt: "Type your answer.", idk: "I don't know", pairs: "Match each one on the left to one on the right.", choose: "Choose…",
    chooseLine: "Pick the right word in each line.", gapsPool: "Fill each gap with a word from the list.", gapsType: "Fill each gap.",
    check: "Check my answer", help: "Answer every part first.", got: "You got {m} of {x} {w}.", mark: "mark", marks: "marks",
    scheme: "Mark scheme", wrote: "What you wrote", flag: "I still don't get this one", next: "Next question", finish: "Finish the stage",
    howGo: "How did it go?", closest: "Pick the one that is closest:", rates: ["I couldn't do most of these", "I got some, but I'm not sure why", "I got most of these", "I could explain these to someone else"],
    tick: "Tick what you can do now:", added: "Is there anything else you'd like to add?", addPh: "Type it here, in a few words.",
    saveCarry: "Save and carry on", wholeTopic: "Digital Data — the whole topic", unsure: "Is there any part you are still unsure about?", fine: "No, I'm fine with all of it",
    anything: "Anything else your teacher should know?", saveSee: "Save and see my marks", scored: "You scored {m} of {x} marks ({p}%)", flagged: "Questions you flagged", noFlag: "You flagged nothing.",
    round: "Round ", rateErr: "Pick the one that is closest before you carry on."
  },
  TOPICS: ["Digital data", "Software", "Database applications", "Spreadsheet applications", "Computer hardware", "Network technologies", "Cyberspace, network security and data transfer", "Cloud computing", "Ethical, legal and environmental impact"],
  X: {
    signing: "Signing you in with your school account…",
    nameAsk: "We could not read your name from your account. Type your first name so your teacher can see it:", nameGo: "Continue",
    domain: "This site is for Our Lady's pupils and staff signed in with a C2k account.",
    noClass: "This link is not for a class. Ask your teacher for the class link.",
    saving: "Saving…", offline: "We can't reach the server. Check the Wi-Fi, then press Try again.", retry: "Try again",
    expired: "Your sign-in has expired. Reload the page.",
    pass: "Staff passcode", enter: "Enter", badPass: "Passcode not recognised.",
    tabs: ["Classes", "Rounds", "Tracker", "Export"], className: "Class name", classPh: "11A DT", make: "Create",
    roundOpen: "Digital Data · Round {n} open", openClass: "Open round {n} for the class", openPupil: "Open round {n} for one pupil",
    csv: "Download CSV", flagHigh: "Thinks it's fine, isn't", flagLow: "Doing fine, doesn't think so"
  }
};
