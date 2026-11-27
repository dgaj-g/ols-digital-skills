#!/usr/bin/env node
/* qa-l6-film.js — the L6 V2 film "Inside Bernadette's head" is short, paced and captioned (DFM 139 silent,
   289e/309 pacing, spec §3.5 ≤ 60 s, spec §10 seven beats). V2 plays the film inside the contest card, built
   from cstrings.js S.film and paced by contest-ui.js filmHold(); the V1 recording (l6-inside.mp4) is no longer
   served (build decision 27 Nov, PROGRESS line 20).
   (1) seven beats, each one caption; (2) every beat holds ≥ 1.2 s + 0.35 s a word, read from the page's own
   filmHold(); (3) the whole film is ≤ 60 s; (4) the film is silent (no audio or video element in the card);
   (5) the lesson serves no stale film (no 'video' chunk pointing at the V1 file).
   CONTROLS (must FAIL): a 70 s film · a rushed beat · a lost beat · a video chunk left in the lesson.
   NODE_PATH=$(npm root -g) node qa-l6-film.js --base http://localhost:8126 */
'use strict';
const fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = argOf('--base', 'http://localhost:8126');
const LESSON = path.join(process.env.KS3DT_CONTENT_SRC || '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/content-src', 'j1', 'lessons', 'j1-06.json');
let fails = 0;
function check(ok, label) { console.log((ok ? '  PASS  ' : '  FAIL  ') + label); if (!ok) fails++; }
function judge(m) {   // m = {beats:[{say,hold}], media:n, video:bool} → list of FAIL lines
  const f = [];
  if (m.beats.length !== 7) f.push('the film has ' + m.beats.length + ' beats, the spec has 7');
  m.beats.forEach((b, i) => { const need = 1.2 + 0.35 * b.say.split(/\s+/).filter(Boolean).length; if (b.hold < need - 0.01) f.push('beat ' + (i + 1) + ' holds ' + b.hold.toFixed(2) + ' s, needs ' + need.toFixed(2) + ' s'); });
  const sum = m.beats.reduce((s, b) => s + b.hold, 0); if (!(sum <= 60)) f.push('film is ' + sum.toFixed(1) + ' s, over 60 s');
  if (m.media) f.push('the film card has ' + m.media + ' audio/video element(s); it must be silent');
  if (m.video) f.push('the lesson still serves a video chunk (' + m.video + ')');
  return f;
}
(async () => {
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto(BASE + '/ks3-dt/platform/assets/l6/contest.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.L6C && window.L6C.filmHold && window.L6C_STRINGS, { timeout: 15000 });
  const got = await page.evaluate(() => {
    const S = window.L6C_STRINGS;
    return { beats: S.film.map((say, k) => ({ say, hold: window.L6C.filmHold(k) / 1000 })),
             media: document.querySelectorAll('#film audio, #film video, audio, video').length };
  });
  await browser.close();
  /* the last beat has no timer (the caption stays up until she presses on); judge it at the same rule */
  const L = JSON.parse(fs.readFileSync(LESSON, 'utf8'));
  const v = (L.chunks || []).find(c => c.engine === 'video');
  const real = { beats: got.beats, media: got.media, video: v ? (v.config && v.config.src) || v.id : '' };
  const r = judge(real);
  const tot = real.beats.reduce((s, b) => s + b.hold, 0);
  check(r.length === 0, 'the film: ' + real.beats.length + ' beats, ' + tot.toFixed(1) + ' s, silent, every beat held long enough to read, no stale video chunk' + (r.length ? ' — ' + r.join('; ') : ''));
  real.beats.forEach((b, i) => console.log('        beat ' + (i + 1) + ' ' + b.hold.toFixed(2) + ' s · ' + b.say));
  const clone = () => JSON.parse(JSON.stringify(real));
  const C = [
    ['a 70 s film', m => { m.beats[6].hold += 70; }],
    ['a rushed beat (2.6 s on 14 words)', m => { m.beats[5].hold = 2.6; }],
    ['a lost beat', m => { m.beats.pop(); }],
    ['a video chunk left in the lesson', m => { m.video = 'assets/video/l6/l6-inside.mp4'; }]
  ];
  C.forEach(([name, mut]) => { const m = clone(); mut(m); const x = judge(m); check(x.length > 0, 'CONTROL ' + name + ' is caught' + (x.length ? ' (FAIL ' + x[0] + ')' : ' — NOT CAUGHT')); });
  console.log(fails ? '\nqa-l6-film: ' + fails + ' FAIL' : '\nqa-l6-film: all green');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
