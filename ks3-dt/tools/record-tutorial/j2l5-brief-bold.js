/* J2 L5 V2 §20: staff.js shows **bold** in brief purpose lines; a brief with no bold renders exactly as before (DOM diff). Control pinned to 96fe4bb (main before PR 101).
   Runs briefBody from origin/main's staff.js and from this branch's on every lesson brief in content-src, and compares. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ROOT = path.join(__dirname, '../../..'), SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
function loadBrief(code) {
  const a = code.indexOf('  function briefText('), b = code.indexOf('\n  }\n', code.indexOf('  function briefBody(')) + 4;
  const sh = code.indexOf('  function briefShot('), shEnd = code.indexOf('\n  }\n', sh) + 4;
  const hr = code.indexOf('  function briefHref('), hrEnd = code.indexOf('\n  }\n', hr) + 4;
  const ctx = { App: { asset: h => 'A/' + h, esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') } };
  vm.runInNewContext((sh > -1 ? code.slice(sh, shEnd) : '') + (hr > -1 ? code.slice(hr, hrEnd) : '') + code.slice(a, b) + '\nthis.briefBody = briefBody;', ctx);
  return ctx.briefBody;
}
const oldB = loadBrief(cp.execSync('git show 96fe4bb:ks3-dt/platform/staff.js', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1e8 }));
const newB = loadBrief(fs.readFileSync(path.join(ROOT, 'ks3-dt/platform/staff.js'), 'utf8'));
let fails = 0, n = 0; const must = (ok, msg) => { console.log('  ' + (ok ? 'PASS' : 'FAIL') + ' ' + msg); if (!ok) fails++; };
const strip = r => JSON.parse(JSON.stringify(r).replace(/\*\*/g, ''));
const briefs = [];
for (const y of ['j1', 'j2', 'j3']) { const dir = path.join(SRC, y, 'lessons'); if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => /\.json$/.test(f))) { const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); if (d.teacherBrief) briefs.push([f, d.teacherBrief]); } }
for (const [f, r] of briefs) {
  const plain = /\*\*/.test(JSON.stringify(r.purpose || [])) ? strip(r) : r;
  if (plain !== r) continue;
  n++; if (oldB(r, 'X') !== newB(r, 'X')) must(false, f + ': a brief with no bold in its purpose renders differently');
}
must(fails === 0, 'every brief with no bold in its purpose renders exactly as before (' + n + ' briefs)');
const j = briefs.find(b => b[0] === 'j2-05.json')[1], html = newB(j, 'X');
must(/<b>with headphones<\/b>/.test(html), 'J2 L5 brief shows "with headphones" in bold');
must(/<b>A loop makes the computer do the same job many times\.<\/b>/.test(html), 'J2 L5 brief shows the loop sentence in bold');
must(!/\*\*/.test(html), 'no ** left showing in the J2 L5 brief');
/* CONTROL: origin/main's staff.js leaves the stars showing */
const ctl = oldB(j, 'X'); console.log('  ' + (/\*\*with headphones\*\*/.test(ctl) ? 'PASS' : 'FAIL') + ' CONTROL the old staff.js shows the stars, so the gate can fail'); if (!/\*\*with headphones\*\*/.test(ctl)) fails++;
console.log('\nj2l5-brief-bold: ' + (fails ? 'FAIL · ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
