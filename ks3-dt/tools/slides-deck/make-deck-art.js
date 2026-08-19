#!/usr/bin/env node
/* make-deck-art.js — the pre-rendered art for the teacher decks (DFM 219f).
 *
 * WHY ART RATHER THAN SHAPES. The May 2026 deck Damien pointed at carries its
 * whole look in 21 pre-rendered PNGs and has not one shape-level gradient in
 * it. That is not a limitation, it is the technique: Apps Script's SlidesApp
 * cannot set a gradient, a soft shadow or a glow, so anything richer than a
 * flat fill has to arrive as a picture. Everything here is generated from code
 * and hosted on Pages, so a deck rebuild never depends on a file somebody made
 * by hand once.
 *
 * DETERMINISTIC BY DESIGN: the starfield uses a seeded generator, so running
 * this twice produces byte-identical files and a rebuild is a no-op in git.
 *
 * Usage: node make-deck-art.js [themeId]      (default: all themes)
 */
const fs = require('fs');
const path = require('path');
/* sharp is installed globally on both of his Macs (never a repo dependency —
   the deck art is a build-time tool, not something the platform ships) */
const sharp = require(require('child_process')
  .execSync('npm root -g').toString().trim() + '/sharp');

/* OUT_ROOT is env-overridable for ONE reason, the same reason pack-content's is:
   so `qa-deck-art` can re-render a theme into a scratch directory and compare it
   byte for byte against the committed art, without a check ever writing over the
   artwork it is checking. Nothing else may set it. */
const OUT_ROOT = process.env.KS3DT_DECK_ART_OUT ||
  path.join(__dirname, '..', '..', 'platform', 'assets', 'img', 'deck');
const W = 1440, H = 810;                 /* 2x the 720x405 deck canvas */

/* ---------------------------------------------------------------- themes ---
   One entry per lesson. Each is a committed colour world, harmonised with that
   lesson's pupil-side skin so the board and her screen belong together. More
   saturated than the May deck by his instruction ("noticeably more vibrant").
   `text` is checked against `ground` at build time by qa-deck-contrast. */
const THEMES = {
  'j1-01': {
    name: 'Mission Control',
    ground: '#0A1430', panel: '#101E46', accent: '#35E0FF', accent2: '#E4B824',
    text: '#FFFFFF', dim: '#A9C4E8',
    motif: 'orbital'          /* starfield + orbital arcs */
  },
  /* Amber Circuit — the object in her hands. The micro:bit is a near-black board
     with red-amber LEDs and a gold edge connector, so the board world is warm
     black and amber glow. Deliberately NOT a starfield: the orbital motif is
     Lesson 1's and stays Lesson 1's. */
  'j1-02': {
    name: 'Amber Circuit',
    ground: '#161006', panel: '#241906', accent: '#FFC24B', accent2: '#FF5A36',
    text: '#FFFFFF', dim: '#E8D9B8',
    motif: 'led-grid'         /* the micro:bit's own 5x5 face + circuit traces */
  },
  /* Arcade Glow — the lesson is a scoreboard, so the deck is a CRT: violet-black
     ground, neon magenta, phosphor green for the win moments. */
  'j1-03': {
    name: 'Arcade Glow',
    ground: '#120720', panel: '#1E0C33', accent: '#FF4FA3', accent2: '#48FF9E',
    text: '#FFFFFF', dim: '#D9C8F2',
    motif: 'scoreboard'       /* a ghosted seven-segment 0 + high-score rules */
  },
  /* The Case File — his own verdict anchors it: "I love the look of the actual
     case board." The deck wears the same world; noir gunmetal, manila folder,
     the red of a CASE stamp. */
  'j1-04': {
    name: 'The Case File',
    ground: '#101418', panel: '#1A2028', accent: '#F5DFA8', accent2: '#FF4D4D',
    text: '#FFFFFF', dim: '#C7CFD9',
    motif: 'casefile'         /* folder tab, fingerprint, pinboard strings */
  },
  /* Premiere Night — the lesson's climax IS a premiere, so the deck is the
     theatre front: velvet black-red, marquee bulbs, two spotlights. */
  'j1-05': {
    name: 'Premiere Night',
    ground: '#1C0910', panel: '#2A1018', accent: '#FF6E8C', accent2: '#FFE9B8',
    text: '#FFFFFF', dim: '#E8C9D2',
    motif: 'marquee'          /* bulb runs + crossed spotlight beams */
  },

  /* ══════════════════════ THE J2/J3 THEMES (K26, 17 Aug 2026) ═══════════════
     His ruling was REUSE — one generator, one house style — with the condition
     that reuse never becomes laziness (DFM 237a). So these two are built to the
     same two-layer motif contract as the five above and are held to the same
     contrast floor, and each is harmonised with its own year's pupil-side world
     so the board and her screen belong to one another (template §4).

     BEING DISTINCT WAS THE HARD PART, and it is worth recording why each choice
     was made rather than leaving it to look arbitrary.

     THE WORKBENCH (J2 Lesson 1) sits nearest to Lesson 2's Amber Circuit, which
     is already a warm dark board with an amber accent. Three things separate
     them, and all three are visible from the back of a room: the ground is an
     iron-warm CHARCOAL (`#1A1512`, lightness 9%) rather than Amber Circuit's
     near-black `#161006` (6%); the accent is COPPER at hue 24 rather than amber
     at hue 40; and the second accent is COLD STEEL — Amber Circuit has no cool
     colour anywhere in it, so a steel-blue hairline is unmistakably not that
     deck. The motif is a workshop rather than a circuit board.

     THE SCREENING ROOM (J3 Lesson 1) sits nearest to Lesson 5's Premiere Night.
     Same discipline: PLUM (hue 305) rather than red-black (hue 340), MARQUEE
     GOLD as the dominant accent rather than pink — and the accent is what a
     slide is mostly coloured by, since every kicker, bullet dot, beacon ring and
     screenshot frame takes it — with red-carpet crimson second (K11f). And the
     motif is the room's INTERIOR (seat backs, the projector's beam, the screen
     itself) where Premiere Night is the building's FRONT (marquee bulbs,
     spotlights). One is where the audience sits; the other is the facade. */
  'j2-01': {
    name: 'The Workbench',
    ground: '#1A1512', panel: '#2B2320', accent: '#F5822F', accent2: '#9FB6C4',
    text: '#FFFFFF', dim: '#D8C4B4',
    motif: 'forge'            /* embers + peg-board wall; bench, vice, anvil, hearth */
  },
  'j3-01': {
    name: 'The Screening Room',
    ground: '#170A16', panel: '#2D1429', accent: '#FFD666', accent2: '#FF4D67',
    text: '#FFFFFF', dim: '#D8BFD2',
    motif: 'screening'        /* beam dust + grain; seats, the beam, the screen */
  },

  /* ══════════════ THE TWO LESSON-2 THEMES (19 Aug 2026) ═════════════════════
     Both palettes are COPIED, value for value, out of the lesson's own
     `<lesson>.deck.json` theme block, which the deck renderer uses for every
     shape and every word on the slide. They are not re-chosen here. If the two
     ever drifted, the board's picture and the board's text would belong to two
     different colour worlds and nothing would say so — the one-fact-one-home
     rule (DFM 144) applied to a palette.

     WHY THE MOTIFS ARE NOT REUSED, and what makes each its own.
     THE BUREAU (J2 Lesson 2) is an office where something is written out again
     in another language: six Scratch blocks on one desk, six lines of Python on
     the other. So the drawing is a TRANSLATOR'S DESK — a nib and an inkwell in
     silhouette, a lamp pooling on the desktop, and the same thing said twice
     down the right of frame in two different hands. It could not be mistaken
     for the Workbench beside it in the same year: that theme is charcoal, copper
     and iron, and its objects are a vice and an anvil.
     THE CALL SHEET (J3 Lesson 2) is a theatre's running order, printed by her
     own program. So the drawing is BACKSTAGE — fly ropes dropping the full
     height of the frame with sandbags on their ends, a work lamp burning warm
     in a cold room, and a clipboard held at an angle. It could not be mistaken
     for the Screening Room beside it: that theme is plum and gold and is the
     view from the back of the AUDIENCE, looking at the beam and the screen.
     One is where the show is watched; this one is where the show is run.

     AND NEITHER DRAWS A HORIZONTAL RULE, which is a named fault class rather
     than a taste: he read Lesson 3's proofs and found "a faint background rule
     [that] lands on the first bullet's baseline and reads as an accidental
     underline". Every straight line in both motifs is VERTICAL or is a curve. */
  'j2-02': {
    name: 'The Bureau',
    ground: '#0E1D1B', panel: '#17302C', accent: '#3FC79A', accent2: '#F2B25C',
    text: '#FFFFFF', dim: '#C6DCD4',
    motif: 'bureau'           /* paper tooth + the same thing said twice; nib, inkwell, lamp */
  },
  'j3-02': {
    name: 'The Call Sheet',
    ground: '#052220', panel: '#0B3A36', accent: '#4DE3A3', accent2: '#FFB43D',
    text: '#FFFFFF', dim: '#B6DED4',
    motif: 'callsheet'        /* punched holes + grain; fly ropes, sandbags, work lamp, clipboard */
  }
};

