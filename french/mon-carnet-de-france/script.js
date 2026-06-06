/* ============================================================
   Mon Carnet de France  -  front-end (shell slice)
   ------------------------------------------------------------
   ONE codebase, two homes:
   - On the Apps Script page, window.OLS_TRANSPORT routes calls through
     google.script.run (same-origin, carries the verified C2k sign-in).
   - On github.io / local preview, OLS_TRANSPORT is absent, so we fall back
     to an offline stub backed by localStorage. This lets the visuals and the
     whole journey be tested without deploying.
   The four stations are placeholders here; the real content comes later.
   ============================================================ */
(function () {
  'use strict';

  var BOOT = window.OLS_BOOT || { classCode: 'default', baseUrl: '' };
  var STATIONS = [1, 2, 3, 4];
  var STATION_NAMES = {
    1: 'La Carte — The map of France',
    2: 'La Cuisine — French food',
    3: 'Le 14 Juillet — Bastille Day',
    4: 'Les Personnes Célèbres — Famous French people'
  };

  // ---- local state ----
  var state = { email: '', name: '', stations: { 1: false, 2: false, 3: false, 4: false }, docUrl: '' };
  var openStation = null;

  // ---- tiny DOM helpers ----
  function $(id) { return document.getElementById(id); }
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function doneCount() { return STATIONS.filter(function (n) { return state.stations[n]; }).length; }

  /* ============================================================
     Transport: OLS_TRANSPORT (Path B) or an offline localStorage stub
     ============================================================ */
  var LS_KEY = 'mcdf-shell-' + BOOT.classCode;

  function offlineStore() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function offlineSave(obj) { try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch (e) {} }

  function offlineCall(p) {
    var s = offlineStore();
    switch (p.action) {
      case 'whoami':
        return Promise.resolve({ ok: true, email: 'demo.pupil@offline (preview)' });
      case 'load':
        return Promise.resolve({
          ok: true,
          name: s.name || '',
          stations: s.stations || { 1: false, 2: false, 3: false, 4: false },
          docUrl: s.docUrl || ''
        });
      case 'save':
        s.name = p.name || s.name || '';
        s.stations = p.stations || s.stations || {};
        offlineSave(s);
        return Promise.resolve({ ok: true });
      case 'makeDoc':
        s.docUrl = 'https://docs.google.com/document/d/PREVIEW_STUB/edit';
        offlineSave(s);
        return Promise.resolve({ ok: true, url: s.docUrl });
      case 'admin':
        if (String(p.passcode || '').trim().toLowerCase() !== 'demo') {
          return Promise.resolve({ ok: false, error: 'bad-passcode' });
        }
        return Promise.resolve({
          ok: true,
          rows: [{
            name: 'demo.pupil@offline', s1: !!(s.stations && s.stations[1]), s2: !!(s.stations && s.stations[2]),
            s3: !!(s.stations && s.stations[3]), s4: !!(s.stations && s.stations[4]), docUrl: s.docUrl || ''
          }]
        });
      default:
        return Promise.reject(new Error('unknown action ' + p.action));
    }
  }

  function call(action, payload) {
    var p = payload || {};
    p.action = action;
    p['class'] = BOOT.classCode;
    if (window.OLS_TRANSPORT && typeof window.OLS_TRANSPORT.call === 'function') {
      return window.OLS_TRANSPORT.call(p);
    }
    return offlineCall(p);
  }

  /* ============================================================
     Render
     ============================================================ */
  function render() {
    STATIONS.forEach(function (n) {
      var btn = document.querySelector('.station[data-station="' + n + '"]');
      var status = $('st' + n + '-status');
      if (!btn) return;
      if (state.stations[n]) {
        btn.classList.add('done');
        if (status) status.textContent = 'Done';
      } else {
        btn.classList.remove('done');
        if (status) status.textContent = 'Start';
      }
      var stamp = document.querySelector('.stamps li[data-stamp="' + n + '"]');
      if (stamp) stamp.classList.toggle('done', !!state.stations[n]);
    });

    var c = doneCount();
    var count = $('passport-count');
    if (count) count.textContent = c + ' of 4 stops done' + (c === 4 ? ' — très bien !' : '');

    var create = $('create');
    var finish = create ? create.closest('.finish') : null;
    var hint = $('finish-hint');
    if (create) {
      var ready = c === 4 && !state.docUrl;
      create.disabled = c !== 4;
      var lock = create.querySelector('.lock');
      if (lock) lock.style.display = c === 4 ? 'none' : '';
      if (finish) finish.classList.toggle('ready', c === 4);
      if (hint) {
        if (state.docUrl) hint.textContent = 'Your project has been created. You can make changes to it any time.';
        else if (ready) hint.textContent = 'All four stops done. Make your project!';
        else hint.textContent = 'Finish all four stops to unlock this.';
      }
    }
  }

  function showResult(url) {
    var box = $('result');
    if (!box) return;
    box.innerHTML =
      '<h2>Now make it brilliant</h2>' +
      '<p>Your project is now a Google Doc in your own Drive. It is your <strong>first draft</strong> ' +
      '- open it and make it even better:</p>' +
      '<ul>' +
        '<li>Read it aloud. Does every sentence start with a capital and end with a full stop?</li>' +
        '<li>Swap one dull word for a more interesting one in each part.</li>' +
        '<li>Add one extra sentence to each section.</li>' +
        '<li>Check your spelling, and make sure every opinion has a <em>because</em>.</li>' +
      '</ul>' +
      '<p><a href="' + url + '" target="_blank" rel="noopener">Open my project to edit it</a></p>';
    show(box);
  }

  /* ============================================================
     Actions
     ============================================================ */
  function persist() {
    return call('save', { name: state.name, stations: state.stations }).catch(function () {});
  }

  function markStationDone(n) {
    state.stations[n] = true;
    render();
    persist();
  }

  function createProject() {
    var btn = $('create');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating your project...'; }
    call('makeDoc', {})
      .then(function (r) {
        if (r && r.ok && r.url) {
          state.docUrl = r.url;
          showResult(r.url);
          render();
        } else {
          alert('Sorry, the project could not be created just now. Please try again.');
        }
      })
      .catch(function () { alert('Sorry, the project could not be created just now. Please try again.'); })
      .then(function () {
        var b = $('create');
        if (b) b.innerHTML = 'Créer mon projet / Make my project';
        render();
      });
  }

  /* ============================================================
     Station modal
     ============================================================ */
  function openStationModal(n) {
    openStation = n;
    $('sm-title').textContent = STATION_NAMES[n] || ('Stop ' + n);
    var done = $('sm-done');
    if (done) done.style.display = state.stations[n] ? 'none' : '';
    show($('station-modal'));
  }
  function closeStationModal() { openStation = null; hide($('station-modal')); }

  /* ============================================================
     Staff panel
     ============================================================ */
  function renderDash(rows) {
    var t = $('dash');
    if (!t) return;
    var head = '<tr><th>Pupil</th><th>1 Carte</th><th>2 Cuisine</th><th>3 Juillet</th><th>4 Célèbres</th><th>Project</th></tr>';
    var body = (rows || []).map(function (r) {
      function cell(v) { return v ? '<td class="yes">✓</td>' : '<td class="no">–</td>'; }
      var doc = r.docUrl ? '<td><a href="' + r.docUrl + '" target="_blank" rel="noopener">Open</a></td>' : '<td class="no">–</td>';
      return '<tr><td>' + escapeHtml(r.name || '') + '</td>' + cell(r.s1) + cell(r.s2) + cell(r.s3) + cell(r.s4) + doc + '</tr>';
    }).join('');
    t.innerHTML = head + (body || '<tr><td colspan="6">No pupils yet.</td></tr>');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function staffOpen() {
    var pass = ($('staff-pass').value || '').trim();
    var msg = $('staff-msg');
    msg.textContent = '';
    $('staff-go').disabled = true;
    call('admin', { passcode: pass, sub: 'dashboard' })
      .then(function (r) {
        if (r && r.ok) {
          hide($('staff-gate'));
          show($('staff-board'));
          renderDash(r.rows);
        } else {
          msg.textContent = 'That passcode was not recognised. Try again.';
        }
      })
      .catch(function () { msg.textContent = 'Something went wrong. Please try again.'; })
      .then(function () { $('staff-go').disabled = false; });
  }
  function staffRefresh() {
    var pass = ($('staff-pass').value || '').trim();
    call('admin', { passcode: pass, sub: 'dashboard' })
      .then(function (r) { if (r && r.ok) renderDash(r.rows); })
      .catch(function () {});
  }

  /* ============================================================
     Boot
     ============================================================ */
  function boot() {
    // wire events
    $('welcome-start').addEventListener('click', function () { hide($('welcome')); show($('home')); });
    document.querySelectorAll('.station').forEach(function (btn) {
      btn.addEventListener('click', function () { openStationModal(Number(btn.getAttribute('data-station'))); });
    });
    $('sm-close').addEventListener('click', closeStationModal);
    $('sm-done').addEventListener('click', function () { if (openStation) markStationDone(openStation); closeStationModal(); });
    $('create').addEventListener('click', createProject);
    $('staff-key').addEventListener('click', function () { show($('staff-modal')); var p = $('staff-pass'); if (p) p.focus(); });
    $('staff-close').addEventListener('click', function () { hide($('staff-modal')); });
    $('staff-go').addEventListener('click', staffOpen);
    $('staff-refresh').addEventListener('click', staffRefresh);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeStationModal(); hide($('staff-modal')); }
    });

    // identity + saved state
    call('whoami', {})
      .then(function (r) { state.email = (r && r.email) || ''; })
      .catch(function () {})
      .then(function () { return call('load', {}); })
      .then(function (r) {
        if (r && r.ok) {
          state.name = r.name || '';
          state.stations = r.stations || state.stations;
          state.docUrl = r.docUrl || '';
        }
      })
      .catch(function () {})
      .then(function () {
        var firstVisit = doneCount() === 0 && !state.docUrl;
        if (firstVisit) {
          var hello = $('welcome-hello');
          if (hello) hello.textContent = state.email ? ('Signed in as ' + state.email) : 'Signed in with your school account';
          show($('welcome'));
        } else {
          show($('home'));
        }
        if (state.docUrl) showResult(state.docUrl);
        render();
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
