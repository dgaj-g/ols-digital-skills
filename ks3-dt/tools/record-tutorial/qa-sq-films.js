#!/usr/bin/env node
/* qa-sq-films.js — the side quest's two "Show me how" films, measured in their
   own pixels (SIDEQUEST_FIX_SPEC §B1's "film-laws checks").

   WHY THESE FILMS NEED THEIR OWN GATE, stated plainly rather than assumed.
   `qa-film-laws.js` enforces RECORD-TIME laws — a caption clipped at the frame
   edge, the cursor sitting on caption words, a drawn box outside the frame —
   and it does that inside the recorder, over a scene script, while the film is
   being made. These two films have no scene script: the footage is DAMIEN'S OWN
   screen recording (DFM 253 records his ruling on them), and all our pipeline
   does is conform it and burn HIS captions on. So the record-time laws have
   nothing to run over, and `qa-harness-coverage` was right to refuse the lesson
   until something did.
   This is that something. It does not pretend to be the recorder's gate; it
   asserts what is genuinely assertable about a finished film:

     - it decodes, it is SILENT, it is the platform's own 1280x720 frame;
     - it is as long as his capture was, so a rebuild cannot quietly truncate it;
     - every caption's in and out point lies inside the film, in order, and no
       two captions overlap (two stacked boxes is DFM 141a's family);
     - THE WORDS BURNED IN ARE THE WORDS IN THE CONTENT. The captions live in the
       lesson JSON so the language gate and the read-aloud ledger can see them
       (DFM 190d), and the build reads them from there — this asserts the film is
       NEWER than the content it was built from, so an edited caption that was
       never re-burned fails instead of shipping;
     - and, in REAL PIXELS (DFM 146b), a caption box is actually on screen during
       each caption's window and actually absent between them. Timings that agree
       with a table but not with the film are the fault this catches.

   CONTROL (DFM 196): the detector is proved both ways on every run — it must
   find a box inside a caption window and NOT find one in a gap. A detector that
   answered yes to everything would make every timing check meaningless.

   Usage: node qa-sq-films.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SHARED = path.join(ROOT, 'platform', 'assets', 'video', 'shared');
const SRC_CONTENT = path.join(process.env.HOME,
  'Desktop/Claude Work/KS3 DT Platform/content-src/j1/lessons/j1-sq1.json');
const RAW_DIR = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/extra videos');

let failures = 0;
const check = (ok, m, d) => {
  if (ok) console.log('  PASS  ' + m);
  else { failures++; console.log('  FAIL  ' + m + (d ? ' — ' + d : '')); }
};
const control = (fired, m) => {
  if (fired) console.log('  PASS  CONTROL: ' + m);
  else { failures++; console.log('  FAIL  CONTROL: ' + m); }
};

const probe = (f, e) => execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', e, '-of', 'default=noprint_wrappers=1:nokey=1', f],
  { encoding: 'utf8' }).trim();

/* THE DETECTOR, and its first version was wrong in the way DFM 146(a) warns
   about. It counted GOLD-ISH PIXELS in the bottom third and flagged two frames
   that carry no caption at all — Google Drive's own "drag your files here"
   illustration has an orange figure in it, and scattered warm pixels are not a
   caption. A gate that invents a fault is worse than no gate, so the detector
   now looks for what the caption actually IS: the platform's 9px GOLD BAR down
   its left edge, which is a SOLID VERTICAL RUN of one colour. An illustration
   never produces that; the caption always does. Proved both ways on every run
   by the controls below. */
const GOLD = [228, 184, 36];
const CROP_H = 280, CROP_Y = 440, CROP_W = 1280;
/* MEASURED, not guessed (the numbers are in the round's PROGRESS file):
   the caption's bar is 8px wide and 62px tall for a one-line caption, 204px for
   a five-line one, and its left edge lands at x=320-337 because the caption is
   centred with a 340-900px width. The two false positives were OneDrive's
   empty-state illustration (9px wide, 45px tall, at x=722) and Google's
   drag-your-files figure (no vertical run at all). Height AND position separate
   them with room to spare, and both are properties of the caption itself rather
   than of these two particular films. */
