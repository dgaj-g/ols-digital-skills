#!/usr/bin/env node
/* extract-transcript.js — WHAT SHE ACTUALLY READS, IN THE ORDER SHE READS IT.
 *
 * G-D3's first half. The separated judge is handed this and the checklist, and
 * nothing else: no design pack, no diff, no source, no content map, no
 * authoring conversation (DFM 270). That is a rule about the reader's CONTEXT,
 * not about their diligence — a judge who has seen the reasoning cannot unsee
 * it, and will read past the sentence that a pupil would stop at.
 *
 * So the transcript has to be the rendered text, in her order, and it has to
 * carry its own hash: `qa-cold-read` refuses a verdict filed against a hash
 * that is not the current one, which is what stops a judgement quietly
 * outliving the sentence it was about.
 *
 * The walkers write the raw order (out/transcript/<book>.txt and teacher.txt);
 * this file gives each one its header, its hash and its shape.
 */
'use strict';
const fs = require('fs');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { sha1 } = require('./lib/hash.js');

const TIER = 'full';
const ORDER = 90;
const COVERS = { books: '*', kinds: [], surfaces: '*', widths: [], projector: false, tier: ['preview'], cells: ['verdict'] };
const CONTROLS = [
  { id: 'no-walk-no-transcript', kind: 'fixture', plant: 'sidecar.stale.json', mustFail: /no transcript/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('extract-transcript');
g.exempt(['a transcript is the RENDERED text only: a sentence that exists in a file and never reaches a screen is the strings ledger\'s business, not the judge\'s']);

/* ── THE v4 TRANSCRIPT: WHAT IS NEW SINCE THE APPROVED BUILD ────────────
   Angles and Algebra are approved and live, so their words are not re-opened
   (rule 30). But the SHELL those words now sit in is entirely new, and a
   pupil's transcript for a book is mostly the book. If the judge were only
   ever handed a book, every sentence the v4 build wrote — the cover, the
   shelf, the dock, the marking feedback, the outbox — would ride in on an
   approval that was never about it.
   So a third transcript is taken: every sentence the app itself says (both
   GJ_STRINGS tables), minus anything whose exact text was already on screen at
   45b03ed. What is left is what this build wrote, and it is what gets judged. */
function oldText() {
  const { execFileSync } = require('child_process');
  const out = new Set();
  ['script.js', 'jotter.js', 'staff.js', 'player.js'].forEach(f => {
    let src = '';
    try { src = execFileSync('git', ['show', '45b03ed:maths/glass-jotter/' + f], { cwd: A.APP, encoding: 'utf8', maxBuffer: 32e6 }); }
    catch (e) { return; }
    (src.match(/'((?:[^'\\]|\\.)*)'/g) || []).forEach(q => out.add(q.slice(1, -1).replace(/\\'/g, "'").trim()));
  });
  return out;
}
/* WHAT A JUDGE IS HANDED HAS TO BE WHAT IS ON THE SCREEN. Two things were
   wrong with this list and the judge said so, which is what a separated judge
   is for: the sentences carried their template holes ({value}, {book}) rather
   than a value a reader would actually see, and a sentence the language gate
   had flagged for a human to read reached no transcript at all if its text
   predated v4 - so nobody had ever read the ones most in need of reading. */
/* EVERY placeholder the string tables use, derived once from the tables
   themselves - a hole left unfilled shows the judge a raw brace and gets read,
   fairly, as a fault on the screen. The list below is checked against the
   tables at run time and the gate says so if a new hole appears. */
const SAMPLE = {
  answer: '62', book: 'Angles', 'class': '10A-Maths', done: '5', email: 'aoife.gartland@c2ken.net',
  exercise: 'Ex 2', got: '6', max: '8', minutes: '20', name: 'Aoife',
  question: 'Q4', reason: 'angles on a straight line add to 180', step: '2',
  target: 'a', text: 'ols.link/10a', title: 'Angles', total: '8',
  value: '65', verdict: 'right',
  /* the Handling Data book's own holes, filled with what its screens really
     put in them: an ordered list, the two neighbours a halfway position is
     averaged from, the unit a cumulative row counts up to, and a point read
     off the curve */
  list: '4, 7, 7, 9, 12, 15, 21', a: '9', b: '12', unit: 'minutes',
  x: '30', y: '18',
  /* the stage instructions' live counts (11 Sept 2026): "3 still to place",
     "2 of 5 placed" */
  n: '3', m: '5',
  /* the plotting instruction names the next point (12 Sept 2026): "Next:
     across 15, up 18" - the first row of the table not yet plotted */
  hi: '15', cf: '18'
};
/* ONE HOLE, THREE DIFFERENT WORDS. `{name}` is a pupil's own name on the cover,
   the name of a CUT on a Handling Data screen ("That's my median"), and the
   label of an angle in the geometry book ("Work out ∠x"). Filling all three with
   "Aoife" handed the separated judge ten sentences reading "Now choose the
   Aoife." and "Work out ∠Aoife", and the judge quite properly failed every one
   of them - for a fault the harness had made, on screens where no pupil will
   ever see anything of the kind. The sample is chosen by the string it is going
   into, and a key with no rule keeps the pupil's name. */
