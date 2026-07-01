/* =========================================================================
   UK Coastal Adventure — A Journey Around Britain's Coastline
   OLS Digital Skills · Year 9 (J2) Geography · Coasts
   Every fact is verified KS3 content (research + adversarial fact-check).
   Adapted from Laura Corbett's "UK Coastal Adventure" StoryMap guidance so
   it needs NO StoryMapJS / Knight Lab / Google account — a self-hosted OLS
   story map pupils can use on any phone, Chromebook or Promethean board.
   ========================================================================= */

const DATA = {
  meta: {
    title: 'UK Coastal Adventure',
    sub: 'A journey around Britain’s coastline',
    examTag: 'Year 9 Geography · Coasts'
  },

  /* ---------- Briefing (Coastal Explorer Passport) ---------- */
  briefing: {
    mission: 'Welcome, Coastal Explorer. Your mission is to sail all the way around the coastline of the United Kingdom — England, Scotland, Wales and Northern Ireland — investigating how the sea has shaped six of Britain’s most spectacular coastal landscapes. At every stop you’ll earn a passport stamp and write up your own findings. Collect all six to complete your Coastal Explorer Passport.',
    forces: [
      { name: 'Erosion', icon: '🌊', text: 'The sea <strong>wears away</strong> and removes rock from the land — carving cliffs, caves, arches and stacks.' },
      { name: 'Deposition', icon: '🏖️', text: 'The sea <strong>drops and builds up</strong> material it is carrying — making beaches, spits and bars of sand and shingle.' }
    ],
    processes: [
      { term: 'Hydraulic action', def: 'Waves smash into cracks in a cliff, trapping and compressing air, and the pressure forces the rock apart.' },
      { term: 'Abrasion', def: 'Waves pick up sand and pebbles and hurl them at the cliff, scraping it away like sandpaper.' },
      { term: 'Attrition', def: 'Rocks and pebbles carried by the waves crash into each other, breaking into smaller, smoother, rounder pieces.' },
      { term: 'Solution', def: 'Slightly acidic seawater slowly dissolves rock such as chalk and limestone in a chemical reaction.' }
    ]
  },

  /* ---------- Ranks (final passport) ---------- */
  ranks: [
    { min: 0,  name: 'Coastal Cadet',        icon: '🧭' },
    { min: 50, name: 'Coastal Explorer',     icon: '🦯' },
    { min: 70, name: 'Coastal Navigator',    icon: '⚓' },
    { min: 88, name: 'Master of the Coast',  icon: '🏆' }
  ],

  /* =====================================================================
     THE SIX STOPS  (map order: SW Dorset -> NE England -> Northern Ireland)
     ===================================================================== */
  stops: [

    /* ----- 1. OLD HARRY ROCKS (stack, chalk, erosion) ----- */
    {
      id: 'old-harry', num: 1, mapKey: 'old-harry',
      name: 'Old Harry Rocks', region: 'Dorset, England', icon: '🪨',
      landform: 'Stack', process: 'Erosion',
      hero: { img: 'assets/old-harry.jpg', alt: 'The white chalk stack of Old Harry Rocks standing in the sea beside the headland at Handfast Point, Dorset.' },
      summary: 'Old Harry Rocks is a chalk <strong>stack</strong> at the eastern end of Dorset’s Jurassic Coast. It formed as waves attacked cracks in a chalk headland, turning a crack into a cave, the cave into an arch, and the collapsed arch into this free-standing pillar — a classic example of coastal erosion.',
      fact: { icon: '🔭', text: 'Old Harry Rocks is made of the same chalk as The Needles on the Isle of Wight, about 32 km (20 miles) away. The two were once joined by a single chalk ridge until rising sea levels flooded the land between them.' },
      // Part A: match the 4 erosion processes
      processIntro: 'Before you can explain Old Harry Rocks, you need the sea’s toolkit. Match each erosion process to what it does.',
      processes: [
        { id: 'p-hyd', term: 'Hydraulic action', def: 'The force of waves compresses air trapped in cracks, and the pressure breaks the rock apart.' },
        { id: 'p-abr', term: 'Abrasion', def: 'Sand and pebbles thrown by the waves scrape and grind the cliff away like sandpaper.' },
        { id: 'p-att', term: 'Attrition', def: 'Rocks carried in the water knock into each other and wear down into smaller, rounder pebbles.' },
        { id: 'p-sol', term: 'Solution', def: 'Slightly acidic seawater dissolves chalk and limestone in a slow chemical reaction.' }
      ],
      // Part B: order the formation sequence (present shuffled, no numbers)
      seqIntro: 'Now build the sequence. Drag the five stages into the order that a headland turns into a stack.',
      sequence: [
        { id: 's1', label: 'Crack', note: 'Waves attack lines of weakness — cracks and joints — in the chalk headland.' },
        { id: 's2', label: 'Cave',  note: 'Hydraulic action and abrasion widen a crack into a cave.' },
        { id: 's3', label: 'Arch',  note: 'Erosion breaks the cave right through the headland, leaving an arch with sea passing under it.' },
        { id: 's4', label: 'Stack', note: 'The unsupported arch roof collapses, leaving an isolated pillar of chalk — a stack. This is Old Harry Rocks.' },
        { id: 's5', label: 'Stump', note: 'The stack is undercut until it too collapses into a low stump. Old Harry already has one nearby — “Old Harry’s Wife” — a stack that fell to a stump in 1896.' }
      ],
      log: {
        prompt: 'In your own words, explain how a stack like Old Harry Rocks is formed. Try to use the words crack, cave, arch and stack.',
        placeholder: 'A stack forms when…'
      }
    },

    /* ----- 2. DURDLE DOOR (arch, limestone, erosion) ----- */
    {
      id: 'durdle-door', num: 2, mapKey: 'durdle-door',
      name: 'Durdle Door', region: 'Dorset, England', icon: '🚪',
      landform: 'Arch', process: 'Erosion',
      hero: { img: 'assets/durdle-door.jpg', alt: 'The natural limestone arch of Durdle Door reaching out into the sea on the Dorset coast.' },
      summary: 'Durdle Door is a spectacular natural limestone <strong>arch</strong> on Dorset’s Jurassic Coast. Waves used hydraulic action and abrasion to erode right through a narrow headland of resistant limestone. It is an earlier stage of the same story as Old Harry Rocks — one day its roof will collapse and leave a stack behind.',
      fact: { icon: '⏳', text: 'The limestone at Durdle Door was laid down around 140 million years ago, in the Late Jurassic. Here the hard rock runs ALONG the shore, so the sea has broken through it in one spot — the arch itself is a much younger erosional feature that is still being shaped today.' },
      // Tag each feature by the PROCESS that made it (erosion vs deposition) —
      // this needs the concept, not just picture recognition. Positions are %
      // of the image, tuned to durdle-door.jpg.
      labelIntro: 'Durdle Door shows both forces at work. For each marked feature, drag on the process that made it — <strong>Erosion</strong> or <strong>Deposition</strong>. Two are each. Place all four, then check.',
      hotspots: [
        { id: 'h-arch', feature: 'The arch', process: 'erosion', x: 89, y: 50, note: 'The arch was cut when waves <strong>eroded</strong> a cave right through the resistant headland.' },
        { id: 'h-head', feature: 'The headland', process: 'erosion', x: 50, y: 20, note: 'The headland is hard limestone attacked and shaped by wave <strong>erosion</strong> from more than one side.' },
        { id: 'h-beach', feature: 'The beach', process: 'deposition', x: 24, y: 64, note: 'The beach is sand and shingle <strong>deposited</strong> where the waves lose energy.' },
        { id: 'h-bay',  feature: 'The sheltered bay', process: 'deposition', x: 60, y: 70, note: 'In the calm, sheltered bay the sea drops its load, so material is <strong>deposited</strong> here.' }
      ],
      predict: {
        q: 'Predict: what will happen to Durdle Door far into the future?',
        options: [
          { text: 'The arch roof will collapse, leaving a stack.', correct: true },
          { text: 'The arch will slowly grow taller and wider forever.', correct: false },
          { text: 'Deposition will fill the arch back in with rock.', correct: false }
        ],
        feedback: 'Erosion keeps thinning the roof of the arch. Eventually it cannot support its own weight and collapses — leaving a stack, exactly like Old Harry Rocks. Arches are only a temporary stage.'
      },
      log: {
        prompt: 'Predict what Durdle Door might look like in the future, and explain WHY it will change.',
        placeholder: 'In the future Durdle Door will… because…'
      }
    },

    /* ----- 3. CHESIL BEACH (deposition, longshore drift, tombolo) ----- */
    {
      id: 'chesil', num: 3, mapKey: 'chesil',
      name: 'Chesil Beach', region: 'Dorset, England', icon: '🏖️',
      landform: 'Barrier beach / tombolo', process: 'Deposition',
      hero: { img: 'assets/chesil-tombolo.jpg', alt: 'The long shingle ridge of Chesil Beach linking the Isle of Portland to the Dorset mainland.' },
      summary: 'Chesil Beach is a huge ridge of shingle about 29 km (18 miles) long, built by <strong>deposition</strong> over thousands of years. It is a <strong>barrier beach</strong> — joined to land at both ends — and where it links the Isle of Portland to the mainland it is called a <strong>tombolo</strong>. The engine that built it is longshore drift.',
      fact: { icon: '🪨', text: 'Longshore drift has sorted the pebbles by size along the whole beach, so the shingle is noticeably bigger at one end than the other. Local fishermen could once tell exactly where they were on the beach in the dark, just by the size of the pebbles under their feet.' },
      // Longshore drift simulation: pupil sets the two arrows, then runs the waves
      driftIntro: 'Longshore drift is how the sea carries material along a coast. Set the two arrows correctly, then run the waves and watch the pebble travel.',
      driftControls: {
        swash: {
          label: 'Swash (waves rushing IN)',
          hint: 'Which way does the water push the pebble UP the beach?',
          options: [
            { id: 'sw-angle', text: 'Up the beach at an angle', correct: true },
            { id: 'sw-straight', text: 'Straight up the beach', correct: false }
          ]
        },
        backwash: {
          label: 'Backwash (water draining BACK)',
          hint: 'Which way does gravity pull the water back DOWN the beach?',
          options: [
            { id: 'bw-straight', text: 'Straight back down the slope', correct: true },
            { id: 'bw-angle', text: 'Back down at an angle', correct: false }
          ]
        }
      },
      driftExplain: 'Because the wind drives the <strong>swash in at an angle</strong> but gravity pulls the <strong>backwash straight down</strong>, every wave nudges the pebble a little further along the coast — a zig-zag called longshore drift. Set either arrow wrongly and the pebble just goes up and down, never travelling.',
      grading: {
        q: 'At which end of Chesil Beach would you find the biggest, fist-sized pebbles?',
        options: [
          { text: 'The Portland (south-east) end — higher wave energy', correct: true },
          { text: 'The Bridport (north-west) end — lower wave energy', correct: false },
          { text: 'Exactly the same size all the way along', correct: false }
        ],
        feedback: 'Higher-energy waves at the Portland end can carry and dump the largest, heaviest pebbles, while the lower-energy Bridport end is left with only small, pea-sized shingle. This sorting by size is called grading.'
      },
      log: {
        prompt: 'Explain how longshore drift moves material along a beach. Use the words swash and backwash.',
        placeholder: 'Longshore drift works when…'
      }
    },

    /* ----- 4. HOLDERNESS (rapid erosion, boulder clay) ----- */
    {
      id: 'holderness', num: 4, mapKey: 'holderness',
      name: 'The Holderness Coast', region: 'East Yorkshire, England', icon: '⚠️',
      landform: 'Eroding cliffs', process: 'Erosion',
      hero: { img: 'assets/holderness-slump.jpg', alt: 'Soft boulder-clay cliffs slumping and crumbling onto the beach on the Holderness coast.' },
      summary: 'The Holderness Coast is one of the <strong>fastest-eroding coastlines in Europe</strong>. Its cliffs are made of soft <strong>boulder clay</strong> (glacial till) left by Ice Age glaciers — so weak that the sea wears it back by around 1.5–2 metres every year on average. Over the centuries more than two dozen villages have been lost to the sea.',
      fact: { icon: '🏚️', text: 'Since Roman times, around 30 villages have been swallowed by the sea along this coast. Homes, farmland, roads and caravan parks are still at risk today — some houses have been lost within a single lifetime.' },
      // cliff-retreat simulation
      retreatIntro: 'This coast retreats about 1.7 m every year. Drag the timeline forward and watch what the sea takes.',
      retreatRate: 1.7,
      retreatYears: 60,
      // reasoning MCQ
      whyErodes: {
        q: 'Why does the Holderness coast erode SO much faster than a chalk headland like Old Harry Rocks?',
        options: [
          { text: 'Its cliffs are soft boulder clay, which has almost no resistance to the waves.', correct: true },
          { text: 'The waves in Yorkshire are simply much stronger than anywhere else.', correct: false },
          { text: 'It is made of hard granite that shatters easily.', correct: false }
        ],
        feedback: 'It is the ROCK, not the waves. Boulder clay is a soft, crumbly mix of clay and stones dumped by glaciers. When rain soaks it, whole sections slump onto the beach and are washed away — far faster than solid chalk or limestone.'
      },
      log: {
        prompt: 'Would you want to live on the Holderness coast? Explain your answer using what you have learned.',
        placeholder: 'I would / would not want to live here because…'
      }
    },

    /* ----- 5. COASTAL MANAGEMENT (Mappleton) ----- */
    {
      id: 'management', num: 5, mapKey: 'management',
      name: 'Defending the Coast', region: 'Mappleton, Holderness', icon: '🛡️',
      landform: 'Coastal management', process: 'Management',
      hero: { img: 'assets/mappleton-groynes.jpg', alt: 'Rock groynes running down the beach at Mappleton on the Holderness coast, built to trap sand and slow erosion.' },
      summary: 'When the sea threatens homes and roads, people fight back with coastal management. <strong>Hard engineering</strong> builds structures to resist the sea; <strong>soft engineering</strong> works with nature instead. In 1991, the village of Mappleton was protected with two rock groynes and rock armour — but this created a new problem further down the coast.',
      fact: { icon: '💷', text: 'The Mappleton scheme cost about £2 million in 1991. It saved the village and its road — but by trapping sand, it starved the coast just to the south of material, so erosion there sped up. Protecting one place can make things worse for the next: the “terminal groyne effect”.' },
      // match method -> how it works + hard/soft
      methods: [
        { id: 'm-wall', name: 'Sea wall', type: 'hard', how: 'A concrete or stone wall whose curved face reflects wave energy back out to sea.' },
        { id: 'm-groyne', name: 'Groynes', type: 'hard', how: 'Barriers built out across the beach that trap sediment moved by longshore drift, building a wider beach.' },
        { id: 'm-armour', name: 'Rock armour', type: 'hard', how: 'Large boulders piled at the foot of a cliff to absorb and break up the waves’ energy.' },
        { id: 'm-nourish', name: 'Beach nourishment', type: 'soft', how: 'Extra sand or shingle is added to a beach to make it wider so it soaks up more wave energy.' },
        { id: 'm-retreat', name: 'Managed retreat', type: 'soft', how: 'Defences are removed and low-value land is allowed to flood, forming natural salt marsh.' }
      ],
      decision: {
        q: 'Mappleton’s clifftop road is about to fall into the sea. You are the council. What is the FAIREST long-term choice — and what is the catch?',
        options: [
          { text: 'Build rock groynes and armour to save the village — knowing it may speed up erosion further south.', verdict: 'A defensible choice — it is exactly what really happened at Mappleton in 1991. Just remember the trade-off: the coast just south at Cowden was starved of sediment and its erosion roughly tripled (from about 1 m to 3 m a year). Protecting one place can cost another.' },
          { text: 'Do nothing and let the road go (managed retreat), saving millions but losing the road and some homes.', verdict: 'Also defensible. Hard defences are hugely expensive to build and maintain along a whole coast, so many authorities now choose managed retreat where the land is low-value — but the people who lose homes or farmland understandably object.' },
          { text: 'Concrete the entire 61 km Holderness coast in sea walls.', verdict: 'Not realistic — walling an entire fast-eroding coast would cost an enormous amount to build and maintain, and reflected wave energy can scour away the beach in front of the wall. This is why the whole coast is not defended.' }
        ]
      },
      log: {
        prompt: 'Choose ONE coastline from your journey and explain how it could be managed, and one problem your choice might cause.',
        placeholder: 'At … I would use … because … but this might …'
      }
    },

    /* ----- 6. GIANT'S CAUSEWAY (volcanic, odd-one-out finale) ----- */
    {
      id: 'giants-causeway', num: 6, mapKey: 'giants-causeway',
      name: 'The Giant’s Causeway', region: 'County Antrim, Northern Ireland', icon: '🌋',
      landform: 'Basalt columns', process: 'Volcanic',
      hero: { img: 'assets/giants-causeway.jpg', alt: 'The interlocking hexagonal basalt columns of the Giant’s Causeway stepping down into the sea in County Antrim.' },
      heroClose: { img: 'assets/giants-causeway-close.jpg', alt: 'Close-up of the six-sided basalt columns of the Giant’s Causeway.' },
      summary: 'Your final stop is the strangest of all. The Giant’s Causeway is a UNESCO World Heritage Site of around <strong>40,000 basalt columns</strong>, mostly six-sided. But it was <strong>NOT</strong> made by erosion or deposition like every other stop — it is <strong>volcanic</strong>. Recognising that it doesn’t fit the pattern is the whole point.',
      fact: { icon: '🧚', text: 'Legend says the giant Fionn mac Cumhaill (Finn McCool) built the causeway as stepping stones to reach Scotland — and there really are matching basalt columns across the sea at Fingal’s Cave on the Scottish island of Staffa, made from the very same ancient lava.' },
      // formation order
      formIntro: 'How were the columns really made? Put the steps in order.',
      formation: [
        { id: 'f1', label: 'Lava erupts', note: 'About 50–60 million years ago, huge amounts of molten lava flowed across Antrim.' },
        { id: 'f2', label: 'Lava cools', note: 'The thick lava pooled and began to cool slowly and evenly.' },
        { id: 'f3', label: 'Rock contracts', note: 'As it cooled, the basalt shrank (contracted) and cracked into columns — mostly six-sided.' },
        { id: 'f4', label: 'Sea exposes it', note: 'Much later, the sea and weathering wore away softer rock around the columns, revealing the ≈40,000 we see today. The sea EXPOSED the columns — it did not carve them.' }
      ],
      // odd-one-out recap: sort every landform of the journey by the process that made it
      sortIntro: 'The Explorer’s Final Sorting. Sort every landform from your whole journey by the process that REALLY made it. One of them is the odd one out.',
      sortBins: [
        { id: 'erosion', label: 'Erosion' },
        { id: 'deposition', label: 'Deposition' },
        { id: 'volcanic', label: 'Volcanic' }
      ],
      sortCards: [
        { id: 'c-oh', text: 'Old Harry Rocks (stack)', target: 'erosion' },
        { id: 'c-dd', text: 'Durdle Door (arch)', target: 'erosion' },
        { id: 'c-ho', text: 'Holderness cliffs', target: 'erosion' },
        { id: 'c-ch', text: 'Chesil Beach (tombolo)', target: 'deposition' },
        { id: 'c-gc', text: 'Giant’s Causeway', target: 'volcanic' }
      ],
      log: {
        prompt: 'The Giant’s Causeway is different from every other stop on your journey. Explain why.',
        placeholder: 'The Giant’s Causeway is different because…'
      }
    }
  ],

  /* ---------- Extension (from the teacher's guidance) ---------- */
  extension: {
    title: 'Extension ⭐ — Add your own stop',
    text: 'A real explorer never stops at six. Research one more UK coastal place NOT on this journey — for example Flamborough Head, Spurn Point, the Needles, or Lulworth Cove. In your passport log, note where it is, what coastal feature it has, how it was formed, and one threat or management issue it faces.'
  }
};
