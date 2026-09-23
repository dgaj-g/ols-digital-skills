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

  /* ---------- Map taps: regions (countries, counties, provinces) ---------- */
  /* The first feature under the finger, or null (sea). */
  function regionAt(features, p) {
    for (var i = 0; i < features.length; i++) if (d3.geoContains(features[i], p)) return features[i];
    return null;
  }
  /* Region taps (Europe countries, NI counties, Ireland): 2 / 1 points for taps 1 / 2; the third miss reveals; the reveal tap scores 0.
     isTarget(feature) says whether a feature answers the task (one county, or any county in Munster). */
  var REGION_POINTS = [0, 2, 1, 0];
  function judgeRegionTap(features, isTarget, p, attempt) {
    var hit = regionAt(features, p);
    var correct = !!hit && isTarget(hit);
    return { correct: correct, hit: hit, points: correct ? (REGION_POINTS[attempt] || 0) : 0, reveal: !correct && attempt >= 3 };
  }

  /* ---------- Map taps: features (rivers, loughs, hills, settlement dots) ---------- */
  /* Shortest distance in km from p to a line or multi-line (checked against every segment, projected locally). */
  function distToLineKm(geom, p) {
    var lines = geom.type === 'LineString' ? [geom.coordinates] : geom.type === 'MultiLineString' ? geom.coordinates : [];
    var best = Infinity, cos = Math.cos(p[1] * Math.PI / 180), K = 111.32;
    lines.forEach(function (line) {
      for (var i = 0; i < line.length - 1; i++) {
        var ax = (line[i][0] - p[0]) * cos * K, ay = (line[i][1] - p[1]) * K, bx = (line[i + 1][0] - p[0]) * cos * K, by = (line[i + 1][1] - p[1]) * K;
        var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
        var d = Math.hypot(ax + t * dx, ay + t * dy); if (d < best) best = d;
      }
    });
    return best;
  }
  /* Distance in km from p to a symbol: a point {at}, a line feature or a polygon feature (0 inside). */
  function featureDist(c, p) {
    if (c.at) return km(c.at, p);
    var g = c.feature.geometry;
    if (/Polygon/.test(g.type)) {
      if (d3.geoContains(c.feature, p)) return 0;
      var rings = g.type === 'Polygon' ? g.coordinates : [].concat.apply([], g.coordinates);
      return distToLineKm({ type: 'MultiLineString', coordinates: rings }, p);
    }
    return distToLineKm(g, p);
  }
  /* The nearest visible symbol within its own reach is what she hit (so a tap on the Newry dot never counts for Slieve Gullion, 9 km away).
     candidates: [{ name, at | feature, r (km) }]. */
  var FEATURE_POINTS = [0, 2, 1, 0];
  function judgeFeatureTap(candidates, targetName, p, attempt) {
    var hit = null, bestD = Infinity;
    candidates.forEach(function (c) { var d = featureDist(c, p); if (d <= c.r && d < bestD) { bestD = d; hit = c; } });
    var correct = !!hit && hit.name === targetName;
    return { correct: correct, hit: hit, km: hit ? Math.round(bestD) : null, points: correct ? (FEATURE_POINTS[attempt] || 0) : 0, reveal: !correct && attempt >= 3 };
  }

  /* Leg 4, question 10: the sea that borders the north and west coast is the Atlantic; the sea off the east coast is the Irish Sea.
     land = the island's county polygons. */
  function seaAt(land, p) {
    if (regionAt(land, p)) return { kind: 'land' };
    var atlantic = p[0] <= -7.0 || (p[1] >= 55.15 && p[0] <= -6.2);
    return { kind: 'sea', name: atlantic ? 'Atlantic Ocean' : 'Irish Sea' };
  }

  /* ---------- Pins ---------- */
  var CAPITAL_BANDS = [[100, 3], [300, 2], [600, 1]];
  var IRELAND_BANDS = [[30, 3], [80, 2], [120, 1]];  /* SPEC said 150; Belfast is 140 km from Dublin and A6 says that pin must NOT score */

  /* ---------- Drag tiles: place all, then check ---------- */
  /* placed: { tileName: regionName }. round 1 = 2 points each right, round 2 = 1. Wrong tiles go back; after round 2 they are shown at 0. */
  function judgePlacement(placed, round, perRight) {
    var out = { right: [], wrong: [], points: 0 }, each = round === 1 ? (perRight || 2) : Math.floor((perRight || 2) / 2);
    Object.keys(placed).forEach(function (t) { if (placed[t] === t) { out.right.push(t); out.points += each; } else out.wrong.push(t); });
    return out;
  }
  /* Leg 6 sort. words: [{word, zone, accept}]. placed: { word: zone }. 1 point each right, both rounds. */
  function sortOk(w, zone) { return zone === w.zone || (w.accept || []).indexOf(zone) >= 0; }
  function judgeSort(words, placed) {
    var out = { right: [], wrong: [], points: 0 };
    words.forEach(function (w) { if (!(w.word in placed)) return; if (sortOk(w, placed[w.word])) { out.right.push(w.word); out.points += 1; } else out.wrong.push(w.word); });
    return out;
  }

  /* Leg 6 photos: point [x, y] in the image's own pixels inside a hotspot polygon [[x, y], ...]. One try: 2 or 0. */
  function inPoly(poly, pt) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function judgeHotspot(poly, pt) { var ok = inPoly(poly, pt); return { correct: ok, points: ok ? 2 : 0 }; }

  /* Leg 7 mysteries: the pin band (5 … 1) minus one for each clue after the first. Never below 0. */
  function judgeMystery(target, pin, cluesUsed) {
    var r = judgePin(target, pin, PIN_BANDS);
    return { km: r.km, band: r.points, points: Math.max(0, r.points - Math.max(0, (cluesUsed || 1) - 1)) };
  }
  /* Leg 7 ruler: within 15 % of the true distance = 3 points, within 30 % = 1. */
  function judgeRuler(trueKm, measuredKm) {
    var off = Math.abs(measuredKm - trueKm) / trueKm;
    return { off: off, points: off <= 0.15 ? 3 : off <= 0.30 ? 1 : 0 };
  }

  /* ---------- Score token ---------- */
  /* MAW-<NAME>-<legs>-<check>. NAME: upper case A–Z only, max 12. legs: seven base-36 fields joined by '.', '-' for a leg not yet stamped.
     check: FNV-1a of NAME|legs in base 36, upper case, 5 characters. Time is not in the token. */
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function tokenName(name) { return String(name || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12) || 'EXPLORER'; }
  function tokenCheck(nm, legs) { return ('00000' + fnv(nm + '|' + legs).toString(36).toUpperCase()).slice(-5); }
  /* legPoints: seven entries, a number for a stamped leg, null for a leg not yet stamped. */
  function scoreToken(name, legPoints) {
    var nm = tokenName(name);
    var legs = legPoints.map(function (p) { return p === null || p === undefined ? '-' : Math.max(0, Math.round(p)).toString(36).toUpperCase(); }).join('.');
    return 'MAW-' + nm + '-' + legs + '-' + tokenCheck(nm, legs);
  }
  /* maxes: the seven leg maxima (from data.js). Returns { ok, name, legs: [n|null], total, done } or { ok: false, why }. */
  function verifyToken(token, maxes) {
    var t = String(token || '').trim().toUpperCase();
    var m = /^MAW-([A-Z]{1,12})-([0-9A-Z-]+(?:\.[0-9A-Z-]+){6})-([0-9A-Z]{5})$/.exec(t);
    if (!m) return { ok: false, why: 'shape' };
    if (tokenCheck(m[1], m[2]) !== m[3]) return { ok: false, why: 'check' };
    var legs = m[2].split('.').map(function (f) { return f === '-' ? null : /^[0-9A-Z]+$/.test(f) ? parseInt(f, 36) : NaN; });
    for (var i = 0; i < legs.length; i++) {
      if (legs[i] !== null && (isNaN(legs[i]) || (maxes && legs[i] > maxes[i]))) return { ok: false, why: 'range' };
    }
    var total = 0, done = 0; legs.forEach(function (p) { if (p !== null) { total += p; done++; } });
    return { ok: true, name: m[1], legs: legs, total: total, done: done };
  }

  return {
    km: km, identify: identify, continentAt: continentAt, waterAt: waterAt, nearestWater: nearestWater,
    continentLabel: continentLabel, oceanFeature: oceanFeature,
    judgeOceanTap: judgeOceanTap, judgeChoice: judgeChoice, judgePin: judgePin, PIN_BANDS: PIN_BANDS,
    rank: rank, fnv: fnv, tokenName: tokenName, scoreToken: scoreToken, verifyToken: verifyToken,
    regionAt: regionAt, judgeRegionTap: judgeRegionTap, distToLineKm: distToLineKm, featureDist: featureDist, judgeFeatureTap: judgeFeatureTap,
    seaAt: seaAt, CAPITAL_BANDS: CAPITAL_BANDS, IRELAND_BANDS: IRELAND_BANDS, judgePlacement: judgePlacement,
    sortOk: sortOk, judgeSort: judgeSort, inPoly: inPoly, judgeHotspot: judgeHotspot, judgeMystery: judgeMystery, judgeRuler: judgeRuler
  };
});
