#!/usr/bin/env node
/* qa-strings-ledger.js — EVERY SENTENCE A PERSON READS IS A SENTENCE A GATE READS.
 *
 * G-D1 / DFM 172. THE FAULT CLASS, in his words about the KS3 DT platform: a
 * sentence hardcoded inside a renderer that no language gate ever saw. "Found
 * the studio" and "Exit check — part 2" walked onto a new card and nothing
 * caught them, because the language machinery read the CONTENT and those
 * sentences were in the CODE.
 *
 * The maths platform has the same hole and it is bigger: the comments a pupil
 * reads after marking, the misconception names her teacher reads, the self-eval
 * chips, the placeholders, the busy cards, the error lines and every button
 * label live in jotter.js, staff.js, script.js and player.js.
 *
 * THE LAW (rule 23): every pupil- or teacher-facing sentence lives in a content
 * pack or in one strings.js (window.GJ_STRINGS, two tables: pupil and teacher).
 * COMMENTS, DX_NAMES and SELF_EVAL_TRIPS stay where they are and are read AS
 * TABLES. Every other literal on a render path is OUTSTANDING until it moves.
 *
 * At the v4 DONE list, OUTSTANDING is zero and the ratchet becomes "no new
 * literal" — which is the only form of this rule that survives the next build.
 */
'use strict';
const fs = require('fs');
const A = require('./lib/app.js');
const { Gate, matrix } = require('./lib/report.js');
const { stripComments } = require('./lib/decl.js');
const { sha1 } = require('./lib/hash.js');

const TIER = 'fast';
const ORDER = 40;
const COVERS = { books: '*', kinds: '*', surfaces: '*', widths: [], projector: false, tier: ['preview', 'built'], cells: ['strings'] };
const CONTROLS = [
  { id: 'literal-on-a-render-path', kind: 'fixture', plant: 'fixture-strings', mustFail: /no gate reads/ },
  { id: 'ledger-row-for-a-string-that-is-gone', kind: 'fixture', plant: 'fixture-ledger', mustFail: /no longer anywhere in the client/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-strings-ledger');
g.exempt([
  'the three named tables (COMMENTS, DX_NAMES, SELF_EVAL_TRIPS) stay in their files and are read as tables by qa-language - they are MIGRATED, not outstanding',
  'a literal with no letters in it, or shorter than three characters, is not a sentence',
  'a class name, a selector, an element name, an attribute name, a URL, a colour and a key of an internal map are not sentences: they are recognised by shape and printed as the exemption they are'
]);

/* ---- what counts as a render path -------------------------------------- */
/* Each pattern is a place the client puts words on a screen. They are the ways
   this codebase actually renders text - found by reading it, and each one is
   the reason a real sentence was invisible until now. */
const RENDER = [
  { id: 'el(...)', re: /\bel\(\s*'[^']*'\s*,\s*(?:'[^']*'|null)\s*,\s*(?:esc\()?\s*'((?:[^'\\]|\\.)*)'/g },
  { id: '.textContent =', re: /\.textContent\s*=\s*'((?:[^'\\]|\\.)*)'/g },
  { id: '.innerHTML =', re: /\.innerHTML\s*=\s*'((?:[^'\\]|\\.)*)'/g },
  { id: 'placeholder', re: /placeholder\s*=\s*'((?:[^'\\]|\\.)*)'/g },
  { id: 'aria-label', re: /setAttribute\(\s*'aria-label'\s*,\s*'((?:[^'\\]|\\.)*)'/g },
  { id: 'title', re: /\btitle\s*=\s*'((?:[^'\\]|\\.)*)'/g },
  { id: 'busyCard', re: /busyCard\(\s*'((?:[^'\\]|\\.)*)'/g },
  { id: 'msg', re: /\bmsg(?:El)?\.textContent\s*=\s*'((?:[^'\\]|\\.)*)'/g },
  { id: 'flashMsg', re: /flashMsg\(\s*'((?:[^'\\]|\\.)*)'/g },
  { id: 'alertBar', re: /alertBar\(\s*'((?:[^'\\]|\\.)*)'/g },
  { id: 'button text', re: /(?:btn|button|b)\.textContent\s*=\s*'((?:[^'\\]|\\.)*)'/g }
];

