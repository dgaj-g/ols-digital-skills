#!/usr/bin/env node
/* l6-walk.js: J1 Lesson 6 "Inside the Machine" (THE OPERATION V2, 27 Nov 2026) walked as one pupil on the platform shell.
 *
 * sit-wrongpath.js and sit-review.js press platform buttons; most of this lesson is a page in a frame
 * (assets/l6/operation.html, and the contest: assets/l6/contest.html), so they stand aside for lesson 6 and point here.
 * This walk takes Anya (Demo-8A) through every step of the lesson ALONE, from the tile to the done card:
 * the frame steps are driven inside the frame (its own buttons, or the OPUI hooks the keyboard uses; the contest by
 * its own buttons only, solo against Bernadette, all 17 questions, the film, the result),
 * the platform steps by the shared movers in lib/walk-moves.js. Coverage is ASSERTED, not printed:
 *   every landmark in sit-wrongpath.js LANDMARKS['6'] must be stood on (on the page or inside the frame),
 *   and the walk's shape (xp, chunks, presses, marks, badges) must equal sit-review.js EXPECT['6'].
 * CONTROL: --control adds a landmark nobody can stand on and leaves the discharge letter unopened in the extra jobs;
 * the run must then FAIL. Run it with --expect-fail to prove that.
 *
 *   node ks3-dt/tools/record-tutorial/l6-walk.js [--base http://localhost:8121] [--width 1366] [--control --expect-fail]
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
const OUT = path.join(__dirname, 'qa-l2-l5-review', 'l6-walk', String(WIDTH));
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
    /* one pupil, one PC: the walk is the solo path (sit-review does the same); the pair path is l6-harness and the smoke */
    db.cfg = db.cfg || {}; db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {}; db.cfg['Demo-8A'].pairing = { on: 0 };
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
/* --transcript <file>: every distinct screen's visible words, in her order, for the cold readers (DFM 270) */
const TX = argOf('--transcript', '');
let txLast = '';
async function tx(page, ck) {
  if (!TX) return;
  const vis = () => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const e = n.parentElement; if (!e || !n.textContent.trim()) continue; if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName)) continue;
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (r.width <= 0 || r.height <= 0 || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      out.push(n.textContent.replace(/\s+/g, ' ').trim()); }
    return out.join('\n'); };
  const top = await page.evaluate(vis).catch(() => '');
  const fr = await frameOf(page); const inner = fr ? await fr.evaluate(vis).catch(() => '') : '';
  const text = (inner ? inner + '\n[platform around the frame]\n' : '') + top;
  if (text === txLast) return; txLast = text;
  fs.appendFileSync(TX, '\n----- screen (' + ck + ') -----\n' + text + '\n');
}
async function look(page, ck) {
  await tx(page, ck);
  const fr = await frameOf(page);
  for (const [label, sel, at] of LANDMARKS) {
    if (at !== ck || stood[label]) continue;
    let ok = await page.evaluate(VISIBLE, sel).catch(() => false);
    if (!ok && fr) ok = await fr.evaluate(VISIBLE, sel).catch(() => false);
    if (ok) { stood[label] = true; await page.screenshot({ path: path.join(OUT, ck + '-' + Object.keys(stood).length + '.png') }); }
  }
}
let presses = 0;
const badgeSeen = {};
async function waitChunkChange(page, from, ms) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const c = await chunkNow(page); if (c !== from) return c;
    /* a badge card stands between chunks: its picture must have loaded, then Onward */
    const pop = await page.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (!b) return null; const im = document.querySelector('.badge-pop-card img'); return { name: (document.querySelector('.badge-pop-name') || {}).textContent || '', img: !!(im && im.complete && im.naturalWidth > 0), off: b.disabled || b.getAttribute('aria-disabled') === 'true' }; });
    if (pop && !pop.off && !badgeSeen[pop.name]) { await page.waitForFunction(() => { const im = document.querySelector('.badge-pop-card img'); return im && im.complete; }, null, { timeout: 5000 }).catch(() => {}); const img = await page.evaluate(() => { const im = document.querySelector('.badge-pop-card img'); return im ? im.naturalWidth + ' ' + im.getAttribute('src') : 'none'; }); badgeSeen[pop.name] = 1; must(/^[1-9]/.test(img), 'the "' + pop.name + '" badge card shows its picture (' + img + ')'); }
    if (pop && !pop.off) { await page.click('.badge-pop button').catch(() => {}); presses++; }
    await sleep(300);
  }
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
  /* card 1's Next wakes once the patient has spoken (V2 D1: two cards), then card 2 shows Begin */
  await fr.waitForFunction(() => { const b = document.getElementById('doornext'); return b && !b.hidden && !b.disabled; }, null, { timeout: 15000 }).catch(() => {});
  await fclick(fr, '#doornext');
  await fr.waitForFunction(() => { const b = document.getElementById('beginbtn'); return b && !b.hidden && !b.disabled; }, null, { timeout: 15000 }).catch(() => {});
  await look(page, 'c1');
  const ok = await fclick(fr, '#beginbtn');
  if (!ok) console.log('  door: begin not clickable', await fr.evaluate(() => { const b = document.getElementById('beginbtn'); return JSON.stringify({ b: b && { d: b.disabled, h: b.hidden }, hash: location.hash.slice(0, 200), door: !!document.querySelector('#begin.on') }); }));
  return ok;
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
    if (first) { await fr.evaluate(x => { const c = [...document.querySelectorAll('#cardlist .card')].find(e => e.dataset.key !== x); if (c) c.click(); }, p); presses++; await sleep(500); await look(page, 'c2'); first = false; }
    await fr.evaluate(x => OPUI.card(x), p); presses++; await sleep(500);
  }
  await sleep(1200); await look(page, 'c2');
  return fclick(fr, '#nextbtn');
}
/* the contest (V2): solo against Bernadette, by the page's own buttons. One wrong answer on question 2 (a pupil
   who slips), every other answer right; the film in round 3 is watched to its end. */
