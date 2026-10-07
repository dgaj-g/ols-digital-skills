/* The Rescue: the bridge between the story and the platform (J3 Lesson 4).
   The story runs in its own frame inside the lesson. The platform keeps her place, her badges and her XP;
   the story tells it what happened with window.parent.postMessage, and nothing else leaves this page.
   Her saved place comes IN on the frame's address, after the # (the engine writes it), so the story can
   read it before its first frame without asking anyone.

   The gates' copy of this page (probes/rescue/hour.html) sets window.__RescueOpt to its own address
   before this file runs. Only then are the test options read (the old prototype's ?h= jumps, freeze,
   speed, mute), and only then is the place kept in this browser instead of being sent to the platform.
   The lesson's page sets nothing, so a pupil has no option to reach. */
(function () {
  'use strict';
  var KEY = 'rescue-hour-v1';
  var test = typeof window.__RescueOpt === 'string';
  var q = new URLSearchParams(test ? window.__RescueOpt : '');
  var saved = null;
  if (test) {
    try { if (!q.has('hfresh')) saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* no saved place */ }
  } else {
    try { var h = location.hash.slice(1); if (h) saved = JSON.parse(decodeURIComponent(h)); } catch (e) { /* no saved place */ }
  }
  var sent = window.__rescueSent = [];
  function post(m) {
    m.rescue = 1; sent.push(m.type);
    if (test || window.parent === window) return;
    try { window.parent.postMessage(m, '*'); } catch (e) { /* the platform is gone: nothing to tell */ }
  }
  window.RescueBridge = {
    test: test, q: q, saved: saved && saved.step ? saved : null,
    /* her place: the step, the hedgehog's name, the work so far. The platform keeps it in her lesson draft. */
    store: function (save) {
      if (test) { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private window */ } }
      post({ type: 'save', save: JSON.parse(JSON.stringify(save)) });
    },
    forget: function () { if (test) { try { localStorage.removeItem(KEY); } catch (e) { /* nothing to forget */ } } },
    /* a badge earned in the story: the platform records it and adds its XP. The story shows its own badge card. */
    badge: function (o) { post({ type: 'badge', id: o.id, name: o.name, xp: o.xp }); },
    /* the story is over (or she chose to go to the 5 questions): the platform carries on to its own steps */
    done: function (why) { post({ type: 'done', why: why || 'end' }); }
  };
})();
