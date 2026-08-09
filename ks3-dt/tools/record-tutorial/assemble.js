/* Assembler: per-chapter trim (title card kept to a consistent pre-lift hold),
   navy-to-navy concat (transitions were done in-page - no xfade math), single
   h264 yuv420p faststart mp4 + the real chapter start times for the platform's
   video engine `chapters` config.
   Usage: node assemble.js <set>            e.g. node assemble.js l2 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TITLE_HOLD_MS = 2200;  // navy title card shown before each lift
const CRF = '23';
const FPS = 30;

function ffprobeDuration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseFloat(out.trim());
}

function run(setName) {
  const dir = path.join(__dirname, 'out', setName);
  const timings = JSON.parse(fs.readFileSync(path.join(dir, 'timings.json'), 'utf8'));
  const { scenes } = require(path.join(__dirname, 'scenes', setName + '.js'));
  const segDir = path.join(dir, 'seg');
  fs.mkdirSync(segDir, { recursive: true });

  const chapters = [];
  let cursor = 0;
  const concatList = [];
  for (const scene of scenes) {
    const t = timings[scene.id];
    if (!t) throw new Error('no timing for ' + scene.id + ' - record it first');
    const lift = t.marks.find(m => m.name === 'lift');
    const down = t.marks.find(m => m.name === 'down');
    if (!lift || !down) throw new Error(scene.id + ' missing lift/down marks');
    const from = Math.max(0, (lift.ms - TITLE_HOLD_MS) / 1000);
    const to = (down.ms + (t.tailMs || 1300)) / 1000;
    const seg = path.join(segDir, scene.id + '.mp4');
    console.log(scene.id + ': trim ' + from.toFixed(2) + 's..' + to.toFixed(2) + 's');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y',
      '-ss', String(from), '-to', String(to), '-i', path.join(dir, t.file),
      '-vf', 'fps=' + FPS + ',scale=1280:720:flags=lanczos,format=yuv420p',
      '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF,
      seg]);
    const dur = ffprobeDuration(seg);
    chapters.push({ t: Math.round(cursor), label: scene.label });
    cursor += dur;
    concatList.push("file '" + seg.replace(/'/g, "'\\''") + "'");
  }

  const listFile = path.join(segDir, 'concat.txt');
  fs.writeFileSync(listFile, concatList.join('\n') + '\n');
  const outFile = path.join(dir, setName + '-tutorial.mp4');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
    '-i', listFile, '-c', 'copy', '-movflags', '+faststart', outFile]);

  const total = ffprobeDuration(outFile);
  const sizeMb = fs.statSync(outFile).size / 1048576;

  /* DFM 170 - DAMIEN, 9 Aug 2026: "I want it to be split into the section that
     it's dealing with ONLY within each rung... a student who wants to rewind or
     go forward might accidentally stray into another part of the video."
     The trimmed per-chapter segments above ARE those sections, so the part files
     are the same footage the full film is concatenated from - they cannot drift
     out of step with it. They are only re-muxed, never re-encoded: same bytes,
     plus faststart, so a part starts playing without downloading the whole file. */
  const partDir = path.join(dir, 'parts');
  fs.mkdirSync(partDir, { recursive: true });
  const parts = [];
  scenes.forEach((scene, i) => {
    const seg = path.join(segDir, scene.id + '.mp4');
    if (!fs.existsSync(seg)) return;
    const out = path.join(partDir, 'part' + (i + 1) + '.mp4');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', seg,
      '-c', 'copy', '-movflags', '+faststart', out]);
    parts.push({
      file: 'parts/part' + (i + 1) + '.mp4',
      label: scene.label,
      durationSec: +ffprobeDuration(out).toFixed(2),
      sizeMB: +(fs.statSync(out).size / 1048576).toFixed(2)
    });
  });
  const partsTotal = parts.reduce((a, p) => a + p.durationSec, 0);
  if (Math.abs(partsTotal - total) > 1.5) {
    throw new Error('the parts do not add up to the film (' + partsTotal.toFixed(2) +
      's of parts vs ' + total.toFixed(2) + 's of film) - a rung would be serving ' +
      'footage the film does not contain');
  }

  const manifest = { file: path.basename(outFile), durationSec: Math.round(total), sizeMB: +sizeMb.toFixed(2), chapters, parts };
  fs.writeFileSync(path.join(dir, 'chapters.json'), JSON.stringify(manifest, null, 1));
  console.log('ASSEMBLED: ' + outFile);
  console.log(JSON.stringify(manifest, null, 1));
}

if (require.main === module) {
  const setName = process.argv[2];
  if (!setName) { console.error('usage: node assemble.js <set>'); process.exit(2); }
  run(setName);
}
