/* make-side-show.js — render Fred and Margo to transparent rasters.

   Runs the same headless chromium the films use, poses lib/side-show/ss.js one
   frame at a time, screenshots each frame with omitBackground so the alpha is
   real, downsamples, and stitches each state into an animated .webp.

   IT PROVES ITS OWN OUTPUT. Every frame is probed for painted pixels before it
   is kept and every finished webp is measured for size and frame count, because
   a capture that quietly saved 30 empty squares and a capture that worked look
   identical from the outside (DFM 243, DFM 146b).

     node make-side-show.js            build everything
     node make-side-show.js --check    re-measure what is already on disk  */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const sharp = require(path.join(require('child_process')
  .execSync('npm root -g').toString().trim(), 'sharp'));

const ROOT = __dirname;
const OUT = path.join(ROOT, '..', '..', 'platform', 'assets', 'img');
const TMP = path.join(ROOT, '.ss-frames');

/* the five states, and how each one is timed. A still picture of a character is
   a dead character (his word for the last set was that they must BLINK), so
   every state is a loop, even the ones that only breathe. */
const STATES = {
  idle:       { frames: 30, ms: 80 },
  typing:     { frames: 20, ms: 70 },
  delighted:  { frames: 14, ms: 100, q: 74 },
  offended:   { frames: 30, ms: 80 },
  devastated: { frames: 26, ms: 100 }
};

/* what each character ships, and under what filename the content already asks
   for it. Margo is a critic: her delight IS the five-star rave, so the rave file
   is the delighted render. Nothing here invents a path — these are the ones
   j2-03.json and j3-03.json already name. */
const CAST = [
  { who: 'fred',  dir: path.join(OUT, 'j2', 'fred'),
    files: { idle: 'fred-idle', typing: 'fred-typing', delighted: 'fred-delighted',
             offended: 'fred-offended', devastated: 'fred-devastated' } },
  { who: 'margo', dir: path.join(OUT, 'j3', 'margo'),
    files: { idle: 'margo-idle', typing: 'margo-typing', delighted: 'margo-rave',
             offended: 'margo-offended' } }
];

const SHIP_W = 540;          /* about 4x the box they are shown in, for retina */
const SHIP_H = 588;

/* WHERE THE PICTURE ACTUALLY ENDS UP, and it took a wrong number to notice:
   the panel is `.ss-figure`/`.ss-img` in style.css at 132 x 150, the file is
   540 x 588, and `object-fit: contain` takes the SMALLER of the two ratios. So
   a length measured in the 900x980 render becomes, on a pupil's screen:
       render px  ->  file px    (588/980)
       file px    ->  screen px  (min(132/540, 150/588) = 0.2444)
   The first cut of this gate multiplied by 260/980 for a 260-pixel panel that
   does not exist anywhere in the stylesheet, and every number it printed was
   about 80 per cent too big. A measurement that is not the real one is just a
   number (DFM 199). */
const PANEL_W = 132, PANEL_H = 150;
const TO_SCREEN = (SHIP_H / 980) * Math.min(PANEL_W / SHIP_W, PANEL_H / SHIP_H);
const PANEL_FIT = Math.min(PANEL_W / SHIP_W, PANEL_H / SHIP_H) * SHIP_H;   /* drawn height */

function sh(cmd, args) { return execFileSync(cmd, args, { encoding: 'utf8' }); }

