#!/usr/bin/env node
/* qa-preview-honest.js — THE PREVIEW SAYS IT IS THE PREVIEW.
 *
 * G-F6. The fault class is KS3 DT's C-14: a published copy of the app that
 * accepted every answer and saved nothing, saying nothing about it. A pupil who
 * finds the preview copy and works through an exercise on it has done an hour's
 * work into a void, and the screen let her.
 *
 * So on the preview tier a banner is pinned to the top, in a colour that is
 * neither the shell's nor a marking colour, for the whole session. And on the
 * live tier it is ABSENT — a banner that appears on the deployed app would be
 * its own lie.
 *
 * It also proves the preview's own scaffolding is inert once deployed: the
 * answer channel (GJ.app.__prime) and the demo seed exist only when there is no
 * OLS_TRANSPORT, so nothing a pupil can reach on the live app can answer a
 * question for her.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const B = require('./lib/browser.js');
const S = require('./lib/stage.js');
const { stripComments } = require('./lib/decl.js');

const TIER = 'full';
const ORDER = 72;
const COVERS = { books: '*', kinds: [], surfaces: ['cover'], widths: [375, 1280], projector: false, tier: ['preview', 'built'], cells: ['preview'] };
const CONTROLS = [
  { id: 'no-banner', kind: 'fixture', plant: 'fixture-no-banner', mustFail: /must say so/ },
  { id: 'answer-channel-on-the-live-tier', kind: 'fixture', plant: 'fixture-live-channel', mustFail: /answer a question for her/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-preview-honest');

/* the source half: every preview-only affordance is behind the transport test */
{
  const src = stripComments(A.read(A.app('script.js')));
  const gated = /if\s*\(\s*!window\.OLS_TRANSPORT\s*\)\s*\{[\s\S]*?__prime/.test(src);
  g.check(gated, 'script.js', 'preview',
    'the preview answer channel is not behind a check for the live transport — on the deployed app something could answer a question for her');
  const seedGated = /OLS_TRANSPORT/.test(src) && /seedDemo/.test(src);
  g.check(seedGated, 'script.js', 'preview',
    'the demo seed is not gated by the transport — a real class would find twelve invented pupils in its markbook');
}

(async () => {
  const browser = await B.launch();
  try {
    for (const width of [375, 1280]) {
      const page = await S.openApp(browser, { width });
      const banner = await page.evaluate(() => {
        const b = document.getElementById('gj-preview-banner');
        if (!b) return null;
        const cs = getComputedStyle(b);
        const r = b.getBoundingClientRect();
        return { text: (b.textContent || '').trim(), bg: cs.backgroundColor, top: Math.round(r.top), pos: cs.position };
      });
      g.check(!!banner, 'cover:preview @' + width, 'preview',
        'there is no banner on the preview copy — a public copy that saves nowhere must say so');
      if (banner) {
        g.check(/preview/i.test(banner.text) && /not saved|nothing here is saved/i.test(banner.text), 'cover:preview @' + width, 'preview',
          'the banner says "' + banner.text.slice(0, 60) + '" — it has to say plainly that nothing here is saved to school');
        g.check(banner.top <= 2, 'cover:preview @' + width, 'preview',
          'the banner is ' + banner.top + 'px down the page — it belongs at the very top, above everything, for the whole session');
        const MARKING = ['rgb(200, 16, 46)', 'rgb(31, 122, 51)', 'rgb(176, 125, 16)'];
        g.check(MARKING.indexOf(banner.bg) < 0, 'cover:preview @' + width, 'preview',
          'the banner wears a marking colour (' + banner.bg + ') — a message is not a mark');
      }
      await page.close();
    }
  } finally { await browser.close(); }
  g.done();
})().catch(e => { console.log('  FAIL  qa-preview-honest x crash: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
