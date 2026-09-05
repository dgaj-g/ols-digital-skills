#!/usr/bin/env node
/* qa-click-safety.js — A SINGLE PRESS NEVER DESTROYS PLACED WORK.
 *
 * G-E3 / DFM 272. His own words, sitting a KS3 DT lesson on 27 August 2026
 * after one stray click threw a correct line back to the tray: "the third line
 * was put back over to the left". He then spent the next minutes debugging box
 * names he had not mistyped, because the screen blamed him for its own fault.
 *
 * The law travelled here BEFORE it could happen: the stats pack was going to
 * ship a tile that "can be tapped again in the row to send it back", and the
 * gates design replaced it with the house two-press. This gate is what holds
 * that — it presses the body of the last placed item on every board it can
 * reach and requires the work to survive.
 *
 * A first press that only SELECTS is a survival: that IS the two-press.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const B = require('./lib/browser.js');
const S = require('./lib/stage.js');
const placed = require('./lib/placed-work.js');

const TIER = 'full';
const ORDER = 73;
const COVERS = { books: '*', kinds: '*', surfaces: ['question', 'dock'], widths: [375, 768, 1280], projector: false, tier: ['preview'], cells: ['click-safety'] };
const CONTROLS = [
  { id: 'single-press-lift', kind: 'fixture', plant: 'fixture-renderers', mustFail: /A SINGLE PRESS DESTROYED PLACED WORK/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-click-safety');
g.exempt(placed.EXEMPTIONS.concat([
  'a v3 renderer is LOCKED and approved: a single-press lift found inside one is REPORTED as a waived finding for his word, never changed (rule 30)'
]));

(async () => {
  const browser = await B.launch();
  let boards = 0, protectedCount = 0;
  try {
    const page = await S.openApp(browser, { width: 1280 });
    for (const book of A.books()) {
      const pack = A.content()[book];
      for (let si = 0; si < pack.sections.length; si++) {
        const qids = await S.openExercise(page, book, si);
        if (!qids || !qids.length) continue;
        /* place some work: a real attempt, not yet checked */
        await page.evaluate((s, a) => eval(s)(a), require('./lib/walk-moves.js').ANSWER, [qids[0], false]);
        await new Promise(r => setTimeout(r, 250));
        const out = await page.evaluate(s => eval(s)(), placed.QUERY);
        if (!out.placed) continue;
        boards++;
        if (out.survived) { protectedCount++; continue; }
        out.findings.forEach(f => {
          g.fail(book + ' > s' + (si + 1) + ' > ' + qids[0], 'click-safety', placed.describe(f) +
            '  [REPORTED, not changed: this is a locked v3 renderer and needs his word]');
        });
      }
    }
    await page.close();
  } finally { await browser.close(); }
  g.note(boards + ' boards carried placed work; ' + protectedCount + ' survived a single press');
  if (!boards) g.note('no board on any exercise carried [data-placed] work — nothing to protect, which is reported rather than passed');
  g.done();
})().catch(e => { console.log('  FAIL  qa-click-safety x crash: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
