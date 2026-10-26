/* THE NIGHT DESK — the separated judge. Marks a query by WHICH ROWS IT PICKS, never by its text; marks a stamp by stamp + reason.
   checkQuery(src, table, columns, expectIds) → {code, got, want, extra, missing}
     ok | empty | syntax | column | dangling | wrong (with how many it let in that it should not, and how many it missed)
   checkStamp({stamp, reason}, want) → ok | stamp (PRINT/SPIKE wrong) | reason (right stamp, wrong reason) | missing */
(function (global) {
  'use strict';
  var Q = global.Query;
  function checkQuery(src, table, columns, expectIds) {
    if (!src || !src.trim()) return { code: 'empty' };
    var rows; try { rows = Q.run(src, table, columns); } catch (e) { return { code: e.code || 'syntax', at: e.at, word: e.word, why: e.why }; }
    var got = {}; rows.forEach(function (r) { got[r.id] = true; });
    var want = {}; expectIds.forEach(function (i) { want[i] = true; });
    var extra = rows.filter(function (r) { return !want[r.id]; }).length, missing = expectIds.filter(function (i) { return !got[i]; }).length;
    if (!extra && !missing) return { code: 'ok', got: rows.length };
    return { code: 'wrong', got: rows.length, want: expectIds.length, extra: extra, missing: missing };
  }
  function checkStamp(s, want) {
    if (!s || !s.stamp) return { code: 'missing' };
    if (s.stamp !== want.stamp) return { code: 'stamp', got: s.stamp };
    if (!s.reason) return { code: 'missing' };
    if (want.reasons.indexOf(s.reason) < 0) return { code: 'reason', got: s.reason };
    return { code: 'ok' };
  }
  global.NightJudge = { checkQuery: checkQuery, checkStamp: checkStamp };
})(typeof window !== 'undefined' ? window : global);
