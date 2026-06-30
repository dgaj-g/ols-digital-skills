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

/* GHS hazard pictograms — official public-domain UN GHS symbols
   (Wikimedia Commons), used as images in assets/ghs/. List of valid ids: */
window.FLUENCY_PICTOGRAMS = ['corrosive', 'caution', 'toxic', 'flammable', 'explosive'];

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
