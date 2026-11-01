/* SAME LIGHT · the screen (spec V2 §3, §6, §8). Renders the folded state; every action is one event on the channel.
   Local only: which page of a reminder she is on, whether she closed the help card, the extras editor. */
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search);
  var ROOM = (Q.get('room') || 'DEMO').toUpperCase(), MODE = Q.get('mode') || 'pair', K = Math.max(1, +Q.get('t') || 1);
  var SEATS = MODE === 'solo' ? ['A'] : MODE === 'trio' ? ['A', 'B', 'C'] : ['A', 'B'];
  var SEAT = (Q.get('seat') || 'A').toUpperCase(); if (SEATS.indexOf(SEAT) < 0) SEAT = SEATS[0];
  var NAMES = { A: 'Aoife', B: 'Niamh', C: 'Cara' };
  var E = SameLight, T = E.T, str = SameLightStrings.render, J = TwoLightsJudge, PR = TwoLightsPrograms, A = TwoArt, Snd = TwoSound;
  var GONE_MS = (+Q.get('gone') || 0) * 1000 || T.GONE;
  var T0K = 'samelight:t0:' + ROOM, T0 = +localStorage.getItem(T0K) || 0; if (!T0) { T0 = Date.now(); localStorage.setItem(T0K, T0); }
  function now() { return T0 + (Date.now() - T0) * K; }
  var live = SameLive.open(ROOM, SEAT, onChange, now, { blocked: Q.get('link') === 'blocked', beat: 5000 / K });
  var $ = function (id) { return document.getElementById(id); };
  var el = { app: $('app'), pills: $('pills'), coins: $('coins'), latebtn: $('latebtn'), pausebtn: $('pausebtn'), banner: $('banner'), stepstrip: $('stepstrip'), job: $('job'),
    headcode: $('headcode'), gutter: $('gutter'), view: $('view'), ed: $('ed'), run: $('run'), means: $('means'), headcon: $('headcon'), con: $('con'),
    bay: $('bay'), help: $('help'), look: $('look'), late: $('late'), rocks: $('rocks'), crew: $('crew'), helpbtn: $('helpbtn'), cards: $('cards'), partner: $('partner'),
    page: $('page'), card: $('card'), tour: $('tour'), ring: $('ring'), tcard: $('tcard'), curtain: $('curtain'), linkbar: $('linkbar'), toast: $('toast') };
  var st = null, prev = null, dirty = true, L = { sound: { stage: 0 }, pair: { at: null }, cold: { at: null }, tour: { i: 0, again: false }, r1: { pick: null }, r2: { pick: null },
    t3: { page: 1, pick: null }, help: { closedAt: 0, no: 0 }, look: { closed: false, no: 0 }, late: false, home: 'home', extra: { id: null, src: '', last: null },
    linkLost: false, pairOpenedAt: null, hornUntil: 0, toastUntil: 0, pageKey: '', lastPresence: {} };

  var queued = false;
  function onChange(kind) { if (queued) return; queued = true; setTimeout(function () { queued = false; render(); }, 0); }
  function gone() {
    var g = {};
    SEATS.forEach(function (s) { if (s === SEAT) return; var q = live.quiet(s, GONE_MS); if (q === true) g[s] = true; if (q === null && L.linkLost) g[s] = true; });
    return g;
  }
  function refold() { st = E.fold(live.log(), now(), { seats: SEATS, room: ROOM, mode: MODE, gone: gone() }); }
  var pendingText = null, textTimer = null;
  function flushText() { if (pendingText != null) { live.send('text', { src: pendingText }); pendingText = null; } clearTimeout(textTimer); textTimer = null; }
  function send(k, d) { flushText(); live.send(k, d); render(); }
  document.addEventListener('pointerdown', function () { Snd.unlock(); }, { passive: true });

  /* ---------- helpers ---------- */
  function setHtml(node, html) { if (node.__h !== html) { node.__h = html; node.innerHTML = html; } }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function mine() { return st.local[SEAT]; }
  function activeN() { return SEATS.filter(function (s) { return !st.gone[s]; }).length; }
  function isSolo() { return activeN() <= 1; }
  function fault() { return st.ch && st.ch.fault; }
  function isFx(f) { return f && f.fixerNow === SEAT; }
  function isRd(f) { return f && !isSolo() && f.readersNow.indexOf(SEAT) >= 0; }
  function others() { return SEATS.filter(function (s) { return s !== SEAT; }); }
  function suffix(key) { return isSolo() && SameLightStrings.S[key + '.solo'] ? key + '.solo' : key; }
  function modeKey(base) { return isSolo() ? base + '.solo' : (activeN() >= 3 && SameLightStrings.S[base + '.trio']) ? base + '.trio' : base; }
  function seededShuffle(arr, seed) { var a = arr.slice(), x = 0; for (var i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0; for (var j = a.length - 1; j > 0; j--) { x = (x * 1103515245 + 12345) >>> 0; var k = x % (j + 1); var t = a[j]; a[j] = a[k]; a[k] = t; } return a; }
  function progHtml(src, opts) {
    opts = opts || {}; var ls = String(src).split('\n'), h = '';
    ls.forEach(function (l, i) { var n = i + 1, cls = 'ln' + (opts.mark && opts.mark[n] ? ' ' + opts.mark[n] : ''); h += '<div class="n">' + n + '</div><div class="' + cls + '" data-n="' + n + '">' + (esc(l) || ' ') + '</div>'; });
    return h;
  }
  function conHtml(out, red) { var h = (out || []).map(function (l) { return esc(l); }).join('\n'); if (red) h += (h ? '\n' : '') + '<span class="r">' + esc(red) + '</span>'; return h; }
  function fixedProgram(ch) { var s = PR.SEATS.A; return ch === 'ch1' ? PR.ch1(s, 2) : ch === 'ch2' ? PR.ch2(s, true) : ch === 'ch3' ? PR.ch3(s, 'after') : PR.ch4(s, []); }
  function toast(text, ms) { el.toast.textContent = text; el.toast.classList.add('show'); L.toastUntil = Date.now() + (ms || 2500); }
  function cardsHtml(pick, f) {
    var ids = ['red', 'silent', 'none'], h = '';
    ids.forEach(function (id) {
      var cls = 'fcard';
      if (pick) cls += ' pick';
      if (f && f.name && !f.name.skipped) { if (id === f.kind) cls += ' lit'; else if (id === f.name.card) cls += ' no'; }
      h += '<div class="' + cls + '" data-card="' + id + '"><b>' + str('fault.' + id) + '</b><span>' + str('fault.' + id + '.line') + '</span></div>';
    });
    return h;
  }

  /* ---------- the strip, banner, steps ---------- */
  var PILLS = ['sound', 'pair', 'cold', 'tour', 'ch1', 'ch2', 'ch3', 'ch4', 'home'];
  function currentPill() {
    var L0 = mine();
    if (st.phase === 'pre1') return L0.stage === 'wait' || L0.stage === 'r1' ? 'ch1' : L0.stage;
    if (st.phase === 'w1' || st.phase === 'ch1' || st.phase === 'pre2' || st.phase === 'w2') return st.phase === 'pre2' || st.phase === 'w2' ? 'ch2' : 'ch1';
    if (st.phase === 'ch2' || st.phase === 'pre3' || st.phase === 'w3') return st.phase === 'ch2' ? 'ch2' : 'ch3';
    return st.phase;
  }
  function renderStrip() {
    var cur = currentPill(), i0 = PILLS.indexOf(cur), h = '';
    PILLS.forEach(function (p, i) { h += '<span class="pill' + (i < i0 ? ' done' : i === i0 ? ' on' : '') + '">' + str('pill.' + p) + '</span>'; });
    setHtml(el.pills, h);
    // a narrow window cannot show every pill: keep the current one in view
    var on = el.pills.querySelector('.on'); if (on && L.pillOn !== cur) { L.pillOn = cur; el.pills.scrollLeft = Math.max(0, on.offsetLeft - 8); }
    setHtml(el.coins, '<img src="img/coin.svg" alt="">' + str('coins', { n: st.coins + (st.extras[SEAT] ? st.extras[SEAT].coins : 0) }));
    var inCh = st.phase[0] === 'c';
    el.latebtn.textContent = str('late.btn'); el.pausebtn.textContent = str('pause.btn');
    el.latebtn.classList.toggle('hide', !inCh); el.pausebtn.classList.toggle('hide', !inCh);
    el.banner.textContent = str(MODE === 'solo' ? 'banner.solo' : isSolo() ? 'banner.solo' : activeN() >= 3 ? 'banner.trio' : 'banner.pair');
  }
  function renderSteps(f) {
    var order = ['run', 'point', 'fix', 'name'], cur = f ? (f.step === 'swap' || f.step === 'over' ? 'name' : f.step) : null, ci = order.indexOf(cur), h = '';
    order.forEach(function (s, i) { h += '<div class="step' + (i < ci ? ' done' : i === ci ? ' on' : '') + '">' + str('step.' + (i + 1)) + '</div>'; });
    setHtml(el.stepstrip, h);
  }
  function jobLine(f) {
    if (!f) return '';
    var n = f.right, nm = E.FN[f.id] || '', kind = f.kind, solo = isSolo(), rd = isRd(f), fx = isFx(f), t = st.now;
    if (f.step === 'run') return str(solo ? 'job.run.solo' : rd ? 'job.run.reader' : 'job.run.fixer');
    if (f.step === 'point') {
      var k = kind === 'red' ? 'red' : kind === 'silent' ? 'silent' : 'none';
      var mineP = f.picks[SEAT], theirs = others().map(function (s) { return f.picks[s]; }).filter(function (v) { return v != null; })[0];
      if (f.wrongAgreed && mineP == null) return str(k === 'red' ? 'job.point.wrong' : 'job.point.wrong.' + k);
      if (!solo && mineP != null) return str('job.point.mine', { n: mineP });
      if (!solo && theirs != null) return str('job.point.theirs', { n: theirs });
      return str(solo ? 'job.point.' + k + '.solo' : 'job.point.' + k);
    }
    if (f.step === 'fix') {
      if (t < f.stepAt + 1500) return str(solo ? 'job.point.agreed.solo' : 'job.point.agreed', { n: n });
      var k2 = kind === 'red' ? 'red' : kind === 'silent' ? 'silent' : 'none';
      if (fx || solo || f.awake) {
        if (f.lastRunAt != null && f.lastRunAt > f.stepAt && t < f.lastRunAt + 4000) return str(k2 === 'red' ? 'job.fix.stillred' : k2 === 'silent' ? 'job.fix.stillsilent' : 'job.fix.stillnone', { n: n, name: nm });
        if (!fx && !solo && f.awake) return str('job.fix.wake');
        return str(solo ? 'job.fix.' + k2 + '.solo' : 'job.fix.' + k2, { n: n, name: nm });
      }
      return str('job.fix.reader');
    }
    if (f.step === 'name' || f.step === 'swap') {
      if (f.name && !f.name.skipped) return str(f.name.right ? 'job.name.right' : 'job.name.wrong');
      if (f.name && f.name.skipped) return str('swap.done', { n: f.no });
      if (f.fixedAt != null && t < f.fixedAt + 2200) {
        var e = st.ch.last && st.ch.last.effects || {}, key = 'job.fix.clean.next';
        if (e.lamp && (f.id === 'S2' || f.id === 'S3' || f.id === 'Q3' || (f.id === 'S1' && st.ch.id === 'ch4'))) key = 'job.fix.clean.lamp';
        if (e.horn && f.id === 'Q1') key = 'job.fix.clean.horn';
        if (e.radio != null && f.id === 'Q2') key = 'job.fix.clean.radio';
        return str(suffix(key), { n: e.radio });
      }
      return str(solo ? 'job.name.solo' : rd ? 'job.name.reader' : 'job.name.fixer');
    }
    return '';
  }

  /* ---------- the code, run, console ---------- */
  function editable(f) { return !!f && f.step === 'fix' && (isFx(f) || f.awake || isSolo()) && !st.paused; }
  function renderCode(f) {
    el.headcode.textContent = str('head.code'); el.headcon.textContent = str('head.con');
    var src = f ? f.src : (st.ch ? st.ch.src : E.given('ch1', ROOM)), ed = editable(f);
    var ls = src.split('\n'), gh = '';
    var redLine = f && f.step !== 'run' && f.kind === 'red' ? f.right : null;
    for (var i = 1; i <= ls.length; i++) gh += '<div class="' + (i === redLine && (f.step === 'point' || f.step === 'fix') ? 'b' : '') + '">' + i + '</div>';
    setHtml(el.gutter, gh);
    el.ed.classList.toggle('hide', !ed); el.view.classList.toggle('hide', ed);
    if (ed) {
      if (document.activeElement !== el.ed && el.ed.value !== src) el.ed.value = src;
      el.ed.readOnly = false;
    } else {
      var mark = {};
      if (f && f.step === 'point') { if (f.picks[SEAT] != null) mark[f.picks[SEAT]] = 'mine'; others().forEach(function (s) { if (f.picks[s] != null && !mark[f.picks[s]]) mark[f.picks[s]] = 'theirs'; }); }
      if (f && f.step === 'fix' && f.right) mark[f.right] = 'right';
      if (f && f.lookout && f.lookout.answered && st.now < f.lookout.at + 3000) { mark[f.lookout.want] = 'ok'; if (!f.lookout.right) mark[f.lookout.line] = 'right'; }
      var quiet = !(f && (f.step === 'point' || (f.lookoutShown && !f.lookout.answered && isRd(f))));
      el.view.className = quiet ? 'quiet' : '';
      var h = ''; ls.forEach(function (l, i) { var n = i + 1; h += '<div class="ln' + (mark[n] ? ' ' + mark[n] : '') + '" data-n="' + n + '">' + (esc(l) || ' ') + '</div>'; });
      setHtml(el.view, h);
    }
    var canRun = f && !st.paused && !el.card.classList.contains('show') && ((f.step === 'run' && (isRd(f) || isSolo())) || (f.step === 'fix' && (isFx(f) || f.awake || isSolo())));
    el.run.disabled = !canRun;
    el.run.textContent = str(f && (f.step === 'run' || f.step === 'fix') && !canRun && !st.paused ? 'run.wait' : 'run');
    var r = f ? f.lastRun : null;
    setHtml(el.con, r ? conHtml(r.console, r.red) : '');
    var means = '';
    if (f && f.runAt != null && (f.step === 'point' || f.step === 'fix') && r) {
      if (r.run && r.run.error && SameLightStrings.S['means.' + r.run.error.type]) means = str('means.' + r.run.error.type);
      else if (f.kind === 'silent') means = str('means.silent');
      else if (f.kind === 'none') means = str('means.none');
    }
    el.means.textContent = means;
  }
  el.ed.addEventListener('input', function () {
    pendingText = el.ed.value; clearTimeout(textTimer); textTimer = setTimeout(flushText, 150);
  });
  el.ed.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') { e.preventDefault(); var s = el.ed.selectionStart, t = el.ed.selectionEnd; el.ed.value = el.ed.value.slice(0, s) + '    ' + el.ed.value.slice(t); el.ed.selectionStart = el.ed.selectionEnd = s + 4; el.ed.dispatchEvent(new Event('input')); }
  });
  el.run.addEventListener('click', function () { if (!el.run.disabled) send('run', {}); });
  el.view.addEventListener('click', function (e) {
    var row = e.target.closest('.ln'); if (!row) return; var n = +row.getAttribute('data-n'), f = fault(); if (!f || st.paused) return;
    if (f.step === 'point') send('point', { line: n });
    else if (f.step === 'fix' && f.lookoutShown && !f.lookout.answered && isRd(f)) send('lookout', { line: n });
  });

  /* ---------- the bay side ---------- */
  function ladderVars(f) {
    var src = f.src, id = f.id, v = { n: f.right, name: E.FN[id] || '', d: '', text: '' };
    if (id === 'S1') { v.d = E.lineOf(src, 'def lamp_on():'); v.text = 'lamp_on()'; }
    if (id === 'Q1' || id === 'Q3') v.d = E.lineOf(src, E.DEF[id]);
    return v;
  }
  function ladderKind(f) { return f.kind === 'red' ? (f.lastRun && f.lastRun.run.error ? f.lastRun.run.error.type : 'NameError') : f.kind; }
  function renderBaySide(f) {
    var solo = isSolo(), rd = isRd(f);
    el.crew.textContent = str(solo ? 'crew.solo' : 'crew', { n: st.fixedCount });
    setHtml(el.helpbtn, '<img src="img/lifebuoy.svg" alt="">' + str('help.btn'));
    var canHelp = f && (f.step === 'point' || f.step === 'fix') && (rd || solo) && !st.paused;
    el.helpbtn.classList.toggle('hide', !canHelp);
    // help ladder (shared steps from the fold; closing is local)
    if (f && f.no !== L.help.no) { L.help = { closedAt: 0, no: f.no }; L.look = { closed: false, no: f.no }; }
    var shown = f && (f.step === 'point' || f.step === 'fix') ? f.helpShown : 0;
    if (shown > 0 && shown > L.help.closedAt) {
      var k = ladderKind(f), v = ladderVars(f), h = '';
      for (var i = 1; i <= shown; i++) h += (i === shown ? '<b class="top">' : '<span class="dim">') + str('help.' + k + '.' + i, v) + (i === shown ? '</b>' : '</span><br>');
      h += '<div class="row">' + (shown < 3 && (rd || solo) ? '<button class="ghost" data-act="more">' + str('help.more') + '</button>' : '') + '<button class="ghost" data-act="close">' + str('help.close') + '</button></div>';
      setHtml(el.help, h); el.help.classList.add('show');
    } else el.help.classList.remove('show');
    // lookout question (reader only)
    var lk = f && f.step === 'fix' && rd && f.lookoutShown;
    if (lk && !f.lookout.answered && !L.look.closed) { setHtml(el.look, '<span class="hand">' + str('look.' + st.ch.id) + '</span>'); el.look.classList.add('show'); }
    else if (lk && f.lookout.answered && st.now < f.lookout.at + 3000) {
      setHtml(el.look, '<span class="hand">' + str(f.lookout.right ? 'look.right' : 'look.wrong', { text: E.lineText(f.src, f.lookout.want), n: f.lookout.want }) + '</span>'); el.look.classList.add('show');
    } else el.look.classList.remove('show');
    // running out of time
    if (L.late && st.ch) {
      var want = fixedProgram(st.ch.id).split('\n'), have = st.ch.src.split('\n').map(J.norm), left = want.filter(function (l) { return l.trim() && l.trim()[0] !== '#' && have.indexOf(J.norm(l)) < 0; });
      setHtml(el.late, '<b class="top">' + str('late.line') + '</b><pre style="margin:8px 0 0;font:14px/20px Menlo,monospace;white-space:pre">' + esc(left.join('\n')) + '</pre><div class="row"><button class="ghost" data-act="closelate">' + str('help.close') + '</button></div>');
      el.late.classList.add('show');
    } else el.late.classList.remove('show');
    // the rocks
    if (f && f.boat && f.boat.black) { setHtml(el.rocks, '<span class="hand">' + str('boat.rocks') + '</span>'); el.rocks.classList.add('show'); el.help.classList.remove('show'); el.look.classList.remove('show'); el.late.classList.remove('show'); } else el.rocks.classList.remove('show');
    // fault cards
    var pick = f && f.step === 'name' && !f.name && (rd || solo) && !st.paused;
    setHtml(el.cards, cardsHtml(pick, f));
    // partner line
    if (solo || MODE === 'solo') el.partner.textContent = '';
    else {
      var p = others().filter(function (s) { return !st.gone[s]; })[0], line = '';
      if (p) {
        var q = live.quiet(p, 20000);
        if (f && f.typingBy === p && st.now - f.typingAt < 3000) line = str('partner.typing');
        else if (q === true) line = str('partner.quiet');
        else if (q === false) line = str('partner.here');
      }
      el.partner.textContent = line;
    }
  }
  el.help.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.getAttribute('data-act') === 'more') send('help', {}); else { L.help.closedAt = fault() ? fault().helpShown : 0; render(); } });
  el.late.addEventListener('click', function (e) { if (e.target.closest('button')) { L.late = false; render(); } });
  el.helpbtn.addEventListener('click', function () { L.help.closedAt = 0; send('help', {}); });
  el.latebtn.addEventListener('click', function () { L.late = !L.late; render(); });
  el.pausebtn.addEventListener('click', function () { send('pause', {}); });
  el.cards.addEventListener('click', function (e) { var c = e.target.closest('.fcard.pick'); if (c) send('name', { card: c.getAttribute('data-card') }); });

  /* ---------- the overlays: chapter, swap, pause, link ---------- */
  function renderCard(f) {
    var t = st.now, html = null;
    if (st.ch && f && f.no && st.phase[0] === 'c') {
      var c = st.ch, first = f.no === 1 || (c.ids.length && c.fixedIds.length === 0 && f.stepAt === c.startAt);
      if (first && t < c.startAt + T.CARD) html = str('card.' + c.id) + (c.id === 'ch4' ? '<small>' + str('card.ch4.b') + '</small>' : '');
      else if (first && t < c.startAt + T.CARD + T.SWAP) html = f.no === 1 ? str(isSolo() ? 'swap.first.solo' : isFx(f) ? 'swap.first.fixer' : 'swap.first.reader') : str(isSolo() ? 'swap.solo' : isFx(f) ? 'swap.fixer' : 'swap.reader', { n: f.no });
      else if (f.step === 'swap') {
        if (f.name && f.name.skipped) html = str('swap.done', { n: f.no });
        else if (c.fixedIds.length < c.ids.length) { var nextNo = f.no + 1, nextFx = SEATS[(nextNo - 1) % SEATS.length]; if (st.gone[nextFx]) nextFx = SEATS.filter(function (s) { return !st.gone[s]; })[0]; html = str(isSolo() ? 'swap.solo' : nextFx === SEAT ? 'swap.fixer' : 'swap.reader', { n: nextNo }); }
      }
    }
    if (html) { setHtml(el.card.querySelector('.big'), html); el.card.classList.add('show'); } else el.card.classList.remove('show');
  }
  function renderCurtain() {
    if (st.paused) {
      setHtml(el.curtain, '<div class="line">' + str('pause.curtain') + '</div><button class="btn" data-act="carry">' + str('pause.carry') + '</button><button class="ghost" data-act="again">' + str('tour.again') + '</button>');
      el.curtain.classList.add('show');
    } else el.curtain.classList.remove('show');
    Snd.hold(!!st.paused);
  }
  el.curtain.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.getAttribute('data-act') === 'carry') send('carry', {}); else { L.tour = { i: 0, again: true }; send('carry', {}); } });
  function renderLink() {
    if (MODE === 'solo') { el.linkbar.classList.remove('show'); return; }
    var seen = others().some(function (s) { return live.quiet(s, 1e12) !== null; });
    if (!seen && L.pairOpenedAt != null && Date.now() - L.pairOpenedAt > T.LINK / K) L.linkLost = true;
    if (seen && L.linkLost) { L.linkLost = false; toast(str('link.back')); }
    var goneAny = others().some(function (s) { return st.gone[s] && live.quiet(s, 1e12) === true; });
    if (L.linkLost && st.phase !== 'pre1' || (L.linkLost && mine().stage !== 'sound' && mine().stage !== 'pair')) { el.linkbar.textContent = str('link.slow'); el.linkbar.className = 'show'; }
    else if (goneAny) { el.linkbar.textContent = str('link.gone'); el.linkbar.className = 'show'; }
    else el.linkbar.className = '';
  }

  /* ---------- the tour ---------- */
  var TOUR = [{ t: 'code', k: MODE === 'solo' ? 'tour.1.solo' : 'tour.1' }, { t: 'conwrap', k: 'tour.2' }, { t: 'baywrap', k: 'tour.3' }, { t: 'steps', k: 'tour.4a', k2: 'tour.4b' }];
  function renderTour(on) {
    if (!on) { el.tour.classList.remove('show'); return; }
    var i = Math.min(L.tour.i, 3), step = TOUR[i], tg = $(step.t).getBoundingClientRect(), W = innerWidth, H = innerHeight;
    el.ring.style.left = (tg.left - 4) + 'px'; el.ring.style.top = (tg.top - 4) + 'px'; el.ring.style.width = (tg.width + 8) + 'px'; el.ring.style.height = (tg.height + 8) + 'px';
    var cw = 300, ch = 150, cx, cy, tcx = tg.left + tg.width / 2, tcy = tg.top + tg.height / 2;
    if (W >= 980) { cx = tcx < W / 2 ? Math.min(W - cw - 16, tg.right + 24) : Math.max(16, tg.left - cw - 24); cy = Math.max(60, Math.min(H - ch - 16, tcy - ch / 2)); }
    else { cx = Math.max(16, Math.min(W - cw - 16, tcx - cw / 2)); cy = tcy < H / 2 ? Math.min(H - ch - 16, tg.bottom + 16) : Math.max(60, tg.top - ch - 16); }
    el.tcard.style.left = cx + 'px'; el.tcard.style.top = cy + 'px';
    setHtml(el.tcard, str(step.k) + (step.k2 ? '<br>' + str(step.k2) : '') + '<div class="row"><button class="btn" data-act="' + (i < 3 ? 'next' : 'start') + '">' + str(i < 3 ? 'tour.next' : 'tour.start') + '</button></div>');
    el.tour.classList.add('show');
  }
  el.tcard.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.getAttribute('data-act') === 'next') { L.tour.i++; render(); }
    else if (L.tour.again) { L.tour.again = false; L.tour.i = 0; render(); }
    else send('ready', { stage: 'tour' });
  });

  /* ---------- the full pages ---------- */
  function setPage(key, html) { if (L.pageKey !== key) { el.page.innerHTML = '<div class="pg">' + html + '</div>'; L.pageKey = key; } el.page.classList.add('show'); el.app.classList.add('hide'); el.card.classList.remove('show'); el.tour.classList.remove('show'); }
  function pageSound() {
    var s = L.sound.stage, h = '<img class="big" src="img/headphones.svg" alt=""><h1>' + str('sound.put') + '</h1>';
    if (s === 0) h += '<p class="line">' + str('sound.press') + '</p><div class="row"><button class="btn" data-act="horn">' + str('sound.btn') + '</button></div>';
    if (s === 1) h += '<p class="line">' + str('sound.ask') + '</p><div class="row"><button class="btn" data-act="yes">' + str('sound.yes') + '</button><button class="ghost" data-act="no">' + str('sound.no') + '</button></div>';
    if (s === 2) h += '<p class="line">' + str('sound.check') + '</p><div class="row"><button class="btn" data-act="horn">' + str('sound.btn') + '</button><button class="ghost" data-act="without">' + str('sound.without') + '</button></div>';
    setPage('sound' + s, h);
  }
  function pagePair() {
    if (L.pair.at == null) { L.pair.at = Date.now(); L.pairOpenedAt = Date.now(); }
    if (Date.now() < L.pair.at + 2200 / K) { setPage('pair0', '<div class="radar"></div><h1>' + str('pair.finding') + '</h1>'); return; }
    var solo = MODE === 'solo' || L.linkLost, trio = MODE === 'trio', h;
    if (solo) h = '<h1>' + str('pair.solo.1') + '</h1><p class="line">' + str('pair.solo.2') + '</p><p class="line">' + str('pair.solo.3') + '</p>';
    else h = '<h1>' + str('pair.1') + '</h1><p class="line">' + str('pair.2') + '</p><p class="line">' + str(trio ? 'pair.3.trio' : 'pair.3') + '</p><p class="line">' + str(trio ? 'pair.4.trio' : 'pair.4') + '</p><p class="line">' + str('pair.5') + '</p>';
    h += '<div class="row"><button class="btn" data-act="pair">' + str('pair.begin') + '</button></div>';
    // the one-laptop card (link never came) is its own page, so it replaces the pair card when the 10 s run out
    var pk = solo ? 'pair1s' : 'pair1'; if (L.pageKey !== 'pair1' && L.pageKey !== 'pair1s') Snd.play('ceremony');
    setPage(pk, h);
  }
  function pageCold() {
    if (L.cold.at == null) L.cold.at = Date.now();
    var n = Math.min(5, 1 + Math.floor((Date.now() - L.cold.at) / (700 / K))), h = '';
    for (var i = 1; i <= n; i++) h += '<p class="line">' + str('cold.' + i) + '</p>';
    if (n >= 5) h += '<div class="row"><button class="btn" data-act="cold">' + str('cold.btn') + '</button></div>';
    setPage('cold' + n, h);
  }
  var R1 = 'def lamp_on():\n    light(beam)\n\nlamp_on()', R2 = 'blasts = 2\n\ndef fog_horn():\n    horn(blasts)';
  var T3A = 'def bearing():\n    print(214)\n\nb = bearing()\nradio(b)', T3B = 'def bearing():\n    return 214\n\nb = bearing()\nradio(b)';
  function pageR1() {
    var p = L.r1.pick, mark = {}; if (p != null) { mark[4] = 'ok'; if (p !== 4) mark[p] = 'right'; }
    var h = '<h1>' + str('r1.title') + '</h1><div class="prog' + (p == null ? ' ask' : '') + '" data-ask="r1">' + progHtml(R1, { mark: mark }) + '</div><p class="line">' + str('r1.a') + '</p><p class="line">' + str('r1.b') + '</p><p class="line"><b>' + str('r1.ask') + '</b></p>';
    h += '<div class="verdict">' + (p == null ? '' : str(p === 4 ? 'r1.right' : 'r1.wrong')) + '</div>';
    if (p != null) h += '<div class="row"><button class="btn" data-act="r1">' + str('r.watch') + '</button></div>';
    setPage('r1' + p, h);
  }
  function pageR2() {
    var p = L.r2.pick, opts = seededShuffle(['r2.opt.1', 'r2.opt.2', 'r2.opt.3'], ROOM + 'r2'), h = '<h1>' + str('r2.title') + '</h1><div class="prog">' + progHtml(R2) + '</div><div class="con"></div><p class="line">' + str('r2.a') + '</p><p class="line">' + str('r2.b') + '</p><p class="line"><b>' + str('r2.ask') + '</b></p><div class="opts">';
    opts.forEach(function (k) { h += '<button class="opt' + (p != null ? (k === 'r2.opt.1' ? ' ok' : k === p ? ' no' : '') : '') + '" data-opt="' + k + '">' + str(k) + '</button>'; });
    h += '</div><div class="verdict">' + (p == null ? '' : str(p === 'r2.opt.1' ? 'r2.right' : 'r2.wrong')) + '</div>';
    if (p != null) h += '<div class="row"><button class="btn" data-act="r2">' + str('r.watch') + '</button></div>';
    setPage('r2' + p, h);
  }
  function pageT3() {
    var h = '<h1>' + str('t3.title') + '</h1>';
    if (L.t3.page === 1) { h += '<div class="prog">' + progHtml(T3A, { mark: { 2: 'hot' } }) + '</div><div class="con">214\n<span class="r">The radio got None.</span></div><p class="line">' + str('t3.a') + '</p><p class="line">' + str('t3.b') + '</p><div class="row"><button class="btn" data-act="t3next">' + str('t3.next') + '</button></div>'; setPage('t3a', h); return; }
    var p = L.t3.pick, opts = seededShuffle(['t3.opt.1', 't3.opt.2', 't3.opt.3'], ROOM + 't3');
    h += '<div class="prog">' + progHtml(T3B, { mark: { 2: 'ok' } }) + '</div><div class="con">The radio got 214.</div><p class="line">' + str('t3.c') + '</p><p class="line">' + str('t3.d') + '</p><p class="line"><b>' + str('t3.ask') + '</b></p><div class="opts">';
    opts.forEach(function (k) { h += '<button class="opt' + (p != null ? (k === 't3.opt.1' ? ' ok' : k === p ? ' no' : '') : '') + '" data-opt="' + k + '">' + str(k) + '</button>'; });
    h += '</div><div class="verdict">' + (p == null ? '' : str(p === 't3.opt.1' ? 't3.right' : 't3.wrong')) + '</div>';
    if (p != null) h += '<div class="row"><button class="btn" data-act="t3">' + str('r.watch') + '</button></div>';
    setPage('t3b' + p, h);
  }
  function pageWait() { setPage('wait', '<h1>' + str('partner.reading') + '</h1><div class="cardsrow">' + cardsHtml(false, null) + '</div>'); }
  function pageWorked() {
    var w = E.W[st.w.id], t = st.now - st.w.startAt, src = w.src, mark = {}, con = '', cap = str(w.kind === 'red' ? 'w.run.red' : 'w.run'), cards = null, stepNo = 1, fixT = 14000;
    var fixLen = w.fix.length, typed = Math.max(0, Math.min(fixLen, Math.floor((t - fixT) / (7000 / fixLen))));
    if (t >= 2000) con = conHtml(w.kind === 'none' ? ['Bearing 214'] : [], w.red || (w.kind === 'silent' ? '' : '')) + (w.kind === 'none' ? '\n<span class="r">The radio got None.</span>' : '');
    if (t >= 7000) { mark[w.line] = 'right'; cap = str('w.point', { n: w.line }); stepNo = 2; }
    if (t >= fixT) {
      stepNo = 3; cap = str('w.fix', { text: w.fix }); var part = w.fix.slice(0, typed), ls = src.split('\n');
      if (w.append) { ls.push(part); src = ls.join('\n'); mark[ls.length] = 'hot'; delete mark[w.line]; }
      else if (w.insertAfter) { ls.splice(w.insertAfter, 0, part); src = ls.join('\n'); mark[w.insertAfter + 1] = 'hot'; delete mark[w.line]; }
      else { ls[w.line - 1] = part; src = ls.join('\n'); mark[w.line] = 'hot'; }
    }
    if (t >= 22000) { stepNo = 4; con = conHtml(w.out, ''); if (w.kind === 'none') con += (con ? '\n' : '') + 'The radio got 214.'; mark = {}; cap = str('w.name', { text: str('fault.' + w.card) }); cards = w.card; }
    if (t >= 28000) cap = str(isSolo() ? 'w.turn.solo' : 'w.turn');
    // a stable shell per example: the parts update in place, so a click on Skip never lands on a torn-down button
    var skipped = st.w.skipped[SEAT], key = 'w' + st.w.id;
    if (L.pageKey !== key) setPage(key, '<div class="w"><h1>' + str('w.title') + '</h1><span class="step" id="wstep"></span><div class="prog" id="wprog"></div><div class="con" id="wcon"></div><p class="cap" id="wcap"></p><div class="cardsrow" id="wcards"></div><p class="sub" id="wsub"></p><div class="row" id="wrow"></div></div>');
    var q = function (id) { return el.page.querySelector('#' + id); };
    setHtml(q('wstep'), str('step.' + stepNo)); setHtml(q('wprog'), progHtml(src, { mark: mark })); setHtml(q('wcon'), con); setHtml(q('wcap'), esc(cap));
    setHtml(q('wcards'), cards ? ['red', 'silent', 'none'].map(function (id) { return '<div class="fcard' + (id === cards ? ' lit' : '') + '"><b>' + str('fault.' + id) + '</b><span>' + str('fault.' + id + '.line') + '</span></div>'; }).join('') : '');
    setHtml(q('wsub'), skipped ? str('partner.watching') : '');
    setHtml(q('wrow'), (!skipped && t >= T.W_SKIP) ? '<button class="ghost" data-act="skip">' + str('w.skip') + '</button>' : '');
  }
  function pageHome() {
    if (L.home === 'end') { setPage('end', '<h1>' + str('home.1') + '</h1><p class="line">' + str('home.proto') + '</p><div class="row"><button class="ghost" data-act="extras">' + str('home.extras') + '</button></div>'); return; }
    if (L.home === 'extras') { pageExtras(); return; }
    var names = others().map(function (s) { return NAMES[s]; }), reveal = MODE === 'solo' ? str('home.reveal.solo') : names.length >= 2 ? str('home.reveal.trio', { name: names[0], name2: names[1] }) : str('home.reveal', { name: names[0] });
    var h = '<h1>' + str('home.1') + '</h1><p class="line">' + reveal + '</p><p class="line">' + str(MODE === 'solo' ? 'home.score.solo' : 'home.score', { n: st.fixedCount, c: st.coins }) + '</p><p class="line">' + str('home.badges') + '</p><div>';
    st.badges.forEach(function (b) { h += '<span class="badge">' + str('badge.' + b).replace('Bounty earned: ', '').replace('.', '') + '</span>'; });
    h += '</div><div class="row"><button class="btn" data-act="five">' + str('home.btn') + '</button><button class="ghost" data-act="extras">' + str('home.extras') + '</button></div>';
    setPage('home', h);
  }
  function pageExtras() {
    var X = st.extras[SEAT], h = '<h1>' + str('extras.line') + '</h1>';
    if (!L.extra.id) {
      h += '<p class="sub">' + str('extras.pick') + '</p><div class="xlist">';
      PR.EXTRAS.forEach(function (x) { h += '<button data-x="' + x.id + '" class="' + (X.done[x.id] ? 'done' : '') + '">' + str('extras.' + x.id) + (X.done[x.id] ? ' ✓' : '') + '</button>'; });
      h += '</div><div class="row"><button class="ghost" data-act="home">' + str('pill.home') + '</button></div>';
      setPage('xlist' + Object.keys(X.done).length, h); return;
    }
    var x = PR.EXTRAS.filter(function (q) { return q.id === L.extra.id; })[0], last = X.last && X.last.id === x.id ? X.last : null;
    h += '<p class="line"><b>' + str('extras.' + x.id) + '</b></p><textarea class="xed" id="xed" spellcheck="false">' + esc(L.extra.src) + '</textarea><div class="row"><button class="btn" data-act="xrun">' + str('run') + '</button><button class="ghost" data-act="xback">' + str('extras.back') + '</button></div>';
    h += '<div class="con">' + (last ? conHtml(last.console, last.red) : '') + '</div><div class="verdict">' + (last && last.fixed ? str('extras.fixed') : '') + '</div>';
    if (L.pageKey !== 'x' + x.id) { setPage('x' + x.id, h); } else { var c = el.page.querySelector('.con'), v = el.page.querySelector('.verdict'); c.innerHTML = last ? conHtml(last.console, last.red) : ''; v.textContent = last && last.fixed ? str('extras.fixed') : ''; }
  }
  el.page.addEventListener('click', function (e) {
    var b = e.target.closest('button'), ln = e.target.closest('.prog.ask .ln');
    if (ln) { L.r1.pick = +ln.getAttribute('data-n'); render(); return; }
    if (!b) return;
    var act = b.getAttribute('data-act'), opt = b.getAttribute('data-opt'), x = b.getAttribute('data-x');
    if (opt) { if (opt.indexOf('r2') === 0 && L.r2.pick == null) L.r2.pick = opt; if (opt.indexOf('t3') === 0 && L.t3.pick == null) L.t3.pick = opt; render(); return; }
    if (x) { L.extra = { id: x, src: PR.EXTRAS.filter(function (q) { return q.id === x; })[0].src, last: null }; render(); return; }
    if (act === 'horn') { Snd.play('horn'); L.sound.stage = 1; render(); }
    else if (act === 'yes') send('ready', { stage: 'sound' });
    else if (act === 'no') { L.sound.stage = 2; render(); }
    else if (act === 'without') send('ready', { stage: 'sound', nosound: true });
    else if (act === 'pair') send('ready', { stage: 'pair' });
    else if (act === 'cold') send('ready', { stage: 'cold' });
    else if (act === 'r1') send('ready', { stage: 'r1' });
    else if (act === 'r2') send('ready', { stage: 'r2' });
    else if (act === 't3next') { L.t3.page = 2; render(); }
    else if (act === 't3') send('ready', { stage: 't3' });
    else if (act === 'skip') send('skip', {});
    else if (act === 'five') { L.home = 'end'; send('ready', { stage: 'home' }); }
    else if (act === 'extras') { L.home = 'extras'; L.extra.id = null; if (!mine().ready.home) send('ready', { stage: 'home' }); else render(); }
    else if (act === 'home') { L.home = 'home'; render(); }
    else if (act === 'xback') { L.extra.id = null; render(); }
    else if (act === 'xrun') { L.extra.src = $('xed').value; send('extra', { id: L.extra.id, src: L.extra.src }); }
  });

  /* ---------- the bay canvas ---------- */
  var wall0 = Date.now();
  function drawBay() {
    var c = el.bay.getContext('2d'), W = el.bay.clientWidth, H = el.bay.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (!W || !H || !st) return;
    if (el.bay.width !== Math.round(W * dpr)) { el.bay.width = Math.round(W * dpr); el.bay.height = Math.round(H * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    var sc = W / 369, h = H / sc, Tm = (Date.now() - wall0) / 1000, f = fault(), bay = st.bay, lamp = bay.lamp ? 1 : 0;
    var done = (st.ch && st.ch.done) || st.phase === 'home', p = f && f.boat ? f.boat : { x: 0, drifting: false, black: false };
    c.save(); c.scale(sc, sc);
    A.sea(c, 369, h, Math.min(90, h * 0.3), Tm);
    var sz = Math.min(23, h / 9.5), x = 150, y = Math.max(8, h * 0.08) + sz * 0.7;
    if (lamp) A.beam(c, x, y, sz * 11, Tm + x, 1, 1);
    A.lighthouse(c, x, y, sz, { awake: lamp, smile: done ? 1 : 0, t: Tm, blink: 0 });
    if (Date.now() < L.hornUntil) { c.save(); c.strokeStyle = 'rgba(242,193,78,.9)'; c.lineWidth = 1.2; var k = ((Date.now() % 900) / 900); for (var i = 0; i < 3; i++) { c.beginPath(); c.arc(x + sz * 1.8, y + sz * 2.4, sz * (0.8 + i * 0.7 + k * 0.7), -0.7, 0.7); c.stroke(); } c.restore(); }
    A.rocks(c, 325, h * 0.72, 22, Tm);
    var bx = 52 + (p.x || 0) * 233, by = h * 0.76;
    A.boat(c, bx, by, Math.min(21, h / 12), done ? 'cheer' : 'worried', Tm, 0.05);
    var lit = lamp + (bay.horn ? 1 : 0) + (bay.radio != null ? 1 : 0);
    A.fog(c, 369, h, Tm, Math.max(0.25, 0.85 - lit * 0.28));
    if (p.drifting && p.x > 0.35) A.inset(c, 6, 6, 150, 82, 'worried', Tm);
    if (bay.radio != null) { c.save(); c.fillStyle = 'rgba(8,20,42,.8)'; A.rrect(c, 369 - 96, 8, 88, 22, 6); c.fill(); c.fillStyle = '#7fe0a8'; c.font = '600 11px Space Grotesk, sans-serif'; c.fillText('RADIO ' + bay.radio, 369 - 88, 23); c.restore(); }
    if (p.black) { c.fillStyle = 'rgba(2,6,14,.92)'; c.fillRect(0, 0, 369, h); }
    if (st.paused) { c.fillStyle = 'rgba(5,12,24,.45)'; c.fillRect(0, 0, 369, h); }
    c.restore();
  }
  function loop() { try { if (st && !el.app.classList.contains('hide')) drawBay(); } catch (e) { console.error(e); } requestAnimationFrame(loop); }

  /* ---------- transitions: sounds, toasts, the rocks ---------- */
  function transitions() {
    if (!prev) return;
    var f = fault(), pf = prev.ch && prev.ch.fault;
    if (f && f.lastRun && (!pf || pf.lastRun !== f.lastRun) && f.lastRunAt != null && f.lastRunAt > (pf && pf.lastRunAt || 0) && f.lastRun.shout) Snd.play('red');
    if (f && f.runAt != null && (!pf || pf.runAt !== f.runAt) && f.lastRun && f.lastRun.shout) Snd.play('red');
    if (st.bay.lamp && !prev.bay.lamp) Snd.play('lamp');
    if (st.bay.horn && !prev.bay.horn) { Snd.play('horn'); L.hornUntil = Date.now() + 3000; }
    if (st.bay.radio != null && prev.bay.radio == null) Snd.play('crackle');
    if (st.coins > prev.coins) Snd.play('coin');
    if (f && f.boat && f.boat.black && !(pf && pf.boat && pf.boat.black)) Snd.play('rewind');
    if (st.badges.length > prev.badges.length) { Snd.play('cheer'); toast(str('badge.' + st.badges[st.badges.length - 1]), 2800); }
    if (prev.phase[0] === 'c' && st.phase[0] !== 'c') Snd.play('cheer');
  }
  function watchRocks() { var f = fault(); if (f && f.rocksAt != null && st.now >= f.rocksAt && !st.paused) send('boat', { fail: true }); }

  /* ---------- render ---------- */
  function render() {
    refold(); transitions(); prev = st;
    var stage = mine().stage, f = fault();
    if (Date.now() > L.toastUntil) el.toast.classList.remove('show');
    renderLink(); renderCurtain();
    // one column (a narrow window): the cards sit below the bay, so the Name step scrolls down to them and the next Run scrolls back up
    var sk = f ? f.no + ':' + f.step : ''; if (sk !== L.scrollStep) { L.scrollStep = sk; if (f && window.innerWidth < 980) { var m = $('main'); m.scrollTo({ top: f.step === 'name' ? m.scrollHeight : 0, behavior: 'smooth' }); } }
    if (st.phase === 'home' && stage === 'home') { pageHome(); renderTour(false); el.card.classList.remove('show'); return; }
    if (st.phase === 'home') { pageHome(); renderTour(false); el.card.classList.remove('show'); return; }
    if (stage === 'sound') { pageSound(); return; }
    if (stage === 'pair') { pagePair(); return; }
    if (stage === 'cold') { pageCold(); return; }
    if (stage === 'r1') { pageR1(); return; }
    if (stage === 'r2') { pageR2(); return; }
    if (stage === 't3') { pageT3(); return; }
    if (stage === 'wait') { pageWait(); return; }
    if (stage === 'watch') { pageWorked(); return; }
    // the hour layout (tour or chapter)
    el.page.classList.remove('show'); el.app.classList.remove('hide'); L.pageKey = '';
    renderStrip(); renderSteps(stage === 'tour' ? null : f); el.job.textContent = stage === 'tour' ? '' : jobLine(f);
    renderCard(f); renderCode(stage === 'tour' ? null : f); renderBaySide(stage === 'tour' ? null : f);
    renderTour(stage === 'tour' || L.tour.again);
    if (stage === 'tour') { el.run.disabled = true; el.run.textContent = str('run'); el.helpbtn.classList.add('hide'); setHtml(el.cards, cardsHtml(false, null)); el.crew.textContent = ''; }
    watchRocks();
  }
  setInterval(function () { render(); }, 250);
  render(); loop();
  window.SameLightDebug = { seat: SEAT, state: function () { return st; }, send: send, log: function () { return live.log(); }, L: L, now: now, render: render };
})();
