#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   qa-film-posters.js — A POSTER IS PART OF THE FILM, AND IT GOES STALE ALONE
   ═══════════════════════════════════════════════════════════════════════════
   Written 16 Aug 2026, from a fault found by LOOKING at a deck proof.

   Lesson 5's masterclass card showed a garbled still — half-faded caption text
   over the Scratch editor, the File menu hanging open. It was not the deck and
   it was not the capture: it was `l5-poster.jpg`, made on 28 July and never
   re-made when the film was rebuilt underneath it. Every pupil met it before
   she pressed play, on a lesson signed off since 14 August.

   THE CLASS, and it is DFM 147's law wearing a new coat: when a film is
   re-recorded, everything CUT FROM it must be re-cut. The film-frame stills in
   the decks already had that ratchet (qa-deck-shots holds each still to its
   film's md5). The POSTER — the one frame a pupil sees first — had nothing
   watching it at all, because it lives in content rather than in a manifest.

   WHAT THIS GATE ASSERTS, per poster referenced by any lesson's content:
     1. the file exists;
     2. it is that film's OWN opening frame, proved by pixels rather than by
        trust: the first frame is extracted from the mp4 and compared against
        the poster, and they must be the same picture;
     3. the fingerprint file records the film md5 the poster was cut from, so a
        re-recorded film fails this gate the moment its poster is left behind.

   Run standalone or from pack-content. Needs ffmpeg (already a dependency of
   the film pipeline); if ffmpeg is missing the gate FAILS rather than skips —
   an unchecked surface that prints PASS is the DFM 200/204 fault.
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
/* the same home the packer uses, so the gate reads what will actually ship */
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const PLATFORM = path.join(ROOT, 'platform');
const STAMPS = path.join(__dirname, 'poster-stamps.json');

const fails = [];
const notes = [];

function md5(buf) { return crypto.createHash('md5').update(buf).digest('hex'); }

function firstFrame(mp4) {
  const out = path.join(require('os').tmpdir(), 'ks3dt-frame-' + md5(Buffer.from(mp4)).slice(0, 8) + '.png');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vframes', '1', out]);
  return out;
}

/* Two JPEGs of the same picture are not byte-identical, so compare what the eye
   compares: a coarse greyscale signature. Sixteen bands down the frame, each an
   average brightness — enough to tell "the film's title card" from "a different
   screen entirely", and blind to re-encoding. */
function signature(pngOrJpg) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', pngOrJpg,
    '-vf', 'scale=16:16,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 4 << 20 });
  return Array.from(raw);
}

function distance(a, b) {
  if (a.length !== b.length) return 999;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

function postersIn(lessonJson) {
  const found = [];
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (o.poster && (o.src || o.video)) found.push({ poster: o.poster, film: o.src || o.video });
    Object.values(o).forEach(walk);
  })(lessonJson);
  return found;
}

function check(label, pair, stamps) {
  const posterPath = path.join(PLATFORM, pair.poster);
  const filmPath = path.join(PLATFORM, pair.film);
  if (!fs.existsSync(posterPath)) {
    fails.push(label + ': poster ' + pair.poster + ' does not exist');
    return;
  }
  if (!fs.existsSync(filmPath)) {
    fails.push(label + ': film ' + pair.film + ' does not exist');
    return;
  }
  const filmHash = md5(fs.readFileSync(filmPath)).slice(0, 12);
  let frame;
  try { frame = firstFrame(filmPath); }
  catch (e) { fails.push(label + ': could not read the first frame of ' + pair.film + ' (' + e.message + ')'); return; }

  const d = distance(signature(posterPath), signature(frame));
  const stamp = stamps[pair.poster];
  if (d > 12) {
    fails.push(label + ': ' + pair.poster + ' is NOT the opening frame of ' + path.basename(pair.film) +
      ' (difference ' + d.toFixed(1) + ', floor 12). A pupil meets this picture before she presses ' +
      'play, so it is the film\'s own first frame or it is a lie about what she is about to watch.');
    return;
  }
  if (!stamp) {
    fails.push(label + ': ' + pair.poster + ' has no recorded film fingerprint, so a re-recorded ' +
      'film would silently keep this poster. Run with --stamp once the poster is correct.');
    return;
  }
  if (stamp !== filmHash) {
    fails.push(label + ': ' + pair.poster + ' was cut from an older cut of ' + path.basename(pair.film) +
      ' (fingerprint ' + stamp + ', now ' + filmHash + ') — re-cut it.');
    return;
  }
  notes.push(label + ': ' + path.basename(pair.poster) + ' is ' + path.basename(pair.film) +
    '\'s own opening frame (difference ' + d.toFixed(1) + ')');
}

const stamps = fs.existsSync(STAMPS) ? JSON.parse(fs.readFileSync(STAMPS, 'utf8')) : {};
const years = fs.readdirSync(SRC).filter(f => /^j\d$/.test(f));
let pairs = 0;
for (const year of years) {
  const dir = path.join(SRC, year, 'lessons');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.json'))) {
    const lj = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const pair of postersIn(lj)) { pairs++; check(lj.id, pair, stamps); }
  }
}

/* ───────── THE STAMP WRITER (only ever run deliberately) ───────── */
if (process.argv.includes('--stamp')) {
  const next = {};
  for (const year of years) {
    const dir = path.join(SRC, year, 'lessons');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.json'))) {
      const lj = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const pair of postersIn(lj)) {
        const filmPath = path.join(PLATFORM, pair.film);
        if (fs.existsSync(filmPath)) next[pair.poster] = md5(fs.readFileSync(filmPath)).slice(0, 12);
      }
    }
  }
  fs.writeFileSync(STAMPS, JSON.stringify(next, null, 1) + '\n');
  console.log('wrote poster-stamps.json for ' + Object.keys(next).length + ' poster(s)');
  process.exit(0);
}

/* ───────── THE CONTROL (DFM 196: it must catch a planted fault) ───────── */
(function control() {
  const decoy = path.join(PLATFORM, 'assets', 'img', 'l2', 'microbit-reset.jpg');
  const film = path.join(PLATFORM, 'assets', 'video', 'l5', 'l5-half1.mp4');
  if (!fs.existsSync(decoy) || !fs.existsSync(film)) {
    fails.push('CONTROL could not run — the planted pair is missing from disk');
    return;
  }
  let frame;
  try { frame = firstFrame(film); } catch (e) { fails.push('CONTROL could not run: ' + e.message); return; }
  const d = distance(signature(decoy), signature(frame));
  if (d <= 12) {
    fails.push('THE CONTROL PASSED. A photograph of a micro:bit was accepted as the opening frame ' +
      'of the Lesson 5 film, so this gate is not measuring anything.');
  } else {
    notes.push('control: a poster that is not the film\'s own frame was REJECTED (difference ' + d.toFixed(1) + ')');
  }
})();

console.log('qa-film-posters: ' + pairs + ' poster reference(s) checked');
notes.forEach(n => console.log('  ' + n));
if (fails.length) {
  console.error('\nqa-film-posters: FAILED — ' + fails.length + ' problem(s)');
  fails.forEach(f => console.error('  ✗ ' + f));
  console.error('\nA poster is the first thing a pupil sees of a film. When the film is\n' +
    're-recorded, the poster is re-cut in the same commit (DFM 147).');
  process.exit(1);
}
console.log('qa-film-posters: PASSED');
