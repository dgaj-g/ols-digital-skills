/* SAME LIGHT · the live channel (spec V2 §7).
   open: BroadcastChannel + localStorage, for one laptop, the dev pages and the gates.
   openFire: the room on Firebase, rooms/{code}/{seat}/{push} = {j, t} and rooms/{code}/presence/{seat} = t (rules unchanged,
   DFM 313–332). j = k|t|n|JSON(d) with t in base 36; a j longer than 150 goes as parts P|pid|i|m|slice and is put back
   together on arrival. Every seat listens to every seat (its own too, so a reload replays its own moves); events are
   kept once by id. The clock is Firebase's server time, so two laptops agree when the boat set off.
   Both give { send(k, d), log(), presence(), connected, quiet(seat, ms), offset() }. */
(function () {
  'use strict';
  function open(room, seat, onChange, nowFn, o) {
    var key = 'samelight:' + room, bc = null, n = 0, seen = {}, log = [], now = nowFn || Date.now;
    try { log = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { log = []; }
    log.forEach(function (e) { seen[e.id] = true; if (e.seat === seat && e.n > n) n = e.n; });
    var pres = {}, last = {};
    try { if (!(o && o.blocked)) bc = new BroadcastChannel('samelight-' + room); } catch (e) { bc = null; }
    function save() { try { localStorage.setItem(key, JSON.stringify(log)); } catch (e) {} }
    function take(e) { if (seen[e.id]) return false; seen[e.id] = true; log.push(e); last[e.seat] = Math.max(last[e.seat] || 0, e.t); return true; }
    log.forEach(function (e) { last[e.seat] = Math.max(last[e.seat] || 0, e.t); });
    if (bc) bc.onmessage = function (m) {
      var e = m.data;
      if (e.type === 'presence') { pres[e.seat] = now(); onChange('presence'); return; }
      if (e.type === 'hello') { pres[e.seat] = now(); log.forEach(function (x) { bc.postMessage({ type: 'event', e: x }); }); presence(); onChange('presence'); return; }
      if (e.type === 'event' && take(e.e)) { save(); onChange('event'); }
    };
    function send(k, d) {
      var t = Math.round(now()), e = { id: seat + ':' + t + ':' + (n++), seat: seat, t: t, n: n, k: k, d: d || {} };
      take(e); save(); if (bc) bc.postMessage({ type: 'event', e: e }); onChange('event'); return e;
    }
    function presence() { if (bc) bc.postMessage({ type: 'presence', seat: seat }); }
    if (bc) { bc.postMessage({ type: 'hello', seat: seat }); presence(); }
    setInterval(presence, (o && o.beat) || 5000);
    return { send: send, log: function () { return log; }, presence: function () { return pres; }, connected: !!bc, offset: function () { return 0; },
      // null = never seen at all; else true when neither a presence beat nor an event has come from that seat for ms (an event is proof of presence)
      quiet: function (s, ms) { var at = Math.max(pres[s] || 0, last[s] || 0); return at ? now() - at > ms : null; } };
  }

  var MAXJ = 150;
  function openFire(db, room, seat, onChange, nowFn, o) {
    o = o || {};
    var n = 0, seen = {}, log = [], pres = {}, last = {}, parts = {}, offset = 0, api;
    var ref = db.ref('rooms/' + room);
    function now() { return nowFn ? nowFn() : Date.now() + offset; }
    db.ref('.info/serverTimeOffset').on('value', function (s) { var v = s.val(); if (typeof v === 'number') offset = v; });
    /* .info/connected answers at once from the client's cache, before api exists: keep it and hand it over below */
    var conn = false;
    db.ref('.info/connected').on('value', function (s) { conn = s.val() === true; if (api) { api.connected = conn; onChange('presence'); } });
    function take(e) { if (seen[e.id]) return false; seen[e.id] = true; log.push(e); last[e.seat] = Math.max(last[e.seat] || 0, e.t); return true; }
    function decode(s, j) {
      var a = j.split('|'), t = parseInt(a[1], 36), k = a[0], nn = +a[2], d = {};
      try { d = JSON.parse(a.slice(3).join('|')); } catch (x) { return null; }
      return { id: s + ':' + t + ':' + nn, seat: s, t: t, n: nn, k: k, d: d };
    }
    function arrive(s, v) {
      if (!v || typeof v.j !== 'string') return;
      var j = v.j;
      if (j.slice(0, 2) === 'P|') {
        var a = j.split('|'), pid = s + a[1], i = +a[2], m = +a[3], body = a.slice(4).join('|');
        var p = parts[pid] = parts[pid] || { got: 0, bits: [] };
        if (p.bits[i] == null) { p.bits[i] = body; p.got++; }
        if (p.got < m) return;
        delete parts[pid]; j = p.bits.join('');
      }
      var e = decode(s, j);
      if (e && take(e)) onChange('event');
    }
    ['A', 'B', 'C'].forEach(function (s) { ref.child(s).on('child_added', function (snap) { arrive(s, snap.val()); }); });
    ref.child('presence').on('value', function (snap) {
      var v = snap.val() || {}; Object.keys(v).forEach(function (s) { if (typeof v[s] === 'number') pres[s] = v[s]; }); onChange('presence');
    });
    function beat() { ref.child('presence').child(seat).set(Math.round(now())); }
    beat(); setInterval(beat, o.beat || 5000);
    function send(k, d) {
      var t = Math.round(now()); n++;
      var e = { id: seat + ':' + t + ':' + n, seat: seat, t: t, n: n, k: k, d: d || {} };
      take(e); onChange('event');
      var j = k + '|' + t.toString(36) + '|' + n + '|' + JSON.stringify(e.d), mine = ref.child(seat);
      if (j.length <= MAXJ) mine.push({ j: j, t: t });
      else {
        var pid = t.toString(36) + 'x' + n, m = Math.ceil(j.length / MAXJ);
        for (var i = 0; i < m; i++) mine.push({ j: 'P|' + pid + '|' + i + '|' + m + '|' + j.slice(i * MAXJ, (i + 1) * MAXJ), t: t });
      }
      return e;
    }
    api = { send: send, log: function () { return log; }, presence: function () { return pres; }, connected: conn,
      offset: function () { return offset; },
      quiet: function (s, ms) { var at = Math.max(pres[s] || 0, last[s] || 0); return at ? now() - at > ms : null; },
      // the room goes when the last seat is home (spec §7); the partner's fold already holds every event
      remove: function () { return ref.remove(); } };
    return api;
  }
  window.SameLive = { open: open, openFire: openFire };
})();
