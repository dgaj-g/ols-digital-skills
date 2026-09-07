/* audits.js — THE CHECKS THAT RIDE EVERY WALK.
 *
 * DFM 271, and the whole reason coverage is derived rather than listed: a law
 * asked of "the surfaces on a list" is only ever asked of the surfaces somebody
 * remembered. These are asked of every state either walker stands on, whatever
 * that state is, so a screen written next year is covered BY EXISTING.
 *
 * Each audit returns PASS or a list of findings. The walker records the verdict
 * into its sidecar under (surface, state, width), and qa-coverage reads those
 * sidecars back: a state the walker stood on with no verdict for an audit is a
 * cell nothing closed, and it fails by name.
 *
 * WHAT IS DELIBERATELY NOT MEASURED is declared by each borrowed module and
 * printed by the caller (DFM 213).
 */
'use strict';
const empty = require('./empty-elements.js');
const nested = require('./nested-interactive.js');
const stateAudit = require('./state-audit.js');
const placed = require('./placed-work.js');
const contrast = require('./contrast-audit.js');

/* the colour law, in computed pixels, over the whole rendered screen */
const COLOUR_LAW = `(() => {
  const MARK = ['rgb(200, 16, 46)', 'rgb(31, 122, 51)', 'rgb(176, 125, 16)'];   /* red, green, amber */
  const GOLD = ['rgb(228, 184, 36)', 'rgb(255, 216, 77)'];
  const SENTINEL = 'rgb(181, 0, 200)';
  const out = [];
  const seen = (el, prop, v) => {
    if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') return null;
    const m = /rgba?\\([^)]+\\)/.exec(v);
    return m ? m[0].replace(/rgba\\(([^,]+, [^,]+, [^,]+), [\\d.]+\\)/, 'rgb($1)') : null;
  };
  const name = (el) => el.tagName.toLowerCase() +
    (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    /* A COLOUR THAT PAINTS NOTHING IS NOT A COLOUR. The colour property on an
       element with no text of its own paints no glyph - the expand grid's empty
       product cells inherit a colour and draw nothing with it - so judging them
       was the gate inventing a fault (L6). Backgrounds, borders, fills and
       strokes are judged wherever they are, because those DO paint. */
    const ownText = [...el.childNodes].filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).join('').trim();
    ['color', 'backgroundColor', 'borderTopColor', 'fill', 'stroke'].forEach((prop) => {
      if (prop === 'color' && !ownText) return;
      const c = seen(el, prop, cs[prop]);
      if (!c) return;
      if (c === SENTINEL) out.push({ law: 'sentinel', sel: name(el), prop, colour: c });
      if (MARK.indexOf(c) >= 0 && !el.closest('[data-mark]')) {
        out.push({ law: 'marking-colour-outside-a-mark', sel: name(el), prop, colour: c });
      }
      /* GOLD IS PRESTIGE, NEVER A STATUS AND NEVER A MARK. The first cut of
         this law said "gold only inside [data-ornament] or [data-celebrate]",
         and on the first walk it condemned the wordmark's own second half, the
         focus ring and the primary button - chrome that is gold BY DESIGN and
         says nothing about anybody's work. What the law is actually for is
         stopping gold from meaning something: so gold is a fault when it lands
         on a reading surface, on a mark, or on a value. */
      if (GOLD.indexOf(c) >= 0) {
        const onWork = el.closest('[data-work]');
        const onMark = el.closest('[data-mark]');
        const text = (el.textContent || '').trim();
        const isValue = /^[-+]?[\d.,%\/]+$/.test(text) && text.length > 0;
        const allowed = el.closest('[data-ornament], [data-celebrate]');
        if (!allowed && (onWork || onMark)) {
          out.push({ law: 'gold-on-a-reading-surface-or-a-mark', sel: name(el), prop, colour: c });
        } else if (!allowed && isValue && prop === 'color') {
          out.push({ law: 'gold-used-as-a-value', sel: name(el), prop, colour: c, text: text.slice(0, 20) });
        }
      }
    });
  });
  /* every light work surface is light, whatever the shell does */
  const lum = (rgb) => {
    const m = (rgb.match(/\\d+/g) || []).slice(0, 3).map(Number);
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(m[0] || 0) + 0.7152 * f(m[1] || 0) + 0.0722 * f(m[2] || 0);
  };
  const ground = (el) => {
    let p = el;
    while (p && p !== document.documentElement) {
      const bg = getComputedStyle(p).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      p = p.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  document.querySelectorAll('[data-work]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const L = lum(ground(el));
    if (L < 0.85) out.push({ law: 'work-surface-not-light', sel: name(el), colour: ground(el), lum: Math.round(L * 100) / 100 });
  });
  return out;
})`;

