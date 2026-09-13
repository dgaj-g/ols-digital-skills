/* stat-probes.js — THE GENUINE-CONSEQUENCE LAWS NO GATE OWNS YET (DESIGN §11.3,
 * "[Review, 7 Sept 2026] The genuine-consequence laws, and where each lives").
 *
 * Three probes, one line each for a walker to ride:
 *
 *   PERSISTS      a page function. After a wrong placement is on the board,
 *                 nothing may move it, colour it, or say anything about it,
 *                 unprompted, ever. Called from sit-confused (or any walker
 *                 standing on a wrong attempt) as:
 *                   const r = await page.evaluate((s, a) => eval(s)(a), P.PERSISTS, [qid]);
 *                   if (!r.ok) g.fail(where, 'consequence', r.why);
 *
 *   SIGNATURE     a page function. On question:fresh only, the thing she has
 *                 to bring - the pairing, the reading, the five numbers, the
 *                 cuts, the verdicts - is not on the page in any form. Called
 *                 from sit-pupil right after `record('question', 'fresh', ...)`:
 *                   const r = await page.evaluate((s, a) => eval(s)(a), P.SIGNATURE, [qid]);
 *                   if (!r.ok) g.fail(where, 'consequence', r.why);
 *
 *   STAGE_SETTLE  a plain function, not a page function - it compares two
 *                 lists the walker already holds (every stage the kind CAN
 *                 show, from STAGES_OF; every stage the walker actually drove
 *                 to and recorded, its own loop variable), so it needs no DOM
 *                 access of its own. Called once a question's walk is done:
 *                   const r = W.STAGE_SETTLE(qid, declaredStages, visitedStages);
 *                   if (!r.ok) g.fail(where, 'consequence', r.why);
 *
 * Every probe returns a plain { ok, why } object (why is null when ok), so a
 * walker's one line is always `if (!r.ok) g.fail(where, 'consequence', r.why)`.
 */
'use strict';

/* ── PERSISTS ─────────────────────────────────────────────────────────────
 * "A wrong placement is accepted silently and stays exactly where she left
 * it" (DESIGN §4.0 "Genuine consequence"). Read her attempt's state through
 * the preview-only channel every walker already uses (GJ.app.__state, the
 * same one ATTEMPT_COUNT reads in walk-moves.js), read the placed-item
 * classes and the one live message slot, wait half a second - long enough
 * for any timer-based "helpful" correction to have fired - and read all
 * three again. Nothing may have changed. */
const PERSISTS = `(async (args) => {
  const [qid] = args;
  const root = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
    .filter((r) => (r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '')) === qid)[0];
  if (!root) return { ok: false, why: qid + ' is not on screen' };
  const g = window.GJ && window.GJ.app;
  if (!g || typeof g.__state !== 'function') return { ok: false, why: 'no preview state channel to read ' + qid + ' through' };
  const snap = () => {
    const st = g.__state();
    const rec = st && st.qs && st.qs[qid];
    const S = rec && rec.att && rec.att.length ? rec.att[rec.att.length - 1].S : null;
    const classes = [...root.querySelectorAll('[data-placed]')]
      .map((e) => (e.getAttribute('data-qid') || '') + ':' + e.className + ':' + (e.getAttribute('aria-pressed') || ''))
      .sort().join('|');
    const msg = ((root.querySelector('.ui-msg, .stat-msg') || {}).textContent || '').trim();
    return { S: JSON.stringify(S), classes: classes, msg: msg };
  };
  /* LET THE RECORD CATCH UP FIRST. The app saves an unfinished board on a
     400 ms debounce (jotter-stats.js saveOpen, and its human-pace row), so a
     first read taken the instant the last press lands sees the record BEFORE
     that save and the second sees it after - which is the record catching up
     with a board that never moved, not a board that moved. The law is about
     the BOARD: wait for the save to land, then watch. */
  await new Promise((r) => setTimeout(r, 700));
  const before = snap();
  await new Promise((r) => setTimeout(r, 500));
  const after = snap();
  const ok = before.S === after.S && before.classes === after.classes && before.msg === after.msg;
  if (ok) return { ok: true, why: null };
  const what = before.S !== after.S ? 'her board' : (before.classes !== after.classes ? 'a placed item\\'s own class' : 'the message beside it');
  return { ok: false, why: 'a wrong placement did not persist on ' + qid + ' - ' + what + ' changed on its own' };
})`;

