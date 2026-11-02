/* AT-25 contrast gate. Opens every view (0-8) at a phone and a board size, and computes the
   contrast of every visible text element against its resolved background (alpha layers blended).
   Text over a photo or gradient is counted as unresolved, not judged.
   Body text must reach 4.5:1, large text (24px, or 18.66px bold) 3:1.
   --control adds one pale paragraph (#bbbbbb on white) to every view: the gate must FAIL. */
const puppeteer = require('puppeteer');
const path = require('path');
const argv = process.argv.slice(2);
const CONTROL = argv.includes('--control');
const ui = argv.indexOf('--url');
const BASE = ui >= 0 ? argv[ui + 1] : 'file://' + path.resolve(__dirname, '..', 'index.html');
const URL = BASE + (BASE.includes('?') ? '&' : '?') + 'nointro';
(async () => {
  const br = await puppeteer.launch({ headless: 'shell', args: ['--allow-file-access-from-files'] });
  let bad = [], judged = 0, unresolved = 0;
  for (const [w, h] of [[375, 667], [1536, 864]]) {
    const pg = await br.newPage();
    await pg.setViewport({ width: w, height: h });
    for (let v = 0; v <= 8; v++) {
      await pg.goto(URL, { waitUntil: 'load' });
      await pg.evaluate(v => { localStorage.setItem('tdth-v1', JSON.stringify({ v: 1, view: v, unlocked: 7, done: v === 8 ? { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 } : {}, stars: {}, tasks: {}, quick: {}, order: {} })); }, v);
      await pg.reload({ waitUntil: 'load' });
      await new Promise(r => setTimeout(r, 900));
      if (CONTROL) await pg.evaluate(() => { const p = document.createElement('p'); p.textContent = 'Control text'; p.style.cssText = 'color:#bbbbbb;background:#ffffff;font-size:16px'; (document.querySelector('main') || document.body).appendChild(p); });
      const r = await pg.evaluate(() => {
        const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number).concat(m.length < 4 ? [1] : []) : [0, 0, 0, 0]; };
        const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        const out = { bad: [], judged: 0, unresolved: 0 };
        for (const e of document.querySelectorAll('body *')) {
          if (![].some.call(e.childNodes, n => n.nodeType === 3 && n.textContent.trim())) continue;
          if (e.closest('svg,[hidden],[aria-hidden="true"],#sr,.sr')) continue;
          const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
          if (!b.width || !b.height || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
          let layers = [], unres = false;
          for (let a = e; a; a = a.parentElement) {
            const s = getComputedStyle(a);
            if (+s.opacity < 1 && a !== e) { /* faded ancestor: still judged on colours */ }
            if (s.backgroundImage !== 'none') { unres = true; break; }
            const c = rgb(s.backgroundColor);
            if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
          }
          if (unres) { out.unresolved++; continue; }
          let bg = [255, 255, 255];
          for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; bg = bg.map((x, j) => c[j] * c[3] + x * (1 - c[3])); }
          let fg = rgb(cs.color); fg = fg.slice(0, 3).map((x, j) => x * fg[3] + bg[j] * (1 - fg[3]));
          const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
          out.judged++;
          if (ratio < (large ? 3 : 4.5)) out.bad.push(ratio.toFixed(2) + ' ' + e.tagName.toLowerCase() + '.' + e.className + ' "' + e.textContent.trim().slice(0, 40) + '"');
        }
        return out;
      });
      judged += r.judged; unresolved += r.unresolved;
      r.bad.forEach(x => bad.push(w + ' view ' + v + ': ' + x));
    }
    await pg.close();
  }
  await br.close();
  console.log('judged ' + judged + ' text elements, unresolved (photo/gradient behind) ' + unresolved);
  [...new Set(bad)].slice(0, 30).forEach(x => console.log('  LOW ' + x));
  const ok = bad.length === 0;
  if (CONTROL) { console.log(ok ? 'CONTROL BROKEN: pale text passed' : 'CONTROL OK: pale text caught'); process.exit(ok ? 1 : 0); }
  console.log(ok ? 'CONTRAST PASSED' : 'CONTRAST FAILED: ' + bad.length); process.exit(ok ? 0 : 1);
})();
