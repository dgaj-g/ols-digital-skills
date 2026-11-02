#!/usr/bin/env node
/* TEXT JUDGE — every pupil-facing string in content.js, checked by closed mechanical rules.
   (Meaning and tone are the cold reader's job; this catches what a machine can.)
   node judge-text.js [content.js]   → every rule passes, exit 0
   node judge-text.js --control      → runs on controls/bad-strings.js, which breaks every rule once;
                                       exit 0 only if EVERY rule catches its bad string. */
const vm = require('vm'), fs = require('fs'), path = require('path');
const CONTROL = process.argv.includes('--control');
const file = CONTROL ? path.join(__dirname, 'controls/bad-strings.js')
  : path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(__dirname, '../content.js'));
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx);
const all = [];
(function walk(o, p) {
  if (typeof o === 'string') return all.push([p, o]);
  if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k], p ? p + '.' + k : k));
})(ctx.window.TDTH, '');
/* keys that hold ids, file names and settings, not words she reads */
const NOT_WORDS = /(^|\.)(id|img|zone|src|layout|type|kind|key|icon|color|colour|tone|url|file)$|\.accept\.\d+$/; /* accept = typed answers it will take, never shown */
const S = all.filter(([p, v]) => !NOT_WORDS.test(p) && /[A-Za-z]/.test(v));
const words = v => v.trim().split(/\s+/);
const RULES = {
  'british-spelling': v => /\b\w*(color|center|favorit|organiz|realiz|recogniz|prioritiz|minimiz|maximiz|apologiz|analyz|gray)\w*\b/i.test(v),
  'no-jargon-or-pedagogy': v => /\b(click here|submit|input|modal|toggle|lorem|TODO|undefined|NaN|null|pedagog\w*|scaffold\w*|metacogn\w*|success criteria|learning objective|WALT|WILF|simply|obviously)\b/i.test(v),
  'degrees-as-°C': v => /(degrees? C\b|\boC\b|°\s+C)/.test(v),
  'not-yet-never-wrong': v => /\b(Wrong|Incorrect|Failed)\b/.test(v),
  'sentence-max-25-words': v => v.split(/(?<=[.?!])\s+/).some(x => words(x).length > 25),
  'long-lines-end-as-sentences': v => words(v).length > 10 && !/[.?!:)…"’]$/.test(v.trim()),
  'no-bare-number': v => /^\s*[\d{}]*\d[\d{}]*\s*(\/\s*[\d{}]+)?\s*$|^\s*\{\w+\}\s*(\/\s*\{\w+\})?\s*$/.test(v),
  'no-double-space': v => /  /.test(v),
  'instructions-start-with-a-verb': (v, p) => /(^|\.)do$/.test(p) && /^(The|A|An|This|These|Your|You|Some|For|In|It|There|Here|We|Our|If|When|Now)\b/.test(v.trim()),
  'no-word-over-17-letters': v => v.split(/[^A-Za-z]+/).some(w => w.length > 17)
};
const hits = {};
for (const r in RULES) hits[r] = S.filter(([p, v]) => RULES[r](v, p));
console.log(S.length + ' strings checked from ' + path.basename(file));
let bad = 0;
for (const r in RULES) {
  console.log((hits[r].length ? '  FAIL ' : '  ok   ') + r + (hits[r].length ? ' (' + hits[r].length + ')' : ''));
  hits[r].slice(0, 5).forEach(([p, v]) => console.log('       ' + p + ' :: ' + v.slice(0, 90)));
  if (hits[r].length) bad++;
}
if (CONTROL) {
  const missed = Object.keys(RULES).filter(r => !hits[r].length);
  console.log(missed.length ? 'CONTROL BROKEN: these rules caught nothing: ' + missed.join(', ') : 'CONTROL OK: every rule caught its bad string.');
  process.exit(missed.length ? 1 : 0);
}
console.log(bad ? 'TEXT FAILED (' + bad + ' rules)' : 'TEXT PASSED');
process.exit(bad ? 1 : 0);
