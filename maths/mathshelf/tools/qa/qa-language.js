#!/usr/bin/env node
/* qa-language.js — THE COMMUNICATION-OF-LANGUAGE HARNESS, BOTH REGISTERS.
 *
 * G-D2 / DFM 138, 172, 178. Two layers, because they catch different things and
 * neither can do the other's job (DFM 193d):
 *   LAYER 1 is a mechanical net. It holds ground already won — a banned word
 *   cannot come back, a sequence cannot be written as prose, a term cannot be
 *   used before it has been explained, an authored numeral cannot disagree with
 *   the thing it counts. It does NOT judge whether a sentence reads well; no
 *   machine does, and a gate that pretends to is the DFM 146a fault.
 *   LAYER 2 is the ledger. Every sentence carries the hash of the text that was
 *   judged, so an edited sentence loses its judgement and has to be read again.
 * The reading itself is a separated context's job (qa-cold-read).
 *
 * THE THREE THINGS THAT DO NOT TRAVEL FROM THE KS3 DT PLATFORM (Part 1.1):
 *   - ONE READER. Eleven or twelve, for every book. J3 sits Angles; S1 GCSE
 *     sits Handling Data; the VOICE may be a notch more grown-up, the sentences
 *     may not be harder (rule 18).
 *   - A MIXED ROOM. Chromebooks and iPads in class, phones at home, a smartboard
 *     for the starter. KS3 DT's "click, never tap" INVERTS here: a bare "tap" or
 *     "click" as THE gesture is untrue for half the room. Say what to DO; name
 *     both when a gesture must be named (rule 19).
 *   - NO FICTION. The voice rule forbids one. Only `rule` and `tray` are named
 *     on screen, and each gets one plain-words line where she first meets it.
 *
 * THE CONTROLS RUN FIRST, EVERY RUN. The must-fail exhibits of the cold-read
 * checklist section 3 must be CAUGHT and the approved exemplars of section 3b
 * must stay CLEAN. A net nobody has seen catch anything is not a net, and a net
 * that catches good sentences is worse than none (L6).
 */
'use strict';
const fs = require('fs');
const A = require('./lib/app.js');
const { Gate, matrix } = require('./lib/report.js');
const S = require('./lib/strings.js');
const V = require('./lib/verbs.js');
const { sha1 } = require('./lib/hash.js');

