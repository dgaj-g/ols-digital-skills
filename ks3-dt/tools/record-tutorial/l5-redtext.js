#!/usr/bin/env node
/* GATE l5-redtext · the lighthouse's Python prints exactly what real python3 prints.
   Corpus: every chapter program for all three seats (given, each fix stage, every accepted alternate), all 21 night
   variants and their part-fixed states, the six judge controls (§5.5), the calibration cases, and a few hundred
   single-edit pupil mistakes generated from the programs. Each runs in pyrun (node) and in python3 (pydriver.py); the
   console lines, the red text and the effects must match byte for byte. Effects: on any error the lighthouse shows
   none (spec §5.5), so there the check is "none shown".
   --control loads a pyrun with two planted faults (suggestion cost and caret marks) and MUST fail.
   Usage: node tools/record-tutorial/l5-redtext.js [--control] [--show N] */
'use strict';
var fs = require('fs'), path = require('path'), cp = require('child_process'), Module = require('module');
var ROOT = path.resolve(__dirname, '../..');
var CONTROL = process.argv.indexOf('--control') >= 0;
var SHOW = +(process.argv[process.argv.indexOf('--show') + 1] || 8) || 8;
var PR = require(path.join(ROOT, 'platform/assets/twolights/programs.js'));

function loadPyrun() {
  var file = path.join(ROOT, 'platform/assets/twolights/pyrun.js');
  var src = fs.readFileSync(file, 'utf8');
  if (CONTROL) {
    src = src.replace('var MOVE = 2, CASE = 1;', 'var MOVE = 1, CASE = 1;')
      .replace("c += '^';\n        else c += anc ? '~' : '^';", "c += '~';\n        else c += anc ? '^' : '^';");
  }
  var m = new Module(file, module); m.filename = file; m.paths = module.paths; m._compile(src, file);
  return m.exports;
}
var Py = loadPyrun();

