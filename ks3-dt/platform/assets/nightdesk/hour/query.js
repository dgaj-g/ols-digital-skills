/* THE NIGHT DESK — the query engine. window.Query. A query picks rows out of one table.
   Grammar (SQL's WHERE, nothing more): or := and ("OR" and)* ; and := not ("AND" not)* ; not := "NOT" not | atom ;
   atom := "(" or ")" | column ("=" | "<>" | "<" | ">" | "<=" | ">=") value | column "BETWEEN" value "AND" value
   value := number | "text" | 'text' | bareword (one word, forgiving). Text compares ignore case. BETWEEN includes both ends.
   Errors carry a code the UI turns into a kind line: empty, syntax, column, value, dangling. */
(function (global) {
  'use strict';
  var KEY = { AND: 1, OR: 1, NOT: 1, BETWEEN: 1 };
  function tokenize(s) {
    var toks = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      var two = s.substr(i, 2); if (two === '<=' || two === '>=' || two === '<>' || two === '!=') { toks.push({ t: 'op', v: two === '!=' ? '<>' : two, at: i }); i += 2; continue; }
      if ('=<>()'.indexOf(c) >= 0) { toks.push({ t: 'op', v: c, at: i }); i++; continue; }
      if (c === '"' || c === "'" || c === '“' || c === '‘') { var close = c === '“' ? '”' : c === '‘' ? '’' : c; var j = s.indexOf(close, i + 1); if (j < 0) throw { code: 'syntax', at: i, why: 'quote' }; toks.push({ t: 'str', v: s.slice(i + 1, j), at: i }); i = j + 1; continue; }
      var m = /^-?\d+(\.\d+)?/.exec(s.slice(i)); if (m) { toks.push({ t: 'num', v: parseFloat(m[0]), at: i }); i += m[0].length; continue; }
      var w = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i)); if (w) { var up = w[0].toUpperCase(); toks.push(KEY[up] ? { t: 'kw', v: up, at: i } : { t: 'word', v: w[0], at: i }); i += w[0].length; continue; }
      throw { code: 'syntax', at: i, why: 'char' };
    }
    return toks;
  }
  function parse(src, columns) {
    var toks = tokenize(src), p = 0;
    if (!toks.length) throw { code: 'empty' };
    function peek() { return toks[p]; } function take() { return toks[p++]; }
    function isKw(v) { var t = peek(); return t && t.t === 'kw' && t.v === v; }
    function isOp(v) { var t = peek(); return t && t.t === 'op' && t.v === v; }
    function or() { var l = and(); while (isKw('OR')) { take(); l = { k: 'or', l: l, r: and() }; } return l; }
    function and() { var l = not(); while (isKw('AND')) { take(); l = { k: 'and', l: l, r: not() }; } return l; }
    function not() { if (isKw('NOT')) { take(); return { k: 'not', e: not() }; } return atom(); }
    function value() { var t = take(); if (!t) throw { code: 'dangling', at: src.length }; if (t.t === 'num') return { num: t.v }; if (t.t === 'str') return { str: t.v }; if (t.t === 'word') return { str: t.v, bare: true }; throw { code: 'syntax', at: t.at, why: 'value' }; }
    function atom() {
      var t = take(); if (!t) throw { code: 'dangling', at: src.length };
      if (t.t === 'op' && t.v === '(') { var e = or(); if (!isOp(')')) throw { code: 'syntax', at: src.length, why: 'bracket' }; take(); return e; }
      if (t.t !== 'word') throw { code: 'syntax', at: t.at, why: 'column' };
      var col = columns.filter(function (c) { return c.toLowerCase() === t.v.toLowerCase(); })[0];
      if (!col) throw { code: 'column', at: t.at, word: t.v };
      if (isKw('BETWEEN')) { take(); var a = value(); if (!isKw('AND')) throw { code: 'syntax', at: (peek() || { at: src.length }).at, why: 'between' }; take(); var b = value(); return { k: 'between', col: col, a: a, b: b }; }
      var o = take(); if (!o || o.t !== 'op' || o.v === '(' || o.v === ')') throw { code: 'syntax', at: o ? o.at : src.length, why: 'op' };
      return { k: 'cmp', col: col, op: o.v, v: value() };
    }
    var ast = or(); if (p < toks.length) throw { code: 'syntax', at: toks[p].at, why: 'extra' }; return ast;
  }
  function cmpVal(cell, v) { if (v.num != null) { if (typeof cell !== 'number') return null; return cell - v.num; } var a = String(cell).toLowerCase(), b = String(v.str).toLowerCase(); return a < b ? -1 : a > b ? 1 : 0; }
  function test(ast, row) {
    switch (ast.k) {
      case 'or': return test(ast.l, row) || test(ast.r, row);
      case 'and': return test(ast.l, row) && test(ast.r, row);
      case 'not': return !test(ast.e, row);
      case 'between': var lo = cmpVal(row[ast.col], ast.a), hi = cmpVal(row[ast.col], ast.b); return lo != null && hi != null && lo >= 0 && hi <= 0;
      case 'cmp': var c = cmpVal(row[ast.col], ast.v); if (c == null) return false;
        switch (ast.op) { case '=': return c === 0; case '<>': return c !== 0; case '<': return c < 0; case '>': return c > 0; case '<=': return c <= 0; case '>=': return c >= 0; } return false;
    }
    return false;
  }
  function run(src, table, columns) { var ast = parse(src, columns); return table.filter(function (r) { return test(ast, r); }); }
  global.Query = { tokenize: tokenize, parse: parse, test: test, run: run };
})(typeof window !== 'undefined' ? window : global);
