#!/usr/bin/env node
/* GATE l5-effects-test (A5) · the §5.5 effects table, from the judge's lines, equals what real python3 does.
   Every program state of every seat (each chapter given, part-fixed and fixed, every alternate, all 21 night variants
   and every part-fixed night, a second fog_horn) runs in python3 with light/horn/radio wired (pydriver.py). The judge's
   lamp count, horn count and radio value must equal Python's calls; when Python shows red, the lighthouse shows no
   effects at all, whatever ran before the red.
   --control loads a judge whose radio ignores return (always None) and MUST fail.
   Usage: node tools/record-tutorial/l5-effects-test.js [--control] */
'use strict';
var fs = require('fs'), path = require('path'), cp = require('child_process'), Module = require('module');
var ROOT = path.resolve(__dirname, '../..'), DIR = path.join(ROOT, 'platform/assets/twolights');
var CONTROL = process.argv.indexOf('--control') >= 0;
var PR = require(path.join(DIR, 'programs.js'));
function loadJudge() {
  var file = path.join(DIR, 'judge.js'), src = fs.readFileSync(file, 'utf8');
  if (CONTROL) src = src.replace("effects.radio = matched[retK] ? String(180 + c.seat.rocks) : 'None';", "effects.radio = 'None';");
  var m = new Module(file, module); m.filename = file; m.paths = module.paths; m._compile(src, file);
  return m.exports;
}
var J = loadJudge();
var cases = [];
function add(id, ch, seat, src, variant) { cases.push({ id: id, ch: ch, seat: seat, src: src, variant: variant, file: PR.SEATS[seat].file }); }
Object.keys(PR.SEATS).forEach(function (k) {
  var s = PR.SEATS[k];
  [0, 1, 2].forEach(function (st) { add(k + ' ch1 stage ' + st, 'ch1', k, PR.ch1(s, st)); });
  add(k + ' ch1 lamp twice', 'ch1', k, PR.ch1(s, 2) + '\nlamp_on()');
  add(k + ' ch2 given', 'ch2', k, PR.ch2(s, false)); add(k + ' ch2 fixed', 'ch2', k, PR.ch2(s, true));
  add(k + ' ch2 two horns', 'ch2', k, PR.ch2(s, true) + '\nfog_horn()');
  [null, 'after', 'replace', 'paren', 'sum'].forEach(function (x) { add(k + ' ch3 ' + (x || 'given'), 'ch3', k, PR.ch3(s, x)); });
  add(k + ' ch4 clean', 'ch4', k, PR.ch4(s, []), PR.VARIANTS[0]);
  PR.VARIANTS.forEach(function (v) {
    var all = PR.variantFaults(v), tag = all.join('');
    // every subset of the seat's three faults: each part-fixed state she can reach
    for (var m = 0; m < 8; m++) {
      var f = all.filter(function (_, i) { return m & (1 << i); });
      add(k + ' ch4 ' + tag + ' [' + f.join('') + ']', 'ch4', k, PR.ch4(s, f), v);
    }
  });
});
var py = cp.spawnSync('python3', [path.join(__dirname, 'l5/pydriver.py')], { input: JSON.stringify(cases), maxBuffer: 1 << 28 });
if (py.status !== 0) { console.log('FAIL python3 driver: ' + py.stderr); process.exit(1); }
var byId = {}; JSON.parse(py.stdout).forEach(function (w) { byId[w.id] = w; });
var fails = [];
cases.forEach(function (c) {
  var w = byId[c.id], r = J.judge(c.ch, c.seat, c.src, { variant: c.variant });
  var want = { lamp: 0, horn: 0, radio: null };
  if (!w.red) w.effects.forEach(function (e) {
    if (e[0] === 'light') want.lamp++;
    else if (e[0] === 'horn') want.horn++;
    else if (e[0] === 'radio') want.radio = e[1];
  });
  var bad = [];
  if (JSON.stringify(r.effects) !== JSON.stringify(want)) bad.push('effects got ' + JSON.stringify(r.effects) + ' want ' + JSON.stringify(want));
  if (r.shout !== !!w.red) bad.push('shout got ' + r.shout + ' python red ' + !!w.red);
  if (JSON.stringify(r.console) !== JSON.stringify(w.out)) bad.push('console got ' + JSON.stringify(r.console) + ' want ' + JSON.stringify(w.out));
  // light carries the beam, horn the blasts
  if (!w.red) w.effects.forEach(function (e) {
    var s = PR.SEATS[c.seat];
    if (e[0] === 'light' && e[1] !== String(s.beam)) bad.push('light got ' + e[1]);
    if (e[0] === 'horn' && e[1] !== String(s.blasts)) bad.push('horn got ' + e[1]);
  });
  if (bad.length) fails.push(c.id + ' · ' + bad.join(' · '));
});
console.log('l5-effects-test' + (CONTROL ? ' CONTROL' : '') + ': ' + cases.length + ' program states run in python3');
fails.slice(0, 10).forEach(function (f) { console.log('FAIL ' + f); });
if (fails.length) { console.log('l5-effects-test: FAIL · ' + fails.length + ' of ' + cases.length); process.exit(1); }
console.log('l5-effects-test: PASS · the effects table matches python3 for all ' + cases.length);
