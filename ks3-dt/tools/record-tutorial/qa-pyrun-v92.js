/* qa-pyrun-v92 — A MATCH IS KEPT THE MOMENT IT HAPPENS (V92, J3 L2 live walk, 26 Nov 2026).
   The V91 walk found it: MATCHED on build 2 of 2, a reload before Continue, and build 2 came back empty.
   V91 saved her place only when a build OPENED, so the last build of a part (nothing opens after it) was
   never kept, and nor was any build matched but not yet left with Next build.
   Driven on J3 L2 callsheet-a with real presses at school-PC size:
   1. build 1 MATCHED, reload before Next build -> the card opens on build 2 (not build 1, not the intro)
   2. build 2 MATCHED, reload before Continue -> a card saying it is finished, with Continue, no tray
   3. that Continue banks the card and moves on; the record is cleared
   CONTROL=1 serves engines.js from CONTROL_REF (default origin/main = V91): every [engine] check must fail.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-pyrun-v92.js [--port=8878] */
const puppeteer = require('puppeteer'), path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), KS3 = path.join(ROOT, 'ks3-dt'), PORT = +arg('port', 8878);
const CONTROL = process.env.CONTROL === '1', CONTROL_REF = process.env.CONTROL_REF || 'origin/main';
const OLD = CONTROL ? execFileSync('git', ['show', CONTROL_REF + ':ks3-dt/platform/engines.js'], { cwd: ROOT, maxBuffer: 1 << 27 }) : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0, ENGINE_ALL = 0, ENGINE_FAILS = 0; const FAILS = [];
const check = (ok, msg, kind) => {
  if (kind === 'engine') { ENGINE_ALL++; if (!ok) ENGINE_FAILS++; }
  if (ok) PASS++; else FAILS.push(msg);
  console.log((ok ? '  ok    ' : '  FAIL  ') + '[' + (kind || 'setup') + '] ' + msg);
  if (CONTROL && ok && kind === 'engine') console.log('  CONTROL-PASSED (must fail) ' + msg);
};
const KINDS = ['line', 'caps', 'spaces', 'blank', 'short', 'long', 'order'];

/* coverage derived from the content, not typed in: every packed lesson that carries pyDiffSay */
function diffLessons() {
  const out = [];
  for (const y of ['j1', 'j2', 'j3']) {
    const man = JSON.parse(fs.readFileSync(path.join(KS3, 'content', y, 'manifest.json'), 'utf8'));
    for (const le of man.lessons || []) {
      const f = path.join(KS3, 'content', y, 'lessons', le.id + '.json');
      if (!fs.existsSync(f)) continue;
      const L = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (L.pyDiffSay) out.push({ id: le.id, words: L.pyDiffSay });
    }
  }
  return out;
}

async function freshPage(browser) {
  const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 625 });
  const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
  if (CONTROL) {
    await page.setRequestInterception(true);
    page.on('request', q => {
      if (/\/platform\/engines\.js(\?|$)/.test(q.url())) q.respond({ status: 200, contentType: 'text/javascript', body: OLD });
      else q.continue();
    });
  }
  const url = `http://localhost:${PORT}/ks3-dt/platform/index.html?class=Demo-10A&as=aoife`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await hubReady(page);
  return { page, errs };
}
const hubReady = page => page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });

