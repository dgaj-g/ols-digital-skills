/* qa-pyrun-v91 — the three line-tray fixes from the J3 L2 live walk (V91, 26 Nov 2026).
   1. THE POINTER. NOT YET now says which console line is different and how ("Look at line 1 of the console.
      A capital letter is different..."), in the lesson's own `pyDiffSay` words.
   2. THE OLD ANSWER FADES. Once she changes the program after RUN, the NOT YET and its console dim and the
      chunk's `staleSay` line appears; changing it back brings the answer back.
   3. A RELOAD KEEPS HER BUILDS. A refresh at build 2 of 2 opens build 2 at once, not build 1 and its intro card;
      finishing the card clears that record.
   Part A (every lesson with pyDiffSay, every kind of difference, in the page): each kind renders one line, every
   {n} {want} {got} filled, nothing left in braces, and a `$&` in a printed line comes out as typed.
   Part B (J3 L2 callsheet-a, driven with real pointer presses at school-PC size): 1 to 3 above.
   CONTROL=1 serves engines.js from CONTROL_REF (default origin/main): every [engine] check must fail there.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-pyrun-v91.js [--port=8878] */
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
  const LS = diffLessons();
  console.log('qa-pyrun-v91' + (CONTROL ? '  [CONTROL: engines.js from ' + CONTROL_REF + ']' : ''));
  check(LS.length >= 4, 'coverage: ' + LS.length + ' lessons carry pyDiffSay (' + LS.map(l => l.id).join(', ') + ')');
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    /* ---------- A. every kind of difference, in every lesson's own words ---------- */
    console.log('\nA. The pointer line for every kind of difference');
    const { page, errs } = await freshPage(browser);
    for (const L of LS) {
      const r = await page.evaluate((words) => {
        if (!window.PyRun || !PyRun.diffHtml) return null;
        const b = t => ({ target: t, check: { kind: 'target' } });
        const ok = out => ({ ok: true, out });
        const cases = {
          line: [ok('THE HARBOUR LIGHT\nDoors open at seven'), b(['THE HARBOUR LIGHT', 'Doors open at 7'])],
          caps: [ok('The Harbour Light'), b(['THE HARBOUR LIGHT'])],
          spaces: [ok('THE  HARBOUR LIGHT'), b(['THE HARBOUR LIGHT'])],
          blank: [ok('THE HARBOUR LIGHT\n\nDoors open at 7'), b(['THE HARBOUR LIGHT', 'Doors open at 7'])],
          short: [ok('THE HARBOUR LIGHT'), b(['THE HARBOUR LIGHT', 'Doors open at 7'])],
          long: [ok('THE HARBOUR LIGHT\nDoors open at 7\nEncore'), b(['THE HARBOUR LIGHT', 'Doors open at 7'])],
          order: [ok('Doors open at 7\nTHE HARBOUR LIGHT'), b(['THE HARBOUR LIGHT', 'Doors open at 7'])],
          dollar: [ok('Price $& more'), b(['Price $5'])]
        };
        const out = {};
        for (const k in cases) {
          const host = document.createElement('div'); host.innerHTML = PyRun.diffHtml(cases[k][0], cases[k][1], words, false);
          const p = host.querySelector('.pyrun-diff');
          out[k] = { kind: (PyRun.firstDiff(cases[k][0].out, cases[k][1].target) || {}).kind || null, text: p ? p.textContent : '' };
        }
        out.chat = PyRun.diffHtml(cases.caps[0], cases.caps[1], words, true);          // a chat card says nothing
        out.clean = PyRun.diffHtml(cases.caps[0], { target: ['THE HARBOUR LIGHT'], check: { kind: 'clean' } }, words, false);
        return out;
      }, L.words);
      if (!r) { check(false, L.id + ': PyRun.diffHtml exists in the page', 'engine'); continue; }
      for (const k of KINDS) {
        const t = r[k] ? r[k].text : '';
        check(r[k] && r[k].kind === k && t.length > 0 && !/[{}]/.test(t) && (k !== 'order' ? true : /order/i.test(t)),
          L.id + ' ' + k + ': "' + t + '"', 'engine');
      }
      check(/\$&/.test(r.dollar.text), L.id + ': a printed "$&" comes out as typed ("' + r.dollar.text + '")', 'engine');
      check(r.chat === '' && r.clean === '', L.id + ': no pointer on a chat card or a clean-run check', 'setup');
    }
    check(errs.length === 0, 'A: no page errors (' + errs.slice(0, 2).join(' | ') + ')');
    await page.close();

    /* ---------- B. J3 L2 callsheet-a, as a pupil ---------- */
    console.log('\nB. J3 L2 callsheet-a, with real presses at 1366x625');
    const P = await freshPage(browser), pg = P.page;
    const words = (LS.find(l => l.id === 'j3-02') || {}).words || {};
    const staleSay = JSON.parse(fs.readFileSync(path.join(KS3, 'content/j3/lessons/j3-02.json'), 'utf8')).chunks.find(c => c.id === 'callsheet-a').config.staleSay;
    await openCard(pg, 'j3-02', 'callsheet-a');
    let c = await card(pg);
    check(c.begin, 'callsheet-a opens on its intro card ("Open the call sheet")');
    await sleep(900);
    await pg.evaluate(() => { const b = [...document.querySelectorAll('#chunk-host button')].find(b => /Open the call sheet/.test(b.textContent)); if (b) b.click(); });
    await sleep(900);
    c = await card(pg);
    check(c.steps.join(',') === 'now,-', 'build 1 of 2 is showing (' + c.steps.join(',') + ')');

    /* build 1: the title in the wrong case */
    check(await pressTrayLine(pg, c.tray[0] || ''), 'pressed the gap line into Your program');
    await typeGap(pg, 'The Harbour Light');
    c = await run(pg);
    check(/is-notyet/.test(c.verdict || ''), 'RUN with "The Harbour Light" -> NOT YET (' + c.verdict + ')');
    check(!!c.diff && /line 1/.test(c.diff) && /capital letter/i.test(c.diff) && c.diffCode.indexOf('THE HARBOUR LIGHT') !== -1,
      'NOT YET points at line 1 and the capital letters, with the wanted line in code type ("' + c.diff + '")', 'engine');

    /* change it without running: the old answer fades */
    await typeGap(pg, 'THE HARBOUR LIGH');
    c = await card(pg);
    const faded = c.stale === staleSay && c.conStale && Number(c.dim) < 0.9;
    check(faded,
      'after an edit with no RUN: "' + c.stale + '", console dimmed ' + c.conStale + ', NOT YET at opacity ' + c.dim, 'engine');
    await typeGap(pg, 'The Harbour Light');
    c = await card(pg);
    check(faded && c.stale === null && !c.conStale, 'typing it back to what she ran brings the answer back undimmed (' + c.stale + ', ' + c.conStale + ')', 'engine');

    /* the right title, then on to build 2 */
    await typeGap(pg, 'THE HARBOUR LIGHT');
    c = await run(pg);
    check(/is-matched/.test(c.verdict || ''), 'RUN with "THE HARBOUR LIGHT" -> MATCHED (' + c.verdict + ')');
    await sleep(1100);   // App.armButton ignores a press just after a button appears (DFM 104)
    await pg.evaluate(() => { const b = [...document.querySelectorAll('#chunk-host .pyrun-verdict button')].find(b => /Next build/.test(b.textContent)); if (b) b.click(); });
    await sleep(900);
    c = await card(pg);
    check(c.steps.join(',') === 'done,now', 'build 2 of 2 is showing (' + c.steps.join(',') + ')');

    /* build 2: the right lines in the wrong order, then the decoy */
    await pressTrayLine(pg, 'print("Doors open at 7")'); await pressTrayLine(pg, 'print("THE HARBOUR LIGHT")');
    c = await run(pg);
    check(/is-notyet/.test(c.verdict || '') && c.diff === words.order,
      'the right lines in the wrong order -> the "wrong order" line ("' + c.diff + '")', 'engine');
    await takeAllBack(pg);
    await pressTrayLine(pg, 'print("THE HARBOUR LIGHT")'); await pressTrayLine(pg, 'print("Doors open at seven")');
    c = await run(pg);
    check(!!c.diff && /line 2/.test(c.diff) && c.diffCode.join('|') === 'Doors open at 7|Doors open at seven',
      'the "seven" decoy -> points at line 2, wanted then printed in code type ("' + c.diff + '")', 'engine');
    await takeAllBack(pg);
    await pressTrayLine(pg, 'print("THE HARBOUR LIGHT")');
    c = await run(pg);
    check(!!c.diff && /too few lines/.test(c.diff) && /Line 2 of the console is missing/.test(c.diff) && c.diffCode.indexOf('Doors open at 7') !== -1,
      'only the title -> "too few lines", line 2 missing, and what it should say ("' + c.diff + '")', 'engine');
    await takeAllBack(pg);

    /* reload half way: build 2 must open at once */
    const kept = await pg.evaluate(() => (App.state.draft || {}).pyAt || null);
    check(!!kept && kept.chunk === 'callsheet-a' && Number(kept.at) === 1, 'her draft records that she is on build 2 (' + JSON.stringify(kept) + ')', 'engine');
    await sleep(900);    // let the save land on the preview server
    await pg.reload({ waitUntil: 'domcontentloaded' });
    await hubReady(pg); await sleep(400);
    await openCard(pg, 'j3-02', 'callsheet-a');
    c = await card(pg);
    check(!c.begin && c.steps.join(',') === 'done,now',
      'after a reload callsheet-a opens on build 2, not build 1 and its intro card (' + (c.begin ? 'intro card' : c.steps.join(',')) + ')', 'engine');
    if (!c.begin && c.steps.join(',') === 'done,now') {
      await pressTrayLine(pg, 'print("THE HARBOUR LIGHT")'); await pressTrayLine(pg, 'print("Doors open at 7")');
      c = await run(pg);
      check(/is-matched/.test(c.verdict || ''), 'build 2 done right -> MATCHED (' + c.verdict + ')');
      await sleep(1100);
      await pg.evaluate(() => { const b = [...document.querySelectorAll('#chunk-host .pyrun-verdict button')].find(b => /Continue/.test(b.textContent)); if (b) b.click(); });
      /* the card's badge shows first; she presses Onward */
      await sleep(1800);
      const pop = await pg.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && !x.closest('#chunk-host') && /^\s*Onward\s*$/.test(x.textContent));
        const t = b ? b.textContent.trim() : null; if (b) b.click(); return t;
      });
      await page_wait(pg);
      const after = await pg.evaluate(() => ({ py: (App.state.draft || {}).pyAt || null, at: App.state.chunks[App.state.chunkIdx].id }));
      if (process.env.VERBOSE) console.log('  (badge button: ' + pop + ')');
      check(!after.py && after.at !== 'callsheet-a', 'finishing the card clears the record and moves on (pyAt ' + JSON.stringify(after.py) + ', now on ' + after.at + ')', 'engine');
    } else {
      check(false, 'finishing the card clears the record (not reached)', 'engine');
    }
    check(P.errs.length === 0, 'B: no page errors (' + P.errs.slice(0, 2).join(' | ') + ')');
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
