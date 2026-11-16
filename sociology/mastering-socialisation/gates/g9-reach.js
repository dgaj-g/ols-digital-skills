#!/usr/bin/env node
/* G9 — every page can be reached, and every "next" button moves on. A pupil follows links only: from the home page, every page
 * and activity of every part must be reachable by clicking (PAGES and TESTS are read from platform/app.js, so a new page is
 * covered without editing this gate). No screen's "next" button may point at the screen itself, and in parts 1 to 9 pressing
 * "next" again and again from the part's first page must pass through every page of the part.
 * Found 16 Nov 2026: after a page's last quiz, "next" pointed back at the quiz, so Part 2's six later ideas could not be reached.
 * CONTROL (must fail as expected): the same page built with nextAfter() put back as it was (the quiz loop) must show a self-pointing
 * "next" and a Part 2 chain that stops short.
 * Own harness on 8775 and 8776 (G9_PORT overrides the first), fresh stores, builds into the scratch folder (DESIGN/deploy untouched).
 * Run: node gates/g9-reach.js  (exit 0 = GREEN). Output: gates/out/g9-reach.txt */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { spawn, execSync } = require('child_process');
const { sheet, build, SCRATCH, L } = require('./common');
const ROOT = path.join(__dirname, '..');
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const PORT = +(process.env.G9_PORT || 8775);
const OWNER = 'dgartland021@c2ken.net', P1 = 'pupil1@c2ken.net';
const sh = sheet('g9-reach');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const APP = fs.readFileSync(path.join(ROOT, 'platform', 'app.js'), 'utf8');
function readMaps(src) {
  const a = src.indexOf('var PAGES = {'), b = src.indexOf('function partOf(');
  const box = {}; vm.runInNewContext(src.slice(a, b) + '\nthis.PAGES = PAGES; this.TESTS = TESTS;', box);
  return { PAGES: box.PAGES, TESTS: box.TESTS };
}
const { PAGES, TESTS } = readMaps(APP);
const FIX = /\n {4}\/\/ the last activity on a page goes on to the next page[^\n]*\n {4}for \(var j = pi\.n;[^\n]*\n/;
const OLD = '\n    var page = C[contentKey(pi.base)]; if (page && page.next) return page.next;\n    if (pi.n < pi.m) return {route: pi.list[pi.n], label: S.next};\n';

async function harness(port, deploy, tag) {
  const store = path.join(SCRATCH, 'g9-' + tag + '-store.json'); try { fs.unlinkSync(store); } catch (e) {}
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(port)], { env: Object.assign({}, process.env, { SOC_STORE: store, SOC_DEPLOY: deploy }), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start')), 15000); });
  const base = 'http://localhost:' + port;
  const api = async (fn, body, user) => (await fetch(base + '/api/' + fn, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user }, body: JSON.stringify(body || {}) })).json();
  const made = await api('apiStaff', { op: 'create', name: 'Reach Class' }, OWNER);
  const cls = (made.classes || []).map((c) => c.slug).find((s) => /reach/.test(s)) || 'reach-class';
  await api('apiName', { cls, name: 'Ciara' }, P1);
  return { srv, url: base + '/exec?class=' + cls + '&as=' + P1 };
}
async function opener(browser, url) {
  const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 768 });
  await page.goto(url, { waitUntil: 'load' }); await page.waitForSelector('a.tile[data-part]', { timeout: 15000 });
  const seen = {};
  return async function visit(r) {
    if (seen[r]) return seen[r];
    await page.evaluate((x) => { location.hash = '#' + x; }, r); await wait(450);
    const got = await page.evaluate(() => ({
      at: location.hash.slice(1),
      links: Array.from(document.querySelectorAll('a[href^="#"]')).map((a) => a.getAttribute('href').slice(1)).filter(Boolean),
      next: (document.querySelector('.bn a.btn.acc') || { getAttribute: () => null }).getAttribute('href'),
    }));
    got.next = got.next ? got.next.slice(1) : null;
    return (seen[r] = got);
  };
}
async function chain(visit, pid) {
  const list = PAGES[pid], seen = [];
  let r = list[0];
  for (let k = 0; k < 80 && r && r !== 'home' && seen.indexOf(r) < 0; k++) { seen.push(r); const g = await visit(r); r = g.next; }
  return { seen, missing: list.filter((x) => seen.indexOf(x) < 0) };
}
const CHAIN_PARTS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'];

