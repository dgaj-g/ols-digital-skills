/* qa-activity-column.js — the Live tab's main-activity column (DFM 191b).

   THE GAP IT EXISTS FOR: Lesson 4 spends FORTY minutes of its hour inside one
   chunk and Lesson 5 twenty-five, and both have always written a full account of
   that work into the pupil's detail ledger — cw= for the Case Board, qa= for the
   Studio Sprint. Nothing on the Live tab ever rendered either, so a teacher
   watching the heart of either lesson saw a warm-up column, an exit column, and
   nothing about the thing the class was actually doing. DFM 156(c) again: the
   data was there; no screen showed it.

   This harness reads the REAL staff.js functions out of the BUILT
   PathB_Index.html (DFM 162b: assert the artefact he pastes, not just the source)
   and drives them with fixture ledger strings. The controls matter more than the
   checks: the pre-fix behaviour must be reproduced and must fail. */

const fs = require('fs');
const path = require('path');

const BUILT = path.join(__dirname, '..', '..', 'platform', 'server', 'PathB_Index.html');
const STAFF = path.join(__dirname, '..', '..', 'platform', 'staff.js');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

let PASS = 0;
const FAILS = [];
const check = (c, m) => { if (c) { PASS++; console.log('  PASS  ' + m); } else { FAILS.push(m); console.log('  FAIL  ' + m); } };
const control = (c, m) => { if (c) { PASS++; console.log('  CTRL  ' + m); } else { FAILS.push('CONTROL: ' + m); console.log('  FAIL  ' + m); } };

const staffSrc = fs.readFileSync(STAFF, 'utf8');
const built = fs.readFileSync(BUILT, 'utf8');