/* a control that will not act says why, beside itself */
const MUTE_LOCKS = `(() => {
  const out = [];
  document.querySelectorAll('button, [role=button], input, select, textarea').forEach((el) => {
    const off = el.disabled || el.getAttribute('aria-disabled') === 'true';
    if (!off) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (el.getAttribute('data-locked-why')) return;
    const by = el.getAttribute('aria-describedby');
    if (by && document.getElementById(by) && (document.getElementById(by).textContent || '').trim()) return;
    /* or a visible sentence within 60px of it */
    let near = false;
    document.querySelectorAll('p, span, div').forEach((t) => {
      if (near || !t.textContent || t.textContent.trim().length < 6) return;
      const tr = t.getBoundingClientRect();
      if (tr.width < 2) return;
      const dx = Math.max(0, Math.max(r.left - tr.right, tr.left - r.right));
      const dy = Math.max(0, Math.max(r.top - tr.bottom, tr.top - r.bottom));
      if (dx <= 60 && dy <= 60) near = true;
    });
    if (!near) out.push({ sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(/\\s+/)[0] : ''), text: (el.textContent || '').trim().slice(0, 40) });
  });
  return out;
})`;

/* the consequence laws that can be read off the DOM without moving anything */
const CONSEQUENCE = `(() => {
  const out = [];
  document.querySelectorAll('[data-surface="question"], .jotter-q').forEach((root) => {
    const state = root.getAttribute('data-state') || '';
    /* help-strip counts as after: the method help is only ever offered once
       she has been wrong twice, so a question showing it has already locked.
       Naming the states that count as "after" is what broke when the question
       gained that state, so the list is written once, here, beside the law. */
    const locked = /checked-wrong-2|locked|checked-right|amber|help-strip/.test(state);
    /* the truth is never on the page before the question locks */
    if (!locked && root.querySelector('[data-truth]')) {
      out.push({ law: 'truth-before-lock', qid: root.getAttribute('data-qid') });
    }
    /* no option is pressed for her at mount */
    if (/fresh/.test(state)) {
      root.querySelectorAll('[data-tray] [aria-pressed="true"], .chip[aria-pressed="true"]').forEach(() => {
        out.push({ law: 'option-pressed-at-mount', qid: root.getAttribute('data-qid') });
      });
    }
    /* EVERY OPTION LOOKS THE SAME - UNTIL SHE HAS ANSWERED. Colour must never
       hint at which option is right while she is choosing. After Check it must
       do the opposite: show her which one she chose and how it was marked.
       The first cut asked the question in every state and condemned the
       feedback itself. */
    /* asked ONLY while she is still choosing. Listing the states that count as
       "after" was fragile - the day the question gained a "help-strip" state
       the rule started condemning the marking feedback again, which is the
       exact over-tightening this comment already records. The rule is asked in
       the states where she has not answered yet, and nowhere else. */
    if (!/^(fresh|mid-attempt|resume-mid)$/.test(state)) return;
    root.querySelectorAll('[data-tray], .jq-options, .classify-row').forEach((tray) => {
      /* LIKE WITH LIKE. An option group's OPTIONS must look the same as each
         other; the punctuation and labels sitting among them are not options
         and were never meant to match. */
      const all = [...tray.children].filter(c => c.getBoundingClientRect().width > 2);
      const items = all.filter(c => c.matches('[data-tray-item], .tile, .chip, button, [role=button], label'));
      /* THE ONE SHE HAS PICKED IS ALLOWED TO LOOK PICKED. The rule forbids
         colour that hints which option is RIGHT; it was reading any colour
         difference at all, and the moment the walk began standing on the
         working board it condemned the filled tile that says "this is the one
         you chose" - which she must be able to see, and which follows her
         choice whether it is right or wrong (proved by driving the same
         question wrong: the fill moved to the wrong tile). So the comparison
         is made among options in the SAME pressed state. That is only possible
         because the option now says which state it is in - aria-pressed - and
         it only got that because this rule fired here. A screen reader was
         being told nothing at all. */
      const groups = new Map();
      items.forEach((c) => {
        const key = c.getAttribute('aria-pressed') || c.getAttribute('aria-checked') || 'none';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(c);
      });
      groups.forEach((group) => {
        const colours = new Set(group.map(c => getComputedStyle(c).backgroundColor + '|' + getComputedStyle(c).borderTopColor));
        if (group.length > 1 && colours.size > 1) {
          out.push({ law: 'options-do-not-look-alike', qid: root.getAttribute('data-qid'), n: colours.size });
        }
      });
    });
  });
  return out;
})`;

