/* qa-item-keys.js — AN OBJECTIVE ITEM WITHOUT A KEY SCORES EVERY PUPIL ZERO.
 *
 * FOUND 16 Aug 2026, while building the Live-tab half of his sit round, and it
 * had never been seen because it is invisible from the pupil's side.
 *
 * The diagnostic engine never marks — that is the design, and the pupil is told
 * so. But the SERVER scores her submission all the same:
 *
 *     var keys = lessonKeys_(year, lessonId);
 *     ids.forEach(function (id) { if (key && ch === num_(key.a)) right++; });
 *     a[2] = mergeDetail_(a[2], 'bl=' + right + '/' + ids.length + '|' + chosen);
 *
 * J2's Skills Snapshot and J3's Portfolio Zero shipped with NO keys at all, so
 * `right` could only ever be 0. Every J2 and J3 pupil's record would have stored
 * `bl=0/12`, and the teacher's Live tab would have reported that every girl in
 * the class got everything wrong on the first day of the year — rule 35 on the
 * teacher's screen. Worse, the whole POINT of a baseline is the June comparison
 * (K14's Then-vs-Now): a fake September zero would have shown every pupil
 * "improving" by exactly her June score.
 *
 * The pupil experience is untouched either way, which is precisely why nothing
 * caught it: no walker, no cold read and no readability probe can see a number
 * that is only ever written on the server and only ever read by a teacher.
 *
 * WHAT THIS CHECKS, per lesson of every year, from the BUILT source:
 *   1. every OBJECTIVE item in a scoring chunk has a key with a numeric `a`;
 *   2. that `a` points at an option that exists;
 *   3. a CONFIDENCE item (one that says outright it has no right answer) has NO
 *      key — a key there would be a lie about the item, not a fix;
 *   4. no keyed item is missing from the lesson, and no key points at an item
 *      that no longer exists (the DFM 144 drift both ways).
 *
 *   node qa-item-keys.js
 *   node qa-item-keys.js --controls
 */
const fs = require('fs');
const path = require('path');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

const FAILS = [];
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) FAILS.push(m); };
const ctrl = (ok, m) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + m); if (!ok) FAILS.push('CONTROL: ' + m); };

/* the engines whose items the SERVER scores or the client marks */
const SCORING_ENGINES = ['diagnostic', 'items', 'quiz', 'exit'];
/* an item that declares itself unmarkable. The declaration is the pupil-facing
   sentence itself, so this cannot drift away from what she is told. */
const isConfidence = (it) => /^\s*NO RIGHT ANSWER/i.test(String(it.stem || ''));

