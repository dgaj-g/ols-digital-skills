#!/usr/bin/env node
/* qa-colour-law.js — EACH COLOUR MEANS ONE THING, MEASURED IN PIXELS.
 *
 * G-C2. The closed colour law is the oldest rule on this platform and the one
 * a re-skin is most likely to break without anybody noticing, because a colour
 * that has taken a second meaning still looks fine:
 *   #C8102E means WRONG. #1F7A33 means RIGHT. #B07D10 means ANSWER ONLY.
 *   Gold celebrates and decorates; it is never a status and never a mark.
 *   Copper is ink; it is never a status.
 *   #B500C8 — the debug sentinel — never reaches a screen at all.
 *   Every [data-work] surface is LIGHT, whatever the shell behind it does.
 *
 * IT IS MEASURED IN COMPUTED PIXELS, not in the stylesheet (L7), and this build
 * is why: on its first run the shell was correct in every token and NAVY in the
 * rendered pixels, because a v3 rule nobody had deleted was still painting the
 * cover. A stylesheet grep would have called that green.
 *
 * The law itself lives in lib/audits.js so the walkers can ask it on every
 * state they stand on; this gate is where it gets its own controls and its own
 * sweep of the states a walker might not reach.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const B = require('./lib/browser.js');
const S = require('./lib/stage.js');
const AUD = require('./lib/audits.js');

const TIER = 'full';
const ORDER = 70;
const COVERS = { books: '*', kinds: '*', surfaces: '*', widths: [375, 768, 1280], projector: false, tier: ['preview'], cells: ['colour'] };
const CONTROLS = [
  { id: 'marking-colour-as-decoration', kind: 'fixture', plant: 'fixture-css', mustFail: /marking-colour-outside-a-mark/ },
  { id: 'dark-work-surface', kind: 'fixture', plant: 'fixture-css', mustFail: /work-surface-not-light/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-colour-law');
g.exempt(['a colour that paints nothing is not judged: the colour property on an element with no text of its own draws no glyph',
  'the walkers ask this same law on every state they stand on; this gate sweeps the shell states and owns the controls']);

(async () => {
  const browser = await B.launch();
  try {
    for (const width of [375, 768, 1280]) {
      const page = await S.openApp(browser, { width });
      /* the cover and the shelf */
      let a = await AUD.run(page, {});
      report(g, 'shelf', width, a);
      /* a book, an exercise, a marked question */
      const qids = await S.openExercise(page, A.books()[0], 0);
      if (qids && qids.length) {
        a = await AUD.run(page, {});
        report(g, 'question:fresh', width, a);
        await S.answer(page, qids[0], false);
        a = await AUD.run(page, {});
        report(g, 'question:checked-right', width, a);
        await S.answer(page, qids[1] || qids[0], true);
        a = await AUD.run(page, {});
        report(g, 'question:checked-wrong-1', width, a);
      }
      g.note('swept the shell and a marked question at ' + width);
      await page.close();
    }
    /* the markbook, where the marking colours actually live */
    const staff = await S.openApp(browser, { width: 1280, staff: true });
    const a = await AUD.run(staff, {});
    report(g, 'set-up', 1280, a);
    await staff.close();
  } finally { await browser.close(); }
  g.done();
})().catch(e => { console.log('  FAIL  qa-colour-law x crash: ' + (e && e.stack ? e.stack : e)); process.exit(1); });

function report(g, where, width, a) {
  (a.findings.colour || []).forEach(f => {
    g.fail(where + ' @' + width, 'colour-law',
      f.law + '  ' + (f.sel || '') + (f.prop ? '  (' + f.prop + ': ' + f.colour + ')' : '') +
      (f.lum != null ? '  luminance ' + f.lum : ''));
  });
  if (!(a.findings.colour || []).length) g.pass();
}
