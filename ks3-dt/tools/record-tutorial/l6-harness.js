/* usage: node ks3-dt/tools/record-tutorial/l6-harness.js [--base http://localhost:8121] (ported 14 Oct 2026 from L6_PROTOTYPES/op2/harness2.js;
   it now runs the PLATFORM's own frame page, assets/l6/operation.html, by its tester route).
   Was: node op2/harness2.js — THE OPERATION mechanic 2 (one patient, two surgeons). Two real windows over the real bus, real clicks and a real
   DRAG, honest lag (2000 ms), same-screen timing measured, clash, board, fluff, psu, waiting, done, operate again; the OLD build as the control
   for the drag gate; layout at four sizes; solo / computer partner / trio robots to done; idle line. Shots into qa-l2-l5-review/l6-harness. Exit 1 on any failed gate. */
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const args = process.argv.slice(2); const BASE = (args.indexOf('--base') !== -1 ? args[args.indexOf('--base') + 1] : 'http://localhost:8121');
const PAGE = BASE + '/ks3-dt/platform/assets/l6/operation.html';
const OLD = 'file://' + '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/L6_PROTOTYPES/operation-test.html';
const SHOTS = path.join(__dirname, 'qa-l2-l5-review', 'l6-harness'); fs.mkdirSync(SHOTS, { recursive: true });
const rows = []; let bad = 0; const t00 = Date.now();
function gate(name, ok, detail) { if (!ok) bad++; rows.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  · ' + detail : ''}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function page(ctx, url, w, h, errs) { const p = await ctx.newPage(); await p.setViewportSize({ width: w || 1366, height: h || 768 }); p.on('pageerror', e => errs.push(url.split('?')[1] + ': ' + String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(url.split('?')[1] + ': ' + m.text()); }); if (!/tour=/.test(url)) url += '&tour=0'; await p.goto(url); await p.waitForFunction(() => document.title === 'ready', null, { timeout: 8000 }); return p; }
const st = p => p.evaluate(() => { const S = OPUI.S, pr = OPUI.E.prompt(), sv = document.querySelector('#facewrap svg'), last = S.said.slice(-1)[0] || {};
  return { stage: S.stage, pid: S.pid, round: S.round, myOut: S.my.out, wrongs: S.my.wrongs, parts: Object.fromEntries(Object.keys(S.parts).map(k => [k, S.parts[k].status + ':' + (S.parts[k].by || '') + (S.parts[k].told ? ':told' : '')])), sealed: OPUI.E.sealedCount(), counts: S.counts, chart: S.chart.join(','),
    prompt: pr.kind, text: pr.text, bar: document.getElementById('instr').textContent, sting: document.getElementById('instr').classList.contains('sting'), pulse: document.getElementById('instr').classList.contains('pulse'),
    face: sv ? sv.getAttribute('class') : '', strip: document.getElementById('strip').textContent, say: document.getElementById('say').textContent, cards: document.getElementById('cards').classList.contains('on'), cardh: document.getElementById('cardh').textContent, cardcap: document.getElementById('cardcap').textContent, ncards: document.querySelectorAll('#cardlist .card').length, nwrong: document.querySelectorAll('#cardlist .card.wrong').length,
    fluff: S.fluff, fluffGone: document.querySelector('.slot[data-part="fluff"]').classList.contains('gone'), nsaid: S.said.length, lastSaid: last.text, lastTag: last.tag, here: S.others.every(o => S.presence[o] && S.presence[o].here), stats: S.stats, door: document.getElementById('door').classList.contains('on'), beginOn: document.getElementById('begin').classList.contains('on'), doneOn: document.getElementById('done').classList.contains('on'), donep: document.getElementById('donep').textContent, donereveal: document.getElementById('donereveal').textContent, appHidden: document.getElementById('app').hidden }; });
const slotCls = (p, part) => p.$eval(`.slot[data-part="${part}"]`, e => e.className + '|' + (e.querySelector('.badge') ? e.querySelector('.badge').textContent + ':' + e.querySelector('.badge').style.display : ''));
const chartLine = (p, i) => p.$eval(`#lines .ln:nth-child(${i})`, e => ({ body: e.querySelector('.body').textContent.trim(), job: (e.querySelector('.job') || {}).textContent || '', tag: !!e.querySelector('.job .tag'), by: (e.querySelector('.by') || {}).textContent || '', byMe: !!(e.querySelector('.by') && e.querySelector('.by').classList.contains('me')) }));
const over = p => p.evaluate(() => { const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight, out = [];
  const tag = el => el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName;
  document.querySelectorAll('#app *').forEach(el => { if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return; const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0 || getComputedStyle(el).opacity === '0') return;
    if (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2) { out.push('OFF:' + tag(el)); return; }
    let a = el.parentElement; while (a && a.id !== 'app') { const cs = getComputedStyle(a); if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const q = a.getBoundingClientRect(); if (r.left < q.left - 2 || r.top < q.top - 2 || r.right > q.right + 2 || r.bottom > q.bottom + 2) { out.push('CLIP:' + tag(el) + ' in ' + tag(a)); break; } } a = a.parentElement; } });
  document.querySelectorAll('#app, #app *').forEach(par => { const cs = getComputedStyle(par); if (!/grid|flex/.test(cs.display)) return; const q = par.getBoundingClientRect(); if (q.width === 0) return; const Lx = q.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), Rx = q.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
    const items = []; (function collect(n) { Array.from(n.children).forEach(k => getComputedStyle(k).display === 'contents' ? collect(k) : items.push(k)); })(par);
    items.forEach(ch => { const c2 = getComputedStyle(ch); if (c2.position === 'absolute' || c2.position === 'fixed' || c2.display === 'none' || parseFloat(c2.marginLeft) < 0 || parseFloat(c2.marginRight) < 0) return; const r = ch.getBoundingClientRect(); if (r.width === 0) return; if (r.left < Lx - 1 || r.right > Rx + 1) out.push('PAD:' + tag(ch) + ' in ' + tag(par) + ' by ' + Math.round(Math.max(Lx - r.left, r.right - Rx)) + 'px'); }); });
  const cl = document.getElementById('cardlist'); if (document.getElementById('cards').classList.contains('on') && cl.scrollHeight > cl.clientHeight + 2) out.push('cards hidden ' + cl.scrollHeight + '>' + cl.clientHeight);
  const d = document.documentElement; if (d.scrollWidth > d.clientWidth + 2 || d.scrollHeight > d.clientHeight + 2) out.push('doc ' + d.scrollWidth + 'x' + d.scrollHeight);
  return out.slice(0, 10); });
