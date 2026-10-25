/* THE OPERATION · the live channel (DFM 325, spec §4). Firebase Realtime Database, no sign-in.
   rooms/{code}/{seat}/{push} = { j: <move, < 200 bytes>, t: ms }   rooms/{code}/presence/{seat} = ms (every 5 s, read as a beat)
   Nothing here ever names a pupil, a class or a school: only the seat letter and the move.
   OPLIVE.codec is pure (node-testable); OPLIVE.makeFireBus(db, room, seat, opts) takes any object with the
   compat database API (ref/child/push/on/set/remove), so the gates can hand it a fake. */
(function (root) {
  var PARTS = ['mem', 'drive', 'cpu', 'gpu', 'fan', 'psu', 'board'];
  var BEDS = ['library', 'byrne', 'rose', 'chippy', 'office', 'kiosk'];
  var T2C = { hello: 'h', state: 's', clean: 'c', pull: 'p', seal: 'l', again: 'a', take: 'k', fix: 'f', wstate: 'w' };
  var C2T = {}; Object.keys(T2C).forEach(function (k) { C2T[T2C[k]] = k; });
  var ST = { in: 'i', out: 'o', sealed: 's' }, TS = { i: 'in', o: 'out', s: 'sealed' };
  function b36(n) { return n == null ? '' : Math.round(n).toString(36); }
  function n36(s) { return s ? parseInt(s, 36) : null; }
  function pi(p) { var i = PARTS.indexOf(p); return i < 0 ? '' : String(i); }
  /* encode one bus message as a short string: type|seat|round|... */
  function encode(m) {
    var c = T2C[m.type]; if (!c) return null;
    var h = [c, m.seat || '', m.round == null ? '' : m.round];
    if (m.type === 'state') {
      h.push(m.fluff === 'gone' ? 'g' : 'i');
      h.push((m.parts || []).filter(function (x) { return x.status && x.status !== 'in'; })
        .map(function (x) { return pi(x.part) + ST[x.status] + (x.by || '-') + (x.told ? '1' : '0') + b36(x.at); }).join(','));
    } else if (m.type === 'pull') { h.push(pi(m.part), b36(m.at)); }
    else if (m.type === 'seal') { h.push(pi(m.part), m.told ? '1' : '0'); }
    else if (m.type === 'take') { h.push(BEDS.indexOf(m.bed)); }
    else if (m.type === 'fix') { h.push(BEDS.indexOf(m.bed), m.told ? '1' : '0'); }
    else if (m.type === 'wstate') { h.push((m.beds || []).map(function (b) { return BEDS.indexOf(b.bed) + (b.by || '-') + (b.done ? (b.told ? 't' : 'f') : 'o'); }).join(',')); }
    return h.join('|');
  }
  function decode(s) {
    if (typeof s !== 'string') return null;
    var h = s.split('|'), type = C2T[h[0]]; if (!type) return null;
    var m = { type: type, seat: h[1] || null, round: h[2] === '' ? null : +h[2] };
    if (type === 'state') {
      m.fluff = h[3] === 'g' ? 'gone' : 'in';
      var got = {};
      (h[4] ? h[4].split(',') : []).forEach(function (x) {
        var part = PARTS[+x[0]]; if (!part) return;
        got[part] = { part: part, status: TS[x[1]], by: x[2] === '-' ? null : x[2], told: x[3] === '1', at: n36(x.slice(4)) };
      });
      m.parts = PARTS.map(function (p) { return got[p] || { part: p, status: 'in', by: null, told: false, at: null }; });
    } else if (type === 'pull') { m.part = PARTS[+h[3]]; m.at = n36(h[4]); }
    else if (type === 'seal') { m.part = PARTS[+h[3]]; m.told = h[4] === '1'; }
    else if (type === 'take') { m.bed = BEDS[+h[3]]; }
    else if (type === 'fix') { m.bed = BEDS[+h[3]]; m.told = h[4] === '1'; }
    else if (type === 'wstate') {
      m.beds = (h[3] ? h[3].split(',') : []).map(function (x) {
        return { bed: BEDS[+x[0]], by: x[1] === '-' ? null : x[1], done: x[2] !== 'o', told: x[2] === 't' };
      });
    }
    return m;
  }
  /* the bus the engines expect: { on(handler), send(type, data) }, plus connected/close/destroy */
  function makeFireBus(db, room, seat, opts) {
    opts = opts || {};
    var now = opts.now || function () { return Date.now(); };
    var hs = [], seen = {}, joined = now(), connected = false, onConn = [], timers = [], closed = false;
    /* LAST SIGN OF LIFE per other seat, on OUR clock (never hers, so a skewed laptop cannot fake it): a fresh
       presence beat or a move. A pupil whose laptop shut stops beating; the frames read quietFor() and let go. */
    var seenAt = {}, lastBeat = {};
    var ref = db.ref('rooms/' + room);
    function deliver(m) { hs.forEach(function (h) { h(m); }); }
    ['A', 'B', 'C'].forEach(function (s) {
      if (s === seat) return;
      ref.child(s).on('child_added', function (snap) {
        if (closed) return;
        var key = snap.key; if (seen[s + key]) return; seen[s + key] = 1;
        var v = snap.val() || {}, m = decode(v.j); if (!m) return;
        if (v.t >= joined - 2000) seenAt[s] = now();
        /* an old hello is not a question any more: replaying it would only make us shout our state again */
        if (m.type === 'hello' && v.t < joined - 2000) return;
        deliver(m);
      });
      /* the first value is whatever was left there (maybe an hour old): only a CHANGE is a beat */
      ref.child('presence').child(s).on('value', function (snap) {
        if (closed) return;
        var v = snap.val();
        if (v != null && s in lastBeat && v !== lastBeat[s]) seenAt[s] = now();
        lastBeat[s] = v;
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
      connected: function () { return connected; },
      quietFor: function (s) { return now() - Math.max(seenAt[s] || 0, joined); },
      whenConnected: function (f) { if (connected) f(); else onConn.push(f); },
      close: function () { closed = true; timers.forEach(clearInterval); },
      destroy: function () { closed = true; timers.forEach(clearInterval); return ref.remove(); }
    };
  }
  var api = { codec: { encode: encode, decode: decode }, makeFireBus: makeFireBus, PARTS: PARTS, BEDS: BEDS, FALLBACK_MS: 10000, GONE_MS: 30000 };
  root.OPLIVE = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
