#!/usr/bin/env node
/* sit-teacher.js — A COLLEAGUE WHO HAS NEVER OPENED THIS MARKBOOK DRIVES EVERY
 * SCREEN OF IT, AND EVERY LAW IS ASKED OF EACH ONE.
 *
 * WHY. The first markbook was judged "not fit for purpose", and the standing
 * law since (feedback_ease_and_beauty_law) is that a markbook which needs
 * explaining has failed. The teacher's register has a second problem the
 * pupil's does not: there was never a net NOR a read over it (DFM 257). This
 * walk is the net; the transcript it writes is what the separated judge reads.
 *
 * THE WALK, in the order a teacher meets it (gates design 4H):
 *   the cover -> a wrong passcode (the error stays on the cover) -> the right
 *   one -> Set-up, the class list -> open a class COLD (it must say WHICH class
 *   it is loading, by name, before the fetch) -> the class page -> the book
 *   switcher -> an exercise card -> the exercise view -> a cell -> a pupil's
 *   book -> the flick -> the question view -> slips -> the starter board on a
 *   projector -> the full grid -> the CSV -> Set-up: the tickboxes grouped by
 *   series, the link and QR, a two-press delete -> back.
 *
 * On every state: the derived audits ride along, zero console errors, every
 * stat sits inside a region labelled with its book AND exercise, the legend is
 * visible without hover (a touch smartboard has none), every disabled control
 * says what it is waiting for.
 */
'use strict';
const fs = require('fs');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const B = require('./lib/browser.js');
const W = require('./lib/walk-moves.js');
const AUD = require('./lib/audits.js');
const S = require('./lib/stage.js');
const { contentHash } = require('./lib/hash.js');

/* ONE SENTENCE PER FINDING, and it NAMES THE THING. The first cut printed the
   law and nothing else - "marking-colour-outside-a-mark", forty times - which
   tells a reader what rule broke and nothing about where to look. */
function describe(f) {
  const bits = [];
  if (f.law) bits.push(f.law);
  if (f.sel) bits.push(f.sel);
  if (f.tag) bits.push('<' + f.tag + '>' + (f.cls || ''));
  if (f.container) bits.push(f.inner + ' inside ' + f.container);
  if (f.prop) bits.push('(' + f.prop + ': ' + f.colour + ')');
  if (f.over) bits.push('overflows ' + f.card + ' by ' + f.over + 'px');
  if (f.qid) bits.push('on ' + f.qid);
  if (f.ratio != null) bits.push(f.ratio + ':1');
  if (!bits.length) bits.push(JSON.stringify(f).slice(0, 100));
  if (f.text) bits.push('["' + String(f.text).slice(0, 50) + '"]');
  return bits.join('  ');
}