/* every round trip owns its waiting state, in the same tick as the press */
const BUSY_CONTRACT = `(() => {
  const out = [];
  document.querySelectorAll('[data-busy-for]').forEach((el) => {
    if (!el.getAttribute('data-busy-for').trim()) out.push({ sel: el.className, why: 'empty data-busy-for' });
  });
  return out;
})`;

/* KEEP ONE OF EACH KIND, NOT THE FIRST SIX. Trimming a state's findings to the
   first six hid whole classes of fault behind six of another: a planted dark
   work surface was invisible because six marking-colour findings came first in
   the same list. Findings are grouped by their own law and up to three of each
   are kept, with the rest counted, so nothing disappears in silence. */
function trim(list) {
  const byLaw = new Map();
  list.forEach((f) => {
    const k = String((f && (f.law || f.kind)) || 'finding');
    if (!byLaw.has(k)) byLaw.set(k, []);
    byLaw.get(k).push(f);
  });
  const out = [];
  byLaw.forEach((v, k) => {
    out.push(...v.slice(0, 3));
    if (v.length > 3) out.push({ law: k, more: v.length - 3, sel: '(and ' + (v.length - 3) + ' more of the same)' });
  });
  return out;
}

/* ── THE OVERLAP LAW ────────────────────────────────────────────────────────
   Two pieces of text may not sit on top of one another. There was no rule for
   this at all until 6 Sept 2026, when he opened the shelf and found "LETTERS &
   BALANCE" running underneath the KS3 chip on its own book cover (F37): the chip
   was position:absolute, so it occupied no space, and the series line ran clean
   through it. Nothing measured geometry BETWEEN elements - qa-surfaces asks
   whether a thing stays inside its card, never whether it lands on its
   neighbour.

   WHAT IS DELIBERATELY NOT A COLLISION, because a gate that calls these faults
   is a gate nobody can keep green:
     - a parent and its own child (the parent's box contains the child by
       definition);
     - anything inside [data-ornament] - decoration is allowed to sit under text
       and frequently should;
     - a dialog and the page it covers - covering the page is what a modal is
       for; the pair is only judged when both are inside the same dialog, or
       both outside every dialog;
     - hidden, aria-hidden, and boxes under 3px of overlap in either direction,
       which is a rounding artefact and not a reader's problem. */
