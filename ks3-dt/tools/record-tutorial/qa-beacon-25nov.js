/* qa-beacon-25nov — the platform's help button says "Stuck? Show me" and never covers a control.
   25 Nov 2026 live walks, his standard ("obvious Stuck? Show me help, never a bare ?"): the round gold
   "?" in the corner became a labelled green button, the same words and green as the J3 L6 and L7 hours.
   A wider button can sit on top of things the round one missed, so this walks EVERY lesson of every
   year, every part of each lesson (opened as a finished lesson so the rail can jump), at four screen
   sizes, scrolls each screen to the bottom (where a covered button cannot be scrolled out from under it)
   and checks:
     - the hub and every lesson part: the button reads "Stuck? Show me", its words fit, it is on screen;
     - the Night Desk and the J3 L7 hour (their own green Stuck? on every screen): it is not shown;
     - nothing a pupil can click (in the page or inside an hour's frame) is underneath it;
     - clicking it opens the help box, named for the part she is on.
   CONTROL=1 serves origin/main's index.html, app.js and style.css: the bare "?" must fail.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-beacon-25nov.js [--port=8862] [--shots=DIR] */
const puppeteer = require('puppeteer'), path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8862), CONTROL = process.env.CONTROL === '1';
const SHOTS = arg('shots', '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0; const FAILS = [];
const check = (ok, msg) => { if (ok) PASS++; else { FAILS.push(msg); console.log('  FAIL  ' + msg); } };
const OLD = {};
if (CONTROL) ['index.html', 'app.js', 'style.css'].forEach(f => { OLD[f] = execFileSync('git', ['show', 'origin/main:ks3-dt/platform/' + f], { cwd: ROOT, maxBuffer: 1 << 27 }); });
const SIZES = arg('sizes', '1366x625,1280x720,1920x1080,1024x768').split(',').map(s => s.split('x').map(Number));
const YEARS = [['j1', 'Demo-8A', 'anya'], ['j2', 'Demo-9A', 'aoife'], ['j3', 'Demo-10A', 'orla']];

async function freshPage(browser, w, h, cls, who) {
  const page = await browser.newPage(); await page.setViewport({ width: w, height: h });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.__errs = errs;
  if (CONTROL) {
    await page.setRequestInterception(true);
    page.on('request', q => {
      const m = q.url().match(/\/platform\/(index\.html|app\.js|style\.css)(\?|$)/);
      if (m) q.respond({ status: 200, contentType: m[1].endsWith('.css') ? 'text/css' : m[1].endsWith('.html') ? 'text/html' : 'text/javascript', body: OLD[m[1]] }); else q.continue();
    });
  }
  await page.goto(`http://localhost:${PORT}/ks3-dt/platform/index.html?class=${cls}&as=${who}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
  await sleep(700);
  /* every lesson open and finished, so each opens as a re-read whose rail can jump to any part */
  await page.evaluate(() => {
    const past = Date.now() - 3 * 864e5; App.state.locks = {}; App.state.me.L = {};
    (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; App.state.me.L[String(l.num)] = [2]; });
    App.state.absence = []; App.showHub();
  });
  await sleep(400);
  return page;
}

/* scroll everything to the bottom, then measure the button and what is under it */
const measure = (page) => page.evaluate(() => {
  const scrollAll = (doc) => {
    try {
      doc.defaultView.scrollTo(0, 1e7);
      Array.prototype.forEach.call(doc.querySelectorAll('*'), (e) => {
        const cs = doc.defaultView.getComputedStyle(e);
        if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2) e.scrollTop = 1e7;
      });
    } catch (x) { /* cross-origin frame: nothing to scroll */ }
  };
  scrollAll(document);
  Array.prototype.forEach.call(document.querySelectorAll('iframe'), (f) => { try { scrollAll(f.contentDocument); } catch (x) {} });
  const b = document.getElementById('help-beacon');
  const cs = getComputedStyle(b);
  const shown = !b.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && b.getClientRects().length > 0;
  const r = b.getBoundingClientRect();
  const out = {
    shown, text: b.textContent.trim(), fits: b.scrollWidth <= b.clientWidth + 1 && b.scrollHeight <= b.clientHeight + 1,
    onScreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    frame: (document.querySelector('[class*="-frame"]') || {}).className || '',
    under: []
  };
  if (!shown) return out;
  const SEL = 'button, a[href], input, textarea, select, [role=button], [contenteditable=true], .rail-jump';
  const visible = (e, win) => {
    if (e === b || e.closest('[hidden]')) return false;
    const s = win.getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || s.pointerEvents === 'none') return false;
    const rr = e.getBoundingClientRect(); return rr.width > 2 && rr.height > 2;
  };
  const collect = (doc, dx, dy, where) => {
    const win = doc.defaultView;
    Array.prototype.forEach.call(doc.querySelectorAll(SEL), (e) => {
      if (!visible(e, win)) return;
      if (e.closest('.modal, .confirm-modal, [role=dialog]') && e.closest('[hidden]')) return;
      const q = e.getBoundingClientRect();
      const L = q.left + dx, T = q.top + dy, R = q.right + dx, B = q.bottom + dy;
      /* only what is actually on the screen can be covered */
      if (B <= 0 || T >= innerHeight || R <= 0 || L >= innerWidth) return;
      const ix = Math.min(R, r.right) - Math.max(L, r.left), iy = Math.min(B, r.bottom) - Math.max(T, r.top);
      if (ix > 1 && iy > 1) out.under.push(where + ' ' + (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + String(e.className || '').split(' ')[0]) + ' "' + String(e.textContent || e.value || e.getAttribute('aria-label') || '').trim().slice(0, 30) + '"');
    });
  };
  collect(document, 0, 0, 'page');
  Array.prototype.forEach.call(document.querySelectorAll('iframe'), (f) => {
    const fr = f.getBoundingClientRect();
    if (!(fr.width > 2 && fr.height > 2)) return;
    try { if (f.contentDocument) collect(f.contentDocument, fr.left, fr.top, 'frame'); } catch (x) {}
  });
  return out;
});

(async () => {
  const srv = spawn('node', [path.join(ROOT, 'ks3-dt/tools/dev-static.js'), String(PORT), ROOT], { stdio: 'ignore' });
  await sleep(700);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  let parts = 0, hidden = 0;
  try {
    for (const [w, h] of SIZES) {
      console.log('\n== ' + w + 'x' + h + ' ==');
      for (const [year, cls, who] of YEARS) {
        const page = await freshPage(browser, w, h, cls, who);
        let m = await measure(page);
        check(m.shown && m.text === 'Stuck? Show me', `${year} ${w}x${h} hub: the button reads "Stuck? Show me" ("${m.text}", shown ${m.shown})`);
        check(m.fits && m.onScreen, `${year} ${w}x${h} hub: its words fit and it is on screen (${m.rect})`);
        check(!m.under.length, `${year} ${w}x${h} hub: nothing she can click is under it (${m.under.join('; ')})`);
        const lessons = await page.evaluate(() => (App.state.man.lessons || []).filter(l => l.file).map(l => l.id));
        for (const id of lessons) {
          await page.evaluate((id) => App.openLesson(id, {}), id);
          await page.waitForFunction(() => App.state.lesson && document.querySelector('#player') && !document.querySelector('#player').hidden, { timeout: 20000 }).catch(() => {});
          await sleep(900);
          const n = await page.evaluate(() => (App.state.chunks || []).length);
          for (let i = 0; i < n; i++) {
            if (i) {
              const ok = await page.evaluate((i) => { const d = document.querySelectorAll('.rail-dot')[i]; if (!d || !d.classList.contains('rail-jump')) return false; d.click(); return true; }, i);
              if (!ok) { check(false, `${id} part ${i + 1}: the rail could not jump there`); continue; }
            }
            const hasFrame = await page.evaluate(() => !!document.querySelector('.chunk-host iframe, #player iframe'));
            await sleep(hasFrame ? 2600 : 700);
            m = await measure(page);
            const title = await page.evaluate(() => { const c = App.state.chunks[App.state.chunkIdx]; return c && c.title; });
            const tag = `${id} ${w}x${h} part ${i + 1} "${title}"`;
            parts++;
            if (/(nightdesk|see)-frame/.test(m.frame)) {
              hidden++;
              check(!m.shown, `${tag}: the hour has its own Stuck? Show me, so the platform one is hidden (shown ${m.shown})`);
            } else {
              check(m.shown && m.text === 'Stuck? Show me', `${tag}: the button reads "Stuck? Show me" ("${m.text}", shown ${m.shown})`);
              check(m.fits && m.onScreen, `${tag}: its words fit and it is on screen (${m.rect})`);
              check(!m.under.length, `${tag}: nothing she can click is under it (${m.under.join('; ')})`);
              if (w === 1366 && m.shown) {
                await page.click('#help-beacon'); await sleep(350);
                const hm = await page.evaluate(() => { const mo = document.getElementById('help-modal'); return { open: mo && !mo.hidden && mo.getClientRects().length > 0, title: (document.getElementById('help-title') || {}).textContent || '' }; });
                check(hm.open && hm.title.indexOf(title) !== -1, `${tag}: clicking it opens the help for this part ("${hm.title}")`);
                if (SHOTS && i < 2) await page.screenshot({ path: path.join(SHOTS, `${id}-p${i + 1}-help.png`) });
                await page.evaluate(() => { const c = document.getElementById('help-close'); if (c) c.click(); }); await sleep(300);
              }
            }
            if (SHOTS && w === 1366) await page.screenshot({ path: path.join(SHOTS, `${id}-p${i + 1}.png`) });
          }
          await page.evaluate(() => { App.state.lesson = null; App.showHub(); }); await sleep(300);
        }
        check(!page.__errs.length, `${year} ${w}x${h}: no page errors (${page.__errs.slice(0, 2).join(' | ')})`);
        await page.close();
      }
    }
  } finally { await browser.close(); srv.kill(); }
  console.log(`\n${parts} lesson parts at ${SIZES.length} sizes (${hidden} in hours with their own help)`);
  console.log(FAILS.length ? `FAILED ${FAILS.length} of ${PASS + FAILS.length} checks` : `PASSED all ${PASS} checks`);
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
