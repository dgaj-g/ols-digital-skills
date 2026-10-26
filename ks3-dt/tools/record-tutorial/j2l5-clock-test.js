#!/usr/bin/env node
/* J2 L5 THE SEARCH · the clocks gate (spec §14 A4, A9; §15 gate 8; §11 Pause).
   1. The hour's clocks, read from the SHIPPED chapters: 55 s the long way, 40 s each field, 45 s the spiral,
      40 s the battery, 360 s the free flight, in that order. The long way's starts at her first key; the
      fields' and the spiral's at Run; the battery's at once, beating the battery tone, not the heartbeat.
   2. A clock runs on the clock, not on frames: U.clock(2) ends at 2.0 s ± 0.25 at 60 frames a second AND
      at 5 frames a second (a slow laptop).
   3. Pause holds a clock; a tab change pauses (the scrim shows, the clock holds); Escape pauses and goes on.
   4. The battery: a clock given a beat calls it in its last ten seconds, and does not play the heartbeat.
   Controls (must FAIL): a 50 s long way; a clock that counts frames (at 5 fps it is late by seconds).
   The frame page is served (dev server) with #{"test":1}, which loads the hour without starting it.
     node ks3-dt/tools/record-tutorial/j2l5-clock-test.js [--base http://localhost:8125] [--proto] */
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
function clocksOf(src) { const out = []; src.replace(/U\.clock\((\d+)/g, (m, n) => { out.push(+n); return m; }); return out; }
function statics(src) {
  const f = [];
  const got = clocksOf(src).join(',');
  if (got !== '55,40,45,40,360') f.push('the clocks in order are 55,40,45,40,360 (got ' + got + ')');
  if (!/U\.clock\(55, function \(\) \{ failed = true; \}\);\s*U\.onFirstKey\(function \(\) \{ clock\.start\(\); \}\)/.test(src)) f.push('the long way\'s clock starts at her first key');
  if ((src.match(/if \(!lines\) return null; clock\.start\(\);/g) || []).length < 2) f.push('the fields\' and the spiral\'s clocks start at Run');
  if (!/U\.clock\(40, function \(\) \{ dead = true; \}, S2\.battery\); clock\.start\(\);/.test(src)) f.push('the battery clock starts at once and beats the battery tone');
  return f;
}
const files = ['chapters.js', 'free.js'].map(f => path.join(HOUR, f)).filter(f => fs.existsSync(f));
if (!files.length) must(false, 'the shipped hour ' + HOUR + ' exists');
const SRC = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const st = statics(SRC); st.forEach(x => console.log('    ' + x));
must(files.length && st.length === 0, 'the clocks as written: 55 s, 40 s, 45 s, 40 s and 360 s, each starting where the design says');
must(statics(SRC.replace('U.clock(55,', 'U.clock(50,')).length > 0, 'CONTROL a 50-second long way fails');

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  try {
    await page.goto(PAGE, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SearchUI && window.SearchUI.clock, null, { timeout: 15000 });
    await sleep(500);
    /* ---------- 2. on the clock, not on frames ---------- */
    const endOf = (busyMs) => page.evaluate(busy => new Promise(res => {
      const U = window.SearchUI; let off = null;
      if (busy) off = U.onFrame(() => { const t = performance.now(); while (performance.now() - t < busy); });
      const t0 = performance.now(); const k = U.clock(2, () => { if (off) off(); res((performance.now() - t0) / 1000); }); k.start();
      setTimeout(() => { if (off) off(); res(-1); }, 12000);
    }), busyMs);
    const fast = await endOf(0), slow = await endOf(190);
    must(Math.abs(fast - 2) <= 0.25, 'a 2-second clock ends at 2 s at 60 frames a second (' + fast.toFixed(2) + ' s)');
    must(Math.abs(slow - 2) <= 0.25, 'a 2-second clock ends at 2 s at 5 frames a second (' + slow.toFixed(2) + ' s)');
    /* a clock that counts frames (1/60 s each) for 3 real seconds at 5 frames a second */
    const framey = await page.evaluate(() => new Promise(res => { const U = window.SearchUI; let n = 0; const busy = U.onFrame(() => { const t = performance.now(); while (performance.now() - t < 190); }); const off = U.onFrame(() => { n++; }); setTimeout(() => { off(); busy(); res(n / 60); }, 3000); }));
    must(Math.abs(framey - 3) > 1, 'CONTROL a clock that counts frames is out by over a second at 5 frames a second (it says ' + framey.toFixed(2) + ' s after 3 s)');
    /* ---------- 3. Pause, a tab change, Escape ---------- */
    await page.evaluate(() => { window.__k = window.SearchUI.clock(30); window.__k.start(); });
    await sleep(600);
    const scrim = () => page.evaluate(() => { const s = document.getElementById('pausedScrim'); if (!s) return false; const cs = getComputedStyle(s); return cs.display !== 'none' && cs.visibility !== 'hidden' && !s.classList.contains('off') && !s.hidden; });
    const left = () => page.evaluate(() => window.__k.left());
    await page.evaluate(() => window.SearchUI.pause(true)); const a = await left(); await sleep(1500); const a2 = await left();
    must(Math.abs(a - a2) < 0.05, 'Pause holds the clock (' + a.toFixed(2) + ' → ' + a2.toFixed(2) + ' over 1.5 s)');
    must(await scrim(), 'Pause shows the paused screen');
    await page.evaluate(() => window.SearchUI.pause(false)); await sleep(800); const a3 = await left();
    must(a3 < a2 - 0.4, 'after Pause the clock goes on (' + a2.toFixed(2) + ' → ' + a3.toFixed(2) + ')');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    const h1 = await left(); await sleep(1200); const h2 = await left();
    must(Math.abs(h1 - h2) < 0.05 && await scrim(), 'a tab change pauses: the paused screen shows and the clock holds (' + h1.toFixed(2) + ' → ' + h2.toFixed(2) + ')');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); window.SearchUI.pause(false); });
    await sleep(300);
    await page.keyboard.press('Escape'); await sleep(200);
    const e1 = await left(); await sleep(1000); const e2 = await left();
    must(Math.abs(e1 - e2) < 0.05 && await scrim(), 'Escape pauses (' + e1.toFixed(2) + ' → ' + e2.toFixed(2) + ')');
    await page.keyboard.press('Escape'); await sleep(800); const e3 = await left();
    must(e3 < e2 - 0.4 && !(await scrim()), 'Escape again goes on (' + e2.toFixed(2) + ' → ' + e3.toFixed(2) + ')');
    await page.evaluate(() => window.__k.stop());
    /* ---------- 4. the battery beat ---------- */
    const beat = await page.evaluate(() => new Promise(res => {
      const U = window.SearchUI, S2 = window.SearchSound2; let beats = 0, hearts = 0; const hb = S2 && S2.heartbeat; if (S2) S2.heartbeat = function () { hearts++; };
      const k = U.clock(11, null, () => { beats++; }); k.start();
      setTimeout(() => { k.stop(); if (S2) S2.heartbeat = hb; res({ beats, hearts }); }, 2600);
    }));
    must(beat.beats > 0 && beat.hearts === 0, 'a clock given the battery beat plays it in its last ten seconds, not the heartbeat (beats ' + beat.beats + ', heartbeats ' + beat.hearts + ')');
    const plain = await page.evaluate(() => new Promise(res => { const U = window.SearchUI, S2 = window.SearchSound2; let hearts = 0; const hb = S2 && S2.heartbeat; if (S2) S2.heartbeat = function () { hearts++; }; const k = U.clock(11); k.start(); setTimeout(() => { k.stop(); if (S2) S2.heartbeat = hb; res(hearts); }, 2600); }));
    must(plain > 0, 'a clock with no beat still plays the heartbeat in its last ten seconds (' + plain + ')');
  } catch (e) { must(false, 'the clocks test ran: ' + e.message.split('\n')[0]); }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 200) : ''));
  await b.close();
  console.log('\nj2l5-clock-test: ' + (fails ? 'FAIL · ' + fails + ' of ' + (fails + passes) : 'PASS · ' + passes + ' checks'));
  process.exit(fails ? 1 : 0);
})();
