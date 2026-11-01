#!/usr/bin/env node
/* j2l5-judge-test — J2 L5 The Search, the typed-line judge (spec §15 gates 2, 4, 5 and 6; §14 A4–A9).
   Runs on the SHIPPED files in ks3-dt/platform/assets/search/hour/ (judge.js, strings.js, pics.js, chapters.js).
   (a) every case the design wrote passes (j2l5/judge.cases.js, from the prototype's judge.test.js)
   (b) gate 2 controls: forward(40 · Forward(40) · for i in range(20) · a three-space indent · a tab. Each must FAIL,
       with its own key, and every key has a message in strings.js
   (c) every row of every error table is reached by a typed line, every message fills (no {k} left), and a message
       that names range(N) names the N on her card
   (d) gate 4: real Python (python3) runs every loop the judge accepts; it must run, and draw exactly what J.expand draws
   (e) gate 5: the simulator (pics.js P.turtle) — the three fields close, range(3) on the square does not,
       left(80) four times does not, forward(10) with left(90) four times is a 10 m box
   (f) gate 6: no shortcut — chapter 3 marks the lamb found only when the ribbon passes within 18 m of her;
       range(9) cannot find her, range(10) can. CONTROL: a chapters.js with an unguarded found = true must be caught
   Usage: node j2l5-judge-test.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const HOUR = process.env.J2L5_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/search/hour');   /* J2L5_HOUR: run on another copy (the design's prototype) */
let checks = 0, fails = 0;
function must(ok, what) { checks++; if (!ok) fails++; if (!ok || process.env.VERBOSE) console.log((ok ? 'ok   ' : 'FAIL ') + what); return ok; }
function done() { console.log('\nj2l5-judge: ' + (fails ? 'FAIL · ' + fails + ' of ' + checks : 'PASS · ' + checks + ' checks')); process.exit(fails ? 1 : 0); }
for (const f of ['judge.js', 'strings.js', 'pics.js', 'chapters.js']) if (!fs.existsSync(path.join(HOUR, f))) { must(false, 'shipped file missing: assets/search/hour/' + f); }
if (fails) done();

global.window = {};
require(path.join(HOUR, 'strings.js'));
const S = window.SearchStrings;
const J = require(path.join(HOUR, 'judge.js'));
const CH = fs.readFileSync(path.join(HOUR, 'chapters.js'), 'utf8');
const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => v && v[k] != null ? v[k] : m);
const st0 = { atPrint: 0, lit: false }, stF = { atPrint: 3, lit: false }, stL = { atPrint: 3, lit: true };

/* (a) the design's own cases */
process.env.J2L5_JUDGE = path.join(HOUR, 'judge.js');
const cases = require('./j2l5/judge.cases.js');
must(cases.n >= 37 && cases.fails === 0, '(a) the design\'s judge cases: ' + cases.n + ' run, ' + cases.fails + ' failed');

/* (b) gate 2 controls — each must fail, with the key that names her slip */
const CONTROLS = [
  ['forward(40 (no closing bracket)', J.line1('forward(40', st0), 'noClose', 'ch1.j'],
  ['Forward(40) (capital F)', J.line1('Forward(40)', st0), 'capF', 'ch1.j'],
  ['forward(40) when the card says 10', J.line1('forward(40)', st0), 'fwdN', 'ch1.j'],
  ['for i in range(20) (no colon)', J.loop1(0, 'for i in range(20)'), 'forNoColon', 'ch1.j4'],
  ['three spaces before forward(10)', J.loop1(1, '   forward(10)'), 'spaces', 'ch1.j4'],
  ['three spaces before look()', J.loop1(2, '   look()'), 'spaces', 'ch1.j4'],
  ['a tab before forward(10)', J.loop1(1, '\tforward(10)'), null, 'ch1.j4'],
  ['three spaces in a fields plan', J.plan2(['for i in range(4):', '   forward(100)', '    left(90)'], { walls: 4, turn: 90 }), 'spaces', 'common'],
  ['for i in range(4) in a fields plan', J.plan2(['for i in range(4)', '    forward(100)', '    left(90)'], { walls: 4, turn: 90 }), 'forNoColon', null]
];
for (const [what, r, key, table] of CONTROLS) {
  const failed = r.ok === false || r.run === false;
  must(failed, '(b) CONTROL ' + what + ' must fail (got ' + JSON.stringify({ ok: r.ok, run: r.run, key: r.key }) + ')');
  if (key) must(r.key === key, '(b) ' + what + ' gives key ' + key + ' (got ' + r.key + ')');
  if (table) { const t = table.split('.').reduce((a, k) => a && a[k], S); must(!!((t && t[r.key]) || S.common[r.key]), '(b) ' + what + ': strings.js ' + table + ' (or common, its fallback) has a message for ' + r.key); }
}
for (const [what, r] of [['forward(10)', J.line1('forward(10)', st0)], ['look() at a gate', J.line1('look()', stF)], ['for i in range(20):', J.loop1(0, 'for i in range(20):')],
  ['four spaces then forward(10)', J.loop1(1, '    forward(10)')], ['four spaces then look()', J.loop1(2, '    look()')], ['forward(10) with spaces after it', J.line1('forward(10)   ', stL)]])
  must(r.ok === true, '(b) must pass: ' + what + ' (got ' + r.key + ')');

