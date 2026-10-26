#!/usr/bin/env node
/* j3l6-words — J3 L6 The Night Desk, gate G3: the words gate (J3_L6_SPEC.md §19 G3; DFM 292/294).
   Over every pupil string the lesson ships:
     - the hour's table (assets/nightdesk/hour/strings.js, the SHIPPED copy; deck and brief are teacher-facing, left out),
     - the lesson JSON chunk configs (not teacherBrief, not _provenance) and the five recap items r-j3-601…605,
     - and, when a walk has run, every screen it measured (≤ 40 prose words a screen).
   Rules: ≤ 14 words a sentence (a sum like =B3*C3 counts as one word); never "the ask", never "cell" or "formula" to her.
   The strings are the design's, byte for byte: the shipped table is the prototype's with ONLY the listed build edits.
   Controls (must FAIL): a planted 15-word sentence, a planted 41-word screen, one mutated string.
   usage: node j3l6-words.js [walkdir ...] */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const KS3 = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform';
const PROTO = path.join(KS3, 'L6_J2J3_PROTOTYPES/nightdesk/strings.js');
const HOUR = process.env.J3L6_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/nightdesk/hour');
const SRC = process.env.J3L6_SRC || path.join(KS3, 'content-src');
let fails = 0, passes = 0;
function must(ok, what) { if (ok) passes++; else { fails++; console.log('FAIL ' + what); } return ok; }
function load(file) { if (!fs.existsSync(file)) return null; const w = {}; new Function('window', fs.readFileSync(file, 'utf8'))(w); return w.S; }
const readJSON = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const clone = o => JSON.parse(JSON.stringify(o));
/* the build's listed edits to the design's table (recorded in J3L6_BUILD_PROGRESS.md) */
/* every edit is listed with its old text in j3l6/string-edits.json; a key renamed by a gate fix is listed in GONE */
const EDITS = {}; Object.entries(readJSON(path.join(__dirname, 'j3l6/string-edits.json')) || {}).forEach(([k, v]) => { EDITS[k] = v.to; });
const GONE = [];
function setAt(o, p, v) { const k = p.split('.'), last = k.pop(); k.reduce((x, y) => x[y], o)[last] = v; }
function walk(v, p, out) {
  if (typeof v === 'string') out.push([p, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, p + '[' + i + ']', out));
  else if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k], p + '.' + k, out));
  return out;
}
const words = s => s.replace(/<[^>]+>/g, ' ').replace(/\{\w+\}/g, 'X').replace(/[·—–]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
function sentenceFails(text) {
  const bad = [];
  String(text).replace(/=[A-Z$(][^\s]*/gi, 'SUM').split(/(?<=[.!?])\s+/).forEach(s => { const w = words(s); if (w > 14) bad.push(w + ': ' + s); });
  return bad;
}
const BANNED = [/\bthe ask\b/i, /\bcells?\b/i, /\bformulas?\b(?! bar)/i];
function checkStrings(list, label) {
  let n = 0;
  list.forEach(([p, s]) => {
    if (/^(id|icon|file|href|kind|code|sel)$|\.(id|icon|kind|layout|theme|bg|img)$/.test(p.split('.').pop())) return;
    n++;
    sentenceFails(s).forEach(b => must(false, label + p + ' sentence over 14 words (' + b + ')'));
    BANNED.forEach(re => { if (re.test(s)) must(false, label + p + ' uses a banned word ' + re + ': ' + s); });
  });
  return n;
}
/* 1 · the shipped table is the design's, with only the listed edits */
const P = load(PROTO), H = load(path.join(HOUR, 'strings.js'));
if (!must(P && H, 'prototype and shipped strings.js both load')) { console.log('\nj3l6-words: FAIL'); process.exit(1); }
const want = clone(P); Object.keys(EDITS).forEach(k => setAt(want, k, EDITS[k])); GONE.forEach(k => { const a = k.split('.'), l = a.pop(); delete a.reduce((x, y) => x[y], want)[l]; });
const diff = walk(want, 'S', []).filter(([p, s]) => walk(H, 'S', []).find(x => x[0] === p)?.[1] !== s).concat(walk(H, 'S', []).filter(([p]) => !walk(want, 'S', []).find(x => x[0] === p)));
must(diff.length === 0, 'shipped strings.js differs from the design + listed edits at: ' + diff.slice(0, 5).map(d => d[0]).join(', '));
/* 2 · every pupil string: ≤ 14 words a sentence, no banned word */
const pupil = clone(H); delete pupil.deck; delete pupil.brief; delete pupil.recapPool; /* recap items are checked from the pool below */
const nTable = checkStrings(walk(pupil, 'S', []), 'strings ');
const L = readJSON(path.join(SRC, 'j3/lessons/j3-06.json'));
let nLesson = 0;
if (must(L, 'content-src/j3/lessons/j3-06.json exists')) { const c = clone(L); delete c.teacherBrief; delete c._provenance; delete c.keys; nLesson = checkStrings(walk(c.chunks, 'chunks', []).filter(([p]) => !/\.strings\./.test(p)), 'lesson '); }
const R = readJSON(path.join(SRC, 'j3/recap-pool.json'));
const mine = R ? (R.items || []).filter(i => /^r-j3-60[1-5]$/.test(i.id)) : [];
must(mine.length === 5, 'recap pool has r-j3-601…605 (' + mine.length + ')');
checkStrings(walk(mine.map(i => ({ stem: i.stem, options: i.options })), 'recap', []), '');
/* 3 · walks: ≤ 40 prose words a screen */
let nScreens = 0;
process.argv.slice(2).forEach(d => { const m = readJSON(path.join(d, 'measure.json')); if (!must(m, 'walk ' + d + ' has measure.json')) return;
  m.records.forEach(r => { nScreens++; must(r.words <= 40, d + ' screen ' + r.screen + ' has ' + r.words + ' prose words (limit 40)'); r.prose.forEach(t => sentenceFails(t).forEach(b => must(false, d + ' screen ' + r.screen + ' sentence over 14 (' + b + ')'))); }); });
/* 4 · controls: each MUST be caught */
const c15 = sentenceFails('This planted sentence has exactly fifteen words in it so the gate must catch it now.');
must(c15.length === 1, 'CONTROL a planted 15-word sentence is caught');
must(sentenceFails('Type =B3*(1+$B$1) in the box and press Enter.').length === 0, 'CONTROL a sum counts as one word');
must(words(Array(41).fill('word').join(' ')) > 40, 'CONTROL a planted 41-word screen is over the limit');
const mut = clone(H); mut.common.next = mut.common.next + '!';
must(walk(mut, 'S', []).some(([p, s]) => walk(want, 'S', []).find(x => x[0] === p)?.[1] !== s), 'CONTROL one mutated string is caught');
must(BANNED.some(re => re.test('Click the cell D3.')), 'CONTROL a planted "cell" is caught');
console.log('\nj3l6-words: ' + (fails ? 'FAIL · ' + fails + ' failures' : 'PASS · ' + passes + ' checks') + ' · ' + nTable + ' table strings · ' + nLesson + ' lesson strings · ' + nScreens + ' walked screens');
process.exit(fails ? 1 : 0);
