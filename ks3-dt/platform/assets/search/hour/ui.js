/* J2 L5 THE SEARCH — the hour's stage, overlay and widgets. Pictures on the frozen canvas; words in a DOM overlay scaled with it. */
(function () {
  'use strict';
  var Sc = window.SearchScene, C = window.SearchChars, Snd = window.SearchSound, S2 = window.SearchSound2, S = window.SearchStrings;
  var U = {}, el = {}, q = new URLSearchParams(location.search);
  U.speed = Math.max(1, +q.get('speed') || 1); U.measure = []; U.keys = 0; U.linesTyped = 0; U.things = 0;
  var paused = false, pauseT0 = 0, lostToPause = 0, t0 = performance.now() / 1000, drawFn = null, frameFns = [], lastFrame = 0, slowFor = 0, lighterSaid = false;
  U.lighter = 0; /* 0 full, 1 half snow, 2 off */
  U.now = function () { return ((paused ? pauseT0 : performance.now() / 1000) - t0 - lostToPause) * U.speed; }; /* story seconds, stops while paused */
  U.fill = function (tpl, v) { return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); };
  U.$ = function (id) { return el[id] || (el[id] = document.getElementById(id)); };
  U.show = function (id, on) { var e = U.$(id); if (e) e.classList.toggle('off', !on); };
  U.text = function (id, s) { var e = U.$(id); if (e) e.textContent = s == null ? '' : s; };
  U.html = function (id, h) { var e = U.$(id); if (e) e.innerHTML = h == null ? '' : h; };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  U.esc = esc; U.dots = function (line) { return esc(line).replace(/^( +)/, function (m) { return '<span class="dots">' + '·'.repeat(m.length) + '</span>'; }); };
  /* ---------- the stage transform ---------- */
  U.place = function () { window.SearchSceneFit = U.fit || 'contain'; Sc.size(); var s = Sc.scaleOf(); var h = U.$('hour'); h.style.transform = 'translate(' + s.ox + 'px,' + s.oy + 'px) scale(' + s.k + ')'; U.scale = s; };
  /* ---------- the frame loop: Sc.begin() then the chapter's draw, then snow twins ---------- */
  U.draw = function (fn) { drawFn = fn; }; U.onFrame = function (fn) { frameFns.push(fn); return function () { frameFns = frameFns.filter(function (f) { return f !== fn; }); }; };
  function frame(nowMs) { var t = U.now(), real = nowMs / 1000, dt = lastFrame ? real - lastFrame : 0.016; lastFrame = real;
    if (dt > 0.05) { slowFor += dt; if (slowFor > 2) { if (U.lighter < 2) { U.lighter++; if (U.lighter === 2 && !lighterSaid) { lighterSaid = true; U.note(S.common.lighter); } } slowFor = 0; } } else slowFor = Math.max(0, slowFor - dt * 0.5);
    if (!paused && drawFn) { Sc.begin(); drawFn(t, dt); frameFns.forEach(function (f) { f(t, dt); }); }
    requestAnimationFrame(frame); }
  /* ---------- waits, buttons, typing ---------- */
  U.wait = function (secs) { return new Promise(function (res) { var end = U.now() + secs; (function tick() { if (U.now() >= end) res(); else setTimeout(tick, 30); })(); }); };
  var pressRes = null, pressBtns = [];
  U.buttons = function (list) { /* list: [{id,label,primary}] into #pbtn; resolves with id when pressed */
    var row = U.$('pbtn'); row.innerHTML = ''; pressBtns = [];
    return new Promise(function (res) { pressRes = res; list.forEach(function (b) { var x = document.createElement('button'); x.type = 'button'; x.textContent = b.label; x.id = 'b-' + b.id; x.className = b.primary ? 'pri' : ''; x.disabled = !!b.off;
      x.addEventListener('click', function () { if (x.disabled) return; S2.click(); row.innerHTML = ''; pressRes = null; res(b.id); }); row.appendChild(x); pressBtns.push(x); }); }); };
  U.enable = function (id, on) { var x = document.getElementById('b-' + id); if (x) x.disabled = !on; };
  U.pressNow = function (id) { var x = document.getElementById('b-' + id); if (x && !x.disabled) x.click(); };
  /* the box. mode 'line' (Enter sends the line) | 'plan' (Enter on an empty last line presses Run) | 'name' | 'off' */
  var boxMode = 'off', lineRes = null, firstKey = null, tabSaid = false;
  U.box = function (mode, text, rows) { var b = U.$('box'); boxMode = mode; b.value = text || ''; b.rows = rows || (mode === 'plan' ? 3 : 1); U.show('boxWrap', mode !== 'off'); b.readOnly = mode === 'off';
    if (mode !== 'off') { b.focus(); } };
  U.readLine = function () { return new Promise(function (res) { lineRes = res; }); };
  U.onFirstKey = function (fn) { firstKey = fn; };
  U.active = function () { return !!drawFn; }; U.lines = function () { return U.$('box').value.replace(/\r/g, '').split('\n'); };
  function boxKey(ev) { var b = U.$('box'); if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' || ev.key === ' ') ev.stopPropagation(); /* the frozen film listens for these on the document */
    if (ev.key === 'Tab') { ev.preventDefault(); var s = b.selectionStart; b.value = b.value.slice(0, s) + '    ' + b.value.slice(b.selectionEnd); b.selectionStart = b.selectionEnd = s + 4; if (!tabSaid) { tabSaid = true; U.under(S.common.tab, ''); } return; }
    if (ev.key === 'Enter') { if (boxMode === 'line' || boxMode === 'name') { ev.preventDefault(); var v = b.value; if (lineRes && (v.trim() || boxMode === 'name')) { var r = lineRes; lineRes = null; U.keys++; r(v); } return; }
      if (boxMode === 'plan') { var ls = b.value.split('\n'); var atEnd = b.selectionStart === b.value.length; if (atEnd && ls.length >= 3 && ls[ls.length - 1].trim() === '') { ev.preventDefault(); U.pressNow('run'); U.pressNow('fly'); return; }
        if (atEnd && ls.length >= 3 && ls[ls.length - 1].trim() !== '' && ls.length === 3) { ev.preventDefault(); U.pressNow('run'); U.pressNow('fly'); return; } } }
    if (ev.key.length === 1 || ev.key === 'Backspace') { U.keys++; if (firstKey) { var f = firstKey; firstKey = null; f(); } } }
  /* ---------- panel pieces ---------- */
  U.panel = function (o) { /* o: kicker, head, card (array of lines), ring (index), sign, under, note */
    U.text('kicker', o.kicker); U.text('head', o.head); U.show('head', !!o.head);
    var c = U.$('card'); if (o.card) { c.innerHTML = o.card.map(function (l, i) { return '<div class="cl' + (o.ring === i ? ' ring' : '') + '">' + U.dots(l) + '</div>'; }).join(''); } U.show('card', !!o.card);
    U.text('sign', o.sign); U.show('sign', !!o.sign); U.under(o.under || '', ''); U.text('above', o.above); U.show('above', !!o.above); };
  U.ring = function (i) { var ls = U.$('card').querySelectorAll('.cl'); ls.forEach(function (x, k) { x.classList.toggle('ring', k === i); }); };
  U.under = function (s, kind) { var e = U.$('under'); e.textContent = s || ''; e.className = kind || ''; if (kind === 'bad') { Snd.buzz(); } };
  U.note = function (s) { U.text('note', s); U.show('note', !!s); if (s) { var t = U.now(), off = U.onFrame(function () { if (U.$('note').textContent !== s) { off(); return; } if (U.now() - t >= 6) { off(); U.show('note', false); } }); } }; /* six STORY seconds (pauses and ?speed count), not six wall-clock ones: a note left up by a real-time timer sat on the next screen (words gate: 53 on 3.3 held) */
  U.bubble = function (s, x, y, who) { var b = U.$('bub'); if (!s) { b.classList.add('off'); return; } b.querySelector('.say').textContent = s; b.querySelector('.who').textContent = who || 'BEEP'; b.style.left = x + 'px'; b.style.top = y + 'px'; b.classList.remove('off'); if (!who) Snd.chirp('happy'); };
  U.held = function (s) { U.text('held', s); U.show('held', !!s); };
  U.strip = function (cur, done) { var e = U.$('strip'); e.innerHTML = S.strip.map(function (n, i) { return '<span class="' + (i === cur ? 'cur' : done.indexOf(i) >= 0 ? 'done' : '') + '">' + (done.indexOf(i) >= 0 ? '✓ ' : '') + esc(n) + '</span>'; }).join('<i>·</i>'); };
  U.screenWords = function () { /* prose words visible in the overlay (the gate reads it) */ var n = 0; U.$('hour').querySelectorAll('#head,#under,#above,#sign,.say,#held,#hsheet .p,#hsheet h2,#note,#rot,#tourText').forEach(function (e) { if (e.closest('.off') || e.classList.contains('off')) return; var t = e.textContent.trim(); if (t) n += t.split(/\s+/).length; }); return n; };
  /* ---------- the sheet (closing screens, questions, do-now, recap) ---------- */
  U.sheet = function (h) { U.html('hsheet', h); U.show('hsheet', !!h); };
  U.sheetOff = function () { U.show('hsheet', false); };
  U.question = function (o) { /* o: seen, q, opts[[text, fb, right]] (shuffled), ev (code lines). resolves when right */
    return new Promise(function (res) { var opts = o.opts.slice(); for (var i = opts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = opts[i]; opts[i] = opts[j]; opts[j] = t; }
      var h = (o.ev ? '<pre class="ev">' + o.ev.map(U.dots).join('\n') + '</pre>' : '') + (o.seen ? '<div class="p seen">' + esc(o.seen) + '</div>' : '') + '<h2>' + esc(o.q) + '</h2><div class="opts">' + opts.map(function (x, i) { return '<button type="button" class="opt" data-i="' + i + '">' + esc(x[0]) + '</button>'; }).join('') + '</div><div class="p fb" id="fb"></div>';
      U.sheet(h); var tries = 0; U.$('hsheet').querySelectorAll('.opt').forEach(function (b) { b.addEventListener('click', function () { S2.click(); var x = opts[+b.dataset.i]; tries++; document.getElementById('fb').textContent = x[1]; document.getElementById('fb').className = 'p fb ' + (x[2] ? 'ok' : 'bad');
        if (x[2]) { U.$('hsheet').querySelectorAll('.opt').forEach(function (z) { z.disabled = true; }); b.classList.add('right'); res({ tries: tries }); } else { b.disabled = true; b.classList.add('wrong'); if (!x[2]) Snd.buzz(); } }); }); }); };
  /* ---------- gauge and clock (counts by the clock, not frames) ---------- */
  U.gauge = function (label, on) { U.text('gLabel', label); U.show('gauge', !!on); U.$('gBar').style.width = '100%'; U.$('gauge').classList.remove('low'); };
  U.clock = function (secs, onEnd, beat) { var k = { secs: secs, t0: null, done: false, stopped: false, beat: 0 };
    k.start = function () { if (k.t0 == null) k.t0 = U.now(); }; k.stop = function () { k.stopped = true; };
    k.left = function () { return k.t0 == null ? secs : Math.max(0, secs - (U.now() - k.t0)); }; k.frac = function () { return k.left() / secs; };
    k.off = U.onFrame(function () { if (k.stopped || k.done) return; var f = k.frac(); U.$('gBar').style.width = (f * 100).toFixed(1) + '%'; var low = k.left() <= 10 && k.t0 != null; U.$('gauge').classList.toggle('low', low);
      if (low) { var b = Math.floor(U.now() * 1.25); if (b !== k.beat) { k.beat = b; if (beat) beat(k.frac()); else S2.heartbeat(); } } if (f <= 0) { k.done = true; k.off(); onEnd && onEnd(); } });
    return k; };
  /* ---------- the spotlight tour: three stops, one sentence each ---------- */
  U.tour = function (stops) { /* [{text, el(id) or rect[x,y,w,h]}] */ return stops.reduce(function (p, s) { return p.then(function () { return new Promise(function (res) { var r = s.rect || (function () { var e = U.$(s.el).getBoundingClientRect(), k = U.scale.k; return [(e.left - U.scale.ox) / k, (e.top - U.scale.oy) / k, e.width / k, e.height / k]; })();
      var hole = U.$('tourHole'); hole.style.left = (r[0] - 14) + 'px'; hole.style.top = (r[1] - 14) + 'px'; hole.style.width = (r[2] + 28) + 'px'; hole.style.height = (r[3] + 28) + 'px';
      var tx = U.$('tourText'); tx.textContent = s.text; var card = U.$('tourCard'); card.style.left = Math.min(1180, Math.max(40, r[0])) + 'px'; card.style.top = (r[1] + r[3] + 40 > 760 ? r[1] - 150 : r[1] + r[3] + 40) + 'px';
      U.show('tour', true); U.log('tour stop', s.text.split(/\s+/).length, 0, 0); var b = U.$('tourNext'); b.onclick = function () { S2.click(); U.show('tour', false); res(); }; b.focus(); }); }); }, Promise.resolve()); };
  /* ---------- pause ---------- */
  U.pause = function (on) { if (on === paused) return; paused = on; if (on) { pauseT0 = performance.now() / 1000; Snd.pause(); S2.pause(); } else { lostToPause += performance.now() / 1000 - pauseT0; Snd.unpause(); S2.unpause(); } U.show('pausedScrim', on); U.text('pauseBtn', on ? S.btn.pause : S.btn.pause); };
  U.isPaused = function () { return paused; };
  /* ---------- the measure log: each screen's words, her keys, the seconds the screen holds her ---------- */
  U.log = function (screen, words, keys, secs) { U.measure.push({ screen: screen, words: words || 0, keys: keys || 0, secs: secs || 0, at: +U.now().toFixed(1) }); };
  U.logScreen = function (name, secs) { U.log(name, U.screenWords(), 0, secs || 0); };
  /* ---------- init ---------- */
  U.init = function () { var b = U.$('box'); b.addEventListener('keydown', boxKey); b.addEventListener('paste', function (e) { e.preventDefault(); }); b.addEventListener('drop', function (e) { e.preventDefault(); });
    b.setAttribute('autocomplete', 'off'); b.setAttribute('autocorrect', 'off'); b.setAttribute('autocapitalize', 'off'); b.spellcheck = false;
    U.$('pauseBtn').addEventListener('click', function () { U.pause(!paused); }); document.addEventListener('keydown', function (e) { if (e.key === 'Escape') U.pause(!paused); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) U.pause(true); });
    U.place(); window.addEventListener('resize', U.place); requestAnimationFrame(frame); };
  window.SearchUI = U;
})();