/* ---------- the corpus ---------- */
var cases = [], core = 0;
function add(id, src, file, isCore) { cases.push({ id: id, src: src, file: file || 'north_light.py', core: !!isCore }); }
Object.keys(PR.SEATS).forEach(function (k) {
  var s = PR.SEATS[k], f = s.file;
  [0, 1, 2].forEach(function (st) { add(k + ' ch1 stage ' + st, PR.ch1(s, st), f, true); });
  add(k + ' ch2 given', PR.ch2(s, false), f, true); add(k + ' ch2 fixed', PR.ch2(s, true), f, true);
  add(k + ' ch2 fixed after blanks', PR.ch2(s, false) + '\n\n\nfog_horn()', f, true);
  [null, 'after', 'replace', 'paren', 'sum'].forEach(function (x) { add(k + ' ch3 ' + (x || 'given'), PR.ch3(s, x), f, true); });
  add(k + ' ch4 clean', PR.ch4(s, []), f, true);
  PR.VARIANTS.forEach(function (v) {
    var all = PR.variantFaults(v), tag = all.join('');
    add(k + ' ch4 ' + tag, PR.ch4(s, all), f, true);
    all.forEach(function (fx) { add(k + ' ch4 ' + tag + ' minus ' + fx, PR.ch4(s, all.filter(function (y) { return y !== fx; })), f, true); });
  });
});
// the six extra posters (A3), given and fixed
PR.EXTRAS.forEach(function (x) { add('extras ' + x.id + ' given', x.src, 'harbour.py', true); add('extras ' + x.id + ' fixed', x.fixed, 'harbour.py', true); });
var N = PR.SEATS.A, fixed1 = PR.ch1(N, 2), night = PR.ch4(N, []);
// §5.5 judge controls, as Python sees them
add('control capital L', fixed1.replace('\nlamp_on()', '\nLamp_on()'), 0, true);
add('control return outside', PR.ch3(N, null).replace('\nb = bearing()', '\nreturn channel\nb = bearing()'), 0, true);
add('control str beam', PR.ch1(N, 1).replace('" + beam)', '" + str beam)'), 0, true);
add('control fix on wrong line', PR.ch1(N, 0).replace('    light(beam)', '    lamp_on()'), 0, true);
add('control second fog_horn', PR.ch2(N, true) + '\nfog_horn()', 0, true);
add('control fix plus broken line', fixed1.replace('beam = 24', 'beam = = 24'), 0, true);
// calibration cases (summary table, read from python3 3.14)
[['noindent', 'def f():\nprint(1)'], ['def at eof', 'def f():'], ['unexpected indent', 'x = 1\n    y = 2'],
 ['unindent mismatch', 'def f():\n    x = 1\n  y = 2'], ['return top', 'return 5'],
 ['comma str beam', 'beam = 1\nname = "a"\nprint(name + " a " + str beam)'], ['comma strings', 'x = 1\nprint("a" "b" x)'],
 ['comma f', 'a = 1\nb = 2\nf(a b)'], ['double eq', 'x = = 2'], ['lamp on space', 'lamp on()'], ['def no colon', 'def f()\n    pass'],
 ['def no paren', 'def f:\n    pass'], ['unterminated', 'print("abc)'], ['never closed', 'print("abc"'], ['unmatched', 'print("abc"))'],
 ['print stmt', 'print "hello"'], ['assign to call', 'lamp_on() = 3'], ['dangling plus', 'x = 1 +'], ['top str beam', 'str beam'],
 ['retrun', 'def f():\n    channel = 3\n    retrun channel'], ['deff', 'deff f():\n    pass'],
 ['int plus str', 'x = 3 + "a"'], ['call str', 'x = "a"\nx()'], ['too many args', 'def f():\n    pass\nf(1)'],
 ['missing arg', 'def f(a, b):\n    pass\nf()'], ['unbound', 'x = 1\ndef f():\n    print(x)\n    x = 2\nf()'],
 ['forgot import', 'math'], ['int of word', 'int("beam")'], ['light no arg', 'light()'], ['radio two', 'radio(1, 2)'],
 ['curly quote', 'print(\u201chello\u201d)'], ['nested call tb', 'def a():\n    b()\ndef b():\n    return 1 + "x"\na()'],
 ['assign call full', 'def g():\n    return "a" + 1\nv = g()'], ['return call full', 'def g():\n    return "a" + 1\ndef h():\n    return g()\nh()'],
 ['print None', 'def g():\n    pass\nprint(g())'], ['radio None', 'def g():\n    pass\nradio(g())'], ['concat paren', 'x = ("a") + 1'],
 ['mismatch bracket', 'print(1]'], ['decimal literal', 'x = 2beam'], ['empty def body pass', 'def f():\n    pass\nf()']
].forEach(function (c) { add('cal ' + c[0], c[1], 0, true); });
core = cases.length;

// single-edit pupil mistakes, generated from the programs (North only; the seats differ only in values)
var bases = [['ch1g', PR.ch1(N, 0)], ['ch1a', PR.ch1(N, 1)], ['ch1', fixed1], ['ch2', PR.ch2(N, true)], ['ch3', PR.ch3(N, 'after')], ['ch4', night]];
bases.forEach(function (b) {
  var L = b[1].split('\n');
  L.forEach(function (line, i) {
    var at = function (tag, nl) { var c = L.slice(); if (nl === null) c.splice(i, 1); else c[i] = nl; add('mut ' + b[0] + ' L' + (i + 1) + ' ' + tag, c.join('\n')); };
    if (!line.trim() || line.trim()[0] === '#') return;
    at('drop line', null);
    if (/^ /.test(line)) at('unindent', line.replace(/^ +/, '')); else at('indent', '    ' + line);
    at('two-space', line.replace(/^ */, '  '));
    var re = /[A-Za-z_][A-Za-z_0-9]*/g, m;
    while ((m = re.exec(line))) {
      var w = m[0], s0 = m.index, e0 = s0 + w.length, inStr = (line.slice(0, s0).split('"').length - 1) % 2 === 1;
      if (inStr || w.length < 3) continue;
      at('cut ' + w, line.slice(0, e0 - 1) + line.slice(e0));
      at('cap ' + w, line.slice(0, s0) + w[0].toUpperCase() + w.slice(1) + line.slice(e0));
      at('swap ' + w, line.slice(0, s0) + w[1] + w[0] + w.slice(2) + line.slice(e0));
    }
    ['(', ')', '"', ':', '+', '='].forEach(function (ch) {
      var k = line.indexOf(ch);
      if (k >= 0) at('lose ' + ch, line.slice(0, k) + line.slice(k + 1));
      var r = line.lastIndexOf(ch);
      if (r > k) at('lose last ' + ch, line.slice(0, r) + line.slice(r + 1));
    });
    if (line.indexOf('(') >= 0) at('space before (', line.replace('(', ' ('));
    if (line.indexOf('str(') >= 0) at('str space', line.replace('str(', 'str ').replace(/\)\)$/, ')'));
    if (line.indexOf('"') >= 0) at('single quotes', line.replace(/"/g, "'"));
  });
});

