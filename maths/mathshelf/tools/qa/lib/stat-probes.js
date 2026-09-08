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
  if (state !== 'fresh') return { ok: true, why: null };   /* the law is asked on question:fresh only */
  const kind = root.getAttribute('data-kind');
  const book = root.getAttribute('data-book') || '';
  let packQ = null;
  try {
    const pack = window.GJ.app.content(book);
    (pack.sections || []).forEach((s) => (s.questions || []).forEach((x) => { if (x.id === qid) packQ = x; }));
  } catch (e) { return { ok: false, why: 'could not read the pack for ' + qid }; }
  if (!packQ) return { ok: false, why: 'no pack question found for ' + qid };
  const GS = window.GJ_STATS;
  if (!GS) return { ok: false, why: 'no GJ_STATS engine on the page to derive the signature from' };
  const rulesOf = () => {
    try {
      const p = window.GJ_CONTENT && window.GJ_CONTENT[book];
      return (p && p.rules) || GS.DEFAULT_RULES;
    } catch (e) { return GS.DEFAULT_RULES; }
  };
  const rstr = (r) => (r == null ? '' : (r.d === undefined ? String(r) : (r.d === 1 ? String(r.n) : String(Math.round((r.n / r.d) * 1e6) / 1e6))));

  /* the values that must NOT be on the page (as she will read them, once
     Check has been pressed) - one string per fact she has to bring */
  let signature = [];
  /* the exempt containers - what the paper itself prints (§4.0's own list),
     scoped to elements rather than to strings: the exemption is by WHERE a
     number sits, not by coincidence with a number that happens to be given */
  const exemptRoots = [];
  try {
    if (kind === 'qlist') {
      const truth = GS.quartiles((packQ.values || []), (rulesOf().quartileRule || 'n+1'));
      if (truth) {
        const sorted = truth.sorted ? truth.sorted.map((r) => rstr(r)) : [];
        signature = sorted.concat(['Q1', 'Q2', 'Q3', 'IQR'].map((k) => rstr(truth[k])).filter(Boolean));
        /* the raw list, unordered, as printed, is exempt - only the SORTED
           order and the cuts are the secret */
      }
      /* the raw tray tiles carry the given values, unordered; they are not
         part of the signature at all (they are what she is handed) */
      root.querySelectorAll('[data-tray^="qlist-tiles-"]').forEach((t) => exemptRoots.push(t));
    } else if (kind === 'cftable') {
      const truth = GS.cumulate(packQ.classes || []);
      signature = (truth || []).map(String);
      root.querySelectorAll('.stat-table').forEach((t) => exemptRoots.push(t));   /* the printed frequencies */
    } else if (kind === 'cfplot') {
      const want = GS.expectedPoints ? GS.expectedPoints(packQ, rulesOf()) : [];
      /* the signature is the PAIRING of a boundary with its total - both
         numbers alone are given (the class table prints them both); it is
         only the two together, as a point, that is the secret, so the
         search string is the pair joined as the board's own read-out would
         show it */
      signature = (want || []).map((p) => rstr(p[0]) + ',' + rstr(p[1]));
      root.querySelectorAll('.stat-given').forEach((t) => exemptRoots.push(t));   /* the class table, both columns */
    } else if (kind === 'cfread') {
      const rules = rulesOf();
      const heights = GS.readHeights ? GS.readHeights(Number(packQ.n) || 0, rules.curveRule) : {};
      const asks = (packQ.ask || []).filter((a) => typeof a === 'string' && a !== 'IQR');
      asks.forEach((a) => {
        const h = heights[a === 'median' ? 'median' : a];
        const x = h && GS.curveX ? GS.curveX(packQ.curve, h) : null;
        if (x) signature.push(rstr(x));
      });
      /* n and the drawn curve are given; the axis numbers at majors are the
         chart furniture, not the answer */
    } else if (kind === 'boxplot') {
      let truth = packQ.given || null;
      if (!truth && packQ.from === 'qlist') {
        const f = GS.fiveNumber ? GS.fiveNumber(packQ.values || [], rulesOf().quartileRule || 'n+1') : null;
        truth = f ? { min: f.min, Q1: f.Q1, Q2: f.Q2, Q3: f.Q3, max: f.max } : null;
      }
      if (!packQ.given && truth) {
        /* only a DERIVED five-number summary is a secret - a "given" one is
           printed on the paper and is exempt outright */
        signature = ['min', 'Q1', 'Q2', 'Q3', 'max'].map((k) => rstr(truth[k])).filter(Boolean);
      }
    } else if (kind === 'compare') {
      /* both summaries are given (printed on the two plots); the secret is
         which WORD she must pick - context, size, consistency - which is
         author text, not a derivable number, so nothing is checked here
         beyond the two summaries staying exempt */
      root.querySelectorAll('.stat-board, .stat-plot-label').forEach((t) => exemptRoots.push(t));
    } else if (kind === 'judge') {
      (packQ.claims || []).forEach((c) => {
        if (c.options) signature.push(String(c.verdict));
        else if (c.fair === false) signature.push(String(c.why || ''));
      });
      root.querySelectorAll('.stat-claim-text').forEach((t) => exemptRoots.push(t));   /* the scenario and the claims */
    } else if (kind === 'values') {
      signature = (packQ.slots || []).map((s) => rstr(s.answer)).filter(Boolean);
    }
  } catch (e) { return { ok: false, why: 'could not derive the signature for ' + qid + ': ' + (e && e.message) }; }

  signature = signature.filter((s) => s && String(s).trim() && String(s).trim() !== '0');
  if (!signature.length) return { ok: true, why: null };

  const inExempt = (node) => exemptRoots.some((ex) => ex === node || ex.contains(node));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = walker.nextNode())) {
    if (inExempt(n.parentNode)) continue;
    const t = (n.textContent || '').trim();
    if (!t) continue;
    for (const s of signature) {
      if (t.indexOf(s) > -1) return { ok: false, why: 'an answer value is on the page before Check: "' + s + '" (in "' + t.slice(0, 60) + '")' };
    }
  }
  const all = root.querySelectorAll('*');
  for (const el of all) {
    if (inExempt(el)) continue;
    for (const attr of el.attributes || []) {
      if (/^(class|id|style|data-tray|data-tray-item|data-placed|aria-pressed|data-state|data-stage|data-stages|data-qid|data-kind|data-book|data-section|data-work|data-mark|role|type)$/.test(attr.name)) continue;
      for (const s of signature) {
        if (String(attr.value).indexOf(s) > -1) return { ok: false, why: 'an answer value is on the page before Check: "' + s + '" (in ' + el.tagName.toLowerCase() + '[' + attr.name + ']' + ')' };
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

module.exports = { PERSISTS, SIGNATURE, STAGE_SETTLE };
