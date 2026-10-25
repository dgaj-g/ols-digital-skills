#!/usr/bin/env node
/* J2 L5 THE SEARCH · the walker (spec §14 A1–A15, §15 gates 3, 4 and 6; build prompt step 2).
   The design's typewalk.js ported: a pupil who types at 4 keys a second and reads at 0.35 s a word, played
   against the SERVED lesson (dev server, Aoife in Demo-9A, the Lesson 5 tile, every chunk to the done card),
   at 1280×900, 1440×900 and 1366×768. The hour is a page in a frame (assets/search/hour.html); the walker
   answers what the hour wants (window.SearchHour.want), as typewalk does, and the platform steps with
   lib/walk-moves.js.
   Modes:
     right   (default) every program right first time. The only black screen may be '1.2 black' (the long
             way is too long at 4 keys a second: that is the story). Every screen ≤ 40 prose words.
     honest  gate 3: wrong programs Run in the fields and the spiral, then nothing: the sky must go black
             ('2 black', '3 black'); in the last stretch Stop it is never pressed: '4.3 black'. After each,
             her lines are still in the box (spec 224, 298, 362) and after a wrong go too.
     fast    the long way at 40 keys a second: the fast ending (Watch the ending you missed), no '1.2 black'.
   In the free flight every starter is Run through Skulpt and the path drawn is the judge's J.expand (gate 4).
   --proto walks the design's own page (file://, for the walker's own sanity); the lesson is then not checked.
   CONTROL: --control asks for a screen nobody reaches; the walk must FAIL (--expect-fail proves it).
     node ks3-dt/tools/record-tutorial/j2l5-walk.js [--base http://localhost:8125] [--size 1280x900] [--mode right|honest|fast] [--speed 6] [--proto] */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path'), fs = require('fs');
