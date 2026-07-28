/* Structure probe: open a lesson and dump the DOM outline of each chunk so a
   precise QA harness can be written against real selectors.
   Usage: node probe-j1.js <lessonTitleRegex> [persona] [maxChunks] */
const { chromium } = require('./node_modules/playwright');
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TITLE = process.argv[2] || 'Mission Control';
const WHO = process.argv[3] || 'anya';
const MAX = Number(process.argv[4] || 14);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.goto(BASE + WHO, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(700);

  const outline = () => page.evaluate(() => {
    const h = document.querySelector('.chunk-host');
    if (!h) return { engine: '(none)', tree: '', buttons: [], inputs: [] };
    const lines = [];
    (function walk(n, d) {
      if (d > 4) return;
      for (const c of n.children) {
        const cls = c.className && typeof c.className === 'string' ? '.' + c.className.trim().split(/\s+/).join('.') : '';
        const txt = (c.children.length === 0 ? (c.textContent || '').trim().slice(0, 60) : '');
        lines.push('  '.repeat(d) + c.tagName.toLowerCase() + cls + (txt ? '  "' + txt + '"' : ''));
        walk(c, d + 1);
      }
    })(h, 0);
    return {
      engine: h.className,
      tree: lines.slice(0, 90).join('\n'),
      buttons: Array.from(h.querySelectorAll('button')).map(b => ({
        c: b.className, t: (b.textContent || '').trim().slice(0, 40), d: b.disabled, vis: !!b.offsetParent
      })).slice(0, 30),
      inputs: Array.from(h.querySelectorAll('input,textarea')).map(i => ({ c: i.className, t: i.type, ml: i.maxLength })),
    };
  });

  await page.evaluate((t) => {
    const re = new RegExp(t, 'i');
    const tile = Array.from(document.querySelectorAll('.tile')).find(e => re.test(e.textContent));
    if (tile) tile.click();
  }, TITLE);
  await sleep(2400);

  for (let i = 0; i < MAX; i++) {
    const o = await outline();
    console.log('\n================ CHUNK ' + i + '  host=' + o.engine);
    console.log(o.tree);
    console.log('-- buttons:', JSON.stringify(o.buttons));
    if (o.inputs.length) console.log('-- inputs:', JSON.stringify(o.inputs));
    // advance: answer any question, then click the most forward-looking button
    const moved = await page.evaluate(() => {
      const h = document.querySelector('.chunk-host');
      if (!h) return 'none';
      const bp = document.querySelector('.badge-pop button');
      if (bp) { bp.click(); return 'badge'; }
      const opt = h.querySelector('.q-opt:not(:disabled)');
      if (opt) { opt.click(); return 'answered'; }
      const b = Array.from(h.querySelectorAll('button')).find(x =>
        /next|continue|finish|start|done|onward|got it|skip|open|see |begin/i.test(x.textContent) && !x.disabled && x.offsetParent);
      if (b) { b.click(); return 'clicked:' + b.textContent.trim().slice(0, 24); }
      return 'stuck';
    });
    console.log('-- advance:', moved);
    await sleep(1400);
    if (moved === 'stuck') { console.log('-- STUCK, stopping'); break; }
  }
  console.log('\nconsole errors:', errs.length ? errs : 'NONE');
  await browser.close();
})();
