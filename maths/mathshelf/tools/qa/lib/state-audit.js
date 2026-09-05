/* copied from ks3-dt/tools/record-tutorial/lib/state-audit.js at 22d2224, 2026-08-29; adapter: SIG scope = [data-surface] roots + the surface/state pair in the signature, overlay list = .modal/.ink-control/.qr-modal/#gj-modal-root, FITS card list = [data-work], .card, .dock, .modal, .paper, .panel, .stat-board, .book-cover */
/* state-audit.js — THE AUDITS THAT ARE KEYED BY STATE, NOT BY CHUNK.
 *
 * WHY THIS FILE EXISTS, and it is the whole lesson of his second J2 L3 sit
 * (28 Aug 2026). Three of the eleven faults were sentences a pupil could not
 * read, and the harness that measures readability had been running, green, over
 * every one of them. It missed them for two structural reasons:
 *
 *   (1) it measured ONE STATE PER CHUNK — whatever the walker happened to be
 *       standing on when it first entered. The offer card is a LATER state of
 *       the mybot chunk, the "you have finished with their bot" line is a later
 *       state of chatswap, and the seal card is later still, so nothing ever
 *       looked at them; and
 *   (2) it rode ONE WALKER, and that walker crosses the Swap SOLO, so every
 *       paired-only screen was structurally invisible to the only walk carrying
 *       the law.
 *
 * So coverage moves from "a chunk was entered" to "a distinct screen was stood
 * on", and the module is shared by BOTH walkers and by the two-account rig
 * (DFM 144: one law, one measurement, more than one home; DFM 271: coverage is
 * derived from what exists, never enumerated by hand).
 *
 * Three questions live here. Each is asked of every state either walker or the
 * paired rig stands on:
 *   · SIG    — what makes this screen a DIFFERENT screen from the last one
 *   · STEPS  — is every rendered numbered list left-aligned (DFM 274, his
 *              ruling of 28 Aug 2026: "even though they're locked")
 *   · FITS   — does every rendered element stay inside its own card
 *
 * WHAT IS DELIBERATELY NOT MEASURED, declared here and printed by every caller
 * (DFM 204/213 — an exemption nobody prints reads as a pass):
 *   - anything not rendered (display:none / visibility:hidden / opacity < 0.05
 *     / a box smaller than 2x2px);
 *   - for FITS: absolutely- and fixed-positioned elements (a drag ghost is
 *     SUPPOSED to leave its card), and anything inside a container that owns
 *     its own horizontal overflow — a scroller's job is to hold wide content.
 */
'use strict';

const EXEMPTIONS = [
  'not rendered (display:none / visibility:hidden / opacity < 0.05 / smaller than 2x2px)',
  'fits-its-card: absolutely or fixed positioned elements — a drag ghost is meant to leave its card',
  'fits-its-card: anything inside a container whose own overflow-x is auto/scroll/hidden',
  'fits-its-card: an element whose parent already overflows is not reported twice — the outermost offender is',
  'readability is measured only once the page\'s own animations have stopped — a card still rising is a blend, not a colour',
  'while a modal or a badge pop is open, the OVERLAY is measured and the dimmed page behind it is not',
  'position:fixed and position:sticky chrome is taken out of the measuring picture — in a full-page capture it paints across the middle of the page, over content no pupil ever sees it cover'
];

/* ---- THE STATE SIGNATURE ------------------------------------------------
   A state is a screen a pupil can actually be looking at, and two screens are
   the same state when they carry the same furniture: the same set of class
   tokens on rendered elements, the same heading, and the same live controls.
   It deliberately does NOT hash prose — a chat log that grows by a line is the
   same screen, and a gate that treated it as a new one would measure the same
   card forty times and call it coverage. */
