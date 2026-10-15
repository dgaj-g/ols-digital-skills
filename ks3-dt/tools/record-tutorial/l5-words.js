#!/usr/bin/env node
/* GATE l5-words (A1, and the strings half of A14) · every TWO LIGHTS string obeys the word laws and matches the spec.
   Laws (spec §2.9): a screen line ≤ 12 words; an instruction ≤ 14; a say line ≤ 12 words a sentence; under 40 words of
   prose a screen; lines, instructions and say lines are full sentences; a number never without its thing.
   Coverage: every quoted string in spec §8 is in strings.js, and every string in strings.js (rendered with the spec's
   own example values) is in the spec, except the named derived lines below.
   --control adds a 15-word line and a bare number and MUST fail.
   Usage: node tools/record-tutorial/l5-words.js [--control] */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.resolve(__dirname, '../..');
var CONTROL = process.argv.indexOf('--control') >= 0;
var SPEC = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/J3_L5_TWO_LIGHTS_SPEC.md';
var T = require(path.join(ROOT, 'platform/assets/twolights/strings.js'));
var S = JSON.parse(JSON.stringify(T.S));
if (CONTROL) {
  S['ctl.long'] = { t: 'line', s: 'Marigold and her three puffins drift slowly past the rocks while every single light stays out.' };
  S['ctl.bare'] = { t: 'line', s: 'You have 3.' };
}
// derived inside the spec's room (progress note N10): the solo symptoms §6 names by its one example
var DERIVED = { 'solo.light': 'N10 solo symptom', 'solo.none': 'N10 solo symptom',
  'top.trio': 'spec §3 writes the trio line with an ellipsis' };
var SCREENS = { ceremony: ['cer.1', 'cer.2', 'cer.3', 'cer.4', 'cer.5', 'cer.trio'], open: ['open.1', 'open.2', 'open.3', 'open.4'],
  home: ['home.1', 'home.reveal', 'home.bounties'] };
var spec = fs.readFileSync(SPEC, 'utf8');
var flat = spec.replace(/\n\s*/g, ' ');
function rendered(id) {
  var e = S[id];
  return e.s.replace(/\{(\w+)\}/g, function (_, k) { return String((e.ex || {})[k]); });
}
function words(s) { return s.split(/\s+/).filter(function (w) { return /[A-Za-z0-9]/.test(w); }); }
var fails = [], n = 0;
function check(id, cond, d) { n++; if (!cond) fails.push(id + ' · ' + d); }
Object.keys(S).forEach(function (id) {
  var e = S[id], r = rendered(id), w = words(r);
  var lim = { line: 12, instruction: 14, label: 8 }[e.t];
  // a poster's title and its line sit apart on the card
  if (lim) r.split(' · ').forEach(function (part) { var pw = words(part).length; check(id, pw <= lim, pw + ' words in a ' + e.t + ' (max ' + lim + '): "' + part + '"'); });
  if (e.t === 'card' || e.t === 'say') check(id, w.length < 40, w.length + ' words of prose');
  if (e.t === 'say' || e.t === 'card') r.split(/(?<=[.?!])\s+/).forEach(function (sn) { check(id, words(sn).length <= 12, 'say sentence over 12 words: "' + sn + '"'); });
  if (e.t !== 'label') check(id, /[.?!]$/.test(r), 'not a full sentence: "' + r + '"');
  // a number never without its thing: "line 9", "9 of 6 faults", "Bounties: 5 of 6."
  w.forEach(function (x, i) {
    if (!/^\d+[.,]?$/.test(x)) return;
    var prev = (w[i - 1] || '').toLowerCase(), next = (w[i + 1] || '').toLowerCase();
    var ok = prev === 'line' || next === 'of' || (prev === 'of' && /:$/.test(w[i - 3] || '')) || (prev === 'of' && next && !/\d/.test(next));
    check(id, ok, 'a number without its thing: "' + r + '"');
  });
});
Object.keys(SCREENS).forEach(function (sc) {
  var total = SCREENS[sc].reduce(function (a, id) { return a + words(rendered(id)).length; }, 0);
  check('screen ' + sc, total < 40, total + ' words of prose on one screen');
});
// coverage both ways
var all = Object.keys(S).map(rendered);
Object.keys(S).forEach(function (id) {
  if (DERIVED[id] || /^ctl\./.test(id)) return;
  var r = rendered(id);
  check(id, flat.indexOf(r) >= 0 || flat.indexOf('"' + r.replace(/\.$/, '') + '"') >= 0, 'not in the spec: "' + r + '"');
});
var s8 = spec.slice(spec.indexOf('## 8. Every string'), spec.indexOf('## 9.')).replace(/\n\s*/g, ' ');
var quotes = s8.match(/"[^"]+"/g) || [];
quotes.forEach(function (q) {
  q = q.slice(1, -1);
  if (/^…/.test(q)) return;
  check('spec §8', all.indexOf(q) >= 0, 'spec string missing from strings.js: "' + q + '"');
});
console.log('l5-words' + (CONTROL ? ' CONTROL' : '') + ': ' + Object.keys(S).length + ' strings, ' + quotes.length + ' quoted in spec §8, ' + n + ' checks');
fails.slice(0, 12).forEach(function (f) { console.log('FAIL ' + f); });
if (fails.length) { console.log('l5-words: FAIL · ' + fails.length + ' of ' + n); process.exit(1); }
console.log('l5-words: PASS · all ' + n + ' checks');
