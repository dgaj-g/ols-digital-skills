/* qa-parsons-stacks.js — the two-stack build puzzle (DFM 186).
 *
 * DAMIEN, 10 Aug 2026, sitting Lesson 3's closing puzzle:
 *   "in the challenge at the end where the pupil has to build the program,
 *    there is a problem because, even though they are presented with 4 lines,
 *    they are actually 2 separate code blocks, one forever and the other the
 *    input, but the end result looks like one continuous program that shows no
 *    reflection of the 2 different blocks. How can we fix this?"
 *
 * He is right, and the card's own explanation already said so in words ("Two
 * stacks, two shapes of code") while the screen numbered them 1-4 as one
 * program. The program side now renders one labelled box per stack, numbered
 * WITHIN each box.
 *
 * THE CHECK THAT MATTERS MOST IS SECTION 2. Re-rendering a MARKED question is
 * exactly the kind of change that can quietly break its marking: if the two
 * boxes were flattened in the wrong order, every pupil who built it correctly
 * would be told she was wrong, and nothing on screen would look broken. So this
 * harness runs the app's OWN permutation encoder over a correct two-box build
 * and insists it lands on the stored answer key.
 *
 * Why this is a source-and-logic harness rather than another lesson walk: the
 * rendered result is already photographed on every sit-review run
 * (qa-l2-l5-review/l3/05x-exitp-parsons-*.png shows the two labelled boxes, the
 * per-box numbering and the two-box answer reveal), and Lesson 2's untouched
 * single-column puzzle is walked end-to-end by qa-parsons-drag. Walking a third
 * time to re-photograph the same pixels costs four minutes of real timers and
 * proves nothing new.
 *
 * No browser, no server.  node qa-parsons-stacks.js */
const fs = require('fs');
const path = require('path');

const SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const PACKED = path.join(__dirname, '../../content');
const ENGINES = path.join(__dirname, '../../platform/engines.js');
const BUILT = path.join(__dirname, '../../platform/server/PathB_Index.html');
const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };
const control = (failed, m) => { console.log((failed ? '  PASS ' : '  FAIL ') + 'CONTROL: ' + m); if (!failed) FAILS.push('CONTROL ' + m); };

/* the app's own encoders, copied verbatim from engines.js and asserted against
   it below - if the app's version ever changes, section 2 stops being a proof */
function permIndex(perm) {
  var n = perm.length, idx = 0, used = [];
  for (var i = 0; i < n; i++) {
    var smaller = 0;
    for (var j = 0; j < perm[i]; j++) if (used.indexOf(j) === -1) smaller++;
    var f = 1;
    for (var k = 2; k <= n - 1 - i; k++) f *= k;
    idx += smaller * f;
    used.push(perm[i]);
  }
  return idx;
}
function permFromIndex(idx, n) {
  var pool = [], out = [];
  for (var i = 0; i < n; i++) pool.push(i);
  for (var p = n - 1; p >= 1; p--) {
    var f = 1;
    for (var k = 2; k <= p; k++) f *= k;
    var d = Math.floor(idx / f);
    idx = idx % f;
    out.push(pool.splice(d, 1)[0]);
  }
  out.push(pool[0]);
  return out;
}

const eng = fs.readFileSync(ENGINES, 'utf8');
const built = fs.readFileSync(BUILT, 'utf8');
const readL = (root, f) => JSON.parse(fs.readFileSync(path.join(root, 'j1/lessons/' + f), 'utf8'));

console.log('== 1. the content declares two stacks that fit the blocks ==');
let stacks = null, item = null, key = null;
for (const [label, root] of [['source', SRC], ['packed', PACKED]]) {
  const L3 = readL(root, 'j1-03.json');
  const ep = L3.chunks.find(c => c.id === 'exitp').config;
  check(Array.isArray(ep.stacks) && ep.stacks.length === 2, label + ': the puzzle declares TWO stacks');
  const sum = (ep.stacks || []).reduce((a, s) => a + Number(s.size || 0), 0);
  check(sum === ep.item.blocks.length,
    label + ': the stack sizes add up to the number of blocks (' + sum + ' of ' + ep.item.blocks.length + ') — no block can be homeless, no slot can sit empty for ever');
  check((ep.stacks || []).every(s => String(s.label || '').trim().length > 3),
    label + ': every stack is LABELLED with the job it does — an unlabelled box would just be the old single column in two pieces');
  check(/TWO separate stacks/.test(String(ep.intro || '')),
    label + ': the intro tells her it is two separate stacks before she starts');
  if (label === 'source') { stacks = ep.stacks; item = ep.item; key = L3.keys[ep.item.id].a; }
}

