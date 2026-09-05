#!/usr/bin/env node
/* qa-needs-you.js — A FLAG WITH NO REASON, A FLAG THAT NEVER CLEARS, A STAT WITH NO HOME.
 *
 * DFM 156 / 157b / 160. A flag on a class page is a claim on a teacher's next
 * five minutes — "look at this pupil" — and three ways that claim rots: the
 * flag names no reason, so she cannot act on it without re-deriving the
 * evidence herself; the flag never clears, so she learns to ignore the whole
 * panel because half of it is stale; or the number behind the flag is read
 * from wherever it happened to sit in an array rather than from a name, so it
 * silently points at the wrong question the day one gets added or reordered.
 *
 * The v4 "Needs you now" chips this gate is really aimed at do not exist in
 * staff.js yet — the copy for them is already staged in this QA tree's own
 * strings ledger ("Wrong twice on {book}, {exercise}, {question}"), which is
 * as close to a written contract as a not-yet-built feature gets. So this
 * gate is written harness-first: it looks for needsYou/needsYouChips and, not
 * finding it, says so plainly and goes red — that red is correct until the
 * staff rebuild lands, not a bug in this gate. What it CAN prove today is the
 * arithmetic underneath the CURRENT support/stretch flags: that they are
 * read from the summary's own named fields, never a raw index, and that
 * every misconception label a teacher sees resolves through DX_NAMES rather
 * than printing a raw code at her.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { makeWindow } = require('./lib/domstub.js');

const TIER = 'fast';
const ORDER = 54;
const COVERS = {
  books: '*', kinds: [], surfaces: [], widths: [], projector: false,
  tier: ['preview', 'built'], cells: ['needs-you']
};
const CONTROLS = [
  { id: 'chip-without-reason', kind: 'fixture', plant: 'fixture-needs-you', mustFail: /with no reason/ },
  { id: 'chip-that-never-clears', kind: 'fixture', plant: 'fixture-needs-you', mustFail: /still flagged/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-needs-you');
g.exempt([
  'the rendered chip — colour, placement on the class page, click-through into the pupil\'s jotter — rides the teacher walker; this gate proves only the arithmetic that would feed it'
]);

/* ═══════════════════ boot the client, same sandbox as two-homes ════════ */
function offlineHome() {
  const sandbox = makeWindow();
  vm.createContext(sandbox);
  ['mathcore.js', 'anglecore.js', 'content-angles.js', 'content-algebra.js', 'player.js', 'jotter.js', 'strings.js', 'staff-pages.js', 'staff.js', 'script.js']
    .forEach(f => {
      const p = A.app(f);
      if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: f });
    });
  return sandbox;
}
let stub;
try { stub = offlineHome(); } catch (e) { stub = null; }
if (!stub || !stub.GJ || !stub.GJ.app) {
  g.fail('offline stub', 'needs-you', 'script.js did not finish booting under the stub sandbox — staff.js cannot be exercised at all, so nothing here is proved');
  g.done();
  process.exit(1);
}

/* ═══════════════════ (A) the v4 chip function, if it exists yet ════════ */
function findChipFn() {
  const tries = [
    /* WHERE IT ACTUALLY LIVES. The flag arithmetic is in staff-pages.js as
       GJ_STAFF_PAGES.needsYou, so a gate that looked only at staff.js reported
       that the class page had no computable definition of a flag while it had
       one, six lines away. */
    () => stub.GJ_STAFF_PAGES && stub.GJ_STAFF_PAGES.needsYou,
    () => stub.needsYou, () => stub.needsYouChips,
    () => stub.GJ && stub.GJ.staff && stub.GJ.staff.needsYou,
    () => stub.GJ && stub.GJ.staff && stub.GJ.staff.needsYouChips,
    () => stub.GJ && stub.GJ.app && stub.GJ.app.needsYou,
    () => stub.GJ && stub.GJ.app && stub.GJ.app.needsYouChips
  ];
  for (const get of tries) { try { const f = get(); if (typeof f === 'function') return f; } catch (e) { /* ignore */ } }
  return null;
}
const chipFn = findChipFn();

