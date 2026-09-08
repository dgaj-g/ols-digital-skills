/* hash.js — THE CONTENT HASH A SIDECAR IS MEASURED AGAINST.
 * A walker's record of what it stood on is only evidence while the thing it
 * walked has not changed. So every sidecar carries the hash of the app's own
 * content and client, and a sidecar whose hash is not the current one counts as
 * ABSENT — not as stale-but-probably-fine, which is how a walk done three
 * changes ago comes to certify a screen nobody has looked at (Part 3.1). */
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function sha1(s) { return crypto.createHash('sha1').update(s).digest('hex'); }

function contentHash(APP) {
  const h = crypto.createHash('sha1');
  const files = fs.readdirSync(APP)
    .filter(f => /\.(js|css|html)$/.test(f) && f !== 'qrcode.min.js')
    .sort();
  files.forEach(f => { h.update(f); h.update(fs.readFileSync(path.join(APP, f))); });
  return h.digest('hex').slice(0, 12);
}
function fileHash(p) { return sha1(fs.readFileSync(p, 'utf8')).slice(0, 12); }

/* bookHash(APP, bookId) — what ONE book's walk actually depends on: its own
 * pack, the engine/renderer that marks and draws it, and the shared client
 * every book runs through. NOT the whole app directory (that is `contentHash`,
 * and it stays for everything else — qa-repo-prod's built-vs-source check,
 * the shipped-tree control, anywhere a sidecar is not book-scoped).
 *
 * Finding, 8 Sept 2026 (PROGRESS.md): `contentHash` hashes every .js/.css/.html
 * in the app directory, so merely ADDING a file the app does not load yet
 * (statcore.js, statchart.js, jotter-stats.js, mid-build) moved the hash under
 * every sidecar already written and made qa-coverage report thousands of cells
 * "0 closed" with every walker green. A book's own hash must not move when a
 * FILE ITS BOOK DOES NOT LOAD changes.
 *
 * A content pack is pure data — `GJ_CONTENT.<book> = {...}` — and never names
 * the engine that marks it, so there is no import graph to read; the pack's
 * OWN topic word (carried in its filename, content-angles.js / content-stats-*)
 * is the one signal that exists, and it is what this derives from. */
function bookHash(APP, bookId) {
  const files = new Set();

  /* 1. the pack(s): any content-*.js that actually defines GJ_CONTENT.<book> */
  const packRe = new RegExp('GJ_CONTENT(?:\\.' + bookId + '\\b|\\[[\'"]' + bookId + '[\'"]\\])');
  let packName = null;
  fs.readdirSync(APP).filter(f => /^content-.*\.js$/.test(f)).sort().forEach(f => {
    let src = '';
    try { src = fs.readFileSync(path.join(APP, f), 'utf8'); } catch (e) { return; }
    if (packRe.test(src)) { files.add(f); if (!packName) packName = f; }
  });
  if (!packName) packName = 'content-' + bookId + '.js';  /* pack absent/broken mid-build: still name it */

  /* 2. the engine + renderer this book's pack is marked and drawn by, derived
     from the pack's own topic word (the naming convention every book so far
     follows) rather than typed per book id */
  if (/angle/.test(packName)) {
    files.add('anglecore.js');
  } else if (/stat/.test(packName)) {
    files.add('statcore.js'); files.add('statchart.js'); files.add('jotter-stats.js');
  } else {
    files.add('mathcore.js');  /* the general engine — algebra, and the default */
  }

  /* 3. the shared client every book runs through, regardless of topic */
  ['script.js', 'jotter.js', 'player.js', 'strings.js', 'style.css', 'shell.css', 'index.html']
    .forEach(f => files.add(f));

  const h = crypto.createHash('sha1');
  [...files].filter(f => fs.existsSync(path.join(APP, f))).sort().forEach(f => {
    h.update(f); h.update(fs.readFileSync(path.join(APP, f)));
  });
  /* files a book depends on but that are currently MISSING are named in the
     hash too, so a broken/absent pack mid-build hashes differently from a
     present one instead of silently matching by omission */
  [...files].filter(f => !fs.existsSync(path.join(APP, f))).sort().forEach(f => h.update('ABSENT:' + f));
  return h.digest('hex').slice(0, 12);
}

module.exports = { sha1, contentHash, bookHash, fileHash };
