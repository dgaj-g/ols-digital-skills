#!/usr/bin/env node
/* l5-walk.js: J3 Lesson 5 "Bug Bounty" (TWO LIGHTS) walked as one pupil on the platform shell.
 *
 * sit-wrongpath.js and sit-review.js press platform buttons; most of this lesson is a page in a frame
 * (assets/twolights/hour.html), so they stand aside for j3-5 and point here, as they do for J1 Lesson 6.
 * This walk takes Orla (Demo-10A) through every step ALONE (pairing off: the solo path, both lights on one
 * laptop), from the tile to the done card. The frame is driven by its own buttons (RUN, the console, the
 * posters, Next) and the program box is typed into the way she would; the platform steps use lib/walk-moves.js.
 * Asserted, not printed:
 *   every landmark in sit-wrongpath.js LANDMARKS['j3-5'] is stood on (page or frame);
 *   the shape (xp, chunks, marks, badges) equals sit-review.js EXPECT['j3-5'];
 *   A12 no dead screen: in every chapter, every look at the bar finds a line on it;
 *   A13 no one-way door: mid-chapter, a reload brings back the same chapter, the same program, the same bounties.
 * CONTROL: --control adds a landmark nobody can stand on; the run must then FAIL (--expect-fail proves it).
 *
 *   node ks3-dt/tools/record-tutorial/l5-walk.js [--base http://localhost:8121] [--width 1366] [--control --expect-fail]
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
const OUT = path.join(__dirname, 'qa-l2-l5-review', 'l5-walk', String(WIDTH));
fs.mkdirSync(OUT, { recursive: true });
const CLASS = 'Demo-10A', EMAIL = 'orla.mccann@demo';
const URL = BASE + '/ks3-dt/platform/index.html?class=' + CLASS + '&as=orla';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let checks = 0; const FAILS = [];
const must = (ok, what) => { checks++; console.log((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) FAILS.push(what); return ok; };

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
const LANDMARKS = (table('sit-wrongpath.js', /const\s+LANDMARKS\s*=/, 'j3-5') || []).slice();
const EXPECT = table('sit-review.js', /const\s+EXPECT\s*=/, 'j3-5');
if (CONTROL) LANDMARKS.push(['CONTROL: a landmark nobody can stand on', '.no-such-surface-anywhere', 'ch2']);
const stood = {};

async function seed(page) {
  await page.evaluate(([email, cls]) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks[cls] = db.locks[cls] || {};
    for (const n of ['1', '2', '3', '4', '5']) db.locks[cls][n] = { u: now, on: 1 };
    db.cfg = db.cfg || {}; db.cfg[cls] = db.cfg[cls] || {}; db.cfg[cls].pairing = { on: 0 };
    const kk = cls + ':' + email;
    db.pupils = db.pupils || {};
    const rec = db.pupils[kk] || { n: 'Orla McCann', cn: '', j: 3, xp: 0, g: '' };
    rec.L = rec.L || {};
    for (const n of ['1', '2', '3', '4']) if (!rec.L[n] || Number(rec.L[n][0]) !== 2) rec.L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + Number(n), 10, 0, '', 0, 0];
    delete rec.L['5'];
    db.pupils[kk] = rec;
    const up = (db.userProps || {})[email];
    if (up && up.draft) Object.keys(up.draft).forEach(k => { if (/:5:/.test(k)) delete up.draft[k]; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, [EMAIL, CLASS]);
}
const chunkNow = page => page.evaluate(() => { const s = window.App && App.state; return s && s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; });
const frameOf = async page => { const h = await page.$('iframe.rescue-frame'); return h ? h.contentFrame() : null; };
/* the lesson has ended when its done card shows on the LAST chunk (extras sits after the closing screen here) */
const ENDED = () => { const s = window.App && App.state; return !!document.querySelector('.badge-pop-card.finish') || (!!document.querySelector('.exit-done') && !!s && s.chunks && s.chunkIdx >= s.chunks.length - 1); };
const VISIBLE = sel => { const els = document.querySelectorAll(sel); for (const e of els) { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none') return true; } return false; };

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
const badgeSeen = {};
async function waitChunkChange(page, from, ms) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const c = await chunkNow(page); if (c !== from) return c;
    const pop = await page.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (!b || document.querySelector('.badge-pop-card .finish-glyph')) return null; const im = document.querySelector('.badge-pop-card img'); return { name: (document.querySelector('.badge-pop-name') || {}).textContent || '', img: !!(im && im.complete && im.naturalWidth > 0), off: b.disabled || b.getAttribute('aria-disabled') === 'true' }; });
    if (pop && !pop.off && !badgeSeen[pop.name]) { await page.waitForFunction(() => { const im = document.querySelector('.badge-pop-card img'); return im && im.complete; }, null, { timeout: 5000 }).catch(() => {}); const img = await page.evaluate(() => { const im = document.querySelector('.badge-pop-card img'); return im ? im.naturalWidth + ' ' + im.getAttribute('src') : 'none'; }); badgeSeen[pop.name] = 1; must(/^[1-9]/.test(img), 'the "' + pop.name + '" badge card shows its picture (' + img + ')'); }
    if (pop && !pop.off) { await page.click('.badge-pop button').catch(() => {}); presses++; }
    await sleep(300);
  }
  return from;
}
async function frameReady(page) {
  for (let i = 0; i < 50; i++) {
    const fr = await frameOf(page);
    if (fr) { const ok = await fr.evaluate(() => document.title === 'ready' || !!window.TLUI).catch(() => false); if (ok) return fr; }
    await sleep(300);
  }
  return null;
}
/* every button she presses must sit wholly on her screen, unscrolled: the frame's bottom is the laptop's bottom */
const offScreen = {};
const fclick = (fr, sel) => fr.evaluate(s => { const b = document.querySelector(s); if (!b || b.disabled || b.hidden) return false; const r = b.getBoundingClientRect(); const fit = r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; b.click(); return { fit, y: Math.round(r.bottom), h: innerHeight }; }, sel).then(ok => { if (ok) { presses++; if (!ok.fit && !offScreen[sel]) { offScreen[sel] = 1; must(false, 'the ' + sel + ' button sits on screen (bottom ' + ok.y + ' of ' + ok.h + ')'); } } return !!ok; });
async function waitShown(fr, sel, ms) {
  return fr.waitForFunction(s => { const b = document.querySelector(s); return b && !b.hidden && !b.disabled; }, sel, { timeout: ms }).then(() => true, () => false);
}

