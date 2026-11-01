/* J2 L5 THE SEARCH · gate 4 + gate 5, real Python (spec §15.4–5).
   Every drone program of 1 to 3 pushed-in lines that the SHIPPED judge accepts (J.parsePlan) is run through
   real python3 with forward/left/right/say/look defined to print what they were given. Python's trace must
   be the judge's J.expand, step for step: so the drone the hour drives from J.expand is the drone Python
   would drive. A program the judge accepts that Python rejects is a failure.
   Controls (must FAIL): a judge that also accepts a for line with no colon; an expand that runs one short.
   usage: node ks3-dt/tools/record-tutorial/j2l5-python.js */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const HOUR = process.env.J2L5_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/search/hour');
let fails = 0, passes = 0;
function must(ok, what) { if (ok) passes++; else { fails++; console.log('FAIL ' + what); } }
const JF = path.join(HOUR, 'judge.js');
if (!fs.existsSync(JF)) { must(false, 'the shipped judge ' + JF + ' exists'); finish(); }
const J = require(JF);

/* the programs: every count the hour uses, every body of 1–3 lines from the hour's verbs, and spacing variants */
const COUNTS = [3, 4, 5, 6, 9, 10, 20];
const VERBS = ['forward(40)', 'forward(100)', 'forward(i * 10)', 'forward(10 * i)', 'forward(i)', 'forward(10)', 'left(90)', 'left(80)', 'left(60)', 'left(120)', 'right(144)', 'right(90)', 'say(i)', 'look()'];
const FOR = ['for i in range({n}):', 'for i in range({n}) :', 'for i in range( {n} ):', 'for i in range({n}):  '];
const progs = [];
COUNTS.forEach(n => FOR.forEach((f, fi) => {
  const head = f.replace('{n}', n);
  VERBS.forEach(a => { progs.push([head, '    ' + a]); if (fi) return;
    VERBS.forEach(b => { progs.push([head, '    ' + a, '    ' + b]);
      if (n === 10 || n === 6) VERBS.forEach(c => progs.push([head, '    ' + a, '    ' + b, '    ' + c])); }); });
}));

function plans(list, parse) { return list.map(lines => ({ lines, plan: parse(lines) })).filter(x => x.plan && !x.plan.err); }
function trace(plan, expand) { return expand(plan, 400).map(a => a.op + ' ' + (a.op === 'look' ? 0 : a.v)); }
/* one python3 for all of them: each program runs in its own namespace, its trace or its error printed between markers */
function python(list) {
  const pre = 'def forward(n): print("forward", n)\ndef left(n): print("left", n)\ndef right(n): print("right", n)\ndef say(n): print("say", n)\ndef look(): print("look", 0)\n';
  const py = ['import sys', 'P = ' + JSON.stringify(list.map(x => x.lines.join('\n'))), 'PRE = ' + JSON.stringify(pre),
    'for k, src in enumerate(P):', '    print("@@", k)', '    try:', '        exec(compile(PRE + src + "\\n", "<her program>", "exec"), {})', '    except Exception as e:', '        print("!!", type(e).__name__)'].join('\n');
  const out = cp.execFileSync('python3', ['-c', py], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const res = []; let cur = null;
  out.split('\n').forEach(l => { const m = /^@@ (\d+)$/.exec(l); if (m) { cur = res[+m[1]] = []; } else if (cur && l) cur.push(l); });
  return res;
}
function compare(list, expand) {
  const py = python(list), bad = [];
  list.forEach((x, k) => { const want = trace(x.plan, expand), got = py[k] || [];
    if (got.some(l => /^!! /.test(l))) bad.push('Python rejects a program the judge accepts: ' + JSON.stringify(x.lines) + ' (' + got.find(l => /^!! /.test(l)) + ')');
    else if (want.join('|') !== got.join('|')) bad.push('Python and the judge fly different paths: ' + JSON.stringify(x.lines)); });
  return bad;
}

const ok = plans(progs, J.parsePlan);
must(ok.length >= 300, 'the judge accepts the hour\'s programs (' + ok.length + ' of ' + progs.length + ' generated)');
const fieldsOk = ['for i in range(4):', '    forward(40)', '    left(90)'];
must(ok.some(x => x.lines.join('\n') === fieldsOk.join('\n')), 'the square field program is among them');
const real = compare(ok, J.expand); real.slice(0, 8).forEach(x => console.log('  ' + x));
must(real.length === 0, 'every accepted program flies the same path in python3 (' + ok.length + ' programs, ' + real.length + ' differ)');

/* single lines the bench accepts (chapter 1, before any loop) */
const single = ['forward(10)', 'forward(10)  ', 'look()'].filter(l => { const r = J.line1(l, { atPrint: l.indexOf('look') === 0 ? 3 : 0, lit: false }); return r && r.ok; });
must(single.length === 3, 'the bench accepts forward(10) and look()');
const s1 = python(single.map(l => ({ lines: [l] })));
must(s1.every(t => t && !t.some(l => /^!! /.test(l))), 'python3 runs every line the bench accepts');

/* CONTROLS */
const loose = lines => { const p = J.parsePlan(lines); if (p && !p.err) return p; if (/^for i in range\((\d+)\)$/.test((lines[0] || '').trim())) { const q = J.parsePlan([lines[0] + ':'].concat(lines.slice(1))); return q; } return p; };
const c1 = plans([['for i in range(20)', '    forward(40)', '    look()']], loose);
must(c1.length === 1 && compare(c1, J.expand).length === 1, 'CONTROL a judge that accepts a for line with no colon is caught');
const short = (plan, cap) => J.expand(Object.assign({}, plan, { n: plan.n - 1 }), cap);
must(compare(ok.slice(0, 5), short).length === 5, 'CONTROL an expand that runs one short is caught');
finish();
function finish() { console.log('\nj2l5-python: ' + (fails ? 'FAIL · ' + fails + ' of ' + (fails + passes) : 'PASS · ' + passes + ' checks')); process.exit(fails ? 1 : 0); }
