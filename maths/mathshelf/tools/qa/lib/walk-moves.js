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
 * proves mark full - handed to the page as `window.__modelAttempt(book, qid)`
 * and PLAYED on the app's own controls by lib/drive.js: tiles sorted, products
 * picked, move chips pressed, arcs tapped. Everything after that is the real
 * app: the real Check, the real marking engine, the real feedback, the real
 * states.
 *
 * Every page function below takes no arguments and returns a plain value, so it
 * can be handed to page.evaluate as source and read in the log as what it does.
 */
'use strict';

/* what kind of question is on screen — asked of the DOM, most specific first */
const DETECT_KIND = `(() => {
  const root = document.querySelector('[data-surface="question"], .jotter-q');
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
  const root = document.querySelector('[data-surface="question"], .jotter-q');
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
  document.querySelectorAll('[data-surface="question"], .jotter-q').forEach((r) => {
    const qid = r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '');
    if (qid) out.push(qid);
  });
  return out;
})`;

/* ANSWER IT. One move for every kind, because the channel is the same: the
   model attempt goes in, the app's own Check button is pressed. What differs
   per kind is nothing here - and that is the point of routing every kind
   through the engine the validator already proved. */
/* ANSWERING is a whole job of its own - five of the seven kinds are answered
   on a scaffold, not with a keystroke - so it lives in lib/drive.js and is
   re-exported here, where every walker already looks for it. */
const { ANSWER } = require('./drive.js');

/* PRESS CHECK on one question, and say what the button was called */
/* WHAT STATE IS THIS SCREEN ACTUALLY IN. Read off the DOM contract, never
   named by the walker: a walk that writes down the state it MEANT to reach
   records a screen it may never have stood on, and a coverage matrix built
   from those rows is a matrix that lies. */
const STATE_OF = `((args) => {
  const [surface, qid] = args;
  let roots = [...document.querySelectorAll('[data-surface="' + surface + '"]')];
  if (qid) roots = roots.filter((r) => (r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '')) === qid);
  const vis = roots.filter((r) => {
    if (r.hidden) return false;
    const cs = getComputedStyle(r); const b = r.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 2 && b.height > 2;
  });
  const r = vis[0] || roots[0];
  return r ? { ok: true, state: r.getAttribute('data-state'), visible: vis.length > 0 } : { ok: false };
})`;

const CHECK = `((qid) => {
  const root = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
    .filter((r) => (r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '')) === qid)[0];
  if (!root) return { ok: false, why: 'question ' + qid + ' is not on screen' };
  const btn = [...root.querySelectorAll('button')]
    .filter((b) => /mark my|check/i.test(b.textContent || ''))[0];
  if (!btn) return { ok: false, why: 'no Check button on ' + qid };
  const label = (btn.textContent || '').trim();
  const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
  const why = btn.getAttribute('data-locked-why') || '';
  /* REACHABILITY IS ASKED FIRST. A renderer is entitled to take the Check away
     rather than grey it out, and it does exactly that once a question is
     marked - the button is left disabled inside a hidden row. Asking "is it
     disabled?" before "can she see it?" reported every marked question as a
     control that will not act and will not say why, which is a law about a
     control she can SEE. And a walker that reaches into a hidden row and
     clicks anyway is not walking, it is inventing a fault. */
  const cs = getComputedStyle(btn);
  const box = btn.getBoundingClientRect();
  if (btn.closest('[hidden]') || cs.display === 'none' || cs.visibility === 'hidden' ||
      Number(cs.opacity) < 0.05 || box.width < 1 || box.height < 1) {
    return { ok: false, unreachable: true, label, why: why || 'the Check is not on screen' };
  }
  if (disabled) return { ok: false, disabled: true, label, why };
  btn.click();
  return { ok: true, label };
})`;

/* how many attempts the app itself has recorded for a question - read from the
   app's own state through the preview-only channel, never counted off the
   screen, because what the model holds is what the next save will carry */
const ATTEMPT_COUNT = `((qid) => {
  const g = window.GJ && window.GJ.app;
  if (!g || typeof g.__state !== 'function') return { ok: false, why: 'no preview state channel' };
  const st = g.__state();
  const rec = st && st.qs && st.qs[qid];
  return { ok: true, n: (rec && rec.att && rec.att.length) || 0, locked: !!(rec && rec.lock) };
})`;

