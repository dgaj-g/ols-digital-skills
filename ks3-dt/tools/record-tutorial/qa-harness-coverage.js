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
/* where the harness DECLARATIONS are read from. Overridable for exactly the same
   reason KS3DT_SB3_DIR is: a control must be able to plant a declaration without
   ever editing a shipping harness. Defaults to the real directory. */
const HERE = process.env.KS3DT_HARNESS_DIR || __dirname;

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

/* ------------------------------------------------ THE COVERAGE KEY (year) */
/* Every coverage lookup used to be keyed by the BARE lesson number, because for
   a year there was only one year. J2 and J3 both start at Lesson 1 — a pupil in
   J2 must see "Lesson 1" — so a bare number is no longer a unique name for a
   lesson, and the collision is not theoretical: an uncovered J2 lesson numbered 4
   would have read Lesson 4's landmark list, its pinned sit shape and its filed
   verdicts, and this gate would have called it covered. That is a FALSE PASS in
   the one machine whose whole job is to refuse false passes (DFM 206).
   The key is therefore year-qualified for every year EXCEPT j1, whose existing
   bare-number declarations are read as legacy: J1's six built lessons keep the
   keys they already have, and nothing recorded about them is renamed (DFM 176 —
   locked lessons and their recorded assets are not touched to make a gate tidy).
   Proven both ways by `--control-year`. */