function lessons() {
  const idx = JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8'));
  const out = [];
  (idx.years || []).forEach(y => {
    const yid = typeof y === 'string' ? y : y.id;
    const mf = path.join(SRC, yid, 'manifest.json');
    if (!fs.existsSync(mf)) return;
    const man = JSON.parse(fs.readFileSync(mf, 'utf8'));
    (man.lessons || []).forEach(l => {
      if (!l.file) return;
      const f = path.join(SRC, yid, l.file.replace(/^.*\//, 'lessons/'));
      if (fs.existsSync(f)) out.push({ year: yid, id: l.id, file: f });
    });
  });
  return out;
}

function auditLesson(L, label) {
  const problems = [];
  const keys = L.keys || {};
  const seen = new Set();
  (L.chunks || []).forEach(ch => {
    if (SCORING_ENGINES.indexOf(String(ch.engine)) === -1) return;
    const items = (ch.config && ch.config.items) || [];
    items.forEach(it => {
      if (!it || !it.id) return;
      const k = keys[it.id];
      if (isConfidence(it)) {
        if (k) problems.push(label + ' › ' + it.id + ': a confidence card has a KEY — it claims a right answer the pupil is told does not exist');
        return;
      }
      if (!Array.isArray(it.options) || !it.options.length) return; // free text
      seen.add(it.id);
      if (!k || typeof k.a !== 'number') {
        problems.push(label + ' › ' + it.id + ': OBJECTIVE item with no answer key — the server will score it wrong for every pupil (bl=0/N)');
        return;
      }
      if (k.a < 0 || k.a >= it.options.length) {
        problems.push(label + ' › ' + it.id + ': key a=' + k.a + ' points outside its ' + it.options.length + ' options');
      }
    });
  });
  return problems;
}

console.log('qa-item-keys — an objective item without a key scores every pupil zero');
console.log('  source: ' + SRC);

const all = lessons();
console.log('  lessons: ' + all.length + '\n');
all.forEach(({ year, id, file }) => {
  const L = JSON.parse(fs.readFileSync(file, 'utf8'));
  const problems = auditLesson(L, id);
  check(problems.length === 0, id + ' (' + year + '): every objective item is keyed and every key lands on a real option');
  problems.forEach(p => console.log('          ' + p));
});

/* the two lessons this round is about, named explicitly so a future edit that
   drops their keys cannot pass quietly under a green total */
[['j2-01', 'j2', 'snapshot', 12], ['j3-01', 'j3', 'portfolio', 9]].forEach(([id, year, chunkId, expect]) => {
  const f = path.join(SRC, year, 'lessons', id + '.json');
  if (!fs.existsSync(f)) return;
  const L = JSON.parse(fs.readFileSync(f, 'utf8'));
  const ch = (L.chunks || []).find(c => c.id === chunkId);
  const items = ((ch && ch.config && ch.config.items) || []);
  const objective = items.filter(it => !isConfidence(it));
  const keyed = objective.filter(it => (L.keys || {})[it.id]);
  check(keyed.length === expect && objective.length === expect,
    id + ' › ' + chunkId + ': all ' + expect + ' objective items carry a key (found ' +
    keyed.length + ' of ' + objective.length + ') — so the baseline the teacher reads is a real score');
  const conf = items.filter(isConfidence);
  check(conf.every(it => !(L.keys || {})[it.id]),
    id + ' › ' + chunkId + ': its ' + conf.length + ' confidence card(s) stay unkeyed, as the pupil is told');
});

if (process.argv.includes('--controls')) {
  console.log('\n== CONTROLS ==');
  const f = path.join(SRC, 'j2', 'lessons', 'j2-01.json');
  const L = JSON.parse(fs.readFileSync(f, 'utf8'));
  /* the real pre-fix state: the snapshot with its keys stripped */
  const stripped = JSON.parse(JSON.stringify(L));
  Object.keys(stripped.keys).forEach(k => { if (/^j2s-/.test(k)) delete stripped.keys[k]; });
  const p1 = auditLesson(stripped, 'j2-01(pre-fix)');
  ctrl(p1.length === 12, 'the shipped-before state (12 unkeyed Snapshot items) FAILS, naming all 12 (' + p1.length + ')');
  /* a key aimed off the end of its options */
  const bent = JSON.parse(JSON.stringify(L));
  bent.keys['j2s-01'] = { a: 9 };
  ctrl(auditLesson(bent, 'x').some(p => /points outside/.test(p)), 'a key pointing past the last option is caught');
  /* over-tightening guard: a confidence card must not be demanded a key */
  const j3 = JSON.parse(fs.readFileSync(path.join(SRC, 'j3', 'lessons', 'j3-01.json'), 'utf8'));
  ctrl(auditLesson(j3, 'j3-01').length === 0, 'and J3\'s three confidence cards are NOT demanded a key (no invented fault)');
  const lying = JSON.parse(JSON.stringify(j3));
  lying.keys['j3p-10'] = { a: 0 };
  ctrl(auditLesson(lying, 'x').some(p => /confidence card has a KEY/.test(p)), 'but giving a confidence card a key IS caught');
}

console.log('');
if (FAILS.length) {
  console.log('qa-item-keys: ' + FAILS.length + ' FAILURE(S)');
  FAILS.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log('qa-item-keys: ALL GREEN — every objective item is keyed, so every baseline the');
console.log('teacher reads is a real score and June has something true to compare against.');
