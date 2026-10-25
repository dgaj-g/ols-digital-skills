#!/usr/bin/env node
/* qa-l6-paired.js: J1 Lesson 6 THE OPERATION with TWO (or three) REAL PUPILS on the platform, over the REAL live link.
 *
 * Every other L6 gate either walks one pupil (l6-walk) or runs the frame page on its own (l6-harness). Nothing
 * ran the platform's own pairing (pairJoin -> room -> frame hash) with two accounts at once, so this does:
 * one browser, one shared dev store, one tab per pupil (?as=anya, ?as=cara, ?as=ryan), Firebase for real.
 *
 *   --scenario pair      both pupils from the tile to the done card, sharing the patient and the ward
 *   --scenario gone      paired, then Cara's laptop shuts before her page opens: Anya must still have a way on
 *   --scenario midop     paired, Cara pulls a part and her laptop shuts mid-operation: Anya must still finish
 *   --scenario blocked   Cara's live link is blocked (she is told to sit with Anya): Anya must still have a way on
 *   --scenario reload    Anya reloads mid-operation and lands back on the same patient with the same parts sealed
 *   --scenario trio      three pupils open together: one room of three, three seats
 *   --scenario all       every one of the above (default)
 *
 *   node ks3-dt/tools/record-tutorial/qa-l6-paired.js [--base http://localhost:8131] [--scenario all] [--width 1366]
 * Writes the dev store only (Demo-8A). Screenshots into out/l6-paired. Exit 1 on any failed check.
 */
