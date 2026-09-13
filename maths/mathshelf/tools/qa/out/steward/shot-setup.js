/* after-pictures of set-up:classes on the preview at four widths (the steward
   cut, 13 Sept 2026). Same script as the before-pictures, pointed at the row's
   own cell class and writing setup-after-<w>.png. */
const puppeteer = require('puppeteer');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  for (const w of (process.argv[3] ? process.argv[3].split(',').map(Number) : [1448, 1280, 768, 375])) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
    await p.goto('http://localhost:8099/maths/mathshelf/index.html?class=demo&nointro', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => localStorage.clear());
    await p.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));
    await p.waitForFunction(() => !!document.getElementById('cover-staff'), { timeout: 20000 });
    await p.evaluate(() => document.getElementById('cover-staff').click());
    await p.waitForFunction(() => !!document.querySelector('#st-pass') && !!document.querySelector('#st-go'), { timeout: 20000 });
    await p.evaluate(() => { const i = document.querySelector('#st-pass'); i.value = 'demo'; document.querySelector('#st-go').click(); });
    await new Promise(r => setTimeout(r, 1500));
    const info = await p.evaluate(() => ({
      surface: document.getElementById('scr-staff').getAttribute('data-surface'),
      state: document.getElementById('scr-staff').getAttribute('data-state'),
      crumb: (document.querySelector('.staff-crumb') || {}).textContent,
      labels: [...document.querySelectorAll('.tickbox')].map(l => l.textContent.trim()),
      series: [...document.querySelectorAll('.ticks-series')].map(e => e.textContent.trim()),
      rows: [...document.querySelectorAll('#st-rows tr')].map(tr => {
        const tds = tr.querySelectorAll('td');
        const cell = tr.querySelector('td.row-acts') || tds[tds.length - 1];
        const cr = cell.getBoundingClientRect();
        return { name: tds[0].textContent.trim(), cellW: Math.round(cr.width), ticksW: Math.round(tds[2].getBoundingClientRect().width),
          buttons: [...cell.querySelectorAll('button')].map(bt => { const r = bt.getBoundingClientRect(); return { t: bt.textContent.trim(), x: Math.round(r.left - cr.left), y: Math.round(r.top - cr.top), w: Math.round(r.width), h: Math.round(r.height), lines: (() => { const rg = document.createRange(); rg.selectNodeContents(bt); return rg.getClientRects().length; })() }; }) };
      }),
      docW: document.documentElement.scrollWidth, winW: window.innerWidth,
      host: (() => { const h = document.querySelector('.ledger-host'); return h ? { sw: h.scrollWidth, cw: h.clientWidth } : null; })(),
      hint: (() => { const p2 = document.querySelector('.ledger-scroll-hint'); return p2 ? { text: p2.textContent.trim(), shown: p2.offsetParent !== null } : null; })()
    }));
    console.log(w, JSON.stringify(info));
    await p.screenshot({ path: OUT + '/setup-after-' + w + '.png', fullPage: false });
    await p.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
