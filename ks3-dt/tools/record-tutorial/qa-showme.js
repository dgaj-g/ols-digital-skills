/* qa-showme — the J3 L7 help standard on every lesson part the platform itself draws (task 10, 26 Nov 2026).
   His words, 25 Nov: "there absolutely MUST have more help available and clarity for pupils who might be stuck
   all to easily". The J3 L7 standard (J3_L7_SEE_SPEC section 8; HELP_STANDARD_PLAN.md):
     - a "Your job now:" line on every screen, 14 words or fewer;
     - a green "Stuck? Show me" button beside it (the round corner button is not shown while it is);
     - the button opens a bar UNDER the job line, never over her work: 1 to 3 steps of 10 words or fewer,
       and "Still stuck? Ask the person beside you. Then put your hand up.";
     - a green ring and a short tag on the thing to use next, on screen; on a question EVERY option is ringed,
       never only the right one;
     - "Got it" and Esc close it, and closing leaves her work exactly as it was;
     - 20 s with no input: the button pulses; 40 s: the ring shows by itself.
   COVERAGE IS DERIVED, not listed: every chunk of every lesson in the three manifests whose engine the platform
   draws itself. Engines that run their own page in a frame (operation, rescue, twolights, search, headliner,
   nightdesk, see) carry their own job line and help and are left to their own gates.
   CONTROL=1 serves origin/main's app.js, style.css and index.html: every [engine] check must fail.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-showme.js [--port=8878] [--only=j3-02] */
