#!/usr/bin/env node
/* sit-pupil.js — SOMEBODY SITS THE BOOK, ALL THE WAY THROUGH, AND EVERY LAW
 * IS ASKED OF EVERY SCREEN SHE STANDS ON.
 *
 * WHY A WALKER AND NOT A LIST OF CHECKS. Damien's words about the KS3 DT
 * platform, 13 Aug 2026: every checker was pointed at the fault that created
 * it, and nothing demanded it cover the rest. A walker inverts that. It goes
 * where a pupil goes - cover, shelf, book, exercise, film, question, mark,
 * next - and on every screen it asks the SAME questions: does the text fit its
 * card, can she read it, does any colour mean two things, is anything empty,
 * is a control locked with no reason, does the page give the answer away. A
 * screen written next year is covered because it exists, not because somebody
 * added it to a list (DFM 271).
 *
 * WHAT IT WRITES:
 *   out/walk/sit-pupil-<book>-<width>.json   what it stood on, and every audit
 *                                            verdict for each state
 *   out/transcript/<book>.txt                every sentence she reads, IN HER
 *                                            ORDER, for the separated judge
 * qa-coverage reads the first; qa-cold-read hashes the second.
 *
 * THE ANSWER CHANNEL is dev/model-attempts.js, primed into the page (see
 * lib/walk-moves.js). Preview tier only.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('./lib/app.js');
const { Gate, matrix } = require('./lib/report.js');
const B = require('./lib/browser.js');
const W = require('./lib/walk-moves.js');
const AUD = require('./lib/audits.js');
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
const ORDER = 60;
const COVERS = {
  books: '*', kinds: '*', surfaces: ['cover', 'shelf', 'book-contents', 'movie', 'question', 'dock', 'self-eval', 'book-end'],
  widths: [375, 768, 1280], projector: false, tier: ['preview'],
  cells: ['walk-right', 'movie', 'geometry', 'readability', 'colour', 'consequence', 'click-safety', 'empty', 'nested', 'strings']
};
const CONTROLS = [
  { id: 'unreachable-planted-fault', kind: 'fixture', plant: 'fixture-book', mustFail: /never reached/ },
  { id: 'console-error', kind: 'fixture', plant: 'fixture-renderers', mustFail: /console error/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const BASE = process.env.MS_BASE || 'http://localhost:8099/maths/mathshelf/index.html';
const ONLY_BOOK = process.env.MS_BOOK || null;
const WIDTHS = (process.env.MS_WIDTHS || '375,768,1280').split(',').map(Number);

const g = new Gate('sit-pupil');
g.exempt(AUD.EXEMPTIONS.concat([
  'the answer comes from dev/model-attempts.js through the preview-only channel: a walker cannot rotate a protractor, and pretending it can would make the walk a fiction',
  'turn counts are never asserted (DFM 199): what is pinned is what does not move - marks, screens, console errors'
]));

/* ---------------------------------------------------------------- the walk */
async function walkBook(page, book, width, sidecar, transcript) {
  const say = (s) => { if (s && String(s).trim()) transcript.push(String(s).trim()); };
  const record = async (surface, state, extra) => {
    await W.settle(page);
    const a = await AUD.run(page, { clickSafety: surface === 'question' });
    const row = Object.assign({ surface, state, width }, extra || {}, { audits: a.verdicts });
    sidecar.states.push(row);
    Object.keys(a.findings).forEach(k => {
      (a.findings[k] || []).forEach(f => {
        g.fail(surface + ':' + state + (extra && extra.qid ? ' > ' + extra.qid : '') + ' @' + width, k,
          describe(f));
      });
    });
    return row;
  };

  /* --- the shelf --- */
  const openedBook = await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, book);
  if (!openedBook.ok) { g.note('skipping ' + book + ': ' + openedBook.why); return; }
  await W.settle(page);
  say(await page.evaluate(() => (document.getElementById('act-title') || {}).textContent || ''));

  const nSec = await page.evaluate(s => eval(s)(), W.ACTIONS.sectionCount);
  g.note(book + ' @' + width + ': ' + nSec + ' exercises');

  for (let si = 0; si < nSec; si++) {
    const opened = await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, si);
    if (!opened.ok) continue;
    await W.settle(page);
    await record('book-contents', si === 0 ? 'fresh' : 'mid-book', { section: si });
    say(opened.label);
    say(await page.evaluate(() => (document.querySelector('.sec-walt') || {}).textContent || ''));
    say(await page.evaluate(() => (document.querySelector('.sec-title') || {}).textContent || ''));

    /* the film, to its end */
    const movie = await page.evaluate(async (s) => await eval(s)(), W.ACTIONS.playMovieToEnd);
    if (movie.steps) {
      await record('movie', 'end', { section: si });
      const caps = await page.evaluate(() => [...document.querySelectorAll('.movie .ml-say, .movie .caption, .movie figcaption')]
        .map(e => (e.textContent || '').trim()).filter(Boolean));
      caps.forEach(say);
    }

    /* every question on the exercise */
    const qids = await page.evaluate(s => eval(s)(), W.QUESTIONS_ON_SCREEN);
    for (const qid of qids) {
      say(await page.evaluate((id) => {
        const r = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
          .filter(x => (x.getAttribute('data-qid') || (x.id || '').replace(/^jq-/, '')) === id)[0];
        return r ? (r.querySelector('.jq-prompt, .q-prompt, p') || {}).textContent || '' : '';
      }, qid));
      await record('question', 'fresh', { qid, section: si, book });

      const answered = await page.evaluate((s, args) => eval(s)(args), W.ANSWER, [qid, false]);
      if (!answered.ok) { g.note('could not answer ' + qid + ': ' + answered.why); continue; }
      await W.settle(page);
      const checked = await page.evaluate((s, id) => eval(s)(id), W.CHECK, qid);
      if (checked.disabled) {
        g.check(!!checked.why, 'question:fresh > ' + qid + ' @' + width, 'mute-lock',
          'the Check button is disabled with nothing saying what it is waiting for');
      }
      await W.settle(page);
      const row = await record('question', 'checked-right', { qid, section: si, book });
      say(await page.evaluate((id) => {
        const r = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
          .filter(x => (x.getAttribute('data-qid') || (x.id || '').replace(/^jq-/, '')) === id)[0];
        return r ? (r.querySelector('.jq-feedback, .mk-comment, .jq-tally') || {}).textContent || '' : '';
      }, qid));
    }
  }

  /* back out to the shelf, and the shelf's own end state */
  await page.evaluate(s => eval(s)(), W.ACTIONS.backToShelf);
  await W.settle(page);
  await record('shelf', await page.evaluate(() => (document.querySelector('[data-surface="shelf"]') || {}).getAttribute
    ? document.querySelector('[data-surface="shelf"]').getAttribute('data-state') : 'some-ticked'));
}

