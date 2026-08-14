#!/usr/bin/env node
/* qa-harness-coverage.js — A LESSON THAT EXISTS IS A LESSON THAT IS COVERED.
 *
 * DAMIEN, 13 Aug 2026 (DFM 206): "how you didn't have the gumption to pro-actively
 * apply the same harnesses to lesson 5 before wasting my time sitting through it?…
 * i mean how can a harness fail to be, well, harnessed? makes no sense and I'm
 * very frustrated."
 *
 * The honest cause, named in that entry: every checker was pointed at the lesson
 * whose fault created it, and NOTHING mechanical demanded it cover the others.
 * Coverage lived as a to-do, and a to-do is not a harness. DFM 194's measure had
 * been applied to fault CLASSES and never to COVERAGE classes.
 *
 * So this is the machine that proves coverage. For every lesson of every year it
 * derives WHICH harnesses apply — from the lesson's own content, never from a
 * hand-kept list that could rot (rule 144) — then reads each harness's own
 * machine-readable declaration and fails naming LESSON × MISSING HARNESS.
 *
 * WHY THE DECLARATIONS ARE READ FROM THE HARNESS SOURCES: a separate registry of
 * "what covers what" is a second copy of a fact, and the second copy is always the
 * one that goes stale. sit-wrongpath's LANDMARKS table IS its coverage claim;
 * sit-review's EXPECT table IS its coverage claim. This file reads those tables.
 *
 * A LESSON WITH NO LANDMARK LIST IS A FAILURE, NEVER A SKIP (his words).
 *
 * Applicability, derived per lesson from the built content:
 *   landmarks   every lesson            sit-wrongpath.js LANDMARKS[num]
 *   sitshape    every lesson            sit-review.js EXPECT[num]
 *   verdicts    every lesson            a COLD_READ_VERDICTS*.md row naming it
 *   film        lessons shipping .mp4   scenes/l<n>.js + its FILM_COVERAGE row
 *   kits        lessons shipping .sb3   sb3/kit-facts.json kit rows (lesson field)
 *
 * CONTROL (the planted-fixture proof, his j2-99 pattern):
 *   node qa-harness-coverage.js --control
 * copies the content tree to a sandbox, plants a lesson nobody covers, and
 * asserts this gate FAILS naming it. A gate that cannot fail is not a gate.
 *
 * Wired into pack-content.js. Usage: node qa-harness-coverage.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const KS3 = process.env.KS3DT_KS3 ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform');
const CONTENT = process.env.KS3DT_CONTENT_SRC || path.join(KS3, 'content-src');
const SB3 = process.env.KS3DT_SB3_DIR || path.join(KS3, 'sb3');
const HERE = __dirname;

const FAILS = [];
const check = (c, m) => { if (c) console.log('  PASS  ' + m); else { console.log('  FAIL  ' + m); FAILS.push(m); } };

/* ---------------------------------------------------------------- helpers */
function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function exists(p) { try { fs.accessSync(p); return true; } catch (e) { return false; } }

/* Parse the KEYS of a top-level object literal out of a harness source. We read
   the declaration where it lives rather than importing the module, because these
   walkers launch browsers at require-time and a coverage gate must stay cheap
   enough to run on every pack. Brace-counted, so a nested object cannot fool it. */