const TIER = 'full';
const ORDER = 62;
const COVERS = {
  books: '*', kinds: [],
  surfaces: ['staff-cover', 'class-page', 'exercise-view', 'question-view', 'book-view', 'slips', 'full-grid', 'set-up'],
  widths: [375, 768, 1280], projector: true, tier: ['preview'],
  cells: ['teacher-walk', 'geometry', 'readability', 'colour', 'empty', 'nested', 'strings']
};
const CONTROLS = [
  /* the phrase this waited for - "only on hover" - is not what the gate says
     and has not been for some time; the gate fired every run and the control
     read DID NOT FIRE. A control that quotes a sentence must quote the one the
     gate actually prints. */
  { id: 'hover-only-legend', kind: 'fixture', plant: 'fixture-staff', mustFail: /a smartboard has no hover/ },
  /* the link-and-QR modal's own message slot, found on 8 Sept 2026 by the first
     walk ever to open it (package V4-STATES) */
  { id: 'qr-modal-empty-live-region', kind: 'fixture', plant: 'fixture-staff-qr-live-region', mustFail: /<p>\.ui-msg/ },
  /* and this one planted the LEGEND fault and waited for the exercise-card
     message, which that plant cannot produce. Two controls sharing one plant is
     how a gate goes years without being asked its own question. */
  { id: 'unlabelled-stat', kind: 'fixture', plant: 'fixture-unlabelled-stat', mustFail: /names no exercise/ },
  /* THE ONE HE FOUND HIMSELF. The markbook's class names were white on white and
     every gate was green; the readability audit existed, in lib/, and nothing
     called it. This plants that fault back and the walk has to see it. */
  { id: 'invisible-class-names', kind: 'fixture', plant: 'fixture-invisible-text', mustFail: /against what is actually behind it/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const BASE = process.env.MS_BASE || 'http://localhost:8099/maths/mathshelf/index.html';
const WIDTHS = (process.env.MS_WIDTHS || '375,768,1280').split(',').map(Number);
const PROJECTOR = { width: 1280, height: 720 };

const g = new Gate('sit-teacher');
g.exempt(AUD.EXEMPTIONS.concat([
  'a second teacher is walked under mocks in qa-staff-authority, not here: the offline preview has ONE staff identity, and that limit is real',
  'the projector pass is 1280x720 at deviceScaleFactor 1 - every teacher screen must read from the back of the room'
]));

async function walk(page, width, projector, sidecar, transcript) {
  const say = (s) => { if (s && String(s).trim()) transcript.push(String(s).trim().replace(/\s+/g, ' ')); };
  const state = () => page.evaluate(() => {
    const r = document.getElementById('scr-staff');
    return r ? { surface: r.getAttribute('data-surface'), state: r.getAttribute('data-state') } : null;
  });
  const record = async (fallbackSurface, fallbackState) => {
    await W.settle(page);
    const s = (await state()) || {};
    const a = await AUD.run(page, { clickSafety: true });
    sidecar.states.push({ surface: s.surface || fallbackSurface, state: s.state || fallbackState, width, projector: !!projector, audits: a.verdicts, measured: a.measured });
    /* A PICTURE OF THE THING IT CONDEMNED. A contrast finding is a number, and a
       number cannot be argued with or agreed with - "Angles is 1.03:1" read as
       white-on-white on a screen that is navy-on-cream when you look at it, and
       the only way to know which of us was right was to go and look. The walk
       now saves the screen it was measuring, beside the finding, every time. */
    const anyVisual = (a.findings.readability || a.findings.overlap || []).length;
    if (anyVisual) {
      const tag = ((s.surface || fallbackSurface) + '-' + (s.state || fallbackState) + '-' + width).replace(/[^a-z0-9-]/gi, '');
      try { fs.mkdirSync(A.out('shots'), { recursive: true }); } catch (e) {}
      try { await page.screenshot({ path: A.out('shots/' + tag + '.png') }); } catch (e) {}
      g.note('picture of that screen: tools/qa/out/shots/' + tag + '.png');
    }
    Object.keys(a.findings).forEach(k => (a.findings[k] || []).forEach(f => {
      /* the raw row behind a finding, when you are arguing with a number */
      if (process.env.MS_DEBUG_FINDINGS) g.note('RAW ' + k + ' ' + JSON.stringify(f));
      g.fail((s.surface || fallbackSurface) + ':' + (s.state || fallbackState) + ' @' + width + (projector ? 'x720' : ''), k,
        k === 'readability' ? AUD.describeContrast(f) : k === 'overlap' ? AUD.describeOverlap(f) : k === 'said-twice' ? AUD.describeSaidTwice(f) : describe(f));
    }));
  };
  /* record a row directly, from a state already known — used where reading
     the live DOM afterward would report a DIFFERENT, later screen (see
     armLog/drewState below) rather than the one this call actually stood on */
  const recordKnown = async (surface, knownState, extra) => {
    const a = await AUD.run(page, { clickSafety: true });
    sidecar.states.push(Object.assign({ surface, state: knownState, width, projector: !!projector }, extra || {}, { audits: a.verdicts, measured: a.measured }));
    Object.keys(a.findings).forEach(k => (a.findings[k] || []).forEach(f => {
      g.fail(surface + ':' + knownState + ' @' + width + (projector ? 'x720' : ''), k,
        k === 'readability' ? AUD.describeContrast(f) : k === 'overlap' ? AUD.describeOverlap(f) : k === 'said-twice' ? AUD.describeSaidTwice(f) : describe(f));
    }));
  };

  /* THE STATE LOG (package V4-STATES, 8 Sept). A HANDFUL OF STATES ARE SET
     AND OVERWRITTEN IN THE SAME BREATH: "book-switch" (SURF then
     showClassPage()) and "flicking" (SURF then showJotterPage()) both call a
     function that re-renders the whole panel and stamps ITS OWN state over
     the one just set - all inside the one click handler, no async gap a
     settle() or a wait() could ever land inside. Patching setAttribute once,
     for the life of this page, is how the walk stands on what the app
     actually drew rather than only on what a tick later left standing - the
     same problem the audits solve for the app's own faults, applied to the
     walk's own reading of the DOM. */
  const armLog = () => page.evaluate(() => {
    window.__stateLog = [];
    if (window.__setAttrPatched) return;
    window.__setAttrPatched = true;
    const orig = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name === 'data-state') window.__stateLog.push({ surface: this.getAttribute('data-surface'), state: value });
      return orig.apply(this, arguments);
    };
  });
  const drewState = async (surface, wantState) => {
    const log = await page.evaluate(() => window.__stateLog || []);
    return log.some((e) => e.surface === surface && e.state === wantState);
  };

  /* --- the cover, wrong passcode first --- */
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await W.settle(page);
  await page.evaluate(() => document.getElementById('cover-staff').click());
  await W.settle(page);
  await record('staff-cover', 'passcode-empty');
  say(await page.evaluate(() => (document.querySelector('#scr-staff .ui-msg') || {}).textContent || ''));

  /* WAIT FOR THE BOX BEFORE TYPING IN IT. The same race stage.js had: on a cold
     first run the passcode screen is not always painted when settle returns, so
     this died with "Cannot set properties of null" - which reads as a broken
     gate and is really a hurry. hover-only-legend is the FIRST teacher control
     in every battery, so it was the one that hit it, every time, and its plant
     was never the problem. Fixing it in stage.js was not enough: this walk logs
     in itself and never calls stage.openApp. */
  await page.waitForFunction(() => !!document.querySelector('#st-pass') && !!document.querySelector('#st-go'),
    { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => {
    const i = document.querySelector('#st-pass');
    if (!i) throw new Error('the staff passcode box never appeared — the markbook never opened, so nothing below this was walked');
    i.value = 'not-the-passcode'; document.querySelector('#st-go').click();
  });
  await new Promise(r => setTimeout(r, 400));
  const stillOnCover = await page.evaluate(() => !!document.querySelector('#st-pass'));
  g.check(stillOnCover, 'staff-cover:passcode-wrong @' + width, 'waits',
    'a wrong passcode took her off the cover — the error belongs where she typed it');
  say(await page.evaluate(() => (document.querySelector('#st-msg') || {}).textContent || ''));
  await record('staff-cover', 'passcode-wrong');

  /* --- in --- */
  await page.evaluate(() => { const i = document.querySelector('#st-pass'); i.value = 'demo'; document.querySelector('#st-go').click(); });
  await new Promise(r => setTimeout(r, 1100));
  await record('set-up', 'classes');
  say(await page.evaluate(() => [...document.querySelectorAll('#scr-staff .ui-msg')].map(e => e.textContent).join(' ')));
  say(await page.evaluate(() => [...document.querySelectorAll('.ticks-series')].map(e => e.textContent).join(' / ')));

  /* the tickboxes are grouped by series and each names who its book is for */
  const ticks = await page.evaluate(() => ({
    groups: [...document.querySelectorAll('.ticks-series')].map(e => e.textContent.trim()),
    bands: [...document.querySelectorAll('.tick-band')].map(e => e.textContent.trim())
  }));
  g.check(ticks.groups.length > 0, 'set-up:tickboxes @' + width, 'labelled',
    'the tickbox list is not grouped by series — a teacher choosing books for a J3 class should not have to know which of them are GCSE');
  g.check(ticks.bands.filter(Boolean).length > 0, 'set-up:tickboxes @' + width, 'labelled',
    'no tickbox says who its book is for — the tickboxes ARE the level system, so the audience has to be on the row');

  /* --- open a class COLD --- */
  const cold = await page.evaluate(() => {
    const bs = [...document.querySelectorAll('#st-rows button')].filter(b => /Open the markbook/.test(b.textContent));
    const b = bs[bs.length - 1];
    if (!b) return null;
    b.click();
    /* read the strip AND the surface's own state in the SAME TICK as the
       press: a round trip owns its waiting state, and a spinner (or a
       "loading-cold" nobody wrote down) that appears later is a screen that
       went dead in between (DFM 42/161). The offline "wall" call resolves in
       one microtask - so a SEPARATE evaluate() taken even a beat later, after
       the round trip back to Node, reads "live" every time; this is the one
       state class-page:loading-cold can ever be caught in. */
    const strip = document.querySelector('.cp-strip');
    const su = document.querySelector('[data-surface="class-page"]');
    return { strip: strip ? strip.textContent : '', state: su ? su.getAttribute('data-state') : null };
  });
  const coldText = cold ? cold.strip : null;
  g.check(coldText != null && /Loading/i.test(coldText) && coldText.length > 10, 'class-page:loading-cold @' + width, 'waits',
    'the class page did not say which class it was loading, by name, in the same tick as the press (it said: "' + String(coldText).slice(0, 60) + '")');
  say(coldText);
  if (cold && cold.state === 'loading-cold') await recordKnown('class-page', 'loading-cold');
  await new Promise(r => setTimeout(r, 1500));
  await record('class-page', 'live');

  /* every stat names its home; the legend needs no hover */
  const labels = await page.evaluate(() => ({
    chips: [...document.querySelectorAll('.stat-chip')].map(e => e.innerText.trim()),
    cards: [...document.querySelectorAll('.excard')].map(e => ({
      exno: (e.querySelector('.exno') || {}).textContent || '',
      slip: (e.querySelector('.slipline') || {}).textContent || '',
      aria: e.getAttribute('aria-label') || ''
    })),
    legend: (document.querySelector('.cp-legend') || {}).innerText || '',
    legendHoverOnly: !!document.querySelector('.cp-legend[title]:not(:empty)') && !(document.querySelector('.cp-legend') || {}).innerText,
    needs: [...document.querySelectorAll('.pupilchip')].map(e => e.innerText.replace(/\n/g, ' — '))
  }));
  labels.chips.forEach(say);
  labels.needs.forEach(say);
  say(labels.legend);
  g.check(labels.legend.trim().length > 10, 'class-page:live @' + width, 'labelled',
    'the glyph key is not on the page — a smartboard has no hover, so a meaning that lives in a tooltip is a meaning nobody in the room can reach');
  labels.cards.forEach(c => {
    say(c.exno); say(c.slip);
    g.check(/Ex\s*\d/.test(c.exno), 'class-page:live @' + width, 'labelled',
      'an exercise card names no exercise — a number with no home is unreadable the moment two books are ticked');
    g.check(/Ex\s*\d/.test(c.slip) || /No repeated slip/.test(c.slip), 'class-page:live @' + width, 'labelled',
      'the named slip does not say which exercise it is in');
  });
  labels.chips.forEach(c => {
    g.check(/\b(pupils|started|finished)\b/.test(c), 'class-page:live @' + width, 'labelled',
      'a stat chip reads "' + c + '" with no word saying what it counts');
  });

  /* --- an exercise card -> the exercise view --- */
  await page.evaluate(() => { const c = document.querySelector('.excard'); if (c) c.click(); });
  await new Promise(r => setTimeout(r, 1300));
  await record('exercise-view', 'loaded');
  say(await page.evaluate(() => (document.querySelector('.exhead h3') || {}).textContent || ''));
  say(await page.evaluate(() => (document.querySelector('.ex-walt') || {}).textContent || ''));

  /* --- a column header -> the question view --- */
  const qvOpen = await page.evaluate(() => {
    const th = document.querySelector('.grid th[scope="col"]');
    if (!th) return null;
    th.click();
    /* read the surface's own state in the SAME TICK as the press: mounting
       reads "loading-progressive" and stays there through every one of the
       class's own "jotter" fetches - each one an offline call away, so a
       SEPARATE evaluate() a beat later always reads "loaded" instead */
    const su = document.querySelector('[data-surface="question-view"]');
    return su ? su.getAttribute('data-state') : null;
  });
  if (qvOpen === 'loading-progressive') await recordKnown('question-view', 'loading-progressive');
  await new Promise(r => setTimeout(r, 1500));
  await record('question-view', 'loaded');
  say(await page.evaluate(() => (document.querySelector('.q-prompt') || {}).textContent || ''));
  /* question-view:ink-open — LOOKED FOR AND NOT FOUND (confirmed by reading,
     not just by this probe failing to find it). `.qv-card` (staff.js, S3 The
     Question View) is built as plain display markup and carries no click
     handler and no `.verdict-mark` button anywhere - the only place
     `.verdict-mark` exists is inside showJotterPage() (S2, book-view), whose
     own shell() call hardcodes `surface:'book-view'` regardless of how it
     was reached (even its own "across the class" sweep mode, `ctx.qlabel`,
     leaves the surface as book-view). SURF('question-view','ink-open')
     sits in that same handler and can accordingly never fire while
     'question-view' is the current surface. Recorded as debt, not chased
     further as a probe fault. */

  /* --- back, then a cell -> a pupil's book --- */
  await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => /Ex\s*\d/.test(b.textContent))[0]; if (c) c.click(); });
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => { const td = document.querySelector('.grid td.cell'); if (td) td.click(); });
  await new Promise(r => setTimeout(r, 1600));
  await record('book-view', 'pencil');
  say(await page.evaluate(() => (document.querySelector('.jp-read, .readline') || {}).textContent || ''));
  say(await page.evaluate(() => (document.querySelector('.jp-posture, .posture') || {}).textContent || ''));

  /* --- slips --- */
  await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => !/Classes/.test(b.textContent))[0]; if (c) c.click(); });
  await new Promise(r => setTimeout(r, 1300));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.toolbtn')].filter(x => /Slips/.test(x.textContent))[0]; if (b) b.click(); });
  await new Promise(r => setTimeout(r, 1800));
  await record('slips', 'ranked');

  /* --- the full grid --- */
  await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => !/Classes/.test(b.textContent))[0]; if (c) c.click(); });
  await new Promise(r => setTimeout(r, 1300));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.toolbtn')].filter(x => /Full grid/.test(x.textContent))[0]; if (b) b.click(); });
  await new Promise(r => setTimeout(r, 1600));
  await record('full-grid', 'loaded');
  say(await page.evaluate(() => (document.querySelector('.wall-legend') || {}).innerText || ''));

  /* ── THE SCREENS INSIDE THE SCREENS ────────────────────────────────
     Everything above is a teacher arriving somewhere. What she then DOES
     there - switch book, run her eye along a row, ink a verdict, flick to the
     next jotter, throw the slips on the board, tick a book on - are states of
     their own, and until this block existed they were written by the app and
     walked by nobody. */
  const wait = (ms) => new Promise(r => setTimeout(r, ms || 900));

  /* the grid, scrolled off its own header. staff.js's own scroll listener is
     on the plain, unclassed div showWall() builds as its `body` — the direct
     parent of `.wall` — so that is named explicitly rather than left to a
     generic overflow search to happen to find (the search stays too, as a
     second line, in case a future layout moves the listener). */
  /* A BOOK TAB INSIDE THE GRID IS A WAY OUT OF IT. Tried choosing the widest
     book here first, so the state would be reachable at 1280 as well: every one
     of those tabs calls showClassPage(), so the first press left the full grid
     altogether and the rest of the route ran on whatever book was pressed last.
     The grid is measured as she finds it, and where it fits the screen the
     ledger says so rather than the walk pretending otherwise. */
  await wait(900);
  const scrolled = await page.evaluate(() => {
    const wall = document.querySelector('.wall');
    const cands = [...document.querySelectorAll('*')]
      .filter((e) => e.scrollHeight > e.clientHeight + 8 || e.scrollWidth > e.clientWidth + 8);
    (wall ? [wall] : []).concat(cands).concat([document.scrollingElement, document.documentElement, document.body]).forEach((b) => {
      if (!b) return;
      b.scrollTop = 300; b.scrollLeft = 300;
      b.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    return wall ? { w: wall.scrollWidth, c: wall.clientWidth, left: wall.scrollLeft } : null;
  });
  await wait(500);
  if (scrolled && scrolled.left < 5) {
    g.note('full-grid:sticky-scroll @' + width + ': the grid did not move — .wall is ' +
      scrolled.w + 'px of content in a ' + scrolled.c + 'px box, so there is nothing to scroll at this width');
  }
  {
    const st = await page.evaluate(() => {
      const su = document.querySelector('[data-surface="full-grid"]');
      return su ? su.getAttribute('data-state') : null;
    });
    if (st === 'sticky-scroll') await recordKnown('full-grid', 'sticky-scroll');
    else await record('full-grid', 'sticky-scroll');
  }

  /* back to the class page, and a different book */
  await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => !/Classes/.test(b.textContent))[0]; if (c) c.click(); });
  await wait(1200);
  await armLog();
  const switched = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cp-books button')].filter(x => x.getAttribute('aria-pressed') !== 'true')[0];
    if (!b) return false; b.click(); return true;
  });
  if (switched) {
    await wait(1400);
    /* SURF('class-page','book-switch') is set, then showClassPage() re-renders
       the whole panel and stamps its own "loading-cold" over it - all inside
       the one click handler, no async gap a wait() could land inside. The log
       is what saw it drawn. */
    if (await drewState('class-page', 'book-switch')) await recordKnown('class-page', 'book-switch');
    else await record('class-page', 'book-switch');
  }

  /* a cell under her eye, before she opens it */
  await page.evaluate(() => { const c = document.querySelector('.excard'); if (c) c.click(); });
  await wait(1300);
  const hovered = await page.evaluate(() => {
    const td = document.querySelector('.grid td.cell');
    if (!td) return false; td.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })); return true;
  });
  if (hovered) { await wait(400); await record('exercise-view', 'cell-focus'); }

  /* a pupil's book, and the ink. book-view:worth-a-look-open (an amber verdict,
     or a wrong one the engine could not name) is a fact about WHICH pupil's
     book this is, not about anything pressed - so the cell picked here is an
     amber one where the grid has one, and the FIRST cell otherwise (the
     ordinary route, kept for every width the grid has no amber cell at all).
     Tried widening this to the full grid (many more questions, a better
     chance of one amber cell) and it cost six other states below - the full
     grid opens showJotterPage with a DIFFERENT ctx shape (`{qlabel}`, the
     "sweep" mode, vs `{q}` here), and whatever it renders differently broke
     the ink-control probes that follow. Kept narrow rather than trade a
     probable state for six confirmed ones. */
  const openedAmber = await page.evaluate(() => {
    const td = [...document.querySelectorAll('.grid td.cell')].filter((c) => c.querySelector('.g-am'))[0] || document.querySelector('.grid td.cell');
    if (!td) return false;
    td.click();
    return true;
  });
  await wait(1600);
  if (openedAmber) {
    const wl = await page.evaluate(() => {
      const su = document.querySelector('[data-surface="book-view"]');
      return su ? su.getAttribute('data-state') : null;
    });
    if (wl === 'worth-a-look-open') await recordKnown('book-view', 'worth-a-look-open');
    else g.note('book-view:worth-a-look-open @' + width + ': the book opened here read "' + wl + '", not "worth-a-look-open" (no amber/undx-wrong cell on this grid)');
  }
  const inkOpen = await page.evaluate(() => { const v = document.querySelector('.verdict-mark'); if (!v) return false; v.click(); return true; });
  if (inkOpen) {
    await wait(600);
    await record('book-view', 'ink-control-open');
    say(await page.evaluate(() => (document.querySelector('.ic-label') || {}).textContent || ''));
    [...await page.evaluate(() => [...document.querySelectorAll('.ink-control button')].map(b => (b.textContent || '').trim()))].forEach(say);
    for (const [sel, state] of [['.ic-tick', 'inked-mine-tick'], ['.ic-cross', 'inked-mine-cross'], ['.ic-auto', 'inked-app']]) {
      const pressed = await page.evaluate((s2) => { const b = document.querySelector(s2); if (!b || b.disabled) return false; b.click(); return true; }, sel);
      if (!pressed) continue;
      await wait(1200);
      await record('book-view', state);
      say(await page.evaluate(() => (document.querySelector('.ink-msg') || {}).textContent || ''));
      await page.evaluate(() => { const v = document.querySelector('.verdict-mark'); if (v) v.click(); });
      await wait(400);
    }
  }
  await armLog();
  const flicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.flick-btn')].filter(x => !/is-off/.test(x.className))[0];
    if (!b) return false; b.click(); return true;
  });
  if (flicked) {
    await wait(1500);
    /* the same overwrite-in-the-same-breath as book-switch: SURF('book-view',
       'flicking') then showJotterPage() stamps 'pencil' straight over it */
    if (await drewState('book-view', 'flicking')) await recordKnown('book-view', 'flicking');
    else await record('book-view', 'flicking');
  }
  const reteached = await page.evaluate(() => { const b = document.querySelector('.jp-reteach'); if (!b || b.disabled) return false; b.click(); return true; });
  if (reteached) { await wait(1400); await record('book-view', 'reteach-sent'); }

  /* the slips, thrown on the board */
  await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => !/Classes/.test(b.textContent))[0]; if (c) c.click(); });
  await wait(1200);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.toolbtn')].filter(x => /Slips/.test(x.textContent))[0]; if (b) b.click(); });
  await wait(1700);
  const started = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(x => /starter/i.test(x.textContent || ''))[0];
    if (!b) return false; b.click(); return true;
  });
  if (started) {
    await wait(1200);
    await record('slips', 'starter-board');
    say(await page.evaluate(() => (document.querySelector('.starter-h') || {}).textContent || ''));
    say(await page.evaluate(() => (document.querySelector('.starter-q') || {}).textContent || ''));
    /* THE CLOSE BUTTON HAS A NAME OF ITS OWN (#sr-close). Matching "close" as
       loose text across every button on the page found "Close the markbook"
       first - it sorts earlier in the DOM than the overlay staff.js appends
       to document.body - and clicking it logged the walk out of the markbook
       entirely, silently failing every set-up and book-view probe after this
       point in the walk (nothing downstream could find the screen it needed,
       because the walk was back on the passcode screen). Found standing up
       set-up:add-class-busy and set-up:delete-armed below: neither state had
       ever been recorded and this is why. */
    await page.evaluate(() => { const c = document.getElementById('sr-close'); if (c) c.click(); });
    await wait(600);
  }

  /* Set-up: a book ticked on, the link and its QR, the CSV */
  await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => /Classes/.test(b.textContent))[0]; if (c) c.click(); });
  await wait(1400);
  const ticked = await page.evaluate(() => { const cb = document.querySelector('.acts-ticks input[type=checkbox]'); if (!cb) return false; cb.click(); return true; });
  if (ticked) {
    await wait(1400);
    await record('set-up', 'tickboxes');
    say(await page.evaluate(() => (document.querySelector('.st-classes-msg, .ui-msg') || {}).textContent || ''));
  }
  const qr = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].filter(x => (x.textContent || '').trim() === 'QR')[0]; if (!b) return false; b.click(); return true; });
  if (qr) {
    await wait(1200);
    await record('set-up', 'link-qr-modal');
    say(await page.evaluate(() => (document.querySelector('.gj-qr p, .gj-qr .ui-msg') || {}).textContent || ''));
    /* #st-qr-close by id — the same "close the markbook" mismatch as the
       starter board's close button, and it broke the CSV probe the same way:
       every button after this one found nothing, because the walk was
       logged out before it ever got there. */
    await page.evaluate(() => { const c = document.getElementById('st-qr-close'); if (c) c.click(); });
    await wait(600);
  }
  /* set-up:csv-copied / set-up:csv-fallback-box — despite the name (this
     state predates the "Copy link" button and was never renamed), copyText()
     hardcodes `SURF('set-up', ...)` regardless of which caller invoked it -
     so the state only ever actually lands when copyText() is called WHILE
     'set-up' is the current surface, which is the "Copy link" button on this
     classes list, not exportCsv()'s "Download CSV" (that lives on the class
     page and the full grid, where SURF('set-up',...) finds no element and
     silently no-ops - confirmed by reading copyText() and every one of its
     three call sites). navigator.clipboard's own permission in headless
     Chrome is unreliable (silently pending, or refused with no user gesture
     bridging the two calls), which is why the two paths inside copyText()
     are forced here rather than left to chance. */
  await page.evaluate(() => { if (navigator.clipboard) navigator.clipboard.writeText = () => Promise.resolve(); });
  const linkOk = await page.evaluate(() => {
    const row = document.querySelector('#st-rows tr');
    const b = row && row.querySelectorAll('td:last-child button')[1];
    if (!b) return false; b.click(); return true;
  });
  if (linkOk) {
    await wait(900);
    const st1 = await page.evaluate((s2, args) => eval(s2)(args), W.STATE_OF, ['set-up', null]);
    if (st1 && st1.ok && st1.state === 'csv-copied') await record('set-up', 'csv-copied');
    else g.note('set-up:csv-copied @' + width + ': read "' + (st1 && st1.state) + '" after the copy-link press instead');
  } else {
    g.note('set-up:csv-copied @' + width + ': no class row / "Copy link" button on screen to press');
  }
  await page.evaluate(() => {
    if (navigator.clipboard) navigator.clipboard.writeText = () => Promise.reject(new Error('qa-mock: clipboard refused'));
    const origExec = document.execCommand ? document.execCommand.bind(document) : null;
    document.execCommand = function (cmd) { if (cmd === 'copy') return false; return origExec ? origExec.apply(document, arguments) : false; };
  });
  const linkFallback = await page.evaluate(() => {
    const row = document.querySelector('#st-rows tr');
    const b = row && row.querySelectorAll('td:last-child button')[1];
    if (!b) return false; b.click(); return true;
  });
  if (linkFallback) {
    await wait(900);
    const st2 = await page.evaluate((s2, args) => eval(s2)(args), W.STATE_OF, ['set-up', null]);
    if (st2 && st2.ok && st2.state === 'csv-fallback-box') await record('set-up', 'csv-fallback-box');
    else g.note('set-up:csv-fallback-box @' + width + ': read "' + (st2 && st2.state) + '" after the forced-failure copy-link press instead');
  } else {
    g.note('set-up:csv-fallback-box @' + width + ': no class row / "Copy link" button on screen to press');
  }

  /* class-page:empty-class, then class-page:no-flags — two facts about WHICH
     class is open, not about anything pressed once she is there. "demo" is
     the pupil-default class this very page created for itself the moment it
     first loaded ?class=demo (script.js's own `store()`), before staff login
     ever touched it, and localStorage.clear() + reload at the top of this
     walk recreated it exactly the same way, with every book on and nobody's
     work under it yet - the one class here nobody has to seed by hand.
     empty-class is stood on FIRST, while that is still true; a pupil is then
     driven through one question, correctly, first try (so no flag condition
     — wrong-twice, pulled-help, stuck-open — is ever met), on a SECOND page
     in this SAME browser (same profile, same localStorage, so her save
     lands where this page can see it), and no-flags is stood on after. */
  await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => /Classes/.test(b.textContent))[0]; if (c) c.click(); });
  await wait(1200);
  /* empty-class IS DRAWN, THEN OVERWRITTEN IN THE SAME PAINT. staff.js's
     paint(pupils) sets class-page to "empty-class" when there are no
     pupils, and separately — unconditionally on `!flags.length`, not on
     whether there were any pupils to flag in the first place — sets
     "no-flags" right after: zero pupils trivially has zero flags, so a
     class with nobody in it never settles on "empty-class", it settles on
     "no-flags" having drawn "empty-class" for one line first. The log
     catches what was actually drawn. */
  await armLog();
  const openedDemo = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#st-rows tr')];
    const row = rows.filter((r) => (r.querySelector('td b') || {}).textContent === 'demo')[0];
    const btn = row && [...row.querySelectorAll('button')].filter((b) => /Open the markbook/.test(b.textContent))[0];
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (openedDemo) {
    await wait(1500);
    if (await drewState('class-page', 'empty-class')) await recordKnown('class-page', 'empty-class');
    else {
      const stE = await page.evaluate((s2, args) => eval(s2)(args), W.STATE_OF, ['class-page', null]);
      g.note('class-page:empty-class @' + width + ': never drew "empty-class" — the "demo" class settled on "' + (stE && stE.state) + '"');
    }
    const bookForDemo = await page.evaluate(() => (window.GJ && window.GJ.app && window.GJ.app.activities && window.GJ.app.activities[0] && window.GJ.app.activities[0].id) || 'angles');

    const attempts = S.attempts();
    const pupilPage = await page.browser().newPage();
    await pupilPage.evaluateOnNewDocument((table) => {
      window.__modelAttempt = (qid, wrong) => {
        const r = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
          .filter((x) => (x.getAttribute('data-qid') || (x.id || '').replace(/^jq-/, '')) === qid)[0];
        const bk = r ? (r.getAttribute('data-book') || '') : '';
        return table[(wrong ? 'wrong:' : 'right:') + bk + ':' + qid] || null;
      };
    }, attempts);
    try {
      await pupilPage.goto(BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await W.settle(pupilPage);
      await pupilPage.evaluate(() => { const b = document.getElementById('cover-open'); if (b && !b.disabled) b.click(); });
      await W.settle(pupilPage);
      const opened = await pupilPage.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, bookForDemo);
      if (opened.ok) {
        await W.settle(pupilPage);
        await pupilPage.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, 0);
        await W.settle(pupilPage);
        const qids = await pupilPage.evaluate((s) => eval(s)(), W.QUESTIONS_ON_SCREEN);
        if (qids[0]) {
          const answered = await pupilPage.evaluate((s2, args) => eval(s2)(args), W.ANSWER, [qids[0], false]);
          if (answered && answered.ok) {
            await W.settle(pupilPage);
            await pupilPage.evaluate((s, id) => eval(s)(id), W.CHECK, qids[0]);
            await new Promise((r) => setTimeout(r, 1800));   /* past scheduleSave's floor, so her mark is on disk */
          }
        }
      }
    } catch (e) { g.note('class-page:no-flags @' + width + ': could not drive the pupil (' + String(e.message || e).slice(0, 80) + ')'); }
    await pupilPage.close();

    await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => /Classes/.test(b.textContent))[0]; if (c) c.click(); });
    await wait(1200);
    const reopenedDemo = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#st-rows tr')];
      const row = rows.filter((r) => (r.querySelector('td b') || {}).textContent === 'demo')[0];
      const btn = row && [...row.querySelectorAll('button')].filter((b) => /Open the markbook/.test(b.textContent))[0];
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (reopenedDemo) {
      await wait(1500);
      const stF = await page.evaluate((s2, args) => eval(s2)(args), W.STATE_OF, ['class-page', null]);
      if (stF && stF.ok && stF.state === 'no-flags') await record('class-page', 'no-flags');
      else g.note('class-page:no-flags @' + width + ': the demo class read "' + (stF && stF.state) + '" after one correct answer, not "no-flags"');
    }
  }

  /* set-up:add-class-busy — a throwaway class, made and torn down here so the
     add/delete flow can be walked without leaving anything behind for a real
     class list to trip over. The busy state is set synchronously, before the
     (offline, near-instant) admin call resolves — same-tick capture, same
     reasoning as class-page:loading-cold above. */
  /* back to Classes first — the no-flags drive above left this page on the
     "demo" class-page, and #st-newclass/#st-add/#st-rows only exist on the
     set-up screen. */
  await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => /Classes/.test(b.textContent))[0]; if (c) c.click(); });
  await wait(1200);
  const addResult = await page.evaluate(() => {
    const input = document.querySelector('#st-newclass');
    const btn = document.querySelector('#st-add');
    if (!input || !btn) return null;
    input.value = 'qa-scratch-v4states';
    btn.click();
    const su = document.querySelector('[data-surface="set-up"]');
    return su ? su.getAttribute('data-state') : null;
  });
  if (addResult === 'add-class-busy') await recordKnown('set-up', 'add-class-busy');
  else g.note('set-up:add-class-busy @' + width + ': same-tick read was "' + addResult + '", not "add-class-busy" (#st-newclass/#st-add on screen: ' + (addResult !== null) + ')');
  await wait(1500);

  /* set-up:delete-armed, then set-up:error — the confirm dialog holds
     "delete-armed" open (no async gap: it is WAITING on her, not on a
     server), so a plain read after the click is honest here. Confirming it
     is where set-up:error lives: window.GJ.app.call is script.js's own
     published hook (`Object.assign(GJ.app, {call: call, ...})`), and
     staff.js's own `call()` wrapper always calls through it — so replacing
     it for this one press is the same front door a real network failure
     would arrive through, not a way around the offline stub. The class is
     thrown away either way: deleted for real if the ordinary path is taken,
     left behind (harmless, this browser profile ends with the page) if the
     mocked one is. */
  const armed = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#st-rows tr')];
    const row = rows.filter((r) => /qa-scratch-v4states/.test((r.textContent || '')))[0];
    const del = row && [...row.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === '×')[0];
    if (!del) return false;
    del.click();
    return true;
  });
  if (!armed) g.note('set-up:delete-armed @' + width + ': no row for "qa-scratch-v4states" with a delete (×) button — was it added?');
  if (armed) {
    await wait(400);
    await record('set-up', 'delete-armed');
    /* ONE PRESS, NOT THE REST OF THE WALK. This replaced the app's own call
       and never put it back, so every screen after it in the route was reading
       a refused server - which is why the full grid below had no cells in it
       and the probe that needs one reported the screen missing instead of the
       fault. Saved and restored around the press. */
    await page.evaluate(() => {
      window.__origCall = window.GJ.app.call;
      window.GJ.app.call = function () { return Promise.reject(new Error('qa-mock: the network refused this one press')); };
    });
    await page.evaluate(() => { const ok = document.getElementById('gj-cf-ok'); if (ok) ok.click(); });
    await wait(600);
    const st3 = await page.evaluate((s2, args) => eval(s2)(args), W.STATE_OF, ['set-up', null]);
    if (st3 && st3.ok && st3.state === 'error') await record('set-up', 'error');
    await page.evaluate(() => { if (window.__origCall) { window.GJ.app.call = window.__origCall; window.__origCall = null; } });
  }

  /* ── THE LAST THREE SCREENS NOTHING HAD EVER STOOD ON ───────────────────
     All three were written up on 8 Sept as states the app declared and no
     code path could ever set. Each has a path now, and each is walked here,
     at the END of the route, so nothing above it changes shape underneath a
     probe that was already passing.

     question-view:ink-open. The question view's own cards are display markup
     with no ink control on them; the ink lives in showJotterPage, which the
     FULL GRID opens in its "one question across the class" mode - and that
     screen is the question view, which is what it now says it is. So the
     route is the full grid, a cell, then the mark. */
  await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => /Classes/.test(b.textContent))[0]; if (c) c.click(); });
  await wait(1300);
  /* THE SEEDED CLASS, BY NAME. The cold open at the top of this walk takes the
     LAST row and that is the seeded class with twelve pupils in it - but by the
     time the route reaches here the delete probe above has left
     "qa-scratch-v4states" behind (its confirm is answered by a refused call on
     purpose), and THAT is now the last row: an empty class, whose full grid has
     no cell to press. The two classes this walk makes for itself are named, so
     they are named here rather than counted around. */
  const openSeeded = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('#st-rows tr')].filter((r) => {
      const nm = ((r.querySelector('td b') || {}).textContent || '').trim();
      return nm && nm !== 'demo' && !/^qa-scratch/.test(nm);
    });
    const row = rows[rows.length - 1];
    const btn = row && [...row.querySelectorAll('button')].filter((b) => /Open the markbook/.test(b.textContent))[0];
    if (!btn) return false; btn.click(); return true;
  });
  const backIn = await openSeeded();
  if (backIn) {
    await wait(1500);
    await page.evaluate(() => { const b = [...document.querySelectorAll('.toolbtn')].filter(x => /Full grid/.test(x.textContent))[0]; if (b) b.click(); });
    await wait(1700);
    const sweptIn = await page.evaluate(() => {
      const td = document.querySelector('.wall td.cell');
      if (!td) return false; td.click(); return true;
    });
    if (!sweptIn) g.note('question-view:ink-open @' + width + ': no cell in the full grid to open one question across the class');
    else {
      await wait(1800);
      const inked = await page.evaluate(() => { const v = document.querySelector('.verdict-mark'); if (!v) return false; v.click(); return true; });
      if (!inked) g.note('question-view:ink-open @' + width + ': the swept question carried no verdict mark to press');
      else {
        await wait(700);
        const stIk = await page.evaluate((s2, args) => eval(s2)(args), W.STATE_OF, ['question-view', null]);
        if (stIk && stIk.ok && stIk.state === 'ink-open') await record('question-view', 'ink-open');
        else g.note('question-view:ink-open @' + width + ': the swept question read "' + (stIk && stIk.state) + '" after the mark was pressed');
      }
    }
  }

  /* class-page:error. The wall refuses while she is looking at the class page.
     `window.GJ.app.call` is script.js's own published hook and staff.js's own
     `call()` always goes through it, so refusing ONE sub-action there is the
     same front door a dropped line arrives through - the same argument the
     set-up:error probe above already stands on. */
  await page.evaluate(() => { const c = [...document.querySelectorAll('.crumb-link')].filter(b => /Classes/.test(b.textContent))[0]; if (c) c.click(); });
  await wait(1300);
  await page.evaluate(() => {
    const orig = window.GJ.app.call;
    window.GJ.app.__origCall = orig;
    window.GJ.app.call = function (action, p) {
      if (p && p.sub === 'wall') return Promise.reject(new Error('qa-mock: the wall refused this one press'));
      return orig.apply(this, arguments);
    };
  });
  const openedForError = await openSeeded();
  if (openedForError) {
    await wait(1500);
    const stErr = await page.evaluate((s2, args) => eval(s2)(args), W.STATE_OF, ['class-page', null]);
    if (stErr && stErr.ok && stErr.state === 'error') await record('class-page', 'error');
    else g.note('class-page:error @' + width + ': the class page read "' + (stErr && stErr.state) + '" with the wall refusing');
  }
  await page.evaluate(() => { if (window.GJ.app.__origCall) window.GJ.app.call = window.GJ.app.__origCall; });

  /* staff-cover:busy and staff-cover:open. The cover sets busy the moment the
     press lands and open the moment the answer does; on the offline stub both
     are gone inside a microtask, so the line is SLOWED - which is the very
     condition the busy state exists for. `open` is drawn and then written
     over in the same breath by showClasses(), so it is read off the state log
     the same way "flicking" and "book-switch" are. */
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await W.settle(page);
  await page.evaluate(() => {
    const orig = window.GJ.app.call;
    window.GJ.app.call = function () {
      const p = orig.apply(this, arguments);
      return new Promise((res, rej) => setTimeout(() => p.then(res, rej), 700));
    };
  });
  await page.evaluate(() => document.getElementById('cover-staff').click());
  await W.settle(page);
  await page.waitForFunction(() => !!document.querySelector('#st-pass') && !!document.querySelector('#st-go'),
    { timeout: 20000 }).catch(() => {});
  await armLog();
  const pressedSlow = await page.evaluate(() => {
    const i = document.querySelector('#st-pass');
    if (!i) return false;
    i.value = 'demo'; document.querySelector('#st-go').click();
    return true;
  });
  if (!pressedSlow) g.note('staff-cover:busy @' + width + ': the passcode box never came back after the reload');
  else {
    await wait(250);   /* well inside the mock's 700ms, so the wait is still on screen */
    const stBusy = await page.evaluate((s2, args) => eval(s2)(args), W.STATE_OF, ['staff-cover', null]);
    if (stBusy && stBusy.ok && stBusy.state === 'busy') await record('staff-cover', 'busy');
    else g.note('staff-cover:busy @' + width + ': read "' + (stBusy && stBusy.state) + '" while the passcode was still in flight');
    await wait(1600);
    if (await drewState('staff-cover', 'open')) await recordKnown('staff-cover', 'open');
    else g.note('staff-cover:open @' + width + ': the cover never drew "open" when the passcode was accepted');
  }
}

