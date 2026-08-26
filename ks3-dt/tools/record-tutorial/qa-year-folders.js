/* qa-year-folders.js — the guard on a year that ships without ever being covered.
 *
 * THE HOLE IT EXISTS FOR (found reading the code for the J2/J3 stand-up, 14 Aug
 * 2026, before either year existed — which is the only good time to find it):
 *
 *   pack-content.js SHIPS every .json under the content source. It is a raw
 *   recursive walk; it does not consult index.json at all.
 *   qa-harness-coverage.js WALKS ONLY THE YEARS index.json DECLARES.
 *
 * So a `content-src/j2/` folder that nobody had declared would have been packed,
 * encrypted, published and served to real pupils, while the machine whose entire
 * job is to refuse an uncovered lesson never looked at it. No landmark list, no
 * pinned sit shape, no filed cold read, and — this is the part that matters —
 * NO COMPLAINT. That is precisely the silent exemption DFM 213 bans and the
 * silent coverage DFM 204 killed, one level up: not a harness that under-reports
 * its reach, but a whole YEAR outside every harness's reach.
 *
 * The reverse direction is guarded too, and it is just as quiet: a year declared
 * in index.json with no folder on disk makes builtLessons() return early on the
 * missing manifest, so the year reads as "nothing to cover" instead of as a
 * mistake. Guarding both is what makes "declare the year and create its folder in
 * ONE commit" a rule the machine enforces rather than a habit someone remembers.
 *
 * This file proves the gate BITES, in a sandbox, never touching the real content,
 * the real packed output or the real stamp — the qa-content-version pattern.
 * Every assertion reads the FAILURE MESSAGE, not merely the exit code: DFM 189's
 * own lesson is that a pack can stop for the wrong reason and look like proof.
 *
 *   node qa-year-folders.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const PACK = path.join(__dirname, '..', 'pack-content.js');

const FAILS = [];
const check = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) FAILS.push(what); };
const ctrl = (ok, what) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + what); if (!ok) FAILS.push('CONTROL: ' + what); };

/* ---- a throwaway copy, so nothing real is ever at risk ---- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ks3dt-years-'));
const fxSrc = path.join(tmp, 'src');
const fxOut = path.join(tmp, 'out');
const fxStamp = path.join(tmp, 'stamp.json');
fs.cpSync(SRC, fxSrc, { recursive: true });
fs.mkdirSync(fxOut, { recursive: true });

/* THE OUTPUT IS READ IN FULL, OR THE GATE IS READING A DIFFERENT RUN (26 Aug 2026).
   §5's control — "the language gate names the planted j9-01 and stops the pack" —
   began failing while the pack was doing exactly that. The cause was in
   pack-content.js and is fixed there: it printed the child harness's whole output
   with `console.error` and then called `process.exit`, and on a stderr that is a
   PIPE (which is what it is whenever a harness runs the pack) that write is
   ASYNCHRONOUS and the exit throws away whatever has not drained — about 64KB in,
   mid-sentence. The line really was printed; this file could not see it. A gate
   condemning text it never received is DFM 146a arriving through the plumbing
   instead of through a rule.
   The explicit maxBuffer below was NOT the cause and is kept anyway, honestly
   labelled: Node's default is 1MB, the pack's log is already 70KB and grows with
   every lesson, and a limit nobody has stated is a cliff nobody will see coming. */
const runPack = () => spawnSync(process.execPath, [PACK], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, KS3DT_SRC: fxSrc, KS3DT_OUT: fxOut, KS3DT_STAMP: fxStamp },
});
const text = (r) => (r.stdout || '') + (r.stderr || '');
const indexPath = path.join(fxSrc, 'index.json');
const readIndex = () => JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const writeIndex = (o) => fs.writeFileSync(indexPath, JSON.stringify(o, null, 1));

/* a minimal but REAL stray year: a manifest and one lesson file with a chunk,
   i.e. exactly the shape that would be served to a pupil */
function plantYear(id, declared) {
  const dir = path.join(fxSrc, id);
  fs.mkdirSync(path.join(dir, 'lessons'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
    year: id, title: 'Stray Year', lessons: [id + '-01']
  }, null, 1));
  fs.writeFileSync(path.join(dir, 'lessons', id + '-01.json'), JSON.stringify({
    id: id + '-01', num: '1', title: 'A Lesson Nobody Declared',
    chunks: [{ id: 'c1', engine: 'briefing', config: { intro: 'Pupils can read this.' } }]
  }, null, 1));
  if (declared) {
    const i = readIndex();
    i.years.push({ id: id, title: 'Stray Year', manifest: id + '/manifest.json' });
    writeIndex(i);
  }
}
function removeYear(id) {
  fs.rmSync(path.join(fxSrc, id), { recursive: true, force: true });
  const i = readIndex();
  i.years = i.years.filter(y => y.id !== id);
  writeIndex(i);
}

