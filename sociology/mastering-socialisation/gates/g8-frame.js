#!/usr/bin/env node
/* G8 — the page inside a frame, as Apps Script serves it. The served page carries <base target="_top">, so a plain #link would send the
 * whole tab to the sandbox frame's own address (a blank page). Drives /framed on its own harness (8774, G8_PORT overrides) with a fresh
 * store: a pupil opens a part tile, the breadcrumb Home, a part page's Back; the teacher's "Pupil view" link. After each click the TOP
 * address must not change and the frame must show the new screen.
 * CONTROL (must fail as expected): with the page's own link handling stopped, a tile click DOES move the top address.
 * Run: node gates/g8-frame.js  (exit 0 = GREEN). Output: gates/out/g8-frame.txt */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { spawn, execSync } = require('child_process');
const { sheet } = require('./common');
const ROOT = path.join(__dirname, '..');
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const PORT = +(process.env.G8_PORT || 8774), BASE = 'http://localhost:' + PORT;
const STORE = path.join(process.env.SOC_SCRATCH || path.join(os.tmpdir(), 'soc-gates'), 'g8-store.json');
const OWNER = 'dgartland021@c2ken.net', P1 = 'pupil1@c2ken.net';
const sh = sheet('g8-frame');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(fn, body, user) {
  const r = await fetch(BASE + '/api/' + fn, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user }, body: JSON.stringify(body || {}) });
  return r.json();
}
(async () => {
  fs.mkdirSync(path.dirname(STORE), { recursive: true }); try { fs.unlinkSync(STORE); } catch (e) {}
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { SOC_STORE: STORE }), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start')), 15000); });
  let browser;
  try {
    const made = await api('apiStaff', { op: 'create', name: 'Frame Class' }, OWNER);
    const cls = (made.classes || []).map((c) => c.slug).find((s) => /frame/.test(s)) || 'frame-class';
    await api('apiName', { cls, name: 'Ciara' }, P1);
    browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000, args: ['--no-sandbox'] });
    const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 768 });
    const frame = async () => { const h = await page.waitForSelector('#app'); return h.contentFrame(); };
    const topIs = () => page.url();
    async function open(q) { await page.goto(BASE + '/framed?' + q, { waitUntil: 'load' }); const f = await frame(); await f.waitForSelector('main, #app, body', { timeout: 8000 }); await wait(900); return f; }
    async function clickIn(f, sel) { const a = await f.waitForSelector(sel, { timeout: 8000 }); await a.click(); await wait(900); }
    async function step(label, f, sel, want) {
      const top0 = topIs(); let f2 = f, hash = '', moved = false;
      try { await clickIn(f, sel); } catch (e) { sh.fail(label, 'no ' + sel + ': ' + e.message); return f; }
      moved = topIs() !== top0;
      if (!moved) { f2 = await frame(); hash = await f2.evaluate(() => location.hash).catch(() => ''); }
      sh.check(!moved && want.test(hash), label, moved ? 'the top address moved to ' + topIs() : 'frame hash ' + hash);
      return f2;
    }
    // pupil
    let f = await open('class=' + cls + '&as=' + P1);
    const tiles = await f.$$eval('a.tile[data-part]', (a) => a.length).catch(() => 0);
    sh.check(tiles >= 10, 'the pupil home shows the part tiles inside the frame', tiles + ' tiles');
    f = await step('a part tile opens the part and the tab stays on the app', f, 'a.tile[data-part="p1"]', /^#s1/);
    f = await step('the breadcrumb Home goes home and the tab stays on the app', f, 'nav.crumb a[href="#home"]', /^#home$/);
    f = await step('a second tile opens its part', f, 'a.tile[data-part="p5"]', /^#s5/);
    const back = await f.$('a.btn.ghost[href^="#"]');
    if (back) f = await step('a part page Back link stays in the app', f, 'a.btn.ghost[href^="#"]', /^#/); else sh.skip('a part page Back link', 'no Back link on this page');
    // teacher
    f = await open('class=' + cls + '&as=' + OWNER);
    f = await step('the teacher\'s "Pupil view" link opens the pupil home in the frame', f, 'nav.crumb a[href="#home"]', /^#home$/);
    const tiles2 = await f.$$eval('a.tile[data-part]', (a) => a.length).catch(() => 0);
    sh.check(tiles2 >= 10, 'after "Pupil view" the teacher sees the part tiles', tiles2 + ' tiles');
    // CONTROL: stop the page's own link handling; the same tile click must now move the top address
    f = await open('class=' + cls + '&as=' + P1);
    await f.evaluate(() => window.addEventListener('click', (e) => e.stopPropagation(), true));
    const top0 = topIs(); await clickIn(f, 'a.tile[data-part="p1"]').catch(() => {}); await wait(600);
    sh.check(topIs() !== top0, 'CONTROL with the link handling stopped, a tile click does move the top address (the check above can see the bug)', 'top now ' + topIs());
  } catch (e) { sh.fail('run', e.stack || e.message); }
  finally { try { if (browser) await browser.close(); } catch (e) {} srv.kill(); }
  sh.finish();
})();
