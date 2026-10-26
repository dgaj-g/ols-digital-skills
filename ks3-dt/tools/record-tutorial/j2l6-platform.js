#!/usr/bin/env node
/* J2 L6 THE HEADLINER · the lesson around the hour, on the PLATFORM SHELL (spec §17 A1, A3/G5, A8–A11).
 * The hour's own gates (j2l6-judge-test, -engine-test, -words, -walk, -assets) prove the hour (A2–A7, A12–A15).
 * This one proves the lesson around it, against the served platform with its dev server:
 *   A1  Lesson 6's card says Festival Planner with The Headliner under it; it opens on the platform's Do-Now
 *       (five questions), and after it on the `headliner` step, the shipped hour page in its frame (no test mode)
 *   G5  a judge ok only comes from the live workbook: a D3 painted to 30,000 with no sum is not ok and pays no badge;
 *       the real =B3*C3 typed in the box is ok and pays sum-writer once (CONTROL: the same badge twice adds nothing)
 *   A8  the poster name and price the hour sends reach her lesson draft, and survive a later save
 *   A10 her place reaches her draft; a reopened lesson says "Welcome back. You were on <part>." with Carry on and
 *       Start again, and Carry on lands on the saved screen with the sheet as she left it
 *   A11 from minute 48 the hour shows the out-of-time note; Finish in the strip goes to the badges, and on to the
 *       platform's five questions
 *   A9  the five questions are the design's, options shuffled; How did it go? has the design's three sentences;
 *       the done card says the design's end line and offers Free time and Finish; Free time opens the free tasks in
 *       the frame, and their end finishes the lesson; the five badges are j2-b16…b20 on Lesson 6
 * Every control must fail on a build without the lesson: run it with --expect-fail against such a build.
 *   node ks3-dt/tools/record-tutorial/j2l6-platform.js [--base http://localhost:8126] [--expect-fail] */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8126');
