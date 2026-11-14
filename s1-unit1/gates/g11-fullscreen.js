#!/usr/bin/env node
/* G11 — Full screen that still saves (v17, 14 Nov 2026). v16's "Open in a full window" opened the activity in a separate
 * tab, outside the app, so its score never came back. v17's Full screen button makes the activity fill the window while it
 * stays inside the app. Driven as a pupil at two screen sizes: press Full screen, the activity must fill the window with
 * the save line and Exit button showing, a finish must save, the activity's own Next must keep full screen and save too,
 * and Exit must bring the normal screen back. Nothing on the activity screen may open a separate tab.
 * CONTROL: the v16 page (main's server/Index.html) must fail.
 * (Header of G10 kept below for the shared harness.)
 * G10 — an activity's own "Next" button (v16, 14 Nov 2026). Pupils reported "none of them saved": they finished one
 * activity and pressed its "Next: ..." button, which opened the next activity INSIDE the same frame, and the app
 * ignored every score from it (it still thought it was on the first activity). Driven as a pupil on the dev harness with
 * the real Databases HQ pages from the S1 repo: finish The Register through its real results screen, press its real
 * "Next" button, finish the next activity, and both scores must be saved under their own activities.
 * CONTROL: the v15 page (no switch) must fail the second check.
 */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), { spawn, execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const REPO = process.env.S1_REPO || '/Users/damiengartland/Sites/s1-wt-platform';
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const S1L = require(path.join(ROOT, 'platform', 'lessons.js')), L = S1L.S;
const PORT = 8785, SPORT = 8786, BASE = 'http://localhost:' + PORT, ACT = 'http://localhost:' + SPORT + '/';
const OWNER = 'dgartland021@c2ken.net', P = 'pupil1@c2ken.net', CLS = '11a-dt';
const DB = S1L.topics.find((t) => t.id === 'databases'), A1 = DB.acts[0], A2 = DB.acts[1];
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms) { const end = Date.now() + (ms || 8000); for (;;) { let v; try { v = await fn(); } catch (e) { v = null; } if (v) return v; if (Date.now() > end) return v; await wait(200); } }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' };
const stat = http.createServer((req, rs) => { const u = decodeURIComponent(new URL(req.url, ACT).pathname); const f = path.normalize(path.join(REPO, u)); if (!f.startsWith(REPO)) { rs.writeHead(403); return rs.end(); }
  fs.readFile(f, (e, b) => { if (e) { rs.writeHead(404); return rs.end('not found'); } rs.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); rs.end(b); }); }).listen(SPORT);


