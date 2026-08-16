#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   qa-deck-geometry.js — WILL THIS SLIDE FIT, AND WILL IT OVERLAP ITSELF?
   ═══════════════════════════════════════════════════════════════════════════
   Written 16 Aug 2026, after reading 46 rendered slides and finding four faults
   that no machine on this project could have seen:

     · Lesson 4's heading wrapped to a second line and printed underneath its
       own first bullet;
     · Lesson 5's Studio Sprint lost its last line off the bottom edge;
     · Lesson 3's closer printed "See you in a fortnight." on top of "waiting
       for you.";
     · every deck's objectives slide said "LESSON 1", because the label was a
       string literal in the renderer.

   WHY NOTHING CAUGHT THEM. Every existing deck gate asks about MEANING —
   qa-teacher-spine (do the sections match the lesson), qa-deck-shots (is this
   really that screen), qa-deck-no-answers (does a slide give the game away),
   qa-language (would a child understand the words). Not one of them asks the
   question a projector asks: DOES IT FIT. The deck is built inside Google
   Slides, where nothing local can render it, and that fact had been allowed to
   mean "so nothing local can check it" — which is the DFM 204/206 disease:
   coverage that does not exist, printing nothing.

   It can be checked, because the renderer's own arithmetic is deterministic and
   lives in ONE place (lineCount_, DFM 225e). This gate re-runs that arithmetic
   over the packed deck data and fails when a slide would overflow its page, or
   when a block would be drawn on top of another. It is not a picture of the
   slide; it is the same sum the renderer does, done before the deck is built
   rather than discovered on a proof afterwards.

   THE PROOF READ IS NOT REPLACED BY THIS. Template §4b stands: every slide is
   still read, eyes on pixels, before a deck is called ready. This gate exists
   so that the read stops finding arithmetic — the class of fault a machine
   should never have left for a human.
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CONTENT = path.join(ROOT, 'content');
const BUILDER = path.join(__dirname, '..', 'slides-deck', 'build-deck-gs.js');

const W = 720, H = 405;
const FLOOR_SIZE = 10;     /* below this a bullet is unreadable from the back row */

const fails = [];
const notes = [];

/* the renderer's own line count, kept identical on purpose (DFM 144: one fact,
   one home — if this ever diverges, the gate is lying about the deck) */
function lineCount(str, boxW, size) {
  const perChar = 0.60 * (size || 13);
  const perLine = Math.max(8, Math.floor(boxW / perChar));
  const words = String(str == null ? '' : str).split(/\s+/);
  let lines = 1, cur = 0;
  for (const w of words) {
    if (!w) continue;
    const add = w.length + (cur ? 1 : 0);
    if (cur > 0 && cur + add > perLine) { lines++; cur = w.length; }
    else cur += add;
  }
  return lines;
}

function headFloor(heading, boxW, size, top, floor) {
  return Math.max(floor, top + lineCount(heading, boxW, size) * (size * 1.25) + 18);
}

function fitSize(arr, boxW, avail, base, lhFactor, gap) {
  for (let s = base; s >= base - 3.5; s -= 0.5) {
    if (s < 9) break;
    const lh = s * lhFactor;
    let tot = 0;
    for (const b of arr) tot += Math.max(gap + lh, lineCount(b, boxW, s) * lh + gap);
    if (tot <= avail) return { size: s, lh, fitted: true };
  }
  const sm = Math.max(9, base - 3.5);
  return { size: sm, lh: sm * lhFactor, fitted: false };
}

function blockHeight(arr, boxW, size, lh, gap) {
  let tot = 0;
  for (const b of arr) tot += Math.max(gap + lh, lineCount(b, boxW, size) * lh + gap);
  return tot;
}

/* ─────────────────── the check, per slide kind ─────────────────── */
function judge(deckId, n, s, out) {
  const kind = s.kind || 'bullets';
  const arr = s.bullets || [];
  const say = (msg) => out.push(deckId + ' slide ' + String(n).padStart(2, '0') + ' (' +
    (s.heading || kind).slice(0, 46) + '): ' + msg);

  if (kind === 'title' || kind === 'step') return;   /* fixed single-block layouts */

  if (kind === 'closer') {
    const BOX = W - 220, GAP = 12, BAND_TOP = 150, BAND_BOTTOM = H - 74;
    const fit = fitSize(arr, BOX, BAND_BOTTOM - BAND_TOP, 13, 1.462, GAP);
    const tot = blockHeight(arr, BOX, fit.size, fit.lh, GAP) - (arr.length ? GAP : 0);
    if (!fit.fitted) {
      say('the closing paragraphs need ' + Math.round(tot) + 'pt in a ' +
        (BAND_BOTTOM - BAND_TOP) + 'pt band even at ' + fit.size + 'pt — the sign-off would be ' +
        'printed on top of the last line. Cut a paragraph.');
    } else if (fit.size < 12) {
      say('the closing paragraphs only fit at ' + fit.size + 'pt, which is small for a projector');
    }
    return;
  }

  const headSize = kind === 'objectives' ? 27 : (kind === 'stop' ? 24 : 25);
  const headBox = W - (kind === 'stop' && s.beacon ? 100 : 44) - 44;
  const headLines = lineCount(s.heading || '', headBox, headSize);
  const top = headFloor(s.heading || '', headBox, headSize, kind === 'stop' ? 50 : 52,
    kind === 'objectives' ? 108 : 104);

  let fit, boxW, room;
  if (kind === 'stop') {
    boxW = W - 62 - 44;
    room = (H - (s.shots && s.shots.length ? 120 : 22)) - top;
    fit = fitSize(arr, boxW, room, 12.5, 1.2, 11);
  } else if (s.shot) {
    boxW = 330;
    room = (H - 22) - top;
    fit = fitSize(arr, boxW, room, s.size ? s.size - 2 : 11.5, 1.304, 12);
  } else {
    boxW = W - 66 - 44;
    room = (H - 24) - top;
    fit = fitSize(arr, boxW, room, (kind === 'objectives' ? 13.5 : (s.size ? s.size - 2 : 13)), 1.462, 12);
  }

  const tot = blockHeight(arr, boxW, fit.size, fit.lh, 12);
  if (!fit.fitted) {
    say('the bullets need ' + Math.round(tot) + 'pt of the ' + Math.round(room) +
      'pt left under the heading, even at ' + fit.size + 'pt — the last line would fall off the ' +
      'slide. Cut a bullet or shorten one.');
  } else if (fit.size < FLOOR_SIZE) {
    say('the bullets only fit at ' + fit.size + 'pt, under the ' + FLOOR_SIZE +
      'pt floor for a projected slide');
  }
  if (headLines > 2) {
    say('the heading wraps to ' + headLines + ' lines, which leaves the slide top-heavy');
  }
}