const TIER = 'fast';
const ORDER = 41;
const COVERS = { books: '*', kinds: '*', surfaces: '*', widths: [], projector: false, tier: ['preview', 'built'], cells: ['language'] };
const CONTROLS = [
  { id: 'must-fail-exhibits', kind: 'self-probe', mustFail: /the net did not catch/ },
  { id: 'must-pass-exemplars', kind: 'self-probe', mustFail: /the net condemned an approved sentence/ },
  { id: 'bare-gesture', kind: 'fixture', plant: 'fixture-strings-table', mustFail: /as if there were only one way in/ },
  { id: 'numeral-tie', kind: 'fixture', plant: 'fixture-book', mustFail: /but there are/ },
  { id: 'define-before-use', kind: 'fixture', plant: 'fixture-vocab', mustFail: /before anything has explained it/ },
  { id: 'ledger-edited-sentence', kind: 'fixture', plant: 'fixture-ledger', mustFail: /has changed since it was judged/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const MAX_WORDS = 34;
const g = new Gate('qa-language');

/* ============================================== THE NETS ================ */
const unbold = (t) => String(t).replace(/\*\*([^*]+)\*\*/g, '$1');
const prose = (t) => unbold(String(t)).replace(/`[^`]*`/g, ' ');
const ABBR = /\b(?:e\.g|i\.e|etc|Mr|Mrs|Ms|Dr|St|vs|approx)\.$/i;
function sentences(text) {
  const parts = []; let buf = '';
  const toks = String(text).split(/(\s+)/);
  for (let i = 0; i < toks.length; i++) {
    buf += toks[i];
    const t = toks[i].trim();
    if (!/[.!?]["')\]]?$/.test(t) || ABBR.test(t) || /^[A-Z]\.$/.test(t)) continue;
    if (/\d[.!?]$/.test(t)) {
      const next = toks.slice(i + 1).find(x => x.trim());
      if (!next || !/^["'(]?[A-Z]/.test(next.trim())) continue;
    }
    parts.push(buf.trim()); buf = '';
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.filter(Boolean);
}
const wordCount = (s) => String(s).split(/\s+/).filter(Boolean).length;

/* THE LEXICON. Each row: what is banned, why, and where a legitimate use is
   allowed through. A rule with no "unless" has never been tested against a
   correct sentence; the MUST_PASS block below is where every one of them is. */
const LEXICON = [
  { id: 'bare-gesture', re: /\b(tap|taps|tapping|click|clicks|clicking)\b/i,
    unless: /\btap or click\b|\bclick or tap\b/i, registers: ['pupil', 'teacher'],
    why: 'names a gesture as if there were only one way in — half the room has a mouse and half a finger. Say what to DO ("choose", "press", "put", "move"), or name both: "tap or click"' },
  { id: 'the-wifi', re: /\bthe wi-?fi\b/i, registers: ['pupil', 'teacher'],
    why: 'blames "the wifi" — some of the room is on the school network and some on their own. Say what to do if the page will not save' },
  { id: 'the-device', re: /\bthe (device|system|interface|platform|application)\b/i, registers: ['pupil'],
    why: 'names a machine in the abstract. She is looking at a page, a pad, a tray and a book — use the thing she can see' },
  { id: 'dead-name', re: /\b(glass jotter|longhand|digimaths)\b/i, registers: ['pupil', 'teacher'],
    why: 'uses a name this platform no longer has' },
  { id: 'pedagogy', re: /\b(every line earns|pedagogy|mark scheme|the examiner|what the examiner)\b/i, registers: ['pupil', 'teacher'],
    why: 'explains the theory of marking to somebody who is just working through their exercises. The philosophy belongs in the teacher guide' },
  /* the mark codes in every shape they were written on this platform:
     "M/A", "M 1/1", "A 0/1", "AMBER", "line 3", "Ex1.Q1" */
  { id: 'examiner-jargon', re: /\bM\s*\/\s*A\b|\b[MA]\s?\d+\s*\/\s*\d+\b|\bAMBER\b|\bEx\d+\.Q\d+\b|\bline \d+\b/, registers: ['pupil', 'teacher'],
    why: 'uses a code the reader has to decode. Say "Working 1 of 1 - Answer 0 of 1", "Answer only - no working shown", "Ex 1 - Q1", "step 3"' },
  { id: 'internal-name', re: /\b(statcore|statchart|mathcore|anglecore|quartileRule|curveRule|the press)\b/i, registers: ['pupil', 'teacher'],
    why: 'names something only the people who built it can see' },
  { id: 'fair-copy', re: /\bfair cop(y|ies)\b/i, registers: ['pupil'],
    why: 'praises a neat copy of work she may not have written' },
  { id: 'is-this-you', re: /\bis this you\b/i, registers: ['pupil'],
    why: 'asks her a question the screen already knows the answer to' },
  { id: 'girl', re: /\bgirls?\b/i, unless: /girls'\s+school/i, registers: ['pupil'],
    why: 'names the reader by what she is rather than talking to her' },
  { id: 'us-spelling', re: /\b(color|colors|center|centers|meters|liters|organize|analyze|math)\b/,
    unless: /MathShelf/, registers: ['pupil', 'teacher'],
    why: 'is US spelling - this is a UK school' }
];

/* the two named fictions, and nothing else (rule 29) */
/* the two named fictions live in the DOM contract (data-fiction); see below */

/* ========================================= the checks over one row ====== */
function checkRow(row, emit) {
  const text = row.text;
  const p = prose(text);

  /* the lexicon sees everything, including labels: a banned word is banned
     wherever it hides */
  LEXICON.forEach(L => {
    if (!L.registers.includes(row.register)) return;
    if (L.unless && L.unless.test(text)) return;
    if (L.re.test(text)) emit('lexicon', row, 'the sentence ' + L.why + '  ["' + text.slice(0, 90) + '"]');
  });

  if (row.label) return;    /* a label is a name, not prose (the isLabelPath shape) */

  sentences(p).forEach(s => {
    if (wordCount(s) > MAX_WORDS) {
      emit('length', row, 'a ' + wordCount(s) + '-word sentence - the ceiling for this reader is ' +
        MAX_WORDS + '  ["' + s.slice(0, 90) + '"]');
    }
    if ((s.match(/[—–]|--/g) || []).length >= 2) {
      emit('dash-chain', row, 'three clauses strung together on dashes - one idea per sentence  ["' + s.slice(0, 90) + '"]');
    }
    if (/\b(first|firstly)\b[^.]*\b(then|next|after that)\b[^.]*\b(finally|lastly|last of all)\b/i.test(s) ||
        /(^|\s)1[.)]\s.*\s2[.)]\s/.test(s)) {
      emit('sequence-as-prose', row, 'three steps written as one sentence - a sequence is a numbered list, one step per line  ["' + s.slice(0, 90) + '"]');
    }
  });
}

/* the reporters: candidates the judge must answer one by one, never auto-fails */
function candidates(row) {
  const out = [];
  if (row.label) return out;
  const sents = sentences(prose(row.text));
  sents.forEach(s => {
    const t = s.trim(); if (!t) return;
    const wh = (t.match(/\b(what|which|who|whom|whose|where|when|why|how)\b/gi) || []).length;
    if (wh >= 2 && wordCount(t) <= 40) out.push({ kind: 'STACKED-WH', text: t });
    if (/^(that|this)\s+(is|was|are|were)\b/i.test(t) && wordCount(t) <= 8) out.push({ kind: 'BARE-DEMONSTRATIVE', text: t });
    if (/\b(in|on|at|to|of|for|with|into|onto|from|by)\s+(in|on|at|to|of|for|with|into|onto|from|by)\b/i.test(t)) out.push({ kind: 'PREPOSITION-PILEUP', text: t });
    if (/^(never|not|no)\b/i.test(t) && !V.hasRealVerb(t) && wordCount(t) >= 2) out.push({ kind: 'NEGATION-FRAGMENT', text: t });
    const head = t.split(/[—–;:]|--/)[0];
    const clauses = head.split(',').map(c => c.trim()).filter(Boolean);
    let run = 0;
    for (let i = 0; i < clauses.length; i++) {
      if (wordCount(clauses[i]) < 2 || V.hasRealVerb(clauses[i])) break;
      run++;
    }
    if (run >= 2) out.push({ kind: 'FRAGMENT-CHAIN', text: t });
  });
  const verbless = sents.filter(s => wordCount(s) >= 2 && !V.hasRealVerb(s));
  if (verbless.length >= 2) out.push({ kind: 'FRAGMENT-RUN', text: verbless.slice(0, 3).join('  /  ') });
  return out;
}

/* ========================================== THE CONTROLS, FIRST ========= */
const MUST_FAIL = [
  { text: 'A fair copy. Lovely clear working.', register: 'pupil' },
  { text: 'Every line earns its mark.', register: 'pupil' },
  { text: 'This is what the mark scheme wants.', register: 'pupil' },
  { text: 'M 1/1 and A 0/1', register: 'teacher' },
  { text: 'She answered AMBER on line 3 of Ex1.Q1.', register: 'teacher' },
  { text: 'Is this you, Aoife?', register: 'pupil' },
  { text: 'Tap the values in order', register: 'pupil' },
  { text: 'Check the wifi and try again.', register: 'pupil' },
  { text: 'The system will mark your working and then it will show you the colors it chose for each of the lines you wrote out in the box below the page.', register: 'pupil' }
];
const MUST_PASS = [
  { text: 'WALT - Find angles on a straight line', register: 'pupil' },
  { text: 'Answer only - no working shown.', register: 'pupil', label: true },
  { text: 'Bang on - careful measuring.', register: 'pupil', label: true },
  { text: 'Slide the rule up the frequency axis to the value you need, then read where it meets the curve.', register: 'pupil' },
  { text: 'Five markers - put each one on the scale where it belongs.', register: 'pupil' },
  { text: 'Your maths books live here. Your teacher chooses which ones are out.', register: 'pupil' },
  { text: 'Your teacher suggested watching this method.', register: 'pupil' },
  { text: 'Points 1 of 1 - Curve 0 of 1', register: 'teacher', label: true },
  { text: 'Use the graph to estimate the median.', register: 'pupil' },
  { text: 'Tap or click a mark to change it.', register: 'teacher' }
];
function runControls() {
  V.selfProve().forEach(b => g.fail('qa-language', 'self-probe', 'the verb detector did not prove itself: ' + b));
  MUST_FAIL.forEach(ex => {
    let caught = 0;
    checkRow({ path: 'control', text: ex.text, register: ex.register, locked: false, label: false }, () => caught++);
    if (!caught) caught += candidates({ path: 'control', text: ex.text, register: ex.register, label: false }).length;
    g.check(caught > 0, 'qa-language', 'control',
      'the net did not catch a sentence the checklist says must fail: "' + ex.text + '"');
  });
  MUST_PASS.forEach(ex => {
    const found = [];
    checkRow({ path: 'control', text: ex.text, register: ex.register, locked: false, label: !!ex.label },
      (kind, r, msg) => found.push(kind + ': ' + msg));
    g.check(found.length === 0, 'qa-language', 'control',
      'the net condemned an approved sentence: "' + ex.text + '" - ' + found.join(' | '));
  });
}
runControls();

/* ========================================== LAYER 1 over the tree ======= */
const rows = S.all();
const lockedRows = rows.filter(r => r.locked);
const judged = rows.filter(r => !r.locked);
console.log('  LOCKED (approved books, reported never failed): ' + lockedRows.length + ' strings from ' +
  [...S.lockedBooks()].join(' and '));
g.exempt([
  'the Angles and Algebra pack strings are APPROVED and live (rule 30): findings on them are printed as REPORTED and never fail the build',
  'a label is judged as a name, not as prose - the sentence rules do not run over it',
  'the fragment and read-first reporters never fail a build: they name candidates the separated judge must answer one by one (DFM 197/198)'
]);

const reported = [];
lockedRows.forEach(r => checkRow(r, (kind, row, msg) => reported.push([kind, row.path, msg.slice(0, 110)])));
judged.forEach(r => checkRow(r, (kind, row, msg) => g.fail(row.path, kind, msg)));

if (reported.length) {
  console.log(matrix('REPORTED on approved books (his word is what changes these)', ['net', 'where', 'what'], reported.slice(0, 40)));
}

/* ---- numeral tie: an authored numeral beside a machine-counted thing ---- */
{
  const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const C = A.content();
  Object.keys(C).forEach(book => {
    (C[book].sections || []).forEach(sec => {
      const n = (sec.questions || []).filter(q => !q.reserve).length;
      ['title', 'walt'].forEach(f => {
        const t = sec[f]; if (typeof t !== 'string') return;
        const m = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+questions?\b/i.exec(t);
        if (!m) return;
        const said = NUM[m[1].toLowerCase()] || Number(m[1]);
        g.check(said === n, book + ' > ' + sec.id + ' > ' + f, 'numeral-tie',
          'says "' + m[0] + '" but there are ' + n + ' - a number on screen is true or it is not there');
      });
    });
  });
}

/* ---- define before use, in shelf order --------------------------------- */
{
  const shelf = (A.activities() || { ids: [] }).ids;
  let anyVocab = false;
  shelf.forEach((book, bi) => {
    const vf = A.qa('vocab/' + book + '.json');
    if (!A.exists(vf)) return;
    anyVocab = true;
    const vocab = JSON.parse(A.read(vf));
    const pack = A.content()[book];
    if (!pack) return;
    const defined = new Set();
    shelf.slice(0, bi).forEach(b => {
      const f = A.qa('vocab/' + b + '.json');
      if (A.exists(f)) Object.keys(JSON.parse(A.read(f))).forEach(t => defined.add(t.toLowerCase()));
    });
    (pack.sections || []).forEach(sec => {
      const captions = ((sec.movie && sec.movie.steps) || []).map(s => String(s.say || '')).join(' ').toLowerCase();
      Object.keys(vocab).forEach(term => {
        const phrase = String(vocab[term].phrase || vocab[term] || '').toLowerCase();
        if (phrase && captions.indexOf(phrase) >= 0) defined.add(term.toLowerCase());
      });
      (sec.questions || []).forEach(q => {
        const t = String(q.prompt || '').toLowerCase();
        Object.keys(vocab).forEach(term => {
          const esc = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (!new RegExp('\\b' + esc + '\\b').test(t)) return;
          g.check(defined.has(term.toLowerCase()), book + ' > ' + sec.id + ' > ' + q.id + ' > prompt', 'define-before-use',
            'uses "' + term + '" before anything has explained it - the film of this book must say ' +
            '"' + (vocab[term].phrase || vocab[term]) + '" first, or an earlier book on the shelf must have');
        });
      });
    });
  });
  if (!anyVocab) g.note('no vocab file yet for any book - define-before-use has nothing to hold until tools/qa/vocab/<book>.json exists');
}

/* ---- the two named fictions, and no others ------------------------------
   WHERE THIS IS MEASURED, and why it is not measured here. "The rule" has two
   meanings in a maths book: the THING she slides up the frequency axis (the
   named fiction, which owes its plain-words line under DFM 57) and the RULE a
   theorem states ("angles on a straight line add to 180"). A text scan cannot
   tell them apart, and condemning the second would be the gate inventing a
   fault (L6). The DOM contract exists exactly for this: the element that IS the
   fiction carries data-fiction="rule|tray", so the first-meeting line is
   asserted on the rendered surface by the walkers, where the two senses are
   distinguishable. What this gate holds is the OTHER half: no internal design
   idea is named on any screen at all. */
{
  const OTHER = /\b(the press|the shell|the compositor|the pipeline|the harness|pencil mode|ink mode)\b/i;
  rows.forEach(r => {
    if (r.locked) return;
    if (OTHER.test(r.text)) g.fail(r.path, 'fiction', 'names an internal design idea on a screen - only "the rule" and "the tray" are ever named, and each is explained where she first meets it');
  });
  g.note('the DFM 57 first-meeting line for the two named fictions is asserted on the rendered surface, keyed on data-fiction (the walkers carry it)');
  g.exempt(['the plain-words line for "the rule" and "the tray" is measured on the rendered surface, not in the source: in a maths book "the rule" also means a theorem, and only the DOM can tell the two apart']);
}

/* ========================================== LAYER 2 - the ledger ======== */
{
  const lf = A.qa('language-ledger.json');
  const ledger = A.exists(lf) ? JSON.parse(A.read(lf)) : {};
  let unreviewed = 0, changed = 0;
  judged.forEach(r => {
    const h = sha1(r.text).slice(0, 12);
    const rec = ledger[r.path];
    if (!rec) { unreviewed++; return; }
    if (rec.sha !== h) {
      changed++;
      g.fail(r.path, 'ledger', 'has changed since it was judged (' + rec.sha + ' -> ' + h + ') - an edited sentence loses its judgement and must be read again');
    }
  });
  g.note('ledger: ' + Object.keys(ledger).length + ' judged rows; ' + unreviewed + ' sentences not yet judged; ' + changed + ' changed since judgement');
  if (unreviewed) g.note('an unjudged sentence is not a failure here - it is a row the separated cold read must answer (qa-cold-read holds that)');
}

/* ============================ the read-first list, for the judge ======== */
{
  const list = [];
  rows.forEach(r => candidates(r).forEach(c => list.push({ path: r.path, kind: c.kind, text: c.text, locked: r.locked })));
  A.ensureOut();
  fs.writeFileSync(A.out('read-first.json'), JSON.stringify(list, null, 2));
  g.note(list.length + ' read-first candidates written to out/read-first.json - the verdict file must answer every one by path');
  if (list.length) console.log(matrix('READ-FIRST CANDIDATES (the judge answers each by path)',
    ['kind', 'where', 'sentence'], list.slice(0, 25).map(c => [c.kind, c.path, c.text.slice(0, 70)])));
}

g.done();