const WALK = require('./lib/walk-moves.js');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8125');
const SIZES = (argOf('--size', '1280x900,1440x900,1366x768')).split(',').map(s => s.split('x').map(Number));
const MODE = argOf('--mode', 'right');
const SP = Number(argOf('--speed', '6'));
const PROTO = args.includes('--proto');
const CONTROL = args.includes('--control'), EXPECT_FAIL = args.includes('--expect-fail');
const PROTO_PAGE = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/L5_PROTOTYPES/search-hour.html';
const CLASS = 'Demo-9A', EMAIL = 'aoife.mcgrath@demo';
const URL = BASE + '/ks3-dt/platform/index.html?class=' + CLASS + '&as=aoife&speed=' + SP;
const OUTROOT = path.join(__dirname, 'qa-j2l5', 'walk');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let checks = 0; const FAILS = [];
const must = (ok, what) => { checks++; console.log((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) FAILS.push(what); return ok; };
const WORDS_MAX = 40, KEYS_A_SEC = 4;

/* ---------- the hour, in its frame: answer what it wants ---------- */
const WRONG = { '2': ['for i in range(2):', '    forward(100)', '    left(90)'], '3': ['for i in range(3):', '    forward(i * 10)', '    left(90)'] };
async function hour(page, fr, o) {
  const log = [], screens = [], words = [];
  let lastScreen = '', lastWantAt = -1, stuck = 0, retries = 0, blackAt = null, hold = null;
  const honest = { '2': 'todo', '3': 'todo', '4': 'todo' }, offered = {}, seenBlack = {};
  const delay = (fast) => Math.round(1000 / ((fast ? 40 : KEYS_A_SEC) * SP));
  async function typeLine(text, fast) { const m = /^( +)/.exec(text); if (m) { for (let i = 0; i < Math.floor(m[1].length / 4); i++) await page.keyboard.press('Tab'); text = text.slice(m[1].length); } await page.keyboard.type(text, { delay: delay(fast) }); }
  async function typePlan(lines, fast) { await fr.focus('#box'); await fr.$eval('#box', b => { b.value = ''; }); for (let i = 0; i < lines.length; i++) { await typeLine(lines[i], fast); if (i < lines.length - 1) await page.keyboard.press('Enter'); } }
  const box = () => fr.$eval('#box', b => b.value.split('\n').map(l => l.replace(/\s+$/, '')).filter(Boolean)).catch(() => []);
  const t0 = Date.now();
  while (Date.now() - t0 < 40 * 60 * 1000 / Math.min(SP, 4)) {
    if (o.left && await o.left()) break;
    const s = await fr.evaluate(() => { const U = window.SearchUI, H = window.SearchHour; if (!U || !H) return null; const m = U.measure[U.measure.length - 1]; return { want: H.want, screen: m ? m.screen : '', now: U.now(), err: window.__hourError, words: U.screenWords ? U.screenWords() : 0 }; }).catch(() => null);
    if (!s) { await sleep(150); continue; }
    if (s.err) { must(false, 'the hour reports no flow error (' + s.err + ')'); break; }
    if (s.screen !== lastScreen) {
      lastScreen = s.screen; screens.push(s.screen); words.push([s.screen, s.words]); log.push((s.now / 60).toFixed(1) + ' min  ' + s.screen);
      if (o.shots) await page.screenshot({ path: path.join(o.shots, String(screens.length).padStart(3, '0') + '-' + s.screen.replace(/[^a-z0-9]+/gi, '_').slice(0, 28) + '.png') }).catch(() => {});
      if (/ black$/.test(s.screen)) { seenBlack[s.screen] = 1; blackAt = s.screen; }
    }
    if (/finished/.test(s.screen) || (o.until && o.until(s))) break;
    const w = s.want; if (!w) { await sleep(40); continue; }
    if (hold) { /* honest: she Ran a wrong program and now does nothing; the clock must end the sky */
      if (seenBlack[hold.black]) { hold = null; lastWantAt = -1; } else { if (Date.now() - hold.t > (hold.secs * 1000 / SP) + 20000) { must(false, 'honest: the sky goes black after a wrong Run and nothing (' + hold.black + ' never came)'); return { screens, words, log, offered, seenBlack, stuck: true }; } await sleep(60); continue; }
    }
    if (w.at === lastWantAt) { if (++stuck > 150) { if (++retries > 3) { must(false, 'the walk does not stall (stuck on ' + JSON.stringify(w).slice(0, 120) + ' at ' + s.screen + ')'); return { screens, words, log, offered, seenBlack, stuck: true }; } lastWantAt = -1; stuck = 0; } await sleep(40); continue; }
    stuck = 0;
    const ch = (/^(\d)/.exec(s.screen) || [])[1];
    try {
      if (w.kind === 'tour') { await sleep(300); for (let i = 0; i < 3; i++) { await fr.click('#tourNext'); await sleep(300); } lastWantAt = w.at; }
      else if (w.kind === 'film') { await fr.click('#read'); lastWantAt = w.at; }
      else if (w.kind === 'line' || w.kind === 'name') { await fr.focus('#box'); await fr.$eval('#box', b => { b.value = ''; }); await typeLine(w.type, MODE === 'fast' && /^1\.2/.test(s.screen)); await page.keyboard.press('Enter'); lastWantAt = w.at; }
      else if (w.kind === 'plan') {
        if (MODE === 'honest' && (ch === '2' || ch === '3') && honest[ch] !== 'done') {
          const mine = WRONG[ch];
          if (honest[ch] === 'todo') { await typePlan(mine); await fr.click('#b-' + w.button); honest[ch] = 'ran'; lastWantAt = w.at; continue; }
          if (honest[ch] === 'ran') { const b = await box(); must(b.join('|') === mine.join('|'), 'honest ' + ch + ': after a wrong go her lines are still in the box (box: ' + JSON.stringify(b) + ')'); honest[ch] = 'held'; hold = { black: ch + ' black', t: Date.now(), secs: ch === '2' ? 40 : 45 }; lastWantAt = w.at; continue; }
          if (honest[ch] === 'held') { const b = await box(); must(b.join('|') === mine.join('|'), 'honest ' + ch + ': after the black and the rewind her plan is kept in the box (box: ' + JSON.stringify(b) + ')'); honest[ch] = 'done'; }
        }
        await typePlan(w.type); await fr.click('#b-' + w.button); lastWantAt = w.at;
      }
      else if (w.kind === 'question') { await sleep(200); const ok = await fr.evaluate(right => { const b = Array.from(document.querySelectorAll('#hsheet .opt')).find(x => x.textContent === right); if (b) { b.click(); return true; } return false; }, w.right); lastWantAt = w.at; must(ok, 'the question offers its right answer (' + w.right + ')'); }
      else if (w.kind === 'predict') { await fr.click('#b-p1'); lastWantAt = w.at; }
      else if (w.kind === 'name-bug') { await fr.click('#b-' + w.right); lastWantAt = w.at; }
      else if (w.kind === 'felt') { await fr.evaluate(() => document.querySelectorAll('#hsheet .felt button[data-v=yes]').forEach(b => b.click())); await sleep(200); await fr.click('#b-next'); lastWantAt = w.at; }
      else if (w.kind === 'free') { lastWantAt = w.at; if (o.free) await o.free(fr); else { await fr.click('#above .starter'); await sleep(200); await fr.click('#b-run'); await sleep(3000); await fr.evaluate(() => { const b = document.getElementById('b-finish'); if (b) b.click(); }); } }
      else if (w.kind === 'button') {
        const ids = w.ids; ids.forEach(i => { offered[i] = (offered[i] || 0) + 1; });
        if (process.env.J2L5_DEBUG) console.log("    want button " + ids.join(",") + " at " + s.screen + " ch " + ch);
        if (MODE === 'honest' && ids.includes('stop') && ch === '4' && honest['4'] === 'todo') { honest['4'] = 'held'; hold = { black: '4.3 black', t: Date.now(), secs: 40 }; lastWantAt = w.at; continue; }
        const id = ['stop', 'start', 'carry', 'fly', 'run', 'next', 'free'].find(x => ids.includes(x)) || ids[0];
        await sleep((id === 'stop' ? 4500 : 1500) / SP); await fr.click('#b-' + id); lastWantAt = w.at;
      }
      else { must(false, 'the walker knows every want (' + JSON.stringify(w).slice(0, 80) + ')'); lastWantAt = w.at; }
    } catch (e) { log.push('walker error ' + e.message.split('\n')[0] + ' on ' + w.kind); lastWantAt = w.at; }
  }
  const data = await fr.evaluate(() => ({ keys: SearchUI.keys, lines: SearchUI.linesTyped, now: SearchUI.now(), lighter: SearchUI.lighter })).catch(() => ({}));
  return { screens, words, log, offered, seenBlack, honest, data };
}

/* ---------- the free flight: every starter through Skulpt, the path is the judge's ---------- */
async function freeFlight(fr) {
  const n = await fr.$$eval('#above .starter', a => a.length).catch(() => 0);
  must(n >= 2, 'the free flight offers its starters (' + n + ')');
  const ready = await fr.evaluate(() => !!window.SearchFree).catch(() => false);
  must(ready, 'the free flight runs on the free-flight Python (window.SearchFree)');
  for (let k = 0; k < n; k++) {
    await fr.evaluate(k => document.querySelectorAll('#above .starter')[k].click(), k); await sleep(250);
    await fr.click('#b-run');
    const got = await fr.waitForFunction(() => window.SearchFree && SearchFree.last && SearchFree.last.done ? SearchFree.last : null, null, { timeout: 15000 }).then(h => h.jsonValue(), () => null);
    if (!ready) continue;
    const want = await fr.evaluate(src => { const J = window.SearchJudge, p = J.parsePlan(src.split('\n')); return p && !p.err ? J.expand(p, 400).map(a => a.op + ' ' + (a.op === 'look' ? 0 : a.v)) : null; }, got ? got.src : '').catch(() => null);
    must(!!got && !got.error, 'free flight starter ' + (k + 1) + ' runs in Python with no error' + (got && got.error ? ' (' + got.error + ')' : ''));
    if (want) must(!!got && got.acts.join('|') === want.join('|'), 'free flight starter ' + (k + 1) + ': the drone Python drives is the judge\'s path (' + (got ? got.acts.length : 0) + ' steps)');
    await sleep(1500 / SP);
  }
  await fr.evaluate(() => { const b = document.getElementById('b-finish'); if (b) b.click(); });
}

function judgeWalk(r, size) {
  const tag = ' (' + size.join('×') + ', ' + MODE + ')';
  must(!r.stuck, 'the walk reaches the end of the hour' + tag);
  const over = r.words.filter(([, w]) => w > WORDS_MAX);
  must(over.length === 0, 'every screen has ≤ ' + WORDS_MAX + ' prose words' + tag + (over.length ? ': ' + over.slice(0, 4).map(x => x.join(' = ')).join(', ') : ' (max ' + Math.max(0, ...r.words.map(x => x[1])) + ')'));
  const blacks = Object.keys(r.seenBlack);
  if (MODE === 'right') must(blacks.join() === '1.2 black', 'a right program at 4 keys a second never fails: the only black is the long way' + tag + ' (' + blacks.join(', ') + ')');
  if (MODE === 'fast') { must(!r.seenBlack['1.2 black'], 'the fast typist beats the long way: no 1.2 black' + tag); must(!!r.offered.other, 'the fast ending offers Watch the ending you missed' + tag); }
  if (MODE === 'honest') ['1.2 black', '2 black', '3 black', '4.3 black'].forEach(b => must(!!r.seenBlack[b], 'honest fail reached: ' + b + tag));
  /* A9: while True runs until Stop it or the battery (the design page skipped this run: fix 6, K83) */
  must(!!r.offered.stop, 'the while True program runs and offers Stop it' + tag);
  if (CONTROL) must(r.screens.includes('CONTROL a screen nobody reaches'), 'CONTROL: a screen nobody reaches is reached');
  must(r.screens.length >= 60, 'the hour shows its screens (' + r.screens.length + ')' + tag);
}

/* ---------- the platform around it ---------- */
async function seed(page) {
  await page.evaluate(([email, cls]) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks[cls] = db.locks[cls] || {};
    for (const n of ['1', '2', '3', '4', '5']) db.locks[cls][n] = { u: now, on: 1 };
    const kk = cls + ':' + email; db.pupils = db.pupils || {};
    const rec = db.pupils[kk] || { n: 'Aoife McGrath', cn: '', j: 2, xp: 0, g: '' };
    rec.L = rec.L || {};
    for (const n of ['1', '2', '3', '4']) if (!rec.L[n] || Number(rec.L[n][0]) !== 2) rec.L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + Number(n), 10, 0, '', 0, 0];
    delete rec.L['5']; db.pupils[kk] = rec;
    const up = (db.userProps || {})[email];
    if (up && up.draft) Object.keys(up.draft).forEach(k => { if (/:5:/.test(k)) delete up.draft[k]; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, [EMAIL, CLASS]);
}
const chunkNow = page => page.evaluate(() => { const s = window.App && App.state; return s && s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : null; });
const frameOf = async page => { const h = await page.$('iframe.search-frame'); return h ? h.contentFrame() : null; };
const ENDED = () => { const s = window.App && App.state; return !!document.querySelector('.badge-pop-card.finish') || (!!document.querySelector('.exit-done, .se-done') && !!s && s.chunks && s.chunkIdx >= s.chunks.length - 1); };
async function frameReady(page) { for (let i = 0; i < 60; i++) { const fr = await frameOf(page); if (fr && await fr.evaluate(() => !!(window.SearchUI && window.SearchHour)).catch(() => false)) return fr; await sleep(300); } return null; }
const badgeSeen = {};
async function pressBadges(page) {
  const pop = await page.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (!b || document.querySelector('.badge-pop-card .finish-glyph')) return null; return { name: (document.querySelector('.badge-pop-name') || {}).textContent || '', off: b.disabled }; });
  if (pop && !pop.off) { badgeSeen[pop.name] = 1; await page.click('.badge-pop button').catch(() => {}); return true; }
  return false;
}
async function platformStep(page, ck) {
  for (let i = 0; i < 80; i++) {
    if (await chunkNow(page) !== ck) return true;
    if (await page.evaluate(ENDED)) return true;
    if (await pressBadges(page)) { await sleep(500); continue; }
    const st = await page.evaluate(WALK.detectKind);
    if (WALK.ACTIONS && WALK.ACTIONS[st.kind]) await WALK.ACTIONS[st.kind](page);
    else if (WALK.MOVES[st.kind]) await page.evaluate(([src]) => (new Function('return (' + src + ')')())(), [String(WALK.MOVES[st.kind])]);
    await sleep(WALK.SETTLE[st.kind] || 700);
  }
  return false;
}

