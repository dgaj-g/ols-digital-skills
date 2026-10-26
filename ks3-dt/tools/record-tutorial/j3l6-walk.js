/* J3 L6 THE NIGHT DESK — the walk gate (G1/G4/G6). node j3l6-walk.js [--fails] [--url <hour page>]
   Walks the hour as the model pupil at three sizes (1280×800, 1440×900, 1024×768): 41 screens (44 with the honest
   fails), model minutes within 10 % of 10.6 (12.1 with the fails), no page errors, nothing outside the window. Then:
   G4 both rush rules typed at 4 keys a second and the stamp, at speed 1, must NOT time out and must stop the clock.
   G6 the rush clock gives the same timeout at 5 and 60 frames a second, and a 1 s Pause delays it by about 1 s.
   Time model (DFM 305–307): 1.2 s a screen + 0.35 s a word + film + keys / 4 + 0.8 s an action.
   puppeteer runs headless 'shell' (NODE_PATH=$(npm root -g)). */
var puppeteer = require('puppeteer'), fs = require('fs'), path = require('path');
var A = process.argv, fails = A.indexOf('--fails') > 0, ui = A.indexOf('--url');
var HOUR = ui > 0 ? A[ui + 1] : 'file://' + path.resolve(__dirname, '../../platform/assets/nightdesk/hour.html');
var OUT = path.resolve(__dirname, 'j3l6/walk' + (fails ? '-fails' : '')), SIZES = [[1280, 800], [1440, 900], [1024, 768]];
var TARGET = fails ? 12.1 : 10.6, SCREENS = fails ? 44 : 41, bad = [];
function url(q) { return HOUR + (HOUR.indexOf('?') > 0 ? '&' : '?') + q + '#' + encodeURIComponent(JSON.stringify({ test: 1 })); }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function walk(browser, W, H) {
  var page = await browser.newPage(), errs = []; await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', function (e) { errs.push(e.message); });
  await page.goto(url(fails ? 'fails=1' : 'x=0'), { waitUntil: 'load' }); await page.evaluate(function () { return document.fonts.ready; });
  var out = path.join(OUT, W + 'x' + H); fs.mkdirSync(out, { recursive: true });
  var records = [], steps = 0, last = null, overflow = [];
  while (steps++ < 600) {
    var m = await page.evaluate(function () { return window.Hour.measure(); }), w = await page.evaluate(function () { return window.Hour.want(); });
    if (m.screen !== last) { last = m.screen; var proseWords = m.prose.join(' ').split(/\s+/).filter(Boolean).length, words = proseWords + (m.print || []).join(' ').split(/\s+/).filter(Boolean).length; records.push({ screen: m.screen, chapter: m.chapter, words: words, proseWords: proseWords, keys: 0, film: m.film || 0, acts: 0, prose: m.prose, secs: 1.2 + 0.35 * words + (m.film || 0) });
      var o = await page.evaluate(function () { var r = [], vw = innerWidth, vh = innerHeight; document.querySelectorAll('main button, main .ask, main .tbl, main #qbox').forEach(function (n) { var b = n.getBoundingClientRect(); if (b.width && (b.right > vw + 1 || b.bottom > vh + 1)) r.push((n.getAttribute('data-act') || n.className) + ' ' + Math.round(b.right) + ',' + Math.round(b.bottom)); }); return r; });
      if (o.length) overflow.push(m.screen + ': ' + o.join(' | '));
      await page.screenshot({ path: path.join(out, String(records.length).padStart(2, '0') + '-' + m.screen + '.png') }); }
    var cur = records[records.length - 1]; if (!w || w.kind === 'done') break;
    if (w.kind === 'wait') { await wait(w.ms); continue; }
    if (w.kind === 'click') { await page.evaluate(function (s) { var b = document.querySelector(s); if (b) b.scrollIntoView({ block: 'nearest' }); }, w.sel); await page.click(w.sel); }
    else if (w.kind === 'type') { await page.click(w.sel); await page.keyboard.type(w.text); if (w.enter) await page.keyboard.press('Enter'); cur.keys += w.text.length + (w.enter ? 1 : 0); }
    cur.acts++; cur.secs = 1.2 + 0.35 * cur.words + cur.film + cur.keys / 4 + cur.acts * 0.8;
    await wait(40);
  }
  var total = records.reduce(function (s, r) { return s + r.secs; }, 0) / 60;
  fs.writeFileSync(path.join(out, 'measure.json'), JSON.stringify({ width: W, height: H, fails: fails, minutes: total, records: records }, null, 1));
  var tag = W + '×' + H + (fails ? ' fails' : '');
  console.log(tag + ': screens ' + records.length + ' · model minutes ' + total.toFixed(2) + (errs.length ? ' · ERRORS ' + errs.join('; ') : ''));
  if (records.length !== SCREENS) bad.push(tag + ' screens ' + records.length + ' (want ' + SCREENS + ')');
  if (Math.abs(total - TARGET) > TARGET * 0.1) bad.push(tag + ' minutes ' + total.toFixed(2) + ' (want ' + TARGET + ' ±10%)');
  if (errs.length) bad.push(tag + ' page errors');
  if (overflow.length) bad.push(tag + ' outside the window: ' + overflow.slice(0, 4).join(' ; '));
  await page.close();
}
async function g4(browser) { /* both rush rules at 4 keys a second and the stamp, real clock: no timeout, clock stopped */
  var page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url('at=c6-ask1'), { waitUntil: 'load' }); var t0 = Date.now();
  for (var guard = 0; guard < 12; guard++) { var w = await page.evaluate(function () { return window.Hour.want(); }), sc = await page.evaluate(function () { return window.Hour.screen(); });
    if (sc === 'front' || sc === 'c6-printed') break;
    if (w.kind === 'type') { await page.click(w.sel); await page.keyboard.type(w.text, { delay: 250 }); await page.keyboard.press('Enter'); } else await page.click(w.sel); await wait(300); }
  var c = await page.evaluate(function () { return window.Hour.clock(); }), s6 = await page.evaluate(function () { return window.Hour.state.stamps.c6; }), secs = (Date.now() - t0) / 1000;
  console.log('G4: rush done in ' + secs.toFixed(1) + ' s at 4 keys/s · timedOut ' + c.timedOut + ' · running ' + c.running + ' · stamped ' + !!s6);
  if (c.timedOut || c.running || !s6) bad.push('G4 the rush at 4 keys/s timed out, or the stamp did not stop the clock');
  await page.close();
}
async function timeoutAfter(browser, frame, pauseMs) { /* speed 60: 180 s → 3 s */
  var page = await browser.newPage(); await page.goto(url('speed=60&frame=' + frame + '&at=c6-ask1'), { waitUntil: 'load' });
  var t0 = Date.now(); if (pauseMs) { await wait(800); await page.keyboard.press('Escape'); await wait(pauseMs); await page.keyboard.press('Escape'); }
  while (!(await page.evaluate(function () { return window.Hour.clock().timedOut; }))) { if (Date.now() - t0 > 15000) break; await wait(10); }
  var s = (Date.now() - t0) / 1000; await page.close(); return s;
}
async function g6(browser) {
  var a = await timeoutAfter(browser, 200, 0), b = await timeoutAfter(browser, 16, 0), p = await timeoutAfter(browser, 16, 1000);
  console.log('G6: timeout at 5 fps ' + a.toFixed(2) + ' s · 60 fps ' + b.toFixed(2) + ' s · with a 1 s pause ' + p.toFixed(2) + ' s');
  if (Math.abs(a - b) > 0.3) bad.push('G6 frame rate changes the clock: ' + a.toFixed(2) + ' vs ' + b.toFixed(2));
  if (Math.abs(p - b - 1) > 0.35) bad.push('G6 Pause did not freeze the clock: ' + p.toFixed(2) + ' vs ' + b.toFixed(2));
}
(async function () {
  var browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  for (var s of SIZES) await walk(browser, s[0], s[1]);
  if (!fails) { await g4(browser); await g6(browser); }
  await browser.close();
  if (bad.length) { console.log('FAIL\n  ' + bad.join('\n  ')); process.exit(1); } console.log('PASS j3l6-walk' + (fails ? ' --fails' : ''));
})().catch(function (e) { console.error(e); process.exit(1); });
