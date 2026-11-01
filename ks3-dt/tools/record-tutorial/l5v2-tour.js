/* J3 L5 V2 SAME LIGHT · gate A2, the tour. At 683, 760, 960, 1366 and 1600 px no tour card's box may
   intersect its target's box, all five cards (V78: card 5 is the Help row). Control (CONTROL=1): at 760 px the card is forced onto its
   target's right edge, and the gate must go RED.
   NODE_PATH=$(npm root -g) node tools/record-tutorial/l5v2-tour.js */
const puppeteer = require('puppeteer');
const { serve } = require('./l5v2-serve');
const PORT = 8782, CONTROL = process.env.CONTROL === '1';
const WIDTHS = [[683, 768], [760, 900], [960, 800], [1366, 768], [1600, 900]];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function click(p, sel, t) { await p.waitForSelector(sel, { visible: true, timeout: t || 8000 }); await p.click(sel); await sleep(120); }
(async () => {
  const srv = await serve(PORT);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const fails = [], errors = []; let checked = 0;
  for (const [W, H] of WIDTHS) for (const mode of ['pair', 'solo']) {
    const room = 'T' + Math.random().toString(36).slice(2, 7).toUpperCase();
    const seats = mode === 'solo' ? ['A'] : ['A', 'B'], pages = [];
    for (const s of seats) {
      const p = await browser.newPage(); await p.setViewport({ width: W, height: H });
      p.on('pageerror', e => errors.push(W + ' ' + s + ': ' + e.message));
      await p.goto(`http://localhost:${PORT}/assets/twolights/hour.html?room=${room}&seat=${s}&mode=${mode}&t=20`, { waitUntil: 'load' });
      pages.push(p);
    }
    for (const p of pages) { await click(p, 'button[data-act="horn"]'); await click(p, 'button[data-act="yes"]'); }
    await sleep(800);
    for (const p of pages) await click(p, 'button[data-act="pair"]', 15000);
    for (const p of pages) {
      try { await click(p, 'button[data-act="cold"]', 20000); }
      catch (e) { throw new Error(W + 'px ' + mode + ': no "Show me around" button; the screen says: ' + (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200)); }
    }
    const p = pages[0];
    for (let i = 0; i < 5; i++) {
      await p.waitForSelector('#tcard button', { visible: true, timeout: 8000 }); await sleep(150);
      const r = await p.evaluate((force) => {
        const ring = document.getElementById('ring').getBoundingClientRect(), c = document.getElementById('tcard');
        const tg = { left: ring.left + 4, top: ring.top + 4, right: ring.right - 4, bottom: ring.bottom - 4 };
        if (force) { c.style.left = (tg.right - 40) + 'px'; c.style.top = tg.top + 'px'; }
        const b = c.getBoundingClientRect();
        const hit = b.left < tg.right && b.right > tg.left && b.top < tg.bottom && b.bottom > tg.top;
        const off = b.left < 0 || b.top < 0 || b.right > innerWidth || b.bottom > innerHeight;
        return { hit, off, b: [b.left, b.top, b.right, b.bottom].map(Math.round), tg: [tg.left, tg.top, tg.right, tg.bottom].map(Math.round) };
      }, CONTROL && W === 760);
      checked++;
      if (r.hit) fails.push(`FAIL ${W}px ${mode} card ${i + 1}: card ${r.b} covers its target ${r.tg}`);
      if (r.off) fails.push(`FAIL ${W}px ${mode} card ${i + 1}: card ${r.b} runs off the screen`);
      for (const q of pages) { await q.waitForSelector('#tcard button', { visible: true, timeout: 8000 }); await q.evaluate(() => document.querySelector('#tcard button').click()); await sleep(120); }   // a DOM click: the control may push the card off the screen
    }
    for (const q of pages) await q.close();
  }
  await browser.close(); srv.close();
  fails.concat(errors.map(e => 'FAIL page error ' + e)).forEach(f => console.log(f));
  const red = fails.length + errors.length;
  console.log(`A2 tour${CONTROL ? ' (CONTROL)' : ''}: ${checked} cards checked at ${WIDTHS.map(w => w[0]).join(', ')} px · ${red ? 'RED ' + red : 'PASS'}`);
  process.exit(red ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(2); });
