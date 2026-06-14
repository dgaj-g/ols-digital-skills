/* ============================================================================
   Isotope Lab — boot & glue
   Identity / sign-in, hub navigation, mode routing, header wiring.
   ============================================================================ */
(function (global) {
  'use strict';
  var Lab = global.Lab;
  var currentMode = null;

  var MODES = { atom: function () { return Lab.Atom; }, snap: function () { return Lab.Snap; }, massspec: function () { return Lab.MassSpec; } };

  Lab.goHub = function () {
    if (currentMode && MODES[currentMode] && MODES[currentMode]().leave) MODES[currentMode]().leave();
    currentMode = null;
    Lab.showScreen('hub');
    Lab.narrate('hub');
    Lab.updateHubProgress();
    refreshHubGroupLine();
  };
  function enterMode(mode) {
    if (currentMode && currentMode !== mode && MODES[currentMode] && MODES[currentMode]().leave) MODES[currentMode]().leave();
    currentMode = mode;
    Lab.sound.unlock();
    MODES[mode]().enter();
  }
  function refreshHubGroupLine() {
    var line = Lab.$('#hub-group-line'); if (!line) return;
    Lab.call('myGroup').then(function (r) {
      if (r && r.ok && r.inGroup) {
        line.hidden = false;
        line.innerHTML = '👥 Your teacher has placed you in a team. Open <b>My group</b> to see more.';
      } else line.hidden = true;
    });
  }

  /* ---------- sign-in ---------- */
  function startSignIn() {
    Lab.showScreen('signin');
    var cc = Lab.state.classCode;
    if (cc && cc !== 'default') { var cl = Lab.$('#signin-class'); cl.hidden = false; cl.textContent = 'Class: ' + cc; }
    Lab.call('whoami').then(function (r) {
      Lab.state.email = (r && r.email) || '';
      Lab.state.preview = !!(r && r.preview);
      var live = r && !r.preview && r.email;
      if (live) {
        var id = Lab.$('#signin-identity'); id.hidden = false; id.textContent = 'Signed in as ' + r.email;
      }
      // already has a saved name? skip straight in.
      Lab.call('state').then(function (s) {
        if (s && s.ok && s.name) {
          Lab.state.name = s.name; applyState(s);
          Lab.$('#signin-title').textContent = 'Welcome back, ' + s.name.split(' ')[0] + '!';
          finishSignIn(true);
          return;
        }
        // first time on this device: on the real login, the email is known but
        // C2k emails are usernames, so pre-fill a best guess and ask them to confirm once.
        if (live) {
          var g = guessName(r.email);
          if (g) {
            Lab.$('#in-first').value = g.first; Lab.$('#in-surname').value = g.surname;
            Lab.$('#signin-sub').textContent = "You're signed in with your school account. Check your name is right below (you only set this once), then enter the lab.";
          } else {
            Lab.$('#signin-sub').textContent = "You're signed in with your school account. Tell us your name once and it will remember you on every device.";
          }
        }
      });
    });
  }
  function guessName(email) {
    var local = String(email).split('@')[0];
    var parts = local.split(/[._\-]+/).filter(function (t) { return /^[a-z]{2,}$/i.test(t); });
    if (parts.length >= 2) return { first: cap(parts[0]), surname: cap(parts[1]) };
    return null;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
  function applyState(s) {
    if (typeof s.xp === 'number') Lab.state.xp = s.xp;
    if (s.progress) Lab.state.progress = s.progress;
    var v = Lab.$('#xp-value'); if (v) v.textContent = Lab.state.xp;
  }
  function submitName() {
    var f = Lab.$('#in-first').value.trim(), l = Lab.$('#in-surname').value.trim();
    var note = Lab.$('#signin-note');
    if (f.length < 1 || l.length < 1) { note.hidden = false; note.textContent = 'Please type both your first name and surname.'; return; }
    Lab.$('#signin-go').disabled = true;
    Lab.call('setName', { firstName: f, surname: l }).then(function (r) {
      Lab.$('#signin-go').disabled = false;
      if (!r || !r.ok) { note.hidden = false; note.textContent = 'Could not save your name — please try again.'; return; }
      Lab.state.name = r.name; Lab.state.firstName = f; Lab.state.surname = l;
      Lab.call('state').then(function (s) { if (s && s.ok) applyState(s); finishSignIn(false); });
    });
  }
  function finishSignIn(returning) {
    Lab.state.signedIn = true;
    Lab.$('#xp-pill').hidden = false;
    Lab.$('#xp-value').textContent = Lab.state.xp;
    Lab.$('#leaderboard-btn').hidden = false;
    Lab.$('#group-btn').hidden = false;
    Lab.$('#staff-btn').hidden = false;
    Lab.updateHubProgress();
    Lab.goHub();
    if (!returning) Lab.narrate('hub', 'Welcome ' + (Lab.state.name.split(' ')[0] || '') + '! Pick a station to begin.');
  }

  /* ---------- boot ---------- */
  function boot() {
    Lab.state.classCode = Lab.classCode();

    // bind everything
    Lab.Atom.bind(); Lab.Snap.bind(); Lab.MassSpec.bind(); Lab.Staff.bind();

    // sign-in
    Lab.$('#signin-go').addEventListener('click', submitName);
    Lab.$('#in-surname').addEventListener('keydown', function (e) { if (e.key === 'Enter') submitName(); });

    // hub stations
    Lab.$$('.station-card').forEach(function (c) {
      c.addEventListener('click', function () { enterMode(c.getAttribute('data-mode')); });
    });
    // back buttons
    Lab.$$('[data-back]').forEach(function (b) { b.addEventListener('click', Lab.goHub); });

    // header
    Lab.$('#leaderboard-btn').addEventListener('click', Lab.Staff.openLeaderboard);
    Lab.$('#group-btn').addEventListener('click', Lab.Staff.openMyGroup);
    Lab.$('#staff-btn').addEventListener('click', Lab.Staff.openStaff);

    // close modals on backdrop / Escape
    Lab.$$('.ols-modal, .celebrate').forEach(function (m) {
      m.addEventListener('click', function (e) { if (e.target === m && m.id !== 'celebrate') m.hidden = true; });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') Lab.$$('.ols-modal:not([hidden])').forEach(function (m) { m.hidden = true; });
    });

    // unlock audio on first gesture
    var once = function () { Lab.sound.unlock(); document.removeEventListener('pointerdown', once); };
    document.addEventListener('pointerdown', once);

    // resize hook for the 3D stage
    global.addEventListener('resize', function () { if (Lab.Atom.onResize) Lab.Atom.onResize(); });

    startSignIn();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(typeof window !== 'undefined' ? window : this);
