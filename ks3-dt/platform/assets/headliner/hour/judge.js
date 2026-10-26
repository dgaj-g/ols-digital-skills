/* THE HEADLINER — the separated judge. window.Judge. Marks a cell by WHAT IT COMPUTES, never by its text.
   A task: { sheet, cell, expect, probes:[{set:{ref:value}, expect}], kind:'number'|'text', fill?:{from,to,expect:[],probes:[]} }
   Verdict codes (the UI maps each to its kind line in strings.js):
     ok           — right value and it follows the numbers it should
     empty        — nothing in the cell yet
     typed        — the right number, but typed by hand (not a formula) — fails: it would never update
     error        — the formula shows an error code (#NAME?, #VALUE!, #DIV/0!, #REF!, #SYNTAX, #CYCLE!)
     wrong        — a formula, but the wrong number comes out
     no-follow    — right number now, but when a number it should use changes, it does not follow (wrong cell used)
     (a swapped IF shows the wrong words straight away, so it is 'wrong'; the UI's text line asks which words go in which slot)
     fill-wobble  — after filling down, later rows are wrong (missing the pin $ or wrong cells)
   Every check runs on a CLONE of the workbook, so probing never touches what she sees. */
(function (global) {
  'use strict';
  var S = global.Sheet;
  function near(a, b) { if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 0.005; if (typeof a === 'string' && typeof b === 'string') return a.trim().toLowerCase() === b.trim().toLowerCase(); return a === b; }
  function valueOf(wb, sheet, cell) { return wb.sheet(sheet).value(cell); }
  function probe(wb, sheet, cell, p) { var c = wb.clone(); Object.keys(p.set).forEach(function (k) { var t = k.indexOf('!') > 0 ? k.split('!') : [sheet, k]; c.sheet(t[0]).set(t[1], p.set[k]); }); return valueOf(c, sheet, cell); }
  function checkCell(wb, task) {
    var sh = wb.sheet(task.sheet), raw = sh.rawOf(task.cell).trim();
    if (raw === '') return { code: 'empty' };
    var v = sh.value(task.cell);
    if (S.isErr(v)) return { code: 'error', err: v.err };
    if (raw.charAt(0) !== '=') return { code: near(S.toNum(raw), task.expect) || near(raw, task.expect) ? 'typed' : 'wrong', got: v };
    if (!near(v, task.expect)) return { code: 'wrong', got: v };
    for (var i = 0; i < (task.probes || []).length; i++) {
      var pv = probe(wb, task.sheet, task.cell, task.probes[i]);
      if (S.isErr(pv)) return { code: 'no-follow', probe: i, got: pv.err };
      if (!near(pv, task.probes[i].expect)) return { code: 'no-follow', probe: i, got: pv };
    }
    return { code: 'ok', got: v };
  }
  /* fill task: every cell in the column must be a formula giving expect[i]; each probe must move every row */
  function checkFill(wb, task) {
    var sh = wb.sheet(task.sheet), a = S.parseRef(task.from), b = S.parseRef(task.to), cells = [];
    for (var r = a.row; r <= b.row; r++) cells.push(S.colName(a.col) + r);
    var first = checkCell(wb, { sheet: task.sheet, cell: cells[0], expect: task.expect[0], probes: (task.probes || []).map(function (p) { return { set: p.set, expect: p.expect[0] }; }) });
    if (first.code !== 'ok') return first;
    for (var i = 1; i < cells.length; i++) {
      var raw = sh.rawOf(cells[i]).trim(); if (raw === '') return { code: 'empty', cell: cells[i] };
      var v = sh.value(cells[i]); if (S.isErr(v) || !near(v, task.expect[i])) return { code: 'fill-wobble', cell: cells[i], got: S.isErr(v) ? v.err : v };
      if (raw.charAt(0) !== '=') return { code: 'typed', cell: cells[i] };
    }
    for (var p = 0; p < (task.probes || []).length; p++) for (var j = 0; j < cells.length; j++) {
      var pv = probe(wb, task.sheet, cells[j], task.probes[p]); if (S.isErr(pv) || !near(pv, task.probes[p].expect[j])) return { code: 'fill-wobble', cell: cells[j], probe: p, got: S.isErr(pv) ? pv.err : pv };
    }
    return { code: 'ok' };
  }
  global.Judge = { checkCell: checkCell, checkFill: checkFill, near: near };
})(typeof window !== 'undefined' ? window : global);
