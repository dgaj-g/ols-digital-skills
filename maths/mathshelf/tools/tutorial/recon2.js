const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const fs = require('fs');
const OUT = 'out/recon'; fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8099/maths/mathshelf/index.html';
const LIVE = 'https://script.google.com/a/macros/c2ken.net/s/AKfycbzUZ3bDjcFas_zQ02VrJQCEkPQgEjs3Re4JZ1OQtLACa090AC1B0Md2yUkL4aX81LwP/exec';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function rects(page, sels) {
  return page.evaluate((sels) => { const out = {}; sels.forEach(s => { const n = document.querySelector(s); if (!n) { out[s] = null; return; } const r = n.getBoundingClientRect(); out[s] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), text: (n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70) }; }); out.__docH = document.documentElement.scrollHeight; out.__scrollY = window.scrollY; return out; }, sels);
}
async function shot(page, name, sels) { await sleep(700); await page.screenshot({ path: OUT + '/' + name + '.png' }); console.log('== ' + name + ' ' + JSON.stringify(await rects(page, sels || []))); }
async function openQ(page, qid) {
  await page.evaluate((qid) => { const r = [...document.querySelectorAll('[data-surface="question"]')].find(x => (x.getAttribute('data-qid') || '') === qid); if (r) r.scrollIntoView({ block: 'start' }); }, qid); await sleep(600);
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  // --- OLS_BOOT override test on the teacher cover ---
  const c0 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await c0.addInitScript((live) => { window.OLS_BOOT = { classCode: 'default', baseUrl: live, email: 'm.mcelroy@c2ken.net', name: 'M McElroy', firstVisit: 'no' }; }, LIVE);
  const p0 = await c0.newPage();
  await p0.goto(BASE + '?nointro', { waitUntil: 'domcontentloaded' }); await sleep(1500);
  await shot(p0, 'x0-cover-bootoverride', ['#cover-welcome', '#cover-hi', '#cover-msg']);
  await c0.close();
  // --- pupil side, deeper ---
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '?class=10B%20Maths%20(demo)&nointro', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(1200);
  await page.click('#cover-open'); await sleep(1800);
  await page.click('.book[data-book="stats-averages"]'); await sleep(2200);
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[2].click()); await sleep(2200);
  await openQ(page, 'q17');
  await shot(page, 'p5-bookB-ex3-q17', ['[data-qid="q17"]', '[data-qid="q17"] .stage-strip', '[data-qid="q17"] .stage-pill', '[data-qid="q17"] .stage-now', '[data-qid="q17"] .stat-tablekind', '[data-qid="q17"] button.stat-cell[data-col="fx"][data-row="0"]', '[data-qid="q17"] button.stat-cell[data-col="f"][data-row="total"]', '[data-qid="q17"] .stat-slots', '[data-qid="q17"] .btn-stamp', '[data-qid="q17"] .dock']);
  await page.evaluate(() => document.querySelector('[data-qid="q17"] button.stat-cell[data-col="fx"][data-row="0"]').click()); await sleep(800);
  await shot(page, 'p6-bookB-ex3-q17-pad', ['[data-qid="q17"] .numpad', '[data-qid="q17"] .numpad button', '[data-qid="q17"] .stat-next, [data-qid="q17"] .numpad .stat-next', '[data-qid="q17"] .dock', '[data-qid="q17"] .stage-now']);
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[3].click()); await sleep(2200);
  await openQ(page, 'q20');
  await shot(page, 'p7-bookB-ex4-q20', ['[data-qid="q20"]', '[data-qid="q20"] .stat-tablekind', '[data-qid="q20"] .stat-rowpicks', '[data-qid="q20"] .stat-rowpick', '[data-qid="q20"] .stage-strip', '[data-qid="q20"] .stage-now', '[data-qid="q20"] .btn-stamp']);
  await page.evaluate(() => { const q = document.querySelector('[data-qid="q20"]'); const r = q.querySelector('.stat-rowpicks') || q.querySelector('.stat-slots'); if (r) r.scrollIntoView({ block: 'center' }); }); await sleep(600);
  await shot(page, 'p7b-bookB-ex4-q20-asks', ['[data-qid="q20"] .stat-rowpicks', '[data-qid="q20"] .stat-rowpick', '[data-qid="q20"] .stat-slots', '[data-qid="q20"] .btn-stamp']);
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[4].click()); await sleep(2200);
  await openQ(page, 'q28');
  await shot(page, 'p8-bookB-ex5-q28', ['[data-qid="q28"]', '[data-qid="q28"] .stat-fig', '[data-qid="q28"] .stat-sentences', '[data-qid="q28"] .stat-sentence', '[data-qid="q28"] [data-tray]', '[data-qid="q28"] [data-tray-item]', '[data-qid="q28"] .stage-now', '[data-qid="q28"] .btn-stamp']);
  // Book C
  await page.evaluate(() => document.getElementById('act-back').click()); await sleep(1500);
  await page.click('.book[data-book="stats-quartiles"]'); await sleep(2200);
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[2].click()); await sleep(2200);
  await openQ(page, 'q12');
  await shot(page, 'p9-bookC-ex3-q12', ['[data-qid="q12"]', '[data-qid="q12"] .stage-strip', '[data-qid="q12"] .stage-now', '[data-qid="q12"] .stat-note', '[data-qid="q12"] .stat-board-host', '[data-qid="q12"] .stat-board', '[data-qid="q12"] svg', '[data-qid="q12"] .stat-join', '[data-qid="q12"] .btn-stage', '[data-qid="q12"] .stat-table', '[data-qid="q12"] .nudge-pad', '[data-qid="q12"] .btn-stamp', '[data-qid="q12"] .dock']);
  await page.evaluate(() => { const q = document.querySelector('[data-qid="q12"]'); const b = q.querySelector('.stat-board-host'); if (b) b.scrollIntoView({ block: 'center' }); }); await sleep(600);
  await shot(page, 'p9b-bookC-ex3-q12-board', ['[data-qid="q12"] .stat-board-host', '[data-qid="q12"] .stat-board', '[data-qid="q12"] .stat-join', '[data-qid="q12"] .btn-stage', '[data-qid="q12"] .stat-note', '[data-qid="q12"] .stage-now', '[data-qid="q12"] .nudge-pad']);
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[3].click()); await sleep(2200);
  await openQ(page, 'q15');
  await shot(page, 'p10-bookC-ex4-q15', ['[data-qid="q15"]', '[data-qid="q15"] .stage-strip', '[data-qid="q15"] .stage-now', '[data-qid="q15"] .stat-board-host', '[data-qid="q15"] .nudge-pad', '[data-qid="q15"] .nudge-pad button', '[data-qid="q15"] .btn-stage', '[data-qid="q15"] .stat-note', '[data-qid="q15"] .dock', '[data-qid="q15"] .btn-stamp']);
  await page.evaluate(() => { const q = document.querySelector('[data-qid="q15"]'); const b = q.querySelector('.nudge-pad') || q.querySelector('.dock'); if (b) b.scrollIntoView({ block: 'center' }); }); await sleep(600);
  await shot(page, 'p10b-bookC-ex4-q15-dock', ['[data-qid="q15"] .stat-board-host', '[data-qid="q15"] .nudge-pad', '[data-qid="q15"] .nudge-pad button', '[data-qid="q15"] .btn-stage', '[data-qid="q15"] .stage-now', '[data-qid="q15"] .stat-note']);
  await ctx.close(); await browser.close();
})().catch(e => { console.error('RECON2 FAILED', e.message); process.exit(1); });
