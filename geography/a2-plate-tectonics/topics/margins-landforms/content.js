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

        { type: 'cloze', title: 'The jigsaw paragraph',
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
            stem: 'What would thick sediment across the whole ocean floor have suggested?',
            teach: 'Thin sediment is the clue — a young, renewing floor.',
            options: [
              { text: 'That the ocean floor was as old as the continents', correct: true, why: 'Right — the near-absence of sediment is what shows the floor is young and being renewed.' },
              { text: 'That the ocean floor was spreading quickly', why: 'The reverse. Fast renewal means less time for sediment to gather.' },
              { text: 'That there were more rivers depositing material', why: 'The argument is about the age of the floor, not the supply of sediment.' },
              { text: 'That the magnetic field had reversed more often', width: false, why: 'Sediment thickness has nothing to do with magnetic reversals.' }
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
    }
  ]
});
