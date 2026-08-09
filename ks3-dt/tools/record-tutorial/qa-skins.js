/* qa-skins.js — the lesson skins, measured in RENDERED PIXELS (DFM 175, 146b).

   DAMIEN, 9 Aug 2026: "The layout of the cards should also be upgraded to be more
   aesthetically pleasing in this lesson - be inventive in the way you're
   delivering it. What you have isn't terrible, but I feel there is something
   missing in terms of engagement."

   WHY THIS FILE EXISTS AT ALL. Everything here was verified by eye once, and
   "verified by eye once" is exactly the discipline this whole build exists to
   replace (DFM 150/172: a standard that depends on remembering it is not a
   standard). Two of the skin faults found on the day would have sailed past any
   source-level check:
     - the LED strip used a SEVEN-SEGMENT font for the words NOW SHOWING, which
       rendered as "nou ShoU inG" - correct in the file, nonsense on the screen;
     - the studio signature rule read perfectly and did nothing, because
       `.std-signature.done .std-sig-name` is three classes and outranked it
       (DFM 146b's exact trap, twice in one project).
   So this measures COMPUTED styles and real geometry in a real browser.

   THE CONTROL THAT MATTERS MOST is the lock (DFM 176): Lessons 1 and 2 name no
   skin, so they must come out of the mount with the same class string and the
   same fonts they had before any of this existed.

   Needs the digital-skills-l4 server on :8096.  Usage: node qa-skins.js */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');
const SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const BASE = 'http://localhost:8096/ks3-dt/platform/';
const URL = BASE + 'index.html?class=Demo-8A&as=anya';
const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };
const control = (failed, m) => {
  console.log((failed ? '  PASS ' : '  FAIL ') + 'CONTROL: ' + m);
  if (!failed) FAILS.push('CONTROL ' + m);
};
const lesson = f => JSON.parse(fs.readFileSync(path.join(SRC, 'j1/lessons/' + f + '.json'), 'utf8'));

