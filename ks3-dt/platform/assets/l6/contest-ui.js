/* J1 L6 V2 THE CONTEST — the page (Version 96).
   Built from J1_L6_REDESIGN/prototype/contest-ui.js. The rules live in contest.js (window.L6CONTEST); every word in
   cstrings.js (window.L6C_STRINGS); the live link is OPLIVE.makeFireBus (live.js), the same one the operation uses.
   The lesson (Engines.operation) opens this page in a frame with a hash:
     {stage:'contest', seat, seats, room, seed, names, contest: <the saved opC or null>, fallback?}
   and listens for {op:1, type: ready | save(opC) | fallback | alone | done}.
   Modes, each announced on screen: pair (the live link), solo (no partner: against Bernadette), team (the link could
   not start: two pupils at one PC against Bernadette), alone (the link died mid-contest: carry on against Bernadette).
   Gates: tools/record-tutorial/l6-contest-test.js (strings, engine) and l6-contest-look.js (this page, live). */
(function () {
  'use strict';
  var C = window.L6CONTEST, S = window.L6C_STRINGS, FACE = window.OPFACE || function () { return ''; };
  var N = C.N;
  var $ = function (id) { return document.getElementById(id); };

  /* ---- talking to the lesson ---- */
  window.__posted = [];
  var framed = window.parent && window.parent !== window;
  function post(type, data) {
    var m = { op: 1, type: type }; for (var k in (data || {})) m[k] = data[k];
    window.__posted.push(m);
    if (framed) try { window.parent.postMessage(m, '*'); } catch (e) { }
  }

  var H = {}; try { H = JSON.parse(decodeURIComponent(location.hash.slice(1))) || {}; } catch (e) { H = {}; }
  var seat = String(H.seat || 'A').toUpperCase();
  var origSeats = (H.seats && H.seats.length) ? H.seats.slice() : [seat];
  var names = H.names || [];
  var room = H.room || '';
  var seed = String(H.seed || room || 'solo');
  var saved = (H.contest && H.contest.v === 1) ? H.contest : null;
  var mode = saved && saved.mode ? saved.mode : (origSeats.length >= 2 && room ? 'pair' : 'solo');

  window.addEventListener('message', function (e) {
    var m = e.data; if (e.source !== window.parent || !m || m.op !== 1) return;
    if (m.type === 'names' && m.names) { names = m.names; render(); }
  });

  /* ---- little helpers ---- */
  function fill(str, map) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return map && map[k] != null && map[k] !== '' ? map[k] : m; }); }
  function unfilled(s) { return /\{\w+\}/.test(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function callsign(s) { return S.callsigns[s] || s; }
  function firstName(s) { var k = origSeats.indexOf(s), n = k >= 0 ? names[k] : ''; return n ? String(n).trim().split(/\s+/)[0] : ''; }
  function joinAnd(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function realOthers() { return origSeats.filter(function (s) { return s !== seat; }); }
  function partnerFirst() { return joinAnd(realOthers().map(firstName).filter(Boolean)); }
  function partnerLabel() { return E.solo ? S.callsigns.Z : joinAnd(E.others.map(callsign)); }
  function roundIdx(i) { for (var r = 0; r < C.ROUNDS.length; r++) if (i <= C.ROUNDS[r].to) return r; return C.ROUNDS.length - 1; }
  function W(s) { return (String(s).match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length; }
  function sentences(s) { return String(s || '').split(/[.!?]\s+|\n/).filter(function (x) { return x.trim(); }); }
  function firstSent(s, n) { return sentences(s).slice(0, n).map(function (x) { return x.replace(/[.!?]?$/, '.'); }).join(' '); }
  /* the reason under the answer chips: whole sentences of the question's why, as many as fit in 25 words beside the
     chips (the same rule the string gate holds it to) */
  function whyFor(i) {
    var parts = sentences(C.Q[i].why).map(function (x) { return x.replace(/[.!?]?$/, '.'); });
    var base = W(S.rev.you + ': ' + S.rev.chipWrong) + (E.all.length - 1) * W(S.callsigns.A + ': ' + S.rev.chipWrong);
    while (parts.length > 1 && base + W(parts.join(' ')) > 25) parts.pop();
    return parts.join(' ');
  }
  function list(lines, map) {
    var out = lines.map(function (l) { return fill(l, map); }).filter(function (l) { return !unfilled(l); });
    return '<ul class="lines">' + out.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
  }
  function kicker(s) { return '<p class="kicker">' + esc(s) + '</p>'; }
  function btn(act, label, cls) { return '<button class="btn' + (cls ? ' ' + cls : '') + '" type="button" data-act="' + act + '">' + esc(label) + '</button>'; }
  function actions(inner) { return '<div class="actions">' + inner + '</div>'; }

  /* ---- the engine ---- */
  var bus = null, db = null, E = null, ended = false;
  var link = { ever: false, downAt: 0 };
  var ui = { ph: 'begin', introDone: [0, 0, 0, 0], film: false, playing: false, beat: -1, fs: false, nt: {}, fin: false, arr: null, arrQ: -1, focusK: null, away: false, backAt: {}, help: false, spot: false };
  if (saved) {
    ui.ph = saved.ph || 'begin'; ui.introDone = (saved.introDone || ui.introDone).slice(); ui.fs = !!saved.fs;
    ui.nt = saved.nt || {}; ui.fin = !!saved.fin;
  }
  function onChange(ev) { if (ev && ev.back) ui.backAt[ev.back] = Date.now(); queueSave(); }
  function makeE(m) {
    var pair = m === 'pair';
    return C.makeEngine({
      seat: seat, seats: pair ? origSeats : [seat], seed: seed,
      send: pair ? function (msg) { if (bus) bus.send(msg.type, msg); } : null,
      presence: pair ? function (o) { return bus ? bus.quietFor(o) : Infinity; } : null,
      onChange: onChange
    });
  }
  E = makeE(mode);
  if (saved && saved.snap) {
    E.load(saved.snap);
    var os = saved.os || {};
    Object.keys(os).forEach(function (o) { if (o !== 'Z' && E.seatState(o)) E.receive({ type: 'cstate', seat: o, q: os[o].q, a: os[o].a, m: os[o].m, s: {} }); });
  }
  window.L6C = { E: E, ui: ui, bus: null, render: render };

  /* pair → team / alone: keep my answers, Bernadette takes the other side from here */
  function switchSolo(m) {
    var snap = E.snapshot();
    if (bus) bus.close();
    try { if (db) db.goOffline(); } catch (e) { }
    mode = m; E = makeE(m); E.load(snap); window.L6C.E = E;
    queueSave();
  }

  /* ---- the live link ---- */
  function fallback() {
    if (ui.away || mode !== 'pair' || ended) return;
    post('fallback');
    if (bus) bus.close();
    try { if (db) db.goOffline(); } catch (e) { }
    ui.away = true; closeHelp(); render();
  }
  function startBus() {
    if (H.fallback) return fallback();
    if (!window.firebase || !window.LIVE_CONFIG || !window.OPLIVE) return fallback();
    try {
      var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.LIVE_CONFIG);
      db = app.database();
      bus = OPLIVE.makeFireBus(db, room, seat);
    } catch (e) { return fallback(); }
    window.L6C.bus = bus;
    bus.on(function (m) { if (ended || ui.away || mode !== 'pair') return; E.receive(m); render(); });
    bus.whenConnected(function () { if (mode !== 'pair') return; bus.send('hello', { seat: seat }); E.hello(); });
    db.ref('.info/connected').on('value', function (snap) {
      if (snap.val() === true) { link.ever = true; link.downAt = 0; }
      else if (link.ever && !link.downAt) link.downAt = Date.now();
      render();
    });
    setTimeout(function () { if (mode === 'pair' && !ui.away && !ended && bus && !bus.connected()) fallback(); }, OPLIVE.FALLBACK_MS || 10000);
  }
  function linkDownFor() { return (mode === 'pair' && !ended && link.downAt) ? Date.now() - link.downAt : 0; }

  /* ---- which screen ---- */
  function phaseOf(v) {
    if (ui.away) return 'away';
    if (ui.ph === 'begin') return 'begin';
    if (ui.ph === 'result' || v.q >= N) return 'result';
    var ri = v.round.n - 1;
    if (v.firstOfRound && !ui.introDone[ri] && v.mine.a[v.q] === '-') return ui.film ? 'film' : 'intro';
    if (v.revealed && v.mine.m[v.q] !== '0' && !ui.nt[v.q]) return 'notice';
    return 'q';
  }
  function nextLabel(i, v) { return i === N - 1 ? S.rev.toResult : v.lastOfRound ? fill(S.rev.nextRound, { n: v.round.n + 1 }) : S.rev.next; }

  /* ---- the card ---- */
  function beginHTML() {
    var k, lines;
    if (mode === 'team') { k = S.begin.teamKicker; lines = S.begin.team; }
    else if (E.solo) { k = S.begin.soloKicker; lines = S.begin.solo; }
    else { k = S.begin.kicker; lines = S.begin.lines; }
    return kicker(k) + '<h1 class="title">' + esc(S.begin.title) + '</h1>' + list(lines, { name: partnerFirst() }) + actions(btn('start', S.begin.button));
  }
  function introHTML(v) {
    var ri = v.round.n - 1, R = S.rounds[ri];
    return kicker(fill(R.kicker, { partner: partnerLabel() })) + '<h1 class="title">' + esc(R.title) + '</h1>' + list(R.lines) +
      actions(ri === 2 ? btn('filmplay', R.button) : btn('introgo', R.button));
  }
  function whoPicked(i, ch) { return E.others.filter(function (o) { return E.seatState(o).a[i] === ch; }); }
  function tag(me, them) {
    if (!me && !them.length) return '';
    return '<span class="tag">' + (me ? '<span class="me">' + esc(S.rev.you) + '</span>' : '') + them.map(function (o) { return '<span class="them">' + esc(callsign(o)) + '</span>'; }).join('') + '</span>';
  }
  /* a soft hyphen lets the one long word break cleanly on a small tile */
  function partLab(key) { return esc(C.PART_NAME[key]).replace('motherboard', 'mother­board'); }
  function tray(i, v, rev) {
    var mine = v.mine.a[i], right = C.rightChar(i);
    return '<div class="tray">' + E.screenOrder(i).map(function (k) {
      var key = C.PARTS[k], ch = String(k), isMine = mine === ch, them = rev ? whoPicked(i, ch) : [], isRight = rev && ch === right;
      var cls = 'tile' + (isMine ? ' mine' : '') + (them.length ? ' theirs' : '') + (isRight ? ' right' : '') + (rev && !isMine && !them.length && !isRight ? ' dim' : '');
      return '<button class="' + cls + '" type="button" data-act="pick" data-v="' + ch + '"' + (mine !== '-' ? ' disabled' : '') + '><img src="../img/l6/' + key + '.jpg" alt="">' +
        tag(isMine, them) + (isRight ? '<span class="tick">✓</span>' : '') + '<span class="lab">' + partLab(key) + '</span></button>';
    }).join('') + '</div>';
  }
  function opts(i, v, rev) {
    var q = C.Q[i], mine = v.mine.a[i], right = C.rightChar(i);
    return '<div class="opts">' + E.screenOrder(i).map(function (k, pos) {
      var ch = String(k), isMine = mine === ch, them = rev ? whoPicked(i, ch) : [], isRight = rev && ch === right;
      var cls = 'opt' + (isMine ? ' mine' : '') + (them.length ? ' theirs' : '') + (isRight ? ' right' : '');
      return '<button class="' + cls + '" type="button" data-act="pick" data-v="' + ch + '"' + (mine !== '-' ? ' disabled' : '') + '><span class="letter">' + (isRight ? '✓' : 'ABCD'[pos]) + '</span><span>' + esc(q.opts[k]) + '</span>' + tag(isMine, them) + '</button>';
    }).join('') + '</div>';
  }
  function order(i, v, rev) {
    var q = C.Q[i], mine = v.mine.a[i];
    if (rev) return '<div class="order">' + [0, 1, 2, 3].map(function (b, pos) { return '<div class="block right" data-k="' + b + '"><span class="n">' + (pos + 1) + '</span><span>' + esc(q.blocks[b]) + '</span><span></span></div>'; }).join('') + '</div>';
    if (ui.arrQ !== i || !ui.arr) { ui.arrQ = i; ui.arr = E.screenOrder(i); }
    var open = mine === '-', arr = open ? ui.arr : C.charPerm(mine);
    var html = '<div class="order">' + arr.map(function (b, pos) {
      return '<div class="block" data-k="' + b + '"' + (open ? ' tabindex="0"' : '') + '><span class="n">' + (pos + 1) + '</span><span>' + esc(q.blocks[b]) + '</span><span class="mv">' +
        (open ? '<button class="btn ghost small" type="button" data-act="up" data-pos="' + pos + '"' + (pos === 0 ? ' disabled' : '') + '>' + esc(S.q.up) + '</button>' +
          '<button class="btn ghost small" type="button" data-act="down" data-pos="' + pos + '"' + (pos === 3 ? ' disabled' : '') + '>' + esc(S.q.down) + '</button>' : '') + '</span></div>';
    }).join('') + '</div>';
    if (open) html += actions(btn('lock', S.q.orderLock));
    return html;
  }
  function waitLine(v) {
    var pend = E.others.filter(function (o) { return E.seatState(o).a[v.q] === '-'; });
    if (!pend.length) return '';
    var t = pend[0] === 'Z' ? S.wait.bernadette : pend.length > 1 ? S.wait.others : fill(S.wait.partner, { partner: callsign(pend[0]) });
    return '<div class="waitline"><span class="pulse"></span>' + esc(t) + '</div>';
  }
  function chip(cls, who, ok) { return '<div class="chip ' + cls + '"><b>' + esc(who) + ':</b> <span class="' + (ok ? 'ok' : 'no') + '">' + esc(ok ? S.rev.chipRight : S.rev.chipWrong) + '</span></div>'; }
  function revealHTML(i, v) {
    var chips = chip('me', S.rev.you, C.isRight(i, v.mine.a[i]));
    E.others.forEach(function (o) { chips += chip('them', callsign(o), C.isRight(i, E.seatState(o).a[i])); });
    return '<div class="verdict">' + chips + '</div><p class="why">' + esc(whyFor(i)) + '</p>' + actions(btn('next', nextLabel(i, v)));
  }
  function qHTML(v) {
    var i = v.q, q = C.Q[i], mine = v.mine.a[i], rev = v.revealed, html = '';
    if (rev) html += kicker(fill(S.rev.kicker, { k: v.idxInRound, total: v.roundTotal }));
    if (q.kind === 'part') {
      if (!rev) html += '<div class="patient"><div class="face" aria-hidden="true">' + FACE(q.right) + '</div><div><p class="kicker">' + esc(cap(fill(S.q.says, { patient: q.patient }))) + '</p><div class="says">' + esc(q.says) + '</div></div></div>';
      html += tray(i, v, rev);
    } else {
      if (!rev) html += '<h2 class="ask">' + esc(q.ask) + '</h2>';
      html += q.kind === 'mcq' ? opts(i, v, rev) : order(i, v, rev);
    }
    if (!rev && mine !== '-') html += waitLine(v);
    if (rev) html += revealHTML(i, v);
    return html;
  }
  function noticeHTML(v) {
    return '<p class="headline">' + esc(v.mine.m[v.q] === '2' ? S.rev.standInLate : S.rev.standInForMe) + '</p>' + actions(btn('noticeok', S.rev.next));
  }
  function resultHTML(v) {
    var sc = v.scores, a = sc[seat], html = '<h1 class="title">' + esc(S.result.title) + '</h1>', head, reveals = [];
    var revealOthers = function () { realOthers().forEach(function (o) { var n = firstName(o); if (n) reveals.push(fill(S.result.reveal, { partner: n, name: callsign(o) })); }); };
    if (E.solo) {
      var bz = sc.Z;
      head = fill(a > bz ? S.result.soloWin : a < bz ? S.result.soloLose : S.result.soloDraw, { a: a, b: bz });
      if (mode === 'solo') reveals.push(S.result.revealSolo);
      else if (mode === 'alone') revealOthers();
      /* team: the partner is sitting beside her; no line to say who they were */
    } else if (E.others.length === 1) {
      var o = E.others[0], b = sc[o];
      head = a > b ? fill(S.result.winMe, { a: a, b: b }) : a < b ? fill(S.result.winThem, { winner: callsign(o), a: b, b: a }) : fill(S.result.draw, { a: a });
      revealOthers();
    } else {
      var top = Math.max.apply(null, E.all.map(function (s) { return sc[s]; }));
      var winners = E.all.filter(function (s) { return sc[s] === top; });
      if (winners.length === 1 && winners[0] === seat) head = firstSent(fill(S.result.winMe, { a: a, b: '' }), 2);
      else if (winners.length === 1) head = fill(S.result.trio, { winner: callsign(winners[0]), a: top });
      else head = firstSent(fill(S.result.draw, { a: top }), winners.indexOf(seat) >= 0 ? 2 : 1);
      revealOthers();
    }
    html += '<p class="headline">' + esc(head) + '</p>';
    if (reveals.length) html += '<div class="reveals">' + reveals.map(function (r) { return '<p class="headline">' + esc(r) + '</p>'; }).join('') + '</div>';
    return html + actions(btn('cont', S.result.button));
  }
  function awayHTML() {
    var nm = partnerFirst(), me = fill(S.fixes.fallbackMe, { name: nm });
    if (unfilled(me)) me = firstSent(S.fixes.fallbackMe, 1);
    return kicker(S.fixes.team) + '<p class="headline">' + esc(me) + '</p><p class="headline">' + esc(S.fixes.fallbackSit) + '</p>' + actions(btn('together', S.fixes.fallbackButton));
  }

  /* ---- the film (round 3): built once, then moved in place beat by beat ---- */
  var filmTimer = null, filmShown = false;
  function filmHTML() {
    return kicker(fill(S.rounds[2].kicker, { partner: partnerLabel() })) + '<h1 class="title">' + esc(S.rounds[2].title) + '</h1>' +
      '<div id="film" class="b-1"><div class="stage" aria-hidden="true"><div class="bface">' + FACE('happy') + '</div><div class="think">' + esc(S.filmBoard.think) + '</div>' +
      '<div class="box mem"><div class="bl">' + esc(S.filmBoard.mem) + '</div><div class="shelf">' + S.filmBoard.waiting.map(function (w) { return '<div class="qslip">' + esc(w) + '</div>'; }).join('') + '</div></div>' +
      '<div class="box cpu"><div class="bl">' + esc(S.filmBoard.cpu) + '</div><div class="shelf"></div></div><div class="slip">' + esc(S.filmBoard.current) + '</div><div class="loopdot"></div></div>' +
      '<div class="caption"></div><div class="beats">' + S.film.map(function () { return '<i></i>'; }).join('') + '</div></div><div class="actions" id="filmacts"></div>';
  }
  function placeFilm() {
    var st = document.querySelector('#film .stage'); if (!st) return;
    var r = st.getBoundingClientRect(), mem = st.querySelector('.box.mem').getBoundingClientRect(), cpu = st.querySelector('.box.cpu').getBoundingClientRect();
    st.dataset.memx = (mem.left - r.left + (mem.width - 150) / 2); st.dataset.memy = (mem.top - r.top + mem.height / 2 - 28);
    st.dataset.cpux = (cpu.left - r.left + (cpu.width - 150) / 2); st.dataset.cpuy = (cpu.top - r.top + cpu.height / 2 - 28);
    var dot = st.querySelector('.loopdot'); dot.style.setProperty('--x0', (mem.left - r.left + mem.width / 2) + 'px'); dot.style.setProperty('--x1', (cpu.left - r.left + cpu.width / 2) + 'px');
  }
  function updateFilm() {
    var f = $('film'); if (!f) return;
    var b = ui.beat, st = f.querySelector('.stage'), slip = f.querySelector('.slip');
    f.className = 'b' + b;
    f.querySelector('.think').style.opacity = b <= 0 ? 1 : 0;
    var atMem = b === 1 || b === 4, atCpu = b === 2 || b === 3;
    f.querySelector('.box.mem').classList.toggle('lit', atMem || b === 5 || b === 6);
    f.querySelector('.box.cpu').classList.toggle('lit', atCpu || b === 5 || b === 6);
    slip.textContent = b >= 4 ? '7' : b === 3 ? '4 + 3 = 7' : S.filmBoard.current;
    slip.style.opacity = (b >= 1 && b <= 4) ? 1 : 0;
    if (b >= 1 && b <= 4) slip.style.transform = 'translate(' + (atCpu ? st.dataset.cpux : st.dataset.memx) + 'px,' + (atCpu ? st.dataset.cpuy : st.dataset.memy) + 'px)';
    f.querySelector('.caption').innerHTML = b >= 0 ? esc(S.film[b]) : '&nbsp;';
    Array.prototype.forEach.call(f.querySelectorAll('.beats i'), function (el, k) { el.classList.toggle('on', k <= b); });
    var html = ui.playing ? '' : btn('filmplay', S.rounds[2].again, 'ghost') + btn('filmgo', S.rounds[2].go);
    var acts = $('filmacts'); if (acts.innerHTML !== html) acts.innerHTML = html;
    document.body.dataset.beat = String(b);
    renderJob(E.view(), 'film');
    if (ui.spot) applySpot();
  }
  function playFilm() {
    clearTimeout(filmTimer); ui.playing = true; ui.beat = -1; updateFilm();
    function step() {
      ui.beat++;
      if (ui.beat >= S.film.length - 1) { ui.beat = S.film.length - 1; ui.playing = false; ui.fs = true; queueSave(); updateFilm(); return; }
      updateFilm(); filmTimer = setTimeout(step, ui.beat === 0 ? 2000 : 2600);
    }
    filmTimer = setTimeout(step, 300);
  }

  /* ---- the scoreboard ---- */
  function stateLines(v, ph) {
    var down = linkDownFor();
    if (down >= 30000) return [S.wait.linkLost];
    var out = [];
    E.others.forEach(function (o) {
      var st = v.partnerState[o], m = { partner: callsign(o) }, os = E.seatState(o);
      if (st === 'gone') { if (os.q < N && !ended) out.push(fill(S.score.gone, m) + ' ' + fill(S.wait.gone, m)); return; }
      if (ui.backAt[o] && Date.now() - ui.backAt[o] < 10000) { out.push(fill(S.wait.back, m)); return; }
      if (ph !== 'q') return;
      if (v.revealed) { if (o !== 'Z' && os.m[v.q] === '2') out.push(fill(S.wait.late, m)); return; }
      if (st === 'solo') out.push(S.score.solo);
      else if (st === 'answered') out.push(fill(S.score.answered, m));
      else if (st === 'ahead') out.push(fill(S.score.ahead, m));
      else if (st === 'behind') { var r = roundIdx(os.q); out.push(fill(S.score.behind, { partner: callsign(o), k: os.q - C.ROUNDS[r].from + 1, r: C.ROUNDS[r].n })); }
      else out.push(fill(S.score.thinking, m));
    });
    return out;
  }
  function dotsFor(s, v) {
    return '<div class="dots">' + C.ROUNDS.map(function (r, ri) {
      var cur = v.q < N && roundIdx(v.q) === ri, ds = '';
      for (var i = r.from; i <= r.to; i++) {
        var a = E.seatState(s).a[i], cls = '';
        if (E.revealed(i)) cls = C.isRight(i, a) ? 'r' : 'w'; else if (a !== '-') cls = 'a'; else if (i === v.q && s === seat) cls = 'q';
        ds += '<i class="' + cls + '"></i>';
      }
      return '<div class="grp' + (cur ? ' cur' : '') + '">' + ds + '</div>';
    }).join('') + '</div>';
  }
  function sideHTML(v, ph) {
    var html = '<h3>' + esc(S.score.head) + '</h3>';
    E.all.forEach(function (s) {
      html += '<div class="srow"><div class="disc ' + s + '">' + (s === 'Z' ? 'Be' : s) + '</div><div><div class="nm">' + esc(callsign(s)) + (s === seat ? ' <small>' + esc(S.score.me) + '</small>' : '') + '</div>' + dotsFor(s, v) + '</div><div class="pts">' + v.scores[s] + '</div></div>';
    });
    html += '<div class="legend"><span><i style="background:var(--gold)"></i>' + esc(S.score.legendRight) + '</span><span><i style="background:var(--bad)"></i>' + esc(S.score.legendWrong) + '</span><span><i style="background:var(--mute)"></i>' + esc(S.score.legendHidden) + '</span></div>';
    html += '<div class="state">' + esc(ph === 'away' ? '' : stateLines(v, ph).join(' ')) + '</div>';
    if (linkDownFor() >= 60000 && ph !== 'away') html += actions(btn('alone', S.fixes.linkAlone));
    return html;
  }

  /* ---- the job line and the help layer (the platform's own, as see/hour.html) ---- */
  function jobText(v, ph) {
    switch (ph) {
      case 'begin': return S.job.begin;
      case 'intro': return fill(S.job.intro, { btn: S.rounds[v.round.n - 1].button });
      case 'film': return ui.playing ? S.job.film : S.job.filmSeen;
      case 'q':
        var i = v.q, q = C.Q[i];
        if (v.revealed) return fill(S.job.next, { btn: nextLabel(i, v) });
        if (v.mine.a[i] !== '-') return S.job.locked;
        return q.kind === 'part' ? S.job.pickPart : q.kind === 'mcq' ? S.job.pickOne : S.job.order;
      case 'notice': return fill(S.job.notice, { btn: S.rev.next });
      case 'result': return S.job.result;
      case 'away': return S.job.away;
    }
    return '';
  }
  function helpLines(v, ph) {
    switch (ph) {
      case 'begin': return mode === 'team' ? S.help.beginTeam : E.solo ? S.help.beginSolo : S.help.begin;
      case 'intro': return S.help.rounds[v.round.n - 1];
      case 'film': return S.help.rounds[2];
      case 'q': return v.revealed ? S.help.more : mode === 'team' ? S.help.team : E.solo ? S.help.solo : S.help.pair;
      case 'result': return S.help.more;
      case 'away': return S.help.away.map(function (l) { return fill(l, { name: partnerFirst() }); }).filter(function (l) { return !unfilled(l); });
    }
    return [];
  }
  var lastJob = '';
  function renderJob(v, ph) {
    var j = jobText(v, ph), html = '<b>' + esc(S.layer.jobLead) + '</b>' + esc(j);
    if (html !== lastJob) { $('job').innerHTML = html; lastJob = html; }
    if (ui.help) renderHelp(v, ph);
  }
  var lastHelp = '';
  function renderHelp(v, ph) {
    var how = S.layer.jobLead + jobText(v, ph), items = helpLines(v, ph), sig = how + '|' + items.join('|');
    if (sig === lastHelp) return; lastHelp = sig;
    $('helpHow').textContent = how;
    $('helpText').innerHTML = items.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
  }
  function openHelp() {
    var v = E.view(); ui.help = true; lastHelp = '';
    renderHelp(v, phaseOf(v));
    $('help').hidden = false; $('helpBtn').classList.remove('nudge');
    ui.spot = true; applySpot();
  }
  function closeHelp() { ui.help = false; $('help').hidden = true; clearSpot(); }
  /* the thing to press: the first live button on the card (or the side), the whole group for a choice */
  function spotTarget() {
    var ord = document.querySelector('#card .order .block[tabindex]');
    if (ord) return { el: ord.parentNode, tag: '' };
    var els = document.querySelectorAll('#card [data-act]:not([disabled]), #side [data-act]:not([disabled])');
    for (var k = 0; k < els.length; k++) {
      var a = els[k].dataset.act; if (a === 'up' || a === 'down') continue;
      var grp = els[k].closest('.opts, .tray');
      return grp ? { el: grp, tag: S.layer.tagChoose } : { el: els[k], tag: S.layer.tagPress };
    }
    return null;
  }
  function clearSpot() {
    ui.spot = false;
    Array.prototype.forEach.call(document.querySelectorAll('.spot'), function (el) { el.classList.remove('spot'); });
    $('tag').style.display = 'none';
  }
  function applySpot() {
    Array.prototype.forEach.call(document.querySelectorAll('.spot'), function (el) { el.classList.remove('spot'); });
    var t = spotTarget(), tg = $('tag');
    if (!t) { tg.style.display = 'none'; return; }
    t.el.classList.add('spot');
    if (!t.tag) { tg.style.display = 'none'; return; }
    var r = t.el.getBoundingClientRect(), hb = ui.help ? $('help').getBoundingClientRect().bottom : 0;
    tg.textContent = t.tag; tg.style.display = 'block';
    tg.style.left = Math.max(8, r.left + 10) + 'px'; tg.style.top = Math.max(hb + 4, r.top - 15) + 'px';
  }
  /* a pupil who has not touched anything for a while: the button nudges, then the thing to press lights up */
  var idleAt = Date.now();
  function poke() { idleAt = Date.now(); $('helpBtn').classList.remove('nudge'); if (ui.spot && !ui.help) clearSpot(); }
  function idleCheck() {
    if (ui.help) return;
    var t = Date.now() - idleAt, has = !!spotTarget();
    $('helpBtn').classList.toggle('nudge', has && t >= 20000);
    if (has && t >= 40000 && !ui.spot) { ui.spot = true; applySpot(); }
  }

  /* ---- drawing ---- */
  var lastCard = '', lastSide = '', lastWhere = '', lastYou = '';
  function setCard(html) {
    if (html === lastCard) return false;
    lastCard = html; $('card').innerHTML = html;
    if (ui.focusK != null) { var b = document.querySelector('#card .order .block[data-k="' + ui.focusK + '"]'); if (b) b.focus(); ui.focusK = null; }
    return true;
  }
  function renderTop(v, ph) {
    var pl = partnerLabel(), where;
    if (ph === 'begin' || ph === 'away') where = fill(S.top.begin, { partner: pl });
    else if (ph === 'result') where = fill(S.top.result, { partner: pl });
    else if (ph === 'film') where = fill(S.top.film, { partner: pl });
    else if (ph === 'intro') where = fill(S.top.roundIntro, { n: v.round.n, roundName: v.round.name, partner: pl });
    else where = fill(S.top.round, { n: v.round.n, roundName: v.round.name, k: v.idxInRound, total: v.roundTotal, partner: pl });
    var w = where.split(' · ').map(function (p, k) { return k === 0 ? '<b>' + esc(p) + '</b>' : esc(p); }).join(' · ');
    if (w !== lastWhere) { $('where').innerHTML = w; lastWhere = w; }
    var y = (mode === 'team' ? esc(S.top.team) : esc(fill(S.top.you, { me: callsign(seat) }))).replace(/^(You are )(.+)$/, '$1<b>$2</b>');
    if (y !== lastYou) { $('you').innerHTML = y; lastYou = y; }
  }
  function render() {
    if (!E) return;
    var v = E.view(), ph = phaseOf(v);
    if (ph === 'result' && v.done && !ended) endContest();
    document.body.dataset.phase = ph;
    document.body.dataset.rev = (ph === 'q' && v.revealed) ? '1' : '';
    renderTop(v, ph);
    var changed;
    if (ph === 'film') {
      if (!filmShown) { setCard(filmHTML()); filmShown = true; placeFilm(); updateFilm(); changed = true; }
    } else {
      if (filmShown) { filmShown = false; clearTimeout(filmTimer); ui.playing = false; }
      document.body.dataset.beat = '';
      changed = setCard(ph === 'begin' ? beginHTML() : ph === 'intro' ? introHTML(v) : ph === 'notice' ? noticeHTML(v) : ph === 'result' ? resultHTML(v) : ph === 'away' ? awayHTML() : qHTML(v));
    }
    var sh = sideHTML(v, ph);
    if (sh !== lastSide) { $('side').innerHTML = sh; lastSide = sh; changed = true; }
    renderJob(v, ph);
    if (changed && ui.spot) applySpot();
  }
  function endContest() {
    ended = true;
    if (bus) { var b = bus; b.close(); setTimeout(function () { try { b.destroy(); } catch (e) { } }, 5000); }
    queueSave();
  }

  /* ---- saving: the whole contest goes back to the lesson's draft, so a reload carries on ---- */
  var saveT = null, lastSaved = '';
  function opC() {
    var os = {};
    if (mode === 'pair') E.others.forEach(function (o) { var s = E.seatState(o); os[o] = { q: s.q, a: s.a, m: s.m }; });
    return { v: 1, mode: mode, snap: E.snapshot(), os: os, ph: ui.ph, introDone: ui.introDone, fs: ui.fs, nt: ui.nt, fin: ui.fin };
  }
  function flushSave() { clearTimeout(saveT); var o = opC(), j = JSON.stringify(o); if (j === lastSaved) return; lastSaved = j; post('save', { opC: o }); }
  function queueSave() { clearTimeout(saveT); saveT = setTimeout(flushSave, 400); }

  /* ---- doing ---- */
  function move(pos, d) {
    var j = pos + d; if (!ui.arr || pos < 0 || j < 0 || j > 3) return;
    var a = ui.arr.slice(), t = a[pos]; a[pos] = a[j]; a[j] = t; ui.arr = a; ui.focusK = t;
  }
  function act(a, el) {
    var v = E.view();
    switch (a) {
      case 'start': ui.ph = 'q'; break;
      case 'introgo': ui.introDone[v.round.n - 1] = 1; break;
      case 'filmplay': ui.film = true; render(); playFilm(); break;
      case 'filmgo': clearTimeout(filmTimer); ui.introDone[2] = 1; ui.film = false; ui.playing = false; ui.beat = -1; break;
      case 'pick': E.answer(v.q, el.dataset.v); break;
      case 'up': case 'down': move(+el.dataset.pos, a === 'up' ? -1 : 1); ui.focusK = null; break;
      case 'lock': if (ui.arr) E.answerOrder(v.q, ui.arr); break;
      case 'next': if (!v.revealed) return; ui.arr = null; ui.arrQ = -1; E.next(); if (E.view().q >= N) ui.ph = 'result'; break;
      case 'noticeok': ui.nt[v.q] = 1; break;
      case 'together': if (mode === 'pair') switchSolo('team'); ui.away = false; ui.ph = 'begin'; break;
      case 'alone': if (mode === 'pair') { switchSolo('alone'); post('alone'); } break;
      case 'cont': ui.fin = true; flushSave(); post('done'); return;
      default: return;
    }
    closeHelp(); queueSave(); render();
  }
  document.addEventListener('click', function (e) {
    poke();
    var b = e.target.closest && e.target.closest('[data-act]'); if (!b || b.disabled) return;
    if (!b.closest('#card') && !b.closest('#side')) return;
    act(b.dataset.act, b);
  });
  document.addEventListener('pointerdown', poke);
  document.addEventListener('keydown', function (e) {
    poke();
    if (e.key === 'Escape') { if (ui.help) closeHelp(); return; }
    var b = e.target && e.target.closest && e.target.closest('#card .order .block[tabindex]');
    if (b && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && ui.arr) {
      e.preventDefault();
      var k = +b.dataset.k; move(ui.arr.indexOf(k), e.key === 'ArrowUp' ? -1 : 1); ui.focusK = k; render();
    }
  });
  $('helpBtn').addEventListener('click', function (e) { e.stopPropagation(); poke(); if (ui.help) closeHelp(); else openHelp(); });
  $('helpClose').addEventListener('click', function (e) { e.stopPropagation(); closeHelp(); });
  window.addEventListener('resize', function () { if (filmShown) { placeFilm(); updateFilm(); } if (ui.spot) applySpot(); });

  $('helpBtn').textContent = S.layer.helpBtn;
  $('helpClose').textContent = S.layer.helpBack;
  $('helpStuck').textContent = S.layer.helpStuck;
  C.PARTS.forEach(function (k) { var im = new Image(); im.src = '../img/l6/' + k + '.jpg'; });

  if (mode === 'pair') startBus();
  render();
  post('ready');
  setInterval(function () { if (!E) return; if (!ended) E.tick(); idleCheck(); render(); }, 500);
})();
