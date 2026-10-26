/* J2 L5 THE SEARCH — boot: the hour takes over from the frozen film. Her place comes from the platform
   (SearchBridge.place): a place at chapter 1–5 gets the Welcome back panel; stage 'free' is the free flight. */
(function () {
  'use strict';
  var U = window.SearchUI, S = window.SearchStrings, H = window.SearchHour, F = window.SearchFilm, S2 = window.SearchSound2, Snd = window.SearchSound, P = window.SearchPics, Br = window.SearchBridge;
  var q = new URLSearchParams(location.search), from = +q.get('from') || 0, place = Br.place || {};
  function filmReady() { return new Promise(function (res) { (function poll() { var c = document.getElementById('call'); if (c && c.classList.contains('on')) res(); else setTimeout(poll, 20); })(); }); }
  U.init(); U.text('pausedScrim', S.common.paused); U.show('hour', false);
  if (q.get('mute')) { Snd.setMuted(true); S2.setMuted(true); }
  /* the clocks gate: load the hour, run its frames, start nothing */
  if (Br.test) { U.show('hour', true); U.draw(function (t) { P.ground(t, 0.2); P.vignette(); }); return; }
  /* the frozen film listens for arrow keys on the document: keep them from it once the hour is running */
  window.addEventListener('keydown', function (ev) { if (U.active() && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && ev.target !== U.$('box')) ev.stopPropagation(); }, true);
  var snd = document.getElementById('snd'); if (snd) snd.addEventListener('click', function () { S2.setMuted(F.soundState() === 'muted'); });
  var read = document.getElementById('read'); if (read) read.addEventListener('click', function () { S2.start(); if (U.speed > 1) setTimeout(function () { F.P.ft = F.T.end - 0.05; }, 80); });
  var warned = false; U.onFrame(function () { if (!warned && U.now() >= 48 * 60) { warned = true; U.note(S.common.runningOut); } });
  H.lamb = place.lambName || ''; H.foundAt = place.foundAt || ''; H.got = (place.got || []).slice();
  H.mine = place.mine && typeof place.mine === 'object' ? place.mine : { fields: {}, spiral: '' }; H.mine.fields = H.mine.fields || {}; H.mine.spiral = H.mine.spiral || '';
  /* chapter k: 0 the film, 1–4 the chapters, 5 Home. Each badge goes up as its chapter ends (b13 The Tracks, b14 The Spiral, b15 The Way Home). */
  var chapters = [H.bang, H.ch1, H.ch2, H.ch3, H.ch4, H.home], BADGE = { 1: 'b13', 3: 'b14', 4: 'b15' }, early = false;
  function run(i) { var p = Promise.resolve(); for (var k = i; k < chapters.length; k++) (function (k) {
      p = p.then(function () { if (early) return; if (k >= 1) H.save(k); if (k === 1 && i === 0) U.note(S.stripNamed);
        return chapters[k]().then(function () { var b = BADGE[k]; if (b && H.got.indexOf(b) === -1) { H.got.push(b); H.save(k); Br.badge(b); }
          /* past 48 minutes, between chapters: Carry on, or Home now with her place kept at the next chapter */
          if (k >= 1 && k <= 3) return H.between(k).then(function (id) { if (id !== 'home') return; early = true; H.save(k + 1); return H.home(k); }); }); }); })(k);
    return p.catch(function (e) { console.error('hour flow error', e); window.__hourError = String(e && e.stack || e); }); }
  function boot() { U.show('hour', true);
    if (place.stage === 'free') return H.free();
    if (from) return run(from);
    var c = +place.chapter || 0;
    if (c >= 1 && c <= 5) { U.draw(function (t) { P.ground(t, 0.2); P.vignette(); });
      U.panel({ kicker: S.strip[c], head: U.fill(c < 5 && H.lamb ? S.common.welcome : S.common.welcomeNoLamb, { name: place.name || '', chapter: S.strip[c], lamb: H.lamb }).replace('Welcome back, .', 'Welcome back.') });
      return U.buttons([{ id: 'carry', label: S.btn.carryOn, primary: true }, { id: 'again', label: S.btn.startAgain }]).then(function (id) { Snd.start(); S2.start(); U.panel({ kicker: '', head: '' });
        if (id === 'carry') return run(c);
        H.lamb = ''; H.foundAt = ''; H.got = []; H.mine = { fields: {}, spiral: '' }; return run(0); }); }
    return run(0); }
  filmReady().then(function () { F.go('off'); return document.fonts && document.fonts.ready ? document.fonts.ready : null; }).then(boot);
})();
