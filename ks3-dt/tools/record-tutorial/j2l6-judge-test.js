#!/usr/bin/env node
/* j2l6-judge-test — J2 L6 The Headliner, gate G1: the judge marks by what a sum COMPUTES (J2_L6_SPEC.md §7–§11, §17).
   Runs on the SHIPPED files in ks3-dt/platform/assets/headliner/hour/ (sheet.js, judge.js, tasks.js).
   Ported whole from the prototype's judge.test.js (34 cases) + the spec's own cases (fill D3→D5, D11, Shop C3, $B1).
   Every case marked ✗ is a CONTROL: a wrong answer the judge must refuse, with its own code.
   Self-control: the gate re-runs itself with a lenient judge (probes ignored) and that run MUST fail.
   Usage: node j2l6-judge-test.js */
'use strict';
const path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const HOUR = process.env.J2L6_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/headliner/hour');
global.window = global;
require(path.join(HOUR, 'sheet.js')); require(path.join(HOUR, 'judge.js')); require(path.join(HOUR, 'tasks.js'));
const S = global.Sheet, T = global.Tasks;
let J = global.Judge;
if (process.env.J2L6_LENIENT) {   /* the control judge: forgets every probe */
  const real = J; J = { checkCell: (wb, t) => real.checkCell(wb, Object.assign({}, t, { probes: [] })), checkFill: (wb, t) => real.checkFill(wb, Object.assign({}, t, { probes: [] })) };
}
let n = 0, fails = 0, controls = 0, leniencies = 0;
function plan() {
  const wb = new S.Workbook(), p = wb.add('plan', 4, 13), m = wb.add('merch', 3, 6);
  Object.entries(T.start.plan).forEach(([k, v]) => p.set(k, v));
  Object.entries(T.start.merch).forEach(([k, v]) => m.set(k, v));
  p.set('A2', 'Thing'); p.set('B2', 'How many'); m.set('A2', 'Item'); m.set('B2', 'Price £'); m.set('C2', 'With VAT £'); m.set('A1', 'VAT rate');
  return wb;
}
function t(name, want, wb, task, isFill) {
  n++; if (name.startsWith('✗')) controls++; else if (name.startsWith('~')) leniencies++;
  const r = isFill ? J.checkFill(wb, task) : J.checkCell(wb, task), ok = r.code === want;
  if (!ok) fails++;
  if (!ok || process.env.VERBOSE) console.log((ok ? 'ok   ' : 'FAIL ') + name + ' → ' + r.code + (ok ? '' : '  wanted ' + want));
}
const P = wb => wb.sheet('plan'), M = wb => wb.sheet('merch');
let wb;
/* part 1 · D3 */
wb = plan(); P(wb).set('D3', '=B3*C3'); t('D3 right sum', 'ok', wb, T.d3);
wb = plan(); P(wb).set('D3', '=c3*b3'); t('~ D3 lower case, swapped order', 'ok', wb, T.d3);
wb = plan(); P(wb).set('D3', '= B3 * C3 '); t('~ D3 with spaces', 'ok', wb, T.d3);
wb = plan(); P(wb).set('D3', '30000'); t('✗ D3 typed 30000', 'typed', wb, T.d3);
wb = plan(); P(wb).set('D3', '=30000'); t('✗ D3 =30000', 'no-follow', wb, T.d3);
wb = plan(); P(wb).set('D3', '=1200*25'); t('✗ D3 =1200*25', 'no-follow', wb, T.d3);
wb = plan(); P(wb).set('D3', '=B3*C4'); t('✗ D3 wrong box', 'wrong', wb, T.d3);
wb = plan(); P(wb).set('D3', '=B3+C3'); t('✗ D3 plus not times', 'wrong', wb, T.d3);
wb = plan(); P(wb).set('D3', '=B3*C3*1'); t('~ D3 odd but right', 'ok', wb, T.d3);
wb = plan(); P(wb).set('D3', 'B3*C3'); t('✗ D3 forgot the =', 'wrong', wb, T.d3);
wb = plan(); P(wb).set('D3', '=B3xC3'); t('✗ D3 letter x', 'error', wb, T.d3);
wb = plan(); P(wb).set('D3', '=D3*2'); t('✗ D3 refers to itself', 'error', wb, T.d3);
wb = plan(); t('✗ D3 empty', 'empty', wb, T.d3);
/* part 2 · the fill D3→D5, D6, D11, D12 */
const fillIn = wb => { P(wb).set('D3', '=B3*C3'); P(wb).fillDown('D3', 'D5'); return wb; };
wb = fillIn(plan()); t('fill D3→D5', 'ok', wb, T.fill, true);
wb = plan(); P(wb).set('D3', '=B3*C3'); P(wb).set('D4', '1500'); P(wb).set('D5', '=B5*C5'); t('✗ fill: D4 typed', 'typed', wb, T.fill, true);
wb = plan(); P(wb).set('D3', '=B3*C3'); P(wb).set('D4', '=B3*C3'); P(wb).set('D5', '=B5*C5'); t('✗ fill: D4 copies row 3', 'fill-wobble', wb, T.fill, true);
wb = fillIn(plan()); P(wb).set('D6', '=D3+D4+D5'); t('D6 plus chain', 'ok', wb, T.d6);
wb = fillIn(plan()); P(wb).set('D6', '=SUM(D3:D5)'); t('~ D6 SUM range', 'ok', wb, T.d6);
wb = fillIn(plan()); P(wb).set('D6', '=sum(d3,d4,d5)'); t('~ D6 SUM list lower case', 'ok', wb, T.d6);
wb = fillIn(plan()); P(wb).set('D6', '=D3+D4'); t('✗ D6 misses a row', 'wrong', wb, T.d6);
wb = fillIn(plan()); P(wb).set('D6', '=30000+1500+4800'); t('✗ D6 typed the totals', 'no-follow', wb, T.d6);
wb = fillIn(plan()); P(wb).set('D11', '=SUM(D8:D10)'); t('D11 SUM', 'ok', wb, T.d11);
wb = fillIn(plan()); P(wb).set('D11', '=D8+D9'); t('✗ D11 forgets the fee', 'wrong', wb, T.d11);
const toTwelve = wb => { fillIn(wb); P(wb).set('D6', '=SUM(D3:D5)'); P(wb).set('D11', '=D8+D9+D10'); return wb; };
wb = toTwelve(plan()); P(wb).set('D12', '=D6-D11'); t('D12 profit', 'ok', wb, T.d12);
wb = toTwelve(plan()); P(wb).set('D12', '=D11-D6'); t('✗ D12 the wrong way round', 'wrong', wb, T.d12);
/* part 3 · D13 */
const toIf = wb => { toTwelve(wb); P(wb).set('D12', '=D6-D11'); return wb; };
wb = toIf(plan()); P(wb).set('D13', '=IF(D12>0,"Book her","Not yet")'); t('D13 IF right', 'ok', wb, T.d13);
wb = toIf(plan()); P(wb).set('D13', '=if(d12>=0,"book her","not yet")'); t('~ D13 IF lower case ≥', 'ok', wb, T.d13);
wb = toIf(plan()); P(wb).set('D13', '=IF(D12<0,"Not yet","Book her")'); t('~ D13 flipped test, flipped words', 'ok', wb, T.d13);
wb = toIf(plan()); P(wb).set('D13', '=IF(D12>0,"Not yet","Book her")'); t('✗ D13 branches swapped', 'wrong', wb, T.d13);
wb = toIf(plan()); P(wb).set('D13', '=IF(D12<0,"Not yet","Not yet")'); t('✗ D13 both the same', 'no-follow', wb, T.d13);
wb = toIf(plan()); P(wb).set('D13', 'Not yet'); t('✗ D13 typed the words', 'typed', wb, T.d13);
wb = toIf(plan()); P(wb).set('D13', '=IF(D10>17000,"Not yet","Book her")'); t('✗ D13 tests the fee not the profit', 'no-follow', wb, T.d13);
/* part 5 · Shop C3 and the pin */
wb = plan(); M(wb).set('C3', '=B3*(1+B1)'); t('Shop C3', 'ok', wb, T.c3);
wb = plan(); M(wb).set('C3', '=B3+B3*B1'); t('~ Shop C3 the long way', 'ok', wb, T.c3);
wb = plan(); M(wb).set('C3', '=B3*1.2'); t('✗ Shop C3 =B3*1.2', 'no-follow', wb, T.c3);
wb = plan(); M(wb).set('C3', '=B3*(1+$B$1)'); M(wb).fillDown('C3', 'C6'); t('pin fill', 'ok', wb, T.pin, true);
wb = plan(); M(wb).set('C3', '=B3*(1+B1)'); M(wb).fillDown('C3', 'C6'); t('✗ fill without the pin (the wobble)', 'fill-wobble', wb, T.pin, true);
wb = plan(); M(wb).set('C3', '=B3*(1+B$1)'); M(wb).fillDown('C3', 'C6'); t('~ B$1 fill also fine', 'ok', wb, T.pin, true);
wb = plan(); M(wb).set('C3', '=B3*(1+$B1)'); M(wb).fillDown('C3', 'C6'); t('✗ $B1 wobbles', 'fill-wobble', wb, T.pin, true);
wb = plan(); M(wb).set('C3', '=B3*1.2'); M(wb).fillDown('C3', 'C6'); t('✗ fill with 1.2 typed in', 'no-follow', wb, T.pin, true);
wb = plan(); M(wb).set('C3', '=B3+B3*$B$1'); M(wb).fillDown('C3', 'C6'); t('~ fill the long way', 'ok', wb, T.pin, true);
wb = plan(); ['C3', 'C4', 'C5'].forEach((c, i) => M(wb).set(c, '=B' + (3 + i) + '*(1+$B$1)')); M(wb).set('C6', '6'); t('✗ fill: last row typed', 'typed', wb, T.pin, true);
/* the call: each question's change gives the truth on D13 */
wb = toIf(plan()); P(wb).set('D13', '=IF(D12>0,"Book her","Not yet")');
T.call.forEach((q, i) => { Object.entries(q.set).forEach(([k, v]) => P(wb).set(k, v)); n++; const ok = /book/i.test(P(wb).value('D13')) === (q.truth === 'yes') && Math.abs(P(wb).value('D12') - q.profit) < 0.005; if (!ok) { fails++; console.log('FAIL call q' + (i + 1) + ' truth'); } });
n++; if (P(wb).value('B3') !== 1100 || P(wb).value('C3') !== 32) { fails++; console.log('FAIL the sheet ends on 1,100 at £32'); }
console.log('\nj2l6-judge: ' + (fails ? 'FAIL · ' + fails + ' of ' + n : 'PASS · ' + n + ' checks · ' + controls + ' controls refused · ' + leniencies + ' leniencies accepted'));
if (!process.env.J2L6_LENIENT && !fails) {
  const r = cp.spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { J2L6_LENIENT: '1', VERBOSE: '' }), encoding: 'utf8' });
  const caught = r.status !== 0;
  console.log((caught ? 'ok   ' : 'FAIL ') + 'self-control: a lenient judge (probes ignored) fails this gate' + (caught ? ' (' + (r.stdout.match(/FAIL · \d+/) || [''])[0] + ')' : ''));
  if (!caught) process.exit(1);
}
process.exit(fails ? 1 : 0);
