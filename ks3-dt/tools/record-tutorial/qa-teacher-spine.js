#!/usr/bin/env node
/* qa-teacher-spine.js — THE DECK, THE LESSON AND THE BRIEF ARE ONE SEQUENCE
 * (TEACHER_LAYER_TEMPLATE §6; the trap DFM 148 named before a line was written).
 *
 * The risk this exists for, in his own framing: the deck and the brief are two
 * VIEWS OF ONE ORDER. If a chunk moves, splits or is renamed, both go stale
 * together and a teacher stands in front of a class holding a brief that does
 * not match the board. Rule 144's family, across three files instead of two.
 *
 * So the lesson's own chunk list is the spine, and everything is held to it:
 *   (a) every deck section names a REAL chunk of its lesson, and the sections
 *       run in the lesson's own order — a deck cannot quietly reorder the hour;
 *   (b) every deck opens title + objectives (DFM 219c, "not up for debate");
 *   (c) every section that STOPS the room carries a real stop slide, because
 *       the stop is what makes the room's state unmistakable from the back row;
 *   (d) every slide carries speaker notes — the script IS the deck's second
 *       rendering (DFM 220b), and a slide with no notes is a slide a
 *       non-specialist cannot deliver;
 *   (e) the deck ends on a closer;
 *   (f) EVERY SLIDE NUMBER THE BRIEF PRINTS EXISTS. "Slides 12-13" in a run
 *       sheet, against a deck with eleven slides, is the exact stale-pair fault
 *       DFM 148 warned about — and it is invisible to every other gate.
 *
 * A planted fixture must fail each check, because a gate nobody has seen fail
 * is a gate nobody should trust (DFM 146a).
 *
 * Usage: node qa-teacher-spine.js        (exit 0 = pass, 1 = fail)
 */
const fs = require('fs');
const path = require('path');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

const fails = [];
const notes = [];
const fail = m => fails.push(m);

function load() {
  const out = [];
  for (const year of fs.readdirSync(SRC).filter(d => /^j\d$/.test(d)).sort()) {
    const dDir = path.join(SRC, year, 'decks');
    const lDir = path.join(SRC, year, 'lessons');
    if (!fs.existsSync(dDir)) continue;
    for (const f of fs.readdirSync(dDir).sort()) {
      if (!f.endsWith('.deck.json')) continue;
      const deck = JSON.parse(fs.readFileSync(path.join(dDir, f), 'utf8'));
      const lp = path.join(lDir, deck.lesson + '.json');
      if (!fs.existsSync(lp)) { fail(f + ': names lesson "' + deck.lesson + '", which has no lesson file'); continue; }
      out.push({ deck, lesson: JSON.parse(fs.readFileSync(lp, 'utf8')) });
    }
  }
  return out;
}

/* every slide, flattened, in the order the deck renders them — which is the
   order the numbers in the brief refer to */
function slidesOf(deck) {
  const out = [];
  (deck.sections || []).forEach(sec => (sec.slides || []).forEach(s => out.push({ s, sec })));
  return out;
}

/* the numbers a brief prints, from "· Slides 6-11" / "· Slide 13" in a row's
   part label. An en dash and a hyphen both appear in his own wordings. */
function slideRefs(brief) {
  const refs = [];
  (brief.runningTheHour || []).forEach(r => {
    const m = String(r.part || '').match(/Slides?\s+(\d+)\s*(?:[-–—]\s*(\d+))?/gi) || [];
    m.forEach(hit => {
      const nums = hit.match(/\d+/g).map(Number);
      refs.push({ row: r.part, from: nums[0], to: nums.length > 1 ? nums[1] : nums[0] });
    });
  });
  return refs;
}

function checkPair(deck, lesson) {
  const errs = [];
  const id = deck.lesson;
  const spine = (lesson.chunks || []).map(c => c.id);
  const flat = slidesOf(deck);

  /* (a) real chunks, in the lesson's order */
  let last = -1;
  (deck.sections || []).forEach(sec => {
    const i = spine.indexOf(sec.chunk);
    if (i === -1) {
      errs.push(id + ': deck section "' + sec.id + '" points at chunk "' + sec.chunk +
        '", which is not a chunk of this lesson (' + spine.join(', ') + ')');
      return;
    }
    if (i < last) {
      errs.push(id + ': deck section "' + sec.id + '" (chunk ' + sec.chunk + ') comes AFTER a ' +
        'section further down the lesson — the deck would walk the hour in a different order ' +
        'from the pupils\' own screens');
    }
    last = Math.max(last, i);
  });

  /* (b) the opening pair */
  if (flat.length < 2 || flat[0].s.kind !== 'title' || flat[1].s.kind !== 'objectives') {
    errs.push(id + ': the deck must open title then objectives (DFM 219c) — it opens ' +
      flat.slice(0, 2).map(f => f.s.kind || '?').join(' then '));
  }

  /* (c) a stopping section carries a stop slide */
  (deck.sections || []).forEach(sec => {
    if (sec.stop && !(sec.slides || []).some(s => s.kind === 'stop')) {
      errs.push(id + ': section "' + sec.id + '" is marked as a stop, but carries no stop slide — ' +
        'the room would be asked to face front with nothing on the board saying so');
    }
  });

  /* (d) every slide has its script */
  flat.forEach((f, i) => {
    if (!f.s.notes || !String(f.s.notes).trim()) {
      errs.push(id + ': slide ' + (i + 1) + ' ("' + String(f.s.heading || f.s.kind) +
        '") has no speaker notes — a teacher from another subject cannot deliver it');
    }
  });

  /* (e) it ends on a closer */
  if (flat.length && flat[flat.length - 1].s.kind !== 'closer') {
    errs.push(id + ': the deck does not end on a closer slide');
  }

  /* (f) every slide number the brief prints really exists */
  const refs = slideRefs(lesson.teacherBrief || {});
  refs.forEach(r => {
    if (r.to > flat.length || r.from < 1 || r.from > r.to) {
      errs.push(id + ': the run sheet row "' + String(r.row).slice(0, 50) + '" points at slide ' +
        (r.from === r.to ? r.from : r.from + '-' + r.to) + ', but the deck has ' + flat.length +
        ' slides. A teacher would be looking for a slide that is not there.');
    }
  });
  return { errs, slides: flat.length, refs: refs.length, spine: spine.length };
}