const SIG = `(() => {
  const vis = (e) => {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const hosts = Array.from(document.querySelectorAll('[data-surface]')).filter(vis);
  const host = hosts.length ? hosts : [document.body];
  const pops = Array.from(document.querySelectorAll('.modal, .ink-control, .qr-modal, #gj-modal-root > *')).filter(vis);
  const scope = pops.length ? pops : host;
  const bits = [];
  scope.forEach((root) => {
    root.querySelectorAll('*').forEach((e) => {
      if (typeof e.className !== 'string' || !e.className) return;
      if (!vis(e)) return;
      e.className.split(/\\s+/).forEach((t) => { if (t) bits.push(t); });
    });
    const h = root.querySelector('h1, h2, h3');
    if (h) bits.push('H:' + (h.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40));
    Array.from(root.querySelectorAll('button')).filter(vis)
      .forEach((b) => bits.push('B:' + (b.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24)));
  });
  /* ADAPTER (maths): the surface contract IS the state name, so it leads the
     signature — two states of one root that happen to share furniture are still
     two states, and a walker's sidecar can be read against the DOM contract. */
  Array.from(document.querySelectorAll('[data-surface]')).filter(vis).forEach((r) => {
    bits.push('S:' + r.getAttribute('data-surface') + ':' + (r.getAttribute('data-state') || ''));
  });
  const uniq = Array.from(new Set(bits)).sort().join('|');
  let h = 5381;
  for (let i = 0; i < uniq.length; i++) h = ((h * 33) ^ uniq.charCodeAt(i)) >>> 0;
  return h.toString(16) + ':' + bits.length;
})`;

/* ---- DFM 274 — A NUMBERED STEPS LIST IS LEFT-ALIGNED, EVERYWHERE ---------
   His words on the Swap's four-step list, rendered centred with every line
   ragged around its own middle: the fix applies everywhere, "even though
   they're locked. So you can implement those fixes as well."
   DERIVED, not listed: the question is asked of every rendered <ol>, so a
   numbered list on a screen nobody thought about is covered BY EXISTING. An
   <ol> is an ordered list whether its numbers come from a marker, a CSS
   counter or a span — all three are in this codebase, and the law is about the
   reading, not the mechanism. */
const STEPS_QUERY = `(() => {
  const out = [];
  const vis = (e) => {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  document.querySelectorAll('ol').forEach((ol) => {
    if (!vis(ol)) return;
    const items = Array.from(ol.children).filter((li) => li.tagName === 'LI' && vis(li));
    if (!items.length) return;
    const bad = [];
    const al = (e) => getComputedStyle(e).textAlign;
    const ok = (a) => a === 'left' || a === 'start';
    if (!ok(al(ol))) bad.push('ol=' + al(ol));
    items.forEach((li, i) => { if (!ok(al(li))) bad.push('li' + (i + 1) + '=' + al(li)); });
    if (!bad.length) return;
    out.push({
      sel: 'ol' + (ol.className ? '.' + String(ol.className).trim().split(/\\s+/).join('.') : ''),
      items: items.length,
      align: bad.slice(0, 4).join(' '),
      text: (items[0].textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60)
    });
  });
  return out;
})`;

/* ---- FITS ITS CARD -------------------------------------------------------
   His find, second sit: the extras job with two wide gap boxes and a take-back
   button pushed its row past the card's edge, so part of the program he was
   building was outside the thing it was drawn on. Nothing measured it, because
   "an element fits inside its card" had never been written down as a law
   (DFM 235: facts get gates; this one never got its own).
   The comparison is against the card's CONTENT box, because that is the space
   the card actually offers its contents. */
