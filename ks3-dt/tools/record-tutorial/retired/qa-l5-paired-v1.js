#!/usr/bin/env node
/* qa-l5-paired.js: J3 Lesson 5 TWO LIGHTS with TWO (or three) REAL PUPILS on the platform, over the REAL live link
 * (deep check 25 Oct 2026).
 *
 * l5-walk walks one pupil with pairing off; l5-walk-model and l5-channel run the engine and the link on their own.
 * Nothing ran the platform's own pairing (PairKit -> room -> frame hash) with two accounts on the hour itself, so this
 * does: one browser, one shared dev store, one tab per pupil (?as=orla, ?as=katie, ?as=maeve), Firebase for real.
 * Each pupil is a robot doing what her bar says (RUN, read the red text, fix the line, radio her partner, name the
 * poster), the way l5-walk-model's robot does it, but through the page's own buttons.
 *
 *   --scenario pair        both pupils from the tile to the done card: every chapter shared, slips crossing both ways
 *   --scenario reload      paired; Katie reloads after a slip lands (ch1), Orla reloads after she radios (ch2):
 *                          both come back to the same chapter and finish; no ch1 slip shows on ch2
 *   --scenario gone        paired; Katie's laptop shuts mid ch2: Orla takes both lights (bar.dark) and finishes the hour
 *   --scenario oneblocked  Katie's live link is blocked, Orla's is not: Katie falls back by her seat (B: the away card and
 *                          Next on every page; A: both lights, the slow-link bar); Orla takes both lights in ch1 and keeps
 *                          them from ch2 on; both finish
 *   --scenario blocked     both links blocked: Orla keeps both lights from the start (bar.slow), Katie clicks Next
 *   --scenario trio        three pupils: one room of three, seats A B C, all finish ch1 and ch2 with slips crossing
 *   --scenario all         every one of the above, one after another
 *
 *   node ks3-dt/tools/record-tutorial/qa-l5-paired.js [--base http://localhost:8131] [--scenario pair] [--width 1366]
 * Writes the dev store only (Demo-10A). Screenshots into out/l5-paired/<scenario>-<width>. Exit 1 on any failed check.
 */
