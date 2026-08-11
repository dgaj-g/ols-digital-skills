#!/usr/bin/env node
/**
 * OLS KS3 DT - content packer.
 * Reads plaintext content source (WITH answer keys) from the private, iCloud-synced
 * Claude Work folder, encrypts each file's `keys` object, and emits the PUBLIC
 * ks3-dt/content/ JSON the platform fetches. Also emits a git-ignored dev-keys.json
 * so the localhost/github.io FakeServer can mark answers during preview.
 *
 * Usage: node ks3-dt/tools/pack-content.js
 * Secret: Claude Work/KS3 DT Platform/.ks3dt-secret (auto-created on first run).
 * The SAME secret must be set as Script Property KS3DT_SECRET in the Apps Script project.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
/* OUT and the version stamp are env-overridable for one reason only: so the
   version gate below can be PROVED to fail, in a sandbox, without touching a
   byte of the real content or the real stamp (qa-content-version.js). */
const OUT = process.env.KS3DT_OUT || path.join(__dirname, '..', 'content');
const SECRET_FILE = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/.ks3dt-secret');

function secret() {
  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, crypto.randomBytes(24).toString('hex'), { mode: 0o600 });
    console.log('Generated new secret at ' + SECRET_FILE +
      ' - set it as Script Property KS3DT_SECRET before deploying.');
  }
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
}

/* XOR keystream cipher, mirrored in Code.gs.template (decryptKeys_). Beats DevTools
   and repo browsing, which is the whole threat model (red team finding #1). */
function encryptKeys(keysObj, fileId, sec) {
  const data = Buffer.from(JSON.stringify(keysObj), 'utf8');
  const out = Buffer.alloc(data.length);
  for (let block = 0; block * 32 < data.length; block++) {
    const ks = crypto.createHash('sha256').update(sec + '|' + fileId + '|' + block).digest();
    for (let i = 0; i < 32 && block * 32 + i < data.length; i++) {
      out[block * 32 + i] = data[block * 32 + i] ^ ks[i];
    }
  }
  return out.toString('base64');
}

function validateLesson(src, file) {
  const problems = [];
  const keys = src.keys || {};
  const wantKey = (id, why) => { if (!(id in keys)) problems.push(file + ': missing key "' + id + '" (' + why + ')'); };
  (src.chunks || []).forEach(ch => {
    (ch.items || []).forEach(it => {
      if (!it.options || it.options.length < 2) problems.push(file + ': item ' + it.id + ' has <2 options');
      if (it.marked !== false) wantKey(it.id, 'chunk ' + ch.id + ' item');
    });
  });
  (src.exit && src.exit.items || []).forEach(it => wantKey(it.id, 'exit item'));
  Object.keys(keys).forEach(k => {
    const key = keys[k];
    if (key && typeof key.a === 'number' && key.a < 0) problems.push(file + ': key ' + k + ' negative answer idx');
  });
  return problems;
}

/* THE LANGUAGE GATE (DFM 172/178). Damien, 9 Aug 2026: "is what I'm trying to
   instruct or communicate clear enough for an 11 or 12 year old?" - asked of every
   pupil-facing sentence, every build, with no way round it. A standard that
   depends on remembering it is not a standard (DFM 150), so the pack itself
   refuses to run when the harness fails. There is deliberately no skip flag. */
function languageGate() {
  const harness = path.join(__dirname, 'record-tutorial', 'qa-language.js');
  if (!fs.existsSync(harness)) {
    console.error('qa-language.js is missing - the language gate cannot run, so the pack stops.');
    process.exit(1);
  }
  const res = require('child_process').spawnSync(process.execPath, [harness], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error((res.stdout || '') + (res.stderr || ''));
    console.error('\nPACK STOPPED: the communication-of-language harness failed (DFM 172).');
    console.error('Fix the sentences, or record the read-aloud judgement, then pack again.');
    process.exit(1);
  }
  console.log('language gate: PASSED (qa-language)');
}

/* THE VERSION GATE (his 11 Aug 2026 find, DFM 189). Every content change since
   4 Aug shipped under the SAME contentVersion "2026-08-03c" - and that string is
   the cache key on BOTH sides: app.js stores each lesson file in localStorage
   under 'ks3dt-content:<version>:<path>' and only purges entries whose version
   DIFFERS, while Code.gs caches each file under 'ks3dt:f:<version>:<path>'. So a
   pupil's browser kept serving a copy from before the change, forever, and a hard
   refresh could never clear it (localStorage survives a reload). He sat a Lesson 3
   that had been fixed and deployed, and read the old sentence off his own screen.
   THE GATE: if the content source changed but contentVersion did not, the pack
   STOPS. Anything a machine can check must not depend on remembering it (DFM 150).
   The digest is taken over the SOURCE (not the packed output, whose encrypted key
   blobs are not byte-stable) and deliberately excludes contentVersion itself, so
   bumping the version can never satisfy the check on its own. */
const STAMP_FILE = process.env.KS3DT_STAMP || path.join(__dirname, 'content-stamp.json');