const OVERLAP = `(() => {
  const own = (el) => Array.from(el.childNodes).filter(n => n.nodeType === 3)
    .map(n => n.textContent.trim()).join(' ').trim();
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
    /* the preview banner is the HARNESS telling him this is not the school copy;
       it is not part of the product and is not on the deployed page at all */
    if (el.closest('[hidden], [aria-hidden="true"], [data-ornament], .gj-preview-banner')) return false;
    /* THE INSIDE OF A DRAWING IS THE DRAWING'S BUSINESS. A protractor's scale
       numbers sit on a curve and their boxes touch by a few pixels all the way
       round; so do the labels on an angle figure. That is a picture being a
       picture, not two interface elements landing on each other, and every one
       of the 208 findings this law produced on its first full walk was a
       protractor. Figures are judged by the geometry audit and the colour law,
       which know what they are looking at. */
    if (el.ownerSVGElement || el.closest('svg')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const nameOf = (el) => el.tagName.toLowerCase() +
    (typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  const items = [];
  document.querySelectorAll('body *').forEach((el) => {
    const t = own(el);
    if (!t || !/[a-z0-9]/i.test(t)) return;
    if (!vis(el)) return;
    const r = el.getBoundingClientRect();
    /* WHICH LAYER IS THIS ON. A modal, a dialog, or any fixed panel that covers
       the viewport is a layer of its own: it is MEANT to sit over the page, and
       comparing what is on it with what is under it condemns every overlay the
       platform has. The starter board is exactly that - position:fixed, inset:0
       - and it produced eight collisions with the markbook behind it. */
    let layer = el.closest('[role="dialog"], [role="alertdialog"], dialog');
    if (!layer) {
      let n = el;
      while (n && n.nodeType === 1) {
        const cs = getComputedStyle(n);
        /* A PINNED BAR IS A LAYER TOO. A sticky contents strip or a fixed action
           bar is MEANT to sit over what scrolls beneath it; comparing the two
           reports the scroll position, not a fault. Either a full-viewport
           overlay, or anything pinned. */
        if (cs.position === 'sticky' || cs.position === 'fixed') { layer = n; break; }
        if (cs.position === 'absolute') {
          const nr = n.getBoundingClientRect();
          if (nr.width >= window.innerWidth * 0.8 && nr.height >= window.innerHeight * 0.8) { layer = n; break; }
        }
        n = n.parentElement;
      }
    }
    /* THE LINES IT ACTUALLY OCCUPIES, NOT THE BOX AROUND THEM. An inline
       element that wraps has a bounding rect which is the UNION of its line
       boxes - a tall rectangle spanning the full column - so two spans of one
       wrapped sentence appear to overlap almost completely while nothing on
       screen touches anything. That is where "Same wrong line: c = 117 / c =
       117 overlap by 203x16px" came from, on a slips board that is perfectly
       laid out when you look at it. getClientRects() gives the boxes the text
       is really in, one per line. */
    const lines = (typeof el.getClientRects === 'function' ? Array.from(el.getClientRects()) : []).filter(q => q.width > 1 && q.height > 1);
    items.push({ el: el, t: t, r: r, rects: lines.length ? lines : [r], dlg: layer });
  });
  const out = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.dlg !== b.dlg) continue;
      /* the worst real collision between any line of A and any line of B */
      let ox = 0, oy = 0, best = 0;
      a.rects.forEach((ra) => b.rects.forEach((rb) => {
        const px = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const py = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (px > 2 && py > 2 && px * py > best) { best = px * py; ox = px; oy = py; }
      }));
      if (ox < 3 || oy < 3) continue;
      /* TWO INLINE NEIGHBOURS IN ONE PARAGRAPH ARE NOT A COLLISION. An inline
         box is as tall as its line, so two spans on neighbouring lines of the
         same wrapped sentence overlap by a few pixels of leading every time -
         and a gate that calls that a fault condemns every sentence with a bold
         word in it. Inline siblings sharing a parent are judged only if one
         genuinely sits ON the other: a third of the smaller box, not an edge. */
      const inlineA = /^inline/.test(getComputedStyle(a.el).display);
      const inlineB = /^inline/.test(getComputedStyle(b.el).display);
      const area = ox * oy;
      const smallLine = Math.min(
        Math.min.apply(null, a.rects.map(q => q.width * q.height)),
        Math.min.apply(null, b.rects.map(q => q.width * q.height))) || 1;
      if (inlineA && inlineB && area / smallLine < 0.34) continue;
      /* A FINDING WITH NOTHING IN IT IS NOT A FINDING. One of these came out as
         "overlap by undefined - undefined and undefined" and told nobody
         anything; every field is now filled or the pair is dropped. */
      const one = nameOf(a.el), two = nameOf(b.el);
      if (!one || !two || !isFinite(ox) || !isFinite(oy)) continue;
      out.push({ collision: true, one: one, two: two,
        by: Math.round(ox) + 'x' + Math.round(oy) + 'px',
        text: (a.t || '').slice(0, 30) + '  /  ' + (b.t || '').slice(0, 30) });
    }
  }
  return out;
})`;

/* ── THE SAME SENTENCE, ONCE ────────────────────────────────────────────────
   A screen may not say the same thing twice. He found "Now work it out, then
   write the value:" sitting directly above "Now work it out, then enter the
   value:" - one instruction, printed twice, in two wordings, one of them
   nowhere near the box it was about (F39). Nothing measured it: qa-language
   reads each string on its own and every string was fine; the walkers checked
   the state stamps and the state was correct.

   WHAT IS NOT A REPEAT, because a gate that calls these faults is unusable:
     - short labels and numbers - a keypad has ten of them, a grid has hundreds;
       only sentences are judged, and a sentence here is 18 characters or more;
     - a heading repeated as its own breadcrumb, or any pair where one is inside
       the other;
     - anything inside a drawing, an ornament, or a hidden subtree. */