'use strict';
const RT = __dirname;
const { chromium } = require(RT + '/node_modules/playwright');
const WALK = require(RT + '/lib/walk-moves.js');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8131');
const WIDTH = Number(argOf('--width', '1366'));
const SCEN = argOf('--scenario', 'all');
const CLS = 'Demo-10A';
const WHO = { orla: 'orla.mccann@demo', katie: 'katie.lennon@demo', maeve: 'maeve.torley@demo' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now(); const ts = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's ';
let checks = 0; const FAILS = [];
let SCEN_NOW = '', OUT = '';
const must = (ok, what) => { checks++; console.log(ts() + (ok ? 'PASS ' : 'FAIL ') + what); if (!ok) FAILS.push(SCEN_NOW + ': ' + what); return ok; };
const note = s => console.log(ts() + '     ' + s);
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') }).catch(() => {});

/* every frame keeps its own uncaught errors, read back at the end (an error inside the lesson's frame) */
const COLLECT = () => { window.__errs = []; window.addEventListener('error', e => window.__errs.push(String(e.message || e))); window.addEventListener('unhandledrejection', e => window.__errs.push('rejection: ' + String(e.reason && e.reason.message || e.reason))); };

async function open(ctx, who, errs, opts) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: WIDTH, height: 768 });
  const blocked = !!(opts && opts.blockLive);
  if (blocked) {
    /* her school's network blocks the live link: the Firebase scripts load from the platform, but the database host never answers */
    await page.route(/firebasedatabase\.app|firebaseio\.com/, r => r.abort());
    await page.routeWebSocket(/firebasedatabase\.app|firebaseio\.com/, ws => ws.close());
  }
  page.on('pageerror', e => errs.push(who + ': ' + String(e).split('\n')[0]));
  page.on('response', r => { if (r.status() >= 400 && !/favicon|dev-keys\.json/.test(r.url())) errs.push(who + ' ' + r.status() + ' ' + r.url().replace(BASE, '').slice(0, 140)); });
  page.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR_ABORTED|404 \(File not found\)|status of 404/.test(m.text()) && !(blocked && /net::ERR_FAILED|firebase/i.test(m.text()))) errs.push(who + ' console: ' + m.text().slice(0, 160)); });
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=' + CLS + '&as=' + who, { waitUntil: 'domcontentloaded' });
  await sleep(1800);
  return page;
}
async function seed(page, names) {
  await page.evaluate(([cls, emails]) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks[cls] = db.locks[cls] || {};
    for (const n of ['1', '2', '3', '4', '5']) db.locks[cls][n] = { u: now, on: 1 };
    db.cfg = db.cfg || {}; db.cfg[cls] = db.cfg[cls] || {}; db.cfg[cls].pairing = { on: 1 };
    db.pupils = db.pupils || {};
    for (const email of emails) {
      const kk = cls + ':' + email;
      const rec = db.pupils[kk] || { n: email.split('.')[0], cn: '', j: 3, xp: 0, g: '' };
      rec.L = rec.L || {};
      for (const n of ['1', '2', '3', '4']) if (!rec.L[n] || Number(rec.L[n][0]) !== 2) rec.L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + Number(n), 10, 0, '', 0, 0];
      delete rec.L['5'];
      db.pupils[kk] = rec;
      const up = (db.userProps || {})[email];
      if (up && up.draft) Object.keys(up.draft).forEach(k => { if (/:5:|j3-05/.test(k)) delete up.draft[k]; });
    }
    /* a clean pairing slate for the class: no old pairs, no queue, nobody present */
    ['pairing', 'pq'].forEach(store => { if (db[store]) Object.keys(db[store]).forEach(k => { if (k.indexOf(cls + '|') === 0) delete db[store][k]; }); });
    /* ...then the whole group signed in and on Lesson 5 at once, as a class is. Without this the first to reach the
       radio page waits alone, and after 8 s the PREVIEW store hands her its simulated partner (the live server has none) */
    db.pres = db.pres || {}; db.pres[cls] = {};
    for (const email of emails) db.pres[cls][email] = [now, '5', 0, 0];
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, [CLS, names.map(n => WHO[n])]);
}
async function openLesson5(page) {
  await page.evaluate(() => { const s = document.querySelector('.intro-skip'); if (s) s.click(); });
  await sleep(500);
  return page.evaluate(() => { const t = Array.from(document.querySelectorAll('.tile')).find(e => /Lesson\s*5(?!\d)/i.test(e.textContent)); if (t) t.click(); return t ? t.textContent.replace(/\s+/g, ' ').trim() : null; });
}
const chunkNow = page => page.evaluate(() => { const s = window.App && App.state; return s && s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; }).catch(() => null);
const frameOf = async page => { const h = await page.$('#chunk-host iframe.rescue-frame').catch(() => null); return h ? h.contentFrame() : null; };
async function frameReady(page, ms) {
  const end = Date.now() + (ms || 20000);
  while (Date.now() < end) {
    const fr = await frameOf(page);
    if (fr) { const ok = await fr.evaluate(() => document.title === 'ready' || !!(window.TLUI && TLUI.E) || !!(document.getElementById('away') && !document.getElementById('away').hidden)).catch(() => false); if (ok) return fr; }
    await sleep(250);
  }
  return null;
}
const hashOf = fr => fr.evaluate(() => { try { return JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch (e) { return null; } });
const ENDED = () => { const s = window.App && App.state; return !!document.querySelector('.badge-pop-card.finish') || (!!document.querySelector('.exit-done') && !!s && s.chunks && s.chunkIdx >= s.chunks.length - 1); };
const fclick = (fr, sel) => fr.evaluate(s => { const b = document.querySelector(s); if (!b || b.disabled || b.hidden) return false; b.click(); return true; }, sel).catch(() => false);
const waitShown = (fr, sel, ms) => fr.waitForFunction(s => { const b = document.querySelector(s); return b && !b.hidden && !b.disabled; }, sel, { timeout: ms }).then(() => true, () => false);
const awayShown = fr => fr.evaluate(() => { const a = document.getElementById('away'); return a && !a.hidden ? { say: document.getElementById('awaysay').textContent, next: document.getElementById('awaynext').textContent, want: TwoLightsStrings.render('bar.slow'), btn: TwoLightsStrings.render('btn.next') } : null; }).catch(() => null);

async function waitChunkChange(page, from, ms) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const c = await chunkNow(page); if (c !== from) return c;
    if (await page.evaluate(ENDED).catch(() => false)) return from;
    const pop = await page.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (!b || document.querySelector('.badge-pop-card .finish-glyph')) return null; return { off: b.disabled || b.getAttribute('aria-disabled') === 'true' }; }).catch(() => null);
    if (pop && !pop.off) await page.click('.badge-pop button').catch(() => {});
    await sleep(300);
  }
  return from;
}