if (!chipFn) {
  g.fail('class page', 'needs-you',
    'the class page has no needsYou / needsYouChips function yet — the "Needs you now" flags have no computable definition, so nothing can prove a flag raises for a real reason or clears when that reason goes away (expected until the staff rebuild, DFM 156/157b/160 — harness-first)');
} else {
  /* best-guess contract: (book, summary-for-that-pupil, content-pack). Update
     this call the day the real signature lands — the assertions below only
     care about the shape of what comes back, not how it was called. */
  const bookId = A.books()[0];
  const rows = bookId ? A.grid().filter(r => r.book === bookId) : [];
  if (!rows.length) {
    g.fail('class page', 'needs-you', 'A.grid() found no questions in any book — this gate cannot build a synthetic summary to exercise needsYou against');
  } else {
    const flagged = rows[0];
    const pack = A.content()[bookId];
    function makeSummary(flagQid) {
      const sum = { v: 1, act: bookId, qs: {} };
      rows.forEach(r => {
        sum.qs[r.qid] = (r.qid === flagQid)
          ? { st: 'err', mk: [0, 0], t: 20, at: 2, a1: 0 }          /* wrong twice: the one condition this gate can both raise and clear */
          : { st: 'ok', mk: [1, 1], t: 20, at: 1, a1: 1 };
      });
      return sum;
    }
    /* THE REAL CONTRACT, read from staff-pages.js rather than guessed:
         needsYou(pupils, qlist, bookTitle, now) -> [{ email, name, qid, why, rank }]
       where qlist rows carry the exercise and question labels the reason is
       built from. A gate that guesses a signature and fails is a gate reporting
       its own ignorance as a fault (L6). */
    function makeQlist() {
      return rows.map((r, i) => ({
        q: r.question,
        exLabel: 'Ex ' + (pack.sections.findIndex(x => x.id === r.section) + 1) + ' \u00b7 ' + r.section,
        qLabel: 'Q' + (i + 1)
      }));
    }
    function callChips(summary) {
      return chipFn([{ email: 'p@c2ken.net', name: 'A Pupil', summary: summary }], makeQlist(), pack.title || bookId);
    }

    let chips = null, callErr = null;
    try { const out = callChips(makeSummary(flagged.qid)); if (Array.isArray(out)) chips = out; }
    catch (e) { callErr = e; }

    if (!chips) {
      g.fail('class page', 'needs-you',
        'needsYou/needsYouChips exists but did not return an array for this gate\'s best-guess call needsYouChips(book, summary, pack)' +
        (callErr ? (' — it threw: ' + callErr.message) : ' — it returned ' + JSON.stringify(chips)) +
        '. The contract has changed since this gate was written and this gate needs updating to match it, not the other way round');
    } else {
      /* (a) every chip carries a non-empty reason */
      const noReason = chips.filter(c => !c || typeof c.why !== 'string' || !c.why.trim());
      g.check(noReason.length === 0, 'chip', 'needs-you',
        noReason.length + ' of ' + chips.length + ' chips carry a chip with no reason at all — a flag a teacher cannot explain is a flag she cannot act on');

      /* the chip for the one flagged question */
      const mine = chips.filter(c => c && (c.qid === flagged.qid));
      g.check(mine.length > 0, 'chip', 'needs-you',
        'the one question this gate marked wrong twice (' + flagged.qid + ') raised no "Needs you now" chip at all');
      if (mine.length) {
        const reason = mine[0].why || '';
        /* (b) the reason names a book AND an exercise AND a question */
        const namesBook = new RegExp(bookId, 'i').test(reason) || (pack && pack.title && new RegExp(pack.title, 'i').test(reason));
        const namesExercise = /\bEx\s*\d/.test(reason);
        const namesQuestion = /\bQ\d/.test(reason);
        g.check(namesBook, 'chip', 'needs-you', 'the chip\'s reason "' + reason + '" does not name the book it is about');
        g.check(namesExercise, 'chip', 'needs-you', 'the chip\'s reason "' + reason + '" does not name the exercise (section) it is about');
        g.check(namesQuestion, 'chip', 'needs-you', 'the chip\'s reason "' + reason + '" does not name the question it is about');
      }

      /* (c) a chip raised by a condition disappears when the condition clears */
      let chipsCleared = null, clearErr = null;
      try { const out2 = callChips(makeSummary(null)); if (Array.isArray(out2)) chipsCleared = out2; }
      catch (e) { clearErr = e; }
      if (!chipsCleared) {
        g.fail('chip', 'needs-you', 'needsYouChips could not be re-run with the flagged question fixed' + (clearErr ? (': ' + clearErr.message) : '') + ' — a flag that cannot be re-checked cannot be proven to clear');
      } else {
        const stillThere = chipsCleared.some(c => c && (c.q === flagged.qid || (typeof c.reason === 'string' && c.reason.indexOf(flagged.qid) >= 0)));
        g.check(!stillThere, 'chip', 'needs-you',
          'the chip for ' + flagged.qid + ' is still flagged after the pupil got it right — a flag that never clears trains a teacher to ignore the whole panel');
      }
    }
  }
}

