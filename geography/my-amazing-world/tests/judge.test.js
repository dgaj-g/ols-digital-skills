/* tests/judge.test.js — run: node tests/judge.test.js   (exit 1 on any failure)
   Checks the judging routines against the shipped world data. Includes CONTROLS THAT MUST FAIL:
   wrong taps that a broken judge would wave through. */
var path = require('path'), fs = require('fs');
var d3 = require('../assets/vendor/d3.v7.min.js');
var topojson = require('../assets/vendor/topojson-client.min.js');
var J = require('../judge.js');
var topo = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/world.topo.json'), 'utf8'));
var layers = {
  land: topojson.feature(topo, topo.objects.land).features,
  continents: topojson.feature(topo, topo.objects.continents).features,
  oceans: topojson.feature(topo, topo.objects.oceans).features
};
var pass = 0, fail = 0;
function t(name, cond, detail) { if (cond) { pass++; } else { fail++; console.log('FAIL  ' + name + (detail ? '  → ' + JSON.stringify(detail) : '')); } }
function id(p) { var h = J.identify(layers, p); return { kind: h.kind, name: h.name, snapped: !!h.snapped }; }

/* --- data present --- */
t('five oceans present', layers.oceans.filter(function (f) { return f.properties.kind === 'ocean'; }).length === 5);
t('eight continent polys (Russia separate)', layers.continents.length === 8);

/* --- identify: positives --- */
t('mid-Pacific → Pacific Ocean', id([-150, 0]).name === 'Pacific Ocean', id([-150, 0]));
t('west Pacific → Pacific Ocean', id([170, 20]).name === 'Pacific Ocean', id([170, 20]));
t('South Pacific (merged) → Pacific Ocean', id([-120, -40]).name === 'Pacific Ocean', id([-120, -40]));
t('North Atlantic → Atlantic Ocean', id([-30, 30]).name === 'Atlantic Ocean', id([-30, 30]));
t('South Atlantic (merged) → Atlantic Ocean', id([-20, -25]).name === 'Atlantic Ocean', id([-20, -25]));
t('Indian → Indian Ocean', id([80, -20]).name === 'Indian Ocean', id([80, -20]));
t('Southern → Southern Ocean', id([0, -63]).name === 'Southern Ocean', id([0, -63]));
t('Arctic → Arctic Ocean', id([0, 89]).name === 'Arctic Ocean', id([0, 89]));
t('Africa → land Africa', id([20, 5]).name === 'Africa', id([20, 5]));
t('Antarctica → land Antarctica', id([0, -85]).name === 'Antarctica', id([0, -85]));
t('Moscow → Europe (Russia west of 60E)', id([37.6, 55.7]).name === 'Europe', id([37.6, 55.7]));
t('Australia labelled Australia not Oceania', id([134, -25]).name === 'Australia', id([134, -25]));
t('French Guiana → South America', id([-53, 4]).name === 'South America', id([-53, 4]));
t('Greenland → North America', id([-42, 72]).name === 'North America', id([-42, 72]));
t('Ireland → Europe', id([-8, 53.5]).name === 'Europe', id([-8, 53.5]));
t('Mediterranean is a sea', id([15, 36]).kind === 'sea' && id([15, 36]).name === 'Mediterranean Sea', id([15, 36]));
t('Caribbean is a sea', id([-75, 15]).kind === 'sea', id([-75, 15]));
t('North Sea (unnamed at 110m) snaps to the Atlantic', id([3, 56]).name === 'Atlantic Ocean' && id([3, 56]).snapped, id([3, 56]));
t('Bering Sea snaps to the Pacific', id([-175, 58]).name === 'Pacific Ocean', id([-175, 58]));

/* --- Leg 1 judge --- */
var r = J.judgeOceanTap(layers, 'Pacific Ocean', [-150, 0], 1);
t('first-tap Pacific = correct, 3 pts', r.correct && r.points === 3 && !r.reveal, r);
t('second-tap = 2 pts', J.judgeOceanTap(layers, 'Pacific Ocean', [-150, 0], 2).points === 2);
t('third-tap = 1 pt', J.judgeOceanTap(layers, 'Pacific Ocean', [-150, 0], 3).points === 1);
t('reveal tap = 0 pts but correct', (function () { var x = J.judgeOceanTap(layers, 'Pacific Ocean', [-150, 0], 99); return x.correct && x.points === 0; })());
t('target feature returned for highlight', r.feature && r.feature.properties.name === 'Pacific Ocean');