/* (c) the error tables. Each SITE mirrors one lookup in chapters.js (its text must be there, so the mirror cannot drift). */
const SQ = { walls: 4, turn: 90 }, FO = { walls: 6, turn: 60 }, TR = { walls: 3, turn: 120 };
const L = (a, b, c) => [a, b, c];
const field = f => S.ch2.fields.find(x => x.walls === f.walls);
/* pick(r) returns her message, or null where the chapter shows none (a fix that worked moves on to its held line) */
const SITES = [
  { name: 'chapter 1, one line', tables: ['ch1.j'], src: ['S.ch1.j[r.key] || S.common.notRun'], card: null,
    pick: r => S.ch1.j[r.key] || S.common.notRun,
    probes: [['forward(10)', st0], ['look()', stF], ['Forward(10)', st0], ['forward 10', st0], ['forward(10', st0], ['forward()', st0], ['look', stF], ['look(10)', stF],
      ['look()', st0], ['forward(10)', stF], ['forward(20)', st0], ['Look()', stF], ['look(', stF], ['fly please', st0]].map(([t, s]) => J.line1(t, s)) },
  { name: 'chapter 1, the loop', tables: ['ch1.j4'], src: ["U.under(U.fill(S.ch1.j4[r.key], { w: 20 }), 'ok')", 'S.ch1.j4[r.key] || S.common[r.key] || S.common.notRun, { n: r.n, w: 20 }'], card: 20,
    pick: r => r.ok ? S.ch1.j4[r.key] : S.ch1.j4[r.key] || S.common[r.key] || S.common.notRun,
    probes: [[0, 'for i in range(20):'], [0, 'for i in range(20)'], [0, 'for i in range 20:'], [0, 'For i in range(20):'], [0, 'for i in range(19):'], [0, 'for in range(20):'],
      [0, 'for i in range():'], [0, '    for i in range(20):'], [0, 'while True:'], [1, '    forward(10)'], [1, 'forward(10)'], [1, '  forward(10)'], [1, '    Forward(10)'],
      [2, '    look()'], [2, 'look()'], [2, '   look()'], [1, 'jump']].map(([i, t]) => J.loop1(i, t)) },
  { name: 'chapter 2, the fields', tables: ['ch2.j'], src: ['S.ch2.j[r.key] || S.common[r.key] || S.common.notRun', "r.key === 'shortMore' ? fd.shortMore : S.ch2.j[r.key]", 'U.under(fd.ok'], card: null,
    pick: r => r.run === false ? (S.ch2.j[r.key] || S.common[r.key] || S.common.notRun) : r.pass ? field(r._f).ok : r.key === 'shortMore' ? field(r._f).shortMore : S.ch2.j[r.key],
    probes: [[L('for i in range(4):', '    forward(100)', '    left(90)'), SQ], [L('for i in range(3):', '    forward(100)', '    left(90)'), SQ], [L('for i in range(2):', '    forward(100)', '    left(90)'), SQ],
      [L('for i in range(5):', '    forward(100)', '    left(90)'), SQ], [L('for i in range():', '    forward(100)', '    left(90)'), SQ], [L('for i in range(4):', 'forward(100)', '    left(90)'), SQ],
      [L('for i in range(4):', '    forward(100)', '    left(60)'), SQ], [L('for i in range(4):', '    forward(100)', ''), SQ], [L('for i in range(4):', '    forward(50)', '    left(90)'), SQ],
      [L('for i in range(4):', '   forward(100)', '    left(90)'), SQ], [L('for i in range(4)', '    forward(100)', '    left(90)'), SQ], [L('For i in range(4):', '    forward(100)', '    left(90)'), SQ],
      [L('  for i in range(4):', '    forward(100)', '    left(90)'), SQ], [L('for i in range(6):', '    forward(100)', '    left(60)'), FO], [L('for i in range(5):', '    forward(100)', '    left(60)'), FO],
      [L('for i in range(3):', '    forward(100)', '    left(120)'), TR], [L('for i in range(2):', '    forward(100)', '    left(120)'), TR]]
      .map(([ls, f]) => Object.assign(J.plan2(ls, f), { _f: f })) },
  { name: 'chapter 3, say(i)', tables: ['ch3.j1'], src: ["U.under(S.ch3.j1[r.key], 'ok')", "S.ch3.j1[r.key === 'forNcard' ? 'forN' : r.key] || S.ch1.j4[r.key] || S.common[r.key] || S.common.notRun, { n: r.n, w: 3 }"], card: 3,
    pick: r => r.ok ? S.ch3.j1[r.key] : S.ch3.j1[r.key === 'forNcard' ? 'forN' : r.key] || S.ch1.j4[r.key] || S.common[r.key] || S.common.notRun,
    probes: [[0, 'for i in range(3):'], [0, 'for i in range(5):'], [0, 'for i in range 3:'], [0, 'for in range(3):'], [0, 'for i in range():'], [0, 'for i in range(3)'],
      [1, '    say(i)'], [1, '    say(3)'], [1, '    say i'], [1, 'say(i)'], [1, '  say(i)']].map(([i, t]) => J.say1(i, t, 3)) },
  { name: 'chapter 3, the change to range(5)', tables: ['ch3.j1'], okKey: 'changeOk', src: ["U.under(S.ch3.j1.changeOk, 'ok')", 'S.ch3.j1[r.key] || S.ch1.j4[r.key] || S.common[r.key] || S.common.notRun, { n: r.n, w: 5 }'], card: 5,
    pick: r => r.ok ? S.ch3.j1.changeOk : S.ch3.j1[r.key] || S.ch1.j4[r.key] || S.common[r.key] || S.common.notRun,
    probes: ['for i in range(5):', 'for i in range(3):', 'for i in range(4):', 'for i in range(5)', 'For i in range(5):', 'for i in range 5:', 'for in range(5):', 'for i in range():', '  for i in range(5):'].map(t => J.forLine(t, 5)) },
  { name: 'chapter 3, the spiral', tables: ['ch3.j2'], src: ['S.ch3.j2[r.key] || S.common[r.key] || S.common.notRun', 'S.ch3.j2[key], { k: r.k, m: r.m }'], card: null,
    pick: r => r.run === false ? S.ch3.j2[r.key] || S.common[r.key] || S.common.notRun : S.ch3.j2[r.key],
    probes: [L('for i in range(10):', '    forward(i * 10)', '    left(90)'), L('for i in range(10):', '    forward(10 * i)', '    left(90)'), L('for i in range(10):', '    forward(10)', '    left(90)'),
      L('for i in range(10):', '    forward(i)', '    left(90)'), L('for i in range(9):', '    forward(i * 10)', '    left(90)'), L('for i in range(13):', '    forward(i * 10)', '    left(90)'),
      L('for i in range(10):', '    forward(i * 10)', ''), L('for i in range(10):', '    forward(i * 10)', '    right(90)'), L('for i in range(10):', 'forward(i * 10)', '    left(90)'),
      L('for i in range(10):', '  forward(i * 10)', '    left(90)'), L('for i in range(10)', '    forward(i * 10)', '    left(90)')].map(ls => J.plan3(ls)) }
];
S.ch4.p.forEach((pg, idx) => {
  const lines = pg.lines, probes = [];
  if (idx === 0) probes.push(L('for i in range(6):', lines[1], lines[2]), L('for i in range(7):', lines[1], lines[2]), L('for i in range(5):', '    forward(90)', lines[2]), lines, L('for i in range(6):', '  forward(100)', lines[2]));
  if (idx === 1) probes.push(L(lines[0], lines[1], '    left(90)'), L('for i in range(3):', lines[1], '    left(90)'), lines, L('for i in range(4)', lines[1], '    left(90)'));
  if (idx === 2) probes.push(L('for i in range(6):', lines[1], lines[2]), L('for i in range(9):', lines[1], lines[2]), L('for i in range(4):', lines[1], lines[2]), lines, L('for i in range(6)', lines[1], lines[2]), L('For i in range(6):', lines[1], lines[2]));
  SITES.push({ name: 'chapter 4, fix ' + (idx + 1), tables: ['ch4.p.' + idx + '.wrong'], src: ['pg.wrong[r.key] || S.common[r.key] || S.common.notRun'], card: null,
    pick: r => r.key === 'fixed' ? null : pg.wrong[r.key] || S.common[r.key] || S.common.notRun, probes: probes.map(ls => J.fix4(idx, ls)) });
});
/* a message that names a count or a range on a screen with a card must name the card's number, not another chapter's */
function namesWrong(msg, card) { const r = msg.match(/range\((\d+)\)/g) || [], t = msg.match(/(?:round|means) (\d+) times/g) || [];
  const last = r.length ? +/\d+/.exec(r[r.length - 1])[0] : null; return (last != null && last !== card) || t.some(x => +/\d+/.exec(x)[0] !== card); }
