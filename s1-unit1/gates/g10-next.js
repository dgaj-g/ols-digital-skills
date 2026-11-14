#!/usr/bin/env node
/* G10 — an activity's own "Next" button (v16, 14 Nov 2026). Pupils reported "none of them saved": they finished one
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
const PORT = 8783, SPORT = 8784, BASE = 'http://localhost:' + PORT, ACT = 'http://localhost:' + SPORT + '/';
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

const INDEX = path.join(ROOT, 'server', 'Index.html'), SW16 = /if \(!ownPage\(m\.path\)\) \{ \/\/ v16[\s\S]*?\n        return;\n      \}\n/;
async function run(indexFile, store) {
  try { fs.unlinkSync(store); } catch (e) {}
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { S1U1_STORE: store, S1U1_INDEX: indexFile }), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start')), 10000); });
  const post = async (p, body, user) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user || OWNER }, body: JSON.stringify(body || {}) })).json();
  const rec = async () => { const s = await post('/__store', {}); const v = (s.script || {})['L:' + CLS + ':' + P]; return v ? (typeof v === 'string' ? JSON.parse(v) : v) : null; };
  const out = { a1: null, a2: null, crumb: null, st2: null, errs: [] };
  let browser;
  try {
    await post('/api/apiStaff', { op: 'create', name: '11A DT' });
    await post('/api/apiStaff', { op: 'setTopic', cls: CLS, topic: 'databases', open: true });
    await post('/api/apiName', { cls: CLS, name: 'Aoife' }, P);
    browser = await puppeteer.launch({ headless: 'shell' });
    const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
    page.on('pageerror', (e) => out.errs.push(e.message));
    await page.goto(BASE + '/?class=' + CLS + '&as=' + encodeURIComponent(P) + '&actbase=' + encodeURIComponent(ACT), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-open="databases"]', { timeout: 15000 }); await page.click('[data-open="databases"]');
    await page.waitForSelector('[data-act="' + A1.id + '"]', { timeout: 10000 }); await page.click('[data-act="' + A1.id + '"]');
    const frameOf = (p) => until(() => page.frames().find((f) => f.url().indexOf(p) !== -1 && f !== page.mainFrame()), 10000);
    const f1 = await frameOf(A1.path); await f1.waitForFunction(() => window.OLSBridge && typeof showResults === 'function', { timeout: 10000 });
    // a real results screen: level 2 (The Shape Sorter) played, 3 of 5
    await f1.evaluate(() => { marks[1] = 3; maxMarks[1] = 5; showResults(); });
    out.a1 = await until(async () => { const r = await rec(); return r && r.a ? r.a[A1.id] || null : null; }, 8000);
    await wait(3300); // the bridge sends one finish per 3 seconds
    const nextOk = await f1.evaluate(() => { const a = [...document.querySelectorAll('#resultsScreen a')].find((x) => /^Next/.test(x.textContent.trim())); if (!a) return false; a.click(); return true; });
    if (!nextOk) out.errs.push('no Next button on the results screen');
    const f2 = await frameOf(A2.path); await f2.waitForFunction(() => window.OLSBridge && window.OLSBridge.framed, { timeout: 10000 });
    await wait(1500);
    const f2b = page.frames().find((f) => f.url().indexOf(A2.path) !== -1) || f2; // the app may have opened it afresh
    await f2b.waitForFunction(() => window.OLSBridge && window.OLSBridge.framed, { timeout: 10000 });
    out.crumb = await page.evaluate(() => document.body.innerText.slice(0, 400));
    await f2b.evaluate(() => window.OLSBridge.finish(5, 7));
    out.st2 = await until(async () => { const t = await page.evaluate(() => (document.getElementById('asave') || {}).innerText || ''); return /5 of 7/.test(t) ? t : null; }, 6000);
    await wait(1500);
    const r2 = await rec(); out.a2 = r2 && r2.a ? r2.a[A2.id] || null : null;
  } catch (e) { out.errs.push(String(e && e.message || e)); }
  finally { if (browser) await browser.close(); srv.kill(); await wait(300); }
  return out;
}
(async () => {
  const st = path.join(DESIGN, 'gates', 'g10-store.json');
  const v = await run(INDEX, st);
  check(A1.title + ': its results screen saves its score (3 of 5)', !!v.a1 && v.a1.slice(0, 2).join(',') === '3,5', JSON.stringify(v.a1));
  check('its own "Next" button opens ' + A2.title + ' and the app moves to it (its name is on the page)', v.crumb && v.crumb.indexOf(A2.title) !== -1, (v.crumb || '').slice(0, 200));
  check(A2.title + ': its score (5 of 7) is saved under its own name and shown: "' + fmt(L.actSaved, { s: 5, m: 7 }) + '"', !!v.a2 && v.a2.slice(0, 2).join(',') === '5,7' && v.st2 === fmt(L.actSaved, { s: 5, m: 7 }), JSON.stringify([v.a2, v.st2]));
  check('no page errors', !v.errs.length, v.errs.join(' | '));
  const src = fs.readFileSync(INDEX, 'utf8'); check('the built page has the v16 switch', SW16.test(src));
  const CTL = path.join(DESIGN, 'gates', 'g10-control.html');
  fs.writeFileSync(CTL, src.replace(SW16, '      if (!ownPage(m.path)) return;\n'));
  const c = await run(CTL, path.join(DESIGN, 'gates', 'g10-control-store.json'));
  check('CONTROL the v15 page (no switch) loses the second score and is caught', !(c.a2 && c.a2.slice(0, 2).join(',') === '5,7'), JSON.stringify(c.a2));
  stat.close();
  log.push((res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail');
  fs.writeFileSync(path.join(DESIGN, 'gates', 'g10-run.log'), log.join('\n') + '\n');
  console.log(log.join('\n')); process.exit(res.fail ? 1 : 0);
})();
