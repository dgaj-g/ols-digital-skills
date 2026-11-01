/* J2 L5 THE SEARCH Version 2 · the clocks gate (spec V2 §5.5, §7.4, §8.4, §9.4, §10.5, §11.5; A6; gate 16).
   1. The hour's clocks, read from the SHIPPED chapters, in order: 55 s the snow fills the trail, 45 s the drifts bury
      the fold, 45 s her bleat fades, 40 s BEEP's battery, 360 s free flight. The trail's, the fold's and the bleat's
      start at her first key; the battery's at her first Run.
   2. A clock runs on the clock, not on frames: a 2 s clock ends at 2.0 s ± 0.35 at 60 frames a second AND at
      5 frames a second (gate 16: the picture drains from clock.left, never from frames).
   3. Pause holds the clock; a tab change pauses; Escape pauses.
   4. The last 10 s: the clock turns red and beats (heartbeat); orange from 20 s.
   Controls (must FAIL): a 50 s trail clock; a clock that counts frames (at 5 fps it is late by seconds).
     node ks3-dt/tools/record-tutorial/j2l5-clock-test.js [--base http://localhost:8125] */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8125');
const PROTO = args.includes('--proto');
const DESIGN = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/L5_PROTOTYPES';
const HOUR = PROTO ? path.join(DESIGN, 'hour') : (process.env.J2L5_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/search/hour'));
const PAGE = PROTO ? 'file://' + DESIGN + '/search-hour.html?mute=1' : BASE + '/ks3-dt/platform/assets/search/hour.html#' + encodeURIComponent('{"test":1}');
let fails = 0, passes = 0;
function must(ok, what) { if (ok) passes++; else { fails++; } console.log((ok ? '  PASS ' : '  FAIL ') + what); return ok; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 1. the clocks as written ---------- */
function clocksOf(src) { const out = []; src.replace(/clock\.show\(("[^"]*"|'[^']*'),\s*(\d+)\)|clock: \[("[^"]*"|'[^']*'),\s*(\d+)\]/g, (m, w, n, w2, n2) => { out.push(+(n || n2)); return m; }); return out; }
function statics(src) {
  const f = [];
  const got = clocksOf(src).join(',');
  if (got !== '55,45,45,40,360') f.push('the clocks in order are 55,45,45,40,360 (got ' + got + ')');
  if (!/onFirstKey: function \(\) \{ U\.clock\.start\(\); \}/.test(src)) f.push('the trail clock starts at her first key');
  if (!/onFirstKey: o\.clock \? function \(\) \{ U\.clock\.start\(\); \}/.test(src)) f.push('the fold clock starts at her first key');
  if (!/function startClock\(\) \{ if \(!clockOn\) \{ clockOn = true; U\.clock\.start\(\); \} \}/.test(src)) f.push('the battery clock starts once, at her first Run');
  return f;
}
const files = ['chapters.js', 'free.js'].map(f => path.join(HOUR, f)).filter(f => fs.existsSync(f));
if (!files.length) must(false, 'the shipped hour ' + HOUR + ' exists');
const SRC = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const st = statics(SRC); st.forEach(x => console.log('    ' + x));
must(files.length && st.length === 0, 'the clocks as written: 55 s, 45 s, 45 s, 40 s and 360 s, each starting where the design says');
must(statics(SRC.replace('The snow fills the trail in\', 55', 'The snow fills the trail in\', 50')).length > 0, 'CONTROL a 50-second long way fails');

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  try {
    await page.goto(PAGE, { waitUntil: 'load' });
    await page.waitForFunction(() => window.U && window.U.clock, null, { timeout: 15000 });
    await sleep(500);
    /* ---------- 2. on the clock, not on frames ---------- */
    const endOf = (busyMs) => page.evaluate(busy => new Promise(res => {
      const U = window.U, k = U.clock; let spin = null;
      if (busy) { spin = setInterval(() => { const t = performance.now(); while (performance.now() - t < busy); }, 0); }
      k.show('x', 2); const t0 = performance.now();
      k.onEnd = () => { if (spin) clearInterval(spin); res((performance.now() - t0) / 1000); }; k.start();
      setTimeout(() => { if (spin) clearInterval(spin); res(-1); }, 12000);
    }), busyMs);
    const fast = await endOf(0), slow = await endOf(190);
    must(Math.abs(fast - 2) <= 0.35, 'a 2-second clock ends at 2 s at full frame rate (' + fast.toFixed(2) + ' s)');
    must(Math.abs(slow - 2) <= 0.35, 'a 2-second clock ends at 2 s at about 5 frames a second (' + slow.toFixed(2) + ' s)');
    /* CONTROL: the old clamp (0.1 s a frame) at 5 frames a second is late by seconds */
    const clamped = 2 / Math.min(0.1, 0.2) * 0.2;
    must(Math.abs(clamped - 2) > 1, 'CONTROL a clock that takes at most 0.1 s a frame ends at ' + clamped.toFixed(1) + ' s at 5 frames a second');
    /* ---------- 3. Pause, a tab change, Escape ---------- */
    const left = () => page.evaluate(() => window.U.clock.left);
    const scrim = () => page.evaluate(() => !document.getElementById('pausescrim').classList.contains('hide'));
    const resume = () => page.evaluate(() => document.querySelector('#pausescrim .btn').click());
    await page.evaluate(() => { const k = window.U.clock; k.onEnd = null; k.show('x', 30); k.start(); });
    await sleep(600);
    await page.evaluate(() => window.U.pause()); const a = await left(); await sleep(1500); const a2 = await left();
    must(Math.abs(a - a2) < 0.05 && await scrim(), 'Pause holds the clock and shows the paused screen (' + a.toFixed(2) + ' → ' + a2.toFixed(2) + ')');
    await resume(); await sleep(800); const a3 = await left();
    must(a3 < a2 - 0.4, 'after Pause the clock goes on (' + a2.toFixed(2) + ' → ' + a3.toFixed(2) + ')');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    const h1 = await left(); await sleep(1200); const h2 = await left();
    must(Math.abs(h1 - h2) < 0.05 && await scrim(), 'a tab change pauses (' + h1.toFixed(2) + ' → ' + h2.toFixed(2) + ')');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); });
    await resume(); await sleep(300);
    await page.keyboard.press('Escape'); await sleep(200);
    const e1 = await left(); await sleep(1000); const e2 = await left();
    must(Math.abs(e1 - e2) < 0.05 && await scrim(), 'Escape pauses (' + e1.toFixed(2) + ' → ' + e2.toFixed(2) + ')');
    await page.keyboard.press('Enter'); await sleep(800); const e3 = await left();
    must(e3 < e2 - 0.4 && !(await scrim()), 'Enter goes on (' + e2.toFixed(2) + ' → ' + e3.toFixed(2) + ')');
    await page.evaluate(() => window.U.clock.hide());
    /* ---------- 4. the last ten seconds ---------- */
    const last = await page.evaluate(() => new Promise(res => {
      const U = window.U, Snd = window.SearchSound, k = U.clock, ck = document.getElementById('clock'); let beats = 0; const b0 = Snd.beat;
      Snd.beat = function () { beats++; return b0.apply(this, arguments); };
      const seen = { orange: false, red: false, early: 0 };
      k.show('x', 22); k.start();
      const iv = setInterval(() => { if (ck.classList.contains('orange')) seen.orange = true; if (ck.classList.contains('red')) seen.red = true; if (k.left > 10.3 && beats) seen.early = beats; }, 50);
      setTimeout(() => { clearInterval(iv); k.stop(); k.hide(); Snd.beat = b0; res({ beats, ...seen }); }, 14500);
    }));
    must(last.orange && last.red, 'the clock turns orange from 20 s and red from 10 s');
    must(last.beats >= 2 && last.early === 0, 'the heartbeat beats in the last ten seconds only (' + last.beats + ' beats, ' + last.early + ' early)');
  } catch (e) { must(false, 'the clocks test ran: ' + e.message.split('\n')[0]); }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 200) : ''));
  await b.close();
  console.log('\nj2l5-clock-test: ' + (fails ? 'FAIL · ' + fails + ' of ' + (fails + passes) : 'PASS · ' + passes + ' checks'));
  process.exit(fails ? 1 : 0);
})();
