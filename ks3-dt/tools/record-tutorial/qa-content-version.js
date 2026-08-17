/* qa-content-version.js — the guard on the cache key (DFM 189).

   THE FAULT IT EXISTS FOR, in his own words, 11 Aug 2026: "I can still see text
   on lesson 3 saying 'Do NOT open your Signal Relay project from last lesson'"
   and "the register your rig didn't get the introduction of context or the
   video" — on a build that was written, committed, pushed AND deployed.

   Nothing was wrong with the content or the deploy. `contentVersion` had not
   moved since 4 Aug, and that one string is the cache key on BOTH sides:

     app.js      localStorage['ks3dt-content:<version>:<path>']  — purged ONLY
                 when the version differs, so an unchanged version means the
                 stale copy is kept forever and a hard refresh cannot clear it.
     Code.gs     CacheService 'ks3dt:f:<version>:<path>'          — same key.

   So seven commits of content shipped to Pages correctly and reached nobody who
   had already opened the lesson. He read a sentence off his own screen that had
   not existed in the repo for a day.

   The gate lives in pack-content.js; this file proves it BITES, in a sandbox,
   without touching the real content, the real packed output or the real stamp.
   A guard nobody has watched fail is not a guard (DFM 150). */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const PACK = path.join(__dirname, '..', 'pack-content.js');
const STAMP = path.join(__dirname, '..', 'content-stamp.json');

const FAILS = [];
const check = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) FAILS.push(what); };
const control = (ok, what) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + what); if (!ok) FAILS.push('CONTROL: ' + what); };

/* ---- a throwaway copy of the content, so nothing real is ever at risk ---- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ks3dt-ver-'));
const fxSrc = path.join(tmp, 'src');
const fxOut = path.join(tmp, 'out');
const fxStamp = path.join(tmp, 'stamp.json');
fs.cpSync(SRC, fxSrc, { recursive: true });
fs.mkdirSync(fxOut, { recursive: true });

const runPack = () => spawnSync(process.execPath, [PACK], {
  encoding: 'utf8',
  env: { ...process.env, KS3DT_SRC: fxSrc, KS3DT_OUT: fxOut, KS3DT_STAMP: fxStamp },
});
const readIndex = () => JSON.parse(fs.readFileSync(path.join(fxSrc, 'index.json'), 'utf8'));
const writeIndex = (o) => fs.writeFileSync(path.join(fxSrc, 'index.json'), JSON.stringify(o, null, 1));
const L2 = path.join(fxSrc, 'j1/lessons/j1-02.json');
const readL2 = () => JSON.parse(fs.readFileSync(L2, 'utf8'));
const writeL2 = (o) => fs.writeFileSync(L2, JSON.stringify(o, null, 1));

console.log('== 1. a clean pack establishes the stamp ==');
let r = runPack();
check(r.status === 0, 'the unchanged content packs cleanly and writes a stamp');
check(fs.existsSync(fxStamp), 'the stamp file exists after a successful pack');
const stamp0 = fs.existsSync(fxStamp) ? JSON.parse(fs.readFileSync(fxStamp, 'utf8')) : {};
check(!!stamp0.digest && !!stamp0.contentVersion,
  'the stamp records BOTH the contentVersion and a digest of the content (' + stamp0.contentVersion + ')');

console.log('\n== 2. packing again, unchanged, must NOT complain ==');
r = runPack();
check(r.status === 0, 'a second identical pack passes — the gate does not fire on a no-op (over-tightening guard)');

console.log('\n== 3. THE CONTROL: content changed, version NOT bumped, must STOP the pack ==');
/* The change must be REAL content but NOT a pupil sentence: if it were a
   sentence, the language gate would stop the pack first and this control would
   pass for the wrong reason — proving nothing about the version gate. (It did
   exactly that on the first run, and the message assertions below are what
   caught it. DFM 146a.) A chunk's minutes is content, and is not prose. */
let l2 = readL2();
const ladder = (l2.chunks || []).find(c => c.engine === 'ladder');
ladder.minutes = Number(ladder.minutes || 0) + 1;
writeL2(l2);
r = runPack();
control(r.status !== 0, 'a content edit with an UNCHANGED contentVersion FAILS the pack (his 11 Aug fault)');
const out = (r.stdout || '') + (r.stderr || '');
control(/contentVersion did not/i.test(out),
  'and the message names the cause rather than leaving it to be guessed');
