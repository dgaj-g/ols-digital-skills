/* judge.js — My Amazing World: pure judging routines. No DOM, no state.
   Loaded in the browser (window.MAW_JUDGE) and in node (tests/judge.test.js).
   Every judgement a pupil's score depends on lives here, so it can be tested with controls that must fail. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./assets/vendor/d3.v7.min.js'));
  else root.MAW_JUDGE = factory(root.d3);
})(typeof self !== 'undefined' ? self : this, function (d3) {
  'use strict';
  var EARTH_KM = 6371;

  function km(a, b) { return d3.geoDistance(a, b) * EARTH_KM; }

  /* Russia is one polygon in the data; the booklet's rule is west of the Urals = Europe. Oceania is labelled Australia (teacher's word bank). */
  function continentLabel(name, p) {
    if (name === 'Russia') return p[0] < 60 ? 'Europe' : 'Asia';
    if (name === 'Oceania') return 'Australia';
    return name;
  }

  function continentAt(layers, p) {
    for (var i = 0; i < layers.continents.length; i++) {
      var f = layers.continents[i];
      if (d3.geoContains(f, p)) return { kind: 'land', name: continentLabel(f.properties.name, p), feature: f };
    }
    return null;
  }

  function waterAt(layers, p) {
    for (var i = 0; i < layers.oceans.length; i++) {
      var f = layers.oceans[i];
      if (d3.geoContains(f, p)) return { kind: f.properties.kind, name: f.properties.name, ocean: f.properties.ocean || null, feature: f };
    }
    return null;
  }

  /* Water the 110m marine polygons do not name (North Sea, Bering Sea ...) snaps to the nearest named water body by edge distance. */
  function nearestWater(layers, p) {
    var best = null, bestD = Infinity;
    layers.oceans.forEach(function (f) {
      var g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      polys.forEach(function (poly) {
        poly.forEach(function (ring) {
          for (var i = 0; i < ring.length; i++) {
            var d = d3.geoDistance(ring[i], p);
            if (d < bestD) { bestD = d; best = f; }
          }
        });
      });
    });
    if (!best) return null;
    return { kind: best.properties.kind, name: best.properties.name, ocean: best.properties.ocean || null, feature: best, snapped: true, snapKm: bestD * EARTH_KM };
  }

  /* What is under the finger: land (continent), a named ocean, a named sea, or unnamed water snapped to its neighbour. */
  function identify(layers, p) {
    var land = continentAt(layers, p);
    if (land) return land;
    var w = waterAt(layers, p);
    if (w) return w;
    var n = nearestWater(layers, p);
    return n || { kind: 'none', name: null };
  }

  function oceanFeature(layers, name) {
    for (var i = 0; i < layers.oceans.length; i++) if (layers.oceans[i].properties.name === name) return layers.oceans[i];
    return null;
  }

  /* Leg 1 — Ocean Sprint. attempt = 1 on the first tap for this ocean.
     3 / 2 / 1 points for taps 1 / 2 / 3. After three wrong taps the ocean is revealed; the reveal tap scores 0. */
  var OCEAN_POINTS = [0, 3, 2, 1];
  function judgeOceanTap(layers, targetName, p, attempt) {
    var hit = identify(layers, p);
    var correct = hit.kind === 'ocean' && hit.name === targetName;
    var points = correct ? (OCEAN_POINTS[attempt] || 0) : 0;
    var reveal = !correct && attempt >= 3;
    return { correct: correct, hit: hit, points: points, reveal: reveal, feature: oceanFeature(layers, targetName) };
  }

  /* Closed question on an Expedition card: one try, all or nothing. */
  function judgeChoice(correct, chosen, points) {
    var ok = chosen === correct;
    return { correct: ok, points: ok ? (points || 2) : 0 };
  }

  /* Pin drops (Europe, Ireland, Explorer Challenge): scored by great-circle distance in km. */
  var PIN_BANDS = [[150, 5], [400, 4], [800, 3], [1500, 2], [3000, 1]];
  function judgePin(target, pin, bands) {
    var d = km(target, pin), b = bands || PIN_BANDS;
    for (var i = 0; i < b.length; i++) if (d <= b[i][0]) return { km: Math.round(d), points: b[i][1] };
    return { km: Math.round(d), points: 0 };
  }

  /* Ranks by share of the points available so far (once earned, never lost). */
  function rank(points, maxPoints, ranks) {
    var share = maxPoints > 0 ? points / maxPoints : 0, out = ranks[0];
    for (var i = 0; i < ranks.length; i++) if (share >= ranks[i].min) out = ranks[i];
    return out;
  }

  /* Score token for a teacher-run leaderboard: MAW-<points>-<stampmask>-<check>. FNV-1a over name|points|mask. */
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function scoreToken(name, points, stampMask) {
    var base = String(name).trim().toLowerCase() + '|' + points + '|' + stampMask;
    return 'MAW-' + points + '-' + stampMask + '-' + fnv(base).toString(36).toUpperCase();
  }
  function verifyToken(name, token) {
    var m = /^MAW-(\d+)-(\d+)-([0-9A-Z]+)$/.exec(String(token).trim().toUpperCase());
    if (!m) return { ok: false };
    var expected = scoreToken(name, +m[1], +m[2]);
    return { ok: expected === String(token).trim().toUpperCase(), points: +m[1], stampMask: +m[2] };
  }

  return {
    km: km, identify: identify, continentAt: continentAt, waterAt: waterAt, nearestWater: nearestWater,
    continentLabel: continentLabel, oceanFeature: oceanFeature,
    judgeOceanTap: judgeOceanTap, judgeChoice: judgeChoice, judgePin: judgePin, PIN_BANDS: PIN_BANDS,
    rank: rank, scoreToken: scoreToken, verifyToken: verifyToken
  };
});
