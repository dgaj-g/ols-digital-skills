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

const BASE_REF = 'b34f945';          /* the V52 build he is running — PINNED */
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
          video: (c.config || {}).video || null
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
  let baseEngine = null;
  try {
    baseEngine = execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':' + ENGINES], {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
    });
  } catch (e) {
    check(false, 'the pre-change engine can be read out of git at ' + BASE_REF, e.message);
  }
  if (baseEngine) {
    check(!/dossier-film/.test(baseEngine),
      'and it really is the PRE-change engine — it has no film block in it (' + BASE_REF + ')');
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
    /* wait for the card to finish typing itself out */
    for (let i = 0; i < 60; i++) {
      const done = await page.evaluate(() => {
        const cta = document.querySelector('.dossier-cta');
        return !!(cta && !cta.hidden);
      });
      if (done) break;
      await sleep(400);
    }
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
    if (!card.video) {
      check(now.html === was.html,
        card.lesson + ' › ' + card.chunk + ': renders BYTE-IDENTICALLY to the pre-change engine',
        now.html === was.html ? '' : 'first difference at character ' +
          [...now.html].findIndex((ch, i) => ch !== was.html[i]));
    } else {
      filmSeen = { now: now.html, was: was.html, card: card };
      check(now.html !== was.html,
        card.lesson + ' › ' + card.chunk + ': DOES differ from the pre-change engine — it is the one card with a film');
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
    /* THE CONTROL, both ways: strip the film field and the very same card must
       collapse back onto the pre-change DOM. */
    control(filmSeen.was.indexOf('dossier-film') === -1,
      'the SAME card, rendered by the pre-change engine, has no film block at all — so the block is genuinely the new thing');
    const stripped = h.replace(/<div class="dossier-film">.*?<\/div>/s, '')
      .replace(' has-film', '');
    control(stripped === filmSeen.was,
      'and with the film block and the widening class removed it is byte-identical to the old render — ' +
      'the wire adds exactly the film and nothing else');
  }

  await browser.close();
  console.log('');
  if (failures) { console.log('qa-briefing-film: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-briefing-film: ALL GREEN');
})().catch(e => { console.error('qa-briefing-film FAILED: ' + e.message); process.exit(1); });
