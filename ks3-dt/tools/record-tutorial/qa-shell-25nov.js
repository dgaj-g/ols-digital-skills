/* THE SHELL, AS ONE PUPIL MEETS IT · four faults from the 25 Nov 2026 live walk (J2-Test pupil, school-PC size).
   1  HUB BUTTON. A pupil marked absent for Lessons 2-4 while her class is on Lesson 5: the big button said
      "Continue: Lesson 2" and opened Lesson 2 as a CLASS lesson ("While everyone logs in"). Now it points at
      today's lesson; and when every open lesson is one she missed, it says "Catch up" and opens the catch-up.
   2  CATCH-UP CARD. 37 words, and a heading that promised a summary it never gave. Now 25 words or fewer.
   3  WARM-UP TITLE. A pupil catching up alone was told "While everyone logs in…". Now "First, a quick warm-up".
   4  WARM-UP FEEDBACK. After an answer the page scrolled the question and her own answer off the top. Now the
      question, her answer and the Next button are all on screen together, for every warm-up question, at two heights.
   5  STORY NAME on the year map: readable (contrast 4.5 or more against the tile it sits on), every year.
   CONTROL=1 serves app.js, engines.js and style.css as they are on origin/main: the gate must go RED.
   NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-shell-25nov.js [--port=8853] */
const puppeteer = require('puppeteer'), path = require('path'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8853), CONTROL = process.env.CONTROL === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0; const FAILS = [];
const check = (ok, msg) => { if (ok) { PASS++; console.log('  PASS  ' + msg); } else { FAILS.push(msg); console.log('  FAIL  ' + msg); } };
const OLD = {};
if (CONTROL) ['app.js', 'engines.js', 'style.css'].forEach(f => { OLD[f] = execFileSync('git', ['show', 'origin/main:ks3-dt/platform/' + f], { cwd: ROOT, maxBuffer: 1 << 27 }); });
const words = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;

