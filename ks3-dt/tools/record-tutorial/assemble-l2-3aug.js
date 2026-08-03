/* assemble-l2-3aug.js - rebuild the L2 film with Damien's real connection footage.
 *
 * DAMIEN, 3 Aug 2026. The film is no longer four recorded chapters end to end:
 * his own footage of physically connecting the micro:bit replaces the stretch
 * the recorder used to mime, so the running order is
 *
 *   ch1  (re-recorded: the new-tab caption)         -> chapter "Find MakeCode"
 *   ch2  (July take, unchanged)                     -> chapter "First blocks"
 *   ch3  (re-recorded, truncated on "This is how    -> chapter "Onto the real micro:bit"
 *         you do it...")
 *   HIS FOOTAGE, muted, his 8 pop-ups burnt on      -> no chapter marker
 *   the PAYOFF card, lifted UNCHANGED from the         (it is all one chapter
 *         July ch3 take                                to the pupil)
 *   ch4  (re-recorded: simulator clarity, and
 *         "rung" + "Debug Hint" explained)          -> chapter "Test it properly"
 *
 * Anything with `label: null` is a segment, not a chapter, so the platform's
 * four chapter buttons still mean what they say.
 *
 *   node assemble-l2-3aug.js
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TITLE_HOLD_MS = 2200;   // same as assemble.js: the navy hold before each lift
const CRF = '23';
const FPS = 30;
const DIR = path.join(__dirname, 'out', 'l2');
const SEG = path.join(DIR, 'seg');

/* recorded = trim from its own webm take; prebuilt = use this mp4 as it is */
const ORDER = [
  { id: 'ch1', label: 'Find MakeCode', recorded: true },
  { id: 'ch2', label: 'First blocks', prebuilt: 'ch2.mp4' },
  { id: 'ch3', label: 'Onto the real micro:bit', recorded: true },
  { id: 'microbit', label: null, prebuilt: 'microbit-clip.mp4' },
  { id: 'ch3b', label: null, prebuilt: 'ch3b-payoff.mp4' },
  { id: 'ch4', label: 'Test it properly', recorded: true }
];

function dur(f) {
  return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());
}

function trimRecorded(id, timings) {
  const t = timings[id];
  if (!t) throw new Error('no timing for ' + id + ' - record it first');
  const lift = t.marks.find(m => m.name === 'lift');
  const down = t.marks.find(m => m.name === 'down');
  if (!lift || !down) throw new Error(id + ' missing lift/down marks');
  const from = Math.max(0, (lift.ms - TITLE_HOLD_MS) / 1000);
  const to = (down.ms + (t.tailMs || 1300)) / 1000;
  const out = path.join(SEG, id + '.mp4');
  console.log('  ' + id + ': trim ' + from.toFixed(2) + 's..' + to.toFixed(2) + 's from ' + t.file);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y',
    '-ss', String(from), '-to', String(to), '-i', path.join(DIR, t.file),
    '-vf', 'fps=' + FPS + ',scale=1280:720:flags=lanczos,format=yuv420p',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, out]);
  return out;
}

function run() {
  const timings = JSON.parse(fs.readFileSync(path.join(DIR, 'timings.json'), 'utf8'));
  console.log('1. segments');
  const files = [];
  ORDER.forEach(s => {
    if (s.recorded) files.push(trimRecorded(s.id, timings));
    else {
      const f = path.join(SEG, s.prebuilt);
      if (!fs.existsSync(f)) throw new Error('missing prebuilt segment: ' + f);
      console.log('  ' + s.id + ': reusing ' + s.prebuilt);
      files.push(f);
    }
  });

  console.log('2. chapters');
  const chapters = [];
  let cursor = 0;
  ORDER.forEach((s, i) => {
    const d = dur(files[i]);
    if (s.label) {
      chapters.push({ t: Math.round(cursor), label: s.label });
      console.log('  ' + fmt(cursor) + '  ' + s.label + '   (' + d.toFixed(1) + 's)');
    } else {
      console.log('  ' + fmt(cursor) + '  [' + s.id + ', inside the previous chapter]   (' + d.toFixed(1) + 's)');
    }
    cursor += d;
  });

  console.log('3. concat');
  const listFile = path.join(SEG, 'concat-3aug.txt');
  fs.writeFileSync(listFile, files.map(f => "file '" + f.replace(/'/g, "'\\''") + "'").join('\n') + '\n');
  const outFile = path.join(DIR, 'l2-tutorial.mp4');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
    '-i', listFile, '-c', 'copy', '-movflags', '+faststart', outFile]);

  const total = dur(outFile);
  const sizeMb = fs.statSync(outFile).size / 1048576;
  const manifest = { file: path.basename(outFile), durationSec: Math.round(total), sizeMB: +sizeMb.toFixed(2), chapters };
  fs.writeFileSync(path.join(DIR, 'chapters.json'), JSON.stringify(manifest, null, 1));
  console.log('\nASSEMBLED ' + outFile);
  console.log('  ' + fmt(total) + ' total, ' + sizeMb.toFixed(2) + ' MB');
  console.log(JSON.stringify(manifest.chapters, null, 1));
}

function fmt(s) {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m + ':' + String(r).padStart(2, '0');
}

run();
