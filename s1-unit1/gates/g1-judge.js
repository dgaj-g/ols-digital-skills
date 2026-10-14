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
// ---- every "Any N of these" scheme line names the question's own n (live sit, 14 Oct 2026: a four-pick part read "Any three")
const vm = require('vm'), NW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
const loadJudge = (src) => { const ctx = { module: { exports: {} } }; vm.runInNewContext(src, ctx); return ctx.module.exports; };
const BANKS = [['bank_digital_data.js', 'BANK_DIGITAL_DATA'], ['bank_software.js', 'BANK_SOFTWARE']].map(([f, v]) => vm.runInNewContext(fs.readFileSync(path.join(DESIGN, 'content', f), 'utf8') + '\n;' + v, {}));
function anyAudit(J) {
  const f = []; let seen = 0;
  BANKS.forEach((B) => B.stages.forEach((st) => st.questions.forEach((q) => (J.scheme(q).lines || []).forEach((l) => {
    const m = /^Any (\w+) of these/.exec(l.text); if (!m) return; seen++;
    if (NW.indexOf(m[1]) !== l.marks) f.push(q.id + ': "Any ' + m[1] + '" on a ' + l.marks + '-mark line');
  }))));
  return { f, seen };
}
const AA = anyAudit(loadJudge(judgeSrc));
check('every "Any N of these" scheme line names its own count (' + AA.seen + ' lines)', AA.seen > 0 && AA.f.length === 0, AA.f.join(' | '));
const oldWord = judgeSrc.replace('["zero", "one", "two", "three", "four", "five", "six"][n]', '(n === 1 ? "one" : n === 2 ? "two" : "three")');
check('CONTROL the old one/two/three wording is caught on the four-pick part', oldWord !== judgeSrc && anyAudit(loadJudge(oldWord)).f.some((x) => /^SW4-N1: "Any three" on a 4-mark line/.test(x)));
function headAudit(J) { // a one-part question's label is the pick instruction, never a mark-scheme line (live look, 14 Oct 2026)
  const f = []; let multi = 0;
  BANKS.forEach((B) => B.stages.forEach((st) => st.questions.forEach((q) => { if (q.form !== "writepick") return;
    const heads = (J.scheme(q).lines || []).filter((l) => l.head).length;
    if (q.parts.length === 1 && heads) f.push(q.id + ": one-part question shows its instruction in the scheme");
    if (q.parts.length > 1) { multi++; if (heads !== q.parts.filter((p) => p.label).length) f.push(q.id + ": part headings missing"); }
  })));
  return { f, multi };
}
const HA = headAudit(loadJudge(judgeSrc));
check('the mark scheme never repeats a pick instruction; multi-part headings kept (' + HA.multi + ' multi-part questions)', HA.multi > 0 && HA.f.length === 0, HA.f.join(' | '));
const oldHead = judgeSrc.replace('if (p.label && q.parts.length > 1)', 'if (p.label)');
check('CONTROL the old judge that listed every label is caught on SW4-N2', oldHead !== judgeSrc && headAudit(loadJudge(oldHead)).f.some((x) => /^SW4-N2: one-part/.test(x)));
const txt = 'G1 judge controls · ' + new Date().toISOString() + '\n' + log.join('\n') + '\n' + (res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail\n';
fs.writeFileSync(path.join(OUT, 'g1-judge.txt'), txt); process.stdout.write(txt); process.exit(res.fail ? 1 : 0);