must(namesWrong('The card says range(3). Type that first.', 5) && namesWrong('range(20) means 20 times.', 5) && !namesWrong('range(4) would fly 4 prints, so type range(5).', 5), '(c) CONTROL the card-number check catches range(3) and range(20) on a range(5) card');
const GENERIC = S.common.notRun, REACHED = {};
for (const site of SITES) {
  for (const s of site.src) must(CH.indexOf(s) >= 0, '(c) ' + site.name + ': chapters.js still has ' + s);
  const seen = new Set();
  for (const t of site.tables) (REACHED[t] = REACHED[t] || { sites: [], keys: new Set() }).sites.push(site.name);
  for (const r of site.probes) {
    seen.add(r.ok && site.okKey ? site.okKey : r.key);
    const msg = site.pick(r);
    if (msg === null) continue;
    must(typeof msg === 'string' && msg.length > 0, '(c) ' + site.name + ': key ' + r.key + ' has a message');
    const filled = fill(msg, { n: r.n, k: r.k, m: r.m, w: r._f ? r._f.walls : site.card, a: r._f ? r._f.turn : r.a });
    must(!/\{\w+\}/.test(filled), '(c) ' + site.name + ': key ' + r.key + ' fills completely ("' + filled + '")');
    if (site.card != null) must(!namesWrong(filled, site.card), '(c) ' + site.name + ': "' + filled + '" names the number on her card, ' + site.card);
    if (/^(spaces|indent|forNoColon|forCap|forIndent)$/.test(r.key)) must(filled !== GENERIC, '(c) ' + site.name + ': a ' + r.key + ' slip gets its own message, not "' + GENERIC + '"');
  }
  for (const t of site.tables) for (const k of seen) REACHED[t].keys.add(k === 'forNcard' ? 'forN' : k);
}
/* every row of a judge table is reached by some typed line on a screen that reads that table */
for (const t of Object.keys(REACHED)) {
  const tab = t.split('.').reduce((a, k) => a && a[k], S);
  for (const k of Object.keys(tab || {})) must(REACHED[t].keys.has(k), '(c) ' + REACHED[t].sites.join(' / ') + ': the row ' + t + '.' + k + ' is reached by a typed line');
}