const CQ = require('../../platform/assets/l6/contest.js');
function pickFor(i, rightOne) { const q = CQ.Q[i]; const r = CQ.rightChar(i); if (rightOne) return r; if (q.kind === 'part') return String((+r + 1) % 7); return r === '1' ? '2' : '1'; }
async function contest(page) {
  let fr = null;
  for (let i = 0; i < 40 && !fr; i++) { const f = await frameOf(page); if (f && await f.evaluate(() => !!(window.L6C && document.body.dataset.phase)).catch(() => false)) fr = f; else await sleep(300); }
  if (!fr) return false;
  const sel = (a, v) => v == null ? `#card [data-act="${a}"]:not([disabled]), #side [data-act="${a}"]:not([disabled])` : `#card [data-act="${a}"][data-v="${v}"]:not([disabled])`;
  const act = async (a, v, ms) => { await fr.waitForSelector(sel(a, v), { timeout: ms || 8000 }); await fr.click(sel(a, v)); presses++; };
  const has = (a, v) => fr.evaluate(s => !!document.querySelector(s), sel(a, v));
  const st = () => fr.evaluate(() => ({ ph: document.body.dataset.phase || '', rev: document.body.dataset.rev === '1', q: L6C.E.view().q }));
  await sleep(700); await look(page, 'c3');
  /* the green Stuck? Show me, opened once and closed: closing touches nothing */
  await fr.click('#helpBtn'); await sleep(300); await look(page, 'c3'); await fr.click('#helpClose'); await sleep(200);
  await act('start');
  let answered = -1, filmSeen = false;
  for (let guard = 0; guard < 400; guard++) {
    const v = await st(); await look(page, 'c3');
    if (v.ph === 'intro') { if (await has('filmplay')) await act('filmplay'); else await act('introgo'); }
    else if (v.ph === 'film') {
      if (await has('filmgo')) { filmSeen = true; await look(page, 'c3'); await act('filmgo'); }
      else { await sleep(1000); continue; }
    }
    else if (v.ph === 'q' && v.rev) { await sleep(500); await look(page, 'c3'); await act('next'); }
    else if (v.ph === 'q' && answered !== v.q) {
      const i = v.q, q = CQ.Q[i], rightOne = i !== 1;
      if (q.kind === 'order') {
        for (let g = 0; g < 12; g++) {
          const cur = await fr.$$eval('#card .order .block', bs => bs.map(b => +b.dataset.k));
          const pos = [0, 1, 2, 3].findIndex((k, j) => cur[j] !== k); if (pos === -1) break;
          await fr.click(`#card .order .block[data-k="${pos}"] [data-act="up"]`); presses++; await sleep(80);
          await look(page, 'c3');
        }
        await act('lock');
      } else await act('pick', pickFor(i, rightOne));
      answered = i;
    }
    else if (v.ph === 'result') { await sleep(600); await look(page, 'c3'); must(filmSeen, 'the contest film played to its end before round 3'); await act('cont'); return true; }
    await sleep(350);
  }
  return false;
}
/* the extra jobs (V2): three of the six, each by its own way out. Your own PC to its end (Back to the extra jobs at
   the foot ticks it done); the discharge letter (its own button); a second patient left part-way by the top bar's Back. */
