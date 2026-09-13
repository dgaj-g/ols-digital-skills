/* ============================================================
   THE EVIDENCE BOARD — "The case for the moving Earth".

   A pinned board of exhibits, strung to the two claims they
   support. A third node — MECHANISM — stays empty until the
   pupil finishes the driving-forces chapter, which is the point
   Wegener could never answer.

   Teaching feature, not an assessed one: the chapter checkpoint
   does the assessing.
   ============================================================ */
(function () {
  'use strict';

  const Store = window.OLS_STORE;
  /* window.TM is defined by script.js, which loads after this file. */
  const el = (...a) => window.TM.el(...a);
  const esc = (s) => window.TM.esc(s);
  const rich = (s) => window.TM.rich(s);

  /* Exhibits — every claim traceable to the workbook. */
  const EXHIBITS = [
    {
      id: 'jigsaw', short: 'The jigsaw fit', kind: 'Continental',
      claim: 'drift', strength: 'weaker',
      shows: 'The east coast of South America and the west coast of Africa look as though ' +
        'they would slot together. Francis Bacon noticed it as early as 1620, and in 1915 ' +
        'Alfred Wegener argued the continents had once formed a single land mass, Pangaea.',
      proves: 'Bathymetric contours show the edges of the continental shelves fit together ' +
        'very well — better than the coastlines do, because the shelf edges are not worn ' +
        'back by coastal erosion.',
      limit: 'On its own it is only a shape. A good fit could be coincidence, and it says ' +
        'nothing at all about how the continents could have moved.'
    },
    {
      id: 'rocks', short: 'Matching rocks and mountains', kind: 'Continental',
      claim: 'drift', strength: 'stronger',
      shows: 'Structural trend lines of the ancient Caledonian Mountains show rocks of ' +
        'similar age, type and structure in several countries that now sit far apart.',
      proves: 'Similar mountain chains run through western Scandinavia, eastern North ' +
        'America, Greenland, north-west Africa and the British Isles. Reassembled, they ' +
        'form one continuous belt through the centre of Pangaea.',
      limit: 'Still a snapshot of the past. It shows the continents were joined, not what ' +
        'moves them now.'
    },
    {
      id: 'glossopteris', short: 'Glossopteris fossils', kind: 'Continental',
      claim: 'drift', strength: 'stronger',
      shows: 'Fossils of the same ancient plants and animals are found on continents now ' +
        'separated by thousands of miles of ocean. The fossilised fern Glossopteris turns up ' +
        'in similar-aged rocks in South America, Africa, India and Antarctica.',
      proves: 'Reassemble the continents as Pangaea and those finds form one continuous ' +
        'band. Their distribution is inexplicable unless continental drift is involved.',
      limit: 'Seeds and spores can travel. It is powerful in combination with the other ' +
        'fossil evidence rather than on its own.'
    },
    {
      id: 'mesosaurus', short: 'Mesosaurus', kind: 'Continental',
      claim: 'drift', strength: 'stronger',
      shows: 'The small, extinct freshwater reptile Mesosaurus is found only in South Africa ' +
        'and Brazil.',
      proves: 'Because it lived in fresh water it could not have swum across a vast, salty ' +
        'Atlantic. The two land masses must have been joined as one freshwater habitat when ' +
        'it was alive — which is stronger evidence than a marine fish would give.',
      limit: 'A single species, in two places. Convincing, but it dates the joining rather ' +
        'than explaining the movement.'
    },
    {
      id: 'glacial', short: 'Glacial deposits and striations', kind: 'Continental',
      claim: 'drift', strength: 'stronger',
      shows: 'Carboniferous-age glacial deposits and striations are found in India, South ' +
        'America, southern Africa, Antarctica and Australia — all now in tropical or ' +
        'temperate zones. Coal has been found in Antarctica, and striations in hot deserts.',
      proves: 'Reassembled as Gondwana, the striations align and show ice moving outwards ' +
        'from a single centre. Coal forms from tropical swamp material, so Antarctica must ' +
        'once have been warm. The continents have moved through the climate belts.',
      limit: 'Climate itself changes. The argument only works because the striations line ' +
        'up as one ice sheet when the continents are put back together.'
    },
    {
      id: 'topography', short: 'The shape of the ocean floor', kind: 'Oceanic',
      claim: 'spread', strength: 'stronger',
      shows: 'Sonar mapping of the ocean basins revealed that the deepest water is not in ' +
        'the middle. Instead the centres hold huge linear mountain ranges with deep central ' +
        'valleys, snaking through most of the world\'s oceans.',
      proves: 'The rift valley running along the ridge crest resembles rift valleys on land ' +
        'that are being pulled apart, so the ocean floor is splitting there. Deep trenches ' +
        'off some coasts show the floor sinking back into the asthenosphere.',
      limit: 'Describes the shape of the sea bed. The age evidence is what turns it into ' +
        'proof of movement.'
    },
    {
      id: 'age', short: 'The age of the sea floor', kind: 'Oceanic',
      claim: 'spread', strength: 'stronger',
      shows: 'Sediment on the ocean floor is minimal compared with the continents, and the ' +
        'rocks of the mid-ocean ridges are very young — under a million years at the crest. ' +
        'Their age increases away from the ridge, symmetrically on both sides.',
      proves: 'If the ocean floors were billions of years old they would be buried under ' +
        'thick sediment. They are not. New rock must be being created along the ridges.',
      limit: 'None worth the name — this is among the strongest evidence there is. Note ' +
        'that the pattern is symmetrical: say so in the exam.'
    },
    {
      id: 'palaeo', short: 'Palaeomagnetism', kind: 'Oceanic',
      claim: 'spread', strength: 'stronger',
      shows: 'When molten rock solidifies, iron particles line up with the Earth\'s magnetic ' +
        'field and permanently record its direction and angle of dip. The field reverses ' +
        'roughly every million years. In the 1960s ships towing magnetometers mapped the ' +
        'ocean floor.',
      proves: 'They found bands of rock parallel to the ridge with alternating magnetic ' +
        'polarity, matching on both sides. Each stripe is new crust recording the field of ' +
        'its day, so the sea floor is spreading and carrying the record outwards.',
      limit: 'None worth the name. If a question lets you choose your evidence, choose this ' +
        'one — it lets you discuss the mechanism directly.'
    }
  ];

  const CLAIMS = {
    drift: { title: 'The continents have moved', x: 24, y: 12 },
    spread: { title: 'The sea floor is spreading', x: 76, y: 12 }
  };

  function mount() {
    const wrap = el('section', 'board');

    const head = el('div', 'board-head');
    head.innerHTML =
      '<span class="board-kind">Feature</span>' +
      '<h3 class="board-title">The case for the moving Earth</h3>' +
      '<p class="board-sub">Eight exhibits, two claims — and the question that took ' +
      'another forty years to answer. Tap an exhibit to examine it.</p>';
    wrap.appendChild(head);

    const stage = el('div', 'board-stage');

    /* claim nodes */
    const nodes = el('div', 'board-claims');
    Object.keys(CLAIMS).forEach((k) => {
      const c = el('div', 'board-claim');
      c.dataset.claim = k;
      c.innerHTML = '<span class="bc-label">Claim</span>' +
        '<span class="bc-title">' + esc(CLAIMS[k].title) + '</span>';
      nodes.appendChild(c);
    });

    /* the mechanism node — locked until the forces chapter is done */
    const forcesCh = (window.TM.topic().chapters || [])
      .find((c) => c.id === 'forces');
    const unlocked = forcesCh
      ? Object.keys(Store._state().chapters[forcesCh.id] ? Store._state().chapters[forcesCh.id].done : {}).length > 0
        && !!Store.checkpoint(forcesCh.id)
      : false;

    const mech = el('div', 'board-claim board-mech' + (unlocked ? ' unlocked' : ''));
    mech.innerHTML = unlocked
      ? '<span class="bc-label">Mechanism</span>' +
        '<span class="bc-title">Ridge push and slab pull</span>' +
        '<span class="bc-note">Wegener\'s missing piece — found at last.</span>'
      : '<span class="bc-label">Mechanism</span>' +
        '<span class="bc-title bc-q">?</span>' +
        '<span class="bc-note">Wegener could not explain how continents move. ' +
        'Finish the driving-forces chapter and this fills in.</span>';
    nodes.appendChild(mech);
    stage.appendChild(nodes);

    /* exhibits */
    const grid = el('div', 'board-exhibits');
    EXHIBITS.forEach((ex) => {
      const b = el('button', 'exhibit');
      b.type = 'button';
      b.dataset.claim = ex.claim;
      b.innerHTML =
        '<span class="ex-kind">' + esc(ex.kind) + '</span>' +
        '<span class="ex-name">' + esc(ex.short) + '</span>';
      b.addEventListener('click', () => openExhibit(ex, b));
      grid.appendChild(b);
    });
    stage.appendChild(grid);
    wrap.appendChild(stage);

    /* detail panel */
    const panel = el('div', 'board-panel');
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = '<p class="bp-empty">Tap any exhibit above to see what it shows, ' +
      'what it proves, and where its limits are.</p>';
    wrap.appendChild(panel);

    function openExhibit(ex, btn) {
      grid.querySelectorAll('.exhibit').forEach((n) =>
        n.setAttribute('aria-pressed', n === btn ? 'true' : 'false'));
      nodes.querySelectorAll('.board-claim').forEach((n) =>
        n.classList.toggle('lit', n.dataset.claim === ex.claim));
      panel.innerHTML =
        '<div class="bp-head"><span class="ex-kind">' + esc(ex.kind) + ' evidence</span>' +
        '<h4>' + esc(ex.short) + '</h4></div>' +
        '<dl class="bp-body">' +
        '<dt>What it shows</dt><dd>' + rich(ex.shows) + '</dd>' +
        '<dt>What it proves</dt><dd>' + rich(ex.proves) + '</dd>' +
        '<dt>Its limit</dt><dd>' + rich(ex.limit) + '</dd>' +
        '</dl>';
    }

    /* essay-plan view */
    const toggle = el('div', 'board-toggle');
    const tBtn = el('button', 'btn btn-ghost btn-sm', 'Switch to essay-plan view');
    tBtn.type = 'button';
    let planning = false;
    tBtn.addEventListener('click', () => {
      planning = !planning;
      wrap.classList.toggle('planning', planning);
      tBtn.textContent = planning ? 'Back to the board' : 'Switch to essay-plan view';
      if (planning) {
        grid.querySelectorAll('.exhibit').forEach((n) => {
          const ex = EXHIBITS.find((e) => e.short === n.querySelector('.ex-name').textContent);
          n.dataset.strength = ex ? ex.strength : 'weaker';
        });
        planNote.hidden = false;
      } else {
        planNote.hidden = true;
      }
    });
    toggle.appendChild(tBtn);
    const planNote = el('p', 'board-plannote',
      'Sorted by how much weight each piece carries. This is the shape of an answer to ' +
      '“evaluate which type of evidence is most convincing” — lead with the oceanic ' +
      'evidence, because it lets you discuss the mechanism directly.');
    planNote.hidden = true;
    toggle.appendChild(planNote);
    wrap.appendChild(toggle);

    return wrap;
  }

  window.TM_BOARD = { mount, EXHIBITS };
})();
