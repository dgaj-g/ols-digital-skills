#!/usr/bin/env node
/* sit-confused.js — SOMEBODY GETS IT WRONG, TWICE, ON EVERY QUESTION.
 *
 * The pupil walker proves the app works when she is right. Almost everything
 * that has ever gone wrong on this platform went wrong on the OTHER path: the
 * help strip that was always on (fixed 792870c), the answer that was on the
 * page before she had earned it (CF-01, fixed 8b12079), the third attempt that
 * was accepted, the struck first attempt that was not struck, the nudge that
 * landed on Q1 instead of on her question (fixed 7ada10f).
 *
 * So this walk answers every question with that KIND'S OWN CLASSIC SLIP - not
 * with noise - twice, and then asks:
 *   - is the first attempt struck through, in pencil grey and not in a marking
 *     colour, with the second attempt live beside it;
 *   - is a THIRD attempt impossible;
 *   - does the truth appear only after the second wrong Check;
 *   - is "Want to see how?" absent after ONE wrong attempt and present after
 *     two, and does it lead with HER slip rather than replaying the film;
 *   - and every law the other walker asks, on every state she reaches.
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
const ORDER = 61;
const COVERS = {
  books: '*', kinds: '*',
  surfaces: ['question', 'dock', 'movie', 'book-contents'],
  widths: [375, 768, 1280], projector: false, tier: ['preview'],
  cells: ['walk-wrong', 'consequence', 'click-safety', 'geometry', 'colour', 'empty', 'nested', 'strings']
};
const CONTROLS = [
  { id: 'always-on-help-strip', kind: 'ref', ref: '792870c^', mustFail: /after ONE wrong attempt/ },
  { id: 'third-attempt-accepted', kind: 'fixture', plant: 'fixture-renderers', mustFail: /third Check/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const BASE = process.env.MS_BASE || 'http://localhost:8099/maths/mathshelf/index.html';
const ONLY_BOOK = process.env.MS_BOOK || null;
const WIDTHS = (process.env.MS_WIDTHS || '375,768,1280').split(',').map(Number);

const g = new Gate('sit-confused');
g.exempt(AUD.EXEMPTIONS.concat([
  'the wrong answer is the kind\'s own authored misconception, from dev/model-attempts.js: a walk of noise proves nothing about a real pupil',
  'a question whose renderer refuses to reopen for a second attempt is REPORTED here and judged by qa-two-attempts, which owns the attempt model'
]));

(async () => {
  const books = A.books().filter(b => !ONLY_BOOK || b === ONLY_BOOK);
  const attempts = S.attempts();   /* ONE HOME: the same table the pupil walk and the validator use */
  A.ensureOut('walk');
  /* a fresh browser per width: see the note in sit-pupil.js */
  /* A FRESH BROWSER PER BOOK, not per width. Sixty-odd states of audits is
     several hundred evaluate calls through one renderer, and the SECOND book at
     a given width was where it kept dying. A walk that cannot finish proves
     nothing; a browser costs a second and a half. */
  for (const width of WIDTHS) {
    for (const book of books) {
      const browser = await B.launch();
      const page = await B.newPage(browser, { width });
      await page.evaluateOnNewDocument((table) => {
        window.__modelAttempt = (qid, wrong) => {
          const root = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
            .filter((r) => (r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '')) === qid)[0];
          const book = root ? (root.getAttribute('data-book') || '') : '';
          return table[(wrong ? 'wrong:' : 'right:') + book + ':' + qid] || null;
        };
      }, attempts);
      await page.goto(BASE + '?class=demo&nointro', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await W.settle(page);
      await page.evaluate(() => document.getElementById('cover-open').click());
      await W.settle(page);

      const sidecar = { walker: 'sit-confused', scope: book, width, tier: 'preview',
        contentHash: contentHash(A.APP), when: new Date().toISOString(), states: [], consoleErrors: 0 };

      const opened = await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, book);
      if (!opened.ok) { g.note('skipping ' + book + ': ' + opened.why); await page.close(); continue; }
      await W.settle(page);
      const nSec = await page.evaluate(s => eval(s)(), W.ACTIONS.sectionCount);

      for (let si = 0; si < nSec; si++) {
        /* a fresh document per exercise: see the note in sit-pupil.js */
        if (si > 0) {
          await page.goto(BASE + '?class=demo&nointro', { waitUntil: 'domcontentloaded', timeout: 20000 });
          await W.settle(page);
          await page.evaluate(() => document.getElementById('cover-open').click());
          await W.settle(page);
          await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, book);
          await W.settle(page);
        }
        const o = await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, si);
        if (!o.ok) continue;
        await W.settle(page);
        const qids = await page.evaluate(s => eval(s)(), W.QUESTIONS_ON_SCREEN);

        for (const qid of qids) {
          /* --- attempt one, wrong --- */
          const a1 = await page.evaluate((s, args) => eval(s)(args), W.ANSWER, [qid, true]);
          if (!a1.ok) { g.note('no wrong attempt for ' + qid + ': ' + a1.why); continue; }
          /* some screens make a wrong answer impossible - every term in one
             family, so the app does the collecting - and that is a fact about
             the app, not a failed walk */
          if (a1.wrongNotPossible) { g.note(qid + ': ' + a1.how); continue; }
          await W.settle(page);
          await page.evaluate((s, id) => eval(s)(id), W.CHECK, qid);
          await W.settle(page);
          await record(page, sidecar, 'question', 'checked-wrong-1', { qid, book, section: si, width });

          /* help is EARNED at two wrong, not one */
          const helpAfterOne = await page.evaluate(s => eval(s)(), W.HELP_STRIP);
          g.check(!helpAfterOne.present, 'question:checked-wrong-1 > ' + qid + ' @' + width, 'support',
            '"' + (helpAfterOne.label || 'the method help') + '" is visible after ONE wrong attempt — help is earned at two');

          /* --- attempt two, wrong again --- */
          const a2 = await page.evaluate((s, args) => eval(s)(args), W.ANSWER, [qid, true]);
          if (a2.ok) {
            await W.settle(page);
            await page.evaluate((s, id) => eval(s)(id), W.CHECK, qid);
            await W.settle(page);
          }
          await record(page, sidecar, 'question', 'checked-wrong-2', { qid, book, section: si, width });

          /* after two, the help is there and leads with her own slip */
          const helpAfterTwo = await page.evaluate(s => eval(s)(), W.HELP_STRIP);
          if (helpAfterTwo.present) {
            await record(page, sidecar, 'question', 'help-strip', { qid, book, section: si, width });
          }

          /* --- a third Check is impossible ---
             measured on what the APP RECORDED, not on the button: a renderer
             may grey the Check, hide it, or leave it there and ignore it, and
             all three are honest as long as no third attempt is taken. */
          const before = await page.evaluate((s, id) => eval(s)(id), W.ATTEMPT_COUNT, qid);
          const third = await page.evaluate((s, id) => eval(s)(id), W.CHECK, qid);
          await W.settle(page);
          const after = await page.evaluate((s, id) => eval(s)(id), W.ATTEMPT_COUNT, qid);
          g.check(!after.ok || !before.ok || after.n <= before.n, 'question:checked-wrong-2 > ' + qid + ' @' + width, 'attempts',
            'a third Check was accepted after two wrong attempts (' + before.n + ' -> ' + after.n + ') — two is the whole model, and a third would let her guess her way through');
          g.check(!third.ok, 'question:checked-wrong-2 > ' + qid + ' @' + width, 'attempts',
            'the Check button was still pressable after two wrong attempts — it must be disabled, taken away, or say why it is waiting');
        }
      }

      sidecar.consoleErrors = page.__errors.length;
      g.check(page.__errors.length === 0, book + ' @' + width, 'console',
        page.__errors.length + ' console error(s) on the wrong path — first: ' + (page.__errors[0] || ''));
      fs.writeFileSync(A.out('walk/sit-confused-' + book + '-' + width + '.json'), JSON.stringify(sidecar, null, 1));
      g.note(book + ' @' + width + ': stood on ' + sidecar.states.length + ' wrong-path states, ' + page.__errors.length + ' console errors');
      await page.close();
      await browser.close();
    }
  }
  g.done();
})().catch(e => {
  console.log('  FAIL  sit-confused x crash: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});

async function record(page, sidecar, surface, state, extra) {
  await W.settle(page);
  /* WHAT IS WRITTEN DOWN IS WHAT WAS ON SCREEN. The walk used to record the
     state it MEANT to reach, so a drive that silently did nothing still filed
     a row saying she had stood there - and the coverage matrix counted it. */
  const seen = await page.evaluate((s2, args) => eval(s2)(args), W.STATE_OF, [surface, (extra && extra.qid) || null]);
  const real = (seen && seen.ok && seen.state) || null;
  g.check(real === state, surface + ':' + state + (extra && extra.qid ? ' > ' + extra.qid : '') + ' @' + (extra && extra.width), 'walk',
    'the walk expected "' + state + '" and the app was in "' + (real || '(no such surface on screen)') + '" - a state nobody stood on is not covered');
  const a = await AUD.run(page, { clickSafety: true });
  sidecar.states.push(Object.assign({ surface, state: real || state, expected: state, stood: real === state }, extra || {}, { audits: a.verdicts }));
  Object.keys(a.findings).forEach(k => (a.findings[k] || []).forEach(f => {
    g.fail(surface + ':' + state + (extra && extra.qid ? ' > ' + extra.qid : '') + ' @' + (extra && extra.width), k,
      describe(f));
  }));
}

/* buildAttempts() lived here and quietly disagreed with dev/model-attempts.js:
   it keyed by question id alone, so the angles table overwrote the algebra
   one for the eighteen ids the two books share. There is ONE home for a model
   attempt and lib/stage.js reads it. */
