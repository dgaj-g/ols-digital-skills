/* TWO LIGHTS · the judge (spec §5.5), its own module, separated from the story.
   It reads her lines against the chapter's canonical program: whitespace normalised, blank lines and comment lines
   never matter, accepted alternates per fix. It decides which faults still stand, which correct line she has broken,
   whether the program is clean, and the effects by the §5.5 table. It never runs her code to decide anything.
   The words she sees in her console (prints, or Python's red) come from PyRun, the red printer, gated byte for byte
   against python3 by l5-redtext.
   UMD: window.TwoLightsJudge in the page, require() in the gates. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./programs.js'), require('./pyrun.js'));
  else root.TwoLightsJudge = factory(root.TwoLightsPrograms, root.PyRun);
}(typeof self !== 'undefined' ? self : this, function (PR, Py) {
  'use strict';

  // the five poster kinds (§8 bounty board); fault id → kind
  var KIND = { S1: 'name', S2: 'type', S3: 'indent', Q1: 'called', Q2: 'return', Q3: 'called' };
  var SHOUT = { S1: true, S2: true, S3: true };

  /* ---------- normalising ---------- */
  var TOK = /"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|[A-Za-z_][A-Za-z_0-9]*|\d+|\S/g;
  function norm(line) {
    var s = String(line).replace(/\t/g, '    ').replace(/\s+$/, '');
    var ind = /^\s+/.test(s) ? '>' : '';
    var toks = s.trim().match(TOK) || [];
    toks = toks.map(function (t) {   // 'x' and "x" are the same string to Python
      if (t[0] === "'" && t.length > 1 && t[t.length - 1] === "'") return '"' + t.slice(1, -1).replace(/"/g, '\\"') + '"';
      return t;
    });
    return ind + toks.join(' ');
  }
  function significant(line) { var t = String(line).trim(); return t !== '' && t[0] !== '#'; }

  /* ---------- the chapter's canonical program, its faults and alternates ---------- */
  function diffOne(a, b) {
    // a = canonical lines, b = a with one line changed or deleted → {idx, form}
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return b.length < a.length ? { idx: i, form: null } : { idx: i, form: b[i] };
    }
    return null;
  }
  var cache = {};
  function chapter(ch, seatKey) {
    var key = ch + seatKey;
    if (cache[key]) return cache[key];
    var s = PR.SEATS[seatKey], canon, faults = [], given;
    if (ch === 'ch1') {
      canon = PR.ch1(s, 2).split('\n'); given = PR.ch1(s, 0);
      var f1 = diffOne(PR.ch1(s, 1).split('\n'), PR.ch1(s, 0).split('\n'));
      var f2 = diffOne(canon, PR.ch1(s, 1).split('\n'));
      faults.push({ id: 'S1', idx: f1.idx, form: f1.form }, { id: 'S2', idx: f2.idx, form: f2.form });
    } else if (ch === 'ch2') {
      canon = PR.ch2(s, true).split('\n'); given = PR.ch2(s, false);
      faults.push({ id: 'Q1', idx: canon.length - 1, form: null });
    } else if (ch === 'ch3') {
      canon = PR.ch3(s, 'after').split('\n'); given = PR.ch3(s, null);
      faults.push({ id: 'Q2', idx: canon.indexOf('    return channel'), form: null });
    } else if (ch === 'ch4') {
      canon = PR.ch4(s, []).split('\n'); given = null;   // given depends on the seat's seeded variant
      ['S1', 'S2', 'S3', 'Q1', 'Q2', 'Q3'].forEach(function (f) {
        var d = diffOne(canon, PR.ch4(s, [f]).split('\n'));
        faults.push({ id: f, idx: d.idx, form: d.form });
      });
    } else throw new Error('judge: no chapter ' + ch);
    // alternates (§5.3): return(channel) and return 180 + rocks; the print in bearing may be replaced by the return
    var alts = {}, optional = {};
    canon.forEach(function (l, i) {
      if (l === '    return channel') alts[i] = [norm('    return(channel)'), norm('    return 180 + rocks')];
      if (l === '    print("Bearing " + str(channel))') optional[i] = true;
    });
    // calls that may be repeated (a second fog_horn() is two horns, not a fault)
    var repeatable = {}; repeatable[norm('fog_horn()')] = true; repeatable[norm('lamp_on()')] = true;
    var c = { ch: ch, seat: s, canon: canon, given: given, faults: faults, alts: alts, optional: optional, repeatable: repeatable };
    cache[key] = c;
    return c;
  }
  function givenProgram(ch, seatKey, variant) {
    var c = chapter(ch, seatKey);
    return ch === 'ch4' ? PR.ch4(c.seat, PR.variantFaults(variant)) : c.given;
  }

  /* ---------- alignment: LCS over significant lines ---------- */
  function align(her, canonN, canonIdx, c) {
    var n = her.length, m = canonN.length, i, j;
    var eq = function (a, b) { var al = c.alts[canonIdx[b]]; return her[a].n === canonN[b] || (al && al.indexOf(her[a].n) >= 0); };
    var L = []; for (i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i][j] = eq(i, j) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var pairs = [], gaps = [], gi = [], gj = [];
    i = 0; j = 0;
    var flush = function () { if (gi.length || gj.length) gaps.push({ her: gi, canon: gj }); gi = []; gj = []; };
    while (i < n && j < m) {
      if (eq(i, j)) { flush(); pairs.push([i, j]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { gi.push(i); i++; }
      else { gj.push(j); j++; }
    }
    while (i < n) gi.push(i++);
    while (j < m) gj.push(j++);
    flush();
    return { pairs: pairs, gaps: gaps };
  }

  /* ---------- judge one program ----------
     judge(ch, seatKey, text, {variant}) → {
       faults: {id: {present, line, kind, shout}},   (only the faults this seat was given in this chapter)
       broken: [{line, canonLine}],                   (a correct line she has changed or lost: "Line N was right before.")
       shout, clean, effects: {lamp, horn, radio, prints}, red, console, run (the PyRun result) } */
  function judge(ch, seatKey, text, opts) {
    opts = opts || {};
    var c = chapter(ch, seatKey);
    var givenTxt = givenProgram(ch, seatKey, opts.variant);
    var mine = ch === 'ch4' ? PR.variantFaults(opts.variant) : c.faults.map(function (f) { return f.id; });
    var raw = String(text).replace(/\r/g, '').split('\n');
    var her = [];
    raw.forEach(function (l, k) { if (significant(l)) her.push({ n: norm(l), line: k + 1 }); });
    var canonIdx = [], canonN = [];
    c.canon.forEach(function (l, k) { if (significant(l)) { canonIdx.push(k); canonN.push(norm(l)); } });
    // two faults can share a line (S2/S3 on the print, S1/Q3 on the call); a seat is only ever given one of them
    var faultAt = {}; c.faults.forEach(function (f) { if (mine.indexOf(f.id) >= 0) faultAt[f.idx] = f; });

    var a = align(her, canonN, canonIdx, c);
    // a lost call typed back anywhere (help: "Type lamp_on() on a new last line.") is that call: order only moves prints
    a.gaps.forEach(function (g) {
      g.canon = g.canon.filter(function (ci) {
        if (!c.repeatable[canonN[ci]]) return true;
        for (var q = 0; q < a.gaps.length; q++) {
          var hs = a.gaps[q].her;
          for (var r = 0; r < hs.length; r++) if (her[hs[r]].n === canonN[ci]) { a.pairs.push([hs[r], ci]); hs.splice(r, 1); return false; }
        }
        return true;
      });
    });
    var matched = {}, matchedLine = {};
    a.pairs.forEach(function (p) { matched[canonIdx[p[1]]] = true; matchedLine[canonIdx[p[1]]] = her[p[0]].line; });
    var faults = {}, broken = [], repeats = [];
    mine.forEach(function (id) { faults[id] = { present: false, line: null, kind: KIND[id], shout: !!SHOUT[id] }; });

    // where would canonical line k sit in her numbering? (after the her-line matched to the nearest earlier canon line)
    function herLineFor(k) {
      for (var q = k - 1; q >= 0; q--) if (matchedLine[q]) return matchedLine[q] + 1;
      return her.length ? her[0].line : 1;
    }
    a.gaps.forEach(function (g) {
      var hs = g.her.slice(), cs = g.canon.slice();
      // pair changed lines one to one, in order; leftovers are lost lines or extra lines
      while (hs.length && cs.length) {
        var h = her[hs.shift()], k = canonIdx[cs.shift()], f = faultAt[k];
        if (f && faults[f.id]) { faults[f.id].present = true; faults[f.id].line = h.line; }
        else broken.push({ line: h.line, canonLine: c.canon[k] });   // includes a fault she was not given, typed in
      }
      cs.forEach(function (ci) {
        var k = canonIdx[ci], f = faultAt[k];
        if (c.optional[k]) return;
        if (f && faults[f.id]) { faults[f.id].present = true; faults[f.id].line = herLineFor(k); }
        else broken.push({ line: herLineFor(k), canonLine: c.canon[k], lost: true });
      });
      hs.forEach(function (hi) {
        var h = her[hi];
        if (c.repeatable[h.n]) repeats.push(h.line);
        else broken.push({ line: h.line, canonLine: null });
      });
    });

    var run = Py.run(String(text), { file: c.seat.file });
    // shouting = Python shows red. A shouting fault can sleep: S2 with Q3 never reaches the + until lamp_on() is called.
    var shout = !!run.error;

    // effects table (§5.5), from the lines alone
    var effects = { lamp: 0, horn: 0, radio: null };
    if (!shout) {
      var has = function (l) { var k = c.canon.indexOf(l); return k >= 0 && !!matched[k]; };
      var callCount = function (l) {
        var nl = norm(l), n = 0;
        her.forEach(function (h) { if (h.n === nl) n++; });
        return n;
      };
      var lampDefOk = c.canon.indexOf('def lamp_on():') < 0 ? false :
        has('def lamp_on():') && has('    print(name + " lamp on, beam " + str(beam))') && has('    light(beam)');
      var hornDefOk = has('def fog_horn():') && has('    horn(blasts)');
      if (lampDefOk) effects.lamp = callCount('lamp_on()');
      if (hornDefOk) effects.horn = callCount('fog_horn()');
      if (has('b = bearing()') && has('radio(b)')) {
        var retK = c.canon.indexOf('    return channel');
        effects.radio = matched[retK] ? String(180 + c.seat.rocks) : 'None';
      }
    }
    var brokenNow = broken.length > 0;
    var clean = !shout && !brokenNow && mine.every(function (id) { return !faults[id].present; }) && chapterDone(ch, effects, c);
    return { faults: faults, broken: broken, repeats: repeats, shout: shout, clean: clean, effects: effects,
      red: run.red || '', console: run.out || [], run: run };
  }
  function chapterDone(ch, e, c) {
    var want = String(180 + c.seat.rocks);
    if (ch === 'ch1') return e.lamp > 0;
    if (ch === 'ch2') return e.horn > 0;
    if (ch === 'ch3') return e.radio === want;
    return e.lamp > 0 && e.horn > 0 && e.radio === want;
  }

  return { judge: judge, norm: norm, chapter: chapter, givenProgram: givenProgram, KIND: KIND, SHOUT: SHOUT };
}));
