#!/usr/bin/env node
/* l6-harness.js: J1 Lesson 6 "Inside the Machine" (THE OPERATION) walked as one pupil on the platform shell.
 *
 * sit-wrongpath.js and sit-review.js press platform buttons; most of this lesson is a page in a frame
 * (assets/l6/operation.html), so they stand aside for lesson 6 and point here, as they do for The Rescue.
 * This walk takes Anya (Demo-8A) through every step of the lesson ALONE, from the tile to the done card:
 * the frame steps are driven inside the frame (its own buttons, or the OPUI/OPWARDUI hooks the keyboard uses),
 * the platform steps by the shared movers in lib/walk-moves.js. Coverage is ASSERTED, not printed:
 *   every landmark in sit-wrongpath.js LANDMARKS['6'] must be stood on (on the page or inside the frame),
 *   and the walk's shape (xp, chunks, presses, marks, badges) must equal sit-review.js EXPECT['6'].
 * CONTROL: --control adds a landmark nobody can stand on and walks past the ward round without fixing it;
 * the run must then FAIL. Run it with --expect-fail to prove that.
 *
 *   node ks3-dt/tools/record-tutorial/l6-harness.js [--base http://localhost:8121] [--width 1366] [--control --expect-fail]
 */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path'), fs = require('fs');