/* ---------- one move of a pupil inside a chapter: whatever the bar tells her ---------- */
const STEP = () => {
  const T = window.TLUI; if (!T || !T.E) return { act: 'none' };
  const E = T.E, PR = window.TwoLightsPrograms, J = window.TwoLightsJudge, c = T.stage, $ = id => document.getElementById(id);
  const barText = ($('barline').textContent || '').trim();
  const go = $('go'); if (go && !go.hidden && !go.disabled) { go.click(); return { act: 'go', bar: barText }; }
  const bar = E.bar() || {}, id = bar.id || '', s = E.S.active, L = E.S.L[s];
  const poster = k => document.querySelector('#board .poster[data-k="' + k + '"]') || document.querySelector('.poster[data-k="' + k + '"]');
  if (id === 'bar.name' && L && L.nameQ.length) { const k = J.KIND[L.nameQ[0]], p = poster(k); if (p) p.click(); else { E.name(k); T.render(); } return { act: 'name', bar: barText }; }
  if (id === 'bar.name' && bar.card) { if (!E.S.cardPick) { const p = poster(E.card().kind); if (p) { p.click(); return { act: 'card', bar: barText }; } } return { act: 'wait', bar: barText }; }
  if (id === 'bar.readred') { $('conwrap').click(); return { act: 'readred', bar: barText }; }
  if (id === 'bar.run') { if ($('run').disabled) return { act: 'wait', bar: barText }; $('run').click(); return { act: 'run', bar: barText }; }
  if (id === 'bar.fixline' || id === 'bar.putback' || id === 'bar.hunt' || /^solo\./.test(id)) {
    const SEAT = PR.SEATS[s], cur = E.code(s, c); let after;
    if (c === 'ch1') after = cur.indexOf('lampp_on') >= 0 ? PR.ch1(SEAT, 1) : PR.ch1(SEAT, 2);
    else if (c === 'ch2') after = PR.ch2(SEAT, true);
    else if (c === 'ch3') after = PR.ch3(SEAT, 'after');
    else {
      const iss = E.topIssue(), f = L.live[c] || J.judge(c, s, cur, { variant: L.variant });
      after = PR.ch4(SEAT, Object.keys(f.faults).filter(k => f.faults[k].present && (!iss || k !== iss.id)));
    }
    const ed = $('ed'); ed.value = after; ed.dispatchEvent(new Event('input', { bubbles: true }));
    $('run').click(); return { act: 'fix', bar: barText };
  }
  return { act: 'wait:' + id, bar: barText };
};
const snap = fr => fr.evaluate(() => { const E = TLUI.E, s = E.S.active; let paid = 0; E.S.local.forEach(x => { const b = E.S.L[x].bounty; for (const k in b) if (b[k] === 'paid') paid++; }); return { stage: TLUI.stage, active: s, code: E.code(s), paid, bar: (document.getElementById('barline').textContent || '').trim() }; });

