/* MakeCode DOM probe for the KS3 DT tutorial recorder.
   Answers, with screenshots in out/probe/:
   1. What dialogs appear on load and how to dismiss them
   2. Toolbox category elements + labels + positions
   3. Flyout block positions (data-id) after opening a category
   4. Whether a real mouse drag lands "on button A pressed" on the canvas
   5. Whether "show icon" nests inside it (verified via Monaco main.ts read-back)
   6. Simulator iframe + button A press behaviour
   7. What the Download button does headlessly                                  */
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = __dirname + '/out/probe/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function dismissDialogs(page) {
  const hits = [];
  for (let i = 0; i < 6; i++) {
    const closed = await page.evaluate(() => {
      const sels = ['.ui.modal .closeIcon', '.ui.modal .close.icon', '.ui.modal .actions .approve',
        '.ui.modal .actions .button', '#modal .close', '.tour-container .close', '[aria-label="Close"]',
        '.cookiemsg button', '#cookiebanner button', '.ui.button.approve'];
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el && el.offsetParent !== null) { el.click(); return s + ' :: ' + (el.textContent || '').trim().slice(0, 40); }
      }
      return null;
    }).catch(() => null);
    if (!closed) break;
    hits.push(closed);
    await sleep(800);
  }
  return hits;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  console.log('loading editor...');
  await page.goto('https://makecode.microbit.org/#editor', { waitUntil: 'networkidle', timeout: 120000 }).catch(e => console.log('goto:', e.message));
  await sleep(7000);
  const dlg = await dismissDialogs(page);
  console.log('dialogs dismissed:', JSON.stringify(dlg));
  await page.screenshot({ path: OUT + '01-loaded.png' });

  // ---- toolbox categories
  const cats = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('[role="treeitem"], .blocklyTreeRow'));
    return rows.map(r => {
      const b = r.getBoundingClientRect();
      return { text: (r.textContent || '').trim().slice(0, 30), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    }).filter(c => c.w > 0);
  });
  console.log('CATEGORIES:', JSON.stringify(cats, null, 1));

  // ---- open Input, dump flyout
  const input = cats.find(c => /Input/i.test(c.text) && c.w > 50);
  if (!input) throw new Error('no Input category');
  await page.mouse.click(input.x + input.w / 2, input.y + input.h / 2);
  await sleep(1500);
  await page.screenshot({ path: OUT + '02-input-flyout.png' });
  const dumpFlyout = () => page.evaluate(() => {
    const g = Array.from(document.querySelectorAll('.blocklyFlyout g.blocklyDraggable[data-id]'));
    return g.map(el => {
      const b = el.getBoundingClientRect();
      const text = Array.from(el.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' ')
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ").replace(/\s+/g, " ").trim();
      return { text: text.slice(0, 50), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    });
  });
  const flyout = await dumpFlyout();
  console.log('INPUT FLYOUT:', JSON.stringify(flyout));

  // ---- drag "on button A pressed" to canvas (slow, stepped)
  const onBtn = flyout.find(b => /on button.*A.*pressed/i.test(b.text));
  if (!onBtn) throw new Error('no on-button block found in flyout');
  const from = { x: onBtn.x + Math.min(60, onBtn.w / 2), y: onBtn.y + Math.min(20, onBtn.h / 2) };
  const to = { x: 750, y: 300 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await sleep(150);
  for (let i = 1; i <= 25; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * i / 25, from.y + (to.y - from.y) * i / 25);
    await sleep(16);
  }
  await sleep(150);
  await page.mouse.up();
  await sleep(1200);
  await page.screenshot({ path: OUT + '03-after-drag1.png' });
  const canvas1 = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('.blocklyBlockCanvas > g.blocklyDraggable'));
    return c.map(el => {
      const b = el.getBoundingClientRect();
      return { id: el.getAttribute('data-id'), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    });
  });
  console.log('CANVAS AFTER DRAG1:', JSON.stringify(canvas1));

  // ---- open Basic, drag "show icon" INSIDE the event block
  const basic = cats.find(c => /Basic/i.test(c.text) && c.w > 50);
  await page.mouse.click(basic.x + basic.w / 2, basic.y + basic.h / 2);
  await sleep(1500);
  await page.screenshot({ path: OUT + '04-basic-flyout.png' });
  const fly2 = await dumpFlyout();
  console.log('BASIC FLYOUT:', JSON.stringify(fly2));
  const showIcon = fly2.find(b => /show icon/i.test(b.text));
  if (!showIcon) { console.log('NO show icon block found — ids above'); }
  else {
    const target = canvas1[0];
    const from2 = { x: showIcon.x + Math.min(60, showIcon.w / 2), y: showIcon.y + Math.min(20, showIcon.h / 2) };
    const to2 = { x: target.x + 55, y: target.y + Math.min(55, target.h - 10) }; // inside the C mouth
    await page.mouse.move(from2.x, from2.y);
    await page.mouse.down();
    await sleep(150);
    for (let i = 1; i <= 25; i++) {
      await page.mouse.move(from2.x + (to2.x - from2.x) * i / 25, from2.y + (to2.y - from2.y) * i / 25);
      await sleep(16);
    }
    await sleep(150);
    await page.mouse.up();
    await sleep(1500);
    await page.screenshot({ path: OUT + '05-after-drag2.png' });
  }

  // ---- read back program via Monaco round-trip
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
  console.log('PROGRAM READ-BACK:\n' + code);
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, .ui.item, [role="button"]'));
    const el = els.find(e => (e.textContent || '').trim() === 'Blocks');
    if (el) el.click();
  });
  await sleep(2500);

  // ---- simulator: find iframe + press button A
  const frames = page.frames().map(f => f.url()).filter(u => u && u !== 'about:blank');
  console.log('FRAMES:', JSON.stringify(frames, null, 1));
  const simFrame = page.frames().find(f => /sim|---run|simulator/i.test(f.url()));
  if (simFrame) {
    const btnA = await simFrame.evaluate(() => {
      const cands = Array.from(document.querySelectorAll('[aria-label], [id]')).filter(e => {
        const a = (e.getAttribute('aria-label') || '') + ' ' + e.id;
        return /button a|btn_a|ButtonA/i.test(a);
      });
      return cands.map(e => {
        const b = e.getBoundingClientRect();
        return { id: e.id, aria: e.getAttribute('aria-label'), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
      });
    }).catch(e => 'sim eval failed: ' + e.message);
    console.log('SIM BUTTON A CANDIDATES:', JSON.stringify(btnA, null, 1));
    // press it (element inside iframe: compute page coords = iframe offset + element coords)
    if (Array.isArray(btnA) && btnA.length) {
      const iframeEl = await page.$('iframe[src*="sim"], #simulators iframe, .simframe iframe');
      const box = iframeEl ? await iframeEl.boundingBox() : null;
      console.log('IFRAME BOX:', JSON.stringify(box));
      if (box) {
        const b = btnA[0];
        await page.mouse.click(box.x + b.x + b.w / 2, box.y + b.y + b.h / 2);
        await sleep(800);
        await page.screenshot({ path: OUT + '06-after-btnA.png' });
      }
    }
  } else {
    console.log('NO SIM FRAME MATCH — all frames listed above');
    await page.screenshot({ path: OUT + '06-no-sim.png' });
  }

  // ---- Download button behaviour
  const dl = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, [role="button"]'));
    const el = els.find(e => /download/i.test((e.textContent || '') + (e.getAttribute('aria-label') || '')));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { text: (el.textContent || '').trim().slice(0, 30), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  });
  console.log('DOWNLOAD BUTTON:', JSON.stringify(dl));
  if (dl) {
    const dlPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
    await page.mouse.click(dl.x + dl.w / 2, dl.y + dl.h / 2);
    await sleep(4000);
    await page.screenshot({ path: OUT + '07-after-download.png' });
    const download = await dlPromise;
    console.log('DOWNLOAD EVENT:', download ? download.suggestedFilename() : 'none (dialog instead?)');
  }

  // ---- zoom / Blockly access
  const misc = await page.evaluate(() => ({
    blockly: typeof window.Blockly !== 'undefined',
    zoomControls: !!document.querySelector('.blocklyZoom'),
    projectName: (document.querySelector('.projectname, input.projectname, .header .project-name') || {}).outerHTML || null
  }));
  console.log('MISC:', JSON.stringify(misc));

  await browser.close();
  console.log('PROBE DONE');
})().catch(e => { console.error('PROBE FAILED:', e.message); process.exit(1); });