const BAR_MIN_TALL = 55;            // one-line caption measures 62; the illustration 45
const BAR_W = [5, 16];              // the bar is 9px by design; measured 8 after encoding
const BAR_X = [150, 500];           // a centred 340-900px caption's left edge can only land here
function captionBarAt(film, t) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', film,
    '-frames:v', '1', '-vf', 'crop=' + CROP_W + ':' + CROP_H + ':0:' + CROP_Y,
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 64 * 1024 * 1024, encoding: 'buffer' });
  const isGold = (x, y) => {
    const i = (y * CROP_W + x) * 3;
    return Math.abs(buf[i] - GOLD[0]) < 26 && Math.abs(buf[i + 1] - GOLD[1]) < 26 &&
           Math.abs(buf[i + 2] - GOLD[2]) < 30;
  };
  const runs = [];
  for (let x = 0; x < CROP_W; x++) {
    let r = 0, best = 0;
    for (let y = 0; y < CROP_H; y++) { if (isGold(x, y)) { r++; if (r > best) best = r; } else r = 0; }
    runs.push(best);
  }
  /* group adjacent columns that carry a tall-ish run, then judge the group */
  let from = -1, found = null;
  for (let x = 0; x <= CROP_W; x++) {
    const tall = x < CROP_W && runs[x] >= 30;
    if (tall && from < 0) from = x;
    if (!tall && from >= 0) {
      const w = x - from, tallest = Math.max.apply(null, runs.slice(from, x));
      if (w >= BAR_W[0] && w <= BAR_W[1] && tallest >= BAR_MIN_TALL &&
          from >= BAR_X[0] && from <= BAR_X[1]) found = { x: from, w: w, h: tallest };
      from = -1;
    }
  }
  return found;
}

console.log('qa-sq-films — the side quest\'s two films, in their own pixels\n');

const lesson = JSON.parse(fs.readFileSync(SRC_CONTENT, 'utf8'));
const films = [];
(lesson.chunks || []).forEach(ch => {
  ((ch.config || {}).steps || []).forEach(st => {
    if (st.clip && st.clip.src && (st.clip.captions || []).length) {
      films.push({ chunk: ch.id, step: st.title, clip: st.clip });
    }
  });
});

check(films.length === 2, 'both build cards carry a captioned film (' + films.length + ')');

/* ─────────────────────────────────────────────────────────────────────────
   THE ONE-FILM TIE (DFM 262, 26 Aug 2026).
   The Inspection now offers the SAME film the Drive build card offers, from a
   `clip` on its own chunk — so the file is named in TWO places in the content.
   That is the shape DFM 144/167(b) warns about: one fact in two homes drifts the
   first time somebody edits one of them, and here the drift would be silent and
   nasty. The Inspection would go on playing a film that no longer matches the
   card the pupil is being sent back to, and — worse — the caption sidecar this
   gate checks lives against sq-drive's array, so a drifted Inspection film would
   be playing burned-in words NOTHING is comparing against.
   So the two are held EQUAL, and the captions keep exactly one home: sq-drive's.
   The Inspection deliberately carries no captions array of its own — the words
   are burned into the mp4 and travel with it wherever it plays. */
const inspect = (lesson.chunks || []).find(ch => ch.engine === 'drivecheck');
const insClip = inspect && (inspect.config || {}).clip;
if (insClip) {
  const drive = films.find(f => f.chunk === 'sq-drive');
  check(!!drive, 'the Drive build card still carries the film the Inspection points at');
  if (drive) {
    check(String(insClip.src) === String(drive.clip.src),
      'ONE FILM, TWO BUTTONS: the Inspection\'s clip.src (' + insClip.src + ') is the SAME file as ' +
      'sq-drive\'s step clip (' + drive.clip.src + ')');
  }
  check(!(insClip.captions || []).length,
    'and the Inspection carries NO captions array of its own — the words are burned into the mp4 ' +
    'and sq-drive stays their one home (DFM 144)');
  check(!!insClip.close && /inspection/i.test(String(insClip.close)),
    'the overlay\'s close label says where she RETURNS to ("' + insClip.close + '") — rule 35, and ' +
    'it is true from both places the film can be opened');
  /* CONTROL (DFM 196): the tie is run again over a DRIFTED copy of the same two
     homes and must condemn it. The comparison is between the two content values,
     never against a hardcoded filename — so editing EITHER home on its own is
     what breaks it, which is the only version of this check worth having. */
  const tie = (a, b) => String(a) === String(b);
  control(drive ? !tie(drive.clip.src, 'assets/video/shared/DRIFTED.mp4') : false,
    'a DRIFTED Inspection film is CAUGHT: point clip.src at another file and the tie fails, ' +
    'naming both homes (sq-drive\'s step clip and sq-inspect\'s clip)');
  control(drive ? tie(drive.clip.src, insClip.src) === true : false,
    'and the shipped pair PASSES it — the tie is not merely strict (over-tightening guard)');
} else {
  check(false, 'the Inspection carries a clip (DFM 262 — a blocking check offers the route back ' +
    'to the film that taught what it checks)');
}

