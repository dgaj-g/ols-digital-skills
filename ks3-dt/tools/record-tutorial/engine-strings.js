#!/usr/bin/env node
/* engine-strings.js — THE INVENTORY BEHIND `ENGINE_STRINGS_DEBT.md`
   (L4_SIT_FIXES_SPEC Part E 7c; audit gap G1).
 *
 * WHY IT EXISTS. Rule 172's own words are "everything you write that explains
 * something to a child". The language gate reads CONTENT — so any sentence
 * written as a string literal inside engine code is invisible to it, has no
 * read-aloud record, and can never be caught by a banned-word sweep. Damien met
 * four of those on the Lesson 4 case card ("Two halves, remember…", "Stuck?
 * Start the clue routine", "Only one kind of proof counts…", and a step-3 lead
 * that never said where the log box was). Nothing had ever listed them.
 *
 * So this walks the pupil-path engine sources and prints EVERY string literal of
 * four or more words, marked:
 *   MIGRATED    — the literal is a FALLBACK behind a config lookup
 *                 (`cfg.x || 'text'`, `esc(v.title || 'text')`): content owns
 *                 the words, the gate and the ledger see them.
 *   OUTSTANDING — a bare literal. The child reads it; no gate does.
 *
 * It is an INVENTORY, not a gate: nothing here fails a build. Its job is that
 * no pupil-facing sentence stays invisible WITHOUT BEING ON A LIST — which is
 * exactly the difference between a known debt and a rotting one (DFM 178c).
 *
 * Usage:  node engine-strings.js            (rewrites ENGINE_STRINGS_DEBT.md)
 *         node engine-strings.js --print    (stdout only)
 */
const fs = require('fs');
const path = require('path');

const PLATFORM = path.join(__dirname, '../../platform');
const OUT = path.join(__dirname, '../../ENGINE_STRINGS_DEBT.md');
const SOURCES = ['engines.js', 'app.js'];

/* Not pupil prose: selectors, classes, keys, urls, ARIA plumbing, dev noise.
   Erring towards INCLUDING is deliberate — a false entry costs one glance, a
   missed one costs a child a screen she cannot read. */