/* a tiny seeded PRNG so the starfield is the same every build */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function stars(seed, n, opts) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = Math.round(r() * W), y = Math.round(r() * H);
    const rad = (r() * (opts.max - opts.min) + opts.min).toFixed(2);
    const o = (r() * 0.55 + 0.2).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#fff" opacity="${o}"/>`;
  }
  return out;
}

/* the orbital grid — wide, slow arcs that read as a control room without
   becoming a pattern the eye fixes on */
function orbits(t, opacity) {
  let out = '';
  const rings = [
    { cx: 1180, cy: 120, r: 520 }, { cx: 1180, cy: 120, r: 700 },
    { cx: 120, cy: 760, r: 460 }, { cx: 120, cy: 760, r: 640 }
  ];
  rings.forEach(o => {
    out += `<circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="none" ` +
      `stroke="${t.accent}" stroke-width="1.5" opacity="${opacity}"/>`;
  });
  return out;
}

/* ---------------------------------------------------------------- motifs ---
   Every theme draws in TWO layers, and every motif fills both: `dust`, the fine
   texture that stops the ground reading as a flat slab, and `lines`, the
   structural drawing that gives the lesson its own world. Two layers, because
   that is exactly what Lesson 1 already had — a starfield and a set of orbital
   arcs — and keeping the same two slots, in the same order, with the same
   whitespace, is what lets Lesson 1's four backgrounds go on rebuilding BYTE
   FOR BYTE while four new worlds are added beside it. `qa-deck-art` proves that
   claim on every run rather than trusting it (DFM 196: the guard was standing
   before the first branch was written).

   Each motif is quieter on `section` backgrounds than on `title`, because the
   text has to win — the density knobs are the same `starCount` / `orbitOpacity`
   the variants already tuned per slide kind. */
function ledDot(cx, cy, r, fill, op) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${op}"/>`;
}