/* ---------- one move of a pupil inside a chapter: whatever her bar tells her (l5-walk-model's robot, by the page's buttons) ---------- */
const STEP = () => {
  const $ = id => document.getElementById(id);
  const aw = $('away');
  if (aw && !aw.hidden) { const n = $('awaynext'); if (n && !n.disabled && !n.hidden) { n.click(); return { act: 'away', bar: $('awaysay').textContent }; } return { act: 'wait:away', bar: $('awaysay').textContent }; }
  const T = window.TLUI; if (!T || !T.E) return { act: 'none' };
  const E = T.E, PR = window.TwoLightsPrograms, J = window.TwoLightsJudge, c = T.stage;
  const barText = ($('barline').textContent || '').trim();
  const info = { mode: E.S.mode, local: E.S.local.join(''), notice: E.S.notice && E.S.notice.id };
  const go = $('go'); if (go && !go.hidden && !go.disabled) { go.click(); return Object.assign({ act: 'go', bar: barText }, info); }
  const bar = E.bar() || {}, id = bar.id || '', s = E.S.active, L = E.S.L[s];
  const U = window.__used = window.__used || {};
  const mine = E.S.slips.filter(x => x.ch === c && x.to === s);
  const keepsAll = E.S.local.length === E.S.seats.length;
  const poster = k => document.querySelector('#board .poster[data-k="' + k + '"]');
  const out = a => Object.assign({ act: a, bar: barText, id }, info);
  if (id === 'bar.name' && L && L.nameQ.length) { const k = J.KIND[L.nameQ[0]], p = poster(k); if (p) p.click(); else { E.name(k); T.render(); } return out('name'); }
  if (id === 'bar.name' && bar.card) { if (!E.S.cardPick) { const p = poster(E.card().kind); if (p) { p.click(); return out('card'); } } return out('wait'); }
  if (id === 'bar.readred') { $('conwrap').click(); return out('readred'); }
  if (id === 'bar.run') { if ($('run').disabled) return out('wait'); $('run').click(); return out('run'); }
  if (/^bar\.tell\./.test(id)) {
    const k = id.split('.')[2], b = document.querySelector('#radios button[data-to="' + bar.seat + '"][data-slip="' + k + '"]');
    if (!b) return out('noradio:' + bar.seat + ':' + k);
    b.click(); return out('tell:' + bar.seat + ':' + k);
  }
  const slipNew = mine.length > (U[c + s] || 0);
  if (id === 'bar.fixline' || id === 'bar.putback' || id === 'bar.extra' || /^solo\./.test(id) || ((id === 'bar.slip' || id === 'bar.hunt') && (slipNew || keepsAll))) {
    if (slipNew) U[c + s] = mine.length;
    const SEAT = PR.SEATS[s], cur = E.code(s, c); let after;
    if (c === 'ch1') after = cur.indexOf('lampp_on') >= 0 ? PR.ch1(SEAT, 1) : PR.ch1(SEAT, 2);
    else if (c === 'ch2') after = PR.ch2(SEAT, true);
    else if (c === 'ch3') after = PR.ch3(SEAT, 'after');
    else {
      const iss = E.topIssue(), f = L.live[c] || J.judge(c, s, cur, { variant: L.variant });
      after = PR.ch4(SEAT, Object.keys(f.faults).filter(k => f.faults[k].present && (!iss || k !== iss.id)));
    }
    const ed = $('ed'); ed.value = after; ed.dispatchEvent(new Event('input', { bubbles: true }));
    $('run').click(); return out(slipNew ? 'fix:slip' : 'fix');
  }
  return out('wait:' + id);
};
const snapOf = fr => fr.evaluate(() => { const E = TLUI.E, c = TLUI.stage; return { stage: c, seat: E.S.seat, seats: E.S.seats.join(''), mode: E.S.mode, local: E.S.local.join(''), active: E.S.active, code: E.code(E.S.active),
  slips: E.S.slips.map(x => x.from + '>' + x.to + ':' + x.slip + '@' + x.ch), otherCh: E.S.slips.filter(x => x.ch !== c).length, done: E.S.seats.map(s => (E.S.L[s] && E.S.L[s].done[c]) ? 1 : 0).join(''),
  bar: (document.getElementById('barline').textContent || '').trim(), crew: E.crew() }; });

/* a pupil: her page, her tag, what she did */
function pupil(page, tag) { return { page, tag, tells: 0, slipFixes: 0, looks: 0, empty: 0, notices: {}, modes: {}, walked: [], hooks: [], gone: false, aways: 0, awayBad: [] }; }

