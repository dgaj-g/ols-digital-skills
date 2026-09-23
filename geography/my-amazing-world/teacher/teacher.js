/* teacher.js — My Amazing World teacher page. Passcode gate, score reader, CSV, answer key. Nothing leaves the browser. */
(function () {
  'use strict';
  /* To change the passcode: put the new one in J.fnv('...') in a browser console on this page and paste the number here. world26 → 2019089311. */
  var PASS_HASH = 2019089311;

  var D = window.MAW_DATA, S = window.MAW_STRINGS, J = window.MAW_JUDGE;
  var $ = function (id) { return document.getElementById(id); };
  var MAXES = D.legs.map(function (L) { return L.max; });
  var MAX = MAXES.reduce(function (a, b) { return a + b; }, 0);
  var rows = [];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nice(nm) { return nm.charAt(0) + nm.slice(1).toLowerCase(); }

  /* ---------- Gate ---------- */
  $('gate-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (J.fnv($('pass').value.trim()) === PASS_HASH) { $('t-gate').hidden = true; $('t-main').hidden = false; build(); }
    else { $('gate-error').textContent = 'That passcode is not right. Try again.'; $('pass').select(); }
  });

  /* ---------- Scores ---------- */
  function read() {
    rows = [];
    $('paste').value.split(/\r?\n/).forEach(function (line) {
      var raw = line.replace(/^["'\s]+|["'\s,;]+$/g, '');
      if (!raw) return;
      var m = raw.match(/MAW-[^\s,;"']+/i), v = m ? J.verifyToken(m[0], MAXES) : { ok: false };
      rows.push(v.ok ? { ok: true, name: nice(v.name), total: v.total, rank: J.rank(v.total, MAX, D.ranks).name, legs: v.legs, done: v.done } : { ok: false, raw: raw });
    });
    rows.sort(function (a, b) { return (b.ok ? b.total : -1) - (a.ok ? a.total : -1); });
    var good = rows.filter(function (r) { return r.ok; }).length, bad = rows.length - good;
    $('summary').textContent = rows.length ? good + (good === 1 ? ' score' : ' scores') + ' read' + (bad ? ', ' + bad + ' not valid (shown in red)' : '') + '. Sorted by total, highest first.' : 'Nothing to read — paste the scores into the box first.';
    var head = '<tr><th>Name</th><th>Total /' + MAX + '</th><th>Rank</th><th>Legs done</th>' + D.legs.map(function (L) { return '<th title="' + esc(L.title) + '">L' + L.n + ' /' + L.max + '</th>'; }).join('') + '</tr>';
    $('results').querySelector('thead').innerHTML = head;
    $('results').querySelector('tbody').innerHTML = rows.map(function (r) {
      if (!r.ok) return '<tr class="bad"><td colspan="' + (4 + D.legs.length) + '"><code>' + esc(r.raw.slice(0, 80)) + '</code> — not a valid score. Check it was copied whole.</td></tr>';
      return '<tr><td>' + esc(r.name) + '</td><td class="num"><strong>' + r.total + '</strong></td><td>' + esc(r.rank) + '</td><td><span class="boxes" aria-label="' + r.done + ' of 7 legs done">' +
        r.legs.map(function (p) { return '<i' + (p === null ? '' : ' class="on"') + '></i>'; }).join('') + '</span></td>' +
        r.legs.map(function (p) { return '<td class="num">' + (p === null ? '–' : p) + '</td>'; }).join('') + '</tr>';
    }).join('');
    $('results').hidden = !rows.length;
    $('csv').disabled = !good;
  }

  function csv() {
    var q = function (s) { s = String(s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var lines = [['name', 'total', 'rank'].concat(D.legs.map(function (L) { return 'leg' + L.n; })).join(',')];
    rows.filter(function (r) { return r.ok; }).forEach(function (r) {
      lines.push([q(r.name), r.total, q(r.rank)].concat(r.legs.map(function (p) { return p === null ? '' : p; })).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-amazing-world-scores.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Answer key (from data.js, so it cannot drift) ---------- */
  function names(list) { return list.map(function (x) { return typeof x === 'string' ? x : x.name; }); }
  function ul(items) { return '<ul>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  function exp(id) { var x = D.expeditions[id]; return x ? '<p><strong>Expedition:</strong> ' + esc(x.question) + ' → <strong>' + esc(x.answer) + '</strong> (' + x.points + ' points)</p>' : ''; }
  function keyHtml() {
    var h = [], L = {}; D.legs.forEach(function (l) { L[l.id] = l; });
    function leg(id, body) { h.push('<h3>Leg ' + L[id].n + ' — ' + esc(L[id].title) + ' (' + L[id].max + ' points)</h3>' + body + exp(id)); }
    leg('oceans', '<p>Tap each ocean on the globe:</p>' + ul(names(D.oceans)));
    leg('continents', '<p>Drag each name onto its continent:</p>' + ul(names(D.continents)) + '<p>' + esc(D.continentFacts) + '</p>');
    leg('europe', '<p>Countries to find:</p>' + ul(names(D.europe.countries)) + '<p>Capitals to pin:</p>' + ul(D.europe.capitals.map(function (c) { return c.name + ' — ' + c.country; })));
    leg('ni', '<p>Counties:</p>' + ul(D.ni.counties) + '<p>Map features to find:</p>' + ul(D.ni.features) +
      '<p>Questions:</p>' + ul(D.ni.questions.map(function (q) { return (q.answer || q.target) + ' — ' + q.fact; })));
    leg('ireland', '<p>Capitals:</p>' + ul(D.ireland.capitals.map(function (c) { return c.name + ' — capital of ' + c.of; })) +
      '<p>Provinces:</p>' + ul(names(D.ireland.provinces)) + '<p>Mountains:</p>' + ul(names(D.ireland.hills)) +
      '<p>Rivers:</p>' + ul(D.ireland.rivers) + '<p>Cities:</p>' + ul(names(D.ireland.cities)) +
      '<p>Counties on the island: <strong>' + esc(D.ireland.countQuestion.answer) + '</strong></p>');
    leg('types', '<p>Sorting (also accepted in brackets):</p>' + ul(D.types.words.map(function (w) { return w.word + ' — ' + w.zone + (w.accept ? ' (' + w.accept.join(', ') + ')' : ''); })) +
      '<p>Photos (one tap each, 2 points):</p>' + ul(D.types.photos.map(function (p) { return S.tasks.types.photoAsk[p.id] + ' — ' + S.tasks.types.photoFact[p.id]; })));
    leg('final', '<p>Mystery places (pin drop; fewer clues, more points):</p>' + ul(names(D.mysteries)) +
      '<p>Ruler: ' + esc(D.ruler.from.name) + ' to ' + esc(D.ruler.to.name) + ' ≈ <strong>' + D.ruler.km.toLocaleString('en-GB') + ' km</strong></p>');
    return h.join('');
  }

  function build() {
    $('geoguessr').href = D.geoguessr; $('geoguessr').textContent = D.geoguessr;
    $('key').innerHTML = keyHtml();
    $('read').addEventListener('click', read);
    $('csv').addEventListener('click', csv);
  }
})();
