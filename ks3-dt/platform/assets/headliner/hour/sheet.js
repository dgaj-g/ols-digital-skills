/* THE HEADLINER (J2 L6) — the spreadsheet engine. window.Sheet. No library; portable into ks3-dt/platform/engines.js.
   A workbook holds named sheets. A cell holds raw text; a formula starts with "=". Values: number, string, boolean,
   or an error object {err:"#VALUE!"}. Errors use the real codes a pupil will meet in Excel and Google Sheets.
   Grammar: expr := cmp ; cmp := add (("="|"<>"|"<="|">="|"<"|">") add)? ; add := mul (("+"|"-") mul)* ;
   mul := unary (("*"|"/") unary)* ; unary := "-" unary | pow ; pow := atom ("^" unary)? ;
   atom := number | "text" | ref | ref ":" ref (inside a function only) | NAME "(" args ")" | "(" expr ")" | atom "%"
   Functions: SUM, AVERAGE, MIN, MAX, IF, ROUND. Empty cells count as 0 in sums and "" in text. */
(function (global) {
  'use strict';
  var COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function colNum(s) { var n = 0; for (var i = 0; i < s.length; i++) n = n * 26 + (COLS.indexOf(s[i]) + 1); return n; }
  function colName(n) { var s = ''; while (n > 0) { var r = (n - 1) % 26; s = COLS[r] + s; n = Math.floor((n - 1) / 26); } return s; }
  function parseRef(t) { var m = /^(\$?)([A-Z]{1,2})(\$?)(\d{1,3})$/.exec(String(t).toUpperCase()); if (!m) return null; return { col: colNum(m[2]), row: +m[4], absCol: !!m[1], absRow: !!m[3] }; }
  function refName(r) { return colName(r.col) + r.row; }
  function refText(r) { return (r.absCol ? '$' : '') + colName(r.col) + (r.absRow ? '$' : '') + r.row; }
  function E(code) { return { err: code }; }
  function isErr(v) { return !!(v && typeof v === 'object' && v.err); }

  function tokenize(s) {
    var toks = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (c === ' ' || c === '\t' || c === ' ') { i++; continue; }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) { var m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i)); toks.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if (c === '"') { var j = s.indexOf('"', i + 1); if (j < 0) throw E('#SYNTAX'); toks.push({ t: 'str', v: s.slice(i + 1, j) }); i = j + 1; continue; }
      if (/[A-Za-z$_]/.test(c)) { var m2 = /^\$?[A-Za-z_][A-Za-z0-9_.]*\$?\d*/.exec(s.slice(i)); toks.push({ t: 'word', v: m2[0] }); i += m2[0].length; continue; }
      var two = s.substr(i, 2); if (two === '<=' || two === '>=' || two === '<>') { toks.push({ t: 'op', v: two }); i += 2; continue; }
      if ('+-*/^(),:=<>%&'.indexOf(c) >= 0) { toks.push({ t: 'op', v: c }); i++; continue; }
      throw E('#SYNTAX');
    }
    return toks;
  }
  function parse(src) {
    var toks = tokenize(src), p = 0;
    function peek() { return toks[p]; } function take() { return toks[p++]; }
    function isOp(v) { var t = peek(); return t && t.t === 'op' && t.v === v; }
    function expect(v) { if (!isOp(v)) throw E('#SYNTAX'); take(); }
    function cmp() { var l = add(); var t = peek(); if (t && t.t === 'op' && /^(=|<>|<=|>=|<|>)$/.test(t.v)) { take(); var r = add(); return { k: 'bin', op: t.v, l: l, r: r }; } return l; }
    function add() { var l = mul(); while (isOp('+') || isOp('-') || isOp('&')) { var o = take().v; l = { k: 'bin', op: o, l: l, r: mul() }; } return l; }
    function mul() { var l = unary(); while (isOp('*') || isOp('/')) { var o = take().v; l = { k: 'bin', op: o, l: l, r: unary() }; } return l; }
    function unary() { if (isOp('-')) { take(); return { k: 'neg', e: unary() }; } if (isOp('+')) { take(); return unary(); } return pow(); }
    function pow() { var a = postfix(); if (isOp('^')) { take(); return { k: 'bin', op: '^', l: a, r: unary() }; } return a; }
    function postfix() { var a = atom(); while (isOp('%')) { take(); a = { k: 'pct', e: a }; } return a; }
    function atom() {
      var t = take(); if (!t) throw E('#SYNTAX');
      if (t.t === 'num') return { k: 'num', v: t.v };
      if (t.t === 'str') return { k: 'str', v: t.v };
      if (t.t === 'op' && t.v === '(') { var e = cmp(); expect(')'); return e; }
      if (t.t === 'word') {
        var r = parseRef(t.v);
        if (r) { if (isOp(':')) { take(); var t2 = take(); var r2 = t2 && t2.t === 'word' && parseRef(t2.v); if (!r2) throw E('#SYNTAX'); return { k: 'range', a: r, b: r2 }; } return { k: 'ref', r: r }; }
        var name = t.v.toUpperCase();
        if (isOp('(')) { take(); var args = []; if (!isOp(')')) { args.push(cmp()); while (isOp(',')) { take(); args.push(cmp()); } } expect(')'); return { k: 'fn', name: name, args: args }; }
        throw E('#NAME?');
      }
      throw E('#SYNTAX');
    }
    var ast = cmp(); if (p < toks.length) throw E('#SYNTAX'); return ast;
  }
  function refsIn(ast, out) { out = out || []; if (!ast) return out; if (ast.k === 'ref') out.push(refName(ast.r)); else if (ast.k === 'range') { for (var r = Math.min(ast.a.row, ast.b.row); r <= Math.max(ast.a.row, ast.b.row); r++) for (var c = Math.min(ast.a.col, ast.b.col); c <= Math.max(ast.a.col, ast.b.col); c++) out.push(colName(c) + r); } else if (ast.k === 'bin') { refsIn(ast.l, out); refsIn(ast.r, out); } else if (ast.k === 'neg' || ast.k === 'pct') refsIn(ast.e, out); else if (ast.k === 'fn') ast.args.forEach(function (a) { refsIn(a, out); }); return out; }
  /* shift every relative reference in a formula by dRow, dCol (used by fill) */
  function shiftFormula(formula, dRow, dCol) {
    var toks = tokenize(formula.slice(1)), out = '=';
    toks.forEach(function (t, i) {
      var s;
      if (t.t === 'num') s = String(t.v); else if (t.t === 'str') s = '"' + t.v + '"'; else if (t.t === 'op') s = t.v;
      else { var r = parseRef(t.v); if (r) { if (!r.absRow) r.row += dRow; if (!r.absCol) r.col += dCol; s = (r.row < 1 || r.col < 1) ? '#REF!' : refText(r); } else s = t.v; }
      var prev = toks[i - 1]; if (prev && (prev.t === 'word' || prev.t === 'num') && (t.t === 'word' || t.t === 'num')) out += ' ';
      out += s;
    });
    return out;
  }
  function toNum(v) { if (typeof v === 'number') return v; if (typeof v === 'boolean') return v ? 1 : 0; if (v === '' || v == null) return 0; if (typeof v === 'string') { var t = v.trim().replace(/^£/, '').replace(/,/g, ''); if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t); if (/^-?\d+(\.\d+)?%$/.test(t)) return parseFloat(t) / 100; } return E('#VALUE!'); }
  function truthy(v) { if (isErr(v)) return v; if (typeof v === 'boolean') return v; if (typeof v === 'number') return v !== 0; if (typeof v === 'string') { var l = v.trim().toLowerCase(); if (l === 'true') return true; if (l === 'false' || l === '') return false; return E('#VALUE!'); } return false; }
  function compare(op, a, b) { if (isErr(a)) return a; if (isErr(b)) return b; var r; if (typeof a === 'number' && typeof b === 'number') r = a - b; else if ((typeof a === 'number' || a === '' || a == null) && (typeof b === 'number' || b === '' || b == null)) r = toNum(a) - toNum(b); else { var x = String(a == null ? '' : a).trim().toLowerCase(), y = String(b == null ? '' : b).trim().toLowerCase(); r = x < y ? -1 : x > y ? 1 : 0; }
    switch (op) { case '=': return r === 0; case '<>': return r !== 0; case '<': return r < 0; case '>': return r > 0; case '<=': return r <= 0; case '>=': return r >= 0; } return E('#SYNTAX'); }

  function Workbook() { this.sheets = {}; this.order = []; }
  Workbook.prototype.add = function (name, cols, rows) { var sh = new Sheet(this, name, cols, rows); this.sheets[name] = sh; this.order.push(name); return sh; };
  Workbook.prototype.sheet = function (name) { return this.sheets[name]; };
  Workbook.prototype.clone = function () { var wb = new Workbook(); var self = this; this.order.forEach(function (n) { var s = self.sheets[n], c = wb.add(n, s.cols, s.rows); Object.keys(s.raw).forEach(function (k) { c.raw[k] = s.raw[k]; }); }); return wb; };

  function Sheet(book, name, cols, rows) { this.book = book; this.name = name; this.cols = cols; this.rows = rows; this.raw = {}; this.cache = null; }
  Sheet.prototype.set = function (ref, raw) { ref = String(ref).toUpperCase(); if (raw == null || raw === '') delete this.raw[ref]; else this.raw[ref] = String(raw); this.book.order.forEach(function () { }); this.invalidate(); };
  Sheet.prototype.invalidate = function () { var b = this.book; b.order.forEach(function (n) { b.sheets[n].cache = null; }); };
  Sheet.prototype.rawOf = function (ref) { return this.raw[String(ref).toUpperCase()] || ''; };
  Sheet.prototype.isFormula = function (ref) { return this.rawOf(ref).charAt(0) === '='; };
  Sheet.prototype.value = function (ref) { ref = String(ref).toUpperCase(); if (!this.cache) this.cache = { vals: {}, busy: {} }; var c = this.cache; if (ref in c.vals) return c.vals[ref];
    if (c.busy[ref]) return E('#CYCLE!'); c.busy[ref] = true; var v = this.compute(ref); c.busy[ref] = false; c.vals[ref] = v; return v; };
  Sheet.prototype.compute = function (ref) { var raw = this.raw[ref]; if (raw == null) return ''; if (raw.charAt(0) === '=') { var ast; try { ast = parse(raw.slice(1)); } catch (e) { return isErr(e) ? e : E('#SYNTAX'); } try { return this.evalNode(ast); } catch (e2) { return isErr(e2) ? e2 : E('#VALUE!'); } }
    var n = toNum(raw); if (!isErr(n) && raw.trim() !== '') return n; return raw; };
  Sheet.prototype.evalNode = function (n) {
    var self = this;
    switch (n.k) {
      case 'num': return n.v; case 'str': return n.v;
      case 'ref': var name = refName(n.r); if (n.r.col > this.cols || n.r.row > this.rows) return E('#REF!'); return this.value(name);
      case 'range': throw E('#VALUE!');
      case 'neg': var v = toNum(this.evalNode(n.e)); return isErr(v) ? v : -v;
      case 'pct': var pv = toNum(this.evalNode(n.e)); return isErr(pv) ? pv : pv / 100;
      case 'bin': var l = this.evalNode(n.l), r = this.evalNode(n.r); if (/^(=|<>|<=|>=|<|>)$/.test(n.op)) return compare(n.op, l, r); if (n.op === '&') { if (isErr(l)) return l; if (isErr(r)) return r; return String(l) + String(r); }
        var a = toNum(l), b = toNum(r); if (isErr(a)) return a; if (isErr(b)) return b;
        switch (n.op) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return b === 0 ? E('#DIV/0!') : a / b; case '^': return Math.pow(a, b); }
        return E('#SYNTAX');
      case 'fn': return this.callFn(n.name, n.args);
    }
    return E('#SYNTAX');
  };
  Sheet.prototype.numbersOf = function (args) { var out = [], self = this, err = null; args.forEach(function (a) { if (a.k === 'range') { refsIn(a).forEach(function (nm) { var v = self.value(nm); if (isErr(v)) err = err || v; else if (typeof v === 'number') out.push(v); }); } else { var v2 = self.evalNode(a); if (isErr(v2)) err = err || v2; else { var nn = toNum(v2); if (!isErr(nn) && !(typeof v2 === 'string' && v2.trim() === '')) out.push(nn); } } }); return err || out; };
  Sheet.prototype.callFn = function (name, args) {
    var nums;
    switch (name) {
      case 'SUM': nums = this.numbersOf(args); if (isErr(nums)) return nums; return nums.reduce(function (a, b) { return a + b; }, 0);
      case 'AVERAGE': nums = this.numbersOf(args); if (isErr(nums)) return nums; return nums.length ? nums.reduce(function (a, b) { return a + b; }, 0) / nums.length : E('#DIV/0!');
      case 'MIN': nums = this.numbersOf(args); if (isErr(nums)) return nums; return nums.length ? Math.min.apply(null, nums) : 0;
      case 'MAX': nums = this.numbersOf(args); if (isErr(nums)) return nums; return nums.length ? Math.max.apply(null, nums) : 0;
      case 'IF': if (args.length < 2 || args.length > 3) return E('#SYNTAX'); var c = truthy(this.evalNode(args[0])); if (isErr(c)) return c; if (c) return this.evalNode(args[1]); return args[2] ? this.evalNode(args[2]) : false;
      case 'ROUND': if (!args.length) return E('#SYNTAX'); var x = toNum(this.evalNode(args[0])); if (isErr(x)) return x; var d = args[1] ? toNum(this.evalNode(args[1])) : 0; if (isErr(d)) return d; var f = Math.pow(10, d); return Math.round(x * f) / f;
    }
    return E('#NAME?');
  };
  Sheet.prototype.fillDown = function (from, to) { var a = parseRef(from), b = parseRef(to); if (!a || !b || a.col !== b.col) return []; var raw = this.rawOf(from), done = []; for (var r = a.row + 1; r <= b.row; r++) { var ref = colName(a.col) + r; var v = raw.charAt(0) === '=' ? shiftFormula(raw, r - a.row, 0) : raw; this.set(ref, v); done.push(ref); } return done; };
  Sheet.prototype.refsOf = function (ref) { var raw = this.rawOf(ref); if (raw.charAt(0) !== '=') return []; try { return refsIn(parse(raw.slice(1))); } catch (e) { return []; } };
  Sheet.prototype.display = function (ref, fmt) { var v = this.value(ref), raw = this.rawOf(ref); if (isErr(v)) return v.err; if (v === '' || v == null) return ''; if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') { if (raw.charAt(0) !== '=' && /%$/.test(raw.trim())) return raw.trim(); if (fmt === 'money') return (Math.round(v * 100) / 100).toFixed(2); var r2 = Math.round(v * 100) / 100; return String(r2); } return String(v); };

  global.Sheet = { Workbook: Workbook, parse: parse, tokenize: tokenize, shiftFormula: shiftFormula, parseRef: parseRef, refName: refName, colName: colName, colNum: colNum, isErr: isErr, toNum: toNum };
})(typeof window !== 'undefined' ? window : global);
