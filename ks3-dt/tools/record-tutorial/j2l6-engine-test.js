#!/usr/bin/env node
/* j2l6-engine-test — J2 L6 The Headliner, gate G2: the sheet engine (J2_L6_SPEC.md §6.3, §17).
   Grammar, functions, error codes, fillDown's moving references, and display. Runs on the SHIPPED sheet.js.
   Planted control: =B3*(1+B2) on Shop C4 (text in arithmetic) MUST show #VALUE!; a copy of sheet.js that turns text
   into 0 must fail this gate (self-control).
   Usage: node j2l6-engine-test.js */
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const HOUR = process.env.J2L6_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/headliner/hour');
global.window = global;
require(process.env.J2L6_SHEET || path.join(HOUR, 'sheet.js')); require(path.join(HOUR, 'tasks.js'));
const S = global.Sheet, T = global.Tasks;
let n = 0, fails = 0;
function must(ok, what) { n++; if (!ok) fails++; if (!ok || process.env.VERBOSE) console.log((ok ? 'ok   ' : 'FAIL ') + what); }
function book() { const wb = new S.Workbook(), p = wb.add('plan', 4, 13), m = wb.add('merch', 3, 6);
  Object.entries(T.start.plan).forEach(([k, v]) => p.set(k, v)); Object.entries(T.start.merch).forEach(([k, v]) => m.set(k, v));
  m.set('A2', 'Item'); m.set('B2', 'Price £'); m.set('C2', 'With VAT £'); m.set('A1', 'VAT rate'); return wb; }
