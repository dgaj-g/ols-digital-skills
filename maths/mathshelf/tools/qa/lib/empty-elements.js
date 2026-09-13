/* copied from ks3-dt/tools/record-tutorial/lib/empty-elements.js at bdd8c5a, 2026-08-28; adapter: none */
/* empty-elements.js — ONE HOME FOR THE EMPTY-CONTAINER LAW (J13c, DFM 42/184).
 *
 * THE LAW: on any screen a pupil can reach, a VISIBLE content container with
 * nothing in it — no text, no picture — is a failure.
 *
 * WHERE IT CAME FROM. He sat J2 Lesson 3 on 27 August 2026 and found "a wee
 * white line" at the top of training build 3a, exactly where a reader's eye
 * starts. Diagnosed at the render: every assemble card drew the `.pyrun-target`
 * block unconditionally — a lead paragraph and an expected-output `<pre>` — and
 * the builds that are checked by RUNNING author neither, so an empty orange
 * shell with a blank white strip in it shipped above the instruction.
 *
 * WHY IT SURVIVED EVERY GATE. Nothing had ever asked the question. The language
 * gate reads strings that exist; a container with no string in it is invisible
 * to it by construction. The walkers stood on that exact screen many times and
 * were only ever asked about controls and text they could find. An absence is
 * the hardest thing to notice and the easiest thing to check, once somebody
 * decides to check it (DFM 213's own lesson about exemptions and silence).
 *
 * WHAT COUNTS AS A CONTENT CONTAINER, and the list is deliberately narrow so the
 * gate cannot invent faults (DFM 146a). These tags exist to HOLD something:
 *     pre  p  li  ol  ul  h1 h2 h3 h4  figcaption  blockquote  td  th
 * Layout hosts (`div`, `section`, `span`) are NOT on the list: an empty div is
 * ordinary and usually invisible, and condemning them would drown a real
 * finding in noise — which is how a real fault gets skimmed past (DFM 238c).
 *
 * WHAT IS EXEMPT, DECLARED HERE AND PRINTED BY EVERY CALLER (J13b/c: an
 * exemption that is silent reads as a pass):
 *   - anything not actually rendered: `hidden`, display:none, visibility:hidden,
 *     near-zero opacity, or a box smaller than 8x6 device-independent pixels;
 *   - a LIVE REGION (`[role=status]`, `[aria-live]`) — it is SUPPOSED to start
 *     empty and fill when something happens;
 *   - a container holding a picture, a video, a canvas, an SVG or a control,
 *     which is content even with no words in it;
 *   - a container painted with a background image — it is showing something.
 *
 * HOW IT IS USED. `QUERY` is browser-side source, evaluated in whatever page is
 * under test: both walkers ask it on every screen of every lesson every run, and
 * `qa-empty-elements.js` asks it of a single card mounted alone so the control
 * can be fired against the build he sat. One law, one wording (DFM 144).
 */
'use strict';

const EXEMPTIONS = [
  'not rendered (hidden / display:none / visibility:hidden / opacity ~0 / smaller than 8x6px)',
  'a live region ([role=status] or [aria-live]) — it is meant to start empty',
  'holds a picture, video, canvas, SVG or a control',
  'painted with a background image',
  'a stem-and-leaf row (.stat-sl td): an empty row is the diagram saying no value has that stem (Book A, 12 Sept 2026)',
  /* Book B (13 Sept 2026, WALK-B): a table's GIVEN cells are plain <td>s
     (numeric or the printed class text) and are already inside td's own TAGS
     rule above — nothing new exempts them, they are simply never empty by
     construction. What IS new is the other direction: an empty DERIVED
     button.stat-cell, before she has filled it, is legitimate (that is what
     "empty" means for a cell she has not keyed yet) — but ONLY while it still
     carries its own aria-label naming the head and row it belongs to; with no
     name it is condemned below, not exempted. A button.stat-rowpick is never
     exempt at all: it always carries the row's own class text as its name. */
];

