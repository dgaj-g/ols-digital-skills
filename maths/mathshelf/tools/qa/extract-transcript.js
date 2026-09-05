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
function v4Transcript() {
  const p2 = A.app('strings.js');
  if (!A.exists(p2)) return [];
  const before = oldText();
  const out = [];
  const S = require('./lib/strings.js');
  S.appStrings().forEach(r => { if (!before.has(r.text.trim())) out.push(r.path + '  ::  ' + r.text); });
  return out;
}

A.ensureOut('transcript');
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