/* ─────────────────────────────────────────────────────────────────────────
   AND THE THIRD FILM, WHICH IS NOT ONE OF HIS (23 Aug 2026, DFM 253a).
   The cloud explainer on the briefing card is PIPELINE-MADE — scenes/lS1.js,
   recorded by lib/record.js with the frame and cursor laws enforced and the
   207d take gate measured per beat — so the record-time laws really did run
   over it, and `qa-harness-coverage` attributes it to the scene rather than to
   this file (a scene covers only the films it declares).
   What is left to check is what is true of any FINISHED film, plus the one
   thing no record-time law can see: whether the words burned into it are still
   the words in the lesson. Its captions are drawn into the frame by the
   recorder, not overlaid afterwards by ffmpeg, so there is no build step that
   could be re-run without them — the sidecar is written by the scene itself, as
   it shows each one, and make-sq-cloud.js refuses to publish when the two
   disagree. This holds the same line on every later run, so the check is not
   merely a thing somebody remembered to do once. */
{
  const brief = (lesson.chunks || []).find(c => c.engine === 'briefing') || {};
  const cfg = brief.config || {};
  const want = cfg.videoFilm || {};
  console.log('\n' + path.basename(String(cfg.video || '(none)')) + '   (' + (brief.id || '?') + ' / the briefing card)');
  if (!cfg.video) {
    check(false, 'the briefing card names a film');
  } else {
    const file = path.join(SHARED, path.basename(String(cfg.video)));
    if (!fs.existsSync(file)) check(false, 'the film exists at ' + cfg.video);
    else {
      check(true, 'the film exists at ' + cfg.video);
      const st = probe(file, 'stream=codec_type').split('\n').filter(Boolean);
      check(st.length === 1 && st[0] === 'video',
        'it is SILENT and video-only — every film on this platform is (DFM 139)', st.join('+'));
      const dm = probe(file, 'stream=width,height').split('\n');
      check(dm[0] === '1280' && dm[1] === '720', 'it is the platform frame, 1280x720', dm.join('x'));
      const dur = parseFloat(probe(file, 'format=duration'));
      check(dur > 40 && dur < 120,
        'it is the length the six beats add up to (' + dur.toFixed(1) + 's)');
      const side = file.replace(/\.mp4$/, '.captions.json');
      if (!fs.existsSync(side)) {
        check(false, 'the film records what it showed (' + path.basename(side) + ') — re-run make-sq-cloud.js');
      } else {
        const rows = (JSON.parse(fs.readFileSync(side, 'utf8')).burned || []);
        const burned = rows.map(b => String(b.text));
        const asked = (want.captions || []).map(String);
        check(JSON.stringify(burned) === JSON.stringify(asked),
          'the words shown in the film ARE the words in the lesson — an edited caption cannot ship un-filmed',
          burned.length !== asked.length ? (burned.length + ' filmed v ' + asked.length + ' in content')
            : 'first difference: ' + JSON.stringify((asked.find((w, i) => w !== burned[i]) || '')));
        check(rows.every(r => r.to > r.from) && rows.every((r, i) => i === 0 || r.from >= rows[i - 1].to),
          'every caption is timed, in order, and none overlaps the next');
        check(rows.every(r => r.to <= dur + 0.5), 'and every one of them ends inside the film');
        /* IN REAL PIXELS, INSIDE EACH CAPTION'S OWN WINDOW — the same check his
           two own films get, on the same code path. A FIXED GRID does not work
           here and the film taught me that: a caption cross-fade takes 300ms, a
           sample at 62% of the running time landed inside one, and the gate
           reported a missing caption on a film that is captioned end to end. A
           gate that invents a fault is worse than no gate (DFM 146a) — so this
           samples where the recorder says a caption WAS. */
        const mids = rows.map(r => +(((r.from + r.to) / 2)).toFixed(2));
        const seen = mids.map(t => captionBarAt(file, t));
        const missing = seen.map((n, i) => n ? null : ((i + 1) + ' @' + mids[i] + 's')).filter(Boolean);
        check(missing.length === 0,
          'a caption really IS on screen in the middle of all ' + rows.length + ' of its windows',
          'nothing found at: ' + missing.join(', '));
        control(!!seen[0],
          'it says YES at ' + mids[0] + 's, inside the first caption — so a missing caption would fail');
      }
      /* and the detector is proved the other way on this film too: the title
         card, before the first caption, must have no box on it */
      control(!captionBarAt(file, 0.6),
        'the detector says NO on the title card at 0.6s, before any caption — it is not answering yes to everything');
    }
  }
}

