/* Probe round 3: (a) reliable sim button-A press (LED state verified from the sim
   frame's DOM); (b) full Download wizard walk with the correct big purple button.
   Screenshots: out/probe3/ */
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = __dirname + '/out/probe3/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('https://makecode.microbit.org/#editor', { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {});
  await sleep(7000);

  // Build the program instantly via Monaco (off-camera technique for chapter setup)
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, .ui.item, [role="button"]'));
    const el = els.find(e => (e.textContent || '').trim() === 'JavaScript');
    if (el) el.click();
  });
  await sleep(2500);
  const ok = await page.evaluate(() => {
    if (!window.monaco || !monaco.editor) return 'no-monaco';
    const m = monaco.editor.getModels().find(x => String(x.uri).indexOf('main.ts') !== -1) || monaco.editor.getModels()[0];
    if (!m) return 'no-model';
    m.setValue('input.onButtonPressed(Button.A, function () {\n    basic.showIcon(IconNames.Heart)\n})\n');
    return 'ok';
  });
  console.log('monaco set:', ok);
  await sleep(1200);
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, .ui.item, [role="button"]'));
    const el = els.find(e => (e.textContent || '').trim() === 'Blocks');
    if (el) el.click();
  });
  await sleep(3500);

  // ---- LED state helper (reads the sim frame's LED elements)
  const simFrame = () => page.frames().find(f => /---simulator/i.test(f.url()));
  async function ledState() {
    const f = simFrame();
    if (!f) return 'NO SIM FRAME';
    return f.evaluate(() => {
      const leds = Array.from(document.querySelectorAll('.sim-led, [class*="sim-led"]'));
      if (!leds.length) return 'NO LED ELEMENTS';
      const on = leds.filter(l => {
        const op = parseFloat(getComputedStyle(l).opacity || '0');
        const fill = getComputedStyle(l).fill || '';
        return op > 0.4 && fill !== 'none';
      });
      return { total: leds.length, on: on.length };
    }).catch(e => 'EVAL FAIL ' + e.message);
  }
  console.log('LED before press:', JSON.stringify(await ledState()));

  // ---- press button A firmly: mousedown, hold, mouseup at the sim's A button
  const f = simFrame();
  const aBtn = await f.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.sim-button-group'));
    for (const e of els) {
      if ((e.getAttribute('aria-label') || '') === 'A') {
        const b = e.getBoundingClientRect();
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      }
    }
    return null;
  });
  const iframeEl = await page.$('iframe[src*="sim"]');
  const box = await iframeEl.boundingBox();
  const px = box.x + aBtn.x, py = box.y + aBtn.y;
  console.log('pressing A at page coords', px, py);
  await page.mouse.move(px, py);
  await page.mouse.down();
  await sleep(350);
  await page.mouse.up();
  await sleep(1200);
  console.log('LED after press:', JSON.stringify(await ledState()));
  await page.screenshot({ path: OUT + '01-after-A.png' });

  // ---- Download wizard: the big purple button (w>100, visible)
  const dl = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (const el of els) {
      if (!/download/i.test(el.textContent || '')) continue;
      if (el.offsetParent === null) continue;
      const b = el.getBoundingClientRect();
      if (b.width > 100) return { x: b.x + b.width / 2, y: b.y + b.height / 2, text: (el.textContent || '').trim() };
    }
    return null;
  });
  console.log('DL BUTTON:', JSON.stringify(dl));
  const dlEvents = [];
  page.on('download', d => dlEvents.push(d.suggestedFilename()));
  await page.mouse.click(dl.x, dl.y);
  await sleep(3000);
  for (let step = 1; step <= 7; step++) {
    const modal = await page.evaluate(() => {
      const m = Array.from(document.querySelectorAll('.ui.modal, [role="dialog"]')).find(x => x.offsetParent !== null);
      if (!m) return null;
      const btns = Array.from(m.querySelectorAll('button, .button, a')).filter(b => b.offsetParent !== null).map(b => {
        const r = b.getBoundingClientRect();
        return { text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60), aria: (b.getAttribute('aria-label') || '').slice(0, 50), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width) };
      }).filter(b => b.w > 0);
      const body = (m.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 260);
      return { body, btns };
    });
    console.log('WIZARD ' + step + ':', JSON.stringify(modal, null, 1));
    await page.screenshot({ path: OUT + '10-wizard-' + step + '.png' });
    if (!modal) { console.log('modal gone at step', step); break; }
    const next = modal.btns.find(b => /next|done|got it|^ok/i.test(b.text + ' ' + b.aria));
    if (!next) { console.log('no forward button'); break; }
    await page.mouse.click(next.x, next.y);
    await sleep(2500);
  }
  console.log('DOWNLOAD EVENTS:', JSON.stringify(dlEvents));
  await browser.close();
  console.log('PROBE3 DONE');
})().catch(e => { console.error('PROBE3 FAILED:', e.message); process.exit(1); });
