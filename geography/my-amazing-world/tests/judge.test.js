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
var ranks = [{ min: 0, name: 'A' }, { min: 0.5, name: 'B' }, { min: 0.9, name: 'C' }];
t('rank by share', J.rank(9, 10, ranks).name === 'C' && J.rank(5, 10, ranks).name === 'B' && J.rank(0, 0, ranks).name === 'A');

/* --- score token (SPEC S11): MAW-NAME-legs-check --- */
global.window = {}; require('../data.js'); var DATA = window.MAW_DATA; var MAX = DATA.legs.map(function (l) { return l.max; });
var full = J.scoreToken('Aoife', [17, 16, 37, 66, 44, 22, 30]);
var part = J.scoreToken("Síofra O'Neill-Byrne", [12, 9, null, null, null, null, null]);
t('token shape MAW-AOIFE-H.G.11.1U.18.M.U-xxxxx', /^MAW-AOIFE-H\.G\.11\.1U\.18\.M\.U-[0-9A-Z]{5}$/.test(full), full);
t('token verifies: name, legs, total 232, 7 done', (function () { var v = J.verifyToken(full, MAX); return v.ok && v.name === 'AOIFE' && v.total === 232 && v.done === 7; })(), J.verifyToken(full, MAX));
t('token name: A–Z only, max 12', J.tokenName("Síofra O'Neill-Byrne") === 'SOFRAONEILLB', J.tokenName("Síofra O'Neill-Byrne"));
t('mid-race token shows - for unstamped legs', /-C\.9\.-\.-\.-\.-\.--/.test(part) && J.verifyToken(part, MAX).done === 2, part);
t('token verifies with spaces and lower case', J.verifyToken('  ' + full.toLowerCase() + ' ', MAX).ok);
t('CONTROL: token with points altered is invalid', J.verifyToken(full.replace('.18.', '.17.'), MAX).ok === false);
t('CONTROL: token with the name altered is invalid', J.verifyToken(full.replace('AOIFE', 'CIARA'), MAX).ok === false);
t('CONTROL: token with the check missing is invalid', J.verifyToken(full.slice(0, -6), MAX).ok === false);
t('CONTROL: a leg over its max is invalid even with a good check', (function () {
  var forged = J.scoreToken('Aoife', [18, 16, 37, 66, 44, 22, 30]); return J.verifyToken(forged, MAX).ok === false; })());
t('CONTROL: mid-race token must NOT show 0 for an unstamped leg', !/\.0\./.test(part) && J.verifyToken(part, MAX).legs[2] === null, part);

/* --- Leg 2 continents: drop judged by continentAt --- */
function cont(p) { var c = J.continentAt(layers, p); return c ? c.name : null; }
t('drop in Brazil → South America', cont([-50, -10]) === 'South America');
t('drop on Madagascar (island) → Africa', cont([46.8, -19]) === 'Africa', cont([46.8, -19]));
t('drop west of the Urals → Europe; east → Asia', cont([45, 55]) === 'Europe' && cont([80, 60]) === 'Asia');
t('CONTROL: a drop in the sea does not snap', cont([-30, 30]) === null);
t('CONTROL: Greenland does NOT accept Europe', cont([-42, 72]) !== 'Europe');
var pl = J.judgePlacement({ Africa: 'Africa', Europe: 'Asia', Asia: 'Europe' }, 1, 2);
t('placement: right tiles 2 pts on the first check', pl.points === 2 && pl.right.length === 1 && pl.wrong.length === 2, pl);
t('placement: second check 1 pt each', J.judgePlacement({ Europe: 'Europe' }, 2, 2).points === 1);
t('CONTROL: a tile on the wrong continent scores 0', J.judgePlacement({ Europe: 'Asia' }, 1, 2).points === 0);

/* --- Leg 3 Europe: country taps by name --- */
var eTopo = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/europe.topo.json'), 'utf8'));
var europe = topojson.feature(eTopo, eTopo.objects.europe).features;
function isName(n) { return function (f) { return f.properties.name === n; }; }
DATA.europe.countries.forEach(function (c) { t('Europe data has ' + c.name, europe.some(isName(c.name))); });
t('tap Paris → France, 2 pts', (function () { var x = J.judgeRegionTap(europe, isName('France'), [2.35, 48.86], 1); return x.correct && x.points === 2; })());
t('tap Oslo (Norway, NE ISO -99) → Norway', J.judgeRegionTap(europe, isName('Norway'), [10.75, 59.91], 1).correct);
t('second tap 1 pt, reveal tap 0', J.judgeRegionTap(europe, isName('France'), [2.35, 48.86], 2).points === 1 && J.judgeRegionTap(europe, isName('France'), [2.35, 48.86], 3).points === 0);
var cu = J.judgeRegionTap(europe, isName('Poland'), [30.5, 50.45], 1);
t('CONTROL: a tap on Ukraine for Poland does NOT score and names Ukraine', !cu.correct && cu.points === 0 && cu.hit.properties.name === 'Ukraine', cu.hit && cu.hit.properties.name);
t('CONTROL: third miss flags the reveal', J.judgeRegionTap(europe, isName('Poland'), [30.5, 50.45], 3).reveal);
var paris = [2.352, 48.857];
t('capital pin 50 km off = 3', J.judgePin(paris, [2.9, 49.2], J.CAPITAL_BANDS).points === 3);
t('capital pin 250 km off = 2', J.judgePin(paris, [5.2, 49.5], J.CAPITAL_BANDS).points === 2);
t('CONTROL: a pin 350 km from Paris does NOT get 3', (function () { var x = J.judgePin(paris, [2.35, 52.0], J.CAPITAL_BANDS); return x.km > 330 && x.km < 370 && x.points === 1; })(), J.judgePin(paris, [2.35, 52.0], J.CAPITAL_BANDS));

