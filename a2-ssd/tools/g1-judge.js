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
 * 8. No practice question writes the table its part's lesson builds, in the same database (F6); every part names a lesson that exists.
 * 9. A hint that names a table never puts a design field in the wrong table (F41).
 * 10. The lessons (tools/g1-lessons.js): built from their sources; every grid holds on ten dates; every step statement runs;
 *     marks lines sum to the part's marks; quick checks name real exam tables and fields; highlights name lesson-table fields;
 *     no token left unfilled; the detector — each lesson's finished statement scores at most half on every part and practice
 *     question (D47 exceptions named); the parts that lean on an earlier part print its lead (F36).
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
const EXEMPT = require(path.join(SRC, 'judge/exempt.json')); // the reasons quote the schemes, so they stay private (D2)
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

// 8. no practice question re-serves its lesson's worked table (F6), and every part names a lesson that exists
{
  const C = require(path.join(SRC, 'content/clusters.json'));
  const L = require(path.join(SRC, 'content/lessons.json'));
  const LV = require(path.join(__dirname, '..', 'platform', 'lessonview.js'));
  const P8 = {}; for (const p of require(path.join(SRC, 'content/papers.json')).papers) for (const q of p.parts || []) P8[q.id] = q;
  const TF8 = require(path.join(SRC, 'content/twins-fable.json')).twins;
  const twinSet = (tid) => { const b = /^B-(\d+)/.exec(tid); if (b) return +b[1]; const t = TF8.find((x) => x.id === tid) || {}; return t.tables ? null : t.set; };
  const target = (sql) => { const m = /\b(?:create\s+table|insert\s+into|update|alter\s+table)\s+\[?(\w+)/i.exec(sql || ''); return m ? m[1].toLowerCase() : null; };
  const lessonTable = (name, pid) => { const l = L[name]; if (!l || l.answer === 'text') return null; const v = LV.view(l, P8[pid], new Date(2026, 8, 27)); const w = v.steps.find((s) => s.whole) || {}; return target(w.sql); };
  for (const [cname, c] of Object.entries(C.clusters)) {
    for (const pid of c.parts) {
      checks++;
      const ln = C.lessonFor[pid];
      if (!ln || !L[ln]) { fail('lesson missing', cname, pid + ' → ' + (ln || 'none')); continue; }
      const lt = lessonTable(ln, pid); if (!lt) continue;
      // the same table in the same database: a B practice question is on set n; a T one on its set, or on tables of its own
      c.twins.forEach((tid) => { checks++; const tt = target(twinModels[tid]); if (tt && tt === lt && twinSet(tid) === L[ln].set && !/^select/i.test(twinModels[tid].trim())) fail('practice question re-serves the lesson table', tid, ln + ' builds ' + lt.toUpperCase()); });
    }
  }
}

// 9. a hint that names a table and a design field never puts the field in the wrong table (F41): every field a hint names
//    belongs to at least one table the same hint names
{
  const P = require(path.join(SRC, 'content/papers.json')).papers, TJ = require(path.join(SRC, 'content/twins.json')), TF = require(path.join(SRC, 'content/twins-fable.json')).twins;
  const design = {};   // part id -> [[TABLE, [field...]]]
  for (const p of P) for (const q of p.parts || []) design[q.id] = (p.tables || []).map((t) => [t.name, t.cols.map((c) => c.f)]);
  for (const b of TJ) for (const q of b.questions || []) design['B-' + b.n + q.label] = b.tables.map((t) => [t[0], t[1].map((f) => f[0])]);
  for (const t of TF) design[t.id] = (t.tables || (TJ.find((x) => x.n === t.set) || { tables: [] }).tables).map((x) => [x[0], x[1].map((f) => f[0])]);   // no tables of its own: its set's
  for (const [parts, ids] of [[M.parts, M.ids], [T.twins, T.ids]]) ids.forEach((id) => {
    const d = design[id]; if (!d) return;
    (parts[id].points || []).forEach((pt, i) => {
      checks++;
      // only the sentences that say where a field lives ("JOB gives ...", "The name lives in GUEST"); a join line names both ends
      const h = (pt.hint || '').split(/(?<=\.)\s+/).filter((x) => /\b(gives|holds|lives in|is in|comes from)\b/.test(x)).join(' ');
      const named = d.filter(([t]) => new RegExp('\\b' + t + '\\b').test(h)).map(([t]) => t);
      if (!named.length) return;
      const fields = [...new Set(d.flatMap(([, fs]) => fs))].filter((f) => new RegExp('\\b' + f + '\\b').test(h) && !d.some(([t]) => t === f));
      fields.forEach((f) => { if (!d.some(([t, fs]) => named.includes(t) && fs.includes(f))) fail('hint puts a field in the wrong table', id, 'P' + (i + 1) + ': ' + f + ' is not in ' + named.join('/') + ' — ' + h); });
    });
  });
}

// 10. the lessons
{
  const gate = require('./g1-lessons.js');
  const r = gate({ SRC, J, M, T }); checks += r.checks; r.fails.forEach((f) => fail(...f));
  // controls: each planted fault must be caught
  const step = (l, id) => l.steps.find((s) => s.id === id);
  const CONTROLS = [
    ['grid does not hold', 'PROSE-DESIGN', (L) => { step(L['PROSE-DESIGN'], 'link').grid.rows[0][2] = 55; }],
    ['marks lines do not add up to the part', 'CREATE', (L) => { step(L.CREATE, 'whole').marks.pop(); }],
    ['quick check answer is not in the exam design', 'AGG-WEEK', (L) => { L['AGG-WEEK'].checks['2025-b'].where.answer = 'BOOKING.LessonDate'; }],
    ['step has no quick check', 'AGG-WEEK', (L) => { delete L['AGG-WEEK'].checks['2025-b'].group; }],
    ['choose check needs exactly one right option', 'AGG-WEEK', (L) => { L['AGG-WEEK'].checks['2025-b'].order.opts[1].ok = true; }],
    ['highlight names a field that is not there', 'PROSE-KEYS', (L) => { step(L['PROSE-KEYS'], 'pk').hl.f = ['CHILD.ChildNo']; }],
    ['token or tag left unfilled', 'JOIN-TODAY', (L) => { L['JOIN-TODAY'].title += ' ⟪x|y⟫'; }],
    ['step statement fails on the lesson database', 'UPDATE', (L) => { L.UPDATE.src = String(L.UPDATE.src).replace(/SESSIONBOOKING/g, 'SESSIONBOOKINGS'); }],
    ['lesson hands over more than half', 'SELECT-JOIN', (L) => { L['SELECT-JOIN'].src = model('2016-2'); }],
    ['lesson hands over more than half', 'PROSE-DESIGN', (L) => { L['PROSE-DESIGN'].src = 'Because each site keeps a different reorder level for each item of stock, so it depends on the site as well as the stock.'; }],
  ];
  for (const [want, name, mutate] of CONTROLS) {
    checks++;
    const c = gate({ SRC, J, M, T, mutate, only: [name] });
    if (!c.fails.some((f) => f[0] === want)) fail('lesson-gate control not caught', name, want + (c.fails.length ? ' (caught instead: ' + c.fails[0][0] + ')' : ''));
  }
}

const report = fails.map(([w, id, d]) => w + '  ' + id + '  ' + d).join('\n');
const out = path.join(SRC, '..', 'gates');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'G1_REPORT.txt'), 'G1 ' + new Date().toISOString() + '  checks ' + checks + '  failures ' + fails.length + '\n\n' + report + '\n');
console.log((fails.length ? 'G1 FAIL' : 'G1 PASS') + ' — ' + checks + ' checks, ' + fails.length + ' failures' + (fails.length ? ' (detail: ' + path.join(out, 'G1_REPORT.txt') + ')' : ''));
process.exit(fails.length ? 1 : 0);
