/* copied from ks3-dt/tools/record-tutorial/lib/contrast-audit.js at bdd8c5a, 2026-08-28; adapter: none (callers pass rootSel='[data-surface]') */
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
  'glyphs the sampler cannot separate from their plate are asked again in computed colour, composited through their ancestors — and a ground painted with a gradient or an image is refused rather than guessed at, because guessing it reported white-on-teal as 1:1 (6 Sept 2026)',
  'marks with no letters or digits in them are judged at the 3:1 non-text floor and reported apart'
];

/* the floor this row has to clear */
const floorFor = (r) => (r.icon || r.large) ? 3.0 : 4.5;

const MEASURE = async ([dataUri, rects, view]) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  /* THE PICTURE IS THE VIEWPORT; THE ROWS ARE THE DOCUMENT. The rows above are
     recorded at `r.left + scrollX, r.top + scrollY` so that nothing below the
     fold is silently dropped. The picture is what the window was showing when
     it was taken. Those are two different origins, and for a long time they
     were treated as one: on any scrolled screen every sample landed a scroll
     offset away from the glyphs it was judging. The offset comes in with the
     picture now, and a row that was genuinely outside the window is reported
     as off screen rather than measured against whatever happened to be there. */
  const sx = (view && view.sx) || 0, sy = (view && view.sy) || 0;
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
    /* A ROW THAT SCROLLED OFF THE PICTURE IS NOT AT THE TOP OF IT. Clamping the
       subtracted coordinate to zero took every row above the fold and sampled it
       at the top-left corner of the screenshot instead - which on a scrolled
       question page is blank paper, so a cream label on a grey button came back
       as cream on cream at 1.17:1. The picture is the viewport; a row outside it
       was not photographed and cannot be judged from this frame. It is skipped
       with a reason, and the walk will meet it again on a state where it is on
       screen. Clamping was mine, and it invented the worst-looking finding of
       the night. */
    const inx = Math.round(R.w * dpr * 0.12), iny = Math.round(R.h * dpr * 0.12);
    const rx = Math.round((R.x - sx) * dpr), ry = Math.round((R.y - sy) * dpr);
    const rw = Math.round(R.w * dpr), rh = Math.round(R.h * dpr);
    if (rx + rw < 2 || ry + rh < 2 || rx > c.width - 2 || ry > c.height - 2) {
      return Object.assign({}, R, { skip: 'not in the picture: this row was scrolled out of the viewport when the frame was taken' });
    }
    const x = Math.max(0, rx + inx), y = Math.max(0, ry + iny);
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
    /* THE CORES, NOT THE EDGES. This took the bucket whose mean was NEAREST the
       colour the browser says the text is - and for a thin or short string the
       nearest cluster is a pale blend of ink and paper, which is how "Added to
       your jotter." came back at 1.16:1 in green on white. Antialiasing only
       ever pulls glyph pixels TOWARDS the plate, so among the clusters that
       are recognisably the text's own colour the honest one is the FARTHEST
       from the plate: those are the pixels in the middle of a stroke, which is
       what a reader's eye lands on. The nearest-mean rule stays as the
       admission test - a cluster nothing like the ink is still not the text -
       and the choice among the survivors is now made on depth. */
    let coreI = -1, best = 1e9, deepest = -1;
    buckets.forEach((b, i) => {
      if (b.n < floorN || i === plateI) return;
      const m = meanOf(b);
      const d = want
        ? Math.abs(m.r - want[0]) + Math.abs(m.g - want[1]) + Math.abs(m.b - want[2])
        : -Math.abs(m.L - plate.L) * 1000;
      if (d < best) { best = d; coreI = i; }
      if (want && d <= 150) {
        const away = Math.abs(m.L - plate.L);
        if (away > deepest) { deepest = away; coreI = i; }
      }
    });
    /* the glyphs are not on screen at all (covered, clipped, or no text drawn) */
    if (coreI < 0) return Object.assign({}, R, { skip: 'no text pixels found' });
    /* and if the nearest cluster is nothing like the colour the browser says the
       text is, we are looking at something else — say so rather than invent a
       number (tolerance is generous: anti-aliasing pulls glyph pixels toward the
       plate, so a thin 11px face never renders at its pure colour) */
    /* HOW GENEROUS IS TOO GENEROUS. 240 let through clusters that are nothing
       like the ink: "b = 6" - five characters at 16px in a roomy chip, declared
       #5B2C46 on #F3E6EC, better than 8:1 - handed back #9E7D8F, a blend
       halfway to the plate, at a distance of 221, and the pass reported 3.01:1
       on text that is perfectly solid. The measured evidence separates the two
       cases cleanly: where a thin face genuinely renders light, the cluster is
       only tens away from its ink (the 11px theorem stamp, declared #0E7490,
       gave back #25819A - a distance of 46); where the sampler has found a
       blend rather than the glyphs, it is over two hundred. 150 sits between
       them with room on both sides. Past it, the row is not judged in pixels -
       it is asked again in computed colour, which is what this module has
       always promised for glyphs it cannot separate from their plate. */
    if (want && best > 150) return Object.assign({}, R, { skip: 'text pixels not distinguishable' });
    /* and a label with a painted mark inside it (see `painted` above) is judged
       in pixels only while the cluster really is its own ink */
    if (R.painted && want && best > 60) {
      return Object.assign({}, R, { skip: 'text pixels not distinguishable' });
    }
    /* THE PLATE HAS TO BE THE ELEMENT'S OWN GROUND. See the note on `bg` above:
       a navy button sampled as white paper is a sample of the wrong pixels, and
       every one of those came back at about 1.1:1 - the look of blank paper. */
    if (R.bg) {
      const d = Math.abs(plate.r - R.bg[0]) + Math.abs(plate.g - R.bg[1]) + Math.abs(plate.b - R.bg[2]);
      if (d > 90) return Object.assign({}, R, { skip: 'the plate is not this element\'s own ground: the sample is of other pixels' });
    }
    /* AND THERE HAS TO BE ENOUGH INK TO AVERAGE. A short string in a roomy box
       is mostly plate: "✓ Added to your jotter." is green on paper and reads
       perfectly, and the cluster the sampler called its text was a handful of
       antialiased edge pixels that averaged towards the paper - 1.16:1 on a
       line you can read across a table. Where the ink is under one and a half
       per cent of what was sampled, the mean is a rumour and the computed
       colour answers instead. Every fault this law has caught for real - a
       disabled button, a stamp in a tight oval, a bin label filling its box -
       carries far more ink than that. */
    if (buckets[coreI].n < total * 0.015) {
      return Object.assign({}, R, { skip: 'text pixels not distinguishable' });
    }
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
    /* A CARD STILL RISING IS A BLEND, NOT A COLOUR. This module has claimed in
       its own exemption list from the beginning that readability is measured
       only once the page's animations have stopped, and it has never once
       checked. "Added to your jotter." is a confirmation that FADES, and it was
       measured mid-fade at 1.16:1; the question prompt re-renders after a wrong
       attempt and was caught rising at 2.18:1, on text that is navy on paper.
       An element that is moving, or inside something moving, is not yet the
       thing a reader sees. The walk stands on the same screen again later. */
    try {
      if (typeof el.getAnimations === 'function') {
        const live = el.getAnimations({ subtree: true })
          .filter(a => a.playState === 'running' || a.playState === 'pending');
        if (live.length) return;
      }
      for (let anc = el; anc && anc !== document.documentElement; anc = anc.parentElement) {
        if (typeof anc.getAnimations !== 'function') break;
        if (anc.getAnimations().some(a => a.playState === 'running' || a.playState === 'pending')) return;
      }
    } catch (e) { /* a browser that cannot say is not a reason to condemn */ }
    /* TEXT SOMETHING ELSE IS SITTING ON TOP OF CANNOT BE MEASURED HERE. The
       crumb "Classes" scrolls under the fixed preview banner, and the picture
       at that spot is the banner - so the sampler compared a blue link against
       a blue bar and reported 1.12:1 on a link that is perfectly legible where
       you actually see it. Whether a bar covering content is itself a fault is
       a question for the geometry law, which owns overlap; what is certain is
       that this law cannot judge glyphs it cannot see. Asking the document what
       is really on top at that point is the only honest test, and it is the
       browser's own answer, not a guess. */
    /* AND ONLY THE PART OF IT THAT IS ACTUALLY PAINTED. A cell in the markbook's
       grid is clipped by the table's own scroller: its box runs off past the
       clip, and the sampler was averaging pixels from beyond the edge - which
       is how a 13.5px line in --pencil, better than 8:1 on white in the
       stylesheet, was reported at 3.4:1. The row is trimmed to what its
       clipping ancestors actually show; when almost nothing is left there is
       nothing to judge and it is skipped with a reason rather than guessed at. */
    let vx = r.left, vy = r.top, vr = r.right, vb = r.bottom;
    for (let anc = el.parentElement; anc && anc !== document.documentElement; anc = anc.parentElement) {
      const acs = getComputedStyle(anc);
      if (!/(auto|scroll|hidden|clip)/.test(acs.overflowX + ' ' + acs.overflowY)) continue;
      const ar = anc.getBoundingClientRect();
      vx = Math.max(vx, ar.left); vy = Math.max(vy, ar.top);
      vr = Math.min(vr, ar.right); vb = Math.min(vb, ar.bottom);
    }
    const vw = vr - vx, vh = vb - vy;
    /* A ROW IS TRIMMED, NOT THROWN AWAY. Dropping anything more than
       forty-five per cent clipped was my own over-tightening and it emptied
       whole screens: on a phone a question card sits inside a scroller, most
       rows are partly outside it, and the pass reported "no text to measure" on
       state after state - the F35a failure, reintroduced by the fix for it.
       The sample is already confined to the visible part, so being clipped is
       not a reason to refuse; being too small to sample is. */
    if (vw < 8 || vh < 6) return;
    try {
      const mid = document.elementFromPoint(
        Math.min(window.innerWidth - 1, Math.max(0, vx + vw / 2)),
        Math.min(window.innerHeight - 1, Math.max(0, vy + vh / 2)));
      if (mid && mid !== el && !el.contains(mid) && !mid.contains(el)) return;
    } catch (e) { /* a browser that will not answer is not a reason to condemn */ }
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
      x: vx + window.scrollX, y: vy + window.scrollY, w: vw, h: vh,
      px: px, weight: weight,
      /* the colour the browser resolved for these glyphs, used only to FIND them */
      rgb: (cs.color.match(/\d+/g) || ['0', '0', '0']).slice(0, 3).map(Number),
      /* AND THE GROUND THE ELEMENT PAINTS FOR ITSELF, when it paints one. A
         button with a navy background whose sample comes back as white paper
         has not been sampled at all - the pixels belong to something else. This
         is the only check that catches it when BOTH the text and the wrong
         plate are near-white, where a colour-distance test cannot: cream text
         reads as cream-on-white at 1.17:1 and looks, to the arithmetic, like a
         real fault. */
      /* DOES THIS LABEL CONTAIN A COLOURED MARK OF ITS OWN? The confidence
         buttons read "Confident" in navy and carry a green status dot beside
         the word. The sampler took the dot for the text and measured green on
         cream at 3.76:1 - a fair reading of a DOT, which is a mark and owes 3:1,
         and a nonsense reading of the label, which is navy on cream at better
         than 11:1. Where a label contains something painted, the pixels cannot
         be trusted to isolate its glyphs and the computed colour answers. */
      painted: (() => {
        const kids = el.querySelectorAll('*');
        for (let i = 0; i < kids.length; i++) {
          const kc = getComputedStyle(kids[i]);
          const m = (kc.backgroundColor || '').match(/\d+/g);
          if (m && m.length >= 3 && !(m.length > 3 && Number(m[3]) === 0)) return true;
          if (kc.backgroundImage && kc.backgroundImage !== 'none') return true;
        }
        return false;
      })(),
      bg: (() => { const m = (cs.backgroundColor || '').match(/\d+/g);
        if (!m || m.length < 3) return null;
        if (m.length > 3 && Number(m[3]) === 0) return null;
        return m.slice(0, 3).map(Number); })(),
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
