/* TWO LIGHTS · the live channel (spec §6, §10): L6's Firebase room, unchanged. No sign-in.
   rooms/{code}/{seat}/{push} = { j: <message, < 200 bytes>, t: ms }   rooms/{code}/presence/{seat} = ms (every 5 s)
   Nothing here ever names a pupil, a class or a school: only the seat letter and the message.
   The clock is Firebase's server time (.info/serverTimeOffset), so two laptops agree when the boat set off.
   TLLIVE.codec is pure (node-testable); TLLIVE.makeFireBus(db, room, seat, opts) takes any object with the compat
   database API (ref/child/push/on/set/remove), so the gates can hand it a fake. */
(function (root) {
  var T2C = { hello: 'h', state: 's', boat: 'b', fail: 'f', pause: 'p', tell: 't' };
  var C2T = {}; Object.keys(T2C).forEach(function (k) { C2T[T2C[k]] = k; });
  var STG = ['radio', 'coldopen', 'tour', 'ch1', 'ch2', 'ch3', 'ch4', 'home', 'extras'];
  var SLIP = ['light', 'horn', 'none', 'clear'];
  function b36(n) { return n == null ? '' : Math.round(n).toString(36); }
  function n36(s) { return s ? parseInt(s, 36) : null; }
  function clip(s) { return String(s == null ? '' : s).replace(/[|]/g, '').slice(0, 12); }
  function encode(m) {
    var c = T2C[m.type]; if (!c) return null;
    var h = [c, m.seat || ''];
    if (m.type === 'state') {
      h.push(STG.indexOf(m.st), (m.lamp ? 1 : 0) + '' + (m.horn ? 1 : 0) + (m.done ? 1 : 0) + (m.red ? 1 : 0) + (m.typing ? 1 : 0),
        clip(m.radio), b36(m.line), b36(m.ran), b36(m.found), b36(m.at));
    } else if (m.type === 'boat') h.push(m.ch, b36(m.t0));
    else if (m.type === 'fail') h.push(m.ch, b36(m.at));
    else if (m.type === 'pause') h.push(m.ch, b36(m.at), m.on ? 1 : 0);
    else if (m.type === 'tell') h.push(m.to, SLIP.indexOf(m.slip));
    return h.join('|');
  }
  function decode(s) {
    if (typeof s !== 'string') return null;
    var h = s.split('|'), t = C2T[h[0]]; if (!t) return null;
    var m = { type: t, seat: h[1] || null };
    if (t === 'state') {
      var f = h[3] || '00000';
      m.st = STG[+h[2]] || null; m.lamp = +f[0]; m.horn = +f[1]; m.done = +f[2]; m.red = +f[3]; m.typing = +f[4];
      m.radio = h[4] || ''; m.line = n36(h[5]) || 0; m.ran = n36(h[6]) || 0; m.found = n36(h[7]) || 0; m.at = n36(h[8]);
    } else if (t === 'boat') { m.ch = h[2]; m.t0 = n36(h[3]); }
    else if (t === 'fail') { m.ch = h[2]; m.at = n36(h[3]); }
    else if (t === 'pause') { m.ch = h[2]; m.at = n36(h[3]); m.on = h[4] === '1' ? 1 : 0; }
    else if (t === 'tell') { m.to = h[2]; m.slip = SLIP[+h[3]] || null; if (!m.slip) return null; }
    return m;
  }
  function makeFireBus(db, room, seat, opts) {
    opts = opts || {};
    var offset = 0, local = opts.now || function () { return Date.now(); };
    var now = function () { return local() + offset; };
    var hs = [], seen = {}, joined = now(), connected = false, onConn = [], timers = [], closed = false;
    var ref = db.ref('rooms/' + room);
    function deliver(m) { hs.forEach(function (h) { h(m); }); }
    db.ref('.info/serverTimeOffset').on('value', function (snap) { var v = snap.val(); if (typeof v === 'number') offset = v; });
    ['A', 'B', 'C'].forEach(function (s) {
      if (s === seat) return;
      ref.child(s).on('child_added', function (snap) {
        if (closed) return;
        var key = snap.key; if (seen[s + key]) return; seen[s + key] = 1;
        var v = snap.val() || {}, m = decode(v.j); if (!m) return;
        if (m.type === 'hello' && v.t < joined - 2000) return;   // an old hello is not a question any more
        deliver(m);
      });
    });
    db.ref('.info/connected').on('value', function (snap) {
      if (snap.val() === true && !connected) { connected = true; onConn.forEach(function (f) { f(); }); }
    });
    function beat() { if (!closed) ref.child('presence').child(seat).set(now()); }
    beat(); timers.push(setInterval(beat, opts.beatMs || 5000));
    return {
      on: function (h) { hs.push(h); },
      send: function (type, data) {
        if (closed) return;
        var m = {}; for (var k in data) m[k] = data[k]; m.type = type;
        var j = encode(m); if (!j || j.length >= 200) return;
        ref.child(seat).push({ j: j, t: now() });
      },
      now: now,
      connected: function () { return connected; },
      whenConnected: function (f) { if (connected) f(); else onConn.push(f); },
      close: function () { closed = true; timers.forEach(clearInterval); },
      destroy: function () { closed = true; timers.forEach(clearInterval); return ref.remove(); }
    };
  }
  /* the tester's pair on one machine (localhost only): BroadcastChannel, with the same codec and an optional lag */
  function makeChannelBus(room, seat, lag) {
    var hs = [], bc = new BroadcastChannel('twolights-' + room);
    bc.onmessage = function (ev) {
      var d = ev.data || {}; if (d.from === seat) return;
      var m = decode(d.j); if (!m) return;
      setTimeout(function () { hs.forEach(function (h) { h(m); }); }, lag || 0);
    };
    return {
      on: function (h) { hs.push(h); },
      send: function (type, data) { var m = {}; for (var k in data) m[k] = data[k]; m.type = type; var j = encode(m); if (j && j.length < 200) bc.postMessage({ from: seat, j: j }); },
      now: function () { return Date.now(); }, connected: function () { return true; }, whenConnected: function (f) { f(); },
      close: function () { bc.close(); }, destroy: function () { bc.close(); }
    };
  }
  var api = { codec: { encode: encode, decode: decode }, makeFireBus: makeFireBus, makeChannelBus: makeChannelBus, FALLBACK_MS: 10000 };
  root.TLLIVE = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
