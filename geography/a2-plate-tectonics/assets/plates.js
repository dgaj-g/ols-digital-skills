/* ============================================================
   THE PLATE ROOM — every diagram in the atlas is a numbered
   Atlas Plate that can be opened in three modes:

     STUDY  full labels, leader lines, caption
     TEST   labels removed; drag them back from a shuffled bank
            that also holds decoy labels from OTHER plates
     BOARD  labels off, heavier strokes — for the whiteboard

   Labelling is the drawn-diagram exam skill the teacher calls
   essential, so TEST mode is the same engine the sims hand off to.
   ============================================================ */
(function () {
  'use strict';

  const Store = window.OLS_STORE;
  const S = window.TM_SCENE;
  const D = window.TM_DIAGRAMS;

  /* ---------- registry ----------
     A plate is: { id, title, chapter, from: 'sim'|'diagram',
                   ref, labels: [{text, x, y, to:[x,y]}], caption } */

  const PLATES = [
    { id: 'p-earth', title: "Inside the Earth", chapter: 'foundations',
      from: 'diagram', ref: 'd1',
      caption: 'The four layers, and the two discontinuities that mark the boundaries ' +
        'between them. Seismic waves change speed at each one, which is how we know they are there.' },
    { id: 'p-litho', title: 'Lithosphere and asthenosphere', chapter: 'foundations',
      from: 'diagram', ref: 'd2',
      caption: 'Use these two terms in the exam rather than crust and mantle.' },
    { id: 'p-seafloor', title: 'Sea-floor spreading and magnetic striping', chapter: 'oceanic-evidence',
      from: 'sim', ref: 'seafloor',
      labels: [
        { text: 'Mid-ocean ridge', x: 500, y: 132, to: [500, 254] },
        { text: 'Central rift valley', x: 786, y: 190, to: [510, 268] },
        { text: 'Thin sediment near the crest', x: 214, y: 190, to: [340, 297] },
        { text: 'Normal polarity', x: 168, y: 452, to: [270, 330] },
        { text: 'Reversed polarity', x: 832, y: 452, to: [730, 330] },
        { text: 'Rising magma', x: 706, y: 512, to: [516, 420] }
      ],
      caption: 'New basalt records the magnetic field as it cools, so the sea floor carries ' +
        'a symmetrical striped record of every reversal.' },
    { id: 'p-constructive', title: 'The constructive margin', chapter: 'constructive',
      from: 'sim', ref: 'constructive',
      labels: [
        { text: 'Plates moving apart', x: 170, y: 120, to: [330, 168] },
        { text: 'Central rift valley', x: 500, y: 112, to: [500, 208] },
        { text: 'Mid-ocean ridge', x: 800, y: 158, to: [566, 224] },
        { text: 'Pillow lavas (basalt)', x: 810, y: 246, to: [518, 212] },
        { text: 'New oceanic crust', x: 214, y: 296, to: [448, 300] },
        { text: 'Rising magma — decompression melting', x: 660, y: 476, to: [512, 420] },
        { text: 'Ridge push', x: 214, y: 356, to: [300, 300] }
      ],
      caption: 'Great Rift Valley → Red Sea → Mid-Atlantic Ridge: the same margin at three ' +
        'stages of its life.' },
    { id: 'p-dest-oo', title: 'Destructive margin: oceanic to oceanic', chapter: 'destructive',
      from: 'sim', ref: 'destructive-oo',
      labels: [
        { text: 'Deep ocean trench (11 km)', x: 300, y: 118, to: [508, 262] },
        { text: 'Island arc', x: 760, y: 118, to: [720, 200] },
        { text: 'Subducting oceanic plate', x: 250, y: 340, to: [430, 300] },
        { text: 'Overriding oceanic plate', x: 830, y: 300, to: [880, 264] },
        { text: 'Hydration melting from 80 km', x: 300, y: 400, to: [560, 372] },
        { text: 'Benioff Zone', x: 810, y: 420, to: [620, 400] },
        { text: 'Rising magma', x: 560, y: 200, to: [660, 300] }
      ],
      caption: 'The Pacific Plate subducting beneath the Indo-Australian Plate: the Tonga ' +
        'Trench with over 150 Tongan islands running parallel to it.' },
    { id: 'p-dest-co', title: 'Destructive margin: oceanic to continental', chapter: 'destructive',
      from: 'sim', ref: 'destructive-co',
      labels: [
        { text: 'Deep ocean trench', x: 300, y: 118, to: [522, 266] },
        { text: 'Fold mountains', x: 700, y: 96, to: [700, 200] },
        { text: 'Composite volcano', x: 880, y: 150, to: [760, 190] },
        { text: 'Subducting oceanic plate (Nazca)', x: 230, y: 348, to: [420, 300] },
        { text: 'Continental plate (South American)', x: 830, y: 320, to: [900, 268] },
        { text: 'Hydration melting from 80 km', x: 300, y: 410, to: [560, 380] },
        { text: 'Benioff Zone', x: 830, y: 440, to: [640, 410] }
      ],
      caption: 'The Nazca Plate beneath the South American Plate: the Peru–Chile Trench and ' +
        'the Andes, with Mt Tacora and Nevado del Ruiz above.' },
    { id: 'p-collision', title: 'The collision margin', chapter: 'collision',
      from: 'sim', ref: 'collision',
      labels: [
        { text: 'Fold mountains (the Himalayas)', x: 500, y: 88, to: [500, 170] },
        { text: 'Buckled sea-floor sediment', x: 820, y: 150, to: [560, 200] },
        { text: 'Continental plate (Indian)', x: 150, y: 250, to: [200, 250] },
        { text: 'Continental plate (Eurasian)', x: 860, y: 250, to: [900, 250] },
        { text: 'Detached slab sinking and melting', x: 500, y: 500, to: [515, 450] },
        { text: 'Shallow, violent earthquakes', x: 250, y: 400, to: [450, 274] }
      ],
      caption: 'No volcanic activity here — there is no subduction and no new crust.' },
    { id: 'p-conservative', title: 'The conservative margin (plan view)', chapter: 'conservative',
      from: 'sim', ref: 'conservative',
      labels: [
        { text: 'North American Plate — 2 cm a year', x: 250, y: 130, to: [400, 90] },
        { text: 'Pacific Plate — 6 cm a year', x: 250, y: 460, to: [400, 500] },
        { text: 'The fault line', x: 800, y: 258, to: [860, 280] },
        { text: 'Offset road — 7 m in 1906', x: 700, y: 400, to: [560, 330] },
        { text: 'Both plates moving north-west', x: 800, y: 130, to: [790, 60] }
      ],
      caption: 'The San Andreas Fault. Crust is conserved, so there is no volcanic activity.' },
    { id: 'p-forces', title: 'What drives the plates', chapter: 'forces',
      from: 'sim', ref: 'forces',
      labels: [
        { text: 'Convection cell', x: 250, y: 400, to: [250, 440] },
        { text: 'Ridge push', x: 210, y: 150, to: [300, 216] },
        { text: 'Slab pull — the most important force', x: 700, y: 470, to: [940, 460] },
        { text: 'Radioactive decay provides the heat', x: 500, y: 552, to: [500, 520] },
        { text: 'Mid-ocean ridge', x: 500, y: 150, to: [500, 230] }
      ],
      caption: 'The traditional view (convection) and the modern view (ridge push and slab ' +
        'pull) sit on one diagram.' }
  ];

  const BY_ID = {};
  PLATES.forEach((p, i) => { p.num = i + 1; BY_ID[p.id] = p; });

  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  function roman(n) { return ROMAN[n] || String(n); }

  /* ---------- build the plate's SVG at its final frame ---------- */

  function buildSvg(plate) {
    if (plate.from === 'diagram') {
      const def = D.DIAGRAMS[plate.ref];
      if (!def) return { svg: null, labels: [] };
      const out = def.build();
      return { svg: out.svg, labels: (out.labels || []).map((l) => ({
        text: l.text, x: l.x, y: l.y, to: l.lead, anchor: l.anchor
      })) };
    }
    const def = window.TM_SIMS.SIMS[plate.ref];
    if (!def) return { svg: null, labels: [] };
    const els = def.build();
    /* reveal every element — the plate is the finished diagram */
    Object.keys(els).forEach((k) => {
      const n = els[k];
      if (n && n.setAttribute && n.getAttribute && n.getAttribute('opacity') === '0') {
        n.setAttribute('opacity', '1');
      }
    });
    /* A sim moves through stages that contradict each other (an ocean that
       later closes, a strain that is later released). `plateFrame` sets the
       one canonical state the finished exam diagram should show. */
    if (typeof def.plateFrame === 'function') def.plateFrame(els);
    return { svg: els.svg, labels: (plate.labels || []).slice() };
  }

  /* ---------- figure embedded in a chapter ---------- */

  function mountFigure(diagramId, caption) {
    const plate = PLATES.find((p) => p.from === 'diagram' && p.ref === diagramId);
    const fig = document.createElement('figure');
    fig.className = 'sim';
    const built = buildSvg(plate || { from: 'diagram', ref: diagramId });
    if (!built.svg) {
      fig.innerHTML = '<p class="act-status bad">Diagram “' + window.TM.esc(diagramId) +
        '” is not registered.</p>';
      return fig;
    }
    const head = document.createElement('figcaption');
    head.className = 'sim-head';
    head.innerHTML = '<span class="sim-kind">Diagram</span>' +
      '<span class="sim-title">' + window.TM.esc(plate ? plate.title : diagramId) + '</span>';
    fig.appendChild(head);

    const box = document.createElement('div');
    box.className = 'sim-stage';
    /* draw the STUDY labels straight onto the embedded figure */
    drawLabels(built.svg, built.labels, false);
    box.appendChild(built.svg);
    fig.appendChild(box);

    if (caption || (plate && plate.caption)) {
      const c = document.createElement('p');
      c.className = 'sim-note';
      c.innerHTML = window.TM.rich(caption || plate.caption);
      fig.appendChild(c);
    }
    if (plate) fig.appendChild(plateTag(plate));
    return fig;
  }

  function plateTag(plate) {
    const d = document.createElement('div');
    d.className = 'plate-tag';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost btn-sm';
    b.textContent = 'Open in the Plate Room →';
    b.addEventListener('click', () => open(plate.id, 'study'));
    d.innerHTML = '<span class="plate-no">Plate ' + roman(plate.num) + '</span>';
    d.appendChild(b);
    return d;
  }

  function drawLabels(svgEl, labels, board) {
    if (!labels || !labels.length) return;
    const g = S.svg('g', { class: 'plate-labels' });
    labels.forEach((l) => {
      g.appendChild(S.label(l.x, l.y, l.text, {
        leadTo: l.to, halo: true, size: board ? 17 : 15, anchor: l.anchor,
        colour: '#12294F', leadColour: '#12294F'
      }));
    });
    svgEl.appendChild(g);
  }

  /* ---------- the full-screen viewer ---------- */

  let openViewer = null;

  function open(plateId, mode) {
    const plate = BY_ID[plateId];
    if (!plate) return;
    if (openViewer) openViewer.remove();

    const back = document.createElement('div');
    back.className = 'overlay';
    const panel = document.createElement('div');
    panel.className = 'ov-panel plate-viewer';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Plate ' + roman(plate.num) + ' — ' + plate.title);

    const bar = document.createElement('div');
    bar.className = 'pv-bar';
    bar.innerHTML =
      '<span class="pv-no">Plate ' + roman(plate.num) + '</span>' +
      '<span class="pv-title">' + window.TM.esc(plate.title) + '</span>';

    const modes = document.createElement('div');
    modes.className = 'pv-modes';
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', 'Plate mode');
    [['study', 'Study'], ['test', 'Test me'], ['board', 'Board']].forEach(([m, lab]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pv-mode'; b.dataset.mode = m; b.textContent = lab;
      b.addEventListener('click', () => setMode(m));
      modes.appendChild(b);
    });
    bar.appendChild(modes);

    const close = document.createElement('button');
    close.type = 'button'; close.className = 'pv-close';
    close.setAttribute('aria-label', 'Close the plate');
    close.innerHTML = '&times;';
    close.addEventListener('click', shut);
    bar.appendChild(close);

    const stage = document.createElement('div');
    stage.className = 'pv-stage';
    const foot = document.createElement('div');
    foot.className = 'pv-foot';

    panel.appendChild(bar);
    panel.appendChild(stage);
    panel.appendChild(foot);
    back.appendChild(panel);
    document.body.appendChild(back);
    openViewer = back;
    document.body.style.overflow = 'hidden';

    function shut() {
      back.remove();
      openViewer = null;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') shut(); }
    document.addEventListener('keydown', onKey);
    back.addEventListener('pointerdown', (e) => { if (e.target === back) shut(); });

    let currentMode = null;

    function setMode(m) {
      currentMode = m;
      Array.prototype.forEach.call(modes.children, (b) => {
        b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false');
      });
      stage.innerHTML = '';
      foot.innerHTML = '';
      panel.dataset.mode = m;

      const built = buildSvg(plate);
      if (!built.svg) return;

      if (m === 'study') {
        drawLabels(built.svg, built.labels, false);
        stage.appendChild(built.svg);
        if (plate.caption) {
          const c = document.createElement('p');
          c.className = 'pv-caption';
          c.textContent = plate.caption;
          foot.appendChild(c);
        }
      } else if (m === 'board') {
        built.svg.classList.add('board-mode');
        stage.appendChild(built.svg);
        const c = document.createElement('p');
        c.className = 'pv-caption';
        c.textContent = 'Board mode — labels off and heavier strokes, for projecting. ' +
          'Ask the class to label it.';
        foot.appendChild(c);
      } else {
        testMode(built, stage, foot, plate);
      }
    }

    setMode(mode || 'study');
    close.focus();
  }

  /* ---------- TEST mode ---------- */

  function testMode(built, stage, foot, plate) {
    const labels = built.labels || [];
    if (!labels.length) {
      stage.appendChild(built.svg);
      foot.innerHTML = '<p class="pv-caption">This plate has no labels to test.</p>';
      return;
    }

    /* decoys drawn from OTHER plates — so the right answer needs knowledge,
       not elimination (playbook: genuine consequence) */
    const mine = labels.map((l) => l.text.toLowerCase());
    const pool = [];
    PLATES.forEach((p) => {
      if (p.id === plate.id) return;
      (p.labels || []).forEach((l) => {
        if (mine.indexOf(l.text.toLowerCase()) < 0) pool.push(l.text);
      });
    });
    const decoys = window.TM.shuffle(pool).slice(0, Math.min(3, Math.max(2, Math.round(labels.length / 3))));

    /* numbered target dots on the diagram */
    const dots = S.svg('g', { class: 'plate-dots' });
    labels.forEach((l, i) => {
      const pt = l.to || [l.x, l.y];
      const g = S.svg('g', { class: 'pdot', 'data-i': String(i) });
      g.appendChild(S.svg('circle', { cx: pt[0], cy: pt[1], r: '22', fill: 'rgba(26,58,107,.06)' }));
      g.appendChild(S.svg('circle', {
        cx: pt[0], cy: pt[1], r: '14', fill: '#fff',
        stroke: '#1A3A6B', 'stroke-width': '2.6'
      }));
      const t = S.svg('text', {
        x: pt[0], y: pt[1] + 5, 'text-anchor': 'middle',
        'font-family': 'Anton, sans-serif', 'font-size': '14', fill: '#1A3A6B'
      });
      t.textContent = String(i + 1);
      g.appendChild(t);
      dots.appendChild(g);
    });
    built.svg.appendChild(dots);
    stage.appendChild(built.svg);

    /* answer rows — number ↔ drop zone, beneath the plate */
    const rows = document.createElement('div');
    rows.className = 'pv-rows';
    labels.forEach((l, i) => {
      const r = document.createElement('div');
      r.className = 'pv-row';
      r.dataset.i = String(i);
      r.innerHTML = '<span class="pv-rownum">' + (i + 1) + '</span>';
      const z = document.createElement('div');
      z.className = 'pv-zone';
      r.appendChild(z);
      rows.appendChild(r);
    });
    foot.appendChild(rows);

    const tray = document.createElement('div');
    tray.className = 'tray sticky';
    tray.appendChild(Object.assign(document.createElement('span'),
      { className: 'tray-label', textContent: 'Drag each label onto its number' }));
    foot.appendChild(tray);

    const chips = [];
    window.TM.shuffle(labels.map((l, i) => ({ text: l.text, i }))
      .concat(decoys.map((t) => ({ text: t, i: -1 }))))
      .forEach((item) => {
        const c = document.createElement('div');
        c.className = 'chip-d';
        c.textContent = item.text;
        c.__item = item;
        chips.push(c);
        tray.appendChild(c);
      });

    const bar = document.createElement('div');
    bar.className = 'pv-actions';
    const checkBtn = document.createElement('button');
    checkBtn.type = 'button'; checkBtn.className = 'btn'; checkBtn.textContent = 'Check my labels';
    checkBtn.disabled = true;
    const status = document.createElement('span');
    status.className = 'act-status';
    bar.appendChild(checkBtn); bar.appendChild(status);
    foot.appendChild(bar);

    function zones() { return Array.prototype.slice.call(rows.querySelectorAll('.pv-zone')); }
    function placed() { return chips.filter((c) => !tray.contains(c)).length; }
    function update() {
      /* every numbered slot must be filled (decoys may stay in the tray) */
      checkBtn.disabled = zones().some((z) => !z.querySelector('.chip-d'));
    }

    chips.forEach((chip) => {
      window.OLS_DRAG.makeDraggable(chip, {
        canDrag: () => !chip.classList.contains('locked-ok'),
        zoneUnder: (x, y, c) =>
          window.OLS_DRAG.zoneUnder(x, y, c, '.pv-row') ||
          window.OLS_DRAG.zoneUnder(x, y, c, '.tray'),
        hoverTarget: (z) => z,
        onDrop: (c, zone) => {
          if (!zone) { update(); return; }
          if (zone.classList.contains('tray')) { tray.appendChild(c); }
          else {
            const z = zone.querySelector('.pv-zone');
            const occupant = z.querySelector('.chip-d');
            if (occupant && occupant !== c) {
              const from = c.parentElement;
              if (from && from.classList.contains('pv-zone')) from.appendChild(occupant);
              else tray.appendChild(occupant);
            }
            z.appendChild(c);
          }
          c.classList.remove('mark-bad');
          status.textContent = ''; status.className = 'act-status';
          update();
        },
        kbZones: () => zones().concat([tray]),
        announce: window.TM.announce,
        chipName: (c) => c.textContent
      });
    });

    checkBtn.addEventListener('click', () => {
      let right = 0;
      zones().forEach((z, i) => {
        const c = z.querySelector('.chip-d');
        if (!c) return;
        if (c.classList.contains('locked-ok')) { right++; return; }
        if (c.__item.i === i) {
          right++; c.classList.add('locked-ok'); c.classList.remove('mark-bad');
        } else {
          c.classList.add('mark-bad');
        }
      });
      const total = labels.length;
      status.textContent = right + ' of ' + total + ' correct.' +
        (right < total ? ' Move the red ones and check again.' : '');
      status.className = 'act-status ' + (right === total ? 'ok' : 'bad');
      window.TM.announce(status.textContent);
      if (right === total) {
        checkBtn.disabled = true;
        Store.masterPlate(plate.id);
        const stamp = document.createElement('div');
        stamp.className = 'mastered-stamp';
        stamp.textContent = 'MASTERED';
        stage.appendChild(stamp);
        if (window.gsap && !window.TM.prefersReduced()) {
          window.gsap.fromTo(stamp,
            { scale: 2.4, opacity: 0, rotate: -18 },
            { scale: 1, opacity: 1, rotate: -11, duration: .5, ease: 'back.out(2)' });
        }
      }
    });

    update();
  }

  /* ---------- the gallery ---------- */

  function gallery() {
    const v = window.TM.el('div', 'view view-wide');
    const head = window.TM.el('div', 'contents-head');
    head.innerHTML = '<h1 class="tm-h">The Plate Room</h1>' +
      '<p class="contents-sub">' + Store.platesMastered() + ' of ' + PLATES.length +
      ' plates mastered — clear the room before the exam</p>';
    v.appendChild(head);

    const topic = window.TM.topic();
    const chapters = topic ? topic.chapters : [];
    const filters = window.TM.el('div', 'plate-filters');
    let active = 'all';
    const grid = window.TM.el('div', 'plate-grid');

    function draw() {
      grid.innerHTML = '';
      PLATES.filter((p) => active === 'all' || p.chapter === active).forEach((p) => {
        const card = window.TM.el('button', 'plate-card');
        card.type = 'button';
        const thumb = window.TM.el('div', 'plate-thumb');
        const built = buildSvg(p);
        if (built.svg) {
          built.svg.removeAttribute('role');
          built.svg.setAttribute('aria-hidden', 'true');
          thumb.appendChild(built.svg);
        }
        card.appendChild(thumb);
        const meta = window.TM.el('div', 'plate-meta');
        meta.innerHTML = '<span class="plate-no">Plate ' + roman(p.num) + '</span>' +
          '<span class="plate-name">' + window.TM.esc(p.title) + '</span>' +
          (Store.plateIsMastered(p.id) ? '<span class="plate-mastered">Mastered</span>' : '');
        card.appendChild(meta);
        card.addEventListener('click', () => open(p.id, 'study'));
        grid.appendChild(card);
      });
    }

    const opts = [{ id: 'all', label: 'Every plate' }].concat(
      chapters.filter((c) => PLATES.some((p) => p.chapter === c.id))
        .map((c) => ({ id: c.id, label: c.title })));
    opts.forEach((o) => {
      const b = window.TM.el('button', 'plate-filter', window.TM.esc(o.label));
      b.type = 'button';
      b.setAttribute('aria-pressed', o.id === 'all' ? 'true' : 'false');
      b.addEventListener('click', () => {
        active = o.id;
        Array.prototype.forEach.call(filters.children, (n) =>
          n.setAttribute('aria-pressed', n === b ? 'true' : 'false'));
        draw();
      });
      filters.appendChild(b);
    });
    v.appendChild(filters);
    v.appendChild(grid);
    draw();

    const back = window.TM.el('div', 'ch-nav');
    const bb = window.TM.el('button', 'btn btn-ghost', 'Back to the contents');
    bb.type = 'button';
    bb.addEventListener('click', () => window.TM.go('#/contents'));
    back.appendChild(bb);
    v.appendChild(back);
    return v;
  }

  window.TM_PLATES = { PLATES, BY_ID, open, gallery, mountFigure, roman };
})();
