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
      const inp = document.querySelector('input.projectname, .projectname input, input[aria-label*="project" i]');
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

module.exports = { MakeCode, sleep };
