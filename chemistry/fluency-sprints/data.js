/* ============================================================================
   Fluency Sprints — content data
   Four CCEA KS3 (Year 8) chemistry data sets, transcribed verbatim from the
   requesting teacher's PowerPoint. Each item carries:
     - term            the word/phrase shown in the LEFT column
     - pictogramId     (hazard set only) which GHS symbol to draw
     - definitions[]   ALL acceptable correct definitions (primary first; any
                       teacher-marked "Alternative" answers follow)
     - distractors[]   plausible-but-imprecise wrong versions, each with the
                       teacher's red-italics "reason" it is incorrect
   The distractors are the heart of the activity: spotting the precise definition
   over the tempting wrong one is the lesson, and is what makes a zero-knowledge
   match impossible.
   ========================================================================== */

/* GHS hazard pictograms — original SVG recreations of the public-domain UN GHS
   symbols (the teacher's clipart was copyrighted, so these are drawn fresh). */
window.FLUENCY_PICTOGRAMS = {
  corrosive: '<svg viewBox="0 0 100 100" class="ghs" aria-hidden="true"><polygon points="50,3 97,50 50,97 3,50" fill="#d4101a"/><polygon points="50,12 88,50 50,88 12,50" fill="#fff"/><g fill="#161616"><g stroke="#161616" stroke-linecap="round"><line x1="47" y1="28" x2="34" y2="44" stroke-width="6"/><line x1="31" y1="41" x2="37" y2="47" stroke-width="3"/><line x1="53" y1="28" x2="66" y2="44" stroke-width="6"/><line x1="69" y1="41" x2="63" y2="47" stroke-width="3"/></g><circle cx="32" cy="51" r="1.9"/><circle cx="31" cy="56" r="1.5"/><circle cx="68" cy="51" r="1.9"/><circle cx="69" cy="56" r="1.5"/><path d="M15 64 h21 v8 h-21 z"/><path d="M23 64 l2.8 -5 2.8 5 z" fill="#fff"/><rect x="62" y="62" width="19" height="11" rx="3"/><circle cx="65" cy="61.5" r="2.4"/><circle cx="69.5" cy="61" r="2.6"/><circle cx="74" cy="61" r="2.6"/><circle cx="78.5" cy="61.5" r="2.4"/><path d="M62 66 q-4.5 0 -4.5 4.4 q3.2 1 4.5 -1.4 z"/><circle cx="71" cy="67" r="2.3" fill="#fff"/></g></svg>',
  caution: '<svg viewBox="0 0 100 100" class="ghs" aria-hidden="true"><polygon points="50,3 97,50 50,97 3,50" fill="#d4101a"/><polygon points="50,12 88,50 50,88 12,50" fill="#fff"/><rect x="44.5" y="29" width="11" height="33" rx="5.5" fill="#161616"/><circle cx="50" cy="71" r="6.4" fill="#161616"/></svg>',
  toxic: '<svg viewBox="0 0 100 100" class="ghs" aria-hidden="true"><polygon points="50,3 97,50 50,97 3,50" fill="#d4101a"/><polygon points="50,12 88,50 50,88 12,50" fill="#fff"/><g fill="#161616"><path d="M50 28 c-11 0 -19 8 -19 18 c0 6 3 10 7 13 l0 5 c0 1.6 1.3 3 3 3 l0 -4 l3 0 l0 4 l4 0 l0 -4 l4 0 l0 4 l4 0 l0 -4 l3 0 l0 4 c1.7 0 3 -1.4 3 -3 l0 -5 c4 -3 7 -7 7 -13 c0 -10 -8 -18 -19 -18 z"/><circle cx="42" cy="45" r="5.4" fill="#fff"/><circle cx="58" cy="45" r="5.4" fill="#fff"/><path d="M50 52 l2.4 5 l-4.8 0 z" fill="#fff"/></g><g stroke="#161616" stroke-width="5.2" stroke-linecap="round"><line x1="29" y1="74" x2="71" y2="83"/><line x1="71" y1="74" x2="29" y2="83"/></g><g fill="#161616"><circle cx="29" cy="74" r="4.4"/><circle cx="71" cy="74" r="4.4"/><circle cx="71" cy="83" r="4.4"/><circle cx="29" cy="83" r="4.4"/></g></svg>',
  flammable: '<svg viewBox="0 0 100 100" class="ghs" aria-hidden="true"><polygon points="50,3 97,50 50,97 3,50" fill="#d4101a"/><polygon points="50,12 88,50 50,88 12,50" fill="#fff"/><g fill="#161616"><rect x="32" y="74" width="36" height="4.6" rx="2.3"/><path d="M52 72 c11 -4 16 -13 14 -24 c-1 -5 -5 -9 -5 -9 c0 7 -4 9 -5 9 c1 -10 -4 -19 -12 -27 c-1 6 -3 12 -8 17 c-4 4 -7 9 -7 16 c0 11 9 18 18 19 c-5 -3 -7 -8 -6 -13 c1 -3 3 -6 6 -8 c-2 5 -1 9 2 12 c3 3 5 6 4 10 c0 0 5 -2 7 -6 c-7 1 -9 -3 -8 -7 c1 -3 3 -5 6 -7 c-2 6 1 11 5 13 c-2 5 -7 9 -16 11 z"/></g></svg>',
  explosive: '<svg viewBox="0 0 100 100" class="ghs" aria-hidden="true"><polygon points="50,3 97,50 50,97 3,50" fill="#d4101a"/><polygon points="50,12 88,50 50,88 12,50" fill="#fff"/><g fill="#161616"><path d="M50 24 l4 13 11 -8 -5 13 14 1 -12 7 12 9 -15 -1 4 14 -10 -11 -8 12 -1 -15 -14 5 9 -11 -13 -5 14 -3 -10 -10 13 3 z"/><circle cx="50" cy="56" r="13"/></g><g stroke="#161616" stroke-width="2.6" fill="none" stroke-linecap="round"><path d="M50 43 q5 -7 2 -13 q7 -2 5 -8"/></g><circle cx="58" cy="22" r="3" fill="#161616"/></svg>'
};

