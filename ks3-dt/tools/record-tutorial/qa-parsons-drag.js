/* qa-parsons-drag.js - the exit block puzzle: what it says, and what it lets her do.
 *
 * DAMIEN, 4 Aug 2026, sitting Lesson 2:
 *   "I like the blocks/your program question, but the numbers (and their dots)
 *    are too close to the answer labels when moved over. also, i expected to be
 *    able to drag and drop my answer. I see underneath it says 'tap a block to
 *    add it' but I asked you before not to use the word tap, and use click
 *    instead, also, so that i know that i'm supposed to click, then this
 *    instruction needs to go above the blocks/program bit (underneath the
 *    question text) and needs to appear more prominently. On the question text
 *    itself ... You haven't actually told the students that they must build the
 *    program by..."
 * and then, on the trailing dots: "i left the dots in on purpose assuming you
 * knew i meant to incorporate the existing text to explain what they'd be
 * building."
 *
 * So this guard covers all of it: the instruction is above the blocks and says
 * click, the challenge names the ACTION and carries what she is building, the
 * marker has room, and dragging actually works - driven with REAL mouse input
 * (mouse.down/move/up), because a gesture that cannot be driven cannot be
 * proven. That is why the implementation is pointer-based rather than HTML5
 * drag-and-drop: synthetic input cannot start a native drag, so an HTML5 one
 * would have shipped untested.
 *
 * Needs the static server on 8096 (config digital-skills-l4).
 *   node qa-parsons-drag.js
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

/* mount the real Lesson 2 puzzle and step past its intro card */
async function mountPuzzle(page) {
  await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const lesson = await (await fetch('/ks3-dt/content/j1/lessons/j1-02.json')).json();
    const par = lesson.chunks.find(c => c.engine === 'parsons');
    document.body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:22px;max-width:820px;margin:0 auto';
    const host = document.createElement('div');
    host.className = 'chunk-host'; host.id = 'chunk-host';
    wrap.appendChild(host); document.body.appendChild(wrap);
    window.Engines.parsons.mount(host, par, {
      draft: {}, review: true, chunk: par,
      markItem: () => Promise.resolve({ ok: true, correct: true }), saveEvent() {}, next() {}
    });
    await sleep(400);
    host.querySelector('button.primary-btn').click();
    await sleep(450);
  });
  await sleep(250);
}

const placed = page => page.evaluate(() =>
  Array.from(document.querySelectorAll('.pp-list li:not(.pp-empty) .parsons-block')).map(b => b.textContent));
const trayList = page => page.evaluate(() =>
  Array.from(document.querySelectorAll('.pt-list .parsons-block')).map(b => b.textContent));

