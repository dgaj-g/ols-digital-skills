#!/usr/bin/env node
/* qa-text-damage.js — A MACHINE REWROTE THIS TEXT, AND THE REWRITE BROKE IT.
 *
 * FAULT: not a wrong answer and not bad notation — a sentence that a tool
 * (this one included) has visibly mangled while moving or rewriting it: a
 * tail left as "…" because the tool meant to say "unchanged from here" and
 * never came back to write the real words; two copies of the same six words
 * sitting inside one sentence because a splice kept both the old wording
 * and the new; a bold marker ("**") orphaned because only one side of a
 * pair survived an edit; a sentence quietly cut down to a fraction of its
 * approved length; or two near-identical sentences under the same field,
 * one of them edited and the other left as a fossil. Every one of these is
 * verified by a DERIVED signal, never by eye — "by eye" is exactly how the
 * damage got shipped in the first place.
 *
 * Every check below runs only over strings that look like something a
 * pupil or teacher would READ: a value containing at least one space. A
 * bare id, a dx code, a hex colour or a lone "…" used on purpose as a
 * "loading" placeholder (script.js sets a name span to '…' before the real
 * name arrives) never qualifies — none of those is a sentence a rewrite
 * tool could have damaged, and checking them invents findings out of
 * furniture (L6).
 *
 * TRUNCATION needs a BEFORE: the last approved commit for a book, derived
 * from MATHS_GATES_AUDIT.md by matching the same "MAIN Version N" phrase in
 * both its APPROVALS and PINNED REFS tables (never a hash typed into this
 * file — the number and the record of the number are one fact, DFM 144).
 * The base pack is read from that commit with `git show`, found by
 * searching that commit's OWN tree for a file named content-<book>.js
 * rather than assuming today's folder name — this worktree was renamed
 * from glass-jotter to mathshelf partway through this very build, and a
 * gate that hard-codes "maths/glass-jotter/…" would already be reading the
 * wrong tree. The base pack is then loaded in a CHILD process (its own
 * global.window, never this process's) so a stale global cannot leak
 * between the two versions being compared.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'fast';
const ORDER = 42;
const COVERS = { books: '*', kinds: '*', surfaces: [], widths: [], projector: false, tier: ['preview'], cells: ['strings'] };
const CONTROLS = [
  { id: 'tail-verbatim', kind: 'fixture', plant: 'fixture-book', mustFail: /begins with an ellipsis/ },
  { id: 'splice-duplication', kind: 'fixture', plant: 'fixture-book', mustFail: /appears twice/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-text-damage');
g.exempt([
  'a string with no whitespace in it (an id, a dx code, a hex colour, a lone "…" loading placeholder) is not prose and is not checked — a rewrite tool damages sentences, not tokens',
  'a book with no approved commit on record (a brand-new book) has nothing to compare against and is skipped for TRUNCATION only, with the skip printed on every run (DFM 213)',
  'the "prompt" and "start" fields are per-question instruction templates, not authored narrative — SURVIVOR REPORT does not compare them against each other (see the note at TEMPLATE_FIELDS)'
]);

/* ---- the same small string-literal scanner as qa-notation.js / qa-voice.js,
 * kept identical on purpose rather than shared, because the three files must
 * never be required at coverage-scan time (DFM 144's "not required()'d"
 * reasoning in decl.js applies here too) ---------------------------------- */
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

function isProse(s) { return typeof s === 'string' && /\s/.test(s); }

/* ---- id-keyed path walk: sections and questions are addressed by their
 * OWN id (s1, q7, …) rather than array index, so inserting a question
 * earlier in the book does not misalign every question after it when this
 * is later compared against a base version ------------------------------- */
function walkPack(obj, p, out) {
  if (typeof obj === 'string') { if (isProse(obj)) out.push({ path: p, value: obj }); return; }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      const key = (item && typeof item === 'object' && typeof item.id === 'string') ? item.id : String(i);
      walkPack(item, p + '[' + key + ']', out);
    });
    return;
  }
  if (obj && typeof obj === 'object') { Object.keys(obj).forEach(k => walkPack(obj[k], (p ? p + '.' : '') + k, out)); }
}

