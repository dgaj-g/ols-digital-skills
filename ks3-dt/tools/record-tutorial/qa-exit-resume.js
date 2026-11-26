/* qa-exit-resume — a reload half way through the exit check keeps the answers she already gave (V91, 26 Nov 2026).
   Found on the live walk: the exit check kept its answers only once she had answered every question, so a
   reload (or a dropped connection) at question 3 of 5 sent her back to the intro card and question 1.
   For EVERY lesson whose exit check has two or more questions (derived from the packed manifests):
     - answer the first questions (two of them, or one when there are only two), reload, open the exit check again;
     - it must open on the next question (no intro card again), with the earlier answers kept;
     - answering the rest must hand on all of them, the earlier ones included, and clear the half-way record.
   CONTROL=1 serves engines.js from CONTROL_REF (default origin/main): every [engine] check must fail there.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-exit-resume.js [--port=8878] [--only=j3-02] */
const puppeteer = require('puppeteer'), path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), KS3 = path.join(ROOT, 'ks3-dt'), PORT = +arg('port', 8878);
const CONTROL = process.env.CONTROL === '1', ONLY = arg('only', '');
const CONTROL_REF = process.env.CONTROL_REF || 'origin/main';
const OLD = CONTROL ? execFileSync('git', ['show', CONTROL_REF + ':ks3-dt/platform/engines.js'], { cwd: ROOT, maxBuffer: 1 << 27 }) : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0, ENGINE_ALL = 0, ENGINE_FAILS = 0; const FAILS = [];
const check = (ok, msg, kind) => {
  if (kind === 'engine') { ENGINE_ALL++; if (!ok) ENGINE_FAILS++; }
  if (ok) PASS++; else FAILS.push(msg);
  if (!ok || process.env.VERBOSE) console.log((ok ? '  ok    ' : '  FAIL  ') + '[' + (kind || 'setup') + '] ' + msg);
  if (CONTROL && ok && kind === 'engine') console.log('  CONTROL-PASSED (must fail) ' + msg);
};
const CLASS_OF = { j1: 'Demo-8A', j2: 'Demo-9A', j3: 'Demo-10A' };

function lessons() {
  const out = [];
  for (const y of ['j1', 'j2', 'j3']) {
    const man = JSON.parse(fs.readFileSync(path.join(KS3, 'content', y, 'manifest.json'), 'utf8'));
    for (const le of man.lessons || []) {
      if (ONLY && ONLY.split(',').indexOf(le.id) === -1) continue;
      const f = path.join(KS3, 'content', y, 'lessons', le.id + '.json');
      if (!fs.existsSync(f)) continue;
      const L = JSON.parse(fs.readFileSync(f, 'utf8'));
      const idx = (L.chunks || []).findIndex(c => c.engine === 'exitcheck');
      if (idx < 0) continue;
      const n = (((L.chunks[idx].config || {}).items) || []).length;
      out.push({ id: le.id, idx, n });
    }
  }
  return out;
}

async function freshPage(browser, cls) {
  const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 625 });
  const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
  if (CONTROL) {
    await page.setRequestInterception(true);
    page.on('request', q => {
      if (/\/platform\/engines\.js(\?|$)/.test(q.url())) q.respond({ status: 200, contentType: 'text/javascript', body: OLD });
      else q.continue();
    });
  }
  const url = `http://localhost:${PORT}/ks3-dt/platform/index.html?class=${cls}&as=aoife`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await hubReady(page);
  return { page, errs };
}
const hubReady = page => page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });

async function openAt(page, id, idx) {
  await page.evaluate((id) => {
    const past = Date.now() - 3 * 864e5;
    (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
    /* and on the preview server too, as a teacher opening the lessons would: a lesson still locked there
       refuses her saves, which looks exactly like an exit check that forgets its answers */
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
  }, id);
  await page.waitForFunction((id) => App.state.lesson && App.state.lesson.id === id && App.state.chunks && App.state.chunks.length && !document.querySelector('#player').hidden, { timeout: 20000 }, id);
  /* the lesson loads her saved work and mounts its first part on its own; jump only once that has landed */
  await page.waitForFunction(() => App.state.draft && document.querySelector('#chunk-host') && document.querySelector('#chunk-host').firstElementChild, { timeout: 20000 });
  await sleep(1500);
  /* jump straight to the exit check, as the review rail does */
  /* found in the chunks the player built, which need not line up with the file's own list */
  await page.evaluate(() => {
    const i = App.state.chunks.findIndex(c => c.engine === 'exitcheck');
    App.state.advancing = false; App.state.chunkIdx = i; App.remountChunk();
  });
  await sleep(900);
}
const where = page => page.evaluate(() => {
  const host = document.querySelector('#chunk-host');
  const intro = host && host.querySelector('.intro-card');
  const prog = host && host.querySelector('.q-card .runner-progress');
  return { intro: !!(intro && intro.offsetHeight), prog: prog ? prog.textContent.trim() : null };
});
async function answerOne(page) {
  const ok = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#chunk-host .q-opt')].find(x => !x.disabled && x.offsetHeight);
    if (!b) return false; b.click(); return true;
  });
  await sleep(800);
  return ok;
}

