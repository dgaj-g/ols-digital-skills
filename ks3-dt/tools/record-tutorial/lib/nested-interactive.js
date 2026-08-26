/* nested-interactive.js — ONE HOME FOR THE 267(f) LAW.
 *
 * THE LAW: no interactive input is ever nested inside an interactive control.
 *
 * WHERE IT CAME FROM. He sat J3 Lesson 2 on 26 August 2026 and found that
 * pressing the space bar while typing the theatre's name threw the whole line
 * between "The lines" and "Your program". The cause was structural, not a
 * missing guard: every pyrun line rendered as a `<button>` and a typed blank's
 * `<input>` was nested INSIDE that button. A button owns the space bar — Space
 * activates it — and the resulting click carries the BUTTON as `e.target`, so
 * the engine's "a press on a typing blank is typing, never a drag" guard, which
 * reads `e.target`, could never see the input at all. The guard was correct and
 * unreachable.
 *
 * WHY THIS IS A DOM QUERY AND NOT A GREP. The nesting happens at RENDER: the
 * blank is substituted into a template string that is then wrapped in a button,
 * so nothing in the source reads `<button><input>` and no grep can find it. The
 * only place the fault is visible is the rendered card (DFM 146b's law: what is
 * promised visually is verified visually — here, what is promised STRUCTURALLY
 * is verified in the real DOM).
 *
 * WHAT COUNTS AS INTERACTIVE. HTML's own content model calls these controls
 * "interactive content", and forbids nesting one inside another:
 *   containers  — button, a[href], summary, label(for a different control)
 *   contents    — input, textarea, select, button, a[href]
 * A `<label>` legitimately WRAPS its own control, so a label is a container only
 * when it holds a control it does not own. That exemption is narrow on purpose:
 * everything else is a fault wherever it appears.
 *
 * HOW IT IS USED. `QUERY` is a string of browser-side JavaScript that returns a
 * list of findings; it is evaluated inside whatever page is under test, so the
 * walkers (sit-review, sit-wrongpath) can stand on every screen of every lesson
 * and ask the question every turn, and the probe (qa-nested-interactive.js) can
 * ask it of a single engine mounted on its own. One law, one wording, checked in
 * more than one place — DFM 144.
 */
'use strict';

/* Returned as SOURCE so it can be handed to page.evaluate in any harness
   without a bundler. It takes no arguments and returns an array of findings. */
const QUERY = `(function () {
  var CONTAINERS = 'button, a[href], summary';
  var CONTENTS = 'input, textarea, select, button, a[href]';
  var out = [];
  document.querySelectorAll(CONTAINERS).forEach(function (box) {
    box.querySelectorAll(CONTENTS).forEach(function (inner) {
      out.push({
        container: box.tagName.toLowerCase() + (box.className ? '.' + String(box.className).trim().split(/\\s+/).join('.') : ''),
        inner: inner.tagName.toLowerCase() + (inner.className ? '.' + String(inner.className).trim().split(/\\s+/).join('.') : ''),
        text: (box.textContent || '').trim().slice(0, 60)
      });
    });
  });
  /* a <label> that wraps a control it does NOT own is the same fault */
  document.querySelectorAll('label[for]').forEach(function (lb) {
    lb.querySelectorAll(CONTENTS).forEach(function (inner) {
      if (inner.id && inner.id === lb.getAttribute('for')) return;   /* its own control: legitimate */
      out.push({
        container: 'label[for=' + lb.getAttribute('for') + ']',
        inner: inner.tagName.toLowerCase() + (inner.className ? '.' + String(inner.className).trim().split(/\\s+/).join('.') : ''),
        text: (lb.textContent || '').trim().slice(0, 60)
      });
    });
  });
  return out;
})`;

/* the sentence a harness prints when it finds one, so every home says the same
   thing to whoever is reading the log */
function describe(f) {
  return f.inner + ' is nested inside ' + f.container +
    ' — an interactive control inside an interactive control (DFM 267f)' +
    (f.text ? '  [“' + f.text + '”]' : '');
}

module.exports = { QUERY, describe };
