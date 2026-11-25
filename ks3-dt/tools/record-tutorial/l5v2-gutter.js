/* J3 L5 SAME LIGHT · the line numbers stay on their lines (25 Nov 2026, a teacher's find in class).
   The fault: the number column did not scroll with the code. Chapter 4 is 21 lines, so on a school PC the code box
   scrolls and every number, the red fault number too, sat beside the wrong line (up to 11 lines out).
   The gate plays the real hour (pair, right path) at four sizes. At every step of every fault, on both screens, it
   scrolls the code box that is showing (the read-only view or the editor) to the top, the middle and the bottom and
   measures how far the first and last number sit from their own lines. More than 1 px is a fault.
   It must also SEE a code box that scrolls at the school-PC size, or it has measured nothing and goes red.
   CONTROL=1 serves ui.js and hour.html as they were at c04a6c9b (before the fix): the gate must go RED.
   NODE_PATH=$(npm root -g) node tools/record-tutorial/l5v2-gutter.js [--port=8846] [--sizes=1366x625,900x700] */
const puppeteer = require('puppeteer'), path = require('path'), { execFileSync } = require('child_process');
const { serve } = require('./l5v2-serve'), { drive } = require('./l5v2-drive');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const PORT = +arg('port', 8846), CONTROL = process.env.CONTROL === '1', BASE = 'c04a6c9b';
const SIZES = arg('sizes', '1366x625,1366x768,900x700,683x768').split(',').map(s => s.split('x').map(Number));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fails = [], notes = [];
const old = {};
if (CONTROL) for (const f of ['ui.js', 'hour.html'])
  old[f] = execFileSync('git', ['show', BASE + ':ks3-dt/platform/assets/twolights/' + f], { cwd: path.join(__dirname, '..', '..'), maxBuffer: 1 << 26 });

function measure() {
  const g = document.getElementById('gutter'), ed = document.getElementById('ed'), view = document.getElementById('view');
  if (!g || !ed || !view) return null;
  const box = ed.classList.contains('hide') ? view : ed, n = g.children.length;
  if (!n || !box.getBoundingClientRect().height) return null;
  const max = box.scrollHeight - box.clientHeight, lh = g.children[0].getBoundingClientRect().height;
  const out = { which: box.id, n, max, worst: 0, at: 0, line: 0 };
  for (const y of [0, Math.round(max / 2), max]) {
    box.scrollTop = y; box.dispatchEvent(new Event('scroll'));
    const r = box.getBoundingClientRect(), pt = parseFloat(getComputedStyle(box).paddingTop);
    for (const i of [0, n - 1]) {
      const want = r.top + box.clientTop + pt + i * lh - box.scrollTop, got = g.children[i].getBoundingClientRect().top;
      const d = Math.abs(got - want);
      if (d > out.worst) { out.worst = Math.round(d * 10) / 10; out.at = y; out.line = i + 1; }
    }
  }
  box.scrollTop = 0; box.dispatchEvent(new Event('scroll'));
  return out;
}

async function run(browser, W, H) {
  const room = 'G' + Math.random().toString(36).slice(2, 7).toUpperCase(), pages = {}, SEATS = ['A', 'B'];
  const tag = W + 'x' + H; let states = 0, scrolled = 0, worst = 0, deepest = 0;
  for (const s of SEATS) {
    const p = await browser.newPage(); await p.setViewport({ width: W, height: H });
    p.on('pageerror', e => fails.push(tag + ' ' + s + ' page error: ' + e.message));
    if (CONTROL) {
      await p.setRequestInterception(true);
      p.on('request', q => {
        const f = q.url().split('?')[0].split('/').pop();
        if (old[f] && /\/twolights\//.test(q.url())) q.respond({ status: 200, contentType: f === 'ui.js' ? 'text/javascript' : 'text/html', body: old[f] });
        else q.continue();
      });
    }
    await p.goto(`http://localhost:${PORT}/assets/twolights/hour.html?room=${room}&seat=${s}&mode=pair&t=20`, { waitUntil: 'load' }); pages[s] = p;
  }
  const seen = {};
  const look = async (step, f, x) => {
    const key = x.phase + '/' + f.no + '/' + step; if (seen[key]) return false; seen[key] = 1;
    await sleep(250);
    for (const s of SEATS) {
      const m = await pages[s].evaluate(measure); if (!m) continue;
      states++; if (m.max > 0) scrolled++; if (m.max > deepest) deepest = m.max; if (m.worst > worst) worst = m.worst;
      if (m.worst > 1) fails.push(`${tag} ${key} seat ${s} (${m.which}, ${m.n} lines, scrolls ${m.max}px): number ${m.line} sits ${m.worst}px off its line at scroll ${m.at}`);
    }
    return false;
  };
  await drive(pages, { SEATS, PATH: 'right', RELOAD: false, CONTROL: false, MODE: 'pair', W, SHOTS: '', fails, log: () => {}, sleep, look })
    .catch(e => fails.push(tag + ' drive: ' + e.message.slice(0, 160)));
  for (const s of SEATS) await pages[s].close();
  notes.push(`${tag}: ${states} screens measured, ${scrolled} with a code box that scrolls (deepest ${deepest}px), worst ${worst}px`);
  return { scrolled };
}
(async () => {
  const srv = await serve(PORT);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  for (const [W, H] of SIZES) {
    const r = await run(browser, W, H);
    if (W === 1366 && H === 625 && !r.scrolled) fails.push('1366x625: no code box scrolled, so the gate measured nothing (chapter 4 should scroll on a school PC)');
  }
  await browser.close(); srv.close();
  notes.forEach(n => console.log(n));
  const shown = fails.slice(0, 12); shown.forEach(f => console.log('FAIL ' + f)); if (fails.length > shown.length) console.log('… and ' + (fails.length - shown.length) + ' more');
  console.log('l5v2-gutter' + (CONTROL ? ' (CONTROL)' : '') + ': ' + (fails.length ? 'RED ' + fails.length : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(2); });
