/* placed-work.js — ONE HOME FOR THE DFM 272 LAW.
 *
 * THE LAW: a single click on the body of work a pupil has PLACED never removes
 * it. Removing, clearing or resetting placed work takes a deliberate act — a
 * drag away, the house two-press, or a control labelled with what it removes.
 *
 * WHERE IT CAME FROM. He sat J2 Lesson 3 on 27 August 2026 and lost a correct
 * program to one stray click: *"the third line was put back over to the left"*.
 * He was typing into the blanks on neighbouring lines; a click that landed on a
 * placed line's body silently threw it back to the tray, the run then failed,
 * and the engine's own honest error pointed him at box names he had not
 * mistyped. A destructive act that costs one click and announces nothing is the
 * DFM 42/43 family at its worst, because the screen then blames the pupil.
 *
 * WHY THIS IS A LIVE CLICK AND NOT A GREP. Whether a click destroys work is a
 * property of the rendered card with its handlers attached — the same reason
 * the 267(f) audit is a DOM query. So this DOES the thing: it finds the placed
 * work on whatever screen it is standing on, clicks the BODY of the first item
 * (never a labelled control, never a typing box), and reports whether the work
 * survived. It then puts the screen back if it did not, so a walker that runs
 * this every turn is not itself unbuilding the lesson it is walking.
 *
 * WHAT COUNTS AS PLACED WORK. Anything a pupil has moved into a "your program"
 * position on either drag engine, found by the engines' own class names:
 *   .pyp-list  .pyrun-line        (the pyrun tray — his own exhibit)
 *   .pp-list   .parsons-block     (the ordering engine)
 * A screen with none of it is not a finding: it is a screen with nothing to
 * protect, and the caller is told so rather than told nothing (DFM 204).
 *
 * WHAT IS DELIBERATELY NOT CLICKED: a typing blank (that is typing, DFM 267f),
 * a labelled remove control (that is the deliberate act the law asks for), and
 * an out-of-service row on a finished card (there is no work left to destroy).
 *
 * HOW IT IS USED. `QUERY` is browser-side source, evaluated inside whatever page
 * is under test, so both walkers can ask it on every screen of every lesson and
 * the probe (qa-click-safety.js) can ask it of a single engine mounted alone.
 * One law, one wording, more than one home (DFM 144).
 */
'use strict';

const QUERY = `(function () {
  var LISTS = ['.pyp-list', '.pp-list'];
  var ITEM = '.pyrun-line, .parsons-block';
  var out = { placed: 0, tested: null, survived: null, findings: [] };

  function vis(el) { var r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; }
  function live(el) {
    return !(el.disabled || el.getAttribute('aria-disabled') === 'true');
  }

  var items = [];
  LISTS.forEach(function (ls) {
    document.querySelectorAll(ls).forEach(function (list) {
      list.querySelectorAll(ITEM).forEach(function (n) {
        if (vis(n) && live(n)) items.push(n);
      });
    });
  });
  out.placed = items.length;
  if (!items.length) return out;

  /* THE LAST PLACED ROW, NEVER THE FIRST (28 Aug 2026). The probe ejects a row and
     clicks it back — and a row clicked back lands at the END of the program, because
     that is the gesture that places one. Ejecting the FIRST row therefore returned it
     to the wrong PLACE: on an ordering card the walker's whole sequence was scrambled
     every time the probe ran, the build could never match, and the confused walks of
     nine locked lessons stopped part-way through with the fault looking like anything
     but this. Taking the LAST row and putting it back restores it exactly where it was.
     A probe that measures a thing must leave it as it found it. */
  var node = items[items.length - 1];
  var list = node.closest('.pyp-list, .pp-list');
  var before = list.querySelectorAll(ITEM).length;
  var label = (node.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 48);
  out.tested = label;

  /* click the BODY of the row, never a control inside it and never a typing
     box. A blank-carrying row draws its <input> inside itself, so the click is
     aimed at the row's own <code> where there is one, and at the row otherwise. */
  var body = node.querySelector('code') || node;
  body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 }));

  var after = list.querySelectorAll(ITEM).length;
  out.survived = after >= before;
  if (!out.survived) {
    out.findings.push({
      engine: node.classList.contains('parsons-block') ? 'parsons' : 'pyrun tray',
      text: label,
      was: before, now: after
    });
    /* PUT IT BACK. A walker that ran this every turn and left the work on the
       floor would be unbuilding the very lesson it is measuring, and the run
       after this one would then be walking a screen no pupil ever sees. The
       row is returned by clicking it again, which on the shipped engines is
       exactly the gesture that placed it in the first place. */
    var back = null;
    document.querySelectorAll('.pyt-list ' + ITEM + ', .parsons-tray ' + ITEM + ', .pt-list ' + ITEM)
      .forEach(function (n) {
        if (!back && (n.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 48) === label) back = n;
      });
    if (back) back.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 }));
  }
  return out;
})`;

function describe(f) {
  return 'A SINGLE CLICK DESTROYED PLACED WORK on the ' + f.engine +
    ' — the row went from ' + f.was + ' placed to ' + f.now +
    ' with no drag, no second press and no labelled control (DFM 272)' +
    (f.text ? '  [“' + f.text + '”]' : '');
}

module.exports = { QUERY, describe };
