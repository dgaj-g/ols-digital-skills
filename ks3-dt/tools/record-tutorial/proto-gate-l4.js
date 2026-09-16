/* proto-gate-l4.js — SPEC §C9.1 (b)/(c), THE L4 PROTOTYPE GATE, PREVIEW HALF.
 *
 * The relay player (a room runs, a door resolves, five rooms chain), the path
 * check with three inputs, the floor's judge across twelve orders, and the
 * human-pace run (DFM 269: an input wait is never billed) — all on the real
 * vendored Skulpt in a real Chromium. The SANDBOX-ORIGIN half runs the same
 * bytes (ks3-dt/probes/python-runtime-l4/probe.js) inside the live
 * googleusercontent document, the route proven 18 Aug and 27 Aug.
 *
 *   node proto-gate-l4.js
 */
const path = require('path');
const { chromium } = require('./node_modules/playwright');

const SKULPT = path.join(__dirname, '..', '..', 'platform', 'assets', 'vendor', 'skulpt');
const PROBE = path.join(__dirname, '..', '..', 'probes', 'python-runtime-l4', 'probe.js');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--js-flags=--expose-gc'] });
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.addScriptTag({ path: path.join(SKULPT, 'skulpt.min.js') });
  await page.addScriptTag({ path: path.join(SKULPT, 'skulpt-stdlib.js') });
  await page.addScriptTag({ path: PROBE });
  const rows = await page.evaluate(() => window.PROTO4(), null);
  await browser.close();

  console.log('=== SPEC §C9.1 L4 PROTOTYPE GATE — PREVIEW HALF (real Chromium, real vendored Skulpt) ===');
  let fails = 0;
  for (const r of rows) {
    if (!r.pass) fails++;
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${r.name}\n        ${r.detail}`);
  }
  console.log(fails ? `\n§C9.1 PREVIEW HALF FAILED (${fails})` : '\n§C9.1 PREVIEW HALF GREEN — ' + rows.length + ' rows');
  process.exit(fails ? 1 : 0);
})();