const pairs = load();
if (!pairs.length) fail('no decks found at all — the teacher layer cannot be checked');
pairs.forEach(p => {
  const r = checkPair(p.deck, p.lesson);
  r.errs.forEach(fail);
  notes.push(p.deck.lesson + ' — ' + (p.deck.sections || []).length + ' sections over a ' +
    r.spine + '-chunk spine · ' + r.slides + ' slides · ' + r.refs + ' slide reference(s) in the run sheet');
});

/* ---------- the controls: a planted fixture must fail every check --------- */
(function controls() {
  const ok = (cond, what) => {
    if (cond) notes.push('control: ' + what);
    else fail('A CONTROL FAILED — ' + what + '. This gate cannot be trusted until it is fixed.');
  };
  const goodLesson = {
    chunks: [{ id: 'hook' }, { id: 'build' }, { id: 'selfeval' }],
    teacherBrief: { runningTheHour: [{ part: 'The opening · Slides 1–2', mins: 60 }] }
  };
  const goodDeck = {
    lesson: 'j9-99',
    sections: [
      { id: 'opening', chunk: 'hook', slides: [
        { kind: 'title', notes: 'n' }, { kind: 'objectives', notes: 'n' }] },
      { id: 'build', chunk: 'build', stop: true, slides: [{ kind: 'stop', notes: 'n' }] },
      { id: 'closer', chunk: 'selfeval', slides: [{ kind: 'closer', notes: 'n' }] }
    ]
  };
  const clone = o => JSON.parse(JSON.stringify(o));

  ok(checkPair(goodDeck, goodLesson).errs.length === 0,
    'a well-formed fixture passes (the over-tightening guard — without this, every ' +
    'check below could be passing for the wrong reason)');

  let f = clone(goodDeck); f.sections[1].chunk = 'nowhere';
  ok(checkPair(f, goodLesson).errs.some(e => /not a chunk of this lesson/.test(e)),
    'a deck section pointing at a chunk the lesson does not have is REJECTED');

  f = clone(goodDeck); f.sections = [f.sections[0], f.sections[2], f.sections[1]];
  ok(checkPair(f, goodLesson).errs.some(e => /different order/.test(e)),
    'a deck that walks the hour in a different order from the lesson is REJECTED');

  f = clone(goodDeck); f.sections[0].slides[1].kind = 'bullets';
  ok(checkPair(f, goodLesson).errs.some(e => /title then objectives/.test(e)),
    'a deck that does not open title + objectives is REJECTED (DFM 219c)');

  f = clone(goodDeck); f.sections[1].slides[0].kind = 'bullets';
  ok(checkPair(f, goodLesson).errs.some(e => /carries no stop slide/.test(e)),
    'a section marked as a stop with no stop slide on it is REJECTED');

  f = clone(goodDeck); delete f.sections[1].slides[0].notes;
  ok(checkPair(f, goodLesson).errs.some(e => /no speaker notes/.test(e)),
    'a slide with no script is REJECTED — the notes are the deck\'s second rendering');

  f = clone(goodDeck); f.sections[2].slides[0].kind = 'bullets';
  ok(checkPair(f, goodLesson).errs.some(e => /end on a closer/.test(e)),
    'a deck that does not end on a closer is REJECTED');

  const l = clone(goodLesson); l.teacherBrief.runningTheHour[0].part = 'The opening · Slides 12–13';
  ok(checkPair(goodDeck, l).errs.some(e => /but the deck has 4 slides/.test(e)),
    'a run sheet pointing at "Slides 12-13" of a four-slide deck is REJECTED — the stale-pair ' +
    'fault DFM 148 named, and no other gate can see it');
})();

/* ---------- verdict ------------------------------------------------------ */
notes.forEach(n => console.log('  ' + n));
if (fails.length) {
  console.error('');
  console.error('qa-teacher-spine: FAILED — ' + fails.length + ' problem(s)');
  fails.forEach(f => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('qa-teacher-spine: PASSED — every deck walks its lesson\'s own order, opens ' +
  'title+objectives, stops where it says it stops, scripts every slide, and every slide ' +
  'number its brief prints exists');