const MOTIFS = {
  /* LESSON 1 — untouched, and it must stay untouched. These two lines are the
     whole of the original drawing, moved into the registry unchanged. */
  orbital: {
    dust: (t, o) => stars(o.seed, o.starCount, { min: 0.6, max: 2.2 }),
    lines: (t, op) => orbits(t, op)
  },

  /* LESSON 2 — the micro:bit's own face. A 5x5 LED matrix, glowing, sitting
     right of frame at the size it would be if the board were held up to the
     projector, plus the loose dots of a board's other components. */
  'led-grid': {
    dust: (t, o) => {
      const r = rng(o.seed);
      let out = '';
      /* the 5x5 face — the one thing every pupil will be holding */
      const cell = 62, x0 = 1010, y0 = 190;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          /* a fixed diagonal reads as a lit pattern rather than a dead grid */
          const lit = (row + col) % 3 === 0;
          out += ledDot(x0 + col * cell, y0 + row * cell, lit ? 13 : 9,
            t.accent, (lit ? 0.30 : 0.12).toFixed(2));
        }
      }
      /* the scattered components — deterministic, and sparse enough to read as
         texture rather than as a second pattern competing with the face */
      const n = Math.round(o.starCount * 0.45);
      for (let i = 0; i < n; i++) {
        out += ledDot(Math.round(r() * W), Math.round(r() * H),
          (r() * 1.6 + 0.6).toFixed(2), t.accent2, (r() * 0.22 + 0.06).toFixed(2));
      }
      return out;
    },
    lines: (t, op) => {
      /* circuit traces: orthogonal, with the mitred corner a real board has */
      const paths = [
        'M0,120 H210 L300,210 H520', 'M0,690 H160 L250,600 H470',
        `M${W},250 H1210 L1120,340 H960`, `M${W},640 H1260 L1170,730 H900`
      ];
      return paths.map(d => `<path d="${d}" fill="none" stroke="${t.accent}" ` +
        `stroke-width="2" opacity="${op}" stroke-linejoin="miter"/>`).join('') +
        /* the gold edge connector's pin teeth, along the very bottom */
        Array.from({ length: 24 }, (_, i) =>
          `<rect x="${300 + i * 36}" y="${H - 14}" width="14" height="14" ` +
          `fill="${t.accent}" opacity="${(op * 0.9).toFixed(3)}"/>`).join('');
    }
  },

  /* LESSON 3 — a scoreboard on a CRT. A single huge seven-segment 0 ghosted
     right of frame (the number her forever loop will be showing), the ruled
     lines of a high-score table, and the faintest scanline whisper. */
  scoreboard: {
    dust: (t, o) => {
      /* the 0, drawn as the six segments a real seven-segment digit lights */
      const X = 1040, Y = 175, w = 250, h = 460, s = 34, g = 12;
      const seg = (x, y, ww, hh) =>
        `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" rx="${s / 2}" ` +
        `fill="${t.accent}" opacity="0.13"/>`;
      const d =
        seg(X + s, Y, w - s * 2, s) +                                  /* top    */
        seg(X + s, Y + h - s, w - s * 2, s) +                           /* bottom */
        seg(X, Y + s + g, s, h / 2 - s - g * 1.5) +                     /* upper L */
        seg(X, Y + h / 2 + g / 2, s, h / 2 - s - g * 1.5) +             /* lower L */
        seg(X + w - s, Y + s + g, s, h / 2 - s - g * 1.5) +             /* upper R */
        seg(X + w - s, Y + h / 2 + g / 2, s, h / 2 - s - g * 1.5);      /* lower R */
      /* CRT scanlines — every fourth row, and barely there */
      let scan = '';
      for (let y = 0; y < H; y += 4) {
        scan += `<rect x="0" y="${y}" width="${W}" height="1" fill="#000" opacity="0.10"/>`;
      }
      return d + scan;
    },
    lines: (t, op) => {
      /* the ruled lines of a high-score table, left of frame */
      let out = '';
      for (let i = 0; i < 7; i++) {
        out += `<rect x="90" y="${175 + i * 66}" width="640" height="1.5" ` +
          `fill="${t.accent}" opacity="${(op * (i === 0 ? 1.6 : 0.7)).toFixed(3)}"/>`;
      }
      /* and the phosphor rule under the top row — the current leader */
      out += `<rect x="90" y="${175 + 66}" width="240" height="3" ` +
        `fill="${t.accent2}" opacity="${(op * 1.5).toFixed(3)}"/>`;
      return out;
    }
  },

  /* LESSON 4 — the case file. A kraft folder tab along the top edge, one
     fingerprint low-right, and the red strings of a pinboard crossing the
     corners. Noir, but never so dark that the manila stops reading. */
  casefile: {
    dust: (t, o) => {
      /* the fingerprint: concentric arcs, offset so they read as a whorl and
         not as a target */
      let out = '';
      for (let i = 0; i < 14; i++) {
        const rr = 26 + i * 15;
        const cx = 1215 + Math.round(Math.sin(i * 0.6) * 9);
        const cy = 610 + Math.round(Math.cos(i * 0.5) * 7);
        out += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" ` +
          `stroke="${t.accent}" stroke-width="2" opacity="0.055" ` +
          `stroke-dasharray="${170 + i * 22} ${60 + i * 6}"/>`;
      }
      /* paper tooth — sparse specks so the ground reads as card, not as glass */
      const r = rng(o.seed);
      const n = Math.round(o.starCount * 0.7);
      for (let i = 0; i < n; i++) {
        out += ledDot(Math.round(r() * W), Math.round(r() * H),
          (r() * 1.3 + 0.5).toFixed(2), t.accent, (r() * 0.10 + 0.03).toFixed(2));
      }
      return out;
    },
    lines: (t, op) => {
      /* FIRST, kill the haze. The shared radial lifts the middle of every ground
         towards `panel`, which on a gunmetal palette turns the centre of the
         slide into flat grey mist — the generic look he calls ugly, and it is
         the one thing a case file must not be. A dark wash and a heavy vignette
         put the noir back before anything is drawn on top. (Lesson 1 is
         untouched by this: it is drawn by its own branch.) */
      const wash =
        `<rect width="${W}" height="${H}" fill="${t.ground}" opacity="0.62"/>` +
        `<ellipse cx="${W / 2}" cy="${H / 2}" rx="${W * 0.78}" ry="${H * 0.72}" ` +
        `fill="none" stroke="#000" stroke-width="300" opacity="0.42" filter="url(#soft2)"/>`;
      /* the folder tab. Anchored LEFT and only a third of the width, which is
         where the tab of a file sitting proud in a drawer actually is — the
         full-width version read as a random notch in a bar. */
      const tab =
        `<rect x="0" y="0" width="${W}" height="10" fill="${t.accent}" ` +
        `opacity="${(op * 3.2).toFixed(3)}"/>` +
        `<path d="M96,10 H392 L436,74 H150 Z" fill="${t.accent}" ` +
        `opacity="${(op * 2.6).toFixed(3)}"/>` +
        `<path d="M96,10 H392 L436,74 H150 Z" fill="none" stroke="${t.accent}" ` +
        `stroke-width="2" opacity="${(op * 5).toFixed(3)}"/>`;
      /* pinboard strings — the stamp red has to be SEEN or the board is just
         grey; they run corner to corner behind everything */
      const strings = [
        { d: `M-20,168 L392,-20`, o: 1.0 },
        { d: `M${W + 20},130 L${W - 330},-20`, o: 0.85 },
        { d: `M-20,${H - 205} L330,${H + 20}`, o: 0.75 },
        { d: `M${W + 20},${H - 150} L${W - 250},${H + 20}`, o: 0.6 }
      ].map(s => `<path d="${s.d}" stroke="${t.accent2}" stroke-width="2.5" ` +
        `fill="none" opacity="${(op * 4.5 * s.o).toFixed(3)}"/>`).join('');
      return wash + strings + tab;
    }
  },

  /* LESSON 5 — the theatre front. Runs of marquee bulbs top and bottom, and two
     spotlight beams crossing behind where the wordmark sits. */
  marquee: {
    dust: (t, o) => {
      /* the bulb runs. Every third bulb is brighter, the way a real marquee
         chases — a perfectly even run reads as a dotted line, not as lights. */
      let out = '';
      const step = 48;
      for (let x = 30; x < W; x += step) {
        const i = Math.round((x - 30) / step);
        const bright = i % 3 === 0;
        [34, H - 34].forEach(y => {
          out += ledDot(x, y, bright ? 9 : 6, t.accent2, (bright ? 0.42 : 0.18).toFixed(2));
          if (bright) out += ledDot(x, y, 20, t.accent2, '0.07');
        });
      }
      /* film grain */
      const r = rng(o.seed);
      const n = Math.round(o.starCount * 1.1);
      for (let i = 0; i < n; i++) {
        out += ledDot(Math.round(r() * W), Math.round(r() * H),
          (r() * 1.1 + 0.4).toFixed(2), '#fff', (r() * 0.10 + 0.03).toFixed(2));
      }
      return out;
    },
    lines: (t, op) => {
      /* Two spotlights washing the stage — they SPLAY OUTWARDS from high centre.
         The first version crossed, and crossing beams draw a enormous letter V
         across the middle of every slide: the eye reads a letterform before it
         reads anything written on top of it, and the text would have had to
         fight it. Splayed and much fainter, they light the slide instead of
         decorating it. */
      const beams = [
        `M560,-40 L690,-40 L250,${H + 40} L-140,${H + 40} Z`,
        `M${W - 560},-40 L${W - 690},-40 L${W - 250},${H + 40} L${W + 140},${H + 40} Z`
      ].map(d => `<path d="${d}" fill="${t.accent2}" opacity="${(op * 0.30).toFixed(3)}" ` +
        `filter="url(#soft)"/>`).join('');
      /* the lamp flare where each beam leaves its housing */
      const lamps = [610, W - 610].map(x =>
        `<ellipse cx="${x}" cy="-10" rx="150" ry="90" fill="${t.accent2}" ` +
        `opacity="${(op * 1.1).toFixed(3)}" filter="url(#soft)"/>`).join('');
      return beams + lamps;
    }
  },

  /* J2 LESSON 1 — THE WORKBENCH. The room after hours: the hearth still warm at
     one end, embers going up, a peg-board of tools on the wall and the bench
     itself running across the lower third with a vice clamped to it. Everything
     is silhouette and glow, because a background that draws itself in detail
     competes with the words written on top of it. */
  forge: {
    dust: (t, o) => {
      const r = rng(o.seed);
      let out = '';
      /* THE PEG-BOARD, upper right: a regular grid of small holes, which is what
         a tool wall actually looks like from across a room. Regular on purpose —
         it is the one ORDERED thing in the drawing, and it reads as a wall
         rather than as scatter. Kept faint: it sits behind the heading. */
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 9; col++) {
          out += ledDot(1010 + col * 46, 92 + row * 46, 4.5, t.accent2, '0.10');
        }
      }
      /* THE EMBERS. The year's pupil-side world has sparks drifting up, so the
         board has them too. Weighted DOWNWARDS — an ember has just left the
         hearth, so most of them are still low — and warmest at the bottom. */
      const n = Math.round(o.starCount * 1.15);
      for (let i = 0; i < n; i++) {
        /* y biased low by squaring the random draw, which puts roughly three
           quarters of them in the bottom half without any of them being placed
           by hand */
        const y = Math.round(H - Math.pow(r(), 2) * H);
        const x = Math.round(r() * W);
        const rad = (r() * 2.0 + 0.7).toFixed(2);
        const hot = y > H * 0.62;
        out += ledDot(x, y, rad, hot ? t.accent : t.dim,
          (r() * (hot ? 0.42 : 0.20) + 0.08).toFixed(2));
      }
      return out;
    },
    lines: (t, op) => {
      /* THE HEARTH, low left. A blurred wash, not a shape: an ellipse with a
         hard edge reads as something somebody drew (the generic look he calls
         ugly), and blurred it reads as heat. */
      const hearth =
        `<ellipse cx="140" cy="${H - 30}" rx="360" ry="190" fill="${t.accent}" ` +
        `opacity="${(op * 1.35).toFixed(3)}" filter="url(#soft)"/>`;
      /* ── NOT ONE STRAIGHT RULE ANYWHERE, AND THAT IS THE DESIGN, NOT A TASTE ─
         He read the finished Lesson 3 proofs and found "a faint background rule
         [that] lands on the first bullet's baseline and reads as an accidental
         underline". It was reported rather than fixed, because fixing it meant
         redrawing artwork he had already approved. It is a KNOWN fault class, so
         no new theme gets to reproduce it: the bench is not drawn as a line
         across the slide, it is IMPLIED by two objects standing at the same
         height in the bottom corners. A soft silhouette can sit behind a
         sentence; a horizontal rule cannot. */

      /* THE VICE, bottom left — the one object in a workshop that says "work is
         held here while it is worked on". Jaws, slide, screw and handle. */
      const vy = H - 74;
      const vice =
        `<rect x="196" y="${vy - 54}" width="88" height="30" rx="3" fill="${t.accent2}" ` +
        `opacity="${(op * 1.5).toFixed(3)}"/>` +
        `<rect x="290" y="${vy - 58}" width="32" height="34" rx="3" fill="${t.accent2}" ` +
        `opacity="${(op * 1.9).toFixed(3)}"/>` +
        `<rect x="232" y="${vy - 24}" width="40" height="34" fill="${t.accent2}" ` +
        `opacity="${(op * 1.3).toFixed(3)}"/>` +
        `<rect x="200" y="${vy + 10}" width="104" height="16" rx="4" fill="${t.accent2}" ` +
        `opacity="${(op * 1.3).toFixed(3)}"/>` +
        `<rect x="322" y="${vy - 47}" width="86" height="9" rx="4" fill="${t.accent2}" ` +
        `opacity="${(op * 1.6).toFixed(3)}"/>` +
        `<circle cx="416" cy="${vy - 42.5}" r="13" fill="none" stroke="${t.accent2}" ` +
        `stroke-width="7" opacity="${(op * 1.6).toFixed(3)}"/>`;

      /* THE ANVIL, bottom right. Three parts, because that is what makes the
         silhouette readable rather than a lump: the long top face with the horn
         tapering off it, the narrow waist beneath, and the flared base. An anvil
         is the one workshop object that is recognisable in outline alone, which
         is why it carries the theme instead of a hammer. */
      const ax = 990, ay = H - 214;
      const anvil =
        `<g transform="translate(${ax},${ay})" fill="${t.accent}" ` +
        `opacity="${(op * 1.5).toFixed(3)}">` +
        `<path d="M26,0 H244 Q302,4 334,26 Q294,34 244,34 H26 Q10,34 10,17 Q10,0 26,0 Z"/>` +
        `<path d="M116,34 H172 L186,116 H102 Z"/>` +
        `<path d="M64,116 H222 L242,162 H44 Z"/>` +
        `</g>`;
      return hearth + vice + anvil;
    }
  },

  /* J3 LESSON 1 — THE SCREENING ROOM. Seen from the back of the room: the seat
     backs in front of you, the projector's beam going over your shoulder, and
     the screen itself lit at the far end. The year's world is plum velvet and
     one beam sweeping, so the board is the same room with the house lights down. */
  screening: {
    dust: (t, o) => {
      const r = rng(o.seed);
      let out = '';
      /* DUST IN THE BEAM. The specks are only visible where the light is, so
         they are placed INSIDE the wedge rather than sprinkled over the slide:
         the beam leaves the projector high left and widens to the right, so the
         band a mote may sit in gets taller the further right it is. That is what
         makes it read as light rather than as noise. */
      const n = Math.round(o.starCount * 1.25);
      for (let i = 0; i < n; i++) {
        const fx = r();                         /* how far along the beam */
        const x = Math.round(60 + fx * (W - 60));
        const mid = 150 + fx * 250;             /* the beam's centre line */
        const spread = 34 + fx * 190;           /* and how wide it is there */
        const y = Math.round(mid + (r() - 0.5) * spread);
        if (y < 0 || y > H) continue;
        const rad = (r() * 1.7 + 0.5).toFixed(2);
        out += ledDot(x, y, rad, '#fff', (r() * 0.34 + 0.10).toFixed(2));
      }
      /* FILM GRAIN over the whole frame, so the plum is card and not glass */
      const g = Math.round(o.starCount * 0.55);
      for (let i = 0; i < g; i++) {
        out += ledDot(Math.round(r() * W), Math.round(r() * H),
          (r() * 1.1 + 0.4).toFixed(2), t.dim, (r() * 0.11 + 0.03).toFixed(2));
      }
      return out;
    },
    lines: (t, op) => {
      /* THE BEAM, as one soft wedge. Deliberately NOT two crossing beams: that
         is Lesson 5's marquee, and crossing beams draw a letterform across the
         middle of every slide (the fault already found and fixed there). */
      const beam =
        `<path d="M-30,116 L-30,184 L${W + 40},${H * 0.92} L${W + 40},${H * 0.10} Z" ` +
        `fill="${t.accent}" opacity="${(op * 0.55).toFixed(3)}" filter="url(#soft2)"/>` +
        `<ellipse cx="-10" cy="150" rx="120" ry="70" fill="${t.accent}" ` +
        `opacity="${(op * 1.0).toFixed(3)}" filter="url(#soft)"/>`;
      /* THE SCREEN, right of frame — AND IT IS A GLOW, NOT AN OUTLINE.
         The first version drew it as a clean rectangle with a gold edge, and the
         edge landed exactly where a bullets slide's text runs: a bright border
         behind sentences reads as a box somebody drew round them. That is the
         fault he found on Lesson 3's proofs and reported ("a faint background
         rule … reads as an accidental underline") — a known class, so it does
         not get reproduced in a new theme. Blurred and unbordered it is also
         truer to the room: from the back seats the screen is light, not a frame. */
      /* Placed HIGH RIGHT and running off the edge of the frame, because that is
         where a slide has least writing on it: the heading is short and starts at
         the left, and the bullets begin below. The room is seen at an angle from
         the back, so a screen that leaves the frame is what the geometry of the
         room would actually give you. */
      const screen =
        `<rect x="1078" y="58" width="420" height="228" rx="8" fill="${t.dim}" ` +
        `opacity="${(op * 1.1).toFixed(3)}"/>` +
        `<rect x="1048" y="34" width="470" height="276" rx="24" fill="${t.dim}" ` +
        `opacity="${(op * 1.1).toFixed(3)}" filter="url(#soft)"/>`;
      /* THE SEATS. Two staggered rows of seat backs along the bottom edge, the
         near row larger and darker — which is the whole trick that says "you are
         standing at the back". Silhouettes in the crimson, so the second accent
         is somewhere the eye actually meets it. Curves, never rules, and low
         enough that only the crowns of the far row reach the text band. */
      let seats = '';
      const row = (y, w, h, gap, opa, colour) => {
        let s = '';
        for (let x = -w / 2; x < W + w; x += w + gap) {
          s += `<path d="M${x},${H} L${x},${y + h * 0.35} ` +
            `Q${x},${y} ${x + w * 0.5},${y} Q${x + w},${y} ${x + w},${y + h * 0.35} ` +
            `L${x + w},${H} Z" fill="${colour}" opacity="${opa}"/>`;
        }
        return s;
      };
      /* TWO ROWS AT CLEARLY DIFFERENT HEIGHTS. Made the same height they merged
         into one crimson stripe along the bottom edge — a rule by accident,
         which is the thing this theme is not allowed to do. The far row's crowns
         standing well above the near row's is also the only thing that says
         "there are rows", i.e. that this is a room and not a border. */
      seats += row(H - 96, 150, 96, 26, (op * 1.5).toFixed(3), t.accent2);
      seats += row(H - 44, 196, 44, 46, (op * 1.9).toFixed(3), t.accent2);
      return beam + screen + seats;
    }
  },

  /* J2 LESSON 2 — THE BUREAU. A translator's desk after the office has gone
     quiet: one lamp still lit over it, a nib and an inkwell lying where they
     were put down, and, pinned up the right-hand side, the same six things
     written out twice — once in blocks, once in lines. That last part is the
     lesson itself turned into wallpaper, and it is the only ORDERED thing in
     the drawing, which is what makes it read as a wall of work rather than as
     scatter (the peg-board's trick, on a different object). */
  bureau: {
    dust: (t, o) => {
      const r = rng(o.seed);
      let out = '';
      /* THE SAME THING SAID TWICE, eight rows down the right of frame. On the
         left of each pair a rounded BAR — a block, the shape she has been
         dragging since Year 8. On the right, three small squares — a line of
         type. Kept faint: on a bullets slide a screenshot sits over this
         column, and on every other slide it has to stay behind the heading. */
      for (let i = 0; i < 8; i++) {
        const y = 96 + i * 74;
        out += `<rect x="1006" y="${y}" width="118" height="26" rx="9" ` +
          `fill="${t.accent}" opacity="0.11"/>`;
        for (let k = 0; k < 3; k++) {
          out += `<rect x="${1168 + k * 46}" y="${y + 8}" width="34" height="10" rx="3" ` +
            `fill="${t.accent2}" opacity="0.10"/>`;
        }
      }
      /* PAPER TOOTH. Sparse specks so the ground reads as laid paper under a
         lamp rather than as glass — the same reason the case file has it. */
      const n = Math.round(o.starCount * 0.85);
      for (let i = 0; i < n; i++) {
        out += ledDot(Math.round(r() * W), Math.round(r() * H),
          (r() * 1.3 + 0.5).toFixed(2), t.dim, (r() * 0.10 + 0.03).toFixed(2));
      }
      return out;
    },
    lines: (t, op) => {
      /* THE LAMP, top left, where a desk lamp actually is: above the work,
         throwing down. Amber, because amber is the second accent and a colour
         that appears nowhere the eye meets it is a colour that is not in the
         theme. Blurred — a hard ellipse reads as a shape somebody drew. */
      const lamp =
        `<ellipse cx="210" cy="-30" rx="330" ry="240" fill="${t.accent2}" ` +
        `opacity="${(op * 1.25).toFixed(3)}" filter="url(#soft)"/>`;
      /* THE NIB, bottom left. A fountain-pen nib is recognisable in outline
         alone — a tapered leaf, a slit down the middle, one round breather
         hole — which is why it carries the theme instead of a pen, and it is
         drawn tip-DOWN as it would lie on a desk. */
      const nx = 168, ny = H - 250;
      const nib =
        `<g transform="translate(${nx},${ny}) rotate(-18)" opacity="${(op * 1.6).toFixed(3)}">` +
        `<path d="M0,0 Q34,14 34,86 Q34,168 17,208 Q0,168 0,86 Q0,14 0,0 Z" ` +
        `transform="translate(-17,0)" fill="${t.accent}"/>` +
        `<rect x="-1.6" y="70" width="3.2" height="126" fill="${t.ground}" opacity="0.85"/>` +
        `<circle cx="0" cy="62" r="9" fill="${t.ground}" opacity="0.85"/>` +
        `</g>`;
      /* THE INKWELL, to its right. Squat body, short neck, a glint on the
         shoulder — the object that says the nib is not a decoration. */
      const ix = 300, iy = H - 118;
      const well =
        `<g transform="translate(${ix},${iy})" opacity="${(op * 1.5).toFixed(3)}">` +
        `<path d="M-62,0 Q-70,-74 -34,-86 L34,-86 Q70,-74 62,0 Z" fill="${t.accent2}"/>` +
        `<rect x="-26" y="-108" width="52" height="26" rx="7" fill="${t.accent2}"/>` +
        `<ellipse cx="-24" cy="-58" rx="13" ry="22" fill="${t.text}" opacity="0.20"/>` +
        `</g>`;
      /* ONE STROKE OF INK, and it is a CURVE that climbs. Not a rule: a rule
         across a slide lands on a bullet's baseline and reads as an underline,
         which is a fault he found on an approved deck and which no new theme is
         allowed to reproduce. This one starts at the nib and leaves the frame. */
      const stroke =
        `<path d="M196,${H - 62} Q470,${H - 150} 690,${H - 92} T${W + 40},${H - 210}" ` +
        `fill="none" stroke="${t.accent}" stroke-width="7" stroke-linecap="round" ` +
        `opacity="${(op * 1.1).toFixed(3)}"/>`;
      return lamp + stroke + nib + well;
    }
  },

  /* J3 LESSON 2 — THE CALL SHEET. Backstage, not front of house: the fly ropes
     coming down out of the grid with their sandbags on, one work lamp burning
     because the house lights are off, and the call sheet itself on a clipboard,
     held at an angle the way anything held in one hand is. */
  callsheet: {
    dust: (t, o) => {
      const r = rng(o.seed);
      let out = '';
      /* THE PUNCHED HOLES of a ring binder, down the left margin. It is the one
         thing every call sheet in every theatre has in common, it is VERTICAL,
         and it cannot be mistaken for anything else on a slide. Kept to the top
         half so it never runs into the clipboard standing at the bottom. */
      for (let i = 0; i < 7; i++) {
        out += `<circle cx="44" cy="${72 + i * 68}" r="11" fill="none" ` +
          `stroke="${t.dim}" stroke-width="3" opacity="0.14"/>`;
      }
      /* GRAIN over the whole frame, so the teal is card and not glass. */
      const n = Math.round(o.starCount * 0.95);
      for (let i = 0; i < n; i++) {
        out += ledDot(Math.round(r() * W), Math.round(r() * H),
          (r() * 1.2 + 0.45).toFixed(2), t.dim, (r() * 0.10 + 0.03).toFixed(2));
      }
      return out;
    },
    lines: (t, op) => {
      /* THE FLY SYSTEM, hard right. Four ropes out of the grid with sandbags on
         their ends — the thing you are standing under backstage, and the thing
         you are never standing under in the auditorium, which is what separates
         this theme from the Screening Room in the same year.
         PLACED RIGHT AND HIGH ON PURPOSE: ropes are vertical so they can never
         land on a bullet's baseline (the accidental-underline class), and the
         bags stop above the middle of the frame so nothing hangs behind a
         sentence. On a bullets slide this is the column the screenshot covers.
         THE BAG IS LONG AND NARROW, not a trapezoid: the first version read as
         four plant pots, which is a drawing nobody can name. */
      const ropes = [
        { x: 1062, bag: 268 }, { x: 1148, bag: 356 },
        { x: 1236, bag: 214 }, { x: 1322, bag: 322 }
      ].map(r2 =>
        `<rect x="${r2.x}" y="0" width="2.5" height="${r2.bag}" fill="${t.accent}" ` +
        `opacity="${(op * 1.6).toFixed(3)}"/>` +
        `<path d="M${r2.x - 15},${r2.bag} L${r2.x + 17},${r2.bag} ` +
        `L${r2.x + 21},${r2.bag + 128} Q${r2.x + 1},${r2.bag + 146} ${r2.x - 19},${r2.bag + 128} Z" ` +
        `fill="${t.accent}" opacity="${(op * 1.3).toFixed(3)}"/>`).join('');
      /* THE WORK LAMP, low left, standing at the side of the stage and pooling
         on the floor — the one warm source in a cold room, and the only place
         the orange appears, because a colour the eye never meets is not in the
         theme. Blurred: a hard ellipse reads as a shape somebody drew. */
      const lamp =
        `<ellipse cx="150" cy="${H + 40}" rx="380" ry="270" fill="${t.accent2}" ` +
        `opacity="${(op * 1.5).toFixed(3)}" filter="url(#soft)"/>` +
        `<ellipse cx="150" cy="${H - 26}" rx="54" ry="38" fill="${t.accent2}" ` +
        `opacity="${(op * 2.2).toFixed(3)}" filter="url(#soft)"/>`;
      /* THE CLIPBOARD, standing in that pool, tilted the way anything held in
         one hand is. The SHEET IS DRAWN, not glowed: the first version blurred
         it into the ground at stdDeviation 70 and left the clip hanging in mid
         air — an orange blob with nothing under it, which is a drawing nobody
         can name. It is a flat pale rectangle at low opacity instead, so it
         reads as paper without ever competing with a sentence, and the ruled
         rows on it are SHORT and sit inside the board's own tilt, so no line of
         them crosses the slide. */
      const rows = Array.from({ length: 6 }, (_, i) =>
        `<rect x="34" y="${64 + i * 40}" width="${i % 2 ? 150 : 196}" height="6" rx="3" ` +
        `fill="${t.ground}" opacity="0.30"/>`).join('');
      const cb =
        `<g transform="translate(232,${H - 322}) rotate(-8)">` +
        `<rect x="0" y="0" width="272" height="318" rx="10" fill="${t.dim}" ` +
        `opacity="${(op * 1.5).toFixed(3)}"/>` +
        rows +
        `<rect x="86" y="-20" width="100" height="32" rx="9" fill="${t.accent2}" ` +
        `opacity="${(op * 2.4).toFixed(3)}"/>` +
        `<rect x="114" y="-38" width="44" height="22" rx="7" fill="${t.accent2}" ` +
        `opacity="${(op * 2.0).toFixed(3)}"/>` +
        `</g>`;
      return lamp + ropes + cb;
    }
  }
};

