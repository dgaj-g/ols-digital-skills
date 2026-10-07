/* The Rescue on the PLATFORM SHELL: the sit walk. Run: node hour-shell-walk.js [--delay 250]
   A pupil's hour as the platform serves it: the lesson tile, the story in its frame at real story speed (the
   lesson's page has no speed or jump option), typing at a pupil's pace, every Next, badge card and closing
   question pressed as she would. Chapter 1 is opened and seen; the walk then carries on from the river (her
   saved place after chapter 1), because chapter 1's own typed walk is film-type-test.js.
   It writes shell-walk.json: every step she met, how long it held her, how much of each clock she had left,
   and every stretch of 25 s or more where nothing on the screen asked her to act (a stall to read in the sit report). */
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const fs = require('fs'), path = require('path');
const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DELAY = +argOf('--delay', 250), BASE = argOf('--base', 'http://localhost:8121');
const URL = BASE + '/ks3-dt/platform/index.html?class=Demo-10A&as=maeve';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL = 'maeve.torley@demo';
async function seed(page) {
  await page.evaluate((email) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks['Demo-10A'] = db.locks['Demo-10A'] || {};
    for (const n of ['1', '2', '3', '4']) db.locks['Demo-10A'][n] = { u: now, on: 1 };
    const kk = 'Demo-10A:' + email;
    db.pupils = db.pupils || {};
    const rec = db.pupils[kk] || { n: 'Maeve Torley', cn: '', j: 1, xp: 0, g: '' };
    rec.L = rec.L || {};
    for (const n of ['1', '2', '3']) if (!rec.L[n] || Number(rec.L[n][0]) !== 2) rec.L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + Number(n), 10, 0, '', 0, 0];
    delete rec.L['4'];
    db.pupils[kk] = rec;
    /* Lesson 4 always starts clean: no draft, no place */
    const up = (db.userProps || {})[email];
    if (up && up.draft) Object.keys(up.draft).forEach(k => { if (/:4:/.test(k)) delete up.draft[k]; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, EMAIL);
}
const ANSWERS = {
  r_make: ['def cross():', 'print("Billy")', 'print("pull")', 'print("tip")'], r_call1: ['cross()'], r_bobby: ['cross()'],
  r_gap: ['def cross(who):', 'print(who)'], r_call2: ['cross("Bobby")'], r_hog: ['cross("Conker")'], r_retry: ['cross("Conker")'],
  l_make: ['def dash():', 'print("run")', 'print("run")'], l_plan: ['dash()', 'dash()', 'dash()', 'dash()', 'dash()'],
  l_mend: ['print("jump")'], l_retry: ['print("jump")'],
  d_def: ['def rescue(who):'], d_body: ['print("open")', 'print(who)', 'print("shut")'], d_loop: ['for who in gang:', 'rescue(who)']
};
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  const reqs = []; let loaded = false; page.on('request', r => { if (loaded) reqs.push(r.url()); });
  await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2000);
  await seed(page); await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2200);
  await page.evaluate(() => { const x = document.querySelector('.intro-skip'); if (x) x.click(); }); await sleep(600);
  await page.evaluate(() => { const t = [...document.querySelectorAll('.tile')].find(e => /The Rescue/i.test(e.textContent)); t.click(); }); await sleep(2500);
  const first = await page.evaluate(() => App.state.chunks[App.state.chunkIdx].id);
  await page.evaluate(() => { const s = App.state; s.chunkIdx = s.chunks.findIndex(c => c.id === 'rescue'); App.remountChunk(); }); await sleep(3500);
  const fr0 = await (await page.$('iframe.rescue-frame')).contentFrame();
  const ch1 = await fr0.evaluate(() => ({ film: !!window.__film, phase: window.__film && __film.P.phase, title: document.title }));
  /* her saved place after chapter 1: the river */
  await page.evaluate(() => { App.state.draft.rescue = { step: 'r_make', name: '', data: {} }; App.remountChunk(); });
  await sleep(3000); loaded = true;
  const T0 = Date.now(), now = () => +((Date.now() - T0) / 1000).toFixed(1);
  const log = [], stalls = [], clocks = []; let lastAct = Date.now(), cur = null, curAt = 0, used = {};
  let fr = await (await page.$('iframe.rescue-frame')).contentFrame();
  const welcome = await fr.evaluate(() => document.getElementById('hwelcome').classList.contains('on') && document.getElementById('hwmsg').textContent);
  if (welcome) { await sleep(1500); await fr.click('#hwgo'); }
  const misses = [];
  /* a press she cannot make is a finding, not a crash: record where it was and take a picture, then press Enter */
  const covered = [];
  const press = async (sel, sid) => {
    /* is anything of the platform's lying on top of the button she is about to press? */
    const r = await fr.evaluate(sel => { const b = document.querySelector(sel).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.right - 4, b.bottom - 4]; }, sel);
    const on = await page.evaluate(r => { const f = document.querySelector('iframe.rescue-frame').getBoundingClientRect();
      return [[r[0], r[1]], [r[2], r[3]]].map(([x, y]) => document.elementFromPoint(f.left + x, f.top + y)).filter(e => e && e.tagName !== 'IFRAME').map(e => e.id || e.className); }, r);
    if (on.length) covered.push({ step: sid, sel, by: on });
    try { await fr.click(sel, { timeout: 4000 }); return; } catch (e) {
      const g = await fr.evaluate(sel => { const e = document.querySelector(sel), r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), ih: innerHeight, sy: scrollY, text: e.textContent }; }, sel);
      const fb = await page.evaluate(() => { const r = document.querySelector('iframe.rescue-frame').getBoundingClientRect(); return { top: r.top, h: r.height, sy: scrollY }; });
      const shot = 'miss-' + misses.length + '-' + sid + '.png'; await page.screenshot({ path: path.join(__dirname, 'shots', shot) });
      misses.push({ step: sid, sel, inFrame: g, frame: fb, shot });
      await page.keyboard.press('Enter');
    }
  };
  const deadline = Date.now() + 40 * 60000; let end = '';
  while (Date.now() < deadline) {
    const chunk = await page.evaluate(() => App.state.chunks[App.state.chunkIdx].id);
    if (chunk !== 'rescue') { end = 'the platform moved on to ' + chunk; break; }
    const ending = await page.$('.stretch-go'); if (ending) { end = 'the story ended; the platform shows its stretch card'; break; }
    let s; try {
      s = await fr.evaluate(() => ({ id: Hour.id, asking: !!Hour.input && document.getElementById('hcard').classList.contains('on'), badge: document.getElementById('hbadge').classList.contains('on'),
        next: !document.getElementById('hnext').disabled && getComputedStyle(document.getElementById('hnav')).display !== 'none' && document.getElementById('hnav').getBoundingClientRect().height > 0,
        opts: document.querySelectorAll('#hp .opts button').length, good: !!document.querySelector('#hp .qfb.good'),
        run: document.getElementById('hcard').classList.contains('on') && (b => b.classList.contains('on') && !b.disabled)(document.getElementById('hrun')),
        gauge: document.getElementById('hgauge').classList.contains('on') ? document.getElementById('hgb').style.width : '',
        say: document.getElementById('hsayt').textContent, fb: document.getElementById('hfb').textContent }));
    } catch (e) { fr = await (await page.$('iframe.rescue-frame')).contentFrame(); continue; }
    if (s.id !== cur) { if (cur) log.push({ step: cur, at: curAt, held: +(now() - curAt).toFixed(1) }); cur = s.id; curAt = now(); }
    let acted = false;
    if (s.badge) { await sleep(1200); await fr.click('#hbgo'); acted = true; }
    else if (s.opts && !s.good) {
      for (let i = 0; i < s.opts; i++) { await sleep(900); await fr.click('#hp .opts button >> nth=' + i); if (await fr.$('#hp .qfb.good')) break; }
      acted = true;
    } else if (s.next && !s.asking) { await sleep(1800); await press('#hnext', s.id); acted = true;
    } else if (s.asking) {
      const q = ANSWERS[s.id] || []; used[s.id] = used[s.id] || 0;
      if (used[s.id] < q.length) {
        await sleep(1500); const g0 = await fr.evaluate(() => document.getElementById('hgb').style.width);
        await page.keyboard.type(q[used[s.id]], { delay: DELAY }); await page.keyboard.press('Enter'); used[s.id]++;
        await sleep(300);
        const after = await fr.evaluate(() => ({ g: document.getElementById('hgb').style.width, fb: document.getElementById('hfb').textContent, on: document.getElementById('hgauge').classList.contains('on') }));
        if (after.on) clocks.push({ step: s.id, line: q[used[s.id] - 1], gaugeLeftAfter: after.g });
        if (/bad/.test(await fr.evaluate(() => document.getElementById('hfb').className))) log.push({ step: s.id, refused: q[used[s.id] - 1], fb: after.fb });
        acted = true;
      } else if (s.run) { await sleep(1200); await press('#hrun', s.id); acted = true; }
      else if (s.next) { await sleep(1000); await press('#hnext', s.id); acted = true; }
    } else if (s.run) { await sleep(1200); await press('#hrun', s.id); acted = true; }
    else if (s.next) { await sleep(1800); await press('#hnext', s.id); acted = true; }
    if (acted) { const gap = (Date.now() - lastAct) / 1000; if (gap >= 25) stalls.push({ step: s.id, waited: +gap.toFixed(1), before: s.say.slice(0, 90) }); lastAct = Date.now(); }
    await sleep(250);
  }
  if (cur) log.push({ step: cur, at: curAt, held: +(now() - curAt).toFixed(1) });
  const draft = await page.evaluate(() => ({ step: App.state.draft.rescue && App.state.draft.rescue.step, name: App.state.draft.rescue && App.state.draft.rescue.name, xp: App.state.xp }));
  const res = { opened: first, chapter1: ch1, welcome, end: end || 'TIMED OUT after 40 minutes', minutes: +(now() / 60).toFixed(1), draft, misses, covered, steps: log, clocks, stalls,
    requestsAfterLoad: reqs.filter(u => !/localhost/.test(u) || /script\.google/.test(u)), pageErrors: errs };
  fs.writeFileSync(path.join(__dirname, 'shell-walk.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ opened: res.opened, chapter1: ch1, welcome, end: res.end, minutes: res.minutes, draft, stalls: stalls.length, misses: misses.length, covered: covered.length, errs: errs.length, outsideRequests: res.requestsAfterLoad.length }));
  await b.close();
  process.exit(end && !errs.length ? 0 : 1);
})();
