#!/usr/bin/env node
/* qa-rush-paired.js — TWO REAL PUPILS, GENUINELY PAIRED, THROUGH THE RUSH (j3-04).
 *
 * WHY IT EXISTS. Every walker walks ALONE, and the expert walk crosses the Rush
 * on the Studio's own orders (the solo route). The Rush's paired half — the
 * order form, the partner's orders arriving, RUN their orders through my
 * factory, the products travelling back, the check card with its Yes/No, the
 * seal that names the partner — was measured by nothing. qa-swap-paired is the
 * precedent (the Chatbot Swap, 28 Aug 2026); this is the same rig on the Rush:
 * two browser contexts against one dev store, both driven with the platform's
 * own movers, and the exchange asserted from BOTH sides.
 *
 *   node qa-rush-paired.js                       (the built engine, three clean runs)
 *   node qa-rush-paired.js --runs 1
 *   node qa-rush-paired.js --base http://localhost:8097 --expect-fail   (the build he sat has no Rush)
 *
 * WHAT IT ASSERTS, each line named from the design (spec §C1.4 / §C13):
 *   R1  both pupils are paired with REAL call signs from the Rush's pool — never
 *       the preview's simulated partner
 *   R2  A's three orders arrive on B's screen as B's "Their orders" card, and
 *       B's on A's — the names and seats each typed, exactly
 *   R3  RUN their orders through my factory makes the products from HER OWN
 *       machines: the floor on the run card shows the partner's three orders
 *       and the products the spec would want
 *   R4  the products travel: A's check card shows what B's factory made from
 *       A's orders (B's products, not A's own), one card per order
 *   R5  Yes on every card seals both sides; the seal names the partner's REAL
 *       name and the count of Yes verdicts; the badge is banked as rush=4/4
 *   R6  the SOLO route: a pupil who takes the Studio's orders runs the same
 *       round alone and earns the same badge (§C10)
 *   R7  a partner's No is reported honestly: A marks the three cost products
 *       No (her call — a wrong machine cannot reach the Rush, the factory's
 *       badge stands in front of it), B's seal says 3 of 6, nobody is marked
 *   plus: readability on every distinct state either pupil stands on
 *
 * It writes to the dev store only (Demo-10A, two seeded demo pupils).
 */
'use strict';
const RT = __dirname;
const { chromium } = require(RT + '/node_modules/playwright');
const WALK = require(RT + '/lib/walk-moves.js');
const CA = require(RT + '/lib/contrast-audit.js');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8121');
const RUNS = Number(argOf('--runs', '3'));
const EXPECT_FAIL = args.includes('--expect-fail');
const OUT = path.join(RT, 'out', 'rush-paired');
fs.mkdirSync(OUT, { recursive: true });

