/* shoot-cloud-stills.js — one still per beat, cut from the FINISHED film at the
   exact frame the take gate measured, so the eyes-on-pixels read (DFM 225b/243)
   is a read of the thing that ships and not of a rehearsal in a browser.

   The scene marks every teaching moment while recording; assemble.js trims each
   scene from (lift - 2200ms), so a mark's position in the film is
   mark.ms - lift.ms + 2200. Nothing here is guessed.

   Usage: node shoot-cloud-stills.js [outDir]
   Out:   <outDir>/beat1.png ... beat6.png  (default: out/lS1/stills) */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(__dirname, 'out', 'lS1');
const TITLE_HOLD_MS = 2200;                 /* assemble.js's own constant */
const film = path.join(OUT, 'lS1-tutorial.mp4');
const dest = process.argv[2] || path.join(OUT, 'stills');

const timings = JSON.parse(fs.readFileSync(path.join(OUT, 'timings.json'), 'utf8'));
const marks = (timings.ch1 || {}).marks || [];
const lift = marks.find(m => m.name === 'lift');
if (!lift) throw new Error('no lift mark — re-record');
const beats = marks.filter(m => /^beat\d+$/.test(m.name));
if (!beats.length) throw new Error('no beat marks — re-record with the marking scene');

fs.mkdirSync(dest, { recursive: true });
beats.forEach(m => {
  const t = (m.ms - lift.ms + TITLE_HOLD_MS) / 1000;
  const out = path.join(dest, m.name + '.png');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', t.toFixed(3), '-i', film,
    '-frames:v', '1', out]);
  console.log(m.name + '  @' + t.toFixed(2) + 's  -> ' + out);
});
/* and the title card, because it is the first thing she sees */
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', '1.0', '-i', film,
  '-frames:v', '1', path.join(dest, 'title.png')]);
console.log('title @1.00s -> ' + path.join(dest, 'title.png'));