async function chapter(P, ck, deadlineS) {
  let fr = await frameReady(P.page, 30000); if (!fr) { must(false, P.tag + ': the ' + ck + ' page opened'); return false; }
  await sleep(700);
  const end = Date.now() + (deadlineS || 420) * 1000;
  let moves = 0, last = '';
  await shot(P.page, P.tag + '-' + ck + '-open');
  while (Date.now() < end) {
    if (P.gone) return 'gone';
    if (await chunkNow(P.page) !== ck) return true;
    fr = await frameOf(P.page); if (!fr) { await sleep(300); continue; }
    for (const h of P.hooks) if (!h.done && h.ck === ck && await h.when(P, fr, moves)) { h.done = true; await h.act(P, fr); fr = await frameReady(P.page, 30000); if (P.gone) return 'gone'; if (!fr) return false; }
    const r = await fr.evaluate(STEP).catch(() => ({ act: 'gone' }));
    if (r.act === 'gone' || r.act === 'none') { await sleep(400); continue; }
    if (r.act === 'away') { P.aways++; if (r.bar !== (await awayWant(fr))) P.awayBad.push(r.bar); await sleep(800); return true; }
    if (r.act === 'wait:away') { await sleep(400); continue; }
    P.looks++; if (!r.bar) P.empty++;
    if (r.notice) P.notices[r.notice] = 1;
    if (r.mode) P.modes[r.mode] = 1;
    if (/^tell:/.test(r.act)) P.tells++;
    if (r.act === 'fix:slip') P.slipFixes++;
    if (/^noradio/.test(r.act)) must(false, P.tag + ' ' + ck + ': the bar asked for a radio button that is not on screen (' + r.act + ')');
    if (process.env.DBG && r.act + r.bar !== last) { last = r.act + r.bar; note(P.tag + ' ' + ck + ' ' + r.act + ' · ' + r.bar); }
    if (!/^wait|^noradio/.test(r.act)) moves++;
    if (r.act === 'go') { await sleep(800); return true; }
    await sleep(/^fix|run/.test(r.act) ? 900 : 500);
  }
  await shot(P.page, P.tag + '-' + ck + '-stuck');
  const sn = await snapOf(fr).catch(e => String(e));
  note(P.tag + ' ' + ck + ' at the deadline: ' + JSON.stringify(sn));
  return false;
}
let AWAY_WANT = null;
async function awayWant(fr) { if (!AWAY_WANT) AWAY_WANT = await fr.evaluate(() => TwoLightsStrings.render('bar.slow')).catch(() => null); return AWAY_WANT; }

async function scene(P, ck, btn) {
  const fr = await frameReady(P.page, 30000); if (!fr) return false;
  await sleep(800);
  for (let i = 0; i < 240; i++) {
    const aw = await awayShown(fr);
    if (aw) { P.aways++; if (aw.say !== aw.want || aw.next !== aw.btn) P.awayBad.push(aw.say + ' / ' + aw.next); return fclick(fr, '#awaynext'); }
    if (await fr.evaluate(s => { const b = document.querySelector(s); return !!(b && !b.hidden && !b.disabled); }, btn).catch(() => false)) return fclick(fr, btn);
    await sleep(500);
  }
  return false;
}
async function tour(P, ck) {
  const fr = await frameReady(P.page, 30000); if (!fr) return false;
  await sleep(900);
  for (let i = 0; i < 40; i++) {
    if (await chunkNow(P.page) !== ck) return true;
    const aw = await awayShown(fr);
    if (aw) { P.aways++; if (aw.say !== aw.want) P.awayBad.push(aw.say); return fclick(fr, '#awaynext'); }
    if (await waitShown(fr, '#tournext', 3000)) { await fclick(fr, '#tournext'); await sleep(500); }
  }
  return (await chunkNow(P.page)) !== ck;
}
async function extras(P) {
  const fr = await frameReady(P.page, 30000); if (!fr) return false;
  await sleep(800);
  await fr.evaluate(() => { const x = TwoLightsPrograms.EXTRAS[0], t = document.getElementById('xsrc'); t.value = x.fixed; });
  await fclick(fr, '#xrun'); await sleep(600);
  await fr.evaluate(() => { const k = TwoLightsPrograms.EXTRAS[0].kind, p = document.querySelector('#xboard .poster[data-k="' + k + '"]'); if (p) p.click(); });
  await sleep(700);
  if (await fclick(fr, '#xnext')) await sleep(600);
  return fclick(fr, '#xfin');
}
async function platformStep(page, ck) {
  for (let i = 0; i < 60; i++) {
    if (await chunkNow(page) !== ck) return true;
    if (await page.evaluate(ENDED)) return true;
    const st = await page.evaluate(WALK.detectKind);
    if (WALK.ACTIONS && WALK.ACTIONS[st.kind]) await WALK.ACTIONS[st.kind](page);
    else if (WALK.MOVES[st.kind]) await page.evaluate(([src]) => { (new Function('return (' + src + ')')())(); }, [String(WALK.MOVES[st.kind])]);
    await sleep(WALK.SETTLE[st.kind] || 700);
  }
  return false;
}

