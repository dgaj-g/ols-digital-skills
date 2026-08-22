#!/usr/bin/env node
/* qa-cache-scope.js — CACHESERVICE MAY ONLY HOLD WHAT ONE USER'S OWN
   EXECUTIONS NEED AGAIN (DFM 248a, the ratchet half).

   On 21 Aug 2026 three real staff sat Lesson 1 and every one of them was
   released solo. Measured that morning on the live app: CacheService on this
   execute-as-user deployment had stopped crossing users — each user's cache is
   a private silo. Presence, the pairing queue and the chat channel all lived in
   cache; the roster, the records and the pair registries (all ScriptProperties)
   crossed users perfectly in the same hour. The pairing half moved to
   properties the same morning and `qa-pair-stores.js` holds it.

   THIS gate holds the GENERAL ground, because the specific fix only ever guards
   pairing: anything two USERS must both see lives in ScriptProperties, and a
   cross-user read of cache is a defect wherever it appears. Cache survives in
   exactly two single-user-safe homes, and this file is the list:

     contentVersion_()  the version string (a 5-minute memo of a public file)
     fetchContent_()    content files (a memo of a public file, per user, fine)

   Both are memos of a PUBLIC file that every user would fetch identically, so a
   private silo per user costs a duplicate fetch and nothing else. Any other use
   of CacheService in the deployed template FAILS this gate.

   It is a ratchet, not a source of clarity (DFM 193d): it holds ground already
   won. It cannot tell whether a NEW cross-user feature is correct — only that
   it did not reach for cache to do it.

   CONTROLS (DFM 196), both ways:
     - a fixture copy of the shipped template with ONE cross-user cache line
       planted inside a pairing function must FAIL, naming that function;
     - a fixture with the whitelist's own home renamed must FAIL, so the gate
       cannot be satisfied by moving a cache call somewhere it is not allowed;
     - the shipped template must PASS;
     - and the scanner proves it is not vacuous on every run: it must FIND the
       two legitimate uses. A scanner that quietly matches nothing prints green
       for a file it never read (DFM 239's self-probe).

   Usage: node qa-cache-scope.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TEMPLATE = path.join(ROOT, 'platform', 'server', 'Code.gs.template');

/* The whitelist. Adding a name here is a deliberate act, and the reason it is
   safe must be true of it: a memo of a PUBLIC file, identical for every user. */
const SINGLE_USER_SAFE = ['contentVersion_', 'fetchContent_'];

