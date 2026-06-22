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
  var OFFLINE_EMAIL = 'you@offline.preview';
  /* Offline, there is ONE staff identity and it plays the deploy owner (the HOD)
     -- so the preview shows what Damien sees: every class. Real per-teacher
     hiding (a colleague seeing only their own) needs two C2k logins, so it is
     verified live, not offline. We still stamp owner on every class for data-
     shape parity with the server. */
  var OFFLINE_TEACHER = 'demo.teacher@c2ken.net';
  function store() {
    var s = lsLoad();
    s.classes = s.classes || [{ name: BOOT.classCode, acts: { angles: true, algebra: true } }];
    s.data = s.data || {};   // data[class][email][act] = {state, summary}
    s.names = s.names || {};
    s.classes.forEach(function (c) { if (c && c.owner == null) c.owner = OFFLINE_TEACHER; });
    return s;
  }

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
        } else if (q.kind === 'protractor') {
          // weak pupils read the wrong scale (180 − value), the rest measure right
          if (makeErr) {
            rec.att.push({ read: 180 - q.value, dur: 30, res: 'X@1', dx: 'WRONG_SCALE' });
            if (rnd() < (profile === 'weak' ? 0.3 : 0.7)) rec.att.push({ read: q.value + (rnd() < 0.5 ? 1 : -1), dur: 25, res: 'OK' });
            else rec.att.push({ read: 180 - q.value, dur: 20, res: 'X@1', dx: 'WRONG_SCALE' });
          } else {
            rec.att.push({ read: q.value + (rnd() < 0.5 ? 1 : (rnd() < 0.5 ? -2 : 0)), dur: 28, res: 'OK' });
          }
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

  /* demo self-evaluations: realistic confidence per profile so the teacher
     preview shows the Insights with data — incl. over-confident AMBER pupils
     (high confidence, answer-only marks) for the confidence-vs-performance view. */
  function synthEvals(actId, profile, stt) {
    var pack = window.GJ_CONTENT[actId];
    var conf = ({ strong: 3, mid: 2, weak: 1, amber: 3, live: 2 })[profile] || 2;
    var evals = {};
    pack.sections.forEach(function (sec, si) {
      var done = sec.questions.length && sec.questions.every(function (q) { var r = stt.qs[q.id]; return r && r.lock; });
      if (!done) return;
      var skills = {};
      (sec.cans || []).forEach(function (can, ci) {
        var jitter = profile === 'weak' || profile === 'mid' ? (((si + ci + profile.length) % 3) - 1) : 0;
        skills[can.id] = Math.min(3, Math.max(1, conf + jitter));
      });
      evals[sec.id] = { conf: conf, skills: skills, ts: 1765000000 + si * 600 };
    });
    if (Object.keys(evals).length) stt.evals = evals;
  }

  function seedDemo(s) {
    if (s.data[DEMO_CLASS]) return;
    s.classes.push({ name: DEMO_CLASS, acts: { angles: true, algebra: true }, owner: OFFLINE_TEACHER });
    s.data[DEMO_CLASS] = {};
    DEMO_PUPILS.forEach(function (p, i) {
      var email = p[0].toLowerCase().replace(/[^a-z]+/g, '.') + '@c2ken.net';
      s.names[email] = p[0];
      s.data[DEMO_CLASS][email] = {};
      ACTIVITIES.forEach(function (a) {
        var stt = synthState(a.id, p[1]);
        if (!stt) return;
        synthEvals(a.id, p[1], stt);
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
      case 'autoname': return ok({ name: 'Aoife Gartland' });   // preview: simulate the c2k auto-name pull
      case 'load': {
        var r2 = row(cls, OFFLINE_EMAIL, p.act);
        var nkey = String(p.act) + '|' + OFFLINE_EMAIL.toLowerCase();
        var nud = (s.nudges && s.nudges[cls] && s.nudges[cls][nkey]) || '';
        if (nud) { s.nudges[cls][nkey] = ''; lsSave(s); }   // one-shot, mirrors apiLoad
        return ok({ state: r2 && r2.state ? r2.state : null, nudge: nud });
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
            // isAdmin true: the single offline teacher plays the deploy owner,
            // so (like Damien) it sees every class. Mirrors adminClasses_.
            return ok({ me: OFFLINE_TEACHER, isAdmin: true, classes: s.classes.map(function (c) {
              return { name: c.name, acts: c.acts, count: Object.keys(s.data[c.name] || {}).length };
            }) });
          case 'addClass': {
            var nm = String(p.className || '').trim().replace(/[^A-Za-z0-9_\- ]+/g, '').replace(/\s+/g, '-').slice(0, 40);
            if (!nm) return Promise.resolve({ ok: false, error: 'Give the class a name first.' });
            if (s.classes.some(function (c) { return c.name.toLowerCase() === nm.toLowerCase(); }))
              return Promise.resolve({ ok: false, error: 'That class already exists.' });
            var nacts = { angles: true, algebra: true };
            s.classes.push({ name: nm, acts: nacts, owner: OFFLINE_TEACHER }); lsSave(s);
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
          case 'nudge': {
            s.nudges = s.nudges || {};
            s.nudges[p.className] = s.nudges[p.className] || {};
            var nk2 = String(p.act) + '|' + String(p.email || '').toLowerCase();
            var clr = (p.sec === null || p.sec === undefined || p.sec === '');
            s.nudges[p.className][nk2] = clr ? '' : String(p.sec);
            lsSave(s); return ok({ sec: clr ? null : String(p.sec) });
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
          } else if (q.kind === 'protractor') {
            var pok = Math.abs((last.read || 0) - q.value) <= (q.tol || 3);
            verdict = { res: pok ? 'OK' : 'X@1', mk: [0, pok ? 1 : 0], mkMax: [0, 1],
              perLine: pok ? [] : [{ ok: 0, dx: last.dx || 'MISREAD' }] };
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
        // analytics scalars (cheap; the wall already reads this cell). a1 uses the
        // EFFECTIVE status (teacher override folded in) so a corrected first attempt
        // counts as first-try everywhere — the same override contract the wall honours.
        var effSt = cell.ovr === 1 ? 'ok' : cell.ovr === 0 ? 'err' : cell.st;
        cell.at = rec.att.length;                                        // attempts used
        cell.a1 = (rec.att.length === 1 && effSt === 'ok') ? 1 : 0;      // correct on the first attempt
        if (state.help && state.help[q.id]) cell.hp = 1;                 // pupil pulled the method help on this Q
        sum.qs[q.id] = cell;
      });
    });
    // per-section self-evaluation (small: confidence + skill self-ratings; the
    // free-text note stays in state, fetched on the Jotter Page). Keyed by section id.
    if (state.evals && typeof state.evals === 'object') {
      sum.evals = {};
      Object.keys(state.evals).forEach(function (k) {
        var e = state.evals[k];
        if (!e || typeof e !== 'object') return;
        var sk = {};                                 // clone, so the held summary isn't aliased to live state.evals
        if (e.skills) Object.keys(e.skills).forEach(function (c) { sk[c] = e.skills[c]; });
        sum.evals[k] = { conf: Number(e.conf) || 0, skills: sk, ts: Number(e.ts) || 0 };
      });
    }
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

  /* Best-effort friendly name from a c2k login email -- the execute-as-me web
     app only ever receives the email, never the Google display name. Handles the
     two common c2k staff formats: "dgartland021" -> "D Gartland" and
     "firstname.surname" -> "Firstname Surname". Returns '' when it cannot parse
     (the caller then falls back to the raw email). */
  function staffNameFromEmail(email) {
    var local = String(email || '').toLowerCase().split('@')[0].replace(/[0-9]+$/, '');
    if (!/^[a-z]/.test(local)) return '';
    function cap(w) {
      if (!w) return '';
      w = w.charAt(0).toUpperCase() + w.slice(1);
      return w.replace(/^Mc([a-z])/, function (m, c) { return 'Mc' + c.toUpperCase(); });
    }
    if (local.indexOf('.') > -1) {
      return local.split('.').filter(Boolean).map(cap).join(' ');
    }
    var surname = cap(local.slice(1));
    return surname ? (local.charAt(0).toUpperCase() + ' ' + surname) : '';
  }

  /* — cover — */
  function bootCover() {
    var msg = document.getElementById('cover-msg');
    var staffOval = document.getElementById('cover-staff');
    var coverOpenBtn = document.getElementById('cover-open');

    /* discreet, always-available teacher way in (so no lock-out on a class
       board where the visible oval is hidden): triple-tap the crest. */
    var crest = document.querySelector('.cover-crest');
    if (crest) {
      var taps = 0, tapTimer = null;
      crest.style.cursor = 'default';
      crest.addEventListener('click', function () {
        taps++;
        clearTimeout(tapTimer);
        if (taps >= 3) { taps = 0; window.GJ_STAFF.open(); return; }
        tapTimer = setTimeout(function () { taps = 0; }, 600);
      });
    }

    /* ── TEACHER LANDING (the bare staff link, classCode 'default') ──────────
       This is the teacher's door, NOT a pupil sign-in: there is no name to
       type, no class/subject, and no book to open. Strip the cover to a clean
       staff entry -- the signed-in email on the Name line and a button straight
       into the markbook. Pupils never reach this (they arrive on a ?class=
       link), so none of the pupil prompts belong here. */
    var isTeacherLanding = (!BOOT.classCode || BOOT.classCode === 'default');
    if (isTeacherLanding) {
      staffOval.hidden = false;                                  // keep the STAFF stamp
      var sub = document.querySelector('.cover-foil-sub');
      if (sub) sub.textContent = 'The Glass Jotter';            // drop "M2 Revision", keep the name
      var rows = document.querySelectorAll('#cover-label .label-row');
      if (rows[2]) rows[2].style.display = 'none';               // hide the Subject row

      /* Name row -> read-only "signed in as" email (confirms the account). */
      var nameInput = document.getElementById('cover-name');
      var who = document.createElement('span');
      who.className = 'label-val'; who.id = 'cover-staffwho'; who.textContent = '…';
      if (nameInput && nameInput.parentNode) { nameInput.style.display = 'none'; nameInput.parentNode.appendChild(who); }

      /* Class row -> the staff PASSCODE field, so the markbook opens from this
         one page: no separate gate screen, no extra click. */
      var passInput = document.createElement('input');
      passInput.type = 'password'; passInput.id = 'cover-pass';
      passInput.autocomplete = 'off'; passInput.setAttribute('aria-label', 'Staff passcode');
      if (rows[1]) {
        var key = rows[1].querySelector('.label-key'); if (key) key.textContent = 'Passcode';
        var oldVal = rows[1].querySelector('.label-val'); if (oldVal) oldVal.parentNode.removeChild(oldVal);
        rows[1].appendChild(passInput);
      }

      coverOpenBtn.textContent = 'Open the Markbook';
      coverOpenBtn.disabled = false;
      var toStaff = function () {
        var pass = passInput.value.trim();
        if (!pass) { msg.textContent = 'Enter the staff passcode.'; passInput.focus(); return; }
        if (coverOpenBtn.disabled) return;
        coverOpenBtn.disabled = true;
        msg.innerHTML = '<span class="spinner" aria-hidden="true"></span>Checking the passcode&hellip;';
        call('admin', { passcode: pass, sub: 'classes' }).then(function (r) {
          if (r && r.ok) { window.GJ_STAFF.enterWith(pass, r); }
          else {
            coverOpenBtn.disabled = false;
            msg.textContent = (r && r.error) || 'That passcode was not accepted.';
            passInput.focus(); passInput.select();
          }
        }).catch(function () {
          coverOpenBtn.disabled = false;
          msg.textContent = 'Could not reach the server — try again.';
        });
      };
      coverOpenBtn.addEventListener('click', toStaff);
      passInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') toStaff(); });
      staffOval.addEventListener('click', function () { passInput.focus(); });
      msg.textContent = '';
      /* fill the signed-in email (no class to load here, so no error). */
      call('whoami').then(function (r) {
        var email = (r && r.email) ? String(r.email) : '';
        who.textContent = staffNameFromEmail(email) || email || 'Staff';
        me.email = email;
      }).catch(function () { who.textContent = 'Staff'; });
      return;
    }

    /* ── PUPIL COVER (a real class link) ─────────────────────────────────── */
    document.getElementById('cover-class').textContent = BOOT.classCode;
    staffOval.hidden = true;
    /* Guard: the cover book shows at once, but hold the "open" button and show a
       spinner until whoami+hello resolve, so the name label is prefilled before
       she can submit (never a flash of the empty label). */
    coverOpenBtn.disabled = true;
    msg.innerHTML = '<span class="spinner" aria-hidden="true"></span>Getting your details&hellip;';
    call('whoami').then(function () { return call('hello', {}); }).then(function (r) {
      coverOpenBtn.disabled = false;
      if (!r || !r.ok) { msg.textContent = 'Could not reach the server — check your connection and reload.'; return; }
      me.email = r.email; me.name = r.name || ''; me.acts = r.acts || {}; me.summaries = r.summaries || {}; me.offline = !!r.offline;
      var input = document.getElementById('cover-name');
      if (me.name) input.value = me.name;
      if (me.offline) msg.textContent = 'Preview copy — work saves to this device only.';
      else if (me.name) msg.textContent = 'Welcome back, ' + me.name.split(' ')[0] + '. Tap to open your book.';
      else msg.textContent = 'Signed in as ' + me.email + '. Add your name once, so your teacher sees it on her class list.';
      // auto-name: if there's no stored name yet, try to pull the pupil's real name
      // from their c2k account (via the execute-as-user companion) and pre-fill it.
      if (!me.name && (r.autonameUrl || me.offline)) tryAutoName(r.autonameUrl, input, msg);
    }).catch(function () {
      coverOpenBtn.disabled = false;
      msg.textContent = 'Could not reach the server — check your connection and reload.';
    });

    coverOpenBtn.addEventListener('click', function () {
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
  }

  /* Pull the pupil's real name from their c2k account. Live: load the companion
     (execute-as-user) /exec in a hidden iframe so it stashes the name, then read it
     back via apiAutoName and pre-fill. Offline: the stub returns one directly. Always
     graceful — if anything fails, the pupil just types their name as before. */
  function tryAutoName(url, input, msg) {
    var done = false;
    function apply() {
      if (done) return; done = true;
      call('autoname').then(function (a) {
        if (a && a.ok && a.name && !input.value) {
          input.value = a.name;
          if (msg) msg.textContent = 'Is this you, ' + a.name.split(' ')[0] + '? Tap to open your book.';
        }
      }).catch(function () {});
    }
    if (window.OLS_TRANSPORT && url) {
      var fr = document.createElement('iframe');
      fr.setAttribute('aria-hidden', 'true');
      fr.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;border:0';
      fr.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'probe=1';
      fr.addEventListener('load', function () { setTimeout(apply, 150); });   // probe has written the name
      document.body.appendChild(fr);
      setTimeout(apply, 2500);                                                 // fallback if load never fires
      setTimeout(function () { if (fr.parentNode) fr.parentNode.removeChild(fr); }, 4000);
    } else {
      apply();   // offline preview: the stub returns a name directly
    }
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
    /* Open the book at once with a gold wait-card so the tap never feels dead
       during the 1-3s server load (offline resolves instantly, so no real flash). */
    document.getElementById('act-contents').innerHTML = '';
    document.getElementById('act-main').innerHTML =
      '<div class="panel-loading"><span class="panel-spinner" aria-hidden="true"></span>' +
      '<span>Opening your book&hellip; this can take a moment</span></div>';
    show('activity');
    call('load', { act: a.id }).then(function (r) {
      var st = null;
      if (r && r.ok && r.state) { try { st = JSON.parse(r.state); } catch (e) {} }
      current.state = st || { v: 1, act: a.id, start: Math.floor(Date.now() / 1000), qs: {} };
      // a teacher nudge (one-shot from the server) points the pupil at a section's
      // method movie: open that section so the support is right where they land.
      var startSec = firstOpenSection(pack);
      if (r && r.nudge) {
        current.nudge = { sec: String(r.nudge) };
        var ni = -1;
        pack.sections.forEach(function (s, k) { if (s.id === current.nudge.sec) ni = k; });
        if (ni >= 0) startSec = ni;
      }
      renderContents();
      renderSection(startSec);
    }).catch(function () {
      document.getElementById('act-main').innerHTML =
        '<p class="act-load-error">Could not open your book &mdash; tap &ldquo;The shelf&rdquo; above and try again.</p>';
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

    // footer holds the (optional) end-of-exercise self-evaluation card + the Next
    // button. Rebuilt whenever a question saves, so the card appears the moment
    // the last question in the section locks.
    var footer = document.createElement('div');
    main.appendChild(footer);
    function refreshFooter() { buildSectionFooter(footer, sec, i, pack); }

    var strips = [];
    sec.questions.forEach(function (q, qi) {
      var holder = document.createElement('div');
      jotter.appendChild(holder);
      // content-safe support: a pupil-pullable "Want to see how?" that replays the
      // section's existing method movie inline. Earned only once the pupil has used
      // both attempts and is still not right (or when a teacher nudges it on) — so it
      // never reads as a free shortcut.
      var strip = sec.movie ? buildSupportStrip(sec, q) : null;
      window.GJ_JOTTER.mount(holder, q, current.state.qs[q.id] || null, {
        actId: current.act.id,
        number: q.num || (qi + 1),
        onSave: function (qid, rec) {
          current.state.qs[qid] = rec;
          scheduleSave();
          renderContents();
          refreshFooter();
          if (strip && supportEarned(rec)) strip._reveal();   // surfaced the moment they're wrong twice
        }
      });
      if (strip) {
        jotter.appendChild(strip);
        strips.push(strip);
        if (supportEarned(current.state.qs[q.id])) strip._reveal();   // already earned on re-entry
      }
    });

    // a teacher "nudge" (set on load) reveals + gently opens the support for this
    // section once, regardless of attempts.
    if (strips.length && current.nudge && current.nudge.sec === sec.id) {
      strips[0].classList.add('nudged');
      if (strips[0]._openSupport) strips[0]._openSupport();
      current.nudge = null;   // one-shot: don't re-open every time the pupil revisits
    }

    refreshFooter();
    renderContents();
  }

  /* "Want to see how?" — lazily mounts the section's existing method movie under a
     question on demand (no new content). The pull is recorded lightly in state so a
     teacher can see who self-served support; it rides the normal save plumbing. */
  function buildSupportStrip(sec, q) {
    var wrap = document.createElement('div');
    wrap.className = 'want-how';
    wrap.hidden = true;                          // earned (2 wrong attempts) or nudged before it appears
    var btn = document.createElement('button');
    btn.className = 'want-how-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="wh-caret" aria-hidden="true">&#9656;</span> Want to see how?';
    var host = document.createElement('div');
    host.className = 'want-how-body';
    host.hidden = true;
    var mounted = false;
    function reveal() { wrap.hidden = false; }
    function open() {
      reveal();
      if (!mounted) {
        // lead with THIS pupil's own slip (their flagged line + the misconception the
        // marker found) — content-safe, no answer given; then the method movie below.
        var slip = slipCard(q);
        if (slip) host.appendChild(slip);
        var movieHost = document.createElement('div');
        host.appendChild(movieHost);                 // mount() clears its host, so give the movie its own
        window.GJ_PLAYER.mount(movieHost, sec.movie, { accent: current.act.accent });
        mounted = true; recordHelp(q.id);
      }
      host.hidden = false; wrap.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
    }
    function close() { host.hidden = true; wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () { if (host.hidden) open(); else close(); });
    wrap.appendChild(btn); wrap.appendChild(host);
    wrap._reveal = reveal;
    wrap._openSupport = open;
    return wrap;
  }
  /* Support is earned once the pupil has used both attempts and is still not right
     (the app caps at two tries, so this is "wrong twice in a row"). AMBER counts —
     answer with no working twice means the method movie is still the right help. */
  function supportEarned(rec) {
    if (!rec || !rec.lock || !rec.att || rec.att.length < 2) return false;
    var last = rec.att[rec.att.length - 1];
    return !!last && last.res !== 'OK';
  }
  function recordHelp(qid) {
    if (!current.state) return;
    if (!current.state.help) current.state.help = {};
    if (!current.state.help[qid]) { current.state.help[qid] = Math.floor(Date.now() / 1000); scheduleSave(); }
  }
  function prettyP(s) { return String(s == null ? '' : s).replace(/-/g, '−').replace(/\*/g, '×'); }
  function escP(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* The pupil's own slip for this question: their first flagged working line + the
     misconception the marker named. Re-marks their last attempt with the existing
     engine; returns null for tap-only questions (no working line) or if nothing was
     flagged. No answer is revealed — only their own line and the named slip. */
  function slipDetail(q) {
    if (q.kind === 'classify' || q.kind === 'protractor') return null;
    var rec = current.state && current.state.qs && current.state.qs[q.id];
    if (!rec || !rec.att || !rec.att.length) return null;
    var last = rec.att[rec.att.length - 1], verdict;
    try {
      verdict = current.act.id === 'angles' ? window.GJ_ANGLES.checkSteps(q, last.steps || []) : window.GJ_MATH.checkQuestion(q, last);
    } catch (e) { return null; }
    var line = null, dx = null;
    if (verdict.perLine) {
      var i = verdict.perLine.findIndex(function (l) { return l.ok === 0; });
      if (i >= 0) { dx = verdict.perLine[i].dx || null; if (last.L && last.L[i]) line = prettyP(last.L[i].t); }
    } else if (verdict.perStep) {
      var j = verdict.perStep.findIndex(function (l) { return l.val === 0 || l.rsn === 0; });
      if (j >= 0) { dx = verdict.perStep[j].dx || null; if (last.steps && last.steps[j]) line = '∠' + last.steps[j].ang + ' = ' + last.steps[j].val + '°'; }
    }
    if (!line && !dx) return null;
    return { line: line, label: (dx && window.GJ_DX && window.GJ_DX[dx]) || null };
  }
  function slipCard(q) {
    var d = slipDetail(q);
    if (!d) return null;
    var card = document.createElement('div');
    card.className = 'wh-slip';
    var html = '<p class="wh-slip-h">Where it went wrong</p>';
    if (d.line) html += '<div class="wh-slip-line">' + escP(d.line) + '</div>';
    if (d.label) html += '<p class="wh-slip-why">This looks like: <b>' + escP(d.label) + '</b></p>';
    card.innerHTML = html;
    return card;
  }

  /* The section footer: once every question in the section is locked, a gentle
     "how did that go?" self-evaluation card appears above the Next button.
     Never blocking — the pupil can always just press Next. */
  function buildSectionFooter(footer, sec, i, pack) {
    footer.innerHTML = '';
    var complete = sec.questions.length > 0 && sectionTicks(sec) === sec.questions.length;
    if (complete && sec.cans && sec.cans.length) footer.appendChild(buildSelfEvalCard(sec));
    var nextRow = document.createElement('div');
    nextRow.className = 'check-row';
    var nextBtn = document.createElement('button');
    nextBtn.className = 'btn-stamp';
    nextBtn.textContent = (i + 1 < pack.sections.length) ? 'Next exercise →' : 'See my marks →';
    nextBtn.addEventListener('click', function () { renderSection(i + 1); });
    nextRow.appendChild(nextBtn);
    footer.appendChild(nextRow);
  }

  function seEl(tag, cls, txt) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (txt != null) d.textContent = txt;
    return d;
  }

  /* End-of-exercise self-evaluation. Auto-saves on every tap (no submit friction);
     keyed by section id; surfaced to the teacher via summary.evals. Measurable:
     a 1-3 confidence, a per-"I can…" 1-3 rating, and an optional note. */
  function buildSelfEvalCard(sec) {
    current.state.evals = current.state.evals || {};
    var ev = current.state.evals[sec.id] || { conf: 0, skills: {}, note: '' };
    if (!ev.skills) ev.skills = {};
    var card = seEl('div', 'selfeval');
    function persist() { ev.ts = Math.floor(Date.now() / 1000); current.state.evals[sec.id] = ev; scheduleSave(); }

    var h = seEl('p', 'se-head');
    h.innerHTML = 'Exercise finished &mdash; how did that go? <span class="se-opt">optional</span>';
    card.appendChild(h);

    card.appendChild(seEl('p', 'se-label', 'How confident do you feel now?'));
    var confWrap = seEl('div', 'se-conf');
    var CONF = [[1, 'Still unsure'], [2, 'Getting there'], [3, 'Confident']];
    var confBtns = [];
    CONF.forEach(function (c) {
      var b = seEl('button', 'se-conf-btn se-conf-' + c[0]);
      b.type = 'button';
      b.innerHTML = '<span class="se-dot" aria-hidden="true"></span>' + c[1];
      if (ev.conf === c[0]) b.classList.add('on');
      b.setAttribute('aria-pressed', ev.conf === c[0] ? 'true' : 'false');
      b.addEventListener('click', function () {
        ev.conf = c[0];
        confBtns.forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
        persist();
      });
      confBtns.push(b); confWrap.appendChild(b);
    });
    card.appendChild(confWrap);

    card.appendChild(seEl('p', 'se-label', 'Tap how each part felt:'));
    sec.cans.forEach(function (can) {
      var row = seEl('div', 'se-skill');
      row.appendChild(seEl('span', 'se-skill-txt', can.text));
      var rate = seEl('span', 'se-rate');
      var RATE = [[3, 'got it', 'g'], [2, 'unsure', 'y'], [1, 'tricky', 'r']];
      var rateBtns = [];
      RATE.forEach(function (rt) {
        var rb = seEl('button', 'se-rate-btn se-rate-' + rt[2], rt[1]);
        rb.type = 'button';
        rb.setAttribute('aria-label', can.text + ' — ' + rt[1]);
        rb.setAttribute('aria-pressed', ev.skills[can.id] === rt[0] ? 'true' : 'false');
        if (ev.skills[can.id] === rt[0]) rb.classList.add('on');
        rb.addEventListener('click', function () {
          ev.skills[can.id] = rt[0];
          rateBtns.forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
          rb.classList.add('on'); rb.setAttribute('aria-pressed', 'true'); persist();
        });
        rateBtns.push(rb); rate.appendChild(rb);
      });
      row.appendChild(rate);
      card.appendChild(row);
    });

    var noteWrap = seEl('div', 'se-note');
    var note = document.createElement('input');
    note.type = 'text'; note.maxLength = 140;
    note.setAttribute('aria-label', 'Anything that tripped you up?');
    note.placeholder = 'Anything that tripped you up? (optional)';
    note.value = ev.note || '';
    note.addEventListener('input', function () { ev.note = note.value; persist(); });
    noteWrap.appendChild(note);
    card.appendChild(noteWrap);

    card.appendChild(seEl('p', 'se-saved', 'Saved as you tap — your teacher sees this on her class list.'));
    return card;
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
