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

module.exports = { sha1, contentHash, fileHash };
