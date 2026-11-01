/* J3 L5 V2 SAME LIGHT · the platform paired gate (A4, A14, A15 and the one-pairing law, spec §7). Real pupils on the
 * platform (dev store, class Demo-10A), the hour's frame on the REAL live link (Firebase), driven by l5v2-drive.js.
 *   --scenario pair     two pupils from the tile to the done card: one pairing (PairKit.ensure once each), one room
 *   --scenario reload   paired; Katie reloads the platform as ch2 opens: same screen, no pairing card, no second ensure (A4)
 *   --scenario trio     three pupils, one room, seats A B C: the Fixer rotates, the point agrees on any two (A14)
 *   --scenario gone     paired; Katie's laptop shuts as ch2 opens: Orla is told, takes every job, finishes (A15)
 *   --scenario blocked  both live links blocked: each pupil gets the on-your-own card and finishes the hour alone
 *   --scenario all      every one of the above
 *   --control           pair, with a second PairKit.ensure forced on Katie: the gate must go RED
 * node ks3-dt/tools/record-tutorial/qa-l5-paired.js [--base http://localhost:8121] [--scenario all] [--width 1366]
 * Writes the dev store only. Screenshots into out/l5v2-paired/. Exit 1 on any failed check. */
const RT = __dirname;
const { chromium } = require(RT + '/node_modules/playwright');
const WALK = require(RT + '/lib/walk-moves.js');
const { drive } = require(RT + '/l5v2-drive.js');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8121');
const WIDTH = Number(argOf('--width', '1366'));
const CONTROL = args.includes('--control');
const SCEN = CONTROL ? 'pair' : argOf('--scenario', 'all');
const SPEED = 20, CLS = 'Demo-10A';
const WHO = { orla: 'orla.mccann@demo', katie: 'katie.lennon@demo', maeve: 'maeve.torley@demo' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now(); const ts = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's ';
const OUT = path.join(RT, 'out', 'l5v2-paired'); fs.mkdirSync(OUT, { recursive: true });
let SCEN_NOW = '', checks = 0; const FAILS = [];
const must = (ok, what) => { checks++; console.log(ts() + (ok ? 'PASS ' : 'FAIL ') + what); if (!ok) FAILS.push(SCEN_NOW + ': ' + what); return ok; };
const note = s => console.log(ts() + '     ' + s);
const shot = (page, name) => page.screenshot({ path: path.join(OUT, SCEN_NOW + '-' + name + '.png') }).catch(() => {});

async function open(ctx, who, errs, blocked) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: WIDTH, height: 768 });
  if (blocked) {
    /* her school's network blocks the live link: the database host never answers */
    await page.route(/firebasedatabase\.app|firebaseio\.com/, r => r.abort());
    await page.routeWebSocket(/firebasedatabase\.app|firebaseio\.com/, ws => ws.close());
  }
  page.on('pageerror', e => errs.push(who + ': ' + String(e).split('\n')[0]));
  page.on('response', r => { if (r.status() >= 400 && !/favicon|dev-keys\.json/.test(r.url())) errs.push(who + ' ' + r.status() + ' ' + r.url().replace(BASE, '').slice(0, 140)); });
  page.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR_ABORTED|404|play\(\)|autoplay|AudioContext/.test(m.text()) && !(blocked && /net::ERR_FAILED|firebase/i.test(m.text()))) errs.push(who + ' console: ' + m.text().slice(0, 160)); });
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=' + CLS + '&as=' + who + '&speed=' + SPEED, { waitUntil: 'domcontentloaded' });
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
    ['pairing', 'pq'].forEach(store => { if (db[store]) Object.keys(db[store]).forEach(k => { if (k.indexOf(cls + '|') === 0) delete db[store][k]; }); });
    db.pres = db.pres || {}; db.pres[cls] = {};
    for (const email of emails) db.pres[cls][email] = [now, '5', 0, 0];
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
    Object.keys(localStorage).forEach(k => { if (/^samelight:/.test(k)) localStorage.removeItem(k); });
  }, [CLS, names.map(n => WHO[n])]);
}
async function openLesson5(page) {
  await page.evaluate(() => { const s = document.querySelector('.intro-skip'); if (s) s.click(); });
  await sleep(500);
  return page.evaluate(() => { const t = Array.from(document.querySelectorAll('.tile')).find(e => /Lesson\s*5(?!\d)/i.test(e.textContent)); if (t) t.click(); return t ? t.textContent.replace(/\s+/g, ' ').trim() : null; });
}
const chunkNow = page => page.evaluate(() => { const s = window.App && App.state; return s && s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; }).catch(() => null);
const frameOf = async page => { const h = await page.$('#chunk-host iframe.twolights-frame').catch(() => null); return h ? h.contentFrame() : null; };
const ENDED = () => { const s = window.App && App.state; return !!document.querySelector('.badge-pop-card.finish') || (!!document.querySelector('.exit-done') && !!s && s.chunks && s.chunkIdx >= s.chunks.length - 1); };
const pairCard = page => page.evaluate(() => !!document.querySelector('#chunk-host .pair-wait')).catch(() => false);
const tlPair = page => page.evaluate(() => App.state && App.state.draft && App.state.draft.tlPair || null).catch(() => null);
/* count every PairKit.ensure from the moment Lesson 5 opens (the law: once per pupil per hour, spec §7) */
const countEnsure = page => page.evaluate(() => {
  if (!window.PairKit || PairKit.__counted) return; const k = PairKit.ensure; window.__ensureN = 0;
  PairKit.ensure = function () { window.__ensureN++; return k.apply(this, arguments); }; PairKit.__counted = 1;
});
const ensureN = page => page.evaluate(() => window.__ensureN || 0).catch(() => -1);

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
/* the platform's own pages (recap, questions, close) until `until` or the done card; the hour's frames are pressed by hand */
async function walk(tag, page, until) {
  for (let guard = 0; guard < 30; guard++) {
    if (await page.evaluate(ENDED).catch(() => false)) return 'ended';
    const ck = await chunkNow(page);
    if (!ck) { await sleep(500); continue; }
    if (until && ck === until) return ck;
    let ok;
    if (ck === 'twolights') { const fr = await frameOf(page); ok = fr && await fr.evaluate(() => { const b = document.querySelector('button[data-act="five"]'); if (b) { window.__badgesAtFive = JSON.stringify(SameLightDebug.state().badges); b.click(); } return !!b; }).catch(() => false); if (ok && process.env.DBG) note(tag + ' badges at five: ' + await fr.evaluate(() => window.__badgesAtFive).catch(e => e.message)); }
    else if (ck === 'extras') { const fr = await frameOf(page); await sleep(1500); ok = fr && await fr.evaluate(() => { const b = document.querySelector('button[data-act="home"]'); if (b) b.click(); return !!b; }).catch(() => false); }
    else ok = await platformStep(page, ck);
    if (!ok && await page.evaluate(ENDED).catch(() => false)) return 'ended';
    if (!ok) { await shot(page, tag + '-stuck-' + ck); must(false, tag + ' could not leave ' + ck); return 'stuck:' + ck; }
    const nx = await waitChunkChange(page, ck, 15000);
    if (nx === ck && !(await page.evaluate(ENDED).catch(() => false))) { await shot(page, tag + '-stuck-' + ck); must(false, tag + ' stuck on ' + ck); return 'stuck:' + ck; }
  }
  return 'guard';
}
const record5 = (page, email) => page.evaluate(([cls, e]) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const r = db.pupils[cls + ':' + e]; return r && r.L && r.L['5'] ? r.L['5'] : null; }, [CLS, email]).catch(() => null);

