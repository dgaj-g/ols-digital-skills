#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   qa-brief-deck-link.js — DOES "PRINT THE DELIVERY SCRIPT" PRINT THIS LESSON'S?
   ═══════════════════════════════════════════════════════════════════════════
   Written 18 Aug 2026, while filling the two new briefs' deck rows.

   THE FAULT. The brief's "Print the delivery script" button carries the deck
   to fetch, and staff.js chose it like this:

       briefBody(r, r.fileId || ('j1/decks/j1-' + String(r.num).padStart(2,'0') + '.deck'))

   Neither server home has ever returned `fileId` on the brief payload — checked
   in `Code.gs.template` and in `dev-server.js`, both — so the fallback is not a
   fallback, it is the ONLY path, and it is hardcoded to J1. Every year's
   Lesson 1 has num 1, so the J2 brief's button printed **J1 Lesson 1's**
   delivery script, and so did J3's. The one year it was right for is the one
   year that existed when it was written.

   It is the DFM 234/238 shape again: a J1-shaped assumption meeting the first
   genuinely new year, invisible until something outside J1 asked the question.
   And it was invisible in the worst way — the button appeared, worked, printed
   a real script, and the script was another lesson's.

   THE SECOND HALF, found in the same read. The expression is always truthy, so
   the button rendered on EVERY brief, including the Side Quest — which is not
   teacher-delivered (DFM 220d), has no deck and never will. That button could
   only ever fail. A dead control breaks DFM 42/184.

   WHAT THIS GATE ASSERTS, against the BUILT shell he actually pastes (DFM 162b)
   as well as the source:
     1. no hardcoded year in the deck path — the pre-fix line is BANNED;
     2. the path is derived from the lesson's OWN manifest entry;
     3. the button is suppressed for a lesson with no deck (the Side Quest);
     4. and, over the real content: every lesson that HAS a brief resolves to a
        deck file that exists and whose id is that same lesson's.
   CONTROL: the pre-fix expression is run over the same content and must be
   shown to resolve J2 and J3 Lesson 1 to J1's deck — a gate that cannot
   reproduce the fault it was written for is not evidence (DFM 196).
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CONTENT = path.join(ROOT, 'content');
const STAFF = path.join(ROOT, 'platform', 'staff.js');
const BUILT = path.join(ROOT, 'platform', 'server', 'PathB_Index.html');

const fails = [];
const pass = m => console.log('  PASS  ' + m);
const fail = m => { fails.push(m); console.log('  FAIL  ' + m); };

/* the derivation, stated once here and asserted to be the shell's own (§1) */
const deckPathOf = entry =>
  (entry && entry.file) ? entry.file.replace('/lessons/', '/decks/').replace(/\.json$/, '.deck') : '';

/* what the shell used to do, kept ONLY as this gate's control */
const oldDeckPathOf = entry =>
  'j1/decks/j1-' + String(entry.num).padStart(2, '0') + '.deck';

function years() {
  return fs.readdirSync(CONTENT).filter(d => /^j\d$/.test(d) &&
    fs.existsSync(path.join(CONTENT, d, 'manifest.json')));
}
function lessonsOf(y) {
  return JSON.parse(fs.readFileSync(path.join(CONTENT, y, 'manifest.json'), 'utf8')).lessons || [];
}

/* ═════════ 1. THE SHELL, source AND built artefact ═════════ */
console.log('qa-brief-deck-link — the brief button must fetch ITS OWN lesson\'s deck\n');
console.log('1. the shell');
[['staff.js', STAFF], ['PathB_Index.html (the file he pastes)', BUILT]].forEach(([name, file]) => {
  const src = fs.readFileSync(file, 'utf8');
  if (/'j1\/decks\/j1-'\s*\+\s*String\(r\.num\)/.test(src)) {
    fail(name + ': the deck path is still hardcoded to J1 — every year\'s Lesson 1 has num 1, ' +
      'so a J2 or J3 brief prints J1\'s delivery script');
  } else {
    pass(name + ': no hardcoded year in the deck path');
  }
  if (/\.replace\('\/lessons\/',\s*'\/decks\/'\)\.replace\(\/\\\.json\$\/,\s*'\.deck'\)/.test(src)) {
    pass(name + ': the path is derived from the lesson\'s own manifest entry');
  } else {
    fail(name + ': the deck path is not derived from the lesson\'s own manifest entry ' +
      '(expected file.replace(\'/lessons/\',\'/decks/\')…)');
  }
  if (/le\.side\s*\?\s*''/.test(src)) {
    pass(name + ': a lesson with no deck (the Side Quest) gets no button');
  } else {
    fail(name + ': the Side Quest still renders a "Print the delivery script" button, ' +
      'and it has no deck to print (DFM 42/184 — a dead control)');
  }
});

/* ═════════ 2. THE CONTENT — every brief resolves to its own deck ═════════ */
console.log('\n2. every lesson that has a brief');
let checked = 0;
years().forEach(y => {
  lessonsOf(y).forEach(le => {
    if (!le.file) return;                       /* not built yet: no brief either */
    checked++;
    const p = deckPathOf(le);
    if (le.side) {
      if (fs.existsSync(path.join(CONTENT, p + '.json'))) {
        fail(le.id + ': it is not teacher-delivered but a deck file exists — decide which is true');
      } else {
        pass(le.id + ' (Side Quest): no deck, and the shell renders no button for it');
      }
      return;
    }
    const abs = path.join(CONTENT, p + '.json');
    if (!fs.existsSync(abs)) { fail(le.id + ': resolves to ' + p + '.json, which does not exist'); return; }
    /* the deck's OWN `lesson` field is the one that names the lesson: `id` is
       the packer's file id and reads "j2-01.deck". Comparing against `id` was
       this gate's own first version, and it condemned all five approved J1
       decks — DFM 146a, caught before it was trusted. */
    const deck = JSON.parse(fs.readFileSync(abs, 'utf8'));
    if (deck.lesson !== le.id) fail(le.id + ': resolves to a deck whose lesson is "' + deck.lesson + '"');
    else pass(le.id + ' → ' + p + '.json  (deck for ' + deck.lesson + ', ' +
      (deck.driveFileId ? 'live in Drive' : 'NOT YET CREATED') + ')');
  });
});
console.log('  ' + checked + ' lesson(s) with a brief checked across ' + years().length + ' year(s)');

/* ═════════ 3. THE CONTROL — the old expression must mislabel ═════════ */
console.log('\n3. control: the pre-fix expression, run over the same content');
const wrong = [];
years().forEach(y => lessonsOf(y).forEach(le => {
  if (!le.file || le.side) return;
  const was = oldDeckPathOf(le);
  if (was !== deckPathOf(le)) wrong.push(le.id + ' would have printed ' + was + '.json');
}));
if (wrong.length) {
  pass('the pre-fix expression sends ' + wrong.length + ' brief(s) to another lesson\'s deck:');
  wrong.forEach(w => console.log('          · ' + w));
} else {
  fail('the pre-fix expression resolves everything correctly — this gate has nothing to catch, ' +
    'so it is not evidence of anything (DFM 196)');
}

console.log('');
if (fails.length) {
  console.log('qa-brief-deck-link: ' + fails.length + ' FAILURE(S)');
  process.exit(1);
}
console.log('qa-brief-deck-link: ALL GREEN');