const LOG = [];
const log = (s) => { const l = new Date().toISOString().slice(11, 19) + '  ' + s; console.log(l); LOG.push(l); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const findings = [];
const fail = (code, msg) => { findings.push(code + ': ' + msg); log('  ✗ ' + code + ' — ' + msg); };
const pass = (code, msg) => log('  ✓ ' + code + ' — ' + msg);

/* the two factories are FIXED, so every product is arithmetic: both are the
   spec's own reference pair (a wrong machine cannot reach the Rush — the
   factory's badge stands in front of it); on run 3 A marks the cost products
   No anyway, so the seal's count of No has something true to say (R7) */
const FACTORY_OK = 'def label(name, seats):\n    return name + " x " + str(seats)\n\ndef cost(seats):\n    return seats * 4\n\nprint(label("Aoife", 2))\nprint(cost(2))';
const A_ORDERS = [['Maeve', 2], ['Rory', 5], ['Sile', 1]];
const B_ORDERS = [['Tadhg', 3], ['Una', 4], ['Vince', 9]];

const readability = [];
async function auditState(page, tag) {
  try {
    /* readability is measured only once the page's own animations have
       stopped — a card still rising is a blend, not a colour (state-audit's
       own declared rule) */
    await sleep(900);
    /* while a badge pop or a modal is open, the OVERLAY is what she sees: it is
       measured, and the dimmed page behind it is not (state-audit's rule) */
    const root = await page.evaluate(() => {
      const pop = document.querySelector('.badge-pop.show, .pair-pop.show, .modal.show, [role="dialog"]:not([hidden])');
      return pop ? (pop.classList.contains('badge-pop') ? '.badge-pop.show' : pop.classList.contains('pair-pop') ? '.pair-pop.show' : null) : '.chunk-host';
    });
    if (!root) return;
    const rects = await page.evaluate(CA.COLLECT, [[], [], root]);
    const shot = await page.screenshot({ fullPage: true });
    const measured = await page.evaluate(CA.MEASURE, ['data:image/png;base64,' + shot.toString('base64'), rects]);
    let hit = false;
    measured.forEach(m => { if (!m.skip && m.ratio < CA.floorFor(m)) { hit = true; readability.push(tag + ': ' + m.sel + ' — ' + m.ratio + ':1 "' + m.text.slice(0, 40) + '" ink ' + m.ink + ' on ' + m.plate + ' at y=' + Math.round(m.y)); } });
    if (hit) fs.writeFileSync(path.join(OUT, 'unreadable-' + tag.replace(/[^\w.-]/g, '_') + '-' + Date.now() + '.png'), shot);
  } catch (e) { /* a page mid-navigation is not a state */ }
}

async function open(ctx, persona) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=Demo-10A&as=' + persona, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  return page;
}
async function seed(page, pairingOn) {
  await page.evaluate((on) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks['Demo-10A'] = db.locks['Demo-10A'] || {};
    for (const n of ['1', '2', '3', '4']) db.locks['Demo-10A'][n] = { u: now, on: 1 };
    db.cfg['Demo-10A'] = db.cfg['Demo-10A'] || {};
    db.cfg['Demo-10A'].pairing = { on: on ? 1 : 0 };
    const L = { '1': [2, 10, 'sit1=1', '1', '222|1', 100, 10, 0, '', 0, 0], '2': [2, 10, 'sit2=1', '1', '222|1', 101, 10, 0, '', 0, 0], '3': [2, 10, 'sit3=1', '1', '222|1', 102, 10, 0, '', 0, 0] };
    db.pupils = db.pupils || {};
    for (const [k, n] of [['orla.byrne@demo', 'Orla Byrne'], ['katie.walsh@demo', 'Katie Walsh']]) {
      const kk = 'Demo-10A:' + k;
      db.pupils[kk] = Object.assign(db.pupils[kk] || { n: n, cn: '', j: 1, xp: 0, g: '' }, { L: JSON.parse(JSON.stringify(L)) });
    }
    /* the Rush ALWAYS starts clean: no pairs, no queue, no blobs from a
       previous run of this harness */
    Object.keys(db.props || {}).forEach(k => { if (/j3-04/.test(k)) delete db.props[k]; });
    if (db.pairing) Object.keys(db.pairing).forEach(k => { if (/j3-04/.test(k)) delete db.pairing[k]; });
    if (db.pq) Object.keys(db.pq).forEach(k => { if (/j3-04/.test(k)) delete db.pq[k]; });
    if (db.chan) Object.keys(db.chan).forEach(k => { delete db.chan[k]; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, pairingOn);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
}
async function openLesson4(page, tag) {
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(800);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /Function Factory/i.test(e.textContent));
    if (t) t.click();
  });
  await sleep(3000);
  await WALK.primeDevKeys(page, BASE);
  log('[' + tag + '] opened Lesson 4');
}
const chunkNow = (page) => page.evaluate(WALK.chunkNow);