/* the hour's frame as the driver's page: resolved afresh on every call, so a reload of the platform is followed */
function framePage(page) {
  const fr = async () => { for (let i = 0; i < 300; i++) { const f = await frameOf(page); if (f) return f; await sleep(100); } throw new Error('the hour frame never opened'); };
  const retry = async fn => { for (let i = 0; ; i++) { try { return await fn(await fr()); } catch (e) { if (i > 4 || !/detached|destroyed|navigat/i.test(e.message)) throw e; await sleep(400); } } };
  return {
    evaluate: (fn, arg) => retry(f => f.evaluate(fn, arg)),
    click: sel => retry(f => f.click(sel, { timeout: 30000 })),
    waitForSelector: (sel, o) => retry(f => f.waitForSelector(sel, { state: 'visible', timeout: ((o && o.timeout) || 8000) * 4 })),
    waitForFunction: (fn, o) => retry(f => f.waitForFunction(fn, null, o)),
    $: sel => retry(f => f.$(sel)),
    screenshot: o => page.screenshot(o), url: () => page.url()
  };
}

/* N pupils open Lesson 5 together and walk the platform's pages up to the hour */
async function start(browser, who, blocked) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 768 } });
  const errs = [], pages = [];
  for (const w of who) pages.push(await open(ctx, w, errs, blocked));
  await seed(pages[0], who);
  for (const p of pages) await p.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  for (const p of pages) await WALK.primeDevKeys(p, BASE).catch(() => {});
  const tiles = await Promise.all(pages.map(openLesson5));
  must(tiles.every(t => t && /Lesson\s*5/i.test(t)), 'every pupil found the Lesson 5 tile (' + tiles[0] + ')');
  for (const p of pages) await countEnsure(p);
  const at = await Promise.all(pages.map((p, i) => walk(who[i], p, 'twolights')));
  must(at.every(c => c === 'twolights'), 'every pupil reached the hour (' + at.join(', ') + ')');
  return { ctx, pages, errs };
}
/* after the sound check the platform pairs once; map each pupil's frame to her seat */
async function seats(pages, who, n) {
  const fps = pages.map(framePage);
  await Promise.all(fps.map(async f => { await f.click('button[data-act="horn"]'); await f.click('button[data-act="yes"]'); }));
  const end = Date.now() + 60000; let tp = [];
  while (Date.now() < end) { tp = await Promise.all(pages.map(tlPair)); if (tp.every(Boolean)) break; await sleep(300); }
  note('pairs ' + tp.map((p, i) => who[i] + '=' + (p ? p.seat + '/' + p.mode + '@' + p.room : 'none')).join(' · '));
  if (n > 1) {
    must(tp.every(p => p && p.room && p.room === tp[0].room && p.fire === tp[0].room), 'all ' + n + ' pupils are in one live room (' + (tp[0] && tp[0].room) + ')');
    must(new Set(tp.map(p => p && p.seat)).size === n, 'one seat each (' + tp.map(p => p && p.seat).join(', ') + ')');
    must(tp.every(p => p && p.mode === (n === 3 ? 'trio' : 'pair')), 'the mode is ' + (n === 3 ? 'trio' : 'pair') + ' (' + tp.map(p => p && p.mode).join(', ') + ')');
  }
  const map = {}; tp.forEach((p, i) => { if (p) map[p.seat] = fps[i]; });
  return { tp, map, fps };
}
const driveOpts = (SEATS, MODE, extra) => Object.assign({ soundDone: true, SEATS, PATH: 'right', RELOAD: false, CONTROL: false, MODE, W: WIDTH, SHOTS: '', fails: [], log: process.env.DBG ? (...a) => note(a.join(' ').slice(0, 220)) : () => {}, sleep }, extra || {});
async function ended(pages, who, errs, skip) {
  for (let i = 0; i < pages.length; i++) {
    if (skip && skip[i]) continue;
    const r = await walk(who[i], pages[i]);
    must(r === 'ended', who[i] + ' reaches the done card (' + r + ')');
    await shot(pages[i], who[i] + '-done');
    const rec = await record5(pages[i], WHO[who[i]]);
    must(rec && Number(rec[0]) === 2, who[i] + '\'s lesson record is marked done (' + JSON.stringify(rec && rec.slice(0, 3)) + ')');
    const n = await ensureN(pages[i]);
    must(n === 1, who[i] + ': PairKit.ensure ran once in the hour (' + n + ')');
  }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 6).join(' | ') : ''));
}
async function hourTo(map, SEATS, MODE, extra) {
  const o = driveOpts(SEATS, MODE, extra);
  try { await drive(map, o); } catch (e) {
    o.fails.push('the hour stopped: ' + String(e.message).slice(0, 300));
    for (const s of Object.keys(map)) { await map[s].screenshot({ path: path.join(OUT, SCEN_NOW + '-stopped-' + s + '.png') }).catch(() => {});
      note('seat ' + s + ' sees: ' + await map[s].evaluate(() => { const v = document.getElementById('view'), r = v && v.getBoundingClientRect(); return JSON.stringify({ view: r && [r.width, r.height, getComputedStyle(v).visibility, getComputedStyle(v).display], lines: document.querySelectorAll('#view .ln').length, job: (document.getElementById('job') || {}).textContent }); }).catch(e => e.message)); }
  }
  o.fails.forEach(f => must(false, f));
  must(!o.fails.length, MODE + ': the hour runs from the sound check to Home on the live link');
}

