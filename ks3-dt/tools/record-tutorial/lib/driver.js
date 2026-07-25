/* MakeCode editor driver - the proven DOM techniques from probes 1-3.
   All text matching normalises the invisible unicode MakeCode embeds in labels
   (U+200B..200D, U+FEFF, U+00A0). */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class MakeCode {
  constructor(page, log) {
    this.page = page;
    this.log = log || (() => {});
  }

  async openEditor() {
    await this.page.goto('https://makecode.microbit.org/#editor', { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {});
    await sleep(6500);
    await this.dismissDialogs();
    // wait until the toolbox exists
    await this.waitFor(() => this.page.evaluate(() =>
      !!document.querySelector('.blocklyToolboxDiv, [role="treeitem"]')), 30000, 'toolbox');
  }
  async openHome() {
    await this.page.goto('https://makecode.microbit.org/', { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {});
    await sleep(5000);
    await this.dismissDialogs();
  }

  async dismissDialogs() {
    const hits = [];
    for (let i = 0; i < 6; i++) {
      const closed = await this.page.evaluate(() => {
        const sels = ['.ui.modal .closeIcon', '.ui.modal .close.icon', '.ui.modal .actions .approve',
          '.ui.modal .actions .button', '#modal .close', '.tour-container .close', '[aria-label="Close"]',
          '.cookiemsg button', '#cookiebanner button'];
        for (const s of sels) {
          const el = document.querySelector(s);
          if (el && el.offsetParent !== null) { el.click(); return s; }
        }
        return null;
      }).catch(() => null);
      if (!closed) break;
      hits.push(closed);
      await sleep(700);
    }
    if (hits.length) this.log('dismissed: ' + hits.join(', '));
    return hits;
  }

  async waitFor(fn, timeout, label) {
    const t0 = Date.now();
    while (Date.now() - t0 < (timeout || 15000)) {
      if (await fn()) return true;
      await sleep(400);
    }
    throw new Error('waitFor timeout: ' + (label || 'condition'));
  }

  /* ---- geometry lookups (all return page-viewport rects) ---- */
  category(name) {
    return this.page.evaluate((name) => {
      const rows = Array.from(document.querySelectorAll('[role="treeitem"], .blocklyTreeRow'));
      const r = rows.find(el =>
        el.textContent.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').indexOf(name) !== -1 &&
        el.getBoundingClientRect().width > 50);
      if (!r) return null;
      const b = r.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    }, name);
  }
  flyoutBlock(rxSrc) {
    return this.page.evaluate((rxSrc) => {
      const rx = new RegExp(rxSrc, 'i');
      const g = Array.from(document.querySelectorAll('.blocklyFlyout g.blocklyDraggable[data-id]'));
      for (const el of g) {
        const text = Array.from(el.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' ')
          .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
        if (rx.test(text)) {
          const b = el.getBoundingClientRect();
          return { text, x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
        }
      }
      return null;
    }, rxSrc);
  }
  /* top-level canvas blocks (deep=true includes nested child blocks) */
  canvasBlock(rxSrc, deep) {
    return this.page.evaluate(([rxSrc, deep]) => {
      const rx = new RegExp(rxSrc, 'i');
      const sel = deep ? '.blocklyBlockCanvas g.blocklyDraggable' : '.blocklyBlockCanvas > g.blocklyDraggable';
      const g = Array.from(document.querySelectorAll(sel));
      const out = [];
      for (const el of g) {
        const b = el.getBoundingClientRect();
        if (b.width < 10) continue;
        const text = Array.from(el.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' ')
          .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
        if (rx.test(text)) out.push({ text: text.slice(0, 60), x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 });
      }
      // smallest match = the most specific block (a child, not its container)
      out.sort((a, b) => a.w * a.h - b.w * b.h);
      return out[0] || null;
    }, [rxSrc, !!deep]);
  }
  button(rxSrc, minW) {
    return this.page.evaluate(([rxSrc, minW]) => {
      const rx = new RegExp(rxSrc, 'i');
      const els = Array.from(document.querySelectorAll('button, [role="button"], .ui.button, .ui.item, a'));
      for (const el of els) {
        if (el.offsetParent === null) continue;
        const t = ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || ''))
          .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!rx.test(t)) continue;
        const b = el.getBoundingClientRect();
        if (b.width < (minW || 20)) continue;
        return { text: t.slice(0, 50), x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
      }
      return null;
    }, [rxSrc, minW || 20]);
  }
  /* any visible element whose own text matches - smallest match wins (most specific) */
  anyByText(rxSrc, minW) {
    return this.page.evaluate(([rxSrc, minW]) => {
      const rx = new RegExp(rxSrc, 'i');
      const out = [];
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        if (el.offsetParent === null) continue;
        const t = (el.textContent || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!rx.test(t) || t.length > 60) continue;
        const b = el.getBoundingClientRect();
        if (b.width < (minW || 20) || b.height < 10) continue;
        out.push({ text: t.slice(0, 50), x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2, area: b.width * b.height });
      }
      out.sort((a, b) => a.area - b.area);
      return out[0] || null;
    }, [rxSrc, minW || 20]);
  }
  modalButton(rxSrc) {
    return this.page.evaluate((rxSrc) => {
      const rx = new RegExp(rxSrc, 'i');
      const m = Array.from(document.querySelectorAll('.ui.modal, [role="dialog"]')).find(x => x.offsetParent !== null);
      if (!m) return null;
      const btns = Array.from(m.querySelectorAll('button, .button, a')).filter(b => b.offsetParent !== null);
      for (const el of btns) {
        const t = ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '')).replace(/\s+/g, ' ').trim();
        if (!rx.test(t)) continue;
        const b = el.getBoundingClientRect();
        if (b.width < 10) continue;
        return { text: t.slice(0, 50), x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
      }
      return null;
    }, rxSrc);
  }
  modalInfo() {
    return this.page.evaluate(() => {
      const m = Array.from(document.querySelectorAll('.ui.modal, [role="dialog"]')).find(x => x.offsetParent !== null);
      if (!m) return null;
      return { body: (m.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300) };
    });
  }

  /* ---- simulator ---- */
  simFrame() { return this.page.frames().find(f => /---simulator/i.test(f.url())); }
  async simButton(label) {
    const f = this.simFrame();
    if (!f) return null;
    const r = await f.evaluate((label) => {
      const els = Array.from(document.querySelectorAll('.sim-button-group'));
      for (const e of els) {
        if ((e.getAttribute('aria-label') || '') === label) {
          const b = e.getBoundingClientRect();
          return { x: b.x, y: b.y, w: b.width, h: b.height };
        }
      }
      return null;
    }, label);
    if (!r) return null;
    const iframeEl = await this.page.$('iframe[src*="sim"]');
    const box = await iframeEl.boundingBox();
    return { x: box.x + r.x, y: box.y + r.y, w: r.w, h: r.h, cx: box.x + r.x + r.w / 2, cy: box.y + r.y + r.h / 2 };
  }
  async ledsOn() {
    const f = this.simFrame();
    if (!f) return -1;
    return f.evaluate(() => {
      const leds = Array.from(document.querySelectorAll('.sim-led, [class*="sim-led"]'));
      return leds.filter(l => {
        const op = parseFloat(getComputedStyle(l).opacity || '0');
        return op > 0.4;
      }).length;
    }).catch(() => -1);
  }

  /* ---- program state (off-camera helpers) ---- */
  async setProgram(code) {
    await this._clickTab('JavaScript');
    await sleep(2500);
    const ok = await this.page.evaluate((code) => {
      if (!window.monaco || !monaco.editor) return 'no-monaco';
      const m = monaco.editor.getModels().find(x => String(x.uri).indexOf('main.ts') !== -1) || monaco.editor.getModels()[0];
      if (!m) return 'no-model';
      m.setValue(code);
      return 'ok';
    }, code);
    if (ok !== 'ok') throw new Error('setProgram: ' + ok);
    await sleep(1200);
    await this._clickTab('Blocks');
    await sleep(3200);
    await this.dismissDialogs();
  }
  async readProgram() {
    await this._clickTab('JavaScript');
    await sleep(2600);
    const code = await this.page.evaluate(() => {
      if (!window.monaco || !monaco.editor) return 'NO MONACO';
      const m = monaco.editor.getModels().find(x => String(x.uri).indexOf('main.ts') !== -1) || monaco.editor.getModels()[0];
      return m ? m.getValue() : 'NO MODEL';
    });
    await this._clickTab('Blocks');
    await sleep(2400);
    return code;
  }
  _clickTab(name) {
    return this.page.evaluate((name) => {
      const els = Array.from(document.querySelectorAll('button, .ui.item, [role="button"]'));
      const el = els.find(e => (e.textContent || '').trim() === name);
      if (el) el.click();
      return !!el;
    }, name);
  }

  async setProjectName(name) {
    const done = await this.page.evaluate((name) => {
      const inp = document.querySelector('#fileNameInput2, input[id^="fileNameInput"], input.projectname, .projectname input');
      if (!inp) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, name);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      inp.blur();
      return true;
    }, name);
    this.log('setProjectName: ' + done);
    return done;
  }

  /* scroll the Blockly workspace so freshly-added default blocks sit nicely (no-op fallback) */
  async tidyWorkspace() {
    await this.page.keyboard.press('Escape').catch(() => {});
  }
}


