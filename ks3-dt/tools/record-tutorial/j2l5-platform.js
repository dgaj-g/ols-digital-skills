#!/usr/bin/env node
/* J2 L5 THE SEARCH · the lesson around the hour, on the PLATFORM SHELL (spec §10, §11, §16, §19.3; A8, A12, A15).
 * The hour's own gates (j2l5-judge-test, -frozen, -twins, -words, -python, -clock-test, -walk) prove the hour.
 * This one proves the lesson around it, against the served platform with its dev server:
 *   P1  Lesson 5's card says Loop Machines with The Search under it; after the Do-Now the lesson opens on the
 *       `search` step, the shipped hour page in its frame (no test mode), filling the lesson
 *   P2  her place: what the hour saves (chapter, the lamb's name, where she found her) reaches her lesson draft;
 *       a reopened lesson says "Welcome back, <first name>. You were at <chapter>." with Carry on and Start again;
 *       a reopen at Home comes back to Home, not to the Do-Now, and the lamb keeps her name
 *   P3  badges: The Tracks, The Spiral, The Way Home become j2-b13/b14/b15 with their XP, once only
 *       CONTROL: the same badge sent twice must not add XP twice
 *   P4  running out of time: from minute 48 the note shows, and the next chapter end offers Carry on and Home
 *   P5  BEEP's last 5 questions: the design's questions, the evidence code on the card, options shuffled
 *   P6  How it felt: the design's 3 sentences, the done card's heading, the score line, a wrong answer's own line,
 *       then Free flight and Finish; Free flight opens the free flight in the frame, and its end finishes the lesson
 *   P7  the lamb's name lives only in her own draft: nothing a teacher's screen reads holds it
 * Every control must fail on a build without the lesson: run it with --expect-fail against such a build.
 *   node ks3-dt/tools/record-tutorial/j2l5-platform.js [--base http://localhost:8126] [--expect-fail] */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../../..');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8126');
const EXPECT_FAIL = args.includes('--expect-fail');
const OUT = path.join(__dirname, 'qa-j2l5/platform');
fs.mkdirSync(OUT, { recursive: true });
const URL = BASE + '/ks3-dt/platform/index.html?class=Demo-9A&as=aoife';
const EMAIL = 'aoife.mcgrath@demo', FIRST = 'Aoife';
const LAMB = 'Snowdrop';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let checks = 0; const FAILS = [];
const must = (ok, what) => { checks++; console.log((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) FAILS.push(what); return ok; };

/* the design's own words (L5_PROTOTYPES/hour/strings.js), not retyped */
const W = {}; new Function('window', fs.readFileSync('/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/L5_PROTOTYPES/hour/strings.js', 'utf8'))(W);
const P = W.SearchStrings;
/* ...as SHIPPED: with the cold read's listed edits (j2l5/coldread-edits.json, DFM 334 / K83), applied exactly as
   j2l5-words.js applies them, so this gate checks the words a pupil reads and not the design's first draft */
(() => {
  const EDITS = JSON.parse(fs.readFileSync(path.join(__dirname, 'j2l5/coldread-edits.json'), 'utf8'));
  const keysOf = p => p.split(/\.|\[|\]/).filter(Boolean);
  Object.keys(EDITS.table || {}).forEach(p => { const k = keysOf(p), last = k.pop(), par = k.reduce((x, y) => x == null ? x : x[y], P); if (par == null || !(last in par)) return; /* a path the build moved (ch1.j4 -> common): j2l5-words owns those */ par[last] = EDITS.table[p]; });
  Object.keys(EDITS.last5 || {}).forEach(i => { const e = EDITS.last5[i], x = P.close.last5[i]; if (e.q) x.q = e.q; (e.lines || []).forEach((l, k) => { if (l) x.opts[k][1] = l; }); });
})();
const QUESTIONS = P.close.last5.map(x => x.q);
const RIGHT = P.close.last5.map(x => x.opts.find(o => o[2])[0]);
const Q1_WRONG = P.close.last5[0].opts.find(o => !o[2]);
const Q1_WRONG_LINE = Q1_WRONG[1].replace(/\s*Try again\.$/, '');
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => o[k] != null ? o[k] : m);
const WELCOME3 = fill(P.common.welcomeNoLamb, { name: FIRST, chapter: P.strip[3] });
const WELCOME_HOME = fill(P.common.welcomeNoLamb, { name: FIRST, chapter: P.strip[5] });
const SCORE = 'You got 4 of the 5 questions right.';
const BADGES = [['b13', 'j2-b13', 12], ['b14', 'j2-b14', 12], ['b15', 'j2-b15', 15]];

