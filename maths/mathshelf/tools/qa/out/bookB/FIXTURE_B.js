/* FIXTURE_B.js — DRAFT plants for tools/qa/fixtures/plants.js, Book B (`table`
   kind), 13 Sept 2026, LINT-B package. I do NOT edit plants.js myself — WALK-B
   folds these in, in the same style as the existing `stats-a-*` entries (see
   plants.js around "BOOK A CONTROLS"), and decides the exact owning gate +
   `mustFail` regex for each (plants.js "only ever plants the fault, never the
   assertion" — a control lives in the gate that owns the law). Every anchor
   string below was copied verbatim from the LANDED code (jotter-stats.js's
   `BUILD.table`/`BUILD.judge`, statcore.js's `markTable`) as it stood at the
   time of this package's pass — re-check before folding in, in case another
   package has since touched the same lines. None of these four plants were
   run through the actual gates myself (that is WALK-B's package, not mine);
   each comment names the LAW it demonstrates breaking and the gate most
   likely to own it, for WALK-B to confirm/adjust. */
(function () {
  'use strict';
  /* Reuse elsewhere in plants.js: */
  // const BOOK_B = { MS_BOOK: 'stats-averages' };  -- WALK-B: add this constant
  //   next to BOOK_A/BOOK_C if it doesn't already exist by the time this folds in.

  var FIXTURE_B_PLANTS = {

    /* ── a wrong f×x cell marked right because the consistency check is
       patched to always pass ────────────────────────────────────────────
       statcore.js's markTable (§17.2/CONTRACT_B): a derived cell earns ok:1
       only when it equals the TRUE value, ok:2 only when it is consistent
       with the pupil's OWN earlier inputs in that row (never simply "any
       non-blank value"). This plant collapses BOTH checks so any non-blank
       cell marks ok:1 regardless of correctness or consistency — the exact
       "ok:2 consistency wrongly passing a wrong fx" fault named in the
       brief. mustFail: the mutated-engine class of control (qa-selftests'
       existing `mutated-engine` control already exists for this SHAPE of
       fault on other kinds — WALK-B: confirm whether a table-specific
       control is wanted instead, e.g. under a coverage/judge gate that
       proves every kind's model board still marks OK and every corrupted
       board is still caught, per dev/validate-all.js's own (A)/(B) proof —
       a plant here should make THAT proof fail for any 'table' question,
       which is the more precise assertion than a generic string match). */
    'stats-b-cell-inconsistent': (dir) => {
      edit(dir, 'statcore.js',
        "        if (t && eqR(m, t)) { per.push(row(u, 1, null, null)); continue; }\n        var ftv = cellFt(q, D, c, i, theirs, f);\n        if (ftv && eqR(m, ftv) && !(t && eqR(ftv, t))) { per.push(row(u, 2, null, 'from your own earlier answer')); continue; }\n        per.push(row(u, 0, cellDx(q, D, c, i, m), null));",
        "        per.push(row(u, 1, null, null)); continue;   /* planted: any non-blank cell marks right, right or wrong (Book B) */\n        var ftv = cellFt(q, D, c, i, theirs, f);\n        if (ftv && eqR(m, ftv) && !(t && eqR(ftv, t))) { per.push(row(u, 2, null, 'from your own earlier answer')); continue; }\n        per.push(row(u, 0, cellDx(q, D, c, i, m), null));");
      return { env: { MS_BOOK: 'stats-averages' } };
    },

    /* ── two table row-pick buttons both aria-pressed at once ────────────
       jotter-stats.js's BUILD.table renderAsks(): each row button's pressed
       state is `ans[a.id] === ri` — comparing against the SPECIFIC row this
       button is, so only the one chosen row can ever read true. This plant
       loosens the comparison to "any row chosen at all" (`ans[a.id] != null`),
       so once ANY row is picked for an ask, EVERY row in that ask's group
       reads aria-pressed="true" simultaneously — a rule-138-class violation
       (the pressed state must name ONE choice, never several). mustFail:
       qa-click-safety or sit-pupil's own aria-pressed consistency check
       (WALK-B: confirm which gate already asserts "at most one pressed" for
       a button group of this shape, or add one). */
    'stats-b-rowpick-two-pressed': (dir) => {
      edit(dir, 'jotter-stats.js',
        "            b.setAttribute('aria-pressed', ans[a.id] === ri ? 'true' : 'false');",
        "            b.setAttribute('aria-pressed', ans[a.id] != null ? 'true' : 'false');   /* planted: every row in the group reads pressed once any one is chosen (Book B) */");
      return { env: { MS_BOOK: 'stats-averages' } };
    },

    /* ── the Totals row treated as optional: the stage machine moves on to
       "asking"/"ready" while a total is still blank ─────────────────────
       jotter-stats.js's BUILD.table: `tableBoxes` is `route.filter(kind !==
       'ask')` — every CELL and every TOTAL box, together, is what `stage()`
       compares `filled` against before calling the table "filling" vs done.
       This plant narrows `tableBoxes` to cells only, so once every derived
       cell is filled the stage reports "asking"/"ready" even though a total
       box is still empty — she is told she is done (or moved to the
       questions under the table) before the total she has not filled in,
       a stages-truth violation (feedback_stages_and_instructions: "show the
       stages + which one she is on" — this makes the shown stage FALSE).
       mustFail: qa-human-pace / a stage-truth control (WALK-B: confirm the
       exact owning gate and craft a plant → mustFail pair; this entry names
       the law and the one-line cause, not the assertion). */
    'stats-b-total-before-cells': (dir) => {
      edit(dir, 'jotter-stats.js',
        "    var tableBoxes = route.filter(function (r) { return r.kind !== 'ask'; });",
        "    var tableBoxes = route.filter(function (r) { return r.kind === 'cell'; });   /* planted: totals excluded from the fill-gate, so the stage moves on before every total is filled (Book B) */");
      return { env: { MS_BOOK: 'stats-averages' } };
    },

    /* ── a TFN verdict word visible before Check ─────────────────────────
       jotter-stats.js's BUILD.judge render(): each claim card currently
       shows only `c.text` and the (unpressed) True/False/NEI chips. This
       plant appends the AUTHORED verdict itself into every card at every
       render (i.e. from first mount, not only after Check) — the exact
       "a verdict word on the page before Check" answer-signature leak the
       brief names, in the same family as Book A's `stats-a-signature-leak`
       (order's answer-order placeholder) and Book C's `stats-signature-leak`.
       mustFail (sit-pupil, the answer-signature law): "an answer value is on
       the page before Check". */
    'stats-b-tfn-leak': (dir) => {
      edit(dir, 'jotter-stats.js',
        "        var card = el('div', 'stat-claim');\n        card.appendChild(el('p', 'stat-claim-text', esc(c.text)));",
        "        var card = el('div', 'stat-claim');\n        card.appendChild(el('p', 'stat-claim-text', esc(c.text)));\n        if (c.options) card.appendChild(el('p', 'stat-verdict-leak', esc(c.verdict)));   /* planted: the true verdict word sits on the page from first mount (Book B) */");
      return { env: { MS_BOOK: 'stats-averages' } };
    }
  };

  if (typeof module !== 'undefined') module.exports = FIXTURE_B_PLANTS;
})();
