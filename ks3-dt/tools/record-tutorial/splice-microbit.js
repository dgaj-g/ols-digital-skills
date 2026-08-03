/* splice-microbit.js - conform Damien's real micro:bit-connection footage and
 * burn his timed pop-ups onto it, in the film's own caption style.
 *
 * DAMIEN, 3 Aug 2026: "I have taken a video showing how to connect the physical
 * micro:bit to the computer and this needs to be incorporated into the existing
 * video tutorial (make sure you mute the video)."
 *
 * His START times are followed EXACTLY - each pop-up is pinned to the moment its
 * action happens on screen. Where the text cannot be READ in the seconds he
 * estimated (rule 138.2 - a pupil's reading age is the scarce thing), the
 * pop-up is held longer, never beyond the next pop-up's start. Every extension
 * is printed by this script and was reported to him.
 *
 *   node splice-microbit.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { renderCaptions } = require('./lib/caption-png');

const SRC = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/extra videos/connecting-microbit.mp4';
const OUT_DIR = path.join(__dirname, 'out', 'l2');
const SEG_DIR = path.join(OUT_DIR, 'seg');
const PNG_DIR = path.join(OUT_DIR, 'caps');
const CONFORMED = path.join(SEG_DIR, 'microbit-raw.mp4');
const FINAL = path.join(SEG_DIR, 'microbit-clip.mp4');

/* his list, verbatim in meaning; obvious slips smoothed and REPORTED:
   (b) "Hit next"            -> Next capitalised as the button it names
   (g) "most recent will always the one at the top" -> "will always BE the one"
   (g) "and, drag the file"  -> stray comma removed;  "on to" -> "onto"
   (h) "the micro:bits"      -> singular; comma splice -> full stop            */
const POPUPS = [
  { id: 'p-a', at: 23, his: 3, html: "The micro:bit should <b>light up at the back</b> to show that it's connected." },
  { id: 'p-b', at: 29, his: 2, html: "Hit <b>Next</b>." },
  { id: 'p-c', at: 35, his: 3, html: "Click <b>Download as File</b>." },
  { id: 'p-d', at: 42, his: 3, html: "Turn on <b>Don't show this again</b> and then click <b>Done</b>." },
  { id: 'p-e', at: 53, his: 3, html: "Click the <b>download icon</b> at the top of the screen." },
  { id: 'p-f', at: 59, his: 5, html: "Your most recently downloaded program files will always be at the top of the list &mdash; click on the <b>folder icon</b> beside the name." },
  /* DAMIEN, 3 Aug 2026: right-aligned - centred, this one sat straight on top of
     the MICROBIT drive in the Explorer sidebar, which is the exact thing it is
     telling her to drag onto. */
  { id: 'p-g', at: 67, his: 7, align: 'right', html: "Now click and <b>HOLD</b> the left mouse button over the file (the most recent will always be the one at the top) and drag the file all the way over to <b>MICROBIT</b>, then let go. This puts the program you've created onto the actual micro:bit!" },
  { id: 'p-h', at: 87, his: 4, html: "You'll see the yellow light flashing on the micro:bit. <b>When it stops, it's loaded!</b>" }
];

const FADE = 0.25;          // matches the film's own caption fade
const TAIL_GUARD = 0.6;     // never run a pop-up to the very last frame

function readSeconds(html) {
  const words = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(2.2, 0.9 + words * 0.30);   // 12-year-old reading pace, read-once
}

function probeDuration(f) {
  return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error('his footage not found at ' + SRC);
  fs.mkdirSync(SEG_DIR, { recursive: true });

  console.log('1. conforming his footage (1280x720, 30fps, MUTED - his instruction)');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', SRC,
    '-vf', 'fps=30,scale=1280:720:flags=lanczos,format=yuv420p',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', CONFORMED]);
  const dur = probeDuration(CONFORMED);
  console.log('   conformed: ' + dur.toFixed(2) + 's, no audio track');

  console.log('2. rendering his pop-ups in the film\'s own caption style');
  await renderCaptions(POPUPS.map(p => ({ id: p.id, html: p.html, align: p.align })), PNG_DIR, { log: m => console.log('   ' + m) });

  /* work out each hold: his start exactly, his duration unless it is too short
     to read, and never past the next pop-up (or the end of his clip) */
  console.log('3. timing');
  const timed = POPUPS.map((p, i) => {
    const nextAt = (i + 1 < POPUPS.length) ? POPUPS[i + 1].at : (dur - TAIL_GUARD);
    const room = Math.max(1.2, nextAt - p.at - 0.15);
    const need = readSeconds(p.html);
    const hold = Math.min(room, Math.max(p.his, need));
    const note = hold > p.his + 0.05
      ? '  HELD LONGER (' + p.his + 's -> ' + hold.toFixed(1) + 's; needs ~' + need.toFixed(1) + 's to read)'
      : '  as he set it';
    console.log('   ' + p.id + ' @' + p.at + 's for ' + hold.toFixed(1) + 's' + note);
    return Object.assign({}, p, { hold: hold });
  });

  console.log('4. burning them on');
  /* each caption must be a looping STREAM, not a single still: fade is a
     timeline filter, and on a one-frame input (pts 0) a fade starting at
     st=23 leaves that frame fully transparent, so the overlay draws nothing.
     Looping at the film's own 30fps makes caption time == film time, which is
     what the fade and the enable window both assume. */
  const inputs = ['-i', CONFORMED];
  timed.forEach(p => {
    inputs.push('-loop', '1', '-framerate', '30', '-t', (p.at + p.hold + 1).toFixed(2),
      '-i', path.join(PNG_DIR, p.id + '.png'));
  });
  const parts = [];
  timed.forEach((p, i) => {
    const outT = p.at + p.hold;
    parts.push('[' + (i + 1) + ':v]format=rgba,' +
      'fade=t=in:st=' + p.at.toFixed(2) + ':d=' + FADE + ':alpha=1,' +
      'fade=t=out:st=' + (outT - FADE).toFixed(2) + ':d=' + FADE + ':alpha=1[c' + i + ']');
  });
  let chain = '[0:v]';
  timed.forEach((p, i) => {
    const outT = p.at + p.hold;
    const dst = '[v' + i + ']';
    parts.push(chain + '[c' + i + ']overlay=0:0:enable=\'between(t,' + p.at.toFixed(2) + ',' + outT.toFixed(2) + ')\'' + dst);
    chain = dst;
  });
  /* the film hands over on a navy curtain and comes back on the payoff card,
     so his footage fades up and away rather than hard-cutting */
  parts.push(chain + 'fade=t=in:st=0:d=0.5,fade=t=out:st=' + (dur - 0.6).toFixed(2) + ':d=0.6[vout]');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs,
    '-filter_complex', parts.join(';'), '-map', '[vout]',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', FINAL], { stdio: 'inherit' });

  console.log('\nDONE: ' + FINAL);
  console.log('   ' + probeDuration(FINAL).toFixed(2) + 's, ' + (fs.statSync(FINAL).size / 1048576).toFixed(2) + ' MB');
  fs.writeFileSync(path.join(OUT_DIR, 'microbit-popups.json'),
    JSON.stringify({ source: SRC, muted: true, popups: timed }, null, 1));
}

main().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
