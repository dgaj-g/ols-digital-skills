/* The Glass Jotter — app shell.
   Loads LAST. Owns: boot, transport (online OLS_TRANSPORT / offline localStorage
   with demo mode), screen routing, the shelf, activity section flow, save
   plumbing + summary building, progress instruments. Question UI lives in
   jotter.js; movies in player.js; the markbook in staff.js. */
(function () {
  'use strict';

  var GJ = (window.GJ = window.GJ || {});

  /* ── boot context ─────────────────────────────────────────────── */
  var BOOT = window.OLS_BOOT || null;
  if (!BOOT) {
    // static page (github.io / local preview) may read its own URL
    var qs = {};
    try {
      location.search.replace(/[?&]([^=&]+)=([^&]*)/g, function (_, k, v) {
        qs[decodeURIComponent(k)] = decodeURIComponent(v);
      });
    } catch (e) {}
    BOOT = { classCode: qs['class'] || 'default', baseUrl: '' };
  }

  var ACTIVITIES = [
    { id: 'angles',  title: 'Angles',  sub: 'The Geometry Set', accent: '#0F6B66', meta: 'Ex. M2·01 · CCEA M2', motif: 'protractor' },
    { id: 'algebra', title: 'Algebra', sub: 'Ink & Balance',    accent: '#7A3B5E', meta: 'Ex. M2·02 · CCEA M2', motif: 'radical' }
  ];

  /* ═════════ offline transport (localStorage, full parity + demo) ═ */
  var LSKEY = 'gj-offline-v1';

  function lsLoad() {
    try { return JSON.parse(localStorage.getItem(LSKEY)) || {}; } catch (e) { return {}; }
  }
  function lsSave(s) {
    try { localStorage.setItem(LSKEY, JSON.stringify(s)); } catch (e) {}
  }
  function store() {
    var s = lsLoad();
    s.classes = s.classes || [{ name: BOOT.classCode, acts: { angles: true, algebra: true } }];
    s.data = s.data || {};   // data[class][email][act] = {state, summary}
    s.names = s.names || {};
    return s;
  }
  var OFFLINE_EMAIL = 'you@offline.preview';

  /* — demo seeding: real engines mark synthetic pupils, so the Wall
       demo shows authentic marking, not painted data — */
  var DEMO_CLASS = '10B Maths (demo)';
  var DEMO_PUPILS = [
    ['Aoife Magee', 'strong'], ['Caoimhe Devlin', 'mid'], ['Niamh Rice', 'strong'],
    ['Orla Sands', 'weak'], ['Saoirse Byrne', 'mid'], ['Grainne Keenan', 'amber'],
    ['Meabh O’Hare', 'strong'], ['Clodagh Hughes', 'mid'], ['Aisling Toner', 'weak'],
    ['Roisin Grant', 'mid'], ['Erin McCabe', 'live'], ['Cara Loughran', 'strong']
  ];

  function fmtRat(r) {
    if (!r) return '?';
    if (typeof r === 'number') return String(r);
    return r.d === 1 ? String(r.n) : (r.n + '/' + r.d);
  }
  function fmtSide(c) { // {c1,c0} rationals → '5x − 15' (display unicode minus)
    var parts = [];
    if (c.c1 && c.c1.n !== 0) parts.push((c.c1.n === 1 && c.c1.d === 1) ? 'x' : fmtRat(c.c1) + 'x');
    if (c.c0 && c.c0.n !== 0) {
      var neg = c.c0.n < 0;
      var abs = { n: Math.abs(c.c0.n), d: c.c0.d };
      if (!parts.length) parts.push((neg ? '−' : '') + fmtRat(abs));
      else parts.push((neg ? '− ' : '+ ') + fmtRat(abs));
    }
    if (!parts.length) parts.push('0');
    return parts.join(' ');
  }

  function modelSolveLines(q) {
    // Generic correct route for a linear solve question, built from canonical
    // forms so the demo pupils' jotters contain real, markable working.
    var M = window.GJ_MATH;
    if (!M || !q.start) return null;
    try {
      var p = M.parse(q.start);
      if (!p.ok || !p.ast || !p.ast.eq) return null;
      var L = M.canonSide(p.ast.lhs), R = M.canonSide(p.ast.rhs);
      if (!L || !R || (L.c2 && L.c2.n) || (R.c2 && R.c2.n)) return null;
      var lines = [];
      var hasBracket = q.start.indexOf('(') !== -1;
      if (hasBracket) lines.push({ op: 'exp', t: fmtSide(L) + ' = ' + fmtSide(R) });
      // move x to the side with more x
      var lx = L.c1 || { n: 0, d: 1 }, rx = R.c1 || { n: 0, d: 1 };
      var leftHeavy = (lx.n / lx.d) >= (rx.n / rx.d);
      var X = leftHeavy ? L : R, C = leftHeavy ? R : L;
      var kill = leftHeavy ? rx : lx;
      if (kill.n !== 0) {
        X = { c1: M.rsub(X.c1 || M.rat(0, 1), kill), c0: X.c0 || M.rat(0, 1) };
        C = { c1: M.rat(0, 1), c0: C.c0 || M.rat(0, 1) };
        var t1 = leftHeavy ? (fmtSide(X) + ' = ' + fmtSide(C)) : (fmtSide(C) + ' = ' + fmtSide(X));
        lines.push({ op: (kill.n > 0 ? '-' : '+') + fmtRat({ n: Math.abs(kill.n), d: kill.d }) + 'x', t: t1.replace(/= 0 \+ /, '= ') });
      }
      var a = X.c1, b = X.c0 || M.rat(0, 1), c = C.c0 || M.rat(0, 1);
      if (b.n !== 0) {
        c = M.rsub(c, b);
        lines.push({ op: (b.n > 0 ? '−' : '+') + fmtRat({ n: Math.abs(b.n), d: b.d }), t: fmtSide({ c1: a, c0: M.rat(0, 1) }) + ' = ' + fmtRat(c) });
      }
      if (!(a.n === 1 && a.d === 1)) {
        c = M.rdiv(c, a);
        lines.push({ op: '÷' + fmtRat(a), t: 'x = ' + fmtRat(c) });
      }
      return { lines: lines, fin: 'x = ' + fmtRat(c) };
    } catch (e) { return null; }
  }

  function modelAngleSteps(q) {
    var known = {}, steps = [];
    var angs = (q.diagram && q.diagram.angles) || {};
    Object.keys(angs).forEach(function (k) { if (angs[k].given) known[k] = true; });
    var edges = (q.graph || []).slice();
    var guard = 0;
    while (!known[q.target] && guard++ < 40) {
      var e = null;
      for (var i = 0; i < edges.length; i++) {
        var ed = edges[i];
        if (known[ed.find]) continue;
        if (ed.from.every(function (f) { return known[f]; })) { e = ed; break; }
      }
      if (!e) break;
      known[e.find] = true;
      steps.push({ ang: e.find, val: angs[e.find] ? angs[e.find].value : 0, rsn: e.rule, s: 30 + steps.length * 25 });
    }
    return known[q.target] ? steps : null;
  }

  function synthState(actId, profile) {
    var pack = window.GJ_CONTENT && window.GJ_CONTENT[actId];
    if (!pack) return null;
    var st = { v: 1, act: actId, start: 1765000000, qs: {} };
    var doneRatio = { strong: 1, mid: 0.75, weak: 0.45, amber: 0.85, live: 0.5 }[profile] || 0.6;
    var errRate = { strong: 0.08, mid: 0.3, weak: 0.55, amber: 0.15, live: 0.3 }[profile] || 0.3;
    var qi = 0, qn = 0;
    pack.sections.forEach(function (sec) { qn += sec.questions.length; });
    var todo = Math.round(qn * doneRatio);
    var seed = 0;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    seed = profile.length * 7 + actId.length * 13;

    pack.sections.forEach(function (sec) {
      sec.questions.forEach(function (q) {
        qi++;
        if (qi > todo) return;
        var makeErr = rnd() < errRate;
        var rec = { att: [], lock: true, ovr: null };
        if (actId === 'algebra') {
          var model = modelSolveLines(q);
          if (q.type !== 'solve' && q.type !== 'form') {
            // expand/simplify/subst: answer (and a working line for subst,
            // mirroring the book's substitution layout)
            var ansLine = q.modelLine || null;
            if (!ansLine && q.answer && q.answer.val) ansLine = fmtRat(q.answer.val);
            if (!ansLine && q.answer && q.answer.canon) {
              var cn = q.answer.canon, parts = [];
              if (cn.c2 && cn.c2.n) parts.push((cn.c2.n === 1 && cn.c2.d === 1 ? '' : fmtRat(cn.c2)) + 'x²');
              if (cn.c1 && cn.c1.n) parts.push((parts.length && cn.c1.n > 0 ? '+ ' : '') + (Math.abs(cn.c1.n) === 1 && cn.c1.d === 1 ? (cn.c1.n < 0 ? '−' : '') + 'x' : fmtRat(cn.c1) + 'x'));
              if (cn.c0 && cn.c0.n) parts.push((cn.c0.n > 0 && parts.length ? '+ ' : '') + fmtRat(cn.c0));
              ansLine = parts.join(' ').replace(/-/g, '−');
            }
            if (!ansLine) { delete st.qs[q.id]; return; }
            var workLine = null;
            if (q.type === 'subst' && q.start && q.given) {
              // substitute values the way a pupil writes it: 3a, a=2 → 3 × 2
              var src = q.start.replace(/^\s*[a-wyz]\s*=\s*/, ''); // drop a formula subject (v = …)
              var outW = '';
              for (var ci = 0; ci < src.length; ci++) {
                var ch = src[ci];
                if (/[a-wyz]/.test(ch) && q.given[ch]) {
                  var vv = q.given[ch];
                  var sStr = fmtRat(vv);
                  var prevCh = outW.replace(/\s+$/, '').slice(-1);
                  var needTimes = /[0-9)]/.test(prevCh);
                  outW += (needTimes ? ' × ' : '') + (vv.n < 0 ? '(' + sStr + ')' : sStr);
                } else outW += ch;
              }
              workLine = outW;
            }
            if (makeErr && q.dx) {
              var wrong = Object.keys(q.dx)[0];
              rec.att.push({ L: [{ op: 'rw', t: wrong, s: 30 }], dur: 45 });
            }
            var okL = workLine
              ? [{ op: 'rw', t: workLine, s: 25 }, { op: 'rw', t: ansLine, s: 45 }]
              : [{ op: 'rw', t: ansLine, s: 30 }];
            rec.att.push({ L: okL, fin: ansLine, dur: 40 });
            rec.fin = ansLine;
          } else if (model) {
            if (profile === 'amber' && rnd() < 0.5) {
              rec.att.push({ L: [{ op: 'rw', t: model.fin, s: 20 }], fin: model.fin, dur: 25 });
              rec.fin = model.fin;
            } else if (makeErr && q.dx) {
              var wrongLine = Object.keys(q.dx)[0];
              var badL = [{ op: model.lines[0].op, t: wrongLine, s: 30 }].concat(
                model.lines.slice(1).map(function (l, i) { return { op: l.op, t: l.t, s: 50 + i * 20 }; }));
              rec.att.push({ L: badL, fin: null, dur: 90 });
              // weaker profiles often DON'T recover — that is what the
              // Marking Pile demo needs to show
              var recovers = rnd() < (profile === 'weak' ? 0.25 : 0.6);
              if (recovers) {
                rec.att.push({ L: model.lines.map(function (l, i) { return { op: l.op, t: l.t, s: 120 + i * 20 }; }), fin: model.fin, dur: 80 });
                rec.fin = model.fin;
              } else {
                rec.att.push({ L: badL.map(function (l, i) { return { op: l.op, t: l.t, s: 120 + i * 15 }; }), fin: null, dur: 70 });
              }
            } else {
              rec.att.push({ L: model.lines.map(function (l, i) { return { op: l.op, t: l.t, s: 30 + i * 22 }; }), fin: model.fin, dur: 70 });
              rec.fin = model.fin;
            }
          } else { delete st.qs[q.id]; return; }
        } else if (q.kind === 'classify') {
          var wrongOpt = (q.options || []).filter(function (o) { return o !== q.classify; })[0];
          var pick = makeErr ? wrongOpt : q.classify;
          rec.att.push({ pick: pick, dur: 20, res: pick === q.classify ? 'OK' : 'X@1' });
          if (makeErr) rec.att.push({ pick: q.classify, dur: 15, res: 'OK' });
        } else {
          var steps = modelAngleSteps(q);
          if (!steps) return;
          if (makeErr && steps.length > 1) {
            var bad = steps.map(function (s) { return { ang: s.ang, val: s.val, rsn: s.rsn, s: s.s }; });
            var k = Math.floor(rnd() * bad.length);
            bad[k] = { ang: bad[k].ang, val: 180 - bad[k].val !== bad[k].val ? 180 - bad[k].val : bad[k].val + 10, rsn: bad[k].rsn, s: bad[k].s };
            rec.att.push({ steps: bad, dur: 100 });
            if (rnd() < (profile === 'weak' ? 0.25 : 0.6)) rec.att.push({ steps: steps, dur: 80 });
            else rec.att.push({ steps: bad.map(function (s) { return { ang: s.ang, val: s.val, rsn: s.rsn, s: s.s + 60 }; }), dur: 65 });
          } else {
            rec.att.push({ steps: steps, dur: 75 });
          }
        }
        st.qs[q.id] = rec;
      });
    });
    if (profile === 'live') {
      // leave the last question open mid-working: the Wall's blue dot
      var qids = Object.keys(st.qs);
      if (qids.length) st.qs[qids[qids.length - 1]].lock = false;
    }
    return st;
  }

  function seedDemo(s) {
    if (s.data[DEMO_CLASS]) return;
    s.classes.push({ name: DEMO_CLASS, acts: { angles: true, algebra: true } });
    s.data[DEMO_CLASS] = {};
    DEMO_PUPILS.forEach(function (p, i) {
      var email = p[0].toLowerCase().replace(/[^a-z]+/g, '.') + '@c2ken.net';
      s.names[email] = p[0];
      s.data[DEMO_CLASS][email] = {};
      ACTIVITIES.forEach(function (a) {
        var stt = synthState(a.id, p[1]);
        if (!stt) return;
        var sum = GJ.app.summarise(a.id, stt, p[0]);
        if (p[1] === 'live') sum.upd = Math.floor(Date.now() / 1000) - 15;
        s.data[DEMO_CLASS][email][a.id] = { state: JSON.stringify(stt), summary: JSON.stringify(sum) };
      });
    });
    lsSave(s);
  }

  function offlineCall(action, p) {
    p = p || {};
    var s = store();
    var cls = p.classCode || BOOT.classCode;
    function ok(extra) { var r = { ok: true }; Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; }); return Promise.resolve(r); }
    function row(c, e, a) { return ((s.data[c] || {})[e] || {})[a] || null; }

    switch (action) {
      case 'whoami': return ok({ email: OFFLINE_EMAIL });
      case 'hello': {
        var reg = s.classes.filter(function (c) { return c.name === cls; })[0];
        var sums = {};
        ACTIVITIES.forEach(function (a) {
          var r = row(cls, OFFLINE_EMAIL, a.id);
          if (r && r.summary) { try { sums[a.id] = JSON.parse(r.summary); } catch (e) {} }
        });
        return ok({ email: OFFLINE_EMAIL, name: s.names[OFFLINE_EMAIL] || '', acts: (reg && reg.acts) || { angles: true, algebra: true }, summaries: sums, offline: true });
      }
      case 'setname': s.names[OFFLINE_EMAIL] = String(p.name || '').slice(0, 40); lsSave(s); return ok({});
      case 'load': {
        var r2 = row(cls, OFFLINE_EMAIL, p.act);
        return ok({ state: r2 && r2.state ? r2.state : null });
      }
      case 'save': {
        s.data[cls] = s.data[cls] || {}; s.data[cls][OFFLINE_EMAIL] = s.data[cls][OFFLINE_EMAIL] || {};
        s.data[cls][OFFLINE_EMAIL][p.act] = { state: p.state, summary: p.summary };
        lsSave(s); return ok({});
      }
      case 'admin': {
        var pass = String(p.passcode || '').trim().toLowerCase();
        if (pass !== 'demo') return Promise.resolve({ ok: false, error: 'That passcode was not accepted. (Offline preview: the passcode is "demo".)' });
        seedDemo(s); s = store();
        switch (p.sub) {
          case 'classes':
            return ok({ me: 'demo.teacher@c2ken.net', classes: s.classes.map(function (c) {
              return { name: c.name, acts: c.acts, count: Object.keys(s.data[c.name] || {}).length };
            }) });
          case 'addClass': {
            var nm = String(p.name || '').trim().replace(/[^A-Za-z0-9_\- ]+/g, '').slice(0, 40);
            if (!nm) return Promise.resolve({ ok: false, error: 'Give the class a name first.' });
            if (s.classes.some(function (c) { return c.name.toLowerCase() === nm.toLowerCase(); }))
              return Promise.resolve({ ok: false, error: 'That class already exists.' });
            var nacts = { angles: true, algebra: true };
            s.classes.push({ name: nm, acts: nacts }); lsSave(s);
            return ok({ name: nm, acts: nacts });
          }
          case 'deleteClass':
            s.classes = s.classes.filter(function (c) { return c.name !== p.className; });
            delete s.data[p.className]; lsSave(s); return ok({});
          case 'setActs': {
            s.classes.forEach(function (c) { if (c.name === p.className) c.acts = p.acts; });
            lsSave(s); return ok({});
          }
          case 'wall': {
            var out = [];
            var d = s.data[p.className] || {};
            Object.keys(d).forEach(function (em) {
              var r3 = d[em][p.act];
              if (!r3) { out.push({ email: em, name: s.names[em] || em, summary: null }); return; }
              var sum2 = null; try { sum2 = JSON.parse(r3.summary); } catch (e) {}
              out.push({ email: em, name: s.names[em] || em, summary: sum2 });
            });
            return ok({ pupils: out });
          }
          case 'jotter': {
            var r4 = row(p.className, p.email, p.act);
            return ok({ state: r4 && r4.state ? r4.state : null, name: s.names[p.email] || p.email });
          }
          case 'override': {
            var r5 = row(p.className, p.email, p.act);
            if (!r5) return Promise.resolve({ ok: false, error: 'No work saved yet.' });
            try {
              var clear = (p.val === null || p.val === undefined || p.val === '');
              var v = clear ? null : (Number(p.val) || 0);
              var stt2 = JSON.parse(r5.state);
              if (!stt2.qs || !stt2.qs[p.q]) return Promise.resolve({ ok: false, error: 'No work on that question yet.' });
              stt2.qs[p.q].ovr = clear ? null : { q: v };
              r5.state = JSON.stringify(stt2);
              var sum3 = JSON.parse(r5.summary || '{}');
              sum3.qs = sum3.qs || {};
              sum3.qs[p.q] = sum3.qs[p.q] || {};
              if (clear) delete sum3.qs[p.q].ovr; else sum3.qs[p.q].ovr = v;
              r5.summary = JSON.stringify(sum3);
              lsSave(s);
            } catch (e) { return Promise.resolve({ ok: false, error: 'Could not store that.' }); }
            return ok({});
          }
        }
        return Promise.resolve({ ok: false, error: 'Unknown admin action.' });
      }
    }
    return Promise.resolve({ ok: false, error: 'Unknown action ' + action });
  }

  function call(action, payload) {
    var p = payload || {};
    p.action = action;
    p['class'] = p.classCode = p.classCode || BOOT.classCode;
    if (window.OLS_TRANSPORT && typeof window.OLS_TRANSPORT.call === 'function') {
      return window.OLS_TRANSPORT.call(p);
    }
    return offlineCall(action, p);
  }

  /* ═════════ summary building (shared with demo seeder) ═══════════ */
  function summarise(actId, state, name) {
    var pack = window.GJ_CONTENT[actId];
    var sum = { v: 1, act: actId, name: name || '', marks: [0, 0], done: 0, total: 0, upd: Math.floor(Date.now() / 1000), qs: {} };
    pack.sections.forEach(function (sec) {
      sec.questions.forEach(function (q) {
        sum.total++;
        var rec = state.qs[q.id];
        var mkMax = (q.marks[0] + q.marks[1]);
        sum.marks[1] += mkMax;
        if (!rec || !rec.att || !rec.att.length) { sum.qs[q.id] = { st: 'un' }; return; }
        var last = rec.att[rec.att.length - 1];
        var verdict = null;
        try {
          if (q.kind === 'classify') {
            var right = last.pick === q.classify;
            verdict = { res: right ? 'OK' : 'X@1', mk: [0, right ? 1 : 0], mkMax: [0, 1], perLine: [] };
          } else {
            verdict = (actId === 'angles')
              ? window.GJ_ANGLES.checkSteps(q, last.steps || [])
              : window.GJ_MATH.checkQuestion(q, last);
          }
        } catch (e) { verdict = null; }
        var cell = { st: 'open' };
        if (verdict && rec.lock) {
          var got = verdict.mk[0] + verdict.mk[1];
          sum.marks[0] += got;
          cell = {
            st: verdict.res === 'OK' ? 'ok' : (verdict.res === 'AMBER' ? 'amber' : 'err'),
            mk: [verdict.mk[0], verdict.mk[1]],
            t: last.dur || 0
          };
          if (verdict.res && verdict.res.indexOf('X@') === 0) cell.errAt = Number(verdict.res.slice(2)) || 1;
          var dxs = (verdict.perLine || verdict.perStep || []).map(function (l) { return l.dx; }).filter(Boolean);
          if (dxs.length) cell.dx = dxs[0];
          sum.done++;
        } else if (rec.att.length) {
          cell = { st: 'open' };
        }
        if (rec.ovr && rec.ovr.q != null) cell.ovr = rec.ovr.q;
        sum.qs[q.id] = cell;
      });
    });
    return sum;
  }

  /* ═════════ screens ══════════════════════════════════════════════ */
  var S = {
    cover: document.getElementById('scr-cover'),
    shelf: document.getElementById('scr-shelf'),
    activity: document.getElementById('scr-activity'),
    staff: document.getElementById('scr-staff')
  };
  function show(id) {
    Object.keys(S).forEach(function (k) { S[k].hidden = (k !== id); });
    window.scrollTo(0, 0);
  }

  var me = { email: '', name: '', acts: { angles: false, algebra: false }, summaries: {}, offline: false };
  var current = { act: null, state: null, section: 0, dirty: false, lastSave: 0 };

  /* — cover — */
  function bootCover() {
    document.getElementById('cover-class').textContent =
      BOOT.classCode === 'default' ? 'Maths' : BOOT.classCode;
    var msg = document.getElementById('cover-msg');
    msg.textContent = 'Looking up your name…';
    call('whoami').then(function () { return call('hello', {}); }).then(function (r) {
      if (!r || !r.ok) { msg.textContent = 'Could not reach the server — check your connection and reload.'; return; }
      me.email = r.email; me.name = r.name || ''; me.acts = r.acts || {}; me.summaries = r.summaries || {}; me.offline = !!r.offline;
      var input = document.getElementById('cover-name');
      if (me.name) input.value = me.name;
      msg.textContent = me.offline ? 'Preview copy — work saves to this device only.' : 'Signed in as ' + me.email;
    }).catch(function () {
      msg.textContent = 'Could not reach the server — check your connection and reload.';
    });

    document.getElementById('cover-open').addEventListener('click', function () {
      var input = document.getElementById('cover-name');
      var nm = input.value.trim();
      if (!nm) { document.getElementById('cover-msg').textContent = 'Write your name on the label first.'; input.focus(); return; }
      var btn = this;
      if (btn.disabled) return;
      btn.disabled = true;
      var fin = function () {
        me.name = nm;
        var book = document.getElementById('cover-book');
        book.classList.add('turning');
        setTimeout(function () { renderShelf(); show('shelf'); book.classList.remove('turning'); btn.disabled = false; }, 620);
      };
      if (nm !== me.name) call('setname', { name: nm }).then(fin, fin); else fin();
    });
    document.getElementById('cover-name').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('cover-open').click();
    });
    document.getElementById('cover-staff').addEventListener('click', function () {
      window.GJ_STAFF.open();
    });
  }

  /* — shelf — */
  function bookMotif(kind, accent) {
    if (kind === 'protractor') {
      return '<svg viewBox="0 0 100 56" aria-hidden="true">' +
        '<path d="M10 50 A40 40 0 0 1 90 50 Z" fill="none" stroke="#E4B824" stroke-width="2.5"/>' +
        '<path d="M24 50 A26 26 0 0 1 76 50" fill="none" stroke="#E4B824" stroke-width="1" opacity="0.7"/>' +
        '<line x1="50" y1="50" x2="78" y2="24" stroke="#E4B824" stroke-width="2"/>' +
        '<circle cx="50" cy="50" r="2.4" fill="#E4B824"/></svg>';
    }
    return '<svg viewBox="0 0 100 56" aria-hidden="true">' +
      '<text x="50" y="44" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="44" fill="#E4B824">x</text>' +
      '<path d="M20 30 l9 16 l11 -34" fill="none" stroke="#E4B824" stroke-width="2.5" stroke-linecap="round"/></svg>';
  }

  function renderShelf() {
    document.getElementById('shelf-pupil').textContent = me.name || '';
    var hour = new Date().getHours();
    document.getElementById('shelf-greeting').textContent =
      (hour < 12 ? 'Good morning' : 'Good afternoon') + (me.name ? ', ' + me.name.split(' ')[0] : '') + '.';
    var wrap = document.getElementById('shelf-tiles');
    wrap.innerHTML = '';
    var anyLocked = false;
    ACTIVITIES.forEach(function (a) {
      var pack = window.GJ_CONTENT[a.id];
      if (!pack) return;
      if (!me.acts[a.id]) {
        anyLocked = true;
        var spine = document.createElement('div');
        spine.className = 'book locked';
        spine.innerHTML = '<span class="book-spine-text">' + a.title + '</span>';
        spine.setAttribute('aria-label', a.title + ' — not set yet');
        wrap.appendChild(spine);
        return;
      }
      var sum = me.summaries[a.id];
      var btn = document.createElement('button');
      btn.className = 'book';
      btn.style.setProperty('--book-col', a.accent);
      var ticks = '';
      if (sum && sum.done) {
        var full = sum.done === sum.total && sum.marks[0] === sum.marks[1];
        ticks = sum.marks[0] + '/' + sum.marks[1] + ' marks · ' + sum.done + '/' + sum.total + ' answered';
        if (full) btn.insertAdjacentHTML('beforeend',
          '<svg class="book-star" viewBox="0 0 40 40"><path d="M20 2 l5 12 13 1 -10 9 3 13 -11 -7 -11 7 3 -13 -10 -9 13 -1 Z" fill="#E4B824" stroke="#B8860B"/></svg>');
      }
      btn.innerHTML += '<div class="book-inner"><div class="book-motif">' + bookMotif(a.motif, a.accent) + '</div>' +
        '<div class="book-label"><div class="book-label-title">' + a.title + '</div>' +
        '<div class="book-label-meta">' + a.meta + '</div>' +
        '<div class="book-label-marks">' + ticks + '</div></div></div>';
      btn.addEventListener('click', function () { openActivity(a); });
      wrap.appendChild(btn);
    });
    document.getElementById('shelf-note').textContent = anyLocked
      ? 'Books without a label are waiting for your teacher to set them.'
      : 'Your teacher will add more books to this shelf during the year.';
  }

  /* — activity — */
  function openActivity(a) {
    var pack = window.GJ_CONTENT[a.id];
    current.act = a; current.section = 0; current.state = null;
    document.documentElement.style.setProperty('--act-accent', a.accent);
    document.getElementById('act-eyebrow').textContent = pack.sections.length + ' exercises · ' + a.sub;
    document.getElementById('act-title').textContent = a.title;
    call('load', { act: a.id }).then(function (r) {
      var st = null;
      if (r && r.ok && r.state) { try { st = JSON.parse(r.state); } catch (e) {} }
      current.state = st || { v: 1, act: a.id, start: Math.floor(Date.now() / 1000), qs: {} };
      renderContents();
      renderSection(firstOpenSection(pack));
      show('activity');
    });
  }

  function firstOpenSection(pack) {
    for (var i = 0; i < pack.sections.length; i++) {
      var sec = pack.sections[i];
      var allDone = sec.questions.every(function (q) {
        var rec = current.state.qs[q.id];
        return rec && rec.lock;
      });
      if (!allDone) return i;
    }
    return pack.sections.length; // everything done → tally page
  }

  function sectionTicks(sec) {
    var done = 0;
    sec.questions.forEach(function (q) {
      var rec = current.state.qs[q.id];
      if (rec && rec.lock) done++;
    });
    return done;
  }

  function renderContents() {
    var pack = window.GJ_CONTENT[current.act.id];
    var nav = document.getElementById('act-contents');
    nav.innerHTML = '';
    pack.sections.forEach(function (sec, i) {
      var chip = document.createElement('button');
      chip.className = 'contents-chip' + (i === current.section ? ' active' : '');
      var done = sectionTicks(sec);
      chip.innerHTML = 'Ex.' + (i + 1) + ' ' + sec.title +
        (done ? '<span class="chip-ticks">' + '✓'.repeat(Math.min(done, 4)) + '</span>' : '');
      chip.addEventListener('click', function () { renderSection(i); });
      nav.appendChild(chip);
    });
    var tally = document.createElement('button');
    tally.className = 'contents-chip' + (current.section >= pack.sections.length ? ' active' : '');
    tally.textContent = 'My marks';
    tally.addEventListener('click', function () { renderSection(pack.sections.length); });
    nav.appendChild(tally);
    renderInstrument();
  }

  function renderInstrument() {
    var pack = window.GJ_CONTENT[current.act.id];
    var el = document.getElementById('act-instrument');
    var total = 0, done = 0;
    pack.sections.forEach(function (sec) {
      sec.questions.forEach(function (q) { total++; var r = current.state.qs[q.id]; if (r && r.lock) done++; });
    });
    var frac = total ? done / total : 0;
    if (current.act.id === 'angles') {
      var deg = Math.round(frac * 180);
      el.innerHTML = '<svg class="instr-protractor" viewBox="0 0 100 52" aria-hidden="true">' +
        '<path d="M8 46 A42 42 0 0 1 92 46 Z" fill="rgba(250,247,240,0.08)" stroke="rgba(250,247,240,0.7)" stroke-width="1.5"/>' +
        '<path d="M22 46 A28 28 0 0 1 78 46" fill="none" stroke="rgba(250,247,240,0.4)" stroke-width="0.8"/>' +
        Array.from({ length: 19 }, function (_, i) {
          var a = Math.PI - (i * 10) * Math.PI / 180;
          var x1 = 50 + Math.cos(a) * 38, y1 = 46 - Math.sin(a) * 38;
          var x2 = 50 + Math.cos(a) * 42, y2 = 46 - Math.sin(a) * 42;
          return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="rgba(250,247,240,0.7)" stroke-width="0.8"/>';
        }).join('') +
        '<line class="needle" x1="50" y1="46" x2="14" y2="46" stroke="#E4B824" stroke-width="2" style="transform:rotate(' + (-deg) + 'deg)"/>' +
        '<circle cx="50" cy="46" r="2" fill="#E4B824"/>' +
        '<text x="50" y="34" text-anchor="middle" style="font-size:11px;fill:#E4B824;font-family:var(--f-stationery)">' + deg + '°</text></svg>';
    } else {
      var tip = (1 - frac) * -7;
      el.innerHTML = '<svg class="instr-balance" viewBox="0 0 100 52" aria-hidden="true">' +
        '<line x1="50" y1="22" x2="50" y2="46" stroke="rgba(250,247,240,0.7)" stroke-width="2"/>' +
        '<path d="M38 46 h24" stroke="rgba(250,247,240,0.7)" stroke-width="2"/>' +
        '<g class="beam" style="transform:rotate(' + tip.toFixed(1) + 'deg)">' +
        '<line x1="14" y1="22" x2="86" y2="22" stroke="#E4B824" stroke-width="2"/>' +
        '<path d="M14 22 l-5 9 h10 Z M86 22 l-5 9 h10 Z" fill="none" stroke="#E4B824" stroke-width="1.4"/></g>' +
        '<circle cx="50" cy="22" r="2.2" fill="#E4B824"/></svg>';
    }
  }

  function renderSection(i) {
    var pack = window.GJ_CONTENT[current.act.id];
    current.section = i;
    var main = document.getElementById('act-main');
    main.innerHTML = '';
    if (i >= pack.sections.length) { renderTally(main, pack); renderContents(); return; }
    var sec = pack.sections[i];

    var head = document.createElement('div');
    head.className = 'sec-head';
    head.innerHTML = '<p class="sec-walt">WALT · ' + sec.walt + '</p>' +
      '<h2 class="sec-title">Exercise ' + (i + 1) + ' · ' + sec.title + '</h2>';
    main.appendChild(head);

    if (sec.movie) {
      var movieEl = document.createElement('div');
      main.appendChild(movieEl);
      window.GJ_PLAYER.mount(movieEl, sec.movie, { accent: current.act.accent });
    }

    var jotter = document.createElement('div');
    jotter.className = 'jotter';
    main.appendChild(jotter);
    sec.questions.forEach(function (q, qi) {
      var holder = document.createElement('div');
      jotter.appendChild(holder);
      window.GJ_JOTTER.mount(holder, q, current.state.qs[q.id] || null, {
        actId: current.act.id,
        number: q.num || (qi + 1),
        onSave: function (qid, rec) {
          current.state.qs[qid] = rec;
          scheduleSave();
          renderContents();
        }
      });
    });

    var nextRow = document.createElement('div');
    nextRow.className = 'check-row';
    var nextBtn = document.createElement('button');
    nextBtn.className = 'btn-stamp';
    nextBtn.textContent = (i + 1 < pack.sections.length) ? 'Next exercise →' : 'See my marks →';
    nextBtn.addEventListener('click', function () { renderSection(i + 1); });
    nextRow.appendChild(nextBtn);
    main.appendChild(nextRow);
    renderContents();
  }

  function renderTally(main, pack) {
    var sum = summarise(current.act.id, current.state, me.name);
    var pct = sum.marks[1] ? Math.round(100 * sum.marks[0] / sum.marks[1]) : 0;
    var hand = pct === 100 ? 'Full marks. A fair copy — the gold star is yours.'
      : pct >= 80 ? 'Lovely clear working. Nearly there — look back at the crosses.'
      : pct >= 50 ? 'Good — now study the lines where the red pen stopped.'
      : 'Plenty to talk about in class — your teacher can see exactly where.';
    main.innerHTML = '<div class="tally-page">' +
      '<p class="sec-walt">' + current.act.title + ' · marks so far</p>' +
      '<div class="tally-big">' + sum.marks[0] + ' / ' + sum.marks[1] + '</div>' +
      '<p class="tally-hand">' + hand + '</p>' +
      '<p class="ui-msg" style="margin-top:var(--sq)">' + sum.done + ' of ' + sum.total + ' questions checked · every line of your working is on your teacher’s copy</p>' +
      '</div>';
  }

  /* — save plumbing — */
  var saveTimer = null;
  function scheduleSave() {
    current.dirty = true;
    if (saveTimer) return;
    var since = Date.now() - current.lastSave;
    var wait = Math.max(1500, 10000 - since);
    saveTimer = setTimeout(flushSave, wait);
  }
  function flushSave() {
    saveTimer = null;
    if (!current.dirty || !current.act) return;
    current.dirty = false;
    current.lastSave = Date.now();
    var stateStr = JSON.stringify(current.state);
    if (stateStr.length > 45000) return; // guard; jotter.js prunes long before this
    var sum = summarise(current.act.id, current.state, me.name);
    me.summaries[current.act.id] = sum;
    call('save', { act: current.act.id, state: stateStr, summary: JSON.stringify(sum) })
      .catch(function () { current.dirty = true; });
  }
  window.addEventListener('beforeunload', function () { if (current.dirty) flushSave(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && current.dirty) flushSave(); });

  document.getElementById('act-back').addEventListener('click', function () {
    if (current.dirty) flushSave();
    renderShelf(); show('shelf');
  });

  /* ── public surface (per INTERFACES.md) ───────────────────────── */
  GJ.app = {
    boot: BOOT,
    call: call,
    me: function () { return me; },
    activities: ACTIVITIES,
    content: function (id) { return window.GJ_CONTENT[id]; },
    summarise: summarise,
    save: scheduleSave,
    showScreen: show,
    fmtRat: fmtRat
  };

  /* boot */
  bootCover();
  show('cover');
})();
