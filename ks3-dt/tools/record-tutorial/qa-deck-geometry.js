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
const IMG = path.join(ROOT, 'platform', 'assets', 'img', 'deck');
const BUILDER = path.join(__dirname, '..', 'slides-deck', 'build-deck-gs.js');

const W = 720, H = 405;
const FLOOR_SIZE = 10;     /* below this a bullet is unreadable from the back row */

/* ═══════ THE SCREENSHOT FLOOR (DFM 237b, his K26 condition, 17 Aug 2026) ═════
   His words: "reuse but don't be lazy, check everything looks and reads well,
   and that screenshots are accurate and appear big enough in any slide deck."
   Accuracy already had a gate (qa-deck-shots). SIZE had none, and it turns out
   to matter more than anyone had measured.

   WHY A FLOOR CAN BE COMPUTED AT ALL. The renderer gives a single screenshot a
   250-point column beside its bullets and then shrinks it to fit the height left
   under the heading (`slideBullets_`); a ROW of screenshots on a stop slide gets
   an equal share of the width and the same height treatment (`shots_`). Both
   sums are deterministic and both are re-run below, against the real pixel size
   each shot recorded in its own manifest. So the width a class will actually see
   is a number, not an impression.

   WHERE THE NUMBER COMES FROM. The design's own allocation for one screenshot is
   250pt of a 720pt canvas. Below 60% of that — 150pt, a fifth of the slide — the
   class is being shown a stamp of a screen rather than the screen. It is the same
   kind of derivation as MAX_ASPECT's in the capture script: taken from what the
   renderer itself sets aside, not from what today's pictures happen to measure.

   AND IT FOUND FIVE IN DECKS HE HAS ALREADY APPROVED, which is why it prints
   them rather than hiding them: j1-05's closing-screen shot renders 82.5pt wide,
   j1-02's 100.8pt, j1-05's Press Night 135.9pt, j1-03's 138.1pt and j1-04's
   140.9pt. Those lessons are LOCKED (DFM 176/203) and re-cutting their shots
   means new captures, five deck rebuilds and 47 proof slides read again — his
   call, not a script's. So J1 is NAMED DEBT, printed on every run, and the floor
   BLOCKS for every deck built from the J2/J3 round onwards. */
const MIN_SHOT_W = 150;
const SHOT_HELD = new Set(['j2-01', 'j3-01']);

const fails = [];
const notes = [];
const shotDebt = [];

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

/* ═════════ HOW WIDE A SCREENSHOT REALLY LANDS, in slide points ═══════════════
   The two placements the renderer has, re-run here. `px` is the framed picture's
   own size, straight out of the shots manifest, so this is the arithmetic the
   deck will do on the real file — not an assumption about it. */
function shotWidths(s, sizeOf) {
  const out = [];
  const kind = s.kind || 'bullets';
  if (s.shot) {
    /* slideBullets_'s two-column shape: 250pt of width, cut down by the height
       left under the heading */
    const headBox = W - 88, headSize = 25;
    const top = headFloor(s.heading || '', headBox, headSize, 52, 104);
    const maxW = 250, maxH = H - (top + 16) - 34;
    const px = sizeOf(s.shot);
    if (!px) { out.push({ name: s.shot, w: null }); return out; }
    const ratio = px.w / px.h;
    let w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    out.push({ name: s.shot, w: w, h: h, px: px });
    return out;
  }
  if (s.shots && s.shots.length) {
    /* shots_'s row: an equal share of the width, placed under the bullets, so
       where the bullets end decides how much height is left */
    const headBox = W - (kind === 'stop' && s.beacon ? 100 : 44) - 44;
    const headSize = kind === 'stop' ? 24 : 25;
    const top = headFloor(s.heading || '', headBox, headSize, kind === 'stop' ? 50 : 52, 104);
    const boxW = W - 62 - 44;
    const room = (H - 120) - top;
    const fit = fitSize(s.bullets || [], boxW, room, 12.5, 1.2, 11);
    let y = top;
    for (const b of (s.bullets || [])) {
      y += Math.max(fit.lh + 11, lineCount(b, boxW, fit.size) * fit.lh + 11);
    }
    const shotTop = Math.max(y + 8, 214);
    const maxH = H - shotTop - 26;
    const gap = 12, cellW = (W - 88 - gap * (s.shots.length - 1)) / s.shots.length;
    for (const name of s.shots) {
      const px = sizeOf(name);
      if (!px) { out.push({ name, w: null }); continue; }
      const ratio = px.w / px.h;
      let h = maxH, w = h * ratio;
      if (w > cellW) { w = cellW; h = w / ratio; }
      out.push({ name, w: w, h: h, px: px });
    }
  }
  return out;
}

