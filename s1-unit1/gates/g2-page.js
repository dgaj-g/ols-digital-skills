#!/usr/bin/env node
/* G2 — render coverage and the scripted sit on the harness (SPEC §7).
 * Starts tools/dev-server.js on its own port with a fresh store, makes the class "11A DT" as the owner, opens the pupil
 * page at 1280x800 with ?sit=1 and lets platform/sit.js play the whole round through the page: all 82 drawn questions
 * render (wording, figure, labels, spare pair item, gaps) with nothing wider than its box and no frame scroll, before and
 * after Check; cards, summary, restore, repeat mark, round 2. Fails on any console error or failed request.
 * The page's marks are then recomputed in node from the judge, the bank and the same SitPolicy seed, question by question.
 * CONTROL (must fail): the same run as another pupil with a stylesheet that widens the cards and a thrown error — the sit
 * must report layout failures and the gate must see the page error.
 * PHONE: the owner's sit again at 390x844, same checks; its control forces the desktop columns back and hides the line that
 * repeats a long chosen answer under its list, and must fail on both.
 * SOFTWARE (v6): the same sit on the Software topic at desktop and phone width; three controls must fail: answer options forced
 * onto one line on a phone, a drop-down held narrower than its chosen words, the answer-first line kept after answering, and a missed answer in smaller type.
 * DATABASES and SPREADSHEETS (v7): the same sit on each at desktop and phone width (summary g2-summary-<topic>.png, lines
 * g2-sit-lines-<topic>.txt); every formula item shows the hint and a monospace box, every grid figure its row numbers.
 * Controls that must fail: formula boxes in serif, the hint hidden, a grid table forced to 1400 px on a phone.
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
const BANK_SW = vm.runInNewContext(fs.readFileSync(path.join(DESIGN, 'content', 'bank_software.js'), 'utf8') + '\n;BANK_SOFTWARE', {});
const BANK_DB = vm.runInNewContext(fs.readFileSync(path.join(DESIGN, 'content', 'bank_databases.js'), 'utf8') + '\n;BANK_DATABASES', {}); // v7
const BANK_SS = vm.runInNewContext(fs.readFileSync(path.join(DESIGN, 'content', 'bank_spreadsheets.js'), 'utf8') + '\n;BANK_SPREADSHEETS', {});
const Policy = require(path.join(ROOT, 'platform', 'sitpolicy.js'));
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }
async function api(fn, body, user) {
  const r = await fetch(BASE + '/api/' + fn, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user }, body: JSON.stringify(body) });
  return r.json();
}
async function sit(browser, user, cls, control, vw, topic) {
  const page = await browser.newPage(), errs = [];
  await page.setViewport(vw || { width: 1280, height: 800 });
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errs.push('request failed: ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
  if (control) await page.evaluateOnNewDocument((css, err) => {
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
      if (err) setTimeout(() => { throw new Error('g2 control error'); }, 50);
    });
  }, control === true ? '.card{min-width:1500px}' : control, control === true);
  const t0 = Date.now();
  await page.goto(BASE + '/?class=' + cls + '&as=' + encodeURIComponent(user) + '&sit=' + (topic || '1'), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__SIT && window.__SIT.done', { timeout: 900000, polling: 500 });
  const out = await page.evaluate(() => window.__SIT);
  return { page, errs, out, secs: Math.round((Date.now() - t0) / 1000) };
}
// the sit passed, the page saw no errors, and its marks equal the judge's for this pupil (same seed, same policy)
function sitChecks(R, user, tag, bank) {
    const fails = R.out.lines.filter((l) => /^SIT FAIL/.test(l));
    check(tag + 'sit run PASS (' + R.secs + ' s)', R.out.pass && fails.length === 0, fails.slice(0, 8).join(' | '));
    check(tag + 'no console errors or failed requests', R.errs.length === 0, R.errs.slice(0, 5).join(' | '));
    const marksLine = (R.out.lines.find((l) => l.indexOf('MARKS ') === 0) || '').slice(6);
    const got = {}; marksLine.split(',').filter(Boolean).forEach((p) => { const i = p.lastIndexOf(':'); got[p.slice(0, i)] = +p.slice(i + 1); });
    let n = 0, diff = [], tot = 0, max = 0;
    (bank || BANK).stages.forEach((st) => st.questions.forEach((q) => { if (!Judge.inRound(q, 1)) return; // round 1 only: from:2 questions wait for round 2
      const v = Judge.draw(q, user + '|1|' + q.id), a = Policy.answer(v, user + '|1'), m = Judge.judge(q, a, v).marks;
      n++; tot += m; max += q.marks; if (got[q.id] !== m) diff.push(q.id + ' page ' + got[q.id] + ' judge ' + m);
    }));
    check(tag + 'page marks = judge marks on all ' + n + ' questions', diff.length === 0 && Object.keys(got).length === n, diff.slice(0, 6).join(' | '));
    check(tag + 'total line', R.out.lines.indexOf('TOTAL ' + tot + ' of ' + max) !== -1, 'want TOTAL ' + tot + ' of ' + max);
    const ms = Object.keys(got).sort().map((k) => k + ':' + got[k]).join(',');
    check(tag + 'MARKS# hash matches node', R.out.lines.some((l) => l.indexOf('MARKS# ' + Policy.h32(ms).toString(16) + ' ') === 0));
    log.push('INFO ' + tag + 'round 1 · ' + tot + ' of ' + max + ' marks · MARKS# ' + Policy.h32(ms).toString(16) + ' · ' + R.out.lines.filter((l) => /^SIT PASS/.test(l)).length + ' sit checks passed');
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
    const opened = await api('apiStaff', { op: 'setTopic', cls: '11a-dt', topic: 'digital-data', open: true }, OWNER);
    check('Digital Data opened for the class (a new class starts locked, DECISIONS §16)', opened.ok && opened.open === true, JSON.stringify(opened));
    browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000 });
    // ---- the real run
    const R = await sit(browser, OWNER, '11a-dt', false);
    fs.writeFileSync(path.join(OUT, 'g2-sit-lines.txt'), R.out.lines.join('\n') + '\n');
    try { await R.page.bringToFront(); await R.page.screenshot({ path: path.join(OUT, 'g2-summary.png'), captureBeyondViewport: false }); } catch (e) { log.push('INFO screenshot skipped: ' + e.message.slice(0, 80)); }
    sitChecks(R, OWNER, '');
    // ---- control: it must fail
    const C = await sit(browser, 'control7@c2ken.net', '11a-dt', true);
    const cl = C.out.lines.filter((l) => /^SIT FAIL layout/.test(l)).length;
    check('CONTROL wide cards: sit reports layout failures', !C.out.pass && cl > 0, 'layout fails ' + cl);
    check('CONTROL thrown error: the gate sees it', C.errs.some((e) => /g2 control error/.test(e)), C.errs.join(' | '));
    // ---- the same sit on a phone (his question, 27 Sep 2026): 390x844, the owner's record cleared and played again
    const PH = { width: 390, height: 844 };
    const P = await sit(browser, OWNER, '11a-dt', false, PH);
    try { await P.page.screenshot({ path: path.join(OUT, 'g2-summary-phone.png'), captureBeyondViewport: false }); } catch (e) { log.push('INFO phone screenshot skipped: ' + e.message.slice(0, 80)); }
    sitChecks(P, OWNER, 'PHONE 390x844 · ');
    // ---- phone control (must fail): the desktop two-column question layout forced back on at phone width
    const PC = await sit(browser, 'control8@c2ken.net', '11a-dt', '.cols{grid-template-columns:400px 1fr!important}.pairs .said{display:none!important}', PH);
    const pcl = PC.out.lines.filter((l) => /^SIT FAIL layout/.test(l));
    check('CONTROL phone with the desktop columns: sit reports layout failures', !PC.out.pass && pcl.some((l) => /scrolls sideways/.test(l)), 'layout fails ' + pcl.length);
    check('CONTROL phone with the chosen-words line hidden: sit reports list text cut off', pcl.some((l) => /list text cut off/.test(l)), 'layout fails ' + pcl.length);
    // ---- v6: the Software topic (spec 1.2), opened on its own, sat through the page at desktop and phone width
    const swo = await api('apiStaff', { op: 'setTopic', cls: '11a-dt', topic: 'software', open: true }, OWNER);
    check('Software opened for the class', swo.ok && swo.open === true, JSON.stringify(swo));
    const W = await sit(browser, OWNER, '11a-dt', false, null, 'software');
    fs.writeFileSync(path.join(OUT, 'g2-sit-lines-software.txt'), W.out.lines.join('\n') + '\n');
    try { await W.page.bringToFront(); await W.page.screenshot({ path: path.join(OUT, 'g2-summary-software.png'), captureBeyondViewport: false }); } catch (e) { log.push('INFO software screenshot skipped: ' + e.message.slice(0, 80)); }
    check('SOFTWARE the sit played Software, not Digital Data', W.out.lines.some((l) => /^SIT PASS topic software is Software/.test(l)), W.out.lines.filter((l) => /topic /.test(l)).join(' | '));
    sitChecks(W, OWNER, 'SOFTWARE · ', BANK_SW);
    const WP = await sit(browser, OWNER, '11a-dt', false, PH, 'software');
    sitChecks(WP, OWNER, 'SOFTWARE PHONE 390x844 · ', BANK_SW);
    // ---- control (must fail), live sit 14 Oct 2026: a drop-down held narrower than its chosen words
    const WC = await sit(browser, 'control9@c2ken.net', '11a-dt', '.gapsent select{max-width:100px!important}', null, 'software');
    const wcl = WC.out.lines.filter((l) => /list text cut off/.test(l));
    check('CONTROL drop-down narrower than its chosen words: sit reports list text cut off', !WC.out.pass && wcl.length > 0, 'cut-off lines ' + wcl.length);
    // Software has no figures, so its control keeps the long answer options on one line: at 390 px they must spill
    const WN = await sit(browser, 'control10@c2ken.net', '11a-dt', '.opt,.opt span{white-space:nowrap!important}', PH, 'software');
    check('CONTROL Software on a phone with each answer option forced onto one line: sit reports layout failures', !WN.out.pass && WN.out.lines.some((l) => /^SIT FAIL layout/.test(l)), 'layout fails ' + WN.out.lines.filter((l) => /^SIT FAIL layout/.test(l)).length);
    // ---- control (must fail), live look 14 Oct 2026: the "Answer every part first." line kept on screen after she has answered
    const WH = await sit(browser, 'control11@c2ken.net', '11a-dt', '#help[hidden]{display:inline!important}.opt.key>span{font-size:11px!important}', null, 'software');
    const whl = WH.out.lines.filter((l) => /answer-first line gone/.test(l));
    check('CONTROL answer-first line kept on screen after answering: sit reports it', !WH.out.pass && whl.length > 0, 'lines ' + whl.length);
    const wkl = WH.out.lines.filter((l) => /marked answers all one size/.test(l));
    check('CONTROL a missed answer drawn in smaller type (same sit): sit reports it', wkl.length > 0, 'lines ' + wkl.length);
    // ---- v7: Databases and Spreadsheets, the same sit as Software at desktop and phone width
    const TITLES = { databases: 'Database applications', spreadsheets: 'Spreadsheet applications' };
    for (const [id, B] of [['databases', BANK_DB], ['spreadsheets', BANK_SS]]) {
      const o7 = await api('apiStaff', { op: 'setTopic', cls: '11a-dt', topic: id, open: true }, OWNER);
      check(id + ' opened for the class', o7.ok && o7.open === true, JSON.stringify(o7));
      const D = await sit(browser, OWNER, '11a-dt', false, null, id);
      fs.writeFileSync(path.join(OUT, 'g2-sit-lines-' + id + '.txt'), D.out.lines.join('\n') + '\n');
      try { await D.page.bringToFront(); await D.page.screenshot({ path: path.join(OUT, 'g2-summary-' + id + '.png'), captureBeyondViewport: false }); } catch (e) { log.push('INFO ' + id + ' screenshot skipped: ' + e.message.slice(0, 80)); }
      const tag = id.toUpperCase();
      check(tag + ' the sit played ' + TITLES[id], D.out.lines.some((l) => l.indexOf('SIT PASS topic ' + id + ' is ' + TITLES[id]) === 0), D.out.lines.filter((l) => /topic /.test(l)).join(' | '));
      sitChecks(D, OWNER, tag + ' · ', B);
      if (id === 'spreadsheets') {
        check(tag + ' every formula item shows the hint line and a monospace box', D.out.lines.some((l) => /^SIT PASS every formula item shows the hint line and a monospace box/.test(l)), D.out.lines.filter((l) => /formula/.test(l)).join(' | ') || 'no formula line');
        check(tag + ' every grid figure shows its row-number column', D.out.lines.some((l) => /^SIT PASS every grid figure shows its row-number column/.test(l)), D.out.lines.filter((l) => /grid/.test(l)).join(' | ') || 'no grid line');
      }
      const DP = await sit(browser, OWNER, '11a-dt', false, PH, id);
      sitChecks(DP, OWNER, tag + ' PHONE 390x844 · ', B);
      if (id === 'spreadsheets') check(tag + ' PHONE formula and grid checks pass at 390 px', DP.out.lines.some((l) => /^SIT PASS every formula item/.test(l)) && DP.out.lines.some((l) => /^SIT PASS every grid figure/.test(l)));
      try { await D.page.close(); await DP.page.close(); } catch (e) {}
    }
    // ---- v7 controls (must fail): formula boxes in serif; the hint hidden (one run, two independent checks); a 1400 px grid on a phone
    const FC = await sit(browser, 'control12@c2ken.net', '11a-dt', '.fml{font-family:serif!important}.hint{display:none!important}', null, 'spreadsheets');
    const fcm = FC.out.lines.filter((l) => /^SIT FAIL formula box is monospace/.test(l)), fch = FC.out.lines.filter((l) => /^SIT FAIL formula hint shows/.test(l));
    check('CONTROL formula boxes in serif: sit reports the formula-box check failing', !FC.out.pass && fcm.length > 0, 'lines ' + fcm.length);
    check('CONTROL formula hint hidden: sit reports the hint check failing', !FC.out.pass && fch.length > 0, 'lines ' + fch.length);
    const GC = await sit(browser, 'control13@c2ken.net', '11a-dt', '.figure.grid table{min-width:1400px!important}', PH, 'spreadsheets');
    const gcl = GC.out.lines.filter((l) => /^SIT FAIL layout/.test(l) && /figure/.test(l));
    check('CONTROL a 1400 px grid table on a phone: sit reports layout failures on the figure', !GC.out.pass && gcl.length > 0, 'lines ' + gcl.length);
    log.push('INFO v7 controls: ' + fcm.length + ' serif-box fails, ' + fch.length + ' hidden-hint fails, ' + gcl.length + ' grid layout fails');
  } catch (e) { check('run', false, e.stack || e.message); }
  finally { if (browser) await browser.close(); srv.kill(); }
  const txt = 'G2 render coverage + sit on the harness · ' + new Date().toISOString() + '\n' + log.join('\n') + '\n' + (res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail\n';
  fs.writeFileSync(path.join(OUT, 'g2-page.txt'), txt); process.stdout.write(txt); process.exit(res.fail ? 1 : 0);
})();
