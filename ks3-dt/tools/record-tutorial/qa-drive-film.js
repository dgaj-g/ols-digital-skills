/* qa-drive-film.js — the save-to-Drive film, on both cards (DFM 187).
 *
 * DAMIEN, 10 Aug 2026: "I've recorded a video that shows how to get the hex file
 * from the downloads folder to the drive folder... This video needs to be
 * embedded into Lesson 2 and also as a reminder in this lesson via a Show me How
 * button in the appropriate card/location... the program that I download in the
 * video is just a simple generic one that doesn't feature in any of these
 * lessons, so maybe say somewhere that it is just an example and not to copy it."
 *
 * What this guards, and why each one is here:
 *   - the FILE really plays. A card promising a film, over a src that 404s, is
 *     the worst possible version of this feature - so the video element is
 *     mounted in a real browser and its duration is read off the decoded file
 *     (DFM 146b: measure the rendered thing, never the source).
 *   - the film is SILENT. Every other film on this platform is, and one talking
 *     card in a room of thirty machines would be chaos.
 *   - the example-program warning appears on BOTH cards, naming HER file each
 *     time - make-it-move.hex in Lesson 2, scoreboard.hex in Lesson 3. "Not
 *     this one" is only half an instruction without "this one instead".
 *   - Lesson 2 shows it OPEN (it is where saving to Drive is taught) and Lesson
 *     3 behind "Show me how" (there it is a reminder). One click reveals it and
 *     the button goes - she chose to be shown, so she is not left toggling.
 *   - and the artifact card WITHOUT a film renders as it always did.
 *
 * Needs the digital-skills-l4 server on :8096.  node qa-drive-film.js */
const { chromium } = require('./node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const FILM = path.join(__dirname, '../../platform/assets/video/shared/save-to-drive.mp4');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };
const control = (f, m) => { console.log((f ? '  PASS ' : '  FAIL ') + 'CONTROL: ' + m); if (!f) FAILS.push('CONTROL ' + m); };

/* mount an artifact chunk straight from real content */
async function mountArtifact(page, file, id) {
  return page.evaluate(async ([f, cid]) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const lesson = await (await fetch('/ks3-dt/content/j1/lessons/' + f)).json();
    const chunk = lesson.chunks.find(c => c.id === cid);
    if (!chunk) return { error: 'no chunk ' + cid };
    document.body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:22px;max-width:820px;margin:0 auto';
    const host = document.createElement('div');
    host.className = 'chunk-host'; host.id = 'chunk-host';
    wrap.appendChild(host); document.body.appendChild(wrap);
    window.Engines.artifact.mount(host, chunk, {
      draft: {}, review: false, chunk, lessonEntry: { num: '2' },
      saveEvent() {}, next() {}, call: () => new Promise(() => {}),
      awardBadge: () => Promise.resolve()
    });
    await sleep(500);
    return { ok: true };
  }, [file, id]);
}
const filmState = (page) => page.evaluate(() => {
  const v = document.querySelector('.af-demo-video');
  if (!v) return null;
  return new Promise(res => {
    const done = () => res({
      src: v.getAttribute('src'), duration: v.duration,
      w: v.videoWidth, h: v.videoHeight,
      err: v.error ? v.error.code : 0,
      len: (document.querySelector('.af-demo-len') || {}).textContent || ''
    });
    if (v.readyState >= 1) return done();
    v.addEventListener('loadedmetadata', done, { once: true });
    v.addEventListener('error', done, { once: true });
    setTimeout(done, 8000);
  });
});

