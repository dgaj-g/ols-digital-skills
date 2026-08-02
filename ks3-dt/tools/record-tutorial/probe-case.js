/* Diagnostic: why does the L4 case-close gate not arm for the driver? */
const { chromium } = require('./node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = 'http://localhost:8121/ks3-dt/platform/index.html?class=Demo-8A&as=anya';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1','2','3','4','5','S1']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(700);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => e.textContent.includes('The Broken Game'));
    t.click();
  });
  await sleep(2600);

  // blast through do-now + hook + board intro to reach the case board
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => {
      const q = s => document.querySelector(s);
      if (q('.case-tab')) return 'board';
      if (q('.q-feedback button') && q('.q-feedback button').offsetParent) { q('.q-feedback button').click(); return 'qnext'; }
      if (q('.q-opt:not(:disabled)')) { document.querySelectorAll('.q-opt:not(:disabled)')[0].click(); return 'qopt'; }
      if (q('.dossier-cta') && q('.dossier-cta').offsetParent) { q('.dossier-cta').click(); return 'cta'; }
      const host = q('.chunk-host');
      const b = host && Array.from(host.querySelectorAll('button')).filter(x => x.offsetParent && !x.disabled);
      if (b && b.length) { (b.find(x => x.classList.contains('primary-btn')) || b[0]).click(); return 'btn'; }
      return 'wait';
    });
    if (st === 'board') break;
    await sleep(650);
  }

  // open the training case
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.case-tab'));
    tabs[0].click();
  });
  await sleep(900);

  const before = await page.evaluate(() => {
    const ta = document.querySelector('.case-log-input');
    const btn = document.querySelector('.case-close-btn');
    return { hasTa: !!ta, taValue: ta && ta.value, btnDisabled: btn && btn.disabled,
      visibleButtons: Array.from(document.querySelectorAll('.chunk-host button'))
        .filter(b => b.offsetParent && !b.disabled).map(b => b.textContent.trim().slice(0, 40)) };
  });
  console.log('BEFORE FILL:', JSON.stringify(before, null, 1));

  const after = await page.evaluate(() => {
    const ta = document.querySelector('.case-log-input');
    ta.value = 'The right-arrow script had no hat block at the top, so it never started. I added the when right arrow key pressed event trigger.';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    const btn = document.querySelector('.case-close-btn');
    const nudge = document.querySelector('.case-log-nudge');
    return { btnDisabled: btn.disabled, nudge: nudge.textContent, btnClasses: btn.className };
  });
  console.log('AFTER FILL:', JSON.stringify(after, null, 1));

  if (!after.btnDisabled) {
    await page.evaluate(() => document.querySelector('.case-close-btn').click());
    await sleep(2200);
    const closed = await page.evaluate(() => ({
      stamp: !!document.querySelector('.case-stamp'),
      view: document.querySelector('.chunk-host').textContent.slice(0, 120)
    }));
    console.log('AFTER CLOSE CLICK:', JSON.stringify(closed));
  }
  await browser.close();
})().catch(e => { console.error('CRASH', e); process.exit(1); });
