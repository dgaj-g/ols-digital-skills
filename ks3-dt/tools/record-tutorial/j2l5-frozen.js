/* J2 L5 THE SEARCH, gate: the cast is frozen (DFM 331).
   The bang film and the cast (search/chars.js, scene.js, film.js, sound.js and the two fonts) ship byte for byte
   as the design froze them. Each file's sha256 must match CHAPTER0_HASHES (and the design's own frozen copy where
   it keeps one). CONTROL: one flipped byte in chars.js must fail the same check.
   Run: node ks3-dt/tools/record-tutorial/j2l5-frozen.js */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const SEARCH = process.env.J2L5_SEARCH || path.join(ROOT, 'ks3-dt/platform/assets/search/search');
const FROZEN = process.env.J2L5_FROZEN || path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/L5_PROTOTYPES/chapter0-frozen');
const HASH = {
  'chars.js': 'ba5ff232d24af076a8aafeee2313b3a2a13a6d47e93aa084adf7e652f8c92762',
  'scene.js': '3b5579a98ed264b0d6debc2945bde4f4b341135cbad677a7fe939f94dd59c223',
  'film.js': 'fc761d3fa6437f3a08abea85269fc599c60e6ce56eeebf229c5799de1d3a1b59',
  'sound.js': '260fef82ba696bc33a065d9c269c6a248b09b279c7d13b0f50cdf0335bb5b7f9',
  'fonts/caveat-bold.woff2': '85950f4c2d4664a04785a6b49855fccd27aaa4477a2e6ef4691d5e92aa889498',
  'fonts/space-grotesk.woff2': 'a0d054c4af557de20afd6ca59f47ab353bcaec49c63ff04b6c9d39d0f8910557'
};
let fails = 0, n = 0;
const must = (ok, what) => { n++; if (!ok) { fails++; console.log('FAIL ' + what); } else if (process.env.VERBOSE) console.log('ok   ' + what); };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
for (const [f, h] of Object.entries(HASH)) {
  const p = path.join(SEARCH, f);
  if (!fs.existsSync(p)) { must(false, f + ' is shipped at ' + path.relative(ROOT, p)); continue; }
  const b = fs.readFileSync(p);
  must(sha(b) === h, f + ' is byte for byte the frozen file (sha256 ' + h.slice(0, 12) + '…)');
  const copy = path.join(FROZEN, path.basename(f));
  if (!f.startsWith('fonts/') && fs.existsSync(copy)) must(Buffer.compare(b, fs.readFileSync(copy)) === 0, f + ' equals the design\'s frozen copy in chapter0-frozen/');
}
/* CONTROL: the same check on a copy with one byte changed must fail */
const cp = path.join(SEARCH, 'chars.js');
if (fs.existsSync(cp)) { const b = Buffer.from(fs.readFileSync(cp)); b[100] ^= 1; must(sha(b) !== HASH['chars.js'], 'CONTROL a chars.js with one byte changed fails the hash'); }
/* nothing in the shipped hour writes over the cast's globals */
const HOUR = path.join(SEARCH, '..', 'hour');
if (fs.existsSync(HOUR)) for (const f of fs.readdirSync(HOUR).filter(x => x.endsWith('.js'))) {
  const t = fs.readFileSync(path.join(HOUR, f), 'utf8');
  must(!/\b(SearchChars|SearchScene|SearchFilm)\s*=[^=]|\b(SearchChars|SearchScene|SearchFilm)\.\w+\s*=[^=]/.test(t), 'hour/' + f + ' never reassigns the frozen cast, scene or film');
}
console.log('\nj2l5-frozen: ' + (fails ? 'FAIL · ' + fails + ' of ' + n : 'PASS · ' + n + ' checks'));
process.exit(fails ? 1 : 0);
