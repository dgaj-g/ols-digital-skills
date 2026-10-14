#!/usr/bin/env node
/* qa-l6-film.js — the L6 film "Inside her head" is short, paced and captioned, measured in the
   finished file (DFM 139 silent, 289e/309 pacing, spec §3.5 ≤ 60 s).
   (1) the file is ≤ 60 s and silent; (2) every beat holds ≥ 1.2 s + 0.35 s a word; (3) the beats
   burned in are the scene's own words, in order; (4) a caption is really on screen in every beat
   (bottom band has text pixels); (5) the lesson serves this file and its poster.
   CONTROLS (must FAIL): a 70 s film · a rushed beat · a changed caption · a blank caption band.
   node qa-l6-film.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const A = path.join(__dirname, '..', '..', 'platform', 'assets');
const MP4 = path.join(A, 'video', 'l6', 'l6-inside.mp4');
const { BEATS } = require('./scenes/l6.js');
const LESSON = path.join(process.env.KS3DT_CONTENT_SRC || '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/content-src', 'j1', 'lessons', 'j1-06.json');
let fails = 0; const out = [];
function judge(m) {   // m = {dur, audio, beats:[{say,hold}], band:[number]} → list of FAIL lines
  const f = [];
  if (!(m.dur <= 60)) f.push('film is ' + m.dur.toFixed(1) + ' s, over 60 s');
  if (m.audio) f.push('film has an audio track; it must be silent');
  m.beats.forEach((b, i) => { const need = 1.2 + 0.35 * b.say.split(/\s+/).length; if (b.hold < need) f.push('beat ' + (i + 1) + ' holds ' + b.hold + ' s, needs ' + need.toFixed(2) + ' s'); });
  if (m.beats.map(b => b.say).join('|') !== BEATS.map(b => b.say).join('|')) f.push('burned captions differ from scenes/l6.js');
  const sum = m.beats.reduce((s, b) => s + b.hold, 0); if (Math.abs(sum - m.dur) > 0.5) f.push('beat holds add to ' + sum.toFixed(1) + ' s but the film is ' + m.dur.toFixed(1) + ' s');
  m.band.forEach((v, i) => { if (v < 0.004) f.push('beat ' + (i + 1) + ' has no caption on screen'); });
  return f;
}
function check(ok, label) { console.log((ok ? '  PASS  ' : '  FAIL  ') + label); if (!ok) fails++; }
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4]).toString());
const dur = +probe.format.duration, audio = probe.streams.some(s => s.codec_type === 'audio');
const beats = JSON.parse(fs.readFileSync(MP4.replace(/\.mp4$/, '.beats.json'), 'utf8'));
/* caption band: fraction of light pixels in the bottom 150 px, mid-beat */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'l6film-'));
function bandAt(t) {
  const f = path.join(tmp, 'f.gray');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', MP4, '-frames:v', '1', '-vf', 'crop=1280:150:0:570,format=gray', '-f', 'rawvideo', f]);
  const px = fs.readFileSync(f); let n = 0; for (const v of px) if (v > 200) n++; return n / px.length;
}
let t = 0; const band = beats.map(b => { const v = bandAt(t + b.hold / 2); t += b.hold; return v; });
const real = { dur, audio, beats, band };
const got = judge(real);
check(got.length === 0, 'the film: ' + dur.toFixed(1) + ' s, silent, ' + beats.length + ' beats paced, captions on screen' + (got.length ? ' — ' + got.join('; ') : ''));
const L = JSON.parse(fs.readFileSync(LESSON, 'utf8'));
const v = (L.chunks || []).find(c => c.engine === 'video') || {}; const cfg = v.config || {};
check(cfg.src === 'assets/video/l6/l6-inside.mp4' && fs.existsSync(path.join(A, '..', cfg.poster || 'x')), 'the lesson serves the film and its poster exists');
/* controls: each mutation must be caught */
const clone = () => JSON.parse(JSON.stringify(real));
const C = [
  ['a 70 s film', m => { m.dur = 70; m.beats[5].hold += 70 - dur; }],
  ['a rushed beat (1.0 s)', m => { m.dur -= m.beats[2].hold - 1; m.beats[2].hold = 1; }],
  ['a changed caption', m => { m.beats[1].say = 'Her memory keeps the step.'; }],
  ['a blank caption band', m => { m.band[3] = bandAt(0.01) * 0; }]
];
C.forEach(([name, mut]) => { const m = clone(); mut(m); const r = judge(m); check(r.length > 0, 'CONTROL ' + name + ' is caught' + (r.length ? ' (FAIL ' + r[0] + ')' : ' — NOT CAUGHT')); });
console.log(fails ? '\nqa-l6-film: ' + fails + ' FAIL' : '\nqa-l6-film: all green');
process.exit(fails ? 1 : 0);
