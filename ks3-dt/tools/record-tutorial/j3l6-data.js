#!/usr/bin/env node
/* j3l6-data — J3 L6 The Night Desk, gate G10: every count and average the strings state is recomputed from the SHIPPED data.js
   by the shipped Query engine, and must appear in the shipped strings.js where the spec puts it (J3_L6_SPEC.md §19 G10).
   Self-control: the gate re-runs itself with one row's pet changed (J3L6_PLANT) and that run MUST fail.
   Usage: node j3l6-data.js */
'use strict';
const path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const HOUR = process.env.J3L6_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/nightdesk/hour');
global.window = global;
require(path.join(HOUR, 'data.js')); require(path.join(HOUR, 'query.js')); require(path.join(HOUR, 'strings.js'));
const D = global.NightData, Q = global.Query, S = global.NightStrings || global.S || global.Strings;
if (!S) { console.log('FAIL strings.js exposes no string table'); process.exit(1); }
if (process.env.J3L6_PLANT) { const r = D.people.find(p => p.age < 20 && p.pet === 'none'); r.pet = 'dog'; }
const P = D.people, Dy = D.days, pc = D.columns.people, dc = D.columns.days;
const run = (src, t, c) => Q.run(src, t, c);
const avg = (rows, k) => rows.reduce((a, r) => a + r[k], 0) / rows.length;
const f1 = v => v.toFixed(1), f0 = v => Math.round(v).toLocaleString('en-GB');
const not = (all, kept) => all.filter(r => kept.indexOf(r) < 0);
let n = 0, fails = 0;
function chk(what, value, where) { n++; const text = where.split('.').reduce((o, k) => o && o[k], S); const ok = typeof text === 'string' && text.indexOf(String(value)) >= 0; if (!ok) fails++; if (!ok || process.env.VERBOSE) console.log((ok ? 'ok   ' : 'FAIL ') + what + ' = ' + value + ' in ' + where + (ok ? '' : '  · string says: ' + text)); }
const sleep = run('sleep_hours >= 8', P, pc);
chk('long sleepers', sleep.length, 'c1.judge.ok');
chk('long sleepers average score', f1(avg(sleep, 'exam_score')), 'c1.compare1');
chk('other sleepers average score', f1(avg(not(P, sleep), 'exam_score')), 'c1.compare2');
const teens = run('age < 20', P, pc), teenPhone = run('age < 20 AND phone_hours >= 5', P, pc);
chk('teens on phones 5h+', teenPhone.length, 'c2.judge.ok');
chk('teens', teens.length, 'c2.judge.ok');
chk('teens with a dog', run('age < 20 AND pet = "dog"', P, pc).length, 'c2.show2');
const week = run('day_no BETWEEN 40 AND 46', Dy, dc);
chk('regatta days', week.length, 'c3.judge.ok');
chk('regatta visitors a day', f0(avg(week, 'visitors')), 'c3.compare1');
chk('summer visitors a day', f0(avg(Dy, 'visitors')), 'c3.compare2');
chk('summer days', Dy.length, 'c3.compare2');
chk('days at 20–22 °C', run('temp_c BETWEEN 20 AND 22', Dy, dc).length, 'c3.show2');
chk('dog or cat', run('pet = "dog" OR pet = "cat"', P, pc).length, 'c4.judge.ok');
chk('Marsh or Hill', run('area = "Marsh" OR area = "Hill"', P, pc).length, 'c4.show2');
chk('outside Old Town', run('NOT area = "Old Town"', P, pc).length, 'c5.show2');
const rated = run('NOT area = "Old Town" AND bus_stars > 0', P, pc);
chk('rated the bus', rated.length, 'c5.judge.ok');
n++; if (!rated.every(r => r.bus_stars === 5)) { fails++; console.log('FAIL all four gave five stars'); }
chk('never rated', run('NOT area = "Old Town"', P, pc).length - rated.length, 'c5.compare2');
const hot = run('temp_c >= 24', Dy, dc), cold = run('temp_c < 18', Dy, dc);
chk('hot days', hot.length, 'c6.judge1.ok');
chk('hot ice creams', f0(avg(hot, 'ice_creams_sold')), 'c6.judge1.ok');
chk('hot rescues', f1(avg(hot, 'sea_rescues')), 'c6.judge1.ok');
chk('cold days', cold.length, 'c6.judge2.ok');
chk('cold ice creams', f0(avg(cold, 'ice_creams_sold')), 'c6.judge2.ok');
chk('cold rescues', f1(avg(cold, 'sea_rescues')), 'c6.judge2.ok');
chk('hot ice creams, compare', f0(avg(hot, 'ice_creams_sold')), 'c6.compare1');
chk('hot rescues, compare', f1(avg(hot, 'sea_rescues')), 'c6.compare1');
chk('cold ice creams, compare', f0(avg(cold, 'ice_creams_sold')), 'c6.compare2');
chk('cold rescues, compare', f1(avg(cold, 'sea_rescues')), 'c6.compare2');
const harb = run('area = "Harbour"', P, pc);
n++; if (harb.length !== 14) { fails++; console.log('FAIL Harbour people = ' + harb.length + ', wanted 14'); }
chk('Harbour café average', f1(avg(harb, 'cafe_visits')), 'close.free.0.reveal');
chk('others café average', f1(avg(not(P, harb), 'cafe_visits')), 'close.free.0.reveal');
chk('wet-day visitors', f0(avg(run('rain_mm > 5', Dy, dc), 'visitors')), 'close.free.1.reveal');
chk('dry-day visitors', f0(avg(run('rain_mm = 0', Dy, dc), 'visitors')), 'close.free.1.reveal');
console.log('\nj3l6-data: ' + (fails ? 'FAIL · ' + fails + ' of ' + n : 'PASS · ' + n + ' figures recomputed from data.js'));
if (!process.env.J3L6_PLANT && !fails) {
  const r = cp.spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { J3L6_PLANT: '1', VERBOSE: '' }), encoding: 'utf8' });
  const caught = r.status !== 0;
  console.log((caught ? 'ok   ' : 'FAIL ') + 'self-control: one teen given a dog fails this gate' + (caught ? ' (' + (r.stdout.match(/FAIL · \d+ of \d+/) || [''])[0] + ')' : ''));
  if (!caught) process.exit(1);
}
process.exit(fails ? 1 : 0);
