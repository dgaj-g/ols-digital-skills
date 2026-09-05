#!/usr/bin/env node
/* qa-notation.js — MATHS THAT DOES NOT READ AS MATHS.
 *
 * FAULT: a keyboard character standing in for a maths symbol — an ASCII
 * hyphen where a minus sign is meant, a lowercase x doing multiplication's
 * job, a bare "deg" instead of the degree ring, a fraction laid out as
 * "1/2" where STIX should set it as a stacked fraction. None of these are
 * WRONG maths — the pupil still gets the right number — but they read as
 * typing, not as print, and a subject that is taught partly through its own
 * notation cannot afford to look like it was knocked out in Notepad.
 *
 * THE TRAP, and why this file is careful: the same three characters (- * ^)
 * are constants of the language itself — CSS uses them in "font-family",
 * SVG paths use "-34" as a coordinate, "co-interior" is an ordinary English
 * hyphenated word, and a hex colour or a "14px" unit puts a digit next to a
 * letter with no maths intended at all. A first cut of this gate, run
 * against the shipped client files, flagged 89 imaginary faults — every one
 * of them a `style="font-family:Georgia,serif;...;border-radius:10px"`
 * string or a `'stroke-dashoffset 500ms linear'` transition value, because a
 * hex colour like #14213A or a unit like 1.7rem puts a letter next to a
 * digit and looks "maths-bearing" by a naive reading. That is L6: a gate
 * that invents a fault is worse than none. So a string only qualifies for
 * the ASCII-operator check once CSS units (px, rem, em, ms, pt, vh, vw, deg,
 * s, %) and hex colours are discounted from the "is there a digit touching a
 * letter" question — and even then, the operator itself must sit BETWEEN two
 * maths tokens (digit / letter / `)` / `(`), not merely somewhere in a long
 * string. Two shipped strings are recorded here as the permanent pass
 * controls this narrowing exists for:
 *     "min-width:84px;...;border:2px solid #7A3B5E;...;box-shadow:0 0 0 4px rgba(122,59,94,.10)"  (jotter.js)
 *     "stroke-dashoffset 500ms linear"  (jotter.js)
 * Neither may ever trip this gate again.
 *
 * The two locked packs (content-angles.js, content-algebra.js) are approved
 * (rule 30): their two genuine "1/2"-style fractions — both the wording
 * "Dividing by 4 gives x = 36/4 = 9" in the Algebra worked movie — are
 * REPORTED, never failed, and only the fraction rule is exempted for them;
 * the three hard rules below (ASCII operator, x-for-times, bare deg) still
 * apply in full even to the locked books, and pass clean today.
 */
