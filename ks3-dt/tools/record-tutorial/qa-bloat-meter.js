#!/usr/bin/env node
/* qa-bloat-meter.js — THE BLOAT METER'S NUMBERS ARE MEASURED, NOT ASSERTED (§C13, j3-04).
 *
 * The meter on machine-1 says "the twelve-order program is N lines; one machine
 * used twelve times is M lines" and that both print the same thing. As drafted
 * (24 → 14) no pair of real programs could make that true (PROGRESS, DFM 197),
 * so the content now carries BOTH programs (`meter.before.lines`,
 * `meter.after.lines`) and the engine counts from them. This gate runs both in
 * the platform's own Skulpt and holds three things:
 *   · the two programs print IDENTICAL output, line for line;
 *   · the authored counts (`beforeLines` / `afterLines`) equal the programs' real
 *     lengths, and the engine's own `PyRun.meterHtml` shows those numbers;
 *   · the `say` sentence names the printed line count truthfully (twenty-four).
 * CONTROL (DFM 196): a meter whose `after` program prints one line differently
 * FAILS the identical-output check; a meter whose count is off by one FAILS the
 * count check.
 *
 *   node qa-bloat-meter.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { enginePage } = require('./lib/l4-engine-page.js');

const SRC = process.env.KS3DT_SRC || path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const L = JSON.parse(fs.readFileSync(path.join(SRC, 'j3', 'lessons', 'j3-04.json'), 'utf8'));
const meterOf = (chunkId) => (L.chunks.find(c => c.id === chunkId) || {}).config.meter;

let failures = 0;
const check = (ok, m, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m + (!ok && d ? '   [' + String(d).slice(0, 300) + ']' : '')); if (!ok) failures++; };
const control = (ok, m, d) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m + (!ok && d ? '   [' + d + ']' : '')); if (!ok) failures++; };
const WORDS = { 24: 'twenty-four', 15: 'fifteen', 12: 'twelve' };

(async () => {
  console.log('qa-bloat-meter — the two programs behind the meter, run for real\n');
  const M = meterOf('machine-1');
  check(!!M && Array.isArray(M.before && M.before.lines) && Array.isArray(M.after && M.after.lines), 'machine-1 carries a meter with both real programs');
  const { browser, page, errs } = await enginePage({});
  const runPy = (code) => page.evaluate((c) => window.PyRun.runPy(c, {}), code);

  const before = M.before.lines.join('\n'), after = M.after.lines.join('\n');
  const rb = await runPy(before), ra = await runPy(after);
  check(rb.ok && ra.ok, 'both programs run without error', JSON.stringify({ b: rb.err, a: ra.err }));
  const outB = String(rb.out || '').replace(/\s+$/, ''), outA = String(ra.out || '').replace(/\s+$/, '');
  check(outB === outA && outB.length > 0, 'they print IDENTICAL output (' + outB.split('\n').length + ' lines)', JSON.stringify({ b: outB.slice(0, 120), a: outA.slice(0, 120) }));
  const printed = outB.split('\n').length;
  check(M.before.lines.length === Number(M.beforeLines), 'the authored "before" count is the before program\'s real length (' + M.before.lines.length + ')', M.beforeLines);
  check(M.after.lines.length === Number(M.afterLines), 'the authored "after" count is the after program\'s real length (' + M.after.lines.length + ')', M.afterLines);
  check(M.after.lines.length < M.before.lines.length, 'and the machine version really is shorter');
  const html = await page.evaluate((m) => window.PyRun.meterHtml(m), M);
  check(html.indexOf(String(M.before.lines.length) + ' lines') !== -1 && html.indexOf(String(M.after.lines.length) + ' lines') !== -1,
    'the engine draws those two numbers from the programs (' + M.before.lines.length + ' / ' + M.after.lines.length + ')', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
  const w = WORDS[printed];
  check(!!w && new RegExp(w, 'i').test(M.say), 'the meter\'s sentence names the printed line count in words ("' + w + '")', M.say);

  /* CONTROLS */
  const bad = JSON.parse(JSON.stringify(M));
  bad.after.lines[1] = '    print(name + " x " + str(seats + 1))';
  const rbad = await runPy(bad.after.lines.join('\n'));
  control(String(rbad.out || '').replace(/\s+$/, '') !== outB, 'an "after" program that prints one thing differently FAILS the identical-output check');
  control(!(bad.before.lines.length === Number(bad.beforeLines) - 1), 'a count one off the program\'s length FAILS the count check');
  const htmlBad = await page.evaluate((m) => window.PyRun.meterHtml(m), Object.assign({}, M, { beforeLines: 99 }));
  control(htmlBad.indexOf('99 lines') === -1, 'the engine ignores an authored number that disagrees with the program (counts come from the lines, DFM 144)');

  await browser.close();
  check(errs.length === 0, 'no page errors', errs.join(' | '));
  console.log('');
  if (failures) { console.log('qa-bloat-meter: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-bloat-meter: ALL GREEN');
})().catch(e => { console.error(e); process.exit(1); });
