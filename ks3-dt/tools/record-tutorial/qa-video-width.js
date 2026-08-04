/* qa-video-width.js - a re-watch must never be smaller than the first watch.
 *
 * DAMIEN, 1 Aug 2026 (DFM 127): "the pupil video player window should be a bit
 * bigger" - the lesson video CARD was widened.
 * DAMIEN, 3 Aug 2026: the POPUP was missed. "the window playing the video is not
 * as wide as it is the first time it is played and it needs to be (on all cases
 * of rewatching). on that note, that wider view that we worked on for video
 * tutorials needs to be in place across ALL lessons, including ones that still
 * need to be built, so ensure that guard or harness is there."
 *
 * This is that guard. It measures the REAL rendered <video> in a real browser:
 *   - the lesson's own video card (the first watch)
 *   - the film popup (every re-watch, on every ladder screen)
 *   - the step-card "Show me how" clip popup
 * and fails if any popup player is narrower than the card. The classes measured
 * are shared by every lesson, so a lesson built next year inherits the guarantee
 * without anyone remembering this conversation.
 *
 * Needs the static server on 8096 (config digital-skills-l4).
 *   node qa-video-width.js
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* the widths a pupil could be sitting at; the rule must hold at every one */
const VIEWPORTS = [{ w: 1440, h: 900 }, { w: 1280, h: 800 }, { w: 1024, h: 768 }];

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}

/* Mount the two players straight from real lesson content and measure them.
   Mounting rather than walking the hour keeps this fast and viewport-repeatable. */
async function measure(page) {
  return page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const l2 = await (await fetch('/ks3-dt/content/j1/lessons/j1-02.json')).json();
    const l1 = await (await fetch('/ks3-dt/content/j1/lessons/j1-01.json')).json();
    const film = l2.chunks.find(c => c.engine === 'video');
    const ladder = l2.chunks.find(c => c.engine === 'ladder');
    const vault = l1.chunks.find(c => c.id === 'realvault');

    document.body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:20px';
    const host = document.createElement('div');
    host.className = 'chunk-host'; host.id = 'chunk-host';
    wrap.appendChild(host); document.body.appendChild(wrap);

    /* 1. the FIRST watch: the lesson's own video card */
    window.Engines.video.mount(host, film, {});
    await sleep(350);
    const card = host.querySelector('video').getBoundingClientRect().width;

    /* 2. every RE-watch: the ladder's film popup */
    host.innerHTML = '';
    window.Engines.ladder.mount(host, ladder, { draft: {}, catchup: false, review: true, chunk: ladder });
    await sleep(400);
    const fb = host.querySelector('.rung-film-btn');
    if (fb) fb.click();
    await sleep(400);
    const popEl = document.querySelector('.film-modal video');
    const pop = popEl ? popEl.getBoundingClientRect().width : 0;
    const ov = document.querySelector('.film-modal'); if (ov) ov.remove();

    /* 3. the step-card "Show me how" clip */
    host.innerHTML = '';
    window.Engines.steps.mount(host, vault, {});
    await sleep(350);
    const start = Array.from(host.querySelectorAll('button')).find(b => /start/i.test(b.textContent || ''));
    if (start) start.click();
    await sleep(500);
    const cb = host.querySelector('.step-clip-btn');
    if (cb) cb.click();
    await sleep(450);
    const clipEl = document.querySelector('.film-modal video');
    const clip = clipEl ? clipEl.getBoundingClientRect().width : 0;
    const ov2 = document.querySelector('.film-modal'); if (ov2) ov2.remove();

    return { card: Math.round(card), pop: Math.round(pop), clip: Math.round(clip) };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const v of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await sleep(2200);
    const m = await measure(page);
    console.log('\n== at ' + v.w + 'x' + v.h + ' == card ' + m.card + 'px | re-watch ' + m.pop + 'px | clip ' + m.clip + 'px');
    check(m.card > 0 && m.pop > 0 && m.clip > 0, 'all three players rendered and were measurable');
    check(m.pop >= m.card,
      'the RE-WATCH player is at least as wide as the first watch (' + m.pop + ' >= ' + m.card + ')');
    check(m.clip >= m.card,
      'the "Show me how" clip is at least as wide as the first watch (' + m.clip + ' >= ' + m.card + ')');
    check(m.pop <= v.w && m.clip <= v.w, 'and neither overflows the screen');
    await page.close();
  }

  /* CONTROL: the pre-fix rule (880px cap) must FAIL the same comparison, or the
     check above could pass on any stylesheet at all. */
  console.log('\n== CONTROL: the pre-fix 880px popup must fail this ==');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.addStyleTag({ content: '.ols-modal-film { max-width: min(880px, 94vw) !important; }' });
  const pre = await measure(page);
  check(pre.pop < pre.card,
    'pre-fix: the re-watch really was narrower than the first watch (' + pre.pop + ' < ' + pre.card + ')');
  await page.close();

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL VIDEO-WIDTH CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
