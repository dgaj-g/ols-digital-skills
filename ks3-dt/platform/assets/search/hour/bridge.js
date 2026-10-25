/* J2 L5 THE SEARCH — the bridge to the platform. The platform opens this page with her place in the hash
   (#{"chapter":3,"lambName":"…","name":"Aoife"}); the hour sends back save, badge and done. #{"test":1} loads the
   hour without starting it and sends nothing (the clocks gate). Opened on its own, it sends nothing either. */
(function () {
  'use strict';
  var place = {};
  try { var h = location.hash.slice(1); if (h) place = JSON.parse(decodeURIComponent(h)) || {}; } catch (e) { place = {}; }
  var test = place.test === 1;
  function post(type, extra) { if (test || window.parent === window) return; try { window.parent.postMessage(Object.assign({ search: 1, type: type }, extra || {}), '*'); } catch (e) {} }
  window.SearchBridge = { test: test, place: place,
    save: function (p) { post('save', { save: p }); },
    badge: function (id) { post('badge', { id: id }); },
    done: function (why) { post('done', { why: why || 'end' }); } };
})();