(async () => {
  const LS = lessons();
  console.log('qa-exit-resume: ' + LS.length + ' exit checks' + (CONTROL ? '  [CONTROL: engines.js from ' + CONTROL_REF + ']' : ''));
  check(LS.length >= 15 || !!ONLY, 'coverage: ' + LS.length + ' lessons with an exit check');
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  try {
    for (const L of LS) {
      if (L.n < 2) { console.log('  ....  ' + L.id + ': ' + L.n + ' question, nothing to resume'); continue; }
      const A = Math.min(2, L.n - 1), at = (A + 1) + ' of ' + L.n;
      const { page, errs } = await freshPage(browser, CLASS_OF[L.id.slice(0, 2)] || 'Demo-10A');
      try {
        await openAt(page, L.id, L.idx);
        let w = await where(page);
        check(w.intro, L.id + ': the exit check opens on its intro card');
        await sleep(900);   // App.armButton ignores a click just after a screen appears (DFM 104)
        await page.evaluate(() => { const b = document.querySelector('#chunk-host .intro-card .primary-btn'); if (b) b.click(); });
        await sleep(900);
        w = await where(page);
        check(w.prog === '1 of ' + L.n, L.id + ': Ready shows question 1 of ' + L.n + ' (saw ' + w.prog + ')');
        let gave = true; for (let k = 0; k < A; k++) gave = (await answerOne(page)) && gave;
        check(gave, L.id + ': answered the first ' + A + ' question(s)');
        w = await where(page);
        check(w.prog === at, L.id + ': now on question ' + at + ' (saw ' + w.prog + ')');
        await sleep(700);   // let the save land
        await page.reload({ waitUntil: 'domcontentloaded' });
        await hubReady(page); await sleep(400);
        await openAt(page, L.id, L.idx);
        w = await where(page);
        check(!w.intro && w.prog === at,
          L.id + ': after a reload the exit check opens on question ' + at + ', not the intro card (saw ' + (w.intro ? 'the intro card' : w.prog) + ')', 'engine');
        if (!w.intro && w.prog) {
          for (let k = A; k < L.n; k++) await answerOne(page);
          await sleep(600);
          const d = await page.evaluate(() => {
            const dr = App.state.draft || {};
            return { ans: dr.exitAnswers || null, part: dr.exitPart || null };
          });
          check(!!d.ans && d.ans.length === L.n && d.ans.every(a => a != null),
            L.id + ': finishing hands on all ' + L.n + ' answers, those from before the reload included (' + JSON.stringify(d.ans) + ')', 'engine');
          check(!d.part, L.id + ': and the half-way record is cleared', 'engine');
        } else {
          check(false, L.id + ': finishing hands on all answers (not reached)', 'engine');
          check(false, L.id + ': and the half-way record is cleared (not reached)', 'engine');
        }
        check(errs.length === 0, L.id + ': no page errors (' + errs.slice(0, 2).join(' | ') + ')');
      } catch (e) {
        check(false, L.id + ': walk threw ' + String(e.message || e).slice(0, 160));
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  console.log('\n' + PASS + ' passed, ' + FAILS.length + ' failed');
  if (CONTROL) {
    const held = ENGINE_ALL - ENGINE_FAILS;
    console.log('CONTROL: ' + ENGINE_FAILS + ' of ' + ENGINE_ALL + ' engine checks failed on ' + CONTROL_REF + (held ? '  — ' + held + ' PASSED and should not have' : ''));
    process.exit(held === 0 && ENGINE_ALL > 0 ? 0 : 1);
  }
  process.exit(FAILS.length ? 1 : 0);
})();
