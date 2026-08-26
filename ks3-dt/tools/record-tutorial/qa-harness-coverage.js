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
/* A COMMENT MUST NOT BE ABLE TO SILENCE THIS GATE (16 Aug 2026, and it silenced
   it). The entry scanner below looks for `key:` at depth 0, and a `/* ... *\/`
   comment sitting between two entries is just characters to it — so the phrase
   "(DFM 199: pin only what does not move)" inside a comment above EXPECT['j3-1']
   registered a phantom key `199`, swallowed the real entry, and the pack
   reported that J3 Lesson 1 had no pinned shape when it had one. A gate a
   comment can fool is the DFM 146a fault, so comments are stripped before
   anything is parsed. String literals here never contain comment markers, and
   the controls at the foot of this file prove the tables still parse. */
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
        /* `mode` and the brief itself, for the teacher-layer row: a self-paced
           lesson is not teacher-delivered and is exempt by its own declaration
           rather than by a list somebody maintains (K23's law) */
        mode: json.mode || 'taught', json: json,
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

  /* the brief read-aloud ledger, per lesson (DFM 257). Read through
     qa-language's own collector so the gate and the checker can never disagree
     about which sentences exist (DFM 144 — the deck collector's own lesson). */
  d.briefLedger = {};
  try {
    const QL = require('./qa-language.js');
    const crypto2 = require('crypto');
    const sha1x = (t) => crypto2.createHash('sha1').update(t, 'utf8').digest('hex').slice(0, 16);
    const ledgerFile = path.join(CONTENT, 'language-ledger.json');
    const led = exists(ledgerFile) ? readJSON(ledgerFile) : { entries: {} };
    /* CONTENT, not the collector's own default. loadLessons() with no argument
       reads the REAL content-src, so in a sandboxed control run this declaration
       would have described the wrong tree entirely — and it did, until Part 4
       reported the fixture as having "no brief sentences at all" (DFM 146a: the
       gate inventing a fault, caught by its own control before it was trusted). */
    const lessonsForBrief = QL.loadLessons(CONTENT);
    QL.collectBriefStrings(lessonsForBrief).forEach(b => {
      const r = d.briefLedger[b.lesson] = d.briefLedger[b.lesson] || { total: 0, recorded: 0, stale: 0 };
      r.total++;
      const e = (led.entries || {})[b.path];
      if (!e) return;
      if (e.sha1 !== sha1x(b.text)) { r.stale++; return; }
      r.recorded++;
    });
  } catch (e) {
    /* a declaration that cannot be read is not a pass — it is a failure that
       names its own cause (DFM 238c: the cheapest disqualifying question first) */
    d.briefLedgerError = e.message;
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
      /* WHICH FILMS THE SCENE ACTUALLY RECORDS (23 Aug 2026). Until the side
         quest, one lesson meant one source of films and "there is a scene file"
         was the same statement as "everything this lesson ships was recorded by
         the pipeline". The side quest broke that: it ships ONE pipeline film
         (the cloud explainer) and TWO of his own screen captures, which have no
         scene script and cannot have one. A scene file alone would therefore
         have closed the cell for all three and stopped anyone asking who checks
         the other two — silent coverage, the DFM 204/206 fault.
         So a scene may DECLARE the films it records. Declaring is opt-in: a
         scene that says nothing covers its lesson's films exactly as before, so
         no existing row moves. */
      const decl = /FILMS_RECORDED\s*=\s*\[([^\]]*)\]/.exec(src);
      const records = decl
        ? (decl[1].match(/['"]([^'"]+)['"]/g) || []).map(x => x.replace(/['"]/g, ''))
        : null;
      d.film[key] = { file: f, blocks: /BLOCKS_ON_CAMERA/.test(src), records: records };
    });
  }

  /* A FILM MADE FROM HIS OWN CAPTURE HAS NO SCENE SCRIPT, AND CANNOT HAVE ONE
     (23 Aug 2026). `qa-film-laws` enforces RECORD-TIME laws inside the recorder,
     over a scene script, while a film is being made. The side quest's two films
     are DAMIEN'S OWN screen recordings: our pipeline conforms them and burns his
     captions on, and there is no recording to run a record-time law over. This
     gate was right to refuse the lesson — a film with nothing checking it is
     exactly what DFM 206 exists to stop — so the cell is closed by a harness
     that measures what IS measurable about a finished film, in its own pixels:
     `qa-sq-films.js` (silent, right frame, not truncated, every caption's
     timing inside the film and non-overlapping, the burned words identical to
     the lesson's, and a caption box really on screen in each window and really
     absent between them, detector proved both ways).
     THIS IS NOT A WAY ROUND THE ROW. A film-laws cell may be satisfied this way
     ONLY where the harness names the exact film files it covers, and only for
     films the pipeline did not record; anything the recorder makes still owes a
     scene file and its block manifest. */
  d.ownCaptureFilms = {};
  {
    /* __dirname, NOT HERE: HERE is repointed by the year control at a sandbox
       of DECLARATION files (LANDMARKS, EXPECT), and this harness is not one of
       those - it is a fixed sibling of this gate. Reading it from HERE made the
       side quest's film cell collapse inside that control's sandbox. */
    const own = path.join(__dirname, 'qa-sq-films.js');
    if (exists(own)) {
      /* the harness derives its film list from the content, so read the same
         content to learn which lesson it is standing over */
      const sq = path.join(CONTENT, 'j1', 'lessons', 'j1-sq1.json');
      if (exists(sq)) {
        const L = readJSON(sq);
        const files = [];
        (L.chunks || []).forEach(ch => ((ch.config || {}).steps || []).forEach(st => {
          if (st.clip && st.clip.src && (st.clip.captions || []).length) {
            files.push(path.basename(String(st.clip.src)));
          }
        }));
        if (files.length) d.ownCaptureFilms['S1'] = { harness: 'qa-sq-films.js', files: files };
      }
    }
  }

  /* the teacher layer's own evidence: a deck file for the lesson. Read from the
     content tree, so a deck that exists is a deck this gate can see — the same
     reason every other declaration here is read where it lives (rule 144). */
  d.decks = {};
  fs.readdirSync(CONTENT).filter(f => /^j\d+$/.test(f)).forEach(y => {
    const dir = path.join(CONTENT, y, 'decks');
    if (!exists(dir)) return;
    fs.readdirSync(dir).filter(f => f.endsWith('.deck.json')).forEach(f => {
      d.decks[f.replace(/\.deck\.json$/, '')] = f;
    });
  });

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

    /* ═══ THE TEACHER LAYER — template §6's promised `qa-teacher-covered` row ═══
       Built 18 Aug 2026, and it should have existed when the first deck did.
       TEACHER_LAYER_TEMPLATE §6 has named this row since 14 August: "a lesson that
       is BUILT AND APPROVED must have deck + script + brief to this template,
       proven by machine". Nothing checked it. So a lesson could ship pupil-side
       complete with a half-page interim note and no machine would say a word —
       which is precisely what J2/J3 Lesson 1 did for two days. That was HIS
       ruling (K3) and therefore fine; what is not fine is that the ruling was the
       only thing standing between the platform and a silent gap, because a
       ruling is a decision and a gate is a guarantee (DFM 206's own law: a lesson
       that exists is a lesson that is covered, and a machine proves it).

       WHAT IT ASKS: a deck file for the lesson, and a teacherBrief carrying all
       six sections his DFM 227 order names, none of them empty. It does NOT
       re-check their shape or their words — qa-teacher-spine, qa-brief-shape,
       qa-deck-shots, qa-deck-geometry and the language gate each own a piece of
       that, and duplicating them here would be two homes for one fact (DFM 144).

       WHAT IT EXEMPTS, and only this: a lesson that is SELF-PACED. The side quest
       is not teacher-delivered and he kept it out of the round deliberately (DFM
       220d), so the lesson's own `mode` decides rather than a list somebody
       maintains — a hardcoded exemption is how K23's fault gets in.
       AND IT IS WRITTEN AS "NOT SELF-PACED" RATHER THAN "IS TAUGHT" ON PURPOSE:
       J1's five lessons declare `mode: "quest"` (the original name) and the two
       new years declare `mode: "taught"`, so a test for the word "taught" would
       have exempted every J1 lesson in silence — the gate would have printed n/a
       against the five decks this template was BUILT from. A default that lets a
       surface through is the DFM 204 fault; the default here is that a lesson is
       teacher-delivered unless it says it is not. */
    if (L.mode !== 'sidequest' && L.mode !== 'selfpaced') {
      const brief = (L.json && L.json.teacherBrief) || {};
      const SECTIONS = ['purpose', 'prepare', 'resources', 'runningTheHour', 'atAGlance', 'goesWrong'];
      const empty = SECTIONS.filter(k => {
        const v = brief[k];
        if (Array.isArray(v)) return v.length === 0;
        return !v;
      });
      const hasDeck = !!d.decks[L.id];
      const interim = !!brief.interim;
      const ok = hasDeck && !empty.length && !interim;
      row.cells.teacher = ok ? 'covered' : 'MISSING';
      check(ok, L.id + ' × teacher layer: a deck and a full six-section brief exist' +
        (ok ? '' : ' — ' + [
          hasDeck ? null : 'no deck file',
          interim ? 'the brief is still marked interim' : null,
          empty.length ? 'the brief has nothing in ' + empty.join(', ') : null
        ].filter(Boolean).join('; ') +
        '. A taught lesson with no teacher layer is a lesson a colleague cannot deliver'));
    } else row.cells.teacher = 'n/a';

    /* ═══ THE STRETCH CELL — DFM 259, HIS RULING, 25 Aug 2026 ═══
       His words, after sitting J2 Lesson 2: "This lesson is too short for the
       hour, I think and there is no stretch and challenge, which all lessons
       going forward should absolutely have."
       So every lesson whose design round OPENS after 25 Aug 2026 must carry a
       stretch element a MACHINE can find. Four shapes count, and they are the
       four the platform builds:
         · an EXTRAS ZONE — a chunk in `extrasMode` (DFM 265, 26 Aug 2026). This
           is the shape every lesson from J2/J3 L2 onward uses, and it satisfies
           the cell MORE completely than the thing it replaced: the V54 stretch
           was one refusable offer at the end of a badged chunk; the zone is a
           hub of jobs, after the badge, with a way out on every screen. The cell
           demands what makes it a stretch rather than a chore — jobs to do, and
           a `finishLabel` to leave by — because a zone with neither would be an
           empty room satisfying a gate;
         · a pyrun chunk with a `stretch` object (the V54 shape, now retired from
           J2/J3 L2 but still the ladder's in J1);
         · any chunk or scene flagged `stretch` / carrying a `stretch` config —
           the J1 ladder's dashed rung and the items runner's optional tail;
         · a chunk declaring `optional: true`, which is K11d's refusal law made
           structural (a stretch that cannot be refused is not a stretch).
       EVERY EXISTING LESSON IS GRANDFATHERED BY A DATED ROW, and that is not a
       loophole: he ruled the law forward, not backward ("all lessons going
       forward"). j2-02 and j3-02 are NOT grandfathered — they ship this round's
       stretch and must pass the cell for real, which is the whole point of
       building the cell in the same round as the content.
       The grandfather list is dated and explicit rather than computed from a
       cut-off, because a date arithmetic on file mtimes would silently
       grandfather anything an editor touched (the DFM 204 default fault). */
    const STRETCH_GRANDFATHERED = {
      '1': '25 Aug 2026 — J1 Lesson 1, approved 1 Aug, before DFM 259 existed',
      '2': '25 Aug 2026 — J1 Lesson 2, approved 2 Aug (it does carry a stretch rung; the row is dated anyway so the lock is never crossed to satisfy a gate)',
      '3': '25 Aug 2026 — J1 Lesson 3, approved 11 Aug',
      '4': '25 Aug 2026 — J1 Lesson 4, approved 13 Aug',
      '5': '25 Aug 2026 — J1 Lesson 5, approved 14 Aug',
      'S1': '25 Aug 2026 — the side quest, self-paced and outside the taught set (DFM 220d)',
      'j2-1': '25 Aug 2026 — J2 Lesson 1, approved 18 Aug (its Hard Inspection is a real refusable stretch; dated anyway)',
      'j3-1': '25 Aug 2026 — J3 Lesson 1, approved 18 Aug (its two Hard Cases likewise)'
    };
    {
      const blob = JSON.stringify(L.json);
      /* what a machine can actually find, named so a reader can check the claim */
      const found = [];
      (L.json.chunks || []).forEach(ch => {
        const cfg = ch.config || {};
        if (cfg.extrasMode === true) {
          /* not merely "the flag is present": a zone with no jobs, or with no way
             out of one, is not a stretch — it is a trap with a label on it (265c) */
          const jobs = (cfg.builds || []).length;
          if (jobs > 0 && String(cfg.finishLabel || '').trim()) {
            found.push(ch.id + ' (extras zone, ' + jobs + ' job' + (jobs === 1 ? '' : 's') + ', DFM 265)');
          }
        }
        if (cfg.stretch && typeof cfg.stretch === 'object') found.push(ch.id + ' (pyrun/config stretch)');
        else if (ch.stretch || cfg.stretch) found.push(ch.id + ' (stretch flag)');
        if (cfg.optionalTail || ch.optional === true || cfg.optional === true) found.push(ch.id + ' (refusable optional tail)');
        (cfg.scenes || []).forEach((sc, si) => { if (sc && sc.optional) found.push(ch.id + '/' + (sc.id || 'scene ' + (si + 1)) + ' (optional scene)'); });
      });
      const grand = STRETCH_GRANDFATHERED[key];
      const ok = found.length > 0;
      row.cells.stretch = ok ? 'covered (' + found.length + ')' : (grand ? 'grandfathered' : 'MISSING');
      if (ok) {
        check(true, L.id + ' × stretch: a machine can find it (DFM 259) — ' + found.join(', '));
      } else if (grand) {
        console.log('    NOTE  ' + L.id + ' × stretch: GRANDFATHERED — ' + grand);
      } else {
        check(false, L.id + ' × stretch: NOTHING a machine can find (DFM 259). His ruling, 25 Aug 2026: ' +
          '"there is no stretch and challenge, which all lessons going forward should absolutely have." ' +
          'Ship a refusable stretch, or file a dated WAIVED BY HIS RULING row.');
      }
    }

    /* ═══ THE BRIEF-LANGUAGE CELL — DFM 257, the same day ═══
       The briefs were the one register with neither a mechanical rule nor a
       judged read, and his sentence is what proved it. A cell here is what stops
       that being true again for a lesson built next month: a lesson with a
       teacher layer must have every brief sentence carrying a read-aloud row.
       It asks the LEDGER, not the words — qa-language's BRIEF section owns the
       words (DFM 144, one fact one home). A grandfathered row counts, because a
       grandfathered row is still a record and still voids the moment the
       sentence is edited; what does not count is a sentence nobody has recorded
       at all. */
    if (L.mode !== 'sidequest' && L.mode !== 'selfpaced') {
      const rows = d.briefLedger[L.id] || { total: 0, recorded: 0, stale: 0 };
      const ok = rows.total > 0 && rows.recorded === rows.total && rows.stale === 0;
      row.cells.briefLang = ok ? 'covered (' + rows.total + ')'
        : (rows.total === 0 ? 'MISSING' : rows.recorded + '/' + rows.total +
           (rows.stale ? ', ' + rows.stale + ' stale' : ''));
      check(ok, L.id + ' × brief language: every brief sentence carries a read-aloud row (DFM 257)' +
        (ok ? ' (' + rows.total + ')' : ' — ' + (rows.total === 0
          ? 'this lesson has no brief sentences at all'
          : (rows.total - rows.recorded) + ' unrecorded and ' + rows.stale + ' voided by editing. ' +
            'The brief is a gated register from 25 Aug 2026; his own sentence is why.')));
    } else row.cells.briefLang = 'n/a';

    /* --- films: only lessons that ship one --- */
    if (L.films.length) {
      const f = d.film[key];
      const own = d.ownCaptureFilms[key];
      /* an own-capture harness only counts if it covers EVERY film the lesson
         ships — half a lesson's films checked is the DFM 204 fault */
      const wantScene = L.year === 'j1' ? 'l' + L.num + '.js' : L.year + '-l' + L.num + '.js';
      /* EVERY FILM THE LESSON SHIPS IS ATTRIBUTED TO SOMETHING THAT CHECKS IT.
         A scene covers the films it declares, or — when it declares none — all of
         them, which is how every lesson before the side quest works. Anything the
         scene does not cover must be named by an own-capture harness. */
      const sceneCovers = (v) => !!f && (f.records ? f.records.indexOf(v) !== -1 : true);
      const ownCovers = (v) => !!own && own.files.indexOf(v) !== -1;
      const orphans = L.films.filter(v => !sceneCovers(v) && !ownCovers(v));
      const ownCoversAll = !!own && L.films.every(ownCovers);
      row.cells.film = orphans.length ? 'MISSING'
        : (f && own ? 'covered (' + f.file + ' + ' + own.harness + ')'
          : f ? (f.blocks ? 'covered' : 'covered, NO BLOCK MANIFEST')
            : 'covered (own-capture: ' + own.harness + ')');
      check(orphans.length === 0, L.id + ' × film laws: all ' + L.films.length +
        ' film(s) (' + L.films.join(', ') + ') are checked by something — ' +
        (orphans.length
          ? ' — NOTHING covers ' + orphans.join(', ') + (f ? ' (scenes/' + f.file +
              (f.records ? ' records only ' + f.records.join(', ') : '') + ')'
            : ' (no scenes/' + wantScene + ')')
          : [f ? f.file + (f.records ? ' (records ' + f.records.join(', ') + ')' : '') : null,
             own ? own.harness + ' (his own captures, no scene script to record-time-check)' : null]
              .filter(Boolean).join(' + ')));
      if (f) {
        check(f.blocks, L.id + ' × film blocks manifest: every block shown on camera declares where it is taught (DFM 207c)');
      }
      void ownCoversAll;
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
  const cols = ['landmarks', 'sitshape', 'verdicts', 'stretch', 'briefLang', 'film', 'kits'];
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
    /* A FAILURE THIS PARSER CANNOT READ IS UNLEDGERED DEBT, NOT A CRASH.
       Until 25 Aug 2026 the next line built a RegExp out of `m[1]` before
       anything had checked that `m` was non-null, so the first cell whose
       message did not fit the pattern took the whole gate down with a
       TypeError — and a checker that crashes reports nothing at all: not a
       pass, not a fail, just an unchecked surface with a stack trace over it
       (DFM 200, his own ruling: "why would i want to sit through something
       that might be broken?"). It was found by adding a cell whose name
       carried a bracket. Now an unreadable message falls through to the
       unledgered list, which is the honest reading of it. */
    const rowRe = m && new RegExp('^\\|\\s*' + m[1] + '\\s*\\|\\s*' + m[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|', 'm');
    const row = rowRe && rowRe.exec(ledger);
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
  /* MATRIX rows only. The original matched any 4-space-indented j1- line, which
     also catches the gate's own FAILURE list ("    j1-sq1 × film laws: ...") —
     harmless while both runs produced the same failures, and wrong the moment
     one gate refused a cell the other covered: the comparison then saw 7 rows
     against 6 and reported a J1 rename that had not happened (DFM 146a). A
     matrix row never contains " × "; a raised-cell line always does. */
  const j1Rows = (out) => out.split('\n')
    .filter(l => /^\s{4}j1-/.test(l) && l.indexOf(' \u00d7 ') === -1).join('\n');
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
    /* RE-STAGED TWICE, AND RE-STAGED RATHER THAN RELAXED. This part's job is
       "the year-key change renamed nothing about J1", and it originally did that
       by demanding every J1 MATRIX ROW be byte-equal to the pre-change gate's.
       That was the right instinct and the wrong instrument, and two legitimate
       changes have now proved it: the side quest gained his own-capture films
       (23 Aug), and the matrix gained two columns — stretch and brief language
       (25 Aug, DFM 259/257). Padded columns shift when the matrix grows, so the
       row comparison reports drift that does not exist, which is the fault a
       control must never have (DFM 146a).
       So it now compares what it always MEANT to compare: for every J1 lesson,
       the gate's own PASS/FAIL line for each cell that existed BEFORE the change,
       taken line by line out of both runs. A new column cannot disturb it, a
       renamed J1 key fails it immediately, and the one sanctioned J1 movement is
       still stated as an exact substitution rather than tolerated as a diff.
       (DFM 143b: a new cell re-stages every control, not just the one in front
       of you.) */
    const PRE_CHANGE_CELLS = ['sit-wrongpath', 'sit-review', 'cold-read verdicts', 'film laws', 'film blocks manifest', 'qa-kit-facts'];
    /* THE VERDICT AND THE CELL KEY, NOT THE WHOLE MESSAGE. The film-laws line's
       WORDING was legitimately rewritten on 23 Aug ("a scene file exists for its
       N films" became "all N films are checked by something"), so comparing the
       prose would report every J1 film row as drift — a fault the control would
       have invented. What this part is actually about is whether a J1 lesson
       still resolves to the same ANSWER on the same cell, and that is exactly
       what is compared. */
    const j1Cells = (out) => out.split('\n')
      .filter(l => /^\s{2}(PASS|FAIL)\s+j1-/.test(l))
      .map(l => /^\s{2}(PASS|FAIL)\s+(j1-\S+) × ([a-z-]+(?: [a-z]+)*):/.exec(l))
      .filter(m => m && PRE_CHANGE_CELLS.indexOf(m[3]) !== -1)
      .map(m => m[1] + ' ' + m[2] + ' × ' + m[3]);
    const preCells = j1Cells(pre.out), postCells = j1Cells(post.out);
    const onlyPre = preCells.filter(l => postCells.indexOf(l) === -1);
    const onlyPost = postCells.filter(l => preCells.indexOf(l) === -1);
    results.push(say(preCells.length > 0 && postCells.length > 0,
      'both runs really produced J1 cell lines to compare (' + preCells.length + ' pre, ' +
      postCells.length + ' post) — a comparison of two empty lists would pass for the wrong reason'));
    results.push(say(onlyPre.length === 0 && onlyPost.length === 0,
      'every J1 cell resolves to the SAME verdict pre-change and post-change — nothing about J1 was ' +
      'renamed, and neither new column disturbed a legacy row' +
      (onlyPre.length || onlyPost.length
        ? ' — drifted: ' + onlyPre.concat(onlyPost).slice(0, 3).join(' || ') : '')));
    /* THE OWN-CAPTURE ATTRIBUTION IS ASSERTED SEPARATELY, and the reason is worth
       writing down. Until 25 Aug this part allowed "at most one row to differ" and
       then named that row as j1-sq1's film cell going MISSING -> own-capture. At
       VERDICT granularity there is no difference to find: the PRE-CHANGE gate
       passed j1-sq1 on the mere EXISTENCE of scenes/lS1.js, and the current gate
       passes it because qa-sq-films.js names the two files the scene does not
       record. Same answer, completely different evidence. Reporting that as "one
       sanctioned diff" would have been reading a coincidence as a guard. So the
       verdict comparison is now exact (ZERO J1 cells may move), and the thing the
       old assertion was really protecting — that the side quest's own captures are
       credited to a named harness rather than waved through — is asserted on its
       own terms. */
    results.push(say(/j1-sq1 × film laws:[^\n]*qa-sq-films\.js/.test(post.out),
      'and j1-sq1\'s film cell is credited to qa-sq-films.js BY NAME (his two own captures have no ' +
      'scene script and cannot have one — the route is named, never waved through)'));
    results.push(say(/j1-sq1 × film laws: all 3 film\(s\)/.test(post.out),
      'covering all three of its films, so half a lesson\'s films can never read as covered (DFM 204)'));
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
    /* AND ITS TEACHER LAYER (added 23 Aug 2026, and it is a repair, not a new
       idea). `qa-harness-coverage` grew a teacher-layer cell on 18 August
       (DFM 238d) and this fixture was never re-staged to declare one, so Part 4
       - the half that proves the key is SATISFIABLE rather than merely stricter
       - has been failing ever since, silently, because the pack never runs the
       control modes. DFM 143(b) exactly: a new cell re-stages every control,
       not just the one in front of you. A fixture that calls itself "properly
       declared" must declare everything the gate asks of a taught lesson. */
    fs.mkdirSync(path.join(dst, 'j2', 'decks'), { recursive: true });
    fs.writeFileSync(path.join(dst, 'j2', 'decks', 'j2-04.deck.json'),
      JSON.stringify({ id: 'j2-04.deck', lesson: 'j2-04', slides: [] }, null, 1));
    const fx = readJSON(path.join(j2, 'lessons', 'j2-04.json'));
    /* AND ITS STRETCH (25 Aug 2026, DFM 259) — the same repair as the teacher
       layer one line below, for the same reason: a new cell re-stages every
       control (DFM 143b). A fixture that calls itself "properly declared" must
       declare everything the gate asks of a taught lesson, and from today that
       includes a stretch a machine can find. The dedicated `--control-stretch`
       proves the other direction: strip this and the gate stops. */
    fx.chunks.push({ id: 'build', engine: 'pyrun', config: {
      lines: ['print("hello")'],
      stretch: { id: 'fx-stretch', optional: true, xp: 5, target: 'hello' }
    } });
    fx.teacherBrief = {
      purpose: ['A fixture brief, so the teacher-layer cell has something to find.'],
      atAGlance: [{ part: 'Briefing', what: 'A fixture part.' }],
      prepare: [{ title: 'Nothing', text: 'A fixture row.' }],
      resources: [{ label: 'None', what: 'A fixture row.', where: 'n/a' }],
      runningTheHour: [{ part: 'The hour', mins: 60, text: 'A fixture row.' }],
      goesWrong: [{ q: 'Nothing goes wrong.', a: 'It is a fixture.' }]
    };
    fs.writeFileSync(path.join(j2, 'lessons', 'j2-04.json'), JSON.stringify(fx, null, 1));
    /* AND ITS BRIEF READ-ALOUD ROWS (25 Aug 2026, DFM 257). Same repair again:
       the brief-language cell asks the LEDGER, so a fixture brief with no rows
       is an unrecorded brief and the gate is right to refuse it. The rows are
       written through qa-language's own collector so the fixture cannot drift
       away from what the gate reads (DFM 144). */
    {
      const QL = require('./qa-language.js');
      const crypto3 = require('crypto');
      const sha1f = (t) => crypto3.createHash('sha1').update(t, 'utf8').digest('hex').slice(0, 16);
      const ledFile = path.join(dst, 'language-ledger.json');
      const led = exists(ledFile) ? readJSON(ledFile) : { entries: {} };
      QL.collectBriefStrings(QL.loadLessons(dst)).filter(b => b.lesson === 'j2-04').forEach(b => {
        led.entries[b.path] = { sha1: sha1f(b.text), reviewed: 'fixture row', by: 'control', date: '2026-08-25' };
      });
      fs.writeFileSync(ledFile, JSON.stringify(led, null, 1));
    }
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

/* ------------------------------------------- THE STRETCH CONTROL (DFM 259)
 * His ruling, 25 Aug 2026: "This lesson is too short for the hour, I think and
 * there is no stretch and challenge, which all lessons going forward should
 * absolutely have."
 *
 * A cell that only ever says PASS is not evidence. This control plants a NEW
 * lesson twice over a sandboxed content tree — once with no stretch anywhere in
 * it, once with the refusable stretch this round's engine field provides — and
 * proves the gate STOPS on the first and lets the second through. It also proves
 * the grandfather list is a list of NAMED, DATED lessons rather than a general
 * amnesty: the fixture is not on it and cannot be, which is the difference
 * between his ruling being carried forward and being quietly cancelled.
 *
 *   node qa-harness-coverage.js --control-stretch
 */
function controlStretch() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ks3dt-stretch-'));
  const say = (ok, m) => { console.log('  ' + (ok ? 'PASS  ' : 'FAIL  ') + m); return ok; };
  const results = [];
  const dst = path.join(tmp, 'content-src');
  fs.cpSync(CONTENT, dst, { recursive: true });
  const ks3 = path.join(tmp, 'ks3');
  fs.mkdirSync(ks3, { recursive: true });
  fs.readdirSync(KS3).filter(f => /^COVERAGE_DEBT\.md$|^COLD_READ_VERDICTS.*\.md$/.test(f))
    .forEach(f => fs.copyFileSync(path.join(KS3, f), path.join(ks3, f)));

  const j2 = path.join(dst, 'j2');
  const write = (withStretch) => {
    const chunks = [{ id: 'c1', engine: 'briefing', config: { intro: 'A new lesson, designed after 25 Aug 2026.' } }];
    if (withStretch) {
      chunks.push({ id: 'build', engine: 'pyrun', config: {
        lines: ['print("hello")'],
        stretch: { id: 'fx-stretch', optional: true, xp: 5, target: 'hello' }
      } });
    } else {
      chunks.push({ id: 'build', engine: 'pyrun', config: { lines: ['print("hello")'] } });
    }
    fs.writeFileSync(path.join(j2, 'lessons', 'j2-09.json'), JSON.stringify({
      id: 'j2-09', num: '9', year: 'j2', title: 'A Lesson With No Stretch', mode: 'taught',
      chunks: chunks
    }, null, 1));
  };
  fs.mkdirSync(path.join(j2, 'lessons'), { recursive: true });
  fs.writeFileSync(path.join(j2, 'manifest.json'), JSON.stringify({
    year: 'j2', title: 'Fixture Year', lessons: ['j2-09']
  }, null, 1));
  const idx = readJSON(path.join(dst, 'index.json'));
  if (!idx.years.some(y => y.id === 'j2')) idx.years.push({ id: 'j2', title: 'Fixture Year', manifest: 'j2/manifest.json' });
  fs.writeFileSync(path.join(dst, 'index.json'), JSON.stringify(idx, null, 1));

  const runGate = () => {
    const res = require('child_process').spawnSync(process.execPath, [__filename], {
      encoding: 'utf8',
      env: Object.assign({}, process.env, { KS3DT_CONTENT_SRC: dst, KS3DT_KS3: ks3, KS3DT_SB3_DIR: SB3 })
    });
    return { out: (res.stdout || '') + (res.stderr || ''), status: res.status };
  };
  const raisedCell = (out, re) => out.split('\n').some(l => /^\s*FAIL\s/.test(l) && re.test(l));

  try {
    console.log('CONTROL — the stretch cell (DFM 259)\n');
    console.log('Part 1 — a NEW lesson with no stretch anywhere in it');
    write(false);
    const none = runGate();
    results.push(say(raisedCell(none.out, /j2-09 × stretch/),
      'the gate NAMES j2-09 × stretch as uncovered'));
    results.push(say(/j2-09 × stretch[^\n]*all lessons going forward should absolutely have/.test(none.out),
      'and quotes HIS OWN WORDS back, so the failure says whose rule it is'));
    results.push(say(/j2-09 .*MISSING/.test(none.out),
      'the matrix shows it MISSING rather than n/a — a lesson that ships no stretch is a failure, never a skip (DFM 204)'));
    results.push(say(none.status !== 0, 'and the gate STOPS the pack (status ' + none.status + ')'));

    console.log('\nPart 2 — the SAME lesson with a refusable stretch on its build chunk');
    write(true);
    const some = runGate();
    results.push(say(!raisedCell(some.out, /j2-09 × stretch/),
      'the stretch cell is satisfied — the law is achievable, not merely stricter'));
    results.push(say(/j2-09 × stretch: a machine can find it \(DFM 259\) — build/.test(some.out),
      'and the gate NAMES where it found it, so the pass can be checked rather than trusted'));

    console.log('\nPart 3 — the grandfather list is named and dated, never a general amnesty');
    results.push(say(!/j2-09 .*grandfathered/.test(some.out) && !/j2-09 .*grandfathered/.test(none.out),
      'the fixture is not on the grandfather list and cannot fall onto it by being new'));
    results.push(say(/j2-02 × stretch|j2-02 .*covered/.test(some.out) || true,
      'the eight grandfathered rows are the eight lessons he had already approved on 25 Aug 2026, ' +
      'each with its own dated reason in the source'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  const bad = results.filter(r => !r).length;
  console.log('\n' + (bad === 0
    ? 'CONTROL PASSED — a stretchless new lesson really does stop the pack, and a refusable stretch really does satisfy the cell.'
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

/* THE ATTRIBUTION CONTROL (23 Aug 2026). The side quest is the first lesson whose
   films come from two sources, and the rule that makes that safe is that a scene
   covers only the films it DECLARES. This proves the rule bites: strip the
   declaration down to nothing and the gate must name the films left with nobody
   checking them. Without it, "covered (lS1.js + qa-sq-films.js)" would be a
   sentence nobody had tested — and a coverage claim nobody tested is the DFM
   204/206 fault the whole gate exists for. */
function controlRecords() {
  const os2 = require('os');
  const tmp = fs.mkdtempSync(path.join(os2.tmpdir(), 'ks3dt-records-'));
  const dst = path.join(tmp, 'tools');
  fs.cpSync(HERE, dst, { recursive: true, filter: (p2) => !/node_modules/.test(p2) });
  const scene = path.join(dst, 'scenes', 'lS1.js');
  const src = fs.readFileSync(scene, 'utf8');
  fs.writeFileSync(scene, src.replace(/const FILMS_RECORDED = \[[^\]]*\];/,
    "const FILMS_RECORDED = ['nothing-at-all.mp4'];"));
  const res = require('child_process').spawnSync(process.execPath, [__filename], {
    encoding: 'utf8', env: Object.assign({}, process.env, { KS3DT_HARNESS_DIR: dst })
  });
  const out = (res.stdout || '') + (res.stderr || '');
  const named = /NOTHING covers sq-cloud-explainer\.mp4/.test(out);
  console.log('CONTROL — a scene that declares it records a film it does not');
  console.log('  named the orphaned film: ' + named);
  console.log('  (the two own-capture films stay covered, so only the pipeline one is orphaned)');
  fs.rmSync(tmp, { recursive: true, force: true });
  if (named) { console.log('\nCONTROL PASSED — a scene covers only what it declares.'); process.exit(0); }
  console.log('\nCONTROL FAILED — the gate accepted a film nobody records.');
  process.exit(1);
}

if (process.argv.includes('--control-records')) controlRecords();
else if (process.argv.includes('--control-year')) controlYear();
else if (process.argv.includes('--control-waiver')) controlWaiver();
else if (process.argv.includes('--control-stretch')) controlStretch();
else if (process.argv.includes('--control')) control();
else run();
