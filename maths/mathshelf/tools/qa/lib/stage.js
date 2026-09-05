/* stage.js — GET TO THE SCREEN THE LAW IS ABOUT, IN ONE PLACE.
 * Five gates need "open the preview, sign in, open a book, open an exercise,
 * put a real attempt on a question". Written once, they cannot drift apart. */
'use strict';
const A = require('./app.js');
const B = require('./browser.js');
const W = require('./walk-moves.js');

const BASE = process.env.MS_BASE || 'http://localhost:8099/maths/mathshelf/index.html';

function attempts() {
  const M = require(A.app('mathcore.js'));
  const MA = require(A.app('dev/model-attempts.js'));
  const out = {};
  A.grid().forEach(r => {
    try {
      const right = MA.correct(M, r.book, r.question);
      const wrong = MA.corrupt(M, r.book, r.question);
      /* KEYED BY BOOK AND QUESTION, because eighteen of the thirty question
         ids appear in BOTH books: keyed by qid alone the angles table
         overwrote the algebra one, and the walker spent every run answering
         algebra questions with an angles pupil's working - which the composer
         quietly refused, leaving the question "fresh" and the walk claiming a
         state it had never stood on. */
      if (right) out['right:' + r.book + ':' + r.qid] = right;
      if (wrong) out['wrong:' + r.book + ':' + r.qid] = wrong;
    } catch (e) {}
  });
  return out;
}

async function openApp(browser, opts) {
  opts = opts || {};
  const page = await B.newPage(browser, opts);
  await page.evaluateOnNewDocument((t) => {
    /* the book comes off the question's own root (the DOM contract puts it
       there), so a caller never has to know which book it is looking at */
    window.__modelAttempt = (qid, wrong) => {
      const root = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
        .filter((r) => (r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '')) === qid)[0];
      const book = root ? (root.getAttribute('data-book') || '') : '';
      return t[(wrong ? 'wrong:' : 'right:') + book + ':' + qid] || null;
    };
  }, attempts());
  await page.goto(BASE + '?class=demo&nointro', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await W.settle(page);
  if (opts.staff) {
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await W.settle(page);
    await page.evaluate(() => document.getElementById('cover-staff').click());
    await W.settle(page);
    await page.evaluate(() => { const i = document.querySelector('#st-pass'); i.value = 'demo'; document.querySelector('#st-go').click(); });
    await new Promise(r => setTimeout(r, 1200));
    return page;
  }
  await page.evaluate(() => document.getElementById('cover-open').click());
  await W.settle(page);
  return page;
}

async function openExercise(page, book, sectionIdx) {
  const o = await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, book);
  if (!o.ok) return null;
  await W.settle(page);
  await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, sectionIdx || 0);
  await W.settle(page);
  return page.evaluate(s => eval(s)(), W.QUESTIONS_ON_SCREEN);
}

async function answer(page, qid, wrong) {
  await page.evaluate((s, a) => eval(s)(a), W.ANSWER, [qid, !!wrong]);
  await W.settle(page);
  await page.evaluate((s, id) => eval(s)(id), W.CHECK, qid);
  await W.settle(page);
}

module.exports = { openApp, openExercise, answer, BASE, attempts };
