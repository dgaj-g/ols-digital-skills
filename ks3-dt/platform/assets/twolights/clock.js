/* TWO LIGHTS · the clock is the boat (law 6, law 7, §6). Pure functions of the room's record, so every seat and every
   reload computes the same place: Marigold drifts at ONE constant rate while any keeper's job in this chapter is undone.
   Drift starts at t0 (the chapter's first key, either seat, first write wins), is held by Pause, stops when every job is
   done, and the rocks are reached after exactly the chapter's budget of drifting time. A fail rewinds the boat to the
   start mark: black for two seconds, then drift resumes from the rewind (lines kept elsewhere).
   room = { t0, pauses: [{from, to}], doneAt, fails: [time...] }   (to null = still paused; doneAt null = undone)
   UMD: window.TwoLightsClock. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TwoLightsClock = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var BLACK_MS = 2000;
  // drifting time in [a, b): not paused, not done
  function drifting(a, b, room) {
    if (b <= a) return 0;
    var end = room.doneAt != null ? Math.min(b, room.doneAt) : b;
    if (end <= a) return 0;
    var ms = end - a;
    (room.pauses || []).forEach(function (p) {
      var pa = Math.max(a, p.from), pb = Math.min(end, p.to == null ? Infinity : p.to);
      if (pb > pa) ms -= pb - pa;
    });
    return Math.max(0, ms);
  }
  // where Marigold is: 0 = the chapter's start mark, 1 = the rocks
  function position(room, now, budgetMs) {
    if (room.t0 == null || now < room.t0) return { x: 0, black: false, drifting: false };
    var fails = (room.fails || []).filter(function (f) { return f <= now; });
    var last = fails.length ? fails[fails.length - 1] : null;
    if (last != null && now < last + BLACK_MS) return { x: 0, black: true, drifting: false, fails: fails.length };
    var from = last != null ? Math.max(room.t0, last + BLACK_MS) : room.t0;
    var x = Math.min(1, drifting(from, now, room) / budgetMs);
    var paused = (room.pauses || []).some(function (p) { return p.from <= now && (p.to == null || now < p.to); });
    return { x: x, black: false, drifting: x < 1 && !paused && (room.doneAt == null || now < room.doneAt), fails: fails.length };
  }
  // when will she reach the rocks, if nothing changes? (the engine writes the fail at this moment; first write wins)
  function rocksAt(room, now, budgetMs) {
    var p = position(room, now, budgetMs);
    if (room.t0 == null || room.doneAt != null || p.black) return null;
    var open = (room.pauses || []).some(function (q) { return q.to == null; });
    if (open) return null;
    return now + (1 - p.x) * budgetMs;
  }
  return { position: position, rocksAt: rocksAt, drifting: drifting, BLACK_MS: BLACK_MS };
}));
