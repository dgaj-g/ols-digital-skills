/* qa-l2-packup.js - the end-of-lesson "switch your micro:bit off" card.
 *
 * DAMIEN, 8 Aug 2026: "the need for the pupils to hold down the wee black button
 * at the back of their micro:bit at the end of the lesson ... one image of the
 * back of a microbit (v2) ... annotation that points to the black button ...
 * before the evaluation i think."
 *
 * Two things this guards, and the second is the one that would embarrass us on
 * the day:
 *   1. the card is where he asked for it, and says what the button REALLY does.
 *      Holding reset POWERS THE MICRO:BIT OFF - it does not wipe the program
 *      (micro:bit's own docs: there is no button combination that erases; you
 *      erase by flashing a different program). So the card must never claim a
 *      wipe, and it must not promise the light simply "goes out" either - on USB
 *      power it fades and then BLINKS, which is exactly the kind of half-true
 *      sentence rule 35 exists to stop.
 *   2. the photograph actually LOADS. A card whose whole job is to show her a
 *      small black button is worthless if the image 404s, and nothing else in
 *      the fleet would notice.
 *
 * It also holds the shared `steps` engine steady: `lines`, `img` and `note` are
 * new and OPTIONAL, so a step that has none of them must render exactly as
 * before (Lesson 1's Real Vault and the side quest both use this engine).
 *
 * Needs the static server on 8096 (config digital-skills-l4).
 *   node qa-l2-packup.js
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}

/* mount a steps chunk from real content and step past its intro card */
async function mountSteps(page, lessonFile, chunkId) {
  return page.evaluate(async (args) => {
    const [file, id] = args;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const lesson = await (await fetch('/ks3-dt/content/j1/lessons/' + file)).json();
    const chunk = lesson.chunks.find(c => c.id === id);
    if (!chunk) return { error: 'no chunk ' + id };
    document.body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:22px;max-width:820px;margin:0 auto';
    const host = document.createElement('div');
    host.className = 'chunk-host'; host.id = 'chunk-host';
    wrap.appendChild(host); document.body.appendChild(wrap);
    window.__done = false;
    window.Engines.steps.mount(host, chunk, {
      draft: {}, review: false, chunk,
      saveEvent() {}, next() { window.__done = true; },
      markItem: () => Promise.resolve({ ok: true })
    });
    await sleep(420);
    const cta = host.querySelector('button.primary-btn');
    if (cta) cta.click();
    await sleep(650);
    return { ok: true, order: lesson.chunks.map(c => c.id) };
  }, [lessonFile, chunkId]);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2200);

  const mounted = await mountSteps(page, 'j1-02.json', 'packup');
  check(!mounted.error, 'the pack-up chunk exists in Lesson 2');

  /* ---------- where he asked for it ---------- */
  console.log('\n== placement ==');
  const order = mounted.order || [];
  check(order.indexOf('packup') === order.indexOf('selfeval') - 1,
    'it sits immediately BEFORE the evaluation, as he asked (' + order.join(' > ') + ')');

  /* ---------- what it says ---------- */
  const card = await page.evaluate(() => {
    const t = s => { const e = document.querySelector(s); return e ? e.textContent.trim() : ''; };
    return {
      title: t('.step-head h2'),
      text: t('.step-text'),
      lines: Array.from(document.querySelectorAll('.step-lines li')).map(li => li.textContent.trim()),
      listTag: document.querySelector('.step-lines') ? document.querySelector('.step-lines').tagName : '',
      cap: t('.step-fig figcaption'),
      note: t('.step-note'),
      confirm: t('.confirm-step')
    };
  });
  const all = (card.title + ' ' + card.text + ' ' + card.lines.join(' ') + ' ' + card.note).toLowerCase();

  console.log('\n== what the card claims ==');
  check(card.lines.length >= 3, 'the actions are a NUMBERED list, not prose (' + card.lines.length + ' steps)');
  check(card.listTag === 'OL', 'and it really is an ordered list (' + card.listTag + ')');
  /* THE FACT CHECK: holding reset powers off; it does NOT erase. */
  check(!/wipe|erase|delete[sd]? your program|clears? the program/.test(all),
    'it never claims the button wipes or erases the program');
  check(/switch(es)? .*off|stops? running/.test(all), 'it says what the button DOES: switches it off / stops the program');
  check(/still on the micro:bit|nothing you built today is lost/i.test(card.note),
    'and it reassures her that her program is not lost');
  /* the light: true on BOTH power routes, or it is a half-truth on USB */
  check(/blink|flash/.test(all) && /unplug/.test(all),
    'the light instruction covers the USB case (it blinks) rather than promising it just goes out');
  check(/about 5 seconds|5 seconds/.test(all), 'it gives the real hold time');
  check(!/\btap/.test(all), 'no banned "tap" (DFM 150)');

  /* ---------- the picture must actually load ---------- */
  console.log('\n== the photograph ==');
  const img = await page.evaluate(() => {
    const i = document.querySelector('.step-img');
    if (!i) return null;
    return { src: i.getAttribute('src'), alt: i.getAttribute('alt') || '',
             loaded: i.complete && i.naturalWidth > 0,
             natural: i.naturalWidth + 'x' + i.naturalHeight,
             rendered: Math.round(i.getBoundingClientRect().width) };
  });
  check(!!img, 'the card carries a picture');
  check(img && img.loaded, 'and it genuinely LOADS - not a broken image (' + (img && img.natural) + ')');
  check(img && img.rendered > 200, 'it is big enough to find a small button on (' + (img && img.rendered) + 'px wide)');
  check(img && /reset button/i.test(img.alt), 'it has alt text naming the reset button');
  check(/cc by/i.test(card.cap), 'the caption carries the photographer credit and licence');
  check(/back/i.test(card.cap), 'and says which side of the board she is looking at');

  /* ---------- it completes ---------- */
  console.log('\n== it finishes ==');
  await page.evaluate(() => document.querySelector('.confirm-step').click());
  await sleep(900);
  check(await page.evaluate(() => window.__done === true), 'confirming the step finishes the chunk');

  /* ---------- the shared engine is unharmed ----------
     Lesson 1's Real Vault uses the same engine and has none of the new fields. */
  console.log('\n== the steps engine still behaves for cards without the new fields ==');
  await mountSteps(page, 'j1-01.json', 'realvault');
  const vault = await page.evaluate(() => ({
    hasStep: !!document.querySelector('.step-card'),
    hasText: (document.querySelector('.step-text') || {}).textContent ? true : false,
    lines: document.querySelectorAll('.step-lines').length,
    figs: document.querySelectorAll('.step-fig').length,
    notes: document.querySelectorAll('.step-note').length,
    confirm: !!document.querySelector('.confirm-step, .step-action button')
  }));
  check(vault.hasStep && vault.hasText, 'Lesson 1 Real Vault still renders its step card and text');
  check(vault.lines === 0 && vault.figs === 0 && vault.notes === 0,
    'and grows no empty list, figure or note from the new optional fields');
  check(vault.confirm, 'and still offers its action');

  /* ---------- CONTROL: the fact check must be able to fail ---------- */
  console.log('\n== CONTROL: a card claiming a wipe must be caught ==');
  const ctl = await page.evaluate(() => {
    const p = document.createElement('p');
    p.className = 'step-text';
    p.textContent = 'Holding the button will erase your program from the micro:bit.';
    document.querySelector('.chunk-host').appendChild(p);
    return document.querySelectorAll('.step-text')[1].textContent.toLowerCase();
  });
  check(/wipe|erase/.test(ctl), 'control: the wording check really does spot an "erase" claim');

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL PACK-UP CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