const FITS_QUERY = `(() => {
  /* ADAPTER (maths): the card set of this platform. KS3 DT had one class, .card;
     MathShelf's grounds are the light work surfaces, the dock, the modals, the
     paper and the panels of the markbook, plus a book cover on the shelf. */
  const CARDS = '[data-work], .card, .dock, .modal, .paper, .panel, .stat-board, .book-cover';
  const out = [];
  const vis = (e) => {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const ownsOverflow = (e) => /auto|scroll|hidden/.test(getComputedStyle(e).overflowX);
  const nameOf = (e) => e.tagName.toLowerCase() +
    (typeof e.className === 'string' && e.className.trim()
      ? '.' + e.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
  document.querySelectorAll(CARDS).forEach((card) => {
    if (!vis(card)) return;
    const cs = getComputedStyle(card);
    const cr = card.getBoundingClientRect();
    const left = cr.left + parseFloat(cs.borderLeftWidth || 0) + parseFloat(cs.paddingLeft || 0);
    const right = cr.right - parseFloat(cs.borderRightWidth || 0) - parseFloat(cs.paddingRight || 0);
    const offenders = [];
    card.querySelectorAll('*').forEach((e) => {
      if (!vis(e)) return;
      const st = getComputedStyle(e);
      if (st.position === 'fixed' || st.position === 'absolute') return;
      let p = e.parentElement, inScroller = false;
      while (p && p !== card) { if (ownsOverflow(p)) { inScroller = true; break; } p = p.parentElement; }
      if (inScroller) return;
      const r = e.getBoundingClientRect();
      const over = Math.max(left - r.left, r.right - right);
      if (over > 1.5) offenders.push({ el: e, over: over });
    });
    /* report the OUTERMOST offender only: when a row overflows, so does every
       word inside it, and a list of forty children is a listing nobody can act
       on (DFM 204's family) */
    offenders.forEach((o) => {
      if (offenders.some((p) => p !== o && p.el.contains(o.el))) return;
      out.push({
        card: nameOf(card),
        sel: nameOf(o.el),
        over: Math.round(o.over),
        text: (o.el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60)
      });
    });
  });
  return out;
})`;

/* ---- MEASURE A STILL SCREEN, NEVER A MOVING ONE -------------------------
   The first run of the state-keyed audit condemned three perfectly legible
   lines whose "ink" it had sampled as the parchment behind them — because a
   card that is still animating in is drawn at a fraction of its own opacity,
   and a screenshot taken mid-rise is a picture of a blend. A gate that invents
   faults is worse than no gate (DFM 146a), so every caller waits for the page's
   own animations to finish before it looks. It returns how many are still
   running, so a caller can cap the wait rather than hang on a looping one. */
const RUNNING = `(() => {
  try {
    return (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.playState === 'running').length;
  } catch (e) { return 0; }
})`;

/* ---- MEASURE WHAT IS IN FRONT, NOT WHAT IS BEHIND A SCRIM -------------
   The second thing the first run got wrong. When a help modal or a badge pop is
   open, the page BEHIND it is dimmed by a scrim — so a screenshot shows the gold
   RUN button at #3e3a3c on #34333c, and the audit condemned a perfectly legible
   control for wearing a colour it does not wear. What is on screen at that
   moment is the OVERLAY, so that is what gets measured: the same law, pointed
   at the thing the pupil is actually looking at. */
const OVERLAY = `(() => {
  const vis = (e) => {
    if (!e) return false;
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    const r = e.getBoundingClientRect();
    return r.width > 40 && r.height > 40;
  };
  /* DERIVED, NOT LISTED (DFM 271). The first version named five overlay classes
     and a sixth one dimmed the page anyway: the audit then measured gold-on-navy
     as #3e3a3c on #34333c and condemned a button nobody has ever failed to read.
     A scrim is not a class name, it is a SHAPE — something fixed, opaque enough
     to paint over, covering most of the viewport — so that is what is looked
     for, and a scrim written next year is caught by existing. */
  let best = null, bestZ = -1;
  document.querySelectorAll('body *').forEach((e) => {
    const s = getComputedStyle(e);
    if (s.position !== 'fixed' || !vis(e)) return;
    const r = e.getBoundingClientRect();
    if (r.width < window.innerWidth * 0.8 || r.height < window.innerHeight * 0.8) return;
    const bg = s.backgroundColor || '';
    const a = /rgba?\(([^)]+)\)/.exec(bg);
    const alpha = a ? (Number(String(a[1]).split(',')[3]) || (String(a[1]).split(',').length < 4 ? 1 : 0)) : 0;
    if (alpha < 0.15) return;                 /* a transparent full-screen layer paints nothing */
    const z = Number(s.zIndex) || 0;
    if (z >= bestZ) { bestZ = z; best = e; }
  });
  if (!best) return null;
  /* hand back a selector the collector can find it with again */
  const cls = (typeof best.className === 'string' ? best.className.trim().split(/\s+/) : []).filter(Boolean);
  for (let i = cls.length; i > 0; i--) {
    const sel = '.' + cls.slice(0, i).join('.');
    try { if (document.querySelector(sel) === best) return sel; } catch (e) {}
  }
  if (best.id) return '#' + best.id;
  return null;
})`;