const INDEX = path.join(ROOT, 'server', 'Index.html');
async function run(indexFile, store, vw, vh) {
  try { fs.unlinkSync(store); } catch (e) {}
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { S1U1_STORE: store, S1U1_INDEX: indexFile }), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start')), 10000); });
  const post = async (p, body, user) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user || OWNER }, body: JSON.stringify(body || {}) })).json();
  const rec = async () => { const s = await post('/__store', {}); const v = (s.script || {})['L:' + CLS + ':' + P]; return v ? (typeof v === 'string' ? JSON.parse(v) : v) : null; };
  const out = { tabs: null, label: null, big: null, a1: null, st1: null, big2: null, a2: null, st2: null, after: null, errs: [] };
  let browser;
  try {
    await post('/api/apiStaff', { op: 'create', name: '11A DT' });
    await post('/api/apiStaff', { op: 'setTopic', cls: CLS, topic: 'databases', open: true });
    await post('/api/apiName', { cls: CLS, name: 'Aoife' }, P);
    browser = await puppeteer.launch({ headless: 'shell' });
    const page = await browser.newPage(); await page.setViewport({ width: vw, height: vh });
    page.on('pageerror', (e) => out.errs.push(e.message));
    await page.goto(BASE + '/?class=' + CLS + '&as=' + encodeURIComponent(P) + '&actbase=' + encodeURIComponent(ACT), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-open="databases"]', { timeout: 15000 }); await page.click('[data-open="databases"]');
    await page.waitForSelector('[data-act="' + A1.id + '"]', { timeout: 10000 }); await page.click('[data-act="' + A1.id + '"]');
    const frameOf = (p) => until(() => page.frames().find((f) => f.url().indexOf(p) !== -1 && f !== page.mainFrame()), 10000);
    const f1 = await frameOf(A1.path); await f1.waitForFunction(() => window.OLSBridge && typeof showResults === 'function', { timeout: 10000 });
    out.tabs = await page.evaluate(() => [...document.querySelectorAll('.actscr a[target="_blank"]')].map((a) => a.textContent.trim()));
    const b = await page.$('#afull'); out.label = b ? await page.evaluate((x) => x.textContent.trim(), b) : null;
    const pagesBefore = (await browser.pages()).length;
    if (b) await b.click(); await wait(600);
    const look = () => page.evaluate(() => {
      const s = document.querySelector('.actscr'), fr = document.querySelector('.actframe'), st = document.getElementById('asave'), x = document.getElementById('afull'), j = document.querySelector('.actscr .job');
      const r = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, b: q.bottom, rt: q.right }; };
      const vis = (e) => { const q = r(e); return !!q && q.w > 0 && q.h > 0 && q.y >= 0 && q.b <= innerHeight + 1 && getComputedStyle(e).visibility !== 'hidden'; };
      const fit = x ? x.scrollWidth <= x.clientWidth + 1 && x.scrollHeight <= x.clientHeight + 1 : false;
      return { big: !!s && s.classList.contains('big'), fr: r(fr), W: innerWidth, H: innerHeight, stVis: vis(st), exitVis: vis(x), exitText: x ? x.textContent.trim() : '', fit, jobVis: vis(j) };
    });
    out.big = await look(); out.big.newTabs = (await browser.pages()).length - pagesBefore;
    await f1.evaluate(() => { marks[1] = 3; maxMarks[1] = 5; showResults(); });
    out.a1 = await until(async () => { const r = await rec(); return r && r.a ? r.a[A1.id] || null : null; }, 8000);
    out.st1 = await until(async () => { const t = await page.evaluate(() => (document.getElementById('asave') || {}).innerText || ''); return /3 of 5/.test(t) ? t : null; }, 6000);
    await wait(3300);
    const nextOk = await f1.evaluate(() => { const a = [...document.querySelectorAll('#resultsScreen a')].find((x) => /^Next/.test(x.textContent.trim())); if (!a) return false; a.click(); return true; });
    if (!nextOk) out.errs.push('no Next button on the results screen');
    await frameOf(A2.path); await wait(1800);
    const f2 = page.frames().find((f) => f.url().indexOf(A2.path) !== -1 && f !== page.mainFrame());
    await f2.waitForFunction(() => window.OLSBridge && window.OLSBridge.framed, { timeout: 10000 });
    out.big2 = await look();
    await f2.evaluate(() => window.OLSBridge.finish(5, 7));
    out.st2 = await until(async () => { const t = await page.evaluate(() => (document.getElementById('asave') || {}).innerText || ''); return /5 of 7/.test(t) ? t : null; }, 6000);
    await wait(1500); const r2 = await rec(); out.a2 = r2 && r2.a ? r2.a[A2.id] || null : null;
    const b2 = await page.$('#afull'); if (b2) await b2.click(); await wait(500);
    out.after = await look();
  } catch (e) { out.errs.push(String(e && e.message || e)); }
  finally { if (browser) await browser.close(); srv.kill(); await wait(300); }
  return out;
}
const fills = (o) => !!o && o.big && !!o.fr && o.fr.w >= o.W * 0.95 && o.fr.h >= o.H * 0.85 && o.fr.b <= o.H + 1;
(async () => {
  for (const [vw, vh] of [[1280, 800], [1920, 1080]]) {
    const sz = ' at ' + vw + '×' + vh;
    const v = await run(INDEX, path.join(DESIGN, 'gates', 'g11-store.json'), vw, vh);
    check('nothing on the activity screen opens a separate tab' + sz, Array.isArray(v.tabs) && v.tabs.length === 0, JSON.stringify(v.tabs));
    check('the button says "' + L.fullWindow + '"' + sz, v.label === L.fullWindow, v.label);
    check('Full screen: the activity fills the window, no new tab opens' + sz, fills(v.big) && v.big.newTabs === 0, JSON.stringify(v.big));
    check('Full screen: the save line and "' + L.exitFull + '" show, its words fit the button' + sz, !!v.big && v.big.stVis && v.big.exitVis && v.big.exitText === L.exitFull && v.big.fit, JSON.stringify(v.big));
    check('a finish in full screen saves 3 of 5 and says "' + fmt(L.actSaved, { s: 3, m: 5 }) + '"' + sz, !!v.a1 && v.a1.slice(0, 2).join(',') === '3,5' && v.st1 === fmt(L.actSaved, { s: 3, m: 5 }), JSON.stringify([v.a1, v.st1]));
    check('the activity\'s own Next keeps full screen' + sz, fills(v.big2), JSON.stringify(v.big2));
    check('the next activity\'s finish saves 5 of 7' + sz, !!v.a2 && v.a2.slice(0, 2).join(',') === '5,7' && v.st2 === fmt(L.actSaved, { s: 5, m: 7 }), JSON.stringify([v.a2, v.st2]));
    check('"' + L.exitFull + '" brings the normal screen back (job line showing, button says "' + L.fullWindow + '")' + sz, !!v.after && !v.after.big && v.after.jobVis && v.after.exitText === L.fullWindow, JSON.stringify(v.after));
    check('no page errors' + sz, !v.errs.length, v.errs.join(' | '));
  }
  const CTL = path.join(DESIGN, 'gates', 'g11-control.html');
  fs.writeFileSync(CTL, execSync('git -C "' + ROOT + '" show main:s1-unit1/server/Index.html', { maxBuffer: 1 << 26 }));
  const c = await run(CTL, path.join(DESIGN, 'gates', 'g11-control-store.json'), 1280, 800);
  check('CONTROL the v16 page (full window opens a separate tab) is caught', !(Array.isArray(c.tabs) && c.tabs.length === 0 && fills(c.big)), JSON.stringify([c.tabs, c.big]));
  stat.close();
  log.push((res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail');
  fs.writeFileSync(path.join(DESIGN, 'gates', 'g11-run.log'), log.join('\n') + '\n');
  console.log(log.join('\n')); process.exit(res.fail ? 1 : 0);
})();