/* walk one pupil from wherever she stands until `until` (a chunk id she must reach) or the done card */
async function walk(P, until, chDeadline) {
  for (let guard = 0; guard < 30; guard++) {
    if (P.gone) return 'gone';
    if (await P.page.evaluate(ENDED).catch(() => false)) return 'ended';
    const ck = await chunkNow(P.page);
    if (!ck) { await sleep(500); continue; }
    if (until && ck === until) return ck;
    if (P.walked[P.walked.length - 1] !== ck) P.walked.push(ck);
    let ok;
    if (ck === 'radio' || ck === 'coldopen') ok = await scene(P, ck, '#snext');
    else if (ck === 'tour') ok = await tour(P, ck);
    else if (/^ch[1-4]$/.test(ck)) ok = await chapter(P, ck, (chDeadline || {})[ck]);
    else if (ck === 'home') ok = await scene(P, ck, '#hnext');
    else if (ck === 'extras') ok = await extras(P);
    else ok = await platformStep(P.page, ck);
    if (ok === 'gone' || P.gone) return 'gone';
    if (!ok && await P.page.evaluate(ENDED).catch(() => false)) return 'ended';
    if (!ok) { await shot(P.page, P.tag + '-stuck-' + ck); must(false, P.tag + ' could not leave ' + ck); return 'stuck:' + ck; }
    const nx = await waitChunkChange(P.page, ck, 12000);
    if (nx === ck && !(await P.page.evaluate(ENDED).catch(() => false))) { await shot(P.page, P.tag + '-stuck-' + ck); must(false, P.tag + ' stuck on ' + ck); return 'stuck:' + ck; }
  }
  return 'guard';
}
const record5 = (page, email) => page.evaluate(([cls, e]) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const r = db.pupils[cls + ':' + e]; return r && r.L && r.L['5'] ? r.L['5'] : null; }, [CLS, email]).catch(() => null);
const frameErrs = async P => { const fr = await frameOf(P.page); return fr ? fr.evaluate(() => window.__errs || []).catch(() => []) : []; };

/* ---- set up N pupils, all opening Lesson 5 at the same moment ---- */
async function start(browser, who, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 768 } });
  await ctx.addInitScript(COLLECT);
  const errs = [], pages = [];
  for (const w of who) pages.push(await open(ctx, w, errs, (opts.block || {})[w] ? { blockLive: 1 } : null));
  await seed(pages[0], who);
  for (const p of pages) await p.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  for (const p of pages) await WALK.primeDevKeys(p, BASE).catch(() => {});
  const tiles = await Promise.all(pages.map(openLesson5));
  must(tiles.every(t => t && /Bug Bounty/i.test(t)), 'every pupil found the Lesson 5 tile (' + tiles[0] + ')');
  const P = pages.map((p, i) => pupil(p, who[i]));
  /* the platform's own recap page comes first; the pairing is made when the radio page opens */
  const at = await Promise.all(P.map(x => walk(x, 'radio')));
  must(at.every(c => c === 'radio'), 'every pupil got past the recap to the radio page (' + at.join(', ') + ')');
  const frames = await Promise.all(pages.map(p => frameReady(p, 60000)));
  must(frames.every(Boolean), 'every pupil\'s first page opened (' + frames.map(f => !!f).join(', ') + ')');
  const hashes = await Promise.all(frames.map(f => f ? hashOf(f).catch(() => null) : null));
  note('seats ' + hashes.map((h, i) => who[i] + '=' + (h ? h.seat + '/' + (h.seats || []).join('') + '@' + h.room + (h.fallback ? ' fallback' : '') : 'none')).join(' · '));
  P.forEach((x, i) => { x.hash = hashes[i]; x.email = WHO[who[i]]; });
  return { ctx, P, errs };
}
function samePair(P, n) {
  const hs = P.map(x => x.hash);
  must(hs.every(h => h && h.room && h.room === hs[0].room), 'all ' + n + ' pupils are in the same live room (' + (hs[0] && hs[0].room) + ')');
  must(hs.every(h => h && (h.seats || []).length === n), n + ' seats in the room (' + hs.map(h => h && h.seats.join('')).join(', ') + ')');
  must(new Set(hs.map(h => h && h.seat)).size === n, 'one seat each (' + hs.map(h => h && h.seat).join(', ') + ')');
}
async function finishChecks(P, errs, opts) {
  opts = opts || {};
  for (const x of P) {
    if (x.gone) continue;
    if (!opts.noEnd) {
      const end = await x.page.evaluate(() => { const d = document.querySelector('.badge-pop-card.finish') || document.querySelector('.exit-done'); return d ? d.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : null; }).catch(() => null);
      must(!!end, x.tag + ' reaches the done card (' + end + ')');
      await shot(x.page, x.tag + '-done');
      const rec = await record5(x.page, x.email);
      must(rec && Number(rec[0]) === 2, x.tag + '\'s lesson record is marked done (' + JSON.stringify(rec) + ')');
    }
    must(x.looks === 0 || x.empty === 0, x.tag + ': no dead screen, the bar had a line at every one of ' + x.looks + ' looks (' + x.empty + ' empty)');
    must(!x.awayBad.length, x.tag + ': every away card says the approved words' + (x.awayBad.length ? ' · ' + x.awayBad.join(' | ') : ''));
    const fe = await frameErrs(x);
    if (fe.length) errs.push(x.tag + ' frame: ' + fe.join(' | '));
    note(x.tag + ' walked ' + x.walked.join(' ') + ' · tells ' + x.tells + ' · fixes from a slip ' + x.slipFixes + ' · modes ' + Object.keys(x.modes).join('/') + ' · notices ' + (Object.keys(x.notices).join(' ') || 'none') + ' · away cards ' + x.aways);
  }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 6).join(' | ') : ''));
}