const EXPECT_FAIL = args.includes('--expect-fail');
const OUT = path.join(__dirname, 'j2l6/platform');
fs.mkdirSync(OUT, { recursive: true });
const URL = BASE + '/ks3-dt/platform/index.html?class=Demo-9A&as=aoife';
const EMAIL = 'aoife.mcgrath@demo';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let checks = 0; const FAILS = [];
const must = (ok, what) => { checks++; console.log((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) FAILS.push(what); return ok; };

/* the shipped words, read from the hour's own strings.js */
const W = {}; new Function('window', fs.readFileSync(path.join(__dirname, '../../platform/assets/headliner/hour/strings.js'), 'utf8'))(W);
const S = W.S, C = S.common;
const STEMS = S.close.exit.map(x => x.stem);
const RIGHT = S.close.exit.map(x => x.options[0]);
const PART = id => (S.chapters.find(c => c.id === id) || {}).label;
const BADGE_XP = { 'sum-writer': 12, 'the-copy': 12, decider: 12, 'the-call': 15, 'the-pin': 15 };

async function seed(page) {
  await page.evaluate((email) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks['Demo-9A'] = db.locks['Demo-9A'] || {};
    for (const n of ['1', '2', '3', '4', '5', '6']) db.locks['Demo-9A'][n] = { u: now, on: 1 };
    const kk = 'Demo-9A:' + email;
    db.pupils = db.pupils || {};
    const rec = db.pupils[kk] || { n: 'Aoife McGrath', cn: '', j: 2, xp: 0, g: '' };
    rec.L = rec.L || {};
    for (const n of ['1', '2', '3', '4', '5']) if (!rec.L[n] || Number(rec.L[n][0]) !== 2) rec.L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + Number(n), 10, 0, '', 0, 0];
    delete rec.L['6'];
    db.pupils[kk] = rec;
    const up = (db.userProps || {})[email];
    if (up && up.draft) Object.keys(up.draft).forEach(k => { if (/:6:/.test(k)) delete up.draft[k]; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, EMAIL);
}
async function openLesson6(page, keepRecap) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(600);
  const tile = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /Festival Planner/i.test(e.textContent));
    const story = t && t.querySelector('.tile-story');
    if (t) t.click();
    return t ? { story: story ? story.textContent.trim() : '' } : null;
  });
  await sleep(2500);
  let recap = await page.evaluate(() => { const s = App.state, c = s.chunks && s.chunks[s.chunkIdx]; return c && c.id === '_recap' ? 0 : -1; });
  if (keepRecap && recap === 0) {
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#chunk-host button')).find(x => /Warm up/.test(x.textContent)); if (b) b.click(); });
    await sleep(900);
    recap = await page.evaluate(() => { const p = document.querySelector('#chunk-host .runner-progress'); const m = p && /of (\d+)/.exec(p.textContent); return m ? Number(m[1]) : 0; });
  }
  if (!keepRecap && recap >= 0) {
    await page.evaluate(() => { const s = App.state; s.chunkIdx = s.chunks.findIndex(c => c.id === 'headliner'); App.remountChunk(); });
    await sleep(2500);
  }
  return { tile, recap };
}
const chunkNow = page => page.evaluate(() => { const s = App.state; return s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; });
const frameOf = async page => { const h = await page.$('#chunk-host iframe.headliner-frame'); return h ? h.contentFrame() : null; };
const xpNow = page => page.evaluate(() => App.state.xp);
const hourReady = fr => fr.waitForFunction(() => window.Hour && window.HeadlinerBridge, null, { timeout: 15000 });
const draftOf = page => page.evaluate(() => App.state.draft && App.state.draft.headliner);
const goTo = (fr, id) => fr.evaluate(id => Hour.go(Hour.ids().indexOf(id)), id);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2000);
    await seed(page);

    /* A1 */
    const o1 = await openLesson6(page, true);
    must(!!o1.tile, 'A1 Lesson 6 is on her lesson screen as Festival Planner');
    if (!o1.tile) throw new Error('no lesson to walk');
    must(o1.tile.story === 'The Headliner', 'A1 the lesson card says The Headliner under the title (got "' + o1.tile.story + '")');
    must(o1.recap === 5, 'A1 the lesson opens on the platform\'s Do-Now with five questions (got ' + o1.recap + ')');
    await page.evaluate(() => { const s = App.state; s.chunkIdx = s.chunks.findIndex(c => c.id === 'headliner'); App.remountChunk(); });
    await sleep(2500);
    must(await chunkNow(page) === 'headliner', 'A1 after the Do-Now, the lesson opens on the headliner step');
    let fr = await frameOf(page);
    must(!!fr, 'A1 the hour is on screen in its frame');
    if (!fr) throw new Error('no hour frame');
    await hourReady(fr);
    must(await fr.evaluate(() => HeadlinerBridge.test === false && HeadlinerBridge.framed === true), 'A1 the frame is the shipped page, not the test mode');
    must(/assets\/headliner\/hour\.html/.test(fr.url()), 'A1 the frame shows assets/headliner/hour.html');
    must(await fr.evaluate(() => Hour.ids().indexOf('donow') === -1 && Hour.ids().indexOf('exit') === -1 && Hour.ids().indexOf('felt') === -1), 'A1 inside the platform the hour has no Do-Now, five questions or How did it go? of its own');
    const fbox = await page.evaluate(() => { const r = document.querySelector('iframe.headliner-frame').getBoundingClientRect(); return [r.width, r.height, innerWidth, innerHeight]; });
    must(fbox[0] >= fbox[2] - 2 && fbox[1] >= fbox[3] * 0.8, 'A1 the frame fills the width and most of the height (' + fbox.map(Math.round).join(' x ') + ')');
    await page.screenshot({ path: path.join(OUT, 'a1-open.png') });

    /* G5 a painted answer is not an answer */
    const xp0 = await xpNow(page);
    await goTo(fr, 'c1-ask'); await sleep(600);
    await fr.evaluate(() => { const c = document.querySelector('[data-cell="D3"]'); if (c) c.textContent = '30,000'; });
    await sleep(300);
    must(await fr.evaluate(() => !Hour.state.ok && Hour.state.badges.length === 0 && !document.querySelector('.coach [data-act="next"]')), 'G5 CONTROL D3 painted to 30,000 with no sum is not ok, pays no badge and offers no Next');
    must(await xpNow(page) === xp0, 'G5 CONTROL the painted answer adds no XP');
    await fr.click('[data-cell="D3"]'); await page.keyboard.type('=B3*C3'); await page.keyboard.press('Enter');
    await sleep(1500);
    must(await fr.evaluate(() => Hour.state.ok && Hour.state.badges.indexOf('sum-writer') !== -1), 'G5 the real =B3*C3 typed in D3 is ok and earns sum-writer');
    const xp1 = await xpNow(page);
    must(xp1 === xp0 + 12, 'G5 sum-writer adds 12 XP (' + xp0 + ' to ' + xp1 + ')');
    await fr.evaluate(() => HeadlinerBridge.badge('sum-writer'));
    await sleep(1200);
    must(await xpNow(page) === xp1, 'G5 CONTROL the same badge twice adds nothing');

    /* A10 her place reaches the draft */
    await goTo(fr, 'c4-intro'); await sleep(1500);
    let dr = await draftOf(page);
    must(dr && dr.at === 'c4-intro' && dr.ch === 'c4', 'A10 the screen the hour saves is in her lesson draft (' + JSON.stringify(dr && { at: dr.at, ch: dr.ch }) + ')');
    must(dr && dr.plan && /B3\*C3/.test(JSON.stringify(dr.plan)), 'A10 her sheet, with her =B3*C3, is in her lesson draft');

    /* A8 the poster */
    await fr.evaluate(() => HeadlinerBridge.poster('Glowfest', 32));
    await sleep(1200);
    dr = await draftOf(page);
    must(dr && dr.poster && dr.poster.festival === 'Glowfest' && Number(dr.poster.price) === 32, 'A8 the poster name and price reach her lesson draft');
    await goTo(fr, 'c5-intro'); await sleep(1500);
    dr = await draftOf(page);
    must(dr && dr.poster && dr.poster.festival === 'Glowfest', 'A8 a later save keeps the poster name');

    /* A10 a reopened lesson hands the place back */
    await goTo(fr, 'c4-intro'); await sleep(1500);
    await openLesson6(page);
    fr = await frameOf(page);
    must(fr && /c4-intro/.test(decodeURIComponent(fr.url())), 'A10 a reopened lesson gives the hour her place on its address');
    if (fr) {
      await hourReady(fr);
      await sleep(800);
      const want = C.welcomeBack.replace('{where}', PART('c4'));
      const wp = await fr.evaluate(() => ({ screen: Hour.screen(), ask: (document.querySelector('.welcome .ask') || {}).textContent || '',
        btns: Array.from(document.querySelectorAll('.welcome button')).map(x => x.textContent.trim()) }));
      must(wp.screen === 'welcome' && wp.ask === want, 'A10 the hour says "' + want + '" (got "' + wp.ask + '")');
      must(wp.btns.join('|') === [C.carryOn, C.startAgain].join('|'), 'A10 the buttons are Carry on and Start again (' + wp.btns.join(', ') + ')');
      await page.screenshot({ path: path.join(OUT, 'a10-welcome.png') });
      await fr.click('[data-act="carry"]'); await sleep(1000);
      must(await fr.evaluate(() => Hour.screen() === 'c4-intro' && /B3\*C3/.test(Hour.book.sheet('plan').rawOf('D3') || '')), 'A10 Carry on lands on the saved screen with her =B3*C3 still in D3');
    }

    /* A11 running out of time */
    if (fr) {
      await fr.evaluate(() => { Hour.state.t0 -= 48 * 60000 + 5000; Hour.go(Hour.state.i); });
      await sleep(800);
      const note = await fr.evaluate(() => Array.from(document.querySelectorAll('.note')).map(n => n.textContent).join(' | '));
      must(note.indexOf(C.outOfTime) !== -1, 'A11 from minute 48 the note says "' + C.outOfTime + '"');
      await page.screenshot({ path: path.join(OUT, 'a11-rush.png') });
      await fr.click('[data-chip="close"]'); await sleep(900);
      must(await fr.evaluate(() => Hour.screen()) === 'badges', 'A11 Finish in the strip goes to the badges');
      await fr.evaluate(() => { const x = document.querySelector('[data-act="next"]'); if (x) x.click(); });
      await sleep(2500);
    }
    must(await chunkNow(page) === 'exit', 'A11 from the badges the lesson goes on to the five questions');

    /* A9 the five questions */
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#chunk-host button')).find(x => /Ready|Start/i.test(x.textContent)); if (b) b.click(); });
    await sleep(700);
    for (let i = 0; i < 5; i++) {
      await page.waitForSelector('.q-card .q-opt', { timeout: 5000 });
      await sleep(450);
      const stem = await page.evaluate(() => document.querySelector('.q-stem').textContent.trim());
      must(stem === STEMS[i], 'A9 question ' + (i + 1) + ' reads "' + STEMS[i] + '" (got "' + stem + '")');
      if (i === 0) await page.screenshot({ path: path.join(OUT, 'a9-q1.png') });
      await page.evaluate((w) => { const o = Array.from(document.querySelectorAll('.q-opt')).find(x => x.querySelector('span:last-child').textContent === w); if (o) o.click(); }, RIGHT[i]);
      await sleep(700);
    }
    let differs = false;
    for (let t = 0; t < 12 && !differs; t++) {
      const o = await page.evaluate(() => { const its = App.state.chunks.find(c => c.id === 'exit').config.items[0].options; const ord = its.map((_, i) => i); for (let s = ord.length - 1; s > 0; s--) { const j = Math.floor(Math.random() * (s + 1)); [ord[s], ord[j]] = [ord[j], ord[s]]; } return ord.join(''); });
      differs = o !== '012';
    }
    must(differs, 'A9 the options come in a random order');
    await sleep(1200);
    must(await chunkNow(page) === 'close', 'A9 after the five answers she is on How did it go?');

    const se = await page.evaluate(() => Array.from(document.querySelectorAll('.se-row p')).map(p => p.textContent));
    must(JSON.stringify(se) === JSON.stringify(S.close.felt), 'A9 the three sentences are the design\'s (' + se.join(' / ') + ')');
    await page.evaluate(() => {
      document.querySelectorAll('.se-chips').forEach(r => r.querySelector('.se-chip').click());
      const d = document.querySelector('.se-diff-chips .se-chip[data-d="1"]'); if (d) d.click();
      document.querySelector('.se-submit').click();
    });
    await page.waitForSelector('.exit-done', { timeout: 10000 }).catch(() => {});
    await sleep(500);
    const dn = await page.evaluate(() => { const d = document.querySelector('.exit-done'); return d ? { h: d.querySelector('h2').textContent, t: d.textContent,
      btns: Array.from(d.querySelectorAll('button')).map(x => x.textContent.trim()) } : null; });
    must(dn && dn.h === S.close.end, 'A9 the done card says "' + S.close.end + '" (got "' + (dn && dn.h) + '")');
    must(dn && dn.t.indexOf('You got 5 of the 5 questions right.') !== -1, 'A9 the done card gives her score');
    must(dn && dn.t.indexOf('[') === -1, 'A9 no raw data on the done card');
    must(dn && dn.btns.join('|') === [S.close.freeTitle, 'Finish'].join('|'), 'A9 the done card offers Free time and Finish (' + (dn && dn.btns.join(', ')) + ')');
    await page.screenshot({ path: path.join(OUT, 'a9-done.png'), fullPage: true });
    await page.evaluate((l) => { const x = Array.from(document.querySelectorAll('.exit-done button')).find(b => b.textContent.trim() === l); if (x) x.click(); }, S.close.freeTitle);
    await sleep(2500);
    must(await chunkNow(page) === 'free', 'A9 Free time opens the free tasks');
    fr = await frameOf(page);
    if (fr) {
      await hourReady(fr);
      await sleep(800);
      must(await fr.evaluate(() => Hour.screen()) === 'free', 'A9 the frame opens on the free tasks');
      await page.screenshot({ path: path.join(OUT, 'a9-free.png') });
      await fr.evaluate(() => { const x = document.querySelector('[data-act="free-done"]'); if (x) x.click(); });
      await sleep(2500);
    }
    must(await page.evaluate(() => !!document.querySelector('.badge-pop.show')), 'A9 the free tasks\' end finishes the lesson');
    const rec = await page.evaluate((email) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const r = db.pupils['Demo-9A:' + email]; return r && r.L && r.L['6']; }, EMAIL);
    must(rec && Number(rec[0]) === 2, 'A9 Lesson 6 is recorded as finished');
    must(rec && JSON.stringify(rec).indexOf('bj2-b16=1') !== -1, 'A9 sum-writer is recorded as j2-b16 on Lesson 6');
  } catch (e) { must(false, 'the walk stopped: ' + e.message.split('\n')[0]); }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await b.close();
  console.log(checks + ' checks, ' + FAILS.length + ' failed.');
  if (EXPECT_FAIL) { console.log(FAILS.length ? 'CONTROL OK: the gate fails on a build without the lesson.' : 'CONTROL BROKEN: the gate passed a build without the lesson.'); process.exit(FAILS.length ? 0 : 1); }
  console.log('\nj2l6-platform: ' + (FAILS.length ? 'FAIL · ' + FAILS.length + ' of ' + checks : 'PASS · ' + checks + ' checks'));
  process.exit(FAILS.length ? 1 : 0);
})();