/* =========================================================================
   ScratchDriver - the online scratch.mit.edu editor (Scratch Blocks is a
   Blockly fork, so the .blocklyText / .blocklyDraggable text-join techniques
   from the MakeCode driver carry over; everything else is Scratch-specific).
   Probe-proven (Session 10, scratchpad/sb3-build/probe-scratch.js):
   - editor URL https://scratch.mit.edu/projects/editor/ needs NO login;
     ready signal = [class*="stage-wrapper"], then ~3s settle
   - cookie banner: #onetrust-reject-all-handler (reject-all preferred)
   - File menu item = [class*="menu-bar_menu-bar-item"]:has-text("File");
     "Load from your computer" fires a real filechooser event - drive it with
     page.waitForEvent('filechooser') + chooser.setFiles(sb3Path); an
     "OK to replace" confirm may follow (button:has-text("OK"))
   - sprite tiles: [class*="sprite-selector-item_sprite-name"]
   - green flag [class*="green-flag"], stop [class*="stop-all"]
   - stage canvas: [class*="stage_stage"] canvas; monitors:
     [class*="monitor_monitor-container"]
   - OFF-CAMERA STATE SETUP: no Monaco here - load a pre-authored .sb3
     variant behind a curtain instead (the generator in Claude Work makes
     any state authorable). Dropdown FIELD clicks are refused under the
     recorder exactly like MakeCode Blockly - use callout + curtain dip. */
