/* MathShelf — the teacher's markbook.
   Passcode-gated (server-side validated). Views: classes (create/delete,
   per-class activity tickboxes, link/QR) → Working Wall (live class grid,
   20 s poll) → Jotter Page drill-down (override: the teacher's judgement
   wins everywhere) → Marking Pile (misconception clusters + starter mode)
   → Same-Question Sweep. The app pre-marks; the teacher is the marker. */
(function () {
  'use strict';

  /* A MESSAGE SLOT IS A LIVE REGION, and it says so by construction rather than
     at forty call sites. It starts empty on purpose: that is what a live region
     is for, and it is why the empty-container audit must be able to tell it
     from a hole in the page. */
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    if (cls && /\bui-msg\b/.test(cls) && !html) d.setAttribute('role', 'status');
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

  /* every teacher sentence comes from the one table (rule 23) */
  function TT(k, vals) {
    var t = (window.GJ_STRINGS && window.GJ_STRINGS.teacher && window.GJ_STRINGS.teacher[k]) || '';
    return (window.GJ_STRINGS && window.GJ_STRINGS.fill) ? window.GJ_STRINGS.fill(t, vals) : t;
  }
  /* WHAT THE SERVER SAID, IN WORDS. The markbook used to print the server's own
     code on a teacher's screen - "not-configured", "bad-act", "no-row" - which
     is a thing to look up, not a thing to act on. */
  /* the screen this markbook page is on, so a state can be written on it */
  function SURF(name, state) {
    var r = document.querySelector('[data-surface="' + name + '"]');
    if (r && window.GJ && window.GJ.setState) window.GJ.setState(r, name, state);
    return r;
  }
  function SAYS(code, fallback) {
    return (window.GJ_STRINGS && window.GJ_STRINGS.serverSays)
      ? window.GJ_STRINGS.serverSays(code, fallback) : fallback;
  }

  function call(sub, extra) {
    var p = { passcode: passcode, sub: sub };
    Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
    return window.GJ.app.call('admin', p);
  }

  /* clipboard: navigator.clipboard → execCommand textarea → show the text */
  function copyText(text, msgEl, okMsg) {
    function done() { if (msgEl) msgEl.textContent = okMsg || 'Copied.'; SURF('set-up', 'csv-copied'); }
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (ok) done();
      else if (msgEl) { msgEl.textContent = TT('copyByHand', { text: text }); SURF('set-up', 'csv-fallback-box'); }
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

  /* ═══ THE MARKBOOK'S CHROME ══════════════════════════════════════
     Dark glass at the top, light panels underneath: the shell/surface split.
     The breadcrumb is always visible, because a teacher who cannot see where
     she is cannot get back. `surfaceId`/`state` put the screen's name on its
     own root so a machine can prove every one of them was walked. */
  function shell(opts) {
    stopPolling();
    root.innerHTML = '';
    armRelock();

    var bar = el('div', 'staff-topbar');
    var mark = el('span', 'gj-wordmark');
    mark.setAttribute('data-ornament', '');
    mark.innerHTML = 'Math<b>Shelf</b>';
    bar.appendChild(mark);

    var crumb = el('nav', 'staff-crumb');
    crumb.setAttribute('aria-label', TT('whereYouAre'));
    (opts.crumbs || []).forEach(function (c, i) {
      if (i) crumb.appendChild(document.createTextNode('  \u203a  '));
      if (c.go) {
        var a = el('button', 'crumb-link', esc(c.label));
        a.addEventListener('click', c.go);
        crumb.appendChild(a);
      } else {
        crumb.appendChild(el('span', 'crumb-here', esc(c.label)));
      }
    });
    bar.appendChild(crumb);

    var right = el('div', 'staff-right');
    if (opts.live) {
      var live = el('span', 'live');
      live.innerHTML = '<i aria-hidden="true"></i>Live';
      right.appendChild(live);
    }
    var closeB = el('button', 'toolbtn', esc(TT('closeMarkbook')));
    closeB.addEventListener('click', closeMarkbook);
    right.appendChild(closeB);
    bar.appendChild(right);
    root.appendChild(bar);

    var main = el('div', 'staff-main');
    main.appendChild(opts.body);
    root.appendChild(main);

    window.GJ.surface(root, opts.surface || 'class-page', opts.state || 'loaded');
    window.GJ.app.showScreen('staff');
    window.scrollTo(0, 0);
  }

  /* ═══ THE MARKBOOK RE-GATES WHEN IT IS LEFT (gates G-H4) ══════════
     On a smartboard the class is looking at the front of the room. Leaving the
     markbook, or leaving it alone for fifteen minutes, closes it and asks for
     the passcode again; the passcode itself is never written to this device on
     the live tier. */
  var IDLE_RELOCK = 15 * 60 * 1000;
  var idleTimer = null;
  function armRelock() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { closeMarkbook('idle'); }, IDLE_RELOCK);
  }
  function closeMarkbook(why) {
    stopPolling();
    clearTimeout(idleTimer);
    passcode = null;
    classes = [];
    view.wallData = null;
    root.innerHTML = '';               /* no class data left in the DOM */
    relockReason = why === 'idle' ? 'idle' : 'left';
    window.GJ.app.showScreen('cover');
  }
  var relockReason = null;
  ['pointerdown', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function () { if (passcode) armRelock(); }, true);
  });

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
    shell({ body: body, surface: 'staff-cover', state: 'passcode-empty', crumbs: [{ label: 'The markbook' }] });
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
          clearBusy(body.querySelector('#st-msg'), SAYS(r && r.error, 'That passcode was not accepted.'));
          SURF('staff-cover', 'passcode-wrong');
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
      '<table class="ledger"><thead><tr><th>Class</th><th>Pupils</th><th>Books on the shelf</th><th>What you can do</th></tr></thead>' +
      '<tbody id="st-rows"></tbody></table>' +
      '<p class="ui-msg" style="margin-top:var(--sq)">' + esc(TT('setUpHint')) + ' A book that is not ticked is closed for that class: pupils see it on the shelf, marked as not set yet, and cannot open it.</p>';
    shell({ body: body, surface: 'set-up', state: 'classes', crumbs: [{ label: isAdmin ? 'All classes' : 'Your classes' }] });
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
        /* GROUPED BY SERIES, WITH THE AUDIENCE BAND ON EVERY ROW. The tickboxes
           ARE the level system (rule 17): there is no class "level" field and
           there never will be, so what a teacher needs beside each book is who
           it is for. A J3 class gets the KS3 books; an S1 GCSE class gets the
           GCSE ones; nothing has to be administered to make that true. */
        var groups = {};
        window.GJ.app.activities.forEach(function (a) {
          var key = a.series || 'Other';
          (groups[key] = groups[key] || []).push(a);
        });
        Object.keys(groups).sort().forEach(function (key) {
          tickWrap.appendChild(el('p', 'ticks-series', esc(key)));
          groups[key].forEach(addTick);
        });
        function addTick(a) {
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
              if (r && r.ok) { c.acts = acts; SURF('set-up', 'tickboxes'); cmsg.textContent = a.title + (cb.checked ? ' is now on ' : ' removed from ') + c.name + '’s shelf.'; }
              else { cb.checked = !cb.checked; cmsg.textContent = SAYS(r && r.error, TT('couldNotSave')); }
            }).catch(function () { cb.disabled = false; cb.checked = !cb.checked; cmsg.textContent = TT('couldNotSave'); });
          });
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode(a.title));
          var band = el('span', 'tick-band', esc(a.band || ''));
          lab.appendChild(band);
          tickWrap.appendChild(lab);
        }
        ticks.appendChild(tickWrap);

        var actions = el('td', '');
        var wallB = el('button', 'toolbtn', 'Open the markbook');
        wallB.addEventListener('click', function () { view.cls = c.name; showClassPage(); });
        var linkB = el('button', 'btn-pencil', esc(TT('copyLink')));
        linkB.style.marginLeft = '6px';
        linkB.addEventListener('click', function () { copyText(classLink(c.name), cmsg, 'Link for ' + c.name + ' copied.'); });
        var qrB = el('button', 'btn-pencil', 'QR');
        qrB.style.marginLeft = '6px';
        qrB.addEventListener('click', function () { showQr(c.name); });
        var delB = el('button', 'btn-pencil', '&times;');
        delB.setAttribute('aria-label', TT('deleteClassAria', { 'class': c.name }));
        delB.style.marginLeft = '6px';
        delB.addEventListener('click', function () {
          SURF('set-up', 'delete-armed');
          openConfirm('Delete ' + c.name + '?',
            'This deletes ' + c.name + ' and all its work from the markbook. This cannot be undone.',
            'Delete class', function (yes) {
              if (!yes) return;
              delB.disabled = true;
              busyCard(cmsg, 'Deleting ' + esc(c.name) + '&hellip; this can take a moment');
              call('deleteClass', { className: c.name }).then(function (r) {
                if (r && r.ok) { classes = classes.filter(function (x) { return x.name !== c.name; }); render(); clearBusy(cmsg, c.name + ' deleted.'); }
                else { delB.disabled = false; clearBusy(cmsg, SAYS(r && r.error, 'Could not delete.')); }
              }).catch(function () { delB.disabled = false; clearBusy(cmsg, ''); staffError(TT('noServer'), cmsg); });
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
      if (!nm) { cmsg.textContent = TT('nameTheClass'); return; }
      addB.disabled = true;
      SURF('set-up', 'add-class-busy');
      busyCard(cmsg, 'Adding ' + esc(nm) + '&hellip; this can take a moment');
      call('addClass', { className: nm }).then(function (r) {
        addB.disabled = false;
        if (r && r.ok) {
          /* A NEW CLASS ARRIVES WITH NOTHING TICKED, whatever the server sent:
             the teacher chooses what her class sees, and a book nobody chose is
             a book nobody meant. */
          classes.push({ name: r.name, acts: r.acts || {}, count: 0 });
          body.querySelector('#st-newclass').value = '';
          render();
          clearBusy(cmsg, r.name + ' added with both books on its shelf — untick any you want to hold back, then copy its link.');
          reloadClasses().then(render);
        } else clearBusy(cmsg, SAYS(r && r.error, 'Could not add that class.'));
      }).catch(function () { addB.disabled = false; clearBusy(cmsg, 'Could not reach the server.'); });
    });
  }

  function showQr(name) {
    var back = el('div', 'gj-modal-backdrop gj-modal-zstack');
    SURF('set-up', 'link-qr-modal');
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
        out.push({
          q: q,
          label: 'Ex ' + (si + 1) + ' \u00b7 Q' + (qi + 1),
          /* EVERY NUMBER NAMES ITS HOME (DFM 156c). A cell, a bar or a chip
             that says only "Q3" is unreadable the moment two books are on, so
             the exercise and the question travel with the item itself. */
          exLabel: 'Ex ' + (si + 1) + ' \u00b7 ' + sec.title,
          qLabel: 'Q' + (qi + 1),
          secIdx: si, secId: sec.id, secTitle: sec.title, secWalt: sec.walt || '',
          secHasMovie: !!sec.movie
        });
      });
    });
    return out;
  }
  function bookTitle(actId) {
    var a = window.GJ.app.activities.filter(function (x) { return x.id === actId; })[0];
    return a ? a.title : actId;
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
    ALT_CORR_SWAP: 'Mixed up alternate and corresponding angles',
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

  /* THE CLASS INSIGHTS SCREEN IS DISSOLVED (MATHS_V4_DESIGN section 5).
     Everything it showed - who is struggling, who is ready for more, the
     commonest slip, how far the class has got - is now on the CLASS PAGE,
     which is the first screen a teacher meets, rather than on a separate
     screen she had to know to look for. A number nobody navigates to is a
     number nobody reads.
     The SAME-QUESTION SWEEP is likewise superseded by the question view,
     which is reached by pressing a question's own column header. */

  /* the drill helpers went with the Insights screen: the class page's own
     exercise cards carry the proportions and the named slip now. */

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
      insTile(insPct(st.methodRate), 'working') +
      insTile(st.accMax ? Math.round(100 * st.accGot / st.accMax) + '%' : '—', 'answer') +
      insTile(st.avgTime ? Math.round(st.avgTime) + 's' : '—', 'avg per question') +
      insTile(st.avgConf != null ? st.avgConf.toFixed(1) : '—', 'self-confidence /3');
    out.appendChild(wrap);
    // the gift a paper jotter can't give: the method-vs-answer split, read back as one plain sentence
    var first = esc(String(name || '').split(' ')[0]) || 'This pupil';
    var mPct = st.methodRate != null ? Math.round(100 * st.methodRate) : null;
    var aPct = st.accMax ? Math.round(100 * st.accGot / st.accMax) : null;
    var read;
    if (!st.finished) read = first + ' is just getting started — not much marked yet.';
    else if (mPct != null && aPct != null && mPct >= 75 && aPct >= 75) read = first + '’s method is sound and the answers are landing — strong all round.';
    else if (mPct != null && aPct != null && mPct >= 70 && aPct < 60) read = first + '’s method is sound, but the final answers keep slipping — it’s arithmetic, not understanding.';
    else if (mPct != null && mPct < 55) read = 'The method itself is where ' + first + ' needs a hand — worth reteaching, not just re-checking.';
    else if (st.firstTry / st.finished >= 0.8) read = first + ' is getting most right first time — ready for a stretch.';
    else read = first + ' is coming along — a few slips to tidy up.';
    out.appendChild(el('div', 'jp-read', read));
    var fl = el('div', 'jp-flags');
    if (flag) fl.appendChild(el('span', 'jp-flag jp-' + flag.kind, (flag.kind === 'support' ? 'Needs support' : 'Ready for stretch') + ' · ' + esc(flag.reasons.join(' · '))));
    if (conf === 'over') fl.appendChild(el('span', 'jp-flag jp-over', esc(TT('overConfident'))));
    if (conf === 'under') fl.appendChild(el('span', 'jp-flag jp-under', esc(TT('quietlyExcelling'))));
    if (fl.children.length) out.appendChild(fl);
    return out;
  }

  /* ═══ the Working Wall ════════════════════════════════════════════ */
  /* ═══════════════════════════════════════════════════════════════
     S1 · THE CLASS PAGE — the markbook's front door
     ═══════════════════════════════════════════════════════════════
     In the order a teacher's questions actually come: how did the class do,
     who needs me, then this exercise. The 24-column grid is one press away
     and is no longer the first thing anybody meets. */
  function showClassPage() {
    var body = el('div', 'cp');
    var acts = window.GJ.app.activities.filter(function (a) { return true; });

    /* the book switcher */
    var sw = el('div', 'cp-books');
    sw.setAttribute('role', 'group');
    sw.setAttribute('aria-label', TT('whichBook'));
    acts.forEach(function (a) {
      var b = el('button', 'toolbtn' + (view.act === a.id ? ' on' : ''), esc(a.title));
      b.setAttribute('aria-pressed', view.act === a.id ? 'true' : 'false');
      b.addEventListener('click', function () { view.act = a.id; SURF('class-page', 'book-switch'); showClassPage(); });
      sw.appendChild(b);
    });
    body.appendChild(sw);

    var strip = el('div', 'cp-strip');
    body.appendChild(strip);

    var needs = el('section', 'needs');
    needs.setAttribute('aria-label', TT('needsYouAria'));
    needs.appendChild(el('p', 'needs-lbl', esc(TT('needsYouLabel'))));
    var needsRow = el('div', 'needs-row');
    needs.appendChild(needsRow);
    body.appendChild(needs);

    var cards = el('div', 'excards');
    body.appendChild(cards);

    /* THE LEGEND IS PERMANENT. A smartboard has no hover, so a meaning that
       lives in a title attribute is a meaning nobody in the room can reach. */
    var legend = el('p', 'cp-legend');
    /* the key to the marks IS marking: it wears the marking colours on purpose,
       and it says so, so the colour law can tell it from decoration */
    legend.setAttribute('data-mark', '');
    legend.innerHTML =
      '<span class="lg-ok">\u25a0</span> right &nbsp; ' +
      '<span class="lg-am">\u25a0</span> answer only, no working shown &nbsp; ' +
      '<span class="lg-err">\u25a0</span> wrong &nbsp; ' +
      '<span class="lg-now">\u25a0</span> working now &nbsp; ' +
      '<span class="lg-un">\u25a0</span> not started';
    body.appendChild(legend);

    var tools = el('div', 'toolrow');
    [['Full grid', showWall], ['Slips and starter', showPile], ['Download CSV', exportCsv], ['Set-up', showClasses]]
      .forEach(function (t) {
        var b = el('button', 'toolbtn', esc(t[0]));
        b.addEventListener('click', t[1]);
        tools.appendChild(b);
      });
    body.appendChild(tools);

    shell({
      body: body, surface: 'class-page', state: 'loading-cold', live: true,
      crumbs: [{ label: 'Classes', go: showClasses }, { label: view.cls }]
    });

    /* the cold first switch says WHICH class it is loading, by name, before
       the fetch starts — never a bare spinner (DFM 42/161) */
    strip.textContent = TT('loadingClass', { 'class': view.cls });

    var qlist = questionList(view.act);
    var pack = window.GJ.app.content(view.act);

    function paint(pupils) {
      window.GJ.setState(root, 'class-page', pupils.length ? 'live' : 'empty-class');
      pupils = pupils.slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });

      /* the stat strip — every number named */
      var started = 0, finished = 0;
      pupils.forEach(function (p) {
        var sum = p.summary || {};
        if (sum.done) started++;
        if (sum.done && sum.total && sum.done === sum.total) finished++;
      });
      strip.innerHTML = '';
      [[pupils.length, 'pupils in ' + view.cls],
       [started, 'started ' + bookTitle(view.act)],
       [finished, 'finished ' + bookTitle(view.act)]].forEach(function (row) {
        var c = el('span', 'stat-chip');
        c.innerHTML = '<b>' + row[0] + '</b> ' + esc(row[1]);
        strip.appendChild(c);
      });

      /* who needs you, by name, with the reason on the chip */
      var flags = window.GJ_STAFF_PAGES.needsYou(pupils, qlist, bookTitle(view.act));
      needsRow.innerHTML = '';
      if (!flags.length) {
        needsRow.appendChild(el('p', 'needs-none', esc(TT('nobodyStuck', { book: bookTitle(view.act) }))));
        window.GJ.setState(root, 'class-page', 'no-flags');
      }
      flags.forEach(function (f) {
        var chip = el('button', 'pupilchip');
        chip.innerHTML = '<span class="dot" aria-hidden="true"></span>' +
          '<span class="who">' + esc(f.name) + '</span>' +
          '<span class="why">' + esc(f.why) + '</span>';
        chip.addEventListener('click', function () { showJotterPage(f.email, { q: f.qid }); });
        needsRow.appendChild(chip);
      });

      /* one card per exercise */
      cards.innerHTML = '';
      pack.sections.forEach(function (sec, si) {
        var mine = qlist.filter(function (i) { return i.secId === sec.id; });
        var st = window.GJ_STAFF_PAGES.exerciseStats(pupils, sec, si, DX_NAMES);
        var card = el('button', 'excard staff-panel');
        card.setAttribute('aria-label', 'Ex ' + (si + 1) + ', ' + sec.title + ', in ' + bookTitle(view.act));
        var total = Math.max(1, st.ok + st.amber + st.err + st.open + st.un);
        var pc = function (n) { return (100 * n / total) + '%'; };
        card.innerHTML =
          '<span class="exno">Ex ' + (si + 1) + ' \u00b7 ' + esc(bookTitle(view.act)) + '</span>' +
          '<h4>' + esc(sec.title) + '</h4>' +
          '<p class="walt">' + esc(sec.walt || '') + '</p>' +
          '<span class="propbar" data-mark role="img" aria-label="' +
            st.ok + ' right, ' + st.amber + ' answer only, ' + st.err + ' wrong, ' +
            st.open + ' working now, ' + st.un + ' not started">' +
            '<i class="p-ok" style="width:' + pc(st.ok) + '"></i>' +
            '<i class="p-am" style="width:' + pc(st.amber) + '"></i>' +
            '<i class="p-err" style="width:' + pc(st.err) + '"></i>' +
            '<i class="p-now" style="width:' + pc(st.open) + '"></i>' +
            '<i class="p-un" style="width:' + pc(st.un) + '"></i>' +
          '</span>' +
          (st.slip
            ? '<span class="slipline"><span class="k">Most common slip in Ex ' + (si + 1) + '</span>' +
              '<span class="n" data-mark>' + esc(st.slip) + ' \u00d7' + st.slipN + '</span></span>'
            : '<span class="slipline"><span class="k">No repeated slip in Ex ' + (si + 1) + ' yet</span></span>') +
          '<span class="qdots" data-mark role="img" aria-label="one mark per question in this exercise">' +
            st.dots.map(function (d) {
              var cls = !d.seen ? '' : d.bad > d.ok ? ' bad' : d.mixed ? ' mixed' : ' ok';
              return '<i class="' + cls.trim() + '" title="' + esc(d.label) + '"></i>';
            }).join('') +
          '</span>';
        card.addEventListener('click', function () { showExercise(si); });
        cards.appendChild(card);
      });
    }

    loadWall(paint);
  }

  /* one loader for every screen that needs the class's summaries */
  function loadWall(paint) {
    var seq = ++view.wallSeq;
    function pull() {
      call('wall', { className: view.cls, act: view.act }).then(function (r) {
        if (seq !== view.wallSeq) return;
        if (!r || !r.ok) return;
        view.wallData = r.pupils || [];
        paint(view.wallData);
      }).catch(function () {});
    }
    pull();
    view.wallTimer = setInterval(pull, 20000);
  }

  /* ═══════════════════════════════════════════════════════════════
     S2 · THE EXERCISE VIEW — one exercise, pupils down, questions across
     ═══════════════════════════════════════════════════════════════ */
  function showExercise(si) {
    var pack = window.GJ.app.content(view.act);
    var sec = pack.sections[si];
    if (!sec) return showClassPage();
    var qlist = questionList(view.act).filter(function (i) { return i.secId === sec.id; });

    var body = el('div', '');
    var head = el('div', 'exhead');
    head.innerHTML = '<h3>' + esc(sec.title) + '</h3>' +
      '<p class="ex-walt">' + esc(sec.walt || '') + '</p>';
    body.appendChild(head);
    var grid = el('div', 'grid staff-panel');
    body.appendChild(grid);
    var legend = el('p', 'cp-legend');
    /* the key to the marks IS marking: it wears the marking colours on purpose,
       and it says so, so the colour law can tell it from decoration */
    legend.setAttribute('data-mark', '');
    legend.innerHTML =
      '<span class="lg-ok">\u2713</span> right &nbsp; ' +
      '<span class="lg-am">\u25d0</span> answer only &nbsp; ' +
      '<span class="lg-err">\u2717</span> wrong, with the step it broke at &nbsp; ' +
      '<span class="lg-now">\u25cf</span> working now &nbsp; ' +
      '<span class="lg-un">\u2014</span> not started';
    body.appendChild(legend);

    shell({
      body: body, surface: 'exercise-view', state: 'loaded', live: true,
      crumbs: [{ label: 'Classes', go: showClasses }, { label: view.cls, go: showClassPage },
               { label: bookTitle(view.act), go: showClassPage },
               { label: 'Ex ' + (si + 1) + ' \u00b7 ' + sec.title }]
    });

    function paint(pupils) {
      pupils = pupils.slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
      var now = Math.floor(Date.now() / 1000);
      var t = ['<table><thead><tr><th class="nm">Pupil</th>'];
      qlist.forEach(function (item) {
        var st = window.GJ_STAFF_PAGES.exerciseStats(pupils, { questions: [item.q] }, si, DX_NAMES);
        var tot = Math.max(1, st.ok + st.amber + st.err + st.open + st.un);
        t.push('<th scope="col">' + esc(item.qLabel) +
          '<span class="gist">' + esc(String(item.q.prompt || '').slice(0, 46)) + '</span>' +
          '<span class="mini" data-mark role="img" aria-label="' + st.ok + ' right of ' + tot + ' in ' + esc(item.qLabel) + '">' +
            '<i class="p-ok" style="width:' + (100 * st.ok / tot) + '%"></i>' +
            '<i class="p-am" style="width:' + (100 * st.amber / tot) + '%"></i>' +
            '<i class="p-err" style="width:' + (100 * st.err / tot) + '%"></i>' +
          '</span></th>');
      });
      t.push('</tr></thead><tbody>');
      pupils.forEach(function (p) {
        t.push('<tr><td class="nm">' + esc(p.name || p.email) + '</td>');
        qlist.forEach(function (item) {
          var c = ((p.summary || {}).qs || {})[item.q.id];
          var glyph = '<span class="g-un">\u2014</span>', title = TT('cellNotStarted');
          if (c) {
            var st = c.ovr === 1 ? 'ok' : c.ovr === 0 ? 'err' : c.st;
            if (st === 'ok') { glyph = '<span class="g-ok">\u2713</span>'; title = 'Right'; }
            else if (st === 'amber') { glyph = '<span class="g-am">\u25d0</span>'; title = TT('cellAmber'); }
            else if (st === 'err') { glyph = '<span class="g-err">\u2717' + (c.errAt ? '<sup>' + c.errAt + '</sup>' : '') + '</span>'; title = TT('cellWrongAtStep', { step: c.errAt || '?' }) + (c.dx ? ' \u2014 ' + (DX_NAMES[c.dx] || c.dx) : ''); }
            else { glyph = '<span class="g-now">\u25cf</span>'; title = ((p.summary.upd && (now - p.summary.upd) < 60) ? 'Working right now' : 'In progress'); }
            if (c.ovr != null) title += ' \u00b7 your mark';
          }
          t.push('<td class="cell" data-mark data-email="' + esc(p.email) + '" data-qid="' + esc(item.q.id) + '" title="' + esc(title) + '" aria-label="' + esc((p.name || p.email) + ', ' + item.qLabel + ': ' + title) + '">' + glyph + '</td>');
        });
        t.push('</tr>');
      });
      t.push('</tbody></table>');
      grid.innerHTML = t.join('');
      grid.querySelectorAll('th[scope="col"]').forEach(function (th, i) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', function () { showQuestionView(qlist[i].q.id); });
      });
      grid.querySelectorAll('td.cell').forEach(function (td) {
        /* a cell she is on, before she opens it: which pupil and which question
           the grid is pointing at is a state of the screen, and the walk needs
           to be able to stand on it */
        td.setAttribute('tabindex', '0');
        var onCell = function () { SURF('exercise-view', 'cell-focus'); };
        td.addEventListener('mouseenter', onCell);
        td.addEventListener('focus', onCell);
        td.addEventListener('click', function () {
          showJotterPage(td.getAttribute('data-email'), { q: td.getAttribute('data-qid') });
        });
      });
    }
    loadWall(paint);
  }

  /* ═══════════════════════════════════════════════════════════════
     S3 · THE QUESTION VIEW — every pupil's working for one question
     ═══════════════════════════════════════════════════════════════ */
  function showQuestionView(qid) {
    var qlist = questionList(view.act);
    var item = qlist.filter(function (i) { return i.q.id === qid; })[0] || qlist[0];
    var body = el('div', '');
    var head = el('div', 'exhead');
    head.innerHTML = '<h3>' + esc(item.qLabel) + ' \u00b7 ' + esc(item.secTitle) + '</h3>' +
      '<p class="q-prompt">' + esc(item.q.prompt || '') + '</p>';
    body.appendChild(head);
    var msg = el('p', 'ui-msg', '');
    msg.setAttribute('role', 'status');   /* a live region starts empty on purpose */
    body.appendChild(msg);
    var col = el('div', 'qv-col');
    body.appendChild(col);

    shell({
      body: body, surface: 'question-view', state: 'loading-progressive',
      crumbs: [{ label: 'Classes', go: showClasses }, { label: view.cls, go: showClassPage },
               { label: 'Ex ' + (item.secIdx + 1) + ' \u00b7 ' + item.secTitle, go: function () { showExercise(item.secIdx); } },
               { label: item.qLabel }]
    });

    var roster = (view.wallData || []).slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    msg.textContent = TT('readingBooks', { done: 0, total: roster.length });
    var done = 0;
    roster.forEach(function (p) {
      call('jotter', { className: view.cls, act: view.act, email: p.email }).then(function (r) {
        done++;
        msg.textContent = done < roster.length ? TT('readingBooks', { done: done, total: roster.length }) : '';
        if (done >= roster.length) window.GJ.setState(root, 'question-view', 'loaded');
        if (!r || !r.ok) return;
        var st = null; try { st = JSON.parse(r.state || '{}'); } catch (e) {}
        var m = markState(view.act, st, item.q);
        var card = el('div', 'qv-card staff-panel');
        card.setAttribute('data-email', p.email);
        var lines = (m.last && m.last.L) || [];
        card.innerHTML = '<p class="qv-who">' + esc(p.name || p.email) + '</p>' +
          (lines.length
            ? '<ol class="qv-lines">' + lines.map(function (l) { return '<li>' + esc(pretty(l.t || '')) + '</li>'; }).join('') + '</ol>'
            : '<p class="qv-none">Nothing written for ' + esc(item.qLabel) + ' yet.</p>');
        col.appendChild(card);
      }).catch(function () { done++; });
    });
  }

  function showWall() {
    var body = el('div', '');
    var actTabs = el('div', 'check-row');
    window.GJ.app.activities.forEach(function (a) {
      var b = el('button', view.act === a.id ? 'btn-stamp' : 'btn-pencil', a.title);
      b.addEventListener('click', function () { view.act = a.id; showClassPage(); });
      actTabs.appendChild(b);
    });
    var tools = el('div', 'check-row');
    [['Back to the class page', showClassPage], ['Slips and starter', showPile], ['Download CSV', exportCsv]].forEach(function (t) {
      var b = el('button', 'toolbtn', t[0]);
      b.addEventListener('click', t[1]);
      tools.appendChild(b);
    });
    var msg = el('p', 'ui-msg', esc(TT('loadingGrid')));
    msg.style.marginTop = '26px';   // clear the tab + tools rows so the wait-card isn't crammed against them
    var wall = el('div', 'wall');
    var orient = el('p', 'wall-orient', esc(TT('gridOrient')));
    var legend = el('p', 'wall-legend');
    legend.setAttribute('data-mark', '');
    legend.innerHTML = '<span class="glyph-ok">✓</span> correct &middot; ' +
      '<span class="glyph-amber">◐</span> answer only &middot; ' +
      '<span class="glyph-err">✗</span> wrong <span class="wl-sub">(small number = the step it broke at)</span> &middot; ' +
      '<span class="glyph-live">●</span> working now &middot; ' +
      '<span class="glyph-un">—</span> not started';
    body.appendChild(actTabs); body.appendChild(tools); body.appendChild(msg); body.appendChild(orient); body.appendChild(legend); body.appendChild(wall);
    shell({ body: body, surface: 'full-grid', state: 'loaded', live: true, crumbs: [{ label: 'Classes', go: showClasses }, { label: view.cls, go: function () { showClassPage(); } }, { label: 'Full grid' }] });
    /* the grid is wider and taller than the screen; once she has scrolled it,
       the pupil column and the question row are stuck to the edges and that is
       a different screen to read */
    body.addEventListener('scroll', function () {
      SURF('full-grid', (body.scrollTop > 4 || body.scrollLeft > 4) ? 'sticky-scroll' : 'loaded');
    }, { passive: true });

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
          var glyph = '<span class="glyph-un">—</span>', title = TT('cellUntouched');
          if (cell) {
            var st = cell.ovr === 1 ? 'ok' : cell.ovr === 0 ? 'err' : cell.st;
            if (st === 'ok') { glyph = '<span class="glyph-ok">✓</span>'; title = TT('cellRight'); }
            else if (st === 'amber') { glyph = '<span class="glyph-amber">◐</span>'; title = TT('cellAmber2'); }
            else if (st === 'err') { glyph = '<span class="glyph-err">✗' + (cell.errAt ? '<sub>' + cell.errAt + '</sub>' : '') + '</span>'; title = TT('cellWrongFirstSlip', { step: cell.errAt || '?' }) + (cell.dx ? ' — ' + (DX_NAMES[cell.dx] || cell.dx) : ''); }
            else if (st === 'open') {
              var live = p.summary.upd && (now - p.summary.upd) < 60;
              glyph = '<span class="glyph-live">●</span>'; title = live ? 'Working right now' : 'In progress';
            }
            if (cell.ovr != null) title += ' · teacher override';
          }
          t.push('<td class="cell" data-mark data-email="' + esc(p.email) + '" data-qlabel="' + esc(item.label) + '" title="' + esc(title) + '">' + glyph + '</td>');
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
        var parts = [];   // only show a count that exists, each glyph in its own legend colour (not all-red)
        if (ok) parts.push('<span class="glyph-ok">' + ok + ' ✓</span>');
        if (amber) parts.push('<span class="glyph-amber">' + amber + ' ◐</span>');
        if (err) parts.push('<span class="glyph-err">' + err + ' ✗</span>');
        var tally = parts.length ? parts.join(' ') : '<span class="glyph-un">—</span>';
        totals += '<td class="col-dx">' + tally +
          (topDx ? '<br><span class="col-dx-slip">' + esc(DX_NAMES[topDx] || topDx) + ' ×' + dxCount[topDx] + '</span>' : '') + '</td>';
      });
      totals += '</tr>';
      wall.innerHTML = t.join('').replace('</tbody>', totals + '</tbody>');
      wall.querySelectorAll('.cell').forEach(function (td) {
        td.addEventListener('click', function () { showJotterPage(td.getAttribute('data-email'), { qlabel: td.getAttribute('data-qlabel') }); });
      });
      clearBusy(msg, pupils.length + ' pupils · updates every 20 seconds while this page is open · tap any cell to open that pupil’s jotter.');
    }

    function load() {
      var token = ++view.wallSeq;
      call('wall', { className: view.cls, act: view.act }).then(function (r) {
        if (token !== view.wallSeq) return;
        if (!r || !r.ok) { clearBusy(msg, SAYS(r && r.error, 'Could not load the wall.')); return; }
        view.wallData = r.pupils || [];
        view.jotterCache = {};               // fresh wall data invalidates any pre-fetched jotters
        paint(view.wallData);
      }).catch(function () { if (token === view.wallSeq) clearBusy(msg, 'Could not reach the server — will retry.'); });
    }
    busyCard(msg, 'Loading the wall&hellip; this can take a moment');
    load();
    stopPolling();
    view.wallTimer = setInterval(load, 20000);
  }

  /* ═══ Jotter Page drill-down + pencil/ink marking ════════════════════
     The app marks in pencil; the teacher marks in pen. No three-button panel:
     each verdict is a tappable pencil mark she inks with one tap. She flicks
     through the pile (prev/next pupil) instead of Wall->cell->Back->reselect. */

  // one round-trip per pupil is slow, so cache fetched jotters and pre-fetch the
  // next pupil while she reads the current one. Cleared whenever the Wall reloads.
  function fetchJotter(email) {
    view.jotterCache = view.jotterCache || {};
    if (view.jotterCache[email]) return Promise.resolve(view.jotterCache[email]);
    return call('jotter', { className: view.cls, act: view.act, email: email }).then(function (r) {
      if (r && r.ok) { view.jotterCache = view.jotterCache || {}; view.jotterCache[email] = r; }
      return r;
    });
  }
  function jotterRoster() {
    return (view.wallData || []).slice()
      .sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); })
      .map(function (p) { return { email: p.email, name: p.name || p.email }; });
  }

  function showJotterPage(email, ctx) {
    ctx = ctx || {};
    stopPolling();                         // the 20s Wall poll suspends while she flicks the pile
    var roster = jotterRoster();
    var idx = roster.map(function (p) { return p.email; }).indexOf(email);
    var prevP = idx > 0 ? roster[idx - 1] : null;
    var nextP = (idx >= 0 && idx < roster.length - 1) ? roster[idx + 1] : null;

    var body = el('div', '');
    // the flick bar — physical "turn to the next jotter", with an always-visible axis label
    var flick = el('div', 'flick-bar');
    var bPrev = el('button', 'flick-btn' + (prevP ? '' : ' is-off'), '‹ ' + (prevP ? esc(prevP.name.split(' ')[0]) : 'first'));
    /* turning to the next jotter is its own state: the page she is leaving is
       still on screen while the next one is fetched */
    var axis = ctx.qlabel ? (esc(ctx.qlabel) + ' · across the class') : ((roster[idx] ? esc(roster[idx].name.split(' ')[0]) : 'this pupil') + '’s book');
    var lbl = el('span', 'flick-label', axis + (idx >= 0 ? ' · ' + (idx + 1) + ' of ' + roster.length : ''));
    var bNext = el('button', 'flick-btn' + (nextP ? '' : ' is-off'), (nextP ? esc(nextP.name.split(' ')[0]) : 'last') + ' ›');
    if (prevP) bPrev.addEventListener('click', function () { showJotterPage(prevP.email, ctx); });
    if (nextP) bNext.addEventListener('click', function () { SURF('book-view', 'flicking'); showJotterPage(nextP.email, ctx); });
    flick.appendChild(bPrev); flick.appendChild(lbl); flick.appendChild(bNext);

    var msg = el('p', 'ui-msg', esc(TT('fetchingBook')));
    var page = el('div', 'jotter');
    body.appendChild(flick); body.appendChild(msg); body.appendChild(page);
    shell({ body: body, surface: 'book-view', state: 'pencil', crumbs: [{ label: 'Classes', go: showClasses }, { label: view.cls, go: function () { showClassPage(); } }, { label: 'A pupil\u2019s book' }] });

    busyCard(msg, 'Fetching the jotter&hellip; this can take a moment');
    fetchJotter(email).then(function (r) {
      if (nextP) fetchJotter(nextP.email);    // pre-fetch one ahead so the next flick is instant
      if (!r || !r.ok) { clearBusy(msg, SAYS(r && r.error, 'Could not load.')); return; }
      var state = null;
      try { state = JSON.parse(r.state); } catch (e) {}
      clearBusy(msg, (r.name || email) + ' · ' + (view.act === 'angles' ? 'Angles' : 'Algebra') +
        ' · every committed line, attempt 1 struck through where it was retried.');
      if (!state) { page.innerHTML = '<div class="jotter-q"><div class="jq-margin"></div><div class="jq-body ui-msg">Nothing saved yet.</div></div>'; return; }

      page.appendChild(jotterHeader(state, r.name));
      // the posture line, shown once at the top: the whole pencil/ink model in one sentence
      page.appendChild(el('div', 'jp-posture', esc(TT('pencilPosture'))));

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

        if (state.help && state.help[q.id]) bodyEl.appendChild(el('p', 'jp-help', esc(TT('openedExample'))));

        // ── send my eye to what needs it: a folded "worth a look" corner where the
        //    engine was unsure (answer-only, or a wrong route it couldn't name). Advisory only. ──
        var worthLook = (res.st === 'amber') || (res.st === 'err' && !res.dx);
        if (worthLook && rec.ovr == null) { wrap.classList.add('worth-look'); SURF('book-view', 'worth-a-look-open'); }

        // ── the verdict as a PENCIL mark she inks in PEN — no three-button panel ──
        function vGlyph(s) {
          return s === 'ok' ? '<span class="glyph-ok">✓</span>' : s === 'amber' ? '<span class="glyph-amber">◐</span>'
            : s === 'open' ? '<span class="glyph-live">●</span>' : '<span class="glyph-err">✗</span>';
        }
        var mkMax = (res.verdict && res.verdict.mkMax) || q.marks;
        var tallyTail = last.dur ? ' · ' + last.dur + 's · ' + rec.att.length + ' attempt' + (rec.att.length > 1 ? 's' : '') : '';
        var vrow = el('div', 'verdict-row');
        var vmark = el('button', 'verdict-mark');
        var tallyEl = res.verdict ? el('div', 'staff-tally') : null;
        var inkMsg = el('span', 'ink-msg ui-msg', rec.ovr ? 'Your mark.' : '');

        function paintVerdict() {
          var inked = rec.ovr != null;
          var effSt = inked ? (rec.ovr.q === 1 ? 'ok' : 'err') : res.st;
          vmark.className = 'verdict-mark ' + (inked ? 'is-inked' : 'is-pencil');
          vmark.innerHTML = vGlyph(effSt);
          vmark.setAttribute('aria-label', TT('markedAria', { verdict: (effSt === 'ok' ? 'right' : effSt === 'amber' ? 'answer only' : effSt === 'err' ? 'wrong' : 'in progress') }) + (inked ? ' by you' : ' by the app'));
          if (tallyEl) {
            var m0 = res.verdict.mk[0], m1 = res.verdict.mk[1];
            if (inked && rec.ovr.q === 1) { m0 = mkMax[0]; m1 = mkMax[1]; }      // right = full working + answer marks
            else if (inked && rec.ovr.q === 0) { m0 = 0; m1 = 0; }
            tallyEl.className = 'staff-tally ' + (effSt === 'ok' ? 'mk-correct' : effSt === 'amber' ? 'mk-amber' : effSt === 'err' ? 'mk-wrong' : 'mk-open');
            tallyEl.textContent = TT('workingLabel') + ' ' + m0 + '/' + mkMax[0] + ' · Answer ' + m1 + '/' + mkMax[1] + tallyTail;
          }
        }
        paintVerdict();
        vrow.appendChild(vmark);
        if (tallyEl) vrow.appendChild(tallyEl);

        // the one genuinely pedagogical action, promoted to a standing intent-named move
        if (item.secId && item.secHasMovie && (res.st === 'err' || res.st === 'amber')) {
          var reteach = el('button', 'jp-reteach', esc(TT('reteachBtn')));
          reteach.title = TT('reteachTitle', { title: String(item.label).split('\u00b7')[0].trim() });
          reteach.addEventListener('click', function () {
            if (reteach.disabled) return; reteach.disabled = true;
            call('nudge', { className: view.cls, act: view.act, email: email, sec: item.secId + '::' + q.id }).then(function (r3) {
              reteach.disabled = false;
              if (r3 && r3.ok) { reteach.textContent = TT('reteachSent'); reteach.classList.add('is-sent'); SURF('book-view', 'reteach-sent'); }
              else { reteach.disabled = false; inkMsg.textContent = (r3 && r3.error) || TT('reteachFailed'); }
            }).catch(function () { reteach.disabled = false; inkMsg.textContent = TT('reteachFailed'); });
          });
          vrow.appendChild(reteach);
        }
        bodyEl.appendChild(vrow);

        // the ink control — opens AT the mark on tap (one tap to open, one to choose).
        // it also carries the "couldn't save" slot so a network hiccup has somewhere to land.
        var ink = el('div', 'ink-control'); ink.hidden = true;
        function setOvr(val, btn) {
          if (btn.disabled) return; btn.disabled = true; inkMsg.textContent = TT('saving');
          call('override', { className: view.cls, act: view.act, email: email, q: q.id, idx: 'q', val: val }).then(function (r2) {
            btn.disabled = false;
            if (r2 && r2.ok) {
              rec.ovr = (val == null) ? null : { q: val };
              if (view.jotterCache) delete view.jotterCache[email];   // the cached jotter is now stale; re-fetch on flick-back
              if (rec.ovr == null && worthLook) wrap.classList.add('worth-look'); else wrap.classList.remove('worth-look');
              paintVerdict();
              SURF('book-view', val === 1 ? 'inked-mine-tick' : val === 0 ? 'inked-mine-cross' : 'inked-app');
              inkMsg.textContent = (val === 1) ? 'Inked right — full marks. Your mark wins on the Wall.' : (val === 0) ? 'Inked wrong. Your mark wins on the Wall.' : 'Back to the app’s mark.';
              ink.hidden = true; vmark.setAttribute('aria-expanded', 'false');
            } else inkMsg.textContent = (r2 && r2.error) || TT('saveFailedMark');
          }).catch(function () { btn.disabled = false; inkMsg.textContent = TT('saveFailedMark'); });
        }
        var icTick = el('button', 'ic-tick', esc(TT('inkYes')));
        var icCross = el('button', 'ic-cross', esc(TT('inkNo')));
        var icAuto = el('button', 'ic-auto btn-pencil', esc(TT('inkUse')));
        icTick.addEventListener('click', function () { setOvr(1, icTick); });
        icCross.addEventListener('click', function () { setOvr(0, icCross); });
        icAuto.addEventListener('click', function () { setOvr(null, icAuto); });
        ink.appendChild(el('span', 'ic-label', esc(TT('inkYourMark'))));
        ink.appendChild(icTick); ink.appendChild(icCross); ink.appendChild(icAuto); ink.appendChild(inkMsg);
        bodyEl.appendChild(ink);
        vmark.setAttribute('aria-expanded', 'false');
        vmark.addEventListener('click', function () {
          ink.hidden = !ink.hidden;
          vmark.setAttribute('aria-expanded', String(!ink.hidden));
          /* the book view says the ink control is open, and the question view
             says the same when she is inking one question across the class */
          SURF('book-view', ink.hidden ? 'pencil' : 'ink-control-open');
          SURF('question-view', ink.hidden ? 'loaded' : 'ink-open');
        });

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
    var msg = el('p', 'ui-msg', esc(TT('readingEveryBook')));
    body.appendChild(msg);
    var list = el('div', '');
    body.appendChild(list);
    shell({ body: body, surface: 'slips', state: 'ranked', crumbs: [{ label: 'Classes', go: showClasses }, { label: view.cls, go: function () { showClassPage(); } }, { label: 'Slips' }] });

    busyCard(msg, 'Reading every jotter&hellip; this can take a moment');
    fullStates().then(function (all) {
      clearBusy(msg, '');
      var piles = {}; // key → {label, names:[], example}
      var amberCount = 0;   // answer-only responses never reach the pile (no working line to mark) — track them so an "empty" pile doesn't read as "no problems"
      all.forEach(function (p) {
        questionList(view.act).forEach(function (item) {
          var res = markState(view.act, p.state, item.q);
          if (res.st === 'amber') amberCount++;
          if (res.st !== 'err') return;
          var key = res.dx || ('cluster:' + (res.cluster || item.q.id));
          var label = res.dx ? (DX_NAMES[res.dx] || res.dx) : ('Same wrong line: ' + (res.cluster || '?'));
          piles[key] = piles[key] || { label: label, names: [], qlabel: item.label, example: res.cluster || '' };
          piles[key].names.push(p.name || p.email);
        });
      });
      var keys = Object.keys(piles).sort(function (a, b) { return piles[b].names.length - piles[a].names.length; });
      msg.textContent = keys.length
        ? 'Misconceptions ranked by how many pupils share them. “Starter” throws the top slips on the board, anonymised.'
        : amberCount
          ? 'No marked working errors to pile up — but ' + amberCount + ' answer' + (amberCount > 1 ? 's' : '') + ' came in with no working shown (the amber ◐ cells on the Wall), so there’s nothing to mark here. Worth chasing the missing working.'
          : 'No marked errors in this class yet — the pile is empty.';
      if (keys.length) {
        var starterB = el('button', 'btn-stamp gold', esc(TT('starterBtn')));
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
    SURF('slips', 'starter-board');
    var over = el('div', 'starter-overlay');
    function paint() {
      var p = piles[idx];
      over.innerHTML = '<div class="starter-card">' +
        '<p class="starter-h">Spot the slip · starter ' + (idx + 1) + ' of ' + piles.length + '</p>' +
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

      var STATUS_LABEL = { ok: 'Correct', amber: 'Answer only', err: 'Wrong', open: 'In progress' };
      var rows = [['Pupil', 'Email', 'Activity', 'Question', 'Status', 'Working marks', 'Answer marks', 'Out of', 'Attempts', 'First try', 'Time (seconds)', 'Misconception', 'Self-confidence (1-3)', 'Teacher override', 'Pupil flag']];
      all.forEach(function (p) {
        var evals = (p.state && p.state.evals) || {};
        questionList(view.act).forEach(function (item) {
          var res = markState(view.act, p.state, item.q);
          if (res.st === 'un') return;
          var mk = res.verdict ? res.verdict.mk : ['', ''];
          var mkMax = (res.verdict && res.verdict.mkMax) || item.q.marks;
          var firstTry = (res.rec && res.rec.att && res.rec.att.length === 1 && res.st === 'ok') ? 'yes' : (res.st === 'open' ? '' : 'no');
          var secEv = evals[qSec[item.q.id]];
          rows.push([p.name || '', p.email, view.act, item.label, STATUS_LABEL[res.st] || res.st,
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
      alertBar(TT('csvCopiedFull'));
    });
  }
  /* a failed admin call is surfaced WHERE SHE ALREADY IS, with its reason */
  function staffError(msg, msgEl) {
    var r = document.getElementById('scr-staff');
    if (r && window.GJ && window.GJ.setState) {
      window.GJ.setState(r, r.getAttribute('data-surface') || 'set-up', 'error');
    }
    if (msgEl) msgEl.textContent = msg;
    else alertBar(msg);
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