/* ------------------------------------------------------------------ main */
(async () => {
  const books = A.books().filter(b => !ONLY_BOOK || b === ONLY_BOOK);
  const attempts = buildAttempts();
  const browser = await B.launch();
  A.ensureOut('walk');
  A.ensureOut('transcript');

  for (const width of WIDTHS) {
    for (const book of books) {
      const page = await B.newPage(browser, { width });
      await page.evaluateOnNewDocument((table) => {
        /* the answer channel, primed before the app boots */
        window.__modelAttempt = (qid, wrong) => (table[(wrong ? 'wrong:' : 'right:') + qid] || null);
      }, attempts);
      await page.goto(BASE + '?class=demo&nointro', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await W.settle(page);
      const sidecar = { walker: 'sit-pupil', scope: book, width, tier: 'preview', contentHash: contentHash(A.APP), when: new Date().toISOString(), states: [], consoleErrors: 0 };
      const transcript = [];

      /* the cover, then in */
      await W.settle(page);
      const coverState = await page.evaluate(() => (document.querySelector('[data-surface="cover"]') || {}).getAttribute('data-state'));
      const coverAudit = await AUD.run(page, {});
      sidecar.states.push({ surface: 'cover', state: coverState || 'returning', width, audits: coverAudit.verdicts });
      transcript.push(await page.evaluate(() => (document.getElementById('cover-name-out') || {}).textContent || ''));
      transcript.push(await page.evaluate(() => (document.getElementById('cover-open') || {}).textContent || ''));
      await page.evaluate(() => document.getElementById('cover-open').click());
      await W.settle(page);
      transcript.push(await page.evaluate(() => (document.getElementById('shelf-instruction') || {}).textContent || ''));

      await walkBook(page, book, width, sidecar, transcript);

      sidecar.consoleErrors = page.__errors.length;
      g.check(page.__errors.length === 0, book + ' @' + width, 'console',
        page.__errors.length + ' console error(s) during the walk — first: ' + (page.__errors[0] || ''));
      fs.writeFileSync(A.out('walk/sit-pupil-' + book + '-' + width + '.json'), JSON.stringify(sidecar, null, 1));
      if (width === 1280) {
        fs.writeFileSync(A.out('transcript/' + book + '.txt'),
          transcript.filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join('\n') + '\n');
      }
      g.note(book + ' @' + width + ': stood on ' + sidecar.states.length + ' states, ' + page.__errors.length + ' console errors');
      await page.close();
    }
  }
  await browser.close();

  /* THE REQUIRED SURFACE SET, derived from the app's own registry (L3): a walk
     that reached fewer surfaces than the app declares is SHORT, and short
     coverage is a failure, never a note. */
  const reg = A.exists(A.out('surfaces.json')) ? JSON.parse(A.read(A.out('surfaces.json'))) : {};
  const pupilSurfaces = ['cover', 'shelf', 'book-contents', 'movie', 'question', 'dock', 'self-eval', 'book-end']
    .filter(s => reg[s]);
  const reached = new Set();
  fs.readdirSync(A.out('walk')).filter(f => /^sit-pupil/.test(f)).forEach(f => {
    JSON.parse(A.read(A.out('walk/' + f))).states.forEach(s => reached.add(s.surface));
  });
  pupilSurfaces.forEach(s => {
    g.check(reached.has(s), s, 'coverage',
      'the pupil walk never reached this surface — a walk that stands on fewer screens than the app declares is short, and short coverage is a failure');
  });

  g.done();
})().catch(e => {
  console.log('  FAIL  sit-pupil x crash: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});

/* every question's right and wrong attempt, computed once under node */
function buildAttempts() {
  const M = require(A.app('mathcore.js'));
  const MA = require(A.app('dev/model-attempts.js'));
  const out = {};
  A.grid().forEach(r => {
    try {
      const right = MA.correct(M, r.book, r.question);
      const wrong = MA.corrupt(M, r.book, r.question);
      if (right) out['right:' + r.qid] = right;
      if (wrong) out['wrong:' + r.qid] = wrong;
    } catch (e) { /* the lints own authoring faults; a walker does not */ }
  });
  return out;
}