console.log('\n== 2. THE MARKING SURVIVED THE RE-RENDER (the check that matters) ==');
/* the encoders here must still be the app's own */
check(/function permIndex\(perm\) \{[\s\S]{0,400}?used\.push\(perm\[i\]\);/.test(eng),
  "engines.js still encodes an answer with permIndex, so this section is testing the app's real arithmetic");
const answer = permFromIndex(Number(key), item.blocks.length);
let cut = 0;
const boxes = stacks.map(s => { const b = answer.slice(cut, cut + Number(s.size)); cut += Number(s.size); return b; });
stacks.forEach((s, k) => {
  console.log('    ' + s.label + ':  ' + boxes[k].map(i => item.blocks[i]).join('  |  '));
});
const flat = boxes.reduce((a, b) => a.concat(b), []);
check(permIndex(flat) === Number(key),
  'a pupil who fills the two boxes correctly is marked RIGHT: flattening job one then job two gives ' +
  permIndex(flat) + ', which is the stored key (' + key + ')');
/* and the reverse, or the check above proves nothing */
const swapped = boxes[1].concat(boxes[0]);
control(permIndex(swapped) !== Number(key),
  'filling the two jobs the wrong way round does NOT mark right (' + permIndex(swapped) + ' against ' + key + ')');
control(permIndex([0, 1, 2, 3]) !== Number(key),
  'and neither does dropping the blocks in tray order');

console.log('\n== 3. the engine renders per-box numbering, and gates all of it ==');
check(/var STACKS = \(cfg\.stacks && cfg\.stacks\.length\) \? cfg\.stacks : null;/.test(eng),
  'the whole feature is gated on cfg.stacks — a puzzle without it takes the old path');
check(/boxes\.forEach\(function \(list, k\) \{[\s\S]{0,600}?'<li><span class="pp-num">' \+ \(i \+ 1\) \+ '\.<\/span>'/.test(eng),
  'numbering restarts at 1 INSIDE each box (i + 1 per list), never 1-4 straight down two stacks');
check(/if \(boxes\[k\]\.length >= capOf\(k\)\)/.test(eng),
  'a full job refuses a fifth block rather than silently swapping one out');
check(/ctx\.markItem\(it\.id, permIndex\(flat\(\)\)\)/.test(eng),
  'the marking flattens the boxes and calls the SAME markItem as before');
check(/answerHtml = STACKS[\s\S]{0,700}?pa-box/.test(eng),
  'the wrong-answer reveal draws the working order in the same two boxes');
check(/answerHtml = '<ol class="parsons-answer">'/.test(eng),
  'and a puzzle without stacks still gets the plain single list it always had');

console.log('\n== 4. the built shell he pastes carries it too (DFM 162b) ==');
check(/var STACKS = \(cfg\.stacks && cfg\.stacks\.length\)/.test(built), 'PathB_Index.html carries the gated two-stack renderer');
check(/pp-box-label/.test(built) && /pa-box/.test(built), 'and both the build boxes and the answer boxes');
check(/TWO separate stacks/.test(built), "and the pupil's own wording, in the artefact he actually pastes");

console.log('\n== 5. CONTROL: every other lesson is untouched ==');
['j1-01.json', 'j1-02.json', 'j1-04.json', 'j1-05.json', 'j1-sq1.json'].forEach(f => {
  const p = path.join(SRC, 'j1/lessons/' + f);
  if (!fs.existsSync(p)) return;
  const L = JSON.parse(fs.readFileSync(p, 'utf8'));
  const withStacks = (L.chunks || []).filter(c => c.config && c.config.stacks);
  control(withStacks.length === 0, f + ' declares no stacks, so its puzzle renders exactly as it did before');
});

console.log('\n=========================================');
console.log(FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL TWO-STACK CHECKS PASSED');
process.exit(FAILS.length ? 1 : 0);