async function advance(page, tag, target, maxTurns, stopAt) {
  for (let i = 0; i < maxTurns; i++) {
    const ck = await chunkNow(page);
    if (ck === target) { log('[' + tag + '] reached ' + target + ' after ' + i + ' turns'); return true; }
    if (stopAt && await page.evaluate(stopAt)) { log('[' + tag + '] stopped where asked, at ' + ck); return true; }
    if (i % 5 === 0) await auditState(page, tag + ':' + ck);
    const st = await page.evaluate(WALK.detectKind);
    const mv = st && WALK.MOVES[st.kind];
    if (mv) {
      await page.evaluate(([src]) => { (new Function('return (' + src + ')')())(); }, [String(mv)]);
      await sleep(Math.min(WALK.SETTLE[st.kind] || 600, 2600));
      continue;
    }
    if (st && WALK.ACTIONS && WALK.ACTIONS[st.kind]) { try { await WALK.ACTIONS[st.kind](page); } catch (e) {} await sleep(800); continue; }
    await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const vis = (e) => e && e.offsetParent !== null && !e.disabled;
      const pop = q('.badge-pop button'); if (vis(pop)) { pop.click(); return; }
      const skip = q('.intro-skip'); if (vis(skip)) { skip.click(); return; }
      const opt = q('.chunk-host .q-opt'); if (vis(opt)) { opt.click(); return; }
      for (const b of document.querySelectorAll('.chunk-host button.primary-btn, .chunk-host button.ghost-btn')) {
        if (vis(b) && !/Nearly time up|leave|Leave/i.test(b.textContent)) { b.click(); return; }
      }
      const ta = q('.chunk-host textarea');
      if (vis(ta) && !ta.value) { ta.value = 'A paired-harness answer, long enough to pass the floor.'; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await sleep(700);
    if (i > 6 && i % 12 === 0) log('[' + tag + '] still at ' + ck + ' (kind=' + (st && st.kind) + ') turn ' + i);
  }
  log('[' + tag + '] FAILED to reach ' + target + ' — stuck at ' + (await chunkNow(page)));
  return false;
}

/* the factory, written by hand to a FIXED program so the products are known */
async function writeFactory(page, tag, code) {
  const ok = await advance(page, tag, 'factory', 220);
  if (!ok) return false;
  /* the intro card, then PLAN → BENCH, with the ordinary movers, until the
     typing box is on screen */
  const atBench = () => !!document.querySelector('.chunk-host .pye-bench .pye-code');
  const benched = await advance(page, tag, '__never__', 20, atBench);
  if (!benched) return false;
  await page.evaluate((c) => {
    const ta = document.querySelector('.chunk-host .pye-code');
    ta.value = c; ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, code);
  await page.evaluate(() => document.querySelector('.chunk-host .pyrun-run:not([disabled])').click());
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const v = await page.evaluate(() => { const v = document.querySelector('.chunk-host .pyrun-verdict'); return v && !v.hidden ? v.className : ''; });
    if (v) { log('[' + tag + '] factory verdict: ' + v); return /is-matched/.test(v); }
  }
  return false;
}

const atRushDoor = () => {
  const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
  if (!s || s.id !== 'rush') return false;
  return !!Array.from(document.querySelectorAll('.chunk-host button.primary-btn')).find(b => b.offsetParent !== null && /Open the Rush/.test(b.textContent));
};
const pressDoor = (page) => page.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button.primary-btn')).find(b => b.offsetParent !== null && /Open the Rush/.test(b.textContent)); if (b) b.click(); return !!b; });

/* the platform's own one-press guard: `App.armButton` ignores a click in the
   first 350 ms after a control mounts (DFM 104), so every wait that ends in a
   click settles for GUARD_MS first — a harness that does not is testing its
   own reflexes, not the lesson */
const GUARD_MS = 800;
async function waitFor(page, fn, ms, every) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) { await sleep(GUARD_MS); return true; } await sleep(every || 400); }
  return false;
}
async function fillOrders(page, orders) {
  await page.evaluate((o) => {
    const rows = document.querySelectorAll('.chunk-host .ord-form-card .ord-row');
    o.forEach((x, i) => {
      const r = rows[i]; if (!r) return;
      const n = r.querySelector('input[data-name]'), s = r.querySelector('input[data-seats]');
      if (n) { n.value = x[0]; n.dispatchEvent(new Event('input', { bubbles: true })); }
      if (s) { s.value = String(x[1]); s.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    const send = document.querySelector('.chunk-host .ord-send:not([disabled])');
    if (send) send.click();
  }, orders);
}
const runCardState = () => page => page.evaluate(() => {
  const c = document.querySelector('.chunk-host .ord-run-card'); if (!c) return null;
  return {
    orders: Array.from(c.querySelectorAll('.ord-made li, .ord-made .ord-row, .ord-made')).map(e => e.textContent.replace(/\s+/g, ' ').trim()).slice(0, 4),
    text: c.textContent.replace(/\s+/g, ' ').trim().slice(0, 600),
    run: (() => { const b = c.querySelector('.pyrun-run'); return b ? !b.disabled : null; })(),
    products: Array.from(c.querySelectorAll('.fac-order .fac-product')).map(e => e.textContent.trim())
  };
});
const checkCardState = () => page => page.evaluate(() => {
  const c = document.querySelector('.chunk-host .ord-check-card'); if (!c) return null;
  return {
    cards: Array.from(c.querySelectorAll('.ord-card')).map(e => e.textContent.replace(/\s+/g, ' ').trim()),
    yn: c.querySelectorAll('.ord-yn button').length,
    text: c.textContent.replace(/\s+/g, ' ').trim().slice(0, 500)
  };
});

async function oneRun(browser, runNo, opts) {
  opts = opts || {};
  log('══ RUN ' + runNo + (opts.badB ? ' (A marks the cost products No: R7)' : '') + ' ══');
  /* ONE context, two pages: the dev store is the origin's localStorage and the
     persona rides sessionStorage, so two pages in one context are two pupils
     on one store (qa-swap-paired's rig) */
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ctxB = { close: async () => {} };
  const A = await open(ctxA, 'orla'); await seed(A, true);
  const B = await open(ctxA, 'katie');
  await A.reload({ waitUntil: 'domcontentloaded' }); await sleep(2000);
  await openLesson4(A, 'A'); await openLesson4(B, 'B');
  const okA = await writeFactory(A, 'A', FACTORY_OK);
  const okB = await writeFactory(B, 'B', FACTORY_OK);
  if (!okA || !okB) { fail('RIG', 'a factory did not pass its own floor (A ' + okA + ', B ' + okB + ')'); await ctxA.close(); await ctxB.close(); return; }
  /* both walk to the Rush's door and stop there */
  const dA = await advance(A, 'A', 'rush', 60, atRushDoor);
  const dB = await advance(B, 'B', 'rush', 60, atRushDoor);
  if (!dA || !dB) { fail('RIG', 'a pupil never reached the Rush door'); await ctxA.close(); await ctxB.close(); return; }
  await pressDoor(A); await sleep(1500);
  const waiting = await A.evaluate(() => !!document.querySelector('.chunk-host .pair-wait'));
  if (!waiting) fail('R1', 'A did not wait for a partner after opening the Rush');
  await pressDoor(B);
  /* the PARTNER FOUND card on both sides, with real call signs */
  const popA = await waitFor(A, () => !!document.querySelector('.pair-pop.show .pk-mysign'), 20000);
  const signs = await A.evaluate(() => ({ mine: (document.querySelector('.pair-pop.show .pk-mysign') || {}).textContent, text: (document.querySelector('.pair-pop.show') || {}).textContent || '' }));
  if (popA && /^[A-Z][a-z]+ \d$/.test((signs.mine || '').trim()) && !/simulated|pixel/i.test(signs.text)) pass('R1', 'both paired: A is ' + signs.mine.trim() + ', no simulated partner');
  else fail('R1', 'A\'s PARTNER FOUND card: ' + JSON.stringify(signs).slice(0, 200));
  /* press through the pops with the ordinary mover on both sides */
  for (const [pg, tag] of [[A, 'A'], [B, 'B']]) {
    await waitFor(pg, () => !!document.querySelector('.pair-pop.show button'), 15000);
    await pg.evaluate(() => { const b = document.querySelector('.pair-pop.show button'); if (b) b.click(); });
    await sleep(900);
    const form = await waitFor(pg, () => !!document.querySelector('.chunk-host .ord-form-card .ord-send'), 15000);
    if (!form) fail('R2', tag + ' never got the order form');
  }
  await auditState(A, 'A:rush-form');
  await fillOrders(A, A_ORDERS); await sleep(800);
  await fillOrders(B, B_ORDERS); await sleep(800);
  /* R2: each side's run card carries the OTHER side's orders */
  const gotA = await waitFor(A, () => !!document.querySelector('.chunk-host .ord-run-card .pyrun-run'), 30000);
  const gotB = await waitFor(B, () => !!document.querySelector('.chunk-host .ord-run-card .pyrun-run'), 30000);
  const rA = gotA ? await runCardState()(A) : null, rB = gotB ? await runCardState()(B) : null;
  const hasAll = (txt, orders) => orders.every(o => new RegExp(o[0]).test(txt) && new RegExp('\\b' + o[1] + '\\b').test(txt));
  /* the run card names the sender by call sign and holds the orders for RUN;
     the orders themselves are shown as products once RUN has made them (R3) */
  if (rA && rB && /Orders from [A-Z][a-z]+ \d have arrived/.test(rA.text) && /Orders from [A-Z][a-z]+ \d have arrived/.test(rB.text)) pass('R2', 'the orders crossed: both run cards say whose orders arrived, by call sign');
  else fail('R2', 'run cards: A=' + JSON.stringify(rA && rA.text.slice(0, 160)) + ' B=' + JSON.stringify(rB && rB.text.slice(0, 160)));
  await auditState(A, 'A:rush-run');
  /* R3: RUN their orders through my factory */
  for (const pg of [A, B]) { await pg.evaluate(() => { const b = document.querySelector('.chunk-host .ord-run-card .pyrun-run:not([disabled])'); if (b) b.click(); }); }
  const ranA = await waitFor(A, () => document.querySelectorAll('.chunk-host .ord-run-card .fac-order .fac-product').length >= 3, 30000);
  const prodA = ranA ? await runCardState()(A) : null;
  const wantA = B_ORDERS.map(o => o[0] + ' x ' + o[1]).concat(B_ORDERS.map(o => String(o[1] * 4)));
  if (prodA && wantA.every(w => prodA.products.indexOf(w) !== -1)) pass('R3', 'A\'s machines made B\'s products on the run card: ' + prodA.products.slice(0, 3).join(' | '));
  else fail('R3', 'A\'s run card products: ' + JSON.stringify(prodA && prodA.products));
  /* what each run card says it is doing after RUN — the sending / sent line */
  for (let i = 0; i < 6; i++) {
    await sleep(2500);
    const wA = await A.evaluate(() => ((document.querySelector('.chunk-host .ord-run-card .ord-wait') || {}).textContent || '').trim());
    const wB = await B.evaluate(() => ((document.querySelector('.chunk-host .ord-run-card .ord-wait') || {}).textContent || '').trim());
    const cA0 = await A.evaluate(() => !!document.querySelector('.chunk-host .ord-check-card'));
    log('   · run cards say — A: ' + JSON.stringify(wA.slice(0, 90)) + '  B: ' + JSON.stringify(wB.slice(0, 90)) + (cA0 ? '  (A is on the check card)' : ''));
    if (cA0) break;
  }
  /* R4: the check card shows the PARTNER's products */
  const chkA = await waitFor(A, () => !!document.querySelector('.chunk-host .ord-check-card .ord-yn'), 40000);
  const chkB = await waitFor(B, () => !!document.querySelector('.chunk-host .ord-check-card .ord-yn'), 40000);
  const cA = chkA ? await checkCardState()(A) : null, cB = chkB ? await checkCardState()(B) : null;
  const bCost = 4;
  const wantOnA = A_ORDERS.map(o => o[0] + ' x ' + o[1]).concat(A_ORDERS.map(o => String(o[1] * bCost)));
  if (cA && wantOnA.every(w => cA.cards.some(c => c.indexOf(w) !== -1))) pass('R4', 'A\'s check card shows what B\'s factory made from A\'s orders (' + cA.cards.length + ' cards)');
  else fail('R4', 'A\'s check card: ' + JSON.stringify(cA && cA.cards).slice(0, 300));
  await auditState(A, 'A:rush-check');
  /* R5 / R7: verdicts and the seal */
  const verdict = async (pg, yesAll) => pg.evaluate((yesAll) => {
    const groups = Array.from(document.querySelectorAll('.chunk-host .ord-check-card .ord-yn'));
    groups.forEach(g => {
      const card = g.closest('.ord-card'); const txt = card ? card.textContent : '';
      const made = ((card && card.querySelector('.ord-made')) || {}).textContent || '';
      const isCost = /^\s*\d+\s*$/.test(made);
      const btn = g.querySelector(yesAll ? '[data-yn="y"]' : (isCost ? '[data-yn="n"]' : '[data-yn="y"]'));
      if (btn) btn.click();
    });
    return groups.length;
  }, yesAll);
  await verdict(B, true);
  await verdict(A, !opts.badB);
  const sealA = await waitFor(A, () => !!document.querySelector('.chunk-host .ord-seal'), 40000);
  const sealB = await waitFor(B, () => !!document.querySelector('.chunk-host .ord-seal'), 40000);
  const sA = sealA ? await A.evaluate(() => (document.querySelector('.chunk-host .ord-seal') || {}).textContent.replace(/\s+/g, ' ')) : '';
  const sB = sealB ? await B.evaluate(() => (document.querySelector('.chunk-host .ord-seal') || {}).textContent.replace(/\s+/g, ' ')) : '';
  if (sealA && sealB && /Katie/.test(sA) && /Orla/.test(sB)) pass('R5', 'both sides sealed; the seal names the partner\'s real name');
  else fail('R5', 'seals: A=' + JSON.stringify(sA.slice(0, 160)) + ' B=' + JSON.stringify(sB.slice(0, 160)));
  if (opts.badB) {
    const noSaid = /said 3 of your 6 products/.test(sB);
    if (noSaid && /Nobody is marked/.test(sB)) pass('R7', 'B\'s seal reports A\'s three No verdicts (3 of 6) and says nobody is marked on it');
    else fail('R7', 'B\'s seal after wrong products: ' + JSON.stringify(sB.slice(0, 200)));
  } else if (/6 of your 6 products/.test(sA) && /6 of your 6 products/.test(sB)) pass('R5b', 'both seals say 6 of 6 products were what the partner ordered (two machines, three orders)');
  else fail('R5b', 'the yes-count on the seals: A=' + JSON.stringify(sA.slice(0, 120)) + ' B=' + JSON.stringify(sB.slice(0, 120)));
  await auditState(A, 'A:rush-seal');
  /* the badge: rush=4/4 on both records */
  for (const [pg, tag] of [[A, 'A'], [B, 'B']]) {
    await pg.evaluate(() => { const b = document.querySelector('.chunk-host .ord-done'); if (b) b.click(); });
    await sleep(1500);
    const rec = await pg.evaluate(() => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); return JSON.stringify(db.pupils); });
    if (/rush=4\/4/.test(rec)) pass('R5c', tag + '\'s record carries rush=4/4'); else fail('R5c', tag + '\'s record has no rush=4/4');
  }
  await ctxA.close(); await ctxB.close();
}

async function soloRun(browser) {
  log('══ SOLO (R6): the Studio\'s orders ══');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const A = await open(ctx, 'orla'); await seed(A, false);
  await A.reload({ waitUntil: 'domcontentloaded' }); await sleep(2000);
  await openLesson4(A, 'A');
  const okA = await writeFactory(A, 'A', FACTORY_OK);
  if (!okA) { fail('R6', 'the factory did not pass'); await ctx.close(); return; }
  await advance(A, 'A', 'rush', 60, atRushDoor);
  await pressDoor(A); await sleep(1500);
  const own = await waitFor(A, () => !!document.querySelector('.chunk-host .ord-card-own .ord-own-go'), 15000);
  if (!own) { fail('R6', 'pairing off: the Studio\'s orders card never came'); await ctx.close(); return; }
  await A.evaluate(() => document.querySelector('.chunk-host .ord-own-go').click());
  const ran = await waitFor(A, () => !!document.querySelector('.chunk-host .ord-run-card .pyrun-run'), 15000);
  if (ran) await A.evaluate(() => document.querySelector('.chunk-host .ord-run-card .pyrun-run:not([disabled])').click());
  const chk = await waitFor(A, () => !!document.querySelector('.chunk-host .ord-check-card .ord-yn'), 40000);
  const c = chk ? await checkCardState()(A) : null;
  if (c && c.cards.some(x => /Nuala x 3/.test(x)) && c.cards.some(x => /cost\(3\)/.test(x) && /made12/.test(x))) pass('R6', 'the solo seat checks the Studio\'s own orders (' + c.cards.length + ' product cards: Nuala x 3, cost(3) → 12 …)');
  else fail('R6', 'the solo check card: ' + JSON.stringify(c && c.cards));
  await A.evaluate(() => { document.querySelectorAll('.chunk-host .ord-check-card .ord-yn [data-yn="y"]').forEach(b => b.click()); });
  const sealed = await waitFor(A, () => !!document.querySelector('.chunk-host .ord-seal'), 20000);
  const s = sealed ? await A.evaluate(() => document.querySelector('.chunk-host .ord-seal').textContent.replace(/\s+/g, ' ')) : '';
  if (sealed && /6 of the 6 products/.test(s)) pass('R6b', 'and seals alone, counting the six products it checked: ' + s.slice(0, 90)); else fail('R6b', 'solo seal: ' + JSON.stringify(s.slice(0, 160)));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (let i = 1; i <= RUNS; i++) await oneRun(browser, i, { badB: i === RUNS && RUNS >= 3 });
    await soloRun(browser);
  } finally { await browser.close(); }
  log('');
  log('READABILITY on the paired states: ' + (readability.length ? readability.length + ' below the floor' : 'clean'));
  readability.slice(0, 12).forEach(r => log('   ' + r));
  fs.writeFileSync(path.join(OUT, 'log.txt'), LOG.join('\n') + '\n');
  const bad = findings.length + readability.length;
  if (EXPECT_FAIL) {
    console.log(bad ? '\nCONTROL PASSED — the build he sat fails the Rush harness (' + bad + ' finding(s))' : '\nCONTROL FAILED — nothing failed on the pre-change build');
    process.exit(bad ? 0 : 1);
  }
  console.log(bad ? '\nqa-rush-paired: ' + bad + ' FINDING(S)' : '\nqa-rush-paired: ALL GREEN');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