/* ================= SCENARIOS ================= */
async function scenPair(browser) {
  const { ctx, P, errs } = await start(browser, ['orla', 'katie']);
  samePair(P, 2);
  const [A, B] = P;
  /* at each chapter's opening, both laptops agree on the room and show only this chapter's slips */
  const seen = {};
  for (const x of P) x.hooks.push(...['ch1', 'ch2', 'ch3', 'ch4'].map(ck => ({ ck, when: async () => true, act: async (p, fr) => { const s = await snapOf(fr).catch(() => null); (seen[ck] = seen[ck] || {})[p.tag] = s; } })));
  const res = await Promise.all(P.map(x => walk(x)));
  must(res.every(r => r === 'ended'), 'both walk the whole hour (' + res.join(', ') + ')');
  for (const ck of ['ch1', 'ch2', 'ch3', 'ch4']) {
    const a = (seen[ck] || {}).orla, b = (seen[ck] || {}).katie;
    must(!!a && !!b && a.mode === 'pair' && b.mode === 'pair' && a.local.length === 1 && b.local.length === 1, ck + ': each keeps her own light only, live (' + (a && a.mode + ':' + a.local) + ', ' + (b && b.mode + ':' + b.local) + ')');
    must(!!a && !!b && a.otherCh === 0 && b.otherCh === 0, ck + ': no slip from an earlier chapter is shown');
  }
  must(A.tells > 0 && B.tells > 0, 'slips crossed both ways (Orla radioed ' + A.tells + ', Katie ' + B.tells + ')');
  must(A.slipFixes > 0 && B.slipFixes > 0, 'each fixed a fault her partner radioed (Orla ' + A.slipFixes + ', Katie ' + B.slipFixes + ')');
  must(['orla', 'katie'].every(t => !P.find(x => x.tag === t).notices['bar.dark'] && !P.find(x => x.tag === t).notices['bar.slow']), 'nobody fell back: no slow link, no silent partner');
  await finishChecks(P, errs);
  await ctx.close();
}

