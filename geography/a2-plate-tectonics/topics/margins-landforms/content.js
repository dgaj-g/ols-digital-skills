/* ============================================================
   TOPIC 1 — Plate Tectonics: Margins and Landforms
   CCEA A2 Geography · Unit A2 1 · Option A · Booklet 1 of 3

   EVERY fact here traces to the teacher's own uploaded material:
   the pupil workbook ("A21 Option A — Outcomes Booklet 1/3"),
   her two PowerPoints, the A2 Plate Tectonics textbook extract
   and the A21 revision book. See BUILD_37_EXTRACTS/ for the
   inventories and FIGURES_RESOLVED.md for every number used.

   Authoring rules: AUTHORING.md (same folder). Nothing invented.
   ============================================================ */
window.OLS_A2PT_TOPICS = window.OLS_A2PT_TOPICS || [];
window.OLS_A2PT_TOPICS.push({
  id: 'margins-landforms',
  num: 1,
  title: 'Plate Tectonics: Margins and Landforms',
  volumeName: 'Margins & Landforms',
  strap: 'Evidence · Theory · Margins · Landforms',

  spec: [
    { id: 'i', text: 'Demonstrate knowledge and understanding of the <strong>evidence for and the theory of plate tectonics</strong>.' },
    { id: 'ii', text: 'Demonstrate knowledge and understanding of <strong>plate and sub-plate processes</strong> at constructive, conservative, destructive and collision plate margins.' },
    { id: 'iii', text: 'Demonstrate knowledge and understanding of <strong>resultant landforms</strong> — ocean ridges, rift valleys, deep sea trenches, island arcs and fold mountains.' }
  ],

  chapters: [

    /* ======================================================
       1 — FOUNDATIONS
       ====================================================== */
    {
      id: 'foundations', num: 1,
      title: 'Inside the Earth',
      subtitle: 'The GCSE bridge — and the two words that earn marks',
      specIds: ['i'],
      blocks: [
        { type: 'text', html:
          '<p>Everything in this option rests on one idea: the outer shell of the Earth is ' +
          'broken into rigid plates, and those plates sit on a layer that can flow. Before ' +
          'you can explain a single margin, you need that structure secure — and you need ' +
          'to name its parts the way the examiner does.</p>' },

        { type: 'callout', genre: 'speclink', title: 'Where this sits',
          html: '<p>This chapter is the foundation for specification statement (i): ' +
          '<em>the evidence for and the theory of plate tectonics</em>. It is assumed ' +
          'knowledge rather than examined content in its own right — but every process ' +
          'chain you write later depends on it.</p>' },

        { type: 'diagram', id: 'd1' },

        { type: 'keyterms', terms: [
          { term: 'Lithosphere', def: 'The rigid outer layer of the Earth — the crust together with the upper mantle. This is the layer broken into tectonic plates.' },
          { term: 'Asthenosphere', def: 'The semi-molten layer beneath the lithosphere. Because it is partially melted it can flow, and this is what allows the plates above to move.' },
          { term: 'Moho discontinuity', def: 'The boundary between the crust and the mantle.' },
          { term: 'Gutenberg discontinuity', def: 'The core boundary — it blocks seismic waves, which is how its depth and position were established.' }
        ] },

        { type: 'callout', genre: 'examtip', title: 'Use the right two words',
          html: '<p>It is better to refer to the <strong>lithosphere</strong> and the ' +
          '<strong>asthenosphere</strong> than to "the crust" and "the mantle". Using ' +
          'appropriate geographical terms is what separates a mid-band answer from a top-band ' +
          'one, and this is the single most common place to throw marks away.</p>' },

        { type: 'diagram', id: 'd2' },

        { type: 'callout', genre: 'howdoweknow', title: 'How do we know what is down there?',
          html: '<p>Nobody has ever drilled through the crust. We know the layers from ' +
          '<strong>seismic shock waves</strong>: waves produced by earthquakes travel faster ' +
          'or slower depending on the density and state of the material they pass through. ' +
          'By mapping where wave velocity accelerates — at the Moho — or slows, as it does ' +
          'in the partially melted asthenosphere, scientists can deduce the depth and ' +
          'composition of each layer.</p>' },

        { type: 'note', text: 'Every process chain in this booklet starts "…due to convection currents in the asthenosphere". Learn that layer first and the rest follows.' },

        { type: 'mcq',
          stem: 'Which layer allows the plates to move?',
          options: [
            { text: 'The asthenosphere', correct: true, why: 'It is semi-molten, so it can flow — and that is what lets the rigid plates above it move.' },
            { text: 'The lithosphere', why: 'The lithosphere is the rigid layer that is broken into the plates themselves. It does not flow.' },
            { text: 'The core', why: 'Far too deep. The plates ride on the asthenosphere, immediately beneath the lithosphere.' },
            { text: 'The Moho', why: 'The Moho is a boundary between layers, not a layer that can flow.' }
          ] },

        { type: 'cloze', title: 'The four terms',
          prompt: 'Fill each gap. The first letter is given.',
          segments: [
            { t: 'txt', text: 'The rigid outer layer of the Earth is the ' },
            { t: 'gap', answer: 'lithosphere' },
            { t: 'txt', text: '. It sits on the semi-molten ' },
            { t: 'gap', answer: 'asthenosphere' },
            { t: 'txt', text: '. The boundary between the crust and the mantle is the ' },
            { t: 'gap', answer: 'Moho', show: 1 },
            { t: 'txt', text: ' discontinuity, and the core boundary that blocks seismic waves is the ' },
            { t: 'gap', answer: 'Gutenberg', show: 1 },
            { t: 'txt', text: ' discontinuity.' }
          ] },

        { type: 'checkpoint', title: 'Checkpoint — foundations', items: [
          { type: 'mcq',
            stem: 'Which pair of terms should you use in an A2 answer about plate movement?',
            teach: 'Lithosphere and asthenosphere — her standing exam tip.',
            options: [
              { text: 'Lithosphere and asthenosphere', correct: true, why: 'Exactly — the specialist terms the mark scheme rewards.' },
              { text: 'Crust and mantle', why: 'These are the GCSE terms. At A2 you are expected to use lithosphere and asthenosphere.' },
              { text: 'Inner core and outer core', why: 'These are far below the layers involved in plate movement.' },
              { text: 'Moho and Gutenberg', why: 'These are boundaries between layers, not the layers themselves.' }
            ] },
          { type: 'mcq',
            stem: 'What makes the asthenosphere able to flow?',
            teach: 'It is partially melted — semi-molten — rather than fully solid.',
            options: [
              { text: 'It is semi-molten — partially melted', correct: true, why: 'Correct. Partial melting is what allows it to deform and flow slowly.' },
              { text: 'It is completely liquid', why: 'Not quite. It is only partially melted — semi-molten — not a true liquid.' },
              { text: 'It is made of a lighter element than the crust', why: 'Its state, not its composition, is the reason it can flow.' },
              { text: 'It is under no pressure', why: 'Pressure is enormous at that depth. It is the partial melting that matters.' }
            ] },
          { type: 'mcq',
            stem: 'How was the internal structure of the Earth established?',
            teach: 'By mapping changes in the velocity of seismic shock waves.',
            options: [
              { text: 'By mapping changes in the speed of seismic shock waves', correct: true, why: 'Right — waves speed up or slow down with the density and state of the material.' },
              { text: 'By drilling a borehole through the crust to the mantle', why: 'Nobody has ever drilled through the crust.' },
              { text: 'By measuring the Earth\'s magnetic field at the poles', why: 'That is the evidence for sea-floor spreading, not for the internal layers.' },
              { text: 'By studying rocks brought up by volcanoes', why: 'Useful, but it is the seismic evidence that maps the layers and their depths.' }
            ] }
        ] }
      ]
    },

    /* ======================================================
       2 — EVIDENCE FROM CONTINENTAL CRUST
       ====================================================== */
    {
      id: 'continental-evidence', num: 2,
      title: 'The Continental Jigsaw',
      subtitle: 'Evidence from continental crust',
      specIds: ['i'],
      blocks: [
        { type: 'text', html:
          '<p>The evidence for plate tectonics divides into two families: evidence from ' +
          '<strong>continental crust</strong> and evidence from <strong>oceanic crust</strong>. ' +
          'This chapter takes the first. It is the older evidence, the evidence Wegener had — ' +
          'and, as you will see, the evidence that was not quite enough.</p>' },

        { type: 'heading', text: 'Parallel coastlines — the jigsaw fit' },
        { type: 'text', html:
          '<p>In 1620 Francis Bacon noted the jigsaw fit between the east coast of South ' +
          'America and the west coast of Africa. In 1915 <strong>Alfred Wegener</strong> ' +
          'suggested that the world\'s continents had formerly been a single land mass, which ' +
          'he called <strong>Pangaea</strong>.</p>' +
          '<p>Bathymetric contours — deep sea maps — show that the edges of the continental ' +
          'shelves fit together very well, because they are not subject to the same erosion ' +
          'as the coasts themselves. This is particularly true of the western African and ' +
          'eastern South American coastlines, which run parallel to each other and would form ' +
          'a neat junction if the South Atlantic did not exist.</p>' },

        { type: 'callout', genre: 'place', place: 'South Atlantic',
          html: '<p>The classic pairing: western Africa and eastern South America. Use it by ' +
          'name — the specification asks for reference to places for illustration purposes.</p>' },

        { type: 'heading', text: 'Rock types and mountain chains' },
        { type: 'text', html:
          '<p>The distribution pattern of rock types, and the mountain chains they form, often ' +
          'makes more sense when the separate land masses of today\'s continents are placed ' +
          'back together. Structural trend lines of the ancient <strong>Caledonian Mountains</strong> ' +
          'show rocks of a similar <strong>age, type and structure</strong> in several countries ' +
          'that were once at the centre of Pangaea.</p>' },

        { type: 'callout', genre: 'place', place: 'The Caledonian belt',
          html: '<p>Similar mountain chains run along <strong>western Scandinavia, eastern ' +
          'North America, Greenland, north-west Africa and the British Isles</strong>. Widely ' +
          'separated today — once side by side.</p>' },

        { type: 'heading', text: 'Fossil evidence' },
        { type: 'text', html:
          '<p>There are fossilised remains of the same animals and plants in widely separated ' +
          'continents. Fossils of the ancient <strong>Glossopteris</strong> fern have been ' +
          'found in similar-aged rocks in South America, Africa, India and Antarctica. Join ' +
          'the continents as Pangaea and those finds form one continuous band.</p>' +
          '<p>The fossils are now separated by thousands of miles of salt water in which those ' +
          'plants and animals could not survive. They must have been laid down when the land ' +
          'masses were in different positions. Their occurrence is <strong>inexplicable</strong> ' +
          'unless continental drift is involved.</p>' },

        { type: 'callout', genre: 'keypoint', title: 'Mesosaurus — the strongest fossil case',
          html: '<p>The fossil of the small, extinct <strong>freshwater</strong> reptile ' +
          '<em>Mesosaurus</em> is found only in South Africa and Brazil. Because it lived in ' +
          'fresh water it could not have crossed a vast, salty ocean — so this is stronger ' +
          'geological evidence for continental drift than a marine fish would be.</p>' },

        { type: 'heading', text: 'Glacial deposits and striations' },
        { type: 'text', html:
          '<p>Carboniferous-age glacial deposits and <strong>striations</strong> are found in ' +
          'India, South America, southern Africa, Antarctica and Australia — all now in ' +
          'tropical or temperate zones. That suggests they were once joined and located near ' +
          'the cold South Pole, where glaciers could form.</p>' +
          '<p>Reassembled into the ancient landmass <strong>Gondwana</strong>, the striations ' +
          'align to show ice moving outwards from a central point, supporting the idea of one ' +
          'unified ice sheet over a joined land mass.</p>' },

        { type: 'callout', genre: 'didyouknow', title: 'Coal in Antarctica',
          html: '<p>Coal deposits have been found in Antarctica, and glacial striations in ' +
          'modern tropical hot deserts. Coal forms from fossilised tropical swamp material, so ' +
          'Antarctica must once have had a much warmer climate; striations in today\'s deserts ' +
          'mean those landmasses were once near the poles. The continents have drifted ' +
          'significantly from their previous latitudes.</p>' },

        { type: 'match', title: 'What does each piece of evidence prove?',
          prompt: 'Drag each conclusion onto the evidence that supports it.',
          pairs: [
            { left: 'The continental shelf edges of Africa and South America fit closely together', right: 'The continents were once joined' },
            { left: 'Glossopteris fossils in South America, Africa, India and Antarctica', right: 'One continuous band of habitat across Pangaea' },
            { left: 'Mesosaurus — a freshwater reptile — in South Africa and Brazil only', right: 'It could not have crossed a salt ocean' },
            { left: 'Coal in Antarctica and striations in hot deserts', right: 'The continents have moved through climate belts' },
            { left: 'Caledonian rocks of the same age, type and structure on five landmasses', right: 'Mountain chains once ran side by side' }
          ] },

        { type: 'cloze', title: 'The continental account',
          prompt: 'Complete the account. First letters given.',
          segments: [
            { t: 'txt', text: 'In 1620, Francis Bacon noted the ' },
            { t: 'gap', answer: 'jigsaw' },
            { t: 'txt', text: ' ' },
            { t: 'gap', answer: 'fit' },
            { t: 'txt', text: ' between South America and Africa. In 1915, ' },
            { t: 'gap', answer: 'Alfred', show: 1 },
            { t: 'txt', text: ' ' },
            { t: 'gap', answer: 'Wegener', show: 1 },
            { t: 'txt', text: ' suggested the continents had formed one land mass called ' },
            { t: 'gap', answer: 'Pangaea', show: 1 },
            { t: 'txt', text: '. Reassembled further south, the glacial striations of ' },
            { t: 'gap', answer: 'Gondwana', show: 1 },
            { t: 'txt', text: ' align to show one ice sheet.' }
          ] },

        { type: 'examq',
          qid: 'q-mesosaurus',
          source: 'Exam practice set in the workbook',
          question: 'Explain why <em>Mesosaurus</em> fossils provide strong evidence for continental drift.',
          marks: 4,
          plan: [
            'Mesosaurus was a freshwater reptile, which means…',
            'It is found only in South Africa and Brazil, so…',
            'It could not have crossed the salt water of the Atlantic because…',
            'This implies the two land masses were…'
          ],
          schemeNote: 'The workbook gives you the four points to include. Tick the ones you actually made.',
          scheme: [
            { point: 'Identifies Mesosaurus as a <strong>freshwater</strong> reptile' },
            { point: 'States that it therefore could not cross a vast, salty ocean' },
            { point: 'Notes it is found on more than one continent — South Africa and Brazil' },
            { point: 'Concludes that the continents must have been joined as a single freshwater habitat when it lived' }
          ],
          model: '<p><mark>Mesosaurus was a freshwater reptile</mark>, so <mark>it could not ' +
            'have swum across the vast, salty Atlantic Ocean</mark>. Yet its fossils are found ' +
            '<mark>only in South Africa and Brazil</mark>. Its presence in both locations ' +
            'implies that <mark>the two landmasses must have been joined as a single ' +
            'freshwater habitat when the reptile lived</mark>. This is stronger evidence than ' +
            'a marine fossil would provide, because a marine species could have dispersed ' +
            'through open ocean.</p>',
          modelNote: 'Transcribed from the answer key in her theory PowerPoint (item 8), with the final sentence drawn from the workbook\'s own comparison.',
          examiner: 'The mark is in the word <em>freshwater</em>. An answer that says only ' +
            '"the same fossil is found on two continents" describes the evidence without ' +
            'explaining why it is strong.'
        },

        { type: 'checkpoint', title: 'Checkpoint — continental evidence', items: [
          { type: 'mcq',
            stem: 'Why do the edges of the continental shelves fit together better than the coastlines do?',
            teach: 'Shelf edges are not subject to the same coastal erosion.',
            options: [
              { text: 'They are not subject to the same erosion as the coasts', correct: true, why: 'Correct — coastlines are worn back, so the true edge of a continent is its shelf edge.' },
              { text: 'They are made of denser rock', why: 'Density is not the reason. It is about erosion.' },
              { text: 'They were mapped more accurately', why: 'Bathymetric contours did reveal them, but the fit is better because of erosion, not measurement.' },
              { text: 'They have been pushed together by ridge push', why: 'Ridge push acts at ocean ridges and is unrelated to the shape of the shelves.' }
            ] },
          { type: 'mcq',
            stem: 'What does the alignment of Carboniferous glacial striations across five landmasses show?',
            teach: 'Reassembled as Gondwana, they show one ice sheet spreading from a centre.',
            options: [
              { text: 'One unified ice sheet spread outwards from a central point over a joined land mass', correct: true, why: 'Exactly — the striations only line up once the continents are reassembled as Gondwana.' },
              { text: 'Each continent had its own separate ice sheet', why: 'If that were so, the striation directions would not align into one radial pattern.' },
              { text: 'The Earth was entirely frozen in the Carboniferous', why: 'The evidence points to those landmasses being near the South Pole, not to a global freeze.' },
              { text: 'Glaciers can form in tropical latitudes', why: 'The opposite — the deposits are in the tropics now because the land has since moved.' }
            ] },
          { type: 'cloze', title: 'The gap in the argument',
            prompt: 'One word completes the weakness of all this evidence.',
            teach: 'Continental evidence shows the continents were joined but offers no mechanism.',
            segments: [
              { t: 'txt', text: 'Continental evidence shows the continents were once joined, but it offers no ' },
              { t: 'gap', answer: 'mechanism' },
              { t: 'txt', text: ' — no explanation of how they could move.' }
            ] }
        ] }
      ]
    },

    /* ======================================================
       3 — EVIDENCE FROM OCEANIC CRUST
       ====================================================== */
    {
      id: 'oceanic-evidence', num: 3,
      title: 'Secrets of the Sea Floor',
      subtitle: 'Evidence from oceanic crust',
      specIds: ['i'],
      blocks: [
        { type: 'text', html:
          '<p>The continental evidence convinced almost nobody in Wegener\'s lifetime. What ' +
          'changed everything was the sea floor — a place nobody could see until sonar and ' +
          'the magnetometer made it visible. This is the stronger family of evidence, and it ' +
          'is the one to choose in the exam.</p>' },

        { type: 'callout', genre: 'examtip', title: 'Choose the sea floor',
          html: '<p>If an exam question gives you a choice of which evidence to discuss, ' +
          'choosing evidence from the sea floor lets you discuss the <strong>mechanism</strong> ' +
          'of plate tectonics far more directly. And for both ocean floor relief and the age of ' +
          'the sea floor, it is important to point out that the patterns are ' +
          '<strong>symmetrical</strong> either side of the ridge.</p>' },

        { type: 'heading', text: 'Ocean topography' },
        { type: 'text', html:
          '<p><strong>Sonar mapping</strong> of the great ocean basins shows the topography of ' +
          'the ocean floor — the shape, height and arrangement of the surface. If there were no ' +
          'plate movement, we would expect the deepest part of an ocean to be near its centre. ' +
          'Instead, the centres of the ocean basins hold huge, linear underwater mountain ' +
          'ranges with deep central valleys, snaking around most of the world\'s major oceans ' +
          'including the middle of the Atlantic.</p>' +
          '<p>The ridge has a huge <strong>rift valley</strong> running along its centre, ' +
          'similar to rift valleys on continents that are being pulled apart. This implies the ' +
          'ocean floor is being split apart at these locations. There are also very deep ocean ' +
          '<strong>trenches</strong> off the coasts of some continents, including South ' +
          'America, where the ocean floor is sinking into the asthenosphere.</p>' },

        { type: 'data', facts: [
          { value: '2,000', unit: 'km', label: 'Width of the Mid-Atlantic Ridge', detail: 'A raised portion of the sea bed, thousands of kilometres in length.' },
          { value: '1–3', unit: 'km', label: 'Ridge height above the abyssal plain' },
          { value: '1.5', unit: 'km', label: 'Depth of the central rift valley', detail: 'Running along the length of the ridge, and up to 30 km wide.' }
        ] },

        { type: 'heading', text: 'Age and pattern of ocean geology' },
        { type: 'text', html:
          '<p>Sediment build-up on the ocean floor is minimal compared with the continents. If ' +
          'the ocean floors were billions of years old, like the continents, they should be ' +
          'buried under thick layers of deposited sediment — but little or none was found.</p>' +
          '<p>The mountains of the mid-ocean ridges at the centre of the oceans are made of very ' +
          'young rocks, and the age of the rocks <strong>increases away from them in a ' +
          'symmetrical pattern</strong> either side of the ridge. This suggests new rock is ' +
          'being created along the mid-ocean ridges over time.</p>' },

        { type: 'callout', genre: 'howdoweknow', title: 'Reading the age of the floor',
          html: '<p>Sea-floor age maps show bands of rock less than a million years old right ' +
          'at the ridge crest, ageing outwards on both sides. The pattern is a mirror image ' +
          'across the ridge — which is exactly what you would expect if new crust were forming ' +
          'at the centre and moving away.</p>' },

        { type: 'heading', text: 'Palaeomagnetism' },
        { type: 'steps', items: [
          'When molten rock solidifies, iron particles in the rock line up with the Earth\'s magnetic field.',
          'The iron particles <strong>record</strong> the direction of the Earth\'s magnetic field at the time of <strong>cooling</strong>. The rock permanently records this direction and angle of dip, so the location of the rock when it formed can be calculated.',
          'The Earth\'s magnetism reverses roughly every <strong>one million years</strong>, so that a conventional compass would point south rather than north.',
          'During the 1960s, ships towing <strong>magnetometers</strong> mapped the ocean floors and revealed a pattern.',
          'The pattern was bands of rock parallel to the ridge with alternating <strong>magnetic polarity</strong>.',
          'Iron in the magma orientated to the north as it cooled; over time the pole flipped south, and the new rock created then was orientated south. Repeated over and over, this builds the striped record — and supports plate tectonic theory.'
        ] },

        { type: 'sim', id: 'seafloor',
          caption: 'Watch the stripes build, then label the diagram from memory.' },

        { type: 'sequence', title: 'How a magnetic stripe is made',
          prompt: 'Put the four stages into the right order.',
          items: ['Lava cools', 'Iron aligns', 'Magnetic reversal', 'Magnetic stripes'] },

        { type: 'callout', genre: 'thinkdiscuss', title: 'Think it through',
          html: '<p>The width of a magnetic stripe records how much new crust formed before the ' +
          'next reversal. If reversals happen at roughly regular intervals, what would a ' +
          '<em>wider</em> stripe tell you about the rate of spreading at that ridge?</p>' },

        { type: 'examq',
          qid: 'q-palaeo8',
          source: 'Exam practice set in the workbook — around 16 lines',
          question: 'Explain how palaeomagnetism supports sea-floor spreading.',
          marks: 8,
          plan: [
            'When lava cools at the ridge…',
            'The iron particles within it…',
            'Because the Earth\'s magnetic field reverses…',
            'The resulting pattern of stripes shows…',
            'This proves the sea floor is…'
          ],
          schemeNote: 'The workbook sets out the structure: what happens when lava cools · magnetic alignment · reversal · stripes as evidence of movement.',
          scheme: [
            { point: 'Molten rock erupts at the mid-ocean ridge and solidifies' },
            { point: 'Iron particles align with the Earth\'s magnetic field as it cools, recording direction and angle of dip permanently' },
            { point: 'The Earth\'s magnetic field reverses approximately every one million years' },
            { point: 'Rock forming after a reversal records the opposite polarity' },
            { point: 'This produces bands of alternating polarity parallel to the ridge' },
            { point: 'The pattern is <strong>symmetrical</strong> either side of the ridge' },
            { point: 'Magnetometers towed by ships in the 1960s detected and mapped the pattern' },
            { point: 'Concludes that new crust must form at the ridge and be pushed outwards over millions of years — i.e. the sea floor spreads' }
          ],
          model: '<p><mark>During underwater volcanic eruptions, magnetic minerals in the ' +
            'molten lava align with the Earth\'s magnetic field.</mark> <mark>Because the ' +
            'Earth\'s magnetic poles reverse approximately every 1 million years</mark>, the ' +
            'solidifying rock <mark>creates a permanent record of the polarity at that ' +
            'time</mark>. Moving outward from mid-ocean ridges, <mark>scientists observe ' +
            'symmetrical alternations in magnetic alignment</mark>, <mark>proving that new ' +
            'magma continually erupts at the ridge and pushes older rock aside over millions ' +
            'of years</mark>.</p>',
          modelNote: 'Transcribed from the answer key in her theory PowerPoint (item 15).',
          examiner: 'Note how short the model is for eight marks — because every clause does ' +
            'work. The word <em>symmetrical</em> is doing a great deal of it: it is the ' +
            'symmetry that rules out any explanation other than spreading.'
        },

        { type: 'checkpoint', title: 'Checkpoint — oceanic evidence', items: [
          { type: 'mcq',
            stem: 'If the sea bed had been buried under thick sediment, what would that have suggested?',
            teach: 'Thin sediment is the clue — a young, renewing floor.',
            options: [
              { text: 'That it was as old as the continents', correct: true, why: 'Right — the near-absence of sediment is what shows the floor is young and being renewed.' },
              { text: 'That it was spreading unusually quickly', why: 'The reverse. Fast renewal means less time for material to gather.' },
              { text: 'That rivers were supplying more material', why: 'The argument is about age, not about the supply of sediment.' },
              { text: 'That the magnetic field had reversed more often', why: 'Sediment thickness has nothing to do with magnetic reversals.' }
            ] },
          { type: 'mcq',
            stem: 'Which word is the key to a top-band answer on ocean-floor age and relief?',
            teach: 'Symmetrical — her explicit exam tip.',
            options: [
              { text: 'Symmetrical', correct: true, why: 'Yes — the patterns are symmetrical either side of the ridge, and saying so is what earns the mark.' },
              { text: 'Sedimentary', why: 'Sediment is part of the evidence, but the pattern word the examiner wants is different.' },
              { text: 'Continuous', why: 'The ridges are continuous, but that is not the point the mark scheme rewards here.' },
              { text: 'Volcanic', why: 'True but generic. The distinguishing feature is the mirror-image pattern across the ridge.' }
            ] },
          { type: 'mcq',
            stem: 'Roughly how often does the Earth\'s magnetic field reverse?',
            teach: 'Approximately every one million years.',
            options: [
              { text: 'About every one million years', correct: true, why: 'Correct — the figure to quote.' },
              { text: 'About every one thousand years', why: 'Far too frequent. The interval is around a million years.' },
              { text: 'About every one hundred million years', why: 'Far too rare — the stripes would be enormously wide.' },
              { text: 'It has only reversed once', why: 'The striped pattern records many reversals.' }
            ] }
        ] }
      ]
    },

    /* ======================================================
       4 — FROM DRIFT TO PLATE TECTONICS
       ====================================================== */
    {
      id: 'theory', num: 4,
      title: 'From Drift to Plate Tectonics',
      subtitle: 'Wegener, Hess, and the missing mechanism',
      specIds: ['i'],
      blocks: [
        { type: 'text', html:
          '<p>Two families of evidence, one unanswered question. Wegener could show that the ' +
          'continents had moved; he could not say what moved them. This chapter is where the ' +
          'evidence becomes a theory.</p>' },

        { type: 'board' },

        { type: 'callout', genre: 'didyouknow', title: 'Why Wegener was rejected',
          html: '<p>Alfred Wegener\'s theory of continental drift was widely rejected during ' +
          'his lifetime because he could not explain how the massive continents actually ' +
          'moved. He incorrectly suggested that they were pushed by the tides of the ocean — ' +
          'a force mathematically far too weak to move solid rock.</p>' },

        { type: 'heading', text: 'Harry Hess and sea-floor spreading' },
        { type: 'text', html:
          '<p>Wherever two tectonic plates pull apart, the gap is filled continually with newly ' +
          'created oceanic crust. The site of new sea-floor creation is the crest of the great ' +
          'oceanic spreading ridges — globe-girdling mountain ranges that would be seen as the ' +
          'Earth\'s most dramatic features if they were not hidden beneath the oceans.</p>' +
          '<p><strong>Harry Hess</strong> explained that while new crust forms at mid-ocean ' +
          'ridges, old crust must be destroyed elsewhere. This happens at <strong>subduction ' +
          'zones</strong>, where oceanic crust sinks back into the mantle.</p>' },

        { type: 'keyterms', terms: [
          { term: 'Sea-floor spreading', def: 'The continual creation of new oceanic crust at the crest of a spreading ridge, from hot magma distilled from the mantle below, which then moves away from the ridge.' },
          { term: 'Subduction zone', def: 'An area where older, cooler, denser oceanic crust that has moved away from the ridge eventually meets a destructive boundary and is forced down into the mantle.' },
          { term: 'Transform fault', def: 'A fault that offsets a spreading ridge. The pulling-apart motion along the ridge is transformed into strike-slip — side-by-side — motion along the fault, producing neither gap nor overlap.' }
        ] },

        { type: 'callout', genre: 'keypoint', title: 'The conveyor belt',
          html: '<p>Put the two halves together and the Earth\'s crust is being continuously ' +
          'created and destroyed like a conveyor belt. Creation at the ridges balances ' +
          'destruction at the trenches — which is why the Earth does not grow.</p>' },

        { type: 'classify', title: 'Which family does each piece of evidence belong to?',
          prompt: 'Sort every piece of evidence into the crust it comes from.',
          columns: ['Continental crust', 'Oceanic crust'],
          items: [
            { text: 'The jigsaw fit of the shelf edges', col: 'Continental crust' },
            { text: 'Glossopteris fossils', col: 'Continental crust' },
            { text: 'Mesosaurus', col: 'Continental crust' },
            { text: 'Caledonian mountain chains', col: 'Continental crust' },
            { text: 'Glacial striations and coal', col: 'Continental crust' },
            { text: 'Magnetic striping', col: 'Oceanic crust' },
            { text: 'Symmetrical age of the sea floor', col: 'Oceanic crust' },
            { text: 'Ocean ridges and deep trenches', col: 'Oceanic crust' },
            { text: 'Minimal sediment on the ocean floor', col: 'Oceanic crust' }
          ] },

        { type: 'examq',
          qid: 'q-evaluate8',
          source: 'Exam practice set in the workbook',
          question: 'Evaluate which type of evidence — continental or oceanic — is most convincing.',
          marks: 8,
          plan: [
            'Continental evidence suggests…',
            'However, oceanic evidence is stronger because…',
            'Overall, the most convincing evidence is…'
          ],
          schemeNote: 'The sentence starters above are the workbook\'s own. This is an <em>evaluate</em> question, so a list of evidence will not do — you must weigh the two families against each other and commit to a judgement.',
          scheme: [
            { point: 'Outlines continental evidence: jigsaw fit, matching rocks and mountain chains, fossils, glacial deposits' },
            { point: 'Recognises its strength — several independent lines all point the same way' },
            { point: 'Identifies its central weakness: it shows the continents were joined but supplies no mechanism' },
            { point: 'Outlines oceanic evidence: ocean topography, age and sediment pattern, palaeomagnetism' },
            { point: 'Stresses the <strong>symmetry</strong> of the age and magnetic patterns either side of the ridge' },
            { point: 'Explains that oceanic evidence demonstrates the process actually happening now, not just its past effects' },
            { point: 'Links oceanic evidence directly to the mechanism — sea-floor spreading, and so ridge push and slab pull' },
            { point: 'Reaches a supported overall judgement rather than trailing off' }
          ],
          examiner: 'The command word is <em>evaluate</em>. Answers that describe both families ' +
            'fully and then stop will sit mid-band however accurate they are. The marks at the ' +
            'top come from the weighing — and the strongest line of argument is that oceanic ' +
            'evidence lets you discuss the mechanism, which is precisely what Wegener lacked.'
        },

        { type: 'checkpoint', title: 'Checkpoint — the theory', items: [
          { type: 'mcq',
            stem: 'What did Harry Hess add to the picture?',
            teach: 'That new crust at ridges must be balanced by destruction at subduction zones.',
            options: [
              { text: 'That old crust is destroyed at subduction zones, balancing the new crust made at ridges', correct: true, why: 'Correct — this is what makes spreading a closed system rather than an expanding Earth.' },
              { text: 'That the continents were once joined as Pangaea', why: 'That was Wegener, in 1915.' },
              { text: 'That the Earth\'s magnetic field reverses', why: 'The reversals were established by palaeomagnetic surveys, not by Hess.' },
              { text: 'That the tides push the continents apart', why: 'That was Wegener\'s incorrect suggestion for a mechanism.' }
            ] },
          { type: 'mcq',
            stem: 'Why is a transform fault called a transform fault?',
            teach: 'The pulling-apart motion at the ridge is transformed into side-by-side motion.',
            options: [
              { text: 'The pulling-apart motion along the ridge is transformed into strike-slip motion along the fault', correct: true, why: 'Exactly — hence neither gap nor overlap is produced.' },
              { text: 'The rock is transformed into a different type by heat', why: 'That would be metamorphism, which is a different idea entirely.' },
              { text: 'The plate transforms from oceanic into continental', why: 'Plates do not change type at a fault.' },
              { text: 'The fault transforms the direction of the magnetic field', why: 'Faults have no effect on the magnetic field.' }
            ] },
          { type: 'cloze', title: 'The missing piece',
            prompt: 'Complete the sentence.',
            teach: 'Wegener\'s proposed mechanism — ocean tides — was far too weak.',
            segments: [
              { t: 'txt', text: 'Wegener\'s external mechanism, the ' },
              { t: 'gap', answer: 'tides' },
              { t: 'txt', text: ' of the ocean, was mathematically far too ' },
              { t: 'gap', answer: 'weak' },
              { t: 'txt', text: ' to move solid rock.' }
            ] }
        ] }
      ]
    },

    /* ======================================================
       5 — WHAT DRIVES THE PLATES
       ====================================================== */
    {
      id: 'forces', num: 5,
      title: 'What Drives the Plates',
      subtitle: 'Convection, ridge push and slab pull',
      specIds: ['i', 'ii'],
      blocks: [
        { type: 'text', html:
          '<p>This is the answer to Wegener\'s question — and the specification asks you to ' +
          'distinguish <strong>plate processes</strong> from <strong>sub-plate processes</strong>, ' +
          'so it matters that you can name the forces precisely.</p>' },

        { type: 'callout', genre: 'speclink', title: 'Straight from the specification',
          html: '<p><strong>Plate processes</strong> refer to the large-scale, horizontal ' +
          'movements and interactions of the Earth\'s lithospheric plates.</p>' +
          '<p><strong>Sub-plate processes</strong> occur underneath or within a single plate — ' +
          'often driven by vertical mantle convection, hotspots, or deep geological activity ' +
          'beneath the surface.</p>' },

        { type: 'sim', id: 'forces' },

        { type: 'heading', text: 'The traditional view: convection currents' },
        { type: 'steps', items: [
          'Heat generated from the radioactive decay of elements deep in the interior of the Earth creates magma in the asthenosphere.',
          'The magma is less dense than the surrounding molten rock, so it rises towards the lithosphere, where the currents slowly migrate laterally, dragging the plates above.',
          'Where two convection cells <strong>diverge</strong> beneath the lithosphere, sea-floor spreading occurs — a constructive plate margin. Where two cells <strong>converge</strong>, subduction occurs — a destructive plate margin.',
          'The magma cools, its density increases, and it sinks back towards the core, where the process repeats.'
        ] },

        { type: 'callout', genre: 'didyouknow', title: 'The thermal engine',
          html: '<p>The discovery of convection cells in the asthenosphere — driven by the ' +
          '4000&nbsp;°C temperature difference between the core and the upper mantle — supplied ' +
          'the powerful internal engine capable of dragging lithospheric plates, which ' +
          'Wegener\'s tides never could.</p>' },

        { type: 'heading', text: 'The modern view: ridge push and slab pull' },
        { type: 'text', html:
          '<p>Scientists now think plate movement is driven mainly by forces at the plates ' +
          'themselves.</p>' },

        { type: 'keyterms', terms: [
          { term: 'Ridge push', def: 'At mid-ocean ridges the hot new crust is higher and less dense. Gravity causes it to slide away from the ridge, pushing the plates apart.' },
          { term: 'Slab pull', def: 'At subduction zones, cold dense oceanic crust sinks into the mantle and pulls the rest of the plate along behind it. This is considered the most important driving force.' }
        ] },

        { type: 'callout', genre: 'keypoint', title: 'The one-line contrast',
          html: '<p>Traditional: plates move because they are <strong>carried</strong> by moving ' +
          'mantle. Modern: plates move because they are <strong>pushed and pulled</strong>, not ' +
          'just carried.</p>' },

        { type: 'note', text: 'If you name only one force, name slab pull — the notes flag it as the most important.' },

        { type: 'classify', title: 'Plate, sub-plate, or landform?',
          prompt: 'The three-column organiser you will use for every margin. Sort each one.',
          columns: ['Plate process', 'Sub-plate process', 'Resultant landform'],
          items: [
            { text: 'Two plates moving apart', col: 'Plate process' },
            { text: 'Two plates converging', col: 'Plate process' },
            { text: 'Plates sliding past one another', col: 'Plate process' },
            { text: 'Decompression melting', col: 'Sub-plate process' },
            { text: 'Hydration melting', col: 'Sub-plate process' },
            { text: 'Convection currents in the asthenosphere', col: 'Sub-plate process' },
            { text: 'Slab pull', col: 'Sub-plate process' },
            { text: 'Ocean ridge', col: 'Resultant landform' },
            { text: 'Rift valley', col: 'Resultant landform' },
            { text: 'Deep sea trench', col: 'Resultant landform' },
            { text: 'Island arc', col: 'Resultant landform' },
            { text: 'Fold mountains', col: 'Resultant landform' }
          ] },

        { type: 'checkpoint', title: 'Checkpoint — driving forces', items: [
          { type: 'mcq',
            stem: 'Which force is considered the most important in driving plate movement?',
            teach: 'Slab pull.',
            options: [
              { text: 'Slab pull', correct: true, why: 'Correct — the sinking of cold, dense oceanic crust drags the rest of the plate with it.' },
              { text: 'Ridge push', why: 'Ridge push is real and worth naming, but slab pull is described as the most important.' },
              { text: 'Ocean tides', why: 'Wegener\'s discredited suggestion — mathematically far too weak.' },
              { text: 'The Earth\'s magnetic field', why: 'The magnetic field records plate movement; it does not cause it.' }
            ] },
          { type: 'mcq',
            stem: 'Where two convection cells converge beneath the lithosphere, what forms?',
            teach: 'Converging cells produce subduction — a destructive margin.',
            options: [
              { text: 'A destructive margin, where subduction occurs', correct: true, why: 'Right. Diverging cells give you sea-floor spreading; converging cells give you subduction.' },
              { text: 'A constructive margin, where sea-floor spreading occurs', why: 'That happens where cells <em>diverge</em>, not converge.' },
              { text: 'A conservative margin', why: 'Conservative margins involve plates sliding past one another, parallel to the boundary.' },
              { text: 'A collision margin', why: 'Collision needs two continental plates meeting after the ocean between them has closed.' }
            ] },
          { type: 'mcq',
            stem: 'What ultimately supplies the heat that drives convection?',
            teach: 'The radioactive decay of elements deep inside the Earth.',
            options: [
              { text: 'The radioactive decay of elements deep in the Earth\'s interior', correct: true, why: 'Correct — this is the ultimate energy source.' },
              { text: 'Heat absorbed from the Sun', why: 'Solar heating affects the atmosphere and surface, not the asthenosphere.' },
              { text: 'Friction between the plates at their margins', why: 'Friction matters at conservative margins, but it does not power the convection cells.' },
              { text: 'Tidal energy from the Moon', why: 'This is essentially Wegener\'s mistake — far too weak.' }
            ] }
        ] }
      ]
    },

    /* ======================================================
       6 — CONSTRUCTIVE
       ====================================================== */
    {
      id: 'constructive', num: 6,
      title: 'The Constructive Margin',
      subtitle: 'Ocean ridges and rift valleys',
      specIds: ['ii', 'iii'],
      blocks: [
        { type: 'callout', genre: 'keypoint', title: 'Memory tip',
          html: '<p>Think <strong>CONSTRUCT is to CREATE or BUILD</strong>. At a constructive ' +
          'margin the plates move apart and new crust is created.</p>' },

        { type: 'text', html:
          '<p>Read the process chain below as one continuous story. It begins with a plate ' +
          'being pulled apart and ends with a mature mid-ocean ridge — and along the way it ' +
          'produces two of the five landforms the specification names.</p>' },

        { type: 'sim', id: 'constructive' },

        { type: 'heading', text: 'The process, step by step' },
        { type: 'steps', items: [
          'Plates are pulled apart due to the rising convection currents of magma from the asthenosphere below.',
          'Hot spots deep in the asthenosphere cause magma to rise, heating the lithosphere and causing it to warp upwards and stretch, breaking along fault lines.',
          'The upwelling of mantle material reduces pressure on the partially molten mantle, causing <strong>decompression melting</strong>. This produces more magma, less dense than the surrounding rock, which rises to fill the tensional cracks and creates new crust.',
          'This heating and magma accumulation produces an <strong>isostatic response</strong>, causing the young crust nearest the boundary to rise. Partial melting and the buoyancy of hotter, less dense magma also make the mid-ocean ridge sit higher than the surrounding seafloor. These ridges can span thousands of kilometres and rise 1–3 km above the abyssal plain.',
          'These raised features produce <strong>ridge push</strong> — gravity pulling the lithosphere down and away from the ridge. The crust fractures allow magma to reach the surface, and the central area slumps and collapses, forming a central <strong>rift valley</strong>.',
          'The stretched plate may allow a nearby ocean to spill in, creating a shallow, linear sea above the new ocean crust.',
          'The sea widens, with submarine and often surface volcanic activity. A broad <strong>mid-ocean ridge</strong> develops as magma rises, cools and forms basalt, the ridge elevated by the buoyancy of partially molten, newly formed crust.'
        ] },

        { type: 'callout', genre: 'place', place: 'Great Rift Valley',
          html: '<p>East Africa — the central rift valley stage, where the crust has fractured ' +
          'and the centre has slumped, but the sea has not yet flooded in.</p>' },
        { type: 'callout', genre: 'place', place: 'Red Sea',
          html: '<p>The next stage — a shallow, <strong>linear sea</strong> formed where a ' +
          'nearby ocean has spilled into the stretched, rifted crust.</p>' },
        { type: 'callout', genre: 'place', place: 'Mid-Atlantic Ridge',
          html: '<p>The mature stage — a broad mid-ocean ridge, around 2,000 km wide, with a ' +
          'rift valley up to 1.5 km deep and 30 km wide running along its crest.</p>' },

        { type: 'note', text: 'Great Rift Valley → Red Sea → Mid-Atlantic Ridge. One margin, three ages. Naming all three shows the examiner you understand it as a sequence.' },

        { type: 'sequence', title: 'The life of a constructive margin',
          prompt: 'Put the stages into the order the workbook gives them.',
          items: [
            'Rising convection warps and stretches the lithosphere',
            'The crust breaks along fault lines',
            'Decompression melting creates new crust',
            'An isostatic response lifts the ridge',
            'The centre slumps to form a rift valley',
            'The sea spills in, creating a linear sea',
            'A broad mid-ocean ridge develops'
          ] },

        { type: 'heading', text: 'Volcanic activity at constructive margins' },
        { type: 'text', html:
          '<p>The vast majority of volcanic activity at constructive margins is hidden below ' +
          'the sea. It is here that magma forms the mid-ocean ridges. As magma extrudes onto ' +
          'the ocean floor it cools rapidly, forming bulbous shapes known as <strong>pillow ' +
          'lavas</strong>, composed of fine-textured igneous <strong>basalt</strong> or ' +
          '<strong>gabbro</strong>. This is how oceanic plates are created.</p>' },

        { type: 'callout', genre: 'place', place: "Giant's Causeway",
          html: '<p>On land, the basalt rocks of the Giant\'s Causeway are the product of ' +
          'constructive margin activity from over <strong>55 million years ago</strong>.</p>' },
        { type: 'callout', genre: 'place', place: 'Iceland',
          html: '<p>Iceland experiences a significant amount of constructive margin activity. ' +
          'Along with frequent eruptions from central volcanoes, thermal lakes and geysers are ' +
          'also common.</p>' },

        { type: 'data', facts: [
          { value: '1–3', unit: 'km', label: 'Ridge height above the abyssal plain' },
          { value: '55', unit: 'Ma', label: "Age of the Giant's Causeway basalts", detail: 'Over 55 million years old.' },
          { value: '30', unit: 'km', label: 'Width of the central rift valley', detail: 'And up to 1.5 km deep, running along the ridge crest.' }
        ] },

        { type: 'callout', genre: 'examtip', title: 'The drawn diagram is an essential skill',
          html: '<p>You are expected to be able to draw a fully annotated diagram of a ' +
          'constructive boundary. Use the colour code every time: <strong>blue for oceanic, ' +
          'brown for continental, red for magma movement</strong>. The animation above uses ' +
          'exactly that code, so what you see is what you should draw.</p>' },

        { type: 'classify', title: 'Plate, sub-plate, or landform — the constructive margin',
          prompt: 'Sort each feature of this margin into the right column.',
          columns: ['Plate process', 'Sub-plate process', 'Resultant landform'],
          items: [
            { text: 'Two plates moving apart', col: 'Plate process' },
            { text: 'Decompression melting', col: 'Sub-plate process' },
            { text: 'Isostatic response', col: 'Sub-plate process' },
            { text: 'Ridge push', col: 'Sub-plate process' },
            { text: 'Ocean ridge', col: 'Resultant landform' },
            { text: 'Rift valley', col: 'Resultant landform' },
            { text: 'Pillow lavas', col: 'Resultant landform' }
          ] },

        { type: 'checkpoint', title: 'Checkpoint — constructive margins', items: [
          { type: 'mcq',
            stem: 'What causes decompression melting at a constructive margin?',
            teach: 'Upwelling mantle material reduces the pressure on partially molten rock.',
            options: [
              { text: 'Upwelling mantle material reduces the pressure on partially molten rock', correct: true, why: 'Correct — less pressure means the already partially molten rock melts further.' },
              { text: 'Sea water lowers the melting point of the lithosphere', why: 'That is hydration melting, which happens at destructive margins.' },
              { text: 'Friction between the two plates generates heat', why: 'Friction matters at conservative margins, not here — these plates are moving apart.' },
              { text: 'The slab sinks deep enough to reach hotter rock', why: 'That is subduction melting at a destructive margin.' }
            ] },
          { type: 'mcq',
            stem: 'Which rock type forms the pillow lavas at a mid-ocean ridge?',
            teach: 'Fine-textured igneous basalt (or gabbro).',
            options: [
              { text: 'Basalt', correct: true, why: 'Right — fine-textured igneous basalt or gabbro, formed as lava cools rapidly under water.' },
              { text: 'Granite', why: 'Granite is a coarse continental rock, not the product of rapid undersea cooling.' },
              { text: 'Limestone', why: 'A sedimentary rock — not formed from cooling lava at all.' },
              { text: 'Slate', why: 'A metamorphic rock, formed by heat and pressure on shale rather than by eruption.' }
            ] },
          { type: 'cloze', title: 'Naming the three stages',
            prompt: 'Name the place example for each stage.',
            teach: 'Great Rift Valley → Red Sea → Mid-Atlantic Ridge.',
            segments: [
              { t: 'txt', text: 'The stage where the centre slumps between the faults is illustrated by the Great ' },
              { t: 'gap', answer: 'Rift' },
              { t: 'txt', text: ' Valley; the shallow linear sea stage by the ' },
              { t: 'gap', answer: 'Red' },
              { t: 'txt', text: ' Sea; and the mature broad ridge by the Mid-' },
              { t: 'gap', answer: 'Atlantic', show: 1 },
              { t: 'txt', text: ' Ridge.' }
            ] }
        ] }
      ]
    },

    /* ======================================================
       7 — DESTRUCTIVE
       ====================================================== */
    {
      id: 'destructive', num: 7,
      title: 'The Destructive Margins',
      subtitle: 'Trenches, island arcs and fold mountains',
      specIds: ['ii', 'iii'],
      blocks: [
        { type: 'text', html:
          '<p>Destructive margins come in two forms, and the specification expects you to know ' +
          'both. The processes are largely the same; what differs is <strong>what the trench ' +
          'forms parallel to</strong>. Get that distinction right and you have the marks.</p>' },

        { type: 'callout', genre: 'keypoint', title: 'The one-line difference',
          html: '<p>At an <strong>oceanic-to-oceanic</strong> margin, the trench forms parallel ' +
          'to an <strong>island arc</strong>. At a <strong>continental-to-oceanic</strong> ' +
          'margin, the trench forms parallel to a <strong>fold mountain chain</strong>.</p>' },

        { type: 'heading', text: 'Oceanic to oceanic' },
        { type: 'sim', id: 'destructive-oo' },

        { type: 'steps', items: [
          'Two oceanic plates converge due to convection currents in the asthenosphere.',
          'The denser oceanic plate (the Pacific Plate) is subducted into the asthenosphere beneath the less dense oceanic plate (the Indo-Australian Plate) due to <strong>slab pull</strong>. As the magma in the asthenosphere becomes cooler and denser, the convection currents drag the oceanic lithosphere down further.',
          'As the plate is subducted, the lithosphere melts as it meets the hotter asthenosphere — <strong>subduction melting</strong>.',
          'This is aided by <strong>hydration melting</strong>, which begins at depths of 80 km. Without it, melting would not start until 200 km. Sea water carried down by the subducting plate lowers the melting point of the lithosphere and mixes with the melted material, reducing its viscosity and helping it flow.',
          'Compression forces cause the plate to buckle and deform, marking the point of subduction with a <strong>deep ocean trench</strong> — a linear chasm plunging 11 km below sea level, forming parallel to an island arc.',
          'By 600–700 km, subduction stops as the descending plate is fully assimilated into the asthenosphere.',
          'The magma produced is less dense than the surrounding rock, so it rises. Recycled crustal material erupts onto the ocean floor, cools, and builds up until it reaches the surface, creating an <strong>island arc</strong> lying parallel to the trench.'
        ] },

        { type: 'callout', genre: 'place', place: 'Tonga',
          html: '<p>The Pacific Plate is subducted beneath the Indo-Australian Plate, creating ' +
          'the <strong>Tonga Trench</strong>. Over <strong>150 islands</strong> — the Tongan ' +
          'Islands — lie to the west of, and parallel to, the trench.</p>' },

        { type: 'heading', text: 'Oceanic to continental' },
        { type: 'sim', id: 'destructive-co' },

        { type: 'steps', items: [
          'An oceanic and a continental plate converge due to convection currents in the asthenosphere.',
          'The Nazca Plate moves from west to east. The denser oceanic lithosphere is subducted beneath the less dense continental lithosphere of the South American Plate due to slab pull.',
          'Compression forces cause the plate to buckle and deform, marking the point of subduction with a <strong>deep ocean trench</strong> plunging 11 km below sea level. At this type of margin the trench forms parallel to a <strong>fold mountain chain</strong>.',
          'Subduction melting occurs as the lithosphere meets the hotter asthenosphere, aided by hydration melting from 80 km.',
          'By 600–700 km, subduction stops as the descending plate is fully assimilated.',
          'The magma rises beneath the continental lithosphere. It may force its way through lines of weakness into the plate, or right through it to erupt at the surface.'
        ] },

        { type: 'callout', genre: 'place', place: 'The Andes',
          html: '<p>The <strong>Peru–Chile Trench</strong>, with volcanic activity common on ' +
          'the west coast of South America — <strong>Mt Tacora</strong> in Chile and ' +
          '<strong>Nevado del Ruiz</strong> in Colombia.</p>' },

        { type: 'heading', text: 'Volcanic and seismic activity' },
        { type: 'text', html:
          '<p>Eruptions at destructive margins tend to be more <strong>violent and less ' +
          'fluid</strong>, with silica-rich lava coming from steeper, cone-shaped volcanoes. ' +
          'Magma produced by former ocean plate melting deep in subduction zones rises to ' +
          'penetrate and move through the plate above, leading to violent volcanic activity.</p>' +
          '<p>Shallow earthquakes occur near the deep ocean trench, and with increasing distance ' +
          'away the foci are deeper. This plane of earthquakes is the <strong>Benioff Zone</strong> ' +
          '— at a continental-to-oceanic margin it is the boundary between the subducting ' +
          'oceanic plate and the overriding continental plate, a sloping plane of shallow, ' +
          'intermediate and deep earthquakes. As the plate is subducted it can become stuck due ' +
          'to increased friction; tension and stress build until they are released as seismic ' +
          'waves.</p>' },

        { type: 'callout', genre: 'place', place: 'Mt Pinatubo',
          html: '<p>The 1991 eruption was an example of the violent volcanic activity ' +
          'associated with destructive margins. It sent a vast cloud of debris ' +
          '<strong>16 km wide</strong>, more than <strong>30 km</strong> into the atmosphere.</p>' },

        { type: 'data', facts: [
          { value: '11', unit: 'km', label: 'Depth of a deep ocean trench', detail: 'Below sea level — a deep, linear chasm.' },
          { value: '80', unit: 'km', label: 'Where hydration melting begins', detail: 'Without it, melting would not begin until 200 km.' },
          { value: '600–700', unit: 'km', label: 'Where subduction stops', detail: 'The descending plate is fully assimilated into the asthenosphere.' },
          { value: '150+', unit: '', label: 'Islands in the Tongan island arc', detail: 'West of, and parallel to, the Tonga Trench.' },
          { value: '16', unit: 'km', label: 'Width of the 1991 Pinatubo debris cloud', detail: 'Thrown more than 30 km into the atmosphere.' }
        ] },

        { type: 'match', title: 'Which margin does each feature belong to?',
          prompt: 'Both are destructive — but the landforms differ. Drag each margin onto its feature.',
          pairs: [
            { left: 'A trench forming parallel to an island arc', right: 'Oceanic to oceanic' },
            { left: 'A trench forming parallel to a fold mountain chain', right: 'Oceanic to continental' },
            { left: 'The Tonga Trench and over 150 islands', right: 'Pacific under Indo-Australian' },
            { left: 'The Peru–Chile Trench and the Andes', right: 'Nazca under South American' },
            { left: 'Magma forcing through lines of weakness in a continental plate', right: 'Nevado del Ruiz' }
          ] },

        { type: 'callout', genre: 'examtip', title: 'Do not say "the lighter plate sinks"',
          html: '<p>It is the <strong>denser</strong> plate that is subducted. Writing that the ' +
          '"lighter" plate goes under is one of the most common errors in this topic, and it ' +
          'costs the process mark every time. Oceanic lithosphere is denser than continental, ' +
          'which is why it always subducts.</p>' },

        { type: 'checkpoint', title: 'Checkpoint — destructive margins', items: [
          { type: 'mcq',
            stem: 'Why does sea water carried down by the subducting plate matter?',
            teach: 'It lowers the melting point — hydration melting from 80 km rather than 200 km.',
            options: [
              { text: 'It lowers the melting point of the lithosphere, so melting begins at 80 km rather than 200 km', correct: true, why: 'Correct — and it reduces the viscosity of the melt, helping it flow.' },
              { text: 'It cools the descending plate so it sinks faster', why: 'The plate is already cool and dense; the water\'s role is chemical, not thermal.' },
              { text: 'It causes decompression melting', why: 'Decompression melting happens where pressure is released at a constructive margin.' },
              { text: 'It lubricates the boundary so no earthquakes occur', why: 'Destructive margins have plenty of earthquakes — the Benioff Zone.' }
            ] },
          { type: 'mcq',
            stem: 'What is the Benioff Zone?',
            teach: 'The sloping plane of earthquake foci that deepens away from the trench.',
            options: [
              { text: 'A sloping plane of shallow, intermediate and deep earthquakes along the subducting plate', correct: true, why: 'Right — shallow near the trench, deeper with distance away from it.' },
              { text: 'The depth at which hydration melting begins', why: 'That is 80 km — a depth, not a plane of earthquake foci.' },
              { text: 'The line of volcanoes above a subduction zone', why: 'That is the island arc or volcanic chain, not the Benioff Zone.' },
              { text: 'The boundary between the crust and the mantle', why: 'That is the Moho discontinuity.' }
            ] },
          { type: 'mcq',
            stem: 'Which plate subducts, and why?',
            teach: 'The denser plate — oceanic lithosphere is denser than continental.',
            options: [
              { text: 'The denser plate, because oceanic lithosphere is denser than continental', correct: true, why: 'Correct. Never write that the "lighter" plate goes under.' },
              { text: 'The lighter plate, because it is pushed beneath the heavier one', why: 'This is the classic error. Density drives subduction, and the denser plate goes down.' },
              { text: 'Whichever plate is moving faster', why: 'Speed does not determine which subducts — relative density does.' },
              { text: 'Whichever plate is older, regardless of type', why: 'Age contributes to density, but the rule to state is that the denser plate subducts.' }
            ] }
        ] }
      ]
    },

    /* ======================================================
       8 — COLLISION
       ====================================================== */
    {
      id: 'collision', num: 8,
      title: 'The Collision Margin',
      subtitle: 'How the Himalayas were built',
      specIds: ['ii', 'iii'],
      blocks: [
        { type: 'text', html:
          '<p>A collision margin begins life as a destructive one. What makes it different is ' +
          'what happens when the ocean finally runs out.</p>' },

        { type: 'sim', id: 'collision' },

        { type: 'steps', items: [
          'As two continental plates approach one another due to convection currents, the oceanic lithosphere between them subducts below one of the continents. At this stage it is a destructive margin.',
          'Eventually the two sections of continental lithosphere — the Indian Plate and the Eurasian Plate — collide, and the subducting oceanic lithosphere becomes detached from the continents above.',
          'It continues down into the asthenosphere, where it slowly melts and is fully assimilated. Eventually all subduction stops below a collision margin.',
          'Because the continental lithosphere is too <strong>buoyant</strong> to subduct, the plates collide into each other and are compressed.',
          'The continental material thickens due to folding and faulting by compressional forces. Crustal material and seafloor sediment deposited between the plates buckles upwards into a range of <strong>fold mountains</strong>.'
        ] },

        { type: 'callout', genre: 'place', place: 'The Himalayas',
          html: '<p>The Indian Plate meeting the Eurasian Plate. The sediment that once lay on ' +
          'the floor of the ocean between them is now buckled up into the highest mountains on ' +
          'Earth.</p>' },

        { type: 'callout', genre: 'keypoint', title: 'Why there are no volcanoes here',
          html: '<p>Violent earthquakes are common at a collision margin: the plates become ' +
          'stuck, pressure builds, and is eventually released as seismic waves. But there is ' +
          '<strong>no volcanic activity</strong>, because there is <strong>no subduction and no ' +
          'creation of new crust</strong>. This is a favourite exam point — learn the reason, ' +
          'not just the fact.</p>' },

        { type: 'mcq',
          stem: 'A collision margin has violent earthquakes but no volcanic activity. Why not?',
          options: [
            { text: 'There is no subduction, so no new magma is generated to reach the surface', correct: true, why: 'Exactly. Once the continents meet, subduction ceases — and with it the supply of magma.' },
            { text: 'The mountains are too high for magma to reach the surface', why: 'Height is not the obstacle; the absence of subduction and magma generation is.' },
            { text: 'The continental crust is too thin to hold a magma chamber', why: 'Continental crust here is unusually <em>thick</em>, not thin — but that is not the reason either.' },
            { text: 'The plates are moving too slowly for friction to melt rock', why: 'Friction is not the source of magma at any margin in this topic.' }
          ] },

        { type: 'examq',
          qid: 'q-collision9',
          source: 'CCEA A2 1 Physical Processes, Landforms and Management, Specimen Assessment Materials © CCEA 2017',
          question: 'With the aid of a diagram, explain the processes and landforms associated with a collision plate margin. <strong>[9]</strong>',
          marks: 9,
          plan: [
            'Two continental plates move towards each other because…',
            'The oceanic lithosphere between them…',
            'When the continents meet, the lithosphere is too buoyant to…',
            'Compression causes the crust to…',
            'The resulting landform is…',
            'There is no volcanic activity because…'
          ],
          schemeNote: 'Note the command: <em>with the aid of a diagram</em>. Sketch it as well as writing it — the diagram carries marks, and Plate VII in the Plate Room is the version to practise.',
          scheme: [
            { point: 'Two continental plates converge due to convection currents in the asthenosphere' },
            { point: 'The oceanic lithosphere between them subducts first — the margin begins as a destructive one' },
            { point: 'The plates meet and the subducting slab detaches, sinks and is assimilated, so subduction stops' },
            { point: 'Continental lithosphere is too buoyant to subduct' },
            { point: 'The plates are compressed against one another' },
            { point: 'Continental material thickens through folding and faulting' },
            { point: 'Crustal material and seafloor sediment buckle upwards' },
            { point: 'Names <strong>fold mountains</strong> as the resultant landform, with a place example such as the Himalayas' },
            { point: 'Notes violent shallow earthquakes but no volcanic activity, and explains why' }
          ],
          examiner: 'Nine marks, and one of the most predictable questions on this option. The ' +
            'answers that fall short are usually the ones that describe two continents crashing ' +
            'together without ever mentioning the ocean that had to close first, or that forget ' +
            'to explain the absence of volcanoes.'
        },

        { type: 'checkpoint', title: 'Checkpoint — collision', items: [
          { type: 'mcq',
            stem: 'What happens to the oceanic lithosphere that lay between the two continents?',
            teach: 'It detaches, sinks into the asthenosphere and is fully assimilated.',
            options: [
              { text: 'It detaches, sinks into the asthenosphere and is assimilated, so subduction stops', correct: true, why: 'Correct — and that is why the margin stops behaving destructively.' },
              { text: 'It is pushed upwards to form the fold mountains', why: 'It is the seafloor <em>sediment</em> that buckles upwards, not the oceanic slab itself.' },
              { text: 'It remains locked between the two plates', why: 'It becomes detached from the continents above and continues downwards.' },
              { text: 'It melts and erupts as volcanoes along the range', why: 'There is no volcanic activity at a collision margin.' }
            ] },
          { type: 'cloze', title: 'Why the continents cannot subduct',
            prompt: 'One word.',
            teach: 'Continental lithosphere is too buoyant to subduct.',
            segments: [
              { t: 'txt', text: 'The continental lithosphere is too ' },
              { t: 'gap', answer: 'buoyant' },
              { t: 'txt', text: ' to subduct, so instead the plates are ' },
              { t: 'gap', answer: 'compressed' },
              { t: 'txt', text: '.' }
            ] }
        ] }
      ]
    },

    /* ======================================================
       9 — CONSERVATIVE
       ====================================================== */
    {
      id: 'conservative', num: 9,
      title: 'The Conservative Margin',
      subtitle: 'Sliding past — and why nothing erupts',
      specIds: ['ii'],
      blocks: [
        { type: 'text', html:
          '<p>The fourth margin creates no crust and destroys none — it conserves it. That one ' +
          'fact explains almost everything else about it.</p>' },

        { type: 'sim', id: 'conservative' },

        { type: 'steps', items: [
          'Convection currents in the asthenosphere cause two plates to slide past one another, with the movement of the plate parallel to the plate boundary. Plates can move in opposite directions, or in the same direction at different speeds.',
          'As the plates slide past one another there is a build-up of stress and tension between the plate edges. Frictional forces lock the blocks of lithosphere together.',
          'Eventually those forces are overcome and there is a sudden release of friction. The stress is released as seismic waves during an earthquake.',
          'Frequent small tremors are common at conservative boundaries, but several earthquakes of considerable magnitude also occur.'
        ] },

        { type: 'callout', genre: 'place', place: 'San Andreas Fault',
          html: '<p>In California the Pacific Plate and the North American Plate are ' +
          '<strong>both moving north-west</strong>, but at different speeds — the Pacific Plate ' +
          'at approximately <strong>6 cm per year</strong> and the North American Plate at ' +
          'approximately <strong>2 cm per year</strong>. In 1906 the crust was displaced by ' +
          '<strong>7 m</strong>, generating a <strong>magnitude 7.8</strong> earthquake.</p>' },

        { type: 'callout', genre: 'place', place: 'North Anatolian Fault',
          html: '<p>A second example, in northern Turkey. It marks the boundary between the ' +
          'Anatolian plate and the larger Eurasian plate, and is one of the most seismically ' +
          'active zones in the world. Turkey is being squeezed sideways to the west as the ' +
          'Arabian plate pushes into the Eurasian plate, and earthquakes happen regularly along ' +
          'the fault as different sections break.</p>' },

        { type: 'data', facts: [
          { value: '6', unit: 'cm/yr', label: 'Speed of the Pacific Plate', detail: 'Moving north-west along the San Andreas Fault.' },
          { value: '2', unit: 'cm/yr', label: 'Speed of the North American Plate', detail: 'Also north-west — the difference in speed is what builds the strain.' },
          { value: '7', unit: 'm', label: 'Crustal displacement in 1906', detail: 'Generating a magnitude 7.8 earthquake on the San Andreas Fault.' }
        ] },

        { type: 'callout', genre: 'keypoint', title: 'Crust is conserved — so no volcanoes',
          html: '<p>Because crust is neither created nor destroyed, there is no volcanic ' +
          'activity. As no subduction takes place, no rising magma can reach the surface, so ' +
          'extrusive volcanic activity does not occur.</p>' },

        { type: 'heading', text: 'Transform faults' },
        { type: 'text', html:
          '<p>Conservative margins can also result from very complex movements of plates as they ' +
          'curve across the ocean floor. To avoid the margin twisting into an "S" shape, it ' +
          'instead fractures perpendicular to the margin. This creates a series of ' +
          '<strong>transform faults</strong> bisecting the constructive margin, forming a ' +
          '<strong>zig-zag pattern</strong> along the length of the ridge.</p>' },

        { type: 'sequence', title: 'The earthquake cycle at a conservative margin',
          prompt: 'Order the four stages.',
          items: [
            'The plates slide past one another, driven by convection currents',
            'Friction locks the blocks of lithosphere together',
            'Stress and tension build between the plate edges',
            'The frictional forces are overcome and stress is released as seismic waves'
          ] },

        { type: 'examq',
          qid: 'q-naf9',
          source: 'CCEA A2 1 Physical Processes, Landforms and Management, Specimen Assessment Materials © CCEA 2017',
          question: 'Study Resource A which describes the tectonic situation in Northern Turkey. Identify the type of plate margin found at the North Antolian Fault and explain the processes that result in earthquakes without volcanic activity along this margin. <strong>[9]</strong>',
          resource: {
            label: 'Resource A: Tectonic instability in Turkey',
            html: '<p>The North Anatolian Fault is a major fracture that runs across the ' +
              'northern part of Turkey, marking the boundary between the Anatolian plate and ' +
              'the larger Eurasian plate. The area is considered as one of the most seismically ' +
              'active zones of the world. Turkey is being squeezed sideways to the west as the ' +
              'Arabian plate pushes into the Eurasian plate. The North Anatolian Fault forms ' +
              'the edge of the Anatolian plate and earthquakes happen regularly along it as ' +
              'different sections break. The map illustrates how, within the last one hundred ' +
              'years, a series of significant earthquakes has rocked northern Turkey along the ' +
              'line of the fault.</p>' +
              '<p class="fc-res-note">The resource map plots significant earthquakes along the ' +
              'fault over the last century — 1939, 1942, 1943, 1944, 1957, 1967 and 1999 — ' +
              'running broadly from east to west across northern Turkey, with the Anatolian ' +
              'plate moving west and the Arabian plate pushing north.</p>'
          },
          marks: 9,
          plan: [
            'The North Anatolian Fault is a … margin, because…',
            'The plates move…',
            'Frictional forces…',
            'Stress builds until…',
            'There is no volcanic activity because…',
            'The resource shows that…'
          ],
          schemeNote: 'Two commands in one: <em>identify</em> the margin, then <em>explain</em> the processes. Do both, and use the resource — the dates on the map are there to be used.',
          scheme: [
            { point: 'Identifies the margin as <strong>conservative</strong>' },
            { point: 'Supports this from the resource — plates sliding past one another, Turkey squeezed sideways to the west' },
            { point: 'Movement is parallel to the plate boundary, driven by convection currents in the asthenosphere' },
            { point: 'Frictional forces lock the blocks of lithosphere together' },
            { point: 'Stress and tension build between the plate edges' },
            { point: 'The forces are eventually overcome and there is a sudden release' },
            { point: 'The stress is released as seismic waves — an earthquake' },
            { point: 'No volcanic activity because crust is neither created nor destroyed — it is conserved' },
            { point: 'No subduction takes place, so no rising magma can reach the surface' },
            { point: 'Uses the resource\'s evidence of repeated significant earthquakes along the fault as different sections break' }
          ],
          examiner: 'The "without volcanic activity" clause is the part candidates skip. It is ' +
            'worth marks in its own right, and the explanation has two halves: crust is ' +
            'conserved, and there is no subduction to generate magma.'
        },

        { type: 'checkpoint', title: 'Checkpoint — conservative margins', items: [
          { type: 'mcq',
            stem: 'At the San Andreas Fault, how are the two plates moving?',
            teach: 'Both north-west, but at different speeds — 6 cm/yr against 2 cm/yr.',
            options: [
              { text: 'Both north-west, but at different speeds', correct: true, why: 'Correct — it is the difference in speed, not opposite directions, that builds the strain here.' },
              { text: 'Directly towards each other', why: 'That would be a destructive or collision margin.' },
              { text: 'Directly away from each other', why: 'That would be a constructive margin.' },
              { text: 'In opposite directions along the fault', why: 'Plates at a conservative margin <em>can</em> move in opposite directions, but at the San Andreas they both move north-west.' }
            ] },
          { type: 'mcq',
            stem: 'Why does a zig-zag pattern of transform faults develop along a ridge?',
            teach: 'The margin fractures perpendicular to itself rather than twisting into an S shape.',
            options: [
              { text: 'The margin fractures perpendicular to itself rather than twisting into an "S" shape', correct: true, why: 'Right — the fractures bisect the constructive margin, giving the zig-zag.' },
              { text: 'Earthquakes shatter the ridge into separate blocks', why: 'The pattern comes from how the margin accommodates curvature, not from earthquake damage.' },
              { text: 'Magma erupts unevenly along the ridge crest', why: 'Uneven eruption does not produce the systematic offsetting seen at transform faults.' },
              { text: 'The two plates are moving at right angles to each other', why: 'At a transform fault the plates slip laterally past one another.' }
            ] },
          { type: 'cloze', title: 'Why nothing erupts here',
            prompt: 'Complete the reason there are no volcanoes.',
            teach: 'Crust is neither created nor destroyed, and there is no subduction.',
            segments: [
              { t: 'txt', text: 'Crust is neither created nor destroyed — it is ' },
              { t: 'gap', answer: 'conserved' },
              { t: 'txt', text: '. As no ' },
              { t: 'gap', answer: 'subduction' },
              { t: 'txt', text: ' takes place, no rising magma can reach the surface.' }
            ] }
        ] }
      ]
    },

    /* ======================================================
       10 — THE FIVE LANDFORMS
       ====================================================== */
    {
      id: 'landforms', num: 10,
      title: 'The Five Landforms',
      subtitle: 'Everything specification statement (iii) asks for',
      specIds: ['iii'],
      blocks: [
        { type: 'callout', genre: 'speclink', title: 'The exact wording',
          html: '<p>"Demonstrate knowledge and understanding of resultant landforms — ' +
          '<strong>ocean ridges, rift valleys, deep sea trenches, island arcs and fold ' +
          'mountains</strong>." Five landforms, named. This chapter gathers them, and each one ' +
          'links back to the margin that built it.</p>' },

        { type: 'keyterms', terms: [
          { term: 'Ocean ridge', def: 'A raised portion of the sea bed, possibly thousands of kilometres in length and 1–3 km in height. The Mid-Atlantic Ridge is around 2,000 km wide. Formed at a constructive margin, where new crust is created and an isostatic response lifts the young crust.' },
          { term: 'Rift valley', def: 'A linear valley running along the length of an ocean ridge — as much as 1.5 km deep and up to 30 km wide — formed where the central area slumps and collapses between fault lines. Also found on land, as at the Great Rift Valley in East Africa.' },
          { term: 'Deep sea trench', def: 'A deep, linear chasm plunging as much as 11 km below sea level, marking the point of subduction at a destructive margin, where compression makes the plate buckle and deform.' },
          { term: 'Island arc', def: 'A curved chain of volcanic islands lying parallel to a deep ocean trench, built where magma from a subducting oceanic plate erupts onto the ocean floor and accumulates until it breaks the surface. Formed at an oceanic-to-oceanic destructive margin.' },
          { term: 'Fold mountains', def: 'A range formed where compression buckles crustal material and seafloor sediment upwards. Formed at a collision margin, and at an oceanic-to-continental destructive margin, where the trench forms parallel to the chain.' }
        ] },

        { type: 'classify', title: 'Which margin builds which landform?',
          prompt: 'Sort all five landforms — plus the volcanic features — onto the margin that produces them.',
          columns: ['Constructive', 'Destructive', 'Collision'],
          items: [
            { text: 'Ocean ridge', col: 'Constructive' },
            { text: 'Rift valley', col: 'Constructive' },
            { text: 'Pillow lavas', col: 'Constructive' },
            { text: 'Deep sea trench', col: 'Destructive' },
            { text: 'Island arc', col: 'Destructive' },
            { text: 'Composite volcanoes', col: 'Destructive' },
            { text: 'Fold mountains raised with no volcanic activity', col: 'Collision' }
          ] },

        { type: 'callout', genre: 'examtip', title: 'Fold mountains appear twice',
          html: '<p>Fold mountains form at a <strong>collision</strong> margin, where two ' +
          'continents meet — and also at an <strong>oceanic-to-continental destructive</strong> ' +
          'margin, where compression buckles the edge of the continent and the trench runs ' +
          'parallel to the chain. If a question asks where fold mountains form, saying both ' +
          '(and distinguishing them) is what separates a strong answer.</p>' },

        { type: 'match', title: 'Landform to place',
          prompt: 'Drag the place example onto the landform it illustrates.',
          pairs: [
            { left: 'Ocean ridge', right: 'Mid-Atlantic Ridge' },
            { left: 'Rift valley (on land)', right: 'Great Rift Valley' },
            { left: 'Linear sea flooding a rift', right: 'Red Sea' },
            { left: 'Deep sea trench with an island arc', right: 'Tonga Trench' },
            { left: 'Deep sea trench with fold mountains', right: 'Peru–Chile Trench' },
            { left: 'Fold mountains at a collision margin', right: 'The Himalayas' }
          ] },

        { type: 'classify', title: 'The full organiser',
          prompt: 'The three-column organiser one last time — this time with everything in it.',
          columns: ['Plate process', 'Sub-plate process', 'Resultant landform'],
          items: [
            { text: 'Plates moving apart', col: 'Plate process' },
            { text: 'Plates converging', col: 'Plate process' },
            { text: 'Plates sliding past one another', col: 'Plate process' },
            { text: 'Continental plates colliding', col: 'Plate process' },
            { text: 'Decompression melting', col: 'Sub-plate process' },
            { text: 'Hydration melting', col: 'Sub-plate process' },
            { text: 'Subduction melting', col: 'Sub-plate process' },
            { text: 'Slab pull', col: 'Sub-plate process' },
            { text: 'Ridge push', col: 'Sub-plate process' },
            { text: 'Isostatic response', col: 'Sub-plate process' },
            { text: 'Ocean ridge', col: 'Resultant landform' },
            { text: 'Rift valley', col: 'Resultant landform' },
            { text: 'Deep sea trench', col: 'Resultant landform' },
            { text: 'Island arc', col: 'Resultant landform' },
            { text: 'Fold mountains', col: 'Resultant landform' }
          ] },

        { type: 'checkpoint', title: 'Checkpoint — the landforms', items: [
          { type: 'mcq',
            stem: 'An island arc always forms parallel to which feature?',
            teach: 'A deep ocean trench, at an oceanic-to-oceanic destructive margin.',
            options: [
              { text: 'A deep ocean trench', correct: true, why: 'Correct — the arc of islands runs parallel to the trench, as at Tonga.' },
              { text: 'An ocean ridge', why: 'Ocean ridges form at constructive margins, where no subduction occurs.' },
              { text: 'A rift valley', why: 'Rift valleys form where crust is pulled apart, not where it is subducted.' },
              { text: 'A transform fault', why: 'Transform faults offset ridges; they do not generate island arcs.' }
            ] },
          { type: 'mcq',
            stem: 'At which TWO margins can fold mountains form?',
            teach: 'Collision, and oceanic-to-continental destructive.',
            options: [
              { text: 'Collision, and oceanic-to-continental destructive', correct: true, why: 'Right — the Himalayas at a collision margin, the Andes at a destructive one.' },
              { text: 'Constructive, and conservative', why: 'Neither compresses continental crust; one creates crust and the other conserves it.' },
              { text: 'Collision, and oceanic-to-oceanic destructive', why: 'An oceanic-to-oceanic margin produces an island arc, not fold mountains.' },
              { text: 'Conservative, and collision', why: 'Conservative margins produce fault lines, not mountain ranges.' }
            ] },
          { type: 'mcq',
            stem: 'How deep can a deep sea trench plunge?',
            teach: 'As much as 11 km below sea level.',
            options: [
              { text: 'About 11 km below sea level', correct: true, why: 'Correct — the figure to quote.' },
              { text: 'About 1.5 km below sea level', why: 'That is the depth of the rift valley along an ocean ridge.' },
              { text: 'About 80 km below sea level', why: '80 km is the depth at which hydration melting begins, not a trench depth.' },
              { text: 'About 600 km below sea level', why: '600–700 km is where subduction stops, deep inside the asthenosphere.' }
            ] }
        ] }
      ]
    },

    /* ======================================================
       11 — THE EXAM ZONE
       ====================================================== */
    {
      id: 'exam-zone', num: 11,
      title: 'The Exam Zone',
      subtitle: 'Real questions, real mark schemes, and marking a real script',
      specIds: ['i', 'ii', 'iii'],
      blocks: [
        { type: 'text', html:
          '<p>Everything in this chapter is the real thing: questions from CCEA\'s own ' +
          'assessment materials, the mark-scheme points behind them, and a genuine pupil script ' +
          'to mark. Work through it last, once the rest of the atlas is secure.</p>' },

        { type: 'callout', genre: 'examtip', title: 'What the paper looks like',
          html: '<p>The A2 Unit 1 external exam paper tests your knowledge of physical geography, ' +
          'with a particular focus on physical processes, landforms and their management. The ' +
          'exam lasts <strong>1 hour 30 minutes</strong> and the unit makes up <strong>24% of ' +
          'your final A-level grade</strong>.</p>' },

        { type: 'callout', genre: 'examtip', title: 'Three standing instructions',
          html: '<ul>' +
          '<li>Reference to place is for illustration purposes — review your notes and make ' +
          'sure you have examples throughout.</li>' +
          '<li>Complete every question in the past paper booklet.</li>' +
          '<li>Review the model answers.</li></ul>' },

        { type: 'examq',
          qid: 'q-oceanic8',
          source: 'CCEA A2 1 Physical Processes, Landforms and Management, Specimen Assessment Materials © CCEA 2017',
          question: 'Describe and explain <strong>two</strong> types of evidence for plate movement based on knowledge of oceanic crust material. <strong>[8]</strong>',
          marks: 8,
          plan: [
            'The first type of evidence from oceanic crust is…',
            'This shows that…',
            'A second type of evidence is…',
            'This proves that…'
          ],
          schemeNote: 'Her PowerPoint records this as the May 2015 question, and flags the two ' +
            'themes it expects: magnetic striping and geological evidence. Note the command is ' +
            '<em>describe AND explain</em> — describing the pattern alone will not do.',
          scheme: [
            { point: 'Selects two distinct types of oceanic evidence (for example magnetic striping and the age of the sea floor)' },
            { point: 'Palaeomagnetism: iron particles align with the magnetic field as lava cools and record it permanently' },
            { point: 'The field reverses approximately every one million years' },
            { point: 'This produces bands of alternating polarity parallel to the ridge, detected by magnetometers in the 1960s' },
            { point: 'Age of the sea floor: rocks are youngest at the ridge and grow older away from it' },
            { point: 'Sediment is minimal, so the floor cannot be as old as the continents' },
            { point: 'Stresses that both patterns are <strong>symmetrical</strong> either side of the ridge' },
            { point: 'Explains that this can only be accounted for by new crust forming at the ridge and moving outwards — sea-floor spreading' }
          ],
          model: '<p>The first type of evidence is <mark>magnetic striping</mark>. When lava ' +
            'erupts at a mid-ocean ridge and cools, <mark>iron particles within it align with ' +
            'the Earth\'s magnetic field and record its direction permanently</mark>. Because ' +
            '<mark>the field reverses approximately every one million years</mark>, rock formed ' +
            'after a reversal records the opposite polarity. Magnetometers towed behind ships ' +
            'in the 1960s revealed <mark>bands of alternating polarity lying parallel to the ' +
            'ridge and symmetrical on both sides of it</mark>. This can only be explained if ' +
            'new crust forms at the ridge and is carried outwards.</p>' +
            '<p>The second type is <mark>the age and sediment pattern of the ocean floor</mark>. ' +
            'The rocks of the ridge crest are very young, and <mark>their age increases away ' +
            'from the ridge in a symmetrical pattern</mark>. <mark>Sediment is minimal ' +
            'compared with the continents</mark>; if the ocean floors were billions of years ' +
            'old they would lie beneath thick deposits. Together these show that ' +
            '<mark>the sea floor is continually created at the ridge and destroyed ' +
            'elsewhere</mark>.</p>',
          modelNote: 'Assembled from the mark-scheme points recorded in her PowerPoint and the ' +
            'wording of her own workbook notes — this is a worked model, not a candidate script.',
          examiner: 'Two types, described and explained. A common way to lose marks here is to ' +
            'write a great deal about palaeomagnetism and then run out of time for the second ' +
            'type. Budget the space: roughly half each.'
        },

        { type: 'marker',
          qid: 'm-destconst',
          question: 'Explain the processes and landforms associated with a destructive and a constructive plate margin. <strong>[8]</strong>',
          marks: 8,
          intro: 'This is a real answer written by a pupil, reproduced exactly as it was ' +
            'written. Her teacher has annotated one line of it in green. Read it, decide what ' +
            'you would give it, and then compare.',
          answer:
            '<p>Destructive plate margins occur where two plates meet, moving in opposite ' +
            'directions, e.g. the Nazca Plate and the South American Plate. By contrast, ' +
            'constructive plate margins are located where two plates are moving away from each ' +
            'other, such as the N. American Plate and the Eurasian plate.</p>' +
            '<p>At destructive plate margins the lighter of the two plates is pulled underneath ' +
            'the other, in the process of subduction, leaving a deep ocean trench. As the plate ' +
            'being subducted reaches depths of 200–300 km some of its material will melt and ' +
            'rise up underneath the other plate sometimes breaking through the surface forming ' +
            'volcanoes.</p>' +
            '<p>However, at constructive plate margins, subduction does not occur. Instead, the ' +
            'two plates moving apart leave cracks and eventually a gap between them in which ' +
            'magma will rise up and create new crust material, forming mid-ocean ridges and ' +
            'volcanoes.</p>',
          teacherNote: 'least dense — the teacher\'s own correction, written beside "the lighter of the two plates"',
          bands: [
            { band: 'Band 1', range: '0–3 marks', descriptor: 'Limited. Little accurate process, few or no examples, landforms barely mentioned.' },
            { band: 'Band 2', range: '4–6 marks', descriptor: 'Sound. Basic processes correct with valid examples, but gaps in detail, terminology or landform coverage.' },
            { band: 'Band 3', range: '7–8 marks', descriptor: 'Excellent. Accurate, detailed processes using specialist terminology, sub-plate processes named, a full range of landforms and secure place examples.' }
          ],
          verdict: {
            band: 'Band 2', mark: '4',
            commentary:
              '<p><strong>What it does well</strong></p><ul>' +
              '<li>Valid, correctly named examples for both margins — Nazca and South American.</li>' +
              '<li>The core process is right: subduction leaves a deep ocean trench.</li>' +
              '<li>Correct that constructive margins create new crust and mid-ocean ridges.</li>' +
              '<li>Genuinely comparative structure, signposted with "By contrast" and "However" — which is exactly what the question wants.</li>' +
              '</ul>' +
              '<p><strong>Where it loses marks</strong></p><ul>' +
              '<li><strong>A process error.</strong> "The <em>lighter</em> of the two plates is pulled underneath" — it is the <strong>denser</strong> plate that subducts. Her teacher has flagged exactly this.</li>' +
              '<li><strong>Wrong figures.</strong> "200–300 km" does not match the taught values: hydration melting begins at 80 km, and the slab is fully assimilated by 600–700 km.</li>' +
              '<li><strong>Landforms are thin.</strong> The question asks for landforms, and only the trench and the mid-ocean ridge appear. There is no island arc, no fold mountains, no rift valley.</li>' +
              '<li><strong>No sub-plate processes.</strong> Slab pull, ridge push, decompression melting and hydration melting are all absent.</li>' +
              '<li><strong>Non-specialist terminology.</strong> No use of lithosphere or asthenosphere.</li>' +
              '</ul>' +
              '<p>Sound understanding, then, but a significant error and too little landform ' +
              'detail for the top band.</p>',
            caveat: 'This verdict is our assessment against the CCEA level descriptors — the ' +
              'workbook page where the class marked this together was left blank, so your ' +
              'teacher may well justify a different mark. Use it to compare your reasoning, ' +
              'not as the last word.'
          }
        },

        { type: 'callout', genre: 'thinkdiscuss', title: 'Now mark your own',
          html: '<p>Go back to any answer you wrote in the Examiner\'s Folio and mark it the ' +
          'same way: band it first, then justify the band, then give the mark. Marking your own ' +
          'work against the descriptors is the fastest way to learn what the top band actually ' +
          'requires.</p>' },

        { type: 'callout', genre: 'keypoint', title: 'Before you close the atlas',
          html: '<p>Two things worth doing. Open the <strong>Plate Room</strong> and clear it — ' +
          'every plate mastered in Test mode means one diagram you can draw from memory. Then ' +
          'go back to the contents and set your confidence against each of the three ' +
          'specification statements, so you know exactly where to spend your next hour.</p>' }
      ]
    }
  ]
});
