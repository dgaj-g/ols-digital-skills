#!/usr/bin/env node
/* qa-brief-shape.js — THE BRIEF IS THE SHAPE HE ORDERED (DFM 227, 15 Aug 2026).
 *
 * His instructions, and what each one is held to here:
 *
 *   (a) SECTION ORDER, ALL BRIEFS — purpose → preparing → resources → running
 *       the hour → the breakdown → what commonly goes wrong. Checked against
 *       the RENDERER, because that is what a teacher actually reads; the order
 *       lives in one place in staff.js and nothing else decides it.
 *   (b) THE RETITLE — "Breakdown of what the pupils will actually do".
 *   (c) "IF YOU FALL BEHIND" IS GONE — from every brief AND from the renderer,
 *       so a brief that still carried the key could not print a heading he has
 *       deleted.
 *   (d) THE MINUTES SUM TO THE HOUR. Held only against briefs whose teacher
 *       layer has actually been built to the template — Lesson 1 today. The
 *       rest are PRINTED AS NAMED DEBT every run: their labels are the old
 *       design numbers, and what to cut in a lesson is his call (DFM 46/E-07),
 *       not something a script should invent while nobody is looking. When
 *       L2-L5's teacher layers are authored, their ids join REDESIGNED here.
 *   (e) ONE HOME FOR THE MINUTES (DFM 144). The run sheet owns them. The
 *       breakdown that now sits directly beneath it must not carry its own
 *       per-part minutes — Lesson 1's summed to 62 against a table saying 60,
 *       with the exam showing 15 against a row saying 10.
 *
 * Every check has a planted control that must fail, run through the same code
 * the real briefs use.
 *
 * Usage: node qa-brief-shape.js        (exit 0 = pass, 1 = fail)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
/* the briefs are read from SOURCE, the same place qa-language reads: the packed
   copies are encrypted for the server, so a gate that read `content/` would
   quietly find no briefs at all and pass everything */
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const STAFF = path.join(ROOT, 'platform', 'staff.js');
/* the SECOND renderer of the same brief — the markdown preview a reviewer reads
   without deploying. Two renderers of one document are two homes for the order
   (DFM 144), and this one had quietly kept "the girls" long after rule 26. */
const PREVIEW = path.join(ROOT, 'tools', 'brief-preview.js');

/* The briefs whose teacher layer has been BUILT to TEACHER_LAYER_TEMPLATE, and which
   are therefore HELD to the hour rather than merely reported on.
   j1-02..05 joined on 15 Aug 2026 with the L2-L5 teacher-layer round (DFM 228). That
   leaves the SIDE QUEST as the only named debt — and it is debt by his own ruling, not
   by omission: the side quest is not teacher-delivered, so DFM 220(d) kept it out of
   this round deliberately. When a lesson's teacher layer is built, its id joins here in
   the same commit; a lesson that is merely PASSING at 60 without being listed is
   passing by luck, which is not the same thing. */
/* j2-01 and j3-01 joined on 17 Aug 2026 with the J2/J3 Lesson 1 teacher layer
   (K26/K27). J2's paper hour was 57 and J3's was 60 before the teacher's own
   front-of-room minutes were added; both tables are re-derived from the built
   chunks and then labelled to exactly 60, which is his delegation in DFM 228(e)
   ("shaving time from some lesson sections while adding some to others"). Where
   each minute moved is written down in PROGRESS_J2J3_L1_TEACHER.md rather than
   left as arithmetic nobody can audit. */
const REDESIGNED = new Set(['j1-01', 'j1-02', 'j1-03', 'j1-04', 'j1-05', 'j2-01', 'j3-01']);
const HOUR = 60;

const ORDER = [
  'The purpose of this lesson',
  'Preparing for this lesson',
  'Resources for this lesson',
  'Running the hour',
  'Breakdown of what the pupils will actually do',
  'What commonly goes wrong, and what to do'
];

const fails = [];
const notes = [];
const fail = m => fails.push(m);