/* ================= SCENARIOS ================= */
async function scenPair(browser) {
  const who = ['orla', 'katie'];
  const { ctx, pages, errs } = await start(browser, who);
  const { map } = await seats(pages, who, 2);
  if (CONTROL) await pages[1].evaluate(() => { try { PairKit.ensure(App.ctx || {}, document.createElement('div'), function () {}, {}, { quiet: true }); } catch (e) {} });
  let cards = 0;
  await hourTo(map, ['A', 'B'], 'pair', { onChapter: async () => { for (const p of pages) if (await pairCard(p)) cards++; } });
  must(cards === 0, 'no pairing card once the hour has begun (' + cards + ' seen at chapter starts)');
  await shot(pages[0], 'orla-home');
  await ended(pages, who, errs);
  await ctx.close();
}
async function scenReload(browser) {
  const who = ['orla', 'katie'];
  const { ctx, pages, errs } = await start(browser, who);
  const { map, tp } = await seats(pages, who, 2);
  const k = pages[1], kSeat = tp[1] && tp[1].seat;
  await hourTo(map, ['A', 'B'], 'pair', { onChapter: async (id) => {
    if (id !== 'ch2') return;
    const snap = () => map[kSeat].evaluate(() => { const x = SameLightDebug.state(); return { phase: x.phase, stage: x.local[SameLightDebug.seat].stage, no: x.ch && x.ch.fault && x.ch.fault.no }; });
    await sleep(400); const before = await snap();
    await k.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500);
    if (!await chunkNow(k)) { await openLesson5(k); await sleep(2500); }
    must(await chunkNow(k) === 'twolights', 'A4: the reload comes back to the hour (' + await chunkNow(k) + ')'); await countEnsure(k);
    const f = framePage(k); await f.waitForSelector('#app', { timeout: 15000 }).catch(() => {});
    await sleep(800);
    for (const a of ['horn', 'yes']) await f.evaluate(a => { const b = document.querySelector('button[data-act="' + a + '"]'); if (b && b.offsetParent) b.click(); }, a);
    await sleep(800);
    const after = await snap(), card = await pairCard(k);
    note('Katie before ' + JSON.stringify(before) + ' · after ' + JSON.stringify(after));
    must(after.phase === before.phase && after.stage === before.stage && after.no === before.no, 'A4: Katie\'s reload lands on the same screen (' + after.phase + '/' + after.stage + ')');
    must(!card, 'A4: no pairing card after the reload');
    must(await ensureN(k) === 0, 'A4: the reload did not pair again');
    must(JSON.stringify(await tlPair(k)) === JSON.stringify(tp[1]), 'A4: the same room and seat after the reload');
    await shot(k, 'katie-after-reload');
  } });
  /* the reload's own count starts at zero; the pupil paired once before it */
  await k.evaluate(() => { window.__ensureN = 1; });
  await ended(pages, who, errs);
  await ctx.close();
}
async function scenTrio(browser) {
  const who = ['orla', 'katie', 'maeve'];
  const { ctx, pages, errs } = await start(browser, who);
  const { map } = await seats(pages, who, 3);
  const fixers = new Set();
  await hourTo(map, ['A', 'B', 'C'], 'trio', { onChapter: async () => { const x = await map.A.evaluate(() => { const f = SameLightDebug.state().ch.fault; return f && f.fixerNow; }).catch(() => null); if (x) fixers.add(x); } });
  must(fixers.size === 3, 'A14: the Fixer job went round all three seats (' + [...fixers].join('') + ')');
  await ended(pages, who, errs);
  await ctx.close();
}
async function scenGone(browser) {
  const who = ['orla', 'katie'];
  const { ctx, pages, errs } = await start(browser, who);
  const { map, tp } = await seats(pages, who, 2);
  const oSeat = tp[0].seat, kSeat = tp[1].seat, SEATS = ['A', 'B'];
  let told = '';
  await hourTo(map, SEATS, 'pair', { onChapter: async (id) => {
    if (id !== 'ch2') return;
    await pages[1].close(); note('Katie\'s laptop shuts as ch2 opens');
    const end = Date.now() + 40000; let g = false;
    while (Date.now() < end && !g) { g = await map[oSeat].evaluate(s => !!SameLightDebug.state().gone[s], kSeat).catch(() => false); if (!g) await sleep(300); }
    must(g, 'A15: Orla\'s hour sees Katie has gone');
    SEATS.splice(SEATS.indexOf(kSeat), 1);
    await sleep(800);
    told = await map[oSeat].evaluate(() => { const b = document.getElementById('linkbar'); return b && b.className === 'show' ? b.textContent : ''; });
    await shot(pages[0], 'orla-told');
  } });
  must(/gone quiet/i.test(told), 'A15: Orla is told in plain words (' + told + ')');
  await ended(pages, who, errs, [false, true]);
  await ctx.close();
}
async function scenBlocked(browser) {
  const who = ['orla', 'katie'];
  const { ctx, pages, errs } = await start(browser, who, true);
  const { tp, fps } = await seats(pages, who, 1);
  const solo = [];
  for (const f of fps) { await f.waitForSelector('button[data-act="pair"]', { timeout: 15000 }).catch(() => {}); await sleep(11000 / SPEED + 500); solo.push(await f.evaluate(() => (document.querySelector('#page .pg h1') || {}).textContent || '')); }
  note('the pair page says: ' + solo.join(' | '));
  const want = await fps[0].evaluate(() => SameLightStrings.render('pair.solo.1'));
  must(solo.every(s => s === want), 'a blocked link gives each pupil the on-your-own card (' + want + ')');
  await Promise.all(fps.map((f, i) => hourTo({ [tp[i].seat]: f }, [tp[i].seat], 'pair', {})));
  await ended(pages, who, errs);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const all = { pair: scenPair, reload: scenReload, trio: scenTrio, gone: scenGone, blocked: scenBlocked };
  const run = SCEN === 'all' ? Object.keys(all) : [SCEN];
  for (const k of run) {
    SCEN_NOW = k; console.log('\n=== ' + k + (CONTROL ? ' (CONTROL)' : '') + ' at ' + WIDTH + ' px ===');
    try { await all[k](browser); } catch (e) { must(false, 'the scenario stopped: ' + String(e.message || e).split('\n')[0]); }
  }
  await browser.close();
  console.log('\n' + (FAILS.length ? FAILS.map(f => 'FAIL ' + f).join('\n') + '\n' : '') + 'qa-l5-paired' + (CONTROL ? ' (CONTROL)' : '') + ' · ' + run.join(' ') + ' · ' + checks + ' checks · ' + (FAILS.length ? 'RED ' + FAILS.length : 'PASS'));
  process.exit(FAILS.length ? 1 : 0);
})();