/* a real mouse drag: press, move in steps so pointermove actually fires, release */
async function dragBox(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * i / 6, from.y + (to.y - from.y) * i / 6);
    await sleep(25);
  }
  await page.mouse.up();
  await sleep(220);
}
const centreOf = (page, sel, nth) => page.evaluate(([sel, nth]) => {
  const el = document.querySelectorAll(sel)[nth];
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
}, [sel, nth]);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await mountPuzzle(page);

  /* ---------- what the card SAYS (DFM 151) ---------- */
  const words = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const goal = q('.parsons-goal'), target = q('.parsons-target'), how = q('.parsons-how'), cols = q('.parsons-cols');
    return {
      goal: goal ? goal.textContent.trim() : '',
      target: target ? target.textContent.trim() : '',
      how: how ? how.textContent.trim() : '',
      howAboveBlocks: !!(how && cols) &&
        !!(how.compareDocumentPosition(cols) & Node.DOCUMENT_POSITION_FOLLOWING),
      oldNote: document.querySelectorAll('.parsons-note').length,
      /* "more prominently": the how-to line must not be smaller than the body */
      howPx: how ? parseFloat(getComputedStyle(how).fontSize) : 0,
      bodyPx: parseFloat(getComputedStyle(document.body).fontSize)
    };
  });
  console.log('\n== what the card says ==');
  check(/build the program/i.test(words.goal), 'the challenge names the ACTION: build the program');
  check(/order/i.test(words.goal), 'and says the blocks go in an ORDER');
  check(/shake|ghost/i.test(words.target), 'what she is building is on the card, not left implied');
  check(words.how.length > 0, 'there is a how-to-build line at all');
  check(/click/i.test(words.how), 'it says CLICK');
  check(/drag/i.test(words.how), 'and it says DRAG');
  check(!/\btap/i.test(words.goal + words.target + words.how), 'the word "tap" appears nowhere (DFM 150)');
  check(words.howAboveBlocks, 'the how-to line sits ABOVE the blocks, not under them');
  check(words.oldNote === 0, 'the old small-print note underneath is gone');
  check(words.howPx >= words.bodyPx * 0.9, 'and it is not shrunk into small print (' + words.howPx + 'px)');

  /* ---------- the marker has room (his "numbers and their dots") ---------- */
  await page.evaluate(() => document.querySelector('.pt-list .parsons-block').click());
  await sleep(250);
  /* Measure the whole INDENT - from the list's own left edge to the block
     label - because the "1." marker is painted in the list's padding, OUTSIDE
     the item box. Measuring inside the item (my first attempt) reported 6px and
     said nothing about the crowding he actually saw. */
  const gap = await page.evaluate(() => {
    const ol = document.querySelector('.pp-list');
    const btn = ol.querySelector('li:not(.pp-empty) .parsons-block');
    return Math.round(btn.getBoundingClientRect().left - ol.getBoundingClientRect().left);
  });
  console.log('\n== spacing ==');
  check(gap >= 34, 'the number and its dot have room before the block label (' + gap + 'px of indent)');

  /* ---------- click still works, in both directions ---------- */
  console.log('\n== clicking ==');
  check((await placed(page)).length === 1, 'clicking a block in the tray moves it across');
  await page.evaluate(() => document.querySelector('.pp-list .parsons-block').click());
  await sleep(250);
  check((await placed(page)).length === 0, 'clicking it again sends it back');

  /* ---------- dragging, with a real mouse ---------- */
  console.log('\n== dragging (real mouse input) ==');
  await page.evaluate(() => document.querySelector('.pt-list .parsons-block').click());  // seed one
  await sleep(250);
  const seeded = (await placed(page))[0];

  const fromTray = await centreOf(page, '.pt-list .parsons-block', 0);
  const draggedLabel = await page.evaluate(() => document.querySelectorAll('.pt-list .parsons-block')[0].textContent);
  const firstPlaced = await page.evaluate(() => {
    const r = document.querySelector('.pp-list li:not(.pp-empty)').getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.top + 3) };   // ABOVE the existing one
  });
  await dragBox(page, fromTray, firstPlaced);
  const afterDrag = await placed(page);
  check(afterDrag.length === 2, 'dragging a block out of the tray puts it in the program');
  check(afterDrag[0] === draggedLabel,
    'and it lands where it was dropped - above the one already there (' + JSON.stringify(afterDrag) + ')');
  check(afterDrag[1] === seeded, 'the block already there was pushed down, not replaced');

  /* reorder: drag the top one below the second */
  const topBox = await centreOf(page, '.pp-list li:not(.pp-empty)', 0);
  const belowSecond = await page.evaluate(() => {
    const r = document.querySelectorAll('.pp-list li:not(.pp-empty)')[1].getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.bottom - 3) };
  });
  await dragBox(page, topBox, belowSecond);
  const afterReorder = await placed(page);
  check(afterReorder[0] === seeded && afterReorder[1] === draggedLabel,
    'dragging a placed block down reorders it (' + JSON.stringify(afterReorder) + ')');

  /* drag back OUT, onto the empty space of the Blocks panel - the whole panel is
     the target, not just the blocks already sitting in it */
  const trayEmptySpace = await page.evaluate(() => {
    const r = document.querySelector('.parsons-tray').getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.bottom - 14) };
  });
  const backOut = await centreOf(page, '.pp-list li:not(.pp-empty)', 0);
  const beforeOut = (await placed(page)).length;
  await dragBox(page, backOut, trayEmptySpace);
  const afterOut = await placed(page);
  check(afterOut.length === beforeOut - 1,
    'dragging a block onto the empty part of the Blocks panel takes it out again');
  check((await trayList(page)).length === 3, 'and it is back in the tray');
  check(await page.evaluate(() => document.querySelectorAll('.parsons-ghost').length) === 0,
    'no dragged copy is left stranded on the page afterwards');

  /* ---------- CONTROL 1: the old 20px indent must fail the spacing check ---------- */
  console.log('\n== CONTROL 1: the pre-fix indent must fail the spacing check ==');
  await page.addStyleTag({ content: '.pp-list { padding-left: 20px !important; } .pp-list li { padding-left: 0 !important; }' });
  await mountPuzzle(page);
  await page.evaluate(() => document.querySelector('.pt-list .parsons-block').click());
  await sleep(250);
  const preGap = await page.evaluate(() => {
    const ol = document.querySelector('.pp-list');
    return Math.round(ol.querySelector('li:not(.pp-empty) .parsons-block').getBoundingClientRect().left - ol.getBoundingClientRect().left);
  });
  check(preGap < 34, 'control: the old indent really did crowd the label (' + preGap + 'px)');

  /* ---------- CONTROL 2: move the how-to line back below the blocks ---------- */
  console.log('\n== CONTROL 2: the how-to line below the blocks must fail ==');
  const nowBelow = await page.evaluate(() => {
    const how = document.querySelector('.parsons-how'), cols = document.querySelector('.parsons-cols');
    cols.parentNode.insertBefore(how, cols.nextSibling);          // put it back where it was
    return !!(how.compareDocumentPosition(cols) & Node.DOCUMENT_POSITION_PRECEDING);
  });
  check(nowBelow, 'control: with the instruction under the blocks, the "above" check fails');

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL BLOCK-PUZZLE CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