'use strict';
const fs = require('fs');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'fast';
const ORDER = 26;
const COVERS = { books: '*', kinds: '*', surfaces: [], widths: [], projector: false, tier: ['preview'], cells: ['notation'] };
const CONTROLS = [
  { id: 'ascii-minus', kind: 'fixture', plant: 'fixture-book', mustFail: /ASCII/ },
  { id: 'x-for-times', kind: 'fixture', plant: 'fixture-book', mustFail: /multiplication/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-notation');
g.exempt([
  'a CSS/markup-shaped string literal (an HTML/SVG tag, an attr="value" fragment, a bare kebab id, or an inline style blob) is never checked for maths notation — it is plumbing, not a sentence a pupil reads',
  'the fraction-as-STIX rule is reported, never failed, for the two locked books (rule 30) — it is a design nicety on approved content, not a defect',
  'a hex colour and a CSS numeric unit (px, rem, em, ms, pt, vh, vw, deg, s, %) do not count as "a digit touching a letter" when deciding whether a string is maths-bearing',
  'a string that is nothing but "N/N" (jotter.js\'s mark-tally badges \'1/1\' and \'0/1\') is a score, not a fraction, and is not a fraction-notation finding'
]);

/* ---- a small scanner: pulls string-literal CONTENTS out of JS source ----
 * without mis-reading a quote that sits inside a regex literal. A plain
 * '...'|"..." regex looks right until the first /[&<>"]/-shaped regex in
 * script.js/jotter.js/staff.js, whose embedded " it reads as an opening
 * quote and then runs on for hundreds of characters of real code before it
 * finds another " to close on. That is a second, worse way to invent a
 * fault (a fabricated "string" full of ordinary code), so this scanner
 * tracks comments, strings and regex literals properly instead. */
function stringLiterals(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  function prevSignificant(upto) {
    let k = upto - 1;
    while (k >= 0 && /\s/.test(src[k])) k--;
    return k >= 0 ? src[k] : '';
  }
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { let j = src.indexOf('\n', i); i = j === -1 ? n : j + 1; continue; }
    if (c === '/' && src[i + 1] === '*') { let j = src.indexOf('*/', i + 2); i = j === -1 ? n : j + 2; continue; }
    if (c === "'" || c === '"') {
      const quote = c; let j = i + 1, buf = '';
      while (j < n && src[j] !== quote) {
        if (src[j] === '\\') { buf += src[j] + (src[j + 1] || ''); j += 2; continue; }
        if (src[j] === '\n') break;
        buf += src[j]; j++;
      }
      out.push(unescapeJs(buf));
      i = (j < n && src[j] === quote) ? j + 1 : j;
      continue;
    }
    if (c === '`') { let j = i + 1; while (j < n && src[j] !== '`') { if (src[j] === '\\') j++; j++; } i = j + 1; continue; }
    if (c === '/') {
      const prev = prevSignificant(i);
      const isDivision = /[A-Za-z0-9_$)\]]/.test(prev);
      if (!isDivision) {
        let j = i + 1, inClass = false, ok = false;
        while (j < n) {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === '\n') break;
          if (src[j] === '[') { inClass = true; j++; continue; }
          if (src[j] === ']') { inClass = false; j++; continue; }
          if (src[j] === '/' && !inClass) { ok = true; break; }
          j++;
        }
        if (ok) { j++; while (j < n && /[a-z]/i.test(src[j])) j++; i = j; continue; }
      }
    }
    i++;
  }
  return out;
}
function unescapeJs(s) { return s.replace(/\\(.)/g, (m, ch) => (ch === 'n' ? '\n' : ch === 't' ? '\t' : ch === 'r' ? '\r' : ch)); }

/* ---- is this literal plumbing (markup/CSS/id) rather than a sentence? --- */
/* a token-shape test, not a length test: real prose in this codebase is
 * always Sentence-cased (the house style), while every CSS value/keyword is
 * lowercase, a bare number+unit, a hex colour, or a var(--x) reference. A
 * string made ENTIRELY of such tokens (e.g. "stroke-dashoffset 500ms
 * linear") is plumbing; one containing even a single capitalised word is
 * kept, because that is what a written sentence looks like here. */
