/* The Glass Jotter — the teacher's markbook.
   Passcode-gated (server-side validated). Views: classes (create/delete,
   per-class activity tickboxes, link/QR) → Working Wall (live class grid,
   20 s poll) → Jotter Page drill-down (override: the teacher's judgement
   wins everywhere) → Marking Pile (misconception clusters + starter mode)
   → Same-Question Sweep. The app pre-marks; the teacher is the marker. */
(function () {
  'use strict';

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pretty(s) { return String(s).replace(/-/g, '−').replace(/\*/g, '×'); }

  /* A prominent pulsing GOLD wait-card, swapped into a .ui-msg element while a
     server round-trip runs (the OLS login-gated standard - bland grey text is
     not enough on a board). clearBusy restores plain text. html may contain
     entities; escape any pupil/class names yourself. */
  function busyCard(elm, html) {
    if (!elm) return;
    if (elm.getAttribute('data-base') === null) elm.setAttribute('data-base', elm.className);
    elm.className = 'panel-loading';
    elm.innerHTML = '<span class="panel-spinner" aria-hidden="true"></span><span>' + html + '</span>';
  }
  function clearBusy(elm, text) {
    if (!elm) return;
    var base = elm.getAttribute('data-base');
    elm.className = (base !== null) ? base : elm.className.replace(/\bpanel-loading\b/g, '').trim();
    elm.textContent = text || '';
  }
  /* Two-tap confirm dialog (mirrors showQr): a gj-modal above the panel.
     Never native confirm() - it is unreliable in the sandboxed iframe. */
  function openConfirm(title, bodyText, okLabel, cb) {
    var mroot = document.getElementById('gj-modal-root');
    if (mroot && mroot.children.length) return;   // never stack two dialogs
    var back = el('div', 'gj-modal-backdrop gj-modal-zstack');
    var card = el('div', 'gj-modal');
    card.innerHTML = '<h2>' + esc(title) + '</h2><p class="ui-msg">' + esc(bodyText) + '</p>' +
      '<div class="gj-confirm-actions"><button class="btn-pencil" id="gj-cf-cancel">Cancel</button>' +
      '<button class="btn-stamp" id="gj-cf-ok">' + esc(okLabel || 'Confirm') + '</button></div>';
    back.appendChild(card);
    mroot.appendChild(back);
    function done(v) { back.remove(); if (cb) cb(v); }
    card.querySelector('#gj-cf-ok').addEventListener('click', function () { done(true); });
    card.querySelector('#gj-cf-cancel').addEventListener('click', function () { done(false); });
    back.addEventListener('click', function (e) { if (e.target === back) done(false); });
    card.querySelector('#gj-cf-ok').focus();
  }

  var root = document.getElementById('scr-staff');
  var passcode = null;
  var classes = [];
  var meEmail = '';        // the signed-in teacher (server-verified)
  var isAdmin = false;     // true => deploy owner (HOD): sees every class
  var view = { cls: null, act: 'angles', wallTimer: null, wallSeq: 0, wallData: null };

  function call(sub, extra) {
    var p = { passcode: passcode, sub: sub };
    Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
    return window.GJ.app.call('admin', p);
  }

  /* clipboard: navigator.clipboard → execCommand textarea → show the text */
  function copyText(text, msgEl, okMsg) {
    function done() { if (msgEl) msgEl.textContent = okMsg || 'Copied.'; }
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (ok) done(); else if (msgEl) msgEl.textContent = 'Copy this by hand: ' + text;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, legacy);
    else legacy();
  }

  function classLink(name) {
    var base = (window.GJ.app.boot.baseUrl) ||
      (location.origin + location.pathname);
    return base + (base.indexOf('?') === -1 ? '?' : '&') + 'class=' + encodeURIComponent(name);
  }

  function stopPolling() { clearInterval(view.wallTimer); view.wallTimer = null; }

  function shell(title, bodyEl, backFn) {
    stopPolling();
    root.innerHTML = '';
    var head = el('div', 'staff-head');
    if (backFn) {
      var back = el('button', 'btn-pencil btn-back', '&larr; Back');
      back.addEventListener('click', backFn);
      head.appendChild(back);
    }
    head.appendChild(el('h1', '', esc(title)));
    var closeB = el('button', 'btn-pencil btn-back', 'Close markbook');
    closeB.style.marginLeft = 'auto';
    closeB.addEventListener('click', function () {
      stopPolling();
      window.GJ.app.showScreen('cover');
    });
    head.appendChild(closeB);
    root.appendChild(head);
    var main = el('div', 'staff-main');
    main.appendChild(bodyEl);
    root.appendChild(main);
    window.GJ.app.showScreen('staff');
    window.scrollTo(0, 0);
  }

  /* ═══ gate ════════════════════════════════════════════════════════ */
  function open() {
    if (passcode) { showClasses(); return; }
    var body = el('div', '');
    body.innerHTML =
      '<p class="ui-msg">The markbook is for staff. Enter the department passcode.</p>' +
      '<div class="check-row"><input id="st-pass" type="password" autocomplete="off" ' +
      'style="font-family:var(--f-stationery);font-size:15px;padding:10px;border:1.5px solid var(--navy);border-radius:4px;max-width:240px" ' +
      'aria-label="Staff passcode" />' +
      '<button id="st-go" class="btn-stamp">Open the markbook</button></div>' +
      '<p id="st-msg" class="ui-msg" role="alert"></p>';
    shell('The Markbook', body, null);
    var go = body.querySelector('#st-go');
    function unlock() {
      if (go.disabled) return;
      go.disabled = true;
      busyCard(body.querySelector('#st-msg'), 'Checking the passcode&hellip; this can take a moment');
      var tryPass = body.querySelector('#st-pass').value;
      passcode = tryPass;
      call('classes').then(function (r) {
        go.disabled = false;
        if (!r || !r.ok) {
          passcode = null;
          clearBusy(body.querySelector('#st-msg'), (r && r.error) || 'That passcode was not accepted.');
          return;
        }
        classes = r.classes || [];
        meEmail = r.me || ''; isAdmin = !!r.isAdmin;
        showClasses();
      }).catch(function () {
        go.disabled = false; passcode = null;
        clearBusy(body.querySelector('#st-msg'), 'Could not reach the server — try again.');
      });
    }
    go.addEventListener('click', unlock);
    body.querySelector('#st-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') unlock(); });
    body.querySelector('#st-pass').focus();
  }

  /* ═══ classes ═════════════════════════════════════════════════════ */
  function reloadClasses() {
    return call('classes').then(function (r) {
      if (r && r.ok) { classes = r.classes || []; meEmail = r.me || ''; isAdmin = !!r.isAdmin; }
    });
  }

  function showClasses() {
    var body = el('div', '');
    var scopeNote = isAdmin
      ? 'You are the markbook owner &mdash; you can see and manage every class.'
      : 'Showing the classes you created &mdash; each teacher sees only their own.';
    if (meEmail) scopeNote += ' <span style="opacity:.65">(' + esc(meEmail) + ')</span>';
    body.innerHTML =
      '<p class="ui-msg" style="margin-bottom:var(--sq)">' + scopeNote + '</p>' +
      '<div class="check-row" style="margin-bottom:var(--sq)">' +
      '<input id="st-newclass" type="text" maxlength="40" placeholder="e.g. 10B Maths" ' +
      'style="font-family:var(--f-stationery);font-size:15px;padding:10px;border:1.5px solid var(--navy);border-radius:4px;max-width:240px" aria-label="New class name" />' +
      '<button id="st-add" class="btn-stamp">Add a class</button>' +
      '<span id="st-cmsg" class="ui-msg" role="status"></span></div>' +
      '<table class="ledger"><thead><tr><th>Class</th><th>Pupils</th><th>Books on the shelf</th><th></th></tr></thead>' +
      '<tbody id="st-rows"></tbody></table>' +
      '<p class="ui-msg" style="margin-top:var(--sq)">Tick a book to put it on that class’s shelf. Pupils see ticked books only.</p>';
    shell('The Markbook · ' + (isAdmin ? 'All classes' : 'Your classes'), body, null);
    var rows = body.querySelector('#st-rows');
    var cmsg = body.querySelector('#st-cmsg');

    function render() {
      rows.innerHTML = '';
      if (!classes.length) {
        rows.innerHTML = '<tr><td colspan="4" class="ui-msg">No classes yet — add your first class above, then share its link with the pupils.</td></tr>';
      }
      classes.forEach(function (c) {
        var tr = document.createElement('tr');
        var ticks = el('td', '');
        var tickWrap = el('div', 'acts-ticks');
        window.GJ.app.activities.forEach(function (a) {
          var lab = el('label', 'tickbox');
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = !!(c.acts && c.acts[a.id]);
          cb.addEventListener('change', function () {
            var acts = {};
            window.GJ.app.activities.forEach(function (a2) { acts[a2.id] = a2.id === a.id ? cb.checked : !!(c.acts && c.acts[a2.id]); });
            cb.disabled = true;
            call('setActs', { className: c.name, acts: acts }).then(function (r) {
              cb.disabled = false;
              if (r && r.ok) { c.acts = acts; cmsg.textContent = a.title + (cb.checked ? ' is now on ' : ' removed from ') + c.name + '’s shelf.'; }
              else { cb.checked = !cb.checked; cmsg.textContent = (r && r.error) || 'Could not save that.'; }
            }).catch(function () { cb.disabled = false; cb.checked = !cb.checked; cmsg.textContent = 'Could not save that.'; });
          });
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode(a.title));
          tickWrap.appendChild(lab);
        });
        ticks.appendChild(tickWrap);

        var actions = el('td', '');
        var wallB = el('button', 'btn-pencil', 'Working Wall');
        wallB.addEventListener('click', function () { view.cls = c.name; showWall(); });
        var linkB = el('button', 'btn-pencil', 'Copy link');
        linkB.style.marginLeft = '6px';
        linkB.addEventListener('click', function () { copyText(classLink(c.name), cmsg, 'Link for ' + c.name + ' copied.'); });
        var qrB = el('button', 'btn-pencil', 'QR');
        qrB.style.marginLeft = '6px';
        qrB.addEventListener('click', function () { showQr(c.name); });
        var delB = el('button', 'btn-pencil', '&times;');
        delB.setAttribute('aria-label', 'Delete ' + c.name);
        delB.style.marginLeft = '6px';
        delB.addEventListener('click', function () {
          openConfirm('Delete ' + c.name + '?',
            'This deletes ' + c.name + ' and all its work from the markbook. This cannot be undone.',
            'Delete class', function (yes) {
              if (!yes) return;
              delB.disabled = true;
              busyCard(cmsg, 'Deleting ' + esc(c.name) + '&hellip; this can take a moment');
              call('deleteClass', { className: c.name }).then(function (r) {
                if (r && r.ok) { classes = classes.filter(function (x) { return x.name !== c.name; }); render(); clearBusy(cmsg, c.name + ' deleted.'); }
                else { delB.disabled = false; clearBusy(cmsg, (r && r.error) || 'Could not delete.'); }
              }).catch(function () { delB.disabled = false; clearBusy(cmsg, 'Could not reach the server.'); });
            });
        });
        actions.appendChild(wallB); actions.appendChild(linkB); actions.appendChild(qrB); actions.appendChild(delB);

        tr.appendChild(el('td', '', '<b>' + esc(c.name) + '</b>'));
        tr.appendChild(el('td', '', String(c.count || 0)));
        tr.appendChild(ticks);
        tr.appendChild(actions);
        rows.appendChild(tr);
      });
    }
    render();

    var addB = body.querySelector('#st-add');
    addB.addEventListener('click', function () {
      if (addB.disabled) return;
      var nm = body.querySelector('#st-newclass').value.trim();
      if (!nm) { cmsg.textContent = 'Give the class a name first.'; return; }
      addB.disabled = true;
      busyCard(cmsg, 'Adding ' + esc(nm) + '&hellip; this can take a moment');
      call('addClass', { className: nm }).then(function (r) {
        addB.disabled = false;
        if (r && r.ok) {
          classes.push({ name: r.name, acts: r.acts || { angles: true, algebra: true }, count: 0 });
          body.querySelector('#st-newclass').value = '';
          render();
          clearBusy(cmsg, r.name + ' added with both books on its shelf — untick any you want to hold back, then copy its link.');
          reloadClasses().then(render);
        } else clearBusy(cmsg, (r && r.error) || 'Could not add that class.');
      }).catch(function () { addB.disabled = false; clearBusy(cmsg, 'Could not reach the server.'); });
    });
  }

  function showQr(name) {
    var back = el('div', 'gj-modal-backdrop gj-modal-zstack');
    var card = el('div', 'gj-modal gj-qr');
    card.innerHTML = '<h2>' + esc(name) + '</h2><canvas id="st-qr" width="260" height="260"></canvas>' +
      '<p class="ui-msg" style="word-break:break-all">' + esc(classLink(name)) + '</p>' +
      '<div class="check-row"><button class="btn-stamp" id="st-qr-copy">Copy link</button>' +
      '<button class="btn-pencil" id="st-qr-close">Close</button></div><p class="ui-msg" id="st-qmsg"></p>';
    back.appendChild(card);
    document.getElementById('gj-modal-root').appendChild(back);
    if (window.QRCode && window.QRCode.toCanvas) {
      window.QRCode.toCanvas(card.querySelector('#st-qr'), classLink(name),
        { width: 260, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1A3A6B', light: '#ffffff' } }, function () {});
    }
    card.querySelector('#st-qr-copy').addEventListener('click', function () {
      copyText(classLink(name), card.querySelector('#st-qmsg'), 'Copied.');
    });
    card.querySelector('#st-qr-close').addEventListener('click', function () { back.remove(); });
    back.addEventListener('click', function (e) { if (e.target === back) back.remove(); });
  }

  /* ═══ shared marking helpers (the staff client re-marks with the
         same engines the pupil used — one marker, two views) ═══════ */
  function questionList(actId) {
    var pack = window.GJ.app.content(actId);
    var out = [];
    pack.sections.forEach(function (sec, si) {
      sec.questions.forEach(function (q, qi) {
        out.push({ q: q, label: 'Ex' + (si + 1) + '.Q' + (qi + 1), secId: sec.id, secHasMovie: !!sec.movie });
      });
    });
    return out;
  }
  function markState(actId, state, q) {
    var rec = state && state.qs && state.qs[q.id];
    if (!rec || !rec.att || !rec.att.length) return { st: 'un' };
    var last = rec.att[rec.att.length - 1];
    var verdict = null;
    try {
      if (q.kind === 'classify') {
        var right = last.pick === q.classify;
        verdict = { res: right ? 'OK' : 'X@1', mk: [0, right ? 1 : 0], mkMax: [0, 1], perLine: [] };
      } else if (q.kind === 'protractor') {
        var pok = Math.abs((last.read || 0) - q.value) <= (q.tol || 3);
        verdict = { res: pok ? 'OK' : 'X@1', mk: [0, pok ? 1 : 0], mkMax: [0, 1], perLine: [{ dx: pok ? null : (last.dx || 'MISREAD') }] };
      } else {
        verdict = actId === 'angles' ? window.GJ_ANGLES.checkSteps(q, last.steps || []) : window.GJ_MATH.checkQuestion(q, last);
      }
    } catch (e) { return { st: 'un' }; }
    var out = {
      st: !rec.lock ? 'open' : verdict.res === 'OK' ? 'ok' : verdict.res === 'AMBER' ? 'amber' : 'err',
      verdict: verdict, rec: rec, last: last
    };
    var ov = rec.ovr && rec.ovr.q;
    if (ov === 1) out.st = 'ok';
    if (ov === 0) out.st = 'err';
    if (out.st === 'err' && verdict.res && String(verdict.res).indexOf('X@') === 0) out.errAt = Number(String(verdict.res).slice(2)) || 1;
    var dxs = (verdict.perLine || verdict.perStep || []).map(function (l) { return l.dx; }).filter(Boolean);
    if (dxs.length) out.dx = dxs[0];
    // the offending line itself — the starter shows the pupil's own slip
    if (out.st === 'err') {
      var lines = last.L || [];
      var firstBad = (verdict.perLine || []).findIndex(function (l) { return l.ok === 0; });
      if (firstBad >= 0 && lines[firstBad]) out.cluster = pretty(lines[firstBad].t);
      var steps = last.steps || [];
      var firstBadS = (verdict.perStep || []).findIndex(function (l) { return l.val === 0 || l.rsn === 0; });
      if (firstBadS >= 0 && steps[firstBadS]) out.cluster = '∠' + steps[firstBadS].ang + ' = ' + steps[firstBadS].val + '°';
      if (q.kind === 'protractor' && last.read != null) out.cluster = 'measured ' + last.read + '° (true ' + q.value + '°)';
    }
    return out;
  }

  var DX_NAMES = {
    EXPAND_PARTIAL: 'Expanded only the first term', EXPAND_SIGN: 'Sign slip when expanding',
    SUB_INSTEAD_DIV: 'Subtracted instead of dividing', DIV_BEFORE_SUB: 'Divided before subtracting',
    SIGN_FLIP_MOVE: 'Sign not flipped moving a term', COLLECT_X_NUM: 'Collected x-terms with numbers',
    NEG_MUL_SIGN: 'Negative × negative slip', BOTHSIDES_ONE_SIDE: 'Operated on one side only',
    SWAP_NOFLIP: 'Swapped sides without care', ALT_CORR_SWAP: 'Alternate/corresponding confused',
    COINT_EQUAL: 'Treated interior (U) angles as equal', TRI_SUM_360: 'Used 360° in a triangle',
    STRAIGHT_360: 'Used 360° on a straight line', VOP_SUPP: 'Mixed up vertically opposite with the straight-line pair',
    WRONG_SCALE: 'Read the wrong protractor scale', MISREAD: 'Misread / misplaced the protractor'
  };

  /* ═══ Class Insights — analytics from the cheap wall summary ═══════════
     Reads only the per-question summary the Working Wall already polls
     (st / errAt / dx / mk / t / at / a1) plus the per-section self-eval
     (summary.evals), so no heavy full-state fetch is needed. Working is
     weighted as much as the answer: every stat splits method vs accuracy,
     and "stretch" requires shown working (not answer-only AMBER). */
  function insAvg(arr) { var v = arr.filter(function (x) { return x != null; }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null; }
  function insPct(x) { return x == null ? '—' : Math.round(100 * x) + '%'; }
  function insTop(obj) { var k = Object.keys(obj); if (!k.length) return null; k.sort(function (a, b) { return obj[b] - obj[a]; }); return { key: k[0], n: obj[k[0]] }; }
  function insTile(big, small) { return '<div class="ins-tile"><span class="ins-big">' + big + '</span><span class="ins-small">' + esc(small) + '</span></div>'; }
  function insH(text) { return el('h2', 'ins-h', esc(text)); }

  function pupilStats(p, qlist) {
    var s = (p && p.summary) || {}, qs = s.qs || {};
    var r = { attempted: 0, finished: 0, ok: 0, amber: 0, err: 0, firstTry: 0, methodGot: 0, methodMax: 0, accGot: 0, accMax: 0, timeSum: 0, timeN: 0 };
    qlist.forEach(function (item) {
      var mk = item.q.marks || [0, 0];
      r.methodMax += mk[0]; r.accMax += mk[1];
      var c = qs[item.q.id];
      if (!c || c.st === 'un') return;
      var st = c.ovr === 1 ? 'ok' : c.ovr === 0 ? 'err' : c.st;
      r.attempted++;
      if (st === 'open') return;
      r.finished++;
      if (c.mk) { r.methodGot += c.mk[0] || 0; r.accGot += c.mk[1] || 0; }
      if (c.t != null) { r.timeSum += c.t; r.timeN++; }
      if (st === 'ok') { r.ok++; if (c.a1 === 1) r.firstTry++; }
      else if (st === 'amber') r.amber++;
      else if (st === 'err') r.err++;
    });
    r.avgTime = r.timeN ? r.timeSum / r.timeN : 0;
    r.methodRate = r.methodMax ? r.methodGot / r.methodMax : null;   // null = no method marks to assess (don't read as 100%)
    r.firstTryRate = r.finished ? r.firstTry / r.finished : 0;
    r.errRate = r.finished ? r.err / r.finished : 0;
    r.amberRate = r.finished ? r.amber / r.finished : 0;
    var evals = s.evals || {};
    var confs = Object.keys(evals).map(function (k) { return Number(evals[k].conf) || 0; }).filter(function (v) { return v > 0; });
    r.avgConf = confs.length ? confs.reduce(function (a, b) { return a + b; }, 0) / confs.length : null;
    return r;
  }

  /* Advisory flags shown with their evidence; thresholds are deliberate defaults. */
  function pupilFlag(st, medianTime, total) {
    if (st.finished < 3) return null;
    var sup = [];
    if (st.errRate >= 0.34) sup.push(st.err + ' wrong');
    if (st.amberRate >= 0.4) sup.push(st.amber + ' answer-only');
    if (medianTime && st.avgTime > medianTime * 1.6) sup.push('slower than most');
    if (st.avgConf != null && st.avgConf <= 1.5 && st.methodRate != null && st.methodRate < 0.6) sup.push('low confidence');
    if (sup.length) return { kind: 'support', reasons: sup };
    // stretch needs shown working: methodRate must be assessable (>0 method marks) and high.
    if (st.finished >= Math.max(5, Math.round(total * 0.6)) && st.firstTryRate >= 0.8 && st.methodRate != null && st.methodRate >= 0.9 && st.amber === 0 && (st.avgConf == null || st.avgConf >= 2.5)) {
      return { kind: 'stretch', reasons: ['all first-try', 'full working shown'] };
    }
    return null;
  }
  function confidenceFlag(st) {
    if (st.avgConf == null || st.finished < 3) return null;
    if (st.avgConf >= 2.5 && ((st.methodRate != null && st.methodRate < 0.6) || st.errRate >= 0.34)) return 'over';
    if (st.avgConf <= 1.5 && st.methodRate != null && st.methodRate >= 0.8 && st.firstTryRate >= 0.6) return 'under';
    return null;
  }

  function showInsights() {
    var body = el('div', '');
    var actTabs = el('div', 'check-row');
    window.GJ.app.activities.forEach(function (a) {
      var b = el('button', view.act === a.id ? 'btn-stamp' : 'btn-pencil', a.title);
      b.addEventListener('click', function () { view.act = a.id; showInsights(); });
      actTabs.appendChild(b);
    });
    body.appendChild(actTabs);
    var host = el('div', 'ins-host');
    var msg = el('p', 'ui-msg', '');
    msg.style.marginTop = '20px';
    host.appendChild(msg);
    body.appendChild(host);
    shell(view.cls + ' · Class Insights', body, function () { showWall(); });
    busyCard(msg, 'Reading the class&hellip; this can take a moment');
    call('wall', { className: view.cls, act: view.act }).then(function (r) {
      if (!r || !r.ok) { clearBusy(msg, (r && r.error) || 'Could not load insights.'); return; }
      view.wallData = r.pupils || [];
      host.innerHTML = '';
      renderInsights(host, view.wallData);
    }).catch(function () { clearBusy(msg, 'Could not reach the server — try again.'); });
  }

  function renderInsights(host, pupils) {
    var qlist = questionList(view.act);
    var pack = window.GJ.app.content(view.act);
    var total = qlist.length;
    var rows = (pupils || []).map(function (p) { return { p: p, st: pupilStats(p, qlist) }; })
      .filter(function (x) { return x.st.attempted > 0; });
    if (!rows.length) { host.appendChild(el('p', 'ui-msg', 'No pupil has opened this activity yet — share the class link to get started.')); return; }
    var times = rows.map(function (x) { return x.st.avgTime; }).filter(function (t) { return t > 0; }).sort(function (a, b) { return a - b; });
    var medianTime = times.length ? times[Math.floor(times.length / 2)] : 0;
    rows.forEach(function (x) { x.flag = pupilFlag(x.st, medianTime, total); x.conf = confidenceFlag(x.st); });

    /* class band */
    var avgMethod = insAvg(rows.map(function (x) { return x.st.methodMax ? x.st.methodGot / x.st.methodMax : null; }));
    var avgAcc = insAvg(rows.map(function (x) { return x.st.accMax ? x.st.accGot / x.st.accMax : null; }));
    var avgConf = insAvg(rows.map(function (x) { return x.st.avgConf; }));
    var doneCells = rows.reduce(function (a, x) { return a + x.st.finished; }, 0);
    var pctComplete = Math.round(100 * doneCells / (rows.length * total || 1));
    var nSupport = rows.filter(function (x) { return x.flag && x.flag.kind === 'support'; }).length;
    var nStretch = rows.filter(function (x) { return x.flag && x.flag.kind === 'stretch'; }).length;
    host.appendChild(insH('How ' + view.cls + ' is doing'));
    var band = el('div', 'ins-band');
    band.innerHTML =
      insTile(rows.length, 'pupils started') +
      insTile(pctComplete + '%', 'questions finished') +
      insTile(insPct(avgMethod), 'method (working)') +
      insTile(insPct(avgAcc), 'accuracy (answers)') +
      insTile(avgConf != null ? avgConf.toFixed(1) : '—', 'avg confidence /3') +
      insTile(nSupport + ' / ' + nStretch, 'support / stretch');
    host.appendChild(band);

    /* hardest questions — where the working breaks */
    var qstats = qlist.map(function (item) {
      var t = { item: item, ok: 0, amber: 0, err: 0, firstTry: 0, retried: 0, touched: 0, dx: {}, errAt: {} };
      rows.forEach(function (x) {
        var c = (x.p.summary.qs || {})[item.q.id];
        if (!c || c.st === 'un') return;
        var st = c.ovr === 1 ? 'ok' : c.ovr === 0 ? 'err' : c.st;
        if (st === 'open') return;
        t.touched++;
        if (st === 'ok') { t.ok++; if (c.a1 === 1) t.firstTry++; else t.retried++; }
        else if (st === 'amber') t.amber++;
        else if (st === 'err') { t.err++; if (c.dx) t.dx[c.dx] = (t.dx[c.dx] || 0) + 1; if (c.errAt) t.errAt[c.errAt] = (t.errAt[c.errAt] || 0) + 1; }
      });
      t.struggle = t.err * 3 + t.amber * 2 + t.retried;   // wrong answers lead, then answer-only, then retries
      return t;
    }).filter(function (t) { return t.touched > 0 && t.struggle > 0; });
    qstats.sort(function (a, b) { return b.struggle - a.struggle; });
    var hardest = qstats.slice(0, 8);
    host.appendChild(insH('Where the class is struggling'));
    if (!hardest.length) {
      host.appendChild(el('p', 'ui-msg', 'No struggle spots yet — every finished question is sound so far.'));
    } else {
      var qt = ['<table class="ins-table"><thead><tr><th>Question</th><th>Got it</th><th>Wrong</th><th>Answer-only</th><th>Most common slip</th><th>Trips at</th></tr></thead><tbody>'];
      hardest.forEach(function (t) {
        var dxTop = insTop(t.dx), atTop = insTop(t.errAt);
        qt.push('<tr class="ins-row" data-qid="' + esc(t.item.q.id) + '" tabindex="0" role="button" aria-expanded="false"><td class="ins-q"><b>' + esc(t.item.label) + '</b> <span class="ins-caret" aria-hidden="true">&#9656;</span><span class="ins-qp">' + esc(String(t.item.q.prompt || '').slice(0, 48)) + '</span></td>' +
          '<td>' + t.ok + (t.retried ? ' <span class="ins-dim">(' + t.firstTry + ' 1st)</span>' : '') + '</td>' +
          '<td class="ins-bad">' + (t.err || '') + '</td>' +
          '<td>' + (t.amber || '') + '</td>' +
          '<td>' + (dxTop ? esc(DX_NAMES[dxTop.key] || dxTop.key) + ' &times;' + dxTop.n : '<span class="ins-dim">&mdash;</span>') + '</td>' +
          '<td>' + (atTop ? 'line ' + esc(String(atTop.key)) : '<span class="ins-dim">&mdash;</span>') + '</td></tr>');
      });
      qt.push('</tbody></table>');
      var qd = el('div', 'wall'); qd.innerHTML = qt.join(''); host.appendChild(qd);
      host.appendChild(el('p', 'ins-hint', 'Tap a question to see the exact working step the class breaks on.'));
      wireDrill(qd, hardest);
    }

    /* self-eval: which "I can…" skills the class found hardest */
    var canMap = {};
    pack.sections.forEach(function (sec) { (sec.cans || []).forEach(function (can) { canMap[can.id] = can.text; }); });
    var canTally = {};
    rows.forEach(function (x) {
      var evals = x.p.summary.evals || {};
      Object.keys(evals).forEach(function (secId) {
        var sk = (evals[secId] && evals[secId].skills) || {};
        Object.keys(sk).forEach(function (cid) {
          var v = sk[cid], tt = canTally[cid] = canTally[cid] || { hard: 0, n: 0 };
          tt.n++; if (v === 1 || v === 2) tt.hard++;
        });
      });
    });
    var hardSkills = Object.keys(canTally).map(function (cid) {
      var tt = canTally[cid]; return { text: canMap[cid] || cid, n: tt.n, pct: tt.n ? Math.round(100 * tt.hard / tt.n) : 0 };
    }).filter(function (s) { return s.n > 0 && s.pct > 0; }).sort(function (a, b) { return b.pct - a.pct; }).slice(0, 5);
    if (hardSkills.length) {
      host.appendChild(insH('What pupils told you (self-review)'));
      var sl = el('div', 'ins-skills');
      hardSkills.forEach(function (s) {
        sl.appendChild(el('div', 'ins-skill',
          '<span class="ins-skill-bar"><span style="width:' + s.pct + '%"></span></span>' +
          '<span class="ins-skill-txt">' + esc(s.text) + '</span>' +
          '<span class="ins-skill-pct">' + s.pct + '% found tricky</span>'));
      });
      host.appendChild(sl);
    }

    /* flag board */
    host.appendChild(insH('Pupils to look at'));
    var fb = el('div', 'ins-flags');
    fb.appendChild(flagCol('Needs support', 'support', rows.filter(function (x) { return x.flag && x.flag.kind === 'support'; })));
    fb.appendChild(flagCol('Ready for stretch', 'stretch', rows.filter(function (x) { return x.flag && x.flag.kind === 'stretch'; })));
    host.appendChild(fb);

    /* confidence vs performance */
    var over = rows.filter(function (x) { return x.conf === 'over'; });
    var under = rows.filter(function (x) { return x.conf === 'under'; });
    if (over.length || under.length) {
      host.appendChild(insH('Confidence vs. performance'));
      var cv = el('div', 'ins-flags');
      if (over.length) cv.appendChild(confCol('Over-confident', 'high confidence, weaker working — worth a check-in', over));
      if (under.length) cv.appendChild(confCol('Quietly excelling', 'doing well but low confidence — reassure and stretch', under));
      host.appendChild(cv);
    }

    host.appendChild(el('p', 'ui-msg', 'Flags are a starting point from this activity, not a verdict — tap a name to open the pupil’s jotter.'));
  }

  /* Deep drill-down (full-state tier): tap a struggling-question row to fetch every
     pupil's working once and show the EXACT step the class breaks on. Heavy fetch is
     opt-in and cached for the life of this Insights view (one open at a time). */
  function wireDrill(qd, hardest) {
    var fsPromise = null;                         // fullStates() fetched once per Insights view
    var byId = {};
    hardest.forEach(function (h) { byId[h.item.q.id] = h.item; });
    function toggle(tr) {
      var qid = tr.getAttribute('data-qid'), item = byId[qid];
      if (!item) return;
      var next = tr.nextSibling;
      if (next && next.className === 'ins-drill-row' && next.getAttribute('data-for') === qid) {
        next.remove(); tr.classList.remove('open'); tr.setAttribute('aria-expanded', 'false'); return;
      }
      Array.prototype.forEach.call(qd.querySelectorAll('tr.ins-drill-row'), function (r) { r.remove(); });
      Array.prototype.forEach.call(qd.querySelectorAll('tr.ins-row.open'), function (r) { r.classList.remove('open'); r.setAttribute('aria-expanded', 'false'); });
      tr.classList.add('open'); tr.setAttribute('aria-expanded', 'true');
      var drow = document.createElement('tr');
      drow.className = 'ins-drill-row'; drow.setAttribute('data-for', qid);
      var cell = document.createElement('td'); cell.colSpan = 6; cell.className = 'ins-drill';
      cell.innerHTML = '<div class="panel-loading"><span class="panel-spinner" aria-hidden="true"></span><span>Reading every pupil&rsquo;s working&hellip;</span></div>';
      drow.appendChild(cell);
      tr.parentNode.insertBefore(drow, tr.nextSibling);
      (fsPromise || (fsPromise = fullStates())).then(function (all) {
        renderDrill(cell, item, all);
      }).catch(function () { cell.innerHTML = '<p class="ui-msg">Could not read the jotters — try again.</p>'; fsPromise = null; });
    }
    qd.addEventListener('click', function (e) {
      var tr = e.target.closest && e.target.closest('tr.ins-row');
      if (tr && qd.contains(tr)) toggle(tr);
    });
    qd.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var tr = e.target.closest && e.target.closest('tr.ins-row');
      if (tr && qd.contains(tr)) { e.preventDefault(); toggle(tr); }
    });
  }

  function normCluster(s) { return String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase(); }
  function isFirstTry(r) {
    // mirror the P1 a1 contract EXACTLY: right on the FIRST (and only) attempt.
    // a1 = (att.length===1 && effective-ok); the caller already guarantees st==='ok'
    // (override folded in), so a single attempt is all that distinguishes 1st-try
    // from retried — an overridden-correct pupil who needed 2+ attempts is a retry.
    return !!(r.rec && r.rec.att && r.rec.att.length === 1);
  }
  function renderDrill(cell, item, all) {
    var q = item.q;
    var first = 0, retry = 0, amber = 0, err = 0;
    var mGot = 0, mMax = 0, aGot = 0, aMax = 0;
    var methodCredit = 0, soundNoReach = 0, unpinned = 0, finished = 0, helpPulled = 0;
    var slips = {};                                // key → { count, label, example, dx }
    all.forEach(function (p) {
      var r = markState(view.act, p.state, q);
      if (!r || r.st === 'un' || r.st === 'open') return;
      finished++;
      if (p.state && p.state.help && p.state.help[q.id]) helpPulled++;   // pupil opened "Want to see how?" here
      var v = r.verdict;
      if (v && v.mkMax) {
        if (v.mkMax[0]) { mGot += (v.mk && v.mk[0]) || 0; mMax += v.mkMax[0]; }
        if (v.mkMax[1]) { aGot += (v.mk && v.mk[1]) || 0; aMax += v.mkMax[1]; }
      }
      if (r.st === 'ok') { if (isFirstTry(r)) first++; else retry++; }
      else if (r.st === 'amber') amber++;
      else if (r.st === 'err') {
        err++;
        var ovrWrong = !!(r.rec && r.rec.ovr && r.rec.ovr.q === 0);   // teacher marked it wrong: don't credit method against their judgement
        if (!ovrWrong && v && v.mk && v.mk[0] > 0) methodCredit++;     // honour working: slipped on the answer but method still earned credit
        if (r.cluster) {
          var key = r.dx ? 'dx:' + r.dx : 'c:' + normCluster(r.cluster);
          var s = slips[key] = slips[key] || { count: 0, label: r.dx ? (DX_NAMES[r.dx] || r.dx) : 'Same wrong line', example: r.cluster, dx: r.dx || null };
          s.count++;
          if (!s.dx && r.dx) { s.dx = r.dx; s.label = DX_NAMES[r.dx] || r.dx; }
        } else {
          // err but no single line flagged. Only claim "right method" when the
          // working really is sound: not teacher-marked-wrong, method marks earned,
          // and no bad line/step. Otherwise it's an error we can't pin to a line
          // (incl. an override-to-wrong or a locked blank) — label it neutrally.
          var anyBad = (v && (v.perLine || v.perStep) || []).some(function (x) { return x.ok === 0 || x.val === 0 || x.rsn === 0; });
          if (!ovrWrong && v && v.mk && v.mk[0] > 0 && !anyBad) soundNoReach++;
          else unpinned++;
        }
      }
    });

    if (!finished) { cell.innerHTML = '<p class="ui-msg">No finished attempts at this question yet.</p>'; return; }
    var out = el('div', 'drill');
    out.appendChild(el('p', 'drill-sub', esc(item.label) + ' — ' + finished + ' finished. ' + esc(String(q.prompt || '').slice(0, 90))));

    /* outcome mix — honours working (answer-only is its own bucket) */
    var mix = el('div', 'drill-mix');
    mix.innerHTML =
      drillChip(first, 'right first try', 'ok') +
      drillChip(retry, 'right on a retry', 'mid') +
      drillChip(amber, 'answer only (no working)', 'amber') +
      drillChip(err, 'not yet', 'bad');
    out.appendChild(mix);

    /* the exact breaking step — grouped by misconception / literal wrong line, ranked */
    out.appendChild(el('h4', 'drill-h', 'Where they break'));
    var keys = Object.keys(slips).sort(function (a, b) { return slips[b].count - slips[a].count; });
    if (!keys.length && !soundNoReach && !unpinned) {
      out.appendChild(el('p', 'ui-msg', 'No marked working errors — slips here are answer-only or already corrected.'));
    } else {
      var ul = el('div', 'drill-slips');
      keys.forEach(function (k) {
        var s = slips[k];
        ul.appendChild(el('div', 'drill-slip',
          '<span class="drill-count">' + s.count + '</span>' +
          '<span class="drill-line">' + esc(s.example) + '</span>' +
          '<span class="drill-why">' + esc(s.label) + '</span>'));
      });
      if (soundNoReach) ul.appendChild(el('div', 'drill-slip',
        '<span class="drill-count">' + soundNoReach + '</span>' +
        '<span class="drill-line ins-dim">working sound&hellip;</span>' +
        '<span class="drill-why">right method, final answer not reached</span>'));
      if (unpinned) ul.appendChild(el('div', 'drill-slip',
        '<span class="drill-count">' + unpinned + '</span>' +
        '<span class="drill-line ins-dim">&mdash;</span>' +
        '<span class="drill-why">slip not pinned to a line &mdash; check their jotter</span>'));
      out.appendChild(ul);
    }
    if (err && methodCredit) out.appendChild(el('p', 'drill-note',
      methodCredit + ' of the ' + err + ' who went wrong still earned method marks — their working was partly sound.'));
    if (helpPulled) out.appendChild(el('p', 'drill-note drill-help',
      helpPulled + (helpPulled === 1 ? ' pupil' : ' pupils') + ' opened the method help on this question.'));

    /* method vs accuracy split for this question, class-wide */
    var mPct = mMax ? Math.round(100 * mGot / mMax) : null;
    var aPct = aMax ? Math.round(100 * aGot / aMax) : null;
    var bars = el('div', 'drill-bars');
    bars.appendChild(drillBar('Method (working)', mPct));
    bars.appendChild(drillBar('Accuracy (answers)', aPct));
    out.appendChild(bars);

    cell.innerHTML = ''; cell.appendChild(out);
  }
  function drillChip(n, label, kind) {
    return '<span class="drill-chip drill-' + kind + '"><b>' + n + '</b> ' + esc(label) + '</span>';
  }
  function drillBar(label, pct) {
    var d = el('div', 'drill-bar');
    d.innerHTML = '<span class="drill-bar-txt">' + esc(label) + '</span>' +
      '<span class="ins-skill-bar"><span style="width:' + (pct == null ? 0 : pct) + '%"></span></span>' +
      '<span class="drill-bar-pct">' + (pct == null ? '—' : pct + '%') + '</span>';
    return d;
  }

  function flagCol(title, kind, list) {
    var col = el('div', 'ins-flagcol ins-' + kind);
    col.appendChild(el('h3', 'ins-flagh', esc(title) + ' (' + list.length + ')'));
    if (!list.length) { col.appendChild(el('p', 'ui-msg', kind === 'support' ? 'No one flagged — nice.' : 'No one flagged yet.')); return col; }
    list.sort(function (a, b) { return (a.p.name || '').localeCompare(b.p.name || ''); });
    list.forEach(function (x) {
      var b = el('button', 'ins-flagrow');
      b.innerHTML = '<span class="ins-name">' + esc(x.p.name || x.p.email) + '</span><span class="ins-reason">' + esc(x.flag.reasons.join(' · ')) + '</span>';
      b.addEventListener('click', function () { showJotterPage(x.p.email); });
      col.appendChild(b);
    });
    return col;
  }
  function confCol(title, sub, list) {
    var col = el('div', 'ins-flagcol');
    col.appendChild(el('h3', 'ins-flagh', esc(title) + ' (' + list.length + ')'));
    col.appendChild(el('p', 'ui-msg', esc(sub)));
    list.sort(function (a, b) { return (a.p.name || '').localeCompare(b.p.name || ''); });
    list.forEach(function (x) {
      var b = el('button', 'ins-flagrow');
      b.innerHTML = '<span class="ins-name">' + esc(x.p.name || x.p.email) + '</span><span class="ins-reason">conf ' +
        (x.st.avgConf != null ? x.st.avgConf.toFixed(1) : '—') + '/3 · working ' + insPct(x.st.methodRate) + '</span>';
      b.addEventListener('click', function () { showJotterPage(x.p.email); });
      col.appendChild(b);
    });
    return col;
  }

  /* per-pupil header for the Jotter Page: attempts, working/answer split,
     time, self-confidence, and the advisory flag. */
  function jotterHeader(state, name) {
    var qlist = questionList(view.act);
    var sum = window.GJ.app.summarise(view.act, state, name);
    var st = pupilStats({ summary: sum }, qlist);
    var times = (view.wallData || []).map(function (p) { return pupilStats(p, qlist).avgTime; }).filter(function (t) { return t > 0; }).sort(function (a, b) { return a - b; });
    var medianTime = times.length ? times[Math.floor(times.length / 2)] : 0;
    var flag = pupilFlag(st, medianTime, qlist.length), conf = confidenceFlag(st);
    var out = el('div', '');
    var wrap = el('div', 'ins-band jp-band');
    wrap.innerHTML =
      insTile(st.finished + '/' + st.attempted, 'finished') +
      insTile(st.finished ? Math.round(100 * st.firstTry / st.finished) + '%' : '—', 'right first try') +
      insTile(insPct(st.methodRate), 'method (working)') +
      insTile(st.accMax ? Math.round(100 * st.accGot / st.accMax) + '%' : '—', 'accuracy (answers)') +
      insTile(st.avgTime ? Math.round(st.avgTime) + 's' : '—', 'avg per question') +
      insTile(st.avgConf != null ? st.avgConf.toFixed(1) : '—', 'self-confidence /3');
    out.appendChild(wrap);
    var fl = el('div', 'jp-flags');
    if (flag) fl.appendChild(el('span', 'jp-flag jp-' + flag.kind, (flag.kind === 'support' ? 'Needs support' : 'Ready for stretch') + ' · ' + esc(flag.reasons.join(' · '))));
    if (conf === 'over') fl.appendChild(el('span', 'jp-flag jp-over', 'Over-confident — confidence high, working weaker'));
    if (conf === 'under') fl.appendChild(el('span', 'jp-flag jp-under', 'Quietly excelling — doing well, low confidence'));
    if (fl.children.length) out.appendChild(fl);
    return out;
  }

  /* ═══ the Working Wall ════════════════════════════════════════════ */
  function showWall() {
    var body = el('div', '');
    var actTabs = el('div', 'check-row');
    window.GJ.app.activities.forEach(function (a) {
      var b = el('button', view.act === a.id ? 'btn-stamp' : 'btn-pencil', a.title);
      b.addEventListener('click', function () { view.act = a.id; showWall(); });
      actTabs.appendChild(b);
    });
    var tools = el('div', 'check-row');
    [['Class Insights', showInsights], ['Marking Pile', showPile], ['Same-Question Sweep', showSweep], ['Copy CSV', exportCsv]].forEach(function (t) {
      var b = el('button', 'btn-pencil', t[0]);
      b.addEventListener('click', t[1]);
      tools.appendChild(b);
    });
    var msg = el('p', 'ui-msg', 'Loading the wall…');
    msg.style.marginTop = '26px';   // clear the tab + tools rows so the wait-card isn't crammed against them
    var wall = el('div', 'wall');
    body.appendChild(actTabs); body.appendChild(tools); body.appendChild(msg); body.appendChild(wall);
    shell(view.cls + ' · Working Wall', body, function () { showClasses(); });

    var qlist = questionList(view.act);

    function paint(pupils) {
      var now = Math.floor(Date.now() / 1000);
      var t = ['<table><thead><tr><th style="text-align:left">Pupil</th>'];
      qlist.forEach(function (item) { t.push('<th>' + esc(item.label) + '</th>'); });
      t.push('</tr></thead><tbody>');
      pupils.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
      pupils.forEach(function (p) {
        t.push('<tr><td class="pupil-name">' + esc(p.name || p.email) + '</td>');
        qlist.forEach(function (item) {
          var cell = p.summary && p.summary.qs && p.summary.qs[item.q.id];
          var glyph = '<span class="glyph-un">—</span>', title = 'Untouched';
          if (cell) {
            var st = cell.ovr === 1 ? 'ok' : cell.ovr === 0 ? 'err' : cell.st;
            if (st === 'ok') { glyph = '<span class="glyph-ok">✓</span>'; title = 'Method and answer sound'; }
            else if (st === 'amber') { glyph = '<span class="glyph-amber">◐</span>'; title = 'Right answer, working missing'; }
            else if (st === 'err') { glyph = '<span class="glyph-err">✗' + (cell.errAt ? '<sub>' + cell.errAt + '</sub>' : '') + '</span>'; title = 'First error at line ' + (cell.errAt || '?') + (cell.dx ? ' — ' + (DX_NAMES[cell.dx] || cell.dx) : ''); }
            else if (st === 'open') {
              var live = p.summary.upd && (now - p.summary.upd) < 60;
              glyph = '<span class="glyph-live">●</span>'; title = live ? 'Working right now' : 'In progress';
            }
            if (cell.ovr != null) title += ' · teacher override';
          }
          t.push('<td class="cell" data-email="' + esc(p.email) + '" title="' + esc(title) + '">' + glyph + '</td>');
        });
        t.push('</tr>');
      });
      t.push('</tbody></table>');
      // column totals + dominant misconception
      var totals = '<tr><td class="ui-msg">Totals</td>';
      qlist.forEach(function (item) {
        var ok = 0, amber = 0, err = 0, dxCount = {};
        pupils.forEach(function (p) {
          var c = p.summary && p.summary.qs && p.summary.qs[item.q.id];
          if (!c) return;
          var st = c.ovr === 1 ? 'ok' : c.ovr === 0 ? 'err' : c.st;
          if (st === 'ok') ok++; else if (st === 'amber') amber++; else if (st === 'err') { err++; if (c.dx) dxCount[c.dx] = (dxCount[c.dx] || 0) + 1; }
        });
        var topDx = Object.keys(dxCount).sort(function (a, b) { return dxCount[b] - dxCount[a]; })[0];
        totals += '<td class="col-dx">' + ok + '✓ ' + (amber ? amber + '◐ ' : '') + (err ? err + '✗' : '') +
          (topDx ? '<br>' + esc(DX_NAMES[topDx] || topDx) + ' ×' + dxCount[topDx] : '') + '</td>';
      });
      totals += '</tr>';
      wall.innerHTML = t.join('').replace('</tbody>', totals + '</tbody>');
      wall.querySelectorAll('.cell').forEach(function (td) {
        td.addEventListener('click', function () { showJotterPage(td.getAttribute('data-email')); });
      });
      clearBusy(msg, pupils.length + ' pupils · updates every 20 seconds while this page is open · tap any cell to open that pupil’s jotter.');
    }

    function load() {
      var token = ++view.wallSeq;
      call('wall', { className: view.cls, act: view.act }).then(function (r) {
        if (token !== view.wallSeq) return;
        if (!r || !r.ok) { clearBusy(msg, (r && r.error) || 'Could not load the wall.'); return; }
        view.wallData = r.pupils || [];
        paint(view.wallData);
      }).catch(function () { if (token === view.wallSeq) clearBusy(msg, 'Could not reach the server — will retry.'); });
    }
    busyCard(msg, 'Loading the wall&hellip; this can take a moment');
    load();
    stopPolling();
    view.wallTimer = setInterval(load, 20000);
  }

  /* ═══ Jotter Page drill-down + override ═══════════════════════════ */
  function showJotterPage(email) {
    var body = el('div', '');
    var msg = el('p', 'ui-msg', 'Fetching the jotter…');
    body.appendChild(msg);
    var page = el('div', 'jotter');
    body.appendChild(page);
    shell(view.cls + ' · Jotter Page', body, function () { showWall(); });

    busyCard(msg, 'Fetching the jotter&hellip; this can take a moment');
    call('jotter', { className: view.cls, act: view.act, email: email }).then(function (r) {
      if (!r || !r.ok) { clearBusy(msg, (r && r.error) || 'Could not load.'); return; }
      var state = null;
      try { state = JSON.parse(r.state); } catch (e) {}
      clearBusy(msg, (r.name || email) + ' · ' + (view.act === 'angles' ? 'Angles' : 'Algebra') +
        ' · every committed line, attempt 1 struck through where it was retried.');
      if (!state) { page.innerHTML = '<div class="jotter-q"><div class="jq-margin"></div><div class="jq-body ui-msg">Nothing saved yet.</div></div>'; return; }

      page.appendChild(jotterHeader(state, r.name));

      questionList(view.act).forEach(function (item) {
        var q = item.q;
        var res = markState(view.act, state, q);
        if (res.st === 'un') return;
        var wrap = el('div', 'jotter-q');
        var marginEl = el('div', 'jq-margin', esc(item.label));
        var bodyEl = el('div', 'jq-body');
        wrap.appendChild(marginEl); wrap.appendChild(bodyEl);
        bodyEl.appendChild(el('p', 'jq-prompt', esc(q.prompt)));

        var rec = res.rec;
        (rec.att || []).slice(0, -1).forEach(function (att) {
          (att.L || []).forEach(function (l) {
            bodyEl.appendChild(el('div', 'wline struck', '<span class="wl-eq">' + esc(pretty(l.t)) + '</span>'));
          });
          (att.steps || []).forEach(function (s) {
            bodyEl.appendChild(el('div', 'wline struck', '<span class="wl-eq">∠' + esc(s.ang) + ' = ' + esc(String(s.val)) + '°</span>'));
          });
        });
        var per = (res.verdict && (res.verdict.perLine || res.verdict.perStep)) || [];
        var last = res.last || {};
        (last.L || []).forEach(function (l, i) {
          var v = per[i] || {};
          var mark = v.ok === 1 ? '<span class="glyph-ok">✓</span>' : v.ok === 2 ? '<span class="glyph-ok" style="opacity:.55">✓</span>' : v.ok === 0 ? '<span class="glyph-err">✗</span>' : '';
          var row = el('div', 'wline' + (v.ok === 0 ? ' err-box' : ''),
            '<span class="wl-mark" style="position:static;width:auto;margin-right:8px">' + mark + '</span>' +
            '<span class="wl-eq">' + esc(pretty(l.t)) + '</span>' +
            (l.op && l.op !== 'rw' && l.op !== 'start' ? '<span class="wl-margin-note">(' + esc(pretty(l.op)) + ')</span>' : '') +
            '<span class="wl-margin-note">' + (l.s ? l.s + 's' : '') + '</span>');
          bodyEl.appendChild(row);
          if (v.ok === 0 && (v.dx || v.note)) bodyEl.appendChild(el('p', 'ui-msg', esc(DX_NAMES[v.dx] || v.note || '')));
        });
        if (last.pick != null) {
          var rightC = last.pick === q.classify;
          bodyEl.appendChild(el('div', 'wline',
            '<span class="' + (rightC ? 'glyph-ok' : 'glyph-err') + '" style="margin-right:8px">' + (rightC ? '✓' : '✗') + '</span>' +
            '<span class="wl-eq">' + esc(last.pick) + '</span>' +
            (rightC ? '' : '<span class="wl-margin-note">(answer: ' + esc(q.classify) + ')</span>')));
        }
        if (last.read != null) {
          var rightP = Math.abs(last.read - q.value) <= (q.tol || 3);
          bodyEl.appendChild(el('div', 'wline',
            '<span class="' + (rightP ? 'glyph-ok' : 'glyph-err') + '" style="margin-right:8px">' + (rightP ? '✓' : '✗') + '</span>' +
            '<span class="wl-eq">measured ' + esc(String(last.read)) + '°</span>' +
            (rightP ? '' : '<span class="wl-margin-note">(true ' + q.value + '°' + (res.dx === 'WRONG_SCALE' || last.dx === 'WRONG_SCALE' ? ' · read the other scale' : '') + ')</span>')));
        }
        (last.steps || []).forEach(function (s, i) {
          var v = per[i] || {};
          var bank = window.GJ.app.content('angles').reasonBank;
          var rsn = bank.filter(function (rr) { return rr.id === s.rsn; })[0];
          var vm = v.val === 1 ? '✓' : v.val === 2 ? '(✓)' : '✗';
          var rm = v.rsn === 1 ? 'reason ✓' : 'reason ✗';
          bodyEl.appendChild(el('div', 'wline' + (v.val === 0 ? ' err-box' : ''),
            '<span class="wl-mark" style="position:static;width:auto;margin-right:8px" class="' + (v.val === 1 ? 'glyph-ok' : 'glyph-err') + '">' + vm + '</span>' +
            '<span class="wl-eq">∠' + esc(s.ang) + ' = ' + esc(String(s.val)) + '°' + (s.calc ? ' <span class="wl-margin-note">(' + esc(pretty(s.calc)) + ')</span>' : '') + '</span>' +
            '<span class="wl-margin-note">(' + (rsn ? esc(rsn.text) : '?') + ') · ' + rm + (v.preq ? ' · route not shown' : '') + '</span>'));
          if (v.dx) bodyEl.appendChild(el('p', 'ui-msg', esc(DX_NAMES[v.dx] || v.dx)));
        });

        if (res.verdict) {
          var mkMax = res.verdict.mkMax || q.marks;
          bodyEl.appendChild(el('p', 'mk-tally', 'M ' + res.verdict.mk[0] + '/' + mkMax[0] + ' · A ' + res.verdict.mk[1] + '/' + mkMax[1] +
            (last.dur ? ' · ' + last.dur + 's · ' + (rec.att.length) + ' attempt' + (rec.att.length > 1 ? 's' : '') : '')));
        }
        if (state.help && state.help[q.id]) bodyEl.appendChild(el('p', 'jp-help', 'Pulled the method help after getting stuck'));

        /* the override — the teacher's judgement wins everywhere */
        var ovRow = el('div', 'check-row');
        var ovMsg = el('span', 'ui-msg', rec.ovr ? 'Teacher override applied.' : '');
        function setOvr(val, btn) {
          if (btn.disabled) return;
          btn.disabled = true;
          call('override', { className: view.cls, act: view.act, email: email, q: q.id, idx: 'q', val: val }).then(function (r2) {
            btn.disabled = false;
            if (r2 && r2.ok) { rec.ovr = (val == null) ? null : { q: val }; ovMsg.textContent = (val != null) ? 'Override saved — the Wall now shows your judgement.' : 'Override cleared.'; }
            else ovMsg.textContent = (r2 && r2.error) || 'Could not save.';
          }).catch(function () { btn.disabled = false; ovMsg.textContent = 'Could not save.'; });
        }
        [['Mark it right', 1], ['Mark it wrong', 0], ['Back to the app’s marking', null]].forEach(function (o) {
          var b = el('button', 'btn-pencil', o[0]);
          b.addEventListener('click', function () { setOvr(o[1], b); });
          ovRow.appendChild(b);
        });
        // content-safe support: nudge this pupil toward the section's existing method
        // movie. Offered only where they struggled — the natural moment to suggest it.
        if (item.secId && item.secHasMovie && (res.st === 'err' || res.st === 'amber')) {   // only nudge to a section that actually has a method movie
          var nudgeB = el('button', 'btn-pencil jp-nudge', 'Nudge: watch the method ▸');
          nudgeB.addEventListener('click', function () {
            if (nudgeB.disabled) return; nudgeB.disabled = true;
            call('nudge', { className: view.cls, act: view.act, email: email, sec: item.secId }).then(function (r3) {
              nudgeB.disabled = false;
              if (r3 && r3.ok) { nudgeB.textContent = 'Nudge sent ✓'; ovMsg.textContent = 'They’ll be shown this method the next time they open the book.'; }
              else ovMsg.textContent = (r3 && r3.error) || 'Could not send the nudge.';
            }).catch(function () { nudgeB.disabled = false; ovMsg.textContent = 'Could not send the nudge.'; });
          });
          ovRow.appendChild(nudgeB);
        }
        ovRow.appendChild(ovMsg);
        bodyEl.appendChild(ovRow);
        page.appendChild(wrap);
      });
    });
  }

  /* ═══ Marking Pile ════════════════════════════════════════════════ */
  function fullStates() {
    // fetch full jotters for the class (sequentially batched)
    var pupils = (view.wallData || []).slice();
    var out = [];
    var pr = Promise.resolve();
    pupils.forEach(function (p) {
      pr = pr.then(function () {
        return call('jotter', { className: view.cls, act: view.act, email: p.email }).then(function (r) {
          var state = null;
          try { state = JSON.parse(r.state); } catch (e) {}
          if (state) out.push({ email: p.email, name: p.name, state: state });
        }).catch(function () {});
      });
    });
    return pr.then(function () { return out; });
  }

  function showPile() {
    var body = el('div', '');
    var msg = el('p', 'ui-msg', 'Reading every jotter…');
    body.appendChild(msg);
    var list = el('div', '');
    body.appendChild(list);
    shell(view.cls + ' · Marking Pile', body, function () { showWall(); });

    busyCard(msg, 'Reading every jotter&hellip; this can take a moment');
    fullStates().then(function (all) {
      clearBusy(msg, '');
      var piles = {}; // key → {label, names:[], example}
      all.forEach(function (p) {
        questionList(view.act).forEach(function (item) {
          var res = markState(view.act, p.state, item.q);
          if (res.st !== 'err') return;
          var key = res.dx || ('cluster:' + (res.cluster || item.q.id));
          var label = res.dx ? (DX_NAMES[res.dx] || res.dx) : ('Same wrong line: ' + (res.cluster || '?'));
          piles[key] = piles[key] || { label: label, names: [], qlabel: item.label, example: res.cluster || '' };
          piles[key].names.push(p.name || p.email);
        });
      });
      var keys = Object.keys(piles).sort(function (a, b) { return piles[b].names.length - piles[a].names.length; });
      msg.textContent = keys.length ? 'Misconceptions ranked by how many pupils share them. “Starter” throws the top slips on the board, anonymised.' : 'No marked errors in this class yet — the pile is empty.';
      if (keys.length) {
        var starterB = el('button', 'btn-stamp gold', 'Next-lesson starter ▶');
        starterB.addEventListener('click', function () { showStarter(keys.slice(0, 3).map(function (k) { return piles[k]; })); });
        list.appendChild(starterB);
      }
      keys.forEach(function (k) {
        var p = piles[k];
        list.appendChild(el('div', 'pile-item',
          '<span class="pile-count">' + p.names.length + '</span>' +
          '<span class="pile-what"><b>' + esc(p.label) + '</b>' + (p.example ? ' — <span style="font-family:var(--f-maths)">' + esc(p.example) + '</span>' : '') +
          ' <span class="ui-msg">(' + esc(p.qlabel) + ')</span><br><span class="pile-names">' + esc(p.names.join(', ')) + '</span></span>'));
      });
    });
  }

  function showStarter(piles) {
    var idx = 0;
    var over = el('div', 'starter-overlay');
    function paint() {
      var p = piles[idx];
      over.innerHTML = '<div class="starter-card">' +
        '<p class="sec-walt">Spot the slip · starter ' + (idx + 1) + ' of ' + piles.length + '</p>' +
        '<div class="starter-line">' + esc(p.example || p.label) + '</div>' +
        '<p class="starter-q">' + (p.revealed ? esc(p.label) : 'Where has this gone wrong — and what should the line say?') + '</p>' +
        '<div class="check-row" style="justify-content:center">' +
        '<button class="btn-stamp" id="sr-reveal">' + (p.revealed ? 'Hide' : 'Reveal') + '</button>' +
        (idx + 1 < piles.length ? '<button class="btn-pencil" id="sr-next">Next slip →</button>' : '') +
        '<button class="btn-pencil" id="sr-close">Close</button></div></div>';
      over.querySelector('#sr-reveal').addEventListener('click', function () { p.revealed = !p.revealed; paint(); });
      var nx = over.querySelector('#sr-next');
      if (nx) nx.addEventListener('click', function () { idx++; paint(); });
      over.querySelector('#sr-close').addEventListener('click', function () { over.remove(); });
    }
    paint();
    document.body.appendChild(over);
  }

  /* ═══ Same-Question Sweep ═════════════════════════════════════════ */
  function showSweep() {
    var body = el('div', '');
    var picker = el('div', 'check-row');
    var grid = el('div', 'sweep-grid');
    var msg = el('p', 'ui-msg', 'Pick a question — every pupil’s page opens at it, side by side.');
    body.appendChild(picker); body.appendChild(msg); body.appendChild(grid);
    shell(view.cls + ' · Same-Question Sweep', body, function () { showWall(); });

    var sel = document.createElement('select');
    sel.style.cssText = 'font-family:var(--f-stationery);font-size:14px;padding:8px;border:1.5px solid var(--navy);border-radius:4px';
    questionList(view.act).forEach(function (item) {
      var o = document.createElement('option');
      o.value = item.q.id; o.textContent = item.label + ' — ' + item.q.prompt.slice(0, 60);
      sel.appendChild(o);
    });
    picker.appendChild(sel);
    var go = el('button', 'btn-stamp', 'Open the pile');
    picker.appendChild(go);

    go.addEventListener('click', function () {
      if (go.disabled) return;
      go.disabled = true;
      busyCard(msg, 'Reading every jotter&hellip; this can take a moment');
      fullStates().then(function (all) {
        go.disabled = false;
        clearBusy(msg, '');
        grid.innerHTML = '';
        var q = questionList(view.act).filter(function (i) { return i.q.id === sel.value; })[0].q;
        var shown = 0;
        all.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
        all.forEach(function (p) {
          var res = markState(view.act, p.state, q);
          if (res.st === 'un') return;
          shown++;
          var per = (res.verdict && (res.verdict.perLine || res.verdict.perStep)) || [];
          var last = res.last || {};
          var lines = (last.L || []).map(function (l, i) {
            var v = per[i] || {};
            return '<div class="' + (v.ok === 0 ? 'wavy' : '') + '">' + (v.ok === 1 ? '✓ ' : v.ok === 2 ? '(✓) ' : v.ok === 0 ? '✗ ' : '· ') + esc(pretty(l.t)) + '</div>';
          }).join('');
          lines += (last.steps || []).map(function (s, i) {
            var v = per[i] || {};
            return '<div class="' + (v.val === 0 ? 'wavy' : '') + '">' + (v.val === 1 ? '✓ ' : '✗ ') + '∠' + esc(s.ang) + ' = ' + esc(String(s.val)) + '°</div>';
          }).join('');
          if (last.pick != null) lines += '<div>' + (last.pick === q.classify ? '✓ ' : '✗ ') + esc(last.pick) + '</div>';
          if (last.read != null) lines += '<div>' + (Math.abs(last.read - q.value) <= (q.tol || 3) ? '✓ ' : '✗ ') + 'measured ' + esc(String(last.read)) + '°</div>';
          var badge = res.st === 'ok' ? '<span class="glyph-ok">✓</span>' : res.st === 'amber' ? '<span class="glyph-amber">◐</span>' : res.st === 'err' ? '<span class="glyph-err">✗</span>' : '<span class="glyph-live">●</span>';
          var card = el('div', 'mini-jotter', '<div class="mj-name">' + badge + ' ' + esc(p.name || p.email) + '</div>' + (lines || '<span class="ui-msg">no lines yet</span>'));
          card.addEventListener('click', function () { showJotterPage(p.email); });
          grid.appendChild(card);
        });
        msg.textContent = shown ? shown + ' pages open at ' + sel.selectedOptions[0].textContent.split(' — ')[0] + '. Tap a page to open the full jotter.' : 'Nobody has touched that question yet.';
      });
    });
  }

  /* ═══ CSV ═════════════════════════════════════════════════════════ */
  function exportCsv() {
    var msg = el('span', 'ui-msg');
    fullStates().then(function (all) {
      var qlist = questionList(view.act);
      var pack = window.GJ.app.content(view.act);
      var qSec = {};                                                    // question id -> section id
      pack.sections.forEach(function (sec) { sec.questions.forEach(function (q) { qSec[q.id] = sec.id; }); });
      // per-pupil flag (computed once) for the pupil-level Flag column
      var pstats = all.map(function (p) { return { email: p.email, st: pupilStats({ summary: window.GJ.app.summarise(view.act, p.state, p.name) }, qlist) }; });
      var times = pstats.map(function (s) { return s.st.avgTime; }).filter(function (t) { return t > 0; }).sort(function (a, b) { return a - b; });
      var medianTime = times.length ? times[Math.floor(times.length / 2)] : 0;
      var flagBy = {};
      pstats.forEach(function (s) { var f = pupilFlag(s.st, medianTime, qlist.length); flagBy[s.email] = f ? (f.kind === 'support' ? 'needs support' : 'ready for stretch') : ''; });

      var rows = [['Pupil', 'Email', 'Activity', 'Question', 'Status', 'Method marks', 'Accuracy marks', 'Out of', 'Attempts', 'First try', 'Time (s)', 'Misconception', 'Self-confidence', 'Teacher override', 'Pupil flag']];
      all.forEach(function (p) {
        var evals = (p.state && p.state.evals) || {};
        questionList(view.act).forEach(function (item) {
          var res = markState(view.act, p.state, item.q);
          if (res.st === 'un') return;
          var mk = res.verdict ? res.verdict.mk : ['', ''];
          var mkMax = (res.verdict && res.verdict.mkMax) || item.q.marks;
          var firstTry = (res.rec && res.rec.att && res.rec.att.length === 1 && res.st === 'ok') ? 'yes' : (res.st === 'open' ? '' : 'no');
          var secEv = evals[qSec[item.q.id]];
          rows.push([p.name || '', p.email, view.act, item.label, res.st,
            mk[0], mk[1], mkMax[0] + mkMax[1],
            res.rec ? res.rec.att.length : '', firstTry, res.last && res.last.dur || '',
            res.dx ? (DX_NAMES[res.dx] || res.dx) : (res.cluster || ''),
            secEv && secEv.conf ? secEv.conf + '/3' : '',
            res.rec && res.rec.ovr ? (res.rec.ovr.q === 1 ? 'marked right' : 'marked wrong') : '',
            flagBy[p.email] || '']);
        });
      });
      var csv = rows.map(function (r) {
        return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
      }).join('\n');
      copyText(csv, msg, 'CSV for ' + view.cls + ' copied — paste into Excel.');
      alertBar('CSV copied to the clipboard — paste straight into Excel.');
    });
  }
  function alertBar(text) {
    var n = el('div', '');
    n.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#14213A;color:#FAF7F0;font-family:var(--f-stationery);font-size:13px;padding:10px 18px;border-radius:4px;z-index:600';
    n.textContent = text;
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 3500);
  }

  /* Cover-gate entry: the teacher-landing cover validates the passcode itself
     (one screen, no extra click), then hands the validated passcode and the
     already-loaded class list straight in -- no second round-trip, no gate. */
  function enterWith(pass, r) {
    passcode = pass;
    classes = (r && r.classes) || [];
    meEmail = (r && r.me) || '';
    isAdmin = !!(r && r.isAdmin);
    showClasses();
  }

  window.GJ_STAFF = { open: open, enterWith: enterWith };
  window.GJ_DX = DX_NAMES;   // shared so the pupil "Want to see how?" can name a misconception
})();
