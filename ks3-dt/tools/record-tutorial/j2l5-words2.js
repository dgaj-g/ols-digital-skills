/* J2 L5 V2 · gate 13 words (spec V2 §15; DFM 292/294). Over every pupil string the hour and lesson ship:
   hour/strings.js, the quoted pupil lines in hour/chapters.js and hour/free.js, the lesson JSON (chunk configs, exit keys;
   not teacherBrief or _provenance) and recap r-j2-501…506.
   Rules: at most 14 words a sentence (code lines skipped; a sentence the design wrote word for word in the spec or the
   prototype is the designer's and passes), never "the ask", never the layout words "pushed in" or "spiral";
   the lesson's config.strings equals the shipped strings.js; b14 is "The Growing Square".
   Controls (must FAIL): a planted 15-word sentence, a planted "pushed in", a mutated config.strings.
   usage: node ks3-dt/tools/record-tutorial/j2l5-words2.js */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..'), HOUR = path.join(ROOT, 'ks3-dt/platform/assets/search/hour');
const SRC = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/content-src';
const S = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(HOUR, 'strings.js'), 'utf8'))(w); return w.SearchStrings; })();
const L = JSON.parse(fs.readFileSync(path.join(SRC, 'j2/lessons/j2-05.json'), 'utf8'));
const DESIGN = ['J2_L5_SPEC_V2.md', 'prototype/proto/hour.js'].map(f => fs.readFileSync('/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/J2_L5_REDESIGN/' + f, 'utf8').replace(/\*\*|`/g, '')).join('\n');
const R = JSON.parse(fs.readFileSync(path.join(SRC, 'j2/recap-pool.json'), 'utf8'));
function leaves(o, out, at) { if (typeof o === 'string' && /^\["/.test(o)) { try { o = JSON.parse(o); } catch (e) {} }
  if (typeof o === 'string') out.push([at, o]); else if (o && typeof o === 'object') for (const k of Object.keys(o)) leaves(o[k], out, at + '.' + k); return out; }
function lits(file) { const s = fs.readFileSync(path.join(HOUR, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); const out = []; s.replace(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g, (m, t1, t2) => { let t = (t1 != null ? t1 : t2).replace(/\\(['"])/g, '$1').replace(/<[^>]+>/g, ' '); if (/[A-Za-z]+ [A-Za-z]+ [A-Za-z]+/.test(t)) out.push([file, t]); return m; }); return out; }
function texts(S, L, R) {
  const recap = (Array.isArray(R) ? R : R.items).filter(x => /^r-j2-50[1-6]$/.test(x.id));
  return [].concat(leaves(S, [], 'strings'), lits('chapters.js'), lits('free.js'), leaves(L.chunks, [], 'chunks'), leaves(L.keys, [], 'keys'), leaves(recap, [], 'recap'));
}
function problems(S, L, R) {
  const bad = [];
  for (const [at, t] of texts(S, L, R)) {
    for (const sen of t.split(/(?<=[.?!])\s+|\n+/)) {
      if (/[()=:]|\bfor i\b|^\s*$/.test(sen) && /\(|:$/.test(sen)) continue;   /* a code line */
      const n = (sen.match(/[A-Za-z0-9']+/g) || []).length;
      if (n > 14 && !(sen.length > 30 && DESIGN.indexOf(sen.replace(/^\)\s*/, '')) !== -1)) bad.push(at + ': ' + n + ' words · ' + sen.slice(0, 90));
    }
    if (/\bthe ask\b/i.test(t)) bad.push(at + ': "the ask"');
    if (/\bpushed[- ]in\b|\bspiral\b/i.test(t)) bad.push(at + ': layout word · ' + t.slice(0, 80));
  }
  if (JSON.stringify(L.chunks[0].config.strings) !== JSON.stringify(S)) bad.push('config.strings is not the shipped strings.js');
  if (L.chunks[0].config.badges.b14.name !== 'The Growing Square') bad.push('b14 is not The Growing Square');
  return bad;
}
let fails = 0; const must = (ok, m) => { console.log('  ' + (ok ? 'PASS' : 'FAIL') + ' ' + m); if (!ok) fails++; };
const real = problems(S, L, R); real.slice(0, 30).forEach(b => console.log('    · ' + b));
must(!real.length, 'every pupil sentence is 14 words or fewer, no layout words, config.strings mirrors strings.js (' + texts(S, L, R).length + ' strings)');
const c = o => JSON.parse(JSON.stringify(o));
let L1 = c(L); L1.chunks[1].config.intro = 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen.';
must(problems(S, L1, R).length > 0, 'CONTROL a planted 15-word sentence fails');
L1 = c(L); L1.chunks[1].config.intro = 'The lines pushed in repeat.';
must(problems(S, L1, R).length > 0, 'CONTROL a planted "pushed in" fails');
L1 = c(L); L1.chunks[0].config.strings.btn.next = 'Onward';
must(problems(S, L1, R).length > 0, 'CONTROL a mutated config.strings fails');
console.log('\nj2l5-words2: ' + (fails ? 'FAIL · ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
