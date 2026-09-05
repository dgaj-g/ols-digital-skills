#!/usr/bin/env node
/* qa-fonts.js — THE FACES LOAD, AND THE DEAD ONES ARE GONE.
 *
 * G-C3. The fault class has a name on this platform's sibling: "nou ShoU inG" —
 * a display face that did not load, so a whole screen rendered in a fallback
 * that had none of the letterforms the layout was measured for. A font is the
 * one asset whose failure looks like a design decision.
 *
 * v4 changed the whole type system: Schibsted Grotesk and Spline Sans Mono in,
 * Caveat and Courier Prime out. So this asks four things:
 *   1. every vendored face actually LOADS in the browser (document.fonts);
 *   2. the elements that are supposed to be in each face compute to it, so a
 *      face that loaded but was never used is caught too;
 *   3. no stylesheet still names a face that has been deleted;
 *   4. CREDITS.md lists exactly the faces that are vendored — a licence file
 *      that has drifted is a licence file nobody can rely on.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const B = require('./lib/browser.js');
const S = require('./lib/stage.js');

const TIER = 'full';
const ORDER = 75;
const COVERS = { books: '*', kinds: [], surfaces: ['cover', 'shelf', 'question'], widths: [1280], projector: false, tier: ['preview', 'built'], cells: ['fonts'] };
const CONTROLS = [
  { id: 'face-removed', kind: 'fixture', plant: 'fixture-font-missing', mustFail: /did not load/ },
  { id: 'dead-face-in-a-stylesheet', kind: 'fixture', plant: 'fixture-dead-font', mustFail: /a face this platform deleted/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const LIVE = ['Fraunces', 'Schibsted Grotesk', 'Spline Sans Mono', 'STIX Two Text'];
const DEAD = ['Caveat', 'Courier Prime'];

const g = new Gate('qa-fonts');
g.exempt(['a face is judged by whether it LOADS and whether something uses it; how it looks is his eye, not a gate']);

/* ---- the stylesheets carry no dead face ------------------------------- */
{
  const fs2 = require('fs');
  const sheets = fs2.readdirSync(A.APP).filter(f => /\.css$/.test(f)).map(f => A.app(f))
    .concat([A.app('assets/fonts/fonts.css')]).filter(p => A.exists(p));
  sheets.forEach(p => {
    /* comments are stripped: the history of a deleted face is allowed to be
       written down, and often should be */
    const src = A.read(p).replace(/\/\*[\s\S]*?\*\//g, ' ');
    DEAD.forEach(d => g.check(src.indexOf(d) < 0, p.split('/').pop(), 'fonts',
      'this stylesheet still names ' + d + ', a face this platform deleted — a rule pointing at a font nobody vendors renders in whatever the machine happens to have'));
  });
  const credits = A.exists(A.app('assets/fonts/CREDITS.md')) ? A.read(A.app('assets/fonts/CREDITS.md')) : '';
  LIVE.forEach(f => g.check(credits.indexOf(f) >= 0, 'CREDITS.md', 'fonts',
    credits ? f + ' is vendored but is not in CREDITS.md — a licence file that has drifted is one nobody can rely on' : 'there is no CREDITS.md for the vendored faces'));
  const woff = require('fs').readdirSync(A.app('assets/fonts')).filter(f => /\.woff2$/.test(f));
  g.note(woff.length + ' vendored files: ' + woff.join(', '));
  DEAD.forEach(d => {
    const slug = d.toLowerCase().replace(/\s+/g, '-');
    g.check(!woff.some(f => f.indexOf(slug) === 0), 'assets/fonts', 'fonts',
      d + ' is still on disk — it is not used and it is 50KB every pupil downloads for nothing');
  });
}

/* ---- and they load, and something uses them --------------------------- */
(async () => {
  const browser = await B.launch();
  try {
    const page = await S.openApp(browser, { width: 1280 });
    await page.evaluate(() => document.fonts.ready);
    const seen = await page.evaluate((live) => {
      const out = { loaded: {}, used: {} };
      live.forEach(f => { out.loaded[f] = document.fonts.check('16px "' + f + '"'); });
      const pick = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontFamily : null; };
      out.used.display = pick('.gj-wordmark, .shelf-title');
      out.used.ui = pick('.btn-gold, .toolbtn, body');
      out.used.mono = pick('.shelf-eyebrow, .cover-over, .stat-chip');
      return out;
    }, LIVE);
    LIVE.forEach(f => g.check(seen.loaded[f], 'the browser', 'fonts',
      '"' + f + '" did not load — the page falls back to whatever the machine has, which is how a screen ends up rendering in letterforms the layout was never measured for'));
    g.check(/Fraunces/.test(seen.used.display || ''), 'the wordmark', 'fonts',
      'the display face is not Fraunces (it computes to ' + seen.used.display + ')');
    g.check(/Schibsted/.test(seen.used.ui || ''), 'the interface', 'fonts',
      'the UI face is not Schibsted Grotesk (it computes to ' + seen.used.ui + ')');
    g.check(/Spline/.test(seen.used.mono || ''), 'the labels', 'fonts',
      'the mono face is not Spline Sans Mono (it computes to ' + seen.used.mono + ')');
    g.note('loaded: ' + LIVE.filter(f => seen.loaded[f]).join(', '));
    await page.close();
  } finally { await browser.close(); }
  g.done();
})().catch(e => { console.log('  FAIL  qa-fonts x crash: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