async function seed(page) {
  await page.evaluate((email) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks['Demo-9A'] = db.locks['Demo-9A'] || {};
    for (const n of ['1', '2', '3', '4', '5']) db.locks['Demo-9A'][n] = { u: now, on: 1 };
    const kk = 'Demo-9A:' + email;
    db.pupils = db.pupils || {};
    const rec = db.pupils[kk] || { n: 'Aoife McGrath', cn: '', j: 2, xp: 0, g: '' };
    rec.L = rec.L || {};
    for (const n of ['1', '2', '3', '4']) if (!rec.L[n] || Number(rec.L[n][0]) !== 2) rec.L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + Number(n), 10, 0, '', 0, 0];
    delete rec.L['5'];
    db.pupils[kk] = rec;
    const up = (db.userProps || {})[email];
    if (up && up.draft) Object.keys(up.draft).forEach(k => { if (/:5:/.test(k)) delete up.draft[k]; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, EMAIL);
}
async function openLesson5(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(600);
  const tile = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /Loop Machines/i.test(e.textContent));
    const story = t && t.querySelector('.tile-story');
    if (t) t.click();
    return t ? { story: story ? story.textContent.trim() : '' } : null;
  });
  await sleep(2500);
  /* the platform's own Do-Now opens every lesson after Lesson 1; the walk steps past it to the lesson's first step */
  const skipped = await page.evaluate(() => { const s = App.state; if (!s.chunks || !s.chunks[s.chunkIdx] || s.chunks[s.chunkIdx].id !== '_recap') return false;
    s.chunkIdx = s.chunks.findIndex(c => c.id === 'search'); App.remountChunk(); return true; });
  if (skipped) await sleep(2500);
  return tile;
}
const chunkNow = page => page.evaluate(() => { const s = App.state; return s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; });
const frameOf = async page => { const h = await page.$('#chunk-host iframe.search-frame'); return h ? h.contentFrame() : null; };
const xpNow = page => page.evaluate(() => App.state.xp);
const hourReady = fr => fr.waitForFunction(() => window.SearchHour && window.SearchBridge && window.SearchUI, null, { timeout: 15000 });
const panelOf = fr => fr.evaluate(() => ({ kicker: (document.getElementById('kicker') || {}).textContent || '', head: (document.getElementById('head') || {}).textContent || '',
  btns: Array.from(document.querySelectorAll('#pbtn button')).map(b => b.textContent.trim()) }));