window.FLUENCY_DATA = [
  {
    id: 'hazard-symbols',
    title: 'Hazard Symbols',
    blurb: 'Match each warning symbol to exactly what it means.',
    leftHeader: 'Hazard symbol',
    accent: '#d4101a',
    icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 44 40 4 40Z" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linejoin="round"/><rect x="22" y="18" width="4" height="11" rx="2" fill="currentColor"/><circle cx="24" cy="34" r="2.4" fill="currentColor"/></svg>',
    hasPictograms: true,
    items: [
      { term: 'corrosive', pictogramId: 'corrosive',
        definitions: ['can attack and destroy living tissue, such as skin and eyes'],
        distractors: [{ text: 'can burn your skin and melt through metal', reason: 'This idea is too imprecise, it does contain the idea of reaction with metals but does not explain the depth of danger to the human body' }] },
      { term: 'caution', pictogramId: 'caution',
        definitions: ['may cause an allergic skin reaction'],
        distractors: [{ text: 'will make your skin itchy and give you a rash', reason: 'The definition begins with the word MAY not WILL. Sometimes no reaction occurs' }] },
      { term: 'toxic', pictogramId: 'toxic',
        definitions: ['can cause death if it is swallowed, breathed in or absorbed by the skin'],
        distractors: [{ text: 'Poisonous, causes death', reason: 'This is very vague, the chemical must enter your system before it reacts' }] },
      { term: 'flammable', pictogramId: 'flammable',
        definitions: ['can catch fire easily'],
        distractors: [{ text: 'keep away from a naked flame', reason: 'This is a safety precaution and not the definition of the hazard symbol' }] },
      { term: 'explosive', pictogramId: 'explosive',
        definitions: ['is likely to explode'],
        distractors: [{ text: 'Explodes and can blow things up', reason: 'This is too definitive. It may explode under certain conditions' }] }
    ]
  },
  {
    id: 'chemical-solutions',
    title: 'Chemical Solutions',
    blurb: 'Dissolving, solutes and solvents — get the wording exact.',
    leftHeader: 'Chemical term',
    accent: '#2f8f6b',
    icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M19 6h10v12l8 16a5 5 0 0 1-4.6 7H15.6A5 5 0 0 1 11 34l8-16Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M14 30h20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="35" r="1.7" fill="currentColor"/><circle cx="28" cy="38" r="1.4" fill="currentColor"/></svg>',
    items: [
      { term: 'insoluble',
        definitions: ['describes a substance that does not dissolve'],
        distractors: [{ text: 'A solid which does not dissolve in water', reason: 'This is incorrect as the substance may be a solid, a liquid or a gas. In addition, the solvent may be another chemical not necessarily water.' }] },
      { term: 'solution',
        definitions: ['a mixture of a dissolved solute in a solvent'],
        distractors: [{ text: 'A mixture of a solid and a liquid.', reason: 'The essential term mixture is present in this definition, but the terms solid and liquid are restricting. The chemical terms solute and solvent convey a deeper understanding of the process of becoming a solution.' }] },
      { term: 'soluble',
        definitions: ['describes a substance that dissolves'],
        distractors: [{ text: 'When a solid dissolves in a liquid.', reason: 'This sentence does not focus on the substance that dissolves. It mentions two different substances.' }] },
      { term: 'saturated solution',
        definitions: ['a solution which cannot dissolve anymore solute at a given temperature'],
        distractors: [{ text: 'a solution which cannot dissolve anymore solute.', reason: 'This definition can be accepted in Year 8. However, the addition of temperature makes it more precise. Can you work out why?' }] },
      { term: 'solute',
        definitions: ['a substance that is dissolved'],
        distractors: [{ text: 'The substance that does the dissolving.', reason: 'Very imprecise, sometimes students use this phrase to describe the solvent also! Can you appreciate the need for very precise language?' }] },
      { term: 'solvent',
        definitions: ['a liquid which can dissolve other substances'],
        distractors: [{ text: 'The substance that does the dissolving.', reason: 'Very imprecise, sometimes students use this phrase to describe the solute also! Can you appreciate the need for very precise language?' }] }
    ]
  },
  {
    id: 'acids-bases-salts',
    title: 'Acids, Bases & Salts',
    blurb: 'pH ranges and reactions — precision really counts.',
    leftHeader: 'Chemical term',
    accent: '#c0392b',
    icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5C24 5 13 18 13 28a11 11 0 0 0 22 0C35 18 24 5 24 5Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M20 27l8 8M28 27l-8 8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    items: [
      { term: 'acid',
        definitions: ['A substance which reacts with a base to form a salt and water only', 'A substance with a pH in the range 0-6'],
        distractors: [{ text: 'A substance with a sour taste', reason: 'Yes, acids which are safe to taste such as lemon juice are sour, but a taste test is inappropriate for corrosive substances.' }] },
      { term: 'base',
        definitions: ['A substance which reacts with an acid to form a salt and water only'],
        distractors: [{ text: 'A substance with a pH in the range 7-14', reason: 'Some bases are insoluble and therefore do not have a pH, pH can only be measured in solution' }] },
      { term: 'alkali',
        definitions: ['A soluble base', 'A substance with a pH in the range 7-14'],
        distractors: [] },
      { term: 'weak acid',
        definitions: ['A substance with a pH in the range 3-6'],
        distractors: [{ text: 'A substance with a pH in the range 4-6', reason: 'The range is too narrow here' }] },
      { term: 'weak alkali',
        definitions: ['A substance with a pH in the range 8-11'],
        distractors: [{ text: 'A substance with a pH in the range 8-12', reason: 'The range is too broad here' }] },
      { term: 'strong acid',
        definitions: ['A substance with a pH in the range 0-2'],
        distractors: [{ text: 'A substance with a pH in the range 0-3', reason: 'The range is too broad here' }] },
      { term: 'strong base',
        definitions: ['A substance with a pH in the range 12-14'],
        distractors: [{ text: 'A substance with a pH in the range 13-14', reason: 'The range is too narrow here' }] }
    ]
  },
  {
    id: 'elements-compounds-mixtures',
    title: 'Elements, Compounds & Mixtures',
    blurb: 'The building blocks — simpler vs smaller, atom vs element.',
    leftHeader: 'Chemical term',
    accent: '#6c5ce7',
    icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="3.4" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="2.6"><ellipse cx="24" cy="24" rx="18" ry="7"/><ellipse cx="24" cy="24" rx="18" ry="7" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="18" ry="7" transform="rotate(120 24 24)"/></g></svg>',
    items: [
      { term: 'element',
        definitions: ['A substance which cannot be broken down into anything simpler by chemical means.', 'a substance which contains one type of atom'],
        distractors: [
          { text: 'A substance which cannot be broken down into anything smaller by chemical means', reason: 'Smaller in this context does not have the same meaning as simpler. Something smaller can be just as complicated.' },
          { text: 'A substance which contains one atom', reason: 'The term type of atom is essential.' }
        ] },
      { term: 'compound',
        definitions: ['A substance which contains two or more elements which are chemically combined', 'A substance which contains two or more types of atoms which are chemically combined'],
        distractors: [
          { text: 'A substance which contains two elements combined', reason: 'Compounds can have more than two elements and chemical bonding must be clear.' },
          { text: 'A substance which contains two or more atoms chemically combined.', reason: 'The atoms have to be different types for the substance to be a compound.' }
        ] },
      { term: 'mixture',
        definitions: ['A substance which can be separated easily'],
        distractors: [] },
      { term: 'atom',
        definitions: ['the smallest part of an element that can exist on its own'],
        distractors: [{ text: 'A substance which cannot be broken down into anything simpler by chemical means.', reason: 'This is the definition of an element not of an atom' }] }
    ]
  }
];
