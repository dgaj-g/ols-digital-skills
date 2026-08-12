/* ============================================================
   Diagrams — the frontispiece world map, the shared cross-section
   "scene grammar" every simulation inherits, and the static
   Atlas Plates.

   COLOUR CODE (the teacher's drawn-diagram convention, used
   everywhere without exception):
       blue  = oceanic lithosphere
       brown = continental lithosphere
       red   = magma movement
   ============================================================ */
(function () {
  'use strict';

  const W = window.TM_WORLD;
  const SVGNS = 'http://www.w3.org/2000/svg';

  const C = {
    oceanic: '#3B7DC4', oceanicDark: '#2C5F99',
    cont: '#9C6B44', contDark: '#7A5133',
    magma: '#E1462C', orange: '#F58220', yellow: '#FFC845',
    navy: '#1A3A6B', navyDeep: '#16305E', ink: '#12294F',
    sea: '#CFE2F3', seaDeep: '#A9C9E8', sky: '#EAF1F8'
  };
  const BOUNDARY = {
    constructive: { colour: '#E1462C', label: 'Constructive — plates moving apart' },
    destructive:  { colour: '#1A3A6B', label: 'Destructive — one plate subducts' },
    conservative: { colour: '#E4A11B', label: 'Conservative — plates sliding past' },
    collision:    { colour: '#9C6B44', label: 'Collision — two continents meet' }
  };

  function svg(tag, attrs) {
    const n = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* ============================================================
     FRONTISPIECE — the world, its plates and its boundaries
     ============================================================ */

  /* Boundary traces in real lon/lat, projected at draw time. */
  const BOUNDARIES = [
    { id: 'mar', type: 'constructive', chapter: 'constructive', name: 'Mid-Atlantic Ridge',
      pts: [[-18,66],[-28,55],[-33,45],[-38,32],[-44,22],[-45,10],[-32,1],[-25,-7],
            [-14,-15],[-13,-25],[-14,-35],[-6,-45],[5,-52],[18,-55]] },
    { id: 'epr', type: 'constructive', chapter: 'constructive', name: 'East Pacific Rise',
      pts: [[-104,21],[-108,10],[-102,0],[-95,-10],[-105,-20],[-112,-30],[-115,-40],[-108,-50],[-98,-56]] },
    { id: 'eafr', type: 'constructive', chapter: 'constructive', name: 'East African Rift Valley',
      pts: [[35,15],[36,8],[36,0],[35,-8],[34,-15]] },
    { id: 'redsea', type: 'constructive', chapter: 'constructive', name: 'Red Sea',
      pts: [[43,13],[38,20],[34,27]] },
    { id: 'indian', type: 'constructive', chapter: 'constructive', name: 'Central Indian Ridge',
      pts: [[65,-5],[68,-18],[73,-28],[80,-38],[95,-45]] },
    { id: 'peru', type: 'destructive', chapter: 'destructive', name: 'Peru–Chile Trench',
      pts: [[-80,5],[-81,-5],[-77,-15],[-72,-25],[-72,-35],[-75,-45],[-77,-52]] },
    { id: 'tonga', type: 'destructive', chapter: 'destructive', name: 'Tonga Trench',
      pts: [[-172,-14],[-173,-19],[-175,-24],[-178,-29]] },
    { id: 'japan', type: 'destructive', chapter: 'destructive', name: 'Japan & Mariana Trenches',
      pts: [[153,50],[146,42],[143,36],[142,30],[145,22],[147,14],[146,8]] },
    { id: 'sunda', type: 'destructive', chapter: 'destructive', name: 'Sunda Trench',
      pts: [[94,3],[100,-5],[108,-10],[118,-11],[126,-11]] },
    { id: 'aleut', type: 'destructive', chapter: 'destructive', name: 'Aleutian Trench',
      pts: [[170,52],[-178,51],[-168,53],[-158,55],[-150,58]] },
    { id: 'sanand', type: 'conservative', chapter: 'conservative', name: 'San Andreas Fault',
      pts: [[-125,41],[-122,37],[-118,34],[-115,32]] },
    { id: 'naf', type: 'conservative', chapter: 'conservative', name: 'North Anatolian Fault',
      pts: [[41,40.5],[36,40.9],[31,40.7],[27,40.5]] },
    { id: 'him', type: 'collision', chapter: 'collision', name: 'The Himalayas',
      pts: [[71,35],[78,32],[85,28],[92,27],[97,28]] },
    { id: 'alps', type: 'collision', chapter: 'collision', name: 'The Alps',
      pts: [[6,45],[12,46],[17,46]] }
  ];

  const PLATE_LABELS = [
    { name: 'PACIFIC PLATE', lon: -150, lat: -5, size: 30 },
    { name: 'NORTH AMERICAN', lon: -100, lat: 48, size: 26 },
    { name: 'SOUTH AMERICAN', lon: -58, lat: -18, size: 26 },
    { name: 'NAZCA', lon: -95, lat: -22, size: 23 },
    { name: 'EURASIAN PLATE', lon: 75, lat: 55, size: 28 },
    { name: 'AFRICAN PLATE', lon: 18, lat: -8, size: 27 },
    { name: 'INDO-AUSTRALIAN', lon: 122, lat: -27, size: 26 },
    { name: 'ANTARCTIC PLATE', lon: 40, lat: -76, size: 26 }
  ];

  function frontispiece() {
    const vb = { x: 0, y: 60, w: W.w, h: 1230 };
    const s = svg('svg', {
      viewBox: [vb.x, vb.y, vb.w, vb.h].join(' '),
      role: 'img',
      'aria-label': 'A simplified world map showing the major tectonic plates and the ' +
        'four types of plate margin between them.'
    });

    const defs = svg('defs');
    defs.innerHTML =
      '<linearGradient id="tm-fr-sea" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#1D3F73"/><stop offset="1" stop-color="#12294F"/></linearGradient>' +
      '<filter id="tm-fr-glow" x="-60%" y="-60%" width="220%" height="220%">' +
      '<feGaussianBlur stdDeviation="7" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    s.appendChild(defs);

    s.appendChild(svg('rect', { x: 0, y: 0, width: W.w, height: W.h, fill: 'url(#tm-fr-sea)' }));

    /* Land — one fill + matching stroke closes the hairline gaps */
    s.appendChild(svg('path', {
      d: W.land, fill: '#2E5A96', stroke: '#2E5A96',
      'stroke-width': '2.5', 'stroke-linejoin': 'round', opacity: '0.92'
    }));

    /* Plate names */
    PLATE_LABELS.forEach((p) => {
      const t = svg('text', {
        x: W.lon2x(p.lon), y: W.lat2y(p.lat), 'text-anchor': 'middle',
        fill: 'rgba(255,255,255,0.42)', 'font-family': 'Anton, sans-serif',
        'font-size': p.size, 'letter-spacing': '2.5'
      });
      t.textContent = p.name;
      s.appendChild(t);
    });

    /* Boundaries */
    const ridgeGroup = svg('g', { id: 'tm-fr-ridges' });
    BOUNDARIES.forEach((b) => {
      const d = 'M' + b.pts.map((p) => W.lon2x(p[0]).toFixed(0) + ',' + W.lat2y(p[1]).toFixed(0)).join('L');
      const col = BOUNDARY[b.type].colour;
      const g = svg('g', { class: 'fr-b', 'data-type': b.type, 'data-chapter': b.chapter });

      /* wide invisible hit line so a tap anywhere near it works */
      g.appendChild(svg('path', {
        d, fill: 'none', stroke: 'transparent', 'stroke-width': '30', 'stroke-linecap': 'round'
      }));

      if (b.type === 'constructive') {
        g.appendChild(svg('path', {
          d, fill: 'none', stroke: col, 'stroke-width': '7',
          'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#tm-fr-glow)'
        }));
        ridgeGroup.appendChild(g);
      } else if (b.type === 'destructive') {
        g.appendChild(svg('path', {
          d, fill: 'none', stroke: '#8FB3DE', 'stroke-width': '7',
          'stroke-linecap': 'round', 'stroke-linejoin': 'round'
        }));
        g.appendChild(svg('path', {
          d, fill: 'none', stroke: '#8FB3DE', 'stroke-width': '17',
          'stroke-linecap': 'butt', 'stroke-dasharray': '2 22'
        }));
      } else if (b.type === 'conservative') {
        g.appendChild(svg('path', {
          d, fill: 'none', stroke: col, 'stroke-width': '7', 'stroke-linecap': 'round'
        }));
        g.appendChild(svg('path', {
          d, fill: 'none', stroke: col, 'stroke-width': '19',
          'stroke-dasharray': '3 26', 'stroke-linecap': 'butt', opacity: '.75'
        }));
      } else {
        g.appendChild(svg('path', {
          d, fill: 'none', stroke: col, 'stroke-width': '9',
          'stroke-linecap': 'round', 'stroke-dasharray': '17 9'
        }));
      }
      const title = svg('title');
      title.textContent = b.name + ' — ' + BOUNDARY[b.type].label;
      g.appendChild(title);
      if (b.type !== 'constructive') s.appendChild(g);
    });
    s.appendChild(ridgeGroup);

    /* Named example callouts */
    [
      { id: 'mar', lon: -30, lat: 18, name: 'MID-ATLANTIC RIDGE' },
      { id: 'peru', lon: -76, lat: -30, name: 'PERU–CHILE TRENCH' },
      { id: 'sanand', lon: -128, lat: 30, name: 'SAN ANDREAS' },
      { id: 'him', lon: 86, lat: 20, name: 'HIMALAYAS' },
      { id: 'tonga', lon: -168, lat: -27, name: 'TONGA' },
      { id: 'eafr', lon: 46, lat: -4, name: 'GREAT RIFT VALLEY' }
    ].forEach((m) => {
      const t = svg('text', {
        x: W.lon2x(m.lon), y: W.lat2y(m.lat), 'text-anchor': 'middle',
        fill: '#FFC845', 'font-family': 'Anton, sans-serif',
        'font-size': '25', 'letter-spacing': '1.5'
      });
      t.textContent = m.name;
      s.appendChild(t);
    });

    /* Gentle ridge pulse, paused when off-screen */
    if (window.gsap && !window.TM.prefersReduced()) {
      const tl = window.gsap.to(ridgeGroup, {
        opacity: 0.55, duration: 3.4, repeat: -1, yoyo: true, ease: 'sine.inOut'
      });
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { e.isIntersecting ? tl.play() : tl.pause(); });
      });
      io.observe(s);
      window.TM.onLeave(() => { tl.kill(); io.disconnect(); });
    }

    return s;
  }

  function frontispieceLegend(onPick) {
    const ul = document.createElement('ul');
    ul.className = 'frontis-legend';
    const keys = {
      constructive: '<line x1="1" y1="6" x2="25" y2="6" stroke="#E1462C" stroke-width="4" stroke-linecap="round"/>',
      destructive: '<line x1="1" y1="6" x2="25" y2="6" stroke="#1A3A6B" stroke-width="3"/>' +
        '<path d="M4 6l3-4 3 4M13 6l3-4 3 4" fill="none" stroke="#1A3A6B" stroke-width="2"/>',
      conservative: '<line x1="1" y1="4" x2="25" y2="4" stroke="#E4A11B" stroke-width="2.6"/>' +
        '<line x1="1" y1="9" x2="25" y2="9" stroke="#E4A11B" stroke-width="2.6"/>',
      collision: '<line x1="1" y1="6" x2="25" y2="6" stroke="#9C6B44" stroke-width="4" stroke-dasharray="6 3"/>'
    };
    Object.keys(BOUNDARY).forEach((type) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<svg class="legend-key" viewBox="0 0 26 12" aria-hidden="true">' +
        keys[type] + '</svg>' + BOUNDARY[type].label;
      b.addEventListener('click', () => onPick(type));
      li.appendChild(b);
      ul.appendChild(li);
    });
    return ul;
  }

  /* ============================================================
     SCENE GRAMMAR — every cross-section sim/diagram is built from
     these primitives so the whole atlas looks like one hand.
     Scene space is 1000 x 580.
     ============================================================ */

  const SCENE = { w: 1000, h: 580, seaTop: 128, surface: 210 };

  function scene(opts) {
    opts = opts || {};
    const s = svg('svg', {
      viewBox: '0 0 ' + SCENE.w + ' ' + SCENE.h,
      class: 'tm-scene',
      role: opts.role || 'img'
    });
    if (opts.label) s.setAttribute('aria-label', opts.label);

    const defs = svg('defs');
    defs.innerHTML =
      '<linearGradient id="tm-asth" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#FFC845"/>' +
        '<stop offset="0.42" stop-color="#F58220"/>' +
        '<stop offset="1" stop-color="#C9331C"/></linearGradient>' +
      '<linearGradient id="tm-sea" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#DCEBF8"/><stop offset="1" stop-color="#A9C9E8"/></linearGradient>' +
      '<linearGradient id="tm-sky" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#F2F6FB"/><stop offset="1" stop-color="#E2EAF4"/></linearGradient>' +
      '<filter id="tm-soft" x="-30%" y="-30%" width="160%" height="160%">' +
        '<feGaussianBlur stdDeviation="9"/></filter>' +
      '<filter id="tm-magma-glow" x="-70%" y="-70%" width="240%" height="240%">' +
        '<feGaussianBlur stdDeviation="6" result="b"/>' +
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<marker id="tm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" ' +
        'markerHeight="6" orient="auto-start-reverse">' +
        '<path d="M0 0 L10 5 L0 10 z" fill="currentColor"/></marker>';
    s.appendChild(defs);
    return s;
  }

  /* Asthenosphere with the core-glow ramp */
  function asthenosphere(top) {
    const g = svg('g');
    g.appendChild(svg('rect', {
      x: 0, y: top, width: SCENE.w, height: SCENE.h - top, fill: 'url(#tm-asth)', opacity: '.92'
    }));
    return g;
  }

  /* A lithosphere slab. `pts` is a closed polygon in scene space. */
  function slab(pts, kind, extra) {
    const fill = kind === 'oceanic' ? C.oceanic : C.cont;
    const stroke = kind === 'oceanic' ? C.oceanicDark : C.contDark;
    return svg('path', Object.assign({
      d: 'M' + pts.map((p) => p[0] + ',' + p[1]).join('L') + 'z',
      fill, stroke, 'stroke-width': '2.5', 'stroke-linejoin': 'round'
    }, extra || {}));
  }

  /* Tapered magma arrow */
  function magmaArrow(x1, y1, x2, y2, width) {
    width = width || 13;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const px = -uy, py = ux;
    const headLen = Math.min(30, len * 0.35);
    const bx = x2 - ux * headLen, by = y2 - uy * headLen;
    const d =
      'M' + (x1 + px * width / 2) + ',' + (y1 + py * width / 2) +
      'L' + (bx + px * width / 2.4) + ',' + (by + py * width / 2.4) +
      'L' + (bx + px * width) + ',' + (by + py * width) +
      'L' + x2 + ',' + y2 +
      'L' + (bx - px * width) + ',' + (by - py * width) +
      'L' + (bx - px * width / 2.4) + ',' + (by - py * width / 2.4) +
      'L' + (x1 - px * width / 2) + ',' + (y1 - py * width / 2) + 'z';
    return svg('path', { d, fill: C.magma, filter: 'url(#tm-magma-glow)' });
  }

  /* Grey outlined block arrow for plate motion */
  function motionArrow(x, y, dir, len) {
    len = len || 74;
    const s2 = dir >= 0 ? 1 : -1;
    const h = 9, head = 20;
    const x2 = x + s2 * len;
    const bx = x2 - s2 * head;
    const d = 'M' + x + ',' + (y - h) + 'L' + bx + ',' + (y - h) +
      'L' + bx + ',' + (y - h - 8) + 'L' + x2 + ',' + y +
      'L' + bx + ',' + (y + h + 8) + 'L' + bx + ',' + (y + h) +
      'L' + x + ',' + (y + h) + 'z';
    return svg('path', {
      d, fill: '#FFFFFF', stroke: C.ink, 'stroke-width': '2.2',
      'stroke-linejoin': 'round', opacity: '.95'
    });
  }

  /* Label with a dotted leader line */
  function label(x, y, text, opts) {
    opts = opts || {};
    const g = svg('g', { class: 'tm-label' });
    if (opts.leadTo) {
      g.appendChild(svg('line', {
        x1: x, y1: y + 4, x2: opts.leadTo[0], y2: opts.leadTo[1],
        stroke: opts.leadColour || C.ink, 'stroke-width': '1.6',
        'stroke-dasharray': '2 4', opacity: '.75'
      }));
      g.appendChild(svg('circle', {
        cx: opts.leadTo[0], cy: opts.leadTo[1], r: '3.2',
        fill: opts.leadColour || C.ink
      }));
    }
    const t = svg('text', {
      x, y, 'text-anchor': opts.anchor || 'middle',
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      'font-size': opts.size || 15, 'font-weight': opts.weight || '700',
      'letter-spacing': '.6', fill: opts.colour || C.ink
    });
    t.textContent = text;
    if (opts.halo) {
      const h = t.cloneNode(true);
      h.setAttribute('stroke', '#fff');
      h.setAttribute('stroke-width', '4.5');
      h.setAttribute('stroke-linejoin', 'round');
      g.appendChild(h);
    }
    g.appendChild(t);
    return g;
  }

  window.TM_SCENE = {
    C, SCENE, svg, scene, asthenosphere, slab, magmaArrow, motionArrow, label
  };

  /* ============================================================
     STATIC DIAGRAMS (registered as Atlas Plates)
     ============================================================ */

  const DIAGRAMS = {};

  /* d1 — Earth's interior */
  DIAGRAMS.d1 = {
    title: "Inside the Earth",
    build: function () {
      const s = svg('svg', { viewBox: '0 0 1000 580', class: 'tm-scene',
        role: 'img', 'aria-label': "A cut-away of the Earth showing the crust, mantle, outer core and inner core, with the Moho and Gutenberg discontinuities marked." });
      const defs = svg('defs');
      defs.innerHTML =
        '<radialGradient id="tm-earth" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0" stop-color="#FFE9A8"/><stop offset="0.34" stop-color="#FFC845"/>' +
        '<stop offset="0.62" stop-color="#F58220"/><stop offset="1" stop-color="#B92B18"/></radialGradient>';
      s.appendChild(defs);
      const cx = 330, cy = 290;
      const layers = [
        { r: 250, fill: 'url(#tm-earth)', name: null },
        { r: 250, fill: 'none', name: null }
      ];
      s.appendChild(svg('circle', { cx, cy, r: 250, fill: 'url(#tm-earth)' }));
      /* rings */
      [[250, '#B92B18'], [150, '#E1462C'], [92, '#FFC845']].forEach(([r, col]) => {
        s.appendChild(svg('circle', { cx, cy, r, fill: 'none', stroke: '#fff',
          'stroke-width': '2.5', opacity: '.65' }));
      });
      s.appendChild(svg('circle', { cx, cy, r: 250, fill: 'none', stroke: C.ink, 'stroke-width': '3' }));
      /* crust ring */
      s.appendChild(svg('circle', { cx, cy, r: 246, fill: 'none', stroke: C.cont, 'stroke-width': '9' }));

      return { svg: s, labels: [
        { id: 'crust', text: 'Crust', x: 700, y: 96, lead: [cx + 176, cy - 176] },
        { id: 'moho', text: 'Moho discontinuity', x: 700, y: 148, lead: [cx + 168, cy - 168] },
        { id: 'mantle', text: 'Mantle', x: 700, y: 206, lead: [cx + 148, cy - 96] },
        { id: 'gutenberg', text: 'Gutenberg discontinuity', x: 700, y: 262, lead: [cx + 106, cy + 106] },
        { id: 'outer', text: 'Outer core', x: 700, y: 320, lead: [cx + 62, cy + 96] },
        { id: 'inner', text: 'Inner core', x: 700, y: 378, lead: [cx, cy] }
      ] };
    }
  };

  /* d2 — lithosphere vs asthenosphere */
  DIAGRAMS.d2 = {
    title: 'Lithosphere and asthenosphere',
    build: function () {
      const s = scene({ label: 'A cross-section showing the rigid lithosphere — oceanic and continental — riding on the semi-molten asthenosphere below.' });
      s.appendChild(svg('rect', { x: 0, y: 0, width: 1000, height: 300, fill: 'url(#tm-sky)' }));
      s.appendChild(svg('rect', { x: 0, y: 190, width: 470, height: 110, fill: 'url(#tm-sea)' }));
      s.appendChild(asthenosphere(300));
      /* oceanic slab (thin) + continental slab (thick) */
      s.appendChild(slab([[0, 262], [470, 262], [470, 300], [0, 300]], 'oceanic'));
      s.appendChild(slab([[470, 262], [520, 196], [880, 178], [1000, 208], [1000, 300], [470, 300]], 'continental'));
      s.appendChild(label(232, 240, 'OCEANIC LITHOSPHERE', { colour: '#fff', size: 15 }));
      s.appendChild(label(742, 248, 'CONTINENTAL LITHOSPHERE', { colour: '#fff', size: 15 }));
      s.appendChild(label(500, 420, 'ASTHENOSPHERE — semi-molten, allows the plates to move',
        { colour: '#fff', size: 17, halo: false }));
      s.appendChild(label(500, 452, 'rigid lithosphere above · partially melted rock below',
        { colour: 'rgba(255,255,255,.85)', size: 13, weight: '600' }));
      return { svg: s, labels: [
        { id: 'ocean', text: 'Oceanic lithosphere — thinner, denser', x: 200, y: 84, lead: [232, 272] },
        { id: 'cont', text: 'Continental lithosphere — thicker, less dense', x: 740, y: 84, lead: [740, 226] },
        { id: 'asth', text: 'Asthenosphere', x: 500, y: 540, lead: [500, 380] }
      ] };
    }
  };

  window.TM_DIAGRAMS = {
    frontispiece, frontispieceLegend, DIAGRAMS, BOUNDARY, C
  };
})();
