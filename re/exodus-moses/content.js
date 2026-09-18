/* ============================================================
   Exodus and the Story of Moses — CONTENT (every pupil-facing string)
   Written by the design window (Fable 5.1, 18 Sep 2026). The build
   window wires this file; it does NOT reword it. Source of the
   questions, options and mark scheme: the teacher's quiz document
   (Eleain McIlduff, issue dgaj-g/ols-digital-skills-inbox#38).
   Plain script (no modules): defines window.EXODUS_CONTENT.
   ============================================================ */
window.EXODUS_CONTENT = {
  title: "Exodus and the Story of Moses",
  subtitle: "Year 9 RE · six questions · 10 marks",
  totalMarks: 10,

  cover: {
    instruction: "Write your name and class, then press Begin.",
    nameLabel: "Name",
    classLabel: "Class",
    namePlaceholder: "First name and surname",
    classPlaceholder: "e.g. 9B",
    begin: "Begin",
    nameMissing: "Write your name first.",
    howItWorks: "One question on each page. Answer it, press Check to see your mark, then move on. You get one go at each question.",
    resumeNotice: "You were part-way through this paper. Carrying on from question {letter}."
  },

  header: {
    marksSoFar: "Marks so far: {n} of 10",   /* aria-label on the lamp row */
    stage: "Question {letter}",              /* aria-label per stage dot */
    stageDone: "Question {letter}, answered",
    soundOn: "Sound on",
    soundOff: "Sound off"
  },

  buttons: {
    check: "Check",
    next: "Next question",
    finish: "See my marks",
    save: "Save as picture",
    saving: "Saving…",
    saveFallback: "Your paper opened in a new tab. Press and hold the picture to save it.",
    retry: "Try again",
    credits: "About the paintings",
    close: "Close"
  },

  marksWord: { one: "1 mark", many: "{n} marks" },
  marksOf: "{got} / {max}",

  /* ---------- the six pages ---------- */
  questions: [
    {
      letter: "A",
      topic: "Key terms",
      type: "match",           /* drag the three TERMS onto the three DEFINITION cards */
      marks: 3,
      stem: "Match the key term with the correct definition.",
      helper: "Drag each key term onto its definition, or tap a term and then tap a definition. Place all three, then press Check.",
      slotEmpty: "Drop a key term here",
      trayLabel: "Key terms",
      cardsLabel: "Definitions",
      image: { src: "images/qa-pharaoh-midwives.jpg", alt: "Painting of Pharaoh on his throne with two women kneeling before him.", caption: "James Tissot, Pharaoh and the Midwives, c. 1896–1902", focus: "50% 40%" },
      pairs: [
        { term: "Hebrew",   definition: "Member of the Israelite people" },
        { term: "Passover", definition: "Jewish religious festival" },
        { term: "Pharaoh",  definition: "Ruler of Egypt" }
      ],
      correctTermLabel: "Correct term: {term}",
      summary: { 3: "All three matched.", 2: "Two matched. One to learn.", 1: "One matched. Two to learn.", 0: "None matched this time." },
      teach: "Hebrew: a member of the Israelite people. Passover: the Jewish festival that remembers the night God freed the Israelites from Egypt. Pharaoh: the ruler of Egypt."
    },
    {
      letter: "B",
      topic: "The basket",
      type: "choice",
      marks: 1,
      stem: "Who is placing Moses in the river Nile?",
      helper: "Choose one answer, then press Check.",
      image: { src: "images/qb-moses-basket.jpg", alt: "Painting of a woman standing in the reeds of a river, lowering a baby in a basket onto the water.", caption: "James Tissot, Moses Laid Amid the Flags, c. 1896–1902", focus: "50% 70%" },
      options: [
        { text: "Moses' cousin", correct: false },
        { text: "Moses' mother", correct: true },
        { text: "Moses' sister", correct: false }
      ],
      right: "Right. It was Moses' mother. She hid him for three months, then laid him in a basket among the reeds of the Nile.",
      wrong: "Not this time. It was Moses' mother who placed him in the basket. His sister stood at a distance to watch what would happen to him."
    },
    {
      letter: "C",
      topic: "Why the Nile",
      type: "write",           /* four ruled lines; marked 0 / 1 / 2 by EXODUS_MARKER.markWhy */
      marks: 2,
      stem: "Why did she place Moses in the river Nile?",
      helper: "Write your answer in the box, then press Check.",
      placeholder: "Write one or two sentences.",
      image: { src: "images/qb-moses-basket.jpg", alt: "Painting of a woman standing in the reeds of a river, lowering a baby in a basket onto the water.", caption: "James Tissot, Moses Laid Amid the Flags, c. 1896–1902", focus: "50% 70%" },
      marker: "markWhy",
      feedback: {
        2: "Full marks. You gave the reason and the danger.",
        intentOnly: "One mark. You said what she was trying to do, but not what she was protecting him from.",
        threatOnly: "One mark. You named the danger, but not what she was trying to do.",
        0: "No marks this time. She placed him in the Nile to protect him from Pharaoh's order to kill the Hebrew baby boys."
      },
      schemeTitle: "Mark scheme",
      scheme: [
        "1 mark: a reason. To protect him. So he would be safe. To hide him.",
        "2 marks: the reason and the danger. To protect him from Pharaoh's order to kill Hebrew baby boys. So he would be safe from being killed. To hide him from the Egyptian soldiers."
      ],
      youWrote: "What you wrote"
    },
    {
      letter: "D",
      topic: "The burning bush",
      type: "choice",
      marks: 1,
      stem: "How does God describe himself at the burning bush?",
      helper: "Choose one answer, then press Check.",
      image: { src: "images/qd-burning-bush.jpg", alt: "Painting of Moses kneeling and shielding his face before a burning bush, with God appearing above in the clouds.", caption: "Sébastien Bourdon, Moses and the Burning Bush, 17th century", focus: "50% 45%" },
      options: [
        { text: "I am the bread of life.", correct: false },
        { text: "I am who I am.", correct: true },
        { text: "I am the way, the truth.", correct: false }
      ],
      right: "Yes. God told Moses “I am who I am” (Exodus 3:14). The other two sayings are words of Jesus in John's Gospel.",
      wrong: "No. At the burning bush God said “I am who I am” (Exodus 3:14). “I am the bread of life” and “I am the way, the truth and the life” are words of Jesus in John's Gospel."
    },
    {
      letter: "E",
      topic: "The first Passover",
      type: "choice",
      marks: 1,
      stem: "Which of these was NOT an instruction for the first Passover?",
      stemEmphasis: "NOT",   /* render this word in bold, as the teacher did */
      helper: "Choose one answer, then press Check.",
      image: { src: "images/qe-passover-door.jpg", alt: "Painting of a man in a red robe reaching up to mark the top of a doorway with a bunch of hyssop.", caption: "James Tissot, The Signs on the Door, c. 1896–1902", focus: "50% 35%" },
      options: [
        { text: "Be ready to leave at once.", correct: false },
        { text: "Eat unleavened bread.", correct: false },
        { text: "Put lamb's blood on the door post.", correct: false },
        { text: "Visit the Temple to worship God.", correct: true }
      ],
      right: "Right. There was no Temple yet. The Temple in Jerusalem was built centuries later, in King Solomon's time. The other three were God's instructions for the first Passover night.",
      wrong: "No. That was a real instruction. The one that was not is “Visit the Temple to worship God”. There was no Temple yet; it was built centuries later, in King Solomon's time."
    },
    {
      letter: "F",
      topic: "The plagues",
      type: "short",           /* two one-line answers, 1 mark each */
      marks: 2,
      stem: "The plagues of Egypt",
      helper: "Write both answers, then press Check.",
      image: { src: "images/qf-final-plague.jpg", alt: "Engraving of an angel standing over Egyptian families who are mourning on the steps of a house at night.", caption: "Gustave Doré, The Firstborn of the Egyptians Are Slain, 1866", focus: "50% 55%" },
      parts: [
        {
          label: "(i)",
          stem: "How many plagues were sent before Pharaoh let the Israelites go?",
          placeholder: "Write a number",
          marker: "markPlagueCount",
          right: "Ten plagues.",
          wrong: "There were ten plagues."
        },
        {
          label: "(ii)",
          stem: "Name the final plague.",
          placeholder: "Write the name",
          marker: "markFinalPlague",
          right: "The angel of death, which took the firstborn of Egypt.",
          wrong: "The final plague was the angel of death: the death of every Egyptian firstborn. After it, Pharaoh let the Israelites go."
        }
      ],
      youWrote: "What you wrote"
    }
  ],

  /* ---------- results scroll ---------- */
  results: {
    heading: "Your paper",
    nameLabel: "Name",
    classLabel: "Class",
    dateLabel: "Date",
    scoreLine: "{score} out of 10",
    perQuestion: "Question {letter}",
    yourAnswer: "You wrote: “{text}”",
    note: "Show this page to your teacher, or save it as a picture.",
    verdict: {
      10: "Full marks. A perfect paper.",
      8: "A strong paper. Read the feedback on the ones you missed.",
      5: "A fair paper. Try again and see if you can beat it.",
      0: "Read the feedback, then try the paper again."
    },
    retryConfirm: "Start the paper again? Your marks on this one will be cleared.",
    retryYes: "Yes, start again",
    retryNo: "Keep this paper"
  },

  credits: {
    heading: "About the paintings",
    intro: "All five pictures are public-domain works of art.",
    lines: [
      "James Tissot (1836–1902), Pharaoh and the Midwives; Moses Laid Amid the Flags; The Signs on the Door. From The Old Testament series, The Jewish Museum, New York.",
      "Sébastien Bourdon (1616–1671), Moses and the Burning Bush.",
      "Gustave Doré (1832–1883), The Firstborn of the Egyptians Are Slain, from the 1866 illustrated Bible."
    ]
  }
};
