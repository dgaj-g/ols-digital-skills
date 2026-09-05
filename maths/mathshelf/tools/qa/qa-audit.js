#!/usr/bin/env node
/* qa-audit.js — THE HARNESS ON THE RECORD ITSELF.
 *
 * DFM 195b: a rule with no enforcement home is a rule that will be broken
 * again. So every numbered ruling in MATHS_FEEDBACK_MASTER.md must appear in
 * exactly ONE status section of MATHS_GATES_AUDIT.md — harnessed, judged,
 * in the checklist, a standing order, his call, or an open gap with an owner.
 *
 * "Exactly one" is the point. A rule filed in two places is a rule two people
 * think somebody else is holding; a rule filed nowhere is a rule that is only
 * ever remembered by whoever was in the room.
 *
 * AND EVERY HARNESSED ROW MUST NAME A GATE THAT EXISTS AND A CONTROL THAT
 * EXISTS IN THAT GATE'S SOURCE (the qa-verify-sweep law): "harnessed" is a
 * claim, and an unchecked claim is how a system comes to believe it is covered.
 *
 * FROM: ks3-dt qa-dfm-audit.js (bdd8c5a), copied in shape.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate, matrix } = require('./lib/report.js');
const { controlsOf } = require('./lib/decl.js');

const TIER = 'fast';
const ORDER = 95;
const COVERS = { books: '*', kinds: [], surfaces: [], widths: [], projector: false, tier: ['preview'], cells: ['audit'] };
const CONTROLS = [
  { id: 'rule-with-no-home', kind: 'fixture', plant: 'fixture-audit-orphan', mustFail: /appears in no status section/ },
  { id: 'harnessed-row-naming-nothing', kind: 'fixture', plant: 'fixture-audit-ghost', mustFail: /names a gate that does not exist/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-audit');
g.exempt(['the standing laws L1-L30 live in MATHS_GATES_DESIGN.md Part 1 and are cited, not restated: they are about how a gate is written, not about this platform']);

const master = A.exists(A.qa('MATHS_FEEDBACK_MASTER.md')) ? A.read(A.qa('MATHS_FEEDBACK_MASTER.md')) : '';
const audit = A.exists(A.qa('MATHS_GATES_AUDIT.md')) ? A.read(A.qa('MATHS_GATES_AUDIT.md')) : '';
if (!master || !audit) {
  g.fail('the record', 'audit', 'MATHS_FEEDBACK_MASTER.md or MATHS_GATES_AUDIT.md is missing — a platform with no record of its own rulings has to be told each one twice');
  g.done();
  process.exit(1);
}

/* the numbered rulings */
/* A RULING THAT WRAPS IS STILL A RULING. The first cut read the bold title only
   when it fitted on one line, and quietly did not hold the six rulings whose
   titles wrap — in the one gate whose entire job is to prove nothing is
   unheld. The number and the bold title are matched across the whole file. */
const rules = [];
{
  const re = /(?:^|\n)(\d+)\.\s+\*\*([\s\S]*?)\*\*/g;
  let m;
  while ((m = re.exec(master))) rules.push({ n: Number(m[1]), text: m[2].replace(/\s+/g, ' ').trim() });
}
g.check(rules.length > 0, 'MATHS_FEEDBACK_MASTER.md', 'audit', 'no numbered rulings found — the file exists but nothing in it is a rule');

/* the status sections */
const SECTIONS = ['A. HARNESSED', 'B. JUDGED', 'C. THE COLD-READ CHECKLIST', 'D. STANDING ORDERS', 'E. HIS CALLS', 'F. GAPS'];
const bounds = SECTIONS.map(h => ({ h, at: audit.indexOf('## ' + h) }));
bounds.forEach(b => g.check(b.at >= 0, 'MATHS_GATES_AUDIT.md', 'audit', 'the audit has no "' + b.h + '" section'));
/* A RULE IS FILED IN THE FIRST COLUMN OF A ROW, and nowhere else. Reading the
   whole section body found "25" inside the date "25 Jun 2026" and reported a
   double filing that did not exist — a gate inventing a fault (L6). Only the
   first cell of a table row counts as a filing.
   A SPLIT FILING IS LEGAL WHEN IT NAMES ITS PART: `9 (the wording)` in one
   section and `9 (the reading)` in another is one rule held in two ways, which
   is the honest shape for a rule that is half mechanical and half judged. A
   bare number in two sections is not. */
function sectionOf(n) {
  const homes = [];
  bounds.forEach((b, i) => {
    if (b.at < 0) return;
    const end = bounds.slice(i + 1).filter(x => x.at > b.at).map(x => x.at).sort((a, c) => a - c)[0] || audit.length;
    const body = audit.slice(b.at, end);
    body.split('\n').forEach(l => {
      if (!/^\|/.test(l)) return;
      const first = l.split('|')[1];
      if (first == null) return;
      const m = new RegExp('^\\s*' + n + '\\s*(\\(([^)]*)\\))?\\s*$').exec(first);
      if (m) homes.push({ h: b.h, part: m[2] || null });
    });
  });
  return homes;
}

const rows = [];
rules.forEach(r => {
  const homes = sectionOf(r.n);
  rows.push([String(r.n), r.text.slice(0, 52),
    homes.map(h => h.h + (h.part ? ' (' + h.part + ')' : '')).join(' + ') || '(nowhere)']);
  g.check(homes.length > 0, 'rule ' + r.n, 'audit',
    'rule ' + r.n + ' ("' + r.text.slice(0, 50) + '") appears in no status section of the audit — a rule with no home is a rule that will be broken again');
  const named = homes.every(h => h.part);
  g.check(homes.length <= 1 || named, 'rule ' + r.n, 'audit',
    'rule ' + r.n + ' is filed in ' + homes.length + ' sections and at least one filing does not say WHICH PART it holds — a rule in two places, unsplit, is a rule two people think somebody else is holding');
});

/* every HARNESSED row names a gate that exists, and a control that exists in it */
{
  const at = audit.indexOf('## A. HARNESSED');
  const end = audit.indexOf('## B. JUDGED');
  const body = at >= 0 && end > at ? audit.slice(at, end) : '';
  body.split('\n').filter(l => /^\|\s*\d+\s*\|/.test(l)).forEach(l => {
    const cols = l.split('|').map(s => s.trim());
    const gate = cols[2], ctl = cols[3];
    if (!gate) return;
    /* the gate NAME, with any explanatory parenthetical stripped, resolved
       against tools/qa first and then against the app (the two content lints
       live in dev/) */
    const bare = gate.replace(/\s*\(.*$/, '').trim();
    const p = A.exists(A.qa(bare.replace(/\.js$/, '') + '.js')) ? A.qa(bare.replace(/\.js$/, '') + '.js') : A.app(bare);
    g.check(A.exists(p), 'MATHS_GATES_AUDIT.md', 'audit',
      'a HARNESSED row names a gate that does not exist (' + bare + ') — "harnessed" is a claim, and an unchecked claim is how a system comes to believe it is covered');
    if (A.exists(p) && ctl) {
      const controls = (controlsOf(p) || []).map(c => c.id);
      ctl.split(/[,/]/).map(s => s.trim()).filter(Boolean).forEach(id => {
        g.check(controls.includes(id), 'MATHS_GATES_AUDIT.md', 'audit',
          gate + ' does not declare a control called "' + id + '" — the audit names a proof that is not in the gate');
      });
    }
  });
}

console.log(matrix('EVERY RULE, AND ITS ONE HOME', ['#', 'the ruling', 'filed under'], rows));
g.note(rules.length + ' numbered rulings on record');
g.done();