/* ---- lift the real implementations out of staff.js and run them for real ---- */
function lift(name) {
  const i = staffSrc.indexOf('function ' + name + '(');
  if (i === -1) throw new Error('function ' + name + ' not found in staff.js');
  let depth = 0, started = false, j = i;
  for (; j < staffSrc.length; j++) {
    if (staffSrc[j] === '{') { depth++; started = true; }
    else if (staffSrc[j] === '}') { depth--; if (started && depth === 0) { j++; break; } }
  }
  return staffSrc.slice(i, j);
}
const App = { esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') };
const sandbox = new Function('App', [
  lift('detailOf'), lift('dFlag'), lift('dNum'), lift('dFrac'), lift('actCount'),
  "var NOT_STARTED = '<span class=\"lc-dash\" title=\"Not started\">&ndash;</span>';",
  lift('caseworkCell'), lift('studioCell'), lift('activityCell'),
  'return { caseworkCell: caseworkCell, studioCell: studioCell, activityCell: activityCell };'
].join('\n'))(App);

/* a dashboard row's detail ledger is field a[2] */
const row = d => [2, '', d, '', '', '', '', '', '', 0, 0];

console.log('== 1. Lesson 4: the Case Board column ==');
const c4 = sandbox.caseworkCell(row('cw=3/4;g=2;rc=1;ship=1;s=1'));
check(/>3\/4</.test(c4), 'a pupil on three of four closed cases reads 3/4');
check(/lc-act some/.test(c4), 'and it is styled part-way, not finished');
check(/2 gold, 1 silver/.test(c4), 'the hover counts her gold and silver stamps from g=');
check(/HQ&#039;s clue was taken|HQ’s clue was taken/.test(c4), 'and says what silver MEANS, rather than leaving a teacher to guess');
check(/whole-game check was run/.test(c4), 'the hover reports the release-desk run');
check(/saved into her Drive/.test(c4), 'and that the fixed game reached her Drive');
check(/lc-ship/.test(c4), 'a ship mark appears beside the count');
check(/lc-stretch/.test(c4), 'and a star for the stretch job');

const c4all = sandbox.caseworkCell(row('cw=4/4;g=4;rc=1;ship=1'));
check(/lc-act all/.test(c4all), 'four of four is styled finished');
check(/All gold/.test(c4all), 'and a clean sweep says "all gold" rather than "0 silver"');
check(!/lc-stretch/.test(c4all), 'no star when the stretch job was not taken');

const c4none = sandbox.caseworkCell(row('cw=0/4;g=0;rc=0;ship=0'));
check(/lc-act none/.test(c4none), 'nothing closed yet is styled not-yet');
check(/has not been run yet/.test(c4none), 'and the hover says the whole-game check is still outstanding');

console.log('\n== 2. Lesson 5: the Studio Sprint column ==');
const c5 = sandbox.studioCell(row('qa=4/4;ship=1;b=1;fq=2;s=1'));
check(/>4\/4</.test(c5), 'all four QA tests passed reads 4/4');
check(/lc-act all/.test(c5), 'and is styled finished');
check(/2 tests failed first and were fixed/.test(c5), 'the hover reports FOUND BY QA from fq=');
check(/not a black mark/.test(c5), 'and tells the teacher to read that generously (it is QA working)');
check(/lc-beta/.test(c5), 'an IN BETA chip shows when she opened the doors early');
check(/IN BETA/.test(c5), 'and the hover explains it as a real studio state');
check(/second variable was added/.test(c5), 'the stretch is named');

const c5plain = sandbox.studioCell(row('qa=4/4;ship=1'));
check(!/lc-beta/.test(c5plain), 'no beta chip for a studio that went green before opening');
check(/all four QA tests were green first/.test(c5plain), 'and the hover says so');
const c5part = sandbox.studioCell(row('qa=2/4'));
check(/lc-act some/.test(c5part), 'two of four is part-way');
check(/doors never opened/.test(c5part), 'and an unshipped game is reported honestly');

console.log('\n== 3. a pupil with no record at all ==');
check(/lc-dash/.test(sandbox.caseworkCell(row(''))), 'no cw= shows a dash, never 0/4 (which would be a lie)');
check(/lc-dash/.test(sandbox.studioCell(row(''))), 'no qa= shows a dash too');
check(/lc-dash/.test(sandbox.caseworkCell(null)), 'and a pupil with no row at all does not throw');

console.log('\n== 4. the denominator comes from HER string, never a hard-coded 4 ==');
check(/>2\/3</.test(sandbox.caseworkCell(row('cw=2/3;g=2'))), 'a three-case lesson reads 2/3');
check(/>5\/6</.test(sandbox.studioCell(row('qa=5/6;ship=1'))), 'a six-check lesson reads 5/6 (lessons 6+ inherit free)');

console.log('\n== 5. the column is chosen by CONTENT, not by lesson number ==');
check(/ch\.engine === 'casework'/.test(staffSrc), 'casework is detected from the chunk engine');
check(/ch\.engine === 'studio' && cfg\.phase === 'build'/.test(staffSrc), 'and the studio column only from the BUILD phase, not the contracts');
check(sandbox.activityCell(row('cw=1/4'), { casework: {}, studio: null }) !== '', 'a casework lesson gets a cell');
check(sandbox.activityCell(row('qa=1/4'), { casework: null, studio: {} }) !== '', 'a studio lesson gets a cell');
control(sandbox.activityCell(row('cw=1/4'), { casework: null, studio: null }) === '',
  'a lesson with NEITHER renders no cell at all — Lessons 1-3 are untouched (DFM 176)');

console.log('\n== 6. CONTROLS: the pre-fix tab must fail these ==');
/* The whole finding: before this build, staff.js decoded ep= and ladder=+s and
   nothing else. Reproduce that reader and prove it is blind to both lessons. */
const preFix = (a) => {
  const s = String((a && a[2]) || '');
  const m = /(?:^|;)ep=([01])(?:;|$)/.exec(s);
  return m ? (m[1] === '1' ? 'tick' : 'cross') : '';
};
control(preFix(row('cw=3/4;g=2;rc=1;ship=1')) === '',
  'the pre-fix tab rendered NOTHING for a pupil three cases into the Case Board');
control(preFix(row('qa=4/4;ship=1;fq=2')) === '',
  'and nothing for a pupil whose game passed every QA test');
control(!/cw=/.test(staffSrc.slice(0, staffSrc.indexOf('THE MAIN-ACTIVITY COLUMN'))),
  'no earlier code in staff.js reads cw= — the gap was real, not a duplicate reader');

console.log('\n== 7. the legend and the Guide teach it (DFM 156c: never an unlabelled mark) ==');
check(/feat\.casework\)/.test(staffSrc) && /gold \(solved unaided\)/.test(staffSrc),
  'the on-screen legend explains gold versus silver in plain words');
check(/IN BETA<\/b> is a pupil who ran out of time/.test(staffSrc),
  'and the Guide tab explains IN BETA as a real studio state, not a failure');
check(/what is my class actually doing right now/.test(staffSrc),
  'the Guide names the question this column answers');

console.log('\n== 8. it all survives into the BUILT file he pastes (DFM 162b) ==');
['THE MAIN-ACTIVITY COLUMN', 'caseworkCell', 'studioCell', 'lc-beta', 'FOUND BY QA is the desk doing its job']
  .forEach(s => check(built.indexOf(s) !== -1, 'the built PathB_Index.html carries "' + s + '"'));
check(/\.lc-beta \{/.test(built), 'and the IN BETA chip has real styling in the built CSS');

console.log('\n== 9. the two lessons really do write what this column reads ==');
const l4 = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/lessons/j1-04.json'), 'utf8'));
const l5 = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/lessons/j1-05.json'), 'utf8'));
check((l4.chunks || []).some(c => c.engine === 'casework'), 'Lesson 4 still has a casework chunk to detect');
check((l5.chunks || []).some(c => c.engine === 'studio' && (c.config || {}).phase === 'build'), 'Lesson 5 still has a build-phase studio chunk');
const eng = fs.readFileSync(path.join(__dirname, '..', '..', 'platform', 'engines.js'), 'utf8');
check(/'cw=' \+ closedCount \+ '\/' \+ cases\.length/.test(eng), 'the casework engine still writes cw=closed/total');
check(/'qa=' \+ passCount\(\) \+ '\/' \+ crits\.length/.test(eng), 'and the studio engine still writes qa=passed/total');

console.log('\n=========================================');
console.log('CHECKS RUN: ' + (PASS + FAILS.length) + '   PASSED: ' + PASS + '   FAILED: ' + FAILS.length);
console.log(FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL ACTIVITY-COLUMN CHECKS PASSED');
process.exit(FAILS.length ? 1 : 0);