function judgeShotSizes(deckId, n, s, sizeOf) {
  const held = SHOT_HELD.has(deckId);
  for (const r of shotWidths(s, sizeOf)) {
    const where = deckId + ' slide ' + String(n).padStart(2, '0') + ' › shot "' + r.name + '"';
    if (r.w === null) {
      const msg = where + ': the shots manifest records no pixel size for it, so how big it ' +
        'lands on the slide cannot be measured. A screenshot nobody has measured is a ' +
        'screenshot nobody has checked (DFM 204).';
      if (held) fails.push(msg); else shotDebt.push(msg);
      continue;
    }
    if (r.w < MIN_SHOT_W) {
      const msg = where + ': renders ' + Math.round(r.w) + 'x' + Math.round(r.h) +
        'pt on a ' + W + 'pt slide — under the ' + MIN_SHOT_W + 'pt floor. It is ' +
        r.px.w + 'x' + r.px.h + ' at ' + (r.px.h / r.px.w).toFixed(2) +
        ':1, and the height left on that slide is what shrinks it. Photograph a ' +
        'wider, complete element, or move the shot to a slide with fewer bullets ' +
        'above it (DFM 237b).';
      if (held) fails.push(msg); else shotDebt.push(msg);
    }
  }
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
    /* each shot's real framed size, from the manifest the capture wrote */
    const manPath = path.join(IMG, d.lesson, 'shots-manifest.json');
    const man = fs.existsSync(manPath)
      ? (JSON.parse(fs.readFileSync(manPath, 'utf8')).shots || {}) : {};
    const sizeOf = (name) => {
      const px = (man[name] || {}).px;
      if (!px) return null;
      const m = /^(\d+)x(\d+)$/.exec(String(px));
      return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
    };
    let n = 0;
    for (const sec of d.sections || []) for (const s of sec.slides || []) {
      n++; slides++;
      judge(d.lesson, n, s, fails);
      judgeShotSizes(d.lesson, n, s, sizeOf);
    }
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

  /* ─── THE SCREENSHOT-FLOOR CONTROLS (DFM 237b), all three directions ───────
     A size gate that has never been watched to reject an undersized picture is a
     size gate nobody should trust — and one that rejects an honest picture is
     worse than none (DFM 146a). So: a crushed shot must fail, a properly sized
     shot must pass, and a shot with no recorded size must fail rather than be
     quietly skipped. Every one of them runs through the SAME judgeShotSizes the
     real decks run through. */
  const before = fails.length, debtBefore = shotDebt.length;

  /* (1) the real fault: a tall picture in a one-shot row under five bullets —
     exactly the shape that renders Lesson 5's closing screen 82pt wide */
  judgeShotSizes('j2-01', 99, {
    kind: 'stop', beacon: '1', heading: 'STOP — a control',
    bullets: Array.from({ length: 5 }, (_, i) =>
      'A bullet with enough words in it to run to two full lines on the slide, number ' + (i + 1) + '.'),
    shots: ['planted']
  }, () => ({ w: 1372, h: 1450 }));
  if (fails.length === before) {
    fails.push('THE UNDERSIZED-SHOT CONTROL PASSED. A 1372x1450 screenshot placed under five ' +
      'two-line bullets was accepted, and that shape renders about 82pt wide on a 720pt ' +
      'slide. This gate is not measuring size (DFM 237b).');
  } else {
    notes.push('control: a crushed screenshot (renders under ' + MIN_SHOT_W +
      'pt) is REJECTED on a held deck');
  }
  fails.length = before;

  /* (2) the over-tightening guard: the shape this round's decks actually use —
     one landscape shot beside its bullets — must pass */
  judgeShotSizes('j2-01', 98, {
    kind: 'bullets', heading: 'What the Snapshot looks like',
    bullets: ['One.', 'Two.', 'Three.', 'Four.'], shot: 'planted'
  }, () => ({ w: 1372, h: 900 }));
  if (fails.length !== before) {
    fails.push('THE OVER-TIGHTENING CONTROL FAILED. A landscape screenshot in its own 250pt ' +
      'column was reported as too small, which would fail honest work and teach everyone ' +
      'to ignore this gate (DFM 146a).');
    fails.length = before;
  } else {
    notes.push('control: a landscape shot in its own column PASSES (the over-tightening guard)');
  }

  /* (3) an unmeasured shot is a failure, never a skip (DFM 204) */
  judgeShotSizes('j2-01', 97, {
    kind: 'bullets', heading: 'A control', bullets: ['One.'], shot: 'nomanifest'
  }, () => null);
  if (fails.length === before) {
    fails.push('THE UNMEASURED-SHOT CONTROL PASSED. A shot whose manifest records no pixel ' +
      'size was accepted, so a picture nobody has measured would ship as though it had been.');
  } else {
    notes.push('control: a shot with no recorded pixel size is REJECTED, not skipped');
  }
  fails.length = before;

  /* (4) and the debt route: the same crushed shot on a LOCKED J1 deck is
     reported, not blocked — his call, printed loudly (DFM 221's pattern) */
  judgeShotSizes('j1-05', 96, {
    kind: 'stop', beacon: '1', heading: 'A control',
    bullets: Array.from({ length: 5 }, (_, i) => 'A bullet that runs to two lines, ' + (i + 1) + '.'),
    shots: ['planted']
  }, () => ({ w: 1372, h: 1450 }));
  if (fails.length !== before) {
    fails.push('A LOCKED J1 DECK WAS BLOCKED by the size floor. J1 is closed for changes ' +
      '(DFM 176/203) and its rows are debt, not failures — this gate would stop every pack ' +
      'until he ruled.');
    fails.length = before;
  } else if (shotDebt.length === debtBefore) {
    fails.push('THE DEBT CONTROL PASSED SILENTLY. A crushed shot on a locked deck was neither ' +
      'blocked nor named, so the floor would read as coverage J1 does not have (DFM 200/204).');
  } else {
    notes.push('control: a crushed shot on a LOCKED J1 deck is NAMED AS DEBT, not blocked');
  }
  shotDebt.length = debtBefore;
})();