for (const f of films) {
  const name = path.basename(f.clip.src);
  const file = path.join(SHARED, name);
  console.log('\n' + name + '   (' + f.chunk + ' / ' + f.step + ')');

  if (!fs.existsSync(file)) { check(false, 'the film exists at ' + f.clip.src); continue; }
  check(true, 'the film exists at ' + f.clip.src);

  const streams = probe(file, 'stream=codec_type').split('\n').filter(Boolean);
  check(streams.length === 1 && streams[0] === 'video',
    'it is SILENT and video-only — every film on this platform is (DFM 139)', streams.join('+'));

  const dims = probe(file, 'stream=width,height').split('\n');
  check(dims[0] === '1280' && dims[1] === '720', 'it is the platform frame, 1280x720', dims.join('x'));

  const dur = parseFloat(probe(file, 'format=duration'));
  const rawName = name.replace(/\.mp4$/, '') + '.mp4';
  const raw = path.join(RAW_DIR, rawName);
  if (fs.existsSync(raw)) {
    const rawDur = parseFloat(probe(raw, 'format=duration'));
    check(Math.abs(dur - rawDur) < 1.5,
      'it is as long as his capture, so nothing was truncated (' + dur.toFixed(1) + 's v ' + rawDur.toFixed(1) + 's)');
  }

  /* THE WORDS BURNED IN ARE THE WORDS IN THE CONTENT. The build writes a
     sidecar naming exactly what it burned; this compares it to the lesson,
     word for word and second for second. */
  const side = file.replace(/\.mp4$/, '.captions.json');
  if (!fs.existsSync(side)) {
    check(false, 'the film records what it burned in (' + path.basename(side) + ') — re-run make-sq-films.js');
  } else {
    const burned = (JSON.parse(fs.readFileSync(side, 'utf8')).burned || [])
      .map(c => [Number(c.from), Number(c.to), String(c.text)]);
    const want = f.clip.captions.map(c => [Number(c.from), Number(c.to), String(c.text)]);
    check(JSON.stringify(burned) === JSON.stringify(want),
      'the words burned into the film ARE the words in the lesson — an edited caption cannot ship un-burned',
      burned.length !== want.length ? (burned.length + ' burned v ' + want.length + ' in content')
        : 'first difference: ' + JSON.stringify((want.find((w, i) => JSON.stringify(w) !== JSON.stringify(burned[i])) || [])[2] || ''));
  }

  /* the caption table itself */
  const caps = f.clip.captions.map(c => [Number(c.from), Number(c.to), String(c.text)]);
  check(caps.every(c => c[1] > c[0]), 'every caption ends after it starts');
  check(caps.every(c => c[1] <= dur), 'every caption ends inside the film (' + dur.toFixed(1) + 's)');
  check(caps.every((c, i) => i === 0 || c[0] >= caps[i - 1][1]),
    'the captions are in order and never overlap — two stacked boxes is DFM 141a\'s family');
  check(caps.every(c => c[2].trim().length > 0), 'no caption is empty');

  /* IN REAL PIXELS: a box is on screen during each caption, and gone between */
  const mids = caps.map(c => (c[0] + c[1]) / 2);
  const onScreen = mids.map(t => captionBarAt(file, t));
  const missing = onScreen.map((n, i) => n ? null : (i + ' @' + mids[i].toFixed(0) + 's')).filter(Boolean);
  check(missing.length === 0,
    'a caption really IS on screen at the middle of all ' + caps.length + ' of its windows',
    'nothing found at: ' + missing.join(', '));

  const gaps = [];
  caps.forEach((c, i) => {
    const nextStart = i + 1 < caps.length ? caps[i + 1][0] : dur;
    if (nextStart - c[1] >= 2.5) gaps.push(c[1] + (nextStart - c[1]) / 2);
  });
  if (gaps.length) {
    const stray = gaps.map(t => captionBarAt(file, t) ? t.toFixed(0) + 's' : null).filter(Boolean);
    check(stray.length === 0, 'and no caption lingers in the ' + gaps.length + ' gap(s) between them',
      'a box was still up at: ' + stray.join(', '));
    control(!captionBarAt(file, gaps[0]),
      'the detector says NO at ' + gaps[0].toFixed(0) + 's, where there is no caption — it is not answering yes to everything');
  }
  control(!!onScreen[0],
    'and says YES at ' + mids[0].toFixed(0) + 's, inside the first caption — so a missing caption would fail');
}

