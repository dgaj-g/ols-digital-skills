/* lib/l4-engine-page.js — A PAGE WITH THE ENGINE AND REAL PYTHON IN IT (K44 / DFM 283).
 *
 * The three L4 probe harnesses (qa-paths-probe, qa-calls-probe, qa-relay) run
 * Fable's controls against the routines as they now live in engines.js:
 * `PyRun.runPy`, `PyRun.checkPaths`, `PyRun.checkCalls`, `PyRun.relayDoors`.
 * This helper stages one Chromium page with the platform's own Skulpt loaded
 * FIRST (so `PyRun.load()` finds `Sk` already there and never fetches), a
 * minimal `App` mimic, and engines.js from either the working tree or a git
 * ref — the DFM 196 control is the same page built from the build he sat, where
 * none of the four routines exists.
 *
 *   const { enginePage } = require('./lib/l4-engine-page.js');
 *   const { browser, page } = await enginePage({ ref: '8f58434' });   // or {} for the tree
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('../node_modules/playwright');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const ENGINES = path.join(REPO, 'ks3-dt', 'platform', 'engines.js');
const STYLE = path.join(REPO, 'ks3-dt', 'platform', 'style.css');
const SKULPT = path.join(REPO, 'ks3-dt', 'platform', 'assets', 'vendor', 'skulpt');

function engineSource(ref) {
  if (!ref) return fs.readFileSync(ENGINES, 'utf8');
  return execFileSync('git', ['-C', REPO, 'show', ref + ':ks3-dt/platform/engines.js'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

async function enginePage(opts) {
  opts = opts || {};
  const browser = opts.browser || await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message)));
  await page.goto('about:blank');
  await page.addStyleTag({ content: 'body{margin:0;padding:24px;background:#0B1A33;}' });
  if (opts.style !== false) await page.addStyleTag({ path: STYLE });
  await page.addScriptTag({ path: path.join(SKULPT, 'skulpt.min.js') });
  await page.addScriptTag({ path: path.join(SKULPT, 'skulpt-stdlib.js') });
  await page.evaluate(() => {
    window.App = {
      esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      asset: p => p,
      armButton: (b, fn) => { if (b) b.onclick = fn; },
      toast: () => {},
      confirm: (title, ask, yes, cb) => { window.__confirms = (window.__confirms || []).concat([{ title, ask, yes }]); cb(!!window.__confirmYes); },
      state: { pairing: 0, chunkIdx: 0, chunks: [] }
    };
  });
  await page.addScriptTag({ content: engineSource(opts.ref) });
  /* Skulpt is already on the page: PyRun.load() must not fetch it again */
  await page.evaluate(() => { if (window.PyRun) window.PyRun._p = Promise.resolve(true); });
  return { browser, page, errs, ownBrowser: !opts.browser };
}

module.exports = { enginePage, engineSource, REPO };