(async () => {
  console.log('== 1. the film file itself ==');
  check(fs.existsSync(FILM), 'the shared film exists at assets/video/shared/save-to-drive.mp4');
  const streams = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type',
    '-of', 'default=noprint_wrappers=1:nokey=1', FILM], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  check(streams.length === 1 && streams[0] === 'video',
    'it is SILENT — video only, like every other film on this platform (' + streams.join('+') + ')');
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', FILM], { encoding: 'utf8' }).trim());
  check(dur > 100, 'his whole recording made it in, behind the title card (' + dur.toFixed(1) + 's)');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  /* WAIT FOR THE HUB TO FINISH BOOTING before replacing the page. Mounting a
     chunk into a wiped body while app.js is still walking its own start-up
     chain makes showHub throw on elements this harness deleted - an error the
     app does not have and no pupil could ever see. A harness that reports a
     fault it caused itself is worse than no harness (DFM 146a). */
  await page.waitForSelector('.tile', { timeout: 20000 }).catch(() => {});
  await sleep(1800);

  console.log('\n== 2. Lesson 2: taught here, so the film is OPEN on the card ==');
  let m = await mountArtifact(page, 'j1-02.json', 'bank');
  check(!m.error, 'the Bank Your Build card mounts');
  const l2Btn = await page.evaluate(() => !!document.querySelector('.af-demo-btn'));
  check(!l2Btn, 'there is NO "Show me how" button — she does not have to ask for it here');
  const l2 = await filmState(page);
  check(!!l2, 'the player is on the card from the moment it opens');
  check(l2 && l2.err === 0 && l2.duration > 100,
    'and the file really decodes in a browser: ' + (l2 ? l2.duration.toFixed(1) + 's, ' + l2.w + 'x' + l2.h : 'NO METADATA') +
    ' — a card promising a film over a broken src is worse than no card');
  check(l2 && /1 minute 50 seconds|1 minute 4[0-9] seconds|2 minutes/.test(l2.len),
    'the length line is MEASURED off the file, not typed into content: "' + (l2 ? l2.len.trim() : '') + '"');
  const l2note = await page.evaluate(() => (document.querySelector('.af-demo-note') || {}).textContent || '');
  check(/just an example/.test(l2note) && /make-it-move\.hex/.test(l2note),
    'the note warns off the example AND names her own file: "' + l2note.trim().slice(0, 70) + '…"');
  const l2steps = await page.evaluate(() => document.querySelectorAll('.af-steps li').length);
  check(l2steps === 3, 'the three written steps are still there underneath, for anyone the film fails (' + l2steps + ')');
  const l2run = await page.evaluate(() => {
    const b = document.querySelector('.rung-actions .primary-btn');
    return b ? (b.textContent || '').trim() : '';
  });
  check(/Run the HQ Inspection/.test(l2run),
    'and the check button is still found correctly, even though the film now sits above it: "' + l2run + '"');

  console.log('\n== 3. Lesson 3: a reminder, so it waits behind "Show me how" ==');
  m = await mountArtifact(page, 'j1-03.json', 'rig');
  check(!m.error, 'the Register Your Rig card mounts');
  const askText = await page.evaluate(() => {
    const b = document.querySelector('.af-demo-btn');
    return b ? (b.textContent || '').trim() : '';
  });
  check(askText === 'Show me how', 'it offers a "Show me how" button (' + JSON.stringify(askText) + ')');
  check(await page.evaluate(() => !document.querySelector('.af-demo-video')),
    'and the film is NOT playing on arrival — a pupil who remembers is not made to sit through it');
  await page.evaluate(() => document.querySelector('.af-demo-btn').click());
  await sleep(700);
  const l3 = await filmState(page);
  check(!!l3 && l3.err === 0 && l3.duration > 100, 'one click puts the same film on screen, and it decodes');
  check(await page.evaluate(() => !document.querySelector('.af-demo-btn')),
    'the button is gone rather than left as a toggle — she asked to be shown, and she was');
  const l3note = await page.evaluate(() => (document.querySelector('.af-demo-note') || {}).textContent || '');
  check(/scoreboard\.hex/.test(l3note) && !/make-it-move/.test(l3note),
    'and the note names HER file for THIS lesson: "' + l3note.trim().slice(0, 70) + '…"');
  check(l2 && l3 && l2.src === l3.src, 'both lessons serve the SAME file — one film, one home (DFM 144)');

  console.log('\n== 4. CONTROL: an artifact card with no film is untouched ==');
  m = await mountArtifact(page, 'j1-05.json', 'ship');
  const none = await page.evaluate(() => ({
    demo: document.querySelectorAll('.af-demo').length,
    ask: document.querySelectorAll('.af-demo-ask').length,
    steps: document.querySelectorAll('.af-steps li').length,
    run: (document.querySelector('.rung-actions .primary-btn') || {}).textContent || ''
  }));
  control(none.demo === 0 && none.ask === 0,
    "Lesson 5's ship desk grows no film block at all — the field is gated, not global");
  check(none.steps > 0 && String(none.run).trim().length > 0,
    'and it still renders its steps and its check button (' + none.steps + ' steps, "' + String(none.run).trim() + '")');

  console.log('\n  page errors: ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : 'NONE'));
  check(errs.length === 0, 'zero page errors');

  console.log('\n=========================================');
  console.log(FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL SAVE-TO-DRIVE FILM CHECKS PASSED');
  await browser.close();
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error('HARNESS FAILED: ' + e.message); process.exit(1); });
