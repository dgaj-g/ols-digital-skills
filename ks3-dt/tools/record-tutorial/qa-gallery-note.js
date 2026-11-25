/* J1 L5 PRESS NIGHT · a half-typed V2 note is never wiped (25 Nov 2026, a teacher's find in class).
   The fault: the gallery floor asks the server for news every 4 seconds and every reply rebuilt the note box from
   the last SAVED note. A pupil typed a few words, the box emptied, and she was back at the start, again and again.
   The gate mounts the real gallery engine (real engines.js, real style.css, the lesson's own Press Night card) in
   the dev platform page with a stand-in server whose replies the gate controls, then TYPES like a pupil:
     1  a sentence typed slowly across at least two server replies stays whole, the cursor stays in the box
     2  a review landing mid-sentence changes the question line and nothing else
     3  a trip to the Review Desk and back keeps the half-typed note
     4  a note that is too short gets its nudge, and the nudge is still there to read 5 seconds later
     5  the finished note files, shows on the done card, and is saved once as filed
   And first (0, added 25 Nov after the regression walk caught it): the floor paints once BEFORE the server's first
   reply, when no other studio is known. The box must still lock once the reply shows studios and her passes are
   unspent: reviews first, the V2 note second. Keeping that early box alive let a pupil skip both reviews.
   CONTROL=1 serves engines.js as it was at c04a6c9b (before the fix): the gate must go RED.
   CONTROL=2 serves engines.js as it was at 1ecb2b9d (the first fix, which kept the early box alive): must go RED.
   NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-gallery-note.js [--port=8851] */
const puppeteer = require('puppeteer'), path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8851), CONTROL = process.env.CONTROL === '1' || process.env.CONTROL === '2';
const BASE = process.env.CONTROL === '2' ? '1ecb2b9d' : 'c04a6c9b';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0; const FAILS = [];
const check = (ok, msg) => { if (ok) { PASS++; console.log('  PASS  ' + msg); } else { FAILS.push(msg); console.log('  FAIL  ' + msg); } };
const oldEngines = CONTROL ? execFileSync('git', ['show', BASE + ':ks3-dt/platform/engines.js'], { cwd: ROOT, maxBuffer: 1 << 27 }) : null;
const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'ks3-dt/content/j1/lessons/j1-05.json'), 'utf8'));
const chunk = (lesson.chunks || []).find(c => c.engine === 'gallery');
const HALF1 = 'In version 2 I would make the sushi fall faster ', HALF2 = 'because a review said level one was too easy.';
const THIN = 'make it better';

