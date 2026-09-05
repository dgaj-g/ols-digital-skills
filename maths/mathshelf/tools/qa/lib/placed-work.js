/* copied from ks3-dt/tools/record-tutorial/lib/placed-work.js at bdd8c5a, 2026-08-28; adapter: items are [data-placed], their rows are [data-tray-row]/[data-work], the restore path is the tray named by data-from, and the house TWO-PRESS is honoured — a first press that only SELECTS (and says so) is a survival, not a removal */
/* placed-work.js — ONE HOME FOR THE DFM 272 LAW.
 *
 * THE LAW: a single press on the body of work a pupil has PLACED never removes
 * it. Removing, clearing or resetting placed work takes a deliberate act — a
 * drag away, the house two-press, or a control labelled with what it removes.
 *
 * WHERE IT CAME FROM. He sat J2 Lesson 3 on 27 August 2026 and lost a correct
 * program to one stray click: "the third line was put back over to the left".
 * On MathShelf the same class was designed IN before it shipped: the stats pack
 * had a placed tile that "can be tapped again in the row to send it back", and
 * MATHS_GATES_DESIGN Part 8.1 replaced it with the house two-press. This module
 * is what holds that amendment.
 *
 * WHY THIS IS A LIVE PRESS AND NOT A GREP. Whether a press destroys work is a
 * property of the rendered board with its handlers attached. So this DOES the
 * thing: it finds the placed work on whatever screen it is standing on, presses
 * the BODY of the LAST placed item (never a labelled control, never a typing
 * box), and reports whether the work survived. If it did not, it puts it back,
 * so a walker running this every turn is not unbuilding the book it is walking.
 *
 * THE TWO-PRESS IS A SURVIVAL. The house affordance is: the first press SELECTS
 * the placed item (a ring, and the words "press again to put it back" beside
 * it); the second press on the same item returns it. So the probe reads the
 * count AND the selection: count unchanged is a survival however the item now
 * looks. A first press that changes nothing at all is also a survival.
 *
 * WHAT COUNTS AS PLACED WORK: anything carrying [data-placed] — a tile in an
 * ordered row, a plotted point, a marker on a scale, a leaf on a stem, a chip
 * pressed into an answer, a line committed to the working. A screen with none
 * of it is not a finding: it is a screen with nothing to protect, and the
 * caller is told so rather than told nothing (DFM 204).
 *
 * WHAT IS DELIBERATELY NOT PRESSED: a typing box, a labelled remove control
 * (that IS the deliberate act the law asks for), and anything inside a locked
 * question (there is no work left to destroy).
 */
'use strict';

const EXEMPTIONS = [
  'a typing box or a labelled remove control is never pressed — those are the deliberate acts the law asks for',
  'placed work inside a locked question root ([data-state^="checked-wrong-2"], [data-state="locked-restore"]) is not pressed — the work is finished',
  'a screen with no [data-placed] is reported as "nothing to protect", never as a pass'
];

const QUERY = `(function () {
  var out = { placed: 0, tested: null, survived: null, selected: false, findings: [] };

  function vis(el) { var r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; }
  function live(el) { return !(el.disabled || el.getAttribute('aria-disabled') === 'true'); }
  function locked(el) { return !!el.closest('[data-state="checked-wrong-2"], [data-state="locked-restore"], [data-state="checked-right"]'); }

  var items = [];
  document.querySelectorAll('[data-placed]').forEach(function (n) {
    if (vis(n) && live(n) && !locked(n)) items.push(n);
  });
  out.placed = items.length;
  if (!items.length) return out;

  /* THE LAST PLACED ITEM, NEVER THE FIRST (the 28 Aug lesson): an item put back
     lands at the END of the row, so ejecting the first one would scramble the
     order the walker built. Taking the last one restores it exactly. */
  var node = items[items.length - 1];
  var row = node.closest('[data-tray-row], [data-work]') || node.parentElement;
  var count = function () { return row.querySelectorAll('[data-placed]').length; };
  var before = count();
  var label = (node.textContent || node.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 48);
  out.tested = label;

  var body = node.querySelector('.tile-body, code, .pt-body') || node;
  body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 }));

  var after = count();
  out.survived = after >= before;
  /* the house two-press: a first press that only SELECTS is the designed
     behaviour, and it is what this law asks for */
  out.selected = !!(node.isConnected && (node.getAttribute('aria-pressed') === 'true' ||
    node.classList.contains('is-selected') || node.hasAttribute('data-selected')));

  if (!out.survived) {
    out.findings.push({
      row: (row && typeof row.className === 'string' && row.className.trim())
        ? '.' + row.className.trim().split(/\\s+/).slice(0, 2).join('.') : (row ? row.tagName.toLowerCase() : '?'),
      text: label, was: before, now: after
    });
    /* PUT IT BACK, into the tray it came from, by its own name. */
    var from = node.getAttribute && node.getAttribute('data-from');
    var tray = from ? document.querySelector('[data-tray="' + from + '"]') : document.querySelector('[data-tray]');
    var back = null;
    if (tray) tray.querySelectorAll('[data-tray-item], .tile, .chip, .marker').forEach(function (n) {
      if (!back && (n.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 48) === label) back = n;
    });
    if (back) back.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 }));
  } else if (out.selected) {
    /* clear the selection the probe just made, so the walk carries on from the
       board it found */
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 }));
  }
  return out;
})`;

function describe(f) {
  return 'A SINGLE PRESS DESTROYED PLACED WORK — the row went from ' + f.was +
    ' placed to ' + f.now + ' with no drag, no second press and no labelled control (DFM 272)' +
    (f.text ? '  ["' + f.text + '"]' : '');
}

module.exports = { QUERY, describe, EXEMPTIONS };