'use strict';
const RT = __dirname;
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const WALK = require(RT + '/lib/walk-moves.js');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8131');
const WIDTH = Number(argOf('--width', '1366'));
const SCEN = argOf('--scenario', 'all');
const WAIT_ALONE_S = Number(argOf('--alone-wait', '75'));
const OUT = path.join(RT, 'out', 'l6-paired'); fs.mkdirSync(OUT, { recursive: true });
const CLS = 'Demo-8A';
const WHO = { anya: 'anya.murphy@demo', cara: 'cara.devlin@demo', ryan: 'ryan.fitzsimons@demo' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now(); const ts = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's ';
let checks = 0; const FAILS = []; const NOTES = [];
const must = (ok, what) => { checks++; console.log(ts() + (ok ? 'PASS ' : 'FAIL ') + what); if (!ok) FAILS.push(SCEN_NOW + ': ' + what); return ok; };
const note = s => { console.log(ts() + '     ' + s); NOTES.push(SCEN_NOW + ': ' + s); };
let SCEN_NOW = '';

async function open(ctx, who, errs, opts) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: WIDTH, height: 768 });
  if (opts && opts.blockLive) {
    /* her school's network blocks the live link: the Firebase scripts load from the platform, but the database host never answers */
    await page.route(/firebasedatabase\.app|firebaseio\.com/, r => r.abort());
    await page.routeWebSocket(/firebasedatabase\.app|firebaseio\.com/, ws => ws.close());
  }
  page.on('pageerror', e => errs.push(who + ': ' + String(e).split('\n')[0]));
  page.on('response', r => { if (r.status() >= 400 && !/favicon|dev-keys\.json/.test(r.url())) errs.push(who + ' ' + r.status() + ' ' + r.url().replace(BASE, '').slice(0, 140)); });
  const blocked = !!(opts && opts.blockLive);   // the requests the rig itself aborts are logged as ERR_FAILED on that laptop only
  page.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR_ABORTED|404 \(File not found\)|status of 404/.test(m.text()) && !(blocked && /net::ERR_FAILED/.test(m.text()))) errs.push(who + ' console: ' + m.text().slice(0, 160)); });
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=' + CLS + '&as=' + who, { waitUntil: 'domcontentloaded' });
  await sleep(1800);
  return page;
}
async function seed(page, names) {
  await page.evaluate(([cls, emails]) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks[cls] = db.locks[cls] || {};
    for (const n of ['1', '2', '3', '4', '5', '6']) db.locks[cls][n] = { u: now, on: 1 };
    db.cfg = db.cfg || {}; db.cfg[cls] = db.cfg[cls] || {}; db.cfg[cls].pairing = { on: 1 };
    db.pupils = db.pupils || {};
    for (const email of emails) {
      const kk = cls + ':' + email;
      const rec = db.pupils[kk] || { n: email.split('.')[0], cn: '', j: 1, xp: 0, g: '' };
      rec.L = rec.L || {};
      for (const n of ['1', '2', '3', '4', '5']) if (!rec.L[n] || Number(rec.L[n][0]) !== 2) rec.L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + Number(n), 10, 0, '', 0, 0];
      delete rec.L['6'];
      db.pupils[kk] = rec;
      const up = (db.userProps || {})[email];
      if (up && up.draft) Object.keys(up.draft).forEach(k => { if (/:6:|j1-06/.test(k)) delete up.draft[k]; });
    }
    /* a clean pairing slate for the class: no old pairs, no queue, nobody present */
    ['pairing', 'pq'].forEach(store => { if (db[store]) Object.keys(db[store]).forEach(k => { if (k.indexOf(cls + '|') === 0) delete db[store][k]; }); });
    if (db.pres) db.pres[cls] = {};
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, [CLS, names.map(n => WHO[n])]);
}
async function openLesson6(page) {
  await page.evaluate(() => { const s = document.querySelector('.intro-skip'); if (s) s.click(); });
  await sleep(500);
  return page.evaluate(() => { const t = Array.from(document.querySelectorAll('.tile')).find(e => /Lesson\s*6(?!\d)/i.test(e.textContent)); if (t) t.click(); return !!t; });
}
const chunkNow = page => page.evaluate(() => { const s = window.App && App.state; return s && s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; });
const frameOf = async page => { const h = await page.$('#chunk-host iframe.rescue-frame'); return h ? h.contentFrame() : null; };
async function frameReady(page, ms) {
  const end = Date.now() + (ms || 15000);
  while (Date.now() < end) {
    const fr = await frameOf(page);
    if (fr) { const ok = await fr.evaluate(() => document.title === 'ready').catch(() => false); if (ok) return fr; }
    await sleep(250);
  }
  return null;
}
const hashOf = fr => fr.evaluate(() => { try { return JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch (e) { return null; } });
const fclick = (fr, sel) => fr.evaluate(s => { const b = document.querySelector(s); if (!b || b.disabled || b.hidden) return false; b.click(); return true; }, sel).catch(() => false);
/* what the platform shows while the frame is not up: the waiting card, its heading and line */
const waitCard = page => page.evaluate(() => { const c = document.querySelector('#chunk-host .pair-wait'); if (!c) return null; return { h: (c.querySelector('h2') || {}).textContent || '', s: (c.querySelector('.pw-status') || {}).textContent || '', own: !!c.querySelector('.pw-own') }; });
/* watch every heading the platform shows between one chunk and its frame: the wording must be the lesson's own */
async function watchMount(page, tag, ms) {
  const seen = new Set(); const end = Date.now() + ms;
  while (Date.now() < end) {
    const w = await waitCard(page).catch(() => null); if (w) seen.add(w.h + ' | ' + w.s);
    const fr = await frameOf(page); if (fr && await fr.evaluate(() => document.title === 'ready').catch(() => false)) break;
    await sleep(40);
  }
  const all = [...seen];
  if (all.length) note(tag + ' showed while opening: ' + all.join(' || '));
  must(!all.some(s => /Vault/i.test(s)), tag + ': no Vault wording (J1 Lesson 2) while the next stage opens');
  return all;
}
async function doorState(fr) {
  return fr.evaluate(() => { const b = document.getElementById('beginbtn'); const d = document.getElementById('door');
    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.hidden; };
    const btns = [...document.querySelectorAll('button')].filter(x => vis(x) && !x.disabled).map(x => (x.id || x.className) + ':' + x.textContent.trim().slice(0, 40));
    return { door: !!(d && d.classList.contains('on')), begin: !!(b && !b.disabled && vis(b)), together: (document.getElementById('together') || {}).textContent || '',
      away: vis(document.getElementById('away')), awaysay: (document.getElementById('awaysay') || {}).textContent || '', buttons: btns, stage: window.OPUI && OPUI.S ? OPUI.S.stage : null }; }).catch(e => ({ err: String(e) }));
}
/* c2 opens straight at the table (no door): wait until the operation is running */
async function waitOp(fr, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const st = await fr.evaluate(() => window.OPUI && OPUI.S ? OPUI.S.stage : null).catch(() => null); if (st === 'op' || st === 'done') return st; await sleep(300); }
  return fr.evaluate(() => window.OPUI && OPUI.S ? OPUI.S.stage : null).catch(() => null);
}
async function waitWayOn(fr, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const d = await doorState(fr); if (d.begin || d.buttons.some(b => /^alonebtn:/.test(b))) return d; await sleep(500); }
  return await doorState(fr);
}
const APPROVED = { label: 'Work on my own', say: 'Waiting a while? You can work on your own instead.' };
async function alonePath(page, fr, tag) {
  const t = Date.now();
  const d = await waitWayOn(fr, WAIT_ALONE_S * 1000);
  note(tag + ' way on after ' + ((Date.now() - t) / 1000).toFixed(1) + ' s: ' + JSON.stringify({ buttons: d.buttons, together: d.together }));
  await shot(page, tag + '-door-alone');
  const own = d.buttons.find(b => /^alonebtn:/.test(b));
  must(!!own, tag + ' is offered the work-alone button at the door');
  if (!own) return false;
  must(own === 'alonebtn:' + APPROVED.label, tag + ': the button says the approved words (' + own + ')');
  must(d.together.indexOf(APPROVED.say) !== -1, tag + ': the door line carries the approved words (' + d.together + ')');
  must(!d.begin, tag + ': Begin stays greyed while the partner is away');
  await fclick(fr, '#alonebtn');
  const c = await chunkChange(page, 'c1', 10000);
  must(c === 'c2', tag + ' moved on to the operation (' + c + ')');
  if (c !== 'c2') return false;
  const op = await frameReady(page, 20000);
  if (!must(!!op, tag + ': the operation page opened')) return false;
  const h = await hashOf(op);
  must(h && h.seats.length === 1 && !h.room, tag + ' works on her own from here (seats ' + JSON.stringify(h && h.seats) + ', room ' + (h && h.room) + ')');
  await op.waitForFunction(() => window.OPUI && OPUI.S, null, { timeout: 10000 }).catch(() => {});
  const st = await waitOp(op, 20000);
  must(st === 'op', 'the operation runs for ' + tag + ' on her own (' + st + ')');
  const ok = await operate([op], { ms: 60000 });
  must(ok === true, tag + ' finishes the patient on her own');
  await shot(page, tag + '-op-alone-done');
  await sleep(1200); await fclick(op, '#nextbtn');
  const c3 = await chunkChange(page, 'c2', 10000);
  must(c3 === 'c3', tag + ' on to the ward (' + c3 + ')');
  await watchMount(page, tag + ' c3', 8000);
  const wf = await frameReady(page, 20000);
  if (!must(!!wf, tag + ': the ward opened')) return false;
  const wh = await hashOf(wf); must(wh && wh.seats.length === 1, tag + ': the ward is her own too (' + JSON.stringify(wh && wh.seats) + ')');
  const nb = await wf.evaluate(() => OPWARDUI.W.S.order.length).catch(() => 0); must(nb === 6, tag + ' has the six beds of a pupil on her own (' + nb + ')');
  must(await ward(page, wf), tag + ' finished the ward on her own');
  await chunkChange(page, 'c3', 10000);
  const wk = await toTheEnd(page, tag); note(tag + ' walked ' + wk.join(' '));
  const end = await page.evaluate(() => { const x = document.querySelector('.exit-done'); return x ? (x.querySelector('h2') || {}).textContent : null; });
  must(!!end, tag + ' reaches the done card on her own (' + end + ')');
  return true;
}
async function waitBegin(fr, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const d = await doorState(fr); if (d.begin) return d; await sleep(300); }
  return await doorState(fr);
}
/* drive the operation from every seat at once until the patient is done on every side */
async function operate(frames, opts) {
  opts = opts || {};
  for (const fr of frames) await fr.waitForFunction(() => window.OPUI && OPUI.S, null, { timeout: 10000 });
  for (const fr of frames) { for (let i = 0; i < 12 && await fr.evaluate(() => OPUI.tour && OPUI.tour.active()); i++) { await fclick(fr, '#tournext'); await sleep(200); } }
  const end = Date.now() + (opts.ms || 90000);
  let k = 0;
  while (Date.now() < end) {
    let allDone = true;
    for (let i = 0; i < frames.length; i++) {
      const fr = frames[i];
      if (opts.skip && opts.skip.includes(i)) continue;
      const s = await fr.evaluate(() => ({ stage: OPUI.S.stage, out: OPUI.S.my.out, free: OPUI.E.free(), fluff: OPUI.S.fluff, sealed: OPUI.E.sealedCount() })).catch(() => null);
      if (!s) continue;
      if (s.stage !== 'done') allDone = false; else continue;
      if (s.stage !== 'op') continue;
      if (s.out) { await fr.evaluate(p => OPUI.card(p), s.out); await sleep(250); continue; }
      if (s.fluff === 'in' && i === 0) { await fr.evaluate(() => OPUI.act('fluff')); await sleep(200); continue; }
      if (s.free.length) { const p = s.free[(k++ + i) % s.free.length]; await fr.evaluate(x => OPUI.act(x), p); await sleep(350); }
    }
    if (allDone) return true;
    if (opts.until && await opts.until()) return 'until';
    await sleep(250);
  }
  return false;
}
const opState = fr => fr.evaluate(() => ({ stage: OPUI.S.stage, pid: OPUI.S.pid, round: OPUI.S.round, sealed: OPUI.E.sealedCount(),
  parts: Object.fromEntries(Object.keys(OPUI.S.parts).map(k => [k, OPUI.S.parts[k].status + ':' + (OPUI.S.parts[k].by || '')])), counts: OPUI.S.counts,
  instr: (document.getElementById('instr') || {}).textContent || '', here: OPUI.S.others.map(o => o + ':' + OPUI.S.presence[o].here) })).catch(e => ({ err: String(e) }));