async function scenReload(browser) {
  const { ctx, P, errs } = await start(browser, ['orla', 'katie']);
  samePair(P, 2);
  const [A, B] = P;
  let before = {}, after = {};
  const reloadHook = (ck, when, who) => ({ ck, when, act: async (p, fr) => {
    before[who] = await snapOf(fr).catch(() => null);
    note(p.tag + ' reloads in ' + ck + ': ' + JSON.stringify(before[who]));
    await shot(p.page, p.tag + '-' + ck + '-before-reload');
    await p.page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500);
    await p.page.evaluate(() => { const s = document.querySelector('.intro-skip'); if (s) s.click(); }); await sleep(500);
    if (!await chunkNow(p.page)) { await openLesson5(p.page); await sleep(2500); }
    const back = await chunkNow(p.page);
    must(back === ck, p.tag + ': a reload in ' + ck + ' comes back to ' + ck + ' (' + back + ')');
    const f2 = await frameReady(p.page, 40000);
    await sleep(4000);   // the room's history arrives
    after[who] = f2 ? await snapOf(f2).catch(() => null) : null;
    note(p.tag + ' after the reload: ' + JSON.stringify(after[who]));
    await shot(p.page, p.tag + '-' + ck + '-after-reload');
    const b = before[who], a = after[who];
    must(!!(a && b && a.stage === b.stage && a.seat === b.seat && a.seats === b.seats), p.tag + ': same chapter, same seat, same room after the reload');
    must(!!(a && b && a.code === b.code), p.tag + ': her program comes back as she left it');
    must(!!(a && a.mode === 'pair'), p.tag + ': still live with her partner after the reload (' + (a && a.mode) + ')');
    must(!!(a && a.otherCh === 0), p.tag + ': no slip from an earlier chapter came back with the history');
  } });
  /* Katie: part-way through ch1, once she has made two moves (a slip in ch1 comes only if a light stays out 30 s,
     which a quick pair never needs). Orla: once she has radioed in ch2 */
  B.hooks.push(reloadHook('ch1', async (p, fr, moves) => moves >= 2, 'katie'));
  A.hooks.push(reloadHook('ch2', async (p, fr) => fr.evaluate(() => TLUI.E.S.slips.some(x => x.ch === 'ch2' && x.from === TLUI.E.S.seat) || Object.keys(TLUI.E.S.sent || {}).some(k => /ch2/.test(k))).catch(() => false) || p.tells > 0 && (await chunkNow(p.page)) === 'ch2', 'orla'));
  const res = await Promise.all(P.map(x => walk(x, 'ch3')));
  must(res.every(r => r === 'ch3'), 'both finish ch1 and ch2 around the reloads (' + res.join(', ') + ')');
  must(!!before.katie, 'Katie\'s reload happened (part-way through ch1)');
  must(!!before.orla, 'Orla\'s reload happened (she radioed in ch2)');
  const fr = await frameReady(A.page, 30000), fr2 = await frameReady(B.page, 30000);
  const [s3a, s3b] = [fr && await snapOf(fr).catch(() => null), fr2 && await snapOf(fr2).catch(() => null)];
  must(!!(s3a && s3b && s3a.otherCh === 0 && s3b.otherCh === 0), 'ch3 opens with no earlier slips on either laptop');
  await finishChecks(P, errs, { noEnd: true });
  await ctx.close();
}

async function scenGone(browser) {
  const { ctx, P, errs } = await start(browser, ['orla', 'katie']);
  samePair(P, 2);
  const [A, B] = P;
  let shutAt = null;
  B.hooks.push({ ck: 'ch2', when: async (p, fr, moves) => moves >= 2, act: async p => { shutAt = Date.now(); note('Katie\'s laptop shuts in ch2'); await shot(p.page, 'katie-ch2-shut'); p.gone = true; await p.page.close(); } });
  let darkIn = null, ch3 = null;
  A.hooks.push({ ck: 'ch3', when: async () => true, act: async (p, fr) => { ch3 = await snapOf(fr).catch(() => null); } });
  const watch = (async () => { while (!darkIn && !A.gone) { const fr = await frameOf(A.page); const d = fr && await fr.evaluate(() => TLUI.E.S.local.length === TLUI.E.S.seats.length).catch(() => false); if (d && shutAt) { darkIn = (Date.now() - shutAt) / 1000; await shot(A.page, 'orla-dark'); } await sleep(1000); if (Date.now() - t0 > 40 * 60000) break; } })();
  const res = await Promise.all([walk(A, null, { ch2: 480 }), walk(B)]);
  await watch.catch(() => {});
  note('Orla took both lights ' + (darkIn == null ? 'never' : darkIn.toFixed(0) + ' s') + ' after Katie\'s laptop shut');
  must(res[0] === 'ended', 'Orla walks the whole hour after her partner leaves (' + res[0] + ')');
  must(darkIn != null && darkIn <= 200, 'Orla keeps both lights within the 3 minute silence rule (' + (darkIn == null ? 'never' : darkIn.toFixed(0) + ' s') + ')');
  must(!!A.notices['bar.dark'], 'Orla\'s bar told her she keeps both lights (bar.dark)');
  must(!!(ch3 && ch3.local.length === 2), 'ch3 opens with both lights already hers, no second wait (' + (ch3 && ch3.local) + ')');
  await finishChecks(P, errs);
  await ctx.close();
}