/* ─────────────────────────────────────────────────────────────────────────
   AND THE BUTTON ITSELF, IN THE RUNNING APP. Everything above is about two
   files; this is about the control that reaches them. A "Show me how" button
   over a src that 404s is the worst version of this feature (DFM 42/184 - a
   dead control does not ship), and nothing else in the set would catch it,
   because the mp4 can be perfect and the path still wrong.
   Needs the static server on :8121. */
(async () => {
  const { chromium } = require('./node_modules/playwright');
  const BASE = process.env.KS3DT_BASE || 'http://localhost:8121';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const WALK = require('./lib/walk-moves.js');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const url = BASE + '/ks3-dt/platform/index.html?class=Demo-8A&as=anya';

  console.log('\nTHE BUTTON, in the running app');
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1800);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks['Demo-8A'] = db.locks['Demo-8A'] || {};
    ['1', 'S1'].forEach(n => { db.locks['Demo-8A'][n] = { u: now, on: 1 }; });
    db.cfg = db.cfg || {}; db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: 0 };
    const pk = 'Demo-8A:anya.murphy@demo';
    db.pupils = db.pupils || {};
    db.pupils[pk] = Object.assign(db.pupils[pk] || { n: 'Anya Murphy', cn: '', j: 1, xp: 0, g: '' },
      { L: { '1': [2, 10, 'sit1=1', '1', '222|1', 100, 10, 0, '', 0, 0] } });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(600);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(x => /Files That Follow You/i.test(x.textContent || ''));
    if (t) t.click();
  });
  await sleep(2200);
  await WALK.primeDevKeys(page, url);

  for (const want of [{ chunk: 'sq-drive', film: 'sq-drive-build.mp4' },
                      { chunk: 'sq-onedrive', film: 'sq-onedrive.mp4' }]) {
    let there = false;
    for (let i = 0; i < 80; i++) {
      const st8 = await page.evaluate(() => ({
        chunk: (window.App && App.state && App.state.chunks && App.state.chunks[App.state.chunkIdx] || {}).id || null,
        btn: !!document.querySelector('.step-clip-btn'),
        step: (document.querySelector('.runner-progress') || {}).textContent || ''
      }));
      if (st8.chunk === want.chunk && st8.btn) { there = true; break; }
      const st = await page.evaluate(WALK.detectKind);
      const mv = st && WALK.MOVES[st.kind];
      if (!mv) { await sleep(800); continue; }
      await page.evaluate(([src]) => { (new Function('return (' + src + ')')())(); }, [String(mv)]);
      await sleep(WALK.SETTLE[st.kind] || 600);
    }
    check(there, want.chunk + ': step 1 really carries a "Show me how" button');
    if (!there) continue;
    const label = await page.evaluate(() => (document.querySelector('.step-clip-btn') || {}).textContent || '');
    check(/Show me how/.test(label), '  and it is labelled "Show me how" (' + JSON.stringify(label.trim()) + ')');
    await page.evaluate(() => document.querySelector('.step-clip-btn').click());
    await sleep(2500);
    const v = await page.evaluate(() => {
      const el = document.querySelector('.film-modal video');
      if (!el) return null;
      return { src: el.getAttribute('src'), err: el.error ? el.error.code : 0, dur: el.duration || 0,
               noteHidden: !!(document.querySelector('.clip-note') || {}).hidden };
    });
    check(!!v, '  one click puts a player on screen');
    if (v) {
      check(v.err === 0 && v.dur > 100, '  the film DECODES in the app (' + (v.dur || 0).toFixed(1) + 's, error ' + v.err + ')');
      check(new RegExp(want.film.replace('.', '\\.')).test(v.src || ''), '  and it is the right film (' + v.src + ')');
      /* DFM 42's other half, and the reason the engine's backstop was fixed this
         round: the note must NOT be showing two seconds into a two-minute film. */
      check(v.noteHidden, '  the note is still hidden this early - it appears after the film, not halfway through');
    }
    await page.evaluate(() => { const b = document.querySelector('.clip-close'); if (b) b.click(); });
    await sleep(900);
  }
  check(errs.length === 0, 'zero page errors while opening both films', JSON.stringify(errs.slice(0, 3)));
  await browser.close();

  console.log('');
  if (failures) { console.log('qa-sq-films: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-sq-films: ALL GREEN');
})().catch(e => { console.error('qa-sq-films FAILED: ' + e.message); process.exit(1); });