async function chunkChange(page, from, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const c = await chunkNow(page); if (c !== from) return c;
    const pop = await page.$('.badge-pop button'); if (pop) { await sleep(500); await pop.click().catch(() => {}); }
    await sleep(250);
  }
  return from;
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, SCEN_NOW + '-' + name + '.png') }).catch(() => {});

/* ---- the later stages, one pupil at a time (they are her own work; the ward is shared) ---- */
async function ward(page, fr, opts) {
  await fr.waitForFunction(() => window.OPWARDUI && OPWARDUI.W, null, { timeout: 10000 });
  const ids = await fr.evaluate(() => OPWARDUI.W.S.order.slice());
  const until = Date.now() + (opts && opts.ms || 90000);
  while (Date.now() < until) {
    /* the Continue sits inside #wdone, which only shows (.on) once every computer is fixed */
    if (await fr.evaluate(() => { const d = document.getElementById('wdone'); return !!(d && d.classList.contains('on') && OPWARDUI.W.doneAll()); }).catch(() => false)) break;
    for (const id of ids) {
      const done = await fr.evaluate(i => { const b = OPWARDUI.W.bed(i); return !!(b && b.done); }, id);
      if (done) continue;
      if (!await fclick(fr, '.bed[data-bed="' + id + '"]')) continue;
      await sleep(600);
      const miss = await fr.evaluate(i => OPWARDUI.W.bed(i).missing, id);
      await fclick(fr, '.tpart[data-part="' + miss + '"]'); await sleep(2900);
    }
    await sleep(1000);
  }
  await sleep(800 + (opts && opts.stagger || 0));
  for (let i = 0; i < 40; i++) {
    if (await fr.evaluate(() => { const d = document.getElementById('wdone'); return !!(d && d.classList.contains('on')); }).catch(() => false) && await fclick(fr, '#wnext')) return true;
    await sleep(500);
  }
  return false;
}
async function boss(fr) { await sleep(500); await fclick(fr, '.xopt[data-i="1"]'); await sleep(400); await fclick(fr, '.xopt[data-i="0"]'); await sleep(400); return fclick(fr, '#xnext'); }
async function names(fr) {
  await sleep(600);
  const n = await fr.evaluate(() => document.querySelectorAll('.xjob').length);
  for (let r = 0; r < 4; r++) {
    for (let j = 0; j < n; j++) { if (await fr.evaluate(x => !!document.querySelector('.xjob[data-j="' + x + '"]:not(.right)'), j)) { await fclick(fr, '.xjob[data-j="' + j + '"]'); await fclick(fr, '.xname[data-n="' + j + '"]'); } }
    if (await fclick(fr, '#xcheck')) await sleep(700);
    if (await fr.evaluate(() => !document.getElementById('xnext').hidden)) break;
  }
  return fclick(fr, '#xnext');
}
async function extras(page) {
  await sleep(600);
  return page.evaluate(() => { const b = document.querySelector('.pyrun-finish'); if (!b) return false; b.click(); return true; });
}
async function platformStep(page, ck) {
  for (let i = 0; i < 60; i++) {
    if (await chunkNow(page) !== ck) return true;
    if (await page.evaluate(() => !!document.querySelector('.exit-done'))) return true;
    const st = await page.evaluate(WALK.detectKind);
    if (WALK.ACTIONS && WALK.ACTIONS[st.kind]) await WALK.ACTIONS[st.kind](page);
    else if (WALK.MOVES[st.kind]) await page.evaluate(([src]) => { (new Function('return (' + src + ')')())(); }, [String(WALK.MOVES[st.kind])]);
    await sleep(WALK.SETTLE[st.kind] || 700);
  }
  return false;
}
/* walk one pupil from wherever she stands to the done card */
async function toTheEnd(page, tag) {
  const walked = [];
  for (let guard = 0; guard < 24; guard++) {
    if (await page.evaluate(() => !!document.querySelector('.exit-done'))) break;
    const ck = await chunkNow(page); if (!ck) break;
    walked.push(ck);
    let ok;
    if (['c3', 'c4', 'c7'].includes(ck)) {
      if (ck !== 'c3') await watchMount(page, tag + ' ' + ck, 6000);
      const fr = await frameReady(page, 20000);
      if (!fr) { must(false, tag + ': the ' + ck + ' frame opened'); return walked; }
      ok = ck === 'c3' ? await ward(page, fr) : ck === 'c4' ? await boss(fr) : await names(fr);
    } else if (ck === 'extras') ok = await extras(page);
    else ok = await platformStep(page, ck);
    if (!ok && await page.evaluate(() => !!document.querySelector('.exit-done'))) break;
    if (!ok) { await shot(page, tag + '-stuck-' + ck); must(false, tag + ' could not leave ' + ck); return walked; }
    const nx = await chunkChange(page, ck, 9000);
    if (nx === ck && !(await page.evaluate(() => !!document.querySelector('.exit-done')))) { await shot(page, tag + '-stuck-' + ck); must(false, tag + ' stuck on ' + ck); return walked; }
  }
  return walked;
}
const record6 = (page, email) => page.evaluate(([cls, e]) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const r = db.pupils[cls + ':' + e]; return r && r.L && r.L['6'] ? r.L['6'] : null; }, [CLS, email]);

