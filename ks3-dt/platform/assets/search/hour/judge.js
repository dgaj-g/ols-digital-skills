/* J2 L5 THE SEARCH — the judge. Pure: text in, {ok, key, n...} out. No DOM. Keys name lines in hour/strings.js. */
(function (root) {
  'use strict';
  var J = {};
  function trimR(t) { return String(t || '').replace(/\s+$/, ''); }
  function indentOf(t) { var m = /^( *)/.exec(t); return m[1].length; }
  /* ---- one forward/look line (chapter 1, 6.1 and 6.2). state: {atPrint, lit} ---- */
  J.line1 = function (text, st) {
    var t = trimR(text).trim(), m;
    if (/^forward\(10\)$/.test(t)) { if (st.atPrint > 0 && !st.lit) return { ok: false, key: 'fwdTwice', n: st.atPrint }; return { ok: true, key: 'fwdOk', act: 'fwd', n: st.atPrint + 1 }; }
    if (/^look\(\)$/.test(t)) { if (st.atPrint === 0 || st.lit) return { ok: false, key: 'lookTwice', n: st.atPrint }; return { ok: true, key: 'lookOk', act: 'look', n: st.atPrint }; }
    if (/^forward/i.test(t) && !/^forward/.test(t)) return { ok: false, key: 'capF' };
    if (/^look/i.test(t) && !/^look/.test(t)) return { ok: false, key: 'capL' };
    if (/^forward\(\s*\)$/.test(t)) return { ok: false, key: 'noNum' };
    if (/^forward\(\d*\s*$/.test(t)) return { ok: false, key: 'noClose' };
    if (/^forward\s*\d*$/.test(t) || /^forward\s+\d+\s*\)?$/.test(t)) return { ok: false, key: 'noBr' };
    if ((m = /^forward\((\d+)\)$/.exec(t))) return { ok: false, key: 'fwdN', n: +m[1] };
    if (/^look\(\s*$/.test(t)) return { ok: false, key: 'noClose' };
    if (/^look\s*$/.test(t) || /^look\s+\S+$/.test(t)) return { ok: false, key: 'lookNoBr' };
    if (/^look\(.+\)$/.test(t)) return { ok: false, key: 'lookArg' };
    return { ok: false, key: 'notRun' };
  };
  /* ---- a for line. want = the number the card asks for (or null = any). returns {ok,key,n} ---- */
  J.forLine = function (text, want) {
    var raw = trimR(text), t = raw.trim(), m;
    if (indentOf(raw) > 0) return { ok: false, key: 'forIndent' };
    if ((m = /^for i in range\((\d+)\):$/.exec(t))) { if (want != null && +m[1] !== want) return { ok: false, key: 'forN', n: +m[1] }; return { ok: true, key: 'forOk', n: +m[1] }; }
    if (/^for/i.test(t) && !/^for/.test(t)) return { ok: false, key: 'forCap' };
    if (/^for i in range\(\d+\)\s*$/.test(t)) return { ok: false, key: 'forNoColon' };
    if (/^for i in range\(\s*\):?$/.test(t)) return { ok: false, key: want == null ? 'noNum' : 'forNoNum' };
    if (/^for i in range\s*\d*\s*:?$/.test(t) || /^for i in range\(\d+:?$/.test(t) || /^for i in range\s+\d+\):?$/.test(t)) return { ok: false, key: 'forNoBr' };
    if (/^for (in|range)/.test(t)) return { ok: false, key: 'forNoI' };
    if (/^while/.test(t)) return { ok: false, key: 'whileAgain' };
    return { ok: false, key: 'notRun' };
  };
  /* ---- a pushed-in line. want = exact body text (e.g. 'forward(10)'). keys: in/noIndent/spaces + the body judge ---- */
  function bodyLine(text, want, keys, alt) {
    var raw = trimR(text), ind = indentOf(raw), t = raw.trim();
    if (t === want) { if (ind === 4) return { ok: true, key: keys.inKey }; if (ind === 0) return { ok: false, key: keys.noIndent }; return { ok: false, key: 'spaces' }; }
    var r = alt(t); if (r.key === 'notRun' && ind !== 4 && ind !== 0 && t) return { ok: false, key: 'spaces' }; return { ok: false, key: r.key, n: r.n };
  }
  J.loop1 = function (idx, text) {
    if (idx === 0) return J.forLine(text, 20);
    if (idx === 1) return bodyLine(text, 'forward(10)', { inKey: 'fwdIn', noIndent: 'fwdNoIndent' }, function (t) { return J.line1(t, { atPrint: 0, lit: false }); });
    return bodyLine(text, 'look()', { inKey: 'lookIn', noIndent: 'lookNoIndent' }, function (t) { return J.line1(t, { atPrint: 1, lit: false }); });
  };
  J.say1 = function (idx, text, want) {
    if (idx === 0) { var r = J.forLine(text, want); if (r.key === 'forN') r.key = 'forNcard'; return r; }
    var raw = trimR(text), ind = indentOf(raw), t = raw.trim(), m;
    if (t === 'say(i)') return ind === 4 ? { ok: true, key: 'sayOk' } : ind === 0 ? { ok: false, key: 'sayNoIndent' } : { ok: false, key: 'spaces' };
    if ((m = /^say\((\d+)\)$/.exec(t))) return { ok: false, key: 'say3', n: +m[1] };
    if (/^say\s+i$/.test(t) || /^say$/.test(t) || /^say\s*i\)?$/.test(t)) return { ok: false, key: 'sayNoBr' };
    return { ok: false, key: 'notRun' };
  };
  /* ---- parse a three-line plan into {n, body:[{op,arg}]} or {err:key} ---- */
  function parseArg(a) { a = a.trim(); var m;
    if (/^\d+$/.test(a)) return { k: 0, c: +a };
    if (a === 'i') return { k: 1, c: 0 };
    if ((m = /^i\s*\*\s*(\d+)$/.exec(a))) return { k: +m[1], c: 0, form: 'i*k' };
    if ((m = /^(\d+)\s*\*\s*i$/.exec(a))) return { k: +m[1], c: 0, form: 'k*i' };
    if ((m = /^i\s*\+\s*(\d+)$/.exec(a))) return { k: 1, c: +m[1] };
    return null; }
  J.parsePlan = function (lines) {
    var f = J.forLine(lines[0] || '', null); if (!f.ok) return { err: f.key, n: f.n };
    var body = [];
    for (var i = 1; i < lines.length; i++) { var raw = trimR(lines[i]); if (!raw.trim()) continue; var ind = indentOf(raw), t = raw.trim(), m;
      if (ind === 0) return { err: 'indent', line: i }; if (ind !== 4) return { err: 'spaces', line: i };
      if ((m = /^(forward|left|right|say)\((.*)\)$/.exec(t))) { var a = parseArg(m[2]); if (!a) return { err: 'notRun', line: i }; body.push({ op: m[1], arg: a }); }
      else if (/^look\(\)$/.test(t)) body.push({ op: 'look', arg: { k: 0, c: 0 } });
      else return { err: 'notRun', line: i }; }
    if (!body.length) return { err: 'notRun', line: 1 };
    return { n: f.n, body: body };
  };
  J.expand = function (plan, cap) { var acts = []; var N = Math.min(plan.n, cap || 400); for (var i = 0; i < N; i++) plan.body.forEach(function (b) { acts.push({ op: b.op, v: b.arg.k * i + b.arg.c, i: i }); }); return acts; };
  /* ---- chapter 2: field {walls, turn}. returns {run, pass, key, k, w, a} ---- */
  J.plan2 = function (lines, field) {
    var p = J.parsePlan(lines); if (p.err) return { run: false, key: p.err, n: p.n };
    var fwd = null, turn = null; p.body.forEach(function (b) { if (b.op === 'forward' && !fwd) fwd = b; if ((b.op === 'left' || b.op === 'right') && !turn) turn = b; });
    var out = { run: true, pass: false, k: p.n, w: field.walls, a: field.turn, plan: p };
    if (!fwd) { out.key = 'notRun'; out.run = false; return out; }
    if (fwd.arg.k !== 0 || fwd.arg.c !== 100) { out.key = 'wrongLen'; return out; }
    if (!turn) { out.key = 'noTurn'; return out; }
    if (turn.arg.k !== 0 || turn.arg.c !== field.turn) { out.key = 'wrongTurn'; return out; }
    var note = turn.op === 'right' ? 'wrongTurn' : null;
    if (p.n === field.walls) { out.pass = true; out.key = 'ok'; out.note = note; return out; }
    if (p.n === field.walls - 1) { out.key = 'short1'; return out; }
    if (p.n < field.walls - 1) { out.key = 'shortMore'; return out; }
    out.key = 'over'; return out;
  };
  /* ---- chapter 3 spiral: the lamb sits 85 m out on the arm flown at pass 9 (i*10 reaches her). ---- */
  J.plan3 = function (lines) {
    var p = J.parsePlan(lines); if (p.err) return { run: false, key: p.err, n: p.n };
    var fwd = null, turn = null; p.body.forEach(function (b) { if (b.op === 'forward' && !fwd) fwd = b; if ((b.op === 'left' || b.op === 'right') && !turn) turn = b; });
    var out = { run: true, pass: false, k: p.n, plan: p };
    if (!fwd) { out.key = 'notRun'; out.run = false; return out; }
    if (!turn) { out.key = 'noTurn'; return out; }
    if (fwd.arg.k === 0) { out.key = 'fwd10'; return out; }
    if (fwd.arg.k < 10) { out.key = 'fwdI'; return out; }
    var reach = fwd.arg.k * Math.max(0, p.n - 1) + fwd.arg.c, passAt = Math.ceil((85 - fwd.arg.c) / fwd.arg.k);
    if (reach < 85) { out.key = 'shortRange'; out.m = reach; return out; }
    out.pass = true; out.foundAt = passAt;
    if (turn.op === 'right') out.key = 'right90'; else if (p.n > passAt + 1) { out.key = 'longRange'; out.k = p.n - passAt - 1; } else if (fwd.arg.form === 'k*i') out.key = 'found10i'; else out.key = 'found';
    return out;
  };
  /* ---- chapter 4 fixes. idx 0 lane, 1 yard, 2 barn. returns {run, pass, key, k, a} ---- */
  J.fix4 = function (idx, lines) {
    if (idx === 2) { var f = J.forLine(lines[0], null); if (!f.ok) return { run: false, key: f.key === 'notRun' && /^while/.test(String(lines[0]).trim()) ? 'whileAgain' : f.key === 'forNoColon' ? 'noColon' : f.key };
      if (f.n === 6) return { run: true, pass: true, key: 'fixed', k: 6 }; return { run: true, pass: false, key: f.n > 6 ? 'big' : 'short', k: f.n }; }
    var p = J.parsePlan(lines); if (p.err) return { run: false, key: p.err, n: p.n };
    var fwd = null, turn = null; p.body.forEach(function (b) { if (b.op === 'forward' && !fwd) fwd = b; if ((b.op === 'left' || b.op === 'right') && !turn) turn = b; });
    if (idx === 0) { if (fwd && (fwd.arg.k !== 0 || fwd.arg.c !== 100)) return { run: true, pass: false, key: 'len', k: p.n };
      if (p.n === 6) return { run: true, pass: true, key: 'fixed', k: 6 }; return { run: true, pass: false, key: p.n > 6 ? 'over' : 'still', k: p.n }; }
    var a = turn ? turn.arg.c : 0; if (a !== 90) return { run: true, pass: false, key: 'turn', k: p.n, a: a };
    if (p.n !== 4) return { run: true, pass: false, key: 'count', k: p.n, a: 90 }; return { run: true, pass: true, key: 'fixed', k: 4, a: 90 };
  };
  J.free = function (lines) { var p = J.parsePlan(lines); return p.err ? null : p; };
  root.SearchJudge = J; if (typeof module !== 'undefined') module.exports = J;
})(typeof window !== 'undefined' ? window : global);
