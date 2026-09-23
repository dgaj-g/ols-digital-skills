/* tools/split_ireland.js — called by fetch_ireland.sh. Splits the Overpass GeoJSON into NI counties, loughs and rivers,
   adds ROI counties (26, merged from Natural Earth 10m), Upper Lough Erne and the Shannon, and tags each county with its province.
   usage: node split_ireland.js <osm.geojson> <NE dir> <out dir> */
var fs = require('fs'), path = require('path');
var osm = JSON.parse(fs.readFileSync(process.argv[2])), NE = process.argv[3], OUT = process.argv[4];
function R(f) { return JSON.parse(fs.readFileSync(path.join(NE, f))); }
function W(f, feats) { fs.writeFileSync(path.join(OUT, f), JSON.stringify({ type: 'FeatureCollection', features: feats })); }

var NI_REL = { 'relation/1119534': 'Antrim', 'relation/1119535': 'Armagh', 'relation/1119533': 'Down', 'relation/1118085': 'Fermanagh',
  'relation/1959598': 'Derry/Londonderry', 'relation/16303099': 'Derry/Londonderry', 'relation/1117773': 'Tyrone' };
var LOUGH_REL = { 'relation/1121118': 'Lough Neagh', 'relation/12552': 'Lower Lough Erne' };
var PROVINCE = {
  Ulster: ['Antrim', 'Armagh', 'Down', 'Fermanagh', 'Derry/Londonderry', 'Tyrone', 'Donegal', 'Cavan', 'Monaghan'],
  Munster: ['Cork', 'Kerry', 'Limerick', 'Clare', 'Tipperary', 'Waterford'],
  Leinster: ['Dublin', 'Wicklow', 'Wexford', 'Kilkenny', 'Carlow', 'Kildare', 'Meath', 'Louth', 'Laois', 'Offaly', 'Westmeath', 'Longford'],
  Connacht: ['Galway', 'Mayo', 'Sligo', 'Leitrim', 'Roscommon']
};
function provinceOf(n) { for (var p in PROVINCE) if (PROVINCE[p].indexOf(n) >= 0) return p; throw new Error('no province for ' + n); }
var ROI_NAME = { 'Dún Laoghaire–Rathdown': 'Dublin', 'Fingal': 'Dublin', 'South Dublin': 'Dublin', 'North Tipperary': 'Tipperary', 'South Tipperary': 'Tipperary', 'Laoighis': 'Laois' };

var ni = [], loughs = [], rivers = [];
osm.features.forEach(function (f) {
  var id = f.id || (f.properties && f.properties.id);
  if (NI_REL[id] && /Polygon/.test(f.geometry.type)) { var n = NI_REL[id]; ni.push({ type: 'Feature', properties: { name: n, province: 'Ulster', country: 'Northern Ireland' }, geometry: f.geometry }); }
  else if (LOUGH_REL[id] && /Polygon/.test(f.geometry.type)) loughs.push({ type: 'Feature', properties: { name: LOUGH_REL[id] }, geometry: f.geometry });
  else if (/^way\//.test(id) && /LineString/.test(f.geometry.type)) { var rn = f.properties.name || (f.properties.tags && f.properties.tags.name); rn = 'River ' + rn.replace(/^River /, '').replace(/^(Lower|Upper) /, ''); /* Upper and Lower Bann are both the River Bann */ rivers.push({ type: 'Feature', properties: { name: rn }, geometry: f.geometry }); }
});
var roi = R('ne_10m_admin_1_states_provinces.geojson').features.filter(function (f) { return f.properties.adm0_a3 === 'IRL'; }).map(function (f) {
  var n = ROI_NAME[f.properties.name] || f.properties.name;
  return { type: 'Feature', properties: { name: n, province: provinceOf(n), country: 'Republic of Ireland' }, geometry: f.geometry };
});
R('ne_10m_lakes.geojson').features.forEach(function (f) { if (f.properties.name === 'Upper Lough Erne') loughs.push({ type: 'Feature', properties: { name: 'Upper Lough Erne' }, geometry: f.geometry }); });
R('ne_10m_rivers_lake_centerlines.geojson').features.forEach(function (f) { if (f.properties.name === 'Shannon') rivers.push({ type: 'Feature', properties: { name: 'River Shannon' }, geometry: f.geometry }); });

var niNames = {}; ni.forEach(function (f) { niNames[f.properties.name] = 1; });
var roiNames = {}; roi.forEach(function (f) { roiNames[f.properties.name] = 1; });
console.log('NI counties', Object.keys(niNames).length, 'ROI counties', Object.keys(roiNames).length, 'loughs', loughs.map(function (f) { return f.properties.name; }).join(','), 'river ways', rivers.length);
if (Object.keys(niNames).length !== 6 || Object.keys(roiNames).length !== 26 || loughs.length < 3) { console.error('split_ireland: counts wrong'); process.exit(3); }
W('ni_counties.json', ni); W('roi_counties.json', roi); W('loughs.json', loughs); W('rivers.json', rivers);
