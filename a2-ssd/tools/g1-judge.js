#!/usr/bin/env node
/* G1 — the judge gate. One line: PASS or FAIL.
 * 1. controls.js GREEN.
 * 2. Written-exam battery (SPEC §12 ruling 13): every SQL model (papers and twins) still scores FULL after each slip a pupil
 *    makes on paper — a comma, bracket or quote dropped or doubled, a value left unquoted, semicolons everywhere or nowhere,
 *    a line break at every space or none, prefixes stripped, AS added, INNER JOIN vs JOIN, case, spacing, [bracketed] names,
 *    a trailing GO, ASC added or dropped.
 * 3. Partial answers: an answer cut off after any line never scores less than a shorter cut (read as far as it goes).
 * 4. Must-cost: a missing WHERE, a wrong table, a missing ORDER BY, a changed INSERT number, a wrong CREATE name lose marks.
 * 5. No mark point's label or hint promises punctuation or syntax.
 * 6. The answer space: every reader control (gates/answerspace/answers-N.json, enumerated per mark point) agrees with the
 *    engine, or is settled by a recorded ruling in adjudicated.json. One disagreement fails the gate.
 * 7. Every wrong-kind line has one article, the right one (F24).
 * 8. No practice question writes the table its cluster's lesson builds (F6); every lesson a cluster names exists.
 * The answers live in the private src (D2): A2SSD_SRC points at it. The detail report goes there too, never into the repo. */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const SRC = process.env.A2SSD_SRC || '/Users/damiengartland/Desktop/Claude Work/A2 SSD Platform/src';
const J = require(path.join(SRC, 'judge/judge.js'));
const M = require(path.join(SRC, 'judge/markpoints.js'));
const T = require(path.join(SRC, 'judge/twinpoints.js'));
const { model } = require(path.join(SRC, 'judge/models.js'));
const { twinModels } = require(path.join(SRC, 'judge/twinmodels.js'));

const fails = [];
let checks = 0;
const fail = (what, id, detail) => fails.push([what, id, detail]);

// 1. controls
const ctl = spawnSync(process.execPath, [path.join(SRC, 'judge/controls.js')], { encoding: 'utf8' });
checks++;
if (ctl.status !== 0) fail('controls', '-', (ctl.stdout || '').split('\n').filter((l) => /^FAIL|^CRASH|CONTROLS/.test(l)).slice(0, 20).join(' / '));

