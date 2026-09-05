/* browser.js — THE ONE PLACE A BROWSER IS LAUNCHED.
 *
 * Puppeteer is installed globally on both of Damien's Macs; every gate that
 * needs a page asks here, so the launch flags that were paid for once
 * (--no-sandbox --disable-gpu --disable-dev-shm-usage; screenshots work as of
 * 5 Sept 2026) live in ONE file (DFM 144).
 *
 * newPage({ width, height, reducedMotion, userAgent, tier }) hands back a page
 * already sized, already told whether motion is reduced, and already carrying
 * a console-error collector — because "zero console errors on every walked
 * state" is a law of the DONE list and a law nobody collects for is a wish.
 *
 * The projector is 1280x720 at deviceScaleFactor 1: every teacher screen, the
 * starter board and every movie must read from the back of the room.
 */
'use strict';
const path = require('path');

let puppeteer = null;
function pup() {
  if (puppeteer) return puppeteer;
  const tries = [];
  for (const id of ['puppeteer', 'puppeteer-core']) {
    try { puppeteer = require(id); return puppeteer; } catch (e) { tries.push(id + ': ' + e.message); }
  }
  throw new Error('puppeteer not found (set NODE_PATH="$(npm root -g)")\n  ' + tries.join('\n  '));
}

const FLAGS = ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--font-render-hinting=none'];

async function launch(opts) {
  return await pup().launch({ headless: 'new', args: FLAGS, ...(opts || {}) });
}

async function newPage(browser, o) {
  o = o || {};
  const page = await browser.newPage();
  await page.setViewport({
    width: o.width || 1280,
    height: o.height || (o.width === 375 ? 812 : o.width === 768 ? 1024 : 900),
    deviceScaleFactor: 1
  });
  if (o.userAgent) await page.setUserAgent(o.userAgent);
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: o.reducedMotion ? 'reduce' : 'no-preference' }
  ]);
  page.__errors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    /* the preview server has no favicon and never will; a browser's own 404 for
       one is not a fault in the app, and counting it would put a permanent
       false error under every "zero console errors" claim */
    if (/favicon/i.test(m.text())) return;
    page.__errors.push(m.text());
  });
  page.on('pageerror', (e) => page.__errors.push('pageerror: ' + (e && e.message ? e.message : String(e))));
  page.on('requestfailed', (r) => {
    const u = r.url();
    /* a failed request for something the page needs is a console error in every
       way that matters to a pupil; a failed favicon is not */
    if (!/favicon/.test(u)) page.__errors.push('requestfailed: ' + u);
  });
  return page;
}

/* the widths of MATHS_GATES_DESIGN 2.3, in one home */
const WIDTHS = [375, 768, 1280];
const PROJECTOR = { width: 1280, height: 720 };

module.exports = { launch, newPage, WIDTHS, PROJECTOR, FLAGS };
