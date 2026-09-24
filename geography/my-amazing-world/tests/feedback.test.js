/* G6 — the teacher's first-use report (issue 39, Sep 2026), held as regressions. Needs the dev server (see pixels.test.js).
   1 Loughs: with every county painted green, Lough Neagh and both Lough Ernes still show as water.
   2 Provinces: a finished provinces board says provinces, not continents.
   3 Undo: tapping a placed name sends it back to the tray.
   4 Quick drags: a fast drag never leaves a name stuck on the page; after the board, no name sits over the city map.
   Controls: MAW_URL at the published build before the fix fails 1 and 4 (stuck name, painted-over loughs). Run: node tests/feedback.test.js */
var puppeteer = require(process.env.PUPPETEER || '/Users/damiengartland/.npm-global/lib/node_modules/puppeteer');
var URL = (process.env.MAW_URL || 'http://localhost:8098/geography/my-amazing-world/') + '?nointro&test=1';
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('FAIL ' + m); } }
var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
(async function () {
  var browser = await puppeteer.launch({ headless: 'shell' });
  try {
    var p = await browser.newPage(); await p.setViewport({ width: 1280, height: 800 });
    var errs = []; p.on('pageerror', function (e) { errs.push(e.message); });
    await p.goto(URL, { waitUntil: 'networkidle0' });
    await p.evaluate(function () { document.querySelectorAll('[class*=ols-intro], [id*=ols-intro]').forEach(function (e) { e.remove(); }); });

    /* 1 — loughs over painted counties, on both Ireland maps */
    for (var leg of ['ni', 'ireland']) {
      var r = await p.evaluate(function (leg) {
        var T = window.MAW_TEST; T.show('play:' + leg); var m = T.map;
        function water() { var c = document.getElementById('map'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, n = 0; for (var i = 0; i < d.length; i += 4) if (d[i] === 0x2F && d[i + 1] === 0x6F && d[i + 2] === 0xB8) n++; return n; }
        m.painted = []; m.render(); var before = water();
        m.scene.fills.forEach(function (L) { if (!L.over && L.fill !== 'rgba(0,0,0,0)') L.features.forEach(function (f) { m.painted.push({ feature: f, fill: '#8FC79A' }); }); });
        m.render(); var after = water(); m.painted = []; m.render();
        return { before: before, after: after };
      }, leg);
      ok(r.before > 200, leg + ': no lough water drawn at all (' + r.before + ' px)');
      ok(r.after >= 0.95 * r.before, leg + ': painted counties hide the loughs (' + r.after + ' of ' + r.before + ' water px)');
    }

    /* 2–4 — the provinces board, dragged fast the way a pupil flicks a name */
    var idx = await p.evaluate(function () { var T = window.MAW_TEST; for (var i = 0; i < 20; i++) { T.show('play:ireland:' + i); if (T.task().type === 'drag') return i; } return -1; });
    ok(idx >= 0, 'no provinces board in the Ireland leg');
    async function tile(name) { return p.evaluate(function (n) { var b = [].slice.call(document.querySelectorAll('.tile')).find(function (x) { return x.textContent === n; }); var r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, parent: b.parentNode.id || b.parentNode.tagName, cls: b.className }; }, name); }
    async function anchor(name) { return p.evaluate(function (n) { var T = window.MAW_TEST, q = T.map.toScreen(T.task().anchors[n]), r = document.getElementById('map').getBoundingClientRect(); return { x: r.left + q[0], y: r.top + q[1] }; }, name); }
    async function flick(name, to) { var a = await tile(name); await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(to.x, to.y, { steps: 2 }); await p.mouse.up(); await wait(150); }
    var names = ['Ulster', 'Munster', 'Leinster', 'Connacht'];
    for (var n of names) {
      await flick(n, await anchor(n));
      var t = await tile(n);
      ok(t.parent === 'tiles' && !/dragging/.test(t.cls), 'fast drag of ' + n + ': ended in ' + t.parent + ' as "' + t.cls + '"');
    }
    ok((await p.$$eval('body > .tile', function (a) { return a.length; })) === 0, 'a name is stuck on the page after fast drags');
    /* undo: tap a placed name, it goes back; then place it again */
    var mu = await tile('Munster'); await p.mouse.click(mu.x, mu.y); await wait(150);
    ok((await tile('Munster')).parent === 'tray', 'tapping a placed name does not send it back to the tray');
    ok(await p.$eval('#task-go', function (b) { return b.hidden; }), 'Check shows while a name is still in the tray');
    await flick('Munster', await anchor('Munster'));
    ok(!(await p.$eval('#task-go', function (b) { return b.hidden; })), 'Check does not show once all four are placed');
    await p.evaluate(function () { document.getElementById('task-go').click(); }); await wait(300);
    var fb = await p.$eval('#feedback', function (e) { return e.textContent; });
    ok(/four provinces/.test(fb) && !/continent/i.test(fb), 'provinces feedback reads: ' + fb);
    ok(await p.$eval('#tiles', function (e) { return getComputedStyle(e.querySelector('.tile')).pointerEvents === 'none'; }), 'finished names still catch taps');
    /* on to the cities: nothing may cover a city dot */
    await p.evaluate(function () { document.getElementById('fact-next').click(); }); await wait(300);
    ok((await p.$$eval('.tile', function (a) { return a.length; })) === 0, 'names left on the page after the provinces board');
    await p.evaluate(function (from) { var T = window.MAW_TEST; for (var k = 0; k < 60; k++) { T.show('play:ireland:' + (from + 1 + k % 10)); if (/Cork/.test(T.task().text)) return; } }, idx);
    var cork = await p.evaluate(function () { var T = window.MAW_TEST, q = T.map.toScreen([-8.472, 51.898]), r = document.getElementById('map').getBoundingClientRect(); var el = document.elementFromPoint(r.left + q[0], r.top + q[1]); return { task: T.task().text, top: el && (el.id || el.className) }; });
    ok(/Cork/.test(cork.task), 'never reached the Cork task (' + cork.task + ')');
    ok(cork.top === 'map', 'something covers Cork: ' + cork.top);
    ok((await p.$$eval('.tile', function (a) { return a.length; })) === 0, 'names left on the page on a city task');
    ok(!errs.length, 'page errors: ' + errs.join(' | '));
  } finally { await browser.close(); }
  console.log('feedback: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
