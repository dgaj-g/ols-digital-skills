/* qa-recap-coverage.js - the Do-Now may only ask what its lesson actually TAUGHT.
 *
 * DAMIEN, 2 Aug 2026 (DFM 134): the warm-up served questions on variables and
 * other untaught content. That was fixed SERVER-side by gating the pool on
 * lessons the pupil has COMPLETED.
 * DAMIEN, 3 Aug 2026 (DFM 138.1.8): the gate held, and the fault came back
 * anyway - r-105 asked what a "Digital Citizen" is, and Lesson 1 never uses
 * the phrase. The lesson TAG was right; the CONTENT behind it was not. His
 * words: "I already asked you to sort this out so that it wouldn't happen
 * again."
 *
 * So the gate is not enough on its own, and neither is a tag. Every recap item
 * is pinned here to the words in ITS OWN lesson's PUPIL-FACING content that
 * teach it. Teacher briefs and answer explanations are deliberately excluded -
 * a pupil never reads those, so they can never be the thing that taught her.
 * Edit a lesson so it stops teaching something, and the item that tests it
 * fails here.
 *
 *   node qa-recap-coverage.js
 *
 * A CONTROL section re-runs the check against the pre-fix r-105 to prove the
 * assertion can actually fail (same law as qa-predeploy.js / qa-l3-rally.js).
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../../../../../Desktop/Claude Work/KS3 DT Platform/content-src');
const ALT = path.resolve(__dirname, '../../content');
const BASE = fs.existsSync(path.join(SRC, 'j1/recap-pool.json')) ? SRC : ALT;

const LESSON_OF_PREFIX = { '1': 'j1-01', '2': 'j1-02', '3': 'j1-03', '4': 'j1-04', '5': 'j1-05', '9': 'j1-sq1' };

/* item -> the phrase(s) that must appear in that lesson's pupil-facing content.
   At least ONE must be present. Lower-cased substring match. */
const ANCHORS = {
  'r-101': ['password', 'guess'],
  'r-102': ['drive', 'saved'],
  'r-103': ['padlock', 'locked'],
  'r-104': ['c2k'],
  'r-105': ['sign out'],                       // was 'digital citizen' - never taught
  'r-106': ['rules'],
  'r-107': ['only you and your teacher'],
  'r-201': ['input'],
  'r-202': ['on button a pressed', 'show icon'],
  'r-203': ['pause', 'clear screen'],
  'r-204': ['button b'],
  'r-301': ['variable'],
  'r-302': ['change score by'],
  'r-303': ['set score to 0', 'back to 0'],
  'r-304': ['number'],
  'r-305': ['highscore', 'high score'],
  'r-306': ['forever'],
  'r-401': ['green flag', 'hat'],
  'r-402': ['sprite'],
  'r-403': ['forever'],
  'r-404': ['change'],
  'r-405': ['order'],
  'r-501': ['if/else', 'else'],
  'r-502': ['set score to'],
  'r-503': ['catch it'],
  'r-504': ['test again', 'qa'],
  'r-505': ['backdrop', 'brief'],
  'r-901': ['folder'],
  'r-902': ['onedrive', 'google drive']
};

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}

/* pupil-facing only: the chunks a pupil actually sees. teacherBrief and keys
   (the answer explanations, shown only AFTER she has answered) are excluded. */
function pupilText(lessonId) {
  const f = path.join(BASE, 'j1/lessons/' + lessonId + '.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  return JSON.stringify(d.chunks).toLowerCase();
}

function auditItem(item, bodies) {
  const prefix = item.id.split('-')[1][0];
  const lesson = LESSON_OF_PREFIX[prefix];
  const anchors = ANCHORS[item.id];
  if (!lesson) return 'no lesson maps to id ' + item.id;
  if (!anchors) return 'no coverage anchor declared for ' + item.id + ' (add one - an unpinned item is how r-105 got through)';
  const body = bodies[lesson];
  const hit = anchors.filter(a => body.indexOf(a) !== -1);
  return hit.length ? null : (item.id + ' (' + item.topic + ') tests content ' + lesson +
    ' never teaches - none of ' + JSON.stringify(anchors) + ' appears in its pupil-facing text');
}

function run() {
  const pool = JSON.parse(fs.readFileSync(path.join(BASE, 'j1/recap-pool.json'), 'utf8'));
  const bodies = {};
  Object.values(LESSON_OF_PREFIX).forEach(l => { bodies[l] = pupilText(l); });

  console.log('\n== recap coverage: every item is taught by its own lesson (DFM 134 + 138.1.8) ==');
  console.log('   content read from: ' + BASE);
  pool.items.forEach(item => {
    const problem = auditItem(item, bodies);
    check(!problem, problem || (item.id + '  ' + item.topic + '  <- taught in ' + LESSON_OF_PREFIX[item.id.split('-')[1][0]]));
  });

  console.log('\n== every item has a key, and the key points at a real option ==');
  pool.items.forEach(item => {
    const k = pool.keys[item.id];
    check(k && typeof k.a === 'number' && item.options[k.a] !== undefined,
      item.id + ' key resolves to "' + (k && item.options[k.a]) + '"');
  });

  /* his 3 Aug instruction, pinned so a later edit cannot quietly undo it */
  console.log('\n== his two 3 Aug rulings on this pool ==');
  const r102 = pool.items.find(i => i.id === 'r-102');
  check(r102 && r102.options[pool.keys['r-102'].a] === 'My Google Drive or OneDrive',
    'r-102 accepts BOTH school clouds (school offers both - DFM 138.1.6)');
  const allText = JSON.stringify(pool).toLowerCase();
  check(allText.indexOf('digital citizen') === -1,
    'no recap item asks about "Digital Citizen" - Lesson 1 never teaches the phrase');

  /* CONTROL: prove the coverage assertion can fail. Re-run it against the exact
     pre-fix item, which is what he found on screen this morning. */
  console.log('\n== CONTROL: the pre-fix r-105 must FAIL this harness ==');
  const prefix105 = { id: 'r-105', topic: 'Digital Citizen' };
  const savedAnchor = ANCHORS['r-105'];
  ANCHORS['r-105'] = ['digital citizen'];
  const controlProblem = auditItem(prefix105, bodies);
  ANCHORS['r-105'] = savedAnchor;
  check(!!controlProblem, 'pre-fix r-105 is rejected: ' + (controlProblem || 'IT PASSED - the check is toothless'));

  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL PASS') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
}

run();