/* ─────────────────── every packed deck ─────────────────── */
let slides = 0, decks = 0;
const years = fs.existsSync(CONTENT) ? fs.readdirSync(CONTENT).filter(f => /^j\d$/.test(f)) : [];
for (const year of years) {
  const dir = path.join(CONTENT, year, 'decks');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.deck.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    decks++;
    let n = 0;
    for (const sec of d.sections || []) for (const s of sec.slides || []) { n++; slides++; judge(d.lesson, n, s, fails); }
  }
}

/* ───────── THE LABEL IS DERIVED, NEVER TYPED (finding 1's ratchet) ─────────
   The objectives slide said "LESSON 1" on all five decks because the renderer
   carried the words as a literal. Anything a grep can find, a harness should be
   watching (DFM 150). */
if (fs.existsSync(BUILDER)) {
  const src = fs.readFileSync(BUILDER, 'utf8');
  const hard = src.match(/kicker_\([^)]*?'(LESSON|lesson)\s*\d[^)]*?\)/g);
  if (hard) {
    fails.push('the renderer hardcodes a lesson label: ' + hard[0] +
      ' — a slide that names its own lesson derives it from the deck id, or it is right on ' +
      'exactly one deck and wrong on every other.');
  } else {
    notes.push('the objectives kicker is derived from the deck id, not typed');
  }
  if (!/function\s+lessonKicker_/.test(src)) {
    fails.push('lessonKicker_ is gone from the renderer — finding 1 has no home');
  }
}

/* ───────── THE CONTROLS (DFM 196), both directions (DFM 146a) ───────── */
(function controls() {
  const planted = [];
  judge('CONTROL', 1, {
    kind: 'bullets',
    heading: 'A heading long enough that it certainly wraps onto a second line and then some more',
    bullets: Array.from({ length: 9 }, (_, i) =>
      'A bullet with enough words in it to take two full lines of the slide at the usual size, number ' + (i + 1) + '.')
  }, planted);
  if (!planted.length) {
    fails.push('THE OVERFLOW CONTROL PASSED. Nine two-line bullets under a wrapped heading were ' +
      'judged to fit a 405pt slide, so this gate is not measuring anything.');
  } else {
    notes.push('control: a slide with nine two-line bullets was REJECTED');
  }

  const planted2 = [];
  judge('CONTROL', 2, {
    kind: 'closer',
    heading: 'Before you leave',
    bullets: Array.from({ length: 7 }, (_, i) =>
      'A closing paragraph that runs to two lines on the centred box, number ' + (i + 1) + ', with a few more words.')
  }, planted2);
  if (!planted2.length) {
    fails.push('THE CLOSER CONTROL PASSED. Seven two-line paragraphs were judged to fit the band ' +
      'above the sign-off — the exact fault found on Lesson 3.');
  } else {
    notes.push('control: a closer that would print over its own sign-off was REJECTED');
  }

  const planted3 = [];
  judge('CONTROL', 3, {
    kind: 'bullets', heading: 'A short heading',
    bullets: ['One short bullet.', 'Another short bullet.']
  }, planted3);
  if (planted3.length) {
    fails.push('THE OVER-TIGHTENING CONTROL FAILED. Two short bullets under a one-line heading ' +
      'were reported as overflowing, which would teach everyone to ignore this gate (DFM 146a).');
  } else {
    notes.push('control: an ordinary slide PASSES (the over-tightening guard)');
  }
})();

console.log('qa-deck-geometry: ' + slides + ' slide(s) across ' + decks + ' deck(s)');
notes.forEach(n => console.log('  ' + n));
if (fails.length) {
  console.error('\nqa-deck-geometry: FAILED — ' + fails.length + ' problem(s)');
  fails.forEach(f => console.error('  ✗ ' + f));
  console.error('\nA slide that does not fit is not a wording problem: it is a line printed on\n' +
    'top of another line, eight feet wide, in front of a class.');
  process.exit(1);
}
console.log('qa-deck-geometry: PASSED');