/* ── SIGNATURE ────────────────────────────────────────────────────────────
 * On question:fresh only (DESIGN §4.0 "Given data, and the answer
 * signature"): serialise the kind's answer signature from the pack, using
 * the SAME live engine (window.GJ_STATS) the app itself marks with - never a
 * second re-implementation guessing at the same numbers - and assert none of
 * it appears in any text node or attribute of the question root, save what
 * the paper itself prints. What is exempt is declared per kind, straight
 * from §4.0's own list. */
const SIGNATURE = `((args) => {
  const [qid] = args;
  const root = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
    .filter((r) => (r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '')) === qid)[0];
  if (!root) return { ok: false, why: qid + ' is not on screen' };
  const state = root.getAttribute('data-state') || '';
  if (state !== 'fresh') return { ok: true, why: null };
  const kind = root.getAttribute('data-kind');
  const book = root.getAttribute('data-book') || '';
  let packQ = null;
  try {
    const pack = window.GJ.app.content(book);
    (pack.sections || []).forEach((s) => (s.questions || []).forEach((x) => { if (x.id === qid) packQ = x; }));
  } catch (e) { return { ok: false, why: 'could not read the pack for ' + qid }; }
  if (!packQ) return { ok: false, why: 'no pack question found for ' + qid };
  const GS = window.GJ_STATS;
  if (!GS) return { ok: false, why: 'no GJ_STATS engine on the page to derive the truth from' };

  /* WHERE A LEAK CAN ACTUALLY BE, and nowhere else.
   *
   * The first cut of this probe asked whether any truth VALUE appeared
   * ANYWHERE in the question, and reported the paper's own printed list as a
   * leak on every qlist in the book - which it is not: DESIGN 4.0 says in so
   * many words that what the paper prints is given, and for most kinds the
   * secret is not a number at all but a PAIRING (which boundary goes with
   * which total) or a CHOICE (which of the printed values is the median).
   * Neither can be searched for as a string, and pretending otherwise made the
   * law shout on every screen and so mean nothing on any of them.
   *
   * So this asks the two questions that CAN be answered - and they are the two
   * the design's own control plants against:
   *   1. the true positions are not drawn before the question locks
   *      ([data-truth] is what draws them), and
   *   2. no READ-OUT is showing a true value at mount: the read-out is the one
   *      place on a board that speaks, and DESIGN 4.0 says it prints HER
   *      placement, never the answer. */
  /* .stat-verdict-leak (Book B, 13 Sept 2026): a judge claim with
     True/False/Not-enough-information options prints its authored verdict
     word nowhere on a fresh render - the stats-b-tfn-leak plant adds
     exactly that, from first mount, and it carries no [data-truth] of its
     own (that attribute names the CHART kinds' true positions), so it is
     named here alongside it rather than invented as a second law */
  const truthEls = root.querySelectorAll('[data-truth], .stat-verdict-leak');
  if (truthEls.length) {
    return { ok: false, why: 'an answer value is on the page before Check: the true positions are drawn on ' + qid };
  }
  const rstr = (r) => (r == null ? '' : (r.d === undefined ? String(r) : (r.d === 1 ? String(r.n) : String(Math.round((r.n / r.d) * 1e6) / 1e6))));
  const rules = (() => {
    try { const p = window.GJ_CONTENT && window.GJ_CONTENT[book]; return (p && p.rules) || GS.DEFAULT_RULES; }
    catch (e) { return GS.DEFAULT_RULES; }
  })();
  let truth = [];
  try {
    if (kind === 'qlist') {
      const q = GS.quartiles(packQ.values || [], rules.quartileRule);
      if (q) truth = ['Q1', 'Q2', 'Q3', 'IQR'].map((k) => rstr(q[k]));
    } else if (kind === 'cftable') {
      truth = (GS.cumulate(packQ.classes || []) || []).map(String);
    } else if (kind === 'cfplot') {
      truth = (GS.expectedPoints(packQ, rules) || []).map((p) => rstr(p[0]) + ', ' + rstr(p[1]));
    } else if (kind === 'cfread') {
      const h = GS.readHeights(Number(packQ.n) || 0, rules.curveRule);
      truth = ['median', 'Q1', 'Q3'].map((k) => {
        const x = GS.curveX(packQ.curve, h[k === 'median' ? 'median' : k]);
        return x ? rstr(x) : '';
      }).filter(Boolean);
    } else if (kind === 'boxplot' && packQ.from) {
      truth = [];
    }
  } catch (e) { return { ok: false, why: 'could not derive the truth for ' + qid + ': ' + e.message }; }

  const speaking = [...root.querySelectorAll('.stat-label, .stat-readout, [data-board-label]')];
  for (let i = 0; i < speaking.length; i++) {
    const t = (speaking[i].textContent || '').replace(/\s+/g, ' ').trim();
    if (!t) continue;
    for (let j = 0; j < truth.length; j++) {
      if (truth[j] && t.indexOf(truth[j]) > -1) {
        return { ok: false, why: 'an answer value is on the page before Check: "' + t + '" on ' + qid };
      }
    }
  }
  return { ok: true, why: null };
})`;