/* ---------- (a,b,c) the renderer, which is what she reads ---------------- */
function headingsIn(src) {
  /* the brief body builder only — the staff tools have other <h4>s */
  /* start AFTER the pre-2026 legacy shape's early return — those briefs render
     their own headings and no lesson uses them any more, but their strings are
     still in the file and would otherwise be read as the modern order */
  const from = src.indexOf('function briefBody(');
  const legacy = src.indexOf("if ((r.purpose || []).length) {", from);
  const to = src.indexOf('\n  }', src.indexOf('return out;', from));
  const body = src.slice(legacy > from ? legacy : from, to > from ? to : undefined);
  const out = [];
  const re = /<h4>([^<']+)<\/h4>/g;
  let m;
  while ((m = re.exec(body))) out.push(m[1].trim());
  /* the legacy pre-2026 brief shape renders its own headings and is untouched */
  return out.filter(h => !/^(Why the lesson is built this way|Pitfalls)$/.test(h));
}

function checkOrder(headings) {
  const errs = [];
  const wanted = ORDER.filter(h => headings.indexOf(h) !== -1);
  const got = headings.filter(h => ORDER.indexOf(h) !== -1);
  ORDER.forEach(h => {
    if (headings.indexOf(h) === -1) errs.push('the brief never renders "' + h + '"');
  });
  if (got.join(' → ') !== wanted.join(' → ')) {
    errs.push('the sections render in the wrong order.\n      wanted: ' +
      wanted.join(' → ') + '\n      got   : ' + got.join(' → '));
  }
  if (headings.some(h => /if you fall behind/i.test(h))) {
    errs.push('"If you fall behind" is still rendered — he removed it entirely');
  }
  if (headings.some(h => h === 'What the pupils will actually do')) {
    errs.push('the breakdown still carries its old title');
  }
  return errs;
}

const staffSrc = fs.readFileSync(STAFF, 'utf8');
const headings = headingsIn(staffSrc);
checkOrder(headings).forEach(e => fail('the brief renderer: ' + e));
notes.push('renderer order   : ' + headings.join(' → '));

const previewSrc = fs.readFileSync(PREVIEW, 'utf8');
const pv = [];
const pre = /out\.push\('## ([^']+)'\)/g;
let pm;
while ((pm = pre.exec(previewSrc))) pv.push(pm[1].trim());
const pvModern = pv.filter(h => !/^Why the lesson is built this way$/.test(h));
checkOrder(pvModern).forEach(e => fail('brief-preview.js: ' + e));
if (pvModern.join('|') !== headings.join('|')) {
  fail('the two renderers of the brief disagree.\n      staff.js       : ' +
    headings.join(' → ') + '\n      brief-preview  : ' + pvModern.join(' → '));
}
notes.push('preview order    : ' + pvModern.join(' → ') + '  (agrees)');

/* ---------- (c,d,e) every brief's own content ---------------------------- */
function briefsOf() {
  const out = [];
  for (const year of fs.readdirSync(SRC).filter(d => /^j\d$/.test(d)).sort()) {
    const dir = path.join(SRC, year, 'lessons');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      if (!f.endsWith('.json')) continue;
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (d.teacherBrief) out.push({ id: d.id || f.replace(/\.json$/, ''), brief: d.teacherBrief });
    }
  }
  return out;
}

function checkBrief(id, b) {
  const errs = [];
  if ('ifBehind' in b) {
    errs.push('still carries an "If you fall behind" section — removed entirely, all briefs');
  }
  (b.atAGlance || []).forEach(g => {
    if (Number(g.mins)) {
      errs.push('the breakdown row "' + String(g.part).slice(0, 40) +
        '" carries its own ' + Number(g.mins) + '-minute label. The run sheet owns the ' +
        'minutes (DFM 144) — two sets of numbers on one page contradict each other');
    }
  });
  const rows = b.runningTheHour || [];
  /* (f) THE MINUTES ARE NUMBERS, AND THE SUM NEVER COERCES ONE QUIETLY.
     `Number(r.mins) || 0` reads the string "7" as 7 and says nothing, so a row
     could carry a minute label of the wrong TYPE for ever and every sum would
     still look right — until the day someone wrote "7 " or "seven" and the row
     silently became a zero that still added up. A label that is not a number is
     a fault the moment it exists, in every brief, built teacher layer or not:
     this check is about the type, not about the hour. (L5 spec §6.1.) */
  rows.forEach((r, i) => {
    if (r.mins === undefined || r.mins === null) return;
    if (typeof r.mins !== 'number' || !Number.isFinite(r.mins)) {
      errs.push('run-sheet row ' + (i + 1) + ' ("' + String(r.part || '').slice(0, 40) +
        '") carries mins as ' + typeof r.mins + ' ' + JSON.stringify(r.mins) +
        ', not a number. The sum would coerce it silently — a label of the wrong ' +
        'type is a fault before it is ever wrong');
    }
  });
  if (REDESIGNED.has(id) && rows.length) {
    const sum = rows.reduce((a, r) => a + (Number(r.mins) || 0), 0);
    if (sum !== HOUR) {
      errs.push('the run sheet labels add up to ' + sum + ' minutes, not ' + HOUR +
        '. His ruling: the labels sum to the hour, and "it will all work out on the day"');
    }
  }
  return errs;
}

