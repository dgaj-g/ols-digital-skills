'use strict';
const path = require('path');
const QA = path.resolve(__dirname, '../../..');
const B = require(path.join(QA, 'lib/browser.js'));
const S = require(path.join(QA, 'lib/stage.js'));
const W = require(path.join(QA, 'lib/walk-moves.js'));
const fs = require('fs');
const PACK = fs.readFileSync(path.join(__dirname, 'pack.js'), 'utf8');
(async () => {
  const browser = await B.launch();
  const width = Number(process.argv[2] || 375);
  const page = await B.newPage(browser, { width, height: 800 });
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    if (/content-stats-averages\.js/.test(r.url())) r.respond({ status: 200, contentType: 'application/javascript', body: PACK });
    else r.continue();
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(S.BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await W.settle(page);
  await page.evaluate(() => document.getElementById('cover-open').click());
  await W.settle(page);
  const o = await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, 'stats-averages');
  console.log('openBook', JSON.stringify(o));
  await W.settle(page);
  await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, 0);
  await W.settle(page);
  const qids = await page.evaluate(s => eval(s)(), W.QUESTIONS_ON_SCREEN);
  console.log('qids', JSON.stringify(qids));
  const dump = async (label) => {
    const info = await page.evaluate(() => {
      const r = document.querySelector('[data-qid="q2"]');
      return r ? { stage: r.getAttribute('data-stage'), stages: r.getAttribute('data-stages'), label: r.getAttribute('data-stage-label'),
        msg: (r.querySelector('.stat-msg') || {}).textContent, pills: [...r.querySelectorAll('.stage-pill')].map(p => p.className.replace('stage-pill ', '') + ':' + p.textContent),
        cells: [...r.querySelectorAll('.stat-cell')].map(b => b.getAttribute('aria-label') + '=' + b.textContent),
        picks: [...r.querySelectorAll('.stat-rowpick')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')),
        check: (r.querySelector('.btn-stamp') || {}).disabled, why: (r.querySelector('.btn-stamp') || {}).getAttribute && (r.querySelector('.btn-stamp').getAttribute('data-locked-why') || r.querySelector('.check-row').textContent) } : null;
    });
    console.log(label, JSON.stringify(info, null, 1));
  };
  await dump('fresh');
  await page.evaluate((qid) => document.querySelector('[data-qid="' + qid + '"]').scrollIntoView(), 'q2');
  await page.screenshot({ path: path.join(__dirname, 'q2-fresh-' + width + '.png') });
  // drive: cells
  const key = async (sel, val) => {
    await page.evaluate((sel) => document.querySelector(sel).click(), sel);
    await new Promise(r => setTimeout(r, 120));
    const ok = await page.evaluate((v) => {
      const pad = document.querySelector('.numpad'); if (!pad) return 'no pad';
      const keys = [...pad.querySelectorAll('button')];
      const press = (ch) => { const k = keys.filter(x => x.textContent.trim() === ch)[0]; if (!k) return false; k.click(); return true; };
      let ok = true; String(v).split('').forEach(ch => { ok = press(ch) && ok; });
      return ok;
    }, val);
    if (ok !== true) console.log('key fail', sel, ok);
  };
  const fx = ['23', '96', '225', '78', '81'];
  for (let i = 0; i < 5; i++) await key('[data-qid="q2"] .stat-cell[data-col="fx"][data-row="' + i + '"]', fx[i]);
  await dump('cells');
  await key('[data-qid="q2"] .stat-cell[data-col="f"][data-row="total"]', '20');
  await key('[data-qid="q2"] .stat-cell[data-col="fx"][data-row="total"]', '503');
  await dump('totals');
  await key('[data-qid="q2"] .stat-cell[aria-label="Mean"]', '25.15');
  await dump('mean');
  await page.evaluate(() => document.querySelector('[data-qid="q2"] .stat-rowpick[data-ask="modal"][data-row="2"]').click());
  await new Promise(r => setTimeout(r, 150));
  await dump('modal');
  await page.screenshot({ path: path.join(__dirname, 'q2-ready-' + width + '.png') });
  await page.evaluate(() => document.querySelector('[data-qid="q2"] .btn-stamp').click());
  await W.settle(page);
  await W.leaves(page, 'question', 'q2', ['fresh', 'mid-attempt'], 8000);
  const verdict = await page.evaluate(() => {
    const r = document.querySelector('[data-qid="q2"]');
    return { state: r.getAttribute('data-state'), units: [...r.querySelectorAll('.stat-unit')].map(u => u.textContent), truth: (r.querySelector('.stat-truth') || {}).textContent };
  });
  console.log('verdict', JSON.stringify(verdict, null, 1));
  await page.screenshot({ path: path.join(__dirname, 'q2-marked-' + width + '.png') });
  // q1 list + q3 set
  const q1 = await page.evaluate(() => { const r = document.querySelector('[data-qid="q1"]'); return { list: (r.querySelector('.stat-list') || {}).textContent, cells: [...r.querySelectorAll('.stat-cell')].map(b => b.getAttribute('aria-label')) }; });
  console.log('q1', JSON.stringify(q1));
  const q3 = await page.evaluate(() => { const r = document.querySelector('[data-qid="q3"]'); return r ? { stages: r.getAttribute('data-stages'), cells: [...r.querySelectorAll('.stat-cell')].map(b => b.getAttribute('aria-label')) } : 'no q3'; });
  console.log('q3', JSON.stringify(q3));
  if (q3 !== 'no q3') {
    const vals = ['4', '4', '6', '7', '9'];
    for (let k = 0; k < 5; k++) await key('[data-qid="q3"] .stat-cell[aria-label="Your five numbers, value ' + (k + 1) + '"]', vals[k]);
    const st = await page.evaluate(() => { const r = document.querySelector('[data-qid="q3"]'); return { stage: r.getAttribute('data-stage'), vals: [...r.querySelectorAll('.stat-cell')].map(b => b.textContent) }; });
    console.log('q3 filled', JSON.stringify(st));
    await page.evaluate(() => document.querySelector('[data-qid="q3"] .btn-stamp').click());
    await W.settle(page);
    await W.leaves(page, 'question', 'q3', ['fresh', 'mid-attempt'], 8000);
    const v3 = await page.evaluate(() => { const r = document.querySelector('[data-qid="q3"]'); return { state: r.getAttribute('data-state'), units: [...r.querySelectorAll('.stat-unit')].map(u => u.textContent), truth: (r.querySelector('.stat-truth') || {}).textContent }; });
    console.log('q3 verdict', JSON.stringify(v3));
    await page.evaluate((qid) => document.querySelector('[data-qid="' + qid + '"]').scrollIntoView(), 'q3');
    await page.screenshot({ path: path.join(__dirname, 'q3-marked-' + width + '.png') });
  }
  console.log('errors', JSON.stringify(errs));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
