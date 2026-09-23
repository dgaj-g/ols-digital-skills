/* G3 — pupil words. Every pupil-facing sentence lives in strings.js; none in the HTML, script.js or engine.js.
   No "Oceania"; no taglines or slogans; British spellings; every task line names the act first (starts with a verb).
   Control: add "Learn geography the fun way!" to strings.js → this test fails. Run: node tests/strings.test.js */
var fs = require('fs'), path = require('path');
var HERE = path.join(__dirname, '..');
function R(f) { return fs.readFileSync(path.join(HERE, f), 'utf8'); }
global.window = {}; require(path.join(HERE, 'data.js')); require(path.join(HERE, 'strings.js'));
var S = window.MAW_STRINGS, D = window.MAW_DATA;
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('FAIL ' + m); } }
function stripComments(src) { return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1'); }

/* 1. Collect every string strings.js can produce (functions called with sample arguments). */
var all = [];
function walk(o, key) {
  if (typeof o === 'string') all.push({ key: key, s: o });
  else if (typeof o === 'function') {
    var samples = [['France', 'Paris', 3], [3, 17], ['Belfast', 'Northern Ireland'], [2], [0], [1], [123, 5420, 3], ['land']];
    samples.forEach(function (a) { try { var r = o.apply(null, a); if (typeof r === 'string') all.push({ key: key, s: r }); } catch (e) {} });
  } else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { walk(o[k], key ? key + '.' + k : k); });
}
walk(S, '');
ok(all.length > 150, 'strings.js yields only ' + all.length + ' strings');
var TXT = all.map(function (x) { return x.s; }).join('\n');

/* 2. Forbidden words. */
ok(!/Oceania/.test(TXT), 'a pupil string says "Oceania" (the booklet says Australia)');
var SLOGANS = [/\bfun\b/i, /\blearn(ing)?\b/i, /\bexcit/i, /adventure awaits/i, /let'?s go/i, /\bawesome\b/i, /\bjourney\b/i, /\bunlock\b/i, /\bskills?\b/i, /\bdiscover\b/i];
all.forEach(function (x) { SLOGANS.forEach(function (re) { ok(!re.test(x.s), 'tagline word ' + re + ' in ' + x.key + ': "' + x.s + '"'); }); });
var US = /\b(color|colors|center|centered|favorite|meters?|kilometers?|gray|organize|organized|recognize|realize|practice\b(?= your)|traveling|traveled|neighbor|program(?!me))\b/i;
all.forEach(function (x) { ok(!US.test(x.s), 'American spelling in ' + x.key + ': "' + x.s + '"'); });

/* 3. Task lines name the act first. */
var VERBS = /^(Tap|Drop|Drag|Choose|Measure|Sort|Find|Spin|Press|Place|Read|Zoom|Look|Open|Paste|Copy|Select|Print)\b/;
all.filter(function (x) { return /^tasks\.(?!.*(Done|done|Wrong|back|shown|Kicker|part|Part|zones|tray|placeAll|photoRight|photoWrong|photoAlt|photoFact|photoSub|photoTask|credit|clueLabel|clueCost|mysteryResult|rulerHint|rulerLive|rulerNone|rulerResult|rulerOption|tilesBack|tilesShown))/.test(x.key); })
  .forEach(function (x) { ok(VERBS.test(x.s), 'task line does not start with a verb: ' + x.key + ': "' + x.s + '"'); });
Object.keys(S.brief).forEach(function (k) { ok(S.brief[k].length < 330, 'briefing ' + k + ' is over 330 characters'); });
D.legs.forEach(function (L) { ok(S.brief[L.id], 'no briefing for leg ' + L.id); });

/* 4. No English outside strings.js. */
var html = R('index.html').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
var text = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
text = text.replace(/My Amazing World|OLS Digital Skills|[·\s]/g, '');
ok(text === '', 'index.html has words outside strings.js: "' + text.slice(0, 120) + '"');
var attrs = (R('index.html').match(/\b(aria-label|title|alt|placeholder)="[^"]*[A-Za-z]{3,}[^"]*"/g) || []);
ok(attrs.length === 0, 'index.html has English in attributes: ' + attrs.join(' | '));
['script.js', 'engine.js'].forEach(function (f) {
  var src = stripComments(R(f));
  var lits = src.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g) || [];
  lits.forEach(function (l) {
    var v = l.slice(1, -1);
    if (/^[A-Z][a-z]+(\s+[a-z']+){2,}/.test(v) && !/px|rgba|sans|serif|\{/.test(v)) ok(false, f + ' has a pupil sentence in code: ' + l);
  });
  pass++;
});
console.log('strings: ' + pass + ' passed, ' + fail + ' failed (' + all.length + ' strings)');
process.exit(fail ? 1 : 0);