function objectBody(file, declRe) {
  if (!exists(file)) return null;
  const src = fs.readFileSync(file, 'utf8');
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

/* Top-level entries of an object literal, as key -> raw value text. Depth-counted
   so a nested object or array cannot be mistaken for another entry — the first
   cut of this counted '[' characters inside a truncated regex match and reported
   "1 landmark" for a lesson that declares twelve. A gate that invents a number is
   the DFM 146a fault in miniature, so it is parsed properly or not at all. */
function objectEntries(file, declRe) {
  const body = objectBody(file, declRe);
  if (body == null) return null;
  const out = {};
  let depth = 0, key = null, start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
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

/* ------------------------------------------------- the lessons that EXIST */
/* Every year folder, every lesson the year's manifest declares that really has a
   content file. A lesson in the manifest with no file yet is not built and is not
   judged here; a lesson with a file is a lesson pupils can reach. */
function builtLessons() {
  const index = readJSON(path.join(CONTENT, 'index.json'));
  const out = [];
  (index.years || []).forEach(y => {
    const manPath = path.join(CONTENT, y.manifest);
    if (!exists(manPath)) return;
    const man = readJSON(manPath);
    (man.lessons || []).forEach(entry => {
      const id = typeof entry === 'string' ? entry : (entry.id || entry.file);
      if (!id) return;
      const file = path.join(path.dirname(manPath), 'lessons', id + '.json');
      if (!exists(file)) return;                  /* declared but not built yet */
      const json = readJSON(file);
      const blob = JSON.stringify(json);
      /* ASSET PATHS ONLY, and that distinction is a real one: Lesson 1 teaches
         file-naming and its prose contains "DT Project.sb3", which is a sentence
         about naming a file, not a kit the lesson hands out. A bare-filename match
         reported L1 as shipping a kit and demanded a ratchet for a file that does
         not exist — a fault the gate invented (DFM 146a). A shipped asset is
         referenced by its path under assets/. */
      const assets = (re) => [...new Set((blob.match(re) || []).map(s => s.replace(/^.*\//, '')))];
      out.push({
        year: y.id, id: id, num: String(json.num), title: json.title, file: file,
        films: assets(/assets\/[A-Za-z0-9_./-]+\.mp4/g),
        kits: assets(/assets\/[A-Za-z0-9_./-]+\.sb3/g)
      });
    });
  });
  return out;
}

/* ------------------------------------------- what each harness says it covers */
function declarations() {
  const d = {};

  /* sit-wrongpath: the confused-pupil walk. Its LANDMARKS table is its claim —
     and DFM 204 made that table an ASSERTION, so a lesson listed here is a lesson
     the walk must really stand on. An empty list is not a declaration. */
  d.landmarks = {};
  const wpEntries = objectEntries(path.join(HERE, 'sit-wrongpath.js'), /const\s+LANDMARKS\s*=/) || {};
  Object.entries(wpEntries).forEach(([k, body]) => {
    /* each landmark is a ['name', 'selector'] pair — count the pairs, so an
       empty list declares nothing and cannot pass */
    d.landmarks[k] = (body.match(/\[\s*['"]/g) || []).length;
  });

  /* sit-review: the expert walk-through's pinned shape (DFM 199 — deterministic
     numbers only). A lesson with no EXPECT row runs unpinned and prints
     "reported only", which is precisely the silent-coverage class 204 killed. */
  d.sitshape = {};
  Object.keys(objectEntries(path.join(HERE, 'sit-review.js'), /const\s+EXPECT\s*=/) || {}).forEach(k => { d.sitshape[k] = 1; });

  /* kit facts: each kit row names the lesson that ships it (added this round —
     the manifest previously knew every kit's BLOCKS but not whose lesson it was,
     so nothing could tell that a lesson shipping an .sb3 had no ratchet). */
  d.kits = {};
  const kf = path.join(SB3, 'kit-facts.json');
  if (exists(kf)) {
    const facts = readJSON(kf);
    Object.entries(facts.kits || {}).forEach(([file, row]) => {
      const owners = [].concat(row.lesson || row.lessons || []);
      owners.forEach(les => { (d.kits[les] = d.kits[les] || []).push(file); });
    });
  }

  /* film laws: a lesson with a film needs a scene file the record-time laws run
     over, and that scene must declare the blocks it puts on camera (DFM 207c —
     his "anything similarly new or complex needs explained as well"). */
  d.film = {};
  const scenesDir = path.join(HERE, 'scenes');
  if (exists(scenesDir)) {
    fs.readdirSync(scenesDir).filter(f => /^l[0-9a-z]+\.js$/i.test(f)).forEach(f => {
      const num = /^l([0-9a-z]+)\.js$/i.exec(f)[1];
      const src = fs.readFileSync(path.join(scenesDir, f), 'utf8');
      d.film[num.toUpperCase()] = { file: f, blocks: /BLOCKS_ON_CAMERA/.test(src) };
    });
  }

  /* the judged pass's evidence: a filed verdict row naming the lesson */
  d.verdicts = {};
  fs.readdirSync(KS3).filter(f => /^COLD_READ_VERDICTS.*\.md$/.test(f)).forEach(f => {
    const text = fs.readFileSync(path.join(KS3, f), 'utf8');
    /* "## LESSON 4" / "## LESSON 5" section heads are the file's own structure */
    (text.match(/^##+\s*LESSON\s+([0-9A-Za-z]+)/gim) || []).forEach(h => {
      const n = /LESSON\s+([0-9A-Za-z]+)/i.exec(h)[1].toUpperCase();
      d.verdicts[n] = (d.verdicts[n] || 0) + 1;
    });
  });
  return d;
}

/* ------------------------------------------------------------------ the run */
function run() {
  const lessons = builtLessons();
  const d = declarations();
  console.log('qa-harness-coverage — every built lesson, every applicable harness\n');
  console.log('  content: ' + CONTENT);
  console.log('  built lessons: ' + lessons.map(l => l.id).join(', ') + '\n');

  const matrix = [];
  lessons.forEach(L => {
    const num = L.num;
    const row = { lesson: L.id + ' (' + L.title + ')', cells: {} };

    /* --- every lesson: the confused-pupil walk must name its surfaces --- */
    const lm = d.landmarks[num];
    row.cells.landmarks = lm > 0 ? 'covered (' + lm + ' landmarks)' : 'MISSING';
    check(lm > 0, L.id + ' × sit-wrongpath: a landmark list exists' +
      (lm > 0 ? ' (' + lm + ' surfaces asserted)' : ' — NO LIST, and a lesson with no landmark list is a failure, never a skip'));

    /* --- every lesson: a pinned sit-through shape --- */
    row.cells.sitshape = d.sitshape[num] ? 'covered' : 'MISSING';
    check(!!d.sitshape[num], L.id + ' × sit-review: a pinned shape exists' +
      (d.sitshape[num] ? '' : ' — the walk-through would print "reported only" and pass whatever it saw'));

    /* --- every lesson: filed cold-read verdicts --- */
    row.cells.verdicts = d.verdicts[num] ? 'covered' : 'MISSING';
    check(!!d.verdicts[num], L.id + ' × cold-read verdicts: the judged pass left evidence' +
      (d.verdicts[num] ? '' : ' — no verdict section names this lesson'));

    /* --- films: only lessons that ship one --- */
    if (L.films.length) {
      const f = d.film[num];
      row.cells.film = f ? (f.blocks ? 'covered' : 'covered, NO BLOCK MANIFEST') : 'MISSING';
      check(!!f, L.id + ' × film laws: a scene file exists for its ' + L.films.length +
        ' film(s) (' + L.films.join(', ') + ')' + (f ? ' — ' + f.file : ' — no scenes/l' + num + '.js, so no record-time law ever ran over it'));
      if (f) {
        check(f.blocks, L.id + ' × film blocks manifest: every block shown on camera declares where it is taught (DFM 207c)');
      }
    } else row.cells.film = 'n/a';

    /* --- kits: only lessons that ship an .sb3 --- */
    if (L.kits.length) {
      const k = d.kits[L.id] || [];
      row.cells.kits = k.length ? 'covered (' + k.length + ')' : 'MISSING';
      check(k.length > 0, L.id + ' × qa-kit-facts: its ' + L.kits.length +
        ' kit(s) are in the manifest with this lesson named' +
        (k.length ? '' : ' — a card could claim anything about ' + L.kits.join(', ') + ' and nothing would know'));
    } else row.cells.kits = 'n/a';

    matrix.push(row);
  });

  /* the matrix, printed whatever the verdict — he reads this, not just the fails */
  console.log('\n  COVERAGE MATRIX');
  const cols = ['landmarks', 'sitshape', 'verdicts', 'film', 'kits'];
  console.log('    ' + 'lesson'.padEnd(30) + cols.map(c => c.padEnd(22)).join(''));
  matrix.forEach(r => {
    console.log('    ' + r.lesson.padEnd(30) + cols.map(c => String(r.cells[c] || '-').padEnd(22)).join(''));
  });

  /* ------------------------------------------------------------ THE LEDGER */
  /* Everything above is the truth about coverage. This decides what the PACK
     does with it, and the distinction matters:
       - a cell nobody has ever declared → the pack STOPS. That is 206 exactly.
       - a cell written down in COVERAGE_DEBT.md, with a reason, an owner and the
         lesson's content hash → named debt, printed loudly, pack continues.
       - a lesson that carries debt AND HAS BEEN EDITED → the pack STOPS, whatever
         the ledger says. You may not change a lesson whose coverage you owe;
         that is precisely the thing he was angry about (handing him a lesson to
         sit without pointing the harnesses at it).
     A ledger row is not a footnote: it is one line per uncovered surface, in a
     file he reads, and it cannot cover a lesson under active work. */
  const owed = FAILS.slice();
  const ledgerPath = path.join(KS3, 'COVERAGE_DEBT.md');
  const ledger = exists(ledgerPath) ? fs.readFileSync(ledgerPath, 'utf8') : '';
  const crypto = require('crypto');
  const hashOf = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0, 12);

  const unledgered = [], stale = [];
  owed.forEach(f => {
    const m = /^(\S+) × ([a-z-]+(?: [a-z]+)*):/.exec(f);
    const cell = m ? m[1] + ' × ' + m[2] : f;
    const rowRe = new RegExp('^\\|\\s*' + m[1] + '\\s*\\|\\s*' + m[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|', 'm');
    const row = m && rowRe.exec(ledger);
    if (!row) { unledgered.push(cell); return; }
    const L = lessons.find(x => x.id === m[1]);
    const want = (row[3] || '').trim();
    if (L && want && want !== hashOf(L.file)) stale.push(cell + '  (ledger recorded ' + want + ', the lesson is now ' + hashOf(L.file) + ')');
  });

  console.log('');
  if (unledgered.length) {
    console.log('qa-harness-coverage: FAILED — ' + unledgered.length + ' uncovered cell(s) nobody has declared:');
    unledgered.forEach(c => console.log('    ' + c));
    console.log('\nA lesson that exists is a lesson that is covered (DFM 206). Close the cell,');
    console.log('or write it into COVERAGE_DEBT.md with a reason, an owner and the lesson hash.');
    process.exit(1);
  }
  if (stale.length) {
    console.log('qa-harness-coverage: FAILED — a lesson carrying coverage debt HAS BEEN EDITED:');
    stale.forEach(c => console.log('    ' + c));
    console.log('\nYou may not change a lesson whose coverage you owe. Cover it first, or');
    console.log('revert the edit. (This is the rule his Lesson 5 sit was owed — DFM 206.)');
    process.exit(1);
  }
  if (owed.length) {
    console.log('qa-harness-coverage: ' + owed.length + ' CELL(S) OF NAMED DEBT, every one written down and unchanged.');
    console.log('  See COVERAGE_DEBT.md. No lesson carrying debt has been edited, so the pack runs.');
    console.log('  This is DEBT, not coverage: those surfaces are UNCHECKED and he has been told so.');
    process.exit(0);
  }
  console.log('qa-harness-coverage: PASSED — every built lesson is covered by every applicable harness.');
}

/* ------------------------------------------------------------- the control */
/* His j2-99 pattern: plant a lesson nobody covers and prove this gate names it.
   The sandbox is a COPY — a control never edits the shipping content tree. */
function control() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ks3dt-coverage-'));
  const dst = path.join(tmp, 'content-src');
  fs.cpSync(CONTENT, dst, { recursive: true });

  /* a whole new YEAR folder, so the walk has to find it by itself */
  const j2 = path.join(dst, 'j2');
  fs.mkdirSync(path.join(j2, 'lessons'), { recursive: true });
  fs.writeFileSync(path.join(j2, 'manifest.json'), JSON.stringify({
    year: 'j2', title: 'Fixture Year', lessons: ['j2-99']
  }, null, 1));
  fs.writeFileSync(path.join(j2, 'lessons', 'j2-99.json'), JSON.stringify({
    id: 'j2-99', num: '99', title: 'The Planted Fixture',
    chunks: [{ id: 'c1', engine: 'briefing', config: { intro: 'A lesson nobody covers.' } },
      { id: 'c2', engine: 'video', config: { src: 'assets/video/j2/fixture.mp4' } }]
  }, null, 1));
  const index = readJSON(path.join(dst, 'index.json'));
  index.years.push({ id: 'j2', title: 'Fixture Year', manifest: 'j2/manifest.json' });
  fs.writeFileSync(path.join(dst, 'index.json'), JSON.stringify(index, null, 1));

  const res = require('child_process').spawnSync(process.execPath, [__filename], {
    encoding: 'utf8', env: Object.assign({}, process.env, { KS3DT_CONTENT_SRC: dst })
  });
  const out = (res.stdout || '') + (res.stderr || '');
  const named = /j2-99 × sit-wrongpath/.test(out);
  const failed = res.status !== 0;
  const filmToo = /j2-99 × film laws/.test(out);
  console.log('CONTROL — a planted lesson nobody covers (the j2-99 pattern)');
  console.log('  gate exit status: ' + res.status + (failed ? '  (non-zero — it refused)' : '  (ZERO — it let the fixture through)'));
  console.log('  named the lesson × the missing walker: ' + named);
  console.log('  spotted its film had no scene file: ' + filmToo);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (failed && named && filmToo) { console.log('\nCONTROL PASSED — the gate fails on an uncovered lesson and names it.'); process.exit(0); }
  console.log('\nCONTROL FAILED — this gate cannot catch what it exists to catch.');
  console.log(out.split('\n').filter(l => /j2-99|FAILED|PASSED/.test(l)).join('\n'));
  process.exit(1);
}

if (process.argv.includes('--control')) control(); else run();