/* ═══════════════════ (B) what CAN be asserted now: the CURRENT flags ═══ */
/* support / stretch / the dominant-slip label, in staff.js's own
   "Class Insights" section — must read the summary's own named fields
   (st, errAt, dx, mk, t), never a raw positional index into a cell */
/* WHERE THE ARITHMETIC LIVES NOW. The Class Insights screen was DISSOLVED into
   the class page (MATHS_V4_DESIGN section 5), so the flags, the proportions and
   the dominant slip are computed in staff-pages.js and rendered by staff.js.
   A gate still looking for a section comment that no longer exists is reading
   nothing and calling it a pass, which is the exact fault DFM 206 is about. */
const rawStaff = A.read(A.app('staff.js')) +
  (A.exists(A.app('staff-pages.js')) ? A.read(A.app('staff-pages.js')) : '');
{
  const section = rawStaff;
  ['st', 'errAt', 'dx', 'mk', 't'].forEach(field => {
    const re = new RegExp('\\.' + field + '\\b');
    g.check(re.test(section), 'the class page', 'needs-you',
      'nothing in the markbook reads a "' + field + '" field by name — if the flags, the proportions and the named slip do not read the summary\'s own named fields, this gate cannot tell they are reading the right thing at all');
  });
  /* A SUMMARY CELL is read by name; a local tuple is not a summary cell. The
     first cut of this rule matched any `row[0]`, and condemned a three-line
     display list built two lines above its own use - a gate inventing a fault
     (L6). The names that actually hold a stored cell are the ones checked. */
  const stripped = A.stripComments(section);
  const rawIndexHit = /\b(cell|rec|summary|sum|qs)\[[0-9]+\]/.exec(stripped);
  g.check(!rawIndexHit, 'the class page', 'needs-you',
    'the markbook reads a stored summary cell positionally ("' + (rawIndexHit && rawIndexHit[0]) + '") instead of by name — a stat read by position has no stable home once a question is added or reordered');
}

/* every label the teacher reads resolves through DX_NAMES, never a raw code */
const dx = stub.GJ_DX;
g.check(!!dx && typeof dx === 'object' && Object.keys(dx).length > 0, 'staff.js', 'needs-you',
  'window.GJ_DX is missing or empty after staff.js loads — every "why it\'s wrong" label falls back to printing a raw code like "WRONG_SCALE" at the teacher instead of English');
if (dx) g.note('GJ_DX carries ' + Object.keys(dx).length + ' misconception labels, longest key ' + Object.keys(dx).reduce((a, b) => (b.length > a.length ? b : a), ''));

g.done();
