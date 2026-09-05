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
      if (right) out['right:' + r.qid] = right;
      if (wrong) out['wrong:' + r.qid] = wrong;
    } catch (e) {}
  });
  return out;
}

async function openApp(browser, opts) {
  opts = opts || {};
  const page = await B.newPage(browser, opts);
  await page.evaluateOnNewDocument((t) => {
    window.__modelAttempt = (qid, wrong) => (t[(wrong ? 'wrong:' : 'right:') + qid] || null);
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
