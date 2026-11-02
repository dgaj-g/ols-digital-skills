/* Turn Down the Heat — core: saved progress, header, part pages and the common task types
   (multiple choice, drag, two-choice rows, choose-all). The special screens are in app-special.js.
   Answers stay inside window.TDTH. Nothing that tells an answer is written into the page,
   except with ?giveaway=1, which is the control for the giveaway judge. */
(function () {
  'use strict';
  var C = window.TDTH, U = C.ui, KEY = 'tdth-v1';
  var GIVE = /[?&]giveaway=1/.test(location.search);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TEMPS = window.TDTH_TEMPS || { start: 1850, values: [] };
  var INK = '#1B2433';
  var ON = { 2: INK, 3: INK, 6: INK };                      // text colour on the part colour
  var TEXT = { 1: '#6BAED6', 2: '#9ECAE1', 3: '#FC9272', 4: '#FB6A4A', 5: '#FF7B7B', 6: '#E4B824', 7: '#FF8A8A' };

  /* ---------- small helpers ---------- */
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] != null ? o[k] : m; }); }
  function el(tag, a, kids) {
    var n = document.createElement(tag);
    if (a) Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v == null || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'cls') n.className = v;
      else if (k === 'on') Object.keys(v).forEach(function (e) { n.addEventListener(e, v[e]); });
      else if (k === 'style') Object.keys(v).forEach(function (s) { n.style.setProperty(s, v[s]); });
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
    return n;
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function hexRgba(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function starText(n) { n = n || 0; return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }
  function starsLine(n) { return n === 1 ? U.star1 : fmt(U.stars, { n: n }); }
  function starsFor(checks) { return checks <= 1 ? 3 : checks === 2 ? 2 : 1; }
  var srEl = document.getElementById('sr');
  function say(m) { if (!srEl) return; srEl.textContent = ''; setTimeout(function () { srEl.textContent = m; }, 40); }

  /* ---------- saved progress (this device only) ---------- */
  function fresh() { return { v: 1, view: 0, unlocked: 1, done: {}, stars: {}, tasks: {}, quick: {}, order: {}, run: null, foot: null, poster: null, final: null }; }
  var S = fresh();
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && o.v === 1) S = Object.assign(fresh(), o); } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function T(id) { return S.tasks[id] || (S.tasks[id] = { done: false, stars: null, checks: 0, showed: false, data: {} }); }
  /* Shuffled once, then kept, so the order does not change when she comes back. */
  function orderOf(key, ids) {
    var o = S.order[key];
    if (!o || o.length !== ids.length || ids.some(function (x) { return o.indexOf(x) < 0; })) {
      o = shuffle(ids);
      if (ids.length > 2 && o.join() === ids.join()) o.push(o.shift());
      S.order[key] = o; save();
    }
    return o;
  }

  /* ---------- stripes ---------- */
  var stripesCSS = (function () {
    var v = TEMPS.values, n = v.length, s = [];
    if (!n || !window.TDTH_STRIPES) return 'none';
    for (var i = 0; i < n; i++) { var c = TDTH_STRIPES.colour(v[i]); s.push(c + ' ' + (i / n * 100).toFixed(2) + '%', c + ' ' + ((i + 1) / n * 100).toFixed(2) + '%'); }
    return 'linear-gradient(90deg,' + s.join(',') + ')';
  })();
  var cleanups = [];
  function onLeave(fn) { cleanups.push(fn); }
  /* Draw a stripes canvas now and again whenever it changes size. */
  function liveStripes(cv, values, slots, upto) {
    var last = { values: values, slots: slots, upto: upto };
    function draw() { if (window.TDTH_STRIPES) TDTH_STRIPES.draw(cv, last.values, last.upto, last.slots); }
    draw();
    var ro = window.ResizeObserver ? new ResizeObserver(draw) : null;
    if (ro) { ro.observe(cv); onLeave(function () { ro.disconnect(); }); }
    return { set: function (v, s, u) { last = { values: v, slots: s, upto: u }; draw(); } };
  }
  function drawRibbon() {
    var cv = document.getElementById('ribbon');
    if (!cv || !window.TDTH_STRIPES) return;
    var mine = APP.ribbonValues ? APP.ribbonValues() : null;
    TDTH_STRIPES.draw(cv, mine || TEMPS.values);
  }

  /* ---------- header ---------- */
  var bar = document.getElementById('stagebar'), whereEl = document.getElementById('where'), makingEl = document.getElementById('making');
  var topEl = document.querySelector('.top');
  function isOpen(v) { return v === 0 || (v >= 1 && v <= 7 && v <= S.unlocked) || (v === 8 && !!S.done[7]); }
  function buildBar() {
    bar.textContent = '';
    bar.appendChild(el('button', { type: 'button', 'data-part': '0', style: { '--seg': '#1A3A6B', '--seg-on': '#fff' }, on: { click: function () { show(0); } } }, [U.start]));
    C.parts.forEach(function (p) {
      bar.appendChild(el('button', { type: 'button', 'data-part': p.k, style: { '--seg': p.colour, '--seg-on': ON[p.k] || '#fff' },
        on: { click: function () { if (isOpen(p.k)) show(p.k); else lockedNote(); } } }));
    });
    refreshBar();
  }
  function refreshBar() {
    [].forEach.call(bar.children, function (b) {
      var k = +b.getAttribute('data-part');
      if (k === 0) b.setAttribute('aria-label', U.startWhere);
      else {
        var p = C.parts[k - 1], open = isOpen(k), st = S.stars[k];
        b.setAttribute('data-state', !open ? 'locked' : S.done[k] ? 'done' : 'open');
        b.textContent = String(k);
        if (S.done[k]) {
          b.appendChild(el('span', { cls: 'tick', 'aria-hidden': 'true', text: '✓' }));
          b.appendChild(el('span', { cls: 'seg-stars', 'aria-hidden': 'true', text: starText(st) }));
        }
        b.setAttribute('aria-label', fmt(U.partOf, { k: k, name: p.name }) + (S.done[k] ? '. ' + starsLine(st) : !open ? '. ' + U.locked : ''));
        if (open) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true');
      }
      if (k === S.view) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }
  var lockTimer = null;
  function lockedNote() {
    makingEl.textContent = U.locked; makingEl.classList.add('warn'); say(U.locked);
    clearTimeout(lockTimer);
    lockTimer = setTimeout(function () { makingEl.textContent = C.making; makingEl.classList.remove('warn'); }, 2600);
  }
  function setWhere(v) {
    whereEl.textContent = '';
    if (v >= 1 && v <= 7) {
      var s = fmt(U.partOf, { k: v, name: C.parts[v - 1].name }), i = s.indexOf(':');
      whereEl.appendChild(el('span', { cls: 'k', text: s.slice(0, i + 1) }));
      whereEl.appendChild(document.createTextNode(s.slice(i + 1)));
    } else whereEl.textContent = v === 8 ? C.end.title : U.startWhere;
    makingEl.textContent = C.making;
  }
  function theme(v) {
    var c = v >= 1 && v <= 7 ? C.parts[v - 1].colour : '#1A3A6B', bs = document.documentElement.style;
    bs.setProperty('--accent', c);
    bs.setProperty('--on-accent', ON[v] || '#fff');
    bs.setProperty('--glow', hexRgba(c, v >= 1 && v <= 7 ? 0.55 : 0.35));
    bs.setProperty('--accent-text', TEXT[v] || '#E4B824');
    bs.setProperty('--stripes', stripesCSS);
  }
  /* 0 when the header scrolls away (phone, short board), so the sticky tray pins to the very top */
  function headH() { if (topEl) document.documentElement.style.setProperty('--head-h', (getComputedStyle(topEl).position === 'sticky' ? topEl.offsetHeight : 0) + 'px'); }

  /* ---------- views ---------- */
  function show(v, opts) {
    if (!isOpen(v)) v = 0;
    cleanups.splice(0).forEach(function (f) { try { f(); } catch (e) {} });
    S.view = v; save();
    [].forEach.call(document.querySelectorAll('main > section[data-view]'), function (s) { s.classList.remove('on'); s.textContent = ''; });
    var sec = document.querySelector('section[data-view="' + v + '"]');
    theme(v); setWhere(v); refreshBar(); headH();
    sec.classList.add('on');
    if (v === 0) APP.views.hero(sec);
    else if (v === 8) APP.views.end(sec);
    else renderPart(C.parts[v - 1], sec);
    if (!(opts && opts.keepScroll)) window.scrollTo(0, 0);
    drawRibbon();
  }

  /* ---------- part page: head, quick question, tasks one at a time, talk, part done ---------- */
  function renderPart(p, sec) {
    var label = fmt(U.partOf, { k: p.k, name: p.name });
    sec.setAttribute('aria-label', label);
    sec.appendChild(el('div', { cls: 'part-head' }, [
      el('span', { cls: 'num', 'aria-hidden': 'true', text: String(p.k) }),
      el('div', null, [el('p', { text: label.slice(0, label.indexOf(':')) }), el('h2', { text: p.name })])
    ]));
    var flow = el('div', { cls: 'flow' });
    sec.appendChild(flow);
    if (p.quick) quick(p, flow, function (fresh) { next(p, flow, 0, fresh); });
    else next(p, flow, 0, false);
  }

  function quick(p, flow, then) {
    var card = el('article', { cls: 'task quick', id: 'quick-' + p.k }), inn = el('div', { cls: 'task-in' });
    inn.appendChild(el('h3', { cls: 'task-title', text: fmt(U.quickLabel, { k: p.k - 1 }) }));
    card.appendChild(inn); flow.appendChild(card);
    var sv = S.quick[p.k] || (S.quick[p.k] = { pick: null });
    mcqBlock(inn, { q: p.quick.q, opts: p.quick.opts, why: p.quick.why }, 'quick:' + p.k,
      { once: true, saved: sv, onAnswer: function () { save(); then(true); } });
    if (sv.pick != null) then(false);
  }

  function next(p, flow, i, fresh) {
    var first = null;
    while (i < p.tasks.length) {
      var t = p.tasks[i], card = taskCard(p, t, i);
      flow.appendChild(card);
      if (!first) first = card;
      runRenderer(p, t, card, i, flow);
      if (!T(t.id).done) break;
      i++;
    }
    if (i >= p.tasks.length) { var done = finishPart(p, flow, fresh); if (!first) first = done; }
    if (fresh && first) nudge(first);
  }
  /* Bring the new card into view without hiding the feedback she has just been given. */
  function nudge(card) {
    setTimeout(function () {
      var r = card.getBoundingClientRect();
      if (r.top > innerHeight * 0.8) window.scrollBy({ top: r.top - innerHeight * 0.55, behavior: reduce ? 'auto' : 'smooth' });
    }, 900);
  }

  function taskCard(p, t, i) {
    var st = T(t.id);
    var card = el('article', { cls: 'task', id: 'task-' + t.id, 'data-type': t.type, 'data-state': st.done ? 'done' : 'open' });
    var inn = el('div', { cls: 'task-in' });
    inn.appendChild(el('h3', { cls: 'task-title' }, [
      el('span', { cls: 'tno', text: p.k + String.fromCharCode(97 + i) }),
      el('span', { text: t.title }),
      el('span', { cls: 'tdone', text: '✓ ' + U.taskDone })
    ]));
    inn.appendChild(el('p', { cls: 'task-do', text: t.do }));
    card.appendChild(inn);
    return card;
  }

  function runRenderer(p, t, card, i, flow) {
    var st = T(t.id), fired = st.done;
    var ctx = {
      saved: st.data, state: st, store: save,
      done: function (stars) {
        if (fired) return;
        fired = true; st.done = true; st.stars = stars == null ? null : stars;
        card.setAttribute('data-state', 'done'); save();
        next(p, flow, i + 1, true);
      }
    };
    var fn = R[t.type];
    if (fn) fn(t, card.querySelector('.task-in'), p, ctx);
  }

  function partStars(p) {
    var s = p.tasks.map(function (t) { return T(t.id).stars; }).filter(function (n) { return n != null; });
    return s.length ? Math.min.apply(null, s) : 3;
  }

  function finishPart(p, flow, fresh) {
    if (!S.done[p.k]) {
      S.done[p.k] = true; S.stars[p.k] = partStars(p);
      S.unlocked = Math.max(S.unlocked, Math.min(7, p.k + 1));
      save(); refreshBar(); drawRibbon();
    }
    var n = S.stars[p.k];
    flow.appendChild(el('div', { cls: 'talk' }, [el('h3', { text: U.talkLabel }), el('p', { text: p.talk })]));
    var big = el('div', { cls: 'big-stars', role: 'img', 'aria-label': starsLine(n) },
      [0, 1, 2].map(function (j) { return el('span', { cls: j < n ? 'on' : 'off', text: '★' }); }));
    var nextBtn = p.k < 6 ? el('button', { type: 'button', cls: 'btn big', text: fmt(U.next, { k: p.k + 1, name: C.parts[p.k].name }), on: { click: function () { show(p.k + 1); } } })
      : p.k === 6 ? el('button', { type: 'button', cls: 'btn big', text: U.toFinal, on: { click: function () { show(7); } } })
      : el('button', { type: 'button', cls: 'btn big', text: U.toEnd, on: { click: function () { show(8); } } });
    var box = el('div', { cls: 'partdone', id: 'partdone-' + p.k }, [
      el('h3', { text: fmt(U.partDone, { k: p.k, name: p.name }) }), big,
      el('p', { text: starsLine(n) }),
      el('p', { cls: 'key', text: p.k === 7 ? C.final.starsKey : U.starsKey }),
      nextBtn,
      el('p', { cls: 'reopen', text: U.reopen })
    ]);
    flow.appendChild(box);
    if (fresh) {
      say(fmt(U.partDone, { k: p.k, name: p.name }) + ' ' + starsLine(n));
      if (window.gsap && !reduce) gsap.from(big.children, { scale: 0, rotate: -40, duration: 0.6, stagger: 0.18, ease: 'back.out(3)', delay: 0.3 });
    }
    return box;
  }

  /* ---------- multiple choice ----------
     Retry mode (tasks): a wrong pick is marked Not yet and greyed out; pick again. Stars: 0 wrong = 3, 1 = 2, more = 1.
     Once mode (quick questions, final check): one pick, then the right answer and the reason show. */
  function mcqBlock(host, q, key, o) {
    var box = el('div', { cls: 'mcq' }), qid = 'q-' + key.replace(/[^a-z0-9]/gi, '-');
    if (q.who) box.appendChild(el('span', { cls: 'who', text: q.who }));
    box.appendChild(el('p', { cls: 'q', id: qid, text: q.q }));
    var opts = el('div', { cls: 'opts', role: 'group', 'aria-labelledby': qid });
    box.appendChild(opts);
    var saved = o.saved || {}, btns = {}, why = null, right = -1;
    if (!o.once) saved.wrongs = saved.wrongs || [];
    q.opts.forEach(function (op, i) { if (op.ok) right = i; });
    orderOf(key, q.opts.map(function (_, i) { return i; })).forEach(function (oi, n) {
      var b = el('button', { type: 'button', 'data-answer': GIVE && q.opts[oi].ok ? '1' : null },
        [el('span', { cls: 'letter', 'aria-hidden': 'true', text: 'ABCDEF'[n] }), el('span', { text: q.opts[oi].t })]);
      b.addEventListener('click', function () { pick(oi, false); });
      btns[oi] = b; opts.appendChild(b);
    });
    function mark(oi, ok, word) {
      var b = btns[oi];
      b.classList.add(ok ? 'is-right' : 'is-wrong');
      b.appendChild(el('span', { cls: ok ? 'mark-right' : 'mark-wrong', text: word }));
    }
    function finish() {
      Object.keys(btns).forEach(function (k) { btns[k].disabled = true; });
      if (!why) { why = el('p', { cls: 'why', text: q.why }); box.appendChild(why); }
    }
    function pick(oi, restoring) {
      var ok = !!q.opts[oi].ok;
      if (o.once) {
        mark(oi, ok, ok ? C.final.rightWord : C.final.wrongWord);
        if (!ok) mark(right, true, C.final.rightWord);
        finish();
        if (!restoring) { saved.pick = oi; if (o.onAnswer) o.onAnswer(ok, saved); }
      } else if (ok) {
        mark(oi, true, U.right); finish();
        if (!restoring) { saved.done = true; if (o.onRight) o.onRight(saved.wrongs.length, saved); }
      } else {
        mark(oi, false, U.wrong); btns[oi].disabled = true;
        if (!restoring) { saved.wrongs.push(oi); if (o.onChange) o.onChange(saved); }
      }
      if (!restoring) say((ok ? U.right : o.once ? C.final.wrongWord : U.wrong) + '. ' + (ok || o.once ? q.why : ''));
    }
    if (o.once) { if (saved.pick != null) pick(saved.pick, true); }
    else { saved.wrongs.forEach(function (w) { pick(w, true); }); if (saved.done) pick(right, true); }
    host.appendChild(box);
    return box;
  }
  function qStars(qs, data) {
    return Math.min.apply(null, qs.map(function (q) { var w = ((data.qs || {})[q.id] || { wrongs: [] }).wrongs.length; return w === 0 ? 3 : w === 1 ? 2 : 1; }));
  }
  /* A group of retry-mode questions. Returns true when they were already all right. */
  function qsGroup(host, qs, keyBase, data, onAll) {
    data.qs = data.qs || {};
    var left = 0;
    qs.forEach(function (q) {
      var sv = data.qs[q.id] || (data.qs[q.id] = { wrongs: [] });
      if (!sv.done) left++;
      mcqBlock(host, q, keyBase + ':' + q.id, { saved: sv, onChange: save, onRight: function () { save(); if (--left === 0) onAll(qStars(qs, data)); } });
    });
    return left === 0;
  }

  /* Stripes 1850–2025 above a task, with year marks. */
  function readStripes(host, pins) {
    var strip = el('div', { cls: 'tl-strip' + (pins ? ' has-pins' : '') }), cv = el('canvas', { 'aria-hidden': 'true' });
    strip.appendChild(cv);
    var span = TEMPS.values.length - 1;
    function pct(y) { return (y - TEMPS.start) / span * 100; }
    if (pins) {
      var lastX = -99, up = false;
      pins.forEach(function (z) {
        var x = pct(z.year);
        up = x - lastX < 6 ? !up : false; lastX = x;
        var b = el('b', { text: z.label });
        if (x < 4) { b.style.left = '0'; b.style.transform = 'none'; }
        if (x > 96) { b.style.left = 'auto'; b.style.right = '0'; b.style.transform = 'none'; }
        strip.appendChild(el('span', { cls: 'tl-pin' + (up ? ' up' : ''), style: { left: x + '%' } }, [b]));
      });
    }
    host.appendChild(strip);
    host.appendChild(el('div', { cls: 'tl-ticks', 'aria-hidden': 'true' }, [1850, 1900, 1950, 2000, 2025].map(function (y) {
      return el('span', { style: { left: pct(y) + '%' }, text: String(y) });
    })));
    liveStripes(cv, TEMPS.values);
  }

  /* ---------- task renderers ---------- */
  var R = {};

  R.mcq = function (t, body, p, ctx) {
    if (t.id === 'p1-read') readStripes(body);
    qsGroup(body, t.qs, t.id, ctx.saved, function (n) { ctx.done(n); });
  };

  /* Bars for the real figures (Part 5 and the final check). */
  function bars(host, items, valueFmt, top) {
    var box = el('div', { cls: 'bars' }), max = top || 54 * 1.3, all = [];
    items.forEach(function (it) {
      var b0 = el('div', { cls: 'bar y2000' }, [el('span', { text: fmt(valueFmt, { v: it.y2000 }) })]);
      var b1 = el('div', { cls: 'bar' }, [el('span', { text: fmt(valueFmt, { v: it.y2017 }) })]);
      all.push([b0, it.y2000], [b1, it.y2017]);
      box.appendChild(el('div', { cls: 'bar-row' }, [el('span', { text: it.t }), el('div', { cls: 'bar-track' }, [b0, b1])]));
    });
    box.appendChild(el('div', { cls: 'bars-key' }, [
      el('span', null, [el('i', { style: { background: '#9ECAE1' } }), C.final.chartYears[0]]),
      el('span', null, [el('i', { style: { background: '#CB181D' } }), C.final.chartYears[1]])
    ]));
    host.appendChild(box);
    function grow() { all.forEach(function (a) { a[0].style.width = Math.max(0.6, a[1] / max * 100) + '%'; }); }
    if (reduce) grow(); else requestAnimationFrame(function () { requestAnimationFrame(grow); });
    return box;
  }

  var BOARD = { A: ['#1F9D55', '#DDF3E6'], B: ['#2171B5', '#DEEBF7'], C: ['#8E44AD', '#EFE3F6'], D: ['#E4B824', '#FFF3C4'], E: ['#CB181D', '#FDE0DD'] };

  R.drag = function (t, body, p, ctx) {
    var L = t.layout, data = ctx.saved, st = ctx.state;
    data.pos = data.pos || {};
    data.locked = data.locked || [];
    var single = L === 'timeline' || L === 'photos' || L === 'rows' || L === 'order';
    var byId = {}, chips = {}, zoneEls = {}, marks = {};
    t.items.forEach(function (it) { byId[it.id] = it; });
    var spares = t.items.filter(function (it) { return it.zone === null; }).length;
    var drop = 'drop-' + t.id, sel = null, hintMsg = '';

    /* pictures and diagrams above the tray */
    if (L === 'timeline') readStripes(body, t.zones);
    if (L === 'rows') {
      var sm = el('div', { cls: 'steps-machine stage-dark' }), smc = el('canvas', { role: 'img', 'aria-label': t.alt || '' });
      sm.appendChild(smc); body.appendChild(sm);
      if (window.TDTH_GREENHOUSE) { var gh = TDTH_GREENHOUSE.mount(smc, { level: 2, numbers: true }); onLeave(gh.dispose); }
    }
    if (L === 'places') {
      var mw = el('div', { cls: 'map-wrap' }, [el('img', { cls: 'map', src: window.TDTH_EARTH || '', alt: t.mapAlt || '' })]);
      t.zones.forEach(function (z, n) {
        var x = (z.lon + 180) / 360 * 100, y = Math.max(7, Math.min(93, (90 - z.lat) / 180 * 100));
        mw.appendChild(el('button', { type: 'button', cls: 'map-pin', 'data-pin': z.id, style: { left: x + '%', top: y + '%' }, 'aria-label': z.label, text: String(n + 1),
          on: { click: function () { flash(z.id); } } }));
      });
      body.appendChild(mw);
    }

    /* tray */
    var tray = el('div', { cls: 'tray sticky', 'data-zone': '', 'data-drop': drop, 'aria-label': U.tray }, [el('p', { cls: 'tray-label', text: U.tray })]);
    var trayChips = el('div', { cls: 'tray-chips' }), trayEmpty = el('span', { cls: 'tray-empty', text: U.trayEmpty });
    tray.appendChild(trayChips);
    body.appendChild(tray);

    /* zones */
    var wrapCls = { timeline: 'zones-grid', photos: 'photo-zones', rows: 'rows', bins: 'bins', boards: 'boards', places: 'places', order: 'order-list' }[L];
    var zoneCls = { timeline: 'year', photos: 'photo', rows: 'step', bins: 'bin', boards: 'board', places: 'place', order: 'rank' }[L];
    var zwrap = el('div', { cls: wrapCls });
    t.zones.forEach(function (z, n) {
      var ze = el('div', { cls: 'zone ' + zoneCls, 'data-zone': z.id, 'data-drop': drop, role: 'group', 'aria-label': z.label });
      var zc = el('div', { cls: 'zchips' });
      if (L === 'photos') {
        ze.appendChild(el('div', { cls: 'ph' }, [el('img', { src: 'assets/photos/' + z.img + '.jpg', alt: z.label }), el('span', { cls: 'cap', text: z.label })]));
      } else if (L === 'places') {
        ze.appendChild(el('img', { cls: 'pimg', src: 'assets/photos/' + z.img + '.jpg', alt: '' }));
        ze.appendChild(el('div', null, [el('p', { cls: 'pname' }, [el('i', { text: String(n + 1) }), z.label]), el('p', { cls: 'report', text: z.report })]));
      } else {
        if (L === 'boards' && BOARD[z.id]) { ze.style.setProperty('--bc', BOARD[z.id][0]); ze.style.setProperty('--bc-soft', BOARD[z.id][1]); }
        ze.appendChild(el('span', { cls: 'zlabel', text: z.label }));
      }
      ze.appendChild(zc);
      ze.addEventListener('click', function (e) { if (sel && !e.target.closest('.chip')) move(sel, z.id); });
      zoneEls[z.id] = ze; zwrap.appendChild(ze);
    });
    tray.addEventListener('click', function (e) { if (sel && !e.target.closest('.chip')) move(sel, ''); });
    body.appendChild(zwrap);
    if (L === 'order' && t.note) body.appendChild(el('p', { cls: 'note', text: t.note }));

    /* check row */
    var checkBtn = el('button', { type: 'button', cls: 'btn', text: st.checks ? U.checkAgain : U.check, on: { click: check } });
    var hint = el('span', { cls: 'hint', 'aria-live': 'polite' });
    var showBtn = el('button', { type: 'button', cls: 'btn ghost', text: U.showMe, hidden: true, on: { click: showMe } });
    var row = el('div', { cls: 'check-row' }, [checkBtn, showBtn, hint]);
    body.appendChild(row);
    var tail = el('div', { cls: 'drag-tail' });
    body.appendChild(tail);

    /* chips */
    orderOf(t.id, t.items.map(function (it) { return it.id; })).forEach(function (id) {
      var it = byId[id];
      var c = el('div', { cls: 'chip' + (it.img ? ' has-img' : ''), role: 'button', 'aria-label': it.t, 'data-item': id, 'data-answer': GIVE ? (it.zone || 'tray') : null });
      if (it.img) c.appendChild(el('img', { src: 'assets/photos/' + it.img + '.jpg', alt: '', draggable: 'false' }));
      c.appendChild(el('span', null, it.tag ? [el('span', { cls: 'tag', text: it.tag }), it.t] : [it.t]));
      chips[id] = c;
      var wrap = el('div', { cls: 'chip-wrap' }, [c]);
      OLS_DRAG.makeDraggable(c, {
        canDrag: function () { return !st.done && data.locked.indexOf(id) < 0; },
        zoneUnder: function (x, y, ch) { return OLS_DRAG.zoneUnder(x, y, ch, '[data-drop="' + drop + '"]'); },
        onDrop: function (ch, z) { if (z) move(id, z.getAttribute('data-zone')); },
        onTap: function () { if (st.done || data.locked.indexOf(id) >= 0) return; select(sel === id ? null : id); },
        kbZones: function () { return [tray].concat(t.zones.map(function (z) { return zoneEls[z.id]; })); },
        announce: say,
        chipName: function () { return it.t; }
      });
      (data.pos[id] ? zoneEls[data.pos[id]].querySelector('.zchips') : trayChips).appendChild(wrap);
    });
    data.locked.forEach(function (id) { lock(id, true); });
    if (st.showed) tail.appendChild(el('p', { cls: 'note', text: U.showMeNote }));
    if (data.dragStars != null) complete(data.dragStars, true);
    refresh();

    function select(id) {
      if (sel) chips[sel].classList.remove('kb-pick');
      sel = id;
      if (sel) chips[sel].classList.add('kb-pick');
    }
    function flash(zid) {
      var z = zoneEls[zid];
      z.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      z.classList.add('flash'); setTimeout(function () { z.classList.remove('flash'); }, 1400);
    }
    function occupant(zid) { var f = null; t.items.forEach(function (it) { if (data.pos[it.id] === zid) f = it.id; }); return f; }
    function place(id, zid) {
      data.pos[id] = zid || '';
      (zid ? zoneEls[zid].querySelector('.zchips') : trayChips).appendChild(chips[id].parentNode);
    }
    function move(id, zid) {
      select(null);
      if (st.done || data.locked.indexOf(id) >= 0) return;
      zid = zid || '';
      if (zid && single) {
        var occ = occupant(zid);
        if (occ && occ !== id) { if (data.locked.indexOf(occ) >= 0) return; clearMark(occ); place(occ, data.pos[id] || ''); }
      }
      clearMark(id); place(id, zid);
      save(); refresh();
    }
    function clearMark(id) {
      if (!marks[id]) return;
      chips[id].classList.remove('marked-wrong'); marks[id].remove(); delete marks[id];
    }
    function markWrong(id, word) {
      clearMark(id);
      chips[id].classList.add('marked-wrong');
      marks[id] = el('span', { cls: 'mark-wrong', text: word || U.wrong });
      chips[id].appendChild(marks[id]);
    }
    function lock(id, restoring) {
      var c = chips[id];
      if (!restoring && data.locked.indexOf(id) < 0) data.locked.push(id);
      clearMark(id);
      c.classList.add('locked'); c.setAttribute('aria-disabled', 'true');
      if (L === 'order') {
        var ok = data.pos[id] === byId[id].zone;
        c.classList.toggle('marked-wrong', !ok);
        c.appendChild(el('span', { cls: ok ? 'mark-right' : 'mark-wrong', text: ok ? U.right : C.final.wrongWord }));
        return;
      }
      c.appendChild(el('span', { cls: 'mark-right', text: U.right }));
      if (byId[id].why) c.parentNode.appendChild(el('p', { cls: 'why', text: byId[id].why }));
      if (L === 'places' && data.pos[id]) { var pin = body.querySelector('[data-pin="' + data.pos[id] + '"]'); if (pin) pin.classList.add('done'); }
    }
    function allPlaced() {
      var inTray = t.items.filter(function (it) { return !data.pos[it.id]; }).length;
      var filled = t.zones.every(function (z) { return t.items.some(function (it) { return data.pos[it.id] === z.id; }); });
      return filled && inTray <= spares;
    }
    function refresh() {
      var trayCount = t.items.filter(function (it) { return !data.pos[it.id]; }).length;
      if (!trayCount) { if (!trayEmpty.parentNode) trayChips.appendChild(trayEmpty); } else if (trayEmpty.parentNode) trayEmpty.remove();
      t.zones.forEach(function (z) { zoneEls[z.id].classList.toggle('filled', !!occupant(z.id)); });
      var ready = allPlaced();
      checkBtn.disabled = st.done || !ready;
      hint.textContent = st.done ? '' : !ready ? U.fillFirst : hintMsg;
      row.hidden = !!st.done;
    }
    function isRight(it) {
      var z = data.pos[it.id] || null;
      if (z === null) return it.zone === null;
      return z === it.zone || (it.accept || []).indexOf(z) >= 0;
    }
    function check() {
      if (!allPlaced() || st.done) return;
      st.checks = (st.checks || 0) + 1;
      if (L === 'order') {
        var out = 0;
        t.items.forEach(function (it) { if (data.pos[it.id] !== it.zone) out++; lock(it.id); });
        data.out = out; save();
        complete(out <= 2 ? 3 : out <= 4 ? 2 : 1);
        return;
      }
      var bad = 0;
      t.items.forEach(function (it) {
        if (data.locked.indexOf(it.id) >= 0) return;
        if (isRight(it)) lock(it.id); else { bad++; markWrong(it.id); }
      });
      save();
      if (!bad) { complete(st.showed ? 1 : starsFor(st.checks)); return; }
      hintMsg = U.tryAgainMove;
      checkBtn.textContent = U.checkAgain;
      if (st.checks >= 2) showBtn.hidden = false;
      say(U.tryAgainMove);
      refresh();
    }
    function showMe() {
      st.showed = true;
      t.items.forEach(function (it) {
        if (data.locked.indexOf(it.id) >= 0) return;
        clearMark(it.id);
        var z = it.zone || '';
        if (z && single) { var occ = occupant(z); if (occ && occ !== it.id) place(occ, ''); }
        place(it.id, z);
      });
      t.items.forEach(function (it) { if (data.locked.indexOf(it.id) < 0) lock(it.id); });
      tail.appendChild(el('p', { cls: 'note', text: U.showMeNote }));
      save();
      complete(1);
    }
    function complete(n, restoring) {
      data.dragStars = n;
      showBtn.hidden = true;
      if (L === 'order') {
        tail.appendChild(el('p', { cls: 'note', text: t.closeEnough }));
        bars(tail, t.items.slice().sort(function (a, b) { return b.y2017 - a.y2017; }), t.barValue);
      }
      if (t.after) tail.appendChild(el('p', { cls: 'after', text: t.after }));
      if (!restoring) { save(); say(U.right + '. ' + (t.after || '')); }
      refresh();
      if (t.qs) {
        var qbox = el('div', { cls: 'after-qs' });
        tail.appendChild(qbox);
        var all = qsGroup(qbox, t.qs, t.id, data, function (qn) { ctx.done(Math.min(n, qn)); });
        if (all) ctx.done(Math.min(n, qStars(t.qs, data)));
      } else ctx.done(n);
    }
  };

  /* Two choices per row, then Check. */
  R.binary = function (t, body, p, ctx) {
    var data = ctx.saved, st = ctx.state;
    data.pick = data.pick || {}; data.locked = data.locked || [];
    var rows = {}, byId = {}, hintMsg = '';
    t.items.forEach(function (it) { byId[it.id] = it; });
    var list = el('div', { cls: 'bin-list' });
    orderOf(t.id, t.items.map(function (it) { return it.id; })).forEach(function (id) {
      var it = byId[id], txt = el('div', { cls: 'bin-txt' }, [el('span', { text: it.t })]);
      var seg = el('div', { cls: 'seg', role: 'group', 'aria-label': it.t });
      var bs = t.choices.map(function (c, ci) {
        var b = el('button', { type: 'button', 'aria-pressed': 'false', text: c, 'data-answer': GIVE && ci === it.ok ? '1' : null, on: { click: function () { choose(id, ci); } } });
        seg.appendChild(b); return b;
      });
      var row = el('div', { cls: 'bin-row' }, [txt, seg]);
      rows[id] = { row: row, txt: txt, seg: seg, bs: bs, mark: null };
      list.appendChild(row);
    });
    body.appendChild(list);
    var checkBtn = el('button', { type: 'button', cls: 'btn', text: st.checks ? U.checkAgain : U.check, on: { click: check } });
    var showBtn = el('button', { type: 'button', cls: 'btn ghost', text: U.showMe, hidden: true, on: { click: showMe } });
    var hint = el('span', { cls: 'hint', 'aria-live': 'polite' });
    var crow = el('div', { cls: 'check-row' }, [checkBtn, showBtn, hint]);
    body.appendChild(crow);
    var tail = el('div');
    body.appendChild(tail);
    Object.keys(data.pick).forEach(function (id) { paint(id); });
    data.locked.forEach(function (id) { lock(id, true); });
    if (st.showed) tail.appendChild(el('p', { cls: 'note', text: U.showMeNote }));
    refresh();

    function paint(id) { rows[id].bs.forEach(function (b, ci) { b.setAttribute('aria-pressed', String(data.pick[id] === ci)); }); }
    function unmark(id) { var r = rows[id]; r.seg.classList.remove('is-wrong'); if (r.mark) { r.mark.remove(); r.mark = null; } }
    function choose(id, ci) {
      if (st.done || data.locked.indexOf(id) >= 0) return;
      data.pick[id] = ci; unmark(id); paint(id); save(); refresh();
    }
    function lock(id, restoring) {
      var r = rows[id];
      if (!restoring && data.locked.indexOf(id) < 0) data.locked.push(id);
      unmark(id);
      r.seg.classList.add('is-right');
      r.bs.forEach(function (b) { b.disabled = true; });
      r.txt.appendChild(el('span', { cls: 'mark-right', text: U.right }));
      r.row.appendChild(el('p', { cls: 'why', text: byId[id].why }));
    }
    function ready() { return t.items.every(function (it) { return data.pick[it.id] != null; }); }
    function refresh() {
      var ok = ready();
      checkBtn.disabled = st.done || !ok;
      hint.textContent = st.done ? '' : !ok ? U.rowsFirst : hintMsg;
      crow.hidden = !!st.done;
    }
    function check() {
      if (!ready() || st.done) return;
      st.checks = (st.checks || 0) + 1;
      var bad = 0;
      t.items.forEach(function (it) {
        if (data.locked.indexOf(it.id) >= 0) return;
        if (data.pick[it.id] === it.ok) lock(it.id);
        else { bad++; var r = rows[it.id]; unmark(it.id); r.seg.classList.add('is-wrong'); r.mark = el('span', { cls: 'mark-wrong', text: U.wrong }); r.txt.appendChild(r.mark); }
      });
      save();
      if (!bad) { st.done || finish(st.showed ? 1 : starsFor(st.checks)); return; }
      hintMsg = U.tryAgainChange; checkBtn.textContent = U.checkAgain;
      if (st.checks >= 2) showBtn.hidden = false;
      say(U.tryAgainChange); refresh();
    }
    function showMe() {
      st.showed = true;
      t.items.forEach(function (it) { if (data.locked.indexOf(it.id) < 0) { data.pick[it.id] = it.ok; paint(it.id); lock(it.id); } });
      tail.appendChild(el('p', { cls: 'note', text: U.showMeNote }));
      save(); finish(1);
    }
    function finish(n) { showBtn.hidden = true; ctx.done(n); refresh(); }
  };

  /* Choose every right one, then Check. */
  R.multi = function (t, body, p, ctx) {
    var data = ctx.saved, st = ctx.state;
    data.sel = data.sel || []; data.locked = data.locked || [];
    var btns = {}, marks = {};
    var grid = el('div', { cls: 'multi', role: 'group', 'aria-label': t.do });
    orderOf(t.id, t.opts.map(function (_, i) { return i; })).forEach(function (i) {
      var op = t.opts[i];
      var b = el('button', { type: 'button', 'aria-pressed': 'false', 'data-answer': GIVE && op.ok ? '1' : null },
        [el('span', { cls: 'box', 'aria-hidden': 'true' }), el('span', { text: op.t })]);
      b.addEventListener('click', function () { toggle(i); });
      btns[i] = b; grid.appendChild(b);
    });
    body.appendChild(grid);
    var checkBtn = el('button', { type: 'button', cls: 'btn', text: st.checks ? U.checkAgain : U.check, on: { click: check } });
    var showBtn = el('button', { type: 'button', cls: 'btn ghost', text: U.showMe, hidden: true, on: { click: showMe } });
    var hint = el('span', { cls: 'hint', 'aria-live': 'polite' });
    var crow = el('div', { cls: 'check-row' }, [checkBtn, showBtn, hint]);
    body.appendChild(crow);
    var tail = el('div');
    body.appendChild(tail);
    var hintMsg = '';
    paint();
    data.locked.forEach(function (i) { lock(i, true); });
    if (st.showed) tail.appendChild(el('p', { cls: 'note', text: U.showMeNote }));
    refresh();

    function paint() { Object.keys(btns).forEach(function (i) { btns[i].setAttribute('aria-pressed', String(data.sel.indexOf(+i) >= 0)); }); }
    function unmark(i) { btns[i].classList.remove('is-wrong'); if (marks[i]) { marks[i].remove(); delete marks[i]; } }
    function toggle(i) {
      if (st.done || data.locked.indexOf(i) >= 0) return;
      var k = data.sel.indexOf(i);
      if (k >= 0) data.sel.splice(k, 1); else data.sel.push(i);
      unmark(i); paint(); save(); refresh();
    }
    function lock(i, restoring) {
      if (!restoring && data.locked.indexOf(i) < 0) data.locked.push(i);
      var b = btns[i];
      b.classList.add('is-right'); b.disabled = true;
      b.appendChild(el('span', { cls: 'mark-right', text: U.right }));
      b.appendChild(el('span', { cls: 'why', text: t.opts[i].why }));
    }
    function refresh() {
      var ok = data.sel.length > 0;
      checkBtn.disabled = st.done || !ok;
      hint.textContent = st.done ? '' : !ok ? U.tickFirst : hintMsg;
      crow.hidden = !!st.done;
    }
    function check() {
      if (!data.sel.length || st.done) return;
      st.checks = (st.checks || 0) + 1;
      var bad = 0, missing = 0;
      data.sel.forEach(function (i) {
        if (data.locked.indexOf(i) >= 0) return;
        if (t.opts[i].ok) lock(i);
        else { bad++; unmark(i); btns[i].classList.add('is-wrong'); marks[i] = el('span', { cls: 'mark-wrong', text: U.wrong }); btns[i].appendChild(marks[i]); }
      });
      t.opts.forEach(function (op, i) { if (op.ok && data.sel.indexOf(i) < 0) missing++; });
      save();
      if (!bad && !missing) { finish(st.showed ? 1 : starsFor(st.checks)); return; }
      hintMsg = [bad ? U.tryAgainUntick : '', missing ? U.moreToFind : ''].filter(Boolean).join(' ');
      checkBtn.textContent = U.checkAgain;
      if (st.checks >= 2) showBtn.hidden = false;
      say(hintMsg); refresh();
    }
    function showMe() {
      st.showed = true;
      data.sel = [];
      t.opts.forEach(function (op, i) { unmark(i); if (op.ok) { data.sel.push(i); if (data.locked.indexOf(i) < 0) lock(i); } });
      paint();
      tail.appendChild(el('p', { cls: 'note', text: U.showMeNote }));
      save(); finish(1);
    }
    function finish(n) { showBtn.hidden = true; ctx.done(n); refresh(); }
  };

  /* ---------- credits ---------- */
  function credits() {
    var dlg = document.getElementById('credits'), open = document.getElementById('credits-open');
    open.textContent = U.credits;
    document.getElementById('credits-title').textContent = U.credits;
    var closeBtn = document.getElementById('credits-close');
    closeBtn.textContent = U.close;
    var ul = dlg.querySelector('ul');
    (window.TDTH_CREDITS || []).forEach(function (c) { ul.appendChild(el('li', { text: c.shows + ': ' + c.author + ', ' + c.licence + '. ' + c.url })); });
    (C.creditsExtra || []).forEach(function (s) { ul.appendChild(el('li', { text: s })); });
    open.addEventListener('click', function () { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } });
    closeBtn.addEventListener('click', function () { try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); } });
  }

  function restart() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  }

  var APP = window.TDTH_APP = {
    C: C, U: U, S: S, KEY: KEY, GIVE: GIVE, reduce: reduce, TEMPS: TEMPS, r: R, views: {},
    fmt: fmt, el: el, save: save, say: say, show: show, onLeave: onLeave, T: T, orderOf: orderOf, shuffle: shuffle,
    mcqBlock: mcqBlock, qsGroup: qsGroup, qStars: qStars, starsFor: starsFor, starText: starText, starsLine: starsLine,
    bars: bars, liveStripes: liveStripes, readStripes: readStripes, isOpen: isOpen, refreshBar: refreshBar,
    drawRibbon: drawRibbon, partStars: partStars, restart: restart, hexRgba: hexRgba,
    ON: ON, TEXT: TEXT, INK: INK, BOARD: BOARD
  };

  document.addEventListener('DOMContentLoaded', function () {
    buildBar(); credits(); headH();
    /* the header grows when its lines wrap or the fonts arrive; the sticky tray sits under it */
    if (window.ResizeObserver && topEl) new ResizeObserver(headH).observe(topEl);
    var rt = null;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { headH(); drawRibbon(); }, 120); });
    show(isOpen(S.view) ? S.view : 0, { keepScroll: false });
  });
})();
