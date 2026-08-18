/* capture-j2-l2-blocks.js — photograph J2 Lesson 2's six Scratch blocks IN
 * SCRATCH, out of the real editor, at the size the snap card renders them.
 *
 * WHY. The snap desk asks a pupil to look at a block and find its Python twin,
 * so the block on the card has to be the block she has really seen — Scratch's
 * own colour, its own shape, its own wording. Drawing them would be my memory
 * of Scratch (rule 35), and his standing rule is to use the real thing
 * (feedback_activity_images). Same technique and the same reason as the
 * micro:bit rung pictures (DFM 152c).
 *
 * WHAT IT PROVES BEFORE IT WRITES. A capture may only be taken while the thing
 * it names is provably on screen (DFM 225b): each stack is matched by its own
 * opcode text before its box is measured, the box must be a sane size, and every
 * file written is TYPE-CHECKED as a PNG afterwards (DFM 243 — an exit code of 0
 * is a statement about the transfer, never about the thing transferred).
 *
 *   node capture-j2-l2-blocks.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');
const { ScratchDriver, sleep } = require('./lib/driver');

const KIT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/sb3/j2-l2-blocks.sb3');
const OUT = path.join(__dirname, '..', '..', 'platform', 'assets', 'img', 'j2', 'blocks');

/* authored order = top-to-bottom on the canvas, and each row names the text it
   must contain, so a stack can never be photographed under another one's name */
const WANT = [
  { id: 'say-hello',  must: /say/i,    also: /Hello!/ },
  { id: 'set-score',  must: /set/i,    also: /score/ },
  { id: 'change-score', must: /change/i, also: /score/ },
  { id: 'set-name',   must: /set/i,    also: /name/ },
  { id: 'say-join',   must: /say/i,    also: /Score:/ },
  { id: 'say-score',  must: /say/i,    also: /score/ }
];

(async () => {
  if (!fs.existsSync(KIT)) { console.error('kit missing: ' + KIT + ' — run sb3/build-j2-l2-blocks.js first'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  /* a Windows user agent, because a film or a capture shows the school's own
     machines and not this Mac (DFM 169's one-place law) */
  const ctx = await browser.newContext({
    viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  });
  const page = await ctx.newPage();
  const log = (...a) => console.log('[blocks]', ...a);
  const drv = new ScratchDriver(page, log);

  await drv.openEditor();
  await drv.loadProject(KIT);
  await sleep(4000);
  await drv.dismissDialogs();

  const boxes = await page.evaluate(() => {
    const stacks = Array.from(document.querySelectorAll('.blocklyBlockCanvas > g.blocklyDraggable'))
      .filter(g => !g.closest('.blocklyFlyout'));
    return stacks.map(g => {
      const r = g.getBoundingClientRect();
      const text = Array.from(g.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' ');
      return { x: r.x, y: r.y, w: r.width, h: r.height, text: text };
    }).filter(b => b.w > 40 && b.h > 18).sort((a, b) => a.y - b.y);
  });
  log('found ' + boxes.length + ' top-level stacks');
  boxes.forEach((b, i) => log('  ' + i + ' y=' + Math.round(b.y) + ' ' + Math.round(b.w) + 'x' + Math.round(b.h) + '  "' + b.text + '"'));

  if (boxes.length !== WANT.length) {
    console.error('EXPECTED ' + WANT.length + ' stacks, saw ' + boxes.length + ' — refusing to photograph anything (DFM 225b).');
    await browser.close(); process.exit(1);
  }

  const PAD = 8;
  const written = [];
  for (let i = 0; i < WANT.length; i++) {
    const w = WANT[i], b = boxes[i];
    if (!w.must.test(b.text) || !w.also.test(b.text)) {
      console.error('STACK ' + i + ' does not match ' + w.id + ': "' + b.text + '" — aborting rather than mislabelling a picture.');
      await browser.close(); process.exit(1);
    }
    const file = path.join(OUT, w.id + '.png');
    await page.screenshot({
      path: file,
      clip: { x: Math.max(0, b.x - PAD), y: Math.max(0, b.y - PAD), width: b.w + PAD * 2, height: b.h + PAD * 2 }
    });
    written.push({ id: w.id, file: file, text: b.text, w: Math.round(b.w), h: Math.round(b.h) });
    log('wrote ' + w.id + '.png  (' + Math.round(b.w) + 'x' + Math.round(b.h) + ' css px, 2x)');
  }
  await browser.close();

  /* DFM 243: the bytes, not the filename and not the exit code */
  let bad = 0;
  written.forEach(x => {
    const t = execSync('file -b ' + JSON.stringify(x.file)).toString().trim();
    const sz = fs.statSync(x.file).size;
    const ok = /PNG image data/.test(t) && sz > 1200;
    console.log((ok ? '  PASS ' : '  FAIL ') + x.id + '.png — ' + sz + ' bytes — ' + t.slice(0, 48));
    if (!ok) bad++;
  });
  /* the manifest the lesson and qa-pyrun both read, so a picture and the card
     that shows it can never drift apart unnoticed */
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
    built: 'j2-l2 snap desk',
    source: 'sb3/build-j2-l2-blocks.js -> j2-l2-blocks.sb3, photographed in scratch.mit.edu',
    blocks: written.map(x => ({ id: x.id, text: x.text, cssWidth: x.w, cssHeight: x.h }))
  }, null, 1) + '\n');
  console.log(bad ? ('FAILED: ' + bad + ' file(s) are not PNGs') : 'ALL SIX BLOCKS CAPTURED AND TYPE-CHECKED');
  process.exit(bad ? 1 : 0);
})();
