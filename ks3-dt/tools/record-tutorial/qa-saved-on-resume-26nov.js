/* qa-saved-on-resume-26nov — a pupil who comes back into a lesson sees the green "Saved" word.
   26 Nov 2026 live walk of J2 L1: workbench step 3 says "Look along the top of this screen ... for a
   small green word: Saved." A pupil who had reloaded the page came back to the workbench with the
   word hidden (it only appeared on her NEXT save), so the step sent her looking for a thing that was
   not there. Her place came back from her saved record, so everything she had done WAS saved: the word
   now shows the moment a lesson resumes part-way through.
   Checks, for J2 L1 and J3 L1 (the two lessons whose step points at the word), at 1366x625:
     - a brand-new lesson (nothing saved yet): the word stays hidden until the first save;
     - after the first part is finished: the word reads Saved;
     - reload and come back in: she resumes past part 1 AND the word reads Saved, on screen;
     - a re-read of a finished lesson (review): the word stays hidden (nothing is being saved).
   CONTROL=1 serves origin/main's app.js: the resume check must fail.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-saved-on-resume-26nov.js [--port=8863] */
const puppeteer = require('puppeteer'), path = require('path'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8863), CONTROL = process.env.CONTROL === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0; const FAILS = [];
const check = (ok, msg) => { if (ok) PASS++; else FAILS.push(msg); console.log((ok ? '  ok    ' : '  FAIL  ') + msg); };
const OLD = CONTROL ? execFileSync('git', ['show', 'origin/main:ks3-dt/platform/app.js'], { cwd: ROOT, maxBuffer: 1 << 27 }) : null;
const CASES = [['j2-01', 'Demo-9A', 'aoife'], ['j3-01', 'Demo-10A', 'orla']];

async function open(browser, cls, who, fresh) {
  const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 625 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.__errs = errs;
  if (CONTROL) {
    await page.setRequestInterception(true);
    page.on('request', q => { if (/\/platform\/app\.js(\?|$)/.test(q.url())) q.respond({ status: 200, contentType: 'text/javascript', body: OLD }); else q.continue(); });
  }
  const url = `http://localhost:${PORT}/ks3-dt/platform/index.html?class=${cls}&as=${who}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (fresh) { await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await page.goto(url, { waitUntil: 'domcontentloaded' }); }
  await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
  await sleep(600);
  return page;
}
const unlockAndOpen = (page, id, review) => page.evaluate((id, review) => {
  const past = Date.now() - 3 * 864e5;
  (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
  /* the preview server keeps its own locks (as the real one does): open them there too, or every save is refused */
  const cls = new URLSearchParams(location.search).get('class');
  const s = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
  s.locks = s.locks || {}; s.locks[cls] = s.locks[cls] || {};
  (App.state.man.lessons || []).forEach(l => { const k = String(l.num), cur = s.locks[cls][k] || {}; s.locks[cls][k] = { u: cur.u || 1, on: 1 }; });
  localStorage.setItem('ks3dt-dev', JSON.stringify(s));
  App.state.absence = [];
  if (review) { App.state.me.L = App.state.me.L || {}; (App.state.man.lessons || []).forEach(l => { App.state.me.L[String(l.num)] = [2]; }); }
  App.openLesson(id, {});
}, id, review);
const waitPlayer = page => page.waitForFunction(() => App.state.lesson && !document.querySelector('#player').hidden && App.state.chunks && App.state.chunks.length, { timeout: 20000 }).then(() => sleep(900));
const chip = page => page.evaluate(() => {
  const c = document.getElementById('save-chip'); const r = c.getBoundingClientRect();
  return { shown: !c.hidden && r.width > 0, text: c.textContent.trim(), onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, idx: App.state.chunkIdx, review: !!App.state.review };
});

(async () => {
  const srv = spawn('node', [path.join(ROOT, 'ks3-dt/tools/dev-static.js'), String(PORT), ROOT], { stdio: 'ignore' });
  await sleep(700);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    for (const [id, cls, who] of CASES) {
      console.log('\n== ' + id + (CONTROL ? ' (CONTROL: origin/main app.js)' : ''));
      let page = await open(browser, cls, who, true);
      await unlockAndOpen(page, id, false); await waitPlayer(page);
      let c = await chip(page);
      check(c.idx === 0 && !c.shown, `${id} brand new: starts at part 1 with the word hidden (idx ${c.idx}, shown ${c.shown})`);
      await page.evaluate(() => App.nextChunk());
      /* the preview server answers a save after a short made-up delay, as the real one does */
      await page.waitForFunction(() => /^Saved/.test(document.getElementById('save-chip').textContent.trim()), { timeout: 12000 }).catch(() => {});
      await sleep(300);
      c = await chip(page);
      check(c.idx === 1 && c.shown && /^Saved/.test(c.text), `${id} after part 1: the word reads Saved ("${c.text}", shown ${c.shown}, idx ${c.idx})`);
      await page.close();

      page = await open(browser, cls, who, false);
      await unlockAndOpen(page, id, false); await waitPlayer(page);
      c = await chip(page);
      check(c.idx >= 1, `${id} reload: she comes back past part 1 (idx ${c.idx})`);
      check(c.shown && /^Saved/.test(c.text) && c.onScreen, `${id} reload: the word reads Saved and is on screen ("${c.text}", shown ${c.shown}, on screen ${c.onScreen})`);
      check(!page.__errs.length, `${id}: no page errors (${page.__errs.slice(0, 2).join(' | ')})`);
      await page.close();

      page = await open(browser, cls, who, false);
      await unlockAndOpen(page, id, true); await waitPlayer(page);
      c = await chip(page);
      check(c.review && !c.shown, `${id} re-read of a finished lesson: the word stays hidden (review ${c.review}, shown ${c.shown})`);
      await page.close();
    }
  } finally { await browser.close(); srv.kill(); }
  console.log(FAILS.length ? `\nFAILED ${FAILS.length} of ${PASS + FAILS.length} checks` : `\nPASSED all ${PASS} checks`);
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
