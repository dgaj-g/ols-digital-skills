const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const F = require('./lib/film');
const C = require('./scenes/chapters');
const sleep = F.sleep;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await F.boot(page, '?nointro'); await C.ensureFilmClass(page);
  await F.boot(page, '?class=' + encodeURIComponent(F.FILM_CLASS) + '&nointro'); await F.namePupil(page); await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(1200);
  await F.pupilIn(page);
  console.log('shelf books:', await page.evaluate(() => [...document.querySelectorAll('.book')].map(b => b.getAttribute('data-book'))));
  await page.evaluate(() => document.querySelector('.book[data-book="stats-averages"]').click()); await sleep(2000);
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[0].click()); await sleep(2000);
  const q = '[data-surface="question"][data-qid="q2"]';
  await page.evaluate((s) => document.querySelector(s + ' .stat-cell').click(), q); await sleep(400);
  console.log('pad + next:', await page.evaluate((s) => { const r = document.querySelector(s); const next = [...r.querySelectorAll('button')].filter(b => /next/.test(b.textContent)).map(b => b.className); return { padButtons: r.querySelectorAll('.numpad button').length, nextClasses: next }; }, q));
  // wrong attempt on q2 via the pad
  const press = async (t) => { await page.evaluate(([s, tt]) => { const b = [...document.querySelectorAll(s + ' .numpad button')].find(b => b.textContent.trim() === tt); b.click(); }, [q, t]); await sleep(120); };
  const next = async () => { await page.evaluate((s) => { const b = [...document.querySelectorAll(s + ' button')].find(b => /next/.test(b.textContent)); b.click(); }, q); await sleep(200); };
  for (const [v, n] of [['9', 1], ['7', 1], ['7', 1], ['18', 0]]) { for (const ch of v) await press(ch); if (n) await next(); }
  await page.evaluate((s) => document.querySelector(s + ' .btn-stamp').click(), q); await sleep(3500);
  console.log('after wrong mark:', await page.evaluate((s) => { const r = document.querySelector(s); return { state: r.getAttribute('data-state'), msg: (r.querySelector('.stat-msg') || {}).textContent, cells: [...r.querySelectorAll('.stat-cell')].map(c => ({ cls: c.className, dis: c.disabled, txt: c.textContent.trim() })), slotsBlocks: r.querySelectorAll('.stat-slots').length, feedback: (r.querySelector('.jq-feedback') || {}).textContent }; }, q));
  // judge trays
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[4].click()); await sleep(2000);
  console.log('judge trays q28:', await page.evaluate(() => { const r = document.querySelector('[data-qid="q28"]'); return [...r.querySelectorAll('[data-tray]')].map(t => ({ tray: t.getAttribute('data-tray'), items: [...t.querySelectorAll('[data-tray-item]')].map(i => i.textContent.trim()) })); }));
  // rowpicks q20
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[3].click()); await sleep(2000);
  console.log('rowpicks q20:', await page.evaluate(() => { const r = document.querySelector('[data-qid="q20"]'); return [...r.querySelectorAll('.stat-rowpick')].slice(0, 6).map(b => ({ ask: b.getAttribute('data-ask'), row: b.getAttribute('data-row'), t: b.textContent.trim() })); }));
  // saving line: after a mark with the slow save
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[1].click()); await sleep(2000);
  await F.slowSaves(page, 3200);
  const q8 = '[data-surface="question"][data-qid="q8"]';
  await page.evaluate((s) => document.querySelector(s + ' .stat-cell').click(), q8); await sleep(300);
  for (const [v, n] of [['16', 1], ['7', 0]]) { for (const ch of v) { await page.evaluate(([s, tt]) => { const b = [...document.querySelectorAll(s + ' .numpad button')].find(b => b.textContent.trim() === tt); b.click(); }, [q8, ch]); await sleep(100); } if (n) { await page.evaluate((s) => { const b = [...document.querySelectorAll(s + ' button')].find(b => /next/.test(b.textContent)); b.click(); }, q8); await sleep(200); } }
  await page.evaluate((s) => document.querySelector(s + ' .btn-stamp').click(), q8); await sleep(900);
  console.log('saving line at 0.9s:', await page.evaluate(() => { const l = document.getElementById('act-saving'); return l ? { text: l.textContent, rect: l.getBoundingClientRect().toJSON() } : null; }));
  await sleep(3500);
  console.log('saving line at 4.4s:', await page.evaluate(() => !!document.getElementById('act-saving')));
  // Book C graph: board client coords for q12
  await page.evaluate(() => document.getElementById('act-back').click()); await sleep(1500);
  await page.evaluate(() => document.querySelector('.book[data-book="stats-quartiles"]').click()); await sleep(2000);
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[2].click()); await sleep(2000);
  console.log('board client (5,18):', await F.boardClient(page, '[data-surface="question"][data-qid="q12"]', 5, 18));
  await page.evaluate(() => document.querySelectorAll('#act-contents button')[3].click()); await sleep(2000);
  console.log('nudge buttons q15:', await page.evaluate(() => [...document.querySelectorAll('[data-qid="q15"] .nudge-pad button')].map(b => b.textContent.trim())));
  // teacher side selectors
  await F.boot(page, '?nointro'); await F.staffIn(page);
  console.log('setup selectors:', await page.evaluate(() => ({ scope: !!document.querySelector('.staff-main .ui-msg'), scopeText: (document.querySelector('.staff-main .ui-msg') || {}).textContent.slice(0, 60), rowLabels: [...document.querySelector('#st-rows tr:last-child').querySelectorAll('.ticks-group')].map(g => [...g.querySelectorAll('.tickbox')].map(l => l.textContent.trim().slice(0, 30))) })));
  await page.evaluate((nm) => { const rows = [...document.querySelectorAll('#st-rows tr')]; const r = rows.find(tr => tr.textContent.indexOf(nm) > -1); [...r.querySelectorAll('button')].find(b => /Open the markbook/.test(b.textContent)).click(); }, F.PRACTICE_CLASS); await sleep(2800);
  console.log('class page:', await page.evaluate(() => ({ strip: !!document.querySelector('.cp-strip'), needs: !!document.querySelector('.needs'), excards: document.querySelectorAll('.excard').length, crumbs: [...document.querySelectorAll('.staff-crumb .crumb-link, .staff-crumb .crumb-here')].map(c => c.textContent) })));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.cp-books .toolbtn')].find(b => /Averages/.test(b.textContent)); b.click(); }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.excard').click()); await sleep(2500);
  console.log('exercise view:', await page.evaluate(() => ({ grid: !!document.querySelector('.grid.staff-panel'), cells: document.querySelectorAll('.grid.staff-panel td.cell').length, redCell: !!document.querySelector('.grid.staff-panel td.cell .g-err, .grid.staff-panel td.cell.g-err'), crumbs: [...document.querySelectorAll('.staff-crumb .crumb-link, .staff-crumb .crumb-here')].map(c => c.textContent) })));
  await page.evaluate(() => document.querySelector('.grid.staff-panel td.cell').click()); await sleep(2800);
  console.log('book view:', await page.evaluate(() => ({ jotter: !!document.querySelector('.jotter'), q: !!document.querySelector('.jotter [data-surface="question"], .jotter .jotter-q'), reteach: !!document.querySelector('.jp-reteach'), ink: !!document.querySelector('.ic-tick'), crumbs: [...document.querySelectorAll('.staff-crumb .crumb-link, .staff-crumb .crumb-here')].map(c => c.textContent), surface: document.getElementById('scr-staff').getAttribute('data-surface') })));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
