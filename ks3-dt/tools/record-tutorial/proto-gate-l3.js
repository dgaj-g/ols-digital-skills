/* proto-gate-l3.js — SPEC §B, THE PROTOTYPE GATE, PREVIEW HALF.
 *
 * The L3 round adds three things to the runner that v1 never had: Skulpt
 * SUSPENSIONS (so input() can wait on a promise), `import random` with a seed,
 * and a typed editor run at class scale. §B's law is the C2 precedent: none of
 * it is "promised" to a lesson until it has been PROVED, and the evidence is
 * filed. This runs the shared probe (ks3-dt/probes/python-runtime-v2/probe.js)
 * in a real Chromium against the real vendored Skulpt. The SANDBOX-ORIGIN half
 * runs the same bytes inside the live googleusercontent document.
 *
 *   node proto-gate-l3.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('./node_modules/playwright');

const SKULPT = path.join(__dirname, '..', '..', 'platform', 'assets', 'vendor', 'skulpt');
const PROBE = path.join(__dirname, '..', '..', 'probes', 'python-runtime-v2', 'probe.js');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--js-flags=--expose-gc'] });
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.addScriptTag({ path: path.join(SKULPT, 'skulpt.min.js') });
  await page.addScriptTag({ path: path.join(SKULPT, 'skulpt-stdlib.js') });
  await page.addScriptTag({ path: PROBE });
  const rows = await page.evaluate(() => window.PROTO2());
  await browser.close();

  console.log('=== SPEC §B PROTOTYPE GATE — PREVIEW HALF (real Chromium, real vendored Skulpt) ===');
  let fails = 0;
  for (const r of rows) {
    if (!r.pass) fails++;
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${r.name}\n        ${r.detail}`);
  }
  console.log(fails ? `\n§B PREVIEW HALF FAILED (${fails})` : '\n§B PREVIEW HALF GREEN — ' + rows.length + ' rows');
  process.exit(fails ? 1 : 0);
})();