// 2. the battery
const at = (t, ch) => { const r = []; for (let i = 0; i < t.length; i++) if (t[i] === ch) r.push(i); return r; };
function topSplit(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; }
function ascAdd(t) {
  const k = t.search(/order\s+by\s(?![\s\S]*order\s+by\s)/i);
  if (k < 0) return null;
  const head = t.slice(0, k), m = /^(order\s+by\s+)([\s\S]*?)(\s*;?\s*)$/i.exec(t.slice(k));
  return head + m[1] + topSplit(m[2]).map((x) => (/\b(asc|desc)\s*$/i.test(x) ? x : x.replace(/\s*$/, ' ASC'))).join(',') + m[3];
}
function variants(t) {
  const v = [];
  at(t, ',').forEach((i) => { v.push(['comma dropped @' + i, t.slice(0, i) + ' ' + t.slice(i + 1)]); v.push(['comma doubled @' + i, t.slice(0, i) + ',,' + t.slice(i + 1)]); });
  at(t, '(').forEach((i) => v.push(['( dropped @' + i, t.slice(0, i) + ' ' + t.slice(i + 1)]));
  at(t, ')').forEach((i) => v.push([') dropped @' + i, t.slice(0, i) + ' ' + t.slice(i + 1)]));
  { const st = []; for (let i = 0; i < t.length; i++) { if (t[i] === '(') st.push(i); else if (t[i] === ')' && st.length) { const o = st.pop(); v.push(['both brackets dropped @' + o, t.slice(0, o) + ' ' + t.slice(o + 1, i) + ' ' + t.slice(i + 1)]); } } }
  at(t, "'").forEach((i) => v.push(["' dropped @" + i, t.slice(0, i) + t.slice(i + 1)]));
  { const re = /'([^']*)'/g; let m; while ((m = re.exec(t))) v.push(['unquoted @' + m.index, t.slice(0, m.index) + m[1] + t.slice(m.index + m[0].length)]); }
  v.push(['semicolon every line', t.replace(/\n/g, ';\n')]);
  v.push(['no semicolons', t.replace(/;/g, '')]);
  v.push(['line break at every space', t.replace(/ +/g, '\n')]);
  v.push(['all on one line', t.replace(/\s*\n\s*/g, ' ')]);
  v.push(['commas at line ends dropped', t.replace(/,[ \t]*\n/g, '\n').replace(/\n([ \t]*),/g, '\n$1')]);
  v.push(['prefixes stripped', t.replace(/\b[A-Za-z_]\w*\.(?=[A-Za-z_])/g, '')]);
  v.push(['AS before aliases', t.replace(/\b(from|join)\s+(\w+)\s+(?!(?:on|where|join|inner|left|right|full|group|order|as)\b)([a-z]\w*)\b/gi, '$1 $2 AS $3')]);
  v.push(['INNER JOIN written JOIN', t.replace(/\binner\s+join\b/gi, 'JOIN')]);
  v.push(['JOIN written INNER JOIN', t.replace(/(?<!(?:inner|left|right|outer|full|cross)\s+)\bjoin\b/gi, 'INNER JOIN')]);
  v.push(['upper case', t.toUpperCase()]);
  v.push(['lower case', t.toLowerCase()]);
  v.push(['tabs and double spaces', t.replace(/ /g, '  ').replace(/\n/g, '\n\t')]);
  v.push(['[bracketed] names', t.replace(/\b(from|join|into|update|table|references)\s+(\w+)/gi, '$1 [$2]')]);
  v.push(['trailing GO', t + '\nGO']);
  const asc = ascAdd(t); if (asc) v.push(['ASC added', asc]);
  v.push(['ASC dropped', t.replace(/\s+asc\b/gi, '')]);
  return v.filter(([, x]) => x !== t || x === t + '\nGO');
}
function mustCost(t) {
  const v = [];
  const w = /\bwhere\b[\s\S]*?(?=\bgroup\s+by\b|\border\s+by\b|\bhaving\b|;|$)/i;
  if (/^\s*select\b/i.test(t) && w.test(t)) v.push(['WHERE removed', t.replace(w, ' ')]);
  if (/^\s*select\b/i.test(t) && /\border\s+by\b/i.test(t)) v.push(['ORDER BY removed', t.replace(/\border\s+by\b[\s\S]*$/i, '')]);
  if (/^\s*select\b/i.test(t)) v.push(['FROM table wrong', t.replace(/\bfrom\s+(\w+)/i, 'FROM zzztable')]);
  if (/^\s*insert\b/i.test(t)) v.push(['INSERT number changed', t.replace(/\bvalues\s*\(([^)]*?)\b(\d+)\b/i, (m, pre, n) => m.slice(0, m.length - n.length) + String(+n + 7))]);
  if (/^\s*create\s+table\b/i.test(t)) v.push(['CREATE name wrong', t.replace(/\bcreate\s+table\s+\[?(\w+)\]?/i, 'CREATE TABLE zzztable')]);
  return v;
}
// must-cost exemptions: only where the CCEA mark scheme itself gives no mark for the thing removed (never invent marks CCEA does not give)
const EXEMPT = {
  '2016-1:CREATE name wrong': 'the 2016 Q1 scheme gives no mark for the table name',
  '2016-2:FROM table wrong': 'the 2016 Q2 scheme has no FROM mark; its marks are the fields, the join and the WHERE values',
  '2019-c:ORDER BY removed': 'the 2019 (c) scheme gives its mark for GROUP BY or ORDER BY, and the model keeps GROUP BY',
};
const sqlModels = [];
M.ids.filter((id) => M.parts[id].type === 'sql').forEach((id) => sqlModels.push([id, M.parts[id], model(id)]));
Object.keys(twinModels).forEach((id) => sqlModels.push([id, T.twins[id], twinModels[id]]));
T.ids.filter((id) => T.twins[id].type === 'sql' && !(id in twinModels)).forEach((id) => fail('twin without a model', id, 'add it to judge/twinmodels.js'));

for (const [id, part, t] of sqlModels) {
  const full = part.marks;
  const score = (x) => { try { return J.judge(part, x).total; } catch (e) { return 'CRASH ' + e.message; } };
  checks++;
  const base = score(t);
  if (base !== full) { fail('model below full', id, base + '/' + full); continue; }
  for (const [name, x] of variants(t)) {
    checks++;
    const s = score(x);
    if (s !== full) {
      const lost = (() => { try { return J.judge(part, x).points.filter((p) => p.awarded < p.of).map((p) => p.label).join(' | '); } catch (e) { return ''; } })();
      fail('slip cost a mark: ' + name, id, s + '/' + full + ' lost: ' + lost + '\n      ' + x.replace(/\n/g, ' ⏎ ').slice(0, 400));
    }
  }
  // 3. read as far as it goes
  const lines = t.split('\n');
  let best = 0;
  for (let k = 1; k <= lines.length; k++) {
    checks++;
    const s = score(lines.slice(0, k).join('\n'));
    if (typeof s !== 'number') { fail('partial crashed', id, 'lines 1–' + k + ': ' + s); break; }
    if (s < best) fail('partial scored less than a shorter cut', id, 'lines 1–' + k + ': ' + s + ' < ' + best);
    best = Math.max(best, s);
  }
  // 4. must cost
  for (const [name, x] of mustCost(t)) { if (EXEMPT[id + ':' + name]) continue; checks++; const s = score(x); if (!(s < full)) fail('must cost but did not: ' + name, id, s + '/' + full); }
}