console.log('qa-deck-geometry: ' + slides + ' slide(s) across ' + decks + ' deck(s)' +
  ' · screenshot floor ' + MIN_SHOT_W + 'pt, held on ' + [...SHOT_HELD].join(', '));
notes.forEach(n => console.log('  ' + n));
/* debt prints on EVERY run, pass or fail — a bounded check that stays quiet about
   what it skipped reads as coverage it does not have (DFM 200/204) */
if (shotDebt.length) {
  console.log('');
  console.log('  NAMED DEBT — ' + shotDebt.length + ' screenshot(s) on LOCKED J1 decks render under the');
  console.log('  ' + MIN_SHOT_W + 'pt floor. Re-cutting them means new captures, a deck rebuild each and');
  console.log('  every proof slide read again, so it is HIS call (DFM 176/203/221), not a script\'s:');
  shotDebt.forEach(d => console.log('    · ' + d.replace(/\s+/g, ' ')));
}
if (fails.length) {
  console.error('\nqa-deck-geometry: FAILED — ' + fails.length + ' problem(s)');
  fails.forEach(f => console.error('  ✗ ' + f));
  console.error('\nA slide that does not fit is not a wording problem: it is a line printed on\n' +
    'top of another line, eight feet wide, in front of a class.');
  process.exit(1);
}
console.log('qa-deck-geometry: PASSED');
