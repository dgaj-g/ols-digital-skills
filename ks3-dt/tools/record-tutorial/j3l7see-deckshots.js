#!/usr/bin/env node
/* J3 L7 TEACH IT TO SEE · the four pupil screens that go on the teacher deck, taken from the BUILT lesson
 * on the platform at 1366x768 (the screen a pupil has). Each picture is taken only while the screen it
 * names is the one showing (checked before and after the shutter), and writes a manifest row that
 * qa-deck-shots.js re-checks against CHROME_PINS['j3-07'] and the packed chunk's fingerprint.
 *   node ks3-dt/tools/record-tutorial/j3l7see-deckshots.js [--base http://localhost:8137] */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const args = process.argv.slice(2), argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8137'), CLASS = 'Demo-10A', EMAIL = 'orla.mccann@demo';
const URL = BASE + '/ks3-dt/platform/index.html?class=' + CLASS + '&as=orla';
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'platform', 'assets', 'img', 'deck', 'j3-07');
const People = require(path.join(ROOT, 'platform/assets/see/see/people.js')).SeePeople;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function seed(page, keepDraft) {
  await page.evaluate(([email, cls, keep]) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev')), now = Math.floor((Date.now() - 1767225600000) / 60000), kk = cls + ':' + email;
    db.locks = db.locks || {}; db.locks[cls] = db.locks[cls] || {};
    for (const n of ['1', '2', '3', '4', '5', '6', '7']) db.locks[cls][n] = { u: now, on: 1 };
    db.pupils = db.pupils || {};
    const rec = db.pupils[kk] || { n: 'Orla McCann', cn: '', j: 3, xp: 0, g: '' }; rec.L = rec.L || {};
    for (const n of ['1', '2', '3', '4', '5', '6']) if (!rec.L[n] || Number(rec.L[n][0]) !== 2) rec.L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + Number(n), 10, 0, '', 0, 0];
    if (!keep) delete rec.L['7'];
    db.pupils[kk] = rec;
    const up = (db.userProps || {})[email];
    if (up && up.draft) Object.keys(up.draft).forEach(k => { if (/:7:/.test(k)) delete up.draft[k]; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, [EMAIL, CLASS, !!keepDraft]);
}
async function openLesson(page, keepRecap) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2200);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); }); await sleep(600);
  const tile = await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.tile')).find(e => /Teach It To See/i.test(e.textContent)); if (t) t.click(); return !!t; });
  await sleep(2500);
  const first = await chunkNow(page);
  if (keepRecap && first === '_recap') { await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#chunk-host button')).find(x => /Warm up/.test(x.textContent)); if (b) b.click(); }); await sleep(900); }
  if (first !== 'see') { await page.evaluate(() => { const s = App.state; s.chunkIdx = s.chunks.findIndex(c => c.id === 'see'); App.remountChunk(); }); await sleep(1500); }
  const h = await page.waitForSelector('#chunk-host iframe.see-frame', { timeout: 15000 }), fr = await h.contentFrame();
  await fr.waitForFunction(() => window.App && App.info && document.getElementById('job').textContent.length > 5, null, { timeout: 15000 });
  return { tile, first, fr };
}
const chunkNow = page => page.evaluate(() => { const s = App.state; return s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; });
const info = fr => fr.evaluate(() => App.info()), st = fr => fr.evaluate(() => JSON.parse(JSON.stringify(App.st())));
const clk = (fr, sel) => fr.evaluate(sel => { const e = Array.from(document.querySelectorAll(sel)).find(e => !e.disabled && e.offsetParent !== null); if (!e) return false; e.click(); return true; }, sel);
async function draw(page, fr, strokes) {
  const box = await (await fr.$('#pad')).boundingBox(), k = (box.width - 8) / 420, X = v => box.x + 4 + (v - 4) * k, Y = v => box.y + 4 + (v - 4) * k;
  for (const s of strokes) { await page.mouse.move(X(s[0][0]), Y(s[0][1])); await page.mouse.down(); for (const q of s.slice(1)) await page.mouse.move(X(q[0]), Y(q[1])); await page.mouse.up(); }
}

const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'j3', 'lessons', 'j3-07.json'), 'utf8'));
const chunk = lesson.chunks.find(c => c.id === 'see'), chunkHash = crypto.createHash('md5').update(JSON.stringify(chunk)).digest('hex').slice(0, 12);
const contentVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'index.json'), 'utf8')).contentVersion;
/* name -> the screen it must be, judged from the page's own state */
const WANT = {
  'see-teach': (i, s) => i.scr === 't-teach' && i.draw === 'sun' && s.cls[0].ex.length === 3 && i.inked,
  'see-fool': (i) => i.scr === 'f-1' && !!i.shown,
  'see-sure': (i) => i.scr === 's-line',
  'see-more': (i) => i.scr === 'x-menu'
};
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1.5 }), page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2000); await seed(page);
  await page.goto(BASE + '/ks3-dt/platform/assets/see/see/people.js'); await page.evaluate(() => Object.keys(localStorage).filter(k => /^see-j3l7-/.test(k)).forEach(k => localStorage.removeItem(k)));
  const o = await openLesson(page, true), fr = o.fr, shots = {}; let seedN = 40;
  const state = async () => { const i = await info(fr), s = await st(fr); i.inked = await fr.evaluate(() => JSON.parse(App.snap().split('|').pop()).length > 0); return [i, s]; };
  for (let k = 0; k < 900 && Object.keys(shots).length < 4; k++) {
    let [i, s] = await state();
    if (i.play) { await sleep(120); continue; }
    if (i.scr === 'f-who') { await clk(fr, '[data-act=n]'); await sleep(200); continue; }
    if (i.pad && i.draw && !i.shown && !i.inked) { const P = People(seedN++); let d = i.draw; if (d === 'own') d = 'cat'; const q = d === 'half' ? P.sun().concat(P.fish()) : P[d](); await draw(page, fr, i.zone ? P.into(q, i.zone) : q); await sleep(250); [i, s] = await state(); }
    for (const name of Object.keys(WANT)) {
      if (shots[name] || !WANT[name](i, s)) continue;
      await page.mouse.move(700, 40); await sleep(500);
      const file = path.join(OUT, 'shot-' + name + '.png'); await page.screenshot({ path: file });
      const [j, t] = await state(); if (!WANT[name](j, t)) throw new Error(name + ': the screen changed under the shutter');
      const card = (await fr.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
      shots[name] = { name, kind: 'app', chunkId: 'see', selector: '#chunk-host iframe.see-frame', screen: j.scr, textSnippet: (await fr.evaluate(() => document.getElementById('job').innerText)).replace(/\s+/g, ' ').trim(), cardText: card, chunkHash, contentVersion };
      console.log('  took ' + name + ' on ' + j.scr + ' · ' + shots[name].textSnippet);
    }
    if (!(await clk(fr, '#draw [data-want], #stage [data-want], #side [data-want]'))) await clk(fr, '[data-act=menu]');
    await sleep(200);
  }
  await b.close();
  const missing = Object.keys(WANT).filter(n => !shots[n]);
  if (missing.length) { console.log('deck shots: FAILED, never reached ' + missing.join(', ')); process.exit(1); }
  fs.writeFileSync(path.join(OUT, 'shots-manifest.json'), JSON.stringify({ lesson: 'j3-07', shots }, null, 1));
  console.log('deck shots: 4 taken, manifest written (' + contentVersion + ', chunk ' + chunkHash + ')'); process.exit(0);
})().catch(e => { console.log('deck shots: FAILED ' + e.message); process.exit(1); });
