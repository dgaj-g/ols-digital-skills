/* J2 L5 Loop Machines · chapter 4 guess screens ("Read Dad's flight. What will it do?") · gate written 25 Nov 2026
   Found on the live walk at 1366x625: after a wrong guess and Run, "Click Run to see." stayed, nothing said the guess was
   wrong, and Next was pushed below the panel (half hidden behind the chapter strip). Also checks chapter 3's pictures
   draw the range(10) square (drawSquare(10)), not an 11th 100 m arm.
   For each guess screen (h2, h3, h4) at four sizes: pick a guess (wrong, then right), click Run, wait for Next, then
     - "Click Run to see." is gone and the line says right or wrong, matching the guess;
     - the picked option is marked right/wrong and the other two are hidden;
     - Next sits wholly inside the panel and is not covered by the chapter strip.
   Files are served from disk through page.route (no server needed).
   CONTROL=1 serves chapters.js from git HEAD~0 BEFORE this fix (base commit given by --base-rev, default HEAD): must go RED.
     node ks3-dt/tools/record-tutorial/qa-j2l5-guess.js            (expects PASS, exit 0)
     CONTROL=1 node ks3-dt/tools/record-tutorial/qa-j2l5-guess.js  (expects RED, exit 1) */
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright')); }
const ASSETS = path.join(__dirname, '../../platform/assets');
const CH = path.join(ASSETS, 'search/hour/chapters.js');
const CONTROL = process.env.CONTROL === '1';
const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const REV = argOf('--base-rev', 'HEAD');
/* CONTROL serves the HEAD copies of every file this gate covers (chapters.js, free.js, strings.js) */
const OLD = f => cp.execSync('git show ' + REV + ':ks3-dt/platform/assets/search/hour/' + f, { cwd: path.join(__dirname, '../../..'), encoding: 'utf8', maxBuffer: 1 << 26 });
const SERVE = {};
for (const f of ['chapters.js', 'free.js', 'strings.js']) SERVE[path.join(ASSETS, 'search/hour', f)] = CONTROL ? OLD(f) : fs.readFileSync(path.join(ASSETS, 'search/hour', f), 'utf8');
let chaptersSrc = SERVE[CH];
let passes = 0, fails = 0;
const must = (ok, msg) => { if (ok) passes++; else fails++; console.log((ok ? '  PASS ' : '  FAIL ') + msg); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webp': 'image/webp' };
const SCREENS = [
  { at: 'h2', right: 'Lights 5 gates. One stays dark.', wrong: 'Lights all 6 gates' },
  { at: 'h3', right: 'Drifts off the walls', wrong: 'Never stops' },
  { at: 'h4', right: 'Never stops', wrong: 'Stops at the barn' }
];
const SIZES = [[1366, 625], [1366, 768], [1280, 720], [1920, 1080]];

/* the static picture check: chapter 3's found-her + recap pictures draw the range(10) square */
must(!/drawSquare\(11\b/.test(chaptersSrc), 'chapter 3 pictures draw drawSquare(10), never drawSquare(11)');
const strSrc = SERVE[path.join(ASSETS, 'search/hour/strings.js')];
must(!/start of this chapter/.test(strSrc), 'the rewind line says BEEP goes back to the step, not the start of the chapter');
must(!/h: 'Name the bug\.'/.test(chaptersSrc), 'the bug question names Dad\'s flight');
must(!/'Yes\. \d+ rounds for \d+ gates\.'/.test(chaptersSrc), 'off-by-one answers say what range() gives');

async function one(b, size, sc, pickRight) {
  const page = await b.newPage({ viewport: { width: size[0], height: size[1] } });
  const errs = []; page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await page.route('http://gate.local/**', route => {
    const u = new URL(route.request().url()); const p = path.join(ASSETS, decodeURIComponent(u.pathname));
    if (SERVE[p] != null) return route.fulfill({ status: 200, contentType: TYPES['.js'], body: SERVE[p] });
    if (!p.startsWith(ASSETS) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ status: 200, contentType: TYPES[path.extname(p)] || 'application/octet-stream', body: fs.readFileSync(p) });
  });
  await page.route(/^https?:\/\/(?!gate\.local)/, route => route.abort());
  await page.goto('http://gate.local/search/hour.html?at=' + sc.at + '&fast=1#' + encodeURIComponent('{"test":1}'), { waitUntil: 'load' });
  await page.waitForFunction(() => window.U && window.__hour, null, { timeout: 15000 });
  const tag = sc.at + ' ' + size.join('x') + ' ' + (pickRight ? 'right' : 'wrong') + ' guess';
  /* click Next through any talk lines until the guess screen's options show */
  const t0 = Date.now(); let ready = false;
  while (Date.now() - t0 < 30000) {
    const s = await page.evaluate(() => { const P = document.getElementById('panel'); const o = P && P.querySelectorAll('.opt').length; const nx = P && P.querySelector('.btns .next.on'); if (o) return 'opts'; if (nx) { nx.click(); return 'next'; } return 'wait'; });
    if (s === 'opts') { ready = true; break; } await sleep(80);
  }
  if (!ready) { must(false, tag + ': guess screen never showed' + (errs.length ? ' · ' + errs[0] : '')); await page.close(); return; }
  const want = pickRight ? sc.right : sc.wrong;
  await page.evaluate(w => { const o = [...document.querySelectorAll('#panel .opt')].find(x => x.textContent === w); if (o) o.click(); }, want);
  await sleep(100);
  await page.evaluate(() => { const r = document.querySelector('#panel .run'); if (r) r.click(); });
  /* the while True flight never stops: press Stop when it shows */
  const t1 = Date.now(); let nextOn = false; const stopSeen = [];
  while (Date.now() - t1 < 40000) {
    const s = await page.evaluate(() => {
      const sb = document.querySelector('#panel .stopit');
      if (sb) {
        /* before pressing Stop: it must be seen (inside the panel, uncovered) and the battery clock must not be running */
        const P = document.getElementById('panel'), pr = P.getBoundingClientRect(), r = sb.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const seen = r.height > 0 && r.bottom <= pr.bottom + 0.5 && r.bottom <= innerHeight && !!hit && (hit === sb || sb.contains(hit));
        const info = { seen: seen, clock: !!(window.U && U.clock && U.clock.run), sb: Math.round(r.bottom), pb: Math.round(pr.bottom) };
        sb.click(); return info;
      }
      return document.querySelector('#panel .btns .next.on') ? 'next' : 'wait';
    });
    if (s && typeof s === 'object') stopSeen.push(s);
    if (s === 'next') { nextOn = true; break; } await sleep(100);
  }
  if (sc.at === 'h4') {
    must(stopSeen.length > 0 && stopSeen[0].seen, tag + ': Stop shows inside the panel during the endless run' + (stopSeen[0] ? ' (stop bottom ' + stopSeen[0].sb + ', panel bottom ' + stopSeen[0].pb + ')' : ' (never showed)'));
    must(stopSeen.length > 0 && !stopSeen[0].clock, tag + ': the battery clock is not running during the guess run');
  }
  must(nextOn, tag + ': Next shows after the run');
  const m = await page.evaluate(() => {
    const P = document.getElementById('panel'), pr = P.getBoundingClientRect();
    const nx = P.querySelector('.btns .next'), nr = nx.getBoundingClientRect();
    const strip = [...document.querySelectorAll('body *')].filter(e => /strip/i.test(e.id + ' ' + e.className) && e.getBoundingClientRect().height > 0)[0];
    const sr = strip ? strip.getBoundingClientRect() : null;
    const shown = [...P.querySelectorAll('.opt')].filter(o => o.offsetParent !== null);
    const hit = document.elementFromPoint(nr.left + nr.width / 2, nr.top + nr.height / 2);
    return { fb: (P.querySelector('.fb') || {}).textContent || '', shown: shown.map(o => o.textContent + '|' + o.className),
      nb: nr.bottom, pb: pr.bottom, nt: nr.top, st: sr ? sr.top : null, covered: !(hit && (hit === nx || nx.contains(hit))), vh: innerHeight };
  });
  must(!/Click Run to see/.test(m.fb), tag + ': "Click Run to see." is gone after the run (line now: "' + m.fb + '")');
  must(pickRight ? /right/.test(m.fb) && !/wrong/.test(m.fb) : /wrong/.test(m.fb), tag + ': the line says the guess was ' + (pickRight ? 'right' : 'wrong'));
  must(m.shown.length === 1 && m.shown[0].startsWith(want + '|') && m.shown[0].includes(pickRight ? 'right' : 'wrong'), tag + ': only her guess shows, marked ' + (pickRight ? 'right' : 'wrong') + ' (' + m.shown.join(' / ') + ')');
  must(m.nb <= m.pb + 0.5 && !m.covered && m.nb <= m.vh, tag + ': Next sits inside the panel, uncovered (next bottom ' + m.nb.toFixed(0) + ', panel bottom ' + m.pb.toFixed(0) + (m.covered ? ', COVERED' : '') + ')');
  if (sc.at === 'h4' && size[1] === 625) {
    /* on into the fix task: the banner says the clock starts when she types, so it must be still before the first key and running after it */
    const t2 = Date.now(); let box = false;
    while (Date.now() - t2 < 20000) {
      const s2 = await page.evaluate(() => { const P = document.getElementById('panel'); const ta = P.querySelector('textarea:not([readonly])'); if (ta) return 'box'; const nx = P.querySelector('.btns .next.on'); if (nx) { nx.click(); return 'next'; } return 'wait'; });
      if (s2 === 'box') { box = true; break; } await sleep(100);
    }
    must(box, tag + ': the fix task opens after the guess');
    if (box) {
      const before = await page.evaluate(() => ({ run: U.clock.run, left: U.clock.left, total: U.clock.total }));
      must(!before.run && before.left === before.total, tag + ': battery clock still full before she types (' + before.left + ' of ' + before.total + ')');
      await page.click('#panel textarea:not([readonly])'); await page.keyboard.press('End'); await page.keyboard.type(' ');
      await sleep(300);
      const after = await page.evaluate(() => U.clock.run);
      must(after, tag + ': battery clock starts on her first key');
      /* only line 1 changes: Enter must not glue her next words onto line 1 or claim the box moved her line in */
      await page.keyboard.press('Enter'); await page.keyboard.type('forward(10)'); await sleep(200);
      const en = await page.evaluate(() => { const P = document.getElementById('panel'); const ta = P.querySelector('textarea:not([readonly])'); return { v: ta.value, txt: P.innerText }; });
      const ls = en.v.split('\n');
      must(ls.length === 3 && ls[1] === '    forward(10)' && ls[2] === '    look()', tag + ': lines 2 and 3 stay as they were after Enter (' + JSON.stringify(ls.slice(1)) + ')');
      must(!/moved your line in/.test(en.txt), tag + ': no "moved your line in" note after Enter on line 1');
      must(/Change only line 1, then press Run\./.test(en.txt), tag + ': Enter on line 1 says to change only line 1, then press Run');
      /* range(60): the flight must end past the barn with its own line, not run the battery flat */
      await page.click('#panel textarea:not([readonly])'); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('for i in range(60):');
      await page.evaluate(() => { U.fast = false; /* real flight speed, so the 40 s battery is a real race */ const r = document.querySelector('#panel .run'); if (r) r.click(); });
      const t3 = Date.now(); let said = '';
      while (Date.now() - t3 < 70000) {
        said = await page.evaluate(() => document.getElementById('panel').innerText);
        if (/range\(60\) flies|battery died|My battery/i.test(said)) break; await sleep(200);
      }
      must(/range\(60\) flies 60 steps/.test(said) && !/battery died/i.test(said), tag + ': range(60) ends with its own line before the battery dies (' + ((Date.now() - t3) / 1000).toFixed(0) + ' s)');
    }
  }
  must(errs.length === 0, tag + ': no page errors' + (errs.length ? ' · ' + errs[0] : ''));
  await page.close();
}

async function page0(b, q, hash) {
  const page = await b.newPage({ viewport: { width: 1366, height: 625 } });
  page.errs = []; page.on('pageerror', e => page.errs.push(String(e).split('\n')[0]));
  await page.route('http://gate.local/**', route => {
    const u = new URL(route.request().url()); const p = path.join(ASSETS, decodeURIComponent(u.pathname));
    if (SERVE[p] != null) return route.fulfill({ status: 200, contentType: TYPES['.js'], body: SERVE[p] });
    if (!p.startsWith(ASSETS) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ status: 200, contentType: TYPES[path.extname(p)] || 'application/octet-stream', body: fs.readFileSync(p) });
  });
  await page.route(/^https?:\/\/(?!gate\.local)/, route => route.abort());
  await page.goto('http://gate.local/search/hour.html?' + q + '#' + encodeURIComponent(JSON.stringify(hash)), { waitUntil: 'load' });
  await page.waitForFunction(() => window.U && window.__hour, null, { timeout: 15000 });
  return page;
}
/* the close, from the exit check: the panel goes before the barn film; her name for the lamb is said back */
async function closeCheck(b) {
  const page = await page0(b, 'at=h5&fast=1', { test: 1 });
  const t0 = Date.now(); let film = false, clicked = new Set();
  while (Date.now() - t0 < 60000) {
    const s = await page.evaluate(() => {
      const F = document.getElementById('film'); if (F && !F.classList.contains('hide') && F.querySelector('.bar')) return 'film';
      const P = document.getElementById('panel'); if (!P) return 'wait';
      const nx = P.querySelector('.btns .next.on'); if (nx) { nx.click(); return 'next'; }
      const o = [...P.querySelectorAll('.opt')].find(x => !x.dataset.gateTried && getComputedStyle(x).display !== 'none'); if (o) { o.dataset.gateTried = 1; o.click(); return 'opt'; }
      return 'wait';
    });
    if (s === 'film') { film = true; break; } await sleep(80);
  }
  must(film, 'close: the barn film starts after the exit check');
  if (film) {
    const pv = await page.evaluate(() => { const P = document.getElementById('panel'); return { hidden: P.classList.contains('hide') || getComputedStyle(P).display === 'none', txt: P.innerText.trim().slice(0, 60) }; });
    must(pv.hidden, 'close: no panel sits over the barn film' + (pv.hidden ? '' : ' (panel shows: ' + pv.txt + ')'));
    const t1 = Date.now(); let named = false;
    while (Date.now() - t1 < 30000) {
      const s = await page.evaluate(() => {
        const F = document.getElementById('film'); const fn = F && !F.classList.contains('hide') && F.querySelector('.next.on'); if (fn) { fn.click(); return 'film'; }
        const nb = document.querySelector('#panel .namebox'); if (nb) return 'name';
        const nx = document.querySelector('#panel .btns .next.on'); if (nx) { nx.click(); return 'next'; } return 'wait';
      });
      if (s === 'name') { named = true; break; } await sleep(80);
    }
    must(named, 'close: the name box shows');
    if (named) {
      await page.fill('#panel .namebox', 'Bramble'); await page.keyboard.press('Enter');
      const t2 = Date.now(); let said = '';
      while (Date.now() - t2 < 8000) { said = await page.evaluate(() => document.getElementById('panel').innerText); if (/Bramble/.test(said) || /badge/i.test(said)) break; await sleep(100); }
      must(/Bramble it is\. Welcome home, Bramble\./.test(said), 'close: Nuala says her name for the lamb back ("' + said.replace(/\s+/g, ' ').trim().slice(0, 70) + '")');
    }
  }
  must(page.errs.length === 0, 'close: no page errors' + (page.errs.length ? ' · ' + page.errs[0] : ''));
  await page.close();
}
/* free flight: a wrong line gets the reader's own words, never the lesson's 'on the card' line */
async function freeCheck(b) {
  const page = await page0(b, 'fast=1', { test: 1, stage: 'free' });
  await page.waitForSelector('#panel textarea:not([readonly])', { timeout: 15000 }).catch(() => {});
  const cases = [
    ['for i in range(8)\n    forward(10)', /The for line needs a colon/, 'a missing colon'],
    ['for i in range(8):\nforward(10)', /4 spaces/, 'a missing indent'],
    ['fly(10)', /BEEP cannot read line 1\. Check what you typed on that line/, 'an unknown word']
  ];
  for (const [code, want, what] of cases) {
    await page.click('#panel textarea:not([readonly])'); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace');
    await page.evaluate(c => { const ta = document.querySelector('#panel textarea:not([readonly])'); ta.value = c; ta.dispatchEvent(new Event('input', { bubbles: true })); }, code);
    await page.evaluate(() => { const r = document.querySelector('#panel .run'); if (r) r.click(); });
    await sleep(500);
    const txt = await page.evaluate(() => document.getElementById('panel').innerText);
    must(want.test(txt) && !/on the card/.test(txt), 'free flight: ' + what + ' gets its own words (' + (txt.match(/(BEEP cannot[^\n]*|The for line[^\n]*|Use 4[^\n]*|Put 4[^\n]*)/) || ['none'])[0] + ')');
  }
  must(page.errs.length === 0, 'free flight: no page errors' + (page.errs.length ? ' · ' + page.errs[0] : ''));
  await page.close();
}

(async () => {
  const b = await chromium.launch();
  await closeCheck(b); await freeCheck(b);
  if (process.env.ONLY_NEW === '1') { await b.close(); console.log((CONTROL ? 'CONTROL ' : '') + (fails ? 'RED ' + fails + ' of ' + (passes + fails) : 'PASS ' + passes)); process.exit(fails ? 1 : 0); }
  for (const sc of SCREENS) for (const size of SIZES) for (const pr of [false, true]) {
    if (pr && size[0] !== 1366) continue; /* the right-guess pass at the two school sizes only */
    await one(b, size, sc, pr);
  }
  await b.close();
  console.log((CONTROL ? 'CONTROL ' : '') + (fails ? 'RED ' + fails + ' of ' + (passes + fails) : 'PASS ' + passes));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
