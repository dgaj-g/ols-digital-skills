/* platform/staff.js — the staff page (SPEC §10): the bare /exec link with no class. Passcode once per account (the owner is admitted by email, D56).
 * Tabs: Classes · Papers · Live · Export. Every string from strings.json (D5). window.Staff.boot(app, bootReply). */
(function () {
  'use strict';
  const C = window.A2CONTENT;
  const T = (k, v) => window.App.T(k, v), h = (s) => window.App.h(s);
  const PAPERS = {}; C.papers.forEach((p) => { PAPERS[p.id] = p; });
  const label = (q) => q.label || q.id.split('-').pop();
  const EPOCH = 1767225600000;
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const dateOf = (m) => { const d = new Date(EPOCH + m * 60000); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const at = (m) => new Date(EPOCH + m * 60000), hm = (m) => { const d = at(m); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const dayKey = (d) => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
  function dayName(m, now) {
    const d = at(m), t = at(now), y = at(now - 1440);
    if (dayKey(d) === dayKey(t)) return T('staff.today');
    if (dayKey(d) === dayKey(y)) return T('staff.yesterday');
    return T('staff.day', { day: T('staff.days').split(',')[d.getDay()], date: d.getDate(), month: T('staff.months').split(',')[d.getMonth()] });
  }
  const mins = (n) => (n < 60 ? T('staff.act.min', { n }) : T('staff.act.hm', { h: Math.floor(n / 60), m: n % 60 }));
  const marked = (n) => T(n === 1 ? 'staff.act.marked1' : 'staff.act.marked', { n });
  let app, ME = '', OWNER = false, TAB = 'live', CLS = '', CLASSES = [], timer = null;
  const sel = (k) => { try { return localStorage.getItem('a2staff:' + k) || ''; } catch (e) { return ''; } };
  const keep = (k, v) => { try { localStorage.setItem('a2staff:' + k, v); } catch (e) {} };

  function call(req) {
    return window.OLS_TRANSPORT.call('apiStaff', req).then((r) => {
      if (!r || r.ok === false) { const e = new Error((r && r.error) || 'error'); e.code = (r && r.error) || 'error'; throw e; }
      return r;
    });
  }
  function frame(inner) {
    app.innerHTML = '<header class="bar"><span class="title">' + h(T('staff.title')) + '</span><span class="who">' + h(ME) + '</span></header><div id="sys"></div><main class="staff">' + inner + '</main>';
  }
  function fail(e) {
    const box = app.querySelector('[data-msg]');
    const text = e.code === 'offline' || !e.code || e.code === 'error' ? T('sys.offline') : e.code === 'owner-only' ? T('staff.ownerOnly') : e.code === 'not-staff' ? T('staff.bad') : T('sys.offline');
    if (box) { box.textContent = text; box.hidden = false; }
  }

  // ---------- passcode ----------
  function gate() {
    frame('<div class="passbox"><label for="pass"><b>' + h(T('staff.passcode')) + '</b></label><input id="pass" type="password" autocomplete="off"><button class="btn">' + h(T('staff.enter')) + '</button>' +
      '<p class="err" data-msg hidden></p><p class="note">' + h(T('staff.pupilsUse')) + '</p></div>');
    const inp = app.querySelector('#pass'), btn = app.querySelector('.passbox .btn');
    const go = () => {
      if (!inp.value) return;
      btn.disabled = true;
      call({ op: 'check', pass: inp.value }).then((r) => { OWNER = !!r.owner; open(); }, (e) => {
        btn.disabled = false; inp.value = ''; inp.focus();
        const m = app.querySelector('[data-msg]'); m.textContent = e.code === 'bad-pass' ? T('staff.bad') : T('sys.offline'); m.hidden = false;
      });
    };
    btn.addEventListener('click', go);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    inp.focus();
  }

  // ---------- shell ----------
  function open() {
    if (OWNER) call({ op: 'health' }).catch(() => {}); // the owner's visit keeps the store under its limit (D76)
    TAB = sel('tab') || 'live';
    loadClasses().then(paint, paint);
  }
  function loadClasses() {
    return call({ op: 'classes' }).then((r) => {
      CLASSES = r.classes; OWNER = !!r.owner;
      if (!CLASSES.some((c) => c.name === CLS)) CLS = CLASSES.some((c) => c.name === sel('cls')) ? sel('cls') : (CLASSES[0] || {}).name || '';
    });
  }
  function paint() {
    clearInterval(timer); timer = null;
    const tabs = [['classes', 'staff.tabClasses'], ['papers', 'staff.tabPapers'], ['live', 'staff.tabLive'], ['export', 'staff.tabExport']];
    if (!CLASSES.length) TAB = 'classes';
    const pick = TAB !== 'classes' && CLASSES.length ? '<span class="cls"><label for="cls">' + h(T('staff.class')) + '</label><select id="cls">' +
      CLASSES.map((c) => '<option' + (c.name === CLS ? ' selected' : '') + '>' + h(c.name) + '</option>').join('') + '</select></span>' : '';
    frame('<div class="stabs">' + tabs.map(([k, s]) => '<button data-tab="' + k + '"' + (k === TAB ? ' class="on"' : '') + '>' + h(T(s)) + '</button>').join('') + pick + '</div><div id="pane"></div><p class="err" data-msg hidden></p>');
    app.querySelectorAll('.stabs [data-tab]').forEach((b) => b.addEventListener('click', () => { TAB = b.dataset.tab; keep('tab', TAB); paint(); }));
    const s = app.querySelector('#cls');
    if (s) s.addEventListener('change', () => { CLS = s.value; keep('cls', CLS); paint(); });
    ({ classes: vClasses, papers: vPapers, live: vLive, export: vExport })[TAB]();
  }
  const pane = () => app.querySelector('#pane');
  function twoPress(btn, confirmText, act) { // a destructive button asks once, in its own words, then acts on the second press
    let armed = false, t = null;
    const orig = btn.textContent;
    btn.addEventListener('click', () => {
      if (!armed) { armed = true; btn.textContent = confirmText; btn.classList.add('arm'); t = setTimeout(() => { armed = false; btn.textContent = orig; btn.classList.remove('arm'); }, 5000); return; }
      clearTimeout(t); btn.disabled = true; act(() => { btn.disabled = false; armed = false; btn.textContent = orig; btn.classList.remove('arm'); });
    });
  }
  function classLink(name) { return String((window.OLS_BOOT && window.OLS_BOOT.baseUrl) || location.href.split('?')[0]) + '?class=' + encodeURIComponent(name); }

  // ---------- Classes ----------
  function vClasses() {
    const list = CLASSES.length ? '<ul class="clist">' + CLASSES.map((c) => '<li data-c="' + h(c.name) + '"><b>' + h(T(c.n === 1 ? 'staff.classLine1' : 'staff.classLine', { name: c.name, n: c.n, date: c.c ? dateOf(c.c) : '' })) + '</b>' +
      '<button class="btn sec" data-copy>' + h(T('staff.copy')) + '</button>' + (c.mine || OWNER ? '<button class="btn ghost" data-del>' + h(T('staff.delete')) + '</button>' : '') + '</li>').join('') + '</ul>'
      : '<p class="note">' + h(T('staff.noClasses')) + '</p>';
    pane().innerHTML = list + '<div class="card"><h3>' + h(T('staff.add')) + '</h3><div class="row"><label for="newc">' + h(T('staff.className')) + '</label><input id="newc" class="txt" maxlength="40" style="max-width:260px" autocomplete="off">' +
      '<button class="btn" data-create disabled>' + h(T('staff.create')) + '</button></div><p class="note" data-rule>' + h(T('staff.rule')) + '</p><p class="note" data-copied hidden>' + h(T('staff.copied')) + '</p></div>';
    pane().querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      const link = classLink(b.closest('li').dataset.c), done = () => { const m = pane().querySelector('[data-copied]'); m.hidden = false; setTimeout(() => { m.hidden = true; }, 3000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, () => prompt(T('staff.copy'), link));
      else prompt(T('staff.copy'), link);
    }));
    pane().querySelectorAll('[data-del]').forEach((b) => {
      const name = b.closest('li').dataset.c;
      twoPress(b, T('staff.deleteConfirm', { name }), (reset) => call({ op: 'delete', name }).then(() => loadClasses()).then(paint, (e) => { reset(); fail(e); }));
    });
    const inp = pane().querySelector('#newc'), btn = pane().querySelector('[data-create]'), rule = pane().querySelector('[data-rule]');
    inp.addEventListener('input', () => {
      const ok = /^[A-Za-z0-9-]{1,40}$/.test(inp.value.trim());
      btn.disabled = !ok; rule.className = ok || !inp.value ? 'note' : 'err'; rule.textContent = T('staff.rule');
    });
    const create = () => {
      const name = inp.value.trim(); if (btn.disabled) return;
      btn.disabled = true;
      call({ op: 'create', name }).then((r) => { CLS = r.name; keep('cls', CLS); return loadClasses(); }).then(paint, (e) => {
        btn.disabled = false;
        if (e.code === 'taken') { rule.className = 'err'; rule.textContent = T('staff.taken'); }
        else if (e.code === 'bad-name') { rule.className = 'err'; rule.textContent = T('staff.rule'); }
        else fail(e);
      });
    };
    btn.addEventListener('click', create);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
  }

  // ---------- Papers ----------
  function vPapers() {
    pane().innerHTML = '<p class="note">' + h(T('turn.marking')).replace('…', '') + '<span class="dots"></span></p>';
    call({ op: 'papers', name: CLS }).then((r) => {
      let order = r.order.slice(), openL = r.open.slice();
      const can = r.canManage;
      const draw = () => {
        pane().innerHTML = '<p class="note">' + h(T('staff.papersNote')) + '</p><ul class="plist">' + order.map((id, i) => {
          const p = PAPERS[id], on = openL.includes(id);
          return '<li data-p="' + id + '"><b>' + h(T('map.paper', { year: p.year, title: p.title })) + '</b><span class="st ' + (on ? 'on' : 'off') + '">' + h(T(on ? 'staff.isOpen' : 'staff.isLocked')) + '</span>' +
            (can ? '<button class="btn sec" data-toggle>' + h(T(on ? 'staff.lock' : 'staff.open')) + '</button><span class="row" style="gap:4px"><button class="btn ghost" data-up aria-label="' + h(T('staff.up')) + '" title="' + h(T('staff.up')) + '"' + (i ? '' : ' disabled') + '>▲</button>' +
              '<button class="btn ghost" data-down aria-label="' + h(T('staff.down')) + '" title="' + h(T('staff.down')) + '"' + (i < order.length - 1 ? '' : ' disabled') + '>▼</button></span>' : '<span></span><span></span>') + '</li>';
        }).join('') + '</ul>' + (can ? '<div class="row"><button class="btn sec" data-all>' + h(T('staff.openAll')) + '</button><button class="btn ghost" data-reset>' + h(T('staff.resetOrder')) + '</button></div>' : '<p class="note">' + h(T('staff.ownerOnly')) + '</p>');
        if (!can) return;
        const save = () => call({ op: 'papers', name: CLS, set: true, order, open: openL }).then((x) => { order = x.order; openL = x.open; draw(); }, (e) => { fail(e); draw(); });
        pane().querySelectorAll('.plist li').forEach((li) => {
          const id = li.dataset.p, i = order.indexOf(id);
          li.querySelector('[data-toggle]').addEventListener('click', () => { openL = openL.includes(id) ? openL.filter((x) => x !== id) : openL.concat(id); save(); });
          li.querySelector('[data-up]').addEventListener('click', () => { if (i > 0) { order.splice(i, 1); order.splice(i - 1, 0, id); save(); } });
          li.querySelector('[data-down]').addEventListener('click', () => { if (i < order.length - 1) { order.splice(i, 1); order.splice(i + 1, 0, id); save(); } });
        });
        pane().querySelector('[data-all]').addEventListener('click', () => { openL = order.slice(); save(); });
        pane().querySelector('[data-reset]').addEventListener('click', () => { order = C.papers.map((p) => p.id); save(); });
      };
      draw();
    }, (e) => { pane().innerHTML = ''; fail(e); });
  }

  // ---------- Live ----------
  let LIVE = null;
  function paperCell(pu, pid) {
    const p = PAPERS[pid]; let first = 0, best = 0, n = 0, cold = true, seen = false, flag = false;
    p.parts.forEach((q) => { const r = pu.P[q.id]; if (!r) { cold = false; return; } if (r.fl) flag = true; if (r.f == null) { cold = false; return; } n++; first += r.f; best += r.b != null ? r.b : r.f; if (r.d !== 1) cold = false; if (r.sb) seen = true; });
    const ev = pu.E[pid], amber = ev && (ev.f === 2 || Object.keys(ev.l || {}).some((k) => ev.l[k] === 2));
    if (!n && !flag) return '<td class="c empty">—</td>';
    return '<td class="c" data-cell="' + h(pu.email) + '|' + pid + '" tabindex="0">' + (n ? first + (best > first ? '<small>' + best + '</small>' : '') : '·') +
      (n && n < p.parts.length ? '<small>' + h(T('staff.cellParts', { n, of: p.parts.length })) + '</small>' : '') +
      (cold && n === p.parts.length ? '<span class="tg">' + h(T('staff.tagUnaided')) + '</span>' : '') + (seen ? '<span class="tg">' + h(T('staff.tagSeen')) + '</span>' : '') +
      (flag ? '<span class="tg red">' + h(T('staff.tagFlag')) + '</span>' : '') + (amber ? '<span class="amber" aria-label="' + h(T('staff.eval')) + '"></span>' : '') + '</td>';
  }
  function ago(now, m) { const d = now - m; return !m ? '—' : d < 1 ? T('staff.justNow') : d < 60 ? T('staff.minAgo', { n: d }) : dayName(m, now) + ' ' + hm(m); }
  // the Last seen cell's second line (D100): the last session's working time and answers marked
  const lastLine = (s) => (s ? [s[2] ? mins(s[2]) : '', s[3] ? marked(s[3]) : ''].filter(Boolean).join(' · ') : '');
  function vLive() {
    const load = () => call({ op: 'live', name: CLS }).then((r) => {
      LIVE = r;
      const d = new Date(), stamp = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
      const order = r.order;
      pane().innerHTML = '<div class="row" style="margin-bottom:10px"><button class="btn sec" data-refresh>' + h(T('staff.refresh')) + '</button><span class="note">' + h(T('staff.updated', { time: stamp })) + '</span></div>' +
        (r.pupils.length ? '<div class="scroll"><table class="grid"><tr><th>' + h(T('staff.pupil')) + '</th><th>' + h(T('staff.lastSeen')) + '</th>' + order.map((id) => '<th>' + h(PAPERS[id].year) + '</th>').join('') + '</tr>' +
          r.pupils.map((pu) => '<tr' + (pu.me ? ' class="me"' : '') + '><td><button class="who" data-act="' + h(pu.email) + '" title="' + h(T('staff.act.open')) + '">' + h(pu.n || pu.email) + '</button>' + (pu.n && r.pupils.filter((x) => x.n === pu.n).length > 1 ? ' <small class="note">' + h(pu.email.split('@')[0]) + '</small>' : '') + (pu.me ? ' ' + h(T('staff.you')) : '') + '</td><td class="seen">' + h(ago(r.now, pu.seen)) + (lastLine(pu.last) ? '<small>' + h(lastLine(pu.last)) + '</small>' : '') + '</td>' + order.map((id) => paperCell(pu, id)).join('') + '</tr>').join('') + '</table></div>'
          : '<p class="note">' + h(T('staff.nothing')) + '</p>') +
        '<p class="note" style="margin-top:10px">' + h(T('staff.legend')) + '</p>' + (r.pupils.some((pu) => pu.me) ? '<button class="btn ghost" data-clear>' + h(T('staff.clearMine')) + '</button>' : '');
      pane().querySelector('[data-refresh]').addEventListener('click', load);
      pane().querySelectorAll('[data-cell]').forEach((td) => {
        const openIt = () => { const [em, pid] = td.dataset.cell.split('|'); drawer(em, pid); };
        td.addEventListener('click', openIt);
        td.addEventListener('keydown', (e) => { if (e.key === 'Enter') openIt(); });
      });
      pane().querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => activity(b.dataset.act)));
      const clr = pane().querySelector('[data-clear]');
      if (clr) twoPress(clr, T('staff.clearConfirm', { name: CLS }), (reset) => call({ op: 'clearMine', name: CLS }).then(load, (e) => { reset(); fail(e); }));
    }, fail);
    load();
    timer = setInterval(() => { if (!document.hidden && TAB === 'live' && !app.querySelector('.drawer')) load(); }, 60000);
  }
  const EVV = ['ev.can', 'ev.getting', 'ev.not'], FEEL = ['ev.easy', 'ev.right', 'ev.tricky'];
  function drawer(email, pid) {
    const pu = LIVE.pupils.find((x) => x.email === email), p = PAPERS[pid]; if (!pu) return;
    const old = app.querySelector('.drawer'); if (old) old.remove();
    const ev = pu.E[pid];
    const parts = p.parts.map((q) => {
      const r = pu.P[q.id];
      if (!r) return '<div class="part"><b>' + h(T('staff.drawerPart', { label: label(q) })) + '</b><p class="note">' + h(T('staff.noAnswer')) + '</p></div>';
      const tw = r.t && C.twins[r.t];
      return '<div class="part" data-part="' + q.id + '"><b>' + h(T('staff.drawerPart', { label: label(q) })) + '</b> <span class="note">' + h(q.ask) + '</span>' +
        (r.f != null ? '<p>' + h(T(r.d === 1 ? 'staff.doorCold' : 'staff.doorLearn')) + ' · ' + h(T('staff.firstAnswer', { t: r.f, of: q.marks })) + (r.b > r.f ? ' · ' + h(T('staff.bestAnswer', { t: r.b, of: q.marks })) : '') + ' · ' + h(r.a === 1 ? T('staff.attempts1') : T('staff.attempts', { n: r.a })) + '</p>'
          : '<p class="note">' + h(T('staff.noAnswer')) + '</p>') +
        (r.rm || []).map((c) => '<p class="note">' + h(T('staff.remarked', { date: dateOf(c[0]), which: T('staff.rm.' + c[1]), from: c[2], to: c[3] })) + '</p>').join('') +
        (r.s ? '<p class="note">' + h(T('staff.sawAnswer')) + '</p>' : '') +
        (tw && r.tf != null ? '<p>' + h(T('staff.aqAnswer', { id: tw.id, t: r.tf, of: tw.marks })) + (r.tb > r.tf ? ' · ' + h(T('staff.aqBest', { t: r.tb, of: tw.marks })) : '') + '</p>' : '') +
        (r.fl ? '<p><span class="tg red">' + h(T('staff.flagAt', { label: label(q), beat: T('staff.beat.' + r.fl.b) })) + '</span> <button class="btn sec" data-ack>' + h(T('staff.ack')) + '</button></p>' : '') +
        (r.f != null ? '<button class="btn ghost" data-all>' + h(T('staff.showAll')) + '</button><div data-scripts></div>' : '') + '</div>';
    }).join('');
    const evHtml = ev ? '<div class="part"><b>' + h(T('staff.eval')) + '</b>' + Object.keys(ev.l || {}).map((k) => '<p>' + h(T('ev.line.' + k)) + ' · <b>' + h(T(EVV[ev.l[k]])) + '</b></p>').join('') +
      '<p>' + h(T('staff.feel', { f: T(FEEL[ev.f]) })) + '</p>' + (ev.c ? '<p>' + h(T('staff.comment', { c: ev.c })) + '</p>' : '') + '</div>' : '<div class="part"><b>' + h(T('staff.eval')) + '</b> <span class="note">' + h(T('staff.evalNone')) + '</span></div>';
    app.insertAdjacentHTML('beforeend', '<aside class="drawer" role="dialog" aria-label="' + h(pu.n || pu.email) + '"><div class="row" style="justify-content:space-between"><h3>' + h(pu.n || pu.email) + ' · ' + h(T('map.paper', { year: p.year, title: p.title })) + '</h3>' +
      '<button class="btn ghost" data-close>' + h(T('staff.close')) + '</button></div>' + parts + evHtml + '</aside>');
    const dr = app.querySelector('.drawer');
    dr.querySelector('[data-close]').addEventListener('click', () => dr.remove());
    dr.querySelectorAll('[data-ack]').forEach((b) => {
      const part = b.closest('[data-part]').dataset.part;
      twoPress(b, T('staff.ackConfirm'), (reset) => call({ op: 'ack', name: CLS, email, part }).then(() => { delete pu.P[part].fl; b.parentElement.remove(); }, (e) => { reset(); fail(e); }));
    });
    dr.querySelectorAll('[data-all]').forEach((b) => b.addEventListener('click', () => {
      const part = b.closest('[data-part]').dataset.part, box = b.nextElementSibling, q = p.parts.find((x) => x.id === part);
      b.disabled = true;
      call({ op: 'scripts', name: CLS, email, part }).then((r) => {
        const tw = r.part.t && C.twins[r.part.t];
        // each attempt: the mark given at the time; today's re-judge beside it where it differs (D97); the ticks are today's marking
        const why = (pt) => (pt.missing ? ' · ' + T('staff.missing', { names: pt.missing.join(', ') }) : '') + (pt.nofield ? ' · ' + T('staff.nofield', { names: pt.nofield.join(', ') }) : '');
        const one = (a, i, of) => '<p>' + h(a.verdict && a.verdict.total !== a.total ? T('staff.attemptThen', { n: i + 1, t: a.total, of, now: a.verdict.total }) : T('staff.attemptN', { n: i + 1, t: a.total, of })) + ' · <span class="note">' + h(dateOf(a.m)) + '</span></p>' + (a.script != null ? '<pre>' + h(a.script) + '</pre>' : '') +
          (a.verdict && a.verdict.spell ? a.verdict.spell.map((x) => '<p class="spell">' + h(T('staff.spell', x)) + '</p>').join('') : '') +
          (a.verdict ? '<ul class="check">' + a.verdict.points.map((pt) => '<li class="' + (pt.awarded >= pt.of ? 'hit' : 'miss') + '">' + h(pt.label) + ' <span class="note">[' + pt.awarded + '/' + pt.of + ']' + h(why(pt)) + '</span></li>').join('') + '</ul>' : '');
        box.innerHTML = '<p class="note">' + h(T('staff.allNote')) + '</p>' + (r.a.length ? r.a.map((a, i) => one(a, i, q.marks)).join('') : '<p class="note">' + h(T(r.archived ? 'staff.archived' : 'staff.nothing')) + '</p>') +
          (tw && r.t.length ? '<p><b>' + h(T('staff.aqAnswer', { id: tw.id, t: r.part.tf, of: tw.marks })) + '</b></p>' + r.t.map((a, i) => one(a, i, tw.marks)).join('') : '');
        b.remove();
      }, (e) => { b.disabled = false; fail(e); });
    }));
  }

  // ---------- one pupil's activity (D100): sessions newest first, each with its timed events ----------
  const PART = {}; C.papers.forEach((p) => p.parts.forEach((q) => { PART[q.id] = { p, q }; }));
  function activity(email) {
    const pu = LIVE.pupils.find((x) => x.email === email); if (!pu) return;
    const old = app.querySelector('.drawer'); if (old) old.remove();
    app.insertAdjacentHTML('beforeend', '<aside class="drawer" role="dialog" aria-label="' + h(pu.n || pu.email) + '"><div class="row" style="justify-content:space-between"><h3>' + h(T('staff.act.title', { name: pu.n || pu.email })) + '</h3>' +
      '<button class="btn ghost" data-close>' + h(T('staff.close')) + '</button></div><div data-acts><p class="note">' + h(T('staff.act.loading')) + '</p></div></aside>');
    const dr = app.querySelector('.drawer'), box = dr.querySelector('[data-acts]');
    dr.querySelector('[data-close]').addEventListener('click', () => dr.remove());
    call({ op: 'activity', name: CLS, email }).then((r) => { box.innerHTML = timeline(r); }, (e) => { box.innerHTML = ''; fail(e); });
  }
  function evText(e) {
    if (e.k === 'j') return T('staff.ev.joined');
    if (e.k === 'e') return T('staff.ev.eval', { paper: PAPERS[e.paper] ? PAPERS[e.paper].year : e.paper });
    const x = PART[e.part]; if (!x) return e.part;
    const part = T('staff.ev.part', { year: x.p.year, label: label(x.q) }), tw = e.id && C.twins[e.id];
    if (e.k === 'a') return e.n === 0 ? T('staff.ev.first', { part, t: e.t, of: x.q.marks, door: T(e.d === 1 ? 'door.cold' : 'door.learn') }) : T('staff.ev.again', { part, t: e.t, of: x.q.marks });
    if (e.k === 't') return T(e.n === 0 ? 'staff.ev.aq' : 'staff.ev.aqAgain', { part, id: tw ? tw.id : e.id, t: e.t, of: tw ? tw.marks : '' });
    if (e.k === 's') return T('staff.ev.sawAnswer', { part });
    if (e.k === 'w') return T('staff.ev.sawWorked', { part, id: tw ? tw.id : e.id });
    if (e.k === 'f') return T('staff.ev.flag', { part, beat: T('staff.beat.' + e.b) });
    return '';
  }
  function timeline(r) {
    // recorded sessions take the events inside them; the rest (before time was recorded) group by gaps of over 30 minutes, marked "about"
    const ses = r.sessions.map((s) => ({ a: s[0], b: s[1], act: s[2], ev: [] })), loose = [];
    r.events.forEach((e) => { const s = ses.find((x) => e.m >= x.a - 1 && e.m <= x.b + 1); if (s) s.ev.push(e); else loose.push(e); });
    let g = null;
    loose.forEach((e) => { if (!g || e.m - g.b > 30) { g = { a: e.m, b: e.m, ev: [], rough: true }; ses.push(g); } g.ev.push(e); g.b = e.m; });
    ses.sort((x, y) => y.a - x.a);
    const d = at(r.now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const ws = Math.floor((d.getTime() - EPOCH) / 60000), wk = ses.filter((s) => s.a >= ws);
    const isMark = (e) => e.k === 'a' || e.k === 't';
    const time = wk.reduce((t, s) => t + (s.rough ? 0 : s.act), 0), nMarked = r.events.filter((e) => isMark(e) && e.m >= ws).length;
    const stat = (v, k) => '<div class="stat"><b>' + h(v) + '</b><span>' + h(T(k)) + '</span></div>';
    const head = (s) => {
      const day = dayName(s.a, r.now), n = s.ev.filter(isMark).length;
      const t = s.rough ? (s.a === s.b ? T('staff.act.headAboutAt', { day, at: hm(s.a) }) : T('staff.act.headAbout', { day, from: hm(s.a), to: hm(s.b) }))
        : T('staff.act.head', { day, from: hm(s.a), to: hm(s.b), time: mins(s.act) });
      return t + (n ? ' · ' + marked(n) : '');
    };
    return '<div class="stats">' + stat(time ? mins(time) : '—', 'staff.act.weekTime') + stat(String(wk.length), 'staff.act.weekSessions') + stat(String(nMarked), 'staff.act.weekMarked') + '</div>' +
      '<p class="note">' + h(T('staff.act.note')) + '</p>' +
      (ses.length ? ses.map((s, i) => '<details class="sess' + (s.rough ? ' rough' : '') + '"' + (i === 0 ? ' open' : '') + '><summary>' + h(head(s)) + '</summary>' +
        (s.ev.length ? '<ul class="evs">' + s.ev.map((e) => '<li><span class="at">' + h(hm(e.m)) + '</span><span>' + h(evText(e)) + '</span></li>').join('') + '</ul>' : '<p class="note">' + h(T('staff.act.nothingMarked')) + '</p>') +
        '</details>').join('') : '<p class="note">' + h(T('staff.act.none')) + '</p>') +
      (r.untimed ? '<p class="note">' + h(T('staff.act.archived')) + '</p>' : '');
  }

  // ---------- Export ----------
  function vExport() {
    pane().innerHTML = '<div class="card"><p class="note">' + h(T('staff.csvNote')) + '</p><button class="btn" data-csv>' + h(T('staff.csv')) + '</button></div>';
    const b = pane().querySelector('[data-csv]');
    b.addEventListener('click', () => {
      b.disabled = true;
      call({ op: 'csv', name: CLS }).then((r) => {
        const url = URL.createObjectURL(new Blob(['﻿' + r.csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a'); a.href = url; a.download = r.file; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }, fail).then(() => { b.disabled = false; });
    });
  }

  function boot(host, r) {
    app = host; ME = r.email;
    call({ op: 'check' }).then((x) => { OWNER = !!x.owner; if (x.admitted) open(); else gate(); }, () => gate());
  }
  window.Staff = { boot };
})();