/* the help strip: is it there, and does it lead with her own slip */
const HELP_STRIP = `(() => {
  /* the strip is .want-how - "Want to see how?" - and this looked for a class
     name the app has never had, so it reported "no help on screen" every time */
  const w = document.querySelector('.want-how, .support-strip, [data-help-strip]');
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
/* AN ANIMATION THAT NEVER ENDS IS NOT THE PAGE STILL SETTLING. This waited for
   every running animation to stop, and the shell has decorations that loop for
   ever - so every single call ran its whole budget, about 1.9 seconds, several
   hundred times in a walk. That was most of the walk's clock. A looping
   animation is excluded by its own iteration count. */
async function settle(page, tries) {
  await new Promise(r => setTimeout(r, 120));
  /* AND A PAGE THAT IS NEVER PAINTED HAS NO ANIMATIONS TO WAIT FOR. Headless
     Chrome does not composite these pages: requestAnimationFrame never fires
     and the document timeline does not advance, so a CSS animation is reported
     as "running" for ever and every settle spent its whole budget. Ask the
     timeline whether time is passing at all; where it is not, wait a beat for
     the DOM work and carry on. */
  try {
    const moving = await page.evaluate(() => new Promise((res) => {
      const t0 = document.timeline ? document.timeline.currentTime : null;
      if (t0 == null) return res(true);
      setTimeout(() => res(document.timeline.currentTime !== t0), 90);
    }));
    if (!moving) { await new Promise(r => setTimeout(r, 90)); return; }
  } catch (e) { return; }
  for (let i = 0; i < (tries || 10); i++) {
    let n = 0;
    try {
      n = await page.evaluate(() => (document.getAnimations ? document.getAnimations() : [])
        .filter((a) => {
          if (a.playState !== 'running') return false;
          const it = (a.effect && a.effect.getTiming && a.effect.getTiming().iterations);
          return !(it === Infinity || it > 100);
        }).length);
    } catch (e) { return; }
    if (!n) { await new Promise(r => setTimeout(r, 90)); return; }
    await new Promise(r => setTimeout(r, 110));
  }
}

/* WAIT FOR THE APP TO FINISH MARKING. A verdict is drawn one line at a time,
   with a beat between each, so pressing Check and reading the state straight
   after reads the state before the marking landed. This waits for the screen
   to leave the states it was in, and gives up rather than hanging. */
async function leaves(page, surface, qid, from, ms) {
  const until = Date.now() + (ms || 4000);
  while (Date.now() < until) {
    let st = null;
    try { st = await page.evaluate((s, args) => eval(s)(args), STATE_OF, [surface, qid || null]); }
    catch (e) { return null; }
    const now = st && st.ok ? st.state : null;
    if (now && from.indexOf(now) < 0) return now;
    await new Promise(r => setTimeout(r, 80));
  }
  return null;
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
  /* WATCH THE FILM THROUGH, ONE STEP AT A TIME. The step control is an arrow
     with no word in it, so matching button TEXT found only "Play" - which
     starts the film running on its own reading clock and hands back before it
     has moved. The film therefore sat on the state it mounts in ("instant",
     because mounting jumps to step one with no animation) and the walk never
     saw a step, let alone the end. */
  playMovieToEnd: `(async () => {
    const movie = document.querySelector('[data-surface="movie"], .movie');
    if (!movie) return { steps: 0, why: 'no movie on this exercise' };
    const fwd = () => movie.querySelector('.mc-fwd') ||
      [...movie.querySelectorAll('button')].filter(b => /next step/i.test(b.getAttribute('aria-label') || ''))[0] ||
      [...movie.querySelectorAll('button')].filter(b => /next|start|again/i.test(b.textContent || ''))[0];
    /* A STEP TAKES AS LONG AS IT TAKES. The player ignores a press while it is
       still animating the last one, so pressing on a fixed clock swallowed most
       of them and the film stopped part-way with the walk calling it the end.
       Press, then wait for the caption number to move, then press again. */
    const capNo = () => {
      const c = movie.querySelector('.cap-num, .ml-cap-n, [data-cap-n]');
      return c ? (c.textContent || '').trim() : String(movie.getAttribute('data-state'));
    };
    /* The player refuses a press outright while it is still drawing the last
       step, so pressing once and then waiting spends the whole wait on a press
       that was never taken. Press again every few hundred milliseconds instead:
       an extra press costs nothing and the step lands as soon as the player is
       free. */
    let steps = 0;
    for (let i = 0; i < 40; i++) {
      if (movie.getAttribute('data-state') === 'end') break;
      const b = fwd();
      if (!b || b.disabled) break;
      const was = capNo();
      let moved = false;
      for (let t = 0; t < 60 && !moved; t++) {
        if (t % 6 === 0) { const bb = fwd(); if (bb && !bb.disabled) { bb.click(); steps++; } }
        await new Promise(r => setTimeout(r, 60));
        if (capNo() !== was || movie.getAttribute('data-state') === 'end') moved = true;
      }
      if (!moved) break;
    }
    return { steps: steps, state: movie.getAttribute('data-state') };
  })`,
  backToShelf: `(() => { const b = document.getElementById('act-back'); if (b) { b.click(); return true; } return false; })`
};

module.exports = { DETECT_KIND, QUESTION_ID, QUESTIONS_ON_SCREEN, ANSWER, CHECK, ATTEMPT_COUNT, STATE_OF, HELP_STRIP, ACTIONS, settle, leaves };