const puppeteer = require('puppeteer'), path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), KS3 = path.join(ROOT, 'ks3-dt'), PORT = +arg('port', 8878);
let SAW_STRIP = false;   /* did this lesson draw a job line? (CONTROL repair, 26 Nov) */
const CONTROL = process.env.CONTROL === '1', ONLY = arg('only', '');
const REPORT = process.env.REPORT ? [] : null;   // REPORT=file.json: what each part rings, for a human look
const FRAME = new Set(['operation', 'rescue', 'twolights', 'search', 'headliner', 'nightdesk', 'see']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
let PASS = 0; const FAILS = []; let ENGINE_FAILS = 0, ENGINE_ALL = 0;
const check = (ok, msg, kind) => {
  if (kind === 'engine') { ENGINE_ALL++; if (!ok) ENGINE_FAILS++; }
  if (ok) PASS++; else FAILS.push(msg);
  if (!ok || process.env.VERBOSE) console.log((ok ? '  ok    ' : '  FAIL  ') + '[' + (kind || 'setup') + '] ' + msg);
  if (CONTROL && ok && kind === 'engine') console.log('  CONTROL-PASSED (must fail) ' + msg);
};
const old = f => execFileSync('git', ['show', 'origin/main:ks3-dt/platform/' + f], { cwd: ROOT, maxBuffer: 1 << 27 });
const OLD = CONTROL ? { 'app.js': old('app.js'), 'style.css': old('style.css'), 'index.html': old('index.html') } : null;

/* the lessons and their drawn chunks, from the packed content the platform serves */
function lessons() {
  const out = [];
  for (const y of ['j1', 'j2', 'j3']) {
    const man = JSON.parse(fs.readFileSync(path.join(KS3, 'content', y, 'manifest.json'), 'utf8'));
    for (const le of man.lessons || []) {
      const f = path.join(KS3, 'content', y, 'lessons', le.id + '.json');
      if (!fs.existsSync(f)) continue;
      const L = JSON.parse(fs.readFileSync(f, 'utf8'));
      const drawn = (L.chunks || []).map((c, i) => ({ i, id: c.id, engine: c.engine })).filter(c => !FRAME.has(c.engine));
      if (drawn.length && (!ONLY || ONLY.split(',').includes(le.id))) out.push({ id: le.id, num: le.num, chunks: drawn });
    }
  }
  return out;
}

async function openPage(browser, w, h) {
  const page = await browser.newPage(); await page.setViewport({ width: w || 1366, height: h || 625 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.__errs = errs;
  if (CONTROL) {
    await page.setRequestInterception(true);
    page.on('request', q => {
      const m = /\/platform\/(app\.js|style\.css|index\.html)(\?|$)/.exec(q.url());
      if (m) q.respond({ status: 200, contentType: m[1].endsWith('.js') ? 'text/javascript' : m[1].endsWith('.css') ? 'text/css' : 'text/html', body: OLD[m[1]] });
      else q.continue();
    });
  }
  const url = `http://localhost:${PORT}/ks3-dt/platform/index.html?class=Demo-10A&as=aoife`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
  await sleep(400);
  return page;
}
/* each year group has its own demo class: a J1 lesson only opens in a J1 class */
const CLASS_OF = { j1: 'Demo-8A', j2: 'Demo-9A', j3: 'Demo-10A' };
async function openLesson(page, id) {
  const cls = CLASS_OF[id.slice(0, 2)] || 'Demo-10A';
  if (page.url().indexOf('class=' + cls + '&') === -1) {
    const url = `http://localhost:${PORT}/ks3-dt/platform/index.html?class=${cls}&as=aoife`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
    await sleep(400);
  }
  await page.evaluate((id) => {
    const past = Date.now() - 3 * 864e5;
    (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
    App.state.absence = []; App.state.me = App.state.me || {}; App.state.me.L = {};
    if (window.PairKit && PairKit.stop) PairKit.stop();
    App.openLesson(id, {});
  }, id);
  await page.waitForFunction((id) => App.state.lesson && App.state.lesson.id === id && App.state.chunks && App.state.chunks.length && !document.querySelector('#player').hidden, { timeout: 20000 }, id);
  await sleep(500);
}
async function goChunk(page, idx) {
  /* jump straight to the part, as the review rail does: nothing is recorded, so no gate in front of it can stop the walk */
  await page.evaluate((idx) => { App.state.advancing = false; App.state.chunkIdx = idx; App.remountChunk(); }, idx);
  await sleep(300);
  return page.evaluate((idx) => App.state.chunkIdx === idx ? !!document.querySelector('#chunk-host').firstElementChild : 'moved', idx);
}
/* what the pupil's work looks like, with the help's own marks taken out */
const snap = page => page.evaluate(() => {
  const host = document.querySelector('#chunk-host'); if (!host) return '';
  const c = host.cloneNode(true);
  c.querySelectorAll('.sm-ring').forEach(e => e.classList.remove('sm-ring'));
  c.querySelectorAll('[class=""]').forEach(e => e.removeAttribute('class'));
  return App.state.chunkIdx + '|' + c.innerHTML;
});
const look = page => page.evaluate(() => {
  const vis = e => !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
  const r = e => { const b = e.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) }; };
  const strip = document.querySelector('#job-strip'), btn = document.querySelector('#job-help'), bar = document.querySelector('#showme-bar');
  const host = document.querySelector('#chunk-host'), beacon = document.querySelector('#help-beacon'), tag = document.querySelector('#sm-tag');
  const rings = [...document.querySelectorAll('.sm-ring')].filter(vis);
  const opts = [...document.querySelectorAll('#chunk-host .q-opt')].filter(e => vis(e) && !e.disabled);
  return {
    strip: vis(strip), lead: strip ? (strip.querySelector('.job-lead') || {}).textContent || '' : '',
    job: (document.querySelector('#job-text') || {}).textContent || '',
    btn: vis(btn) ? btn.textContent.trim() : '', btnFits: btn ? btn.scrollWidth <= btn.clientWidth + 1 : false,
    btnInStrip: !!(strip && btn && strip.contains(btn)), beacon: vis(beacon),
    bar: vis(bar), steps: bar ? [...bar.querySelectorAll('.showme-steps li')].map(li => li.textContent.trim()) : [],
    stuck: bar ? ((bar.querySelector('.showme-stuck') || {}).textContent || '').trim() : '',
    barR: vis(bar) ? r(bar) : null, hostT: host ? Math.round(host.getBoundingClientRect().top) : null,
    rings: rings.map(e => ({ r: r(e), cls: String(e.className).slice(0, 60) })), tag: vis(tag) ? tag.textContent.trim() : '',
    optN: opts.length, optRinged: opts.filter(e => e.classList.contains('sm-ring')).length,
    vh: innerHeight, scrollY: Math.round(scrollY), nudge: !!(btn && btn.classList.contains('nudge')),
    /* the words the tag lies over: a tag must point at a thing, never hide the words she is reading */
    tagHits: (() => {
      if (!vis(tag) || !host) return [];
      const tb = tag.getBoundingClientRect(), out = [];
      const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) {
        if (!n.textContent.trim() || !vis(n.parentElement)) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) {
          if (q.width < 1) continue;
          if (q.left < tb.right && q.right > tb.left && q.top < tb.bottom - 3 && q.bottom > tb.top + 3) { out.push(n.textContent.trim().slice(0, 40)); break; }
        }
      }
      return out;
    })()
  };
});
const click = (page, sel) => page.evaluate((sel) => { const b = document.querySelector(sel); if (b) b.click(); return !!b; }, sel);

