/* shoot-l1-brief.js - re-capture the Lesson 1 brief screenshots whose cards changed.
 *
 * DAMIEN, 3 Aug 2026: the warm-up stem and the Badge 1 password card were both
 * reworded today, so the brief's images stopped showing what pupils will see.
 * Rule 17 (every factual claim matches the built lesson) applies to the pictures
 * as much as the prose, and rule 36 makes the screenshots the most important
 * part of the brief.
 *
 * Needs the static server on 8096 (config digital-skills-l4).
 *   node shoot-l1-brief.js
 */
const path = require('path');
const { chromium } = require('playwright');

const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=';
const OUT = path.resolve(__dirname, '../../platform/assets/img/brief/j1-01');
const VIEW = { width: 1000, height: 769 };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* The shell arms every button with a 350ms mount guard (DFM 104), so a click
   fired the instant a button appears is deliberately swallowed. Wait past the
   guard, click, then CONFIRM something actually changed before moving on. */
async function clickText(page, re, timeout, settled) {
  const end = Date.now() + (timeout || 20000);
  let sawButton = false;
  while (Date.now() < end) {
    const visible = await page.evaluate((src) => {
      const rx = new RegExp(src, 'i');
      return !!Array.from(document.querySelectorAll('#chunk-host button'))
        .find(x => rx.test(x.textContent || '') && !x.disabled && x.offsetParent !== null);
    }, re.source);
    if (visible) {
      sawButton = true;
      await sleep(600);                       // past the mount guard
      await page.evaluate((src) => {
        const rx = new RegExp(src, 'i');
        const b = Array.from(document.querySelectorAll('#chunk-host button'))
          .find(x => rx.test(x.textContent || '') && !x.disabled && x.offsetParent !== null);
        if (b) b.click();
      }, re.source);
      await sleep(1500);
      if (!settled || await settled()) return true;
    }
    await sleep(400);
  }
  throw new Error(sawButton
    ? 'button ' + re + ' was clicked but nothing advanced'
    : 'no button matching ' + re + ' appeared');
}

/* the local preview shim stamps a PREVIEW pill and a not-marked banner on the
   page. They are artefacts of previewing, not things a pupil ever sees, so they
   come off before the shutter - the same strip scenes/guide.js does for filming. */
async function stripPreviewChrome(page) {
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('body > div, body > span')).forEach(d => {
      const t = (d.textContent || '').trim();
      if (d.id === 'ks3dt-nokeys' || /^PREVIEW\s*[·\-—]/.test(t) || /^PREVIEW\s*—/.test(t)) d.remove();
    });
  });
}

async function chunkId(page) {
  return page.evaluate(() => {
    const s = window.App && window.App.state;
    return s && s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : '(none)';
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEW });
  await page.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  // same staging as sit-review.js: lesson 1 delivered, pairing off
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks['Demo-8A']['1'] = { u: now, on: 1 };
    db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: 0 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(800);

  await page.evaluate(() => {
    const tile = Array.from(document.querySelectorAll('.tile')).find(e => /Mission Control/.test(e.textContent));
    if (tile) tile.click();
  });
  await sleep(3000);
  console.log('chunk after open:', await chunkId(page));

  // briefing -> warm-up (the typed welcome has to finish before the CTA appears)
  await clickText(page, /start the lesson|continue/i, 60000,
    async () => (await chunkId(page)) === 'calibration');
  await sleep(1800);
  const ck = await chunkId(page);
  console.log('chunk now:', ck);
  if (ck !== 'calibration') throw new Error('expected the warm-up, got ' + ck);
  // the items engine opens on its own intro card - step past it to question 1
  await clickText(page, /start|go|begin/i, 20000, async () =>
    /click an answer/i.test(await page.evaluate(() => document.querySelector('#chunk-host').textContent || '')));
  await sleep(1200);
  const stem = await page.evaluate(() => {
    const h = document.querySelector('#chunk-host h2');
    return h ? h.textContent.trim() : '(none)';
  });
  console.log('stem on screen:', stem);
  if (!/click an answer/i.test(stem)) throw new Error('warm-up shows the OLD stem: ' + stem);
  await stripPreviewChrome(page);
  await page.screenshot({ path: path.join(OUT, '03-warmup.png') });
  console.log('shot 03-warmup.png');

  // answer the three warm-up questions to reach Badge 1
  for (let q = 0; q < 3; q++) {
    await sleep(900);
    await page.evaluate(() => {
      const o = Array.from(document.querySelectorAll('#chunk-host .opt, #chunk-host .option, #chunk-host button'))
        .filter(x => x.offsetParent !== null && /^[A-D]/.test((x.textContent || '').trim()));
      if (o.length) o[0].click();
    });
    await sleep(1400);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('#chunk-host button'))
        .find(x => /next|continue|finish/i.test(x.textContent || '') && !x.disabled && x.offsetParent !== null);
      if (b) b.click();
    });
  }
  await sleep(2200);
  console.log('chunk now:', await chunkId(page));

  // Badge 1 intro -> step 1 (the password card he reworded)
  await clickText(page, /^start$/i, 25000);
  await sleep(1600);
  const title = await page.evaluate(() => {
    const h = document.querySelector('#chunk-host h2');
    return h ? h.textContent : '(none)';
  });
  console.log('card on screen:', title);
  if (!/never share/i.test(title)) throw new Error('expected the password card, got: ' + title);
  await stripPreviewChrome(page);
  await page.screenshot({ path: path.join(OUT, '04-badge1-card.png') });
  console.log('shot 04-badge1-card.png');

  await browser.close();
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
