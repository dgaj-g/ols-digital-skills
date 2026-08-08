/* qa-comment-limit.js - the private comment box tells the truth about its size.
 *
 * DAMIEN, 8 Aug 2026, asking a simple question about the staff Live tab: "if the
 * student wrote an extended piece of text feedback in their private comment,
 * will hovering over it definitely display the full text."
 *
 * Checking the answer found a real fault at the OTHER end. The box accepted 80
 * characters; both servers stored only the first 60 (slice(0, 60)). So the hover
 * always did show everything that was STORED - but a pupil who filled the box
 * lost her last twenty characters before storage, silently, on the one screen
 * that promises her words go to her teacher (DFM 157a).
 *
 * THE LAW THIS PINS: a limit that lives in two places is a contract. Harness the
 * places EQUAL, or one of them is lying. Section A is that contract; it needs no
 * browser and will fail the moment the three numbers drift apart again.
 *
 *   node qa-comment-limit.js        (needs the dev server on :8096)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../..');
const P = f => path.join(ROOT, 'ks3-dt/platform', f);
const PREFIX_REF = process.env.KS3DT_COMMENT_PREFIX_REF || 'b21e997';
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=QA-Comment';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* the three places the limit lives */
function boxMax(src) {
  const m = /var SE_COMMENT_MAX = (\d+)/.exec(src);
  if (m) return Number(m[1]);
  const legacy = /class="se-comment" maxlength="(\d+)"/.exec(src);
  return legacy ? Number(legacy[1]) : null;
}
function serverMax(src) {
  const m = /a\[8\] = str_\(se\.comment \|\| ''\)\.slice\(0, (\d+)\)/.exec(src);
  return m ? Number(m[1]) : null;
}
function atPrefix(rel) {
  try {
    return execFileSync('git', ['show', PREFIX_REF + ':ks3-dt/platform/' + rel], { cwd: ROOT, encoding: 'utf8' });
  } catch (e) { return null; }
}

const engines = fs.readFileSync(P('engines.js'), 'utf8');
const server = fs.readFileSync(P('server/Code.gs.template'), 'utf8');
const dev = fs.readFileSync(P('dev-server.js'), 'utf8');

section('A. THE CONTRACT - the box and both servers agree on one number');
const box = boxMax(engines), live = serverMax(server), preview = serverMax(dev);
check(box !== null && live !== null && preview !== null,
  'all three limits were found (box ' + box + ', live server ' + live + ', preview server ' + preview + ')');
check(box === live, 'the box accepts exactly what the live server keeps (' + box + ' = ' + live + ')');
check(box === preview, 'and exactly what the preview server keeps (' + box + ' = ' + preview + ')');
check(/class="se-comment" maxlength="' \+ SE_COMMENT_MAX \+ '"/.test(engines),
  'the box gets its limit from the one named constant, not a second hard-coded number');

section('B. CONTROL - the pre-fix source must FAIL that contract');
const oldEngines = atPrefix('engines.js');
if (!oldEngines) {
  check(false, 'could not read the pre-fix commit ' + PREFIX_REF + ' - the control cannot run');
} else {
  const oldBox = boxMax(oldEngines);
  check(oldBox === 80 && live === 60,
    'pre-fix: the box accepted 80 while the server kept 60 - a full box lost a fifth of what she wrote');
  check(oldBox !== live, 'so the contract check would have caught it the day it was written');
}

section('C. THE COUNTDOWN EXISTS AND IS ANNOUNCED');
check(/class="se-count" aria-live="polite"/.test(engines),
  'the counter is a live region, so a screen reader announces it changing');
check(/The box is full/.test(engines), 'and there is a full-box message');