/* what is NOT a sentence, recognised by shape rather than by a list */
function isSentence(t) {
  const s = String(t).trim();
  if (s.length < 3) return false;
  if (!/[a-zA-Z]/.test(s)) return false;
  if (!/\s/.test(s) && s.length < 6) return false;               /* one short token: a key or a class */
  if (/^[a-z-]+$/.test(s) && !/\s/.test(s)) return false;        /* a css class or a data key */
  if (/^(https?:|#|\.|\/|data:)/.test(s)) return false;          /* a url, a selector, a path */
  if (/^[A-Z_]+$/.test(s)) return false;                          /* a code */
  if (/^&[a-z]+;$/.test(s)) return false;                         /* an entity on its own */
  if (/^<[a-z]/.test(s)) return false;                             /* markup */
  /* A GLYPH IS NOT A SENTENCE, AND A NAME IS NOT PROSE. '\\u2605' is a star;
     'Math<b>Shelf</b>' is the wordmark, which is a NAME and is held by qa-voice.
     Counting either as unmigrated would send a build hunting for wording that
     does not exist. */
  if (/^\\u[0-9a-fA-F]{4}$/.test(s)) return false;
  if (/^Math<b>Shelf<\/b>$/.test(s)) return false;
  return true;
}

/* the tables that are MIGRATED by ruling, not by moving */
const TABLE_HOMES = [
  { file: 'jotter.js', re: /var\s+COMMENTS\s*=\s*\{[\s\S]*?\n  \};/ },
  { file: 'staff.js', re: /var\s+DX_NAMES\s*=\s*\{[\s\S]*?\n  \};/ },
  { file: 'script.js', re: /var\s+SELF_EVAL_TRIPS\s*=\s*\{[\s\S]*?\n  \};/ }
];

const found = [];
const seen = new Set();
A.renderFiles().forEach(file => {
  const rel = file.replace(A.APP + '/', '');
  let src = stripComments(A.read(file));
  /* cut the three tables out before scanning: their contents have a home */
  TABLE_HOMES.filter(t => t.file === rel).forEach(t => { src = src.replace(t.re, ' /*TABLE*/ '); });
  const lines = src.split('\n');
  let fn = '(top level)';
  lines.forEach((line, i) => {
    /* the nearest NAME above the sentence, in any of the four shapes this
       codebase writes a function in. It is an address, not an owner: what it
       has to do is let a person find the line. */
    const f = /function\s+([A-Za-z_$][\w$]*)|(?:var|const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function|\()|\b([A-Za-z_$][\w$]*)\s*:\s*function|\b([A-Za-z_$][\w$]*)\s*=\s*function/.exec(line);
    if (f) fn = f[1] || f[2] || f[3] || f[4] || fn;
    RENDER.forEach(R => {
      R.re.lastIndex = 0;
      let m;
      while ((m = R.re.exec(line))) {
        const text = m[1].replace(/\\'/g, "'");
        if (!isSentence(text)) continue;
        /* ONE ROW PER SENTENCE PER PLACE. Two of the patterns above match the
           same assignment (a message set through a helper is also a textContent
           write), and a ledger that lists one sentence twice is a ledger nobody
           finishes reading. */
        const dedupe = rel + ':' + (i + 1) + ':' + text;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        found.push({ file: rel, fn, line: i + 1, how: R.id, text });
      }
    });
  });
});

/* does a content pack or GJ_STRINGS already own this sentence? */
const strings = require('./lib/strings.js').all();
const owned = new Set(strings.map(r => r.text.trim()));
const hasStringsFile = A.exists(A.app('strings.js'));

/* the ledger itself */
const LEDGER = A.qa('MATHS_STRINGS_LEDGER.md');
const waived = new Map();
if (A.exists(LEDGER)) {
  A.read(LEDGER).split('\n').forEach(l => {
    const m = /^\|\s*(WAIVED[^|]*)\|\s*([^|]+)\|\s*`([^`]*)`/.exec(l);
    if (m) waived.set(m[3].trim(), m[1].trim());
  });
}

const rows = [];
let outstanding = 0;
found.forEach(f => {
  const key = f.text.trim();
  let status;
  if (owned.has(key)) status = 'MIGRATED';
  else if (waived.has(key)) status = waived.get(key);
  else { status = 'OUTSTANDING'; outstanding++; }
  rows.push([status, f.file + ' :: ' + f.fn + ' :: ' + f.how, '`' + f.text.slice(0, 70) + '`']);
});

/* write the ledger so he can read what is owed, then fail on what is owed */
A.ensureOut();
const md = ['# MATHSHELF - THE STRINGS LEDGER', '',
  'Every literal on a render path in the client, and where its sentence lives.',
  'MIGRATED - a content pack or `GJ_STRINGS` owns it, so the language gate reads it.',
  'WAIVED BY HIS RULING <date> - it stays where it is, on his word.',
  'OUTSTANDING - a sentence no gate reads. At the v4 DONE list this is zero.', '',
  'Generated by `node tools/qa/qa-strings-ledger.js`; do not hand-edit anything but a WAIVED row.', '',
  '| status | where | sentence |', '|---|---|---|']
  .concat(rows.map(r => '| ' + r[0] + ' | ' + r[1] + ' | ' + r[2] + ' |'));
fs.writeFileSync(A.out('strings-ledger.md'), md.join('\n') + '\n');
if (!A.exists(LEDGER) || process.env.MS_WRITE_LEDGER === '1') fs.writeFileSync(LEDGER, md.join('\n') + '\n');

g.note(found.length + ' literals on render paths; ' + (found.length - outstanding) + ' with a home, ' + outstanding + ' outstanding');
g.note('strings.js (GJ_STRINGS) exists: ' + hasStringsFile);
if (rows.length) console.log(matrix('THE STRINGS LEDGER', ['status', 'where', 'sentence'],
  rows.filter(r => r[0] === 'OUTSTANDING').slice(0, 60)));

found.forEach(f => {
  const key = f.text.trim();
  if (owned.has(key) || waived.has(key)) return;
  g.fail(f.file + ' :: ' + f.fn, 'strings',
    '"' + f.text.slice(0, 70) + '" is a sentence no gate reads - move it into a content pack or GJ_STRINGS (rule 23)');
});

/* the other direction: a waived row for a sentence that has gone */
const live = new Set(found.map(f => f.text.trim()));
waived.forEach((why, key) => {
  g.check(live.has(key), 'MATHS_STRINGS_LEDGER.md', 'strings',
    'a waived row names "' + key.slice(0, 50) + '", which is no longer anywhere in the client - a record that has drifted is read and believed');
});

g.done();