const QUERY = `(function () {
  var TAGS = ['pre', 'p', 'li', 'ol', 'ul', 'h1', 'h2', 'h3', 'h4',
              'figcaption', 'blockquote', 'td', 'th'];
  var out = [];
  document.querySelectorAll(TAGS.join(',')).forEach(function (el) {
    if (el.hasAttribute('hidden')) return;
    if (el.closest('[hidden]')) return;
    /* ADAPTER (maths): role="alert" is a live region too - it is announced
       more urgently, but it is still a container that is SUPPOSED to start
       empty and fill when something happens. Naming only role="status" made
       the audit report every message slot in the markbook as "nothing". */
    if (el.closest('[role="status"], [role="alert"], [aria-live]')) return;
    /* ADAPTER (maths, Book A): a stem-and-leaf diagram is a table whose rows
       ARE its stems; a row with no leaves is the diagram's own statement that
       no value has that stem, not a container holding nothing. */
    if (el.tagName.toLowerCase() === 'td' && el.closest('table.stat-sl')) return;
    if ((el.textContent || '').trim() !== '') return;
    if (el.querySelector('img, svg, video, canvas, input, button, select, textarea, a[href]')) return;
    var r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6) return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (Number(cs.opacity) <= 0.05) return;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return;
    var owner = el.parentElement;
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' && el.className.trim())
        ? '.' + el.className.trim().split(/\\s+/).join('.') : '',
      inside: owner ? (owner.tagName.toLowerCase() +
        ((typeof owner.className === 'string' && owner.className.trim())
          ? '.' + owner.className.trim().split(/\\s+/)[0] : '')) : '',
      w: Math.round(r.width), h: Math.round(r.height)
    });
  });
  /* ADDITION (Book B, 13 Sept 2026): a table's own two control kinds are not
     content containers - a <button> is deliberately off the TAGS list above,
     because most empty buttons hold an icon or are simply between presses -
     so they are asked a NARROWER question of their own: not "is it empty"
     but "does it still say what it is while it is". */
  document.querySelectorAll('button.stat-cell').forEach(function (el) {
    if (el.hasAttribute('hidden') || el.closest('[hidden]')) return;
    if ((el.textContent || '').trim() !== '') return;               /* not yet filled - normal */
    var r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6) return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0.05) return;
    if (el.getAttribute('aria-label')) return;                      /* named - a legitimate empty button */
    out.push({ tag: 'button', cls: '.stat-cell', reason: 'stat-cell-no-name', w: Math.round(r.width), h: Math.round(r.height) });
  });
  document.querySelectorAll('button.stat-rowpick').forEach(function (el) {
    if (el.hasAttribute('hidden') || el.closest('[hidden]')) return;
    var r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6) return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0.05) return;
    var name = (el.getAttribute('aria-label') || el.textContent || '').trim();
    if (name) return;
    out.push({ tag: 'button', cls: '.stat-rowpick', reason: 'stat-rowpick-no-name', w: Math.round(r.width), h: Math.round(r.height) });
  });
  return out;
})`;

function describe(f) {
  if (f.reason === 'stat-cell-no-name') {
    return 'AN EMPTY DERIVED TABLE CELL WITH NO NAME ' + f.w + '×' + f.h + 'px — ' +
      'button.stat-cell with nothing keyed yet is only a legitimate empty button while it carries its own aria-label naming the column head and row (CONTRACT_B.md "table")';
  }
  if (f.reason === 'stat-rowpick-no-name') {
    return 'A ROW-PICK BUTTON WITH NO NAME ' + f.w + '×' + f.h + 'px — ' +
      "button.stat-rowpick must carry the row's own class text as its name, filled or not (CONTRACT_B.md \"table\")";
  }
  return 'A VISIBLE EMPTY ' + f.tag.toUpperCase() + ' ' + (f.cls || '(no class)') +
    ' — ' + f.w + '×' + f.h + 'px of nothing' +
    (f.inside ? ', inside ' + f.inside : '') +
    ' (J13c / DFM 42/184: a container a pupil can see, holding nothing)';
}

module.exports = { QUERY, describe, EXEMPTIONS };
