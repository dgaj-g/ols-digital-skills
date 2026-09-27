#!/usr/bin/env node
/* G2 — the practice-database gate (SPEC §6). One line: PASS or FAIL.
 * 1. Every paper has seeds/<year>.sql. It loads without error. Every printed and assumed table exists with every printed
 *    field; a mark-scheme spelling (alias) exists too, so either name runs. Every table holds rows.
 * 2. Every SELECT model (the papers' and the SELECT twins' on their set's seeds/tinies-<set>.sql), through the T-SQL shim,
 *    runs without error and returns at least one row on EVERY anchor date. Seeds are dated relative to today, so the gate
 *    re-dates them: today, 1 Jan, 31 Jan, 1 Mar, 31 Mar, 30 Jun, 1 Sep, 31 Dec and 29 Feb 2028.
 * 3. Every other model (INSERT, UPDATE, ALTER, DELETE) runs on its seed without error on today's date, so the tables the
 *    DATA tab shows are the tables the pupil writes against. CREATE models run on the seed without the table they create.
 * Seeds are public (a2-ssd/seeds). Models are private: A2SSD_SRC. The detail report goes to the private gates/G2_REPORT.txt. */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const SRC = process.env.A2SSD_SRC || '/Users/damiengartland/Desktop/Claude Work/A2 SSD Platform/src';
const ROOT = path.join(__dirname, '..');
const J = require(path.join(SRC, 'judge/judge.js'));
const { model } = require(path.join(SRC, 'judge/models.js'));
const { twinModels } = require(path.join(SRC, 'judge/twinmodels.js'));
const { convert } = require(path.join(ROOT, 'tools/tsql2sqlite.js'));
const papersJson = require(path.join(SRC, 'content/papers.json'));
const papers = papersJson.papers || papersJson;
const twinSets = require(path.join(SRC, 'content/twins.json'));
const fable = require(path.join(SRC, 'content/twins-fable.json')).twins || [];

const ANCHORS = ['now', '2026-01-01', '2026-01-31', '2026-03-01', '2026-03-31', '2026-06-30', '2026-09-01', '2026-12-31', '2028-02-29'];
const fails = [];
const log = [];
let checks = 0;
const fail = (what, id, detail) => fails.push([what, id, detail]);