async function partChecks(page, L, c) {
  const tagLbl = L.id + ' #' + (c.i + 1) + ' ' + c.id + ' (' + c.engine + ')';
  await sleep(1300);   // App.armButton ignores a click just after a screen appears (DFM 104)
  let s;
  if (c.engine === 'briefing') {
    /* while the words are still typing there is no gold button yet: the help must still point at
       something (the words she is to read), and then the card is left to finish before her "work"
       is compared, because the typing is the card's own clock, not her work */
    const typing = await page.evaluate(() => { const b = document.querySelector('#chunk-host .dossier-cta'); return !!b && b.hidden; });
    if (typing) {
      await click(page, '#job-help'); await sleep(450);
      s = await look(page);
      check(s.rings.length >= 1 && !!s.tag, tagLbl + ': while the words type, a ring and a tag ("' + s.tag + '") still show her what to do', 'engine');
      await click(page, '#showme-close'); await sleep(300);
    }
    await page.waitForFunction(() => { const b = document.querySelector('#chunk-host .dossier-cta'); return !b || !b.hidden; }, { timeout: 90000 }).catch(() => {});
    /* the gold button is capped at four lines' worth (engines.js ctaAt), so a longer card is still
       typing when it appears: wait for every line, or the typing reads as the help changing her work */
    await page.waitForFunction(() => {
      const c = App.state.chunks[App.state.chunkIdx] || {}, n = ((c.config || {}).lines || []).length;
      return document.querySelectorAll('#chunk-host .dossier-line').length >= n;
    }, { timeout: 90000 }).catch(() => {});
    await sleep(1300);
  }
  s = await look(page);
  check(s.strip && /^Your job now:$/.test(s.lead.trim()), tagLbl + ': the "Your job now:" line is on screen', 'engine');
  const jw = words(s.job);
  check(jw >= 3 && jw <= 14, tagLbl + ': the job is 3 to 14 words (' + jw + ': "' + s.job + '")', 'engine');
  check(s.btn === 'Stuck? Show me' && s.btnInStrip && s.btnFits, tagLbl + ': a green "Stuck? Show me" sits in the job line, its words inside it', 'engine');
  check(!s.beacon, tagLbl + ': the corner help button is not also shown', 'engine');
  const before = await snap(page);
  await click(page, '#job-help'); await sleep(450);
  s = await look(page);
  check(s.bar, tagLbl + ': Stuck? Show me opens the bar', 'engine');
  /* 26 Nov CONTROL repair: the closing checks below passed on origin/main, where there is no bar to
     close. Each now counts only when the bar really opened, so the control can fail every one. */
  const opened = !!s.bar;
  if (s.strip) SAW_STRIP = true;
  const long = s.steps.filter(t => words(t) > 10);
  check(s.steps.length >= 1 && s.steps.length <= 3 && !long.length, tagLbl + ': 1 to 3 steps of 10 words or fewer (' + JSON.stringify(s.steps) + ')', 'engine');
  check(/^Still stuck\? Ask the person beside you\. Then put your hand up\.$/.test(s.stuck), tagLbl + ': the "Still stuck?" line ends the bar', 'engine');
  /* the bar sticks under the top bar, so on a scrolled page it lies over the part she has scrolled past:
     what matters is that the thing she has to use is wholly below it, on screen, ringed and tagged */
  const below = s.rings.filter(x => s.barR && x.r.t >= s.barR.b - 1 && x.r.t < s.vh - 10);
  check(!!s.barR && (s.scrollY > 0 || s.barR.b <= s.hostT + 1), tagLbl + ': at the top of the page the bar sits above her work (bar bottom ' + (s.barR && s.barR.b) + ', work top ' + s.hostT + ')', 'engine');
  check(below.length >= 1 && !!s.tag, tagLbl + ': a ring and a tag ("' + s.tag + '") mark the thing to use next, below the bar and on screen' + (s.rings.length ? ' (rings at ' + s.rings.map(x => x.r.t + '-' + x.r.b).join(',') + ')' : ' (no ring at all)'), 'engine');
  if (s.optN) check(s.optRinged === s.optN, tagLbl + ': every answer is ringed, not only one (' + s.optRinged + ' of ' + s.optN + ')', 'engine');
  check(!!s.tag && !s.tagHits.length, tagLbl + ': the tag covers none of her words' + (s.tagHits.length ? ' (it lies over: ' + JSON.stringify(s.tagHits) + ')' : ''), 'engine');
  await click(page, '#showme-close'); await sleep(350);
  s = await look(page);
  check(opened && !s.bar && !s.rings.length, tagLbl + ': Got it closes the bar and takes the ring away', 'engine');
  check(opened && (await snap(page)) === before, tagLbl + ': her work is exactly as it was after the help closes', 'engine');
  await click(page, '#job-help'); await sleep(300);
  const reopened = !!(await look(page)).bar;
  await page.keyboard.press('Escape'); await sleep(300);
  s = await look(page);
  check(reopened && !s.bar, tagLbl + ': Esc closes the bar', 'engine');
}

