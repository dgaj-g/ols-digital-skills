/* tools/tsql2sqlite.js — SPEC §6: turn the T-SQL a pupil types into SQLite for the Run button (sql.js in the browser, sqlite3 in Node).
 * Rewrites only what SQLite lacks. Anything it cannot rewrite is left alone; SQLite then reports its own error, which the UI shows.
 * UMD: window.Tsql2Sqlite.convert(sql) / require('./tsql2sqlite.js').convert(sql)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Tsql2Sqlite = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // balanced argument split for f(a, b(c, d), e)
  function args(str) {
    const out = []; let depth = 0, cur = '';
    for (const ch of str) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  // find every call of `name(` and rewrite it with fn(argsArray) → replacement text; innermost first via repeated passes
  function rewriteCalls(sql, name, fn) {
    const re = new RegExp('\\b' + name + '\\s*\\(', 'i');
    for (let guard = 0; guard < 50; guard++) {
      const m = re.exec(sql);
      if (!m) break;
      let depth = 0, i = m.index + m[0].length - 1, end = -1;
      for (; i < sql.length; i++) { if (sql[i] === '(') depth++; else if (sql[i] === ')') { depth--; if (depth === 0) { end = i; break; } } }
      if (end < 0) break;
      const inner = sql.slice(m.index + m[0].length, end);
      const rep = fn(args(inner), inner);
      sql = sql.slice(0, m.index) + rep + sql.slice(end + 1);
    }
    return sql;
  }
  function splitStatements(sql) {
    const START = /^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SELECT|WITH)\b/i;
    let out = '', depth = 0, head = null, topSelect = false, cur = '';
    const lines = sql.split('\n');
    lines.forEach((line, li) => {
      const t = line.trim();
      const m = START.exec(t);
      const prevText = out.replace(/\s+$/, '');
      if (m && depth === 0 && head) {
        const kw = m[1].toUpperCase();
        const prevWord = (/(\w+)\s*$/.exec(prevText) || [])[1] || '';
        const joins = /^(UNION|ALL|EXCEPT|INTERSECT|AS)$/i.test(prevWord) ||
          (kw === 'SELECT' && !topSelect && (head === 'WITH' || (head === 'INSERT' && !/\bVALUES\b/i.test(cur))));
        if (joins) { if (kw === 'SELECT') topSelect = true; }
        else { if (!/;$/.test(prevText)) out = prevText + ';' + out.slice(prevText.length); head = null; cur = ''; }
      }
      if (!head && m) { head = m[1].toUpperCase(); topSelect = head === 'SELECT'; }
      for (const ch of line) { if (ch === '(') depth++; else if (ch === ')') depth = Math.max(0, depth - 1); else if (ch === ';' && depth === 0) { head = null; cur = ''; } }
      cur += line + '\n';
      out += line + (li < lines.length - 1 ? '\n' : '');
    });
    return out;
  }
  const UNIT = { day: 'day', dd: 'day', d: 'day', week: 'week', wk: 'week', ww: 'week', month: 'month', mm: 'month', m: 'month', year: 'year', yy: 'year', yyyy: 'year', minute: 'minute', mi: 'minute', n: 'minute', hour: 'hour', hh: 'hour' };
  const isDateExpr = (s) => /^date\(|^'\d{4}-\d{2}-\d{2}'$|^datetime\(/i.test(s.trim());
  const asDate = (s) => (isDateExpr(s) ? s : 'date(' + s + ')');

  function convert(input) {
    let sql = String(input == null ? '' : input);
    // comments and GO
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ').replace(/^\s*GO\s*$/gim, ';');
    // [bracketed] identifiers → bare
    sql = sql.replace(/\[([^\]]+)\]/g, '$1');
    // string literals: protect
    const lits = [];
    sql = sql.replace(/'(?:[^']|'')*'/g, (m) => {
      // date literals in any common order → ISO, so 29/01/2016, 2016/01/29 and 29-01-2016 all match a DATE column
      let v = m.replace(/^'(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})'$/, (q, d, mo, y) => "'" + y + '-' + mo.padStart(2, '0') + '-' + d.padStart(2, '0') + "'");
      v = v.replace(/^'(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})'$/, (q, y, mo, d) => "'" + y + '-' + mo.padStart(2, '0') + '-' + d.padStart(2, '0') + "'");
      lits.push(v); return '\u0001' + (lits.length - 1) + '\u0001'; });
    // today
    sql = sql.replace(/\b(?:GETDATE|SYSDATETIME|CURRENT_TIMESTAMP)\s*\(\s*\)/gi, "date('now')").replace(/\bCURRENT_TIMESTAMP\b/gi, "date('now')");
    // CAST(x AS DATE) → date(x); CAST(x AS INT|DECIMAL…) → CAST(x AS INTEGER|REAL)
    sql = rewriteCalls(sql, 'CAST', (a, inner) => { const m = /^([\s\S]*?)\s+AS\s+(\w+)(?:\([^)]*\))?\s*$/i.exec(inner); if (!m) return 'CAST(' + inner + ')'; const t = m[2].toLowerCase(); if (t === 'date' || t === 'datetime') return asDate(m[1]); if (/^(int|integer|bigint|smallint|tinyint)$/.test(t)) return 'CAST(' + m[1] + ' AS INTEGER)'; if (/^(decimal|numeric|float|real|money)$/.test(t)) return 'CAST(' + m[1] + ' AS REAL)'; return 'CAST(' + m[1] + ' AS TEXT)'; });
    sql = rewriteCalls(sql, 'CONVERT', (a) => { const t = (a[0] || '').toLowerCase(); if (/^date/.test(t)) return asDate(a[1] || "date('now')"); return '(' + (a[1] || '') + ')'; });
    // DATEADD(unit, n, d) → date(d, (n) || ' unit')   (WEEK → days × 7)
    // MONTH/YEAR clamp to the month's last day as SQL Server does (31 Mar − 1 month = 28 Feb); SQLite alone would roll on to 3 Mar
    sql = rewriteCalls(sql, 'DATEADD', (a) => {
      const u = UNIT[(a[0] || '').toLowerCase()] || 'day'; const n = a[1] || '0'; const d = asDate(a[2] || "date('now')");
      if (u === 'week') return 'date(' + d + ", ((" + n + ") * 7) || ' days')";
      if (u === 'month' || u === 'year') {
        const k = u === 'year' ? '((' + n + ') * 12)' : '(' + n + ')';
        return 'date(' + d + ", 'start of month', " + k + " || ' months', '+' || (min(CAST(strftime('%d', " + d + ") AS INTEGER), CAST(strftime('%d', date(" + d + ", 'start of month', (" + k + " + 1) || ' months', '-1 day')) AS INTEGER)) - 1) || ' days')";
      }
      return 'date(' + d + ', (' + n + ") || ' " + u + "s')";
    });
    // DATEDIFF(unit, a, b)
    sql = rewriteCalls(sql, 'DATEDIFF', (a) => { const u = UNIT[(a[0] || '').toLowerCase()] || 'day'; const x = a[1], y = a[2]; if (u === 'day') return 'CAST(julianday(' + asDate(y) + ') - julianday(' + asDate(x) + ') AS INTEGER)'; if (u === 'week') return 'CAST((julianday(' + asDate(y) + ') - julianday(' + asDate(x) + ')) / 7 AS INTEGER)'; if (u === 'month') return "((CAST(strftime('%Y'," + y + ") AS INTEGER) - CAST(strftime('%Y'," + x + ") AS INTEGER)) * 12 + CAST(strftime('%m'," + y + ") AS INTEGER) - CAST(strftime('%m'," + x + ") AS INTEGER))"; if (u === 'year') return "(CAST(strftime('%Y'," + y + ") AS INTEGER) - CAST(strftime('%Y'," + x + ") AS INTEGER))"; if (u === 'minute') return 'CAST((julianday(' + y + ') - julianday(' + x + ')) * 1440 AS INTEGER)'; return 'CAST((julianday(' + y + ') - julianday(' + x + ')) * 24 AS INTEGER)'; });
    // YEAR/MONTH/DAY(d), DATEPART(unit, d)
    sql = rewriteCalls(sql, 'YEAR', (a) => "CAST(strftime('%Y'," + a[0] + ') AS INTEGER)');
    sql = rewriteCalls(sql, 'MONTH', (a) => "CAST(strftime('%m'," + a[0] + ') AS INTEGER)');
    sql = rewriteCalls(sql, 'DAY', (a) => "CAST(strftime('%d'," + a[0] + ') AS INTEGER)');
    sql = rewriteCalls(sql, 'DATEPART', (a) => { const u = UNIT[(a[0] || '').toLowerCase()] || 'day'; const f = { year: '%Y', month: '%m', day: '%d', week: '%W', minute: '%M', hour: '%H' }[u]; return "CAST(strftime('" + f + "'," + a[1] + ') AS INTEGER)'; });
    // TOP n → LIMIT n (appended)
    const top = /\bSELECT\s+(DISTINCT\s+)?TOP\s+(\d+)\s+/i.exec(sql);
    if (top) { sql = sql.replace(top[0], 'SELECT ' + (top[1] || '')); sql = sql.replace(/;?\s*$/, ' LIMIT ' + top[2]); }
    // CREATE TABLE bits SQLite lacks: IDENTITY(1,1) → drop (INTEGER PRIMARY KEY autoincrements); inline FOREIGN KEY REFERENCES → REFERENCES
    sql = sql.replace(/\bIDENTITY\s*(\(\s*\d+\s*,\s*\d+\s*\))?/gi, '').replace(/\bFOREIGN\s+KEY\s+REFERENCES\b/gi, 'REFERENCES');
    sql = sql.replace(/\b(N?VARCHAR|NCHAR|CHAR)\s*\(\s*(\d+|MAX)\s*\)/gi, 'TEXT').replace(/\bDATETIME2?\b/gi, 'DATE').replace(/\bMONEY\b/gi, 'REAL');
    // DEFAULT GETDATE(): SQLite wants an expression default in brackets
    sql = sql.replace(/\bDEFAULT\s+(date\('now'\))/gi, 'DEFAULT ($1)');
    // string concatenation: 'a' + b → 'a' || b   (only when a literal or a known text column sits on one side)
    sql = sql.replace(/(\u0001\d+\u0001)\s*\+\s*/g, '$1 || ').replace(/\s*\+\s*(\u0001\d+\u0001)/g, ' || $1');
    // ISNULL → IFNULL, LEN → LENGTH
    sql = sql.replace(/\bISNULL\s*\(/gi, 'IFNULL(').replace(/\bLEN\s*\(/gi, 'LENGTH(');
    // ORDER BY Name where the SELECT list has t.Name: SQL Server sorts by that output column; SQLite calls it ambiguous
    const sel = /^\s*SELECT\s+(?:DISTINCT\s+)?([\s\S]*?)\bFROM\b/i.exec(sql);
    const ob = /\bORDER\s+BY\s+([\s\S]*?)(\s+LIMIT\s+\d+)?\s*;?\s*$/i.exec(sql);
    if (sel && ob) {
      const q = {};
      args(sel[1]).forEach((it) => { const m = /^(\w+)\.(\w+)$/.exec(it.trim()); if (m) q[m[2].toLowerCase()] = m[1] + '.' + m[2]; });
      const terms = args(ob[1]).map((t) => { const m = /^(\w+)(\s+(?:ASC|DESC))?$/i.exec(t.trim()); return m && q[m[1].toLowerCase()] ? q[m[1].toLowerCase()] + (m[2] || '') : t; });
      sql = sql.slice(0, ob.index) + 'ORDER BY ' + terms.join(', ') + (ob[2] || '') + sql.slice(ob.index + ob[0].length).replace(/^/, /;\s*$/.test(ob[0]) ? ';' : '');
    }
    // statements written without semicolons (SQL Server allows it; SQLite does not): a new line that starts a statement ends the last one
    sql = splitStatements(sql);
    // restore literals
    sql = sql.replace(/\u0001(\d+)\u0001/g, (m, i) => lits[+i]);
    return sql.trim();
  }
  return { convert };
});