function sqlite(input) {
  const out = execFileSync('/usr/bin/sqlite3', ['-json', ':memory:'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  return out.trim() ? JSON.parse(out.trim().replace(/\]\s*\[/g, ',')) : [];
}
const redate = (s, a) => (a === 'now' ? s : s.replace(/'now'/g, "'" + a + "'"));
const kindOf = (sql) => { try { return J.normalise(sql).stmts[0].kind; } catch (e) { return '?'; } };
const seedOf = (file) => { const p = path.join(ROOT, 'seeds', file); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };

// what a seed holds: table/view name (upper) → [columns upper], rows
function inventory(seed) {
  const objs = sqlite(seed + "\nSELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%';");
  const inv = {};
  for (const o of objs) {
    const cols = sqlite(seed + "\nSELECT name FROM pragma_table_info('" + o.name + "');").map((c) => c.name.toUpperCase());
    const n = sqlite(seed + '\nSELECT count(*) AS n FROM "' + o.name + '";')[0].n;
    inv[o.name.toUpperCase()] = { cols, n, type: o.type };
  }
  return inv;
}

function checkTables(id, seed, tables) {
  let inv;
  checks++;
  try { inv = inventory(seed); } catch (e) { fail('seed-load', id, String(e.stderr || e.message).trim().split('\n')[0]); return; }
  for (const t of tables) {
    const names = [t.name, t.alias].filter(Boolean).map((n) => n.replace(/\s+/g, '').toUpperCase());
    for (const n of new Set(names)) {
      checks++;
      const got = inv[n];
      if (!got) { fail('seed-table', id, n + ' missing'); continue; }
      const miss = (t.cols || []).map((c) => c.toUpperCase()).filter((c) => !got.cols.includes(c));
      if (miss.length) fail('seed-field', id, n + ' lacks ' + miss.join(', '));
      if (!got.n) fail('seed-rows', id, n + ' is empty');
    }
  }
  log.push(id + ' tables: ' + Object.entries(inv).map(([k, v]) => k + '(' + v.n + (v.type === 'view' ? ' view' : '') + ')').join(' '));
}

function checkSelect(id, seed, sql) {
  const q = convert(sql).replace(/;?\s*$/, ';');
  for (const a of ANCHORS) {
    checks++;
    try {
      const rows = sqlite(redate(seed, a) + '\n' + redate(q, a));
      if (!rows.length) fail('select-empty', id, 'no rows on ' + a);
      else if (a === 'now') log.push(id + ' ' + rows.length + ' rows :: ' + Object.keys(rows[0]).join(', '));
    } catch (e) { fail('select-error', id, a + ': ' + String(e.stderr || e.message).trim().split('\n')[0] + ' :: ' + q.replace(/\s+/g, ' ')); break; }
  }
}

function checkWrite(id, seed, sql, kind) {
  // CREATE runs on the seed without the table it makes. The rest are compiled, not run (EXPLAIN): the names must resolve
  // against the tables the DATA tab shows; a paper's own dates and SQLite's ALTER limits are not the seed's business.
  checks++;
  const made = /create\s+table\s+\[?(\w+)/i.exec(sql);
  const added = /alter\s+table\s+\[?(\w+)\]?\s+add\s+(?!constraint\b|primary\b|foreign\b|check\b|unique\b)\[?(\w+)/i.exec(sql);
  const q = convert(sql);
  const body = made
    ? 'PRAGMA foreign_keys = OFF;\nDROP TABLE IF EXISTS ' + made[1] + ';\n' + q.replace(/;?\s*$/, ';')
    : q.split(/;\s*(?:\n|$)/).map((x) => x.trim()).filter(Boolean).map((x) => 'EXPLAIN ' + x + ';').join('\n');
  // a column the seed already holds (2024 keeps StartDate because 2024-d assumes it) is dropped first, so the ADD can run
  const has = added && seed && sqlite(seed + "\nSELECT count(*) AS n FROM pragma_table_info('" + added[1] + "') WHERE name = '" + added[2] + "' COLLATE NOCASE;")[0].n;
  const pre = has ? 'ALTER TABLE ' + added[1] + ' DROP COLUMN ' + added[2] + ';\n' : '';
  try { sqlite(seed + '\n' + pre + '.output /dev/null\n' + body); log.push(id + ' ' + kind + ' resolves'); }
  catch (e) { fail('write-error', id, String(e.stderr || e.message).trim().split('\n')[0] + ' :: ' + q.replace(/\s+/g, ' ').slice(0, 200)); }
}

// 0. the shim itself: what SQL Server would give, on the dates where SQLite differs
const SHIM = [
  ["DATEADD(month, -1, '2026-03-31')", '2026-02-28'], ["DATEADD(month, 1, '2026-01-31')", '2026-02-28'], ["DATEADD(mm, 1, '2028-01-30')", '2028-02-29'],
  ["DATEADD(yy, 1, '2028-02-29')", '2029-02-28'], ["DATEADD(month, 13, '2026-01-15')", '2027-02-15'], ["DATEADD(month, -12, '2026-12-31')", '2025-12-31'],
  ["DATEADD(day, -23, '2026-03-01')", '2026-02-06'], ["DATEADD(week, 2, '2026-12-25')", '2027-01-08'], ["DATEADD(dd, 1, CAST('2026-12-31' AS DATE))", '2027-01-01'],
  ["DATEDIFF(day, '2026-02-20', '2026-03-02')", 10], ["DATEDIFF(month, '2025-11-30', '2026-01-01')", 2], ["DATEDIFF(year, '2025-12-31', '2026-01-01')", 1],
  ["MONTH(DATEADD(month, -1, '2026-03-31'))", 2], ["YEAR('2026-09-27')", 2026], ["DAY(CONVERT(DATE, '2026-09-07'))", 7], ["DATEPART(month, '2026-09-27')", 9],
  ["LEN('Tinies')", 6], ["ISNULL(NULL, 'x')", 'x'], ["'A' + 'B'", 'AB'],
];
for (const [t, want] of SHIM) {
  checks++;
  try { const got = sqlite('SELECT ' + convert(t) + ' AS v;')[0].v; if (got !== want) fail('shim', t, 'gave ' + got + ', SQL Server gives ' + want); }
  catch (e) { fail('shim', t, String(e.stderr || e.message).trim().split('\n')[0]); }
}
const SHIM_SQL = [
  ['INSERT INTO A (x) VALUES (1)\nINSERT INTO A (x) VALUES (2)\nSELECT count(*) AS v FROM A', 2],
  ['INSERT INTO A (x)\nSELECT 5\nSELECT sum(x) AS v FROM A', 5],
  ['SELECT a.x FROM A a JOIN A b ON a.x = b.x ORDER BY x DESC', 1],
  ['WITH c AS (\nSELECT x FROM A\n)\nSELECT count(*) AS v FROM c', 1],
  ['SELECT x FROM A\nUNION\nSELECT x + 1 FROM A\nORDER BY 1 DESC', 2],
  ['UPDATE A SET x = 3\nSELECT x FROM A', 3],
  ['SELECT TOP 1 x AS v FROM A ORDER BY x', 1],
  ['SELECT [x] AS v FROM [A] WHERE x = 1\nGO', 1],
];
for (const [t, want] of SHIM_SQL) {
  checks++;
  const pre = t.startsWith('INSERT') ? 'CREATE TABLE A (x INT);' : 'CREATE TABLE A (x INT); INSERT INTO A VALUES (1);';
  try { const r = sqlite(pre + '\n' + convert(t).replace(/;?\s*$/, ';')); const got = r.length ? Object.values(r[0])[0] : undefined; if (got !== want) fail('shim', t.replace(/\n/g, ' / '), 'gave ' + got); }
  catch (e) { fail('shim', t.replace(/\n/g, ' / '), String(e.stderr || e.message).trim().split('\n')[0]); }
}

// 1–3 for the papers
for (const p of papers) {
  const seed = seedOf(p.year + '.sql');
  checks++;
  if (!seed) { fail('seed-missing', p.year, 'seeds/' + p.year + '.sql'); continue; }
  const tables = p.tables.map((t) => ({ name: t.name, alias: t.alias, cols: t.cols.map((c) => c.f) }))
    .concat((p.assumed || []).map((t) => ({ name: t.name, cols: (t.cols || []).map((c) => c.f) })));
  checkTables(String(p.year), seed, tables);
  for (const part of p.parts) {
    const sql = model(part.id) && (part.stub ? part.stub + '\n' : '') + model(part.id);
    if (!sql || part.type !== 'sql') continue;
    const kind = kindOf(sql);
    if (kind === 'select') checkSelect(part.id, seed, sql); else checkWrite(part.id, seed, sql, kind);
  }
}

// twins: the book's (B-<set><label>) and Fable's (set named on the twin)
const twinSet = {};
for (const s of twinSets) for (const q of s.questions) twinSet['B-' + s.n + q.label] = s.n;
for (const t of fable) twinSet[t.id] = t.set;
const setsChecked = new Set();
// every twin's model: the book's printed ms, overridden by twinmodels.js where Fable has cleaned it
const allTwins = {};
for (const s of twinSets) for (const q of s.questions) if (q.ms) allTwins['B-' + s.n + q.label] = q.ms;
Object.assign(allTwins, twinModels);
for (const [id, sql] of Object.entries(allTwins)) {
  const n = twinSet[id];
  checks++;
  if (!n) { fail('twin-set', id, 'no set named'); continue; }
  const kind = kindOf(sql);
  const seed = seedOf('tinies-' + n + '.sql');
  if (!seed) {
    if (kind === 'select') { fail('seed-missing', id, 'seeds/tinies-' + n + '.sql'); continue; }
    // a set with no seed (CREATE only): the model must still build on an empty database
    checkWrite(id, '', sql, kind);
    continue;
  }
  if (!setsChecked.has(n)) {
    setsChecked.add(n);
    const s = twinSets.find((x) => x.n === n);
    checkTables('tinies-' + n, seed, s.tables.map((t) => ({ name: t[0], cols: t[1].map((f) => f[0]) })));
  }
  if (kind === 'select') checkSelect(id, seed, sql); else checkWrite(id, seed, sql, kind);
}

const report = [...log, '', ...fails.map((f) => 'FAIL ' + f.join(' | '))].join('\n');
try { fs.mkdirSync(path.join(SRC, '..', 'gates'), { recursive: true }); fs.writeFileSync(path.join(SRC, '..', 'gates', 'G2_REPORT.txt'), report + '\n'); } catch (e) { /* report is a convenience */ }
if (process.argv.includes('-v')) console.log(report);
console.log(fails.length ? `G2 FAIL — ${fails.length} of ${checks} checks: ` + fails.slice(0, 6).map((f) => f[1] + ' ' + f[0]).join('; ') : `G2 PASS — ${checks} checks, 0 failures`);
process.exit(fails.length ? 1 : 0);
