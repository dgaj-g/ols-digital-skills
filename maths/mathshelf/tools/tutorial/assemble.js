/* assemble.js — trim each scene to its lift..down window (the title card kept
   to a consistent hold before the lift), concat navy-to-navy, one h264 mp4
   with faststart, and the real chapter start times.
   Usage: node assemble.js <set>     e.g. node assemble.js teacher */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TITLE_HOLD_MS = 2200;
const CRF = '23';
const FPS = 30;

function ffprobeDuration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseFloat(out.trim());
}

function run(setName) {
  const dir = path.join(__dirname, 'out', setName);
  const { scenes, order, source } = require(path.join(__dirname, 'scenes', setName + '.js'));
  /* a set may borrow recorded scenes from another set (the pupils' cut reuses
     the teacher film's pupil chapters): `source` names the set whose out/ dir
     holds a scene's recording when it is not in this one */
  const timingsOf = {};
  const dirsOf = {};
  const ids = order || scenes.map(s => s.id);
  for (const id of ids) {
    const scene = scenes.find(s => s.id === id);
    const from = (scene && scene.from) || setName;
    const d = path.join(__dirname, 'out', from);
    const t = JSON.parse(fs.readFileSync(path.join(d, 'timings.json'), 'utf8'))[id];
    if (!t) throw new Error('no timing for ' + id + ' in set ' + from + ' - record it first');
    timingsOf[id] = t; dirsOf[id] = d;
  }
  const segDir = path.join(dir, 'seg');
  fs.mkdirSync(segDir, { recursive: true });
  const chapters = [];
  let cursor = 0;
  const concatList = [];
  for (const id of ids) {
    const scene = scenes.find(s => s.id === id);
    const t = timingsOf[id];
    const lift = t.marks.find(m => m.name === 'lift');
    const down = t.marks.find(m => m.name === 'down');
    if (!lift || !down) throw new Error(id + ' missing lift/down marks');
    const from = Math.max(0, (lift.ms - TITLE_HOLD_MS) / 1000);
    const to = (down.ms + (t.tailMs || 1300)) / 1000;
    const seg = path.join(segDir, id + '.mp4');
    console.log(id + ': trim ' + from.toFixed(2) + 's..' + to.toFixed(2) + 's');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(from), '-to', String(to), '-i', path.join(dirsOf[id], t.file),
      '-vf', 'fps=' + FPS + ',scale=1280:720:flags=lanczos,format=yuv420p', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, seg]);
    const dur = ffprobeDuration(seg);
    chapters.push({ t: Math.round(cursor), label: scene.label });
    cursor += dur;
    concatList.push("file '" + seg.replace(/'/g, "'\\''") + "'");
  }
  const listFile = path.join(segDir, 'concat.txt');
  fs.writeFileSync(listFile, concatList.join('\n') + '\n');
  const outFile = path.join(dir, setName + '.mp4');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', outFile]);
  const total = ffprobeDuration(outFile);
  const sizeMb = fs.statSync(outFile).size / 1048576;
  fs.writeFileSync(path.join(dir, 'chapters.json'), JSON.stringify({ file: path.basename(outFile), seconds: Math.round(total), chapters }, null, 1));
  const mm = Math.floor(total / 60), ss = Math.round(total % 60);
  console.log('OUT: ' + outFile + '  ' + mm + ':' + String(ss).padStart(2, '0') + '  ' + sizeMb.toFixed(1) + ' MB');
  chapters.forEach(c => console.log('  ' + Math.floor(c.t / 60) + ':' + String(c.t % 60).padStart(2, '0') + '  ' + c.label));
}

if (require.main === module) {
  const setName = process.argv[2];
  if (!setName) { console.error('usage: node assemble.js <set>'); process.exit(2); }
  run(setName);
}
module.exports = { run };
