/* J3 L6 THE NIGHT DESK — the hour, screen by screen (J3_L6_SPEC.md §5–§17). The prototype's screens on the
   J2 L6 plumbing: the bridge, saving, Welcome back, the strip with its review chips, Running out of time, Pause,
   the sound switch, the watchdog. Every rule runs through Query; the judge never reads the DOM (A14).
   Test args: ?fails=1 walks the honest fails, ?speed=N runs the clocks N times faster, ?frame=ms sets the clock's
   frame, ?min=N starts N minutes into the lesson, ?at=ID opens one screen with the earlier stamps made. */
(function () {
  'use strict';
  var S = window.S, C = S.common, D = window.NightData, Q = window.Query, J = window.NightJudge, B = window.NightdeskBridge, PL = B.place || {};
  var QS = location.search, arg = function (k) { var m = new RegExp('[?&]' + k + '=([^&]+)').exec(QS); return m ? decodeURIComponent(m[1]) : null; };
  var FAILS = arg('fails') === '1', SPEED = Number(arg('speed')) || 1, FRAME = Number(arg('frame')) || 100, MIN0 = Number(arg('min')) || 0;
  var FRAMED = B.framed, STAGE = PL.stage || 'hour', SAVED = PL.saved || null, RUSH = 180;
  var started = SAVED && SAVED.started && Date.now() - SAVED.started < 3 * 3600000 ? SAVED.started : Date.now();
  var st = { i: 0, hint: 0, ok: false, line: null, lineKind: '', xp: 0, badges: [], paid: {}, failDone: {}, t0: started - MIN0 * 60000, predicted: null, filmShown: 0, tourN: 0,
    donow: { n: 0, picked: null }, exit: { n: 0, picked: null }, felt: {}, paused: false, name: '', table: 'people', q: '', rows: null, stamp: null, reason: null, stampMiss: 0,
    stamps: {}, timer: null, left: RUSH, remain: null, timedOut: false, free: { n: 0, shown: false, wet: false, dry: false, done: [] }, snaps: {}, chDone: [],
    review: null, welcome: null, rush: false, lite: 0, soundOff: false, flash: null, fanfared: {}, restore: null };
  try { st.soundOff = localStorage.getItem('nightdesk-sound-' + (PL.name || 'me')) === 'off'; } catch (e) {}
  if (SAVED) { st.xp = SAVED.xp || 0; st.badges = (SAVED.badges || []).slice(); st.name = SAVED.name || ''; st.snaps = SAVED.snaps || {}; st.chDone = SAVED.chDone || []; st.stamps = SAVED.stamps || {}; st.paid = SAVED.paid || {}; st.timedOut = !!SAVED.timedOut;
    if (SAVED.free) st.free = Object.assign(st.free, SAVED.free); }
  /* every sound goes through here: silent when she turned sound off or paused */
  var Snd = {}; ['buzz', 'ring', 'ding', 'thud', 'tick', 'fanfare'].forEach(function (k) { Snd[k] = function () { if (!st.soundOff && !st.paused) try { Sound[k](); } catch (e) {} }; });
  var seed = 11; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; } function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function cols(t) { return D.columns[t || st.table]; }
  function runRows(src, t) { try { return src && src.trim() ? Q.run(src, D[t], D.columns[t]) : null; } catch (e) { return null; } }
  function ids(src, t) { return Q.run(src, D[t], D.columns[t]).map(function (r) { return r.id; }); }
  function fmtv(v) { return typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString('en-GB') : String(v)) : esc(v); }
  function avg(rows, col) { return rows.length ? rows.reduce(function (s, r) { return s + r[col]; }, 0) / rows.length : 0; }
  var T = { c1: ids('sleep_hours >= 8', 'people'), c2: ids('age < 20 AND phone_hours >= 5', 'people'), c3: ids('day_no BETWEEN 40 AND 46', 'days'), c4: ids('pet = "dog" OR pet = "cat"', 'people'),
    c5: ids('NOT area = "Old Town" AND bus_stars > 0', 'people'), c6a: ids('temp_c >= 24', 'days'), c6b: ids('temp_c < 18', 'days'),
    f0: ids('area = "Harbour"', 'people'), wet: ids('rain_mm > 5', 'days'), dry: ids('rain_mm = 0', 'days') };
  function sameSet(a, b) { if (a.length !== b.length) return false; var m = {}; a.forEach(function (x) { m[x] = 1; }); return b.every(function (x) { return m[x]; }); }
  /* ---------- saving (on every Enter and every Next, §15) ---------- */
  function save() { if (st.review || st.welcome) return; var sc = screens[st.i];
    B.save({ v: 1, at: sc.id, ch: sc.ch, xp: st.xp, badges: st.badges, paid: st.paid, name: st.name, snaps: st.snaps, chDone: st.chDone, free: st.free, started: started,
      q: st.q, table: st.table, stamps: st.stamps, remain: st.timer ? Math.round(st.remain * SPEED) : null, timedOut: st.timedOut }); }
  function addXp(id, n) { if (st.paid[id]) return; st.paid[id] = n; st.xp += n; }
  /* badges come only from the judge's ok event (G5): giveBadge() is called from judgeStamp's ok, never from Next */
  function giveBadge(id) { if (id && st.badges.indexOf(id) < 0) { st.badges.push(id); B.badge(id); } }
  /* ---------- the desk: question box, word bank, count, table (§6.4) ---------- */
  var SIGNS = ['=', '<>', '<', '>', '<=', '>=', 'AND', 'OR', 'NOT', 'BETWEEN'];
  function deskHTML(o) { o = o || {}; var v = o.view || st, t = v.table, all = D[t], rows = v.rows || all, cs = cols(t), what = t === 'people' ? C.people : C.days, ro = o.readonly || !!st.review;
    var h = '<div class="desk"><div class="qrow' + (o.spot === 2 ? ' spot' : '') + (st.lineKind === 'no' && st.line && !ro ? ' bad' : '') + '"><input id="qbox" autocomplete="off" spellcheck="false" aria-label="' + esc(C.boxHint) + '" placeholder="' + esc(C.boxHint) + '" value="' + esc(v.q || '') + '"' + (ro ? ' readonly' : '') + '>' + (ro ? '' : '<button class="btn small" data-act="run">' + esc(C.ask) + '</button><button class="btn small ghost" data-act="clear">' + esc(C.clear) + '</button>') + '</div>';
    if (o.tables && !ro) h += '<div class="bank">' + ['people', 'days'].map(function (x) { return '<button class="chip tab' + (t === x ? ' on' : '') + '" data-table="' + x + '">' + esc(x === 'people' ? S.close.people : S.close.days) + '</button>'; }).join('') + '</div>';
    if (!ro) h += '<div class="bank">' + (o.bankLabel ? '<p class="banklab">' + esc(C.bank) + '</p>' : '') + cs.map(function (c) { return '<button class="chip" data-word="' + c + '">' + c + '</button>'; }).join('') + SIGNS.map(function (w) { return '<button class="chip kw" data-word="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '<button class="chip kw" data-word="&quot;&quot;" aria-label="quotes">" "</button></div>';
    h += '<p class="count' + (o.spot === 3 ? ' spot' : '') + (st.flash === 'ok' && !ro ? ' flash' : '') + '">' + esc(C.showing.replace('{n}', rows.length).replace('{all}', all.length).replace('{what}', what)) + '</p>';
    h += '<div class="tbl' + (o.spot === 1 ? ' spot' : '') + '"><table><tr>' + cs.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' + rows.slice(0, 12).map(function (r) { return '<tr>' + cs.map(function (c) { return '<td class="' + (typeof r[c] === 'number' ? 'num' : '') + '">' + fmtv(r[c]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>' + (rows.length > 12 ? '<div class="more">' + esc(C.andMore.replace('{n}', rows.length - 12)) + '</div>' : '');
    if (o.avgs && o.avgs.length) h += '<div class="avgs">' + o.avgs.map(function (a) { return '<p>' + esc(a) + '</p>'; }).join('') + '</div>';
    return h + '</div>'; }
  function focusBox() { var b = document.getElementById('qbox'); if (b && !b.readOnly) { b.focus(); var v = b.value; b.value = ''; b.value = v; } }
  /* a bank word goes in at the cursor with a space; the quotes go in as a pair with the cursor between them */
  function insertWord(w) { var b = document.getElementById('qbox'); if (!b || b.readOnly) return; var v = b.value, a = b.selectionStart == null ? v.length : b.selectionStart, z = b.selectionEnd == null ? a : b.selectionEnd;
    var pre = v.slice(0, a), post = v.slice(z), lead = pre && !/\s$/.test(pre) ? ' ' : '', ins, caret;
    if (w === '""') { ins = lead + '""'; caret = pre.length + ins.length - 1; } else { ins = lead + w + (post && /^\s/.test(post) ? '' : ' '); caret = pre.length + ins.length; }
    b.value = pre + ins + post; st.q = b.value; b.focus(); b.setSelectionRange(caret, caret); }
  function errLine(r) { var m = { empty: C.errEmpty, syntax: C.errSyntax, column: C.errColumn, dangling: C.errDangling, value: C.errValue }; return (m[r.code] || C.errSyntax).replace('{word}', r.word || ''); }
  function runQuery() { if (st.review || st.welcome || st.paused) return; var b = document.getElementById('qbox'); if (b) st.q = b.value; var sc = screens[st.i]; st.flash = null;
    if (sc.task && !st.ok) { var r = J.checkQuery(st.q, D[st.table], cols(), sc.task.ids);
      if (r.code === 'ok') { st.ok = true; st.rows = Q.run(st.q, D[st.table], cols()); st.line = sc.judge.ok; st.lineKind = 'ok'; st.flash = 'ok'; Snd.ding(); award(sc); }
      else if (r.code === 'wrong') { st.rows = Q.run(st.q, D[st.table], cols()); st.line = sc.judge.wrong.replace('{got}', r.got); st.lineKind = 'no'; Snd.thud(); }
      else { st.line = errLine(r); st.lineKind = 'no'; Snd.thud(); } }
    else { try { st.rows = st.q.trim() ? Q.run(st.q, D[st.table], cols()) : null; st.line = null; st.lineKind = ''; if (sc.id === 'free') judgeFree(); }
      catch (e) { st.line = errLine(e); st.lineKind = 'no'; Snd.thud(); } }
    render(); save(); if (!st.ok) focusBox(); }
  /* §13 points: a rule 10 first time, 6 after a hint, 3 after hint 3 */
  function award(sc) { addXp(sc.id, st.hint === 0 ? 10 : st.hint < 3 ? 6 : 3); }
  /* ---------- free time: a headline is done when her rule keeps the right set and she opens What Dee thinks ---------- */
  function judgeFree() { if (!st.rows) return; var got = st.rows.map(function (r) { return r.id; }), f = st.free;
    if (f.n === 0 && st.table === 'people' && sameSet(got, T.f0)) f.kept0 = true;
    if (f.n === 1 && st.table === 'days') { if (sameSet(got, T.wet)) f.wet = true; if (sameSet(got, T.dry)) f.dry = true; }
    freeDone(); }
  function freeKept(n) { return n === 0 ? !!st.free.kept0 : !!(st.free.wet && st.free.dry); }
  function freeDone() { var f = st.free; if (f.shown && freeKept(f.n) && f.done.indexOf(f.n) < 0) { f.done.push(f.n); addXp('free' + f.n, 10); Snd.fanfare(); } }
  function freeAvgs() { if (!st.rows) return null; return st.table === 'people' ? [C.avgCafe.replace('{v}', avg(st.rows, 'cafe_visits').toFixed(1))] : [C.avgVisitors.replace('{v}', Math.round(avg(st.rows, 'visitors')).toLocaleString('en-GB'))]; }
  /* ---------- panels ---------- */
  function paper(card, drop) { return '<div class="paper"><p class="headline">' + esc(card.headline) + '</p><p class="byline">' + esc(card.byline) + '</p>' + (card.stamp ? '<span class="stampmark ' + card.stamp.toLowerCase() + (drop ? ' drop' : '') + '">' + esc(card.stamp) + '</span>' : '') + '</div>'; }
  function stampedLine(s) { return s ? '<p class="small">' + esc(S.stamp.stamped.replace('{stamp}', S.stamp[s.stamp]).replace('{reason}', S.stamp.reasons[s.reason])) + '</p>' : ''; }
  function timerHTML() { return '<p class="timer' + (st.left <= 10 ? ' last' : '') + '">' + esc(S.c6.timeLeft.replace('{s}', st.left)) + '</p>'; }
  function coach(sc, o) { var h = '<div class="coach">'; if (o.kicker) h += '<div class="kick">' + esc(o.kicker) + '</div>'; if (o.timed && st.timer) h += timerHTML(); if (o.card) h += paper(o.card, st.ok);
    if (o.after) h += o.after;
    if (!st.ok) { if (o.lead) h += '<p class="small">' + esc(o.lead) + '</p>'; h += '<p class="ask">' + esc(o.ask) + '</p>';
      if (o.hints) { for (var i = 1; i <= st.hint; i++) h += '<p class="hint">' + esc(o.hints[i - 1]) + (i === 3 && o.code ? ' <code>' + esc(o.code) + '</code>' : '') + '</p>'; if (st.hint < 3) h += '<button class="btn ghost" data-act="hint">' + esc(C.hintN.replace('{n}', st.hint + 1)) + '</button>'; }
      if (o.body) h += o.body; if (st.line) h += '<p class="line ' + st.lineKind + '">' + esc(st.line) + '</p>'; }
    else h += '<p class="line ' + st.lineKind + '">' + esc(st.line) + '</p><button class="btn" data-act="next">' + esc(o.nextLabel || C.next) + '</button>';
    if (o.timed && st.timer && FAILS) h += '<button class="dbg" data-act="debug-timeout">·</button>';
    return h + '</div>'; }
  function scene(cls, inner) { return '<div class="scene ' + cls + '">' + inner + '</div>'; }
  function msg(kicker, from, lines) { return '<div class="phone"><div class="kick">' + esc(kicker) + '</div><div class="from"><span class="ava">D</span>' + esc(from) + '</div>' + lines.map(function (l) { return '<p class="bubble">' + esc(l) + '</p>'; }).join('') + '</div>'; }
  function predictHTML(sc, q, options, right) { var opts = sc._opts || (sc._opts = shuffle(options)); var h = '<p class="ask">' + esc(q) + '</p><div class="opts col">' + opts.map(function (o) { return '<button class="btn opt' + (st.predicted ? (o === right ? ' right' : st.predicted === o ? ' wrong' : '') : '') + '" data-opt="' + esc(o) + '"' + (st.predicted ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>';
    if (st.predicted) h += '<p class="line ' + (st.predicted === right ? 'ok' : 'no') + '">' + esc(st.predicted === right ? sc.predictRight : sc.predictWrong) + '</p><button class="btn" data-act="next">' + esc(C.next) + '</button>'; return h; }
  function stampHTML() { var h = '<div class="stamps">' + ['PRINT', 'SPIKE'].map(function (s) { return '<button class="btn stampbtn ' + s.toLowerCase() + (st.stamp === s ? ' on' : '') + '" data-stamp="' + s + '">' + esc(S.stamp[s]) + '</button>'; }).join('') + '</div>';
    if (st.stamp) h += '<p class="small">' + esc(S.stamp.why) + '</p><div class="reasons">' + Object.keys(S.stamp.reasons).map(function (k) { return '<button class="btn opt' + (st.reason === k ? ' on' : '') + '" data-reason="' + k + '">' + esc(S.stamp.reasons[k]) + '</button>'; }).join('') + '</div><button class="btn" data-act="stamp"' + (st.reason ? '' : ' disabled') + '>' + esc(S.stamp.confirm) + '</button>';
    return h; }
  /* ---------- the rush clock: remaining time falls by the wall clock between frames, not at all while paused ---------- */
  function startTimer() { if (st.timer || st.timedOut || st.stamps.c6) return; st.remain = st.resume != null ? st.resume / SPEED : RUSH * 1000 / SPEED; st.resume = null;
    st.left = Math.max(0, Math.ceil(st.remain * SPEED / 1000)); st.lastNow = Date.now(); st.timer = setTimeout(clockFrame, FRAME); }
  function clockFrame() { var now = Date.now(), dt = now - st.lastNow; st.lastNow = now; if (!st.paused) st.remain -= dt; var left = Math.max(0, Math.ceil(st.remain * SPEED / 1000));
    if (left !== st.left) { st.left = left; if (left <= 10 && left > 0) Snd.tick(); var t = document.querySelector('.timer'); if (t) { t.textContent = S.c6.timeLeft.replace('{s}', left); t.classList.toggle('last', left <= 10); } }
    if (st.remain <= 0) return timeout(); st.timer = setTimeout(clockFrame, FRAME); }
  function stopTimer() { if (st.timer) clearTimeout(st.timer); st.timer = null; }
  /* §12.5 the honest fail: the clock thuds, Fionn's headline prints, the letter comes, she fixes it */
  function timeout() { stopTimer(); st.timedOut = true; st.left = 0; Snd.thud(); go(idxOf('c6-printed')); }
  /* ---------- screen factories ---------- */
  function card(c) { return { headline: c.headline, byline: c.byline }; }
  function partOf(ch) { var n = { open: 1, c1: 2, c2: 3, c3: 4, c4: 5, c5: 6, c6: 7, front: 8, close: 9 }[ch]; return n ? C.partOf.replace('{n}', n) : ''; }
  function titleScreen(id, chId, c, n) { return { id: id, ch: chId, render: function () { return scene('title', '<div class="kick">' + esc(S.lesson.title) + ' · ' + esc(C.headlineN.replace('{n}', n)) + '</div>' + paper(card(c)) + '<button class="btn big" data-act="next">' + esc(C.check) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } }; }
  /* §7.1 Dee shows you: the demo types itself into the box at 0.12 s a key, presses Enter and the table shortens */
  function showScreen(id, chId, c, table) { return { id: id, ch: chId, film: c.showDemo.length * 0.12 + 0.6,
    enter: function () { var self = this, txt = c.showDemo, k = 0; st.table = table; st.q = ''; st.rows = null; st.demo = 0;
      (function key() { if (screens[st.i] !== self || st.review) return; if (k < txt.length) { k++; st.q = txt.slice(0, k); var b = document.getElementById('qbox'); if (b) b.value = st.q; setTimeout(key, 120 / SPEED); }
        else { st.rows = Q.run(txt, D[table], cols(table)); st.demo = 1; Snd.ding(); render(); } })(); },
    render: function () { return '<div class="two">' + deskHTML({ readonly: true }) + '<div class="coach"><div class="kick">' + esc(c.showKicker) + '</div><p class="ask">' + esc(c.show1) + '</p><div class="demo"><code>' + esc(c.showDemo) + '</code></div><p class="ask">' + esc(c.show2) + '</p><p class="ask">' + esc(c.show3) + '</p><button class="btn" data-act="next">' + esc(C.got) + '</button></div></div>'; },
    want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } }; }
  function askScreen(id, chId, c, o) { return { id: id, ch: chId, task: { ids: o.ids }, judge: o.judge || c.judge, timed: !!o.timed,
    enter: function () { st.table = o.table; var r = takeRestore(); st.q = r ? r.q : ''; st.rows = runRows(st.q, st.table); if (o.timed) startTimer(); },
    render: function () { return '<div class="two">' + deskHTML({ bankLabel: o.bankLabel, avgs: o.avgs }) + coach(this, { kicker: o.kicker || c.title, card: o.nocard ? null : card(c), lead: o.lead, ask: o.ask, hints: o.hints, code: o.code, nextLabel: o.nextLabel, timed: o.timed }) + '</div>'; },
    want: function () { if (st.ok) return { kind: 'click', sel: '[data-act="next"]' }; if (FAILS && o.fail && !st.failDone[id]) { st.failDone[id] = 1; return { kind: 'type', sel: '#qbox', text: o.fail, enter: true }; } if (st.q && !st.ok) return { kind: 'click', sel: '[data-act="clear"]' }; return { kind: 'type', sel: '#qbox', text: o.code, enter: true }; } }; }
  function predictScreen(id, chId, c, o) { return { id: id, ch: chId, right: o.options[0], predictRight: o.right || c.right, predictWrong: o.wrong || c.wrong,
    enter: function () { st.table = o.table || st.table; },
    render: function () { return '<div class="two">' + deskHTML({ avgs: o.avgs, readonly: true }) + '<div class="coach"><div class="kick">' + esc(o.kicker || c.title) + '</div>' + paper(card(c)) + predictHTML(this, o.q, o.options, o.options[0]) + '</div></div>'; },
    want: function () { return st.predicted ? { kind: 'click', sel: '[data-act="next"]' } : { kind: 'click', sel: '[data-opt="' + o.options[0] + '"]' }; } }; }
  function stampScreen(id, chId, c, o) { return { id: id, ch: chId, badge: o.badge, fix: !!o.fix, timed: !!o.timed, wantStamp: { stamp: o.stamp, reasons: [o.reason] }, lines: { ok: o.ok || c.stampOk, no: o.no || c.stampNo, reasonNo: o.reasonNo || c.reasonNo },
    enter: function () { st.stamp = null; st.reason = null; st.stampMiss = 0; if (o.table) st.table = o.table; if (o.timed) startTimer(); },
    render: function () { return '<div class="two">' + deskHTML({ avgs: o.avgs, readonly: true }) + coach(this, { kicker: o.kicker || c.title, card: st.ok ? { headline: c.headline, byline: c.byline, stamp: st.stamp } : card(c), after: st.ok ? stampedLine({ stamp: st.stamp, reason: st.reason }) : '', ask: o.ask || c.stampAsk, body: stampHTML(), nextLabel: o.nextLabel, timed: o.timed }) + '</div>'; },
    want: function () { if (st.ok) return { kind: 'click', sel: '[data-act="next"]' }; if (FAILS && o.timeoutFail && !st.failDone[id]) { st.failDone[id] = 1; return { kind: 'click', sel: '[data-act="debug-timeout"]' }; }
      if (FAILS && o.fail) { var n = st.failDone[id] || 0; if (n < o.fail.length) { st.failDone[id] = n + 1; return { kind: 'click', sel: o.fail[n] }; } }
      if (st.stamp !== o.stamp) return { kind: 'click', sel: '[data-stamp="' + o.stamp + '"]' }; if (st.reason !== o.reason) return { kind: 'click', sel: '[data-reason="' + o.reason + '"]' }; return { kind: 'click', sel: '[data-act="stamp"]' }; } }; }
  /* the stamp's judge: ok gives the points (10, or 6 after a wrong stamp or reason, 6 on the fix) and the badge (G5) */
  function judgeStamp(sc) { var r = J.checkStamp({ stamp: st.stamp, reason: st.reason }, sc.wantStamp);
    if (r.code === 'ok') { st.ok = true; st.line = sc.lines.ok; st.lineKind = 'ok'; if (sc.ch === 'c6') stopTimer();
      st.stamps[sc.ch] = { stamp: st.stamp, reason: st.reason, fixed: sc.fix || undefined };
      addXp(sc.id, sc.fix || st.stampMiss ? 6 : 10); if (!sc.fix && !(sc.ch === 'c6' && st.timedOut)) giveBadge(sc.badge);
      if (st.stamp === 'PRINT' && !st.fanfared.print) { st.fanfared.print = 1; Snd.fanfare(); } else Snd.ding(); save(); }
    else { st.line = r.code === 'stamp' ? sc.lines.no : r.code === 'reason' ? sc.lines.reasonNo : S.stamp.missing; st.lineKind = 'no'; if (r.code !== 'missing') st.stampMiss++; Snd.thud(); }
    render(); }
  var DN = window.DoNow, H = function (k) { return S[k].headline; };
  /* ---------- screens ---------- */
  var screens = [
    { id: 'donow', ch: 'donow', render: function () { var q = DN[st.donow.n]; if (!q) return scene('plain', '<div class="kick">' + esc(S.donow.kicker) + '</div><p class="ask">' + esc(S.donow.finish) + '</p><button class="btn big" data-act="next">' + esc(S.donow.button) + '</button>');
        var opts = this._o && this._o.n === st.donow.n ? this._o.v : (this._o = { n: st.donow.n, v: shuffle(q.options.map(function (o, i) { return { t: o, i: i }; })) }).v, p = st.donow.picked;
        return scene('plain', '<div class="kick">' + esc(S.donow.kicker) + ' · ' + esc(S.donow.progress.replace('{n}', st.donow.n + 1)) + '</div>' + (st.donow.n === 0 && p == null ? '<p class="small">' + esc(S.donow.intro) + '</p>' : '') + '<p class="ask">' + esc(q.stem) + '</p><div class="opts col">' + opts.map(function (o) { return '<button class="btn opt' + (p != null ? (o.i === 0 ? ' right' : (o.i === p ? ' wrong' : '')) : '') + '" data-pick="' + o.i + '"' + (p != null ? ' disabled' : '') + '>' + esc(o.t) + '</button>'; }).join('') + '</div>' + (p != null ? '<p class="line ' + (p === 0 ? 'ok' : 'no') + '">' + esc(p === 0 ? S.donow.right : S.donow.wrong) + '</p><button class="btn" data-act="dn-next">' + esc(C.next) + '</button>' : '')); },
      want: function () { if (!DN[st.donow.n]) return { kind: 'click', sel: '[data-act="next"]' }; return st.donow.picked != null ? { kind: 'click', sel: '[data-act="dn-next"]' } : { kind: 'click', sel: '[data-pick="0"]' }; } },
    { id: 'opening', ch: 'open', render: function () { var o = S.opening; return scene('opening', '<div class="kick">' + esc(o.kicker) + '</div><p class="open">' + esc(o.line1) + '</p><p class="open">' + esc(o.line2) + '</p><p class="open dim">' + esc(o.line3) + '</p><button class="btn big" data-act="next">' + esc(o.button) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    /* §6.1 three bubbles, each 1.2 s + 0.35 s a word after the one before, each with the buzz and a shake */
    { id: 'story', ch: 'open', film: 5, render: function () { var n = st.filmShown, all = [S.story.b1, S.story.b2, S.story.b3]; return scene('story', msg(S.story.kicker, S.story.from || 'Dee', all.slice(0, n)) + (n < 3 ? '<button class="btn ghost" data-act="readall">' + esc(S.story.readAll) + '</button>' : '<button class="btn big" data-act="next">' + esc(S.story.go) + '</button>')); },
      enter: function () { st.filmShown = 0; var self = this, at = 0, all = [S.story.b1, S.story.b2, S.story.b3]; all.forEach(function (b, i) { at += (i === 0 ? 600 : (1.2 + 0.35 * all[i - 1].split(/\s+/).length) * 1000) / SPEED; setTimeout(function () { if (screens[st.i] === self && !st.review && st.filmShown < i + 1) { st.filmShown = i + 1; Snd.buzz(); render(); } }, at); }); },
      want: function () { return st.filmShown < 3 ? { kind: 'click', sel: '[data-act="readall"]' } : { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'facts', ch: 'open', render: function () { var f = S.facts; return scene('plain', '<div class="kick">' + esc(f.kicker) + '</div><p class="ask">' + esc(f.intro) + '</p><div class="paper"><p class="headline small">' + esc(f.t1) + '</p><div class="bank">' + f.t1cols.split(' · ').map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') + '</div></div><div class="paper"><p class="headline small">' + esc(f.t2) + '</p><div class="bank">' + f.t2cols.split(' · ').map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') + '</div></div><button class="btn big" data-act="next">' + esc(f.button) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'tour', ch: 'open', enter: function () { st.table = 'people'; st.q = ''; st.rows = null; st.tourN = 0; }, render: function () { var t = S.tour, stops = [t.s1, t.s2, t.s3], n = st.tourN; return '<div class="two">' + deskHTML({ spot: n + 1, bankLabel: true }) + '<div class="coach"><div class="kick">' + esc(t.kicker) + ' · ' + esc(C.tourStop.replace('{n}', n + 1)) + '</div><p class="ask">' + esc(stops[n]) + '</p><button class="btn" data-act="tour">' + esc(n < 2 ? t.next : t.done) + '</button></div></div>'; }, want: function () { return { kind: 'click', sel: '[data-act="tour"]' }; } },
    /* 1 · the question */
    titleScreen('c1-title', 'c1', S.c1, 1), showScreen('c1-show', 'c1', S.c1, 'people'),
    askScreen('c1-ask', 'c1', S.c1, { table: 'people', ids: T.c1, ask: S.c1.ask, hints: [S.c1.h1, S.c1.h2, S.c1.h3], code: S.c1.h3code, bankLabel: true, fail: 'sleep_hours > 8' }),
    predictScreen('c1-compare', 'c1', S.c1, { kicker: S.c1.compareKicker, avgs: [S.c1.compare1, S.c1.compare2], q: S.c1.predict, options: S.c1.options }),
    { id: 'c1-stampshow', ch: 'c1', render: function () { var c = S.c1; return '<div class="two">' + deskHTML({ readonly: true }) + '<div class="coach"><div class="kick">' + esc(c.stampShowKicker) + '</div><p class="ask">' + esc(c.stampShow1) + '</p>' + paper({ headline: c.stampShowCard, byline: c.stampShowBy, stamp: 'SPIKE' }) + '<p class="ask">' + esc(c.stampShow2) + '</p><p class="ask">' + esc(c.stampShow3) + '</p><button class="btn" data-act="next">' + esc(C.got) + '</button></div></div>'; }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    stampScreen('c1-stamp', 'c1', S.c1, { stamp: 'SPIKE', reason: 'numbers', badge: 'asker', avgs: [S.c1.compare1, S.c1.compare2], nextLabel: S.c1.doneLine, fail: ['[data-stamp="PRINT"]', '[data-reason="backed"]', '[data-act="stamp"]'] }),
    /* 2 · two at once */
    titleScreen('c2-title', 'c2', S.c2, 2), showScreen('c2-show', 'c2', S.c2, 'people'),
    askScreen('c2-ask', 'c2', S.c2, { table: 'people', ids: T.c2, ask: S.c2.ask, hints: [S.c2.h1, S.c2.h2, S.c2.h3], code: S.c2.h3code, fail: 'age < 20 OR phone_hours >= 5' }),
    predictScreen('c2-predict', 'c2', S.c2, { q: S.c2.predict, options: S.c2.options }),
    stampScreen('c2-stamp', 'c2', S.c2, { stamp: 'SPIKE', reason: 'numbers', badge: 'both', nextLabel: S.c2.doneLine }),
    /* 3 · one week (Days) */
    titleScreen('c3-title', 'c3', S.c3, 3), showScreen('c3-show', 'c3', S.c3, 'days'),
    askScreen('c3-ask', 'c3', S.c3, { table: 'days', ids: T.c3, ask: S.c3.ask, hints: [S.c3.h1, S.c3.h2, S.c3.h3], code: S.c3.h3code, fail: 'day_no BETWEEN 40 AND 45' }),
    predictScreen('c3-compare', 'c3', S.c3, { kicker: S.c3.compareKicker, avgs: [S.c3.compare1, S.c3.compare2], q: S.c3.predict, options: S.c3.options }),
    stampScreen('c3-stamp', 'c3', S.c3, { stamp: 'SPIKE', reason: 'cherry', badge: 'week', avgs: [S.c3.compare1, S.c3.compare2], nextLabel: S.c3.doneLine, fail: ['[data-stamp="SPIKE"]', '[data-reason="numbers"]', '[data-act="stamp"]'] }),
    /* 4 · either one (People) */
    titleScreen('c4-title', 'c4', S.c4, 4), showScreen('c4-show', 'c4', S.c4, 'people'),
    askScreen('c4-ask', 'c4', S.c4, { table: 'people', ids: T.c4, ask: S.c4.ask, hints: [S.c4.h1, S.c4.h2, S.c4.h3], code: S.c4.h3code, fail: 'pet = "dog" AND pet = "cat"' }),
    predictScreen('c4-predict', 'c4', S.c4, { q: S.c4.predict, options: S.c4.options }),
    stampScreen('c4-stamp', 'c4', S.c4, { stamp: 'PRINT', reason: 'backed', badge: 'either', nextLabel: S.c4.doneLine }),
    /* 5 · leave out */
    titleScreen('c5-title', 'c5', S.c5, 5), showScreen('c5-show', 'c5', S.c5, 'people'),
    askScreen('c5-ask', 'c5', S.c5, { table: 'people', ids: T.c5, ask: S.c5.ask, hints: [S.c5.h1, S.c5.h2, S.c5.h3], code: S.c5.h3code, fail: 'NOT area = "Old Town"' }),
    predictScreen('c5-compare', 'c5', S.c5, { kicker: S.c5.compareKicker, avgs: [S.c5.compare1, S.c5.compare2], q: S.c5.predict, options: S.c5.options }),
    stampScreen('c5-stamp', 'c5', S.c5, { stamp: 'SPIKE', reason: 'few', badge: 'rest', avgs: [S.c5.compare1, S.c5.compare2], nextLabel: S.c5.doneLine }),
    /* 6 · the rush: 180 s by the clock from Start the clock across both rules and the stamp */
    { id: 'c6-ring', ch: 'c6', film: 2, enter: function () { Snd.ring(); }, render: function () { return scene('call', '<div class="ring"><span class="ava big">D</span><p class="ask">' + esc(S.c6.ring) + '</p><button class="btn big" data-act="next">' + esc(S.c6.ringButton) + '</button></div>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    askScreen('c6-ask1', 'c6', S.c6, { table: 'days', ids: T.c6a, kicker: S.c6.title, lead: S.c6.intro, ask: S.c6.ask1, hints: [S.c6.h1a, S.c6.h1b, S.c6.h1c], code: S.c6.h1code, judge: S.c6.judge1, timed: true, fail: 'temp_c > 24' }),
    askScreen('c6-ask2', 'c6', S.c6, { table: 'days', ids: T.c6b, kicker: S.c6.title, ask: S.c6.ask2, hints: [S.c6.h2a, S.c6.h2b, S.c6.h2c], code: S.c6.h2code, judge: S.c6.judge2, timed: true, nocard: true, fail: 'temp_c <= 18' }),
    stampScreen('c6-stamp', 'c6', S.c6, { stamp: 'SPIKE', reason: 'cause', table: 'days', avgs: [S.c6.compare1, S.c6.compare2], badge: 'rush', timed: true, timeoutFail: true, nextLabel: S.c6.doneLine }),
    { id: 'c6-printed', ch: 'c6', enter: function () { stopTimer(); }, render: function () { return scene('call', '<div class="kick">' + esc(S.c6.printedKicker) + '</div><p class="ask">' + esc(S.c6.timeUp) + '</p>' + paper({ headline: S.c6.headline, byline: S.c6.byline, stamp: S.c6.printedStamp }, true) + '<p class="ask">' + esc(S.c6.printedLine) + '</p><button class="btn big" data-act="next">' + esc(C.next) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'c6-letter', ch: 'c6', render: function () { var c = S.c6; return scene('plain', '<div class="kick">' + esc(c.morningKicker) + '</div><div class="paper letter">' + [c.letter1, c.letter2, c.letter3, c.letter4].map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div><button class="btn big" data-act="next">' + esc(c.letterButton) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    stampScreen('c6-fix', 'c6', S.c6, { stamp: 'SPIKE', reason: 'cause', table: 'days', fix: true, ask: S.c6.fixAsk, ok: S.c6.fixOk, avgs: [S.c6.compare1, S.c6.compare2], nextLabel: S.c6.doneLine }),
    /* §13 the front page */
    { id: 'front', ch: 'front', enter: function () { if (!st.fanfared.front) { st.fanfared.front = 1; Snd.fanfare(); } },
      render: function () { var f = S.front, sp = spikedList(); return scene('frontpage', '<div class="kick">' + esc(f.kicker) + '</div><p class="ask">' + esc(f.intro) + '</p><div class="front"><h1 class="masthead">' + esc(f.masthead) + '</h1><p class="dateline">' + esc(f.date) + '</p><p class="lead">' + esc(H('c4')) + '</p><p class="sub">' + esc(f.printedSub) + '</p>'
        + (st.timedOut ? '<p class="lead wrong">' + esc(H('c6')) + '</p><p class="sub">' + esc(f.wrongSub) + '</p><p class="corr">' + esc(f.corrected) + '</p>' : '')
        + '<div class="spiked"><h2>' + esc(f.spikedTitle) + ' · ' + sp.length + '</h2>' + sp.map(function (k) { var s = st.stamps[k]; return '<span class="spk">' + esc(H(k)) + (s ? '<em>' + esc(S.stamp.reasons[s.reason]) + '</em>' : '') + '</span>'; }).join('') + '</div><p class="pby" id="pby">' + esc(f.byline.replace('{name}', st.name || f.you)) + '</p></div><div class="namerow"><label class="small">' + esc(f.rename) + ' <input id="fname" maxlength="40" autocomplete="off" value="' + esc(st.name) + '"></label><button class="btn big" data-act="next">' + esc(f.button) + '</button></div>'); },
      want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'badges', ch: 'close', enter: function () { Snd.fanfare(); }, render: function () { var c = S.close; return scene('plain', '<div class="kick">' + esc(c.badgesTitle) + ' · ' + esc(C.xp.replace('{n}', st.xp)) + '</div><div class="badges">' + c.badges.map(function (b) { var got = st.badges.indexOf(b.id) >= 0; return '<div class="badge' + (got ? ' got' : '') + '" data-badge="' + b.id + '"><b>' + esc(b.name) + '</b><span>' + esc(got ? b.line : C.nextTime) + '</span></div>'; }).join('') + '</div><button class="btn big" data-act="next">' + esc(C.next) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'recap', ch: 'close', render: function () { var c = S.close; return scene('plain', '<div class="kick">' + esc(c.recapTitle) + '</div><ol class="recap">' + c.recap.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol><button class="btn big" data-act="next">' + esc(C.next) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'exit', ch: 'close', render: function () { var c = S.close, q = c.exit[st.exit.n]; if (!q) return scene('plain', '<div class="kick">' + esc(c.exitTitle) + '</div><p class="ask">' + esc(c.exitDone) + '</p><button class="btn big" data-act="next">' + esc(C.next) + '</button>');
        var opts = this._o && this._o.n === st.exit.n ? this._o.v : (this._o = { n: st.exit.n, v: shuffle(q.options.map(function (o, i) { return { t: o, i: i }; })) }).v, p = st.exit.picked;
        return '<div class="two">' + deskHTML({ readonly: true }) + '<div class="coach"><div class="kick">' + esc(c.exitTitle) + ' · ' + esc(c.exitOf.replace('{n}', st.exit.n + 1)) + '</div><p class="ask">' + esc(q.stem) + '</p><div class="opts col">' + opts.map(function (o) { return '<button class="btn opt' + (p != null ? (o.i === 0 ? ' right' : (o.i === p ? ' wrong' : '')) : '') + '" data-xpick="' + o.i + '"' + (p != null ? ' disabled' : '') + '>' + esc(o.t) + '</button>'; }).join('') + '</div>' + (p != null ? '<p class="line ' + (p === 0 ? 'ok' : 'no') + '">' + esc(p === 0 ? c.exitRight : c.exitWrong) + '</p><button class="btn" data-act="x-next">' + esc(C.next) + '</button>' : '') + '</div></div>'; },
      want: function () { if (!S.close.exit[st.exit.n]) return { kind: 'click', sel: '[data-act="next"]' }; return st.exit.picked != null ? { kind: 'click', sel: '[data-act="x-next"]' } : { kind: 'click', sel: '[data-xpick="0"]' }; } },
    { id: 'felt', ch: 'close', render: function () { var c = S.close; return scene('plain', '<div class="kick">' + esc(c.feltTitle) + '</div><p class="small">' + esc(c.feltIntro) + '</p>' + c.felt.map(function (f, i) { return '<div class="feltrow"><span>' + esc(f) + '</span><span class="scale">' + c.feltScale.map(function (s, j) { return '<button class="btn opt' + (st.felt[i] === j ? ' right' : '') + '" data-felt="' + i + ':' + j + '">' + esc(s) + '</button>'; }).join('') + '</span></div>'; }).join('') + '<div class="feltrow"><span>' + esc(c.difficulty) + '</span><span class="scale">' + c.difficultyScale.map(function (s, j) { return '<button class="btn opt' + (st.felt.d === j ? ' right' : '') + '" data-felt="d:' + j + '">' + esc(s) + '</button>'; }).join('') + '</span></div><label class="small">' + esc(c.comment) + ' <input id="fcomment"></label><button class="btn big" data-act="next"' + ([0, 1, 2, 'd'].every(function (k) { return st.felt[k] != null; }) ? '' : ' disabled') + '>' + esc(c.send) + '</button>'); },
      want: function () { for (var k of [0, 1, 2, 'd']) if (st.felt[k] == null) return { kind: 'click', sel: '[data-felt="' + k + ':2"]' }; return { kind: 'click', sel: '[data-act="next"]' }; } },
    /* §14.5 free time: two more headlines, her own rules, a live average card for every kept set */
    { id: 'free', ch: 'close', enter: function () { var f = S.close.free[st.free.n]; st.table = f ? f.table : 'people'; var r = takeRestore(); st.q = r ? r.q : ''; st.rows = runRows(st.q, st.table); },
      render: function () { var c = S.close, f = c.free[st.free.n], fr = st.free, done = f && fr.done.indexOf(fr.n) >= 0;
        return '<div class="two">' + deskHTML({ tables: true, avgs: freeAvgs() }) + '<div class="coach"><div class="kick">' + esc(c.freeTitle) + (f ? ' · ' + esc(c.freeOf.replace('{n}', fr.n + 1)) : '') + '</div>'
          + (f ? (fr.n === 0 && !fr.shown ? '<p class="small">' + esc(c.freeIntro) + '</p>' : '') + paper({ headline: f.headline, byline: S.c1.byline.split(' · ')[0], stamp: done ? (fr.n === 0 ? 'SPIKE' : 'PRINT') : null }) + '<p class="hint">' + esc(f.hint) + '</p>'
            + (fr.shown ? '<p class="line ok">' + esc(f.reveal) + '</p><button class="btn" data-act="free-next">' + esc(C.nextOne) + '</button>' : '<button class="btn ghost" data-act="reveal">' + esc(c.reveal) + '</button>')
            : '<p class="ask">' + esc(c.end) + '</p>' + (FRAMED ? '<button class="btn big" data-act="free-done">' + esc(C.done) + '</button>' : '')) + '</div></div>'; },
      want: function () { return { kind: 'done' }; } }
  ];
  /* framed, the Do now, the last five questions and How did it go? are the platform's own steps */
  if (FRAMED) screens = screens.filter(function (s) { return ['donow', 'exit', 'felt'].indexOf(s.id) < 0; });
  function idxOf(id) { return screens.map(function (s) { return s.id; }).indexOf(id); }
  function spikedList() { return ['c1', 'c2', 'c3', 'c5', 'c6'].filter(function (k) { return !(k === 'c6' && st.timedOut); }); }
  function takeRestore() { var r = st.restore; st.restore = null; return r; }
  /* ---------- strip, notes, render ---------- */
  var ORDER = ['donow', 'open', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'front', 'close'], HEADS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  function elapsedMin() { return (Date.now() - st.t0) / 60000; }
  function rushOpen() { return elapsedMin() >= 48; }
  function stripHTML() { var sc = screens[st.i], k = ORDER.indexOf(sc.ch), mins = Math.max(0, Math.ceil(60 - elapsedMin())), rush = rushOpen();
    return '<div class="strip"><span class="lesson">' + esc(S.lesson.title) + '</span><span class="rail">' + ORDER.filter(function (c) { return !FRAMED || c !== 'donow'; }).map(function (c) { var i = ORDER.indexOf(c), past = i < k || st.chDone.indexOf(c) >= 0, here = i === k, canOpen = past && !here && HEADS.indexOf(c) >= 0 && !!st.snaps[c], fin = c === 'close' && rush && !here;
      return '<button class="rc' + (here ? ' here' : past ? ' past' : '') + (fin ? ' open' : '') + '" data-chip="' + c + '"' + (canOpen || fin ? '' : ' tabindex="-1" aria-disabled="true"') + '>' + esc(S.rail[c]) + (here ? '<em>' + esc(C.here) + '</em>' : '') + '</button>'; }).join('') + '</span><span class="xp">' + esc(C.xp.replace('{n}', st.xp)) + '</span>'
      + (elapsedMin() >= 40 ? '<span class="meta">' + esc(C.minsLeft.replace('{m}', mins)) + '</span>' : '') + '</div>' + (rush && sc.ch !== 'close' ? '<p class="note">' + esc(C.outOfTime) + '</p>' : '') + (st.lighterSay ? '<p class="note">' + esc(C.lighter) + '</p>' : ''); }
  function dockHTML() { return '<div class="dock"><button class="btn tiny" data-act="pause">' + esc(C.pause) + '</button><button class="btn tiny" data-act="sound">' + esc(st.soundOff ? C.soundOff : C.soundOn) + '</button></div>'; }
  function mainHTML(sc) {
    if (st.welcome) { var w = st.welcome; return '<div class="welcome coach"><p class="ask">' + esc(C.welcomeBack.replace('{where}', S.rail[w.ch] || '')) + '</p><button class="btn big" data-act="carry">' + esc(C.carryOn) + '</button><button class="btn ghost" data-act="again">' + esc(C.startAgain) + '</button></div>'; }
    if (st.review) { var r = st.review, sn = st.snaps[r.ch] || {}, c = S[r.ch], s = st.stamps[r.ch], view = { table: sn.table || 'people', q: sn.q || '', rows: runRows(sn.q, sn.table || 'people') };
      return '<div class="two">' + deskHTML({ view: view, readonly: true }) + '<div class="coach"><div class="kick">' + esc(S.rail[r.ch]) + '</div>' + paper({ headline: c.headline, byline: c.byline, stamp: s ? s.stamp : null }) + stampedLine(s) + '<button class="btn" data-act="unreview">' + esc(C.back) + '</button></div></div>'; }
    var p = partOf(sc.ch); return (p ? '<div class="partof">' + esc(p) + '</div>' : '') + sc.render(); }
  function render() { var sc = screens[st.i], root = document.getElementById('hour'), ch = st.review ? st.review.ch : sc.ch;
    root.className = 'bg-' + ch + (st.lite >= 1 ? ' lite' : '') + (st.lite >= 2 ? ' lighter' : '');
    root.innerHTML = '<div class="photo"></div><div id="stripbox">' + (sc.id === 'opening' && !st.review ? '' : stripHTML()) + '</div><main>' + mainHTML(sc) + '</main>' + dockHTML() + (st.paused ? '<div class="pauseveil"><p>' + esc(C.paused) + '</p><button class="btn big" data-act="pause">' + esc(C.resume) + '</button></div>' : '');
    var b = document.getElementById('qbox'); if (b) { b.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runQuery(); } }); b.addEventListener('input', function () { st.q = b.value; }); } }
  function refreshStrip() { var b = document.getElementById('stripbox'), sc = screens[st.i]; if (b && sc.id !== 'opening') b.innerHTML = stripHTML(); }
  setInterval(refreshStrip, 15000);
  function snap(ch) { st.snaps[ch] = { table: st.table, q: st.q }; if (st.chDone.indexOf(ch) < 0) st.chDone.push(ch); }
  function go(n) { var old = screens[st.i], sc = screens[n]; if (old && old.leave) old.leave();
    if (old && sc && old.ch !== sc.ch) { snap(old.ch); if (old.ch === 'c6') stopTimer(); }
    st.i = n; st.ok = false; st.line = null; st.lineKind = ''; st.hint = 0; st.predicted = null; st.tourN = 0; st.flash = null; if (sc.enter) sc.enter(); st.restore = null; render(); save(); }
  function next() { var sc = screens[st.i];
    if (sc.id === 'front') { var f = document.getElementById('fname'); st.name = f ? f.value.trim().slice(0, 40) : st.name;
      B.frontpage({ name: st.name || S.front.you, printed: ['c4'], spiked: spikedList(), corrected: !!st.timedOut }); }
    if (sc.id === 'badges' && st.rush) { if (FRAMED) { save(); return B.done('rush'); } return go(idxOf('exit')); }
    if (FRAMED && sc.id === 'recap') { snap('close'); save(); return B.done('end'); }
    if (sc.id === 'c6-stamp') return go(idxOf('front'));
    if (st.i + 1 < screens.length) go(st.i + 1); }
  function pause(on) { st.paused = on == null ? !st.paused : on; render(); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !(e.target && (e.target.id === 'fname' || e.target.id === 'fcomment'))) pause(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && !st.paused) pause(true); });
  document.addEventListener('input', function (e) { if (e.target.id === 'fname') { var p = document.getElementById('pby'); if (p) p.textContent = S.front.byline.replace('{name}', e.target.value.trim() || S.front.you); } });
  document.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var act = b.getAttribute('data-act'), sc = screens[st.i];
    if (b.hasAttribute('data-chip')) { if (st.paused || st.welcome) return; var id = b.getAttribute('data-chip');
      if (id === 'close' && rushOpen() && sc.ch !== 'close') { st.rush = true; return go(idxOf('badges')); }
      if (st.snaps[id] && HEADS.indexOf(id) >= 0 && id !== sc.ch && !st.review) { if (st.timer) { stopTimer(); st.held = true; } st.review = { ch: id }; render(); } return; }
    if (st.paused && act !== 'pause') return;
    if (act === 'next') next();
    else if (act === 'unreview') { st.review = null; if (st.held) { st.held = false; st.lastNow = Date.now(); st.timer = setTimeout(clockFrame, FRAME); } render(); }
    else if (act === 'carry') { var w = st.welcome; st.welcome = null; st.restore = { q: w.q || '' }; st.resume = w.remain != null ? w.remain : null; var n = idxOf(w.at); go(n >= 0 ? n : 0); }
    else if (act === 'again') { st.welcome = null; st.stamps = {}; st.snaps = {}; st.chDone = []; st.timedOut = false; st.q = ''; st.rows = null; st.free = { n: 0, shown: false, wet: false, dry: false, done: [] }; st.name = ''; st.resume = null; go(0); }
    else if (act === 'free-done') { save(); B.done('free'); }
    else if (act === 'run') runQuery();
    else if (act === 'clear') { st.q = ''; st.rows = null; st.line = null; st.lineKind = ''; render(); focusBox(); }
    else if (act === 'hint') { st.hint++; render(); focusBox(); }
    else if (act === 'tour') { st.tourN = (st.tourN || 0) + 1; if (st.tourN > 2) next(); else render(); }
    else if (act === 'readall') { st.filmShown = 3; render(); }
    else if (act === 'pause') pause();
    else if (act === 'sound') { st.soundOff = !st.soundOff; try { localStorage.setItem('nightdesk-sound-' + (PL.name || 'me'), st.soundOff ? 'off' : 'on'); } catch (e2) {} render(); }
    else if (act === 'stamp') judgeStamp(sc);
    else if (act === 'reveal') { st.free.shown = true; freeDone(); render(); save(); }
    else if (act === 'free-next') { st.free.n++; st.free.shown = false; var f = S.close.free[st.free.n]; if (f) st.table = f.table; st.q = ''; st.rows = null; render(); save(); }
    else if (act === 'dn-next') { st.donow.n++; st.donow.picked = null; render(); }
    else if (act === 'x-next') { st.exit.n++; st.exit.picked = null; render(); }
    else if (act === 'debug-timeout' && FAILS) timeout();
    else if (b.hasAttribute('data-word')) insertWord(b.getAttribute('data-word'));
    else if (b.hasAttribute('data-table')) { st.table = b.getAttribute('data-table'); st.q = ''; st.rows = null; st.line = null; render(); }
    else if (b.hasAttribute('data-stamp')) { st.stamp = b.getAttribute('data-stamp'); st.line = null; render(); }
    else if (b.hasAttribute('data-reason')) { st.reason = b.getAttribute('data-reason'); st.line = null; render(); }
    else if (b.hasAttribute('data-pick')) { st.donow.picked = +b.getAttribute('data-pick'); (st.donow.picked === 0 ? Snd.ding : Snd.thud)(); render(); }
    else if (b.hasAttribute('data-xpick')) { st.exit.picked = +b.getAttribute('data-xpick'); (st.exit.picked === 0 ? Snd.ding : Snd.thud)(); render(); }
    else if (b.hasAttribute('data-opt')) { st.predicted = b.getAttribute('data-opt'); if (st.predicted === sc.right) { addXp(sc.id, 5); Snd.ding(); save(); } else Snd.thud(); render(); }
    else if (b.hasAttribute('data-felt')) { var p = b.getAttribute('data-felt').split(':'); st.felt[p[0] === 'd' ? 'd' : +p[0]] = +p[1]; render(); }
  });
  /* §17 the watchdog (L4's): frames over 50 ms for 2 s drop the blur; over 80 ms for 2 s drop the photographs too and say so once */
  (function watch() { var last = performance.now(), slow50 = 0, slow80 = 0; function f(t) { var dt = t - last; last = t; if (!document.hidden && dt < 1000) { slow50 = dt > 50 ? slow50 + dt : 0; slow80 = dt > 80 ? slow80 + dt : 0; var want = slow80 >= 2000 ? 2 : slow50 >= 2000 ? 1 : 0; if (want > st.lite) { st.lite = want; var root = document.getElementById('hour'); root.classList.add('lite'); if (want >= 2) { root.classList.add('lighter'); if (!st.lighterSaid) { st.lighterSaid = st.lighterSay = true; refreshStrip(); setTimeout(function () { st.lighterSay = false; refreshStrip(); }, 8000); } } } } requestAnimationFrame(f); } requestAnimationFrame(f); })();
  window.Hour = { screen: function () { return st.welcome ? 'welcome' : st.review ? 'review-' + st.review.ch : screens[st.i].id; },
    measure: function () { var sc = screens[st.i], prose = [], code = []; document.querySelectorAll('main p, main h1, main h2, main li, main .kick, main .feltrow > span:first-child, main label, main .badge').forEach(function (n) { var t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) prose.push(t); }); document.querySelectorAll('main code').forEach(function (n) { code.push(n.textContent); }); return { screen: Hour.screen(), chapter: sc.ch, prose: prose, code: code, film: sc.film || 0 }; },
    want: function () { return screens[st.i].want(); }, go: go, state: st, ids: function () { return screens.map(function (s) { return s.id; }); },
    clock: function () { return { left: st.left, timedOut: !!st.timedOut, remain: st.remain, running: !!st.timer }; }, tasks: T };
  /* ?at= (tests only): the earlier headlines stamped as the model pupil stamped them */
  var RIGHT = { c1: ['SPIKE', 'numbers'], c2: ['SPIKE', 'numbers'], c3: ['SPIKE', 'cherry'], c4: ['PRINT', 'backed'], c5: ['SPIKE', 'few'], c6: ['SPIKE', 'cause'] };
  function stampedUpTo(ch) { var k = ORDER.indexOf(ch); ORDER.slice(0, k).forEach(function (c) { if (RIGHT[c]) { st.stamps[c] = { stamp: RIGHT[c][0], reason: RIGHT[c][1] }; st.snaps[c] = { table: 'people', q: '' }; } if (st.chDone.indexOf(c) < 0) st.chDone.push(c); }); }
  var at = arg('at');
  if (at && idxOf(at) >= 0) { stampedUpTo(screens[idxOf(at)].ch); st.i = idxOf(at); go(idxOf(at)); }
  else if (STAGE === 'free') { st.i = idxOf('free'); go(idxOf('free')); }
  else if (SAVED && SAVED.at && idxOf(SAVED.at) > 0) { st.welcome = SAVED; st.i = idxOf(SAVED.at); render(); }
  else { st.i = 0; screens[0].enter && screens[0].enter(); render(); save(); }
})();
