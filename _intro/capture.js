#!/usr/bin/env node
/**
 * Capture frames of the OLS Digital Skills intro animation.
 *
 * Usage:
 *   node capture.js [--frames N] [--out DIR] [--sample] [--w W] [--h H]
 *
 *   --frames N   Total frames (default 180 = 3s @ 60fps)
 *   --out DIR    Output dir (default ./frames)
 *   --sample     Capture only every 30th frame for QC
 *   --w W        Canvas width  (default 1920)
 *   --h H        Canvas height (default 1080)
 *
 * Requires the static server running at http://localhost:8098/_intro/
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const has = (f) => args.includes(f);
  const argv = (f, def) => { const i = args.indexOf(f); return i >= 0 ? args[i+1] : def; };

  const TOTAL = parseInt(argv('--frames', '180'), 10);
  const OUT_DIR = path.resolve(argv('--out', './frames'));
  const SAMPLE_ONLY = has('--sample');
  const W = parseInt(argv('--w', '1920'), 10);
  const H = parseInt(argv('--h', '1080'), 10);
  const BASE_URL = 'http://localhost:8098/_intro/';

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Canvas size: ${W} × ${H}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  const indices = SAMPLE_ONLY
    ? [0, 30, 60, 90, 120, 150, 179]
    : Array.from({ length: TOTAL }, (_, i) => i);

  console.log(`Capturing ${indices.length} frame(s) → ${OUT_DIR}`);

  const t0 = Date.now();
  for (const f of indices) {
    const url = `${BASE_URL}?frame=${f}&w=${W}&h=${H}`;
    await page.goto(url, { waitUntil: 'load' });
    // Wait for the script to mark the body ready
    await page.waitForFunction(() => document.body && document.body.dataset.ready === 'true', { timeout: 5000 });
    // Tiny settle to ensure the canvas paint flushes
    await new Promise(r => setTimeout(r, 30));
    const stage = await page.$('#stage');
    const filename = path.join(OUT_DIR, String(f).padStart(4, '0') + '.png');
    await stage.screenshot({ path: filename, type: 'png', omitBackground: false });
    if (f % 20 === 0 || SAMPLE_ONLY) {
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  frame ${f.toString().padStart(3, ' ')} → ${path.basename(filename)}  (${dt}s elapsed)`);
    }
  }

  await browser.close();
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Done in ${dt}s.`);
})().catch(e => { console.error(e); process.exit(1); });