/* on a question, the options themselves: press the intro's start and look again */
async function questionChecks(page, L, c) {
  const tagLbl = L.id + ' #' + (c.i + 1) + ' ' + c.id + ' (' + c.engine + ', the first question)';
  const went = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#chunk-host .intro-card button.primary-btn, #chunk-host .card.intro-card button')].find(b => b.offsetParent && !b.disabled);
    if (b) b.click(); return !!b;
  });
  if (!went) return;
  await sleep(1400);
  const n = await page.evaluate(() => [...document.querySelectorAll('#chunk-host .q-opt')].filter(e => e.offsetParent && !e.disabled).length);
  if (!n) return;
  await click(page, '#job-help'); await sleep(450);
  const s = await look(page);
  check(s.optN > 0 && s.optRinged === s.optN, tagLbl + ': every answer is ringed (' + s.optRinged + ' of ' + s.optN + ')', 'engine');
  check(s.tag === 'Choose one', tagLbl + ': the tag says "Choose one" (got "' + s.tag + '")', 'engine');
  check(!!s.tag && !s.tagHits.length, tagLbl + ': the tag covers none of her words' + (s.tagHits.length ? ' (it lies over: ' + JSON.stringify(s.tagHits) + ')' : ''), 'engine');
  await click(page, '#showme-close'); await sleep(250);
}

