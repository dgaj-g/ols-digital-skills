#!/usr/bin/env node
/* tools/pack-content.js — the private sources (A2SSD_SRC) → what the page may hold and what only the server may hold (D2, D54).
 *   platform/content.js      PUBLIC. window.A2CONTENT: papers without models, mark schemes or notes; each part's mark-point
 *                            labels (D55 wording) and marks; the lessons; the clusters; the practice questions' wording and
 *                            tables; the seeds; the strings; the build stamp. No model, no test, no expected rows.
 *   <deploy>/private.js      PRIVATE, never committed. The examiner's answers (paper models with the CLEAN overrides) and the
 *                            practice questions' worked answers, for apiAnswer after a first mark; and the expected rows of
 *                            every paper SELECT, one result per day from the pack date to 2027-12-31, so the Result card compares
 *                            the pupil's rows with the model's on the practice database as it stands on the pupil's day.
 * Expected rows: the seeds are dated relative to today ('now'). For each day, every seed is re-dated to that day (as G2 does)
 * and the cleaned model runs through the T-SQL shim on node:sqlite. A date cell is stored as a day offset from that day, so a
 * result that only moves with the calendar is one variant; days are run-length coded as [first day index, variant index].
 * A leak audit prints every literal in a public label that the question, the design or the stub does not already show. */
const fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { execFileSync } = require('child_process');
const SRC = process.env.A2SSD_SRC || '/Users/damiengartland/Desktop/Claude Work/A2 SSD Platform/src';
const DEPLOY = process.env.A2SSD_DEPLOY || path.join(SRC, '..', 'deploy');
const ROOT = path.join(__dirname, '..');
const MP = require(path.join(SRC, 'judge/markpoints.js'));
const TP = require(path.join(SRC, 'judge/twinpoints.js'));
const { model } = require(path.join(SRC, 'judge/models.js'));
const { convert } = require(path.join(ROOT, 'tools/tsql2sqlite.js'));
const papers = require(path.join(SRC, 'content/papers.json')).papers;
const sets = require(path.join(SRC, 'content/twins.json'));
const fable = require(path.join(SRC, 'content/twins-fable.json')).twins;
const clusters = require(path.join(SRC, 'content/clusters.json'));
const lessons = require(path.join(SRC, 'content/lessons.json'));
const strings = require(path.join(ROOT, 'platform/strings.json'));
const END = process.env.A2SSD_END || '2027-12-31';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
const dayMs = 86400000;
const toDay = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const warn = [];

// D55: a rows label that names the answer is shown without it before marking
const CONSTRAINT = /^([\w ]+): (?:PRIMARY KEY|FOREIGN KEY|CHECK|UNIQUE|NOT NULL|DEFAULT)\b[^,]*, with the reason$/;
const publicLabel = (l) => (CONSTRAINT.test(l) ? l.replace(CONSTRAINT, '$1: the constraint, with the reason') : l);
const rowsOf = (points) => points.map((p) => p.label.split(':')[0].trim());

// ---- public papers
const lessonFor = clusters.lessonFor || {};
const clusterOf = {};
for (const [c, v] of Object.entries(clusters.clusters)) { v.parts.forEach((p) => (clusterOf[p] = c)); v.twins.forEach((t) => (clusterOf[t] = c)); }
const pubPapers = papers.map((p) => ({
  id: p.id, year: p.year, title: p.title, marks: p.marks, scenario: p.scenario,
  tables: p.tables.map((t) => ({ name: t.name, cols: t.cols.map((c) => ({ f: c.f, t: c.t })), pk: t.pk || [], fk: t.fk || [] })),
  assumed: (p.assumed || []).map((t) => ({ name: t.name, cols: (t.cols || []).map((c) => ({ f: c.f, t: c.t })), pk: t.pk || [], fk: t.fk || [] })),
  sampleRows: p.sampleRows || [],
  parts: p.parts.map((q) => {
    const m = MP.parts[q.id];
    if (!m) throw new Error('no mark points for ' + q.id);
    const out = { id: q.id, label: q.label, marks: q.marks, type: m.type, kind: m.kind, skills: q.skills || [], ask: q.ask, stub: q.stub || null, lead: q.lead || null,
      habits: m.habits || [], points: m.points.map((x) => ({ of: x.of, label: publicLabel(x.label) })), cluster: clusterOf[q.id] || null, lesson: lessonFor[q.id] || null };
    if (m.type === 'rows') out.rows = rowsOf(m.points);
    // D18: the DATA tab never shows what the part asks the pupil to make
    const made = m.type === 'sql' ? String(q.stub || '') + '\n' + String(model(q.id) || '') : '';
    const alt = /ALTER\s+TABLE\s+(\w+)\s+ADD\s+(?:COLUMN\s+)?(\w+)/i.exec(made), cre = /CREATE\s+TABLE\s+(\w+)/i.exec(made);
    if (alt) out.hides = { table: alt[1].toUpperCase(), col: alt[2] };
    else if (cre) out.hides = { table: cre[1].toUpperCase() };
    if (m.marks !== q.marks) warn.push(q.id + ': papers.json marks ' + q.marks + ' but mark points total ' + m.marks);
    return out;
  }),
}));

