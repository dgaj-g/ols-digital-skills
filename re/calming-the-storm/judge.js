/* ============================================================
   Calming the Storm — the judge
   ------------------------------------------------------------
   Pure rules, no DOM. Loaded by the page (window.StormJudge)
   and by node (module.exports) for tests/judge.test.js.

   An ORDER is an array of part numbers: order[position] = part.
   Parts and positions both count from 0. The story is in order
   when order[p] === p for every position.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StormJudge = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PARTS = 7;

  function isOrder(order) {
    if (!Array.isArray(order) || order.length !== PARTS) return false;
    var seen = [];
    for (var i = 0; i < PARTS; i++) {
      var v = order[i];
      if (typeof v !== 'number' || v % 1 !== 0 || v < 0 || v >= PARTS || seen[v]) return false;
      seen[v] = true;
    }
    return true;
  }

  /* A mixed-up order in which NO part starts in its right place,
     so the first check never hands out a free lock.
     rand is a function returning 0 <= n < 1 (Math.random by default). */
  function shuffle(rand) {
    rand = rand || Math.random;
    for (var tries = 0; tries < 500; tries++) {
      var a = [];
      for (var i = 0; i < PARTS; i++) a.push(i);
      for (var j = PARTS - 1; j > 0; j--) {
        var k = Math.floor(rand() * (j + 1));
        var t = a[j]; a[j] = a[k]; a[k] = t;
      }
      var clean = true;
      for (var p = 0; p < PARTS; p++) if (a[p] === p) { clean = false; break; }
      if (clean) return a;
    }
    return [1, 2, 3, 4, 5, 6, 0]; /* a fixed rotation: still no part in its place */
  }

  /* Which positions hold the right part, and how many. */
  function check(order) {
    var right = [], count = 0;
    for (var p = 0; p < PARTS; p++) {
      var ok = order[p] === p;
      right.push(ok);
      if (ok) count++;
    }
    return { right: right, count: count, complete: count === PARTS };
  }

  /* Move the part at position `from` to position `to`.
     Locked positions never change. The other free parts close up
     the gap and make room, keeping their order (an insertion, not
     a swap), exactly as the cards do on screen.
     Returns a NEW order; the same order back if the move is not allowed. */
  function move(order, locked, from, to) {
    locked = locked || [];
    if (from === to) return order.slice();
    if (from < 0 || to < 0 || from >= PARTS || to >= PARTS) return order.slice();
    if (locked[from] || locked[to]) return order.slice();
    var free = [];
    for (var p = 0; p < PARTS; p++) if (!locked[p]) free.push(p);
    var parts = free.map(function (p) { return order[p]; });
    var fi = free.indexOf(from), ti = free.indexOf(to);
    var moved = parts.splice(fi, 1)[0];
    parts.splice(ti, 0, moved);
    var next = order.slice();
    for (var i = 0; i < free.length; i++) next[free[i]] = parts[i];
    return next;
  }

  /* The nearest position a dragged part may land on: `wanted` if it
     is free, otherwise the closest free position (ties go upward). */
  function nearestFree(locked, wanted) {
    locked = locked || [];
    wanted = Math.max(0, Math.min(PARTS - 1, wanted));
    if (!locked[wanted]) return wanted;
    for (var d = 1; d < PARTS; d++) {
      if (wanted - d >= 0 && !locked[wanted - d]) return wanted - d;
      if (wanted + d < PARTS && !locked[wanted + d]) return wanted + d;
    }
    return -1;
  }

  /* The next free position above (dir -1) or below (dir +1), for the
     arrow keys. Returns -1 when there is none. */
  function stepFree(locked, from, dir) {
    locked = locked || [];
    for (var p = from + dir; p >= 0 && p < PARTS; p += dir) if (!locked[p]) return p;
    return -1;
  }

  /* How hard the storm blows for a number of parts in the right place.
     1 = the full squall. It eases with every part that comes right but
     stays a storm until all seven are right; only then is it 0. */
  function stormFor(count) {
    if (count >= PARTS) return 0;
    if (count <= 0) return 1;
    return Math.round((1 - 0.55 * (count / (PARTS - 1))) * 1000) / 1000;
  }

  /* A check only counts when the order has changed since the last one. */
  function sameOrder(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  /* Fewer checks is better; nothing beats a record that is already lower. */
  function betterResult(best, checks) {
    if (typeof checks !== 'number' || checks < 1) return best || null;
    if (typeof best !== 'number' || best < 1) return checks;
    return Math.min(best, checks);
  }

  return {
    PARTS: PARTS,
    isOrder: isOrder,
    shuffle: shuffle,
    check: check,
    move: move,
    nearestFree: nearestFree,
    stepFree: stepFree,
    stormFor: stormFor,
    sameOrder: sameOrder,
    betterResult: betterResult
  };
});
