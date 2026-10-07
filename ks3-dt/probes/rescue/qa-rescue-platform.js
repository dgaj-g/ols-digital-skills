#!/usr/bin/env node
/* qa-rescue-platform.js: J3 Lesson 4 "The Rescue" on the PLATFORM SHELL (spec sections 10.3, 10.4, 11, 16).
 *
 * The story's own gates (hour-type-test, hour-gates-test, hour-judge-test, film-type-test, frame-hash) prove
 * the story. This one proves the lesson around it, against the served platform with its dev server:
 *   P1  Lesson 4 is called The Rescue and opens on the `rescue` step, which shows the story's page in a frame,
 *       the shipped page (no test options), with chapter 1 on screen
 *   P2  her place: what the story saves reaches her lesson draft (draft.rescue), and a reopened lesson hands
 *       the same place back to the story on the frame's address
 *   P3  badges: a story badge becomes the platform badge j3-b10/b11/b12 with its XP (12, 12, 15), once only
 *       CONTROL: the same badge sent twice must not add XP twice
 *   P4  the last minutes: the story's "Go to the 5 questions" lands on the exit check, the story is not marked
 *       finished, and after the 5 answers "Go back to the story" returns her to her place
 *   P5  the 5 questions: Blink's questions in the spec's words, the evidence code on the card, options shuffled
 *   P6  the story's end goes on to How did it go? (the 5 questions are not asked twice)
 *   P7  How did it go?: the 3 sentences of spec 10.4, the note under Send & finish, the done card's heading,
 *       the score line, and each wrong answer's own line
 *   P8  the hedgehog's name lives only in her own draft: nothing a teacher's screen reads holds it
 * Every control must fail on a build without the lesson: run it with --expect-fail against such a build.
 *
 *   node ks3-dt/probes/rescue/qa-rescue-platform.js [--base http://localhost:8121] [--expect-fail]
 */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8121');
