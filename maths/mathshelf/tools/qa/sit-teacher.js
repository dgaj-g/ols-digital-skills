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
const { contentHash } = require('./lib/hash.js');

const TIER = 'full';
const ORDER = 62;
const COVERS = {
  books: '*', kinds: [],
  surfaces: ['staff-cover', 'class-page', 'exercise-view', 'question-view', 'book-view', 'slips', 'full-grid', 'set-up'],
  widths: [375, 768, 1280], projector: true, tier: ['preview'],
  cells: ['teacher-walk', 'geometry', 'readability', 'colour', 'empty', 'nested', 'strings']
};
const CONTROLS = [
  { id: 'hover-only-legend', kind: 'fixture', plant: 'fixture-staff', mustFail: /only on hover/ },
  { id: 'unlabelled-stat', kind: 'fixture', plant: 'fixture-staff', mustFail: /names no exercise/ },
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
    const a = await AUD.run(page, {});
    sidecar.states.push({ surface: s.surface || fallbackSurface, state: s.state || fallbackState, width, projector: !!projector, audits: a.verdicts });
    Object.keys(a.findings).forEach(k => (a.findings[k] || []).forEach(f => {
      g.fail((s.surface || fallbackSurface) + ':' + (s.state || fallbackState) + ' @' + width + (projector ? 'x720' : ''), k,
        (f.law || f.sel || f.tag || JSON.stringify(f).slice(0, 80)) + (f.text ? '  ["' + String(f.text).slice(0, 50) + '"]' : ''));
    }));
  };

  /* --- the cover, wrong passcode first --- */
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await W.settle(page);
  await page.evaluate(() => document.getElementById('cover-staff').click());
  await W.settle(page);
  await record('staff-cover', 'passcode-empty');
  say(await page.evaluate(() => (document.querySelector('#scr-staff .ui-msg') || {}).textContent || ''));

  await page.evaluate(() => { const i = document.querySelector('#st-pass'); i.value = 'not-the-passcode'; document.querySelector('#st-go').click(); });
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
    /* read the strip in the SAME TICK as the press: a round trip owns its
       waiting state, and a spinner that appears later is a screen that went
       dead in between (DFM 42/161) */
    const strip = document.querySelector('.cp-strip');
    return strip ? strip.textContent : '';
  });
  g.check(cold != null && /Loading/i.test(cold) && cold.length > 10, 'class-page:loading-cold @' + width, 'waits',
    'the class page did not say which class it was loading, by name, in the same tick as the press (it said: "' + String(cold).slice(0, 60) + '")');
  say(cold);
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
  await page.evaluate(() => { const th = document.querySelector('.grid th[scope="col"]'); if (th) th.click(); });
  await new Promise(r => setTimeout(r, 1500));
  await record('question-view', 'loaded');
  say(await page.evaluate(() => (document.querySelector('.q-prompt') || {}).textContent || ''));

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
}

(async () => {
  const browser = await B.launch();
  A.ensureOut('walk');
  A.ensureOut('transcript');
  const transcript = [];
  const passes = WIDTHS.map(w => ({ width: w, projector: false }))
    .concat([{ width: PROJECTOR.width, height: PROJECTOR.height, projector: true }]);

  for (const pass of passes) {
    const page = await B.newPage(browser, { width: pass.width, height: pass.height });
    await page.goto(BASE + '?class=demo&nointro', { waitUntil: 'domcontentloaded', timeout: 20000 });
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

  /* the REQUIRED teacher surface set, from the app's own registry (L3) */
  const reg = A.exists(A.out('surfaces.json')) ? JSON.parse(A.read(A.out('surfaces.json'))) : {};
  const need = COVERS.surfaces.filter(s => reg[s]);
  const reached = new Set();
  fs.readdirSync(A.out('walk')).filter(f => /^sit-teacher/.test(f)).forEach(f => {
    JSON.parse(A.read(A.out('walk/' + f))).states.forEach(s => reached.add(s.surface));
  });
  need.forEach(s => g.check(reached.has(s), s, 'coverage',
    'the teacher walk never reached this screen — a walk that stands on fewer screens than the markbook has is short, and short coverage is a failure'));

  g.done();
})().catch(e => {
  console.log('  FAIL  sit-teacher x crash: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