/* (d) gate 4 — real Python runs every loop the judge accepts, and draws the same */
const BODY = ['forward(10)', 'forward(i * 10)', 'forward(10 * i)', 'forward(i)', 'forward(i + 5)', 'left(90)', 'right(60)', 'say(i)', 'look()'];
const progs = [];
for (const n of [3, 4, 6]) for (const a of BODY) { progs.push(['for i in range(' + n + '):', '    ' + a]);
  for (const b of BODY) { progs.push(['for i in range(' + n + '):', '    ' + a, '    ' + b]); for (const c of BODY) progs.push(['for i in range(' + n + '):', '    ' + a, '    ' + b, '    ' + c]); } }
const MUT = [ls => ls.map((l, i) => i ? l.replace(/^ {4}/, '  ') : l), ls => ls.map((l, i) => i ? l.replace(/^ {4}/, '\t') : l), ls => [ls[0].replace(/:$/, '')].concat(ls.slice(1)),
  ls => [ls[0].replace('for', 'For')].concat(ls.slice(1)), ls => [ls[0].replace('range(', 'range ')].concat(ls.slice(1)), ls => ls.map((l, i) => i === 1 ? l.replace('forward', 'Forward') : l),
  ls => ls.map((l, i) => i === 1 ? l.replace(/\)$/, '') : l), ls => ls.map((l, i) => i === 1 ? l.trim() : l), ls => [ls[0], ''].concat(ls.slice(1))];
