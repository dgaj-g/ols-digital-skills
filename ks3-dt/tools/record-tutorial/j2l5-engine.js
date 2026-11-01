/* J2 L5 THE SEARCH Version 2 · the engine gates (spec V2 §5.3, §5.4; gates 12 and 18).
   12. Enter never runs: in the box, Enter puts in a new line (moved in by 4 after a colon) and never calls onRun.
       Only the Run button calls onRun (read from box.js: onRun is called in one place, runB.onclick).
   18. The run view tells the truth: box.run lights exactly the lines Py.trace gives, in order, and the round pill
       counts 'round r of n' up to n, where n is the number in range(n).
   Controls (must FAIL): a box whose Enter calls onRun; a run that lights look() one extra time;
   a pill read for range(19) that is checked against 20.
     node ks3-dt/tools/record-tutorial/j2l5-engine.js [--base http://localhost:8125] */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const args = process.argv.slice(2);
const BASE = (i => i === -1 ? 'http://localhost:8125' : args[i + 1])(args.indexOf('--base'));
const PAGE = BASE + '/ks3-dt/platform/assets/search/hour.html#' + encodeURIComponent('{"test":1}');
let fails = 0;
function must(ok, what) { if (!ok) fails++; console.log((ok ? '  PASS ' : '  FAIL ') + what); return ok; }

/* static half of gate 12: onRun is called only from the Run button */
function onRunSites(src) { return (src.match(/o\.onRun\(/g) || []).length === 1 && /runB\.onclick\s*=\s*function[^}]*o\.onRun\(/.test(src); }


async function runCheck(page, lines, extraLook) {
  return page.evaluate(async ({ lines, extraLook }) => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const box = Box.make(host, { rows: lines.length, readyAt: 0 }); box.ta.value = lines.join('\n');
    const r = Py.read(lines, { known: ['forward', 'left', 'right', 'look', 'say'], loops: true, i: true }); if (!r.ok) return { err: r.msg };
    const trace = Py.trace(r.prog), lit = [], pills = [];
    const light = box.light; box.light = i => { if (i >= 0) lit.push(i); light(i); };
    const lookLine = lines.findIndex(l => /look\(\)/.test(l));
    await box.run(trace, s => { const p = host.querySelector('.pill'); if (p) pills.push(p.textContent); if (extraLook && s.op === 'look') box.light(lookLine); }, { pace: 0.01 });
    box.endRun(); host.remove();
    return { want: trace.map(s => s.line), lit, pills };
  }, { lines, extraLook });
}
function sameLights(r) { return r.lit.length === r.want.length && r.lit.every((x, i) => x === r.want[i]); }
function pillsCount(r, n) {
  const nums = r.pills.map(t => (t.match(/^round (\d+) of (\d+)$/) || []).slice(1).map(Number)).filter(a => a.length);
  if (!nums.length || nums.some(a => a[1] !== n)) return false;
  const seen = [...new Set(nums.map(a => a[0]))]; return seen.length === n && seen[0] === 1 && seen[n - 1] === n;
}

(async () => {
  const src = fs.readFileSync(path.join(ROOT, 'ks3-dt/platform/assets/search/hour/box.js'), 'utf8');
  must(onRunSites(src), 'gate 12 onRun is called in one place only: the Run button');
  must(!onRunSites(src.replace("if (e.key === 'Enter') {", "if (e.key === 'Enter') { if (o.onRun) o.onRun(api.lines());")), 'CONTROL an Enter that calls onRun fails the static read');
  const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  await page.goto(PAGE); await page.waitForFunction(() => window.Box && window.Py && window.U);
  const plantRuns = async planted => { await enterCheck(page, planted); return page.evaluate(() => 0); };
  // live half of gate 12: count runs through a spy on o.onRun
  const live = await page.evaluate(() => { window.__runs = 0; return true; });
  const e1 = await (async () => {
    await page.evaluate(() => { const host = document.createElement('div'); host.dataset.k = 'g12'; document.body.appendChild(host); window.__b12 = Box.make(host, { rows: 4, readyAt: 9, onRun: () => window.__runs++ }); });
    await page.locator('div[data-k="g12"] textarea').click(); await page.keyboard.type('for i in range(4):'); await page.keyboard.press('Enter'); await page.keyboard.type('forward(10)'); await page.keyboard.press('Enter');
    return page.evaluate(() => ({ runs: window.__runs, v: window.__b12.ta.value }));
  })();
  must(e1.runs === 0 && e1.v === 'for i in range(4):\n    forward(10)\n    ', 'gate 12 Enter adds a line (4 spaces after the colon) and never runs (' + JSON.stringify(e1.v) + ', runs ' + e1.runs + ')');
  await page.evaluate(() => { window.__b12.ta.addEventListener('keydown', e => { if (e.key === 'Enter') window.__runs++; }); });
  await page.locator('div[data-k="g12"] textarea').click(); await page.keyboard.press('Enter');
  must(!((await page.evaluate(() => window.__runs)) === 0), 'CONTROL a box whose Enter runs fails the live check');
  await page.evaluate(() => window.__b12.runB.click());
  must(await page.evaluate(() => window.__runs) >= 2, 'gate 12 the Run button does call onRun');

  const prog = ['for i in range(20):', '    forward(10)', '    look()'];
  const r = await runCheck(page, prog, false);
  must(!r.err && sameLights(r), 'gate 18 the run lights exactly the traced lines (' + r.lit.length + ' lights)');
  must(pillsCount(r, 20), 'gate 18 the pill counts round 1 of 20 … round 20 of 20');
  const c1 = await runCheck(page, prog, true);
  must(!sameLights(c1), 'CONTROL a planted extra look() light fails');
  const c2 = await runCheck(page, ['for i in range(19):', '    forward(10)', '    look()'], false);
  must(!pillsCount(c2, 20), 'CONTROL a range(19) pill checked against 20 fails');
  await b.close();
  console.log('\nj2l5-engine: ' + (fails ? 'FAIL ' + fails : 'PASS'));
  process.exit(fails ? 1 : 0);
})();
