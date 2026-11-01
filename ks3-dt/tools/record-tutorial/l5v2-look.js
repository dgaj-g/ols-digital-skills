/* J3 L5 V78 · the look: screenshots of Help and the partner signals at a real laptop and a small screen, both roles.
   Tour card 5; Point (Help pulsing, "Stuck? Press Help."); the Reader after "I'm stuck"; the sender after OK;
   the Fixer after "Show where". Also measures whether the message bar moves the code (it must not jump).
   The message lies over the job line: it must not move or cover the code, and the Reader's message after "I'm stuck" carries
   its own Help button, on screen at 683, which opens Help in view and clears the message.
   Control (CONTROL=1): the message put back in the flow (position:static) must turn this red.
   NODE_PATH=$(npm root -g) node tools/record-tutorial/l5v2-look.js [--port=8840]   → out/l5v2-look/*.png */
const puppeteer = require('puppeteer'), path = require('path'), fs = require('fs');
const { serve } = require('./l5v2-serve'), { drive } = require('./l5v2-drive');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const PORT = +arg('port', 8840), OUT = path.join(__dirname, 'out', 'l5v2-look' + (process.env.CONTROL === '1' ? '-control' : '')); fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const notes = [], fails = [], CONTROL = process.env.CONTROL === '1';
async function tour(browser, W, H) {
  const room = 'K' + Math.random().toString(36).slice(2, 7).toUpperCase(), pages = [];
  for (const s of ['A', 'B']) { const p = await browser.newPage(); await p.setViewport({ width: W, height: H });
    await p.goto(`http://localhost:${PORT}/assets/twolights/hour.html?room=${room}&seat=${s}&mode=pair&t=20`, { waitUntil: 'load' }); pages.push(p); }
  const click = async (p, sel, t) => { await p.waitForSelector(sel, { visible: true, timeout: t || 15000 }); await p.click(sel); await sleep(150); };
  for (const p of pages) { await click(p, 'button[data-act="horn"]'); await click(p, 'button[data-act="yes"]'); }
  await sleep(800); for (const p of pages) await click(p, 'button[data-act="pair"]');
  for (const p of pages) await click(p, 'button[data-act="cold"]', 20000);
  for (let i = 0; i < 4; i++) for (const q of pages) { await q.waitForSelector('#tcard button', { visible: true }); await q.evaluate(() => document.querySelector('#tcard button').click()); await sleep(150); }
  await sleep(400); await pages[0].screenshot({ path: path.join(OUT, `${W}-tour5.png`) });
  notes.push(W + ' tour card 5: ' + (await pages[0].evaluate(() => document.getElementById('tcard').innerText.replace(/\s+/g, ' '))));
  for (const p of pages) await p.close();
}
async function run(browser, W, H) {
  const room = 'L' + Math.random().toString(36).slice(2, 7).toUpperCase(), pages = {}, SEATS = ['A', 'B'];
  for (const s of SEATS) { const p = await browser.newPage(); await p.setViewport({ width: W, height: H });
    p.on('pageerror', e => fails.push(W + ' ' + s + ' page error: ' + e.message));
    await p.goto(`http://localhost:${PORT}/assets/twolights/hour.html?room=${room}&seat=${s}&mode=pair&t=20`, { waitUntil: 'load' }); pages[s] = p;
    if (CONTROL) await p.addStyleTag({ content: '#sig{position:static!important}' }); }
  const done = {};
  const shotBoth = async tag => { for (const s of SEATS) await pages[s].screenshot({ path: path.join(OUT, `${W}-${tag}-${s}.png`) }); };
  const box = (s, sel) => pages[s].evaluate(q => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height), vis: r.width > 0 && r.height > 0 }; }, sel);
  const txt = (s, sel) => pages[s].evaluate(q => { const e = document.querySelector(q); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }, sel);
  const look = async (step, f) => {
    const key = f.no + step; if (f.no !== 1 || done[key]) return false; done[key] = 1;
    const fx = f.fixer, rd = f.readers[0];
    if (step === 'point') {
      await sleep(300); await shotBoth('a-point');
      notes.push(`${W} point: Fixer sees "${await txt(fx, '#helpgo')}" · Reader sees "${await txt(rd, '#helpgo')}"`);
      const before = await box(rd, '#view');
      await pages[fx].click('#sigbtn'); await sleep(600); await shotBoth('b-stuck');
      const after = await box(rd, '#view');
      notes.push(`${W} after I'm stuck: Reader bar "${await txt(rd, '#sig')}" · Fixer button "${await txt(fx, '#sigbtn')}" · Reader Help urgent ${await pages[rd].evaluate(() => document.getElementById('helpbtn').classList.contains('urgent'))}`);
      notes.push(`${W} the Reader's code moved ${after.top - before.top}px when the bar came`);
      if (Math.abs(after.top - before.top) > 2) fails.push(`${W}: the message bar moves the Reader's code by ${after.top - before.top}px`);
      const bar = await box(rd, '#sig'), code = await box(rd, '#code'), hb = await box(rd, '#sig button.sighelp');
      if (bar && code && bar.top + bar.h > code.top + 1) fails.push(`${W}: the message bar covers the Reader's code (bar ends ${bar.top + bar.h}, code starts ${code.top})`);
      if (!hb || !hb.vis || hb.top + hb.h > H) fails.push(`${W}: the Reader's message has no Help button on screen ${JSON.stringify(hb)}`);
      await pages[rd].click('#sig button[data-act="sigok"]'); await sleep(500); await shotBoth('d-saw');
      notes.push(`${W} after OK: Fixer sees "${await txt(fx, '#sig')}" / button "${await txt(fx, '#sigbtn')}"`);
      // Help pressed from inside the message: Help opens where the Reader can see it, and the message goes
      await sleep(3200); await pages[fx].click('#sigbtn'); await sleep(600);
      if (await box(rd, '#sig button.sighelp')) { await pages[rd].click('#sig button.sighelp'); await sleep(1200); }
      else fails.push(`${W}: no Help button in the second "I'm stuck" message`);
      const hp = await box(rd, '#help'), gone = await pages[rd].evaluate(() => document.getElementById('sig').classList.contains('hide'));
      await shotBoth('e-help');
      notes.push(`${W} Help from the message: help box ${JSON.stringify(hp)} · message gone ${gone}`);
      if (!hp || !hp.vis || hp.top < 0 || hp.top + 40 > H) fails.push(`${W}: Help from the message did not open in view ${JSON.stringify(hp)}`);
      if (!gone) fails.push(`${W}: the message stayed after Help was pressed in it`);
      return false;
    }
    if (step === 'fix') {
      await sleep(300); const before = await box(fx, '#view');
      await pages[rd].click('#sigbtn'); await sleep(600); await shotBoth('c-where');
      const after = await box(fx, '#view');
      notes.push(`${W} after Show where: Fixer bar "${await txt(fx, '#sig')}" · Fixer's code moved ${after.top - before.top}px`);
      if (Math.abs(after.top - before.top) > 2) fails.push(`${W}: the message bar moves the Fixer's code by ${after.top - before.top}px`);
      return false;
    }
    return false;
  };
  const log = () => {};
  await drive(pages, { SEATS, PATH: 'right', RELOAD: false, CONTROL: false, MODE: 'pair', W, SHOTS: '', fails, log, sleep, look, stopAfter: 'ch1' }).catch(e => { if (!/stop/.test(e.message)) fails.push(W + ' drive: ' + e.message.slice(0, 160)); });
  for (const s of SEATS) await pages[s].close();
}
(async () => {
  const srv = await serve(PORT);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  for (const [W, H] of [[683, 768], [1366, 768]]) { await tour(browser, W, H); await run(browser, W, H); }
  await browser.close(); srv.close();
  notes.forEach(n => console.log(n)); fails.forEach(f => console.log('FAIL ' + f));
  console.log('l5v2-look' + (CONTROL ? ' (CONTROL)' : '') + ': ' + (fails.length ? 'RED ' + fails.length : 'PASS') + ' · shots in ' + OUT);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(2); });
