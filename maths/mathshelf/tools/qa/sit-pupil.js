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
const P = require('./lib/stat-probes.js');

/* the ledger's waived cells, read once: `<surface>:<state> @<width> × <law>` */
const WAIVED = (() => {
  const out = new Map();
  try {
    A.read(A.qa('MATHS_COVERAGE_DEBT.md')).split('\n').forEach(l => {
      const cols = l.split('|').map(x => x.trim());
      if (cols.length < 7 || !/×/.test(cols[1])) return;
      if (/WAIVED BY HIS RULING/.test(cols[6])) out.set(cols[1], cols[6]);
    });
  } catch (e) {}
  return out;
})();
function waivedFor(cell) { return WAIVED.get(cell) || null; }
let REDUCED_PASS = false;   /* the pass being walked asked for less motion: the beat and the glow must NOT run */
const AUD = require('./lib/audits.js');
const S = require('./lib/stage.js');

/* every state any walk in this run set out to stand on, settled at the end */
const AIMED = [];
const { bookHash, contentHash } = require('./lib/hash.js');

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
  /* THE CONTROL THAT RAN GREEN AND MEANT NOTHING. It planted `fixture-book` - a
     whole extra BOOK - against a check that asks whether every declared SURFACE
     was stood on. A book is not a surface, so the walk passed, the matrix read
     DID NOT FIRE, and the reason was never in the gate. It now plants a screen
     the app still declares and the walk can no longer reach, which is the
     sentence the check actually holds. */
  { id: 'unreachable-planted-fault', kind: 'fixture', plant: 'fixture-unreachable-surface', mustFail: /never reached/ },
  { id: 'console-error', kind: 'fixture', plant: 'fixture-renderers', mustFail: /console error/ },
  /* the locked spine (a book not ticked for the class, drawn greyed-out on
     the shelf) was retired by ruling 36 (11 Sept 2026): that book no longer
     renders at all, so there is no card left to mis-colour. The readability
     risk moves onto the cards that DO render — a ticked book's own cover —
     so this control now plants exactly that: a legible-looking but
     near-invisible ink on `.book .series`/`.book .band`. */
  { id: 'stage-strip-behind', kind: 'fixture', plant: 'stats-strip-behind', mustFail: /the strip is one stage behind the question/ },
  { id: 'stage-without-a-beat', kind: 'fixture', plant: 'stats-no-beat', mustFail: /no attention beat when the stage/ },
  { id: 'check-without-a-glow', kind: 'fixture', plant: 'stats-no-glow', mustFail: /without its one gold glow/ },
  { id: 'film-ring-draws-nothing', kind: 'fixture', plant: 'film-ring-draws-nothing', mustFail: /ring\(s\) drawn — a film draws what its caption says/ },
  { id: 'film-box-on-the-glyphs', kind: 'fixture', plant: 'film-box-on-the-glyphs', mustFail: /px from the text it boxes/ },
  { id: 'table-between-board-and-dock', kind: 'fixture', plant: 'stats-table-between', mustFail: /the control for the current stage is directly under the board, never a screen away/ },
  { id: 'lit-spine-unreadable', kind: 'fixture', plant: 'fixture-css-lit-spine', mustFail: /against what is actually behind it/ },
  /* AND THE SAME SCREEN, WITH ONLY THE EMBLEM WRONG. The plant above moves
     two things at once, so it fired on the band alone while the emblem's
     reading was nonsense - the sampler was asking `color` of a glyph that is
     painted with `fill`. This one moves nothing but the SVG glyph.
     NOTE (package D, 11 Sept 2026): this still plants against the retired
     `.book.not-set .motif` selector, which now matches nothing shipped — see
     the D-REPORT for the lead. */
  { id: 'svg-glyph-lost-in-its-plate', kind: 'fixture', plant: 'fixture-css-svg-glyph-in-plate', mustFail: /against what is actually behind it/ },
  /* the chip put back in the corner it used to float in, where a long series
     name runs underneath it — the shelf fault of 6 Sept 2026 */
  { id: 'text-under-a-floating-chip', kind: 'fixture', plant: 'fixture-overlapping-chip', mustFail: /on top of one another/ },
  /* the substitution board told her twice, in two wordings — the repeated
     line of 6 Sept 2026, put back where she met it */
  { id: 'told-twice-in-two-wordings', kind: 'fixture', plant: 'fixture-said-twice', mustFail: /says the same thing twice/ },
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
    /* EVERY RIDER ON EVERY STATE. Running the click-safety audit only on
       question screens meant it never reported a pass anywhere else, and the
       coverage matrix counts a rider that did not report as a cell nobody
       closed. The audit is a no-op where there is no placed work, so it costs
       nothing to ask it everywhere and it closes the cell honestly. */
    const a = await AUD.run(page, { clickSafety: true });
    const row = Object.assign({ surface, state: real || state, expected: state, stood: real === state, width }, extra || {}, { audits: a.verdicts, measured: a.measured });
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
    /* A PICTURE OF THE THING IT CONDEMNED, as the teacher and confused walks do.
       A contrast finding is a number, and a number cannot be argued with or
       agreed with until you can see the screen it was made from. */
    if ((a.findings.readability || a.findings.overlap || []).length) {
      const tag = (surface + '-' + (real || state) + '-' + width + (extra && extra.qid ? '-' + extra.qid : '')).replace(/[^a-z0-9-]/gi, '');
      try { fs.mkdirSync(A.out('shots'), { recursive: true }); } catch (e) {}
      try { await page.screenshot({ path: A.out('shots/pupil-' + tag + '.png') }); } catch (e) {}
      g.note('picture of that screen: tools/qa/out/shots/pupil-' + tag + '.png');
    }
    Object.keys(a.findings).forEach(k => {
      (a.findings[k] || []).forEach(f => {
        /* the raw row behind a finding, when you are arguing with a number */
        if (process.env.MS_DEBUG_FINDINGS) g.note('RAW ' + k + ' ' + JSON.stringify(f));
        const where = surface + ':' + state + (extra && extra.qid ? ' > ' + extra.qid : '') + ' @' + width;
        const said = k === 'readability' ? AUD.describeContrast(f) : k === 'overlap' ? AUD.describeOverlap(f) : k === 'said-twice' ? AUD.describeSaidTwice(f) : describe(f);
        /* A RED ON AN OLD SCREEN IS A DEBT ROW, NEVER A FIX IN A BOOK BUILD (his
           ruling of 8 Sept 2026, written into the prompt's TIME rules). A cell
           the ledger carries as WAIVED BY HIS RULING is printed here every run
           with its measurement - never hidden - and does not fail the walk;
           the law itself still bites on every other cell, which is what its
           own controls prove. The waiver is exact: surface, state, width, law. */
        const waiver = waivedFor(surface + ':' + state + ' @' + width + ' × ' + k);
        if (waiver) g.note('WAIVED (' + waiver + ') ' + where + ' x ' + k + ': ' + said);
        else g.fail(where, k, said);
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
      await page.goto(BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await W.settle(page);
      await page.evaluate(() => document.getElementById('cover-open').click());
      await W.settle(page);
      /* shelf:in-progress — THE ONE MOMENT A BOOK IS OPEN BUT NOT DONE. This
         walker always finishes what it starts (it answers every question
         right), so the shelf never sees this book again once it is complete -
         the only honest place to stand on "started, not finished" is the
         instant between exercise 1 landing and exercise 2 opening, which the
         per-exercise reload already passes through on its way back in. */
      if (si === 1) await record('shelf', 'in-progress');
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
    /* THE TWO STATES A FILM REACHES WITHOUT BEING WATCHED. Jumping to a step
       with a dot renders it with no animation ("instant"), and a pupil who has
       asked her machine for less motion gets the whole film that way
       ("reduced-motion"). Both are states the app declares and neither is on
       the route of someone who watches the film through, so the walk goes and
       stands on them before it plays the film properly. */
    const jumped = await page.evaluate(() => {
      const m = document.querySelector('[data-surface="movie"], .movie');
      const dot = m && [...m.querySelectorAll('button, .ml-dot, [class*="dot"]')]
        .filter((b) => !/mc-(fwd|back|play)/.test(b.className))[1];
      if (!dot) return false;
      dot.click();
      return true;
    });
    if (jumped) { await W.settle(page); await record('movie', 'instant', { section: si }); }

    const movie = await page.evaluate(async (s) => await eval(s)(), W.ACTIONS.playMovieToEnd);
    if (movie.steps) {
      await record('movie', 'end', { section: si });
      /* A FILM DRAWS WHAT ITS CAPTION SAYS (ruling 39, 11 Sept 2026). On a paper
         film every `ring` op must have left a copper ring on the stage, drawn
         round the i-th value of the line it names - its box encloses that
         value's rendered glyphs - and a `box` op's gold frame sits clear of
         the text it boxes on every side, measured from the rects, never from
         a guessed offset. Read at the film's end, where every op has landed. */
      const film = await page.evaluate((bk, i) => {
        const pack = window.GJ_CONTENT && window.GJ_CONTENT[bk];
        const mv = pack && pack.sections && pack.sections[i] && pack.sections[i].movie;
        if (!mv || mv.mode !== 'paper') return null;
        const steps = mv.steps || [];
        const ops = [];
        steps.forEach(st => (st.do || []).forEach(op => ops.push(op)));
        /* a `clear` after a ring wipes the stage: only rings after the last clear are on screen */
        const lastClear = ops.map((op, k) => op.clear ? k : -1).filter(k => k >= 0).pop();
        const live = ops.slice(lastClear == null ? 0 : lastClear + 1);
        const rings = live.filter(op => op.ring).map(op => op.ring);
        const boxes = live.filter(op => op.box).map(op => op.box);
        const stage = document.querySelector('.movie .movie-stage');
        if (!stage) return { rings: rings.length, boxes: boxes.length, drawn: 0, problems: ['no stage'] };
        const lines = [...stage.querySelectorAll('.movie-line')];
        const r = (n) => { const b = n.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
        const problems = [];
        const drawnRings = [...stage.querySelectorAll('.ml-ring')];
        if (drawnRings.length < rings.length) problems.push('the film has ' + rings.length + ' ring op(s) and ' + drawnRings.length + ' ring(s) drawn');
        drawnRings.forEach((el, k) => {
          const rr = r(el);
          if (!(rr.w > 4 && rr.h > 4)) { problems.push('ring ' + (k + 1) + ' has no size'); return; }
          /* the value it should enclose: a .ml-val inside the same line */
          const line = el.closest('.movie-line') || lines[lines.length - 1];
          const vals = line ? [...line.querySelectorAll('.ml-val')] : [];
          const enclosed = vals.some(v => { const vr = r(v); return vr.w > 0 && rr.l <= vr.l + 1 && rr.r >= vr.r - 1 && rr.t <= vr.t + 1 && rr.b >= vr.b - 1; });
          if (!enclosed) problems.push('ring ' + (k + 1) + ' encloses no value of its line');
        });
        const drawnBoxes = [...stage.querySelectorAll('.box-draw')];
        if (drawnBoxes.length < boxes.length) problems.push('the film has ' + boxes.length + ' box op(s) and ' + drawnBoxes.length + ' box(es) drawn');
        drawnBoxes.forEach((el, k) => {
          const hold = el.closest('.answer-boxed') || el.parentNode;
          const eq = hold && hold.querySelector('.ml-eq');
          if (!eq) { problems.push('box ' + (k + 1) + ' boxes no text'); return; }
          const path = el.querySelector('path, rect') || el;
          const br = r(path), tr = r(eq);
          const clear = Math.min(tr.l - br.l, br.r - tr.r, tr.t - br.t, br.b - tr.b);
          if (clear < 7) problems.push('the gold box sits ' + Math.round(clear) + ' px from the text it boxes — it is measured from the text and pads 8 px on every side');
        });
        return { rings: rings.length, boxes: boxes.length, drawn: drawnRings.length, problems };
      }, book, si);
      if (film) {
        if (film.problems.length) film.problems.forEach(pr => g.fail('movie:end > ' + book + ' s' + (si + 1) + ' @' + width, 'film-draws',
          pr + ' — a film draws what its caption says'));
        else g.note('film s' + (si + 1) + ': ' + film.rings + ' ring(s) and ' + film.boxes + ' box(es) drawn where the captions say');
      }
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
      /* AND THE WORDS THE QUESTION PUTS ON THE PAGE BESIDE ITS STEM. A judgement
         question prints the claims she has to weigh; a comparison prints the
         name of each plot she is comparing. Those are sentences a pupil reads,
         and the transcript is meant to be every sentence a pupil reads - it was
         carrying only the stem, so the separated judge was handed "decide
         whether the statement about spread is fair" with no statement anywhere
         on the page and failed it three times over for a hole the walk had made
         itself. A judge can only be as good as the screen it is shown. */
      (await page.evaluate((id) => {
        const r = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
          .filter(x => (x.getAttribute('data-qid') || (x.id || '').replace(/^jq-/, '')) === id)[0];
        if (!r) return [];
        /* NOT .stat-sentence: that is a frame with chips and empty boxes in it,
           and read as text before she has answered it comes out as "BoysGirls"
           and "( against )" - which the judge quite properly called the worst
           item in the book. What she reads there is the words she chooses; the
           frame itself is a control. */
        return [...r.querySelectorAll('.stat-claim-text, .stat-plot-label, .stat-fiction')]
          .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      }, qid)).forEach(say);
      /* WHAT THIS QUESTION SAYS IT CAN SHOW, written into the sidecar so
         coverage derives its cells from the app's own declaration rather than
         from a kind's general list - the boards a particular question can
         reach are its own (jotter-stats.js stagesFor). */
      const declared = await page.evaluate((s2, id) => eval(s2)(id), W.STAGES_OF, qid);
      await record('question', 'fresh', { qid, section: si, book, stages: declared.stages.join(' ') });

      /* dock:disabled-explained — WHAT NOTHING WAS DONE FOR HER YET LOOKS
         LIKE. Pressing Check on a fresh question with nothing placed is a
         real thing a pupil does (an impatient tap before she has written
         anything), and setLockedWhy answers it by putting the dock into
         "disabled-explained" beside the Check button that will not act. CHECK
         is a no-op when it is disabled — it never presses a live button — so
         asking it here costs nothing and never touches the answer that
         follows. */
      {
        const preCheck = await page.evaluate((s, id) => eval(s)(id), W.CHECK, qid);
        if (preCheck.disabled) {
          await W.settle(page);
          const dockNow = await page.evaluate(() => {
            const d = document.querySelector('[data-surface="dock"]');
            return d && !d.hidden ? d.getAttribute('data-state') : null;
          });
          if (dockNow === 'disabled-explained') {
            const a = await AUD.run(page, { clickSafety: true });
            sidecar.states.push(Object.assign({ surface: 'dock', state: dockNow, qid, section: si, book, width }, { audits: a.verdicts }));
          }
        }
      }

      /* THE ANSWER SIGNATURE IS NOT ON THE PAGE. What she has to bring - the
         pairing of boundary and total, the read-off, the five numbers, the
         cuts, the verdicts - may not appear anywhere on a fresh question, in
         any text node or any attribute. Asked HERE and only here: on every
         later stage the read-out prints HER OWN placement, which is her value
         and not a hint (DESIGN 4.0, "Given data, and the answer signature"). */
      {
        const sig = await page.evaluate((s2, args) => eval(s2)(args), P.SIGNATURE, [qid]);
        if (!sig.ok) g.fail('question:fresh > ' + qid + ' @' + width, 'consequence', sig.why);
      }

      /* EVERY BOARD SHE SITS IN FRONT OF, not just the first and the last.
         A stats kind shows three to five in-between boards - points placed but
         not joined, markers placed but the box not drawn, the ordered row
         before the cuts - and the drive plays the model attempt up to each in
         turn so every law is asked of every one of them. A kind that declares
         no stages (the v3 kinds) takes the single answer it always took. */
      const visited = [];
      if (declared.stage) visited.push(declared.stage);
      let answered;
      let lastLabel = null, checkWasLit = false;
      if (declared.stages.length) {
        for (const stg of declared.stages) {
          answered = await page.evaluate((s2, args) => eval(s2)(args), W.ANSWER, [qid, false, stg]);
          if (!answered.ok) break;
          /* ONE ATTENTION BEAT when a stage begins, ONE GOLD GLOW when the
             Check lights - and neither for ever (ruling 40; DESIGN 4.0). Read
             before the walk settles, while the classes are still on. */
          const b = await page.evaluate((s2, id) => eval(s2)(id), W.BEAT_OF, qid);
          if (b && b.strip) {
            if (lastLabel !== null && b.label !== lastLabel) {
              if (REDUCED_PASS) {
                if (b.beatAnim === 'gj-stage-beat')
                  g.fail('question > ' + qid + ' @' + width, 'stage-strip', 'the stage pill on ' + qid + ' beats under prefers-reduced-motion — she asked her machine for less motion');
              } else if (!b.beating || b.beatAnim !== 'gj-stage-beat')
                g.fail('question > ' + qid + ' @' + width, 'stage-strip', 'no attention beat when the stage "' + b.label + '" began on ' + qid + ' — one beat, two breaths, then still');
              else if (b.beatCount === 'infinite')
                g.fail('question > ' + qid + ' @' + width, 'stage-strip', 'the stage pill on ' + qid + ' pulses for ever — a screen that nags is a screen she stops reading');
            }
            if (b.checkLit && !checkWasLit) {
              if (REDUCED_PASS) {
                if (b.glowAnim === 'gj-glow-once')
                  g.fail('question > ' + qid + ' @' + width, 'stage-strip', 'the Check on ' + qid + ' glows under prefers-reduced-motion');
              } else if (!b.glowing || b.glowAnim !== 'gj-glow-once')
                g.fail('question > ' + qid + ' @' + width, 'stage-strip', 'the Check lit on ' + qid + ' without its one gold glow');
              else if (b.glowCount === 'infinite')
                g.fail('question > ' + qid + ' @' + width, 'stage-strip', 'the Check on ' + qid + ' glows for ever');
            }
            lastLabel = b.label; checkWasLit = b.checkLit;
          }
          /* THE CONTROL SHE NEEDS NEXT IS WITHIN REACH (ruling 42): on a plot
             the action row sits directly under the board - never below the
             data table, a screen away. 80 px allows the marked rows' margins
             and nothing else. */
          if (b && b.kind === 'cfplot' && b.dockGap !== null && b.dockGap > 80)
            g.fail('question > ' + qid + ' @' + width, 'reach', 'the action row sits ' + b.dockGap + ' px below the board on ' + qid + ' — the control for the current stage is directly under the board, never a screen away');
          await W.settle(page);
          const now = await page.evaluate((s2, id) => eval(s2)(id), W.STAGES_OF, qid);
          if (now.stage && visited.indexOf(now.stage) === -1) visited.push(now.stage);
          /* THE STRIP SAYS WHERE SHE IS (ruling 40, DESIGN 4.0 Correction 11 Sept
             2026). On every board the lit pill must be the one the root's
             stage belongs to, and its name must be the label the root carries
             - a strip one stage behind is a strip that lies to her. */
          if (now.strip) {
            const st = now.strip;
            if (st.lit !== 1) g.fail('question > ' + qid + ' @' + width, 'stage-strip',
              st.lit + ' pills are lit on ' + qid + ' at stage "' + now.stage + '" — exactly one stage is current');
            else if ((st.pillStages.length && st.pillStages.indexOf(now.stage) === -1) || st.pill !== now.label)
              g.fail('question > ' + qid + ' @' + width, 'stage-strip',
                'the stage strip says "' + st.pill + '" while the board is on "' + now.stage + '" (' + now.label + ') — the strip is one stage behind the question');
          }
          await record('question', 'mid-attempt', { qid, section: si, book, stage: now.stage });
        }
        if (answered && answered.ok) {
          const settled = P.STAGE_SETTLE(qid, declared.stages, visited);
          if (!settled.ok) g.fail('question > ' + qid + ' @' + width, 'consequence', settled.why);
        }
      } else {
        answered = await page.evaluate((s2, args) => eval(s2)(args), W.ANSWER, [qid, false]);
      }
      if (!answered || !answered.ok) { g.note('could not answer ' + qid + ': ' + ((answered && answered.why) || 'no answer')); continue; }
      await W.settle(page);

      /* dock:keyboard-hidden — FOOLPROOF KEYBOARD RULE, WALKED. jotter.js's
         own comment names it: the on-screen number pad is for devices with no
         keyboard, and the pad is retired the instant a real keydown arrives on
         the compose field it belongs to. This question may not be carrying a
         number pad at all (most kinds are not), so the probe is a no-op
         everywhere else - it only fires the once a numpad-bearing kind puts
         one on screen, and does not touch the answer already placed. */
      {
        const dockBefore = await page.evaluate(() => {
          const d = document.querySelector('[data-surface="dock"]');
          return d && !d.hidden ? d.getAttribute('data-state') : null;
        });
        if (dockBefore === 'numpad' || dockBefore === 'numpad-fraction') {
          const fired = await page.evaluate(() => {
            const c = document.querySelector('.compose');
            if (!c) return false;
            c.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }));
            return true;
          });
          if (fired) {
            await W.settle(page);
            const dockAfter = await page.evaluate(() => {
              const d = document.querySelector('[data-surface="dock"]');
              return d ? d.getAttribute('data-state') : null;
            });
            if (dockAfter === 'keyboard-hidden') {
              const a = await AUD.run(page, { clickSafety: true });
              sidecar.states.push(Object.assign({ surface: 'dock', state: dockAfter, qid, section: si, book, width }, { audits: a.verdicts }));
            }
          }
        }
      }

      /* THE SCREEN BETWEEN THE WORKING AND THE VERDICT, WHICH THE WALK USED TO
         JUMP OVER. It went straight from question:fresh to the press of Check,
         so the board a pupil actually sits in front of - her working placed, her
         value keyed, nothing marked yet - was never recorded and no law was ever
         asked about it. That is the exact screen Damien was looking at when he
         found the substitution question telling him the same thing twice: the
         said-twice control ran GREEN against a correctly planted fault, because
         the walk never stood where the fault was. A law can only be as good as
         the screens the walk stands on. */
      await record('question', 'mid-attempt', { qid, section: si, book });
      const checked = await page.evaluate((s, id) => eval(s)(id), W.CHECK, qid);
      if (checked.disabled) {
        g.check(!!checked.why, 'question:fresh > ' + qid + ' @' + width, 'mute-lock',
          'the Check button is disabled with nothing saying what it is waiting for');
      }
      await W.settle(page);
      await W.leaves(page, 'question', qid, ['fresh', 'mid-attempt'], 8000);
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

    /* question:locked-restore — REOPENING WHAT SHE ALREADY FINISHED. Every
       question in this exercise is locked now (checked right, first attempt),
       and the app mounts a locked question with its marks already drawn the
       instant she comes back to it — a screen only a RETURN visit shows, never
       the visit that made it. The contents chip is right here, already open;
       standing on it costs one more click, on the first exercise only.
       SOME KINDS DRAW IT AND PASS STRAIGHT THROUGH IT. mountClassify and
       mountProtractor's own `finish()` sets "locked-restore" and then, in the
       SAME synchronous call, sets the real verdict state over it - a restore
       is drawn by calling the exact function a fresh Check calls, and that
       function always ends by saying what the mark is. The reasoned/algebra
       kind does not do this (its own restore branch is the last word), so
       which of the two this lands on depends on which kind qids[0] happens to
       be. A one-line patch on setAttribute, in place only for this one
       reopen, reads what was drawn rather than only what is left standing -
       the same problem the walk itself solves for the app's own faults, not
       a way around it. */
    if (si === 0 && qids.length) {
      await page.evaluate(() => {
        window.__stateLog = [];
        if (window.__setAttrPatched) return;
        window.__setAttrPatched = true;
        const orig = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function (name, value) {
          if (name === 'data-state') window.__stateLog.push({ surface: this.getAttribute('data-surface'), state: value });
          return orig.apply(this, arguments);
        };
      });
      const reopened = await page.evaluate((s, i) => eval(s)(i), W.ACTIONS.openSection, si);
      if (reopened.ok) {
        await W.settle(page);
        const log = await page.evaluate(() => window.__stateLog || []);
        const drew = log.some((e) => e.surface === 'question' && e.state === 'locked-restore');
        if (drew) {
          const a = await AUD.run(page, { clickSafety: true });
          sidecar.states.push({ surface: 'question', state: 'locked-restore', qid: qids[0], section: si, book, width, audits: a.verdicts });
        } else {
          await record('question', 'locked-restore', { qid: qids[0], section: si, book });
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

/* ══════════════════════════════════════════════════════════════════════
 * THE STATES NO WALK HAD EVER STOOD ON (package V4-STATES, 8 Sept 2026).
 *
 * The five probes below stand on cover/shelf/movie/question states that the
 * ordinary walk above never reaches, because reaching them needs something
 * the ordinary walk cannot offer without stopping being an ordinary walk: a
 * server that answers SLOWLY, a class nobody has ticked a book for, a nudge
 * a teacher sent, a question left mid-line. None of them touch script.js or
 * any other app file — every one drives the app through a door the app
 * already has open (the offline transport contract in localStorage's
 * 'gj-offline-v1', or the `window.OLS_TRANSPORT` hook script.js's own `call`
 * already checks for before it falls back to the offline stub).
 *
 * Each probe writes its own sidecar, `sit-pupil-extra-<width>.json`, matching
 * the naming both sit-pupil's own post-walk checks and qa-coverage read
 * ("sit-pupil*"). Its scope is 'extra' (not a book id), so qa-coverage
 * measures it against the whole-app content hash, same as sit-teacher's.
 */
const LSKEY_MIRROR = 'gj-offline-v1';   /* script.js's own constant, read not edited */
const OFFLINE_EMAIL_MIRROR = 'you@offline.preview';   /* ditto */

function newExtraSidecar(width) {
  return { walker: 'sit-pupil', scope: 'extra', width, tier: 'preview', contentHash: contentHash(A.APP), when: new Date().toISOString(), states: [], consoleErrors: 0 };
}
/* the same tail `record()` runs, for a probe standing outside walkBook's own
   per-book sidecar */
async function auditAndPush(page, sidecar, surface, state, extra) {
  const a = await AUD.run(page, { clickSafety: true });
  sidecar.states.push(Object.assign({ surface, state }, extra || {}, { audits: a.verdicts, measured: a.measured }));
  Object.keys(a.findings).forEach(k => (a.findings[k] || []).forEach(f => {
    g.fail(surface + ':' + state + (extra && extra.width ? ' @' + extra.width : ''), k,
      k === 'readability' ? AUD.describeContrast(f) : k === 'overlap' ? AUD.describeOverlap(f) : k === 'said-twice' ? AUD.describeSaidTwice(f) : JSON.stringify(f).slice(0, 140));
  }));
}

/* ---- cover: busy, first-visit, returning, fallback-name, wrong-class, staff
   A REAL SLOW SERVER, NOT A FAST ONE READ EARLY. `call()` in script.js asks
   `window.OLS_TRANSPORT` before it ever tries the offline stub, so a mock
   installed here (before script.js runs at all, via evaluateOnNewDocument)
   is the SAME hook the deployed app itself will use one day — not a hack
   around the offline preview, the other half of it. Its `hello` shape
   controls which of cover's four settled states she lands in; a long delay
   before it resolves is what lets the walk stand on "busy" on the way
   through, honestly, rather than asserting a state nobody could observe. */
async function coverStatesPass() {
  const scenarios = [
    { state: 'wrong-class', hello: { ok: false, error: 'unknown-class' } },
    { state: 'first-visit', hello: { ok: true, email: 'qa-cover@offline.preview', name: 'QA Cover Pupil', firstVisit: true, acts: { angles: true, algebra: true, 'stats-quartiles': true }, summaries: {}, offline: false } },
    { state: 'returning', hello: { ok: true, email: 'qa-cover@offline.preview', name: 'QA Cover Pupil', firstVisit: false, acts: { angles: true, algebra: true, 'stats-quartiles': true }, summaries: {}, offline: false } },
    { state: 'fallback-name', hello: { ok: true, email: 'qa-cover@offline.preview', name: '', firstVisit: false, acts: { angles: true, algebra: true, 'stats-quartiles': true }, summaries: {}, offline: false } }
  ];
  for (const width of WIDTHS) {
    const sidecar = newExtraSidecar(width);
    for (const sc of scenarios) {
      const browser = await B.launch();
      const page = await B.newPage(browser, { width });
      /* a slow line on EVERY scenario: the same mock proves cover:busy on the
         way through each one, so a dedicated busy-only pass is not needed */
      await page.evaluateOnNewDocument((hello) => {
        window.OLS_TRANSPORT = {
          call: function (p) {
            return new Promise(function (resolve) {
              setTimeout(function () {
                if (p.action === 'whoami') return resolve({ ok: true, email: hello.email });
                if (p.action === 'hello') return resolve(hello);
                if (p.action === 'setname') return resolve({ ok: true });
                resolve({ ok: false, error: 'qa-mock: this cover probe never needed ' + p.action });
              }, 650);
            });
          }
        };
      }, sc.hello);
      await page.goto(BASE + '?class=qa-cover-' + sc.state + '&nointro', { waitUntil: 'domcontentloaded', timeout: 20000 });
      /* read IMMEDIATELY: the mock's 650ms delay has not elapsed yet, so the
         cover is still on "busy" — the same synchronous state script.js's
         bootCover() sets before it ever asks the transport for anything */
      const busyState = await page.evaluate(() => (document.querySelector('[data-surface="cover"]') || {}).getAttribute('data-state'));
      if (busyState === 'busy') await auditAndPush(page, sidecar, 'cover', 'busy', { width });
      await W.settle(page);
      await new Promise((r) => setTimeout(r, 700));   /* past the mock's delay */
      await W.settle(page);
      const settledState = await page.evaluate(() => (document.querySelector('[data-surface="cover"]') || {}).getAttribute('data-state'));
      g.check(settledState === sc.state, 'cover:' + sc.state + ' @' + width, 'walk',
        'the mocked hello response meant to settle the cover on "' + sc.state + '" but it read "' + settledState + '"');
      if (settledState) await auditAndPush(page, sidecar, 'cover', settledState, { width });
      await page.close(); await browser.close();
    }

    /* cover:staff — the teacher's OWN front door, not the "Staff" button off a
       pupil's cover. isTeacherLanding (script.js) is true only when the class
       code is empty or "default", and it renders on #scr-cover itself - a
       state sit-teacher's own walk never stands on, because it always logs in
       from a class link and never from the bare teacher landing. */
    {
      const browser = await B.launch();
      const page = await B.newPage(browser, { width });
      await page.goto(BASE + '?nointro', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await W.settle(page);
      const state = await page.evaluate(() => (document.querySelector('[data-surface="cover"]') || {}).getAttribute('data-state'));
      g.check(state === 'staff', 'cover:staff @' + width, 'walk', 'landing with no class code produced cover state "' + state + '", not "staff"');
      if (state) await auditAndPush(page, sidecar, 'cover', state, { width });
      await page.close(); await browser.close();
    }

    sidecar.consoleErrors = 0;
    fs.writeFileSync(A.out('walk/sit-pupil-extra-cover-' + width + '.json'), JSON.stringify(sidecar, null, 1));
    g.note('cover probe @' + width + ': stood on ' + sidecar.states.length + ' extra states');
  }
}

/* ---- shelf: none-ticked, some-ticked-from-a-class-with-books-held-back
   (in-progress/star-earned are stood on by the ordinary walk above). A CLASS
   THE OFFLINE STUB HAS NEVER SEEN GETS EVERY BOOK ON (script.js's own
   `store()`, for the preview only, so a walk can reach a book at all) - which
   is exactly why neither of these is reachable through it. Seeding the SAME
   localStorage shape `store()` itself reads, before script.js's first read of
   it, is the offline transport's own contract, not a way around it.

   RULING 36 (Damien Gartland, 11 Sept 2026) retired the locked spine: a book
   the class does not have no longer renders at all, so the second seed below
   no longer proves a "locked-spine" state - that state does not exist any
   more (GJ.app.surfaces). What it proves instead is the ruling itself: with
   only angles ticked, the shelf still reads "some-ticked" (the ordinary
   two-book-ticked state), and the DOM holds exactly the ticked books - one
   card, not three, and none of them the retired `.book.not-set`. */
async function shelfLockStatesPass() {
  const seeds = [
    { state: 'none-ticked', acts: {} },
    { state: 'some-ticked', acts: { angles: true } }
  ];
  for (const width of WIDTHS) {
    const sidecar = newExtraSidecar(width);
    for (const sd of seeds) {
      const browser = await B.launch();
      const page = await B.newPage(browser, { width });
      await page.evaluateOnNewDocument((key, acts) => {
        try {
          localStorage.setItem(key, JSON.stringify({
            classes: [{ name: 'qa-shelf-' + Object.keys(acts).length, acts: acts, owner: 'qa@offline.preview' }],
            data: {}, names: {}
          }));
        } catch (e) {}
      }, LSKEY_MIRROR, sd.acts);
      await page.goto(BASE + '?class=qa-shelf-' + Object.keys(sd.acts).length + '&nointro', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await W.settle(page);
      await page.evaluate(() => { const b = document.getElementById('cover-open'); if (b && !b.disabled) b.click(); });
      await W.settle(page);
      const state = await page.evaluate(() => (document.querySelector('[data-surface="shelf"]') || {}).getAttribute('data-state'));
      g.check(state === sd.state, 'shelf:' + sd.state + ' @' + width, 'walk',
        'a class seeded with acts ' + JSON.stringify(sd.acts) + ' produced shelf state "' + state + '", not "' + sd.state + '"');
      const ticked = Object.keys(sd.acts).filter((k) => sd.acts[k]).length;
      const cards = await page.evaluate(() => document.querySelectorAll('#shelf-tiles .book').length);
      g.check(cards === ticked, 'shelf:' + sd.state + ' @' + width, 'walk',
        'a class seeded with acts ' + JSON.stringify(sd.acts) + ' drew ' + cards + ' book card(s) on the shelf, not ' + ticked +
        ' — a book that is not ticked must be absent from the pupil\'s shelf, not merely locked (ruling 36)');
      const notSetCards = await page.evaluate(() => document.querySelectorAll('#shelf-tiles .book.not-set').length);
      g.check(notSetCards === 0, 'shelf:' + sd.state + ' @' + width, 'walk',
        'the retired "not-set" book card is still in the DOM (' + notSetCards + ' found) — the locked spine was retired by ruling 36 and must never be drawn');
      if (state) await auditAndPush(page, sidecar, 'shelf', state, { width });
      await page.close(); await browser.close();
    }
    fs.writeFileSync(A.out('walk/sit-pupil-extra-shelf-' + width + '.json'), JSON.stringify(sidecar, null, 1));
    g.note('shelf-lock probe @' + width + ': stood on ' + sidecar.states.length + ' extra states');
  }
}

/* ---- movie:nudge-banner — a teacher's nudge, landing on a pupil's cover.
   `window.GJ.app.call` is script.js's OWN published hook (`Object.assign
   (GJ.app, {call: call, ...})`, "public surface, per INTERFACES.md") - the
   identical function a teacher's "send help" button calls, so seeding the
   nudge through it is the app's own front door, driven, not a shortcut round
   it. The nudge is one-shot and section-scoped, so it is read back on the
   VERY NEXT open of that book - exactly what this probe then does. */
async function movieNudgeProbe() {
  const books = A.books().filter((b) => !ONLY_BOOK || b === ONLY_BOOK);
  const book = books[0];
  if (!book) return;
  for (const width of WIDTHS) {
    const sidecar = newExtraSidecar(width);
    const browser = await B.launch();
    const page = await B.newPage(browser, { width });
    /* THE STATE LOG. player.js's own mount() calls goto(0, true) as part of
       settling on its first frame, and that call sets "instant" on the SAME
       element inside a promise chain that resolves microtasks after the
       nudge-banner stamp this probe is standing on - overwriting it, in the
       same way redrawCurrent() overwrites resume-mid (see below). The film
       IS drawn "nudge-banner" first; nothing later ever draws it that way
       again, so the log is the only honest read. */
    await page.evaluateOnNewDocument(() => {
      window.__stateLog = [];
      const orig = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (name, value) {
        if (name === 'data-state') window.__stateLog.push({ surface: this.getAttribute('data-surface'), state: value });
        return orig.apply(this, arguments);
      };
    });
    await page.goto(BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await W.settle(page);
    await page.evaluate(() => document.getElementById('cover-open').click());
    await W.settle(page);
    const secId = await page.evaluate((id) => {
      const pack = window.GJ_CONTENT && window.GJ_CONTENT[id];
      const sec = pack && (pack.sections || []).filter((s) => s.movie)[0];
      return sec ? sec.id : null;
    }, book);
    if (secId) {
      const sent = await page.evaluate((args) => {
        const [bookId, sec, email] = args;
        if (!window.GJ || !window.GJ.app || typeof window.GJ.app.call !== 'function') return { ok: false, why: 'no GJ.app.call' };
        return window.GJ.app.call('admin', { passcode: 'demo', sub: 'nudge', className: 'demo', act: bookId, email: email, sec: sec })
          .then((r) => ({ ok: !!(r && r.ok) })).catch((e) => ({ ok: false, why: String(e) }));
      }, [book, secId, OFFLINE_EMAIL_MIRROR]);
      if (sent.ok) {
        await page.evaluate(() => { window.__stateLog = []; });
        const opened = await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, book);
        if (opened.ok) {
          await W.settle(page);
          const log = await page.evaluate(() => window.__stateLog || []);
          const drew = log.some((e) => e.surface === 'movie' && e.state === 'nudge-banner');
          g.check(drew, 'movie:nudge-banner @' + width, 'walk',
            'seeding a teacher nudge for the first movie section never once drew "nudge-banner" (drew: ' + JSON.stringify([...new Set(log.filter((e) => e.surface === 'movie').map((e) => e.state))]) + ')');
          if (drew) await auditAndPush(page, sidecar, 'movie', 'nudge-banner', { width, book });
        }
      } else {
        g.note('movie:nudge-banner @' + width + ': could not seed the nudge (' + (sent.why || 'admin call refused') + ')');
      }
    } else {
      g.note('movie:nudge-banner @' + width + ': ' + book + ' has no section carrying a method movie to nudge toward');
    }
    fs.writeFileSync(A.out('walk/sit-pupil-extra-nudge-' + width + '.json'), JSON.stringify(sidecar, null, 1));
    await page.close(); await browser.close();
  }
}

/* ---- question:resume-mid — full working placed, never checked, reloaded.
   jotter.js's own save() persists the open attempt (an `att` entry with no
   `res`) the instant a line is committed - Check is a SEPARATE press, always
   - and mount() reads exactly that back as "resume-mid" when it is not yet
   locked. So: place the working, wait out the autosave debounce
   (scheduleSave's own floor is 1.5s), reload without ever pressing Check,
   and stand on what mount() does with what was left. A dedicated probe, not
   a step in the ordinary walk, because the ordinary walk's whole job is to
   finish what it starts. */
/* ---- question:amber — the answer written down, and nothing else.
   mathcore's AMBER is a RIGHT final answer on ONE line ("if (lines.length ===
   1) return AMBER"), so the only way to stand on this screen is to leave the
   working out. Every attempt in dev/model-attempts.js shows full working by
   design, and it is right that it does: that file is the one home for what a
   CORRECT attempt looks like, and it is shared with dev/validate-all.js, which
   proves the engine marks those full. The answer-only attempt is therefore made
   HERE, out of the correct one, by dropping every line but the last - which is
   exactly the working a pupil leaves who writes the answer down and stops. */
async function amberProbe() {
  const attempts = S.attempts();
  /* THE ANSWER, WITHOUT THE WORKING. mathcore's AMBER is a right answer on ONE
     line, and on a substitution the working line is the one the pupil makes by
     tapping each letter to put its value in. So this is the ordinary drive with
     that loop left out: the value is keyed on the question's own pad and
     nothing else is touched. It is not a shortcut round the app - it is a pupil
     who writes the answer down and stops, which is exactly the pupil the amber
     verdict exists for. dev/model-attempts.js is not the place for it: that file
     is the one home for what a CORRECT attempt looks like, and it is shared
     with dev/validate-all.js, which proves the engine marks those full. */
  const cands = Object.keys(attempts).filter((k) => {
    const a = attempts[k];
    return k.indexOf('right:') === 0 && a && a.fin != null && !a.moves;
  }).slice(0, 10);
  if (!cands.length) { g.note('question:amber: no question in any book is answered by keying a value'); return; }
  for (const width of WIDTHS) {
    const sidecar = newExtraSidecar(width);
    let stood = false; const tried = [];
    for (const key of cands) {
      if (stood) break;
      const book = key.split(':')[1];
      const qid = key.split(':')[2];
      const value = attempts[key].fin;
      const browser = await B.launch();
      const page = await B.newPage(browser, { width });
      try {
        await page.goto(BASE + '?class=qa-amber&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await W.settle(page);
        await page.evaluate(() => { const b = document.getElementById('cover-open'); if (b && !b.disabled) b.click(); });
        await W.settle(page);
        const opened = await page.evaluate((s2, id) => eval(s2)(id), W.ACTIONS.openBook, book);
        if (opened.ok) {
          for (let si = 0; si < 12 && !stood; si++) {
            const ok = await page.evaluate((s2, i2) => eval(s2)(i2), W.ACTIONS.openSection, si);
            if (!ok || ok.ok === false) break;
            await W.settle(page);
            const qids = await page.evaluate((s2) => eval(s2)(), W.QUESTIONS_ON_SCREEN);
            if (qids.indexOf(qid) < 0) continue;
            const keyed = await page.evaluate((args) => {
              const root = [...document.querySelectorAll('[data-surface="question"]')]
                .filter((r) => r.getAttribute('data-qid') === args.qid)[0];
              if (!root) return 'not on screen';
              if (root.getAttribute('data-kind') !== 'subst') return 'kind is ' + root.getAttribute('data-kind');
              const pad = root.querySelector('.subst-answer .numpad') || root.querySelector('.numpad');
              if (!pad) return 'no value pad';
              const keys = [...pad.querySelectorAll('.keypad button, button.key, button')];
              const press = (label) => {
                const b = keys.filter((x) => (x.textContent || '').trim() === label)[0];
                if (!b) return false; b.click(); return true;
              };
              const digits = String(args.value).replace(/-/g, '\u2212');
              for (const ch of digits) { if (!press(ch === '\u2212' ? '\u2212' : ch)) return 'no key for "' + ch + '"'; }
              return 'ok';
            }, { qid, value });
            if (keyed !== 'ok') { tried.push(book + ':' + qid + ' — ' + keyed); break; }
            await W.settle(page);
            await page.evaluate((s2, id) => eval(s2)(id), W.CHECK, qid);
            await new Promise((r) => setTimeout(r, 1500));
            const st = await page.evaluate((id) => {
              const r = [...document.querySelectorAll('[data-surface="question"]')]
                .filter((x) => x.getAttribute('data-qid') === id)[0];
              return r ? r.getAttribute('data-state') : null;
            }, qid);
            if (st === 'amber') { await auditAndPush(page, sidecar, 'question', 'amber', { width, book, qid }); stood = true; }
            else tried.push(book + ':' + qid + ' read "' + st + '"');
            break;
          }
        }
      } catch (e) { tried.push(book + ':' + qid + ' threw ' + String(e.message || e).slice(0, 60)); }
      await page.close(); await browser.close();
    }
    if (!stood) g.note('question:amber @' + width + ': nothing settled on amber — ' + tried.join('; '));
    fs.writeFileSync(A.out('walk/sit-pupil-extra-amber-' + width + '.json'), JSON.stringify(sidecar, null, 1));
  }
}

async function resumeMidProbe() {
  const books = A.books().filter((b) => !ONLY_BOOK || b === ONLY_BOOK);
  const book = books[0];
  if (!book) return;
  const attempts = S.attempts();
  for (const width of WIDTHS) {
    const sidecar = newExtraSidecar(width);
    const browser = await B.launch();
    const page = await B.newPage(browser, { width });
    await page.evaluateOnNewDocument((table) => {
      window.__modelAttempt = (qid, wrong) => {
        const r = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
          .filter((x) => (x.getAttribute('data-qid') || (x.id || '').replace(/^jq-/, '')) === qid)[0];
        const bk = r ? (r.getAttribute('data-book') || '') : '';
        return table[(wrong ? 'wrong:' : 'right:') + bk + ':' + qid] || null;
      };
    }, attempts);
    /* THE STATE LOG, PLANTED BEFORE EVERY LOAD (evaluateOnNewDocument survives
       the reload this probe does). mount()'s own restore branch sets
       "resume-mid", pops the open attempt into `cur`, and calls
       redrawCurrent() to draw it - which sets "mid-attempt" unconditionally
       whenever cur holds anything, the same tick, overwriting the very state
       just drawn. Reading the log is how the walk stands on what mount()
       actually did rather than only on what redrawCurrent() left standing a
       moment later - the same class of fault as locked-restore's, in the
       opposite direction (this one draws right, then a GENERIC redraw undoes
       the label). */
    await page.evaluateOnNewDocument(() => {
      window.__stateLog = [];
      const orig = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (name, value) {
        if (name === 'data-state') window.__stateLog.push({ surface: this.getAttribute('data-surface'), state: value });
        return orig.apply(this, arguments);
      };
    });
    const openToSection0 = async () => {
      await page.goto(BASE + '?class=qa-resume-mid&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await W.settle(page);
      await page.evaluate(() => document.getElementById('cover-open').click());
      await W.settle(page);
      /* THE RESET GOES BEFORE openBook, NOT AFTER. openBook's own click
         handler kicks off openActivity()'s `call('load',...).then(...)`,
         and that .then() - which is where mount() actually runs, restore
         branch included - is a MICROTASK: it has already settled by the time
         W.settle()'s own round trip back to Node returns, well before this
         line ever ran. Resetting after openBook (the first cut of this
         probe) wiped the one recording of "resume-mid" mount() ever draws,
         then re-mounted the question a SECOND time via an explicit
         openSection(0) - by which point rec.att had already been popped
         empty by the FIRST (automatic) mount, so the second one correctly,
         and misleadingly, drew "fresh". firstOpenSection(pack) lands on
         section 0 on its own here regardless (nothing in this book is ever
         locked), so the explicit reopen was never needed either. */
      await page.evaluate(() => { window.__stateLog = []; });
      const opened = await page.evaluate((s, id) => eval(s)(id), W.ACTIONS.openBook, book);
      if (!opened.ok) return false;
      await W.settle(page);
      const qidsNow = await page.evaluate((s) => eval(s)(), W.QUESTIONS_ON_SCREEN);
      return qidsNow.length > 0;
    };
    if (await openToSection0()) {
      const qids = await page.evaluate((s) => eval(s)(), W.QUESTIONS_ON_SCREEN);
      const qid = qids[0];
      if (qid) {
        const declared = await page.evaluate((s2, id) => eval(s2)(id), W.STAGES_OF, qid);
        if (!declared.stages.length) {   /* a v3 kind: one shot, no stage board to leave half-drawn */
          const answered = await page.evaluate((s2, args) => eval(s2)(args), W.ANSWER, [qid, false]);
          if (answered && answered.ok) {
            await W.settle(page);
            await new Promise((r) => setTimeout(r, 2200));   /* past scheduleSave's 1.5s floor */
            if (await openToSection0()) {
              const log = await page.evaluate(() => window.__stateLog || []);
              const drew = log.some((e) => e.surface === 'question' && e.state === 'resume-mid');
              g.check(drew, 'question:resume-mid > ' + qid + ' @' + width, 'walk',
                'placing full working and reloading before Check never once drew "resume-mid" (drew: ' + JSON.stringify([...new Set(log.filter((e) => e.surface === 'question').map((e) => e.state))]) + ')');
              if (drew) await auditAndPush(page, sidecar, 'question', 'resume-mid', { width, qid, book, section: 0 });
            }
          } else {
            g.note('question:resume-mid @' + width + ': could not place working on ' + qid);
          }
        } else {
          g.note('question:resume-mid @' + width + ': ' + qid + ' is a staged kind, skipped for this probe');
        }
      }
    }
    fs.writeFileSync(A.out('walk/sit-pupil-extra-resume-' + width + '.json'), JSON.stringify(sidecar, null, 1));
    await page.close(); await browser.close();
  }
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
  /* ONE PASS WITH MOTION TURNED DOWN. A pupil who has asked her machine for
     less motion is served the whole film without animation, and that is a
     state the app declares - so one width is walked that way rather than the
     state being left for nobody to stand on. */
  const PASSES = WIDTHS.map(w => ({ width: w, reduced: false }));
  /* SHARDING ARGUMENT ONLY (package SPEED, 8 Sept): this used to push the
     reduced-motion pass unconditionally, so a run sharded to one width still
     silently re-walked 1280 reduced every time — three shards writing the
     same sidecar filename. Gated on 1280 actually being asked for: an
     unsharded run (WIDTHS has all three) behaves exactly as before, and a
     1280-only shard still carries the reduced pass it always did. */
  if (WIDTHS.includes(1280)) PASSES.push({ width: 1280, reduced: true });
  /* movie:reduced-motion AT EVERY WIDTH, NOT ONLY 1280. qa-coverage keys every
     surface:state cell by width, so a reduced-motion pass run at one width
     only closes the cell at that width and leaves it MISSING at the other
     two — which is exactly what the coverage debt ledger recorded (package
     V4-STATES, 8 Sept). The cell itself is not book-scoped, so ONE book is
     enough to close it; restricting these two new passes to books[0] keeps
     the added cost to two small walks instead of tripling every width's. */
  if (books.length) {
    if (WIDTHS.includes(375)) PASSES.push({ width: 375, reduced: true, books: [books[0]] });
    if (WIDTHS.includes(768)) PASSES.push({ width: 768, reduced: true, books: [books[0]] });
  }
  for (const pass of PASSES) {
    const width = pass.width;
    for (const book of (pass.books || books)) {
      const browser = await B.launch();
      const page = await B.newPage(browser, { width, reducedMotion: pass.reduced });
      REDUCED_PASS = !!pass.reduced;
      await page.evaluateOnNewDocument((table) => {
        /* the answer channel, primed before the app boots */
        window.__modelAttempt = (qid, wrong) => {
          const r = [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
            .filter((x) => (x.getAttribute('data-qid') || (x.id || '').replace(/^jq-/, '')) === qid)[0];
          const bk = r ? (r.getAttribute('data-book') || '') : '';
          return table[(wrong ? 'wrong:' : 'right:') + bk + ':' + qid] || null;
        };
      }, attempts);
      await page.goto(BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await W.settle(page);
      const sidecar = { walker: 'sit-pupil', scope: book, width, tier: 'preview', contentHash: bookHash(A.APP, book), when: new Date().toISOString(), states: [], consoleErrors: 0 };
      const transcript = [];

      /* the cover, then in */
      await W.settle(page);
      const coverState = await page.evaluate(() => (document.querySelector('[data-surface="cover"]') || {}).getAttribute('data-state'));
      const coverAudit = await AUD.run(page, { clickSafety: true });
      sidecar.states.push({ surface: 'cover', state: coverState || 'returning', width, audits: coverAudit.verdicts });
      transcript.push(await page.evaluate(() => (document.getElementById('cover-name-out') || {}).textContent || ''));
      transcript.push(await page.evaluate(() => (document.getElementById('cover-open') || {}).textContent || ''));
      await page.evaluate(() => document.getElementById('cover-open').click());
      await W.settle(page);
      transcript.push(await page.evaluate(() => (document.getElementById('shelf-instruction') || {}).textContent || ''));

      /* shelf:some-ticked — THE FIRST LOOK AT THE SHELF, before any book has
         a mark on it. Every browser this walk opens is a fresh profile with
         nothing saved, so this is the one honest place to stand on "every
         book ticked, none of them started" - the walk goes on to finish
         every book it opens, so nothing later ever lands here again. */
      {
        const shelfState = await page.evaluate(() => (document.querySelector('[data-surface="shelf"]') || {}).getAttribute('data-state'));
        if (shelfState) {
          const a = await AUD.run(page, { clickSafety: true });
          sidecar.states.push({ surface: 'shelf', state: shelfState, width, audits: a.verdicts });
        }
      }

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
      fs.writeFileSync(A.out('walk/sit-pupil-' + book + '-' + width + (pass.reduced ? '-reduced' : '') + '.json'), JSON.stringify(sidecar, null, 1));
      if (width === 1280) {
        fs.writeFileSync(A.out('transcript/' + book + '.txt'),
          transcript.filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join('\n') + '\n');
      }
      g.note(book + ' @' + width + ': stood on ' + sidecar.states.length + ' states, ' + page.__errors.length + ' console errors');
      await page.close();
      await browser.close();
    }
  }

  /* THE FOUR EXTRA PROBES, ONCE PER RUN — NOT ONCE PER SHARD. run.js shards
     this walker by book × width (package SPEED, 8 Sept): a full run is nine
     separate processes, MS_BOOK and MS_WIDTHS both narrowed. None of these
     four probes is book-scoped (cover, shelf and the movie/question states
     they stand on do not vary by which book is open), so running them on
     every shard would pay their cost up to nine times for the same three
     cells. They run on the shard carrying the FIRST book only — which still
     gets one run per width, because width is what MS_WIDTHS actually narrows
     — and whenever this file is run whole (no MS_BOOK at all: a manual
     invocation, or the "content pack unreadable" single-task fallback). */
  const CANONICAL_BOOK = A.books()[0] || null;
  if (!ONLY_BOOK || ONLY_BOOK === CANONICAL_BOOK) {
    await coverStatesPass();
    await shelfLockStatesPass();
    await movieNudgeProbe();
    await resumeMidProbe();
    await amberProbe();
  }

  /* THE REQUIRED SURFACE SET, derived from the app's own registry (L3): a walk
     that reached fewer surfaces than the app declares is SHORT, and short
     coverage is a failure, never a note. */
  /* THE APP'S OWN DECLARATION, AND A FALLBACK THAT IS NOT SILENCE. This read
     out/surfaces.json and nothing else - a file another gate writes, which the
     control sandbox deletes before every run. With no file the register was {},
     every surface filtered out, and the check counted nothing and passed. That
     is why `unreachable-planted-fault` had never once fired: not the plant, not
     the gate, an empty list. The declaration is read from script.js when the
     file is not there, because script.js is the app's own statement of what it
     can render and it is always present. */
  let reg = A.exists(A.out('surfaces.json')) ? JSON.parse(A.read(A.out('surfaces.json'))) : {};
  if (!Object.keys(reg).length) {
    const src = A.read(A.app('script.js'));
    const block = (src.match(/GJ\.app\.surfaces\s*=\s*\{([\s\S]*?)\n\s*\};/) || [])[1] || '';
    reg = {};
    (block.match(/^\s*'?[-a-zA-Z]+'?\s*:/gm) || []).forEach(m => {
      reg[m.replace(/[\s':]/g, '')] = true;
    });
  }
  const pupilSurfaces = ['cover', 'shelf', 'book-contents', 'movie', 'question', 'dock', 'self-eval', 'book-end']
    .filter(s => reg[s]);
  g.check(pupilSurfaces.length > 0, 'surfaces', 'coverage',
    'the walk could not find out which screens the app says it has, so it checked none of them — a coverage check made of nothing is not a pass');
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

  /* AND EVERY LAW THAT COUNTS WHAT IT LOOKED AT HAS TO HAVE LOOKED AT
     SOMETHING. A screen with no instruction line on it is not a fault, so
     said-twice passes there honestly - but if it measured nothing on every
     state of every walk, it is not passing, it is asleep. That is precisely how
     the readability audit slept through the fault it was written for (F35a),
     and the only thing that would have shown it is a count. */
  const looked = {};
  fs.readdirSync(A.out('walk')).filter(f => /^sit-pupil/.test(f)).forEach(f => {
    JSON.parse(A.read(A.out('walk/' + f))).states.forEach(st => {
      Object.keys(st.measured || {}).forEach(k => { looked[k] = (looked[k] || 0) + st.measured[k]; });
    });
  });
  ['said-twice', 'readability'].forEach(k => {
    g.check(looked[k] > 0, k, 'awake',
      'the ' + k + ' law reported a verdict on every state of the walk and never once measured anything — a law that looks at nothing cannot fail, and a gate that cannot fail is not a gate');
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
