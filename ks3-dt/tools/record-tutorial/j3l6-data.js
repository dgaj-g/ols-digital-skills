#!/usr/bin/env node
/* j3l6-data — J3 L6 The Night Desk, gate G10: every count and average the strings state is recomputed from the SHIPPED data.js
   by the shipped Query engine, and must appear in the shipped strings.js where the spec puts it (J3_L6_SPEC.md §19 G10).
   V85: the counts Dee's examples keep are now shown by the table's own counter, not stated in the show lines, so those
   lines are checked to state NO number; the late shift (S.late) is checked here too: every headline's figures and
   claim, every target count, every fix, every race option and every count question, from the same data.
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
function quiet(what, where, allow) { n++; const text = where.split('.').reduce((o, k) => o && o[k], S); const ok = typeof text === 'string' && (text.match(/\d+/g) || []).every(d => (allow || []).indexOf(+d) >= 0); if (!ok) fails++; if (!ok || process.env.VERBOSE) console.log((ok ? 'ok   ' : 'FAIL ') + what + ' — the counter shows it, so ' + where + ' states no count · string says: ' + text); }
const sleep = run('sleep_hours >= 8', P, pc);
chk('long sleepers', sleep.length, 'c1.judge.ok');
chk('long sleepers average score', f1(avg(sleep, 'exam_score')), 'c1.compare1');
chk('other sleepers average score', f1(avg(not(P, sleep), 'exam_score')), 'c1.compare2');
const teens = run('age < 20', P, pc), teenPhone = run('age < 20 AND phone_hours >= 5', P, pc);
chk('teens on phones 5h+', teenPhone.length, 'c2.judge.ok');
chk('teens', teens.length, 'c2.judge.ok');
quiet('teens with a dog', 'c2.show2');
const week = run('day_no BETWEEN 40 AND 46', Dy, dc);
chk('regatta days', week.length, 'c3.judge.ok');
chk('regatta visitors a day', f0(avg(week, 'visitors')), 'c3.compare1');
chk('summer visitors a day', f0(avg(Dy, 'visitors')), 'c3.compare2');
chk('summer days', Dy.length, 'c3.compare2');
quiet('days at 20–22 °C', 'c3.show2', [20, 21, 22]);
chk('dog or cat', run('pet = "dog" OR pet = "cat"', P, pc).length, 'c4.judge.ok');
quiet('Marsh or Hill', 'c4.show2');
quiet('outside Old Town', 'c5.show2');
const rated = run('NOT area = "Old Town" AND bus_stars > 0', P, pc);
chk('rated the bus', rated.length, 'c5.judge.ok');
n++; if (!rated.every(r => r.bus_stars === 5)) { fails++; console.log('FAIL all four gave five stars'); }
chk('never rated', run('NOT area = "Old Town"', P, pc).length - rated.length, 'c5.compare2');
const hot = run('temp_c >= 24', Dy, dc), cold = run('temp_c < 18', Dy, dc);
chk('hot ice creams', f0(avg(hot, 'ice_creams_sold')), 'c6.judge1.ok');
chk('hot rescues', f1(avg(hot, 'sea_rescues')), 'c6.judge1.ok');
chk('cold ice creams', f0(avg(cold, 'ice_creams_sold')), 'c6.judge2.ok');
chk('cold rescues', f1(avg(cold, 'sea_rescues')), 'c6.judge2.ok');
chk('hot ice creams, compare', f0(avg(hot, 'ice_creams_sold')), 'c6.compare1');
chk('hot rescues, compare', f1(avg(hot, 'sea_rescues')), 'c6.compare1');
chk('cold ice creams, compare', f0(avg(cold, 'ice_creams_sold')), 'c6.compare2');
chk('cold rescues, compare', f1(avg(cold, 'sea_rescues')), 'c6.compare2');
/* the late shift: every figure, claim and target recomputed from the same data */
const L = S.late, T = t => D[t], tryRun = (src, t) => { try { return run(src, D[t], D.columns[t]); } catch (e) { return null; } };
const ids = rows => rows.map(r => r.id).sort((a, b) => a - b).join(',');
const fmt = v => v >= 100 ? Math.round(v).toLocaleString('en-GB') : (Number.isInteger(v) ? String(v) : v.toFixed(1));
function lk(ok, what) { n++; if (!ok) { fails++; console.log('FAIL late shift: ' + what); } else if (process.env.VERBOSE) console.log('ok   late shift: ' + what); }
function fill(s, it) { const k = run(it.rule, T(it.t), D.columns[it.t]), kept = new Set(k.map(r => r.id)), rest = T(it.t).filter(r => !kept.has(r.id));
  return s.replace(/\{(\w+)(?::(\w+))?(?::(\w+))?\}/g, (m, a, b, c) => a === 'n' ? k.length : a === 'rn' ? rest.length : a === 'N' ? T(it.t).length : a === 'a' ? fmt(avg(k, b)) : a === 'r' ? fmt(avg(rest, b))
    : a === 'c' ? tryRun(it.refs[b], it.t).length : a === 'x' ? fmt(avg(tryRun(it.refs[c], it.t), b)) : m); }