// ---- practice questions (public wording only: never ms, walkthrough, ms_marks, blanks, marker, approach)
const setTables = {};
for (const s of sets) setTables[s.n] = { title: s.title, tables: s.tables.map((t) => ({ name: t[0], cols: t[1].map((c) => ({ f: c[0], t: c[1] })), pk: t[2] || [], fk: t[3] || [] })) };
const tidy = (tables) => (tables ? tables.map((t) => ({ name: t[0], cols: t[1].map((c) => ({ f: c[0], t: c[1] })), pk: t[2] || [], fk: t[3] || [] })) : null);
const twins = {};
for (const id of TP.ids) {
  const tp = TP.twins[id];
  let src, set;
  if (/^B-/.test(id)) { set = +id[2]; src = sets.find((s) => s.n === set).questions.find((q) => 'B-' + set + q.label === id); }
  else { src = fable.find((t) => t.id === id); set = src.set; }
  if (!src) throw new Error('no wording for ' + id);
  twins[id] = { id, set, marks: tp.marks, type: tp.type, kind: tp.kind, cluster: clusterOf[id] || null, intro: src.intro || '', bullets: src.bullets || [], prompt: src.prompt || '',
    stub: src.stub || null, tables: tidy(src.tables), rows: tp.type === 'rows' ? src.rows || rowsOf(tp.points) : null };
}

// ---- private: the examiner's answers and the worked answers
const fillCloze = (stub, blanks) => stub.replace(/⟦(\d)⟧(?:\s*\[\d\])?/g, (m, n) => blanks[n - 1]).replace(/\s*\[\d\]$/gm, '');
const answers = {};
for (const p of papers) for (const q of p.parts) {
  const m = MP.parts[q.id], mo = model(q.id);
  let text;
  if (m.type === 'cloze') text = fillCloze(q.stub, mo);
  else if (m.type === 'rows') text = mo.map((r, i) => rowsOf(m.points)[i] + ': ' + r.name + '. ' + r.reason).join('\n');
  else text = String(mo);
  answers[q.id] = { text, sql: m.type === 'sql' || m.type === 'cloze' };
}
const worked = {};
for (const id of TP.ids) {
  const tp = TP.twins[id];
  let ms, walk;
  if (/^B-/.test(id)) { const set = +id[2]; const q = sets.find((s) => s.n === set).questions.find((x) => 'B-' + set + x.label === id); ms = q.ms; walk = q.walkthrough || []; }
  else { const t = fable.find((x) => x.id === id); ms = t.ms; walk = t.walkthrough || []; }
  worked[id] = { text: String(ms), sql: tp.type === 'sql' || tp.type === 'cloze', walk: Array.isArray(walk) ? walk : [String(walk)] };
}

