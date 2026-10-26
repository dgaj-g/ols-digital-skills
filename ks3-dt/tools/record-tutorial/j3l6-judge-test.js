#!/usr/bin/env node
/* j3l6-judge-test — J3 L6 The Night Desk, gate G1: the judge marks a rule by WHICH ROWS IT KEEPS and a stamp by stamp + reason
   (J3_L6_SPEC.md §19 G1). Runs on the SHIPPED files in ks3-dt/platform/assets/nightdesk/hour/ (data.js, query.js, judge.js).
   Ported whole from the prototype's judge.test.js (36 cases) + the spec's named leniencies (case, !=, parentheses).
   Every case marked ✗ is a CONTROL: a wrong answer the judge must refuse, with its own code. ~ marks a leniency that must pass.
   Self-control: the gate re-runs itself with a lenient judge (extra rows forgiven) and that run MUST fail.
   Usage: node j3l6-judge-test.js */
'use strict';
const path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const HOUR = process.env.J3L6_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/nightdesk/hour');
global.window = global;
require(path.join(HOUR, 'data.js')); require(path.join(HOUR, 'query.js')); require(path.join(HOUR, 'judge.js'));
const D = global.NightData, Q = global.Query;
let J = global.NightJudge;
if (process.env.J3L6_LENIENT) {   /* the control judge: a rule that keeps too many rows is forgiven */
  const real = J; J = { checkStamp: real.checkStamp, checkQuery: (src, t, c, exp) => { const r = real.checkQuery(src, t, c, exp); return r.code === 'wrong' && !(r.missing || []).length ? { code: 'ok', got: r.got } : r; } };
}
const people = D.people, days = D.days, pc = D.columns.people, dc = D.columns.days;
const ids = (src, t, c) => Q.run(src, t, c).map(r => r.id);
const T = { c1: ids('sleep_hours >= 8', people, pc), c2: ids('age < 20 AND phone_hours >= 5', people, pc), c3: ids('day_no BETWEEN 40 AND 46', days, dc),
  c4: ids('pet = "dog" OR pet = "cat"', people, pc), c5: ids('NOT area = "Old Town" AND bus_stars > 0', people, pc), c6a: ids('temp_c >= 24', days, dc), c6b: ids('temp_c < 18', days, dc) };
