/* qa-rescue-stuck — "Stuck? Show me" inside The Rescue (J3 L4), V91, 26 Nov 2026.
   The walk found the green button on the lesson's top bar opened one general help box while the story was
   asking for a line, and the story's own help rungs only came by waiting 30, 60, 90 seconds. Now:
   1. STORY SIDE (probe page). On a typing step, window.__rescueStuck() raises the next rung under her box
      at once (door ladder, the lane mend, the river hog); once every rung is up it beats the help box (or Run)
      so her eye goes there. On a film step, or while paused, it says no (false) and nothing changes.
   2. PLATFORM SIDE (Demo-10A, J3 L4). With the story on a typing step, the green button asks the story first:
      a rung appears in the story and the general help box stays shut. With the story on a film step the
      general help box opens as before.
   3. LAYOUT. The clock bar and the "What your code prints" chip no longer sit on "Pause the story".
   CONTROL=1 serves origin/main's app.js, engines.js and the Rescue's hour files: every [engine] check must fail.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-rescue-stuck.js [--port=8878] */
const puppeteer = require('puppeteer'), path = require('path'), { execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8878), CONTROL = process.env.CONTROL === '1';
const CONTROL_REF = process.env.CONTROL_REF || 'origin/main';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0; const FAILS = []; let ENGINE_FAILS = 0, ENGINE_ALL = 0;
const check = (ok, msg, kind) => {
  if (kind === 'engine') { ENGINE_ALL++; if (!ok) ENGINE_FAILS++; }
  if (ok) PASS++; else FAILS.push(msg);
  console.log((ok ? '  ok    ' : '  FAIL  ') + '[' + (kind || 'setup') + '] ' + msg);
};
const HOUR = ['hour.js', 'hour.css', 'hour-bridge.js', 'hour-door.js', 'hour-river.js', 'hour-lane.js'];
const old = f => execFileSync('git', ['show', CONTROL_REF + ':ks3-dt/platform/' + f], { cwd: ROOT, maxBuffer: 1 << 27 });
const OLD = CONTROL ? Object.assign({ 'app.js': old('app.js'), 'engines.js': old('engines.js') },
  ...HOUR.map(f => ({ [f]: old('assets/rescue/rescue/' + f) }))) : null;
async function serveOld(page) {
  if (!CONTROL) return;
  await page.setRequestInterception(true);
  page.on('request', q => {
    const m = /\/platform\/(app\.js|engines\.js)(\?|$)/.exec(q.url()) || /\/rescue\/rescue\/(hour[a-z-]*\.(?:js|css))(\?|$)/.exec(q.url());
    if (m && OLD[m[1]]) q.respond({ status: 200, contentType: m[1].endsWith('.js') ? 'text/javascript' : 'text/css', body: OLD[m[1]] });
    else q.continue();
  });
}
const hhelp = p => p.evaluate(() => (document.getElementById('hhelp').textContent || '').trim());
const beating = p => p.evaluate(() => ['hhelp', 'hrun', 'hh'].filter(id => document.getElementById(id).classList.contains('beat')));
const ask = p => p.evaluate(() => typeof window.__rescueStuck === 'function' ? window.__rescueStuck() : 'none');