/* ---- set up N pupils, all opening Lesson 6 at the same moment, and wait for each one's door frame ---- */
async function start(browser, who, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 768 } });
  const errs = [];
  const pages = [];
  for (const w of who) pages.push(await open(ctx, w, errs, (opts.block || {})[w] ? { blockLive: 1 } : null));
  await seed(pages[0], who);
  for (const p of pages) { await p.reload({ waitUntil: 'domcontentloaded' }); }
  await sleep(2200);
  for (const p of pages) await WALK.primeDevKeys(p, BASE).catch(() => {});
  const tiles = await Promise.all(pages.map(openLesson6));
  must(tiles.every(Boolean), 'every pupil found the Lesson 6 tile');
  await sleep(2000);
  /* the warm-up comes first and is each pupil's own: walk every one of them to the door */
  const at = await Promise.all(pages.map(async p => { for (let g = 0; g < 8; g++) { const c = await chunkNow(p); if (c === 'c1' || !c) return c; await platformStep(p, c); await chunkChange(p, c, 6000); } return chunkNow(p); }));
  must(at.every(c => c === 'c1'), 'every pupil reached the door (' + at.join(', ') + ')');
  return { ctx, pages, errs };
}

/* ================= SCENARIOS ================= */
async function scenPair(browser) {
  const { ctx, pages: [A, B], errs } = await start(browser, ['anya', 'cara']);
  const [fa, fb] = await Promise.all([frameReady(A, 30000), frameReady(B, 30000)]);
  must(!!fa && !!fb, 'both door frames opened');
  if (!fa || !fb) { await shot(A, 'A-noframe'); await shot(B, 'B-noframe'); await ctx.close(); return; }
  const [ha, hb] = [await hashOf(fa), await hashOf(fb)];
  note('A hash ' + JSON.stringify({ seat: ha.seat, seats: ha.seats, room: ha.room, stage: ha.stage }) + ' · B hash ' + JSON.stringify({ seat: hb.seat, seats: hb.seats, room: hb.room }));
  must(ha.room && ha.room === hb.room, 'both pupils are in the same live room');
  must(ha.seats.length === 2 && ha.seat !== hb.seat, 'two seats, one each (' + ha.seat + ', ' + hb.seat + ')');
  const tb = Date.now();
  const [da, db] = await Promise.all([waitBegin(fa, 30000), waitBegin(fb, 30000)]);
  note('Begin ready after ' + ((Date.now() - tb) / 1000).toFixed(1) + ' s · A: ' + da.together + ' · B: ' + db.together);
  must(da.begin && db.begin, 'Begin is pressable on both doors once both are here');
  await shot(A, 'A-door'); await shot(B, 'B-door');
  await fclick(fa, '#beginbtn'); await sleep(900); await fclick(fb, '#beginbtn');
  const [ca, cb] = await Promise.all([chunkChange(A, 'c1', 10000), chunkChange(B, 'c1', 10000)]);
  must(ca === 'c2' && cb === 'c2', 'both moved on to the operation (' + ca + ', ' + cb + ')');
  await Promise.all([watchMount(A, 'A c2', 8000), watchMount(B, 'B c2', 8000)]);
  const [oa, ob] = await Promise.all([frameReady(A, 20000), frameReady(B, 20000)]);
  must(!!oa && !!ob, 'both operation frames opened');
  for (const fr of [oa, ob]) await fr.waitForFunction(() => window.OPUI && OPUI.S, null, { timeout: 10000 });
  const [ba, bb] = await Promise.all([waitOp(oa, 30000), waitOp(ob, 30000)]);
  must(ba === 'op' && bb === 'op', 'the operation is running on both laptops (' + ba + ', ' + bb + ')');
  const ok = await operate([oa, ob]);
  const [sa, sb] = [await opState(oa), await opState(ob)];
  note('A ' + JSON.stringify(sa)); note('B ' + JSON.stringify(sb));
  must(ok === true, 'the patient is done on both laptops');
  must(sa.pid === sb.pid, 'one patient on both laptops (' + sa.pid + ')');
  must(JSON.stringify(sa.parts) === JSON.stringify(sb.parts), 'both laptops agree on every part and who sealed it');
  must((sa.counts.A || 0) > 0 && (sa.counts.B || 0) > 0, 'both surgeons sealed parts (A ' + sa.counts.A + ', B ' + sa.counts.B + ')');
  await shot(A, 'A-op-done'); await shot(B, 'B-op-done');
  await sleep(1500);
  await fclick(oa, '#nextbtn'); await fclick(ob, '#nextbtn');
  const [c3a, c3b] = await Promise.all([chunkChange(A, 'c2', 10000), chunkChange(B, 'c2', 10000)]);
  must(c3a === 'c3' && c3b === 'c3', 'both on to the ward (' + c3a + ', ' + c3b + ')');
  await Promise.all([watchMount(A, 'A c3', 8000), watchMount(B, 'B c3', 8000)]);
  /* the ward is shared: both at once */
  const [wa, wb] = await Promise.all([frameReady(A, 20000), frameReady(B, 20000)]);
  must(!!wa && !!wb, 'both ward frames opened');
  const [wra, wrb] = await Promise.all([ward(A, wa), ward(B, wb, { stagger: 2500 })]);
  must(wra && wrb, 'both finished the ward');
  await Promise.all([chunkChange(A, 'c3', 10000), chunkChange(B, 'c3', 10000)]);
  const [wka, wkb] = await Promise.all([toTheEnd(A, 'A'), toTheEnd(B, 'B')]);
  note('A walked ' + wka.join(' ') + ' · B walked ' + wkb.join(' '));
  for (const [p, tag] of [[A, 'A'], [B, 'B']]) {
    const end = await p.evaluate(() => { const d = document.querySelector('.exit-done'); return d ? (d.querySelector('h2') || {}).textContent : null; });
    must(!!end, tag + ' reaches the done card (' + end + ')');
    await shot(p, tag + '-done');
  }
  const [ra, rb] = [await record6(A, WHO.anya), await record6(B, WHO.cara)];
  note('records A ' + JSON.stringify(ra) + ' · B ' + JSON.stringify(rb));
  must(ra && Number(ra[0]) === 2 && rb && Number(rb[0]) === 2, 'both lesson records are marked done');
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 6).join(' | ') : ''));
  await ctx.close();
}

