/* QA gate for re/exodus-moses — DESIGN_38_SPEC.md §10 tests 2–13.
   Run:  NODE_PATH=$(npm root -g) node tests/qa.js [baseUrl]
   Real mouse (page.mouse) and real touch (CDP Input.dispatchTouchEvent) for the Q A drag.
   Prints PASS/FAIL per line; exits 1 on any FAIL. Screenshots → tests/shots/. */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:8117/re/exodus-moses/';
const URL_ = BASE + (BASE.includes('?') ? '&' : '?') + 'nointro';
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

let fails = 0;
function ok(cond, label, extra) { console.log((cond ? 'PASS ' : 'FAIL ') + label + (extra && !cond ? '  — ' + extra : '')); if (!cond) fails++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fresh(page, w, h) {
  await page.setViewport({ width: w || 1280, height: h || 900, deviceScaleFactor: 1 });
  await page.goto('about:blank');
  await page.goto(URL_, { waitUntil: 'networkidle0' });
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(URL_, { waitUntil: 'networkidle0' });
}
async function reload(page) { await page.goto(URL_, { waitUntil: 'networkidle0' }); await sleep(100); }
async function begin(page, name, cls) {
  await page.type('#name', name);
  if (cls) await page.type('#cls', cls);
  await page.click('#begin');
  await sleep(350);
}
async function rect(page, sel) { return page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }); }
async function chipRectByText(page, text) {
  return page.evaluate((t) => { const c = [...document.querySelectorAll('.chip')].find((x) => x.textContent.trim() === t); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, text);
}
async function cardRectByDef(page, def) {
  return page.evaluate((d) => { const c = [...document.querySelectorAll('.match-card')].find((x) => x.querySelector('.definition').textContent.trim() === d); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, def);
}
async function placedMap(page) {
  return page.evaluate(() => { const m = {}; document.querySelectorAll('.match-card').forEach((c) => { const chip = c.querySelector('.chip'); m[c.querySelector('.definition').textContent.trim()] = chip ? chip.textContent.trim() : null; }); return m; });
}
async function lampCount(page) { return page.$$eval('.lamp.lit', (l) => l.length); }
async function lampLabel(page) { return page.$eval('#lamps', (e) => e.getAttribute('aria-label')); }

/* real mouse drag: down on chip, moves on the document, up */
async function mouseDrag(page, from, to, opts = {}) {
  const steps = opts.steps || 12;
  await page.mouse.move(from.cx, from.cy);
  await page.mouse.down();
  let tracked = true, lastPos = null;
  for (let i = 1; i <= steps; i++) {
    const x = from.cx + (to.cx - from.cx) * i / steps, y = from.cy + (to.cy - from.cy) * i / steps;
    await page.mouse.move(x, y);
    if (opts.track && i > 1) {
      const r = await page.evaluate(() => { const c = document.querySelector('.chip.dragging'); if (!c) return null; const b = c.getBoundingClientRect(); return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, td: getComputedStyle(c).transitionDuration, an: getComputedStyle(c).animationName }; });
      if (!r) tracked = false;
      else { if (Math.abs(r.cx - x) > 6 || Math.abs(r.cy - y) > 6) tracked = false; if (r.td !== '0s' || r.an !== 'none') tracked = false; if (lastPos && r.cx === lastPos.cx && r.cy === lastPos.cy) tracked = false; lastPos = r; }
    }
  }
  const lock = await page.evaluate(() => document.body.classList.contains('dragging-active'));
  await page.mouse.up();
  await sleep(80);
  const unlock = await page.evaluate(() => !document.body.classList.contains('dragging-active'));
  return { tracked, lock, unlock };
}
/* real touch drag via CDP */
async function touchDrag(page, from, to) {
  const client = await page.createCDPSession();
  const pt = (x, y) => [{ x, y, radiusX: 4, radiusY: 4, force: 1 }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from.cx, from.cy) });
  let tracked = true;
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = from.cx + (to.cx - from.cx) * i / steps, y = from.cy + (to.cy - from.cy) * i / steps;
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x, y) });
    await sleep(30);
    if (i > 1) {
      const r = await page.evaluate(() => { const c = document.querySelector('.chip.dragging'); if (!c) return null; const b = c.getBoundingClientRect(); return { cx: b.left + b.width / 2, cy: b.top + b.height / 2 }; });
      if (!r || Math.abs(r.cx - x) > 6 || Math.abs(r.cy - y) > 6) tracked = false;
    }
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  await sleep(80);
  return { tracked };
}
async function shot(page, name) { await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); }
async function noHScroll(page) { return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); }

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const consoleErrors = [], failedReq = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => failedReq.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) failedReq.push(r.status() + ' ' + r.url()); });

  const vm = require('vm');
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8'), sandbox);
  const C = sandbox.window.EXODUS_CONTENT;
  const QA = C.questions[0];
  const answerMap = {}; QA.pairs.forEach((p) => { answerMap[p.definition] = p.term; });

  /* ---- test 2: load ---- */
  await fresh(page, 1280, 900);
  const fontOk = await page.evaluate(() => document.fonts.check('600 18px "Asap Condensed"'));
  ok(consoleErrors.length === 0, '2 zero console errors', consoleErrors.join(' | '));
  ok(failedReq.length === 0, '2 zero failed requests', failedReq.join(' | '));
  ok(fontOk, '2 Asap Condensed 600 loaded');
  const assetCodes = await page.evaluate(async () => { const urls = ['images/qa-pharaoh-midwives.jpg', 'images/qb-moses-basket.jpg', 'images/qd-burning-bush.jpg', 'images/qe-passover-door.jpg', 'images/qf-final-plague.jpg', 'fonts/asap-condensed-400-latin.woff2', 'fonts/asap-condensed-600-latin.woff2', 'fonts/asap-condensed-700-latin.woff2']; const out = []; for (const u of urls) { const r = await fetch(u); out.push(r.status); } return out; });
  ok(assetCodes.every((c) => c === 200), '2 five images + three woff2 return 200', assetCodes.join(','));

  /* ---- test 3: cover ---- */
  await page.click('#begin'); await sleep(200);
  const missing = await page.$eval('#name-error', (e) => e.textContent.trim());
  ok(missing === C.cover.nameMissing && (await page.$('.cover')) !== null, '3 blank name shows nameMissing and stays on cover', missing);
  await begin(page, 'Test Pupil', '9B');
  const hdrVisible = await page.$eval('#ex-header', (e) => getComputedStyle(e).display !== 'none');
  const stageA = await page.$eval('.stage.current', (e) => e.textContent.trim());
  ok(hdrVisible && (await lampCount(page)) === 0 && stageA === 'A' && (await page.$('.q-a')) !== null, '3 Begin → Question A, header, 0 lamps, stage A current');

  /* ---- test 4: Q A real mouse drag ---- */
  const defs = Object.keys(answerMap);
  const terms = defs.map((d) => answerMap[d]);
  let r = await mouseDrag(page, await chipRectByText(page, terms[0]), await cardRectByDef(page, defs[0]), { track: true });
  let pm = await placedMap(page);
  ok(r.tracked, '4 mouse: chip follows the pointer continuously (no transition/animation mid-drag)');
  ok(r.lock && r.unlock, '4 mouse: selection lock on during drag, off after');
  ok(pm[defs[0]] === terms[0], '4 mouse: drop anywhere on card places the chip', JSON.stringify(pm));
  const checkDisabled1 = await page.$eval('.check-btn', (b) => b.disabled);
  ok(checkDisabled1, '4 Check disabled with one placed');
  /* drop a second chip on the occupied card → swap (first goes back to tray) */
  r = await mouseDrag(page, await chipRectByText(page, terms[1]), await cardRectByDef(page, defs[0]));
  pm = await placedMap(page);
  const trayHas0 = await page.evaluate((t) => [...document.querySelectorAll('.tray .chip')].some((c) => c.textContent.trim() === t), terms[0]);
  ok(pm[defs[0]] === terms[1] && trayHas0, '4 mouse: drop on occupied card swaps (occupant returns to tray)', JSON.stringify(pm));
  /* drag it back to the tray */
  r = await mouseDrag(page, await chipRectByText(page, terms[1]), await rect(page, '.tray'));
  pm = await placedMap(page);
  ok(pm[defs[0]] === null, '4 mouse: chip can be dragged back to the tray', JSON.stringify(pm));
  /* touch: place terms[0] on defs[0] via a finger */
  const t = await touchDrag(page, await chipRectByText(page, terms[0]), await cardRectByDef(page, defs[0]));
  pm = await placedMap(page);
  ok(t.tracked, '4 touch: chip follows the finger continuously');
  ok(pm[defs[0]] === terms[0], '4 touch: finger drop places the chip', JSON.stringify(pm));
  /* touch: card-to-card swap: move terms[0] from defs[0] to defs[1], then place terms[1] on defs[0] */
  await touchDrag(page, await chipRectByText(page, terms[0]), await cardRectByDef(page, defs[1]));
  await mouseDrag(page, await chipRectByText(page, terms[1]), await cardRectByDef(page, defs[0]));
  await mouseDrag(page, await chipRectByText(page, terms[0]), await cardRectByDef(page, defs[0]));   /* swap: terms[1] → defs[1] */
  pm = await placedMap(page);
  ok(pm[defs[0]] === terms[0] && pm[defs[1]] === terms[1], '4 card-to-card drop swaps the two chips', JSON.stringify(pm));
  /* deliberately wrong: terms[2] on defs[1] → swap so terms[1] lands on defs[2] (wrong) */
  await mouseDrag(page, await chipRectByText(page, terms[2]), await cardRectByDef(page, defs[1]));
  pm = await placedMap(page);
  const traySecond = await page.evaluate(() => [...document.querySelectorAll('.tray .chip')].map((c) => c.textContent.trim()));
  await mouseDrag(page, await chipRectByText(page, traySecond[0]), await cardRectByDef(page, defs[2]));
  pm = await placedMap(page);
  const allPlaced = Object.values(pm).every(Boolean);
  const checkEnabled = await page.$eval('.check-btn', (b) => !b.disabled);
  ok(allPlaced && checkEnabled, '4 Check enables only when all three placed', JSON.stringify(pm));
  const expected = defs.filter((d) => pm[d] === answerMap[d]).length;
  ok(expected === 1, '4 one deliberately wrong pair set up (expected marks 1)', 'expected=' + expected + ' ' + JSON.stringify(pm));
  /* zero-knowledge before Check: no aria/title/alt/text names the answer mapping */
  const leak = await page.evaluate(() => { const bad = []; document.querySelectorAll('.match-card').forEach((c) => { ['aria-label', 'title', 'data-answer', 'data-term'].forEach((a) => { if (c.getAttribute(a)) bad.push(a); }); }); if (/correct term/i.test(document.body.innerText)) bad.push('correct-term-text'); return bad; });
  ok(leak.length === 0, '4 no answer in aria/title/DOM before Check', leak.join(','));
  await shot(page, 'qa-before-check-1280');
  await page.click('.check-btn'); await sleep(400);
  ok(!(await page.$('.helper')) && !(await page.$eval('.tray-wrap', (t) => getComputedStyle(t).display !== 'none')), '4 after Check the helper and the empty tray are gone');
  ok(await page.evaluate(() => document.querySelector('.feedback').compareDocumentPosition(document.querySelector('.actions')) & Node.DOCUMENT_POSITION_FOLLOWING), '4 feedback sits above the Next button');
  const marksA = await lampCount(page);
  const wrongCards = await page.$$eval('.match-card.is-wrong', (c) => c.length);
  const rightCards = await page.$$eval('.match-card.is-right', (c) => c.length);
  const stillWrongPlaced = await placedMap(page);
  ok(marksA === expected && wrongCards === 3 - expected && rightCards === expected, '4 after Check marks = number correct; wrong graded ✗ not snapped back', `lamps=${marksA} wrong=${wrongCards} right=${rightCards}`);
  ok(JSON.stringify(stillWrongPlaced) === JSON.stringify(pm), '4 wrong placements stay where the pupil put them');
  const correctLabel = await page.$eval('.match-card.is-wrong .correct-term', (e) => e.textContent);
  ok(/Correct term:/.test(correctLabel), '4 correct term shown under a wrong card after Check');
  ok((await lampLabel(page)) === `Marks so far: ${expected} of 10`, '9 lamp aria-label after Q A', await lampLabel(page));
  await shot(page, 'qa-after-check-1280');
  ok(await page.$eval('.next-btn', (b) => b.textContent.trim()) === C.buttons.next, '4 Check replaced by Next question');

  /* ---- test 5: tap + keyboard alternatives (fresh paper) ---- */
  await fresh(page, 1280, 900); await begin(page, 'Tap Tester');
  await page.click('.tray .chip'); await sleep(80);
  const sel = await page.$eval('.chip.selected', (c) => c.getAttribute('aria-pressed'));
  const firstChip = await page.$eval('.chip.selected', (c) => c.textContent.trim());
  await page.click('.match-card:nth-child(2) .definition'); await sleep(120);
  pm = await placedMap(page);
  const secondDef = await page.$eval('.match-card:nth-child(2) .definition', (e) => e.textContent.trim());
  ok(sel === 'true' && pm[secondDef] === firstChip, '5 tap chip, tap card → placed', JSON.stringify(pm));
  await page.focus('.tray .chip');
  const kbChip = await page.evaluate(() => document.activeElement.textContent.trim());
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await sleep(120);
  pm = await placedMap(page);
  const firstDef = await page.$eval('.match-card:nth-child(1) .definition', (e) => e.textContent.trim());
  ok(pm[firstDef] === kbChip, '5 keyboard Enter/ArrowDown/Enter → placed on first card', JSON.stringify(pm));

  /* ---- test 6: choice shuffle + zero-knowledge; Q B wrong reachable ---- */
  const orders = [];
  for (let i = 0; i < 4; i++) {
    await fresh(page, 1280, 900); await begin(page, 'Shuffle ' + i);
    const sh = await page.evaluate(() => JSON.parse(sessionStorage.getItem('exodus-paper-v1') || 'null'));
    orders.push(sh ? [sh.shuffles.B, sh.shuffles.D, sh.shuffles.E].map((a) => a.join('')).join('|') : 'none');
  }
  ok(new Set(orders).size >= 2, '6 option order differs across fresh loads', orders.join(' ; '));
  await fresh(page, 1280, 900); await begin(page, 'Choice Tester');
  /* answer Q A all wrong via tap for speed: rotate */
  await tapAllRotated(page);
  await page.click('.check-btn'); await sleep(300); await page.click('.next-btn'); await sleep(500);
  ok((await page.$('.q-b')) !== null, '6 arrived at Q B');
  const leakB = await page.evaluate(() => { const bad = []; document.querySelectorAll('.choice').forEach((b) => { ['aria-label', 'title', 'data-correct', 'data-answer'].forEach((a) => { if (b.getAttribute(a)) bad.push(a + '=' + b.getAttribute(a)); }); if (b.className.includes('right') || b.className.includes('correct')) bad.push('class:' + b.className); }); const html = document.querySelector('.choices').outerHTML; if (/correct|answer/i.test(html)) bad.push('html-marker'); return bad; });
  ok(leakB.length === 0, '6 Q B: no correct/answer marker in the choices DOM before Check', leakB.join(','));
  const choiceBefore = await page.$$eval('.choice', (b) => b.map((x) => x.className));
  ok(new Set(choiceBefore).size === 1, '6 Q B: options visually identical before Check', choiceBefore.join(','));
  /* pick a wrong one deliberately */
  const wrongIdx = await page.evaluate((c) => { const correct = c.questions[1].options.find((o) => o.correct).text; const b = [...document.querySelectorAll('.choice')]; return b.findIndex((x) => x.querySelector('.label').textContent.trim() !== correct); }, C);
  await page.click(`.choice:nth-child(${wrongIdx + 1})`); await sleep(80);
  ok(await page.$eval('.check-btn', (b) => !b.disabled), '6 Q B: Check enables after a selection');
  await page.click('.check-btn'); await sleep(400);
  const gradedB = await page.evaluate(() => ({ wrong: document.querySelectorAll('.choice.is-wrong').length, right: document.querySelectorAll('.choice.is-right').length, head: document.querySelector('.feedback-headline').textContent }));
  ok(gradedB.wrong === 1 && gradedB.right === 1 && gradedB.head === C.questions[1].wrong, '6 Q B: wrong graded ✗, correct revealed only after Check', JSON.stringify(gradedB));
  ok((await lampCount(page)) === 0, '9 lamps after wrong Q B = 0');
  await page.click('.next-btn'); await sleep(500);

  /* ---- test 7: Q C write ---- */
  ok((await page.$('.q-c')) !== null, '7 arrived at Q C');
  await page.type('.write-box', 'To protect him.');
  await page.click('.check-btn'); await sleep(400);
  const c1 = await page.evaluate(() => ({ head: document.querySelector('.feedback-headline').textContent, scheme: !!document.querySelector('.scheme'), quote: document.querySelector('.you-wrote blockquote').textContent, cls: document.querySelector('.feedback-panel').className }));
  ok(c1.head === C.questions[2].feedback.intentOnly && c1.scheme && c1.quote === '“To protect him.”' && /part/.test(c1.cls), '7 Q C "To protect him." → 1 mark intentOnly, scheme + quote shown', JSON.stringify(c1));
  ok((await lampCount(page)) === 1, '9 lamps after Q C = 1');
  await shot(page, 'qc-after-check-1280');
  await reload(page);
  const replayed = await page.evaluate(() => ({ q: !!document.querySelector('.q-c'), next: !!document.querySelector('.next-btn'), head: (document.querySelector('.feedback-headline') || {}).textContent, lamps: document.querySelectorAll('.lamp.lit').length, helper: !!document.querySelector('.helper'), ro: document.querySelector('.write-box').readOnly }));
  ok(replayed.q && replayed.next && replayed.head === C.questions[2].feedback.intentOnly && replayed.lamps === 1 && !replayed.helper && replayed.ro, '11 reload between Check and Next restores the marked page with Next', JSON.stringify(replayed));
  /* forward-only: no control returns to an answered question */
  const backControls = await page.evaluate(() => [...document.querySelectorAll('button, a')].filter((b) => /back|previous/i.test(b.textContent)).length + document.querySelectorAll('.stage[onclick], .stage a, .stage button').length);
  ok(backControls === 0, '10 forward-only: no back control');
  await page.click('.next-btn'); await sleep(500);

  /* ---- test 11: reload mid-paper ---- */
  await reload(page);
  const resumed = await page.evaluate(() => ({ q: !!document.querySelector('.q-d'), card: (document.querySelector('.resume-card') || {}).textContent || '', lamps: document.querySelectorAll('.lamp.lit').length, done: document.querySelectorAll('.stage.done').length }));
  ok(resumed.q && resumed.lamps === 1 && resumed.card === C.cover.resumeNotice.replace('{letter}', 'D') && resumed.done === 3, '11 reload after Q C restores Q D, 1 lamp, resume card, 3 stages ticked', JSON.stringify(resumed));
  ok(await page.$$eval('.stage.done', (s) => s.every((x) => x.textContent.trim() === '✓')), '10 answered stages show ✓');

  /* Q D correct via keyboard (arrow to the correct one) */
  const correctD = C.questions[3].options.find((o) => o.correct).text;
  const dIdx = await page.evaluate((t) => [...document.querySelectorAll('.choice')].findIndex((b) => b.querySelector('.label').textContent.trim() === t), correctD);
  await page.click(`.choice:nth-child(${dIdx + 1})`); await page.click('.check-btn'); await sleep(300);
  ok((await lampCount(page)) === 2, '9 lamps after correct Q D = 2');
  await page.click('.next-btn'); await sleep(500);
  /* Q E: NOT emphasised, answer correct */
  const emph = await page.$eval('h2.stem .emph', (e) => e.textContent);
  ok(emph === 'NOT', 'Q E stem emphasises NOT');
  const correctE = C.questions[4].options.find((o) => o.correct).text;
  const eIdx = await page.evaluate((t) => [...document.querySelectorAll('.choice')].findIndex((b) => b.querySelector('.label').textContent.trim() === t), correctE);
  await page.click(`.choice:nth-child(${eIdx + 1})`); await page.click('.check-btn'); await sleep(300);
  ok((await lampCount(page)) === 3, '9 lamps after correct Q E = 3');
  await page.click('.next-btn'); await sleep(500);

  /* ---- test 8: Q F ---- */
  ok((await page.$('.q-f')) !== null, '8 arrived at Q F');
  const inputs = await page.$$('.short-input');
  await inputs[0].type('10'); await inputs[1].type('frogs');
  await page.click('.check-btn'); await sleep(400);
  const f1 = await page.evaluate(() => ({ badges: [...document.querySelectorAll('.short-row .badge')].map((b) => b.textContent), head: document.querySelector('.feedback-headline').textContent, quotes: [...document.querySelectorAll('.you-wrote blockquote')].map((b) => b.textContent) }));
  ok(f1.badges.join('') === '✓✗' && f1.head === '+1 mark' && f1.quotes.join('|') === '“10”|“frogs”', '8 Q F "10"+"frogs" → 1 mark, ✓ on (i), ✗ on (ii)', JSON.stringify(f1));
  ok((await lampCount(page)) === 4, '9 lamps after Q F = 4 (running total)');
  await shot(page, 'qf-after-check-1280');
  ok(await page.$eval('.next-btn', (b) => b.textContent.trim()) === C.buttons.finish, '8 last page button is See my marks');
  await page.click('.next-btn'); await sleep(600);

  /* ---- test 12: results ---- */
  const res = await page.evaluate(() => ({ h1: document.querySelector('.results h1').textContent, vals: [...document.querySelectorAll('.meta-row .v')].map((v) => v.textContent), score: document.querySelector('.score-line').textContent, verdict: document.querySelector('.verdict').textContent, rows: [...document.querySelectorAll('.results-table tr:not(.answer-row) td.marks')].map((t) => t.textContent.trim()), quotes: [...document.querySelectorAll('.results-table .quoted')].map((q) => q.textContent), done: document.querySelectorAll('.stage.done').length, lamps: document.querySelectorAll('.lamp.lit').length }));
  const today = (() => { const d = new Date(); return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getFullYear(); })();
  ok(res.vals[0] === 'Choice Tester' && res.vals[2] === today && res.score === '4 out of 10' && res.verdict === C.results.verdict[0], '12 results name/date/score/verdict', JSON.stringify(res.vals) + ' ' + res.score + ' ' + res.verdict);
  ok(res.rows.map((r) => r.replace(/[✓✗●]\s*/, '')).join(',') === '0 / 3,0 / 1,1 / 2,1 / 1,1 / 1,1 / 2', '12 six rows with the right marks', res.rows.join(','));
  ok(res.quotes.join('|') === 'You wrote: “To protect him.”|You wrote: “10”|You wrote: “frogs”', '12 three quoted answers verbatim', res.quotes.join('|'));
  ok(res.done === 6 && res.lamps === 4, '12 stage strip all ticked, lamps show final total');
  await shot(page, 'results-1280');
  /* reload after finishing → results */
  await reload(page);
  ok((await page.$('.results')) !== null, '11 reload after finishing shows the results scroll');
  /* save as picture */
  const cdp = await page.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'deny' }).catch(() => {});
  await page.click('#save-btn'); await sleep(1500);
  const png = await page.evaluate(() => window.__exodusLastPng || null);
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  ok(png && png.size > 20000 && png.width === 1200 * dpr, '12 Save as picture → PNG > 20 KB, width 1200×dpr', JSON.stringify(png));
  ok(await page.$eval('#save-btn', (b) => b.textContent.trim()) === C.buttons.save && !(await page.$eval('#save-btn', (b) => b.disabled)), '12 Save button text restored');
  /* credits dialog */
  await page.click('.results .btn-link'); await sleep(150);
  const dlg = await page.evaluate(() => ({ open: document.getElementById('credits-dialog').open, lines: document.querySelectorAll('#credits-lines li').length, focus: document.activeElement.id }));
  ok(dlg.open && dlg.lines === 3 && dlg.focus === 'credits-close', 'credits dialog opens with 3 lines, focus on Close', JSON.stringify(dlg));
  await page.keyboard.press('Escape'); await sleep(100);
  ok(await page.evaluate(() => !document.getElementById('credits-dialog').open), 'credits dialog closes on Escape');
  /* try again */
  const before = await page.evaluate(() => JSON.parse(sessionStorage.getItem('exodus-paper-v1')).shuffles);
  await page.click('#retry-btn'); await sleep(100);
  ok((await page.$('.confirm-card')) !== null && (await page.$eval('.confirm-card p', (p) => p.textContent)) === C.results.retryConfirm, '12 Try again shows inline confirm card');
  await page.click('#retry-no'); await sleep(100);
  ok((await page.$('.confirm-card')) === null && (await page.$('.results')) !== null, '12 Keep this paper closes the card');
  await page.click('#retry-btn'); await sleep(100); await page.click('#retry-yes'); await sleep(600);
  const after = await page.evaluate(() => JSON.parse(sessionStorage.getItem('exodus-paper-v1')));
  ok((await page.$('.q-a')) !== null && (await lampCount(page)) === 0 && after.name === 'Choice Tester' && JSON.stringify(after.shuffles) !== JSON.stringify(before), '12 Yes → Question A, 0 lamps, name kept, reshuffled', JSON.stringify(after.shuffles));
  ok(await page.$$eval('.stage.done', (s) => s.length) === 0 && (await page.$eval('.stage.current', (e) => e.textContent.trim())) === 'A', '12 stage strip reset to A current');

  /* ---- Q C marking paths 0 and 2, Q F 2-mark path (fresh) ---- */
  await fresh(page, 1280, 900); await begin(page, 'Full Marks', '9A');
  await tapAllCorrect(page, answerMap);
  await page.click('.check-btn'); await sleep(300);
  ok((await lampCount(page)) === 3 && (await page.$eval('.feedback-headline', (h) => h.textContent)) === QA.summary[3], '4 all three correct → 3 marks, summary[3]');
  await page.click('.next-btn'); await sleep(500);
  await pickCorrect(page, C.questions[1]); await page.click('.check-btn'); await sleep(200); await page.click('.next-btn'); await sleep(500);
  await page.type('.write-box', 'idk'); await page.click('.check-btn'); await sleep(200);
  ok((await page.$eval('.feedback-headline', (h) => h.textContent)) === C.questions[2].feedback[0] && (await lampCount(page)) === 4, '7 Q C "idk" → 0 marks, feedback[0]');
  await page.click('.next-btn'); await sleep(500);
  await pickCorrect(page, C.questions[3]); await page.click('.check-btn'); await sleep(200); await page.click('.next-btn'); await sleep(500);
  await pickCorrect(page, C.questions[4]); await page.click('.check-btn'); await sleep(200); await page.click('.next-btn'); await sleep(500);
  const fi = await page.$$('.short-input'); await fi[0].type('ten'); await fi[1].type('angel of death');
  await page.click('.check-btn'); await sleep(200);
  ok((await page.$eval('.feedback-headline', (h) => h.textContent)) === '+2 marks' && (await lampCount(page)) === 8, '8 Q F "ten"+"angel of death" → 2 marks');
  await page.click('.next-btn'); await sleep(600);
  ok((await page.$eval('.verdict', (v) => v.textContent)) === C.results.verdict[8] && (await page.$eval('.score-line', (v) => v.textContent)) === '8 out of 10', '12 verdict band ≥8');
  /* Q C 2-mark path */
  await fresh(page, 1280, 900); await begin(page, 'Two Marks');
  await tapAllCorrect(page, answerMap); await page.click('.check-btn'); await sleep(200); await page.click('.next-btn'); await sleep(500);
  await pickCorrect(page, C.questions[1]); await page.click('.check-btn'); await sleep(200); await page.click('.next-btn'); await sleep(500);
  await page.type('.write-box', 'So he would be safe from being killed.'); await page.click('.check-btn'); await sleep(200);
  ok((await page.$eval('.feedback-headline', (h) => h.textContent)) === C.questions[2].feedback[2] && (await lampCount(page)) === 6, '7 Q C 2-mark answer → feedback[2]');

  /* ---- test 13: screenshots at five widths ---- */
  const widths = [360, 375, 768, 1280, 1920];
  for (const w of widths) {
    const h = w < 500 ? 780 : w < 1000 ? 1024 : w >= 1920 ? 1080 : 900;
    await fresh(page, w, h);
    await shot(page, `cover-${w}`);
    ok(await noHScroll(page), `13 no horizontal scroll: cover ${w}`);
    await begin(page, 'Screenshot Pupil', '9B');
    await shot(page, `qa-before-${w}`);
    ok(await noHScroll(page), `13 no horizontal scroll: Q A ${w}`);
    /* place two right, one wrong via tap */
    await tapWithOneWrong(page, answerMap);
    await page.click('.check-btn'); await sleep(400);
    await shot(page, `qa-after-${w}`);
    ok(await noHScroll(page), `13 no horizontal scroll: Q A after ${w}`);
    await page.click('.next-btn'); await sleep(500);
    await pickCorrect(page, C.questions[1]); await page.click('.check-btn'); await sleep(200); await page.click('.next-btn'); await sleep(500);
    await page.type('.write-box', 'To protect him.'); await page.click('.check-btn'); await sleep(300);
    await shot(page, `qc-after-${w}`);
    ok(await noHScroll(page), `13 no horizontal scroll: Q C ${w}`);
    await page.click('.next-btn'); await sleep(500);
    await pickCorrect(page, C.questions[3]); await page.click('.check-btn'); await sleep(200); await page.click('.next-btn'); await sleep(500);
    await pickCorrect(page, C.questions[4]); await page.click('.check-btn'); await sleep(200); await page.click('.next-btn'); await sleep(500);
    const fin = await page.$$('.short-input'); await fin[0].type('10'); await fin[1].type('frogs');
    await page.click('.check-btn'); await sleep(300);
    await shot(page, `qf-after-${w}`);
    ok(await noHScroll(page), `13 no horizontal scroll: Q F ${w}`);
    await page.click('.next-btn'); await sleep(600);
    await shot(page, `results-${w}`);
    ok(await noHScroll(page), `13 no horizontal scroll: results ${w}`);
  }
  /* touch drag at phone width too */
  await fresh(page, 375, 780); await begin(page, 'Phone Finger');
  await page.evaluate((d) => { [...document.querySelectorAll('.match-card')].find((x) => x.querySelector('.definition').textContent.trim() === d).scrollIntoView({ block: 'center' }); }, defs[0]);
  await sleep(100);
  const tp = await touchDrag(page, await chipRectByText(page, terms[0]), await cardRectByDef(page, defs[0]));
  pm = await placedMap(page);
  ok(tp.tracked && pm[defs[0]] === terms[0], '4 touch drag at 375px places the chip', JSON.stringify(pm));

  /* ---- test 14/15: static checks ---- */
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(/<script src="\.\.\/\.\.\/assets\/intro-loader\.js"><\/script>\s*<\/body>/.test(html), '14 intro-loader is the last thing before </body>');
  ok(html.includes('<footer class="act-footer">\n  <img src="../../assets/crest.png" alt="" class="footer-crest" aria-hidden="true" />\n  <span>OLS Digital Skills</span>\n</footer>'), '14 footer markup exact');
  const folderText = ['index.html', 'style.css', 'script.js', 'content.js', 'marker.js'].map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
  ok(!/href="\.\.\/[^"]*\.html|href="\/|href="https?:/.test(html.replace(/<link[^>]+>/g, '')), '14 no links out of the folder');
  ok(!/Damien|Gartland|McIlduff|Eleain/i.test(folderText.replace(/\/\*[\s\S]*?\*\//g, '')), '14 no personal names in shipped code (outside comments)');
  const spot = [C.cover.resumeNotice, C.buttons.saveFallback, C.results.retryNo, C.results.retryYes, C.header.stageDone, C.questions[0].correctTermLabel, C.questions[0].slotEmpty, C.buttons.saving, C.credits.intro, C.questions[2].schemeTitle];
  ok(spot.every((s) => folderText.includes(s.split('{')[0])), '15 spot-check strings present in content.js and referenced');
  const refs = ['resumeNotice', 'saveFallback', 'retryNo', 'retryYes', 'stageDone', 'correctTermLabel', 'slotEmpty', 'saving', 'intro', 'schemeTitle', 'howItWorks', 'nameMissing', 'marksSoFar', 'soundOff', 'trayLabel', 'cardsLabel', 'youWrote', 'note', 'verdict', 'retryConfirm'];
  const js = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
  const unref = refs.filter((k) => !new RegExp('[.\\[\'"]' + k + '\\b').test(js));
  ok(unref.length === 0, '15 every spot-checked content key is wired in script.js', unref.join(','));
  /* 16: weight */
  let bytes = 0; (function walk(d) { fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) { if (f !== 'shots') walk(p); } else bytes += st.size; }); })(path.join(__dirname, '..'));
  ok(bytes <= 1.5 * 1024 * 1024, '16 folder ≤ 1.5 MB', (bytes / 1024).toFixed(0) + ' KB');
  ok(consoleErrors.length === 0, 'zero console errors across the whole run', consoleErrors.slice(0, 5).join(' | '));

  await browser.close();
  console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
  process.exit(fails ? 1 : 0);

  /* ---- helpers that use tap placement ---- */
  async function tapAllRotated(page) {
    /* cyclic derangement: chip i goes on the card that belongs to chip i+1 → 0 correct */
    const chips = await page.$$eval('.tray .chip', (c) => c.map((x) => x.textContent.trim()));
    const own = (chip) => Object.keys(answerMap).find((d) => answerMap[d] === chip);
    for (let i = 0; i < chips.length; i++) await tapPlace(page, chips[i], own(chips[(i + 1) % chips.length]));
  }
  async function tapAllCorrect(page, map) {
    const chips = await page.$$eval('.tray .chip', (c) => c.map((x) => x.textContent.trim()));
    for (const chip of chips) await tapPlace(page, chip, Object.keys(map).find((d) => map[d] === chip));
  }
  async function tapWithOneWrong(page, map) {
    const chips = await page.$$eval('.tray .chip', (c) => c.map((x) => x.textContent.trim()));
    const defs = Object.keys(map);
    await tapPlace(page, chips[0], defs.find((d) => map[d] === chips[0]));
    const others = chips.slice(1);
    const remaining = defs.filter((d) => map[d] !== chips[0]);
    await tapPlace(page, others[0], remaining.find((d) => map[d] !== others[0]));
    await tapPlace(page, others[1], remaining.find((d) => map[d] === others[0]));
  }
  async function tapPlace(page, chipText, defText) {
    await page.evaluate((t) => { const c = [...document.querySelectorAll('.chip')].find((x) => x.textContent.trim() === t); c.scrollIntoView({ block: 'center' }); }, chipText);
    const cr = await chipRectByText(page, chipText);
    await page.mouse.click(cr.cx, cr.cy); await sleep(60);
    await page.evaluate((d) => { const c = [...document.querySelectorAll('.match-card')].find((x) => x.querySelector('.definition').textContent.trim() === d); c.scrollIntoView({ block: 'center' }); }, defText);
    const dr = await cardRectByDef(page, defText);
    await page.mouse.click(dr.cx, dr.y + 20); await sleep(80);
  }
  async function pickCorrect(page, q) {
    const t = q.options.find((o) => o.correct).text;
    const idx = await page.evaluate((tt) => [...document.querySelectorAll('.choice')].findIndex((b) => b.querySelector('.label').textContent.trim() === tt), t);
    await page.click(`.choice:nth-child(${idx + 1})`); await sleep(60);
  }
})().catch((e) => { console.error('FAIL harness error:', e); process.exit(1); });
