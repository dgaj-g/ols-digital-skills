/* make-drive-all.js — build the shared "saving your program into Google Drive"
   film from DAMIEN'S OWN SCREEN RECORDING (DFM 187).

   His instruction, 10 Aug 2026: "I've recorded a video that shows how to get the
   hex file from the downloads folder to the drive folder. To make it quicker,
   just have a title slide at the start of the video that says the following:
   [the five lines below, verbatim]. Then once you've shown this for about 10
   seconds, move on the video. ... This video needs to be embedded into Lesson 2
   and also as a reminder in this lesson via a Show me How button ... the program
   that I download in the video is just a simple generic one that doesn't feature
   in any of these lessons, so maybe say somewhere that it is just an example and
   not to copy it."

   WHAT THIS DOES, and why each choice:
   - The title card carries HIS FIVE LINES WORD FOR WORD, in the film pipeline's
     own card style (navy, gold, the vendored film font) so it looks like every
     other card on the platform.
   - It HOLDS FOR 15 SECONDS, not his "about 10". Reported to him, not done
     quietly (the DFM 141c precedent): it is ~60 words, and a slide that leaves
     before an eleven-year-old has finished reading teaches nothing. The player
     has a pause button for anyone who wants longer.
   - HIS AUDIO IS STRIPPED. Every film on this platform is silent (DFM 139), and
     a lone talking film would be the odd one out in a room of 30 machines.
   - His recording is 1628x1080 (a 3:2 school monitor). It is scaled to 720 high
     and PILLARBOXED onto 1280x720 in the film's own navy, so it sits in the same
     frame as every other film instead of being stretched.
   - The example-program warning is BURNED INTO THE FILM over the download
     moment, so it travels with the film wherever it is embedded — and it is
     pinned to the TOP of the frame because the Download button and the program
     are at the bottom left, and a caption must never cover the thing it points
     at (DFM 141a).

   Usage: node make-drive-all.js
   Output: ks3-dt/platform/assets/video/shared/save-to-drive.mp4 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('./node_modules/playwright');
const { renderCaptions } = require('./lib/caption-png');

const NAVY = '#1A3A6B', NAVY_DEEP = '#122A4F', GOLD = '#E4B824';
const W = 1280, H = 720, FPS = 30, CRF = '23';
const TITLE_SECONDS = 15;

const SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/Drive All.mp4');
const OUT_DIR = path.join(__dirname, '..', '..', 'platform', 'assets', 'video', 'shared');
const OUT = path.join(OUT_DIR, 'save-to-drive.mp4');
const TMP = path.join(__dirname, 'out', 'drive-all');

/* THE DOWNLOAD MOMENT, found by scanning his footage frame by frame rather than
   guessed: the `test` program and the purple Download button are on screen from
   ~49s, the click lands ~54s, and Chrome's download-history popup opens ~59s.
   The caption sits across that, and stops before the popup so it covers nothing. */
const CAP_FROM = 49, CAP_TO = 57;

const FONT_B64 = fs.readFileSync(
  path.join(__dirname, '..', '..', 'platform', 'assets', 'fonts', 'space-grotesk.woff2')
).toString('base64');

/* HIS FIVE LINES. Verbatim — do not tidy, do not shorten (DFM 94/129). */
const TITLE_HEAD = 'This video will show you how to:';
const TITLE_LINES = [
  'Open a new tab and access your Google Drive',
  'Create a new folder called School (do this only if you don’t have one yet)',
  'Create a new folder inside School called DT Work (do this only if you don’t have one yet)',
  'Download a micro:bit program to the Downloads folder',
  'Drag the program into the DT Work folder'
];
const EXAMPLE_CAPTION =
  'This program is just an example &mdash; <b>you will save your own.</b>';