async function openCard(page, lessonId, chunkId) {
  await page.evaluate((id) => {
    const past = Date.now() - 3 * 864e5;
    (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
    /* and on the preview server, as a teacher opening the lessons would: a lesson still locked there refuses her saves */
    const s = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}'), cls = new URLSearchParams(location.search).get('class');
    const reg = (s.classes || []).find(c => String(c.name).toLowerCase() === String(cls).toLowerCase());
    if (reg) {
      s.locks = s.locks || {}; s.locks[reg.name] = s.locks[reg.name] || {};
      (App.state.man.lessons || []).forEach(l => { s.locks[reg.name][String(l.num)] = { u: Math.floor((past - 1767225600000) / 60000), on: 1 }; });
      localStorage.setItem('ks3dt-dev', JSON.stringify(s));
    }
    App.state.absence = [];
    if (window.PairKit && PairKit.stop) PairKit.stop();
    App.openLesson(id, {});
  }, lessonId);
  await page.waitForFunction((id) => App.state.lesson && App.state.lesson.id === id && App.state.chunks && App.state.chunks.length && !document.querySelector('#player').hidden, { timeout: 20000 }, lessonId);
  await page.waitForFunction(() => App.state.draft && document.querySelector('#chunk-host') && document.querySelector('#chunk-host').firstElementChild, { timeout: 20000 });
  await sleep(1200);
  await page.evaluate((cid) => {
    const i = App.state.chunks.findIndex(c => c.id === cid);
    App.state.advancing = false; App.state.chunkIdx = i; App.remountChunk();
  }, chunkId);
  await sleep(1000);
}
const card = page => page.evaluate(() => {
  const host = document.querySelector('#chunk-host');
  const vis = n => !!(n && n.offsetParent);
  const begin = [...host.querySelectorAll('button')].find(b => /Open the call sheet/.test(b.textContent) && vis(b));
  const steps = [...host.querySelectorAll('.pyrun-step')].map(s => s.classList.contains('now') ? 'now' : (s.classList.contains('done') ? 'done' : '-'));
  const v = host.querySelector('.pyrun-verdict');
  const diff = v && v.querySelector('.pyrun-diff'), stale = v && v.querySelector('.pyrun-stale');
  const con = host.querySelector('.pyrun-console-host');
  return {
    begin: !!begin, steps, tray: [...host.querySelectorAll('.pyrun-tray .pyrun-line')].map(n => n.textContent.trim()),
    placed: [...host.querySelectorAll('.pyp-list .pyrun-line')].map(n => n.textContent.trim()),
    verdict: v && !v.hidden ? v.className : null, diff: diff ? diff.textContent.trim() : null,
    diffCode: diff ? [...diff.querySelectorAll('code.q-icode')].map(c => c.textContent) : [],
    stale: stale ? stale.textContent.trim() : null, conStale: !!(con && con.classList.contains('is-stale')),
    dim: v && !v.hidden ? getComputedStyle(v.querySelector(':scope > :not(.pyrun-stale)') || v).opacity : null
  };
});
/* a real pointer press on the left end of a tray line (the end with no typing gap) */
async function pressTrayLine(page, text) {
  const box = await page.evaluate((text) => {
    const n = [...document.querySelectorAll('#chunk-host .pyrun-tray .pyrun-line')].find(x => x.textContent.trim() === text);
    if (!n) return null; n.scrollIntoView({ block: 'center' }); const r = n.getBoundingClientRect();
    return { x: r.left + 10, y: r.top + r.height / 2 };
  }, text);
  if (!box) return false;
  await page.mouse.click(box.x, box.y); await sleep(450); return true;
}
async function page_wait(pg) {
  await pg.waitForFunction(() => App.state.chunks[App.state.chunkIdx].id !== 'callsheet-a', { timeout: 8000 }).catch(() => {});
  await sleep(400);
}
async function takeAllBack(page) {
  for (let k = 0; k < 6; k++) {
    const any = await page.evaluate(() => { const b = document.querySelector('#chunk-host .pyp-list .take-back'); if (!b) return false; b.click(); return true; });
    if (!any) break; await sleep(350);
  }
}
async function typeGap(page, text) {
  await page.evaluate(() => { const i = document.querySelector('#chunk-host .pyp-list input.pyrun-blank'); if (i) { i.focus(); i.select(); } });
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text, { delay: 15 }); await sleep(250);
}
async function run(page) {
  await page.evaluate(() => { const b = document.querySelector('#chunk-host .pyrun-run'); if (b) b.click(); });
  await page.waitForFunction(() => { const v = document.querySelector('#chunk-host .pyrun-verdict'); return v && !v.hidden && /is-(matched|notyet)/.test(v.className); }, { timeout: 20000 }).catch(() => {});
  await sleep(500);
  return card(page);
}

