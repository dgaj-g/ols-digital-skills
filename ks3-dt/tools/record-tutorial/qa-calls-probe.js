#!/usr/bin/env node
/* qa-calls-probe.js — THE FACTORY FLOOR'S JUDGE, PROVED ON THE ENGINE (K44 / DFM 283 / §C8).
 *
 * Fable's controls for `checkCalls` (L4_PROTOTYPES/probes/controls.html), run
 * VERBATIM against `PyRun.checkCalls` over `PyRun.runPy`:
 *   · a correct label machine matches every order, and her own test print
 *     survives while the marker lines do not; a correct cost machine gives 8/20/4
 *   · print-instead-of-return stamps None on every product
 *   · swapped slots in her def → a TypeError per order beside the expected
 *     "Aoife x 2"; the swap that DOES run makes "2 x Aoife"
 *   · a misspelt machine name → the floor cannot find "label"
 *   · a number joined without str( ) → a TypeError per order, never a crash of
 *     the floor
 *   · a program that stops before the floor runs reports the real error and
 *     judges nothing
 *   · the chained receipt machine matches
 * CONTROL (DFM 196): the engine he sat has no `PyRun.checkCalls`.
 *
 *   node qa-calls-probe.js
 */
'use strict';
const { enginePage } = require('./lib/l4-engine-page.js');
const BASE_REF = process.env.KS3DT_L4_BASE || '8f58434';
let failures = 0;
const check = (ok, m, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m + (!ok && d ? '   [' + d + ']' : '')); if (!ok) failures++; };
const control = (ok, m, d) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m + (!ok && d ? '   [' + d + ']' : '')); if (!ok) failures++; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const REF_LABEL = 'def label(name, seats):\n    return name + " x " + str(seats)';
const REF_COST = 'def cost(seats):\n    return seats * 4';
const ORDERS = [['Aoife', 2], ['Ben', 4], ['Cara', 1]];

(async () => {
  console.log('qa-calls-probe — Fable\'s floor-judge controls, on the engine\n');
  const { browser, page, errs } = await enginePage({});
  const calls = (code, cfg) => page.evaluate(([c, k]) => window.PyRun.checkCalls(c, k), [code, cfg]);

  let c = await calls(REF_LABEL + '\n' + REF_COST + '\nprint(label("Aoife", 2))', { fn: 'label', args: ORDERS, reference: REF_LABEL });
  check(c.allOk && c.products[0].product === 'Aoife x 2' && c.products[1].expected === 'Ben x 4', 'calls: a correct label machine matches every order', JSON.stringify(c.products.map(p => p.product)));
  check(c.out.trim() === 'Aoife x 2', 'calls: her own test print survives, the marker lines do not', JSON.stringify(c.out));
  c = await calls(REF_COST, { fn: 'cost', args: [[2], [5], [1]], reference: REF_COST });
  check(c.allOk && eq(c.products.map(p => p.product), ['8', '20', '4']), 'calls: a correct cost machine gives 8 / 20 / 4');

  c = await calls('def cost(seats):\n    print(seats * 4)', { fn: 'cost', args: [[2], [5]], reference: REF_COST });
  control(!c.allOk && c.products.every(p => p.none) && c.products[0].product === 'None', 'print-instead-of-return stamps None on every product');

  c = await calls('def label(seats, name):\n    return name + " x " + str(seats)', { fn: 'label', args: ORDERS, reference: REF_LABEL });
  control(!c.allOk && c.products.every(p => /TypeError/.test(p.err)) && c.products[0].expected === 'Aoife x 2', 'swapped slots in her def → a TypeError per order beside the expected "Aoife x 2"', c.products[0].err);
  c = await calls('def label(seats, name):\n    return str(name) + " x " + str(seats)', { fn: 'label', args: ORDERS, reference: REF_LABEL });
  control(!c.allOk && c.products[0].product === '2 x Aoife' && !c.products[0].err, 'a swap that runs makes "2 x Aoife" beside the expected "Aoife x 2"', c.products[0].product);

  c = await calls('def lable(name, seats):\n    return name', { fn: 'label', args: ORDERS, reference: REF_LABEL });
  control(!c.defined && c.products.every(p => p.noMachine), 'a misspelt machine name → the floor cannot find "label"');

  c = await calls('def label(name, seats):\n    return name + " x " + seats', { fn: 'label', args: ORDERS, reference: REF_LABEL });
  control(!c.allOk && c.products.every(p => /TypeError/.test(p.err)), 'joining a number without str( ) → a TypeError per order, never a crash of the floor', c.products[0].err);

  c = await calls('def cost(seats):\n    return seats * 4\nprint(missing)', { fn: 'cost', args: [[2]], reference: REF_COST });
  control(!c.ok && /NameError/.test(c.err) && !c.defined, 'a program that stops before the floor runs reports the real error and judges nothing');

  const CHAIN = REF_LABEL + '\n' + REF_COST + '\ndef receipt(name, seats):\n    return label(name, seats) + " - " + str(cost(seats)) + " pounds"';
  c = await calls(CHAIN, { fn: 'receipt', args: ORDERS, reference: CHAIN });
  check(c.allOk && c.products[0].product === 'Aoife x 2 - 8 pounds', 'calls: the chained receipt machine matches', c.products[0].product);
  check(errs.length === 0, 'no page errors', errs.join(' | '));
  await page.close();

  console.log('\n-- CONTROL: the engine he sat has no floor judge --');
  const base = await enginePage({ browser, ref: BASE_REF });
  const has = await base.page.evaluate(() => typeof (window.PyRun && PyRun.checkCalls));
  control(has === 'undefined', 'the pre-change engine (' + BASE_REF + ') carries no PyRun.checkCalls — the routine is new', has);
  await browser.close();
  console.log('');
  if (failures) { console.log('qa-calls-probe: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-calls-probe: ALL GREEN');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
