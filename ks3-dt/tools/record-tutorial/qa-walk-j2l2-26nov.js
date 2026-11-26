/* qa-walk-j2l2-26nov — the three code faults the live walk of J2 Lesson 2 found (26 Nov 2026).
   1. THE NEVER-CLOSED BRACKET. A four-line program whose last line opens a bracket and never closes
      it was told "line 5" (Skulpt reports the line after the program ends). Every lesson's words say
      "on that line", so she was sent to a line that does not exist. The number must now be 4.
   2. THE DESK'S MESSAGE. On the matching desk at school-PC size (1366x625) a wrong pair bounced, but
      the sentence telling her so sat below the fold, plain grey. It must now be on screen, marked wrong.
   3. THE NEXT BUILD. "Next step" sits at the foot of a finished build; the new build drew underneath
      a page still scrolled to the bottom, so she landed mid-way down an empty tray. It must start at
      the top, with the new build's goal on screen.
   CONTROL=1 serves origin/main's engines.js and style.css: every one of the three must fail.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-walk-j2l2-26nov.js [--port=8864] */
const puppeteer = require('puppeteer'), path = require('path'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8864), CONTROL = process.env.CONTROL === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0; const FAILS = [];
const check = (ok, msg) => { if (ok) PASS++; else FAILS.push(msg); console.log((ok ? '  ok    ' : '  FAIL  ') + msg); };
const OLD = CONTROL ? {
  'engines.js': execFileSync('git', ['show', 'origin/main:ks3-dt/platform/engines.js'], { cwd: ROOT, maxBuffer: 1 << 27 }),
  'style.css': execFileSync('git', ['show', 'origin/main:ks3-dt/platform/style.css'], { cwd: ROOT, maxBuffer: 1 << 27 })
} : null;

async function open(browser) {
  const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 625 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.__errs = errs;
  if (CONTROL) {
    await page.setRequestInterception(true);
    page.on('request', q => {
      const m = /\/platform\/(engines\.js|style\.css)(\?|$)/.exec(q.url());
      if (m) q.respond({ status: 200, contentType: m[1].endsWith('.js') ? 'text/javascript' : 'text/css', body: OLD[m[1]] });
      else q.continue();
    });
  }
  const url = `http://localhost:${PORT}/ks3-dt/platform/index.html?class=Demo-9A&as=aoife`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
  await sleep(500);
  await page.evaluate(() => {
    const past = Date.now() - 3 * 864e5, cls = 'Demo-9A';
    (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
    const s = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
    s.locks = s.locks || {}; s.locks[cls] = s.locks[cls] || {};
    (App.state.man.lessons || []).forEach(l => { s.locks[cls][String(l.num)] = { u: 1, on: 1 }; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(s));
    App.state.absence = [];
    App.openLesson('j2-02', {});
  });
  await page.waitForFunction(() => App.state.lesson && !document.querySelector('#player').hidden && App.state.chunks && App.state.chunks.length, { timeout: 20000 });
  await sleep(800);
  return page;
}
const goTo = async (page, id) => {
  for (let n = 0; n < 8; n++) {
    const cur = await page.evaluate(() => App.state.chunks[App.state.chunkIdx].id);
    if (cur === id) break;
    await page.evaluate(() => App.nextChunk()); await sleep(700);
  }
  /* the intro card's begin button opens the desk */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#player .primary-btn')].find(x => x.offsetParent && !x.disabled);
    if (b) b.click();
  });
  await sleep(700);
};