const SAME_TWICE = `(() => {
  const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\\s+/g, ' ').trim();
  const own = (el) => Array.from(el.childNodes).filter(n => n.nodeType === 3)
    .map(n => n.textContent.trim()).join(' ').trim();
  /* ONE QUESTION AT A TIME. A contents page lists every question in the book,
     and twelve substitution questions each carry their own "Choose each letter
     below to put its number in." - twelve legitimate copies of one sentence,
     one per question. Comparing across a whole page called all twelve a fault
     (404 findings on the first walk). The fault he found was one QUESTION
     saying the same thing twice, so that is the box the comparison lives in. */
  const boxOf = (el) => el.closest('[data-qid], [data-book], .book, li') || el.closest('[data-surface]') || document.body;
  const seen = new Map();
  const out = [];
  let looked = 0;
  /* INSTRUCTIONS ONLY, AND THE APP SAYS WHICH THOSE ARE. Judging every sentence
     on the page condemned an exercise heading beside its own navigation chip,
     a self-evaluation list, and two books' shelf marks - three inventions in
     three passes. the ui-msg class is this platform's own class for "a sentence
     telling her what to do", and both halves of the fault he found wore it. An
     instruction may not be given twice; a heading echoed by the chip that
     scrolls to it is not a fault, it is a signpost. */
  document.querySelectorAll('.ui-msg').forEach((el) => {
    if (el.closest('[hidden], [aria-hidden="true"], [data-ornament], .gj-preview-banner')) return;
    if (el.ownerSVGElement || el.closest('svg')) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return;
    const t = own(el);
    /* a SENTENCE, not a label. "Ex. M2-02 . CCEA M2" and "Ex. M2-01 . CCEA M2"
       are one character apart and are two different books' shelf marks. */
    if (t.length < 25) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const k = norm(t);
    if (!k || k.split(' ').length < 5) return;
    /* IDENTICAL, OR ONE WORD APART. A first-words fingerprint was too blunt: a
       self-evaluation list where every line opens "I can use angles in ..."
       read as ten repeats of one sentence, which is a gate inventing a fault.
       What a reworded instruction actually looks like is two sentences of the
       same length differing in a single word - "then WRITE the value" against
       "then ENTER the value". Two words apart is a list; one word apart is the
       same sentence twice. */
    const box = boxOf(el);
    if (!seen.has(box)) seen.set(box, []);
    const inBox = seen.get(box);
    const words = k.split(' ');
    let hit = null;
    for (const prior of inBox) {
      if (prior.el.contains(el) || el.contains(prior.el)) continue;
      if (prior.words.length !== words.length) continue;
      let diff = 0;
      for (let i = 0; i < words.length && diff < 2; i++) if (words[i] !== prior.words[i]) diff++;
      if (diff < 2) { hit = prior; break; }
    }
    looked++;
    if (hit) out.push({ twice: true, text: t.slice(0, 60), also: own(hit.el).slice(0, 60) });
    else inBox.push({ el: el, words: words });
  });
  /* HOW MANY IT LOOKED AT, NOT JUST WHAT IT FOUND. A screen with no
     instruction on it - the shelf, the cover - is not a fault, so this is a
     PASS. But a law that measures nothing on EVERY screen is asleep, and that
     is exactly how the readability audit slept through the fault it was
     written for (F35a). The count travels with the verdict so the walk can
     settle up at the end and say whether the law was ever awake. */
  return { findings: out, measured: looked };
})`;

async function run(page, opts) {
  opts = opts || {};
  const verdicts = {};
  const findings = {};
  const measured = {};
  async function q(name, src) {
    try {
      const r = await page.evaluate(s => eval(s)(), src);
      const list = Array.isArray(r) ? r : (r && r.findings) || [];
      if (r && typeof r.measured === 'number') measured[name] = r.measured;
      verdicts[name] = list.length ? 'FAIL' : 'PASS';
      if (list.length) findings[name] = trim(list);
    } catch (e) {
      /* A DETACHED FRAME IS NOT A FAULT IN THE PAGE. It means the walker asked
         while the page was navigating under it. Asked once more, on the page
         that is actually there, it is a real answer either way — and a gate
         that reported the race as a finding would be reporting its own timing. */
      if (/detached Frame|Execution context was destroyed/i.test(String(e && e.message))) {
        try {
          await new Promise(r => setTimeout(r, 300));
          const r2 = await page.evaluate(s2 => eval(s2)(), src);
          const list2 = Array.isArray(r2) ? r2 : (r2 && r2.findings) || [];
          if (r2 && typeof r2.measured === 'number') measured[name] = r2.measured;
          verdicts[name] = list2.length ? 'FAIL' : 'PASS';
          if (list2.length) findings[name] = trim(list2);
          return;
        } catch (e2) { /* fall through to the crash below */ }
      }
      verdicts[name] = 'CRASH';
      findings[name] = [{ error: String(e && e.message || e) }];
    }
  }
  await q('empty', empty.QUERY);
  await q('nested', nested.QUERY);
  await q('geometry', stateAudit.FITS_QUERY);
  await q('steps', stateAudit.STEPS_QUERY);
  await q('colour', COLOUR_LAW);
  await q('mute-locks', MUTE_LOCKS);
  await q('consequence', CONSEQUENCE);
  await q('waits', BUSY_CONTRACT);
  await q('overlap', OVERLAP);
  await q('said-twice', SAME_TWICE);
  if (opts.clickSafety) await q('click-safety', placed.QUERY);
  /* READABILITY IS NOT OPTIONAL, AND THAT IS THE WHOLE POINT (F35).
     It used to be a separate call "the caller decides how often it is worth
     taking one" - and no caller ever decided. The module sat in lib/ from 28
     August, written for exactly the fault it then failed to catch, while three
     walkers listed `readability` among the cells they covered and none of them
     ever invoked it. A law you have to remember to run is not a law. It costs
     one screenshot per state; that is the price of knowing the screen can be
     read, and it is cheap. */
  if (opts.readability !== false) {
    const rd = await readability(page);
    verdicts.readability = rd.verdict;
    if (typeof rd.measured === 'number') measured.readability = rd.measured;
    if (rd.findings && rd.findings.length) findings.readability = rd.findings;
  }
  return { verdicts, findings, measured };
}

