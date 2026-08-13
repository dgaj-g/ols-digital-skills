#!/usr/bin/env node
/* qa-verdict-coverage.js — NO UNJUDGED SURFACE (DFM 194/195d).
 *
 * The judged pass leaves evidence now: `COLD_READ_VERDICTS_L4_L5.md` carries a
 * row per pupil-visible surface, read as the child, PASS or FIX. This checks the
 * evidence actually covers the lesson as it now stands — because the round
 * CHANGED the lesson after those verdicts were written, and a verdict file that
 * silently stops covering the thing it judged is the same rot as a stale rule.
 *
 * Two levels, and the second is the one with teeth:
 *   1. every CHUNK a pupil walks through has at least one verdict row naming it;
 *   2. every SURFACE created or reworded in this round has its own row — those
 *      are listed explicitly below, because "it is probably covered by an older
 *      row" is exactly the assumption this file exists to remove.
 *
 * Usage: node qa-verdict-coverage.js
 */
const fs = require('fs');
const path = require('path');
const Q = require('./qa-language.js');

const VERDICTS = path.join(process.env.HOME,
  'Desktop/Claude Work/KS3 DT Platform/COLD_READ_VERDICTS_L4_L5.md');
const FAILS = [];
const check = (c, m) => { if (c) console.log('  PASS  ' + m); else { console.log('  FAIL  ' + m); FAILS.push(m); } };

if (!fs.existsSync(VERDICTS)) { console.error('no verdict file at ' + VERDICTS); process.exit(2); }
const text = fs.readFileSync(VERDICTS, 'utf8');
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const flat = norm(text);

/* a chunk is covered if the verdict file names it, by id or by the words of its
   own title — the rows are written in English, not in chunk ids */
const ALIAS = {
  hook: ['hook', 'mission briefing'],
  board: ['board', 'case board'],
  sign: ['sign', 'contract'],
  masterclass: ['masterclass'],
  build: ['build', 'studio sprint', 'qa criteria', 'blueprint'],
  press: ['press night', 'review desk', 'marquee'],
  ship: ['ship'],
  exit: ['exit check'],
  exitp: ['parsons', 'ordering puzzle'],
  selfeval: ['self review', 'selfeval', 'how did it go'],
  _recap: ['do now', 'recap']
};

console.log('qa-verdict-coverage — every surface she sees has a filed verdict (DFM 194)');
console.log('\n== 1. every chunk of Lessons 4 and 5 is named in the verdicts ==');
let n = 0;
['j1-04', 'j1-05'].forEach(id => {
  const L = Q.loadLessons().find(x => x.fileId === id);
  if (!L) return;
  (L.json.chunks || []).forEach(c => {
    n++;
    const names = (ALIAS[c.id] || [c.id]).concat(norm(c.title || '').split(' ').filter(w => w.length > 4));
    const covered = names.some(w => w && flat.indexOf(norm(w)) !== -1);
    check(covered, id + ' › ' + c.id + ' ("' + (c.title || '') + '") has a verdict row');
  });
});
check(n >= 14, 'every chunk of both lessons was checked (' + n + ')');

/* ------------------------------------------------------------------ *
 * 2. THE SURFACES THIS ROUND CREATED OR REWORDED. Each needs its OWN row:
 *    an older row about a different sentence does not judge a new one.
 * ------------------------------------------------------------------ */
const NEW_SURFACES = [
  ['the ship help opener', 'shipping your game takes three steps'],
  ['the evidence-c2 caption', 'the hunt is on'],
  ['the evidence-c2 alt text', 'chasing a fish'],
  ['the sealed case ribbons', 'sealed until case 01 closes'],
  ['the sealed-no-kit ribbon', 'sealed until you have the game'],
  ['the film-split signpost under the masterclass player', 'live on your studio desk'],
  ['the masterclass help after the split', 'wait on your studio desk'],
  ['the Studio Desk button for the worked example', 'the worked example the tests'],
  ['the Studio Desk button back to the first half', 'watch the first half again'],
  ['the studio + gallery strings migrated to content', 'studio and gallery engine strings']
];
console.log('\n== 2. every surface this round created or reworded has its own row ==');
NEW_SURFACES.forEach(([what, needle]) => {
  check(flat.indexOf(norm(needle)) !== -1, what + ' is judged in the verdict file');
});

console.log('\n' + (FAILS.length ? 'qa-verdict-coverage: ' + FAILS.length + ' SURFACE(S) WITH NO VERDICT' :
  'qa-verdict-coverage: every surface carries a verdict'));
process.exit(FAILS.length ? 1 : 0);