/* --- Legs 4 + 5: Northern Ireland and Ireland --- */
var iTopo = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ireland.topo.json'), 'utf8'));
var IRL = {};
Object.keys(iTopo.objects).forEach(function (k) { IRL[k] = topojson.feature(iTopo, iTopo.objects[k]).features; });
function byName(list, n) { for (var i = 0; i < list.length; i++) if (list[i].properties.name === n) return list[i]; return null; }
var ni = DATA.ni;
var niCands = ni.hills.map(function (h) { return { name: h.name, at: h.at, r: h.r }; })
  .concat(ni.rivers.map(function (n) { return { name: n, feature: byName(IRL.rivers, n), r: 6 }; }))
  .concat(ni.loughs.map(function (n) { return { name: n, feature: byName(IRL.loughs, n), r: 1.5 }; }));
var niDots = niCands.concat(ni.settlements.concat(ni.decoys).map(function (s) { return { name: s.name, at: s.at, r: 8 }; }));
t('county tap Enniskillen → Fermanagh', J.judgeRegionTap(IRL.counties, isName('Fermanagh'), [-7.639, 54.344], 1).correct);
t('county tap Armagh city → Armagh', J.judgeRegionTap(IRL.counties, isName('Armagh'), [-6.655, 54.35], 1).correct);
var ct = J.judgeRegionTap(IRL.counties, isName('Armagh'), [-7.3, 54.6], 1);
t('CONTROL: a tap on Tyrone for Armagh does NOT score', !ct.correct && ct.hit.properties.name === 'Tyrone', ct.hit && ct.hit.properties.name);
t('tap on Lough Neagh → Lough Neagh', J.judgeFeatureTap(niCands, 'Lough Neagh', [-6.45, 54.6], 1).correct);
var cl = J.judgeFeatureTap(niCands, 'Lower Lough Erne', [-6.45, 54.6], 1);
t('CONTROL: a Lough Neagh tap for Lower Lough Erne does NOT score', !cl.correct && cl.hit && cl.hit.name === 'Lough Neagh', cl.hit);
var bann = byName(IRL.rivers, 'River Bann');
t('River Bann is in the data', !!bann);
t('Bann: tap at Coleraine (on the river) hits', J.judgeFeatureTap(niCands, 'River Bann', [-6.664, 55.13], 1).correct, J.distToLineKm(bann.geometry, [-6.664, 55.13]));
var far15 = [-6.664 + 15 / (111.32 * Math.cos(55.13 * Math.PI / 180)), 55.13];
t('CONTROL: a tap 15 km from the Bann does NOT score', !J.judgeFeatureTap(niCands, 'River Bann', far15, 1).correct, J.distToLineKm(bann.geometry, far15));
t('Mournes: a tap on Slieve Donard hits', J.judgeFeatureTap(niDots, 'Mourne Mountains', [-5.93, 54.19], 1).correct);
var cn = J.judgeFeatureTap(niDots, 'Slieve Gullion', [-6.340, 54.176], 1);
t('CONTROL: a tap on the Newry dot does NOT count for Slieve Gullion (nearest wins)', !cn.correct && cn.hit.name === 'Newry', cn.hit);
t('Belfast dot hit', J.judgeFeatureTap(niDots, 'Belfast', [-5.94, 54.6], 1).correct);
t('sea west of Donegal = Atlantic', J.seaAt(IRL.counties, [-8.9, 55.0]).name === 'Atlantic Ocean');
t('sea north of Ballycastle = Atlantic', J.seaAt(IRL.counties, [-6.3, 55.35]).name === 'Atlantic Ocean');
t('CONTROL: the sea off Belfast Lough is the Irish Sea, not the Atlantic', J.seaAt(IRL.counties, [-5.5, 54.6]).name === 'Irish Sea');
t('CONTROL: land is not sea', J.seaAt(IRL.counties, [-6.6, 54.6]).kind === 'land');
var nic = function (f) { return f.properties.name === 'Northern Ireland'; };
t('tap Belfast → Northern Ireland', J.judgeRegionTap(IRL.countries, nic, [-5.93, 54.597], 1).correct);
t('CONTROL: tap Dublin for Northern Ireland does NOT score', !J.judgeRegionTap(IRL.countries, nic, [-6.26, 53.35], 1).correct);
var dublin = DATA.ireland.capitals[1].at, belfast = DATA.ireland.capitals[0].at;
t('Dublin pin 20 km off = 3', J.judgePin(dublin, [-6.3, 53.53], J.IRELAND_BANDS).points === 3);
t('CONTROL: a Dublin pin dropped on Belfast does NOT score', J.judgePin(dublin, belfast, J.IRELAND_BANDS).points === 0, J.judgePin(dublin, belfast, J.IRELAND_BANDS));
function prov(p) { var f = J.regionAt(IRL.provinces, p); return f ? f.properties.name : null; }
DATA.ireland.provinces.forEach(function (p) { t('province anchor inside ' + p.name, prov(p.anchor) === p.name, prov(p.anchor)); });
t('CONTROL: an Ulster tile on Connacht does NOT score', J.judgePlacement({ Ulster: prov([-9.0, 53.7]) }, 1, 2).points === 0);
var munster = function (f) { return f.properties.province === 'Munster'; };
t('any Munster county answers "a county in Munster"', J.judgeRegionTap(IRL.counties, munster, [-8.47, 51.9], 1).correct && J.judgeRegionTap(IRL.counties, munster, [-9.0, 52.8], 1).correct);
t('CONTROL: a Leinster county is not in Munster', !J.judgeRegionTap(IRL.counties, munster, [-6.26, 53.35], 1).correct);
var irlCands = DATA.ireland.hills.map(function (h) { return { name: h.name, at: h.at, r: h.r }; })
  .concat(DATA.ireland.rivers.map(function (n) { return { name: n, feature: byName(IRL.rivers, n), r: 6 }; }));
