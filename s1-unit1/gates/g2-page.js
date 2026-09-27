#!/usr/bin/env node
/* G2 — render coverage and the scripted sit on the harness (SPEC §7).
 * Starts tools/dev-server.js on its own port with a fresh store, makes the class "11A DT" as the owner, opens the pupil
 * page at 1280x800 with ?sit=1 and lets platform/sit.js play the whole round through the page: all 82 drawn questions
 * render (wording, figure, labels, spare pair item, gaps) with nothing wider than its box and no frame scroll, before and
 * after Check; cards, summary, restore, repeat mark, round 2. Fails on any console error or failed request.
 * The page's marks are then recomputed in node from the judge, the bank and the same SitPolicy seed, question by question.
 * CONTROL (must fail): the same run as another pupil with a stylesheet that widens the cards and a thrown error — the sit
 * must report layout failures and the gate must see the page error.
 * Run: node s1-unit1/gates/g2-page.js  (exit 0 = GREEN). Output: gates/out/g2-page.txt, gates/out/g2-summary.png */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { spawn, execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const PORT = 8769, BASE = 'http://localhost:' + PORT, OWNER = 'dgartland021@c2ken.net';
const STORE = path.join(DESIGN, 'gates', 'g2-store.json');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const Judge = require(path.join(DESIGN, 'judge', 'judge.js'));
const BANK = vm.runInNewContext(fs.readFileSync(path.join(DESIGN, 'content', 'bank_digital_data.js'), 'utf8') + '\n;BANK_DIGITAL_DATA', {});
const Policy = require(path.join(ROOT, 'platform', 'sitpolicy.js'));
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }
async function api(fn, body, user) {
  const r = await fetch(BASE + '/api/' + fn, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user }, body: JSON.stringify(body) });
  return r.json();
}
async function sit(browser, user, cls, control) {
  const page = await browser.newPage(), errs = [];
  await page.setViewport({ width: 1280, height: 800 });
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errs.push('request failed: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
  if (control) await page.evaluateOnNewDocument(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style'); st.textContent = '.card{min-width:1500px}'; document.head.appendChild(st);
      setTimeout(() => { throw new Error('g2 control error'); }, 50);
    });
  });
  const t0 = Date.now();
  await page.goto(BASE + '/?class=' + cls + '&as=' + encodeURIComponent(user) + '&sit=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__SIT && window.__SIT.done', { timeout: 900000, polling: 500 });
  const out = await page.evaluate(() => window.__SIT);
  return { page, errs, out, secs: Math.round((Date.now() - t0) / 1000) };
}
(async () => {
  try { fs.unlinkSync(STORE); } catch (e) {}
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { S1U1_STORE: STORE }), stdio: ['ignore', 'pipe', 'pipe'] });
  let srvErr = '';
  srv.stderr.on('data', (d) => { srvErr += d; });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start: ' + srvErr)), 10000); });
  let browser;
  try {
    const made = await api('apiStaff', { op: 'create', name: '11A DT' }, OWNER);
    check('class made', made.ok && made.slug === '11a-dt', JSON.stringify(made));
    browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000 });
    // ---- the real run
    const R = await sit(browser, OWNER, '11a-dt', false);
    fs.writeFileSync(path.join(OUT, 'g2-sit-lines.txt'), R.out.lines.join('\n') + '\n');
    try { await R.page.bringToFront(); await R.page.screenshot({ path: path.join(OUT, 'g2-summary.png'), captureBeyondViewport: false }); } catch (e) { log.push('INFO screenshot skipped: ' + e.message.slice(0, 80)); }
    const fails = R.out.lines.filter((l) => /^SIT FAIL/.test(l));
    check('sit run PASS (' + R.secs + ' s)', R.out.pass && fails.length === 0, fails.slice(0, 8).join(' | '));
    check('no console errors or failed requests', R.errs.length === 0, R.errs.slice(0, 5).join(' | '));
    // ---- the page's marks against the judge, same seed, same policy
    const marksLine = (R.out.lines.find((l) => l.indexOf('MARKS ') === 0) || '').slice(6);
    const got = {}; marksLine.split(',').filter(Boolean).forEach((p) => { const i = p.lastIndexOf(':'); got[p.slice(0, i)] = +p.slice(i + 1); });
    let n = 0, diff = [], tot = 0, max = 0;
    BANK.stages.forEach((st) => st.questions.forEach((q) => {
      const v = Judge.draw(q, OWNER + '|1|' + q.id), a = Policy.answer(v, OWNER + '|1'), m = Judge.judge(q, a, v).marks;
      n++; tot += m; max += q.marks; if (got[q.id] !== m) diff.push(q.id + ' page ' + got[q.id] + ' judge ' + m);
    }));
    check('page marks = judge marks on all ' + n + ' questions', diff.length === 0 && Object.keys(got).length === n, diff.slice(0, 6).join(' | '));
    check('total line', R.out.lines.indexOf('TOTAL ' + tot + ' of ' + max) !== -1, 'want TOTAL ' + tot + ' of ' + max);
    const ms = Object.keys(got).sort().map((k) => k + ':' + got[k]).join(',');
    check('MARKS# hash matches node', R.out.lines.some((l) => l.indexOf('MARKS# ' + Policy.h32(ms).toString(16) + ' ') === 0));
    log.push('INFO round 1 · ' + tot + ' of ' + max + ' marks · MARKS# ' + Policy.h32(ms).toString(16) + ' · ' + R.out.lines.filter((l) => /^SIT PASS/.test(l)).length + ' sit checks passed');
    // ---- control: it must fail
    const C = await sit(browser, 'control7@c2ken.net', '11a-dt', true);
    const cl = C.out.lines.filter((l) => /^SIT FAIL layout/.test(l)).length;
    check('CONTROL wide cards: sit reports layout failures', !C.out.pass && cl > 0, 'layout fails ' + cl);
    check('CONTROL thrown error: the gate sees it', C.errs.some((e) => /g2 control error/.test(e)), C.errs.join(' | '));
  } catch (e) { check('run', false, e.stack || e.message); }
  finally { if (browser) await browser.close(); srv.kill(); }
  const txt = 'G2 render coverage + sit on the harness · ' + new Date().toISOString() + '\n' + log.join('\n') + '\n' + (res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail\n';
  fs.writeFileSync(path.join(OUT, 'g2-page.txt'), txt); process.stdout.write(txt); process.exit(res.fail ? 1 : 0);
})();