(async () => {
  fs.mkdirSync(SCRATCH, { recursive: true });
  const kids = []; let browser;
  try {
    // the real page, built into the scratch folder
    const realDeploy = path.join(SCRATCH, 'g9-deploy'); fs.mkdirSync(realDeploy, { recursive: true });
    const b1 = build({ platform: path.join(ROOT, 'platform'), deploy: realDeploy });
    if (b1.code !== 0) { sh.fail('build the page', b1.out.split('\n').slice(-3).join(' ')); return; }
    // the control page: platform/ copied with nextAfter() put back as it was before the fix
    sh.check(FIX.test(APP), 'the gate can find the fix in app.js (so the control can undo it)', FIX.test(APP) ? 'found' : 'not found');
    const ctlPlat = path.join(SCRATCH, 'g9-control-platform'), ctlDeploy = path.join(SCRATCH, 'g9-control-deploy');
    fs.rmSync(ctlPlat, { recursive: true, force: true }); fs.cpSync(path.join(ROOT, 'platform'), ctlPlat, { recursive: true }); fs.mkdirSync(ctlDeploy, { recursive: true });
    fs.writeFileSync(path.join(ctlPlat, 'app.js'), APP.replace(FIX, OLD));
    const b2 = build({ platform: ctlPlat, deploy: ctlDeploy });
    if (b2.code !== 0) { sh.fail('build the control page', b2.out.split('\n').slice(-3).join(' ')); return; }

    const real = await harness(PORT, realDeploy, 'real'); kids.push(real.srv);
    const ctl = await harness(PORT + 1, ctlDeploy, 'control'); kids.push(ctl.srv);
    browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 120000, args: ['--no-sandbox'] });

    // 1. reach: follow every #link from home, as a pupil clicking would
    const visit = await opener(browser, real.url);
    const reached = new Set(['home']), queue = ['home'], loops = [];
    while (queue.length && reached.size < 400) {
      const r = queue.shift(), g = await visit(r);
      if (g.next && g.next === r) loops.push(r);
      g.links.forEach((x) => { if (!reached.has(x)) { reached.add(x); queue.push(x); } });
    }
    sh.info(reached.size + ' screens reached by clicking from the home page');
    Object.keys(PAGES).forEach((pid) => {
      const miss = PAGES[pid].filter((x) => !reached.has(x));
      sh.check(!miss.length, 'every page of ' + pid + ' can be reached by clicking from the home page', miss.length ? 'not reached: ' + miss.join(', ') : PAGES[pid].length + ' pages');
    });
    const tmiss = Object.keys(TESTS).filter((x) => !reached.has(x));
    sh.check(!tmiss.length, 'every activity can be reached by clicking from the home page', tmiss.length ? 'not reached: ' + tmiss.join(', ') : Object.keys(TESTS).length + ' activities');
    // 2. no "next" points at its own screen
    sh.check(!loops.length, 'no screen\'s "next" button points back at the same screen', loops.length ? 'loops on: ' + loops.join(', ') : 'none of ' + reached.size);
    // 3. pressing "next" walks the whole part
    for (const pid of CHAIN_PARTS) {
      const c = await chain(visit, pid);
      sh.check(!c.missing.length, 'pressing "next" from the start of ' + pid + ' passes every page of the part', c.missing.length ? 'stops short; never reaches ' + c.missing.join(', ') + ' (went ' + c.seen.join(' > ') + ')' : c.seen.length + ' screens');
    }

    // CONTROL: the page with the quiz loop put back
    const cvisit = await opener(browser, ctl.url);
    const cl = [];
    for (const r of Object.keys(TESTS).filter((k) => /^s[12]\//.test(k))) { const g = await cvisit(r); if (g.next === r) cl.push(r); }
    sh.check(cl.length > 0, 'CONTROL with the old nextAfter() put back, a quiz\'s "next" points at itself (the check above can see the bug)', cl.length + ' loops, e.g. ' + (cl[0] || 'none'));
    const c2 = await chain(cvisit, 'p2');
    sh.check(c2.missing.length > 0, 'CONTROL with the old nextAfter() put back, the Part 2 "next" chain stops short', 'never reaches ' + (c2.missing.join(', ') || 'nothing missing'));
  } catch (e) { sh.fail('run', e.stack || e.message); }
  finally { try { if (browser) await browser.close(); } catch (e) {} kids.forEach((k) => k.kill()); }
  sh.finish();
})();
