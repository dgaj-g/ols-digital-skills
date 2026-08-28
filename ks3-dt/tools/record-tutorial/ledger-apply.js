/* ledger-apply.js — write a SEPARATED cold read's verdicts into the ledger.
 *
 * WHY THIS EXISTS. The read-aloud judgement has to be made by somebody who did
 * not write the sentence (DFM 193d: clarity is produced at writing time and
 * verified by a separated cold read; author judging own intent is the failure
 * that keeps recurring). A separated reader therefore works in its own context
 * and writes its verdicts to a JSONL file; this applies them.
 *
 * It is deliberately fussy, because a ledger that flatters itself is worth
 * nothing (DFM 235: a checklist that exists is not a check):
 *   - a path that is not actually missing a record is REFUSED, so this can
 *     never quietly overwrite an existing judgement;
 *   - a verdict whose three fields are blank, or which is the same generic
 *     stamp repeated across many sentences, is REFUSED and named — that is a
 *     bulk stamp wearing a judgement's clothes, and DFM 192i forbids bulk
 *     stamps on a lesson under active review;
 *   - anything left over is printed, so "how many were really judged" is a
 *     number and not a feeling.
 *
 *   node ledger-apply.js <verdicts.jsonl> [--dry]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const file = process.argv[2];
const DRY = process.argv.includes('--dry');
if (!file || !fs.existsSync(file)) { console.error('usage: node ledger-apply.js <verdicts.jsonl> [--dry]'); process.exit(1); }

const TOOL = path.join(__dirname, 'ledger-tool.js');
const SRC = process.env.KS3DT_SRC || path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const LEDGER = path.join(SRC, 'language-ledger.json');
const before = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const had = new Set(Object.keys(before.entries || before));
/* A VOIDED JUDGEMENT MUST BE REPLACEABLE (19 Aug 2026). "already has a record"
   and "has a record that an edit made void" were one test, so every CHANGED
   SINCE REVIEW path was refused and the only way forward was deleting entries
   by hand — the author touching the ledger, which is the exact thing separation
   exists to prevent. Stale paths come from ledger-tool, which owns the walk. */
const stale = new Set(String(execFileSync(process.execPath,
  [path.join(__dirname, 'ledger-tool.js'), '--stale-paths'], { encoding: 'utf8' }))
  .split('\n').map(x => x.trim()).filter(Boolean));

const rows = [];
fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
  const t = line.trim();
  if (!t) return;
  try { rows.push({ n: i + 1, v: JSON.parse(t) }); }
  catch (e) { console.log('  SKIP line ' + (i + 1) + ': not JSON'); }
});
console.log('read ' + rows.length + ' verdict(s) from ' + path.basename(file));

/* a generic stamp repeated across sentences is the thing this refuses */
const sig = (v) => [v.do, v.picture, v.for].join('¦').toLowerCase().replace(/\s+/g, ' ').trim();
const counts = {};
rows.forEach(r => { const s = sig(r.v); counts[s] = (counts[s] || 0) + 1; });
const REPEAT_LIMIT = 3;

let applied = 0, refusedBlank = 0, refusedRepeat = 0, refusedExisting = 0, failed = 0, replaced = 0;
const seen = new Set();
for (const r of rows.slice().reverse()) {
  const v = r.v;
  if (!v || !v.path) { refusedBlank++; continue; }
  /* THE LAST LINE WINS (28 Aug 2026). A separated reader is told to APPEND its top-up
     rather than rewrite the file, so a path judged twice appears twice — and the later
     line is the judgement made against the CURRENT text. Taking the first meant filing
     yesterday's judgement of a sentence that had since been rewritten, which is the exact
     staleness the hash rule exists to catch and could not, because the record is written
     after the edit. The reader that spotted it said so in its own report. */
  if (seen.has(v.path)) continue;
  seen.add(v.path);
  const fields = [v.do, v.picture, v.for].map(x => String(x == null ? '' : x).trim());
  if (fields.some(f => f.length < 3)) {
    console.log('  REFUSED (blank field) ' + v.path);
    refusedBlank++; continue;
  }
  if (counts[sig(v)] > REPEAT_LIMIT) {
    console.log('  REFUSED (the same words on ' + counts[sig(v)] + ' sentences — that is a bulk stamp) ' + v.path);
    refusedRepeat++; continue;
  }
  if (had.has(v.path) && !stale.has(v.path)) { refusedExisting++; continue; }
  const replacing = stale.has(v.path);
  if (replacing) replaced++;
  if (DRY) { applied++; continue; }
  try {
    /* A FILM CAPTION IS A SENTENCE WRITTEN TO EXPLAIN SOMETHING TO A CHILD, exactly
       like a card is (DFM 179), and it lives in the same ledger under a
       content-addressed key — but it is written with a different flag. This file
       only ever called `--set`, so every caption judgement a separated reader filed
       was refused with "no such string path" and the round would have shipped with
       62 captions unjudged. */
    /* THREE REGISTERS, THREE FLAGS. A caption is `--set-film` and a brief sentence is
       `--set-brief`; only a lesson string is a plain `--set`. Routing on one of the three
       is how 62 caption judgements and then 18 brief judgements were refused in a single
       night, each time with the count printed and nobody obliged to read it. */
    const flag = /^film:/.test(v.path) ? '--set-film'
      : (/ › brief › /.test(v.path) ? '--set-brief' : '--set');
    execFileSync(process.execPath, [TOOL, flag, v.path, fields[0], fields[1], fields[2]],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    applied++;
  } catch (e) {
    console.log('  FAILED ' + v.path + ' — ' + String(e.stderr || e.message).split('\n')[0]);
    failed++;
  }
}

console.log('\napplied ' + applied +
  ' (of which ' + replaced + ' replaced a judgement an edit had VOIDED)' +
  ' · refused-blank ' + refusedBlank +
  ' · refused-as-bulk-stamp ' + refusedRepeat +
  ' · already-had-a-record ' + refusedExisting +
  ' · failed ' + failed + (DRY ? '   (DRY RUN — nothing written)' : ''));
process.exit(failed || refusedBlank || refusedRepeat ? 1 : 0);