/* ── STAGE_SETTLE ─────────────────────────────────────────────────────────
 * Every stage in data-stages was stood on at least once for this question at
 * this width. Not a page function: the walker already holds both lists in
 * Node by the time a question's walk is done - `declared` from STAGES_OF's
 * own .stages, `visited` from the stage the walker recorded after every
 * ANSWER(qid, wrong, stageName) call it made - so this is a pure comparison,
 * no DOM to read. */
function STAGE_SETTLE(qid, declared, visited) {
  const decl = Array.isArray(declared) ? declared : [];
  const seen = new Set(Array.isArray(visited) ? visited : []);
  const missing = decl.filter((s) => !seen.has(s));
  if (!missing.length) return { ok: true, why: null };
  return { ok: false, why: 'never stood on stage ' + missing[0] + ' on ' + qid +
    (missing.length > 1 ? ' (and ' + (missing.length - 1) + ' more)' : '') };
}

/* ── TABLE_ONE_CELL (Book B) ──────────────────────────────────────────────
 * CONTRACT_B.md "table": stages "empty · filling · asking · ready". The
 * generic machinery every other stats kind already rides - STAGES_OF reads
 * data-stages/data-stage off the root, sit-pupil's own per-stage loop drives
 * to each named stage in turn with ANSWER(qid, false, stage), and
 * STAGE_SETTLE asserts every declared stage was actually stood on - already
 * proves a SKIPPED stage was "never stood on" (that is what
 * stats-b-stage-skipped, a table that jumps empty -> ready, must fail). What
 * that alone cannot say is WHEN the skip happens: a table could dawdle on
 * "empty" for several cells and only skip straight to "ready" once the last
 * one lands, and STAGE_SETTLE would report exactly the same missing stage
 * either way. This probe stands on the one board no other law names by
 * itself: called the instant the walk drives to the "filling" stage, before
 * lib/drive.js's pressTable has pressed more than its first cell, it asserts
 * the table has ALREADY left "empty" - the same "one press, one board" law
 * PERSISTS reads a wrong placement against, read here on the right path
 * instead. Not a page function that presses anything itself: pressTable
 * already pressed the one cell by the time sit-pupil calls this, so it only
 * reads the stage attribute. */
const TABLE_ONE_CELL = `((args) => {
  const [qid] = args;
  const root = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
    .filter((r) => (r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '')) === qid)[0];
  if (!root) return { ok: false, why: qid + ' is not on screen' };
  if (root.getAttribute('data-kind') !== 'table') return { ok: true, why: null };
  const stage = root.getAttribute('data-stage');
  if (stage === 'empty') return { ok: false, why: 'one cell keyed on ' + qid + ' and the table is still on stage "empty" - a table moves to "filling" the moment its first box is keyed' };
  return { ok: true, why: null };
})`;

/* ── ROWPICK_SINGLE (Book B) ──────────────────────────────────────────────
 * CONTRACT_B.md "table": row asks are "one ask at a time; the chosen row
 * aria-pressed=true ... press again clears" - a row-pick group names exactly
 * ONE choice, never several. A plain DOM read (not a press), called once a
 * table question's whole drive is done (same moment STAGE_SETTLE is asked),
 * over every `.stat-rowpick[data-ask]` group on the question root. Backs
 * the stats-b-rowpick-two-pressed plant (BUILD.table's aria-pressed check
 * loosened from "this exact row" to "any row at all"). */
const ROWPICK_SINGLE = `((args) => {
  const [qid] = args;
  const root = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
    .filter((r) => (r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '')) === qid)[0];
  if (!root) return { ok: false, why: qid + ' is not on screen' };
  const groups = {};
  root.querySelectorAll('button.stat-rowpick[data-ask]').forEach((b) => {
    const ask = b.getAttribute('data-ask');
    (groups[ask] = groups[ask] || []).push(b.getAttribute('aria-pressed') === 'true');
  });
  for (const ask in groups) {
    const pressed = groups[ask].filter(Boolean).length;
    if (pressed > 1) {
      return { ok: false, why: pressed + ' rows read aria-pressed="true" at once for "' + ask + '" on ' + qid + ' - a row-pick group names exactly one choice' };
    }
  }
  return { ok: true, why: null };
})`;

module.exports = { PERSISTS, SIGNATURE, STAGE_SETTLE, TABLE_ONE_CELL, ROWPICK_SINGLE };