t('Carrauntoohil symbol hit', J.judgeFeatureTap(irlCands, 'Carrauntoohil', [-9.74, 52.0], 1).correct);
t('Carrauntoohil is in Kerry', J.regionAt(IRL.counties, DATA.ireland.hills[0].at).properties.name === 'Kerry');
t('Shannon at Athlone hits', J.judgeFeatureTap(irlCands, 'River Shannon', [-7.94, 53.42], 1).correct, J.distToLineKm(byName(IRL.rivers, 'River Shannon').geometry, [-7.94, 53.42]));
t("Giant's Causeway is in Antrim", J.regionAt(IRL.counties, DATA.ni.causeway.at) && J.regionAt(IRL.counties, DATA.ni.causeway.at).properties.name === 'Antrim');

/* --- Leg 6 types --- */
var W = DATA.types.words;
function sortPts(word, zone) { var p = {}; p[word] = zone; return J.judgeSort(W, p).points; }
t('volcano in Physical = 1', sortPts('volcano', 'Physical') === 1);
t('flooding accepted in Physical or Environmental', sortPts('flooding', 'Physical') === 1 && sortPts('flooding', 'Environmental') === 1);
t('climate accepted in Environmental or Physical', sortPts('climate', 'Environmental') === 1 && sortPts('climate', 'Physical') === 1);
t('CONTROL: city in Physical does NOT score', sortPts('city', 'Physical') === 0);
t('CONTROL: flooding in Human does NOT score', sortPts('flooding', 'Human') === 0);
var sq = [[10, 10], [110, 10], [110, 110], [10, 110]];
t('hotspot inside = 2', J.judgeHotspot(sq, [50, 50]).points === 2);
t('CONTROL: a tap outside the hotspot does NOT score', J.judgeHotspot(sq, [150, 50]).points === 0);

/* --- Leg 7 mysteries + ruler --- */
var ev = DATA.mysteries[2].at;
t('mystery: pin on target with 1 clue = 5', J.judgeMystery(ev, ev, 1).points === 5);
t('mystery: 3 clues costs 2', J.judgeMystery(ev, ev, 3).points === 3);
t('CONTROL: a pin 600 km off does NOT get 5', J.judgeMystery(ev, [86.925, 33.4], 1).points === 3, J.judgeMystery(ev, [86.925, 33.4], 1));
t('mystery floor is 0', J.judgeMystery(ev, [106, 30], 3).points === 0);
t('ruler 5,420 true: 5,500 = 3', J.judgeRuler(5420, 5500).points === 3);
t('ruler 6,700 (+24 %) = 1', J.judgeRuler(5420, 6700).points === 1);
t('CONTROL: a ruler reading of 7,000 km does NOT score 3', J.judgeRuler(5420, 7000).points !== 3 && J.judgeRuler(5420, 7400).points === 0);
t('ruler true distance from data matches km()', Math.abs(J.km(DATA.ruler.from.at, DATA.ruler.to.at) - DATA.ruler.km) < 60, Math.round(J.km(DATA.ruler.from.at, DATA.ruler.to.at)));

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