let n = 0, fails = 0, controls = 0, leniencies = 0;
function tally(name, ok, got, want) { n++; if (name.startsWith('✗')) controls++; else if (name.startsWith('~')) leniencies++; if (!ok) fails++; if (!ok || process.env.VERBOSE) console.log((ok ? 'ok   ' : 'FAIL ') + name + ' → ' + got + (ok ? '' : '  wanted ' + want)); }
const q = (name, want, src, t, c, exp) => { const r = J.checkQuery(src, t, c, exp); tally(name, r.code === want, r.code, want); };
const s = (name, want, stamp, exp) => { const r = J.checkStamp(stamp, exp); tally(name, r.code === want, r.code, want); };
const H1 = { stamp: 'SPIKE', reasons: ['numbers'] };
q('c1 right', 'ok', 'sleep_hours >= 8', people, pc, T.c1);
q('~ c1 upper case column, extra spaces', 'ok', '  SLEEP_HOURS   >=8 ', people, pc, T.c1);
q('✗ c1 reversed (a column comes first)', 'syntax', '8 <= sleep_hours', people, pc, T.c1);
q('✗ c1 > instead of >=', 'wrong', 'sleep_hours > 8', people, pc, T.c1);
q('✗ c1 empty', 'empty', '   ', people, pc, T.c1);
q('✗ c1 no value', 'dangling', 'sleep_hours >=', people, pc, T.c1);
q('✗ c1 made-up column', 'column', 'sleep >= 8', people, pc, T.c1);
q('✗ c1 word with no sign', 'syntax', 'sleep_hours 8', people, pc, T.c1);
q('c2 right', 'ok', 'age < 20 AND phone_hours >= 5', people, pc, T.c2);
q('c2 swapped order', 'ok', 'phone_hours >= 5 AND age < 20', people, pc, T.c2);
q('✗ c2 OR for AND (too many)', 'wrong', 'age < 20 OR phone_hours >= 5', people, pc, T.c2);
q('✗ c2 one rule only', 'wrong', 'age < 20', people, pc, T.c2);
q('~ c2 quotes round a number', 'ok', 'age < "20" AND phone_hours >= 5', people, pc, T.c2);
q('~ c2 lower-case and', 'ok', 'age < 20 and phone_hours >= 5', people, pc, T.c2);
q('c3 right', 'ok', 'day_no BETWEEN 40 AND 46', days, dc, T.c3);
q('c3 long way', 'ok', 'day_no >= 40 AND day_no <= 46', days, dc, T.c3);
q('~ c3 Between in mixed case', 'ok', 'day_no Between 40 and 46', days, dc, T.c3);
q('~ c3 by a different route', 'ok', 'day_no >= 40 AND NOT day_no > 46', days, dc, T.c3);
q('✗ c3 off by one', 'wrong', 'day_no BETWEEN 40 AND 45', days, dc, T.c3);
q('✗ c3 BETWEEN without AND', 'syntax', 'day_no BETWEEN 40 46', days, dc, T.c3);
q('c4 right', 'ok', 'pet = "dog" OR pet = "cat"', people, pc, T.c4);
q('~ c4 curly quotes', 'ok', 'pet = “dog” OR pet = “cat”', people, pc, T.c4);
q('~ c4 an unquoted word is read as text', 'ok', 'pet = dog OR pet = cat', people, pc, T.c4);
q('~ c4 upper-case DOG', 'ok', 'pet = "DOG" OR pet = "Cat"', people, pc, T.c4);
q('✗ c4 AND for OR (nobody has both)', 'wrong', 'pet = "dog" AND pet = "cat"', people, pc, T.c4);
q('c5 right', 'ok', 'NOT area = "Old Town" AND bus_stars > 0', people, pc, T.c5);
q('~ c5 with brackets', 'ok', 'NOT (area = "Old Town") AND bus_stars > 0', people, pc, T.c5);
q('~ c5 != for NOT', 'ok', 'area != "Old Town" AND bus_stars > 0', people, pc, T.c5);
q('~ c5 <> and the whole rule in parentheses', 'ok', '(area <> "Old Town" AND bus_stars > 0)', people, pc, T.c5);
q('✗ c5 NOT dropped', 'wrong', 'area = "Old Town" AND bus_stars > 0', people, pc, T.c5);
q('c6a right', 'ok', 'temp_c >= 24', days, dc, T.c6a);
q('✗ c6a > for >=', 'wrong', 'temp_c > 24', days, dc, T.c6a);
q('c6b right', 'ok', 'temp_c < 18', days, dc, T.c6b);
q('✗ c6b <= for <', 'wrong', 'temp_c <= 18', days, dc, T.c6b);
q('✗ a value that is a sign (engine: syntax, why value → errValue on screen)', 'syntax', 'temp_c < =', days, dc, T.c6b);
s('c1 SPIKE numbers', 'ok', { stamp: 'SPIKE', reason: 'numbers' }, H1);
s('✗ c1 PRINT', 'stamp', { stamp: 'PRINT', reason: 'backed' }, H1);
s('✗ c1 SPIKE wrong reason', 'reason', { stamp: 'SPIKE', reason: 'few' }, H1);
s('✗ nothing picked', 'missing', { stamp: null }, H1);
s('✗ stamp with no reason', 'missing', { stamp: 'SPIKE' }, H1);
s('c4 PRINT backed', 'ok', { stamp: 'PRINT', reason: 'backed' }, { stamp: 'PRINT', reasons: ['backed'] });
s('c6 SPIKE cause (either accepted reason)', 'ok', { stamp: 'SPIKE', reason: 'cause' }, { stamp: 'SPIKE', reasons: ['cause', 'numbers'] });
n++; const sizes = Object.keys(T).map(k => k + '=' + T[k].length).join(' ');
if (T.c1.length !== 17 || T.c2.length !== 6) { fails++; console.log('FAIL headline sizes ' + sizes); }
console.log('\nj3l6-judge: ' + (fails ? 'FAIL · ' + fails + ' of ' + n : 'PASS · ' + n + ' checks · ' + controls + ' controls refused · ' + leniencies + ' leniencies accepted') + ' · ' + sizes);
if (!process.env.J3L6_LENIENT && !fails) {
  const r = cp.spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { J3L6_LENIENT: '1', VERBOSE: '' }), encoding: 'utf8' });
  const caught = r.status !== 0;
  console.log((caught ? 'ok   ' : 'FAIL ') + 'self-control: a lenient judge (extra rows forgiven) fails this gate' + (caught ? ' (' + (r.stdout.match(/FAIL · \d+/) || [''])[0] + ')' : ''));
  if (!caught) process.exit(1);
}
process.exit(fails ? 1 : 0);