const C = A.content();
const currentByBook = {};
A.books().forEach(book => { const rows = []; walkPack(C[book], book, rows); currentByBook[book] = rows; });
const allPackRows = [].concat(...Object.keys(currentByBook).map(b => currentByBook[b]));

const renderRows = [];
A.renderFiles().forEach(f => {
  const name = f.split('/').pop();
  const src = fs.readFileSync(f, 'utf8');
  stringLiterals(src).forEach((v, i) => { if (isProse(v)) renderRows.push({ path: name + '#' + i, value: v }); });
});

g.note(allPackRows.length + ' pack strings and ' + renderRows.length + ' render-file strings qualify as prose (contain whitespace)');

/* ================================================== (1) TAIL-VERBATIM === */
function checkTailVerbatim(rows, label) {
  rows.forEach(r => {
    if (/^(…|\.\.\.)/.test(r.value)) {
      g.fail(label + ' :: ' + r.path, 'strings',
        'this sentence begins with an ellipsis — it looks like a rewrite tool meant "leave this as it was" and never came back to write the real words; write the sentence out in full  [' + r.value.slice(0, 90) + ']');
    }
  });
}
checkTailVerbatim(allPackRows, 'pack');
checkTailVerbatim(renderRows, 'render');

/* ================================================ (2) SPLICE DUPLICATE == */
function checkSplice(rows, label) {
  rows.forEach(r => {
    const words = r.value.split(/\s+/).filter(Boolean);
    if (words.length < 12) return;
    const seen = new Map();
    for (let i = 0; i + 6 <= words.length; i++) {
      const win = words.slice(i, i + 6).join(' ').toLowerCase();
      if (seen.has(win)) {
        g.fail(label + ' :: ' + r.path, 'strings',
          'the phrase "' + words.slice(i, i + 6).join(' ') + '" appears twice inside this one sentence — a splice kept both the old wording and the new; delete whichever copy no longer belongs  [' + r.value.slice(0, 100) + ']');
        return;
      }
      seen.set(win, i);
    }
  });
}
checkSplice(allPackRows, 'pack');
checkSplice(renderRows, 'render');

/* ================================================ (3) UNCLOSED ** ======= */
function checkUnclosedStars(rows, label) {
  rows.forEach(r => {
    const n = (r.value.match(/\*\*/g) || []).length;
    if (n % 2 === 1) {
      g.fail(label + ' :: ' + r.path, 'strings',
        'this string has an odd number of "**" markers, so one bold marker is left unclosed — pair it with its missing partner or remove the stray one  [' + r.value.slice(0, 90) + ']');
    }
  });
}
checkUnclosedStars(allPackRows, 'pack');
checkUnclosedStars(renderRows, 'render');

/* ================================================ (4) TRUNCATION ======== */
function approvedRefs() {
  const md = A.read(A.qa('MATHS_GATES_AUDIT.md'));
  const apprStart = md.indexOf('## APPROVALS');
  const apprEnd = md.indexOf('\n## ', apprStart + 1);
  const apprSection = apprStart >= 0 ? md.slice(apprStart, apprEnd >= 0 ? apprEnd : undefined) : '';
  const pinStart = md.indexOf('## PINNED REFS');
  const pinEnd = md.indexOf('\n## ', pinStart + 1);
  const pinSection = pinStart >= 0 ? md.slice(pinStart, pinEnd >= 0 ? pinEnd : undefined) : '';

  const versionOf = {};   /* book (lowercase) -> "MAIN Version 25" */
  apprSection.split('\n').forEach(l => {
    const m = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/.exec(l);
    if (!m) return;
    const thing = m[1].trim(), status = m[2].trim();
    if (!/APPROVED/.test(status)) return;
    const v = /([A-Za-z]+ Version \d+)/.exec(status);
    const book = (/^([A-Za-z]+)/.exec(thing) || [])[1];
    if (v && book) versionOf[book.toLowerCase()] = v[1];
  });

  const refOfVersion = {};
  pinSection.split('\n').forEach(l => {
    const m = /^\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/.exec(l);
    if (!m) return;
    const ref = m[1], desc = m[2];
    const v = /([A-Za-z]+ Version \d+)/.exec(desc);
    if (v && /behaviour reference/.test(desc)) refOfVersion[v[1]] = ref;
  });

  const out = {};
  Object.keys(versionOf).forEach(book => { const ref = refOfVersion[versionOf[book]]; if (ref) out[book] = ref; });
  return out;
}

