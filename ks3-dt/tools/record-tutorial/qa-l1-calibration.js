/* Audit blocker B-09: the Calibration Ping warm-up taught, with feedback, what
 * the sealed Year 8 baseline measured 30 minutes later.
 *
 * The mechanical overlap proof lives in tools/baseline-overlap.js (run in
 * --strict mode below, so this harness fails if any overlap ever comes back).
 * What this adds is the half a static check cannot do: the replacement items
 * are still a real WARM-UP - engaging, instant feedback, nothing scored - and
 * they work in the running platform.
 *
 * Usage: node qa-l1-calibration.js */
const { chromium } = require('./node_modules/playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-j1-audit');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };

(async () => {
  /* ---------- 1. the mechanical proof, re-run ---------- */
  console.log('== mechanical overlap check (tools/baseline-overlap.js --strict) ==');
  let overlapOk = true, overlapOut = '';
  try {
    overlapOut = execFileSync('node',
      [path.join(__dirname, '../baseline-overlap.js'), '--strict'], { encoding: 'utf8' });
  } catch (e) { overlapOk = false; overlapOut = String(e.stdout || e.message); }
  console.log(overlapOut.split('\n').filter(l => /RESULT|pairs compared|OVERLAP|\[/.test(l)).join('\n'));
  check(overlapOk && /ZERO overlap/.test(overlapOut),
    'ZERO overlap between the warm-up and the sealed baseline, on stems, answers, distractors and concept');

  /* ---------- 2. the warm-up is still a warm-up ---------- */
  const lesson = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/lessons/j1-01.json'), 'utf8'));
  const cal = lesson.chunks.find(c => c.id === 'calibration');
  check(cal.minutes === 3, 'the warm-up is still 3 minutes (the hour is unchanged)');
  check(cal.config.items.length === 3, 'still exactly 3 pings');
  check(/nothing here is scored|nothing is scored/i.test(cal.config.intro),
    'the intro still tells her nothing is scored');
  check(cal.config.variant === 'calibration', 'still the feedback-mode calibration variant');
  const stems = cal.config.items.map(i => i.stem);
  check(stems.every(s => s.length < 120), 'every stem is short enough to read in seconds');
  check(cal.config.items.every(i => i.options.length === 4), 'every ping still offers 4 options');
  check(cal.config.items.every(i => lesson.keys[i.id] && lesson.keys[i.id].explain),
    'every ping still has an explanation for the instant feedback');
  check(cal.config.items.every(i => (lesson.keys[i.id].mis || []).filter(Boolean).length >= 3),
    'every ping still carries authored misconception labels for the teacher dashboard');
  /* the replacements point at the PLATFORM, which is what a warm-up is for */
  check(/tap/i.test(stems[0]), 'ping 1 is about the console answering back (self-demonstrating)');
  check(/padlock/i.test(stems[1]), 'ping 2 (the padlock) was safe and is kept');
  check(/\?/.test(stems[2]) && /stuck/i.test(stems[2]), 'ping 3 points at the real ? help button');
  check(!/password|drive|save/i.test(stems.join(' ')),
    'no ping touches passwords, Drive or saving - the three things the baseline measures');

  /* ---------- 3. it works in the running platform ---------- */
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(600);

  console.log('\n== in the platform ==');
  /* the ? button the new ping 3 promises must actually exist and open */
  const helpOk = await page.evaluate(async () => {
    const b = document.querySelector('#help-beacon');
    if (!b || b.hidden) return { exists: false };
    b.click();
    await new Promise(r => setTimeout(r, 400));
    const m = document.querySelector('#help-modal');
    const txt = m ? m.textContent.replace(/\s+/g, ' ') : '';
    const open = !!(m && !m.hidden);          // read BEFORE closing it
    const close = document.querySelector('#help-close'); if (close) close.click();
    return { exists: true, open: open, txt: txt };
  });
  check(helpOk.exists && helpOk.open, 'the ? help beacon exists and opens');
  check(/Re-read/i.test(helpOk.txt) && /partner/i.test(helpOk.txt) && /hand up/i.test(helpOk.txt),
    'and it really gives re-read / ask your partner / hand up, exactly as ping 3 says');

  await page.evaluate(() => Array.from(document.querySelectorAll('.tile')).find(e => /Mission Control|Agent Induction|Lesson 1/i.test(e.textContent)).click());
  await sleep(2200);

  /* walk to the Calibration Ping */
  let onCal = false;
  for (let i = 0; i < 30; i++) {
    const txt = await page.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
    if (/Calibration|answers back/i.test(txt)) {
      const hasOpt = await page.evaluate(() => !!document.querySelector('.chunk-host .q-opt'));
      if (hasOpt) { onCal = true; break; }
    }
    await page.evaluate(() => {
      const h = document.querySelector('.chunk-host'); if (!h) return;
      const cta = h.querySelector('.dossier-cta'); if (cta && !cta.hidden) { cta.click(); return; }
      const sk = h.querySelector('.dossier-skip'); if (sk) { sk.click(); return; }
      const nxt = Array.from(h.querySelectorAll('button')).find(b => /Next|Start|Continue|Begin|Ready|Warm/i.test(b.textContent) && !b.disabled && b.offsetParent);
      if (nxt) nxt.click();
    });
    await sleep(700);
  }
  check(onCal, 'reached the Calibration Ping');
  await page.screenshot({ path: path.join(OUT, 'l1-calibration-ping.png'), fullPage: true });

  const shown = await page.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
  check(/answers back/i.test(shown), 'ping 1 is the new self-demonstrating item');
  check(!/STRONGEST password/i.test(shown), 'the old password ping is gone from the pupil\'s screen');

  /* answer WRONG on purpose: a warm-up must still give instant, kind feedback */
  const before = await page.evaluate(() => window.App.state.xp);
  const fb = await page.evaluate(async () => {
    const opts = Array.from(document.querySelectorAll('.chunk-host .q-opt'));
    const wrong = opts.find(o => !/tells you straight away/i.test(o.textContent));
    wrong.click();
    await new Promise(r => setTimeout(r, 900));
    const h = document.querySelector('.chunk-host');
    return h ? h.textContent.replace(/\s+/g, ' ') : '';
  });
  check(/Not this time|Correct/i.test(fb), 'a tap gets an immediate verdict on screen');
  check(/tells you straight away/i.test(fb), 'and the right answer is revealed, as a warm-up should');
  check(/Licence Exam later stays deliberately silent/i.test(fb),
    'the explanation pre-warns her that the Exam gives no feedback - so its silence never reads as broken');
  await page.screenshot({ path: path.join(OUT, 'l1-calibration-feedback.png'), fullPage: true });

  /* the warm-up must not be scored */
  await sleep(600);
  const after = await page.evaluate(() => window.App.state.xp);
  check(after === before, 'a wrong warm-up answer costs nothing: XP ' + before + ' -> ' + after);

  const realErrs = errs.filter(e => !/tutorial|\.mp4|poster/.test(e));
  check(realErrs.length === 0, 'zero console errors: ' + JSON.stringify(realErrs.slice(0, 3)));

  console.log('\n' + (FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL CALIBRATION CHECKS PASSED'));
  await browser.close();
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error('QA CRASHED:', e.message); process.exit(1); });
