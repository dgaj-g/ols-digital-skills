/* ledger.js — THE ENGINE-STRINGS DEBT LEDGER, READ BY A MACHINE.
 *
 * WHY (S1 of the second-sit spec, and it is the honest half of the round).
 * "Exit check — part 2" walked onto a new pupil card on 28 August 2026 while it
 * was sitting, in writing, on line 119 of `ENGINE_STRINGS_DEBT.md` marked
 * OUTSTANDING — and had been for days. The ledger was a memo, and a memo is not
 * a gate. Nothing in the pack or the battery had ever read it, so a string
 * everybody knew was wrong shipped anyway. That is the fault: not that the debt
 * existed, but that knowing about it changed nothing (DFM 235 — a rule that is
 * not run is not a rule).
 *
 * SO THE LEDGER GETS TEETH, in the one place the fault actually happens: on a
 * pupil's screen. This module turns the committed markdown into a list of
 * sentences, and the walkers ask, on every state they stand on, whether the
 * screen in front of them is rendering one of them. Coverage is derived
 * (DFM 271): a new lesson that mounts an old engine is covered by existing.
 *
 * WHAT IS DELIBERATELY NOT CHECKED, printed by every caller:
 *   - rows shorter than 22 characters, because a short fragment ("to take it
 *     out again.") appears inside perfectly good authored prose and a gate that
 *     fires on that is a gate people turn off;
 *   - MIGRATED / WAIVED / CODE rows — by definition content owns those words,
 *     or he has settled them;
 *   - the committed table truncates a sentence at 150 characters, so the
 *     comparison is made on the row as committed, never on a longer original.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* KS3DT_LEDGER points this at another copy of the ledger — which is how the
   FILED CONTROL works (DFM 196): the walkers are pointed at the build he sat
   AND at the ledger as it stood that night, and "Exit check — part 2" is
   caught on training-2, on screen, where it really shipped. */
const LEDGER = process.env.KS3DT_LEDGER || path.join(__dirname, '../../../ENGINE_STRINGS_DEBT.md');
const MIN_CHARS = 15;

const EXEMPTIONS = [
  'ledger rows shorter than ' + MIN_CHARS + ' characters (a fragment too short to be a sentence a pupil reads)',
  'MIGRATED / WAIVED / CODE rows — content owns those words, or his ruling settled them'
];

/* the markdown carries HTML entities, because that is how the literals are
   written in the engine; a pupil's screen shows the decoded character, so the
   comparison has to be made on what she reads */
function decode(s) {
  return String(s)
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch (e) { return ''; } })
    .replace(/\\\|/g, '|')
    .replace(/\s+/g, ' ')
    .trim();
}

/* every OUTSTANDING row in the committed ledger, with where it lives */
function outstanding() {
  if (!fs.existsSync(LEDGER)) return [];
  const src = fs.readFileSync(LEDGER, 'utf8');
  const rows = [];
  src.split('\n').forEach((l) => {
    const m = /^\|\s*OUTSTANDING\s*\|\s*`([^`]*)`\s*\|\s*(.*?)\s*\|\s*$/.exec(l);
    if (!m) return;
    const text = decode(m[2]);
    if (text.length < MIN_CHARS) return;
    rows.push({ at: m[1], text: text });
  });
  return rows;
}

/* the page-side question. `texts` is the list of outstanding sentences; the
   answer is which of them the screen is actually rendering. Comparison is on
   whitespace-normalised visible text, because that is what she reads. */
const QUERY = (texts) => `((TEXTS) => {
  const vis = (e) => {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    const r = e.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const parts = [];
  document.querySelectorAll('.chunk-host, .badge-pop, .ols-modal, .pair-pop, .pair-wait, #help-modal')
    .forEach((root) => { if (vis(root)) parts.push(root.innerText || ''); });
  const seen = parts.join(' \\n ').replace(/\\s+/g, ' ');
  return TEXTS.filter((t) => seen.indexOf(t) !== -1);
})(${JSON.stringify(texts)})`;

const describe = (row, text) => text + '   [ledger row ' + row + ']';

module.exports = { LEDGER, outstanding, QUERY, decode, describe, EXEMPTIONS, MIN_CHARS };