const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, n + '.png') });
async function waitFace(p, mood, max) { const t0 = Date.now(); while (Date.now() - t0 < max) { const c = await p.$eval('#facewrap svg', e => e.getAttribute('class')); if (c === 'm-' + mood) return Date.now() - t0; await sleep(15); } return -1; }
async function drag(p, sel) { const b = await p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.mouse.move(b.x + 120, b.y + 60, { steps: 6 }); await p.mouse.move(b.x + 250, b.y + 120, { steps: 6 }); await p.mouse.up(); }
(async () => {
  const b = await chromium.launch(); const errs = []; const ctx = await b.newContext();
  /* ---------- 1. two real windows at his half width, honest lag 2000 ---------- */
  const room = 'h' + Date.now().toString(36);
  const A = await page(ctx, PAGE + `?seat=A&room=${room}&lag=2000&fast=1`, 683, 768, errs);
  const B = await page(ctx, PAGE + `?seat=B&room=${room}&lag=2000&fast=1`, 683, 768, errs);
  const tJoin = Date.now(); await A.waitForFunction(() => OPUI.S.others.every(o => OPUI.S.presence[o].here), null, { timeout: 8000 }); await B.waitForFunction(() => OPUI.S.others.every(o => OPUI.S.presence[o].here), null, { timeout: 8000 });
  gate('both windows find each other within 6 s', Date.now() - tJoin < 6000, (Date.now() - tJoin) + ' ms');
  let sA = await st(A), sB = await st(B); gate('door: app hidden, door on, both', sA.door && sB.door && sA.appHidden, sA.door + '/' + sB.door);
  await A.waitForSelector('#begin.on', { timeout: 20000 }); await B.waitForSelector('#begin.on', { timeout: 20000 }); await shot(A, '10_door_A');
  const together = await A.$eval('#together', e => e.textContent); gate('door names the partner and the shared patient', /Dr Custard is at the same table. You work on Bernadette together./.test(together), together);
  const goal = await A.$eval('#goal', e => e.innerText.replace(/\n+/g, ' | ')); gate('door says the goal in three lines', /This is Bernadette. She is a computer. \| Seven parts inside her each do one job.*\| Click a part to take it out. See what goes wrong. Fill in her chart./.test(goal), goal.slice(0, 200));
  await A.click('#beginbtn'); await B.click('#beginbtn'); await sleep(400); sA = await st(A); sB = await st(B);
  gate('begin: both tables open, door gone', sA.stage === 'op' && sB.stage === 'op' && !sA.door && !sB.door && !sA.appHidden, sA.stage + '/' + sB.stage);
  gate('bar names the exact gesture', sA.bar === 'Click a part to take it out.', sA.bar);
  await sleep(1500); await A.mouse.move(2, 2); await shot(A, '11_table_A_683'); await shot(B, '11_table_B_683'); fs.copyFileSync(path.join(SHOTS, '11_table_A_683.png'), path.join(SHOTS, 'stranger_X.png'));
  sA = await st(A); gate('strip: partner is looking at the patient', /Dr Custard is looking at Bernadette\./.test(sA.strip), sA.strip);
  gate('chart: seven empty lines, 0 of 7', (await A.$$eval('#lines .ln .dots', l => l.length)) === 7 && /0 of 7 jobs found/.test(await A.$eval('#count', e => e.textContent)), '');
  gate('A face is happy before any cut', sA.face === 'm-happy', sA.face);
  let ov = await over(A); gate('table 683x768: nothing off screen or clipped', ov.length === 0, ov.join(' '));
  /* ---------- 2. same screen: A pulls the processor; her own face reacts at once; B learns after the honest lag ---------- */
  await A.click('.slot[data-part="cpu"]'); const dtFace = await waitFace(A, 'cpu', 1200);
  gate('A tap takes the part out', (await st(A)).myOut === 'cpu', (await st(A)).myOut);
  gate('A face reacts on the SAME screen within 300 ms', dtFace >= 0 && dtFace <= 300, dtFace + ' ms');
  sA = await st(A); gate('cards panel opens over the case with the big photo', sA.cards && sA.ncards === 7 && sA.cardh === 'Which job was it doing?' && sA.cardcap === 'You took this part out.', sA.cardh + ' / ' + sA.cardcap + ' / ' + sA.ncards);
  gate('bar: pick the job', sA.bar === 'Pick the job that part was doing.', sA.bar);
  const tPull = Date.now(); sB = await st(B); gate('B does not know at 0.3 s (lag honest)', sB.parts.cpu === 'in:', sB.parts.cpu);
  await B.waitForFunction(() => OPUI.S.parts.cpu.status === 'out' && OPUI.S.parts.cpu.by === 'A', null, { timeout: 6000 }); const dtB = Date.now() - tPull + 300;
  gate('B sees the pull 2.0–3.5 s after it', dtB >= 1800 && dtB <= 3500, dtB + ' ms');
  await sleep(250); const cB = await slotCls(B, 'cpu'); gate('B slot shows the partner badge "Dr Marmalade"', /theirs/.test(cB) && /Dr Marmalade:$/.test(cB), cB);
  sB = await st(B); gate('B face stays happy: her partner\'s cut is not on her face', sB.face === 'm-happy', sB.face);
  gate('B strip: partner has a part out', /Dr Marmalade has a part out\./.test(sB.strip), sB.strip); await shot(B, '12_partner_badge_B');
  gate('A pulled line is a joke from the patient (not the bar)', sA.nsaid >= 2 && sA.lastTag !== 'quiet' && sA.lastSaid.length > 4, sA.lastSaid);
  /* ---------- 3. both out at once: B pulls the fan while A still holds the processor ---------- */
  await B.click('.slot[data-part="fan"]'); const dtF = await waitFace(B, 'fan', 1200); gate('B face reacts to HER cut within 300 ms', dtF >= 0 && dtF <= 300, dtF + ' ms');
  sB = await st(B); gate('both surgeons have a part out at once', sB.myOut === 'fan' && (await st(A)).myOut === 'cpu', sB.myOut);
  await shot(A, '13_cards_A_683'); ov = await over(A); gate('cards 683x768: all seven cards visible, nothing clipped', ov.length === 0, ov.join(' '));
  /* ---------- 3b. CONTROL: the old 58%/42% grid rule must be caught by the width gate (his find, 14 Oct 2026) ---------- */
  const ctrlH = await A.addStyleTag({ content: '#main{grid-template-columns:58% 42% !important}' }); await ctrlH.evaluate(e => { e.id = 'ctrl-old-grid'; }); const ovC = await over(A);
  gate('CONTROL fails as it must: old 58%/42% rule is caught as PAD', ovC.some(s => /^PAD:/.test(s)), ovC.join(' '));
  await ctrlH.evaluate(e => e.remove()); await sleep(120); const ctrlGone = await A.evaluate(() => { const m = document.getElementById('main'); const c1 = parseFloat(getComputedStyle(m).gridTemplateColumns); return c1 > 0 && c1 < 0.5 * m.clientWidth && !document.getElementById('ctrl-old-grid') && document.querySelectorAll('style').length >= 1; }); gate("CONTROL style removed again (grid rule back to the build)", ctrlGone, String(ctrlGone));
  const airA = await A.evaluate(() => { const m = document.getElementById('main'), mr = m.getBoundingClientRect(), mi = []; (function collect(n) { Array.from(n.children).forEach(k => { const c3 = getComputedStyle(k); if (c3.display === 'contents') collect(k); else if (c3.position !== 'absolute' && c3.position !== 'fixed' && c3.display !== 'none') mi.push(k.getBoundingClientRect()); }); })(m); return { air: Math.round(mr.right - Math.max(...mi.map(r => r.right))), pad: parseFloat(getComputedStyle(m).paddingRight), left: Math.round(Math.min(...mi.map(r => r.left)) - mr.left) }; });
  gate('width: right column keeps the same air as the left (14 px both sides)', airA.air >= airA.pad - 1 && airA.left >= airA.pad - 1 && (await over(A)).length === 0, JSON.stringify(airA));
  /* ---------- 4. wrong card stings; second wrong is told; right seals with credit ---------- */
  await A.click('.card[data-key="fan"]'); await sleep(200); sA = await st(A);
  gate('wrong card: bar stings "Not that one. Click another job card."', sA.sting && sA.bar === 'Not that one. Click another job card.', sA.bar);
  gate('wrong card greys out, part stays out, nothing sealed', sA.nwrong === 1 && sA.myOut === 'cpu' && sA.sealed === 0, sA.nwrong + '/' + sA.myOut + '/' + sA.sealed); await shot(A, '14_wrong_A');
  await A.click('.card[data-key="gpu"]'); await sleep(200); sA = await st(A);
  gate('second wrong: part goes back sealed as told, cards close', sA.parts.cpu === 'sealed:A:told' && !sA.cards && sA.myOut === null, sA.parts.cpu);
  let ln = await chartLine(A, 1); gate('chart line 1: processor sentence, told by Bernadette, credited to me', /Her processor does all her thinking\./.test(ln.body) && ln.by === 'Bernadette told you this one.' && ln.byMe, JSON.stringify(ln));
  gate('bar after told: back to the gesture', sA.bar === 'Click a part to take it out.' || /told you the job/.test(sA.bar), sA.bar); await shot(A, '15_told_A');
  await B.click('.card[data-key="fan"]'); await sleep(200); sB = await st(B);
  gate('B right card seals the fan to Dr Custard', sB.parts.fan === 'sealed:B' && sB.sealed >= 1 && !sB.cards, sB.parts.fan);
  gate('B face back to happy once her part is back', sB.face === 'm-happy', sB.face);
  await sleep(2600); sA = await st(A); sB = await st(B);
  gate('after lag both charts agree: 2 of 7, fan credited to Dr Custard on A', sA.sealed === 2 && sB.sealed === 2 && sA.parts.fan === 'sealed:B' && sB.parts.cpu === 'sealed:A:told', sA.parts.fan + ' / ' + sB.parts.cpu);
  const lnA = await A.$$eval('#lines .ln .by', l => l.map(e => e.textContent + (e.classList.contains('me') ? '*' : ''))); gate('A chart credits: me starred, partner plain', lnA.join() === 'Bernadette told you this one.*,Dr Custard found this one.', lnA.join());
  gate('B strip reports the find count', /Dr Marmalade found a job\. 2 of 7 jobs found\.|Dr Marmalade is looking at Bernadette\./.test(sB.strip), sB.strip); await shot(B, '16_two_sealed_B');
  /* ---------- 5. clash: both tap the graphics card within a few ms ---------- */
  await Promise.all([A.click('.slot[data-part="gpu"]'), B.click('.slot[data-part="gpu"]')]);
  const atA = await A.evaluate(() => OPUI.S.parts.gpu.at), atB = await B.evaluate(() => OPUI.S.parts.gpu.at); const gap = Math.abs(atA - atB);
  gate('clash taps landed within 150 ms of each other (honest clash)', gap <= 150, gap + ' ms');
  await sleep(2700); sA = await st(A); sB = await st(B);
  const owner = sA.myOut === 'gpu' ? 'A' : sB.myOut === 'gpu' ? 'B' : null; const loser = owner === 'A' ? B : A; const sL = owner === 'A' ? sB : sA;
  gate('clash resolved: exactly one owner after the lag', owner && !(sA.myOut === 'gpu' && sB.myOut === 'gpu') && sA.parts.gpu === sB.parts.gpu, sA.parts.gpu + ' / ' + sB.parts.gpu);
  gate('loser is told in plain words and has nothing out', sL.myOut === null && /got there first\. Click another part\./.test(sL.bar) && !sL.cards, sL.bar);
  gate('loser\'s face is back to happy', sL.face === 'm-happy', sL.face); await shot(loser, '17_clash_loser');
  const W = owner === 'A' ? A : B; await W.click('.card[data-key="gpu"]'); await sleep(200); gate('clash owner seals the graphics card', (await st(W)).parts.gpu === 'sealed:' + owner, (await st(W)).parts.gpu);
  /* ---------- 6. the motherboard refuses; fluff is a joke; the power supply makes her go quiet ---------- */
  await loser.click('.slot[data-part="board"]'); await sleep(200); let sX = await st(loser);
  gate('board: refusal in the bar, part never lifts', sX.bar === 'That one stays in. Pick the job it does.' && sX.myOut === 'board' && !/\bout\b/.test(await slotCls(loser, 'board')), sX.bar);
  gate('board: cards ask for its job with "This part stays in."', sX.cards && sX.cardh === 'What is its job?' && sX.cardcap === 'This part stays in.', sX.cardh + ' / ' + sX.cardcap); await shot(loser, '18_board');
  gate('board: face unchanged (nothing came out)', sX.face === 'm-happy', sX.face);
  await loser.click('.card[data-key="board"]'); await sleep(200); sX = await st(loser); gate('board sealed by the loser', /^sealed:/.test(sX.parts.board), sX.parts.board);
  const n0 = sX.sealed; await loser.click('.slot[data-part="fluff"]'); let fOk = false, fT = Date.now();
  while (Date.now() - fT < 2000) { sX = await st(loser); fOk = sX.fluff === 'gone' && sX.fluffGone && sX.sealed === n0 && !sX.cards && sX.lastTag === 'fluff'; if (fOk) break; await sleep(50); }
  gate('fluff: a joke, the slot goes, no chart line, no cards', fOk, 'fluff=' + sX.fluff + ' gone=' + sX.fluffGone + ' sealed=' + sX.sealed + '/' + n0 + ' cards=' + sX.cards + ' tag=' + sX.lastTag + ' · ' + sX.lastSaid);
  await sleep(2400); gate('fluff gone on the partner\'s window too', (await st(W)).fluffGone, '');
  await W.click('.slot[data-part="psu"]'); await sleep(200); let sW = await st(W);
  gate('power supply: face goes dark, the patient says nothing, grey "has gone quiet"', sW.face === 'm-psu' && sW.lastTag === 'quiet' && sW.lastSaid === '', sW.face + ' / ' + sW.lastSaid);
  await W.waitForFunction(() => document.getElementById('bubble').classList.contains('quiet'), null, { timeout: 15000 }).catch(() => {}); await shot(W, '19_psu_quiet');
  gate('bubble shows the quiet line in grey', await W.$eval('#bubble', e => e.classList.contains('quiet')), '');
  await W.click('.card[data-key="psu"]'); await sleep(200); gate('psu sealed', /^sealed:/.test((await st(W)).parts.psu), '');
  /* ---------- 7. the last part: the partner waits; done; reveal; operate again ---------- */
  await loser.click('.slot[data-part="mem"]'); await sleep(200); await loser.click('.card[data-key="mem"]'); await sleep(2600);
  await W.click('.slot[data-part="drive"]'); await sleep(2600); sX = await st(loser);
  gate('waiting: when the last part is with the partner, the bar says so', sX.prompt === 'wait' && sX.bar === 'Your partner has the last part. Watch the chart.', sX.bar); await shot(loser, '20_waiting');
  await W.click('.card[data-key="drive"]'); await sleep(2800); sA = await st(A); sB = await st(B);
  gate('done on both windows', sA.stage === 'done' && sB.stage === 'done' && sA.doneOn && sB.doneOn, sA.stage + '/' + sB.stage);
  gate('done: counts named and sum to seven', /Dr Marmalade found \d of the 7 jobs\. Dr Custard found \d of the 7 jobs\./.test(sA.donep) && (sA.counts.A + sA.counts.B) === 7 && sA.counts.A === sB.counts.A, sA.donep);
  gate('done: reveal placeholder shown', /Your partner was Dr Custard/.test(sA.donereveal) && /Your partner was Dr Marmalade/.test(sB.donereveal), sA.donereveal);
  gate('done: stage 3 lit, bar says chart complete', sA.bar === 'Chart complete. All seven jobs found.', sA.bar); await shot(A, '21_done_A_683'); await shot(B, '21_done_B_683');
  ov = await over(A); gate('done 683x768: nothing off screen or clipped', ov.length === 0, ov.join(' '));
  await A.click('#againbtn'); await sleep(2600); sA = await st(A); sB = await st(B);
  gate('operate again: both back at the door with the next patient', sA.stage === 'door' && sB.stage === 'door' && sA.door && sB.door && sA.pid === 'desmond' && sB.pid === 'desmond' && sA.round === 1, sA.pid + '/' + sB.pid + ' r' + sA.round);
  gate('new round: chart empty again', sA.sealed === 0 && sA.chart === '', sA.chart);
  await A.close(); await B.close();
  /* ---------- 8. DRAG AS A TEACHER WOULD: mouse down on a part, pull it 250 px, let go elsewhere ---------- */
  const D = await page(ctx, PAGE + '?solo=1&fast=1&at=table', 1366, 768, errs); await sleep(300);
  await drag(D, '.slot[data-part="gpu"]'); await sleep(250); let sD = await st(D);
  gate('DRAG on the new build takes the part out', sD.myOut === 'gpu' && sD.cards, sD.myOut); await shot(D, '22_after_drag_new'); await D.close();
  let oldOut = 'not reached';
  try { const O = await page(ctx, OLD + '?solo=1&fast=1', 1366, 768, errs); await O.waitForSelector('#scrubgo.on', { timeout: 60000 }); await O.click('#scrubbtn'); await sleep(800);
    await drag(O, '.tile.cpu'); await sleep(400); oldOut = await O.evaluate(() => OPUI.E.S.my.out && OPUI.E.S.my.out.part); await shot(O, '23_after_drag_old'); await O.close(); } catch (e) { oldOut = 'error: ' + e.message.slice(0, 80); }
  gate('CONTROL: the same drag on the OLD build takes nothing out (must fail there)', oldOut === null, String(oldOut));
  /* ---------- 9. layout at four sizes: door, table, cards, done ---------- */
  for (const [w, h] of [[683, 768], [746, 897], [1366, 768], [1920, 1080]]) {
    const tag = w + 'x' + h; const P = await page(ctx, PAGE + '?solo=1&bot=1&fast=1&seed=5&still=1', w, h, errs); await P.waitForSelector('#begin.on', { timeout: 20000 });
    const dOff = await P.evaluate(() => { const r = document.getElementById('beginbtn').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }); gate(`door ${tag}: begin button on screen`, dOff, '');
    await P.click('#beginbtn'); await sleep(400); let o = await over(P); gate(`table ${tag}: nothing off screen or clipped`, o.length === 0, o.join(' '));
    await P.click('.slot[data-part="fan"]'); await sleep(400); o = await over(P); gate(`cards ${tag}: seven cards visible, nothing clipped`, o.length === 0 && (await st(P)).ncards === 7, o.join(' '));
    await P.goto(PAGE + '?solo=1&bot=1&fast=1&seed=5&still=1&at=done'); await P.waitForFunction(() => document.title === 'ready'); await sleep(400); o = await over(P);
    gate(`done ${tag}: panel on, nothing clipped`, o.length === 0 && (await st(P)).doneOn && !(await st(P)).appHidden, o.join(' ')); await P.close();
  }
  /* ---------- 10. robots end to end: solo, computer partner, trio ---------- */
  const t1 = Date.now(); const R1 = await page(ctx, PAGE + '?solo=1&robot=1&fast=1&seed=3', 1366, 768, errs); await R1.waitForFunction(() => OPUI.S.stage === 'done', null, { timeout: 150000 }).catch(() => {});
  let s1 = await st(R1); gate('solo robot reaches done', s1.stage === 'done' && s1.sealed === 7, s1.stage + ' ' + s1.sealed + ' in ' + Math.round((Date.now() - t1) / 1000) + ' s'); gate('solo: no strip, done says only my count', s1.strip === '' && /Dr Marmalade found 7 of the 7 jobs\./.test(s1.donep) && s1.donereveal === '', s1.donep + ' | ' + s1.strip); await R1.close();
  const t2 = Date.now(); const R2 = await page(ctx, PAGE + '?solo=1&bot=1&robot=1&fast=1&seed=4', 1366, 768, errs); await R2.waitForFunction(() => OPUI.S.stage === 'done', null, { timeout: 150000 }).catch(() => {});
  let s2 = await st(R2); gate('computer partner + robot me reach done, counts sum to 7', s2.stage === 'done' && s2.counts.A + s2.counts.B === 7, JSON.stringify(s2.counts) + ' in ' + Math.round((Date.now() - t2) / 1000) + ' s'); await R2.close();
  const r3 = 'trio' + Date.now().toString(36); const t3 = Date.now();
  const T = await Promise.all(['A', 'B', 'C'].map(s => page(ctx, PAGE + `?seat=${s}&room=${r3}&trio=1&robot=1&fast=1&seed=${s.charCodeAt(0)}`, 683, 768, errs)));
  await Promise.all(T.map(p => p.waitForFunction(() => OPUI.S.stage === 'done', null, { timeout: 180000 }).catch(() => {})));
  const s3 = await Promise.all(T.map(st)); gate('trio: three real windows all reach done with one agreed chart', s3.every(s => s.stage === 'done') && s3.every(s => JSON.stringify(s.parts) === JSON.stringify(s3[0].parts)) && (s3[0].counts.A + s3[0].counts.B + s3[0].counts.C) === 7, s3.map(s => s.stage).join('/') + ' ' + JSON.stringify(s3[0].counts) + ' in ' + Math.round((Date.now() - t3) / 1000) + ' s');
  await shot(T[0], '24_trio_done_A'); await Promise.all(T.map(p => p.close()));
  /* ---------- 11. idle: the patient nudges, the bar pulses ---------- */
  const I = await page(ctx, PAGE + '?solo=1&fast=1&at=table&idle=1500', 1366, 768, errs); await sleep(3200); const sI = await st(I);
  gate('idle: patient says an idle line and the bar pulses', sI.lastTag === 'idle' && sI.pulse, sI.lastSaid); await I.close();
  /* ---------- 12. signposting (DFM 321/322/323) + the dust photo (319) ---------- */
  const maxWords = t => Math.max(...t.split(/[.!?]\s*/).filter(Boolean).map(x => x.split(/\s+/).filter(Boolean).length));
  const tourState = p => p.evaluate(() => { const T = OPUI.tour; const i = T.step(); if (i < 0) return null; const s = T.steps()[i]; const r = document.getElementById(s.at).getBoundingClientRect(); const sp = document.getElementById('spot').getBoundingClientRect(); const box = document.getElementById('tourbox').getBoundingClientRect(); const bar = document.getElementById('bar').getBoundingClientRect();
    const near = (a, q) => Math.abs(sp.left - a.left + 8) < 6 && Math.abs(sp.top - a.top + 8) < 6 && Math.abs(sp.width - a.width - 16) < 6;
    return { i, at: s.at, say: document.getElementById('toursay').textContent, spotOn: near(r), spotOnBar: s.at !== 'bar' && near(bar), boxIn: box.left >= 0 && box.top >= 0 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1, boxOverSpot: !(box.right <= sp.left || box.left >= sp.right || box.bottom <= sp.top || box.top >= sp.bottom), btn: document.getElementById('tournext').textContent, step: document.getElementById('tourstep').textContent }; });
  const rS = 't' + Date.now().toString(36);
  const SA = await page(ctx, PAGE + `?seat=A&room=${rS}&fast=1&tour=1`, 1366, 768, errs);
  const SB = await page(ctx, PAGE + `?seat=B&room=${rS}&fast=1&tour=1`, 1366, 768, errs);
  await Promise.all([SA, SB].map(p => p.waitForFunction(() => OPUI.S.others.every(o => OPUI.S.presence[o] && OPUI.S.presence[o].here), null, { timeout: 15000 }).catch(() => {})));
  await Promise.all([SA, SB].map(p => p.waitForSelector('#begin.on', { timeout: 20000 })));
  const tog = await SA.$eval('#together', e => ({ t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize), bold: e.querySelectorAll('b').length }));
  gate('door says who she is and who she is with, in big words', tog.t === 'You are Dr Marmalade. Dr Custard is at the same table. You work on Bernadette together.' && tog.fs >= 16 && tog.bold === 2, tog.t + ' · ' + tog.fs + 'px');
  await shot(SA, '25_door_team_A');
  await SA.click('#beginbtn'); await sleep(500);
  const team = await SA.$eval('#team', e => ({ t: e.textContent, fs: parseFloat(getComputedStyle(e).fontSize), h: e.getBoundingClientRect().height }));
  gate('team line on the table: you are X, Y works on Bernadette with you, ≥18 px', team.t === 'You are Dr Marmalade. Dr Custard works on Bernadette with you.' && team.fs >= 18 && team.h > 0, team.t + ' · ' + team.fs + 'px');
  gate('tour opens after Begin, before any tap', await SA.$eval('#tour', e => !e.hidden), '');
  const cc = await SA.$eval('.slot[data-part="cpu"]', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await SA.mouse.click(cc.x, cc.y); await sleep(300); const sT = await st(SA);
  gate('a tap on a part during the tour does nothing', sT.myOut === null && sT.stage === 'op', String(sT.myOut));
  const walk = [];
  for (let k = 0; k < 8; k++) { const d = await tourState(SA); if (!d) break; walk.push(d); if (k === 0) await shot(SA, '26_tour_step1_1366'); if (d.at === 'chart') await shot(SA, '27_tour_chart_1366'); if (d.at === 'strip') await shot(SA, '28_tour_strip_1366'); await SA.click('#tournext'); await sleep(450); }
  gate('tour: six steps, face → parts → chart → team → partner → bar', walk.map(w => w.at).join(',') === 'facecol,case,chart,team,strip,bar', walk.map(w => w.at).join(','));
  gate('tour: every sentence twelve words or fewer', walk.every(w => maxWords(w.say) <= 12), walk.map(w => maxWords(w.say)).join(','));
  gate('control: the word gate catches a thirteen-word sentence', maxWords('one two three four five six seven eight nine ten eleven twelve thirteen.') > 12, '');
  gate('tour: the spotlight sits on the area named, box on screen and off the lit area', walk.every(w => w.spotOn && w.boxIn && !w.boxOverSpot), JSON.stringify(walk.filter(w => !(w.spotOn && w.boxIn && !w.boxOverSpot)).map(w => w.at + ':' + w.spotOn + w.boxIn + w.boxOverSpot)));
  gate('control: the spotlight check says NO when asked whether the face step lit the bar', walk.length && walk[0].spotOnBar === false, '');
  gate('tour: step counter, Next, last button Start', walk.length === 6 && walk[0].step === 'Step 1 of 6' && walk[0].btn === 'Next' && walk[5].btn === 'Start', (walk[0] || {}).step + '/' + (walk[5] || {}).btn);
  const gone = await SA.$eval('#tour', e => e.hidden); await SA.click('.slot[data-part="cpu"]'); await sleep(300); const sU = await st(SA);
  gate('after Start: tour gone and a tap takes a part out', gone && sU.myOut === 'cpu', String(sU.myOut));
  await SB.click('#beginbtn'); await sleep(400); const teamB = await SB.$eval('#team', e => e.textContent);
  gate('partner window mirrors the team line', teamB === 'You are Dr Custard. Dr Marmalade works on Bernadette with you.', teamB);
  await SA.goto(PAGE + `?solo=1&fast=1`); await SA.waitForSelector('#begin.on', { timeout: 20000 }); await SA.click('#beginbtn'); await sleep(400);
  gate('tour runs once: a second visit opens straight on the table', await SA.$eval('#tour', e => e.hidden), '');
  await SA.click('#touragain'); await sleep(300); gate('"Show me around again" reopens the tour', await SA.$eval('#tour', e => !e.hidden), '');
  await SA.close(); await SB.close();
  const SS = await page(ctx, PAGE + '?solo=1&fast=1&tour=1', 683, 768, errs); await SS.waitForSelector('#begin.on', { timeout: 20000 }); await SS.click('#beginbtn'); await sleep(400);
  const solo = await SS.evaluate(() => ({ n: OPUI.tour.steps().length, team: document.getElementById('team').textContent, fs: parseFloat(getComputedStyle(document.getElementById('team')).fontSize) }));
  gate('solo at 683: five steps (no partner step), team line says on your own, ≥15 px', solo.n === 5 && solo.team === 'You are Dr Marmalade. You work on Bernadette on your own.' && solo.fs >= 15, JSON.stringify(solo));
  const walkS = []; for (let k = 0; k < 6; k++) { const d = await tourState(SS); if (!d) break; walkS.push(d); if (d.at === 'case') await shot(SS, '29_tour_case_683'); if (d.at === 'chart') await shot(SS, '30_tour_chart_683'); await SS.click('#tournext'); await sleep(450); }
  gate('tour at 683: spotlight on target, box on screen and off the lit area, every step', walkS.length === 5 && walkS.every(w => w.spotOn && w.boxIn && !w.boxOverSpot), JSON.stringify(walkS.filter(w => !(w.spotOn && w.boxIn && !w.boxOverSpot)).map(w => w.at + ':' + w.spotOn + w.boxIn + w.boxOverSpot)));
  const fl = await SS.$eval('.slot[data-part="fluff"] img', e => ({ src: e.getAttribute('src'), w: e.naturalWidth, h: e.naturalHeight }));
  gate('fluff tile is the Commons dust photo, 640×480', fl.src === '../img/l6/fluff.jpg' && fl.w === 640 && fl.h === 480, JSON.stringify(fl));
  const lab = await SS.evaluate(() => document.getElementById('lobbylab').textContent);
  gate('lobby is labelled as the tester’s panel', /Tester.s panel\. Pupils never see this\./.test(lab), lab);
  await SS.close();
  gate('no page errors in any window', errs.length === 0, errs.slice(0, 3).join(' || '));
  await b.close();
  const out = `HARNESS 2 · ${new Date().toISOString()} · ${rows.length} gates, ${bad} failed · ${Math.round((Date.now() - t00) / 1000)} s\n` + rows.join('\n') + (errs.length ? '\n\nPAGE ERRORS\n' + errs.join('\n') : '') + '\n';
  fs.writeFileSync(path.join(SHOTS, 'HARNESS2_RUN1.log'), out); console.log(out); process.exit(bad ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); fs.writeFileSync(path.join(SHOTS, 'HARNESS2_RUN1.log'), rows.join('\n') + '\nCRASH ' + e.stack); process.exit(2); });