async function renderTitle(file) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent('<!doctype html><html><body style="margin:0"></body></html>');
  await page.evaluate(async (b64) => {
    const bin = atob(b64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const ff = new FontFace('CineGrotesk', buf.buffer, { weight: '300 800' });
    await ff.load(); document.fonts.add(ff); await document.fonts.ready;
  }, FONT_B64);
  await page.evaluate(([head, lines, navy, navyDeep, gold]) => {
    const FONT = "'CineGrotesk','Trebuchet MS','Segoe UI',Calibri,'Helvetica Neue',Arial,sans-serif";
    Object.assign(document.body.style, {
      margin: '0', width: '1280px', height: '720px',
      background: 'radial-gradient(circle at 50% 38%, ' + navy + ' 0%, ' + navyDeep + ' 78%)',
      fontFamily: FONT, color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    });
    const kicker = document.createElement('div');
    Object.assign(kicker.style, {
      fontSize: '19px', letterSpacing: '4.5px', color: gold, fontWeight: '700', marginBottom: '18px'
    });
    kicker.textContent = 'OLS DIGITAL TECHNOLOGY';
    document.body.appendChild(kicker);
    const h = document.createElement('div');
    Object.assign(h.style, { fontSize: '40px', fontWeight: '700', textAlign: 'center', marginBottom: '30px' });
    h.textContent = head;                    /* plain text: an entity would show raw (DFM 166) */
    document.body.appendChild(h);
    const box = document.createElement('div');
    Object.assign(box.style, { display: 'flex', flexDirection: 'column', gap: '15px', width: '980px' });
    lines.forEach(function (ln, i) {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '18px' });
      const n = document.createElement('div');
      Object.assign(n.style, {
        width: '40px', height: '40px', borderRadius: '50%', background: gold, color: navyDeep,
        fontWeight: '800', fontSize: '21px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: '0'
      });
      n.textContent = String(i + 1);
      const tx = document.createElement('div');
      Object.assign(tx.style, { fontSize: '25px', lineHeight: '1.35', fontWeight: '450' });
      tx.textContent = ln;
      row.appendChild(n); row.appendChild(tx); box.appendChild(row);
    });
    document.body.appendChild(box);
  }, [TITLE_HEAD, TITLE_LINES, NAVY, NAVY_DEEP, GOLD]);
  await page.waitForTimeout(120);
  await page.screenshot({ path: file });
  await browser.close();
}

function probe(file, entries) {
  return execFileSync('ffprobe', ['-v', 'error', '-show_entries', entries,
    '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' }).trim();
}

(async () => {
  if (!fs.existsSync(SRC)) throw new Error('his recording is not where the spec says: ' + SRC);
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const titlePng = path.join(TMP, 'title.png');
  await renderTitle(titlePng);
  console.log('title card rendered (his five lines, verbatim)');

  await renderCaptions([{ id: 'example', html: EXAMPLE_CAPTION, pos: 'top' }], TMP, { log: console.log });
  const capPng = path.join(TMP, 'example.png');

  /* 1. the title card as its own clip */
  const titleMp4 = path.join(TMP, 'title.mp4');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-loop', '1', '-t', String(TITLE_SECONDS),
    '-i', titlePng, '-vf', 'fps=' + FPS + ',format=yuv420p', '-c:v', 'libx264',
    '-preset', 'slow', '-crf', CRF, titleMp4]);

  /* 2. his footage: silent, pillarboxed into the film's frame, caption burned on */
  const bodyMp4 = path.join(TMP, 'body.mp4');
  const vf = [
    'scale=-2:' + H,
    'pad=' + W + ':' + H + ':(ow-iw)/2:0:color=' + NAVY,
    'fps=' + FPS,
    'format=yuv420p'
  ].join(',');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y',
    '-i', SRC, '-i', capPng,
    '-filter_complex', '[0:v]' + vf + '[v];[v][1:v]overlay=0:0:enable=\'between(t,' +
      CAP_FROM + ',' + CAP_TO + ')\'[out]',
    '-map', '[out]', '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, bodyMp4]);

  /* 3. join them */
  const list = path.join(TMP, 'concat.txt');
  fs.writeFileSync(list, "file '" + titleMp4 + "'\nfile '" + bodyMp4 + "'\n");
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
    '-i', list, '-c', 'copy', '-movflags', '+faststart', OUT]);

  const dur = parseFloat(probe(OUT, 'format=duration'));
  const streams = probe(OUT, 'stream=codec_type').split('\n').filter(Boolean);
  const size = fs.statSync(OUT).size / 1048576;
  /* the promises this file makes to the cards that embed it, asserted here so a
     rebuild cannot quietly break them */
  if (streams.length !== 1 || streams[0] !== 'video') {
    throw new Error('the film must be silent and video-only, got: ' + streams.join('+'));
  }
  if (dur < TITLE_SECONDS + 80) throw new Error('the film is too short - his footage did not make it in: ' + dur);
  console.log('WROTE ' + OUT);
  console.log('  ' + Math.floor(dur / 60) + ':' + String(Math.round(dur % 60)).padStart(2, '0') +
    '  (' + dur.toFixed(1) + 's, ' + size.toFixed(2) + ' MB, video only)');
  console.log('  title card held ' + TITLE_SECONDS + 's; example caption ' +
    (TITLE_SECONDS + CAP_FROM) + 's..' + (TITLE_SECONDS + CAP_TO) + 's of the finished film');
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
