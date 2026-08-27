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

/* Films that are SERVED IN TWO PLACES, cut at their own concept seam (DFM 168).
   Only Lesson 5 so far: "the idea" belongs at the masterclass chunk, "the worked
   example & the tests" belongs on the Studio Desk beside the blueprint. */
const HALVES = {
  l5: [
    { file: 'half1.mp4', ids: ['ch1', 'ch2'], label: 'The idea' },
    { file: 'half2.mp4', ids: ['ch3', 'ch4'], label: 'The worked example & the tests' }
  ],
  /* J2/J3 Lesson 3 (27 Aug 2026). Both films are served in TWO places at their
     own concept seam: part A opens the hour, part B lands on the card where what
     it shows is next needed (DFM 168), and each part is a PHYSICALLY separate
     file so a scrubber can never stray outside its own part (DFM 170). */
  'j2-l3': [
    { file: 'j2-l3-a.mp4', ids: ['ch1', 'ch2', 'ch3'], label: 'How a program waits for you' },
    { file: 'j2-l3-b.mp4', ids: ['ch4', 'ch5'], label: 'Writing your own bot' }
  ],
  'j3-l3': [
    { file: 'j3-l3-a.mp4', ids: ['ch1', 'ch2', 'ch3', 'ch4'], label: 'A list is a rack of boxes' },
    { file: 'j3-l3-b.mp4', ids: ['ch5', 'ch6', 'ch7'], label: 'Taking things out, and putting them in order' }
  ]
};

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

  /* ---- HALVES (DFM 168; L5 spec Part B) ------------------------------------
     A film that is half concept and half worked-example does not belong in one
     place on the platform. Lesson 5's splits at its own seam: chapters 1-2 (the
     idea) stay on the masterclass chunk, chapters 3-4 (the worked example and
     the testing) move onto the Studio Desk, beside the blueprint they walk
     through — instruction at the point of need, and a pupil mid-build watches
     the worked example WHILE building.
     Each half is re-muxed from the SAME segments the full film is built from,
     so it can never drift out of step with it, and each carries its OWN chapter
     times, measured from its own start — the 179d guard checks each home
     against its own part file, not against the full film's numbers. */
  const halves = [];
  (HALVES[setName] || []).forEach(h => {
    const segs = h.ids.map(id => path.join(segDir, id + '.mp4'));
    segs.forEach(s => { if (!fs.existsSync(s)) throw new Error('half ' + h.file + ' wants ' + s + ' and it is not there'); });
    const hList = path.join(segDir, 'concat-' + h.file + '.txt');
    fs.writeFileSync(hList, segs.map(s => "file '" + s.replace(/'/g, "'\\''") + "'").join('\n') + '\n');
    const hOut = path.join(partDir, h.file);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
      '-i', hList, '-c', 'copy', '-movflags', '+faststart', hOut]);
    let cur = 0;
    const hChapters = h.ids.map(id => {
      const scene = scenes.find(s => s.id === id);
      const row = { t: Math.round(cur), label: scene.label };
      cur += ffprobeDuration(path.join(segDir, id + '.mp4'));
      return row;
    });
    halves.push({
      file: 'parts/' + h.file, label: h.label, chapterIds: h.ids,
      durationSec: +ffprobeDuration(hOut).toFixed(2),
      sizeMB: +(fs.statSync(hOut).size / 1048576).toFixed(2),
      chapters: hChapters
    });
  });
  if (halves.length) {
    const halvesTotal = halves.reduce((a, h) => a + h.durationSec, 0);
    if (Math.abs(halvesTotal - total) > 1.5) {
      throw new Error('the halves do not add up to the film (' + halvesTotal.toFixed(2) +
        's vs ' + total.toFixed(2) + 's) — one of its two homes would be serving footage ' +
        'the film does not contain');
    }
  }

  const manifest = { file: path.basename(outFile), durationSec: Math.round(total), sizeMB: +sizeMb.toFixed(2), chapters, parts };
  if (halves.length) manifest.halves = halves;
  fs.writeFileSync(path.join(dir, 'chapters.json'), JSON.stringify(manifest, null, 1));
  console.log('ASSEMBLED: ' + outFile);
  console.log(JSON.stringify(manifest, null, 1));
}

if (require.main === module) {
  const setName = process.argv[2];
  if (!setName) { console.error('usage: node assemble.js <set>'); process.exit(2); }
  run(setName);
}