const briefs = briefsOf();
briefs.forEach(b => checkBrief(b.id, b.brief).forEach(e => fail(b.id + ': ' + e)));

const debt = briefs.filter(b => !REDESIGNED.has(b.id) && (b.brief.runningTheHour || []).length)
  .map(b => ({ id: b.id, sum: (b.brief.runningTheHour || []).reduce((a, r) => a + (Number(r.mins) || 0), 0) }))
  .filter(x => x.sum !== HOUR);

notes.push(briefs.length + ' brief(s) read; ' + REDESIGNED.size + ' held to the hour');

/* ---------- the controls (DFM 196: controls before credit) --------------- */
(function controls() {
  const ok = (cond, what) => {
    if (cond) notes.push('control: ' + what);
    else fail('A CONTROL FAILED — ' + what + '. This gate cannot be trusted until it is fixed.');
  };
  ok(checkBrief('j1-01', { runningTheHour: [{ part: 'x', mins: 61 }] })
    .some(e => /add up to 61/.test(e)),
    'a redesigned brief labelled 61 of 60 is REJECTED');
  ok(checkBrief('j1-01', { runningTheHour: [{ part: 'x', mins: 60 }] }).length === 0,
    'and one labelled exactly 60 passes (over-tightening guard)');
  ok(checkBrief('j1-01', { ifBehind: 'anything', runningTheHour: [{ mins: 60 }] })
    .some(e => /If you fall behind/.test(e)),
    'a brief that still carries "If you fall behind" is REJECTED');
  ok(checkBrief('j1-01', { atAGlance: [{ part: 'Badge 4', mins: 15 }], runningTheHour: [{ mins: 60 }] })
    .some(e => /15-minute label/.test(e)),
    'a breakdown row carrying its own minutes is REJECTED (the 62-against-60 clash)');
  ok(checkBrief('j1-99', { runningTheHour: [{ part: 'The masterclass', mins: '7' }] })
    .some(e => /carries mins as string "7"/.test(e)),
    'a run-sheet row whose minutes are the STRING "7" is REJECTED, in a brief whose ' +
    'teacher layer is not built yet — the type is wrong wherever it appears');
  ok(checkBrief('j1-99', { runningTheHour: [{ part: 'x', mins: 7 }] })
    .every(e => !/carries mins as/.test(e)),
    'and the number 7 in the same row passes (over-tightening guard)');
  ok(checkBrief('j1-99', { runningTheHour: [{ part: 'x' }] })
    .every(e => !/carries mins as/.test(e)),
    'and a row with no minutes at all is not invented into a fault');
  ok(checkBrief('j1-99', { runningTheHour: [{ part: 'x', mins: 67 }] }).length === 0,
    'while a brief whose teacher layer is not built yet is not failed for it — it is named as debt');
  ok(checkOrder(['The purpose of this lesson', 'Breakdown of what the pupils will actually do',
    'Preparing for this lesson', 'Resources for this lesson', 'Running the hour',
    'What commonly goes wrong, and what to do']).some(e => /wrong order/.test(e)),
    'the pre-ruling order (breakdown second) is REJECTED');
  ok(checkOrder(ORDER.slice()).length === 0,
    'and his order passes (over-tightening guard)');
  ok(checkOrder(ORDER.concat(['If you fall behind'])).some(e => /still rendered/.test(e)),
    'a renderer that still prints "If you fall behind" is REJECTED');
})();

/* ---------- verdict ------------------------------------------------------ */
notes.forEach(n => console.log('  ' + n));
if (debt.length) {
  console.log('');
  console.log('  NAMED DEBT — briefs whose teacher layer has not been built yet, so their');
  console.log('  minute labels are still the old design numbers. What to cut in a lesson is');
  console.log('  HIS call (DFM 46/E-07); these are relabelled in their own teacher-layer round.');
  debt.forEach(x => console.log('    · ' + x.id + ' — labels sum to ' + x.sum + ', not ' + HOUR));
}
if (fails.length) {
  console.error('');
  console.error('qa-brief-shape: FAILED — ' + fails.length + ' problem(s)');
  fails.forEach(f => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('qa-brief-shape: PASSED — his section order, no "If you fall behind" anywhere, ' +
  'one home for the minutes, minutes that are really numbers, and ' + REDESIGNED.size +
  ' brief(s) held to exactly ' + HOUR + ' (' + [...REDESIGNED].join(', ') + ')');
