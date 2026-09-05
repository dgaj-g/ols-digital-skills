#!/usr/bin/env node
/* qa-voice.js — A TAGLINE, A DEAD NAME OR THE DESIGN LANGUAGE, REACHING A SCREEN.
 *
 * FAULT: a sentence that talks about the app instead of the maths — a
 * tagline ("Every line earns its mark"), a pedagogy word, an exam-board
 * term (examiner, mark scheme, M/A) a pupil should never have to decode, a
 * dead product name (Glass Jotter, DigiMaths, Longhand, "Squared" as a
 * brand), or an internal design word (pencil/ink as the marking metaphor,
 * mathcore/anglecore/statcore/statchart as engine names, quartileRule /
 * curveRule as rule names, "line 3" or "Ex1.Q1" as internal addressing) that
 * a pupil or teacher was never meant to read. The hardest version of this
 * fault is a phrase split across two string literals — it greps to nothing
 * in the source and still renders perfectly once the two halves meet on
 * screen — so this gate also reads the BUILT artefact, server/Index.html,
 * where such a split has already had the chance to become one contiguous
 * piece of text.
 *
 * THE SAME CARE AS qa-notation.js applies to WHERE a word is allowed to
 * live: "btn-pencil" is a CSS class name argument, never a sentence, and
 * "mathcore"/"anglecore" as `<script src="…">` filenames are plumbing, not
 * a screen — so this gate never scans raw index.html source (it is not in
 * A.renderFiles() and is not the built artefact), and it skips any string
 * literal that is entirely CSS/markup-shaped by the same test qa-notation
 * uses. What is left after that filter is exactly the kind of sentence a
 * pupil or teacher would read.
 *
 * THE REBRAND IS MID-FLIGHT AS THIS GATE IS WRITTEN: the folder this app
 * lives in was renamed from glass-jotter to mathshelf, and the source no
 * longer contains the words "Glass Jotter" anywhere — but the built title
 * reads "MathShelf — OLS Maths", not the exact required "OLS — MathShelf".
 * That is still the expected red this gate reports (see the run notes),
 * just not for the reason this file's own comments first assumed.
 */
