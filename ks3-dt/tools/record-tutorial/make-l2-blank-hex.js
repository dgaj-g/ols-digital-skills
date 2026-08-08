/* make-l2-blank-hex.js - build the BLANK micro:bit program pupils flash at the
 * end of Lesson 2, so the next class does not inherit a running program.
 *
 * DAMIEN, 8 Aug 2026: "the next class, when they connect their microbit and
 * potentially press a few buttons will be able to see an exiting program?" Yes -
 * holding the reset button powers the device off, it does not erase it, and no
 * button on a micro:bit can. The only way to clear one is to flash something
 * else. Worse than confusion: a pupil could press B during the ladder, see LAST
 * class's happy face and believe her own program worked when she never flashed
 * it - and the ladder rests on the micro:bit being an honest judge.
 *
 * So the file is generated from the REAL MakeCode editor with an empty program
 * and downloaded exactly as a pupil would, rather than hand-assembled: a hex I
 * wrote myself could brick a board, and this one is provably the editor's own
 * output.
 *
 *   node make-l2-blank-hex.js
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('./node_modules/playwright');
const { MakeCode, sleep } = require('./lib/driver');

const OUT = path.join(__dirname, '..', '..', 'platform', 'assets', 'files', 'l2', 'clear-my-microbit.hex');

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const log = (...a) => console.log('[hex]', ...a);
  const drv = new MakeCode(page, log);

  await drv.openEditor();
  await sleep(4000);
  await drv.dismissDialogs();
  await drv.setProgram('\n');          // an EMPTY program: nothing runs, LEDs stay dark
  await sleep(3500);
  await drv.dismissDialogs();

  const text = await page.evaluate(() => {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();
    return Array.from(document.querySelectorAll('.blocklyBlockCanvas .blocklyText')).map(e => norm(e.textContent)).join('|');
  });
  log('blocks on canvas: ' + JSON.stringify(text));

  /* MakeCode's Download opens a two-step pairing wizard. With no device attached
     the way out is "Download as File", which only appears on step 2 - so click
     Download, then Next, then the file option. */
  const btn = await page.waitForSelector('#downloadArea button, .download-button, [aria-label*="Download" i]', { timeout: 30000 });
  await btn.click();
  await sleep(3000);
  let download = null;
  for (let step = 1; step <= 3 && !download; step++) {
    const pending = page.waitForEvent('download', { timeout: 7000 }).catch(() => null);
    const next = await page.$('button:has-text("Download as File"), a:has-text("Download as File"), button:has-text("Next")');
    if (next) await next.click();
    download = await pending;
    if (!download) await sleep(2000);
  }
  if (!download) throw new Error('the Download-as-File step never produced a file');
  await download.saveAs(OUT);
  await browser.close();

  const buf = fs.readFileSync(OUT);
  const head = buf.slice(0, 200).toString('ascii');
  const lines = buf.toString('ascii').split(/\r?\n/).filter(Boolean);
  const okIntel = head.startsWith(':') && lines.every(l => l.startsWith(':'));
  const okEnd = lines[lines.length - 1].trim().toUpperCase() === ':00000001FF';
  console.log('wrote ' + OUT + '  (' + buf.length + ' bytes, ' + lines.length + ' records)');
  console.log(okIntel ? 'VERIFIED: every line is an Intel HEX record' : 'WARNING: not Intel HEX');
  console.log(okEnd ? 'VERIFIED: ends with the end-of-file record :00000001FF' : 'WARNING: missing EOF record');
  process.exit(okIntel && okEnd ? 0 : 1);
})().catch(e => { console.error('HEX BUILD FAILED:', e.message); process.exit(1); });