(async () => {
  let srv = null;
  try { execFileSync('curl', ['-sf', '-o', '/dev/null', `http://localhost:${PORT}/ks3-dt/platform/index.html`]); }
  catch (e) { srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' }); await sleep(1200); }
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    const LS = lessons();
    const total = LS.reduce((a, L) => a + L.chunks.length, 0);
    console.log('qa-showme: ' + LS.length + ' lessons, ' + total + ' parts the platform draws' + (CONTROL ? '  [CONTROL: origin/main app.js, style.css, index.html]' : ''));
    check(total >= 100 || !!ONLY, 'coverage: ' + total + ' parts found', 'setup');
    const page = await openPage(browser);

    console.log('\n0. The hub keeps the corner help (no lesson part, so no job line)');
    let h = await look(page);
    check(h.beacon && !h.strip, 'hub: the corner "Stuck? Show me" is there and no job line is drawn', 'setup');

    for (const L of LS) {
      console.log('\n' + L.id + ' (' + L.chunks.length + ' parts)');
      SAW_STRIP = false;
      await openLesson(page, L.id);
      /* the parts as the platform builds them (its own Do-Now first, from lesson 2 on) */
      const built = await page.evaluate((frame) => App.state.chunks.map((c, i) => ({ i, id: c.id, engine: c.engine })).filter(c => frame.indexOf(c.engine) === -1), [...FRAME]);
      check(built.length >= L.chunks.length, L.id + ': ' + built.length + ' parts built, ' + L.chunks.length + ' in the lesson file', 'setup');
      for (const c of built) {
        const ok = await goChunk(page, c.i);
        /* the Do-Now moves straight on when the demo has nothing to ask: nothing of hers to help with */
        if (ok === 'moved' && c.engine === 'recap') { console.log('  (' + c.id + ' had no questions here and moved on by itself)'); await openLesson(page, L.id); continue; }
        check(ok === true, L.id + ' #' + (c.i + 1) + ' ' + c.id + ': reached', 'setup');
        if (ok !== true) continue;
        await partChecks(page, L, c);
        if (['exitcheck', 'items', 'diagnostic', 'recap'].includes(c.engine)) await questionChecks(page, L, c);
      }
      check(page.__errs.length === 0, L.id + ': no page errors (' + page.__errs.slice(0, 3).join(' | ') + ')', 'setup');
      page.__errs.length = 0;
      await page.evaluate(() => App.showHub()); await sleep(300);
      h = await look(page);
      check(SAW_STRIP && h.beacon && !h.strip && !h.bar, L.id + ': back on the hub the job line is gone and the corner help is back', 'engine');
    }

    if (!ONLY || ONLY.includes('j3-02')) {
      console.log('\nIdle: the button pulses, then the ring shows by itself (J3 L2 callsheet-a, idle shortened for the test)');
      await openLesson(page, 'j3-02');
      const idx = await page.evaluate(() => App.state.chunks.findIndex(c => c.id === 'callsheet-a'));
      await goChunk(page, idx); await sleep(1300);
      const can = await page.evaluate(() => !!(App.showMe && App.showMe.setIdle));
      check(can, 'idle: the help can be told a shorter wait for the test', 'engine');
      if (can) {
        /* 1 s idle: pulse from 1 s, ring from 2 s. The old 400 ms gave a 400 ms window and failed
           1 time in 2 under load (26 Nov); this gives the look a full second either side. */
        await page.evaluate(() => App.showMe.setIdle(1000));
        await sleep(1450);
        let s = await look(page);
        check(s.nudge && !s.rings.length, 'idle 1x: the button pulses, no ring yet', 'engine');
        await sleep(1100);
        s = await look(page);
        check(s.rings.length >= 1 && !!s.tag && !s.bar, 'idle 2x: the ring and its tag show by themselves, the bar stays shut', 'engine');
        const hadRing = s.rings.length >= 1;
        await page.mouse.click(5, 300); await sleep(250);
        s = await look(page);
        check(hadRing && !s.nudge && !s.rings.length, 'any click clears the pulse and the ring', 'engine');
        await page.evaluate(() => App.showMe.setIdle(20000));
      }
      console.log('\nFit: the job line and its button at four screen sizes (J3 L2 callsheet-a)');
      for (const [w, hh] of [[1024, 640], [1366, 625], [1536, 730], [1920, 950]]) {
        await page.setViewport({ width: w, height: hh }); await sleep(400);
        const s = await look(page);
        const sz = await page.evaluate(() => { const s = document.querySelector('#job-strip'); return s ? Math.round(s.getBoundingClientRect().height) : 0; });
        check(s.strip && s.btnFits && sz > 0 && sz <= 96, w + 'x' + hh + ': the button\'s words fit and the job line is ' + sz + 'px tall (96 at most)', 'engine');
      }
      await page.setViewport({ width: 1366, height: 625 });
    }
    await page.close();
  } finally {
    await browser.close();
    if (srv) srv.kill();
  }
  if (REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify(REPORT, null, 1));
  console.log('\n' + PASS + ' passed, ' + FAILS.length + ' failed');
  if (CONTROL) {
    console.log('CONTROL: ' + ENGINE_FAILS + ' of ' + ENGINE_ALL + ' engine checks failed on origin/main (all must fail)');
    process.exit(ENGINE_FAILS === ENGINE_ALL && ENGINE_ALL > 0 ? 0 : 1);
  }
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
