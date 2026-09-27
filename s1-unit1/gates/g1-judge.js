#!/usr/bin/env node
/* G1 — the judge controls (SPEC §7). Runs the design's judge/controls.js against the judge and bank the server carries
 * (12,000+ checks: his 2024 marking, written-paper standard, chance, complete(), draw, scheme) and wants GREEN.
 * CONTROLS (must fail): the same controls.js run against two broken judges — one that gives every answer full marks and
 * one that gives every answer none — must come back RED.
 * Run: node s1-unit1/gates/g1-judge.js  (exit 0 = GREEN). Output: gates/out/g1-judge.txt */
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }
function run(dir) { const r = spawnSync('node', [path.join(dir, 'judge', 'controls.js')], { encoding: 'utf8', maxBuffer: 1 << 26 }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; }
const real = run(DESIGN);
const tail = real.out.trim().split('\n');
check('controls.js GREEN on the real judge', real.code === 0 && tail[tail.length - 1] === 'GREEN', tail.slice(-6).join(' | '));
tail.slice(0, 3).forEach((l) => log.push('INFO ' + l.slice(0, 200)));
const judgeSrc = fs.readFileSync(path.join(DESIGN, 'judge', 'judge.js'), 'utf8');
const gs = fs.existsSync(path.join(DESIGN, 'deploy', 'Code.gs')) ? fs.readFileSync(path.join(DESIGN, 'deploy', 'Code.gs'), 'utf8') : '';
const asciiJs = (s) => s.replace(/[\u0080-\uffff]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4)); // as tools/build-server.js
check('the built Code.gs carries judge.js and the bank unchanged', gs.indexOf(asciiJs(judgeSrc.trim())) !== -1 && gs.indexOf(asciiJs(fs.readFileSync(path.join(DESIGN, 'content', 'bank_digital_data.js'), 'utf8').trim())) !== -1, 'rebuild: node s1-unit1/tools/build-server.js');
if (judgeSrc.indexOf('function judge(q, answer, drawn) {') === -1) check('mutation point found', false, 'judge() signature changed');
[['every answer full marks', 'r.marks = r.max;'], ['every answer no marks', 'r.marks = 0;']].forEach(([name, body]) => {
  const dir = path.join(DESIGN, 'gates', 'g1-mutant');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'judge'), { recursive: true }); fs.mkdirSync(path.join(dir, 'content'), { recursive: true });
  fs.copyFileSync(path.join(DESIGN, 'judge', 'controls.js'), path.join(dir, 'judge', 'controls.js'));
  fs.copyFileSync(path.join(DESIGN, 'content', 'bank_digital_data.js'), path.join(dir, 'content', 'bank_digital_data.js'));
  fs.writeFileSync(path.join(dir, 'judge', 'judge.js'), judgeSrc.replace('function judge(q, answer, drawn) {',
    'function judge(q, answer, drawn) { var r = judge0(q, answer, drawn); ' + body + ' return r; }\n  function judge0(q, answer, drawn) {'));
  const m = run(dir), last = m.out.trim().split('\n').pop();
  check('CONTROL ' + name + ': controls.js goes RED', m.code !== 0 && last !== 'GREEN', 'exit ' + m.code + ' · ' + last);
  fs.rmSync(dir, { recursive: true, force: true });
});
const txt = 'G1 judge controls · ' + new Date().toISOString() + '\n' + log.join('\n') + '\n' + (res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail\n';
fs.writeFileSync(path.join(OUT, 'g1-judge.txt'), txt); process.stdout.write(txt); process.exit(res.fail ? 1 : 0);