let emptyBars = 0, barLooks = 0;
async function chapter(page, ck) {
  let fr = await frameReady(page); if (!fr) return false;
  await sleep(600); await look(page, ck);
  let reloaded = false, moves = 0;
  for (let i = 0; i < 400; i++) {
    if (await chunkNow(page) !== ck) return true;
    fr = await frameOf(page); if (!fr) { await sleep(300); continue; }
    const r = await fr.evaluate(STEP).catch(() => ({ act: 'gone' }));
    if (r.act === 'gone') { await sleep(400); continue; }
    barLooks++; if (!r.bar) emptyBars++;
    if (process.env.DBG && r.act + r.bar !== chapter.last) { chapter.last = r.act + r.bar; console.log('    ' + ck + ' ' + r.act + ' · ' + r.bar); }
    if (r.act !== 'wait' && !/^wait|none/.test(r.act)) { presses++; moves++; }
    if (r.act === 'go') { await sleep(800); await look(page, ck); return true; }   // the badge card, if any, is waitChunkChange's
    await sleep(r.act === 'run' || r.act === 'fix' ? 900 : 450);
    await look(page, ck);
    /* A13: once she has done something real in this chapter, the page is reloaded and must bring it all back */
    if (!reloaded && moves >= 3 && (r.act === 'fix' || r.act === 'name')) {
      reloaded = true;
      const before = await snap(fr).catch(() => null);
      await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500);
      /* a reload lands on the hub, as it does for her: she opens the Lesson 5 tile again */
      await page.evaluate(() => { const s = document.querySelector('.intro-skip'); if (s) s.click(); }); await sleep(500);
      if (!await chunkNow(page)) { await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.tile')).find(e => /Lesson\s*5(?!\d)/i.test(e.textContent)); if (t) t.click(); }); await sleep(3000); }
      const back = await chunkNow(page);
      must(back === ck, 'A13 a reload in ' + ck + ' comes back to ' + ck + ' (came back to ' + back + ')');
      fr = await frameReady(page);
      const after = fr ? await snap(fr).catch(() => null) : null;
      must(!!(before && after && after.stage === before.stage), 'A13 ' + ck + ': the frame comes back on the same stage');
      must(!!(before && after && after.code === before.code && after.active === before.active), 'A13 ' + ck + ': the same light and the same program come back');
      must(!!(before && after && after.paid === before.paid), 'A13 ' + ck + ': the bounties come back (' + (before && before.paid) + ' paid)');
      must(!!(after && after.bar), 'A13 ' + ck + ': the bar has its line after the reload');
    }
  }
  return false;
}
async function scene(page, ck, btn) {
  const fr = await frameReady(page); if (!fr) return false;
  await sleep(800); await look(page, ck);
  if (!await waitShown(fr, btn, 90000)) return false;
  await look(page, ck);
  return fclick(fr, btn);
}
async function tour(page, ck) {
  const fr = await frameReady(page); if (!fr) return false;
  await sleep(900); await look(page, ck);
  for (let i = 0; i < 20; i++) {
    if (await chunkNow(page) !== ck) return true;
    if (!await waitShown(fr, '#tournext', 30000)) break;
    await fclick(fr, '#tournext'); await sleep(500); await look(page, ck);
  }
  return (await chunkNow(page)) !== ck;
}
async function extras(page) {
  const fr = await frameReady(page); if (!fr) return false;
  await sleep(800); await look(page, 'extras');
  /* one poster done the way she would: fix it, RUN, name it; then the way out */
  await fr.evaluate(() => { const x = TwoLightsPrograms.EXTRAS[0], t = document.getElementById('xsrc'); t.value = x.fixed; });
  await fclick(fr, '#xrun'); await sleep(600); await look(page, 'extras');
  await fr.evaluate(() => { const k = TwoLightsPrograms.EXTRAS[0].kind, p = document.querySelector('#xboard .poster[data-k="' + k + '"]'); if (p) p.click(); }); presses++;
  await sleep(700); await look(page, 'extras');
  if (await fclick(fr, '#xnext')) { await sleep(600); await look(page, 'extras'); }
  return fclick(fr, '#xfin');
}
async function platformStep(page, ck) {
  for (let i = 0; i < 60; i++) {
    await look(page, ck);
    if (await chunkNow(page) !== ck) return true;
    if (await page.evaluate(ENDED)) return true;
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
    must(LANDMARKS.length > 0, 'sit-wrongpath.js declares LANDMARKS[\'j3-5\'] (' + LANDMARKS.length + ')');
    must(!!EXPECT, 'sit-review.js declares EXPECT[\'j3-5\']');
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2000);
    await WALK.primeDevKeys(page, BASE).catch(() => {});
    await seed(page);
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2200);
    await page.evaluate(() => { const s = document.querySelector('.intro-skip'); if (s) s.click(); });
    await sleep(600);
    xp0 = await page.evaluate(() => App.state.xp || 0);
    const tile = await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.tile')).find(e => /Lesson\s*5(?!\d)/i.test(e.textContent)); if (t) t.click(); return t ? t.textContent.replace(/\s+/g, ' ').trim() : null; });
    must(!!tile && /Bug Bounty/i.test(tile), 'the Lesson 5 tile is Bug Bounty (' + tile + ')');
    if (!tile) throw new Error('no Lesson 5 tile');
    await sleep(2500);
    for (let guard = 0; guard < 24; guard++) {
      const ck = await chunkNow(page);
      if (!ck) break;
      if (await page.evaluate(ENDED)) { await look(page, ck); break; }
      if (walked[walked.length - 1] !== ck) walked.push(ck);
      console.log('  … ' + ck);
      let ok;
      if (ck === 'radio' || ck === 'coldopen') ok = await scene(page, ck, '#snext');
      else if (ck === 'tour') ok = await tour(page, ck);
      else if (/^ch[1-4]$/.test(ck)) ok = await chapter(page, ck);
      else if (ck === 'home') ok = await scene(page, ck, '#hnext');
      else if (ck === 'extras') ok = await extras(page);
      else ok = await platformStep(page, ck);
      if (!ok && await page.evaluate(ENDED)) { await look(page, ck); break; }
      if (!ok) { console.log('  DBG', await page.evaluate(() => [...document.querySelectorAll('iframe')].map(f => f.className + ' ' + (f.src || '').slice(0, 90)).join(' / '))); const fz = await frameOf(page); if (fz) console.log('  DBG title', await fz.evaluate(() => document.title + ' snext=' + JSON.stringify((d => d && { h: d.hidden, dis: d.disabled })(document.getElementById('snext'))))); must(false, 'the walk could not leave ' + ck); await page.screenshot({ path: path.join(OUT, 'stuck-' + ck + '.png') }); break; }
      const nx = await waitChunkChange(page, ck, 9000);
      if (nx === ck && !(await page.evaluate(ENDED))) { must(false, 'the walk stuck on ' + ck); break; }
    }
    await sleep(1200);
    const end = await page.evaluate(() => { const d = document.querySelector('.badge-pop-card.finish') || document.querySelector('.exit-done'); return d ? d.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : null; });
    must(!!end, 'the lesson reaches its done card (' + end + ')');
    await page.screenshot({ path: path.join(OUT, 'done.png'), fullPage: true });
    for (const [label] of LANDMARKS) must(!!stood[label], 'stood on: ' + label);
    must(barLooks > 0 && emptyBars === 0, 'A12 no dead screen: the bar had a line at every one of ' + barLooks + ' looks (' + emptyBars + ' empty)');
    const shape = await page.evaluate(([email, cls, x0]) => {
      const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const r = db.pupils[cls + ':' + email]; const L = r && r.L && r.L['5'];
      return { xp: (App.state.xp || 0) - x0, marks: L ? Number(L[1]) || 0 : 0 };
    }, [EMAIL, CLASS, xp0]);
    shape.chunks = walked.length; shape.presses = presses; shape.badges = Object.keys(badgeSeen).length;
    console.log('  SHAPE ' + JSON.stringify(shape) + '  walked ' + walked.join(' '));
    if (EXPECT) for (const k of ['xp', 'chunks', 'marks', 'badges']) if (EXPECT[k] != null) must(shape[k] === EXPECT[k], 'shape ' + k + ' = ' + EXPECT[k] + ' (walked ' + shape[k] + ')');
    if (EXPECT) console.log('  presses ' + presses + ' (reported; EXPECT says ' + EXPECT.presses + ')');
  } catch (e) { must(false, 'the walk stopped: ' + e.message.split('\n')[0]); }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await b.close();
  console.log(checks + ' checks, ' + FAILS.length + ' failed. (width ' + WIDTH + ')');
  if (EXPECT_FAIL) { console.log(FAILS.length ? 'CONTROL OK: the walk fails when a landmark is missed.' : 'CONTROL BROKEN: the walk passed with a landmark missed.'); process.exit(FAILS.length ? 0 : 1); }
  process.exit(FAILS.length ? 1 : 0);
})();
