#!/usr/bin/env node
/* qa-contrast-clip.js — WHAT IS SCROLLED OUT OF VIEW IS NOT ON SCREEN (14 Sep 2026).
 *
 * The first j2-4 expert walk printed eight UNREADABLE rows on the class
 * adventure's transcript — "1.55:1, ink #3c322b on #160d05" — for rows that had
 * scrolled up out of the transcript panel. The sampler measured the box where
 * the row WOULD be, which on a full-page screenshot holds the starfield behind
 * the card. Nobody could see those rows; the finding was the gate measuring the
 * wrong pixels. `contrast-audit.js` now clips every element's box to its
 * overflow ancestors and skips what has no visible part.
 *
 * Proved both ways on a planted page:
 *   · a row scrolled OUT of a scrolling panel is skipped (not measured at all);
 *   · CONTROL — the SAME row, scrolled INTO view, with a real contrast fault, is
 *     still caught; a partly visible row is measured on its visible part.
 *
 *   node qa-contrast-clip.js
 */
'use strict';
const { chromium } = require('playwright');
const CA = require('./lib/contrast-audit.js');

let failures = 0;
const check = (ok, m, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m + (!ok && d ? ' — ' + d : '')); if (!ok) failures++; };
const control = (ok, m, d) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m + (!ok && d ? ' — ' + d : '')); if (!ok) failures++; };

const PAGE = `<!doctype html><body style="margin:0;background:#0B152B">
<div class="chunk-host" style="padding:40px">
  <div class="card" style="background:#fff;padding:16px;border-radius:12px">
    <div class="log" style="height:120px;overflow-y:auto;background:#fff">
      <p class="row r1" style="margin:0;padding:12px;color:#c8c8c8;background:#fff">faint row one — a real fault when seen</p>
      <p class="row r2" style="margin:0;padding:12px;color:#1A3A6B;background:#fff">row two reads fine</p>
      <p class="row r3" style="margin:0;padding:12px;color:#1A3A6B;background:#fff">row three reads fine</p>
      <p class="row r4" style="margin:0;padding:12px;color:#1A3A6B;background:#fff">row four reads fine</p>
      <p class="row r5" style="margin:0;padding:12px;color:#1A3A6B;background:#fff">row five reads fine</p>
    </div>
  </div>
</div></body>`;

(async () => {
  console.log('qa-contrast-clip — a clipped row is not measured; a visible one still is\n');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await page.setContent(PAGE);
  const collect = () => page.evaluate(CA.COLLECT, [[], [], '.chunk-host']);

  /* 1 — scroll the panel to the bottom: row one is out of view */
  await page.evaluate(() => { const l = document.querySelector('.log'); l.scrollTop = l.scrollHeight; });
  let rows = await collect();
  const r1 = rows.find(r => /row one/.test(r.text));
  check(!r1, 'a row scrolled OUT of its panel is not collected at all', r1 ? JSON.stringify(r1) : '');
  check(rows.some(r => /row five/.test(r.text)), 'a row IN view is collected');

  /* 2 — CONTROL: scroll to the top — the faint row is visible, and it is caught */
  await page.evaluate(() => { document.querySelector('.log').scrollTop = 0; });
  rows = await collect();
  const r1b = rows.find(r => /row one/.test(r.text));
  control(!!r1b, 'the same row scrolled INTO view is collected');
  const shot = await page.screenshot({ fullPage: true });
  const measured = await page.evaluate(CA.MEASURE, ['data:image/png;base64,' + shot.toString('base64'), rows]);
  const m1 = measured.find(r => /row one/.test(r.text));
  control(!!m1 && m1.ratio < 4.5, 'and its faint ink is caught below the floor (' + (m1 && m1.ratio) + ':1)', JSON.stringify(m1));
  const r5 = rows.find(r => /row five/.test(r.text));
  check(!r5, 'the row now scrolled out at the bottom is skipped in turn');

  /* 3 — a partly visible row is measured on its visible part only */
  await page.evaluate(() => { document.querySelector('.log').scrollTop = 20; });
  rows = await collect();
  const part = rows.find(r => /row one/.test(r.text));
  const panel = await page.evaluate(() => { const r = document.querySelector('.log').getBoundingClientRect(); return { top: r.top + window.scrollY, h: r.height }; });
  check(!!part && part.y >= panel.top - 0.5 && part.h < 44, 'a partly clipped row is measured on its visible part (box top ' + (part && Math.round(part.y)) + ' ≥ panel top ' + Math.round(panel.top) + ', height ' + (part && Math.round(part.h)) + 'px of 44)');

  await browser.close();
  console.log('');
  if (failures) { console.log('qa-contrast-clip: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-contrast-clip: ALL GREEN');
})().catch(e => { console.error(e); process.exit(1); });