control(/localStorage/i.test(out) && /hard\s*refresh/i.test(out),
  'and it says why a hard refresh would not have saved him');

console.log('\n== 4. the same change WITH a bumped version passes ==');
const idx = readIndex();
idx.contentVersion = '9999-99-99z';
writeIndex(idx);
r = runPack();
check(r.status === 0, 'bumping contentVersion lets the very same content through');
const stamp1 = JSON.parse(fs.readFileSync(fxStamp, 'utf8'));
check(stamp1.contentVersion === '9999-99-99z', 'and the stamp moves to the new version');
check(stamp1.digest !== stamp0.digest, 'and records the new content digest');

console.log('\n== 5. a version bump ALONE cannot satisfy the gate ==');
/* contentVersion is excluded from the digest on purpose: if it were included,
   bumping the version would change the digest and the gate could never tell
   "content changed" from "version changed". */
const idx2 = readIndex();
idx2.contentVersion = '9999-99-99y';
writeIndex(idx2);
r = runPack();
check(r.status === 0, 'a pure version bump packs cleanly');
const stamp2 = JSON.parse(fs.readFileSync(fxStamp, 'utf8'));
control(stamp2.digest === stamp1.digest,
  'and the digest is UNCHANGED by it — so the digest tracks content only, never the version string');

console.log('\n== 6. the REAL repo is in a consistent state right now ==');
check(fs.existsSync(STAMP), 'the committed content stamp exists');
if (fs.existsSync(STAMP)) {
  const live = JSON.parse(fs.readFileSync(STAMP, 'utf8'));
  const liveVer = JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8')).contentVersion;
  check(live.contentVersion === liveVer,
    'and it matches the contentVersion in content-src/index.json (' + liveVer + ')');
  check(live.contentVersion !== '2026-08-03c',
    'and the version has moved off "2026-08-03c" — the string that was frozen from 4 to 11 Aug');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n=========================================');
/* ------------------------------------------------------------------ *
 * THE HTTP LAYER, closed 17 Aug 2026 — the half of DFM 189 that was missed.
 * That rule keyed localStorage by contentVersion, so a stale lesson could not
 * be served out of the store. It never looked one layer down: GitHub Pages
 * sends `cache-control: max-age=600`, so the browser's own HTTP cache answered
 * the fetch for ten minutes without asking Pages — and the stale body it
 * returned was written into localStorage under the NEW key, where nothing would
 * ever purge it. He hit exactly that: Pages serving the new lesson, the server
 * reporting the new version, a private window correct, and his ordinary tab
 * showing the old wording through repeated hard refreshes.
 * The version now rides in the URL, so a new version cannot be answered from a
 * cache of the old one. Asserted in BOTH homes (DFM 234).
 * ------------------------------------------------------------------ */
(function httpCacheLayer() {
  const ROOT2 = path.resolve(__dirname, '../../..');
  const app = fs.readFileSync(path.join(ROOT2, 'ks3-dt/platform/app.js'), 'utf8');
  const dev = fs.readFileSync(path.join(ROOT2, 'ks3-dt/platform/dev-server.js'), 'utf8');
  console.log('\n== THE CONTENT URL CARRIES THE VERSION (the HTTP-cache half of DFM 189) ==');
  check(/CONTENT_BASE \+ path \+ \(App\.state\.contentVersion \? '\?v='/.test(app),
    'app.js puts the contentVersion in the content URL, so a new version is a new URL');
  check(/'\.\.\/content\/' \+ path \+ \(CONTENT_VER \? '\?v='/.test(dev),
    'and dev-server.js does the same, so the two homes behave alike');
  check(!/fetch\(CONTENT_BASE \+ path, \{ cache: 'default' \}\)/.test(app),
    'CONTROL: the old version-less fetch — the one his browser answered from its own cache — is gone');
})();

console.log(FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL CONTENT-VERSION CHECKS PASSED');
process.exit(FAILS.length ? 1 : 0);

