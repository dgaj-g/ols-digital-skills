#!/usr/bin/env node
/* qa-briefing-film.js — THE BRIEFING FILM SLOT, and the promise that comes with it.
 *
 * DFM 253(a) wired a film into `Engines.briefing`, whose `video` field had sat in
 * content with ZERO readers. The wire is config-gated, and the whole safety of it
 * rests on one sentence: EVERY OTHER BRIEFING CARD ON THE PLATFORM RENDERS
 * EXACTLY AS IT DID BEFORE. Nine of the ten briefing cards live in lessons he has
 * signed off (DFM 176/203/218), so that sentence is not a hope, it is the lock.
 *
 * A sentence nobody tested is not a promise (DFM 235), so this proves it the only
 * way it can be proved: it renders every briefing card in a real browser TWICE —
 * once with the engine that ships, and once with the engine from BEFORE the
 * change, intercepted and served in its place — and holds the two DOMs
 * byte-identical for every card that names no film.
 *
 * WHY THE OLD ENGINE IS PULLED FROM GIT RATHER THAN DESCRIBED: a control that
 * reasons about what the old code "would have done" proves nothing. This one runs
 * it. BASE_REF is PINNED, never 'HEAD' — a floating base silently becomes the
 * fixed code the moment the fix commits, and the control then passes by being
 * vacuous (the qa-pair-stores lesson, DFM 196).
 *
 * And the other half, because a gate that only proves nothing changed would pass
 * just as happily if the film never rendered at all: on the side quest's card the
 * player must EXIST, carry the right file, and sit ABOVE the typed lines — which
 * is where the spec puts it and where the second line of the card sends her.
 *
 * Needs the static server on :8121.
 *   node qa-briefing-film.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/* THE BASE IS THE BUILD HE SAT, AND IT MOVES WITH EACH ROUND — 27 Aug 2026.
   It used to be pinned at `b34f945` (V52), and the claim it made was "every
   briefing card renders byte-identically to the V52 engine". That claim stopped
   being true the moment a LATER round legitimately changed the engine — the V58
   Continue-button cap did exactly that — so by 27 August this gate was reporting
   two rounds of intended work as faults on j2-02, j2-03 and j3-03. Proved rather
   than assumed: the gate was run from the 7d9c274 worktree, where it fails the
   same three cards, so the failures were never this round's.
   WHAT THE GATE IS FOR is the config-gate promise: THIS round's change touches
   nothing it did not mean to touch. That question needs the base to be the build
   he sat, and it needs re-pinning every round — which is the note below. */
const BASE_REF = '7d9c274';          /* the build he sat, V58 — PINNED, re-pin each round */
const REPO = path.join(__dirname, '..', '..', '..');
const ENGINES = 'ks3-dt/platform/engines.js';
const CONTENT = process.env.KS3DT_CONTENT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const BASE = process.env.KS3DT_BASE || 'http://localhost:8121';