async function walkProto(b, size) {
  const ctx = await b.newContext({ viewport: { width: size[0], height: size[1] } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await page.goto('file://' + PROTO_PAGE + '?mute=1&fresh=1&speed=' + SP, { waitUntil: 'load' });
  const r = await hour(page, page.mainFrame(), {});
  fs.mkdirSync(OUTROOT, { recursive: true }); fs.writeFileSync(path.join(OUTROOT, "proto-" + MODE + "-" + size.join("x") + ".screens.txt"), r.log.join("\n") + "\n");
  console.log('  ' + r.log.length + ' screens, story ' + ((r.data.now || 0) / 60).toFixed(1) + ' min, keys ' + r.data.keys);
  judgeWalk(r, size);
  must(errs.length === 0, 'no page errors (' + size.join('×') + ')' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await ctx.close();
}

async function walkLesson(b, size) {
  const OUT = path.join(OUTROOT, MODE + '-' + size.join('x')); fs.mkdirSync(OUT, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: size[0], height: size[1] } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  page.on('frameattached', f => f.on && f.on('pageerror', e => errs.push('frame: ' + e)));
  const walked = [];
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2000);
    await WALK.primeDevKeys(page, BASE).catch(() => {});
    await seed(page);
    await page.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2200);
    await page.evaluate(() => { const s = document.querySelector('.intro-skip'); if (s) s.click(); }); await sleep(600);
    const tile = await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.tile')).find(e => /Lesson\s*5(?!\d)/i.test(e.textContent)); if (!t) return null; const s = t.querySelector('.tile-story'); const txt = t.textContent.replace(/\s+/g, ' ').trim(); t.click(); return { txt, story: s ? s.textContent.trim() : '' }; });
    must(!!tile && /Loop Machines/i.test(tile.txt), 'the Lesson 5 tile is Loop Machines (' + (tile && tile.txt) + ')');
    must(!!tile && tile.story === 'The Search', 'the Lesson 5 card shows "The Search" as its story title (§16)');
    if (!tile) throw new Error('no Lesson 5 tile');
    await sleep(2500);
    for (let guard = 0; guard < 24; guard++) {
      const ck = await chunkNow(page); if (!ck) break;
      if (await page.evaluate(ENDED)) break;
      if (walked[walked.length - 1] !== ck) walked.push(ck);
      console.log('  … ' + ck);
      let ok;
      if (ck === 'search' || ck === 'flight') {
        const fr = await frameReady(page); if (!fr) { must(false, 'the ' + ck + ' frame loads the hour'); break; }
        const r = await hour(page, fr, { shots: OUT, left: async () => (await chunkNow(page)) !== ck || !!(await page.evaluate(ENDED)), free: freeFlight });
        if (ck === 'search') { console.log('  ' + r.screens.length + ' screens, story ' + ((r.data.now || 0) / 60).toFixed(1) + ' min'); judgeWalk(r, size); }
        ok = !r.stuck;
      } else ok = await platformStep(page, ck);
      if (!ok && await page.evaluate(ENDED)) break;
      if (!ok) { must(false, 'the walk could not leave ' + ck); await page.screenshot({ path: path.join(OUT, 'stuck-' + ck + '.png') }); break; }
      for (let t = 0; t < 30 && await chunkNow(page) === ck && !(await page.evaluate(ENDED)); t++) { await pressBadges(page); await sleep(300); }
    }
    const end = await page.evaluate(() => { const d = document.querySelector('.badge-pop-card.finish') || document.querySelector('.exit-done, .se-done'); return d ? d.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : null; });
    must(!!end, 'the lesson reaches its done card (' + end + ')');
    must(['search', 'exit', 'close'].every(c => walked.includes(c)), 'the walk went through search, exit and close (' + walked.join(' ') + ')');
    must(Object.keys(badgeSeen).length === 3, 'three badge cards on the way (' + Object.keys(badgeSeen).join(', ') + ')');
    await page.screenshot({ path: path.join(OUT, 'done.png') });
  } catch (e) { must(false, 'the walk stopped: ' + e.message.split('\n')[0]); }
  must(errs.length === 0, 'no page errors (' + size.join('×') + ')' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await ctx.close();
}

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const size of SIZES) { console.log('— ' + size.join('×') + ' · ' + MODE + (PROTO ? ' · design page' : '')); if (PROTO) await walkProto(b, size); else await walkLesson(b, size); }
  await b.close();
  console.log('\nj2l5-walk: ' + checks + ' checks, ' + FAILS.length + ' failed.');
  if (EXPECT_FAIL) { console.log(FAILS.length ? 'CONTROL OK: the walk fails when a screen is missed.' : 'CONTROL BROKEN: the walk passed with a screen missed.'); process.exit(FAILS.length ? 0 : 1); }
  process.exit(FAILS.length ? 1 : 0);
})();