async function probe(browser, step) {
  const p = await browser.newPage(); await p.setViewport({ width: 1366, height: 625 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.__errs = errs;
  await serveOld(p);
  await p.goto(`http://localhost:${PORT}/ks3-dt/probes/rescue/hour.html?h=${step}&hfresh&mute&hspeed=1`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(s => window.Hour && Hour.id === s && Hour.input, { timeout: 30000 }, step).catch(() => {});
  await sleep(400);
  return p;
}

(async () => {
  console.log('qa-rescue-stuck' + (CONTROL ? '  [CONTROL: app.js, engines.js and the hour files from ' + CONTROL_REF + ']' : ''));
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    console.log('\n1. The story shows its own next hint at once');
    for (const [step, want1] of [['d_def', /def name\(gap\)/], ['l_mend', /prints the word jump/], ['r_hog', /./]]) {
      const p = await probe(browser, step);
      check(await p.evaluate(s => !!(window.Hour && Hour.id === s && Hour.input), step), step + ': the story is asking for a line', 'setup');
      const h0 = await hhelp(p);
      const a1 = await ask(p); const h1 = await hhelp(p);
      check(a1 === true && h1 && h1 !== h0 && want1.test(h1), step + ': Stuck shows hint 1 under her box (' + JSON.stringify(a1) + ', "' + h1.slice(0, 60) + '")', 'engine');
      const a2 = await ask(p); const h2 = await hhelp(p);
      check(a2 === true && h2 && h2 !== h1, step + ': Stuck again shows hint 2 ("' + h2.slice(0, 60) + '")', 'engine');
      await p.evaluate(() => ['hhelp', 'hrun', 'hh'].forEach(id => document.getElementById(id).classList.remove('beat')));
      const a3 = await ask(p); await sleep(50); const b3 = await beating(p); const h3 = await hhelp(p);
      check(a3 === true && b3.length > 0 && h3 === h2, step + ': with every hint up, Stuck makes the help beat (' + (b3.join(',') || 'nothing beat') + ')', 'engine');
      check(p.__errs.length === 0, step + ': no page errors (' + p.__errs.join(' | ') + ')', 'setup');
      await p.close();
    }
    {
      const p = await probe(browser, 'd_def');
      await p.evaluate(() => document.getElementById('hpause').click()); await sleep(300);
      const a = await ask(p); const h = await hhelp(p);
      check(a === false && !h, 'paused: Stuck says no and shows nothing (' + JSON.stringify(a) + ')', 'engine');
      await p.close();
      const f = await browser.newPage(); await f.setViewport({ width: 1366, height: 625 }); await serveOld(f);
      await f.goto(`http://localhost:${PORT}/ks3-dt/probes/rescue/hour.html?h=r_hogfilm&hfresh&mute`, { waitUntil: 'domcontentloaded' });
      await f.waitForFunction(() => window.Hour && Hour.id === 'r_hogfilm', { timeout: 30000 }).catch(() => {});
      await sleep(400);
      const af = await ask(f);
      check(af === false, 'a film step: Stuck says no, so the platform can open its own help (' + JSON.stringify(af) + ')', 'engine');
      await f.close();
    }

    console.log('\n2. The green button on the lesson asks the story first');
    const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 625 });
    const perrs = []; page.on('pageerror', e => perrs.push(e.message));
    await serveOld(page);
    const url = `http://localhost:${PORT}/ks3-dt/platform/index.html?class=Demo-10A&as=aoife`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
    await page.evaluate(() => {
      const past = Date.now() - 3 * 864e5;
      (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
      App.state.absence = []; App.state.me = App.state.me || {}; App.state.me.L = {};
      App.openLesson('j3-04', {});
    });
    await page.waitForFunction(() => App.state.chunks && App.state.chunks.length && !document.querySelector('#player').hidden, { timeout: 20000 });
    const idx = await page.evaluate(() => App.state.chunks.findIndex(c => c.engine === 'rescue'));
    check(idx >= 0, 'J3 L4 has its Rescue part (chunk ' + idx + ')', 'setup');
    const frameFor = async () => { for (const f of page.frames()) if (/rescue\/hour\.html/.test(f.url())) return f; return null; };
    const toStep = async step => {
      let fr = await frameFor();
      if (!fr) {
        await page.evaluate(i => { App.state.chunkIdx = i; App.remountChunk(); }, idx).catch(() => {});
        for (let n = 0; n < 40 && !fr; n++) { await sleep(250); fr = await frameFor(); }
        if (!fr) return null;
        await fr.waitForFunction(() => window.Hour && Hour.go, { timeout: 20000 }).catch(() => {});
      }
      await fr.evaluate(s => { if (window.Hour && Hour.go) { if (!Hour.on && Hour.takeover) Hour.takeover(false); Hour.go(s); } }, step).catch(() => {});
      await fr.waitForFunction(s => window.Hour && Hour.id === s, { timeout: 20000 }, step).catch(() => {});
      await sleep(600);
      return fr;
    };
    let fr = await toStep('l_mend');
    const onStep = fr && await fr.evaluate(() => window.Hour && Hour.id).catch(() => null);
    check(onStep === 'l_mend', 'the Rescue is on the lane mend inside the lesson (' + onStep + ')', 'setup');
    if (fr && onStep === 'l_mend') {
      await fr.waitForFunction(() => Hour.input, { timeout: 15000 }).catch(() => {});
      const before = await hhelp(fr);
      await page.click('#help-beacon'); await sleep(1200);
      const after = await hhelp(fr);
      const modal = await page.evaluate(() => { const m = document.getElementById('help-modal'); return !!m && !m.hidden && getComputedStyle(m).display !== 'none'; });
      check(after && after !== before, 'pressing Stuck? Show me puts the story\'s next hint under her box ("' + after.slice(0, 50) + '")', 'engine');
      check(!modal, 'and the general help box stays shut', 'engine');
      if (modal) await page.evaluate(() => App.closeModal && App.closeModal('help-modal'));
      fr = await toStep('r_hogfilm');
      const film = fr && await fr.evaluate(() => window.Hour && Hour.id).catch(() => null);
      check(film === 'r_hogfilm', 'the Rescue is on a film step (' + film + ')', 'setup');
      await page.click('#help-beacon'); await sleep(1400);
      const modal2 = await page.evaluate(() => { const m = document.getElementById('help-modal'); return !!m && !m.hidden && getComputedStyle(m).display !== 'none'; });
      check(modal2, 'on a film step the general help box opens as before', 'setup');
    }
    check(perrs.length === 0, 'no page errors in the lesson (' + perrs.join(' | ') + ')', 'setup');
    await page.close();

    console.log('\n3. Nothing sits on "Pause the story"');
    for (const [w, h] of [[1366, 555], [1280, 720], [1920, 960]]) {
      const p = await probe(browser, 'l_mend');
      await p.setViewport({ width: w, height: h }); await sleep(300);
      const r = await p.evaluate(() => {
        const pr = document.getElementById('hprints');
        pr.innerHTML = '<div class=k>WHAT YOUR CODE PRINTS</div><div class=row><span>run</span><span>jump</span><span>run</span></div>';
        pr.classList.add('on'); document.getElementById('hlane').classList.add('up'); document.body.classList.add('h-prints');
        const b = id => { const q = document.getElementById(id).getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; };
        const hit = (a, c) => a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3];
        const pause = b('hpause'), sound = document.getElementById('snd') ? b('snd') : null;
        return ['hlane', 'hprints'].filter(id => hit(b(id), pause) || (sound && hit(b(id), sound)));
      });
      check(r.length === 0, w + 'x' + h + ': the clock bar and the prints chip clear Pause (' + (r.join(',') || 'clear') + ')', 'engine');
      await p.close();
    }
  } finally { await browser.close(); }
  console.log('\n' + PASS + ' passed, ' + FAILS.length + ' failed');
  if (CONTROL) {
    console.log('CONTROL: ' + ENGINE_FAILS + ' of ' + ENGINE_ALL + ' engine checks failed on ' + CONTROL_REF);
    process.exit(ENGINE_FAILS === ENGINE_ALL && ENGINE_ALL > 0 ? 0 : 1);
  }
  process.exit(FAILS.length ? 1 : 0);
})();