/* ---------------- the real box, in a real browser ---------------- */
function stageInPage() {
  const CLS = 'QA-Comment', STAFF = 'teacher@demo';
  const EPOCH = 1767225600000;
  const tmin = Math.floor((Date.now() - EPOCH) / 60000);
  const s = {
    passcode: 'demo',
    classes: [{ name: CLS, owner: STAFF, year: 'j1', created: new Date(Date.now() - 7 * 864e5).toISOString() }],
    locks: {}, hods: [], cfg: {}, team: {}, pupils: {}, userProps: {}
  };
  s.locks[CLS] = { '1': { u: tmin - 1440, on: 1 }, '2': { u: tmin - 60, on: 1 } };
  localStorage.setItem('ks3dt-dev', JSON.stringify(s));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(stageInPage);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);

  /* Mount the self-eval card directly: this harness is about the box, not about
     walking a whole lesson (qa-l5 does that). The engine is the shipped one. */
  const mounted = await page.evaluate(async () => {
    const lesson = await App.fetchContent('j1/lessons/j1-02.json');
    const chunk = (lesson.chunks || []).filter(c => c.engine === 'selfeval')[0];
    const host = document.createElement('div');
    host.id = 'qa-se-host';
    document.body.appendChild(host);
    Engines.selfeval.mount(host, chunk, { next: function () {}, saveEvent: function () {}, review: false });
    return !!host.querySelector('.se-comment');
  });
  check(mounted, 'the real How did it go? card mounted with its comment box');

  section('D. THE BOX IN A REAL BROWSER');
  const start = await page.evaluate(() => ({
    max: Number(document.querySelector('.se-comment').getAttribute('maxlength')),
    counter: document.querySelector('.se-count').textContent.trim(),
    px: parseFloat(getComputedStyle(document.querySelector('.se-count')).fontSize)
  }));
  check(start.max === box, 'the rendered box carries the agreed limit (' + start.max + ')');
  check(/^60 characters left$/.test(start.counter),
    'and says how much room she has before she types a word: "' + start.counter + '"');
  check(start.px >= 12, 'the counter is readable at ' + start.px + 'px, not fine print');

  const typed10 = await page.evaluate(async () => {
    const el = document.querySelector('.se-comment');
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.value = 'abcdefghij';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return document.querySelector('.se-count').textContent.trim();
  });
  check(/^50 characters left$/.test(typed10), 'it counts down as she types: "' + typed10 + '"');

  /* type 70 characters through the real keyboard, so maxlength does the work */
  const full = await page.evaluate(async () => {
    const el = document.querySelector('.se-comment');
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  check(full, 'box cleared for the overflow test');
  await page.click('.se-comment');
  await page.type('.se-comment', 'x'.repeat(70), { delay: 0 });
  const atLimit = await page.evaluate(() => {
    const el = document.querySelector('.se-comment');
    const c = document.querySelector('.se-count');
    return { len: el.value.length, counter: c.textContent.trim(), color: getComputedStyle(c).color, full: c.classList.contains('is-full') };
  });
  check(atLimit.len === 60, 'typing seventy characters leaves exactly sixty - the box stops her itself (' + atLimit.len + ')');
  check(/^The box is full — 0 characters left\.$/.test(atLimit.counter),
    'and it says so plainly: "' + atLimit.counter + '"');
  check(atLimit.full && atLimit.color === 'rgb(138, 109, 0)',
    'the full message turns amber, not the ordinary muted grey (' + atLimit.color + ')');

  section('E. END TO END - sixty characters survive to the teacher’s hover');
  /* exactly sixty, so the claim in the check below is literally true */
  const sixty = ('I did not understand the bit where we flashed the code onto it' + ' '.repeat(60)).slice(0, 60);
  check(sixty.length === 60, 'the test comment really is sixty characters long');
  const stored = await page.evaluate((text) => {
    /* the app's own submit path, exactly as the pupil's Send & finish uses it
       (it carries a 0-5s jitter by design, so this waits for the real reply) */
    App.state.lesson = { id: 'j1-02' };
    return new Promise((resolve) => {
      App.submitExit({ answers: [0, 0], selfEval: { conf: '210', diff: '1', comment: text } }, function () {
        const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
        const key = Object.keys(db.pupils || {}).filter(k => /^QA-Comment:/.test(k))[0];
        const rec = key ? db.pupils[key] : null;
        resolve(rec && rec.L && rec.L['2'] ? rec.L['2'][8] : null);
      });
    });
  }, sixty);
  check(stored === sixty,
    'every one of the sixty characters she typed is exactly what the server kept (' + (stored || '').length + ' chars stored)');

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL COMMENT-LIMIT CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