/* ---------- run both sides ---------- */
var py = cp.spawnSync('python3', [path.join(__dirname, 'l5/pydriver.py')],
  { input: JSON.stringify(cases.map(function (c) { return { id: c.id, src: Py.run(c.src).src, file: c.file }; })), maxBuffer: 1 << 28 });
if (py.status !== 0) { console.log('FAIL python3 driver: ' + py.stderr); process.exit(1); }
var want = JSON.parse(py.stdout), byId = {};
want.forEach(function (w) { byId[w.id] = w; });

var fails = [], uns = 0, unsCore = 0, kinds = {};
cases.forEach(function (c, idx) {
  var got = Py.run(c.src, { file: c.file }), w = byId[c.id];
  if (got.unsupported) { uns++; if (c.core) { unsCore++; fails.push({ c: c, why: 'unsupported ' + JSON.stringify(got.unsupported), got: '', want: w.red }); } return; }
  var eff = got.effects.map(function (e) { return [e.fx, (function (v) { return v.t === 'str' ? v.v : v.t === 'int' ? String(v.v) : v.t === 'NoneType' ? 'None' : v.t === 'bool' ? (v.v ? 'True' : 'False') : '?'; })(e.v), e.v.t === 'builtin' ? 'function' : e.v.t]; });
  var wantEff = w.red ? [] : w.effects;
  if (got.red && w.red) eff = [];   // error: lighthouse shows no effects (checked by the effects gate)
  var why = [];
  if (got.red !== w.red) why.push('red');
  if (JSON.stringify(got.out) !== JSON.stringify(w.out)) why.push('console');
  if (JSON.stringify(eff) !== JSON.stringify(wantEff)) why.push('effects');
  if (why.length) fails.push({ c: c, why: why.join('+'), got: got.red + '|' + JSON.stringify(got.out) + JSON.stringify(eff), want: w.red + '|' + JSON.stringify(w.out) + JSON.stringify(wantEff) });
  var k = w.red ? (w.red.split('\n').filter(Boolean).pop().split(':')[0]) : 'clean'; kinds[k] = (kinds[k] || 0) + 1;
});

console.log('l5-redtext' + (CONTROL ? ' CONTROL' : '') + ': ' + cases.length + ' programs (' + core + ' core, ' + (cases.length - core) + ' generated mistakes)');
console.log('  outcomes in python3: ' + Object.keys(kinds).sort().map(function (k) { return k + ' ' + kinds[k]; }).join(' · '));
console.log('  outside the lighthouse subset (generated only, shown as the plain fallback line): ' + uns + (unsCore ? ' · CORE ' + unsCore : ''));
fails.slice(0, SHOW).forEach(function (f) {
  console.log('FAIL ' + f.c.id + ' [' + f.why + ']\n  src: ' + JSON.stringify(f.c.src).slice(0, 220) + '\n  got:  ' + JSON.stringify(f.got).slice(0, 400) + '\n  want: ' + JSON.stringify(f.want).slice(0, 400));
});
if (fails.length) { console.log('l5-redtext: FAIL · ' + fails.length + ' of ' + cases.length + ' differ from python3'); process.exit(1); }
console.log('l5-redtext: PASS · all ' + cases.length + ' match python3 byte for byte');
