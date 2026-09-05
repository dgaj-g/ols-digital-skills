/* walk-moves.js — HOW A WALKER GETS THROUGH A QUESTION.
 *
 * The five-part architecture is the KS3 DT walker's, kept exactly, because it
 * is what makes a walker readable a year later:
 *
 *   detectKind   ONE cascade, most specific first, asked of the screen
 *   MOVES        per kind: the argument-free page function that answers it RIGHT
 *   WRONG_MOVES  per kind: the same, answering it with that kind's own slip
 *   SETTLE       what "the screen has stopped moving" means
 *   ACTIONS      the presses that are not answers (Check, the help strip, next)
 *
 * THE ANSWER CHANNEL. A walker cannot rotate a protractor knob and read a dual
 * scale, and pretending it can would make the walk a fiction. So the answer
 * comes from `dev/model-attempts.js` - the same attempts `dev/validate-all.js`
 * proves mark full - primed into the page as `window.__modelAttempt(qid)` and
 * handed to the app's own preview-only `GJ.app.__prime`. Everything after that
 * is the real app: the real Check, the real marking engine, the real feedback,
 * the real states. The channel exists ONLY on the preview tier.
 *
 * Every page function below takes no arguments and returns a plain value, so it
 * can be handed to page.evaluate as source and read in the log as what it does.
 */
'use strict';

/* what kind of question is on screen — asked of the DOM, most specific first */
const DETECT_KIND = `(() => {
  const root = document.querySelector('[data-surface="question"], .jq');
  if (!root) return null;
  const k = root.getAttribute('data-kind');
  if (k) return k;
  /* before the contract landed, the renderer's own furniture is the tell */
  if (root.querySelector('.prot-wrap')) return 'protractor';
  if (root.querySelector('.classify-row, .jq-options')) return 'classify';
  if (root.querySelector('.reason-bank, .step-row')) return 'reasoned';
  if (root.querySelector('.move-rail')) return 'solve';
  if (root.querySelector('.term-bin')) return 'simplify';
  if (root.querySelector('.grid-pick')) return 'expand';
  if (root.querySelector('.subst-tap')) return 'subst';
  return 'unknown';
})`;

/* the question root's own identity, for the sidecar */
const QUESTION_ID = `(() => {
  const root = document.querySelector('[data-surface="question"], .jq');
  if (!root) return null;
  return {
    qid: root.getAttribute('data-qid'),
    kind: root.getAttribute('data-kind'),
    book: root.getAttribute('data-book'),
    section: root.getAttribute('data-section'),
    state: root.getAttribute('data-state')
  };
})`;

/* every question now on screen, in order — the section renders them all */
const QUESTIONS_ON_SCREEN = `(() => {
  const out = [];
  document.querySelectorAll('[data-surface="question"], .jq').forEach((r) => {
    const qid = r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '');
    if (qid) out.push(qid);
  });
  return out;
})`;

/* ANSWER IT. One move for every kind, because the channel is the same: the
   model attempt goes in, the app's own Check button is pressed. What differs
   per kind is nothing here - and that is the point of routing every kind
   through the engine the validator already proved. */
const ANSWER = `((args) => {
  const [qid, wrong] = args;
  const attempt = window.__modelAttempt(qid, wrong);
  if (!attempt) return { ok: false, why: 'no model attempt for ' + qid };
  if (!window.GJ || !window.GJ.app || !window.GJ.app.__prime) return { ok: false, why: 'no answer channel (is this the live tier?)' };
  const primed = window.GJ.app.__prime(qid, attempt);
  return { ok: !!primed };
})`;

/* PRESS CHECK on one question, and say what the button was called */
const CHECK = `((qid) => {
  const root = [...document.querySelectorAll('[data-surface="question"], .jq')]
    .filter((r) => (r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '')) === qid)[0];
  if (!root) return { ok: false, why: 'question ' + qid + ' is not on screen' };
  const btn = [...root.querySelectorAll('button')]
    .filter((b) => /mark my|check/i.test(b.textContent || ''))[0];
  if (!btn) return { ok: false, why: 'no Check button on ' + qid };
  const label = (btn.textContent || '').trim();
  const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
  const why = btn.getAttribute('data-locked-why') || '';
  if (disabled) return { ok: false, disabled: true, label, why };
  btn.click();
  return { ok: true, label };
})`;

/* the help strip: is it there, and does it lead with her own slip */
const HELP_STRIP = `(() => {
  const w = document.querySelector('.support-strip, [data-help-strip]');
  if (!w || w.hidden) return { present: false };
  const btn = w.querySelector('button');
  return {
    present: true,
    label: btn ? (btn.textContent || '').trim() : '',
    text: (w.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 160)
  };
})`;

/* SETTLE — the screen has stopped moving. Deliberately not a fixed sleep: a
   fixed sleep is either too short on a busy machine or wasted on a quick one,
   and a screenshot taken mid-animation is a picture of a blend, not a colour. */
async function settle(page, tries) {
  await new Promise(r => setTimeout(r, 180));
  for (let i = 0; i < (tries || 12); i++) {
    let n = 0;
    try {
      n = await page.evaluate(() => (document.getAnimations ? document.getAnimations() : [])
        .filter(a => a.playState === 'running').length);
    } catch (e) { return; }
    if (!n) { await new Promise(r => setTimeout(r, 120)); return; }
    await new Promise(r => setTimeout(r, 140));
  }
}

/* ACTIONS on the shell, named as a teacher or a pupil would name them */
const ACTIONS = {
  openBook: `((bookId) => {
    const card = document.querySelector('.book[data-book="' + bookId + '"]');
    if (!card) return { ok: false, why: 'no book card for ' + bookId };
    if (card.classList.contains('not-set')) return { ok: false, why: bookId + ' is not set for this class' };
    card.click();
    return { ok: true };
  })`,
  openSection: `((i) => {
    const chips = [...document.querySelectorAll('#act-contents button')];
    if (!chips[i]) return { ok: false, why: 'no exercise ' + i };
    chips[i].click();
    return { ok: true, label: (chips[i].textContent || '').trim() };
  })`,
  sectionCount: `(() => document.querySelectorAll('#act-contents button').length)`,
  playMovieToEnd: `(async () => {
    const movie = document.querySelector('[data-surface="movie"], .movie');
    if (!movie) return { steps: 0, why: 'no movie on this exercise' };
    let steps = 0;
    for (let i = 0; i < 60; i++) {
      const next = [...movie.querySelectorAll('button')]
        .filter(b => /next|play|start|again/i.test(b.textContent || '') && !b.disabled)[0];
      if (!next) break;
      next.click();
      steps++;
      await new Promise(r => setTimeout(r, 120));
    }
    return { steps: steps, state: movie.getAttribute('data-state') };
  })`,
  backToShelf: `(() => { const b = document.getElementById('act-back'); if (b) { b.click(); return true; } return false; })`
};

module.exports = { DETECT_KIND, QUESTION_ID, QUESTIONS_ON_SCREEN, ANSWER, CHECK, HELP_STRIP, ACTIONS, settle };