/* Cara is paired with Anya, then never arrives (laptop shut, or she left the room) */
async function scenGone(browser) {
  const { ctx, pages: [A, B], errs } = await start(browser, ['anya', 'cara']);
  /* close Cara's tab the moment the platform pairs her, before her door page can say hello */
  let closedAt = null;
  for (let i = 0; i < 200 && !closedAt; i++) {
    const paired = await B.evaluate(() => !!(window.PairKit && PairKit.st && PairKit.st.state === 'paired') || !!document.querySelector('#chunk-host iframe.rescue-frame')).catch(() => false);
    if (paired) { await B.close(); closedAt = Date.now(); }
    else await sleep(50);
  }
  must(!!closedAt, 'Cara was paired before her laptop shut');
  const fa = await frameReady(A, 30000);
  must(!!fa, 'Anya\'s door opened');
  if (!fa) { await ctx.close(); return; }
  const h = await hashOf(fa); note('Anya hash seats ' + JSON.stringify(h.seats) + ' room ' + h.room);
  await alonePath(A, fa, 'Anya');
  const ra = await record6(A, WHO.anya); note('record ' + JSON.stringify(ra));
  must(ra && Number(ra[0]) === 2, 'her lesson record is marked done');
  const d = { begin: false, buttons: [] };
  let wayOn = false;
  if (!wayOn) { const own = d.buttons.find(b => /own/i.test(b)); if (own) { await fclick(fa, '#' + own.split(':')[0]); wayOn = true; } }
  if (wayOn) {
    if (d.begin) await fclick(fa, '#beginbtn');
    await sleep(1500);
    const fr2 = await frameReady(A, 15000);
    const st = fr2 ? await doorState(fr2) : null;
    note('after the way on: chunk ' + await chunkNow(A) + ' ' + JSON.stringify(st));
    /* she must get through the whole operation on her own */
    let c = await chunkNow(A);
    if (c === 'c1') { const b2 = await waitBegin(fr2, 10000); if (b2.begin) await fclick(fr2, '#beginbtn'); c = await chunkChange(A, 'c1', 10000); }
    must(c === 'c2', 'Anya reached the operation (' + c + ')');
    const op = await frameReady(A, 20000);
    if (op) {
      await op.waitForFunction(() => window.OPUI && OPUI.S, null, { timeout: 10000 }).catch(() => {});
      const b3 = await waitOp(op, 20000);
      must(b3 === 'op', 'the operation runs for her on her own (' + b3 + ')');
      const ok = await operate([op], { ms: 60000 });
      must(ok === true, 'she finishes the patient on her own');
      await shot(A, 'A-op-alone-done');
    }
  }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 6).join(' | ') : ''));
  await ctx.close();
}

