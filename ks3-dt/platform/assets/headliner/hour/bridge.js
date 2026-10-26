/* J2 L6 THE HEADLINER — the bridge to the platform (the L5 SearchBridge pattern). The platform opens this page with
   her place in the hash (#{"stage":"hour","name":"Aoife","saved":{…}}); the hour sends back save, badge, poster and
   done. #{"test":1} loads the hour and sends nothing (the clock gates). Opened on its own, it sends nothing either. */
(function () {
  'use strict';
  var place = {};
  try { var h = location.hash.slice(1); if (h) place = JSON.parse(decodeURIComponent(h)) || {}; } catch (e) { place = {}; }
  var test = place.test === 1, framed = window.parent !== window;
  function post(type, extra) { if (test || !framed) return; try { window.parent.postMessage(Object.assign({ headliner: 1, type: type }, extra || {}), '*'); } catch (e) {} }
  window.HeadlinerBridge = { test: test, framed: framed && !test, place: place,
    save: function (p) { post('save', { save: p }); },
    badge: function (id) { post('badge', { id: id }); },
    poster: function (festival, price) { post('poster', { festival: festival, price: price }); },
    done: function (why) { post('done', { why: why || 'end' }); } };
})();
