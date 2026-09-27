/* platform/app.js — the pupil page (SPEC §3–§11, §12a). Every pupil string comes from strings.json (D5); every mark from the server.
 * Screens: guard · home · SQL map · paper · part (door · the question · the lesson · your turn · another question) · How did it go?
 * The staff page is staff.js (a bare /exec link with no class). window.App.boot() starts it. */
(function () {
  'use strict';
  const C = window.A2CONTENT, S = C.strings;
  const T = (k, v) => { const s = S[k]; if (s == null) return k; return v ? s.replace(/\{(\w+)\}/g, (m, x) => (v[x] != null ? v[x] : m)) : s; };
  const h = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PAPERS = {}, PARTS = {};
  C.papers.forEach((p) => { PAPERS[p.id] = p; p.parts.forEach((q) => { PARTS[q.id] = { paper: p, part: q }; }); });
  const label = (q) => q.label || q.id.split('-').pop();
  const marksText = (n) => (n === 1 ? T('part.mark1') : T('part.marks', { n }));
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const BUILD = String(window.A2_DEPLOY || '').replace(/^a2ssd-/, '');
  const isText = (q) => q.kind === 'text' || q.kind === 'rows' || q.type === 'prose' || q.type === 'short' || q.type === 'rows';
  let app, ME = { email: '', cls: '', name: '' }, REC = { n: '', P: {}, E: {} }, CFG = { order: C.papers.map((p) => p.id), open: [] };

  // ---------- local storage (per-viewer mirror; every read and write guarded) ----------
  const LS = {
    // keyed by the signed-in account, so two pupils sharing one browser never see each other's drafts, doors or marks
    key(k) { return (ME.email || '?') + '|' + k; },
    get(k) { try { const v = localStorage.getItem(LS.key(k)); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(LS.key(k)); else localStorage.setItem(LS.key(k), JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- system line: offline · sign-in expired · stale build ----------
  const SYS = { offline: false, expired: false, stale: false, retry: null };
  function paintSys() {
    const el = document.getElementById('sys'); if (!el) return;
    let html = '';
    if (SYS.expired) html = '<span>' + h(T('sys.expired')) + '</span><button class="btn" data-sys="reload">' + h(T('sys.reload')) + '</button>';
    else if (SYS.offline) html = '<span>' + h(T('sys.offline')) + '</span><button class="btn" data-sys="retry">' + h(T('sys.retry')) + '</button>';
    else if (SYS.stale) html = '<span>' + h(T('sys.stale')) + '</span><button class="btn" data-sys="reload">' + h(T('sys.reload')) + '</button>';
    el.className = html ? 'sysbar' + (SYS.expired || SYS.offline ? ' bad' : '') : '';
    el.innerHTML = html;
  }

  // ---------- server calls ----------
  function call(fn, req) {
    req = Object.assign({ cls: ME.cls }, req || {});
    return window.OLS_TRANSPORT.call(fn, req).then((r) => {
      if (SYS.offline) { SYS.offline = false; paintSys(); flushOutbox(); }
      if (r && r.v && BUILD && r.v !== BUILD && !SYS.stale) { SYS.stale = true; paintSys(); }
      if (!r || r.ok === false) {
        const code = (r && r.error) || 'error';
        if (code === 'not-signed-in') { SYS.expired = true; paintSys(); }
        const e = new Error(code); e.code = code; throw e;
      }
      if (r.rec) REC = r.rec;
      if (r.cfg) CFG = r.cfg;
      if (r.part && req.part) REC.P[req.part] = r.part;
      return r;
    }, (err) => {
      SYS.offline = true; SYS.retry = () => call(fn, req); paintSys();
      const e = new Error('offline'); e.code = 'offline'; e.cause = err; throw e;
    });
  }

  // ---------- the pupil's own drafts and lesson state: local first, server copy for another machine (D84) ----------
  const kvTimers = {};
  function kvKey(kind, part, twin) { return kind + ':' + ME.cls + ':' + part + (twin ? ':t' : ''); }
  function kvPut(key, val) {
    const box = val == null ? null : { v: val, at: Date.now() };
    LS.set('a2kv:' + key, box);
    clearTimeout(kvTimers[key]);
    kvTimers[key] = setTimeout(() => { delete kvTimers[key]; call('apiKv', { op: 'set', key, val: box ? JSON.stringify(box) : '' }).catch(() => {}); }, 1000);
  }
  function kvLocal(key) { const b = LS.get('a2kv:' + key); return b && b.v !== undefined ? b : null; }
  const kvFetched = {};
  function kvSync(keys) { // pull the server copies once per session; a newer copy wins
    const want = keys.filter((k) => !kvFetched[k]);
    if (!want.length) return Promise.resolve(false);
    return call('apiKv', { op: 'get', keys: want }).then((r) => {
      let changed = false;
      want.forEach((k) => {
        kvFetched[k] = true;
        let srv = null; try { srv = r.vals[k] ? JSON.parse(r.vals[k]) : null; } catch (e) { srv = null; }
        const loc = kvLocal(k);
        if (srv && (!loc || srv.at > loc.at)) { LS.set('a2kv:' + k, srv); changed = true; }
      });
      return changed;
    }, () => false);
  }
  window.addEventListener('pagehide', () => Object.keys(kvTimers).forEach((k) => { clearTimeout(kvTimers[k]); const b = LS.get('a2kv:' + k); call('apiKv', { op: 'set', key: k, val: b ? JSON.stringify(b) : '' }).catch(() => {}); }));

  function lessonState(partId) { const b = kvLocal(kvKey('L', partId)); return (b && b.v) || { step: 0, done: {}, tries: {}, wrong: {}, seed: 0, finished: false, door: null }; }
  function saveLesson(partId, st) { kvPut(kvKey('L', partId), st); }

  // ---------- the practice database (sql.js from the vendor list; D75) ----------
  let SQLP = null, SQLJS = null, SQLFAIL = false;
  function sqlReady() {
    if (SQLP) return SQLP;
    SQLP = new Promise((res, rej) => {
      const bases = (window.A2_VENDOR || []).slice();
      const next = () => {
        const base = bases.shift();
        if (!base) { rej(new Error('sql.js')); return; }
        const s = document.createElement('script');
        s.src = base + 'sql-wasm.js';
        s.onload = () => { window.initSqlJs({ locateFile: (f) => base + f }).then(res, next); };
        s.onerror = () => { s.remove(); next(); };
        document.head.appendChild(s);
      };
      next();
    }).then((sq) => { SQLJS = sq; return sq; }, (e) => { SQLFAIL = true; throw e; });
    return SQLP;
  }
  const nowFix = (sql, d) => sql.replace(/'now'/g, "'" + d + "'"); // the practice rows and the pupil's GETDATE() both mean the pupil's own today (D81)
  function makeDb(seedKey) {
    const db = new SQLJS.Database(), seed = C.seeds[seedKey];
    if (seed) db.exec(nowFix(seed, today()));
    return db;
  }
  function runSql(seedKey, sql) {
    const db = makeDb(seedKey);
    try {
      const r = db.exec(nowFix(Tsql2Sqlite.convert(sql), today()));
      if (!r.length) return { cols: [], rows: [] };
      const last = r[r.length - 1];
      return { cols: last.columns, rows: last.values };
    } finally { db.close(); }
  }
  const noName = (c) => (/[()*+\/|'"]|\s[-+]\s/.test(c) || /^\d/.test(c) ? T('result.noName') : c);
  function gridHtml(res, cap) {
    if (!res) return '';
    const head = '<p><b>' + h(cap) + '</b>' + (res.rows.length > 50 ? ' · ' + h(T('result.showing', { n: res.rows.length })) : '') + '</p>';
    if (!res.rows.length) return head + '<p class="note">' + h(T('result.none')) + '</p>';
    return head + '<div class="scroll"><table><tr>' + res.cols.map((c) => '<th>' + h(noName(c)) + '</th>').join('') + '</tr>' +
      res.rows.slice(0, 50).map((r) => '<tr>' + r.map((v) => '<td>' + (v == null ? 'NULL' : h(v)) + '</td>').join('') + '</tr>').join('') + '</table></div>';
  }
  // D66: values only (numbers normalised), in order only when the question sorts
  const normVal = (v) => { if (v == null) return 'NULL'; const s = String(v).trim(); return /^-?\d+(\.\d+)?$/.test(s) ? String(Number(s)) : s; };
  function sameRows(a, b, ordered) {
    if (!a || !b || a.cols.length !== b.cols.length || a.rows.length !== b.rows.length) return false;
    const rows = (x) => x.rows.map((r) => JSON.stringify(r.map(normVal)));
    const ra = rows(a), rb = rows(b);
    if (!ordered) { ra.sort(); rb.sort(); }
    return ra.every((r, i) => r === rb[i]);
  }

  // ---------- figure: table designs, data, highlight, pick ----------
  const normT = (t) => ({ name: t.name, cols: (t.cols || []).map((c) => (Array.isArray(c) ? { f: c[0], t: c[1] } : c)), pk: t.pk || [], fk: t.fk || [] });
  function tblHtml(t) {
    const rows = t.cols.length ? t.cols.map((c) => '<tr data-f="' + h(t.name + '.' + c.f) + '"><td' + (t.pk.includes(c.f) ? ' class="pk"' : '') + '>' + h(c.f) +
      (t.pk.includes(c.f) ? '<span class="tag">PK</span>' : '') + (t.fk.includes(c.f) ? '<span class="tag">FK</span>' : '') + '</td><td class="t">' + (c.t == null ? '—' : h(c.t)) + '</td></tr>').join('')
      : '<tr><td class="none">—</td></tr>';
    return '<div class="tbl" data-t="' + h(t.name) + '"><h4>' + h(t.name) + '</h4><table>' + rows + '</table></div>';
  }
  function designsHtml(tables, opt) {
    opt = opt || {};
    const norm = tables.map(normT), assumed = (opt.assumed || []).map(normT), all = norm.concat(assumed);
    const anyKey = norm.some((t) => t.pk.length || t.fk.length), noType = all.some((t) => t.cols.some((c) => c.t == null));
    let html = '<div class="tbls">' + norm.map(tblHtml).join('') + '</div>';
    if (assumed.length) html += '<div class="subcap">' + h(T('part.assumed')) + '</div><div class="tbls">' + assumed.map(tblHtml).join('') + '</div>';
    (opt.sample || []).forEach((sr) => {
      const t = all.find((x) => x.name === sr.table), cols = t ? t.cols.map((c) => c.f) : [];
      html += '<div class="sample"><h4>' + h(sr.table) + '</h4><table>' + (cols.length ? '<tr>' + cols.map((c) => '<th>' + h(c) + '</th>').join('') + '</tr>' : '') +
        sr.rows.map((r) => '<tr>' + r.map((v) => '<td>' + h(v) + '</td>').join('') + '</tr>').join('') + '</table></div>';
    });
    html += '<div class="legend">' + h(anyKey ? T('part.legend') : T('part.noKeys')) + (noType ? '<br>' + h(T('part.noTypes')) : '') + '</div>';
    return html;
  }
  const normName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  function dataHtml(seedKey, tables, hides) {
    if (!C.seeds[seedKey]) return '<p class="note">' + h(T('part.noData')) + '</p>';
    if (SQLFAIL) return '<p class="err">' + h(T('guard.dbFail')) + '</p>';
    if (!SQLJS) return '<p class="note" data-dbwait>' + h(T('guard.dbLoading')) + '<span class="dots"></span></p>';
    const db = makeDb(seedKey);
    try {
      const have = (db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY rowid")[0] || { values: [] }).values.map((v) => v[0]);
      const used = {}, order = [];
      tables.forEach((t) => { const m = have.find((x) => normName(x) === normName(t.name)); if (m && !used[m]) { used[m] = 1; order.push([t.name, m]); } });
      have.forEach((x) => { if (!used[x]) order.push([x, x]); });
      return order.map(([shown, real]) => {
        if (hides && normName(hides.table) === normName(shown) && !hides.col) return '';
        const n = db.exec('SELECT COUNT(*) FROM "' + real.replace(/"/g, '""') + '"')[0].values[0][0];
        const r = db.exec('SELECT * FROM "' + real.replace(/"/g, '""') + '" LIMIT 30')[0];
        let cols = r ? r.columns : [], rows = r ? r.values : [];
        if (hides && hides.col && normName(hides.table) === normName(shown)) {
          const i = cols.findIndex((c) => normName(c) === normName(hides.col));
          if (i > -1) { cols = cols.filter((c, k) => k !== i); rows = rows.map((row) => row.filter((c, k) => k !== i)); }
        }
        const cnt = n === 1 ? T('part.rows1') : n > 30 ? T('part.rowsFirst', { n }) : T('part.rows', { n });
        return '<h4>' + h(shown) + '<small>' + h(cnt) + '</small></h4><div class="scroll"><table><tr>' + cols.map((c) => '<th>' + h(c) + '</th>').join('') + '</tr>' +
          rows.map((row) => '<tr>' + row.map((v) => '<td>' + (v == null ? 'NULL' : h(v)) + '</td>').join('') + '</tr>').join('') + '</table></div>';
      }).join('');
    } catch (e) { return '<p class="err">' + h(T('guard.dbFail')) + '</p>'; } finally { db.close(); }
  }
  // panes: [{id, tab, cap, html}] or [{id, tab, cap, data:{seed, tables, hides}}]
  let PANES = [];
  function figureHtml(panes) {
    PANES = panes;
    return '<aside class="figure"><div class="tabs">' + panes.map((p, i) => '<button' + (i === 0 ? ' class="on"' : '') + ' data-tab="' + p.id + '">' + h(p.tab) + '</button>').join('') + '</div>' +
      panes.map((p, i) => '<div data-pane="' + p.id + '"' + (p.data ? ' class="data"' : '') + (i ? ' hidden' : '') + '>' + (p.cap ? '<div class="cap">' + h(p.cap) + '</div>' : '') +
        '<div data-body>' + (p.data ? dataHtml(p.data.seed, p.data.tables, p.data.hides) : p.html) + '</div></div>').join('') + '</aside>';
  }
  function repaintData() {
    PANES.forEach((p) => { if (!p.data) return; const el = app.querySelector('.figure [data-pane="' + p.id + '"] [data-body]'); if (el) el.innerHTML = dataHtml(p.data.seed, p.data.tables, p.data.hides); });
  }
  const byName = (root, sel, attr, val) => Array.prototype.find.call(root.querySelectorAll(sel), (el) => el.getAttribute(attr) === val) || null;
  const FIG = {
    exam: null,
    examHtml() { return FIG.exam ? designsHtml(FIG.exam.tables, { assumed: FIG.exam.assumed }) : ''; },
    showPane(id) {
      const fig = app.querySelector('.figure'); if (!fig) return;
      fig.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
      fig.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== id; });
    },
    highlight(spec) {
      app.querySelectorAll('.figure .hl, .figure .hl2, .figure .strong').forEach((x) => x.classList.remove('hl', 'hl2', 'strong'));
      if (!spec) return;
      const pane = app.querySelector('.figure [data-pane="' + (spec.pane || 'exam') + '"]'); if (!pane) return;
      FIG.showPane(spec.pane || 'exam');
      if (spec.t) { const t = byName(pane, '.tbl[data-t]', 'data-t', spec.t); if (t) { t.classList.add('hl'); if (spec.strong) t.classList.add('strong'); } }
      (spec.f || []).forEach((f) => {
        const r = byName(pane, 'tr[data-f]', 'data-f', f); if (!r) return;
        r.classList.add('hl'); if (spec.strong) r.classList.add('strong');
        const t = r.closest('.tbl'); if (t && !t.classList.contains('hl')) t.classList.add('hl2');
      });
      const first = pane.querySelector('.hl'); if (first && first.scrollIntoView) first.scrollIntoView({ block: 'nearest' });
    },
    pickable(paneId, kind, cb, otherCb) {
      const fig = app.querySelector('.figure'), pane = fig && fig.querySelector('[data-pane="' + paneId + '"]'); if (!pane) return () => {};
      const cls = kind === 'table' ? 'pick-tables' : 'pick-fields';
      fig.querySelectorAll('[data-pane]').forEach((p) => p.classList.add(cls));
      const on = (e) => {
        const hit = kind === 'table' ? e.target.closest('.tbl[data-t]') : e.target.closest('tr[data-f]'); if (!hit) return;
        if (e.target.closest('[data-pane]') !== pane) { if (otherCb) otherCb(); return; }
        cb(kind === 'table' ? hit.dataset.t : hit.dataset.f);
      };
      fig.addEventListener('click', on);
      return () => { fig.querySelectorAll('[data-pane]').forEach((p) => p.classList.remove('pick-tables', 'pick-fields')); fig.removeEventListener('click', on); };
    }
  };

  // ---------- page frame ----------
  function header(crumbs) {
    const left = crumbs ? '<span class="crumb">' + crumbs.map((x) => (x.go ? '<a data-go="' + h(x.go) + '" href="' + h(x.go) + '">' + h(x.t) + '</a>' : h(x.t))).join(' › ') + '</span>'
      : '<span class="title">' + h(T('app.title')) + '</span><span class="school">' + h(T('app.school')) + '</span>';
    return '<header class="bar">' + left + (ME.cls ? '<span class="who">' + h(REC.n || ME.name) + ' · ' + h(ME.cls) + '</span>' : '') + '</header>';
  }
  let LESSON = null;
  function frame(crumbs, mainHtml, mainCls) {
    if (LESSON) { LESSON.destroy(); LESSON = null; }
    app.innerHTML = header(crumbs) + '<div id="sys"></div><main' + (mainCls ? ' class="' + mainCls + '"' : '') + '>' + mainHtml + '</main>';
    paintSys();
  }
  function guard(text, dots) { app.innerHTML = '<div id="sys"></div><div class="guard"><div class="box"><p>' + h(text) + (dots ? '<span class="dots"></span>' : '') + '</p></div></div>'; paintSys(); }
  const paperTitle = (p) => T('map.paper', { year: p.year, title: p.title });
  const crumbSql = () => ({ t: T('map.crumb'), go: '#sql' });

  // ---------- records ----------
  const P = (id) => REC.P[id] || {};
  const isOpen = (pid) => (CFG.open || []).indexOf(pid) !== -1;
  const hasAny = (p) => p.parts.some((q) => REC.P[q.id] && (REC.P[q.id].f != null || REC.P[q.id].t));
  const reachable = (p) => isOpen(p.id) || hasAny(p);
  function paperState(p) {
    let first = 0, best = 0, n = 0;
    p.parts.forEach((q) => { const r = P(q.id); if (r.f != null) { n++; first += r.f; best += r.b != null ? r.b : r.f; } });
    const allF = n === p.parts.length;
    return { first, best, n, allF, done: allF && !!REC.E[p.id] };
  }

  // ---------- home ----------
  function vHome() {
    const open = CFG.order.filter((id) => isOpen(id)).length, done = C.papers.filter((p) => paperState(p).done).length;
    const started = Object.keys(REC.P).length > 0;
    frame(null, '<h1>' + h(T('home.hello', { name: REC.n || ME.name })) + '</h1><div class="tiles">' +
      '<button class="tile live" data-go="#sql"><h2>' + h(T('home.sql')) + '</h2><p>' + h(T('home.sqlSub')) + '</p><span class="state">' + h(started ? T('home.sqlState', { open, done }) : T('home.notStarted')) + '</span></button>' +
      '<div class="tile soon" aria-disabled="true"><h2>' + h(T('home.norm')) + '</h2><span class="soon">' + h(T('home.soon')) + '</span></div>' +
      '<div class="tile soon" aria-disabled="true"><h2>' + h(T('home.theory')) + '</h2><p>' + h(T('home.theorySub')) + '</p><span class="soon">' + h(T('home.soon')) + '</span></div></div>');
  }

  // ---------- SQL map ----------
  function vSql() {
    const rows = CFG.order.map((id) => {
      const p = PAPERS[id]; if (!p) return '';
      const st = paperState(p), can = reachable(p);
      let pill;
      if (!can) pill = '<span class="pill grey">' + h(T('map.locked')) + '</span>';
      else if (st.done) pill = '<span class="pill done">' + h(st.best > st.first ? T('map.doneBest', { first: st.first, best: st.best, marks: p.marks }) : T('map.done', { first: st.first, marks: p.marks })) + '</span>';
      else if (st.n) pill = '<span class="pill go">' + h(T('map.progress', { n: st.n, of: p.parts.length, first: st.first, marks: p.marks })) + '</span>';
      else pill = '<span class="pill go">' + h(T('map.open')) + '</span>';
      return '<li class="' + (can ? 'open' : 'locked') + '"' + (can ? ' data-go="#paper/' + id + '" tabindex="0" role="link"' : '') + '><span><b>' + h(paperTitle(p)) + '</b>' +
        (!can ? '<br><span class="note">' + h(T('map.lockedSub')) + '</span>' : '') + '</span><span>' + h(T('map.marks', { n: p.marks })) + '</span><span>' + h(T('map.parts', { n: p.parts.length })) + '</span>' + pill + '</li>';
    }).join('');
    frame([{ t: T('map.crumb') }], '<h1>' + h(T('map.title')) + '</h1><p class="sub">' + h(T('map.sub')) + '</p><ul class="papers">' + rows + '</ul><p class="note">' + h(T('map.foot')) + '</p>');
  }

  // ---------- paper ----------
  function vPaper(pid) {
    const p = PAPERS[pid];
    if (!p) { go('#sql'); return; }
    flushOutbox();
    if (!reachable(p)) {
      frame([crumbSql(), { t: paperTitle(p) }], '<h1>' + h(paperTitle(p)) + '</h1><div class="card"><p>' + h(T('paper.lockedHere')) + '</p><button class="btn" data-go="#sql">' + h(T('paper.backToPapers')) + '</button></div>');
      return;
    }
    const st = paperState(p);
    const parts = p.parts.map((q) => {
      const r = P(q.id), L = lessonState(q.id), lab = label(q);
      let state;
      if (r.f != null) {
        state = T('paper.first', { first: r.f, marks: q.marks }) + (r.b > r.f ? ' · ' + T('paper.best', { best: r.b, marks: q.marks }) : '');
        if (r.tf != null && r.t && C.twins[r.t]) state += ' · ' + T('paper.another', { t: r.tb != null ? r.tb : r.tf, of: C.twins[r.t].marks });
      } else state = L.door ? T('paper.inProgress') : T('paper.notStarted');
      const btn = r.f != null ? T('paper.review', { label: lab }) : L.door ? T('paper.continue', { label: lab }) : T('paper.start', { label: lab });
      return '<li><b>' + h(lab) + '</b><span>' + h(q.ask) + '</span><span>' + h(marksText(q.marks)) + '</span><span class="state"><span class="note">' + h(state) + '</span><button class="btn sec" data-go="#part/' + q.id + '">' + h(btn) + '</button></span></li>';
    }).join('');
    const tail = st.done ? '<p><b>' + h(T('paper.done', { first: st.first, best: st.best, marks: p.marks })) + '</b></p>'
      : st.allF ? '<p>' + h(T('paper.lastThing')) + '</p><button class="btn" data-go="#eval/' + p.id + '">' + h(T('paper.eval')) + '</button>' : '';
    frame([crumbSql(), { t: paperTitle(p) }], '<h1>' + h(paperTitle(p)) + '</h1><div class="card"><h3>' + h(T('paper.scenario')) + '</h3><p>' + h(p.scenario) + '</p></div>' +
      '<div class="card"><h3>' + h(T('paper.designs')) + '</h3><div class="paperfig">' + designsHtml(p.tables, { assumed: p.assumed, sample: p.sampleRows }) + '</div></div>' +
      '<div class="card"><h3>' + h(T('paper.parts')) + '</h3><ul class="parts">' + parts + '</ul></div>' + tail);
  }

  // ---------- inputs for every answer type ----------
  // q: {type, stub, rows}; value: string | string[] | [{name, reason}]
  function buildInput(host, q, value, onChange) {
    const type = q.type;
    if (type === 'sql' && !(q.kind === 'fragment' && q.stub)) {
      const ed = SqlEditor.create(host, { value: value || '', placeholder: T('turn.placeholder'), label: T('turn.card'), onChange });
      return { get: ed.get, focus: ed.focus };
    }
    if (type === 'sql') { // fragment: the printed start of the script, then the pupil's lines (only the typed lines are sent)
      host.innerHTML = '<div class="stubed"></div><p class="note">' + h(T('turn.stub')) + '</p><div class="typed"></div>';
      SqlEditor.create(host.querySelector('.stubed'), { readOnly: true, value: q.stub });
      const ed = SqlEditor.create(host.querySelector('.typed'), { value: value || '', placeholder: T('turn.placeholder'), label: T('turn.stub'), onChange });
      return { get: ed.get, focus: ed.focus };
    }
    if (type === 'cloze') {
      const parts = String(q.stub || '').split(/⟦(\d+)⟧/), vals = Array.isArray(value) ? value : [];
      let html = '';
      parts.forEach((bit, i) => {
        if (i % 2 === 0) html += SqlEditor.html(bit).replace(/\n$/, '');
        else { const n = +bit; html += '<label><b>' + n + '</b><input type="text" data-blank="' + n + '" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="' + h(T('turn.blank', { n })) + '" value="' + h(vals[n - 1] || '') + '"></label>'; }
      });
      host.innerHTML = '<p class="note">' + h(T('turn.cloze')) + '</p><pre class="cloze">' + html + '</pre>';
      const inputs = Array.prototype.slice.call(host.querySelectorAll('[data-blank]')).sort((a, b) => a.dataset.blank - b.dataset.blank);
      const get = () => inputs.map((x) => x.value);
      inputs.forEach((x) => x.addEventListener('input', () => onChange(get())));
      return { get, focus: () => inputs[0] && inputs[0].focus() };
    }
    if (type === 'rows') {
      const vals = Array.isArray(value) ? value : [];
      host.innerHTML = '<table class="rowsans"><tr><th>' + h(T('turn.rowsField')) + '</th><th>' + h(T('turn.rowsName')) + '</th><th>' + h(T('turn.rowsReason')) + '</th></tr>' +
        (q.rows || []).map((f, i) => '<tr><td class="fld">' + h(f) + '</td><td><input class="txt" data-r="' + i + '" data-k="name" aria-label="' + h(f + ' · ' + T('turn.rowsName')) + '" value="' + h((vals[i] || {}).name || '') + '"></td>' +
          '<td><input class="txt" data-r="' + i + '" data-k="reason" aria-label="' + h(f + ' · ' + T('turn.rowsReason')) + '" value="' + h((vals[i] || {}).reason || '') + '"></td></tr>').join('') + '</table>';
      const get = () => (q.rows || []).map((f, i) => ({ name: host.querySelector('[data-r="' + i + '"][data-k="name"]').value, reason: host.querySelector('[data-r="' + i + '"][data-k="reason"]').value }));
      host.querySelectorAll('input').forEach((x) => x.addEventListener('input', () => onChange(get())));
      return { get, focus: () => { const f = host.querySelector('input'); if (f) f.focus(); } };
    }
    if (type === 'short') {
      host.innerHTML = '<input class="txt" type="text" spellcheck="true" placeholder="' + h(T('turn.short')) + '" aria-label="' + h(T('turn.card')) + '">';
      const el = host.querySelector('input'); el.value = value || '';
      el.addEventListener('input', () => onChange(el.value));
      return { get: () => el.value, focus: () => el.focus() };
    }
    host.innerHTML = '<textarea class="prose" rows="5" spellcheck="true" placeholder="' + h(T('turn.prose')) + '" aria-label="' + h(T('turn.card')) + '"></textarea>';
    const ta = host.querySelector('textarea'); ta.value = value || '';
    ta.addEventListener('input', () => onChange(ta.value));
    return { get: () => ta.value, focus: () => ta.focus() };
  }
  function isEmpty(q, v) {
    if (q.type === 'cloze') return !(v || []).some((x) => String(x || '').trim());
    if (q.type === 'rows') return !(v || []).some((r) => String(r.name || '').trim() || String(r.reason || '').trim());
    return String(v || '').replace(/\s/g, '').length < 3;
  }

  // ---------- the marks card ----------
  function marksHtml(v, line) {
    return '<div class="score">' + v.total + ' <small>/ ' + v.of + '</small></div>' + (v.kind && v.kind !== 'ok' && v.kindNote ? '<p><b>' + h(v.kindNote) + '</b></p>' : '') +
      '<ul class="pts">' + v.points.map((p) => '<li><span class="' + (p.awarded >= p.of ? 'yes' : 'no') + '">' + (p.awarded >= p.of ? '✓' : '✗') + '</span><span>' + h(p.label) + '</span><span class="m">[' +
        (p.awarded > 0 && p.awarded < p.of ? p.awarded + '/' + p.of : p.of) + ']</span>' + (p.hint ? '<span class="hint">' + h(p.hint) + '</span>' : '') + (p.note ? '<span class="note">' + h(p.note) + '</span>' : '') + '</li>').join('') + '</ul>' +
      (line ? '<p class="note">' + h(line) + '</p>' : '');
  }
  function msBox(box, r) {
    box.innerHTML = '<div class="card"><h3>' + h(T('verdict.msTitle')) + '</h3><div data-msbody></div>' + (r.walk && r.walk.length ? '<ol class="walk">' + r.walk.map((w) => '<li>' + h(w) + '</li>').join('') + '</ol>' : '') +
      '<p class="note">' + h(T('verdict.msNote')) + '</p><button class="btn ghost" data-closems>' + h(T('verdict.close')) + '</button></div>';
    const body = box.querySelector('[data-msbody]');
    if (r.sql) SqlEditor.create(body, { readOnly: true, value: r.text, label: T('verdict.msTitle') });
    else body.innerHTML = '<pre class="prosebox">' + h(r.text) + '</pre>';
    box.querySelector('[data-closems]').addEventListener('click', () => { box.innerHTML = ''; });
  }

  // ---------- part screen ----------
  const BEATS = ['ask', 'lesson', 'turn', 'another'];
  function railHtml(beat, cold, marked) {
    const stops = [['ask', 'rail.question'], ['lesson', 'rail.lesson'], ['turn', 'rail.turn'], ['another', 'rail.another']], i = BEATS.indexOf(beat);
    return '<nav class="rail">' + stops.map(([b, k], n) => {
      let cls = n < i ? 'done' : n === i ? 'now' : '', sub = '';
      if (cold && !marked && n < 2) { cls = 'skip'; sub = '<small>' + h(T('rail.skipped')) + '</small>'; }
      return n === i ? '<span class="st ' + cls + '" aria-current="step"><i></i><span>' + h(T(k)) + sub + '</span></span>'
        : '<button class="st ' + cls + '" data-beat="' + b + '"><i></i><span>' + h(T(k)) + sub + '</span></button>';
    }).join('') + '</nav>';
  }
  function skillsFull(part) {
    return (part.skills || []).length > 0 && part.skills.every((s) => C.papers.some((p) => p.parts.some((q) => (q.skills || []).includes(s) && P(q.id).b === q.marks)));
  }
  function askBlock(part) { return (part.lead ? '<p class="lead">' + h(part.lead) + '</p>' : '') + '<p class="ask"><q>' + h(part.ask) + '</q></p>'; }

  let CUR = null; // {id, beat} of the part on screen
  function vPart(id, beatArg) {
    const hit = PARTS[id];
    if (!hit) { go('#sql'); return; }
    const p = hit.paper, part = hit.part;
    if (!reachable(p)) { go('#paper/' + p.id); return; }
    const keys = [kvKey('L', id), kvKey('draft', id), kvKey('draft', id, true)];
    const want = keys.some((k) => !kvFetched[k]);
    renderPart(p, part, beatArg);
    if (want) kvSync(keys).then((changed) => { if (changed && CUR && CUR.id === id && !CUR.dirty) renderPart(p, part, beatArg); });
  }
  function renderPart(p, part, beatArg) {
    const id = part.id, r = P(id), L = lessonState(id), marked = r.f != null;
    let beat = beatArg;
    if (!beat) beat = marked ? 'turn' : !L.door ? 'door' : L.door === 'cold' ? 'turn' : L.finished ? 'turn' : (L.step > 0 || Object.keys(L.done || {}).length) ? 'lesson' : 'ask';
    if (beat === 'door' && marked) beat = 'turn';
    // D82: the question or the lesson opened before a first mark means the pupil is learning it first
    if (!marked && (beat === 'ask' || beat === 'lesson') && L.door !== 'learn') { L.door = 'learn'; saveLesson(id, L); }
    const cold = marked ? r.d === 1 : L.door === 'cold';
    CUR = { id, beat, dirty: false };
    const lesson = C.lessons[part.lesson], view = lesson ? LessonView.view(lesson, part, today()) : null;
    FIG.exam = { tables: p.tables, assumed: p.assumed };
    const examPane = { id: 'exam', tab: T('part.tabDesigns'), html: designsHtml(p.tables, { assumed: p.assumed, sample: p.sampleRows }) };
    const dataPane = { id: 'data', tab: T('part.tabData'), cap: T('part.capData'), data: { seed: p.id, tables: p.tables.concat(p.assumed || []), hides: part.hides } };
    let panes = [examPane, dataPane];
    let tw = null;
    if (beat === 'lesson' && view) {
      const setT = ((C.sets[view.set] || {}).tables || []).map(normT);
      let lt = view.focus && view.focus.length ? setT.filter((t) => view.focus.includes(t.name)) : setT.slice();
      (view.tables || []).map(normT).forEach((vt) => { const i = lt.findIndex((t) => t.name === vt.name); if (i > -1) lt[i] = vt; else lt.push(vt); });
      panes = [{ id: 'lesson', tab: T('part.tabLesson'), cap: T('part.capLesson'), html: designsHtml(lt) },
        { id: 'exam', tab: T('part.tabExam', { year: p.year }), cap: T('part.capExamLesson'), html: designsHtml(p.tables, { assumed: p.assumed }) }];
    }
    if (beat === 'another' && r.t && C.twins[r.t]) {
      tw = C.twins[r.t];
      const tt = tw.tables || (C.sets[tw.set] || {}).tables || [];
      panes = [{ id: 'practice', tab: T('part.tabPractice'), cap: T('part.capPractice'), html: designsHtml(tt) },
        { id: 'data', tab: T('part.tabData'), cap: T('part.capDataPractice'), data: { seed: 'tinies-' + tw.set, tables: tt } }];
    }
    const lab = label(part), headLine = '<h2>' + h(T('part.head', { label: lab, marks: marksText(part.marks) })) + '</h2>';
    let body = '';
    if (beat === 'door') {
      const full = skillsFull(part), text = isText(part);
      body = headLine + askBlock(part) + '<div class="doors"><button class="door" data-door="learn">' + (!full ? '<span class="sug">' + h(T('door.suggested')) + '</span>' : '') + '<b>' + h(T('door.learn')) + '</b><span>' + h(T(text ? 'door.learnSubText' : 'door.learnSub')) + '</span></button>' +
        '<button class="door" data-door="cold">' + (full ? '<span class="sug">' + h(T('door.suggested')) + '</span>' : '') + '<b>' + h(T('door.cold')) + '</b><span>' + h(T('door.coldSub')) + '</span></button></div><p class="note">' + h(T('door.note')) + '</p>';
    } else if (beat === 'ask') {
      const needs = view ? view.steps.filter((s) => !s.whole).map((s) => s.name) : [];
      body = railHtml('ask', cold, marked) + headLine + askBlock(part) +
        '<div class="card"><h3>' + h(T('ask.marking')) + '</h3><p class="note">' + h(T('ask.markingNote')) + '</p><ul class="marklist">' + (part.points || []).map((pt) => '<li><span>' + h(pt.label) + '</span><span class="mk">' + h(marksText(pt.of)) + '</span></li>').join('') + '</ul></div>' +
        (needs.length ? '<div class="card"><h3>' + h(T('ask.needs')) + '</h3><p>' + needs.map((n) => '<b>' + h(n) + '</b>').join(' · ') + '</p><p class="note">' + h(T('ask.needsNote')) + '</p></div>' : '') +
        (part.habits && part.habits.length ? '<div class="card"><h3>' + h(T('ask.habits')) + '</h3><ul class="habits">' + part.habits.map((x) => '<li>' + h(x) + '</li>').join('') + '</ul></div>' : '') +
        '<div class="row"><button class="btn" data-beat="lesson">' + h(T('ask.next')) + '</button><button class="btn ghost" data-beat="turn">' + h(T('ask.skip')) + '</button></div>';
    } else if (beat === 'lesson') {
      body = railHtml('lesson', cold, marked) + '<div id="lesson"></div>';
    } else if (beat === 'turn') {
      body = railHtml('turn', cold, marked) + headLine + '<div class="card"><h3>' + h(T('turn.card')) + '</h3>' + askBlock(part) + '<div id="turn-in"></div><p class="note" data-kept hidden>' + h(T('turn.kept')) + '</p>' +
        '<div class="row">' + (part.kind === 'select' ? '<button class="btn sec" data-run>' + h(T('turn.run')) + '</button>' : '') + '<button class="btn" data-submit disabled>' + h(T('turn.submit')) + '</button><span class="note" data-typefirst>' + h(T('turn.typeFirst')) + '</span></div><div data-confirm></div></div>' +
        '<div id="result"></div><div id="verdict"></div>';
    } else {
      body = railHtml('another', cold, marked) + '<div id="another"><p class="note">' + h(T('turn.marking')).replace('…', '') + '<span class="dots"></span></p></div>';
    }
    frame([crumbSql(), { t: paperTitle(p), go: '#paper/' + p.id }, { t: T('part.crumb', { label: lab }) }], figureHtml(panes) + '<section class="work">' + body + '</section>', 'split');
    app.insertAdjacentHTML('beforeend', '<button class="flag' + (r.fl ? ' on' : '') + '" data-flag>' + h(r.fl ? T('flag.on') : T('flag.ask')) + '</button>');
    wirePart(p, part, beat, view, L);
  }

  function wirePart(p, part, beat, view, L) {
    const id = part.id;
    app.querySelectorAll('[data-door]').forEach((b) => b.addEventListener('click', () => {
      L.door = b.dataset.door; saveLesson(id, L); go('#part/' + id + '/' + (L.door === 'cold' ? 'turn' : 'ask'));
    }));
    app.querySelectorAll('[data-beat]').forEach((b) => b.addEventListener('click', () => go('#part/' + id + '/' + b.dataset.beat)));
    const flag = app.querySelector('[data-flag]');
    flag.addEventListener('click', () => {
      const on = !P(id).fl; flag.disabled = true;
      call('apiFlag', { part: id, beat: CUR && CUR.beat === 'another' ? 'another' : beat, on }).then(() => {
        flag.classList.toggle('on', !!P(id).fl); flag.textContent = P(id).fl ? T('flag.on') : T('flag.ask');
      }, () => {}).then(() => { flag.disabled = false; });
    });
    if (beat === 'lesson') {
      const host = document.getElementById('lesson');
      if (!view) { host.innerHTML = '<div class="card"><button class="btn" data-beat="turn">' + h(T('lesson.toTurn')) + '</button></div>'; host.querySelector('[data-beat]').addEventListener('click', () => go('#part/' + id + '/turn')); return; }
      LESSON = Lesson.render(host, { view, state: L, T, year: p.year, figure: FIG, save: () => saveLesson(id, L), onOut: (b) => go('#part/' + id + '/' + b) });
    }
    if (beat === 'turn') wireTurn(p, part);
    if (beat === 'another') wireAnother(p, part);
  }

  function wireTurn(p, part) {
    const id = part.id, sub = app.querySelector('[data-submit]'), tf = app.querySelector('[data-typefirst]'), conf = app.querySelector('[data-confirm]');
    const dkey = kvKey('draft', id), d = kvLocal(dkey);
    const onChange = (v) => { CUR.dirty = true; const ok = !isEmpty(part, v); sub.disabled = !ok; tf.hidden = ok; kvPut(dkey, v); };
    const input = buildInput(document.getElementById('turn-in'), part, d ? d.v : null, onChange);
    if (d && d.v != null && !isEmpty(part, d.v) && P(id).f == null) app.querySelector('[data-kept]').hidden = false;
    const ok0 = !isEmpty(part, input.get()); sub.disabled = !ok0; tf.hidden = ok0;
    const run = app.querySelector('[data-run]');
    if (run) run.addEventListener('click', () => {
      const box = document.getElementById('result');
      if (isEmpty(part, input.get())) { box.innerHTML = '<div class="card result"><p class="note">' + h(T('turn.typeFirst')) + '</p></div>'; return; }
      box.innerHTML = '<div class="card result"><p class="note">' + h(T('guard.dbLoading')) + '<span class="dots"></span></p></div>';
      sqlReady().then(() => {
        let html;
        try { html = gridHtml(runSql(p.id, input.get()), T('result.title')); }
        catch (e) { html = '<p>' + h(T('result.err', { err: String((e && e.message) || e).split('\n')[0] })) + '</p>'; }
        box.innerHTML = '<div class="card result">' + html + '</div>';
      }, () => { box.innerHTML = '<div class="card result"><p class="err">' + h(T('guard.dbFail')) + '</p></div>'; });
    });
    const vkey = 'a2v:' + ME.cls + ':' + id, cached = LS.get(vkey);
    if (P(id).f != null && cached && cached.verdict) showVerdict(p, part, cached, input);
    const mark = () => {
      conf.innerHTML = ''; sub.disabled = true;
      const vbox = document.getElementById('verdict');
      vbox.innerHTML = '<p class="note">' + h(T('turn.marking')) + '</p>';
      const L = lessonState(id), text = input.get();
      call('apiMark', { part: id, input: text, door: L.door === 'cold' ? 1 : 0, today: today() }).then((r) => {
        const out = { verdict: r.verdict, first: r.first, expected: r.expected || null, yours: null, err: null };
        const finish = () => { LS.set(vkey, out); showVerdict(p, part, out, input); sub.disabled = false; vbox.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
        if (part.kind === 'select' && r.expected) {
          sqlReady().then(() => { try { out.yours = runSql(p.id, text); } catch (e) { out.err = String((e && e.message) || e).split('\n')[0]; } finish(); }, finish);
        } else finish();
      }, (e) => {
        sub.disabled = false;
        vbox.innerHTML = e.code === 'locked' ? '<p class="err">' + h(T('sys.locked')) + '</p>' : e.code === 'empty' ? '<p class="err">' + h(T('turn.typeFirst')) + '</p>' : '';
      });
    };
    sub.addEventListener('click', () => {
      if (isEmpty(part, input.get())) return;
      if (P(id).f == null) {
        conf.innerHTML = '<div class="confirm">' + h(T('turn.confirm')) + ' <button class="btn" data-yes>' + h(T('turn.yes')) + '</button> <button class="btn ghost" data-no>' + h(T('turn.no')) + '</button></div>';
        conf.querySelector('[data-yes]').addEventListener('click', mark);
        conf.querySelector('[data-no]').addEventListener('click', () => { conf.innerHTML = ''; });
        conf.querySelector('[data-yes]').focus();
      } else mark();
    });
  }

  function showVerdict(p, part, out, input) {
    const id = part.id, r = P(id), v = out.verdict, cold = r.d === 1;
    const line = (r.a || 1) <= 1 ? T(cold ? 'verdict.firstCold' : 'verdict.first', { t: r.f != null ? r.f : v.total, of: v.of }) + ' ' + T((r.f != null ? r.f : v.total) === v.of ? 'verdict.full' : 'verdict.more')
      : T('verdict.attempt', { n: r.a, t: v.total, of: v.of, best: r.b });
    let resCard = '';
    if (part.kind === 'select' && out.expected) {
      const exp = { cols: out.expected.cols, rows: out.expected.rows };
      const same = out.yours ? sameRows(out.yours, exp, out.expected.ordered) : false;
      resCard = '<div class="card result"><h3>' + h(T('result.title')) + ' <span class="' + (same ? 'same' : 'diff') + '">' + h(T(same ? 'result.same' : out.err ? 'result.noRun' : 'result.diff')) + '</span></h3>' +
        (out.err ? '<p><b>' + h(T('result.yours')) + '</b></p><p>' + h(T('result.err', { err: out.err })) + '</p>' : gridHtml(out.yours, T('result.yours'))) + gridHtml(exp, T('result.expected')) + '<p class="note">' + h(T('result.expectedNote')) + '</p></div>';
    }
    let html = '<div class="' + (resCard ? 'marks' : '') + '"><div class="card"><h3>' + h(T('verdict.title')) + '</h3>' + marksHtml(v, line) + '</div>' + resCard + '</div>' +
      '<div class="row"><button class="btn" data-again>' + h(T('verdict.again')) + '</button><button class="btn sec" data-showms>' + h(T('verdict.showMs')) + '</button><button class="btn" data-beat="another">' + h(T('verdict.nextQ')) + '</button></div><div id="ms-box"></div>';
    if (cold) html += '<div class="card"><h3>' + h(T('verdict.wasMarking')) + '</h3><ul class="check">' + v.points.map((pt) => '<li class="' + (pt.awarded >= pt.of ? 'hit' : 'miss') + '">' + h(pt.label) + ' <span class="note">[' + pt.awarded + '/' + pt.of + ']</span></li>').join('') + '</ul></div>' +
      '<div class="card"><h3>' + h(T('verdict.lesson')) + '</h3><p class="note">' + h(T(isText(part) ? 'verdict.lessonNoteText' : 'verdict.lessonNote')) + '</p><button class="btn sec" data-beat="lesson">' + h(T('verdict.openLesson')) + '</button></div>';
    const box = document.getElementById('verdict');
    box.innerHTML = html;
    box.querySelector('[data-again]').addEventListener('click', () => { input.focus(); document.getElementById('turn-in').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    box.querySelector('[data-showms]').addEventListener('click', (e) => {
      const b = e.currentTarget; b.disabled = true;
      call('apiAnswer', { part: id, which: 'part' }).then((r2) => msBox(document.getElementById('ms-box'), r2), () => {}).then(() => { b.disabled = false; });
    });
    box.querySelectorAll('[data-beat]').forEach((b) => b.addEventListener('click', () => go('#part/' + id + '/' + b.dataset.beat)));
  }

  function wireAnother(p, part) {
    const id = part.id, host = document.getElementById('another');
    const back = '<button class="btn" data-go="#paper/' + p.id + '">' + h(T('aq.back')) + '</button>';
    call('apiTwin', { part: id }).then((r) => {
      if (!CUR || CUR.id !== id || CUR.beat !== 'another') return;
      if (r.after) { host.innerHTML = '<div class="card"><p>' + h(T('aq.after')) + '</p><button class="btn" data-beat="turn">' + h(T('aq.toTurn')) + '</button></div>'; host.querySelector('[data-beat]').addEventListener('click', () => go('#part/' + id + '/turn')); return; }
      if (r.waived) { host.innerHTML = '<div class="card"><h3>' + h(T('aq.doneTitle')) + '</h3><p>' + h(T('aq.done')) + '</p>' + back + '</div>'; return; }
      if (r.none || !C.twins[r.twin]) { host.innerHTML = '<div class="card"><p>' + h(T('aq.none')) + '</p>' + back + '</div>'; return; }
      if (!document.querySelector('[data-pane="practice"]')) { renderPart(p, part, 'another'); return; } // first assignment: repaint with the practice tables
      twinCard(p, part, C.twins[r.twin], host, back);
    }, () => { host.innerHTML = ''; });
  }
  function twinCard(p, part, tw, host, back) {
    const id = part.id, dkey = kvKey('draft', id, true), d = kvLocal(dkey), vkey = 'a2v:' + ME.cls + ':' + id + ':t';
    host.innerHTML = '<div class="card"><h3>' + h(T('aq.title')) + '</h3><p>' + h(tw.intro) + '</p>' + (tw.bullets && tw.bullets.length ? '<ul class="bullets">' + tw.bullets.map((b) => '<li>' + h(b) + '</li>').join('') + '</ul>' : '') +
      '<p><b>' + h(tw.prompt) + '</b></p><div id="aq-in"></div><div class="row">' + (tw.kind === 'select' && C.seeds['tinies-' + tw.set] ? '<button class="btn sec" data-run>' + h(T('turn.run')) + '</button>' : '') +
      '<button class="btn" data-submit disabled>' + h(T('turn.submit')) + '</button><span class="note">' + h(T('aq.recorded')) + '</span></div></div><div id="result"></div><div id="verdict"></div>';
    const sub = host.querySelector('[data-submit]');
    const input = buildInput(document.getElementById('aq-in'), tw, d ? d.v : null, (v) => { CUR.dirty = true; sub.disabled = isEmpty(tw, v); kvPut(dkey, v); });
    sub.disabled = isEmpty(tw, input.get());
    const run = host.querySelector('[data-run]');
    if (run) run.addEventListener('click', () => {
      const box = document.getElementById('result');
      box.innerHTML = '<div class="card result"><p class="note">' + h(T('guard.dbLoading')) + '<span class="dots"></span></p></div>';
      sqlReady().then(() => {
        let html;
        try { html = gridHtml(runSql('tinies-' + tw.set, input.get()), T('result.title')); }
        catch (e) { html = '<p>' + h(T('result.err', { err: String((e && e.message) || e).split('\n')[0] })) + '</p>'; }
        box.innerHTML = '<div class="card result">' + html + '</div>';
      }, () => { box.innerHTML = '<div class="card result"><p class="err">' + h(T('guard.dbFail')) + '</p></div>'; });
    });
    const show = (v) => {
      const r = P(id), line = (r.ta || 1) <= 1 ? T('aq.line', { t: v.total, of: v.of }) : T('aq.lineBest', { t: v.total, of: v.of, best: r.tb });
      const box = document.getElementById('verdict');
      box.innerHTML = '<div class="card"><h3>' + h(T('verdict.title')) + '</h3>' + marksHtml(v, line) + '</div><div class="row"><button class="btn" data-again>' + h(T('verdict.again')) + '</button><button class="btn sec" data-showms>' + h(T('verdict.showMs')) + '</button>' + back + '</div><div id="ms-box"></div>';
      box.querySelector('[data-again]').addEventListener('click', () => { input.focus(); document.getElementById('aq-in').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      box.querySelector('[data-showms]').addEventListener('click', (e) => {
        const b = e.currentTarget; b.disabled = true;
        call('apiAnswer', { part: id, which: 'twin' }).then((r2) => msBox(document.getElementById('ms-box'), r2), () => {}).then(() => { b.disabled = false; });
      });
    };
    const cached = LS.get(vkey);
    if (P(id).tf != null && cached && cached.verdict) show(cached.verdict);
    sub.addEventListener('click', () => {
      if (isEmpty(tw, input.get())) return;
      sub.disabled = true;
      document.getElementById('verdict').innerHTML = '<p class="note">' + h(T('turn.marking')) + '</p>';
      call('apiTwinMark', { part: id, input: input.get() }).then((r) => { LS.set(vkey, { verdict: r.verdict }); show(r.verdict); document.getElementById('verdict').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
        (e) => { document.getElementById('verdict').innerHTML = e.code === 'empty' ? '<p class="err">' + h(T('turn.typeFirst')) + '</p>' : ''; }).then(() => { sub.disabled = false; });
    });
  }

  // ---------- How did it go? (D83: the lines follow the skills the paper used, in order of first need, at most five) ----------
  const GROUPS = {
    CREATE: ['CREATE', 'COLTYPES', 'PK', 'PK2', 'FK', 'NOTNULL', 'IDENTITY', 'DEFAULT', 'CHECK'], ALTER: ['ALTER'], INSERT: ['INSERT', 'INSERTCOLS', 'INSERTMULTI', 'INSERTSELECT'],
    UPDATE: ['UPDATE', 'ARITH'], JOIN: ['SELECT', 'SELECTMULTI', 'JOIN', 'JOIN3+', 'LEFTJOIN', 'ALIAS', 'CONCAT', 'CAST', 'ISNULL'],
    WHERE: ['WHERE', 'WHERETEXT', 'WHEREDATE', 'WHERENUM', 'AND', 'OR', 'BETWEEN', 'NOTEQ'], GROUP: ['COUNT', 'COUNTDISTINCT', 'SUM', 'AVG', 'GROUPBY', 'HAVING'],
    ORDER: ['ORDERBY', 'DESC'], DATE: ['GETDATE', 'DATEDIFF', 'DATEADD', 'YEARMONTH'], PROSE: ['DESIGN']
  };
  const groupOf = (skill) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(skill)) || null;
  function evalGroups(p) {
    const out = [];
    p.parts.forEach((q) => {
      const gs = isText(q) ? ['PROSE'] : (q.skills || []).map(groupOf);
      gs.forEach((g) => { if (g && !out.includes(g)) out.push(g); });
    });
    return out.slice(0, 5);
  }
  function flushOutbox() {
    if (!ME.cls) return;
    C.papers.forEach((p) => {
      const k = 'a2ev:' + ME.cls + ':' + p.id, box = LS.get(k);
      if (!box) return;
      if (REC.E[p.id]) { LS.set(k, null); return; }
      window.OLS_TRANSPORT.call('apiEval', Object.assign({ cls: ME.cls }, box)).then((r) => { if (r && r.ok !== false) { LS.set(k, null); if (r.rec) REC = r.rec; } }, () => {});
    });
  }
  function vEval(pid) {
    const p = PAPERS[pid];
    if (!p || !reachable(p)) { go('#sql'); return; }
    const crumbs = [crumbSql(), { t: paperTitle(p), go: '#paper/' + pid }, { t: T('ev.title') }];
    const shell = (inner) => frame(crumbs, '<h1>' + h(T('ev.title')) + '</h1><p class="sub">' + h(paperTitle(p)) + '</p>' + inner, 'ev');
    if (REC.E[pid]) { shell('<div class="card"><p>' + h(T('ev.already')) + '</p><button class="btn" data-go="#sql">' + h(T('ev.back')) + '</button></div>'); return; }
    if (!paperState(p).allF) { shell('<div class="card"><p>' + h(T('ev.notYet')) + '</p><button class="btn" data-go="#paper/' + pid + '">' + h(T('ev.backPaper')) + '</button></div>'); return; }
    const outbox = LS.get('a2ev:' + ME.cls + ':' + pid);
    if (outbox) { shell('<div class="card"><p>' + h(T('ev.offline')) + '</p><button class="btn" data-go="#sql">' + h(T('ev.back')) + '</button></div>'); flushOutbox(); return; }
    const groups = evalGroups(p), ans = { l: {}, f: null, c: '' };
    const seg = (attr, opts) => '<span class="seg" role="radiogroup" ' + attr + '>' + opts.map(([v, k]) => '<button type="button" role="radio" aria-checked="false" data-v="' + v + '">' + h(T(k)) + '</button>').join('') + '</span>';
    const lines = groups.map((g) => '<div class="line"><span>' + h(T('ev.line.' + g)) + '</span>' + seg('data-line="' + g + '"', [[0, 'ev.can'], [1, 'ev.getting'], [2, 'ev.not']]) + '</div>').join('');
    shell('<div class="card">' + lines + '<div class="line"><span><b>' + h(T('ev.feel')) + '</b></span>' + seg('data-feel', [[0, 'ev.easy'], [1, 'ev.right'], [2, 'ev.tricky']]) + '</div>' +
      '<div><textarea class="comment" maxlength="60" placeholder="' + h(T('ev.placeholder')) + '" aria-label="' + h(T('ev.placeholder')) + '"></textarea><div class="count">' + h(T('ev.left', { n: 60 })) + '</div></div>' +
      '<p class="note" data-lock>' + h(T('ev.lock')) + '</p><button class="btn" data-send disabled>' + h(T('ev.send')) + '</button></div>');
    const send = app.querySelector('[data-send]'), lock = app.querySelector('[data-lock]');
    const check = () => { const ok = groups.every((g) => ans.l[g] != null) && ans.f != null; send.disabled = !ok; lock.hidden = ok; };
    app.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
      const sg = b.parentElement;
      sg.querySelectorAll('button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
      if (sg.dataset.line) ans.l[sg.dataset.line] = +b.dataset.v; else ans.f = +b.dataset.v;
      check();
    }));
    const ta = app.querySelector('textarea.comment'), cnt = app.querySelector('.count');
    ta.addEventListener('input', () => { const left = 60 - ta.value.length; cnt.textContent = left > 1 ? T('ev.left', { n: left }) : left === 1 ? T('ev.left1') : T('ev.full'); ans.c = ta.value; });
    send.addEventListener('click', () => {
      const card = app.querySelector('.card'), req = { paper: pid, l: ans.l, f: ans.f, c: ans.c };
      card.innerHTML = '<p>' + h(T('ev.sending')) + '</p>';
      call('apiEval', req).then((r) => {
        card.innerHTML = '<p><b>' + h(T(r.already ? 'ev.already' : 'ev.sent')) + '</b></p><button class="btn" data-go="#sql">' + h(T('ev.back')) + '</button>';
      }, (e) => {
        if (e.code === 'offline') { LS.set('a2ev:' + ME.cls + ':' + pid, req); card.innerHTML = '<p>' + h(T('ev.offline')) + '</p><button class="btn" data-go="#sql">' + h(T('ev.back')) + '</button>'; }
        else if (e.code === 'not-yet') card.innerHTML = '<p>' + h(T('ev.notYet')) + '</p><button class="btn" data-go="#paper/' + pid + '">' + h(T('ev.backPaper')) + '</button>';
        else card.innerHTML = '<p class="err">' + h(T('sys.offline')) + '</p><button class="btn" data-go="#paper/' + pid + '">' + h(T('ev.backPaper')) + '</button>';
      });
    });
  }

  // ---------- routing ----------
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function route() {
    if (!ME.cls) return;
    const bits = (location.hash || '#home').slice(1).split('/'), k = bits[0];
    if (k === 'sql') vSql();
    else if (k === 'paper') vPaper(bits[1]);
    else if (k === 'part') vPart(bits[1], BEATS.concat('door').includes(bits[2]) ? bits[2] : null);
    else if (k === 'eval') vEval(bits[1]);
    else vHome();
    const w = app.querySelector('.work') || app.querySelector('main'); if (w) w.scrollTop = 0;
  }
  function fitTables() {
    if (!app) return;
    app.querySelectorAll('.tbl').forEach((t) => { if (t.classList.contains('wide') || !t.clientWidth) return; const tb = t.querySelector('table'); if (tb && tb.scrollWidth > t.clientWidth + 1) t.classList.add('wide'); });
  }

  function start(r) {
    ME = { email: r.email, cls: r.cls, name: r.name || '' };
    REC = r.rec || REC; CFG = r.cfg || CFG;
    sqlReady().then(repaintData, repaintData);
    setInterval(() => { if (!document.hidden) call('apiPing').catch(() => {}); }, 60000);
    flushOutbox();
    route();
  }
  function askName(r) {
    app.innerHTML = '<div id="sys"></div><div class="guard"><div class="box"><p>' + h(T('guard.nameAsk')) + '</p><input type="text" maxlength="40" autocomplete="given-name" aria-label="' + h(T('guard.nameAsk')) + '"><button class="btn" disabled>' + h(T('guard.continue')) + '</button></div></div>';
    const inp = app.querySelector('input'), btn = app.querySelector('.guard .btn');
    inp.addEventListener('input', () => { btn.disabled = !inp.value.trim(); });
    const send = () => { const name = inp.value.trim(); if (!name) return; btn.disabled = true; ME.cls = r.cls; call('apiName', { name }).then((x) => { r.name = x.name; REC.n = x.name; start(r); }, () => { btn.disabled = false; }); };
    btn.addEventListener('click', send);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    inp.focus();
  }
  function boot() {
    app = document.getElementById('app');
    document.addEventListener('click', (e) => {
      const s = e.target.closest('[data-sys]');
      if (s) { if (s.dataset.sys === 'reload') location.reload(); else if (SYS.retry) { const f = SYS.retry; SYS.retry = null; f().then(() => route(), () => {}); } return; }
      const t = e.target.closest('[data-go]');
      if (t) { e.preventDefault(); go(t.dataset.go); return; }
      const tab = e.target.closest('.figure .tabs button');
      if (tab) FIG.showPane(tab.dataset.tab);
    });
    document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('li[data-go]')) { e.preventDefault(); go(e.target.dataset.go); } });
    new MutationObserver(fitTables).observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    window.addEventListener('resize', fitTables);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTables);
    window.addEventListener('hashchange', route);
    const cls = (window.OLS_BOOT && window.OLS_BOOT.classCode) || '';
    guard(T('guard.signing'), true);
    window.OLS_TRANSPORT.call('apiBoot', { cls }).then((r) => {
      if (r && r.v && BUILD && r.v !== BUILD) SYS.stale = true;
      if (!r || r.ok === false) {
        const code = r && r.error;
        guard(code === 'unknown-class' ? T('guard.noClass') : T('guard.domain'));
        return;
      }
      if (r.staff) { window.Staff.boot(app, r); return; }
      if (r.needName) askName(r); else start(r);
    }, () => { SYS.offline = true; SYS.retry = () => { location.reload(); return Promise.resolve(); }; guard(T('guard.signing'), true); paintSys(); });
  }
  window.App = { boot, T, h };
})();