(async () => {
  if (!chunk) { console.log('FAIL no gallery card in j1-05.json'); process.exit(2); }
  const srv = spawn('node', [path.join(ROOT, 'ks3-dt/tools/dev-static.js'), String(PORT), ROOT], { stdio: 'ignore' });
  await sleep(700);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 625 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (CONTROL) {
    await page.setRequestInterception(true);
    page.on('request', q => /\/platform\/engines\.js(\?|$)/.test(q.url()) ? q.respond({ status: 200, contentType: 'text/javascript', body: oldEngines }) : q.continue());
  }
  await page.goto(`http://localhost:${PORT}/ks3-dt/platform/index.html?class=Demo-8A&as=anya`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.Engines && window.Engines.gallery && window.App, { timeout: 20000 });
  await sleep(1500);
  await page.evaluate((chunk) => {
    window.__feed = { ok: true, given: 0, total: 5, studioCount: 3, myReviews: [], studios: [
      { sid: 'me', mine: true, sn: 'Studio Anya', gt: 'Sushi Drop', gh: 'Catch the sushi before it lands.', rn: 0, tpl: 'catch' },
      { sid: 's2', sn: 'Studio Two', gt: 'Maze Run', gh: 'Find the way out of the maze.', rn: 0, tpl: 'maze' },
      { sid: 's3', sn: 'Studio Three', gt: 'Quiz Night', gh: 'Answer five questions.', rn: 1, tpl: 'quiz' }] };
    window.__calls = 0; window.__saved = [];
    const host = document.createElement('div'); host.className = 'chunk-host'; host.id = 'gate-host';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#fff;overflow:auto;padding:12px';
    document.body.appendChild(host);
    App.state = App.state || {};
    Engines.gallery.mount(host, chunk, {
      draft: {}, catchup: false, review: false, lesson: { id: 'j1-05' }, chunk: chunk,
      /* the first reply is slow, as it is on a busy school network: the floor paints once before it */
      call: function (name) {
        if (name === 'galleryFeed') {
          window.__calls++;
          const copy = JSON.parse(JSON.stringify(window.__feed));
          return window.__calls === 1 ? new Promise(r => setTimeout(() => r(copy), 1500)) : Promise.resolve(copy);
        }
        return Promise.resolve({ ok: true });
      },
      saveEvent: function (e) { window.__saved.push(JSON.parse(JSON.stringify(e))); },
      awardBadge: function () { return Promise.resolve(); }, next: function () { window.__next = 1; }
    });
  }, chunk);
  /* a real mouse click: the platform's cards ignore a scripted click fired the instant a card appears */
  const clickText = async (re) => {
    const h = await page.evaluateHandle((src) => Array.from(document.querySelectorAll('#gate-host button')).find(x => new RegExp(src, 'i').test(x.textContent) && !x.disabled) || null, re);
    const elh = h.asElement(); if (!elh) return false;
    await elh.evaluate(n => n.scrollIntoView({ block: 'center' })); await sleep(150); await elh.click(); return true;
  };
  const box = () => page.evaluate(() => { const t = document.querySelector('#gate-host .gal-v2-input'); return t ? { v: t.value, focus: document.activeElement === t, caret: t.selectionStart } : null; });
  /* she selects everything in the box and deletes it with the keyboard */
  const clearBox = async () => { await page.click('#gate-host .gal-v2-input'); await page.evaluate(() => document.querySelector('#gate-host .gal-v2-input').select()); await page.keyboard.press('Backspace'); };
  const calls = () => page.evaluate(() => window.__calls);
  const promptLine = () => page.evaluate(() => { const c = document.querySelector('#gate-host .gal-v2-card'); const p = c && c.querySelector('p'); return p ? p.textContent : ''; });
  const cfg = chunk.config || {}, pNo = (cfg.v2 && cfg.v2.promptNoReviews) || 'While reviews come in: what is the ONE thing version 2 of your game would change, and why?';
  const pYes = (cfg.v2 && cfg.v2.prompt) || 'Read your reviews. Pick ONE that sparked something - what will version 2 change, and why?';

  await sleep(900);
  check(await clickText('Onto the floor'), 'the Reviewer’s Code card opens the floor');

  console.log('\n== 0 · the floor opens before the server answers, passes not spent ==');
  for (let i = 0; i < 30 && (await calls()) < 2; i++) await sleep(400);
  await sleep(300);
  check(!(await box()) && await page.evaluate(() => !!document.querySelector('#gate-host .gal-v2-card.locked')),
    'two studios to review, no pass spent: the V2 note is locked (reviews first)');
  await page.evaluate(() => { window.__feed.given = 2; });
  let cg = await calls();
  for (let i = 0; i < 30 && (await calls()) - cg < 1; i++) await sleep(400);
  await sleep(300);
  check(!!(await box()), 'both passes spent: the V2 note box is on the floor');
  check((await promptLine()) === pNo, 'no reviews yet: the box asks the "while reviews come in" question');

  console.log('\n== 1 · a slow sentence across the 4-second replies ==');
  let c0 = await calls();
  await page.click('#gate-host .gal-v2-input');
  await page.keyboard.type(HALF1, { delay: 190 });
  let b = await box(), polled = (await calls()) - c0;
  check(polled >= 2, 'the floor heard from the server at least twice while she typed (' + polled + ')');
  check(b && b.v === HALF1, 'every word she typed is still in the box' + (b && b.v !== HALF1 ? ' (box holds "' + b.v + '")' : ''));
  check(b && b.focus && b.caret === HALF1.length, 'the cursor is still in the box, at the end of her words');

  console.log('\n== 2 · a review lands mid-sentence ==');
  c0 = await calls();
  await page.evaluate(() => { window.__feed.myReviews = [{ i: 'r1', bcn: 'Quiet Otter', l: 'the sushi looks great and falls smoothly', w: 'if level one could be a bit harder' }]; window.__feed.total = 6; });
  for (let i = 0; i < 30 && (await calls()) - c0 < 2; i++) await sleep(400);
  b = await box();
  check((await promptLine()) === pYes, 'the question line now asks about her reviews');
  check(b && b.v === HALF1 && b.focus, 'her half-typed note and her cursor are untouched');
  check(await page.evaluate(() => document.querySelectorAll('#gate-host .gal-incoming-list .gal-review-item').length === 1), 'the review shows under "Your reviews land here"');
  await page.keyboard.type(HALF2, { delay: 60 });
  b = await box();
  check(b && b.v === HALF1 + HALF2, 'she carries on and the whole sentence is there');

  console.log('\n== 3 · to the Review Desk and back ==');
  await page.evaluate(() => document.querySelector('#gate-host .gal-marquee-grid .gal-marquee-card.clickable').click());
  await sleep(400);
  check(await page.evaluate(() => !!document.querySelector('#gate-host .gal-desk')), 'a marquee card opens the Review Desk');
  await page.evaluate(() => document.querySelector('#gate-host .std-back').click());
  await sleep(600);
  b = await box();
  check(b && b.v === HALF1 + HALF2, 'back on the floor her note is still in the box' + (b && b.v !== HALF1 + HALF2 ? ' (box holds "' + b.v + '")' : ''));

  console.log('\n== 4 · a note that is too short ==');
  await clearBox();
  await page.keyboard.type(THIN, { delay: 40 });
  await clickText('File the V2 note');
  await sleep(300);
  const nudge0 = await page.evaluate(() => (document.querySelector('#gate-host .gal-v2-zone .gal-v2-nudge') || {}).textContent || '');
  check(/6\+ words|reason/i.test(nudge0), 'three words: the nudge says what a real note needs');
  c0 = await calls();
  for (let i = 0; i < 30 && (await calls()) - c0 < 2; i++) await sleep(400);
  const nudge1 = await page.evaluate(() => (document.querySelector('#gate-host .gal-v2-zone .gal-v2-nudge') || {}).textContent || '');
  b = await box();
  check(nudge1 === nudge0 && nudge0 !== '', 'two replies later the nudge is still there to read');
  check(b && b.v === THIN, 'and her three words are still there to add to');
  check(await page.evaluate(() => !window.__saved.some(e => e.draft && e.draft.gallery && e.draft.gallery.v2ok)), 'nothing was filed as finished yet');

  console.log('\n== 5 · the finished note files ==');
  await clearBox();
  await page.keyboard.type(HALF1 + HALF2, { delay: 15 });
  await clickText('File the V2 note');
  await sleep(500);
  const done = await page.evaluate(() => (document.querySelector('#gate-host .gal-v2-card.done') || {}).textContent || '');
  check(done.indexOf((HALF1 + HALF2).trim()) >= 0, 'the done card shows her whole note');
  const saved = await page.evaluate(() => window.__saved.filter(e => e.draft && e.draft.gallery && e.draft.gallery.v2ok));
  check(saved.length === 1 && saved[0].draft.gallery.v2 === (HALF1 + HALF2).trim(), 'it was saved once, as filed, with her words');
  c0 = await calls();
  for (let i = 0; i < 30 && (await calls()) - c0 < 2; i++) await sleep(400);
  check(await page.evaluate(() => !!document.querySelector('#gate-host .gal-v2-card.done') && !document.querySelector('#gate-host .gal-v2-input')), 'two replies later the done card is still the done card');
  check(await clickText('Wrap Press Night'), 'Wrap Press Night is there to click');
  await sleep(300);
  check(await page.evaluate(() => !!document.querySelector('#gate-host .gal-wrapcard')), 'and it opens the closing card');
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0].slice(0, 120) : ''));

  await browser.close(); srv.kill();
  console.log('\nqa-gallery-note' + (CONTROL ? ' (CONTROL)' : '') + ': ' + (FAILS.length ? 'RED ' + FAILS.length + ' of ' + (PASS + FAILS.length) : 'PASS ' + PASS));
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.log('FAIL', e.message); process.exit(2); });
