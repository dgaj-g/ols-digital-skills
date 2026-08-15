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

const OUT_ROOT = path.join(__dirname, '..', '..', 'platform', 'assets', 'img', 'deck');
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
    ${stars(o.seed, o.starCount, { min: 0.6, max: 2.2 })}
    ${orbits(t, o.orbitOpacity)}`;
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
async function frameShot(srcPng, outPng, t) {
  const img = sharp(srcPng);
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

module.exports = { THEMES, frameShot };
