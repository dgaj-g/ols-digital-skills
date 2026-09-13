/* recon.js — photograph every screen the film will visit, at film size, and
   measure the controls a caption will ring. Nothing here is filmed. */
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const fs = require('fs');
const OUT = process.argv[2] || 'out/recon';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8099/maths/mathshelf/index.html';
const LIVE = 'https://script.google.com/a/macros/c2ken.net/s/AKfycbzUZ3bDjcFas_zQ02VrJQCEkPQgEjs3Re4JZ1OQtLACa090AC1B0Md2yUkL4aX81LwP/exec';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function rects(page, sels) {
  return page.evaluate((sels) => {
    const out = {};
    sels.forEach(s => {
      const n = document.querySelector(s);
      if (!n) { out[s] = null; return; }
      const r = n.getBoundingClientRect();
      out[s] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), text: (n.textContent || '').trim().slice(0, 60) };
    });
    out.__docH = document.documentElement.scrollHeight; out.__scrollY = window.scrollY;
    return out;
  }, sels);
}
async function shot(page, name, sels) {
  await sleep(600);
  await page.screenshot({ path: OUT + '/' + name + '.png' });
  const r = await rects(page, sels || []);
  console.log('== ' + name + ' ' + JSON.stringify(r));
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript((live) => { window.OLS_BOOT_BASEURL = live; }, LIVE);
  const page = await ctx.newPage();
  page.on('console', m => { if (/error/i.test(m.type())) console.log('  console.' + m.type() + ': ' + m.text().slice(0, 120)); });
  // ---- teacher side ----
  await page.goto(BASE + '?nointro', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await shot(page, 't0-cover', ['#scr-cover', '#cover-open', '#cover-staff', '#cover-msg', '#cover-welcome', '.gj-wordmark']);
  await page.click('#cover-staff'); await sleep(900);
  await shot(page, 't1-staffcover', ['#cover-staffbox', '#st-pass', '#st-go', '#st-msg', '#cover-pass']);
  await page.fill('#cover-pass', 'demo'); await sleep(300);
  await page.click('#cover-open'); await sleep(2000);
  await shot(page, 't2-setup', ['#scr-staff', '.staff-topbar', '.staff-crumb', '#st-newclass', '#st-add', '#st-cmsg', '.ledger', '.ledger-host', '#st-rows tr:nth-child(1)', '#st-rows tr:nth-child(2)', '#st-rows tr:nth-child(1) .tickbox', '#st-rows tr:nth-child(1) .ticks-group', '#st-rows tr:nth-child(1) td.row-acts', '#st-rows tr:nth-child(1) .row-acts-main button', '#st-rows tr:nth-child(1) .row-acts-more button', '.toolbtn']);
  // add a class
  await page.fill('#st-newclass', '10E-Maths'); await sleep(300);
  await page.click('#st-add'); await sleep(1500);
  await shot(page, 't3-setup-added', ['#st-cmsg', '#st-rows tr:last-child', '#st-rows tr:last-child .tickbox', '#st-rows tr:last-child .tickbox input', '#st-rows tr:last-child td.row-acts']);
  // tick a book on the new class (the first Handling Data box)
  const tick = await page.$('#st-rows tr:last-child .tickbox input');
  if (tick) { await tick.click(); await sleep(1200); }
  await shot(page, 't4-setup-ticked', ['#st-cmsg', '#st-rows tr:last-child .tickbox:nth-child(2)']);
  // open the markbook of the demo class (the one with pupils)
  await page.evaluate(() => { const rows = [...document.querySelectorAll('#st-rows tr')]; const r = rows.find(tr => /10B Maths/.test(tr.textContent)); const b = [...r.querySelectorAll('button')].find(b => /Open the markbook/.test(b.textContent)); b.click(); });
  await sleep(2500);
  await shot(page, 't5-classpage', ['.staff-crumb', '.cp-books', '.cp-books .toolbtn', '.needs-row, .needs-none', '.toolrow', '.ex-card, .cp-ex', '#scr-staff .staff-main']);
  await page.evaluate(() => window.scrollTo(0, 400)); await sleep(500);
  await shot(page, 't5b-classpage-scrolled', ['.toolrow']);
  await page.evaluate(() => window.scrollTo(0, 0));
  // switch to the Averages book tab
  await page.evaluate(() => { const b = [...document.querySelectorAll('.cp-books .toolbtn')].find(b => /Averages/.test(b.textContent)); if (b) b.click(); });
  await sleep(2500);
  await shot(page, 't6-classpage-averages', ['.cp-books', '.needs-row, .needs-none', '.ex-card, .cp-ex']);
  // open the first exercise card
  const exCard = await page.$('.ex-card, .cp-ex, [data-ex]');
  if (exCard) { await exCard.click(); await sleep(2500); await shot(page, 't7-exercise', ['.staff-crumb', 'table', '.wall', '.staff-main']); }
  await ctx.close();
  // ---- pupil side (fresh context, same origin store already has the tick? no: localStorage is per context) ----
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '?class=10B%20Maths%20(demo)&nointro', { waitUntil: 'domcontentloaded' });
  await p2.evaluate(() => localStorage.clear());
  await p2.reload({ waitUntil: 'domcontentloaded' }); await sleep(1500);
  await shot(p2, 'p0-cover', ['#cover-welcome', '#cover-name-out', '#cover-open', '#cover-msg', '#cover-first']);
  await p2.click('#cover-open'); await sleep(2000);
  await shot(p2, 'p1-shelf', ['#scr-shelf', '#shelf-greeting', '#shelf-instruction', '#shelf-note', '#shelf-tiles', '.book', '.book:nth-child(2)', '.book:nth-child(3)', '.book:nth-child(4)', '.book:nth-child(5)']);
  await p2.click('.book[data-book="stats-averages"]'); await sleep(2500);
  await shot(p2, 'p2-bookB-contents', ['#act-title', '#act-eyebrow', '#act-back', '#act-contents', '#act-contents button', '#act-main', '.contents-chip']);
  await p2.evaluate(() => document.querySelectorAll('#act-contents button')[0].click()); await sleep(2500);
  await shot(p2, 'p3-bookB-ex1', ['.movie, [data-surface="movie"]', '.mc-play, .movie button', '[data-surface="question"]', '.jq-prompt', '.stat-slots', '.stat-cell', '.dock', '.btn-stamp', '.stage-strip', '.stat-msg, .ui-msg.stage-now', '.mk-tally']);
  await p2.evaluate(() => window.scrollTo(0, 500)); await sleep(500);
  await shot(p2, 'p3b-bookB-ex1-scrolled', ['[data-surface="question"]', '.stat-slots', '.stat-cell', '.dock', '.btn-stamp', '.stat-msg']);
  await p2.evaluate(() => { const c = document.querySelector('.stat-cell'); if (c) c.click(); }); await sleep(900);
  await shot(p2, 'p4-bookB-ex1-pad', ['.numpad', '.numpad button', '.dock', '.stat-cell', '.btn-stamp']);
  await ctx2.close();
  await browser.close();
})().catch(e => { console.error('RECON FAILED', e); process.exit(1); });
