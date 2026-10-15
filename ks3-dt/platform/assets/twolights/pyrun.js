/* TWO LIGHTS · pyrun — a small Python 3.14 for the lighthouse programs.
   Runs the subset the hour uses (def, return, pass, assignment, calls, + - *, strings, ints, comparisons,
   and/or/not) and prints errors byte for byte as python3 prints them. Every message and caret rule here was
   read from CPython 3.14's traceback.py and checked by tools/record-tutorial/l5-redtext.js against real python3.
   UMD: window.PyRun in the page, require() in the gates. No DOM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PyRun = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KW = ['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
    'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
    'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'];
  // python3.14 vars(builtins), in order, then the three wired functions the lighthouse adds
  var BUILTIN_NAMES = ('__name__ __doc__ __package__ __loader__ __spec__ __build_class__ __import__ abs all any ascii bin ' +
    'breakpoint callable chr compile delattr dir divmod eval exec format getattr globals hasattr hash hex id input ' +
    'isinstance issubclass iter aiter len locals max min next anext oct ord pow print repr round setattr sorted sum vars ' +
    'None Ellipsis NotImplemented False True bool memoryview bytearray bytes classmethod complex dict enumerate filter ' +
    'float frozenset property int list map object range reversed set slice staticmethod str super tuple type zip ' +
    '__debug__ BaseException BaseExceptionGroup Exception GeneratorExit KeyboardInterrupt SystemExit ArithmeticError ' +
    'AssertionError AttributeError BufferError EOFError ImportError LookupError MemoryError NameError OSError ' +
    'ReferenceError RuntimeError StopAsyncIteration StopIteration SyntaxError Warning SystemError TypeError ValueError ' +
    'FloatingPointError OverflowError ZeroDivisionError BytesWarning DeprecationWarning EncodingWarning FutureWarning ' +
    'ImportWarning PendingDeprecationWarning ResourceWarning RuntimeWarning SyntaxWarning UnicodeWarning UserWarning ' +
    'BlockingIOError ChildProcessError ConnectionError BrokenPipeError ConnectionAbortedError ConnectionRefusedError ' +
    'ConnectionResetError FileExistsError FileNotFoundError IsADirectoryError NotADirectoryError InterruptedError ' +
    'PermissionError ProcessLookupError TimeoutError IndentationError _IncompleteInputError IndexError KeyError ' +
    'ModuleNotFoundError NotImplementedError PythonFinalizationError RecursionError UnboundLocalError UnicodeError ' +
    'UnicodeDecodeError UnicodeEncodeError UnicodeTranslateError TabError ExceptionGroup EnvironmentError IOError ' +
    'open quit exit copyright credits license help _ light horn radio').split(' ');
  var MODULE_GLOBALS = ['__name__', '__doc__', '__package__', '__loader__', '__spec__', '__builtins__', '__file__', '__cached__'];
  var STDLIB = ('abc argparse array ast asyncio base64 bisect calendar cmath collections colorsys copy csv datetime decimal ' +
    'difflib enum fractions functools glob hashlib heapq html http io itertools json keyword locale logging math ' +
    'operator os pathlib pickle platform pprint queue random re secrets shutil signal socket sqlite3 statistics string ' +
    'struct subprocess sys tempfile textwrap threading time timeit tkinter token tokenize turtle types typing unittest ' +
    'urllib uuid warnings wave weakref zipfile zlib').split(' ');

  /* ---------- errors ---------- */
  function SynErr(type, msg, line, off, end, opts) {
    var e = { syntax: true, type: type, msg: msg, line: line, off: off, end: end };
    if (opts) for (var k in opts) e[k] = opts[k];
    return e;
  }

  /* ---------- tokenizer ---------- */
  var OPS3 = ['**=', '//=', '...', '>>=', '<<=', '!='];
  var OPS2 = ['==', '<=', '>=', '+=', '-=', '*=', '/=', '//', '**', '->', ':=', '!=', '<<', '>>', '%='];
  function isIdStart(ch) { return /[A-Za-z_À-￿]/.test(ch) && !/[‘’“”]/.test(ch); }
  function isIdChar(ch) { return isIdStart(ch) || /[0-9]/.test(ch); }

  function tokenize(src) {
    var lines = src.split('\n'), toks = [], stack = [0], depth = [], err = null;
    function push(t, v, ln, c, ec, el) { toks.push({ t: t, v: v, line: ln, col: c, ecol: ec, eline: el || ln }); }
    for (var li = 0; li < lines.length && !err; li++) {
      var L = lines[li], ln = li + 1, i = 0;
      if (!depth.length) {
        var ind = 0; while (ind < L.length && L[ind] === ' ') ind++;
        if (ind >= L.length || L[ind] === '#') continue;            // blank or comment-only line
        if (ind > stack[stack.length - 1]) { stack.push(ind); push('INDENT', '', ln, 0, ind); }
        else if (ind < stack[stack.length - 1]) {
          while (ind < stack[stack.length - 1]) { stack.pop(); push('DEDENT', '', ln, ind, ind); }
          if (ind !== stack[stack.length - 1]) {
            err = SynErr('IndentationError', 'unindent does not match any outer indentation level', ln, L.length + 1, -1,
              { text: L, tok: toks.length }); break;
          }
        }
        i = ind;
      }
      var any = false;
      while (i < L.length) {
        var ch = L[i];
        if (ch === ' ') { i++; continue; }
        if (ch === '#') break;
        any = true;
        var m;
        if (/[0-9]/.test(ch)) {
          var j = i; while (j < L.length && /[0-9_]/.test(L[j])) j++;
          if (j < L.length && isIdStart(L[j])) {
            err = SynErr('SyntaxError', 'invalid decimal literal', ln, i + 1, j + 1, { text: L, tok: toks.length }); break;
          }
          push('NUMBER', L.slice(i, j), ln, i, j); i = j; continue;
        }
        var pre = (m = /^([fFrRbBuU]{1,2})?(["'])/.exec(L.slice(i))) && isIdStart(ch) ? m : null;
        if (ch === '"' || ch === "'" || pre) {
          var start = i, prefix = pre && pre[1] ? pre[1] : '';
          i += prefix.length;
          var q = L[i];
          if (L.substr(i, 3) === q + q + q) {
            err = SynErr('SyntaxError', 'unsupported', ln, start + 1, start + 1, { text: L, tok: toks.length, unsupported: true }); break;
          }
          var k = i + 1, val = '', ok = false;
          while (k < L.length) {
            if (L[k] === '\\' && k + 1 < L.length) {
              var nx = L[k + 1];
              val += /r/i.test(prefix) ? '\\' + nx : (nx === 'n' ? '\n' : nx === 't' ? '\t' : nx === '\\' ? '\\' : nx === "'" ? "'" : nx === '"' ? '"' : '\\' + nx);
              k += 2; continue;
            }
            if (L[k] === q) { ok = true; break; }
            val += L[k]; k++;
          }
          if (!ok) {
            err = SynErr('SyntaxError', 'unterminated string literal (detected at line ' + ln + ')', ln, start + 1, start + 1,
              { text: L, tok: toks.length }); break;
          }
          push('STRING', val, ln, start, k + 1); toks[toks.length - 1].prefix = prefix.toLowerCase(); i = k + 1; continue;
        }
        if (isIdStart(ch)) {
          var e2 = i; while (e2 < L.length && isIdChar(L[e2])) e2++;
          push('NAME', L.slice(i, e2), ln, i, e2); i = e2; continue;
        }
        if (/[‘’“”]/.test(ch)) {
          err = SynErr('SyntaxError', "invalid character '" + ch + "' (U+" + ch.charCodeAt(0).toString(16).toUpperCase() + ')',
            ln, i + 1, i + 2, { text: L, tok: toks.length }); break;
        }
        if ('([{'.indexOf(ch) >= 0) { depth.push({ ch: ch, line: ln, col: i, text: L }); push('OP', ch, ln, i, i + 1); i++; continue; }
        if (')]}'.indexOf(ch) >= 0) {
          if (!depth.length) { err = SynErr('SyntaxError', "unmatched '" + ch + "'", ln, i + 1, i + 1, { text: L, tok: toks.length }); break; }
          var open = depth.pop(), want = { '(': ')', '[': ']', '{': '}' }[open.ch];
          if (want !== ch) {
            err = SynErr('SyntaxError', "closing parenthesis '" + ch + "' does not match opening parenthesis '" + open.ch + "'" +
              (open.line !== ln ? ' on line ' + open.line : ''), ln, i + 1, i + 1, { text: L, tok: toks.length }); break;
          }
          push('OP', ch, ln, i, i + 1); i++; continue;
        }
        var three = L.substr(i, 3), two = L.substr(i, 2);
        if (OPS3.indexOf(three) >= 0) { push('OP', three, ln, i, i + 3); i += 3; continue; }
        if (OPS2.indexOf(two) >= 0) { push('OP', two, ln, i, i + 2); i += 2; continue; }
        push('OP', ch, ln, i, i + 1); i++;
      }
      if (err) break;
      if (!depth.length && (any || toks.length && toks[toks.length - 1].line === ln)) {
        if (toks.length && toks[toks.length - 1].t !== 'NEWLINE' && toks[toks.length - 1].t !== 'INDENT' && toks[toks.length - 1].t !== 'DEDENT') {
          var endc = L.replace(/\s+$/, '').length;
          push('NEWLINE', '', ln, endc, endc + 1);
        }
      }
    }
    if (!err && depth.length) {
      var o = depth[depth.length - 1];
      err = SynErr('SyntaxError', "'" + o.ch + "' was never closed", o.line, o.col + 1, 0, { text: o.text, tok: toks.length, eof: true });
    }
    var lastLn = lines.length;
    if (!err) {
      if (toks.length && toks[toks.length - 1].t !== 'NEWLINE' && toks[toks.length - 1].t !== 'DEDENT') {
        var lt = toks[toks.length - 1]; push('NEWLINE', '', lt.line, lt.ecol, lt.ecol + 1);
      }
      while (stack.length > 1) { stack.pop(); push('DEDENT', '', lastLn + 1, 0, 0); }
    }
    push('ENDMARKER', '', lastLn + 1, 0, 0);
    return { toks: toks, err: err, lines: lines };
  }

  /* ---------- parser ---------- */
  function Parser(tk, opts) {
    this.toks = tk.toks; this.lines = tk.lines; this.tkErr = tk.err; this.p = 0; this.far = 0; this.level = 0; this.opts = opts || {};
    var L = tk.lines.length; while (L > 1 && tk.lines[L - 1] === "") L--; this.lastLine = L;
  }
  var P = Parser.prototype;
  P.peek = function (o) {
    var i = this.p + (o || 0);
    if (this.tkErr && i >= this.tkErr.tok) throw this.tkErr;
    i = Math.min(i, this.toks.length - 1);
    if (i > this.far) this.far = i;
    return this.toks[i];
  };
  P.next = function () { var t = this.peek(); if (this.tkErr && this.p >= this.tkErr.tok) throw this.tkErr; this.p++; return t; };
  P.at = function (t, v) { var k = this.peek(); return k.t === t && (v === undefined || k.v === v); };
  P.checkTk = function () { if (this.tkErr && this.p >= this.tkErr.tok) throw this.tkErr; };
  P.generic = function (tok) {
    tok = tok || this.peek();
    this.checkTk();
    return SynErr('SyntaxError', 'invalid syntax', tok.line, tok.col + 1, tok.ecol + 1, { generic: true, tokIdx: this.toks.indexOf(tok) });
  };
  P.expectOp = function (v, msg) {
    this.checkTk();
    if (this.at('OP', v)) return this.next();
    var t = this.peek();
    if (msg) throw SynErr('SyntaxError', msg, t.line, t.col + 1, t.ecol + 1);
    throw this.generic(t);
  };
  P.file = function () {
    var body = [];
    while (true) { this.checkTk(); if (this.at('ENDMARKER')) break; this.stmt(body); }
    return body;
  };
  P.startsExpr = function (t) {
    return t.t === 'NAME' && ['def', 'return', 'pass', 'if', 'for', 'while', 'else', 'elif', 'import', 'from', 'class', 'and', 'or', 'in', 'is', 'as', 'with', 'try', 'except', 'finally', 'global', 'del', 'raise', 'assert', 'break', 'continue', 'yield', 'lambda', 'nonlocal'].indexOf(t.v) < 0 ||
      t.t === 'NUMBER' || t.t === 'STRING' || (t.t === 'OP' && ['(', '[', '-', '+', '~', '{'].indexOf(t.v) >= 0) ||
      (t.t === 'NAME' && t.v === 'not');
  };
  P.stmt = function (body) {
    this.checkTk();
    var t = this.peek();
    if (t.t === 'INDENT') {
      throw SynErr('IndentationError', 'unexpected indent', t.line, t.ecol, -1, { final: true });
    }
    if (t.t === 'DEDENT') { throw this.generic(t); }
    if (t.t === 'NAME' && t.v === 'def') return body.push(this.funcdef());
    if (t.t === 'NAME' && ['if', 'for', 'while', 'class', 'try', 'with', 'import', 'from', 'global', 'del', 'raise', 'assert',
      'break', 'continue', 'lambda', 'yield', 'nonlocal', 'async', 'elif', 'else'].indexOf(t.v) >= 0 && !this.opts.loose) {
      throw { unsupported: true, line: t.line, word: t.v };
    }
    this.simpleStmts(body);
  };
  P.funcdef = function () {
    var d = this.next(), name = this.peek();
    if (name.t !== 'NAME' || KW.indexOf(name.v) >= 0) throw this.generic(name);
    this.next();
    this.expectOp('(', "expected '('");
    var params = [];
    if (!this.at('OP', ')')) {
      while (true) {
        var pt = this.peek();
        if (pt.t !== 'NAME' || KW.indexOf(pt.v) >= 0) throw this.generic(pt);
        this.next(); params.push(pt.v);
        if (this.at('OP', ',')) { this.next(); if (this.at('OP', ')')) break; continue; }
        break;
      }
    }
    this.expectOp(')');
    this.expectOp(':', "expected ':'");
    var body = this.block(d, 'function definition');
    return { k: 'def', name: name.v, params: params, body: body, line: d.line, col: d.col, eline: body.length ? body[body.length - 1].eline : d.line, ecol: 0 };
  };
  P.block = function (head, what) {
    this.checkTk();
    if (this.at('NEWLINE')) {
      var nl = this.next(); this.checkTk();
      var t = this.peek();
      if (t.t !== 'INDENT') {
        if (t.t === 'ENDMARKER' || t.t === 'DEDENT' && this.peek(1).t === 'ENDMARKER') {
          // script mode: python names the file's last line and shows it with no caret
          throw SynErr('IndentationError', 'expected an indented block after ' + what + ' on line ' + head.line, this.lastLine || nl.line, nl.col + 1, -1, { noCaret: true });
        }
        throw SynErr('IndentationError', 'expected an indented block after ' + what + ' on line ' + head.line, t.line, t.col + 1, t.ecol + 1);
      }
      this.next();
      var body = [];
      while (true) { this.checkTk(); if (this.at('DEDENT')) { this.next(); break; } if (this.at('ENDMARKER')) break; this.stmt(body); }
      return body;
    }
    var b = []; this.simpleStmts(b); return b;
  };
  P.simpleStmts = function (body) {
    while (true) {
      body.push(this.simple());
      this.checkTk();
      if (this.at('OP', ';')) { this.next(); if (this.at('NEWLINE')) break; continue; }
      break;
    }
    this.checkTk();
    if (!this.at('NEWLINE')) {
      var t = this.peek(), last = body[body.length - 1];
      if (this.startsExpr(t) && last.k === 'expr') {
        var e = last.e;
        if (e.k === 'name' && e.id === 'print' && !(t.t === 'OP' && t.v === '(')) {
          var b = this.trySpan();
          throw SynErr('SyntaxError', "Missing parentheses in call to 'print'. Did you mean print(...)?", e.line, e.col + 1, (b ? b.ecol : t.ecol) + 1);
        }
      }
      throw this.generic(t);
    }
    this.next();
  };
  P.trySpan = function () {
    var save = this.p;
    try { var x = this.expr(); this.p = save; return x; } catch (e) { this.p = save; return null; }
  };
  P.simple = function () {
    var t = this.peek();
    if (t.t === 'NAME' && t.v === 'pass') { this.next(); return { k: 'pass', line: t.line, col: t.col, eline: t.line, ecol: t.ecol }; }
    if (t.t === 'NAME' && t.v === 'return') {
      this.next(); var v = null;
      if (!this.at('NEWLINE') && !this.at('OP', ';')) v = this.expr();
      return { k: 'return', e: v, line: t.line, col: t.col, eline: v ? v.eline : t.line, ecol: v ? v.ecol : t.ecol };
    }
    var e = this.expr();
    if (this.at('OP', '=')) {
      if (e.k !== 'name') {
        var what = e.k === 'call' ? 'function call' : (e.k === 'str' || e.k === 'num' || e.k === 'const') ? 'literal' : 'expression';
        throw SynErr('SyntaxError', 'cannot assign to ' + what + " here. Maybe you meant '==' instead of '='?", e.line, e.col + 1, e.ecol + 1);
      }
      this.next();
      var v2 = this.expr();
      return { k: 'assign', target: e.id, tnode: e, e: v2, line: e.line, col: e.col, eline: v2.eline, ecol: v2.ecol };
    }
    return { k: 'expr', e: e, line: e.line, col: e.col, eline: e.eline, ecol: e.ecol };
  };
  /* expressions: or > and > not > comparison > sum > term > unary > primary */
  function node(k, a, b, extra) {
    var pa = a.paren || a, pb = b.paren || b;
    var n = { k: k, line: pa.line, col: pa.col, eline: pb.eline, ecol: pb.ecol };
    if (extra) for (var x in extra) n[x] = extra[x];
    return n;
  }
  P.expr = function () {
    var a = this.andExpr();
    while (this.at('NAME', 'or')) { this.next(); var b = this.andExpr(); a = node('bool', a, b, { op: 'or', a: a, b: b }); }
    return a;
  };
  P.andExpr = function () {
    var a = this.notExpr();
    while (this.at('NAME', 'and')) { this.next(); var b = this.notExpr(); a = node('bool', a, b, { op: 'and', a: a, b: b }); }
    return a;
  };
  P.notExpr = function () {
    if (this.at('NAME', 'not')) { var t = this.next(); var x = this.notExpr(); return node('not', t, x, { a: x }); }
    return this.comparison();
  };
  P.comparison = function () {
    var a = this.sum();
    var CMP = ['==', '!=', '<', '>', '<=', '>='];
    while (true) {
      var t = this.peek(), op = null;
      if (t.t === 'OP' && CMP.indexOf(t.v) >= 0) { op = t.v; this.next(); }
      else if (t.t === 'NAME' && t.v === 'in') { op = 'in'; this.next(); }
      else if (t.t === 'NAME' && t.v === 'is') { this.next(); op = 'is'; if (this.at('NAME', 'not')) { this.next(); op = 'is not'; } }
      else if (t.t === 'NAME' && t.v === 'not' && this.peek(1).t === 'NAME' && this.peek(1).v === 'in') { this.next(); this.next(); op = 'not in'; }
      else break;
      var b = this.sum(); a = node('cmp', a, b, { op: op, a: a, b: b });
    }
    return a;
  };
  P.sum = function () {
    var a = this.term();
    while (this.at('OP', '+') || this.at('OP', '-')) { var ot = this.next(), op = ot.v; var b = this.term(); a = node('bin', a, b, { op: op, a: a, b: b, opcol: ot.col }); }
    return a;
  };
  P.term = function () {
    var a = this.unary();
    while (this.at('OP', '*') || this.at('OP', '/') || this.at('OP', '//') || this.at('OP', '%')) {
      var op = this.next().v; var b = this.unary(); a = node('bin', a, b, { op: op, a: a, b: b });
    }
    return a;
  };
  P.unary = function () {
    if (this.at('OP', '-') || this.at('OP', '+')) { var t = this.next(); var x = this.unary(); return node('neg', t, x, { op: t.v, a: x }); }
    return this.primary();
  };
  P.primary = function () {
    var a = this.atom();
    while (this.at('OP', '(')) {
      this.next(); this.level++;
      var args = [];
      if (!this.at('OP', ')')) {
        while (true) {
          var startTok = this.peek();
          var x = this.expr();
          args.push(x);
          this.checkTk();
          if (this.at('OP', ',')) { this.next(); if (this.at('OP', ')')) break; continue; }
          if (this.at('OP', ')')) break;
          var nt = this.peek();
          if (this.startsExpr(nt) && !(x.k === 'name' && startTok.t === 'NAME' && nt.t === 'STRING' && this.toks[this.toks.indexOf(startTok) + 1] === nt)) {
            var save = this.p, b = null;
            try { b = this.expr(); } catch (e) { b = null; }
            this.p = save;
            // 3.14: "a" + x  " b" reads as a word left outside its string
            if (b && nt.t === 'STRING' && x.k === 'bin' && x.op === '+' && x.a.k === 'str' && !x.a.paren && !x.paren) {
              var xb = x.b.paren || x.b;
              throw SynErr('SyntaxError', 'invalid syntax. Is this intended to be part of the string?', x.line, x.opcol + 1, xb.ecol + 1);
            }
            if (b) throw SynErr('SyntaxError', 'invalid syntax. Perhaps you forgot a comma?', x.line, x.col + 1, b.ecol + 1,
              { eline: b.eline, comma: true, tokIdx: this.toks.indexOf(nt) });
          }
          throw this.generic(nt);
        }
      }
      var close = this.expectOp(')'); this.level--;
      a = { k: 'call', fn: a, args: args, line: (a.paren || a).line, col: (a.paren || a).col, eline: close.line, ecol: close.ecol };
    }
    return a;
  };
  P.atom = function () {
    this.checkTk();
    var t = this.peek();
    if (t.t === 'NAME') {
      if (t.v === 'None' || t.v === 'True' || t.v === 'False') { this.next(); return { k: 'const', v: t.v, line: t.line, col: t.col, eline: t.line, ecol: t.ecol }; }
      if (KW.indexOf(t.v) >= 0) throw this.generic(t);
      this.next(); return { k: 'name', id: t.v, line: t.line, col: t.col, eline: t.line, ecol: t.ecol };
    }
    if (t.t === 'NUMBER') { this.next(); return { k: 'num', v: parseInt(t.v.replace(/_/g, ''), 10), line: t.line, col: t.col, eline: t.line, ecol: t.ecol }; }
    if (t.t === 'STRING') {
      var parts = [this.next()];
      while (this.at('STRING')) parts.push(this.next());
      var last = parts[parts.length - 1];
      return { k: 'str', parts: parts, line: t.line, col: t.col, eline: last.line, ecol: last.ecol };
    }
    if (t.t === 'OP' && t.v === '(') {
      this.next(); this.level++;
      if (this.at('OP', ')')) { var c0 = this.next(); this.level--; return { k: 'tuple', items: [], line: t.line, col: t.col, eline: c0.line, ecol: c0.ecol }; }
      var x = this.expr();
      var c = this.expectOp(')'); this.level--;
      x = Object.assign({}, x); x.paren = { line: t.line, col: t.col, eline: c.line, ecol: c.ecol };
      return x;
    }
    throw this.generic(t);
  };

  /* compile-time checks the parser does not make (symtable) */
  function checkReturns(body, inFn, lines) {
    for (var i = 0; i < body.length; i++) {
      var s = body[i];
      if (s.k === 'return' && !inFn) {
        throw SynErr('SyntaxError', "'return' outside function", s.line, s.col + 1, s.ecol + 1, { compile: true });
      }
      if (s.k === 'def') checkReturns(s.body, true, lines);
    }
  }

  /* ---------- suggestions (CPython traceback.py, _levenshtein_distance and friends) ---------- */
  var MOVE = 2, CASE = 1;
  function subCost(a, b) { if (a === b) return 0; if (a.toLowerCase() === b.toLowerCase()) return CASE; return MOVE; }
  function lev(a, b, maxCost) {
    if (a === b) return 0;
    var pre = 0; while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
    a = a.slice(pre); b = b.slice(pre);
    var suf = 0; while (suf < a.length && suf < b.length && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
    a = a.slice(0, a.length - suf); b = b.slice(0, b.length - suf);
    if (!a.length || !b.length) return (a.length + b.length) * MOVE;
    if (a.length > b.length) { var tmp = a; a = b; b = tmp; }
    if ((b.length - a.length) * MOVE > maxCost) return maxCost + 1;
    var row = []; for (var i = 0; i < a.length; i++) row.push((i + 1) * MOVE);
    var result = 0;
    for (var bi = 0; bi < b.length; bi++) {
      var distance = bi * MOVE, minimum = Infinity; result = distance;
      for (var ai = 0; ai < a.length; ai++) {
        var substitute = distance + subCost(b[bi], a[ai]);
        distance = row[ai];
        var insert_delete = Math.min(result, distance) + MOVE;
        result = Math.min(insert_delete, substitute);
        row[ai] = result;
        if (result < minimum) minimum = result;
      }
      if (minimum > maxCost) return maxCost + 1;
    }
    return result;
  }
  function suggest(wrong, cands) {
    if (cands.length > 750 || wrong.length > 40) return null;
    var best = null, bestD = Infinity;
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (c === wrong) continue;
      var maxD = Math.floor((c.length + wrong.length + 3) * MOVE / 6);
      maxD = Math.min(maxD, bestD - 1);
      var d = lev(wrong, c, maxD);
      if (d > maxD) continue;
      if (!best || d < bestD) { best = c; bestD = d; }
    }
    return best;
  }
  /* difflib.SequenceMatcher(None, a, b).ratio() and get_close_matches */
  function longest(a, b, alo, ahi, blo, bhi) {
    var bi = 0, bj = 0, bs = 0, j2len = {};
    for (var i = alo; i < ahi; i++) {
      var nj = {};
      for (var j = blo; j < bhi; j++) {
        if (b[j] !== a[i]) continue;
        var k = (j2len[j - 1] || 0) + 1; nj[j] = k;
        if (k > bs) { bi = i - k + 1; bj = j - k + 1; bs = k; }
      }
      j2len = nj;
    }
    return [bi, bj, bs];
  }
  function matches(a, b) {
    var q = [[0, a.length, 0, b.length]], n = 0;
    while (q.length) {
      var r = q.pop(), m = longest(a, b, r[0], r[1], r[2], r[3]);
      if (m[2]) {
        n += m[2];
        if (r[0] < m[0] && r[2] < m[1]) q.push([r[0], m[0], r[2], m[1]]);
        if (m[0] + m[2] < r[1] && m[1] + m[2] < r[3]) q.push([m[0] + m[2], r[1], m[1] + m[2], r[3]]);
      }
    }
    return n;
  }
  function ratio(a, b) { var t = a.length + b.length; return t ? 2 * matches(a, b) / t : 1; }
  function closeMatches(word, poss, n, cutoff) {
    var res = [];
    poss.forEach(function (x) { var r = ratio(x, word); if (r >= cutoff) res.push([r, x]); });
    res.sort(function (p, q) { return q[0] - p[0] || (q[1] > p[1] ? 1 : q[1] < p[1] ? -1 : 0); });
    return res.slice(0, n).map(function (p) { return p[1]; });
  }
  function dedent(ls) {
    var min = Infinity;
    ls.forEach(function (l) { if (l.trim()) min = Math.min(min, l.length - l.replace(/^ +/, '').length); });
    if (min === Infinity) min = 0;
    return ls.map(function (l) { return l.trim() ? l.slice(min) : ''; });
  }
  // codeop.compile_command(..., ONLY_AST): parses or is merely incomplete
  function compilesAlone(code) {
    // codeop.compile_command(..., PyCF_ONLY_AST): fine if it parses, or if it only stops at the end of the source
    var tk = tokenize(code);
    if (tk.err && !tk.err.eof) return false;
    try { var ast = new Parser(tk, { loose: true }).file(); checkReturns(ast, false, tk.lines); return true; }
    catch (e) {
      if (e.unsupported) return true;
      if (tk.err && e === tk.err) return true;
      if (e.type === 'IndentationError' && /expected an indented block/.test(e.msg) && e.end === -1) return true;
      return false;
    }
  }
  function keywordTypos(err, lines) {
    if (err.msg !== 'invalid syntax' && err.msg.indexOf('Perhaps you forgot a comma') < 0) return err;
    var errLines = dedent(lines.slice(0, err.line)), code = errLines.join('\n');
    if (code.length > 1024) return err;
    var toks = tokenize(code).toks, left = 10;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.t !== 'NAME' || t.line !== err.line || KW.indexOf(t.v) >= 0) continue;
      if (--left < 0) break;
      var ms = [], s = suggest(t.v, KW);
      if (s) ms.push(s);
      ms = ms.concat(closeMatches(t.v, KW, 3, 0.5)).slice(0, 3);
      for (var j = 0; j < ms.length; j++) {
        if (!ms[j] || ms[j] === t.v) continue;
        var all = errLines.slice(), L = all[t.line - 1];
        all[t.line - 1] = L.slice(0, t.col) + ms[j] + L.slice(t.ecol);
        if (!compilesAlone(all.join('\n'))) continue;
        return SynErr('SyntaxError', "invalid syntax. Did you mean '" + ms[j] + "'?", t.line, t.col + 1, t.ecol + 1, { text: L });
      }
    }
    return err;
  }

  /* ---------- formatting ---------- */
  function formatSyntax(e, file, lines) {
    var out = '  File "' + file + '", line ' + e.line + '\n';
    if (e.text === null) return out + e.type + ': ' + e.msg + '\n';
    var text = e.text !== undefined ? e.text : lines[e.line - 1];
    if (text === undefined || text === null) text = '';
    var rtext = text.replace(/\n+$/, ''), ltext = rtext.replace(/^[ \n\f]+/, ''), spaces = rtext.length - ltext.length;
    var off = e.off, end = (e.end !== 0 && e.end !== undefined && e.end !== null) ? e.end : off;
    if (e.eline && e.eline !== e.line) end = rtext.length + 1;
    var tlen = text.length + 1; // python's text carries its newline
    if (text && off > tlen) off = rtext.length + 1;
    if (text && end > tlen) end = rtext.length + 1;
    if (off >= end || end < 0) end = off + 1;
    var colno = off - 1 - spaces, endcol = end - 1 - spaces;
    out += '    ' + ltext + '\n';
    if (colno >= 0 && !e.noCaret) {
      var cs = ''; for (var i = 0; i < colno; i++) cs += /\s/.test(ltext[i] || '') ? ltext[i] : ' ';
      out += '    ' + cs + new Array(Math.max(0, endcol - colno) + 1).join('^') + '\n';
    }
    out += e.type + ': ' + e.msg + '\n';
    return out;
  }
  function anchorsFor(n, line) {
    if (n.line !== n.eline) return null;
    if (n.paren) return null;
    if (n.k === 'bin' || n.k === 'cmp' && false) {
      var c = n.a.paren ? n.a.paren.ecol : n.a.ecol;
      while (c < line.length && (/\s/.test(line[c]) || line[c] === ')')) c++;
      var r = c + 1;
      var rstart = n.b.paren ? n.b.paren.col : n.b.col;
      if (r < line.length && r < rstart && !/\s/.test(line[r]) && '\\#'.indexOf(line[r]) < 0) r++;
      return [c, r];
    }
    if (n.k === 'call') {
      var f = n.fn.paren ? n.fn.paren.ecol : n.fn.ecol;
      while (f < line.length && line[f] !== '(') f++;
      return [f, n.ecol];
    }
    return null;
  }
  function showCarets(stmt, n, line) {
    var lead = line.length - line.replace(/^\s+/, '').length;
    if (stmt && (stmt.k === 'return' || stmt.k === 'assign') && stmt.e === n && n.k === 'call' && n.fn.k === 'name' && !n.paren &&
        n.col === stmt.e.col && n.ecol === line.replace(/\s+$/, '').length) {
      // _spawns_full_line: value spans to the end; start must equal its own col (always true here)
      return false;
    }
    return 'maybe';
  }
  function formatFrame(fr, file, lines) {
    var out = '  File "' + file + '", line ' + fr.n.line + ', in ' + fr.name + '\n';
    var raw = lines[fr.n.line - 1], n = fr.n;
    var col = n.paren ? n.paren.col : n.col, ecol = n.paren ? n.paren.ecol : n.ecol;
    if (n.line !== n.eline) {
      out += '    ' + raw.replace(/^\s+/, '') + '\n';
      return out;
    }
    var lead = raw.length - raw.replace(/^\s+/, '').length, line = raw.slice(lead);
    var s = col - lead, e = ecol - lead;
    var anc = anchorsFor(n, raw);
    var show;
    if (showCarets(fr.stmt, n, raw) === false) show = false;
    else if (anc) show = true;
    else show = !!(line.slice(0, s).trim() || line.slice(e).trim());
    out += '    ' + line + '\n';
    if (show) {
      var c = '';
      for (var i = 0; i < e; i++) {
        if (i < s) c += ' ';
        else if (anc && i >= anc[0] - lead && i < anc[1] - lead) c += '^';
        else c += anc ? '~' : '^';
      }
      out += '    ' + c + '\n';
    }
    return out;
  }

  /* ---------- values ---------- */
  var NONE = { t: 'NoneType' };
  function S(v) { return { t: 'str', v: v }; }
  function I(v) { return { t: 'int', v: v }; }
  function B(v) { return { t: 'bool', v: !!v }; }
  function pystr(x) {
    if (x.t === 'str') return x.v;
    if (x.t === 'int') return String(x.v);
    if (x.t === 'bool') return x.v ? 'True' : 'False';
    if (x.t === 'NoneType') return 'None';
    if (x.t === 'tuple') return '(' + x.v.map(pyrepr).join(', ') + (x.v.length === 1 ? ',' : '') + ')';
    if (x.t === 'function') return '<function ' + x.name + ' at 0x' + x.addr + '>';
    if (x.t === 'builtin') return x.wired ? '<function ' + x.name + ' at 0x' + x.addr + '>' : '<built-in function ' + x.name + '>';
    if (x.t === 'type') return "<class '" + x.name + "'>";
    return '?';
  }
  function pyrepr(x) {
    if (x.t === 'str') {
      var q = x.v.indexOf("'") >= 0 && x.v.indexOf('"') < 0 ? '"' : "'";
      return q + x.v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(q === "'" ? /'/g : /"/g, '\\' + q) + q;
    }
    return pystr(x);
  }
  function tname(x) { return x.t === 'builtin' ? (x.wired ? 'function' : 'builtin_function_or_method') : x.t; }
  function truthy(x) {
    if (x.t === 'bool') return x.v; if (x.t === 'int') return x.v !== 0; if (x.t === 'str') return x.v.length > 0;
    if (x.t === 'NoneType') return false; if (x.t === 'tuple') return x.v.length > 0; return true;
  }
  function Raise(type, msg) { return { pyerr: true, type: type, msg: msg }; }

  /* ---------- interpreter ---------- */
  function run(src, opts) {
    opts = opts || {};
    var file = opts.file || 'main.py';
    src = src.replace(/\r/g, '').replace(/\t/g, '    ').split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).join('\n');
    var tk = tokenize(src), lines = tk.lines;
    var res = { out: [], effects: [], error: null, red: '', src: src };
    var ast;
    var parser = new Parser(tk);
    try {
      ast = parser.file();
      checkReturns(ast, false, lines);
    } catch (e) {
      if (e.unsupported) { res.unsupported = { line: e.line, word: e.word }; return res; }
      if (!e.syntax) throw e;
      // pegen tokenizes the rest of the file after a parser error: a tokenizer error anywhere wins; an unclosed
      // bracket wins only when the parser had already read past its line
      if (tk.err && e !== tk.err && !e.final && !e.compile) {
        if (!tk.err.eof) e = tk.err;
        else if (parser.toks[parser.far].line > tk.err.line) e = tk.err;
      }
      if (e.unsupported) { res.unsupported = { line: e.line }; return res; }
      e = keywordTypos(e, lines);
      res.error = { type: e.type, msg: e.msg, line: e.line, syntax: true };
      res.red = formatSyntax(e, file, lines);
      return res;
    }
    var globals = {}, gorder = MODULE_GLOBALS.slice(), addr = 0x100a3c040, steps = 0;
    function gset(k, v) { if (!(k in globals)) gorder.push(k); globals[k] = v; }
    var builtins = {};
    function bi(name, fn, wired, params) { builtins[name] = { t: 'builtin', name: name, fn: fn, wired: wired, params: params, addr: (addr += 0x1a0).toString(16) }; }
    bi('print', function (args) { res.out.push(args.map(pystr).join(' ')); return NONE; });
    bi('str', function (args) { if (!args.length) return S(''); return S(pystr(args[0])); });
    bi('int', function (args) {
      if (!args.length) return I(0);
      var a = args[0];
      if (a.t === 'int') return a; if (a.t === 'bool') return I(a.v ? 1 : 0);
      if (a.t === 'str') { var m = /^\s*([+-]?\d[\d_]*)\s*$/.exec(a.v); if (m) return I(parseInt(m[1].replace(/_/g, ''), 10)); throw Raise('ValueError', "invalid literal for int() with base 10: " + pyrepr(a)); }
      throw Raise('TypeError', "int() argument must be a string, a bytes-like object or a real number, not '" + tname(a) + "'");
    });
    bi('len', function (args) {
      if (args.length !== 1) throw Raise('TypeError', 'len() takes exactly one argument (' + args.length + ' given)');
      if (args[0].t === 'str') return I(Array.from(args[0].v).length);
      if (args[0].t === 'tuple') return I(args[0].v.length);
      throw Raise('TypeError', "object of type '" + tname(args[0]) + "' has no len()");
    });
    bi('light', function (args) { res.effects.push({ fx: 'light', v: args[0] }); return NONE; }, true, ['beam']);
    bi('horn', function (args) { res.effects.push({ fx: 'horn', v: args[0] }); return NONE; }, true, ['blasts']);
    bi('radio', function (args) { res.effects.push({ fx: 'radio', v: args[0] }); return NONE; }, true, ['message']);

    var frames = [];
    function lookup(id, scope, n) {
      if (scope && scope.locals) {
        if (id in scope.vars) return scope.vars[id];
        if (scope.locals.indexOf(id) >= 0) throw Raise('UnboundLocalError', "cannot access local variable '" + id + "' where it is not associated with a value");
      }
      if (id in globals) return globals[id];
      if (id in builtins) return builtins[id];
      if (BUILTIN_NAMES.indexOf(id) >= 0) return { t: 'builtin', name: id, fn: null, addr: '0' };
      var cands = (scope && scope.locals ? Object.keys(scope.vars) : []).concat(gorder, BUILTIN_NAMES);
      var s = suggest(id, cands);
      var msg = "name '" + id + "' is not defined";
      if (s) msg += ". Did you mean: '" + s + "'?";
      else if (STDLIB.indexOf(id) >= 0) msg += ". Did you forget to import '" + id + "'?";
      throw Raise('NameError', msg);
    }
    function binop(op, a, b) {
      var ta = tname(a), tb = tname(b);
      if (op === '+') {
        if (a.t === 'str' && b.t === 'str') return S(a.v + b.v);
        if ((a.t === 'int' || a.t === 'bool') && (b.t === 'int' || b.t === 'bool')) return I(+a.v + +b.v);
        if (a.t === 'str') throw Raise('TypeError', 'can only concatenate str (not "' + tb + '") to str');
        if (a.t === 'tuple' && b.t === 'tuple') return { t: 'tuple', v: a.v.concat(b.v) };
        if (a.t === 'tuple') throw Raise('TypeError', 'can only concatenate tuple (not "' + tb + '") to tuple');
      }
      if (op === '-' && (a.t === 'int' || a.t === 'bool') && (b.t === 'int' || b.t === 'bool')) return I(a.v - b.v);
      if (op === '*') {
        if ((a.t === 'int' || a.t === 'bool') && (b.t === 'int' || b.t === 'bool')) return I(a.v * b.v);
        if (a.t === 'str' && (b.t === 'int' || b.t === 'bool')) return S(new Array(Math.max(0, +b.v) + 1).join(a.v));
        if (b.t === 'str' && (a.t === 'int' || a.t === 'bool')) return S(new Array(Math.max(0, +a.v) + 1).join(b.v));
        if (a.t === 'str' || b.t === 'str') throw Raise('TypeError', "can't multiply sequence by non-int of type '" + (a.t === 'str' ? tb : ta) + "'");
      }
      if (op === '//' || op === '%' || op === '/') {
        if ((a.t === 'int' || a.t === 'bool') && (b.t === 'int' || b.t === 'bool')) {
          if (+b.v === 0) throw Raise('ZeroDivisionError', op === '/' ? 'division by zero' : op === '//' ? 'integer division or modulo by zero' : 'integer modulo by zero');
          if (op === '//') return I(Math.floor(a.v / b.v));
          if (op === '%') return I(((a.v % b.v) + +b.v) % b.v);
          throw { unsupported: true };
        }
        if (op === '%' && a.t === 'str') throw { unsupported: true };
      }
      throw Raise('TypeError', 'unsupported operand type(s) for ' + op + ": '" + ta + "' and '" + tb + "'");
    }
    function eq(a, b) {
      if ((a.t === 'int' || a.t === 'bool') && (b.t === 'int' || b.t === 'bool')) return +a.v === +b.v;
      if (a.t !== b.t) return false;
      if (a.t === 'str') return a.v === b.v; if (a.t === 'NoneType') return true;
      return a === b;
    }
    function ev(n, scope) {
      if (++steps > 20000) throw { tooLong: true };
      switch (n.k) {
        case 'num': return I(n.v);
        case 'const': return n.v === 'None' ? NONE : B(n.v === 'True');
        case 'str':
          var s = '';
          n.parts.forEach(function (p) {
            if (p.prefix && p.prefix.indexOf('f') >= 0) {
              s += p.v.replace(/\{\{|\}\}|\{([^{}]*)\}/g, function (m0, inner) {
                if (m0 === '{{') return '{'; if (m0 === '}}') return '}';
                var sub = tokenize(inner.trim()), x;
                try { x = new Parser(sub).expr(); } catch (e) { throw { unsupported: true }; }
                return pystr(ev(x, scope));
              });
            } else s += p.v;
          });
          return S(s);
        case 'tuple': return { t: 'tuple', v: [] };
        case 'name': return lookup(n.id, scope, n);
        case 'neg':
          var x = ev(n.a, scope);
          if (x.t === 'int' || x.t === 'bool') return I(n.op === '-' ? -x.v : +x.v);
          throw Raise('TypeError', "bad operand type for unary " + n.op + ": '" + tname(x) + "'");
        case 'not': return B(!truthy(ev(n.a, scope)));
        case 'bool':
          var l = ev(n.a, scope);
          if (n.op === 'or') return truthy(l) ? l : ev(n.b, scope);
          return truthy(l) ? ev(n.b, scope) : l;
        case 'cmp':
          var a = ev(n.a, scope), b = ev(n.b, scope);
          if (n.op === '==') return B(eq(a, b)); if (n.op === '!=') return B(!eq(a, b));
          if (n.op === 'is') return B(a === b || a.t === 'NoneType' && b.t === 'NoneType');
          if (n.op === 'is not') return B(!(a === b || a.t === 'NoneType' && b.t === 'NoneType'));
          if (n.op === 'in' || n.op === 'not in') {
            if (b.t !== 'str') throw Raise('TypeError', "argument of type '" + tname(b) + "' is not a container or iterable");
            if (a.t !== 'str') throw Raise('TypeError', "'in <string>' requires string as left operand, not " + tname(a));
            var r = b.v.indexOf(a.v) >= 0; return B(n.op === 'in' ? r : !r);
          }
          var num = function (x) { return x.t === 'int' || x.t === 'bool'; };
          if (num(a) && num(b) || a.t === 'str' && b.t === 'str') {
            var A = num(a) ? +a.v : a.v, Bv = num(b) ? +b.v : b.v;
            return B(n.op === '<' ? A < Bv : n.op === '>' ? A > Bv : n.op === '<=' ? A <= Bv : A >= Bv);
          }
          throw Raise('TypeError', "'" + n.op + "' not supported between instances of '" + tname(a) + "' and '" + tname(b) + "'");
        case 'bin':
          var x1 = ev(n.a, scope), x2 = ev(n.b, scope);
          try { return binop(n.op, x1, x2); } catch (e) { if (e.pyerr) e.at = n; throw e; }
        case 'call':
          var f = ev(n.fn, scope);
          var args = n.args.map(function (a2) { return ev(a2, scope); });
          try { return call(f, args, n); } catch (e) { if (e.pyerr && !e.at) e.at = n; throw e; }
      }
      throw { unsupported: true };
    }
    function argErr(name, params, given) {
      var np = params.length;
      if (given > np) return Raise('TypeError', name + '() takes ' + np + ' positional argument' + (np === 1 ? '' : 's') + ' but ' + given + ' ' + (given === 1 ? 'was' : 'were') + ' given');
      var miss = params.slice(given);
      var list = miss.length === 1 ? "'" + miss[0] + "'" : miss.slice(0, -1).map(function (m) { return "'" + m + "'"; }).join(', ') + (miss.length > 2 ? ',' : '') + " and '" + miss[miss.length - 1] + "'";
      return Raise('TypeError', name + '() missing ' + miss.length + ' required positional argument' + (miss.length === 1 ? '' : 's') + ': ' + list);
    }
    function call(f, args, n) {
      if (f.t === 'builtin') {
        if (!f.fn) throw { unsupported: true };
        if (f.wired && args.length !== f.params.length) throw argErr(f.name, f.params, args.length);
        return f.fn(args);
      }
      if (f.t === 'function') {
        if (args.length !== f.params.length) throw argErr(f.name, f.params, args.length);
        if (frames.length > 900) throw Raise('RecursionError', 'maximum recursion depth exceeded');
        var scope = { vars: {}, locals: f.locals };
        f.params.forEach(function (p, i) { scope.vars[p] = args[i]; });
        frames.push({ name: f.name, scope: scope });
        try {
          var r = exec(f.body, scope);
          frames.pop();
          return r && r.ret ? r.v : NONE;
        } catch (e) {
          if (e.pyerr && !e.tb) e.tb = [];
          throw e;
        }
      }
      throw Raise('TypeError', "'" + tname(f) + "' object is not callable");
    }
    function assigned(body) {
      var out = [];
      body.forEach(function (s) { if (s.k === 'assign' && out.indexOf(s.target) < 0) out.push(s.target); if (s.k === 'def' && out.indexOf(s.name) < 0) out.push(s.name); });
      return out;
    }
    function exec(body, scope) {
      for (var i = 0; i < body.length; i++) {
        var s = body[i];
        try {
          if (s.k === 'pass') continue;
          if (s.k === 'expr') { ev(s.e, scope); continue; }
          if (s.k === 'assign') {
            var v = ev(s.e, scope);
            if (scope && scope.locals) scope.vars[s.target] = v; else gset(s.target, v);
            continue;
          }
          if (s.k === 'return') return { ret: true, v: s.e ? ev(s.e, scope) : NONE };
          if (s.k === 'def') {
            var fn = { t: 'function', name: s.name, params: s.params, body: s.body, locals: s.params.concat(assigned(s.body)), addr: (addr += 0x160).toString(16) };
            if (scope && scope.locals) scope.vars[s.name] = fn; else gset(s.name, fn);
            continue;
          }
        } catch (e) {
          if (e.pyerr) {
            e.tb = e.tb || [];
            e.tb.unshift({ name: scope && scope.locals ? frames[frames.length - 1].name : '<module>', stmt: s, n: e.at || s.e || s });
            if (scope && scope.locals) { frames.pop(); e.at = null; }
          }
          throw e;
        }
      }
      return null;
    }
    // names resolve per CPython: an undefined name's node is the Name itself
    var origLookup = lookup;
    lookup = function (id, scope, n) {
      try { return origLookup(id, scope, n); } catch (e) { if (e.pyerr) e.at = n; throw e; }
    };
    try {
      exec(ast, null);
    } catch (e) {
      if (e.unsupported) { res.unsupported = { runtime: true }; return res; }
      if (e.tooLong) { res.unsupported = { tooLong: true }; return res; }
      if (!e.pyerr) throw e;
      // the innermost frame's node is where the error was raised; outer frames point at their calls
      var tb = e.tb, red = 'Traceback (most recent call last):\n';
      tb.forEach(function (fr, i) {
        if (i < tb.length - 1) fr.n = callNodeIn(fr.stmt, fr.n);
        red += formatFrame(fr, file, lines);
      });
      red += e.type + ': ' + e.msg + '\n';
      res.error = { type: e.type, msg: e.msg, line: tb[tb.length - 1].n.line };
      res.red = red;
    }
    return res;
  }
  // an outer frame's position is the call it was making; we stored that call node when it raised
  function callNodeIn(stmt, n) { return n; }

  return { run: run, tokenize: tokenize, suggest: suggest, ratio: ratio, closeMatches: closeMatches, BUILTIN_NAMES: BUILTIN_NAMES, KW: KW };
}));