/* ---- AND THE FIXED CHROME COMES OUT OF THE PICTURE ---------------------
   The third thing the first runs got wrong, and it was the sneakiest. The
   readability audit measures glyph pixels off a FULL-PAGE screenshot, against
   rects in DOCUMENT coordinates — but a `position: fixed` bar paints at its
   VIEWPORT position inside that stitched image, which on a long card lands it
   straight across the middle of the page. Everything behind that band was then
   sampled through it: "Put this line back" came back at 1.04:1, ink #4b4644 on
   #484342, and the same three sentences failed on every single run with
   identical numbers. Nothing was wrong with the page; the picture was wrong.
   No pupil ever sees the top bar over the middle of a card — it is fixed to the
   top of what she is looking at — so it comes out of the picture for the
   duration of the measurement and goes straight back. An overlay that IS the
   thing being measured stays. */
const HIDE_FIXED = `((keepSel) => {
  const keep = keepSel ? document.querySelector(keepSel) : null;
  const hidden = [];
  document.querySelectorAll('body *').forEach((e) => {
    /* STICKY COUNTS TOO, and it was the one that actually did the damage: the
       shell's top bar is position:sticky, so in a full-page capture it paints
       across the middle of a long card exactly as a fixed one would. Naming
       fixed alone was the same enumeration mistake this file exists to stop. */
    const pos = getComputedStyle(e).position;
    if (pos !== 'fixed' && pos !== 'sticky') return;
    if (keep && (e === keep || keep.contains(e) || e.contains(keep))) return;
    hidden.push([e, e.style.visibility]);
    e.style.visibility = 'hidden';
  });
  window.__olsHiddenFixed = hidden;
  return hidden.length;
})`;
const SHOW_FIXED = `(() => {
  (window.__olsHiddenFixed || []).forEach((p) => { p[0].style.visibility = p[1] || ''; });
  window.__olsHiddenFixed = null;
})`;

/* take the measuring picture with the chrome out of it, and put it back
   whatever happens — a harness that leaves a page half-hidden would poison
   every screen after it */
async function measureShot(page, keepSel) {
  let hid = 0;
  try { hid = await page.evaluate(([q, k]) => eval(q)(k), [HIDE_FIXED, keepSel || null]); } catch (e) {}
  try {
    return await page.screenshot({ fullPage: true });
  } finally {
    if (hid) { try { await page.evaluate(q => eval(q)(), SHOW_FIXED); } catch (e) {} }
  }
}

async function overlayRoot(page) {
  try { return await page.evaluate(q => eval(q)(), OVERLAY); } catch (e) { return null; }
}

async function settle(page, tries) {
  /* AND IT HAS TO WAIT FOR THE ANIMATION TO START, NOT ONLY TO FINISH. Asking
     `getAnimations()` the instant a card is appended answers "nothing is
     running" — the browser has not registered the `rise` keyframes yet — so the
     screenshot landed 120 ms into a 300 ms fade, with the plate still part
     transparent over the dark shell. That is where "ink #17223b on #514a47"
     came from: real ink, an unfinished plate. A fifth of a second first, then
     wait it out. */
  await new Promise(r => setTimeout(r, 220));
  for (let i = 0; i < (tries || 14); i++) {
    let n = 0;
    try { n = await page.evaluate(q => eval(q)(), RUNNING); } catch (e) { return; }
    if (!n) { await new Promise(r => setTimeout(r, 140)); return; }
    await new Promise(r => setTimeout(r, 150));
  }
}

const describeSteps = (f) => f.sel + ' (' + f.items + ' items) computed ' + f.align + '  "' + f.text + '"';
const describeFits = (f) => f.sel + ' overflows ' + f.card + ' by ' + f.over + 'px  "' + f.text + '"';

module.exports = { SIG, STEPS_QUERY, FITS_QUERY, RUNNING, OVERLAY, overlayRoot, measureShot, settle, describeSteps, describeFits, EXEMPTIONS };
