#!/usr/bin/env node
/* J3 L6 THE NIGHT DESK · the lesson around the hour, on the PLATFORM SHELL (J3_L6_SPEC.md §19 A1, A9–A13, G5).
 * The hour's own gates (j3l6-judge-test, -engine-test, -data, -words, -walk, -assets) prove the hour (A2–A8, A14, A15).
 * This one proves the lesson around it, against the served platform with its dev server:
 *   A1  Lesson 6's card says Data Newsroom with The Night Desk under it; it opens on the platform's Do-Now
 *       (five questions), and after it on the `nightdesk` step, the shipped hour page in its frame (no test mode)
 *   G5  an ok only comes from the judge over the live table: "Showing 17 of 60 people" painted with no rule is not ok
 *       and pays nothing; the real sleep_hours >= 8 typed in the box is ok; the stamp pays asker once (CONTROL: the
 *       same badge twice adds nothing)
 *   A9  her front page name reaches her lesson draft, and survives a later save
 *   A11 her place reaches her draft; a reopened lesson says "Welcome back. You were on <part>." with Carry on and
 *       Start again; Carry on lands on the saved screen with her rule still in the box; the rush clock comes back
 *       with its remaining seconds
 *   A12 from minute 48 the hour shows the out-of-time note; Finish in the strip goes to the badges, and on to the
 *       platform's five questions
 *   A13 Pause stops the rush clock; a tab change pauses
 *   A10 the five questions are the design's, options shuffled; How did it go? has the design's three sentences;
 *       the done card says the design's end line and offers Free time and Finish; Free time opens the free headlines
 *       in the frame, and their end finishes the lesson; the six badges are j3-b16…b21 on Lesson 6
 * Every control must fail on a build without the lesson: run it with --expect-fail against such a build.
 *   node ks3-dt/tools/record-tutorial/j3l6-platform.js [--base http://localhost:8136] [--expect-fail] */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8136');
const EXPECT_FAIL = args.includes('--expect-fail');
const OUT = path.join(__dirname, 'j3l6/platform');
fs.mkdirSync(OUT, { recursive: true });
const CLASS = 'Demo-10A', EMAIL = 'orla.mccann@demo';
const URL = BASE + '/ks3-dt/platform/index.html?class=' + CLASS + '&as=orla';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let checks = 0; const FAILS = [];
const must = (ok, what) => { checks++; console.log((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) FAILS.push(what); return ok; };

/* the shipped words, read from the hour's own strings.js */
const W = {}; new Function('window', fs.readFileSync(path.join(__dirname, '../../platform/assets/nightdesk/hour/strings.js'), 'utf8'))(W);
const S = W.S, C = S.common;
const STEMS = S.close.exit.map(x => x.stem);
const RIGHT = S.close.exit.map(x => x.options[0]);
const PART = id => S.rail[id];

async function seed(page) {
  await page.evaluate(([email, cls]) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks[cls] = db.locks[cls] || {};
    for (const n of ['1', '2', '3', '4', '5', '6']) db.locks[cls][n] = { u: now, on: 1 };
    const kk = cls + ':' + email;
    db.pupils = db.pupils || {};
    const rec = db.pupils[kk] || { n: 'Orla McCann', cn: '', j: 3, xp: 0, g: '' };
    rec.L = rec.L || {};
    for (const n of ['1', '2', '3', '4', '5']) if (!rec.L[n] || Number(rec.L[n][0]) !== 2) rec.L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + Number(n), 10, 0, '', 0, 0];
    delete rec.L['6'];
    db.pupils[kk] = rec;
    const up = (db.userProps || {})[email];
    if (up && up.draft) Object.keys(up.draft).forEach(k => { if (/:6:/.test(k)) delete up.draft[k]; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, [EMAIL, CLASS]);
}
async function openLesson6(page, keepRecap) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(600);
  const tile = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /Data Newsroom/i.test(e.textContent));
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
    await page.evaluate(() => { const s = App.state; s.chunkIdx = s.chunks.findIndex(c => c.id === 'nightdesk'); App.remountChunk(); });
    await sleep(2500);
  }
  return { tile, recap };
}
const chunkNow = page => page.evaluate(() => { const s = App.state; return s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; });
const frameOf = async page => { const h = await page.$('#chunk-host iframe.nightdesk-frame'); return h ? h.contentFrame() : null; };
const xpNow = page => page.evaluate(() => App.state.xp);
const hourReady = fr => fr.waitForFunction(() => window.Hour && window.NightdeskBridge, null, { timeout: 15000 });
const draftOf = page => page.evaluate(() => App.state.draft && App.state.draft.nightdesk);
const goTo = (fr, id) => fr.evaluate(id => Hour.go(Hour.ids().indexOf(id)), id);
async function typeRule(page, fr, rule) { await fr.click('#qbox', { clickCount: 3 }); await page.keyboard.press('Backspace'); await page.keyboard.type(rule); await page.keyboard.press('Enter'); await sleep(900); }

