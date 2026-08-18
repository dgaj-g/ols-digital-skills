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

let applied = 0, refusedBlank = 0, refusedRepeat = 0, refusedExisting = 0, failed = 0;
const seen = new Set();
for (const r of rows) {
  const v = r.v;
  if (!v || !v.path) { refusedBlank++; continue; }
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
  if (had.has(v.path)) { refusedExisting++; continue; }
  if (DRY) { applied++; continue; }
  try {
    execFileSync(process.execPath, [TOOL, '--set', v.path, fields[0], fields[1], fields[2]],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    applied++;
  } catch (e) {
    console.log('  FAILED ' + v.path + ' — ' + String(e.stderr || e.message).split('\n')[0]);
    failed++;
  }
}

console.log('\napplied ' + applied +
  ' · refused-blank ' + refusedBlank +
  ' · refused-as-bulk-stamp ' + refusedRepeat +
  ' · already-had-a-record ' + refusedExisting +
  ' · failed ' + failed + (DRY ? '   (DRY RUN — nothing written)' : ''));
process.exit(failed || refusedBlank || refusedRepeat ? 1 : 0);