function repoRootFrom(dir) {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, encoding: 'utf8' }).trim(); }
  catch (e) { return null; }
}
function findPathAtRef(root, ref, basename) {
  let out;
  try { out = execFileSync('git', ['ls-tree', '-r', '--name-only', ref], { cwd: root, encoding: 'utf8', maxBuffer: 32e6 }); }
  catch (e) { return null; }
  const hit = out.split('\n').find(p => p === basename || p.slice(-(basename.length + 1)) === '/' + basename);
  return hit || null;
}

const CHILD_LOADER = "'use strict';\n" +
  "var fs = require('fs');\n" +
  "var mathcorePath = process.argv[2], anglecorePath = process.argv[3], packPath = process.argv[4], book = process.argv[5];\n" +
  "global.window = global;\n" +
  "try { require(mathcorePath); } catch (e) {}\n" +
  "try { require(anglecorePath); } catch (e) {}\n" +
  "require(packPath);\n" +
  "var C = global.GJ_CONTENT || {};\n" +
  "var rows = [];\n" +
  "function walk(obj, p) {\n" +
  "  if (typeof obj === 'string') { if (/\\s/.test(obj)) rows.push({ path: p, value: obj }); return; }\n" +
  "  if (Array.isArray(obj)) { obj.forEach(function (item, i) { var key = (item && typeof item === 'object' && typeof item.id === 'string') ? item.id : String(i); walk(item, p + '[' + key + ']'); }); return; }\n" +
  "  if (obj && typeof obj === 'object') { Object.keys(obj).forEach(function (k) { walk(obj[k], (p ? p + '.' : '') + k); }); }\n" +
  "}\n" +
  "walk(C[book], book);\n" +
  "process.stdout.write(JSON.stringify(rows));\n";

const baseCache = {};
function loadBaseStrings(book, ref) {
  if (Object.prototype.hasOwnProperty.call(baseCache, book)) return baseCache[book];
  const root = repoRootFrom(A.APP);
  if (!root) return (baseCache[book] = { skip: 'could not resolve the repo root from git' });
  const basename = 'content-' + book + '.js';
  const histPath = findPathAtRef(root, ref, basename);
  if (!histPath) return (baseCache[book] = { skip: 'no ' + basename + ' found anywhere in the tree at ' + ref });
  let src;
  try { src = execFileSync('git', ['show', ref + ':' + histPath], { cwd: root, encoding: 'utf8', maxBuffer: 32e6 }); }
  catch (e) { return (baseCache[book] = { skip: 'git show ' + ref + ':' + histPath + ' failed' }); }
  A.ensureOut();
  const tmpPack = A.out('text-damage-base-' + book + '.js');
  const tmpLoader = A.out('text-damage-loader.js');
  fs.writeFileSync(tmpPack, src, 'utf8');
  fs.writeFileSync(tmpLoader, CHILD_LOADER, 'utf8');
  const r = spawnSync(process.execPath, [tmpLoader, A.app('mathcore.js'), A.app('anglecore.js'), tmpPack, book],
    { encoding: 'utf8', maxBuffer: 32e6 });
  if (r.status !== 0 || !r.stdout) {
    const firstErr = ((r.stderr || '').split('\n')[0] || 'unknown error').slice(0, 140);
    return (baseCache[book] = { skip: 'the base pack for ' + book + ' (' + ref + ') would not load under the current engines: ' + firstErr });
  }
  try { return (baseCache[book] = { rows: JSON.parse(r.stdout) }); }
  catch (e) { return (baseCache[book] = { skip: 'could not parse the base pack output for ' + book }); }
}

const refs = approvedRefs();
g.note('base refs derived from MATHS_GATES_AUDIT.md: ' + (Object.keys(refs).length ? Object.keys(refs).map(b => b + '=' + refs[b]).join(', ') : '(none found)'));

