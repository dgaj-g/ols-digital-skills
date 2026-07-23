/* Probe round 2: (a) nest "show icon" inside "on button A pressed" using the real
   canvas rect; (b) press simulator button A (broad sim-frame dump first);
   (c) walk the whole Download wizard capturing each step. Screenshots: out/probe2/ */
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = __dirname + '/out/probe2/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const CLEAN = '.replace(/[\\u200B-\\u200D\\uFEFF\\u00A0]/g, " ").replace(/\\s+/g, " ").trim()';

async function catRect(page, name) {
  return page.evaluate((name) => {
    const rows = Array.from(document.querySelectorAll('[role="treeitem"], .blocklyTreeRow'));
    const r = rows.find(el => el.textContent.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').indexOf(name) !== -1 && el.getBoundingClientRect().width > 50);
    if (!r) return null;
    const b = r.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, name);
}
async function flyoutBlock(page, rx) {
  return page.evaluate((rxSrc) => {
    const rx = new RegExp(rxSrc, 'i');
    const g = Array.from(document.querySelectorAll('.blocklyFlyout g.blocklyDraggable[data-id]'));
    for (const el of g) {
      const text = Array.from(el.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' ')
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
      if (rx.test(text)) {
        const b = el.getBoundingClientRect();
        return { text, x: b.x, y: b.y, w: b.width, h: b.height };
      }
    }
    return null;
  }, rx);
}
async function canvasBlocks(page) {
  return page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('.blocklyBlockCanvas > g.blocklyDraggable'));
    return c.map(el => {
      const b = el.getBoundingClientRect();
      const text = Array.from(el.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' ')
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
      return { text: text.slice(0, 60), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    }).filter(b => b.w > 10);
  });
}
async function slowDrag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await sleep(180);
  for (let i = 1; i <= 30; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * i / 30, from.y + (to.y - from.y) * i / 30);
    await sleep(16);
  }
  await sleep(250);
  await page.mouse.up();
  await sleep(1200);
}
async function readTS(page) {
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, .ui.item, [role="button"]'));
    const el = els.find(e => (e.textContent || '').trim() === 'JavaScript');
    if (el) el.click();
  });
  await sleep(3000);
  const code = await page.evaluate(() => {
    if (!window.monaco || !monaco.editor) return 'NO MONACO';
    const m = monaco.editor.getModels().find(x => String(x.uri).indexOf('main.ts') !== -1) || monaco.editor.getModels()[0];
    return m ? m.getValue() : 'NO MODEL';
  });
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, .ui.item, [role="button"]'));
    const el = els.find(e => (e.textContent || '').trim() === 'Blocks');
    if (el) el.click();
  });
  await sleep(2500);
  return code;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('https://makecode.microbit.org/#editor', { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {});
  await sleep(7000);

  // ---- build: on button A pressed, then show icon nested inside
  const inputCat = await catRect(page, 'Input');
  await page.mouse.click(inputCat.x, inputCat.y);
  await sleep(1400);
  const onBtn = await flyoutBlock(page, 'on button A pressed');
  await slowDrag(page, { x: onBtn.x + 60, y: onBtn.y + 20 }, { x: 780, y: 420 });
  let canvas = await canvasBlocks(page);
  console.log('CANVAS 1:', JSON.stringify(canvas));

  const target = canvas.find(b => /on button/i.test(b.text));
  const basicCat = await catRect(page, 'Basic');
  await page.mouse.click(basicCat.x, basicCat.y);
  await sleep(1400);
  const showIcon = await flyoutBlock(page, 'show icon');
  console.log('SHOW ICON IN FLYOUT:', JSON.stringify(showIcon));
  // drop into the C-mouth: x just inside the left edge + a bit, y at the lower half
  await slowDrag(page, { x: showIcon.x + 50, y: showIcon.y + 18 },
    { x: target.x + 70, y: target.y + target.h - 18 });
  canvas = await canvasBlocks(page);
  console.log('CANVAS 2:', JSON.stringify(canvas));
  await page.screenshot({ path: OUT + '01-nested.png' });
  const code1 = await readTS(page);
  console.log('READ-BACK 1:\n' + code1);

  // ---- simulator: broad dump of the sim frame's interactive elements
  const simFrame = page.frames().find(f => /sim/i.test(f.url()));
  console.log('SIM FRAME URL:', simFrame ? simFrame.url() : 'NONE');
  if (simFrame) {
    const dump = await simFrame.evaluate(() => {
      const out = [];
      const els = Array.from(document.querySelectorAll('*'));
      for (const e of els) {
        const cls = String(e.getAttribute && (e.getAttribute('class') || '')) ;
        const aria = (e.getAttribute && (e.getAttribute('aria-label') || '')) || '';
        const id = e.id || '';
        if (/button|btn/i.test(cls + ' ' + aria + ' ' + id)) {
          const b = e.getBoundingClientRect();
          if (b.width > 4) out.push({ tag: e.tagName, id, cls: cls.slice(0, 40), aria: aria.slice(0, 40), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) });
        }
      }
      return out.slice(0, 40);
    }).catch(e => 'EVAL FAIL ' + e.message);
    console.log('SIM INTERACTIVE:', JSON.stringify(dump, null, 1));

    // press A: find best candidate (aria mentions A) and click via page coords
    if (Array.isArray(dump)) {
      const a = dump.find(d => /\bA\b/i.test(d.aria)) || dump.find(d => /BTN_A/i.test(d.id));
      const iframeEl = await page.$('iframe[src*="sim"]');
      const box = iframeEl ? await iframeEl.boundingBox() : null;
      console.log('PRESS TARGET:', JSON.stringify(a), 'IFRAME AT:', JSON.stringify(box));
      if (a && box) {
        await page.mouse.click(box.x + a.x + a.w / 2, box.y + a.y + a.h / 2);
        await sleep(900);
        await page.screenshot({ path: OUT + '02-sim-pressed.png' });
      }
    }
  }

  // ---- Download wizard walk
  const dl = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, [role="button"]'));
    const el = els.find(e => /download/i.test((e.textContent || '')));
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  const dlEvents = [];
  page.on('download', d => dlEvents.push(d.suggestedFilename()));
  await page.mouse.click(dl.x, dl.y);
  await sleep(2500);
  for (let step = 1; step <= 6; step++) {
    const modal = await page.evaluate(() => {
      const m = document.querySelector('.ui.modal, [role="dialog"]');
      if (!m || m.offsetParent === null) return null;
      const btns = Array.from(m.querySelectorAll('button, .button, a')).filter(b => b.offsetParent !== null).map(b => {
        const r = b.getBoundingClientRect();
        return { text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50), aria: (b.getAttribute('aria-label') || '').slice(0, 40), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width) };
      }).filter(b => b.w > 0);
      return { heading: ((m.querySelector('.header, h1, h2, h3') || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90), btns };
    });
    console.log('WIZARD STEP ' + step + ':', JSON.stringify(modal, null, 1));
    await page.screenshot({ path: OUT + '10-wizard-' + step + '.png' });
    if (!modal) break;
    const next = modal.btns.find(b => /next|done|got it/i.test(b.text + b.aria));
    if (!next) { console.log('no next/done button — stopping'); break; }
    await page.mouse.click(next.x, next.y);
    await sleep(2200);
  }
  console.log('DOWNLOAD EVENTS:', JSON.stringify(dlEvents));
  await page.screenshot({ path: OUT + '11-after-wizard.png' });

  await browser.close();
  console.log('PROBE2 DONE');
})().catch(e => { console.error('PROBE2 FAILED:', e.message); process.exit(1); });