let failures = 0;
function check(name, ok, detail) {
  if (ok) console.log('  PASS  ' + name);
  else { failures++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

/* Strip comments and string/regex-ish literals so a mention of CacheService in
   prose or inside a quoted string is never mistaken for a call. Newlines are
   preserved so line numbers stay true. */
function stripNonCode(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      const chunk = src.slice(i, end === -1 ? n : end + 2);
      out += chunk.replace(/[^\n]/g, ' ');
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (c === '/' && d === '/') {
      let end = src.indexOf('\n', i);
      if (end === -1) end = n;
      out += ' '.repeat(end - i);
      i = end;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += ' '.repeat(Math.min(j, n) - i + 1);
      i = Math.min(j, n) + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/* Top-level function regions of the template. The file is ASCII-only and every
   function starts at column 0 (the assembler guards the style), so brace depth
   from a column-0 `function name(` to its column-0 `}` is exact here. */
function functionRegions(code) {
  const regions = [];
  const lines = code.split('\n');
  let cur = null, depth = 0;
  lines.forEach((line, idx) => {
    if (!cur) {
      const m = /^function\s+([A-Za-z0-9_$]+)\s*\(/.exec(line);
      if (m) { cur = { name: m[1], from: idx, to: idx }; depth = 0; }
    }
    if (cur) {
      for (const ch of line) { if (ch === '{') depth++; else if (ch === '}') depth--; }
      cur.to = idx;
      if (depth <= 0 && /\{/.test(lines.slice(cur.from, idx + 1).join('\n'))) {
        regions.push(cur); cur = null;
      }
    }
  });
  return regions;
}

function whereIs(regions, lineIdx) {
  const r = regions.find(x => lineIdx >= x.from && lineIdx <= x.to);
  return r ? r.name : '(top level)';
}

/* Every place the deployed template touches the cache, with the function it is
   in. `CacheService` is the only door to it in Apps Script, so this one pattern
   is the whole surface. */
function cacheSites(src) {
  const code = stripNonCode(src);
  const regions = functionRegions(code);
  const sites = [];
  code.split('\n').forEach((line, idx) => {
    if (/CacheService/.test(line)) sites.push({ line: idx + 1, fn: whereIs(regions, idx), text: line.trim() });
  });
  return sites;
}

function judge(src, label) {
  const sites = cacheSites(src);
  const illegal = sites.filter(s => SINGLE_USER_SAFE.indexOf(s.fn) === -1);
  return { sites, illegal, label };
}

console.log('qa-cache-scope — cache holds only what one user needs again (DFM 248a)\n');
console.log('  single-user-safe homes: ' + SINGLE_USER_SAFE.join(', '));

const shipped = fs.readFileSync(TEMPLATE, 'utf8');

/* ---- the scanner must not be vacuous ------------------------------------- */
const ship = judge(shipped, 'shipped template');
console.log('');
check('the scanner really reads the file: it finds the legitimate cache uses',
  ship.sites.length >= 2 && SINGLE_USER_SAFE.every(fn => ship.sites.some(s => s.fn === fn)),
  JSON.stringify(ship.sites.map(s => s.fn)));
check('the region parser resolves every cache site to a named function (none stranded)',
  ship.sites.every(s => s.fn !== '(top level)'),
  JSON.stringify(ship.sites.filter(s => s.fn === '(top level)')));

/* ---- CONTROL A: a planted cross-user cache line must be condemned --------- */
const PLANT_IN = 'pairReg_';
const planted = shipped.replace(
  /function pairReg_\(cls, lessonId\) \{\n/,
  'function pairReg_(cls, lessonId) {\n  var beacon = CacheService.getScriptCache().get(\'pair:\' + cls + \':\' + lessonId);\n');
const ctlA = judge(planted, 'fixture: cross-user cache planted in ' + PLANT_IN);
console.log('');
check('CONTROL: the plant actually landed in the fixture', planted !== shipped);
check('CONTROL: a cross-user cache read inside ' + PLANT_IN + ' is CONDEMNED',
  ctlA.illegal.length === 1 && ctlA.illegal[0].fn === PLANT_IN,
  JSON.stringify(ctlA.illegal.map(s => s.fn + ':' + s.line)));

/* ---- CONTROL B: the whitelist may not be satisfied by relocation ---------- */
const moved = shipped.replace('function fetchContent_(path)', 'function fetchContentX_(path)');
const ctlB = judge(moved, 'fixture: whitelisted home renamed');
check('CONTROL: moving a cache call out of its whitelisted home is CONDEMNED',
  ctlB.illegal.length > 0 && ctlB.illegal.every(s => s.fn === 'fetchContentX_'),
  JSON.stringify(ctlB.illegal.map(s => s.fn + ':' + s.line)));

/* ---- CONTROL C: a bare cache accessor helper is itself the affordance ------
   `cache_()` / `cGet_` / `cPut_` made a cross-user cache habit a one-liner from
   anywhere in the file. They had zero callers by 22 Aug and were deleted in the
   V52 round; this check stops a general-purpose cache door being cut again. */
const RESURRECTED = shipped.replace(
  /\/\* ---------- progress events/,
  'function cache_() { return CacheService.getScriptCache(); }\n\n/* ---------- progress events');
const ctlC = judge(RESURRECTED, 'fixture: a general-purpose cache accessor restored');
check('CONTROL: a general-purpose cache accessor helper is CONDEMNED',
  ctlC.illegal.some(s => s.fn === 'cache_'),
  JSON.stringify(ctlC.illegal.map(s => s.fn)));

/* ---- THE SHIPPED TEMPLATE ------------------------------------------------- */
console.log('');
check('the shipped template touches the cache ONLY in its single-user-safe homes',
  ship.illegal.length === 0,
  ship.illegal.map(s => s.fn + ' (line ' + s.line + '): ' + s.text).join(' | '));

/* ---- the law is stated where the next reader stands (DFM 248's own
   enforcement home: the storage header comment) --------------------------- */
const header = shipped.slice(0, shipped.indexOf('var CONTENT_BASE_DEFAULT'));
check('the storage-model header states the law in the reader\'s path',
  /NEVER CacheService/.test(header) && /ScriptProperties/.test(header) &&
  /single-user-safe/.test(header));
check('no comment anywhere still claims the cache is shared or scope-free',
  !/CacheService[^\n]{0,80}(scope-free|shared across users|crosses users)/i.test(shipped) &&
  !/(Queue|channel)[^\n]{0,40}ephemeral cache/i.test(shipped),
  (/[^\n]*(scope-free|ephemeral cache)[^\n]*/i.exec(shipped) || [''])[0].trim());

console.log('');
if (failures) { console.log('qa-cache-scope: ' + failures + ' FAILURE(S)'); process.exit(1); }
console.log('qa-cache-scope: ALL GREEN — ' + ship.sites.length +
  ' cache site(s), every one inside a single-user-safe home.');