async function extras(page, skipLetter) {
  await sleep(800); await look(page, 'extras');
  const hubBack = () => page.waitForFunction(() => !!document.querySelector('.op-hub .pyrun-job'), null, { timeout: 8000 }).then(() => true, () => false);
  for (const jobId of skipLetter ? ['own', 'desmond'] : ['own', 'letter', 'desmond']) {
    const ok = await page.evaluate(id => { const b = document.querySelector('.op-hub .pyrun-job[data-job="' + id + '"]'); if (!b) return false; b.click(); return true; }, jobId);
    if (!must(ok, 'the extra job "' + jobId + '" opens from the list')) continue; presses++;
    const fr = await frameReady(page); if (!must(!!fr, 'the extra job "' + jobId + '" loads')) continue;
    await sleep(900); await look(page, 'extras');
    if (jobId === 'own') { for (let i = 0; i < 4 && await fclick(fr, '#xfnext'); i++) { await sleep(400); await look(page, 'extras'); } await fclick(fr, '#xnext'); }
    else if (jobId === 'letter') await fclick(fr, '#lnext');
    else {
      /* a second patient: through its door to the table, one part out, then the top bar's Back (nothing is lost) */
      await fr.waitForFunction(() => window.OPUI && OPUI.S, null, { timeout: 10000 }).catch(() => {});
      for (const b of ['#doornext', '#beginbtn']) { await fr.waitForFunction(id => { const e = document.querySelector(id); return e && !e.hidden && !e.disabled; }, b, { timeout: 15000 }).catch(() => {}); await fclick(fr, b); await sleep(500); }
      for (let i = 0; i < 12 && await fr.evaluate(() => OPUI.tour && OPUI.tour.active()); i++) { await fclick(fr, '#tournext'); await sleep(250); }
      await sleep(600); await look(page, 'extras');
      await fclick(fr, '#xback');
    }
    must(await hubBack(), 'the extra job "' + jobId + '" comes back to the list of jobs');
    await sleep(700); await look(page, 'extras');
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
      else if (ck === 'c3') ok = await contest(page);
      else if (ck === 'extras') ok = await extras(page, CONTROL);
      else ok = await platformStep(page, ck);
      if (!ok && await page.evaluate(() => !!document.querySelector('.exit-done'))) { await look(page, ck); break; }
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
    shape.chunks = walked.length; shape.presses = presses; shape.badges = Object.keys(badgeSeen).length;
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
