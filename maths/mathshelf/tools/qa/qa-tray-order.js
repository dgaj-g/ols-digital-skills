#!/usr/bin/env node
/* qa-tray-order.js — A TRAY NEVER COMES OUT IN THE ANSWER ORDER.
 *
 * G-E12 / rule 21 (DFM 258). FAULT: a tray whose items happen to be laid out
 * in the order the answer wants them. A pupil who takes them left to right is
 * right without deciding anything, and every gate around it stays green
 * because each item, on its own, is correct.
 *
 * On these books it bites hardest on `qlist`: the printed list in a textbook
 * is very often already sorted, so "the tray holds the values as printed"
 * would hand a class the ordered row for nothing. The renderer therefore lays
 * every tray as a DERANGEMENT of the answer order — no item in the position
 * the answer would put it in — and this gate is what proves it, five mounts at
 * a time, because a shuffle that is right four times in five is not a shuffle.
 *
 * THE ANSWER ORDER IS DERIVED FROM THE PACK, in node, never read off the page:
 * a tray that carried its own answer order in an attribute would be a leak.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const B = require('./lib/browser.js');
const S = require('./lib/stage.js');
const W = require('./lib/walk-moves.js');

const TIER = 'full';
const ORDER = 74;
const MOUNTS = 5;
const STAT_KINDS = ['qlist', 'cftable', 'cfplot', 'cfread', 'boxplot', 'compare', 'judge', 'values'];
const COVERS = { books: '*', kinds: ['qlist', 'cftable', 'cfplot', 'cfread', 'boxplot', 'compare', 'judge', 'values'], surfaces: ['question'], widths: [1280], projector: false, tier: ['preview'], cells: ['tray-order'] };
const CONTROLS = [
  { id: 'stats-sorted-tray', kind: 'mutation', plant: 'stats-sorted-tray', mustFail: /came out in the answer order/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-tray-order');
g.exempt([
  'a tray with fewer than two items cannot be deranged and is reported, not failed',
  'the v3 books are locked content (rule 30): their trays are shuffled by the same helper and are walked by sit-pupil, but the ANSWER order of a family bin is not a sequence, so there is nothing here to compare against'
]);

/* ---- what order the answer would put each tray in, from the pack -------- */
/* Every tray id the stats renderers stamp is `<what>-<qid>` or
   `<what>-<index>-<qid>`, so the question a tray belongs to is read off the
   id and the order is computed from that question's own data. */
function expected(q, strings) {
  const T = strings || {};
  const out = {};
  if (q.kind === 'qlist') {
    out['qlist-tiles-' + q.id] = (q.values || []).slice()
      .sort((a, b) => Number(a) - Number(b)).map(String);
  }
  if (q.kind === 'boxplot') {
    out['boxplot-markers-' + q.id] = [T.statLowest, T.statLowerQuartile, T.statMedian,
      T.statUpperQuartile, T.statHighest].map(String);
  }
  if (q.kind === 'judge') {
    (q.claims || []).forEach((c, i) => {
      out['judge-' + i + '-' + q.id] = c.options
        ? c.options.slice().map(String)
        : [String(T.statFairToSay), String(T.statNotFair)];
      if (!c.options) {
        out['judge-why-' + i + '-' + q.id] = (q.reasons || []).map(r => String(r.text));
      }
    });
  }
  if (q.kind === 'compare') {
    const labels = (q.plots || []).map(p => String(p.label));
    const words = ((q.context || {}).words || []).map(String);
    out['compare-who1-' + q.id] = labels;
    out['compare-who1b-' + q.id] = labels;
    out['compare-who2-' + q.id] = labels;
    out['compare-ctx-' + q.id] = words;
    out['compare-size-' + q.id] = [String(T.statCmpLarger), String(T.statCmpSmaller)];
    out['compare-meas-' + q.id] = [String(T.statIqr), String(T.statRange)];
    out['compare-cons-' + q.id] = [String(T.statCmpMore), String(T.statCmpLess)];
  }
  return out;
}

const READ_TRAYS = `(() => {
  const out = {};
  document.querySelectorAll('[data-tray]').forEach((t) => {
    const id = t.getAttribute('data-tray');
    const items = [...t.querySelectorAll('[data-tray-item]')]
      .map((b) => (b.textContent || '').replace(/\\s+/g, ' ').trim());
    if (items.length) out[id] = items;
  });
  return out;
})`;

(async () => {
  const rows = A.grid().filter(r => STAT_KINDS.indexOf(r.kind) > -1);
  if (!rows.length) {
    g.note('no stats question is in the packs yet — nothing to lay out, and this gate says so rather than passing quietly');
    g.done();
    return;
  }
  const books = [...new Set(rows.map(r => r.book))];
  const browser = await B.launch();
  try {
    for (const book of books) {
      const page = await S.openApp(browser, { width: 1280 });
      const strings = await page.evaluate(() => (window.GJ_STRINGS && window.GJ_STRINGS.pupil) || {});
      const sections = [...new Set(rows.filter(r => r.book === book).map(r => r.section))];
      const secIdx = await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, book);
      if (!secIdx || !secIdx.ok) { g.note(book + ': the book would not open'); await page.close(); continue; }

      for (let si = 0; si < sections.length; si++) {
        /* the answer order for every tray this section can show */
        const want = {};
        rows.filter(r => r.book === book && r.section === sections[si])
          .forEach(r => Object.assign(want, expected(r.question, strings)));

        const seen = {};                         /* trayId -> times it matched */
        const sizes = {};
        for (let m = 0; m < MOUNTS; m++) {
          await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, si);
          await W.settle(page);
          const trays = await page.evaluate(s => eval(s)(), READ_TRAYS);
          Object.keys(trays).forEach(id => {
            const laid = trays[id];
            sizes[id] = laid.length;
            const answer = want[id];
            if (!answer || answer.length < 2 || laid.length < 2) return;
            /* THE STRONG FORM: no item may sit where the answer would put it.
               Counting only "identical to the answer" would pass a tray that
               moved one item and left the rest in place. */
            const inPlace = laid.filter((t, i) => answer[i] !== undefined && t === answer[i]).length;
            if (inPlace > 0) seen[id] = (seen[id] || 0) + 1;
          });
        }
        Object.keys(want).forEach(id => {
          if (sizes[id] === undefined) return;                    /* not shown at this stage */
          if (sizes[id] < 2) { g.note(id + ': one item, nothing to derange'); return; }
          const n = seen[id] || 0;
          g.check(n === 0, book + ' > ' + sections[si] + ' > ' + id, 'tray-order',
            'the tray came out in the answer order ' + n + ' times of ' + MOUNTS +
            ' — a tray a pupil can take left to right asks her to decide nothing');
        });
        const measured = Object.keys(sizes).length;
        g.note(book + ' > ' + sections[si] + ': ' + measured + ' trays read over ' + MOUNTS + ' mounts');
        g.check(measured > 0 || Object.keys(want).length === 0,
          book + ' > ' + sections[si], 'tray-order',
          'no tray was on screen in this section, so this gate measured nothing — a law that measures nothing reports PASS, and that is how the contrast audit slept');
      }
      await page.close();
    }
  } finally {
    await B.close(browser);
  }
  g.done();
})();
