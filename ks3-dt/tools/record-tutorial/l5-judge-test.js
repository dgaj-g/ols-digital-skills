#!/usr/bin/env node
/* GATE l5-judge-test (A4) · the judge accepts every fix path and rejects every §5.5 control.
   For all three seats: each chapter's given program holds exactly its faults; every accepted fix (each alternate,
   blank lines anywhere, comments edited or added, single quotes, spaces) is clean; each part-fixed state holds the
   faults that remain; all 21 night variants. The six §5.5 controls: capital L, return outside the function, str beam
   without brackets, the fix on the wrong line, a second fog_horn() (ACCEPTED: two horns), the right fix plus a broken
   unrelated line. And the judge never claims a shouting fault that Python does not see.
   --control loads a lenient judge (case folded, so Lamp_on() passes) and MUST fail.
   Usage: node tools/record-tutorial/l5-judge-test.js [--control] */
'use strict';
var fs = require('fs'), path = require('path'), Module = require('module');
var ROOT = path.resolve(__dirname, '../..'), DIR = path.join(ROOT, 'platform/assets/twolights');
var CONTROL = process.argv.indexOf('--control') >= 0;
var PR = require(path.join(DIR, 'programs.js'));
function loadJudge() {
  var file = path.join(DIR, 'judge.js'), src = fs.readFileSync(file, 'utf8');
  if (CONTROL) src = src.replace("return ind + toks.join(' ');", "return (ind + toks.join(' ')).toLowerCase();");
  var m = new Module(file, module); m.filename = file; m.paths = module.paths; m._compile(src, file);
  return m.exports;
}
var J = loadJudge();
var fails = [], n = 0;
function check(id, cond, detail) { n++; if (!cond) fails.push(id + (detail ? ' · ' + detail : '')); }
function present(r) { return Object.keys(r.faults).filter(function (f) { return r.faults[f].present; }).sort().join(''); }
function expect(id, ch, seat, src, want, opts) {
  var r = J.judge(ch, seat, src, opts);
  if ('faults' in want) check(id + ' faults', present(r) === want.faults, 'got [' + present(r) + '] want [' + want.faults + ']');
  if ('clean' in want) check(id + ' clean', r.clean === want.clean, 'got ' + r.clean + (r.broken.length ? ' broken ' + JSON.stringify(r.broken) : '') + (r.red ? ' red ' + r.red.split('\n').slice(-2)[0] : ''));
  if ('broken' in want) check(id + ' broken', r.broken.length === want.broken, 'got ' + JSON.stringify(r.broken));
  if ('shout' in want) check(id + ' shout', r.shout === want.shout, 'got ' + r.shout);
  if ('effects' in want) check(id + ' effects', JSON.stringify(r.effects) === JSON.stringify(want.effects), 'got ' + JSON.stringify(r.effects));
  if ('brokenLine' in want) check(id + ' broken line', r.broken.length && r.broken[0].line === want.brokenLine, 'got ' + JSON.stringify(r.broken));
  // the judge never claims a shouting fault that Python does not see
  var shoutClaim = Object.keys(r.faults).some(function (f) { return r.faults[f].present && r.faults[f].shout; });
  var asleep = r.faults.S2 && r.faults.S2.present && r.faults.Q3 && r.faults.Q3.present;
  check(id + ' shout honest', !shoutClaim || !!r.run.error || asleep, 'judge claims a shouting fault, python runs clean');
  check(id + ' red seen', !r.run.error || shoutClaim || r.broken.length > 0, 'python shows red, the judge sees no fault and no broken line');
  return r;
}
var blanks = function (s) { return s.split('\n').join('\n\n'); };
var comments = function (s) { return s.replace(/^# .*$/m, '# my lighthouse').replace('\ndef ', '\n# fixed it\ndef '); };
var spaced = function (s) { return s.replace(/\(\)/g, '( )').replace(/ = /g, '  =  ').replace(/\+ /g, '+  '); };
var single = function (s) { return s.replace(/"/g, "'"); };

Object.keys(PR.SEATS).forEach(function (k) {
  var s = PR.SEATS[k], ch = String(180 + s.rocks);
  var none = { lamp: 0, horn: 0, radio: null };
  // chapter 1
  expect(k + ' ch1 given', 'ch1', k, PR.ch1(s, 0), { faults: 'S1S2', clean: false, shout: true, effects: none });
  expect(k + ' ch1 after fix 1', 'ch1', k, PR.ch1(s, 1), { faults: 'S2', clean: false, shout: true });
  expect(k + ' ch1 fix 2 only', 'ch1', k, PR.ch1(s, 0).replace('+ beam)', '+ str(beam))'), { faults: 'S1', clean: false });
  [['fixed', function (x) { return x; }], ['blank lines', blanks], ['comments', comments], ['spaces', spaced], ['single quotes', single]]
    .forEach(function (v) { expect(k + ' ch1 ' + v[0], 'ch1', k, v[1](PR.ch1(s, 2)), { faults: '', clean: true, effects: { lamp: 1, horn: 0, radio: null } }); });
  // chapter 2
  expect(k + ' ch2 given', 'ch2', k, PR.ch2(s, false), { faults: 'Q1', clean: false, shout: false, effects: none });
  expect(k + ' ch2 fixed', 'ch2', k, PR.ch2(s, true), { faults: '', clean: true, effects: { lamp: 0, horn: 1, radio: null } });
  expect(k + ' ch2 fixed after blanks', 'ch2', k, PR.ch2(s, false) + '\n\n\nfog_horn()', { clean: true });
  expect(k + ' ch2 fixed, comments + spaces', 'ch2', k, spaced(comments(PR.ch2(s, true))), { clean: true });
  // chapter 3
  expect(k + ' ch3 given', 'ch3', k, PR.ch3(s, null), { faults: 'Q2', clean: false, effects: { lamp: 0, horn: 0, radio: 'None' } });
  ['after', 'replace', 'paren', 'sum'].forEach(function (x) {
    expect(k + ' ch3 ' + x, 'ch3', k, PR.ch3(s, x), { faults: '', clean: true, effects: { lamp: 0, horn: 0, radio: ch } });
  });
  expect(k + ' ch3 after, blank lines', 'ch3', k, blanks(PR.ch3(s, 'after')), { clean: true });
  // chapter 4: every variant, every part-fixed state, and the fully fixed night
  PR.VARIANTS.forEach(function (v) {
    var all = PR.variantFaults(v), tag = all.join('');
    expect(k + ' ch4 ' + tag + ' given', 'ch4', k, PR.ch4(s, all), { faults: all.slice().sort().join(''), clean: false, shout: !(v.S === 'S2' && all.indexOf('Q3') >= 0) }, { variant: v });
    all.forEach(function (fx) {
      var left = all.filter(function (y) { return y !== fx; });
      expect(k + ' ch4 ' + tag + ' fixed ' + fx, 'ch4', k, PR.ch4(s, left), { faults: left.slice().sort().join(''), clean: false }, { variant: v });
    });
    var q = all.slice(1);
    expect(k + ' ch4 ' + tag + ' only Qs left', 'ch4', k, PR.ch4(s, q), { shout: false,
      effects: { lamp: q.indexOf('Q3') >= 0 ? 0 : 1, horn: q.indexOf('Q1') >= 0 ? 0 : 1, radio: q.indexOf('Q2') >= 0 ? 'None' : ch } }, { variant: v });
    expect(k + ' ch4 ' + tag + ' fixed', 'ch4', k, PR.ch4(s, []), { faults: '', clean: true, effects: { lamp: 1, horn: 1, radio: ch } }, { variant: v });
    expect(k + ' ch4 ' + tag + ' fixed, blanks + comments', 'ch4', k, comments(blanks(PR.ch4(s, []))), { clean: true }, { variant: v });
  });
});

// §5.5 controls (North)
var N = PR.SEATS.A, f1 = PR.ch1(N, 2);
expect('control capital L', 'ch1', 'A', f1.replace('\nlamp_on()', '\nLamp_on()'), { faults: 'S1', clean: false, shout: true });
expect('control return outside the function', 'ch3', 'A', PR.ch3(N, null) + '\nreturn channel', { clean: false, shout: true, broken: 1 });
expect('control str beam without brackets', 'ch1', 'A', PR.ch1(N, 1).replace('+ beam)', '+ str beam)'), { faults: 'S2', clean: false, shout: true });
expect('control fix on the wrong line', 'ch1', 'A', PR.ch1(N, 0).replace('    light(beam)', '    lamp_on()'), { faults: 'S1S2', clean: false, brokenLine: 7 });
expect('control second fog_horn (accepted)', 'ch2', 'A', PR.ch2(N, true) + '\nfog_horn()', { faults: '', clean: true, effects: { lamp: 0, horn: 2, radio: null } });
expect('control fix plus a broken line', 'ch1', 'A', f1.replace('beam = 24', 'beam = = 24'), { faults: '', clean: false, broken: 1, brokenLine: 3 });
// a correct line edited into something else: "Line 4 was right before. Put it back."
expect('right before: beam changed', 'ch1', 'A', f1.replace('beam = 24', 'beam = 25'), { clean: false, broken: 1, brokenLine: 3, shout: false });
expect('right before: line lost', 'ch2', 'A', PR.ch2(N, true).replace('    horn(blasts)\n', ''), { clean: false, broken: 1 });
expect('a fault she was not given, typed in', 'ch4', 'A', PR.ch4(N, ['Q1']), { clean: false, broken: 1 }, { variant: PR.VARIANTS[3] });

console.log('l5-judge-test' + (CONTROL ? ' CONTROL' : '') + ': ' + n + ' checks');
fails.slice(0, 12).forEach(function (f) { console.log('FAIL ' + f); });
if (fails.length) { console.log('l5-judge-test: FAIL · ' + fails.length + ' of ' + n); process.exit(1); }
console.log('l5-judge-test: PASS · all ' + n + ' checks');
