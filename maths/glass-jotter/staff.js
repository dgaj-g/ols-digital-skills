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
      if (r && r.ok) classes = r.classes || [];
    });
  }

  function showClasses() {
    var body = el('div', '');
    body.innerHTML =
      '<div class="check-row" style="margin-bottom:var(--sq)">' +
      '<input id="st-newclass" type="text" maxlength="40" placeholder="e.g. 10B Maths" ' +
      'style="font-family:var(--f-stationery);font-size:15px;padding:10px;border:1.5px solid var(--navy);border-radius:4px;max-width:240px" aria-label="New class name" />' +
      '<button id="st-add" class="btn-stamp">Add a class</button>' +
      '<span id="st-cmsg" class="ui-msg" role="status"></span></div>' +
      '<table class="ledger"><thead><tr><th>Class</th><th>Pupils</th><th>Books on the shelf</th><th></th></tr></thead>' +
      '<tbody id="st-rows"></tbody></table>' +
      '<p class="ui-msg" style="margin-top:var(--sq)">Tick a book to put it on that class’s shelf. Pupils see ticked books only.</p>';
    shell('The Markbook · Classes', body, null);
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
        out.push({ q: q, label: 'Ex' + (si + 1) + '.Q' + (qi + 1) });
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
    [['Marking Pile', showPile], ['Same-Question Sweep', showSweep], ['Copy CSV', exportCsv]].forEach(function (t) {
      var b = el('button', 'btn-pencil', t[0]);
      b.addEventListener('click', t[1]);
      tools.appendChild(b);
    });
    var msg = el('p', 'ui-msg', 'Loading the wall…');
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
      var rows = [['Pupil', 'Email', 'Activity', 'Question', 'Status', 'Method marks', 'Accuracy marks', 'Out of', 'Attempts', 'Time (s)', 'Misconception', 'Teacher override']];
      all.forEach(function (p) {
        questionList(view.act).forEach(function (item) {
          var res = markState(view.act, p.state, item.q);
          if (res.st === 'un') return;
          var mk = res.verdict ? res.verdict.mk : ['', ''];
          var mkMax = (res.verdict && res.verdict.mkMax) || item.q.marks;
          rows.push([p.name || '', p.email, view.act, item.label, res.st,
            mk[0], mk[1], mkMax[0] + mkMax[1],
            res.rec ? res.rec.att.length : '', res.last && res.last.dur || '',
            res.dx ? (DX_NAMES[res.dx] || res.dx) : (res.cluster || ''),
            res.rec && res.rec.ovr ? (res.rec.ovr.q === 1 ? 'marked right' : 'marked wrong') : '']);
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

  window.GJ_STAFF = { open: open };
})();