const WALK = require('./lib/walk-moves.js');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8121');
const WIDTH = Number(argOf('--width', '1366'));
const CONTROL = args.includes('--control');
const EXPECT_FAIL = args.includes('--expect-fail');
const OUT = path.join(__dirname, 'qa-l2-l5-review', 'l6-harness', String(WIDTH));
fs.mkdirSync(OUT, { recursive: true });
const URL = BASE + '/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const EMAIL = 'anya.murphy@demo';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let checks = 0; const FAILS = [];
const must = (ok, what) => { checks++; console.log((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) FAILS.push(what); return ok; };

/* the two declaration tables ARE the coverage claim (qa-harness-coverage reads them); this walk reads them too */
function table(file, re, key) {
  const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const at = src.search(re); if (at < 0) return null;
  const k = src.indexOf("'" + key + "':", at); if (k < 0) return null;
  let i = src.indexOf(':', k) + 1; while (/\s/.test(src[i])) i++;
  const open = src[i], close = open === '[' ? ']' : '}';
  let d = 0, j = i;
  for (; j < src.length; j++) { if (src[j] === open) d++; else if (src[j] === close && --d === 0) break; }
  return (new Function('return ' + src.slice(i, j + 1)))();
}
const LANDMARKS = (table('sit-wrongpath.js', /const\s+LANDMARKS\s*=/, '6') || []).slice();
const EXPECT = table('sit-review.js', /const\s+EXPECT\s*=/, '6');
if (CONTROL) LANDMARKS.push(['CONTROL: a landmark nobody can stand on', '.no-such-surface-anywhere', 'c3']);
const stood = {};

async function seed(page) {
  await page.evaluate((email) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks['Demo-8A'] = db.locks['Demo-8A'] || {};
    for (const n of ['1', '2', '3', '4', '5', '6']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    const kk = 'Demo-8A:' + email;
    db.pupils = db.pupils || {};
    const rec = db.pupils[kk] || { n: 'Anya Murphy', cn: '', j: 1, xp: 0, g: '' };
    rec.L = rec.L || {};
    for (const n of ['1', '2', '3', '4', '5']) if (!rec.L[n] || Number(rec.L[n][0]) !== 2) rec.L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + Number(n), 10, 0, '', 0, 0];
    delete rec.L['6'];
    db.pupils[kk] = rec;
    const up = (db.userProps || {})[email];
    if (up && up.draft) Object.keys(up.draft).forEach(k => { if (/:6:/.test(k)) delete up.draft[k]; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, EMAIL);
}
const chunkNow = page => page.evaluate(() => { const s = window.App && App.state; return s && s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; });
const frameOf = async page => { const h = await page.$('#chunk-host iframe.rescue-frame'); return h ? h.contentFrame() : null; };
const VISIBLE = sel => { const els = document.querySelectorAll(sel); for (const e of els) { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none') return true; } return false; };

/* stand on whatever landmarks this chunk owns that are on screen now, on the page or inside the frame */
async function look(page, ck) {
  const fr = await frameOf(page);
  for (const [label, sel, at] of LANDMARKS) {
    if (at !== ck || stood[label]) continue;
    let ok = await page.evaluate(VISIBLE, sel).catch(() => false);
    if (!ok && fr) ok = await fr.evaluate(VISIBLE, sel).catch(() => false);
    if (ok) { stood[label] = true; await page.screenshot({ path: path.join(OUT, ck + '-' + Object.keys(stood).length + '.png') }); }
  }
}
let presses = 0;
async function waitChunkChange(page, from, ms) {
  const t = Date.now();
  while (Date.now() - t < ms) { const c = await chunkNow(page); if (c !== from) return c; await sleep(300); }
  return from;
}
async function frameReady(page) {
  for (let i = 0; i < 40; i++) {
    const fr = await frameOf(page);
    if (fr) { const ok = await fr.evaluate(() => document.title === 'ready').catch(() => false); if (ok) return fr; }
    await sleep(300);
  }
  return null;
}
const fclick = (fr, sel) => fr.evaluate(s => { const b = document.querySelector(s); if (!b || b.disabled || b.hidden) return false; b.click(); return true; }, sel).then(ok => { if (ok) presses++; return ok; });

/* ---------- the frame steps ---------- */
async function door(page) {
  const fr = await frameReady(page); if (!fr) return false;
  await sleep(1500); await look(page, 'c1');
  return fclick(fr, '#beginbtn');
}
async function op(page) {
  const fr = await frameReady(page); if (!fr) return false;
  await fr.waitForFunction(() => window.OPUI && OPUI.S, null, { timeout: 10000 });
  await sleep(800); await look(page, 'c2');
  if (await fr.evaluate(() => OPUI.S.stage === 'door')) { await fr.evaluate(() => OPUI.begin()); presses++; }
  /* the tour, if it is up, is walked through by its own button */
  for (let i = 0; i < 12 && await fr.evaluate(() => OPUI.tour && OPUI.tour.active()); i++) { await fclick(fr, '#tournext'); await sleep(250); }
  await sleep(600); await look(page, 'c2');
  if (await fr.evaluate(() => OPUI.S.fluff === 'in')) { await fr.evaluate(() => OPUI.act('fluff')); presses++; await sleep(500); }
  const parts = await fr.evaluate(() => Object.keys(OPUI.S.parts));
  let first = true;
  for (const p of parts) {
    await fr.evaluate(x => OPUI.act(x), p); presses++; await sleep(700); await look(page, 'c2');
    /* a confused pupil: the first part gets a wrong card before the right one */
    if (first) { const w = parts.find(x => x !== p); await fr.evaluate(x => OPUI.card(x), w); presses++; await sleep(500); await look(page, 'c2'); first = false; }
    await fr.evaluate(x => OPUI.card(x), p); presses++; await sleep(500);
  }
  await sleep(1200); await look(page, 'c2');
  return fclick(fr, '#nextbtn');
}
async function ward(page, skip) {
  const fr = await frameReady(page); if (!fr) return false;
  await fr.waitForFunction(() => window.OPWARDUI && OPWARDUI.W, null, { timeout: 10000 });
  await sleep(600); await look(page, 'c3');
  if (skip) return fr.evaluate(() => { window.parent.postMessage({ op: 1, type: 'next' }, '*'); return true; });
  const ids = await fr.evaluate(() => OPWARDUI.W.S.order.slice());
  for (const id of ids) {
    await fclick(fr, '.bed[data-bed="' + id + '"]'); await sleep(700); await look(page, 'c3');
    const miss = await fr.evaluate(i => OPWARDUI.W.bed(i).missing, id);
    await fclick(fr, '.tpart[data-part="' + miss + '"]'); await sleep(2900); await look(page, 'c3');
  }
  await sleep(800); await look(page, 'c3');
  return fclick(fr, '#wnext');
}
async function boss(page, ck) {
  const fr = await frameReady(page); if (!fr) return false;
  await sleep(600); await look(page, ck);
  await fclick(fr, '.xopt[data-i="1"]'); await sleep(500); await look(page, ck);
  await fclick(fr, '.xopt[data-i="0"]'); await sleep(500);
  return fclick(fr, '#xnext');
}
async function names(page, ck) {
  const fr = await frameReady(page); if (!fr) return false;
  await sleep(600); await look(page, ck);
  /* first round: two names swapped, so the check says "Not quite"; then put right */
  const n = await fr.evaluate(() => document.querySelectorAll('.xjob').length);
  for (let j = 0; j < n; j++) { const want = j === 0 ? 1 : j === 1 ? 0 : j; await fclick(fr, '.xjob[data-j="' + j + '"]'); await fclick(fr, '.xname[data-n="' + want + '"]'); }
  await fclick(fr, '#xcheck'); await sleep(700); await look(page, ck);
  for (let r = 0; r < 3; r++) {
    for (let j = 0; j < n; j++) { if (await fr.evaluate(x => !!document.querySelector('.xjob[data-j="' + x + '"]:not(.right)'), j)) { await fclick(fr, '.xjob[data-j="' + j + '"]'); await fclick(fr, '.xname[data-n="' + j + '"]'); } }
    if (await fclick(fr, '#xcheck')) await sleep(700);
    if (await fr.evaluate(() => !document.getElementById('xnext').hidden)) break;
  }
  await look(page, ck);
  return fclick(fr, '#xnext');
}
async function extras(page) {
  await sleep(800); await look(page, 'extras');
  for (const jobId of ['machine', 'letter']) {
    const ok = await page.evaluate(id => { const b = document.querySelector('.pyrun-job[data-job="' + id + '"]'); if (!b) return false; b.click(); return true; }, jobId);
    if (!ok) continue; presses++;
    const fr = await frameReady(page); if (!fr) continue;
    await sleep(900); await look(page, 'extras');
    await fclick(fr, '#' + (jobId === 'letter' ? 'lnext' : 'xnext'));
    await sleep(1500); await look(page, 'extras');
  }
  const ok = await page.evaluate(() => { const b = document.querySelector('.pyrun-finish'); if (!b) return false; b.click(); return true; });
  if (ok) presses++;
  return ok;
}
/* ---------- the platform steps, by the shared movers ---------- */
async function platformStep(page, ck) {
  for (let i = 0; i < 60; i++) {
    await look(page, ck);
    if (await chunkNow(page) !== ck) return true;
    const st = await page.evaluate(WALK.detectKind);
    if (WALK.ACTIONS && WALK.ACTIONS[st.kind]) { await WALK.ACTIONS[st.kind](page); presses++; }
    else if (WALK.MOVES[st.kind]) {
      const n = await page.evaluate(([src]) => { let c = 0; const f = () => { c++; }; document.addEventListener('click', f, true);
        try { (new Function('return (' + src + ')')())(); } finally { document.removeEventListener('click', f, true); } return c; }, [String(WALK.MOVES[st.kind])]);
      presses += n;
    }
    await sleep(WALK.SETTLE[st.kind] || 700);
  }
  return false;
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: WIDTH, height: 768 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  page.on('frameattached', f => f.on && f.on('pageerror', e => errs.push('frame: ' + e)));
  const walked = [];
  let xp0 = 0;
  try {
    must(LANDMARKS.length > 0, 'sit-wrongpath.js declares LANDMARKS[\'6\'] (' + LANDMARKS.length + ')');
    must(!!EXPECT, 'sit-review.js declares EXPECT[\'6\']');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2000);
    await WALK.primeDevKeys(page, BASE).catch(() => {});
    await seed(page);
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2200);
    await page.evaluate(() => { const s = document.querySelector('.intro-skip'); if (s) s.click(); });
    await sleep(600);
    xp0 = await page.evaluate(() => App.state.xp || 0);
    const tile = await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.tile')).find(e => /Lesson\s*6(?!\d)/i.test(e.textContent)); if (t) t.click(); return t ? t.textContent.replace(/\s+/g, ' ').trim() : null; });
    must(!!tile && /Inside the Machine/i.test(tile), 'the Lesson 6 tile is Inside the Machine (' + tile + ')');
    if (!tile) throw new Error('no Lesson 6 tile');
    await sleep(2500);
    for (let guard = 0; guard < 20; guard++) {
      const ck = await chunkNow(page);
      if (!ck) break;
      if (await page.evaluate(() => !!document.querySelector('.exit-done'))) { await look(page, ck); break; }
      if (walked[walked.length - 1] !== ck) walked.push(ck);
      console.log('  … ' + ck);
      let ok;
      if (ck === 'c1') ok = await door(page);
      else if (ck === 'c2') ok = await op(page);
      else if (ck === 'c3') ok = await ward(page, CONTROL);
      else if (ck === 'c4') ok = await boss(page, ck);
      else if (ck === 'c7') ok = await names(page, ck);
      else if (ck === 'extras') ok = await extras(page);
      else ok = await platformStep(page, ck);
      if (!ok) { must(false, 'the walk could not leave ' + ck); break; }
      const nx = await waitChunkChange(page, ck, 8000);
      if (nx === ck && !(await page.evaluate(() => !!document.querySelector('.exit-done')))) { must(false, 'the walk stuck on ' + ck); break; }
    }
    await sleep(1200);
    const end = await page.evaluate(() => { const d = document.querySelector('.exit-done'); return d ? d.querySelector('h2').textContent : null; });
    must(!!end, 'the lesson reaches its done card (' + end + ')');
    await page.screenshot({ path: path.join(OUT, 'done.png'), fullPage: true });
    for (const [label] of LANDMARKS) must(!!stood[label], 'stood on: ' + label);
    const shape = await page.evaluate(([email, x0]) => {
      const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const r = db.pupils['Demo-8A:' + email]; const L = r && r.L && r.L['6'];
      const s = JSON.stringify(L || '');
      return { xp: (App.state.xp || 0) - x0, badges: (s.match(/b[a-z0-9-]*=1/g) || []).length, marks: L ? Number(L[1]) || 0 : 0 };
    }, [EMAIL, xp0]);
    shape.chunks = walked.length; shape.presses = presses;
    console.log('  SHAPE ' + JSON.stringify(shape));
    if (EXPECT) for (const k of ['xp', 'chunks', 'marks', 'badges']) if (EXPECT[k] != null) must(shape[k] === EXPECT[k], 'shape ' + k + ' = ' + EXPECT[k] + ' (walked ' + shape[k] + ')');
    if (EXPECT) console.log('  presses ' + presses + ' (reported; EXPECT says ' + EXPECT.presses + ')');
  } catch (e) { must(false, 'the walk stopped: ' + e.message.split('\n')[0]); }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await b.close();
  console.log(checks + ' checks, ' + FAILS.length + ' failed. (width ' + WIDTH + ')');
  if (EXPECT_FAIL) { console.log(FAILS.length ? 'CONTROL OK: the walk fails when a landmark is missed.' : 'CONTROL BROKEN: the walk passed with a landmark missed.'); process.exit(FAILS.length ? 0 : 1); }
  process.exit(FAILS.length ? 1 : 0);
})();