function coverageKey(year, num) {
  return String(year) === 'j1' ? String(num) : String(year) + '-' + String(num);
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
        key: coverageKey(y.id, json.num),
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
  /* Scene FILENAMES are year-qualified for the new years (scenes/j2-l1.js). The
     bare `l<n>.js` form is LEGACY and resolves to j1 only — L2–L5's recorded
     films keep the filenames their pipeline already uses (nothing is renamed to
     make a gate tidy), and a J2 lesson can never satisfy its film row with a
     scene file that belongs to J1. */
  d.film = {};
  const scenesDir = path.join(HERE, 'scenes');
  if (exists(scenesDir)) {
    fs.readdirSync(scenesDir).filter(f => /^(?:l[0-9a-z]+|j[0-9]+-l[0-9a-z]+)\.js$/i.test(f)).forEach(f => {
      const legacy = /^l([0-9a-z]+)\.js$/i.exec(f);
      const yearly = /^(j[0-9]+)-l([0-9a-z]+)\.js$/i.exec(f);
      const key = legacy ? legacy[1].toUpperCase()
        : yearly[1].toLowerCase() + '-' + yearly[2].toUpperCase();
      const src = fs.readFileSync(path.join(scenesDir, f), 'utf8');
      d.film[key] = { file: f, blocks: /BLOCKS_ON_CAMERA/.test(src) };
    });
  }

  /* the judged pass's evidence: a filed verdict row naming the lesson */
  d.verdicts = {};
  fs.readdirSync(KS3).filter(f => /^COLD_READ_VERDICTS.*\.md$/.test(f)).forEach(f => {
    const text = fs.readFileSync(path.join(KS3, f), 'utf8');
    /* "## LESSON 4" / "## LESSON 5" section heads are the file's own structure */
    /* "## LESSON 4" is J1's legacy heading; the new years write "## J2 LESSON 1"
       so a verdict filed for one year can never be counted as another's. */
    (text.match(/^##+\s*(?:(J[0-9]+)\s+)?LESSON\s+([0-9A-Za-z]+)/gim) || []).forEach(h => {
      const m = /^##+\s*(?:(J[0-9]+)\s+)?LESSON\s+([0-9A-Za-z]+)/i.exec(h);
      const n = m[1] ? m[1].toLowerCase() + '-' + m[2].toUpperCase() : m[2].toUpperCase();
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
    /* the YEAR-QUALIFIED key (coverageKey): j1 keeps its bare numbers, every
       other year is "<year>-<num>", so two Lesson 1s can never read each other's
       coverage. Proven both ways by --control-year. */
    const key = L.key;
    const row = { lesson: L.id + ' (' + L.title + ')', cells: {} };

    /* --- every lesson: the confused-pupil walk must name its surfaces --- */
    const lm = d.landmarks[key];
    row.cells.landmarks = lm > 0 ? 'covered (' + lm + ' landmarks)' : 'MISSING';
    check(lm > 0, L.id + ' × sit-wrongpath: a landmark list exists' +
      (lm > 0 ? ' (' + lm + ' surfaces asserted)' : ' — NO LIST, and a lesson with no landmark list is a failure, never a skip'));

    /* --- every lesson: a pinned sit-through shape --- */
    row.cells.sitshape = d.sitshape[key] ? 'covered' : 'MISSING';
    check(!!d.sitshape[key], L.id + ' × sit-review: a pinned shape exists' +
      (d.sitshape[key] ? '' : ' — the walk-through would print "reported only" and pass whatever it saw'));

    /* --- every lesson: filed cold-read verdicts --- */
    row.cells.verdicts = d.verdicts[key] ? 'covered' : 'MISSING';
    check(!!d.verdicts[key], L.id + ' × cold-read verdicts: the judged pass left evidence' +
      (d.verdicts[key] ? '' : ' — no verdict section names this lesson' +
        (L.year === 'j1' ? '' : ' (it needs a "## ' + L.year.toUpperCase() + ' LESSON ' + L.num + '" heading)')));

    /* --- films: only lessons that ship one --- */
    if (L.films.length) {
      const f = d.film[key];
      const wantScene = L.year === 'j1' ? 'l' + L.num + '.js' : L.year + '-l' + L.num + '.js';
      row.cells.film = f ? (f.blocks ? 'covered' : 'covered, NO BLOCK MANIFEST') : 'MISSING';
      check(!!f, L.id + ' × film laws: a scene file exists for its ' + L.films.length +
        ' film(s) (' + L.films.join(', ') + ')' + (f ? ' — ' + f.file : ' — no scenes/' + wantScene + ', so no record-time law ever ran over it'));
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

  /* ---- WAIVED BY HIS RULING (DFM 222b, 14 Aug 2026) ----
     A waiver is NOT a way to make a cell quiet. It is his signature on ONE
     named cell, dated, and it changes exactly one thing: that cell no longer
     FREEZES its lesson against editing. The cell is still printed as debt on
     every run, still counted, and still described as unchecked.
     Why it exists: `j1-01 × film laws` covers `open-a-tab.mp4`, his own screen
     capture from before the film library existed, of a mechanic that has not
     changed. Closing it properly means re-shooting a pupil-visible film in a
     signed-off lesson — a content decision, and he ruled (b): waive it now,
     re-shoot whenever he wants the polish. Without the waiver, Lesson 1's
     teacher brief could never be rebuilt, because a brief lives inside the
     lesson file (DFM 221).
     THE GUARD THAT KEEPS DFM 206 INTACT: only a row carrying the exact
     WAIVED-BY-HIS-RULING marker with a date is exempt. An ordinary debt row
     still freezes its lesson, and `--control-waiver` proves it does. */
  const WAIVER_RE = /WAIVED BY HIS RULING\s+(\d{1,2}\s+\w+\s+\d{4})/i;
  const unledgered = [], stale = [], waived = [];
  owed.forEach(f => {
    const m = /^(\S+) × ([a-z-]+(?: [a-z]+)*):/.exec(f);
    const cell = m ? m[1] + ' × ' + m[2] : f;
    const rowRe = new RegExp('^\\|\\s*' + m[1] + '\\s*\\|\\s*' + m[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|', 'm');
    const row = m && rowRe.exec(ledger);
    if (!row) { unledgered.push(cell); return; }
    const L = lessons.find(x => x.id === m[1]);
    const want = (row[3] || '').trim();
    /* the marker may sit in the WHY column or the OWNER column — read both.
       (The first version read only the owner column, and `--control-waiver`
       caught it: PART 1 failed, which is exactly the job of a control that
       fires before the thing it guards is credited, DFM 196.) */
    const w = WAIVER_RE.exec((row[1] || '') + ' ' + (row[2] || ''));
    if (w) { waived.push(cell + '  (waived ' + w[1] + ' — printed, never frozen)'); return; }
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
  if (waived.length) {
    console.log('WAIVED BY HIS RULING — still uncovered, still printed, no longer freezing its lesson:');
    waived.forEach(c => console.log('    ' + c));
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

/* ------------------------------------------------ THE YEAR-KEY CONTROL (§1)
 * The collision this proves is not hypothetical, and the control is built to
 * reproduce it rather than to assert the fix: it plants a J2 lesson NUMBERED 4
 * — the number a J2 pupil really will see on her second block — and runs the
 * PRE-CHANGE gate over it first.
 *
 *   Part 1  the pre-change gate reads Lesson 4's landmark list, Lesson 4's pinned
 *           sit shape and Lesson 4's filed verdicts for a J2 lesson nothing has
 *           ever walked, and calls it covered. A FALSE PASS, filed as evidence.
 *   Part 2  this gate refuses the same fixture and names it.
 *   Part 3  LEGACY: J1's six built lessons resolve exactly as before — the
 *           coverage matrix rows for j1 are byte-equal pre-change and post-change.
 *   Part 4  and a fixture that declares itself PROPERLY (LANDMARKS['j2-4'],
 *           EXPECT['j2-4'], a "## J2 LESSON 4" verdict heading) passes — so the
 *           new key is satisfiable, not merely stricter.
 *
 *   node qa-harness-coverage.js --control-year
 */
function controlYear() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ks3dt-yearkey-'));
  const say = (ok, m) => { console.log('  ' + (ok ? 'PASS  ' : 'FAIL  ') + m); return ok; };
  const results = [];

  /* ---- the sandbox content tree: J1 untouched, plus a J2 lesson numbered 4 ---- */
  const dst = path.join(tmp, 'content-src');
  fs.cpSync(CONTENT, dst, { recursive: true });
  const j2 = path.join(dst, 'j2');
  fs.mkdirSync(path.join(j2, 'lessons'), { recursive: true });
  fs.writeFileSync(path.join(j2, 'manifest.json'), JSON.stringify({
    year: 'j2', title: 'Fixture Year', lessons: ['j2-04']
  }, null, 1));
  /* deliberately NO film and NO kit: this fixture exists to test the three
     every-lesson rows, so nothing else can account for a pass or a fail */
  fs.writeFileSync(path.join(j2, 'lessons', 'j2-04.json'), JSON.stringify({
    id: 'j2-04', num: '4', title: 'The Number-Four Collision',
    chunks: [{ id: 'c1', engine: 'briefing', config: { intro: 'A J2 lesson nobody has walked.' } }]
  }, null, 1));
  const idx = readJSON(path.join(dst, 'index.json'));
  idx.years.push({ id: 'j2', title: 'Fixture Year', manifest: 'j2/manifest.json' });
  fs.writeFileSync(path.join(dst, 'index.json'), JSON.stringify(idx, null, 1));

  /* ---- a sandbox KS3 dir: the real ledger + verdict files, nothing invented -- */
  const ks3 = path.join(tmp, 'ks3');
  fs.mkdirSync(ks3, { recursive: true });
  fs.readdirSync(KS3).filter(f => /^COVERAGE_DEBT\.md$|^COLD_READ_VERDICTS.*\.md$/.test(f))
    .forEach(f => fs.copyFileSync(path.join(KS3, f), path.join(ks3, f)));

  const runGate = (file, env) => {
    const res = require('child_process').spawnSync(process.execPath, [file], {
      encoding: 'utf8',
      env: Object.assign({}, process.env, {
        KS3DT_CONTENT_SRC: dst, KS3DT_KS3: ks3, KS3DT_SB3_DIR: SB3
      }, env || {})
    });
    return { out: (res.stdout || '') + (res.stderr || ''), status: res.status };
  };
  /* J1's rows out of a matrix print — the legacy comparison of Part 3 */
  const j1Rows = (out) => out.split('\n').filter(l => /^\s{4}j1-/.test(l)).join('\n');
  /* A cell is only "raised" when it is a FAIL. The first cut of this control
     matched "j2-04 × sit-wrongpath" anywhere in the output and therefore matched
     the gate's own PASS line, reporting two faults that did not exist — DFM 146a
     in miniature, caught here rather than in something shown to him. */
  const raised = (out, re) => out.split('\n').some(l => /^\s*FAIL\s/.test(l) && re.test(l));

  /* the PRE-CHANGE gate, written beside the real declarations so its own
     __dirname still finds sit-wrongpath.js — deleted in the finally below */
  const prefixRef = process.env.KS3DT_YEARKEY_PREFIX_REF || 'd39e2eb';
  const prefixFile = path.join(__dirname, '.prefix-coverage-' + process.pid + '.js');
  let post, pre;
  try {
    fs.writeFileSync(prefixFile, require('child_process').execSync(
      'git -C "' + path.resolve(__dirname, '../../..') + '" show ' +
      prefixRef + ':ks3-dt/tools/record-tutorial/qa-harness-coverage.js',
      { maxBuffer: 40 * 1024 * 1024 }).toString('utf8'));

    console.log('CONTROL — the year key (§1). Pre-change ref: ' + prefixRef + '\n');

    console.log('Part 1 — the collision, reproduced against the PRE-CHANGE gate');
    pre = runGate(prefixFile);
    const preNamed = raised(pre.out, /j2-04 × sit-wrongpath/);
    const preCovered = /^\s{4}j2-04 .*covered \(8 landmarks\)/m.test(pre.out);
    results.push(say(!preNamed,
      'pre-change: the J2 lesson numbered 4 is NOT reported as missing a landmark list'));
    results.push(say(preCovered,
      'pre-change: it is reported COVERED BY LESSON 4\'S OWN 8 LANDMARKS — a J2 lesson nothing has ever walked, passing on J1\'s evidence'));

    console.log('\nPart 2 — this gate refuses the same fixture');
    post = runGate(__filename);
    results.push(say(raised(post.out, /j2-04 × sit-wrongpath/),
      'post-change: named j2-04 × sit-wrongpath as having NO landmark list'));
    results.push(say(raised(post.out, /j2-04 × sit-review/),
      'post-change: named j2-04 × sit-review as having no pinned shape'));
    results.push(say(raised(post.out, /j2-04 × cold-read verdicts/) &&
      /"## J2 LESSON 4" heading/.test(post.out),
      'post-change: named j2-04 × cold-read verdicts AND said which heading would satisfy it'));
    results.push(say(post.status !== 0,
      'post-change: the gate exits non-zero — it STOPS the pack (status ' + post.status + ')'));

    console.log('\nPart 3 — legacy: J1 resolves exactly as it did before');
    results.push(say(j1Rows(pre.out) === j1Rows(post.out) && j1Rows(post.out).length > 0,
      'the six J1 coverage rows are byte-equal pre-change and post-change (nothing about J1 was renamed)'));

    console.log('\nPart 4 — a fixture that declares itself properly PASSES');
    /* a sandbox harness dir carrying year-qualified declarations. Only the two
       declaration files are planted; scenes/ is linked so film lookups behave. */
    const hdir = path.join(tmp, 'harness');
    fs.mkdirSync(hdir, { recursive: true });
    fs.writeFileSync(path.join(hdir, 'sit-wrongpath.js'),
      'const LANDMARKS = {\n' +
      Object.entries(objectEntries(path.join(__dirname, 'sit-wrongpath.js'), /const\s+LANDMARKS\s*=/) || {})
        .map(([k, v]) => '  ' + JSON.stringify(k) + ':' + v).join(',\n') +
      ",\n  'j2-4': [\n    ['the briefing card', '.brief-card'],\n    ['the closing screen', '.se-card']\n  ]\n};\n");
    fs.writeFileSync(path.join(hdir, 'sit-review.js'),
      'const EXPECT = {\n' +
      Object.entries(objectEntries(path.join(__dirname, 'sit-review.js'), /const\s+EXPECT\s*=/) || {})
        .map(([k, v]) => '  ' + JSON.stringify(k) + ':' + v).join(',\n') +
      ",\n  'j2-4': { xp: 0, chunks: 1, presses: 0, marks: 0, badges: 0 }\n};\n");
    try { fs.symlinkSync(path.join(__dirname, 'scenes'), path.join(hdir, 'scenes'), 'dir'); } catch (e) {}
    fs.writeFileSync(path.join(ks3, 'COLD_READ_VERDICTS_J2J3.md'),
      '# fixture\n\n## J2 LESSON 4\n\n| screen | verdict |\n|---|---|\n| briefing | fixture row |\n');
    const good = runGate(__filename, { KS3DT_HARNESS_DIR: hdir });
    results.push(say(!raised(good.out, /j2-04 × /),
      'with LANDMARKS[\'j2-4\'], EXPECT[\'j2-4\'] and a "## J2 LESSON 4" heading, j2-04 raises no cell'));
    results.push(say(/j2-04 .*covered \(2 landmarks\)/.test(good.out),
      'and it is credited with ITS OWN 2 landmarks, not Lesson 4\'s 8'));
    results.push(say(good.status === 0,
      'the gate lets the properly-declared year through (status ' + good.status + ') — the key is satisfiable, not merely stricter'));
  } finally {
    try { fs.unlinkSync(prefixFile); } catch (e) {}
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  const bad = results.filter(r => !r).length;
  console.log('\n' + (bad === 0
    ? 'CONTROL PASSED — the bare-number key really did let a J2 lesson pass on J1\'s coverage, and the year key stops it without disturbing J1.'
    : 'CONTROL FAILED — ' + bad + ' of ' + results.length + ' assertions did not hold.'));
  process.exit(bad === 0 ? 0 : 1);
}

/* --------------------------------------------- THE WAIVER CONTROL (DFM 222b)
 * A waiver he has signed must free EXACTLY the cell he signed, and nothing
 * else. The danger of any exemption is the one DFM 213 is about: an exemption
 * that quietly covers a whole class is worse than no check. So this control
 * runs the gate twice over a sandboxed copy of the ledger:
 *
 *   Part 1  the real ledger, with his dated j1-01 × film laws waiver in it, and
 *           j1-01 EDITED. The gate must let the pack run — that is the whole
 *           point of the ruling, and it is what lets Lesson 1's brief be rebuilt.
 *   Part 2  the SAME edit, with the waiver marker stripped out of that one row.
 *           The gate must STOP and name the lesson. If it does not, the waiver
 *           has silently disabled the freeze for everything and DFM 206 is gone.
 */
function controlWaiver() {
  const os2 = require('os');
  const crypto2 = require('crypto');
  const ledgerPath = path.join(KS3, 'COVERAGE_DEBT.md');
  const realLedger = fs.readFileSync(ledgerPath, 'utf8');
  const lessonFile = path.join(CONTENT, 'j1', 'lessons', 'j1-01.json');
  const realLesson = fs.readFileSync(lessonFile, 'utf8');
  const results = [];
  const runGate = () => {
    const r = require('child_process').spawnSync(process.execPath, [__filename], { encoding: 'utf8' });
    return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
  };
  try {
    /* edit the lesson so its hash no longer matches the ledger */
    fs.writeFileSync(lessonFile, realLesson.replace(/\}\s*$/, '  \n}'));
    const editedHash = crypto2.createHash('md5').update(fs.readFileSync(lessonFile)).digest('hex').slice(0, 12);

    const a = runGate();
    results.push({
      name: 'PART 1 — with his dated waiver, an edited j1-01 does NOT stop the pack',
      ok: a.status === 0 && /WAIVED BY HIS RULING/.test(a.out)
    });

    /* strip the marker from that ONE row and try again */
    const stripped = realLedger.split('\n').map(l =>
      /^\|\s*j1-01\s*\|\s*film laws\s*\|/.test(l) ? l.replace(/WAIVED BY HIS RULING[^|]*/i, 'plain debt, no ruling ') : l).join('\n');
    fs.writeFileSync(ledgerPath, stripped);
    const b = runGate();
    results.push({
      name: 'PART 2 — with the marker removed, the same edit STOPS the pack and names it',
      ok: b.status !== 0 && /HAS BEEN EDITED/.test(b.out) && /j1-01/.test(b.out)
    });
    results.push({
      name: 'PART 2 — the freeze names the real edited hash, not a stale one',
      ok: b.out.indexOf(editedHash) !== -1
    });
  } finally {
    fs.writeFileSync(ledgerPath, realLedger);
    fs.writeFileSync(lessonFile, realLesson);
  }
  console.log('CONTROL — a waiver frees the cell he signed, and only that cell (DFM 222b)');
  results.forEach(r => console.log('  ' + (r.ok ? 'OK  ' : 'FAIL') + '  ' + r.name));
  const bad = results.filter(r => !r.ok).length;
  console.log('\n' + (bad === 0
    ? 'CONTROL PASSED — his signature lifts the freeze on exactly one named cell, and an unruled row still freezes its lesson.'
    : 'CONTROL FAILED — ' + bad + ' assertion(s) did not hold. The waiver must never become a general exemption.'));
  process.exit(bad === 0 ? 0 : 1);
}

if (process.argv.includes('--control-year')) controlYear();
else if (process.argv.includes('--control-waiver')) controlWaiver();
else if (process.argv.includes('--control')) control();
else run();