// 5. no mark point promises punctuation
const PUNCT = /bracket|semicolon|comma|quot|punctuat|syntax|capital|apostroph/i;
for (const [parts, ids] of [[M.parts, M.ids], [T.twins, T.ids]]) {
  ids.forEach((id) => (parts[id].points || []).forEach((p, i) => { checks++; if (PUNCT.test(p.label) || PUNCT.test(p.hint || '')) fail('mark point promises punctuation', id, 'P' + (i + 1) + ': ' + p.label + ' / ' + p.hint); }));
}

// 6. the answer space
{
  const run = path.join(SRC, '..', 'gates', 'answerspace', 'run.js');
  const r = spawnSync(process.execPath, [run], { encoding: 'utf8' });
  const lines = (r.stdout || '').split('\n').filter((l) => /^answers-\d+:/.test(l));
  if (!lines.length) fail('answer space did not run', '-', (r.stderr || '').slice(0, 300));
  for (const l of lines) {
    checks += +(l.match(/(\d+) controls/) || [0, 0])[1];
    const d = +(l.match(/disagree (\d+)/) || [0, 1])[1], b = +(l.match(/broken (\d+)/) || [0, 1])[1];
    if (d || b) fail('answer space disagrees', l.split(':')[0], l);
  }
}

// 7. wrong-kind lines read as English (F24): "asks for a CREATE TABLE; this is an UPDATE" — one article, the right one
{
  const other = { select: 'UPDATE STOCK SET x = 1', create: 'SELECT a FROM b', insert: 'SELECT a FROM b', update: 'SELECT a FROM b', alter: 'SELECT a FROM b' };
  for (const [parts, ids] of [[M.parts, M.ids], [T.twins, T.ids]]) ids.forEach((id) => {
    const part = parts[id]; if (part.type !== 'sql' || !other[part.kind]) return;
    checks++;
    const v = J.judge(part, other[part.kind]); const n = v.kindNote || '';
    const bad = !n || /\b(a|an) (a|an)\b/i.test(n) || [...n.matchAll(/\b(a|an) ([A-Z]\w*)/g)].some((m) => (m[1] === 'an') !== /^[AEIOU]/.test(m[2]));
    if (bad) fail('wrong-kind line', id, n || '(no line)');
  });
}

// 8. no practice question re-serves its lesson's worked table (F6), and every lesson a cluster names exists
{
  const C = require(path.join(SRC, 'content/clusters.json'));
  const L = require(path.join(SRC, 'content/lessons.json'));
  const target = (sql) => { const m = /\b(?:create\s+table|insert\s+into|update|alter\s+table)\s+\[?(\w+)/i.exec(sql || ''); return m ? m[1].toLowerCase() : null; };
  const lessonTable = (name) => { const l = L[name]; if (!l) return null; const w = (l.steps || []).find((s) => s.whole) || {}; return target(w.sql); };
  for (const [cname, c] of Object.entries(C.clusters)) {
    const lessons = new Set([c.lesson, ...c.parts.map((p) => C.lessonFor[p]).filter(Boolean)]);
    for (const ln of lessons) {
      checks++;
      if (!L[ln]) { fail('lesson missing', cname, ln); continue; }
      const lt = lessonTable(ln); if (!lt) continue;
      c.twins.forEach((tid) => { checks++; const tt = target(twinModels[tid]); if (tt && tt === lt && !/^select/i.test(twinModels[tid].trim())) fail('practice question re-serves the lesson table', tid, ln + ' builds ' + lt.toUpperCase()); });
    }
  }
}

const report = fails.map(([w, id, d]) => w + '  ' + id + '  ' + d).join('\n');
const out = path.join(SRC, '..', 'gates');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'G1_REPORT.txt'), 'G1 ' + new Date().toISOString() + '  checks ' + checks + '  failures ' + fails.length + '\n\n' + report + '\n');
console.log((fails.length ? 'G1 FAIL' : 'G1 PASS') + ' — ' + checks + ' checks, ' + fails.length + ' failures' + (fails.length ? ' (detail: ' + path.join(out, 'G1_REPORT.txt') + ')' : ''));
process.exit(fails.length ? 1 : 0);
