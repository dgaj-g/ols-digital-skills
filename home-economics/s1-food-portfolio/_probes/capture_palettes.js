// Captures welcome / home / focus step for each preview palette, then a contact sheet.
const puppeteer = require('puppeteer'); const sharp = require('sharp'); const path = require('path');
const OUT = process.argv[2]; const BASE = 'http://127.0.0.1:8112/home-economics/s1-food-portfolio/';
const NAMES = { a: 'Sea Glass', b: 'Lavender Mist', c: 'Blush & Stone' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const br = await puppeteer.launch({ headless: 'new' }); const shots = [];
  for (const p of ['a', 'b', 'c']) {
    const pg = await br.newPage(); await pg.setViewport({ width: 1100, height: 760 });
    await pg.evaluateOnNewDocument(() => { try { sessionStorage.setItem('ols-intro-seen-v1', '1'); } catch (e) {} });
    await pg.goto(BASE + '?reset&year=J3&palette=' + p, { waitUntil: 'networkidle0' }); await sleep(2500);
    const w = path.join(OUT, `pal-${p}-1welcome.png`); await pg.screenshot({ path: w }); shots.push(w);
    await pg.type('#kp-name', 'Aoife Murphy'); await pg.click('#welcome-start'); await sleep(1800);
    const h = path.join(OUT, `pal-${p}-2home.png`); await pg.screenshot({ path: h }); shots.push(h);
    await pg.click('#new-entry'); await sleep(800); await pg.type('#dish-name', 'Chicken and vegetable pasta bake');
    await pg.click('#wiz-next'); await sleep(900);
    await pg.evaluate(() => { const c = document.querySelectorAll('#focus-chips > *'); [0, 3].forEach(i => c[i] && c[i].click()); }); await sleep(900);
    const f = path.join(OUT, `pal-${p}-3focus.png`); await pg.screenshot({ path: f }); shots.push(f);
    await pg.close();
  }
  await br.close();
  const W = 550, H = 380, pad = 16, lab = 34;
  const comps = []; const rows = ['a', 'b', 'c'];
  for (let r = 0; r < 3; r++) {
    const svg = Buffer.from(`<svg width="${3 * W + 4 * pad}" height="${lab}"><text x="${pad}" y="24" font-family="Helvetica" font-size="22" font-weight="700" fill="#222">${r + 1}. ${NAMES[rows[r]].replace('&', '&amp;')}</text></svg>`);
    comps.push({ input: svg, left: 0, top: r * (H + lab + pad) + pad });
    for (let c = 0; c < 3; c++) {
      const buf = await sharp(shots[r * 3 + c]).resize(W, H).toBuffer();
      comps.push({ input: buf, left: pad + c * (W + pad), top: r * (H + lab + pad) + pad + lab });
    }
  }
  await sharp({ create: { width: 3 * W + 4 * pad, height: 3 * (H + lab + pad) + pad, channels: 3, background: '#ffffff' } })
    .composite(comps).png().toFile(path.join(OUT, 'S1_palette_choices.png'));
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
