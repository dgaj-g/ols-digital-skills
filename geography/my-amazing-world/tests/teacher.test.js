/* tests/teacher.test.js — A12. Needs the dev server on :8098 (python3 -m http.server 8098 from the repo root).
   Controls: a wrong passcode must reveal nothing; a token with one digit changed must show red, not a score. */
var puppeteer = require(process.env.PUPPETEER || '/Users/damiengartland/.npm-global/lib/node_modules/puppeteer');
var path = require('path');
var J = require(path.join(__dirname, '../judge.js'));
global.window = {}; require(path.join(__dirname, '../data.js')); var D = window.MAW_DATA;
var URL = 'http://localhost:8098/geography/my-amazing-world/teacher/';
var pass = 0, fail = 0; function ok(c, m) { if (c) pass++; else { fail++; console.log('FAIL ' + m); } }
var A = J.scoreToken('Aoife', [17, 16, 30, 50, 40, 20, 25]), B = J.scoreToken('Niamh', [10, 12, null, null, null, null, null]);
var bad = A.replace('-H.', '-G.');   /* leg 1 points 17 → 16: the check no longer matches */
ok(J.verifyToken(A, D.legs.map(function (l) { return l.max; })).ok && !J.verifyToken(bad).ok, 'judge: control token not invalid');
(async function () {
  var b = await puppeteer.launch({ headless: 'shell' }), p = await b.newPage();
  var errs = []; p.on('pageerror', function (e) { errs.push(e.message); });
  await p.goto(URL, { waitUntil: 'load' });
  var shown = function () { return p.evaluate(function () { return { main: !document.getElementById('t-main').hidden, key: document.getElementById('key').textContent.length }; }); };
  await p.type('#pass', 'world25'); await p.click('#gate-form button');
  var s = await shown(); ok(!s.main && s.key === 0, 'CONTROL: wrong passcode revealed the page');
  if (!s.main) { await p.$eval('#pass', function (e) { e.value = ''; }); await p.type('#pass', 'world26'); await p.click('#gate-form button'); }
  s = await shown(); ok(s.main && s.key > 500, 'right passcode did not open the page / answer key empty');
  await p.type('#paste', B + '\n' + bad + '\n' + A);
  await p.click('#read');
  var t = await p.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll('#results tbody tr'), function (r) { return { bad: r.classList.contains('bad'), cells: Array.prototype.map.call(r.cells, function (c) { return c.textContent; }) }; });
  });
  ok(t.length === 3, 'want 3 rows, got ' + t.length);
  ok(t[0] && t[0].cells[0] === 'Aoife' && t[0].cells[1] === '198', 'top row should be Aoife 198: ' + JSON.stringify(t[0]));
  ok(t[1] && t[1].cells[0] === 'Niamh' && t[1].cells[1] === '22', 'second row should be Niamh 22');
  ok(t[2] && t[2].bad && !/\d{2,3}\s*$/.test(t[2].cells[0].replace(bad, '')), 'CONTROL: altered token not shown red');
  var csvOn = await p.$eval('#csv', function (e) { return !e.disabled; }); ok(csvOn, 'CSV button disabled');
  var csv = await p.evaluate(function () {
    var out = null, orig = URL.createObjectURL; URL.createObjectURL = function (blob) { out = blob; return 'blob:x'; };
    document.getElementById('csv').click(); URL.createObjectURL = orig; return out.text();
  });
  var lines = csv.replace(/^﻿/, '').trim().split(/\r\n/);
  ok(lines[0] === 'name,total,rank,leg1,leg2,leg3,leg4,leg5,leg6,leg7', 'CSV header: ' + lines[0]);
  ok(lines.length === 3 && /^Aoife,198,/.test(lines[1]) && /^Niamh,22,.*,10,12,,,,,$/.test(lines[2]), 'CSV rows: ' + JSON.stringify(lines));
  var geo = await p.$eval('#geoguessr', function (a) { return a.href; }); ok(geo === D.geoguessr, 'GeoGuessr link');
  var kml = await p.evaluate(async function () { var r = await fetch('expeditions.kml'); return r.ok ? (await r.text()).split('<Placemark>').length - 1 : -1; });
  ok(kml === 7, 'KML placemarks: ' + kml);
  ok(!errs.length, 'page errors: ' + errs.join(' | '));
  await b.close();
  console.log('teacher: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
