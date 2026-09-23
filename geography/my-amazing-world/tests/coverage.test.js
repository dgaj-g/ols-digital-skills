/* G2 — booklet coverage. Every item in tests/booklet_items.json must be in data.js, and script.js must run that data list in a leg.
   Control: delete "Fermanagh" from data.js ni.counties → this test fails. Run: node tests/coverage.test.js */
var fs = require('fs'), path = require('path');
var HERE = path.join(__dirname, '..');
global.window = {}; require(path.join(HERE, 'data.js')); var D = window.MAW_DATA;
var B = JSON.parse(fs.readFileSync(path.join(__dirname, 'booklet_items.json')));
var script = fs.readFileSync(path.join(HERE, 'script.js'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('FAIL ' + m); } }
function get(src) { return src.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, D); }
function valuesOf(list, field) {
  if (!Array.isArray(list)) list = [list];
  return list.map(function (x) {
    if (x == null) return '';
    if (typeof x !== 'object') return x;
    if (field) return x[field];
    return x.name != null ? x.name : x.word;
  });
}
B.groups.forEach(function (g) {
  var list = get(g.source);
  ok(list != null, g.source + ' missing from data.js');
  var vals = valuesOf(list || [], g.field);
  g.items.forEach(function (it) {
    var hit = g.field === 'fact' ? vals.some(function (v) { return String(v).indexOf(it) >= 0; }) : vals.indexOf(it) >= 0;
    ok(hit, g.leg + ': "' + it + '" not in data.js ' + g.source + (g.field ? '.' + g.field : ''));
  });
  /* asked: the leg's runner reads that list (D.<source>) */
  var re = new RegExp('D\\.' + g.source.replace(/\./g, '\\.') + '\\b');
  ok(re.test(script), g.leg + ': script.js never reads D.' + g.source + ' — the booklet items in it are never asked');
});
/* every leg in data.legs has a briefing and a leg runner */
D.legs.forEach(function (L) { var id = L.id;
  ok(new RegExp("['\"]" + id + "['\"]\\s*:\\s*run").test(script) || new RegExp('RUN\\.' + id + '\\b').test(script), 'leg ' + id + ' has no runner in script.js');
});
console.log('coverage: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
