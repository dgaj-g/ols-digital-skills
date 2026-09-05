/* the three parsers (stripComments, objectBody, objectEntries) are copied from
   ks3-dt/tools/record-tutorial/qa-harness-coverage.js at bdd8c5a, 2026-08-28;
   adapter: none — they are copied VERBATIM on purpose. A comment must not be
   able to silence a coverage gate (it did, on 16 Aug 2026: a "(DFM 199…)" note
   above a table entry registered a phantom key and swallowed the real one), so
   the fix that was paid for once is not re-typed here. */
'use strict';
const fs = require('fs');

function exists(p) { try { fs.accessSync(p); return true; } catch (e) { return false; } }

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
function objectBody(file, declRe) {
  if (!exists(file)) return null;
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const m = declRe.exec(src);
  if (!m) return null;
  let i = src.indexOf('{', m.index);
  if (i < 0) return null;
  let depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  return end < 0 ? null : src.slice(i + 1, end);
}
function objectEntries(file, declRe) {
  const body = objectBody(file, declRe);
  if (body == null) return null;
  const out = {};
  let depth = 0, key = null, start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    /* A COMMA INSIDE A SENTENCE IS NOT A SEPARATOR. The copied scanner split
       on every comma at depth 0, so 'Tap the values in order, smallest first.'
       ended an entry halfway through and the value never parsed as a string at
       all. Twenty of the app's own pupil sentences were dropped that way, and
       qa-language has therefore never read a sentence with a comma in it - the
       longest and most explanatory ones in the whole app. This is the one
       place this copy departs from the verbatim original, and it departs by
       stepping over quoted text rather than by changing what a key is. */
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < body.length) {
        if (body[j] === '\\') { j += 2; continue; }
        if (body[j] === quote) break;
        j++;
      }
      i = j;
      continue;
    }
    if (depth === 0 && key === null) {
      const rest = body.slice(i);
      const k = /^\s*['"]?([A-Za-z0-9_-]+)['"]?\s*:/.exec(rest);
      if (k) { key = k[1]; i += k[0].length - 1; start = i + 1; continue; }
    }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
    else if (ch === ',' && depth === 0 && key !== null) { out[key] = body.slice(start, i); key = null; }
  }
  if (key !== null) out[key] = body.slice(start);
  return out;
}

/* ---------------------------------------------------------------------------
   A GATE'S OWN DECLARATION IS READ FROM ITS OWN SOURCE (DFM 144).
   Not required()'d: several gates launch a browser at require time, and the
   coverage machine has to stay cheap enough to run on every commit. Not read
   from a registry beside them either: a second copy of a fact is the copy that
   goes stale, and then the gate that exists reads as the gate that covers.
--------------------------------------------------------------------------- */

/* a very small literal evaluator: enough for the COVERS / CONTROLS shapes and
   nothing more. It refuses anything it does not understand rather than guessing
   — a declaration a machine had to interpret is not a declaration. */
function literal(text) {
  const src = String(text).trim();
  if (!src) return undefined;
  if (/\brequire\s*\(|\bprocess\b|\bfunction\b|=>/.test(src)) throw new Error('not a literal');
  // eslint-disable-next-line no-new-func
  return new Function('"use strict"; return (' + src + ');')();
}

function coversOf(file) {
  const body = objectBody(file, /(?:^|\n)\s*(?:const|let|var)\s+COVERS\s*=\s*/);
  if (body == null) return null;
  try { return literal('{' + body + '}'); } catch (e) { return null; }
}
function controlsOf(file) {
  if (!exists(file)) return null;
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const m = /(?:^|\n)\s*(?:const|let|var)\s+CONTROLS\s*=\s*\[/.exec(src);
  if (!m) return null;
  let i = src.indexOf('[', m.index);
  let depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '[' || src[j] === '{') depth++;
    else if (src[j] === ']' || src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end < 0) return null;
  const body = src.slice(i, end + 1);
  /* mustFail is a regexp literal; a literal evaluator handles it, but the value
     must survive as a RegExp so --control can match on it */
  try { return literal(body); } catch (e) { return null; }
}

module.exports = { stripComments, objectBody, objectEntries, coversOf, controlsOf, exists };