const fuzz = progs.slice(0, 300).reduce((acc, p) => acc.concat(MUT.map(m => m(p))), []);
const model = [['for i in range(4):', '    forward(100)', '    left(90)'], ['for i in range(6):', '    forward(100)', '    left(60)'], ['for i in range(3):', '    forward(100)', '    left(120)'],
  ['for i in range(10):', '    forward(i * 10)', '    left(90)'], ['for i in range(20):', '    forward(10)', '    look()'], ['for i in range(5):', '    say(i)']]
  .concat(S.close.freeStarters.map(s => s[1])).concat(S.ch4.p.map(p => p.lines));
const all = progs.concat(fuzz, model), accepted = all.filter(ls => J.parsePlan(ls).body);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'j2l5-py-'));
fs.writeFileSync(path.join(tmp, 'progs.json'), JSON.stringify(accepted.map(ls => ls.join('\n') + '\n')));
fs.writeFileSync(path.join(tmp, 'run.py'), [
  'import json, sys', 'progs = json.load(open(sys.argv[1]))', 'out = []', 'for src in progs:', '    acts = []',
  "    env = {'forward': lambda v: acts.append(['forward', v]), 'left': lambda v: acts.append(['left', v]), 'right': lambda v: acts.append(['right', v]),",
  "           'say': lambda v: acts.append(['say', v]), 'look': lambda: acts.append(['look', 0])}",
  '    try:', "        exec(compile(src, '<her loop>', 'exec'), env); out.append(acts)", '    except Exception as e:', "        out.append({'err': type(e).__name__ + ': ' + str(e)})",
  'print(json.dumps(out))'].join('\n'));
let py = null;
try { py = JSON.parse(cp.execFileSync('python3', ['-I', path.join(tmp, 'run.py'), path.join(tmp, 'progs.json')], { maxBuffer: 1 << 28 }).toString()); } catch (e) { must(false, '(d) python3 ran: ' + e.message); }
if (py) {
  let bad = 0, firstBad = '';
  accepted.forEach((ls, i) => { const mine = J.expand(J.parsePlan(ls)).map(a => [a.op, a.v]); const real = py[i];
    if (!Array.isArray(real) || JSON.stringify(mine) !== JSON.stringify(real)) { bad++; if (!firstBad) firstBad = JSON.stringify(ls) + ' judge ' + JSON.stringify(mine).slice(0, 80) + ' python ' + JSON.stringify(real).slice(0, 120); } });
  must(accepted.length > 2000, '(d) ' + accepted.length + ' loops the judge accepts were run in real Python (of ' + all.length + ' typed, ' + fuzz.length + ' with a slip in them)');
  must(bad === 0, '(d) every loop the judge accepts runs in real Python and draws the same moves' + (bad ? ': ' + bad + ' differ, first ' + firstBad : ''));
}
fs.rmSync(tmp, { recursive: true, force: true });

