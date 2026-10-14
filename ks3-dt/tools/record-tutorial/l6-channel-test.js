/* usage: node ks3-dt/tools/record-tutorial/l6-channel-test.js [--base http://localhost:8126]
   THE OPERATION · the live channel gate (spec §6.4, DFM 325, DFM 330). Runs against the REAL Firebase project ols-ks3-dt-live,
   through the platform's own frame page (assets/l6/operation.html) on its lesson route (the hash), in two real browsers.
   1 round trip: a move written on seat A's laptop is read on seat B's in under 1 s (median of 5).
   2 privacy: the room's JSON, dumped over REST mid-lesson, holds no @, no pupil name (the hash carries two) and no class code.
   3 deletion: the ward round played to done on both laptops deletes the room (it reads back null).
   4 fallback: with *.firebaseio.com and *.firebasedatabase.app blocked, seat A's bar says the fallback line and seat B is sent to A.
   5 rules: a write to a code of the wrong length is REFUSED; the rooms list itself cannot be read.
   Every check has a CONTROL that must go red: the same checker handed the opposite case. Exit 1 on any failure. */
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2); const BASE = (args.indexOf('--base') !== -1 ? args[args.indexOf('--base') + 1] : 'http://localhost:8126');
const PAGE = BASE + '/ks3-dt/platform/assets/l6/operation.html';
const CFG = fs.readFileSync(path.join(__dirname, '../../platform/live-config.js'), 'utf8');
const DB = /databaseURL:\s*"([^"]+)"/.exec(CFG)[1];
const NAMES = ['Aoife Testpupil', 'Bríd Testpupil'], CLASS = 'Demo-8A';
const rows = []; let bad = 0;
function gate(name, ok, detail) { if (!ok) bad++; rows.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  · ' + detail : ''}`); }
function control(name, wentRed, detail) { if (!wentRed) bad++; rows.push(`${wentRed ? 'ok  ' : 'FAIL'} CONTROL ${name}${detail ? '  · ' + detail : ''}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const code = () => Array.from({ length: 12 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
const hash = o => '#' + encodeURIComponent(JSON.stringify(o));
const rest = (p, opt) => fetch(DB + '/' + p + '.json', opt).then(async r => ({ status: r.status, body: await r.text() }));

/* the checkers, each used on the real case and on its control */
const fastEnough = ms => ms != null && ms < 1000;
function leaks(json) { const out = []; if (json.indexOf('@') !== -1) out.push('@'); NAMES.forEach(n => n.split(' ').forEach(w => { if (json.toLowerCase().indexOf(w.toLowerCase()) !== -1) out.push(w); })); if (json.indexOf(CLASS) !== -1 || /\b8[A-Z]\b/.test(json)) out.push('class code'); return out; }
const gone = r => r.status === 200 && r.body === 'null';
const refused = r => r.status === 401 || r.status === 403;

(async () => {
  const browser = await chromium.launch();
  const errs = [];
  async function open(ctx, h) { const p = await ctx.newPage(); await p.setViewportSize({ width: 1366, height: 768 }); p.on('pageerror', e => errs.push(e.message)); await p.goto(PAGE + h); return p; }
  const connected = p => p.waitForFunction(() => window.OPBUS && window.OPBUS.connected(), null, { timeout: 15000 }).then(() => true, () => false);

  /* ---- 1 + 2: two laptops on one live room ---- */
  const R = code(), ctx = await browser.newContext();
  const door = s => hash({ stage: 'door', seat: s, seats: ['A', 'B'], room: R, names: NAMES });
  const A = await open(ctx, door('A')), B = await open(ctx, door('B'));
  const upA = await connected(A), upB = await connected(B);
  gate('both laptops reach the live room', upA && upB, `A ${upA} · B ${upB}`);
  await B.evaluate(() => { window.__got = []; OPBUS.on(m => { if (m.type === 'pull' && m.seat === 'A') window.__got.push(Date.now()); }); });
  const trips = [];
  for (let i = 0; i < 5; i++) {
    const t0 = await A.evaluate(i => { const t = Date.now(); OPBUS.send('pull', { seat: 'A', round: 9, part: 'fan', at: i }); return t; }, i);
    const t1 = await B.waitForFunction(n => window.__got.length > n && window.__got[n], i, { timeout: 5000 }).then(h => h.jsonValue(), () => null);
    trips.push(t1 == null ? null : t1 - t0); await sleep(150);
  }
  const ok = trips.filter(x => x != null).sort((a, b) => a - b), med = ok.length === 5 ? ok[2] : null;
  gate('a move written on A is read on B in under 1 s (median of 5)', fastEnough(med), `trips ${trips.join(', ')} ms`);
  control('a 1.2 s trip is caught as too slow', !fastEnough(1200));
  await sleep(1500);
  const dump = await rest('rooms/' + R);
  const L1 = leaks(dump.body);
  gate('the room JSON holds no @, no pupil name and no class code', dump.status === 200 && dump.body.length > 20 && L1.length === 0, `${dump.body.length} bytes · found: ${L1.join(', ') || 'nothing'}`);
  control('a room holding a school email and a name is caught', leaks(dump.body.replace('"t"', '"aoife@c2ken.net Aoife","t"')).length >= 2);
  fs.writeFileSync(path.join(__dirname, 'qa-l2-l5-review', 'l6-channel-room.json'), dump.body);
  await A.evaluate(() => OPBUS.destroy()); await sleep(800);
  gate('destroy() deletes the room', gone(await rest('rooms/' + R)));
  await ctx.close();

  /* ---- 3: the real completion path — the ward round played to done on both laptops deletes the room ---- */
  const R2 = code(), ctx2 = await browser.newContext();
  const ward = s => hash({ stage: 'ward', seat: s, seats: ['A', 'B'], room: R2, seed: 3 });
  const WA = await open(ctx2, ward('A')), WB = await open(ctx2, ward('B'));
  await connected(WA); await connected(WB); await sleep(1500);
  const play = p => p.evaluate(() => { const W = OPWARDUI.W; const free = W.S.order.filter(id => !W.S.beds[id].by && !W.S.beds[id].done); if (!free.length || W.mine().filter(id => !W.S.beds[id].done).length) return 0; W.take(free[0]); W.fit(W.bed(free[0]).missing); OPWARDUI.render(); return 1; });
  await play(WA); await sleep(700); await play(WB); await sleep(1200);
  const mid = await rest('rooms/' + R2);
  for (let i = 0; i < 12; i++) { await play(WA); await sleep(700); await play(WB); await sleep(700); }
  const doneA = await WA.evaluate(() => OPWARDUI.W.doneAll()), doneB = await WB.evaluate(() => OPWARDUI.W.doneAll());
  gate('the ward round reaches done on both laptops over the live room', doneA && doneB, `A ${doneA} · B ${doneB}`);
  await sleep(6000);
  const after = await rest('rooms/' + R2);
  gate('a room is deleted on completion (read back after the ward round)', gone(after), `${after.status} ${after.body.slice(0, 60)}`);
  control('a room still holding moves is caught as not deleted', !gone(mid), `${mid.body.length} bytes mid-round`);
  await ctx2.close();

  /* ---- 4: the live link blocked — never a dead screen ---- */
  /* a route abort cannot stop a websocket, so the block is made where a school filter makes it: the name never resolves */
  const blocked = await chromium.launch({ args: ['--host-resolver-rules=MAP *.firebaseio.com ~NOTFOUND, MAP *.firebasedatabase.app ~NOTFOUND, EXCLUDE localhost'] });
  const R3 = code(), ctx3 = await blocked.newContext();
  const door3 = s => hash({ stage: 'door', seat: s, seats: ['A', 'B'], room: R3 });
  const FA = await open(ctx3, door3('A')), FB = await open(ctx3, door3('B'));
  await sleep(12000);
  const fa = await FA.evaluate(() => ({ fb: OPUI.fallback && OPUI.fallback(), note: document.getElementById('livenote').textContent, shown: !document.getElementById('livenote').hidden }));
  const fbB = await FB.evaluate(() => ({ away: !document.getElementById('away').hidden, say: document.getElementById('awaysay').textContent }));
  const LINE = 'The live link is slow. Share one laptop and take turns.';
  gate('blocked: seat A falls back and its bar says the fallback line', fa.fb && fa.shown && fa.note === LINE, JSON.stringify(fa));
  gate('blocked: seat B is sent to sit with seat A', fbB.away && /^Go and sit with Dr \w+\. You share one laptop\.$/.test(fbB.say), fbB.say);
  await ctx3.close(); await blocked.close();
  const R4 = code(), ctx4 = await browser.newContext();
  const CA = await open(ctx4, hash({ stage: 'door', seat: 'A', seats: ['A', 'B'], room: R4 }));
  await sleep(12000);
  const ca = await CA.evaluate(() => ({ fb: OPUI.fallback(), note: document.getElementById('livenote').textContent }));
  control('with the link open, the same check finds no fallback', !(ca.fb && ca.note === LINE), JSON.stringify(ca));
  await CA.evaluate(() => OPBUS.destroy()).catch(() => {}); await ctx4.close();

  /* ---- 5: the rules ---- */
  const body = JSON.stringify({ j: 'h|A|0', t: Date.now() });
  const short = await rest('rooms/abc123/A/x', { method: 'PUT', body });
  gate('a write to a code of the wrong length is REFUSED by the rules', refused(short), `${short.status}`);
  const R5 = code(), good = await rest('rooms/' + R5 + '/A/x', { method: 'PUT', body });
  control('the same write to a 12-character code is not refused (the check can tell them apart)', !refused(good), `${good.status}`);
  await rest('rooms/' + R5, { method: 'DELETE' });
  const list = await rest('rooms');
  gate('the list of rooms cannot be read', refused(list), `${list.status}`);
  const named = await rest('rooms/' + code() + '/A/x', { method: 'PUT', body: JSON.stringify({ j: 'h|A|0', t: Date.now(), name: 'Aoife' }) });
  gate('a move carrying any other field (a name) is REFUSED', refused(named), `${named.status}`);

  gate('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
  console.log(rows.join('\n'));
  console.log(`\nl6-channel-test: ${rows.length} checks, ${bad} failed`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
