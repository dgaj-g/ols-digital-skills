/* contrast-audit.js — ONE HOME FOR "CAN SHE READ IT?", MEASURED IN REAL PIXELS.
 *
 * THE LAW (DFM 207g, his order: "A harness is needed for font readability") and
 * the floors are WCAG 2.1 AA, which is also what `themes.json` has always
 * PROMISED in its own registry comment — a promise nothing measured until he
 * could not read his own screen:
 *     normal text  >= 4.5:1     large text (>=24px, or >=18.66px bold)  >= 3.0:1
 * A mark with no letters in it (a star, a spanner, an arrow) is judged at the
 * 3:1 the non-text rule asks for and reported apart, because holding an unlit
 * star to a text floor is the gate inventing a fault (DFM 146a).
 *
 * WHY PIXELS. A computed-style checker reads `color: <inherited>` against
 * `background: transparent` and has to walk ancestors guessing what is really
 * behind the glyphs; gradients, overlays and images defeat it — and the fault he
 * found on 27 August was precisely an INHERITED colour (`.pyw-chosen` wearing
 * `--text-d`, the DARK shell's text token, on a light parchment card). So this
 * decodes a real screenshot inside the page and measures actual glyph pixels
 * against actual plate pixels (DFM 146b).
 *
 * WHY IT LIVES HERE RATHER THAN INSIDE ONE GATE (DFM 271, his 27 Aug demand).
 * `qa-readability` measured every text node on the surfaces it visited — but the
 * list of SURFACES was hand-kept, so the new pyrun and pye screens were on
 * nobody\'s list and his invisible Butler line was never measured by anything.
 * Coverage now comes from walking what exists: the walkers stand on every screen
 * of every lesson (the DFM 206 gate forces it) and ask THIS module the same
 * question on each one, while `qa-readability` keeps the per-theme sweep. One
 * law, one measurement, more than one home (DFM 144).
 *
 * WHAT IS DELIBERATELY NOT MEASURED, declared here and PRINTED by every caller,
 * because an exemption nobody prints reads as a pass (DFM 204/213):
 *   - anything not rendered (display:none, visibility:hidden, opacity < 0.05,
 *     or a box smaller than 8x6px);
 *   - an element with no text of its OWN (its words belong to a child, and the
 *     child is measured);
 *   - glyphs the measurement cannot separate from their plate — reported as a
 *     SKIP with its reason, never silently counted as a pass.
 */
'use strict';

const EXEMPTIONS = [
  'not rendered (display:none / visibility:hidden / opacity < 0.05 / smaller than 8x6px)',
  'no text of its own (the words belong to a child element, which is measured instead)',
  'glyphs the sampler cannot separate from their plate — printed as a skip with its reason',
  'marks with no letters or digits in them are judged at the 3:1 non-text floor and reported apart'
];

/* the floor this row has to clear */
const floorFor = (r) => (r.icon || r.large) ? 3.0 : 4.5;

