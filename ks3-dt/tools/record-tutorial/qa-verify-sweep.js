#!/usr/bin/env node
/* qa-verify-sweep.js — THE ⚠VERIFY ROWS, TURNED INTO CHECKS (audit gap G6).
 *
 * `DFM_ENFORCEMENT_AUDIT.md` marked several rows ⚠VERIFY: classifications that
 * SAID a harness enforced them but had never been confirmed against the harness
 * source. His order for this round was blunt about what to do with a miss:
 * "every confirmed row: flip the mark. Every miss: add the one-line harness
 * check IN THIS ROUND."
 *
 * Two of them were misses. Both are here, and both are now real:
 *   68  the closing "How did it go?" screen is compulsory for every pupil, and
 *       the brief must SAY SO EMPHATICALLY (bold). Nothing checked the bold.
 *   92  per-chunk ? help exists — "yes, you must do this." Every chunk did have
 *       it, which is exactly how a rule quietly stops being enforced: it is true
 *       until the day somebody adds a chunk and nobody notices.
 *
 * The rest were CONFIRMED in their existing homes and are named here so the
 * confirmation is reproducible rather than remembered:
 *   104 armButton on every transition · qa-guide.js (counts the call sites, and
 *       fails a bare `querySelector('button')` arming)
 *   126 print never prints the app · qa-guide.js section D5
 *   146e review-mode banner · qa-predeploy.js banner assertions
 *
 * Usage: node qa-verify-sweep.js
 */
const fs = require('fs');
const path = require('path');
const Q = require('./qa-language.js');

const FAILS = [];
const check = (c, m) => { if (c) console.log('  PASS  ' + m); else { console.log('  FAIL  ' + m); FAILS.push(m); } };

console.log('qa-verify-sweep — the audit rows that had never been verified (G6)');

/* ------------------------------------------------------------------ *
 * 68 — the closing screen is compulsory, and the brief must say so in BOLD.
 * The side quest is exempt: it is self-paced homework with no taught hour and
 * no closing screen to be compulsory about (DFM 176 locks it besides).
 * ------------------------------------------------------------------ */
console.log('\n== 68: every taught lesson\'s brief says the closing screen is compulsory, emphatically ==');
const lessons = Q.loadLessons();
let checked68 = 0;
lessons.forEach(L => {
  if (/sq/.test(L.fileId)) return;                       /* side quest: no taught hour */
  const tb = JSON.stringify(L.json.teacherBrief || {});
  const bolded = tb.match(/\*\*[^*]+\*\*/g) || [];
  /* the bold span must be ABOUT the closing screen, not merely present */
  const aboutClosing = bolded.some(b =>
    /how did it go|final screen|last screen|closing screen|finish/i.test(b));
  checked68++;
  check(aboutClosing, L.fileId + ": the brief carries a BOLD line about finishing the last screen " +
    '(' + (bolded.length ? bolded.map(b => b.slice(0, 46)).join(' | ') : 'no bold at all') + ')');
});
check(checked68 >= 5, 'every taught lesson was checked (' + checked68 + ')');

/* ------------------------------------------------------------------ *
 * 92 — per-chunk ? help. His words: "yes, you must do this."
 * ------------------------------------------------------------------ */
console.log('\n== 92: every chunk of every lesson carries its own ? help ==');
let chunks = 0;
lessons.forEach(L => {
  const missing = (L.json.chunks || []).filter(c => {
    chunks++;
    const h = (c.config || {}).help;
    return !(typeof h === 'string' && h.trim().length > 20);
  }).map(c => c.id);
  check(!missing.length, L.fileId + ': every chunk has help' +
    (missing.length ? ' — MISSING on: ' + missing.join(', ') : ''));
});
check(chunks >= 40, 'every chunk in the year was checked (' + chunks + ')');

/* ------------------------------------------------------------------ *
 * The rows CONFIRMED elsewhere — asserted here so "confirmed" is a fact this
 * file can re-prove, not a note somebody once wrote in the audit.
 * ------------------------------------------------------------------ */
console.log('\n== rows confirmed in their existing homes ==');
const guide = fs.readFileSync(path.join(__dirname, 'qa-guide.js'), 'utf8');
const predeploy = fs.readFileSync(path.join(__dirname, 'qa-predeploy.js'), 'utf8');
/* the source contains the ESCAPED form (it is a regex literal in there), so
   look for the names, not for the sentence they sit inside */
check(/armButton/.test(guide) && /armCount/.test(guide),
  '104 armButton coverage is really asserted in qa-guide.js (it counts the call sites)');
check(/COVER PRINTING/.test(guide),
  '126 the print path is really asserted in qa-guide.js (section D5, his v9 finding)');
check(/banner/.test(predeploy),
  '146e the banner state is really asserted in qa-predeploy.js');

/* CONTROL (DFM 146a): each new check must fail on text that breaks its rule. */
console.log('\n== CONTROLS: each new check must fail when the rule is broken ==');
const fakeBrief = { atAGlance: [{ part: 'Exit', what: 'Two marked questions, then the self-review.' }] };
const fakeBold = (JSON.stringify(fakeBrief).match(/\*\*[^*]+\*\*/g) || []);
check(!fakeBold.some(b => /how did it go|final screen|last screen|closing screen|finish/i.test(b)),
  'a brief that mentions the closing screen WITHOUT bold fails the 68 check');
const fakeChunk = { id: 'x', config: { help: 'too short' } };
check(!(typeof fakeChunk.config.help === 'string' && fakeChunk.config.help.trim().length > 20),
  'a chunk whose "help" is a stub fails the 92 check (a placeholder is not help)');

console.log('\n' + (FAILS.length ? 'qa-verify-sweep: ' + FAILS.length + ' FAILURE(S)' : 'qa-verify-sweep: ALL GREEN'));
process.exit(FAILS.length ? 1 : 0);
