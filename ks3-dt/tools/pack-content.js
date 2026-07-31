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
const OUT = path.join(__dirname, '..', 'content');
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

function main() {
  const sec = secret();
  const devKeys = {};
  const problems = [];
  const walk = (dir) => fs.readdirSync(dir).flatMap(f => {
    const p = path.join(dir, f);
    return fs.statSync(p).isDirectory() ? walk(p) : (f.endsWith('.json') ? [p] : []);
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
}
main();
