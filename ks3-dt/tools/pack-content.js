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

/* THE DECK-SHOT GATE (DFM 225b). Damien, 15 Aug 2026, on finding the Vault's
   inbox on three slides that named three other screens: "figure out how this
   happened and what you'll do (screenshot reading harness needed) to ensure it
   never happens again." A picture projected to a class is a promise about what
   her screen will look like, so every deck shot must be able to prove which
   screen it was standing on — checked against the lesson's own packed content,
   with a planted mislabelled control. No skip flag here either. */
function deckShotGate() {
  const harness = path.join(__dirname, 'record-tutorial', 'qa-deck-shots.js');
  if (!fs.existsSync(harness)) {
    console.error('qa-deck-shots.js is missing - the deck-shot gate cannot run, so the pack stops.');
    process.exit(1);
  }
  const res = require('child_process').spawnSync(process.execPath, [harness], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error((res.stdout || '') + (res.stderr || ''));
    console.error('\nPACK STOPPED: a deck screenshot cannot prove which screen it shows (DFM 225b).');
    console.error('Re-capture it: node ks3-dt/tools/slides-deck/capture-deck-shots.js');
    process.exit(1);
  }
  console.log('deck-shot gate: PASSED (qa-deck-shots)');
}

/* THE BRIEF-SHAPE GATE (DFM 227). His 15 Aug redesign: the sections run
   purpose -> preparing -> resources -> running the hour -> the breakdown ->
   what goes wrong; "If you fall behind" is gone from every brief; and the
   minute labels sum to the hour. The order lives in ONE place in staff.js and
   the minutes live in ONE place per brief, so both are checkable - and a
   redesign that quietly half-applies to five briefs and not the sixth is
   exactly what this stops. */
function briefShapeGate() {
  const harness = path.join(__dirname, 'record-tutorial', 'qa-brief-shape.js');
  if (!fs.existsSync(harness)) {
    console.error('qa-brief-shape.js is missing - the brief-shape gate cannot run, so the pack stops.');
    process.exit(1);
  }
  const res = require('child_process').spawnSync(process.execPath, [harness], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error((res.stdout || '') + (res.stderr || ''));
    console.error('\nPACK STOPPED: a teacher brief is not the shape he ruled (DFM 227).');
    process.exit(1);
  }
  /* the named debt prints on every pack, pass or fail (DFM 200's lesson: a
     bounded check that stays silent about what it skipped reads as coverage) */
  (res.stdout || '').split('\n')
    .filter(l => /NAMED DEBT|labels sum to/.test(l))
    .forEach(l => console.log(l.replace(/^\s+/, '  ')));
  console.log('brief-shape gate: PASSED (qa-brief-shape)');
}

/* THE AUDIT GATE (audit gap G7; DFM 195b). Damien: "you've logged rulings as a
   rule. this makes no sense to me. does it have a harness?" Not every rule can
   have one — but no rule may exist without declaring WHICH of the three homes
   enforces it, and that declaration is itself machine-checked. Write rule 199
   tomorrow and forget its row in DFM_ENFORCEMENT_AUDIT.md, and the pack stops.
   Rule 144's law, applied to the file that records rule 144. */
function auditGate() {
  const harness = path.join(__dirname, 'record-tutorial', 'qa-dfm-audit.js');
  if (!fs.existsSync(harness)) {
    console.error('qa-dfm-audit.js is missing - the audit gate cannot run, so the pack stops.');
    process.exit(1);
  }
  const res = require('child_process').spawnSync(process.execPath, [harness], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error((res.stdout || '') + (res.stderr || ''));
    console.error('\nPACK STOPPED: a rule in DAMIEN_FEEDBACK_MASTER.md has no enforcement home.');
    console.error('Add its row to DFM_ENFORCEMENT_AUDIT.md (A harnessed / B judged / D standing');
    console.error('order / E his call / F gap), then pack again.');
    process.exit(1);
  }
  console.log('audit gate: PASSED (qa-dfm-audit)');
}

/* THE COVERAGE GATE (DFM 206). Damien, after his Lesson 5 sit was handed to him
   with the confused-pupil walker reaching four of its twelve surfaces: "how can a
   harness fail to be, well, harnessed? makes no sense and I'm very frustrated."
   Every checker had been pointed at the lesson whose fault created it, and nothing
   mechanical demanded it cover the others. This is that machine: a lesson that
   exists is a lesson that is covered, and it stops the pack when one is not —
   naming lesson x missing harness. Debt is allowed ONLY when written into
   COVERAGE_DEBT.md with a reason, an owner and the lesson's hash, and a lesson
   carrying debt may not be edited at all. */
