/* Turn Down the Heat — the special screens: the start page, the globe, the greenhouse machine,
   the footprint and swaps, running the world to 2100, the poster, the final check and the end page.
   Loads after app.js and adds to window.TDTH_APP. Every string comes from content.js. */
(function () {
  var APP = window.TDTH_APP;
  if (!APP) return;
  var C = APP.C, U = APP.U, S = APP.S, el = APP.el, fmt = APP.fmt, R = APP.r, reduce = APP.reduce, TEMPS = APP.TEMPS;
  var ST = window.TDTH_STRIPES, M = window.TDTH_MODEL, E3 = window.TDTH_EARTH3D;
  var ON = APP.ON, INK = APP.INK, BOARD = APP.BOARD;
  var BASE = TEMPS.values.length, END = M ? M.END : 2100, ALL = END - TEMPS.start + 1;

  function one(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function taskById(id) { var f = null; C.parts.forEach(function (p) { p.tasks.forEach(function (t) { if (t.id === id) f = t; }); }); return f; }
  /* A task that is already complete when it is drawn finishes after the page has been built, never during it. */
  function later(fn) { setTimeout(fn, 0); }
  /* White or ink text, whichever reads better on this colour. */
  function textOn(hex) {
    var n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return (1.05) / (L + 0.05) >= (L + 0.05) / (0.0137 + 0.05) ? '#fff' : INK;
  }

  APP.ribbonValues = function () { return S.run && S.run.last ? TEMPS.values.concat(S.run.last) : null; };

  /* ---------- start page: the stripes paint 1850 to 2025, the year counts up, the warming globe fades in ---------- */
  APP.views.hero = function (sec) {
    var I = C.intro, vals = TEMPS.values;
    var cv = el('canvas', { cls: 'hero-stripes', 'aria-hidden': 'true' });
    var gbox = el('div', { cls: 'globe-box' });
    var gwrap = el('div', { cls: 'hero-globe', 'aria-hidden': 'true', style: { opacity: '0' } }, [gbox]);
    var yearEl = el('p', { cls: 'year', 'aria-hidden': 'true', text: String(TEMPS.start) });
    var anomEl = el('p', { cls: 'anom', 'aria-hidden': 'true' });
    var cut = C.title.lastIndexOf(' the ');
    var title = el('h2', { cls: 'title' }, [C.title.slice(0, cut + 1), el('b', { text: C.title.slice(cut + 1) })]);
    var started = Object.keys(S.tasks).length > 0 || Object.keys(S.quick).length > 0;
    var target = 1;
    if (started) { target = 8; for (var k = 1; k <= 7; k++) if (APP.isOpen(k) && !S.done[k]) { target = k; break; } }
    function goBtn() { return el('button', { type: 'button', cls: 'btn big', text: started ? I.goBack : I.go, on: { click: function () { APP.show(target); } } }); }
    sec.appendChild(el('div', { cls: 'hero' }, [cv, gwrap, el('div', { cls: 'shade' }),
      el('div', { cls: 'readout' }, [yearEl, anomEl]),
      el('div', { cls: 'hero-foot' }, [el('p', { cls: 'kicker', text: I.kicker }), title, el('div', { cls: 'go-row' }, [goBtn()])])]));

    var globe = null;
    try { globe = E3 ? E3.mount(gbox, { overlay: true, opacity: 0, autoRotate: true, stars: false, alt: U.globeAlt }) : null; } catch (e) { globe = null; }
    if (globe && globe.flat) { globe.dispose(); globe = null; }
    if (!globe) gwrap.remove();

    function onYear(i) {
      var y = TEMPS.start + i, t = vals[i];
      yearEl.textContent = String(y);
      anomEl.textContent = fmt(t >= 0 ? I.anomWarm : I.anomCool, { t: one(Math.abs(t)) });
      if (globe) {
        var f = Math.max(0, Math.min(1, (y - 1950) / 75));
        gwrap.style.opacity = String(Math.min(1, f * 2.5));
        globe.setOpacity(0.85 * f);
      }
    }
    var cancel = ST.paint(cv, vals, reduce ? 0 : 6500, onYear);
    var keep = setTimeout(function () { APP.liveStripes(cv, vals); }, reduce ? 0 : 6600);
    if (window.gsap && !reduce) gsap.from(title, { y: 50, opacity: 0, duration: 1.1, delay: 0.4, ease: 'power3.out' });
    APP.onLeave(function () { cancel(); clearTimeout(keep); if (globe) globe.dispose(); if (window.gsap) gsap.killTweensOf(title); });

    var card = el('div', { cls: 'intro-card' });
    card.appendChild(el('p', { cls: 'fact', text: I.fact }));
    card.appendChild(el('p', { text: I.plan }));
    card.appendChild(el('p', { cls: 'paint', text: I.paint }));
    card.appendChild(el('div', { cls: 'mini-parts' }, C.parts.map(function (p) {
      return el('span', { style: { background: p.colour, color: ON[p.k] || '#fff' }, text: (S.done[p.k] ? '✓ ' : '') + p.k + '. ' + p.name });
    })));
    card.appendChild(el('p', { cls: 'paint', text: I.time }));
    card.appendChild(el('div', { cls: 'go-row' }, [goBtn()]));
    sec.appendChild(card);
  };

  /* ---------- Part 1: the warming globe ---------- */
  var GLOBE_KEY = ['#4292C6', '#F7F7F7', '#FB6A4A', '#A50F15'];
  R.globe = function (t, body, p, ctx) {
    var box = el('div', { cls: 'globe-box' });
    var hint = el('p', { cls: 'spin-hint', text: U.spin });
    var range = el('input', { type: 'range', min: '0', max: '100', value: '85', id: 'layer-' + t.id });
    var stage = el('div', { cls: 'stage-dark' }, [box, hint,
      el('div', { cls: 'slider-row' }, [el('label', { for: range.id, text: U.layer }), range]),
      el('ul', { cls: 'legend' }, t.legend.map(function (s, i) { return el('li', null, [el('i', { style: { background: GLOBE_KEY[i] } }), s]); }))]);
    var col = el('div', { cls: 'globe-qs' });
    body.appendChild(el('div', { cls: 'globe-row' }, [stage, col]));
    var g = null;
    try { g = E3.mount(box, { overlay: true, opacity: 0.85, alt: t.alt, flatNote: U.noWebgl, autoRotate: true, onSpin: function () { hint.hidden = true; } }); } catch (e) { g = null; }
    if (!g || g.flat) hint.hidden = true;
    range.addEventListener('input', function () { if (g) g.setOpacity(range.value / 100); });
    APP.onLeave(function () { if (g) g.dispose(); });
    var all = APP.qsGroup(col, t.qs, t.id, ctx.saved, function (n) { ctx.done(n); });
    if (all && !ctx.state.done) later(function () { ctx.done(APP.qStars(t.qs, ctx.saved)); });
  };

  /* ---------- Part 2: the greenhouse machine ---------- */
  R.machine = function (t, body, p, ctx) {
    var data = ctx.saved; data.seen = data.seen || [];
    var level = data.level == null ? 0 : data.level, qid = 'mq-' + t.id;
    var cv = el('canvas', { role: 'img' });
    var range = el('input', { type: 'range', min: '0', max: String(t.stops.length - 1), step: '1', value: String(level), 'aria-labelledby': qid });
    var stops = el('div', { cls: 'stops', role: 'group', 'aria-labelledby': qid });
    var line = el('p', { cls: 'stop-line', 'aria-live': 'polite' });
    var visited = el('p', { cls: 'visited' });
    var btns = t.stops.map(function (s, i) {
      var b = el('button', { type: 'button', 'aria-pressed': 'false', text: s.label, on: { click: function () { set(i); } } });
      stops.appendChild(b); return b;
    });
    body.appendChild(el('div', { cls: 'machine stage-dark' }, [el('p', { cls: 'slider-q', id: qid, text: t.slider }), cv, el('div', { cls: 'slider-row' }, [range]), stops, line]));
    body.appendChild(visited);
    var chips = ['#FFE27A', '#FF5A3C', 'radial-gradient(circle, #1B2433 34%, #E04A3A 36%)'];
    body.appendChild(el('ul', { cls: 'legend' }, t.legend.map(function (s, i) { return el('li', null, [el('i', { style: { background: chips[i] } }), s]); })));
    var gh = window.TDTH_GREENHOUSE.mount(cv, { level: level, temps: t.stops.map(function (s) { return s.temp; }) });
    APP.onLeave(function () { gh.dispose(); });
    range.addEventListener('input', function () { set(+range.value); });
    function set(i, first) {
      level = i; data.level = i; range.value = String(i);
      range.setAttribute('aria-valuetext', t.stops[i].label);
      if (data.seen.indexOf(i) < 0) data.seen.push(i);
      btns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); b.classList.toggle('seen', data.seen.indexOf(j) >= 0); });
      line.textContent = t.stops[i].line;
      cv.setAttribute('aria-label', t.stops[i].line);
      gh.setLevel(i);
      visited.textContent = fmt(t.visited, { n: data.seen.length });
      ctx.store();
      if (data.seen.length >= t.stops.length && !ctx.state.done) { if (first) later(function () { ctx.done(null); }); else ctx.done(null); }
    }
    set(level, true);
  };

  /* ---------- Part 5: the footprint stack ---------- */
  var CAT = { heat: '#CB181D', power: '#FB6A4A', school: '#FC9272', car: '#EF3B2C', fly: '#A50F15', food: '#67000D', stuff: '#FCBBA1', waste: '#FEE0D2' };
  var STACK_MAX = 14;
  function sumOf(ft, A) { return ft.qs.reduce(function (s, q) { return s + (A[q.id] == null ? 0 : q.opts[A[q.id]][1]); }, ft.shared.t); }
  function buildStack(host, ft) {
    var stack = el('div', { cls: 'stack', role: 'img' });
    [0, 5, 10].forEach(function (v) { stack.appendChild(el('span', { cls: 'axis', 'aria-hidden': 'true', style: { bottom: (v / STACK_MAX * 100) + '%' }, text: String(v) })); });
    stack.appendChild(el('div', { cls: 'uk-line', 'aria-hidden': 'true', style: { bottom: (ft.ukAverage / STACK_MAX * 100) + '%' } }, [el('span', { text: fmt(ft.ukShort, { uk: ft.ukAverage }) })]));
    stack.appendChild(el('div', { cls: 'blk shared', style: { height: (ft.shared.t / STACK_MAX * 100) + '%', background: '#6BAED6', color: INK }, text: ft.shared.label }));
    var blks = {};
    ft.qs.forEach(function (q) {
      var c = CAT[q.id] || '#FB6A4A';
      blks[q.id] = el('div', { cls: 'blk', style: { height: '0%', background: c, color: textOn(c) } });
      stack.appendChild(blks[q.id]);
    });
    var total = el('p', { cls: 'stack-total', 'aria-live': 'polite' });
    var box = el('div', { cls: 'stack-box' }, [stack, total, el('p', { cls: 'stack-sub', text: fmt(ft.ukLine, { uk: ft.ukAverage }) })]);
    host.appendChild(box);
    return {
      set: function (A) {
        ft.qs.forEach(function (q) {
          var v = A[q.id] == null ? 0 : q.opts[A[q.id]][1], b = blks[q.id];
          b.style.height = (v / STACK_MAX * 100) + '%';
          b.style.marginTop = v ? '' : '0';
          b.textContent = v >= 0.6 ? q.cat : '';
        });
        var sum = sumOf(ft, A);
        total.textContent = fmt(ft.total, { t: one(sum) });
        stack.setAttribute('aria-label', total.textContent);
        return sum;
      }
    };
  }

  var footSubs = [];
  R.footprint = function (t, body, p, ctx) {
    S.foot = S.foot || { a: {}, swaps: [] };
    var A = S.foot.a, list = el('div', { cls: 'fq-list' }), grid = el('div', { cls: 'foot-grid' }, [list]);
    body.appendChild(grid);
    var stack = buildStack(grid, t);
    t.qs.forEach(function (q) {
      var qid = 'fq-' + q.id, pills = el('div', { cls: 'pills', role: 'group', 'aria-labelledby': qid });
      var bs = q.opts.map(function (o, i) {
        var b = el('button', { type: 'button', 'aria-pressed': A[q.id] === i ? 'true' : 'false', text: o[0], on: { click: function () {
          A[q.id] = i;
          bs.forEach(function (x, j) { x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
          changed();
        } } });
        pills.appendChild(b); return b;
      });
      list.appendChild(el('div', { cls: 'fq' }, [el('p', { cls: 'q', id: qid, text: q.q }), pills]));
    });
    body.appendChild(el('p', { cls: 'care', text: t.care }));
    stack.set(A);
    function full() { return t.qs.every(function (q) { return A[q.id] != null; }); }
    function changed() {
      APP.save(); stack.set(A);
      footSubs.forEach(function (f) { f(); });
      if (full()) ctx.done(null);
    }
    if (full() && !ctx.state.done) later(function () { ctx.done(null); });
    APP.onLeave(function () { footSubs = []; });
  };

  R.swaps = function (t, body, p, ctx) {
    var ft = taskById('p5-footprint'), byId = {};
    S.foot = S.foot || { a: {}, swaps: [] };
    t.swaps.forEach(function (sw) { byId[sw.id] = sw; });
    var list = el('div', { cls: 'swaps', role: 'group', 'aria-label': t.title }), grid = el('div', { cls: 'foot-grid' }, [list]);
    body.appendChild(grid);
    var stack = buildStack(grid, ft);
    var result = el('p', { cls: 'swap-result', 'aria-live': 'polite' });
    body.appendChild(result);
    function qOf(id) { return ft.qs.filter(function (q) { return q.id === id; })[0]; }
    /* The answer this swap moves her to, or null when she already does it. */
    function target(sw, A) {
      var q = qOf(sw.q), cur = A[sw.q];
      if (!q || cur == null) return null;
      var now = q.opts[cur][1];
      if (sw.to != null) return q.opts[sw.to][1] < now ? sw.to : null;
      var floor = sw.lowest != null ? q.opts[sw.lowest][1] : -1, best = null;
      q.opts.forEach(function (o, i) { if (o[1] < now && o[1] >= floor && (best == null || o[1] > q.opts[best][1])) best = i; });
      return best;
    }
    var btns = {};
    function build() {
      list.textContent = ''; btns = {};
      var A = S.foot.a;
      APP.orderOf(t.id, t.swaps.map(function (sw) { return sw.id; })).forEach(function (id) {
        var sw = byId[id], none = target(sw, A) == null;
        var b = el('button', { type: 'button', 'aria-pressed': 'false', disabled: none }, [el('span', { text: sw.t }), none ? el('small', { text: t.already }) : null]);
        b.addEventListener('click', function () {
          var picks = S.foot.swaps, at = picks.indexOf(id);
          if (at >= 0) picks.splice(at, 1); else picks.push(id);
          APP.save(); refresh(false);
        });
        btns[id] = { b: b, none: none };
        list.appendChild(b);
      });
      refresh(true);
    }
    function refresh(first) {
      var A = S.foot.a, after = Object.assign({}, A);
      var avail = t.swaps.filter(function (sw) { return !btns[sw.id].none; });
      var picks = S.foot.swaps = S.foot.swaps.filter(function (id) { return btns[id] && !btns[id].none; });
      var need = Math.min(3, avail.length);
      picks.forEach(function (id) { after[byId[id].q] = target(byId[id], A); });
      Object.keys(btns).forEach(function (id) {
        var on = picks.indexOf(id) >= 0, x = btns[id];
        x.b.setAttribute('aria-pressed', on ? 'true' : 'false');
        x.b.disabled = x.none || (!on && picks.length >= need);
      });
      var before = sumOf(ft, A), now = stack.set(after);
      var full = need === 0 || picks.length >= need;
      result.textContent = need && full ? fmt(t.result, { a: one(before), b: one(now) }) : '';
      if (full && !ctx.state.done) { if (first) later(function () { ctx.done(null); }); else ctx.done(null); }
    }
    build();
    footSubs.push(build);
  };

  /* ---------- Part 6: run the world to 2100 ---------- */
  var ROUND_END = [2030, 2040, 2050];
  var VERDICT_COLOUR = ['#1F9D55', '#2171B5', '#D9480F', '#A50F15'];
  function uptoOf(year) { return year - TEMPS.start + 1; }
  function seriesOf(res, upto) { return TEMPS.values.concat(res.years.map(function (y) { return y.shown; }).slice(0, upto - BASE)); }

  R.run = function (t, body, p, ctx) {
    var RS = S.run = S.run || { picks: [[], [], []], round: 0, phase: 'pick', best: null, last: null, lastT: null, lastPicks: null };
    var base = M.carryOn(), zones = {};
    (taskById('p6-sort').zones || []).forEach(function (z) { zones[z.id] = z.label; });
    function world(r) { return M.runWorld(RS.picks.map(function (pk, j) { return j <= r ? pk : []; }), 7); }

    var root = el('div', { id: 'run' });
    var cv = el('canvas', { role: 'img', 'aria-label': t.stripesLabel });
    var nowB = el('b'), now = el('span', { cls: 'now', 'aria-hidden': 'true' }, [nowB]);
    var stripes = el('div', { cls: 'run-stripes' }, [cv, now, el('div', { cls: 'yrs', 'aria-hidden': 'true' }, [1850, 1900, 1950, 2000, 2050, 2100].map(function (y) { return el('span', { text: String(y) }); }))]);
    var fVal = el('div', { cls: 'val' });
    var dF = el('div', { cls: 'dial', id: 'forecast' }, [el('div', { cls: 'lab', text: t.forecastLab }), fVal, el('div', { cls: 'sub', text: fmt(t.carryOn, { t: one(base.t2100) }) })]);
    var feelVal = el('div', { cls: 'val' }), meterI = el('i');
    var dFeel = el('div', { cls: 'dial', id: 'feel' }, [el('div', { cls: 'lab', text: t.feelLab }), feelVal, el('div', { cls: 'meter', 'aria-hidden': 'true' }, [meterI])]);
    var protVal = el('div', { cls: 'val' });
    var dP = el('div', { cls: 'dial', id: 'protect' }, [el('div', { cls: 'lab', text: t.protectLab }), protVal]);
    var dialsLive = el('p', { cls: 'sr', 'aria-live': 'polite' });
    root.appendChild(el('div', { cls: 'run-top' }, [stripes, el('div', { cls: 'dials' }, [dF, dFeel, dP]), dialsLive]));
    var panel = el('div', { cls: 'run-body' });
    root.appendChild(panel);
    body.appendChild(root);

    var live = APP.liveStripes(cv, TEMPS.values, ALL, BASE), cancelPaint = function () {}, shownT = base.t2100, tw = null;
    APP.onLeave(function () { cancelPaint(); if (tw) tw.kill(); });

    function marker(upto) {
      now.style.left = 'calc(' + (upto / ALL * 100) + '% - 1.5px)';
      nowB.textContent = fmt(t.yearNow, { y: TEMPS.start + upto - 1 });
    }
    function dials(t2100, support, protect, animate) {
      var col = ST.colour(t2100);
      dF.style.boxShadow = 'inset 0 -6px 0 ' + col;
      feelVal.textContent = fmt(t.outOf, { n: support });
      meterI.style.width = (support * 10) + '%';
      protVal.textContent = t.protectLevels[protect];
      if (tw) tw.kill();
      if (animate && window.gsap && !reduce) {
        var o = { v: shownT };
        tw = gsap.to(o, { v: t2100, duration: 1.4, ease: 'power2.out', onUpdate: function () { fVal.textContent = fmt(t.degrees, { t: one(o.v) }); } });
      } else fVal.textContent = fmt(t.degrees, { t: one(t2100) });
      shownT = t2100;
      dialsLive.textContent = fmt(t.forecast, { t: one(t2100) }) + '. ' + fmt(t.feel, { n: support }) + '. ' + fmt(t.protect, { p: t.protectLevels[protect] }) + '.';
    }
    function stripesTo(res, from, to, ms, then) {
      cancelPaint();
      var vals = res ? seriesOf(res, to) : TEMPS.values;
      if (!ms || reduce) { live.set(vals, ALL, to); marker(to); if (then) then(); return; }
      cancelPaint = ST.paint(cv, vals, ms, function (i) { marker(i + 1); }, ALL, from);
      setTimeout(function () { live.set(vals, ALL, to); marker(to); if (then) then(); }, ms + 60);
    }
    /* A card counts as played in the first round where it was chosen and not cancelled. */
    function playedIn(id, res, before) {
      for (var r = 0; r < before; r++) if (RS.picks[r].indexOf(id) >= 0 && !(res && res.events[r].cancelled === id)) return r;
      return -1;
    }

    function pickView() {
      var r = RS.round, prev = r > 0 ? world(r - 1) : null;
      panel.appendChild(el('p', { 'data-round': String(r + 1), text: t.rounds[r] }));
      if (r > 0) panel.appendChild(el('p', { cls: 'later', text: t.later }));
      var hint = el('span', { cls: 'hint', 'aria-live': 'polite' });
      var cards = {}, mine = RS.picks[r];
      var deck = el('div', { cls: 'deck' });
      ['A', 'B', 'C', 'D', 'E'].forEach(function (g) {
        var ids = Object.keys(M.DECK).filter(function (id) { return M.DECK[id].g === g; });
        var hid = 'deck-' + g, wrap = el('div', { cls: 'deck-cards', role: 'group', 'aria-labelledby': hid });
        APP.orderOf('run:' + g, ids).forEach(function (id) {
          var was = playedIn(id, prev, r);
          var b = el('button', { type: 'button', cls: 'card-btn', 'data-g': g, 'aria-pressed': mine.indexOf(id) >= 0 ? 'true' : 'false', disabled: was >= 0 },
            [el('span', { text: t.deck[id][0] }), was >= 0 ? el('small', { text: fmt(t.played, { r: was + 1 }) }) : null]);
          b.addEventListener('click', function () {
            var at = mine.indexOf(id);
            if (at >= 0) mine.splice(at, 1); else if (mine.length < 3) mine.push(id);
            APP.save(); refresh();
          });
          cards[id] = { b: b, was: was };
          wrap.appendChild(b);
        });
        deck.appendChild(el('div', { cls: 'deck-group', style: { '--g': BOARD[g][0] } }, [el('h4', { id: hid, text: zones[g] || g }), wrap]));
      });
      panel.appendChild(deck);
      var lockBtn = el('button', { type: 'button', cls: 'btn big', text: fmt(t.lock, { r: r + 1 }), on: { click: lock } });
      panel.appendChild(el('div', { cls: 'lock-row' }, [lockBtn, hint]));
      function refresh() {
        Object.keys(cards).forEach(function (id) {
          var c = cards[id], on = mine.indexOf(id) >= 0;
          c.b.setAttribute('aria-pressed', on ? 'true' : 'false');
          c.b.disabled = c.was >= 0 || (!on && mine.length >= 3);
        });
        hint.textContent = fmt(t.pickHint, { n: mine.length });
      }
      refresh();
    }

    function lock() {
      var r = RS.round, res = world(r);
      RS.phase = 'events'; APP.save();
      panel.textContent = '';
      eventsView(res, true);
      stripesTo(res, r === 0 ? BASE : uptoOf(ROUND_END[r - 1]), uptoOf(ROUND_END[r]), 1800);
      dials(res.t2100, res.support, res.protect, true);
      APP.say(fmt(t.roundDone, { r: r + 1 }));
    }

    function eventsView(res, fresh) {
      var r = RS.round, ev = res.events[r], ul = el('ul');
      if (!ev.feelings.length && !ev.cancelled) ul.appendChild(el('li', { text: t.noPicks }));
      ev.feelings.forEach(function (f) {
        ul.appendChild(el('li', null, [el('b', { text: t.deck[f[0]][0] }), ' ', el('span', { text: t.deck[f[0]][1] }), ' ',
          el('span', { cls: 'feel-' + f[1], text: t.feelings[String(f[1])] })]));
      });
      var box = el('div', { cls: 'events' }, [el('h4', { text: fmt(t.roundDone, { r: r + 1 }) }), ul]);
      if (ev.cancelled) box.appendChild(el('p', { cls: 'protest', text: fmt(t.protest, { c: t.deck[ev.cancelled][0] }) }));
      if (ev.feelings.some(function (f) { return M.DECK[f[0]].risk; })) box.appendChild(el('p', { cls: 'risk', text: t.risk }));
      panel.appendChild(box);
      var go = r < 2
        ? el('button', { type: 'button', cls: 'btn big', text: fmt(t.nextRound, { r: r + 2 }), on: { click: function () { RS.round = r + 1; RS.phase = 'pick'; APP.save(); draw(); } } })
        : el('button', { type: 'button', cls: 'btn big', text: t.seeResult, on: { click: function () { RS.phase = 'result'; APP.save(); draw(true); } } });
      panel.appendChild(el('div', { cls: 'lock-row' }, [go]));
      if (fresh && window.gsap && !reduce) gsap.from(ul.children, { x: -30, opacity: 0, duration: 0.45, stagger: 0.25, delay: 0.5 });
    }

    function resultView(res, fresh) {
      if (fresh) {
        RS.last = res.years.map(function (y) { return Math.round(y.shown * 1000) / 1000; });
        RS.lastT = res.t2100;
        RS.lastPicks = res.played.map(function (x) { return x[0]; });
        RS.best = RS.best == null ? res.t2100 : Math.min(RS.best, res.t2100);
        APP.save(); APP.drawRibbon();
      }
      var bands = t.verdicts, v = M.verdict(res.t2100, bands), vi = bands.indexOf(v);
      panel.appendChild(el('h3', { cls: 'result-title', text: t.resultTitle }));
      panel.appendChild(el('p', { cls: 'verdict', style: { '--vc': VERDICT_COLOUR[vi] || '#A50F15' }, text: v.t }));
      panel.appendChild(el('p', { cls: 'result-line', text: fmt(t.forecast, { t: one(res.t2100) }) }));
      if (res.risk) panel.appendChild(el('p', { cls: 'risk', text: t.risk }));
      panel.appendChild(el('p', { cls: 'result-line', text: fmt(t.protect, { p: t.protectLevels[res.protect] }) }));
      if (RS.best != null) panel.appendChild(el('p', { cls: 'result-line', text: fmt(t.best, { t: one(RS.best) }) }));
      panel.appendChild(el('div', { cls: 'lock-row' }, [el('button', { type: 'button', cls: 'btn ghost', text: t.again, on: { click: function () {
        RS.picks = [[], [], []]; RS.round = 0; RS.phase = 'pick'; APP.save(); draw();
      } } })]));
      panel.appendChild(el('p', { cls: 'honest', text: t.honest }));
      if (fresh) { APP.say(v.t); ctx.done(null); }
    }

    function draw(fresh) {
      panel.textContent = '';
      var r = RS.round;
      if (RS.phase === 'pick') {
        var prev = r > 0 ? world(r - 1) : null, to = r > 0 ? uptoOf(ROUND_END[r - 1]) : BASE;
        stripesTo(prev, BASE, to, 0);
        dials(prev ? prev.t2100 : base.t2100, prev ? prev.support : 10, prev ? prev.protect : 0, false);
        pickView();
      } else if (RS.phase === 'events') {
        var res = world(r);
        stripesTo(res, BASE, uptoOf(ROUND_END[r]), 0);
        dials(res.t2100, res.support, res.protect, false);
        eventsView(res, false);
      } else {
        var fin = world(2);
        if (fresh) stripesTo(fin, uptoOf(ROUND_END[2]), ALL, 3200);
        else stripesTo(fin, BASE, ALL, 0);
        dials(fin.t2100, fin.support, fin.protect, !!fresh);
        resultView(fin, !!fresh);
      }
    }
    draw(false);
  };

  /* ---------- Part 6: the poster (drawn on a canvas, saved as a picture) ---------- */
  function wrapLines(g, text, width, maxLines) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var tryIt = cur ? cur + ' ' + w : w;
      if (g.measureText(tryIt).width > width && cur) { lines.push(cur); cur = w; } else cur = tryIt;
    });
    if (cur) lines.push(cur);
    return lines.slice(0, maxLines);
  }
  function drawPoster(cv, t, cur) {
    var g = cv.getContext('2d'), W = cv.width, H = cv.height;
    var run = taskById('p6-run'), vals = APP.ribbonValues() || TEMPS.values, n = ALL;
    g.fillStyle = '#06122A'; g.fillRect(0, 0, W, H);
    for (var i = 0; i < vals.length; i++) {
      var x0 = Math.floor(i * W / n), x1 = Math.floor((i + 1) * W / n);
      g.fillStyle = ST.colour(vals[i]); g.fillRect(x0, 0, Math.max(1, x1 - x0 + 0.5), 640);
    }
    var fade = g.createLinearGradient(0, 470, 0, 640);
    fade.addColorStop(0, 'rgba(6,18,42,0)'); fade.addColorStop(1, '#06122A');
    g.fillStyle = fade; g.fillRect(0, 470, W, 170);
    g.font = '700 28px "Atkinson Hyperlegible", sans-serif'; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.textAlign = 'left'; g.fillText(String(TEMPS.start), 60, 610);
    g.textAlign = 'right'; g.fillText(String(END), W - 60, 610);
    var slogan = cur.own && cur.own.trim() ? cur.own.trim() : t.slogans[cur.slogan >= 0 ? cur.slogan : 0];
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '400 104px "Anton", Impact, sans-serif';
    var y = 760;
    wrapLines(g, slogan.toUpperCase(), W - 120, 3).forEach(function (ln) { g.fillText(ln, 60, y); y += 108; });
    y += 4;
    if (S.run && S.run.lastT != null) {
      g.fillStyle = '#E4B824'; g.font = '400 60px "Anton", Impact, sans-serif';
      g.fillText(fmt(t.by2100, { t: one(S.run.lastT) }), 60, y); y += 64;
    }
    var picks = (S.run && S.run.lastPicks) || [];
    if (picks.length && y < 1150) {
      g.fillStyle = '#C9D6EA'; g.font = '700 28px "Atkinson Hyperlegible", sans-serif';
      g.fillText(t.mine, 60, y); y += 42;
      g.fillStyle = '#fff'; g.font = '700 32px "Atkinson Hyperlegible", sans-serif';
      wrapLines(g, picks.map(function (id) { return run.deck[id][0]; }).join('  ·  '), W - 120, Math.max(1, Math.floor((1240 - y) / 40))).forEach(function (ln) { g.fillText(ln, 60, y); y += 40; });
    }
    g.fillStyle = '#E4B824'; g.fillRect(0, 1262, W, 6);
    g.fillStyle = '#C9D6EA'; g.font = '700 26px "Atkinson Hyperlegible", sans-serif'; g.textAlign = 'left';
    g.fillText(t.foot, 60, 1316);
    if (cur.name && cur.name.trim()) { g.fillStyle = '#fff'; g.font = '400 44px "Anton", Impact, sans-serif'; g.textAlign = 'right'; g.fillText(cur.name.trim(), W - 60, 1318); }
    cv.setAttribute('aria-label', slogan + '. ' + (S.run && S.run.lastT != null ? fmt(t.by2100, { t: one(S.run.lastT) }) : ''));
  }

  R.poster = function (t, body, p, ctx) {
    var sv = S.poster || {};
    var cur = { slogan: sv.slogan == null ? 0 : sv.slogan, own: sv.own || '', name: sv.name || '' };
    var cv = el('canvas', { width: '1080', height: '1350', role: 'img' });
    var sg = el('div', { cls: 'slogans', role: 'group', 'aria-label': t.title });
    var sBtns = t.slogans.map(function (s, i) {
      var b = el('button', { type: 'button', 'aria-pressed': !cur.own && cur.slogan === i ? 'true' : 'false', text: s, on: { click: function () {
        cur.slogan = i; cur.own = ''; own.value = ''; press(); redraw();
      } } });
      sg.appendChild(b); return b;
    });
    function press() { sBtns.forEach(function (b, j) { b.setAttribute('aria-pressed', !cur.own && cur.slogan === j ? 'true' : 'false'); }); }
    var own = el('input', { type: 'text', id: 'poster-own', maxlength: '40', autocomplete: 'off' });
    var name = el('input', { type: 'text', id: 'poster-name', maxlength: '20', autocomplete: 'off' });
    own.value = cur.own; name.value = cur.name;
    own.addEventListener('input', function () { cur.own = own.value; press(); redraw(); });
    name.addEventListener('input', function () { cur.name = name.value; redraw(); });
    var note = el('span', { cls: 'hint', 'aria-live': 'polite' });
    var saveBtn = el('button', { type: 'button', cls: 'btn big', text: U.save, on: { click: savePic } });
    var controls = el('div', { cls: 'poster-controls' }, [sg,
      el('div', { cls: 'field' }, [el('label', { for: own.id, text: t.own }), own]),
      el('div', { cls: 'field' }, [el('label', { for: name.id, text: t.name }), name]),
      el('div', { cls: 'lock-row' }, [saveBtn, note])]);
    body.appendChild(el('div', { cls: 'poster-grid' }, [controls, el('div', { id: 'poster' }, [cv])]));
    function redraw() { drawPoster(cv, t, cur); }
    redraw();
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('400 104px "Anton"'), document.fonts.load('700 28px "Atkinson Hyperlegible"')]).then(redraw, function () {});
    function savePic() {
      redraw();
      var th = document.createElement('canvas'); th.width = 360; th.height = 450;
      th.getContext('2d').drawImage(cv, 0, 0, 360, 450);
      var img = null;
      try { img = th.toDataURL('image/jpeg', 0.8); } catch (e) {}
      S.poster = { slogan: cur.slogan, own: cur.own, name: cur.name, img: img };
      APP.save();
      try {
        cv.toBlob(function (blob) {
          if (!blob) return;
          var a = el('a', { href: URL.createObjectURL(blob), download: 'turn-down-the-heat-poster.png' });
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        }, 'image/png');
      } catch (e) {}
      note.textContent = '✓ ' + U.taskDone;
      ctx.done(null);
    }
  };

  /* ---------- Part 7: the final check, one question at a time ---------- */
  function finalScore() {
    var F = C.final, FS = S.final || { answers: {} }, got = 0, max = 0, by = {};
    Object.keys(F.groups).forEach(function (g) { by[g] = [0, 0]; });
    F.qs.forEach(function (q) {
      var pts = q.band * 5, a = FS.answers[q.id];
      max += pts; by[q.g][1] += pts;
      if (a && a.ok) { got += pts; by[q.g][0] += pts; }
    });
    var pct = got / max * 100, rank = F.ranks[0][1];
    F.ranks.forEach(function (r) { if (pct >= r[0]) rank = r[1]; });
    return { got: got, max: max, by: by, rank: rank, stars: got >= 103 ? 3 : got >= 69 ? 2 : 1 };
  }
  APP.finalScore = finalScore;

  R.final = function (t, body, p, ctx) {
    var F = C.final, QS = F.qs, FS = S.final = S.final || { i: 0, answers: {} };
    var root = el('div', { id: 'final' });
    body.appendChild(root);

    function render(fresh) {
      root.textContent = '';
      if (FS.i >= QS.length) results(fresh); else question(FS.i, fresh);
    }

    function question(i, fresh) {
      var q = QS[i], ans = FS.answers[q.id], key = 'final:' + q.id, qid = 'fq-' + q.id;
      var card = el('div', { cls: 'fq-card' });
      var prog = el('div', { cls: 'fprog', 'aria-hidden': 'true' });
      function paintProg() {
        prog.textContent = '';
        QS.forEach(function (qq, j) { var a = FS.answers[qq.id]; prog.appendChild(el('i', { cls: a ? (a.ok ? 'ok' : 'no') : j === i ? 'cur' : null })); });
      }
      paintProg();
      card.appendChild(prog);
      card.appendChild(el('div', { cls: 'fmeta' }, [el('span', { text: fmt(F.ofLine, { i: i + 1 }) }), el('span', { cls: 'pts', text: fmt(F.points, { p: q.band * 5 }) })]));
      var area = el('div', { cls: 'fq-area' });
      card.appendChild(area);
      var nextBtn = el('button', { type: 'button', cls: 'btn big', text: i === QS.length - 1 ? F.see : F.next, hidden: !ans, on: { click: function () {
        FS.i = i + 1; APP.save(); render(true);
        var top = document.getElementById('task-' + t.id);
        if (top) top.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      } } });
      function answered(ok, extra) {
        ans = FS.answers[q.id] = Object.assign({ ok: ok }, extra || {});
        APP.save(); paintProg(); nextBtn.hidden = false;
      }
      var type = q.type || 'mcq';
      if (type === 'chart') {
        var c5 = taskById('p5-countries'), want = ['uk', 'china', 'india'];
        area.appendChild(el('p', { cls: 'chart-title', text: F.chartTitle }));
        APP.bars(area, want.map(function (id) { return c5.items.filter(function (it) { return it.id === id; })[0]; }), c5.barValue, 10);
      }
      if (type === 'mcq' || type === 'chart' || type === 'tf') {
        var mq = type === 'tf' ? { q: q.q, why: q.why, opts: F.tf.map(function (s, j) { return { t: s, ok: (j === 0) === !!q.ok ? 1 : 0 }; }) } : q;
        if (type === 'tf' && !S.order[key]) S.order[key] = [0, 1];
        APP.mcqBlock(area, mq, key, { once: true, saved: ans ? { pick: ans.pick } : {}, onAnswer: function (ok, sv) { answered(ok, { pick: sv.pick }); } });
      } else if (type === 'order') orderQ(q, area, qid, ans, answered);
      else if (type === 'match') matchQ(q, area, qid, ans, answered);
      card.appendChild(el('div', { cls: 'lock-row' }, [nextBtn]));
      root.appendChild(card);
      if (fresh && window.gsap && !reduce) gsap.from(card, { y: 24, opacity: 0, duration: 0.4 });
    }

    function orderQ(q, area, qid, ans, answered) {
      var picks = ans ? ans.order.slice() : [], done = !!ans;
      area.appendChild(el('p', { cls: 'q', id: qid, text: q.q }));
      var box = el('div', { cls: 'order-picks', role: 'group', 'aria-labelledby': qid }), btns = {};
      APP.orderOf('final:' + q.id, q.steps.map(function (_, j) { return j; })).forEach(function (j) {
        var n = el('span', { cls: 'n', 'aria-hidden': 'true' });
        var b = el('button', { type: 'button' }, [n, el('span', { text: q.steps[j] })]);
        b.addEventListener('click', function () {
          if (done) return;
          var at = picks.indexOf(j);
          if (at >= 0) picks.splice(at, 1); else picks.push(j);
          paint();
        });
        btns[j] = { b: b, n: n };
        box.appendChild(b);
      });
      area.appendChild(box);
      var check = el('button', { type: 'button', cls: 'btn', text: U.check, on: { click: function () {
        done = true;
        var ok = picks.every(function (s, k) { return s === k; });
        answered(ok, { order: picks.slice() });
        paint(); after(ok, true);
      } } });
      var clear = el('button', { type: 'button', cls: 'btn ghost', text: F.orderAgain, on: { click: function () { picks = []; paint(); } } });
      var row = el('div', { cls: 'check-row' }, [check, clear]);
      area.appendChild(row);
      function paint() {
        Object.keys(btns).forEach(function (j) {
          var at = picks.indexOf(+j), x = btns[j];
          x.n.textContent = at >= 0 ? String(at + 1) : '';
          x.b.classList.toggle('picked', at >= 0);
          x.b.setAttribute('aria-label', (at >= 0 ? (at + 1) + '. ' : '') + q.steps[j]);
          x.b.disabled = done;
          if (done) x.b.classList.add(at === +j ? 'is-right' : 'is-wrong');
        });
        check.disabled = done || picks.length < q.steps.length;
        clear.disabled = done || !picks.length;
      }
      function after(ok, sayIt) {
        row.hidden = true;
        area.appendChild(el('p', { cls: 'why', text: (ok ? F.rightWord : F.wrongWord) + '. ' + q.why }));
        area.appendChild(el('ol', { cls: 'right-order' }, q.steps.map(function (s) { return el('li', { text: s }); })));
        if (sayIt) APP.say((ok ? F.rightWord : F.wrongWord) + '. ' + q.why);
      }
      paint();
      if (done) after(ans.ok, false);
    }

    function matchQ(q, area, qid, ans, answered) {
      var pick = ans ? ans.picks.slice() : q.items.map(function () { return null; }), done = !!ans, rows = {};
      area.appendChild(el('p', { cls: 'q', id: qid, text: q.q }));
      var list = el('div', { cls: 'match-list' });
      APP.orderOf('final:' + q.id, q.items.map(function (_, k) { return k; })).forEach(function (k) {
        var seg = el('div', { cls: 'seg', role: 'group', 'aria-label': q.items[k][0] });
        var bs = q.choices.map(function (c, ci) {
          var b = el('button', { type: 'button', 'aria-pressed': 'false', text: c, on: { click: function () { if (done) return; pick[k] = ci; paint(); } } });
          seg.appendChild(b); return b;
        });
        rows[k] = { seg: seg, bs: bs };
        list.appendChild(el('div', { cls: 'match-row' }, [el('span', { text: q.items[k][0] }), seg]));
      });
      area.appendChild(list);
      var check = el('button', { type: 'button', cls: 'btn', text: U.check, on: { click: function () {
        done = true;
        var ok = q.items.every(function (it, k) { return pick[k] === it[1]; });
        answered(ok, { picks: pick.slice() });
        paint(); after(ok, true);
      } } });
      var row = el('div', { cls: 'check-row' }, [check]);
      area.appendChild(row);
      function paint() {
        Object.keys(rows).forEach(function (k) {
          var r = rows[k];
          r.bs.forEach(function (b, ci) { b.setAttribute('aria-pressed', pick[k] === ci ? 'true' : 'false'); b.disabled = done; });
          if (done) {
            var right = pick[k] === q.items[k][1];
            r.seg.classList.add(right ? 'is-right' : 'is-wrong');
            if (!right) r.bs[q.items[k][1]].classList.add('correct');
          }
        });
        check.disabled = done || pick.some(function (x) { return x == null; });
      }
      function after(ok, sayIt) {
        row.hidden = true;
        area.appendChild(el('p', { cls: 'why', text: (ok ? F.rightWord : F.wrongWord) + '. ' + q.why }));
        if (sayIt) APP.say((ok ? F.rightWord : F.wrongWord) + '. ' + q.why);
      }
      paint();
      if (done) after(ans.ok, false);
    }

    function results(fresh) {
      var sc = finalScore(), card = el('div', { cls: 'fq-card final-results' });
      var scoreEl = el('p', { id: 'score', text: fmt(F.score, { s: sc.got, m: sc.max }) });
      card.appendChild(scoreEl);
      card.appendChild(el('p', { id: 'rank', text: fmt(F.rankLine, { r: sc.rank }) }));
      card.appendChild(el('div', { cls: 'groups' }, Object.keys(F.groups).map(function (g) {
        return el('span', { text: fmt(F.groupLine, { g: F.groups[g], s: sc.by[g][0], m: sc.by[g][1] }) });
      })));
      card.appendChild(el('h4', { text: F.resultsTitle }));
      card.appendChild(el('ul', { cls: 'results' }, QS.map(function (q) {
        var ok = !!(FS.answers[q.id] && FS.answers[q.id].ok);
        return el('li', { cls: ok ? 'ok' : 'no' }, [
          el('span', { cls: 'mk', 'aria-hidden': 'true', text: ok ? '✓' : '✗' }),
          el('span', { cls: 'sr', text: (ok ? F.rightWord : F.wrongWord) + ': ' }),
          el('span', { text: q.q }),
          ok ? null : el('button', { type: 'button', cls: 'btn ghost', text: fmt(F.lookAgain, { k: q.part }), on: { click: function () { APP.show(q.part); } } })
        ]);
      })));
      root.appendChild(card);
      if (fresh && window.gsap && !reduce) {
        var o = { v: 0 };
        gsap.to(o, { v: sc.got, duration: 1.2, ease: 'power2.out', onUpdate: function () { scoreEl.textContent = fmt(F.score, { s: Math.round(o.v), m: sc.max }); } });
      }
      if (fresh) APP.say(fmt(F.score, { s: sc.got, m: sc.max }) + ' ' + fmt(F.rankLine, { r: sc.rank }));
      if (!ctx.state.done) { if (fresh) ctx.done(sc.stars); else later(function () { ctx.done(sc.stars); }); }
    }

    render(false);
  };

  /* ---------- the end page: her stripes to 2100, her stars, her score, her poster ---------- */
  APP.views.end = function (sec) {
    var E = C.end, inn = el('div', { cls: 'task-in' });
    sec.setAttribute('aria-label', E.title);
    sec.appendChild(el('article', { cls: 'task end' }, [inn]));
    inn.appendChild(el('h2', { cls: 'end-title', text: E.title }));
    var cv = el('canvas', { 'aria-hidden': 'true' });
    inn.appendChild(el('div', { cls: 'end-stripes' }, [cv]));
    var vals = APP.ribbonValues() || TEMPS.values;
    APP.liveStripes(cv, vals, ALL, vals.length);
    inn.appendChild(el('h3', { text: E.stars }));
    inn.appendChild(el('div', { cls: 'end-stars' }, C.parts.map(function (p) {
      var n = S.stars[p.k] || 0, ink = ON[p.k];
      return el('div', { style: { background: p.colour, '--on': ink || '#fff' } }, [
        el('b', { text: fmt(E.partShort, { k: p.k }) }),
        el('span', { cls: 's', 'aria-hidden': 'true', text: APP.starText(n), style: ink ? { color: ink, 'text-shadow': 'none' } : null }),
        el('span', { cls: 'sr', text: p.name + '. ' + APP.starsLine(n) })
      ]);
    })));
    var sc = finalScore();
    var left = el('div', null, [
      el('p', { id: 'score', text: fmt(C.final.score, { s: sc.got, m: sc.max }) }),
      el('p', { id: 'rank', text: fmt(C.final.rankLine, { r: sc.rank }) }),
      el('p', { cls: 'show-teacher', text: E.show })
    ]);
    var right = el('div');
    if (S.poster && S.poster.img) right.appendChild(el('h3', { text: E.poster }));
    if (S.poster && S.poster.img) right.appendChild(el('img', { src: S.poster.img, alt: E.poster, width: '360', height: '450' }));
    inn.appendChild(el('div', { cls: 'end-grid' }, [left, right]));
    var confirm = el('div', { cls: 'restart-confirm', hidden: true }, [
      el('p', { text: U.restartConfirm }),
      el('button', { type: 'button', cls: 'btn', text: U.restartYes, on: { click: function () { APP.restart(); } } }),
      el('button', { type: 'button', cls: 'btn ghost', text: U.restartNo, on: { click: function () { confirm.hidden = true; ask.hidden = false; ask.focus(); } } })
    ]);
    var ask = el('button', { type: 'button', cls: 'btn ghost', text: U.restart, on: { click: function () { ask.hidden = true; confirm.hidden = false; confirm.querySelector('button').focus(); } } });
    inn.appendChild(el('div', { cls: 'restart-row' }, [ask, confirm]));
  };
})();
