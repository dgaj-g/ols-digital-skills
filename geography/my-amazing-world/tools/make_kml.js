/* tools/make_kml.js — writes teacher/expeditions.kml (one placemark per Expedition, in leg order) from data.js.
   usage: node tools/make_kml.js   (run again whenever an Expedition changes) */
var fs = require('fs'), path = require('path');
var HERE = path.join(__dirname, '..');
global.window = {}; require(path.join(HERE, 'data.js')); var D = window.MAW_DATA;
function x(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
var marks = D.legs.map(function (L) {
  var e = D.expeditions[L.id]; if (!e) return '';
  var alt = +(/,([\d.]+)d,/.exec(e.url) || [0, 20000])[1];
  return '    <Placemark>\n      <name>Leg ' + L.n + ' — ' + x(L.title) + '</name>\n' +
    '      <description>' + x(e.text + ' Question: ' + e.question + ' Answer: ' + e.answer + '.') + '</description>\n' +
    '      <LookAt><longitude>' + e.at[0] + '</longitude><latitude>' + e.at[1] + '</latitude><altitude>0</altitude><range>' + alt + '</range><tilt>0</tilt><heading>0</heading></LookAt>\n' +
    '      <Point><coordinates>' + e.at[0] + ',' + e.at[1] + ',0</coordinates></Point>\n    </Placemark>';
}).filter(Boolean);
var kml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>My Amazing World — Expedition stops</name>\n' + marks.join('\n') + '\n  </Document>\n</kml>\n';
fs.writeFileSync(path.join(HERE, 'teacher/expeditions.kml'), kml);
console.log('expeditions.kml: ' + marks.length + ' placemarks');
