/* J2 L5 THE SEARCH, Version 2: the small Python BEEP reads (spec V2 §5.3, §5.4, §7.2, §7.6, §8.2, §9.2, §9.3, §10.4).
   Py.read(lines, opts) checks every line BEFORE anything flies. It gives back
   { ok: true, prog } or { ok: false, line: index, msg }.
   Py.trace(prog, opts) turns a program into the list of steps the run view lights, one at a time.
   opts.known: the instructions this task knows (e.g. ['forward', 'look']).
   opts.loops: true when a for line is allowed here. opts.card: the card's lines, for the worked examples in the fixes.
   opts.i: true when i may be used inside a job line (chapter 3 on). opts.whileOk: true when while True: may run (chapter 4's
   first barn run); opts.whileNo: true when it is read but refused ("Use for and range").
   A number in a job line is a plain number, or { k } for k times i (forward(i * 10) is { k: 10 }; say(i) is { k: 1 }). */
(function () {
  'use strict';
  var Py = {};
  function example(name, card) {
    for (var i = 0; i < (card || []).length; i++) { var c = card[i].trim(); if (c.indexOf(name + '(') === 0) return c; }
    return name === 'look' ? 'look()' : name + '(10)';
  }
  function forExample(card) { for (var i = 0; i < (card || []).length; i++) if (/^for /.test(card[i].trim())) return card[i].trim(); return 'for i in range(20):'; }
  var NEEDS_NUMBER = { forward: 1, left: 1, right: 1, say: 1 };
  var NO_COUNT = 'while True has no count. Use for and range.';
  /* what is inside the brackets: a number, i, i * n or n * i. Gives { v } or { msg } or null */
  function value(inner, low, ex, opts) {
    var s = inner.trim(), m;
    if (/^\d+$/.test(s)) return { v: +s };
    if (!opts.i) return null;
    if (s === 'i') return { v: { k: 1, src: 'i' } };
    if (s === 'I' || /^I\s*\*|\*\s*I$/.test(s)) return { msg: 'Use a small i. Python sees i and I as different names.' };
    if ((m = s.match(/^i\s*\*\s*(\d+)$/))) return { v: { k: +m[1], src: 'i * ' + m[1] } };
    if ((m = s.match(/^(\d+)\s*\*\s*i$/))) return { v: { k: +m[1], src: m[1] + ' * i' } };
    if ((m = s.match(/^i\s*[xX×]\s*(\d+)$/)) || (m = s.match(/^(\d+)\s*[xX×]\s*i$/))) return { msg: 'Python uses * for times, not x: i * ' + m[1] };
    return null;
  }
  /* one line, no spaces at its start: what it is, or what is wrong with it */
  function readLine(s, n, opts) {
    var card = opts.card, known = opts.known, m, cantRead = { msg: 'BEEP cannot read line ' + n + '. The lines to type are on the card.' };
    if (/^while\b/i.test(s)) {
      if (!/^while\s+True\s*:$/.test(s)) return cantRead;
      if (opts.whileOk) return { stmt: { type: 'for', n: Infinity, endless: true } };
      if (opts.whileNo) return { msg: NO_COUNT };
      return cantRead;
    }
    if (/^for\b/i.test(s) || /^for\b/i.test(s.replace(/^For/, 'for'))) {
      if (!opts.loops) return cantRead;
      if (/^For\b/.test(s) || /^FOR\b/.test(s)) return { msg: 'Python needs the word for in small letters. Type for, not For.' };
      if ((m = s.match(/^for\s+i\s+in\s+range\((\d+)\)\s*:$/))) return { stmt: { type: 'for', n: +m[1] } };
      if (/^for\s+i\s+in\s+range\(\s*\?\s*\)\s*:?$/.test(s)) return { msg: 'Change the ? to the number of walls.' };
      if (/^for\s+i\s+in\s+range\(\s*\)\s*:?$/.test(s)) return { msg: 'range needs a number in its brackets. Count the walls.' };
      if ((m = s.match(/^for\s+i\s+in\s+range\((\d+)\)\s*$/))) return { msg: 'The for line needs a colon : at the end.' };
      if ((m = s.match(/^for\s+i\s+in\s+range\s*\(?\s*(\d+)\s*\)?\s*:?$/)) && !/range\(\d+\)/.test(s)) return { msg: 'range needs brackets round its number: range(' + m[1] + ')' };
      if (/^for\s+in\b/.test(s)) return { msg: 'The for line needs the letter i: ' + forExample(card) };
      return cantRead;
    }
    if ((m = s.match(/^([A-Za-z_]+)\s*(.*)$/))) {
      var name = m[1], low = name.toLowerCase(), rest = m[2];
      if (known.indexOf(low) === -1) return cantRead;
      var ex = example(low, card);
      if (name !== low) return { msg: 'Python needs ' + low + ' in small letters: ' + ex };
      if (NEEDS_NUMBER[low]) {
        if ((m = rest.match(/^\((.+)\)$/))) {
          var val = value(m[1], low, ex, opts);
          if (val && val.msg) return val;
          if (val) return { stmt: { type: 'cmd', op: low, v: val.v } };
          return cantRead;
        }
        if (/^\(\s*\)$/.test(rest)) return { msg: low + ' needs a number in its brackets: ' + ex };
        if (/^\(\s*[\w *]+$/.test(rest) && !/\)/.test(rest)) return { msg: 'That line needs a closing bracket at the end: ' + ex };
        if (/^\d+$/.test(rest)) return { msg: low + ' needs brackets round its number: ' + ex };
        if (low === 'say' && /^[iI]$/.test(rest)) return { msg: 'say needs brackets round the i: say(i)' };
        return cantRead;
      }
      if (low === 'look') {
        if (/^\(\)$/.test(rest)) return { stmt: { type: 'cmd', op: 'look' } };
        if (rest === '') return { msg: 'look needs its brackets, with nothing inside: look()' };
        if (/^\($/.test(rest)) return { msg: 'That line needs a closing bracket at the end: look()' };
        if (/^\(.+\)$/.test(rest)) return { msg: 'look takes nothing in its brackets: look()' };
        return cantRead;
      }
    }
    return cantRead;
  }
  Py.read = function (lines, opts) {
    var prog = [], open = null, i, raw, ind, s, r;
    for (i = 0; i < lines.length; i++) {
      raw = lines[i].replace(/\s+$/, ''); if (!raw.trim()) continue;
      ind = raw.length - raw.replace(/^ +/, '').length; s = raw.trim();
      if (ind !== 0 && ind !== 4) return { ok: false, line: i, msg: 'Use 4 spaces before each job line. The Tab key puts in 4 spaces.' };
      r = readLine(s, i + 1, opts); if (r.msg) return { ok: false, line: i, msg: r.msg };
      var st = r.stmt; st.line = i;
      if (ind === 4) {
        if (!open) return { ok: false, line: i, msg: 'Line ' + (i + 1) + ' starts with spaces, but there is no for line above it.' };
        if (st.type === 'for') return { ok: false, line: i, msg: 'BEEP cannot read line ' + (i + 1) + '. The lines to type are on the card.' };
        open.body.push(st); continue;
      }
      if (open && !open.body.length) return { ok: false, line: i, msg: 'Put 4 spaces before ' + s + ', so it is part of the job.' };
      open = null;
      if (st.type === 'for') { st.body = []; open = st; }
      prog.push(st);
    }
    if (open && !open.body.length) return { ok: false, line: open.line, msg: 'The for line needs its job under it, moved in by 4 spaces.' };
    if (!prog.length) return { ok: false, line: 0, msg: 'The box is empty. Type the lines on the card first.' };
    return { ok: true, prog: prog };
  };
  /* a job line's number in a round: i is round - 1 */
  Py.val = function (v, i) { return v != null && typeof v === 'object' ? v.k * i : v; };
  /* the steps the run view lights: {line, op, v, i, src, round, of, endless, loopLine, back (going round again)}.
     A while True loop is cut at opts.cap rounds (default 40): the run view goes on until she stops it or the cap. */
  Py.trace = function (prog, opts) {
    var out = [], cap = (opts && opts.cap) || 40;
    prog.forEach(function (st) {
      if (st.type === 'cmd') { out.push({ line: st.line, op: st.op, v: Py.val(st.v, 0) }); return; }
      var n = st.endless ? cap : st.n;
      for (var r = 0; r < n; r++) {
        out.push({ line: st.line, op: 'round', round: r + 1, of: st.endless ? null : st.n, endless: !!st.endless, i: r, loopLine: st.line, back: r > 0 });
        st.body.forEach(function (b) {
          var step = { line: b.line, op: b.op, v: Py.val(b.v, r), i: r, round: r + 1, of: st.endless ? null : st.n, endless: !!st.endless, loopLine: st.line };
          if (b.v != null && typeof b.v === 'object') step.src = b.v.src;
          out.push(step);
        });
      }
    });
    return out;
  };
  /* the lines as typed, without blank lines or end spaces: used to compare with the card */
  Py.clean = function (lines) { return lines.map(function (l) { return l.replace(/\s+$/, ''); }).filter(function (l) { return l.trim(); }); };
  Py.NO_COUNT = NO_COUNT;
  if (typeof window !== 'undefined') window.Py = Py;
  if (typeof module !== 'undefined') module.exports = Py;
})();