function base(t, o) {
  /* a real radial lift under the top-left, so the ground is never a flat slab */
  return `<defs>
      <radialGradient id="lift" cx="26%" cy="18%" r="82%">
        <stop offset="0%" stop-color="${t.panel}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${t.ground}" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${t.accent}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${t.accent}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${t.accent}" stop-opacity="0"/>
      </linearGradient>
      <!-- every wash is blurred: a hard-edged ellipse reads as a SHAPE somebody
           drew, which is exactly the generic look he calls ugly. Blurred, the
           same ellipse reads as light. -->
      <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="70"/>
      </filter>
      <filter id="soft2" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="110"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#lift)"/>
    ${MOTIFS[t.motif].dust(t, o)}
    ${MOTIFS[t.motif].lines(t, o.orbitOpacity)}`;
}

const VARIANTS = {
  /* the title slide: brightest, with a horizon glow under the wordmark */
  title: (t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${base(t, { seed: 20260814, starCount: 190, orbitOpacity: 0.16 })}
    <ellipse cx="${W / 2}" cy="${H * 0.60}" rx="${W * 0.42}" ry="130"
             fill="${t.accent}" opacity="0.13" filter="url(#soft)"/>
    <rect x="${W * 0.28}" y="${H * 0.615}" width="${W * 0.44}" height="3" fill="url(#glow)"/>
  </svg>`,

  /* content slides: quieter, so text always wins */
  section: (t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${base(t, { seed: 77712, starCount: 120, orbitOpacity: 0.10 })}
  </svg>`,

  /* the STOP slides: unmistakable from the back of the room. A wide accent
     wash across the top third and a heavy vignette, so a teacher glancing up
     knows instantly that the room is meant to be facing her. */
  stop: (t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${base(t, { seed: 4242, starCount: 90, orbitOpacity: 0.08 })}
    <rect width="${W}" height="${H}" fill="${t.ground}" opacity="0.35"/>
    <ellipse cx="${W * 0.5}" cy="-120" rx="${W * 0.7}" ry="420"
             fill="${t.accent}" opacity="0.20" filter="url(#soft2)"/>
    <rect x="0" y="0" width="${W}" height="6" fill="url(#glow)"/>
  </svg>`,

  /* the closer: warm, gold-lit, the hour ending well */
  closer: (t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${base(t, { seed: 99001, starCount: 150, orbitOpacity: 0.12 })}
    <ellipse cx="${W * 0.5}" cy="${H * 1.02}" rx="${W * 0.55}" ry="300"
             fill="${t.accent2}" opacity="0.17" filter="url(#soft2)"/>
  </svg>`
};

/* the glow frame a screenshot sits inside, built to the shot's own size so the
   picture is never stretched (rule 146b's spirit: what is promised visually is
   produced in real pixels) */
/* ── CROPPING A SCREENSHOT TO ITS TOP (DFM 237b, 18 Aug 2026) ───────────────
   Six approved J1 shots render 83–141pt wide on a 720pt slide because they are
   near-square cards sitting in a row UNDER a stop slide's bullets: the height
   left over is what decides the width, so a tall picture comes out narrow. The
   cure the gate itself names first is "photograph a wider, COMPLETE element",
   and that is what `crop` does — it keeps the top of the card down to the
   bottom of a named element inside it (the first rating row, the first marquee
   card), which is landscape, complete in itself, and the part a teacher points
   at. The fraction is measured in the browser off the real boxes, so it cannot
   drift when text wraps differently in a different lesson, and it is recorded
   in the manifest: a cropped picture that does not say it was cropped is a
   claim about a screen nobody can check (the film-frame precedent). */
async function frameShot(srcPng, outPng, t, crop) {
  let img = sharp(srcPng);
  if (crop && crop.keepFrac > 0 && crop.keepFrac < 1) {
    const m0 = await img.metadata();
    const keep = Math.max(1, Math.round(m0.height * crop.keepFrac));
    img = sharp(await img.extract({ left: 0, top: 0, width: m0.width, height: keep })
      .png().toBuffer());
  }
  const meta = await img.metadata();
  const PAD = 26, R = 14;
  const w = meta.width + PAD * 2, h = meta.height + PAD * 2;
  const frame = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="10"/></filter></defs>
      <rect x="${PAD - 6}" y="${PAD - 6}" width="${meta.width + 12}" height="${meta.height + 12}"
            rx="${R + 6}" fill="${t.accent}" opacity="0.55" filter="url(#g)"/>
      <rect x="${PAD - 3}" y="${PAD - 3}" width="${meta.width + 6}" height="${meta.height + 6}"
            rx="${R + 3}" fill="none" stroke="${t.accent}" stroke-width="2.5" opacity="0.95"/>
    </svg>`);
  await sharp(frame)
    .composite([{ input: await img.png().toBuffer(), top: PAD, left: PAD }])
    .png().toFile(outPng);
  return { w, h };
}

/* ══════════════════ THE COMPOSED STILLS (spec §2, each lesson) ═════════════
   Three of the twenty-five deck pictures are not screenshots of the app at all,
   and pretending they were would have been the easy lie: they are the lesson's
   OWN pictures — the hook photographs, the annotated reset-button photo, a
   frame lifted out of a locked film — arranged for a projector.
   They are built here, beside the backgrounds, for the same reason the
   backgrounds are: Apps Script cannot compose anything, so a picture that needs
   composing has to arrive as a picture.

   TWO RULES GOVERN ALL OF THEM AND BOTH COME FROM HIM.
   1. **The caption is the lesson's own caption.** The board and her screen say
      the same words about the same photograph (DFM 144/167b — one fact, one
      wording). Nothing here writes new prose.
   2. **A credit that is on the card is on the slide.** `microbit-reset.jpg` is
      CC BY 4.0 and `l4-moth.jpg` is a U.S. Navy photograph; both carry their
      credit in the lesson's own `imgCap`/`caption`, so both carry it here.
      qa-deck-shots greps for the credit rather than trusting this comment. */

/* a real wrapper: measured in characters against the box width, because a
   caption that overflows a projected slide is a caption nobody reads */
function wrapText(s, perLine) {
  const words = String(s).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if ((cur + ' ' + w).length <= perLine) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* one photo, scaled to FIT its box (never cropped, never stretched — his own
   standing complaint about the moth thumbnail was a crop, DFM 192a) */
async function fitted(src, boxW, boxH) {
  const buf = await sharp(src).resize({
    width: boxW, height: boxH, fit: 'inside', withoutEnlargement: false
  }).png().toBuffer();
  const m = await sharp(buf).metadata();
  return { buf, w: m.width, h: m.height };
}

/* the ground every composite sits on: the theme's own slide ground, so a
   composed still and a section background belong to one another */
function groundSvg(t, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="g" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="${t.panel}"/><stop offset="100%" stop-color="${t.ground}"/>
    </radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
  </svg>`;
}

/* THREE PHOTOGRAPHS SIDE BY SIDE, each under the lesson's own caption.
   `images` = [{src, caption}] straight out of the lesson's hook config. */
async function composeTrio(images, outPng, t) {
  const N = images.length;
  const PAD = 34, GAP = 26, CAP_H = 132;
  const cellW = Math.floor((1440 - PAD * 2 - GAP * (N - 1)) / N);
  const imgH = 330;
  const W2 = 1440, H2 = PAD * 2 + imgH + CAP_H;

  const layers = [];
  let overlay = '';
  for (let i = 0; i < N; i++) {
    const x = PAD + i * (cellW + GAP);
    const f = await fitted(images[i].src, cellW, imgH);
    const ix = x + Math.round((cellW - f.w) / 2);
    const iy = PAD + Math.round((imgH - f.h) / 2);
    layers.push({ input: f.buf, left: ix, top: iy });
    /* the accent rule under each photo — the theme's own hairline, so three
       unrelated photographs read as one set */
    overlay += `<rect x="${x}" y="${PAD + imgH + 14}" width="${cellW}" height="3" ` +
      `fill="${t.accent}" opacity="0.9"/>`;
    overlay += `<rect x="${ix - 3}" y="${iy - 3}" width="${f.w + 6}" height="${f.h + 6}" ` +
      `fill="none" stroke="${t.accent}" stroke-width="2" opacity="0.55"/>`;
    const lines = wrapText(images[i].caption || '', Math.floor(cellW / 10.2));
    lines.slice(0, 4).forEach((ln, k) => {
      overlay += `<text x="${x}" y="${PAD + imgH + 52 + k * 26}" fill="${t.dim}" ` +
        `font-family="Helvetica, Arial, sans-serif" font-size="19">${esc(ln)}</text>`;
    });
  }
  const buf = await sharp(Buffer.from(groundSvg(t, W2, H2)))
    .composite(layers.concat([{
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}">${overlay}</svg>`),
      left: 0, top: 0
    }])).png({ compressionLevel: 9 }).toFile(outPng);
  return { w: W2, h: H2 };
}

/* ONE photograph, wide, with a caption that MUST carry its credit line. */
async function composeCredited(src, outPng, t, caption) {
  const PAD = 34, boxW = 1440 - PAD * 2, boxH = 620;
  const f = await fitted(src, boxW, boxH);
  const lines = wrapText(caption || '', Math.floor(boxW / 11.4));
  const CAP_H = 30 + lines.length * 30;
  const W2 = 1440, H2 = PAD * 2 + f.h + CAP_H;
  const ix = PAD + Math.round((boxW - f.w) / 2);
  let overlay = `<rect x="${ix - 4}" y="${PAD - 4}" width="${f.w + 8}" height="${f.h + 8}" ` +
    `fill="none" stroke="${t.accent}" stroke-width="3" opacity="0.7"/>` +
    `<rect x="${PAD}" y="${PAD + f.h + 16}" width="${boxW}" height="3" fill="${t.accent}" opacity="0.9"/>`;
  lines.forEach((ln, k) => {
    overlay += `<text x="${PAD}" y="${PAD + f.h + 54 + k * 30}" fill="${t.dim}" ` +
      `font-family="Helvetica, Arial, sans-serif" font-size="22">${esc(ln)}</text>`;
  });
  await sharp(Buffer.from(groundSvg(t, W2, H2)))
    .composite([{ input: f.buf, left: ix, top: PAD }, {
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}">${overlay}</svg>`),
      left: 0, top: 0
    }]).png({ compressionLevel: 9 }).toFile(outPng);
  return { w: W2, h: H2 };
}