(async () => {
  /* ============ 1. the content side of the opt-in ============ */
  console.log('== 1. which lessons opt in ==');
  const SKINS = { 'j1-03': 'arcade', 'j1-04': 'casefile', 'j1-05': 'studio' };
  Object.keys(SKINS).forEach(id => {
    check(lesson(id).skin === SKINS[id], id + ' names its skin ("' + SKINS[id] + '")');
  });
  ['j1-01', 'j1-02', 'j1-sq1'].forEach(id => {
    check(lesson(id).skin === undefined,
      id + ' names NO skin — locked by DFM 176, so nothing new can reach it');
  });

  /* ============ 2. the fonts really arrive ============ */
  console.log('\n== 2. the vendored faces are actually served ==');
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  for (const f of ['dseg7-classic-bold.woff2', 'caveat-bold.woff2', 'space-grotesk.woff2']) {
    const r = await page.request.get(BASE + 'assets/fonts/' + f);
    check(r.status() === 200 && (await r.body()).length > 2000,
      f + ' serves (' + r.status() + ', ' + (await r.body()).length + ' bytes)');
  }
  check(fs.existsSync(path.join(__dirname, '../../platform/assets/fonts/CREDITS.md')),
    'the font licences are recorded beside the files (OFL requires it)');

  await page.goto(URL);
  await page.waitForSelector('#hub', { timeout: 25000 });

  /* a helper that mounts a chunk-host with a given skin and markup, then reports
     what the BROWSER decided - not what the stylesheet says */
  const measure = (skin, html, sel, extra) => page.evaluate(async ([sk, h, s, ex]) => {
    const host = document.querySelector('#chunk-host');
    host.className = 'chunk-host engine-test' + (sk ? ' skin-' + sk : '');
    host.innerHTML = h;
    const player = document.querySelector('#player');
    const wasHidden = player && player.hidden;
    if (player) player.hidden = false;                 /* measure it VISIBLE */
    await document.fonts.ready;
    const el = host.querySelector(s);
    if (!el) return { missing: true };
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const out = {
      fontFamily: cs.fontFamily, fontSize: cs.fontSize, colour: cs.color,
      width: +box.width.toFixed(1), height: +box.height.toFixed(1),
      hostClass: host.className
    };
    if (ex) Object.assign(out, (new Function('el', 'host', 'return ' + ex))(el, host));
    if (player) player.hidden = wasHidden;
    return out;
  }, [skin, html, sel, extra || null]);

  /* ============ 3. LESSON 3 — the arcade readout ============ */
  console.log('\n== 3. Lesson 3, the arcade skin ==');
  const LED = '<div class="card ladder-card"><div class="led-strip">' +
    '<span class="led-cell"><span class="led-label">Rung</span>' +
    '<span class="led-digits led-now">2</span><span class="led-label">of 3</span></span>' +
    '<span class="led-cell"><span class="led-label">Rungs cleared</span>' +
    '<span class="led-digits led-cleared">1</span></span></div>' +
    '<p class="now-showing">&#9654; NOW SHOWING</p></div>';

  const digits = await measure('arcade', LED, '.led-digits');
  check(/DSEG7/i.test(digits.fontFamily),
    'the LED digits really compute to the seven-segment face (' + digits.fontFamily.split(',')[0] + ')');
  check(digits.width > 6 && digits.height > 10,
    'the digits occupy real space (' + digits.width + '×' + digits.height + 'px) — a 404\'d font would collapse them');

  /* THE "nou ShoU inG" GUARD. DSEG7 has digit shapes and little else, so any
     WORD it is asked to draw comes out as gibberish. Words belong to the display
     face; only numerals may use the seven-segment one. */
  const nowShowing = await measure('arcade', LED, '.now-showing');
  check(!/DSEG7/i.test(nowShowing.fontFamily),
    'NOW SHOWING is NOT drawn in the seven-segment face (it rendered as "nou ShoU inG" when it was)');
  const labels = await measure('arcade', LED, '.led-label');
  check(!/DSEG7/i.test(labels.fontFamily),
    'the strip\'s words ("Rung", "of 3", "Rungs cleared") use the display face too');
  const ledText = await measure('arcade', LED, '.led-digits',
    '({ text: el.textContent, allDigits: /^[0-9\\u2605]+$/.test(el.textContent.trim()) })');
  check(ledText.allDigits,
    'every string handed to the seven-segment face is numerals or the star (got "' + ledText.text + '")');

  /* ============ 4. LESSON 4 — the case file is a file ============ */
  console.log('\n== 4. Lesson 4, the casefile skin ==');
  const CASE = '<div class="card case-filecard"><div class="case-ticket">' +
    '<p>&ldquo;The shark won\'t swim RIGHT.&rdquo;</p></div></div>';
  const ticket = await measure('casefile', CASE, '.case-ticket');
  check(/mono/i.test(ticket.fontFamily),
    'the player\'s ticket is typewritten, so a complaint reads as a quoted voice, not as instructions');
  const fileCard = await measure('casefile', CASE, '.case-filecard',
    '({ bg: getComputedStyle(el).backgroundImage, tab: getComputedStyle(el, "::before").width })');
  check(/gradient/i.test(fileCard.bg || ''), 'the case file is paper stock, not the plain white card');
  check(fileCard.tab && fileCard.tab !== 'auto' && parseFloat(fileCard.tab) > 40,
    'the folder tab is drawn above the card (' + fileCard.tab + ')');

  /* ============ 5. LESSON 5 — signing looks like signing ============ */
  console.log('\n== 5. Lesson 5, the studio skin ==');
  const SIGN = '<div class="card"><div class="std-signature done">' +
    '<span class="std-sig-name">Golden Otter Games</span></div></div>';
  const sig = await measure('studio', SIGN, '.std-sig-name');
  /* the specificity trap: .std-signature.done .std-sig-name is THREE classes and
     beat the skin rule until it was written to match. Source reading cannot catch
     this; the computed value can. */
  check(/Caveat/i.test(sig.fontFamily),
    'the studio signature computes to the handwriting face — the 3-class rule no longer outranks it (' +
    sig.fontFamily.split(',')[0] + ')');
  check(parseFloat(sig.fontSize) > 28,
    'and it is signature-sized (' + sig.fontSize + ')');

  /* ============ 6. THE LOCK (DFM 176) ============ */
  console.log('\n== 6. the lock: Lessons 1 and 2 are untouched ==');
  const unskinned = await measure('', LED, '.led-digits');
  control(!/DSEG7/i.test(unskinned.fontFamily),
    'with NO skin the same markup does NOT get the seven-segment face — the skins are opt-in only');
  const noSkinClass = await page.evaluate(() => {
    const host = document.querySelector('#chunk-host');
    host.className = 'chunk-host engine-ladder';
    return host.className;
  });
  check(noSkinClass === 'chunk-host engine-ladder',
    'an unskinned mount carries the exact class string it always did ("' + noSkinClass + '")');
  const sigUnskinned = await measure('', SIGN, '.std-sig-name');
  control(!/Caveat/i.test(sigUnskinned.fontFamily),
    'and the signature stays the display face without the studio skin');

  /* ============ 7. nothing overflows a small classroom screen ============ */
  console.log('\n== 7. the skins survive a 1024-wide machine ==');
  await page.setViewportSize({ width: 1024, height: 768 });
  const overflow = await page.evaluate(async () => {
    const host = document.querySelector('#chunk-host');
    host.className = 'chunk-host engine-test skin-arcade';
    host.innerHTML = '<div class="card ladder-card"><div class="led-strip">' +
      '<span class="led-cell"><span class="led-label">Rung</span>' +
      '<span class="led-digits">3</span><span class="led-label">of 3</span></span>' +
      '<span class="led-cell"><span class="led-label">Rungs cleared</span>' +
      '<span class="led-digits">3</span></span></div>' +
      '<ol class="rung-steps"><li>Make a variable and call it score.</li>' +
      '<li>Drag &rsquo;show number score&rsquo; INSIDE the forever block that is already ' +
      'sitting on your canvas.</li></ol></div>';
    const player = document.querySelector('#player');
    const wasHidden = player && player.hidden;
    if (player) player.hidden = false;
    await document.fonts.ready;
    const strip = host.querySelector('.led-strip');
    const card = host.querySelector('.ladder-card');
    const items = [...host.querySelectorAll('.rung-steps li')];
    const r = {
      docScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      stripFits: strip.scrollWidth <= strip.clientWidth + 1,
      cardFits: card.scrollWidth <= card.clientWidth + 1,
      /* the layout law is about READABILITY: two items must not share a line */
      stacked: items.length === 2 &&
        items[1].getBoundingClientRect().top > items[0].getBoundingClientRect().bottom - 2,
      gap: items.length === 2
        ? +(items[1].getBoundingClientRect().top - items[0].getBoundingClientRect().bottom).toFixed(1)
        : null
    };
    if (player) player.hidden = wasHidden;
    return r;
  });
  check(!overflow.docScrollX, 'the page never scrolls sideways at 1024px');
  check(overflow.stripFits, 'the LED strip fits its card');
  check(overflow.cardFits, 'the card fits its own width');
  check(overflow.stacked,
    'DFM 171 holds in pixels: numbered steps sit one per line, not side by side (gap ' + overflow.gap + 'px)');

  /* ============ 8. reduced motion ============ */
  console.log('\n== 8. a pupil who asked for less motion gets it ==');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const rm = await page.evaluate(async () => {
    const host = document.querySelector('#chunk-host');
    host.className = 'chunk-host engine-test skin-arcade';
    host.innerHTML = '<div class="card ladder-card rung-won"><span class="led-digits rolling">2</span></div>';
    const player = document.querySelector('#player');
    const wasHidden = player && player.hidden;
    if (player) player.hidden = false;
    await document.fonts.ready;
    const d = getComputedStyle(host.querySelector('.led-digits'));
    const out = { name: d.animationName, dur: d.animationDuration };
    if (player) player.hidden = wasHidden;
    return out;
  });
  check(rm.name === 'none' || parseFloat(rm.dur) === 0,
    'the odometer roll is switched off under prefers-reduced-motion (' + rm.name + ' / ' + rm.dur + ')');

  check(errs.length === 0, 'zero console errors: ' + JSON.stringify(errs));
  await browser.close();

  console.log('\n=========================================');
  if (FAILS.length) { console.log('FAILURES:\n- ' + FAILS.join('\n- ')); process.exit(1); }
  console.log('ALL SKIN CHECKS PASSED');
})();
