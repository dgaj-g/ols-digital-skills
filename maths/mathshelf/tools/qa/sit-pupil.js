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
const S = require('./lib/stage.js');

/* every state any walk in this run set out to stand on, settled at the end */
const AIMED = [];
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
    /* WHAT IS WRITTEN DOWN IS WHAT WAS ON SCREEN, read off the DOM contract.
       Naming the state the walk MEANT to reach filed rows for screens it had
       never stood on - and coverage counted every one of them. */
    const seen = await page.evaluate((s2, args) => eval(s2)(args), W.STATE_OF, [surface, (extra && extra.qid) || null]);
    const real = (seen && seen.ok && seen.state) || null;
    /* A SCREEN THAT IS NOT THERE IS A FAILURE HERE AND NOW; a screen that is
       there in a DIFFERENT state is recorded as what it is and settled at the
       end of the walk, where "this state was never stood on" is the verdict
       that means something. Failing every mismatch on the spot would report
       one honest landing (a film that plays instantly under reduced motion)
       as dozens of faults. */
    g.check(!!real, surface + (extra && extra.qid ? ' > ' + extra.qid : '') + ' @' + width, 'walk',
      'the walk went to record "' + state + '" and no ' + surface + ' was on screen at all');
    if (real && real !== state) g.note('expected ' + surface + ':' + state + ', stood on ' + surface + ':' + real + (extra && extra.qid ? ' (' + extra.qid + ')' : ''));
    AIMED.push({ surface, state, got: real });
    const a = await AUD.run(page, { clickSafety: surface === 'question' });
    const row = Object.assign({ surface, state: real || state, expected: state, stood: real === state, width }, extra || {}, { audits: a.verdicts });
    sidecar.states.push(row);
    /* THE DOCK IS ITS OWN SURFACE. It is what she works with — the pad, the
       tray, the chips, the arrows — and it changes sub-kind from question to
       question, so it has to be recorded where it is standing rather than
       assumed to be covered because the question above it was. */
    if (surface === 'question') {
      const dock = await page.evaluate(() => {
        const d = document.querySelector('[data-surface="dock"]');
        if (!d || d.hidden) return null;
        const r = d.getBoundingClientRect();
        return (r.width > 2 && r.height > 2) ? d.getAttribute('data-state') : null;
      });
      if (dock) {
        sidecar.states.push(Object.assign({ surface: 'dock', state: dock, width }, extra || {}, { audits: a.verdicts }));
      }
    }
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
    /* A FRESH DOCUMENT PER EXERCISE. Priming an attempt re-renders the whole
       exercise, diagrams and all, so walking a book of six exercises in one
       page churns several hundred SVG mounts through one renderer — and on the
       fourth book that renderer took the whole browser down with it. A walk
       that cannot finish proves nothing, so the page is recycled between
       exercises. It costs a second each and it is why the walk completes. */
    if (si > 0) {
      await page.goto(BASE + '?class=demo&nointro', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await W.settle(page);
      await page.evaluate(() => document.getElementById('cover-open').click());
      await W.settle(page);
      await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, book);
      await W.settle(page);
    }
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
    const finishedSection = qids.length > 0;
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

    /* THE SELF-EVALUATION CARD. It appears once every question on the exercise
       is finished — which is exactly what the walk has just done — and it is a
       surface a pupil reads and writes on, so it is walked like any other. */
    if (finishedSection) {
      const se = await page.evaluate(() => {
        const c = document.querySelector('[data-surface="self-eval"]');
        if (!c) return null;
        c.scrollIntoView({ block: 'center' });
        return { state: c.getAttribute('data-state'), head: (c.querySelector('.se-head') || {}).textContent || '' };
      });
      if (se) {
        say(se.head);
        await record('self-eval', 'open', { section: si, book });
        /* pressing a confidence chip saves it, and the card says so */
        const saved = await page.evaluate(() => {
          const c = document.querySelector('[data-surface="self-eval"]');
          const b = c && c.querySelector('button');
          if (!b) return false;
          b.click();
          return true;
        });
        if (saved) {
          await W.settle(page);
          await record('self-eval', 'saved', { section: si, book });
          say(await page.evaluate(() => (document.querySelector('[data-surface="self-eval"] .se-saved, [data-surface="self-eval"] p') || {}).textContent || ''));
        }
      }
    }
  }

  /* THE END OF THE BOOK. The last chip on the contents strip is her tally, and
     when every mark is hers the gold star is on it. A book she can finish and
     a screen nobody walked are not the same thing. */
  {
    const chips = await page.evaluate(s => eval(s)(), W.ACTIONS.sectionCount);
    await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, chips - 1);
    await W.settle(page);
    const end = await page.evaluate(() => {
      const e = document.querySelector('[data-surface="book-end"]');
      return e ? { state: e.getAttribute('data-state'), text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160) } : null;
    });
    if (end) {
      say(end.text);
      await record('book-end', end.state || 'partial', { book });
    } else {
      g.note(book + ' @' + width + ': the last contents chip did not open a tally page');
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
  const attempts = S.attempts();   /* ONE HOME: dev/model-attempts.js, through lib/stage.js */
  A.ensureOut('walk');
  A.ensureOut('transcript');

  /* A FRESH BROWSER PER WIDTH. One browser walking every book at every width
     runs several thousand page.evaluate calls through one renderer, and on the
     fourth book that renderer died mid-walk — "detached Frame" — losing the
     whole run to something that is not a fault in the app at all. A walk that
     cannot finish proves nothing, so the browser is replaced between widths and
     a page that dies is REPORTED and the walk carries on. */
  /* A FRESH BROWSER PER BOOK, not per width. Sixty-odd states of audits is
     several hundred evaluate calls through one renderer, and the SECOND book at
     a given width was where it kept dying. A walk that cannot finish proves
     nothing; a browser costs a second and a half. */
  for (const width of WIDTHS) {
    for (const book of books) {
      const browser = await B.launch();
      const page = await B.newPage(browser, { width });
      await page.evaluateOnNewDocument((table) => {
        /* the answer channel, primed before the app boots */
        window.__modelAttempt = (qid, wrong) => {
          const r = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
            .filter((x) => (x.getAttribute('data-qid') || (x.id || '').replace(/^jq-/, '')) === qid)[0];
          const bk = r ? (r.getAttribute('data-book') || '') : '';
          return table[(wrong ? 'wrong:' : 'right:') + bk + ':' + qid] || null;
        };
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

      try {
        await walkBook(page, book, width, sidecar, transcript);
      } catch (e) {
        if (/detached Frame|Target closed|Session closed/i.test(String(e && e.message))) {
          g.fail(book + ' @' + width, 'walk',
            'the browser tab died part-way through this walk (' + String(e.message).slice(0, 60) +
            ') — the walk is incomplete, and an incomplete walk is not a pass');
        } else { throw e; }
      }

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
      await browser.close();
    }
  }

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

  /* AND EVERY STATE THE WALK AIMED AT. This is where a drive that quietly did
     nothing is caught: the walk meant to stand on question:checked-right and
     the app was in question:fresh every single time. */
  const stoodOn = new Set();
  fs.readdirSync(A.out('walk')).filter(f => /^sit-pupil/.test(f)).forEach(f => {
    JSON.parse(A.read(A.out('walk/' + f))).states.forEach(s => stoodOn.add(s.surface + ':' + s.state));
  });
  [...new Set(AIMED.map(a => a.surface + ':' + a.state))].forEach(key => {
    g.check(stoodOn.has(key), key, 'coverage',
      'the walk aimed at ' + key + ' every time and never once stood on it — the drive is not doing what it says');
  });

  g.done();
})().catch(e => {
  console.log('  FAIL  sit-pupil x crash: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});

/* buildAttempts() lived here. It keyed by question id alone, and eighteen of
   the thirty ids appear in BOTH books, so it answered algebra questions with an
   angles pupil's working. There is one home for a model attempt and
   lib/stage.js reads it. */
