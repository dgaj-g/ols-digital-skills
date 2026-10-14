#!/usr/bin/env node
/* GATE l5-clock-test (A10) · the clock is honest.
   Drift rate constant; no drift before the first key of either seat; held by Pause; stops when every job is done; the
   rocks after exactly the budget of drifting time; a fail rewinds to the start after two black seconds; a reload (a fresh
   computation from the room's record at any moment) puts the boat within 1 s of drifting time of where it was.
   --control loads a clock that starts drifting when the chapter opens, not at the first key, and MUST fail.
   Usage: node tools/record-tutorial/l5-clock-test.js [--control] */
'use strict';
var fs = require('fs'), path = require('path'), Module = require('module');
var ROOT = path.resolve(__dirname, '../..');
var CONTROL = process.argv.indexOf('--control') >= 0;
function loadClock() {
  var file = path.join(ROOT, 'platform/assets/twolights/clock.js'), src = fs.readFileSync(file, 'utf8');
  if (CONTROL) src = src.replace('if (room.t0 == null || now < room.t0) return { x: 0, black: false, drifting: false };',
    'if (room.t0 == null) room = Object.assign({}, room, { t0: room.open }); if (now < room.t0) return { x: 0, black: false, drifting: false };');
  var m = new Module(file, module); m.filename = file; m.paths = module.paths; m._compile(src, file);
  return m.exports;
}
var C = loadClock();
var fails = [], n = 0;
function check(id, cond, d) { n++; if (!cond) fails.push(id + (d ? ' · ' + d : '')); }
var near = function (a, b) { return Math.abs(a - b) < 1e-9; };
[90000, 240000, 300000, 480000].forEach(function (B) {
  var tag = 'budget ' + B / 1000 + ' s';
  // before the first key: the chapter is open, nobody has typed
  var open = 1000, room = { open: open, t0: null, pauses: [], doneAt: null, fails: [] };
  [open, open + 5000, open + 60000].forEach(function (t) { check(tag + ' no drift before the first key at ' + t, C.position(room, t, B).x === 0, 'x ' + C.position(room, t, B).x); });
  // first key at 20 s (either seat writes t0; first write wins)
  room.t0 = open + 20000;
  check(tag + ' still at the start at the first key', C.position(room, room.t0, B).x === 0);
  // constant rate: equal steps
  var step = B / 10, prev = 0, d0 = null;
  for (var i = 1; i <= 9; i++) {
    var x = C.position(room, room.t0 + i * step, B).x, d = x - prev;
    if (d0 === null) d0 = d;
    check(tag + ' constant rate step ' + i, near(d, d0), 'step ' + d + ' vs ' + d0);
    prev = x;
  }
  check(tag + ' rocks after exactly the budget', C.position(room, room.t0 + B, B).x === 1 && C.position(room, room.t0 + B - 1, B).x < 1);
  check(tag + ' rocksAt is t0 + budget', C.rocksAt(room, room.t0, B) === room.t0 + B);
  // pause holds the boat
  var pr = Object.assign({}, room, { pauses: [{ from: room.t0 + step, to: room.t0 + step + 30000 }] });
  var a = C.position(pr, room.t0 + step + 1, B).x, b = C.position(pr, room.t0 + step + 29999, B).x;
  check(tag + ' held by pause', near(a, b) && !C.position(pr, room.t0 + step + 15000, B).drifting);
  check(tag + ' pause adds its length to the rocks', C.position(pr, room.t0 + B + 30000, B).x === 1 && C.position(pr, room.t0 + B + 29000, B).x < 1);
  check(tag + ' open pause: no rocks time', C.rocksAt(Object.assign({}, room, { pauses: [{ from: room.t0 + 1, to: null }] }), room.t0 + 2, B) === null);
  // done stops the drift
  var dn = Object.assign({}, room, { doneAt: room.t0 + 2 * step });
  check(tag + ' stops when every job is done', near(C.position(dn, room.t0 + 2 * step, B).x, C.position(dn, room.t0 + 9 * step, B).x));
  // fail: black two seconds, then from the start mark
  var fl = Object.assign({}, room, { fails: [room.t0 + B] });
  check(tag + ' black after the fail', C.position(fl, room.t0 + B + 500, B).black === true);
  check(tag + ' back at the start after black', C.position(fl, room.t0 + B + 2000, B).x === 0);
  check(tag + ' drifts again after the rewind', near(C.position(fl, room.t0 + B + 2000 + step, B).x, d0));
  // reload: a fresh computation from the stored record at random moments lands within 1 s of drifting time
  for (var r = 0; r < 25; r++) {
    var t = room.t0 + Math.floor(Math.random() * B);
    var live = C.position(pr, t, B).x, stored = JSON.parse(JSON.stringify(pr)), again = C.position(stored, t + 900, B).x;
    check(tag + ' reload within 1 s #' + r, Math.abs(again - live) * B <= 1000);
  }
});
console.log('l5-clock-test' + (CONTROL ? ' CONTROL' : '') + ': ' + n + ' checks');
fails.slice(0, 6).forEach(function (f) { console.log('FAIL ' + f); });
if (fails.length) { console.log('l5-clock-test: FAIL · ' + fails.length + ' of ' + n); process.exit(1); }
console.log('l5-clock-test: PASS · all ' + n + ' checks');
