/* G4 — the map data. Layers present and complete; every place in data.js sits where it should.
   (The 10° no-dead-spot grid lives in G1, judge.test.js.) Control: drop a county from data/ireland.topo.json → fails.
   Run: node tests/data.test.js */
var fs = require('fs'), path = require('path');
var HERE = path.join(__dirname, '..');
var d3 = require(path.join(HERE, 'assets/vendor/d3.v7.min.js')), topojson = require(path.join(HERE, 'assets/vendor/topojson-client.min.js'));
global.window = {}; require(path.join(HERE, 'data.js')); var D = window.MAW_DATA;
function T(f) { return JSON.parse(fs.readFileSync(path.join(HERE, 'data', f))); }
function F(t, k) { return topojson.feature(t, t.objects[k]).features; }
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('FAIL ' + m); } }
function names(fs_) { return fs_.map(function (f) { return f.properties.name; }); }
function inside(feats, p) { return feats.some(function (f) { return d3.geoContains(f, p); }); }

var W = T('world.topo.json');
['land', 'continents', 'oceans', 'countries'].forEach(function (k) { ok(W.objects[k], 'world.topo.json has no ' + k + ' layer'); });
var oceanNames = names(F(W, 'oceans')).filter(function (n) { return / Ocean$/.test(n); });
ok(oceanNames.length === 5, 'world: ' + oceanNames.length + ' oceans, want 5');
D.oceans.forEach(function (o) { ok(oceanNames.indexOf(o.name) >= 0, 'world: no ocean ' + o.name); });
ok(F(W, 'continents').length === 8, 'world: ' + F(W, 'continents').length + ' continents, want 8 (Russia split into Europe and Asia)');

var E = T('europe.topo.json'), EF = F(E, 'europe'), EN = names(EF);
D.europe.countries.forEach(function (c) { ok(EN.indexOf(c.name) >= 0, 'europe: no country ' + c.name); });
D.europe.capitals.forEach(function (c) {
  var f = EF.filter(function (x) { return x.properties.name === c.country; });
  ok(f.length && d3.geoContains(f[0], c.at), 'europe: ' + c.name + ' is not inside ' + c.country);
});

var I = T('ireland.topo.json');
['counties', 'provinces', 'countries', 'loughs', 'rivers'].forEach(function (k) { ok(I.objects[k], 'ireland.topo.json has no ' + k + ' layer'); });
var C = F(I, 'counties'), P = F(I, 'provinces'), N = F(I, 'countries');
ok(C.length === 32, 'ireland: ' + C.length + ' counties, want 32');
ok(C.filter(function (f) { return f.properties.country === 'Northern Ireland'; }).length === 6, 'ireland: NI counties not 6');
ok(P.length === 4, 'ireland: ' + P.length + ' provinces, want 4');
D.ireland.provinces.forEach(function (p) {
  var f = P.filter(function (x) { return x.properties.name === p.name; });
  ok(f.length && d3.geoContains(f[0], p.anchor), 'ireland: province tile anchor for ' + p.name + ' is outside it');
});
D.ni.counties.forEach(function (n) { ok(names(C).indexOf(n) >= 0, 'ireland: no county ' + n); });
var NI = N.filter(function (f) { return f.properties.name === 'Northern Ireland'; });
ok(NI.length === 1, 'ireland: no Northern Ireland outline');
D.ni.hills.concat(D.ni.settlements).forEach(function (x) { ok(inside(NI, x.at), 'ni: ' + x.name + ' is outside Northern Ireland'); });
ok(inside(NI, D.ni.causeway.at), "ni: the Giant's Causeway dot is off the land");
D.ni.loughs.forEach(function (n) { ok(names(F(I, 'loughs')).indexOf(n) >= 0, 'ireland: no lough ' + n); });
D.ireland.rivers.forEach(function (r) { ok(names(F(I, 'rivers')).indexOf(r.name || r) >= 0, 'ireland: no river ' + (r.name || r)); });
D.ireland.cities.concat(D.ireland.capitals, D.ireland.hills).forEach(function (x) { ok(inside(C, x.at), 'ireland: ' + x.name + ' is off the island'); });
var kerry = C.filter(function (f) { return f.properties.name === 'Kerry'; })[0];
ok(kerry && d3.geoContains(kerry, D.ireland.hills[0].at), 'ireland: Carrauntoohil is not in Kerry');

/* Leg 6 photos: three, real files, credited, hotspots inside the picture */
var ph = D.types.photos || [];
ok(ph.length === 3, 'types: ' + ph.length + ' photos, want 3');
var credits = fs.existsSync(path.join(HERE, 'assets/photos/CREDITS.md')) ? fs.readFileSync(path.join(HERE, 'assets/photos/CREDITS.md'), 'utf8') : '';
ph.forEach(function (p) {
  ok(fs.existsSync(path.join(HERE, p.src)), 'types: photo file missing ' + p.src);
  ok(!/\.svg$/i.test(p.src), 'types: ' + p.src + ' is a drawing, not a photograph');
  ok(credits.indexOf(path.basename(p.src)) >= 0, 'types: ' + p.src + ' not in CREDITS.md');
  ok(p.hot && p.hot.length >= 3 && p.w && p.h && p.hot.every(function (q) { return q[0] >= 0 && q[1] >= 0 && q[0] <= p.w && q[1] <= p.h; }), 'types: hotspot for ' + p.src + ' is not inside the photo');
});
/* Every leg has an expedition */
D.legs.forEach(function (L) { var x = D.expeditions[L.id]; ok(x && x.options.indexOf(x.answer) >= 0 && /^https:\/\//.test(x.url), 'expedition for ' + L.id + ' broken'); });
ok(D.legs.reduce(function (a, L) { return a + L.max; }, 0) === 232, 'leg maxima do not total 232');
console.log('data: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
