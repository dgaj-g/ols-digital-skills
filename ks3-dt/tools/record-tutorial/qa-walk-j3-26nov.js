/* qa-walk-j3-26nov — faults the 26 Nov walks of the J3 lessons found.
   1. BEGIN ON A HALF-DONE LESSON (J3 L1). Aoife left Lesson 1 part-way. No lesson was finished yet, so the
      big hub button said "Begin: Lesson 1" although she had begun it. It must say "Continue:" once she has a
      record for that lesson, and still "Begin:" when she has none.
   2. "NOTHING HERE YET" ONE WORD A LINE (J3 L2). V88 made Your program a two-column grid (number, line),
      and the empty-program line caught the grid too, so it sat in the 28px number column, one word to a
      line, a tall thin stripe. It must be one plain line again.
   3. CODE INSIDE A QUESTION (J3 L4 Do-Now). A stem such as "Which one does `playlist[2]` give you?" showed
      the backticks as typed. Code inside a sentence must show in the code face, with no backticks left.
   4. RUN STAYS GREY (J3 L4 The Rescue). The card says "press Run the plan", but Run stayed grey until the
      typed line was handed in with Enter. While a line sits typed in the box, Run must be lit, and pressing
      it hands the line in (as Enter does), then runs if the plan is ready.
   CONTROL=1 serves origin/main's app.js, style.css, engines.js and the Rescue's hour.js: every [engine]
   check must fail.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-walk-j3-26nov.js [--port=8878] */
const puppeteer = require('puppeteer'), path = require('path'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8878), CONTROL = process.env.CONTROL === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0; const FAILS = []; let ENGINE_FAILS = 0, ENGINE_ALL = 0;
const check = (ok, msg, kind) => {
  if (kind === 'engine') { ENGINE_ALL++; if (!ok) ENGINE_FAILS++; }
  if (ok) PASS++; else FAILS.push(msg);
  console.log((ok ? '  ok    ' : '  FAIL  ') + '[' + (kind || 'setup') + '] ' + msg);
};
const old = f => execFileSync('git', ['show', 'origin/main:ks3-dt/platform/' + f], { cwd: ROOT, maxBuffer: 1 << 27 });
const OLD = CONTROL ? {
  'app.js': old('app.js'), 'style.css': old('style.css'), 'engines.js': old('engines.js'),
  'hour.js': old('assets/rescue/rescue/hour.js')
} : null;
async function serveOld(page) {
  if (!CONTROL) return;
  await page.setRequestInterception(true);
  page.on('request', q => {
    const m = /\/platform\/(app\.js|style\.css|engines\.js)(\?|$)/.exec(q.url()) || /\/rescue\/rescue\/(hour\.js)(\?|$)/.exec(q.url());
    if (m) q.respond({ status: 200, contentType: m[1].endsWith('.js') ? 'text/javascript' : 'text/css', body: OLD[m[1]] });
    else q.continue();
  });
}

async function openHub(browser) {
  const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 625 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.__errs = errs;
  await serveOld(page);
  const url = `http://localhost:${PORT}/ks3-dt/platform/index.html?class=Demo-10A&as=aoife`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
  await sleep(500);
  return page;
}
const ctaFor = (page, rec) => page.evaluate((rec) => {
  const past = Date.now() - 3 * 864e5;
  (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: l.num === 1 ? 1 : 0 }; });
  App.state.absence = [];
  App.state.me = App.state.me || {}; App.state.me.L = rec ? { '1': rec } : {};
  App.showHub();
  const b = document.querySelector('#hero-cta');
  return b && !b.hidden ? b.textContent : '(hidden)';
}, rec);