class ScratchDriver {
  constructor(page, log) {
    this.page = page;
    this.log = log || (() => {});
  }

  async openEditor() {
    /* Scratch fires a NATIVE confirm() before replacing a MODIFIED project.
       Playwright auto-dismisses native dialogs, which silently cancels the
       load (the old sprites stay, so nothing throws) - accept them instead.
       Cost this session's ch2 three failed takes; keep this handler. */
    this.page.on('dialog', d => d.accept().catch(() => {}));
    await this.page.goto('https://scratch.mit.edu/projects/editor/', { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {});
    await this.page.waitForSelector('[class*="stage-wrapper"]', { timeout: 60000 });
    await sleep(3200);
    await this.dismissDialogs();
  }

  async dismissDialogs() {
    const hits = [];
    for (let i = 0; i < 5; i++) {
      const hit = await this.page.evaluate(() => {
        const sels = [
          '#onetrust-reject-all-handler',
          '#onetrust-accept-btn-handler',
          '[class*="modal_close"]',
          '[aria-label="Close"]',
          '[class*="close-button"]'
        ];
        for (const s of sels) {
          const el = Array.from(document.querySelectorAll(s)).find(e => e.offsetParent !== null);
          if (el) { el.click(); return s; }
        }
        return null;
      }).catch(() => null);
      if (!hit) break;
      hits.push(hit);
      this.log('dismissed ' + hit);
      await sleep(700);
    }
    return hits;
  }

  /* load an .sb3 from disk via the real File menu flow (filechooser event).
     All clicks are DOM el.click() via evaluate, NOT page.mouse - so this works
     with the cinema curtain up (the overlay would swallow hit-tested clicks). */
  async loadProject(sb3Path) {
    await this.page.evaluate(() => {
      const fm = Array.from(document.querySelectorAll('[class*="menu-bar_menu-bar-item"]')).find(e => /^File/.test((e.textContent || '').trim()));
      if (fm) fm.click();
    });
    await sleep(500);
    const [chooser] = await Promise.all([
      this.page.waitForEvent('filechooser', { timeout: 8000 }),
      this.page.evaluate(() => {
        const it = Array.from(document.querySelectorAll('li')).find(e => e.offsetParent !== null && /Load from your computer/i.test(e.textContent || ''));
        if (!it) throw new Error('Load item not visible');
        it.click();
      })
    ]);
    await chooser.setFiles(sb3Path);
    await sleep(1200);
    await this.page.evaluate(() => {
      const ok = Array.from(document.querySelectorAll('button')).find(b => b.offsetParent !== null && /^OK$/.test((b.textContent || '').trim()));
      if (ok) ok.click();
    });
    await this.page.waitForSelector('[class*="sprite-selector-item_sprite-name"]', { timeout: 30000 });
    await sleep(1800);
  }

  /* geometry helpers - all return {x,y,w,h,cx,cy}|null in viewport px */
  _rect(elInfo) { return elInfo; }

  async fileMenu() {
    return this.page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('[class*="menu-bar_menu-bar-item"]')).find(e => /^File/.test((e.textContent || '').trim()));
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    });
  }

  async menuItem(rxSrc) {
    return this.page.evaluate((rx) => {
      const re = new RegExp(rx, 'i');
      const el = Array.from(document.querySelectorAll('li')).find(e => e.offsetParent !== null && re.test((e.textContent || '').trim()));
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    }, rxSrc);
  }

  async spriteTile(name) {
    return this.page.evaluate((nm) => {
      const el = Array.from(document.querySelectorAll('[class*="sprite-selector-item_sprite-name"]')).find(e => (e.textContent || '').trim() === nm);
      if (!el) return null;
      const tile = el.closest('[class*="sprite-selector-item"]') || el;
      const b = tile.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    }, name);
  }

  async selectSprite(name) {
    // DOM click (curtain-safe); React catches the bubbled click event
    const ok = await this.page.evaluate((nm) => {
      const el = Array.from(document.querySelectorAll('[class*="sprite-selector-item_sprite-name"]')).find(e => (e.textContent || '').trim() === nm);
      if (!el) return false;
      (el.closest('[class*="sprite-selector-item"]') || el).click();
      return true;
    }, name);
    if (!ok) throw new Error('sprite tile not found: ' + name);
    await sleep(900);
    return this.spriteTile(name);
  }

  async stageArea() {
    return this.page.evaluate(() => {
      const el = document.querySelector('[class*="stage_stage"] canvas');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    });
  }

  async greenFlag() {
    return this.page.evaluate(() => {
      const el = document.querySelector('[class*="green-flag"]');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    });
  }

  async monitorText() {
    return this.page.evaluate(() =>
      Array.from(document.querySelectorAll('[class*="monitor_monitor-container"]')).map(e => (e.textContent || '').trim()).join('|'));
  }

  async monitorRect() {
    return this.page.evaluate(() => {
      const el = document.querySelector('[class*="monitor_monitor-container"]');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    });
  }

  /* Scratch Blocks canvas block lookup - same .blocklyText join technique
     as MakeCode (proven selector family across Blockly builds). */
  async canvasBlock(rxSrc, deep) {
    return this.page.evaluate(({ rx, deep }) => {
      const norm = (s) => (s || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
      const sel = deep ? '.blocklyBlockCanvas g.blocklyDraggable' : '.blocklyBlockCanvas > g.blocklyDraggable';
      const re = new RegExp(rx, 'i');
      const out = [];
      for (const g of document.querySelectorAll(sel)) {
        if (g.closest('.blocklyFlyout')) continue;
        const txt = norm(Array.from(g.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' '));
        if (!re.test(txt)) continue;
        const b = g.getBoundingClientRect();
        if (b.width < 10) continue;
        out.push({ x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2, area: b.width * b.height, text: txt.slice(0, 80) });
      }
      out.sort((a, b) => a.area - b.area);
      return out[0] || null;
    }, { rx: rxSrc, deep: !!deep });
  }

  async flyoutBlock(rxSrc) {
    return this.page.evaluate((rx) => {
      const norm = (s) => (s || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
      const re = new RegExp(rx, 'i');
      for (const g of document.querySelectorAll('.blocklyFlyout g.blocklyDraggable')) {
        const txt = norm(Array.from(g.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' '));
        if (!re.test(txt)) continue;
        const b = g.getBoundingClientRect();
        if (b.width < 12) continue;
        return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2, text: txt.slice(0, 80) };
      }
      return null;
    }, rxSrc);
  }

  /* palette category circle (Events, Motion, ...) in the vertical strip -
     modern Blockly toolbox classes (probe-proven: .blocklyToolboxCategory) */
  async category(name) {
    return this.page.evaluate((nm) => {
      const el = Array.from(document.querySelectorAll('.blocklyToolboxCategory')).find(e => (e.textContent || '').trim() === nm);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    }, name);
  }

  /* count key-pressed hats on the selected sprite's visible canvas */
  async countCanvasBlocks(rxSrc) {
    return this.page.evaluate((rx) => {
      const norm = (s) => (s || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
      const re = new RegExp(rx, 'i');
      let n = 0;
      for (const g of document.querySelectorAll('.blocklyBlockCanvas > g.blocklyDraggable')) {
        if (g.closest('.blocklyFlyout')) continue;
        const txt = norm(Array.from(g.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' '));
        if (re.test(txt)) n++;
      }
      return n;
    }, rxSrc);
  }
}

module.exports = { MakeCode, ScratchDriver, sleep };
