/* qa-parsons-after-check-25nov — the build-it question reads well at a school PC and has no dead
   buttons once marked. 25 Nov 2026 live walk (J1 L3, two stacks): at 1366x625 the program half
   was so narrow beside its "Put this block back" buttons that one block broke over four lines,
   and after "Check my program" those buttons stayed on screen doing nothing.
   For every parsons part that carries the labelled way back, at 1366x625 as a pupil:
     - every block placed into the program is at least 150px wide;
     - no placed block wraps past two lines;
     - after the check, no "Put this block back" button is left on screen.
   CONTROL=1 serves origin/main's engines.js + style.css: both faults come back, so it must fail.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-parsons-after-check-25nov.js [--port=8865] */
const puppeteer = require('puppeteer'), path = require('path'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8865), CONTROL = process.env.CONTROL === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0; const FAILS = [];
const check = (ok, msg) => { if (ok) { PASS++; console.log('  PASS  ' + msg); } else { FAILS.push(msg); console.log('  FAIL  ' + msg); } };
const old = f => execFileSync('git', ['show', 'origin/main:ks3-dt/platform/' + f], { cwd: ROOT, maxBuffer: 1 << 27 });
const OLD = CONTROL ? { 'engines.js': old('engines.js'), 'style.css': old('style.css') } : null;
/* every parsons part whose config keeps the take-back (trayClickEject false) */
const PARTS = [['j1-03', 'exitp'], ['j1-02', 'exitp'], ['j1-06', 'c6'], ['j2-03', 'training-2'], ['j3-03', 'exitp']];

(async () => {
  const srv = spawn('node', [path.join(ROOT, 'ks3-dt/tools/dev-static.js'), String(PORT), ROOT], { stdio: 'ignore' });
  await sleep(900);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    for (const [lesson, part] of PARTS) {
      const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 625 });
      const errs = []; page.on('pageerror', e => errs.push(e.message));
      if (CONTROL) {
        await page.setRequestInterception(true);
        page.on('request', q => {
          const m = q.url().match(/\/platform\/(engines\.js|style\.css)(\?|$)/);
          return m ? q.respond({ status: 200, contentType: m[1].endsWith('.js') ? 'text/javascript' : 'text/css', body: OLD[m[1]] }) : q.continue();
        });
      }
      try {
        const who = { j1: 'class=Demo-8A&as=anya', j2: 'class=Demo-9A&as=aoife', j3: 'class=Demo-10A&as=orla' }[lesson.slice(0, 2)];
        await page.goto(`http://localhost:${PORT}/ks3-dt/platform/index.html?${who}`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
        await sleep(600);
        await page.evaluate((id) => {
          const past = Date.now() - 3 * 864e5; App.state.locks = {}; App.state.me.L = {};
          (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
          App.state.absence = [];
          App.openLesson(id, {});
        }, lesson);
        await page.waitForFunction((p) => App.state.chunks && App.state.chunks.some(c => c.id === p), { timeout: 20000 }, part);
        await sleep(1800);
        await page.evaluate((p) => { const i = App.state.chunks.findIndex(c => c.id === p); App.state.chunkIdx = i - 1; App.nextChunk(); }, part);
        /* a part with an intro screen first: press its start button, as she would */
        await sleep(1200);
        if (!(await page.$('.parsons-card .pt-list .parsons-block'))) {
          await page.evaluate(() => { const b = [...document.querySelectorAll('#player .primary-btn')].find(x => x.offsetParent && !x.disabled); if (b) b.click(); });
        }
        await page.waitForSelector('.parsons-card .pt-list .parsons-block', { timeout: 15000 });
        await sleep(500);
        /* place every block, one click at a time, as she would */
        for (let k = 0; k < 20; k++) {
          const b = await page.$('.parsons-card .pt-list .parsons-block');
          if (!b) break;
          await b.click(); await sleep(150);
        }
        const m = await page.evaluate(() => {
          const placed = [...document.querySelectorAll('.parsons-card .pp-list .parsons-block')];
          const lh = placed.length ? parseFloat(getComputedStyle(placed[0]).lineHeight) || 20 : 20;
          return {
            n: placed.length,
            minW: Math.round(Math.min(...placed.map(b => b.getBoundingClientRect().width))),
            maxLines: Math.max(...placed.map(b => {
              const cs = getComputedStyle(b);
              const inner = b.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
              return Math.round(inner / lh);
            })),
            tb: document.querySelectorAll('.parsons-card .take-back').length,
            armed: !document.querySelector('.parsons-check').disabled
          };
        });
        check(m.n > 0 && m.tb === m.n && m.armed, `${lesson} ${part}: all ${m.n} blocks placed, each with its way back, check awake`);
        check(m.minW >= 150, `${lesson} ${part}: narrowest placed block is ${m.minW}px (needs 150+)`);
        check(m.maxLines <= 2, `${lesson} ${part}: longest placed block runs to ${m.maxLines} line(s) (needs 2 or fewer)`);
        await page.click('.parsons-check'); await sleep(600);
        const left = await page.evaluate(() => [...document.querySelectorAll('.take-back')].filter(b => b.offsetParent).length);
        check(left === 0, `${lesson} ${part}: after the check, ${left} "put it back" button(s) left on screen (needs 0)`);
        check(errs.length === 0, `${lesson} ${part}: no page errors ${JSON.stringify(errs.slice(0, 2))}`);
      } catch (e) {
        FAILS.push(`${lesson} ${part} crashed: ${e.message}`); console.log(`  FAIL  ${lesson} ${part} crashed: ${e.message}`);
      }
      await page.close();
    }
  } finally {
    await browser.close(); srv.kill();
  }
  console.log((CONTROL ? 'CONTROL ' : '') + 'qa-parsons-after-check-25nov: ' + PASS + ' pass, ' + FAILS.length + ' fail');
  process.exit(FAILS.length ? 1 : 0);
})();
