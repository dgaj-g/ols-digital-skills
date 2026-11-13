#!/usr/bin/env node
/* J3 L7 TEACH IT TO SEE · gate: the lesson ON THE PLATFORM (served, with its dev server).
 *   - Lesson 7's card opens on the platform's Do-Now, then the whole hour in one frame
 *   - the frame is the size every page gate assumes: its top is lib BAR at all four screen sizes
 *   - what she makes is saved to her lesson draft (under 8000 characters; the size is printed)
 *   - a reopened lesson says welcome back and restores her computer's examples, her card and her finished extra
 *   - Finish files the end questions once, records the lesson as done, and leaves the page open
 *   - every LANDMARKS['j3-7'] (sit-wrongpath.js) is stood on; the shape equals EXPECT['j3-7'] (sit-review.js)
 * CONTROL: with her draft deleted, the reopened lesson must NOT welcome her back and must be at the start.
 *   node ks3-dt/tools/record-tutorial/j3l7see-save.js [--base http://localhost:8137] */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2), argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8137'), CLASS = 'Demo-10A', EMAIL = 'orla.mccann@demo';
const URL = BASE + '/ks3-dt/platform/index.html?class=' + CLASS + '&as=orla';
const People = require(path.join(__dirname, '../../platform/assets/see/see/people.js')).SeePeople;
const LIBBAR = +(/const BAR = \+argOf\('--bar', (\d+)\)/.exec(fs.readFileSync(path.join(__dirname, 'j3l7see-lib.js'), 'utf8')) || [])[1];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let checks = 0; const FAILS = [];
const must = (ok, what) => { checks++; console.log((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) FAILS.push(what); return ok; };
const control = (failed, what) => { checks++; console.log((failed ? '  PASS CONTROL (it failed, as it must): ' : '  FAIL CONTROL DID NOT FAIL: ') + what); if (!failed) FAILS.push('control: ' + what); };

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
  if (keepRecap && first === '_recap') { await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#chunk-host button')).find(x => /Warm up/.test(x.textContent)); if (b) b.click(); }); await sleep(900); await look(page); }
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
/* the robot pupil, at the lesson's real speed, until stop(info, state) says so */
let seedN = 900;
async function drive(page, fr, stop) {
  for (let k = 0; k < 900; k++) {
    const i = await info(fr); if (await stop(i)) return true;
    if (i.play) { await sleep(120); continue; }
    await look(page);
    if (i.scr === 'f-who') { await clk(fr, '[data-act=n]'); await sleep(150); continue; }
    if (i.pad && i.draw && !i.shown) { const P = People(seedN++); let d = i.draw; if (d === 'own') d = 'cat'; const s = d === 'half' ? P.sun().concat(P.fish()) : P[d](); await draw(page, fr, i.zone ? P.into(s, i.zone) : s); await sleep(120); }
    if (!(await clk(fr, '#draw [data-want], #stage [data-want], #side [data-want]'))) { if (!(await clk(fr, '[data-act=menu]'))) return false; }
    await sleep(150);
  }
  return false;
}
function table(file, re, key) {
  const src = fs.readFileSync(path.join(__dirname, file), 'utf8'), at = src.search(re); if (at < 0) return null;
  const k = src.indexOf("'" + key + "':", at); if (k < 0) return null;
  let i = src.indexOf(':', k) + 1; while (/\s/.test(src[i])) i++;
  const open = src[i], close = open === '[' ? ']' : '}'; let d = 0, j = i;
  for (; j < src.length; j++) { if (src[j] === open) d++; else if (src[j] === close && --d === 0) break; }
  return (new Function('return ' + src.slice(i, j + 1)))();
}
const LANDMARKS = (table('sit-wrongpath.js', /const\s+LANDMARKS\s*=/, 'j3-7') || []).slice(), EXPECT = table('sit-review.js', /const\s+EXPECT\s*=/, 'j3-7');
const stood = {}, walked = [];
const VISIBLE = sel => { for (const e of document.querySelectorAll(sel)) { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0) return true; } return false; };
async function look(page) {
  const ck = await chunkNow(page); if (!ck) return; if (walked.indexOf(ck) === -1) walked.push(ck);
  const h = await page.$('#chunk-host iframe.see-frame'), fr = h ? await h.contentFrame() : null;
  for (const [label, sel, at] of LANDMARKS) {
    if (at !== ck || stood[label]) continue;
    let ok = await page.evaluate(VISIBLE, sel).catch(() => false); if (!ok && fr) ok = await fr.evaluate(VISIBLE, sel).catch(() => false);
    if (ok) stood[label] = true;
  }
}
const away = async page => { await page.goto(BASE + '/ks3-dt/platform/assets/see/see/people.js', { waitUntil: 'domcontentloaded' }); await sleep(800); };
const wipeLocal = page => page.evaluate(() => { const k = Object.keys(localStorage).filter(k => /^see-j3l7-/.test(k)); k.forEach(x => localStorage.removeItem(x)); return k.length; });
const recOf = page => page.evaluate(([email, cls]) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')), r = db.pupils[cls + ':' + email]; return r && r.L && r.L['7']; }, [EMAIL, CLASS]);

(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1366, height: 768 } }), page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2000); await seed(page);
    let o = await openLesson(page, true), fr = o.fr;
    must(o.tile, 'Lesson 7 is on her lesson screen as Teach It To See');
    must(o.first === '_recap', 'it opens on the platform\'s Do-Now');
    must(await chunkNow(page) === 'see', 'after the Do-Now the whole hour is one step, in its frame');
    must(!(await page.evaluate(VISIBLE, '#chunk-host .rescue-loading')), 'no loading line is left on screen once the page is in');
    const xpStart = await page.evaluate(() => App.state.xp);
    for (const [W, H] of [[1280, 800], [1366, 768], [1440, 900], [1024, 768]]) {
      await page.setViewportSize({ width: W, height: H }); await sleep(400);
      const r = await (await page.$('#chunk-host iframe.see-frame')).boundingBox(), inner = await fr.evaluate(() => [innerWidth, innerHeight, document.documentElement.scrollHeight, document.documentElement.scrollWidth]);
      must(Math.round(r.y) === LIBBAR && Math.round(r.height) === H - LIBBAR && inner[0] === W, W + 'x' + H + ': the frame starts ' + Math.round(r.y) + ' px down and is ' + inner[0] + 'x' + inner[1] + ' (the page gates assume ' + LIBBAR + ' px)');
      must(inner[2] <= inner[1] && inner[3] <= inner[0], W + 'x' + H + ': the first screen fits its frame with no scroll');
    }
    await page.setViewportSize({ width: 1366, height: 768 }); await sleep(400);
    await look(page);
    await fr.evaluate(() => App.help(true)); await sleep(200); await look(page); await fr.evaluate(() => App.help(false));
    must(await drive(page, fr, i => i.scr === 'x-menu'), 'the robot pupil reaches the extras through the main lesson, at the lesson\'s real speed');
    await look(page); await clk(fr, '[data-arg=third]'); await sleep(200);
    must(await drive(page, fr, async i => i.scr === 'x-menu' && (await st(fr)).x.third && !!(await st(fr)).x.third.done), 'she finishes one extra (A third thing) and is back at the activities');
    const before = await st(fr); await fr.evaluate(() => App.flush()); await sleep(2500);
    const draft = await page.evaluate(() => JSON.stringify(App.state.draft || {}));
    console.log('  SAVE SIZE her whole lesson draft is ' + draft.length + ' characters (limit 8000); the page\'s own count ' + (await fr.evaluate(() => App.packSize())));
    must(/"see"/.test(draft) && draft.length < 8000, 'what she made is in her lesson draft, under 8000 characters');
    must(before.kept && !!before.name && before.cls[0].ex.length >= 5 && before.cls[1].ex.length >= 5, 'before she leaves: a kept card called ' + before.name + ', ' + before.cls[0].ex.length + ' suns and ' + before.cls[1].ex.length + ' fish');

    /* as if on another computer: the page's own copy is wiped, so only the platform's draft can bring her back */
    await away(page); must(await wipeLocal(page) > 0, 'the page\'s own copy on this computer is wiped first (another computer)');
    o = await openLesson(page, false); fr = o.fr;
    must(await fr.evaluate(() => App.veil()) === 'welcome', 'reopened, the lesson says welcome back from the platform\'s save alone'); await look(page);
    await clk(fr, '#veilBtn'); await sleep(300);
    const after = await st(fr);
    must(after.scr === 'x-menu', 'she is back at the activities, where she was');
    must(after.cls[0].ex.length === before.cls[0].ex.length && after.cls[1].ex.length === before.cls[1].ex.length, 'her computer has the same ' + after.cls[0].ex.length + ' suns and ' + after.cls[1].ex.length + ' fish');
    must(after.kept && after.name === before.name && after.gap === before.gap && after.line === before.line, 'her card is hers: same name, same weak spot, same line');
    must(after.x.third && !!after.x.third.done && await fr.evaluate(() => /Done|done/.test((document.querySelector('[data-arg=third] .tag') || {}).textContent || '')), 'A third thing is still marked done');

    await look(page); await clk(fr, '#endBtn'); await sleep(200);
    must((await info(fr)).scr === 'e-q', 'Go to the end questions opens the five questions');
    for (let k = 0; k < 60 && (await info(fr)).scr !== 'e-done'; k++) { await clk(fr, '#stage [data-want]'); await sleep(150); }
    must((await info(fr)).scr === 'e-done', 'five questions, how did it go, Finish: the finished screen'); await look(page);
    /* the platform files the end questions after a random wait of up to five seconds */
    let rec = null; for (let k = 0; k < 40; k++) { rec = await recOf(page); if (rec && Number(rec[0]) === 2) break; await sleep(300); }
    must(rec && Number(rec[0]) === 2, 'Lesson 7 is recorded as finished');
    must(!!(await page.$('#chunk-host iframe.see-frame')) && await chunkNow(page) === 'see', 'the page stays open after Finish');
    await clk(fr, '[data-act=back]'); await sleep(200); must((await info(fr)).scr === 'x-menu', 'Back to where I was returns her to the activities');
    const rec1 = JSON.stringify(rec); await clk(fr, '#endBtn'); await sleep(200);
    for (let k = 0; k < 60 && (await info(fr)).scr !== 'e-done'; k++) { await clk(fr, '#stage [data-want]'); await sleep(150); } await sleep(6500);
    must(JSON.stringify(await recOf(page)) === rec1, 'going to the end a second time files nothing new');

    must(LANDMARKS.length > 0 && !!EXPECT, 'LANDMARKS[\'j3-7\'] and EXPECT[\'j3-7\'] are declared');
    for (const [label] of LANDMARKS) must(!!stood[label], 'stood on: ' + label);
    const shape = { xp: (await page.evaluate(() => App.state.xp)) - xpStart, chunks: walked.length, marks: rec ? Number(rec[1]) || 0 : 0, badges: rec ? (JSON.stringify(rec).match(/bj3-b\d+=1/g) || []).length : 0 };
    console.log('  SHAPE ' + JSON.stringify(shape) + '  walked ' + walked.join(' ') + '  record ' + JSON.stringify(rec).slice(0, 160));
    if (EXPECT) for (const k of ['xp', 'chunks', 'marks', 'badges']) must(EXPECT[k] != null && shape[k] === EXPECT[k], 'shape ' + k + ' = ' + EXPECT[k] + ' (walked ' + shape[k] + ')');

    /* leave the platform first, so its last save cannot write her draft back after it is deleted */
    await fr.evaluate(() => App.flush()); await sleep(1500);
    await away(page); await seed(page); await wipeLocal(page); o = await openLesson(page, false);
    const c = [await o.fr.evaluate(() => App.veil()), (await info(o.fr)).scr];
    control(c[0] !== 'welcome' && c[1] === 'about', 'her draft deleted: no welcome back, and she is at the first screen (' + c[1] + ')');
  } catch (e) { must(false, 'the walk stopped: ' + e.message.split('\n')[0]); }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await b.close();
  console.log(FAILS.length ? 'j3l7see-save: FAILED (' + FAILS.length + ' of ' + checks + ')\n  ' + FAILS.join('\n  ') : 'j3l7see-save: ALL ' + checks + ' CHECKS PASS');
  process.exit(FAILS.length ? 1 : 0);
})();
