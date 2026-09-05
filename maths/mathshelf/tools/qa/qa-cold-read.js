#!/usr/bin/env node
/* qa-cold-read.js — THE JUDGEMENT HAPPENED, AND IT WAS ABOUT THIS TEXT.
 *
 * G-D3 / DFM 270, 235. Two different things are gated here, and neither is the
 * reading itself — no machine reads for meaning, and one that claimed to would
 * be the DFM 146a fault at its worst:
 *
 *   1. THE JUDGEMENT HAPPENED. A checklist that exists is not a check (DFM 235).
 *      A book under review with no filed verdict stops the pack.
 *   2. IT WAS ABOUT THIS TEXT. Every verdict file names the transcript's own
 *      hash. Edit a sentence and its judgement is void — which is the only
 *      thing that stops a verdict quietly outliving the words it was about.
 *
 * And two things the verdict file must contain, because they are where a
 * general pass hides a specific problem:
 *   - every READ-FIRST CANDIDATE the language gate named, answered by path;
 *   - a per-item block for every question in the book (checklist section 5).
 *
 * WHO JUDGES: a fresh context that has seen only the transcript and
 * COLD_READ_CHECKLIST.md. The author is never the judge, and a wording that had
 * to be defended has already failed (DFM 231).
 *
 * WHICH BOOKS ARE UNDER REVIEW is read from the APPROVALS table of
 * MATHS_GATES_AUDIT.md and nowhere else. Angles and Algebra are approved and
 * live: they are reported on, never re-opened (rule 30).
 */
'use strict';
const fs = require('fs');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'full';
const ORDER = 91;
const COVERS = { books: '*', kinds: '*', surfaces: '*', widths: [], projector: false, tier: ['preview'], cells: ['verdict'] };
const CONTROLS = [
  { id: 'hash-mismatch', kind: 'fixture', plant: 'verdicts.bad.md', mustFail: /has since changed/ },
  { id: 'prose-without-rows', kind: 'fixture', plant: 'verdicts.bad.md', mustFail: /no judged rows/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-cold-read');
g.exempt([
  'the Angles and Algebra content is APPROVED and live: it is reported on, never re-opened (rule 30)',
  'this gate proves the judgement happened and was about the current text; it does not and cannot judge the writing'
]);

/* which things are under review — one home, the approvals table */
function underReview() {
  const md = A.exists(A.qa('MATHS_GATES_AUDIT.md')) ? A.read(A.qa('MATHS_GATES_AUDIT.md')) : '';
  const out = [];
  A.books().forEach(b => {
    const re = new RegExp('^\\|\\s*' + b + '[^|]*\\|\\s*([^|]+)\\|', 'im');
    const m = re.exec(md);
    if (!(m && /APPROVED/i.test(m[1]))) out.push(b);
  });
  /* the teacher layer is under review whenever any teacher surface changed,
     which for a build of this size is always; and so is everything THIS build
     wrote, whatever book it sits in (rule 30 protects the approved CONTENT,
     not the shell it is read in) */
  out.push('teacher');
  if (A.exists(A.out('transcript/_v4.md'))) out.push('v4');
  return out;
}

const need = underReview();
g.note('under review: ' + (need.join(', ') || 'nothing'));

need.forEach(who => {
  const tf = A.out('transcript/_' + who + '.md');
  const vf = A.qa('MATHS_COLD_READ_VERDICTS_' + (who === 'teacher' ? 'TEACHER' : who === 'v4' ? 'v4' : who) + '.md');
  if (!A.exists(tf)) {
    g.fail(who, 'cold-read', 'there is no transcript for ' + who + ' — the judge has nothing to be handed');
    return;
  }
  const transcript = A.read(tf);
  const hash = (/TRANSCRIPT HASH:\s*([0-9a-f]+)/.exec(transcript) || [])[1] || '';
  if (!A.exists(vf)) {
    g.fail(who, 'cold-read',
      'no filed verdict — ' + who + ' is under review and nobody has read it cold. A checklist that exists is not a check');
    return;
  }
  const verdict = A.read(vf);
  const filed = (/TRANSCRIPT HASH:\s*([0-9a-f]+)/.exec(verdict) || [])[1] || '';
  g.check(filed === hash, who, 'cold-read',
    'the verdict names hash ' + (filed || '(none)') + ' but the current transcript is ' + hash +
    ' — the judge read text that has since changed');
  const rows = verdict.split('\n').filter(l => /^\|\s*(PASS|FAIL|REWRITE)\b/.test(l));
  g.check(rows.length > 0, who, 'cold-read',
    'the verdict file has no judged rows — prose about the reading is not the reading, and he has to be able to open the file and see what was said about any line');
  g.note(who + ': ' + rows.length + ' judged rows against hash ' + hash);

  /* every read-first candidate answered by path */
  if (A.exists(A.out('read-first.json'))) {
    const cands = JSON.parse(A.read(A.out('read-first.json'))).filter(c => !c.locked);
    const unanswered = cands.filter(c => verdict.indexOf(c.path) < 0);
    g.check(unanswered.length === 0, who, 'cold-read',
      unanswered.length + ' read-first candidate(s) the language gate named are not answered in the verdict — those are exactly the sentences that must not ride a general pass (first: ' +
      (unanswered[0] ? unanswered[0].path : '') + ')');
  }

  /* a per-item block for every question in a book under review */
  if (who !== 'teacher' && who !== 'v4') {
    const qs = A.grid().filter(r => r.book === who);
    const missing = qs.filter(r => verdict.indexOf(r.qid) < 0);
    g.check(missing.length === 0, who, 'cold-read',
      missing.length + ' question(s) have no per-item block in the verdict (first: ' + (missing[0] ? missing[0].qid : '') + ') — a tick is not a judgement');
  }
});
g.done();