L.heads.items.forEach((it, i) => { const k = tryRun(it.rule, it.t); lk(k && k.length, 'headline ' + (i + 1) + ' rule runs and keeps rows'); if (!k) return;
  [...it.card, it.ok, it.ask, it.head].forEach(s => lk(!/[{}]/.test(fill(s, it)), 'headline ' + (i + 1) + ' fills every figure: ' + s));
  const c = it.claim, kept = new Set(k.map(r => r.id)), rest = T(it.t).filter(r => !kept.has(r.id));
  if (c.col && !c.others) { const a = avg(k, c.col), r = avg(rest, c.col); let holds = c.dir === 'more' ? a > r : a < r; if (c.big) holds = holds && a > r * 1.2;
    if (c.few) { lk(k.length <= 4, 'headline ' + (i + 1) + ' is from too few (' + k.length + ')'); lk(it.reason === 'few' || it.reason === 'cherry', 'headline ' + (i + 1) + ' reason fits too few'); }
    else lk(holds === !c.wrong, 'headline ' + (i + 1) + ' claim ' + (c.wrong ? 'is false' : 'holds') + ' (' + fmt(a) + ' v ' + fmt(r) + ')'); }
  if (c.others) { const a = avg(k, c.col), o = c.others.map(x => avg(tryRun(it.refs[x], it.t), c.col)), holds = c.dir === 'most' ? o.every(v => a > v) : o.every(v => a < v); lk(holds === !c.wrong, 'headline ' + (i + 1) + ' month claim'); }
  if (c.all) lk(k.length < tryRun(it.refs[c.all], it.t).length, 'headline ' + (i + 1) + ' used only part of the rows');
  if (c.cause) lk(tryRun(c.cause, it.t).length === 0, 'headline ' + (i + 1) + ' cause check');
  lk((it.stamp === 'PRINT') === (it.reason === 'backed'), 'headline ' + (i + 1) + ' stamp matches reason'); });
const NEED = s => s.replace(/"[^"]*"/g, '').replace(/BETWEEN\s+\S+\s+AND/gi, 'BETWEEN');
L.hit.items.forEach((it, i) => { const k = tryRun(it.rule, it.t); lk(k && k.length === it.n, 'hit ' + (i + 1) + ' model rule keeps ' + it.n + ' (keeps ' + (k && k.length) + ')');
  if (it.need) lk(new RegExp('\\b' + it.need + '\\b').test(NEED(it.rule)), 'hit ' + (i + 1) + ' model rule uses ' + it.need); });
L.fix.items.forEach((it, i) => { const f = tryRun(it.fix, it.t), b = tryRun(it.broken, it.t); lk(!!f, 'fix ' + (i + 1) + ' mended rule runs'); lk(!f || !b || ids(f) !== ids(b), 'fix ' + (i + 1) + ' broken rule keeps different rows'); });
L.race.items.forEach((lv, l) => lv.forEach((it, i) => { const r = tryRun(it.right, it.t); lk(!!r, 'race ' + (l + 1) + '.' + (i + 1) + ' right rule runs');
  it.wrong.forEach(x => { const w = tryRun(x, it.t); lk(!r || !w || ids(w) !== ids(r), 'race ' + (l + 1) + '.' + (i + 1) + ' wrong option differs: ' + x); }); }));
L.count.items.forEach((it, i) => { const k = tryRun(it.rule, it.t); lk(k && k.length === it.opts[0], 'count ' + (i + 1) + ' answer ' + it.opts[0] + ' (keeps ' + (k && k.length) + ')'); lk(new Set(it.opts).size === 3, 'count ' + (i + 1) + ' three different options'); });
console.log('\nj3l6-data: ' + (fails ? 'FAIL · ' + fails + ' of ' + n : 'PASS · ' + n + ' figures recomputed from data.js'));
if (!process.env.J3L6_PLANT && !fails) {
  const r = cp.spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { J3L6_PLANT: '1', VERBOSE: '' }), encoding: 'utf8' });
  const caught = r.status !== 0;
  console.log((caught ? 'ok   ' : 'FAIL ') + 'self-control: one teen given a dog fails this gate' + (caught ? ' (' + (r.stdout.match(/FAIL · \d+ of \d+/) || [''])[0] + ')' : ''));
  if (!caught) process.exit(1);
}
process.exit(fails ? 1 : 0);