/* the words a contrast finding is reported in - the ratio it got, the floor it
   owed, and the colours, because "1.04:1" is the fault and "white on white" is
   the reason */
/* the words a repeat is reported in */
function describeSaidTwice(f) {
  if (f && f.error) return 'the said-twice pass crashed: ' + f.error;
  return 'the screen says the same thing twice — "' + f.text + '" and "' + f.also + '"';
}

/* the words a collision is reported in */
function describeOverlap(f) {
  if (f && f.error) return 'the overlap pass crashed: ' + f.error;
  return 'two pieces of text sit on top of one another by ' + f.by + ' — ' +
    f.one + ' and ' + f.two + '  ["' + String(f.text || '') + '"]';
}

function describeContrast(f) {
  if (f && f.error) return 'the readability pass crashed: ' + f.error;
  if (f && f.indistinguishable) {
    return '"' + String(f.text || f.sel || '').trim().slice(0, 40) +
      '" cannot be told apart from the surface behind it — the sampler could not separate one glyph pixel from the plate, and neither can a reader';
  }
  const got = (f.ratio == null) ? '?' : (Math.round(f.ratio * 100) / 100);
  const floor = contrast.floorFor(f);
  const what = (f.text || '').trim().slice(0, 40) || f.sel || 'a piece of text';
  /* WHERE IT IS, NOT JUST WHAT IT SAYS. "Angles is 1.03:1" cost an hour of
     arguing with a number: there are several Angles on that screen and the
     message named none of them. The selector and the box are the difference
     between a finding you can check and a finding you can only believe. */
  const where = (f.sel ? '  <' + f.sel + '>' : '') +
    (f.rect ? ' at ' + Math.round(f.rect.x) + ',' + Math.round(f.rect.y) +
      ' ' + Math.round(f.rect.w) + 'x' + Math.round(f.rect.h) : '');
  return '"' + what + '" is ' + got + ':1 against what is actually behind it, and owes ' +
    floor + ':1' + (f.icon ? ' (a mark, judged at the non-text floor)' : f.large ? ' (large text)' : '') +
    ' — ' + (f.via ? f.via : 'measured in rendered pixels, not in the stylesheet') + where;
}

/* the readability audit needs a picture, so it is its own call: the caller
   decides how often it is worth taking one */