/* --- CONTROLS THAT MUST FAIL --- */
var c1 = J.judgeOceanTap(layers, 'Atlantic Ocean', [15, 36], 1);
t('CONTROL: Mediterranean tap for Atlantic is WRONG', !c1.correct && c1.points === 0 && c1.hit.kind === 'sea', c1.hit);
var c2 = J.judgeOceanTap(layers, 'Indian Ocean', [-150, 0], 1);
t('CONTROL: Pacific tap for Indian is WRONG', !c2.correct && c2.hit.name === 'Pacific Ocean', c2.hit);
var c3 = J.judgeOceanTap(layers, 'Arctic Ocean', [20, 5], 1);
t('CONTROL: land tap for an ocean is WRONG and names the continent', !c3.correct && c3.hit.kind === 'land' && c3.hit.name === 'Africa', c3.hit);
t('CONTROL: Siberia is Asia, not Europe', id([100, 62]).name === 'Asia', id([100, 62]));
t('CONTROL: three wrong taps → reveal flag', J.judgeOceanTap(layers, 'Arctic Ocean', [20, 5], 3).reveal === true);
t('CONTROL: two wrong taps → no reveal yet', J.judgeOceanTap(layers, 'Arctic Ocean', [20, 5], 2).reveal === false);

/* --- choice, pin, token, rank --- */
t('choice right = 2 pts', J.judgeChoice('Pacific Ocean', 'Pacific Ocean', 2).points === 2);
t('CONTROL: choice wrong = 0 pts', J.judgeChoice('Pacific Ocean', 'Atlantic Ocean', 2).points === 0);
var lisbon = [-9.14, 38.72], ny = [-74.0, 40.71];
var d = J.km(lisbon, ny);
t('New York–Lisbon ≈ 5,400 km (booklet measure)', d > 5300 && d < 5500, Math.round(d));
t('pin within 100 km = 5 pts', J.judgePin(lisbon, [-9.9, 38.4], null).points === 5);
t('CONTROL: pin 600 km off ≠ full marks', (function () { var x = J.judgePin(lisbon, [-3.7, 40.4], null); return x.points === 3 && x.km > 450 && x.km < 550; })(), J.judgePin(lisbon, [-3.7, 40.4], null));
t('CONTROL: pin 4,000 km off = 0 pts', J.judgePin(lisbon, [-45, 40], null).points === 0);
var tok = J.scoreToken('Aoife', 42, 127);
t('token verifies for the right name', J.verifyToken('aoife ', tok).ok === true);
t('CONTROL: token fails with points altered', J.verifyToken('Aoife', tok.replace('-42-', '-99-')).ok === false);
t('CONTROL: token fails for another name', J.verifyToken('Ciara', tok).ok === false);
var ranks = [{ min: 0, name: 'A' }, { min: 0.5, name: 'B' }, { min: 0.9, name: 'C' }];
t('rank by share', J.rank(9, 10, ranks).name === 'C' && J.rank(5, 10, ranks).name === 'B' && J.rank(0, 0, ranks).name === 'A');

/* --- coverage: every 10° grid point resolves to land, ocean or sea (no dead spots on the globe) --- */
var none = 0, snapped = 0, total = 0, far = 0;
for (var lat = -85; lat <= 85; lat += 10) for (var lon = -175; lon <= 175; lon += 10) {
  total++; var h = J.identify(layers, [lon, lat]);
  if (h.kind === 'none') none++;
  if (h.snapped) { snapped++; if (h.snapKm > 2000) far++; }
}
t('coverage: no dead spots on a 10° grid', none === 0, { none: none, total: total });
t('coverage: snapped water is near a named body (<2000 km)', far === 0, { far: far, snapped: snapped });
console.log('judge tests: ' + pass + ' passed, ' + fail + ' failed  (grid ' + total + ' points, ' + snapped + ' snapped)');
process.exit(fail ? 1 : 0);
