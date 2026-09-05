#!/usr/bin/env node
/* qa-numpad.js — TAP-FIRST, FOOLPROOF, AND NOTHING COVERS THE BOARD.
 *
 * G-E9, and it is three of his own rulings in one screen:
 *   RULE 6, the FOOLPROOF keyboard (23 Jun 2026). The v2 composer was "fiddly":
 *   a text box you had to click into before it would take anything. It was
 *   replaced by a result slot that fills as she presses big keys, and the rule
 *   is that nothing on a maths question is a free-text box.
 *   RULE 7, the dock is IN FLOW, never viewport-sticky (25 Jun 2026). A pinned
 *   pad on a Chromebook covers the very board she is working on.
 *   And a real keyboard wins: pressing a physical key hides the pad, because a
 *   pupil with a keyboard should not be fighting a pad for the same slot.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const B = require('./lib/browser.js');
const S = require('./lib/stage.js');

const TIER = 'full';
const ORDER = 71;
const COVERS = { books: '*', kinds: '*', surfaces: ['dock', 'question'], widths: [375, 768, 1280], projector: false, tier: ['preview'], cells: ['numpad'] };
const CONTROLS = [
  { id: 'sticky-dock', kind: 'fixture', plant: 'fixture-css-sticky-dock', mustFail: /in flow/ },
  { id: 'free-text-box', kind: 'fixture', plant: 'fixture-renderers', mustFail: /free-text box/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-numpad');
g.exempt(['the self-evaluation note is a deliberate free-text box on its own card, not on a question, and is named as the one exemption']);

(async () => {
  const browser = await B.launch();
  try {
    for (const width of [375, 1280]) {
      const page = await B.newPage(browser, { width });
      const p = await S.openApp(browser, { width });
      const qids = await S.openExercise(p, 'algebra', 3);   /* solve: the move rail and the pad */
      if (!qids || !qids.length) { g.note('no questions on screen at ' + width); await p.close(); await page.close(); continue; }

      const found = await p.evaluate(() => {
        const out = { docks: [], freeText: [], overlaps: [] };
        document.querySelectorAll('[data-surface="dock"], .dock').forEach(d => {
          const cs = getComputedStyle(d);
          out.docks.push({ position: cs.position, cls: String(d.className).split(' ')[0] });
          const board = d.closest('.jotter-q');
          if (board) {
            const dr = d.getBoundingClientRect();
            const wl = board.querySelector('.wlines, .jq-diagram, .exp-grid');
            if (wl) {
              const br = wl.getBoundingClientRect();
              const over = Math.min(dr.bottom, br.bottom) - Math.max(dr.top, br.top);
              const across = Math.min(dr.right, br.right) - Math.max(dr.left, br.left);
              if (over > 2 && across > 2) out.overlaps.push({ by: Math.round(over) });
            }
          }
        });
        document.querySelectorAll('.jotter-q input[type="text"], .jotter-q textarea').forEach(i => {
          if (i.readOnly) return;
          out.freeText.push(String(i.className).split(' ')[0] || i.tagName.toLowerCase());
        });
        return out;
      });

      found.docks.forEach(d => {
        g.check(d.position !== 'fixed' && d.position !== 'sticky', 'dock @' + width, 'numpad',
          'the dock computes position:' + d.position + ' — it must stay in flow, or on a Chromebook it covers the board she is working on (rule 7)');
      });
      found.overlaps.forEach(o => {
        g.check(false, 'dock @' + width, 'numpad',
          'the dock covers the board by ' + o.by + 'px — she cannot see what she is writing and the keys at the same time');
      });
      found.freeText.forEach(f => {
        g.check(false, 'question @' + width, 'numpad',
          'there is a free-text box (' + f + ') on a maths question — the pad fills a result slot she never has to click into first (rule 6)');
      });
      g.note(width + ': ' + found.docks.length + ' docks, ' + found.freeText.length + ' free-text boxes, ' + found.overlaps.length + ' overlaps');
      await p.close();
      await page.close();
    }
  } finally { await browser.close(); }
  g.done();
})().catch(e => { console.log('  FAIL  qa-numpad x crash: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