const v = (f, sheet) => { const wb = book(), s = wb.sheet(sheet || 'plan'); s.set('A13', f); return s.value('A13'); };
const err = x => S.isErr(x) ? x.err : null;
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9;
/* grammar */
must(near(v('=1+2*3'), 7), 'precedence 1+2*3 = 7');
must(near(v('=(1+2)*3'), 9), 'brackets (1+2)*3 = 9');
must(near(v('=-B3+1'), -1199), 'unary minus');
must(near(v('=2^3'), 8), 'power');
must(near(v('=50%'), 0.5), 'percent');
must(near(v('=B3*C3'), 30000), 'refs B3*C3 = 30000');
must(near(v('=b3*c3'), 30000), 'lower case refs');
must(near(v('= B3 * C3 '), 30000), 'spaces');
must(v('=B3>1000') === true, 'comparison >');
must(v('=B3<>1200') === false, 'comparison <>');
must(near(v('=D7+1'), 1), 'empty box counts as 0');
/* functions */
must(near(v('=SUM(D8:D10)'), 38000), 'SUM range');
must(near(v('=sum(D8,D9,D10)'), 38000), 'SUM list lower case');
must(near(v('=AVERAGE(D8:D10)'), 38000 / 3), 'AVERAGE');
must(near(v('=MIN(D8:D10)'), 6000) && near(v('=MAX(D8:D10)'), 18000), 'MIN and MAX');
must(near(v('=ROUND(2.345,2)'), 2.35) || near(v('=ROUND(2.345,2)'), 2.34), 'ROUND');
must(v('=IF(B3>1000,"Big night","Quiet night")') === 'Big night', 'IF true branch (the §9.1 demo)');
must(v('=IF(B3>5000,"Big night","Quiet night")') === 'Quiet night', 'IF false branch');
/* errors: the real codes */
must(err(v('=B3xC3')) !== null, 'letter x is an error (' + err(v('=B3xC3')) + ')');
must(err(v('=1/0')) === '#DIV/0!', '#DIV/0!');
must(err(v('=B3*')) === '#SYNTAX' || err(v('=B3*')) !== null, 'dangling operator is an error');
must(err(v('=SUM(D8:D10')) !== null, 'unclosed bracket is an error');
must(err(v('=ZZ999')) === '#REF!' || err(v('=ZZ999')) !== null, 'off-sheet box is an error');
{ const wb = book(), p = wb.sheet('plan'); p.set('D3', '=D3*2'); must(err(p.value('D3')) !== null, 'a box that uses itself is an error (' + err(p.value('D3')) + ')'); }
{ const wb = book(), p = wb.sheet('plan'); p.set('D3', '=D4'); p.set('D4', '=D3'); must(err(p.value('D3')) === '#CYCLE!', 'a loop of two is #CYCLE!'); }
/* THE PLANTED CONTROL: the wobble's C4 */
{ const wb = book(), m = wb.sheet('merch'); m.set('C4', '=B4*(1+B2)'); must(err(m.value('C4')) === '#VALUE!', 'PLANTED =B4*(1+B2) on Shop C4 (B2 is the word Price) → #VALUE! (got ' + JSON.stringify(m.value('C4')) + ')'); }
{ const wb = book(), m = wb.sheet('merch'); m.set('C4', '=B3*(1+B2)'); must(err(m.value('C4')) === '#VALUE!', 'PLANTED =B3*(1+B2) on Shop C4 → #VALUE!'); }
/* fillDown */
{ const wb = book(), p = wb.sheet('plan'); p.set('D3', '=B3*C3'); p.fillDown('D3', 'D5');
  must(p.rawOf('D4').replace(/\s/g, '').toUpperCase() === '=B4*C4' && p.rawOf('D5').replace(/\s/g, '').toUpperCase() === '=B5*C5', 'fillDown moves refs: ' + p.rawOf('D4') + ' ' + p.rawOf('D5'));
  must(near(p.value('D4'), 1500) && near(p.value('D5'), 4800), 'fillDown values 1,500 and 4,800'); }
{ const wb = book(), m = wb.sheet('merch'); m.set('C3', '=B3*(1+B1)'); m.fillDown('C3', 'C6');
  must(/B2/.test(m.rawOf('C4')) && /B3/.test(m.rawOf('C5')) && /B4/.test(m.rawOf('C6')), 'unpinned fill moves B1 to B2, B3, B4');
  must(err(m.value('C4')) === '#VALUE!' && near(m.value('C5'), 8 * 13) && near(m.value('C6'), 5 * 31), 'the wobble: C4 #VALUE!, C5 and C6 wrong prices'); }
{ const wb = book(), m = wb.sheet('merch'); m.set('C3', '=B3*(1+$B$1)'); m.fillDown('C3', 'C6');
  must(m.rawOf('C6').indexOf('$B$1') >= 0 && near(m.value('C6'), 6), 'pinned fill keeps $B$1'); }
{ const wb = book(), m = wb.sheet('merch'); m.set('C3', '=B3*(1+B$1)'); m.fillDown('C3', 'C6'); must(near(m.value('C5'), 9.6), 'B$1 holds the row'); }
{ const wb = book(), m = wb.sheet('merch'); m.set('C3', '=B3*(1+$B1)'); m.fillDown('C3', 'C6'); must(err(m.value('C4')) === '#VALUE!', '$B1 still moves the row'); }
/* clone is separate */
{ const wb = book(), c = wb.clone(); c.sheet('plan').set('B3', 1); must(wb.sheet('plan').value('B3') === 1200, 'clone does not touch the original'); }
/* recalculation follows a change */
{ const wb = book(), p = wb.sheet('plan'); p.set('D3', '=B3*C3'); p.set('B3', 1300); must(near(p.value('D3'), 32500), 'a change flows through'); }
console.log('\nj2l6-engine: ' + (fails ? 'FAIL · ' + fails + ' of ' + n : 'PASS · ' + n + ' checks'));
if (!process.env.J2L6_SHEET && !fails) {
  /* self-control: a sheet.js that turns text into 0 must fail */
  const src = fs.readFileSync(path.join(HOUR, 'sheet.js'), 'utf8'), tmp = path.join(require('os').tmpdir(), 'j2l6-sheet-control.js');
  const bad = src.replace(/function toNum\(([^)]*)\)\s*\{/, 'function toNum($1) { if (typeof $1 === "string" && isNaN(+$1)) return 0;');
  fs.writeFileSync(tmp, bad);
  const r = cp.spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { J2L6_SHEET: tmp }), encoding: 'utf8' });
  fs.unlinkSync(tmp);
  const caught = bad !== src && r.status !== 0;
  console.log((caught ? 'ok   ' : 'FAIL ') + 'self-control: a sheet that reads text as 0 fails this gate');
  if (!caught) process.exit(1);
}
process.exit(fails ? 1 : 0);