function contentDigest() {
  const files = [];
  const walk = (dir) => fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) return walk(p);
    /* dev-only companions the client is never served (see main's walk) */
    if (f === 'language-ledger.json' || f === 'vocab.json') return;
    if (f.endsWith('.json')) files.push(p);
  });
  walk(SRC);
  files.sort();
  const h = crypto.createHash('sha256');
  for (const p of files) {
    const rel = path.relative(SRC, p).replace(/\\/g, '/');
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (rel === 'index.json') delete obj.contentVersion;
    h.update(rel + '\0' + JSON.stringify(obj) + '\0');
  }
  return h.digest('hex');
}

function versionGate() {
  const version = String(JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8')).contentVersion || '');
  const digest = contentDigest();
  if (!version) { console.error('index.json has no contentVersion - the pack stops.'); process.exit(1); }
  if (fs.existsSync(STAMP_FILE)) {
    const stamp = JSON.parse(fs.readFileSync(STAMP_FILE, 'utf8'));
    if (stamp.digest !== digest && stamp.contentVersion === version) {
      console.error('\nPACK STOPPED: the content changed but contentVersion did not (DFM 189).');
      console.error('  contentVersion is still "' + version + '" (unchanged since the last pack).');
      console.error('  Every pupil browser caches lesson files under that string in localStorage and');
      console.error('  keeps them until it changes - so this change would reach nobody, and no hard');
      console.error('  refresh would fix it.');
      console.error('  FIX: bump "contentVersion" in content-src/index.json, then pack again.');
      process.exit(1);
    }
  }
  /* field name matters: versionGate READS stamp.contentVersion, so it must WRITE
     contentVersion. Naming it "version" here made the gate silently never fire —
     found by qa-content-version's own control, which is the entire point of it. */
  return { contentVersion: version, digest };
}

function main() {
  languageGate();
  const stamp = versionGate();
  const sec = secret();
  const devKeys = {};
  const problems = [];
  const walk = (dir) => fs.readdirSync(dir).flatMap(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) return walk(p);
    /* dev-only companions of the content, never served to anyone */
    if (f === 'language-ledger.json' || f === 'vocab.json') return [];
    return f.endsWith('.json') ? [p] : [];
  });
  if (!fs.existsSync(SRC)) { console.error('No content source at ' + SRC); process.exit(1); }
  for (const srcPath of walk(SRC)) {
    const rel = path.relative(SRC, srcPath);
    const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    const fileId = rel.replace(/\\/g, '/').replace(/\.json$/, '');
    const pub = { ...src };
    delete pub.keys;
    // Teacher brief is staff-only: fold it into the encrypted keys blob (reserved
    // id "_brief", returned only via the passcode-gated admin 'brief' call) and
    // strip it from the public JSON so pupils can't read the run sheet in DevTools.
    if (src.keys && src.teacherBrief) {
      src.keys._brief = src.teacherBrief;
      delete pub.teacherBrief;
    }
    // Instant-marking filter (31 Jul 2026, master file rule 97): the exit check
    // and the baseline exam deliberately withhold verdicts on screen, so their
    // keys are tagged x here and apiLessonKeys never hands them to the pupil's
    // page. Everything else marks locally and instantly.
    if (src.keys && src.chunks) {
      src.chunks.forEach(ch => {
        if (ch.engine !== 'exitcheck' && ch.engine !== 'diagnostic') return;
        (((ch.config || {}).items) || []).forEach(it => {
          if (src.keys[it.id]) src.keys[it.id].x = 1;
        });
      });
    }
    if (src.keys) {
      pub.keysEnc = encryptKeys(src.keys, fileId, sec);
      devKeys[fileId] = src.keys;
      if (rel.includes('lessons/')) problems.push(...validateLesson(src, rel));
    }
    const outPath = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(pub, null, 1));
    // Plaintext-leak guard: no correct-answer field may survive in the public
    // file. Covers every answer-shaped field the schema actually uses (review
    // finding: 'map' and 'mis' were missing from the original list).
    const pubText = fs.readFileSync(outPath, 'utf8');
    if (/"(a|correct|answer|explain|map|mis|keys)"\s*:/.test(pubText) && src.keys) {
      problems.push(rel + ': public output still contains a key-like field name - check the source layout');
    }
    console.log('packed ' + rel + (src.keys ? ' (+' + Object.keys(src.keys).length + ' keys)' : ''));
  }
  fs.writeFileSync(path.join(OUT, 'dev-keys.json'), JSON.stringify(devKeys, null, 1));
  console.log('wrote dev-keys.json (git-ignored, preview marking only)');
  if (problems.length) { console.error('\nVALIDATION PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
  /* Only a pack that got this far is a real one, so only now does the stamp move. */
  fs.writeFileSync(STAMP_FILE, JSON.stringify(stamp, null, 1) + '\n');
  console.log('version gate: contentVersion "' + stamp.contentVersion + '" stamped against this content');
}
main();