/* THE YEAR-FOLDER GATE (the J2/J3 stand-up, 14 Aug 2026).
   The packer SHIPS every .json it finds under the content source - a raw
   recursive walk. The coverage gate, by contrast, only walks years DECLARED in
   index.json. Those two facts together are a hole with the exact shape of the
   one DFM 206 was written about: a year folder that exists on disk but is not
   declared would reach pupils having skipped the machine whose whole job is to
   refuse an uncovered lesson. Nothing would say a word.
   It is guarded in BOTH directions, because both are silent:
     folder with no declaration -> it ships uncovered;
     declaration with no folder -> the coverage gate's builtLessons() returns
     early on the missing manifest and the year is silently judged as nothing.
   The second direction is what makes "declare the year and create its folder in
   ONE commit" a rule the machine enforces rather than a habit.
   It runs FIRST, ahead of every other gate, because it is the gate that decides
   whether the other gates can see the whole tree. */
function yearFolderGate() {
  const indexPath = path.join(SRC, 'index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('PACK STOPPED: no index.json at ' + SRC + ' - there is nothing to declare years in.');
    process.exit(1);
  }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const declared = (index.years || []).map(y => y.id);
  const onDisk = fs.readdirSync(SRC, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^j\d+$/i.test(e.name)).map(e => e.name).sort();

  const undeclared = onDisk.filter(n => !declared.includes(n));
  if (undeclared.length) {
    console.error('PACK STOPPED: year folder(s) on disk that index.json does not declare: ' + undeclared.join(', '));
    console.error('  The packer ships every .json it finds, but the coverage gate only walks');
    console.error('  DECLARED years - so ' + undeclared.join(', ') + ' would reach pupils having skipped it');
    console.error('  entirely, and no lesson in it would owe a landmark list, a pinned sit shape');
    console.error('  or a filed cold read. Declare the year in index.json, or remove the folder.');
    process.exit(1);
  }
  const missing = declared.filter(id => !fs.existsSync(path.join(SRC, id)));
  if (missing.length) {
    console.error('PACK STOPPED: index.json declares year(s) with no folder on disk: ' + missing.join(', '));
    console.error('  A declared year whose manifest is missing is skipped in silence by the');
    console.error('  coverage gate, so the year would read as "nothing to cover" rather than as');
    console.error('  a mistake. Create the folder and its manifest, or remove the declaration.');
    process.exit(1);
  }
  console.log('year-folder gate: PASSED - ' + onDisk.length + ' year folder(s), each declared: ' + onDisk.join(', '));
}

function coverageGate() {
  const harness = path.join(__dirname, 'record-tutorial', 'qa-harness-coverage.js');
  if (!fs.existsSync(harness)) {
    console.error('qa-harness-coverage.js is missing - the coverage gate cannot run, so the pack stops.');
    process.exit(1);
  }
  const res = require('child_process').spawnSync(process.execPath, [harness], { encoding: 'utf8' });
  const out = (res.stdout || '') + (res.stderr || '');
  if (res.status !== 0) {
    console.error(out);
    console.error('\nPACK STOPPED: a built lesson is not covered by a harness that applies to it.');
    console.error('Close the cell, or write it into COVERAGE_DEBT.md with a reason, an owner and');
    console.error('the lesson hash. A lesson with no landmark list is a failure, never a skip.');
    process.exit(1);
  }
  /* debt is printed on EVERY pack, never folded away into a quiet exit code */
  const debt = /(\d+) CELL\(S\) OF NAMED DEBT/.exec(out);
  if (debt) {
    console.log('coverage gate: ' + debt[1] + ' CELLS OF NAMED DEBT (see COVERAGE_DEBT.md)');
    /* any year, not a hardcoded j1/j2 pair - a J3 debt row printed nowhere is
       the same silence this gate exists to end */
    out.split('\n').filter(l => /^\s{4}j\d/.test(l)).forEach(l => console.log('   ' + l.trim()));
    console.log('  those surfaces are UNCHECKED - debt, not coverage.');
  } else console.log('coverage gate: PASSED (qa-harness-coverage) - every lesson, every applicable harness');
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
  yearFolderGate();
  languageGate();
  deckShotGate();
  briefShapeGate();
  auditGate();
  coverageGate();
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