const MEASURE = async ([dataUri, rects]) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const dpr = img.width / window.innerWidth;

  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);

  return rects.map(R => {
    /* SAMPLE THE INTERIOR, NOT THE EDGES. A pill-shaped button's bounding box
       includes four corners that are NOT the button — they are whatever sits
       behind it — and on one skin those corners outvoted the button's own
       gradient, so the modal bucket came out as the panel and a perfectly
       legible violet pill was condemned at 1.22:1 while the browser's own
       colours give 6.55:1. Insetting by an eighth on each side keeps every
       glyph (text never reaches its own border) and drops the corners. */
    const inx = Math.round(R.w * dpr * 0.12), iny = Math.round(R.h * dpr * 0.12);
    const x = Math.max(0, Math.round(R.x * dpr) + inx), y = Math.max(0, Math.round(R.y * dpr) + iny);
    const w = Math.min(c.width - x, Math.round(R.w * dpr) - inx * 2);
    const h = Math.min(c.height - y, Math.round(R.h * dpr) - iny * 2);
    if (w < 2 || h < 2) return Object.assign({}, R, { skip: 'off screen' });
    const d = g.getImageData(x, y, w, h).data;
    const N = 48, buckets = [];
    for (let i = 0; i < N; i++) buckets.push({ n: 0, r: 0, g: 0, b: 0 });
    let total = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 250) continue;
      const L = lum(d[i], d[i + 1], d[i + 2]);
      const bi = Math.min(N - 1, Math.floor(L * N));
      const b = buckets[bi];
      b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; total++;
    }
    if (!total) return Object.assign({}, R, { skip: 'nothing drawn' });
    const meanOf = (b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n, L: lum(b.r / b.n, b.g / b.n, b.b / b.n) });
    let plateI = 0;
    buckets.forEach((b, i) => { if (b.n > buckets[plateI].n) plateI = i; });
    const plate = meanOf(buckets[plateI]);

    /* WHICH PIXELS ARE THE TEXT. The first cut took the bucket FARTHEST from the
       plate, and on a gold button with dark ink that is the white highlight line
       along its top edge — so it measured a bevel and called a perfectly readable
       button unreadable. The browser already knows what colour the glyphs are
       (including a colour inherited from four ancestors up), so computed colour
       says WHAT TO LOOK FOR and the screenshot still says WHAT IS ACTUALLY THERE:
       the contrast is measured between real plate pixels and real glyph pixels,
       never between two numbers out of the stylesheet. */
    const want = R.rgb || null;
    const floorN = Math.max(18, total * 0.002);
    let coreI = -1, best = 1e9;
    buckets.forEach((b, i) => {
      if (b.n < floorN || i === plateI) return;
      const m = meanOf(b);
      const d = want
        ? Math.abs(m.r - want[0]) + Math.abs(m.g - want[1]) + Math.abs(m.b - want[2])
        : -Math.abs(m.L - plate.L) * 1000;
      if (d < best) { best = d; coreI = i; }
    });
    /* the glyphs are not on screen at all (covered, clipped, or no text drawn) */
    if (coreI < 0) return Object.assign({}, R, { skip: 'no text pixels found' });
    /* and if the nearest cluster is nothing like the colour the browser says the
       text is, we are looking at something else — say so rather than invent a
       number (tolerance is generous: anti-aliasing pulls glyph pixels toward the
       plate, so a thin 11px face never renders at its pure colour) */
    if (want && best > 240) return Object.assign({}, R, { skip: 'text pixels not distinguishable' });
    const core = meanOf(buckets[coreI]);
    const hi = Math.max(plate.L, core.L), lo = Math.min(plate.L, core.L);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const hex = (p) => '#' + [p.r, p.g, p.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    return Object.assign({}, R, { ratio: Math.round(ratio * 100) / 100, plate: hex(plate), ink: hex(core) });
  });
};

/* the rects + type metrics of every text-bearing element now on screen */
const COLLECT = ([extraSels, hisSels, rootSel]) => {
  const out = [];
  const seen = new Set();
  const push = (el, forced) => {
    if (seen.has(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return;
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (!own && !forced) return;
    seen.add(el);
    const px = parseFloat(cs.fontSize) || 16;
    const weight = Number(cs.fontWeight) || 400;
    out.push({
      sel: el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : el.tagName.toLowerCase(),
      text: (own || el.textContent || '').trim().slice(0, 48),
      /* DOCUMENT coordinates, against a full-page screenshot. Viewport rects
         silently dropped everything below the fold — and the QA desk is a long
         screen, so his answer buttons and the READY button, the very surfaces he
         could not read, were never measured while the run printed a clean pass. */
      x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height,
      px: px, weight: weight,
      /* the colour the browser resolved for these glyphs, used only to FIND them */
      rgb: (cs.color.match(/\d+/g) || ['0', '0', '0']).slice(0, 3).map(Number),
      /* a glyph with no letters or digits in it is a MARK, not text — a star, a
         spanner, a dropdown arrow. Holding an unlit star to a text floor is the
         gate inventing a fault (DFM 146a); marks are judged at the 3:1 the
         non-text rule asks for, and reported apart. */
      icon: !/[a-z0-9]/i.test(own || el.textContent || ''),
      large: px >= 24 || (px >= 18.66 && weight >= 700),
      /* which of HIS named surfaces this element IS, decided by the browser's own
         selector matching rather than by fuzzy class-name comparison */
      his: (hisSels || []).filter(sel => { try { return el.matches(sel); } catch (e) { return false; } })
    });
  };
  /* the host area only — the top bar and starfield are chrome, not lesson text */
  const root = (rootSel && document.querySelector(rootSel)) ||
    document.querySelector('.chunk-host') || document.body;
  root.querySelectorAll('*').forEach(el => push(el, false));
  (extraSels || []).forEach(s => document.querySelectorAll(s).forEach(el => push(el, true)));
  return out;
};


module.exports = { MEASURE, COLLECT, floorFor, EXEMPTIONS };