A.books().forEach(book => {
  const ref = refs[book];
  if (!ref) { g.note('TRUNCATION skipped for "' + book + '" — no approved base commit on record (a new book)'); return; }
  const base = loadBaseStrings(book, ref);
  if (base.skip) { g.note('TRUNCATION skipped for "' + book + '" — ' + base.skip); return; }
  const baseMap = new Map(base.rows.map(r => [r.path, r.value]));
  let compared = 0;
  (currentByBook[book] || []).forEach(r => {
    if (!baseMap.has(r.path)) return;
    const baseVal = baseMap.get(r.path);
    if (!baseVal || !isProse(baseVal)) return;
    compared++;
    if (r.value.length < 0.62 * baseVal.length) {
      g.fail(book + ' :: ' + r.path, 'strings',
        'this text is now only ' + Math.round(100 * r.value.length / baseVal.length) + '% as long as the version approved at ' + ref + ' — it looks cut short; compare it against that version and restore what is missing  [now: "' + r.value.slice(0, 60) + '" | was: "' + baseVal.slice(0, 60) + '"]');
    }
  });
  g.note('TRUNCATION: ' + book + ' vs ' + ref + ' — ' + compared + ' matching strings compared');
});

/* ============================================== (5) SURVIVOR REPORT ===== */
/* normalised LEVENSHTEIN, not a token-overlap ratio: a first cut used a
 * Jaccard set-overlap of lower-cased word tokens, and it called "a = 4
 * b = 7 c = 3" and "a(b − c) = 4 × (7 − 3)" 100% the same — both true
 * sentences, but sharing the same small alphabet of single letters and
 * digits is not the same as being the same sentence, and a movie script's
 * "write.text" lines are exactly this short and this symbol-dense. Edit
 * distance cares about ORDER as well as vocabulary, so it correctly scores
 * that pair around 0.37 instead of 1.0, while still catching a genuine
 * near-duplicate ("Good — equals signs lined up." vs "Good, equals signs
 * lined up.", ~0.93) — the class of thing this rule exists to find. */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = new Array(n + 1); for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = new Array(n + 1); cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    prev = cur;
  }
  return prev[n];
}
function similarity(a, b) {
  const longest = Math.max(a.length, b.length, 1);
  return 1 - levenshtein(a, b) / longest;
}
function fieldNameOf(p) { return (/([A-Za-z0-9_]+)$/.exec(p) || [p])[0]; }

/* "prompt" and "start" are PER-QUESTION INSTRUCTION TEMPLATES, not authored
 * narrative prose — a maths exercise family is SUPPOSED to read "Solve the
 * equation {…}. You must show your working." on every question in a
 * section, or "Work out the size of angle {w/s/…}." across a diagram
 * family, with only the embedded equation or target letter differing. The
 * first cut of this check compared every prompt against every other prompt
 * in the book and flagged eleven pairs at 90-99% similar — real questions
 * with real, different numbers, correctly template-similar by design, not
 * damage (L6). Genuine authored narrative (walt, title, sub, the movie's
 * say/note/stamp text, cans[] and the reason bank) has no such template and
 * keeps the check. */
const TEMPLATE_FIELDS = new Set(['prompt', 'start']);

A.books().forEach(book => {
  const groups = new Map();
  (currentByBook[book] || []).forEach(r => {
    const fn = fieldNameOf(r.path);
    if (TEMPLATE_FIELDS.has(fn)) return;
    if (!groups.has(fn)) groups.set(fn, []);
    groups.get(fn).push(r);
  });
  groups.forEach((list, fn) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.value === b.value) continue;
        if (a.value.length < 20 || b.value.length < 20) continue;
        const ratio = similarity(a.value, b.value);
        if (ratio >= 0.90) {
          g.fail(book + ' :: ' + a.path + ' / ' + b.path, 'strings',
            'these two "' + fn + '" strings are ' + Math.round(ratio * 100) + '% the same words — it looks like the sentence was written twice and only one copy was updated; check which is current and delete the other  [A: "' + a.value.slice(0, 60) + '" | B: "' + b.value.slice(0, 60) + '"]');
        }
      }
    }
  });
});

g.done();
