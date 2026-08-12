/* ============================================================
   SimPlayer — the animated cross-sections that stand in for the
   videos the teacher asked for. Seven staged simulations, built
   from the process chains in her own workbook.

   Every scene uses the drawn-diagram colour code she teaches:
   blue = oceanic, brown = continental, red = magma.

   Each sim declares `stages`: {title, caption, enter(tl, els)}.
   The player builds one GSAP timeline with a label per stage, so
   play / step / scrub all address the same timeline.
   ============================================================ */
(function () {
  'use strict';

  const S = window.TM_SCENE;
  const { svg, scene, asthenosphere, slab, magmaArrow, motionArrow, label, C, SCENE } = S;

  /* ---------- small scene helpers ---------- */

  function sea(x, y, w, h) {
    return svg('rect', { x, y, width: w, height: h, fill: 'url(#tm-sea)' });
  }
  function sky(h) {
    return svg('rect', { x: 0, y: 0, width: SCENE.w, height: h || 300, fill: 'url(#tm-sky)' });
  }
  function hidden(node) { node.setAttribute('opacity', '0'); return node; }
  function volcano(x, baseY, h, w, colour) {
    return svg('path', {
      d: 'M' + (x - w) + ',' + baseY + 'L' + x + ',' + (baseY - h) + 'L' + (x + w) + ',' + baseY + 'z',
      fill: colour || '#6B5644', stroke: '#3E3229', 'stroke-width': '2', 'stroke-linejoin': 'round'
    });
  }
  function focusDot(x, y, depthFrac) {
    const cols = ['#FFC845', '#F58220', '#E1462C'];
    const c = cols[Math.min(2, Math.floor(depthFrac * 3))];
    return svg('circle', { cx: x, cy: y, r: 6, fill: c, stroke: '#7A1F10', 'stroke-width': '1.4' });
  }

  /* ============================================================
     THE SEVEN SIMULATIONS
     Stage captions are faithful to the workbook's process chains.
     ============================================================ */

  const SIMS = {};

  /* ---- 1. Sea-floor spreading & palaeomagnetism ---- */
  SIMS.seafloor = {
    title: 'Sea-floor spreading and magnetic striping',
    plate: 'p-seafloor',
    /* The striped record is created stage by stage during playback, so the
       static plate has to lay the finished pattern down itself. */
    plateFrame(e) {
      e.compass.setAttribute('opacity', '0');
      e.ridgeCaption.setAttribute('opacity', '0');
      for (let i = 0; i < 7; i++) {
        addStripe(e, 0, i % 2 ? 'normal' : 'reversed');
        spread(e, 64);
      }
      e.sediment.innerHTML = '';
      [[60, 9], [200, 6], [340, 3], [660, 3], [800, 6], [940, 9]].forEach(([x, h]) => {
        e.sediment.appendChild(svg('rect', {
          x: x - 45, y: 300 - h, width: 90, height: h, fill: '#C9B79A'
        }));
      });
      e.ages.setAttribute('opacity', '1');
    },
    build() {
      const s = scene({ label: 'An animation of new sea floor forming at a mid-ocean ridge and recording the Earth\'s magnetic field as symmetrical stripes.' });
      const els = {};
      s.appendChild(sky(112));
      s.appendChild(sea(0, 112, 1000, 188));
      s.appendChild(asthenosphere(360));

      /* base crust — one continuous band, so no white shows through beneath
         the ridge once the stripes are laid on top of it */
      s.appendChild(slab([[0, 300], [1000, 300], [1000, 360], [0, 360]], 'oceanic'));

      /* stripes sit ON the crust, so they must be added after the base slabs */
      els.stripes = svg('g');
      s.appendChild(els.stripes);

      els.sediment = hidden(svg('g'));
      s.appendChild(els.sediment);

      /* the ridge itself, with its central rift notch */
      els.ridge = svg('path', {
        d: 'M430,300 L470,250 L492,272 L500,262 L508,272 L530,250 L570,300 z',
        fill: C.oceanic, stroke: C.oceanicDark, 'stroke-width': '2.5', 'stroke-linejoin': 'round'
      });
      s.appendChild(els.ridge);
      els.magma = hidden(magmaArrow(500, 452, 500, 296, 14));
      s.appendChild(els.magma);

      els.arrowL = hidden(motionArrow(392, 214, -1, 68));
      els.arrowR = hidden(motionArrow(608, 214, 1, 68));
      s.appendChild(els.arrowL); s.appendChild(els.arrowR);

      els.compass = hidden(label(500, 86, 'MAGNETIC FIELD: NORMAL', { colour: C.navy, size: 15, halo: true }));
      s.appendChild(els.compass);

      els.ages = hidden(svg('g'));
      [[118, 'OLDEST'], [300, 'OLDER'], [500, 'YOUNGEST'], [700, 'OLDER'], [882, 'OLDEST']].forEach(([x, t]) => {
        /* a short tick ties each age word to the band of crust above it */
        els.ages.appendChild(svg('line', {
          x1: x, y1: 364, x2: x, y2: 376, stroke: '#fff', 'stroke-width': '2', opacity: '.85'
        }));
        els.ages.appendChild(label(x, 392, t, { colour: '#fff', size: 12 }));
      });
      s.appendChild(els.ages);

      /* In the sim this names the ridge while it is being built. The static
         plate labels it instead, so plateFrame hides this one to avoid a
         duplicate sitting under the plate label. */
      els.ridgeCaption = label(500, 168, 'MID-OCEAN RIDGE', { colour: C.navy, size: 15, halo: true });
      s.appendChild(els.ridgeCaption);

      els.svg = s;
      return els;
    },
    stages: [
      {
        title: 'Magma rises at the ridge',
        caption: 'At a constructive margin the plates pull apart. Magma rises from the ' +
          'asthenosphere to fill the gap at the crest of the ridge.',
        enter(tl, e) { tl.to(e.magma, { opacity: 1, duration: .6 }); }
      },
      {
        title: 'New basalt records the polarity',
        caption: 'As the magma solidifies into basaltic ocean floor, iron particles line up ' +
          'with the Earth\'s magnetic field and lock in its direction at that moment.',
        enter(tl, e) {
          tl.to(e.compass, { opacity: 1, duration: .4 });
          tl.add(() => addStripe(e, 0, 'normal'), '<');
        }
      },
      {
        title: 'The plates move apart',
        caption: 'Sea-floor spreading carries the new crust away from the ridge in both ' +
          'directions, symmetrically.',
        enter(tl, e) {
          tl.to([e.arrowL, e.arrowR], { opacity: 1, duration: .4 });
          tl.add(() => spread(e, 66), '<');
          tl.to({}, { duration: .7 });
        }
      },
      {
        title: 'The magnetic field reverses',
        caption: 'The Earth\'s magnetism reverses roughly every one million years, so a ' +
          'compass would point south rather than north. The next crust to form records ' +
          'the reversed field.',
        enter(tl, e) {
          tl.add(() => {
            e.compass.querySelectorAll('text').forEach((t) => { t.textContent = 'MAGNETIC FIELD: REVERSED'; });
          });
          tl.add(() => addStripe(e, 0, 'reversed'));
          tl.add(() => spread(e, 66));
          tl.to({}, { duration: .8 });
        }
      },
      {
        title: 'The pattern repeats',
        caption: 'Repeated reversals build alternating bands of normal and reversed rock, ' +
          'parallel to the ridge and matching on both sides.',
        enter(tl, e) {
          for (let i = 0; i < 4; i++) {
            tl.add(() => addStripe(e, 0, i % 2 ? 'normal' : 'reversed'));
            tl.add(() => spread(e, 62));
            tl.to({}, { duration: .45 });
          }
        }
      },
      {
        title: 'The evidence: age and symmetry',
        caption: 'The rocks are youngest at the ridge and grow older away from it in a ' +
          'symmetrical pattern, with very little sediment near the crest. This is the ' +
          'evidence for sea-floor spreading — and so for plate tectonics.',
        enter(tl, e) {
          tl.to(e.ages, { opacity: 1, duration: .5 });
          tl.add(() => {
            e.sediment.innerHTML = '';
            [[60, 9], [200, 6], [340, 3], [660, 3], [800, 6], [940, 9]].forEach(([x, h]) => {
              e.sediment.appendChild(svg('rect', {
                x: x - 45, y: 300 - h, width: 90, height: h, fill: '#C9B79A', opacity: '.95'
              }));
            });
          });
          tl.to(e.sediment, { opacity: 1, duration: .5 }, '<');
        }
      }
    ]
  };

  function addStripe(e, offset, polarity) {
    const w = 30;
    const fill = polarity === 'normal' ? '#2C5F99' : '#D9E4F0';
    [-1, 1].forEach((side) => {
      const r = svg('rect', {
        x: 500 + side * 35 - (side < 0 ? w : 0), y: 300, width: w, height: 60,
        fill, stroke: 'rgba(18,41,79,.25)', 'stroke-width': '.8'
      });
      r.dataset.side = String(side);
      r.dataset.shift = '0';
      e.stripes.appendChild(r);
    });
  }
  function spread(e, by) {
    Array.prototype.forEach.call(e.stripes.children, (r) => {
      const side = Number(r.dataset.side);
      const shift = Number(r.dataset.shift) + by;
      r.dataset.shift = String(shift);
      r.setAttribute('transform', 'translate(' + (side * shift) + ',0)');
    });
  }

  /* ---- 2. Constructive margin ---- */
  SIMS.constructive = {
    title: 'The constructive margin',
    plate: 'p-constructive',
    /* Canonical frame: the mature stage — sea flooded in, ridge built, magma
       rising. The early-stage fault lines and the collapsed grey rift block
       belong to earlier moments and would contradict it. */
    plateFrame(e) {
      e.faults.setAttribute('opacity', '0');
      e.rift.setAttribute('opacity', '0');
      e.ridgePush.setAttribute('opacity', '0');
      e.left.setAttribute('transform', 'translate(-170,0)');
      e.right.setAttribute('transform', 'translate(170,0)');
    },
    build() {
      const s = scene({ label: 'An animation of a constructive plate margin: the lithosphere stretches and faults, a rift valley forms, the sea floods in, and a mid-ocean ridge develops.' });
      const els = {};
      const LAND = 218, BASE = 320;

      s.appendChild(sky(LAND));
      /* the sea that floods the widening rift — drawn before the land so the
         land masses always sit in front of it as they separate */
      els.seaFill = hidden(sea(330, 196, 340, 124));
      s.appendChild(els.seaFill);
      s.appendChild(asthenosphere(BASE));

      /* new oceanic crust wells up in the gap; drawn under the land blocks */
      els.newCrust = hidden(svg('rect', {
        x: 330, y: 262, width: 340, height: BASE - 262,
        fill: C.oceanic, stroke: C.oceanicDark, 'stroke-width': '2'
      }));
      s.appendChild(els.newCrust);

      els.magma = hidden(magmaArrow(500, 448, 500, 276, 15));
      s.appendChild(els.magma);

      /* the two continental blocks, initially meeting in the middle */
      els.left = slab([[0, LAND], [500, LAND], [500, BASE], [0, BASE]], 'continental');
      els.right = slab([[500, LAND], [1000, LAND], [1000, BASE], [500, BASE]], 'continental');
      s.appendChild(els.left); s.appendChild(els.right);

      /* the collapsed central block — the rift valley floor */
      els.rift = hidden(svg('path', {
        d: 'M424,' + LAND + ' L452,272 L548,272 L576,' + LAND + ' z',
        fill: '#B08A63', stroke: C.contDark, 'stroke-width': '2', 'stroke-linejoin': 'round'
      }));
      s.appendChild(els.rift);

      els.faults = hidden(svg('g'));
      [[424, LAND, 452, BASE], [576, LAND, 548, BASE]].forEach(([x1, y1, x2, y2]) => {
        els.faults.appendChild(svg('line', {
          x1, y1, x2, y2, stroke: C.ink, 'stroke-width': '2.6', 'stroke-dasharray': '9 6'
        }));
      });
      s.appendChild(els.faults);

      /* the mature ridge, with its central rift notch */
      els.ridge = hidden(svg('path', {
        d: 'M356,262 L462,206 L492,232 L500,222 L508,232 L538,206 L644,262 z',
        fill: C.oceanic, stroke: C.oceanicDark, 'stroke-width': '2.5', 'stroke-linejoin': 'round'
      }));
      s.appendChild(els.ridge);

      els.pillow = hidden(svg('g'));
      [[470, 228], [492, 240], [512, 240], [532, 228]].forEach(([cx, cy]) => {
        els.pillow.appendChild(svg('ellipse', {
          cx, cy, rx: 12, ry: 8, fill: '#2F4A63', stroke: '#1B2C3D', 'stroke-width': '1.4'
        }));
      });
      s.appendChild(els.pillow);

      els.arrowL = hidden(motionArrow(300, 160, -1, 70));
      els.arrowR = hidden(motionArrow(700, 160, 1, 70));
      s.appendChild(els.arrowL); s.appendChild(els.arrowR);

      /* Named in the sim while ridge push is being explained; the static plate
         labels it instead, so plateFrame hides these. */
      els.ridgePush = hidden(svg('g'));
      els.ridgePush.appendChild(label(180, 296, 'RIDGE PUSH', { colour: '#fff', size: 14 }));
      els.ridgePush.appendChild(label(820, 296, 'RIDGE PUSH', { colour: '#fff', size: 14 }));
      s.appendChild(els.ridgePush);

      els.svg = s;
      return els;
    },
    stages: [
      {
        title: 'Rising convection warps the plate',
        caption: 'Hot spots deep in the asthenosphere cause magma to rise, heating the ' +
          'lithosphere so that it warps upwards and stretches.',
        enter(tl, e) {
          tl.to([e.arrowL, e.arrowR], { opacity: 1, duration: .5 });
          tl.to(e.left, { attr: { transform: 'translate(-14,0)' }, duration: .9 }, '<');
          tl.to(e.right, { attr: { transform: 'translate(14,0)' }, duration: .9 }, '<');
        }
      },
      {
        title: 'The crust breaks along fault lines',
        caption: 'Stretching breaks the lithosphere along fault lines.',
        enter(tl, e) { tl.to(e.faults, { opacity: 1, duration: .5 }); }
      },
      {
        title: 'Decompression melting makes new crust',
        caption: 'Upwelling mantle material reduces the pressure on partially molten rock, ' +
          'causing decompression melting. The magma produced is less dense than the rock ' +
          'around it, so it rises to fill the tensional cracks and creates new crust.',
        enter(tl, e) {
          tl.to(e.magma, { opacity: 1, duration: .6 });
          tl.to(e.newCrust, { opacity: 1, duration: .6 }, '-=0.2');
        }
      },
      {
        title: 'An isostatic response lifts the ridge',
        caption: 'The heating and the build-up of magma produce an isostatic response, so ' +
          'the young crust nearest the boundary rises. The ridge sits 1–3 km above the ' +
          'abyssal plain, and gravity acting on that raised crust produces ridge push.',
        enter(tl, e) {
          tl.to(e.ridgePush, { opacity: 1, duration: .5 });
        }
      },
      {
        title: 'The centre slumps — a rift valley',
        caption: 'The central area slumps and collapses between the faults, forming a ' +
          'central rift valley — for example the Great Rift Valley in East Africa.',
        enter(tl, e) { tl.to(e.rift, { opacity: 1, duration: .6 }); }
      },
      {
        title: 'The sea floods in — a linear sea',
        caption: 'The stretched plate may allow a nearby ocean to spill in, creating a ' +
          'shallow, linear sea above the new ocean crust — for example the Red Sea.',
        enter(tl, e) {
          tl.to(e.left, { attr: { transform: 'translate(-92,0)' }, duration: 1, ease: 'power1.inOut' });
          tl.to(e.right, { attr: { transform: 'translate(92,0)' }, duration: 1, ease: 'power1.inOut' }, '<');
          tl.to(e.rift, { opacity: 0, duration: .4 }, '<');
          tl.to(e.faults, { opacity: 0, duration: .4 }, '<');
          tl.to(e.seaFill, { opacity: 1, duration: .8 }, '-=0.5');
        }
      },
      {
        title: 'A broad mid-ocean ridge develops',
        caption: 'The sea widens and volcanic activity continues. A broad mid-ocean ridge ' +
          'develops — for example the Mid-Atlantic Ridge — as magma rises, cools and forms ' +
          'basalt. Lava erupting under water cools rapidly into bulbous pillow lavas.',
        enter(tl, e) {
          tl.to(e.left, { attr: { transform: 'translate(-170,0)' }, duration: 1, ease: 'power1.inOut' });
          tl.to(e.right, { attr: { transform: 'translate(170,0)' }, duration: 1, ease: 'power1.inOut' }, '<');
          tl.to(e.ridge, { opacity: 1, duration: .7 }, '-=0.4');
          tl.to(e.pillow, { opacity: 1, duration: .5 }, '-=0.3');
        }
      }
    ]
  };

  /* ---- 3. Destructive oceanic–oceanic (Tonga) ---- */
  SIMS['destructive-oo'] = {
    title: 'Destructive margin: oceanic meets oceanic',
    plate: 'p-dest-oo',
    /* These captions name features while the sim explains them; the static
       plate carries its own labels, so showing both would duplicate and
       collide. */
    plateFrame(e) {
      e.slabPull.setAttribute('opacity', '0');
      e.hydration.querySelectorAll('text').forEach((t) => t.setAttribute('opacity', '0'));
      e.assim.setAttribute('opacity', '0');
    },
    build() {
      const s = scene({ label: 'An animation of an oceanic-to-oceanic destructive margin: the denser plate subducts, forming a deep ocean trench and an island arc.' });
      const els = {};
      s.appendChild(sky(150));
      s.appendChild(sea(0, 150, 1000, 90));
      s.appendChild(asthenosphere(240));

      /* overriding plate (right) */
      s.appendChild(slab([[520, 240], [1000, 240], [1000, 290], [520, 290]], 'oceanic'));
      /* subducting slab (left), drawn as a bending wedge */
      els.slab = slab([[0, 240], [500, 240], [720, 520], [660, 546], [420, 290], [0, 290]], 'oceanic');
      s.appendChild(els.slab);

      els.trench = hidden(svg('path', {
        d: 'M470,240 L508,296 L546,240 z', fill: '#0E2138'
      }));
      s.appendChild(els.trench);

      els.arrowL = hidden(motionArrow(240, 200, 1, 70));
      /* kept up in the sky so it never sits behind the island arc */
      els.arrowR = hidden(motionArrow(950, 106, -1, 70));
      s.appendChild(els.arrowL); s.appendChild(els.arrowR);

      els.slabPull = hidden(label(700, 470, 'SLAB PULL', { colour: '#fff', size: 14, halo: false }));
      s.appendChild(els.slabPull);

      els.hydration = hidden(svg('g'));
      els.hydration.appendChild(svg('line', { x1: 0, y1: 372, x2: 1000, y2: 372,
        stroke: '#fff', 'stroke-width': '1.8', 'stroke-dasharray': '7 6', opacity: '.85' }));
      els.hydration.appendChild(label(150, 364, '80 km — hydration melting begins',
        { colour: '#fff', size: 13, anchor: 'start' }));
      s.appendChild(els.hydration);

      els.magma = hidden(svg('g'));
      [[640, 430, 700, 268], [690, 470, 760, 268], [600, 400, 640, 268]].forEach(([x1, y1, x2, y2]) => {
        els.magma.appendChild(magmaArrow(x1, y1, x2, y2, 11));
      });
      s.appendChild(els.magma);

      els.arc = hidden(svg('g'));
      [[640, 62], [700, 84], [760, 54], [820, 40]].forEach(([x, h]) => {
        els.arc.appendChild(volcano(x, 240, h, h * 0.85, '#4A5F44'));
      });
      s.appendChild(els.arc);

      els.foci = hidden(svg('g'));
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        els.foci.appendChild(focusDot(505 + t * 200, 250 + t * 285, t));
      }
      s.appendChild(els.foci);

      els.assim = hidden(label(760, 552, '600–700 km — the slab is fully assimilated',
        { colour: '#fff', size: 13 }));
      s.appendChild(els.assim);

      els.svg = s;
      return els;
    },
    stages: [
      {
        title: 'Two oceanic plates converge',
        caption: 'Two oceanic plates move towards each other because of convection currents ' +
          'in the asthenosphere.',
        enter(tl, e) { tl.to([e.arrowL, e.arrowR], { opacity: 1, duration: .5 }); }
      },
      {
        title: 'The denser plate subducts',
        caption: 'The denser of the two plates — here the Pacific Plate — is subducted ' +
          'beneath the less dense Indo-Australian Plate, pulled down by slab pull. As the ' +
          'material cools and becomes denser, convection currents drag it down further.',
        enter(tl, e) { tl.to(e.slabPull, { opacity: 1, duration: .5 }); }
      },
      {
        title: 'A deep ocean trench forms',
        caption: 'Compression makes the plate buckle and deform, marking the point of ' +
          'subduction with a deep ocean trench — a linear chasm plunging as much as 11 km ' +
          'below sea level. This is the Tonga Trench.',
        enter(tl, e) { tl.to(e.trench, { opacity: 1, duration: .6 }); }
      },
      {
        title: 'Melting begins',
        caption: 'The descending lithosphere melts as it meets the hotter asthenosphere — ' +
          'subduction melting. This is aided by hydration melting, which begins at 80 km ' +
          'because sea water carried down by the slab lowers the melting point. Without it, ' +
          'melting would not begin until 200 km.',
        enter(tl, e) { tl.to(e.hydration, { opacity: 1, duration: .6 }); }
      },
      {
        title: 'Magma rises and islands build',
        caption: 'The magma produced is less dense than the surrounding rock, so it rises. ' +
          'Material erupts onto the ocean floor, cools, and builds upwards until it breaks ' +
          'the surface — creating an island arc parallel to the trench. Over 150 Tongan ' +
          'islands lie west of, and parallel to, the trench.',
        enter(tl, e) {
          tl.to(e.magma, { opacity: 1, duration: .6 });
          tl.to(e.arc, { opacity: 1, duration: .8 }, '-=0.2');
        }
      },
      {
        title: 'The Benioff Zone',
        caption: 'Earthquakes are shallow near the trench and deepen away from it. This ' +
          'sloping plane of earthquake foci is the Benioff Zone. By 600–700 km subduction ' +
          'stops, because the descending plate is fully assimilated into the asthenosphere.',
        enter(tl, e) {
          tl.to(e.foci, { opacity: 1, duration: .7 });
          tl.to(e.assim, { opacity: 1, duration: .5 }, '-=0.3');
        }
      }
    ]
  };

  /* ---- 4. Destructive continental–oceanic (Andes) ---- */
  SIMS['destructive-co'] = {
    title: 'Destructive margin: oceanic meets continental',
    plate: 'p-dest-co',
    plateFrame(e) {
      e.slabPull.setAttribute('opacity', '0');
      e.hydration.querySelectorAll('text').forEach((t) => t.setAttribute('opacity', '0'));
    },
    build() {
      const s = scene({ label: 'An animation of an oceanic-to-continental destructive margin: the oceanic plate subducts, forming a deep ocean trench and a fold mountain chain with violent volcanoes.' });
      const els = {};
      /* sky spans the full width down to the land surface, so no unfilled
         white shows behind the continent */
      s.appendChild(sky(240));
      s.appendChild(sea(0, 150, 520, 90));
      s.appendChild(asthenosphere(250));

      els.cont = slab([[540, 240], [1000, 240], [1000, 300], [540, 300]], 'continental');
      s.appendChild(els.cont);
      els.slab = slab([[0, 240], [520, 240], [740, 520], [680, 548], [430, 292], [0, 292]], 'oceanic');
      s.appendChild(els.slab);

      els.trench = hidden(svg('path', { d: 'M486,240 L522,300 L556,240 z', fill: '#0E2138' }));
      s.appendChild(els.trench);

      els.arrowL = hidden(motionArrow(230, 200, 1, 72));
      s.appendChild(els.arrowL);
      els.slabPull = hidden(label(720, 470, 'SLAB PULL', { colour: '#fff', size: 14 }));
      s.appendChild(els.slabPull);

      els.folds = hidden(svg('path', {
        d: 'M560,240 Q600,168 640,240 Q672,150 706,240 Q740,178 776,240 Q806,196 840,240 z',
        fill: C.cont, stroke: C.contDark, 'stroke-width': '2.5', 'stroke-linejoin': 'round'
      }));
      s.appendChild(els.folds);

      els.hydration = hidden(svg('g'));
      els.hydration.appendChild(svg('line', { x1: 0, y1: 380, x2: 1000, y2: 380,
        stroke: '#fff', 'stroke-width': '1.8', 'stroke-dasharray': '7 6', opacity: '.85' }));
      els.hydration.appendChild(label(150, 372, '80 km — hydration melting begins',
        { colour: '#fff', size: 13, anchor: 'start' }));
      s.appendChild(els.hydration);

      els.magma = hidden(svg('g'));
      [[660, 440, 690, 250], [710, 470, 748, 250]].forEach(([x1, y1, x2, y2]) => {
        els.magma.appendChild(magmaArrow(x1, y1, x2, y2, 11));
      });
      s.appendChild(els.magma);

      els.volc = hidden(svg('g'));
      els.volc.appendChild(volcano(690, 200, 92, 62, '#5B4A3C'));
      els.volc.appendChild(volcano(760, 214, 74, 52, '#5B4A3C'));
      els.plume = hidden(svg('ellipse', { cx: 782, cy: 66, rx: 72, ry: 30,
        fill: '#8A8177', opacity: '.8' }));
      els.volc.appendChild(els.plume);
      s.appendChild(els.volc);

      els.foci = hidden(svg('g'));
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        els.foci.appendChild(focusDot(520 + t * 200, 258 + t * 280, t));
      }
      s.appendChild(els.foci);

      els.svg = s;
      return els;
    },
    stages: [
      {
        title: 'An oceanic and a continental plate converge',
        caption: 'The Nazca Plate moves from west to east because of convection currents in ' +
          'the asthenosphere, towards the South American Plate.',
        enter(tl, e) { tl.to(e.arrowL, { opacity: 1, duration: .5 }); }
      },
      {
        title: 'The denser oceanic plate subducts',
        caption: 'The denser oceanic lithosphere is subducted beneath the less dense ' +
          'continental lithosphere, pulled down by slab pull.',
        enter(tl, e) { tl.to(e.slabPull, { opacity: 1, duration: .5 }); }
      },
      {
        title: 'A deep ocean trench forms',
        caption: 'Compression forces the plate to buckle and deform, marking the point of ' +
          'subduction with a deep ocean trench — the Peru–Chile Trench.',
        enter(tl, e) { tl.to(e.trench, { opacity: 1, duration: .6 }); }
      },
      {
        title: 'The continental edge buckles into fold mountains',
        caption: 'At a continental-to-oceanic margin the trench forms parallel to a fold ' +
          'mountain chain: compression buckles the edge of the continent upwards.',
        enter(tl, e) { tl.to(e.folds, { opacity: 1, duration: .8 }); }
      },
      {
        title: 'Melting produces magma',
        caption: 'Subduction melting is aided by hydration melting from 80 km, where sea ' +
          'water lowers the melting point of the lithosphere and helps the melt flow.',
        enter(tl, e) {
          tl.to(e.hydration, { opacity: 1, duration: .5 });
          tl.to(e.magma, { opacity: 1, duration: .6 }, '-=0.2');
        }
      },
      {
        title: 'Violent composite volcanoes',
        caption: 'Magma forces its way through lines of weakness in the continental plate, ' +
          'or right through it. Eruptions are violent and less fluid, with silica-rich lava ' +
          'from steep, cone-shaped volcanoes — Mt Tacora in Chile and Nevado del Ruiz in ' +
          'Colombia. In 1991 Mt Pinatubo sent a cloud of debris 16 km wide more than 30 km ' +
          'into the atmosphere.',
        enter(tl, e) {
          tl.to(e.volc, { opacity: 1, duration: .6 });
          tl.to(e.plume, { opacity: 1, duration: .9 }, '-=0.1');
        }
      },
      {
        title: 'The Benioff Zone',
        caption: 'The Benioff Zone is the boundary between the subducting oceanic plate and ' +
          'the overriding continental plate — a sloping plane of shallow, intermediate and ' +
          'deep earthquakes. As the plate sticks, stress builds and is released as seismic waves.',
        enter(tl, e) { tl.to(e.foci, { opacity: 1, duration: .7 }); }
      }
    ]
  };

  /* ---- 5. Collision (Himalayas) ---- */
  SIMS.collision = {
    title: 'The collision margin',
    plate: 'p-collision',
    /* Canonical frame: after the collision. The ocean has gone, the continents
       have met, the detached slab has sunk. */
    plateFrame(e) {
      e.sea.setAttribute('opacity', '0');
      e.oceanSlab.setAttribute('opacity', '0');
      e.left.setAttribute('transform', 'translate(90,0)');
      e.right.setAttribute('transform', 'translate(-90,0)');
      e.detached.setAttribute('transform', 'translate(0,40)');
      e.detached.setAttribute('opacity', '0.45');
      /* the plate carries its own labels for both of these */
      e.noVolc.setAttribute('opacity', '0');
      e.buoy.setAttribute('opacity', '0');
    },
    build() {
      const s = scene({ label: 'An animation of a collision margin: the ocean between two continents closes, the plates collide, and fold mountains are pushed up.' });
      const els = {};
      s.appendChild(sky(300));
      s.appendChild(asthenosphere(300));

      els.sea = sea(360, 190, 300, 60);
      s.appendChild(els.sea);

      els.oceanSlab = slab([[360, 240], [660, 240], [660, 300], [360, 300]], 'oceanic');
      s.appendChild(els.oceanSlab);
      els.left = slab([[0, 200], [370, 200], [370, 300], [0, 300]], 'continental');
      els.right = slab([[650, 200], [1000, 200], [1000, 300], [650, 300]], 'continental');
      s.appendChild(els.left); s.appendChild(els.right);

      els.detached = hidden(slab([[470, 380], [560, 380], [545, 520], [485, 520]], 'oceanic'));
      s.appendChild(els.detached);

      els.mountains = hidden(svg('path', {
        d: 'M330,300 Q380,150 430,246 Q470,96 510,232 Q550,84 590,238 Q630,140 670,300 z',
        fill: C.cont, stroke: C.contDark, 'stroke-width': '2.5', 'stroke-linejoin': 'round'
      }));
      s.appendChild(els.mountains);

      els.sediment = hidden(svg('path', {
        d: 'M430,232 Q500,150 570,236', fill: 'none', stroke: '#C9B79A', 'stroke-width': '7'
      }));
      s.appendChild(els.sediment);

      els.arrowL = hidden(motionArrow(160, 168, 1, 70));
      els.arrowR = hidden(motionArrow(840, 168, -1, 70));
      s.appendChild(els.arrowL); s.appendChild(els.arrowR);

      els.buoy = hidden(label(500, 456, 'CONTINENTAL LITHOSPHERE IS TOO BUOYANT TO SUBDUCT',
        { colour: '#fff', size: 14 }));
      s.appendChild(els.buoy);

      els.noVolc = hidden(label(500, 62, 'NO VOLCANIC ACTIVITY — no subduction, no new crust',
        { colour: C.navy, size: 15, halo: true }));
      s.appendChild(els.noVolc);

      els.quakes = hidden(svg('g'));
      [[440, 268], [500, 276], [560, 268]].forEach(([x, y]) => {
        els.quakes.appendChild(focusDot(x, y, 0.1));
      });
      s.appendChild(els.quakes);

      els.svg = s;
      return els;
    },
    stages: [
      {
        title: 'Two continents approach',
        caption: 'Two continental plates move towards one another because of convection ' +
          'currents. The oceanic lithosphere between them subducts beneath one of the ' +
          'continents — at this stage it behaves as a destructive margin.',
        enter(tl, e) { tl.to([e.arrowL, e.arrowR], { opacity: 1, duration: .5 }); }
      },
      {
        title: 'The ocean closes',
        caption: 'The intervening ocean narrows and closes as its floor is consumed.',
        enter(tl, e) {
          tl.to(e.sea, { attr: { x: 440, width: 140 }, duration: 1.1, ease: 'power1.inOut' });
          tl.to(e.oceanSlab, { attr: { transform: 'translate(0,0) scale(1)' }, duration: .1 }, '<');
          tl.to(e.oceanSlab, { opacity: .35, duration: 1.1 }, '<');
          tl.to([e.left], { attr: { transform: 'translate(90,0)' }, duration: 1.1, ease: 'power1.inOut' }, '<');
          tl.to([e.right], { attr: { transform: 'translate(-90,0)' }, duration: 1.1, ease: 'power1.inOut' }, '<');
        }
      },
      {
        title: 'The slab detaches',
        caption: 'The two sections of continental lithosphere — the Indian Plate and the ' +
          'Eurasian Plate — meet, and the subducting oceanic lithosphere becomes detached. ' +
          'It sinks into the asthenosphere, melts, and is fully assimilated, so eventually ' +
          'all subduction stops below a collision margin.',
        enter(tl, e) {
          tl.to(e.sea, { opacity: 0, duration: .5 });
          tl.to(e.oceanSlab, { opacity: 0, duration: .5 }, '<');
          tl.to(e.detached, { opacity: 1, duration: .5 }, '<');
          tl.to(e.detached, { attr: { transform: 'translate(0,40)' }, opacity: .3, duration: 1.2 });
        }
      },
      {
        title: 'Too buoyant to subduct',
        caption: 'Continental lithosphere is too buoyant to subduct, so the plates collide ' +
          'into each other and are compressed.',
        enter(tl, e) { tl.to(e.buoy, { opacity: 1, duration: .6 }); }
      },
      {
        title: 'Fold mountains are pushed up',
        caption: 'The continental material thickens through folding and faulting under ' +
          'compression. Crustal material and the sea-floor sediment deposited between the ' +
          'plates buckles upwards into a range of fold mountains — the Himalayas.',
        enter(tl, e) {
          tl.to(e.mountains, { opacity: 1, duration: 1 });
          tl.to(e.sediment, { opacity: 1, duration: .6 }, '-=0.4');
        }
      },
      {
        title: 'Violent earthquakes, but no volcanoes',
        caption: 'Violent earthquakes are common: the plates stick, pressure builds, and is ' +
          'released as seismic waves. There is no volcanic activity, because there is no ' +
          'subduction and no creation of new crust.',
        enter(tl, e) {
          tl.to(e.quakes, { opacity: 1, duration: .5 });
          tl.to(e.noVolc, { opacity: 1, duration: .5 }, '-=0.2');
        }
      }
    ]
  };

  /* ---- 6. Conservative margin (San Andreas) — PLAN VIEW ---- */
  SIMS.conservative = {
    title: 'The conservative margin',
    plate: 'p-conservative',
    /* Canonical frame: after the release — the road offset, the shock rings
       gone, the strain caption gone (it has just been released). */
    plateFrame(e) {
      e.quake.setAttribute('opacity', '0');
      e.strain.setAttribute('opacity', '0');
      e.roadBot.setAttribute('transform', 'translate(120,0)');
      /* the plate carries all of these as its own labels */
      e.nameN.setAttribute('opacity', '0');
      e.nameP.setAttribute('opacity', '0');
      e.locked.setAttribute('opacity', '0');
      e.stat.setAttribute('opacity', '0');
      e.noVolc.setAttribute('opacity', '0');
    },
    build() {
      const s = scene({ label: 'A plan view of a conservative margin: two plates slide past each other, strain builds along a locked fault, and is released as an earthquake.' });
      const els = {};
      s.appendChild(svg('rect', { x: 0, y: 0, width: 1000, height: 580, fill: '#EDF1F7' }));

      /* two ground blocks, plan view */
      els.blockL = svg('rect', { x: 0, y: 0, width: 1000, height: 268, fill: '#D8C9A8',
        stroke: '#B3A283', 'stroke-width': '2' });
      els.blockR = svg('rect', { x: 0, y: 292, width: 1000, height: 288, fill: '#CFC09E',
        stroke: '#B3A283', 'stroke-width': '2' });
      s.appendChild(els.blockL); s.appendChild(els.blockR);

      els.fault = svg('rect', { x: 0, y: 268, width: 1000, height: 24, fill: '#8A7A5E' });
      s.appendChild(els.fault);

      /* named in the sim; the static plate labels them instead */
      els.nameN = label(150, 60, 'NORTH AMERICAN PLATE — 2 cm per year',
        { colour: C.ink, size: 15, anchor: 'start' });
      els.nameP = label(150, 540, 'PACIFIC PLATE — 6 cm per year',
        { colour: C.ink, size: 15, anchor: 'start' });
      s.appendChild(els.nameN); s.appendChild(els.nameP);

      els.arrowTop = motionArrow(700, 60, 1, 90);
      els.arrowBot = motionArrow(700, 540, 1, 90);
      s.appendChild(els.arrowTop); s.appendChild(els.arrowBot);

      /* a road / fence line crossing the fault — the classic offset marker */
      els.roadTop = svg('rect', { x: 486, y: 40, width: 16, height: 228, fill: '#F4F6FA',
        stroke: '#9AA6BC', 'stroke-width': '1.6' });
      els.roadBot = svg('rect', { x: 486, y: 292, width: 16, height: 228, fill: '#F4F6FA',
        stroke: '#9AA6BC', 'stroke-width': '1.6' });
      s.appendChild(els.roadTop); s.appendChild(els.roadBot);

      els.locked = hidden(label(500, 258, 'LOCKED BY FRICTION', { colour: '#fff', size: 14 }));
      s.appendChild(els.locked);

      els.strain = hidden(label(500, 200, 'STRAIN BUILDING', { colour: C.magma, size: 16, halo: true }));
      s.appendChild(els.strain);

      els.quake = hidden(svg('g'));
      els.quake.appendChild(svg('circle', { cx: 500, cy: 280, r: 30, fill: 'none',
        stroke: C.magma, 'stroke-width': '5' }));
      els.quake.appendChild(svg('circle', { cx: 500, cy: 280, r: 62, fill: 'none',
        stroke: C.magma, 'stroke-width': '3.4', opacity: '.7' }));
      els.quake.appendChild(svg('circle', { cx: 500, cy: 280, r: 96, fill: 'none',
        stroke: C.magma, 'stroke-width': '2.4', opacity: '.45' }));
      s.appendChild(els.quake);

      els.stat = hidden(label(500, 342, '1906 — 7 m of displacement, magnitude 7.8',
        { colour: C.ink, size: 16, halo: true }));
      s.appendChild(els.stat);

      els.noVolc = hidden(label(830, 200, 'NO VOLCANIC ACTIVITY', { colour: C.navy, size: 14, halo: true }));
      s.appendChild(els.noVolc);

      els.svg = s;
      return els;
    },
    stages: [
      {
        title: 'The plates slide past each other',
        caption: 'Convection currents cause two plates to slide past one another, parallel ' +
          'to the boundary. At the San Andreas Fault the Pacific and North American plates ' +
          'are both moving north-west, but at different speeds: about 6 cm a year against ' +
          'about 2 cm a year.',
        enter(tl, e) {
          tl.fromTo([e.arrowTop, e.arrowBot], { opacity: 0 }, { opacity: 1, duration: .5 });
        }
      },
      {
        title: 'Friction locks the fault',
        caption: 'Frictional forces lock the blocks of lithosphere together, so the ' +
          'boundary itself does not move even though the plates are still being driven along.',
        enter(tl, e) { tl.to(e.locked, { opacity: 1, duration: .5 }); }
      },
      {
        title: 'Strain builds up',
        caption: 'Stress and tension build between the plate edges. Features that cross the ' +
          'fault — roads, fences, streams — bend as the ground deforms.',
        enter(tl, e) {
          tl.to(e.strain, { opacity: 1, duration: .4 });
          tl.to(e.roadBot, { attr: { transform: 'translate(34,0)' }, duration: 1.4, ease: 'power1.in' }, '<');
          tl.to(e.blockR, { attr: { transform: 'translate(10,0)' }, duration: 1.4, ease: 'power1.in' }, '<');
        }
      },
      {
        title: 'The stress is released — an earthquake',
        caption: 'Eventually the frictional forces are overcome and there is a sudden ' +
          'release. The stress is released as seismic waves during an earthquake. In 1906 ' +
          'the crust was displaced by 7 m, generating a magnitude 7.8 earthquake.',
        enter(tl, e) {
          tl.to(e.roadBot, { attr: { transform: 'translate(120,0)' }, duration: .22, ease: 'power4.out' });
          tl.to(e.blockR, { attr: { transform: 'translate(0,0)' }, duration: .22 }, '<');
          tl.fromTo(e.quake, { opacity: 1, scale: .4, transformOrigin: '500px 280px' },
            { opacity: 0, scale: 1.5, duration: 1.1 }, '<');
          tl.to(e.stat, { opacity: 1, duration: .5 }, '-=0.5');
          tl.to(e.strain, { opacity: 0, duration: .3 }, '<');
        }
      },
      {
        title: 'Crust is conserved',
        caption: 'Because crust is neither created nor destroyed — it is conserved — there ' +
          'is no volcanic activity. No subduction takes place, so no rising magma can reach ' +
          'the surface. Frequent small tremors are common, along with occasional earthquakes ' +
          'of considerable magnitude.',
        enter(tl, e) { tl.to(e.noVolc, { opacity: 1, duration: .5 }); }
      }
    ]
  };

  /* ---- 7. What drives the plates ---- */
  SIMS.forces = {
    title: 'What drives the plates',
    plate: 'p-forces',
    /* the plate labels ridge push, slab pull and the heat source itself */
    plateFrame(e) {
      e.decay.setAttribute('opacity', '0');
      e.ridgePush.querySelectorAll('text').forEach((t) => t.setAttribute('opacity', '0'));
      e.slabPull.querySelectorAll('text').forEach((t) => t.setAttribute('opacity', '0'));
    },
    build() {
      const s = scene({ label: 'An animation contrasting the traditional convection-current explanation of plate movement with the modern view of ridge push and slab pull.' });
      const els = {};
      s.appendChild(sky(240));
      s.appendChild(sea(0, 150, 1000, 90));
      s.appendChild(asthenosphere(300));

      /* one continuous crust band, so no white shows through beneath the ridge */
      s.appendChild(slab([[0, 240], [1000, 240], [1000, 300], [0, 300]], 'oceanic'));
      els.ridge = svg('path', {
        d: 'M420,300 L470,214 L500,238 L530,214 L580,300 z',
        fill: C.oceanic, stroke: C.oceanicDark, 'stroke-width': '2.5', 'stroke-linejoin': 'round'
      });
      s.appendChild(els.ridge);
      els.subSlab = slab([[820, 240], [1000, 300], [980, 500], [900, 486]], 'oceanic');
      s.appendChild(els.subSlab);

      /* convection cells */
      els.cells = hidden(svg('g'));
      [[250, 1], [750, -1]].forEach(([cx, dir]) => {
        els.cells.appendChild(svg('path', {
          d: 'M' + (cx - 150) + ',480 A150,110 0 1,' + (dir > 0 ? 1 : 0) + ' ' + (cx + 150) + ',480',
          fill: 'none', stroke: '#fff', 'stroke-width': '4', opacity: '.7',
          'marker-end': 'url(#tm-arrow)', color: '#fff'
        }));
      });
      s.appendChild(els.cells);

      els.decay = hidden(label(500, 552, 'Heat from the radioactive decay of elements deep inside the Earth',
        { colour: '#fff', size: 14 }));
      s.appendChild(els.decay);

      els.ridgePush = hidden(svg('g'));
      els.ridgePush.appendChild(motionArrow(300, 216, -1, 84));
      els.ridgePush.appendChild(label(240, 190, 'RIDGE PUSH', { colour: C.ink, size: 14, halo: true }));
      s.appendChild(els.ridgePush);

      els.slabPull = hidden(svg('g'));
      els.slabPull.appendChild(magmaArrow(940, 400, 950, 520, 14));
      els.slabPull.appendChild(label(860, 552, 'SLAB PULL — the most important force',
        { colour: '#fff', size: 15, anchor: 'end' }));
      s.appendChild(els.slabPull);

      els.svg = s;
      return els;
    },
    stages: [
      {
        title: 'The traditional view: convection currents',
        caption: 'Heat generated by the radioactive decay of elements deep inside the Earth ' +
          'creates magma in the asthenosphere. Being less dense, it rises towards the ' +
          'lithosphere, migrates sideways and drags the plates above it. Where two cells ' +
          'diverge you get sea-floor spreading; where they converge you get subduction. The ' +
          'magma then cools, becomes denser and sinks back down.',
        enter(tl, e) {
          tl.to(e.cells, { opacity: 1, duration: .7 });
          tl.to(e.decay, { opacity: 1, duration: .5 }, '-=0.3');
        }
      },
      {
        title: 'The modern view: ridge push',
        caption: 'Scientists now think plate movement is driven mainly by forces at the ' +
          'plates themselves. At mid-ocean ridges the hot new crust is higher and less ' +
          'dense, so gravity causes it to slide away from the ridge, pushing the plates apart.',
        enter(tl, e) {
          tl.to(e.cells, { opacity: .22, duration: .5 });
          tl.to(e.ridgePush, { opacity: 1, duration: .6 }, '<');
        }
      },
      {
        title: 'The modern view: slab pull',
        caption: 'At subduction zones the cold, dense oceanic crust sinks into the mantle ' +
          'and pulls the rest of the plate along behind it. Slab pull is considered the most ' +
          'important driving force. In short: the plates are pushed and pulled, not simply ' +
          'carried.',
        enter(tl, e) { tl.to(e.slabPull, { opacity: 1, duration: .7 }); }
      }
    ]
  };

  /* ============================================================
     THE PLAYER
     ============================================================ */

  function mount(id, titleOverride, caption) {
    const def = SIMS[id];
    const wrap = document.createElement('figure');
    wrap.className = 'sim';
    if (!def) {
      wrap.innerHTML = '<p class="act-status bad">Animation “' + id + '” is not registered.</p>';
      return wrap;
    }

    const head = document.createElement('figcaption');
    head.className = 'sim-head';
    head.innerHTML = '<span class="sim-kind">Animation</span>' +
      '<span class="sim-title">' + window.TM.esc(titleOverride || def.title) + '</span>';
    wrap.appendChild(head);

    const stageBox = document.createElement('div');
    stageBox.className = 'sim-stage';
    wrap.appendChild(stageBox);

    const capBox = document.createElement('div');
    capBox.className = 'sim-caption';
    wrap.appendChild(capBox);

    const controls = document.createElement('div');
    controls.className = 'sim-controls';
    wrap.appendChild(controls);

    let els = null, tl = null, built = false, current = -1;
    const reduced = window.TM.prefersReduced();

    function build() {
      if (built) return;
      built = true;
      els = def.build();
      stageBox.appendChild(els.svg);

      if (reduced || !window.gsap) {
        /* Static final frame + the full stage list as text */
        Object.keys(els).forEach((k) => {
          const n = els[k];
          if (n && n.setAttribute && n.getAttribute && n.getAttribute('opacity') === '0') {
            n.setAttribute('opacity', '1');
          }
        });
        const ol = document.createElement('ol');
        ol.className = 'sim-stagelist';
        def.stages.forEach((st) => {
          const li = document.createElement('li');
          li.innerHTML = '<strong>' + window.TM.esc(st.title) + '</strong> ' +
            window.TM.esc(st.caption);
          ol.appendChild(li);
        });
        capBox.appendChild(ol);
        controls.remove();
        return;
      }

      tl = window.gsap.timeline({ paused: true });
      def.stages.forEach((st, i) => {
        tl.addLabel('s' + i);
        st.enter(tl, els);
        tl.to({}, { duration: 0.35 });
      });
      tl.addLabel('end');

      tl.eventCallback('onUpdate', () => {
        scrub.value = String(Math.round(tl.progress() * 1000));
        const t = tl.time();
        let idx = 0;
        def.stages.forEach((_, i) => { if (t >= tl.labels['s' + i] - 0.001) idx = i; });
        if (idx !== current) setStage(idx, false);
      });
      tl.eventCallback('onComplete', () => {
        playBtn.setAttribute('data-playing', '0');
        playBtn.querySelector('.lbl').textContent = 'Replay';
      });

      buildControls();
      setStage(0, true);
    }

    let playBtn, scrub, pips;

    function buildControls() {
      playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'btn btn-accent sim-play';
      playBtn.innerHTML = '<span class="ic" aria-hidden="true">▶</span><span class="lbl">Play</span>';
      playBtn.addEventListener('click', () => {
        if (tl.progress() >= 1) { tl.restart(); setPlaying(true); return; }
        if (playBtn.getAttribute('data-playing') === '1') { tl.pause(); setPlaying(false); }
        else { tl.play(); setPlaying(true); }
      });

      const prevB = document.createElement('button');
      prevB.type = 'button'; prevB.className = 'btn btn-ghost btn-sm';
      prevB.textContent = '‹ Step back';
      prevB.addEventListener('click', () => jump(current - 1));

      const nextB = document.createElement('button');
      nextB.type = 'button'; nextB.className = 'btn btn-ghost btn-sm';
      nextB.textContent = 'Step on ›';
      nextB.addEventListener('click', () => jump(current + 1));

      scrub = document.createElement('input');
      scrub.type = 'range'; scrub.min = '0'; scrub.max = '1000'; scrub.value = '0';
      scrub.className = 'sim-scrub';
      scrub.setAttribute('aria-label', 'Scrub through the animation');
      scrub.addEventListener('input', () => {
        tl.pause(); setPlaying(false);
        tl.progress(Number(scrub.value) / 1000);
      });

      pips = document.createElement('div');
      pips.className = 'sim-pips';
      def.stages.forEach((st, i) => {
        const p = document.createElement('button');
        p.type = 'button'; p.className = 'sim-pip';
        p.title = st.title;
        p.setAttribute('aria-label', 'Stage ' + (i + 1) + ': ' + st.title);
        p.addEventListener('click', () => jump(i));
        pips.appendChild(p);
      });

      controls.appendChild(playBtn);
      controls.appendChild(prevB);
      controls.appendChild(nextB);
      controls.appendChild(scrub);
      controls.appendChild(pips);
    }

    function setPlaying(on) {
      playBtn.setAttribute('data-playing', on ? '1' : '0');
      playBtn.querySelector('.ic').textContent = on ? '❚❚' : '▶';
      playBtn.querySelector('.lbl').textContent = on ? 'Pause' : 'Play';
    }

    function jump(i) {
      i = Math.max(0, Math.min(def.stages.length - 1, i));
      tl.pause(); setPlaying(false);
      tl.seek('s' + i);
      setStage(i, true);
    }

    function setStage(i, force) {
      current = i;
      const st = def.stages[i];
      capBox.innerHTML =
        '<span class="sim-stagenum">Stage ' + (i + 1) + ' of ' + def.stages.length + '</span>' +
        '<strong class="sim-stagetitle">' + window.TM.esc(st.title) + '</strong>' +
        '<p>' + window.TM.esc(st.caption) + '</p>';
      if (pips) {
        Array.prototype.forEach.call(pips.children, (p, n) => {
          p.setAttribute('aria-current', n === i ? 'true' : 'false');
        });
      }
      if (force) window.TM.announce('Stage ' + (i + 1) + ': ' + st.title);
    }

    /* Build synchronously. Nothing here measures layout, so there is no reason
       to wait for a frame — and deferring to rAF or an IntersectionObserver
       leaves an empty frame on the page in any context where those are
       throttled (a background tab, a hidden preview pane, some embeds).
       The observer below only pauses playback when the pupil scrolls away. */
    build();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting && tl && playBtn && playBtn.getAttribute('data-playing') === '1') {
          tl.pause(); setPlaying(false);
        }
      });
    }, { rootMargin: '150px' });
    io.observe(wrap);
    window.TM.onLeave(() => { io.disconnect(); if (tl) tl.kill(); });

    if (caption) {
      const c = document.createElement('p');
      c.className = 'sim-note';
      c.innerHTML = window.TM.rich(caption);
      wrap.appendChild(c);
    }

    /* "Now label it" — the same labelling engine as the Plate Room */
    if (def.plate) {
      const nl = document.createElement('div');
      nl.className = 'sim-nowlabel';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = 'Now label it →';
      b.addEventListener('click', () => window.TM_PLATES.open(def.plate, 'test'));
      nl.innerHTML = '<span class="nl-text"><strong>Drawing this diagram is an exam skill.</strong> ' +
        'Open the plate and label it from memory.</span>';
      nl.appendChild(b);
      wrap.appendChild(nl);
    }

    return wrap;
  }

  window.TM_SIMS = { SIMS, mount };
})();