async function scenOneBlocked(browser) {
  const { ctx, P, errs } = await start(browser, ['orla', 'katie'], { block: { katie: 1 } });
  const [A, B] = P;
  must(!!(A.hash && B.hash && A.hash.room && A.hash.room === B.hash.room), 'the platform still pairs them (one room)');
  let ch1Open = null, darkIn = null, ch2 = null;
  A.hooks.push({ ck: 'ch1', when: async () => true, act: async () => { ch1Open = Date.now(); } });
  A.hooks.push({ ck: 'ch2', when: async () => true, act: async (p, fr) => { ch2 = await snapOf(fr).catch(() => null); } });
  const watch = (async () => { while (!darkIn) { const c = await chunkNow(A.page); if (c === 'ch1' && ch1Open) { const fr = await frameOf(A.page); const d = fr && await fr.evaluate(() => TLUI.E.S.local.length === TLUI.E.S.seats.length).catch(() => false); if (d) { darkIn = (Date.now() - ch1Open) / 1000; await shot(A.page, 'orla-ch1-dark'); } } else if (c && /ch[2-4]|home|exit|close|extras/.test(c)) break; await sleep(1000); } })();
  const res = await Promise.all([walk(A, null, { ch1: 480 }), walk(B)]);
  await watch.catch(() => {});
  must(res.every(r => r === 'ended'), 'both reach the end (' + res.join(', ') + ')');
  /* the blocked laptop falls back by her seat: seat B gets the away card on every page, seat A keeps both lights and is told the link is slow */
  if (B.hash && B.hash.seat === 'B') must(B.aways >= 8, 'Katie (seat B, blocked) got the away card with Next on every page of the hour (' + B.aways + ')');
  else must(B.aways === 0 && !!B.notices['bar.slow'], 'Katie (seat A, blocked) keeps both lights and her bar says the link is slow (' + Object.keys(B.notices).join(',') + ')');
  note('Orla took both lights ' + (darkIn == null ? 'never' : darkIn.toFixed(0) + ' s') + ' into ch1');
  must(darkIn != null && darkIn <= 200, 'Orla keeps both lights in ch1 within the 3 minute silence rule');
  must(!!(ch2 && ch2.local.length === 2), 'from ch2 on both lights are hers at once (' + (ch2 && ch2.local) + ')');
  await finishChecks(P, errs);
  await ctx.close();
}

async function scenBlocked(browser) {
  const { ctx, P, errs } = await start(browser, ['orla', 'katie'], { block: { orla: 1, katie: 1 } });
  const [A, B] = P;
  let ch1 = null;
  A.hooks.push({ ck: 'ch1', when: async (p, fr) => fr.evaluate(() => TLUI.E.S.mode === 'slow').catch(() => false), act: async (p, fr) => { ch1 = await snapOf(fr).catch(() => null); await shot(p.page, 'orla-ch1-slow'); } });
  const res = await Promise.all([walk(A), walk(B)]);
  must(res.every(r => r === 'ended'), 'both reach the end (' + res.join(', ') + ')');
  const seatA = [A, B].find(x => x.hash && x.hash.seat === 'A'), seatB = [A, B].find(x => x.hash && x.hash.seat === 'B');
  note('seat A is ' + (seatA && seatA.tag) + ', seat B is ' + (seatB && seatB.tag));
  must(!!seatB && seatB.aways >= 8, 'seat B got the away card with Next on every page of the hour (' + (seatB && seatB.aways) + ')');
  must(!!seatA && seatA.aways === 0 && !!seatA.notices['bar.slow'], 'seat A keeps both lights and her bar says the link is slow');
  if (seatA === A) must(!!(ch1 && ch1.local.length === 2), 'ch1: both lights on Orla\'s laptop (' + (ch1 && ch1.local) + ')');
  await finishChecks(P, errs);
  await ctx.close();
}

async function scenTrio(browser) {
  const { ctx, P, errs } = await start(browser, ['orla', 'katie', 'maeve']);
  samePair(P, 3);
  /* through ch2: ch1's faults all show red, so nobody needs a slip there; ch2's silent horn is found only from a slip */
  const res = await Promise.all(P.map(x => walk(x, 'ch3')));
  must(res.every(r => r === 'ch3'), 'all three finish ch1 and ch2 together (' + res.join(', ') + ')');
  must(P.reduce((n, x) => n + x.tells, 0) >= 2, 'slips crossed in the trio (' + P.map(x => x.tag + ' ' + x.tells).join(', ') + ')');
  must(P.every(x => !x.notices['bar.dark'] && !x.notices['bar.slow']), 'nobody fell back in the trio');
  await finishChecks(P, errs, { noEnd: true });
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const all = { pair: scenPair, reload: scenReload, gone: scenGone, oneblocked: scenOneBlocked, blocked: scenBlocked, trio: scenTrio };
  const run = SCEN === 'all' ? Object.keys(all) : [SCEN];
  for (const k of run) {
    SCEN_NOW = k; OUT = path.join(RT, 'out', 'l5-paired', k + '-' + WIDTH); fs.mkdirSync(OUT, { recursive: true });
    console.log('\n=== ' + k + ' (width ' + WIDTH + ') ===');
    try { await all[k](browser); } catch (e) { must(false, 'the scenario stopped: ' + String(e.message || e).split('\n')[0]); }
  }
  await browser.close();
  console.log('\n' + checks + ' checks, ' + FAILS.length + ' failed.');
  FAILS.forEach(f => console.log('  FAILED ' + f));
  process.exit(FAILS.length ? 1 : 0);
})();