// ---- private: expected rows per day for every paper SELECT
const seeds = {};
for (const f of fs.readdirSync(path.join(ROOT, 'seeds')).filter((x) => /\.sql$/.test(x)).sort()) seeds[f.replace(/\.sql$/, '')] = fs.readFileSync(path.join(ROOT, 'seeds', f), 'utf8');
const start = new Date(Date.now() - 3 * dayMs);
const startIso = iso(new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())));
const nDays = Math.round((toDay(END) - toDay(startIso)) / dayMs) + 1;
const DATE = /^(\d{4}-\d{2}-\d{2})(.*)$/;
const expected = {};
const selects = [];
for (const p of papers) for (const q of p.parts) if (MP.parts[q.id].type === 'sql' && MP.parts[q.id].kind === 'select') selects.push({ year: p.year, id: q.id, sql: convert(model(q.id)).trim().replace(/;\s*$/, '') });
const byYear = {};
selects.forEach((s) => (byYear[s.year] = byYear[s.year] || []).push(s));
for (const s of selects) expected[s.id] = { start: startIso, cols: null, ordered: /\border\s+by\b/i.test(s.sql), dated: [], variants: [], runs: [] };
const raw = {};
for (let i = 0; i < nDays; i++) {
  const day = iso(new Date(toDay(startIso) + i * dayMs));
  for (const [year, list] of Object.entries(byYear)) {
    const db = new DatabaseSync(':memory:');
    db.exec(seeds[year].replace(/'now'/g, "'" + day + "'"));
    for (const s of list) {
      try {
        const st = db.prepare(s.sql.replace(/'now'/g, "'" + day + "'"));
        st.setReturnArrays(true);
        if (!expected[s.id].cols) expected[s.id].cols = st.columns().map((c) => c.name);
        (raw[s.id] = raw[s.id] || []).push(st.all());
      } catch (err) { throw new Error(s.id + ' on ' + day + ': ' + err.message); }
    }
    db.close();
  }
}
// a date column is stored as a day offset only when that makes fewer distinct values over the range (a seed's fixed paper dates stay as they are)
const tokCell = (c, d0) => { const m = DATE.exec(c); const o = Math.round((toDay(m[1]) - d0) / dayMs); return m[2] ? { d: o, r: m[2] } : { d: o }; };
for (const [id, days] of Object.entries(raw)) {
  const e = expected[id];
  e.dated = e.cols.map((c, j) => {
    const plain = new Set(), tok = new Set();
    let any = false;
    days.forEach((rows, i) => rows.forEach((r) => { const v = r[j]; if (typeof v === 'string' && DATE.test(v)) { any = true; plain.add(v); tok.add(JSON.stringify(tokCell(v, toDay(startIso) + i * dayMs))); } }));
    return any && tok.size < plain.size;
  });
  const keys = {};
  days.forEach((rows, i) => {
    const d0 = toDay(startIso) + i * dayMs;
    const enc = rows.map((r) => r.map((c, j) => (e.dated[j] && typeof c === 'string' && DATE.test(c) ? tokCell(c, d0) : c)));
    const k = JSON.stringify(enc);
    if (!(k in keys)) { keys[k] = e.variants.length; e.variants.push(enc); }
    if (!e.runs.length || e.runs[e.runs.length - 1][1] !== keys[k]) e.runs.push([i, keys[k]]);
  });
}
const report = [];
for (const [id, e] of Object.entries(expected)) {
  report.push(id + ' ' + e.variants.length + ' variant(s), ' + e.runs.length + ' run(s), ' + e.variants.map((v) => v.length).join('/') + ' rows' + (e.ordered ? ', ordered' : ''));
  if (e.variants.some((v) => !v.length)) warn.push(id + ': some day gives no rows');
}

// ---- leak audit: a literal in a public label must already be in what the pupil sees
for (const p of pubPapers) for (const q of p.parts) {
  const seen = [p.scenario, q.ask, q.lead, q.stub, JSON.stringify(p.tables), JSON.stringify(p.assumed)].join(' ').toLowerCase();
  for (const x of q.points) {
    const lits = (x.label.match(/'[^']*'|\b\d+(?:\.\d+)?\b/g) || []).map((s) => s.replace(/'/g, '').toLowerCase())
      .filter((s, i) => s && !(i === 0 && /^blank \d/i.test(x.label)));
    for (const l of lits) if (!seen.includes(l)) warn.push('label literal not in the question: ' + q.id + ' "' + x.label + '" → ' + l);
  }
}

// ---- build stamp
let git = 'dev';
try { git = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch (e) { /* not a checkout */ }
const pub = { papers: pubPapers, twins, sets: setTables, lessons: Object.fromEntries(Object.entries(lessons).filter(([k]) => k !== 'note')), clusters: { clusters: clusters.clusters, lessonFor, order: clusters.order },
  seeds, strings };
const hash = require('crypto').createHash('sha256').update(JSON.stringify(pub)).digest('hex').slice(0, 10);
const BUILD = hash;
pub.BUILD = BUILD;
fs.writeFileSync(path.join(ROOT, 'platform/content.js'), '/* Built by tools/pack-content.js — do not edit. Public: no models, tests or expected rows (D54). */\nwindow.A2CONTENT = ' + JSON.stringify(pub) + ';\n');
fs.mkdirSync(DEPLOY, { recursive: true });
const priv = { BUILD, answers, worked, expected };
fs.writeFileSync(path.join(DEPLOY, 'private.js'), '/* PRIVATE — built by a2-ssd/tools/pack-content.js; never commit. */\nvar A2PRIVATE = ' + JSON.stringify(priv) + ';\n', { mode: 0o600 });
fs.writeFileSync(path.join(DEPLOY, 'pack-report.txt'), report.join('\n') + '\n' + (warn.length ? 'WARN\n  ' + warn.join('\n  ') + '\n' : ''));
const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
console.log('pack-content: BUILD ' + BUILD + ' (' + git + ') · content.js ' + kb(path.join(ROOT, 'platform/content.js')) + ' · private.js ' + kb(path.join(DEPLOY, 'private.js')) + ' · ' + selects.length + ' SELECT parts × ' + nDays + ' days');
console.log(report.join('\n'));
if (warn.length) console.log('WARN\n  ' + warn.join('\n  '));
