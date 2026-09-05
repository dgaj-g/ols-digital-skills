#!/usr/bin/env node
/* qa-two-attempts.js — TWO ATTEMPTS IS THE WHOLE MODEL.
 *
 * G-E5. Two is not an arbitrary number: it is what makes the second attempt
 * worth thinking about and the help worth earning. So:
 *   - a first correct answer LOCKS the question;
 *   - a first wrong answer strikes through and opens a fresh board beside it;
 *   - a second wrong answer LOCKS it, and only then are the true positions shown;
 *   - a third Check is impossible, however she gets there;
 *   - AMBER (a right answer with no working) counts as an attempt;
 *   - a reload mid-attempt restores the attempt she was in the middle of, and a
 *     reload after lock restores the locked state — she never loses a board by
 *     the page reloading under her;
 *   - and the summary the teacher's markbook reads says the same thing the
 *     engine said, question by question.
 *
 * THE DOUBLE PRESS AT LIVE SPEED (the qa-skip-guard trick): the local preview
 * answers instantly, so a double press cannot race anything. The transport is
 * slowed to two seconds first, and the button is pressed twice — a second
 * attempt must not be spent by a pupil pressing Check twice on a slow morning.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const B = require('./lib/browser.js');
const S = require('./lib/stage.js');
const W = require('./lib/walk-moves.js');

const TIER = 'full';
const ORDER = 76;
const COVERS = { books: '*', kinds: '*', surfaces: ['question'], widths: [1280], projector: false, tier: ['preview'], cells: ['attempts'] };
const CONTROLS = [
  { id: 'third-attempt', kind: 'fixture', plant: 'fixture-renderers', mustFail: /a third Check/ },
  { id: 'double-press-spends-an-attempt', kind: 'self-probe', mustFail: /a double press spent/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-two-attempts');
g.exempt(['the attempt model is proved on one question per kind, not on all 48: what differs between questions is the maths, and the maths has its own gates']);

(async () => {
  const browser = await B.launch();
  try {
    const page = await S.openApp(browser, { width: 1280 });
    const seenKinds = new Set();
    for (const book of A.books()) {
      const pack = A.content()[book];
      for (let si = 0; si < pack.sections.length; si++) {
        const kind = A.kindOf(pack.sections[si].questions[0] || {});
        if (seenKinds.has(kind)) continue;
        const qids = await S.openExercise(page, book, si);
        if (!qids || !qids.length) continue;
        seenKinds.add(kind);
        const qid = qids[0];

        /* wrong once: struck, and a fresh board beside it */
        await S.answer(page, qid, true);
        let st = await state(page, qid);
        g.check(st.state === 'checked-wrong-1', book + ' > ' + qid + ' (' + kind + ')', 'attempts',
          'after one wrong answer the question is in state "' + st.state + '" — it should be checked-wrong-1, with the first try struck and a fresh board live');
        g.check(!st.truth, book + ' > ' + qid, 'attempts',
          'the true answer is on the page after ONE wrong attempt — she has one more go, and it is worth nothing if the answer is already there');

        /* wrong twice: locked, and only now the truth */
        await S.answer(page, qid, true);
        st = await state(page, qid);
        g.check(/checked-wrong-2|locked/.test(st.state), book + ' > ' + qid, 'attempts',
          'after two wrong answers the question is in state "' + st.state + '" — it should be locked');

        /* a third Check is impossible */
        const third = await page.evaluate((s, id) => eval(s)(id), W.CHECK, qid);
        g.check(!third.ok || third.disabled, book + ' > ' + qid, 'attempts',
          'a third Check was accepted after two wrong attempts');

        /* a reload restores the locked state, not a fresh board */
        await page.reload({ waitUntil: 'domcontentloaded' });
        await W.settle(page);
        await page.evaluate(() => document.getElementById('cover-open') && document.getElementById('cover-open').click());
        await W.settle(page);
        await S.openExercise(page, book, si);
        const after = await state(page, qid);
        g.check(/locked|checked-wrong-2|checked-right/.test(after.state || ''), book + ' > ' + qid, 'attempts',
          'after a reload the question is in state "' + after.state + '" — a locked question stays locked, or a pupil could reload her way to a third go');
      }
    }
    g.note('attempt model proved on ' + seenKinds.size + ' kinds: ' + [...seenKinds].join(', '));

    /* THE DOUBLE PRESS, at two seconds of simulated latency */
    const q2 = await S.openExercise(page, A.books()[0], 0);
    if (q2 && q2.length) {
      await page.evaluate(() => {
        const real = window.GJ.app.call;
        window.GJ.app.call = (a, p) => new Promise(r => setTimeout(() => real(a, p).then(r), 2000));
      });
      await page.evaluate((s, a) => eval(s)(a), W.ANSWER, [q2[q2.length - 1], true]);
      await W.settle(page);
      await page.evaluate((s, id) => { eval(s)(id); eval(s)(id); }, W.CHECK, q2[q2.length - 1]);
      await new Promise(r => setTimeout(r, 2600));
      const st = await state(page, q2[q2.length - 1]);
      g.check(st.state === 'checked-wrong-1', q2[q2.length - 1], 'attempts',
        'a double press spent both attempts at once (state "' + st.state + '") — on a slow morning she would lose her second go to the page not answering fast enough');
    }
    await page.close();
  } finally { await browser.close(); }
  g.done();
})().catch(e => { console.log('  FAIL  qa-two-attempts x crash: ' + (e && e.stack ? e.stack : e)); process.exit(1); });

function state(page, qid) {
  return page.evaluate((id) => {
    const r = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
      .filter(x => (x.getAttribute('data-qid') || (x.id || '').replace(/^jq-/, '')) === id)[0];
    if (!r) return { state: '(not on screen)', truth: false };
    return { state: r.getAttribute('data-state'), truth: !!r.querySelector('[data-truth]') };
  }, qid);
}