function isCssValueToken(t) {
  if (/^[a-z][a-z-]*$/.test(t)) return true;            // a lowercase css keyword/property
  if (/^[\d.]+[a-z%]*$/i.test(t)) return true;          // a number, optionally unit-suffixed
  if (/^#[0-9A-Fa-f]{3,8}$/.test(t)) return true;       // a hex colour
  if (/^var\(--[\w-]+\)$/.test(t)) return true;         // a css custom-property reference
  if (/^rgba?\(/i.test(t)) return true;                 // an rgb()/rgba() fragment
  return false;
}
function looksLikeMarkupOrCode(s) {
  if (/<[a-zA-Z!/]/.test(s)) return true;                 // an HTML/SVG tag
  if (/[a-zA-Z][\w-]*="/.test(s)) return true;             // attr="value"
  if (/^[a-z][a-z0-9-]*$/.test(s)) return true;            // a bare kebab id/key
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return true;          // a hex colour alone
  const tokens = s.trim().split(/\s+/);
  if (tokens.length && tokens.every(isCssValueToken)) return true;
  return false;
}

/* ---- maths-bearing: a digit genuinely touching a letter or an "=", once
 * CSS units and hex colours are discounted (see the header for why) ------ */
function mathsBearing(raw) {
  const s = raw
    .replace(/#[0-9A-Fa-f]{3,8}\b/g, '#')
    .replace(/\b\d+(\.\d+)?(px|rem|em|ms|pt|vh|vw|deg|s|%)\b/gi, '0');
  return /\d[a-zA-Z]|[a-zA-Z]\d|\d\s*=|=\s*\d/.test(s);
}

/* ---- the waived (locked) books: rule 30, read from the ledger, exactly as
 * qa-content-source.js reads it ------------------------------------------ */
const ledger = A.read(A.qa('MATHS_COVERAGE_DEBT.md'));
const waivedBooks = new Set();
ledger.split('\n').forEach(l => {
  const m = /^\|\s*([a-z0-9-]+)\s*×\s*([a-z-]+)\s*\|/.exec(l);
  if (m && /WAIVED BY HIS RULING/.test(l)) waivedBooks.add(m[1]);
});
g.note('locked (waived) books: ' + ([...waivedBooks].join(', ') || '(none)'));

/* ================================================================ RULES */
function checkAsciiOp(value, surface, path) {
  if (!mathsBearing(value)) return;
  const re = /([0-9A-Za-z)])\s*([\-*^])\s*([0-9A-Za-z(])/g;
  let m;
  while ((m = re.exec(value))) {
    const opName = m[2] === '-' ? 'minus sign (−)' : m[2] === '*' ? 'multiplication sign (×)' : 'exponent (²)';
    g.fail(surface + ' :: ' + path, 'notation',
      'an ASCII "' + m[2] + '" sits between "' + m[1] + '" and "' + m[3] + '" where the ' + opName + ' is meant — replace it with the proper symbol  [' + value.slice(0, 90) + ']');
  }
}
function checkBareDeg(value, surface, path) {
  const re = /\d\s*deg\b/gi;
  let m;
  while ((m = re.exec(value))) {
    g.fail(surface + ' :: ' + path, 'notation',
      'this uses the bare abbreviation "deg" after a number instead of the degree symbol ° — write the number followed by ° ' +
      '(a plain "N degrees" in words is fine and is not this fault)  [' + value.slice(0, 90) + ']');
  }
}
function checkXForTimes(value, surface, path) {
  const re = /\d\s*x\s*\d/g;
  let m;
  while ((m = re.exec(value))) {
    g.fail(surface + ' :: ' + path, 'notation',
      'this uses the letter x for multiplication ("' + m[0] + '") — use × instead, so it is never confused with the algebra letter x  [' + value.slice(0, 90) + ']');
  }
}
let fractionHitsLocked = 0, fractionHitsNew = 0;
function checkFraction(value, surface, path, book) {
  const re = /[0-9]\/[0-9]/;
  if (!re.test(value)) return;
  /* a string that IS, in its entirety, just "N/N" is a score tally or a
   * ratio badge (jotter.js prints the mark tally as a bare '1/1' / '0/1'
   * literal, concatenated with its surrounding text at runtime) — not a
   * fraction sitting inside a piece of maths prose. The one real case this
   * rule exists for, "Dividing by 4 gives x = 36/4 = 9", is always found
   * embedded in a longer sentence, never standing alone. */
  if (/^[0-9]+\/[0-9]+$/.test(value.trim())) return;
  const locked = book && waivedBooks.has(book);
  if (locked) { fractionHitsLocked++; return; }
  fractionHitsNew++;
  g.note('FINDING (new book, not a fail): ' + surface + ' :: ' + path + ' writes a fraction as "n/n" where STIX should set a stacked fraction  [' + value.slice(0, 90) + ']');
}

/* ================================================================ PACKS */
function walkPack(book, obj, path) {
  if (typeof obj === 'string') {
    if (looksLikeMarkupOrCode(obj)) return;
    checkAsciiOp(obj, book, path);
    checkBareDeg(obj, book, path);
    checkXForTimes(obj, book, path);
    checkFraction(obj, book, path, book);
    return;
  }
  if (Array.isArray(obj)) { obj.forEach((v, i) => walkPack(book, v, path + '[' + i + ']')); return; }
  if (obj && typeof obj === 'object') { Object.keys(obj).forEach(k => walkPack(book, obj[k], (path ? path + '.' : '') + k)); }
}
const C = A.content();
A.books().forEach(book => walkPack(book, C[book], book));
g.note(A.grid().length + ' questions checked across ' + A.books().length + ' book(s) for notation');

/* ========================================================= RENDER FILES */
A.renderFiles().forEach(f => {
  const name = f.split('/').pop();
  const src = fs.readFileSync(f, 'utf8');
  stringLiterals(src).forEach((value, i) => {
    if (looksLikeMarkupOrCode(value)) return;
    const path = '#' + i;
    checkAsciiOp(value, name, path);
    checkBareDeg(value, name, path);
    checkXForTimes(value, name, path);
    checkFraction(value, name, path, null);
  });
});

if (fractionHitsLocked) {
  g.note(fractionHitsLocked + ' fraction-as-"n/n" occurrence(s) found in locked book(s) (' + [...waivedBooks].join(', ') + ') — reported once here, not itemised and not failed (rule 30)');
}
if (!fractionHitsNew) g.note('no fraction-as-"n/n" findings in any new (non-waived) book');

g.done();