(async () => {
  const browser = await B.launch();
  A.ensureOut('walk');
  A.ensureOut('transcript');
  const transcript = [];
  const passes = WIDTHS.map(w => ({ width: w, projector: false }));
  /* SHARDING ARGUMENT ONLY (package SPEED, 8 Sept): gated the same way as
     sit-pupil's reduced-motion pass, and for the same reason — a run sharded
     to one width must not also silently redo the projector pass every time. */
  if (WIDTHS.includes(PROJECTOR.width)) passes.push({ width: PROJECTOR.width, height: PROJECTOR.height, projector: true });

  for (const pass of passes) {
    const page = await B.newPage(browser, { width: pass.width, height: pass.height });
    await page.goto(BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await W.settle(page);
    const sidecar = { walker: 'sit-teacher', scope: 'teacher', width: pass.width, projector: !!pass.projector,
      tier: 'preview', contentHash: contentHash(A.APP), when: new Date().toISOString(), states: [], consoleErrors: 0 };
    await walk(page, pass.width, pass.projector, sidecar, pass.width === 1280 && !pass.projector ? transcript : []);
    sidecar.consoleErrors = page.__errors.length;
    g.check(page.__errors.length === 0, 'teacher @' + pass.width + (pass.projector ? 'x720' : ''), 'console',
      page.__errors.length + ' console error(s) during the walk — first: ' + (page.__errors[0] || ''));
    fs.writeFileSync(A.out('walk/sit-teacher-teacher-' + pass.width + (pass.projector ? 'x720' : '') + '.json'), JSON.stringify(sidecar, null, 1));
    g.note('teacher @' + pass.width + (pass.projector ? 'x720' : '') + ': stood on ' + sidecar.states.length + ' states, ' + page.__errors.length + ' console errors');
    await page.close();
  }
  await browser.close();

  fs.writeFileSync(A.out('transcript/teacher.txt'),
    transcript.filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join('\n') + '\n');

  /* the REQUIRED teacher surface set, from the app's own registry (L3).
     THE SAME HOLE THE PUPIL WALK HAD: this read a file another gate writes, and
     the control sandbox deletes that folder before every run. With no file the
     register was {}, every surface filtered out, and the check counted nothing
     and passed. script.js is the app's own statement of what it can render and
     it is always there. */
  let reg = A.exists(A.out('surfaces.json')) ? JSON.parse(A.read(A.out('surfaces.json'))) : {};
  if (!Object.keys(reg).length) {
    const src = A.read(A.app('script.js'));
    const block = (src.match(/GJ\.app\.surfaces\s*=\s*\{([\s\S]*?)\n\s*\};/) || [])[1] || '';
    reg = {};
    (block.match(/^\s*'?[-a-zA-Z]+'?\s*:/gm) || []).forEach(m => { reg[m.replace(/[\s':]/g, '')] = true; });
  }
  const need = COVERS.surfaces.filter(s => reg[s]);
  g.check(need.length > 0, 'surfaces', 'coverage',
    'the walk could not find out which screens the markbook says it has, so it checked none of them — a coverage check made of nothing is not a pass');
  const reached = new Set();
  fs.readdirSync(A.out('walk')).filter(f => /^sit-teacher/.test(f)).forEach(f => {
    JSON.parse(A.read(A.out('walk/' + f))).states.forEach(s => reached.add(s.surface));
  });
  need.forEach(s => g.check(reached.has(s), s, 'coverage',
    'the teacher walk never reached this screen — a walk that stands on fewer screens than the markbook has is short, and short coverage is a failure'));

  /* THE LAW HE PAID FOR HAS TO HAVE BEEN AWAKE. The markbook fault was white
     text on a white table, and the readability audit reported PASS on every
     state of every walk while measuring nothing at all (F35a). A verdict is
     not evidence; a count is. Said-twice is not asserted here - a staff screen
     legitimately carries no instruction line - it is asserted on the pupil
     walk, where the instruction lines live. */
  const looked = {};
  fs.readdirSync(A.out('walk')).filter(f => /^sit-teacher/.test(f)).forEach(f => {
    JSON.parse(A.read(A.out('walk/' + f))).states.forEach(st => {
      Object.keys(st.measured || {}).forEach(k => { looked[k] = (looked[k] || 0) + st.measured[k]; });
    });
  });
  g.check(looked.readability > 0, 'readability', 'awake',
    'the readability law reported a verdict on every state of the teacher walk and never once measured a piece of text — that is exactly the shape of the fault he found on the live markbook');

  g.done();
})().catch(e => {
  console.log('  FAIL  sit-teacher x crash: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