async function freshPage(browser, w, h) {
  const page = await browser.newPage(); await page.setViewport({ width: w, height: h });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.__errs = errs;
  if (CONTROL) {
    await page.setRequestInterception(true);
    page.on('request', q => {
      const m = q.url().match(/\/platform\/(app\.js|engines\.js|style\.css)(\?|$)/);
      if (m) q.respond({ status: 200, contentType: m[1].endsWith('.css') ? 'text/css' : 'text/javascript', body: OLD[m[1]] }); else q.continue();
    });
  }
  await page.goto(`http://localhost:${PORT}/ks3-dt/platform/index.html?class=Demo-8A&as=gate25`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
  await sleep(900);
  return page;
}
/* the class has opened Lessons 1-5; she finished Lesson 1; `absent` are the lessons she missed */
const setClass = (page, absent) => page.evaluate((absent) => {
  const past = Date.now() - 3 * 864e5;
  App.state.locks = {}; [1, 2, 3, 4, 5].forEach(n => { App.state.locks[String(n)] = { u: past, on: 1 }; });
  App.state.me.L = { '1': [2] }; App.state.absence = absent.slice();
  App.showHub();
}, absent);
/* she finished Lessons 1-4 (so the warm-up has questions to ask) and missed Lesson 5: on the server too */
const setSolo = (page) => page.evaluate(() => {
  const past = Date.now() - 3 * 864e5, L = { '1': [2], '2': [2], '3': [2], '4': [2] };
  const st = JSON.parse(localStorage.getItem('ks3dt-dev'));
  const key = Object.keys(st.pupils).find(k => /^Demo-8A:anya\./.test(k));
  st.pupils[key].L = JSON.parse(JSON.stringify(L)); localStorage.setItem('ks3dt-dev', JSON.stringify(st));
  App.state.locks = {}; [1, 2, 3, 4, 5].forEach(n => { App.state.locks[String(n)] = { u: past, on: 1 }; });
  App.state.me.L = L; App.state.absence = ['j1-05'];
  App.showHub();
});
const hero = page => page.evaluate(() => { const b = document.querySelector('#hero-cta'); return b && !b.hidden ? b.textContent.trim() : ''; });
const clickByText = async (page, re) => {
  const h = await page.evaluateHandle((src) => Array.from(document.querySelectorAll('#player button, .chunk-host button')).find(x => new RegExp(src, 'i').test(x.textContent) && !x.disabled && x.offsetParent) || null, re);
  const e = h.asElement(); if (!e) return false; await e.click(); return true;
};

(async () => {
  const srv = spawn('node', [path.join(ROOT, 'ks3-dt/tools/dev-static.js'), String(PORT), ROOT], { stdio: 'ignore' });
  await sleep(700);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    console.log('\n== 1 · the hub button ==');
    let page = await freshPage(browser, 1366, 625);
    await setClass(page, ['j1-02', 'j1-03', 'j1-04']);
    let t = await hero(page);
    check(/Lesson 5\b/.test(t), 'absent for 2-4, class on 5: the button points at Lesson 5 ("' + t + '")');
    await page.click('#hero-cta'); await sleep(1500);
    let st = await page.evaluate(() => ({ id: App.state.lesson && App.state.lesson.id, cu: !!App.state.catchup }));
    check(st.id === 'j1-05' && !st.cu, 'and opens Lesson 5 with the class (' + st.id + ', catch-up ' + st.cu + ')');
    await page.close();

    page = await freshPage(browser, 1366, 625);
    await setClass(page, ['j1-02', 'j1-03', 'j1-04', 'j1-05']);
    t = await hero(page);
    check(/^Catch up: Lesson 2\b/.test(t), 'every open lesson missed: the button says "Catch up: Lesson 2" ("' + t + '")');
    await page.click('#hero-cta'); await sleep(1500);
    st = await page.evaluate(() => ({ id: App.state.lesson && App.state.lesson.id, cu: !!App.state.catchup, card: (document.querySelector('.catchup-card') || {}).innerText || '' }));
    check(st.id === 'j1-02' && st.cu, 'and opens Lesson 2 as a catch-up (' + st.id + ', catch-up ' + st.cu + ')');

    console.log('\n== 2 · the catch-up card ==');
    check(st.card && words(st.card) <= 25, 'the catch-up card is 25 words or fewer (' + words(st.card) + ')');
    check(!/what happened/i.test(st.card), 'its heading promises nothing the card does not give');

    await page.close();

    console.log('\n== 3 · the warm-up title when she is on her own ==');
    page = await freshPage(browser, 1366, 625);
    await setSolo(page);
    t = await hero(page);
    check(/^Catch up: Lesson 5\b/.test(t), 'Lessons 1-4 done, Lesson 5 missed: "Catch up: Lesson 5" ("' + t + '")');
    await page.click('#hero-cta'); await sleep(1500);
    await clickByText(page, '^Start the (lesson|catch-up)'); await sleep(2000);
    const ttl = await page.evaluate(() => { const c = document.querySelector('.chunk-host .intro-card h2, .chunk-host h2'); return c ? c.textContent.trim() : ''; });
    check(/^First, a quick warm-up$/.test(ttl), 'the warm-up says "First, a quick warm-up" ("' + ttl + '")');
    check(!/logs in/i.test(await page.evaluate(() => document.querySelector('.chunk-host').innerText)), 'nothing says "while everyone logs in"');
    await page.close();

    console.log('\n== 4 · warm-up feedback keeps the question on screen ==');
    for (const H of [625, 540]) {
      page = await freshPage(browser, 1366, H);
      await setSolo(page);
      await page.click('#hero-cta'); await sleep(1500);
      await clickByText(page, '^Start the (lesson|catch-up)'); await sleep(2000);
      await clickByText(page, '^Warm up'); await sleep(1200);
      let n = 0, bad = [];
      for (let q = 0; q < 8; q++) {
        const opt = await page.$('.chunk-host .q-opt:not([disabled])');
        if (!opt) break;
        /* she reads from the top, then clicks her answer (the last option: wrong as often as right) */
        await page.evaluate(() => { window.scrollTo(0, 0); const s = document.querySelector('.chunk-host .q-stem'); if (s) s.scrollIntoView({ block: 'start' }); });
        const opts = await page.$$('.chunk-host .q-opt:not([disabled])');
        await opts[opts.length - 1].click();
        await page.waitForFunction(() => { const f = document.querySelector('.chunk-host .q-feedback'); return f && !f.hidden && f.querySelector('button'); }, { timeout: 8000 });
        await sleep(500);
        const v = await page.evaluate((H) => {
          const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.height > 0 && r.top >= -1 && r.bottom <= H + 1; };
          const stem = document.querySelector('.chunk-host .q-stem');
          const mine = document.querySelector('.chunk-host .q-opt.right, .chunk-host .q-opt.wrong');
          const btn = document.querySelector('.chunk-host .q-feedback button');
          return { stem: vis(stem), mine: vis(mine), btn: vis(btn), focus: document.activeElement === btn };
        }, H);
        n++;
        if (!(v.stem && v.mine && v.btn)) bad.push('Q' + n + JSON.stringify(v));
        await page.click('.chunk-host .q-feedback button'); await sleep(900);
      }
      check(n >= 3, 'at ' + H + 'px high the warm-up ran ' + n + ' questions');
      check(bad.length === 0, 'at ' + H + 'px high: question, her answer and Next on screen together after every answer' + (bad.length ? ' (' + bad.join(' ') + ')' : ''));
      check(page.__errs.length === 0, 'no page errors' + (page.__errs.length ? ': ' + page.__errs[0].slice(0, 120) : ''));
      await page.close();
    }

    console.log('\n== 5 · the story name on the year map ==');
    page = await freshPage(browser, 1366, 625);
    const rows = await page.evaluate(async () => {
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const bgOf = e => { for (; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const a = c.match(/[\d.]+/g); if (a && (a.length < 4 || Number(a[3]) > 0.5)) return c; } return 'rgb(255,255,255)'; };
      const out = [];
      for (const yr of ['j1', 'j2', 'j3']) {
        App.state.year = yr; document.body.setAttribute('data-year', yr);
        App.state.man.lessons.forEach((le, i) => { if (i < 3) le.story = le.story || 'The Search'; });
        App.showHub(); await new Promise(r => setTimeout(r, 300));
        const s = document.querySelector('.tile-story'); if (!s) { out.push({ yr, none: 1 }); continue; }
        const fg = getComputedStyle(s).color, bg = bgOf(s.parentElement);
        const a = lum(fg), b = lum(bg); out.push({ yr, fg, bg, ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100 });
      }
      return out;
    });
    rows.forEach(r => check(!r.none && r.ratio >= 4.5, r.yr + ': the story name reads clearly (contrast ' + r.ratio + ', ' + r.fg + ' on ' + r.bg + ')'));
    await page.close();
  } catch (e) { check(false, 'gate ran to the end: ' + e.message); }
  await browser.close(); srv.kill();
  console.log('\nqa-shell-25nov' + (CONTROL ? ' (CONTROL)' : '') + ': ' + (FAILS.length ? 'RED ' + FAILS.length + ' of ' + (PASS + FAILS.length) : 'PASS ' + PASS));
  process.exit(FAILS.length ? 1 : 0);
})();