/* Cara pulls a part mid-operation and her laptop shuts with the part still out */
async function scenMidop(browser) {
  const { ctx, pages: [A, B], errs } = await start(browser, ['anya', 'cara']);
  const [fa, fb] = await Promise.all([frameReady(A, 30000), frameReady(B, 30000)]);
  if (!must(!!fa && !!fb, 'both door frames opened')) { await ctx.close(); return; }
  await Promise.all([waitBegin(fa, 30000), waitBegin(fb, 30000)]);
  await fclick(fa, '#beginbtn'); await fclick(fb, '#beginbtn');
  await Promise.all([chunkChange(A, 'c1', 10000), chunkChange(B, 'c1', 10000)]);
  const [oa, ob] = await Promise.all([frameReady(A, 20000), frameReady(B, 20000)]);
  for (const fr of [oa, ob]) await fr.waitForFunction(() => window.OPUI && OPUI.S, null, { timeout: 10000 });
  await Promise.all([waitOp(oa, 30000), waitOp(ob, 30000)]);
  for (const fr of [oa, ob]) { for (let i = 0; i < 12 && await fr.evaluate(() => OPUI.tour && OPUI.tour.active()); i++) { await fclick(fr, '#tournext'); await sleep(200); } }
  /* Cara pulls one part and walks away with it */
  const part = await ob.evaluate(() => { const f = OPUI.E.free().filter(p => p !== 'board'); OPUI.act(f[0]); return f[0]; });
  await sleep(2500);
  await B.close();
  note('Cara pulled ' + part + ' and her laptop shut');
  const ok = await operate([oa], { ms: WAIT_ALONE_S * 1000 });
  const s = await opState(oa);
  note('Anya after ' + WAIT_ALONE_S + ' s: ' + JSON.stringify(s));
  await shot(A, 'A-midop-alone');
  must(ok === true, 'Anya can still finish the patient when her partner leaves with a part out');
  must(s.here && s.here.length === 1 && /:false$/.test(s.here[0]), 'Cara shows as away on Anya\'s laptop (' + (s.here || []).join(',') + ')');
  if (ok === true) {
    await sleep(1200); await fclick(oa, '#nextbtn');
    const c3 = await chunkChange(A, 'c2', 10000); must(c3 === 'c3', 'Anya on to the ward (' + c3 + ')');
    const wf = await frameReady(A, 20000);
    if (wf) {
      const t = Date.now(); const wok = await ward(A, wf, { ms: 90000 });
      const ws = await wf.evaluate(() => ({ cap: OPWARDUI.W.S.cap, beds: OPWARDUI.W.S.order.map(i => OPWARDUI.W.bed(i).done ? 'done:' + (OPWARDUI.W.bed(i).by || '') : 'open') })).catch(e => ({ err: String(e) }));
      note('ward on her own after Cara left: ' + ((Date.now() - t) / 1000).toFixed(0) + ' s ' + JSON.stringify(ws));
      await shot(A, 'A-ward-partner-gone');
      must(wok, 'Anya finishes the shared ward when her partner has gone');
    }
  }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 6).join(' | ') : ''));
  await ctx.close();
}

