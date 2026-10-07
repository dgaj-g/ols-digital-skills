/* usage: node frame-hash.js [page] -- prints one sha1 of the canvas per frozen frame of chapter 1.
   Run before and after any change near chapter 1; the two lists must be identical. */
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const crypto = require('crypto');
const Q = ['phase=film&ft=3', 'phase=film&ft=12', 'phase=film&ft=30', 'phase=film&ft=50', 'phase=typing&lines=5&tc=20', 'phase=typing&lines=9&tc=55',
  'phase=fall&xt=2', 'phase=fall&xt=8', 'phase=fall&xt=20', 'phase=fall&xt=28', 'phase=win&wt=3', 'phase=learn&lt=12', 'phase=learn&lt=30&defn=3',
  'phase=go2&calls=3&tc=12', 'phase=safe&wt=5', 'phase=why&n=1', 'phase=why&n=2', 'phase=why&n=3', 'phase=end', 'phase=end&of=win'];
(async () => {
  const page = process.argv[2] || require('./hour-walk.js').ART;
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  /* one warm-up load first: on a cold server the very first frame can be drawn before the fonts arrive (seen 7 Oct 2026) */
  await p.goto(page + '?freeze=1&' + Q[0]); await p.waitForFunction(() => document.title === 'ready', null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(800);
  for (const q of Q) {
    await p.goto('about:blank');
    await p.goto(page + '?freeze=1&' + q);
    await p.waitForFunction(() => document.title === 'ready', null, { timeout: 8000 }).catch(() => errs.push('never ready: ' + q));
    await p.waitForTimeout(500);
    const cv = await p.evaluate(() => document.getElementById('c').toDataURL());
    console.log(crypto.createHash('sha1').update(cv).digest('hex').slice(0, 16) + '  ' + q);
  }
  if (errs.length) console.log('ERRORS: ' + errs.join(' | '));
  await b.close();
})();
