#!/usr/bin/env node
/* l5-card-test — Two Lights lookout card (assets/twolights/ui.js fitCard), deep check 25 Oct 2026.
   When a pupil's jobs are done she is handed a lookout card: a short program with one fault, often on its last line.
   The card sits over the bay, and on a half-width laptop (683 wide) the bay is shorter than the card, so the last
   line was cut off and the long print lines ran off the right edge. Every one of the six cards must now show whole:
   card inside the bay, no code hidden sideways, at 683x600 in a pair and a trio, on every chapter, and at 1366.
   CONTROL: ui.js as it was live (commit 38746c9, Version 72) must FAIL at 683x600.
   Needs dev-static on :8131. Usage: node l5-card-test.js */
'use strict';
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require(path.join(__dirname, 'node_modules/playwright'));
const BASE = 'http://localhost:8131/ks3-dt/platform/assets/twolights/hour.html';
const BEFORE = '38746c9';
const CASES = [[683, 600, 'AB', 'ch1'], [683, 600, 'AB', 'ch2'], [683, 600, 'AB', 'ch3'], [683, 600, 'AB', 'ch4'],
  [683, 600, 'ABC', 'ch1'], [683, 600, 'ABC', 'ch4'], [683, 560, 'AB', 'ch1'], [1366, 650, 'AB', 'ch4']];
let checks = 0, fails = 0;
function must(ok, what) { checks++; if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); return ok; }

async function measure(br, w, h, seats, ch, oldUi) {
  const page = await br.newPage({ viewport: { width: w, height: h } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (oldUi) await page.route('**/twolights/ui.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: oldUi }));
  await page.goto(BASE + '?stage=' + ch + '&room=card&seats=' + seats + '&seat=A');
  await page.waitForFunction(() => window.TLUI && TLUI.E, null, { timeout: 10000 });
  const r = await page.evaluate(async (ch) => {
    const E = TLUI.E, PR = window.TwoLightsPrograms;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 12 && !(E.bar() || {}).card; i++) {   // fix her program the way the walker does, until the card shows
      const s = E.S.active, SEAT = PR.SEATS[s], ed = document.getElementById('ed');
      ed.value = ch === 'ch1' ? PR.ch1(SEAT, 2) : ch === 'ch2' ? PR.ch2(SEAT, true) : ch === 'ch3' ? PR.ch3(SEAT, 'after') : PR.ch4(SEAT, []);
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(2700); document.getElementById('run').click(); await sleep(1200);
      while (E.S.L[s].nameQ.length) { E.name(window.TwoLightsJudge.KIND[E.S.L[s].nameQ[0]]); TLUI.render(); await sleep(300); }
      await sleep(500);
    }
    if (!(E.bar() || {}).card) return { noCard: true };
    const out = [];
    for (let c = 0; c < PR.EXTRAS.length; c++) {
      E.S.card = c; TLUI.render(); await sleep(350);
      const card = document.getElementById('card'), pre = document.getElementById('cardsrc'), bay = document.getElementById('baywrap');
      const cr = card.getBoundingClientRect(), br = bay.getBoundingClientRect();
      const lines = PR.EXTRAS[c].src.split('\n').length;
      out.push({ c, lines, shown: !card.hidden, inside: cr.top >= br.top - 1 && cr.bottom <= br.bottom + 1,
        scrolls: card.scrollHeight > card.clientHeight + 1, wide: pre.scrollWidth > pre.clientWidth + 1,
        font: getComputedStyle(pre).fontSize, h: Math.round(cr.height), bay: Math.round(br.height) });
    }
    return { cards: out };
  }, ch);
  await page.close();
  return { r, errs };
}

(async () => {
  const br = await chromium.launch();
  for (const [w, h, seats, ch] of CASES) {
    const { r, errs } = await measure(br, w, h, seats, ch, null);
    const tag = w + 'x' + h + ' ' + seats + ' ' + ch;
    if (!must(!r.noCard, tag + ': the lookout card shows once her jobs are done')) continue;
    const bad = r.cards.filter(x => !x.shown || !x.inside || x.scrolls || x.wide);
    must(!bad.length, tag + ': all six cards show whole (fonts ' + [...new Set(r.cards.map(x => x.font))].join('/') + ', card ' + Math.max(...r.cards.map(x => x.h)) + ' of bay ' + r.cards[0].bay + ' px)' + (bad.length ? ' · cut: ' + JSON.stringify(bad) : ''));
    if (w === 1366) must(r.cards.every(x => x.font === '13px'), tag + ': a full-size laptop keeps the card at its designed 13 px');
    must(!errs.length, tag + ': no page errors' + (errs.length ? ' · ' + errs.join(' | ') : ''));
  }
  /* CONTROL */
  let oldUi = null;
  try { oldUi = execSync('git show ' + BEFORE + ':ks3-dt/platform/assets/twolights/ui.js', { cwd: path.join(__dirname, '../../..'), stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) { oldUi = null; }
  if (oldUi) {
    const { r } = await measure(br, 683, 600, 'AB', 'ch1', oldUi);
    const cut = r.cards ? r.cards.filter(x => !x.inside || x.wide).length : -1;
    must(cut > 0, 'CONTROL the Version 72 ui.js cuts cards at 683x600 (' + cut + ' of 6 cut)');
  } else must(false, 'CONTROL: no old ui.js to run against');
  await br.close();
  console.log('\nl5-card: ' + (fails ? 'FAIL · ' + fails + ' of ' + checks : 'PASS · ' + checks + ' checks'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
