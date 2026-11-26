/* J3 L6 THE NIGHT DESK — the hour, screen by screen (J3_L6_SPEC.md §5–§17). The prototype's screens on the
   J2 L6 plumbing: the bridge, saving, Welcome back, the strip with its review chips, Running out of time, Pause,
   the sound switch, the watchdog. Every rule runs through Query; the judge never reads the DOM (A14).
   Test args: ?fails=1 walks the honest fails, ?speed=N runs the clocks N times faster, ?frame=ms sets the clock's
   frame, ?min=N starts N minutes into the lesson, ?at=ID opens one screen with the earlier stamps made. */
(function () {
  'use strict';
  var S = window.S, C = S.common, D = window.NightData, Q = window.Query, J = window.NightJudge, B = window.NightdeskBridge, PL = B.place || {};
  var QS = location.search, arg = function (k) { var m = new RegExp('[?&]' + k + '=([^&]+)').exec(QS); return m ? decodeURIComponent(m[1]) : null; };
  var FAILS = arg('fails') === '1', STAMPS = arg('stamps') === '1', SPEED = Number(arg('speed')) || 1, FRAME = Number(arg('frame')) || 100, MIN0 = Number(arg('min')) || 0;
  var FRAMED = B.framed, STAGE = PL.stage || 'hour', SAVED = PL.saved || null, RUSH = 180;
  var started = SAVED && SAVED.started && Date.now() - SAVED.started < 3 * 3600000 ? SAVED.started : Date.now();
  var st = { i: 0, hint: 0, ok: false, line: null, lineKind: '', xp: 0, badges: [], paid: {}, failDone: {}, t0: started - MIN0 * 60000, predicted: null, filmShown: 0, tourN: 0,
    donow: { n: 0, picked: null }, exit: { n: 0, picked: null }, felt: {}, paused: false, name: '', table: 'people', q: '', rows: null, stamp: null, reason: null, stampMiss: 0,
    stamps: {}, timer: null, left: RUSH, remain: null, timedOut: false, free: freshFree(), snaps: {}, chDone: [],
    review: null, welcome: null, rush: false, lite: 0, soundOff: false, flash: null, fanfared: {}, restore: null, helpOn: false, nudged: 0, idleAt: Date.now(), lt: {}, g: null, spotEl: null, demoTxt: null };
  try { st.soundOff = localStorage.getItem('nightdesk-sound-' + (PL.name || 'me')) === 'off'; } catch (e) {}
  if (SAVED) { st.xp = SAVED.xp || 0; st.badges = (SAVED.badges || []).slice(); st.name = SAVED.name || ''; st.snaps = SAVED.snaps || {}; st.chDone = SAVED.chDone || []; st.stamps = SAVED.stamps || {}; st.paid = SAVED.paid || {}; st.timedOut = !!SAVED.timedOut;
    if (SAVED.free && SAVED.free.heads) st.free = Object.assign(freshFree(), SAVED.free); }
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
    if (o.avgs && o.avgs.length) h += '<div class="avgs">' + o.avgs.map(function (a) { return '<p>' + esc(a) + '</p>'; }).join('') + '</div>';
    if (o.tables && !ro) h += '<div class="bank">' + ['people', 'days'].map(function (x) { return '<button class="chip tab' + (t === x ? ' on' : '') + '" data-table="' + x + '">' + esc(x === 'people' ? S.close.people : S.close.days) + '</button>'; }).join('') + '</div>';
    if (!ro) h += '<div class="bank">' + (o.bankLabel ? '<p class="banklab">' + esc(C.bank) + '</p>' : '') + cs.map(function (c) { return '<button class="chip" data-word="' + c + '">' + c + '</button>'; }).join('') + SIGNS.map(function (w) { return '<button class="chip kw" data-word="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '<button class="chip kw" data-word="&quot;&quot;" aria-label="quotes">" "</button></div>';
    h += '<p class="count' + (o.spot === 3 ? ' spot' : '') + (st.flash === 'ok' && !ro ? ' flash' : '') + '">' + esc(C.showing.replace('{n}', rows.length).replace('{all}', all.length).replace('{what}', what)) + '</p>';
    h += '<div class="tbl' + (o.spot === 1 ? ' spot' : '') + '"><table><tr>' + cs.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' + rows.map(function (r) { return '<tr>' + cs.map(function (c) { return '<td class="' + (typeof r[c] === 'number' ? 'num' : '') + '">' + fmtv(r[c]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
    return h + '</div>'; }
  function focusBox() { var b = document.getElementById('qbox'); if (b && !b.readOnly) { b.focus(); var v = b.value; b.value = ''; b.value = v; } }
  /* a bank word goes in at the cursor with a space; the quotes go in as a pair with the cursor between them */
  function insertWord(w) { var b = document.getElementById('qbox'); if (!b || b.readOnly) return; var v = b.value, a = b.selectionStart == null ? v.length : b.selectionStart, z = b.selectionEnd == null ? a : b.selectionEnd;
    var pre = v.slice(0, a), post = v.slice(z), lead = pre && !/\s$/.test(pre) ? ' ' : '', ins, caret;
    if (w === '""') { ins = lead + '""'; caret = pre.length + ins.length - 1; } else { ins = lead + w + (post && /^\s/.test(post) ? '' : ' '); caret = pre.length + ins.length; }
    b.value = pre + ins + post; st.q = b.value; b.focus(); b.setSelectionRange(caret, caret); stopDemo(); applyHelp(); }
  function one(s) { return String(s).replace(/\b1 rows\b/g, '1 row').replace(/\b1 days\b/g, '1 day'); }
  function betweenBack(q) { var m = /BETWEEN\s+(-?\d+(?:\.\d+)?)\s+AND\s+(-?\d+(?:\.\d+)?)/i.exec(q || ''); return !!m && Number(m[1]) > Number(m[2]); }
  /* which joining words a rule uses (the AND inside BETWEEN … AND … does not count) */
  function joins(q) { var s = String(q || '').replace(/BETWEEN\s+\S+\s+AND/gi, 'BETWEEN'); return { and: /\bAND\b/i.test(s), or: /\bOR\b/i.test(s), not: /\bNOT\b/i.test(s) }; }
  function wrongLine(sc, got) { var q = st.q || '', j = joins(q), w = function (s) { return one(s.replace('{got}', got)); }; if (betweenBack(q)) return C.errBetween; if (sc.ch === 'c5') { if (!j.not) return w(S.c5.wrongNot); if (!j.and) return w(S.c5.wrongAnd); }
    if (sc.ch === 'c2' && !j.and) return w(j.or ? S.c2.wrongOr : S.c2.wrongOne);
    if (sc.ch === 'c4' && !j.or) return w(j.and ? S.c4.wrongAnd : S.c4.wrongOne);
    return w(sc.judge.wrong); }
  /* c2: phone_hours >= 5 alone finds the same 6 rows, but only because every heavy phone user is a teen */
  function luckyRule(sc) { return sc.ch === 'c2' && !joins(st.q).and; }
  /* NOT may stand only at the start of a rule, or straight after AND, OR, NOT or a bracket (the grammar's not := "NOT" not | atom) */
  function notOutOfPlace(q) { var t = String(q || '').replace(/BETWEEN\s+\S+\s+AND/gi, 'BETWEEN').replace(/\(/g, ' ( ').split(/\s+/).filter(Boolean); for (var i = 1; i < t.length; i++) if (/^NOT$/i.test(t[i]) && !/^(AND|OR|NOT|\()$/i.test(t[i - 1])) return true; return false; }
  function errLine(r) { var bq = String(st.q || ''); if (r.code === 'syntax' && /\bBETWEEN\b/i.test(bq) && !/\bBETWEEN\s+\S+\s+AND\s+\S/i.test(bq) && C.errBetweenAnd) return C.errBetweenAnd; if (r.code === 'syntax' && C.errNotPlace && notOutOfPlace(bq)) return C.errNotPlace; if (r.code === 'syntax' && /\b(OR|AND)\s*(["'“‘]|\d)/i.test(String(st.q || '').replace(/BETWEEN\s+\S+\s+AND/gi, 'BETWEEN'))) return C.errSide; var m = { empty: C.errEmpty, syntax: C.errSyntax, column: C.errColumn, dangling: C.errDangling, value: C.errValue }; return (m[r.code] || C.errSyntax).replace('{word}', r.word || ''); }
  function runQuery() { if (st.review || st.welcome || st.paused) return; var b = document.getElementById('qbox'); if (b) st.q = b.value; var sc = screens[st.i]; st.flash = null;
    if (sc.id === 'free') { lateRun(); render(); save(); if (!st.ok && !st.lt.ruleOk) focusBox(); return; }
    if (sc.task && !st.ok) { var r = J.checkQuery(st.q, D[st.table], cols(), sc.task.ids);
      if (r.code === 'ok' && luckyRule(sc)) { st.rows = Q.run(st.q, D[st.table], cols()); st.line = S.c2.luck; st.lineKind = 'no'; Snd.thud(); }
      else if (r.code === 'ok') { st.ok = true; st.rows = Q.run(st.q, D[st.table], cols()); st.line = sc.judge.ok; st.lineKind = 'ok'; st.flash = 'ok'; Snd.ding(); award(sc); }
      else if (r.code === 'wrong') { st.rows = Q.run(st.q, D[st.table], cols()); st.line = wrongLine(sc, r.got); st.lineKind = 'no'; Snd.thud(); }
      else { st.line = errLine(r); st.lineKind = 'no'; Snd.thud(); } }
    else { try { st.rows = st.q.trim() ? Q.run(st.q, D[st.table], cols()) : null; st.line = null; st.lineKind = ''; }
      catch (e) { st.line = errLine(e); st.lineKind = 'no'; Snd.thud(); } }
    render(); save(); if (!st.ok) focusBox(); }
  /* §13 points: a rule 10 first time, 6 after a hint, 3 after hint 3 */
  function award(sc) { addXp(sc.id, st.hint === 0 ? 10 : st.hint < 3 ? 6 : 3); }
  /* ---------- panels ---------- */
  function paper(card, drop) { return '<div class="paper' + (card.stamp ? ' stamped' : '') + '"><p class="headline">' + esc(card.headline) + '</p><p class="byline">' + esc(card.byline) + '</p>' + (card.stamp ? '<span class="stampmark ' + card.stamp.toLowerCase() + (drop ? ' drop' : '') + '">' + esc(card.stamp) + '</span>' : '') + '</div>'; }
  function stampedLine(s) { return s ? '<p class="small">' + esc(S.stamp.stamped.replace('{stamp}', S.stamp[s.stamp]).replace('{reason}', S.stamp.reasons[s.reason])) + '</p>' : ''; }
  function timerHTML() { return '<p class="timer' + (st.left <= 10 ? ' last' : '') + '">' + esc(S.c6.timeLeft.replace('{s}', st.left)) + '</p>'; }
  function coach(sc, o) { var h = '<div class="coach">'; if (o.kicker) h += '<div class="kick">' + esc(o.kicker) + '</div>'; if (o.timed && st.timer) h += timerHTML(); if (o.card) h += paper(o.card, st.ok);
    if (o.after) h += o.after;
    if (!st.ok) { if (o.lead) h += '<p class="small">' + esc(o.lead) + '</p>'; h += '<p class="ask">' + esc(o.ask) + '</p>';
      if (o.hints) { for (var i = 1; i <= st.hint; i++) h += '<p class="hint">' + esc(o.hints[i - 1]) + (i === 3 && o.code ? ' <code>' + esc(o.code) + '</code>' : '') + '</p>'; if (st.hint < 3) h += '<button class="btn ghost" data-act="hint">' + esc(C.hintN.replace('{n}', st.hint + 1)) + '</button>'; }
      if (o.body) h += o.body; if (st.line) h += '<p class="line ' + st.lineKind + '">' + esc(st.line) + '</p>'; }
    else h += '<p class="line ' + st.lineKind + '">' + esc(st.line) + '</p><button class="btn" data-act="' + (o.nextAct || 'next') + '">' + esc(o.nextLabel || C.next) + '</button>';
    if (o.timed && st.timer && FAILS) h += '<button class="dbg" data-act="debug-timeout">·</button>';
    return h + '</div>'; }
  function scene(cls, inner) { return '<div class="scene ' + cls + '">' + inner + '</div>'; }
  function msg(kicker, from, lines, shown) { return '<div class="phone"><div class="kick">' + esc(kicker) + '</div><div class="from"><span class="ava">D</span>' + esc(from) + '</div>' + lines.map(function (l, i) { return '<p class="bubble"' + (shown != null && i >= shown ? ' style="visibility:hidden" aria-hidden="true"' : '') + '>' + esc(l) + '</p>'; }).join('') + '</div>'; }
  function predictHTML(sc, q, options, right) { var opts = sc._opts || (sc._opts = shuffle(options)); var h = '<p class="ask">' + esc(q) + '</p><div class="opts col">' + opts.map(function (o) { return '<button class="btn opt' + (st.predicted ? (o === right ? ' right' : st.predicted === o ? ' wrong' : '') : '') + '" data-opt="' + esc(o) + '"' + (st.predicted ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>';
    if (st.predicted) h += '<p class="line ' + (st.predicted === right ? 'ok' : 'no') + '">' + esc(st.predicted === right ? sc.predictRight : sc.predictWrong) + '</p><button class="btn" data-act="next">' + esc(C.next) + '</button>'; return h; }
  function stampHTML() { var h = '<div class="stamps">' + ['PRINT', 'SPIKE'].map(function (s) { return '<button class="btn stampbtn ' + s.toLowerCase() + (st.stamp === s ? ' on' : '') + '" data-stamp="' + s + '">' + esc(S.stamp[s]) + '</button>'; }).join('') + '</div>';
    if (st.stamp) h += '<p class="small">' + esc(S.stamp.why) + '</p><div class="reasons">' + Object.keys(S.stamp.reasons).map(function (k) { return '<button class="btn opt' + (st.reason === k ? ' on' : '') + '" data-reason="' + k + '">' + esc(S.stamp.reasons[k]) + '</button>'; }).join('') + '<button class="btn go" data-act="stamp"' + (st.reason ? '' : ' disabled') + '>' + esc(S.stamp.confirm) + '</button></div>';
    return h; }
  /* ---------- the rush clock: remaining time falls by the wall clock between frames, not at all while paused ---------- */
  function startTimer() { if (st.timer || st.timedOut || st.stamps.c6) return; st.remain = st.resume != null ? st.resume / SPEED : RUSH * 1000 / SPEED; st.resume = null;
    st.left = Math.max(0, Math.ceil(st.remain * SPEED / 1000)); st.lastNow = Date.now(); st.timer = setTimeout(clockFrame, FRAME); }
  function clockFrame() { var now = Date.now(), dt = now - st.lastNow; st.lastNow = now; if (!st.paused && !st.helpOn) st.remain -= dt; var left = Math.max(0, Math.ceil(st.remain * SPEED / 1000));
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
    render: function () { return '<div class="two">' + deskHTML({ readonly: true }) + '<div class="coach"><div class="kick">' + esc(c.showKicker) + '</div><p class="ask">' + esc(c.show1) + '</p><div class="demo"><code>' + esc(c.showDemo) + '</code></div><p class="ask">' + esc(c.show2) + '</p>' + (c.show3 ? '<p class="ask">' + esc(c.show3) + '</p>' : '') + '<button class="btn" data-act="next">' + esc(C.got) + '</button></div></div>'; },
    want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } }; }
  function askScreen(id, chId, c, o) { return { id: id, ch: chId, rule: o.code, task: { ids: o.ids }, judge: o.judge || c.judge, timed: !!o.timed,
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
      var fl = FAILS && o.fail ? o.fail : null; if (STAMPS) fl = (fl || []).concat(wrongStamps(o.stamp, o.reason));
      if (fl) { var n = st.failDone[id] || 0; if (n < fl.length) { st.failDone[id] = n + 1; return { kind: 'click', sel: fl[n] }; } }
      if (st.stamp !== o.stamp) return { kind: 'click', sel: '[data-stamp="' + o.stamp + '"]' }; if (st.reason !== o.reason) return { kind: 'click', sel: '[data-reason="' + o.reason + '"]' }; return { kind: 'click', sel: '[data-act="stamp"]' }; } }; }
  function wrongStamps(s, r) { return ['[data-stamp="' + (s === 'PRINT' ? 'SPIKE' : 'PRINT') + '"]', '[data-reason="' + (r === 'backed' ? 'numbers' : 'backed') + '"]', '[data-act="stamp"]', '[data-stamp="' + s + '"]', '[data-act="stamp"]']; }
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
    { id: 'opening', ch: 'open', render: function () { var o = S.opening; return scene('opening', '<div class="kick">' + esc(o.kicker) + '</div><p class="open">' + esc(o.line1) + '</p><p class="open">' + esc(o.line2) + '</p>' + (o.line3 ? '<p class="open dim">' + esc(o.line3) + '</p>' : '') + '<button class="btn big" data-act="next">' + esc(o.button) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    /* §6.1 three bubbles, each 1.2 s + 0.35 s a word after the one before, each with the buzz and a shake */
    { id: 'story', ch: 'open', film: 5, render: function () { var n = st.filmShown, all = [S.story.b1, S.story.b2, S.story.b3]; return scene('story', msg(S.story.kicker, S.story.from || 'Dee', all, n) + (n < 3 ? '<button class="btn ghost" data-act="readall">' + esc(S.story.readAll) + '</button>' : '<button class="btn big" data-act="next">' + esc(S.story.go) + '</button>')); },
      enter: function () { st.filmShown = 0; var self = this, at = 0, all = [S.story.b1, S.story.b2, S.story.b3]; all.forEach(function (b, i) { at += (i === 0 ? 600 : (1.2 + 0.35 * all[i - 1].split(/\s+/).length) * 1000) / SPEED; setTimeout(function () { if (screens[st.i] === self && !st.review && st.filmShown < i + 1) { st.filmShown = i + 1; Snd.buzz(); render(); } }, at); }); },
      want: function () { return st.filmShown < 3 ? { kind: 'click', sel: '[data-act="readall"]' } : { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'facts', ch: 'open', render: function () { var f = S.facts; return scene('plain', '<div class="kick">' + esc(f.kicker) + '</div><p class="ask">' + esc(f.intro) + '</p><div class="paper"><p class="headline small">' + esc(f.t1) + '</p><div class="bank">' + D.columns.people.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') + '</div></div><div class="paper"><p class="headline small">' + esc(f.t2) + '</p><div class="bank">' + D.columns.days.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') + '</div></div><button class="btn big" data-act="next">' + esc(f.button) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'tour', ch: 'open', enter: function () { st.table = 'people'; st.q = ''; st.rows = null; st.tourN = 0; }, render: function () { var t = S.tour, stops = [t.s1, t.s2, t.s3], n = st.tourN; return '<div class="two">' + deskHTML({ spot: n + 1, bankLabel: true }) + '<div class="coach"><div class="kick">' + esc(t.kicker) + ' · ' + esc(C.tourStop.replace('{n}', n + 1)) + '</div><p class="ask tourtxt">' + esc(stops[n]) + '</p><button class="btn" data-act="tour">' + esc(n < 2 ? t.next : t.done) + '</button></div></div>'; }, want: function () { return { kind: 'click', sel: '[data-act="tour"]' }; } },
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
    { id: 'c6-letter', ch: 'c6', render: function () { var c = S.c6; return scene('plain', '<div class="kick">' + esc(c.morningKicker) + '</div><div class="paper letter">' + [c.letter1, c.letter2, c.letter3, c.letter4].filter(Boolean).map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div><button class="btn big" data-act="next">' + esc(c.letterButton) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    stampScreen('c6-fix', 'c6', S.c6, { stamp: 'SPIKE', reason: 'cause', table: 'days', fix: true, ask: S.c6.fixAsk, ok: S.c6.fixOk, avgs: [S.c6.compare1, S.c6.compare2], nextLabel: S.c6.doneLine }),
    /* §13 the front page */
    { id: 'front', ch: 'front', enter: function () { if (!st.fanfared.front) { st.fanfared.front = 1; Snd.fanfare(); } },
      render: function () { var f = S.front, sp = spikedList(); return scene('frontpage', '<div class="kick">' + esc(f.kicker) + '</div><p class="ask">' + esc(f.intro) + '</p><div class="front"><h1 class="masthead">' + esc(f.masthead) + '</h1><p class="dateline">' + esc(f.date) + '</p><p class="lead">' + esc(H('c4')) + '</p><p class="sub">' + esc(f.printedSub) + '</p>'
        + (st.timedOut ? '<p class="lead wrong">' + esc(H('c6')) + '</p><p class="sub">' + esc(f.wrongSub) + '</p><p class="corr">' + esc(f.corrected) + '</p>' : '')
        + '<div class="spiked"><h2>' + esc(f.spikedTitle) + ' · ' + sp.length + '</h2>' + sp.map(function (k) { var s = st.stamps[k]; return '<span class="spk">' + esc(H(k)) + (s ? '<em>' + esc(S.stamp.reasons[s.reason]) + '</em>' : '') + '</span>'; }).join('') + '</div><p class="pby" id="pby">' + esc(f.byline.replace('{name}', st.name || f.you)) + '</p></div><div class="namerow"><label class="small">' + esc(f.rename) + ' <input id="fname" maxlength="40" autocomplete="off" placeholder="' + esc(f.namePh) + '" value="' + esc(st.name) + '"></label><button class="btn big" data-act="next">' + esc(f.button) + '</button></div>'); },
      want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'badges', ch: 'close', enter: function () { Snd.fanfare(); }, render: function () { var c = S.close; return scene('plain', '<div class="kick">' + esc(c.badgesTitle) + ' · ' + esc(C.xp.replace('{n}', st.xp)) + '</div><div class="badges">' + c.badges.map(function (b) { var got = st.badges.indexOf(b.id) >= 0; return '<div class="badge' + (got ? ' got' : '') + '" data-badge="' + b.id + '"><b>' + esc(b.name) + '</b><span>' + esc(got ? b.line : C.nextTime) + '</span></div>'; }).join('') + '</div><button class="btn big" data-act="next">' + esc(C.next) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'recap', ch: 'close', render: function () { var c = S.close; return scene('plain', '<div class="kick">' + esc(c.recapTitle) + '</div><ol class="recap">' + c.recap.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol><button class="btn big" data-act="next">' + esc(C.next) + '</button>'); }, want: function () { return { kind: 'click', sel: '[data-act="next"]' }; } },
    { id: 'exit', ch: 'close', render: function () { var c = S.close, q = c.exit[st.exit.n]; if (!q) return scene('plain', '<div class="kick">' + esc(c.exitTitle) + '</div><p class="ask">' + esc(c.exitDone) + '</p><button class="btn big" data-act="next">' + esc(C.next) + '</button>');
        var opts = this._o && this._o.n === st.exit.n ? this._o.v : (this._o = { n: st.exit.n, v: shuffle(q.options.map(function (o, i) { return { t: o, i: i }; })) }).v, p = st.exit.picked;
        return '<div class="two">' + deskHTML({ readonly: true }) + '<div class="coach"><div class="kick">' + esc(c.exitTitle) + ' · ' + esc(c.exitOf.replace('{n}', st.exit.n + 1)) + '</div><p class="ask">' + esc(q.stem) + '</p><div class="opts col">' + opts.map(function (o) { return '<button class="btn opt' + (p != null ? (o.i === 0 ? ' right' : (o.i === p ? ' wrong' : '')) : '') + '" data-xpick="' + o.i + '"' + (p != null ? ' disabled' : '') + '>' + esc(o.t) + '</button>'; }).join('') + '</div>' + (p != null ? '<p class="line ' + (p === 0 ? 'ok' : 'no') + '">' + esc(p === 0 ? c.exitRight : c.exitWrong) + '</p><button class="btn" data-act="x-next">' + esc(C.next) + '</button>' : '') + '</div></div>'; },
      want: function () { if (!S.close.exit[st.exit.n]) return { kind: 'click', sel: '[data-act="next"]' }; return st.exit.picked != null ? { kind: 'click', sel: '[data-act="x-next"]' } : { kind: 'click', sel: '[data-xpick="0"]' }; } },
    { id: 'felt', ch: 'close', render: function () { var c = S.close; return scene('plain', '<div class="kick">' + esc(c.feltTitle) + '</div><p class="small">' + esc(c.feltIntro) + '</p>' + c.felt.map(function (f, i) { return '<div class="feltrow" data-row="' + i + '"><span>' + esc(f) + '</span><span class="scale">' + c.feltScale.map(function (s, j) { return '<button class="btn opt' + (st.felt[i] === j ? ' right' : '') + '" data-felt="' + i + ':' + j + '">' + esc(s) + '</button>'; }).join('') + '</span></div>'; }).join('') + '<div class="feltrow" data-row="d"><span>' + esc(c.difficulty) + '</span><span class="scale">' + c.difficultyScale.map(function (s, j) { return '<button class="btn opt' + (st.felt.d === j ? ' right' : '') + '" data-felt="d:' + j + '">' + esc(s) + '</button>'; }).join('') + '</span></div><label class="small">' + esc(c.comment) + ' <input id="fcomment" placeholder="' + esc(c.commentPh) + '"></label><button class="btn big" data-act="next"' + ([0, 1, 2, 'd'].every(function (k) { return st.felt[k] != null; }) ? '' : ' disabled') + '>' + esc(c.send) + '</button>'); },
      want: function () { for (var k of [0, 1, 2, 'd']) if (st.felt[k] == null) return { kind: 'click', sel: '[data-felt="' + k + ':2"]' }; return { kind: 'click', sel: '[data-act="next"]' }; } },
    /* V85 the late shift: five extras after the evaluation, each one judged; Finish the lesson ends it */
    { id: 'free', ch: 'late', enter: function () { st.free.ended = false; lateItem(); var r = takeRestore(); if (r && r.q && /^(hit|fix)$/.test(st.free.x)) { st.q = r.q; st.rows = runRows(st.q, st.table); } },
      render: function () { return lateHTML(); }, want: function () { return lateWant(); } }
  ];
  /* framed, the Do now, the last five questions and How did it go? are the platform's own steps */
  if (FRAMED) screens = screens.filter(function (s) { return ['donow', 'exit', 'felt'].indexOf(s.id) < 0; });
  function idxOf(id) { return screens.map(function (s) { return s.id; }).indexOf(id); }
  function spikedList() { return ['c1', 'c2', 'c3', 'c5', 'c6'].filter(function (k) { return !(k === 'c6' && st.timedOut); }); }
  function takeRestore() { var r = st.restore; st.restore = null; return r; }
  /* ---------- strip, notes, render ---------- */
  var ORDER = ['donow', 'open', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'front', 'close', 'late'], HEADS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  function elapsedMin() { return (Date.now() - st.t0) / 60000; }
  function rushOpen() { return elapsedMin() >= 48; }
  function stripHTML() { var sc = screens[st.i], k = ORDER.indexOf(sc.ch), mins = Math.max(0, Math.ceil(60 - elapsedMin())), rush = rushOpen();
    return '<div class="strip"><span class="lesson">' + esc(S.lesson.title) + '</span><span class="rail">' + ORDER.filter(function (c) { return !FRAMED || c !== 'donow'; }).map(function (c) { var i = ORDER.indexOf(c), past = i < k || st.chDone.indexOf(c) >= 0, here = i === k, canOpen = past && !here && HEADS.indexOf(c) >= 0 && !!st.snaps[c], fin = c === 'close' && rush && !here && sc.ch !== 'late';
      return '<button class="rc' + (here ? ' here' : past ? ' past' : '') + (fin ? ' open' : '') + '" data-chip="' + c + '"' + (canOpen || fin ? '' : ' tabindex="-1" aria-disabled="true"') + '>' + esc(S.rail[c]) + (here ? '<em>' + esc(C.here) + '</em>' : '') + '</button>'; }).join('') + '</span><span class="xp">' + esc(C.xp.replace('{n}', st.xp)) + '</span>'
      + (elapsedMin() >= 40 ? '<span class="meta">' + esc(C.minsLeft.replace('{m}', mins)) + '</span>' : '') + '<span class="tools"><button class="btn tiny" data-act="pause">' + esc(C.pause) + '</button><button class="btn tiny" data-act="sound">' + esc(st.soundOff ? C.soundOff : C.soundOn) + '</button></span></div>' + (rush && sc.ch !== 'close' && sc.ch !== 'late' ? '<p class="note">' + esc(C.outOfTime) + '</p>' : '') + (st.lighterSay ? '<p class="note">' + esc(C.lighter) + '</p>' : ''); }
  function mainHTML(sc) {
    if (st.welcome) { var w = st.welcome; return '<div class="welcome coach"><p class="ask">' + esc(C.welcomeBack).replace('{where}', '<span class="nw">' + esc(S.rail[(screens[idxOf(w.at)] || w).ch] || '') + '</span>') + '</p><button class="btn big" data-act="carry">' + esc(C.carryOn) + '</button><button class="btn ghost" data-act="again">' + esc(C.startAgain) + '</button></div>'; }
    if (st.review) { var r = st.review, sn = st.snaps[r.ch] || {}, c = S[r.ch], s = st.stamps[r.ch], view = { table: sn.table || 'people', q: sn.q || '', rows: runRows(sn.q, sn.table || 'people') };
      return '<div class="two">' + deskHTML({ view: view, readonly: true }) + '<div class="coach"><div class="kick">' + esc(S.rail[r.ch]) + '</div>' + paper({ headline: c.headline, byline: c.byline, stamp: s ? s.stamp : null }) + stampedLine(s) + '<button class="btn" data-act="unreview">' + esc(C.back) + '</button></div></div>'; }
    return sc.render(); }
  function render() { var sc = screens[st.i], root = document.getElementById('hour'), ch = st.review ? st.review.ch : sc.ch;
    root.className = 'bg-' + ch + (st.lite >= 1 ? ' lite' : '') + (st.lite >= 2 ? ' lighter' : '');
    root.innerHTML = '<div class="photo"></div><div id="stripbox">' + stripHTML() + '</div>' + jobHTML() + '<main>' + mainHTML(sc) + '</main>' + (st.paused ? '<div class="pauseveil"><p>' + esc(C.paused) + '</p><button class="btn big" data-act="pause">' + esc(C.resume) + '</button></div>' : '') + '<div id="tag" hidden></div>';
    var b = document.getElementById('qbox'); if (b) { b.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runQuery(); } }); b.addEventListener('input', function () { st.q = b.value; if (b.value) stopDemo(); applyHelp(); }); }
    applyHelp(); if (typeof sizeTable === 'function') sizeTable(); }
  function refreshStrip() { var b = document.getElementById('stripbox'), sc = screens[st.i]; if (b) b.innerHTML = stripHTML(); }
  setInterval(refreshStrip, 15000);
  function snap(ch) { st.snaps[ch] = { table: st.table, q: st.q }; if (st.chDone.indexOf(ch) < 0) st.chDone.push(ch); }
  function go(n) { var old = screens[st.i], sc = screens[n]; if (old && old.leave) old.leave();
    if (old && sc && old.ch !== sc.ch) { snap(old.ch); if (old.ch === 'c6') stopTimer(); }
    st.i = n; st.ok = false; st.line = null; st.lineKind = ''; st.hint = 0; st.predicted = null; st.tourN = 0; st.flash = null; fresh(); if (sc.enter) sc.enter(); st.restore = null; render(); save(); window.scrollTo(0, 0); }
  function next() { var sc = screens[st.i];
    if (sc.id === 'front') { var f = document.getElementById('fname'); st.name = f ? f.value.trim().slice(0, 40) : st.name;
      B.frontpage({ name: st.name || S.front.you, printed: ['c4'], spiked: spikedList(), corrected: !!st.timedOut }); }
    if (sc.id === 'badges' && st.rush) { if (FRAMED) { save(); return B.done('rush'); } return go(idxOf('exit')); }
    if (FRAMED && sc.id === 'recap') { snap('close'); save(); return B.done('end'); }
    if (sc.id === 'c6-stamp') return go(idxOf('front'));
    if (st.i + 1 < screens.length) go(st.i + 1); }
  function pause(on) { st.paused = on == null ? !st.paused : on; if (st.paused) { st.helpOn = false; stopDemo(); } st.idleAt = Date.now(); st.nudged = 0; render(); }
  document.addEventListener('keydown', function (e) { var typing = e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName), hb = document.getElementById('helpBtn');
    if (e.key === 'Escape') { if (st.helpOn) { setHelp(false); return; } if (!(e.target && (e.target.id === 'fname' || e.target.id === 'fcomment'))) pause(); return; }
    if ((e.key === 'h' || e.key === 'H') && !typing && !st.paused && !e.metaKey && !e.ctrlKey && !e.altKey && hb && !hb.hidden) { e.preventDefault(); setHelp(); } });
  document.addEventListener('visibilitychange', function () { if (document.hidden && !st.paused) pause(true); });
  document.addEventListener('input', function (e) { if (e.target.id === 'fname') { var p = document.getElementById('pby'); if (p) p.textContent = S.front.byline.replace('{name}', e.target.value.trim() || S.front.you); applyHelp(); } });
  document.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var act = b.getAttribute('data-act'), sc = screens[st.i];
    if (b.hasAttribute('data-chip')) { if (st.paused || st.welcome) return; var id = b.getAttribute('data-chip');
      if (id === 'close' && rushOpen() && sc.ch !== 'close' && sc.ch !== 'late') { st.rush = true; return go(idxOf('badges')); }
      if (st.snaps[id] && HEADS.indexOf(id) >= 0 && id !== sc.ch && !st.review) { if (st.timer) { stopTimer(); st.held = true; } st.review = { ch: id }; render(); } return; }
    if (st.paused && act !== 'pause') return;
    if (act === 'next') next();
    else if (act === 'unreview') { st.review = null; if (st.held) { st.held = false; st.lastNow = Date.now(); st.timer = setTimeout(clockFrame, FRAME); } render(); }
    else if (act === 'carry') { var w = st.welcome; st.welcome = null; st.restore = { q: w.q || '' }; st.resume = w.remain != null ? w.remain : null; var n = idxOf(w.at); go(n >= 0 ? n : 0); }
    else if (act === 'again') { st.welcome = null; st.stamps = {}; st.snaps = {}; st.chDone = []; st.timedOut = false; st.q = ''; st.rows = null; st.free = freshFree(); st.name = ''; st.resume = null; go(0); }
    else if (act === 'help') setHelp();
    else if (act === 'help-close') setHelp(false);
    else if (b.hasAttribute('data-x')) lateGo(b.getAttribute('data-x'));
    else if (act === 'late-menu') { stopRace(); st.free.x = null; lateItem(); fresh(); render(); save(); window.scrollTo(0, 0); }
    else if (act === 'late-skip' || act === 'late-next') lateStep();
    else if (act === 'late-finish') { stopRace(); st.free.ended = true; st.free.x = null; lateItem(); fresh(); render(); save(); if (FRAMED) B.done('free'); }
    else if (b.hasAttribute('data-lvl')) raceStart(+b.getAttribute('data-lvl'));
    else if (b.hasAttribute('data-ro')) racePick(+b.getAttribute('data-ro'));
    else if (act === 'race-next') raceNext();
    else if (act === 'race-again') raceStart(st.lt.race.lvl);
    else if (b.hasAttribute('data-cnt')) countPick(+b.getAttribute('data-cnt'));
    else if (act === 'run') runQuery();
    else if (act === 'clear') { st.q = ''; st.rows = null; st.line = null; st.lineKind = ''; render(); focusBox(); }
    else if (act === 'hint') { st.hint++; render(); focusBox(); }
    else if (act === 'tour') { st.tourN = (st.tourN || 0) + 1; if (st.tourN > 2) next(); else render(); }
    else if (act === 'readall') { st.filmShown = 3; render(); }
    else if (act === 'pause') pause();
    else if (act === 'sound') { st.soundOff = !st.soundOff; try { localStorage.setItem('nightdesk-sound-' + (PL.name || 'me'), st.soundOff ? 'off' : 'on'); } catch (e2) {} render(); }
    else if (act === 'stamp') { if (sc.id === 'free') lateStamp(); else judgeStamp(sc); }
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
  /* ---------- V85 the late shift (after the evaluation): five extras that fill the hour, every one judged ---------- */
  var L = S.late, SH = S.help, SJ = S.job, LATE = ['heads', 'hit', 'fix', 'race', 'count'], BY = S.c1.byline.split(' · ')[0];
  function freshFree() { return { x: null, heads: { i: 0, done: [] }, hit: { i: 0, done: [] }, fix: { i: 0, done: [] }, race: { best: { 1: 0, 2: 0, 3: 0 }, played: [] }, count: { i: 0, done: [] }, ended: false }; }
  function fmtN(v) { return v >= 100 ? Math.round(v).toLocaleString('en-GB') : (Number.isInteger(v) ? String(v) : v.toFixed(1)); }
  /* a card's numbers are worked out from the data, never typed in */
  function fillLate(s, it) { var k = Q.run(it.rule, D[it.t], D.columns[it.t]), kid = {}; k.forEach(function (r) { kid[r.id] = 1; }); var rest = D[it.t].filter(function (r) { return !kid[r.id]; });
    return s.replace(/\{(\w+)(?::(\w+))?(?::(\w+))?\}/g, function (m, a, b, c) { if (a === 'n') return k.length; if (a === 'rn') return rest.length; if (a === 'N') return D[it.t].length; if (a === 'a') return fmtN(avg(k, b)); if (a === 'r') return fmtN(avg(rest, b));
      if (a === 'c') return Q.run(it.refs[b], D[it.t], D.columns[it.t]).length; if (a === 'x') return fmtN(avg(Q.run(it.refs[c], D[it.t], D.columns[it.t]), b)); return m; }); }
  function hasWord(q, w) { var s = String(q).replace(/"[^"]*"/g, '').replace(/BETWEEN\s+\S+\s+AND/gi, 'BETWEEN'); return new RegExp('\\b' + w + '\\b', 'i').test(s); }
  function nextOpen(x, from) { var f = st.free[x], n = L[x].items.length; for (var k = 0; k < n; k++) { var i = (from + k) % n; if (f.done.indexOf(i) < 0) return i; } return -1; }
  function setDone(x) { return x === 'race' ? st.free.race.played.length >= 3 : nextOpen(x, 0) < 0; }
  function lateNow() { var x = st.free.x; if (!x || x === 'race') return null; var i = st.free[x].i; return i >= 0 && i < L[x].items.length ? { x: x, i: i, it: L[x].items[i] } : null; }
  function lateItem() { st.ok = false; st.line = null; st.lineKind = ''; st.hint = 0; st.stamp = null; st.reason = null; st.stampMiss = 0; st.lt = {}; st.flash = null;
    var x = st.free.x; if (!x || x === 'race') { st.q = ''; st.rows = null; return; }
    var f = st.free[x]; if (f.i < 0 || f.i >= L[x].items.length || f.done.indexOf(f.i) >= 0) f.i = nextOpen(x, Math.max(0, f.i));
    var n = lateNow(); if (!n) { st.q = ''; st.rows = null; return; } st.table = n.it.t; st.q = x === 'fix' ? n.it.broken : ''; st.rows = runRows(st.q, st.table); }
  function fresh() { st.helpOn = false; stopDemo(); st.nudged = 0; st.idleAt = Date.now(); }
  function lateGo(x) { stopRace(); st.free.x = x; lateItem(); fresh(); render(); save(); window.scrollTo(0, 0); }
  function lateStep() { var x = st.free.x, f = st.free[x]; f.i = nextOpen(x, f.i + 1); lateItem(); fresh(); render(); save(); window.scrollTo(0, 0); }
  function lateDone(x, i, xp) { var f = st.free[x]; if (f.done.indexOf(i) < 0) { f.done.push(i); addXp('late-' + x + '-' + i, xp); if (f.done.length === L[x].items.length) Snd.fanfare(); } save(); }
  function tileProg(x) { return x === 'race' ? L.ofN.replace('{n}', st.free.race.played.length).replace('{all}', 3) : L.ofN.replace('{n}', st.free[x].done.length).replace('{all}', L[x].items.length); }
  function kickLate(x, extra) { return '<div class="kick">' + esc(L.tiles[x].name + ' · ' + (extra || tileProg(x))) + '</div>'; }
  function lateBar(skip) { return '<div class="latebar">' + (skip ? '<button class="btn tiny ghost" data-act="late-skip">' + esc(L.skip) + '</button>' : '') + '<button class="btn tiny ghost" data-act="late-menu">' + esc(L.menuBack) + '</button></div>'; }
  function hitAsk(it) { return L.hit.ask.replace('{n}', it.n).replace('{what}', it.n === 1 ? L.hit.one[it.t] : L.hit.what[it.t]); }
  function lateHTML() { var f = st.free;
    if (f.ended) return scene('plain late', '<div class="kick">' + esc(L.kicker) + '</div><p class="ask">' + esc(L.end) + '</p>');
    if (!f.x) return scene('plain late', '<div class="kick">' + esc(L.kicker) + '</div><p class="ask">' + esc(L.intro) + '</p><div class="tiles">' + LATE.map(function (x) { var t = L.tiles[x]; return '<button class="tile' + (setDone(x) ? ' done' : '') + '" data-x="' + x + '"><b>' + esc(t.name) + '</b><span>' + esc(t.line) + '</span><em>' + esc(tileProg(x)) + '</em></button>'; }).join('') + '</div><button class="btn ghost" data-act="late-finish">' + esc(L.finish) + '</button>');
    if (f.x === 'race') return raceHTML();
    var n = lateNow(); if (!n) return scene('plain late', kickLate(f.x) + '<p class="ask">' + esc(L.allDone) + '</p><button class="btn big" data-act="late-menu">' + esc(L.menuBack) + '</button>');
    if (f.x === 'count') return countHTML(n);
    var x = n.x, it = n.it, ro = x === 'heads' && !!st.lt.ruleOk, o = { kicker: L.tiles[x].name + ' · ' + tileProg(x), nextLabel: L[x].next, nextAct: 'late-next' };
    if (x === 'heads') { o.card = { headline: it.head, byline: BY, stamp: st.ok ? st.stamp : null }; if (ro) { o.ask = L.heads.stampAsk; o.body = stampHTML(); } else o.ask = it.ask; if (st.ok) o.after = stampedLine({ stamp: st.stamp, reason: st.reason }); }
    if (x === 'hit') { o.lead = it.need ? L.hit.need.replace('{need}', it.need) : null; o.ask = hitAsk(it); if (st.lt.miss) o.body = '<p class="hint">' + esc(it.tip) + '</p>'; }
    if (x === 'fix') { if (!st.free.fix.done.length) o.lead = L.fix.intro; o.ask = L.fix.wanted.replace('{ask}', it.ask); }
    var avgs = ro ? it.card.map(function (c) { return fillLate(c, it); }) : null;
    return '<div class="two">' + deskHTML({ readonly: ro || st.ok, avgs: avgs }) + coach(null, o).replace(/<\/div>$/, lateBar(!st.ok) + '</div>') + '</div>'; }
  function countHTML(n) { var it = n.it, p = st.lt.pick, order = st.lt.order || (st.lt.order = shuffle([0, 1, 2]));
    return scene('plain late', kickLate('count') + '<p class="ask">' + esc(it.facts) + '</p><div class="demo"><code>' + esc(it.rule) + '</code></div><p class="ask">' + esc(L.count.ask) + '</p><div class="opts">' + order.map(function (k) { return '<button class="btn opt' + (p != null ? (k === 0 ? ' right' : k === p ? ' wrong' : '') : '') + '" data-cnt="' + k + '"' + (p != null ? ' disabled' : '') + '>' + esc(String(it.opts[k])) + '</button>'; }).join('') + '</div>'
      + (p != null ? '<p class="line ' + st.lineKind + '">' + esc(st.line) + '</p><button class="btn" data-act="late-next">' + esc(L.count.next) + '</button>' : '') + lateBar(p == null)); }
  function raceHTML() { var r = st.lt.race, R = L.race, fr = st.free.race;
    if (!r) return scene('plain late', kickLate('race') + '<p class="ask">' + esc(R.intro) + '</p><div class="levels">' + R.levels.map(function (l, i) { return '<button class="btn opt" data-lvl="' + (i + 1) + '">' + esc(l) + (fr.played.indexOf(i + 1) >= 0 ? '<em>' + esc(L.best.replace('{n}', fr.best[i + 1]).replace('{all}', R.items[i].length)) + '</em>' : '') + '</button>'; }).join('') + '</div>' + lateBar(false));
    if (r.end) return scene('plain late', kickLate('race', R.levels[r.lvl - 1]) + (r.timeUp ? '<p class="ask">' + esc(R.timeUp) + '</p>' : '') + '<p class="ask">' + esc(R.end.replace('{n}', r.right).replace('{all}', r.its.length)) + '</p><div class="opts"><button class="btn" data-act="race-again">' + esc(R.again) + '</button><button class="btn ghost" data-act="late-menu">' + esc(L.menuBack) + '</button></div>');
    var it = r.its[r.k], right = it.right, pk = r.picked;
    return scene('plain late', kickLate('race', R.qOf.replace('{n}', r.k + 1).replace('{all}', r.its.length)) + '<p class="timer' + (r.left <= 10000 ? ' last' : '') + '">' + esc(R.time.replace('{s}', Math.max(0, Math.ceil(r.left / 1000)))) + '</p><p class="ask">' + esc(it.q) + '</p><div class="opts col">' + r.opts.map(function (o, j) { return '<button class="btn opt code' + (pk != null ? (o === right ? ' right' : j === pk ? ' wrong' : '') : '') + '" data-ro="' + j + '"' + (pk != null ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>'
      + (pk != null ? '<p class="line ' + (r.opts[pk] === right ? 'ok' : 'no') + '">' + esc(r.opts[pk] === right ? R.right : raceWhy(r.opts[pk], right)) + '</p><button class="btn" data-act="race-next">' + esc(C.next) + '</button>' : '') + lateBar(false)); }
  /* why a race rule is wrong: the first thing that differs from the right one */
  function raceWhy(w, r) { var R = L.race, Y = R.why, ws = String(w), rs = String(r), m;
    if (betweenBack(ws)) return C.errBetween; if (/\bOR\s+"/i.test(ws)) return C.errSide;
    if (/\bBETWEEN\b/i.test(rs) && !/\bBETWEEN\b/i.test(ws)) { m = rs.match(/BETWEEN\s+([\d.]+)\s+AND\s+([\d.]+)/i); return /\bOR\b/i.test(ws) ? Y.outside.replace('{a}', m ? m[1] : '').replace('{b}', m ? m[2] : '') : Y.ends; }
    if (ws === rs.replace(/\bAND\b/, 'OR')) return Y.needAnd; if (ws === rs.replace(/\bOR\b/, 'AND')) return Y.needOr;
    if (/^\s*NOT\b/i.test(rs) && ws === rs.replace(/^\s*NOT\s+/i, '')) return Y.noNot; if (/^\s*NOT\b/i.test(ws) && !/^\s*NOT\b/i.test(rs)) return Y.notWrong;
    var re = /(\w+)\s*(>=|<=|<>|=|>|<)\s*("[^"]*"|[\d.]+)/g, a = [], b = []; while ((m = re.exec(ws))) a.push(m); re.lastIndex = 0; while ((m = re.exec(rs))) b.push(m);
    for (var i = 0; i < Math.min(a.length, b.length); i++) { var p = a[i], q = b[i];
      if (p[1] !== q[1]) return Y.col.replace('{wc}', p[1]).replace('{rc}', q[1]);
      if (p[2] !== q[2] && R.signs[p[2]] && R.signs[q[2]]) return Y.sign.replace('{ws}', p[2]).replace('{wm}', R.signs[p[2]]).replace('{rs}', q[2]).replace('{rm}', R.signs[q[2]]);
      if (p[3] !== q[3]) return Y.value.replace('{wv}', p[3]).replace('{rv}', q[3]); }
    return R.wrong; }
  /* the late judge: the rule first (kept rows, never the words), then the stamp */
  function lateRun() { var n = lateNow(); if (!n || st.ok || (n.x === 'heads' && st.lt.ruleOk)) return; var it = n.it, t = it.t, rows, ok;
    st.table = t; st.line = null; st.lineKind = '';
    if (!st.q.trim()) { st.line = C.errEmpty; st.lineKind = 'no'; st.rows = null; Snd.thud(); return; }
    try { rows = Q.run(st.q, D[t], D.columns[t]); } catch (e) { st.line = errLine(e); st.lineKind = 'no'; st.rows = null; Snd.thud(); return; }
    st.rows = rows; var got = rows.length;
    if (n.x === 'hit') { ok = got === it.n && (!it.need || hasWord(st.q, it.need));
      st.line = ok ? L.hit.ok.replace('{n}', it.n) : got !== it.n ? (got > it.n ? L.hit.fewer : L.hit.more).replace('{got}', got).replace('{n}', it.n) : L.hit.missing.replace('{n}', got).replace('{need}', it.need);
      if (!ok) st.lt.miss = (st.lt.miss || 0) + 1; }
    else { ok = sameSet(rows.map(function (r) { return r.id; }), ids(n.x === 'fix' ? it.fix : it.rule, t));
      st.line = ok ? (n.x === 'fix' ? L.fix.ok.replace('{why}', it.why) : null) : (betweenBack(st.q) ? C.errBetween : one(L[n.x].wrong.replace('{got}', got))); }
    if (ok) { st.flash = 'ok'; Snd.ding(); if (n.x === 'heads') { st.lt.ruleOk = true; st.lineKind = ''; } else { st.ok = true; st.lineKind = 'ok'; lateDone(n.x, n.i, 5); } }
    else { st.lineKind = 'no'; Snd.thud(); } }
  function lateStamp() { var n = lateNow(); if (!n || n.x !== 'heads' || !st.lt.ruleOk || st.ok) return; var it = n.it;
    if (!st.stamp || !st.reason) { st.line = S.stamp.missing; st.lineKind = 'no'; }
    else if (st.stamp !== it.stamp) { st.line = it.no || L.heads.no[it.stamp === 'PRINT' ? 'PRINT' : it.reason]; st.lineKind = 'no'; st.stampMiss++; Snd.thud(); }
    else if (st.reason !== it.reason) { st.line = L.heads.reasonNo[it.reason]; st.lineKind = 'no'; st.stampMiss++; Snd.thud(); }
    else { st.ok = true; st.line = fillLate(it.ok, it); st.lineKind = 'ok'; Snd.ding(); lateDone('heads', n.i, st.stampMiss ? 6 : 10); }
    render(); save(); }
  function countPick(k) { var n = lateNow(); if (!n || n.x !== 'count' || st.lt.pick != null) return; var it = n.it, right = k === 0; st.lt.pick = k;
    st.line = (right ? L.count.right : L.count.wrong).replace('{right}', it.opts[0]).replace('{why}', it.why); st.lineKind = right ? 'ok' : 'no'; (right ? Snd.ding : Snd.thud)(); lateDone('count', n.i, right ? 3 : 0); render(); }
  /* the rule race: 90 seconds a level, held while paused, while help is open and while she looks back */
  var raceT = null, raceLast = 0;
  function raceOpts() { var r = st.lt.race, it = r.its[r.k]; r.opts = shuffle([it.right].concat(it.wrong)); }
  function raceStart(lvl) { stopRace(); st.lt = { race: { lvl: lvl, its: shuffle(L.race.items[lvl - 1]), k: 0, right: 0, picked: null, end: false, timeUp: false, left: 90000 } }; raceOpts(); fresh(); raceLast = Date.now(); raceT = setInterval(raceTick, 250); render(); window.scrollTo(0, 0); }
  function raceTick() { var r = st.lt.race, now = Date.now(), dt = now - raceLast; raceLast = now; if (!r || r.end) return stopRace(); if (st.paused || st.helpOn || st.review) return;
    r.left -= dt * SPEED; var s = Math.max(0, Math.ceil(r.left / 1000)), t = document.querySelector('main .timer'); if (t) { t.textContent = L.race.time.replace('{s}', s); t.classList.toggle('last', s <= 10); } if (r.left <= 0) raceEnd(true); }
  function racePick(j) { var r = st.lt.race; if (!r || r.end || r.picked != null) return; r.picked = j; if (r.opts[j] === r.its[r.k].right) { r.right++; Snd.ding(); } else Snd.thud(); render(); }
  function raceNext() { var r = st.lt.race; if (!r || r.end) return; r.k++; r.picked = null; if (r.k >= r.its.length) return raceEnd(false); raceOpts(); fresh(); render(); }
  function raceEnd(up) { var r = st.lt.race, fr = st.free.race; stopRace(); r.end = true; r.timeUp = !!up; if (r.right > (fr.best[r.lvl] || 0)) fr.best[r.lvl] = r.right; if (fr.played.indexOf(r.lvl) < 0) fr.played.push(r.lvl);
    addXp('late-race-' + r.lvl, r.right); if (r.right === r.its.length) Snd.fanfare(); else Snd.ding(); fresh(); render(); save(); }
  function stopRace() { if (raceT) clearInterval(raceT); raceT = null; }
  /* the model pupil for the late walk (?late=1): every set to the end, then Finish */
  function lateWant() { var f = st.free, x = f.x; if (f.ended) return { kind: 'done' }; if (arg('late') !== '1') return { kind: 'done' };
    var c = function (s) { return { kind: 'click', sel: s }; };
    if (!x) { var nx = LATE.filter(function (k) { return !setDone(k); })[0]; return nx ? c('[data-x="' + nx + '"]') : c('[data-act="late-finish"]'); }
    if (x === 'race') { var r = st.lt.race; if (!r) { var lv = [1, 2, 3].filter(function (l) { return f.race.played.indexOf(l) < 0; })[0]; return lv ? c('[data-lvl="' + lv + '"]') : c('[data-act="late-menu"]'); }
      if (r.end) return c('[data-act="late-menu"]'); if (r.picked != null) return c('[data-act="race-next"]'); return c('[data-ro="' + r.opts.indexOf(r.its[r.k].right) + '"]'); }
    var n = lateNow(); if (!n) return c('[data-act="late-menu"]');
    if (x === 'count') return st.lt.pick != null ? c('[data-act="late-next"]') : c('[data-cnt="0"]');
    if (st.ok) return c('[data-act="late-next"]');
    if (x === 'heads' && st.lt.ruleOk) { if (STAMPS) { var wl = wrongStamps(n.it.stamp, n.it.reason), wk = st.lt.wk || 0; if (wk < wl.length) { st.lt.wk = wk + 1; return c(wl[wk]); } } if (st.stamp !== n.it.stamp) return c('[data-stamp="' + n.it.stamp + '"]'); if (st.reason !== n.it.reason) return c('[data-reason="' + n.it.reason + '"]'); return c('[data-act="stamp"]'); }
    if (st.q) return c('[data-act="clear"]');
    return { kind: 'type', sel: '#qbox', text: x === 'fix' ? n.it.fix : n.it.rule, enter: true }; }
  /* ---------- V85 help: the job line on every screen, Stuck? Show me, the ring and its tag, the ghost demo, the idle nudge ---------- */
  function jf(k, o) { var s = SJ[k] || ''; Object.keys(o || {}).forEach(function (a) { s = s.replace('{' + a + '}', o[a]); }); return s; }
  function jobHTML() { return '<div class="job"><span id="job"></span><button class="btn" id="helpBtn" data-act="help">' + esc(C.stuck) + '</button></div><div id="help" hidden><div><p class="kicker">' + esc(C.helpKicker) + '</p><ol id="helpText"></ol><p id="helpStuck">' + esc(C.stillStuck) + '</p></div><button class="btn" data-act="help-close">' + esc(C.helpClose) + '</button></div>'; }
  function stampGuide(job) { if (st.line && st.lineKind === 'no') return { job: job, steps: SH.stampWrong, sel: '.stamps', tag: C.tagChoose }; if (!st.stamp) return { job: job, steps: SH.stampNone, sel: '.stamps', tag: C.tagChoose };
    if (!st.reason) return { job: job, steps: SH.stampReason, sel: '.reasons', tag: C.tagChoose }; return { job: job, steps: SH.stampReady, sel: '[data-act="stamp"]', tag: C.tagPress }; }
  function shapeOf(r) { r = String(r || ''); var not = /^\s*NOT\b/i.test(r), and = /\bAND\b/i.test(r.replace(/BETWEEN\s+\S+\s+AND/i, '')), btw = /\bBETWEEN\b/i.test(r), or = /\bOR\b/i.test(r);
    return not && and ? 'notAnd' : not ? 'not' : btw ? 'between' : or ? 'or' : and ? 'and' : /"/.test(r) ? 'word' : 'num'; }
  function askGuide(key, late, rule) { if (st.ok) return { job: SJ.ok, steps: SH.ok, sel: '[data-act="next"]', tag: C.tagPress };
    if (st.line && st.lineKind === 'no') return { job: SJ.askFix, steps: late ? SH.askRed.slice(0, 2) : SH.askRed, sel: '#qbox', tag: C.tagType };
    if (st.q && st.q.trim()) return { job: SJ.ask, steps: SH.askTyped, sel: '[data-act="run"]', tag: C.tagPress };
    var sh = shapeOf(rule); return { job: SJ.ask, steps: SH.shape[sh] || SH.askEmpty, sel: '#qbox', tag: C.tagType, demo: SH.demo[key + '.' + sh] || SH.demo[key], empty: true }; }
  /* Count first: the help says what the rule's joining word or sign keeps, never the number */
  function countSteps(rule) { var W = SH.countWhy, j = joins(rule), k = /\bBETWEEN\b/i.test(rule) ? 'between' : j.not ? 'not' : j.or ? 'or' : j.and ? 'and' : /<=/.test(rule) ? 'le' : /</.test(rule) ? 'lt' : />(?!=)/.test(rule) ? 'gt' : 'other'; return [W.first, W[k], W.last]; }
  function lateGuide() { var f = st.free, x = f.x, P = { steps: SH.ok, tag: C.tagPress };
    if (f.ended) return { job: SJ.end, steps: null };
    if (!x) return { job: SJ.late, steps: SH.late, sel: '.tiles', tag: C.tagChoose };
    if (x === 'race') { var r = st.lt.race; if (!r) return { job: SJ.raceMenu, steps: SH.raceMenu, sel: '.levels', tag: C.tagChoose };
      if (r.end) return { job: SJ.raceEnd, steps: SH.next, sel: '[data-act="race-again"]', tag: C.tagPress };
      if (r.picked != null) return { job: SJ.picked, steps: SH.ok, sel: '[data-act="race-next"]', tag: C.tagPress };
      return { job: SJ.race, steps: SH.race, sel: '.opts', tag: C.tagChoose }; }
    var n = lateNow(); if (!n) return Object.assign({ job: jf('after', { btn: L.menuBack }), sel: '[data-act="late-menu"]' }, P, { steps: SH.next });
    if (x === 'count') return st.lt.pick != null ? Object.assign({ job: jf('after', { btn: L.count.next }), sel: '[data-act="late-next"]' }, P) : { job: SJ.count, steps: countSteps(n.it.rule), sel: '.opts', tag: C.tagChoose };
    if (st.ok) return Object.assign({ job: jf('afterOk', { btn: L[x].next }), sel: '[data-act="late-next"]' }, P);
    if (x === 'heads' && st.lt.ruleOk) return stampGuide(SJ.stamp);
    if (x === 'fix') return st.line && st.lineKind === 'no' ? { job: SJ.fix, steps: SH.askRed.slice(0, 2), sel: '#qbox', tag: C.tagType } : { job: SJ.fix, steps: SH.fix, sel: '#qbox', tag: C.tagType };
    var a = askGuide(n.it.t, true, x === 'heads' ? n.it.rule : null); a.job = x === 'heads' ? SJ.heads : jf('hit', { n: n.it.n }); if (x === 'hit' && a.empty) a.steps = SH.hit; return a; }
  function guide() { var sc = screens[st.i], id = sc.id, nx = { steps: SH.next, sel: '[data-act="next"]', tag: C.tagPress };
    function g(job, o) { return Object.assign({ job: job }, o || nx); }
    if (st.welcome) return g(SJ.welcome, { steps: SH.next, sel: '[data-act="carry"]', tag: C.tagPress });
    if (st.review) return g(SJ.review, { steps: SH.next, sel: '[data-act="unreview"]', tag: C.tagPress });
    if (id === 'donow') { if (!DN[st.donow.n]) return g(SJ.donowEnd); return st.donow.picked == null ? g(SJ.choose, { steps: SH.choose, sel: '.opts', tag: C.tagChoose }) : g(SJ.picked, { steps: SH.next, sel: '[data-act="dn-next"]', tag: C.tagPress }); }
    if (id === 'opening') return g(SJ.opening);
    if (id === 'story') return g(SJ.story, { steps: SH.story, sel: st.filmShown < 3 ? '[data-act="readall"]' : '[data-act="next"]', tag: C.tagPress });
    if (id === 'facts') return g(SJ.facts);
    if (id === 'tour') return g(SJ.tour, { steps: SH.tour, sel: '[data-act="tour"]', tag: C.tagPress });
    if (/-title$/.test(id)) return g(SJ.title);
    if (/-show$/.test(id)) { var kw = { c2: 'AND', c3: 'BETWEEN', c4: 'OR', c5: 'NOT' }[sc.ch]; return g(kw ? jf('show', { kw: kw }) : SJ.show1); }
    if (sc.task) return askGuide(id === 'c6-ask1' ? 'c6a' : id === 'c6-ask2' ? 'c6b' : sc.ch, false, sc.rule);
    if (sc.wantStamp) return st.ok ? g(SJ.stampOk, { steps: SH.ok, sel: '[data-act="next"]', tag: C.tagPress }) : stampGuide(SJ.stamp);
    if (sc.right) return st.predicted ? g(SJ.picked) : g(/-compare$/.test(id) ? SJ.compare : SJ.predict, { steps: SH.predict, sel: '.opts', tag: C.tagChoose });
    if (id === 'c1-stampshow') return g(SJ.stampshow);
    if (id === 'c6-ring') return g(SJ.ring); if (id === 'c6-printed') return g(SJ.printed); if (id === 'c6-letter') return g(SJ.letter);
    if (id === 'front') { var nm = (document.getElementById('fname') || {}).value; return nm && nm.trim() ? g(SJ.front, { steps: SH.front, sel: '[data-act="next"]', tag: C.tagPress }) : g(SJ.front, { steps: SH.front, sel: '#fname', tag: C.tagType }); }
    if (id === 'badges') return g(SJ.badges); if (id === 'recap') return g(SJ.recap);
    if (id === 'exit') { if (!S.close.exit[st.exit.n]) return g(SJ.picked); return st.exit.picked == null ? g(SJ.choose, { steps: SH.choose, sel: '.opts', tag: C.tagChoose }) : g(SJ.picked, { steps: SH.next, sel: '[data-act="x-next"]', tag: C.tagPress }); }
    if (id === 'felt') { var k = [0, 1, 2, 'd'].filter(function (k) { return st.felt[k] == null; })[0]; return k == null ? g(SJ.felt, { steps: SH.felt, sel: '[data-act="next"]', tag: C.tagPress }) : g(SJ.felt, { steps: SH.felt, sel: '.feltrow[data-row="' + k + '"] .scale', tag: C.tagChoose }); }
    if (id === 'free') return lateGuide();
    return g(SJ.ok); }
  function applyHelp() { var jb = document.getElementById('job'), hb = document.getElementById('helpBtn'), hp = document.getElementById('help'); if (!jb || !hb || !hp) return;
    var g = st.g = guide(); jb.textContent = C.jobLead + ' ' + g.job;
    var has = !!(g.steps && g.steps.length) && !st.paused; hb.hidden = !has; if (!has) st.helpOn = false;
    hb.classList.toggle('nudge', st.nudged >= 1 && !st.helpOn); hb.setAttribute('aria-expanded', st.helpOn ? 'true' : 'false'); hp.hidden = !st.helpOn;
    if (st.helpOn) document.getElementById('helpText').innerHTML = g.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    document.querySelectorAll('.help-spot').forEach(function (n) { n.classList.remove('help-spot'); });
    var el = (st.helpOn || st.nudged >= 2) && g.sel && !st.paused ? document.querySelector('main ' + g.sel) : null; st.spotEl = el; if (el) el.classList.add('help-spot'); placeTag();
    if (st.helpOn && g.demo && !st.q) startDemo(g.demo); else if (st.demoTxt) stopDemo(); }
  function wordBoxes(skip) { var out = []; [].forEach.call(document.querySelectorAll('main p, main li, main label, main h1, main h2, main .kick, main .headline, main button, main code, main input, main th, main td, #job, #helpBtn'), function (e) {
      if (!e.getClientRects().length || e.closest('[hidden]') || e === skip || getComputedStyle(e).visibility === 'hidden') return; var k = /^T[DH]$/.test(e.tagName) ? 0.15 : 1, rs;
      if (/^(P|LI|LABEL|H1|H2|DIV|SPAN)$/.test(e.tagName)) { var rg = document.createRange(); rg.selectNodeContents(e); rs = rg.getClientRects(); } else rs = [e.getBoundingClientRect()];
      [].forEach.call(rs, function (r) { if (r.width && r.height) out.push({ l: r.left, t: r.top, r: r.right, b: r.bottom, k: k }); }); }); return out; }
  function placeTag() { var tg = document.getElementById('tag'), el = st.spotEl; if (!tg) return; if (!el || !document.body.contains(el)) { tg.hidden = true; return; }
    tg.textContent = (st.g && st.g.tag) || C.tagPress; tg.hidden = false; var r = el.getBoundingClientRect(), w = tg.offsetWidth, h = tg.offsetHeight, G = 8, hp = document.getElementById('help'), minTop = hp && !hp.hidden ? hp.getBoundingClientRect().bottom + 2 : 4;
    var cx = r.left + r.width / 2 - w / 2, cy = r.top + r.height / 2 - h / 2, up = r.top - h - G, dn = r.bottom + G;
    var spots = [[cx, up], [cx, dn], [r.right + G, cy], [r.left - w - G, cy], [r.left, up], [r.right - w, up], [r.left, dn], [r.right - w, dn]], boxes = wordBoxes(), best = null;
    for (var sx = r.right + G; sx < innerWidth - w; sx += 40) spots.push([sx, cy]); /* then along the row, past the buttons beside it */
    boxes.push({ l: r.left, t: r.top, r: r.right, b: r.bottom, k: 3 });
    spots.forEach(function (p) { var x = Math.max(4, Math.min(innerWidth - w - 4, p[0])), y = Math.max(minTop, Math.min(innerHeight - h - 4, p[1])), cost = 0;
      boxes.forEach(function (q) { var ox = Math.min(x + w, q.r) - Math.max(x, q.l), oy = Math.min(y + h, q.b) - Math.max(y, q.t); if (ox > 0 && oy > 0) cost += ox * oy * q.k; });
      if (!best || cost < best.c - 0.5) best = { x: x, y: y, c: cost }; });
    tg.style.top = Math.round(best.y) + 'px'; tg.style.left = Math.round(best.x) + 'px'; }
  function setHelp(on) { if (st.paused) return; st.helpOn = on == null ? !st.helpOn : !!on; st.nudged = 0; st.idleAt = Date.now(); applyHelp();
    if (st.helpOn && st.spotEl) { var r = st.spotEl.getBoundingClientRect(); if (r.bottom > innerHeight || r.top < 0) { st.spotEl.scrollIntoView({ block: 'nearest' }); placeTag(); } } }
  /* the ghost demo: a different rule types itself into the empty box's placeholder, so she sees the shape, never the answer */
  var demoTok = 0;
  function startDemo(txt) { var b = document.getElementById('qbox'); if (!b || b.readOnly) return; if (st.demoTxt === txt && b.classList.contains('ghost')) return; stopDemo(); st.demoTxt = txt; var tok = ++demoTok, k = 0; b.classList.add('ghost');
    (function key() { if (tok !== demoTok) return; var bb = document.getElementById('qbox'); if (!bb || bb.value) return stopDemo(); if (!bb.classList.contains('ghost')) bb.classList.add('ghost');
      if (k > txt.length) k = 0; bb.placeholder = txt.slice(0, k); k++; setTimeout(key, (k > txt.length ? 1600 : 110) / SPEED); })(); }
  function stopDemo() { demoTok++; st.demoTxt = null; var b = document.getElementById('qbox'); if (b) { b.classList.remove('ghost'); b.placeholder = C.boxHint; } }
  /* the idle nudge: the button pulses at 20 s with nothing done, the ring and tag come at 40 s */
  var IDLE = arg('idle') === '1' ? 700 : 20000;
  ['pointerdown', 'keydown', 'input'].forEach(function (ev) { document.addEventListener(ev, function () { st.idleAt = Date.now(); if (st.nudged) { st.nudged = 0; applyHelp(); } }, true); });
  setInterval(function () { if (st.paused || st.helpOn || !document.getElementById('helpBtn')) return; var idle = Date.now() - st.idleAt, n = idle >= 2 * IDLE ? 2 : idle >= IDLE ? 1 : 0; if (n > st.nudged) { st.nudged = n; applyHelp(); } }, 250);
  window.addEventListener('resize', placeTag); window.addEventListener('scroll', placeTag, true);
  window.Hour = { screen: function () { return st.welcome ? 'welcome' : st.review ? 'review-' + st.review.ch : screens[st.i].id === 'free' ? (st.free.ended ? 'late-end' : st.free.x ? 'late-' + st.free.x : 'free') : screens[st.i].id; },
    measure: function () { var sc = screens[st.i], prose = [], print = [], code = []; document.querySelectorAll('main p, main h1, main h2, main li, main .kick, main .feltrow > span:first-child, main label, main .badge').forEach(function (n) { var t = n.textContent.replace(/\s+/g, ' ').trim(); if (t) (n.closest('.front, .paper:not(.letter)') ? print : prose).push(t); }); document.querySelectorAll('main code').forEach(function (n) { code.push(n.textContent); }); var jb = document.getElementById('job'); return { screen: Hour.screen(), job: jb ? jb.textContent : '', chapter: sc.ch, prose: prose, print: print, code: code, film: sc.film || 0 }; },
    want: function () { return screens[st.i].want(); }, go: go, state: st, ids: function () { return screens.map(function (s) { return s.id; }); },
    clock: function () { return { left: st.left, timedOut: !!st.timedOut, remain: st.remain, running: !!st.timer }; }, tasks: T, help: setHelp, guide: function () { return st.g; } };
  /* ?at= (tests only): the earlier headlines stamped as the model pupil stamped them */
  var RIGHT = { c1: ['SPIKE', 'numbers'], c2: ['SPIKE', 'numbers'], c3: ['SPIKE', 'cherry'], c4: ['PRINT', 'backed'], c5: ['SPIKE', 'few'], c6: ['SPIKE', 'cause'] };
  function stampedUpTo(ch) { var k = ORDER.indexOf(ch); ORDER.slice(0, k).forEach(function (c) { if (RIGHT[c]) { st.stamps[c] = { stamp: RIGHT[c][0], reason: RIGHT[c][1] }; st.snaps[c] = { table: 'people', q: '' }; } if (st.chDone.indexOf(c) < 0) st.chDone.push(c); }); }
  var at = arg('at');
  if (at && idxOf(at) >= 0) { stampedUpTo(screens[idxOf(at)].ch); st.i = idxOf(at); go(idxOf(at)); }
  else if (STAGE === 'free' || arg('late') === '1') { if (SAVED && SAVED.at === 'free') st.restore = { q: SAVED.q || '' }; st.i = idxOf('free'); go(idxOf('free')); }
  else if (SAVED && SAVED.at && idxOf(SAVED.at) > 0) { st.welcome = SAVED; st.i = idxOf(SAVED.at); render(); }
  else { st.i = 0; screens[0].enter && screens[0].enter(); render(); save(); }
})();