/* A SINGLE FRAME OUT OF A LOCKED FILM. The films are current and locked
   (DFM 220c), so a still lifted from one can never be stale — and the deck then
   shows the class the EXACT pixels the film shows them, rather than a redrawing
   of it (the DFM 174 animation is the platform's best imagery; borrowing it is
   the point). The timestamp is chosen by eye and recorded in the manifest, and
   the mp4's md5 rides with it so a re-recorded film invalidates its own stills. */
async function filmFrame(mp4, tSeconds, outPng, t, caption, opts) {
  const { execFileSync } = require('child_process');
  const tmp = outPng.replace(/\.png$/, '.__frame.png');
  /* OUTPUT seeking (-ss after -i) — accurate to the frame. This film is long-GOP
     and input seeking lands on the previous keyframe, which on one trial handed
     back a frame TEN SECONDS away from the one that had been judged by eye. A
     still chosen by eye and then fetched approximately is not the still that was
     chosen. */
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', mp4, '-ss', String(tSeconds),
    '-frames:v', '1', '-q:v', '2', tmp], { stdio: 'pipe' });

  /* ── CROP / RING / INSET: making the taught thing legible on a wall ───────
     A frame can hold the right moment and still fail in the room. Lesson 2's
     drag lands on a file-explorer sidebar row about ten pixels tall — at slide
     size, projected, the target of the whole instruction is smaller than the
     text describing it, which is DFM 192e's law broken by scale rather than by
     choice ("large enough to read AT THE MOMENT IT TEACHES", and 121a: the
     thing an explanation points at must be visible).
     So a still may declare a CROP (show the part that teaches, bigger), a RING
     (draw the eye, no words) and an INSET (the same pixels, magnified). None of
     these invents anything: every pixel is the film's own, and what was done is
     recorded in the manifest so the choice is inspectable rather than implied. */
  if (opts && (opts.crop || opts.inset || opts.ring)) {
    const meta = await sharp(tmp).metadata();
    const c = opts.crop || { x: 0, y: 0, w: meta.width, h: meta.height };
    let base = sharp(tmp).extract({ left: c.x, top: c.y, width: c.w, height: c.h });
    let buf = await base.png().toBuffer();
    const layers = [];
    let over = '';
    if (opts.ring) {
      const r = opts.ring;
      over += `<rect x="${r.x - c.x}" y="${r.y - c.y}" width="${r.w}" height="${r.h}" rx="8" ` +
        `fill="none" stroke="${t.accent2}" stroke-width="4" opacity="0.98"/>`;
    }
    if (opts.inset) {
      const i = opts.inset, sc = i.scale || 3;
      const iw = Math.round(i.w * sc), ih = Math.round(i.h * sc);
      const cut = await sharp(tmp)
        .extract({ left: i.x, top: i.y, width: i.w, height: i.h })
        .resize({ width: iw, height: ih, kernel: 'nearest' }).png().toBuffer();
      /* placed explicitly when the still says where: an inset dropped in a
         corner by default will happily cover the very row it is magnifying */
      const ix = i.dx !== undefined ? i.dx : c.w - iw - 26;
      const iy = i.dy !== undefined ? i.dy : c.h - ih - 26;
      layers.push({ input: cut, left: ix, top: iy });
      over += `<rect x="${ix - 4}" y="${iy - 4}" width="${iw + 8}" height="${ih + 8}" ` +
        `fill="none" stroke="${t.accent2}" stroke-width="4" opacity="0.98"/>`;
    }
    if (over) {
      layers.push({
        input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${c.w}" height="${c.h}">${over}</svg>`),
        left: 0, top: 0
      });
    }
    if (layers.length) buf = await sharp(buf).composite(layers).png().toBuffer();
    fs.writeFileSync(tmp, buf);
  }

  const PAD = 34;
  const f = await fitted(tmp, 1440 - PAD * 2, 700);
  const lines = caption ? wrapText(caption, Math.floor((1440 - PAD * 2) / 11.4)) : [];
  const CAP_H = lines.length ? 30 + lines.length * 30 : 0;
  const W2 = 1440, H2 = PAD * 2 + f.h + CAP_H;
  const ix = PAD + Math.round((1440 - PAD * 2 - f.w) / 2);
  let overlay = `<rect x="${ix - 4}" y="${PAD - 4}" width="${f.w + 8}" height="${f.h + 8}" ` +
    `fill="none" stroke="${t.accent}" stroke-width="3" opacity="0.7"/>`;
  lines.forEach((ln, k) => {
    overlay += `<text x="${PAD}" y="${PAD + f.h + 54 + k * 30}" fill="${t.dim}" ` +
      `font-family="Helvetica, Arial, sans-serif" font-size="22">${esc(ln)}</text>`;
  });
  await sharp(Buffer.from(groundSvg(t, W2, H2)))
    .composite([{ input: f.buf, left: ix, top: PAD }, {
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}">${overlay}</svg>`),
      left: 0, top: 0
    }]).png({ compressionLevel: 9 }).toFile(outPng);
  fs.unlinkSync(tmp);
  return { w: W2, h: H2 };
}

async function buildTheme(id) {
  const t = THEMES[id];
  if (!t) throw new Error('no theme ' + id);
  const dir = path.join(OUT_ROOT, id);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, svg] of Object.entries(VARIANTS)) {
    const out = path.join(dir, name + '-bg.png');
    await sharp(Buffer.from(svg(t))).png({ compressionLevel: 9 }).toFile(out);
    console.log('  ' + path.relative(process.cwd(), out) +
      '  (' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB)');
  }
}

if (require.main === module) {
  (async () => {
    const only = process.argv[2];
    for (const id of Object.keys(THEMES)) {
      if (only && id !== only) continue;
      console.log('theme ' + id + ' — ' + THEMES[id].name);
      await buildTheme(id);
    }
  })().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
}

module.exports = {
  THEMES, frameShot,
  composeTrio, composeCredited, filmFrame, wrapText
};
