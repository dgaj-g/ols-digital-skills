/* J2 L5 THE SEARCH Version 2 · the walker (spec V2 §15 gates 11, 17, 19; §16 A16, A18, A19).
   It plays the whole hour the way the hour measure says (A18): Next clicked the moment it shows, every right answer first
   time, typing at 4 keys a second. The hour runs at ?speed=N, so its own clock (U.t, which Pause stops) is the walked time;
   typing time is added from the keys typed. Watched all the way:
   gate 11  no screen moves on by itself; Next is never shown the moment a screen appears
   gate 17  the lamb's cold level changes only at a chapter change or a fail
   gate 19  every panel screen in chapters 1 to 4 has its step line, STEP n OF m with n <= m and m fixed per strip name
   A18      Home in at most 26 minutes
   Controls (must FAIL): a walk timed at 1 key a second is over 26 minutes is NOT asserted (it is a model), so the controls are
   planted: a screen with no step line; STEP 7 OF 6; a Next shown at 0 s; a cold level that rises with no chapter change.
     node ks3-dt/tools/record-tutorial/j2l5-walk2.js [--base http://localhost:8790] [--speed 8] [--w 1366 --h 768] [--shots dir] */
'use strict';
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright')); }
const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const BASE = argOf('--base', 'http://localhost:8790'), SPEED = +argOf('--speed', 8), W = +argOf('--w', 1366), H = +argOf('--h', 768), SHOTS = argOf('--shots', '');
const KEYS_PER_SEC = 4, LIMIT_MIN = 26;
let fails = 0, passes = 0;
const must = (ok, msg) => { if (ok) passes++; else fails++; console.log((ok ? '  PASS ' : '  FAIL ') + msg); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* the right answers where the card alone is not the answer: per step, in the order they are asked */
const ANSWERS = require('./j2l5-walk2-answers.js');

/* pure checks on what the walk saw: the controls run through these too */
function checkSteps(screens) {
  const f = [], total = {};
  screens.forEach(s => {
    if (!/^[twgh]\d$/.test(s.at)) return;
    const m = /^(.+?) · STEP (\d+) OF (\d+)$/.exec(s.step || '');
    if (!m) { f.push(s.at + ' "' + (s.h || '').slice(0, 40) + '" has no step line (' + (s.step || 'none') + ')'); return; }
    if (+m[2] > +m[3] || +m[2] < 1) f.push(s.at + ' ' + s.step);
    if (total[m[1]] && total[m[1]] !== m[3]) f.push(s.at + ' ' + s.step + ' but ' + m[1] + ' had OF ' + total[m[1]]);
    total[m[1]] = m[3];
  });
  return f;
}
function checkNext(screens) { return screens.filter(s => s.nextAtOnce).map(s => s.at + ' "' + (s.h || '').slice(0, 40) + '" shows Next the moment it appears'); }
function checkCold(colds) {
  const f = []; let prev = null;
  colds.forEach(c => { if (prev && Math.abs(c.cold - prev.cold) > 0.005 && c.ch === prev.ch && !c.fail) f.push(c.at + ' cold ' + prev.cold.toFixed(2) + ' → ' + c.cold.toFixed(2) + ' with no chapter change and no fail'); prev = c; });
  return f;
}

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  const url = BASE + '/search/hour.html?speed=' + SPEED + '#' + encodeURIComponent('{"test":1}');
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.U && window.__hour, null, { timeout: 15000 });
  /* the watchers, in the page */
  await page.evaluate(() => {
    const W = window.__walk = { screens: [], colds: [], fails: 0, moved: [] };
    const panel = document.getElementById('panel');
    const snap = () => {
      const st = panel.querySelector('.stepl'), h = panel.querySelector('h2, .talkline'), nx = panel.querySelector('.next');
      if (!nx) return;
      W.screens.push({ at: window.__hour.at, step: st ? st.textContent.trim() : '', h: h ? h.textContent.trim() : '', nextAtOnce: nx.classList.contains('on'), t: window.U.t });
    };
    new MutationObserver(muts => { if (muts.some(m => [].some.call(m.addedNodes, n => n.nodeType === 1 && n.classList && n.classList.contains('btns')))) snap(); }).observe(panel, { childList: true });
    let last = null;
    window.U.every(() => {
      const L = window.U.lambSt; if (!L) return;
      const c = Math.round(L.cold * 100) / 100, ch = (document.querySelector('#strip .cur') || {}).textContent || '';
      const fail = !!document.querySelector('#panel .under.bad, #panel .fail') || /fail|wind/i.test(window.__hour.at);
      if (last === null || Math.abs(c - last) > 0.005) { if (!window.U.tweening) W.colds.push({ at: window.__hour.at, cold: c, ch, fail: W.failNow || fail }); last = c; }
    });
  });
  let typed = 0, stuck = 0, lastSig = '', used = {};
  const t0 = Date.now();
  for (let loop = 0; loop < 20000; loop++) {
    const s = await page.evaluate(() => {
      const vis = e => e && !e.closest('.hide') && e.offsetParent !== null;
      const P = document.getElementById('panel'), F = document.getElementById('film');
      const rb = document.getElementById('readit'); if (rb && !rb.classList.contains('hide')) { rb.click(); return { did: 'readit' }; }
      const fn = F.querySelector('.next.on'); if (vis(fn)) { fn.click(); return { did: 'film' }; }
      const pn = P.querySelector('.btns .next.on'); if (vis(pn)) { pn.click(); return { did: 'next' }; }
      const tip = document.querySelector('.tip .next.on'); if (vis(tip)) { tip.click(); return { did: 'tour' }; }
      const nb = document.querySelector('.namebox'); if (vis(nb) && !nb.value) return { want: 'name' };
      const ta = P.querySelector('textarea'), run = P.querySelector('.run');
      const opts = [...P.querySelectorAll('.opt')].filter(o => !o.disabled);
      const card = [...P.querySelectorAll('.card .ln')].map(l => l.textContent.replace(/·/g, ' '));
      return { at: window.__hour.at, ta: !!(ta && !ta.readOnly && !ta.disabled), taVal: ta ? ta.value : '', run: !!(run && vis(run) && !run.disabled), opts: opts.map(o => o.textContent), picked: !!P.querySelector('.opt.picked'), card, h: (P.querySelector('h2, .talkline') || {}).textContent || '', home: !!document.querySelector('.homebig, #done:not(.hide)'), done: window.__hourDone || (window.SearchBridge && window.SearchBridge.ended) };
    });
    if (s.did) { stuck = 0; await sleep(15); continue; }
    if (s.want === 'name') { await page.fill('.namebox', 'Snowy'); typed += 5; await page.evaluate(() => { const b = document.querySelector('.namebox').parentElement.querySelector('button'); if (b) b.click(); }); continue; }
    if (s.done) break;
    const key = s.at + '|' + s.h.slice(0, 30);
    const queue = ANSWERS[s.at] || [];
    used[s.at] = used[s.at] || 0;
    if (s.opts.length && !s.picked) {
      const a = queue[used[s.at]]; const want = a && a.opt != null ? a.opt : 0; if (a && a.opt != null) used[s.at]++;
      await page.evaluate(w => { const o = [...document.querySelectorAll('#panel .opt')].filter(x => !x.disabled); const hit = typeof w === 'number' ? o[w] : o.find(x => x.textContent.includes(w)); (hit || o[0]).click(); }, want);
      await sleep(30);
      continue;
    }
    if (s.ta && s.run && !s.taVal.trim()) {
      const a = queue[used[s.at]]; let text;
      if (a && a.type != null) { text = a.type; used[s.at]++; } else text = s.card.join('\n');
      typed += text.replace(/\n {4}/g, '\n').length;   /* the box puts in the 4 spaces after a colon */
      await page.evaluate(t => { const ta = document.querySelector('#panel textarea'); ta.focus(); ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' })); ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); }, text);
      await sleep(30);
      await page.evaluate(() => document.querySelector('#panel .run').click());
      await sleep(60);
      continue;
    }
    if (s.ta && s.run && s.taVal.trim()) { await page.evaluate(() => document.querySelector('#panel .run').click()); await sleep(60); }
    const sig = key + '|' + s.taVal;
    if (sig === lastSig) stuck++; else { stuck = 0; lastSig = sig; }
    if (stuck > 1500) { console.log('    STUCK at ' + s.at + ': ' + s.h.slice(0, 80) + ' · opts ' + s.opts.join(' / ') + ' · box ' + JSON.stringify(s.taVal).slice(0, 80)); break; }
    await sleep(20);
  }
  const W2 = await page.evaluate(() => ({ at: window.__hour.at, err: window.__hourError || '', t: window.U.t, screens: window.__walk.screens, colds: window.__walk.colds }));
  const mins = (W2.t + typed / KEYS_PER_SEC) / 60;
  console.log('    walked to ' + W2.at + ' · game time ' + (W2.t / 60).toFixed(1) + ' min + typing ' + (typed / KEYS_PER_SEC / 60).toFixed(1) + ' min = ' + mins.toFixed(1) + ' min · ' + W2.screens.length + ' screens · real ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'walk2-end-' + W + 'x' + H + '.png') });
  must(W2.at === 'close' && !W2.err, 'the walk reaches the end of the close (at ' + W2.at + (W2.err ? ', error ' + W2.err.slice(0, 120) : '') + ')');
  must(mins <= LIMIT_MIN, 'A18 the walked hour reaches Home in ' + mins.toFixed(1) + ' min (at most ' + LIMIT_MIN + ')');
  const st = checkSteps(W2.screens); st.slice(0, 8).forEach(x => console.log('    ' + x));
  must(st.length === 0, 'gate 19 every panel screen in chapters 1 to 4 has its step line');
  must(checkSteps([{ at: 't1', step: '', h: 'x' }]).length > 0, 'CONTROL a screen with no step line fails');
  must(checkSteps([{ at: 't1', step: 'THE TRACKS · STEP 7 OF 6', h: 'x' }]).length > 0, 'CONTROL STEP 7 OF 6 fails');
  const nx = checkNext(W2.screens); nx.slice(0, 8).forEach(x => console.log('    ' + x));
  must(nx.length === 0, 'gate 11 no screen shows Next the moment it appears (' + W2.screens.length + ' screens)');
  must(checkNext([{ at: 't1', nextAtOnce: true, h: 'x' }]).length > 0, 'CONTROL a Next shown at 0 s fails');
  const cd = checkCold(W2.colds); cd.slice(0, 8).forEach(x => console.log('    ' + x));
  console.log('    cold levels: ' + W2.colds.map(c => c.at + ' ' + c.cold).join(', '));
  must(cd.length === 0, 'gate 17 the lamb gets colder only at a chapter change or a fail');
  must(checkCold([{ at: 't2', cold: 0.55, ch: 'a' }, { at: 't3', cold: 0.6, ch: 'a' }]).length > 0, 'CONTROL a cold level that rises with no chapter change fails');
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log('\nj2l5-walk2 ' + W + 'x' + H + ': ' + (fails ? 'FAIL · ' + fails + ' of ' + (fails + passes) : 'PASS · ' + passes + ' checks'));
  process.exit(fails ? 1 : 0);
})();
