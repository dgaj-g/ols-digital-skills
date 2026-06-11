/* =========================================================================
   Costa Rica: A Sustainable Tourism Success Story?
   Content data — every fact traces to the teacher's source material
   (Monteverde Cloud Forest case study + CCEA spec extract + CCEA
   exemplification material). CCEA GCE Geography, A2 Unit 2: Tourism §3.
   ========================================================================= */

const DATA = {

  meta: {
    title: 'Costa Rica: A Sustainable Tourism Success Story?',
    examTag: 'CCEA GCE Geography · A2 Unit 2 · Tourism',
    caseStudy: 'Monteverde Cloud Forest Reserve, Costa Rica'
  },

  /* ---------------------------------------------------------------
     Briefing dossier (intro screen)
     --------------------------------------------------------------- */
  briefing: {
    role: 'Sustainability Auditor',
    mission: 'The Tropical Science Center has commissioned an independent audit of ecotourism in the Monteverde Cloud Forest Reserve. Travel to Costa Rica, gather the evidence on the ground, weigh the benefits against the negative impacts, and deliver your verdict: is Monteverde really a sustainable tourism success story?',
    dossier: [
      { icon: '🌲', label: 'Reserve', value: '26,000-acre cloud forest reserve' },
      { icon: '🦜', label: 'Biodiversity', value: '3,000 plant species · 755 tree varieties · 400 bird species · 100 mammals · 120 reptiles' },
      { icon: '🏘️', label: 'Community', value: '6,800 people live in the Monteverde region' },
      { icon: '🔬', label: 'Management', value: 'Tropical Science Center — promoting sustainable ecotourism since 1962' },
      { icon: '🧳', label: 'Visitors', value: '70,000 tourists every year' }
    ]
  },

  /* ---------------------------------------------------------------
     Station 1 — Reserve Gate: define ecotourism + entry quiz
     --------------------------------------------------------------- */
  gate: {
    // Definition assembly: drag the correct chip into each blank.
    // Sentence: "___ travel to ___ that ___ the environment and ___ the well-being of ___."
    definitionParts: [
      { before: '', slot: 'd1' },
      { before: ' travel to ', slot: 'd2' },
      { before: ' that ', slot: 'd3' },
      { before: ' the environment and ', slot: 'd4' },
      { before: ' the well-being of ', slot: 'd5' },
      { before: '.', slot: null }
    ],
    definitionChips: [
      { id: 'c1', text: 'Responsible', target: 'd1' },
      { id: 'c2', text: 'natural areas', target: 'd2' },
      { id: 'c3', text: 'conserves', target: 'd3' },
      { id: 'c4', text: 'improves', target: 'd4' },
      { id: 'c5', text: 'local people', target: 'd5' },
      { id: 'x1', text: 'All-inclusive', target: null },
      { id: 'x2', text: 'luxury resorts', target: null },
      { id: 'x3', text: 'advertises', target: null },
      { id: 'x4', text: 'showcases', target: null },
      { id: 'x5', text: 'tour operators', target: null }
    ],
    definitionFeedback: 'Ecotourism: responsible travel to natural areas that conserves the environment and improves the well-being of local people. Learn this word-for-word — "define ecotourism" is the first learning outcome in the spec.',
    quiz: [
      {
        q: 'Who has managed the reserve and promoted sustainable ecotourism there since 1962?',
        options: [
          { text: 'The Tropical Science Center', correct: true },
          { text: 'The Costa Rican Ministry of Tourism', correct: false },
          { text: 'The Monteverde Institute', correct: false },
          { text: 'A consortium of UK travel operators', correct: false }
        ],
        feedback: 'The reserve is managed by the Tropical Science Center, an environmental organisation that has promoted sustainable ecotourism in the area since 1962.'
      },
      {
        q: 'How many tourists visit the Monteverde reserve each year?',
        options: [
          { text: '70,000', correct: true },
          { text: '450', correct: false },
          { text: '8,000', correct: false },
          { text: '700,000', correct: false }
        ],
        feedback: '70,000 tourists a year — and growth has been dramatic: just 450 visited in 1975 and 8,000 in 1985.'
      },
      {
        q: 'How much of the forest is accessible to tourists?',
        options: [
          { text: 'Only 2%, via 6 main trails totalling 13 km', correct: true },
          { text: '13%, via 6 main trails', correct: false },
          { text: 'Around 26%', correct: false },
          { text: '80% — only the core is closed', correct: false }
        ],
        feedback: 'Only 2% of the forest is accessible, via 6 main trails with a 13 km total length. The rest is an "absolute protection zone" where flora and fauna grow without human interference.'
      }
    ]
  },

  /* ---------------------------------------------------------------
     Station 2 — The Field Investigation: photo-evidence interpretation.
     Real photographs of the case study; each asks the pupil to read the
     image as geographical evidence — the resource-interpretation skill
     CCEA papers test. One scored attempt per photo, then a teaching note.
     All images: Wikimedia Commons (see imageCredits below).
     --------------------------------------------------------------- */
  field: {
    intro: 'Six real photographs from the Monteverde case study have come back from the field. An auditor does not just look — she reads each image as evidence. For every photograph, choose what it actually proves about the reserve.',
    photos: [
      {
        id: 'boundary',
        img: 'assets/reserve-boundary.jpg',
        alt: 'Satellite image of the Monteverde Cloud Forest Reserve showing dark green protected forest beside pale brown cleared farmland.',
        caption: 'Satellite view — the reserve boundary runs through the scene (Copernicus Sentinel-2).',
        q: 'The dark-green forest on the right meets pale, patchy farmland on the left. What does this sharp contrast prove?',
        options: [
          { text: 'Reserve status has halted deforestation — intact forest inside, cleared farmland outside.', correct: true },
          { text: 'Both sides are protected; the colour difference is only cloud shadow.', correct: false },
          { text: 'The reserve itself has been heavily logged, leaving the pale patches.', correct: false }
        ],
        note: 'Less than 2% of the forest has been cut down since 1990. Protection is so effective the boundary is visible from space — logging, farming and deforestation stop at the reserve edge.',
        section: 'Benefits'
      },
      {
        id: 'quetzal',
        img: 'assets/quetzal.jpg',
        alt: 'A male Resplendent Quetzal, a bird with iridescent green plumage, a red breast and long tail streamers, perched on a branch.',
        caption: 'The Resplendent Quetzal — the most sought-after of Monteverde’s 400 bird species.',
        q: 'Tourists travel across the world to glimpse this bird. What does that make Monteverde’s biodiversity?',
        options: [
          { text: 'An economic asset — the 400 bird species are the “product” conserving the forest pays to protect.', correct: true },
          { text: 'A nuisance that tourism exists to control and reduce.', correct: false },
          { text: 'Irrelevant to tourism — visitors come only for the lodges.', correct: false }
        ],
        note: 'The reserve protects 400 bird species and 91 migratory species. Biodiversity is the reason 70,000 tourists come — conserving it is what sustains the income, so ecotourism and conservation reinforce each other.',
        section: 'Benefits'
      },
      {
        id: 'toad',
        img: 'assets/golden-toad.jpg',
        alt: 'A bright orange golden toad on a green leaf — a species now extinct.',
        caption: 'The golden toad — found only in Monteverde, and now extinct. This photograph is historic.',
        q: 'This species lived nowhere else on Earth and is now gone. What should an honest auditor conclude?',
        options: [
          { text: 'Even a protected reserve cannot guarantee survival — ecotourism’s environmental record is genuinely mixed.', correct: true },
          { text: 'Its extinction proves ecotourism is completely harmless to wildlife.', correct: false },
          { text: 'It proves the reserve has no biodiversity left worth protecting.', correct: false }
        ],
        note: 'The golden toad’s extinction is cited as an environmental negative. A reserve protects habitat, but vulnerable species can still be lost — top-level evaluation acknowledges the failures alongside the successes.',
        section: 'Negative impacts'
      },
      {
        id: 'bridge',
        img: 'assets/suspension-bridge.jpg',
        alt: 'A long green metal suspension bridge stretching through the forest canopy.',
        caption: 'A canopy suspension bridge — a signature Monteverde attraction.',
        q: 'Bridges like this are marketed as eco-friendly. What is their real environmental advantage — and the catch?',
        options: [
          { text: 'They minimise footfall on the fragile forest floor — but they disturb canopy species such as the toucan.', correct: true },
          { text: 'They are made of recycled plastic, so they have no impact whatsoever.', correct: false },
          { text: 'They remove the need for any ground-level trails at all.', correct: false }
        ],
        note: 'Suspension walkways protect ground-level vegetation — a real benefit — yet they disturb the habitats of canopy-based species. A textbook “however”: a benefit and a drawback in one feature.',
        section: 'Evaluation toolkit'
      },
      {
        id: 'trail',
        img: 'assets/forest-trail.jpg',
        alt: 'A narrow earthen trail winding through dense, misty cloud-forest vegetation.',
        caption: 'One of the reserve’s marked trails through the cloud forest.',
        q: 'Trails like this are the only routes open to visitors. How much of the reserve can tourists actually enter?',
        options: [
          { text: 'Only about 2% — via 6 main trails totalling 13 km; the rest is an absolute protection zone.', correct: true },
          { text: 'Around 80% — only the steepest slopes are closed off.', correct: false },
          { text: 'All of it — there are no restrictions on where visitors may walk.', correct: false }
        ],
        note: '6 trails, 13 km, roughly 2% of the forest. The remaining 98% is an “absolute protection zone” where flora and fauna grow without human interference — carefully managed carrying capacity.',
        section: 'Background'
      },
      {
        id: 'town',
        img: 'assets/santa-elena.jpg',
        alt: 'The small town centre of Santa Elena, Monteverde, with shops, parked minibuses and people on the street.',
        caption: 'Santa Elena — the town that serves the reserve.',
        q: 'Tourism has transformed this town. Which is the genuine social impact recorded in the case study?',
        options: [
          { text: 'Its population has grown by 50% since 2005 — bringing wealth, but also social tensions and a “drinking culture”.', correct: true },
          { text: 'It was abandoned because tourism made the cost of living impossible for everyone.', correct: false },
          { text: 'Tourism has had no measurable effect on the town at all.', correct: false }
        ],
        note: 'The population grew 50% since 2005; “outsiders” from San José brought city culture, and with it a drinking culture and community tensions. Social impacts cut both ways — more income, but real strain.',
        section: 'Negative impacts'
      }
    ]
  },

  /* Image attribution (Wikimedia Commons) — CC BY-SA / public domain. */
  imageCredits: [
    { what: 'Resplendent Quetzal', who: 'Giles Laurent', lic: 'CC BY-SA 4.0' },
    { what: 'Satellite — reserve boundary', who: 'European Union, Copernicus Sentinel-2', lic: 'Copernicus / attribution' },
    { what: 'Golden toad', who: 'Charles H. Smith (US FWS)', lic: 'Public domain' },
    { what: 'Suspension bridge', who: 'Katherine Baumann', lic: 'CC BY-SA 4.0' },
    { what: 'Forest trail', who: 'Cephas', lic: 'CC BY-SA 4.0' },
    { what: 'Santa Elena town', who: 'Erebus555', lic: 'CC BY-SA 3.0' },
    { what: 'Cloud-forest backdrop', who: 'Cephas', lic: 'CC BY-SA 4.0' }
  ],

  /* ---------------------------------------------------------------
     Station 3 — Evidence Trail: classify the BENEFITS
     Drag each evidence card into Social / Economic / Environmental.
     --------------------------------------------------------------- */
  benefits: {
    categories: [
      { id: 'social', label: 'Social benefits' },
      { id: 'economic', label: 'Economic benefits' },
      { id: 'environmental', label: 'Environmental benefits' }
    ],
    cards: [
      { id: 'b1', target: 'economic',
        text: 'Every visitor pays a $15 entrance fee — $890,000 a year that is reinvested in conservation and community projects.',
        why: 'Money flowing into the local economy. This "substantial fiscal resource" helps stimulate the economic multiplier effect.' },
      { id: 'b2', target: 'economic',
        text: '500 full-time and 180 part-time jobs created directly in tourism — guides, shops, restaurants and eco-lodges.',
        why: 'Employment is an economic benefit — wages in tourism are higher than in coffee or banana plantations or dairy farming.' },
      { id: 'b3', target: 'economic',
        text: '80% of ecotourism profits were retained in the Monteverde area in 2015, reinvested in roads, schools and medical services.',
        why: 'Retaining profits locally is the opposite of leakage — the money keeps working inside the local economy.' },
      { id: 'b4', target: 'social',
        text: '3 bilingual schools have opened in Monteverde, giving local people English language skills.',
        why: 'Education is a social benefit — it changes people’s lives and opportunities, not just their income.' },
      { id: 'b5', target: 'social',
        text: 'The Monteverde Institute, funded by ecotourism profits, has rejuvenated local interest in traditional art.',
        why: 'Cultural preservation is a social benefit — visitors flock to see this art, encouraging Costa Ricans to preserve their culture.' },
      { id: 'b6', target: 'social',
        text: 'With higher wages, local people have greater access to education and health care.',
        why: 'Access to services improves quality of life — a social benefit growing out of economic success.' },
      { id: 'b7', target: 'environmental',
        text: 'Less than 2% of the forest has been cut down since 1990 — logging, farming and deforestation have been halted.',
        why: 'Conservation of the forest itself — reserve status has stopped deforestation, illegal logging, hunting and mining.' },
      { id: 'b8', target: 'environmental',
        text: 'The ecological carrying capacity of tours is monitored by the Tropical Science Center, reducing trampling and disturbance.',
        why: 'Active environmental management — monitoring keeps visitor pressure within what the ecosystem can stand.' },
      { id: 'b9', target: 'environmental',
        text: 'Lodges like Finca Luna Nueva run on renewable energy, recycling and water conservation.',
        why: 'Sustainable living principles in the lodges directly reduce the environmental footprint of tourism.' }
    ]
  },

  /* ---------------------------------------------------------------
     Station 4 — The Shadow Files: connect NEGATIVE evidence
     to the spec's named concepts (red-string detective board).
     --------------------------------------------------------------- */
  shadow: {
    pins: [
      { id: 'displacement', label: 'Displacement of local communities', strand: 'Social' },
      { id: 'indigenous', label: 'Threats to indigenous cultures', strand: 'Social' },
      { id: 'leakage', label: 'Leakage', strand: 'Economic' },
      { id: 'greenwash', label: 'Greenwashing', strand: 'Environmental' },
      { id: 'damage', label: 'Damage to fragile environments', strand: 'Environmental' }
    ],
    cards: [
      { id: 's1', target: 'displacement',
        text: 'House prices in Monteverde rose 18% between 2010 and 2017 while wages grew only 6%.',
        why: 'Local young people are priced out of buying and building homes — communities are displaced by tourism-driven land values.' },
      { id: 's2', target: 'displacement',
        text: 'Land around Santa Elena now costs $85–$100 per square metre — many locals can no longer afford land.',
        why: 'When locals can no longer afford to live where they grew up, that is displacement of local communities.' },
      { id: 's3', target: 'indigenous',
        text: 'The skill of rubber tapping is at risk as generations stop teaching it to their children.',
        why: 'Traditional ways of life and working are lost as people move into the service sector to cater for ecotourists.' },
      { id: 's4', target: 'indigenous',
        text: 'The rush to learn English for tourism work is threatening local Spanish-speaking Costa Rican culture.',
        why: 'Even language shift counts as a threat to indigenous culture — the spec names this explicitly.' },
      { id: 's5', target: 'leakage',
        text: '20% of lodges and businesses are foreign-owned, draining revenue out of Costa Rica.',
        why: 'Leakage: profit that escapes the local economy. A fiscal drain from the community — the spec’s named economic negative.' },
      { id: 's6', target: 'leakage',
        text: 'An estimated 300 UK travel operators take a share of the 100,000 UK eco-holidays to Costa Rica each year.',
        why: 'Global tourism companies on the "ecotourism bandwagon" capture income before it ever reaches Monteverde.' },
      { id: 's7', target: 'greenwash',
        text: 'Some resorts use eco-labels and biodegradable soap to appear green, while doing very little overall for the environment.',
        why: 'Greenwashing: marketing an eco-image while still consuming mass amounts of water and electricity and emitting CO₂.' },
      { id: 's8', target: 'greenwash',
        text: 'Even the most eco-friendly lodges have a significant carbon footprint.',
        why: 'A green certificate does not equal zero impact — examiners reward candidates who can see past the label.' },
      { id: 's9', target: 'damage',
        text: 'In 2013 an illegal tourist campfire spread out of control, destroying 66 hectares of forest, quetzal nesting sites and 35 porcupines.',
        why: 'Direct damage to a fragile environment — one careless group caused lasting ecological loss.' },
      { id: 's10', target: 'damage',
        text: 'Zip lines and canopy walkways disturb wildlife — monkeys have become garbage feeders and the Golden Toad is extinct.',
        why: 'Even "low-impact" attractions disturb canopy habitats; vulnerable species pay the price.' }
    ]
  },

  /* ---------------------------------------------------------------
     Station 5 — The "However" Workshop: evaluation skill.
     Pair each claim with the counterpoint that genuinely challenges it.
     Two decoys are true statements but NOT counterpoints.
     --------------------------------------------------------------- */
  however: {
    advisor: 'Evaluation needs a judgement: which is the most important benefit, and which type — economic, social or environmental — is greatest overall? For extra depth, "however" phrases show judgement: alluding to counterpoints without needing to detail to whom and how much.',
    claims: [
      { id: 'h1', text: 'Every visitor pays a $15 entrance fee, raising $890,000 a year for conservation.',
        counterId: 'k1' },
      { id: 'h2', text: '80% of ecotourism profits are retained in the Monteverde area.',
        counterId: 'k2' },
      { id: 'h3', text: 'Hundreds of tourism jobs have been created, and guides out-earn plantation workers.',
        counterId: 'k3' },
      { id: 'h4', text: 'Suspension walkways protect ground-level vegetation and animal species.',
        counterId: 'k4' },
      { id: 'h5', text: 'Living standards have risen as locals earn higher wages in tourist services.',
        counterId: 'k5' },
      { id: 'h6', text: 'Only 2% of the reserve is open to tourists — the rest is absolutely protected.',
        counterId: 'k6' }
    ],
    counters: [
      { id: 'k1', text: 'However… not every dollar raised may be reinvested locally — some can leak to external stakeholders.' },
      { id: 'k2', text: 'However… the other 20% still leaks away through foreign-owned lodges and global tour companies.' },
      { id: 'k3', text: 'However… wages remain low overall, and managerial jobs are often given to urbanites from San José.' },
      { id: 'k4', text: 'However… the walkways disturb the habitats of canopy-based species such as the toucan.' },
      { id: 'k5', text: 'However… the cost of living has risen too, so many locals supplement incomes with informal-sector work to survive.' },
      { id: 'k6', text: 'However… some tourists stray off-trail — one illegal campfire in 2013 destroyed 66 hectares of forest.' },
      { id: 'kx1', text: 'However… the reserve contains 500 species of orchid, 34 of them recently discovered.', decoy: true },
      { id: 'kx2', text: 'However… the average ecotourist stays for 6 days and spends around £3,000.', decoy: true }
    ],
    decoyNote: 'Two of the cards are true facts from the case study — but they don’t challenge any claim, so they are not counterpoints. A "however" must push back against the point you just made.'
  },

  /* ---------------------------------------------------------------
     Station 6 — The Examiner's Desk
     Paraphrased from CCEA exemplification material the teacher supplied.
     --------------------------------------------------------------- */
  examiner: {
    rounds: [
      {
        question: 'Explain how leakage and greenwashing are negative impacts of some ecotourism developments. [8]',
        answer: 'Leakage is a negative impact because some ecotourism developments are owned by foreign investors, meaning money from the resort is not given to locals but is fed into another country. Money earned through one lodge in Costa Rica goes back to America and doesn’t impact Costa Rica positively.\n\nGreenwashing is when an ecotourist resort seems like it is environmentally friendly, so it gets the eco label, but is still damaging the environment. Some resorts use biodegradable soap and recycle plastic and paper, but use mass amounts of water and electricity, so they are doing very little to help the environment.',
        levels: [
          { level: 1, marks: '1–3' }, { level: 2, marks: '4–6' }, { level: 3, marks: '7–8' }
        ],
        correctLevel: 2,
        awarded: 'Level 2 — 5 of 8 marks',
        whyOptions: [
          { text: 'The material on leakage is superior to that on greenwashing — understanding is shown, but the examples lack depth.', correct: true },
          { text: 'Both impacts are fully developed with detailed, named case-study support.', correct: false },
          { text: 'The answer misunderstands what leakage means.', correct: false }
        ],
        lesson: 'Two halves of a question both need depth. The leakage paragraph names a place and traces where the money goes; the greenwashing paragraph stays general. Balance your development.'
      },
      {
        question: 'Describe the benefits that have occurred in your chosen small-scale case study of ecotourism, and explain why these benefits occurred. [18]',
        answer: 'The candidate opens with the resource material straight away, then brings in their own case-study detail: ecotourism provides jobs and better-paid wages for locals; the environment is protected; a tourism board was set up to promote ecotourism and provide regulation; certification for sustainable tourism is used; villagers helped create a tourism board which brings infrastructure and other facilities to 5 villages.',
        levels: [
          { level: 1, marks: '1–6' }, { level: 2, marks: '7–12' }, { level: 3, marks: '13–18' }
        ],
        correctLevel: 3,
        awarded: 'Level 3 — 13 of 18 marks',
        whyOptions: [
          { text: 'It uses the resource straight away — good practice — and adds valid own case-study detail, but more depth would have pushed it further into Level 3.', correct: true },
          { text: 'It scores full marks because it lists a large number of facts.', correct: false },
          { text: 'It reached Level 3 only because the conclusion gives a personal opinion.', correct: false }
        ],
        lesson: 'Examiners reward answers that use the resource immediately and weave in their own valid case-study material — then push deeper for the top of the level.'
      },
      {
        question: 'A model Monteverde essay ends every benefits paragraph with a "However…" counterpoint and closes with an overall judgement. What three features make this top-level evaluation?',
        answer: '“The economic benefits include $890,000 a year in entrance fees, stimulating the multiplier effect… However, 20% of lodges are foreign-owned, a fiscal drain from the local community… Therefore, to achieve sustainable development, thoughtful planning, sustainable management and local participation is essential in this product-dependent region.”',
        pickThree: [
          { text: 'It supports points with specific case-study figures.', correct: true },
          { text: 'It makes "however" counterpoints to show judgement.', correct: true },
          { text: 'It reaches an overall conclusion about which impacts matter most.', correct: true },
          { text: 'It lists as many facts as possible without weighing them.', correct: false },
          { text: 'It avoids giving any opinion so the examiner can decide.', correct: false }
        ],
        lesson: 'Facts + counterpoints + a justified judgement: that is the Level 3 evaluation formula. A list of facts alone, however accurate, stays in Level 1–2.'
      }
    ]
  },

  /* ---------------------------------------------------------------
     Station 7 — The Verdict: weigh the evidence, then judge.
     --------------------------------------------------------------- */
  verdict: {
    chips: [
      { id: 'v1', side: 'pos', text: '$890,000 a year in entrance fees funds conservation and community projects' },
      { id: 'v2', side: 'pos', text: '500 full-time jobs created — tourism wages beat plantation work' },
      { id: 'v3', side: 'pos', text: 'Less than 2% of forest cut down since 1990' },
      { id: 'v4', side: 'pos', text: '3 bilingual schools and better access to health care' },
      { id: 'v5', side: 'neg', text: '20% of profits leak away through foreign-owned businesses' },
      { id: 'v6', side: 'neg', text: 'Rubber tapping and traditional ways of life are dying out' },
      { id: 'v7', side: 'neg', text: '66 hectares of forest destroyed by one illegal tourist campfire' },
      { id: 'v8', side: 'neg', text: 'House prices up 18%, wages up just 6% — locals priced out' }
    ],
    verdicts: [
      { id: 'va', label: 'A genuine success story',
        text: 'The benefits clearly outweigh the negatives — Monteverde shows ecotourism can deliver sustainable development.',
        feedback: 'A defensible judgement — the conservation record and retained profits are strong evidence. To reach the top level, acknowledge the counterpoints: leakage and cultural erosion are real, even in a success story.' },
      { id: 'vb', label: 'A qualified success',
        text: 'The benefits outweigh the costs, but leakage, rising prices and cultural erosion must be managed for success to last.',
        feedback: 'This balanced judgement mirrors the model conclusion: success, but only with thoughtful planning, sustainable management and local participation. Examiners reward exactly this kind of weighed verdict.' },
      { id: 'vc', label: 'Not yet truly sustainable',
        text: 'The negative impacts — leakage, displacement and environmental damage — undermine the eco-label.',
        feedback: 'A bold judgement — and defensible if you argue it with evidence like the 2013 fire and the 18%/6% price–wage gap. Just be sure to acknowledge the genuine conservation gains too.' }
    ],
    conclusion: 'Therefore, to achieve sustainable development, thoughtful planning, sustainable management and local and national participation is important in this product-dependent region. Consistent evaluation in relation to the genuine goals of ecotourism is essential for the promotion of sustainable development of the TRF ecosystem in Monteverde.',
    advisorReminder: 'Whichever verdict you choose, the examiner is looking for the same thing: a clear judgement, supported by specific evidence, that acknowledges the counter-case.'
  },

  /* ---------------------------------------------------------------
     Past-paper missions (from the teacher's essay-history table)
     --------------------------------------------------------------- */
  pastPapers: [
    { year: '2018', focus: 'Benefits (with resource)' },
    { year: '2019', focus: 'Describe and evaluate the negatives' },
    { year: '2022', focus: 'Describe and evaluate the positives' },
    { year: '2023', focus: 'Describe and evaluate the negatives' },
    { year: '2024', focus: 'Opinion: are the positive social and economic impacts greater than the negative?' },
    { year: '2025', focus: 'Describe and evaluate the social and environmental impacts' }
  ],

  /* ---------------------------------------------------------------
     Auditor ranks (results screen)
     --------------------------------------------------------------- */
  ranks: [
    { min: 0, name: 'Trainee Field Researcher', icon: '🌱' },
    { min: 50, name: 'Field Researcher', icon: '🌿' },
    { min: 70, name: 'Senior Eco-Consultant', icon: '🌳' },
    { min: 85, name: 'Lead Sustainability Auditor', icon: '🦚' },
    { min: 100, name: 'Director of Sustainable Tourism', icon: '🏆' }
  ]
};