/* Cara's network blocks the live link: she is sent to sit with Anya. Anya's link works. */
async function scenBlocked(browser) {
  const { ctx, pages: [A, B], errs } = await start(browser, ['anya', 'cara'], { block: { cara: 1 } });
  const [fa, fb] = await Promise.all([frameReady(A, 30000), frameReady(B, 30000)]);
  if (!must(!!fa && !!fb, 'both door frames opened')) { await ctx.close(); return; }
  /* a blocked link falls back after FALLBACK_MS (10 s): wait for her away card or her own door */
  let db = await doorState(fb);
  for (let i = 0; i < 30 && !db.away; i++) { await sleep(500); db = await doorState(fb); }
  note('Cara sees: ' + JSON.stringify({ away: db.away, say: db.awaysay, buttons: db.buttons }));
  await shot(B, 'B-away');
  const ha = await hashOf(fa), hb = await hashOf(fb);
  note('seats A ' + ha.seat + ' B ' + hb.seat);
  /* whoever has the working link is left at the door; she must be able to take the other surgeon's turns */
  if (hb.seat === 'A') note('Cara (blocked) holds seat A: her laptop runs both surgeons and Anya is the one told to come over');
  if (hb.seat !== 'A') must(db.away && db.buttons.some(b => /^awaybtn:Continue/.test(b)), 'Cara is told where to sit and has a Continue button');
  await alonePath(A, fa, 'Anya');
  if (hb.seat !== 'A') {
    await fclick(fb, '#awaybtn');
    const cc = await chunkChange(B, 'c1', 10000);
    must(cc === 'c2', 'Cara moves on from the door with Continue (' + cc + ')');
  }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 6).join(' | ') : ''));
  await ctx.close();
}

