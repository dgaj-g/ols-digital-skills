/* G5 — rendered-pixel guard. Puppeteer opens every screen at 375 / 768 / 1280 px and checks what a pupil would see:
   the map is drawn (not blank), nothing spills sideways, the task card is above the fold, the stamp shows on the leg-done screen.
   Needs the dev server: python3 -m http.server 8098 from the repo root. Shots go to $SHOTS (default tests/shots, git-ignored).
   Control: MAW_BLANK=1 hides the canvas → this test fails. Run: node tests/pixels.test.js */
var path = require('path'), fs = require('fs');
var puppeteer = require(process.env.PUPPETEER || '/Users/damiengartland/.npm-global/lib/node_modules/puppeteer');
var URL = (process.env.MAW_URL || 'http://localhost:8098/geography/my-amazing-world/') + '?nointro&test=1';
var SHOTS = process.env.SHOTS || path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
var LEGS = ['oceans', 'continents', 'europe', 'ni', 'ireland', 'types', 'final'];
var STATES = ['door'].concat(LEGS.map(function (l) { return 'brief:' + l; }), LEGS.map(function (l) { return 'play:' + l; }), LEGS.map(function (l) { return 'done:' + l; }), ['play:types:1', 'play:types:3', 'play:final:5', 'passport', 'finish']);
var WIDTHS = [[375, 740], [768, 1024], [1280, 800]];
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('FAIL ' + m); } }
(async function () {
  var browser = await puppeteer.launch({ headless: 'shell' });
  try {
    for (var w of WIDTHS) {
      var page = await browser.newPage();
      await page.setViewport({ width: w[0], height: w[1] });
      var errs = [];
      page.on('pageerror', function (e) { errs.push(e.message); });
      await page.goto(URL, { waitUntil: 'networkidle0' });
      ok(await page.evaluate(function () { return !!window.MAW_TEST; }), w[0] + ': no window.MAW_TEST hook');
      for (var st of STATES) {
        var tag = w[0] + ' ' + st;
        await page.evaluate(function (s, blank) { window.MAW_TEST.show(s); if (blank) document.querySelectorAll('canvas').forEach(function (c) { c.style.visibility = 'hidden'; }); }, st, !!process.env.MAW_BLANK);
        await new Promise(function (r) { setTimeout(r, 450); });
        var m = await page.evaluate(function () {
          var vis = function (el) { if (!el) return null; var r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' ? { top: r.top + scrollY, bottom: r.bottom + scrollY, h: r.height } : null; };
          var screen = document.querySelector('.screen:not([hidden])');
          var cv = screen && Array.prototype.filter.call(screen.querySelectorAll('canvas'), function (c) { return vis(c); })[0];
          var inked = null;
          if (cv) { var x = cv.getContext('2d'), d = x.getImageData(0, 0, cv.width, cv.height).data, seen = {}, n = 0;
            for (var i = 0; i < d.length; i += 4 * 97) { var k = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4) + ',' + (d[i + 3] >> 6); if (!seen[k]) { seen[k] = 1; n++; } }
            inked = n; }
          var photo = screen && screen.querySelector('img.maw-photo');
          return { id: screen && screen.id, overflow: document.documentElement.scrollWidth - innerWidth, card: vis(screen && screen.querySelector('.maw-task, .paper-card')), wantsMap: !!(screen && screen.querySelector('canvas')), canvas: vis(cv), inked: inked, photo: photo && photo.naturalWidth > 0 ? vis(photo) : null, stamp: vis(document.getElementById('done-stamp')), vh: innerHeight };
        });
        await page.screenshot({ path: path.join(SHOTS, w[0] + '-' + st.replace(/:/g, '-') + '.png') });
        ok(m.id, tag + ': no screen showing');
        ok(m.overflow <= 1, tag + ': page spills ' + m.overflow + ' px sideways');
        ok(m.card && m.card.top < m.vh - 40, tag + ': the task card is below the fold');
        if (st.indexOf('play:') === 0 && st.indexOf('play:types') !== 0) ok(m.canvas && m.inked >= 4, tag + ': the map is blank or hidden (' + m.inked + ' colours)');
        if (st === 'play:types') ok(m.card, tag + ': sorting board not showing');
        if (/^play:types:/.test(st)) ok(m.photo && m.photo.top < m.vh, tag + ': the photograph is not showing above the fold');
        if (st.indexOf('done:') === 0) ok(m.stamp && m.stamp.top < m.vh * 1.2, tag + ': the stamp is not visible');
      }
      ok(errs.length === 0, w[0] + ': script errors: ' + errs.join(' | '));
      await page.close();
    }
  } finally { await browser.close(); }
  console.log('pixels: ' + pass + ' passed, ' + fail + ' failed (shots in ' + SHOTS + ')');
  process.exit(fail ? 1 : 0);
})();
