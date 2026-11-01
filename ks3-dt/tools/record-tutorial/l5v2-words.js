/* J3 L5 V2 · A1 words (+ the string half of A16). node tools/record-tutorial/l5v2-words.js
   Every string of strings.js as rendered (sample slots): a screen line (one sentence) ≤ 12 words, an instruction (job.,
   help., w., swap., look., tour.) ≤ 14; one string's prose < 40 words (whole pages: A12 walker); full sentences except the labels; a number never without its thing;
   strings.js equals spec §8 byte for byte (wraps aside) both ways; the exit chunk of j3-05.json equals spec §9.
   Controls: a planted 15-word line, and "You had time for 9.", must each turn this red. */
const fs = require('fs'), path = require('path');
const L = require('./l5v2-lib.js');
const SPEC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/J3_L5_REDESIGN/J3_L5_SPEC_V2.md');
const LESSON = path.join(__dirname, '..', '..', 'content', 'j3', 'lessons', 'j3-05.json');
const LABEL = /\.(btn|yes|no|without|begin|next|start|again|carry|more|close|title|opt\.\d|skip|back|extras|x\d|watch|fix)$|^(pill|step|card|fault|head)\.|^(coins|run)$|^run\./;
const INSTR = /^(job|help|w|swap|look|tour)\./;
const SAMPLE = { n: 12, c: 3, d: 5, name: 'fog_horn', text: 'lamp_on()' };
const THING = /^(line|lines|fault|faults|of|Fault|beam|blasts|coins|Coins:|radio|got|bearing|channel|number|to|spaces|seconds|minutes|questions)$/i;
const AFTER = /^(of|faults?|lines?|blasts|coins|spaces|seconds|minutes|questions|blocks?)\b/i;
const CODEWORD = /^(def|print|return|str|bearing|lamp_on|fog_horn|None|\{name\}|\{text\}|b\b)/;
const norm = s => String(s).replace(/\s+/g, ' ').trim();
const words = s => norm(s).split(' ').filter(w => /[A-Za-z0-9{]/.test(w));
function check(S) {
  const fails = [], page = {};
  for (const k of Object.keys(S)) {
    const raw = S[k], txt = raw.replace(/\{(\w+)\}/g, (m, v) => SAMPLE[v] != null ? SAMPLE[v] : m);
    const lab = LABEL.test(k), max = INSTR.test(k) ? 14 : 12;
    if (!lab) {
      if (!/[.!?]['’"”)]?$/.test(raw.trim())) fails.push(k + ': not a full sentence: ' + raw);
      if (!/^[A-Z“"'‘(]/.test(raw.trim()) && !CODEWORD.test(raw.trim())) fails.push(k + ': does not start a sentence: ' + raw);
    }
    // each displayed line (strings may carry \n for two lines)
    raw.split('\n').forEach(line => line.split(/(?<=[.!?])\s+/).forEach(sen => { const n = words(sen).length; if (n > max) fails.push(k + ': ' + n + ' words in one screen line (max ' + max + '): ' + sen); }));
    if (words(txt).length >= 40) fails.push(k + ': ' + words(txt).length + ' words of prose on one screen');
    // a number never without its thing
    const tok = norm(raw).split(' ');
    tok.forEach((w, i) => {
      if (!/^(\{n\}|\{c\}|\{d\}|\d+)[.,:;!?)]?$/.test(w) || /^\d+\)$/.test(w)) return;
      if (/^\d$/.test(w) && /^step\./.test(k)) return;                                 // the step strip: 1 Run … 4 Name
      if (/^(opt|t3\.opt)/.test(k.split('.').slice(1).join('.')) || /\.opt\.\d$/.test(k)) return; // an answer option that IS a number
      const prev = (tok[i - 1] || '').replace(/[^\w:{}]/g, ''), next = tok[i + 1] || '';
      const end = /[.!?]$/.test(w);
      if (THING.test(prev) || /^(is|return|put|hands)$/.test(prev) || (!end && AFTER.test(next)) || /[=+(]/.test(tok[i - 1] || '')) return;
      fails.push(k + ': a number without its thing ("' + (tok[i - 1] || '') + ' ' + w + '"): ' + raw);
    });
  }
  return fails;
}
function spec(S) {
  const fails = [], md = fs.readFileSync(SPEC, 'utf8');
  const s8 = norm(md.slice(md.indexOf('## 8.'), md.indexOf('## 9.')));
  for (const k of Object.keys(S)) {
    const at = s8.indexOf('- `' + k + '` "');
    if (at < 0) { fails.push('§8 lacks ' + k); continue; }
    const want = '- `' + k + '` "' + norm(S[k]) + '"';
    if (s8.slice(at, at + want.length) !== want) fails.push('§8 differs at ' + k + ': ' + s8.slice(at, at + want.length + 10));
  }
  (s8.match(/- `[^`]+` "/g) || []).forEach(m => { const k = m.slice(3, m.indexOf('`', 3)); if (!(k in S)) fails.push('strings.js lacks §8 key ' + k); });
  // §9 against the lesson's exit chunk
  const s9 = md.slice(md.indexOf('## 9.'), md.indexOf('## 10.'));
  const qs = s9.split(/\n(?=\d\. ")/).slice(1).map(b => (norm(b).match(/"([^"]*)"/g) || []).map(x => x.slice(1, -1)));
  let lesson = null; try { lesson = JSON.parse(fs.readFileSync(LESSON, 'utf8')); } catch (e) {}
  const ex = lesson && lesson.chunks.find(c => c.engine === 'exitcheck');
  if (!ex) fails.push('j3-05.json has no exitcheck chunk');
  else qs.forEach((q, i) => {
    const it = ex.config.items[i]; if (!it) { fails.push('exit question ' + (i + 1) + ' missing'); return; }
    if (norm(it.stem) !== q[0]) fails.push('exit ' + (i + 1) + ' stem differs: ' + it.stem);
    const a = it.options.map(norm).sort().join('|'), b = q.slice(1).sort().join('|');
    if (a !== b) fails.push('exit ' + (i + 1) + ' options differ: ' + it.options.join(' / '));
  });
  if (qs.length !== 5) fails.push('§9 parsed ' + qs.length + ' questions, not 5');
  return fails;
}
const real = check(L.S).concat(spec(L.S));
const c1 = check(Object.assign({}, L.S, { 'job.planted': 'You are the one who reads the red and then you press the RUN button.' }));
const c2 = check(Object.assign({}, L.S, { 'home.planted': 'You had time for 9.' }));
const control = c1.length && c2.length ? [c1[0] + ' · ' + c2[0]] : [];
L.report('A1 words', real, control);