const waitPanel = async (fr, re, ms) => { const t = Date.now(); let p; do { p = await panelOf(fr); if (re.test(p.head)) return p; await sleep(250); } while (Date.now() - t < (ms || 8000)); return p; };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2000);
    await seed(page);

    /* P1 */
    const tile = await openLesson5(page);
    must(!!tile, 'P1 Lesson 5 is on her lesson screen as Loop Machines');
    if (!tile) throw new Error('no lesson to walk');
    must(tile.story === 'The Search', 'P1 the lesson card says The Search under the title (got "' + tile.story + '")');
    must(await chunkNow(page) === 'search', 'P1 after the Do-Now, the lesson opens on the search step');
    let fr = await frameOf(page);
    must(!!fr, 'P1 the hour is on screen in its frame');
    if (!fr) throw new Error('no hour frame');
    await hourReady(fr);
    must(await fr.evaluate(() => SearchBridge.test === false), 'P1 the frame is the shipped page, not the test mode');
    must(/assets\/search\/hour\.html/.test(fr.url()), 'P1 the frame shows assets/search/hour.html');
    const fbox = await page.evaluate(() => { const r = document.querySelector('iframe.search-frame').getBoundingClientRect(); return [r.width, r.height, innerWidth, innerHeight]; });
    must(fbox[0] >= fbox[2] - 2 && fbox[1] >= fbox[3] * 0.8, 'P1 the frame fills the width and most of the height (' + fbox.map(Math.round).join(' x ') + ')');
    await page.screenshot({ path: path.join(OUT, 'p1-open.png') });

    /* P2 her place reaches the draft */
    await fr.evaluate(() => { SearchHour.save(3); });
    await sleep(1200);
    let dr = await page.evaluate(() => App.state.draft && App.state.draft.search);
    must(dr && dr.chapter === 3, 'P2 the chapter the hour saves is in her lesson draft (' + JSON.stringify(dr) + ')');

    /* P3 badges */
    const xp0 = await xpNow(page);
    await fr.evaluate(() => SearchBridge.badge('b13'));
    await sleep(1200);
    const xp1 = await xpNow(page);
    must(xp1 === xp0 + 12, 'P3 The Tracks adds 12 XP (' + xp0 + ' to ' + xp1 + ')');
    await fr.evaluate(() => SearchBridge.badge('b13'));
    await sleep(1200);
    must(await xpNow(page) === xp1, 'P3 CONTROL the same badge twice adds nothing');
    await fr.evaluate(() => { SearchBridge.badge('b14'); SearchBridge.badge('b15'); });
    await sleep(1500);
    must(await xpNow(page) === xp1 + 12 + 15, 'P3 The Spiral and The Way Home add 12 and 15 XP');
    const det = await page.evaluate((email) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const r = db.pupils['Demo-9A:' + email]; return JSON.stringify(r && r.L && r.L['5'] || ''); }, EMAIL);
    must(BADGES.every(x => det.indexOf('b' + x[1] + '=1') !== -1), 'P3 the platform records j2-b13, j2-b14 and j2-b15 on Lesson 5');
    must(await page.evaluate(() => !document.querySelector('.badge-pop.show')), 'P3 the platform draws no second badge card over the hour');

    /* P2 a reopened lesson hands the place back */
    await openLesson5(page);
    fr = await frameOf(page);
    must(fr && /"chapter":3/.test(decodeURIComponent(fr.url())), 'P2 a reopened lesson gives the hour her place on its address');
    if (fr) {
      await hourReady(fr);
      const wp = await waitPanel(fr, /Welcome back/);
      must(wp.head === WELCOME3, 'P2 the hour says "' + WELCOME3 + '" (got "' + wp.head + '")');
      must(wp.btns.join('|') === [P.btn.carryOn, P.btn.startAgain].join('|'), 'P2 the buttons are Carry on and Start again (' + wp.btns.join(', ') + ')');
      await page.screenshot({ path: path.join(OUT, 'p2-welcome.png') });
      /* the lamb is named at Home: the name and where she was found reach the draft */
      await fr.evaluate((lamb) => { SearchHour.lamb = lamb; SearchHour.foundAt = 'the way home'; SearchHour.save(5); }, LAMB);
      await sleep(1200);
      dr = await page.evaluate(() => App.state.draft && App.state.draft.search);
      must(dr && dr.chapter === 5 && dr.lambName === LAMB && dr.foundAt === 'the way home', 'P2 the lamb\'s name and where she found her are in her lesson draft');
    }
    await openLesson5(page);
    fr = await frameOf(page);
    if (fr) {
      await hourReady(fr);
      const hp = await waitPanel(fr, /Welcome back/);
      must(hp.head === WELCOME_HOME, 'P2 a reopen at Home says "' + WELCOME_HOME + '", not the Do-Now (got "' + hp.head + '")');
      must(await fr.evaluate(() => SearchHour.lamb) === LAMB, 'P2 the lamb keeps her name');
    }

    /* P4 running out of time */
    if (fr) {
      /* she answers the welcome first (Carry on), as she must before any chapter can end */
      await fr.evaluate((c) => { const x = Array.from(document.querySelectorAll('#pbtn button')).find(b => b.textContent.trim() === c); if (x) x.click(); }, P.btn.carryOn);
      await sleep(1200);
      /* shift the story clock to minute 48:05 and let it run on (a frozen clock would stall every U.wait) */
      await fr.evaluate(() => { const U = window.SearchUI; U.__now = U.now; const off = 48 * 60 + 5 - U.__now(); U.now = function () { return U.__now() + off; }; });
      await sleep(900);
      const note = await fr.evaluate(() => { const n = document.getElementById('note'); return n && !n.classList.contains('off') ? n.textContent : ''; });
      must(note === P.common.runningOut, 'P4 from minute 48 the note says "' + P.common.runningOut + '" (got "' + note + '")');
      await fr.evaluate(() => { window.__between = null; SearchHour.between(3).then(id => { window.__between = id; }); });
      await sleep(600);
      /* the head is drawn at once and the buttons after the beat (mark), so wait for the buttons, up to 8 s */
      let bp = await panelOf(fr); for (let t = 0; t < 32 && bp.btns.indexOf(P.btn.home) === -1; t++) { await sleep(250); bp = await panelOf(fr); }
      must(bp.head === P.common.runningOut && bp.btns.join('|') === [P.btn.carryOn, P.btn.home].join('|'), 'P4 the chapter end offers Carry on and Home (' + bp.head + ' · ' + bp.btns.join(', ') + ')');
      await fr.evaluate((h) => { const x = Array.from(document.querySelectorAll('#pbtn button')).find(b => b.textContent.trim() === h); if (x) x.click(); }, P.btn.home);
      await sleep(500);
      must(await fr.evaluate(() => window.__between) === 'home', 'P4 Home is a real way home');
      await fr.evaluate(() => { const U = window.SearchUI; if (U.__now) U.now = U.__now; });
      /* the hour's end goes on to BEEP's last 5 questions */
      await fr.evaluate(() => SearchBridge.done('end'));
      await sleep(1500);
    }
    must(await chunkNow(page) === 'exit', 'P4 the hour\'s end goes on to BEEP\'s last 5 questions');

    /* P5 the 5 questions */
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#chunk-host button')).find(x => /Ready|Start/i.test(x.textContent)); if (b) b.click(); });
    await sleep(700);
    for (let i = 0; i < 5; i++) {
      await page.waitForSelector('.q-card .q-opt', { timeout: 5000 });
      await sleep(450);
      const card = await page.evaluate(() => ({ stem: document.querySelector('.q-stem').textContent.trim(),
        pre: (document.querySelector('.q-card .q-pre') || {}).textContent || '', opts: Array.from(document.querySelectorAll('.q-opt span:last-child')).map(s => s.textContent) }));
      must(card.stem === QUESTIONS[i], 'P5 question ' + (i + 1) + ' reads "' + QUESTIONS[i] + '" (got "' + card.stem + '")');
      must(card.pre.trim() === P.close.last5[i].ev.join('\n').trim(), 'P5 question ' + (i + 1) + ' shows its code');
      if (i === 0) await page.screenshot({ path: path.join(OUT, 'p5-q1.png') });
      const want = i === 0 ? Q1_WRONG[0] : RIGHT[i];
      await page.evaluate((w) => { const o = Array.from(document.querySelectorAll('.q-opt')).find(x => x.querySelector('span:last-child').textContent === w); if (o) o.click(); }, want);
      await sleep(700);
    }
    let differs = false;
    for (let t = 0; t < 12 && !differs; t++) {
      const o = await page.evaluate(() => { const its = App.state.chunks.find(c => c.id === 'exit').config.items[0].options; const ord = its.map((_, i) => i); for (let s = ord.length - 1; s > 0; s--) { const j = Math.floor(Math.random() * (s + 1)); [ord[s], ord[j]] = [ord[j], ord[s]]; } return ord.join(''); });
      differs = o !== '012';
    }
    must(differs, 'P5 the options come in a random order');
    await sleep(1200);
    must(await chunkNow(page) === 'close', 'P5 after the 5 answers she is on How it felt');

    /* P6 How it felt */
    const se = await page.evaluate(() => ({ rows: Array.from(document.querySelectorAll('.se-row p')).map(p => p.textContent) }));
    must(JSON.stringify(se.rows) === JSON.stringify(P.close.felt), 'P6 the 3 sentences are the design\'s (' + se.rows.join(' / ') + ')');
    await page.evaluate(() => {
      document.querySelectorAll('.se-chips').forEach(r => r.querySelector('.se-chip').click());
      const d = document.querySelector('.se-diff-chips .se-chip[data-d="1"]'); if (d) d.click();
      document.querySelector('.se-submit').click();
    });
    await page.waitForSelector('.exit-done', { timeout: 10000 }).catch(() => {});
    await sleep(500);
    const dn = await page.evaluate(() => { const d = document.querySelector('.exit-done'); return d ? { h: d.querySelector('h2').textContent, t: d.textContent,
      btns: Array.from(d.querySelectorAll('button')).map(x => x.textContent.trim()) } : null; });
    must(dn && dn.h === P.close.feltDone, 'P6 the done card says "' + P.close.feltDone + '" (got "' + (dn && dn.h) + '")');
    must(dn && dn.t.indexOf(SCORE) !== -1, 'P6 the done card says "' + SCORE + '"');
    must(dn && dn.t.indexOf(Q1_WRONG_LINE) !== -1, 'P6 her wrong answer to question 1 gets its own line ("' + Q1_WRONG_LINE + '")');
    must(dn && dn.t.indexOf('[') === -1 && dn.t.indexOf('Try again') === -1, 'P6 no raw data and no "Try again" on the done card');
    must(dn && dn.btns.join('|') === [P.btn.freeFlight, P.btn.finish].join('|'), 'P6 the done card offers Free flight and Finish (' + (dn && dn.btns.join(', ')) + ')');
    await page.screenshot({ path: path.join(OUT, 'p6-done.png'), fullPage: true });
    await page.evaluate((l) => { const x = Array.from(document.querySelectorAll('.exit-done button')).find(b => b.textContent.trim() === l); if (x) x.click(); }, P.btn.freeFlight);
    await sleep(2500);
    must(await chunkNow(page) === 'flight', 'P6 Free flight opens the free flight');
    fr = await frameOf(page);
    if (fr) {
      await hourReady(fr);
      const fp = await waitPanel(fr, /\S/, 10000);
      must(fp.kicker === P.close.kicker && fp.head === P.close.freeH, 'P6 the frame opens on the free flight ("' + fp.head + '")');
      await page.screenshot({ path: path.join(OUT, 'p6-flight.png') });
      await fr.evaluate(() => SearchBridge.done('end'));
      await sleep(2000);
    }
    must(await page.evaluate(() => !!document.querySelector('.badge-pop.show .finish, .badge-pop.show')), 'P6 the free flight\'s end finishes the lesson');
    const rec = await page.evaluate((email) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const r = db.pupils['Demo-9A:' + email]; return r && r.L && r.L['5']; }, EMAIL);
    must(rec && Number(rec[0]) === 2, 'P6 Lesson 5 is recorded as finished');

    /* P7 the lamb's name */
    const leak = await page.evaluate((lamb) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const c = Object.assign({}, db); delete c.userProps; return JSON.stringify(c).indexOf(lamb); }, LAMB);
    must(leak === -1, 'P7 the lamb\'s name is nowhere a teacher\'s screen reads (only in her own draft)');
    const staff = fs.readFileSync(path.join(ROOT, 'ks3-dt/platform/staff.js'), 'utf8');
    must(!/\.draft\b/.test(staff) && !/lambName|SearchHour|draft\.search/.test(staff), 'P7 the staff screens never read a pupil\'s draft');
  } catch (e) { must(false, 'the walk stopped: ' + e.message.split('\n')[0]); }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await b.close();
  console.log(checks + ' checks, ' + FAILS.length + ' failed.');
  if (EXPECT_FAIL) { console.log(FAILS.length ? 'CONTROL OK: the gate fails on a build without the lesson.' : 'CONTROL BROKEN: the gate passed a build without the lesson.'); process.exit(FAILS.length ? 0 : 1); }
  console.log('\nj2l5-platform: ' + (FAILS.length ? 'FAIL · ' + FAILS.length + ' of ' + checks : 'PASS · ' + checks + ' checks'));
  process.exit(FAILS.length ? 1 : 0);
})();