/* the shared tables (coverage cells): LANDMARKS['j3-6'] in sit-wrongpath.js must each be stood on, and the
   measured shape must equal EXPECT['j3-6'] in sit-review.js — the j2l5-walk.js pattern. */
function table(file, re, key) {
  const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const at = src.search(re); if (at < 0) return null;
  const k = src.indexOf("'" + key + "':", at); if (k < 0) return null;
  let i = src.indexOf(':', k) + 1; while (/\s/.test(src[i])) i++;
  const open = src[i], close = open === '[' ? ']' : '}';
  let d = 0, j = i;
  for (; j < src.length; j++) { if (src[j] === open) d++; else if (src[j] === close && --d === 0) break; }
  return (new Function('return ' + src.slice(i, j + 1)))();
}
const LANDMARKS = (table('sit-wrongpath.js', /const\s+LANDMARKS\s*=/, 'j3-6') || []).slice();
const EXPECT = table('sit-review.js', /const\s+EXPECT\s*=/, 'j3-6');
const stood = {}, walked = [];
const VISIBLE = sel => { const els = document.querySelectorAll(sel); for (const e of els) { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0) return true; } return false; };
async function look(page) {
  const ck = await chunkNow(page); if (!ck) return;
  if (walked.indexOf(ck) === -1) walked.push(ck);
  const fr = await frameOf(page);
  for (const [label, sel, at] of LANDMARKS) {
    if (at !== ck || stood[label]) continue;
    let ok = await page.evaluate(VISIBLE, sel).catch(() => false);
    if (!ok && fr) ok = await fr.evaluate(VISIBLE, sel).catch(() => false);
    if (ok) stood[label] = true;
  }
}


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
    must(!!o1.tile, 'A1 Lesson 6 is on her lesson screen as Data Newsroom');
    if (!o1.tile) throw new Error('no lesson to walk');
    must(o1.tile.story === 'The Night Desk', 'A1 the lesson card says The Night Desk under the title (got "' + o1.tile.story + '")');
    must(o1.recap === 5, 'A1 the lesson opens on the platform\'s Do-Now with five questions (got ' + o1.recap + ')');
    await look(page);
    const xpStart = await xpNow(page);
    await page.evaluate(() => { const s = App.state; s.chunkIdx = s.chunks.findIndex(c => c.id === 'nightdesk'); App.remountChunk(); });
    await sleep(2500);
    must(await chunkNow(page) === 'nightdesk', 'A1 after the Do-Now, the lesson opens on the nightdesk step');
    let fr = await frameOf(page);
    must(!!fr, 'A1 the hour is on screen in its frame');
    if (!fr) throw new Error('no hour frame');
    await hourReady(fr);
    must(await fr.evaluate(() => NightdeskBridge.test === false && NightdeskBridge.framed === true), 'A1 the frame is the shipped page, not the test mode');
    must(/assets\/nightdesk\/hour\.html/.test(fr.url()), 'A1 the frame shows assets/nightdesk/hour.html');
    must(await fr.evaluate(() => Hour.ids().indexOf('donow') === -1 && Hour.ids().indexOf('exit') === -1 && Hour.ids().indexOf('felt') === -1), 'A1 inside the platform the hour has no Do-Now, five questions or How did it go? of its own');
    const fbox = await page.evaluate(() => { const r = document.querySelector('iframe.nightdesk-frame').getBoundingClientRect(); return [r.width, r.height, innerWidth, innerHeight]; });
    must(fbox[0] >= fbox[2] - 2 && fbox[1] >= fbox[3] * 0.8, 'A1 the frame fills the width and most of the height (' + fbox.map(Math.round).join(' x ') + ')');
    await page.screenshot({ path: path.join(OUT, 'a1-open.png') });

    /* G5 a painted count is not an answer */
    const xp0 = await xpNow(page);
    await goTo(fr, 'c1-ask'); await sleep(700);
    await fr.evaluate(() => { const c = document.querySelector('.count'); if (c) c.textContent = 'Showing 17 of 60 people'; });
    await sleep(300);
    await look(page);
    must(await fr.evaluate(() => !Hour.state.ok && Hour.state.badges.length === 0 && !document.querySelector('.coach [data-act="next"]')), 'G5 CONTROL a count painted to 17 with no rule is not ok, pays no badge and offers no Next');
    must(await xpNow(page) === xp0, 'G5 CONTROL the painted count adds no XP');
    await typeRule(page, fr, 'sleep_hours >= 8');
    must(await fr.evaluate(() => Hour.state.ok && Hour.state.badges.length === 0), 'G5 the real sleep_hours >= 8 typed in the box is ok; the badge waits for the stamp');
    must(await xpNow(page) === xp0, 'G5 a rule alone adds no badge XP');
    await goTo(fr, 'c1-stamp'); await sleep(700);
    await look(page);
    await fr.click('[data-stamp="SPIKE"]'); await fr.click('[data-reason="numbers"]'); await fr.click('[data-act="stamp"]');
    await sleep(1500);
    must(await fr.evaluate(() => Hour.state.ok && Hour.state.badges.indexOf('asker') !== -1), 'G5 SPIKE + The numbers say no is ok and earns asker');
    const xp1 = await xpNow(page);
    must(xp1 === xp0 + 12, 'G5 asker adds 12 XP (' + xp0 + ' to ' + xp1 + ')');
    await fr.evaluate(() => NightdeskBridge.badge('asker'));
    await sleep(1200);
    must(await xpNow(page) === xp1, 'G5 CONTROL the same badge twice adds nothing');

    /* A11 her place and her rule reach the draft */
    await goTo(fr, 'c2-ask'); await sleep(900);
    await typeRule(page, fr, 'age < 20');
    let dr = await draftOf(page);
    must(dr && dr.at === 'c2-ask' && dr.ch === 'c2', 'A11 the screen the hour saves is in her lesson draft (' + JSON.stringify(dr && { at: dr.at, ch: dr.ch }) + ')');
    must(dr && dr.q === 'age < 20' && dr.stamps && dr.stamps.c1, 'A11 her rule in the box and her first stamp are in her lesson draft');

    /* A9 the front page name */
    await goTo(fr, 'front'); await sleep(900);
    await look(page);
    await fr.fill('#fname', 'Orla'); await fr.click('[data-act="next"]');
    await sleep(1200);
    dr = await draftOf(page);
    must(dr && dr.frontpage && dr.frontpage.name === 'Orla' && dr.frontpage.printed.indexOf('c4') !== -1, 'A9 her name and her printed headline reach her lesson draft');
    await goTo(fr, 'c2-ask'); await sleep(900);
    await typeRule(page, fr, 'age < 20');
    dr = await draftOf(page);
    must(dr && dr.frontpage && dr.frontpage.name === 'Orla', 'A9 a later save keeps her front page');

    /* A11 a reopened lesson hands the place back */
    await openLesson6(page);
    fr = await frameOf(page);
    must(fr && /c2-ask/.test(decodeURIComponent(fr.url())), 'A11 a reopened lesson gives the hour her place on its address');
    if (fr) {
      await hourReady(fr);
      await sleep(800);
      const want = C.welcomeBack.replace('{where}', PART('c2'));
      const wp = await fr.evaluate(() => ({ screen: Hour.screen(), ask: (document.querySelector('.welcome .ask') || {}).textContent || '',
        btns: Array.from(document.querySelectorAll('.welcome button')).map(x => x.textContent.trim()) }));
      must(wp.screen === 'welcome' && wp.ask === want, 'A11 the hour says "' + want + '" (got "' + wp.ask + '")');
      must(wp.btns.join('|') === [C.carryOn, C.startAgain].join('|'), 'A11 the buttons are Carry on and Start again (' + wp.btns.join(', ') + ')');
      await page.screenshot({ path: path.join(OUT, 'a11-welcome.png') });
      await fr.click('[data-act="carry"]'); await sleep(1000);
      must(await fr.evaluate(() => Hour.screen() === 'c2-ask' && document.getElementById('qbox').value === 'age < 20' && !!Hour.state.stamps.c1), 'A11 Carry on lands on the saved screen with her rule in the box and her stamp kept');
    }

    /* A11 + A13 the rush clock: it comes back with its seconds, and Pause or a tab change stops it */
    if (fr) {
      await goTo(fr, 'c6-ask1'); await sleep(3200);
      await typeRule(page, fr, 'temp_c > 30');
      const c1 = await fr.evaluate(() => Hour.clock());
      must(c1.running && c1.left < 180 && c1.left > 150, 'A13 the rush clock is running (' + c1.left + ' s left)');
      await fr.click('[data-act="pause"]'); await sleep(400);
      const p0 = await fr.evaluate(() => Hour.clock().left); await sleep(2500);
      const p1 = await fr.evaluate(() => Hour.clock().left);
      must(p0 === p1, 'A13 Pause stops the rush clock (' + p0 + ' then ' + p1 + ')');
      await fr.click('.pauseveil [data-act="pause"]'); await sleep(400);
      const tab = await fr.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); const p = Hour.state.paused; delete document.hidden; return p; });
      must(tab === true, 'A13 a tab change pauses the hour');
      await fr.click('.pauseveil [data-act="pause"]'); await sleep(300);
      dr = await draftOf(page);
      const saved = dr && dr.remain;
      must(typeof saved === 'number' && saved < 180000 && saved > 100000, 'A11 the clock\'s remaining time is in her lesson draft (' + saved + ')');
      await openLesson6(page);
      fr = await frameOf(page); await hourReady(fr); await sleep(800);
      await fr.click('[data-act="carry"]'); await sleep(1200);
      const c2 = await fr.evaluate(() => ({ s: Hour.screen(), c: Hour.clock() }));
      must(c2.s === 'c6-ask1' && c2.c.running && Math.abs(c2.c.left - Math.ceil(saved / 1000)) <= 3, 'A11 Carry on brings the rush clock back with its seconds (' + c2.c.left + ' s, saved ' + Math.round(saved / 1000) + ')');
    }

    /* A12 running out of time */
    if (fr) {
      await fr.evaluate(() => { Hour.state.t0 -= 48 * 60000 + 5000; Hour.go(Hour.state.i); });
      await sleep(800);
      const note = await fr.evaluate(() => Array.from(document.querySelectorAll('.note')).map(n => n.textContent).join(' | '));
      must(note.indexOf(C.outOfTime) !== -1, 'A12 from minute 48 the note says "' + C.outOfTime + '"');
      await page.screenshot({ path: path.join(OUT, 'a12-rush.png') });
      await fr.click('[data-chip="close"]'); await sleep(900);
      must(await fr.evaluate(() => Hour.screen()) === 'badges', 'A12 Finish in the strip goes to the badges');
      await fr.evaluate(() => { const x = document.querySelector('[data-act="next"]'); if (x) x.click(); });
      await sleep(2500);
    }
    must(await chunkNow(page) === 'exit', 'A12 from the badges the lesson goes on to the five questions');

    /* A10 the five questions */
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#chunk-host button')).find(x => /Ready|Start/i.test(x.textContent)); if (b) b.click(); });
    await sleep(700);
    for (let i = 0; i < 5; i++) {
      await page.waitForSelector('.q-card .q-opt', { timeout: 5000 });
      await sleep(450);
      const stem = await page.evaluate(() => document.querySelector('.q-stem').textContent.trim());
      must(stem === STEMS[i], 'A10 question ' + (i + 1) + ' reads "' + STEMS[i] + '" (got "' + stem + '")');
      if (i === 0) { await page.screenshot({ path: path.join(OUT, 'a10-q1.png') }); await look(page); }
      await page.evaluate((w) => { const o = Array.from(document.querySelectorAll('.q-opt')).find(x => x.querySelector('span:last-child').textContent === w); if (o) o.click(); }, RIGHT[i]);
      await sleep(700);
    }
    let differs = false;
    for (let t = 0; t < 12 && !differs; t++) {
      const o = await page.evaluate(() => { const its = App.state.chunks.find(c => c.id === 'exit').config.items[0].options; const ord = its.map((_, i) => i); for (let s = ord.length - 1; s > 0; s--) { const j = Math.floor(Math.random() * (s + 1)); [ord[s], ord[j]] = [ord[j], ord[s]]; } return ord.join(''); });
      differs = o !== '012';
    }
    must(differs, 'A10 the options come in a random order');
    await sleep(1200);
    must(await chunkNow(page) === 'close', 'A10 after the five answers she is on How did it go?');

    await look(page);
    const se = await page.evaluate(() => Array.from(document.querySelectorAll('.se-row p')).map(p => p.textContent));
    must(JSON.stringify(se) === JSON.stringify(S.close.felt), 'A10 the three sentences are the design\'s (' + se.join(' / ') + ')');
    await page.evaluate(() => {
      document.querySelectorAll('.se-chips').forEach(r => r.querySelector('.se-chip').click());
      const d = document.querySelector('.se-diff-chips .se-chip[data-d="1"]'); if (d) d.click();
      document.querySelector('.se-submit').click();
    });
    await page.waitForSelector('.exit-done', { timeout: 10000 }).catch(() => {});
    await sleep(500);
    const dn = await page.evaluate(() => { const d = document.querySelector('.exit-done'); return d ? { h: d.querySelector('h2').textContent, t: d.textContent,
      btns: Array.from(d.querySelectorAll('button')).map(x => x.textContent.trim()) } : null; });
    must(dn && dn.h === S.close.end, 'A10 the done card says "' + S.close.end + '" (got "' + (dn && dn.h) + '")');
    must(dn && dn.t.indexOf('You got 5 of the 5 questions right.') !== -1, 'A10 the done card gives her score');
    must(dn && dn.t.indexOf('[') === -1, 'A10 no raw data on the done card');
    must(dn && dn.btns.join('|') === [S.close.freeTitle, 'Finish'].join('|'), 'A10 the done card offers Free time and Finish (' + (dn && dn.btns.join(', ')) + ')');
    await page.screenshot({ path: path.join(OUT, 'a10-done.png'), fullPage: true });
    await page.evaluate((l) => { const x = Array.from(document.querySelectorAll('.exit-done button')).find(b => b.textContent.trim() === l); if (x) x.click(); }, S.close.freeTitle);
    await sleep(2500);
    must(await chunkNow(page) === 'free', 'A10 Free time opens the free headlines');
    fr = await frameOf(page);
    if (fr) {
      await hourReady(fr);
      await sleep(800);
      must(await fr.evaluate(() => Hour.screen()) === 'free', 'A10 the frame opens on the free headlines');
      await page.screenshot({ path: path.join(OUT, 'a10-free.png') });
      await look(page);
      /* she reads both free headlines (Show me, Next one) and the end line offers Done */
      for (let k = 0; k < 6; k++) {
        const act = await fr.evaluate(() => { for (const a of ['free-done', 'free-next', 'reveal']) { const x = document.querySelector('[data-act="' + a + '"]'); if (x) { x.click(); return a; } } return null; });
        await sleep(700); if (!act || act === 'free-done') break;
      }
      await sleep(2500);
    }
    must(await page.evaluate(() => !!document.querySelector('.badge-pop.show')), 'A10 the free headlines\' end finishes the lesson');
    const rec = await page.evaluate(([email, cls]) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const r = db.pupils[cls + ':' + email]; return r && r.L && r.L['6']; }, [EMAIL, CLASS]);
    must(rec && Number(rec[0]) === 2, 'A10 Lesson 6 is recorded as finished');
    must(rec && JSON.stringify(rec).indexOf('bj3-b16=1') !== -1, 'A10 asker is recorded as j3-b16 on Lesson 6');

    /* the shared tables: every landmark stood on, and the shape as pinned */
    must(LANDMARKS.length > 0, 'LANDMARKS[\'j3-6\'] is declared in sit-wrongpath.js');
    must(!!EXPECT, 'EXPECT[\'j3-6\'] is declared in sit-review.js');
    for (const [label] of LANDMARKS) must(!!stood[label], 'stood on: ' + label);
    const shape = { xp: (await xpNow(page)) - xpStart, chunks: walked.length, marks: rec ? Number(rec[1]) || 0 : 0,
      badges: rec ? (JSON.stringify(rec).match(/bj3-b(1[6-9]|2[01])=1/g) || []).length : 0 };
    console.log('  SHAPE ' + JSON.stringify(shape) + '  walked ' + walked.join(' '));
    if (EXPECT) for (const k of ['xp', 'chunks', 'marks', 'badges']) if (EXPECT[k] != null) must(shape[k] === EXPECT[k], 'shape ' + k + ' = ' + EXPECT[k] + ' (walked ' + shape[k] + ')');
  } catch (e) { must(false, 'the walk stopped: ' + e.message.split('\n')[0]); }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await b.close();
  console.log(checks + ' checks, ' + FAILS.length + ' failed.');
  if (EXPECT_FAIL) { console.log(FAILS.length ? 'CONTROL OK: the gate fails on a build without the lesson.' : 'CONTROL BROKEN: the gate passed a build without the lesson.'); process.exit(FAILS.length ? 0 : 1); }
  console.log('\nj3l6-platform: ' + (FAILS.length ? 'FAIL · ' + FAILS.length + ' of ' + checks : 'PASS · ' + checks + ' checks'));
  process.exit(FAILS.length ? 1 : 0);
})();