(async () => {
  console.log('qa-pyrun-v92' + (CONTROL ? '  [CONTROL: engines.js from ' + CONTROL_REF + ']' : ''));
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    const P = await freshPage(browser), pg = P.page;
    await openCard(pg, 'j3-02', 'callsheet-a');
    let c = await card(pg);
    check(c.begin, 'callsheet-a opens on its intro card ("Open the call sheet")');
    await sleep(900);
    await pg.evaluate(() => { const b = [...document.querySelectorAll('#chunk-host button')].find(b => /Open the call sheet/.test(b.textContent)); if (b) b.click(); });
    await sleep(900);
    c = await card(pg);
    check(c.steps.join(',') === 'now,-', 'build 1 of 2 is showing (' + c.steps.join(',') + ')');

    /* 1. build 1 matched, reload before Next build */
    check(await pressTrayLine(pg, c.tray[0] || ''), 'pressed the gap line into Your program');
    await typeGap(pg, 'THE HARBOUR LIGHT');
    c = await run(pg);
    check(/is-matched/.test(c.verdict || ''), 'build 1: RUN with "THE HARBOUR LIGHT" -> MATCHED (' + c.verdict + ')');
    let kept = await pg.evaluate(() => (App.state.draft || {}).pyAt || null);
    check(!!kept && kept.chunk === 'callsheet-a' && Number(kept.at) === 0 && kept.matched === true,
      'the match on build 1 is in her draft before she presses Next build (' + JSON.stringify(kept) + ')', 'engine');
    await sleep(900);
    await pg.reload({ waitUntil: 'domcontentloaded' });
    await hubReady(pg); await sleep(400);
    await openCard(pg, 'j3-02', 'callsheet-a');
    c = await card(pg);
    const onB2 = !c.begin && c.steps.join(',') === 'done,now';
    check(onB2, 'after a reload the card opens on build 2, not build 1 or its intro card (' + (c.begin ? 'intro card' : c.steps.join(',')) + ')', 'engine');

    /* 2. build 2 matched, reload before Continue */
    let onKeptCard = false;
    if (onB2) {
      await pressTrayLine(pg, 'print("THE HARBOUR LIGHT")'); await pressTrayLine(pg, 'print("Doors open at 7")');
      c = await run(pg);
      check(/is-matched/.test(c.verdict || ''), 'build 2 done right -> MATCHED (' + c.verdict + ')');
    } else check(false, 'build 2 MATCHED (not reached)', 'engine');
    kept = await pg.evaluate(() => (App.state.draft || {}).pyAt || null);
    check(!!kept && Number(kept.at) === 1 && kept.matched === true,
      'the match on build 2 is in her draft before she presses Continue (' + JSON.stringify(kept) + ')', 'engine');
    await sleep(900);
    await pg.reload({ waitUntil: 'domcontentloaded' });
    await hubReady(pg); await sleep(400);
    await openCard(pg, 'j3-02', 'callsheet-a');
    const k = await pg.evaluate(() => {
      const host = document.querySelector('#chunk-host');
      const vis = n => !!(n && n.offsetParent);
      const h = host.querySelector('.intro-card h2'), lead = host.querySelector('.intro-card .intro-lead');
      const btns = [...host.querySelectorAll('button')].filter(vis).map(b => b.textContent.trim());
      return { title: h ? h.textContent.trim() : null, lead: lead ? lead.textContent.trim() : null, btns,
        tray: host.querySelectorAll('.pyrun-tray .pyrun-line').length, steps: host.querySelectorAll('.pyrun-step').length,
        words: (host.innerText || '').trim().split(/\s+/).filter(Boolean).length };
    });
    onKeptCard = !!k.title && /MATCHED/.test(k.title) && /2 · Times/.test(k.title) && k.btns.join('|') === 'Continue' && k.tray === 0 && k.steps === 0;
    check(onKeptCard, 'after a reload a card says build 2 is finished, with one Continue and no tray (' + JSON.stringify(k) + ')', 'engine');
    check(onKeptCard && (/already finished this build/.test(k.lead || '') && /Click Continue/.test(k.lead || '')),
      'its line says what is done and what to click ("' + k.lead + '")', 'engine');
    check(onKeptCard && k.words <= 25, 'the kept card is 25 words or fewer (' + k.words + ')', 'engine');

    /* 3. that Continue banks the card and moves on */
    if (onKeptCard) {
      await sleep(1100);
      await pg.evaluate(() => { const b = [...document.querySelectorAll('#chunk-host button')].find(b => /^\s*Continue\s*$/.test(b.textContent)); if (b) b.click(); });
      await sleep(1800);
      await pg.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && !x.closest('#chunk-host') && /^\s*Onward\s*$/.test(x.textContent));
        if (b) b.click();
      });
      await page_wait(pg);
      const after = await pg.evaluate(() => ({ py: (App.state.draft || {}).pyAt || null, at: App.state.chunks[App.state.chunkIdx].id,
        badge: (App.state.badges || []).map(String) }));
      check(!after.py && after.at !== 'callsheet-a', 'Continue on the kept card moves on and clears the record (pyAt ' + JSON.stringify(after.py) + ', now on ' + after.at + ')', 'engine');
    } else check(false, 'Continue on the kept card moves on (not reached)', 'engine');

    /* 4. a build's own error words win (V92 walk: build 3 has no number gap, yet read "A number gap takes digits only") */
    await openCard(pg, 'j3-02', 'callsheet-b');
    await sleep(900);
    await pg.evaluate(() => { const b = [...document.querySelectorAll('#chunk-host button')].find(b => /Open the call sheet/.test(b.textContent)); if (b) b.click(); });
    await sleep(900);
    const plain = () => pg.evaluate(() => { const p = document.querySelector('#chunk-host .pyc-plain'); return p ? p.textContent.trim() : null; });
    check(await pressTrayLine(pg, 'print("Tonight at " + venue)'), 'build 3: pressed print("Tonight at " + venue) in first');
    c = await run(pg);
    let say = await plain();
    check(say === 'Python does not know that name yet. Put the line that fills the box above the lines that use it.',
      'build 3 NameError reads its own line, with no number gap in it ("' + say + '")', 'engine');
    await takeAllBack(pg);
    c = await card(pg);
    const venueLine = c.tray.find(t => /^venue = /.test(t)) || '';
    check(await pressTrayLine(pg, venueLine), 'build 3: pressed the venue line in');
    await typeGap(pg, 'THE HARBOUR LIGHT');
    await pressTrayLine(pg, 'print("Tonight at " + venue)'); await pressTrayLine(pg, 'print("Thank you for coming to " + venue)');
    c = await run(pg);
    check(/is-matched/.test(c.verdict || ''), 'build 3 done right -> MATCHED (' + c.verdict + ')');
    await sleep(900);
    await pg.evaluate(() => { const b = [...document.querySelectorAll('#chunk-host button')].find(b => /^\s*Next build\s*$/.test(b.textContent) && b.offsetParent); if (b) b.click(); });
    await sleep(1200);
    check(await pressTrayLine(pg, 'print("Money taken: " + str(price * seats) + " pounds")'), 'build 4: pressed the print line in before the boxes are filled');
    c = await run(pg);
    say = await plain();
    check(/^Python does not know that name yet\./.test(say || '') && /A number gap takes digits only, like 4\./.test(say || ''),
      'build 4 (two number gaps) still reads the part\'s line, number gap and all ("' + say + '")');

    check(P.errs.length === 0, 'no page errors (' + P.errs.slice(0, 2).join(' | ') + ')');
    await pg.close();
  } finally { await browser.close(); }
  console.log('\n' + PASS + ' passed, ' + FAILS.length + ' failed');
  if (CONTROL) {
    const held = ENGINE_ALL - ENGINE_FAILS;
    console.log('CONTROL: ' + ENGINE_FAILS + ' of ' + ENGINE_ALL + ' engine checks failed on ' + CONTROL_REF + (held ? '  — ' + held + ' PASSED and should not have' : ''));
    process.exit(held === 0 && ENGINE_ALL > 0 ? 0 : 1);
  }
  process.exit(FAILS.length ? 1 : 0);
})();