const NAME_BY_KEY = [
  [/^stat/, 'median'],
  [/^angle/, 'x']
];
function fill(t, key) {
  return String(t).replace(/\{([a-zA-Z]+)\}/g, (m, k) => {
    if (k === 'name' && key) {
      const rule = NAME_BY_KEY.filter(r => r[0].test(String(key).split(/[>.\s]+/).pop() || ''))[0];
      if (rule) return rule[1];
    }
    return Object.prototype.hasOwnProperty.call(SAMPLE, k) ? SAMPLE[k] : m;
  });
}
/* a hole with no sample value would print as a raw brace, so the gate says so
   rather than handing the judge something no pupil will ever see */
function unfilledHoles() {
  const S = require('./lib/strings.js');
  const holes = new Set();
  S.appStrings().forEach(r => (String(r.text).match(/\{([a-zA-Z]+)\}/g) || [])
    .forEach(h => { const k = h.slice(1, -1); if (!Object.prototype.hasOwnProperty.call(SAMPLE, k)) holes.add(k); }));
  return [...holes];
}

function v4Transcript() {
  const p2 = A.app('strings.js');
  if (!A.exists(p2)) return [];
  const before = oldText();
  const out = [];
  const seen = new Set();
  const S = require('./lib/strings.js');
  S.appStrings().forEach(r => {
    if (before.has(r.text.trim())) return;
    seen.add(r.path);
    out.push(r.path + '  ::  ' + fill(r.text, r.path));
  });
  /* and every sentence flagged for a human read, whether or not this build
     wrote it: a flagged sentence that no judge sees is the one that matters */
  const rf = A.out('read-first.json');
  if (A.exists(rf)) {
    JSON.parse(A.read(rf)).filter(c => !c.locked).forEach(c => {
      if (seen.has(c.path) || !c.text) return;
      seen.add(c.path);
      out.push(c.path + '  ::  ' + fill(c.text, c.path) + '   [carried from the approved build, flagged for a read]');
    });
  }
  return out;
}

A.ensureOut('transcript');
{
  const holes = unfilledHoles();
  g.check(holes.length === 0, 'the transcript', 'verdict',
    'no example value for ' + holes.join(', ') + ' - the judge would read a raw brace and call it a fault on the screen, which is the harness\'s fault and not the app\'s');
}
{
  const rows = v4Transcript();
  if (rows.length) {
    fs.writeFileSync(A.out('transcript/v4.txt'), rows.join('\n') + '\n');
    g.note('v4: ' + rows.length + ' sentences this build wrote that were not on screen at 45b03ed');
  }
}
const dir = A.out('transcript');
const raw = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.txt$/.test(f) && !/^_/.test(f)) : [];

g.check(raw.length > 0, 'the transcripts', 'verdict',
  'there is no transcript to judge — the walkers write them, so run `node tools/qa/run.js --full` first');

raw.forEach(f => {
  const who = f.replace(/\.txt$/, '');
  const body = A.read(A.out('transcript/' + f))
    .split('\n').map(l => l.trim()).filter(Boolean)
    /* A PORT IS NOT A SENTENCE. The teacher walk prints the class link, and
       under the worker pool each run's preview server sits on a different
       port - so the teacher transcript's hash moved on every run and no
       verdict could ever stay current (11 Sept 2026). The link is judged as
       a link; its port is the rig's. */
    .map(l => l.replace(/localhost:\d+/g, 'localhost'))
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const hash = sha1(body.join('\n')).slice(0, 16);
  const head = [
    '# MathShelf — the ' + (who === 'teacher' ? 'TEACHER' : who) + ' transcript',
    '',
    'TRANSCRIPT HASH: ' + hash,
    'sentences: ' + body.length,
    'taken: ' + new Date().toISOString().slice(0, 19).replace('T', ' '),
    '',
    'This is every sentence a ' + (who === 'teacher' ? 'teacher' : 'pupil') + ' reads, in the order they meet it,',
    'as it was RENDERED on the running app. Nothing here is source.',
    '', '---', ''
  ].join('\n');
  fs.writeFileSync(A.out('transcript/_' + who + '.md'), head + body.join('\n') + '\n');
  g.note(who + ': ' + body.length + ' sentences, hash ' + hash);
});
g.done();