let failures = 0;
const check = (ok, m, d) => {
  if (ok) console.log('  PASS  ' + m);
  else { failures++; console.log('  FAIL  ' + m + (d ? '\n          ' + d : '')); }
};
const control = (ok, m) => {
  if (ok) console.log('  PASS  CONTROL: ' + m);
  else { failures++; console.log('  FAIL  CONTROL: ' + m); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* every briefing card on the platform, found by walking the content rather than
   by a list somebody keeps up to date (DFM 206's own principle) */
function briefingCards() {
  const index = JSON.parse(fs.readFileSync(path.join(CONTENT, 'index.json'), 'utf8'));
  const out = [];
  (index.years || []).forEach(y => {
    const man = JSON.parse(fs.readFileSync(path.join(CONTENT, y.manifest), 'utf8'));
    (man.lessons || []).forEach(row => {
      /* a manifest lesson is a ROW, not an id — and it names its own file
         (DFM 240: a surface that needs a lesson derives it from that lesson's
         own record, never from its number) */
      const f = path.join(CONTENT, row.file || (y.id + '/lessons/' + row.id + '.json'));
      if (!fs.existsSync(f)) return;
      const L = JSON.parse(fs.readFileSync(f, 'utf8'));
      (L.chunks || []).forEach((c, i) => {
        if (c.engine !== 'briefing') return;
        out.push({
          lesson: L.id, year: y.id, num: String(L.num), title: L.title, chunk: c.id, at: i,
          video: (c.config || {}).video || null,
          demoAfterLine: Number((c.config || {}).demoAfterLine || 0),
          lines: ((c.config || {}).lines || []).length
        });
      });
    });
  });
  return out;
}

const CLASS = { j1: 'Demo-8A', j2: 'Demo-9A', j3: 'Demo-10A' };
const PUPIL = { j1: 'anya', j2: 'aoife', j3: 'orla' };

(async () => {
  console.log('qa-briefing-film — the film slot, and the nine cards it must not touch\n');

  const cards = briefingCards();
  check(cards.length >= 10, 'the walk finds every briefing card in every year (' + cards.length + ')');
  const withFilm = cards.filter(c => c.video);
  check(withFilm.length === 1 && withFilm[0].lesson === 'j1-sq1',
    'exactly one of them names a film, and it is the side quest\'s (' +
    withFilm.map(c => c.lesson).join(', ') + ')');

  /* the engine as it was before the wire, run rather than described */
  let baseEngine = null;   /* reassigned below for the second base */
  try {
    baseEngine = execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':' + ENGINES], {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
    });
  } catch (e) {
    check(false, 'the pre-change engine can be read out of git at ' + BASE_REF, e.message);
  }
  if (baseEngine) {
    check(!/demoAfterLine/.test(baseEngine),
      'and it really is the engine he sat — it has no demoAfterLine in it (' + BASE_REF + ')');
  }

  const { chromium } = require('./node_modules/playwright');
  const browser = await chromium.launch();

  /* one page load per card per engine; the DOM is read once the card has
     finished typing itself out, which is when the CTA appears */
  async function dossierOf(card, useBase) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    if (useBase) {
      await page.route('**/platform/engines.js*', route =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: baseEngine }));
    }
    const url = BASE + '/ks3-dt/platform/index.html?class=' + CLASS[card.year] +
      '&as=' + PUPIL[card.year];
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(1200);
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(1600);
    /* unlock every lesson of this class, so the tile can be opened */
    await page.evaluate(([cls]) => {
      const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
      const now = Math.floor((Date.now() - 1767225600000) / 60000);
      db.locks = db.locks || {}; db.locks[cls] = db.locks[cls] || {};
      ['1', '2', '3', '4', '5', 'S1'].forEach(n => { db.locks[cls][n] = { u: now, on: 1 }; });
      localStorage.setItem('ks3dt-dev', JSON.stringify(db));
    }, [CLASS[card.year]]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
    await sleep(500);
    /* found by the lesson's own TITLE, which is the text the tile renders — not
       by its number, because a number is unique inside a year and meaningless
       across them (DFM 240) */
    const opened = await page.evaluate(([title]) => {
      const t = Array.from(document.querySelectorAll('.tile'))
        .find(x => ((x.querySelector('.tile-title') || {}).textContent || '').trim() === title);
      if (t) { t.click(); return true; }
      return false;
    }, [card.title]);
    if (!opened) {
      const seen = await page.evaluate(() => Array.from(document.querySelectorAll('.tile-title'))
        .map(n => n.textContent.trim()));
      await page.close();
      return { html: null, errs: ['no tile titled ' + JSON.stringify(card.title) + ' (saw ' + JSON.stringify(seen) + ')'] };
    }
    /* WAIT FOR THE CARD TO BE FINISHED, NOT FOR THE WAY OUT TO APPEAR.
       This used to wait for `.dossier-cta` — and on a card carrying a demo the
       CTA is shown IMMEDIATELY on purpose (DFM 42/205: she is never held on a
       screen with nothing to press). So the DOM was read about two seconds in,
       with one or two of twelve lines on screen, and the comparison was between
       two half-drawn cards. A gate that measures a screen nobody is on is the
       DFM 204 fault in miniature. It now waits for every authored line to have
       landed, with the CTA as the backstop for cards that animate nothing. */
    const wantLines = Number(card.lines || 0);
    for (let i = 0; i < 80; i++) {
      const st = await page.evaluate(() => ({
        lines: document.querySelectorAll('.dossier-line').length,
        cta: !!(document.querySelector('.dossier-cta') && !document.querySelector('.dossier-cta').hidden)
      }));
      if (st.cta && (!wantLines || st.lines >= wantLines)) break;
      await sleep(400);
    }
    await sleep(600);
    const html = await page.evaluate(() => {
      const d = document.querySelector('.dossier');
      return d ? d.outerHTML : null;
    });
    await page.close();
    return { html: html, errs: errs };
  }

  console.log('\nEVERY BRIEFING CARD, SHIPPED ENGINE v PRE-CHANGE ENGINE');
  let filmSeen = null;
  for (const card of cards) {
    const now = await dossierOf(card, false);
    const was = await dossierOf(card, true);
    if (!now.html || !was.html) {
      check(false, card.lesson + ' › ' + card.chunk + ': the card renders on both engines',
        'now=' + (now.html ? 'ok' : 'MISSING ' + now.errs.join('; ')) +
        '  base=' + (was.html ? 'ok' : 'MISSING ' + was.errs.join('; ')));
      continue;
    }
    if (card.video) filmSeen = { now: now.html, was: was.html, card: card };
    if (!card.demoAfterLine) {
      check(now.html === was.html,
        card.lesson + ' › ' + card.chunk + ': renders BYTE-IDENTICALLY to the card he sat',
        now.html === was.html ? '' : 'first difference at character ' +
          [...now.html].findIndex((ch, i) => ch !== was.html[i]));
    } else {
      check(now.html !== was.html,
        card.lesson + ' › ' + card.chunk + ': DOES differ — it is the one card that moves its demo');
    }
    check((now.errs || []).length === 0, card.lesson + ' › ' + card.chunk + ': zero page errors',
      (now.errs || []).join('; '));
  }

  console.log('\nTHE FILM ITSELF, on the side quest\'s card');
  if (!filmSeen) check(false, 'the side quest\'s briefing was reached');
  else {
    const h = filmSeen.now;
    check(/<div class="dossier-film">/.test(h), 'the card carries a film block');
    check(/sq-cloud-explainer\.mp4/.test(h), 'and it is the right film');
    check(/controls/.test(h) && /playsinline/.test(h) && /preload="metadata"/.test(h),
      'and it is the platform\'s own player — controls, preload=metadata, playsinline');
    const iFilm = h.indexOf('dossier-film');
    const iLines = h.indexOf('dossier-lines');
    check(iFilm > 0 && iLines > 0 && iFilm < iLines,
      'and it sits ABOVE the typed lines, which is where the card\'s second line sends her');
    check(/class="dossier has-film"/.test(h),
      'the card widens for it by a CLASS, not by a :has() selector a school browser may not have');
    /* THE FILM WIRE'S CONTROL BELONGS TO ITS OWN ROUND, AND SO DOES ITS BASE.
       This used to read the gate's single base — which is now the build he sat,
       and the film has been shipping since V53, so the control was asking
       whether a four-day-old engine lacked a five-day-old feature and failing
       honestly. One pinned base per claim (DFM 196): the film's claim is about
       the engine BEFORE the wire. */
    /* THE FILM WIRE'S OWN CONTROL keeps its own base, because it is a claim about
       a DIFFERENT round: the block was genuinely new at V53, and that stays true
       whatever this engine does next. One pinned base per claim (DFM 196). */
    const FILM_REF = 'b34f945';
    let filmBase = null;
    try {
      filmBase = execFileSync('git', ['-C', REPO, 'show', FILM_REF + ':' + ENGINES],
        { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    } catch (e) { /* reported */ }
    control(!!filmBase && !/dossier-film/.test(filmBase),
      'the engine BEFORE the film wire (' + FILM_REF + ') has no film block in it at all — ' +
      'so the block on this card is genuinely the thing that round added');
  }

  /* ==== WHERE THE DEMO LANDED, read off the rendered card ================
     His find, 27 Aug 2026: the workshop card's line 6 reads "Here is a small one
     running. Watch it once before you build your own." and the demo rendered at
     the BOTTOM of the card, after six more lines — a sentence pointing at
     something that was not there (rule 35 on position). */
  console.log('\nWHERE THE DEMO LANDED (F2)');
  const moved = cards.filter(c => c.demoAfterLine)[0];
  if (!moved) check(false, 'a card with demoAfterLine was found');
  else {
    const now = await dossierOf(moved, false);
    const was = await dossierOf(moved, true);
    const idx = (html) => {
      const cut = html.indexOf('<div class="dossier-demo">');
      return cut < 0 ? -1 : (html.slice(0, cut).match(/<p class="dossier-line/g) || []).length;
    };
    check(idx(now.html) === moved.demoAfterLine,
      'the demo sits under line ' + idx(now.html) + ' — the line that points at it (asked for: ' +
      moved.demoAfterLine + ')');
    const total = (now.html.match(/<p class="dossier-line/g) || []).length;
    check(total === moved.lines, 'and the whole card really was drawn before it was read (' +
      total + ' of ' + moved.lines + ' lines)');
    control(idx(was.html) === (was.html.match(/<p class="dossier-line/g) || []).length,
      BASE_REF + ' really rendered the demo AFTER every line — his own exhibit, in the DOM (line ' +
      idx(was.html) + ' of ' + (was.html.match(/<p class="dossier-line/g) || []).length + ')');
  }

  await browser.close();
  console.log('');
  if (failures) { console.log('qa-briefing-film: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-briefing-film: ALL GREEN');
})().catch(e => { console.error('qa-briefing-film FAILED: ' + e.message); process.exit(1); });