const NOISE = [
  /^[.#][a-z-]/i, /^[a-z-]+(\s[a-z-]+)*$/i.source ? null : null,
  /^https?:/i, /^[a-z0-9-]+\/[a-z0-9-]/i, /^\d/, /^[A-Z_]+$/,
  /[<>]/, /^\s*$/, /^[a-z]+([A-Z][a-z]+)+$/, /^--/, /^\/[a-z]/i
].filter(Boolean);
const looksLikeCode = (s) =>
  NOISE.some(rx => rx.test(s)) ||
  /^[a-z-]+( [a-z-]+)*$/.test(s) && !/[.!?,;:']/.test(s) && s.split(' ').length <= 6 && /-/.test(s);

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

/* which engine a line belongs to: the nearest `Engines.<name> = {` above it */
function engineIndex(src) {
  const lines = src.split('\n');
  const marks = [];
  lines.forEach((l, i) => {
    const m = /^\s*Engines\.([A-Za-z0-9_]+)\s*=/.exec(l);
    if (m) marks.push({ line: i, name: m[1] });
  });
  return (i) => {
    let cur = '(shared / app shell)';
    for (const mk of marks) { if (mk.line <= i) cur = 'Engines.' + mk.name; else break; }
    return cur;
  };
}

/* A SMALL SOURCE READER, and it needs one thing qa-language's scanSource does
   not: REGEX AWARENESS. `str.replace(/["'<>&]/g, ...)` contains a quote, and a
   scanner without regex handling walks into it and reports half a regular
   expression as a sentence a child reads. (It did, on the first run:
   "']/g, function (c) {".) Comments are blanked, strings are marked, and a `/`
   is read as a regex only where a value cannot legally appear. */
function scanCode(src) {
  const n = src.length;
  const spans = [];              // {start, end, text} for each string literal
  let i = 0, prev = '';
  const prevMeaningful = () => prev;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '/' && /[(,=:[!&|?{};+\-*%~^]|^$|return|typeof|case/.test(prevMeaningful())) {
      /* a regex literal: skip to its unescaped closing slash */
      let k = i + 1, cls = false;
      while (k < n) {
        if (src[k] === '\\') { k += 2; continue; }
        if (src[k] === '[') cls = true;
        else if (src[k] === ']') cls = false;
        else if (src[k] === '/' && !cls) { k++; break; }
        else if (src[k] === '\n') break;
        k++;
      }
      i = k; prev = '/'; continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const q = c; let k = i + 1, buf = '';
      while (k < n) {
        if (src[k] === '\\') { buf += src[k + 1] === 'n' ? ' ' : src[k + 1]; k += 2; continue; }
        if (src[k] === q) break;
        buf += src[k]; k++;
      }
      spans.push({ start: i, text: buf });
      i = k + 1; prev = 'STR'; continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return spans;
}
const lineOf = (src, pos) => src.slice(0, pos).split('\n').length;

/* WAIVED BY HIS RULING — literals he has SETTLED as shipped, so they are counted
   and printed for ever without ever becoming a to-do (DFM 255, 23 Aug 2026:
   "no just leave lesson 1 alone"). Matched on the TEXT rather than on a line
   number, because a line number moves the next time anybody edits the file above
   it and a waiver that drifts onto a different sentence is worse than none.
   Every row carries the ruling and its date, so the count stays honest. */
const WAIVED = [
  { rule: 'DFM 255', dated: '23 August 2026',
    why: 'Lesson 1\'s vault engine — HIS RULING, "no just leave lesson 1 alone"',
    texts: [
      '&#127919; Solo run cleared by HQ &mdash; reason each drop out in your head first.',
      '&#127919; HQ closed the channel &mdash; finish the Vault on your own. Everything you have filed is safe.',
      'HQ closed the channel &mdash; carry on solo, nothing is lost.'
    ] }
];
const waivedText = (t) => WAIVED.find(w => w.texts.indexOf(String(t).trim()) !== -1) || null;

/* MIGRATED = content owns the words and the engine literal is only the fallback.
   Two shapes count, and both are real in this codebase:
     cfg.x || 'text'              the casework pattern (round 4)
     S('key', 'text')             the studio/gallery pattern (L5 spec Part D2)
   The second was invisible to the first version of this file, so a migration
   that had actually happened still read as 32 OUTSTANDING rows. A debt list
   that cannot see work being done is a debt list nobody will trust. */
const isFallback = (line, at) => {
  const before = line.slice(0, at);
  return /(\|\|\s*)$/.test(before) ||
    /(\|\|\s*\()$/.test(before) ||
    /S\(\s*'[^']+'\s*,\s*$/.test(before) ||
    /S\(\s*"[^"]+"\s*,\s*$/.test(before) ||
    /\?\s*$/.test(before) && /\|\|/.test(line);
};

let rows = [];
SOURCES.forEach(file => {
  const p = path.join(PLATFORM, file);
  if (!fs.existsSync(p)) return;
  const src = fs.readFileSync(p, 'utf8');
  const whose = engineIndex(src);
  const lines = src.split('\n');
  scanCode(src).forEach(sp => {
    const t = sp.text.trim();
    if (words(t) < 4) return;
    if (looksLikeCode(t)) return;
    if (!/[a-z]{3}/i.test(t)) return;
    const ln = lineOf(src, sp.start);
    const line = lines[ln - 1] || '';
    const col = sp.start - (src.lastIndexOf('\n', sp.start - 1) + 1);
    rows.push({
      file, line: ln, engine: whose(ln - 1), text: t,
      state: waivedText(t) ? 'WAIVED' : (isFallback(line, col) ? 'MIGRATED' : 'OUTSTANDING')
    });
  });
});

const byEngine = {};
rows.forEach(r => { (byEngine[r.engine] = byEngine[r.engine] || []).push(r); });
const order = Object.keys(byEngine).sort((a, b) =>
  byEngine[b].filter(r => r.state === 'OUTSTANDING').length -
  byEngine[a].filter(r => r.state === 'OUTSTANDING').length);

const out = [];
out.push('# ENGINE_STRINGS_DEBT — every pupil sentence that lives in code, not content');
out.push('');
out.push('> GENERATED by `ks3-dt/tools/record-tutorial/engine-strings.js`. Do not hand-edit —');
out.push('> re-run it after any engine change and commit the result.');
out.push('');
out.push('Rule 172 covers "everything you write that explains something to a child". The');
out.push('language gate reads CONTENT, so a sentence written as a literal inside an engine is');
out.push('invisible to it: no banned-word sweep, no read-aloud record, no ledger. Damien met');
out.push('four of these on one Lesson 4 card. This file is the list, so the debt is known');
out.push('rather than merely unnoticed (audit gap G1).');
out.push('');
out.push('**MIGRATED** = the literal is only a FALLBACK behind a config lookup — content owns');
out.push('the words and the gate sees them. **OUTSTANDING** = a bare literal the child reads');
out.push('and no gate does. **WAIVED** = he has SETTLED the wording as shipped, so it is');
out.push('counted and printed for ever and is never a to-do (the ruling and its date are below).');
out.push('');
const totalOut = rows.filter(r => r.state === 'OUTSTANDING').length;
const totalWaived = rows.filter(r => r.state === 'WAIVED').length;
out.push('| | count |');
out.push('|---|---|');
out.push('| literals of 4+ words on pupil paths | ' + rows.length + ' |');
out.push('| MIGRATED (content owns the words) | ' + (rows.length - totalOut - totalWaived) + ' |');
out.push('| WAIVED BY HIS RULING (settled, never a to-do) | ' + totalWaived + ' |');
out.push('| **OUTSTANDING** | **' + totalOut + '** |');
out.push('');
/* THE WAIVER TABLE, printed loudly rather than folded into the counts. A waiver
   that could be granted silently would be the end of the inventory (the
   qa-harness-coverage precedent, DFM 222b). */
WAIVED.forEach(w => {
  const found = rows.filter(r => r.state === 'WAIVED' && w.texts.indexOf(String(r.text).trim()) !== -1);
  out.push('> **WAIVED BY HIS RULING ' + w.dated + ' — ' + w.rule + ':** ' + w.why + '.');
  out.push('> ' + found.length + ' of ' + w.texts.length + ' literal(s) matched in the source. ' +
    (found.length === w.texts.length ? 'All of them are still where the ruling left them.'
      : '**A WAIVED LITERAL HAS MOVED OR CHANGED — check before trusting this count.**'));
  found.forEach(r => out.push('> · `' + r.file + ':' + r.line + '` ' + r.text));
  out.push('');
});
order.forEach(eng => {
  const list = byEngine[eng];
  const outs = list.filter(r => r.state === 'OUTSTANDING');
  out.push('## ' + eng + ' — ' + outs.length + ' outstanding of ' + list.length);
  out.push('');
  out.push('| state | line | sentence |');
  out.push('|---|---|---|');
  list.sort((a, b) => a.line - b.line).forEach(r => {
    out.push('| ' + r.state + ' | `' + r.file + ':' + r.line + '` | ' +
      r.text.replace(/\|/g, '\\|').slice(0, 150) + ' |');
  });
  out.push('');
});

if (process.argv.includes('--print')) {
  console.log(out.join('\n'));
} else {
  fs.writeFileSync(OUT, out.join('\n') + '\n');
  console.log('wrote ' + path.relative(path.join(__dirname, '../..'), OUT) +
    ' — ' + rows.length + ' literal(s), ' + totalOut + ' OUTSTANDING');
}