(async () => {
  let srv = null;
  try { execFileSync('curl', ['-sf', '-o', '/dev/null', `http://localhost:${PORT}/ks3-dt/platform/index.html`]); }
  catch (e) {
    srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
    await sleep(1200);
  }
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    console.log('1. Begin / Continue on the hub (J3 L1)' + (CONTROL ? '  [CONTROL: origin/main app.js]' : ''));
    const page = await openHub(browser);
    const fresh = await ctaFor(page, null);
    check(/^Begin: Lesson 1\b/.test(fresh), 'no record for Lesson 1 -> "Begin: Lesson 1" (got "' + fresh + '")', 'setup');
    const part = await ctaFor(page, [1]);
    check(/^Continue: Lesson 1\b/.test(part), 'Lesson 1 part-done, none finished -> "Continue: Lesson 1" (got "' + part + '")', 'engine');
    check(page.__errs.length === 0, 'no page errors (' + page.__errs.join(' | ') + ')', 'setup');

    console.log('\n2. The empty Your program line (J3 L2 callsheet-a)');
    await page.evaluate(() => {
      const past = Date.now() - 3 * 864e5;
      (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
      App.state.absence = []; App.state.me.L = {};
      App.openLesson('j3-02', {});
    });
    await page.waitForFunction(() => App.state.lesson && App.state.chunks && App.state.chunks.length && !document.querySelector('#player').hidden, { timeout: 20000 });
    await sleep(600);
    for (let n = 0; n < 6; n++) {
      if (await page.evaluate(() => App.state.chunks[App.state.chunkIdx].id) === 'callsheet-a') break;
      await page.evaluate(() => App.nextChunk()); await sleep(600);
    }
    check(await page.evaluate(() => App.state.chunks[App.state.chunkIdx].id) === 'callsheet-a', 'reached callsheet-a', 'setup');
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /Open the call sheet/.test(b.textContent) && b.offsetParent); if (b) b.click(); });
    await page.waitForSelector('.pyp-list li.pyp-empty', { visible: true, timeout: 10000 }).catch(() => {});
    const empty = await page.evaluate(() => {
      const li = document.querySelector('.pyp-list li.pyp-empty'); if (!li || !li.offsetParent) return null;
      const r = li.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), t: li.textContent.trim() };
    });
    check(!!empty, 'the empty-program line is on screen' + (empty ? ' ("' + empty.t + '")' : ''), 'setup');
    check(!!empty && empty.h < 60, 'it is one plain line, under 60px tall (got ' + (empty ? empty.h + 'px tall, ' + empty.w + 'px wide' : 'none') + ')', 'engine');
    check(page.__errs.length === 0, 'no page errors (' + page.__errs.join(' | ') + ')', 'setup');

    console.log('\n3. Code inside a question stem (J3 L4 Do-Now)');
    const stem = await page.evaluate(async () => {
      const host = document.createElement('div'); host.id = 'qa-stem-host'; document.body.appendChild(host);
      Engines.exitcheck.mount(host, { config: { intro: 'Five questions.', items: [{ id: 'qa1',
        stem: 'A list holds four titles. Which one does `playlist[2]` give you?', options: ['The first', 'The third', 'The last'], correct: 1 }] } },
        { review: true, next: function () {}, saveEvent: function () {} });
      await new Promise(r => setTimeout(r, 1200));   // App.armButton ignores a click in the first moment after a screen appears (DFM 104)
      const go = [...host.querySelectorAll('button')].find(b => /Ready|Start/.test(b.textContent)); if (go) go.click();
      await new Promise(r => setTimeout(r, 400));
      const h = host.querySelector('.q-stem'); if (!h) return null;
      const c = h.querySelector('code.q-icode');
      const r = { text: h.textContent, code: c ? c.textContent : null, mono: c ? getComputedStyle(c).fontFamily : '' };
      host.remove(); return r;
    });
    check(!!stem, 'the question stem is on screen' + (stem ? ' ("' + stem.text + '")' : ''), 'setup');
    check(!!stem && stem.code === 'playlist[2]' && /mono|Menlo|Consolas|Courier/i.test(stem.mono), 'playlist[2] shows in the code face (got ' + (stem ? (stem.code === null ? 'no code face' : '"' + stem.code + '" in ' + stem.mono) : 'none') + ')', 'engine');
    check(!!stem && stem.text.indexOf('`') < 0, 'no backtick is left in the stem', 'engine');
    await page.close();

    console.log('\n4. Run is lit while a line is typed (J3 L4 The Rescue, the lane plan)');
    const rp = await browser.newPage(); await rp.setViewport({ width: 1366, height: 625 });
    const rerrs = []; rp.on('pageerror', e => rerrs.push(e.message));
    await serveOld(rp);
    await rp.goto(`http://localhost:${PORT}/ks3-dt/probes/rescue/hour.html?h=l_plan&hfresh&mute&hspeed=6`, { waitUntil: 'domcontentloaded' });
    await rp.waitForFunction(() => window.Hour && Hour.id === 'l_plan' && Hour.input, { timeout: 30000 }).catch(() => {});
    check(await rp.evaluate(() => !!(window.Hour && Hour.id === 'l_plan' && Hour.input)), 'the lane plan is asking for a line', 'setup');
    const st = () => rp.evaluate(() => ({ dis: document.getElementById('hrun').disabled, sub: document.getElementById('hsub').textContent, box: document.getElementById('hinp').value, id: Hour.id }));
    check((await st()).dis === true, 'with the box empty and no dash in the plan, Run is grey', 'setup');
    await rp.focus('#hinp'); await rp.keyboard.type('dash()', { delay: 30 }); await sleep(200);
    check((await st()).dis === false, 'with dash() typed in the box, Run is lit', 'engine');
    await rp.click('#hrun'); await sleep(700);
    let s1 = await st();
    check(/^1 of 5 dashes/.test(s1.sub) && s1.box === '', 'pressing Run hands the line in: "' + s1.sub + '", box ' + (s1.box ? '"' + s1.box + '"' : 'empty'), 'engine');
    check(s1.dis === true && s1.id === 'l_plan', 'the plan is not ready yet, so Run is grey again and the plan does not run', 'setup');
    for (let n = 2; n <= 4; n++) { await rp.focus('#hinp'); await rp.keyboard.type('dash()', { delay: 20 }); await rp.keyboard.press('Enter'); await sleep(600); }
    await rp.focus('#hinp'); await rp.keyboard.type('dash()', { delay: 20 }); await sleep(200);
    await rp.click('#hrun'); await sleep(900);
    s1 = await st();
    check(s1.id !== 'l_plan', 'the fifth dash typed and Run pressed: the line goes in and the plan runs (now at ' + s1.id + ')', 'engine');
    check(rerrs.length === 0, 'no page errors (' + rerrs.join(' | ') + ')', 'setup');
    await rp.close();

    console.log('\n5. The results card repeats each question with its code in the code face (J3 L6 close)');
    const hp = await openHub(browser);
    await hp.evaluate(() => {
      const past = Date.now() - 3 * 864e5;
      (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
      App.state.absence = []; App.state.me = App.state.me || {}; App.state.me.L = {};
      App.openLesson('j3-06', {});
    });
    await hp.waitForFunction(() => App.state.lesson && App.state.chunks && App.state.chunks.length && !document.querySelector('#player').hidden, { timeout: 20000 });
    await sleep(600);
    const card = await hp.evaluate(async () => {
      const ex = App.state.chunks.find(c => c.engine === 'exitcheck'), cl = App.state.chunks.find(c => c.engine === 'selfeval');
      if (!ex || !cl) return { err: 'no exit or close chunk' };
      const items = ex.config.items; App.state._exitItems = items; App.state._exitAnswers = items.map(() => 0);
      const keep = App.submitExit;
      App.submitExit = (p, cb) => cb({ feedback: items.map(it => ({ correct: false, correctIdx: it.correct, explain: 'x' })) });
      const host = document.createElement('div'); host.id = 'qa-se-host'; document.body.appendChild(host);
      try {
        Engines.selfeval.mount(host, cl, { review: false, next() {}, saveEvent() {} });
        host.querySelectorAll('.se-chips[data-row]').forEach(r => { const b = r.querySelector('.se-chip[data-v="2"]'); if (b) b.click(); });
        const d = host.querySelector('.se-chip[data-d="1"]'); if (d) d.click();
        const go = host.querySelector('.se-submit'); if (!go || go.disabled) return { err: 'Send & finish did not wake (' + (go ? 'disabled' : 'missing') + ')' };
        go.click(); await new Promise(r => setTimeout(r, 300));
        const qs = [...host.querySelectorAll('.exit-fb-q')];
        const codes = [...host.querySelectorAll('.exit-fb-q code.q-icode, .exit-fb-q .q-code')].map(c => ({ t: c.textContent, f: getComputedStyle(c).fontFamily }));
        return { n: qs.length, text: qs.map(q => q.textContent).join(' | '), codes };
      } finally { App.submitExit = keep; host.remove(); }
    });
    check(!card.err && card.n === 5, 'the results card repeats all five questions (' + (card.err || card.n + ' shown') + ')', 'setup');
    const between = (card.codes || []).find(c => c.t === 'day_no BETWEEN 40 AND 46');
    check(!!between && /mono|Menlo|Consolas|Courier/i.test(between.f), 'day_no BETWEEN 40 AND 46 shows in the code face (codes found: ' + JSON.stringify((card.codes || []).map(c => c.t)) + ')', 'engine');
    check(!card.err && (card.text || '').indexOf('`') < 0, 'no backtick is left on the results card', 'engine');
    check(hp.__errs.length === 0, 'no page errors (' + hp.__errs.join(' | ') + ')', 'setup');
    await hp.close();
  } finally {
    await browser.close(); if (srv) srv.kill();
  }
  console.log('\n' + PASS + ' passed, ' + FAILS.length + ' failed' + (CONTROL ? ('; engine checks failing under CONTROL: ' + ENGINE_FAILS + ' of ' + ENGINE_ALL) : ''));
  if (CONTROL) process.exit(ENGINE_FAILS === ENGINE_ALL ? 0 : 1);
  process.exit(FAILS.length ? 1 : 0);
})();
