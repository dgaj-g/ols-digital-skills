// tools/check_seeds.js — pack gate: every SELECT model whose paper has a seed must return ≥1 row through the shim on /usr/bin/sqlite3.
// Writes content/expected/<part>.json ({columns, rows}) for the prototype and the build. Exit 1 on any empty result or SQL error.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const { convert } = require('./tsql2sqlite.js');
const Judge = require('../judge/judge.js');
const papers = JSON.parse(fs.readFileSync(path.join(root, 'content/papers.json'), 'utf8'));
const list = papers.papers || papers;
const CLEAN = { '2018-b-i': null, '2019-b': null, '2024-d': null, '2025-b': null };
let fails = 0, done = 0;
function run(seed, sql) {
  const out = execFileSync('/usr/bin/sqlite3', ['-json', ':memory:'], { input: seed + '\n' + sql.replace(/;?\s*$/, ';') + '\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  return out.trim() ? JSON.parse(out) : [];
}
for (const p of list) {
  const seedPath = path.join(root, 'seeds', p.year + '.sql');
  if (!fs.existsSync(seedPath)) continue;
  const seed = fs.readFileSync(seedPath, 'utf8');
  for (const part of p.parts) {
    if (!part.model || Judge.normalise(part.model).stmts[0].kind !== "select") continue;
    const sql = convert(part.model);
    try {
      const rows = run(seed, sql);
      if (!rows.length) { fails++; console.log('EMPTY ', part.id, '::', sql); continue; }
      const columns = Object.keys(rows[0]);
      fs.writeFileSync(path.join(root, 'content/expected', part.id + '.json'), JSON.stringify({ id: part.id, sql, columns, rows }, null, 0));
      done++; console.log('OK    ', part.id, rows.length, 'rows ::', columns.join(', '));
    } catch (e) { fails++; console.log('ERROR ', part.id, '::', sql, '\n       ', String(e.stderr || e.message).trim().split('\n')[0]); }
  }
}
console.log(`SEEDS: ${done} SELECT models return rows, ${fails} failures — ${fails ? 'RED' : 'GREEN'}`);
process.exit(fails ? 1 : 0);
