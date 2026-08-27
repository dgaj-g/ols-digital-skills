/* ledger-bulk.js — write MANY read-aloud records in one pass.
 *
 * WHY IT EXISTS, plainly: `ledger-tool.js --set` is one process per sentence,
 * and this round writes several hundred. Three hundred and forty-two node
 * start-ups is not a reason to write fewer judgements, and a bulk STAMP is not
 * an option (DFM 192b/235 — a stamp is not a judgement). So this takes a JSON
 * file of { path: [do, picture, for] } and writes a real per-sentence record for
 * each, resolving every hash through the SAME collectors qa-language uses
 * (DFM 144: never a second walk).
 *
 * It refuses a path it cannot find, and it refuses a record with an empty field,
 * so it cannot quietly write the thin rows the gate exists to catch.
 *
 *   node ledger-bulk.js records.json
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QL = require('./qa-language.js');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const LEDGER_FILE = path.join(SRC, 'language-ledger.json');
const sha1 = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 16);
const today = () => '2026-08-25';

const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ledger = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));

const lessons = QL.loadLessons();
const index = {};
lessons.forEach(L => L.strings.forEach(s => { index[s.path] = { text: s.text, kind: 'lesson' }; }));
QL.collectHubStrings().strings.forEach(s => { index[s.path] = { text: s.text, kind: 'hub' }; });
QL.collectBriefStrings(lessons).forEach(s => { index[s.path] = { text: s.text, kind: 'brief' }; });
/* THE DECK TEXT TOO. It was missing here, so the one surface that is read from
   the back of a room could only be recorded one node process at a time. */
QL.collectDeckStrings().strings.forEach(s => { index[s.path] = { text: s.text, kind: 'deck' }; });
const films = QL.collectFilmStrings();
films.strings.forEach(f => {
  const key = QL.filmKey(f);
  index[key] = { text: f.text, kind: 'film', sha1: key.split(' › ')[1], label: f.text.slice(0, 60) };
});

let wrote = 0;
const bad = [];
Object.keys(rows).forEach(p => {
  const hit = index[p];
  if (!hit) { bad.push('NO SUCH PATH: ' + p); return; }
  const r = rows[p];
  if (!Array.isArray(r) || r.length !== 3 || r.some(x => !x || String(x).trim().length < 3)) {
    bad.push('THIN RECORD REFUSED: ' + p); return;
  }
  const entry = {
    sha1: hit.kind === 'film' ? hit.sha1 : sha1(hit.text),
    readAloud: { do: r[0], picture: r[1], for: r[2] },
    by: 'opus-5', date: today()
  };
  if (hit.kind === 'film') entry.label = hit.label;
  ledger.entries[p] = entry;
  wrote++;
});

if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 1));
console.log('recorded ' + wrote + ' judgement(s)');
