#!/usr/bin/env node
/* j3l6-engine-test — J3 L6 The Night Desk, gate G2: the query engine (J3_L6_SPEC.md §6.4, §19 G2). Runs on the SHIPPED query.js.
   Grammar (OR over AND over NOT over atom), signs, values, case, the five error codes, and every rule the spec names keeping
   the row count the spec states. Self-control: a copy of query.js whose text compare minds case MUST fail this gate.
   Usage: node j3l6-engine-test.js */
'use strict';
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const HOUR = process.env.J3L6_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/nightdesk/hour');
global.window = global;
require(path.join(HOUR, 'data.js')); require(process.env.J3L6_QUERY || path.join(HOUR, 'query.js'));
const D = global.NightData, Q = global.Query, P = D.people, Dy = D.days, pc = D.columns.people, dc = D.columns.days;
let n = 0, fails = 0;
function must(ok, what) { n++; if (!ok) fails++; if (!ok || process.env.VERBOSE) console.log((ok ? 'ok   ' : 'FAIL ') + what); }
const cnt = (src, days) => { try { return Q.run(src, days ? Dy : P, days ? dc : pc).length; } catch (e) { return 'err:' + e.code; } };
const code = (src, days) => { try { Q.run(src, days ? Dy : P, days ? dc : pc); return 'ran'; } catch (e) { return e.code + (e.why ? '/' + e.why : ''); } };
const keeps = (src, want, days) => { const g = cnt(src, days); must(g === want, src + ' keeps ' + want + ' (got ' + g + ')'); };
/* the table itself (spec §6.4) */
must(P.length === 60 && Dy.length === 92, 'People 60 rows, Days 92 rows');
[['Old Town', 16], ['Hill', 15], ['Marsh', 15], ['Harbour', 14]].forEach(([a, k]) => keeps('area = "' + a + '"', k));
[['none', 25], ['cat', 22], ['dog', 9], ['fish', 4]].forEach(([a, k]) => keeps('pet = "' + a + '"', k));
/* every rule the spec names (§7–§14) */
keeps('age < 20', 18); keeps('sleep_hours >= 8', 17); keeps('sleep_hours > 8', cnt('sleep_hours > 8'));
must(cnt('sleep_hours > 8') !== 17, 'sleep_hours > 8 is not the 17 (the c1 fail differs)');
keeps('age < 20 AND pet = "dog"', 3); keeps('age < 20 AND phone_hours >= 5', 6);
must(cnt('age < 20 OR phone_hours >= 5') > 6, 'OR keeps more than AND');
keeps('temp_c BETWEEN 20 AND 22', 16, 1); keeps('day_no BETWEEN 40 AND 46', 7, 1); keeps('day_no >= 40 AND day_no <= 46', 7, 1);
keeps('day_no BETWEEN 40 AND 45', 6, 1);
keeps('area = "Marsh" OR area = "Hill"', 30); keeps('pet = "dog" OR pet = "cat"', 31); keeps('pet = "dog" AND pet = "cat"', 0);
keeps('NOT area = "Old Town"', 44); keeps('NOT area = "Old Town" AND bus_stars > 0', 4);
keeps('temp_c >= 24', 27, 1); keeps('temp_c < 18', 28, 1); keeps('area = "Harbour"', 14);
must(cnt('rain_mm > 5', 1) > 0 && cnt('rain_mm = 0', 1) > 0, 'free headline 2 rules keep rows');
/* precedence: NOT over AND over OR */
must(cnt('area = "Hill" OR area = "Marsh" AND pet = "dog"') === cnt('area = "Hill" OR (area = "Marsh" AND pet = "dog")'), 'AND binds tighter than OR');
must(cnt('NOT area = "Hill" AND pet = "dog"') === cnt('(NOT area = "Hill") AND pet = "dog"'), 'NOT binds tighter than AND');
must(cnt('NOT NOT area = "Hill"') === 15, 'NOT NOT cancels');
/* signs and values */
must(cnt('area <> "Hill"') === 45 && cnt('area != "Hill"') === 45, '<> and != both mean not equal');
must(cnt('pet = DOG') === 9 && cnt("pet = 'dog'") === 9 && cnt('pet = “Dog”') === 9, 'bare word, single quotes, curly quotes, any case');
must(cnt('PET = "dog"') === 9 && cnt('pet="dog"') === 9, 'column in any case, no spaces round the sign');
must(cnt('age < "20"') === 18, 'a number in quotes still compares');
must(cnt('(age < 20)') === 18, 'a rule in parentheses');
must(cnt('area = "harbour" and pet = "none" or age < 0') === cnt('area = "Harbour" AND pet = "none"'), 'lower-case keywords');
/* the five error codes */
must(code('   ') === 'empty', 'empty box → empty');
must(code('sleep >= 8') === 'column', 'unknown column → column');
must(code('sleep_hours >=') === 'dangling' && code('age < 20 AND') === 'dangling', 'a rule that stops early → dangling');
must(code('sleep_hours 8') === 'syntax/op', 'a missing sign → syntax');
must(code('8 <= sleep_hours') === 'syntax/column', 'a number first → syntax');
must(code('age < =') === 'syntax/value', 'a sign where the value goes → syntax/value (errValue on screen)');
must(code('day_no BETWEEN 40 46', 1) === 'syntax/between', 'BETWEEN without AND → syntax');
must(code('(age < 20') === 'syntax/bracket', 'an open bracket → syntax');
must(code('pet = "dog') === 'syntax/quote', 'an open quote → syntax');
must(code('age < 20 age') === 'syntax/extra', 'words left over → syntax');
must(code('age # 20') === 'syntax/char', 'an odd character → syntax');
console.log('\nj3l6-engine: ' + (fails ? 'FAIL · ' + fails + ' of ' + n : 'PASS · ' + n + ' checks'));
if (!process.env.J3L6_QUERY && !fails) {
  const src = fs.readFileSync(path.join(HOUR, 'query.js'), 'utf8'), tmp = path.join(os.tmpdir(), 'j3l6-query-control.js');
  const bad = src.replace('var a = String(cell).toLowerCase(), b = String(v.str).toLowerCase();', 'var a = String(cell), b = String(v.str);');
  fs.writeFileSync(tmp, bad);
  const r = cp.spawnSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { J3L6_QUERY: tmp }), encoding: 'utf8' });
  fs.unlinkSync(tmp);
  const caught = bad !== src && r.status !== 0;
  console.log((caught ? 'ok   ' : 'FAIL ') + 'self-control: an engine that minds case fails this gate');
  if (!caught) process.exit(1);
}
process.exit(fails ? 1 : 0);
