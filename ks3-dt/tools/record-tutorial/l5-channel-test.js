/* usage: node ks3-dt/tools/record-tutorial/l5-channel-test.js [--base http://localhost:8766] [--control]
   TWO LIGHTS · the live channel gates A6 (pair), A7 (trio), A8 (fallback) of J3_L5_TWO_LIGHTS_SPEC.md §12.
   Runs the REAL page (assets/twolights/hour.html, the platform's hash) in real browsers on the REAL Firebase project
   (platform/live-config.js, L6's ols-ks3-dt-live). Serve ks3-dt/platform at --base (python3 -m http.server 8766).
   A6  slips cross within one tick · effects show ONLY on the other seat · presence updates · the rocks are written ONCE
       and both laptops rewind with lines kept · Home deletes the room · the reveal shows on both together ·
       robot partner on a 2000 ms lag (the tester channel) still lands every slip and every light.
   A7  three laptops: each sees the two other lights · a slip to one light reaches only that light · M = 9 on the total.
   A8  no `connected` in 10 s → seat A keeps both lights, seat B shows the one-laptop line · Firebase blocked → same ·
       CONTROL: a connect at 9 s must NOT fall back (and the checker, handed the 11 s case, must say it did).
   --control: the checkers are handed the opposite case; every line must go red. Exit 1 on any failure. */
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), CONTROL = args.includes('--control');
const BASE = args.indexOf('--base') !== -1 ? args[args.indexOf('--base') + 1] : 'http://localhost:8766';
const PAGE = BASE + '/assets/twolights/hour.html';
const CFG = fs.readFileSync(path.join(__dirname, '../../platform/live-config.js'), 'utf8');
const DB = /databaseURL:\s*"([^"]+)"/.exec(CFG)[1];
const rows = []; let bad = 0;
function gate(name, ok, detail) { if (CONTROL) ok = !ok; if (!ok) bad++; rows.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  · ' + detail : ''}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const code = () => Array.from({ length: 12 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
const hash = o => '#' + encodeURIComponent(JSON.stringify(o));
const rest = p => fetch(DB + '/' + p + '.json').then(async r => ({ status: r.status, body: await r.text() }));
const NAMES = ['Aoife', 'Bríd', 'Ciara'];

(async () => {
  const browser = await chromium.launch();
  const errs = [];
  async function open(ctx, h, q) {
    const p = await ctx.newPage(); await p.setViewportSize({ width: 1366, height: 768 });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(PAGE + (q || '') + h); await p.waitForFunction(() => window.TLUI && window.TLUI.E);
    return p;
  }
  const up = p => p.waitForFunction(() => TLUI.bus && TLUI.bus.fb && TLUI.bus.fb.connected(), null, { timeout: 15000 }).then(() => true, () => false);
  const E = (p, f, a) => p.evaluate(f, a);

  /* ================= A6 · the pair ================= */
  {
    const R = code(), ctx = await browser.newContext();
    const H = s => hash({ stage: 'ch2', seat: s, seats: ['A', 'B'], room: R, budgets: { ch1: 300000, ch2: 300000, ch3: 300000, ch4: 600000 } });
    const A = await open(ctx, H('A')), B = await open(ctx, H('B'));
    const ua = await up(A), ub = await up(B);
    gate('A6 both laptops reach the live room', ua && ub, `A ${ua} · B ${ub}`);
    // B runs the given (silent) program; A radios "no horn"
    await E(B, () => TLUI.E.run());
    const t0 = Date.now();
    await E(A, () => TLUI.E.radio('B', 'horn'));
    const got = await B.waitForFunction(() => TLUI.E.S.slips.length > 0 && TLUI.E.S.slips[0], null, { timeout: 5000 }).then(h => h.jsonValue(), () => null);
    const trip = got ? Date.now() - t0 : null;
    gate('A6 a slip crosses within one tick and a second', got && got.from === 'A' && got.slip === 'horn' && trip < 1500, `slip ${got ? got.from + '→' + got.to + ' ' + got.slip : 'none'} in ${trip} ms`);
    // B edits, presence on A updates
    await E(B, () => { const L = TLUI.E.S.L.B, c = L.code.ch2 || TwoLightsPrograms.ch2(TwoLightsPrograms.SEATS.B, false); TLUI.E.edit(c + '\n', 7); });
    await sleep(6500);
    const pres = await E(A, () => TLUI.E.presence().map(p => TLUI.R(p.id, p.vars)).join(' / '));
    gate('A6 presence line updates on the other laptop', /line 7|typing/i.test(pres), pres);
    // B fixes: the horn shows on A's window, never on B's own
    await E(B, () => { TLUI.E.edit(TwoLightsPrograms.ch2(TwoLightsPrograms.SEATS.B, true), 7); TLUI.E.run(); });
    const onA = await A.waitForFunction(() => { const w = TLUI.E.windowSeats().find(x => x.seat === 'B'); return w && w.horn ? w : null; }, null, { timeout: 5000 }).then(h => h.jsonValue(), () => null);
    const onB = await E(B, () => TLUI.E.windowSeats().map(w => w.seat));
    gate('A6 the horn shows on the other seat only', !!onA && onB.indexOf('B') < 0, `A sees B horn ${onA ? onA.horn : 0} · B's window holds ${onB.join(',')}`);
    await A.close(); await B.close(); await ctx.close();
  }
  /* ---- the rocks: written once, both rewind, lines kept ---- */
  {
    const R = code(), ctx = await browser.newContext();
    const H = s => hash({ stage: 'ch1', seat: s, seats: ['A', 'B'], room: R, budgets: { ch1: 6000, ch2: 6000, ch3: 6000, ch4: 6000 } });
    const A = await open(ctx, H('A')), B = await open(ctx, H('B'));
    await up(A); await up(B); await sleep(800);
    await E(A, () => TLUI.E.edit(TLUI.E.code('A') + '# mine', 9));
    await E(B, () => TLUI.E.edit(TLUI.E.code('B') + '# mine', 9));
    await sleep(10000);
    const dump = await rest('rooms/' + R); const room = JSON.parse(dump.body || 'null') || {};
    let fails = 0; ['A', 'B'].forEach(s => Object.values(room[s] || {}).forEach(v => { if (String(v.j).startsWith('f|')) fails++; }));
    const fa = await E(A, () => TLUI.E.S.boat.ch1.fails.length), fb = await E(B, () => TLUI.E.S.boat.ch1.fails.length);
    const keptA = await E(A, () => /# mine/.test(TLUI.E.code('A'))), keptB = await E(B, () => /# mine/.test(TLUI.E.code('B')));
    gate('A6 the rocks are written to the room once', fails === 1, `${fails} fail record(s)`);
    gate('A6 both laptops rewind, lines kept', fa >= 1 && fb >= 1 && keptA && keptB, `rewinds A ${fa} · B ${fb} · lines kept A ${keptA} · B ${keptB}`);
    await A.close(); await B.close(); await ctx.close();
  }
  /* ---- Home: the reveal together, the room deleted ---- */
  {
    const R = code(), ctx = await browser.newContext();
    const H = s => hash({ stage: 'home', seat: s, seats: ['A', 'B'], room: R, names: NAMES.slice(0, 2) });
    const [A, B] = await Promise.all([open(ctx, H('A'), '?fast=1'), open(ctx, H('B'), '?fast=1')]);
    const ra = await A.waitForFunction(() => { const r = document.querySelector('#hbody .reveal'); return r && r.textContent; }, null, { timeout: 5000 }).then(h => h.jsonValue(), () => '');
    const rb = await B.waitForFunction(() => { const r = document.querySelector('#hbody .reveal'); return r && r.textContent; }, null, { timeout: 5000 }).then(h => h.jsonValue(), () => '');
    gate('A6 the reveal shows on both laptops', /Bríd/.test(ra) && /Aoife/.test(rb), `A: ${ra} · B: ${rb}`);
    await sleep(4500);
    const left = await rest('rooms/' + R);
    gate('A6 Home deletes the room', left.status === 200 && left.body === 'null', `reads back ${left.body.slice(0, 40)}`);
    await A.close(); await B.close(); await ctx.close();
  }
  /* ---- robot partner, 2000 ms lag (tester channel) ---- */
  {
    const ctx = await browser.newContext(), R = 'lag' + Date.now();
    const A = await open(ctx, '', `?stage=ch2&seat=A&room=${R}&lag=2000`), B = await open(ctx, '', `?stage=ch2&seat=B&room=${R}&lag=2000`);
    await E(A, () => TLUI.E.radio('B', 'horn'));
    await E(B, () => { TLUI.E.edit(TwoLightsPrograms.ch2(TwoLightsPrograms.SEATS.B, true), 7); TLUI.E.run(); });
    await sleep(3500);
    const s = await E(B, () => TLUI.E.S.slips.length), h = await E(A, () => (TLUI.E.windowSeats().find(x => x.seat === 'B') || {}).horn);
    gate('A6 robot partner on a 2000 ms lag: the slip and the horn both land', s === 1 && h === 1, `slips ${s} · horn ${h}`);
    await ctx.close();
  }

  /* ================= A7 · the trio ================= */
  {
    const R = code(), ctx = await browser.newContext();
    const H = s => hash({ stage: 'ch4', seat: s, seats: ['A', 'B', 'C'], room: R });
    const P = { A: await open(ctx, H('A')), B: await open(ctx, H('B')), C: await open(ctx, H('C')) };
    for (const s of 'ABC') await up(P[s]);
    await sleep(1500);
    const sees = {}; for (const s of 'ABC') sees[s] = await E(P[s], () => TLUI.E.windowSeats().map(w => w.seat).join(''));
    gate('A7 each laptop sees the two other lights', sees.A === 'BC' && sees.B === 'AC' && sees.C === 'AB', `A ${sees.A} · B ${sees.B} · C ${sees.C}`);
    await E(P.A, () => TLUI.E.radio('C', 'light'));
    await sleep(2000);
    const sB = await E(P.B, () => TLUI.E.S.slips.length), sC = await E(P.C, () => TLUI.E.S.slips.map(x => x.from + x.slip).join());
    gate('A7 a slip to one light reaches only that light', sB === 0 && sC === 'Alight', `B holds ${sB} · C holds ${sC || 'none'}`);
    const total = await E(P.A, () => document.getElementById('crew').textContent);
    gate('A7 M = 9 on the total line', /\b9\b/.test(total), total);
    for (const s of 'ABC') await P[s].evaluate(() => TLUI.bus.fb.destroy());
    await ctx.close();
  }

  /* ================= A8 · fallback ================= */
  // a fake Firebase served in place of the vendor files: `.info/connected` turns true after ?conn= ms (never if 0)
  const FAKE = `window.firebase={apps:[],initializeApp:function(){var a={database:function(){return db;}};this.apps.push(a);return a;},app:function(){return this.apps[0];}};
  var CONN=+(new URLSearchParams(location.search).get('conn')||0);
  function R(p){return{child:function(c){return R(p+'/'+c);},push:function(){},set:function(){},remove:function(){return Promise.resolve();},
    once:function(ev,f){if(CONN)setTimeout(function(){f({val:function(){return null;}});},CONN);},
    on:function(ev,f){if(p==='.info/connected'){if(CONN)setTimeout(function(){f({val:function(){return true;}});},CONN);}
      else if(p==='.info/serverTimeOffset')f({val:function(){return 0;}});}};}
  var db={ref:R};`;
  async function fallbackCase(conn, block) {
    // blocked: the hosts resolve nowhere (a WebSocket never passes through page routing, so block it at the resolver)
    const br = block ? await chromium.launch({ args: ['--host-resolver-rules=MAP *.firebasedatabase.app 0.0.0.0, MAP *.firebaseio.com 0.0.0.0'] }) : browser;
    const ctx = await br.newContext(), R = code();
    if (!block) await ctx.route(/vendor\/firebase-(app|database)-compat\.js/, r => r.fulfill({ contentType: 'text/javascript', body: /app-compat/.test(r.request().url()) ? FAKE : '' }));
    const H = s => hash({ stage: 'ch1', seat: s, seats: ['A', 'B'], room: R });
    const q = conn ? `?conn=${conn}` : '';
    const A = await open(ctx, H('A'), q), B = await open(ctx, H('B'), q);
    await sleep(12500);
    const out = { modeA: await E(A, () => TLUI.E.S.mode), barA: await E(A, () => document.getElementById('barline').textContent),
      away: await E(B, () => !document.getElementById('away').hidden && document.getElementById('awaysay').textContent),
      /* deep check 25 Oct: seat B's own laptop keeps a way on (Next), never a dead screen */
      next: await E(B, () => { const b = document.getElementById('awaynext'); const r = b && b.getBoundingClientRect(); return b && !b.hidden && r.width > 0 ? b.textContent : null; }) };
    await ctx.close(); if (block) await br.close(); return out;
  }
  const fellBack = o => o.modeA === 'slow' && /slow/i.test(o.barA) && !!o.away && /one (laptop|computer)/i.test(o.away) && o.next === 'Next';
  const never = await fallbackCase(0, false);
  gate('A8 no connect in 10 s → seat A keeps both lights, seat B shows the one-laptop line', fellBack(never), `A ${never.modeA} "${never.barA}" · B "${never.away || ''}" + button ${never.next}`);
  const blocked = await fallbackCase(0, true);
  gate('A8 Firebase blocked → the same', fellBack(blocked), `A ${blocked.modeA} · B "${blocked.away || ''}"`);
  const at9 = await fallbackCase(9000, false);
  gate('A8 CONTROL a connect at 9 s does NOT fall back', !fellBack(at9) && at9.modeA === 'pair', `A ${at9.modeA} · B away ${!!at9.away}`);
  const at11 = await fallbackCase(11000, false);
  gate('A8 CONTROL the checker handed an 11 s connect says it fell back', fellBack(at11), `A ${at11.modeA}`);

  gate('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
  rows.forEach(r => console.log(r));
  console.log(bad ? `l5-channel: FAIL · ${bad} of ${rows.length}` : `l5-channel: PASS · ${rows.length} checks`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
