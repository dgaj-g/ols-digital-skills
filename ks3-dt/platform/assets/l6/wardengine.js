/* THE OPERATION · the ward round · engine (spec §3.3, §5). Broken computers, one part missing each.
   First tap takes a bed (its badge shows the taker); cap per surgeon; right part → fixed; wrong → still,
   second wrong → the bed says the answer and is sealed as told. Clock-free and DOM-free: node-testable.
   makeWard({seat, seats, beds, cap, bus, rnd}) → {S, hello, take, fit, receive, tray, mine, prompt, doneAll} */
(function (root) {
  var L = root.LINES || (typeof require !== 'undefined' ? require('./lines.js') : null);
  var PARTS = ['mem', 'drive', 'cpu', 'gpu', 'fan', 'psu', 'board'];
  var NAME = { mem: 'memory', drive: 'storage drive', cpu: 'processor', gpu: 'graphics card', fan: 'fan', psu: 'power supply', board: 'motherboard' };
  var W = {
    take: 'Tap a computer to look after it.',
    which: 'Which part does this one need? Tap it on the tray.',
    still: 'Still broken. Try a different part.',
    watch: 'Watch {p} fix the last computers.',
    fixedBy: 'Fixed by {p}.',
    needed: 'It needed a new {part}.',
    done: 'Ward round done. Every computer is working.',
    dark: 'The till’s screen is dark. It says nothing at all.',
    darkStill: 'Still dark. Still silent.'
  };
  function seeded(s) { s = s >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function shuffle(a, rnd) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* which beds a room sees: the same four on both laptops (seeded by the room), all six alone or as a three */
  function pickBeds(seats, seed) {
    var all = L.ward.map(function (b) { return b.id; });
    if (seats.length !== 2) return all;
    var keep = shuffle(all, seeded(seed)).slice(0, 4);
    return all.filter(function (id) { return keep.indexOf(id) !== -1; });
  }
  function makeWard(o) {
    var seat = o.seat, seats = o.seats || ['A'], bus = o.bus, rnd = o.rnd || Math.random;
    var ids = o.beds || pickBeds(seats, o.seed || 1);
    var cap = o.cap != null ? o.cap : (seats.length === 1 ? ids.length : 2);
    var S = { seat: seat, seats: seats, beds: {}, order: ids, open: null, said: [], notice: null, cap: cap, presence: {} };
    ids.forEach(function (id) { S.beds[id] = { id: id, by: null, tries: 0, done: false, told: false }; });
    seats.forEach(function (s) { if (s !== seat) S.presence[s] = { here: false, state: 'look' }; });
    function bed(id) { return L.ward.filter(function (b) { return b.id === id; })[0]; }
    function send(type, data) { if (!bus) return; data = data || {}; data.seat = seat; data.round = 0; bus.send(type, data); }
    function say(text, tag, id) { S.said.push({ text: text, tag: tag, bed: id }); }
    function mine() { return ids.filter(function (id) { return S.beds[id].by === seat; }); }
    function doneAll() { return ids.every(function (id) { return S.beds[id].done; }); }
    function hello() { send('hello'); }
    function take(id) {
      var b = S.beds[id]; if (!b) return 'nobed';
      if (b.done) { S.open = id; return 'done'; }
      if (b.by && b.by !== seat) { S.notice = { key: 'theirs', seat: b.by }; return 'theirs'; }
      if (b.by === seat) { S.open = id; return 'open'; }
      if (mine().length >= cap) { S.notice = { key: 'cap' }; return 'cap'; }
      b.by = seat; S.open = id; S.notice = null; send('take', { bed: id });
      var h = bed(id).hello; say(h || W.dark, h ? 'hello' : 'stage', id);
      return 'took';
    }
    function fit(part) {
      var id = S.open, b = id && S.beds[id]; if (!b || b.done || b.by !== seat) return 'nobed';
      var c = bed(id);
      if (part === c.missing) { b.done = true; say(c.fixed, 'fixed', id); send('fix', { bed: id, told: false }); after(); return 'right'; }
      b.tries++;
      if (b.tries < 2) { say(c.still || W.darkStill, c.still ? 'still' : 'stage', id); S.notice = { key: 'still' }; return 'wrong'; }
      b.done = true; b.told = true; say(W.needed.replace('{part}', NAME[c.missing]), 'told', id); send('fix', { bed: id, told: true }); after(); return 'told';
    }
    function after() { S.notice = null; if (doneAll()) say(W.done, 'done'); }
    function state() { return ids.map(function (id) { var b = S.beds[id]; return { bed: id, by: b.by, done: b.done, told: b.told }; }); }
    function receive(m) {
      if (!m || m.seat === seat || !S.presence[m.seat]) return;
      var pr = S.presence[m.seat], was = pr.here; pr.here = true;
      if (m.type === 'hello') { send('wstate', { beds: state() }); return; }
      if (!was && m.type !== 'wstate') send('wstate', { beds: state() });
      if (m.type === 'take') { claim(m.bed, m.seat); pr.state = 'fit'; return; }
      if (m.type === 'fix') { var b = S.beds[m.bed]; if (!b) return; var wasDone = doneAll(); b.by = m.seat; b.done = true; b.told = !!m.told; if (S.open === m.bed && b.by !== seat) S.open = null; pr.state = 'look'; if (!wasDone && doneAll()) say(W.done, 'done'); return; }
      if (m.type === 'wstate') {
        var before = doneAll();
        (m.beds || []).forEach(function (x) {
          var b = S.beds[x.bed]; if (!b) return;
          if (x.done && !b.done) { b.done = true; b.told = !!x.told; b.by = x.by; }
          else if (x.by && !b.done) claim(x.bed, x.by);
        });
        if (!before && doneAll()) say(W.done, 'done');
      }
    }
    /* two hands on one bed: the earlier seat letter keeps it, the same answer on every laptop */
    function claim(id, who) {
      var b = S.beds[id]; if (!b || b.done || !who) return;
      if (!b.by) { b.by = who; return; }
      if (b.by === who) return;
      if (who < b.by) { if (b.by === seat) { if (S.open === id) S.open = null; S.notice = { key: 'lost', seat: who }; } b.by = who; }
    }
    function tray(id) { return shuffle(PARTS, rnd); }
    function prompt() {
      if (doneAll()) return { kind: 'done', text: W.done };
      if (S.open && !S.beds[S.open].done && S.beds[S.open].by === seat) return { kind: S.notice && S.notice.key === 'still' ? 'still' : 'which', text: S.notice && S.notice.key === 'still' ? W.still : W.which };
      var left = ids.filter(function (id) { return !S.beds[id].by && !S.beds[id].done; });
      if (left.length && mine().length < cap) return { kind: 'take', text: W.take };
      var other = seats.filter(function (s) { return s !== seat; })[0];
      return { kind: 'watch', text: W.watch.replace('{p}', L.callsigns[other] || '') };
    }
    return { S: S, hello: hello, take: take, fit: fit, receive: receive, tray: tray, mine: mine, prompt: prompt, doneAll: doneAll, bed: bed, state: state };
  }
  var api = { makeWard: makeWard, pickBeds: pickBeds, W: W, NAME: NAME, PARTS: PARTS };
  root.OPWARD = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
