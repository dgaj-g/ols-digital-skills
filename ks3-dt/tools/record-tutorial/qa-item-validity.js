/* qa-item-validity.js — AN ITEM DOES NOT SHIP WITHOUT A FILED VALIDITY JUDGEMENT.
 *
 * WHY THIS EXISTS, and it is not a flattering reason.
 *
 * His 16 Aug sit found five questions that were readable and still broken, and
 * out of it came DFM 233: five questions to ask of every item — one defensible
 * answer, an anchored scenario, difficulty that measures something, options that
 * do not hand it over, and a point that can be said in one sentence. That law
 * was written into the cold-read checklist (§C row 12bis) in this same round.
 *
 * And then I rewrote seven items and never ran it. On 17 Aug he read one of them
 * back to me: "Two charts are drawn from exactly the same numbers, and the
 * numbers are only a little different from each other. what on earth?" — a
 * sentence that says the numbers are identical and then says they differ, which
 * I wrote while supposedly applying the law against exactly that. He then asked
 * what the answer to the next one was, guessed a different option from the key,
 * and was right to: it had no findable answer either.
 *
 * THE HONEST DIAGNOSIS. The language harness cannot catch a contradiction — no
 * mechanical check reads meaning, and pretending otherwise would be the fake
 * assurance DFM 146(a) warns about. The judged layer is what should have caught
 * it, and the judged layer failed in the way DFM 193(d) names precisely: I wrote
 * the read-aloud record for that sentence from what I MEANT rather than from
 * what it SAYS. The ledger entry reads "compare two charts drawn from the same
 * numbers" — a description of my intention, filed as a judgement of my own text,
 * minutes after writing it.
 *
 * SO THE FIX IS NOT ANOTHER RULE. The rule existed. What did not exist was
 * anything that noticed the rule had not been obeyed. This gate makes running
 * the checklist mechanical instead of remembered: every objective item in a
 * lesson under active review must have a FILED row in the verdicts file
 * answering all five questions, or the pack stops. A missing row is a failure,
 * never a skip (DFM 204/206's law applied to item validity).
 *
 * What it cannot do, said plainly rather than left implied: it cannot judge
 * whether the filed answer is a GOOD one. It can only refuse to let an item
 * through unjudged, and make the judgement a written artefact he can read back
 * and hold me to.
 *
 *   node qa-item-validity.js
 *   node qa-item-validity.js --controls
 */
const fs = require('fs');
const path = require('path');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const VERDICTS = path.join(process.env.HOME,
  'Desktop/Claude Work/KS3 DT Platform/COLD_READ_VERDICTS_J2J3.md');

/* the lessons under active review — the ones his sit is about. A locked lesson
   is not re-judged (DFM 176); a new one joins this list when it is authored. */
const UNDER_REVIEW = ['j2-01', 'j3-01'];
const SCORING = ['diagnostic', 'items', 'quiz', 'exit', 'exitcheck'];
const isConfidence = (it) => /^\s*NO RIGHT ANSWER/i.test(String(it.stem || ''));

const FAILS = [];
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) FAILS.push(m); };
const ctrl = (ok, m) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + m); if (!ok) FAILS.push('CONTROL: ' + m); };

function objectiveItems(lessonId) {
  const year = lessonId.split('-')[0];
  const f = path.join(SRC, year, 'lessons', lessonId + '.json');
  if (!fs.existsSync(f)) return [];
  const L = JSON.parse(fs.readFileSync(f, 'utf8'));
  const out = [];
  (L.chunks || []).forEach(ch => {
    if (SCORING.indexOf(String(ch.engine)) === -1) return;
    ((ch.config && ch.config.items) || []).forEach(it => {
      if (!it || !it.id || isConfidence(it)) return;
      if (!Array.isArray(it.options) || !it.options.length) return;
      out.push(it.id);
    });
  });
  return out;
}

/* a filed row looks like:  | j2s-06 | one answer… | anchored… | measures… | options… | point… |
   read as a markdown table row whose first cell is the item id */
function filedRows(md) {
  const rows = {};
  md.split('\n').forEach(line => {
    const m = /^\|\s*`?([a-z0-9]+-[a-z0-9]+)`?\s*\|(.+)\|\s*$/i.exec(line.trim());
    if (!m) return;
    const cells = m[2].split('|').map(c => c.trim());
    rows[m[1]] = cells;
  });
  return rows;
}

console.log('qa-item-validity — every item carries a filed answer to DFM 233\'s five questions');
console.log('  verdicts: ' + VERDICTS + '\n');

const md = fs.existsSync(VERDICTS) ? fs.readFileSync(VERDICTS, 'utf8') : '';
check(!!md, 'the verdicts file exists to read');
const rows = filedRows(md);

UNDER_REVIEW.forEach(id => {
  const items = objectiveItems(id);
  check(items.length > 0, id + ': has objective items to judge (' + items.length + ')');
  const missing = items.filter(i => !rows[i]);
  check(missing.length === 0,
    id + ': every one of its ' + items.length + ' objective items has a filed validity row' +
    (missing.length ? ' — MISSING: ' + missing.join(', ') : ''));
  /* a row that exists but says nothing is worse than none: it looks like work */
  const thin = items.filter(i => rows[i] && rows[i].filter(c => c.length > 3).length < 5);
  check(thin.length === 0,
    id + ': and every filed row answers all five questions' +
    (thin.length ? ' — TOO THIN: ' + thin.join(', ') : ''));
});

if (process.argv.includes('--controls')) {
  console.log('\n== CONTROLS ==');
  const someItem = objectiveItems('j2-01')[0];
  const without = md.split('\n').filter(l => l.indexOf('| ' + someItem + ' ') === -1).join('\n');
  ctrl(!filedRows(without)[someItem],
    'an item whose row is deleted is seen as MISSING (' + someItem + ') — the pack would stop');
  const thinMd = md.replace(new RegExp('^\\|\\s*' + someItem + '\\s*\\|.*$', 'm'),
    '| ' + someItem + ' | y | | | | |');
  const r = filedRows(thinMd)[someItem];
  ctrl(!!r && r.filter(c => c.length > 3).length < 5,
    'and a row filled in with nothing is caught as TOO THIN — a tick is not a judgement');
}

console.log('');
if (FAILS.length) {
  console.log('qa-item-validity: ' + FAILS.length + ' FAILURE(S)');
  FAILS.forEach(f => console.log('   ' + f));
  console.log('\n  Ask DFM 233\'s five questions of each item named above and FILE the answers in');
  console.log('  COLD_READ_VERDICTS_J2J3.md § ITEM VALIDITY. The checklist existing is not the check.');
  process.exit(1);
}
console.log('qa-item-validity: ALL GREEN — no item ships without a written judgement of its validity.');
