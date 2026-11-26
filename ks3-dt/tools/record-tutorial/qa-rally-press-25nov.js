/* qa-rally-press-25nov — every press of a Rally score button counts (J1 L3, Reaction Rally).
   25 Nov 2026 live walk: on an empty go the FIRST press of +10, +, − or −10 only showed 0 and
   dropped the step, so a pupil who scored 13 and pressed +10 then + + + typed 3. This opens the
   Rally as a pupil at 1366x625, runs each go's real timer and checks:
     - before a go's timer runs, its buttons are locked;
     - go 1: +10 once reads 10, then + + + reads 13;
     - go 2: − once on the empty go enters 0 (a pupil who scored nothing can say so);
     - the total reads 13, and Send in my scores arms once the fair-play box is ticked.
   CONTROL=1 serves origin/main's engines.js: the first +10 reads 0, so it must fail.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-rally-press-25nov.js [--port=8863] */
const puppeteer = require('puppeteer'), path = require('path'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8863), CONTROL = process.env.CONTROL === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0; const FAILS = [];
const check = (ok, msg) => { if (ok) { PASS++; console.log('  PASS  ' + msg); } else { FAILS.push(msg); console.log('  FAIL  ' + msg); } };
const OLD = CONTROL ? execFileSync('git', ['show', 'origin/main:ks3-dt/platform/engines.js'], { cwd: ROOT, maxBuffer: 1 << 27 }) : null;

(async () => {
  const srv = spawn('node', [path.join(ROOT, 'ks3-dt/tools/dev-static.js'), String(PORT), ROOT], { stdio: 'ignore' });
  await sleep(900);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 625 });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    if (CONTROL) {
      await page.setRequestInterception(true);
      page.on('request', q => /\/platform\/engines\.js(\?|$)/.test(q.url())
        ? q.respond({ status: 200, contentType: 'text/javascript', body: OLD }) : q.continue());
    }
    await page.goto(`http://localhost:${PORT}/ks3-dt/platform/index.html?class=Demo-8A&as=anya`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
    await sleep(600);
    await page.evaluate(() => {
      const past = Date.now() - 3 * 864e5; App.state.locks = {}; App.state.me.L = {};
      (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
      App.state.absence = [];
      App.openLesson('j1-03', {});
    });
    await page.waitForFunction(() => App.state.chunks && App.state.chunks.some(c => c.id === 'rally') && document.querySelector('.dossier'), { timeout: 20000 });
    await sleep(1500);
    await page.evaluate(() => { const i = App.state.chunks.findIndex(c => c.id === 'rally'); App.state.chunkIdx = i - 1; App.nextChunk(); });
    await page.waitForSelector('.rally-timer-btn', { timeout: 15000 });
    await sleep(800);

    const read = () => page.evaluate(() => ({
      total: (document.querySelector('.rally-total') || {}).textContent,
      locked: [...document.querySelectorAll('.rally-round')].map(s => [...s.querySelectorAll('.rally-step')].every(b => b.disabled)),
      armed: !document.querySelector('.rally-transmit').disabled
    }));
    const press = async (go, d, n) => {
      const sel = `.rally-round[data-i="${go}"] .rally-step[data-d="${d}"]`;
      for (let k = 0; k < (n || 1); k++) { await page.click(sel); await sleep(250); }
    };
    const runGo = async (go) => {
      await page.click('.rally-timer-btn');
      await page.waitForFunction((g) => {
        const b = document.querySelector(`.rally-round[data-i="${g}"] .rally-step[data-d="1"]`);
        return b && !b.disabled;
      }, { timeout: 30000 }, go);
      await sleep(300);
    };

    let r = await read();
    check(r.locked[0] && r.locked[1], 'before any timer runs, both goes are locked');
    await runGo(0);
    await press(0, 10, 1);
    r = await read();
    check(r.total === '10', 'go 1: the first press of +10 reads 10 (read ' + r.total + ')');
    await press(0, 1, 3);
    r = await read();
    check(r.total === '13', 'go 1: then + + + reads 13 (read ' + r.total + ')');
    check(r.locked[1], 'go 2 is still locked until its own timer runs');
    await runGo(1);
    await press(1, -1, 1);
    r = await read();
    check(r.total === '13', 'go 2: − on the empty go enters 0, total stays 13 (read ' + r.total + ')');
    check(!r.armed, 'Send in my scores stays asleep until the fair-play box is ticked');
    await page.click('.rally-confirm'); await sleep(400);
    r = await read();
    check(r.armed, 'Send in my scores wakes once the box is ticked');
    check(errs.length === 0, 'no page errors: ' + JSON.stringify(errs.slice(0, 2)));
  } catch (e) {
    FAILS.push('crashed: ' + e.message); console.log('  FAIL  crashed: ' + e.message);
    try {
      const pages = await browser.pages();
      console.log(await pages[pages.length - 1].evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent)
        .map(b => b.className + '=' + b.textContent.trim().slice(0, 24)).join(' / ') + ' || ' + (document.querySelector('.chunk-host') || document.body).innerText.slice(0, 300)));
    } catch (x) { /* nothing more to show */ }
  } finally {
    await browser.close(); srv.kill();
  }
  console.log((CONTROL ? 'CONTROL ' : '') + 'qa-rally-press-25nov: ' + PASS + ' pass, ' + FAILS.length + ' fail');
  process.exit(FAILS.length ? 1 : 0);
})();
