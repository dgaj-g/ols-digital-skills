// tools/densify.js <geojson> <maxDeg>
// Inserts vertices so no polygon edge spans more than maxDeg in lon or lat (planar interpolation).
// Why: d3-geo draws every edge as a great circle. Natural Earth's ocean boxes have long edges along parallels
// (e.g. the Southern Ocean's north edge at 60.5°S); as great circles those bow towards the pole and open gaps.
var fs = require('fs');
var file = process.argv[2], max = +process.argv[3] || 1;
var g = JSON.parse(fs.readFileSync(file, 'utf8'));
function ring(r) {
  var out = [];
  for (var i = 0; i < r.length - 1; i++) {
    var a = r[i], b = r[i + 1]; out.push(a);
    var n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / max);
    for (var k = 1; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  out.push(r[r.length - 1]); return out;
}
function geom(ge) {
  if (!ge) return;
  if (ge.type === 'Polygon') ge.coordinates = ge.coordinates.map(ring);
  else if (ge.type === 'MultiPolygon') ge.coordinates = ge.coordinates.map(function (p) { return p.map(ring); });
}
(g.features || [g]).forEach(function (f) { geom(f.geometry || f); });
fs.writeFileSync(file, JSON.stringify(g));