/* Anya reloads in the middle of the operation */
async function scenReload(browser) {
  const { ctx, pages: [A, B], errs } = await start(browser, ['anya', 'cara']);
  const [fa, fb] = await Promise.all([frameReady(A, 30000), frameReady(B, 30000)]);
  if (!must(!!fa && !!fb, 'both door frames opened')) { await ctx.close(); return; }
  await Promise.all([waitBegin(fa, 30000), waitBegin(fb, 30000)]);
  await fclick(fa, '#beginbtn'); await fclick(fb, '#beginbtn');
  await Promise.all([chunkChange(A, 'c1', 10000), chunkChange(B, 'c1', 10000)]);
  let [oa, ob] = await Promise.all([frameReady(A, 20000), frameReady(B, 20000)]);
  for (const fr of [oa, ob]) await fr.waitForFunction(() => window.OPUI && OPUI.S, null, { timeout: 10000 });
  await Promise.all([waitOp(oa, 30000), waitOp(ob, 30000)]);
  /* three parts sealed between them, then Anya's page reloads */
  await operate([oa, ob], { ms: 40000, until: async () => (await oa.evaluate(() => OPUI.E.sealedCount())) >= 3 });
  await sleep(2500);
  const before = await opState(ob);
  note('before reload (Cara\'s view): ' + JSON.stringify(before));
  await A.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500);
  const ck = await chunkNow(A);
  note('after reload Anya is on ' + ck + ' · wait card ' + JSON.stringify(await waitCard(A)));
  if (ck !== 'c2') { await openLesson6(A); await sleep(2500); note('after tapping Lesson 6 again: ' + await chunkNow(A)); }
  must(await chunkNow(A) === 'c2', 'Anya lands back on the operation');
  oa = await frameReady(A, 25000);
  must(!!oa, 'Anya\'s operation page came back after the reload');
  if (oa) {
    await oa.waitForFunction(() => window.OPUI && OPUI.S, null, { timeout: 10000 }).catch(() => {});
    await waitOp(oa, 20000);
    await sleep(3000);
    const after = await opState(oa);
    note('after reload (Anya\'s view): ' + JSON.stringify(after));
    must(after.pid === before.pid, 'same patient after the reload');
    must(after.sealed >= before.sealed, 'the parts already sealed are still sealed after the reload (' + after.sealed + ' of ' + before.sealed + ')');
    await shot(A, 'A-after-reload');
    const ok = await operate([oa, ob], { ms: 60000 });
    must(ok === true, 'the pair finishes the patient after the reload');
  }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 6).join(' | ') : ''));
  await ctx.close();
}

async function scenTrio(browser) {
  const { ctx, pages, errs } = await start(browser, ['anya', 'cara', 'ryan']);
  const frs = await Promise.all(pages.map(p => frameReady(p, 40000)));
  if (!must(frs.every(Boolean), 'all three door frames opened')) { for (let i = 0; i < 3; i++) await shot(pages[i], 'noframe-' + i); await ctx.close(); return; }
  const hs = await Promise.all(frs.map(hashOf));
  note('seats ' + hs.map(h => h.seat + '/' + (h.seats || []).length + '@' + h.room).join(' '));
  const rooms = new Set(hs.map(h => h.room));
  const trio = hs.every(h => (h.seats || []).length === 3) && rooms.size === 1;
  const pairPlusOne = !trio;
  note(trio ? 'a room of three' : 'not a trio: ' + JSON.stringify(hs.map(h => ({ seats: h.seats, room: h.room }))));
  must(trio || pairPlusOne, 'three pupils are placed');
  if (trio) {
    const ds = await Promise.all(frs.map(f => waitBegin(f, 30000)));
    must(ds.every(d => d.begin), 'Begin is pressable on all three doors');
    for (const f of frs) await fclick(f, '#beginbtn');
    await Promise.all(pages.map(p => chunkChange(p, 'c1', 10000)));
    const ops = await Promise.all(pages.map(p => frameReady(p, 20000)));
    for (const fr of ops) await fr.waitForFunction(() => window.OPUI && OPUI.S, null, { timeout: 10000 });
    const os = await Promise.all(ops.map(o => waitOp(o, 30000)));
    must(os.every(x => x === 'op'), 'the operation is running on all three laptops');
    const ok = await operate(ops);
    const ss = await Promise.all(ops.map(opState));
    note('trio counts ' + JSON.stringify(ss.map(s => s.counts)));
    must(ok === true, 'the trio finishes the patient');
    must(ss.every(s => JSON.stringify(s.parts) === JSON.stringify(ss[0].parts)), 'all three laptops agree on every part');
    for (let i = 0; i < 3; i++) await shot(pages[i], 'trio-' + i);
  }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 6).join(' | ') : ''));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const run = { pair: scenPair, gone: scenGone, midop: scenMidop, blocked: scenBlocked, reload: scenReload, trio: scenTrio };
  const list = SCEN === 'all' ? Object.keys(run) : SCEN.split(',');
  for (const s of list) {
    SCEN_NOW = s; console.log('\n=== ' + s + ' ===');
    try { await run[s](browser); } catch (e) { must(false, 'the scenario stopped: ' + String(e.message || e).split('\n')[0]); }
  }
  await browser.close();
  console.log('\n' + checks + ' checks, ' + FAILS.length + ' failed.');
  FAILS.forEach(f => console.log('  FAILED ' + f));
  fs.writeFileSync(path.join(OUT, 'last-run.txt'), [checks + ' checks, ' + FAILS.length + ' failed', ...FAILS.map(f => 'FAIL ' + f), '', ...NOTES].join('\n'));
  process.exit(FAILS.length ? 1 : 0);
})();
