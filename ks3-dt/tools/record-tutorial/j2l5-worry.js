#!/usr/bin/env node
/* J2 L5 THE SEARCH Version 2, gate 15 and the frozen-face proof (spec V2 §5.7, §15 gate 15, §20; DFM 341).
 *   W1  chars.js at worry 0 (and with no worry flag at all) draws Nuala with ZERO changed pixels against the V74 file
 *       (j2l5-chars-v74.js), over 6 poses. CONTROL: worry 1 must change pixels.
 *   W2  gate 15: every snow-scene Nuala call in hour/*.js passes worry 1; only the barn (THE CLOSE) passes worry 0;
 *       the film runs with SearchChars.worry = 1 and the close sets it to 0.
 *       CONTROL: a planted snow-scene call with worry 0 must be caught.
 *   node ks3-dt/tools/record-tutorial/j2l5-worry.js */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const NEW = fs.readFileSync(path.join(ROOT, 'ks3-dt/platform/assets/search/search/chars.js'), 'utf8');
const OLD = fs.readFileSync(path.join(__dirname, 'j2l5-chars-v74.js'), 'utf8');
const HOUR = path.join(ROOT, 'ks3-dt/platform/assets/search/hour');
let n = 0, fails = 0;
const must = (ok, what) => { n++; console.log((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) fails++; };
const POSES = [
  { t: 0, torch: 0, phone: 0, walk: 0, look: [0, 0], blink: 0 }, { t: 1.3, torch: 0.9, phone: 1, walk: 0, look: [0.4, 0.15], blink: 0 },
  { t: 2.7, torch: 0.2, phone: 0, walk: 0.5, look: [-0.3, 0.1], blink: 0.5 }, { t: 4.1, torch: 0, phone: 1, walk: 1, look: [0.15, 0.05], blink: 1 },
  { t: 5.9, torch: 0.5, phone: 0, walk: 0.25, look: [-0.1, -0.2], blink: 0 }, { t: 7.2, torch: 0.7, phone: 1, walk: 0.75, look: [0.3, 0.3], blink: 0.2 }];
/* draws V74 and the new chars.js side by side in the page and counts the pixels that differ (two sizes: 24, the far
   figure, and 90, big enough for her face, which chars.js draws from scale 70) */
async function cmp(page, pose, worryArg, flag) {
  return page.evaluate(({ OLD, NEW, pose, worryArg, flag }) => {
    const paint = (src, p, f) => { window.SearchChars = undefined; (0, eval)(src); if (f != null) window.SearchChars.worry = f; const out = [];
      for (const k of [24, 90]) { const c = document.createElement('canvas'); c.width = 400; c.height = 420; const x = c.getContext('2d');
        x.translate(200, 60 + k); x.scale(k, k); window.SearchChars.nuala(x, p); out.push(x.getImageData(0, 0, 400, 420).data); }
      return out; };
    const o = paint(OLD, pose, null), nw = paint(NEW, worryArg == null ? pose : Object.assign({ worry: worryArg }, pose), flag);
    let d = 0; for (let j = 0; j < o.length; j++) for (let i = 0; i < o[j].length; i += 4) if (o[j][i] !== nw[j][i] || o[j][i + 1] !== nw[j][i + 1] || o[j][i + 2] !== nw[j][i + 2] || o[j][i + 3] !== nw[j][i + 3]) d++;
    return d;
  }, { OLD, NEW, pose, worryArg, flag });
}
(async () => {
  const b = await chromium.launch(); const page = await b.newPage(); await page.setContent('<html><body></body></html>');
  let d0 = 0, dn = 0, d1 = 0;
  for (const p of POSES) {
    d0 += await cmp(page, p, 0, null);
    dn += await cmp(page, p, null, null);
    d1 += await cmp(page, p, 1, null) + await cmp(page, p, null, 1);
  }
  must(d0 === 0, 'W1 worry 0: zero changed pixels against V74 over ' + POSES.length + ' poses at 2 sizes (' + d0 + ')');
  must(dn === 0, 'W1 no worry flag: zero changed pixels against V74 (' + dn + ')');
  must(d1 > 200, 'CONTROL W1 worry 1 changes the face (' + d1 + ' pixels)');
  await b.close();
  /* W2 gate 15, read from the source */
  const calls = [];
  for (const f of fs.readdirSync(HOUR).filter(x => x.endsWith('.js'))) {
    const t = fs.readFileSync(path.join(HOUR, f), 'utf8');
    t.split('\n').forEach((l, i) => { if (/\bC\.nuala\(|SearchChars\.nuala\(/.test(l)) calls.push({ f, i, l, barn: /THE CLOSE|barn/i.test(t.split('\n').slice(Math.max(0, i - 16), i).join('\n')) }); });
  }
  const bad = cs => cs.filter(c => { const w = (c.l.match(/worry:\s*([\d.]+)/) || [])[1]; return c.barn ? w !== '0' : w !== '1'; });
  must(calls.length >= 3 && bad(calls).length === 0, 'W2 gate 15: ' + calls.length + ' Nuala calls; snow scenes worry 1, the barn worry 0' + (bad(calls).length ? ' — wrong: ' + bad(calls).map(c => c.f + ':' + (c.i + 1)).join(', ') : ''));
  const ch = fs.readFileSync(path.join(HOUR, 'chapters.js'), 'utf8');
  must(/worry\(id === 'close' \? 0 : 1\)/.test(ch) && /worry\(0\)/.test(ch), 'W2 the film and every snow step set SearchChars.worry = 1; the close sets 0');
  const planted = calls.concat([{ f: 'planted', i: 0, l: "C.nuala(c, { t: t, worry: 0 });", barn: false }]);
  must(bad(planted).length === 1, 'CONTROL W2 a planted smiling snow-scene Nuala is caught');
  console.log('\nj2l5-worry: ' + (fails ? 'FAIL · ' + fails + ' of ' + n : 'PASS · ' + n + ' checks'));
  process.exit(fails ? 1 : 0);
})();