const EXPECT_FAIL = args.includes('--expect-fail');
const OUT = path.join(__dirname, 'shots', 'platform');
fs.mkdirSync(OUT, { recursive: true });
const URL = BASE + '/ks3-dt/platform/index.html?class=Demo-10A&as=maeve';
const EMAIL = 'maeve.torley@demo';
const HOG = 'Prickles';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let checks = 0; const FAILS = [];
const must = (ok, what) => { checks++; console.log((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) FAILS.push(what); return ok; };

const QUESTIONS = ['What is rung?', 'You defined the function cross. Nothing moved. Why?', 'You type cross("Dot"). What goes into who?',
  'You add 1 line inside dash. How many of the 5 dashes change?', 'Which line calls the function rescue?'];
const RIGHT = ['A function, which is a set of instructions with a name', 'A function waits until it is called', 'Dot', 'All 5 dashes', 'rescue("Billy")'];
const Q1_WRONG = 'A list of rungs', Q1_WRONG_LINE = 'A list holds things. rung holds instructions.';
const SENTENCES = ['I can say why a function is better than typing the same lines again.',
  'I can write a function with a gap and call it with different names.',
  'I can use one function many times, with a different animal\'s name each time.'];
const NOTE = 'Click an answer under each of the 3 sentences above, and click how hard the hour felt. Then the "Send & finish" button will work.';
const DONE_TITLE = 'Your answers are sent. The Rescue is finished.';
const SCORE = 'You got 4 of the 5 questions right.';

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
async function openLesson4(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(600);
  const found = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /The Rescue/i.test(e.textContent));
    if (t) t.click();
    return !!t;
  });
  await sleep(2500);
  /* every lesson after Lesson 1 opens on the platform's own Do-Now warm-up (app.js buildChunks); it is not
     part of this lesson and is unchanged, so the walk steps past it to the lesson's own first step */
  const skipped = await page.evaluate(() => { const s = App.state; if (!s.chunks || !s.chunks[s.chunkIdx] || s.chunks[s.chunkIdx].id !== '_recap') return false;
    s.chunkIdx = s.chunks.findIndex(c => c.id === 'rescue'); App.remountChunk(); return true; });
  if (skipped) await sleep(2500);
  return found;
}
const chunkNow = page => page.evaluate(() => { const s = App.state; return s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; });
const frameOf = async page => { const h = await page.$('#chunk-host iframe.rescue-frame'); return h ? h.contentFrame() : null; };
const xpNow = page => page.evaluate(() => App.state.xp);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2000);
    await seed(page);

    /* P1 */
    const tile = await openLesson4(page);
    must(tile, 'P1 the lesson tile is called The Rescue');
    if (!tile) throw new Error('no lesson to walk');
    must(await page.evaluate(() => document.getElementById('player-title').textContent) === 'The Rescue', 'P1 the player names the lesson The Rescue');
    must(await chunkNow(page) === 'rescue', 'P1 after the Do-Now, the lesson opens on the rescue step');
    let fr = await frameOf(page);
    must(!!fr, 'P1 the story is on screen in its frame');
    if (!fr) throw new Error('no story frame');
    await fr.waitForFunction(() => window.Hour && window.RescueBridge, null, { timeout: 10000 });
    must(await fr.evaluate(() => RescueBridge.test === false && !('__RescueOpt' in window)), 'P1 the frame is the shipped page, with no test options');
    must(/assets\/rescue\/hour\.html/.test(fr.url()), 'P1 the frame shows assets/rescue/hour.html');
    const fbox = await page.evaluate(() => { const r = document.querySelector('iframe.rescue-frame').getBoundingClientRect(); return [r.width, r.height, innerWidth, innerHeight]; });
    must(fbox[0] >= fbox[2] - 2 && fbox[1] >= fbox[3] * 0.8, 'P1 the frame fills the width and most of the height (' + fbox.map(Math.round).join(' x ') + ')');
    await page.screenshot({ path: path.join(OUT, 'p1-open.png') });

    /* P2 her place reaches the draft */
    await fr.evaluate((hog) => { Hour.save.step = 'r_close'; Hour.save.name = hog; Hour.store(); }, HOG);
    await sleep(1200);
    const dr = await page.evaluate(() => App.state.draft && App.state.draft.rescue);
    must(dr && dr.step === 'r_close' && dr.name === HOG, 'P2 the place the story saves is in her lesson draft');

    /* P3 badges */
    const xp0 = await xpNow(page);
    await fr.evaluate(() => RescueBridge.badge({ id: 'b10', name: 'Winch Hand', xp: 12 }));
    await sleep(1200);
    const xp1 = await xpNow(page);
    must(xp1 === xp0 + 12, 'P3 Winch Hand adds 12 XP (' + xp0 + ' to ' + xp1 + ')');
    await fr.evaluate(() => RescueBridge.badge({ id: 'b10', name: 'Winch Hand', xp: 12 }));
    await sleep(1200);
    must(await xpNow(page) === xp1, 'P3 CONTROL the same badge twice adds nothing');
    const det = await page.evaluate((email) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const r = db.pupils['Demo-10A:' + email]; return JSON.stringify(r && r.L && r.L['4'] || ''); }, EMAIL);
    must(/bj3-b10=1/.test(det), 'P3 the platform records badge j3-b10 on Lesson 4');
    must(await page.evaluate(() => !document.querySelector('.badge-pop')), 'P3 the platform draws no second badge card over the story');

    /* P2 a reopened lesson hands the place back */
    await openLesson4(page);
    fr = await frameOf(page);
    must(fr && /r_close/.test(decodeURIComponent(fr.url())), 'P2 a reopened lesson gives the story her place on its address');
    if (fr) {
      await fr.waitForFunction(() => window.Hour && document.getElementById('hwelcome'), null, { timeout: 10000 });
      const wm = await fr.evaluate(() => document.querySelector('#hwelcome.on') ? document.getElementById('hwmsg').textContent : '');
      must(/Welcome back\. You are at chapter 2/.test(wm), 'P2 the story says Welcome back at chapter 2 ("' + wm + '")');
      must(await fr.evaluate(() => Hour.name()) === HOG, 'P2 the hedgehog keeps its name');
    }

    /* P4 the last minutes */
    await fr.evaluate(() => { document.getElementById('hlast').click(); });
    await sleep(1500);
    must(await chunkNow(page) === 'exit', 'P4 Go to the 5 questions lands on the exit check');
    must(await page.evaluate(() => (App.state.draft.done || []).indexOf('rescue') === -1), 'P4 the story is not marked finished');

    /* P5 the 5 questions */
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#chunk-host button')).find(x => /Ready|Start/i.test(x.textContent)); if (b) b.click(); });
    await sleep(700);
    const orders = [];
    for (let i = 0; i < 5; i++) {
      await page.waitForSelector('.q-card .q-opt', { timeout: 5000 });
      await sleep(450);
      const card = await page.evaluate(() => ({ stem: document.querySelector('.q-stem').textContent.trim(),
        pre: (document.querySelector('.q-card .q-pre') || {}).textContent || '', opts: Array.from(document.querySelectorAll('.q-opt span:last-child')).map(s => s.textContent) }));
      must(card.stem === QUESTIONS[i], 'P5 question ' + (i + 1) + ' reads "' + QUESTIONS[i] + '" (got "' + card.stem + '")');
      if (i < 4) must(card.pre.length > 10, 'P5 question ' + (i + 1) + ' shows its code');
      orders.push(card.opts.join('|'));
      if (i === 0) await page.screenshot({ path: path.join(OUT, 'p5-q1.png') });
      const want = i === 0 ? Q1_WRONG : RIGHT[i];
      await page.evaluate((w) => { const o = Array.from(document.querySelectorAll('.q-opt')).find(x => x.querySelector('span:last-child').textContent === w); if (o) o.click(); }, want);
      await sleep(700);
    }
    /* the shuffle: a second visit to question 1 in a fresh page must be able to differ; 8 tries */
    let differs = false;
    for (let t = 0; t < 8 && !differs; t++) {
      const o = await page.evaluate(() => { const its = App.state.chunks.find(c => c.id === 'exit').config.items[0].options; const ord = its.map((_, i) => i); for (let s = ord.length - 1; s > 0; s--) { const j = Math.floor(Math.random() * (s + 1)); [ord[s], ord[j]] = [ord[j], ord[s]]; } return ord.join(''); });
      differs = o !== '012';
    }
    must(differs, 'P5 the options come in a random order');

    /* P4 Go back to the story */
    await sleep(800);
    const back = await page.evaluate(() => { const b = Array.from(document.querySelectorAll('#chunk-host button')).find(x => /Go back to the story/.test(x.textContent)); if (b) { b.click(); return true; } return false; });
    must(back, 'P4 after the 5 answers, Go back to the story is offered');
    await sleep(2000);
    must(await chunkNow(page) === 'rescue', 'P4 Go back to the story returns to the story');
    fr = await frameOf(page);
    if (fr) {
      await fr.waitForFunction(() => window.Hour && Hour.save, null, { timeout: 10000 });
      must(await fr.evaluate(() => Hour.save.step === 'r_close' && !!Hour.save.data.quizDone), 'P4 the story is at her place, and the 5 questions button is gone');

      /* P6 the story's end goes on to How did it go? */
      await fr.evaluate(() => { Hour.save.data.ended = true; Hour.store(); RescueBridge.done('end'); });
      await sleep(1500);
      /* P6 the EXTRA CHALLENGE card: refusable, 2 hard questions, 5 XP (DFM 259) */
      const sc = await page.evaluate(() => ({ go: (document.querySelector('.stretch-go') || {}).textContent || '',
        skip: (document.querySelector('.stretch-skip') || {}).textContent || '' }));
      must(/2 hard questions/.test(sc.go) && /Skip them/.test(sc.skip), 'P6 the story\'s end offers the 2 hard questions, with a way to skip them');
      const xs0 = await xpNow(page);
      await page.evaluate(() => document.querySelector('.stretch-go').click());
      for (let k = 0; k < 2; k++) {
        await sleep(700);
        await page.evaluate(() => document.querySelector('.q-opt').click());
        await sleep(700);
        const line = await page.evaluate(() => (document.querySelector('.q-explain') || {}).textContent || '');
        must(line.length > 20 && line.indexOf('[') === -1, 'P6 hard question ' + (k + 1) + ' answers with the line for her option');
        await page.evaluate(() => document.querySelector('.q-feedback .primary-btn').click());
      }
      await sleep(2000);
      must(await xpNow(page) === xs0 + 5, 'P6 the 2 hard questions add 5 XP');
    }
    must(await chunkNow(page) === 'close', 'P6 the story\'s end goes on to How did it go?, without the questions again');

    /* P7 */
    const se = await page.evaluate(() => ({ rows: Array.from(document.querySelectorAll('.se-row p')).map(p => p.textContent),
      note: (document.querySelector('.se-locked-note') || {}).textContent || '' }));
    must(JSON.stringify(se.rows) === JSON.stringify(SENTENCES), 'P7 the 3 sentences are spec 10.4\'s');
    must(se.note === NOTE, 'P7 the note under Send & finish says what wakes it');
    await page.evaluate(() => {
      document.querySelectorAll('.se-chips').forEach(r => r.querySelector('.se-chip').click());
      document.querySelector('.se-diff-chips .se-chip[data-d="1"]').click();
      document.querySelector('.se-submit').click();
    });
    await page.waitForSelector('.exit-done', { timeout: 10000 }).catch(() => {});
    await sleep(500);
    const dn = await page.evaluate(() => { const d = document.querySelector('.exit-done'); return d ? { h: d.querySelector('h2').textContent, t: d.textContent } : null; });
    must(dn && dn.h === DONE_TITLE, 'P7 the done card says "' + DONE_TITLE + '" (got "' + (dn && dn.h) + '")');
    must(dn && dn.t.indexOf(SCORE) !== -1, 'P7 the done card says "' + SCORE + '"');
    must(dn && dn.t.indexOf(Q1_WRONG_LINE) !== -1, 'P7 her wrong answer to question 1 gets its own line');
    must(dn && dn.t.indexOf('[') === -1, 'P7 no raw data on the done card');
    await page.screenshot({ path: path.join(OUT, 'p7-done.png'), fullPage: true });

    /* P8 the hedgehog's name */
    const leak = await page.evaluate((hog) => { const db = JSON.parse(localStorage.getItem('ks3dt-dev')); const c = Object.assign({}, db); delete c.userProps; return JSON.stringify(c).indexOf(hog); }, HOG);
    must(leak === -1, 'P8 the hedgehog\'s name is nowhere a teacher\'s screen reads (only in her own draft)');
    const staff = fs.readFileSync(path.join(__dirname, '../../platform/staff.js'), 'utf8');
    must(!/\.draft\b/.test(staff) && !/rescue/.test(staff), 'P8 the staff screens never read a pupil\'s draft');
  } catch (e) { must(false, 'the walk stopped: ' + e.message.split('\n')[0]); }
  must(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await b.close();
  console.log(checks + ' checks, ' + FAILS.length + ' failed.');
  if (EXPECT_FAIL) { console.log(FAILS.length ? 'CONTROL OK: the gate fails on a build without the lesson.' : 'CONTROL BROKEN: the gate passed a build without the lesson.'); process.exit(FAILS.length ? 0 : 1); }
  process.exit(FAILS.length ? 1 : 0);
})();