console.log('qa-year-folders — a year that ships must be a year that is declared\n');

console.log('== 1. the real content packs cleanly, and the gate says what it saw ==');
let r = runPack();
check(r.status === 0, 'the unchanged content packs (status ' + r.status + ')');
check(/year-folder gate: PASSED/.test(text(r)), 'the gate ran and passed');
check(/each declared: j1\b/.test(text(r)), 'it names the year folders it found, so a silent pass is impossible to mistake for no check');

console.log('\n== 2. CONTROL — an UNDECLARED year folder stops the pack ==');
plantYear('j9', false);
r = runPack();
ctrl(r.status !== 0, 'the pack STOPS (status ' + r.status + ')');
ctrl(/year folder\(s\) on disk that index\.json does not declare: j9/.test(text(r)),
  'and the message names j9 by its folder name');
ctrl(/coverage gate only walks/.test(text(r)),
  'and says WHY it matters — the coverage gate would never have looked at it');
/* THE ASSERTION THAT MATTERS: it must stop for THIS reason. DFM 189's gate went
   green on its first run because the pack stopped at the LANGUAGE gate instead,
   and the wrong stop looked exactly like proof. */
ctrl(!/PACK STOPPED: a built lesson is not covered/.test(text(r)),
  'and it stops HERE, not later at the coverage gate — the failure is the one under test');
ctrl(!/language gate/i.test(text(r).split('PACK STOPPED')[1] || ''),
  'nothing after the stop ran, so no other gate can be credited with the refusal');

console.log('\n== 3. removing the stray folder lets the pack through again ==');
removeYear('j9');
r = runPack();
check(r.status === 0, 'the pack runs again once the stray year is gone (status ' + r.status + ')');
check(/year-folder gate: PASSED/.test(text(r)), 'and the gate passes rather than merely staying quiet');

console.log('\n== 4. CONTROL — the other direction: a DECLARED year with no folder ==');
/* this is the half that makes "one commit" enforceable: declaring the year first
   and creating its folder later used to be completely silent */
const i = readIndex();
i.years.push({ id: 'j9', title: 'Stray Year', manifest: 'j9/manifest.json' });
writeIndex(i);
r = runPack();
ctrl(r.status !== 0, 'the pack STOPS on a declared year with no folder (status ' + r.status + ')');
ctrl(/declares year\(s\) with no folder on disk: j9/.test(text(r)),
  'and names j9 as declared-but-absent');
ctrl(/would read as "nothing to cover" rather than as/.test(text(r)),
  'and says why the silence was the danger, not the missing folder itself');
removeYear('j9');

console.log('\n== 5. CONTROL — a DECLARED year WITH its folder is accepted ==');
/* a gate that cannot be satisfied is not a gate, it is a wall. This proves the
   §3 shape (folder + declaration in ONE commit) really does pass this gate — and
   then shows what declaring a year actually buys: the year stops being invisible
   to EVERY other gate at once. The planted lesson's two pupil sentences carry no
   read-aloud record, so the language gate names them by id and stops the pack.
   That is the whole point of the guard: an undeclared j9 got none of this. */
plantYear('j9', true);
r = runPack();
/* names the years it FOUND, whatever they are: pinning the exact list "j1, j9"
   made this fail the moment j2 and j3 were declared, which is the same
   fixture-not-law fault as qa-staff-authority's delete-button count */
ctrl(/year-folder gate: PASSED/.test(text(r)) && /each declared: .*\bj9\b/.test(text(r)),
  'the year-folder gate PASSES and names j9 among the declared years');
ctrl(/UNREVIEWED: j9-01/.test(text(r)),
  'and the declared year is immediately INSIDE the other gates — the language gate names j9-01\'s unjudged sentences by id and stops the pack');
ctrl(r.status !== 0, 'so a declared-but-unjudged year still cannot ship (status ' + r.status + ')');
removeYear('j9');

console.log('\n== 6. the sandbox left the real tree alone ==');
check(!fs.existsSync(path.join(SRC, 'j9')), 'no j9 folder in the real content source');
check(!/\"j9\"/.test(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8')), 'the real index.json is untouched');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('');
if (FAILS.length) {
  console.log('qa-year-folders: ' + FAILS.length + ' FAILURE(S)');
  FAILS.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log('qa-year-folders: ALL GREEN — an undeclared year cannot ship, a declared year cannot be empty,');
console.log('and both refusals name the folder and say what the silence would have cost.');