'use strict';
const fs = require('fs');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'fast';
const ORDER = 43;
const COVERS = { books: '*', kinds: '*', surfaces: [], widths: [], projector: false, tier: ['preview', 'built'], cells: ['voice'] };
const CONTROLS = [
  { id: 'split-literal-in-built-artefact', kind: 'fixture', plant: 'fixture-strings', mustFail: /reaches the built artefact/ },
  { id: 'dead-name', kind: 'fixture', plant: 'fixture-strings', mustFail: /Glass Jotter/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-voice');
g.exempt([
  'index.html (the dev-mode shell with <script src="mathcore.js"> etc.) is never scanned by this gate — it is not in A.renderFiles() and it is not the built artefact, so a filename in a script tag is plumbing, not a screen',
  'a CSS/markup-shaped string literal (an HTML/SVG tag, an attr="value" fragment, a bare kebab id, or a pure CSS value like "btn-pencil") is skipped by the same test qa-notation.js uses — a class name is never a sentence'
]);

/* ---- the same small string-literal scanner as qa-notation.js /
 * qa-text-damage.js (kept identical rather than shared — see qa-text-damage
 * for why these three files each carry their own copy) ------------------- */
function stringLiterals(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  function prevSignificant(upto) { let k = upto - 1; while (k >= 0 && /\s/.test(src[k])) k--; return k >= 0 ? src[k] : ''; }
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

function isCssValueToken(t) {
  if (/^[a-z][a-z-]*$/.test(t)) return true;
  if (/^[\d.]+[a-z%]*$/i.test(t)) return true;
  if (/^#[0-9A-Fa-f]{3,8}$/.test(t)) return true;
  if (/^var\(--[\w-]+\)$/.test(t)) return true;
  if (/^rgba?\(/i.test(t)) return true;
  return false;
}
function looksLikeMarkupOrCode(s) {
  if (/<[a-zA-Z!/]/.test(s)) return true;
  if (/[a-zA-Z][\w-]*="/.test(s)) return true;
  if (/^[a-z][a-z0-9-]*$/.test(s)) return true;
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return true;
  const tokens = s.trim().split(/\s+/);
  if (tokens.length && tokens.every(isCssValueToken)) return true;
  return false;
}

/* =========================================== THE BANNED-PHRASE TABLE ==== */
const RULES = [
  { name: 'Glass Jotter', test: s => /glass jotter/i.test(s), why: 'names the old product, "Glass Jotter" — the app is called MathShelf now' },
  { name: 'Longhand', test: s => /\blonghand\b/i.test(s), why: 'names the old "Longhand" mode by its internal name' },
  { name: 'Squared (product name)', test: s => /(^|\bthe\s+)Squared\b/.test(s), why: 'uses "Squared" in a title/brand position rather than as the ordinary maths word — worth checking whether this is a leftover product name' },
  { name: 'DigiMaths', test: s => /\bDigiMaths\b/i.test(s), why: 'names a dead product, "DigiMaths"' },
  { name: 'every line earns (tagline)', test: s => /every line earns/i.test(s), why: 'reads as a tagline for the app\'s own philosophy rather than plain feedback — no taglines on a pupil or teacher screen' },
  { name: 'pedagogy', test: s => /\bpedagogy\b/i.test(s), why: 'names the teaching philosophy directly — that belongs in the teacher guide, never on a screen' },
  { name: 'examiner', test: s => /\bexaminer\b/i.test(s), why: 'uses exam-board register ("examiner") a pupil should never have to decode' },
  { name: 'the press', test: s => /\bthe press\b/i.test(s), why: 'names an internal design term, "the press"' },
  { name: 'fair copy', test: s => /\bfair copy\b/i.test(s), why: 'names an internal design term, "fair copy"' },
  { name: 'Is this you', test: s => /is this you\b/i.test(s), why: 'uses a flow that was retired (rule 14) — "Is this you?" should not still be reachable' },
  { name: 'mark scheme', test: s => /\bmark scheme\b/i.test(s), why: 'uses exam-board register ("mark scheme") a pupil should never have to decode' },
  { name: 'M/A', test: s => /\bM\/A\b/.test(s), why: 'shows the raw Method/Accuracy mark-scheme code instead of a plain-English word' },
  { name: 'AMBER (bare status word)', test: s => /\bAMBER\b/.test(s), why: 'shows the raw internal status word AMBER instead of a plain-English sentence' },
  { name: 'line N (internal addressing)', test: s => /\bline\s+\d+\b/i.test(s), why: 'names an internal working-line number instead of describing the step in words' },
  { name: 'Ex1.Q1 (internal numbering)', test: s => /\bEx\d+\.Q\d+\b/i.test(s), why: 'uses the internal exercise/question numbering shorthand instead of plain language' },
  { name: 'statcore', test: s => /\bstatcore\b/i.test(s), why: 'names an internal engine file, statcore' },
  { name: 'statchart', test: s => /\bstatchart\b/i.test(s), why: 'names an internal engine file, statchart' },
  { name: 'mathcore', test: s => /\bmathcore\b/i.test(s), why: 'names an internal engine file, mathcore' },
  { name: 'anglecore', test: s => /\banglecore\b/i.test(s), why: 'names an internal engine file, anglecore' },
  { name: 'quartileRule', test: s => /\bquartileRule\b/i.test(s), why: 'names an internal rule function, quartileRule' },
  { name: 'curveRule', test: s => /\bcurveRule\b/i.test(s), why: 'names an internal rule function, curveRule' },
  { name: 'pencil (design metaphor)', test: s => /\bpencil\b/i.test(s), why: 'uses the internal pencil/ink marking metaphor as if the pupil or teacher already knows it' },
  { name: 'ink (design metaphor)', test: s => /\bink\b/i.test(s), why: 'uses the internal pencil/ink marking metaphor as if the pupil or teacher already knows it' }
];

function scanString(value, surface, path) {
  if (looksLikeMarkupOrCode(value)) return;
  RULES.forEach(rule => {
    if (rule.test(value)) {
      g.fail(surface + ' :: ' + path, 'voice', 'this text ' + rule.why + '  [' + value.slice(0, 100) + ']');
    }
  });
}

/* ================================================================ PACKS */
function walkPack(book, obj, p) {
  if (typeof obj === 'string') { scanString(obj, book, p); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => walkPack(book, v, p + '[' + i + ']')); return; }
  if (obj && typeof obj === 'object') { Object.keys(obj).forEach(k => walkPack(book, obj[k], (p ? p + '.' : '') + k)); }
}
const C = A.content();
A.books().forEach(book => walkPack(book, C[book], book));

/* ========================================================= RENDER FILES */
A.renderFiles().forEach(f => {
  const name = f.split('/').pop();
  const src = fs.readFileSync(f, 'utf8');
  stringLiterals(src).forEach((v, i) => scanString(v, name, '#' + i));
});

/* ==================================================== THE BUILT ARTEFACT */
const builtPath = A.app('server/Index.html');
if (A.exists(builtPath)) {
  const html = A.read(builtPath);

  const titleM = /<title>([\s\S]*?)<\/title>/i.exec(html);
  const decode = t => t.replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
  const title = titleM ? decode(titleM[1]) : null;
  g.check(title === 'OLS — MathShelf', 'server/Index.html <title>', 'voice',
    (title == null ? 'the built page has no <title> at all' : 'the page title reads "' + title + '"') +
    ' — once the rebrand is complete it must read exactly "OLS — MathShelf"');

  const metaM = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html);
  if (metaM) scanString(decode(metaM[1]), 'built', '<meta name="description">');
  else g.note('server/Index.html has no <meta name="description"> tag to check');

  /* string literals inside every embedded <script> block */
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let sm, blockIdx = 0, scriptLiteralCount = 0;
  while ((sm = scriptRe.exec(html))) {
    stringLiterals(sm[1]).forEach((v, i) => { scriptLiteralCount++; scanString(v, 'built-script', 'block' + blockIdx + '#' + i); });
    blockIdx++;
  }
  g.note(scriptLiteralCount + ' string literals scanned across ' + blockIdx + ' embedded <script> block(s) in the built artefact');

  /* visible markup text outside any <script>/<style>/comment — this is
     where two adjacent literals concatenated by the build would show up as
     one contiguous phrase even though neither source literal alone
     contains the banned words */
  let bodyText = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  bodyText = decode(bodyText);
  RULES.forEach(rule => {
    if (rule.test(bodyText)) {
      g.fail('built markup text', 'voice', 'this text ' + rule.why + ' — found as contiguous text in the built artefact\'s markup, outside any script (this is exactly how a phrase split across two string literals reaches the built artefact and renders whole)');
    }
  });
} else {
  g.note('server/Index.html does not exist — the built-artefact half of this gate is skipped until it is built');
}

g.done();
