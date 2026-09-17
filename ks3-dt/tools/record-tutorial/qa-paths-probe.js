#!/usr/bin/env node
/* qa-paths-probe.js — THE PATH CHECK, PROVED ON THE ENGINE (K44 / DFM 283 / spec §C8).
 *
 * Fable's controls for `checkPaths` (L4_PROTOTYPES/probes/controls.html), run
 * VERBATIM against the routine as it now lives in engines.js (`PyRun.checkPaths`
 * over `PyRun.runPy`). A control is a planted fault that must be caught; a
 * pass-control is a correct room that must not be:
 *   · the house library ticks all five features; the doors read A / B / A from
 *     the real runs; scene and story split at the question
 *   · no else → the banana test fails catch-all ONLY, and the stranger reached
 *     NO door
 *   · "lamp" vs "Lamp" → the first word falls through to the else road (the table
 *     shows it)
 *   · identical stories fail `different` only
 *   · a question that does not say the words fails scene-ask only
 *   · a single = stops every row with the real SyntaxError
 *   · two questions fail scene-ask (exactly one input)
 *   · the untouched palette with her real words declared: scene-ask fails and
 *     both words fall to the same else story
 * CONTROL (DFM 196): the engine of the build he sat (git show 8f58434) has no
 * `PyRun.checkPaths` and no `PyRun.runPy` at all — the routine is new.
 *
 *   node qa-paths-probe.js
 */
'use strict';
const { enginePage } = require('./lib/l4-engine-page.js');
const BASE_REF = process.env.KS3DT_L4_BASE || '8f58434';

let failures = 0;
const check = (ok, m, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m + (!ok && d ? '   [' + d + ']' : '')); if (!ok) failures++; };
const control = (ok, m, d) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m + (!ok && d ? '   [' + d + ']' : '')); if (!ok) failures++; };

const LIBRARY = [
  'print("You are in the library. The lights are off, but one lamp is on.")',
  'choice = input("Do you go to the lamp, the desk or the door? Type lamp, desk or door.")',
  'if choice == "lamp":',
  '    print("The lamp flickers. Under it is a book with your name on it.")',
  '    print("NEXT: door A")',
  'elif choice == "desk":',
  '    print("On the desk is a note in red pen: DO NOT OPEN THE DRAWER.")',
  '    print("NEXT: door B")',
  'else:',
  '    print("You stand still. Somewhere, a chair scrapes.")',
  '    print("NEXT: door A")'
].join('\n');
const PLACEHOLDER = [
  'print("You are in the PLACE. SAY WHAT THE PLAYER CAN SEE.")',
  'choice = input("Do you FIRST or SECOND? Type FIRST or SECOND.")',
  'if choice == "FIRST":', '    print("SAY WHAT HAPPENS ON THIS ROAD.")', '    print("NEXT: door A")',
  'elif choice == "SECOND":', '    print("SAY WHAT HAPPENS ON THE OTHER ROAD.")', '    print("NEXT: door B")',
  'else:', '    print("SAY WHAT HAPPENS IF THEY TYPE SOMETHING ELSE.")', '    print("NEXT: door A")'
].join('\n');

(async () => {
  console.log('qa-paths-probe — Fable\'s path-check controls, on the engine\n');
  const { browser, page, errs } = await enginePage({});
  const paths = (code, cfg) => page.evaluate(([c, k]) => window.PyRun.checkPaths(c, k), [code, cfg]);
  const CFG = { words: ['lamp', 'desk'], stranger: 'banana' };

  let r = await paths(LIBRARY, CFG);
  check(r.features['scene-ask'] && r.features['path-1'] && r.features['path-2'] && r.features['catch-all'] && r.features['different'],
    'paths: the house library ticks all five', JSON.stringify(r.features));
  check(r.rows[0].door === 'A' && r.rows[1].door === 'B' && r.rows[2].door === 'A', 'paths: doors read A / B / A from the real runs');
  check(r.rows[0].scene.indexOf('library') !== -1 && r.rows[0].story.indexOf('flickers') !== -1, 'paths: scene and story split at the question');

  const NO_ELSE = LIBRARY.split('\n').slice(0, 8).join('\n');
  r = await paths(NO_ELSE, CFG);
  control(!r.features['catch-all'] && r.features['path-1'] && r.features['path-2'], 'a room with no else fails the banana test only', JSON.stringify(r.features));
  control(r.rows[2].door === null, 'the stranger reached NO door');

  const CAPS = LIBRARY.replace('if choice == "lamp":', 'if choice == "Lamp":');
  r = await paths(CAPS, CFG);
  control(r.features['path-1'] === true && r.rows[0].story.indexOf('chair scrapes') !== -1,
    '"lamp" vs "Lamp" — the first word falls through to the else road (the table shows it)', r.rows[0].story);

  const SAME = LIBRARY.replace('On the desk is a note in red pen: DO NOT OPEN THE DRAWER.', 'The lamp flickers. Under it is a book with your name on it.');
  r = await paths(SAME, CFG);
  control(!r.features['different'] && r.features['path-1'] && r.features['path-2'], 'identical stories fail "different" only');

  const NOWORDS = LIBRARY.replace('Do you go to the lamp, the desk or the door? Type lamp, desk or door.', 'What do you do?');
  r = await paths(NOWORDS, CFG);
  control(!r.features['scene-ask'] && r.features['path-1'], 'a question that does not say the words fails scene-ask only');

  const BADEQ = LIBRARY.replace('if choice == "lamp":', 'if choice = "lamp":');
  r = await paths(BADEQ, CFG);
  control(r.rows.every(x => !x.ok && /SyntaxError/.test(x.err)) && !r.features['path-1'], 'a single = stops the run with a SyntaxError on every row', r.rows[0].err);

  const TWOQ = LIBRARY.replace('if choice == "lamp":', 'again = input("Are you sure?")\nif choice == "lamp":');
  r = await paths(TWOQ, CFG);
  control(!r.features['scene-ask'] && r.rows[0].asks.length === 2, 'two questions fail scene-ask (exactly one input)');

  r = await paths(PLACEHOLDER, { words: ['gym', 'pool'], stranger: 'banana' });
  control(!r.features['scene-ask'] && r.features['catch-all'] && r.rows[0].story === r.rows[1].story,
    'the untouched palette with her real words declared — scene-ask fails and both words fall to the same else story');

  /* the runner underneath: the queue, the asks record and the clock reset are PyRun.start's */
  const q = await page.evaluate(() => window.PyRun.runPy('a = input("one?")\nb = input("two?")\nprint(a + b)', { inputs: ['x'] }));
  check(q.ok && q.asks.length === 2 && q.asks[0].prompt === 'one?' && q.out.trim() === 'x', 'runPy: the queue answers in order and an unanswered input resolves "" rather than hanging', JSON.stringify(q));
  check(errs.length === 0, 'no page errors', errs.join(' | '));
  await page.close();

  console.log('\n-- CONTROL: the engine he sat has no path check --');
  const base = await enginePage({ browser, ref: BASE_REF });
  const has = await base.page.evaluate(() => ({ paths: typeof (window.PyRun && PyRun.checkPaths), runPy: typeof (window.PyRun && PyRun.runPy) }));
  control(has.paths === 'undefined' && has.runPy === 'undefined', 'the pre-change engine (' + BASE_REF + ') carries neither PyRun.checkPaths nor PyRun.runPy — the routine is new', JSON.stringify(has));
  await browser.close();
  console.log('');
  if (failures) { console.log('qa-paths-probe: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-paths-probe: ALL GREEN');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