(async function main() {
  const checkOnly = process.argv.includes('--check');
  const report = [];

  if (!checkOnly) {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 900, height: 980 },
                                         deviceScaleFactor: 1 });
    page.on('console', m => { if (m.type() === 'error') console.log('  [page error]', m.text()); });
    await page.goto('file://' + path.join(ROOT, 'lib', 'side-show', 'index.html'));
    await page.waitForFunction('window.ss && window.ss.ready');
    await page.evaluate(() => window.ss.ready);

    for (const member of CAST) {
      fs.mkdirSync(member.dir, { recursive: true });
      for (const [state, base] of Object.entries(member.files)) {
        const spec = STATES[state];
        const shots = [];
        let minPaint = 1e9, measured = null;
        for (let f = 0; f < spec.frames; f++) {
          const t = f / spec.frames;
          await page.evaluate(([w, s, tt]) => window.ss.set(w, s, tt), [member.who, state, t]);
          const probe = await page.evaluate(() => window.ss.probe());
          minPaint = Math.min(minPaint, probe.opaqueOf1600);
          if (f === 0) {
            /* LEGIBILITY, measured on the frame that was actually rendered. The
               shipped picture is about 260 pixels tall, so a feature has to be a
               real fraction of the character to survive the shrink -- and the
               first cut of this rig cropped the aerial and the bun clean off,
               which is the failure a number catches and an eye does not. */
            const m = await page.evaluate(w => window.ss.measure(w), member.who);
            const px = (v) => v * TO_SCREEN;
            /* Margo's skirt runs off the bottom by design -- she is a whole
               person and Fred is a head and a chest, so framing them the same
               way made her face half the size of his. The assertion is not
               "nothing is cropped": it is that THE FACE is never cropped, and
               that the parts an expression is MADE of survive the shrink. */
            if (m.headCut) throw new Error(`${member.who}/${state}: the head is cut off by the frame.`);
            const head = px(m.head), eye = px(m.eye), mouth = px(m.mouth), brow = px(m.brow);
            const fill = px(m.fill);
            if (fill < PANEL_FIT * 0.9) throw new Error(`${member.who}: fills only ${fill.toFixed(0)} of ${PANEL_FIT.toFixed(0)}px -- framing is loose.`);
            if (head < 44) throw new Error(`${member.who}/${state}: head is ${head.toFixed(0)}px on screen, under 44.`);
            if (eye < 12) throw new Error(`${member.who}/${state}: eye is ${eye.toFixed(1)}px on screen, under 12.`);
            if (mouth < 3.5) throw new Error(`${member.who}/${state}: mouth is ${mouth.toFixed(1)}px on screen, under 3.5.`);
            measured = { head: Math.round(head), fill: Math.round(fill), eye: +eye.toFixed(1),
                         mouth: +mouth.toFixed(1), brow: +brow.toFixed(1) };
          }
          const raw = path.join(TMP, `${base}-${String(f).padStart(3, '0')}.png`);
          const buf = await page.screenshot({ omitBackground: true });
          await sharp(buf).resize({ width: SHIP_W }).png({ compressionLevel: 9 }).toFile(raw);
          shots.push(raw);
        }
        /* a frame with nothing painted in the middle of it is a failed capture,
           and it must stop the build rather than ship a ghost */
        if (minPaint < 400) {
          throw new Error(`${member.who}/${state}: a frame was near-empty (${minPaint}/1600 painted). Capture failed.`);
        }
        const webp = path.join(member.dir, base + '.webp');
        sh('img2webp', ['-loop', '0', '-lossy', '-q', String(spec.q || 82), '-d', String(spec.ms), ...shots, '-o', webp]);
        /* a still PNG of the resting pose, for anywhere that cannot animate */
        if (state === 'idle') {
          fs.copyFileSync(shots[0], path.join(member.dir, base + '.png'));
        }
        report.push({ who: member.who, state, file: base + '.webp', frames: spec.frames,
                      minPaint, measured, kb: Math.round(fs.statSync(webp).size / 1024) });
        console.log(`  ${member.who} ${state}: ${spec.frames}f  painted>=${minPaint}/1600  ` +
          `on screen: head ${measured.head} fill ${measured.fill}/${PANEL_FIT.toFixed(0)} eye ${measured.eye} mouth ${measured.mouth} brow ${measured.brow}  ${Math.round(fs.statSync(webp).size / 1024)}kB`);
      }
    }
    await browser.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  }

  /* THE GATE. Everything the content names must exist, animate, and be a real
     picture -- measured from the file on disk, not from the fact the build ran.

     THE FIRST VERSION OF THIS GATE WAS WORSE THAN NONE (DFM 146a). It asked
     `buf.includes('ANMF')`, which matches those four bytes anywhere in the file
     including inside compressed pixel data -- and it duly passed fred-offended,
     a file with ZERO animation chunks in it, as "animated=true". So it walks the
     RIFF container properly now and counts what is actually there. */
  function riffChunks(buf) {
    const out = [];
    if (buf.length < 12 || buf.slice(0, 4).toString('latin1') !== 'RIFF'
                        || buf.slice(8, 12).toString('latin1') !== 'WEBP') return out;
    let o = 12;
    while (o + 8 <= buf.length) {
      const id = buf.slice(o, o + 4).toString('latin1');
      const size = buf.readUInt32LE(o + 4);
      if (size > buf.length) break;
      out.push({ id, off: o + 8, size });
      o += 8 + size + (size & 1);
    }
    return out;
  }
  function readWebp(file) {
    const buf = fs.readFileSync(file);
    const ch = riffChunks(buf);
    const vp8x = ch.find(c => c.id === 'VP8X');
    const anmf = ch.filter(c => c.id === 'ANMF');
    const r24 = (o) => buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
    return {
      kb: buf.length / 1024,
      webp: ch.length > 0,
      w: vp8x ? r24(vp8x.off + 4) + 1 : 0,
      h: vp8x ? r24(vp8x.off + 7) + 1 : 0,
      alpha: vp8x ? !!(buf[vp8x.off] & 0x10) : false,
      anim: !!ch.find(c => c.id === 'ANIM'),
      frames: anmf.length,
      ms: anmf.reduce((a, c) => a + r24(c.off + 12), 0)
    };
  }

  console.log('\n-- side-show asset gate --');
  let bad = 0;
  for (const member of CAST) {
    for (const [state, base] of Object.entries(member.files)) {
      const file = path.join(member.dir, base + '.webp');
      if (!fs.existsSync(file)) { console.log(`  FAIL missing ${file}`); bad++; continue; }
      const m = readWebp(file);
      /* two or more real frame chunks, or it is a photograph pretending to be a
         character. His word for what these have to do is BLINK. */
      const ok = m.webp && m.anim && m.frames >= 2 && m.alpha
                 && m.w === SHIP_W && m.h > 300 && m.ms >= 900 && m.kb > 3 && m.kb < 900;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${member.who}/${base}.webp  ${m.w}x${m.h} alpha=${m.alpha} ` +
                  `frames=${m.frames} loop=${m.ms}ms ${m.kb.toFixed(0)}kB`);
      if (!ok) bad++;
    }
  }
  /* THE CONTROLS: this gate has to be able to fail, twice over (DFM 196). */
  const ctlDir = path.join(TMP + '-control');
  fs.mkdirSync(ctlDir, { recursive: true });
  const notPic = path.join(ctlDir, 'a.webp');
  fs.writeFileSync(notPic, Buffer.from('RIFFxxxxWEBPthis is not a picture at all ANMF'));
  const c1 = readWebp(notPic);
  const c1ok = c1.anim && c1.frames >= 2;
  console.log(`  CONTROL 1: a file with the letters ANMF but no chunks is rejected = ${!c1ok}`);
  if (c1ok) bad++;
  /* and a REAL still webp -- the exact thing that slipped through before */
  const stillSrc = path.join(CAST[0].dir, Object.values(CAST[0].files)[0] + '.png');
  let c2ok = true;
  if (fs.existsSync(stillSrc)) {
    const still = path.join(ctlDir, 'b.webp');
    sh('cwebp', ['-quiet', '-q', '80', stillSrc, '-o', still]);
    const c2 = readWebp(still);
    c2ok = c2.anim && c2.frames >= 2;
    console.log(`  CONTROL 2: a genuine STILL webp is rejected as not animated = ${!c2ok} ` +
                `(webp=${c2.webp} frames=${c2.frames})`);
  } else { console.log('  CONTROL 2: FAIL - no still to build the control from'); c2ok = true; }
  if (c2ok) bad++;
  fs.rmSync(ctlDir, { recursive: true, force: true });

  console.log(bad === 0 ? '\nSIDE-SHOW ART: PASS' : `\nSIDE-SHOW ART: FAIL (${bad})`);
  process.exit(bad === 0 ? 0 : 1);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