async function readability(page) {
  try {
    /* THE ROOT IS THE SURFACE SHE IS LOOKING AT (F35a). This asked for
       '[data-surface]', and querySelector hands back the FIRST one in the
       document - #scr-cover, which is `hidden` on every screen but the cover.
       So the audit collected nothing, and "nothing" went through the filter
       below as a clean pass. It measured zero elements on every state of every
       walk and reported PASS on all of them, including a table of white text on
       a white ground. The root is now the visible surface, and body is the
       fallback rather than the first hidden div. */
    const recollect = () => page.evaluate((s) => {
      const vis = (e) => {
        if (!e || e.hidden) return false;
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        const r = e.getBoundingClientRect();
        return r.width > 8 && r.height > 8;
      };
      const on = Array.from(document.querySelectorAll('[data-surface]')).filter(vis);
      /* AND IF SOMETHING IS COVERING THE WHOLE SCREEN, THAT IS THE SCREEN. The
         starter board is position:fixed across the viewport: the surface behind
         it is still the last [data-surface], so the audit rooted on a page that
         is entirely hidden, found every one of its rows covered, and reported
         "no text to measure" - which, with the occlusion rule above now working,
         is the honest consequence of asking the wrong question. This law already
         said in its own exemptions that while an overlay is open the OVERLAY is
         measured and the page behind it is not; this is where that sentence
         becomes code. */
      /* ANY element, not a list of the ones we thought of. The starter board is
         a plain `.starter-overlay` - position:fixed, inset:0, no role, no
         data-surface - so a selector list missed it and the audit went on
         measuring the page underneath, which is entirely covered. Ask the
         document what is on top, not a list of the names we remembered. */
      const covering = Array.from(document.body.getElementsByTagName('*'))
        .filter(vis)
        .filter((e) => {
          /* FIXED ONLY, AND IT HAS TO HAVE WORDS ON IT. Allowing `absolute` and
             scanning every element found, at 1280x720, ordinary page-height
             wrappers that cover the viewport without being overlays at all -
             and rooting on one of those measured nothing on twenty states. An
             overlay is pinned to the viewport and has something written on it;
             anything else is just a big box. */
          const cs = getComputedStyle(e);
          if (cs.position !== 'fixed') return false;
          if (!(e.textContent || '').trim()) return false;
          const r = e.getBoundingClientRect();
          return r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9;
        });
      /* AND OTHERWISE THE WHOLE PAGE, NOT THE LAST SURFACE IN IT. Rooting on the
         last [data-surface] in document order picks whichever screen the app
         happens to declare last - on a phone that is the DOCK, a strip at the
         bottom of a 2687px page - so on every question state the audit measured
         thirteen rows of tray, none of them on screen, and reported "no text to
         measure". That is F35a again in a different hat: the root chosen by
         document order rather than by what she is looking at. There is no need
         to choose at all. Every row is already skipped if it is hidden, covered
         by something else, or clipped away to nothing, so the page itself is
         the honest root and it measures more, not less. */
      window.__mzRoot = covering.length ? covering[covering.length - 1] : document.body;
      window.__mzRoot.setAttribute('data-mz-root', '1');
      /* THE SCROLL IS READ IN THE SAME TICK AS THE RECTS. Reading it afterwards
         was a race: on question:checked-wrong-1 the app scrolls to bring the
         verdict into view, and a scroll still in flight meant the rows were
         measured at one offset and the picture taken at another - so every row
         on the screen came back at about 1.1:1, which is what blank paper looks
         like. One tick, one frame of reference. */
      const rows = eval(s)([[], [], '[data-mz-root]']);
      return { rows: rows, sx: window.scrollX, sy: window.scrollY };
    }, contrast.COLLECT.toString());
    let collected = await recollect();
    await page.evaluate(() => { const e = document.querySelector('[data-mz-root]'); if (e) e.removeAttribute('data-mz-root'); });
    /* A MEASUREMENT OF NOTHING IS NOT A PASS. Returning PASS here is what let
       the audit sleep through every screen it was written for. */
    const rects = collected.rows || [];
    if (!rects.length) return { verdict: 'EMPTY', findings: [{ error: 'the readability pass found no text to measure on this state — a pass made of nothing is not a pass' }], measured: 0 };
    /* THE PICTURE AND THE COORDINATES MUST BE IN THE SAME FRAME. The collector
       records every row in DOCUMENT coordinates; this took a VIEWPORT picture
       and handed the two to the sampler as if they matched. On any screen the
       walk had scrolled, every sample landed one scroll-offset away from the
       text it was judging - which is where "Angles is 1.03:1" came from on a
       markbook that is navy-on-cream and legible across a room, and why the
       same screen passed when I reproduced it un-scrolled. It invents faults
       and hides them in the same breath, and the hiding is the worse half.
       A full-page picture was the other way to square it and it times out on
       the full grid, which is a wide table; the viewport is also the honest
       unit, because it is what she is looking at. So the offset travels with
       the picture and the sampler subtracts it. */
    /* AND THE PAGE MUST BE AT REST. If it moved after the collect, the ROWS are
       stale as well as the offset, so the whole collect is taken again - not
       just the number patched. Eight tries at 150ms is more than any scroll
       this app starts. */
    let view = { sx: collected.sx, sy: collected.sy };
    for (let settle = 0; settle < 8; settle++) {
      const now = await page.evaluate(() => ({ sx: window.scrollX, sy: window.scrollY }));
      if (now.sx === view.sx && now.sy === view.sy) break;
      await new Promise(r => setTimeout(r, 150));
      collected = await recollect();
      view = { sx: collected.sx, sy: collected.sy };
    }
    /* A STILL FRAME, OR NO FRAME AT ALL. Headless Chrome does not composite
       these pages, and asked for a picture of one carrying infinite CSS
       animations - the nine on the staff cover, the breathing wait-lines and
       their spinners added on 6 September - Page.captureScreenshot simply never
       returns. Three minutes, then a timeout reported as "the readability pass
       crashed", which reads exactly like a broken gate and is really a page
       that will not hold still. Animation is paused for the length of the
       exposure and started again straight after: paused, not finished and not
       cancelled, because a cancelled spinner is a spinner this gate has
       destroyed rather than measured. */
    await page.addStyleTag({ id: 'mz-freeze', content:
      '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }' }).catch(() => {});
    /* AND A BOUNDED EXPOSURE. On the staff cover at 375, Page.captureScreenshot
       never returns - not for thirty seconds and not for three minutes - and
       an unbounded wait turns one unphotographable screen into a walk that
       looks hung. What that screen is doing to the compositor is not yet
       known and is written up as open work; what is known is that a gate must
       fail in a way you can read. Twenty seconds, then the pass says it could
       not take the picture and moves on, and the row is NOT MEASURED rather
       than a pass made of nothing. */
    const shot = await Promise.race([
      page.screenshot({ encoding: 'base64' }),
      new Promise((_, rej) => setTimeout(() => rej(new Error(
        'the picture never came back: this screen does not produce a frame in headless Chrome, so it cannot be measured in pixels')), 20000))
    ]);
    await page.evaluate(() => {
      const f = document.getElementById('mz-freeze'); if (f) f.remove();
    }).catch(() => {});
    const measured = await page.evaluate(async (args) => {
      const fn = eval('(' + args[0] + ')');
      return await fn(['data:image/png;base64,' + args[1], args[2], args[3]]);
    }, [contrast.MEASURE.toString(), shot, rects, view]);
    /* WHAT THE SAMPLER CANNOT SEPARATE IS ASKED AGAIN, IN THE BROWSER'S OWN
       COLOURS (F35b). The module's exemptions called these "a skip with its
       reason" - but a skip is silence, and silence is what let white-on-white
       through. Failing them all outright is the other error: an 11px label on a
       gradient is hard to sample and perfectly easy to read, and a gate that
       condemns it is inventing a fault (L6). So a row the pixels could not
       resolve is measured a second way - computed colour composited through its
       ancestors, which is exactly the "inherited from four ancestors up" case
       this whole platform got wrong - and reported as such. Pixels first,
       because they see gradients and overlays; computed second, because it
       always has an answer; silence never. */
    const fallback = await page.evaluate(() => {
      const parse = (c) => { const m = (c || '').match(/rgba?\(([^)]+)\)/); if (!m) return null;
        const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
      const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
      /* A GRADIENT IS NOT A COLOUR, AND GUESSING ONE IS HOW A GATE INVENTS A
         FAULT. Walking ancestors for a background-COLOR skips straight past a
         book cover painted with linear-gradient() and lands on the page white -
         which reported white-on-teal as 1:1 and would have condemned every
         cover on the shelf. If anything between the glyphs and the ground is
         painted with an image, this measurement has no answer and says so; the
         pixel pass is the one that can see gradients, and it already did. */
      const groundOf = (el) => { const st = []; let n = el;
        while (n && n.nodeType === 1) {
          const cs = getComputedStyle(n);
          if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
          const c = parse(cs.backgroundColor);
          if (c && c.a > 0) { st.push(c); if (c.a >= 1) break; } n = n.parentElement; }
        let base = { r: 255, g: 255, b: 255, a: 1 };
        for (let i = st.length - 1; i >= 0; i--) base = over(st[i], base);
        return base; };
      const out = {};
      document.querySelectorAll('*').forEach((el) => {
        const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
        if (!own) return;
        const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 6) return;
        /* ornaments are not text and are judged by the colour law, not here */
        if (el.closest('[data-ornament]')) return;
        const cs = getComputedStyle(el);
        const fg = parse(cs.color); if (!fg) return;
        const bg = groundOf(el); if (!bg) return;
        out[Math.round(r.left) + ':' + Math.round(r.top) + ':' + own.slice(0, 24)] =
          Math.round(ratio(over(fg, bg), bg) * 100) / 100;
      });
      return out;
    });
    const keyOf = (r) => Math.round(r.x - window.scrollX || r.x) + ':' + Math.round(r.y) + ':' + String(r.text || '').slice(0, 24);
    const resolved = measured.map((r) => {
      if (r.ratio != null || !(r.skip === 'text pixels not distinguishable' || r.skip === 'no text pixels found')) return r;
      const k = Math.round(r.x) + ':' + Math.round(r.y) + ':' + String(r.text || '').slice(0, 24);
      const cr = fallback[k];
      if (cr == null) return Object.assign({}, r, { unmeasured: true });
      return Object.assign({}, r, { ratio: cr, via: 'computed colour, composited through its ancestors' });
    });
    const bad = resolved.filter(r => r.ratio != null && r.ratio < contrast.floorFor(r));
    return { verdict: bad.length ? 'FAIL' : 'PASS', findings: bad.slice(0, 8),
      measured: resolved.length, byPixels: resolved.filter(r => r.ratio != null && !r.via).length,
      byComputed: resolved.filter(r => r.via).length, unmeasured: resolved.filter(r => r.unmeasured).length };
  } catch (e) {
    return { verdict: 'CRASH', findings: [{ error: String(e && e.message || e) }] };
  }
}

module.exports = { run, readability, describeContrast, describeOverlap, describeSaidTwice, OVERLAP, SAME_TWICE, COLOUR_LAW, MUTE_LOCKS, CONSEQUENCE, BUSY_CONTRACT,
  EXEMPTIONS: [].concat(empty.EXEMPTIONS || [], stateAudit.EXEMPTIONS || [], placed.EXEMPTIONS || [], contrast.EXEMPTIONS || []) };