(async () => {
  const srv = spawn('node', [path.join(ROOT, 'ks3-dt/tools/dev-static.js'), String(PORT), ROOT], { stdio: 'ignore' });
  await sleep(700);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    console.log(CONTROL ? '(CONTROL: origin/main engines.js + style.css — every check below should FAIL)' : '');

    /* ---- 1. the never-closed bracket names its own line ---- */
    console.log('\n== 1. unclosed bracket on the last line of a four-line program');
    let page = await open(browser);
    const prog = 'score = 0\nscore = score + 1\nscore = score + 1\nprint("Score: " + str(score)';
    const r = await page.evaluate(async src => { const x = await PyRun.run(src, {}); return { ok: x.ok, err: String(x.err || ''), offline: !!x.offline }; }, prog);
    const n = (/line (\d+)/.exec(r.err) || [])[1];
    check(!r.ok && !r.offline && n === '4', `the error names line 4, the line the bracket opened on (said "${r.err.slice(0, 90)}")`);
    const good = await page.evaluate(async () => { const x = await PyRun.run('score = 0\nscore = score + 2\nprint("Score: " + str(score))', {}); return { ok: x.ok, out: x.out }; });
    check(good.ok && /Score: 2/.test(String(good.out)), `a correct program still runs and prints (ok ${good.ok})`);
    const other = await page.evaluate(async () => { const x = await PyRun.run('print(Score)', {}); return String(x.err || ''); });
    check(/NameError/.test(other) && /line 1/.test(other), `a different error is left as Python said it ("${other.slice(0, 60)}")`);

    /* ---- 2. the desk's message after a wrong pair is on screen and marked wrong ---- */
    console.log('\n== 2. matching desk, wrong pair, at 1366x625');
    await goTo(page, 'bureau');
    let wrong = null;
    for (let tries = 0; tries < 12 && !wrong; tries++) {
      /* pick the first unsolved block, then the LAST Python line on the desk (the lowest on screen) */
      const blk = await page.$('.snap-block'); if (!blk) break;
      await blk.click(); await sleep(250);
      const pys = await page.$$('.snap-py'); if (!pys.length) break;
      const target = pys[pys.length - 1];
      await target.click(); await sleep(120);
      const st = await page.evaluate(() => {
        const say = document.querySelector('.snap-say'), r = say.getBoundingClientRect();
        return { bounced: !!document.querySelector('.snap-py.bounce'), cls: say.className, text: say.textContent.trim(),
          onScreen: r.top >= 0 && r.bottom <= innerHeight && r.height > 0, scrollY: scrollY };
      });
      if (st.bounced) wrong = st;
      await sleep(900);
    }
    check(!!wrong, 'a wrong pair was made on the desk (the lines bounced)');
    if (wrong) {
      check(/\bis-wrong\b/.test(wrong.cls), `the desk's sentence is marked wrong (class "${wrong.cls}")`);
      check(wrong.onScreen, `the desk's sentence is on screen at 1366x625 after the wrong pair (scrollY ${wrong.scrollY})`);
    }
    check(!page.__errs.length, `no page errors (${page.__errs.slice(0, 2).join(' | ')})`);
    await page.close();

    /* ---- 3. the next build starts at the top ---- */
    console.log('\n== 3. finish build 1, press Next step');
    page = await open(browser);
    await goTo(page, 'build');
    const want = ['score = 0', 'score = score + 1', 'score = score + 1', 'print("Score: " + str(score))'];
    for (const w of want) {
      const ok = await page.evaluate(w => {
        const b = [...document.querySelectorAll('.pyrun-line.in-tray')].find(x => x.querySelector('code') && x.querySelector('code').textContent.trim() === w);
        if (!b) return false; b.click(); return true;
      }, w);
      if (!ok) { check(false, `tray line "${w}" was found`); break; }
      await sleep(250);
    }
    await page.evaluate(() => { const b = document.querySelector('.pyrun-run'); if (b && !b.disabled) b.click(); });
    await page.waitForFunction(() => document.querySelector('.pyrun-verdict.is-matched'), { timeout: 20000 }).catch(() => {});
    const matched = await page.evaluate(() => !!document.querySelector('.pyrun-verdict.is-matched'));
    check(matched, 'build 1 is MATCHED');
    await sleep(1600);   /* App.armButton ignores a click inside App.GHOST_MS of the button appearing */
    const goBtn = await page.$('.pyrun-verdict.is-matched .primary-btn');
    if (goBtn) {
      await goBtn.click();   /* puppeteer scrolls it into view first, as her own scrolling did */
      await sleep(900);
      const after = await page.evaluate(() => {
        const goal = document.querySelector('#player .pyrun-goal, #player .card h2'), r = goal ? goal.getBoundingClientRect() : null;
        return { scrollY: scrollY, goalText: goal ? goal.textContent.trim().slice(0, 50) : '', goalOn: !!r && r.top >= 0 && r.bottom <= innerHeight };
      });
      check(after.scrollY === 0, `the next build opens at the top of the page (scrollY ${after.scrollY})`);
      check(after.goalOn && /star/i.test(after.goalText), `the next build's goal is on screen ("${after.goalText}")`);
    } else check(false, 'the Next step button was there after MATCHED');
    check(!page.__errs.length, `no page errors (${page.__errs.slice(0, 2).join(' | ')})`);
    await page.close();
  } finally { await browser.close(); srv.kill(); }
  console.log(FAILS.length ? `\nFAILED ${FAILS.length} of ${PASS + FAILS.length} checks` : `\nPASSED all ${PASS} checks`);
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
