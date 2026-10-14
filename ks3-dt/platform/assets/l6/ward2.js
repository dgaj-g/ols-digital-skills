/* THE OPERATION · ward round and discharge letter screens (spec §3.3, §3.9). Runs when the hash says stage ward|letter
   (ui2.js stands aside and leaves window.OPHASH). Same live room as the operation; same fallback law: never a dead screen. */
(function () {
  var H = window.OPHASH; if (!H || (H.stage !== 'ward' && H.stage !== 'letter')) return;
  var L = LINES, U = L.ui2, WD = OPWARD, W = WD.W, $ = function (id) { return document.getElementById(id); };
  var face = window.OPFACE;
  $('lobby').classList.remove('on');
  function post(type, data) { if (window.parent === window) return; var m = { op: 1, type: type }; for (var k in data || {}) m[k] = data[k]; window.parent.postMessage(m, '*'); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function boldDr(t, me) { return esc(t).replace(/Dr \w+/g, function (m) { return '<b class="' + (m === me ? 'me' : 'them') + '">' + m + '</b>'; }); }
  var seat = H.seat || 'A', seats = (H.seats && H.seats.length) ? H.seats : ['A'], ME = L.callsigns[seat];
  var NAMES = H.names || null;
  window.addEventListener('message', function (e) { var m = e.data; if (e.source !== window.parent || !m || m.op !== 1) return; if (m.type === 'names' && m.names) { NAMES = m.names; if (H.stage === 'letter') letter(); } });
  function cont(btn) { btn.textContent = 'Continue'; btn.onclick = function () { post('next'); }; }
  if (H.stage === 'letter') { letter(); post('ready', { stage: 'letter' }); document.title = 'ready'; return; }

  /* ================= the ward round ================= */
  var room = H.room || null, live = seats.length > 1 && !!room, FALLBACK = false;
  var seed = H.seed != null ? +H.seed : 1;
  var hs = [], fb = null;
  var bus = { on: function (h) { hs.push(h); }, send: function (t, d) { if (fb && !FALLBACK) fb.send(t, d); } };
  var WARD = null;
  function start(solo) {
    var st = solo ? ['A'] : seats, me = solo ? 'A' : seat;
    WARD = WD.makeWard({ seat: me, seats: st, beds: WD.pickBeds(seats, seed), cap: solo ? 6 : (st.length === 1 ? 6 : 2), bus: solo ? null : bus });
    if (!solo) bus.on(WARD.receive);
  }
  if (live) {
    try {
      var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.LIVE_CONFIG);
      fb = OPLIVE.makeFireBus(app.database(), room, seat); window.OPBUS = fb;
      fb.on(function (m) { if (!FALLBACK) hs.forEach(function (h) { h(m); }); });
    } catch (e) { fb = null; }
  }
  start(!live);
  if (live) {
    if (!fb || H.fallback) setTimeout(goFallback, 0);
    else { var ft = setTimeout(function () { if (!fb.connected()) goFallback(); }, OPLIVE.FALLBACK_MS); fb.whenConnected(function () { clearTimeout(ft); }); }
    WARD.hello(); var ht = setInterval(function () { if (FALLBACK || Object.keys(WARD.S.presence).every(function (s) { return WARD.S.presence[s].here; })) clearInterval(ht); else WARD.hello(); }, 1500);
  }
  function goFallback() {
    if (FALLBACK) return; FALLBACK = true; post('fallback'); if (fb) fb.close();
    if (seat !== 'A') { $('ward').hidden = true; $('away').hidden = false; $('awaysay').textContent = 'Go and sit with ' + L.callsigns.A + '. You share one laptop.'; cont($('awaybtn')); return; }
    start(true); open = null; trays = {}; build(); render();
  }
  var open = null, trays = {}, seenSaid = 0, speech = {};
  function build() {
    $('ward').hidden = false; $('wtitle').textContent = 'Ward round';
    $('wteam').innerHTML = boldDr(U.team.replace('{p}', ME), ME) + (FALLBACK ? '<span class="wlive">' + esc('The live link is slow. Share one laptop and take turns.') + '</span>' : '');
    $('beds').innerHTML = WARD.S.order.map(function (id) {
      var b = WARD.bed(id);
      return '<button class="bed" type="button" data-bed="' + id + '"><span class="bface"></span><span class="bname">' + esc(cap(b.name)) + '</span><span class="bstat"></span></button>';
    }).join('');
    $('beds').querySelectorAll('.bed').forEach(function (el) { el.querySelector('.bface').innerHTML = face(WARD.bed(el.dataset.bed).missing); });
  }
  $('beds').addEventListener('click', function (e) {
    var el = e.target.closest('.bed'); if (!el) return;
    var r = WARD.take(el.dataset.bed);
    if (r === 'theirs' || r === 'cap') { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    render();
  });
  $('tray').addEventListener('click', function (e) {
    var el = e.target.closest('.tpart'); if (!el) return;
    var r = WARD.fit(el.dataset.part);
    if (r === 'wrong') { el.classList.add('wrong'); }
    if (r === 'right' || r === 'told') { var id = WARD.S.open; setTimeout(function () { if (WARD.S.open === id) { WARD.S.open = null; render(); } }, 2600); }
    render();
  });
  var last = {};
  function render() {
    var S = WARD.S;
    while (seenSaid < S.said.length) { var e = S.said[seenSaid++]; if (e.bed) speech[e.bed] = e; }
    $('beds').querySelectorAll('.bed').forEach(function (el) {
      var b = S.beds[el.dataset.bed], st = el.querySelector('.bstat');
      el.classList.toggle('fixed', b.done); el.classList.toggle('mine', b.by === S.seat && !b.done); el.classList.toggle('theirs', !!b.by && b.by !== S.seat && !b.done); el.classList.toggle('open', S.open === b.id);
      var txt = b.done ? (b.told ? W.needed.replace('{part}', WD.NAME[WARD.bed(b.id).missing]) : W.fixedBy.replace('{p}', L.callsigns[b.by] || ME)) : (b.by ? L.callsigns[b.by] : '');
      if (st.textContent !== txt) st.textContent = txt;
      if (b.done) el.querySelector('.bface').innerHTML.indexOf('m-happy') === -1 && (el.querySelector('.bface').innerHTML = face('happy'));
    });
    var id = S.open, side = $('wside');
    side.classList.toggle('on', !!id);
    if (id !== last.open) {
      last.open = id; last.sp = null;
      if (id) {
        var c = WARD.bed(id); $('wface').innerHTML = face(S.beds[id].done ? 'happy' : c.missing); $('wwho').textContent = cap(c.name);
        trays[id] = trays[id] || WARD.tray(id);
        $('tray').innerHTML = trays[id].map(function (p) { return '<button class="tpart" type="button" data-part="' + p + '"><img src="../img/l6/' + p + '.jpg" alt=""><span>' + esc(cap(WD.NAME[p])) + '</span></button>'; }).join('');
      }
    }
    if (id) {
      var sp = speech[id], t = sp ? sp.text : '', it = sp && sp.tag === 'stage';
      if (t !== last.sp) { last.sp = t; $('wsay').textContent = t; $('wbubble').classList.toggle('stage', !!it); if (S.beds[id].done) $('wface').innerHTML = face('happy'); }
      cls($('tray'), 'off', S.beds[id].done);
    }
    var pr = WARD.prompt(); if ($('winstr').textContent !== pr.text) { $('winstr').textContent = pr.text; cls($('winstr'), 'sting', pr.kind === 'still'); }
    var done = WARD.doneAll(); cls($('wdone'), 'on', done && !id);
    if (done && !last.done) {
      last.done = true; $('wdoneh').textContent = W.done; cont($('wnext'));
      post('wardDone'); if (fb) setTimeout(function () { try { fb.destroy(); } catch (e) {} }, 4000);
    }
    var strip = Object.keys(S.presence).filter(function () { return !FALLBACK; }).map(function (s) { var p = S.presence[s]; return p.here ? (p.state === 'fit' ? L.ui.presence.fit.replace('{p}', L.callsigns[s]) : '') : U.presence.away.replace('{p}', L.callsigns[s]).replace('{me}', ''); }).filter(Boolean).join(' ');
    if ($('wstrip').textContent !== strip) $('wstrip').textContent = strip;
  }
  function cls(el, n, on) { if (el.classList.contains(n) !== !!on) el.classList.toggle(n, !!on); }
  build(); render(); setInterval(render, 150);
  post('ready', { stage: 'ward' }); document.title = 'ready';
  window.OPWARDUI = { get W() { return WARD; }, render: render, fallback: function () { return FALLBACK; }, goFallback: goFallback };

  /* ================= the discharge letter (on screen; no PDF, no download) ================= */
  function letter() {
    var d = H.letter || {}, pid = d.pid || 'bernadette', P = L.patients[pid];
    var lseats = d.seats || seats, mine = seat, others = lseats.filter(function (s) { return s !== mine; });
    var lb = OPENGINE2.makeLocalBus(0, { now: Date.now }), E = OPENGINE2.makeEngine({ seat: mine, seats: lseats, bus: lb.endpoint(), pid: pid });
    var NM = { mem: 'memory', drive: 'storage drive', cpu: 'processor', gpu: 'graphics card', fan: 'fan', psu: 'power supply', board: 'motherboard' };
    $('ward').hidden = true; $('letter').hidden = false;
    $('lface').innerHTML = face('happy'); $('lname').textContent = P.name; $('lhead').textContent = 'Discharge letter';
    $('ldis').textContent = P.discharge;
    var rows = (d.chart || []).map(function (x) {
      var me = x.by === mine, credit = E.fmt(x.told ? (me ? U.toldMe : U.toldBy) : (me ? U.foundMe : U.foundBy), { p: L.callsigns[x.by] || '' });
      return '<li><img src="../img/l6/' + x.part + '.jpg" alt=""><span class="lsent">' + esc(E.fmt(L.jobs[x.part].line)).replace('{part}', '<b>' + NM[x.part] + '</b>') + '</span><span class="lby">' + esc(credit) + '</span></li>';
    }).join('');
    $('llines').innerHTML = rows;
    $('lteam').innerHTML = boldDr(E.fmt(U.team, { p: L.callsigns[mine] }) + ' ' + E.fmt(others.length === 0 ? U.teamAlone : others.length === 1 ? U.teamWith : U.teamWith3, { p: L.callsigns[others[0]] }).replace('{q}', L.callsigns[others[1]] || ''), L.callsigns[mine]);
    var nm = function (s) { var i = lseats.indexOf(s); return NAMES && NAMES[i] ? NAMES[i] : ''; };
    var rv = others.length && others.every(function (s) { return nm(s); }) ? (others.length === 1 ? U.reveal.replace('{p}', nm(others[0])) : U.reveal3.replace('{p}', nm(others[0])).replace('{q}', nm(others[1]))) : '';
    $('lreveal').textContent = rv;
    cont($('lnext'));
  }
})();