/* (e) gate 5 — the simulator, pics.js P.turtle as shipped */
const picsSrc = fs.readFileSync(path.join(HOUR, 'pics.js'), 'utf8');
const tLine = picsSrc.split('\n').find(l => /^\s*P\.turtle = function/.test(l));
must(!!tLine, '(e) pics.js has P.turtle');
const turtle = tLine ? eval('(' + tLine.trim().replace(/^P\.turtle = /, '').replace(/;\s*$/, '') + ')') : () => ({ segs: [], x: 0, y: 0, hd: 0 });
const fly = ls => turtle(0, 0, 90, J.expand(J.parsePlan(ls), 400), 1);
const shut = tr => Math.hypot(tr.x, tr.y) < 0.001;
for (const [f, a] of [[4, 90], [6, 60], [3, 120]]) must(shut(fly(['for i in range(' + f + '):', '    forward(100)', '    left(' + a + ')'])), '(e) the field with ' + f + ' walls closes with range(' + f + ') and left(' + a + ')');
must(!shut(fly(['for i in range(3):', '    forward(100)', '    left(90)'])), '(e) CONTROL range(3) on the square leaves a gap');
must(!shut(fly(['for i in range(4):', '    forward(100)', '    left(80)'])), '(e) CONTROL left(80) four times does not close');
const box = fly(['for i in range(4):', '    forward(10)', '    left(90)']), xs = box.segs.map(s => s.x2), ys = box.segs.map(s => s.y2);
must(shut(box) && Math.abs(Math.max(...xs) - Math.min(...xs) - 10) < 1e-9 && Math.abs(Math.max(...ys) - Math.min(...ys) - 10) < 1e-9, '(e) forward(10) with left(90) four times is a 10 m box');

/* (f) gate 6 — no shortcut to the lamb */
const LAMB = { x: -35, y: 40 };   /* chapters.js: LAMB = { x: CX - 35 * M, y: CY - 40 * M } on screen, so 35 m left and 40 m up */
function myTurtle(acts) { let x = 0, y = 0, hd = 90; const segs = []; for (const a of acts) { if (a.op === 'forward') { const r = hd * Math.PI / 180, nx = x + Math.cos(r) * a.v, ny = y + Math.sin(r) * a.v; segs.push([x, y, nx, ny]); x = nx; y = ny; } else if (a.op === 'left') hd += a.v; else if (a.op === 'right') hd -= a.v; } return segs; }
function nearest(segs, p) { let best = Infinity; for (const [x1, y1, x2, y2] of segs) { const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy; let t = L2 ? ((p.x - x1) * dx + (p.y - y1) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); best = Math.min(best, Math.hypot(x1 + t * dx - p.x, y1 + t * dy - p.y)); } return best; }
const finds = ls => nearest(myTurtle(J.expand(J.parsePlan(ls), 12)), LAMB) < 18;
const spiral = n => ['for i in range(' + n + '):', '    forward(i * 10)', '    left(90)'];
must(finds(spiral(10)), '(f) range(10) with forward(i * 10) and left(90) passes within 18 m of the lamb');
for (let n = 1; n <= 9; n++) must(!finds(spiral(n)), '(f) range(' + n + ') cannot find her (fewer passes)');
must(!finds(['for i in range(12):', '    forward(10)', '    left(90)']), '(f) forward(10) every time cannot find her');
must(nearest(myTurtle(J.expand(J.parsePlan(spiral(10)), 12)), LAMB) < 1e-9, '(f) the tenth pass flies right over her');
const ch3 = CH.slice(CH.indexOf('H.ch3'), CH.indexOf('H.ch4'));
const GUARD = /if \(tip && Math\.hypot\(tip\.x - LAMB\.x, tip\.y - LAMB\.y\) < 18 \* M\) \{ found = true;/g;
function guarded(src) { const bare = (src.match(/(^|[^.\w])found = true/g) || []).length, ok = (src.match(GUARD) || []).length, stF = (src.match(/st\.found = true/g) || []).length, stOk = (src.match(/if \(found\) \{ st\.found = true;/g) || []).length; return bare > 0 && bare === ok && stF === stOk; }
must(ch3.length > 1000 && guarded(ch3), '(f) chapter 3 sets found only when the ribbon tip is within 18 m of the lamb');
must(/LAMB = \{ x: CX - 35 \* M, y: CY - 40 \* M \}/.test(ch3) && /P\.turtle\(CX, CY, 90, J\.expand\(r\.plan, 12\), M\)/.test(ch3), '(f) the lamb is 35 m left and 40 m up, and the flight is the expanded plan (at most 12 passes)');
const patched = ch3.replace('if (tip && Math.hypot(tip.x - LAMB.x, tip.y - LAMB.y) < 18 * M) { found = true;', 'found = true; if (tip && Math.hypot(tip.x - LAMB.x, tip.y - LAMB.y) < 18 * M) {');
must(patched !== ch3 && !guarded(patched), '(f) CONTROL a chapter 3 that sets found = true without the 18 m check is caught');
const patched2 = ch3 + "\nfunction cheat(){ found = true; }";
must(!guarded(patched2), '(f) CONTROL a second, unguarded found = true is caught');
done();
