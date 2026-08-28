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
  'painted with a background image'
];

const QUERY = `(function () {
  var TAGS = ['pre', 'p', 'li', 'ol', 'ul', 'h1', 'h2', 'h3', 'h4',
              'figcaption', 'blockquote', 'td', 'th'];
  var out = [];
  document.querySelectorAll(TAGS.join(',')).forEach(function (el) {
    if (el.hasAttribute('hidden')) return;
    if (el.closest('[hidden]')) return;
    if (el.closest('[role="status"], [aria-live]')) return;
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
  return out;
})`;

function describe(f) {
  return 'A VISIBLE EMPTY ' + f.tag.toUpperCase() + ' ' + (f.cls || '(no class)') +
    ' — ' + f.w + '×' + f.h + 'px of nothing' +
    (f.inside ? ', inside ' + f.inside : '') +
    ' (J13c / DFM 42/184: a container a pupil can see, holding nothing)';
}

module.exports = { QUERY, describe, EXEMPTIONS };
