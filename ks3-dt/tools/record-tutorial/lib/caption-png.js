/* caption-png.js - render the film's own lower-third caption as a transparent PNG.
 *
 * DAMIEN, 3 Aug 2026: his real micro:bit-connection footage is spliced into the
 * L2 film, with his own timed pop-up texts over it. Those pop-ups must look like
 * every other caption in the film, so they are rendered by the SAME browser with
 * the SAME font and the SAME CSS as cinema.js's showCaption - not approximated
 * with ffmpeg drawtext - and then overlaid frame-accurately.
 *
 * Any change to the caption style in cinema.js must be mirrored here.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const GOLD = '#E4B824';
const FONT_B64 = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'platform', 'assets', 'fonts', 'space-grotesk.woff2')
).toString('base64');

const W = 1280, H = 720;

/* texts: [{ id, html }] -> writes <outDir>/<id>.png (full 1280x720, alpha) */
async function renderCaptions(texts, outDir, opts) {
  opts = opts || {};
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent('<!doctype html><html><body style="margin:0;background:transparent"></body></html>');
  await page.evaluate(async (b64) => {
    const bin = atob(b64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const ff = new FontFace('CineGrotesk', buf.buffer, { weight: '300 800' });
    await ff.load();
    document.fonts.add(ff);
    await document.fonts.ready;
  }, FONT_B64);

  const written = [];
  for (const t of texts) {
    await page.evaluate(([html, gold, pos]) => {
      document.body.innerHTML = '';
      const FONT = "'CineGrotesk','Trebuchet MS','Segoe UI',Calibri,'Helvetica Neue',Arial,sans-serif";
      const wrap = document.createElement('div');
      Object.assign(wrap.style, {
        position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        bottom: pos === 'top' ? '' : '26px', top: pos === 'top' ? '22px' : '',
        maxWidth: '900px', minWidth: '340px',
        display: 'flex', alignItems: 'stretch',
        borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 10px 34px rgba(9,20,40,0.5)'
      });
      const bar = document.createElement('div');
      Object.assign(bar.style, { width: '9px', background: gold, flexShrink: '0' });
      wrap.appendChild(bar);
      const body = document.createElement('div');
      Object.assign(body.style, {
        background: 'rgba(18,42,79,0.96)', padding: '17px 30px 18px 24px',
        color: '#FFFFFF', fontFamily: FONT, fontSize: '25px', lineHeight: '1.42',
        fontWeight: '500', letterSpacing: '0.2px'
      });
      body.innerHTML = html;
      Array.from(body.querySelectorAll('b')).forEach(b => { b.style.color = gold; b.style.fontWeight = '700'; });
      wrap.appendChild(body);
      document.body.appendChild(wrap);
    }, [t.html, GOLD, t.pos || 'bottom']);
    await page.waitForTimeout(60);
    const out = path.join(outDir, t.id + '.png');
    await page.screenshot({ path: out, omitBackground: true });
    written.push(out);
    if (opts.log) opts.log('caption png: ' + t.id);
  }
  await browser.close();
  return written;
}

module.exports = { renderCaptions, W, H };
